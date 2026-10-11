"""Exclusão por projeto e orçamento de tentativas sem enfraquecer gates."""
from pathlib import Path
import fcntl
import os
import time
from failure_queue import read_json, save_json


def acquire_project_lock(root=Path('.')):
    root = Path(root).resolve()
    path = root / 'data/.autoloop.lock'
    path.parent.mkdir(parents=True, exist_ok=True)
    handle = path.open('a+')
    try:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        handle.close()
        return None
    handle.seek(0)
    handle.truncate()
    handle.write(str(os.getpid()))
    handle.flush()
    return handle  # O chamador mantém aberto durante toda a execução.


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
