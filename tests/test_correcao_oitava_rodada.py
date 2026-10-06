"""Inclui a regressão funcional offline na execução padrão do pytest."""
from pathlib import Path
import subprocess


def test_regressao_funcional_oitava_rodada():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_correcao_oitava_rodada.cjs"],
        cwd=root, capture_output=True, text=True, timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
