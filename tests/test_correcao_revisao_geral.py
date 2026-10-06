"""Regressões offline da correção da revisão geral."""
from pathlib import Path
import subprocess


def test_correcao_revisao_geral():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_correcao_revisao_geral.cjs"],
        cwd=root, capture_output=True, text=True, timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
