"""Regras de equivalência e preço entre os dois supermercados."""

import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))
import comparar_tenda_atacadao as comparador


def test_preco_de_atacado_so_na_quantidade_minima():
    card = "Monster 473ml\nA partir de 3 unid.\nR$ 9,19\nou\nR$ 9,39 / cada"
    assert comparador.precos_card(card, 1) == 9.39
    assert comparador.precos_card(card, 3) == 9.19


def test_sku_extraido_do_link_do_catalogo():
    assert comparador.sku_do_link("/energetico-monster-ultra-57006-2359/p") == "2359"
    assert comparador.sku_do_link("/qualquer-outro-caminho") is None


def test_corte_e_variante_precisam_ser_equivalentes():
    carnes = comparador.plano("primeira")
    coxao = next(x for x in carnes if x[0].startswith("Coxão Mole"))
    assert comparador.card_compativel("Coxão Mole Bovino em Bifes 500g", 25, coxao[2], coxao[3])
    assert not comparador.card_compativel("Carne Bovina Moída Friboi 500g", 9, coxao[2], coxao[3])
    macarrao = next(x for x in carnes if x[0].startswith("Macarrão Caseiro"))
    assert not comparador.card_compativel("Macarrão Caseiro Renata Talharim 1 - 500g", 7, macarrao[2], macarrao[3])
    batata = next(x for x in carnes if x[0].startswith("Batata Palito"))
    assert comparador.card_compativel("Batata Pré-Frita Mais Batata Congelada 2kg", 24, batata[2], batata[3])
    assert not comparador.card_compativel("Batata Pré-Frita Bem Brasil Congelada Crinkle 2kg", 20, batata[2], batata[3])


def test_comparacao_por_quilo_para_carnes():
    coxao = next(x for x in comparador.plano("primeira") if x[0].startswith("Coxão Mole"))
    tenda = {coxao[0]: {"preco_unit": 26.40, "preco_kg": 52.80,
                        "produto_escolhido": "Coxão Mole Bovino em Bifes 500g"}}
    atacadao = {coxao[0]: {"preco_unit": 25.00, "preco_kg": 62.50}}
    resultado = comparador.comparar([coxao], tenda, atacadao)
    assert resultado[0]["melhor_preco_comparavel"] == "Tenda"


def test_parmesao_de_marca_aceita_e_comparado_por_peso():
    parmesao = next(x for x in comparador.plano("primeira") if x[0].startswith("Queijo Parmesão"))
    assert comparador.card_compativel("Queijo Parmesão Président 180g", 22.90, parmesao[2], parmesao[3])
    assert not comparador.card_compativel("Queijo Parmesão Président Ralado 180g", 15.00, parmesao[2], parmesao[3])
    tenda = {parmesao[0]: {"preco_unit": 25.90,
                          "produto_escolhido": "Queijo Parmesão Tirolez 200g"}}
    atacadao = {parmesao[0]: {"preco_unit": 22.90, "medida": 180,
                               "unidade_medida": "g"}}
    resultado = comparador.comparar([parmesao], tenda, atacadao)
    assert resultado[0]["melhor_preco_comparavel"] == "Atacadão"
    assert resultado[0]["economia_atacadao_na_mesma_embalagem"] == 0.46
