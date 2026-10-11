from pathlib import Path
import json
import os
import time
import pytest
from prune_artifacts import (
    prune_scoped_audits,
    prune_audit_repairs,
    prune_test_reports,
    prune_task_notes,
    prune_autoloop_backups,
    prune_artifacts,
    get_path_size
)


def test_get_path_size(tmp_path):
    f1 = tmp_path / "test.txt"
    f1.write_text("12345")
    assert get_path_size(f1) == 5

    sub = tmp_path / "subdir"
    sub.mkdir()
    (sub / "file2.txt").write_text("1234567890")
    assert get_path_size(sub) == 10
    assert get_path_size(tmp_path / "non_existent") == 0


def test_prune_scoped_audits_preserves_active_and_recent(tmp_path):
    contexts_dir = tmp_path / "data/scoped_audits/contexts"
    contexts_dir.mkdir(parents=True)

    now = time.time()
    old_time = now - (10 * 86400)  # 10 dias atrás

    # Cria 5 contextos antigos
    for i in range(5):
        fp_dir = contexts_dir / f"old_fingerprint_{i}"
        fp_dir.mkdir()
        (fp_dir / "0000.diff").write_text(f"patch {i}")
        (fp_dir / "manifest.json").write_text("{}")
        os.utime(fp_dir, (old_time, old_time))

    # Cria 2 contextos recentes
    for i in range(2):
        fp_dir = contexts_dir / f"recent_fingerprint_{i}"
        fp_dir.mkdir()
        (fp_dir / "0000.diff").write_text(f"patch recent {i}")
        (fp_dir / "manifest.json").write_text("{}")
        os.utime(fp_dir, (now, now))

    # Configura um dos antigos como fingerprint ativo em sessão 'running'
    active_fp = "old_fingerprint_0"
    state_file = tmp_path / "data/.autoloop_scoped_audits.json"
    state_file.write_text(json.dumps({
        "sessions": {
            "origin/main:clinical": {
                "fingerprint": active_fp,
                "status": "running",
                "updated_at": old_time
            }
        }
    }))

    # Também cria 5 recibos antigos e 2 recentes
    scoped_dir = tmp_path / "data/scoped_audits"
    for i in range(5):
        r_file = scoped_dir / f"release_old_{i}.json"
        r_file.write_text("{}")
        os.utime(r_file, (old_time, old_time))
    for i in range(2):
        r_file = scoped_dir / f"release_recent_{i}.json"
        r_file.write_text("{}")
        os.utime(r_file, (now, now))

    # Executa retenção mantendo apenas 2 releases
    stats = prune_scoped_audits(tmp_path, max_age_days=5, max_releases=2)

    # Contextos: 2 recentes mantidos + 1 ativo protegido = 3 mantidos.
    # Dos 5 antigos, 1 ativo ficou, 4 foram removidos.
    assert (contexts_dir / active_fp).exists()
    assert (contexts_dir / "recent_fingerprint_0").exists()
    assert (contexts_dir / "recent_fingerprint_1").exists()
    assert not (contexts_dir / "old_fingerprint_1").exists()
    assert not (contexts_dir / "old_fingerprint_2").exists()
    assert stats['contexts'] == 4

    # Recibos: 2 recentes mantidos + excedentes antigos removidos
    assert (scoped_dir / "release_recent_0.json").exists()
    assert (scoped_dir / "release_recent_1.json").exists()
    assert not (scoped_dir / "release_old_1.json").exists()
    assert stats['receipts'] == 5


def test_prune_audit_repairs_preserves_rejected_and_recent(tmp_path):
    repairs_dir = tmp_path / "data/audit_repairs"
    raw_dir = tmp_path / "data/audit_repairs/raw"
    repairs_dir.mkdir(parents=True)
    raw_dir.mkdir(parents=True)

    now = time.time()
    old_time = now - (10 * 86400)

    # Candidato 1: Aprovado antigo (deve ser expurgado se exceder limite)
    cand_old_aprovado = "1111111111111111111111111111111111111111"
    pkt_old_dir = repairs_dir / cand_old_aprovado / "uuid1"
    pkt_old_dir.mkdir(parents=True)
    (pkt_old_dir / "candidate.diff").write_text("diff old")
    (raw_dir / cand_old_aprovado).mkdir(parents=True)
    (raw_dir / cand_old_aprovado / "raw.json").write_text("{}")

    # Candidato 2: Rejeitado antigo (NUNCA deve ser expurgado enquanto pendente)
    cand_rejeitado = "2222222222222222222222222222222222222222"
    pkt_rej_dir = repairs_dir / cand_rejeitado / "uuid2"
    pkt_rej_dir.mkdir(parents=True)
    (pkt_rej_dir / "candidate.diff").write_text("diff rejected")

    # Candidato 3: Aprovado recente
    cand_recente_aprovado = "3333333333333333333333333333333333333333"
    pkt_rec_dir = repairs_dir / cand_recente_aprovado / "uuid3"
    pkt_rec_dir.mkdir(parents=True)
    (pkt_rec_dir / "candidate.diff").write_text("diff recent")

    state_file = tmp_path / "data/.autoloop_audit_repairs.json"
    state_file.write_text(json.dumps({
        cand_old_aprovado: {
            "status": "approved_by_new_audit",
            "packet": f"data/audit_repairs/{cand_old_aprovado}/uuid1",
            "time": old_time
        },
        cand_rejeitado: {
            "status": "rejected",
            "packet": f"data/audit_repairs/{cand_rejeitado}/uuid2",
            "time": old_time
        },
        cand_recente_aprovado: {
            "status": "approved_by_new_audit",
            "packet": f"data/audit_repairs/{cand_recente_aprovado}/uuid3",
            "time": now
        }
    }))

    # Limpeza mantendo 1 aprovado recente
    stats = prune_audit_repairs(tmp_path, max_age_days=5, max_releases=1)

    # O rejeitado DEVE continuar intacto
    assert pkt_rej_dir.exists()
    assert (pkt_rej_dir / "candidate.diff").exists()

    # O recente DEVE continuar intacto
    assert pkt_rec_dir.exists()

    # O antigo aprovado DEVE ter sido removido
    assert not pkt_old_dir.exists()
    assert not (raw_dir / cand_old_aprovado).exists()
    assert stats['repairs'] == 1

    # O estado JSON deve ter removido o antigo e mantido os outros dois
    novo_state = json.loads(state_file.read_text())
    assert cand_rejeitado in novo_state
    assert cand_recente_aprovado in novo_state
    assert cand_old_aprovado not in novo_state


def test_prune_test_reports_bounds_and_ages(tmp_path):
    reports_dir = tmp_path / "data/test_reports"
    reports_dir.mkdir(parents=True)

    now = time.time()
    old_time = now - (10 * 86400)

    # Cria 4 relatórios antigos
    for i in range(4):
        d = reports_dir / f"old_report_{i}"
        d.mkdir()
        (d / "summary.json").write_text("{}")
        os.utime(d, (old_time, old_time))

    # Cria 2 relatórios recentes
    for i in range(2):
        d = reports_dir / f"recent_report_{i}"
        d.mkdir()
        (d / "summary.json").write_text("{}")
        os.utime(d, (now, now))

    stats = prune_test_reports(tmp_path, max_age_days=5, max_test_reports=2)

    assert (reports_dir / "recent_report_0").exists()
    assert (reports_dir / "recent_report_1").exists()
    assert not (reports_dir / "old_report_0").exists()
    assert not (reports_dir / "old_report_1").exists()
    assert stats['reports'] == 4


def test_prune_task_notes_and_backups(tmp_path):
    notes_dir = tmp_path / "data/autoloop_task_notes"
    notes_dir.mkdir(parents=True)
    backups_dir = tmp_path / "data/autoloop_backups"
    backups_dir.mkdir(parents=True)

    now = time.time()
    old_time = now - (10 * 86400)

    # Notes
    for i in range(3):
        f = notes_dir / f"note_{i}.brief.json"
        f.write_text("{}")
        os.utime(f, (old_time, old_time))
    (notes_dir / "note_rec.brief.json").write_text("{}")

    # Backups
    for i in range(3):
        b = backups_dir / f"backup_old_{i}"
        b.mkdir()
        (b / "manifest.json").write_text("{}")
        os.utime(b, (old_time, old_time))
    (backups_dir / "backup_rec").mkdir()

    stats_notes = prune_task_notes(tmp_path, max_age_days=5, max_notes=1)
    stats_backups = prune_autoloop_backups(tmp_path, max_age_days=5, max_backups=1)

    assert (notes_dir / "note_rec.brief.json").exists()
    assert stats_notes['notes'] == 3

    assert (backups_dir / "backup_rec").exists()
    assert stats_backups['backups'] == 3


def test_prune_dry_run_does_not_delete(tmp_path):
    reports_dir = tmp_path / "data/test_reports"
    reports_dir.mkdir(parents=True)
    old_time = time.time() - (10 * 86400)

    d = reports_dir / "old_run"
    d.mkdir()
    (d / "summary.json").write_text("{}")
    os.utime(d, (old_time, old_time))

    stats = prune_test_reports(tmp_path, max_age_days=5, max_test_reports=0, dry_run=True)
    assert stats['reports'] == 1
    assert d.exists()  # Não foi deletado em dry-run


def test_prune_artifacts_orchestrator(tmp_path):
    (tmp_path / "data/scoped_audits/contexts").mkdir(parents=True)
    (tmp_path / "data/audit_repairs").mkdir(parents=True)
    (tmp_path / "data/test_reports").mkdir(parents=True)

    stats = prune_artifacts(tmp_path, max_age_days=5, max_releases=30)
    assert isinstance(stats, dict)
    assert 'total_removed' in stats
    assert 'bytes_freed' in stats
    assert stats['total_removed'] == 0


def test_prune_and_rollup_metrics_removes_heartbeats_and_preserves_active(tmp_path):
    from prune_artifacts import prune_and_rollup_metrics
    data_dir = tmp_path / "data"
    data_dir.mkdir(parents=True)
    metrics_file = data_dir / "autoloop_metrics.jsonl"

    now = time.time()
    events = [
        # Run 1 finalizado com 3 heartbeats
        {"time": now - 300, "stage": "ciclo_agy", "status": "started", "run_id": "run1"},
        {"time": now - 270, "stage": "ciclo_agy", "status": "running", "run_id": "run1"},
        {"time": now - 240, "stage": "ciclo_agy", "status": "running", "run_id": "run1"},
        {"time": now - 210, "stage": "ciclo_agy", "status": "running", "run_id": "run1"},
        {"time": now - 200, "stage": "ciclo_agy", "status": "passed", "run_id": "run1", "seconds": 100},
        {"time": now - 195, "stage": "consumo_agy", "run_id": "run1", "tokens": {"input_tokens": 1000, "output_tokens": 100}},

        # Run 2 ativo (sem evento terminal) com 2 heartbeats
        {"time": now - 60, "stage": "ciclo_agy", "status": "started", "run_id": "run2_ativo"},
        {"time": now - 30, "stage": "ciclo_agy", "status": "running", "run_id": "run2_ativo"},
        {"time": now - 5, "stage": "ciclo_agy", "status": "running", "run_id": "run2_ativo"}
    ]
    with metrics_file.open("w", encoding="utf-8") as f:
        for ev in events:
            f.write(json.dumps(ev) + "\n")

    res = prune_and_rollup_metrics(tmp_path, max_age_days=1, max_recent_events=100)
    assert res['original_lines'] == 9
    assert res['heartbeats_removed'] == 3
    assert res['ephemeral_started_removed'] == 1
    assert res['final_lines'] == 5

    # Lê linhas finais
    finais = [json.loads(l) for l in metrics_file.read_text(encoding="utf-8").splitlines()]
    # Heartbeats de run1 foram expurgados
    assert not any(x.get('run_id') == 'run1' and x.get('status') == 'running' for x in finais)
    # Heartbeats de run2_ativo foram rigorosamente preservados
    assert len([x for x in finais if x.get('run_id') == 'run2_ativo' and x.get('status') == 'running']) == 2


def test_prune_and_rollup_metrics_creates_daily_rollups_and_archives_gzip(tmp_path):
    from prune_artifacts import prune_and_rollup_metrics
    from task_context import summarize_metrics
    import gzip

    data_dir = tmp_path / "data"
    data_dir.mkdir(parents=True)
    metrics_file = data_dir / "autoloop_metrics.jsonl"
    archive_file = data_dir / "autoloop_metrics_archive.jsonl.gz"

    now = time.time()
    old_time = now - (10 * 86400)  # 10 dias atrás

    # Cria 4 eventos antigos para uma mesma tarefa e modelo
    events = [
        {"time": old_time, "stage": "tarefa", "status": "passed", "task_key": "taskA", "model": "flash", "seconds": 15.0},
        {"time": old_time + 1, "stage": "consumo_agy", "task_key": "taskA", "model": "flash", "tokens": {"input_tokens": 5000, "output_tokens": 500}},
        {"time": old_time + 10, "stage": "tarefa", "status": "passed", "task_key": "taskA", "model": "flash", "seconds": 25.0},
        {"time": old_time + 11, "stage": "consumo_agy", "task_key": "taskA", "model": "flash", "tokens": {"input_tokens": 3000, "output_tokens": 300}},
        # Evento recente
        {"time": now - 100, "stage": "tarefa", "status": "passed", "task_key": "taskRecent", "model": "pro", "seconds": 40.0},
        {"time": now - 99, "stage": "consumo_agy", "task_key": "taskRecent", "model": "pro", "tokens": {"input_tokens": 12000, "output_tokens": 1200}}
    ]

    with metrics_file.open("w", encoding="utf-8") as f:
        for ev in events:
            f.write(json.dumps(ev) + "\n")

    # Sumário antes do rollup
    sum_antes = summarize_metrics(tmp_path)
    item_a_antes = next(x for x in sum_antes if x['task_key'] == 'taskA')
    assert item_a_antes['finished_attempts'] == 2
    assert item_a_antes['seconds'] == 40.0
    assert item_a_antes['tokens']['input_tokens'] == 8000

    # Executa rollup com janela recente de 2 eventos e max_age_days=5
    res = prune_and_rollup_metrics(tmp_path, max_age_days=5, max_recent_events=2, archive=True)
    assert res['rollups_created'] == 1
    assert res['final_lines'] == 3  # 1 rollup de taskA + 2 eventos recentes de taskRecent
    assert archive_file.exists()

    # Confere dados arquivados em gzip
    with gzip.open(archive_file, "rt", encoding="utf-8") as gz_in:
        arquivados = [json.loads(l) for l in gz_in.read().splitlines() if l.strip()]
    assert len(arquivados) == 4

    # Confere paridade exata em summarize_metrics após rollup!
    sum_depois = summarize_metrics(tmp_path)
    item_a_depois = next(x for x in sum_depois if x['task_key'] == 'taskA')
    assert item_a_depois['finished_attempts'] == item_a_antes['finished_attempts']
    assert item_a_depois['approved_cycles'] == item_a_antes['approved_cycles']
    assert item_a_depois['seconds'] == item_a_antes['seconds']
    assert item_a_depois['tokens']['input_tokens'] == item_a_antes['tokens']['input_tokens']
    assert item_a_depois['tokens']['output_tokens'] == item_a_antes['tokens']['output_tokens']

