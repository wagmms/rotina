# -*- coding: utf-8 -*-
"""
Validação da Rotina Adaptativa (Time-Blocking Dinâmico, Overrides e Handlers).
Executa a bateria de testes unitários em Node.js tests/test_rotina_adaptativa.cjs.
"""

import os
import subprocess
import pytest

TEST_CJS = os.path.join(os.path.dirname(__file__), "test_rotina_adaptativa.cjs")

def test_rotina_adaptativa_completa():
    """Executa os 16 testes de especificação da Rotina Adaptativa."""
    res = subprocess.run(["node", TEST_CJS], capture_output=True, text=True)
    assert res.returncode == 0, f"Erro na execução dos testes de rotina adaptativa:\nSTDOUT: {res.stdout}\nSTDERR: {res.stderr}"
    assert "TODOS OS 16 TESTES DA ROTINA ADAPTATIVA FORAM APROVADOS COM SUCESSO!" in res.stdout
