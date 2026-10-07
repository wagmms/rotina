"""Validação automatizada das calculadoras com caixas de texto e solicitação estrita de parâmetros."""
from pathlib import Path
import subprocess


def test_calculadoras_caixa_texto():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_calculadoras_caixa_texto.cjs"],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
