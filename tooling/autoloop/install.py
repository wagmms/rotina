#!/usr/bin/env python3
"""Instala os arquivos revisados; preserva backup e controle visual."""
from pathlib import Path
from datetime import datetime, timezone
import argparse
import hashlib
import json
import os
import shutil

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).resolve().parent


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def install(home=Path.home()):
    manifest = json.loads((SOURCE / "install_manifest.json").read_text())
    executable = home / ".local/bin/autoloop"
    valid_hashes = {manifest.get("original_executable_sha256"), sha(SOURCE / "autoloop.py")}
    if "known_executable_sha256" in manifest:
        valid_hashes.update(manifest["known_executable_sha256"])
    if sha(executable) not in valid_hashes:
        raise RuntimeError("Executável original mudou após a preparação; instalação cancelada.")
    pairs = [(SOURCE / "core/execution.py", home / ".local/lib/autoloop_core/execution.py"),
             (SOURCE / "autoloop.py", executable)]
    pairs += [(SOURCE / 'core' / name, home / '.local/lib/autoloop_core' / name)
              for name in ['failure_queue.py', 'queue_policy.json', 'task_context.py', 'audit_repairs.py', 'scoped_audit.py', 'loop_guard.py', 'observation.py']]
    runner = home / '.local/bin/ia-hub-janela-runner'
    if runner.exists() and sha(runner) not in {manifest['original_runner_sha256'], sha(SOURCE / 'visual_runner.py')}:
        raise RuntimeError('Runner visual mudou após a preparação; instalação cancelada.')
    pairs.append((SOURCE / 'visual_runner.py', runner))
    # Instala o executável por último, após todas as dependências.
    pairs.sort(key=lambda pair: pair[1] == executable)
    # Compilar em memória antes de qualquer escrita no executável ativo.
    for source, target in pairs:
        if source.suffix == '.py':
            compile(source.read_text(), str(target), "exec")
        elif source.suffix == '.json':
            json.loads(source.read_text())
    backup = ROOT / "data/autoloop_backups" / datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    backup.mkdir(parents=True)
    modified = []
    try:
        for source, target in pairs:
            original = backup / target.name
            existed = target.exists()
            if existed:
                shutil.copy2(target, original)
            mode = (target.stat().st_mode & 0o777) if existed else 0o644
            temp = target.with_name(target.name + f".upgrade-{os.getpid()}.tmp")
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, temp)
            temp.chmod(mode)
            os.replace(temp, target)
            modified.append((target, original, existed))
        # Verificação por conteúdo; sem iniciar contas, CLI ou deploy.
        for source, target in pairs:
            if sha(source) != sha(target):
                raise RuntimeError(f"Instalação divergente: {target}")
    except BaseException:
        for target, original, existed in reversed(modified):
            if existed:
                shutil.copy2(original, target)
            else:
                target.unlink(missing_ok=True)
        raise
    (backup / "manifest.json").write_text(json.dumps({
        "files": {str(target): sha(target) for _, target in pairs}
    }, indent=2) + "\n")
    print(f"Autoloop instalado e conferido. Backup: {backup}")


def resume(home=Path.home()):
    state = ROOT / "data/.autoloop_upgrade_state.json"
    if not state.exists():
        print("Nenhuma pausa visual iniciada por esta atualização.")
        return
    prior = json.loads(state.read_text())["prior_visual_target"]
    control = home / ".cache/ia-hub/alvo_visual.txt"
    if prior != "rotina" or control.read_text().strip() != "pausar":
        print("Controle visual mudou; escolha atual preservada.")
        return
    temp = control.with_name(f".alvo_visual_upgrade-{os.getpid()}.tmp")
    temp.write_text(prior)
    os.replace(temp, control)
    state.unlink()
    print("Alvo Rotina restaurado; o runner visual iniciará o novo executável.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()
    if args.resume:
        resume()
    else:
        install()
