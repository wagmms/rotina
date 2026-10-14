"""
Módulo Profundo: Executor e Orquestrador de Ciclo (CycleRunner).
Gerencia máquina de estados do ciclo, validação expressa, cotas 0ms e loop perpétuo.
"""
from datetime import datetime, timedelta
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from typing import Any, Dict, List, Optional, Tuple

sys.path.insert(0, str(Path.home() / ".local" / "bin"))
try:
    import agy_contas
    CORES = agy_contas.CORES
except Exception:
    CORES = {"reset": "\033[0m", "bold": "\033[1m", "green": "\033[32m", "yellow": "\033[33m", "red": "\033[31m", "cyan": "\033[36m"}

from contracts import TaskItem, RoutingDecision, ExecutionOutcome
import engine
from execution import run_observed, stop_process_group, observed_sleep, record_metric, fingerprint_tree
from task_context import UsageMeter, calculate_agent_timeout, build_task_brief
from syntax_checker import validar_sintaxe_expressa
from prune_artifacts import prune_artifacts
from loop_guard import task_allowed, mark_task, check_unreleased_diff_size
from failure_queue import select_failure, record_attempt
from audit_repairs import select_repair
from deploy_pipeline import carregar_estado_deploy, verificar_e_executar_deploy_agendado
from scheduler import TaskScheduler


class CycleRunner:
    """Máquina de estados para orquestração e execução de ciclos do Autoloop."""

    def __init__(self, root: Optional[Path] = None):
        self.root = Path(root).resolve() if root else Path(".").resolve()

    def execute_cycle(
        self, task: TaskItem, decision: RoutingDecision, squad_name: str,
        agents: List[Dict[str, Any]], goal: str, forever: bool = True,
        max_steps: Optional[int] = None, module_ctx: Any = None
    ) -> ExecutionOutcome:
        """Executa um ciclo do engine e retorna o ExecutionOutcome estruturado."""
        t0 = time.monotonic()
        fp_before = fingerprint_tree(self.root)
        success = executar_ciclo(
            num_conta=decision.account_number, nome_modelo=decision.model_name,
            id_modelo=decision.model_id, objetivo=goal, forever=forever,
            squad_mode=squad_name, perfil_tarefa=decision.tier,
            tarefa_ativa=task.text, task_key=task.key,
            max_steps=max_steps, _module_ctx=module_ctx
        )
        return ExecutionOutcome(
            returncode=0 if success else 1, success=success,
            duration_seconds=time.monotonic() - t0,
            fingerprint_before=fp_before, fingerprint_after=fingerprint_tree(self.root)
        )

    def print_status(self, models: Optional[List[Tuple[str, str]]] = None, module_ctx: Any = None) -> None:
        """Exibe o status de cotas e contas."""
        cmd_status(modelos=models, _module_ctx=module_ctx)

    def run_loop(self, args: Any, module_ctx: Any = None) -> None:
        """Inicia a orquestração de loop de tarefas."""
        executar_orquestracao_tarefas(args, _module_ctx=module_ctx, root=self.root)


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
    max_steps=None,
    _module_ctx=None
):
    """
    Executa um ciclo completo do Antigravity CLI (agy) com supervisão,
    streaming no terminal, fast-ack sintático e validação de qualidade.
    """
    engine.ultimo_ciclo_cota_esgotada = False
    if _module_ctx and hasattr(_module_ctx, "ultimo_ciclo_cota_esgotada"):
        _module_ctx.ultimo_ciclo_cota_esgotada = False
    mod = _module_ctx or sys.modules.get("autoloop") or sys.modules.get("autoloop_quota_test")
    if mod and hasattr(mod, "ultimo_ciclo_cota_esgotada"):
        mod.ultimo_ciclo_cota_esgotada = False

    token = agy_contas.carregar_conta(num_conta)
    email = agy_contas.extract_email(token)
    agy_contas.set_active_token(token)

    fn_squad = engine._get_autoloop_delegate("resolver_squad_agentes", engine.resolver_squad_agentes, _module_ctx)
    nome_squad, lista_agentes = fn_squad(squad_mode, subagents_custom, perfil_tarefa)

    try:
        fn_cleaner = engine._get_autoloop_delegate("garantir_progress_enxuto", None, _module_ctx)
        if fn_cleaner:
            fn_cleaner(".", titulo_projeto="Ultra Rotina")
    except Exception:
        pass

    try:
        prune_artifacts(".", max_age_days=5, max_releases=30)
    except Exception:
        pass

    print(f"\n{CORES['bold']}{'─' * 60}{CORES['reset']}")
    foco_tarefa = ""
    if tarefa_ativa:
        primeira_l = tarefa_ativa.splitlines()[0].strip()
        primeira_l_limpa = re.sub(r'^\s*(?:\d+\.|\-)\s*\[ \]\s*', '', primeira_l).strip()
        if primeira_l_limpa:
            foco_tarefa = f"\n  🎯 {CORES['bold']}{primeira_l_limpa[:70]}{CORES['reset']}"
    engine.log("CICLO", f"Conta {num_conta} ({email}) | {CORES['bold']}{CORES['green']}{nome_modelo}{CORES['reset']}{foco_tarefa}")
    print(f"{CORES['bold']}{'─' * 60}{CORES['reset']}")

    if forever:
        diretriz_kaizen = """5. DIRETRIZ ABSOLUTA DO USUÁRIO (DESENVOLVIMENTO INTEGRAL DA ABA ROTINA):
   - FOCO EXCLUSIVO E PRIORITÁRIO: Desenvolvimento completo, modernização visual e integração funcional da Aba Rotina em todos os seus componentes (Cockpit PWA `#tab-rotina`, rotas Fastify `/api/rotina`, `RotinaService` em `src/06_rotina_agenda.js` e Central de Rotina no Telegram `/rotina`).
   - DESMOCKAGEM E TIMELINE REAL: Erradicar conteúdos estáticos ("Turma J", "Semana Ativa") e construir uma timeline de time-blocking moderna, responsiva e viva com cards ricos de blocos do dia (horários, atividades, tags, status e notas).
   - INTEGRAÇÃO CALENDAR & FASTIFY: Eliminar dependências legadas de GAS CalendarApp, implementando rotas e integrações nativas em Node.js Fastify para sincronizar eventos reais da agenda do médico.
   - TESTES DIRECIONADOS NA ITERAÇÃO & BATERIA COMPLETA NA CONCLUSÃO (TEST SHARDING): Durante o ciclo de iteração, execute apenas a suíte correspondente ao módulo editado (ex: `node scripts/run_tests.cjs tests/test_central_rotina_plantao_ux.cjs`). Execute a bateria completa de regressão (`npm test`) UMA ÚNICA VEZ apenas no fechamento da tarefa para emitir o recibo de estabilidade antes do commit.
   - CLÁUSULA PÉTREA DE QUALIDADE CLÍNICA: Não alterar fórmulas, doses ou salvaguardas médicas consolidadas das outras abas.
   - Mantenha na primeira linha do PROGRESS.md: '### STATUS: DESENVOLVIMENTO_ABA_ROTINA'."""
    else:
        diretriz_kaizen = "5. Se TODO o objetivo geral for 100% concluído e verificado, escreva '### STATUS: CONCLUIDO' na PRIMEIRA LINHA do PROGRESS.md."

    fn_prompt = engine._get_autoloop_delegate("montar_prompt_ciclo", engine.montar_prompt_ciclo, _module_ctx)
    prompt = fn_prompt(objetivo, nome_squad, lista_agentes, diretriz_kaizen, perfil_tarefa, tarefa_ativa)

    if resumo_tarefa:
        prompt += '\n\n' + resumo_tarefa

    cmd = [
        "agy",
        "--dangerously-skip-permissions",
        "--model", id_modelo,
        "--output-format", "stream-json",
        "-p", prompt
    ]

    linhas_saida = []
    segundos_reset_detectados = None
    indicadores_cota = set()
    consumo = UsageMeter()
    inicio_inferencia = time.monotonic()
    ultimo_arquivo_lido = None
    ultimo_resumo_turno = None

    if perfil_tarefa == "CLINICO_ROBUSTEZ_PRO":
        max_steps_padrao = 45
    elif perfil_tarefa == "INFRA_MECANICA_FLASH_MEDIUM":
        max_steps_padrao = 20
    else:
        max_steps_padrao = 30
    teto_passos = max_steps if max_steps is not None else int(os.environ.get("AUTOLOOP_MAX_STEPS", max_steps_padrao))
    passos_excedidos = False

    def receber_linha(linha):
        nonlocal segundos_reset_detectados, passos_excedidos
        consumo.observe(linha)

        if consumo.total_tool_steps > teto_passos and not passos_excedidos:
            passos_excedidos = True
            engine.log("AVISO", f"🛑 Teto de passos atingido ({consumo.total_tool_steps}/{teto_passos} ferramentas). Interrompendo sessão para proteger o orçamento de tokens!")
            proc_ativo = engine._processo_agy_ativo
            if _module_ctx and hasattr(_module_ctx, "_processo_agy_ativo") and _module_ctx._processo_agy_ativo:
                proc_ativo = _module_ctx._processo_agy_ativo
            if proc_ativo and proc_ativo.poll() is None:
                fn_stop = engine._get_autoloop_delegate("stop_process_group", stop_process_group, _module_ctx)
                fn_stop(proc_ativo)

        linhas_saida.append(linha[-4096:])
        del linhas_saida[:-128]
        low = linha.lower()
        for marker in ["agy_error", "resource_exhausted", "429", "quota",
                       "individual quota reached", "free trial quota",
                       "credits balance is too low", "model capacity exceeded",
                       "exhausted your quota", "resets in ", "error"]:
            if marker in low:
                indicadores_cota.add(marker)
        match_reset = re.search(r'Resets in (?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?', linha, re.IGNORECASE)
        if match_reset:
            d, h, m, sec = [int(x) if x else 0 for x in match_reset.groups()]
            total = d * 86400 + h * 3600 + m * 60 + sec
            if total > 0:
                segundos_reset_detectados = total + 60

    def _emitir_evento_equilibrado(linha_bruta):
        nonlocal ultimo_arquivo_lido, ultimo_resumo_turno
        try:
            linha = linha_bruta.strip()
            if not linha:
                return

            if not ((linha.startswith('{') and linha.endswith('}')) or (linha.startswith('[') and linha.endswith(']'))):
                if len(linha) <= 120 and any(linha.startswith(p) for p in ["[AGY]", "WARNING:", "ERROR:", "Notice:", "agy:"]):
                    print(f"  [AGY] {linha}", flush=True)
                return

            ev = json.loads(linha)
            if not isinstance(ev, dict):
                return

            evento = ev.get('event') or ev.get('type') or ''
            if evento in {'init', 'ping', 'heartbeat', 'turn_start', 'step_start', 'usage_metadata'}:
                return

            if evento == 'step_update':
                step = ev.get('step_update')
                if not isinstance(step, dict):
                    return
                stype = step.get('step_type') or ''
                state = step.get('state') or ''

                if stype == 'tool' and state == 'ACTIVE':
                    tool = step.get('tool_name') or 'ferramenta'
                    tool_info = step.get('tool_info')
                    params = tool_info.get('parameters', {}) if isinstance(tool_info, dict) else {}
                    if not isinstance(params, dict):
                        params = {}
                    alvo = (params.get('TargetFile') or params.get('AbsolutePath') or
                            params.get('CommandLine') or params.get('Instruction') or '')
                    alvo_str = str(alvo).strip()
                    if alvo_str:
                        if '/' in alvo_str and len(alvo_str) > 50:
                            alvo_str = '...' + alvo_str[-47:]
                        elif len(alvo_str) > 65:
                            alvo_str = alvo_str[:62] + '...'

                    if tool == 'view_file':
                        basename = alvo_str.split('/')[-1] if '/' in alvo_str else alvo_str
                        if basename != ultimo_arquivo_lido:
                            ultimo_arquivo_lido = basename
                            print(f"  [AGY] 📖 Consultando: {basename}", flush=True)
                        return

                    icones = {
                        'replace_file_content': '✍️ Editando',
                        'write_to_file': '📝 Criando',
                        'run_command': '💻 Executando',
                        'grep_search': '🔍 Buscando',
                        'find_by_name': '🔍 Localizando',
                    }
                    acao = icones.get(tool, f"🛠️ {tool}")
                    print(f"  [AGY] {acao}: {alvo_str}" if alvo_str else f"  [AGY] {acao}", flush=True)
                return

            if evento == 'result':
                res = ev.get('result')
                resp = None
                if isinstance(res, str):
                    resp = res
                elif isinstance(res, dict):
                    resp = res.get('response') or res.get('result')
                if isinstance(resp, str) and resp.strip():
                    linhas_texto = [l.strip() for l in resp.strip().splitlines() if l.strip() and not l.strip().startswith('```')]
                    if linhas_texto:
                        resumo = linhas_texto[0]
                        if len(resumo) > 90:
                            resumo = resumo[:87] + '...'
                        if resumo != ultimo_resumo_turno:
                            ultimo_resumo_turno = resumo
                            print(f"  [AGY] 💬 {resumo}", flush=True)
                return

            if evento in {'tool_use', 'tool_call'}:
                nome = ev.get('name') or ev.get('tool_name') or 'ferramenta'
                args = ev.get('input') or ev.get('arguments') or {}
                if isinstance(args, dict):
                    alvo = args.get('TargetFile') or args.get('AbsolutePath') or args.get('CommandLine') or args.get('Instruction') or ''
                    if alvo and len(str(alvo)) > 60:
                        alvo = str(alvo)[:57] + '...'
                    print(f"  [AGY] 🛠️ {nome}: {alvo}" if alvo else f"  [AGY] 🛠️ {nome}", flush=True)
        except Exception as exc:
            if os.getenv("AUTOLOOP_DEBUG"):
                print(f"  [DEBUG-STREAM] {exc}", flush=True)

    timeout_ciclo = calculate_agent_timeout(
        profile=perfil_tarefa,
        model=id_modelo,
        task_key=task_key
    )
    engine.log("INFO", f"⏱️ Timeout adaptativo do agente: {timeout_ciclo // 60}m ({timeout_ciclo}s) [Perfil: {perfil_tarefa or 'PADRAO'} | Modelo: {id_modelo}]")

    fn_run_observed = engine._get_autoloop_delegate("run_observed", run_observed, _module_ctx)

    def _reg_proc(proc):
        engine._registrar_processo_ativo(proc)
        fn_reg = engine._get_autoloop_delegate("_registrar_processo_ativo", None, _module_ctx)
        if fn_reg:
            fn_reg(proc)

    try:
        processo = fn_run_observed(cmd, stage="ciclo_agy", on_line=receber_linha,
                                   on_start=_reg_proc,
                                   emit=_emitir_evento_equilibrado,
                                   timeout=timeout_ciclo)
    except KeyboardInterrupt:
        engine.log("AVISO", "Execução interrompida; ciclo não validado.")
        return False
    finally:
        record_metric('consumo_agy', 'reported' if consumo.usage is not None else 'unavailable',
                      time.monotonic() - inicio_inferencia, model=id_modelo,
                      task_key=task_key, **consumo.fields())
        if consumo.usage:
            in_tok = consumo.usage.get('input_tokens') or 0
            cache_tok = consumo.usage.get('cache_read_input_tokens') or consumo.usage.get('cache_read_tokens') or 0
            if cache_tok > 0:
                pct = round((cache_tok / (in_tok + cache_tok)) * 100) if (in_tok + cache_tok) > 0 else 0
                engine.log("INFO", f"🧠 Context Caching Ativo: {cache_tok} tokens lidos do cache ({pct}% do prompt reaproveitado em 0ms)")

    if processo.returncode == 0:
        agy_contas.sincronizar_token_ativo()

    if passos_excedidos:
        engine.log("AVISO", f"🛑 Ciclo interrompido preventivamente por atingir o teto de {teto_passos} passos de ferramentas. Proteção de tokens acionada.")
        record_metric('ciclo_agy', 'step_limit_exceeded', time.monotonic() - inicio_inferencia,
                      task_key=task_key, model=id_modelo, steps=consumo.total_tool_steps)
        fn_sleep = engine._get_autoloop_delegate("observed_sleep", observed_sleep, _module_ctx)
        fn_sleep(2, 'limite_passos')
        return False

    cota_esgotada = False
    if processo.returncode != 0:
        texto_saida_low = "\n".join(indicadores_cota)
        indicadores_reais_cota = [
            ("agy_error" in texto_saida_low and any(k in texto_saida_low for k in ["resource_exhausted", "429", "quota"])),
            "individual quota reached" in texto_saida_low,
            "free trial quota" in texto_saida_low,
            "credits balance is too low" in texto_saida_low,
            "model capacity exceeded" in texto_saida_low,
            "exhausted your quota" in texto_saida_low,
            ("resets in " in texto_saida_low and "error" in texto_saida_low)
        ]
        if any(indicadores_reais_cota):
            cota_esgotada = True

    if cota_esgotada:
        engine.ultimo_ciclo_cota_esgotada = True
        if _module_ctx and hasattr(_module_ctx, "ultimo_ciclo_cota_esgotada"):
            _module_ctx.ultimo_ciclo_cota_esgotada = True
        if mod and hasattr(mod, "ultimo_ciclo_cota_esgotada"):
            mod.ultimo_ciclo_cota_esgotada = True
        if segundos_reset_detectados:
            libera = datetime.now() + timedelta(seconds=segundos_reset_detectados)
        else:
            libera = datetime.now() + timedelta(hours=1, minutes=30)

        bloqueios_ref = getattr(_module_ctx, "bloqueios", engine.bloqueios) if _module_ctx else engine.bloqueios
        engine.bloqueios[(num_conta, id_modelo)] = libera
        bloqueios_ref[(num_conta, id_modelo)] = libera
        familia = (["gemini-3.8-flash-high", "gemini-3.8-flash-medium", "gemini-3.1-pro-high"] if "gemini" in id_modelo
                   else ["claude-opus-4-6-thinking", "claude-sonnet-4-6", "claude-opus-5-5-high", "claude-sonnet-5-5-high", "claude-opus-5-5-medium", "claude-opus-5-5-low"] if "claude" in id_modelo else [])
        for mid in familia:
            engine.bloqueios[(num_conta, mid)] = libera
            bloqueios_ref[(num_conta, mid)] = libera

        tempo_str = f"{(libera - datetime.now()).total_seconds() / 3600:.1f}h"
        engine.log("AVISO", f"Cota esgotada para {nome_modelo} na Conta {num_conta} ({email})! Bloqueado por {tempo_str} (liberação: {libera.strftime('%d/%m %H:%M')})")
        return False

    if processo.returncode == 124:
        engine.log("AVISO", f"⏱️ Processo agy interrompido por timeout adaptativo ({timeout_ciclo}s). Orçamento de tempo esgotado para o perfil {perfil_tarefa or 'PADRAO'}.")
        fn_sleep = engine._get_autoloop_delegate("observed_sleep", observed_sleep, _module_ctx)
        fn_sleep(3, 'timeout_adaptativo')
        return False

    if processo.returncode != 0:
        engine.log("AVISO", f"Processo encerrou com código {processo.returncode}.")
        fn_sleep = engine._get_autoloop_delegate("observed_sleep", observed_sleep, _module_ctx)
        fn_sleep(3, 'erro_operacional')
        return False

    # Validação Sintática Expressa (Fast-Ack)
    res_sintaxe = validar_sintaxe_expressa(root=Path.cwd())
    if not res_sintaxe["ok"]:
        primeiro_erro = res_sintaxe["first_error_message"] or "Erro de sintaxe detectado"
        arquivo_falho = res_sintaxe["failures"][0]["file"]
        engine.log("ERRO", f"❌ Falha de sintaxe pós-edição (node --check Fast-Ack) em {arquivo_falho}:")
        for l in primeiro_erro.splitlines()[:6]:
            engine.log("ERRO", f"   {l}")
        record_metric("validacao_sintaxe", "failed", res_sintaxe["elapsed_seconds"],
                      file=arquivo_falho, error=primeiro_erro[:300], task_key=task_key)
        return False
    elif res_sintaxe["total_checked"] > 0:
        ms = res_sintaxe["elapsed_seconds"] * 1000
        engine.log("OK", f"⚡ Validação sintática expressa aprovada (node --check): {res_sintaxe['total_checked']} arquivo(s) verificado(s) em {ms:.1f}ms.")
        record_metric("validacao_sintaxe", "passed", res_sintaxe["elapsed_seconds"],
                      files_checked=res_sintaxe["total_checked"], task_key=task_key)

    fn_exec_etapa = engine._get_autoloop_delegate("executar_etapa", engine.executar_etapa, _module_ctx)
    verificacao = fn_exec_etapa(["npm", "run", "test:all", "--", "--reuse"], "testes_finais_ciclo", timeout=1800)
    if verificacao.returncode != 0:
        engine.log("INFO", "🧪 Alterações detectadas: executando bateria completa de testes...")
        verificacao = fn_exec_etapa(["npm", "run", "test:all"], "testes_finais_ciclo_completo", timeout=1800)
    if verificacao.returncode != 0:
        engine.log("ERRO", "Ciclo incompleto: bateria final falhou ou expirou. Sem aprovação.")
        return False

    try:
        status_git = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True).stdout.strip()
        if status_git:
            linhas_mod = [l for l in status_git.splitlines() if not l.startswith('?? data/') and not l.startswith('?? logs/')]
            if linhas_mod:
                subprocess.run(["git", "add", "src/", "tests/", "PROGRESS.md", "ultra_rotina_master.js"], capture_output=True)
                msg_salvaguarda = f"fix(autoloop): consolidar alteracoes do ciclo aprovado ({nome_modelo})"
                subprocess.run(["git", "commit", "-m", msg_salvaguarda], capture_output=True)
                engine.log("INFO", "💾 Commit de salvaguarda consolidado para o ciclo.")
    except Exception as e_git:
        engine.log("AVISO", f"Falha na salvaguarda de commit: {e_git}")

    engine.log("OK", f"Ciclo concluído com sucesso ({nome_modelo} na Conta {num_conta}).")
    try:
        fn_relatorio = engine._get_autoloop_delegate("enviar_relatorio_ciclo_rotina", None, _module_ctx)
        if fn_relatorio:
            fn_relatorio(nome_modelo, num_conta, nome_squad)
        else:
            from notifications import enviar_relatorio_ciclo_rotina
            enviar_relatorio_ciclo_rotina(nome_modelo, num_conta, nome_squad)
    except Exception as e:
        engine.log("AVISO", f"Falha ao enviar relatório do ciclo: {e}")
    return True


def cmd_status(modelos=None, _module_ctx=None):
    if modelos is None:
        modelos = engine.MODELOS_PADRAO
    agy_contas.cmd_status()
    agora = datetime.now()
    fn_contas = engine._get_autoloop_delegate("obter_contas_disponiveis", engine.obter_contas_disponiveis, _module_ctx)
    contas = fn_contas()

    bloqueios_ref = getattr(_module_ctx, "bloqueios", engine.bloqueios) if _module_ctx else engine.bloqueios

    print(f"{CORES['bold']}📊 STATUS DE COTA E FALLBACK POR MODELO:{CORES['reset']}\n")
    for c in contas:
        token = agy_contas.carregar_conta(c)
        email = agy_contas.extract_email(token)
        print(f"  {CORES['bold']}Conta {c} ({email}):{CORES['reset']}")
        for nome_mod, id_mod in modelos:
            fn_resolver = engine._get_autoloop_delegate("resolver_modelo_para_conta", engine.resolver_modelo_para_conta, _module_ctx)
            nome_real, id_real = fn_resolver(id_mod, c, email)
            libera = bloqueios_ref.get((c, id_real)) or engine.bloqueios.get((c, id_real))
            if libera and agora < libera:
                restante = int((libera - agora).total_seconds() // 60)
                status_mod = f"{CORES['red']}❌ Cota esgotada (libera em {restante} min - {libera.strftime('%H:%M:%S')}){CORES['reset']}"
            else:
                status_mod = f"{CORES['green']}✅ Disponível{CORES['reset']}"
            print(f"    - {nome_real}: {status_mod}")
        print()


def executar_orquestracao_tarefas(args, _module_ctx=None, root=Path(".")):
    """Orquestra o loop contínuo de tarefas, rotação 0ms e deploys agendados."""
    forever_mode = not args.stop_on_done
    ciclos_concluidos = 0
    modelos_selecionados = engine.parse_modelos(args.models)
    smart_mode = not args.no_smart and (modelos_selecionados is None or args.models == "auto")
    fn_obter_contas = engine._get_autoloop_delegate("obter_contas_disponiveis", engine.obter_contas_disponiveis, _module_ctx)
    contas_config = fn_obter_contas()

    print(f"\n{CORES['bold']}{CORES['cyan']}🤖 Autoloop Iniciado{CORES['reset']} | Pool: {contas_config} | Squad: {args.squad.upper()}")
    print(f"♾️ Modo: {'PERPÉTUO (Kaizen Contínuo)' if forever_mode else 'Parar ao Concluir'} | Roteador: {'Ativo (Flash/Pro)' if smart_mode else 'Fixo'}")
    if args.max_cycles is not None:
        print(f"🎯 Orçamento: Limite de {args.max_cycles} ciclo(s) configurado.")
    if args.max_steps is not None:
        print(f"🛡️ Guarda: Teto de {args.max_steps} passos de ferramentas por ciclo.")
    print(f"🎯 Objetivo: {args.objetivo}")
    if not args.no_auto_deploy:
        engine.log("INFO", f"⏰ Deploy automático a cada {args.deploy_interval:.1f}h com relatório no Telegram.")

    scheduler = TaskScheduler(Path(root))

    while True:
        if args.max_cycles is not None and ciclos_concluidos >= args.max_cycles:
            engine.log("OK", f"🏁 Limite de ciclos atingido ({ciclos_concluidos}/{args.max_cycles}). Encerrando autoloop conforme solicitado.")
            break

        try:
            subprocess.run(["shutdown", "-c"], capture_output=True)
        except Exception:
            pass

        if not args.no_auto_deploy:
            verificar_e_executar_deploy_agendado(
                intervalo_horas=args.deploy_interval,
                token_override=args.telegram_token,
                chat_override=args.telegram_chat
            )

        if not forever_mode and engine.projeto_concluido(root):
            engine.log("OK", "🎉 O arquivo PROGRESS.md indica que o projeto foi concluído com sucesso!")
            break

        estado_dep = carregar_estado_deploy()
        agora_dep = time.time()
        next_retry_dep = estado_dep.get("next_retry_at")
        pode_deploy_diff = not (next_retry_dep and agora_dep < next_retry_dep)
        base_dep = estado_dep.get("last_pushed_sha") or estado_dep.get("ultimo_pushed_sha")
        diff_len, is_oversized = check_unreleased_diff_size(Path(root), base=base_dep)
        if is_oversized and pode_deploy_diff:
            engine.log("AVISO", f"Diff acumulado não publicado ({diff_len:,} caracteres > 40.000). Priorizando consolidação e deploy antes de novas alterações.")
            fn_deploy = engine._get_autoloop_delegate("executar_deploy_e_relatorio", None, _module_ctx)
            if fn_deploy:
                fn_deploy(
                    intervalo_horas=args.deploy_interval,
                    token_override=args.telegram_token,
                    chat_override=args.telegram_chat
                )

        perfil_ativo = None
        tarefa_ativa = None
        pendencia = None
        if smart_mode:
            pendencia = select_repair() or select_failure()
            fn_tarefa_ativa = engine._get_autoloop_delegate("obter_tarefa_ativa_progress", None, _module_ctx)
            if pendencia:
                tarefa_ativa = pendencia.get('task')
            elif fn_tarefa_ativa:
                tarefa_ativa = fn_tarefa_ativa(root)
            else:
                task_obj = scheduler.get_next_task()
                tarefa_ativa = task_obj.text if task_obj else None

            if tarefa_ativa:
                perfil, desc_perfil, modelos_ciclo = (engine.classificar_pendencia(pendencia) if pendencia
                                                    else engine.classificar_perfil_tarefa(tarefa_ativa))
                perfil_ativo = perfil
            else:
                modelos_ciclo = modelos_selecionados or engine.MODELOS_PADRAO
        else:
            modelos_ciclo = modelos_selecionados or engine.MODELOS_PADRAO

        import hashlib
        selected_key = pendencia['key'] if pendencia else 'progress-' + hashlib.sha256((tarefa_ativa or args.objetivo).encode()).hexdigest()[:12]
        if not task_allowed(selected_key):
            engine.log("AVISO", f"Tarefa {selected_key} já concluída ou com duas tentativas pendentes; aguardando próxima tarefa específica, sem repetir agente.")
            fn_sleep = engine._get_autoloop_delegate("observed_sleep", observed_sleep, _module_ctx)
            fn_sleep(30, 'pendencia_sem_progresso')
            continue

        fn_obter_alvo = engine._get_autoloop_delegate("obter_proximo_alvo", engine.obter_proximo_alvo, _module_ctx)
        if fn_obter_alvo(modelos_ciclo, aguardar_se_bloqueado=False) is None:
            engine.log("AVISO", "Todas as contas configuradas constam temporariamente em repouso de cota.")
            fn_obter_alvo(modelos_ciclo, aguardar_se_bloqueado=True)
            continue

        inicio_tarefa = time.monotonic()
        resumo_tarefa, contexto_tarefa = build_task_brief(tarefa_ativa or args.objetivo, pendencia)
        if pendencia:
            pendencia['source_hashes'] = contexto_tarefa['source_hashes']
        record_metric('preparacao_tarefa', 'passed', time.monotonic() - inicio_tarefa,
                      task_key=contexto_tarefa['key'], prompt_characters=len(resumo_tarefa))
        registro_tarefa = pendencia or {'key': contexto_tarefa['key'], 'members': contexto_tarefa['tests'],
                                        'receipt_fingerprint': None, 'source_hashes': contexto_tarefa['source_hashes']}
        mark_task(contexto_tarefa['key'], 'started')
        record_attempt(registro_tarefa, 'started')

        sucesso = False
        modelo_executado = None

        while True:
            alvo = fn_obter_alvo(modelos_ciclo, aguardar_se_bloqueado=False)
            if alvo is None:
                engine.log("AVISO", "Todas as contas configuradas constam simultaneamente em janela de repouso de cota.")
                alvo = fn_obter_alvo(modelos_ciclo, aguardar_se_bloqueado=True)
                if alvo is None:
                    continue

            num_conta, nome_modelo, id_modelo = alvo
            modelo_executado = id_modelo
            record_metric('tarefa', 'started', 0, model=id_modelo,
                          task_key=contexto_tarefa['key'])

            fn_ciclo = engine._get_autoloop_delegate("executar_ciclo", executar_ciclo, _module_ctx)
            sucesso = fn_ciclo(
                num_conta,
                nome_modelo,
                id_modelo,
                args.objetivo,
                forever=forever_mode,
                squad_mode=args.squad,
                subagents_custom=args.subagents,
                perfil_tarefa=perfil_ativo,
                tarefa_ativa=tarefa_ativa,
                resumo_tarefa=resumo_tarefa,
                task_key=contexto_tarefa['key'],
                max_steps=args.max_steps
            )

            cota_esg = getattr(_module_ctx, "ultimo_ciclo_cota_esgotada", False) or engine.ultimo_ciclo_cota_esgotada
            if not sucesso and cota_esg:
                if args.stop_on_quota:
                    engine.log("AVISO", f"🛑 Cota atingida na Conta {num_conta} e flag --stop-on-quota ativa. Parando rotação entre contas.")
                    break

                engine.log("INFO", f"🔄 Rotação Imediata 0ms: Conta {num_conta} atingiu cota (429). Buscando próxima conta disponível no pool...")
                record_metric('rotacao_cota_0ms', 'rotated', 0,
                              conta_anterior=num_conta, model=id_modelo,
                              task_key=contexto_tarefa['key'])

                proximo_alvo = fn_obter_alvo(modelos_ciclo, aguardar_se_bloqueado=False)
                if proximo_alvo is not None:
                    engine.log("OK", f"🔄 Transição 0ms: migrando imediatamente para a Conta {proximo_alvo[0]} ({proximo_alvo[1]}) reaproveitando brief da tarefa e contexto aquecido.")
                    continue
                else:
                    engine.log("AVISO", "Todas as contas configuradas constam simultaneamente em janela de repouso de cota.")
                    fn_obter_alvo(modelos_ciclo, aguardar_se_bloqueado=True)
                    continue

            break

        duracao_tarefa = time.monotonic() - inicio_tarefa
        resultado_tarefa = 'passed' if sucesso else 'pending'
        mark_task(contexto_tarefa['key'], resultado_tarefa)
        record_attempt(registro_tarefa, resultado_tarefa, duracao_tarefa)
        record_metric('tarefa', resultado_tarefa, duracao_tarefa, model=modelo_executado or id_modelo, task_key=contexto_tarefa['key'])

        if sucesso:
            ciclos_concluidos += 1
            if args.max_cycles is not None and ciclos_concluidos >= args.max_cycles:
                engine.log("OK", f"🏁 Limite de ciclos concluídos atingido ({ciclos_concluidos}/{args.max_cycles}). Encerrando autoloop com sucesso!")
                break

        cota_esg = getattr(_module_ctx, "ultimo_ciclo_cota_esgotada", False) or engine.ultimo_ciclo_cota_esgotada
        if not sucesso and cota_esg and args.stop_on_quota:
            engine.log("AVISO", "🛑 Autoloop finalizado após esgotamento de cota (--stop-on-quota).")
            break

        if not args.no_auto_deploy:
            verificar_e_executar_deploy_agendado(
                intervalo_horas=args.deploy_interval,
                token_override=args.telegram_token,
                chat_override=args.telegram_chat
            )

        fn_sleep = engine._get_autoloop_delegate("observed_sleep", observed_sleep, _module_ctx)
        fn_sleep(2, 'entre_ciclos')
