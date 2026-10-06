from pathlib import Path
import subprocess


def test_cockpit_integracao():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(["node", "tests/test_cockpit_integracao.cjs"], cwd=root,
                            capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, result.stdout + result.stderr
