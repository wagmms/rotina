# -*- coding: utf-8 -*-
"""
Testes automatizados do módulo de Bases Locais e Filtro Inteligente da REMUME.
"""

import subprocess
import json
import pytest
import os

SRC_BASES = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "03_bases_locais.js"))
SRC_UTILS = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "01_utils.js"))
SRC_CONFIG = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "00_config.js"))

def run_js_bases(expr):
    js_code = f"""
    const fs = require('fs');
    eval(fs.readFileSync('{SRC_CONFIG}', 'utf8'));
    eval(fs.readFileSync('{SRC_UTILS}', 'utf8'));
    eval(fs.readFileSync('{SRC_BASES}', 'utf8'));
    const res = {expr};
    console.log(JSON.stringify(res));
    """
    res = subprocess.run(["node", "-e", js_code], capture_output=True, text=True, check=True)
    return json.loads(res.stdout.strip())

def test_normalizar_texto():
    res = run_js_bases("normalizarTexto('Amoxicilina + Clavulanato 500mg')")
    assert "amoxicilina" in res
    assert "clavulanato" in res

def test_filtro_remume_por_sindrome():
    # Base fictícia simulando 50 linhas da REMUME
    mock_base = "\\n".join([
        "Dipirona 500mg comp",
        "Amoxicilina 500mg caps",
        "Nitrofurantoina 100mg comp",
        "Sulfametoxazol + Trimetoprima 400/80mg comp",
        "Losartana Potassica 50mg comp",
        "Metformina 850mg comp",
        "Ibuprofeno 600mg comp",
        "Omeprazol 20mg caps",
        "Ceftriaxona 1g injetavel",
        "Salbutamol 100mcg spray"
    ] * 6)

    # Consulta com queixa de cistite
    res = run_js_bases(f"filtrarMedicamentosRelevantes('{mock_base}', 'paciente com cistite e disuria')")
    assert "Nitrofurantoina" in res or "Sulfametoxazol" in res

def test_dicionario_marca_comercial_glifage():
    # Consulta mencionando Glifage deve mapear para Metformina
    mock_base = "Metformina 850mg comp\\nLosartana 50mg comp\\nDipirona 500mg\\n" * 15
    res = run_js_bases(f"filtrarMedicamentosRelevantes('{mock_base}', 'glifage para controle glicemico')")
    assert "Metformina" in res
