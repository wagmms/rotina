"""Validação dos testes de Posologia Pediátrica Determinística e Zero Alucinação."""
from pathlib import Path
import subprocess


def test_posologia_deterministica():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_posologia_deterministica.cjs"],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
