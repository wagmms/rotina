"""
Módulo Profundo: Agendamento & Guardas (TaskScheduler).
Unifica a seleção e ciclo de vida de tarefas:
- Reparos prioritários de auditoria (audit_repairs)
- Fila justa de investigações de falha (failure_queue)
- Priorização Shortest-Job-First Clínico / WSJF (backlog_sjf)
- Orçamento de tentativas e locks de exclusão mútua (loop_guard)
"""
from pathlib import Path
import hashlib
import json
import re
from typing import Any, Dict, List, Optional, Tuple

from contracts import TaskItem, TaskOrigin, ExecutionOutcome
import backlog_sjf
import failure_queue
import loop_guard
import audit_repairs


class TaskScheduler:
    """Orquestrador unificado de agendamento de tarefas e controle de guardas."""

    def __init__(self, root: Optional[Path] = None):
        self.root = Path(root).resolve() if root else Path(".").resolve()

    def acquire_lock(self) -> Optional[Any]:
        """Adquire o lock de exclusão mútua do projeto."""
        return loop_guard.acquire_project_lock(self.root)

    def release_lock(self) -> None:
        """Libera o lock do projeto."""
        loop_guard.release_project_lock()

    def last_lock_holder(self) -> str:
        """Retorna informações sobre o processo que deteve o último lock."""
        return loop_guard.last_lock_holder(self.root)

    def get_next_task(self) -> Optional[TaskItem]:
        """
        Seleciona a próxima tarefa válida respeitando a precedência arquitetural:
        1. Reparos de auditoria de release pendentes.
        2. Falhas na fila justa de testes (Shortest-Job-First).
        3. Tarefa ativa no PROGRESS.md (WSJF Clínico).
        """
        # 1. Checa reparos de auditoria
        try:
            repair = audit_repairs.select_repair(self.root)
            if repair and loop_guard.task_allowed(repair["key"], self.root):
                task_text = repair.get("task") or f"Correção de recusa de auditoria: {repair['key']}"
                files = tuple(repair.get("files", []))
                return TaskItem(
                    key=repair["key"],
                    text=task_text,
                    origin=TaskOrigin.AUDIT_REPAIR,
                    clinical=True,
                    engineering=False,
                    wsjf_score=999.0,
                    attempts=repair.get("attempts", 0),
                    target_files=files,
                    raw_payload=repair,
                )
        except Exception:
            pass

        # 2. Checa falhas na fila justa
        try:
            failure = failure_queue.select_failure(self.root)
            if failure and loop_guard.task_allowed(failure["key"], self.root):
                key = failure["key"]
                members = tuple(failure.get("members", [key]))
                is_eng = failure.get("engineering", False)
                return TaskItem(
                    key=key,
                    text=failure["task"],
                    origin=TaskOrigin.FAILURE_QUEUE,
                    clinical=not is_eng,
                    engineering=is_eng,
                    wsjf_score=100.0,
                    attempts=failure.get("attempts", 0),
                    target_files=members,
                    members=members,
                    raw_payload=failure,
                )
        except Exception:
            pass

        # 3. Checa tarefas do PROGRESS.md via WSJF
        tarefa_sjf = backlog_sjf.selecionar_tarefa_sjf(self.root)
        if not tarefa_sjf:
            tarefa_sjf = self._extrair_fallback_progress()

        if not tarefa_sjf:
            return None

        key = "progress-" + hashlib.sha256(tarefa_sjf.encode("utf-8")).hexdigest()[:12]
        if not loop_guard.task_allowed(key, self.root):
            return None

        # Avaliação de características
        crit = backlog_sjf.avaliar_criticidade_clinica(tarefa_sjf)
        esforco = backlog_sjf.estimar_esforco_job(tarefa_sjf)
        score = backlog_sjf.calcular_wsjf_score(tarefa_sjf)

        # Mapeamento cirúrgico de arquivos e funções
        alvos = re.findall(
            r'(?:src|server|scripts|tooling)/[A-Za-z0-9_./-]+\.(?:js|cjs|py)|cockpit_movel\.html',
            tarefa_sjf
        )
        funcoes = re.findall(
            r'(?:função|funcao|método|metodo|componente|seletor)\s+`?([A-Za-z_$][\w$]*)',
            tarefa_sjf,
            re.I
        )
        aceite_m = re.search(
            r'(?:critério de aceite|criterio de aceite|comportamento esperado|aceite):\s*([^\n]+)',
            tarefa_sjf,
            re.I
        )
        aceite = aceite_m.group(1).strip() if aceite_m else ""

        return TaskItem(
            key=key,
            text=tarefa_sjf,
            origin=TaskOrigin.PROGRESS_SJF,
            clinical=(crit >= 3.0),
            engineering=(crit < 3.0),
            wsjf_score=score,
            attempts=0,
            target_files=tuple(sorted(set(alvos))),
            target_functions=tuple(sorted(set(funcoes))),
            acceptance_criteria=aceite,
            raw_payload={"criticidade": crit, "esforco": esforco},
        )

    def _extrair_fallback_progress(self) -> Optional[str]:
        """Fallback defensivo caso o parser padrão do PROGRESS.md não retorne tarefas."""
        p_path = self.root / "PROGRESS.md"
        if not p_path.is_file():
            return None
        try:
            conteudo = p_path.read_text(encoding="utf-8")
            m_andamento = re.search(
                r'##\s*🔄\s*Próxima Tarefa em Andamento(.*?)(?:##|\Z)',
                conteudo,
                re.DOTALL | re.IGNORECASE
            )
            if m_andamento:
                bloco_andamento = m_andamento.group(1).strip()
                m_item = re.search(
                    r'^\s*(?:\d+[A-Za-z]?\.|\-|\*)\s*\[ \]\s*\*\*.*?(?=(?:^\s*(?:\d+[A-Za-z]?\.|\-|\*)\s*\[|\Z|##|---))',
                    bloco_andamento,
                    re.DOTALL | re.MULTILINE
                )
                if m_item:
                    return m_item.group(0).strip()

            linhas = conteudo.splitlines()
            capturando = False
            texto_tarefa = []
            em_concluidas = False
            for linha in linhas:
                if "Histórico de Melhorias Concluídas" in linha or "Melhorias Concluídas" in linha:
                    em_concluidas = True
                if em_concluidas:
                    break
                if re.search(r'^\s*(?:\d+[A-Za-z]?\.|\-|\*)\s*\[ \]\s*\*\*', linha):
                    if capturando:
                        break
                    capturando = True
                    texto_tarefa.append(linha)
                    continue
                if capturando:
                    if (
                        re.search(r'^\s*(?:\d+[A-Za-z]?\.|\-|\*)\s*\[[xX]\]\s*\*\*', linha)
                        or linha.startswith("## ")
                        or linha.startswith("---")
                    ):
                        break
                    texto_tarefa.append(linha)
            return "\n".join(texto_tarefa).strip() if texto_tarefa else None
        except Exception:
            return None

    def record_task_outcome(self, task: TaskItem, outcome: ExecutionOutcome) -> None:
        """Registra o desfecho da tarefa atualizando filas e orçamentos."""
        status = "passed" if outcome.returncode == 0 else "pending"
        loop_guard.mark_task(task.key, status, self.root)

        if task.origin == TaskOrigin.FAILURE_QUEUE and task.raw_payload:
            failure_queue.record_attempt(
                selection=task.raw_payload,
                status=status,
                seconds=outcome.duration_seconds,
                root=self.root
            )
