# -*- coding: utf-8 -*-
"""
Testes automatizados do gerador de receituário A4 em PDF (ReceitaPdfService).
Valida formatação HTML, extração de paciente, estrutura A4 e geração de PDF.
"""

import subprocess
import json
import pytest
import os

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_DIR = os.path.join(ROOT_DIR, "src")

def run_js_pdf(script_code):
    js_preamble = f"""
    const fs = require('fs');
    global.CacheService = {{ getScriptCache: () => ({{get: () => null}}) }};
    eval(fs.readFileSync('{SRC_DIR}/00_config.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/01_utils.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/03_bases_locais.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/07_telegram_handlers.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/10_pdf_receita.js', 'utf8'));
    """
    full_code = js_preamble + "\n" + script_code
    res = subprocess.run(["node", "-e", full_code], capture_output=True, text=True, check=True)
    return res.stdout.strip()

def test_gerar_html_receituario():
    js = """
    var prescricao = "💊 PRESCRIÇÃO AMBULATORIAL\\n" +
      "Paciente: Carlos da Silva\\n" +
      "1) Amoxicilina 500mg - 21 cápsulas\\n" +
      "   • Posologia: Tomar 1 cápsula por via oral de 8/8h por 7 dias\\n" +
      "2) Dipirona 500mg/mL - 1 frasco\\n" +
      "   • Posologia: Tomar 35 gotas se dor ou febre até 6/6h\\n" +
      "Orientações ao Paciente:\\n- Tomar o antibiótico junto com as refeições\\n" +
      "NOTAS CLÍNICAS & MEMÓRIA DE CÁLCULO:\\n" +
      "• Indicação: Amigdalite aguda estreptocócica\\n" +
      "• Memória de cálculo: 50mg/kg/dia / 3 = 150mg/dose\\n" +
      "• ATENÇÃO: Medicamentos validados por IA com base na REMUME.";

    var html = ReceitaPdfService.gerarHtml(prescricao, "03/10/2026", "Carlos da Silva");
    console.log(JSON.stringify({
        temTitulo: html.indexOf("RECEITUÁRIO MÉDICO") !== -1,
        naoTemWagner: html.indexOf("Wagner") === -1,
        naoTemUSP: html.indexOf("USP") === -1,
        temPaciente: html.indexOf("Carlos da Silva") !== -1,
        temAmoxi: html.indexOf("Amoxicilina 500mg") !== -1,
        temPosologia: html.indexOf("Tomar 1 cápsula por via oral") !== -1,
        temOrientacoes: html.indexOf("Tomar o antibiótico junto com as refeições") !== -1,
        temEstiloA4: html.indexOf("size: A4 portrait") !== -1,
        naoTemMemoriaCalculo: html.indexOf("50mg/kg/dia") === -1,
        naoTemNotasClinicas: html.indexOf("NOTAS CLÍNICAS") === -1,
        naoTemDisclaimerIA: html.indexOf("validados por IA") === -1
    }));
    """
    out = json.loads(run_js_pdf(js))
    assert out["temTitulo"] is True
    assert out["naoTemWagner"] is True
    assert out["naoTemUSP"] is True
    assert out["temPaciente"] is True
    assert out["temAmoxi"] is True
    assert out["temPosologia"] is True
    assert out["temOrientacoes"] is True
    assert out["temEstiloA4"] is True
    assert out["naoTemMemoriaCalculo"] is True
    assert out["naoTemNotasClinicas"] is True
    assert out["naoTemDisclaimerIA"] is True

def test_processar_e_enviar_pdf_mock():
    js = """
    global.enviarDocumentoTelegram = function(chatId, blob, legenda) { return true; };
    var prescricao = "1) Cefalexina 500mg VO 6/6h por 7 dias";
    var res = ReceitaPdfService.processarEEnviarPdf("1771571035", prescricao);
    console.log(JSON.stringify({
        sucesso: res.sucesso,
        nomeValido: res.nomeArquivo.endsWith(".pdf")
    }));
    """
    out = json.loads(run_js_pdf(js))
    assert out["sucesso"] is True
    assert out["nomeValido"] is True
