from pathlib import Path
import subprocess


def test_navegacao_rapida_metricas():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(["node", "tests/test_navegacao_rapida_metricas.cjs"], cwd=root,
                            capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, result.stdout + result.stderr
