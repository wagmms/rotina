#!/usr/bin/env python3
"""Inicia uma coleta local independente, com prazo e documento compacto."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parent / 'core'))
from observability import ObservabilityHub
from observation import atomic_json, collect_once
ROOT = Path(__file__).resolve().parents[2]
STATE = ROOT / 'data/.autoloop_observation.json'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--hours', type=float, default=24)
    parser.add_argument('--worker', action='store_true')
    parser.add_argument('--status', action='store_true')
    args = parser.parse_args()
    hub = ObservabilityHub(ROOT)
    if args.status:
        print(hub.get_observation_status())
        return
    if not 0 < args.hours <= 168:
        parser.error('--hours deve estar entre 0 e 168 (exclusivo de zero).')
    # flock mantém apenas um coletor mesmo se houver dois pedidos simultâneos.
    import fcntl
    STATE.parent.mkdir(parents=True, exist_ok=True)
    with (STATE.parent / '.autoloop_observation.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print('Coleta já em funcionamento; prazo atual preservado.')
            return
        if not args.worker:
            fcntl.flock(lock, fcntl.LOCK_UN)
            process = subprocess.Popen([sys.executable, str(Path(__file__).resolve()), '--worker', '--hours', str(args.hours)],
                                       cwd=ROOT, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                                       stderr=subprocess.DEVNULL, start_new_session=True)
            print(f'Coleta de {args.hours:g}h iniciada (PID {process.pid}). Documento: {ROOT / "data/autoloop_observacao.md"}')
            return
        state = json.loads(STATE.read_text()) if STATE.exists() else {}
        if state.get('ends_at', 0) <= time.time():
            started = time.time()
            state = {'version': 1, 'hours': args.hours, 'started_at': started,
                     'ends_at': started + args.hours * 3600, 'offset': 0,
                     'events_file': f'data/autoloop_observations/{uuid.uuid4().hex}.jsonl'}
        state['collector_pid'] = os.getpid()
        while True:
            try:
                hub.collect_telemetry(state)
            except OSError:
                # Observabilidade não altera nenhuma etapa nem aprovação do autoloop.
                pass
            remaining = state['ends_at'] - time.time()
            if remaining <= 0:
                return
            time.sleep(min(30, remaining))


if __name__ == '__main__':
    main()
