import json
from task_context import build_task_brief, UsageMeter, render_cli_event
from failure_queue import record_attempt


def test_brief_locates_symbols_and_reuses_attempt_without_replacing_sources(tmp_path):
    (tmp_path / 'tests').mkdir()
    (tmp_path / 'src').mkdir()
    (tmp_path / 'src/calc.js').write_text('const calc = {dose: function(x) { return x; }};')
    (tmp_path / 'tests/test_calc.cjs').write_text("const calc = require('../src/calc.js'); calc.dose(3)")
    selected = {'key': 'tests/test_calc.cjs', 'members': ['tests/test_calc.cjs'], 'receipt_fingerprint': 'test'}
    text, brief = build_task_brief('Investigar', selected, tmp_path)
    assert brief['targets'][0]['candidates'] == [{'symbol': 'dose', 'line': 1}]
    assert 'contexto clínico integral' in text
    selected['source_hashes'] = brief['source_hashes']
    record_attempt(selected, 'started', root=tmp_path)
    record_attempt(selected, 'pending', 4, root=tmp_path)
    _, same = build_task_brief('Investigar', selected, tmp_path)
    assert same['previous_attempt']['seconds'] == 4
    assert same['previous_attempt']['source_changed'] is False
    (tmp_path / 'src/calc.js').write_text('const calc = {dose: function(x) { return x + 1; }};')
    _, changed = build_task_brief('Investigar', selected, tmp_path)
    assert changed['previous_attempt']['source_changed'] is True


def test_brief_uses_matching_report_and_preserves_full_log_link(tmp_path):
    report = tmp_path / 'data/test_reports/run'
    report.mkdir(parents=True)
    (report / 'summary.json').write_text(json.dumps({'fingerprint': 'matching'}))
    (report / 'tests_test_calc.cjs.log').write_text('AssertionError: expected value\n  actual: 2\n  expected: 3\nFull unrelated output\n')
    selected = {'key': 'tests/test_calc.cjs', 'members': ['tests/test_calc.cjs'], 'receipt_fingerprint': 'matching'}
    text, brief = build_task_brief('Investigar src/missing.js', selected, tmp_path)
    assert 'actual: 2' in text and 'expected: 3' in text
    assert brief['evidence'][0]['log'].endswith('.log')
    assert not brief['targets']
    selected['receipt_fingerprint'] = 'other'
    assert not build_task_brief('Investigar', selected, tmp_path)[1]['evidence']


def test_usage_only_accepts_reported_terminal_counts_without_double_counting():
    meter = UsageMeter()
    meter.observe('Tokens estimados: 999')
    meter.observe(json.dumps({'type': 'tool_result', 'usage': {'input_tokens': 999}}))
    assert meter.fields()['tokens'] is None
    event = json.dumps({'type': 'result', 'usage': {'input_tokens': 12, 'output_tokens': 3, 'cache_read_input_tokens': 7}})
    meter.observe(event)
    meter.observe(event)
    assert meter.fields()['tokens'] == {'input_tokens': 12, 'output_tokens': 3, 'cache_read_input_tokens': 7}
    meter.observe(json.dumps({'type': 'result', 'usage': {'input_tokens': -1, 'output_tokens': True}}))
    assert meter.fields()['tokens']['input_tokens'] == 12


def test_stream_render_preserves_text_and_unknown_events():
    assert render_cli_event('{"type":"result","result":"Resposta completa"}') == 'Resposta completa'
    assert render_cli_event('{"type":"assistant","message":{"content":[{"text":"A"},{"text":"B"}]}}') == 'A\nB'
    unknown = '{"type":"error","message":"quota"}'
    assert render_cli_event(unknown) == unknown


def test_metrics_report_keeps_missing_tokens_distinct_from_zero(tmp_path):
    from task_context import summarize_metrics
    (tmp_path / 'data').mkdir()
    entries = [
        {'stage': 'tarefa', 'status': 'pending', 'task_key': 'case', 'model': 'pro', 'seconds': 5},
        {'stage': 'consumo_agy', 'task_key': 'case', 'model': 'pro', 'tokens': None},
        {'stage': 'consumo_agy', 'task_key': 'other', 'model': 'flash', 'tokens': {'input_tokens': 0, 'output_tokens': 2}}]
    (tmp_path / 'data/autoloop_metrics.jsonl').write_text('\n'.join(json.dumps(x) for x in entries))
    report = summarize_metrics(tmp_path)
    case = next(x for x in report if x['task_key'] == 'case')
    assert case['tokens'] is None and case['missing_usage_records'] == 1
    assert case['finished_attempts'] == 1 and case['approved_cycles'] == 0
    assert next(x for x in report if x['task_key'] == 'other')['tokens']['input_tokens'] == 0


def test_usage_meter_captures_agy_native_stream_and_phases():
    meter = UsageMeter()
    # Fase reading
    meter.observe(json.dumps({'event': 'step_update', 'step_update': {'step_type': 'tool', 'tool_name': 'view_file', 'state': 'ACTIVE', 'duration_seconds': 1.5}}))
    # Fase editing
    meter.observe(json.dumps({'event': 'step_update', 'step_update': {'step_type': 'tool', 'tool_name': 'replace_file_content', 'state': 'ACTIVE', 'duration_seconds': 2.0}}))
    # Evento terminal do AGY com usage
    meter.observe(json.dumps({
        'event': 'result',
        'result': {
            'status': 'SUCCESS',
            'response': 'Tarefa concluída com sucesso',
            'duration_seconds': 3.5,
            'usage': {'input_tokens': 1500, 'output_tokens': 300, 'thinking_tokens': 120, 'cache_read_tokens': 500}
        }
    }))
    fields = meter.fields()
    assert fields['token_source'] == 'cli_terminal_usage'
    assert fields['tokens']['input_tokens'] == 1500
    assert fields['tokens']['output_tokens'] == 300
    assert fields['tokens']['cache_read_input_tokens'] == 500
    assert fields['phase_reading_s'] == 1.5
    assert fields['phase_editing_s'] == 2.0
    assert fields['agent_phases']['counts']['reading'] == 1
    assert fields['agent_phases']['counts']['editing'] == 1
    assert render_cli_event(json.dumps({'event': 'result', 'result': {'response': 'OK visual'}})) == 'OK visual'
