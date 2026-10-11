"""
Testes automatizados para a política de notificações e persistência de mudanças do Autoloop.
Valida:
1. enviar_relatorio_ciclo_rotina não dispara para o Telegram por padrão.
2. Os dados do ciclo são persistidos com integridade em data/ultimas_mudancas.json.
3. enviar_relatorio_telegram suporta múltiplos chats separados por vírgula.
"""

import sys
import os
import json
import urllib.request
import importlib.util
import importlib.machinery
from pathlib import Path
import pytest

AUTOLOOP_PATH = Path(os.environ.get("AUTOLOOP_TEST_EXECUTABLE", str(Path(__file__).resolve().parents[1] / "autoloop.py")))

@pytest.fixture(scope="module")
def autoloop_mod():
    assert AUTOLOOP_PATH.exists(), f"Arquivo não encontrado: {AUTOLOOP_PATH}"
    loader = importlib.machinery.SourceFileLoader("autoloop", str(AUTOLOOP_PATH))
    spec = importlib.util.spec_from_loader("autoloop", loader)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["autoloop"] = mod
    loader.exec_module(mod)
    return mod


def test_ciclo_suprime_telegram_por_padrao(autoloop_mod, monkeypatch, tmp_path):
    """Garante que a cada ciclo comum, o Telegram NÃO seja acionado e os dados sejam salvos em data/ultimas_mudancas.json."""
    telegram_chamado = []
    def fake_telegram(html, **kwargs):
        telegram_chamado.append(html)
        return True

    monkeypatch.setattr(autoloop_mod, "enviar_relatorio_telegram", fake_telegram)
    monkeypatch.setattr(autoloop_mod, "coletar_status_progress", lambda: (["Tarefa A", "Tarefa B"], "Próxima Tarefa C"))
    monkeypatch.setattr(autoloop_mod, "coletar_mudancas_ciclo", lambda horas=1.0: [{"hash": "abc1234", "subject": "fix(teste): ajuste", "autor": "Dev"}])
    monkeypatch.setattr(autoloop_mod, "obter_commit_head", lambda: "abc1234")

    # Redireciona data/ para tmp_path
    monkeypatch.chdir(tmp_path)
    (tmp_path / "data").mkdir(parents=True, exist_ok=True)

    # Chamada padrão: notificar_telegram=False
    autoloop_mod.enviar_relatorio_ciclo_rotina("gemini-3.8-flash", 1, "Squad Padrão")

    # Verifica que o Telegram NÃO foi chamado
    assert len(telegram_chamado) == 0, "O Telegram NÃO deve ser chamado a cada tarefa concluída!"

    # Verifica que o arquivo data/ultimas_mudancas.json foi gerado com as informações
    arq_mudancas = tmp_path / "data" / "ultimas_mudancas.json"
    assert arq_mudancas.exists(), "data/ultimas_mudancas.json deve ser criado para consulta sob demanda."
    conteudo = json.loads(arq_mudancas.read_text(encoding="utf-8"))
    assert conteudo["modelo"] == "gemini-3.8-flash"
    assert conteudo["proxima_tarefa"] == "Próxima Tarefa C"
    assert "Tarefa A" in conteudo["tarefas_concluidas"]


def test_enviar_relatorio_telegram_multiplos_chats(autoloop_mod, monkeypatch):
    """Valida que enviar_relatorio_telegram envia para todos os chats configurados separados por vírgula."""
    chats_recebidos = []

    class FakeResponse:
        def read(self):
            return json.dumps({"ok": True}).encode("utf-8")
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass

    def fake_urlopen(req, timeout=15):
        payload = json.loads(req.data.decode("utf-8"))
        chats_recebidos.append(payload["chat_id"])
        return FakeResponse()

    monkeypatch.setattr(autoloop_mod.urllib.request, "urlopen", fake_urlopen)
    monkeypatch.setattr(autoloop_mod, "obter_credenciais_telegram", lambda t=None, c=None: ("fake_token_123", "11111111,22222222"))
    sucesso = autoloop_mod.enviar_relatorio_telegram("<b>Teste</b>")
    assert sucesso is True
    assert "11111111" in chats_recebidos
    assert "22222222" in chats_recebidos


def test_relatorio_inclui_bloco_telemetria_consumo_e_cache(autoloop_mod, monkeypatch, tmp_path):
    """Valida que o relatório HTML e ultimas_mudancas.json contêm o bloco de telemetria formatado."""
    monkeypatch.chdir(tmp_path)
    (tmp_path / "data").mkdir(parents=True, exist_ok=True)

    agora = sys.modules["time"].time()
    linhas = [
        {"time": agora - 300, "stage": "tarefa", "status": "passed", "seconds": 372.0},
        {
            "time": agora - 200,
            "stage": "consumo_agy",
            "status": "reported",
            "seconds": 360.0,
            "tokens": {
                "input_tokens": 142000,
                "output_tokens": 18000,
                "thinking_tokens": 5000,
                "cache_read_tokens": 119280,
                "cache_read_input_tokens": 119280
            }
        }
    ]
    with (tmp_path / "data" / "autoloop_metrics.jsonl").open("w", encoding="utf-8") as f:
        for it in linhas:
            f.write(json.dumps(it) + "\n")

    mensagens_telegram = []
    monkeypatch.setattr(autoloop_mod, "enviar_relatorio_telegram", lambda html, **kw: mensagens_telegram.append(html) or True)
    monkeypatch.setattr(autoloop_mod, "coletar_status_progress", lambda: (["Tarefa X"], "Próxima Y"))
    monkeypatch.setattr(autoloop_mod, "coletar_mudancas_ciclo", lambda **kw: [])
    monkeypatch.setattr(autoloop_mod, "obter_commit_head", lambda: "c0ffee1")

    # Dispara relatório com notificação habilitada
    autoloop_mod.enviar_relatorio_ciclo_rotina("gemini-3.8-flash", 1, notificar_telegram=True)

    assert len(mensagens_telegram) == 1
    html_enviado = mensagens_telegram[0]
    assert "📊 <b>Telemetria do Ciclo:</b> 142k in · 18k out (84% cache hit) · Tempo médio: 6m12s" in html_enviado

    # Valida persistência estruturada em data/ultimas_mudancas.json
    arq_mudancas = tmp_path / "data" / "ultimas_mudancas.json"
    assert arq_mudancas.exists()
    conteudo = json.loads(arq_mudancas.read_text(encoding="utf-8"))
    assert "telemetria" in conteudo
    assert conteudo["telemetria"]["input_tokens"] == 142000
    assert conteudo["telemetria"]["output_tokens"] == 18000
    assert conteudo["telemetria"]["cache_hit_pct"] == 84
    assert conteudo["telemetria"]["avg_seconds"] == 372.0

