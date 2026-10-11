"""Simula falha do processo e troca de alvo sem iniciar aplicativos reais."""
import ast
from pathlib import Path
from types import SimpleNamespace
import pytest


def simulate(returncode=1, pause_at=None):
    source = Path(__file__).resolve().parents[1] / 'visual_runner.py'
    nodes = [n for n in ast.parse(source.read_text()).body
             if isinstance(n, ast.FunctionDef) and n.name in {'main', 'recovery_delay'}]
    clock = {'now': 10.0}
    starts = []
    status = []
    def sleep(seconds):
        clock['now'] += seconds
        if clock['now'] > 260:
            raise StopIteration
    def spawn(*args, **kwargs):
        starts.append(clock['now'])
        return SimpleNamespace(pid=42, poll=lambda: returncode)
    ns = {'_processo_ativo': None, 'CORES': {k: '' for k in ['red', 'bold', 'reset', 'yellow', 'cyan']},
          'time': SimpleNamespace(monotonic=lambda: clock['now'], sleep=sleep),
          'subprocess': SimpleNamespace(Popen=spawn), 'carregar_env_seguro': lambda: {},
          'Path': lambda _: SimpleNamespace(is_file=lambda: True),
          'imprimir_banner': lambda _: None, 'matar_processo_ativo': lambda: None,
          'registrar_status': lambda *args: status.append(args),
          'ler_alvo_atual': lambda: 'pausar' if pause_at and clock['now'] >= pause_at else 'rotina'}
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(source), 'exec'), ns)
    with pytest.raises(StopIteration):
        ns['main']()
    return starts, status


def test_operational_failure_restarts_at_most_three_times():
    starts, status = simulate()
    assert len(starts) == 4  # inicial + três recuperações
    assert starts[1] - starts[0] >= 30
    assert starts[2] - starts[1] >= 60
    assert starts[3] - starts[2] >= 120
    assert status


def test_user_pause_cancels_pending_recovery():
    starts, status = simulate(pause_at=20)
    assert len(starts) == 1
    assert status[-1][0] == 'pausar'


@pytest.mark.parametrize('code', [0, -15])
def test_normal_exit_or_signal_does_not_restart(code):
    assert len(simulate(returncode=code)[0]) == 1
