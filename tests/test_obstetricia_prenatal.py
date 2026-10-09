"""Validação da Suíte de Obstetrícia e Pré-Natal no pytest."""
from pathlib import Path
import subprocess


def test_obstetricia_prenatal_suite():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_obstetricia_prenatal.cjs"],
        cwd=root, capture_output=True, text=True, timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
