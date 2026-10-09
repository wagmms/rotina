"""Validação da Suíte de Puericultura e Pediatria no pytest."""
from pathlib import Path
import subprocess


def test_puericultura_pediatria_suite():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_puericultura_pediatria.cjs"],
        cwd=root, capture_output=True, text=True, timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
