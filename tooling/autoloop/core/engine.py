"""
Módulo Profundo: Roteamento & Execução (ExecutionEngine).
Gerencia roteamento semântico, cotas/rotação 0ms, squads e montagem de prompts.
"""
from datetime import datetime, timedelta
import html
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import unicodedata
from typing import Any, Dict, List, Optional, Tuple

# Importa agy_contas do path local
sys.path.insert(0, str(Path.home() / ".local" / "bin"))
try:
    import agy_contas
    CORES = agy_contas.CORES
except Exception:
    CORES = {
        "reset": "\033[0m", "bold": "\033[1m", "green": "\033[32m",
        "yellow": "\033[33m", "red": "\033[31m", "cyan": "\033[36m"
    }

from contracts import RoutingDecision, TaskItem, ExecutionOutcome
from execution import run_observed, stop_process_group, observed_sleep, record_metric
from task_context import obter_cabecalho_estatico_cache

# Modelos conhecidos com atalhos amigáveis
MAPA_MODELOS = {
    "opus": ("Claude Opus 4.6 (Thinking)", "claude-opus-4-6-thinking"),
    "claude-opus": ("Claude Opus 4.6 (Thinking)", "claude-opus-4-6-thinking"),
    "opus-5.5": ("Claude Opus 5.5 (High)", "claude-opus-5-5-high"),
    "opus-5-5": ("Claude Opus 5.5 (High)", "claude-opus-5-5-high"),
    "opus5": ("Claude Opus 5.5 (High)", "claude-opus-5-5-high"),
    "claude-opus-5.5": ("Claude Opus 5.5 (High)", "claude-opus-5-5-high"),
    "sonnet": ("Claude Sonnet 4.6 (Thinking)", "claude-sonnet-4-6"),
    "claude-sonnet": ("Claude Sonnet 4.6 (Thinking)", "claude-sonnet-4-6"),
    "sonnet-5.5": ("Claude Sonnet 5.5 (High)", "claude-sonnet-5-5-high"),
    "sonnet-5-5": ("Claude Sonnet 5.5 (High)", "claude-sonnet-5-5-high"),
    "flash": ("Gemini 3.8 Flash (High)", "gemini-3.8-flash-high"),
    "gemini-flash": ("Gemini 3.8 Flash (High)", "gemini-3.8-flash-high"),
    "flash-high": ("Gemini 3.8 Flash (High)", "gemini-3.8-flash-high"),
    "flash-medium": ("Gemini 3.8 Flash (Medium)", "gemini-3.8-flash-medium"),
    "gemini-flash-medium": ("Gemini 3.8 Flash (Medium)", "gemini-3.8-flash-medium"),
    "medium": ("Gemini 3.8 Flash (Medium)", "gemini-3.8-flash-medium"),
    "pro": ("Gemini 3.1 Pro (High)", "gemini-3.1-pro-high"),
    "gemini-pro": ("Gemini 3.1 Pro (High)", "gemini-3.1-pro-high")
}

MODELOS_PADRAO = [
    ("Gemini 3.8 Flash (High)", "gemini-3.8-flash-high"),
    ("Gemini 3.1 Pro (High)", "gemini-3.1-pro-high")
]

TERMOS_COTA = [
    "resource_exhausted", "quota exceeded", "rate limit", "429",
    "too many requests", "credits balance is too low", "credit balance",
    "free trial quota", "model capacity exceeded", "exhausted your quota",
    "exceeded your current quota", "overloaded"
]

bloqueios = {}
indice_conta_atual = 1
ultimo_ciclo_cota_esgotada = False
_processo_agy_ativo = None


def _get_autoloop_delegate(attr_name: str, fallback_func: Any, module_ctx: Any = None) -> Any:
    if module_ctx and hasattr(module_ctx, attr_name):
        return getattr(module_ctx, attr_name)
    mod = sys.modules.get("autoloop") or sys.modules.get("autoloop_quota_test")
    if mod and hasattr(mod, attr_name):
        return getattr(mod, attr_name)
    return fallback_func


def _registrar_processo_ativo(processo):
    global _processo_agy_ativo
    _processo_agy_ativo = processo


def log(tipo, msg):
    hora = datetime.now().strftime("%H:%M:%S")
    cor = {
        "INFO": CORES.get("cyan", ""),
        "OK": CORES.get("green", ""),
        "AVISO": CORES.get("yellow", ""),
        "ERRO": CORES.get("red", ""),
    }.get(tipo, CORES.get("reset", ""))
    print(f"{CORES.get('bold', '')}[{hora}]{CORES.get('reset', '')} {cor}[{tipo}]{CORES.get('reset', '')} {msg}")


def resolver_modelo_para_conta(id_modelo, num_conta, email_conta=""):
    """Adapta dinamicamente o ID do modelo à conta ativa."""
    if not email_conta:
        try:
            token = agy_contas.carregar_conta(num_conta)
            email_conta = agy_contas.extract_email(token) or ""
        except Exception:
            email_conta = ""

    eh_conta_55 = ("wagnermoraes.souza" in email_conta.lower()) or (num_conta == 4)

    if "opus" in id_modelo:
        if eh_conta_55:
            return ("Claude Opus 5.5 (High)", "claude-opus-5-5-high")
        else:
            return ("Claude Opus 4.6 (Thinking)", "claude-opus-4-6-thinking")

    if "sonnet" in id_modelo:
        if eh_conta_55:
            return ("Claude Sonnet 5.5 (High)", "claude-sonnet-5-5-high")
        else:
            return ("Claude Sonnet 4.6 (Thinking)", "claude-sonnet-4-6")

    for _, (nome, mid) in MAPA_MODELOS.items():
        if mid == id_modelo:
            return (nome, mid)
    return (id_modelo, id_modelo)


def conta_configurada_rapida(num):
    """Verifica rapidamente no disco local se a conta possui credencial válida (0ms)."""
    try:
        c_file = agy_contas.get_conta_file(num)
        if c_file.exists() and c_file.stat().st_size > 10:
            return True
    except Exception:
        pass
    return False


def obter_contas_disponiveis():
    """Retorna dinamicamente a lista de contas que possuem token configurado em 0ms."""
    disponiveis = []
    try:
        for f in sorted(agy_contas.CONTAS_DIR.glob("conta*.json")):
            m = re.search(r'conta(\d+)\.json', f.name)
            if m:
                num = int(m.group(1))
                if conta_configurada_rapida(num):
                    disponiveis.append(num)
    except Exception:
        pass

    if not disponiveis:
        tot = getattr(agy_contas, "TOTAL_CONTAS_PADRAO", 7)
        for i in range(1, tot + 1):
            if conta_configurada_rapida(i):
                disponiveis.append(i)

    if not disponiveis:
        tot = getattr(agy_contas, "TOTAL_CONTAS_PADRAO", 7)
        for i in range(1, tot + 1):
            try:
                if agy_contas.carregar_conta(i) is not None:
                    disponiveis.append(i)
            except Exception:
                pass
    return sorted(list(set(disponiveis)))


def parse_modelos(string_modelos):
    if not string_modelos or string_modelos.lower() == "auto":
        return None
    lista = []
    for item in string_modelos.split(","):
        chave = item.strip().lower()
        if chave in MAPA_MODELOS:
            lista.append(MAPA_MODELOS[chave])
        else:
            lista.append((item.strip(), item.strip()))
    return lista


def normalizar_texto(txt):
    if not txt:
        return ""
    separado = re.sub(r'([a-z])([A-Z])', r'\1 \2', str(txt)).replace('_', ' ')
    nfkd = unicodedata.normalize('NFKD', separado.lower())
    return "".join([c for c in nfkd if not unicodedata.combining(c)])


def classificar_perfil_tarefa(texto_tarefa):
    """
    Roteador Semântico Cognitivo:
    - Gemini Pro (gemini-3.1-pro-high): Conteúdo clínico beira-leito, farmacologia, doses.
    - Gemini Flash (gemini-3.8-flash-high): Todo o resto (UI, bots, Fastify, build, refatoração).
    """
    if not texto_tarefa:
        return "GERAL_FLASH", "Desenvolvimento geral com Gemini Flash", [MAPA_MODELOS["flash"]]

    norm = normalizar_texto(texto_tarefa)

    regex_ui = re.compile(
        r'\b(telegram|botao|botoes|teclado|replykeyboard|inline_keyboard|menu|menus|layout|css|'
        r'tailwind|cockpit|card|cards|visual|copiar pep|responsivo|icone|pwa|mini app|webapp|modal|tab-)\b'
    )

    termos_robustez_clinica = [
        "conteudo clinico", "conteudo medico", "revisao clinica", "revisao medica",
        "auditoria clinica", "auditoria medica", "precisao clinica", "fidelidade cientifica",
        "validacao medica", "validacao clinica", "seguranca do paciente", "bloqueio de iatrogenia",
        "dose", "doses", "dosagem", "dosagens", "posologia", "posologias", "posologica", "posologicas", "teto farmacologico",
        "farmacocinetica", "toxicidade", "antidoto", "droga vasoativa", "dva", "infusao",
        "infusoes", "farmacologico", "farmacologicos", "farmacologica", "farmacologicas", "calculo medico", "calculos medicos", "zuspan", "pritchard", "sulfato de magnesio", "mgso4", "gluconato de calcio",
        "interacoes medicamentosas", "gasometria", "winter", "cockcroft", "clearance", "kdigo",
        "ajuste renal", "curb-65", "heart score", "pals", "acls", "atls", "indice de choque",
        "diretriz", "diretrizes", "protocolo clinico", "febrasgo", "sbpt", "gold 2026",
        "trombolise", "alteplase", "tenecteplase", "cetoacidose", "cad", "insulina"
    ]

    termos_infra_mecanica = [
        "lint", "linting", "eslint", "prettier", "sintaxe", "syntax", "formatacao", "formatação",
        "renomear", "renomeacao", "renomeação", "nome de arquivo", "nomes de arquivos", "organizacao de pastas",
        "layout estatico", "layout estático", "teste estatico", "testes estaticos", "teste de layout estatico",
        "typo", "ortografia", "limpeza de codigo", "dead code", "import nao utilizado", "ajuste de import"
    ]

    termos_engenharia_ui = [
        "teclado", "botao", "botoes", "css", "layout", "menu", "menus", "responsivo",
        "fastify", "rpc", "daemon", "cache", "build", "script", "scripts", "npm", "git",
        "pwa", "service worker", "indexeddb", "offline queue", "sincronizacao"
    ]

    eh_clinico = any(re.search(r"(?<!\w)" + re.escape(termo) + r"(?!\w)", norm)
                     for termo in termos_robustez_clinica)
    eh_infra_mecanica = any(re.search(r"(?<!\w)" + re.escape(termo) + r"(?!\w)", norm)
                            for termo in termos_infra_mecanica)
    eh_ui = bool(regex_ui.search(norm))
    eh_eng_ui = any(termo in norm for termo in termos_engenharia_ui)

    # PRECEDÊNCIA CLÍNICA ABSOLUTA
    if eh_clinico:
        return "CLINICO_ROBUSTEZ_PRO", "Robustez de Conteúdo Clínico (Gemini Pro obrigatório; sem rebaixamento por cota)", [
            MAPA_MODELOS["pro"]
        ]

    if eh_infra_mecanica:
        return "INFRA_MECANICA_FLASH_MEDIUM", "Infraestrutura mecânica, sintaxe e layout estático (Gemini Flash Medium)", [
            MAPA_MODELOS["flash-medium"]
        ]

    if eh_eng_ui or eh_ui:
        return "UI_ENGENHARIA_FLASH", "Interface, menus, bot e engenharia (Gemini Flash High)", [
            MAPA_MODELOS["flash"]
        ]

    return "GERAL_FLASH", "Rotinas gerais e otimizações (Gemini Flash High)", [
        MAPA_MODELOS["flash"]
    ]


def classificar_pendencia(pendencia):
    if pendencia.get('engineering'):
        return 'UI_ENGENHARIA_FLASH', 'Escopo de engenharia verificado', [MAPA_MODELOS['flash']]
    return classificar_perfil_tarefa(pendencia.get('task'))


SQUADS_CONFIG = {
    "single": {
        "nome": "Single-Agent Direto (Econômico)",
        "descricao": "Execução direta e enxuta pelo agente principal sem subagentes."
    },
    "direto": {
        "nome": "Single-Agent Direto (Econômico)",
        "descricao": "Execução direta e enxuta pelo agente principal sem subagentes."
    },
    "auto": {
        "nome": "Squad Inteligente Adaptativo",
        "descricao": "Detecta o tipo da tarefa e instancia agentes sob demanda."
    },
    "full": {
        "nome": "Squad Completo de Alta Performance",
        "descricao": "3 subagentes paralelos: Implementador + QA/Testes + Auditor."
    },
    "completo": {
        "nome": "Squad Completo de Alta Performance",
        "descricao": "3 subagentes paralelos: Implementador + QA/Testes + Auditor."
    },
    "rapido": {
        "nome": "Squad Dupla Ágil",
        "descricao": "2 subagentes paralelos: Implementador + QA/Testes."
    },
    "dupla": {
        "nome": "Squad Dupla Ágil",
        "descricao": "2 subagentes paralelos: Implementador + QA/Testes."
    },
    "clinico": {
        "nome": "Squad Máxima Segurança Clínica",
        "descricao": "2 subagentes paralelos: Implementador + Auditor Clínico Rigoroso (Pro)."
    }
}

SUBAGENTES_DISPONIVEIS = {
    "core-dev": {
        "id": "core-dev",
        "role": "Engenheiro de Implementação & Otimização",
        "model_default": "flash",
        "missao": "Codificar a solução diretamente no código-fonte, resolver bugs na raiz e desacoplar módulos."
    },
    "qa-tester": {
        "id": "qa-tester",
        "role": "Engenheiro de QA, Testes e Cobertura",
        "model_default": "flash",
        "missao": "Executar a suíte de testes (npm test / pytest), mapear cenários de borda e implementar testes defensivos."
    },
    "clinical-auditor": {
        "id": "clinical-auditor",
        "role": "Auditor Clínico e de Segurança do Paciente",
        "model_default": "pro",
        "missao": "Auditar com rigor absoluto diretrizes médicas, posologias, fórmulas e tetos terapêuticos."
    },
    "arch-auditor": {
        "id": "arch-auditor",
        "role": "Auditor de Arquitetura e Qualidade Estática",
        "model_default": "flash",
        "missao": "Auditar vazamentos de memória, concorrência assíncrona e manutenibilidade do código."
    }
}


def resolver_squad_agentes(squad_tipo="auto", subagents_custom_str=None, perfil_tarefa=None):
    """Retorna (nome_squad, lista_subagentes) para orquestração concorrente."""
    if subagents_custom_str:
        selecionados = []
        mapa_aliases = {
            "dev": "core-dev", "core": "core-dev", "impl": "core-dev",
            "qa": "qa-tester", "test": "qa-tester", "testes": "qa-tester",
            "clinico": "clinical-auditor", "med": "clinical-auditor", "safety": "clinical-auditor",
            "audit": "clinical-auditor" if (perfil_tarefa == "CLINICO_ROBUSTEZ_PRO") else "arch-auditor",
            "arch": "arch-auditor"
        }
        for item in subagents_custom_str.split(","):
            chave = item.strip().lower()
            ag_id = mapa_aliases.get(chave, chave)
            if ag_id in SUBAGENTES_DISPONIVEIS:
                selecionados.append(dict(SUBAGENTES_DISPONIVEIS[ag_id]))
        if selecionados:
            return "Personalizado", selecionados

    chave = (squad_tipo or "single").lower()

    if chave in ["single", "direto", "solo", "nenhum", "none", "1"]:
        return "Single-Agent Direto", []

    if chave in ["rapido", "fast", "dupla"]:
        return "Dupla Ágil", [
            SUBAGENTES_DISPONIVEIS["core-dev"],
            SUBAGENTES_DISPONIVEIS["qa-tester"]
        ]

    if chave in ["clinico", "medico"]:
        return "Segurança Clínica", [
            SUBAGENTES_DISPONIVEIS["core-dev"],
            SUBAGENTES_DISPONIVEIS["clinical-auditor"]
        ]

    if chave in ["full", "completo"]:
        auditor = SUBAGENTES_DISPONIVEIS["clinical-auditor"] if (perfil_tarefa == "CLINICO_ROBUSTEZ_PRO") else SUBAGENTES_DISPONIVEIS["arch-auditor"]
        return "Squad Completo", [
            SUBAGENTES_DISPONIVEIS["core-dev"],
            SUBAGENTES_DISPONIVEIS["qa-tester"],
            auditor
        ]

    if perfil_tarefa == "CLINICO_ROBUSTEZ_PRO":
        return "Clínico Completo", [
            SUBAGENTES_DISPONIVEIS["core-dev"],
            SUBAGENTES_DISPONIVEIS["qa-tester"],
            SUBAGENTES_DISPONIVEIS["clinical-auditor"]
        ]
    else:
        return "Engenharia Ágil + QA", [
            SUBAGENTES_DISPONIVEIS["core-dev"],
            SUBAGENTES_DISPONIVEIS["qa-tester"]
        ]


def montar_prompt_ciclo(objetivo, nome_squad, lista_agentes, diretriz_kaizen, perfil_tarefa=None, tarefa_ativa=None):
    """Monta o prompt com prefixo estático canônico para Prompt Caching (KV Cache >= 1024 tokens)."""
    cabecalho = obter_cabecalho_estatico_cache()

    bloco_agentes = []
    for ag in (lista_agentes or []):
        mod = ag.get("model_default", "")
        bloco_agentes.append(f"  • Subagente '{ag.get('id', '')}' [Role: '{ag.get('role', '')}', Model: '{mod}']: {ag.get('missao', '')}")
    texto_agentes = "\n".join(bloco_agentes) if bloco_agentes else "  • Execução direta em turno único (Single-Agent - NÃO dispare subagentes via invoke_subagent)."

    eh_clinico = any(a.get("id") == "clinical-auditor" for a in (lista_agentes or [])) or (perfil_tarefa == "CLINICO_ROBUSTEZ_PRO")
    if eh_clinico:
        diretriz_auditor = "- O 'clinical-auditor' (usando Model: 'pro') valida fórmulas, tetos terapêuticos e diretrizes oficiais com rigor clínico absoluto."
    elif lista_agentes:
        diretriz_auditor = "- O auditor faz a checagem estática de arquitetura, concorrência e ausência de memory leaks."
    else:
        diretriz_auditor = "- Execução direta focada e atômica: conclua a tarefa no próprio agente principal em no máximo 25 passos de ferramentas."

    partes_dinamicas = [
        "================================================================================",
        "🎯 ESCOPO DINÂMICO & TAREFA SELECIONADA DESTE CICLO",
        "================================================================================",
        f"Objetivo Geral: {objetivo}",
        f"Squad Alocado: {nome_squad} (Perfil: {perfil_tarefa or 'AUTO'})",
        "Subagentes Ativos para este Ciclo:",
        texto_agentes,
        f"     {diretriz_auditor}"
    ]

    if diretriz_kaizen:
        partes_dinamicas.append(f"\n{diretriz_kaizen}")

    partes_dinamicas.append("\nTarefa selecionada para este ciclo:")
    partes_dinamicas.append(tarefa_ativa or "Identificar uma tarefa concreta no PROGRESS.md antes de editar.")

    return f"{cabecalho}\n\n" + "\n".join(partes_dinamicas) + "\n"


def formatador_etapa_resumido(etapa):
    """Formatador de saída para streaming sem poluição de terminal."""
    total_suites = None
    suites_ok = 0
    eh_teste = "teste" in etapa.lower()

    def emit(linha_bruta):
        nonlocal total_suites, suites_ok
        linha = str(linha_bruta).strip()
        if not linha:
            return

        if eh_teste:
            m_total = re.search(r'\[TESTES\]\s+(\d+)\s+suítes', linha)
            if m_total:
                total_suites = int(m_total.group(1))
                sys.stdout.write(f"\r  🧪 [TESTES] Executando: 0/{total_suites} suítes...   ")
                sys.stdout.flush()
                return

            if linha.startswith("[OK]") or linha.startswith("ok "):
                suites_ok += 1
                nome_suite = ""
                m_nome = re.search(r'\[OK\]\s+tests/([^:]+)', linha)
                if m_nome:
                    nome_suite = m_nome.group(1)
                    if len(nome_suite) > 28:
                        nome_suite = nome_suite[:25] + "..."
                total_str = f"/{total_suites}" if total_suites else ""
                sys.stdout.write(f"\r  🧪 [TESTES] Progresso: {suites_ok}{total_str} concluídas ({nome_suite})    ")
                sys.stdout.flush()
                return

            if linha.startswith("[TESTES]") and "aprovadas" in linha:
                sys.stdout.write("\r\033[K")
                m_res = re.search(r'\[TESTES\]\s+(\d+/\d+\s+aprovadas;\s+[\d\.]+s)', linha)
                res_str = m_res.group(1) if m_res else linha.replace("[TESTES]", "").strip()
                print(f"  🧪 [TESTES] {CORES.get('green', '')}✅ {res_str}{CORES.get('reset', '')}", flush=True)
                return

            if any(k in linha for k in ["[FALHA]", "FAIL", "Error:", "AssertionError", "SyntaxError"]) or (linha.startswith("[TESTES]") and ("falha" in linha.lower() or "reprov" in linha.lower())):
                sys.stdout.write("\r\033[K")
                print(f"  ❌ {CORES.get('red', '')}{linha}{CORES.get('reset', '')}", flush=True)
                return

            if "Bateria completa já aprovada" in linha:
                sys.stdout.write("\r\033[K")
                print("  🧪 [TESTES] ⚡ Bateria já aprovada para este código estável.", flush=True)
                return

            if "[PROGRESSO]" in linha and "Testes ativos:" in linha:
                return
            return

        if "build" in etapa.lower():
            if "sucesso" in linha.lower() or "ok" in linha.lower():
                print(f"  📦 [BUILD] ✅ {linha}", flush=True)
            elif "erro" in linha.lower() or "falha" in linha.lower():
                print(f"  ❌ {CORES.get('red', '')}[BUILD] {linha}{CORES.get('reset', '')}", flush=True)
            return

        if not any(ign in linha for ign in ["DEBUG:", "Traceback", "ConnectionResetError"]):
            print(f"  [{etapa}] {linha}", flush=True)

    return emit


def executar_etapa(cmd, etapa, timeout=None, **kwargs):
    """Executa subprocesso com supervisão e streaming sem buffer mudo."""
    fn_run = _get_autoloop_delegate("run_observed", run_observed)
    handler = formatador_etapa_resumido(etapa)
    return fn_run(
        cmd, stage=etapa, timeout=timeout, emit=handler,
        on_start=_registrar_processo_ativo, **kwargs
    )


def obter_proximo_alvo(modelos, aguardar_se_bloqueado=True):
    """Quality-First com Rotação Round-Robin entre contas em 0ms."""
    global indice_conta_atual, bloqueios
    # Sincroniza ponteiros se autoloop foi monkeypatched
    mod = sys.modules.get("autoloop") or sys.modules.get("autoloop_quota_test")
    if mod and hasattr(mod, "indice_conta_atual"):
        indice_conta_atual = mod.indice_conta_atual
    if mod and hasattr(mod, "bloqueios"):
        bloqueios = mod.bloqueios

    fn_contas = _get_autoloop_delegate("obter_contas_disponiveis", obter_contas_disponiveis)
    contas = fn_contas()
    if not contas:
        sys.exit(1)

    agora = datetime.now()
    total_contas = len(contas)
    if indice_conta_atual not in contas:
        indice_conta_atual = contas[0]

    inicio_idx = contas.index(indice_conta_atual)

    bloqueios_expirados = [k for k, v in list(bloqueios.items()) if v and agora >= v]
    for k in bloqueios_expirados:
        bloqueios.pop(k, None)

    fn_resolver = _get_autoloop_delegate("resolver_modelo_para_conta", resolver_modelo_para_conta)

    for nome_modelo_generico, id_modelo_generico in modelos:
        for i in range(total_contas):
            c_idx = (inicio_idx + i) % total_contas
            conta_candidata = contas[c_idx]

            nome_modelo_real, id_modelo_real = fn_resolver(id_modelo_generico, conta_candidata)

            chave = (conta_candidata, id_modelo_real)
            liberacao = bloqueios.get(chave)
            if liberacao is None or agora >= liberacao:
                indice_conta_atual = contas[(c_idx + 1) % total_contas]
                if mod and hasattr(mod, "indice_conta_atual"):
                    mod.indice_conta_atual = indice_conta_atual
                return conta_candidata, nome_modelo_real, id_modelo_real

    if not aguardar_se_bloqueado:
        return None

    horarios_bloqueio = [t for t in bloqueios.values() if t and t > agora]
    if horarios_bloqueio:
        menor_liberacao = min(horarios_bloqueio)
        segundos_espera = max(15, int((menor_liberacao - agora).total_seconds()))
    else:
        segundos_espera = 60

    espera_ciclo = min(segundos_espera, 90)
    fn_sleep = _get_autoloop_delegate("observed_sleep", observed_sleep)
    fn_sleep(espera_ciclo, 'cota')
    return None


def projeto_concluido(root: Path = Path(".")):
    progress_file = Path(root) / "PROGRESS.md"
    if progress_file.is_file():
        try:
            conteudo = progress_file.read_text(encoding="utf-8")
            if "STATUS: CONCLUIDO" in conteudo or "STATUS: FINALIZADO" in conteudo:
                return True
        except Exception:
            pass
    return False


class ExecutionEngine:
    """Fachada unificada para Roteamento e Execução."""

    def __init__(self, root: Optional[Path] = None):
        self.root = Path(root).resolve() if root else Path(".").resolve()

    def route(
        self,
        task: TaskItem,
        squad_mode: str = "single",
        subagents_custom: Optional[str] = None
    ) -> Tuple[RoutingDecision, str, List[Dict[str, Any]]]:
        """Calcula a decisão de roteamento e aloca o squad para a tarefa."""
        perfil, desc, modelos = classificar_perfil_tarefa(task.text)
        nome_squad, lista_agentes = resolver_squad_agentes(
            squad_tipo=squad_mode,
            subagents_custom_str=subagents_custom,
            perfil_tarefa=perfil
        )
        alvo = obter_proximo_alvo(modelos, aguardar_se_bloqueado=False)
        if not alvo:
            return RoutingDecision(
                model_name=modelos[0][0],
                model_id=modelos[0][1],
                account_number=1,
                account_email="",
                effort="high",
                tier=perfil,
                justification=desc,
                is_quota_exhausted=True
            ), nome_squad, lista_agentes

        num_conta, nome_mod, id_mod = alvo
        return RoutingDecision(
            model_name=nome_mod,
            model_id=id_mod,
            account_number=num_conta,
            account_email="",
            effort="high",
            tier=perfil,
            justification=desc,
            is_quota_exhausted=False
        ), nome_squad, lista_agentes

    def execute_cycle(
        self, task: TaskItem, decision: RoutingDecision, squad_name: str,
        agents: List[Dict[str, Any]], goal: str, forever: bool = True,
        max_steps: Optional[int] = None, module_ctx: Any = None
    ) -> ExecutionOutcome:
        """Executa um ciclo do engine delegando ao CycleRunner."""
        from cycle_runner import CycleRunner
        return CycleRunner(self.root).execute_cycle(
            task=task, decision=decision, squad_name=squad_name, agents=agents,
            goal=goal, forever=forever, max_steps=max_steps, module_ctx=module_ctx
        )

    def print_status(self, models: Optional[List[Tuple[str, str]]] = None, module_ctx: Any = None) -> None:
        """Exibe o status de cotas e contas delegando ao CycleRunner."""
        from cycle_runner import cmd_status
        cmd_status(modelos=models, _module_ctx=module_ctx)


# Re-exportações de compatibilidade para a máquina de estados do ciclo
from cycle_runner import CycleRunner, executar_ciclo, cmd_status, executar_orquestracao_tarefas


