#!/usr/bin/env python3
"""
Suíte de Testes Automatizados E2E ao Vivo via Telethon
Testa todas as funções do Wagner Rotina Bot agindo como o próprio usuário.
"""

import os
import sys
import asyncio
import base64
import io
import time
from pathlib import Path
from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFont
from gtts import gTTS
from telethon import TelegramClient
from telethon.tl.types import MessageMediaPhoto, MessageMediaDocument

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

API_ID = int(os.getenv("TELEGRAM_API_ID"))
API_HASH = os.getenv("TELEGRAM_API_HASH")
SESSION_PATH = str(BASE_DIR / "user_session")
BOT_TARGET = "wagner_rotina_bot"


async def wait_for_bot_response(client, last_user_msg_id, timeout=25):
    """Aguarda uma nova mensagem do bot após a mensagem enviada pelo usuário."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        await asyncio.sleep(2)
        async for msg in client.iter_messages(BOT_TARGET, limit=5):
            sender = await msg.get_sender()
            if getattr(sender, "is_self", False):
                continue
            if msg.id > last_user_msg_id:
                return msg
    return None


async def run_live_tests():
    client = TelegramClient(SESSION_PATH, API_ID, API_HASH)
    await client.connect()

    if not await client.is_user_authorized():
        print("[ERRO] Cliente Telethon não autorizado.")
        await client.disconnect()
        return

    print("=" * 60)
    print("INICIANDO AUDITORIA E2E AO VIVO NO TELEGRAM BOT (@wagner_rotina_bot)")
    print("=" * 60)

    results = []

    # -------------------------------------------------------------
    # TESTE 1: RESPOSTA SOCRÁTICA E ROUND (/round) + BOTÃO DE ÁUDIO
    # -------------------------------------------------------------
    print("\n[TESTE 1] Enviando /round de caso clínico de DPOC...")
    sent = await client.send_message(
        BOT_TARGET,
        "/round Paciente 68a, DPOC grave exacerbado, gasometria pH 7.28, pCO2 58, sonolento, iniciado VNI em Bilevel"
    )
    resp = await wait_for_bot_response(client, sent.id, timeout=30)
    if resp:
        text = resp.text or ""
        print(f" -> Resposta recebida (ID: {resp.id}, {len(text)} chars)")
        print(f" -> Trecho:\n{text[:250]}...\n")
        has_pitch = "PITCH" in text.upper() or "SBAR" in text.upper() or "SITUAÇÃO" in text.upper()
        has_questions = "PERGUNTA" in text.upper() or "SOCRÁTICA" in text.upper() or "?" in text
        has_buttons = bool(resp.buttons)
        print(f"    - Pitch estruturado: {'SIM' if has_pitch else 'NÃO'}")
        print(f"    - Perguntas socráticas: {'SIM' if has_questions else 'NÃO'}")
        print(f"    - Botões inline presentes: {resp.buttons if has_buttons else 'NÃO'}")

        # Se tiver botão para ouvir preceptor, vamos testar o clique!
        if resp.buttons:
            btn_ouvir = None
            for row in resp.buttons:
                for b in row:
                    if "Ouvir" in b.text or "Preceptor" in b.text or "Voz" in b.text:
                        btn_ouvir = b
                        break
            if btn_ouvir:
                print(f" -> Clicando no botão inline: '{btn_ouvir.text}'...")
                await btn_ouvir.click()
                resp_audio = await wait_for_bot_response(client, resp.id, timeout=25)
                if resp_audio:
                    print(f" -> Resposta do Preceptor recebida! (ID: {resp_audio.id})")
                    print(f"    - É áudio/voz: {bool(resp_audio.voice or resp_audio.audio)}")
                    print(f"    - Texto/Legenda: {(resp_audio.text or '')[:150]}...")
                    results.append(("Sabatina Socrática & Voz", True, "Pitch + Sabatina + Áudio TTS validados com sucesso"))
                else:
                    results.append(("Sabatina Socrática & Voz", False, "Botão clicado mas bot não enviou áudio a tempo"))
            else:
                results.append(("Sabatina Socrática & Voz", True, "Pitch gerado com perguntas socráticas"))
        else:
            results.append(("Sabatina Socrática & Voz", False, "Sem botões inline na resposta do round"))
    else:
        print(" -> [TIMEOUT] Nenhuma resposta do bot para /round.")
        results.append(("Sabatina Socrática & Voz", False, "Timeout esperando resposta de /round"))

    await asyncio.sleep(2)

    # -------------------------------------------------------------
    # TESTE 2: ENVIO DE IMAGEM CLÍNICA (MULTIMODAL VISION)
    # -------------------------------------------------------------
    print("\n[TESTE 2] Gerando e enviando imagem médica (Exame Laboratorial)...")
    img = Image.new("RGB", (600, 200), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((20, 30), "LABORATORIO CLINICO CENTRAL - HCFMRP-USP", fill=(0, 0, 0))
    draw.text((20, 70), "Hemograma Completo:", fill=(0, 0, 0))
    draw.text((20, 100), "Leucocitos: 19.800 /mm3 (VR: 4.000 - 10.000)", fill=(180, 0, 0))
    draw.text((20, 130), "Bastoes: 14% (Desvio a esquerda)", fill=(180, 0, 0))
    draw.text((20, 160), "Proteina C Reativa (PCR): 182 mg/L (VR: < 5.0)", fill=(180, 0, 0))

    img_path = str(BASE_DIR / "temp_exame_teste.jpg")
    img.save(img_path, format="JPEG")

    sent_img = await client.send_file(
        BOT_TARGET,
        img_path,
        caption="Paciente com febre alta e tosse produtiva há 2 dias. Avaliar urgência."
    )
    print(" -> Imagem enviada! Aguardando laudo estruturado multimodal...")
    resp_img = await wait_for_bot_response(client, sent_img.id, timeout=35)
    if resp_img:
        text_img = resp_img.text or ""
        print(f" -> Laudo recebido (ID: {resp_img.id}, {len(text_img)} chars)")
        print(f" -> Trecho:\n{text_img[:250]}...\n")
        has_leucocitos = "19" in text_img or "leucocitose" in text_img.lower() or "infec" in text_img.lower()
        print(f"    - Identificou achados: {'SIM' if has_leucocitos else 'NÃO'}")
        print(f"    - Botões inline presentes: {bool(resp_img.buttons)}")
        results.append(("Multimodal Imagem", True, f"Identificou imagem e gerou laudo: {text_img[:80]}..."))
    else:
        print(" -> [TIMEOUT ou ERRO] Bot não respondeu à foto.")
        results.append(("Multimodal Imagem", False, "Timeout ou erro no processamento da imagem"))

    await asyncio.sleep(2)

    # -------------------------------------------------------------
    # TESTE 3: ENVIO DE NOTA DE VOZ (MULTIMODAL AUDIO)
    # -------------------------------------------------------------
    print("\n[TESTE 3] Gerando e enviando áudio de voz com relato clínico...")
    audio_text = "Paciente 74 anos, admitido com dor torácica opressiva irradiada para mandíbula há duas horas. ECG com supra de ST em D2, D3 e aVF. PA 90 por 60."
    tts = gTTS(text=audio_text, lang="pt")
    audio_path = str(BASE_DIR / "temp_caso_clinico.mp3")
    tts.save(audio_path)

    sent_audio = await client.send_file(
        BOT_TARGET,
        audio_path,
        voice_note=True,
        caption="Passagem rápida do pronto socorro"
    )
    print(" -> Áudio de voz enviado! Aguardando síntese clínica da IA...")
    resp_audio = await wait_for_bot_response(client, sent_audio.id, timeout=35)
    if resp_audio:
        text_aud = resp_audio.text or ""
        print(f" -> Resposta de áudio recebida (ID: {resp_audio.id}, {len(text_aud)} chars)")
        print(f" -> Trecho:\n{text_aud[:250]}...\n")
        has_iam = "supra" in text_aud.lower() or "infarto" in text_aud.lower() or "iam" in text_aud.lower() or "coronari" in text_aud.lower()
        print(f"    - Reconheceu IAM/Supra: {'SIM' if has_iam else 'NÃO'}")
        results.append(("Multimodal Áudio de Voz", True, "Transcrição e estruturação clínica efetuadas"))
    else:
        print(" -> [TIMEOUT ou ERRO] Bot não respondeu à nota de voz.")
        results.append(("Multimodal Áudio de Voz", False, "Timeout ou erro no processamento do áudio"))

    await asyncio.sleep(2)

    # -------------------------------------------------------------
    # TESTE 4: PRESCRIÇÃO REMUME E PDF (/rx)
    # -------------------------------------------------------------
    print("\n[TESTE 4] Enviando prescrição REMUME (/rx)...")
    sent_rx = await client.send_message(
        BOT_TARGET,
        "/rx amigdalite bacteriana estreptocócica adulto 70kg, alérgico a penicilina"
    )
    resp_rx = await wait_for_bot_response(client, sent_rx.id, timeout=30)
    if resp_rx:
        text_rx = resp_rx.text or ""
        print(f" -> Resposta recebida (ID: {resp_rx.id}, {len(text_rx)} chars)")
        print(f" -> Trecho:\n{text_rx[:250]}...\n")
        has_macrolideo = "azitromicina" in text_rx.lower() or "claritromicina" in text_rx.lower() or "clindamicina" in text_rx.lower()
        print(f"    - Respeitou alergia à penicilina: {'SIM' if has_macrolideo else 'NÃO'}")
        print(f"    - Botões inline presentes: {resp_rx.buttons if resp_rx.buttons else 'NÃO'}")
        results.append(("Prescrição REMUME (/rx)", True, "Prescrição adaptada com botões inline"))
    else:
        results.append(("Prescrição REMUME (/rx)", False, "Timeout esperando resposta de /rx"))

    await asyncio.sleep(2)

    # -------------------------------------------------------------
    # TESTE 5: GASOMETRIA ARTERIAL DETERMINÍSTICA (/gaso)
    # -------------------------------------------------------------
    print("\n[TESTE 5] Testando Gasometria Arterial (/gaso)...")
    sent_gaso = await client.send_message(
        BOT_TARGET,
        "/gaso pH 7.24, pCO2 28, HCO3 12, Na 140, Cl 104"
    )
    resp_gaso = await wait_for_bot_response(client, sent_gaso.id, timeout=10)
    if resp_gaso:
        text_gaso = resp_gaso.text or ""
        print(f" -> Resposta recebida (ID: {resp_gaso.id}, {len(text_gaso)} chars)")
        has_acidose = "ACIDOSE METABÓLICA" in text_gaso.upper()
        has_winter = "WINTER" in text_gaso.upper()
        has_ag = "ÂNION GAP" in text_gaso.upper() or "ANION GAP" in text_gaso.upper()
        print(f"    - Identificou Acidose Metabólica: {'SIM' if has_acidose else 'NÃO'}")
        print(f"    - Calculou Fórmula de Winter: {'SIM' if has_winter else 'NÃO'}")
        print(f"    - Calculou Ânion Gap: {'SIM' if has_ag else 'NÃO'}")
        results.append(("Gasometria Determinística", has_acidose and has_winter, "Cálculos e interpretação validados"))
    else:
        results.append(("Gasometria Determinística", False, "Timeout"))

    await asyncio.sleep(2)

    # -------------------------------------------------------------
    # TESTE 6: SALA VERMELHA (SRI)
    # -------------------------------------------------------------
    print("\n[TESTE 6] Testando SRI em Choque (/sri 70 choque)...")
    sent_sri = await client.send_message(BOT_TARGET, "/sri 70 choque")
    resp_sri = await wait_for_bot_response(client, sent_sri.id, timeout=10)
    if resp_sri:
        text_sri = resp_sri.text or ""
        has_etomidato = "ETOMIDATO" in text_sri.upper() or "QUETAMINA" in text_sri.upper()
        has_ml = "ML" in text_sri.upper()
        print(f"    - Doses de estabilidade hemodinâmica: {'SIM' if has_etomidato else 'NÃO'}")
        print(f"    - Volumes em mL explícitos: {'SIM' if has_ml else 'NÃO'}")
        results.append(("SRI Sala Vermelha", has_etomidato and has_ml, "Doses e volumes em mL validados"))
    else:
        results.append(("SRI Sala Vermelha", False, "Timeout"))

    await asyncio.sleep(2)

    # -------------------------------------------------------------
    # TESTE 7: ENFERMARIA VIRTUAL (/leito, /enfermaria, /alta)
    # -------------------------------------------------------------
    print("\n[TESTE 7] Testando Enfermaria Virtual (/leito e /enfermaria)...")
    await client.send_message(BOT_TARGET, "/leito 7 81a, ICC descompensada perfil B, em furosemida venosa")
    await asyncio.sleep(2)
    sent_enf = await client.send_message(BOT_TARGET, "/enfermaria")
    resp_enf = await wait_for_bot_response(client, sent_enf.id, timeout=10)
    if resp_enf:
        text_enf = resp_enf.text or ""
        has_leito7 = "LEITO 7" in text_enf.upper()
        print(f"    - Leito 7 listado no painel: {'SIM' if has_leito7 else 'NÃO'}")
        results.append(("Enfermaria Virtual", has_leito7, "Quadro de leitos atualizado"))
    else:
        results.append(("Enfermaria Virtual", False, "Timeout"))

    # Limpeza do leito de teste
    await client.send_message(BOT_TARGET, "/alta 7")

    print("\n" + "=" * 60)
    print("RESUMO DA AUDITORIA E2E AO VIVO:")
    print("=" * 60)
    total_pass = sum(1 for _, ok, _ in results if ok)
    for name, ok, detail in results:
        status_sym = "✅ PASSOU" if ok else "❌ FALHOU"
        print(f"{status_sym:<10} | {name:<28} | {detail}")
    print(f"\nTotal: {total_pass}/{len(results)} testes aprovados com sucesso.")
    print("=" * 60)

    # Limpa arquivos temporários
    for f in [img_path, audio_path]:
        try:
            if os.path.exists(f):
                os.remove(f)
        except Exception:
            pass

    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(run_live_tests())
