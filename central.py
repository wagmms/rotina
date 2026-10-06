#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==============================================================================
ROTINA HUB — CENTRAL GERAL DE CONTROLE & OBSERVABILIDADE
==============================================================================
Ponto de entrada para inicializar a Central Geral localmente.
Inicia o servidor FastAPI/Uvicorn e abre automaticamente o navegador padrão.
==============================================================================
"""

import os
import sys
import time
import argparse
import threading
import webbrowser
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

try:
    import uvicorn
except ImportError:
    print("❌ Uvicorn não encontrado. Execute: uv pip install fastapi 'uvicorn[standard]'")
    sys.exit(1)


def abrir_navegador(url: str, delay: float = 1.2):
    """Abre o navegador padrão após aguardar a subida do servidor."""
    time.sleep(delay)
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"⚠️ Não foi possível abrir o navegador automaticamente: {e}")


def main():
    parser = argparse.ArgumentParser(description="Rotina Hub — Central Geral de Operações")
    parser.add_argument("--host", default="127.0.0.1", help="Endereço de bind (padrão: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8088, help="Porta local HTTP (padrão: 8088)")
    parser.add_argument("--no-browser", action="store_true", help="Não abrir o navegador automaticamente")
    parser.add_argument("--reload", action="store_true", help="Habilitar auto-reload para desenvolvimento")
    args = parser.parse_args()

    url = f"http://{args.host}:{args.port}"

    print("=" * 72)
    print("  🚀 ROTINA HUB — CENTRAL GERAL DE CONTROLE & OBSERVABILIDADE")
    print("=" * 72)
    print(f"  • Servidor Local:    {url}")
    print(f"  • Diretório Base:    {BASE_DIR}")
    print(f"  • Process Runner:    Ativo com Streaming SSE")
    print(f"  • Auto-abertura:     {'Desativada' if args.no_browser else 'Ativa'}")
    print("=" * 72)
    print("  Pressione [Ctrl+C] a qualquer momento para encerrar a Central.")
    print("=" * 72)

    if not args.no_browser:
        t = threading.Thread(target=abrir_navegador, args=(url,), daemon=True)
        t.start()

    try:
        uvicorn.run(
            "central_hub.app:app",
            host=args.host,
            port=args.port,
            reload=args.reload,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n🛑 Central Geral encerrada com sucesso.")


if __name__ == "__main__":
    main()
