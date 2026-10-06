# -*- coding: utf-8 -*-
"""
Testes automatizados dos Utilitários e Sanitizador de Markdown do Telegram.
"""

import subprocess
import json
import pytest
import os

SRC_UTILS = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "01_utils.js"))
SRC_CONFIG = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "00_config.js"))

def run_js_util(expr):
    js_code = f"""
    const fs = require('fs');
    eval(fs.readFileSync('{SRC_CONFIG}', 'utf8'));
    eval(fs.readFileSync('{SRC_UTILS}', 'utf8'));
    const res = {expr};
    console.log(JSON.stringify(res));
    """
    res = subprocess.run(["node", "-e", js_code], capture_output=True, text=True, check=True)
    return json.loads(res.stdout.strip())

def test_limpar_markdown_asteriscos():
    # Asterisco sem par deve ser removido
    res = run_js_util("limparMarkdownTelegram('*Texto em negrito* e outro *aberto')")
    assert res == "*Texto em negrito* e outro aberto"

def test_limpar_markdown_underscores():
    # Underscore sem par deve ser removido
    res = run_js_util("limparMarkdownTelegram('_Texto italico_ e outro _aberto')")
    assert res == "_Texto italico_ e outro aberto"

def test_limpar_latex_para_texto_simples():
    # Remove $...$ e $$...$$ e \frac
    res = run_js_util("limparMarkdownTelegram('A dose é $\\\\frac{100}{2}$ mg e $$x = 10$$')")
    assert "$" not in res
    assert "(100 / 2)" in res

def test_fragmentar_texto_com_emojis():
    # Texto grande com quebra e emojis
    texto_longo = "Linha de teste\\n" * 300 + "🩺 Fim do caso"
    res = run_js_util(f"fragmentarTexto('{texto_longo}', 1500)")
    assert len(res) > 1
    # Todas as partes devem respeitar o limite máximo
    for parte in res:
        assert len(parte) <= 1500
