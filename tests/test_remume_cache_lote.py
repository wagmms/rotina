"""Validação do cache em lote e L1 em memória da REMUME e Interações."""
from pathlib import Path
import subprocess


def test_remume_cache_lote():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_remume_cache_lote.cjs"],
        cwd=root, capture_output=True, text=True, timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
