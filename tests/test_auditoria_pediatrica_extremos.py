"""Validação dos testes de Auditoria Pediátrica Avançada (Cenários Extremos de Dose e Conversão)."""
from pathlib import Path
import subprocess


def test_auditoria_pediatrica_extremos():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_auditoria_pediatrica_extremos.cjs"],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
