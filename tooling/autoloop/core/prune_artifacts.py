"""
Módulo de limpeza e retenção automática de artefatos de auditoria, testes e contexto.
Evita acúmulo desnecessário de arquivos em data/scoped_audits/, data/audit_repairs/,
data/test_reports/, data/autoloop_task_notes/ e data/autoloop_backups/.
"""
from pathlib import Path
from datetime import datetime, timezone
import argparse
import gzip
import json
import os
import shutil
import time
from failure_queue import read_json, save_json


def get_path_size(path: Path) -> int:
    """Calcula o tamanho total em bytes de um arquivo ou diretório de forma segura."""
    if not path.exists():
        return 0
    if path.is_file():
        try:
            return path.stat().st_size
        except OSError:
            return 0
    total = 0
    try:
        for entry in path.rglob('*'):
            if entry.is_file():
                try:
                    total += entry.stat().st_size
                except OSError:
                    pass
    except OSError:
        pass
    return total


def prune_scoped_audits(root=Path('.'), max_age_days=5, max_releases=30, dry_run=False) -> dict:
    """
    Expurga contextos de auditoria (data/scoped_audits/contexts/<fp>/) e recibos
    (data/scoped_audits/release_<sha>.json) mais antigos que max_age_days,
    preservando sempre os últimos max_releases e qualquer sessão em andamento.
    """
    root = Path(root).resolve()
    contexts_dir = root / 'data/scoped_audits/contexts'
    scoped_dir = root / 'data/scoped_audits'
    state_path = root / 'data/.autoloop_scoped_audits.json'

    stats = {'contexts': 0, 'receipts': 0, 'bytes': 0}
    cutoff = time.time() - (max_age_days * 86400)

    # Identifica sessões ativas protegidas
    active_fingerprints = set()
    state = read_json(state_path, {'sessions': {}})
    sessions = state.get('sessions', {}) if isinstance(state, dict) else {}
    if not isinstance(sessions, dict):
        sessions = {}

    for key, sess in sessions.items():
        if isinstance(sess, dict):
            fp = sess.get('fingerprint')
            status = sess.get('status')
            up_at = sess.get('updated_at', 0)
            if fp:
                # Protege sessões não finalizadas ou atualizadas recentemente
                if status in ('running', 'pending', 'exhausted') or up_at >= cutoff:
                    active_fingerprints.add(fp)

    # 1. Limpeza de contextos
    if contexts_dir.is_dir():
        dirs = []
        try:
            for item in contexts_dir.iterdir():
                if item.is_dir():
                    try:
                        dirs.append((item, item.stat().st_mtime))
                    except OSError:
                        pass
        except OSError:
            pass

        # Ordena decrescente: mais recentes primeiro
        dirs.sort(key=lambda pair: pair[1], reverse=True)

        # Preserva os primeiros max_releases incondicionalmente
        candidates = dirs[max_releases:]
        for dir_path, mtime in candidates:
            fp = dir_path.name
            if fp in active_fingerprints:
                continue
            if mtime < cutoff:
                size = get_path_size(dir_path)
                if not dry_run:
                    shutil.rmtree(dir_path, ignore_errors=True)
                stats['contexts'] += 1
                stats['bytes'] += size

    # 2. Limpeza de recibos de release (data/scoped_audits/release_*.json)
    if scoped_dir.is_dir():
        receipts = []
        try:
            for item in scoped_dir.glob('release_*.json'):
                if item.is_file():
                    try:
                        receipts.append((item, item.stat().st_mtime))
                    except OSError:
                        pass
        except OSError:
            receipts = []

        receipts.sort(key=lambda pair: pair[1], reverse=True)
        for r_path, mtime in receipts[max_releases:]:
            if mtime < cutoff:
                size = get_path_size(r_path)
                if not dry_run:
                    try:
                        r_path.unlink(missing_ok=True)
                    except OSError:
                        pass
                stats['receipts'] += 1
                stats['bytes'] += size

    # 3. Limpeza de sessões antigas já concluídas no arquivo de estado
    if isinstance(sessions, dict) and not dry_run:
        chaves_remover = []
        for key, sess in sessions.items():
            if isinstance(sess, dict) and sess.get('status') == 'approved':
                up_at = sess.get('updated_at', 0)
                fp = sess.get('fingerprint')
                fp_dir = contexts_dir / fp if fp else None
                if up_at < cutoff and (fp_dir is None or not fp_dir.exists()):
                    chaves_remover.append(key)
        if chaves_remover:
            for k in chaves_remover:
                sessions.pop(k, None)
            state['sessions'] = sessions
            save_json(state_path, state)

    return stats


def prune_audit_repairs(root=Path('.'), max_age_days=5, max_releases=30, dry_run=False) -> dict:
    """
    Expurga pacotes de reparo de auditoria (data/audit_repairs/<sha>/ e data/audit_repairs/raw/<sha>/)
    já aprovados ou arquivados mais antigos que max_age_days.
    NUNCA expurga recusas com status 'rejected' pendentes de conserto.
    """
    root = Path(root).resolve()
    repairs_dir = root / 'data/audit_repairs'
    raw_dir = root / 'data/audit_repairs/raw'
    state_path = root / 'data/.autoloop_audit_repairs.json'

    stats = {'repairs': 0, 'bytes': 0}
    cutoff = time.time() - (max_age_days * 86400)

    state = read_json(state_path, {})
    if not isinstance(state, dict):
        state = {}

    # Identifica candidatos aprovados para possível expurgo
    aprovados = []
    for sha, item in state.items():
        if isinstance(item, dict):
            status = item.get('status')
            # NUNCA expurgar recusa pendente
            if status == 'rejected':
                continue
            item_time = item.get('time', 0)
            aprovados.append((sha, item, item_time))

    # Ordena decrescente: mais recentes primeiro
    aprovados.sort(key=lambda x: x[2], reverse=True)

    # Mantém os primeiros max_releases aprovados
    candidatos_expurgo = aprovados[max_releases:]
    shas_removidos = set()

    for sha, item, item_time in candidatos_expurgo:
        if item_time < cutoff:
            size = 0
            packet_rel = item.get('packet')
            if packet_rel:
                pkt_path = root / packet_rel
                if pkt_path.exists():
                    size += get_path_size(pkt_path)
                    if not dry_run:
                        shutil.rmtree(pkt_path, ignore_errors=True)

            raw_sha_dir = raw_dir / sha
            if raw_sha_dir.exists():
                size += get_path_size(raw_sha_dir)
                if not dry_run:
                    shutil.rmtree(raw_sha_dir, ignore_errors=True)

            sha_dir = repairs_dir / sha
            if sha_dir.exists():
                try:
                    # Remove se estiver vazio
                    if not any(sha_dir.iterdir()):
                        if not dry_run:
                            sha_dir.rmdir()
                except OSError:
                    pass

            shas_removidos.add(sha)
            stats['repairs'] += 1
            stats['bytes'] += size

    # Sincroniza estado
    if shas_removidos and not dry_run:
        for sha in shas_removidos:
            state.pop(sha, None)
        save_json(state_path, state)

    # 2. Limpeza de subpastas órfãs não catalogadas em repairs_dir
    if repairs_dir.is_dir():
        try:
            for item in repairs_dir.iterdir():
                if item.is_dir() and item.name != 'raw' and item.name not in state:
                    try:
                        mtime = item.stat().st_mtime
                        if mtime < cutoff:
                            size = get_path_size(item)
                            if not dry_run:
                                shutil.rmtree(item, ignore_errors=True)
                            stats['repairs'] += 1
                            stats['bytes'] += size
                    except OSError:
                        pass
        except OSError:
            pass

    return stats


def prune_test_reports(root=Path('.'), max_age_days=5, max_test_reports=15, dry_run=False) -> dict:
    """
    Expurga pastas de relatórios de teste (data/test_reports/<uuid>/) mais antigas que max_age_days
    ou que excedam o limite máximo configurado.
    """
    root = Path(root).resolve()
    reports_dir = root / 'data/test_reports'
    stats = {'reports': 0, 'bytes': 0}
    cutoff = time.time() - (max_age_days * 86400)

    if not reports_dir.is_dir():
        return stats

    dirs = []
    try:
        for item in reports_dir.iterdir():
            if item.is_dir():
                try:
                    dirs.append((item, item.stat().st_mtime))
                except OSError:
                    pass
    except OSError:
        return stats

    # Ordena decrescente: mais recentes primeiro
    dirs.sort(key=lambda pair: pair[1], reverse=True)

    # Mantém os mais recentes
    candidates = dirs[max_test_reports:]
    for d_path, mtime in candidates:
        # Expurga se for mais velho que o cutoff ou se a fila de testes for muito grande (> 2 * limite)
        if mtime < cutoff or len(dirs) > (max_test_reports * 2):
            size = get_path_size(d_path)
            if not dry_run:
                shutil.rmtree(d_path, ignore_errors=True)
            stats['reports'] += 1
            stats['bytes'] += size

    return stats


def prune_task_notes(root=Path('.'), max_age_days=5, max_notes=30, dry_run=False) -> dict:
    """
    Expurga notas de tarefas (data/autoloop_task_notes/*.brief.json e *.md)
    mais antigas que max_age_days além do limite configurado.
    """
    root = Path(root).resolve()
    notes_dir = root / 'data/autoloop_task_notes'
    stats = {'notes': 0, 'bytes': 0}
    cutoff = time.time() - (max_age_days * 86400)

    if not notes_dir.is_dir():
        return stats

    files = []
    try:
        for item in notes_dir.iterdir():
            if item.is_file() and item.name.endswith(('.brief.json', '.md')):
                try:
                    files.append((item, item.stat().st_mtime))
                except OSError:
                    pass
    except OSError:
        return stats

    files.sort(key=lambda pair: pair[1], reverse=True)
    candidates = files[max_notes:]
    for f_path, mtime in candidates:
        if mtime < cutoff:
            size = get_path_size(f_path)
            if not dry_run:
                try:
                    f_path.unlink(missing_ok=True)
                except OSError:
                    pass
            stats['notes'] += 1
            stats['bytes'] += size

    return stats


def prune_autoloop_backups(root=Path('.'), max_age_days=5, max_backups=15, dry_run=False) -> dict:
    """
    Expurga backups do autoloop (data/autoloop_backups/<timestamp>/)
    mais antigos que max_age_days além do limite configurado.
    """
    root = Path(root).resolve()
    backups_dir = root / 'data/autoloop_backups'
    stats = {'backups': 0, 'bytes': 0}
    cutoff = time.time() - (max_age_days * 86400)

    if not backups_dir.is_dir():
        return stats

    dirs = []
    try:
        for item in backups_dir.iterdir():
            if item.is_dir():
                try:
                    dirs.append((item, item.stat().st_mtime))
                except OSError:
                    pass
    except OSError:
        return stats

    dirs.sort(key=lambda pair: pair[1], reverse=True)
    candidates = dirs[max_backups:]
    for d_path, mtime in candidates:
        if mtime < cutoff:
            size = get_path_size(d_path)
            if not dry_run:
                shutil.rmtree(d_path, ignore_errors=True)
            stats['backups'] += 1
            stats['bytes'] += size

    return stats


def prune_and_rollup_metrics(root=Path('.'), max_age_days=3, max_recent_events=300, archive=True, dry_run=False) -> dict:
    """
    Compacta periodicamente data/autoloop_metrics.jsonl:
    1. Elimina heartbeats efêmeros intermediários ('status': 'running') de execuções já finalizadas.
    2. Elimina eventos 'started' de estágios efêmeros (build_release, testes_release, auditoria_release) já finalizados.
    3. Para eventos com idade > max_age_days e fora da janela de max_recent_events:
       - Agrega 'tarefa' e 'consumo_agy' em registros consolidados de rollup ('stage': 'metrics_rollup') por data e (task_key, model).
    4. Se archive=True, salva os registros originais descartados em data/autoloop_metrics_archive.jsonl.gz (compactação fria gzip).
    5. Executa escrita atômica segura via arquivo temporário e os.replace.
    """
    root = Path(root).resolve()
    metrics_path = root / 'data/autoloop_metrics.jsonl'
    archive_path = root / 'data/autoloop_metrics_archive.jsonl.gz'

    stats = {
        'original_lines': 0,
        'final_lines': 0,
        'heartbeats_removed': 0,
        'ephemeral_started_removed': 0,
        'rollups_created': 0,
        'bytes_freed': 0,
        'archived_count': 0
    }

    if not metrics_path.is_file():
        return stats

    try:
        raw_text = metrics_path.read_text(encoding='utf-8')
    except OSError:
        return stats

    raw_lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
    stats['original_lines'] = len(raw_lines)
    if not raw_lines:
        return stats

    records = []
    for line in raw_lines:
        try:
            item = json.loads(line)
            if isinstance(item, dict):
                records.append(item)
        except Exception:
            continue

    if not records:
        return stats

    # 1. Identificar runs concluídos (que possuem evento com status terminal)
    finished_runs = set()
    for item in records:
        status = item.get('status')
        rid = item.get('run_id')
        if status in {'passed', 'failed', 'timeout', 'finished', 'interrupted', 'reported', 'incomplete'} and rid:
            finished_runs.add(rid)

    # 2. Definir janela recente vs janela antiga
    cutoff = time.time() - (float(max_age_days) * 86400.0)
    total_records = len(records)
    recent_cutoff_idx = max(0, total_records - max_recent_events)

    recent_records = []
    old_records = []
    discarded_for_archive = []

    for idx, item in enumerate(records):
        ts = item.get('time', 0)
        status = item.get('status')
        stage = item.get('stage', '')
        rid = item.get('run_id')

        # Elimina heartbeats de runs que já terminaram
        if status == 'running' and rid in finished_runs:
            stats['heartbeats_removed'] += 1
            discarded_for_archive.append(item)
            continue

        # Elimina eventos 'started' de estágios efêmeros cujas execuções já terminaram
        if status == 'started' and stage in {'build_release', 'testes_release', 'auditoria_release', 'ciclo_agy'} and rid in finished_runs:
            stats['ephemeral_started_removed'] += 1
            discarded_for_archive.append(item)
            continue

        # Elimina 'started' de esperas/sleeps entre ciclos
        if stage.startswith('espera_') and status == 'started':
            stats['ephemeral_started_removed'] += 1
            discarded_for_archive.append(item)
            continue

        # Classifica em recente vs antigo para consolidação/rollup
        if idx >= recent_cutoff_idx or ts >= cutoff:
            recent_records.append(item)
        else:
            old_records.append(item)

    # 3. Consolidação / Rollup dos registros antigos
    rollup_buckets = {}
    other_old_records = []

    for item in old_records:
        stage = item.get('stage')
        ts = item.get('time', 0)
        task_key = item.get('task_key')
        model = item.get('model')

        if stage in {'tarefa', 'consumo_agy', 'metrics_rollup'} and task_key and model:
            date_str = datetime.fromtimestamp(ts, tz=timezone.utc).strftime('%Y-%m-%d') if ts else 'unknown'
            key = (date_str, str(task_key), str(model))
            bucket = rollup_buckets.setdefault(key, {
                'period': date_str,
                'task_key': task_key,
                'model': model,
                'latest_time': ts,
                'finished_attempts': 0,
                'approved_cycles': 0,
                'seconds': 0.0,
                'usage_records': 0,
                'tokens': {},
                'records_merged': 0
            })
            bucket['latest_time'] = max(bucket['latest_time'], ts)
            bucket['records_merged'] += 1
            discarded_for_archive.append(item)

            if stage == 'tarefa':
                st = item.get('status')
                if st in {'passed', 'pending', 'failed'}:
                    bucket['finished_attempts'] += 1
                    bucket['approved_cycles'] += 1 if st == 'passed' else 0
                    bucket['seconds'] += float(item.get('seconds', 0.0) or 0.0)
            elif stage == 'consumo_agy':
                bucket['usage_records'] += 1
                usage = item.get('tokens')
                if isinstance(usage, dict):
                    for tok_name, tok_val in usage.items():
                        if isinstance(tok_val, int) and tok_val >= 0:
                            bucket['tokens'][tok_name] = bucket['tokens'].get(tok_name, 0) + tok_val
                dur = float(item.get('seconds', 0.0) or 0.0)
                if dur > 0 and bucket['finished_attempts'] == 0:
                    bucket['seconds'] += dur
            elif stage == 'metrics_rollup':
                bucket['finished_attempts'] += item.get('finished_attempts', 0)
                bucket['approved_cycles'] += item.get('approved_cycles', 0)
                bucket['seconds'] += float(item.get('seconds', 0.0) or 0.0)
                bucket['usage_records'] += item.get('usage_records', 0)
                usage = item.get('tokens')
                if isinstance(usage, dict):
                    for tok_name, tok_val in usage.items():
                        if isinstance(tok_val, int) and tok_val >= 0:
                            bucket['tokens'][tok_name] = bucket['tokens'].get(tok_name, 0) + tok_val
        else:
            other_old_records.append(item)

    # Cria registros consolidados de rollup
    rollup_records = []
    for bucket in rollup_buckets.values():
        rec = {
            'time': bucket['latest_time'],
            'stage': 'metrics_rollup',
            'period': bucket['period'],
            'task_key': bucket['task_key'],
            'model': bucket['model'],
            'finished_attempts': bucket['finished_attempts'],
            'approved_cycles': bucket['approved_cycles'],
            'seconds': round(bucket['seconds'], 3),
            'usage_records': bucket['usage_records'],
            'tokens': bucket['tokens'] if bucket['tokens'] else None,
            'records_merged': bucket['records_merged']
        }
        rollup_records.append(rec)
        stats['rollups_created'] += 1

    final_records = other_old_records + rollup_records + recent_records
    final_records.sort(key=lambda x: x.get('time', 0))
    stats['final_lines'] = len(final_records)

    orig_size = metrics_path.stat().st_size
    estimated_new_size = sum(len(json.dumps(x, ensure_ascii=False).encode('utf-8')) + 1 for x in final_records)
    stats['bytes_freed'] = max(0, orig_size - estimated_new_size)

    # 4. Arquivamento frio em gzip
    if archive and discarded_for_archive and not dry_run:
        try:
            archive_path.parent.mkdir(parents=True, exist_ok=True)
            with gzip.open(archive_path, 'at', encoding='utf-8') as gz_out:
                for item in discarded_for_archive:
                    gz_out.write(json.dumps(item, ensure_ascii=False) + '\n')
            stats['archived_count'] = len(discarded_for_archive)
        except Exception:
            pass

    # 5. Escrita atômica do arquivo ativo compactado
    if not dry_run and len(final_records) < len(records):
        temp_file = metrics_path.with_name(f'.autoloop_metrics.jsonl.tmp.{os.getpid()}')
        try:
            with temp_file.open('w', encoding='utf-8') as out:
                for item in final_records:
                    out.write(json.dumps(item, ensure_ascii=False) + '\n')
            os.replace(temp_file, metrics_path)
            stats['bytes_freed'] = max(0, orig_size - metrics_path.stat().st_size)
        except Exception:
            if temp_file.exists():
                temp_file.unlink(missing_ok=True)
            raise

    return stats


def prune_artifacts(root=Path('.'), max_age_days=5, max_releases=30, max_test_reports=15, max_backups=15, dry_run=False) -> dict:
    """
    Rotina centralizada de auto-pruning de artefatos antigos.
    Executa limpeza com salvaguardas e retorna sumário consolidado.
    """
    root = Path(root).resolve()
    stats = {
        'scoped_contexts': 0,
        'scoped_receipts': 0,
        'audit_repairs': 0,
        'test_reports': 0,
        'task_notes': 0,
        'backups': 0,
        'metrics_heartbeats_removed': 0,
        'metrics_rollups_created': 0,
        'total_removed': 0,
        'bytes_freed': 0
    }

    try:
        res = prune_scoped_audits(root, max_age_days=max_age_days, max_releases=max_releases, dry_run=dry_run)
        stats['scoped_contexts'] = res.get('contexts', 0)
        stats['scoped_receipts'] = res.get('receipts', 0)
        stats['bytes_freed'] += res.get('bytes', 0)
    except Exception:
        pass

    try:
        res = prune_audit_repairs(root, max_age_days=max_age_days, max_releases=max_releases, dry_run=dry_run)
        stats['audit_repairs'] = res.get('repairs', 0)
        stats['bytes_freed'] += res.get('bytes', 0)
    except Exception:
        pass

    try:
        res = prune_test_reports(root, max_age_days=max_age_days, max_test_reports=max_test_reports, dry_run=dry_run)
        stats['test_reports'] = res.get('reports', 0)
        stats['bytes_freed'] += res.get('bytes', 0)
    except Exception:
        pass

    try:
        res = prune_task_notes(root, max_age_days=max_age_days, max_notes=max_releases, dry_run=dry_run)
        stats['task_notes'] = res.get('notes', 0)
        stats['bytes_freed'] += res.get('bytes', 0)
    except Exception:
        pass

    try:
        res = prune_autoloop_backups(root, max_age_days=max_age_days, max_backups=max_backups, dry_run=dry_run)
        stats['backups'] = res.get('backups', 0)
        stats['bytes_freed'] += res.get('bytes', 0)
    except Exception:
        pass

    try:
        res_m = prune_and_rollup_metrics(root, max_age_days=max_age_days, max_recent_events=300, dry_run=dry_run)
        stats['metrics_heartbeats_removed'] = res_m.get('heartbeats_removed', 0)
        stats['metrics_rollups_created'] = res_m.get('rollups_created', 0)
        stats['bytes_freed'] += res_m.get('bytes_freed', 0)
    except Exception:
        pass

    stats['total_removed'] = (
        stats['scoped_contexts'] + stats['scoped_receipts'] +
        stats['audit_repairs'] + stats['test_reports'] +
        stats['task_notes'] + stats['backups'] +
        stats['metrics_heartbeats_removed']
    )

    return stats


def main():
    parser = argparse.ArgumentParser(description="Limpeza automática de artefatos antigos do autoloop e rollup de métricas")
    parser.add_argument("--root", default=".", help="Raiz do repositório")
    parser.add_argument("--days", type=int, default=5, help="Idade máxima em dias para retenção")
    parser.add_argument("--releases", type=int, default=30, help="Quantidade mínima de releases recentes a manter")
    parser.add_argument("--metrics-only", action="store_true", help="Executa exclusivamente o rollup e compactação de métricas")
    parser.add_argument("--dry-run", action="store_true", help="Simula sem excluir arquivos")

    args = parser.parse_args()
    if args.metrics_only:
        res_m = prune_and_rollup_metrics(root=args.root, max_age_days=args.days, dry_run=args.dry_run)
        mode = " [SIMULAÇÃO]" if args.dry_run else ""
        kb = res_m['bytes_freed'] / 1024
        print(f"🗜️ [METRICS-ROLLUP]{mode} Concluído: {res_m['original_lines']} -> {res_m['final_lines']} linhas ({kb:.1f} KB liberados).")
        print(f"   - Heartbeats efêmeros removidos: {res_m['heartbeats_removed']}")
        print(f"   - Eventos started efêmeros removidos: {res_m['ephemeral_started_removed']}")
        print(f"   - Registros de rollup criados: {res_m['rollups_created']}")
        print(f"   - Registros arquivados (.jsonl.gz): {res_m['archived_count']}")
        return

    res = prune_artifacts(root=args.root, max_age_days=args.days, max_releases=args.releases, dry_run=args.dry_run)

    mb = res['bytes_freed'] / (1024 * 1024)
    mode = " [SIMULAÇÃO]" if args.dry_run else ""
    print(f"🧹 [AUTO-PRUNE]{mode} Concluído: {res['total_removed']} artefatos expurgados ({mb:.2f} MB liberados).")
    print(f"   - Contextos de auditoria: {res['scoped_contexts']}")
    print(f"   - Recibos de release: {res['scoped_receipts']}")
    print(f"   - Pacotes de reparo: {res['audit_repairs']}")
    print(f"   - Relatórios de testes: {res['test_reports']}")
    print(f"   - Notas de tarefas: {res['task_notes']}")
    print(f"   - Backups do autoloop: {res['backups']}")
    print(f"   - Heartbeats de métricas limpos: {res['metrics_heartbeats_removed']}")
    print(f"   - Rollups de métricas criados: {res['metrics_rollups_created']}")


if __name__ == '__main__':
    main()
