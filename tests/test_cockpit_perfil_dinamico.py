# -*- coding: utf-8 -*-
"""
Teste automatizado para o Perfil Dinâmico e Registro de Pesagem do Cockpit Móvel.
Garante que os dados hardcoded foram eliminados e substituídos por RPC autenticado.
"""

import subprocess
import os
import pytest

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def test_cockpit_perfil_dinamico_e_peso():
    res = subprocess.run(
        ["node", os.path.join(ROOT_DIR, "tests", "test_cockpit_perfil_dinamico.cjs")],
        capture_output=True,
        text=True,
        check=True
    )
    assert "TODOS OS 5 TESTES DE PERFIL DINÂMICO APROVADOS!" in res.stdout
