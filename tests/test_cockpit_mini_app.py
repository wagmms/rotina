# -*- coding: utf-8 -*-
"""
Testes automatizados para o Cockpit Móvel (Telegram Mini App) e integrações WebApp.
"""

import json
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def run_node(js_code: str) -> str:
    master_path = BASE_DIR / "ultra_rotina_master.js"
    preamble = f"""
    const fs = require('fs');
    const vm = require('vm');
    const code = fs.readFileSync('{master_path}', 'utf-8');
    vm.runInThisContext(code);
    """
    res = subprocess.run(
        ["node", "-e", preamble + "\n" + js_code],
        capture_output=True,
        text=True,
        check=True
    )
    return res.stdout.strip()


def test_cockpit_movel_html_integridade():
    """Valida se o template cockpit_movel.html possui todas as 6 abas e o SDK do Telegram."""
    html_path = BASE_DIR / "cockpit_movel.html"
    assert html_path.exists(), "cockpit_movel.html não foi encontrado na raiz do projeto."
    conteudo = html_path.read_text(encoding="utf-8")

    # Verifica inclusão do Telegram WebApp SDK
    assert "telegram.org/js/telegram-web-app.js" in conteudo
    assert "Telegram" in conteudo and "WebApp" in conteudo

    # Verifica as 6 abas requeridas
    assert 'id="tab-corpo"' in conteudo
    assert 'id="tab-leitos"' in conteudo
    assert 'id="tab-remume"' in conteudo
    assert 'id="tab-calculadoras"' in conteudo
    assert 'id="tab-rotina"' in conteudo
    assert 'id="tab-soap"' in conteudo

    # Verifica elementos clínicos essenciais
    assert "Drogas Vasoativas" in conteudo or "DVA" in conteudo
    assert "Sequência Rápida de Intubação" in conteudo or "SRI" in conteudo
    assert "Cockcroft-Gault" in conteudo or "Clearance" in conteudo
    assert "Winter" in conteudo or "Gasometria" in conteudo
    assert "SBAR" in conteudo
    assert "SOAP" in conteudo


def test_teclado_fixo_abre_sessao_nova_do_cockpit():
    """O teclado persistente abre diretamente o Cockpit Móvel em tela cheia via web_app."""
    js = """
    var kb = obterTecladoFixoPrincipal();
    console.log(JSON.stringify(kb));
    """
    out = json.loads(run_node(js))
    assert out["resize_keyboard"] is True
    assert out["is_persistent"] is True

    # Localiza o botão do Cockpit
    todos_botoes = [btn for linha in out["keyboard"] for btn in linha]
    cockpit_btn = next((b for b in todos_botoes if "Cockpit" in b["text"]), None)

    assert cockpit_btn is not None, "Botão do Cockpit Móvel não encontrado no teclado fixo."
    assert "web_app" in cockpit_btn
    assert "https://" in cockpit_btn["web_app"]["url"]


def test_do_get_rotas_cockpit_e_fila():
    """Valida se a função doGet do GAS roteia para o Cockpit e aceita rotas da fila."""
    js = """
    // Simula ambiente HtmlService do GAS
    var htmlCriado = null;
    global.HtmlService = {
        createHtmlOutputFromFile: function(nome) {
            htmlCriado = nome;
            return {
                setTitle: function() { return this; },
                addMetaTag: function() { return this; },
                setXFrameOptionsMode: function() { return this; }
            };
        },
        XFrameOptionsMode: { ALLOWALL: 1 }
    };

    var resCockpit = doGet({});
    var viewCockpit = htmlCriado;

    var resBio = doGet({ parameter: { view: 'bio' } });
    var viewBio = htmlCriado;

    console.log(JSON.stringify({
        viewPadrao: viewCockpit,
        viewBio: viewBio
    }));
    """
    out = json.loads(run_node(js))
    assert out["viewPadrao"] == "CockpitApp"
    assert out["viewBio"] == "ComposicaoCorporal"
