"""Integração dos testes do Radar de Voos Google Apps Script ao pytest."""
from pathlib import Path
import subprocess


def test_radar_voos_gas():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_radar_voos.cjs"],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, f"Falha nos testes JS:\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
