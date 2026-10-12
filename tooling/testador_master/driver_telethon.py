"""
Ultra Rotina · Testador Master: Driver Telethon (Live Telegram MTProto)
Conecta como cliente de usuário real no Telegram, conversa com @wagner_rotina_bot,
clica em botões inline reais e captura telas em tempo real.
Inclui tratamento automático de FloodWait e marcação de mensagens lidas.
"""

import os
import time
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional
from dotenv import load_dotenv

from .driver_base import BaseTelegramDriver

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(ROOT_DIR / ".env")


class DriverTelethon(BaseTelegramDriver):
    def __init__(self, bot_username: str = "wagner_rotina_bot", session_name: str = "user_session"):
        self.bot_username = bot_username
        self.session_path = str(ROOT_DIR / session_name)
        self.api_id = int(os.getenv("TELEGRAM_API_ID", "0"))
        self.api_hash = os.getenv("TELEGRAM_API_HASH", "")
        self.client = None
        self.bot_entity = None
        self.loop = None
        self.ultima_msg_bot = None

    def inicializar(self) -> bool:
        """Inicializa o cliente Telethon."""
        if not self.api_id or not self.api_hash:
            print("[Telethon] TELEGRAM_API_ID ou TELEGRAM_API_HASH ausentes no .env")
            return False

        try:
            from telethon import TelegramClient
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
            self.client = TelegramClient(self.session_path, self.api_id, self.api_hash)
            return self.loop.run_until_complete(self._conectar_async())
        except Exception as e:
            print(f"[Telethon] Erro ao conectar cliente: {e}")
            return False

    async def _conectar_async(self) -> bool:
        await self.client.connect()
        if not await self.client.is_user_authorized():
            print("[Telethon] ⚠️ Sessão não autorizada. Execute com --login para autenticar interativamente no terminal.")
            return False

        self.bot_entity = await self.client.get_entity(self.bot_username)
        return True

    def autenticar_interativo(self) -> bool:
        """Executa login interativo via terminal (solicita telefone e código)."""
        from telethon import TelegramClient
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        self.client = TelegramClient(self.session_path, self.api_id, self.api_hash)

        async def _login():
            print("Iniciando autenticação interativa com o Telegram...")
            await self.client.start()
            me = await self.client.get_me()
            print(f"✅ Autenticado com sucesso como: {me.first_name} (@{me.username or 'sem username'}) [ID: {me.id}]")
            return True

        try:
            return self.loop.run_until_complete(_login())
        except Exception as e:
            print(f"[Telethon] Falha na autenticação: {e}")
            return False

    def enviar_mensagem(self, texto: str) -> Dict[str, Any]:
        """Envia mensagem ao bot no Telegram e aguarda a resposta com anti-flood."""
        if not self.client or not self.loop:
            return {"ok": False, "erro": "Telethon não inicializado", "mensagens": []}

        return self.loop.run_until_complete(self._enviar_async(texto))

    async def _enviar_async(self, texto: str) -> Dict[str, Any]:
        from telethon.errors import FloodWaitError
        inicio = time.time()
        try:
            sent = await self.client.send_message(self.bot_entity, texto)
            # Marca mensagens do bot como lidas
            await self.client.send_read_acknowledge(self.bot_entity)

            resp = await self._aguardar_resposta(sent.id, timeout=25)
            fim = time.time()
            tempo_ms = int((fim - inicio) * 1000)

            if not resp:
                return {
                    "ok": False,
                    "erro": "Timeout: Bot não respondeu dentro do limite de 25s",
                    "tempo_ms": tempo_ms,
                    "mensagens": []
                }

            self.ultima_msg_bot = resp
            msg_formatada = self._formatar_mensagem_telethon(resp)
            return {
                "ok": True,
                "tempo_ms": tempo_ms,
                "mensagens": [msg_formatada],
                "callbacks": []
            }
        except FloodWaitError as e:
            print(f"\n[Telethon] ⏳ Anti-flood ativado pelo Telegram. Aguardando {e.seconds}s...")
            await asyncio.sleep(e.seconds + 1)
            return await self._enviar_async(texto)
        except Exception as e:
            return {
                "ok": False,
                "erro": str(e),
                "tempo_ms": int((time.time() - inicio) * 1000),
                "mensagens": []
            }

    def clicar_botao(
        self,
        callback_data: str,
        rotulo: str,
        mensagem_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Clica em um botão inline da mensagem atual do bot."""
        if not self.client or not self.loop:
            return {"ok": False, "erro": "Telethon não inicializado", "mensagens": []}

        return self.loop.run_until_complete(self._clicar_async(callback_data, rotulo, mensagem_id))

    async def _clicar_async(self, callback_data: str, rotulo: str, mensagem_id: Optional[int]) -> Dict[str, Any]:
        from telethon.errors import FloodWaitError
        inicio = time.time()
        try:
            msg_alvo = self.ultima_msg_bot
            if not msg_alvo or not msg_alvo.buttons:
                async for m in self.client.iter_messages(self.bot_entity, limit=3):
                    sender = await m.get_sender()
                    if not getattr(sender, "is_self", False) and m.buttons:
                        msg_alvo = m
                        break

            if not msg_alvo or not msg_alvo.buttons:
                return {
                    "ok": False,
                    "erro": "Nenhuma mensagem com botões inline encontrada para clicar.",
                    "tempo_ms": int((time.time() - inicio) * 1000),
                    "mensagens": []
                }

            btn_encontrado = None
            for row in msg_alvo.buttons:
                for b in row:
                    b_data = getattr(b, "data", b"").decode("utf-8", errors="ignore") if getattr(b, "data", None) else ""
                    if callback_data and b_data == callback_data:
                        btn_encontrado = b
                        break
                    if rotulo and rotulo.lower() in b.text.lower():
                        btn_encontrado = b
                        break
                if btn_encontrado:
                    break

            if not btn_encontrado:
                return {
                    "ok": False,
                    "erro": f"Botão '{rotulo}' ({callback_data}) não encontrado na tela.",
                    "tempo_ms": int((time.time() - inicio) * 1000),
                    "mensagens": []
                }

            await btn_encontrado.click()
            await self.client.send_read_acknowledge(self.bot_entity)

            resp_edit = await self._aguardar_atualizacao(msg_alvo.id, timeout=20)
            fim = time.time()
            tempo_ms = int((fim - inicio) * 1000)

            if resp_edit:
                self.ultima_msg_bot = resp_edit
                msg_formatada = self._formatar_mensagem_telethon(resp_edit)
                return {
                    "ok": True,
                    "tempo_ms": tempo_ms,
                    "mensagens": [msg_formatada],
                    "callbacks": [{"texto": "OK"}]
                }
            else:
                return {
                    "ok": True,
                    "tempo_ms": tempo_ms,
                    "mensagens": [self._formatar_mensagem_telethon(msg_alvo)],
                    "callbacks": [{"texto": "Sem alteração visível"}]
                }

        except FloodWaitError as e:
            print(f"\n[Telethon] ⏳ Anti-flood ativado pelo Telegram. Aguardando {e.seconds}s...")
            await asyncio.sleep(e.seconds + 1)
            return await self._clicar_async(callback_data, rotulo, mensagem_id)
        except Exception as e:
            return {
                "ok": False,
                "erro": str(e),
                "tempo_ms": int((time.time() - inicio) * 1000),
                "mensagens": []
            }

    def enviar_audio(self, caminho_audio: str, caption: str = "") -> Dict[str, Any]:
        """Envia nota de voz/áudio para o bot e aguarda laudo/transcrição."""
        if not self.client or not self.loop:
            return {"ok": False, "erro": "Telethon não inicializado", "mensagens": []}
        return self.loop.run_until_complete(self._enviar_midia_async(caminho_audio, caption, eh_voz=True))

    def enviar_imagem(self, caminho_imagem: str, caption: str = "") -> Dict[str, Any]:
        """Envia imagem médica para o bot e aguarda laudo/visão computacional."""
        if not self.client or not self.loop:
            return {"ok": False, "erro": "Telethon não inicializado", "mensagens": []}
        return self.loop.run_until_complete(self._enviar_midia_async(caminho_imagem, caption, eh_voz=False))

    async def _enviar_midia_async(self, caminho: str, caption: str, eh_voz: bool) -> Dict[str, Any]:
        from telethon.errors import FloodWaitError
        inicio = time.time()
        try:
            kwargs = {"voice_note": True} if eh_voz else {}
            sent = await self.client.send_file(
                self.bot_entity,
                str(caminho),
                caption=caption,
                **kwargs
            )
            await self.client.send_read_acknowledge(self.bot_entity)
            resp = await self._aguardar_resposta(sent.id, timeout=35)
            fim = time.time()
            tempo_ms = int((fim - inicio) * 1000)

            if not resp:
                return {
                    "ok": False,
                    "erro": "Timeout: Bot não respondeu ao envio de mídia dentro de 35s",
                    "tempo_ms": tempo_ms,
                    "mensagens": []
                }

            self.ultima_msg_bot = resp
            msg_formatada = self._formatar_mensagem_telethon(resp)
            return {
                "ok": True,
                "tempo_ms": tempo_ms,
                "mensagens": [msg_formatada],
                "callbacks": []
            }
        except FloodWaitError as e:
            print(f"\n[Telethon] ⏳ Anti-flood ativado. Aguardando {e.seconds}s...")
            await asyncio.sleep(e.seconds + 1)
            return await self._enviar_midia_async(caminho, caption, eh_voz)
        except Exception as e:
            return {
                "ok": False,
                "erro": str(e),
                "tempo_ms": int((time.time() - inicio) * 1000),
                "mensagens": []
            }

    async def _aguardar_resposta(self, sent_id: int, timeout: int = 25):
        fim = time.time() + timeout
        while time.time() < fim:
            await asyncio.sleep(1.2)
            async for m in self.client.iter_messages(self.bot_entity, limit=4):
                sender = await m.get_sender()
                if not getattr(sender, "is_self", False) and m.id > sent_id:
                    return m
        return None

    async def _aguardar_atualizacao(self, msg_id: int, timeout: int = 20):
        texto_antigo = self.ultima_msg_bot.text if self.ultima_msg_bot else ""
        fim = time.time() + timeout
        while time.time() < fim:
            await asyncio.sleep(1.2)
            m_atual = await self.client.get_messages(self.bot_entity, ids=msg_id)
            if m_atual and m_atual.text != texto_antigo:
                return m_atual

            async for m in self.client.iter_messages(self.bot_entity, limit=2):
                sender = await m.get_sender()
                if not getattr(sender, "is_self", False) and m.id > msg_id:
                    return m
        return None

    def _formatar_mensagem_telethon(self, msg) -> Dict[str, Any]:
        """Converte a mensagem Telethon no formato unificado do Testador Master."""
        botoes = []
        if msg.buttons:
            for row in msg.buttons:
                row_btns = []
                for b in row:
                    b_data = getattr(b, "data", b"").decode("utf-8", errors="ignore") if getattr(b, "data", None) else ""
                    row_btns.append({
                        "text": b.text or "",
                        "callback_data": b_data,
                        "url": getattr(b, "url", "") or ""
                    })
                if row_btns:
                    botoes.append(row_btns)

        return {
            "id": msg.id,
            "tipo": "texto",
            "chat_id": str(msg.chat_id),
            "texto": msg.text or (f"<{msg.media.__class__.__name__}>" if msg.media else ""),
            "buttons": botoes
        }

    def encerrar(self):
        """Desconecta o cliente Telethon."""
        if self.client and self.loop:
            async def _disc():
                if self.client.is_connected():
                    await self.client.disconnect()
            try:
                self.loop.run_until_complete(_disc())
            except Exception:
                pass
