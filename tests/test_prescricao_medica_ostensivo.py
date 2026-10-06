"""Validação dos testes ostensivos de Prescrição Médica (/rx) no pytest."""
from pathlib import Path
import subprocess


def test_prescricao_medica_ostensivo():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_prescricao_medica_ostensivo.cjs"],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
