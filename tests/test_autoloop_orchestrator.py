from pathlib import Path
import subprocess
import sys


def test_orchestrator_contract():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run([sys.executable, "-m", "pytest", "tooling/autoloop/tests", "-q"],
                            cwd=root, capture_output=True, text=True, timeout=60)
    assert result.returncode == 0, result.stdout + result.stderr
