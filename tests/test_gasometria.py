# -*- coding: utf-8 -*-
"""
Testes automatizados do Motor Determinístico de Gasometria e Equilíbrio Ácido-Base.
Validações contra casos padrão-ouro da Terapia Intensiva / FMRP-USP.
"""

import subprocess
import json
import pytest
import os

SRC_CALC = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "02_calculadoras_puras.js"))

def run_js_gaso(expr):
    js_code = f"""
    const fs = require('fs');
    eval(fs.readFileSync('{SRC_CALC}', 'utf8'));
    const res = {expr};
    console.log(JSON.stringify(res));
    """
    res = subprocess.run(["node", "-e", js_code], capture_output=True, text=True, check=True)
    return json.loads(res.stdout.strip())

def test_acidose_metabolica_com_winter_adequado():
    # pH 7.20, pCO2 23, HCO3 10
    # Winter: 1.5 * 10 + 8 = 23 (+/- 2: 21 a 25). pCO2 real 23 está perfeitamente na faixa.
    res = run_js_gaso("CalculadorasClinicas.gasometria(7.20, 23, 10, 140, 105, 4.0, null, null)")
    assert "Acidose Metabólica" in res["disturbio"]
    assert "compensatória adequada" in res["avaliacaoCompensacao"]
    assert res["anionGap"] == 25.0
    assert "ELEVADO" in res["interpretacaoAG"]

def test_acidose_metabolica_com_acidose_respiratoria_associada():
    # pH 7.15, pCO2 35, HCO3 10
    # Winter esperava pCO2 entre 21 e 25. Com 35, há retenção inadequada -> Acidose Respiratória associada!
    res = run_js_gaso("CalculadorasClinicas.gasometria(7.15, 35, 10, 140, 105, 4.0, null, null)")
    assert "Acidose Respiratória associada" in res["avaliacaoCompensacao"]

def test_anion_gap_corrigido_por_albumina():
    # Na 140, Cl 100, HCO3 15 -> AG aparente = 140 - 115 = 25
    # Albumina baixa (2.0) -> AG corrigido = 25 + 2.5 * (4 - 2) = 30
    res = run_js_gaso("CalculadorasClinicas.gasometria(7.28, 30, 15, 140, 100, 2.0, null, null)")
    assert res["anionGap"] == 25.0
    assert res["anionGapCorrigido"] == 30.0

def test_relacao_pao2_fio2_sdra_moderada():
    # PaO2 80, FiO2 40% (0.4) -> P/F = 80 / 0.4 = 200
    res = run_js_gaso("CalculadorasClinicas.gasometria(7.35, 40, 24, null, null, null, 80, 40)")
    assert res["pfRatio"] == 200
    assert "SDRA Moderada" in res["classificacaoPF"]

def test_alcalose_metabolica_primaria():
    # pH 7.50, pCO2 46, HCO3 35
    res = run_js_gaso("CalculadorasClinicas.gasometria(7.50, 46, 35, 140, 95, 4.0, null, null)")
    assert "Alcalose Metabólica" in res["disturbio"]
    assert "compensatória adequada" in res["avaliacaoCompensacao"]
