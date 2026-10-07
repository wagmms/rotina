#!/usr/bin/env python3
"""Compara a cesta do Tenda com o Atacadão Via Norte e prepara os dois carrinhos.

O Atacadão exige que o usuário defina a modalidade antes de disponibilizar
preços no checkout. Este programa nunca altera entrega, retirada ou horário.
"""

import argparse
import json
import os
import re
import time
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

import tenda_compras_quinzenal as tenda

RAIZ = Path(__file__).resolve().parent
URL_ATACADAO = "https://www.atacadao.com.br"
URL_LOJA = URL_ATACADAO + "/loja/ribeirao-preto-via-norte"
SESSAO_ATACADAO = Path.home() / ".atacadao_session.json"
RELATORIO_TENDA = RAIZ / "compras_tenda_resumo.json"
RELATORIO_COMPARACAO = RAIZ / "comparacao_tenda_atacadao.json"


def preco_brl(texto):
    match = re.search(r"R\$\s*([\d.]+,\d{2})", texto)
    return float(match.group(1).replace(".", "").replace(",", ".")) if match else None


def precos_card(texto, quantidade):
    """Usa preço de atacado apenas quando a quantidade planejada o alcança."""
    valores = [preco_brl(parte) for parte in re.findall(r"R\$\s*[\d.]+,\d{2}", texto)]
    minimo = re.search(r"A partir de\s+(\d+)\s+unid", texto, re.IGNORECASE)
    if minimo and len(valores) >= 2:
        preco_atacado, preco_regular = valores[:2]
        return preco_atacado if quantidade >= int(minimo.group(1)) else preco_regular
    return valores[0] if valores else None


def sku_do_link(link):
    match = re.search(r"-(\d+)/p(?:\?|$)", link or "")
    return match.group(1) if match else None


def medida_produto(titulo):
    info = {"titulo": titulo, "preco_unit": None, "preco_kg": None}
    peso = tenda.peso_produto_g(info)
    if peso:
        return peso, "g"
    volume = tenda.volume_produto_ml(titulo)
    return (volume, "ml") if volume else (None, None)


def plano(quinzena="auto", extras=False):
    args = SimpleNamespace(
        quinzena=quinzena, apenas_carnes=False, com_extras=extras,
        sem_doces=False, sem_hortifruti=False, sem_higiene=False, com_azeite=False,
    )
    carnes, itens, _ = tenda.montar_plano(args)
    return [(g["nome_geral"], g["qtd"], "carne", g) for g in carnes] + [
        (item["nome"], item["qtd"], "despensa", item) for item in itens
    ]


def card_compativel(titulo, preco, tipo, config):
    info = {"titulo": titulo, "preco_unit": preco, "preco_kg": None}
    if tipo == "carne":
        return any(tenda.corte_compativel(info, candidato, config["faixa_peso_g"])
                   and not any(tenda.normalizar_nome(ev) in tenda.normalizar_nome(titulo)
                               for ev in candidato["evitar"])
                   for candidato in config["candidatos"])
    nome = tenda.normalizar_nome(titulo)
    busca = config["busca"]
    peso = tenda.peso_produto_g(info)
    if busca == "batata congelada palito mais batata 2kg":
        return (all(termo in nome for termo in ("batata", "mais batata", "congelada"))
                and ("pre-frita" in nome or "pre frita" in nome or "palito" in nome)
                and peso is not None and 1800 <= peso <= 2200
                and not any(termo in nome for termo in ("crinkle", "ondulada", "noisette")))
    if busca == "parmesao fracionado maturado tirolez 200g":
        return ("parmesao" in nome and "ralado" not in nome
                and any(marca in nome for marca in ("tirolez", "president", "vigor", "faixa azul", "scala"))
                and peso is not None and 180 <= peso <= 220)
    if busca == "leite desnatado zero lactose italac 1l" and "leite pense zero batavo desnatado" in nome:
        return tenda.volume_produto_ml(titulo) == 1000
    return tenda.produto_despensa_compativel(info, config) and not any(
        tenda.normalizar_nome(ev) in tenda.normalizar_nome(titulo) for ev in config["evitar"]
    )


def buscar_oferta(page, nome, quantidade, tipo, config):
    termo = config["candidatos"][0]["busca"] if tipo == "carne" else config["busca"]
    termo = {
        "batata congelada palito mais batata 2kg": "batata congelada palito 2kg",
        "parmesao fracionado maturado tirolez 200g": "parmesao maturado 200g",
        "leite desnatado zero lactose italac 1l": "leite desnatado zero lactose 1l",
        "charque bovino dianteiro perdigao 400g": "charque 400g",
        "morango congelado sempre viva 1kg": "morango congelado",
    }.get(termo, termo)
    url = URL_ATACADAO + "/s?" + urlencode({"q": termo, "sort": "score_desc", "page": 0})
    page.goto(url, wait_until="domcontentloaded", timeout=30000)
    page.wait_for_function(
        "() => document.body.innerText.includes('Ribeirão Preto Via Norte')", timeout=20000,
    )
    try:
        page.locator('[data-testid="store-product-card-content"]').first.wait_for(state="visible", timeout=15000)
    except Exception:
        return None
    cards = page.locator('[data-testid="store-product-card-content"]')
    ofertas = []
    for i in range(min(cards.count(), 20)):
        card = cards.nth(i)
        titulo = card.locator("h3").first.inner_text().strip()
        texto = card.inner_text()
        preco = precos_card(texto, quantidade)
        link = card.locator('[data-testid="product-link"]').first.get_attribute("href")
        sku = sku_do_link(link)
        disponivel = card.locator('[data-testid="buy-button"]').count() > 0
        if not preco or not sku or not disponivel or not card_compativel(titulo, preco, tipo, config):
            continue
        info = {"titulo": titulo, "preco_unit": preco, "preco_kg": None}
        peso = tenda.peso_produto_g(info)
        medida, unidade = medida_produto(titulo)
        comparavel = preco / medida if medida else preco
        ofertas.append({"nome_planejado": nome, "produto": titulo, "sku": sku,
                        "url": URL_ATACADAO + link, "preco_unit": preco,
                        "preco_kg": round(preco / (peso / 1000), 2) if tipo == "carne" and peso else None,
                        "medida": medida, "unidade_medida": unidade,
                        "qtd": quantidade, "subtotal": round(preco * quantidade, 2),
                        "comparavel": comparavel})
    return min(ofertas, key=lambda oferta: oferta["comparavel"]) if ofertas else None


def carregar_tenda(plano_itens, caminho=RELATORIO_TENDA):
    if caminho.exists():
        dados = json.loads(caminho.read_text(encoding="utf-8"))
        return {item["nome_planejado"]: item for item in dados["itens"]
                if item.get("status") in ("Confirmado", "Quantidade divergente")}
    # Compatibilidade com o relatório gerado antes da exportação JSON.
    markdown = caminho.with_suffix(".md")
    if not markdown.exists():
        return {}
    linhas = []
    for linha in markdown.read_text(encoding="utf-8").splitlines():
        match = re.match(
            r"^\|\s*([^|]+)\s*\|\s*(.*?)\s*\|\s*R\$\s*([\d.,]+)\s*\|\s*(\d+)\s*\|\s*R\$\s*([\d.,]+)\s*\|\s*([^|]+)\s*\|",
            linha,
        )
        if match:
            linhas.append(match)
    if len(linhas) != len(plano_itens):
        print("⚠️ Relatório Markdown do Tenda não corresponde ao plano atual; comparação parcial.")
        return {}
    resultado = {}
    for (nome, qtd, _, _), linha in zip(plano_itens, linhas):
        if int(linha.group(4)) != qtd:
            continue
        resultado[nome] = {"nome_planejado": nome,
                           "produto_escolhido": linha.group(2).strip(),
                           "preco_unit": float(linha.group(3).replace(".", "").replace(",", ".")),
                           "qtd": qtd, "status": linha.group(6).strip(),
                           "fonte": "relatório Markdown anterior"}
    return resultado


def comparar(plano_itens, cotacoes_tenda, ofertas_atacadao):
    resultado = []
    for nome, qtd, tipo, _ in plano_itens:
        t = cotacoes_tenda.get(nome)
        a = ofertas_atacadao.get(nome)
        if t and a:
            preco_tenda = float(t["preco_unit"])
            preco_atacadao = a["preco_unit"]
            medida_tenda, unidade_tenda = medida_produto(t["produto_escolhido"])
            medida_atacadao = a.get("medida")
            if medida_tenda and medida_atacadao and unidade_tenda == a.get("unidade_medida"):
                preco_equivalente_atacadao = preco_atacadao * medida_tenda / medida_atacadao
                economia = (preco_tenda - preco_equivalente_atacadao) * qtd
            elif tipo == "carne" and medida_tenda and a.get("preco_kg"):
                economia = (preco_tenda - a["preco_kg"] * medida_tenda / 1000) * qtd
            else:
                economia = (preco_tenda - preco_atacadao) * qtd
            melhor = "Atacadão" if economia > 0 else "Tenda"
            diferenca = round(economia, 2)
        else:
            melhor = "Atacadão" if a and not t else "Tenda" if t else "Sem cotação confiável"
            diferenca = None
        resultado.append({"nome_planejado": nome, "qtd": qtd, "tipo": tipo,
                          "tenda": t, "atacadao": a, "melhor_preco_comparavel": melhor,
                          "economia_atacadao_na_mesma_embalagem": diferenca})
    return resultado


def obter_pedido(context):
    resposta = context.request.get(URL_ATACADAO + "/api/checkout/pub/orderForm/", timeout=30000)
    if not resposta.ok:
        raise RuntimeError(f"Atacadão não abriu o carrinho ({resposta.status})")
    return resposta.json()


def limpar_carrinho(context, pedido):
    if not pedido.get("items"):
        return pedido
    ident = pedido["orderFormId"]
    resposta = context.request.post(
        URL_ATACADAO + f"/api/checkout/pub/orderForm/{ident}/items/removeAll",
        data={}, headers={"Content-Type": "application/json"}, timeout=30000,
    )
    dados = resposta.json()
    if not resposta.ok or dados.get("items"):
        raise RuntimeError("Atacadão não confirmou a limpeza do carrinho")
    return dados


def adicionar_carrinho(context, ofertas):
    """Usa só endpoints de itens; não toca em shippingData nem em pagamento."""
    pedido = limpar_carrinho(context, obter_pedido(context))
    ident = pedido["orderFormId"]
    adicionados = []
    for oferta in ofertas:
        resposta = context.request.post(
            URL_ATACADAO + f"/api/checkout/pub/orderForm/{ident}/items",
            data={"orderItems": [{"id": oferta["sku"], "quantity": oferta["qtd"], "seller": "1"}]},
            headers={"Content-Type": "application/json"}, timeout=30000,
        )
        if not resposta.ok:
            raise RuntimeError(f"Falha ao adicionar {oferta['produto']} ({resposta.status})")
        pedido = resposta.json()
        linha = next((item for item in pedido.get("items", []) if item.get("id") == oferta["sku"]), None)
        if not linha or linha.get("availability") != "available" or not linha.get("sellingPrice"):
            if not adicionados:
                limpar_carrinho(context, pedido)
            raise RuntimeError(
                "Atacadão exige que você escolha manualmente entrega ou retirada antes de formar um carrinho válido"
            )
        if linha["quantity"] != oferta["qtd"]:
            raise RuntimeError(f"Quantidade divergente no Atacadão: {oferta['produto']}")
        adicionados.append({"produto": linha["name"], "qtd": linha["quantity"],
                           "preco_checkout": linha["sellingPrice"] / 100})
    confirmado = obter_pedido(context)
    if len(confirmado.get("items", [])) != len(adicionados):
        raise RuntimeError("Número de produtos divergente no carrinho do Atacadão")
    return adicionados


def configurar_modalidade_manualmente():
    """Abre o site e aguarda a escolha feita pelo usuário na própria interface."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, args=["--start-maximized", "--no-sandbox"])
        kwargs = {"no_viewport": True}
        if SESSAO_ATACADAO.exists():
            kwargs["storage_state"] = str(SESSAO_ATACADAO)
        context = browser.new_context(**kwargs)
        page = context.new_page()
        page.goto(URL_LOJA, wait_until="domcontentloaded")
        print("Escolha no site a modalidade e o CEP 14055-220. Pressione ENTER aqui depois de concluir.")
        input()
        context.storage_state(path=str(SESSAO_ATACADAO))
        browser.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--quinzena", choices=["auto", "primeira", "segunda"], default="auto")
    parser.add_argument("--com-extras", action="store_true")
    parser.add_argument("--montar-atacadao", action="store_true", help="Monta o segundo carrinho após a cotação")
    parser.add_argument("--configurar-atacadao", action="store_true", help="Abre o site para você escolher modalidade e CEP")
    args = parser.parse_args()
    if args.configurar_atacadao:
        configurar_modalidade_manualmente()
        return
    itens = plano(args.quinzena, args.com_extras)
    cotacoes_tenda = carregar_tenda(itens)
    if not cotacoes_tenda:
        print("⚠️ Falta cotação Tenda confirmada em compras_tenda_resumo.json; o Atacadão será cotado isoladamente.")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        kwargs = {}
        if SESSAO_ATACADAO.exists():
            kwargs["storage_state"] = str(SESSAO_ATACADAO)
        context = browser.new_context(**kwargs)
        page = context.new_page()
        page.goto(URL_LOJA, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_function(
            "() => document.body.innerText.includes('Ribeirão Preto Via Norte')", timeout=20000,
        )
        ofertas = {}
        for nome, qtd, tipo, config in itens:
            try:
                oferta = buscar_oferta(page, nome, qtd, tipo, config)
                if oferta:
                    ofertas[nome] = oferta
                    print(f"Atacadão: {nome} → {oferta['produto']} R$ {oferta['preco_unit']:.2f}")
                else:
                    print(f"Atacadão: {nome} → sem equivalente confiável")
            except Exception as e:
                print(f"Atacadão: {nome} → erro de cotação: {e}")
        comparacao = comparar(itens, cotacoes_tenda, ofertas)
        dados = {"gerado_em": time.strftime("%Y-%m-%d %H:%M:%S"),
                 "loja_atacadao": "Ribeirão Preto Via Norte", "cep_catalogo_atacadao": "14060810",
                 "cep_tenda": tenda.CEP_DESTINO, "itens": comparacao}
        RELATORIO_COMPARACAO.write_text(json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Comparação salva em {RELATORIO_COMPARACAO}")
        if args.montar_atacadao:
            try:
                confirmados = adicionar_carrinho(context, list(ofertas.values()))
                print(f"Carrinho Atacadão confirmado: {len(confirmados)} produtos.")
            except Exception as e:
                print(f"Carrinho Atacadão pendente: {e}")
                raise
        context.storage_state(path=str(SESSAO_ATACADAO))
        browser.close()


if __name__ == "__main__":
    main()
