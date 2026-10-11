from pathlib import Path
import json
import failure_queue as queue


def receipt(root, names):
    (root / 'data').mkdir(exist_ok=True)
    (root / 'data/.autoloop_test_receipt.json').write_text(json.dumps({
        'scope': 'all', 'passed': False, 'fingerprint': 'fixture',
        'results': [{'file': name, 'status': 'failed'} for name in names]}))


def test_rotates_and_groups_wrappers_without_approving_failures(tmp_path):
    (tmp_path / 'tests').mkdir()
    (tmp_path / 'tests/test_first.cjs').write_text('throw Error()')
    (tmp_path / 'tests/test_first.py').write_text("run(['node', 'tests/test_first.cjs'])")
    receipt(tmp_path, ['tests/test_first.cjs', 'tests/test_first.py', 'tests/test_second.py'])
    first = queue.select_failure(tmp_path)
    assert len(first['members']) == 2
    assert not first['engineering']
    queue.record_attempt(first, 'started', root=tmp_path)
    queue.record_attempt(first, 'pending', 2, root=tmp_path)
    second = queue.select_failure(tmp_path)
    assert second['key'] == 'tests/test_second.py'
    assert not json.loads((tmp_path / 'data/.autoloop_test_receipt.json').read_text())['passed']


def test_engineering_requires_reviewed_hash_and_reverts_on_change(tmp_path, monkeypatch):
    monkeypatch.setattr(queue, '__file__', str(tmp_path / 'failure_queue.py'))
    (tmp_path / 'tests').mkdir()
    name = 'tests/test_interface.cjs'
    (tmp_path / name).write_text('ui-only')
    (tmp_path / 'queue_policy.json').write_text(json.dumps({name: {name: queue.file_hash(tmp_path / name)}}))
    receipt(tmp_path, [name])
    assert queue.select_failure(tmp_path)['engineering']
    (tmp_path / name).write_text('new clinical assertion')
    assert not queue.select_failure(tmp_path)['engineering']
    assert 'auditoria clínica Pro' in queue.select_failure(tmp_path)['task']


def test_passed_removed_but_missing_dependencies_remain_pending(tmp_path):
    receipt(tmp_path, ['tests/test_absent_wrapper.py'])
    selected = queue.select_failure(tmp_path)
    assert selected['key'] == 'tests/test_absent_wrapper.py'
    queue.record_attempt(selected, 'started', root=tmp_path)
    receipt(tmp_path, ['tests/test_new.cjs'])
    assert queue.select_failure(tmp_path)['key'] == 'tests/test_new.cjs'


def test_malformed_receipt_never_creates_approval(tmp_path):
    (tmp_path / 'data').mkdir()
    p = tmp_path / 'data/.autoloop_test_receipt.json'
    for value in [[], {'scope': 'all', 'results': 3}, {'scope': 'all', 'results': [None, {'file': '../escape', 'status': 'failed'}]}]:
        p.write_text(json.dumps(value))
        assert queue.select_failure(tmp_path) is None
