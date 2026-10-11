"""Exclusão por projeto e orçamento de tentativas sem enfraquecer gates."""
from pathlib import Path
import fcntl
import os
import subprocess
import sys
import time
from failure_queue import read_json, save_json

_ACTIVE_LOCK_HANDLE = None
_LAST_HOLDER_INFO = ""


def resolve_project_root(root=None):
    if root is not None:
        return Path(root).resolve()
    try:
        res = subprocess.run(['git', 'rev-parse', '--show-toplevel'],
                             capture_output=True, text=True, check=False, timeout=10)
        if res.returncode == 0 and res.stdout.strip():
            return Path(res.stdout.strip()).resolve()
    except Exception:
        pass
    cur = Path.cwd().resolve()
    for p in [cur, *cur.parents]:
        if (p / '.git').exists() or (p / 'package.json').exists() or (p / 'PROGRESS.md').exists():
            return p
    return cur


def acquire_project_lock(root=None):
    global _ACTIVE_LOCK_HANDLE, _LAST_HOLDER_INFO
    root = resolve_project_root(root)
    path = root / 'data/.autoloop.lock'
    path.parent.mkdir(parents=True, exist_ok=True)
    handle = path.open('a+')
    try:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except (BlockingIOError, OSError):
        try:
            handle.seek(0)
            _LAST_HOLDER_INFO = handle.read().strip()
        except Exception:
            _LAST_HOLDER_INFO = "processo desconhecido"
        handle.close()
        return None
    handle.seek(0)
    handle.truncate()
    cmd_str = " ".join(sys.argv) if sys.argv else "autoloop"
    handle.write(f"pid={os.getpid()}\nstarted_at={time.time()}\ncmd={cmd_str}\n")
    handle.flush()
    _ACTIVE_LOCK_HANDLE = handle  # Mantém referência global viva durante toda a execução.
    return handle


def release_project_lock():
    global _ACTIVE_LOCK_HANDLE
    if _ACTIVE_LOCK_HANDLE is not None:
        try:
            fcntl.flock(_ACTIVE_LOCK_HANDLE, fcntl.LOCK_UN)
            _ACTIVE_LOCK_HANDLE.close()
        except Exception:
            pass
        _ACTIVE_LOCK_HANDLE = None


def last_lock_holder(root=None):
    global _LAST_HOLDER_INFO
    if _LAST_HOLDER_INFO:
        return _LAST_HOLDER_INFO
    root = resolve_project_root(root)
    path = root / 'data/.autoloop.lock'
    if path.is_file():
        try:
            return path.read_text(encoding='utf-8').strip()
        except Exception:
            pass
    return "processo concorrente desconhecido"


def check_unreleased_diff_size(root=None, base=None, max_chars=40000):
    """Calcula tamanho do diff acumulado não publicado. Evita acúmulo descontrolado."""
    root = resolve_project_root(root)
    if not base:
        for ref in ('origin/main', 'origin/master', 'main'):
            try:
                res = subprocess.run(['git', 'rev-parse', '--verify', f'{ref}^{{commit}}'],
                                     cwd=root, capture_output=True, text=True, check=False, timeout=10)
                if res.returncode == 0:
                    base = res.stdout.strip()
                    break
            except Exception:
                continue
    if not base:
        return 0, False
    try:
        diff_res = subprocess.run(
            ['git', 'diff', '--no-ext-diff', '--no-textconv', '--no-color', f'{base}..HEAD'],
            cwd=root, capture_output=True, text=True, check=False, timeout=20
        )
        if diff_res.returncode == 0:
            diff_len = len(diff_res.stdout)
            return diff_len, diff_len > max_chars
    except Exception:
        pass
    return 0, False


def task_allowed(key, root=Path('.')):
    item = read_json(Path(root) / 'data/.autoloop_task_budget.json', {}).get(key, {})
    return item.get('status') != 'passed' and item.get('attempts', 0) < 2


def mark_task(key, status, root=Path('.')):
    path = Path(root) / 'data/.autoloop_task_budget.json'
    state = read_json(path, {})
    item = state.get(key, {})
    if status == 'started':
        item['attempts'] = item.get('attempts', 0) + 1
    item.update(status=status, updated_at=time.time())
    state[key] = item
    save_json(path, state)
    if status == 'pending' and item.get('attempts', 0) >= 2:
        target = Path(root) / 'data/autoloop_task_notes' / (Path(key).stem + '.pending.md')
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(f'# Pendência sem repetição automática\n\nTarefa: {key}\nDuas tentativas encerradas sem aprovação. Testes e auditoria continuam obrigatórios.\nPróxima ação: diagnóstico dirigido; retomar explicitamente após resolver a causa.\n')
