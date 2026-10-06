#!/usr/bin/env python3
"""
Teste focado de Prescrição REMUME e Geração de PDF Oficial no Telegram.
"""

import os
import sys
import asyncio
import time
from pathlib import Path
from dotenv import load_dotenv
from telethon import TelegramClient

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

API_ID = int(os.getenv("TELEGRAM_API_ID"))
API_HASH = os.getenv("TELEGRAM_API_HASH")
SESSION_PATH = str(BASE_DIR / "user_session")
BOT_TARGET = "wagner_rotina_bot"


async def run_rx_pdf_test():
    client = TelegramClient(SESSION_PATH, API_ID, API_HASH)
    await client.connect()

    print("=" * 60)
    print("TESTE DE PRESCRIÇÃO REMUME E PDF DE RECEITA OFICIAL")
    print("=" * 60)

    # 1. Envia pedido de receita
    print("\n[1] Enviando pedido de receita ambulatorial...")
    sent = await client.send_message(
        BOT_TARGET,
        "/rx Amigdalite bacteriana estreptocócica adulto 70kg, alérgico a penicilina"
    )

    # Aguarda resposta da prescrição
    resp_rx = None
    start = time.time()
    while time.time() - start < 35:
        await asyncio.sleep(2)
        async for msg in client.iter_messages(BOT_TARGET, limit=3):
            sender = await msg.get_sender()
            if getattr(sender, "is_self", False):
                continue
            if msg.id > sent.id:
                resp_rx = msg
                break
        if resp_rx:
            break

    if not resp_rx:
        print("[ERRO] Timeout aguardando resposta da prescrição.")
        await client.disconnect()
        return

    print(f"\n[OK] Prescrição recebida (ID: {resp_rx.id})!")
    print(f"Texto da prescrição:\n{resp_rx.text}\n")
    print(f"Botões presentes: {resp_rx.buttons}")

    # Procura o botão para gerar PDF
    btn_pdf = None
    if resp_rx.buttons:
        for row in resp_rx.buttons:
            for b in row:
                if "PDF" in b.text or "Receita" in b.text:
                    btn_pdf = b
                    break

    if not btn_pdf:
        print("[AVISO] Nenhum botão de PDF encontrado nos botões da mensagem.")
        await client.disconnect()
        return

    print(f"\n[2] Clicando no botão inline: '{btn_pdf.text}'...")
    await btn_pdf.click()

    # Aguarda o PDF gerado ou a mensagem com o link/arquivo
    print("Aguardando retorno do PDF pelo Google Apps Script...")
    resp_pdf = None
    start_pdf = time.time()
    while time.time() - start_pdf < 40:
        await asyncio.sleep(2)
        async for msg in client.iter_messages(BOT_TARGET, limit=3):
            sender = await msg.get_sender()
            if getattr(sender, "is_self", False):
                continue
            if msg.id > resp_rx.id:
                resp_pdf = msg
                break
        if resp_pdf:
            break

    if resp_pdf:
        print(f"\n[OK] Retorno do PDF recebido (ID: {resp_pdf.id})!")
        print(f"Texto/Mensagem: {resp_pdf.text}")
        if resp_pdf.media:
            print(f"Mídia anexada: {type(resp_pdf.media)}")
            if hasattr(resp_pdf.media, "document"):
                print(f"Documento recebido! Baixando arquivo...")
                path_download = await client.download_media(resp_pdf, file=str(BASE_DIR / "receita_baixada_telegram.pdf"))
                print(f"Arquivo salvo em: {path_download}")
    else:
        print("[TIMEOUT] O bot não retornou o PDF dentro do tempo limite.")

    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(run_rx_pdf_test())
