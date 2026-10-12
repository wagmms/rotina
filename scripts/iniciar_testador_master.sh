#!/usr/bin/env bash
# ==============================================================================
# ULTRA ROTINA · LAUNCHER DO TESTADOR MASTER (MASTER TESTER AUTÔNOMO)
# ==============================================================================
# Executa o Testador Master em janela visível de monitor com acompanhamento TUI ao vivo.
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Verifica ambiente virtual .venv
if [ -f "$ROOT_DIR/.venv/bin/python" ]; then
    PYTHON_BIN="$ROOT_DIR/.venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
else
    echo "❌ Erro: Python 3 não encontrado."
    exit 1
fi

echo "=============================================================================="
echo "🧪 ULTRA ROTINA · TESTADOR MASTER DE TELEGRAM"
echo "=============================================================================="
echo "• Modo: Execução em Janela Visível de Monitor (Conformidade Estrita com Diretrizes)"
echo "• Interpretador: $PYTHON_BIN"
echo "• Diretório: $ROOT_DIR"
echo "=============================================================================="
echo ""

# Executa o script repassando todos os argumentos fornecidos
exec "$PYTHON_BIN" "$ROOT_DIR/tooling/testador_master/testador_master.py" "$@"
