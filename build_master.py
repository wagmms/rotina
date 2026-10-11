#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==============================================================================
BUILD MASTER - COMPILADOR E AUDITOR DO ULTRA ROTINA MASTER
==============================================================================
Empacota os módulos de src/ em um único bundle de integridade (ultra_rotina_master.js)
com verificação de integridade sintática e geração de checksum.
O backend oficial roda em Node.js/Docker no Render (server.js).
==============================================================================
"""

import os
import sys
import glob
import hashlib
import subprocess
import json
from datetime import datetime

SRC_DIR = os.path.join(os.path.dirname(__file__), "src")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "ultra_rotina_master.js")

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

def main():
    if not os.path.exists(SRC_DIR):
        print(f"❌ Diretório fonte '{SRC_DIR}' não encontrado.")
        sys.exit(1)

    arquivos_src = sorted(glob.glob(os.path.join(SRC_DIR, "*.js")))
    if not arquivos_src:
        print("❌ Nenhum arquivo .js encontrado em src/.")
        sys.exit(1)

    print(f"📦 Empacotando {len(arquivos_src)} módulos de {SRC_DIR}...")

    conteudos = []
    hashes = {}
    modules = []
    for arq in arquivos_src:
        nome = os.path.basename(arq)
        with open(arq, "r", encoding="utf-8") as f:
            raw = f.read()
            hashes[arq] = hashlib.sha256(raw.encode("utf-8")).hexdigest()
            modules.append({"file": arq, "source": raw})
            conteudo = raw.strip()
            separador = f"\n\n// {'='*78}\n// ARQUIVO FONTE: {nome}\n// {'='*78}\n\n"
            conteudos.append(separador + conteudo)
        print(f"  ✓ {nome}")

    # Uma engine valida os conteúdos exatos que serão empacotados, separadamente.
    checker = os.path.join(os.path.dirname(__file__), "scripts", "check_syntax.cjs")
    res = subprocess.run(["node", checker, "--stdin"], input=json.dumps(modules),
                         capture_output=True, text=True)
    if res.returncode != 0:
        print(f"❌ Falha de sintaxe nos módulos:\n{res.stderr}")
        sys.exit(1)

    corpo = "\n".join(conteudos)
    checksum_raw = hashlib.sha256(corpo.encode("utf-8")).hexdigest()[:16]
    cabecalho = HEADER.format(
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        checksum=checksum_raw
    )

    conteudo_final = cabecalho + corpo + "\n"
    # Se a fonte é idêntica, preserva o artefato e o timestamp já validados.
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
        sys.exit(1)

    # Impede misturar versões de fontes durante edições concorrentes.
    current = sorted(glob.glob(os.path.join(SRC_DIR, "*.js")))
    stable = current == arquivos_src
    for arq, expected in hashes.items():
        with open(arq, "r", encoding="utf-8") as source:
            stable = stable and hashlib.sha256(source.read().encode("utf-8")).hexdigest() == expected
    if not stable:
        os.remove(tmp_output)
        print("❌ Fontes alteradas durante o build; artefato não promovido.")
        sys.exit(1)

    # Substituição atômica segura
    if os.path.exists(OUTPUT_FILE) and conteudo_final == existing:
        os.remove(tmp_output)
        print("  ✓ Fontes idênticas: bundle preservado sem reescrita.")
    else:
        os.replace(tmp_output, OUTPUT_FILE)

    # Observação: ultra_rotina_gas.js é legado congelado e não é mais gerado ou utilizado.

    total_linhas = len(conteudo_final.splitlines())
    total_bytes = len(conteudo_final.encode("utf-8"))

    print(f"\n🎉 Sucesso! {OUTPUT_FILE} gerado:")
    print(f"   • Total de Linhas: {total_linhas}")
    print(f"   • Tamanho: {total_bytes / 1024:.1f} KB")
    print(f"   • Checksum: {checksum_raw}")
    print("   • Validação de Sintaxe JS: 100% OK ✅")

if __name__ == "__main__":
    main()
