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


def test_calculate_agent_timeout_adaptive(monkeypatch):
    from task_context import calculate_agent_timeout
    
    # 1. Tarefa Clínica / Pro / Thinking -> 1200s (20 minutos)
    assert calculate_agent_timeout(profile="CLINICO_ROBUSTEZ_PRO", model="gemini-3.1-pro-high") == 1200
    assert calculate_agent_timeout(profile="GERAL", model="gemini-3.1-pro-high") == 1200
    assert calculate_agent_timeout(profile=None, model="claude-opus-5-5-high") == 1200
    assert calculate_agent_timeout(profile=None, model="claude-opus-4-6-thinking") == 1200

    # 2. Tarefa UI / Engenharia / Flash -> 600s (10 minutos)
    assert calculate_agent_timeout(profile="UI_ENGENHARIA_FLASH", model="gemini-3.8-flash-high") == 600
    assert calculate_agent_timeout(profile="GERAL_FLASH", model="gemini-3.8-flash-high") == 600
    assert calculate_agent_timeout(profile=None, model="gemini-3.8-flash-high") == 600

    # 3. Reparo de Auditoria de Engenharia -> 600s
    assert calculate_agent_timeout(task_key="audit-1234567890abcdef", profile="UI_ENGENHARIA_FLASH") == 600

    # 4. Caso indeterminado -> default (900s)
    assert calculate_agent_timeout(profile=None, model="custom-model") == 900
    assert calculate_agent_timeout(profile=None, model=None, default=750) == 750

    # 5. Override via variável de ambiente AUTOLOOP_TIMEOUT
    monkeypatch.setenv("AUTOLOOP_TIMEOUT", "450")
    assert calculate_agent_timeout(profile="CLINICO_ROBUSTEZ_PRO", model="gemini-3.1-pro-high") == 450


def test_formatar_tokens_e_duracao():
    from task_context import formatar_tokens, formatar_duracao
    # Testes de tokens
    assert formatar_tokens(0) == "0"
    assert formatar_tokens(-10) == "0"
    assert formatar_tokens(500) == "500"
    assert formatar_tokens(1500) == "1.5k"
    assert formatar_tokens(18000) == "18k"
    assert formatar_tokens(142000) == "142k"
    assert formatar_tokens(1000000) == "1M"
    assert formatar_tokens(1200000) == "1.2M"

    # Testes de duração
    assert formatar_duracao(0) == "0s"
    assert formatar_duracao(45) == "45s"
    assert formatar_duracao(60) == "1m00s"
    assert formatar_duracao(75) == "1m15s"
    assert formatar_duracao(372) == "6m12s"
    assert formatar_duracao(3600) == "1h00m"
    assert formatar_duracao(3665) == "1h01m05s"


def test_coletar_telemetria_ciclo_e_formatar_bloco(tmp_path):
    from task_context import coletar_telemetria_ciclo, formatar_bloco_telemetria
    data_dir = tmp_path / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    metrics_file = data_dir / "autoloop_metrics.jsonl"

    agora = 1791720000.0
    # Simulando 142k in, 18k out, 119.280 cache read (84% cache hit), e tarefa com 372s (6m12s)
    linhas = [
        # Tarefa terminada
        {"time": agora - 300, "stage": "tarefa", "status": "passed", "seconds": 372.0, "model": "gemini-3.8-flash-high"},
        # Consumo capturado pelo UsageMeter
        {
            "time": agora - 200,
            "stage": "consumo_agy",
            "status": "reported",
            "seconds": 360.0,
            "tokens": {
                "input_tokens": 142000,
                "output_tokens": 18000,
                "thinking_tokens": 5000,
                "cache_read_tokens": 119280,
                "cache_read_input_tokens": 119280
            }
        }
    ]
    with metrics_file.open("w", encoding="utf-8") as f:
        for item in linhas:
            f.write(json.dumps(item) + "\n")

    telemetria = coletar_telemetria_ciclo(root=tmp_path, horas=6.0, desde_ts=agora - 3600)
    assert telemetria["input_tokens"] == 142000
    assert telemetria["output_tokens"] == 18000
    assert telemetria["cache_read_tokens"] == 119280
    assert telemetria["cache_hit_pct"] == 84
    assert telemetria["avg_seconds"] == 372.0

    bloco_html = formatar_bloco_telemetria(telemetria)
    assert bloco_html == "📊 <b>Telemetria do Ciclo:</b> 142k in · 18k out (84% cache hit) · Tempo médio: 6m12s"


def test_telemetria_sem_registros_retorna_none(tmp_path):
    from task_context import coletar_telemetria_ciclo, formatar_bloco_telemetria
    # Diretório vazio sem arquivo
    telemetria = coletar_telemetria_ciclo(root=tmp_path, horas=6.0)
    assert telemetria["input_tokens"] == 0
    assert telemetria["output_tokens"] == 0
    assert formatar_bloco_telemetria(telemetria) is None


def test_cabecalho_estatico_cache_comprimento_e_integridade():
    from task_context import obter_cabecalho_estatico_cache, estimar_tokens_prompt, CANONICAL_PROMPT_CACHE_HEADER
    
    cabecalho = obter_cabecalho_estatico_cache()
    assert cabecalho == CANONICAL_PROMPT_CACHE_HEADER.strip()
    
    # 1. Limiar de ativação de Context Caching (Gemini e Claude exigem >= 1024 tokens)
    assert len(cabecalho) >= 4000, f"Cabeçalho com {len(cabecalho)} caracteres é muito curto para cache robusto"
    tokens_est = estimar_tokens_prompt(cabecalho)
    assert tokens_est >= 1024, f"Tokens estimados ({tokens_est}) abaixo do limiar de 1024 tokens"

    # 2. Cláusulas e contratos canônicos essenciais
    assert "Engenheiro Sênior, Tech Lead e Especialista Clínico" in cabecalho
    assert "Fastify" in cabecalho and "Docker" in cabecalho and "Render" in cabecalho
    assert "Google Apps Script" in cabecalho and "NÃO utiliza mais Google Apps Script" in cabecalho
    assert "CLÁUSULA PÉTREA DE QUALIDADE CLÍNICA" in cabecalho
    assert "Comentários e resoluções de questões são canônicos" in cabecalho
    assert "Four-Eyes Principle" in cabecalho or "Double-Check" in cabecalho
    assert "SINGLE-AGENT (PADRÃO PARA VELOCIDADE MÁXIMA)" in cabecalho
    assert "core-dev" in cabecalho and "qa-tester" in cabecalho and "clinical-auditor" in cabecalho
    assert "FAST-FAIL / TEST SHARDING" in cabecalho
    assert "npm run test:all" in cabecalho
    assert "6 REGRAS DE OURO" in cabecalho
    assert "PROGRESS.md sempre enxuto" in cabecalho
    assert "CHANGELOG.md" in cabecalho and "SUGESTOES_FUTURAS.md" in cabecalho


def test_prefixo_cache_identico_entre_tarefas_diferentes():
    import sys
    from pathlib import Path
    autoloop_dir = Path(__file__).resolve().parents[1]
    if str(autoloop_dir) not in sys.path:
        sys.path.insert(0, str(autoloop_dir))
    import autoloop as autoloop_mod
    from task_context import obter_cabecalho_estatico_cache, prefixo_comum_cache, estimar_tokens_prompt

    # Tarefa 1: Engenharia / Áudio Telegram
    tarefa_1 = "- [ ] Telegram Bot - Tratamento de Voz em src/07e_telegram_midia_e_leitos.js na função processarAudioMensagemTelegram garantindo fallback"
    nome_1, agentes_1 = autoloop_mod.resolver_squad_agentes("auto", perfil_tarefa="UI_ENGENHARIA_FLASH")
    prompt_1 = autoloop_mod.montar_prompt_ciclo("Conserto de bugs", nome_1, agentes_1, "DIRETRIZ KAIZEN 1", perfil_tarefa="UI_ENGENHARIA_FLASH", tarefa_ativa=tarefa_1)

    # Tarefa 2: Clínica / Cockpit PWA
    tarefa_2 = "- [ ] Prescrição de Drogas Vasoativas em src/02_medicamentos.js na função calcularNoradrenalina garantindo teto"
    nome_2, agentes_2 = autoloop_mod.resolver_squad_agentes("auto", perfil_tarefa="CLINICO_ROBUSTEZ_PRO")
    prompt_2 = autoloop_mod.montar_prompt_ciclo("Otimização clínica", nome_2, agentes_2, "DIRETRIZ KAIZEN 2", perfil_tarefa="CLINICO_ROBUSTEZ_PRO", tarefa_ativa=tarefa_2)

    # Verifica prefixo comum
    prefixo = prefixo_comum_cache(prompt_1, prompt_2)
    cabecalho = obter_cabecalho_estatico_cache()

    # O prefixo comum deve conter 100% do cabeçalho estático
    assert cabecalho in prefixo
    assert len(prefixo) >= 4000
    assert estimar_tokens_prompt(prefixo) >= 1024

    # Ambas as tarefas mantêm seus sufixos dinâmicos distintos
    assert tarefa_1 in prompt_1 and tarefa_1 not in prompt_2
    assert tarefa_2 in prompt_2 and tarefa_2 not in prompt_1
    assert "DIRETRIZ KAIZEN 1" in prompt_1 and "DIRETRIZ KAIZEN 1" not in prompt_2
    assert "DIRETRIZ KAIZEN 2" in prompt_2 and "DIRETRIZ KAIZEN 2" not in prompt_1



