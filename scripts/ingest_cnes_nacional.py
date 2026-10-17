#!/usr/bin/env python3
"""
Ingestor Oficial em Lote do CNES Nacional (DataSUS / Ministério da Saúde).
Processa todos os ~570.000 estabelecimentos de saúde do Brasil e salva em data/cnes.db (SQLite).
"""

import os
import sys
import csv
import zipfile
import sqlite3
import urllib.request
import json
import time
import unicodedata
import re

ZIP_PATH = "/tmp/cnes_estabelecimentos.zip"
DB_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
DB_PATH = os.path.join(DB_DIR, "cnes.db")

def normalizar(texto):
    if not texto:
        return ""
    return "".join(
        c for c in unicodedata.normalize("NFD", str(texto))
        if unicodedata.category(c) != "Mn"
    ).lower().strip()

def baixar_municipios_ibge():
    print("📥 [1/4] Baixando catálogo oficial de municípios do IBGE...")
    url = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios"
    req = urllib.request.Request(url, headers={"User-Agent": "RotinaClinicalBot/2.5"})
    import gzip
    with urllib.request.urlopen(req, timeout=20) as resp:
        raw = resp.read()
        if raw.startswith(b'\x1f\x8b'):
            raw = gzip.decompress(raw)
        dados = json.loads(raw.decode("utf-8"))
    
    UF_MAP = {
        "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
        "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL", "28": "SE", "29": "BA",
        "31": "MG", "32": "ES", "33": "RJ", "35": "SP",
        "41": "PR", "42": "SC", "43": "RS",
        "50": "MS", "51": "MT", "52": "GO", "53": "DF"
    }
    
    municipios_map = {}
    for item in dados:
        ibge_7 = str(item["id"])
        ibge_6 = ibge_7[:6]
        nome = item["nome"]
        uf = UF_MAP.get(ibge_7[:2], "")
        municipios_map[ibge_6] = {
            "ibge": ibge_7,
            "ibge6": ibge_6,
            "nome": nome,
            "uf": uf,
            "nome_norm": normalizar(nome)
        }
    print(f"  ✓ {len(municipios_map)} municípios carregados com sucesso do IBGE.")
    return municipios_map

def mapear_tipo_unidade(tp_str, nome_fantasia=""):
    try:
        tp = int(tp_str)
    except (ValueError, TypeError):
        tp = 0

    u = (nome_fantasia or "").upper()
    if re.search(r"\bUPA\b", u) or "PRONTO ATENDIMENTO" in u or "PRONTO SOCORRO" in u or tp in (73, 20, 21):
        return "UPA"
    if "HOSPITAL" in u or "SANTA CASA" in u or "MATERNIDADE" in u or tp in (5, 7):
        return "HOSPITAL"
    if re.search(r"\bUBS\b", u) or "POSTO DE SAUDE" in u or "CENTRO DE SAUDE" in u or "UNIDADE BASICA" in u or tp in (1, 2, 15):
        return "UBS"
    if "CONSULTORIO" in u or tp == 22:
        return "CONSULTORIO"
    if "CLINICA" in u or "POLICLINICA" in u or "AMBULATORIO" in u or tp in (4, 36):
        return "CLINICA"
    return "OUTROS"

def inicializar_banco(conn):
    print("🛠️ [2/4] Criando tabelas e índices otimizados no SQLite...")
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA temp_store = MEMORY;")
    conn.execute("PRAGMA cache_size = -64000;") # 64MB cache

    conn.execute("""
    CREATE TABLE IF NOT EXISTS municipios (
        ibge TEXT PRIMARY KEY,
        ibge6 TEXT NOT NULL,
        nome TEXT NOT NULL,
        uf TEXT NOT NULL,
        nome_norm TEXT NOT NULL
    );
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_mun_norm ON municipios(nome_norm);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_mun_uf ON municipios(uf);")

    conn.execute("""
    CREATE TABLE IF NOT EXISTS estabelecimentos (
        cnes TEXT PRIMARY KEY,
        ibge TEXT NOT NULL,
        uf TEXT NOT NULL,
        cidade TEXT NOT NULL,
        cidade_norm TEXT NOT NULL,
        nome_fantasia TEXT NOT NULL,
        razao_social TEXT,
        tipo TEXT NOT NULL,
        tipo_codigo TEXT,
        logradouro TEXT,
        numero TEXT,
        bairro TEXT,
        cep TEXT,
        telefone TEXT,
        ativo INTEGER DEFAULT 1,
        _search TEXT
    );
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_est_ibge ON estabelecimentos(ibge);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_est_uf ON estabelecimentos(uf);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_est_tipo ON estabelecimentos(tipo);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_est_cidade_norm ON estabelecimentos(cidade_norm);")

    # Tabela Virtual FTS5 para autocomplete instantâneo em todo o Brasil
    conn.execute("""
    CREATE VIRTUAL TABLE IF NOT EXISTS estabelecimentos_fts USING fts5(
        cnes UNINDEXED,
        ibge UNINDEXED,
        cidade UNINDEXED,
        tipo UNINDEXED,
        nome_fantasia,
        razao_social,
        bairro,
        tokenize='unicode61 remove_diacritics 2'
    );
    """)
    conn.commit()

def processar_ingestao():
    os.makedirs(DB_DIR, exist_ok=True)
    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
        except OSError:
            pass

    conn = sqlite3.connect(DB_PATH)
    inicializar_banco(conn)

    municipios_map = baixar_municipios_ibge()

    # Inserir municípios
    print("📝 Salvando municípios no banco...")
    mun_rows = [
        (m["ibge"], m["ibge6"], m["nome"], m["uf"], m["nome_norm"])
        for m in municipios_map.values()
    ]
    conn.executemany("INSERT INTO municipios VALUES (?, ?, ?, ?, ?)", mun_rows)
    conn.commit()

    if not os.path.exists(ZIP_PATH):
        print("❌ Erro: Arquivo ZIP não encontrado em", ZIP_PATH)
        sys.exit(1)

    print("🚀 [3/4] Ingerindo estabelecimentos do arquivo ZIP oficial DataSUS...")
    t_inicio = time.time()
    lote_est = []
    lote_fts = []
    total_processados = 0
    total_inseridos = 0
    cnes_vistos = set()

    with zipfile.ZipFile(ZIP_PATH, 'r') as z:
        with z.open("cnes_estabelecimentos.csv", 'r') as f_bytes:
            import io
            f_text = io.TextIOWrapper(f_bytes, encoding='iso-8859-1', errors='replace')
            reader = csv.DictReader(f_text, delimiter=';')

            for row in reader:
                total_processados += 1
                cnes = str(row.get("CO_CNES") or "").strip()
                if not cnes or cnes in cnes_vistos:
                    continue
                cnes_vistos.add(cnes)

                # Código oficial CNES com 7 dígitos
                cnes_fmt = cnes.zfill(7) if cnes.isdigit() else cnes

                ibge_raw = str(row.get("CO_IBGE") or "").strip()
                ibge_info = municipios_map.get(ibge_raw, {})
                cidade = ibge_info.get("nome", "")
                cidade_norm = ibge_info.get("nome_norm", normalizar(cidade))
                uf = ibge_info.get("uf", "")
                ibge_7 = ibge_info.get("ibge", ibge_raw)

                nome_fantasia = str(row.get("NO_FANTASIA") or "").strip()
                razao_social = str(row.get("NO_RAZAO_SOCIAL") or "").strip()
                if not nome_fantasia and not razao_social:
                    continue
                if not nome_fantasia:
                    nome_fantasia = razao_social

                tp_unidade = str(row.get("TP_UNIDADE") or "").strip()
                tipo_categoria = mapear_tipo_unidade(tp_unidade, nome_fantasia)

                motivo_desab = str(row.get("CO_MOTIVO_DESAB") or "").strip()
                ativo = 0 if motivo_desab else 1

                logradouro = str(row.get("NO_LOGRADOURO") or "").strip()
                numero = str(row.get("NU_ENDERECO") or "").strip()
                bairro = str(row.get("NO_BAIRRO") or "").strip()
                cep = str(row.get("CO_CEP") or "").strip()
                tel = str(row.get("NU_TELEFONE") or "").strip()

                if numero and numero != "S/N" and logradouro:
                    logradouro_completo = f"{logradouro}, {numero}"
                else:
                    logradouro_completo = logradouro

                search_field = normalizar(f"{nome_fantasia} {razao_social} {cnes_fmt} {bairro} {cidade} {uf}")

                lote_est.append((
                    cnes_fmt,
                    ibge_7,
                    uf,
                    cidade,
                    cidade_norm,
                    nome_fantasia,
                    razao_social,
                    tipo_categoria,
                    tp_unidade,
                    logradouro_completo,
                    numero,
                    bairro,
                    cep,
                    tel,
                    ativo,
                    search_field
                ))

                lote_fts.append((
                    cnes_fmt,
                    ibge_7,
                    cidade,
                    tipo_categoria,
                    nome_fantasia,
                    razao_social,
                    bairro
                ))

                if len(lote_est) >= 20000:
                    conn.executemany("""
                    INSERT OR REPLACE INTO estabelecimentos VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, lote_est)
                    conn.executemany("""
                    INSERT INTO estabelecimentos_fts (cnes, ibge, cidade, tipo, nome_fantasia, razao_social, bairro)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, lote_fts)
                    conn.commit()
                    total_inseridos += len(lote_est)
                    lote_est = []
                    lote_fts = []
                    sys.stdout.write(f"\r  ⏳ Inseridos {total_inseridos:,} de {total_processados:,} registros...")
                    sys.stdout.flush()

            if lote_est:
                conn.executemany("""
                INSERT OR REPLACE INTO estabelecimentos VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, lote_est)
                conn.executemany("""
                INSERT INTO estabelecimentos_fts (cnes, ibge, cidade, tipo, nome_fantasia, razao_social, bairro)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, lote_fts)
                conn.commit()
                total_inseridos += len(lote_est)

    print(f"\n  ✓ {total_inseridos:,} estabelecimentos cadastrados em {(time.time() - t_inicio):.2f}s!")

    print("📊 [4/4] Otimizando banco de dados (ANALYZE)...")
    conn.execute("ANALYZE;")
    conn.commit()
    conn.close()

    tamanho_mb = os.path.getsize(DB_PATH) / (1024 * 1024)
    print(f"🎉 SUCESSO ABSOLUTO: Banco CNES Nacional gerado em {DB_PATH} ({tamanho_mb:.2f} MB)!")

if __name__ == "__main__":
    processar_ingestao()
