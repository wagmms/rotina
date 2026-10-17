#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ROTINA (Gemini 4 Argon) - Cirurgia de Otimização SQLite + FTS5
Objetivo: Reduzir drasticamente o tamanho de data/cnes.db mantendo 100% dos dados
          e a performance/qualidade do FTS5 (unicode61 remove_diacritics 2).
"""

from pathlib import Path
import shutil
import sqlite3
import sys
import time

DB_PATH = Path("data/cnes.db")
BACKUP_PATH = Path("data/cnes.db.bak_pre_opt")


def format_bytes(size: int) -> str:
    return f"{size / (1024 * 1024):.2f} MB"


def run_benchmark(conn: sqlite3.Connection, label: str) -> float:
    """Executa bateria de testes FTS5 (com e sem acento) e retorna a média em ms."""
    queries = [
        "hospital sao lucas",
        "clinica médica centro",
        "laboratorio analises",
        "pronto socorro infantil",
    ]
    cursor = conn.cursor()
    times = []

    for q in queries:
        t0 = time.perf_counter()
        cursor.execute(
            """
            SELECT e.cnes, e.nome_fantasia, e.razao_social, e.bairro
            FROM estabelecimentos_fts f
            JOIN estabelecimentos e ON e.rowid = f.rowid
            WHERE estabelecimentos_fts MATCH ?
            LIMIT 25;
            """,
            (q,),
        )
        results = cursor.fetchall()
        t1 = time.perf_counter()
        times.append((t1 - t0) * 1000)

        if len(results) == 0:
            print(
                f"  [!] Aviso: Query '{q}' retornou 0 resultados durante o benchmark ({label})."
            )

    avg_ms = sum(times) / len(times)
    print(f"  -> Benchmark [{label}]: média de {avg_ms:.2f} ms por consulta.")
    return avg_ms


def get_FTS_columns(conn: sqlite3.Connection) -> list[str]:
    """Detecta as colunas reais existentes na tabela estabelecimentos para o FTS5."""
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(estabelecimentos);")
    cols = [row[1] for row in cur.fetchall()]

    target_fts_cols = ["nome_fantasia", "razao_social", "bairro"]
    valid_cols = [c for c in target_fts_cols if c in cols]

    if not valid_cols:
        raise RuntimeError(
            f"Colunas esperadas {target_fts_cols} não encontradas em 'estabelecimentos'. Colunas atuais: {cols}"
        )
    return valid_cols


def drop_redundant_columns(conn: sqlite3.Connection):
    """Remove colunas pesadas redundantes (ex: _search) caso existam."""
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(estabelecimentos);")
    cols = [row[1] for row in cur.fetchall()]

    redundant = [
        c for c in ["_search", "search_text", "texto_busca"] if c in cols
    ]
    if not redundant:
        print(
            "  -> Nenhuma coluna redundante pesada encontrada em 'estabelecimentos'."
        )
        return

    for col in redundant:
        print(f"  -> Removendo coluna redundante '{col}'...")
        try:
            cur.execute(f"ALTER TABLE estabelecimentos DROP COLUMN {col};")
        except sqlite3.OperationalError as e:
            print(
                f"     [Info] SQLite não permitiu DROP direto ({e}). Mantendo estrutura segura."
            )


def main():
    if not DB_PATH.exists():
        print(f"[ERRO] Banco de dados não encontrado em: {DB_PATH.resolve()}")
        sys.exit(1)

    initial_size = DB_PATH.stat().st_size
    print("=" * 65)
    print(" INICIANDO CIRURGIA DE OTIMIZAÇÃO: data/cnes.db")
    print("=" * 65)
    print(
        f"1. Tamanho inicial no disco: {format_bytes(initial_size)} ({initial_size:,} bytes)"
    )

    # 1. Backup de Segurança
    print(f"2. Criando backup de segurança temporário em {BACKUP_PATH.name}...")
    shutil.copy2(DB_PATH, BACKUP_PATH)

    try:
        conn = sqlite3.connect(str(DB_PATH))
        cur = conn.cursor()

        # Configurações de alta performance em memória para a reconstrução
        cur.execute("PRAGMA journal_mode = MEMORY;")
        cur.execute("PRAGMA synchronous = OFF;")
        cur.execute("PRAGMA temp_store = MEMORY;")
        cur.execute("PRAGMA cache_size = -128000;")  # ~128MB de cache em RAM

        # 2. Auditoria Pré-Cirurgia
        print("3. Auditando volumetria e performance inicial...")
        cur.execute("SELECT COUNT(*) FROM estabelecimentos;")
        count_estab_before = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM municipios;")
        count_mun_before = cur.fetchone()[0]

        print(f"  -> Estabelecimentos: {count_estab_before:,}")
        print(f"  -> Municípios:       {count_mun_before:,}")

        try:
            run_benchmark(conn, "ANTES")
        except Exception as e:
            print(
                f"  -> Benchmark inicial ignorado (FTS antigo com esquema diferente): {e}"
            )

        # 3. Limpeza de órfãos e colunas redundantes
        print("4. Limpando estruturas órfãs e colunas redundantes...")
        drop_redundant_columns(conn)

        # Identifica colunas para indexar no FTS5
        fts_cols = get_FTS_columns(conn)
        fts_cols_str = ", ".join(fts_cols)
        print(f"  -> Colunas mapeadas para o FTS5: [{fts_cols_str}]")

        # 4. Reconstrução Cirúrgica do FTS5 (External Content)
        print(
            "5. Convertendo FTS5 para modo External Content (Zero Duplicação de Texto)..."
        )
        cur.execute("BEGIN TRANSACTION;")

        # Remove triggers antigos se existirem para evitar conflito
        cur.execute("DROP TRIGGER IF EXISTS estabelecimentos_ai;")
        cur.execute("DROP TRIGGER IF EXISTS estabelecimentos_ad;")
        cur.execute("DROP TRIGGER IF EXISTS estabelecimentos_au;")

        # Remove tabela FTS5 antiga (que duplicava conteúdo)
        cur.execute("DROP TABLE IF EXISTS estabelecimentos_fts;")

        # Cria nova tabela FTS5 apontando para 'estabelecimentos'
        create_fts_sql = f"""
        CREATE VIRTUAL TABLE estabelecimentos_fts USING fts5(
            {fts_cols_str},
            content='estabelecimentos',
            content_rowid='rowid',
            tokenize='unicode61 remove_diacritics 2'
        );
        """
        cur.execute(create_fts_sql)
        cur.execute("COMMIT;")

        # 5. Rebuild e Otimização de B-Tree do FTS5
        print(
            "6. Executando REBUILD e OPTIMIZE do índice FTS5 (pode levar alguns segundos)..."
        )
        t_reb0 = time.perf_counter()
        cur.execute(
            "INSERT INTO estabelecimentos_fts(estabelecimentos_fts) VALUES('rebuild');"
        )
        cur.execute(
            "INSERT INTO estabelecimentos_fts(estabelecimentos_fts) VALUES('optimize');"
        )
        conn.commit()
        print(
            f"  -> Índice reconstruído e compactado em {time.perf_counter() - t_reb0:.2f}s."
        )

        # 6. Compactação Física do Arquivo (VACUUM & ANALYZE)
        print(
            "7. Executando VACUUM e ANALYZE para encolher o banco ao mínimo físico..."
        )
        t_vac0 = time.perf_counter()
        cur.execute("PRAGMA page_size = 4096;")
        cur.execute("VACUUM;")
        cur.execute("ANALYZE;")
        conn.commit()
        print(f"  -> VACUUM concluído em {time.perf_counter() - t_vac0:.2f}s.")

        # Restaura pragmas seguros de produção
        cur.execute("PRAGMA journal_mode = WAL;")
        cur.execute("PRAGMA synchronous = NORMAL;")

        # 7. Validação Estrita Pós-Cirurgia
        print("8. Validando integridade pós-otimização...")
        cur.execute("SELECT COUNT(*) FROM estabelecimentos;")
        count_estab_after = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM municipios;")
        count_mun_after = cur.fetchone()[0]

        assert (
            count_estab_before == count_estab_after
        ), f"Divergência em estabelecimentos! {count_estab_before} != {count_estab_after}"
        assert (
            count_mun_before == count_mun_after
        ), f"Divergência em municípios! {count_mun_before} != {count_mun_after}"

        # Teste explícito de acentuação (diacríticos)
        cur.execute(
            "SELECT COUNT(*) FROM estabelecimentos_fts WHERE estabelecimentos_fts MATCH 'sao';"
        )
        res_sem_acento = cur.fetchone()[0]
        cur.execute(
            "SELECT COUNT(*) FROM estabelecimentos_fts WHERE estabelecimentos_fts MATCH 'são';"
        )
        res_com_acento = cur.fetchone()[0]

        assert (
            res_sem_acento == res_com_acento and res_sem_acento > 0
        ), f"Falha no tokenizador remove_diacritics! ('sao': {res_sem_acento} vs 'são': {res_com_acento})"
        print(
            f"  -> Validação Diacríticos OK: 'sao' ({res_sem_acento:,}) == 'são' ({res_com_acento:,})"
        )

        run_benchmark(conn, "DEPOIS")
        conn.close()

        # Remove o backup temporário após sucesso comprovado
        BACKUP_PATH.unlink(missing_ok=True)

        final_size = DB_PATH.stat().st_size
        saved_bytes = initial_size - final_size
        saved_pct = (saved_bytes / initial_size) * 100

        print("=" * 65)
        print(" CIRURGIA CONCLUÍDA COM SUCESSO!")
        print("=" * 65)
        print(
            f" • Registros Intactos : {count_estab_after:,} estabelecimentos | {count_mun_after:,} municípios"
        )
        print(f" • Tamanho Inicial    : {format_bytes(initial_size)}")
        print(f" • Tamanho Final      : {format_bytes(final_size)}")
        print(
            f" • Economia de Espaço : {format_bytes(saved_bytes)} (-{saved_pct:.1f}%)"
        )
        print("=" * 65)

    except Exception as err:
        print(f"\n[ERRO CRÍTICO] A cirurgia falhou: {err}")
        print(
            "Iniciando ROLLBACK imediato a partir do backup de segurança..."
        )
        try:
            conn.close()
        except Exception:
            pass
        if BACKUP_PATH.exists():
            shutil.move(str(BACKUP_PATH), str(DB_PATH))
            print(
                "[ROLLBACK CONCLUÍDO] O banco data/cnes.db original foi restaurado intacto."
            )
        sys.exit(1)


if __name__ == "__main__":
    main()
