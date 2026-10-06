"""Validação do pipeline de áudio otimizado e classificação semiológica zero-latência."""
from pathlib import Path
import subprocess


def test_pipeline_audio_otimizado():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_pipeline_audio_otimizado.cjs"],
        cwd=root, capture_output=True, text=True, timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
