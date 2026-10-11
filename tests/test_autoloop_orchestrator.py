from pathlib import Path
import subprocess
import sys


def test_orchestrator_contract():
    root = Path(__file__).resolve().parents[1]
    venv_pytest = root / ".venv/bin/pytest"
    venv_py = root / ".venv/bin/python"
    if venv_pytest.exists():
        cmd = [str(venv_pytest), "tooling/autoloop/tests", "-q"]
    elif venv_py.exists():
        cmd = [str(venv_py), "-m", "pytest", "tooling/autoloop/tests", "-q"]
    else:
        cmd = [sys.executable, "-m", "pytest", "tooling/autoloop/tests", "-q"]
    result = subprocess.run(cmd, cwd=root, capture_output=True, text=True, timeout=60)
    assert result.returncode == 0, result.stdout + result.stderr
