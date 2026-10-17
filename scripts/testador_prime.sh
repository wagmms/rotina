#!/usr/bin/env bash
# ==============================================================================
# LAUNCHER: BOT TESTADOR PRIME 2.0 (Telegram + Cockpit PWA)
# Uso:
#   bash scripts/testador_prime.sh
#   bash scripts/testador_prime.sh --mode cockpit
#   bash scripts/testador_prime.sh --mode telegram --cycles 2 --verbose
# ==============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Verifica se python3 está disponível
if ! command -v python3 >/dev/null 2>&1; then
    echo "❌ Erro: Python 3 não encontrado no PATH."
    exit 1
fi

python3 -m tooling.testador_prime.testador_prime "$@"
