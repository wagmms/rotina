# -*- coding: utf-8 -*-
"""
Teste automatizado para Cache Local Criptografado, IndexedDB, Fila Offline e Telemetria no Cockpit PWA.
"""

import subprocess
import os
import pytest

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def test_cockpit_offline_indexeddb_e_telemetria():
    res = subprocess.run(
        ["node", os.path.join(ROOT_DIR, "tests", "test_cockpit_offline_indexeddb.cjs")],
        capture_output=True,
        text=True,
        check=True
    )
    assert "TODOS OS TESTES DE CACHE CRIPTOGRAFADO, INDEXEDDB E TELEMETRIA PASSARAM COM SUCESSO!" in res.stdout
