"""Validação do fluxo SOAP em dois tempos no pytest."""
from pathlib import Path
import subprocess


def test_soap_dois_tempos():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_soap_dois_tempos.cjs"],
        cwd=root, capture_output=True, text=True, timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
