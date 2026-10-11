import json
import time
from pathlib import Path
from observation import collect_once, safe_event
from execution import record_metric


def test_document_uses_period_and_never_imports_free_text(tmp_path):
    now = time.time()
    data = tmp_path / 'data'
    data.mkdir()
    events = [{'time': now-20, 'stage': 'tarefa', 'status': 'passed', 'seconds': 999},
              {'time': now, 'stage': 'tarefa', 'status': 'pending', 'seconds': 7, 'task_key': 'tests/test_x.py', 'prompt': 'SECRET'},
              {'time': now+1, 'stage': 'tarefa', 'status': 'passed', 'seconds': 3, 'task_key': 'tests/test_x.py'},
              {'time': now+2, 'stage': 'consumo_agy', 'status': 'unavailable', 'seconds': 3, 'output': 'SECRET'}]
    (data / 'autoloop_metrics.jsonl').write_text(''.join(json.dumps(e)+'\n' for e in events))
    state = {'started_at': now-1, 'ends_at': now+10, 'hours': 24, 'events_file': 'data/events.jsonl'}
    collect_once(tmp_path, state)
    doc = (data / 'autoloop_observacao.md').read_text()
    assert 'Tentativas encerradas: 2; aprovadas: 1; pendentes: 1' in doc
    assert '| tests/test_x.py | 2 | 10.0 | passed |' in doc
    assert 'sem contador: 1' in doc and 'SECRET' not in doc and '999' not in doc
    offset = state['offset']
    collect_once(tmp_path, state)
    assert state['offset'] == offset
    assert len((data / 'events.jsonl').read_text().splitlines()) == 3


def test_partial_line_rotation_and_completion(tmp_path):
    now = time.time()
    path = tmp_path / 'data/autoloop_metrics.jsonl'
    path.parent.mkdir()
    line = json.dumps({'time': now, 'stage': 'build', 'status': 'passed', 'seconds': 2})
    path.write_text(line)
    state = {'started_at': now-1, 'ends_at': now+.01, 'hours': 24, 'events_file': 'data/events.jsonl'}
    collect_once(tmp_path, state)
    assert state['offset'] == 0
    with path.open('a') as out:
        out.write('\n')
    collect_once(tmp_path, state)
    assert len((tmp_path / 'data/events.jsonl').read_text().splitlines()) == 1
    path.unlink()
    path.write_text(json.dumps({'time': now, 'stage': 'audit', 'status': 'failed', 'seconds': 1})+'\n')
    time.sleep(.02)
    collect_once(tmp_path, state)
    assert state['status'] == 'concluída'
    assert len((tmp_path / 'data/events.jsonl').read_text().splitlines()) == 2


def test_free_text_identifiers_are_hashed_and_nonfinite_rejected():
    event = safe_event({'time': 1, 'stage': 'credential@email password', 'seconds': float('nan'), 'api_key': 'secret'})
    assert event['stage'].startswith('id-') and 'seconds' not in event and 'api_key' not in event
    assert safe_event({'time': float('inf')}) is None


def test_context_is_correlated_and_cleared(tmp_path):
    record_metric('tarefa', 'started', 0, task_key='task1', model='pro')
    record_metric('testes', 'passed', 3)
    record_metric('tarefa', 'pending', 4)
    record_metric('deploy', 'failed', 1)
    events = [json.loads(line) for line in (tmp_path / 'data/autoloop_metrics.jsonl').read_text().splitlines()]
    assert events[1]['task_key'] == 'task1' and events[1]['model'] == 'pro'
    assert 'task_key' not in events[3]


def test_document_remains_compact_with_many_events(tmp_path):
    now = time.time()
    data = tmp_path / 'data'
    data.mkdir()
    with (data / 'autoloop_metrics.jsonl').open('w') as out:
        for i in range(1200):
            out.write(json.dumps({'time': now, 'stage': 'tarefa', 'status': 'pending', 'seconds': 1, 'task_key': f'task{i}'})+'\n')
    state = {'started_at': now-1, 'ends_at': now+10, 'hours': 24, 'events_file': 'data/events.jsonl'}
    collect_once(tmp_path, state)
    doc = (data / 'autoloop_observacao.md').read_text()
    assert 'Tentativas encerradas: 1200' in doc
    assert len(doc) < 20000 and len(doc.splitlines()) < 160
