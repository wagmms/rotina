#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Automação de Compras Quinzenais - Tenda Atacado (Ribeirão Preto)
Versão 3.2 (Comparador Dinâmico de Carnes & Multicortes)
--------------------------------------------------------------------------
Novas funcionalidades:
1. Comparador Multicortes de Carnes:
   Não se limita aos cortes da nota fiscal. Avalia múltiplos cortes candidatos
   (ex: Alcatra vs Patinho vs Fraldinha vs Coxão Mole; Sassami vs Filé de Peito;
   Tilápia vs Merluza; Filé Mignon Suíno vs Lombo) e escolhe o de melhor
   custo por quilo/unidade no dia.
2. Suporte ao CEP 14055-220 com fechamento automático do agendamento de retirada.
3. Radar de Oportunidades & Ofertas de Alta Afinidade (YoPRO, Queijos, Snacks 70%).
4. Alerta de Desconto Progressivo (Gatilhos de Atacado).
5. Tabela Financeira e exportação Markdown (compras_tenda_resumo.md).
"""

import os
import re
import sys
import time
import shutil
import argparse
import subprocess
from typing import List, Dict, Any, Optional

# Garante a resolução do pacote 'src' independentemente do diretório de execução
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from playwright.sync_api import sync_playwright, Page, BrowserContext
from src.food_optimizer import FoodOptimizer

# Configurações de Localização (Ribeirão Preto)
CEP_DESTINO = "14055220"  # 14055-220 (Sumarezinho / Rua Adalberto Pajuaba)
NOME_FILIAL = "Marechal Costa e Silva"
ARQUIVO_SESSAO = os.path.expanduser("~/.tenda_session.json")
ARQUIVO_EXPORTACAO = os.path.join(os.path.dirname(__file__), "compras_tenda_resumo.md")

# --- COMPARADOR DINÂMICO DE CARNES & PROTEÍNAS ---
# O script pesquisa os cortes candidatos e seleciona as 7 proteínas quinzenais confirmadas via /grill-me
GRUPOS_CARNES_DINAMICAS: List[Dict[str, Any]] = [
    {
        "categoria": "Carnes Bovinas (Bifes Macios)",
        "nome_geral": "Bife Bovino Nobre & Macio (Alcatra / Contrafilé / Baby Beef)",
        "qtd": 1,
        "candidatos": [
            {
                "nome_corte": "Miolo de Alcatra em Bifes (~400g-500g)",
                "busca": "alcatra bife",
                "preferencias": ["alcatra", "miolo", "bife"],
                "evitar": ["hamburguer", "tempero", "costela", "linguica", "linguiça", "moida", "moída", "patinho", "coxao", "coxão"]
            },
            {
                "nome_corte": "Contrafilé em Bifes (~400g-500g)",
                "busca": "contrafile bife",
                "preferencias": ["contrafile", "contra filé", "contrafilé", "bife"],
                "evitar": ["hamburguer", "costela", "linguica", "linguiça", "moida", "moída", "patinho", "coxao"]
            },
            {
                "nome_corte": "Baby Beef em Bifes (~400g-500g)",
                "busca": "baby beef bife",
                "preferencias": ["baby beef", "alcatra", "bife"],
                "evitar": ["hamburguer", "costela", "moida", "moída"]
            }
        ]
    },
    {
        "categoria": "Carnes Bovinas (Moída de Primeira)",
        "nome_geral": "Carne Moída Bovina de Primeira (~500g)",
        "qtd": 1,
        "candidatos": [
            {
                "nome_corte": "Patinho Bovino Moído 500g",
                "busca": "patinho moido 500g",
                "preferencias": ["patinho", "moido", "moída", "bovino", "500g"],
                "evitar": ["hamburguer", "acem", "acém", "segunda", "danone", "danoninho", "iogurte", "leite", "sobremesa", "frango"]
            },
            {
                "nome_corte": "Coxão Mole Bovino Moído 500g",
                "busca": "coxao mole moido 500g",
                "preferencias": ["coxao mole", "coxão mole", "moido", "moída", "500g"],
                "evitar": ["hamburguer", "acem", "acém", "danone", "danoninho", "iogurte"]
            }
        ]
    },
    {
        "categoria": "Aves (Filé Magro)",
        "nome_geral": "Filé de Frango Magro sem Osso (Peito ou Sassami 1kg)",
        "qtd": 1,
        "candidatos": [
            {
                "nome_corte": "Filé de Peito Sadia Zip 1kg",
                "busca": "file peito frango 1kg",
                "preferencias": ["sadia", "perdigao", "lar", "file de peito", "filé de peito"],
                "evitar": ["empanado", "nugget", "desfiado", "defumado", "com osso", "anuncio"]
            },
            {
                "nome_corte": "Filezinho Sassami IQF 1kg",
                "busca": "sassami frango 1kg",
                "preferencias": ["sassami", "filezinho", "filézinho", "seara", "sadia"],
                "evitar": ["empanado", "nugget", "anuncio"]
            }
        ]
    },
    {
        "categoria": "Aves (Com Osso)",
        "nome_geral": "Coxa e Sobrecoxa de Frango (Bandeja ~600g a 1kg)",
        "qtd": 1,
        "candidatos": [
            {
                "nome_corte": "Coxa e Sobrecoxa Resfriada ou Congelada",
                "busca": "coxa sobrecoxa frango",
                "preferencias": ["coxa sobrecoxa", "coxa e sobrecoxa", "bandeja"],
                "evitar": ["passarinho", "asa", "tulipa", "empanado"]
            }
        ]
    },
    {
        "categoria": "Carnes Suínas Nobres",
        "nome_geral": "Corte Suíno Nobre (Filé Mignon, Lombo ou Bisteca ~1kg)",
        "qtd": 1,
        "candidatos": [
            {
                "nome_corte": "Filé Mignon Suíno Resfriado (~1kg)",
                "busca": "file mignon suino",
                "preferencias": ["mignon", "suino", "suíno", "peça", "peca"],
                "evitar": ["bovino", "salgado", "defumado"]
            },
            {
                "nome_corte": "Lombo Suíno Resfriado (~1kg)",
                "busca": "lombo suino peca",
                "preferencias": ["lombo", "suino", "seara", "peca", "peça", "bife"],
                "evitar": ["salgado", "canadense", "defumado"]
            },
            {
                "nome_corte": "Bisteca Suína Resfriada (~1kg)",
                "busca": "bisteca suina",
                "preferencias": ["bisteca", "suina", "suína", "seara", "bandeja"],
                "evitar": ["salgada", "defumada"]
            }
        ]
    },
    {
        "categoria": "Pescados (Exclusivo Tilápia)",
        "nome_geral": "Filé de Tilápia Congelado (~500g a 800g)",
        "qtd": 1,
        "candidatos": [
            {
                "nome_corte": "Filé de Tilápia Congelado 800g (Copacol / Aurora / Netuno)",
                "busca": "file tilapia 800g",
                "preferencias": ["tilapia", "tilápia", "copacol", "cancao", "netuno", "aurora", "800g"],
                "evitar": ["merluza", "cacao", "cação", "salmao", "empanado", "isca", "pedacos"]
            },
            {
                "nome_corte": "Filé de Tilápia Congelado 500g-600g (Seara / Select / Mar & Terra)",
                "busca": "file tilapia",
                "preferencias": ["tilapia", "tilápia", "seara", "select", "500g", "600g"],
                "evitar": ["merluza", "cacao", "cação", "salmao", "empanado", "isca", "pedacos"]
            }
        ]
    },
    {
        "categoria": "Linguiça Toscana",
        "nome_geral": "Linguiça Toscana Nobre (~700g a 1kg - Seara / Perdigão / Aurora)",
        "qtd": 1,
        "candidatos": [
            {
                "nome_corte": "Linguiça Toscana Seara / Perdigão (~700g a 1kg)",
                "busca": "linguica toscana seara perdigao",
                "preferencias": ["toscana", "seara", "perdigao", "perdigão", "aurora", "linguica", "linguiça"],
                "evitar": ["calabresa", "frango", "mista", "defumada", "fina", "5kg"]
            }
        ]
    }
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


def resolver_modal_cep_se_presente(page: Page, cep: str = CEP_DESTINO) -> bool:
    """Detecta se o modal de CEP (#modal-shipping) está aberto e conclui a seleção."""
    try:
        modal = page.locator('#modal-shipping')
        if not modal.is_visible(timeout=3000):
            return False

        print(f"📦 Modal de frete detectado! Configurando CEP: {cep[:5]}-{cep[5:]}...")

        inp = modal.locator('#shipping-cep, input[name="zipCode"]').first
        if inp.is_visible():
            inp.click()
            inp.fill('')
            inp.press_sequentially(cep, delay=80)
            page.wait_for_timeout(2500)

        cr_card = modal.locator('.card-information-component:has-text("Clique & Retire")')
        if cr_card.count() > 0 and cr_card.first.is_visible():
            cr_card.first.click(force=True)
            page.wait_for_timeout(1500)

        store = modal.locator(f':has-text("{NOME_FILIAL}")')
        if store.count() > 0 and store.last.is_visible():
            store.last.click(force=True)
            page.wait_for_timeout(2000)

        period_slot = modal.locator('.content-periods .card-information-component')
        if period_slot.count() > 0 and period_slot.first.is_visible():
            period_slot.first.click(force=True)
            page.wait_for_timeout(2500)
            print("✅ Loja de Ribeirão Preto (Marechal Costa e Silva) e horário de retirada confirmados!")
            return True

        return True
    except Exception as e:
        print(f"⚠️ Erro ao resolver modal de CEP: {e}")
        return False


def configurar_localizacao_completa(page: Page, context: BrowserContext, cep: str = CEP_DESTINO) -> bool:
    """Configura o CEP 14055-220 e filial garantindo o desbloqueio do carrinho."""
    print(f"📍 Configurando localização: CEP {cep[:5]}-{cep[5:]} (Ribeirão Preto)...")
    limpar_cookies(page)

    header_text = page.locator('header, .HeaderComponent, [class*="Header"]').inner_text().lower() if page.locator('header').count() > 0 else ""
    if cep[:5] in header_text:
        print("✅ Localização já confirmada na sessão!")
        return True

    page.goto("https://www.tendaatacado.com.br/busca?q=frango", timeout=30000)
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(2000)
    limpar_cookies(page)

    btn_add = page.locator('button:has-text("Adicionar")').first
    if btn_add.count() > 0 and btn_add.is_visible():
        btn_add.click(force=True)
        page.wait_for_timeout(2000)

    sucesso = resolver_modal_cep_se_presente(page, cep)
    if sucesso:
        try:
            context.storage_state(path=ARQUIVO_SESSAO)
        except Exception:
            pass
        return True

    return False


def esvaziar_carrinho_se_necessario(page: Page, context: BrowserContext, cep: str = CEP_DESTINO) -> bool:
    """
    Verifica se o carrinho contém produtos residuais de execuções anteriores
    e esvazia completamente antes de iniciar a nova seleção de compras.
    """
    print("\n🧹 Verificando se há itens residuais no carrinho para limpeza prévia...")
    try:
        limpar_cookies(page)
        page.goto("https://www.tendaatacado.com.br/carrinho", timeout=30000)
        page.wait_for_load_state("domcontentloaded")
        page.wait_for_timeout(2500)

        # Se redirecionou para fora de /carrinho (ex: home) ou exibe 0 item / R$ 0,00
        if "/carrinho" not in page.url or page.locator('text="0 item"').is_visible() or page.locator('text="0 itens"').is_visible():
            print("  ✅ Carrinho já está completamente limpo (R$ 0,00).")
            return True

        # Verifica se há controle de seleção
        chk_todos = page.locator('input[name="vehicle1"]').first
        if not chk_todos.is_visible():
            print("  ✅ Nenhum item selecionável no carrinho.")
            return True

        print("  🗑️ Itens residuais detectados no carrinho. Selecionando todos para apagar...")
        chk_todos.click(force=True)
        page.wait_for_timeout(800)

        trash_btn = page.locator('.icon-trash:has-text("Apagar"), .icon-trash').first
        if trash_btn.is_visible():
            trash_btn.click(force=True)
            page.wait_for_timeout(1000)

            # Confirma no modal de remoção
            modal_confirm = page.locator('.modal:has-text("Você está prestes a remover"), .modal.show')
            btn_continuar = modal_confirm.locator('button:has-text("Continuar"), a:has-text("Continuar")').first
            if not btn_continuar.is_visible():
                btn_continuar = page.locator('button:has-text("Continuar"):visible').last

            if btn_continuar.is_visible():
                btn_continuar.click(force=True)
                page.wait_for_timeout(3000)

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


def buscar_melhor_opcao_corte(page: Page, candidato: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Pesquisa um corte específico e retorna seus melhores dados para comparação."""
    termo = candidato["busca"]
    limpar_cookies(page)

    url = f"https://www.tendaatacado.com.br/busca?q={termo.replace(' ', '+')}"
    page.goto(url, timeout=30000)
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(1400)

    btn_add = page.locator('button:has-text("Adicionar")')
    if btn_add.count() == 0:
        return None

    opcoes = []
    for i in range(min(5, btn_add.count())):
        btn = btn_add.nth(i)
        card = btn.locator('xpath=ancestor::*[contains(@class, "ProductCardShowcase") or contains(@class, "showcase-card") or contains(@class, "card")][1]')
        info = extrair_dados_card(card, btn)
        texto = info["texto_lower"]

        if any(ev.lower() in texto for ev in candidato["evitar"]):
            continue

        score = sum(2 for p in candidato["preferencias"] if p.lower() in texto)
        if score == 0:
            continue

        preco_comp = info["preco_kg"] if info["preco_kg"] else info["preco_unit"]
        if preco_comp is None:
            preco_comp = 9999.0

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

    opcoes.sort(key=lambda x: (-x["score"], x["preco_comp"]))
    return opcoes[0]


def processar_grupo_carne_dinamico(page: Page, grupo: Dict[str, Any], apenas_pesquisa: bool = False, cep: str = CEP_DESTINO) -> Optional[Dict[str, Any]]:
    """Compara múltiplos cortes de carnes e escolhe o grande vencedor em custo-benefício."""
    print(f"\n🥩 [COMPARADOR DE CARNES] {grupo['nome_geral']}...")
    print(f"   Avaliando {len(grupo['candidatos'])} opções de cortes no catálogo...")

    resultados_candidatos = []
    for cand in grupo["candidatos"]:
        melhor_corte = buscar_melhor_opcao_corte(page, cand)
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
        page.wait_for_timeout(1500)

        if page.locator('#modal-shipping').is_visible():
            resolver_modal_cep_se_presente(page, cep)
            page.wait_for_timeout(1000)

        try:
            page.locator('button:has-text("Adicionar")').first.wait_for(state="visible", timeout=10000)
        except Exception:
            pass

        for _ in range(qtd):
            if page.locator('#modal-shipping').is_visible():
                resolver_modal_cep_se_presente(page, cep)
                page.wait_for_timeout(1000)

            btn_atual = page.locator('button:has-text("Adicionar")')
            if btn_atual.count() > 0:
                idx = min(vencedor["indice"], btn_atual.count() - 1)
                btn_atual.nth(idx).click(force=True)
                page.wait_for_timeout(750)

        print(f"  🛒 [NO CARRINHO - CORTE VENCEDOR] {vencedor['titulo']}")
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
            "status": "No Carrinho"
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
    page.wait_for_timeout(1400)

    btn_add = page.locator('button:has-text("Adicionar")')
    if btn_add.count() == 0:
        print(f"  ❌ Nenhum produto disponível encontrado para '{termo}'.")
        return None

    candidatos = []
    for i in range(min(5, btn_add.count())):
        btn = btn_add.nth(i)
        card = btn.locator('xpath=ancestor::*[contains(@class, "ProductCardShowcase") or contains(@class, "showcase-card") or contains(@class, "card")][1]')
        info = extrair_dados_card(card, btn)
        texto = info["texto_lower"]

        if any(ev.lower() in texto for ev in item["evitar"]):
            continue

        score = sum(2 for p in item["preferencias"] if p.lower() in texto)
        if score == 0:
            continue

        preco_comp = info["preco_kg"] if info["preco_kg"] else info["preco_unit"]
        if preco_comp is None:
            preco_comp = 9999.0

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

    candidatos.sort(key=lambda x: (-x["score"], x["preco_comp"]))
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

    alvo_btn = melhor["btn"]
    try:
        limpar_cookies(page)
        for _ in range(qtd):
            alvo_btn.click(force=True)
            page.wait_for_timeout(750)

            if page.locator('#modal-shipping').is_visible():
                resolver_modal_cep_se_presente(page, cep)
                page.wait_for_timeout(1000)
                alvo_btn.click(force=True)

        print(f"  🛒 [NO CARRINHO] {melhor['titulo']}")
        print(f"     Preço Unit: {preco_formatado} x {qtd} un = R$ {subtotal:.2f}".replace('.', ','))
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
            "status": "No Carrinho"
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
        "**Perfil:** Alta Qualidade & Sabor (7 Proteínas, Molho Premium, Queijos Nobres, Refrigerante Zero e Doces) | Sem Ovo | Higiene Pessoal Inclusa\n",
        "## 📋 Itens Selecionados no Carrinho\n",
        "| Categoria | Objetivo / Corte Escolhido | Preço Unit. | Qtd | Subtotal | Observação |",
        "| :--- | :--- | :---: | :---: | :---: | :--- |"
    ]

    for it in itens_adicionados:
        p_u = f"R$ {it['preco_unit']:.2f}".replace('.', ',')
        sub = f"R$ {it['subtotal']:.2f}".replace('.', ',')
        dica = it.get("dica_atacado", "")
        conteudo.append(f"| {it['categoria']} | {it['produto_escolhido']} | {p_u} | {it['qtd']} | {sub} | {dica} |")

    conteudo.append(f"\n### 💰 Valor Total Estimado: **R$ {total_geral:.2f}**\n".replace('.', ','))

    # Painel Nutricional do Arquiteto Radical no Markdown
    try:
        from src.food_optimizer import FoodOptimizer
        diag = FoodOptimizer.gerar_diagnostico_cesta(itens_adicionados)
        conteudo.append("## 🧬 Painel de Engenharia Nutricional (Custo por Proteína Real)")
        conteudo.append(f"- **Total de Proteína Entregue na Cesta:** `{diag['total_proteina_g']}g`")
        conteudo.append(f"- **Média Diária de Proteína:** `{diag['media_proteina_diaria_g']}g / dia` (Meta de 15 dias)")
        conteudo.append(f"- **Custo Médio por 100g de Proteína Pura:** `R$ {diag['custo_medio_100g_proteina']:.2f}`\n")
        conteudo.append("### 🏆 Campeões de Eficiência (Maior Proteína / Menor R$ Investido)")
        conteudo.append("| Posição | Alimento / Corte | Proteína Entregue | Custo por 100g de Proteína Pura |")
        conteudo.append("| :---: | :--- | :---: | :---: |")
        for rank, c in enumerate(diag["top_eficientes"], 1):
            conteudo.append(f"| {rank}º | {c['produto']} | {c['proteina_g']}g | R$ {c['custo_100g_prot']:.2f} |")
        conteudo.append("")
    except Exception:
        pass

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


def imprimir_relatorio_financeiro(itens_adicionados: List[Dict[str, Any]]):
    """Imprime uma tabela financeira detalhada no terminal e painel de eficiência nutricional."""
    from src.food_optimizer import FoodOptimizer

    print("\n" + "=" * 92)
    print("📊 RESUMO FINANCEIRO DA COMPRA QUINZENAL (TENDA ATACADO - RIBEIRÃO PRETO)")
    print("=" * 92)

    header = f"{'Categoria':<18} | {'Produto Selecionado':<40} | {'Preço Unit.':<10} | {'Qtd':<4} | {'Subtotal'}"
    print(header)
    print("-" * 92)

    total_geral = 0.0
    for it in itens_adicionados:
        nome_curto = it["produto_escolhido"][:38] + (".." if len(it["produto_escolhido"]) > 38 else "")
        preco_u = f"R$ {it['preco_unit']:.2f}".replace('.', ',')
        subt = f"R$ {it['subtotal']:.2f}".replace('.', ',')
        total_geral += it["subtotal"]

        print(f"{it['categoria']:<18} | {nome_curto:<40} | {preco_u:<10} | {it['qtd']:<4} | {subt}")

    print("-" * 92)
    print(f"{'VALOR TOTAL ESTIMADO DA QUINZENA:':<76} R$ {total_geral:.2f}".replace('.', ','))
    print("=" * 92)

    # Painel de Eficiência Nutricional do Arquiteto Radical
    try:
        diag = FoodOptimizer.gerar_diagnostico_cesta(itens_adicionados)
        print("\n" + "=" * 92)
        print("🧬 PAINEL DE ENGENHARIA NUTRICIONAL (CUSTO POR PROTEÍNA REAL)")
        print("=" * 92)
        print(f"• Total de Proteína Entregue na Cesta: {diag['total_proteina_g']}g")
        print(f"• Aporte Médio Estimado: {diag['media_proteina_diaria_g']}g de proteína / dia (Meta de 15 dias)")
        print(f"• Custo Médio por 100g de Proteína Pura: R$ {diag['custo_medio_100g_proteina']:.2f}")
        print("\n🏆 CAMPEÕES DE EFICIÊNCIA (MAIOR PROTEÍNA PELO MENOR REAL INVESTIDO):")
        for rank, c in enumerate(diag["top_eficientes"], 1):
            print(f"  {rank}. {c['produto'][:45]}")
            print(f"     Entregou: {c['proteina_g']}g de proteína | Custo: R$ {c['custo_100g_prot']:.2f} por 100g de proteína pura")
        print("=" * 92)
    except Exception as e:
        print(f"Aviso no cálculo nutricional: {e}")


def abrir_carrinho_final(page: Page):
    """Navega diretamente para a página oficial do carrinho."""
    print("\n📦 Carregando página oficial do carrinho...")
    try:
        page.goto("https://www.tendaatacado.com.br/carrinho", timeout=30000)
        page.wait_for_load_state("domcontentloaded")
        page.wait_for_timeout(2000)
    except Exception as e:
        print(f"Aviso ao carregar carrinho: {e}")


def main():
    parser = argparse.ArgumentParser(description="Automação Inteligente de Compras - Tenda Atacado")
    parser.add_argument("--cep", type=str, default=CEP_DESTINO, help="CEP de destino (padrão: 14055220)")
    parser.add_argument("--headless", action="store_true", help="Executa em segundo plano sem abrir janela visível")
    parser.add_argument("--apenas-pesquisa", action="store_true", help="Apenas compara preços sem adicionar ao carrinho")
    parser.add_argument("--sem-radar", action="store_true", help="Pula a busca de oportunidades extras")
    parser.add_argument("--apenas-carnes", action="store_true", help="Executa apenas a comparação e compra de carnes")
    parser.add_argument("--sem-hortifruti", action="store_true", help="Pula a adição de itens de hortifrúti inteligente")
    parser.add_argument("--com-azeite", action="store_true", help="Inclui azeite extra virgem na compra quinzenal (padrão é falso para reposição lenta)")
    parser.add_argument("--com-higiene", action="store_true", help="(Legado) Mantido para compatibilidade")
    parser.add_argument("--sem-higiene", action="store_true", help="Pula itens de higiene (desodorante e sabonetes, incluídos por padrão)")
    parser.add_argument("--sem-doces", action="store_true", help="Pula condimentos e doces de descompressão")
    parser.add_argument("--manter-carrinho", action="store_true", help="Não esvazia o carrinho antes de iniciar as compras")
    parser.add_argument("--visual-durante-busca", action="store_true", help="Exibe navegador durante a busca (padrão é segundo plano para evitar pulos de tela)")
    default_nav = "opera" if shutil.which("opera") else "chromium"
    parser.add_argument("--navegador", type=str, choices=["chromium", "opera"], default=default_nav, help=f"Navegador para abrir a conferência final (padrão: {default_nav})")
    args = parser.parse_args()

    cep_limpo = re.sub(r'\D', '', args.cep)
    if len(cep_limpo) != 8:
        print(f"❌ Erro: CEP inválido '{args.cep}'. O CEP deve ter 8 dígitos.")
        sys.exit(1)

    busca_headless = not args.visual_durante_busca

    print("=" * 80)
    print("🛒 ASSISTENTE DE COMPRAS V5.0 - CESTA PERSONALIZADA (QUALIDADE & SABOR)")
    print(f"📍 Destino: Ribeirão Preto (SP) - CEP {cep_limpo[:5]}-{cep_limpo[5:]} (Av. Marechal Costa e Silva)")
    print(f"🥩 Perfil: 7 Proteínas (Bife Nobre, Moída, Peito, Coxa/Sobrecoxa, Suíno, Tilápia, Linguiça) | Queijos Nobres & Frios | Molho Premium | Refrigerante Zero | Doces")
    print(f"🖥️ Fase 1 (Cotação & Montagem): {'Segundo plano silencioso (Headless)' if busca_headless else 'Visual'}")
    print(f"🖥️ Fase 2 (Conferência Final): {'Janela gráfica no ' + args.navegador.upper() if not args.headless else 'Relatório no Terminal'}")
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
        configurar_localizacao_completa(page, context, cep_limpo)

        # 2. Limpeza Prévia: Esvazia carrinho residual se houver
        if not args.apenas_pesquisa and not args.manter_carrinho:
            esvaziar_carrinho_se_necessario(page, context, cep_limpo)

        itens_selecionados = []

        # 3. Processa Grupos Dinâmicos de Carnes (7 Proteínas confirmadas no /grill-me)
        for grupo in GRUPOS_CARNES_DINAMICAS:
            res_carne = processar_grupo_carne_dinamico(page, grupo, apenas_pesquisa=args.apenas_pesquisa, cep=cep_limpo)
            if res_carne:
                itens_selecionados.append(res_carne)

        # 4. Processa Carboidratos & Acompanhamentos (arroz 1kg, feijão 1kg, pão de forma, molho premium, macarrão, pão de alho)
        if not args.apenas_carnes:
            for item in ITENS_CARBOIDRATOS:
                res_item = selecionar_produto_despensa(page, item, apenas_pesquisa=args.apenas_pesquisa, cep=cep_limpo)
                if res_item:
                    itens_selecionados.append(res_item)

        # 5. Processa Laticínios, Queijos, Frios & Bebidas (leite zero lactose, manteiga, mussarela, parmesão, requeijão, frios, brie, whey, monster, baly, refri zero)
        if not args.apenas_carnes:
            for item in ITENS_LATICINIOS_E_BEBIDAS:
                res_item = selecionar_produto_despensa(page, item, apenas_pesquisa=args.apenas_pesquisa, cep=cep_limpo)
                if res_item:
                    itens_selecionados.append(res_item)

        # 6. Processa Condimentos & Doces de Descompressão (maionese premium, ketchup, chocolate/trento)
        if not args.apenas_carnes and not args.sem_doces:
            for item in ITENS_CONDIMENTOS_E_DOCES:
                res_item = selecionar_produto_despensa(page, item, apenas_pesquisa=args.apenas_pesquisa, cep=cep_limpo)
                if res_item:
                    itens_selecionados.append(res_item)

        # 7. Processa Hortifrúti Inteligente (zero desperdício: alho descascado kamar, cebola)
        if not args.apenas_carnes and not args.sem_hortifruti:
            for item in ITENS_HORTIFRUTI_INTELIGENTE:
                res_item = selecionar_produto_despensa(page, item, apenas_pesquisa=args.apenas_pesquisa, cep=cep_limpo)
                if res_item:
                    itens_selecionados.append(res_item)

        # 8. Processa Higiene Pessoal (Desodorante Rexona + Sabonete Dove/Rexona - padrão)
        if not args.apenas_carnes and not args.sem_higiene:
            for item in ITENS_HIGIENE:
                res_item = selecionar_produto_despensa(page, item, apenas_pesquisa=args.apenas_pesquisa, cep=cep_limpo)
                if res_item:
                    itens_selecionados.append(res_item)

        # 8. Reposição Lenta Opcional (Azeite Extra Virgem via --com-azeite)
        if not args.apenas_carnes and args.com_azeite:
            res_item = selecionar_produto_despensa(page, ITEM_AZEITE, apenas_pesquisa=args.apenas_pesquisa, cep=cep_limpo)
            if res_item:
                itens_selecionados.append(res_item)

        # 8. Radar de Oportunidades & Ofertas Extras (Queijo Brie se em promoção, etc.)
        achados_radar = []
        if not args.sem_radar:
            achados_radar = executar_radar_oportunidades(page)

        # Salva a sessão atualizada com o carrinho montado
        try:
            context.storage_state(path=ARQUIVO_SESSAO)
        except Exception:
            pass

        # 9. Relatório Financeiro e Nutricional
        if itens_selecionados:
            imprimir_relatorio_financeiro(itens_selecionados)
            exportar_relatorio_markdown(itens_selecionados, achados_radar, cep_limpo)

        browser.close()

        largura_tela, altura_tela = obter_resolucao_tela()

        # FASE 2: Exibição visual do carrinho pronto (uma única janela, estável e em tela cheia)
        if not args.headless and not args.apenas_pesquisa:
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
            print("🎉 MONTAGEM CONCLUÍDA COM SUCESSO!")
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


if __name__ == "__main__":
    main()
