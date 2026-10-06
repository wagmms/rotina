#!/usr/bin/env python3
"""
Teste de áudio socrático do preceptor em produção na nuvem.
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


async def run_voice_test():
    client = TelegramClient(SESSION_PATH, API_ID, API_HASH)
    await client.connect()

    print("=" * 60)
    print("TESTE DO PRECEPTOR SOCRÁTICO EM PRODUÇÃO")
    print("=" * 60)

    print("\n[1] Enviando /round...")
    sent = await client.send_message(
        BOT_TARGET,
        "/round Paciente 68a, DPOC grave exacerbado, gasometria pH 7.28, pCO2 58, sonolento, iniciado VNI"
    )

    resp_round = None
    start = time.time()
    while time.time() - start < 35:
        await asyncio.sleep(2)
        async for msg in client.iter_messages(BOT_TARGET, limit=3):
            sender = await msg.get_sender()
            if getattr(sender, "is_self", False):
                continue
            if msg.id > sent.id:
                resp_round = msg
                break
        if resp_round:
            break

    if not resp_round:
        print("[ERRO] Timeout aguardando /round.")
        await client.disconnect()
        return

    print(f"\n[OK] Round recebido (ID: {resp_round.id})!")
    btn_audio = None
    if resp_round.buttons:
        for row in resp_round.buttons:
            for b in row:
                if "Ouvir" in b.text or "Preceptor" in b.text or "Voz" in b.text:
                    btn_audio = b
                    break

    if not btn_audio:
        print("[AVISO] Nenhum botão de áudio encontrado.")
        await client.disconnect()
        return

    print(f"\n[2] Clicando no botão: '{btn_audio.text}'...")
    await btn_audio.click()

    print("Aguardando retorno do áudio pelo bot...")
    resp_audio = None
    start_aud = time.time()
    while time.time() - start_aud < 40:
        await asyncio.sleep(2)
        async for msg in client.iter_messages(BOT_TARGET, limit=3):
            sender = await msg.get_sender()
            if getattr(sender, "is_self", False):
                continue
            if msg.id > resp_round.id:
                resp_audio = msg
                break
        if resp_audio:
            break

    if resp_audio:
        print(f"\n[OK] Retorno do Preceptor recebido (ID: {resp_audio.id})!")
        print(f"Legenda/Texto: {resp_audio.text}")
        print(f"É nota de voz/áudio: {bool(resp_audio.voice or resp_audio.audio or resp_audio.media)}")
        if resp_audio.media:
            download_path = await client.download_media(resp_audio, file=str(BASE_DIR / "audio_preceptor_producao.ogg"))
            print(f"Áudio baixado em: {download_path}")
    else:
        print("[TIMEOUT] O bot não enviou o áudio dentro do tempo limite.")

    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(run_voice_test())
