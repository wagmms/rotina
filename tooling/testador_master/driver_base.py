"""
Ultra Rotina · Testador Master: Driver Base
Interface abstrata para drivers de comunicação com o Telegram (Simulado e Telethon).
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class BaseTelegramDriver(ABC):
    @abstractmethod
    def inicializar(self) -> bool:
        """Inicializa conexões, processos ou sessões necessárias."""
        pass

    @abstractmethod
    def enviar_mensagem(self, texto: str) -> Dict[str, Any]:
        """Envia mensagem de texto e retorna as mensagens e botões resultantes."""
        pass

    @abstractmethod
    def clicar_botao(
        self,
        callback_data: str,
        rotulo: str,
        mensagem_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Clica em um botão inline e retorna a tela resultante atualizada."""
        pass

    @abstractmethod
    def enviar_audio(self, caminho_audio: str, caption: str = "") -> Dict[str, Any]:
        """Envia nota de voz/áudio para o bot e retorna a transcrição/laudo."""
        pass

    @abstractmethod
    def enviar_imagem(self, caminho_imagem: str, caption: str = "") -> Dict[str, Any]:
        """Envia imagem médica para o bot e retorna o laudo estruturado e botões."""
        pass

    @abstractmethod
    def encerrar(self):
        """Finaliza processos e conexões de forma segura."""
        pass
