"""Validação dos testes de Prescrição Hospitalar (/rxh) e Ajuste Renal de Antimicrobianos (/atb)."""
from pathlib import Path
import subprocess


def test_prescricao_hospitalar_e_ajuste_atb():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_prescricao_hospitalar_e_ajuste_atb.cjs"],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
