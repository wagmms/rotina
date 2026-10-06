# -*- coding: utf-8 -*-
"""
Módulo de Inteligência Nutricional & Otimizador de Custo por Proteína
---------------------------------------------------------------------
Projetado segundo os princípios do Arquiteto Radical:
1. Elimina decisões cegas de compra baseadas apenas no preço da etiqueta.
2. Calcula o Custo por Grama de Proteína (CPGP) com base na composição real dos alimentos.
3. Identifica armadilhas de embalagens pequenas e sugere upgrades de qualidade
   (ex: cortes nobres de alto rendimento que custam menos por grama de proteína).
"""

import re
import unicodedata
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Any


@dataclass
class PerfilAlimento:
    nome: str
    categoria: str
    proteina_por_100g: float  # Gramas de proteína por 100g ou 100ml
    descricao_nutricional: str


# Tabela de Composição Nutricional Referência (Base TACO / USDA)
TABELA_NUTRICIONAL_REF: Dict[str, PerfilAlimento] = {
    # Carnes Bovinas
    "alcatra": PerfilAlimento("Alcatra", "Bovino", 26.0, "Corte magro nobre, rico em ferro heme e creatina."),
    "contrafile": PerfilAlimento("Contrafilé", "Bovino", 25.0, "Corte nobre com excelente maciez e sabor."),
    "patinho": PerfilAlimento("Patinho", "Bovino", 28.0, "Corte com menor teor de gordura entre os bovinos (~3g/100g)."),
    "coxao_mole": PerfilAlimento("Coxão Mole", "Bovino", 26.5, "Excelente maciez para bifes de frigideira."),
    "fraldinha": PerfilAlimento("Fraldinha", "Bovino", 24.0, "Corte saboroso com fibras longas, excelente a vácuo."),
    "baby_beef": PerfilAlimento("Baby Beef", "Bovino", 27.0, "Miolo da alcatra extremamente tenro."),

    # Aves
    "frango_peito": PerfilAlimento("Peito de Frango", "Aves", 27.0, "Padrão-ouro de proteína magra (< 2.5g gordura)."),
    "frango_sassami": PerfilAlimento("Filezinho Sassami", "Aves", 27.5, "Corte mais nobre do peito, macio e sem fibras duras."),
    "frango_coxa_sobrecoxa": PerfilAlimento("Coxa/Sobrecoxa", "Aves", 20.0, "Rico em colágeno, vitaminas do complexo B e sabor."),

    # Pescados
    "tilapia": PerfilAlimento("Tilápia", "Pescados", 22.0, "Peixe branco magro com alta digestibilidade."),
    "merluza": PerfilAlimento("Merluza", "Pescados", 19.5, "Excelente alternativa leve e mais econômica que a tilápia."),
    "atum_solido": PerfilAlimento("Atum Sólido", "Pescados", 26.0, "Proteína pura portátil, densa em ômega-3 e selênio."),

    # Suínos Nobres & Embutidos
    "mignon_suino": PerfilAlimento("Filé Mignon Suíno", "Suíno Nobre", 26.5, "Tão magro quanto peito de frango (< 3g gordura), maciez máxima."),
    "lombo_suino": PerfilAlimento("Lombo Suíno", "Suíno Nobre", 25.0, "Carne branca magra com excelente custo por quilo."),
    "bisteca_suina": PerfilAlimento("Bisteca Suína", "Suíno Nobre", 23.0, "Corte com osso saboroso e suculento."),
    "linguica_toscana": PerfilAlimento("Linguiça Toscana", "Suíno / Embutido Nobre", 16.0, "Embutido suíno nobre, suculento e rico em sabor."),

    # Laticínios & Queijos
    "parmesao": PerfilAlimento("Queijo Parmesão", "Laticínios", 35.0, "Queijo maturado nobre com máxima densidade proteica."),
    "mussarela": PerfilAlimento("Queijo Mussarela", "Laticínios", 24.0, "Alta densidade proteica com cálcio e gordura para saciedade."),
    "brie": PerfilAlimento("Queijo Brie", "Laticínios", 20.0, "Queijo nobre de pasta mole para petisco."),
    "requeijao": PerfilAlimento("Requeijão Cremoso", "Laticínios", 9.0, "Cremosidade láctea clássica para pães e torradas."),
    "whey_drink": PerfilAlimento("Bebida Láctea Whey", "Laticínios", 6.0, "Bebida proteica líquida (15g de proteína em 250ml)."),
    "iogurte_desnatado": PerfilAlimento("Iogurte Desnatado", "Laticínios", 4.5, "Probióticos e proteína de absorção gradual."),
    "leite_desnatado": PerfilAlimento("Leite Desnatado Zero Lactose", "Laticínios", 3.2, "Hidratação proteica sem açúcares pesados."),

    # Frios Nobres
    "peito_peru": PerfilAlimento("Peito de Peru", "Frios", 21.0, "Frio nobre magro com alta concentração proteica."),
    "presunto_cozido": PerfilAlimento("Presunto Cozido", "Frios", 16.5, "Frio magro clássico para sanduíches e tostex."),

    # Mercearia & Panificação
    "aveia": PerfilAlimento("Aveia em Flocos", "Mercearia", 14.0, "Carboidrato complexo de baixo índice glicêmico com beta-glucana."),
    "macarrao": PerfilAlimento("Macarrão Grano Duro", "Mercearia", 12.0, "Carboidrato nobre de trigo durum de lenta absorção."),
    "pao_forma": PerfilAlimento("Pão de Forma Tradicional", "Panificação", 8.0, "Pão fatiado macio tradicional."),
    "pao_alho": PerfilAlimento("Pão de Alho Baguete", "Panificação", 7.0, "Acompanhamento crocante recheado com queijo."),
    "feijao": PerfilAlimento("Feijão Carioca (cozido)", "Mercearia", 6.5, "Rico em lisina, fibras solúveis e micronutrientes."),
    "arroz": PerfilAlimento("Arroz Branco Cozido", "Mercearia", 2.5, "Carboidrato base de alta digestibilidade."),
    "passata_tomate": PerfilAlimento("Passata / Molho de Tomate Premium", "Mercearia", 1.5, "Polpa de tomate pura e espessa de alta qualidade."),
    "chocolate": PerfilAlimento("Chocolate Nobre / Trento", "Confeitaria", 6.0, "Doce e descompressão de qualidade balanceada.")
}


class FoodOptimizer:
    """Motor de otimização de custo por valor nutricional."""

    @staticmethod
    def _normalizar_texto(texto: str) -> str:
        """Remove acentos e converte para minusculo."""
        nfkd = unicodedata.normalize('NFKD', texto.lower())
        return "".join([c for c in nfkd if not unicodedata.combining(c)])

    @classmethod
    def mapear_alimento(cls, titulo: str) -> Optional[PerfilAlimento]:
        """Identifica a classe nutricional do produto a partir do título."""
        t_clean = cls._normalizar_texto(titulo)
        if "contrafile" in t_clean or "contra file" in t_clean:
            return TABELA_NUTRICIONAL_REF["contrafile"]
        if "toscana" in t_clean or ("linguica" in t_clean and "calabresa" not in t_clean):
            return TABELA_NUTRICIONAL_REF["linguica_toscana"]
        if "sassami" in t_clean:
            return TABELA_NUTRICIONAL_REF["frango_sassami"]
        if "peito" in t_clean and "peru" in t_clean:
            return TABELA_NUTRICIONAL_REF["peito_peru"]
        if "peito" in t_clean and "frango" in t_clean:
            return TABELA_NUTRICIONAL_REF["frango_peito"]
        if "coxa" in t_clean and "frango" in t_clean:
            return TABELA_NUTRICIONAL_REF["frango_coxa_sobrecoxa"]
        if "mignon" in t_clean and "suino" in t_clean:
            return TABELA_NUTRICIONAL_REF["mignon_suino"]
        if "lombo" in t_clean:
            return TABELA_NUTRICIONAL_REF["lombo_suino"]
        if "bisteca" in t_clean:
            return TABELA_NUTRICIONAL_REF["bisteca_suina"]
        if "tilapia" in t_clean:
            return TABELA_NUTRICIONAL_REF["tilapia"]
        if "merluza" in t_clean:
            return TABELA_NUTRICIONAL_REF["merluza"]
        if "atum" in t_clean:
            return TABELA_NUTRICIONAL_REF["atum_solido"]
        if "patinho" in t_clean:
            return TABELA_NUTRICIONAL_REF["patinho"]
        if "alcatra" in t_clean or "baby beef" in t_clean:
            return TABELA_NUTRICIONAL_REF["alcatra"]
        if "coxao mole" in t_clean:
            return TABELA_NUTRICIONAL_REF["coxao_mole"]
        if "fraldinha" in t_clean:
            return TABELA_NUTRICIONAL_REF["fraldinha"]
        if "parmesao" in t_clean:
            return TABELA_NUTRICIONAL_REF["parmesao"]
        if "brie" in t_clean:
            return TABELA_NUTRICIONAL_REF["brie"]
        if "mussarela" in t_clean or "mozzarella" in t_clean:
            return TABELA_NUTRICIONAL_REF["mussarela"]
        if "requeijao" in t_clean:
            return TABELA_NUTRICIONAL_REF["requeijao"]
        if "whey" in t_clean:
            return TABELA_NUTRICIONAL_REF["whey_drink"]
        if "presunto" in t_clean:
            return TABELA_NUTRICIONAL_REF["presunto_cozido"]
        if "iogurte" in t_clean:
            return TABELA_NUTRICIONAL_REF["iogurte_desnatado"]
        if "leite" in t_clean:
            return TABELA_NUTRICIONAL_REF["leite_desnatado"]
        if "pao de alho" in t_clean or "alho baguete" in t_clean:
            return TABELA_NUTRICIONAL_REF["pao_alho"]
        if "pao de forma" in t_clean or ("pao" in t_clean and "forma" in t_clean):
            return TABELA_NUTRICIONAL_REF["pao_forma"]
        if "macarrao" in t_clean or "espaguete" in t_clean or "spaghetti" in t_clean or "penne" in t_clean:
            return TABELA_NUTRICIONAL_REF["macarrao"]
        if "passata" in t_clean or ("molho" in t_clean and "tomate" in t_clean):
            return TABELA_NUTRICIONAL_REF["passata_tomate"]
        if "chocolate" in t_clean or "trento" in t_clean:
            return TABELA_NUTRICIONAL_REF["chocolate"]
        if "arroz" in t_clean:
            return TABELA_NUTRICIONAL_REF["arroz"]
        if "aveia" in t_clean:
            return TABELA_NUTRICIONAL_REF["aveia"]
        if "feijao" in t_clean:
            return TABELA_NUTRICIONAL_REF["feijao"]
        return None

    @staticmethod
    def estimar_peso_gramas(titulo: str, default_kg: float = 1.0) -> float:
        """Estima o peso líquido do produto em gramas a partir do título."""
        t_low = titulo.lower()
        # Busca padrão em gramas (ex: 400g, 500g, 800g, 160g)
        m_g = re.search(r'(\d+)\s*g\b', t_low)
        if m_g:
            return float(m_g.group(1))

        # Busca padrão em kg (ex: 1kg, 1.2kg, 1,5kg)
        m_kg = re.search(r'([\d\.,]+)\s*kg\b', t_low)
        if m_kg:
            val = float(m_kg.group(1).replace(',', '.'))
            return val * 1000.0

        # Busca padrão em litros (ex: 1l, 250ml)
        m_ml = re.search(r'(\d+)\s*ml\b', t_low)
        if m_ml:
            return float(m_ml.group(1))
        if "1l" in t_low or "1 litro" in t_low:
            return 1000.0

        return default_kg * 1000.0

    @classmethod
    def calcular_eficiencia_proteica(cls, titulo: str, preco_unitario: float, qtd: int = 1) -> Dict[str, Any]:
        """
        Calcula a quantidade de proteína entregue e o custo por grama de proteína (CPGP).
        CPGP = Preço Total / Gramas Totais de Proteína
        """
        perfil = cls.mapear_alimento(titulo)
        peso_g = cls.estimar_peso_gramas(titulo)
        peso_total_g = peso_g * qtd
        preco_total = preco_unitario * qtd

        if perfil and peso_total_g > 0:
            proteina_total_g = (peso_total_g / 100.0) * perfil.proteina_por_100g
            cpgp = (preco_total / proteina_total_g) if proteina_total_g > 0 else 0.0
        else:
            proteina_total_g = 0.0
            cpgp = 0.0

        return {
            "perfil": perfil.nome if perfil else "Outro",
            "categoria_nutricional": perfil.categoria if perfil else "Geral",
            "peso_unitario_g": peso_g,
            "peso_total_g": peso_total_g,
            "proteina_total_g": round(proteina_total_g, 1),
            "custo_por_grama_proteina": round(cpgp, 4),
            "custo_por_100g_proteina": round(cpgp * 100.0, 2)
        }

    @staticmethod
    def gerar_diagnostico_cesta(itens_carrinho: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Gera um diagnóstico macro da qualidade e eficiência proteica da cesta."""
        total_g_proteina = 0.0
        custo_total = 0.0
        itens_analisados = []

        for it in itens_carrinho:
            preco = it.get("preco_unit", 0.0)
            qtd = it.get("qtd", 1)
            titulo = it.get("produto_escolhido", it.get("nome", ""))
            
            analise = FoodOptimizer.calcular_eficiencia_proteica(titulo, preco, qtd)
            custo_item = preco * qtd
            custo_total += custo_item
            total_g_proteina += analise["proteina_total_g"]

            itens_analisados.append({
                "produto": titulo,
                "preco_total": custo_item,
                "proteina_g": analise["proteina_total_g"],
                "cpgp": analise["custo_por_grama_proteina"],
                "custo_100g_prot": analise["custo_por_100g_proteina"]
            })

        cpgp_medio = (custo_total / total_g_proteina) if total_g_proteina > 0 else 0.0
        proteina_diaria_quinzena = (total_g_proteina / 15.0) if total_g_proteina > 0 else 0.0

        # Identifica os 3 cortes de maior eficiência (campeões de valor)
        campeoes_eficiencia = sorted([i for i in itens_analisados if i["proteina_g"] > 20], key=lambda x: x["cpgp"])

        return {
            "total_investido": round(custo_total, 2),
            "total_proteina_g": round(total_g_proteina, 1),
            "media_proteina_diaria_g": round(proteina_diaria_quinzena, 1),
            "custo_medio_100g_proteina": round(cpgp_medio * 100.0, 2),
            "top_eficientes": campeoes_eficiencia[:3]
        }
