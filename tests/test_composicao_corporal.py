# -*- coding: utf-8 -*-
"""
Testes automatizados da plataforma de Composição Corporal & Protocolo Mounjaro
Garante integridade matemática das fórmulas (Jackson-Pollock, Siri, US Navy)
e validação estrutural do arquivo composicao_corporal.html.
"""

import math
import os
import re
import pytest

HTML_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "composicao_corporal", "composicao_corporal.html")


def calcular_jp3_siri(idade: int, peito: float, abd: float, coxa: float) -> float:
    """Implementação canônica de Jackson & Pollock 3 Dobras (Homens) + Equação de Siri."""
    soma = peito + abd + coxa
    densidade = 1.10938 - (0.0008267 * soma) + (0.0000016 * (soma ** 2)) - (0.0002574 * idade)
    siri = ((4.95 / densidade) - 4.50) * 100
    return siri


def calcular_us_navy_homens(altura: float, pescoco: float, cintura: float) -> float:
    """Implementação canônica da Equação da Marinha Americana para Homens."""
    diff = cintura - pescoco
    log_diff = math.log10(diff)
    log_height = math.log10(altura)
    denom = 1.0324 - (0.19077 * log_diff) + (0.15456 * log_height)
    bf = (495 / denom) - 450
    return bf


def test_arquivo_html_existe_e_valido():
    assert os.path.exists(HTML_PATH), f"Arquivo não encontrado: {HTML_PATH}"
    with open(HTML_PATH, "r", encoding="utf-8") as f:
        conteudo = f.read()

    assert "<!DOCTYPE html>" in conteudo
    assert "BioComp & Mounjaro OS" in conteudo
    assert "Chart.js" in conteudo or "cdn.jsdelivr.net/npm/chart.js" in conteudo
    assert "tailwindcss" in conteudo


def test_precisao_matematica_formulas_antropometricas():
    # Dados de Wagner: 28 anos, Peito 5mm, Abdome 22mm, Coxa 13mm
    siri_calculado = calcular_jp3_siri(idade=28, peito=5.0, abd=22.0, coxa=13.0)
    assert 11.8 <= siri_calculado <= 12.0, f"Siri calculado fora da faixa esperada: {siri_calculado}"

    # Dados Navy: Altura 173cm, Pescoço 37cm, Cintura 82cm
    navy_calculado = calcular_us_navy_homens(altura=173.0, pescoco=37.0, cintura=82.0)
    assert 15.6 <= navy_calculado <= 15.8, f"Navy calculado fora da faixa esperada: {navy_calculado}"


def test_historico_inbody_preservado_no_html():
    with open(HTML_PATH, "r", encoding="utf-8") as f:
        conteudo = f.read()

    # Confere se os 3 exames do InBody estão no código JS
    assert "82.7" in conteudo, "Peso do 1º exame ausente"
    assert "19.8" in conteudo, "BF do 1º exame ausente"
    assert "78.6" in conteudo, "Peso do 2º exame ausente"
    assert "17.2" in conteudo, "BF do 2º exame ausente"
    assert "76.7" in conteudo, "Peso do 3º exame ausente"
    assert "15.4" in conteudo, "BF do 3º exame ausente"
    assert "75.0" in conteudo, "Peso atual ausente"


def test_regras_nutricionais_e_restricoes():
    with open(HTML_PATH, "r", encoding="utf-8") as f:
        conteudo = f.read()

    # Meta de proteína em torno de 140g diários (1.8-2.0 g/kg para 75kg)
    assert "140" in conteudo
    # Respeito à tolerância: laticínios Zero Lactose e Whey
    assert "Zero Lactose" in conteudo
    # Exclusão de ovos nos planos alimentares padrão
    assert "ovo_cozido" not in conteudo
    assert "omelete" not in conteudo


def test_regra_sempre_um_ou_outro_whey_vs_yopro():
    with open(HTML_PATH, "r", encoding="utf-8") as f:
        conteudo = f.read()

    # Presença dos seletores e funções dos presets
    assert "carregarPresetWhey" in conteudo
    assert "carregarPresetYoPro" in conteudo
    assert "SEMPRE UM OU OUTRO" in conteudo
    assert "prot-comida-display" in conteudo
    assert "prot-supl-display" in conteudo

    # No preset Whey, não deve haver YoPro no plano
    bloco_whey = conteudo[conteudo.find("function carregarPresetWhey()"):conteudo.find("function carregarPresetYoPro()")]
    assert "whey_iso" in bloco_whey
    assert "yopro" not in bloco_whey, "Preset Whey não deve conter YoPro!"

    # No preset YoPro, não deve haver Whey no plano
    bloco_yopro = conteudo[conteudo.find("function carregarPresetYoPro()"):conteudo.find("function limparCardapio()")]
    assert "yopro_25g" in bloco_yopro
    assert "whey" not in bloco_yopro, "Preset YoPro não deve conter Whey!"


def test_bio_composicao_hub_integracao():
    from composicao_corporal.bio_composicao_hub import calcular_projecao_compras_quinzenal, executar_doctor

    # Valida execução do doctor
    assert executar_doctor() is True

    # Projeção Whey: zero YoPro e demanda coerente
    proj_whey = calcular_projecao_compras_quinzenal("whey")
    assert proj_whey["yopro_unidades"] == 0
    assert proj_whey["whey_protein_doses"] == 15
    assert proj_whey["carnes_bovinas_suinas_kg"] >= 2.0

    # Projeção YoPro: zero Whey e demanda coerente
    proj_yopro = calcular_projecao_compras_quinzenal("yopro")
    assert proj_yopro["whey_protein_doses"] == 0
    assert proj_yopro["yopro_unidades"] == 15
    assert proj_yopro["pescados_merluza_kg"] >= 2.0


def test_ciclo_mounjaro_e_laudo_print_no_html():
    with open(HTML_PATH, "r", encoding="utf-8") as f:
        conteudo = f.read()

    # Ciclo Semanal Mounjaro D1 a D7
    assert "selecionarDiaCiclo" in conteudo
    assert "Pico Plasmático" in conteudo
    assert "DADOS_CICLO" in conteudo
    # Suporte hídrico e fibras
    assert "adicionarAgua" in conteudo
    assert "adicionarFibra" in conteudo
    # Estilo de impressão de laudo
    assert "@media print" in conteudo
    assert "window.print()" in conteudo



