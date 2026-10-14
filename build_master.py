#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==============================================================================
BUILD MASTER - COMPILADOR E AUDITOR INCREMENTAL DO ULTRA ROTINA MASTER
==============================================================================
Empacota os módulos de src/ em um único bundle de integridade (ultra_rotina_master.js)
com verificação incremental de sintaxe e checksum consolidado de código fonte.
O backend oficial roda em Node.js/Docker no Render (server.js).
==============================================================================
"""

import os
import sys
import glob
import hashlib
import subprocess
import json
import argparse
import time
from datetime import datetime

SRC_DIR = os.path.join(os.path.dirname(__file__), "src")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "ultra_rotina_master.js")
CACHE_FILE = os.path.join(os.path.dirname(__file__), ".build_master_cache.json")
CHECKER_SCRIPT = os.path.join(os.path.dirname(__file__), "scripts", "check_syntax.cjs")

HEADER = """/**
 * ==============================================================================
 * ULTRA ROTINA · MASTER ENGINE BUNDLE (NODE.JS / RENDER RUNTIME)
 * ==============================================================================
 * Servidor oficial Node.js/Docker no Render.
 * Gerado automaticamente via build_master.py em: {timestamp}
 * Checksum SHA256: {checksum}
 * ==============================================================================
 */

"""

def verificar_sintaxe_js(caminho):
    """Executa 'node --check' no arquivo JS para validar a sintaxe."""
    try:
        res = subprocess.run(["node", "--check", caminho], capture_output=True, text=True)
        if res.returncode != 0:
            print(f"❌ Erro de sintaxe em {os.path.basename(caminho)}:\n{res.stderr}")
            return False
        return True
    except FileNotFoundError:
        print(f"⚠️ Aviso: 'node' não encontrado no PATH para validar sintaxe de {os.path.basename(caminho)}.")
        return False

def carregar_cache(caminho_cache):
    """Carrega o manifesto de checksums anterior de forma defensiva."""
    if os.path.exists(caminho_cache):
        try:
            with open(caminho_cache, "r", encoding="utf-8") as f:
                dados = json.load(f)
                if isinstance(dados, dict):
                    return dados
        except Exception:
            pass
    return {}

def salvar_cache(caminho_cache, dados):
    """Salva o manifesto de cache atomicamente."""
    tmp = caminho_cache + f".{os.getpid()}.tmp"
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(dados, f, indent=2, ensure_ascii=False)
        os.replace(tmp, caminho_cache)
    except Exception:
        if os.path.exists(tmp):
            try:
                os.remove(tmp)
            except OSError:
                pass

def sincronizar_espelhos_cockpit():
    """Garante paridade atômica e automática dos espelhos estáticos do Cockpit PWA."""
    base_dir = os.path.dirname(__file__)
    pares_sincronia = [
        (os.path.join(base_dir, "cockpit_movel.html"), os.path.join(base_dir, "gh_cockpit_deploy", "index.html")),
        (os.path.join(base_dir, "cockpit_movel.html"), os.path.join(base_dir, "index.html")),
        (os.path.join(base_dir, "rotina_timeline.js"), os.path.join(base_dir, "gh_cockpit_deploy", "rotina_timeline.js")),
        (os.path.join(base_dir, "sw.js"), os.path.join(base_dir, "gh_cockpit_deploy", "sw.js")),
        (os.path.join(base_dir, "manifest.json"), os.path.join(base_dir, "gh_cockpit_deploy", "manifest.json")),
    ]
    sincronizados = 0
    for origem, destino in pares_sincronia:
        if not os.path.exists(origem):
            continue
        os.makedirs(os.path.dirname(destino), exist_ok=True)
        try:
            with open(origem, "rb") as fo:
                bytes_origem = fo.read()
            bytes_destino = b""
            if os.path.exists(destino):
                with open(destino, "rb") as fd:
                    bytes_destino = fd.read()
            if bytes_origem != bytes_destino:
                tmp = destino + f".{os.getpid()}.tmp"
                with open(tmp, "wb") as ft:
                    ft.write(bytes_origem)
                os.replace(tmp, destino)
                sincronizados += 1
                print(f"  ✓ Espelho sincronizado: {os.path.relpath(origem)} -> {os.path.relpath(destino)}")
        except Exception as e:
            print(f"  ⚠️ Falha ao sincronizar espelho {os.path.basename(origem)}: {e}")
    if sincronizados > 0:
        print(f"📱 Cockpit PWA: {sincronizados} arquivo(s) espelho sincronizado(s) com paridade SHA-256 ✅")

def build(force=False):
    t0 = time.perf_counter()
    sincronizar_espelhos_cockpit()
    if not os.path.exists(SRC_DIR):
        print(f"❌ Diretório fonte '{SRC_DIR}' não encontrado.")
        return 1

    arquivos_src = sorted(glob.glob(os.path.join(SRC_DIR, "*.js")))
    if not arquivos_src:
        print("❌ Nenhum arquivo .js encontrado em src/.")
        return 1

    # Coleta de conteúdos e checksums individuais das fontes
    hashes = {}
    conteudos_raw = {}
    hasher_consolidado = hashlib.sha256()

    for arq in arquivos_src:
        nome = os.path.basename(arq)
        with open(arq, "r", encoding="utf-8") as f:
            raw = f.read()
        sha = hashlib.sha256(raw.encode("utf-8")).hexdigest()
        hashes[nome] = sha
        conteudos_raw[arq] = raw
        hasher_consolidado.update(f"{nome}:{sha}\n".encode("utf-8"))

    source_checksum = hasher_consolidado.hexdigest()
    cache = carregar_cache(CACHE_FILE) if not force else {}

    # FAST-PATH INCREMENTAL (0ms):
    # Se as fontes não mudaram e o artefato já existe e está íntegro
    if (not force
        and cache
        and cache.get("source_checksum") == source_checksum
        and os.path.exists(OUTPUT_FILE)):
        try:
            with open(OUTPUT_FILE, "rb") as af:
                artifact_sha = hashlib.sha256(af.read()).hexdigest()
            if artifact_sha == cache.get("artifact_sha256"):
                elapsed_ms = (time.perf_counter() - t0) * 1000
                checksum_disp = cache.get("artifact_checksum", source_checksum[:16])
                print(f"⚡ Build Incremental: {len(arquivos_src)} módulos inalterados (checksum: {checksum_disp}).")
                print(f"  ✓ {os.path.basename(OUTPUT_FILE)} 100% íntegro e sincronizado [{elapsed_ms:.1f}ms - 0ms rebuild].")
                return 0
        except Exception:
            pass

    # Identificação incremental de módulos alterados para validação sintática
    modules_to_check = []
    cache_modules = cache.get("modules", {})

    for arq in arquivos_src:
        nome = os.path.basename(arq)
        if force or nome not in cache_modules or cache_modules[nome] != hashes[nome]:
            modules_to_check.append({"file": arq, "source": conteudos_raw[arq]})

    # Validação sintática via check_syntax.cjs
    if modules_to_check:
        print(f"🔍 Validando sintaxe de {len(modules_to_check)}/{len(arquivos_src)} módulos...")
        if os.path.exists(CHECKER_SCRIPT):
            res = subprocess.run(
                ["node", CHECKER_SCRIPT, "--stdin"],
                input=json.dumps(modules_to_check),
                capture_output=True,
                text=True
            )
            if res.returncode != 0:
                print(f"❌ Falha de sintaxe nos módulos:\n{res.stderr}")
                return 1
        else:
            for mod in modules_to_check:
                if not verificar_sintaxe_js(mod["file"]):
                    return 1

    print(f"📦 Empacotando {len(arquivos_src)} módulos de {SRC_DIR}...")
    conteudos = []
    for arq in arquivos_src:
        nome = os.path.basename(arq)
        conteudo = conteudos_raw[arq].strip()
        separador = f"\n\n// {'='*78}\n// ARQUIVO FONTE: {nome}\n// {'='*78}\n\n"
        conteudos.append(separador + conteudo)
        print(f"  ✓ {nome}")

    corpo = "\n".join(conteudos)
    checksum_raw = hashlib.sha256(corpo.encode("utf-8")).hexdigest()[:16]
    cabecalho = HEADER.format(
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        checksum=checksum_raw
    )

    conteudo_final = cabecalho + corpo + "\n"

    # Se a fonte é idêntica ao arquivo existente, preserva mtime e timestamp originais
    existing = None
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as previous:
            existing = previous.read()
        marker = existing.find("*/\n\n")
        if marker >= 0 and existing[marker + 4:] == corpo + "\n":
            conteudo_final = existing

    tmp_output = OUTPUT_FILE + f".{os.getpid()}.tmp.js"

    # Escreve primeiramente em arquivo temporário para validação atômica
    with open(tmp_output, "w", encoding="utf-8") as f:
        f.write(conteudo_final)

    # Validação do arquivo compilado antes de substituir a versão de produção
    if not verificar_sintaxe_js(tmp_output):
        print("❌ Falha na verificação de sintaxe do arquivo compilado. Build abortado.")
        if os.path.exists(tmp_output):
            os.remove(tmp_output)
        return 1

    # Impede misturar versões de fontes durante edições concorrentes
    current = sorted(glob.glob(os.path.join(SRC_DIR, "*.js")))
    stable = current == arquivos_src
    for arq in arquivos_src:
        nome = os.path.basename(arq)
        with open(arq, "r", encoding="utf-8") as source:
            if hashlib.sha256(source.read().encode("utf-8")).hexdigest() != hashes[nome]:
                stable = False
                break
    if not stable:
        if os.path.exists(tmp_output):
            os.remove(tmp_output)
        print("❌ Fontes alteradas durante o build; artefato não promovido.")
        return 1

    # Substituição atômica segura
    if os.path.exists(OUTPUT_FILE) and existing and conteudo_final == existing:
        if os.path.exists(tmp_output):
            os.remove(tmp_output)
        print("  ✓ Fontes idênticas: bundle preservado sem reescrita.")
    else:
        os.replace(tmp_output, OUTPUT_FILE)

    # Atualiza o cache de integridade de fontes
    with open(OUTPUT_FILE, "rb") as af:
        art_sha = hashlib.sha256(af.read()).hexdigest()

    novo_cache = {
        "version": 1,
        "source_checksum": source_checksum,
        "artifact_checksum": checksum_raw,
        "artifact_sha256": art_sha,
        "modules": hashes,
        "updated_at": datetime.now().isoformat()
    }
    salvar_cache(CACHE_FILE, novo_cache)

    total_linhas = len(conteudo_final.splitlines())
    total_bytes = len(conteudo_final.encode("utf-8"))
    elapsed = (time.perf_counter() - t0) * 1000

    print(f"\n🎉 Sucesso! {OUTPUT_FILE} gerado [{elapsed:.1f}ms]:")
    print(f"   • Total de Linhas: {total_linhas}")
    print(f"   • Tamanho: {total_bytes / 1024:.1f} KB")
    print(f"   • Checksum do Bundle: {checksum_raw}")
    print(f"   • Checksum Consolidado das Fontes: {source_checksum[:16]}")
    print("   • Validação de Sintaxe JS: 100% OK ✅")
    return 0

def main():
    parser = argparse.ArgumentParser(description="Compilador e auditor incremental do Ultra Rotina Master.")
    parser.add_argument("--force", "-f", action="store_true", help="Força a validação e reconstrução completa de todos os módulos.")
    args = parser.parse_args()
    code = build(force=args.force)
    sys.exit(code)

if __name__ == "__main__":
    main()
