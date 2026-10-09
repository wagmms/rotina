"""Validação da Suíte de Centro Obstétrico & Emergências no pytest."""
from pathlib import Path
import subprocess


def test_centro_obstetrico_suite():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_centro_obstetrico.cjs"],
        cwd=root, capture_output=True, text=True, timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
