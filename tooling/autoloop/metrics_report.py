#!/usr/bin/env python3
"""Relatório local de duração e consumo explícito, sem chamadas a modelos."""
from pathlib import Path
import json
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent / 'core'))
from observability import ObservabilityHub

if __name__ == '__main__':
    root = Path(__file__).resolve().parents[2]
    hub = ObservabilityHub(root)
    print(json.dumps(hub.summarize_metrics(), ensure_ascii=False, indent=2))

