"""Validação exaustiva da qualidade clínica, didática, SOAP e comando de voz."""
from pathlib import Path
import subprocess


def test_auditoria_qualidade_clinica():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_auditoria_qualidade_clinica.cjs"],
        cwd=root, capture_output=True, text=True, timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
