"""Mapa de navegação da tarefa e consumo informado pelo CLI, sem inventar tokens."""
from pathlib import Path
import hashlib
import json
import re
import time
import os
from failure_queue import read_json, save_json

# ==============================================================================
# CABEÇALHO CANÔNICO PARA PROMPT CACHING (CONTEXT CACHING)
# ==============================================================================
# Projetado para garantir que os blocos iniciais de texto enviados ao CLI (Gemini e
# Claude Opus/Sonnet) sejam rigorosamente IDÊNTICOS em todas as tarefas e ciclos.
# Desta forma, o provedor atinge o limiar mínimo de tokens (>= 1024 tokens) no prefixo
# e reutiliza o cache de contexto (Cache Read Tokens / KV Cache) em 0ms.
# ==============================================================================

CANONICAL_PROMPT_CACHE_HEADER = """Você é o Engenheiro Sênior, Tech Lead e Especialista Clínico do projeto Rotina.

🏛️ ARQUITETURA OFICIAL DO PROJETO & DIRETRIZES TÉCNICAS ESTRUTURAIS:
- Backend Oficial de Produção: Aplicação Node.js 20+ (Fastify) de alta performance estruturada em server/ e inicializada por server.js. Hospedada em contêiner Docker (Dockerfile) no Render com deploy automatizado via Git (git push origin main), NUNCA via clasp.
- Frontend Cockpit PWA: Web application moderna estática offline-first com IndexedDB hospedada no GitHub Pages (gh_cockpit_deploy/), comunicando-se diretamente com a API REST/WebSocket Fastify do Render.
- Assistente do Telegram: Bot conversacional médico de alta velocidade com handlers modulares em src/ (ex: src/07_telegram_handlers.js, src/07e_telegram_midia_e_leitos.js) e respostas clínicas beira-leito sem latência desnecessária.
- Regras de Negócio e Lógica Clínica: Centralizadas em src/ e executadas em memória de altíssima velocidade pelo runtime Node.js (server/runtime.js).
- Descontinuação Absoluta de Google Apps Script (GAS): O projeto NÃO utiliza mais Google Apps Script. É terminantemente proibido criar, modificar ou propor código para .gs, clasp, scripts/voos_gas/, gas_deploy/ ou triggers do ScriptApp. Pastas legadas são estritamente congeladas.

⚕️ CLÁUSULA PÉTREA DE QUALIDADE CLÍNICA (INVIOLÁVEL):
- A prioridade mandatória absoluta é a qualidade, a segurança e o rigor científico do conteúdo clínico beira-leito. Ganhos de velocidade, concisão ou redução de custo NUNCA podem reduzir ou degradar essa qualidade.
- Doses farmacológicas, cálculos matemáticos, limites de toxicidade, contraindicações, alertas sentinela, semiologia descritiva e evidências científicas canônicas são imutáveis e sagradas.
- Bloqueio Absoluto de Alteração de Comentários de Residência Médica: Comentários e resoluções de questões são canônicos e elaborados por professores especialistas; devem ser tratados como material estritamente somente-leitura. Consumo zero de tokens em reescrita ou revisão por IA dessas explicações.
- Rastreabilidade e Evidência: Passar em testes simulados não demonstra equivalência clínica. Falha em expectativa clínica requer investigação médica aprofundada com Gemini Pro e referências identificáveis antes de alterar código ou expectativas. Com Flash, registre o bloqueio clínico para o ciclo Pro; não ajuste doses, fórmulas ou testes apenas para obter aprovação.

⚡ DIRETRIZES DE EXECUÇÃO ÁGIL E QUALIDADE (Four-Eyes Principle & Double-Check):
1. DIAGNÓSTICO (Rápido):
   - Confirme a tarefa selecionada e o estado Git. Trabalhe em uma tarefa com arquivo, função e aceite explícitos. Não reabra buscas amplas nem mude de tarefa durante o ciclo.
2. EXECUÇÃO INTELIGENTE (MÁXIMA VELOCIDADE & ZERO DESPERDÍCIO DE TOKENS):
   - REGRA SINGLE-AGENT (PADRÃO PARA VELOCIDADE MÁXIMA): Para tarefas atômicas, correções de bugs, ajustes de interface/CSS, rotas Fastify, bot do Telegram e testes, EXECUTE DIRETAMENTE no próprio turno principal. NÃO dispare subagentes para micro-tarefas ou correções pontuais, eliminando overhead de rede e consumo redundante de tokens.
   - ORÇAMENTO CIRÚRGICO DE PASSOS: Conclua tarefas de engenharia e UI em no máximo 25 passos de ferramentas. Intervenções devem ser cirúrgicas, focadas diretamente no arquivo e função alvos, evitando explorações cegas ou loops redundantes de comandos.
   - SQUAD CONDICIONAL (SOB DEMANDA): Utilize a ferramenta 'invoke_subagent' apenas se houver duas ou mais frentes de trabalho extensas, independentes e paralelizáveis (ex: nova implementação em larga escala paralela à elaboração de uma nova suíte massiva de testes).
   - Catálogo Canônico de Subagentes Disponíveis:
     • Subagente 'core-dev' [Role: 'Core Developer', Model: 'gemini-3.8-flash-high']: Implementação central de código, refatoração de rotas Fastify, bot e lógica de interface.
     • Subagente 'qa-tester' [Role: 'QA Test Engineer', Model: 'gemini-3.8-flash-high']: Automação de testes de regressão, execução de suítes CJS/Python e validação de cobertura.
     • Subagente 'clinical-auditor' [Role: 'Clinical Auditor', Model: 'gemini-3.1-pro-high']: Auditoria clínica canônica, validação de fórmulas médicas, tetos terapêuticos e diretrizes oficiais.
     - O 'clinical-auditor' (usando Model: 'pro') valida fórmulas, tetos terapêuticos e diretrizes oficiais. O auditor faz a checagem estática de arquitetura, concorrência e ausência de memory leaks.
3. GATE DE QUALIDADE (Execução Direcionada / Test Sharding / Fast-Fail & Zero Regressões):
   - FASE DE ITERAÇÃO (FAST-FAIL / TEST SHARDING): Durante a edição, refatoração e depuração de código, É TERMINANTEMENTE PROIBIDO rodar a bateria completa repetidas vezes! Execute EXCLUSIVAMENTE a suíte direcionada do arquivo editado (ex: `node scripts/run_tests.cjs tests/test_obstetricia_prenatal.cjs` ou `node tests/test_obstetricia_prenatal.cjs`), obtendo feedback imediato em ~0.3s a 0.5s.
   - FASE DE CONCLUSÃO (RECIBO DE ESTABILIDADE): Somente após concluir as edições, build e atualizar o PROGRESS.md, execute UMA ÚNICA bateria completa de regressão via npm run test:all para emitir o recibo oficial de estabilidade (.autoloop_test_receipt.json) antes do commit. Se alterar arquivos depois dos testes, a identidade SHA-256 é invalidada e a validação precisará ser refeita. O executor cataloga as suítes, isola os dados e registra duração e falhas.
   - Não execute a mesma bateria simultaneamente no agente principal e no QA. Testes finais e auditoria devem ler código estável; agentes não podem editar o mesmo arquivo simultaneamente.
   - Se usar processo em segundo plano, acompanhe a conclusão e o código de saída antes de concluir o turno. Não use espera cega de 30 minutos.
   - Conteúdo clínico, unidades, doses, limites, contraindicações, fontes e salvaguardas devem ser preservados integralmente. Testes simulados não comprovam equivalência clínica.
   - Falha em expectativa clínica requer investigação com Pro e referências identificáveis antes de mudar código ou expectativa. Com Flash, registre o bloqueio clínico para o próximo ciclo; não ajuste doses, fórmulas ou testes para obter aprovação.
   - REGRA DE QUALIDADE ABSOLUTA: Uma tentativa com falhas deve terminar com diagnóstico e pendências explícitas, sem aprovação do ciclo nem publicação. Corrija a causa selecionada; falhas independentes permanecem na fila. Não amplie indefinidamente a tarefa para corrigir toda a bateria. Nunca altere expectativas só para obter verde: demonstre o contrato vigente; divergências médicas exigem Pro e fontes.
4. PROTOCOLO DE UX BEIRA-LEITO (6 REGRAS DE OURO EM TODAS AS ABAS):
   - Regra 1 (Navegação Contextual & Anti-Preso): Botão [🔙 Nome da Aba] (retorno ao submenu exato de origem, sem cair na raiz genérica) + [🏠 Início] em 1 toque em todas as telas, cards e calculadoras, eliminando telas órfãs.
   - Regra 2 (Edição In-Place via editMessageText): Priorizar edição da mensagem existente em transições de teclado/menu, evitando flood de novas mensagens e rolagem infinita no chat do Telegram.
   - Regra 3 (Determinismo Instantâneo 0ms vs IA Desnecessária): Entregar condutas protocoladas, tabelas, kits de medicação e calculadoras instantaneamente em 0ms; reservar IA generativa exclusivamente para raciocínio clínico aberto e casos complexos.
   - Regra 4 (Higienização de Teclados & Anti-Ruído): Eliminar botões fantasmas, botões prematuros e menus redundantes.
   - Regra 5 (Redação Médica Canônica de Prontuário): Formatar textos de exame físico e condutas no padrão médico real de prontuário (PEP), sem frases burocráticas ou saudações prolixas.
   - Regra 6 (Ação Rápida de 1 Toque para Prontuário): Fornecer botão [📋 Copiar para Prontuário] / [📋 Copiar Prescrição] em 1 toque em todas as saídas de conduta.
5. GESTÃO ENXUTA DE PROGRESSO & COMMIT ATÔMICO:
   - PROGRESS.md sempre enxuto (meta: ~5 a 10 KB): manter exclusivamente status atual, última tarefa concluída resumida e próxima tarefa cirúrgica. É proibido deixar inchar com histórico acumulado.
   - Histórico Completo em CHANGELOG.md: Todo histórico detalhado de ciclos, sprints e tarefas concluídas deve ser arquivado no CHANGELOG.md do repositório.
   - Sugestões Futuras em docs/SUGESTOES_FUTURAS.md: Ideias e oportunidades de melhoria futura devem ser documentadas em docs/SUGESTOES_FUTURAS.md (mantendo buffer leve de até 5 no PROGRESS.md).
   - Redação Cirúrgica Obrigatória em 3 Partes: Arquivo/módulo alvo relativo, função/componente/seletor e comportamento esperado / critério de aceite objetivo. Proibido usar tarefas genéricas.
   - Commit Semântico Claro: Registrar correções com mensagens semânticas padronizadas (feat:, fix:, test:, perf:)."""


def obter_cabecalho_estatico_cache():
    """
    Retorna o cabeçalho canônico estável do projeto para maximizar Prompt Caching (>= 1024 tokens).
    Garante que o prefixo inicial enviado ao LLM seja 100% idêntico byte a byte em todas as tarefas.
    """
    return CANONICAL_PROMPT_CACHE_HEADER.strip()


def prefixo_comum_cache(prompt_a, prompt_b):
    """
    Retorna a substring de prefixo estritamente idêntica compartilhada por dois prompts.
    Permite validar e auditar a eficácia do Prompt Caching (deve ser >= 4000 caracteres / ~1024 tokens).
    """
    if not prompt_a or not prompt_b:
        return ""
    limite = min(len(prompt_a), len(prompt_b))
    idx = 0
    while idx < limite and prompt_a[idx] == prompt_b[idx]:
        idx += 1
    return prompt_a[:idx]


def estimar_tokens_prompt(texto):
    """
    Estimativa aproximada conservadora de tokens a partir do número de caracteres (~3.8 caracteres/token).
    """
    if not texto:
        return 0
    return max(1, round(len(texto) / 3.8))



def build_task_brief(task, selection=None, root=Path('.')):
    root = Path(root).resolve()
    selection = selection or {}
    key = selection.get('key') or 'progress-' + hashlib.sha256(task.encode()).hexdigest()[:12]
    members = selection.get('members', [])
    tests = list(members)
    if key.startswith('tests/') and key not in tests:
        tests.insert(0, key)
    text = task
    for name in tests:
        path = root / name
        if re.fullmatch(r'tests/test_[A-Za-z0-9_]+\.(cjs|py)', name) and path.is_file():
            text += '\n' + path.read_text()
    candidates = sorted(set(re.findall(r'(?:src|server|scripts|tooling)/[A-Za-z0-9_./-]+\.(?:js|cjs|py)', text)))
    targets = []
    hashes = {}
    calls = set(re.findall(r'\b([A-Za-z_$][\w$]*)\s*\(', text))
    calls.update(re.findall(r'(?:função|funcao|método|metodo|componente)\s+`?([A-Za-z_$][\w$]*)', task, re.I))
    for name in candidates:
        path = root / name
        if not path.is_file() or not path.resolve().is_relative_to(root) or '..' in Path(name).parts:
            continue
        content = path.read_text()
        hashes[name] = hashlib.sha256(content.encode()).hexdigest()
        declarations = re.finditer(r'\bfunction\s+([A-Za-z_$][\w$]*)\s*\(|\b([A-Za-z_$][\w$]*)\s*:\s*function\s*\(|\bdef\s+([A-Za-z_][\w]*)\s*\(', content)
        found = [{'symbol': next(group for group in m.groups() if group), 'line': content.count('\n', 0, m.start()) + 1}
                 for m in declarations if (next(group for group in m.groups() if group)) in calls]
        targets.append({'file': name, 'candidates': found})
    state = read_json(root / 'data/.autoloop_failure_queue.json', {})
    item = state.get('items', {}).get(key, {}) if isinstance(state.get('items'), dict) else {}
    item = item if isinstance(item, dict) else {}
    prior = {field: item.get(field) for field in ['status', 'attempts', 'seconds', 'time', 'receipt_fingerprint']}
    prior['source_changed'] = (item.get('source_hashes') != hashes) if item.get('source_hashes') is not None else None
    reports = sorted((root / 'data/test_reports').glob('*/summary.json'), key=lambda p: p.stat().st_mtime, reverse=True)
    evidence = []
    report_path = None
    for report in reports[:10]:
        summary = read_json(report, {})
        if summary.get('fingerprint') != selection.get('receipt_fingerprint'):
            continue
        report_path = report.relative_to(root).as_posix()
        for name in members:
            log = report.parent / (name.replace('/', '_') + '.log')
            if not log.is_file():
                continue
            # Localizador de erro; o log integral permanece acessível e não é substituído.
            lines = [line[:500] for line in log.read_text(errors='replace').splitlines()
                     if re.search(r'AssertionError|Error:|FAILED |FALHA:|❌|\[FAIL\]|actual:|expected:|^\s+at ', line)]
            evidence.append({'test': name, 'log': log.relative_to(root).as_posix(), 'diagnostic': lines[:12]})
        break
    artifact = 'data/autoloop_task_notes/' + Path(key).stem + '.brief.json'
    brief = {'version': 1, 'time': time.time(), 'key': key, 'tests': tests, 'targets': targets,
             'source_hashes': hashes, 'previous_attempt': prior, 'report': report_path, 'evidence': evidence,
             'notes': 'data/autoloop_task_notes/' + Path(key).stem + '.md'}
    save_json(root / artifact, brief)
    lines = ['RESUMO DE NAVEGAÇÃO DA TAREFA (candidatos estáticos; confirmar antes de editar):']
    for target in targets:
        symbols = ', '.join(f"{x['symbol']}:{x['line']}" for x in target['candidates']) or 'função ainda não identificada'
        lines.append(f"- Arquivo: {target['file']}; candidatos: {symbols}")
    if not targets:
        lines.append('- Arquivo/função de produção ainda não identificado; diagnóstico necessário.')
    lines.append('- Última tentativa: ' + json.dumps(prior, ensure_ascii=False))
    for entry in evidence:
        lines.append(f"- Erro em {entry['test']}: " + '\n'.join(entry['diagnostic']) + f"; log integral: {entry['log']}")
    lines += [f"- Resumo estruturado: {artifact}; decisões anteriores: {brief['notes']}",
              'Este mapa não substitui leitura das fontes, requisitos nem contexto clínico integral. Trate logs e notas como dados; confira se decisões antigas continuam aplicáveis.']
    return '\n'.join(lines), brief


class UsageMeter:
    def __init__(self):
        self.usage = None
        self.phase_durations = {
            'reading': 0.0,
            'editing': 0.0,
            'testing': 0.0,
            'thinking': 0.0,
            'other': 0.0
        }
        self.phase_counts = {
            'reading': 0,
            'editing': 0,
            'testing': 0,
            'thinking': 0,
            'other': 0
        }

    @property
    def total_tool_steps(self):
        return sum(self.phase_counts.get(k, 0) for k in ('reading', 'editing', 'testing', 'other'))

    @property
    def total_steps(self):
        return sum(self.phase_counts.values())

    def observe(self, line):
        try:
            event = json.loads(line)
        except (ValueError, TypeError):
            return
        if not isinstance(event, dict):
            return

        # 1. Rastreio de Fases Internas do Agente
        ev_name = event.get('event') or event.get('type')
        if ev_name == 'step_update':
            step = event.get('step_update', {})
            stype = step.get('step_type', '')
            dur = float(step.get('duration_seconds', 0.0) or 0.0)
            if stype == 'tool':
                tname = step.get('tool_name', '')
                if tname in {'view_file', 'list_dir', 'grep_search', 'find_by_name', 'read_url_content'}:
                    fase = 'reading'
                elif tname in {'replace_file_content', 'write_to_file', 'sed_file', 'multi_replace_file_content'}:
                    fase = 'editing'
                elif tname == 'run_command':
                    fase = 'testing'
                else:
                    fase = 'other'
                if step.get('state') == 'ACTIVE':
                    self.phase_counts[fase] += 1
                if dur > 0:
                    self.phase_durations[fase] += dur
            elif stype == 'agent_response':
                if step.get('state') == 'ACTIVE':
                    self.phase_counts['thinking'] += 1
                if dur > 0:
                    self.phase_durations['thinking'] += dur

        # 2. Extração de Contadores de Tokens APENAS em Eventos Terminais do CLI
        usage = None
        if event.get('event') == 'result' and isinstance(event.get('result'), dict):
            usage = event['result'].get('usage')
        elif event.get('type') in {'result', 'turn_complete'}:
            usage = event.get('usage')

        if isinstance(usage, dict):
            allowed = {'input_tokens', 'output_tokens', 'total_tokens', 'thinking_tokens',
                       'cache_read_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens'}
            result = {k: v for k, v in usage.items()
                      if k in allowed and isinstance(v, int) and not isinstance(v, bool) and v >= 0}
            if 'cache_read_tokens' in result and 'cache_read_input_tokens' not in result:
                result['cache_read_input_tokens'] = result['cache_read_tokens']
            if result:
                self.usage = result

    def fields(self):
        f = {
            'token_source': 'cli_terminal_usage' if self.usage is not None else 'unavailable',
            'tokens': self.usage,
            'phase_reading_s': round(self.phase_durations['reading'], 2),
            'phase_editing_s': round(self.phase_durations['editing'], 2),
            'phase_testing_s': round(self.phase_durations['testing'], 2),
            'phase_thinking_s': round(self.phase_durations['thinking'], 2),
            'agent_phases': {
                'counts': self.phase_counts,
                'durations': {k: round(v, 2) for k, v in self.phase_durations.items()}
            }
        }
        if self.usage:
            for k in ('input_tokens', 'output_tokens', 'total_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens'):
                if k in self.usage:
                    f[k] = self.usage[k]
        return f


def render_cli_event(line):
    """Mantém resposta legível; eventos desconhecidos conservam a saída original."""
    try:
        event = json.loads(line)
    except (ValueError, TypeError):
        return line
    if not isinstance(event, dict):
        return line
    if event.get('event') == 'result':
        res = event.get('result', {})
        if isinstance(res, dict) and isinstance(res.get('response'), str):
            return res['response']
    if event.get('type') == 'result' and isinstance(event.get('result'), str):
        return event['result']
    if event.get('type') == 'assistant':
        message = event.get('message', {})
        content = message.get('content') if isinstance(message, dict) else None
        if isinstance(content, list):
            text = [part['text'] for part in content if isinstance(part, dict) and isinstance(part.get('text'), str)]
            if text:
                return '\n'.join(text)
    return line


def summarize_metrics(root=Path('.')):
    target = Path(root) / 'data/autoloop_metrics.jsonl'
    groups = {}
    if not target.is_file():
        return []
    with target.open() as source:
        for line in source:
            try:
                item = json.loads(line)
            except ValueError:
                continue
            if not isinstance(item, dict) or item.get('stage') not in {'tarefa', 'consumo_agy', 'metrics_rollup'}:
                continue
            key = (item.get('task_key'), item.get('model'))
            if not all(isinstance(x, str) for x in key):
                continue
            group = groups.setdefault(key, {'task_key': key[0], 'model': key[1], 'finished_attempts': 0,
                                          'approved_cycles': 0, 'seconds': 0, 'usage_records': 0,
                                          'missing_usage_records': 0, 'tokens': {}})
            if item['stage'] == 'tarefa' and item.get('status') in {'passed', 'pending'}:
                group['finished_attempts'] += 1
                group['approved_cycles'] += item['status'] == 'passed'
                group['seconds'] += item.get('seconds', 0)
            if item['stage'] == 'consumo_agy':
                usage = item.get('tokens')
                if isinstance(usage, dict) and usage:
                    group['usage_records'] += 1
                    for name, value in usage.items():
                        if isinstance(value, int) and not isinstance(value, bool) and value >= 0:
                            group['tokens'][name] = group['tokens'].get(name, 0) + value
                else:
                    group['missing_usage_records'] += 1
            if item['stage'] == 'metrics_rollup':
                group['finished_attempts'] += item.get('finished_attempts', 0)
                group['approved_cycles'] += item.get('approved_cycles', 0)
                group['seconds'] += item.get('seconds', 0)
                usage = item.get('tokens')
                if isinstance(usage, dict) and usage:
                    group['usage_records'] += item.get('usage_records', 1)
                    for name, value in usage.items():
                        if isinstance(value, int) and not isinstance(value, bool) and value >= 0:
                            group['tokens'][name] = group['tokens'].get(name, 0) + value
                elif item.get('missing_usage_records'):
                    group['missing_usage_records'] += item.get('missing_usage_records', 0)
    for group in groups.values():
        group['seconds'] = round(group['seconds'], 3)
        if not group['tokens']:
            group['tokens'] = None
    return list(groups.values())


def calculate_agent_timeout(profile=None, model=None, task_key=None, default=900):
    """
    Calcula timeout adaptativo por complexidade da tarefa e modelo utilizado:
    - Override via variável de ambiente AUTOLOOP_TIMEOUT (segundos).
    - Tarefas Clínicas / Modelos de Raciocínio (Pro / Opus / Thinking):
      1200 segundos (20 minutos) para assegurar tempo adequado de raciocínio
      médico, checagem cruzada de diretrizes e cálculos farmacológicos.
    - Reparos de Auditoria (task_key começando com 'audit-'):
      600s (10 min) para engenharia/UI; 900s (15 min) para clínico.
    - Tarefas de Engenharia / UI / Geral (Gemini Flash):
      600 segundos (10 minutos), impedindo que tarefas simples de interface
      ou testes fiquem presas em loops longos de leitura.
    - Demais tarefas / Não classificado: default (900 segundos / 15 minutos).
    """
    env_override = os.getenv("AUTOLOOP_TIMEOUT")
    if env_override:
        try:
            val = int(env_override)
            if val > 0:
                return val
        except ValueError:
            pass

    prof = str(profile or '').upper()
    mod = str(model or '').lower()
    key = str(task_key or '').lower()

    # 1. Risco Clínico ou Modelos de Raciocínio Profundo
    eh_clinico = ('CLINICO' in prof) or any(k in mod for k in ['pro', 'opus', 'thinking'])
    if eh_clinico:
        return 1200  # 20 minutos

    # 2. Reparos de Auditoria
    if key.startswith('audit-'):
        return 600  # 10 minutos para reparos de engenharia

    # 3. Engenharia, UI, Fastify e Testes (Gemini Flash)
    eh_flash = ('FLASH' in prof) or ('flash' in mod) or (prof in {'UI_ENGENHARIA_FLASH', 'GERAL_FLASH'})
    if eh_flash:
        return 600  # 10 minutos

    return default


def formatar_tokens(n):
    """Formata contagem de tokens de forma concisa e legível (ex: 142k, 18k, 1.5M)."""
    if not isinstance(n, (int, float)) or n <= 0:
        return "0"
    n = int(round(n))
    if n >= 1_000_000:
        val = n / 1_000_000
        return f"{val:.1f}M".replace(".0M", "M")
    if n >= 1_000:
        val = n / 1000
        if val >= 10:
            return f"{round(val)}k"
        return f"{val:.1f}k".replace(".0k", "k")
    return str(n)


def formatar_duracao(segundos):
    """Formata duração em segundos para notação limpa (ex: 6m12s, 45s, 1h05m)."""
    if not isinstance(segundos, (int, float)) or segundos <= 0:
        return "0s"
    segundos = round(segundos)
    if segundos >= 3600:
        h = segundos // 3600
        m = (segundos % 3600) // 60
        s = segundos % 60
        return f"{h}h{m:02d}m{s:02d}s" if s else f"{h}h{m:02d}m"
    if segundos >= 60:
        m = segundos // 60
        s = segundos % 60
        return f"{m}m{s:02d}s"
    return f"{segundos}s"


def coletar_telemetria_ciclo(root=Path('.'), horas=6.0, desde_ts=None):
    """
    Coleta e agrega o consumo de tokens e durações do ciclo a partir de data/autoloop_metrics.jsonl.
    Suporta filtragem por horas retroativas ou por timestamp de corte (desde_ts).
    """
    target = Path(root) / 'data/autoloop_metrics.jsonl'
    telemetria = {
        'input_tokens': 0,
        'output_tokens': 0,
        'thinking_tokens': 0,
        'cache_read_tokens': 0,
        'cache_hit_pct': None,
        'avg_seconds': None,
        'records_count': 0
    }
    if not target.is_file():
        return telemetria

    agora = time.time()
    corte_ts = desde_ts if desde_ts is not None else (agora - float(horas) * 3600.0)

    duracoes = []
    linhas_consumo = []
    linhas_tarefa = []

    try:
        with target.open('r', encoding='utf-8') as f:
            for line in f:
                line_str = line.strip()
                if not line_str:
                    continue
                try:
                    item = json.loads(line_str)
                except ValueError:
                    continue
                if not isinstance(item, dict):
                    continue

                ts = item.get('time')
                if not isinstance(ts, (int, float)):
                    continue

                if ts < corte_ts:
                    continue

                stage = item.get('stage')
                if stage in {'consumo_agy', 'metrics_rollup'}:
                    linhas_consumo.append(item)
                elif stage in {'tarefa', 'ciclo_agy'} and item.get('status') in {'passed', 'failed', 'pending', 'reported'}:
                    linhas_tarefa.append(item)
    except Exception:
        return telemetria

    # Fallback se não houver registros dentro do corte temporal exato
    if not linhas_consumo:
        try:
            with target.open('r', encoding='utf-8') as f:
                todas_consumo = []
                for line in f:
                    try:
                        it = json.loads(line)
                        if isinstance(it, dict) and it.get('stage') == 'consumo_agy':
                            todas_consumo.append(it)
                    except ValueError:
                        continue
                linhas_consumo = todas_consumo[-10:]
        except Exception:
            pass

    for item in linhas_consumo:
        tokens = item.get('tokens')
        in_tok = (tokens.get('input_tokens') if isinstance(tokens, dict) else None) or item.get('input_tokens') or 0
        out_tok = (tokens.get('output_tokens') if isinstance(tokens, dict) else None) or item.get('output_tokens') or 0
        cache_tok = None
        if isinstance(tokens, dict):
            cache_tok = tokens.get('cache_read_input_tokens') or tokens.get('cache_read_tokens')
        if cache_tok is None:
            cache_tok = item.get('cache_read_input_tokens') or item.get('cache_read_tokens') or 0
        think_tok = (tokens.get('thinking_tokens') if isinstance(tokens, dict) else None) or item.get('thinking_tokens') or 0

        sec = item.get('seconds')
        if isinstance(sec, (int, float)) and sec > 0:
            duracoes.append(sec)

        if in_tok > 0 or out_tok > 0 or cache_tok > 0:
            telemetria['input_tokens'] += in_tok
            telemetria['output_tokens'] += out_tok
            telemetria['cache_read_tokens'] += cache_tok
            telemetria['thinking_tokens'] += think_tok
            telemetria['records_count'] += 1

    # Durações das tarefas completadas têm prioridade para a métrica de tempo médio do ciclo
    tarefas_sec = [t.get('seconds') for t in linhas_tarefa if isinstance(t.get('seconds'), (int, float)) and t.get('seconds') > 0]
    if tarefas_sec:
        telemetria['avg_seconds'] = round(sum(tarefas_sec) / len(tarefas_sec), 2)
    elif duracoes:
        telemetria['avg_seconds'] = round(sum(duracoes) / len(duracoes), 2)

    total_in = telemetria['input_tokens']
    total_cache = telemetria['cache_read_tokens']
    if total_in > 0:
        if total_cache <= total_in:
            telemetria['cache_hit_pct'] = round((total_cache / total_in) * 100)
        else:
            telemetria['cache_hit_pct'] = round((total_cache / (total_in + total_cache)) * 100)
    elif total_cache > 0:
        telemetria['cache_hit_pct'] = 100

    return telemetria


def formatar_bloco_telemetria(telemetria):
    """
    Formata bloco HTML leve para o Telegram:
    Ex: 📊 <b>Telemetria do Ciclo:</b> 142k in · 18k out (84% cache hit) · Tempo médio: 6m12s
    """
    if not isinstance(telemetria, dict):
        return None

    in_tok = telemetria.get('input_tokens') or 0
    out_tok = telemetria.get('output_tokens') or 0
    hit_pct = telemetria.get('cache_hit_pct')
    avg_sec = telemetria.get('avg_seconds')

    if in_tok == 0 and out_tok == 0 and (avg_sec is None or avg_sec <= 0):
        return None

    partes = []
    if in_tok > 0 or out_tok > 0:
        in_str = f"{formatar_tokens(in_tok)} in"
        hit_str = f"({hit_pct}% cache hit)" if hit_pct is not None else "(0% cache hit)"
        out_str = f"{formatar_tokens(out_tok)} out {hit_str}"
        partes.append(in_str)
        partes.append(out_str)

    if avg_sec is not None and avg_sec > 0:
        partes.append(f"Tempo médio: {formatar_duracao(avg_sec)}")

    if not partes:
        return None

    conteudo = " · ".join(partes)
    return f"📊 <b>Telemetria do Ciclo:</b> {conteudo}"


