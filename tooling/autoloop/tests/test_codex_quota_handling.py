import pytest
import os
import sys
import importlib.util
import importlib.machinery
from datetime import datetime, timedelta
from pathlib import Path

AUTOLOOP_PATH = Path(os.environ.get("AUTOLOOP_TEST_EXECUTABLE", str(Path(__file__).resolve().parents[1] / "autoloop.py")))

@pytest.fixture(scope="module")
def autoloop_mod():
    assert AUTOLOOP_PATH.exists(), f"Arquivo não encontrado: {AUTOLOOP_PATH}"
    loader = importlib.machinery.SourceFileLoader("autoloop_quota_test", str(AUTOLOOP_PATH))
    spec = importlib.util.spec_from_loader("autoloop_quota_test", loader)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["autoloop_quota_test"] = mod
    loader.exec_module(mod)
    return mod


def test_detectar_esgotamento_cota_codex_openai_format(autoloop_mod):
    texto = (
        "ERROR: You’ve hit your usage limit. Upgrade to Pro (https://chatgpt.com/explore/pro), "
        "visit https://chatgpt.com/settings/usage to purchase more credits or try again at 1:26 PM.\n"
        "ERROR: You’ve hit your usage limit. Upgrade to Pro (https://chatgpt.com/explore/pro), "
        "visit https://chatgpt.com/settings/usage to purchase more credits or try again at 1:26 PM."
    )
    eh_cota, erro_fmt, seg_reset = autoloop_mod.detectar_esgotamento_cota_codex(1, texto)
    assert eh_cota is True
    assert "CODEX_QUOTA_EXHAUSTED" in erro_fmt
    assert "usage limit" in erro_fmt.lower()
    assert seg_reset is not None
    assert seg_reset > 0


def test_extrair_tempo_reset_codex_variacoes(autoloop_mod):
    # 1. Formato 1:26 PM
    texto1 = "try again at 1:26 PM."
    seg1 = autoloop_mod.extrair_tempo_reset_codex(texto1)
    assert seg1 is not None and seg1 > 0

    # 2. Formato Resets in 45m
    texto2 = "Resets in 45m"
    seg2 = autoloop_mod.extrair_tempo_reset_codex(texto2)
    assert seg2 == (45 * 60) + 60

    # 3. Formato sem tempo
    texto3 = "429 Too Many Requests"
    seg3 = autoloop_mod.extrair_tempo_reset_codex(texto3)
    assert seg3 is None


def test_evaluate_scopes_preserva_rounds_em_falha_de_cota(tmp_path):
    from scoped_audit import evaluate_scopes, ScopeError
    scopes = [{
        'category': 'clinical',
        'scope_key': 'clinical:part_1_de_1',
        'fingerprint': 'abc123fingerprint',
        'files': ['src/med.js']
    }]

    calls = []
    def mock_review(scope, prior, rounds):
        calls.append(rounds)
        return None, "CODEX_QUOTA_EXHAUSTED: You’ve hit your usage limit (try again at 1:26 PM)"

    def mock_validate(report, sha_esperado):
        return True, ""

    # 1. Primeira tentativa falha por cota: ScopeError levantado, mas rounds não deve ser queimado
    with pytest.raises(ScopeError) as exc_info:
        evaluate_scopes(tmp_path, "candidato1", "base1", scopes, mock_review, mock_validate)
    assert "CODEX_QUOTA_EXHAUSTED" in str(exc_info.value)
    assert len(calls) == 1
    assert calls[0] == 1

    # 2. Segunda tentativa (após reset de cota): NÃO deve levantar "Auditoria operacionalmente incompleta já registrada"
    # Deve permitir nova execução normal!
    def mock_review_sucesso(scope, prior, rounds):
        calls.append(rounds)
        return {"candidate_sha": "candidato1", "verdict": "pass", "findings": [], "limitations": [], "required_followups": []}, None

    receipt = evaluate_scopes(tmp_path, "candidato1", "base1", scopes, mock_review_sucesso, mock_validate)
    assert receipt["verdict"] == "pass"
    # O segundo review deve ter sido chamado com rounds == 1 (já que o anterior foi revertido)
    assert len(calls) == 2
    assert calls[1] == 1


def test_deploy_core_trata_cota_sem_rejeicao_falsa(autoloop_mod, monkeypatch, tmp_path):
    sha_teste = "e" * 40
    class FakeResult:
        def __init__(self, returncode=0, stdout=""):
            self.returncode = returncode
            self.stdout = stdout
            self.stderr = ""

    monkeypatch.setattr(autoloop_mod, "executar_etapa", lambda cmd, *a, **kw: FakeResult(0))
    monkeypatch.setattr("subprocess.run", lambda *a, **kw: FakeResult(0))
    monkeypatch.setattr(autoloop_mod, "obter_commit_head", lambda: sha_teste)
    monkeypatch.setattr(autoloop_mod, "fingerprint_tree", lambda *a, **kw: "hash_estavel_123")
    monkeypatch.setattr(autoloop_mod, "validar_codigo_estavel", lambda *a, **kw: True)
    monkeypatch.setattr(autoloop_mod, "validar_sintaxe_expressa", lambda *a, **kw: {"ok": True})
    monkeypatch.setattr(autoloop_mod, "STATE_DEPLOY_FILE", tmp_path / "data" / "estado_deploy.json")
    monkeypatch.setattr(autoloop_mod, "classificar_risco_release", lambda **kw: "CLINICO_ROBUSTEZ_PRO")

    chamadas_rejection = []
    monkeypatch.setattr(autoloop_mod, "capture_rejection", lambda *a, **kw: chamadas_rejection.append(a))

    # Simula erro de cota
    monkeypatch.setattr(
        autoloop_mod,
        "obter_parecer_auditoria_candidato",
        lambda **kw: (None, "CODEX_QUOTA_EXHAUSTED: You’ve hit your usage limit. Upgrade to Pro... try again at 1:26 PM")
    )

    res = autoloop_mod.executar_deploy_e_relatorio(intervalo_horas=6.0)
    assert res is False
    # capture_rejection NUNCA deve ser chamado para erro de cota da API!
    assert len(chamadas_rejection) == 0

    estado = autoloop_mod.carregar_estado_deploy()
    assert estado["next_retry_ts"] is not None
    # Deve ter agendado para o futuro
    assert estado["next_retry_ts"] > datetime.now().timestamp()
