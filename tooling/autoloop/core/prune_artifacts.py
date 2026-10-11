"""
Módulo de limpeza e retenção automática de artefatos de auditoria, testes e contexto.
Evita acúmulo desnecessário de arquivos em data/scoped_audits/, data/audit_repairs/,
data/test_reports/, data/autoloop_task_notes/ e data/autoloop_backups/.
"""
from pathlib import Path
import argparse
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

    stats['total_removed'] = (
        stats['scoped_contexts'] + stats['scoped_receipts'] +
        stats['audit_repairs'] + stats['test_reports'] +
        stats['task_notes'] + stats['backups']
    )

    return stats


def main():
    parser = argparse.ArgumentParser(description="Limpeza automática de artefatos antigos do autoloop")
    parser.add_argument("--root", default=".", help="Raiz do repositório")
    parser.add_argument("--days", type=int, default=5, help="Idade máxima em dias para retenção")
    parser.add_argument("--releases", type=int, default=30, help="Quantidade mínima de releases recentes a manter")
    parser.add_argument("--dry-run", action="store_true", help="Simula sem excluir arquivos")

    args = parser.parse_args()
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


if __name__ == '__main__':
    main()
