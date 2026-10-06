# -*- coding: utf-8 -*-
"""
Testes automatizados das Calculadoras de Sala Vermelha (DVA e SRI/IOT).
Garante precisão milimétrica de doses em ampolas, miligramas e vazão em mL/h.
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

def test_noradrenalina_padrao_70kg():
    # 70 kg, solução padrão (64 mcg/mL).
    # Dose 0.1 mcg/kg/min -> (0.1 * 70 * 60) / 64 = 420 / 64 = 6.5625 -> ~6.6 mL/h
    res = run_js_calc("CalculadorasClinicas.drogasVasoativas('noradrenalina', 70, 'padrao')")
    assert res["droga"] == "Noradrenalina"
    assert res["concentracaoMcgMl"] == 64
    assert res["pesoKg"] == 70
    tabela = {item["doseMcgKgMin"]: item["mlH"] for item in res["tabela"]}
    assert tabela[0.1] == 6.6
    assert tabela[0.2] == 13.1
    assert tabela[0.5] == 32.8
    assert tabela[1.0] == 65.6
    assert "PAM ≥ 65 mmHg" in res["textoFormatado"]

def test_noradrenalina_concentrada_80kg():
    # 80 kg, solução concentrada (128 mcg/mL).
    # Dose 0.5 mcg/kg/min -> (0.5 * 80 * 60) / 128 = 2400 / 128 = 18.75 -> 18.8 mL/h
    res = run_js_calc("CalculadorasClinicas.drogasVasoativas('nora', 80, 'concentrada')")
    assert res["concentracaoMcgMl"] == 128
    tabela = {item["doseMcgKgMin"]: item["mlH"] for item in res["tabela"]}
    assert tabela[0.5] == 18.8
    assert tabela[1.0] == 37.5

def test_dobutamina_70kg():
    # Dobutamina 1000 mcg/mL.
    # Dose 5 mcg/kg/min em 70 kg -> (5 * 70 * 60) / 1000 = 21000 / 1000 = 21.0 mL/h
    res = run_js_calc("CalculadorasClinicas.drogasVasoativas('dobutamina', 70)")
    assert res["droga"] == "Dobutamina"
    tabela = {item["doseMcgKgMin"]: item["mlH"] for item in res["tabela"]}
    assert tabela[5.0] == 21.0
    assert tabela[10.0] == 42.0

def test_vasopressina():
    # Taxa fixa de choque séptico (SSC 2021: 0,03 UI/min) = 9 mL/h
    res = run_js_calc("CalculadorasClinicas.drogasVasoativas('vasopressina', 70)")
    assert res["droga"] == "Vasopressina"
    assert res["taxaMlH"] == 9.0
    assert "9 mL/h" in res["textoFormatado"]

def test_sri_doses_70kg():
    # Paciente 70 kg
    res = run_js_calc("CalculadorasClinicas.sequenciaRapidaIntubacao(70, 'padrao')")
    assert res["pesoKg"] == 70
    # Etomidato: 0.3 mg/kg = 21 mg -> ampola 2 mg/mL = 10.5 mL
    assert res["etomidato"]["doseMg"] == 21.0
    assert res["etomidato"]["ml"] == 10.5
    # Succinilcolina: 1.5 mg/kg = 105 mg -> frasco 10 mg/mL = 10.5 mL
    assert res["succinilcolina"]["doseMg"] == 105
    assert res["succinilcolina"]["ml"] == 10.5
    # Rocurônio: 1.2 mg/kg = 84 mg -> frasco 10 mg/mL = 8.4 mL
    assert res["rocuronio"]["doseMg"] == 84.0
    assert res["rocuronio"]["ml"] == 8.4
    # Fentanil: 2 mcg/kg = 140 mcg -> ampola 50 mcg/mL = 2.8 mL
    assert res["fentanil"]["doseMcg"] == 140
    assert res["fentanil"]["ml"] == 2.8

def test_sri_contexto_choque():
    res = run_js_calc("CalculadorasClinicas.sequenciaRapidaIntubacao(80, 'choque septico')")
    assert "Etomidato" in res["textoFormatado"]
    assert "Evite Midazolam e Propofol" in res["textoFormatado"]
