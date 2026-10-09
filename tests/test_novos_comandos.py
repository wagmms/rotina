# -*- coding: utf-8 -*-
"""
Testes automatizados das novas rotinas e funções do copiloto clínico e Notion.
"""

import subprocess
import json
import pytest
import os

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_DIR = os.path.join(ROOT_DIR, "src")

def run_js_handlers(script_code):
    js_preamble = f"""
    const fs = require('fs');
    eval(fs.readFileSync('{SRC_DIR}/00_config.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/01_utils.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/02_calculadoras_puras.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/03_bases_locais.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/04_motores_ia.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/05_notion.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/06_rotina_agenda.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/07_telegram_handlers.js', 'utf8'));
    eval(fs.readFileSync('{SRC_DIR}/08_main.js', 'utf8'));
    """
    full_code = js_preamble + "\n" + script_code
    res = subprocess.run(["node", "-e", full_code], capture_output=True, text=True, check=True)
    return res.stdout.strip()

def test_prescricao_alergia_diretriz():
    # Verifica que o prompt contém a diretriz de checagem cruzada
    with open(os.path.join(SRC_DIR, "04_motores_ia.js"), "r", encoding="utf-8") as f:
        content = f.read()
    assert "CHECAGEM CRUZADA OBRIGATÓRIA" in content
    assert "penicilina" in content

def test_gasometria_extracao_regex():
    # Testa extração de regex na função de gasometria
    js_test = """
    var texto = 'pH 7.22, pCO2 28, HCO3 11, Na 140, Cl 102, Alb 3.0, PaO2 85, FiO2 21%';
    var phMatch = texto.match(/ph\\s*[:=]?\\s*([67]\\.?\\d+)/i);
    var pco2Match = texto.match(/p?co2\\s*[:=]?\\s*(\\d+\\.?\\d*)/i);
    var hco3Match = texto.match(/hco3\\s*[:=]?\\s*(\\d+\\.?\\d*)/i);
    var resCalc = CalculadorasClinicas.gasometria(phMatch[1], pco2Match[1], hco3Match[1], 140, 102, 3.0, 85, 21);
    console.log(JSON.stringify({disturbio: resCalc.disturbio, ag: resCalc.anionGapCorrigido}));
    """
    out = run_js_handlers(js_test)
    data = json.loads(out)
    assert "Acidose Metabólica" in data["disturbio"]
    assert data["ag"] == 29.5

def test_novos_comandos_em_main():
    with open(os.path.join(SRC_DIR, "08_main.js"), "r", encoding="utf-8") as f:
        content = f.read()
    for cmd in ["gaso", "conduta", "task", "tasks", "duvida", "dva", "sri", "agenda", "plantao_fim", "teclado"]:
        assert f'"{cmd}"' in content

def test_teclado_fixo_principal_estrutura():
    js_test = """
    var kb = obterTecladoFixoPrincipal();
    console.log(JSON.stringify(kb));
    """
    out = run_js_handlers(js_test)
    data = json.loads(out)
    assert data["resize_keyboard"] is True
    assert data["is_persistent"] is True
    linhas = [[btn["text"] for btn in linha] for linha in data["keyboard"]]
    assert len(linhas) == 3
    assert "🩺 SOAP Ambulatorial" in linhas[0]
    assert "🚨 Emergência" in linhas[1]
    assert "📱 Cockpit Mini App" in linhas[2]

def test_classificador_intencao_heuristica():
    js_test = """
    var r1 = classificarIntencaoMensagem("marcar plantao amanha as 7h no HC");
    var r2 = classificarIntencaoMensagem("treinei peito e triceps na academia");
    var r3 = classificarIntencaoMensagem("receita para amigdalite bacteriana");
    console.log(JSON.stringify([r1.intencao, r2.intencao, r3.intencao]));
    """
    out = run_js_handlers(js_test)
    data = json.loads(out)
    assert data[0] == "CALENDAR_CRIAR"
    assert data[1] == "HABITO_PROATIVO"
    assert data[2] == "CLINICO_RX"

def test_dva_sri_entrega_botoes_inline():
    js_test = """
    var sent = [];
    var fakeCache = {};
    global.CacheService = {
      getScriptCache: function() {
        return {
          get: function(k) { return fakeCache[k] || null; },
          put: function(k, v) { fakeCache[k] = v; },
          remove: function(k) { delete fakeCache[k]; }
        };
      }
    };
    global.enviarMensagemComTecladoParaChat = function(chatId, texto, teclado) {
      sent.push({ chatId: chatId, texto: texto, teclado: teclado });
      return true;
    };
    global.enviarMensagemParaChat = function(chatId, texto) {
      sent.push({ chatId: chatId, texto: texto, teclado: null });
      return true;
    };
    processarMensagemTexto({ chat: { id: 123 }, text: "/dva nora 70" });
    processarMensagemTexto({ chat: { id: 123 }, text: "/sri 70 choque" });
    console.log(JSON.stringify(sent));
    """
    out = run_js_handlers(js_test)
    data = json.loads(out)
    assert len(data) == 2
    # DVA deve ter botões inline
    assert data[0]["teclado"] is not None
    assert "inline_keyboard" in data[0]["teclado"]
    dva_cb = [b["callback_data"] for row in data[0]["teclado"]["inline_keyboard"] for b in row]
    assert "calc:dva:dose" in dva_cb or "calc:dva:criterios" in dva_cb

    # SRI deve ter botões inline
    assert data[1]["teclado"] is not None
    assert "inline_keyboard" in data[1]["teclado"]
    sri_cb = [b["callback_data"] for row in data[1]["teclado"]["inline_keyboard"] for b in row]
    assert "calc:sri:checklist" in sri_cb
    assert "calc:sri:vad" in sri_cb

def test_callbacks_calc_v3_e_catch_all():
    js_test = """
    var sent = [];
    var fakeCache = {};
    global.CacheService = {
      getScriptCache: function() {
        return {
          get: function(k) { return fakeCache[k] || null; },
          put: function(k, v) { fakeCache[k] = v; },
          remove: function(k) { delete fakeCache[k]; }
        };
      }
    };
    global.responderCallbackTelegram = function(id, toast) {
      sent.push({ tipo: "toast", id: id, toast: toast });
      return true;
    };
    global.enviarMensagemParaChat = function(chatId, texto) {
      sent.push({ tipo: "msg", chatId: chatId, texto: texto });
      return true;
    };
    global.enviarMensagemComTecladoParaChat = function(chatId, texto, kb) {
      sent.push({ tipo: "msg_kb", chatId: chatId, texto: texto, kb: kb });
      return true;
    };

    processarCallbackBotao({ id: "cb1", data: "calc:curb65:criterios", message: { chat: { id: 123 } } });
    processarCallbackBotao({ id: "cb2", data: "calc:sri:checklist", message: { chat: { id: 123 } } });
    processarCallbackBotao({ id: "cb3", data: "calc:sri:vad", message: { chat: { id: 123 } } });
    processarCallbackBotao({ id: "cb4", data: "calc:cg:ajuste", message: { chat: { id: 123 } } });
    processarCallbackBotao({ id: "cb5", data: "callback_desconhecido_999", message: { chat: { id: 123 } } });

    console.log(JSON.stringify(sent));
    """
    out = run_js_handlers(js_test)
    data = json.loads(out)

    # Toast vazio para cb1, cb2, cb3, cb4 (desarma spinner)
    toasts = [x for x in data if x.get("tipo") == "toast"]
    assert len(toasts) == 5
    assert toasts[0]["toast"] == ""
    assert toasts[1]["toast"] == ""
    assert toasts[2]["toast"] == ""
    assert toasts[3]["toast"] == ""
    # Catch-all deve avisar que ação não é reconhecida
    assert "não reconhecida" in toasts[4]["toast"]

    # Mensagens de conteúdo clínico entregues
    msgs = [x for x in data if x.get("tipo") == "msg"]
    textos = [m["texto"] for m in msgs]
    assert any("CURB-65" in t for t in textos)
    assert any("CHECKLIST DOS 7 Ps" in t for t in textos)
    assert any("LEMON" in t for t in textos)
    assert any("REVISÃO DE AJUSTE RENAL" in t for t in textos)

def test_sanitizacao_peso_virgula_e_faixa():
    js_test = """
    var res = [
      sanitizarEValidarPesoKg("70,5"),
      sanitizarEValidarPesoKg("70.5"),
      sanitizarEValidarPesoKg("80"),
      sanitizarEValidarPesoKg("0"),
      sanitizarEValidarPesoKg("-10"),
      sanitizarEValidarPesoKg("600"),
      sanitizarEValidarPesoKg("invalido")
    ];
    console.log(JSON.stringify(res));
    """
    out = run_js_handlers(js_test)
    data = json.loads(out)
    assert data[0] == 70.5
    assert data[1] == 70.5
    assert data[2] == 80.0
    assert data[3] is None
    assert data[4] is None
    assert data[5] is None
    assert data[6] is None


