"""Revisões por domínio, cobertura Git completa e até duas rodadas por pendência."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import time
from failure_queue import read_json, save_json


class ScopeError(ValueError):
    pass


def git(root, *args):
    result = subprocess.run(['git', *args], cwd=root, capture_output=True, text=True, timeout=60)
    if result.returncode:
        raise ScopeError(result.stderr.strip() or 'Não foi possível verificar o escopo Git.')
    return result.stdout


def resolve(root, ref):
    sha = git(root, 'rev-parse', '--verify', '--end-of-options', f'{ref}^{{commit}}').strip()
    if not re.fullmatch('[a-f0-9]{40}', sha):
        raise ScopeError('Identidade Git inválida.')
    return sha


def build_scopes(root, base, candidate, classify, configure):
    root = Path(root).resolve()
    candidate = resolve(root, candidate)
    if not base:
        for ref in ('origin/main', 'origin/master'):
            try:
                base = resolve(root, ref)
                break
            except ScopeError:
                continue
    if not base:
        raise ScopeError('Base explícita ou remota necessária para cobertura completa do release.')
    base = resolve(root, base)
    git(root, 'merge-base', '--is-ancestor', base, candidate)
    names = [n for n in git(root, 'diff', '--name-only', '-z', base, candidate, '--').split('\0') if n]
    inventory = [n for n in git(root, 'ls-tree', '-r', '--name-only', candidate).splitlines() if n]
    sources = {}
    definitions = {}
    for name in inventory:
        if name.startswith(('src/', 'server/')) and name.endswith(('.js', '.cjs', '.json')):
            text = git(root, 'show', f'{candidate}:{name}')
            sources[name] = text
            for symbol in re.findall(r'\b(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)', text):
                definitions.setdefault(symbol, set()).add(name)
    groups = {'clinical': [], 'engineering': []}
    details = {}
    for name in names:
        if name.startswith(('gas_deploy/', 'scripts/voos_gas/')) or name.endswith('.gs') or Path(name).name in {'appsscript.json', 'ultra_rotina_gas.js'}:
            raise ScopeError(f'Mudança em legado congelado: {name}')
        if name == 'ultra_rotina_master.js':
            continue  # Gerado pelo build obrigatório; fontes são auditadas, sem duplicar bundle.
        patch = git(root, 'diff', '--no-ext-diff', '--no-textconv', '--no-color', '--unified=5', base, candidate, '--', name)
        chunks = [patch[i:i+30000] for i in range(0, len(patch), 29500)] or [patch]
        profiles = [classify('', [name], chunk, projeto='rotina') for chunk in chunks]
        profile = next((p for p in profiles if p == 'BLOQUEIO_COMENTARIO_RESIDENCIA'), None)
        if profile is None:
            profile = ('CLINICO_DROGAS_CRITICAS_EXTRA' if 'CLINICO_DROGAS_CRITICAS_EXTRA' in profiles else
                       'CLINICO_ROBUSTEZ_PRO' if 'CLINICO_ROBUSTEZ_PRO' in profiles else profiles[0])
        infrastructure = name.startswith('tooling/autoloop/') or name in {
            'PROGRESS.md', 'CHANGELOG.md', 'docs/AUTOLOOP.md', 'docs/AUTOLOOP_TEST_REVIEW.md',
            'build_master.py', 'scripts/run_tests.cjs', 'scripts/check_syntax.cjs'} or name.startswith('tests/test_autoloop')
        if infrastructure or not profile.startswith('CLINICO'):
            # Classifica risco de engenharia sem herdar palavras clínicas dos prompts do orquestrador.
            profile = classify('', [name], patch if len(patch) <= 30000 else chunks[0], projeto='habitflow')
        if profile == 'BLOQUEIO_COMENTARIO_RESIDENCIA':
            raise ScopeError('Alteração em comentário de residência congelado.')
        if name == 'server/runtime.js' or re.search(r'(calculador|clinico|clinical|posologia|farmac|prescri)', name, re.I):
            if not profile.startswith('CLINICO'):
                profile = 'CLINICO_ROBUSTEZ_PRO'
        config = configure(profile, repo_dir=str(root))
        category = 'clinical' if config['model'] == 'gpt-6-astra' else 'engineering'
        details[name] = {'patch': patch, 'profile': profile, 'config': config}
        groups[category].append(name)
    # Mudanças em símbolos chamados pelo domínio clínico acompanham sua revisão.
    clinical_text = '\n'.join(details[name]['patch'] for name in groups['clinical'])
    clinical_symbols = set(re.findall(r'\b([A-Za-z_$][\w$]*)\s*\(', clinical_text))
    for name in list(groups['engineering']):
        declared = set(re.findall(r'\b(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)', details[name]['patch']))
        if declared & clinical_symbols:
            groups['engineering'].remove(name)
            groups['clinical'].append(name)
    scopes = []
    for category, files in groups.items():
        if not files:
            continue
        files.sort()
        # Mantém esforço máximo da classe; não reduz raciocínio clínico.
        configs = [details[name]['config'] for name in files]
        rank = {'low': 0, 'medium': 1, 'high': 2, 'xhigh': 3, 'max': 4, 'ultra': 5}
        config = max(configs, key=lambda c: (rank.get(c['effort'], 99), {'gpt-6-sol': 3, 'gpt-6-luna': 2}.get(c['model'], 1)))
        if category == 'clinical':
            profile = 'CLINICO_DROGAS_CRITICAS_EXTRA' if any(details[n]['profile'] == 'CLINICO_DROGAS_CRITICAS_EXTRA' for n in files) else 'CLINICO_ROBUSTEZ_PRO'
            config = configure(profile, repo_dir=str(root))
        else:
            profile = config['tier']
        dependencies = set()
        pending = list(files)
        visited = set()
        while pending:
            name = pending.pop()
            if name in visited:
                continue
            visited.add(name)
            text = sources.get(name, '') + details.get(name, {}).get('patch', '')
            for symbol in set(re.findall(r'\b([A-Za-z_$][\w$]*)\s*\(', text)):
                for dependency in definitions.get(symbol, ()):
                    if dependency not in visited:
                        dependencies.add(dependency)
                        pending.append(dependency)
            # Imports literais internos: contexto preservado também para funções anônimas.
            for ref in re.findall(r'(?:require\(|from\s+)[\s\'\"]*(\.[A-Za-z0-9_./-]+)', text):
                for suffix in ('', '.js', '.cjs', '/index.js'):
                    path = (root / Path(name).parent / (ref+suffix)).resolve()
                    if path.is_relative_to(root):
                        dependency = path.relative_to(root).as_posix()
                        if dependency in sources and dependency not in visited:
                            dependencies.add(dependency)
                            pending.append(dependency)
        if category == 'clinical':
            dependencies.update(name for name in ('server/runtime.js', 'src/00_config.js') if name in inventory)
        context = {}
        for name in sorted(set(files) | dependencies):
            blob = git(root, 'ls-tree', candidate, '--', name).strip()
            before = git(root, 'ls-tree', base, '--', name).strip()
            context[name] = {'base': before, 'candidate': blob}
        identity = {'base': base, 'files': files, 'context': context, 'config': config}
        fingerprint = hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
        directory = root / 'data/scoped_audits/contexts' / fingerprint
        directory.mkdir(parents=True, exist_ok=True)
        patches = []
        for index, name in enumerate(files):
            patch_path = directory / f'{index:04d}.diff'
            patch_path.write_text(details[name]['patch'])
            patches.append({'file': name, 'patch': patch_path.relative_to(root).as_posix(),
                            'sha256': hashlib.sha256(details[name]['patch'].encode()).hexdigest()})
        manifest = {**identity, 'category': category, 'fingerprint': fingerprint, 'candidate_sha': candidate,
                    'profile': profile, 'patches': patches, 'dependencies': sorted(dependencies - set(files)),
                    'generated_exclusion': ['ultra_rotina_master.js'] if 'ultra_rotina_master.js' in names else []}
        save_json(directory / 'manifest.json', manifest)
        scopes.append({**manifest, 'manifest_path': (directory / 'manifest.json').relative_to(root).as_posix()})
    covered = set(n for scope in scopes for n in scope['files']) | ({'ultra_rotina_master.js'} & set(names))
    if covered != set(names):
        raise ScopeError('Inventário de cobertura incompleto.')
    return candidate, base, scopes


def evaluate_scopes(root, candidate, base, scopes, review, validate):
    root = Path(root)
    path = root / 'data/.autoloop_scoped_audits.json'
    state = read_json(path, {'sessions': {}})
    if not isinstance(state.get('sessions'), dict):
        raise ScopeError('Estado de rodadas inválido; requer diagnóstico.')
    findings, limitations, followups = [], [], []
    approved = True
    evidence = []
    for scope in scopes:
        # Uma série clínica e uma de engenharia por base, persistentes entre SHAs corrigidos.
        key = base + ':' + scope['category']
        session = state['sessions'].get(key, {})
        same = session.get('fingerprint') == scope['fingerprint']
        valid_previous = False
        previous_report = session.get('report')
        if isinstance(previous_report, dict):
            valid_previous, _ = validate(previous_report, sha_esperado=session.get('candidate'))
        if same and valid_previous:
            report = previous_report
        elif same and session.get('rounds', 0):
            # Identidade sem mudanças: repetir a chamada não corrige nada.
            report = previous_report
            if not report:
                raise ScopeError('Auditoria operacionalmente incompleta já registrada; requer diagnóstico, sem repetição automática.')
        else:
            if session.get('status') == 'approved':
                session = {}  # Conteúdo novo após aprovação constitui outro trabalho.
            rounds = session.get('rounds', 0)
            if rounds >= 2:
                raise ScopeError(f"AUDIT_BUDGET_EXHAUSTED: {scope['category']} já recebeu duas rodadas; pendência registrada para intervenção, sem terceira revisão automática.")
            rounds += 1
            # Reserva antes do CLI; interrupção não reinicia o orçamento silenciosamente.
            session.update(rounds=rounds, fingerprint=scope['fingerprint'], candidate=candidate,
                           status='running', files=scope['files'], updated_at=time.time())
            state['sessions'][key] = session
            save_json(path, state)
            prior = previous_report if rounds == 2 else None
            report, error = review(scope, prior, rounds)
            session.update(report=report, error=error, status='pending', updated_at=time.time())
            if error:
                save_json(path, state)
                raise ScopeError(error)
        passed, reason = validate(report, sha_esperado=session.get('candidate'))
        session['status'] = 'approved' if passed else ('exhausted' if session.get('rounds', 0) >= 2 else 'pending')
        state['sessions'][key] = session
        save_json(path, state)
        if not isinstance(report, dict):
            raise ScopeError('Parecer estruturado ausente.')
        evidence.append({'scope': scope['category'], 'fingerprint': scope['fingerprint'],
                         'audited_candidate': session['candidate'], 'round': session['rounds'], 'reused': same})
        findings.extend(report.get('findings', []))
        limitations.extend(report.get('limitations', []))
        followups.extend(report.get('required_followups', []))
        if not passed:
            approved = False
            if not report.get('limitations') and not report.get('required_followups') and not report.get('findings'):
                followups.append(reason)
    receipt = {'candidate_sha': candidate, 'base_sha': base, 'coverage': evidence, 'approved': approved,
               'files': sorted(n for scope in scopes for n in scope['files']), 'time': time.time()}
    save_json(root / 'data/scoped_audits' / f'release_{candidate}.json', receipt)
    return {'candidate_sha': candidate, 'verdict': 'pass' if approved else 'fail',
            'summary': 'Composição de pareceres por escopo, com identidade e dependências verificadas; rastreabilidade em data/scoped_audits/release_' + candidate + '.json',
            'findings': findings, 'limitations': limitations, 'required_followups': followups}
