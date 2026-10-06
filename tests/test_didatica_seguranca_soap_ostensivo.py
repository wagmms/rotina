"""Validação ostensiva da didática e segurança documental no SOAP (pytest)."""
from pathlib import Path
import subprocess


def test_didatica_seguranca_soap_ostensivo():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_didatica_seguranca_soap_ostensivo.cjs"],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
