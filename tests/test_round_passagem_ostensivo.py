"""Validação dos testes ostensivos de Round (/round) e Passagem SBAR (/passagem) no pytest."""
from pathlib import Path
import subprocess


def test_round_passagem_ostensivo():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_round_passagem_ostensivo.cjs"],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
