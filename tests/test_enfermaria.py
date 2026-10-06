# -*- coding: utf-8 -*-
"""
Testes automatizados do módulo de Enfermaria Virtual (EnfermariaService).
Garante persistência de múltiplos leitos, inferência de gravidade e consolidação de passagem.
"""

import subprocess
import json
import pytest
import os

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_DIR = os.path.join(ROOT_DIR, "src")

def run_js_enfermaria(script_code):
    js_preamble = f"""
    const fs = require('fs');
    eval(fs.readFileSync('{SRC_DIR}/00_config.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/01_utils.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/09_enfermaria.js', 'utf8'));
    """
    full_code = js_preamble + "\n" + script_code
    res = subprocess.run(["node", "-e", full_code], capture_output=True, text=True, check=True)
    return res.stdout.strip()

def test_enfermaria_vazia():
    js = """
    EnfermariaService.limparTudo();
    var painel = EnfermariaService.formatarPainelBordo();
    console.log(JSON.stringify({vazio: painel.indexOf("NENHUM LEITO") !== -1}));
    """
    out = json.loads(run_js_enfermaria(js))
    assert out["vazio"] is True

def test_atualizar_leito_e_status():
    js = """
    EnfermariaService.limparTudo();
    var r1 = EnfermariaService.atualizarLeito(4, "72a, choque septico foco pulmonar, em nora 0.3 mcg/kg/min\\nStatus: instável");
    var r2 = EnfermariaService.atualizarLeito(8, "45a, pós-operatório estável, tolerando dieta\\nStatus: estável");
    var r3 = EnfermariaService.atualizarLeito(12, "60a, exames normais, alta programada para hoje\\nStatus: alta programada");

    var leitos = EnfermariaService.obterTodos();
    console.log(JSON.stringify({
        s4: leitos["4"].status,
        s8: leitos["8"].status,
        s12: leitos["12"].status
    }));
    """
    out = json.loads(run_js_enfermaria(js))
    assert "Instável" in out["s4"]
    assert "Estável" in out["s8"]
    assert "Alta" in out["s12"]

def test_painel_e_ordenacao_numerica():
    js = """
    EnfermariaService.limparTudo();
    EnfermariaService.atualizarLeito(14, "Paciente leito 14");
    EnfermariaService.atualizarLeito(2, "Paciente leito 2");
    EnfermariaService.atualizarLeito(7, "Paciente leito 7");

    var painel = EnfermariaService.formatarPainelBordo();
    var textoConsolidado = EnfermariaService.obterTextoConsolidadoParaPassagem();

    var pos2 = painel.indexOf("LEITO 2");
    var pos7 = painel.indexOf("LEITO 7");
    var pos14 = painel.indexOf("LEITO 14");

    console.log(JSON.stringify({
        ordenado: (pos2 < pos7 && pos7 < pos14),
        temConsolidado: textoConsolidado.indexOf("LEITO 2") !== -1
    }));
    """
    out = json.loads(run_js_enfermaria(js))
    assert out["ordenado"] is True
    assert out["temConsolidado"] is True

def test_desocupar_leito():
    js = """
    EnfermariaService.limparTudo();
    EnfermariaService.atualizarLeito(5, "Paciente leito 5");
    var rDes = EnfermariaService.desocuparLeito(5);
    var leito5 = EnfermariaService.obterLeito(5);

    console.log(JSON.stringify({
        sucesso: rDes.sucesso,
        existe: leito5 !== null
    }));
    """
    out = json.loads(run_js_enfermaria(js))
    assert out["sucesso"] is True
    assert out["existe"] is False
