"""Fila justa de investigações; nunca aprova nem omite suítes com falha."""
from pathlib import Path
import hashlib
import json
import os
import re
import time


def read_json(path, default):
    try:
        value = json.loads(path.read_text())
        return value if isinstance(value, type(default)) else default
    except (OSError, ValueError):
        return default


def save_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + f".{os.getpid()}.tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    os.replace(temp, path)


def file_hash(path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None


def cjs_references(root, name):
    if not name.endswith('.py'):
        return []
    try:
        source = (root / name).read_text()
    except OSError:
        return []
    references = re.findall(r"['\"]((?:tests/)?test_[A-Za-z0-9_]+\.cjs)['\"]", source)
    resolved = []
    for ref in references:
        if not ref.startswith('tests/'):
            if 'os.path.dirname(__file__)' not in source:
                continue
            ref = 'tests/' + ref
        resolved.append(ref)
    return sorted(set(resolved))


def select_failure(root=Path('.')):
    root = Path(root)
    receipt = read_json(root / 'data/.autoloop_test_receipt.json', {})
    if receipt.get('scope') != 'all' or receipt.get('passed') or not isinstance(receipt.get('results'), list):
        return None
    groups = {}
    for result in receipt['results']:
        if not isinstance(result, dict):
            continue
        name = result.get('file')
        if result.get('status') == 'passed' or not isinstance(name, str) or not re.fullmatch(r'tests/test_[A-Za-z0-9_]+\.(cjs|py)', name):
            continue
        # Agrupa wrappers que referenciam inequivocamente uma mesma suíte existente.
        key = name
        if name.endswith('.py'):
            refs = cjs_references(root, name)
            if len(refs) == 1 and (root / refs[0]).is_file():
                key = refs[0]
        groups.setdefault(key, []).append(name)
    if not groups:
        return None
    state = read_json(root / 'data/.autoloop_failure_queue.json', {})
    items = state.get('items', {})
    if not isinstance(items, dict):
        items = {}
    def attempts(key):
        item = items.get(key, {})
        count = item.get('attempts', 0) if isinstance(item, dict) else 0
        return count if isinstance(count, int) and count >= 0 else 0
    # Cada pendência tem uma oportunidade antes de repetir a mesma investigação.
    from loop_guard import task_allowed
    eligible = [key for key in groups if task_allowed(key, root)]
    if not eligible:
        return None
    key = min(eligible, key=attempts)
    members = groups[key]
    policy = read_json(Path(__file__).with_name('queue_policy.json'), {})
    hashes = policy.get(key, {})
    hashes = hashes if isinstance(hashes, dict) else {}
    # Engenharia somente com escopo previamente revisado e arquivos idênticos.
    engineering = bool(hashes) and all(hashes.get(name) == file_hash(root / name) for name in members)
    missing = []
    for name in members:
        missing.extend(ref for ref in cjs_references(root, name) if not (root / ref).is_file())
    if missing:
        engineering = True
    task = (f"Investigar {', '.join(members)} e localizar a função de produção envolvida. "
            f"Tentativas anteriores: {attempts(key)}. Reproduzir primeiro com teste direcionado; "
            "consultar data/.autoloop_failure_queue.json, docs/AUTOLOOP_TEST_REVIEW.md e os logs em data/test_reports antes de repetir diagnóstico. "
            "Distinguir defeito real, preparação incompleta e expectativa desatualizada. "
            "Critério de aceite: contrato demonstrado e suítes relacionadas aprovadas, sem excluir verificações. "
            "Registrar evidências e próxima ação em data/autoloop_task_notes/" + Path(key).stem + ".md. "
            "Corrigir uma causa por tentativa; executar a bateria completa ao fechar o ciclo. ")
    if missing:
        task += (f"Escopo restrito de engenharia: dependência ausente {', '.join(sorted(set(missing)))}. "
                 "Consultar primeiro o histórico: se houve retirada intencional, validar o contrato de desativação e atualizar o wrapper; não reativar a funcionalidade. Caso contrário, recuperar somente original comprovável ou corrigir caminho demonstravelmente incorreto. "
                 "Não inventar asserções nem valores esperados. Se o original não existir, registrar impedimento para revisão especializada.")
    else:
        task += ("Escopo revisado: interface e estado de navegação." if engineering else
             "Escopo clínico ou não determinado: requer auditoria clínica Pro; valores médicos exigem fontes identificáveis.")
    return {'key': key, 'members': members, 'task': task, 'engineering': engineering,
            'receipt_fingerprint': receipt.get('fingerprint'), 'attempts': attempts(key)}


def record_attempt(selection, status, seconds=0, root=Path('.')):
    if not selection:
        return
    root = Path(root)
    path = root / 'data/.autoloop_failure_queue.json'
    state = read_json(path, {})
    if not isinstance(state.get('items'), dict):
        state['items'] = {}
    item = state['items'].get(selection['key'], {})
    if not isinstance(item, dict):
        item = {}
    if status == 'started':
        count = item.get('attempts', 0)
        item['attempts'] = (count if isinstance(count, int) and count >= 0 else 0) + 1
        (root / 'data/autoloop_task_notes').mkdir(parents=True, exist_ok=True)
    item.update(status=status, seconds=round(seconds, 3), time=time.time(),
                members=selection['members'], receipt_fingerprint=selection['receipt_fingerprint'])
    if 'source_hashes' in selection:
        item['source_hashes'] = selection['source_hashes']
    state['items'][selection['key']] = item
    save_json(path, state)
