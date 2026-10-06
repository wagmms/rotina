# -*- coding: utf-8 -*-
import pytest
from src.food_optimizer import FoodOptimizer, TABELA_NUTRICIONAL_REF


def test_mapear_alimento():
    assert FoodOptimizer.mapear_alimento("Filé de Peito de Frango Sadia 1kg").nome == "Peito de Frango"
    assert FoodOptimizer.mapear_alimento("Filezinho Sassami Congelado 1kg").nome == "Filezinho Sassami"
    assert FoodOptimizer.mapear_alimento("Filé Mignon Suíno Pamplona 1,1kg").nome == "Filé Mignon Suíno"
    assert FoodOptimizer.mapear_alimento("Patinho Bovino em Bifes 400g").nome == "Patinho"
    assert FoodOptimizer.mapear_alimento("Bife de Contrafilé Angus 500g").nome == "Contrafilé"
    assert FoodOptimizer.mapear_alimento("Linguiça Toscana Seara 700g").nome == "Linguiça Toscana"
    assert FoodOptimizer.mapear_alimento("Queijo Parmesão Faixa Azul Cunha 150g").nome == "Queijo Parmesão"
    assert FoodOptimizer.mapear_alimento("Requeijão Cremoso Crioulo Copo 200g").nome == "Requeijão Cremoso"
    assert FoodOptimizer.mapear_alimento("Presunto Cozido Fatiado Sadia 200g").nome == "Presunto Cozido"
    assert FoodOptimizer.mapear_alimento("Filé de Tilápia Congelado 800g").nome == "Tilápia"
    assert FoodOptimizer.mapear_alimento("Produto Desconhecido XYZ") is None


def test_estimar_peso_gramas():
    assert FoodOptimizer.estimar_peso_gramas("Patinho Bovino 400g") == 400.0
    assert FoodOptimizer.estimar_peso_gramas("Filé de Peito 1kg") == 1000.0
    assert FoodOptimizer.estimar_peso_gramas("Fraldinha Peça 1,5kg") == 1500.0
    assert FoodOptimizer.estimar_peso_gramas("Iogurte Natural 160g") == 160.0
    assert FoodOptimizer.estimar_peso_gramas("Bebida Láctea 250ml") == 250.0
    assert FoodOptimizer.estimar_peso_gramas("Leite Desnatado 1L") == 1000.0


def test_calcular_eficiencia_proteica():
    # Frango 1kg a R$ 16,89 com 27% proteína = 270g de proteína
    # CPGP = 16.89 / 270 = R$ 0.0625 por g de proteína
    res = FoodOptimizer.calcular_eficiencia_proteica("Filé de Peito de Frango 1kg", 16.89, qtd=1)
    assert res["proteina_total_g"] == 270.0
    assert res["custo_por_grama_proteina"] > 0
    assert res["custo_por_100g_proteina"] == pytest.approx(6.26, rel=0.05)

    # Filé Mignon Suíno 1.1kg a R$ 31,79 com 26.5% proteína = 291.5g prot
    res_suino = FoodOptimizer.calcular_eficiencia_proteica("Filé Mignon Suíno 1,1kg", 31.79, qtd=1)
    assert res_suino["proteina_total_g"] == pytest.approx(291.5, rel=0.05)
    assert res_suino["custo_por_100g_proteina"] < 12.0  # Muito barato por 100g de proteína pura!


def test_gerar_diagnostico_cesta():
    cesta = [
        {"produto_escolhido": "Filé de Peito de Frango 1kg", "preco_unit": 16.89, "qtd": 2},
        {"produto_escolhido": "Filé Mignon Suíno 1,1kg", "preco_unit": 31.79, "qtd": 1},
        {"produto_escolhido": "Filé de Tilápia 800g", "preco_unit": 34.89, "qtd": 1}
    ]
    diag = FoodOptimizer.gerar_diagnostico_cesta(cesta)
    assert diag["total_investido"] > 0
    assert diag["total_proteina_g"] > 900.0  # > 900g de proteína nos 3 itens
    assert diag["media_proteina_diaria_g"] > 50.0
    assert len(diag["top_eficientes"]) > 0
