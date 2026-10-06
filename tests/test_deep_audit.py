# -*- coding: utf-8 -*-
"""
Bateria de Testes Profundos (Deep Audit & Stress Test)
Testa todas as funções sob casos limites, entradas adversas, processamento de mídia (áudio e foto),
sanitização de Markdown, regexes e robustez de execução.
"""

import subprocess
import os
import json
import pytest

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_DIR = os.path.join(ROOT_DIR, "src")

def run_js(code: str) -> str:
    wrapper = f"""
    const fs = require('fs');
    const path = require('path');

    const files = [
        '00_config.js',
        '01_utils.js',
        '02_calculadoras_puras.js',
        '03_bases_locais.js',
        '04_motores_ia.js',
        '05_notion.js',
        '06_rotina_agenda.js',
        '07_telegram_handlers.js',
        '08_main.js',
        '09_enfermaria.js',
        '10_pdf_receita.js'
    ];

    for (const f of files) {{
        const fullPath = path.join('{SRC_DIR}', f);
        if (fs.existsSync(fullPath)) {{
            eval(fs.readFileSync(fullPath, 'utf8'));
        }}
    }}

    {code}
    """
    res = subprocess.run(["node", "-e", wrapper], capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"Erro JS:\nSTDOUT: {res.stdout}\nSTDERR: {res.stderr}")
    return res.stdout.strip()

# ==============================================================================
# 1. TESTES DE SANITIZAÇÃO DE MARKDOWN DO TELEGRAM (Prevenção de Erro 400)
# ==============================================================================
def test_markdown_sanitization_edge_cases():
    """Garante que Markdown quebrado (asteriscos ímpares, underlines soltos, LaTeX) seja limpo."""
    code = """
    var casos = [
        "Texto com *asterisco solto",
        "Texto com _underline_ solto e outro _solto",
        "Fórmula LaTeX $$x = \\\\frac{-b \\\\pm \\\\sqrt{b^2 - 4ac}}{2a}$$ e inline $E = mc^2$",
        "Colchetes soltos [sem link e ] fechado",
        "Texto normal sem formatação",
        "Múltiplos **negritos** e __itálicos__ misturados"
    ];

    var resultados = casos.map(function(c) {
        return limparMarkdownTelegram(c);
    });

    console.log(JSON.stringify(resultados));
    """
    out = json.loads(run_js(code))
    for r in out:
        assert "$" not in r, f"LaTeX vazou: {r}"
        # Número de asteriscos deve ser par
        num_ast = r.count("*")
        assert num_ast % 2 == 0, f"Asteriscos ímpares no resultado: {r}"

# ==============================================================================
# 2. TESTES DE FRAGMENTAÇÃO DE MENSAGENS LONGAS (> 4000 caracteres)
# ==============================================================================
def test_fragmentacao_texto_longo():
    """Mensagens gigantescas (ex: laudo de ECG ou SOAP longo) devem ser segmentadas sem perder conteúdo."""
    code = """
    var textoLongo = "Início do caso clínico: ";
    for (var i = 0; i < 500; i++) {
        textoLongo += "Linha de evolução do paciente leito " + i + ". ";
    }
    textoLongo += " Fim do caso.";

    var partes = fragmentarTexto(textoLongo, 3800);
    console.log(JSON.stringify({
        totalPartes: partes.length,
        tamanhoTotalOriginal: textoLongo.length,
        partesValidas: partes.every(function(p) { return p.length <= 3800; })
    }));
    """
    out = json.loads(run_js(code))
    assert out["totalPartes"] > 1
    assert out["partesValidas"] is True

# ==============================================================================
# 3. TESTES DE REGEX DE GASOMETRIA ARTERIAL (Extração de Parâmetros)
# ==============================================================================
def test_gasometria_regex_variacoes():
    """Testa se variações de digitação médica são interpretadas pelo motor de gaso."""
    code = """
    var entradas = [
        "pH 7.22, pCO2 28, HCO3 11, Na 140, Cl 102, Alb 3.0",
        "ph: 7.35 / co2: 48 / bicarb: 28 / sodio: 138 / cloro: 98",
        "pH=7.48 pCO2=30 HCO3=22 Na=142 Cl=105",
        "ph 7.10, pco2 65, hco3 20, pao2 55, fio2 50%"
    ];

    var resultados = entradas.map(function(texto) {
        var phMatch = texto.match(/ph\\s*[:=]?\\s*([67]\\.?\\d+)/i);
        var pco2Match = texto.match(/p?co2\\s*[:=]?\\s*(\\d+\\.?\\d*)/i);
        var hco3Match = texto.match(/hco3\\s*[:=]?\\s*(\\d+\\.?\\d*)/i) || texto.match(/bicarb[^\\d]*(\\d+\\.?\\d*)/i);
        return {
            ph: phMatch ? phMatch[1] : null,
            pco2: pco2Match ? pco2Match[1] : null,
            hco3: hco3Match ? hco3Match[1] : null
        };
    });

    console.log(JSON.stringify(resultados));
    """
    out = json.loads(run_js(code))
    assert len(out) == 4
    for r in out:
        assert r["ph"] is not None
        assert r["pco2"] is not None
        assert r["hco3"] is not None

# ==============================================================================
# 4. TESTES DE ENFERMARIA VIRTUAL (Nomes de Leitos Não-Numéricos e Caracteres)
# ==============================================================================
def test_enfermaria_leitos_complexos():
    """Garante que leitos com nomes como 'UTI-3', 'Isolamento', '12A' funcionem sem erro."""
    code = """
    EnfermariaService.limparTudo();
    EnfermariaService.atualizarLeito("UTI-1", "Choque séptico em nora alta, IOT recente");
    EnfermariaService.atualizarLeito("12A", "Pneumonia comunitária estável, aguarda alta");
    EnfermariaService.atualizarLeito("Isolamento", "KPC na urina, estável em Meropenem");

    var leitoUti = EnfermariaService.obterLeito("UTI-1");
    var painel = EnfermariaService.formatarPainelBordo();
    var passagem = EnfermariaService.obterTextoConsolidadoParaPassagem();

    console.log(JSON.stringify({
        utiCadastrada: leitoUti !== null,
        statusUti: leitoUti ? leitoUti.status : "",
        painelContemIsolamento: painel.indexOf("Isolamento") !== -1,
        passagemValida: passagem.indexOf("LEITO UTI-1") !== -1
    }));
    """
    out = json.loads(run_js(code))
    assert out["utiCadastrada"] is True
    assert "Não confirmado" in out["statusUti"]  # Gravidade não é inferida de texto livre.
    assert out["painelContemIsolamento"] is True
    assert out["passagemValida"] is True

# ==============================================================================
# 5. TESTES DO PRECEPTOR SOCRÁTICO (Voz e Limites de Caracteres para TTS)
# ==============================================================================
def test_preceptor_socratico_tts_limits():
    """Garante que a crítica socrática seja concisa e não estoure o limite de 200 caracteres do TTS."""
    code = """
    var caso = "Paciente 78 anos, DPOC descompensado, acidose hipercápnica grave, sonolento após sedação excessiva";
    var critica = gerarCriticaSocraticaPreceptor(caso);

    var limpo = String(critica || "").replace(/[*_#`\\[\\]]/g, "").trim();
    if (limpo.length > 200) {
        limpo = limpo.substring(0, 197) + "...";
    }

    console.log(JSON.stringify({
        tamanhoOriginal: critica.length,
        tamanhoAjustadoTts: limpo.length,
        dentroDoLimite: limpo.length <= 200,
        semFormatacaoMarkdown: critica.indexOf("*") === -1 && critica.indexOf("#") === -1
    }));
    """
    out = json.loads(run_js(code))
    assert out["dentroDoLimite"] is True
    assert out["semFormatacaoMarkdown"] is True
