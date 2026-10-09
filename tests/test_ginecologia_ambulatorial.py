"""Validação da Suíte de Ginecologia Ambulatorial de Consultório no pytest."""
from pathlib import Path
import subprocess


def test_ginecologia_ambulatorial_suite():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_ginecologia_ambulatorial.cjs"],
        cwd=root, capture_output=True, text=True, timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
