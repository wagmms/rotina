"""
Módulo Profundo: Observabilidade & Higiene (ObservabilityHub).
Unifica:
- Registro de métricas operacionais sem vazamento de dados clínicos (data/autoloop_metrics.jsonl).
- Coleta periódica de telemetria e geração do documento de 24h (data/autoloop_observacao.md).
- Emissão de recibos auditáveis imutáveis (LoopReceipt).
- Expurgo preventivo e retenção de artefatos temporários (prune_artifacts).
"""
import json
import os
from pathlib import Path
import time
import uuid
from typing import Any, Dict, List, Optional

from contracts import LoopReceipt, TaskItem, RoutingDecision, ExecutionOutcome, AuditVerdict
from execution import record_metric, observed_sleep
from observation import safe_event, atomic_json, collect_once
from prune_artifacts import (
    prune_artifacts, prune_scoped_audits, prune_audit_repairs,
    prune_test_reports, prune_task_notes, prune_autoloop_backups
)


class ObservabilityHub:
    """Hub central de telemetria, recibos e higienização de artefatos."""

    def __init__(self, root: Optional[Path] = None):
        self.root = Path(root).resolve() if root else Path(".").resolve()

    def emit_metric(self, stage: str, status: str, elapsed: float, **fields) -> None:
        """Registra métrica de forma não-bloqueante."""
        record_metric(stage, status, elapsed, **fields)

    def sleep_observed(self, seconds: float, reason: str) -> None:
        """Executa sleep medido com telemetria."""
        observed_sleep(seconds, reason)

    def prune_workspace(self, dry_run: bool = False) -> Dict[str, Any]:
        """Expurga artefatos antigos de auditorias, testes e relatórios."""
        return prune_artifacts(self.root, dry_run=dry_run)

    def create_loop_receipt(
        self,
        task: TaskItem,
        decision: RoutingDecision,
        outcome: ExecutionOutcome,
        verdict: AuditVerdict
    ) -> LoopReceipt:
        """Emite o recibo imutável do ciclo executado."""
        iteration_id = uuid.uuid4().hex
        receipt = LoopReceipt(
            iteration_id=iteration_id,
            timestamp=time.time(),
            task_key=task.key,
            task_text=task.text,
            model_used=decision.model_name,
            account_id=decision.account_number,
            execution_code=outcome.returncode,
            audit_passed=(verdict.verdict == "pass"),
            code_fingerprint=outcome.fingerprint_after or outcome.fingerprint_before,
            duration_seconds=outcome.duration_seconds,
            token_usage=outcome.token_usage
        )

        receipt_file = self.root / "data" / "loop_receipts" / f"receipt_{iteration_id}.json"
        try:
            receipt_file.parent.mkdir(parents=True, exist_ok=True)
            receipt_dict = {
                "iteration_id": receipt.iteration_id,
                "timestamp": receipt.timestamp,
                "task_key": receipt.task_key,
                "task_text": receipt.task_text,
                "model_used": receipt.model_used,
                "account_id": receipt.account_id,
                "execution_code": receipt.execution_code,
                "audit_passed": receipt.audit_passed,
                "code_fingerprint": receipt.code_fingerprint,
                "duration_seconds": receipt.duration_seconds,
                "token_usage": receipt.token_usage
            }
            receipt_file.write_text(json.dumps(receipt_dict, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception:
            pass

        return receipt

    def summarize_metrics(self) -> List[Dict[str, Any]]:
        """Consolida métricas e consumo explícito de tokens por tarefa."""
        from task_context import summarize_metrics
        return summarize_metrics(self.root)

    def collect_telemetry(self, state: Dict[str, Any]) -> None:
        """Executa uma rodada de agregação de telemetria e atualiza o estado."""
        collect_once(self.root, state)
        atomic_json(self.root / "data" / ".autoloop_observation.json", state)

    def get_observation_status(self) -> str:
        """Retorna o estado atual da observação formatado."""
        state_file = self.root / "data" / ".autoloop_observation.json"
        return state_file.read_text(encoding="utf-8") if state_file.exists() else "Nenhuma coleta iniciada."

    def get_receipts(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Recupera recibos de ciclos arquivados."""
        receipts_dir = self.root / "data" / "loop_receipts"
        if not receipts_dir.exists():
            return []
        files = sorted(receipts_dir.glob("receipt_*.json"), key=lambda f: f.stat().st_mtime, reverse=True)
        res = []
        for f in files[:limit]:
            try:
                res.append(json.loads(f.read_text(encoding="utf-8")))
            except Exception:
                pass
        return res

