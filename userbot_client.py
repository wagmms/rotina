#!/usr/bin/env python3
"""
Cliente Telegram de Usuário (Userbot via Telethon)
Permite monitorar conversas e enviar mensagens em nome da conta pessoal do usuário.
"""

import os
import sys
import asyncio
import argparse
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Carrega variáveis de ambiente
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

API_ID_STR = os.getenv("TELEGRAM_API_ID")
API_HASH = os.getenv("TELEGRAM_API_HASH")

if not API_ID_STR or not API_HASH:
    print("[ERRO] TELEGRAM_API_ID ou TELEGRAM_API_HASH não configurados no arquivo .env")
    sys.exit(1)

try:
    API_ID = int(API_ID_STR)
except ValueError:
    print("[ERRO] TELEGRAM_API_ID deve ser um número inteiro válido.")
    sys.exit(1)

SESSION_PATH = str(BASE_DIR / "user_session")

try:
    from telethon import TelegramClient, events
    from telethon.tl.types import User, Chat, Channel
except ImportError:
    print("[ERRO] Telethon não encontrado. Execute: .venv/bin/python userbot_client.py ...")
    sys.exit(1)


def get_client() -> TelegramClient:
    """Cria e retorna a instância do cliente Telethon."""
    return TelegramClient(SESSION_PATH, API_ID, API_HASH)


async def cmd_login() -> bool:
    """Autentica interativamente no Telegram."""
    client = get_client()
    try:
        print("Iniciando processo de autenticação...")
        print("O Telethon solicitará seu número de telefone (ex: +5511999999999) e o código enviado pelo Telegram.\n")
        await client.start()
        me = await client.get_me()
        print("\n" + "=" * 50)
        print("SUCESSO: Autenticado com sucesso!")
        print(f"Nome: {me.first_name} {me.last_name or ''}".strip())
        print(f"Username: @{me.username}" if me.username else "Username: (não definido)")
        print(f"ID do Usuário: {me.id}")
        print(f"Telefone: +{me.phone}")
        print("=" * 50)
        return True
    except Exception as e:
        print(f"[ERRO na autenticação]: {e}", file=sys.stderr)
        return False
    finally:
        if client.is_connected():
            await client.disconnect()


async def cmd_chats(limit: int = 20) -> bool:
    """Lista os diálogos/chats mais recentes."""
    client = get_client()
    try:
        await client.connect()
        if not await client.is_user_authorized():
            print("[AVISO] Conta não autenticada. Execute primeiro: python userbot_client.py login", file=sys.stderr)
            return False

        print(f"\nCarregando os últimos {limit} chats/diálogos...\n")
        print(f"{'ID':<16} | {'TIPO':<10} | {'USERNAME':<20} | {'NOME/TÍTULO'}")
        print("-" * 75)

        async for dialog in client.iter_dialogs(limit=limit):
            entity = dialog.entity
            tipo = "Privado"
            username = "-"

            if isinstance(entity, User):
                tipo = "Usuário"
                username = f"@{entity.username}" if entity.username else "-"
            elif isinstance(entity, Channel):
                tipo = "Supergrupo" if entity.megagroup else "Canal"
                username = f"@{entity.username}" if entity.username else "-"
            elif isinstance(entity, Chat):
                tipo = "Grupo"

            print(f"{dialog.id:<16} | {tipo:<10} | {username:<20} | {dialog.name}")
        return True
    except Exception as e:
        print(f"[ERRO ao listar chats]: {e}", file=sys.stderr)
        return False
    finally:
        if client.is_connected():
            await client.disconnect()


async def cmd_send(target: str, message: str, reply_to: int = None) -> bool:
    """Envia uma mensagem para um usuário, grupo ou canal em seu nome."""
    client = get_client()
    try:
        await client.connect()
        if not await client.is_user_authorized():
            print("[AVISO] Conta não autenticada. Execute primeiro: python userbot_client.py login", file=sys.stderr)
            return False

        # Tenta converter para inteiro se for ID numérico
        entity_target = target
        try:
            entity_target = int(target)
        except ValueError:
            pass

        sent = await client.send_message(entity_target, message, reply_to=reply_to)
        print(f"[OK] Mensagem enviada com sucesso em seu nome!")
        print(f"Destino: {target}")
        print(f"ID da Mensagem: {sent.id}")
        print(f"Conteúdo: {message}")
        return True
    except Exception as e:
        print(f"[ERRO ao enviar]: {e}", file=sys.stderr)
        return False
    finally:
        if client.is_connected():
            await client.disconnect()


async def cmd_history(target: str, limit: int = 10) -> bool:
    """Visualiza as últimas mensagens de um chat."""
    client = get_client()
    try:
        await client.connect()
        if not await client.is_user_authorized():
            print("[AVISO] Conta não autenticada. Execute primeiro: python userbot_client.py login", file=sys.stderr)
            return False

        entity_target = target
        try:
            entity_target = int(target)
        except ValueError:
            pass

        print(f"\nRecuperando as últimas {limit} mensagens de {target}...\n")
        async for msg in client.iter_messages(entity_target, limit=limit):
            sender = await msg.get_sender()
            sender_name = "Desconhecido"
            if sender:
                sender_name = getattr(sender, "first_name", "") or getattr(sender, "title", "Desconhecido")
            dt = msg.date.strftime("%Y-%m-%d %H:%M:%S") if msg.date else ""
            print(f"[{dt}] [{msg.id}] {sender_name}: {msg.text or '<mídia/arquivo>'}")
        return True
    except Exception as e:
        print(f"[ERRO ao buscar histórico]: {e}", file=sys.stderr)
        return False
    finally:
        if client.is_connected():
            await client.disconnect()


async def cmd_monitor(chats=None, keywords=None):
    """Monitora mensagens em tempo real."""
    client = get_client()
    await client.connect()
    if not await client.is_user_authorized():
        print("[AVISO] Conta não autenticada. Execute primeiro: python userbot_client.py login")
        await client.disconnect()
        return

    me = await client.get_me()
    print("=" * 60)
    print(f"MONITORAMENTO ATIVO para a conta: {me.first_name} (ID: {me.id})")
    if chats:
        print(f"Filtro de Chats: {chats}")
    if keywords:
        print(f"Filtro de Palavras-chave: {keywords}")
    print("Pressione Ctrl+C para encerrar o monitoramento.")
    print("=" * 60 + "\n")

    # Tratamento de alvos para filtro
    target_chats = None
    if chats:
        target_chats = []
        for c in chats.split(","):
            c = c.strip()
            try:
                target_chats.append(int(c))
            except ValueError:
                target_chats.append(c)

    keywords_list = [k.strip().lower() for k in keywords.split(",")] if keywords else None

    @client.on(events.NewMessage(chats=target_chats))
    async def handler(event):
        msg = event.message
        text = msg.text or ""

        # Filtro de palavras-chave, se especificado
        if keywords_list:
            if not any(k in text.lower() for k in keywords_list):
                return

        chat = await event.get_chat()
        chat_title = getattr(chat, "title", None) or getattr(chat, "first_name", "Chat Desconhecido")
        chat_id = event.chat_id

        sender = await event.get_sender()
        sender_name = "Desconhecido"
        if sender:
            sender_name = getattr(sender, "first_name", "") or getattr(sender, "title", "Desconhecido")
            if getattr(sender, "last_name", None):
                sender_name += f" {sender.last_name}"

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        print(f"\n--- [NOVA MENSAGEM] {timestamp} ---")
        print(f"Chat: {chat_title} (ID: {chat_id})")
        print(f"Remetente: {sender_name}")
        print(f"Texto:\n{text if text else '<mídia/arquivo>'}")
        print("-" * 35)

    try:
        await client.run_until_disconnected()
    finally:
        await client.disconnect()


def main():
    parser = argparse.ArgumentParser(description="Telegram Userbot - Monitoramento e Envio em seu nome")
    subparsers = parser.add_subparsers(dest="command", help="Comandos disponíveis")

    # Comando: login
    subparsers.add_parser("login", help="Autentica na conta do Telegram")

    # Comando: chats
    parser_chats = subparsers.add_parser("chats", help="Lista chats e diálogos recentes")
    parser_chats.add_argument("--limit", type=int, default=20, help="Quantidade de chats a listar")

    # Comando: send
    parser_send = subparsers.add_parser("send", help="Envia mensagem em seu nome")
    parser_send.add_argument("--to", required=True, help="Destinatário (username, ID ou telefone)")
    parser_send.add_argument("--message", "-m", required=True, help="Texto da mensagem")
    parser_send.add_argument("--reply-to", type=int, default=None, help="ID da mensagem para responder")

    # Comando: history
    parser_hist = subparsers.add_parser("history", help="Mostra histórico recente de um chat")
    parser_hist.add_argument("--chat", required=True, help="Chat ID ou username")
    parser_hist.add_argument("--limit", type=int, default=10, help="Número de mensagens")

    # Comando: monitor
    parser_mon = subparsers.add_parser("monitor", help="Monitora mensagens em tempo real")
    parser_mon.add_argument("--chats", default=None, help="Filtrar por IDs/usernames separados por vírgula")
    parser_mon.add_argument("--keywords", default=None, help="Filtrar por palavras-chave separadas por vírgula")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    loop = asyncio.get_event_loop()
    success = True

    if args.command == "login":
        success = loop.run_until_complete(cmd_login())
    elif args.command == "chats":
        success = loop.run_until_complete(cmd_chats(limit=args.limit))
    elif args.command == "send":
        success = loop.run_until_complete(cmd_send(target=args.to, message=args.message, reply_to=args.reply_to))
    elif args.command == "history":
        success = loop.run_until_complete(cmd_history(target=args.chat, limit=args.limit))
    elif args.command == "monitor":
        success = loop.run_until_complete(cmd_monitor(chats=args.chats, keywords=args.keywords))

    if success is False:
        sys.exit(1)


if __name__ == "__main__":
    main()
