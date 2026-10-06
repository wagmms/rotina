#!/usr/bin/env python3
"""
Pipeline de Deploy Automatizado para o Google Apps Script via Clasp
Compila, valida sintaxe, envia para a nuvem do Google e publica nova versão.
"""

import os
import sys
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
GAS_DEPLOY_DIR = BASE_DIR / "gas_deploy"
DEPLOYMENT_ID = "AKfycbwo6GqTmc0_8fl9peKlw5d5jpfL5nqsc-ozLrqHiVk2RHD4h968EZAG4P75i2qSBlw9EQ"

def run_cmd(cmd, cwd=BASE_DIR, check=True):
    print(f"\n🚀 Executando: {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    res = subprocess.run(cmd, cwd=str(cwd), shell=isinstance(cmd, str), capture_output=True, text=True)
    if res.stdout:
        print(res.stdout.strip())
    if res.stderr and res.returncode != 0:
        print(f"[ERRO]: {res.stderr.strip()}", file=sys.stderr)
    if check and res.returncode != 0:
        sys.exit(res.returncode)
    return res

def main():
    print("=" * 60)
    print("INICIANDO DEPLOY COMPLETO NO GOOGLE APPS SCRIPT")
    print("=" * 60)

    # Validar antes de alterar o artefato ou a nuvem.
    run_cmd([str(BASE_DIR / ".venv" / "bin" / "python"), "-m", "pytest", "tests", "-q"])

    # 1. Compilação e checagem de sintaxe
    run_cmd(["python3", "build_master.py"])

    # 2. Atualiza diretório de deploy
    GAS_DEPLOY_DIR.mkdir(exist_ok=True)
    master_code = (BASE_DIR / "ultra_rotina_master.js").read_text(encoding="utf-8")
    (GAS_DEPLOY_DIR / "Code.js").write_text(master_code, encoding="utf-8")
    (BASE_DIR / "automations" / "google_apps_script_master_assistant.js").write_text(master_code, encoding="utf-8")
    comp_html = (BASE_DIR / "composicao_corporal.html").read_text(encoding="utf-8")
    (GAS_DEPLOY_DIR / "ComposicaoCorporal.html").write_text(comp_html, encoding="utf-8")
    cockpit_html = (BASE_DIR / "cockpit_movel.html").read_text(encoding="utf-8")
    (GAS_DEPLOY_DIR / "CockpitApp.html").write_text(cockpit_html, encoding="utf-8")
    print("✓ Código copiado para gas_deploy/Code.js, ComposicaoCorporal.html, CockpitApp.html e automations/.")


    # 3. Clasp Push
    print("\n📦 Enviando arquivos para a nuvem do Google...")
    run_cmd(["npx", "--yes", "@google/clasp@3.4.1", "push", "-f"], cwd=GAS_DEPLOY_DIR)

    # 4. Clasp Deploy (Atualiza WebApp de produção)
    descricao = f"Deploy automatizado - {subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S']).decode().strip()}"
    print(f"\n🌐 Publicando versão do WebApp ({DEPLOYMENT_ID})...")
    run_cmd(["npx", "--yes", "@google/clasp@3.4.1", "deploy", "-i", DEPLOYMENT_ID, "-d", descricao], cwd=GAS_DEPLOY_DIR)

    # 4.1 Sincronização remota de ScriptProperties e Webhook
    print("\n🔐 Sincronizando ScriptProperties (Gemini Pool e configurações) na nuvem...")
    try:
        import json, urllib.request
        state_file = BASE_DIR / ".deploy_state.json"
        if state_file.exists():
            state = json.loads(state_file.read_text(encoding="utf-8"))
            secret = state.get("config", {}).get("WEBHOOK_SECRET")
            web_url = state.get("config", {}).get("WEB_APP_URL") or f"https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec"
            if secret and web_url:
                payload = {
                    "GEMINI_API_KEYS": state.get("config", {}).get("GEMINI_API_KEYS"),
                    "PROVEDOR_TEXTO_PADRAO": state.get("config", {}).get("PROVEDOR_TEXTO_PADRAO", "GEMINI")
                }
                conf_req = urllib.request.Request(
                    f"{web_url}?secret={secret}&action=configure",
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(conf_req, timeout=30) as resp:
                    resp_data = json.loads(resp.read().decode("utf-8"))
                    print(f"✓ Configuração na nuvem aplicada com sucesso: {resp_data}")
                    if resp_data.get("gemini_keys_count") is not None:
                        print(f"✓ Pool de chaves ativo na nuvem: {resp_data.get('gemini_keys_count')} chaves detectadas.")
    except Exception as e:
        print(f"⚠️ Aviso ao sincronizar ScriptProperties com o Google Apps Script: {e}")

    # 5. Sincronização dos comandos nativos na API do Telegram
    print("\n🤖 Sincronizando menu nativo de comandos com a API do Telegram...")
    try:
        import json, urllib.request
        state_file = BASE_DIR / ".deploy_state.json"
        if state_file.exists():
            state = json.loads(state_file.read_text(encoding="utf-8"))
            token = state.get("config", {}).get("TELEGRAM_BOT_TOKEN")
            if token:
                comandos = [
                    {"command": "menu", "description": "Central de comandos e especialidades"},
                    {"command": "novo", "description": "Limpar memória e iniciar novo caso"},
                    {"command": "cancelar", "description": "Encerrar modo ativo ou ação atual"},
                    {"command": "teclado", "description": "Ativar botões rápidos no rodapé"},
                    {"command": "fila", "description": "Ver pedidos e entregas pendentes"},
                    {"command": "ajuda", "description": "Manual completo de instruções"}
                ]
                url = f"https://api.telegram.org/bot{token}/setMyCommands"
                # Sincroniza escopo padrão
                req_default = urllib.request.Request(
                    url,
                    data=json.dumps({"commands": comandos}).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )
                urllib.request.urlopen(req_default, timeout=15)
                # Sincroniza escopo conversas privadas
                req_private = urllib.request.Request(
                    url,
                    data=json.dumps({"commands": comandos, "scope": {"type": "all_private_chats"}}).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )
                urllib.request.urlopen(req_private, timeout=15)
                print("✓ Comandos nativos do Telegram sincronizados com sucesso!")
            else:
                print("⚠️ Token do bot não encontrado em .deploy_state.json; pulando setMyCommands.")
        else:
            print("⚠️ Arquivo .deploy_state.json não encontrado; pulando setMyCommands.")
    except Exception as e:
        print(f"⚠️ Aviso ao sincronizar comandos com o Telegram: {e}")

    print("\n" + "=" * 60)
    print("🎉 DEPLOY CONCLUÍDO COM SUCESSO NA NUVEM DO GOOGLE!")
    print("=" * 60)

if __name__ == "__main__":
    main()

