#!/usr/bin/env python3
"""
IA HUB - Visual Terminal Runner
Executa os autoloops (MedQuest, Rotina, Habitflow) dentro de uma ÚNICA janela física de terminal.
Quando o usuário alterna no Telegram entre projetos, este runner cancela o processo
anterior e inicia o novo na MESMA janela, permitindo acompanhamento visual em tempo real.
"""

import os
import sys
import time
import signal
import subprocess
import json
from pathlib import Path

DIR_CACHE = Path.home() / ".cache" / "ia-hub"
DIR_CACHE.mkdir(parents=True, exist_ok=True)
ARQUIVO_ALVO = DIR_CACHE / "alvo_visual.txt"

CORES = {
    "reset": "\033[0m",
    "bold": "\033[1m",
    "green": "\033[32m",
    "cyan": "\033[36m",
    "yellow": "\033[33m",
    "red": "\033[31m",
    "magenta": "\033[35m",
    "blue": "\033[34m"
}

_processo_ativo = None

def carregar_env_seguro():
    """Carrega variáveis do ambiente ou de ~/.config/ia-hub/ia-hub.env sem segredos no código."""
    env = os.environ.copy()
    env_file = Path.home() / ".config" / "ia-hub" / "ia-hub.env"
    if env_file.is_file():
        try:
            for linha in env_file.read_text(encoding="utf-8").splitlines():
                linha = linha.strip()
                if linha and not linha.startswith("#") and "=" in linha:
                    k, v = linha.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip("'\"")
                    if k and k not in env:
                        env[k] = v
        except Exception:
            pass
    return env

def matar_processo_ativo():
    """Encerra apenas o processo gerenciado por este runner e sua árvore genealógica."""
    global _processo_ativo
    if _processo_ativo:
        pid = _processo_ativo.pid
        try:
            pgid = os.getpgid(pid)
            if pgid > 1 and pgid != os.getpgrp():
                os.killpg(pgid, signal.SIGTERM)
                # Espera ordenada pelo término
                for _ in range(10):
                    if _processo_ativo.poll() is not None:
                        break
                    time.sleep(0.1)
                if _processo_ativo.poll() is None:
                    os.killpg(pgid, signal.SIGKILL)
        except Exception:
            try:
                _processo_ativo.terminate()
                time.sleep(0.3)
                if _processo_ativo.poll() is None:
                    _processo_ativo.kill()
            except Exception:
                pass
        finally:
            try:
                _processo_ativo.wait(timeout=1)
            except Exception:
                pass
        _processo_ativo = None

def tratar_sinal_saida(sig, frame):
    matar_processo_ativo()
    sys.exit(0)

try:
    signal.signal(signal.SIGTERM, tratar_sinal_saida)
    signal.signal(signal.SIGINT, tratar_sinal_saida)
    signal.signal(signal.SIGHUP, tratar_sinal_saida)
except Exception:
    pass

def ler_alvo_atual():
    if ARQUIVO_ALVO.exists():
        try:
            return ARQUIVO_ALVO.read_text(encoding="utf-8").strip().lower()
        except Exception:
            pass
    return "pausar"

def imprimir_banner(projeto):
    os.system("clear")
    if projeto in ["habitflow", "habit-flow"]:
        cor = CORES["cyan"]
        emoji = "🌊"
        nome = "HABITFLOW AUTOLOOP (Branch: autoloop/dev)"
        desc = "UI/UX Mobile Android, Compose, Domínio e Testes"
    elif projeto == "medquest":
        cor = CORES["cyan"]
        emoji = "🎯"
        nome = "MEDQUEST AUTOLOOP (Branch: autoloop/dev)"
        desc = "Otimização Contínua, Testes e Acessibilidade no MedQuest"
    elif projeto == "rotina":
        cor = CORES["green"]
        emoji = "🚀"
        nome = "ULTRA ROTINA AUTOLOOP"
        desc = "Correção de Erros, Testes de Funções e Cockpit PWA"
    else:
        cor = CORES["yellow"]
        emoji = "⏸️"
        nome = "AUTOLOOP EM REPOUSO (PAUSADO)"
        desc = "Aguardando você selecionar um projeto pelo Telegram..."

    print(f"\n{CORES['bold']}{cor}╔══════════════════════════════════════════════════════════════════════════════╗{CORES['reset']}")
    print(f"{CORES['bold']}{cor}║  {emoji} {nome:<68} ║{CORES['reset']}")
    print(f"{CORES['bold']}{cor}║  {desc:<71} ║{CORES['reset']}")
    print(f"{CORES['bold']}{cor}║  Controle via Telegram                                                       ║{CORES['reset']}")
    print(f"{CORES['bold']}{cor}╚══════════════════════════════════════════════════════════════════════════════╝{CORES['reset']}\n")

def recovery_delay(returncode, attempts):
    # Saída normal e sinais não autorizam reinício. Três tentativas no máximo.
    if returncode is None or returncode <= 0 or attempts >= 3:
        return None
    return 30 * (2 ** attempts)


def registrar_status(alvo, processo, attempts, next_retry):
    try:
        target = DIR_CACHE / 'runner_status.json'
        temp = target.with_name(f'.runner_status-{os.getpid()}.tmp')
        temp.write_text(json.dumps({'time': time.time(), 'runner_pid': os.getpid(),
            'target': alvo, 'child_pid': processo.pid if processo else None,
            'attempts': attempts, 'retry_in_seconds': max(0, next_retry-time.monotonic()) if next_retry else None}))
        os.replace(temp, target)
    except OSError:
        pass


def main():
    global _processo_ativo
    alvo_executando = None
    recovery_attempts = 0
    retry_at = None
    last_status = 0

    env_base = carregar_env_seguro()
    env_base["PYTHONUNBUFFERED"] = "1"
    env_base["AUTOLOOP_INHIBITED"] = "1"

    token = env_base.get("BOT_TOKEN_IA_HUB") or ""
    chat_id = env_base.get("TELEGRAM_CHAT_ID", "")
    if token:
        env_base["BOT_TOKEN_IA_HUB"] = token
        env_base["AUTOLOOP_TELEGRAM_BOT_TOKEN"] = token
        env_base["HABITFLOW_TELEGRAM_BOT_TOKEN"] = token
        env_base["MEDQUEST_TELEGRAM_BOT_TOKEN"] = token
    # Não poluir TELEGRAM_BOT_TOKEN para processos filhos (Rotina e outros possuem bots próprios)
    env_base.pop("TELEGRAM_BOT_TOKEN", None)
    if chat_id:
        env_base["HABITFLOW_TELEGRAM_CHAT_ID"] = chat_id
        env_base["TELEGRAM_CHAT_ID"] = chat_id

    imprimir_banner("pausado")

    while True:
        alvo_desejado = ler_alvo_atual()

        if alvo_desejado != alvo_executando:
            recovery_attempts = 0
            retry_at = None
            if _processo_ativo:
                print(f"\n{CORES['bold']}{CORES['yellow']}🛑 Alternando projeto: Encerrando autoloop anterior...{CORES['reset']}")
                matar_processo_ativo()
                time.sleep(0.5)

            alvo_executando = alvo_desejado
            imprimir_banner(alvo_desejado)

            if alvo_desejado in ["habitflow", "habit-flow"]:
                cmd = ["/home/wagmoraes/.local/bin/autoloop-habitflow"]
                cwd = "/home/wagmoraes/Projetos IA/Habitflow"
                if Path(cmd[0]).is_file():
                    _processo_ativo = subprocess.Popen(cmd, cwd=cwd, env=env_base, start_new_session=True)
                else:
                    print(f"{CORES['red']}Erro: Executável {cmd[0]} não encontrado.{CORES['reset']}")

            elif alvo_desejado == "medquest":
                cmd = ["/home/wagmoraes/.local/bin/autoloop-medquest"]
                cwd = "/home/wagmoraes/Projetos IA/MedQuest"
                if Path(cmd[0]).is_file():
                    _processo_ativo = subprocess.Popen(cmd, cwd=cwd, env=env_base, start_new_session=True)
                else:
                    print(f"{CORES['red']}Erro: Executável {cmd[0]} não encontrado.{CORES['reset']}")

            elif alvo_desejado == "rotina":
                cmd = ["/home/wagmoraes/.local/bin/autoloop"]
                cwd = "/home/wagmoraes/Projetos IA/Rotina"
                if Path(cmd[0]).is_file():
                    _processo_ativo = subprocess.Popen(cmd, cwd=cwd, env=env_base, start_new_session=True)
                else:
                    print(f"{CORES['red']}Erro: Executável {cmd[0]} não encontrado.{CORES['reset']}")

            elif alvo_desejado in ["pausar", "stop", "pausado"]:
                alvo_executando = "pausar"
                _processo_ativo = None
                print(f"{CORES['cyan']}💡 Dica: Toque em '🌊 Focar HabitFlow', '🎯 Focar MedQuest' ou '🚀 Focar Rotina' no Telegram para iniciar.{CORES['reset']}\n")

        elif _processo_ativo and _processo_ativo.poll() is not None:
            ret = _processo_ativo.poll()
            print(f"\n{CORES['red']}{CORES['bold']}⚠️ O processo do autoloop encerrou (código {ret}).{CORES['reset']}")
            _processo_ativo = None
            delay = recovery_delay(ret, recovery_attempts) if alvo_executando == 'rotina' else None
            if delay is not None:
                recovery_attempts += 1
                retry_at = time.monotonic() + delay
                print(f"Recuperação operacional {recovery_attempts}/3 em {delay}s; pausa e mudança de projeto cancelam o reinício.")
            else:
                print("Aguardando novo comando; reinício automático não elegível ou limite atingido.")
        elif retry_at is not None and time.monotonic() >= retry_at:
            # O alvo é relido em cada iteração, inclusive durante a espera.
            if alvo_desejado == 'rotina':
                _processo_ativo = subprocess.Popen(['/home/wagmoraes/.local/bin/autoloop'],
                    cwd='/home/wagmoraes/Projetos IA/Rotina', env=env_base, start_new_session=True)
            retry_at = None

        if time.monotonic() - last_status >= 5:
            registrar_status(alvo_executando, _processo_ativo, recovery_attempts, retry_at)
            last_status = time.monotonic()
        time.sleep(0.5)

if __name__ == "__main__":
    main()
