#!/usr/bin/env bash
# ==============================================================================
# LAUNCHER DESKTOP DO ROTINA HUB
# ==============================================================================

DIR="/home/wagmoraes/Projetos IA/Rotina"
URL="http://127.0.0.1:8088"
LOG_FILE="$HOME/.rotina_hub.log"
PYTHON_BIN="$DIR/.venv/bin/python"

# 1. Verifica se o backend já está ativo e respondendo
esta_rodando() {
    curl -s -m 1 "$URL/api/status" >/dev/null 2>&1
}

if ! esta_rodando; then
    echo "Iniciando backend do Rotina Hub via systemd..."
    systemctl --user start rotina-hub
    
    # Aguarda até 5 segundos para inicializar
    for i in {1..15}; do
        if esta_rodando; then
            break
        fi
        sleep 0.3
    done
fi

# 2. Abre a interface no navegador
if [ -f "$HOME/.local/bin/opera" ]; then
    "$HOME/.local/bin/opera" "$URL" >/dev/null 2>&1 || true
else
    xdg-open "$URL" >/dev/null 2>&1 || true
fi
