"""Coleta operacional limitada no tempo, sem saída dos agentes nem dados clínicos."""
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import math
import os
import re
import time

TOKEN_FIELDS = ('input_tokens', 'output_tokens', 'total_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens', 'thinking_tokens')
PHASE_FIELDS = ('phase_reading_s', 'phase_editing_s', 'phase_testing_s', 'phase_thinking_s')
NUMBERS = ('seconds', 'silent_seconds', 'returncode', 'pid', 'process_id', 'prompt_characters') + TOKEN_FIELDS + PHASE_FIELDS
LABELS = ('stage', 'status', 'model', 'run_id', 'candidate_sha', 'task_key')


def stamp(ts):
    return datetime.fromtimestamp(ts, timezone.utc).isoformat(timespec='seconds')


def safe_event(raw):
    if not isinstance(raw, dict) or not isinstance(raw.get('time'), (float, int)):
        return None
    if not math.isfinite(raw['time']):
        return None
    event = {'time': raw['time']}
    for key in NUMBERS:
        value = raw.get(key)
        if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value):
            event[key] = value
    # UsageMeter emite os contadores em tokens e fases; preservar também esses formatos explícitos.
    tokens = raw.get('tokens')
    if isinstance(tokens, dict):
        for key in TOKEN_FIELDS:
            value = tokens.get(key)
            if isinstance(value, int) and not isinstance(value, bool) and value >= 0:
                event[key] = value
    phases = raw.get('agent_phases')
    if isinstance(phases, dict):
        durations = phases.get('durations', {})
        if isinstance(durations, dict):
            for k, key in (('reading', 'phase_reading_s'), ('editing', 'phase_editing_s'),
                           ('testing', 'phase_testing_s'), ('thinking', 'phase_thinking_s')):
                d = durations.get(k)
                if isinstance(d, (int, float)) and not isinstance(d, bool) and math.isfinite(d):
                    event[key] = d
    for key in LABELS:
        value = raw.get(key)
        if not isinstance(value, str):
            continue
        # Texto livre nunca entra no documento. Identificadores desconhecidos viram hash.
        event[key] = value if re.fullmatch(r'[A-Za-z0-9_./:-]{1,160}', value) else 'id-' + hashlib.sha256(value.encode()).hexdigest()[:16]
    return event


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + f'.{os.getpid()}.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    os.replace(temp, path)


def collect_once(root, state):
    target = root / 'data/autoloop_metrics.jsonl'
    events_file = root / state['events_file']
    events_file.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        stat = target.stat()
        identity = [stat.st_dev, stat.st_ino]
        if state.get('metrics_identity') != identity or stat.st_size < state.get('offset', 0):
            state['offset'] = 0
        state['metrics_identity'] = identity
        with target.open('rb') as source, events_file.open('a') as output:
            offset = state.get('offset', 0)
            if offset and state.get('boundary'):
                source.seek(max(0, offset-64))
                if hashlib.sha256(source.read(min(64, offset))).hexdigest() != state['boundary']:
                    state['offset'] = 0
            source.seek(state.get('offset', 0))
            while True:
                position = source.tell()
                line = source.readline()
                if not line or not line.endswith(b'\n'):
                    state['offset'] = position
                    break
                state['offset'] = source.tell()
                try:
                    event = safe_event(json.loads(line))
                    if event and state['started_at'] <= event['time'] <= state['ends_at']:
                        output.write(json.dumps(event, ensure_ascii=False) + '\n')
                except (ValueError, UnicodeError):
                    state['invalid_lines'] = state.get('invalid_lines', 0) + 1
            offset = state.get('offset', 0)
            source.seek(max(0, offset-64))
            state['boundary'] = hashlib.sha256(source.read(min(64, offset))).hexdigest()
    try:
        runner = json.loads((Path.home() / '.cache/ia-hub/runner_status.json').read_text())
        target_name = runner.get('target')
        if target_name in {'rotina', 'pausar', 'habitflow', 'medquest'}:
            state['runner_target'] = target_name
            state['runner_updated_at'] = runner.get('time') if isinstance(runner.get('time'), (int, float)) else None
    except (OSError, ValueError, AttributeError):
        pass
    state['updated_at'] = time.time()
    state['status'] = 'concluída' if state['updated_at'] >= state['ends_at'] else 'coletando'
    render(root, state)


def render(root, state):
    events = []
    path = root / state['events_file']
    if path.exists():
        for line in path.read_text().splitlines():
            try:
                events.append(json.loads(line))
            except ValueError:
                pass
    stages = defaultdict(list)
    tasks = defaultdict(list)
    usage = Counter()
    usage_known = usage_missing = 0
    silence = []
    recent = []
    for event in events:
        stage, status = event.get('stage', '?'), event.get('status', '?')
        if status == 'running':
            silence.append(event.get('silent_seconds', 0))
        elif status != 'started':
            stages[stage].append(event)
            recent.append(event)
            if stage == 'tarefa':
                tasks[event.get('task_key', '?')].append(event)
            if stage == 'consumo_agy':
                values = {key: event[key] for key in TOKEN_FIELDS if key in event}
                if values:
                    usage.update(values)
                    usage_known += 1
                else:
                    usage_missing += 1
    completed = stages.get('tarefa', [])
    lines = ['# Observação do autoloop — 24 horas' if state['hours'] == 24 else '# Observação do autoloop', '',
             f"Estado: **{state['status']}**. Início: {stamp(state['started_at'])}. Fim previsto: {stamp(state['ends_at'])}.",
             f"Atualizado: {stamp(state['updated_at'])}. Horários em UTC. Eventos coletados: {len(events)}.", '',
             '## Como interpretar', '',
             'Dados prospectivos desta execução; não demonstram um multiplicador de velocidade em relação à versão antiga.',
             'Etapas se sobrepõem (tarefa inclui agente e testes): não somar suas durações. Silêncio não prova ociosidade.',
             'Ausência de eventos não prova que o autoloop estava parado. Etapas internas ao agente não são discriminadas.',
             'Resultado de tarefa não equivale a publicação. Tokens ausentes são desconhecidos, nunca zero.',
             'Documento limitado a 25 etapas, 25 tarefas repetidas, 20 testes lentos, 20 falhas recorrentes e 40 eventos recentes. Totais usam todos os eventos.', '',
             '## Cobertura da coleta', '',
             f"Primeiro evento: {stamp(events[0]['time']) if events else 'nenhum'}. Último evento: {stamp(events[-1]['time']) if events else 'nenhum'}.",
             f"Alvo informado pelo runner: {state.get('runner_target', 'indisponível')}; atualização: {stamp(state['runner_updated_at']) if state.get('runner_updated_at') else 'indisponível'} (um status antigo não confirma execução).",
             'Reiniciar o computador encerra este coletor; retome com o mesmo comando antes do fim previsto. Uma lacuna pode impedir recuperar eventos rotacionados.', '',
             '## Resultados e consumo', '',
             f"Tentativas encerradas: {len(completed)}; aprovadas: {sum(e.get('status') == 'passed' for e in completed)}; pendentes: {sum(e.get('status') == 'pending' for e in completed)}.",
             f"Consumo explícito: {usage_known} execuções; sem contador: {usage_missing}. Contadores: {json.dumps(dict(usage), ensure_ascii=False)}.",
             f"Maior silêncio observado: {max(silence, default=0):.0f}s. Linhas inválidas: {state.get('invalid_lines', 0)}.", '',
             '## Tempo por etapa (sobreposições possíveis)', '',
             '| Etapa | Encerramentos | Total s | Mediana s | Máximo s | Resultados |',
             '|---|---:|---:|---:|---:|---|']
    for stage, group in sorted(stages.items(), key=lambda x: sum(e.get('seconds', 0) for e in x[1]), reverse=True)[:25]:
        times = sorted(e.get('seconds', 0) for e in group)
        median = (times[(len(times)-1)//2] + times[len(times)//2])/2
        lines.append(f"| {stage} | {len(group)} | {sum(times):.1f} | {median:.1f} | {max(times):.1f} | {dict(Counter(e.get('status') for e in group))} |")
    lines += ['', '## Tarefas com repetição', '', '| Identificador | Tentativas | Total s | Último resultado |', '|---|---:|---:|---|']
    for key, group in sorted(tasks.items(), key=lambda x: sum(e.get('seconds', 0) for e in x[1]), reverse=True)[:25]:
        if len(group) > 1:
            lines.append(f"| {key} | {len(group)} | {sum(e.get('seconds', 0) for e in group):.1f} | {group[-1].get('status')} |")
    # Apenas recibos estruturados; nunca importar stdout/stderr dos testes.
    reports = []
    for report in (root / 'data/test_reports').glob('*/summary.json'):
        if not state['started_at'] <= report.stat().st_mtime <= state['ends_at']:
            continue
        try:
            raw = json.loads(report.read_text())
            if isinstance(raw, dict) and isinstance(raw.get("results"), list):
                reports.append(raw)
        except (OSError, ValueError):
            continue
    slow = defaultdict(list)
    failures = Counter()
    for report in reports:
        for result in report.get('results', []):
            if not isinstance(result, dict):
                continue
            name = result.get('file', '')
            if not re.fullmatch(r'tests/[A-Za-z0-9_./-]+\.(cjs|py)', name):
                continue
            duration = result.get('seconds')
            if isinstance(duration, (int, float)) and math.isfinite(duration):
                slow[name].append(duration)
            if result.get('status') != 'passed':
                failures[name] += 1
    lines += ['', f'## Testes ({len(reports)} baterias com novo recibo no período)', '',
              'Reutilizações de recibos não geram uma nova bateria nesta contagem. Recibos também podem vir de testes manuais; a origem não é comprovada apenas pelo recibo.', '',
              '| Teste | Execuções | Total s | Máximo s | Falhas |', '|---|---:|---:|---:|---:|']
    for name, values in sorted(slow.items(), key=lambda x: sum(x[1]), reverse=True)[:20]:
        lines.append(f'| {name} | {len(values)} | {sum(values):.2f} | {max(values):.2f} | {failures[name]} |')
    lines += ['', '## Falhas de testes mais recorrentes', '', '| Teste | Baterias com falha |', '|---|---:|']
    for name, count in failures.most_common(20):
        lines.append(f'| {name} | {count} |')
    lines += ['', '## Eventos recentes', '', '| UTC | Etapa | Resultado | Segundos | Modelo | Tarefa |', '|---|---|---|---:|---|---|']
    for event in recent[-40:]:
        lines.append(f"| {stamp(event['time'])} | {event.get('stage')} | {event.get('status')} | {event.get('seconds', 0):.1f} | {event.get('model', '')} | {event.get('task_key', '')} |")
    lines += ['', '## Perguntas para a análise posterior', '',
              '- Quais tarefas concentram tentativas pendentes e repetição?',
              '- O tempo está concentrado no agente, na bateria, em cotas ou nas auditorias?',
              '- Quais testes repetem falhas e precisam de diagnóstico de contrato?',
              '- Que etapas precisam de instrumentação adicional antes de concluir que há desperdício?', '',
              'Não contém prompts, respostas clínicas, credenciais, contas, mensagens ou saída bruta dos processos.']
    target = root / 'data/autoloop_observacao.md'
    temp = target.with_name(target.name + f'.{os.getpid()}.tmp')
    temp.write_text('\n'.join(lines) + '\n')
    os.replace(temp, target)
