# -*- coding: utf-8 -*-
"""
Testes automatizados das Calculadoras Clínicas Determinísticas (JavaScript puro)
Validação de precisão matemática médica contra gabaritos internacionais (KDIGO, SBC, MDCalc).
"""

import subprocess
import json
import pytest
import os

SRC_CALC = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "02_calculadoras_puras.js"))

def run_js_calc(expr):
    """Executa uma expressão JavaScript importando o módulo de calculadoras."""
    js_code = f"""
    const fs = require('fs');
    eval(fs.readFileSync('{SRC_CALC}', 'utf8'));
    const res = {expr};
    console.log(JSON.stringify(res));
    """
    res = subprocess.run(["node", "-e", js_code], capture_output=True, text=True, check=True)
    return json.loads(res.stdout.strip())

def test_curb65_baixo_risco():
    # Jovem, sem sinais de gravidade -> score 0
    res = run_js_calc("CalculadorasClinicas.curb65(false, 30, 18, 120, 80, 40)")
    assert res["pontuacao"] == "0/5"
    assert "Baixo Risco" in res["risco"]

def test_curb65_alto_risco():
    # 71 anos, confuso, ureia 68, fr 32, pa 85/50 -> score 5
    res = run_js_calc("CalculadorasClinicas.curb65(true, 68, 32, 85, 50, 71)")
    assert res["pontuacao"] == "5/5"
    assert "Alto Risco" in res["risco"]
    assert len(res["criterios"]) == 5

def test_cockcroft_gault_homem_e_mulher():
    # Homem 70 anos, 72 kg, Cr 1.0 -> (140-70)*72 / (72*1.0) = 70 mL/min
    res_m = run_js_calc("CalculadorasClinicas.cockcroftGault(1.0, 72, 70, false)")
    assert res_m["clearance"] == 70.0

    # Mulher com mesmos parâmetros -> 70 * 0.85 = 59.5 mL/min
    res_f = run_js_calc("CalculadorasClinicas.cockcroftGault(1.0, 72, 70, true)")
    assert res_f["clearance"] == 59.5

def test_ckd_epi_2021():
    # Homem 60 anos, Cr 1.0 -> ~88 mL/min (G2)
    res = run_js_calc("CalculadorasClinicas.ckdEpi2021(1.0, 60, false)")
    assert 85 <= res["tfg"] <= 92
    assert res["estagio"] in ["G1", "G2"]

    # Mulher 70 anos, Cr 2.5 -> Falência ou G4
    res_grave = run_js_calc("CalculadorasClinicas.ckdEpi2021(2.5, 70, true)")
    assert res_grave["tfg"] < 30
    assert res_grave["estagio"] in ["G4", "G5"]

def test_cha2ds2vasc_estratificacao():
    # Mulher (1), 76 anos (2), Hipertensa (1), Diabética (1) -> score 5
    res = run_js_calc("CalculadorasClinicas.cha2ds2vasc(false, true, true, true, false, false, false, true)")
    assert res["pontuacao"] == 5
    assert "Alto risco" in res["recomendacao"]

def test_wells_tep_dicotomico():
    # Sinais TVP (+3), TEP hipótese principal (+3) -> score 6.0 (TEP PROVÁVEL)
    res = run_js_calc("CalculadorasClinicas.wellsTEP(true, true, false, false, false, false, false)")
    assert "PROVÁVEL" in res["classificacao"]
    assert "Angiotomografia" in res["conduta"]

def test_deficit_agua_livre():
    # Homem idoso, 60 kg, Na 160 -> ACT = 60 * 0.5 = 30; Deficit = 30 * (160/140 - 1) = 4.3 L
    res = run_js_calc("CalculadorasClinicas.deficitAguaLivre(160, 140, 60, 'Homem idoso')")
    assert 4.1 <= res["deficitLitros"] <= 4.5

def test_glasgow_p():
    # Normal: O4 + V5 + M6 = 15; pupilas reagem (0) -> 15/15
    res_normal = run_js_calc("CalculadorasClinicas.glasgowP(4, 5, 6, 0)")
    assert res_normal["glasgowP"] == "15/15"
    assert "TCE Leve" in res_normal["gravidade"]

    # Grave: O1 + V1 + M1 = 3; 2 pupilas não reagem (-2) -> 1/15
    res_grave = run_js_calc("CalculadorasClinicas.glasgowP(1, 1, 1, 2)")
    assert res_grave["glasgowP"] == "1/15"
    assert "TCE Grave" in res_grave["gravidade"]

def test_cha2ds2va_esc_2024():
    # ESC 2024 / SBC 2025: Idade 68a (+1), HAS (+1) -> 2 pontos
    res = run_js_calc("CalculadorasClinicas.cha2ds2va(false, true, false, false, false, false, true)")
    assert res["ok"] is True
    assert res["dados"]["pontos"] == 2
    assert "ANTICOAGULAÇÃO RECOMENDADA" in res["estado"]

def test_cockcroft_gault_peso_ajustado_obeso():
    # Homem 50 anos, 120 kg, 170 cm (IMC ~41.5), Cr 1.0 -> Deve usar peso ajustado
    res = run_js_calc("CalculadorasClinicas.cockcroftGault(1.0, 120, 50, false, 170)")
    assert res["ok"] is True
    assert "ajustado" in res["dados"]["tipoPeso"]
    assert res["dados"]["pesoUsadoKg"] < 120

def test_calcio_corrigido_payne():
    # Ca 7.5, Alb 2.5 -> Ca corr = 7.5 + 0.8 * (4 - 2.5) = 8.7 (Normal)
    res = run_js_calc("CalculadorasClinicas.calcioCorrigido(7.5, 2.5)")
    assert res["ok"] is True
    assert res["dados"]["calcioCorrigido"] == 8.7
    assert "Normocalcemia" in res["status"]

def test_gap_osmolar_intoxicacao():
    # Osm medida 315, Na 140, Glic 90, Ureia 30 -> Osm calc = 280 + 5 + 5 = 290. Gap = 25 (> 10)
    res = run_js_calc("CalculadorasClinicas.gapOsmolar(315, 140, 90, 30)")
    assert res["ok"] is True
    assert res["dados"]["gapOsmolar"] > 10
    assert "GAP OSMOLAR ELEVADO" in res["estado"]

def test_kdigo_estadiamento_ira():
    # Cr atual 2.5 com basal 1.0 (2.5x) -> Estágio 2
    res = run_js_calc("CalculadorasClinicas.estadiamentoKDIGO(2.5, 1.0, null, null)")
    assert res["ok"] is True
    assert res["dados"]["estagio"] == 2

def test_blindagem_nemotron_entradas_invalidas():
    # Entrada com texto em vez de número
    res_inval = run_js_calc("CalculadorasClinicas.curb65(false, 'cem', 20, 120, 80, 40)")
    assert res_inval["ok"] is False
    assert res_inval["estado"] == "NÃO CALCULADO"

