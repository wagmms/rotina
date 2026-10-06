#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==============================================================================
PC TASK BRIDGE — WORKER LOCAL DE EXECUÇÃO EM SEGUNDO PLANO
==============================================================================
Consome a fila persistente de tarefas em nuvem do Google Apps Script.
Permite disparar comandos como '/pc tenda' ou '/pc sync' no Telegram pelo
celular e receber o relatório executado e formatado diretamente no chat assim
que o computador estiver ligado.
==============================================================================
"""

import os
import sys
import time
import json
import argparse
import subprocess
import urllib.request
import urllib.parse
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
DEPLOY_STATE_FILE = BASE_DIR / ".deploy_state.json"
SCRIPTS_DIR = BASE_DIR / "scripts"
CALENDAR_DIR = BASE_DIR / "calendar_manager"

VENV_PYTHON = BASE_DIR / ".venv" / "bin" / "python"
PYTHON_BIN = str(VENV_PYTHON) if VENV_PYTHON.exists() else sys.executable


def carregar_configuracao() -> Dict[str, Any]:
    """Carrega segredos e URLs da aplicação a partir de .deploy_state.json ou variáveis de ambiente."""
    config = {}
    if DEPLOY_STATE_FILE.exists():
        try:
            with open(DEPLOY_STATE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                config = data.get("config", {})
        except Exception as e:
            print(f"[BRIDGE] Aviso ao ler .deploy_state.json: {e}", file=sys.stderr)

    return {
        "bot_token": os.getenv("TELEGRAM_BOT_TOKEN") or config.get("TELEGRAM_BOT_TOKEN", ""),
        "chat_id": os.getenv("TELEGRAM_CHAT_ID") or config.get("TELEGRAM_CHAT_ID", ""),
        "web_app_url": os.getenv("WEB_APP_URL") or config.get("WEB_APP_URL", ""),
        "secret": os.getenv("WEBHOOK_SECRET") or config.get("WEBHOOK_SECRET", "")
    }


def enviar_mensagem_telegram(bot_token: str, chat_id: str, texto: str) -> bool:
    """Envia mensagem formatada em Markdown para o chat do Telegram."""
    if not bot_token or not chat_id:
        print("[BRIDGE] Erro: TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurados.")
        return False

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": str(chat_id),
        "text": texto,
        "parse_mode": "Markdown",
        "disable_web_page_preview": True
    }

    try:
        data_encoded = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data_encoded,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.status == 200
    except Exception as e:
        print(f"[BRIDGE] Falha ao enviar mensagem para Telegram: {e}", file=sys.stderr)
        return False


def consultar_tarefas_pendentes(web_app_url: str, secret: str) -> List[Dict[str, Any]]:
    """Consulta tarefas pendentes no endpoint do Google Apps Script."""
    if not web_app_url or not secret:
        return []

    url = f"{web_app_url}?secret={secret}&action=poll_pc_tasks"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "RotinaPcBridge/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("ok"):
                return data.get("tasks", [])
    except Exception as e:
        print(f"[BRIDGE] Erro ao consultar tarefas em nuvem: {e}", file=sys.stderr)

    return []


def marcar_tarefa_concluida(web_app_url: str, secret: str, task_id: str, status: str = "done", resultado: str = "") -> bool:
    """Confirma conclusão da tarefa para o Google Apps Script."""
    if not web_app_url or not secret or not task_id:
        return False

    params = urllib.parse.urlencode({
        "secret": secret,
        "action": "complete_pc_task",
        "task_id": task_id,
        "status": status,
        "resultado": resultado[:200]
    })
    url = f"{web_app_url}?{params}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "RotinaPcBridge/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return bool(data.get("ok"))
    except Exception as e:
        print(f"[BRIDGE] Erro ao marcar tarefa {task_id} como concluída: {e}", file=sys.stderr)
        return False


def executar_tarefa_local(tarefa: str, args: List[str]) -> Dict[str, Any]:
    """Mapeia e executa o comando correspondente no computador local."""
    t = tarefa.lower().strip()
    cmd = []
    cwd = BASE_DIR
    nome_exibicao = t

    if t in ["tenda", "carnes", "tenda_carnes"]:
        nome_exibicao = "Cotação de Carnes no Tenda Atacado"
        cmd = [PYTHON_BIN, str(SCRIPTS_DIR / "tenda_compras_quinzenal.py"), "--apenas-carnes", "--sem-fechamento"]
    elif t in ["tenda_completo", "compras"]:
        nome_exibicao = "Cotação Completa no Tenda Atacado"
        cmd = [PYTHON_BIN, str(SCRIPTS_DIR / "tenda_compras_quinzenal.py"), "--modo-completo", "--sem-fechamento"]
    elif t in ["sync", "sync_agenda", "medquest"]:
        nome_exibicao = "Sincronização Avançada MedQuest / Google Calendar"
        cmd = [PYTHON_BIN, str(CALENDAR_DIR / "sync_avancado_medquest.py"), "--dry-run"]
        cwd = CALENDAR_DIR
    elif t in ["audit", "conflitos"]:
        nome_exibicao = "Auditoria de Conflitos e Sobreposições de Agenda"
        cmd = [PYTHON_BIN, str(CALENDAR_DIR / "check_overlaps.py")]
        cwd = CALENDAR_DIR
    elif t in ["build", "build_master"]:
        nome_exibicao = "Compilação do Ultra Rotina Master"
        cmd = [PYTHON_BIN, str(BASE_DIR / "build_master.py")]
    elif t in ["test", "tests", "pytest"]:
        nome_exibicao = "Suíte de Testes Automatizados (Pytest)"
        cmd = [PYTHON_BIN, "-m", "pytest", "tests/", "-q"]
    elif t in ["status", "ping"]:
        import platform
        import shutil
        total, used, free = shutil.disk_usage("/")
        disco_livre_gb = free // (2**30)
        hora = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        res_txt = (
            f"🖥️ *STATUS DO COMPUTADOR LOCAL*\n\n"
            f"• *Horário Local:* `{hora}`\n"
            f"• *Sistema Operacional:* `{platform.system()} {platform.release()}`\n"
            f"• *Espaço Livre em Disco:* `{disco_livre_gb} GB`\n"
            f"• *Python Ambiente:* `{PYTHON_BIN}`\n"
            f"• *Daemon Worker:* `Operacional e Ativo ✅`"
        )
        return {"sucesso": True, "nome": "Status do PC", "saida": res_txt}
    else:
        return {
            "sucesso": False,
            "nome": t,
            "saida": f"Comando `{t}` não reconhecido pelo catálogo de tarefas do PC."
        }

    # Adiciona argumentos adicionais se fornecidos
    if args:
        cmd.extend(args)

    inicio = time.time()
    try:
        proc = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, timeout=300)
        duracao = round(time.time() - inicio, 1)
        saida_limpa = proc.stdout.strip()
        if not saida_limpa and proc.stderr:
            saida_limpa = proc.stderr.strip()

        # Limita tamanho para envio seguro no Telegram
        if len(saida_limpa) > 3000:
            saida_limpa = saida_limpa[-2800:] + "\n\n...(saída truncada para caber no Telegram)"

        return {
            "sucesso": proc.returncode == 0,
            "nome": nome_exibicao,
            "duracao": duracao,
            "codigo_saida": proc.returncode,
            "saida": saida_limpa
        }
    except subprocess.TimeoutExpired:
        return {
            "sucesso": False,
            "nome": nome_exibicao,
            "saida": "Tempo limite de execução excedido (5 minutos)."
        }
    except Exception as e:
        return {
            "sucesso": False,
            "nome": nome_exibicao,
            "saida": f"Exceção ao executar tarefa: {e}"
        }


def formatar_relatorio_tarefa(resultado: Dict[str, Any]) -> str:
    """Formata o relatório executivo para envio no Telegram."""
    nome = resultado.get("nome", "Tarefa")
    sucesso = resultado.get("sucesso", False)
    duracao = resultado.get("duracao", 0)
    icone = "✅" if sucesso else "❌"

    if nome == "Status do PC":
        return resultado.get("saida", "")

    cabecalho = (
        f"{icone} *RELATÓRIO DE TAREFA LOCAL (PC)*\n"
        f"========================================\n"
        f"• *Ação:* `{nome}`\n"
        f"• *Status:* {'Concluído com Sucesso' if sucesso else 'Falha na Execução'}\n"
        f"• *Duração:* `{duracao}s`\n\n"
    )

    saida = resultado.get("saida", "Sem saída registrada.")
    return f"{cabecalho}```text\n{saida}\n```"


def processar_ciclo(config: Dict[str, Any]) -> int:
    """Executa um ciclo único de verificação e execução."""
    web_url = config.get("web_app_url")
    secret = config.get("secret")
    bot_token = config.get("bot_token")
    chat_id = config.get("chat_id")

    if not web_url or not secret:
        return 0

    tarefas = consultar_tarefas_pendentes(web_url, secret)
    if not tarefas:
        return 0

    print(f"[{datetime.now().strftime('%H:%M:%S')}] 📥 {len(tarefas)} tarefa(s) pendente(s) encontrada(s).")
    processadas = 0

    for item in tarefas:
        task_id = item.get("id")
        nome_tarefa = item.get("tarefa", "")
        args = item.get("args", [])
        destino_chat = item.get("chat_id") or chat_id

        print(f"  ▶ Executando '{nome_tarefa}' ({task_id})...")
        res = executar_tarefa_local(nome_tarefa, args)
        msg_relatorio = formatar_relatorio_tarefa(res)

        # Envia relatório ao Telegram
        enviar_mensagem_telegram(bot_token, destino_chat, msg_relatorio)

        # Marca como concluída na nuvem
        status_final = "done" if res.get("sucesso") else "error"
        marcar_tarefa_concluida(web_url, secret, task_id, status_final, res.get("nome"))
        processadas += 1

    return processadas


def main():
    parser = argparse.ArgumentParser(description="Rotina PC Task Bridge — Executor local de ordens do Telegram")
    parser.add_argument("--once", action="store_true", help="Executa apenas uma varredura da fila e finaliza")
    parser.add_argument("--interval", type=int, default=15, help="Intervalo de polling em segundos (padrão: 15s)")
    args = parser.parse_args()

    config = carregar_configuracao()
    if not config.get("web_app_url") or not config.get("secret"):
        print("[ERRO] WEB_APP_URL ou WEBHOOK_SECRET não configurados.", file=sys.stderr)
        sys.exit(1)

    print("=" * 64)
    print("  🖥️ ROTINA PC TASK BRIDGE — WORKER ATIVO")
    print("=" * 64)
    print(f"  • WebApp Nuvem:  {config.get('web_app_url')[:45]}...")
    print(f"  • Chat Destino:  {config.get('chat_id')}")
    print(f"  • Modo:          {'Execução Única (--once)' if args.once else f'Daemon Contínuo ({args.interval}s)'}")
    print("=" * 64)

    if args.once:
        count = processar_ciclo(config)
        print(f"✓ Ciclo único concluído. Tarefas processadas: {count}")
        return

    try:
        while True:
            processar_ciclo(config)
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\n🛑 PC Task Bridge encerrado.")


if __name__ == "__main__":
    main()
