"""Validação ostensiva do Gemini como motor primário e resiliência a 429."""
from pathlib import Path
import subprocess


def test_resiliencia_gemini_429():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_resiliencia_gemini_429.cjs"],
        cwd=root, capture_output=True, text=True, timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
