"""Supervisão de processos e identidade do código, sem registrar conteúdo clínico."""
from collections import deque
from pathlib import Path
import hashlib
import json
import os
import selectors
import signal
import subprocess
import time
import uuid


_METRIC_CONTEXT = {}


def record_metric(stage, status, elapsed, **fields):
    """Métricas são auxiliares: falha de disco nunca altera o veredito da etapa."""
    try:
        if stage == 'tarefa' and status == 'started':
            _METRIC_CONTEXT.update({key: fields[key] for key in ('task_key', 'model') if key in fields})
        target = Path("data/autoloop_metrics.jsonl")
        target.parent.mkdir(parents=True, exist_ok=True)
        item = {"time": time.time(), "stage": stage, "status": status,
                "seconds": round(elapsed, 3), "process_id": os.getpid(), **_METRIC_CONTEXT, **fields}
        with target.open("a", encoding="utf-8") as out:
            out.write(json.dumps(item, ensure_ascii=False) + "\n")
    except OSError:
        pass
    finally:
        if stage == 'tarefa' and status != 'started':
            _METRIC_CONTEXT.clear()


def observed_sleep(seconds, reason):
    started = time.monotonic()
    record_metric('espera_' + reason, 'started', 0)
    try:
        time.sleep(seconds)
    finally:
        record_metric('espera_' + reason, 'finished', time.monotonic() - started)


def stop_process_group(process, grace_period=5):
    """Finaliza o processo e todo o seu grupo de processos (árvore de descendentes).

    Utiliza interrupção em nível de grupo de processos:
    os.killpg(os.getpgid(p.pid), signal.SIGTERM) seguido de signal.SIGKILL
    após grace_period (5s), eliminando processos zumbis e descritores órfãos.
    """
    if process is None or getattr(process, "pid", None) is None:
        return
    try:
        pgid = os.getpgid(process.pid)
    except (ProcessLookupError, OSError):
        pgid = process.pid

    # Salvaguarda: nunca enviar sinais para PID 0, 1 ou para o grupo do autoloop principal
    if not pgid or pgid <= 1 or pgid == os.getpgrp():
        try:
            process.terminate()
            process.wait(timeout=grace_period)
        except (subprocess.TimeoutExpired, OSError):
            try:
                process.kill()
                process.wait(timeout=2)
            except (ProcessLookupError, OSError):
                pass
        return

    # 1. Enviar SIGTERM para o grupo de processos
    try:
        os.killpg(pgid, signal.SIGTERM)
    except (ProcessLookupError, OSError):
        pass

    # 2. Aguardar até grace_period (padrão: 5s) pelo encerramento gracioso
    try:
        process.wait(timeout=grace_period)
    except subprocess.TimeoutExpired:
        # Se não encerrou no prazo, enviar SIGKILL para todo o grupo
        try:
            os.killpg(pgid, signal.SIGKILL)
        except (ProcessLookupError, OSError):
            pass
        try:
            process.wait(timeout=grace_period)
        except (subprocess.TimeoutExpired, ProcessLookupError, OSError):
            pass
    except (ProcessLookupError, OSError):
        pass

    # 3. Varredura sentinela com SIGKILL no grupo de processos para eliminar
    # qualquer subprocesso/neto zumbi que tenha ignorado SIGTERM
    try:
        os.killpg(pgid, signal.SIGKILL)
    except (ProcessLookupError, OSError):
        pass


def run_observed(command, *, stage, timeout=None, heartbeat=30, on_line=None,
                 on_start=None, emit=print, cwd=None, env=None, input_data=None):
    """Silêncio produz diagnóstico, nunca aprovação nem cancelamento automático.

    Limite absoluto só é aplicado quando o chamador define timeout. A execução
    clínica não recebe prazo curto. Saída parcial, sinal e timeout são falhas.
    """
    started = time.monotonic()
    stdin_opt = subprocess.PIPE if input_data is not None else None
    try:
        process = subprocess.Popen(command, cwd=cwd, env=env, stdin=stdin_opt,
                                   stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                   start_new_session=True)
    except OSError as exc:
        record_metric(stage, "failed_to_start", time.monotonic()-started, returncode=127)
        return subprocess.CompletedProcess(command, 127, "", str(exc))
    if input_data is not None:
        import threading
        if isinstance(input_data, str):
            input_bytes = input_data.encode("utf-8")
        else:
            input_bytes = input_data

        def _feed_stdin():
            try:
                process.stdin.write(input_bytes)
                process.stdin.flush()
                process.stdin.close()
            except (BrokenPipeError, OSError):
                pass

        t_in = threading.Thread(target=_feed_stdin, daemon=True)
        t_in.start()
    if on_start:
        on_start(process)
    selector = selectors.DefaultSelector()
    selector.register(process.stdout, selectors.EVENT_READ)
    tail = deque(maxlen=128)
    pending = b""
    last_output = started
    last_notice = started
    timed_out = False
    run_id = uuid.uuid4().hex
    record_metric(stage, "started", 0, run_id=run_id, pid=process.pid)
    try:
        while selector.get_map():
            now = time.monotonic()
            if timeout is not None and now - started >= timeout:
                timed_out = True
                stop_process_group(process)
                break
            # Resiliência contra subprocessos zumbis com pipes abertos:
            # se o processo pai terminou, drena saída remanescente e finaliza órfãos
            if process.poll() is not None:
                for key, _ in selector.select(timeout=0.1):
                    chunk = os.read(key.fileobj.fileno(), 65536)
                    if not chunk:
                        selector.unregister(key.fileobj)
                        continue
                    last_output = time.monotonic()
                    pending += chunk
                    while b"\n" in pending:
                        raw, pending = pending.split(b"\n", 1)
                        line = raw.decode("utf-8", errors="replace") + "\n"
                        tail.append(line[-4096:])
                        emit(line.rstrip("\n"))
                        if on_line:
                            on_line(line)
                if selector.get_map():
                    # Processo pai encerrou mas pipes continuam abertos por filhos órfãos
                    stop_process_group(process)
                    break
            for key, _ in selector.select(timeout=min(1, heartbeat)):
                chunk = os.read(key.fileobj.fileno(), 65536)
                if not chunk:
                    selector.unregister(key.fileobj)
                    continue
                last_output = time.monotonic()
                pending += chunk
                while b"\n" in pending:
                    raw, pending = pending.split(b"\n", 1)
                    line = raw.decode("utf-8", errors="replace") + "\n"
                    tail.append(line[-4096:])
                    emit(line.rstrip("\n"))
                    if on_line:
                        on_line(line)
                # Programas que emitem linhas enormes não podem consumir memória sem limite.
                if len(pending) > 65536:
                    line = pending.decode("utf-8", errors="replace")
                    tail.append(line[-4096:])
                    emit(line)
                    if on_line:
                        on_line(line)
                    pending = b""
            now = time.monotonic()
            if now - last_notice >= heartbeat:
                silence = int(now - last_output)
                emit(f"⏳ [PROGRESSO] {stage}: em andamento há {int(now-started)}s (PID {process.pid})...")
                record_metric(stage, "running", now-started, run_id=run_id,
                              pid=process.pid, silent_seconds=silence)
                last_notice = now
        if pending:
            line = pending.decode("utf-8", errors="replace")
            tail.append(line[-4096:])
            emit(line)
            if on_line:
                on_line(line)
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            stop_process_group(process)
            try:
                process.wait(timeout=2)
            except Exception:
                pass
    except BaseException:
        stop_process_group(process)
        record_metric(stage, "interrupted", time.monotonic()-started, run_id=run_id)
        raise
    finally:
        selector.close()
        try:
            process.stdout.close()
        except Exception:
            pass
        if on_start:
            on_start(None)
    elapsed = time.monotonic() - started
    code = 124 if timed_out else process.returncode
    record_metric(stage, "timeout" if timed_out else ("passed" if code == 0 else "failed"),
                  elapsed, run_id=run_id, returncode=code)
    output = "".join(tail)
    return subprocess.CompletedProcess(command, code, output, output if code else "")


def fingerprint_tree(root="."):
    """Inclui arquivos não commitados; dados operacionais não fazem parte do código."""
    root = Path(root).resolve()
    result = subprocess.run(["git", "ls-files", "--cached", "--others",
                             "--exclude-standard", "-z"], cwd=root,
                            capture_output=True, check=True, timeout=15)
    digest = hashlib.sha256()
    raw_out = result.stdout.decode("utf-8", errors="replace") if isinstance(result.stdout, bytes) else str(result.stdout or "")
    inventory = set(raw_out.split("\0")) - {""}
    public = root / "gh_cockpit_deploy"
    if public.exists():
        for path in public.rglob("*"):
            parts = path.relative_to(public).parts
            if any(part.startswith(".") or part == "node_modules" for part in parts):
                continue
            if path.is_file() and not path.is_symlink() and path.suffix in {
                ".html", ".js", ".css", ".json", ".svg", ".png", ".ico", ".woff", ".woff2"
            }:
                inventory.add(path.relative_to(root).as_posix())
    paths = sorted(inventory)
    if not paths:
        raise ValueError("Inventário Git vazio; identidade do código não verificável.")
    for name in paths:
        if name.startswith(("data/", "logs/", "auditorias/")):
            continue
        path = root / name
        digest.update(name.encode() + b"\0")
        if path.is_symlink():
            digest.update(b"symlink\0" + os.readlink(path).encode())
        elif path.is_file():
            digest.update(str(path.stat().st_mode & 0o777).encode() + b"\0")
            with path.open("rb") as source:
                for chunk in iter(lambda: source.read(1024 * 1024), b""):
                    digest.update(chunk)
        else:
            digest.update(b"deleted")
    return digest.hexdigest()
