"""Conferência da cesta sem acessar a loja."""

import importlib.util
from pathlib import Path


SPEC = importlib.util.spec_from_file_location(
    "tenda_compras", Path(__file__).resolve().parents[1] / "scripts" / "tenda_compras_quinzenal.py"
)
MODULO = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULO)


def test_reconciliacao_so_confirma_nome_quantidade_e_preco():
    planejado = [{"produto_escolhido": "Filé de Tilápia 800g", "qtd": 2, "preco_unit": 32.0}]
    linha = {"titulo": "File de Tilapia 800g", "qtd": 2, "precos": [32.0, 64.0]}
    assert MODULO.reconciliar_itens(planejado, [linha])[0]["status"] == "Confirmado"
    assert MODULO.reconciliar_itens(planejado, [{**linha, "qtd": 1}])[0]["status"] == "Quantidade divergente"
    assert MODULO.reconciliar_itens(planejado, [{**linha, "precos": [35.0, 70.0]}])[0]["status"] == "Preço divergente"
    assert MODULO.reconciliar_itens(planejado, [])[0]["status"] == "Não encontrado"
    assert MODULO.reconciliar_itens(planejado, [linha, linha])[0]["status"] == "Não verificado (nome duplicado)"


def test_mensagens_de_carrinho_vazio():
    assert MODULO.texto_indica_carrinho_vazio("Meu carrinho\n0 itens")
    assert MODULO.texto_indica_carrinho_vazio("Seu carrinho está vazio")
    assert not MODULO.texto_indica_carrinho_vazio("Meu carrinho\n2 itens")
