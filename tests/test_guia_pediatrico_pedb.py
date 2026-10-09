"""Validação dos testes do Guia Pediátrico PedBook (pedb.com.br) e Condutas."""
from pathlib import Path
import subprocess


def test_guia_pediatrico_pedb():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_guia_pediatrico_pedb.cjs"],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
