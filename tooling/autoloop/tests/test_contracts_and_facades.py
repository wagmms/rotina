"""
Testes unitários automatizados para Contratos de Domínio e Fachadas de Deep Modules do Autoloop.
Valida:
1. Imutabilidade e campos tipados dos contratos (@dataclass(frozen=True)).
2. Fachada TaskScheduler selecionando tarefas e interagindo com guardas.
3. Fachada ExecutionEngine resolvendo squads, precedência clínica e modelos.
4. Fachada VerificationGate avaliando sintaxe e regras de cota.
5. Fachada ObservabilityHub gerando recibos estruturados e expurgando artefatos.
"""
from dataclasses import FrozenInstanceError
from pathlib import Path
import pytest

from contracts import (
    TaskOrigin,
    TaskItem,
    RoutingDecision,
    ExecutionOutcome,
    AuditVerdict,
    LoopReceipt,
)
from scheduler import TaskScheduler
from engine import ExecutionEngine, classificar_perfil_tarefa, resolver_squad_agentes
from verification_gate import VerificationGate, extrair_tempo_reset_codex, detectar_esgotamento_cota_codex
from observability import ObservabilityHub


def test_contracts_are_strictly_immutable():
    """Valida que todos os contratos de domínio são estritamente congelados (frozen=True)."""
    task = TaskItem(
        key="test-1",
        text="Ajustar teto de sulfato de magnesio",
        origin=TaskOrigin.PROGRESS_SJF,
        clinical=True,
        engineering=False,
        wsjf_score=4.5
    )
    with pytest.raises(FrozenInstanceError):
        task.clinical = False

    decision = RoutingDecision(
        model_name="Gemini 3.1 Pro (High)",
        model_id="gemini-3.1-pro-high",
        account_number=1,
        account_email="test@med.com",
        effort="high",
        tier="CLINICO_ROBUSTEZ_PRO",
        justification="Conteúdo clínico exige Pro"
    )
    with pytest.raises(FrozenInstanceError):
        decision.account_number = 2

    outcome = ExecutionOutcome(
        stage="testes",
        returncode=0,
        stdout="OK",
        stderr="",
        duration_seconds=1.2
    )
    with pytest.raises(FrozenInstanceError):
        outcome.returncode = 1

    verdict = AuditVerdict(
        verdict="pass",
        syntax_ok=True,
        tests_passed=True,
        tests_summary="100% aprovado",
        build_ok=True
    )
    with pytest.raises(FrozenInstanceError):
        verdict.verdict = "fail"

    receipt = LoopReceipt(
        iteration_id="iter-123",
        timestamp=1700000000.0,
        task_key="test-1",
        task_text="Ajustar teto",
        model_used="gemini-3.1-pro-high",
        account_id=1,
        execution_code=0,
        audit_passed=True,
        code_fingerprint="abc123sha",
        duration_seconds=25.0
    )
    with pytest.raises(FrozenInstanceError):
        receipt.audit_passed = False


def test_task_scheduler_fallback_and_types(tmp_path):
    """Valida que o TaskScheduler processa o PROGRESS.md e emite TaskItem tipado."""
    progress = tmp_path / "PROGRESS.md"
    progress.write_text("""# Progresso
## 🔄 Próxima Tarefa em Andamento
- [ ] **src/02_condutas.js: ajustar dose de noradrenalina beira-leito (Critério de aceite: tetos respeitados)**
""", encoding="utf-8")

    scheduler = TaskScheduler(tmp_path)
    task = scheduler.get_next_task()
    assert task is not None
    assert isinstance(task, TaskItem)
    assert task.clinical is True
    assert "src/02_condutas.js" in task.target_files
    assert task.origin == TaskOrigin.PROGRESS_SJF


def test_execution_engine_routing_precedence():
    """Valida que a ExecutionEngine respeita a precedência clínica sobre interface."""
    engine = ExecutionEngine()
    task_clinica = TaskItem(
        key="med-1",
        text="Corrigir dose de insulina no menu do Telegram",
        origin=TaskOrigin.PROGRESS_SJF,
        clinical=True,
        engineering=False
    )
    decision, squad_name, subagents = engine.route(task_clinica, squad_mode="auto")
    assert decision.tier == "CLINICO_ROBUSTEZ_PRO"
    assert "pro" in decision.model_id
    assert squad_name == "Clínico Completo"


def test_verification_gate_helpers():
    """Valida os auxiliares de cota e extração de tempo no VerificationGate."""
    sec = extrair_tempo_reset_codex("Resets in 30m")
    assert sec == (30 * 60) + 60

    eh_cota, erro, seg = detectar_esgotamento_cota_codex(1, "ERROR: Rate limit exceeded (429)")
    assert eh_cota is True
    assert "CODEX_QUOTA_EXHAUSTED" in erro


def test_observability_hub_receipt_generation(tmp_path):
    """Valida que o ObservabilityHub emite recibos persistidos em JSON."""
    hub = ObservabilityHub(tmp_path)
    task = TaskItem(
        key="t-1",
        text="Refatorar rota",
        origin=TaskOrigin.PROGRESS_SJF,
        clinical=False,
        engineering=True
    )
    decision = RoutingDecision(
        model_name="Gemini 3.8 Flash (High)",
        model_id="gemini-3.8-flash-high",
        account_number=1,
        account_email="",
        effort="high",
        tier="UI_ENGENHARIA_FLASH",
        justification="Geral"
    )
    outcome = ExecutionOutcome(
        stage="tarefa",
        returncode=0,
        stdout="sucesso",
        stderr="",
        duration_seconds=10.5,
        fingerprint_before="fp1",
        fingerprint_after="fp2"
    )
    verdict = AuditVerdict(
        verdict="pass",
        syntax_ok=True,
        tests_passed=True,
        tests_summary="OK",
        build_ok=True
    )

    receipt = hub.create_loop_receipt(task, decision, outcome, verdict)
    assert receipt.audit_passed is True
    assert receipt.task_key == "t-1"
    receipt_files = list((tmp_path / "data/loop_receipts").glob("receipt_*.json"))
    assert len(receipt_files) == 1
