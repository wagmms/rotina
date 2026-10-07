"""Validação automatizada da auditoria de prescrição pediátrica, Guia HSL e cronofarmacologia."""
from pathlib import Path
import subprocess


def test_auditoria_prescricao_hsl():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_auditoria_prescricao_hsl.cjs"],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
