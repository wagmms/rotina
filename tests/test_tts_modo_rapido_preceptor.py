"""Validação do TTS em Modo Rápido (Single-Pass Audio) no Preceptor Socrático (pytest)."""
from pathlib import Path
import subprocess


def test_tts_modo_rapido_preceptor():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_tts_modo_rapido_preceptor.cjs"],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
