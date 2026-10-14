"""
Contratos de Domínio Imutáveis para a arquitetura do Autoloop.
Padroniza a comunicação entre todos os estágios do pipeline:
Agendamento (SJF) -> Roteamento/Execução -> Portão de Qualidade -> Observabilidade.
"""
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


class TaskOrigin(str, Enum):
    PROGRESS_SJF = "progress_sjf"
    FAILURE_QUEUE = "failure_queue"
    AUDIT_REPAIR = "audit_repair"
    MANUAL = "manual"


@dataclass(frozen=True)
class TaskItem:
    """Contrato imutável de entrada para uma tarefa agendada."""
    key: str
    text: str
    origin: TaskOrigin
    clinical: bool
    engineering: bool
    wsjf_score: float = 0.0
    attempts: int = 0
    target_files: Tuple[str, ...] = ()
    target_functions: Tuple[str, ...] = ()
    acceptance_criteria: str = ""
    members: Tuple[str, ...] = ()
    raw_payload: Dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class RoutingDecision:
    """Decisão imutável de roteamento de modelo, conta e capacidade."""
    model_name: str
    model_id: str
    account_number: int
    account_email: str
    effort: str
    tier: str
    justification: str
    is_quota_exhausted: bool = False
    cooldown_seconds: Optional[int] = None
    fallback_applied: bool = False


@dataclass(frozen=True)
class ExecutionOutcome:
    """Resultado imutável de uma etapa ou ciclo de execução observada."""
    stage: str
    returncode: int
    stdout: str
    stderr: str
    duration_seconds: float
    fingerprint_before: str = ""
    fingerprint_after: str = ""
    token_usage: Dict[str, Any] = field(default_factory=dict)
    timed_out: bool = False
    interrupted: bool = False
    step_count: Optional[int] = None


@dataclass(frozen=True)
class AuditVerdict:
    """Veredito imutável e estruturado do Portão de Qualidade."""
    verdict: str  # 'pass' | 'fail' | 'inconclusive'
    syntax_ok: bool
    tests_passed: bool
    tests_summary: str
    build_ok: bool
    findings: Tuple[Dict[str, Any], ...] = ()
    limitations: Tuple[str, ...] = ()
    followups: Tuple[str, ...] = ()
    candidate_sha: Optional[str] = None
    repair_packet_path: Optional[str] = None


@dataclass(frozen=True)
class LoopReceipt:
    """Recibo auditável e imutável emitido ao final de cada iteração."""
    iteration_id: str
    timestamp: float
    task_key: str
    task_text: str
    model_used: str
    account_id: int
    execution_code: int
    audit_passed: bool
    code_fingerprint: str
    duration_seconds: float
    token_usage: Dict[str, Any] = field(default_factory=dict)
