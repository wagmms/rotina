"""Regressões offline da otimização de cota do PropertiesService."""
from pathlib import Path
import subprocess


def test_otimizacao_cota():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_otimizacao_cota.cjs"],
        cwd=root, capture_output=True, text=True, timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
