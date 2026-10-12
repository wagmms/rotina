"""
Ultra Rotina · Testador Master: Driver Simulado (Local Runtime Bridge)
Executa comandos e callbacks diretamente no runtime Node.js do Ultra Rotina (77 módulos)
sem depender de conexão de rede ou autenticação prévia de Telegram.
"""

import os
import json
import subprocess
import time
import select
from pathlib import Path
from typing import Dict, Any, Optional

from .driver_base import BaseTelegramDriver


class DriverSimulado(BaseTelegramDriver):
    def __init__(self, node_bin: str = "node"):
        self.node_bin = node_bin
        self.process: Optional[subprocess.Popen] = None
        self.req_counter = 0
        self.bridge_path = Path(__file__).resolve().parent / "node_bridge.js"
        self.root_dir = Path(__file__).resolve().parent.parent.parent

    def inicializar(self) -> bool:
        """Inicia o subprocesso Node.js que hospeda o runtime oficial."""
        if not self.bridge_path.exists():
            raise FileNotFoundError(f"Arquivo não encontrado: {self.bridge_path}")

        try:
            self.process = subprocess.Popen(
                [self.node_bin, str(self.bridge_path)],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=str(self.root_dir),
                text=True,
                bufsize=1
            )

            # Aguarda inicialização do runtime (ele exibe logs de módulos carregados)
            # Lê linhas até encontrar JSON ou aguardar alguns instantes
            time.sleep(1.2)

            # Envia ping de teste
            resp = self._enviar_rpc({"action": "ping"})
            return resp.get("ok", False) and resp.get("status") == "online"
        except Exception as e:
            print(f"[Driver Simulado] Erro ao inicializar Node bridge: {e}")
            return False

    def enviar_mensagem(self, texto: str) -> Dict[str, Any]:
        """Dispara comando de texto ou mensagem para o router do Telegram."""
        return self._enviar_rpc({"action": "send", "text": texto})

    def clicar_botao(
        self,
        callback_data: str,
        rotulo: str,
        mensagem_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Dispara evento de callback query para o handler de botões inline."""
        return self._enviar_rpc({
            "action": "click",
            "callback_data": callback_data,
            "rotulo": rotulo,
            "message_id": mensagem_id
        })

    def enviar_audio(self, caminho_audio: str, caption: str = "") -> Dict[str, Any]:
        """Dispara envio simulado de nota de voz/áudio."""
        return self._enviar_rpc({
            "action": "send_media",
            "media_type": "audio",
            "file_path": str(caminho_audio),
            "caption": caption
        })

    def enviar_imagem(self, caminho_imagem: str, caption: str = "") -> Dict[str, Any]:
        """Dispara envio simulado de imagem médica."""
        return self._enviar_rpc({
            "action": "send_media",
            "media_type": "photo",
            "file_path": str(caminho_imagem),
            "caption": caption
        })

    def _enviar_rpc(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self.process or self.process.poll() is not None:
            return {"ok": False, "erro": "Processo Node.js não está rodando.", "mensagens": []}

        self.req_counter += 1
        payload["req_id"] = self.req_counter
        linha_envio = json.dumps(payload) + "\n"

        inicio = time.time()
        timeout_max = 25.0
        try:
            self.process.stdin.write(linha_envio)
            self.process.stdin.flush()

            # Lê linhas até encontrar a resposta JSON com req_id
            while True:
                tempo_decorrido = time.time() - inicio
                tempo_restante = timeout_max - tempo_decorrido
                if tempo_restante <= 0:
                    break

                # Verifica se o processo Node.js morreu durante a requisição
                if self.process.poll() is not None:
                    return {
                        "ok": False,
                        "erro": f"Processo Node.js encerrou inesperadamente (código {self.process.poll()}).",
                        "tempo_ms": int((time.time() - inicio) * 1000),
                        "mensagens": []
                    }

                # Aguarda dados disponíveis para leitura sem bloqueio perpétuo
                rlist, _, _ = select.select([self.process.stdout], [], [], min(1.0, tempo_restante))
                if not rlist:
                    continue

                linha_resp = self.process.stdout.readline()
                if not linha_resp:
                    break
                linha_resp = linha_resp.strip()
                if not linha_resp:
                    continue
                
                # Se for linha de log do runtime, ignora e continua
                if not linha_resp.startswith("{"):
                    continue

                try:
                    dado = json.loads(linha_resp)
                    if dado.get("req_id") == self.req_counter or (dado.get("req_id") is None and "ok" in dado):
                        if "tempo_ms" not in dado:
                            dado["tempo_ms"] = int((time.time() - inicio) * 1000)
                        return dado
                except json.JSONDecodeError:
                    continue

        except Exception as e:
            return {
                "ok": False,
                "erro": f"Erro de comunicação RPC: {str(e)}",
                "tempo_ms": int((time.time() - inicio) * 1000),
                "mensagens": []
            }

        return {
            "ok": False,
            "erro": "Timeout ou fim prematuro de stream do Node.js",
            "tempo_ms": int((time.time() - inicio) * 1000),
            "mensagens": []
        }

    def encerrar(self):
        """Encerra o processo Node bridge."""
        if self.process and self.process.poll() is None:
            try:
                if self.process.stdin:
                    self.process.stdin.close()
                if self.process.stdout:
                    self.process.stdout.close()
                if self.process.stderr:
                    self.process.stderr.close()
                self.process.terminate()
                self.process.wait(timeout=2)
            except Exception:
                try:
                    self.process.kill()
                except Exception:
                    pass
            self.process = None
