"""
Camada de Domínio e Deep Modules do Autoloop.
Expõe contratos estritamente tipados e fachadas coesas:
- TaskScheduler (Agendamento & Guardas)
- ExecutionEngine (Roteamento & Execução)
- VerificationGate (Portão de Qualidade)
- ObservabilityHub (Observabilidade & Higiene)
- Notifications (Telegram & Progresso)
- DeployPipeline (Pipeline de Release)
"""
import sys
from pathlib import Path

# Garante que o diretório core esteja no sys.path para compatibilidade interna
_CORE_DIR = str(Path(__file__).resolve().parent)
if _CORE_DIR not in sys.path:
    sys.path.insert(0, _CORE_DIR)

from contracts import (
    TaskOrigin,
    TaskItem,
    RoutingDecision,
    ExecutionOutcome,
    AuditVerdict,
    LoopReceipt,
)
from scheduler import TaskScheduler
from cycle_runner import CycleRunner, executar_ciclo, cmd_status, executar_orquestracao_tarefas
from engine import (
    ExecutionEngine,
    MAPA_MODELOS,
    MODELOS_PADRAO,
    TERMOS_COTA,
    classificar_perfil_tarefa,
    classificar_pendencia,
    resolver_squad_agentes,
    montar_prompt_ciclo,
    obter_proximo_alvo,
    obter_contas_disponiveis,
    resolver_modelo_para_conta,
    executar_etapa,
)
from verification_gate import (
    VerificationGate,
    validar_codigo_estavel,
    classificar_risco_release,
    extrair_tempo_reset_codex,
    detectar_esgotamento_cota_codex,
    revisar_escopo_codex,
    obter_parecer_auditoria_candidato,
)
from observability import ObservabilityHub
import notifications
import deploy_pipeline

__all__ = [
    # Contratos
    "TaskOrigin",
    "TaskItem",
    "RoutingDecision",
    "ExecutionOutcome",
    "AuditVerdict",
    "LoopReceipt",
    # Fachadas
    "TaskScheduler",
    "ExecutionEngine",
    "CycleRunner",
    "VerificationGate",
    "ObservabilityHub",
    "notifications",
    "deploy_pipeline",
    # Símbolos canônicos
    "MAPA_MODELOS",
    "MODELOS_PADRAO",
    "TERMOS_COTA",
    "classificar_perfil_tarefa",
    "classificar_pendencia",
    "resolver_squad_agentes",
    "montar_prompt_ciclo",
    "obter_proximo_alvo",
    "obter_contas_disponiveis",
    "resolver_modelo_para_conta",
    "executar_etapa",
    "validar_codigo_estavel",
    "classificar_risco_release",
    "extrair_tempo_reset_codex",
    "detectar_esgotamento_cota_codex",
    "revisar_escopo_codex",
    "obter_parecer_auditoria_candidato",
]
