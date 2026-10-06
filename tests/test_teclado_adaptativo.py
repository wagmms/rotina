# -*- coding: utf-8 -*-
"""
Teste automatizado para Teclados Adaptativos Contextuais e Máquina de Estados de UI/UX.
Garante que o bot alterna dinamicamente o teclado de rodapé conforme o contexto clínico
e permite reset limpo em 1 toque.
"""

import subprocess
import os
import pytest

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def test_teclado_adaptativo_e_maquina_de_estados():
    res = subprocess.run(
        ["node", os.path.join(ROOT_DIR, "tests", "test_teclado_adaptativo.cjs")],
        capture_output=True,
        text=True,
        check=True
    )
    assert "TODOS OS TESTES DE TECLADOS ADAPTATIVOS APROVADOS!" in res.stdout
