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


def test_cockpit_leitos_responsividade_e_censo():
    """Valida a presença de triagem visual, censo hospitalar, busca e chips de status rápido."""
    html_path = BASE_DIR / "cockpit_movel.html"
    conteudo = html_path.read_text(encoding="utf-8")

    # Censo hospitalar e indicadores em tempo real
    assert 'id="censo-leitos-metricas"' in conteudo
    assert 'id="censo-total-ocupados"' in conteudo
    assert 'id="censo-total-instavel"' in conteudo
    assert 'id="censo-total-vigilancia"' in conteudo
    assert 'id="censo-total-estavel"' in conteudo

    # Busca e filtros por gravidade
    assert 'id="busca-leitos"' in conteudo
    assert 'id="btn-limpar-busca-leitos"' in conteudo
    assert 'id="filtro-leitos-chips"' in conteudo
    assert "definirFiltroLeito('todos'" in conteudo
    assert "definirFiltroLeito('instavel'" in conteudo
    assert "definirFiltroLeito('vigilancia'" in conteudo
    assert "definirFiltroLeito('estavel'" in conteudo
    assert "definirFiltroLeito('alta'" in conteudo

    # Funções de gestão de leitos
    assert "filtrarLeitos" in conteudo
    assert "alterarStatusLeitoRapido" in conteudo
    assert "copiarSBARLeitoIndividual" in conteudo
    assert "prepararPrescricaoParaLeito" in conteudo


def test_cockpit_prescricao_rapida_e_kits():
    """Valida a bandeja de prescrição rápida beira-leito, kits clínicos e categorias farmacológicas."""
    html_path = BASE_DIR / "cockpit_movel.html"
    conteudo = html_path.read_text(encoding="utf-8")

    # Bandeja e kits de prescrição rápida
    assert 'id="card-prescricao-rapida"' in conteudo
    assert 'id="prescricao-itens-contagem"' in conteudo
    assert 'id="prescricao-itens-container"' in conteudo
    assert "copiarPrescricaoRapidaFormatada" in conteudo
    assert "limparPrescricaoRapida" in conteudo

    # Kits clínicos em 1 toque
    assert "adicionarKitPrescricao('sintomaticos')" in conteudo
    assert "adicionarKitPrescricao('profilaxia')" in conteudo
    assert "adicionarKitPrescricao('hidratacao')" in conteudo
    assert "adicionarKitPrescricao('analgesia_forte')" in conteudo

    # Categorias farmacológicas do REMUME
    assert 'id="filtro-remume-categorias"' in conteudo
    assert "definirCategoriaRemume('todas'" in conteudo
    assert "definirCategoriaRemume('antimicrobianos'" in conteudo
    assert "definirCategoriaRemume('analgesia'" in conteudo
    assert "definirCategoriaRemume('cardio'" in conteudo
    assert "definirCategoriaRemume('gastro'" in conteudo
    assert "definirCategoriaRemume('psico'" in conteudo
    assert "definirCategoriaRemume('diabetes'" in conteudo
    assert "definirCategoriaRemume('respiratorio'" in conteudo
    assert "REMUME_CATEGORIAS_KEYWORDS" in conteudo

    # Atalho na aba SOAP
    assert 'Prescrição Rápida' in conteudo


def test_cockpit_sincronizacao_deploy_gh_pages():
    """Valida que o arquivo de deploy em gh_cockpit_deploy/index.html é idêntico a cockpit_movel.html."""
    html_source = BASE_DIR / "cockpit_movel.html"
    html_deploy = BASE_DIR / "gh_cockpit_deploy/index.html"

    assert html_source.exists(), "cockpit_movel.html ausente"
    assert html_deploy.exists(), "gh_cockpit_deploy/index.html ausente"
    assert html_source.read_text(encoding="utf-8") == html_deploy.read_text(encoding="utf-8"), (
        "cockpit_movel.html e gh_cockpit_deploy/index.html devem ter conteúdo exatamente idêntico."
    )


def test_cockpit_soap_ambulatorial_e_atestados_cfm():
    """Valida os botões, modais e funções do Módulo SOAP Ambulatorial Ágil e Atestado CFM no Cockpit."""
    html_path = BASE_DIR / "cockpit_movel.html"
    conteudo = html_path.read_text(encoding="utf-8")

    # Botões na aba SOAP
    assert "abrirModalAmbulatorioSOAP()" in conteudo
    assert "abrirModalAtestadoCFM()" in conteudo
    assert "copiarReceitaLimpaPEP()" in conteudo

    # Modais estruturados
    assert 'id="modal-ambulatorio-soap"' in conteudo
    assert 'id="modal-atestado-cfm"' in conteudo
    assert 'id="amb-select-modelo-ef"' in conteudo
    assert 'id="atestado-select-dias"' in conteudo
    assert 'id="atestado-check-cid"' in conteudo

    # Funções JavaScript no client
    assert "gerarSOAPAmbulatorialModal" in conteudo
    assert "copiarSOAPAmbulatorialGerado" in conteudo
    assert "gerarAtestadoModal" in conteudo
    assert "copiarAtestadoGerado" in conteudo
    assert "copiarReceitaLimpaPEP" in conteudo

