from pathlib import Path
import os
import subprocess
import sys
import time
import pytest
from execution import run_observed, fingerprint_tree


def test_silent_process_is_observed_and_completes():
    notices = []
    result = run_observed([sys.executable, "-c", "import time; time.sleep(.12); print('done')"],
                          stage="silent", heartbeat=.03, emit=notices.append)
    assert result.returncode == 0 and "done" in result.stdout
    assert any("PROGRESSO" in notice for notice in notices)


def test_partial_output_and_failure_are_not_approval():
    result = run_observed([sys.executable, "-c", "print('OK parcial'); raise SystemExit(7)"],
                          stage="failure", emit=lambda _: None)
    assert result.returncode == 7


def test_timeout_removes_descendants(tmp_path):
    pid = tmp_path / "descendant"
    program = ("import subprocess,sys,time; "
               "p=subprocess.Popen([sys.executable,'-c','import time;time.sleep(60)']); "
               f"open({str(pid)!r},'w').write(str(p.pid));time.sleep(60)")
    result = run_observed([sys.executable, "-c", program], stage="timeout", timeout=.15,
                          heartbeat=.03, emit=lambda _: None)
    assert result.returncode == 124
    descendant = int(pid.read_text())
    # Processos terminados ainda podem existir como zombie até o init coletar.
    stat = Path(f"/proc/{descendant}/stat")
    assert not stat.exists() or stat.read_text().split()[2] == "Z"


def test_identity_includes_untracked_code_and_ignores_operational_data(tmp_path):
    subprocess.run(["git", "init", "-q"], check=True)
    (tmp_path / ".gitignore").write_text("data/\nlogs/\n")
    (tmp_path / "main.js").write_text("const n = 1;")
    first = fingerprint_tree()
    (tmp_path / "data").mkdir()
    (tmp_path / "data" / "properties.json").write_text("{}");
    assert fingerprint_tree() == first
    (tmp_path / "main.js").write_text("const n = 2;")
    assert fingerprint_tree() != first


def test_unverifiable_identity_fails_closed():
    with pytest.raises(subprocess.CalledProcessError):
        fingerprint_tree()


def test_missing_program_is_failure():
    result = run_observed(["/nonexistent-autoloop-fixture"], stage="missing", emit=lambda _: None)
    assert result.returncode == 127
