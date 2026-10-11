from pathlib import Path
from types import SimpleNamespace
import json
import subprocess
import pytest
from scripts.pytest_cjs_receipts import pytest_configure, pytest_unconfigure
from scripts.python_test_catalog import kind


def test_python_main_wrapper_uses_script_mode(tmp_path):
    script = tmp_path / "script.py"
    script.write_text('def main(): pass\nif __name__ == "__main__": main()\n')
    assert kind(script) == "python-script"
    script.write_text('def test_x(): assert True\n')
    assert kind(script) == "python"


def test_receipt_preserves_assertions_stdout_stderr_and_failure(tmp_path, monkeypatch):
    original = subprocess.run
    target = tmp_path / "receipts.json"
    target.write_text(json.dumps({"tests/test_fixture.cjs": {
        "code": 7, "seconds": .1, "stdout": "actual-out", "stderr": "actual-error"
    }}))
    monkeypatch.setenv("AUTOLOOP_CJS_RECEIPTS", str(target))
    config = SimpleNamespace()
    pytest_configure(config)
    try:
        result = subprocess.run(["node", "tests/test_fixture.cjs"], capture_output=True, text=True)
        assert (result.returncode, result.stdout, result.stderr) == (7, "actual-out", "actual-error")
        with pytest.raises(subprocess.CalledProcessError):
            subprocess.run(["node", "tests/test_fixture.cjs"], capture_output=True, text=True, check=True, timeout=None)
    finally:
        pytest_unconfigure(config)
    assert subprocess.run is original


def test_extra_arguments_and_environment_execute_real_process(tmp_path, monkeypatch):
    calls = []
    def real(command, *args, **kwargs):
        calls.append(command)
        return subprocess.CompletedProcess(command, 0, "real", "")
    monkeypatch.setattr(subprocess, "run", real)
    target = tmp_path / "receipts.json"
    target.write_text(json.dumps({"tests/test_fixture.cjs": {
        "code": 0, "seconds": .1, "stdout": "cached", "stderr": ""
    }}))
    monkeypatch.setenv("AUTOLOOP_CJS_RECEIPTS", str(target))
    config = SimpleNamespace()
    pytest_configure(config)
    try:
        subprocess.run(["node", "tests/test_fixture.cjs", "extra"], capture_output=True, text=True)
        subprocess.run(["node", "tests/test_fixture.cjs"], capture_output=True, text=True, env={})
        subprocess.run(["node", "--test", "tests/test_fixture.cjs"], capture_output=True, text=True)
        assert len(calls) == 3
    finally:
        pytest_unconfigure(config)
