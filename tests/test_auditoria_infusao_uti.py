"""Validação dos testes de Auditoria de Infusões Contínuas de UTI."""
from pathlib import Path
import subprocess


def test_auditoria_infusao_uti():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_auditoria_infusao_uti.cjs"],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
