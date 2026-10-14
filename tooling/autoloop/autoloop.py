#!/usr/bin/env python3
"""
Autoloop: Orquestrador autônomo multi-contas e multi-modelos para o Antigravity CLI (agy).
Execução contínua e ininterrupta com fallback inteligente:
Cascata: (Modelo 1 -> Modelo 2) na Conta 1 -> ... -> Conta 7 (e demais contas configuradas).
Modo Perpétuo (Kaizen Exponencial): Nunca encerra, reabastece o backlog e evolui continuamente o sistema.
"""
import argparse
from datetime import datetime, timedelta
import html
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import sys
import time
import unicodedata
import urllib.request
import urllib.error

# Configuração de caminhos e supervisão
sys.path.insert(0, str(Path.home() / ".local" / "bin"))
try:
    import agy_contas
    CORES = agy_contas.CORES
except Exception as e:
    print(f"Erro ao carregar módulo agy_contas: {e}")
    sys.exit(1)

_core_dir = Path(__file__).resolve().parent / "core"
_core_shared = Path.home() / ".local" / "lib" / "autoloop_core"
sys.path.insert(0, str(_core_dir if (_core_dir / "execution.py").exists() else _core_shared))

# Importação de Contratos de Domínio
from contracts import TaskItem, TaskOrigin, RoutingDecision, ExecutionOutcome, AuditVerdict, LoopReceipt

# Importação de Fachadas de Módulos Profundos (Deep Modules)
from scheduler import TaskScheduler
from engine import (
    ExecutionEngine, MAPA_MODELOS, MODELOS_PADRAO, TERMOS_COTA, SQUADS_CONFIG,
    SUBAGENTES_DISPONIVEIS, bloqueios, indice_conta_atual, ultimo_ciclo_cota_esgotada,
    resolver_modelo_para_conta, conta_configurada_rapida, obter_contas_disponiveis,
    parse_modelos, normalizar_texto, classificar_perfil_tarefa, classificar_pendencia,
    resolver_squad_agentes, montar_prompt_ciclo, formatador_etapa_resumido,
    executar_etapa, obter_proximo_alvo, projeto_concluido, log
)
from verification_gate import (
    VerificationGate, validar_codigo_estavel, classificar_risco_release,
    extrair_tempo_reset_codex, detectar_esgotamento_cota_codex, revisar_escopo_codex
)
from notifications import (
    obter_credenciais_telegram, enviar_relatorio_telegram, formatar_markdown_para_html,
    coletar_mudancas_ciclo, coletar_status_progress, coletar_sugestoes_futuras,
    enviar_relatorio_ciclo_rotina, obter_commit_head
)
from deploy_pipeline import (
    STATE_DEPLOY_FILE, _extrair_ts, carregar_estado_deploy, salvar_estado_deploy,
    revisar_parecer_autonomamente, _executar_deploy_e_relatorio_core,
    verificar_e_executar_deploy_agendado
)


def executar_deploy_e_relatorio(
    intervalo_horas=6.0,
    commit_anterior=None,
    token_override=None,
    chat_override=None,
    revisao_autonoma=True,
    forcar_telegram=False,
    root=Path("."),
    **kwargs
):
    mod = sys.modules.get(__name__)
    import deploy_pipeline
    return deploy_pipeline.executar_deploy_e_relatorio(
        intervalo_horas=intervalo_horas,
        commit_anterior=commit_anterior,
        token_override=token_override,
        chat_override=chat_override,
        revisao_autonoma=revisao_autonoma,
        forcar_telegram=forcar_telegram,
        root=root,
        _module_ctx=mod,
        **kwargs
    )

from observability import ObservabilityHub
from execution import stop_process_group, fingerprint_tree, record_metric, observed_sleep, run_observed

ERRO_ROTEADOR = None
try:
    from model_router import (
        classificar_perfil_release, selecionar_modelo_auditoria,
        validar_configuracao_modelo, classificar_alteracoes
    )
except ImportError as exc:
    ERRO_ROTEADOR = str(exc)

    def classificar_perfil_release(base_sha=None, candidate_sha=None, repo_dir=None):
        return "CLINICO_ROBUSTEZ_PRO"

    def selecionar_modelo_auditoria(perfil_tarefa, repo_dir=None):
        return None

    def validar_configuracao_modelo(model, effort):
        return False, "Roteador indisponível"

    def classificar_alteracoes(diff_texto):
        return []

def obter_parecer_auditoria_candidato(candidate_sha, base_sha=None, perfil_tarefa=None, timeout=600, root=Path(".")):
    if ERRO_ROTEADOR:
        return None, f"Roteador obrigatório indisponível: {ERRO_ROTEADOR}"
    import verification_gate
    return verification_gate.obter_parecer_auditoria_candidato(
        candidate_sha, base_sha=base_sha, perfil_tarefa=perfil_tarefa, timeout=timeout, root=root
    )

AUDIT_DIR = Path("data/auditorias_codex")
from task_context import (
    build_task_brief, UsageMeter, render_cli_event, coletar_telemetria_ciclo,
    formatar_bloco_telemetria, calculate_agent_timeout, CANONICAL_PROMPT_CACHE_HEADER,
    obter_cabecalho_estatico_cache, prefixo_comum_cache
)
from loop_guard import (
    acquire_project_lock, release_project_lock, last_lock_holder,
    task_allowed, mark_task, check_unreleased_diff_size
)
from failure_queue import select_failure, record_attempt
from audit_repairs import (
    capture_rejection, select_repair, audit_retry_timeout, record_approved,
    archive_raw_result, ready_for_reaudit, pending_repair_bypass_audit
)
from syntax_checker import validar_sintaxe_expressa, verificar_sintaxe_arquivo
from prune_artifacts import prune_artifacts
from backlog_sjf import selecionar_tarefa_sjf
try:
    from audit_validator import (
        avaliar_parecer_auditoria,
        VEREDITOS_VALIDOS,
        SEVERIDADES_VALIDAS,
        CAMPOS_OBRIGATORIOS_PARECER as CAMPOS_OBRIGATORIOS_SCHEMA,
        CAMPOS_OBRIGATORIOS_FINDING
    )
except ImportError as exc:
    _erro_importacao_validador = str(exc)

    def avaliar_parecer_auditoria(dados, sha_esperado):
        return False, f"FALHA CRÍTICA DE CONFIGURAÇÃO: Componente obrigatório 'audit_validator' indisponível ({_erro_importacao_validador}). Deploy bloqueado fatalmente."

try:
    from progress_cleaner import garantir_progress_enxuto
except ImportError:
    def garantir_progress_enxuto(*args, **kwargs):
        return False


_processo_agy_ativo = None

def _tratar_termino_gracioso(sig, frame):
    global _processo_agy_ativo
    if _processo_agy_ativo and _processo_agy_ativo.poll() is None:
        stop_process_group(_processo_agy_ativo)
    sys.exit(0)

try:
    signal.signal(signal.SIGTERM, _tratar_termino_gracioso)
    signal.signal(signal.SIGINT, _tratar_termino_gracioso)
except Exception:
    pass


def _registrar_processo_ativo(processo):
    global _processo_agy_ativo
    _processo_agy_ativo = processo


def obter_tarefa_ativa_progress(root=Path('.')):
    """Delega seleção de tarefa ao TaskScheduler com priorização SJF/WSJF."""
    scheduler = TaskScheduler(root)
    task = scheduler.get_next_task()
    return task.text if task else None


def obter_pendencia_validacao():
    """Retorna pendência de validação na fila justa."""
    selection = select_failure()
    return selection['task'] if selection else None


def executar_ciclo(
    num_conta,
    nome_modelo,
    id_modelo,
    objetivo,
    forever=True,
    squad_mode="single",
    subagents_custom=None,
    perfil_tarefa=None,
    tarefa_ativa=None,
    resumo_tarefa=None,
    task_key=None,
    max_steps=None
):
    """Executa um ciclo completo do Antigravity CLI (agy) delegando à fachada engine."""
    mod = sys.modules.get("autoloop") or sys.modules.get("autoloop_quota_test") or sys.modules.get(__name__)
    import engine
    return engine.executar_ciclo(
        num_conta=num_conta,
        nome_modelo=nome_modelo,
        id_modelo=id_modelo,
        objetivo=objetivo,
        forever=forever,
        squad_mode=squad_mode,
        subagents_custom=subagents_custom,
        perfil_tarefa=perfil_tarefa,
        tarefa_ativa=tarefa_ativa,
        resumo_tarefa=resumo_tarefa,
        task_key=task_key,
        max_steps=max_steps,
        _module_ctx=mod
    )


def cmd_status(modelos):
    """Exibe o status das contas e cotas de modelos delegando à fachada engine."""
    mod = sys.modules.get("autoloop") or sys.modules.get("autoloop_quota_test") or sys.modules.get(__name__)
    import engine
    return engine.cmd_status(modelos=modelos, _module_ctx=mod)


def main():
    parser = argparse.ArgumentParser(
        description="Orquestrador autônomo multi-contas e multi-modelos para o Antigravity CLI (agy)."
    )
    parser.add_argument(
        "objetivo",
        nargs="?",
        default="Desenvolvimento integral da Aba Rotina: timeline time-blocking no Cockpit PWA, integração Google Calendar no backend Node.js Fastify, sincronização em tempo real e automação da Central de Rotina no Telegram conforme PROGRESS.md",
        help="Descrição do objetivo ou tarefa a ser realizada."
    )
    parser.add_argument(
        "--models",
        type=str,
        default="auto",
        help="Cadeia de modelos para fallback ou 'auto' para roteamento semântico dinâmico (padrão: auto)."
    )
    parser.add_argument(
        "--no-smart",
        action="store_true",
        help="Desativa o roteador semântico e força a lista estática de modelos."
    )
    parser.add_argument(
        "--stop-on-done",
        action="store_true",
        help="Interrompe o loop caso o PROGRESS.md marque STATUS: CONCLUIDO."
    )
    parser.add_argument(
        "--login",
        type=int,
        choices=list(range(1, 11)),
        help="Inicia login para uma conta específica (1 a 10)."
    )
    parser.add_argument(
        "--dir", "-C",
        type=str,
        default=None,
        help="Diretório de trabalho do projeto."
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Exibe o status das contas e cotas de modelos."
    )
    parser.add_argument(
        "--deploy-interval",
        type=float,
        default=6.0,
        help="Intervalo em horas para deploy automático (padrão: 6.0h)."
    )
    parser.add_argument(
        "--deploy-now",
        action="store_true",
        help="Executa imediatamente o ciclo de deploy e relatório no Telegram."
    )
    parser.add_argument(
        "--no-auto-deploy",
        action="store_true",
        help="Desativa o deploy automático a cada 6 horas."
    )
    parser.add_argument(
        "--telegram-token",
        type=str,
        default=None,
        help="Token do Bot do Telegram para envio de relatórios."
    )
    parser.add_argument(
        "--telegram-chat",
        type=str,
        default=None,
        help="Chat ID do Telegram para receber relatórios."
    )
    parser.add_argument(
        "--squad",
        type=str,
        default="single",
        choices=["single", "direto", "solo", "auto", "full", "completo", "rapido", "dupla", "clinico"],
        help="Configuração do squad de subagentes."
    )
    parser.add_argument(
        "--max-steps",
        type=int,
        default=None,
        help="Limite máximo de passos de ferramentas por ciclo."
    )
    parser.add_argument(
        "--max-cycles",
        type=int,
        default=None,
        help="Número máximo de ciclos a executar antes de encerrar."
    )
    parser.add_argument(
        "--stop-on-quota",
        action="store_true",
        help="Encerra o autoloop se uma conta atingir cota (429)."
    )
    parser.add_argument(
        "--subagents",
        type=str,
        default=None,
        help="Lista customizada de subagentes separados por vírgula."
    )
    parser.add_argument(
        "--skip-audit",
        action="store_true",
        help="Opção descontinuada: auditoria obrigatória não pode ser dispensada."
    )
    args = parser.parse_args()

    dir_alvo = args.dir
    if not dir_alvo:
        if not os.path.exists("PROGRESS.md") and not os.path.exists(".git"):
            candidatos = [
                Path.home() / "Meus_Arquivos" / "Projetos IA" / "Rotina",
                Path("/home/wagmoraes/Projetos IA/Rotina"),
                Path.home() / "Projetos IA" / "Rotina"
            ]
            for c in candidatos:
                if (c / "PROGRESS.md").exists():
                    dir_alvo = str(c)
                    break

    if dir_alvo and os.path.exists(dir_alvo):
        os.chdir(dir_alvo)

    if args.skip_audit:
        parser.error("--skip-audit foi descontinuado: auditoria obrigatória protege a qualidade clínica.")
        os.environ["AUTOLOOP_CODEX_AUDIT"] = "0"

    modelos_selecionados = parse_modelos(args.models)
    smart_mode = not args.no_smart and (modelos_selecionados is None or args.models == "auto")

    if args.login:
        agy_contas.cmd_login(args.login)
        return

    if args.status:
        cmd_status(modelos_selecionados or MODELOS_PADRAO)
        return

    if args.deploy_now:
        project_lock = acquire_project_lock()
        if project_lock is None:
            holder = last_lock_holder()
            log("AVISO", f"Outro autoloop já controla este projeto ({holder}); deploy concorrente cancelado.")
            return
        executar_deploy_e_relatorio(
            intervalo_horas=args.deploy_interval,
            token_override=args.telegram_token,
            chat_override=args.telegram_chat,
            revisao_autonoma=True,
            forcar_telegram=True
        )
        return

    contas_config = obter_contas_disponiveis()
    if not contas_config:
        log("ERRO", "Nenhuma conta configurada!")
        sys.exit(1)

    if not os.environ.get("AUTOLOOP_INHIBITED"):
        env = os.environ.copy()
        env["AUTOLOOP_INHIBITED"] = "1"
        try:
            cmd_inhibit = [
                "systemd-inhibit",
                "--what=idle:sleep:handle-lid-switch",
                "--who=autoloop",
                "--why=Executando autoloop multi-contas"
            ]
            sys.exit(subprocess.run(cmd_inhibit + [sys.executable] + sys.argv, env=env).returncode)
        except Exception:
            pass

    project_lock = acquire_project_lock()
    if project_lock is None:
        holder = last_lock_holder()
        log("AVISO", f"Outro autoloop já controla este projeto ({holder}); segunda execução encerrada antes de chamar agentes.")
        record_metric('exclusao_mutua', 'duplicate_prevented', 0)
        return

    mod = sys.modules.get("autoloop") or sys.modules.get("autoloop_quota_test") or sys.modules.get(__name__)
    import engine
    engine.executar_orquestracao_tarefas(args, _module_ctx=mod, root=Path.cwd())



if __name__ == "__main__":
    main()
