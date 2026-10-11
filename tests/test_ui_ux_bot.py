# -*- coding: utf-8 -*-
"""
Testes automatizados da nova camada de UI/UX do bot do Telegram:
- Teclado ergonômico com Sala Vermelha
- Receita médica 100% padronizada (mesma fonte Arial, mesmo tamanho 11pt, cor #000000, máxima sobriedade)
- Semáforos e atualização de status de leito em 1 toque
- Chips rápidos de peso para DVA
- Entrega de resposta da IA sem truncamento artificial
"""

import subprocess
import json
import pytest
import os

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_DIR = os.path.join(ROOT_DIR, "src")

def run_js(code):
    js_preamble = f"""
    const fs = require('fs');
    const _cacheStore = {{}};
    global.CacheService = {{
        getScriptCache: () => ({{
            get: k => _cacheStore[k] ?? null,
            put: (k, v) => _cacheStore[k] = v,
            remove: k => delete _cacheStore[k]
        }})
    }};
    global.enviarChatAction = () => {{}};
    eval(fs.readFileSync('{SRC_DIR}/00_config.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/01_utils.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/02_calculadoras_puras.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/02_soap_ambulatorial.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/03_bases_locais.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/04_motores_ia.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/05_notion.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/06_rotina_agenda.js', 'utf8'));
    for (const f of fs.readdirSync('{SRC_DIR}').sort().filter(f => f.startsWith('07') && f.endsWith('.js'))) eval(fs.readFileSync('{SRC_DIR}/' + f, 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/08_main.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/09_enfermaria.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/10_pdf_receita.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/11_entrega_confiavel.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/12_experiencia_bot.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/13_cockpit_integracao.js', 'utf8'));
    """
    full_code = js_preamble + "\n" + code
    res = subprocess.run(["node", "-e", full_code], capture_output=True, text=True, check=True)
    return res.stdout.strip()

def test_teclado_ergonomico_sala_vermelha():
    js = """
    var kb = obterTecladoFixoPrincipal();
    console.log(JSON.stringify(kb));
    """
    out = json.loads(run_js(js))
    linhas = [[b["text"] for b in linha] for linha in out["keyboard"]]
    assert len(linhas) == 3, "O teclado ergonômico universal possui 3 linhas"
    assert "🚨 Sala Vermelha" in linhas[0]
    assert "🛏️ Enfermaria" in linhas[0]
    assert "🩺 Ambulatório" in linhas[1]
    assert "💊 Consultas de Bolso" in linhas[1]
    assert any("Cockpit" in t for t in linhas[2])
    assert out.get("resize_keyboard") is True
    assert out.get("is_persistent") is False

def test_receita_medica_sobria_e_uniforme():
    js = """
    var prescricao = "1) Amoxicilina 500mg - 21 cápsulas\\n" +
      "   • Posologia: Tomar 1 cápsula VO de 8/8h por 7 dias\\n" +
      "2) Paracetamol 750mg - 10 comprimidos\\n" +
      "   • Posologia: Tomar 1 comprimido se dor a cada 6h\\n" +
      "Orientações ao Paciente:\\n- Beber bastante água";

    var html = ReceitaPdfService.gerarHtml(prescricao, "03/10/2026", "Mariana Souza");
    console.log(JSON.stringify({
        html: html,
        temCorAzul: /#0[23]84c[17]|#0369a1|#cbd5e1/i.test(html),
        temCorCinza: /#475569|#1e293b|#0f172a/i.test(html),
        fonteUniformeArial: html.indexOf("font-family: Arial, sans-serif") !== -1,
        tamanhoUniforme11pt: html.indexOf("font-size: 11pt") !== -1,
        corPadraoPreta: html.indexOf("color: #000000") !== -1
    }));
    """
    out = json.loads(run_js(js))
    assert out["temCorAzul"] is False, "A receita não deve conter cores azuis"
    assert out["temCorCinza"] is False, "A receita não deve conter tons de cinza ou ardósia"
    assert out["fonteUniformeArial"] is True, "A receita deve usar Arial padronizada"
    assert out["tamanhoUniforme11pt"] is True, "A receita deve usar tamanho 11pt padronizado"
    assert out["corPadraoPreta"] is True, "A receita deve ser estritamente em preto (#000000)"

def test_enfermaria_status_um_toque():
    js = """
    EnfermariaService.atualizarLeito('10', 'Paciente 62a, DPOC estável');
    var r1 = EnfermariaService.atualizarStatusLeito('10', 'instavel');
    var l1 = EnfermariaService.obterLeito('10');
    var r2 = EnfermariaService.atualizarStatusLeito('10', 'estavel');
    var l2 = EnfermariaService.obterLeito('10');
    var painel = EnfermariaService.formatarPainelBordo();
    console.log(JSON.stringify({
        status1: l1.status,
        status2: l2.status,
        painelContemCenso: painel.indexOf("estáveis") !== -1
    }));
    """
    out = json.loads(run_js(js))
    assert "Instável" in out["status1"]
    assert "Estável" in out["status2"]
    assert out["painelContemCenso"] is True

def test_resposta_ia_nao_truncada():
    js = """
    var sentMessages = [];
    enviarMensagemComTecladoParaChat = function(chat, text, kb) {
        sentMessages.push({ text: text, kb: kb });
    };
    enviarMensagemSegmentada = function(chat, text, kb) {
        sentMessages.push({ text: text, kb: kb, segmentada: true });
    };

    var textoLongo = "PARTE INICIAL CLINICA: " + "A".repeat(2000) + " FINAL DA CONDUTA.";
    var geradorMock = function() { return textoLongo; };

    processarEEntregarIA(12345, geradorMock, "caso simulado", "soap");

    console.log(JSON.stringify({
        qtdMensagens: sentMessages.length,
        contemTextoCompleto: sentMessages[0].text.indexOf("FINAL DA CONDUTA") !== -1,
        naoContemAvisoTruncado: sentMessages[0].text.indexOf("Resultado preparado. Abra o texto completo") === -1,
        temBotaoCopiarLimpo: sentMessages[0].kb.inline_keyboard[0][0].text.indexOf("Copiar") !== -1
    }));
    """
    out = json.loads(run_js(js))
    assert out["qtdMensagens"] == 1
    assert out["contemTextoCompleto"] is True
    assert out["naoContemAvisoTruncado"] is True
    assert out["temBotaoCopiarLimpo"] is True

def test_ux_botoes_bot_limite_64_bytes():
    js = """
    var botaoCurto = ['Curto', 'ux:droga:nora'];
    var botaoLongo = ['Longo', 'ux:' + 'a'.repeat(70)];
    var kb = botoesBot([[botaoCurto, botaoLongo]]);
    console.log(JSON.stringify(kb));
    """
    out = json.loads(run_js(js))
    assert out["inline_keyboard"][0][0]["callback_data"] == "ux:droga:nora"
    assert out["inline_keyboard"][0][1]["callback_data"] == "ux:invalido"

def test_ux_texto_prontuario_limpeza():
    js = """
    var raw = "🫀 *AVALIAÇÃO CARDÍACA*\\n- PA: 120x80 mmHg\\n• `SpO2 98%`\\n_Sem sopros_";
    var limpo = uxTextoProntuario(raw);
    console.log(JSON.stringify({ limpo: limpo }));
    """
    out = json.loads(run_js(js))
    assert "*" not in out["limpo"]
    assert "`" not in out["limpo"]
    assert "🫀" not in out["limpo"]
    assert "AVALIAÇÃO CARDÍACA" in out["limpo"]
    assert "PA: 120x80 mmHg" in out["limpo"]

def test_hub_central_e_comandos_nativos_enxutos():
    js = """
    var sent = [];
    global.enviarMensagemComTecladoParaChat = function(chat, text, kb) {
        sent.push({ chat: chat, text: text, kb: kb });
        return true;
    };
    global.obterUrlCockpit = function() { return 'https://example.test/exec?session=teste'; };
    enviarHubPrincipal(999);
    var cmds = [];
    global.ConfigService = { get: function() { return 'fake_token'; } };
    global.executarPostTelegram = function(url, payload) {
        cmds = payload.commands;
        return true;
    };
    registrarComandosNativosTelegram();
    console.log(JSON.stringify({
        hubSent: sent.length,
        hubTexto: sent[0].text,
        hubBotoesQtd: sent[0].kb.inline_keyboard.length,
        comandosQtd: cmds.length,
        comandosLista: cmds.map(function(c) { return c.command; })
    }));
    """
    out = json.loads(run_js(js))
    assert out["hubSent"] == 1
    assert "Ultra Rotina · Central de Comandos" in out["hubTexto"]
    assert out["hubBotoesQtd"] == 4
    assert out["comandosQtd"] == 5
    assert out["comandosLista"] == ["menu", "novo", "cancelar", "teclado", "ajuda"]




def test_soap_preserva_resposta_sem_titulo_duplicado():
    out = json.loads(run_js("""
    var enviado;
    enviarMensagemComTecladoParaChat = function(chat, text, kb) { enviado = {text, kb}; };
    var original = "🩺 *SÍNTESE SOAP · REGISTRO CONSOLIDADO*\\n\\n🧠 *A - Avaliação*\\nConteúdo clínico integral.";
    processarEEntregarIA(12345, function() { return original; }, "caso", "soap");
    console.log(JSON.stringify({igual: enviado.text === original, texto: enviado.text}));
    """))
    assert out["igual"] is True
    assert "Resumo Clínico" not in out["texto"]
