"""Preserva recusas e prepara correções; nunca produz aprovação de auditoria."""
from pathlib import Path
import json
import hashlib
import re
import subprocess
import time
import uuid
from failure_queue import read_json, save_json


def git(root, *args):
    return subprocess.run(['git', *args], cwd=root, capture_output=True, text=True, timeout=30)


def allowed_file(name):
    return (isinstance(name, str) and not Path(name).is_absolute() and '..' not in Path(name).parts
            and re.fullmatch(r'[A-Za-z0-9_./-]+\.(js|cjs|py|html|css|json|md)', name) is not None
            and not name.startswith(('gas_deploy/', 'scripts/voos_gas/', '.'))
            and Path(name).name not in {'appsscript.json', 'ultra_rotina_gas.js'})


def repair_groups(findings):
    groups = []
    for index, finding in enumerate(findings):
        name = finding.get('file') if isinstance(finding, dict) else None
        if not isinstance(finding, dict) or finding.get('severity') not in {'critical', 'high', 'medium'} or not allowed_file(name):
            continue
        group = next((g for g in groups if name in g['files']), None)
        if group is None:
            group = {'files': [name], 'finding_indexes': []}
            groups.append(group)
        group['finding_indexes'].append(index)
    return groups


def archive_raw_result(path, candidate, root=Path('.')):
    if not re.fullmatch(r'[a-fA-F0-9]{40}', candidate):
        raise ValueError('Identidade inválida para parecer bruto')
    target = Path(root) / 'data/audit_repairs/raw' / candidate / (uuid.uuid4().hex + '.json')
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(Path(path).read_bytes())
    return target


def capture_rejection(candidate, base=None, report=None, error=None, profile=None, root=Path('.')):
    if not isinstance(candidate, str) or not re.fullmatch(r'[a-fA-F0-9]{40}', candidate):
        raise ValueError('Candidato inválido para pacote de recusa')
    root = Path(root)
    state_path = root / 'data/.autoloop_audit_repairs.json'
    state = read_json(state_path, {})
    previous = state.get(candidate, {})
    previous = previous if isinstance(previous, dict) else {}
    signature = hashlib.sha256(json.dumps({'base': base, 'report': report, 'error': error, 'profile': profile}, sort_keys=True).encode()).hexdigest()
    prior_packet = previous.get('packet', '')
    if previous.get('signature') == signature and isinstance(prior_packet, str) and re.fullmatch(r'data/audit_repairs/[a-fA-F0-9]{40}/[a-f0-9]{32}', prior_packet):
        saved = read_json(root / prior_packet / 'packet.json', {})
        if saved:
            return saved  # Mesmo parecer/candidato não cria outra fila de correção.
    packet = root / 'data/audit_repairs' / candidate / uuid.uuid4().hex
    packet.mkdir(parents=True)
    # Parecer integral, inclusive quando inválido/inconclusivo; nunca promovido como aprovação.
    save_json(packet / 'report.json', {'report': report, 'operational_error': error})
    if base is None:
        for ref in ['origin/main', 'origin/master']:
            resolved = git(root, 'rev-parse', ref)
            value = resolved.stdout.strip()
            if resolved.returncode == 0 and re.fullmatch(r'[a-fA-F0-9]{40}', value) and value != candidate:
                if git(root, 'merge-base', '--is-ancestor', value, candidate).returncode == 0:
                    base = value
                    break
    if base and re.fullmatch(r'[a-fA-F0-9]{40}', base):
        diff = git(root, 'diff', f'{base}..{candidate}')
        scope = f'{base}..{candidate}'
    else:
        diff = git(root, 'show', '--format=fuller', candidate)
        scope = 'commit apenas; base do release ainda precisa ser confirmada'
    (packet / 'candidate.diff').write_text(diff.stdout if diff.returncode == 0 else '')
    findings = report.get('findings', []) if isinstance(report, dict) else []
    findings = findings if isinstance(findings, list) else []
    limitations = report.get('limitations', []) if isinstance(report, dict) else []
    if error or not isinstance(report, dict) or report.get('verdict') == 'inconclusive' or limitations:
        category = 'incomplete_audit'
    else:
        category = 'findings_to_investigate'
    raw = sorted((root / 'data/audit_repairs/raw' / candidate).glob('*.json'))
    meta = {'candidate_sha': candidate, 'base_sha': base, 'profile': profile, 'category': category,
            'scope': scope, 'diff_available': diff.returncode == 0 and bool(diff.stdout.strip()),
            'report_identity_matches': isinstance(report, dict) and str(report.get('candidate_sha', '')).lower() == candidate.lower(),
            'groups': repair_groups(findings),
            'report_path': (packet / 'report.json').relative_to(root).as_posix(),
            'diff_path': (packet / 'candidate.diff').relative_to(root).as_posix(),
            'raw_results': [p.relative_to(root).as_posix() for p in raw],
            'previous_packet': previous.get('packet'),
            'max_parallel_fronts': 2, 'parallelism_requires_confirmation': True,
            'time': time.time(), 'error': error}
    save_json(packet / 'packet.json', meta)
    state[candidate] = {**previous, 'signature': signature, 'status': 'rejected', 'packet': packet.relative_to(root).as_posix(),
                        'category': category, 'time': meta['time'], 'error': error,
                        'first_rejected_at': previous.get('first_rejected_at', meta['time'])}
    save_json(state_path, state)
    return meta


def select_repair(root=Path('.')):
    root = Path(root)
    state = read_json(root / 'data/.autoloop_audit_repairs.json', {})
    attempts_state = read_json(root / 'data/.autoloop_failure_queue.json', {}).get('items', {})
    attempts_state = attempts_state if isinstance(attempts_state, dict) else {}
    for candidate, item in sorted(state.items(), key=lambda pair: pair[1].get('time', 0) if isinstance(pair[1], dict) else 0, reverse=True):
        if not isinstance(item, dict) or item.get('status') != 'rejected' or not re.fullmatch(r'[a-fA-F0-9]{40}', candidate):
            continue
        # Recusas de commits fora da história atual não dirigem edições nesse checkout.
        if git(root, 'merge-base', '--is-ancestor', candidate, 'HEAD').returncode != 0:
            continue
        packet_name = item.get('packet', '')
        if not isinstance(packet_name, str) or not re.fullmatch(r'data/audit_repairs/[a-fA-F0-9]{40}/[a-f0-9]{32}', packet_name):
            continue
        packet = root / packet_name
        meta = read_json(packet / 'packet.json', {})
        groups = meta.get('groups', [])
        if not meta.get('report_identity_matches') or not meta.get('diff_available'):
            continue
        if not groups:  # Ausência de auditoria não autoriza inventar defeitos no código.
            continue
        scoped = read_json(root / 'data/.autoloop_scoped_audits.json', {}).get('sessions', {})
        if isinstance(scoped, dict) and any(isinstance(session, dict) and session.get('status') == 'exhausted'
                and set(session.get('files', [])) & {name for group in groups for name in group['files']}
                for session in scoped.values()):
            continue
        key = 'audit-' + packet.name
        from loop_guard import task_allowed
        if not task_allowed(key, root):
            continue
        previous = attempts_state.get(key, {})
        count = previous.get('attempts', 0) if isinstance(previous, dict) else 0
        if isinstance(count, int) and count >= 2:
            continue
        files = [name for group in groups for name in group['files']]
        engineering = meta.get('profile') == 'UI_ENGENHARIA_FLASH'
        task = (f"Corrigir recusa do commit {candidate}. Arquivos: {', '.join(files)}. "
                f"Pacote integral: {packet_name}/packet.json; parecer: {meta['report_path']}; diff: {meta['diff_path']}. "
                "Ler integralmente parecer e diff, confrontando checkout atual e contrato vigente antes de editar. "
                "Classificar cada apontamento como: "
                "(1) DEFEITO_REAL: se for realmente um erro/defeito de código ou dosagem clínica; consertar o código no repositório. O autoloop enviará para nova auditoria independente (segunda rodada de conferência). "
                "(2) EXIGENCIA_DIFERENTE: se for apenas preferência de redação, exigência diferente ou expectativa desatualizada sem defeito real no código. Registrar prova e explicação em "
                f"{packet_name}/response.md (com tag EXIGENCIA_DIFERENTE). Nesse caso, nem precisa de segunda auditoria e o deploy ocorrerá direto. "
                "Utilizar invoke_subagent em até DUAS frentes somente após confirmar independência de arquivos, funções, contratos e dependências. "
                "Reservar arquivos por agente; achados no mesmo arquivo ficam na mesma frente. Se houver contrato compartilhado ou dúvida, corrigir sequencialmente. "
                "Cada frente recebe parecer completo, fontes e contexto relevante, executa testes direcionados e entrega evidências ao principal. Frente clínica ou de escopo não determinado usa Pro; Flash somente para engenharia demonstrada. "
                "Subagentes não fazem commit nem push; principal integra, finaliza build/documentação e executa UMA bateria completa. "
                "Critério de aceite: responder a todos os bloqueios com evidência no response.md e validar testes. ")
        if not engineering:
            task += 'Conteúdo clínico ou risco desconhecido exige auditoria clínica Pro e fontes identificáveis; não reduzir raciocínio ou contexto.'
        members = [name for name in files if re.fullmatch(r'tests/test_[A-Za-z0-9_]+\.(cjs|py)', name)]
        return {'key': key, 'members': members, 'task': task, 'engineering': engineering,
                'receipt_fingerprint': None, 'packet': packet_name, 'attempts': count}
    return None


def audit_retry_timeout(candidate, normal=120, root=Path('.')):
    """Uma nova oportunidade de 600 s para timeout; repetição sem progresso é limitada."""
    path = Path(root) / 'data/.autoloop_audit_repairs.json'
    state = read_json(path, {})
    item = state.get(candidate, {})
    if not isinstance(item, dict) or 'timeout' not in str(item.get('error', '')).lower():
        return normal
    if item.get('extended_retry_used'):
        return None
    item['extended_retry_used'] = True
    save_json(path, state)
    return max(normal, 600)


def ready_for_reaudit(root=Path('.')):
    """Antecipação só para candidato novo, resposta escrita, checkout limpo e bateria aprovada."""
    from execution import fingerprint_tree
    root = Path(root)
    state = read_json(root / 'data/.autoloop_audit_repairs.json', {})
    active = [(sha, item) for sha, item in state.items() if isinstance(item, dict)
              and item.get('status') == 'rejected' and re.fullmatch(r'[a-fA-F0-9]{40}', sha)]
    if not active:
        return False
    head = git(root, 'rev-parse', 'HEAD')
    if head.returncode != 0:
        return False
    candidate = head.stdout.strip()
    for rejected, item in sorted(active, key=lambda x: x[1].get('time', 0), reverse=True):
        if git(root, 'merge-base', '--is-ancestor', rejected, candidate).returncode != 0:
            continue
        # A recusa mais recente do mesmo HEAD conserva o backoff, mesmo com recusas ancestrais.
        if candidate == rejected:
            return False
        packet = item.get('packet', '')
        if not isinstance(packet, str) or not re.fullmatch(r'data/audit_repairs/[a-fA-F0-9]{40}/[a-f0-9]{32}', packet):
            return False
        if not (root / packet / 'response.md').is_file():
            return False
        status = git(root, 'status', '--porcelain')
        if status.returncode != 0 or status.stdout.strip():
            return False
        receipt = read_json(root / 'data/.autoloop_test_receipt.json', {})
        if receipt.get('scope') != 'all' or receipt.get('passed') is not True or receipt.get('stable') is not True:
            return False
        try:
            return receipt.get('fingerprint') == fingerprint_tree(root)
        except (OSError, ValueError, subprocess.SubprocessError):
            return False
    return False


def record_approved(candidate, root=Path('.')):
    path = Path(root) / 'data/.autoloop_audit_repairs.json'
    state = read_json(path, {})
    approved = []
    for rejected, item in state.items():
        if isinstance(item, dict) and item.get('status') == 'rejected' and git(root, 'merge-base', '--is-ancestor', rejected, candidate).returncode == 0:
            now = time.time()
            approved.append({'rejected_sha': rejected, 'seconds': max(0, now - item.get('first_rejected_at', now))})
            item.update(status='approved_by_new_audit', approved_candidate=candidate, approved_at=now)
    save_json(path, state)
    try:
        from prune_artifacts import prune_audit_repairs
        prune_audit_repairs(root)
    except Exception:
        pass
    return approved


def classify_repair_response(packet_path):
    """
    Determina se a resposta do Gemini classificou o apontamento como
    um erro real ('DEFEITO_REAL') ou apenas uma exigência diferente ('EXIGENCIA_DIFERENTE').
    """
    packet = Path(packet_path)
    res_json = packet / 'resolution.json'
    if res_json.is_file():
        try:
            data = json.loads(res_json.read_text(encoding='utf-8'))
            tipo = str(data.get('tipo') or data.get('classification') or '').upper()
            if any(k in tipo for k in ('EXIGENCIA_DIFERENTE', 'EXPECTATIVA_DESATUALIZADA', 'PREFERENCIA', 'FALSO_POSITIVO')):
                return 'EXIGENCIA_DIFERENTE'
            if any(k in tipo for k in ('DEFEITO_REAL', 'ERRO_REAL')):
                return 'DEFEITO_REAL'
        except Exception:
            pass

    resp_md = packet / 'response.md'
    if resp_md.is_file():
        try:
            raw_text = resp_md.read_text(encoding='utf-8')
            # 1. Tags explícitas recomendadas no prompt
            if re.search(r'\b(?:tag|classificacao|classificação)?\s*:?\s*\[?EXIGENCIA_DIFERENTE\]?\b', raw_text, re.IGNORECASE):
                return 'EXIGENCIA_DIFERENTE'
            if re.search(r'\b(?:tag|classificacao|classificação)?\s*:?\s*\[?DEFEITO_REAL\]?\b', raw_text, re.IGNORECASE):
                return 'DEFEITO_REAL'

            content = raw_text.lower()
            # 2. Termos de exigência diferente ou negação de erro
            termos_exigencia_dif = [
                r'exig[eê]ncia[\s_-]?diferente',
                r'expectativa[\s_-]?desatualizada',
                r'falso[\s_-]?positivo',
                r'prefer[eê]ncia[\s_-]?(?:do\s+auditor)?',
                r'sem\s+(?:defeito|erro)(?:\s+real)?',
                r'n[aã]o\s+[eé]\s+(?:um\s+)?(?:defeito|erro)',
                r'n[aã]o\s+h[aá]\s+(?:defeito|erro)',
            ]
            tem_dif = any(re.search(pat, content) for pat in termos_exigencia_dif)

            # Limpa expressões de negação para evitar falsos positivos ao buscar "erro real"
            content_cleaned = content
            for pat in termos_exigencia_dif:
                content_cleaned = re.sub(pat, ' ', content_cleaned)

            termos_erro_real = [
                r'defeito[\s_-]?real',
                r'erro[\s_-]?real',
                r'defeito\s+(?:demonstrado|corrigido|consertado)',
                r'erro\s+(?:demonstrado|corrigido|consertado)',
                r'consertado\s+o\s+defeito',
            ]
            tem_erro = any(re.search(pat, content_cleaned) for pat in termos_erro_real)

            if tem_dif and not tem_erro:
                return 'EXIGENCIA_DIFERENTE'
            if tem_erro:
                return 'DEFEITO_REAL'
        except Exception:
            pass
    return 'INDEFINIDO'


def pending_repair_bypass_audit(root=Path('.')):
    """
    Verifica se o candidato atual é fruto de uma recusa cujo apontamento
    o Gemini classificou como apenas uma exigência diferente (sem erro real).
    Se for, retorna (True, rejected_sha) indicando que o deploy pode ser feito direto sem 2ª auditoria.
    """
    root = Path(root)
    state = read_json(root / 'data/.autoloop_audit_repairs.json', {})
    active = [(sha, item) for sha, item in state.items() if isinstance(item, dict)
              and item.get('status') == 'rejected' and re.fullmatch(r'[a-fA-F0-9]{40}', sha)]
    if not active:
        return False, None
    head = git(root, 'rev-parse', 'HEAD')
    if head.returncode != 0:
        return False, None
    candidate = head.stdout.strip()
    for rejected, item in sorted(active, key=lambda x: x[1].get('time', 0), reverse=True):
        if git(root, 'merge-base', '--is-ancestor', rejected, candidate).returncode != 0:
            continue
        packet_name = item.get('packet', '')
        if not isinstance(packet_name, str):
            continue
        packet = root / packet_name
        if not packet.exists():
            continue
        cls = classify_repair_response(packet)
        if cls == 'EXIGENCIA_DIFERENTE':
            return True, rejected
    return False, None
