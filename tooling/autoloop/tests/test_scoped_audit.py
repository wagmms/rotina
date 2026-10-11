import json
import subprocess
from pathlib import Path
import pytest
from scoped_audit import build_scopes, evaluate_scopes, ScopeError
from loop_guard import acquire_project_lock, mark_task, task_allowed, last_lock_holder, check_unreleased_diff_size
import sys
sys.path.append(str(Path.home() / '.local/lib/autoloop_core'))
from audit_validator import avaliar_parecer_auditoria
from model_router import classificar_alteracoes, selecionar_modelo_auditoria


def git(root, *args):
    return subprocess.check_output(['git', *args], cwd=root, text=True).strip()


def repo(root):
    git(root, 'init', '-q')
    git(root, 'config', 'user.email', 'fixture@example.invalid')
    git(root, 'config', 'user.name', 'Fixture')
    (root / '.gitignore').write_text('data/\n')
    (root / 'src').mkdir()
    (root / 'src/clinical.js').write_text('function dose() { return helper(1); }\n')
    (root / 'src/helper.js').write_text('function helper(n) { return n; }\n')
    (root / 'theme.css').write_text('body { color: blue; }\n')
    (root / 'a.js').write_text('const a = 1;\n')
    git(root, 'add', '.')
    git(root, 'commit', '-qm', 'base')
    return git(root, 'rev-parse', 'HEAD')


def commit(root):
    git(root, 'add', '.')
    git(root, 'commit', '-qm', 'change')
    return git(root, 'rev-parse', 'HEAD')


def scopes(root, base, candidate):
    return build_scopes(root, base, candidate, classificar_alteracoes, selecionar_modelo_auditoria)[2]


def report(sha, passed=True):
    return {'candidate_sha': sha, 'verdict': 'pass' if passed else 'fail', 'summary': 'Fixture',
            'findings': [] if passed else [{'file': 'src/clinical.js', 'line_range': '1', 'severity': 'high',
                'description': 'Contract violated', 'failure_scenario': 'Concrete failure'}],
            'limitations': [], 'required_followups': []}


def test_mixed_release_is_partitioned_without_omissions(tmp_path):
    base = repo(tmp_path)
    (tmp_path / 'src/clinical.js').write_text('function dose() { return helper(2); }\n')
    (tmp_path / 'theme.css').write_text('body { color: red; }\n')
    (tmp_path / 'a.js').write_text('const a = 2;\n')
    head = commit(tmp_path)
    result = scopes(tmp_path, base, head)
    clinical = next(s for s in result if s['category'] == 'clinical')
    engineering = next(s for s in result if s['category'] == 'engineering')
    assert clinical['files'] == ['src/clinical.js']
    assert 'src/helper.js' in clinical['dependencies']
    assert engineering['files'] == ['a.js', 'theme.css']
    assert clinical['config']['model'] == 'gpt-6-astra'
    assert engineering['config']['model'] != 'gpt-6-astra'
    assert all((tmp_path / patch['patch']).is_file() for s in result for patch in s['patches'])


def test_unchanged_clinical_scope_reuses_review_after_engineering_change(tmp_path):
    base = repo(tmp_path)
    (tmp_path / 'src/clinical.js').write_text('function dose() { return helper(2); }\n')
    head = commit(tmp_path)
    calls=[]
    def review(scope, prior, number):
        calls.append(scope['category'])
        return report(head), None
    evaluate_scopes(tmp_path, head, base, scopes(tmp_path, base, head), review, avaliar_parecer_auditoria)
    (tmp_path / 'theme.css').write_text('body { color: red; }\n')
    new = commit(tmp_path)
    def review_new(scope, prior, number):
        calls.append(scope['category'])
        return report(new), None
    combined = evaluate_scopes(tmp_path, new, base, scopes(tmp_path, base, new), review_new, avaliar_parecer_auditoria)
    assert calls == ['clinical', 'engineering']
    assert avaliar_parecer_auditoria(combined, new)[0]
    receipt=json.loads((tmp_path / f'data/scoped_audits/release_{new}.json').read_text())
    assert receipt['coverage'][0]['audited_candidate'] == head


def test_dependency_change_invalidates_clinical_approval(tmp_path):
    base=repo(tmp_path)
    (tmp_path / 'src/clinical.js').write_text('function dose() { return helper(2); }\n')
    head=commit(tmp_path)
    old=scopes(tmp_path,base,head)[0]['fingerprint']
    (tmp_path / 'src/helper.js').write_text('function helper(n) { return n*2; }\n')
    new=commit(tmp_path)
    clinical=next(s for s in scopes(tmp_path,base,new) if s['category']=='clinical')
    assert clinical['fingerprint']!=old and 'src/helper.js' in clinical['files']


def test_refusal_same_content_and_two_rounds_are_bounded(tmp_path):
    base=repo(tmp_path)
    (tmp_path / 'src/clinical.js').write_text('function dose() { return helper(2); }\n')
    head=commit(tmp_path)
    calls=[]
    def review(scope, prior, number):
        calls.append((number,prior))
        return report(head, False), None
    first=evaluate_scopes(tmp_path,head,base,scopes(tmp_path,base,head),review,avaliar_parecer_auditoria)
    assert first['verdict']=='fail'
    evaluate_scopes(tmp_path,head,base,scopes(tmp_path,base,head),review,avaliar_parecer_auditoria)
    assert len(calls)==1
    (tmp_path / 'src/clinical.js').write_text('function dose() { return helper(3); }\n')
    head=commit(tmp_path)
    evaluate_scopes(tmp_path,head,base,scopes(tmp_path,base,head),review,avaliar_parecer_auditoria)
    assert len(calls)==2 and calls[1][0]==2 and calls[1][1]['verdict']=='fail'
    (tmp_path / 'src/clinical.js').write_text('function dose() { return helper(4); }\n')
    head=commit(tmp_path)
    with pytest.raises(ScopeError,match='AUDIT_BUDGET_EXHAUSTED'):
        evaluate_scopes(tmp_path,head,base,scopes(tmp_path,base,head),review,avaliar_parecer_auditoria)
    assert len(calls)==2


def test_large_patch_is_preserved_in_full_not_clinical_by_size_alone(tmp_path):
    base=repo(tmp_path)
    text='body { color: red; }\n'*5000
    (tmp_path / 'theme.css').write_text(text)
    head=commit(tmp_path)
    result=scopes(tmp_path,base,head)
    assert result[0]['category']=='engineering'
    assert len((tmp_path/result[0]['patches'][0]['patch']).read_text())>40000


def test_frozen_legacy_change_is_blocked(tmp_path):
    base=repo(tmp_path)
    (tmp_path/'frozen.gs').write_text('fixture')
    head=commit(tmp_path)
    with pytest.raises(ScopeError,match='legado congelado'):
        scopes(tmp_path,base,head)


def test_project_lock_and_task_budget(tmp_path):
    first=acquire_project_lock(tmp_path)
    assert first and acquire_project_lock(tmp_path) is None
    first.close()
    second=acquire_project_lock(tmp_path)
    assert second
    second.close()
    for i in range(2):
        assert task_allowed('task',tmp_path)
        mark_task('task','started',tmp_path)
        mark_task('task','pending',tmp_path)
    assert not task_allowed('task',tmp_path)
    assert (tmp_path/'data/autoloop_task_notes/task.pending.md').exists()
    mark_task('completed','passed',tmp_path)
    assert not task_allowed('completed',tmp_path)


def test_infrastructure_prompts_do_not_route_to_clinical_auditor(tmp_path):
    base=repo(tmp_path)
    target=tmp_path/'tooling/autoloop/autoloop.py'
    target.parent.mkdir(parents=True)
    target.write_text('prompt = "preservar doses clínicas de insulina"\n')
    head=commit(tmp_path)
    result=scopes(tmp_path,base,head)
    assert result[0]['category']=='engineering'


def test_round_two_can_approve_corrections_without_third_call(tmp_path):
    base=repo(tmp_path)
    (tmp_path/'src/clinical.js').write_text('function dose() { return helper(2); }\n')
    head=commit(tmp_path)
    calls=[]
    def review(scope, prior, number):
        calls.append(number)
        return report(head, number == 2), None
    evaluate_scopes(tmp_path,head,base,scopes(tmp_path,base,head),review,avaliar_parecer_auditoria)
    (tmp_path/'src/clinical.js').write_text('function dose() { return helper(3); }\n')
    head=commit(tmp_path)
    result=evaluate_scopes(tmp_path,head,base,scopes(tmp_path,base,head),review,avaliar_parecer_auditoria)
    assert avaliar_parecer_auditoria(result,head)[0]
    result=evaluate_scopes(tmp_path,head,base,scopes(tmp_path,base,head),review,avaliar_parecer_auditoria)
    assert calls==[1,2] and avaliar_parecer_auditoria(result,head)[0]


def test_operational_error_is_not_retried_without_changed_context(tmp_path):
    base=repo(tmp_path)
    (tmp_path/'a.js').write_text('const a = 2;')
    head=commit(tmp_path)
    calls=[]
    def review(scope, prior, number):
        calls.append(number)
        return None,'timeout requires diagnosis'
    with pytest.raises(ScopeError,match='timeout'):
        evaluate_scopes(tmp_path,head,base,scopes(tmp_path,base,head),review,avaliar_parecer_auditoria)
    with pytest.raises(ScopeError,match='diagnóstico'):
        evaluate_scopes(tmp_path,head,base,scopes(tmp_path,base,head),review,avaliar_parecer_auditoria)
    assert len(calls)==1


def test_deploy_allowed_after_repairs_without_third_audit(tmp_path):
    """Garante que com allow_deploy_after_repairs=True, a 2ª etapa concluída libera o deploy sem 3ª auditoria."""
    base = repo(tmp_path)
    (tmp_path / 'src/clinical.js').write_text('function dose() { return helper(2); }\n')
    head = commit(tmp_path)
    calls = []
    def review(scope, prior, number):
        calls.append(number)
        return report(head, False), None  # Auditoria reprova
    # Rodada 1
    evaluate_scopes(tmp_path, head, base, scopes(tmp_path, base, head), review, avaliar_parecer_auditoria)
    assert calls == [1]
    # Conserto realizado
    (tmp_path / 'src/clinical.js').write_text('function dose() { return helper(3); }\n')
    head = commit(tmp_path)
    # Rodada 2
    evaluate_scopes(tmp_path, head, base, scopes(tmp_path, base, head), review, avaliar_parecer_auditoria)
    assert calls == [1, 2]
    # 2ª Etapa de conserto realizada: deploy é liberado diretamente sem 3ª auditoria
    (tmp_path / 'src/clinical.js').write_text('function dose() { return helper(4); }\n')
    head = commit(tmp_path)
    res = evaluate_scopes(tmp_path, head, base, scopes(tmp_path, base, head), review,
                          avaliar_parecer_auditoria, allow_deploy_after_repairs=True)
    assert res['verdict'] == 'pass'
    assert len(calls) == 2  # Não chamou uma terceira auditoria


def test_astra_only_audits_clinical_scope_not_engineering(tmp_path):
    """Garante que arquivos de infra, scripts, tooling e UI web não sejam arrastados para o Astra."""
    base = repo(tmp_path)
    # Arquivo clínico
    (tmp_path / 'src/clinical.js').write_text('function dose() { return 5; }\n')
    # Arquivo de infraestrutura / UI web / tooling
    (tmp_path / 'cockpit_movel.html').write_text('<div>UI Cockpit</div>\n')
    (tmp_path / 'tooling').mkdir(exist_ok=True)
    (tmp_path / 'tooling/script.py').write_text('print("script")\n')
    head = commit(tmp_path)
    result = scopes(tmp_path, base, head)
    clinical = next(s for s in result if s['category'] == 'clinical')
    engineering = next(s for s in result if s['category'] == 'engineering')
    # Astra recebe APENAS os arquivos clínicos reais
    assert clinical['files'] == ['src/clinical.js']
    assert clinical['config']['model'] == 'gpt-6-astra'
    # Engenharia e UI ficam exclusivamente com modelo de engenharia
    assert set(engineering['files']) == {'cockpit_movel.html', 'tooling/script.py'}
    assert engineering['config']['model'] != 'gpt-6-astra'


def test_lock_holder_reports_pid_and_unreleased_diff_size(tmp_path):
    """Valida identificação do processo concorrente e limite de diff antes de novas alterações."""
    first = acquire_project_lock(tmp_path)
    assert first is not None
    # Segunda tentativa falha
    second = acquire_project_lock(tmp_path)
    assert second is None
    holder = last_lock_holder(tmp_path)
    assert f"pid={subprocess.os.getpid()}" in holder
    first.close()
    # Verificação de diff
    base = repo(tmp_path)
    (tmp_path / 'large.txt').write_text('x' * 50000)
    commit(tmp_path)
    size, is_over = check_unreleased_diff_size(tmp_path, base=base, max_chars=40000)
    assert size >= 50000
    assert is_over is True
