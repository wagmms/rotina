#!/usr/bin/env python3
"""
ORQUESTRADOR PRINCIPAL — BOT TESTADOR PRIME 2.0 (testador_prime.py)
Uso:
  python3 -m tooling.testador_prime.testador_prime --mode all --cycles 1
  python3 -m tooling.testador_prime.testador_prime --mode cockpit
  python3 -m tooling.testador_prime.testador_prime --mode telegram --cycles 2
"""

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, Any

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from tooling.testador_prime.ux_heuristics import UXHeuristicsAuditor
from tooling.testador_prime.telegram_engine import TelegramEnginePrime
from tooling.testador_prime.cockpit_engine import CockpitEnginePrime
from tooling.testador_prime.prime_reporter import PrimeReporter


class NodeBridgeClient:
    """Gerencia o processo filho `node_bridge_prime.cjs` via pipes STDIN/STDOUT."""
    def __init__(self, bridge_script: Path):
        self.bridge_script = bridge_script
        self.proc: subprocess.Popen | None = None

    def start(self) -> Dict[str, Any]:
        self.proc = subprocess.Popen(
            ["node", str(self.bridge_script)],
            cwd=str(ROOT_DIR),
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        if not self.proc.stdout:
            raise RuntimeError("Falha ao abrir STDOUT da ponte Node.js.")

        while True:
            line = self.proc.stdout.readline()
            if not line:
                err_out = self.proc.stderr.read() if self.proc.stderr else ""
                raise RuntimeError(f"A ponte Node.js encerrou prematuramente: {err_out}")
            trimmed = line.strip()
            if trimmed.startswith("{") and trimmed.endswith("}"):
                try:
                    data = json.loads(trimmed)
                    if data.get("ready"):
                        return data
                except json.JSONDecodeError:
                    pass

    def send(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self.proc or not self.proc.stdin or not self.proc.stdout:
            return {"ok": False, "error": "Ponte Node.js inativa."}
        try:
            self.proc.stdin.write(json.dumps(payload, ensure_ascii=False) + "\n")
            self.proc.stdin.flush()
            while True:
                line = self.proc.stdout.readline()
                if not line:
                    return {"ok": False, "error": "Resposta vazia da ponte Node.js."}
                trimmed = line.strip()
                if trimmed.startswith("{") and trimmed.endswith("}"):
                    try:
                        return json.loads(trimmed)
                    except json.JSONDecodeError:
                        pass
        except Exception as exc:
            return {"ok": False, "error": f"Erro de comunicação com a ponte: {exc}"}

    def close(self):
        if self.proc:
            try:
                self.send({"cmd": "EXIT"})
                self.proc.terminate()
                self.proc.wait(timeout=3)
            except Exception:
                self.proc.kill()


def parse_args():
    parser = argparse.ArgumentParser(description="Bot Testador Prime 2.0 — Auditoria Telegram + Cockpit PWA")
    parser.add_argument(
        "--mode",
        choices=["all", "telegram", "cockpit"],
        default="all",
        help="Define qual motor executar: 'all' (padrão), 'telegram' ou 'cockpit'."
    )
    parser.add_argument(
        "--cycles",
        type=int,
        default=1,
        help="Quantidade de ciclos de repetição para os fluxos do Telegram."
    )
    parser.add_argument(
        "--persona",
        choices=["todas", "emergencista", "r1_clinico", "rotina_gestor", "caotico_fuzzer", "estudante_socratico"],
        default="todas",
        help="Persona médica a simular: 'todas' (padrão), 'emergencista', 'r1_clinico', 'rotina_gestor', 'caotico_fuzzer' ou 'estudante_socratico'."
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Exibe logs detalhados passo a passo no terminal."
    )
    return parser.parse_args()


def main():
    args = parse_args()
    start_time = time.perf_counter()

    bridge_path = Path(__file__).resolve().parent / "node_bridge_prime.cjs"
    bridge = NodeBridgeClient(bridge_path)

    print("⚡ Iniciando Bot Testador Prime 2.0...")
    try:
        status = bridge.start()
        if args.verbose:
            print(f"   [Bridge Ready] Fastify={status.get('fastify')} | Runtime={status.get('runtime')}")
    except Exception as exc:
        print(f"❌ Erro fatal ao iniciar ponte Node.js: {exc}", file=sys.stderr)
        sys.exit(1)

    ux_auditor = UXHeuristicsAuditor()
    tg_report = None
    ck_report = None

    try:
        if args.mode in ("all", "telegram"):
            print(f"🤖 Executando Motor Telegram Prime (Ciclos: {args.cycles} | Persona: {args.persona})...")
            tg_engine = TelegramEnginePrime(bridge.send, ux_auditor, verbose=args.verbose)
            tg_report = tg_engine.run_all(cycles=args.cycles, persona=args.persona)

        if args.mode in ("all", "cockpit"):
            print("📱 Executando Motor Cockpit PWA & Fastify API...")
            ck_engine = CockpitEnginePrime(ROOT_DIR, bridge.send, ux_auditor, verbose=args.verbose)
            ck_report = ck_engine.run_all()

    finally:
        bridge.close()

    elapsed = time.perf_counter() - start_time
    reporter = PrimeReporter(ROOT_DIR, ux_auditor)
    consolidated = reporter.generate_all(tg_report, ck_report, elapsed)

    # Retorna código de saída diferente de zero apenas se houver falha crítica real
    critical_count = sum(1 for f in consolidated["achados_ux_e_erros"] if f["severidade"] == "CRITICA")
    sys.exit(1 if critical_count > 0 else 0)


if __name__ == "__main__":
    main()
