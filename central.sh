#!/usr/bin/env bash
# ==============================================================================
# Script de Inicialização da Central Geral (Rotina Hub)
# ==============================================================================
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

# Seleciona interpretador Python (.venv se existir)
if [ -f "$DIR/.venv/bin/python" ]; then
    PYTHON_EXEC="$DIR/.venv/bin/python"
else
    PYTHON_EXEC="python3"
fi

echo "🚀 Iniciando Rotina Hub com $PYTHON_EXEC..."
exec "$PYTHON_EXEC" "$DIR/central.py" "$@"
