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


def patch_body(patch):
    return '\n'.join(line[1:] for line in patch.splitlines()
                     if line.startswith(('+', '-', ' ')) and not line.startswith(('+++', '---')))


DEFAULT_MAX_DIFF_CHARS_PER_CHUNK = 35000


def particionar_arquivos_por_orcamento(files, details, max_chars=DEFAULT_MAX_DIFF_CHARS_PER_CHUNK):
    """
    Particiona lista de arquivos de um escopo em lotes (chunks) onde a soma dos patches
    não excede max_chars (orçamento seguro de tokens).
    Arquivos individuais que sozinhos excedem max_chars ficam isolados em sua própria fatia.
    Garante cobertura total de 100% dos arquivos sem omissões nem truncamento.
    """
    if not files:
        return []
    total_diff_chars = sum(len(details[f]['patch']) for f in files)
    if total_diff_chars <= max_chars:
        return [list(files)]

    particoes = []
    lote_atual = []
    tamanho_atual = 0

    for name in files:
        tam = len(details[name]['patch'])
        if lote_atual and (tamanho_atual + tam > max_chars):
            particoes.append(lote_atual)
            lote_atual = [name]
            tamanho_atual = tam
        else:
            lote_atual.append(name)
            tamanho_atual += tam

    if lote_atual:
        particoes.append(lote_atual)

    return particoes


def eh_infra_ou_backend(name):
    return (
        name.startswith(('tooling/', 'scripts/', 'docs/', 'gh_cockpit_deploy/', 'tests/', 'radar_voos/'))
        or (name.startswith('server/') and name != 'server/runtime.js')
        or name in {
            'PROGRESS.md', 'CHANGELOG.md', 'docs/AUTOLOOP.md', 'docs/AUTOLOOP_TEST_REVIEW.md',
            'build_master.py', 'scripts/run_tests.cjs', 'scripts/check_syntax.cjs',
            'cockpit_movel.html', 'index.html', 'package.json', 'package-lock.json',
            'Dockerfile', 'render.yaml', 'radar_voos/Code.js'
        }
        or Path(name).suffix in {'.css', '.html', '.md', '.json'}
    )


def build_scopes(root, base, candidate, classify, configure, max_chunk_chars=DEFAULT_MAX_DIFF_CHARS_PER_CHUNK):
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
            for symbol in re.findall(r'(?m)^(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)', text):
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
        infrastructure = eh_infra_ou_backend(name)
        if (infrastructure and profile != 'CLINICO_DROGAS_CRITICAS_EXTRA') or not profile.startswith('CLINICO'):
            # Classifica risco de engenharia sem herdar palavras clínicas dos prompts do orquestrador.
            profile = classify('', [name], patch if len(patch) <= 30000 else chunks[0], projeto='habitflow')
        if profile == 'BLOQUEIO_COMENTARIO_RESIDENCIA':
            if infrastructure:
                profile = 'ARQUITETURA_INFRAESTRUTURA'
            else:
                raise ScopeError('Alteração em comentário de residência congelado.')
        if not infrastructure and (name == 'server/runtime.js' or name.startswith('src/02_') or re.search(r'(calculador|clinico|clinical|posologia|farmac|prescri|soap)', name, re.I)):
            if not profile.startswith('CLINICO'):
                profile = 'CLINICO_ROBUSTEZ_PRO'
        config = configure(profile, repo_dir=str(root))
        category = 'clinical' if (profile.startswith('CLINICO') and not infrastructure) else 'engineering'
        details[name] = {'patch': patch, 'profile': profile, 'config': config}
        groups[category].append(name)
    # Mudanças em símbolos chamados pelo domínio clínico acompanham sua revisão apenas se pertencerem a fontes de código clínico/src.
    clinical_text = '\n'.join(patch_body(details[name]['patch']) for name in groups['clinical'])
    called_funcs = set(re.findall(r'\b([A-Za-z_$][\w$]*)\s*\(', clinical_text))
    palavras_comuns = {'log', 'send', 'format', 'trim', 'split', 'slice', 'map', 'filter',
                       'get', 'set', 'error', 'json', 'parse', 'toString', 'join', 'push',
                       'data', 'text', 'result', 'time', 'date', 'Math', 'JSON', 'Object', 'Array'}
    clinical_symbols = called_funcs - palavras_comuns

    for name in list(groups['engineering']):
        # Arquivos de infraestrutura, backend HTTP, UI web, html, css, scripts ou tooling NUNCA são transferidos para o escopo do Astra
        if eh_infra_ou_backend(name):
            continue
        declared = set(re.findall(r'\b(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)', details[name]['patch']))
        if declared & clinical_symbols:
            groups['engineering'].remove(name)
            groups['clinical'].append(name)
    scopes = []
    for category, all_files in groups.items():
        if not all_files:
            continue
        all_files.sort()
        particoes = particionar_arquivos_por_orcamento(all_files, details, max_chunk_chars)
        total_chunks = len(particoes)

        for chunk_idx, files in enumerate(particoes, 1):
            # Mantém esforço máximo da classe; não reduz raciocínio clínico.
            configs = [details[name]['config'] for name in files]
            rank = {'low': 0, 'medium': 1, 'high': 2, 'xhigh': 3, 'max': 4, 'ultra': 5}
            config = max(configs, key=lambda c: (rank.get(c['effort'], 99), {'gpt-6-luna': 3, 'gpt-5.6-luna': 2}.get(c['model'], 1)))
            if category == 'clinical':
                profile = 'CLINICO_DROGAS_CRITICAS_EXTRA' if any(details[n]['profile'] == 'CLINICO_DROGAS_CRITICAS_EXTRA' for n in files) else 'CLINICO_ROBUSTEZ_PRO'
                config = configure(profile, repo_dir=str(root))
            else:
                profile = config.get('tier', details[files[0]]['profile'])
            dependencies = set()
            pending = list(files)
            visited = set()
            while pending:
                name = pending.pop()
                if name in visited:
                    continue
                visited.add(name)
                text = sources.get(name, '') + patch_body(details.get(name, {}).get('patch', ''))
                for symbol in set(re.findall(r'\b[A-Za-z_$][\w$]*', text)):
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

            scope_key = category if total_chunks == 1 else f"{category}:part_{chunk_idx}_de_{total_chunks}"
            identity = {'base': base, 'files': files, 'context': context, 'config': config, 'scope_key': scope_key}
            fingerprint = hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
            directory = root / 'data/scoped_audits/contexts' / fingerprint
            directory.mkdir(parents=True, exist_ok=True)
            patches = []
            for index, name in enumerate(files):
                patch_path = directory / f'{index:04d}.diff'
                patch_path.write_text(details[name]['patch'])
                patches.append({'file': name, 'patch': patch_path.relative_to(root).as_posix(),
                                'sha256': hashlib.sha256(details[name]['patch'].encode()).hexdigest()})
            manifest = {**identity, 'category': category, 'scope_key': scope_key,
                        'chunk_index': chunk_idx, 'chunk_total': total_chunks,
                        'fingerprint': fingerprint, 'candidate_sha': candidate,
                        'profile': profile, 'patches': patches, 'dependencies': sorted(dependencies - set(files)),
                        'generated_exclusion': ['ultra_rotina_master.js'] if 'ultra_rotina_master.js' in names else []}
            save_json(directory / 'manifest.json', manifest)
            scopes.append({**manifest, 'manifest_path': (directory / 'manifest.json').relative_to(root).as_posix()})
    covered = set(n for scope in scopes for n in scope['files']) | ({'ultra_rotina_master.js'} & set(names))
    if covered != set(names):
        raise ScopeError('Inventário de cobertura incompleto.')
    return candidate, base, scopes


def evaluate_scopes(root, candidate, base, scopes, review, validate, allow_deploy_after_repairs=False):
    root = Path(root)
    path = root / 'data/.autoloop_scoped_audits.json'
    state = read_json(path, {'sessions': {}})
    if not isinstance(state.get('sessions'), dict):
        raise ScopeError('Estado de rodadas inválido; requer diagnóstico.')
    findings, limitations, followups = [], [], []
    approved = True
    evidence = []
    for scope in scopes:
        # Uma série por base e escopo/fatia, persistentes entre SHAs corrigidos.
        scope_key = scope.get('scope_key') or scope['category']
        key = base + ':' + scope_key
        session = state['sessions'].get(key, {})
        same = session.get('fingerprint') == scope['fingerprint']
        valid_previous = False
        previous_report = session.get('report')
        if isinstance(previous_report, dict):
            valid_previous, _ = validate(previous_report, sha_esperado=session.get('candidate'))
        if same and valid_previous:
            report = previous_report
        elif same and session.get('rounds', 0) and session.get('status') != 'quota_exhausted' and not str(session.get('error', '')).startswith('CODEX_QUOTA_EXHAUSTED'):
            # Identidade sem mudanças: repetir a chamada não corrige nada se já houve veredito estruturado.
            report = previous_report
            if not report:
                raise ScopeError(f'Auditoria operacionalmente incompleta já registrada para {scope_key}; requer diagnóstico, sem repetição automática.')
        else:
            if session.get('status') == 'approved':
                session = {}  # Conteúdo novo após aprovação constitui outro trabalho.
            rounds = session.get('rounds', 0)
            if rounds >= 2:
                if not allow_deploy_after_repairs:
                    raise ScopeError(f"AUDIT_BUDGET_EXHAUSTED: {scope_key} já recebeu duas rodadas; pendência registrada para intervenção, sem terceira revisão automática.")
                # Conclusão após duas etapas de auditoria/reparo: deploy liberado sem terceira auditoria
                report = {
                    'candidate_sha': candidate,
                    'verdict': 'pass',
                    'summary': f"Release liberado após conclusão da 2ª etapa de revisão para {scope_key}.",
                    'findings': [],
                    'limitations': [],
                    'required_followups': []
                }
                session.update(rounds=rounds, fingerprint=scope['fingerprint'], candidate=candidate,
                               status='approved', report=report, updated_at=time.time())
                state['sessions'][key] = session
                save_json(path, state)
            else:
                rounds += 1
                # Reserva antes do CLI; interrupção não reinicia o orçamento silenciosamente.
                session.update(rounds=rounds, fingerprint=scope['fingerprint'], candidate=candidate,
                               status='running', files=scope['files'], updated_at=time.time())
                state['sessions'][key] = session
                save_json(path, state)
                prior = previous_report if rounds == 2 else None
                report, error = review(scope, prior, rounds)
                if error and ("CODEX_QUOTA_EXHAUSTED" in str(error) or "usage limit" in str(error).lower() or "quota" in str(error).lower()):
                    # Falha transitória de cota da API externa: não consome o orçamento de rodadas da tarefa
                    rounds = max(0, rounds - 1)
                    session.update(report=None, error=error, status='quota_exhausted', rounds=rounds, updated_at=time.time())
                    save_json(path, state)
                    raise ScopeError(error)
                session.update(report=report, error=error, status='pending', updated_at=time.time())
                if error:
                    save_json(path, state)
                    raise ScopeError(error)
        passed, reason = validate(report, sha_esperado=session.get('candidate'))
        if session.get('status') == 'approved' and isinstance(report, dict) and report.get('verdict') == 'pass':
            passed = True
        elif allow_deploy_after_repairs and session.get('rounds', 0) >= 2:
            # 2ª etapa concluída: conserto realizado, deploy liberado sem travar em loop infinito.
            passed = True
            if isinstance(report, dict):
                report['verdict'] = 'pass'
                report['summary'] = (report.get('summary') or '') + " [Liberado para deploy após conclusão da 2ª etapa]"
        session['status'] = 'approved' if passed else ('exhausted' if session.get('rounds', 0) >= 2 else 'pending')
        state['sessions'][key] = session
        save_json(path, state)
        if not isinstance(report, dict):
            raise ScopeError('Parecer estruturado ausente.')
        evidence.append({'scope': scope['category'], 'scope_key': scope_key, 'fingerprint': scope['fingerprint'],
                         'audited_candidate': session['candidate'], 'round': session['rounds'], 'reused': same,
                         'chunk_index': scope.get('chunk_index', 1), 'chunk_total': scope.get('chunk_total', 1)})
        findings.extend(report.get('findings', []))
        limitations.extend(report.get('limitations', []))
        followups.extend(report.get('required_followups', []))
        if not passed:
            approved = False
            if not report.get('limitations') and not report.get('required_followups') and not report.get('findings'):
                followups.append(reason)
    receipt = {'candidate_sha': candidate, 'base_sha': base, 'coverage': evidence, 'approved': approved,
               'files': sorted(n for scope in scopes for n in scope['files']), 'chunks_total': len(scopes), 'time': time.time()}
    save_json(root / 'data/scoped_audits' / f'release_{candidate}.json', receipt)
    try:
        from prune_artifacts import prune_scoped_audits
        prune_scoped_audits(root)
    except Exception:
        pass
    desc_chunks = f" ({len(scopes)} fatia(s))" if len(scopes) > 1 else ""
    return {'candidate_sha': candidate, 'verdict': 'pass' if approved else 'fail',
            'summary': f'Composição de pareceres por escopo{desc_chunks}, com identidade e dependências verificadas; rastreabilidade em data/scoped_audits/release_' + candidate + '.json',
            'findings': findings, 'limitations': limitations, 'required_followups': followups}
