from pathlib import Path
import os
import signal
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


def test_stop_process_group_kills_uncooperative_process(tmp_path):
    from execution import stop_process_group
    ready_file = tmp_path / "ready"
    program = (
        "import signal, time, pathlib; "
        "signal.signal(signal.SIGTERM, signal.SIG_IGN); "
        f"pathlib.Path({str(ready_file)!r}).write_text('1'); "
        "time.sleep(60)"
    )
    p = subprocess.Popen([sys.executable, "-c", program], start_new_session=True)
    try:
        # Aguarda confirmação determinística de que o processo instalou o manipulador de sinal
        for _ in range(50):
            if ready_file.exists():
                break
            time.sleep(0.05)
        assert ready_file.exists()
        assert p.poll() is None
        # grace_period curto para testar a escalada para SIGKILL
        stop_process_group(p, grace_period=0.2)
        assert p.poll() is not None
        # Processo forçado a morrer por SIGKILL tem returncode -9 (-signal.SIGKILL)
        assert p.returncode in (-signal.SIGKILL, -9, 137)
    finally:
        try:
            p.kill()
        except OSError:
            pass


def test_background_orphan_subshell_pipe_cleanup(tmp_path):
    # Processo pai spawna subprocesso em background com sleep 60 herdando stdout
    # e encerra na hora com exit 0. O run_observed não deve travar esperando os 60s.
    pid_file = tmp_path / "orphan_child"
    program = (
        "import subprocess, sys, time; "
        "p = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(60)']); "
        f"open({str(pid_file)!r}, 'w').write(str(p.pid)); "
        "print('PAI_FINALIZADO_OK'); sys.exit(0)"
    )
    started = time.monotonic()
    result = run_observed([sys.executable, "-c", program], stage="orphan_pipe_test",
                          timeout=10, heartbeat=1, emit=lambda _: None)
    elapsed = time.monotonic() - started
    # Deve concluir em menos de 3 segundos (não esperar 60s nem 10s de timeout)
    assert elapsed < 4.0
    assert "PAI_FINALIZADO_OK" in result.stdout
    assert result.returncode == 0
    orphan_pid = int(pid_file.read_text())
    # Aguarda o kernel transicionar ou desocupar o processo órfão
    for _ in range(40):
        stat = Path(f"/proc/{orphan_pid}/stat")
        if not stat.exists() or stat.read_text().split()[2] in ("Z", "X"):
            break
        time.sleep(0.05)
    stat = Path(f"/proc/{orphan_pid}/stat")
    assert not stat.exists() or stat.read_text().split()[2] in ("Z", "X")


def test_stop_process_group_safe_with_none_or_dead():
    from execution import stop_process_group
    # Nenhum erro com None
    stop_process_group(None)
    # Nenhum erro com processo já encerrado
    p = subprocess.Popen([sys.executable, "-c", "import sys; sys.exit(0)"], start_new_session=True)
    p.wait()
    stop_process_group(p)

