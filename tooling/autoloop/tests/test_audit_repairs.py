from pathlib import Path
import json
import subprocess
import pytest
from audit_repairs import capture_rejection, select_repair, repair_groups, audit_retry_timeout, record_approved
from failure_queue import record_attempt


def repository(tmp_path):
    for args in [('init', '-q'), ('config', 'user.email', 'fixture@example.invalid'), ('config', 'user.name', 'Fixture')]:
        subprocess.run(['git', *args], cwd=tmp_path, check=True)
    (tmp_path / '.gitignore').write_text('data/\n')
    (tmp_path / 'src').mkdir()
    (tmp_path / 'src/a.js').write_text('const n = 1;')
    subprocess.run(['git', 'add', '.'], cwd=tmp_path, check=True)
    subprocess.run(['git', 'commit', '-qm', 'fixture'], cwd=tmp_path, check=True)
    return subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=tmp_path, text=True).strip()


def report(sha):
    return {'candidate_sha': sha, 'verdict': 'fail', 'summary': 'Blocked', 'limitations': [],
            'required_followups': [], 'findings': [
                {'file': 'src/a.js', 'line_range': '1', 'severity': 'high', 'description': 'A', 'failure_scenario': 'A fails'},
                {'file': 'src/a.js', 'line_range': '2', 'severity': 'medium', 'description': 'B', 'failure_scenario': 'B fails'},
                {'file': 'src/b.js', 'line_range': '1', 'severity': 'high', 'description': 'C', 'failure_scenario': 'C fails'}]}


def test_packet_preserves_full_evidence_and_groups_same_file(tmp_path):
    sha = repository(tmp_path)
    original = report(sha)
    meta = capture_rejection(sha, report=original, root=tmp_path)
    assert json.loads((tmp_path / meta['report_path']).read_text())['report'] == original
    assert 'const n = 1' in (tmp_path / meta['diff_path']).read_text()
    assert meta['groups'][0]['finding_indexes'] == [0, 1]
    selected = select_repair(tmp_path)
    assert selected and not selected['engineering']
    assert 'somente após confirmar independência' in selected['task']
    assert 'Subagentes não fazem commit nem push' in selected['task']
    assert 'nova auditoria independente' in selected['task']
    assert meta['scope'].startswith('commit apenas')


def test_uncertain_evidence_and_other_candidate_never_drive_source_edits(tmp_path):
    sha = repository(tmp_path)
    capture_rejection(sha, error='Timeout 120s', root=tmp_path)
    assert select_repair(tmp_path) is None
    wrong = report('f' * 40)
    capture_rejection(sha, report=wrong, root=tmp_path)
    assert select_repair(tmp_path) is None
    assert not repair_groups([{'file': 'gas_deploy/x.js', 'severity': 'critical'},
                              {'file': '../escape.js', 'severity': 'high'},
                              {'file': 'src/a.js', 'severity': 'info'}])


def test_repeated_repairs_are_bounded_but_rejection_remains(tmp_path):
    sha = repository(tmp_path)
    capture_rejection(sha, report=report(sha), root=tmp_path)
    selected = select_repair(tmp_path)
    record_attempt(selected, 'started', root=tmp_path)
    record_attempt(selected, 'pending', root=tmp_path)
    record_attempt(selected, 'started', root=tmp_path)
    assert select_repair(tmp_path) is None
    state = json.loads((tmp_path / 'data/.autoloop_audit_repairs.json').read_text())
    assert state[sha]['status'] == 'rejected'


def test_timeout_has_one_extended_attempt_and_never_approval(tmp_path):
    sha = repository(tmp_path)
    capture_rejection(sha, error='Timeout (120s)', root=tmp_path)
    assert audit_retry_timeout(sha, root=tmp_path) == 600
    assert audit_retry_timeout(sha, root=tmp_path) is None
    assert audit_retry_timeout('e' * 40, root=tmp_path) == 120
    assert select_repair(tmp_path) is None


def test_approved_tracking_is_for_ancestor_only(tmp_path):
    sha = repository(tmp_path)
    capture_rejection(sha, report=report(sha), root=tmp_path)
    record_approved(sha, tmp_path)
    assert select_repair(tmp_path) is None
    state = json.loads((tmp_path / 'data/.autoloop_audit_repairs.json').read_text())
    assert state[sha]['status'] == 'approved_by_new_audit'


def test_partial_invalid_report_is_preserved_byte_for_byte(tmp_path):
    from audit_repairs import archive_raw_result
    sha = repository(tmp_path)
    partial = tmp_path / 'partial.json'
    original = b'{"invalid": [partial bytes'
    partial.write_bytes(original)
    saved = archive_raw_result(partial, sha, tmp_path)
    assert saved.read_bytes() == original
    meta = capture_rejection(sha, error='JSON inválido', root=tmp_path)
    assert saved.relative_to(tmp_path).as_posix() in meta['raw_results']
    assert select_repair(tmp_path) is None


def test_new_validated_candidate_can_request_immediate_reaudit(tmp_path):
    from audit_repairs import ready_for_reaudit
    from execution import fingerprint_tree
    sha = repository(tmp_path)
    meta = capture_rejection(sha, report=report(sha), root=tmp_path)
    state = json.loads((tmp_path / 'data/.autoloop_audit_repairs.json').read_text())
    packet = tmp_path / state[sha]['packet']
    (packet / 'response.md').write_text('Reprodução e correção com evidências')
    assert not ready_for_reaudit(tmp_path)
    (tmp_path / 'src/a.js').write_text('const n = 2;')
    subprocess.run(['git', 'add', '.'], cwd=tmp_path, check=True)
    subprocess.run(['git', 'commit', '-qm', 'correction'], cwd=tmp_path, check=True)
    receipt = {'scope': 'all', 'passed': True, 'stable': True, 'fingerprint': fingerprint_tree(tmp_path)}
    (tmp_path / 'data/.autoloop_test_receipt.json').write_text(json.dumps(receipt))
    assert ready_for_reaudit(tmp_path)
    (tmp_path / 'src/a.js').write_text('unvalidated change')
    assert not ready_for_reaudit(tmp_path)


def test_latest_rejection_of_same_candidate_preserves_backoff(tmp_path):
    from audit_repairs import ready_for_reaudit
    sha = repository(tmp_path)
    capture_rejection(sha, report=report(sha), root=tmp_path)
    assert not ready_for_reaudit(tmp_path)
