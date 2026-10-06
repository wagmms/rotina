#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==============================================================================
BUILD MASTER - COMPILADOR E AUDITOR DO ULTRA ROTINA MASTER
==============================================================================
Empacota os módulos de src/ em um único arquivo de produção para Google Apps Script
com verificação de integridade sintática e geração de checksum.
==============================================================================
"""

import os
from scripts.empacotar_gas import empacotar
import sys
import glob
import hashlib
import subprocess
from datetime import datetime

SRC_DIR = os.path.join(os.path.dirname(__file__), "src")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "ultra_rotina_master.js")

HEADER = """/**
 * ==============================================================================
 * ULTRA ROTINA · MASTER CLOUD ASSISTANT & COPILOTO CLÍNICO MULTIMODAL (v2.0)
 * ==============================================================================
 * Executa 100% na nuvem do Google (24/7), gratuito, sem precisar de PC ligado.
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
    for arq in arquivos_src:
        nome = os.path.basename(arq)
        if not verificar_sintaxe_js(arq):
            sys.exit(1)
        with open(arq, "r", encoding="utf-8") as f:
            conteudo = f.read().strip()
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
    tmp_output = OUTPUT_FILE + ".tmp.js"

    # Escreve primeiramente em arquivo temporário para validação atômica
    with open(tmp_output, "w", encoding="utf-8") as f:
        f.write(conteudo_final)

    # Validação do arquivo compilado antes de substituir a versão de produção
    if not verificar_sintaxe_js(tmp_output):
        print("❌ Falha na verificação de sintaxe do arquivo compilado. Build abortado.")
        if os.path.exists(tmp_output):
            os.remove(tmp_output)
        sys.exit(1)

    # Substituição atômica segura
    os.replace(tmp_output, OUTPUT_FILE)

    # Artefato de publicação: somente endpoints autenticados e acionadores expostos.
    gas_output = os.path.join(os.path.dirname(__file__), "ultra_rotina_gas.js")
    gas_tmp = gas_output + ".tmp.js"
    with open(gas_tmp, "w", encoding="utf-8") as f:
        f.write(empacotar(conteudo_final))
    if not verificar_sintaxe_js(gas_tmp):
        os.remove(gas_tmp)
        sys.exit(1)
    os.replace(gas_tmp, gas_output)

    total_linhas = len(conteudo_final.splitlines())
    total_bytes = len(conteudo_final.encode("utf-8"))

    print(f"\n🎉 Sucesso! {OUTPUT_FILE} gerado:")
    print(f"   • Total de Linhas: {total_linhas}")
    print(f"   • Tamanho: {total_bytes / 1024:.1f} KB")
    print(f"   • Checksum: {checksum_raw}")
    print("   • Validação de Sintaxe JS: 100% OK ✅")

if __name__ == "__main__":
    main()
