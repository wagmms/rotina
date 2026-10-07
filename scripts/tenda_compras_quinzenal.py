#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Monta a cesta do pedido de referência no Tenda e confere o carrinho.

As reposições mensais entram na primeira quinzena. A modalidade de entrega e
a finalização do pedido ficam para o usuário.
"""

import os
import json
import re
import sys
import time
import shutil
import argparse
import subprocess
import unicodedata
from urllib.parse import urlsplit
from typing import List, Dict, Any, Optional

# Garante a resolução do pacote 'src' independentemente do diretório de execução
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from playwright.sync_api import sync_playwright, Page, BrowserContext

# Configurações de Localização (Ribeirão Preto)
CEP_DESTINO = "14055220"
NOME_FILIAL = "Marechal Costa e Silva"
ARQUIVO_SESSAO = os.path.expanduser("~/.tenda_session.json")
ARQUIVO_EXPORTACAO = os.path.join(os.path.dirname(__file__), "compras_tenda_resumo.md")
ARQUIVO_EXPORTACAO_JSON = os.path.join(os.path.dirname(__file__), "compras_tenda_resumo.json")
FILIAL_ID_CONFIRMADA: Optional[str] = None

# --- COMPARADOR DINÂMICO DE CARNES & PROTEÍNAS ---
# O script pesquisa os cortes candidatos e seleciona as 7 proteínas quinzenais confirmadas via /grill-me
GRUPOS_CARNES_DINAMICAS: List[Dict[str, Any]] = [
    {
        "categoria": "Carnes Bovinas (Bifes Macios)",
        "nome_geral": "Bife Bovino Nobre & Macio (Alcatra / Contrafilé / Baby Beef)",
        "qtd": 1,
        "faixa_peso_g": (300, 800),
        "candidatos": [
            {
                "nome_corte": "Miolo de Alcatra em Bifes (~400g-500g)",
                "busca": "alcatra bife",
                "exigir": [["alcatra"]],
                "preferencias": ["alcatra", "miolo", "bife"],
                "evitar": ["hamburguer", "tempero", "costela", "linguica", "linguiça", "moida", "moída", "patinho", "coxao", "coxão"]
            },
            {
                "nome_corte": "Contrafilé em Bifes (~400g-500g)",
                "busca": "contrafile bife",
                "exigir": [["contrafile", "contra file"]],
                "preferencias": ["contrafile", "contra filé", "contrafilé", "bife"],
                "evitar": ["hamburguer", "costela", "linguica", "linguiça", "moida", "moída", "patinho", "coxao"]
            },
            {
                "nome_corte": "Baby Beef em Bifes (~400g-500g)",
                "busca": "baby beef bife",
                "exigir": [["baby beef"]],
                "preferencias": ["baby beef", "alcatra", "bife"],
                "evitar": ["hamburguer", "costela", "moida", "moída"]
            }
        ]
    },
    {
        "categoria": "Carnes Bovinas (Moída de Primeira)",
        "nome_geral": "Carne Moída Bovina de Primeira (~500g)",
        "qtd": 1,
        "faixa_peso_g": (350, 750),
        "candidatos": [
            {
                "nome_corte": "Patinho Bovino Moído 500g",
                "busca": "patinho moido 500g",
                "exigir": [["patinho"], ["moido", "moida"]],
                "preferencias": ["patinho", "moido", "moída", "bovino", "500g"],
                "evitar": ["hamburguer", "acem", "acém", "segunda", "danone", "danoninho", "iogurte", "leite", "sobremesa", "frango"]
            },
            {
                "nome_corte": "Coxão Mole Bovino Moído 500g",
                "busca": "coxao mole moido 500g",
                "exigir": [["coxao mole"], ["moido", "moida"]],
                "preferencias": ["coxao mole", "coxão mole", "moido", "moída", "500g"],
                "evitar": ["hamburguer", "acem", "acém", "danone", "danoninho", "iogurte"]
            }
        ]
    },
    {
        "categoria": "Aves (Filé Magro)",
        "nome_geral": "Filé de Frango Magro sem Osso (Peito ou Sassami 1kg)",
        "qtd": 1,
        "faixa_peso_g": (700, 1500),
        "candidatos": [
            {
                "nome_corte": "Filé de Peito Sadia Zip 1kg",
                "busca": "file peito frango 1kg",
                "exigir": [["peito"], ["frango"]],
                "preferencias": ["sadia", "perdigao", "lar", "file de peito", "filé de peito"],
                "evitar": ["empanado", "nugget", "desfiado", "defumado", "com osso", "anuncio"]
            },
            {
                "nome_corte": "Filezinho Sassami IQF 1kg",
                "busca": "sassami frango 1kg",
                "exigir": [["sassami"]],
                "preferencias": ["sassami", "filezinho", "filézinho", "seara", "sadia"],
                "evitar": ["empanado", "nugget", "anuncio"]
            }
        ]
    },
    {
        "categoria": "Aves (Com Osso)",
        "nome_geral": "Coxa e Sobrecoxa de Frango (Bandeja ~600g a 1kg)",
        "qtd": 1,
        "faixa_peso_g": (450, 1200),
        "candidatos": [
            {
                "nome_corte": "Coxa e Sobrecoxa Resfriada ou Congelada",
                "busca": "coxa sobrecoxa frango",
                "exigir": [["coxa"], ["frango"]],
                "preferencias": ["coxa sobrecoxa", "coxa e sobrecoxa", "bandeja"],
                "evitar": ["passarinho", "asa", "tulipa", "empanado"]
            }
        ]
    },
    {
        "categoria": "Carnes Suínas Nobres",
        "nome_geral": "Corte Suíno Nobre (Filé Mignon, Lombo ou Bisteca ~1kg)",
        "qtd": 1,
        "faixa_peso_g": (650, 1500),
        "candidatos": [
            {
                "nome_corte": "Filé Mignon Suíno Resfriado (~1kg)",
                "busca": "file mignon suino",
                "exigir": [["mignon"], ["suino", "suina"]],
                "preferencias": ["mignon", "suino", "suíno", "peça", "peca"],
                "evitar": ["bovino", "salgado", "defumado"]
            },
            {
                "nome_corte": "Lombo Suíno Resfriado (~1kg)",
                "busca": "lombo suino peca",
                "exigir": [["lombo"], ["suino", "suina"]],
                "preferencias": ["lombo", "suino", "seara", "peca", "peça", "bife"],
                "evitar": ["salgado", "canadense", "defumado"]
            },
            {
                "nome_corte": "Bisteca Suína Resfriada (~1kg)",
                "busca": "bisteca suina",
                "exigir": [["bisteca"], ["suino", "suina"]],
                "preferencias": ["bisteca", "suina", "suína", "seara", "bandeja"],
                "evitar": ["salgada", "defumada"]
            }
        ]
    },
    {
        "categoria": "Pescados (Exclusivo Tilápia)",
        "nome_geral": "Filé de Tilápia Congelado (~500g a 800g)",
        "qtd": 1,
        "faixa_peso_g": (400, 1000),
        "candidatos": [
            {
                "nome_corte": "Filé de Tilápia Congelado 800g (Copacol / Aurora / Netuno)",
                "busca": "file tilapia 800g",
                "exigir": [["tilapia"], ["file", "filezinho"]],
                "preferencias": ["tilapia", "tilápia", "copacol", "cancao", "netuno", "aurora", "800g"],
                "evitar": ["merluza", "cacao", "cação", "salmao", "empanado", "isca", "pedacos"]
            },
            {
                "nome_corte": "Filé de Tilápia Congelado 500g-600g (Seara / Select / Mar & Terra)",
                "busca": "file tilapia",
                "exigir": [["tilapia"], ["file", "filezinho"]],
                "preferencias": ["tilapia", "tilápia", "seara", "select", "500g", "600g"],
                "evitar": ["merluza", "cacao", "cação", "salmao", "empanado", "isca", "pedacos"]
            }
        ]
    },
    {
        "categoria": "Linguiça Toscana",
        "nome_geral": "Linguiça Toscana Nobre (~700g a 1kg - Seara / Perdigão / Aurora)",
        "qtd": 1,
        "faixa_peso_g": (600, 1200),
        "candidatos": [
            {
                "nome_corte": "Linguiça Toscana Seara / Perdigão (~700g a 1kg)",
                "busca": "linguica toscana seara perdigao",
                "exigir": [["linguica"], ["toscana"], ["seara", "perdigao", "aurora"]],
                "preferencias": ["toscana", "seara", "perdigao", "perdigão", "aurora", "linguica", "linguiça"],
                "evitar": ["calabresa", "frango", "mista", "defumada", "fina", "5kg"]
            }
        ]
    }
]

# Cesta de referência do pedido real dos primeiros 15 dias de outubro de 2026.
# Cada corte é independente: o usuário comprou dois bovinos e dois tipos de frango.
GRUPOS_CARNES_PDF: List[Dict[str, Any]] = [
    {
        "categoria": "Carnes Bovinas (Bifes)", "nome_geral": "Coxão Mole Bovino em Bifes 500g",
        "qtd": 1, "faixa_peso_g": (400, 650), "candidatos": [{
            "nome_corte": "Coxão Mole em Bifes", "busca": "coxao mole bovino bifes 500g",
            "exigir": [["coxao mole"], ["bife"]],
            "preferencias": ["coxao mole", "bovino", "bifes", "500g"],
            "evitar": ["capa", "moido", "moida", "peca", "peça"]
        }]
    },
    {
        "categoria": "Carnes Suínas", "nome_geral": "Pernil Suíno Sem Osso Resfriado 500g",
        "qtd": 1, "faixa_peso_g": (400, 700), "candidatos": [{
            "nome_corte": "Pernil Suíno Sem Osso", "busca": "pernil suino sem osso 500g",
            "exigir": [["pernil"], ["suino", "suina"], ["sem osso"]],
            "preferencias": ["resfriado", "500g", "sem osso"],
            "evitar": ["temperado", "defumado", "salgado"]
        }]
    },
    {
        "categoria": "Pescados", "nome_geral": "Filé de Tilápia Congelado 800g",
        "qtd": 1, "faixa_peso_g": (700, 900), "candidatos": [{
            "nome_corte": "Filé de Tilápia", "busca": "file tilapia 800g",
            "exigir": [["tilapia"], ["file"]],
            "preferencias": ["cancao", "copacol", "aurora", "800g"],
            "evitar": ["empanado", "isca", "pedacos"]
        }]
    },
    {
        "categoria": "Aves (Com Osso)", "nome_geral": "Coxa com Sobrecoxa de Frango 500g",
        "qtd": 1, "faixa_peso_g": (400, 700), "candidatos": [{
            "nome_corte": "Coxa com Sobrecoxa", "busca": "coxa sobrecoxa frango 500g",
            "exigir": [["coxa"], ["sobrecoxa"], ["frango"]],
            "preferencias": ["500g", "congelado", "resfriado"],
            "evitar": ["asa", "passarinho", "empanado"]
        }]
    },
    {
        "categoria": "Carnes Bovinas (Bifes)", "nome_geral": "Miolo da Alcatra Bovina em Bifes 400g",
        "qtd": 1, "faixa_peso_g": (350, 600), "candidatos": [{
            "nome_corte": "Miolo da Alcatra em Bifes", "busca": "miolo alcatra bovina bifes 400g",
            "exigir": [["alcatra"], ["bife"]],
            "preferencias": ["miolo", "bovino", "400g"],
            "evitar": ["moido", "moida", "peca", "peça"]
        }]
    },
    {
        "categoria": "Aves (Filé)", "nome_geral": "Filé de Peito de Frango Resfriado 600g (2 unidades)",
        "qtd": 2, "faixa_peso_g": (500, 700), "candidatos": [{
            "nome_corte": "Filé de Peito Resfriado", "busca": "file peito frango resfriado 600g",
            "exigir": [["peito"], ["frango"], ["file"], ["resfriado"]],
            "preferencias": ["600g", "bandeja", "resfriado"],
            "evitar": ["empanado", "desfiado", "com osso"]
        }]
    },
]

# --- ITENS DE CARBOIDRATOS & ACOMPANHAMENTOS (PORÇÕES REAIS DE 15 DIAS) ---
ITENS_CARBOIDRATOS: List[Dict[str, Any]] = [
    {
        "categoria": "Carboidratos & Grãos",
        "nome": "Arroz Branco Tipo 1 (1kg - Embalagem Compacta)",
        "busca": "arroz tipo 1 1kg",
        "qtd": 1,
        "preferencias": ["1kg", "select", "camil", "albaruska", "prato fino", "tio joao", "tio joão"],
        "evitar": ["5kg", "integral", "japones", "parboilizado"]
    },
    {
        "categoria": "Carboidratos & Grãos",
        "nome": "Feijão Carioca Tipo 1 (1kg)",
        "busca": "feijao carioca 1kg",
        "qtd": 1,
        "preferencias": ["1kg", "carioca", "select", "camil", "kicaldo"],
        "evitar": ["preto", "fradinho", "branco"]
    },
    {
        "categoria": "Carboidratos & Grãos",
        "nome": "Pão de Forma Tradicional Branco (Kim / Select / Pullman / Visconti)",
        "busca": "pao de forma tradicional",
        "qtd": 1,
        "preferencias": ["tradicional", "select", "kim", "visconti", "pullman", "original"],
        "evitar": ["integral", "100%", "graos", "zero"]
    },
    {
        "categoria": "Carboidratos & Grãos",
        "nome": "Macarrão 500g (Espaguete / Penne - Barilla ou Renata)",
        "busca": "macarrao barilla 500g",
        "qtd": 1,
        "preferencias": ["grano duro", "barilla", "renata", "espaguete", "spaghetti", "penne", "500g"],
        "evitar": ["instantaneo", "lamen"]
    },
    {
        "categoria": "Carboidratos & Grãos",
        "nome": "Molho de Tomate Premium / Passata (Barilla / Cirio / Vidro ou Lata)",
        "busca": "molho de tomate barilla vidro",
        "qtd": 1,
        "preferencias": ["barilla", "cirio", "passata", "vidro", "pomarola", "rustico", "rústico"],
        "evitar": ["fugini", "sache", "sachê", "pizza", "bolonhesa"]
    },
    {
        "categoria": "Carboidratos & Grãos",
        "nome": "Pão de Alho Baguete com Queijo 300g-400g (Santa Massa / Select / Zinho)",
        "busca": "pao de alho baguete tradicional select 300g",
        "qtd": 1,
        "preferencias": ["pao de alho", "pão de alho", "select", "santa massa", "zinho", "300g", "400g"],
        "evitar": ["torrada", "crostini"]
    }
]

# --- LATICÍNIOS, QUEIJOS, FRIOS & BEBIDAS (HÁBITOS REAIS DO USUÁRIO) ---
ITENS_LATICINIOS_E_BEBIDAS: List[Dict[str, Any]] = [
    {
        "categoria": "Laticínios & Bebidas",
        "nome": "Leite UHT Zero Lactose 1L (Italac / Piracanjuba)",
        "busca": "leite zero lactose 1l",
        "qtd": 2,
        "preferencias": ["zero lactose", "italac", "piracanjuba"],
        "evitar": ["condensado", "po"]
    },
    {
        "categoria": "Laticínios & Bebidas",
        "nome": "Manteiga com Sal Tradicional (200g - Aviação / Tourinho / Select)",
        "busca": "manteiga com sal 200g",
        "qtd": 1,
        "preferencias": ["200g", "aviacao", "aviação", "tourinhos", "select", "tablete"],
        "evitar": ["500g", "margarina", "sem sal"]
    },
    {
        "categoria": "Laticínios & Bebidas",
        "nome": "Queijo Mussarela Fatiado (~300g a 500g)",
        "busca": "queijo mussarela fatiado",
        "qtd": 1,
        "preferencias": ["mussarela", "fatiado", "apolo", "tirolez", "select", "pedaco"],
        "evitar": ["ralado", "prato", "gorgonzola"]
    },
    {
        "categoria": "Laticínios & Bebidas",
        "nome": "Queijo Parmesão Nobre (~100g-150g Faixa Azul / Tirolez / Scala)",
        "busca": "queijo parmesao cunha faixa azul tirolez",
        "qtd": 1,
        "preferencias": ["parmesao", "parmesão", "faixa azul", "tirolez", "scala", "cunha", "pedaco", "pedaço", "ralado fresco"],
        "evitar": ["sache 50g", "50g ralado"]
    },
    {
        "categoria": "Laticínios & Bebidas",
        "nome": "Requeijão Cremoso Tradicional 200g (Crioulo / Poços de Caldas / Catupiry)",
        "busca": "requeijao cremoso tradicional copo 200g",
        "qtd": 1,
        "preferencias": ["requeijao", "requeijão", "crioulo", "pocos de caldas", "poços de caldas", "catupiry", "itambe", "itambé", "vigor", "200g"],
        "evitar": ["culinario", "balde", "bisnaga", "light"]
    },
    {
        "categoria": "Laticínios & Bebidas",
        "nome": "Frios Fatiados para Lanche (~200g Presunto Cozido ou Peito de Peru)",
        "busca": "presunto cozido fatiado 200g",
        "qtd": 1,
        "preferencias": ["presunto cozido", "peito de peru", "seara", "sadia", "fatiado", "200g"],
        "evitar": ["apresuntado", "defumado", "pernil", "parma"]
    },
    {
        "categoria": "Laticínios & Bebidas",
        "nome": "Queijo Brie Nobre 125g (Quatá / Tirolez - Petisco)",
        "busca": "queijo brie 125g",
        "qtd": 1,
        "preferencias": ["brie", "tirolez", "quata", "quatá", "125g", "provolone"],
        "evitar": ["fatiado", "prato"]
    },
    {
        "categoria": "Laticínios & Bebidas",
        "nome": "Bebida Láctea Proteica 250ml (Piracanjuba Whey / 3 Corações / Italac - 4 un)",
        "busca": "bebida lactea whey 250ml",
        "qtd": 4,
        "preferencias": ["piracanjuba", "italac", "whey 15g", "whey", "3 coracoes", "3 corações", "15g", "250ml"],
        "evitar": ["po", "pó", "1l"]
    },
    {
        "categoria": "Laticínios & Bebidas",
        "nome": "Energético Monster em Lata 473ml (4 unidades)",
        "busca": "energetico monster 473ml",
        "qtd": 4,
        "preferencias": ["monster", "473ml", "energy", "zero", "ultra", "lata"],
        "evitar": ["2l", "fardo 24", "pack 12"]
    },
    {
        "categoria": "Laticínios & Bebidas",
        "nome": "Energético Baly 2L Econômico (1 garrafa)",
        "busca": "energetico baly 2l",
        "qtd": 1,
        "preferencias": ["baly 2l", "baly", "garrafa"],
        "evitar": ["lata"]
    },
    {
        "categoria": "Laticínios & Bebidas",
        "nome": "Refrigerante Zero Açúcar 2L (Coca-Cola Sem Açúcar / Guaraná Zero)",
        "busca": "coca cola sem acucar 2l",
        "qtd": 1,
        "preferencias": ["coca cola sem acucar", "coca-cola zero", "sem acucar", "guarana antarctica zero", "zero 2l", "2l"],
        "evitar": ["original", "normal", "com acucar", "lata", "pack"]
    }
]

# --- CONDIMENTOS & DOCES DE DESCOMPRESSÃO ---
ITENS_CONDIMENTOS_E_DOCES: List[Dict[str, Any]] = [
    {
        "categoria": "Condimentos & Doces",
        "nome": "Maionese Premium Squeeze/Pote (Heinz ou Hellmann's ~400g)",
        "busca": "maionese heinz tradicional",
        "qtd": 1,
        "preferencias": ["heinz", "hellmanns", "hellmann's", "tradicional", "squeeze", "pote"],
        "evitar": ["salada", "alho", "bacon", "verde", "churrasco"]
    },
    {
        "categoria": "Condimentos & Doces",
        "nome": "Ketchup Tradicional Premium (Heinz ou Hellmann's ~397g)",
        "busca": "ketchup heinz tradicional",
        "qtd": 1,
        "preferencias": ["heinz", "hellmanns", "hellmann's", "tradicional", "squeeze"],
        "evitar": ["picante", "bacon", "curry"]
    },
    {
        "categoria": "Condimentos & Doces",
        "nome": "Chocolate de Qualidade para Descompressão (Barra Nestlé / Lacta / Milka ou Trento)",
        "busca": "chocolate barra nestle milka lacta",
        "qtd": 1,
        "preferencias": ["nestle", "nestlé", "lacta", "milka", "trento", "barra", "ao leite", "meio amargo"],
        "evitar": ["cobertura", "confeiteiro", "gotas 1kg", "po 1kg"]
    }
]

# --- HORTIFRÚTI INTELIGENTE (ZERO DESPERDÍCIO DE GAVETA - QUANTIDADES ENXUTAS) ---
ITENS_HORTIFRUTI_INTELIGENTE: List[Dict[str, Any]] = [
    {
        "categoria": "Hortifrúti Inteligente",
        "nome": "Alho Descascado Kamar 200g (Zero Desperdício / Pronto para Uso)",
        "busca": "alho descascado kamar 200g",
        "qtd": 1,
        "preferencias": ["kamar", "alho descascado", "200g"],
        "evitar": ["triturado com sal", "pasta", "frito"]
    },
    {
        "categoria": "Hortifrúti Inteligente",
        "nome": "Cebola Amarela Fracionada (~500g a 1kg menor)",
        "busca": "cebola",
        "qtd": 1,
        "preferencias": ["cebola", "500g", "600g", "bandeja", "1kg", "select"],
        "evitar": ["2kg", "3kg", "10kg", "frita", "palha", "crispy", "roxa", "sobrecoxa"]
    }
]

# --- HIGIENE PESSOAL FIXA ---
ITENS_HIGIENE: List[Dict[str, Any]] = [
    {
        "categoria": "Higiene Pessoal",
        "nome": "Desodorante Antitranspirante Aerosol Rexona 150ml",
        "busca": "desodorante aerosol rexona",
        "qtd": 1,
        "preferencias": ["aerosol", "rexona", "antibacterial", "clinical"],
        "evitar": ["roll-on", "creme"]
    },
    {
        "categoria": "Higiene Pessoal",
        "nome": "Sabonete em Barra (Dove ou Rexona - Pack 4 un)",
        "busca": "sabonete pack",
        "qtd": 1,
        "preferencias": ["pack", "dove", "rexona", "4x", "4 unidades"],
        "evitar": ["liquido"]
    }
]

# --- REPOSIÇÃO LENTA OPCIONAL (VIA FLAG --com-azeite) ---
ITEM_AZEITE: Dict[str, Any] = {
    "categoria": "Reposição Lenta / Despensa",
    "nome": "Azeite de Oliva Extra Virgem 500ml",
    "busca": "azeite extra virgem 500ml",
    "qtd": 1,
    "preferencias": ["andorinha", "gallo", "serrata", "extra virgem"],
    "evitar": ["composto", "oleo"]
}

ITENS_PDF_REGULARES: List[Dict[str, Any]] = [
    {"categoria": "Mercearia", "nome": "Macarrão Caseiro Renata Talharim 2 500g", "busca": "macarrao caseiro renata talharim 500g",
     "qtd": 1, "preferencias": ["renata", "talharim 2", "caseiro"], "evitar": ["instantaneo"]},
    {"categoria": "Bebidas", "nome": "Monster Ultra Lata 473ml", "busca": "monster ultra lata 473ml",
     "qtd": 1, "preferencias": ["monster", "ultra", "473ml"], "evitar": ["mango", "pack"]},
    {"categoria": "Bebidas", "nome": "Monster Original Lata 473ml (2 unidades)", "busca": "energetico monster lata 473ml",
     "qtd": 2, "preferencias": ["monster", "original", "473ml"], "evitar": ["ultra", "mango", "juice", "pack"]},
    {"categoria": "Bebidas", "nome": "Monster Mango Loco Lata 473ml (2 unidades)", "busca": "monster mango loco lata 473ml",
     "qtd": 2, "preferencias": ["monster", "mango loco", "473ml"], "evitar": ["ultra", "pack"]},
    {"categoria": "Congelados", "nome": "Pão de Alho com Calabresa Mezzani 310g", "busca": "pao de alho calabresa mezzani 310g",
     "qtd": 1, "preferencias": ["mezzani", "calabresa", "310g"], "evitar": ["tradicional", "sem calabresa"]},
    {"categoria": "Laticínios", "nome": "Iogurte Grego Tradicional Zero Lactose Batavo 100g (4 unidades)", "busca": "iogurte grego zero lactose batavo 100g",
     "qtd": 4, "preferencias": ["batavo", "pense zero", "tradicional", "100g"], "evitar": ["morango", "1kg"]},
    {"categoria": "Laticínios", "nome": "Leite Desnatado Zero Lactose Italac 1L (2 unidades)", "busca": "leite desnatado zero lactose italac 1l",
     "qtd": 2, "preferencias": ["italac", "desnatado", "zero lactose", "1l"], "evitar": ["creme de leite", "condensado", "em po"]},
    {"categoria": "Laticínios", "nome": "Manteiga com Sal Danone 200g", "busca": "manteiga danone com sal 200g",
     "qtd": 1, "preferencias": ["danone", "com sal", "200g"], "evitar": ["margarina", "sem sal"]},
]

ITENS_PDF_MENSAIS: List[Dict[str, Any]] = [
    {"categoria": "Mensal", "nome": "Charque Bovino Dianteiro Perdigão 400g", "busca": "charque bovino dianteiro perdigao 400g",
     "qtd": 1, "preferencias": ["perdigao", "dianteiro", "400g"], "evitar": ["suino"]},
    {"categoria": "Mensal", "nome": "Queijo Parmesão Maturado Tirolez 200g", "busca": "parmesao fracionado maturado tirolez 200g",
     "qtd": 1, "preferencias": ["tirolez", "maturado", "200g"], "evitar": ["ralado", "sache"]},
    {"categoria": "Mensal", "nome": "Morango Congelado Sempre Viva 1,02kg", "busca": "morango congelado sempre viva 1kg",
     "qtd": 1, "preferencias": ["sempre viva", "congelado", "1,02kg"], "evitar": ["polpa", "suco"]},
    {"categoria": "Mensal", "nome": "Batata Palito Congelada Mais Batata 2kg", "busca": "batata congelada palito mais batata 2kg",
     "qtd": 1, "preferencias": ["mais batata", "palito", "2kg"], "evitar": ["ondulada", "chips"]},
    {"categoria": "Mensal", "nome": "Camarão Sem Cabeça Qualimar 300g", "busca": "camarao sem cabeca qualimar 300g",
     "qtd": 1, "preferencias": ["qualimar", "sem cabeca", "300g"], "evitar": ["empanado", "com cabeca"]},
]

# Cada grupo contém alternativas aceitas para uma característica obrigatória.
# Faixas de embalagem evitam escolher um produto barato que não atende ao plano.
REGRAS_DESPENSA: Dict[str, Dict[str, Any]] = {
    "macarrao caseiro renata talharim 500g": {"exigir": [["macarrao"], ["renata"], ["talharim 2"]], "peso_g": (450, 550)},
    "monster ultra lata 473ml": {"exigir": [["monster"], ["ultra"]], "volume_ml": (450, 500)},
    "energetico monster lata 473ml": {"exigir": [["monster"]], "volume_ml": (450, 500)},
    "monster mango loco lata 473ml": {"exigir": [["monster"], ["mango loco"]], "volume_ml": (450, 500)},
    "pao de alho calabresa mezzani 310g": {"exigir": [["pao de alho"], ["calabresa"], ["mezzani"]], "peso_g": (280, 350)},
    "iogurte grego zero lactose batavo 100g": {"exigir": [["iogurte"], ["grego"], ["zero lactose"], ["batavo"]], "peso_g": (80, 130)},
    "leite desnatado zero lactose italac 1l": {"exigir": [["leite"], ["desnatado"], ["zero lactose"], ["italac"]], "volume_ml": (900, 1100)},
    "manteiga danone com sal 200g": {"exigir": [["manteiga"], ["danone"], ["com sal"]], "peso_g": (180, 230)},
    "charque bovino dianteiro perdigao 400g": {"exigir": [["charque"], ["bovino"], ["perdigao"]], "peso_g": (350, 500)},
    "parmesao fracionado maturado tirolez 200g": {"exigir": [["parmesao"], ["tirolez"], ["maturado"]], "peso_g": (180, 230)},
    "morango congelado sempre viva 1kg": {"exigir": [["morango"], ["congelado"]], "peso_g": (900, 1150)},
    "batata congelada palito mais batata 2kg": {"exigir": [["batata"], ["palito"], ["congelad"], ["mais batata"]], "peso_g": (1800, 2200)},
    "camarao sem cabeca qualimar 300g": {"exigir": [["camarao"], ["sem cabeca"], ["qualimar"]], "peso_g": (250, 350)},
    "arroz tipo 1 1kg": {"exigir": [["arroz"], ["tipo 1"]], "peso_g": (900, 1100)},
    "feijao carioca 1kg": {"exigir": [["feijao"], ["carioca"]], "peso_g": (900, 1100)},
    "pao de forma tradicional": {"exigir": [["pao de forma"]]},
    "macarrao barilla 500g": {"exigir": [["macarrao", "espaguete", "spaghetti", "penne"]], "peso_g": (400, 600)},
    "molho de tomate barilla vidro": {"exigir": [["molho de tomate", "passata"], ["passata", "barilla", "cirio", "rustico"]], "peso_g": (250, 800)},
    "pao de alho baguete tradicional select 300g": {"exigir": [["pao de alho"]], "peso_g": (250, 450)},
    "leite zero lactose 1l": {"exigir": [["leite"], ["zero lactose", "sem lactose"]], "volume_ml": (900, 1100)},
    "manteiga com sal 200g": {"exigir": [["manteiga"], ["com sal"]], "peso_g": (180, 250)},
    "queijo mussarela fatiado": {"exigir": [["mussarela", "mozzarella"], ["fatiad"]], "peso_g": (250, 600)},
    "queijo parmesao cunha faixa azul tirolez": {"exigir": [["parmesao"]], "peso_g": (80, 220)},
    "requeijao cremoso tradicional copo 200g": {"exigir": [["requeijao"]], "peso_g": (180, 250)},
    "presunto cozido fatiado 200g": {"exigir": [["presunto cozido", "peito de peru"], ["fatiad"]], "peso_g": (150, 300)},
    "queijo brie 125g": {"exigir": [["brie"]], "peso_g": (100, 180)},
    "bebida lactea whey 250ml": {"exigir": [["whey", "proteica"]], "volume_ml": (200, 350)},
    "energetico monster 473ml": {"exigir": [["monster"]], "volume_ml": (400, 550)},
    "energetico baly 2l": {"exigir": [["baly"]], "volume_ml": (1800, 2200)},
    "coca cola sem acucar 2l": {"exigir": [["coca cola", "coca-cola", "guarana"], ["zero", "sem acucar"]], "volume_ml": (1800, 2200)},
    "maionese heinz tradicional": {"exigir": [["maionese"]], "peso_g": (300, 550)},
    "ketchup heinz tradicional": {"exigir": [["ketchup", "catchup"]], "peso_g": (300, 550)},
    "chocolate barra nestle milka lacta": {"exigir": [["chocolate", "trento", "lacta", "milka", "nestle"]], "peso_g": (30, 220)},
    "alho descascado kamar 200g": {"exigir": [["alho"], ["descascado"]], "peso_g": (150, 300)},
    "cebola": {"exigir": [["cebola"]], "peso_g": (400, 1200)},
    "desodorante aerosol rexona": {"exigir": [["rexona"], ["aerosol", "aerossol"]], "volume_ml": (120, 220)},
    "sabonete pack": {"exigir": [["sabonete"], ["pack", "kit", "4 unidades", "4x"]]},
    "azeite extra virgem 500ml": {"exigir": [["azeite"], ["extra virgem"]], "volume_ml": (450, 600)},
}

# --- RADAR DE OPORTUNIDADES & AFINIDADE ---
RADAR_AFINIDADES: List[Dict[str, Any]] = [
    {
        "categoria": "Petisco / Queijo Especial",
        "nome": "Queijo Provolone ou Gorgonzola em Pedaço (Se em boa promoção)",
        "busca": "queijo provolone pedaco tirolez",
        "preferencias": ["provolone", "gorgonzola", "tirolez", "quata", "quatá"],
        "evitar": ["fatiado", "ralado"]
    },
    {
        "categoria": "Energético Econômico",
        "nome": "Energético Baly 2L (Excelente Custo por Litro)",
        "busca": "energetico baly 2l",
        "preferencias": ["baly 2l", "baly"],
        "evitar": ["lata"]
    }
]


def obter_resolucao_tela() -> tuple[int, int]:
    """Detecta a resolução real do monitor do usuário (padrão 1920x1080 se não detectado)."""
    try:
        out = subprocess.check_output(["xrandr"], text=True, stderr=subprocess.DEVNULL)
        for line in out.splitlines():
            if "*" in line:
                m = re.search(r"(\d+)x(\d+)", line)
                if m:
                    return int(m.group(1)), int(m.group(2))
    except Exception:
        pass
    return 1920, 1080


def limpar_cookies(page: Page):
    """Fecha avisos de cookies se estiverem visíveis."""
    try:
        cookie_btn = page.locator('button:has-text("Concordar e fechar")')
        if cookie_btn.count() > 0 and cookie_btn.first.is_visible():
            cookie_btn.first.click(force=True)
    except Exception:
        pass


def localizacao_ja_confirmada(page: Page, cep: str = CEP_DESTINO) -> bool:
    """Verifica se a localização já está ativa na sessão atual."""
    try:
        modal = page.locator('#modal-shipping')
        if modal.is_visible():
            return False

        if FILIAL_ID_CONFIRMADA:
            cookies = page.context.cookies()
            if any(c["name"] == "_Tendaatacado-branchID" and c["value"] == FILIAL_ID_CONFIRMADA
                   for c in cookies):
                return True

        body_text = page.locator('body').inner_text().lower()
        if texto_confirma_retirada_ribeirao(body_text):
            return True
        if "ribeirão preto" in body_text and "seu carrinho ainda está vazio" in body_text:
            return True
        if cep[:5] in body_text and "sumarezinho" in body_text:
            return True
    except Exception:
        pass
    return False


def texto_confirma_retirada_ribeirao(texto: str) -> bool:
    """Aceita a quebra de linha que separa o rótulo e a filial no cabeçalho."""
    sem_acento = unicodedata.normalize("NFKD", texto.casefold())
    sem_acento = "".join(c for c in sem_acento if not unicodedata.combining(c))
    return bool(re.search(r'\bretirar\s+na\s+loja\s*:\s*ribeirao\s+preto\b', sem_acento))


def configurar_localizacao_completa(page: Page, context: BrowserContext, cep: str = CEP_DESTINO) -> bool:
    """Confere a filial já escolhida pelo usuário; não escolhe entrega nem horário."""
    print(f"📍 Conferindo filial de Ribeirão Preto (CEP {cep[:5]}-{cep[5:]})...")
    page.goto("https://www.tendaatacado.com.br/busca?q=frango", timeout=30000)
    page.wait_for_load_state("domcontentloaded")
    limpar_cookies(page)
    if aguardar_localizacao_ativa(page, cep, tentativas=5):
        print("✅ Filial já selecionada na sessão. Entrega e horário ficam para a conferência manual.")
        return True
    if confirmar_filial_no_carrinho(page, cep):
        print("✅ Filial e CEP confirmados pela API do carrinho. Entrega e horário ficam para a conferência manual.")
        return True
    print("❌ Selecione a filial Ribeirão Preto no site antes de montar o carrinho.")
    return False


def confirmar_filial_no_carrinho(page: Page, cep: str) -> bool:
    """Confere a filial informada pelo Tenda sem alterar modalidade ou horário."""
    global FILIAL_ID_CONFIRMADA
    try:
        with page.expect_response(
            lambda response: response.url.rstrip('/') == 'https://api.tendaatacado.com.br/api/shopping-cart'
            and response.status == 200, timeout=30000,
        ) as resposta:
            page.goto("https://www.tendaatacado.com.br/carrinho", wait_until="domcontentloaded", timeout=30000)
        dados = resposta.value.json()
        filial = dados.get("storeName", "")
        retirada = dados.get("pickupStore") or {}
        endereco = (retirada.get("address") or {}).get("addressLine1", "")
        id_filial = str(dados.get("branchId") or "")
        if (dados.get("zipCode") == cep and "ribeirão preto" in filial.casefold()
                and NOME_FILIAL.casefold() in endereco.casefold() and id_filial):
            FILIAL_ID_CONFIRMADA = id_filial
            return True
    except Exception as e:
        print(f"  ⚠️ Não foi possível conferir a filial pela API do carrinho: {e}")
    return False


def aguardar_localizacao_ativa(page: Page, cep: str = CEP_DESTINO, tentativas: int = 15) -> bool:
    for _ in range(tentativas):
        if localizacao_ja_confirmada(page, cep):
            return True
        page.wait_for_timeout(1000)
    return False


def texto_indica_carrinho_vazio(texto: str) -> bool:
    """Reconhece mensagens de carrinho vazio sem depender de um único seletor."""
    return bool(re.search(
        r'\b0\s+itens?\b|carrinho\s+(?:est[aá]\s+)?vazio|nenhum\s+produto\s+(?:no|em\s+seu)\s+carrinho',
        texto, re.IGNORECASE,
    ))


def pagina_carrinho_confirmada(page: Page) -> bool:
    """Confirma a tela pelo conteúdo, pois o checkout pode mudar de rota."""
    if page.get_by_text(re.compile(r'^meu carrinho$', re.IGNORECASE)).first.is_visible():
        return True
    if page.locator('input[name="vehicle1"]').first.is_visible():
        return True
    destino = urlsplit(page.url)
    rota_carrinho = any(palavra in (destino.path + destino.fragment).lower() for palavra in ("carrinho", "cart", "checkout"))
    return rota_carrinho and texto_indica_carrinho_vazio(page.locator("body").inner_text(timeout=5000))


def inicio_com_carrinho_zerado(page: Page) -> bool:
    """Ao esvaziar a cesta, o Tenda redireciona /carrinho para a página inicial."""
    destino = urlsplit(page.url)
    if destino.path not in ("", "/") or destino.netloc != "www.tendaatacado.com.br":
        return False
    texto = page.locator("body").inner_text(timeout=5000)
    return bool(re.search(r'R\$\s*0\s*,\s*00\b', texto[:500]))


def abrir_pagina_carrinho(page: Page) -> bool:
    page.goto("https://www.tendaatacado.com.br/carrinho", timeout=30000)
    page.wait_for_load_state("domcontentloaded")
    for _ in range(15):
        if inicio_com_carrinho_zerado(page):
            return True
        if page.locator('input[name="vehicle1"]').first.is_visible():
            return True
        if page.locator('.ProductCardCart').count() > 0:
            return True
        page.wait_for_timeout(1000)
    destino = urlsplit(page.url)
    print(f"  ⚠️ Destino após abrir carrinho: {destino.scheme}://{destino.netloc}{destino.path}")
    return False


def carrinho_vazio_confirmado(page: Page) -> bool:
    if inicio_com_carrinho_zerado(page):
        return True
    if not pagina_carrinho_confirmada(page):
        return False
    texto = page.locator("body").inner_text(timeout=5000)
    selecionador = page.locator('input[name="vehicle1"]').first
    return texto_indica_carrinho_vazio(texto) and not selecionador.is_visible()


def esvaziar_carrinho_se_necessario(page: Page, context: BrowserContext, cep: str = CEP_DESTINO) -> bool:
    """
    Verifica se o carrinho contém produtos residuais de execuções anteriores
    e esvazia completamente antes de iniciar a nova seleção de compras.
    """
    print("\n🧹 Verificando se há itens residuais no carrinho para limpeza prévia...")
    try:
        limpar_cookies(page)
        if not abrir_pagina_carrinho(page):
            print("  ❌ Não foi possível abrir a tela do carrinho para limpeza.")
            return False

        if carrinho_vazio_confirmado(page):
            print("  ✅ Carrinho já está completamente limpo (R$ 0,00).")
            return True

        # A moldura do checkout aparece antes de a lista de produtos carregar.
        # Aguarda a lista ou uma mensagem explícita de carrinho vazio.
        chk_todos = page.locator('input[name="vehicle1"]').first
        for _ in range(15):
            if carrinho_vazio_confirmado(page):
                print("  ✅ Carrinho já está completamente limpo (R$ 0,00).")
                return True
            if chk_todos.is_visible():
                break
            page.wait_for_timeout(1000)
        else:
            print("  ❌ A lista de produtos não carregou; limpeza não confirmada.")
            return False

        print("  🗑️ Itens residuais detectados no carrinho. Selecionando todos para apagar...")
        chk_todos.check(force=True)
        if not chk_todos.is_checked():
            print("  ❌ Não foi possível selecionar os itens para remoção.")
            return False

        trash_btn = page.locator('.icon-trash:has-text("Apagar"), .icon-trash').first
        if not trash_btn.is_visible():
            print("  ❌ Botão de apagar não encontrado.")
            return False
        trash_btn.click(force=True)

        modal_confirm = page.locator('.modal:visible, [role="dialog"]:visible').filter(
            has_text=re.compile(r'remov|apagar|exclu', re.IGNORECASE)
        ).first
        try:
            modal_confirm.wait_for(state="visible", timeout=3000)
            btn_confirmar = modal_confirm.locator(
                'button:has-text("Continuar"), a:has-text("Continuar"), '
                'button:has-text("Confirmar"), button:has-text("Apagar"), '
                'button:has-text("Remover"), button:has-text("Excluir")'
            ).first
            btn_confirmar.click(timeout=5000)
        except Exception:
            # Algumas versões removem diretamente, sem modal.
            if modal_confirm.count() and modal_confirm.is_visible():
                print("  ❌ Modal de remoção aberto, mas a confirmação falhou.")
                return False

        # A remoção só aparece após a atualização assíncrona e o redirecionamento.
        # Recarregar aqui cancela a transição em algumas execuções.
        for _ in range(20):
            if carrinho_vazio_confirmado(page):
                break
            page.wait_for_timeout(1000)
        else:
            print("  ❌ Carrinho ainda contém itens ou a página não confirmou que está vazio.")
            return False
        print("  ✨ Carrinho limpo e zerado com sucesso!")

        # Atualiza a sessão persistente com o carrinho limpo
        try:
            if ARQUIVO_SESSAO:
                context.storage_state(path=ARQUIVO_SESSAO)
        except Exception:
            pass

        return True
    except Exception as e:
        print(f"  ⚠️ Aviso ao esvaziar carrinho: {e}")
        return False


def extrair_dados_card(card_locator, btn_locator) -> Dict[str, Any]:
    """Extrai texto, título, preços e descontos de atacado."""
    try:
        texto = card_locator.inner_text() if card_locator.count() > 0 else btn_locator.locator('xpath=../..').inner_text()
    except Exception:
        texto = ""

    linhas = [
        l.strip() for l in texto.split('\n') 
        if l.strip() and l.strip().lower() not in ['anúncio', 'anuncio', 'patrocinado', 'vendido por: tenda', 'vendido por:']
    ]
    titulo = linhas[0] if linhas else "Produto"

    preco_unit = None
    preco_kg = None
    desconto_atacado = None

    texto_normalizado = re.sub(r'[\s\xa0]+', ' ', texto)

    for l in linhas:
        if "r$" in l.lower():
            m = re.search(r'R\$\s*([\d\.]+,\d{2})', l)
            if m and preco_unit is None:
                try:
                    preco_unit = float(m.group(1).replace('.', '').replace(',', '.'))
                except Exception:
                    pass

        if "valor do kg" in l.lower() or "kg:" in l.lower():
            m_kg = re.search(r'R\$\s*([\d\.]+,\d{2})', l)
            if m_kg:
                try:
                    preco_kg = float(m_kg.group(1).replace('.', '').replace(',', '.'))
                except Exception:
                    pass

    m_prog = re.search(r'a partir de\s*(\d+)\s*unidades?[^|R$]*[|]?\s*R\$\s*([\d\.,]+)', texto_normalizado, re.IGNORECASE)
    if m_prog:
        try:
            qtd_gatilho = int(m_prog.group(1))
            preco_atacado = float(m_prog.group(2).replace('.', '').replace(',', '.'))
            desconto_atacado = {
                "qtd_minima": qtd_gatilho,
                "preco_atacado": preco_atacado
            }
        except Exception:
            pass

    return {
        "titulo": titulo,
        "preco_unit": preco_unit,
        "preco_kg": preco_kg,
        "desconto_atacado": desconto_atacado,
        "texto_lower": texto.lower()
    }


def preco_por_kg(info: Dict[str, Any]) -> Optional[float]:
    """Compara alimentos frescos apenas quando o preço por kg é conhecido."""
    if info["preco_kg"] and info["preco_kg"] > 0:
        return info["preco_kg"]
    titulo = info["titulo"].lower()
    peso = re.search(r'(\d+(?:[.,]\d+)?)\s*(kg|g)\b', titulo)
    if not peso or not info["preco_unit"]:
        return None
    quilos = float(peso.group(1).replace(',', '.'))
    if peso.group(2) == 'g':
        quilos /= 1000
    return info["preco_unit"] / quilos if quilos > 0 else None


def peso_produto_g(info: Dict[str, Any]) -> Optional[float]:
    titulo = info["titulo"].lower()
    peso = re.search(r'(\d+(?:[.,]\d+)?)\s*(kg|g)\b', titulo)
    if peso:
        valor = float(peso.group(1).replace(',', '.'))
        return valor * 1000 if peso.group(2) == "kg" else valor
    if info["preco_unit"] and info["preco_kg"]:
        return 1000 * info["preco_unit"] / info["preco_kg"]
    return None


def volume_produto_ml(titulo: str) -> Optional[float]:
    volume = re.search(r'(\d+(?:[.,]\d+)?)\s*(ml|l)\b', titulo.lower())
    if not volume:
        return None
    valor = float(volume.group(1).replace(',', '.'))
    return valor * 1000 if volume.group(2) == "l" else valor


def produto_despensa_compativel(info: Dict[str, Any], item: Dict[str, Any]) -> bool:
    regra = REGRAS_DESPENSA.get(item["busca"])
    if regra is None:
        raise ValueError(f"Falta regra de identidade para: {item['busca']}")
    titulo = normalizar_nome(info["titulo"])
    if not all(any(normalizar_nome(termo) in titulo for termo in alternativas)
               for alternativas in regra["exigir"]):
        return False
    if "peso_g" in regra:
        peso = peso_produto_g(info)
        if peso is None or not regra["peso_g"][0] <= peso <= regra["peso_g"][1]:
            return False
    if "volume_ml" in regra:
        volume = volume_produto_ml(info["titulo"])
        if volume is None or not regra["volume_ml"][0] <= volume <= regra["volume_ml"][1]:
            return False
    return True


def corte_compativel(info: Dict[str, Any], candidato: Dict[str, Any], faixa_peso_g: tuple[int, int]) -> bool:
    titulo = normalizar_nome(info["titulo"])
    if not all(any(normalizar_nome(termo) in titulo for termo in alternativas)
               for alternativas in candidato["exigir"]):
        return False
    peso = peso_produto_g(info)
    return peso is not None and faixa_peso_g[0] <= peso <= faixa_peso_g[1]


def normalizar_nome(nome: str) -> str:
    sem_acento = unicodedata.normalize("NFKD", nome.casefold())
    return " ".join("".join(c for c in sem_acento if not unicodedata.combining(c)).split())


def reconciliar_itens(itens: List[Dict[str, Any]], linhas: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Confirma somente linhas com nome, quantidade e preço unitário legíveis."""
    por_nome = {}
    for linha in linhas:
        por_nome.setdefault(normalizar_nome(linha["titulo"]), []).append(linha)
    resultado = []
    for item in itens:
        encontrados = por_nome.get(normalizar_nome(item["produto_escolhido"]), [])
        if not encontrados:
            status = "Não encontrado"
        elif len(encontrados) != 1:
            status = "Não verificado (nome duplicado)"
        else:
            linha = encontrados[0]
            if linha.get("qtd") is None or not linha.get("precos"):
                status = "Não verificado (dados incompletos)"
            elif linha["qtd"] != item["qtd"]:
                status = "Quantidade divergente"
            elif min(linha["precos"]) > item["preco_unit"] + 0.01:
                status = "Preço divergente"
            else:
                status = "Confirmado"
        atualizado = {**item, "status": status,
                      "linha_carrinho": encontrados[0] if len(encontrados) == 1 else None}
        if status == "Confirmado":
            atualizado["preco_unit"] = min(linha["precos"])
            atualizado["subtotal"] = round(atualizado["preco_unit"] * item["qtd"], 2)
        resultado.append(atualizado)
    planejados = {normalizar_nome(item["produto_escolhido"]) for item in itens}
    for linha in linhas:
        if normalizar_nome(linha["titulo"]) in planejados:
            continue
        preco = linha["precos"][0] if linha.get("precos") else 0.0
        qtd = linha.get("qtd") or 0
        resultado.append({
            "categoria": "Não planejado", "nome_planejado": "—",
            "produto_escolhido": linha["titulo"], "preco_unit": preco,
            "qtd": qtd, "subtotal": preco * qtd,
            "status": "Item extra no carrinho", "linha_carrinho": linha,
        })
    return resultado


def verificar_carrinho(page: Page, itens: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Lê a página do carrinho; não infere sucesso a partir dos cliques."""
    if not abrir_pagina_carrinho(page):
        raise RuntimeError("Tela do carrinho não carregou")
    return reconciliar_itens(itens, ler_linhas_carrinho(page))


def ler_linhas_carrinho(page: Page) -> List[Dict[str, Any]]:
    """Extrai nome, quantidade e preço unitário efetivo das linhas da loja."""
    linhas = page.evaluate("""() => {
      const parseMoeda = s => { const m = (s || '').match(/R\\$\\s*([\\d.]+,\\d{2})/); return m ? Number(m[1].replace(/\\./g, '').replace(',', '.')) : null; };
      return [...document.querySelectorAll('.ProductCardCart')].map(row => {
        const titulo = row.querySelector('.cart-page-product-name h3')?.textContent?.trim() || '';
        const campoQtd = row.querySelector('input.input-qtd');
        const qtd = campoQtd && /^\\d+$/.test(campoQtd.value) ? Number(campoQtd.value) : null;
        const preco = parseMoeda(row.querySelector('.card-new-price')?.textContent);
        return {titulo, qtd, precos: preco === null ? [] : [preco]};
      }).filter(row => row.titulo);
    }""")
    if not linhas and not carrinho_vazio_confirmado(page):
        raise RuntimeError("Não foi possível ler produtos na página do carrinho")
    return linhas


def conferir_plano_no_carrinho(page: Page, carnes: List[Dict[str, Any]],
                              itens: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Compara o carrinho persistido com a cesta sem limpar nem adicionar nada."""
    if not abrir_pagina_carrinho(page):
        raise RuntimeError("Tela do carrinho não carregou")
    linhas = ler_linhas_carrinho(page)
    resultado = []
    usados = set()
    planos = [(g["nome_geral"], g["categoria"], g["qtd"], "carne", g) for g in carnes]
    planos.extend((it["nome"], it["categoria"], it["qtd"], "despensa", it) for it in itens)
    for nome, categoria, qtd, tipo, config in planos:
        candidatos = []
        for indice, linha in enumerate(linhas):
            info = {"titulo": linha["titulo"],
                    "preco_unit": linha["precos"][0] if linha["precos"] else None,
                    "preco_kg": None}
            if tipo == "carne":
                compat = any(corte_compativel(info, candidato, config["faixa_peso_g"])
                             for candidato in config["candidatos"])
            else:
                compat = produto_despensa_compativel(info, config)
                compat = compat and not any(normalizar_nome(ev) in normalizar_nome(linha["titulo"])
                                            for ev in config["evitar"])
            if compat:
                candidatos.append((indice, linha))
        if len(candidatos) == 1:
            indice, linha = candidatos[0]
            usados.add(indice)
            preco = linha["precos"][0] if linha["precos"] else 0.0
            status = "Confirmado" if linha["qtd"] == qtd and preco else "Quantidade ou preço divergente"
            produto = linha["titulo"]
        else:
            preco = 0.0
            produto = nome
            status = "Não encontrado" if not candidatos else "Correspondência ambígua"
        resultado.append({"categoria": categoria, "nome_planejado": nome,
                          "produto_escolhido": produto, "preco_unit": preco,
                          "qtd": qtd, "subtotal": round(preco * qtd, 2), "status": status})
    for indice, linha in enumerate(linhas):
        if indice not in usados:
            preco = linha["precos"][0] if linha["precos"] else 0.0
            resultado.append({"categoria": "Não planejado", "nome_planejado": "—",
                              "produto_escolhido": linha["titulo"], "preco_unit": preco,
                              "qtd": linha["qtd"] or 0,
                              "subtotal": round(preco * (linha["qtd"] or 0), 2),
                              "status": "Item extra no carrinho"})
    return resultado


def ajustar_quantidades_carrinho(page: Page, itens: List[Dict[str, Any]]) -> None:
    """Ajusta unidades pelo controle do carrinho depois de adicionar cada produto uma vez."""
    if not abrir_pagina_carrinho(page):
        raise RuntimeError("Não foi possível abrir o carrinho para ajustar quantidades")

    def ler_quantidade(titulo: str) -> int:
        page.wait_for_function(
            "titulo => [...document.querySelectorAll('.ProductCardCart')].some(row => "
            "row.querySelector('.cart-page-product-name h3')?.textContent?.trim() === titulo && "
            "row.querySelector('input.input-qtd'))",
            arg=titulo, timeout=30000,
        )
        quantidade = page.evaluate(
            "titulo => { const row = [...document.querySelectorAll('.ProductCardCart')].find(row => "
            "row.querySelector('.cart-page-product-name h3')?.textContent?.trim() === titulo); "
            "return Number(row?.querySelector('input.input-qtd')?.value); }", titulo,
        )
        if not quantidade:
            raise RuntimeError(f"Quantidade ilegível no carrinho: {titulo}")
        return quantidade

    for item in itens:
        desejada = item["qtd"]
        if desejada <= 1:
            continue
        titulo = item["produto_escolhido"]
        linha = page.locator('.ProductCardCart').filter(
            has=page.get_by_role('heading', name=titulo, exact=True)
        ).first
        try:
            atual = ler_quantidade(titulo)
            tentativas_sem_progresso = 0
            while atual < desejada:
                linha.locator('.box-quantity .btn-action').first.click()
                try:
                    page.wait_for_function(
                        "({titulo, esperado}) => [...document.querySelectorAll('.ProductCardCart')].some(row => "
                        "row.querySelector('.cart-page-product-name h3')?.textContent?.trim() === titulo && "
                        "Number(row.querySelector('input.input-qtd')?.value) >= esperado)",
                        arg={"titulo": titulo, "esperado": atual + 1}, timeout=20000,
                    )
                except Exception:
                    pass
                page.wait_for_timeout(1500)
                page.reload(wait_until="domcontentloaded")
                confirmado = ler_quantidade(titulo)
                if confirmado > atual:
                    tentativas_sem_progresso = 0
                else:
                    tentativas_sem_progresso += 1
                    if tentativas_sem_progresso >= 2:
                        raise RuntimeError(f"Site não confirmou incremento de {titulo}")
                atual = confirmado
            if atual > desejada:
                raise RuntimeError(f"Quantidade acima do planejado para {titulo}: {atual}")
            print(f"  🔢 {titulo}: {atual} unidade(s) no carrinho")
        except Exception as e:
            print(f"  ⚠️ Não foi possível ajustar {titulo}: {e}")


def buscar_melhor_opcao_corte(page: Page, candidato: Dict[str, Any], faixa_peso_g: tuple[int, int]) -> Optional[Dict[str, Any]]:
    """Pesquisa um corte específico e retorna seus melhores dados para comparação."""
    termo = candidato["busca"]
    limpar_cookies(page)

    url = f"https://www.tendaatacado.com.br/busca?q={termo.replace(' ', '+')}"
    page.goto(url, timeout=30000)
    page.wait_for_load_state("domcontentloaded")
    if not aguardar_localizacao_ativa(page):
        raise RuntimeError("Filial não confirmada durante a pesquisa de carnes")

    btn_add = page.locator('button:has-text("Adicionar")')
    if btn_add.count() == 0:
        return None

    opcoes = []
    for i in range(min(15, btn_add.count())):
        btn = btn_add.nth(i)
        card = btn.locator('xpath=ancestor::*[contains(@class, "ProductCardShowcase") or contains(@class, "showcase-card") or contains(@class, "card")][1]')
        info = extrair_dados_card(card, btn)
        texto = info["titulo"].lower()

        if not corte_compativel(info, candidato, faixa_peso_g):
            continue
        if any(ev.lower() in texto for ev in candidato["evitar"]):
            continue

        score = sum(2 for p in candidato["preferencias"] if p.lower() in texto)
        if score == 0:
            continue

        preco_comp = preco_por_kg(info)
        if preco_comp is None or not info["preco_unit"]:
            continue

        opcoes.append({
            "nome_corte": candidato["nome_corte"],
            "busca": termo,
            "indice": i,
            "btn": btn,
            "titulo": info["titulo"],
            "preco_unit": info["preco_unit"] or 0.0,
            "preco_kg": info["preco_kg"],
            "desconto_atacado": info["desconto_atacado"],
            "preco_comp": preco_comp,
            "score": score
        })

    if not opcoes:
        return None

    opcoes.sort(key=lambda x: (x["preco_comp"], -x["score"]))
    return opcoes[0]


def processar_grupo_carne_dinamico(page: Page, grupo: Dict[str, Any], apenas_pesquisa: bool = False, cep: str = CEP_DESTINO) -> Optional[Dict[str, Any]]:
    """Compara múltiplos cortes de carnes e escolhe o grande vencedor em custo-benefício."""
    print(f"\n🥩 [COMPARADOR DE CARNES] {grupo['nome_geral']}...")
    print(f"   Avaliando {len(grupo['candidatos'])} opções de cortes no catálogo...")

    resultados_candidatos = []
    for cand in grupo["candidatos"]:
        melhor_corte = buscar_melhor_opcao_corte(page, cand, grupo["faixa_peso_g"])
        if melhor_corte:
            resultados_candidatos.append(melhor_corte)
            preco_kg_str = f"({melhor_corte['preco_kg']:.2f}/kg)".replace('.', ',') if melhor_corte['preco_kg'] else ""
            print(f"   • {melhor_corte['nome_corte']}: R$ {melhor_corte['preco_unit']:.2f} {preco_kg_str}")

    if not resultados_candidatos:
        print("  ❌ Nenhum corte deste grupo com estoque disponível.")
        return None

    # ORDENAÇÃO DOS CORTES:
    # Prioriza o corte com menor preço de comparação (menor valor por kg ou unitário)
    resultados_candidatos.sort(key=lambda x: x["preco_comp"])
    vencedor = resultados_candidatos[0]

    qtd = grupo["qtd"]
    subtotal = vencedor["preco_unit"] * qtd
    preco_fmt = f"R$ {vencedor['preco_unit']:.2f}".replace('.', ',')
    preco_kg_fmt = f"(R$ {vencedor['preco_kg']:.2f}/kg)" if vencedor['preco_kg'] else ""

    aviso_atacado = ""
    if vencedor["desconto_atacado"]:
        gatilho = vencedor["desconto_atacado"]
        if qtd < gatilho["qtd_minima"]:
            diff = gatilho["qtd_minima"] - qtd
            aviso_atacado = f"💡 DICA ATACADO: Levar +{diff} un ativa preço de R$ {gatilho['preco_atacado']:.2f}/un".replace('.', ',')

    if apenas_pesquisa:
        print(f"  🏆 [CORTE VENCEDOR] {vencedor['titulo']}")
        print(f"     Preço: {preco_fmt} {preco_kg_fmt} | Quantidade: {qtd} un")
        if aviso_atacado:
            print(f"     {aviso_atacado}")
        return {
            "categoria": grupo["categoria"],
            "nome_planejado": grupo["nome_geral"],
            "produto_escolhido": vencedor["titulo"],
            "preco_unit": vencedor["preco_unit"],
            "preco_kg": vencedor["preco_kg"],
            "qtd": qtd,
            "subtotal": subtotal,
            "dica_atacado": aviso_atacado,
            "status": "Pesquisado"
        }

    # Adiciona o corte vencedor ao carrinho navegando para sua busca
    try:
        limpar_cookies(page)
        url_vencedor = f"https://www.tendaatacado.com.br/busca?q={vencedor['busca'].replace(' ', '+')}"
        page.goto(url_vencedor, timeout=30000)
        page.wait_for_load_state("domcontentloaded")
        if not aguardar_localizacao_ativa(page, cep):
            raise RuntimeError("Filial não confirmada antes de adicionar a carne")

        try:
            page.locator('button:has-text("Adicionar")').first.wait_for(state="visible", timeout=10000)
        except Exception:
            pass

        card_atual = page.locator('[class*="ProductCardShowcase"], [class*="showcase-card"]').filter(has_text=vencedor["titulo"]).first
        if not card_atual.count():
            raise RuntimeError(f"Produto vencedor não encontrado após recarregar: {vencedor['titulo']}")
        card_atual.locator('button:has-text("Adicionar")').first.click()
        page.wait_for_timeout(750)
        if page.locator('#modal-shipping').is_visible():
            raise RuntimeError("Site pediu modalidade de entrega; item ficará pendente para escolha manual")

        print(f"  🛒 [ADIÇÃO SOLICITADA - CORTE VENCEDOR] {vencedor['titulo']}")
        print(f"     Preço: {preco_fmt} {preco_kg_fmt} x {qtd} un = R$ {subtotal:.2f}".replace('.', ','))
        if aviso_atacado:
            print(f"     {aviso_atacado}")

        return {
            "categoria": grupo["categoria"],
            "nome_planejado": grupo["nome_geral"],
            "produto_escolhido": vencedor["titulo"],
            "preco_unit": vencedor["preco_unit"],
            "preco_kg": vencedor["preco_kg"],
            "qtd": qtd,
            "subtotal": subtotal,
            "dica_atacado": aviso_atacado,
            "status": "Adição solicitada"
        }
    except Exception as e:
        print(f"  ❌ Erro ao adicionar corte vencedor: {e}")
        return None


def selecionar_produto_despensa(page: Page, item: Dict[str, Any], apenas_pesquisa: bool = False, cep: str = CEP_DESTINO) -> Optional[Dict[str, Any]]:
    """Pesquisa itens fixos de despensa e higiene."""
    termo = item["busca"]
    qtd = item["qtd"]
    nome_exibicao = item["nome"]

    print(f"\n🔍 Buscando [{item['categoria']}]: {nome_exibicao}...")
    limpar_cookies(page)

    url = f"https://www.tendaatacado.com.br/busca?q={termo.replace(' ', '+')}"
    page.goto(url, timeout=30000)
    page.wait_for_load_state("domcontentloaded")
    if not aguardar_localizacao_ativa(page, cep):
        raise RuntimeError("Filial não confirmada durante a pesquisa da despensa")

    btn_add = page.locator('button:has-text("Adicionar")')
    if btn_add.count() == 0:
        print(f"  ❌ Nenhum produto disponível encontrado para '{termo}'.")
        return None

    candidatos = []
    for i in range(min(15, btn_add.count())):
        btn = btn_add.nth(i)
        card = btn.locator('xpath=ancestor::*[contains(@class, "ProductCardShowcase") or contains(@class, "showcase-card") or contains(@class, "card")][1]')
        info = extrair_dados_card(card, btn)
        texto = info["titulo"].lower()

        if not produto_despensa_compativel(info, item):
            continue
        if any(ev.lower() in texto for ev in item["evitar"]):
            continue

        score = sum(2 for p in item["preferencias"] if p.lower() in texto)
        if score == 0:
            continue

        fresco = item["categoria"] == "Hortifrúti Inteligente"
        preco_comp = preco_por_kg(info) if fresco else info["preco_unit"]
        if preco_comp is None or not info["preco_unit"]:
            continue

        candidatos.append({
            "btn": btn,
            "titulo": info["titulo"],
            "preco_unit": info["preco_unit"] or 0.0,
            "preco_kg": info["preco_kg"],
            "desconto_atacado": info["desconto_atacado"],
            "preco_comp": preco_comp,
            "score": score
        })

    if not candidatos:
        print(f"  ❌ Nenhum produto atendeu aos critérios de preferência para '{termo}'.")
        return None

    candidatos.sort(key=lambda x: (x["preco_comp"], -x["score"]))
    melhor = candidatos[0]

    aviso_atacado = ""
    if melhor["desconto_atacado"]:
        gatilho = melhor["desconto_atacado"]
        if qtd < gatilho["qtd_minima"]:
            diff = gatilho["qtd_minima"] - qtd
            aviso_atacado = f"💡 DICA ATACADO: Levar +{diff} un ativa preço de R$ {gatilho['preco_atacado']:.2f}/un".replace('.', ',')

    preco_formatado = f"R$ {melhor['preco_unit']:.2f}".replace('.', ',')
    subtotal = melhor["preco_unit"] * qtd

    if apenas_pesquisa:
        print(f"  📊 [MELHOR OPÇÃO] {melhor['titulo']}")
        print(f"     Preço Unitário: {preco_formatado} | Quantidade: {qtd} un")
        if aviso_atacado:
            print(f"     {aviso_atacado}")
        return {
            "categoria": item["categoria"],
            "nome_planejado": nome_exibicao,
            "produto_escolhido": melhor["titulo"],
            "preco_unit": melhor["preco_unit"],
            "qtd": qtd,
            "subtotal": subtotal,
            "dica_atacado": aviso_atacado,
            "status": "Pesquisado"
        }

    try:
        limpar_cookies(page)
        card_atual = page.locator('[class*="ProductCardShowcase"], [class*="showcase-card"]').filter(has_text=melhor["titulo"]).first
        if not card_atual.count():
            raise RuntimeError(f"Produto não encontrado para adição: {melhor['titulo']}")
        card_atual.locator('button:has-text("Adicionar")').first.click()
        page.wait_for_timeout(750)
        if page.locator('#modal-shipping').is_visible():
            raise RuntimeError("Site pediu modalidade de entrega; item ficará pendente para escolha manual")

        print(f"  🛒 [ADIÇÃO SOLICITADA] {melhor['titulo']}")
        print(f"     Preço Unit: {preco_formatado} x {qtd} un planejadas = R$ {subtotal:.2f}".replace('.', ','))
        if aviso_atacado:
            print(f"     {aviso_atacado}")

        return {
            "categoria": item["categoria"],
            "nome_planejado": nome_exibicao,
            "produto_escolhido": melhor["titulo"],
            "preco_unit": melhor["preco_unit"],
            "qtd": qtd,
            "subtotal": subtotal,
            "dica_atacado": aviso_atacado,
            "status": "Adição solicitada"
        }
    except Exception as e:
        print(f"  ❌ Erro ao adicionar ao carrinho: {e}")
        return None


def executar_radar_oportunidades(page: Page) -> List[Dict[str, Any]]:
    """Varre produtos fora da lista base que combinam com o perfil e estão em oferta."""
    print("\n" + "=" * 90)
    print("📡 EXECUTANDO RADAR DE OPORTUNIDADES & ACHADOS (ALTA AFINIDADE)")
    print("   Varrendo itens fitness, proteínas práticas e mimos que costumam compensar...")
    print("=" * 90)

    achados = []
    for item in RADAR_AFINIDADES:
        limpar_cookies(page)
        url = f"https://www.tendaatacado.com.br/busca?q={item['busca'].replace(' ', '+')}"
        page.goto(url, timeout=30000)
        page.wait_for_load_state("domcontentloaded")
        page.wait_for_timeout(1400)

        btn_add = page.locator('button:has-text("Adicionar")')
        if btn_add.count() == 0:
            continue

        for i in range(min(3, btn_add.count())):
            btn = btn_add.nth(i)
            card = btn.locator('xpath=ancestor::*[contains(@class, "ProductCardShowcase") or contains(@class, "showcase-card") or contains(@class, "card")][1]')
            info = extrair_dados_card(card, btn)

            if any(ev.lower() in info["texto_lower"] for ev in item["evitar"]):
                continue

            preco_fmt = f"R$ {info['preco_unit']:.2f}".replace('.', ',') if info['preco_unit'] else "Consulte"
            preco_kg_fmt = f"(R$ {info['preco_kg']:.2f}/kg)".replace('.', ',') if info['preco_kg'] else ""
            
            dica = ""
            if info["desconto_atacado"]:
                dica = f"🔥 Atacado a partir de {info['desconto_atacado']['qtd_minima']} un: R$ {info['desconto_atacado']['preco_atacado']:.2f}".replace('.', ',')

            achados.append({
                "categoria": item["categoria"],
                "nome_interesse": item["nome"],
                "produto": info["titulo"],
                "preco": preco_fmt,
                "preco_kg": preco_kg_fmt,
                "dica": dica
            })
            print(f"  ✨ [{item['categoria']}] {info['titulo']}")
            print(f"     Preço: {preco_fmt} {preco_kg_fmt} {('| ' + dica) if dica else ''}")
            break

    return achados


def exportar_relatorio_markdown(itens_adicionados: List[Dict[str, Any]], achados_radar: List[Dict[str, Any]], cep: str):
    """Gera um arquivo Markdown formatado pronto para consulta."""
    total_geral = sum(it["subtotal"] for it in itens_adicionados)

    conteudo = [
        "# 🛒 Resumo de Compras Quinzenais - Tenda Atacado (Ribeirão Preto)",
        f"**Data da Geração:** {time.strftime('%d/%m/%Y %H:%M')}",
        f"**Filial:** Av. Marechal Costa e Silva, 1231 | **CEP:** {cep[:5]}-{cep[5:]}",
        "**Perfil:** Cesta do pedido de referência; reposições mensais na primeira quinzena e extras somente quando solicitados. Modalidade de entrega definida manualmente.\n",
        "## 📋 Itens selecionados e resultado da conferência\n",
        "| Categoria | Produto | Preço estimado | Qtd | Subtotal estimado | Conferência | Observação |",
        "| :--- | :--- | :---: | :---: | :---: | :--- | :--- |"
    ]

    for it in itens_adicionados:
        p_u = f"R$ {it['preco_unit']:.2f}".replace('.', ',') if it['preco_unit'] else "—"
        sub = f"R$ {it['subtotal']:.2f}".replace('.', ',') if it['preco_unit'] else "—"
        dica = it.get("dica_atacado", "").replace("|", "\\|")
        produto = it["produto_escolhido"].replace("|", "\\|")
        conteudo.append(f"| {it['categoria']} | {produto} | {p_u} | {it['qtd']} | {sub} | {it['status']} | {dica} |")

    conteudo.append(f"\n### 💰 Valor Total Estimado: **R$ {total_geral:.2f}**\n".replace('.', ','))

    if achados_radar:
        conteudo.append("## 📡 Achados do Radar de Oportunidades & Ofertas")
        conteudo.append("Itens de alto interesse fitness e custo-benefício disponíveis no catálogo:\n")
        conteudo.append("| Categoria | Sugestão | Produto Encontrado | Preço | Condição Especial |")
        conteudo.append("| :--- | :--- | :--- | :---: | :--- |")
        for a in achados_radar:
            conteudo.append(f"| {a['categoria']} | {a['nome_interesse']} | {a['produto']} | {a['preco']} {a['preco_kg']} | {a['dica']} |")

    try:
        with open(ARQUIVO_EXPORTACAO, "w", encoding="utf-8") as f:
            f.write("\n".join(conteudo))
        print(f"\n📄 Relatório exportado com sucesso em: {ARQUIVO_EXPORTACAO}")
    except Exception as e:
        print(f"⚠️ Aviso ao exportar markdown: {e}")


def exportar_relatorio_json(itens: List[Dict[str, Any]], cep: str) -> None:
    """Salva preços observados para a comparação com o Atacadão."""
    campos = ("categoria", "nome_planejado", "produto_escolhido", "preco_unit",
              "preco_kg", "qtd", "subtotal", "status")
    dados = {
        "gerado_em": time.strftime("%Y-%m-%d %H:%M:%S"), "cep": cep,
        "itens": [{chave: item.get(chave) for chave in campos} for item in itens],
    }
    with open(ARQUIVO_EXPORTACAO_JSON, "w", encoding="utf-8") as arquivo:
        json.dump(dados, arquivo, ensure_ascii=False, indent=2)
    print(f"📄 Dados de comparação salvos em: {ARQUIVO_EXPORTACAO_JSON}")


def imprimir_relatorio_financeiro(itens_adicionados: List[Dict[str, Any]]):
    """Imprime uma tabela financeira detalhada no terminal."""

    print("\n" + "=" * 92)
    print("📊 RESUMO FINANCEIRO DA COMPRA QUINZENAL (TENDA ATACADO - RIBEIRÃO PRETO)")
    print("=" * 92)

    header = f"{'Categoria':<18} | {'Produto Selecionado':<40} | {'Preço Unit.':<10} | {'Qtd':<4} | {'Subtotal':<12} | Conferência"
    print(header)
    print("-" * 92)

    total_geral = 0.0
    for it in itens_adicionados:
        nome_curto = it["produto_escolhido"][:38] + (".." if len(it["produto_escolhido"]) > 38 else "")
        preco_u = f"R$ {it['preco_unit']:.2f}".replace('.', ',') if it['preco_unit'] else "—"
        subt = f"R$ {it['subtotal']:.2f}".replace('.', ',') if it['preco_unit'] else "—"
        total_geral += it["subtotal"]

        print(f"{it['categoria']:<18} | {nome_curto:<40} | {preco_u:<10} | {it['qtd']:<4} | {subt:<12} | {it['status']}")

    print("-" * 92)
    print(f"{'VALOR TOTAL ESTIMADO DA QUINZENA:':<76} R$ {total_geral:.2f}".replace('.', ','))
    print("=" * 92)

def abrir_carrinho_final(page: Page):
    """Navega diretamente para a página oficial do carrinho."""
    print("\n📦 Carregando página oficial do carrinho...")
    try:
        page.goto("https://www.tendaatacado.com.br/carrinho", timeout=30000)
        page.wait_for_load_state("domcontentloaded")
        page.wait_for_timeout(2000)
    except Exception as e:
        print(f"Aviso ao carregar carrinho: {e}")


def montar_plano(args) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]], bool]:
    """Cesta do PDF; reposições mensais só na primeira quinzena."""
    primeira = args.quinzena == "primeira" or (args.quinzena == "auto" and time.localtime().tm_mday <= 15)
    carnes = GRUPOS_CARNES_PDF
    itens = [] if args.apenas_carnes else list(ITENS_PDF_REGULARES)
    if primeira and not args.apenas_carnes:
        itens.extend(ITENS_PDF_MENSAIS)
    if args.com_extras and not args.apenas_carnes:
        buscas_base = {item["busca"] for item in itens}
        grupos_extras = [ITENS_CARBOIDRATOS, ITENS_LATICINIOS_E_BEBIDAS]
        if not args.sem_doces:
            grupos_extras.append(ITENS_CONDIMENTOS_E_DOCES)
        if not args.sem_hortifruti:
            grupos_extras.append(ITENS_HORTIFRUTI_INTELIGENTE)
        if not args.sem_higiene:
            grupos_extras.append(ITENS_HIGIENE)
        sobrepostos = {
            "macarrao barilla 500g", "pao de alho baguete tradicional select 300g",
            "leite zero lactose 1l", "manteiga com sal 200g",
            "queijo parmesao cunha faixa azul tirolez", "energetico monster 473ml",
        }
        itens.extend(item for grupo in grupos_extras for item in grupo
                     if item["busca"] not in buscas_base and item["busca"] not in sobrepostos)
    if args.com_azeite and not args.apenas_carnes:
        itens.append(ITEM_AZEITE)
    return carnes, itens, primeira


def main():
    parser = argparse.ArgumentParser(description="Automação Inteligente de Compras - Tenda Atacado")
    parser.add_argument("--cep", type=str, default=CEP_DESTINO, help="CEP de destino (padrão: 14055220)")
    parser.add_argument("--headless", action="store_true", help="Executa em segundo plano sem abrir janela visível")
    parser.add_argument("--apenas-pesquisa", action="store_true", help="Apenas compara preços sem adicionar ao carrinho")
    parser.add_argument("--sem-radar", action="store_true", help="Pula a busca de oportunidades extras")
    parser.add_argument("--apenas-carnes", action="store_true", help="Executa apenas a comparação e compra de carnes")
    parser.add_argument("--quinzena", choices=["auto", "primeira", "segunda"], default="auto", help="Inclui reposições mensais na primeira quinzena")
    parser.add_argument("--com-extras", action="store_true", help="Acrescenta itens opcionais da lista anterior ao perfil do PDF")
    parser.add_argument("--modo-completo", action="store_true", help="Compatibilidade com o painel: monta a cesta completa")
    parser.add_argument("--sem-fechamento", action="store_true", help="Não abre a janela de conferência ao terminar")
    parser.add_argument("--sem-hortifruti", action="store_true", help="Pula a adição de itens de hortifrúti inteligente")
    parser.add_argument("--com-azeite", action="store_true", help="Inclui azeite extra virgem na compra quinzenal (padrão é falso para reposição lenta)")
    parser.add_argument("--com-higiene", action="store_true", help="(Legado) Mantido para compatibilidade")
    parser.add_argument("--sem-higiene", action="store_true", help="Pula itens de higiene (desodorante e sabonetes, incluídos por padrão)")
    parser.add_argument("--sem-doces", action="store_true", help="Pula condimentos e doces de descompressão")
    parser.add_argument("--manter-carrinho", action="store_true", help="Não esvazia o carrinho antes de iniciar as compras")
    parser.add_argument("--somente-conferir", action="store_true", help="Confere o carrinho atual sem limpar ou adicionar itens")
    parser.add_argument("--visual-durante-busca", action="store_true", help="Exibe navegador durante a busca (padrão é segundo plano para evitar pulos de tela)")
    default_nav = "opera" if shutil.which("opera") else "chromium"
    parser.add_argument("--navegador", type=str, choices=["chromium", "opera"], default=default_nav, help=f"Navegador para abrir a conferência final (padrão: {default_nav})")
    args = parser.parse_args()

    cep_limpo = re.sub(r'\D', '', args.cep)
    if len(cep_limpo) != 8:
        print(f"❌ Erro: CEP inválido '{args.cep}'. O CEP deve ter 8 dígitos.")
        sys.exit(1)

    busca_headless = not args.visual_durante_busca
    grupos_carnes, itens_plano, primeira_quinzena = montar_plano(args)

    print("=" * 80)
    print("🛒 ASSISTENTE DE COMPRAS - CESTA BASEADA NO PEDIDO DE REFERÊNCIA")
    print(f"📍 Destino: Ribeirão Preto (SP) - CEP {cep_limpo[:5]}-{cep_limpo[5:]} (Av. Marechal Costa e Silva)")
    print(f"📋 Perfil: {len(grupos_carnes)} cortes + {len(itens_plano)} produtos | Mensais: {'sim' if primeira_quinzena else 'não'} | Extras: {'sim' if args.com_extras else 'não'}")
    print(f"🖥️ Fase 1 (Cotação & Montagem): {'Segundo plano silencioso (Headless)' if busca_headless else 'Visual'}")
    print(f"🖥️ Fase 2 (Conferência Final): {'Janela gráfica no ' + args.navegador.upper() if not args.headless and not args.sem_fechamento else 'Relatório no Terminal'}")
    print("=" * 80)

    with sync_playwright() as p:
        largura_tela, altura_tela = obter_resolucao_tela()

        # FASE 1: Cotação e Montagem do Carrinho (em segundo plano, sem pulos na tela)
        browser = p.chromium.launch(
            headless=busca_headless,
            args=["--start-maximized", f"--window-size={largura_tela},{altura_tela}", "--no-sandbox"]
        )

        context_kwargs = {"viewport": {"width": largura_tela, "height": altura_tela}}
        if os.path.exists(ARQUIVO_SESSAO):
            context_kwargs["storage_state"] = ARQUIVO_SESSAO

        context = browser.new_context(**context_kwargs)
        page = context.new_page()

        # 1. Configura Localização e desbloqueia o carrinho
        if not configurar_localizacao_completa(page, context, cep_limpo):
            raise RuntimeError("Localização não confirmada; carrinho preservado")

        if args.somente_conferir:
            conferidos = conferir_plano_no_carrinho(page, grupos_carnes, itens_plano)
            imprimir_relatorio_financeiro(conferidos)
            exportar_relatorio_markdown(conferidos, [], cep_limpo)
            exportar_relatorio_json(conferidos, cep_limpo)
            context.storage_state(path=ARQUIVO_SESSAO)
            browser.close()
            if any(item["status"] != "Confirmado" for item in conferidos):
                sys.exit(2)
            return

        # 2. Limpeza Prévia: Esvazia carrinho residual se houver
        if not args.apenas_pesquisa and not args.manter_carrinho:
            if not esvaziar_carrinho_se_necessario(page, context, cep_limpo):
                print("❌ Limpeza do carrinho não confirmada; montagem interrompida.")
                sys.exit(2)

        itens_selecionados = []

        # 3. Cortes da cesta de referência.
        for grupo in grupos_carnes:
            res_carne = processar_grupo_carne_dinamico(page, grupo, apenas_pesquisa=args.apenas_pesquisa, cep=cep_limpo)
            if res_carne:
                itens_selecionados.append(res_carne)

        # 4. Produtos quinzenais, mensais e extras explicitamente pedidos.
        for item in itens_plano:
            res_item = selecionar_produto_despensa(page, item, apenas_pesquisa=args.apenas_pesquisa, cep=cep_limpo)
            if res_item:
                itens_selecionados.append(res_item)

        # Radar de oportunidades somente quando extras foram pedidos.
        achados_radar = []
        if args.com_extras and not args.sem_radar:
            achados_radar = executar_radar_oportunidades(page)

        planejados = [(g["nome_geral"], g["categoria"], g["qtd"]) for g in grupos_carnes]
        planejados.extend((it["nome"], it["categoria"], it["qtd"]) for it in itens_plano)
        encontrados = {it["nome_planejado"] for it in itens_selecionados}
        pendencias = [
            {"categoria": categoria, "nome_planejado": nome, "produto_escolhido": nome,
             "preco_unit": 0.0, "qtd": qtd, "subtotal": 0.0, "status": "Não encontrado na busca"}
            for nome, categoria, qtd in planejados if nome not in encontrados
        ]

        # 9. Confere o carrinho real antes de gerar o relatório.
        verificacao_ok = True
        if itens_selecionados and not args.apenas_pesquisa:
            try:
                ajustar_quantidades_carrinho(page, itens_selecionados)
                itens_selecionados = verificar_carrinho(page, itens_selecionados)
            except Exception as e:
                print(f"❌ Não foi possível verificar o carrinho: {e}")
                itens_selecionados = [{**it, "status": "Não verificado (erro no carrinho)"} for it in itens_selecionados]
            verificacao_ok = all(it["status"] == "Confirmado" for it in itens_selecionados)
        itens_selecionados.extend(pendencias)
        if pendencias and not args.apenas_pesquisa:
            verificacao_ok = False
        if not verificacao_ok:
            print("⚠️ Carrinho com itens divergentes, ausentes ou sem confirmação. Revise antes de pagar.")

        # A janela de conferência deve abrir com as quantidades finais já ajustadas.
        try:
            context.storage_state(path=ARQUIVO_SESSAO)
        except Exception as e:
            print(f"⚠️ Não foi possível salvar a sessão do carrinho: {e}")

        # 10. Relatório financeiro
        if itens_selecionados:
            imprimir_relatorio_financeiro(itens_selecionados)
            exportar_relatorio_markdown(itens_selecionados, achados_radar, cep_limpo)
            exportar_relatorio_json(itens_selecionados, cep_limpo)

        browser.close()

        largura_tela, altura_tela = obter_resolucao_tela()

        # FASE 2: Exibição visual do carrinho pronto (uma única janela, estável e em tela cheia)
        if not args.headless and not args.sem_fechamento and not args.apenas_pesquisa:
            launch_kwargs = {
                "headless": False,
                "args": [
                    "--start-maximized",
                    f"--window-size={largura_tela},{altura_tela}",
                    "--no-sandbox"
                ]
            }
            nome_nav = "Chromium"
            if args.navegador == "opera":
                opera_bin = shutil.which("opera")
                if opera_bin:
                    launch_kwargs["executable_path"] = opera_bin
                    nome_nav = "Opera"

            print("\n" + "=" * 80)
            print("🎉 CARRINHO CONFERIDO!" if verificacao_ok else "⚠️ CARRINHO COM PENDÊNCIAS PARA REVISÃO")
            print(f"🚀 Abrindo janela do {nome_nav} ({largura_tela}x{altura_tela}) ocupando 100% da tela...")
            print("=" * 80)

            browser_gui = p.chromium.launch(**launch_kwargs)
            context_gui = browser_gui.new_context(
                storage_state=ARQUIVO_SESSAO,
                no_viewport=True
            )
            page_gui = context_gui.new_page()
            page_gui.goto("https://www.tendaatacado.com.br/carrinho", timeout=30000)

            print(f"\n👀 Carrinho carregado no {nome_nav} com sucesso!")
            print("👉 Você pode revisar os itens, ajustar quantidades e concluir o pedido diretamente nesta janela.")
            print("🔑 DICA DE LOGIN: Se sua conta não aparecer conectada no cabeçalho, basta entrar nela UMA ÚNICA VEZ nesta janela.")
            print("   O robô salvará seu token de autenticação permanentemente em ~/.tenda_session.json,")
            print("   e nas próximas quinzenas a janela já abrirá 100% conectada na sua conta!")
            print("\n⌨️  Pressione ENTER no terminal quando terminar de conferir e pagar (para salvar a sessão e fechar)...")

            try:
                input()
            except (KeyboardInterrupt, EOFError):
                pass
            finally:
                try:
                    context_gui.storage_state(path=ARQUIVO_SESSAO)
                except Exception:
                    pass
                browser_gui.close()

        print("\n🔒 Nenhuma compra foi cobrada. A finalização depende do seu pagamento manual.")
        if not verificacao_ok:
            sys.exit(2)


if __name__ == "__main__":
    main()
