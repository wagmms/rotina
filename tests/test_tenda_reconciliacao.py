"""Conferência da cesta sem acessar a loja."""

import importlib.util
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock


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
    desconto = MODULO.reconciliar_itens(planejado, [{**linha, "precos": [30.0]}])[0]
    assert desconto["status"] == "Confirmado"
    assert desconto["subtotal"] == 60.0
    assert MODULO.reconciliar_itens(planejado, [])[0]["status"] == "Não encontrado"
    assert MODULO.reconciliar_itens(planejado, [linha, linha])[0]["status"] == "Não verificado (nome duplicado)"


def test_mensagens_de_carrinho_vazio():
    assert MODULO.texto_indica_carrinho_vazio("Meu carrinho\n0 itens")
    assert MODULO.texto_indica_carrinho_vazio("Seu carrinho está vazio")
    assert not MODULO.texto_indica_carrinho_vazio("Meu carrinho\n2 itens")


def test_tela_do_carrinho_nao_depende_da_rota():
    page = Mock()
    page.url = "https://checkout.exemplo.com/checkout/cart"
    page.get_by_text.return_value.first.is_visible.return_value = True
    assert MODULO.pagina_carrinho_confirmada(page)


def test_localizacao_ativa_com_quebra_de_linha_do_tenda():
    assert MODULO.texto_confirma_retirada_ribeirao("Retirar na loja:\nRibeirão Preto")
    assert not MODULO.texto_confirma_retirada_ribeirao("Retirar na loja:\nCampinas")
    page = Mock()
    page.locator.return_value.is_visible.return_value = False
    page.locator.return_value.inner_text.return_value = "Retirar na loja:\nRibeirão Preto"
    assert MODULO.localizacao_ja_confirmada(page)


def test_corte_exige_identidade_e_embalagem_compativel():
    bife = MODULO.GRUPOS_CARNES_DINAMICAS[0]
    contra = bife["candidatos"][1]
    assert not MODULO.corte_compativel(
        {"titulo": "Contra Filé Bovino Resfriado Peça 4kg", "preco_unit": 219.96, "preco_kg": 54.99},
        contra, bife["faixa_peso_g"]
    )
    moida = MODULO.GRUPOS_CARNES_DINAMICAS[1]
    patinho = moida["candidatos"][0]
    assert not MODULO.corte_compativel(
        {"titulo": "Canela Moída PQ 500g", "preco_unit": 11.90, "preco_kg": None},
        patinho, moida["faixa_peso_g"]
    )
    assert MODULO.corte_compativel(
        {"titulo": "Patinho Bovino Moído 500g", "preco_unit": 25.00, "preco_kg": 50.0},
        patinho, moida["faixa_peso_g"]
    )


def test_despensa_exige_tipo_e_tamanho():
    grupos = [MODULO.ITENS_PDF_REGULARES, MODULO.ITENS_PDF_MENSAIS,
              MODULO.ITENS_CARBOIDRATOS, MODULO.ITENS_LATICINIOS_E_BEBIDAS,
              MODULO.ITENS_CONDIMENTOS_E_DOCES, MODULO.ITENS_HORTIFRUTI_INTELIGENTE,
              MODULO.ITENS_HIGIENE, [MODULO.ITEM_AZEITE]]
    assert all(item["busca"] in MODULO.REGRAS_DESPENSA for grupo in grupos for item in grupo)
    leite = MODULO.ITENS_LATICINIOS_E_BEBIDAS[0]
    assert not MODULO.produto_despensa_compativel(
        {"titulo": "Creme de Leite Piracanjuba Zero Lactose 200g", "preco_unit": 3.79, "preco_kg": None}, leite
    )
    assert MODULO.produto_despensa_compativel(
        {"titulo": "Leite UHT Piracanjuba Zero Lactose 1L", "preco_unit": 6.99, "preco_kg": None}, leite
    )
    mussarela = MODULO.ITENS_LATICINIOS_E_BEBIDAS[2]
    assert not MODULO.produto_despensa_compativel(
        {"titulo": "Queijo Mussarela Fatiado Italac 150g", "preco_unit": 9.89, "preco_kg": None}, mussarela
    )


def test_plano_pdf_e_reposicoes_mensais():
    args = SimpleNamespace(
        quinzena="primeira", apenas_carnes=False, com_extras=False,
        sem_doces=False, sem_hortifruti=False, sem_higiene=False, com_azeite=False,
    )
    carnes, itens, primeira = MODULO.montar_plano(args)
    assert primeira
    assert len(carnes) + len(itens) == 19
    assert sum(grupo["qtd"] for grupo in carnes) + sum(item["qtd"] for item in itens) == 26
    args.quinzena = "segunda"
    _, itens_segunda, primeira = MODULO.montar_plano(args)
    assert not primeira
    assert len(itens) - len(itens_segunda) == 5
    assert sum(grupo["qtd"] for grupo in carnes) + sum(item["qtd"] for item in itens_segunda) == 21


def test_extras_opcionais_sem_sobreposicao_da_cesta_pdf():
    args = SimpleNamespace(
        quinzena="primeira", apenas_carnes=False, com_extras=True,
        sem_doces=False, sem_hortifruti=False, sem_higiene=False, com_azeite=False,
    )
    _, itens, _ = MODULO.montar_plano(args)
    buscas = [item["busca"] for item in itens]
    assert len(buscas) == len(set(buscas))
    assert "arroz tipo 1 1kg" in buscas
    assert "macarrao barilla 500g" not in buscas
    assert "energetico monster 473ml" not in buscas


def test_pdf_preserva_variante_do_macarrao_e_marca_da_batata():
    macarrao = MODULO.ITENS_PDF_REGULARES[0]
    batata = next(item for item in MODULO.ITENS_PDF_MENSAIS if "Batata" in item["nome"])
    info = lambda titulo: {"titulo": titulo, "preco_unit": 24.90, "preco_kg": None}
    assert not MODULO.produto_despensa_compativel(
        info("Macarrão Caseiro Renata Talharim 1 - 500g"), macarrao
    )
    assert MODULO.produto_despensa_compativel(
        info("Macarrão Caseiro Renata Talharim 2 - 500g"), macarrao
    )
    assert not MODULO.produto_despensa_compativel(
        info("Batata Palito Congelada Uai 2kg"), batata
    )
    assert MODULO.produto_despensa_compativel(
        info("Batata Congelada Palito Mais Batata 2kg"), batata
    )
