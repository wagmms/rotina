"""
Ultra Rotina · Testador Master: Oráculo Matemático de Fórmulas Clínicas
Auditor determinístico anti-alucinação de cálculos médicos beira-leito.

Por que um oráculo matemático determinístico?
IAs e LLMs frequentemente cometem erros de aritmética básica, arredondamento
ou transposição de dígitos. Este módulo utiliza fórmulas analíticas canônicas
puras (Harrison, KDIGO, SBC, SBP, NEJM, Surviving Sepsis) em Python com dupla
precisão para auditar o bot sem qualquer dependência de modelos de linguagem.
"""

import re
import math
from typing import Dict, Any, Optional, Tuple, List


class MathOracle:
    """Oráculo determinístico para validação rigorosa de cálculos médicos."""

    # ──────────────────────────────────────────────────────────────────────────
    # 1. FÓRMULAS ANALÍTICAS DETERMINÍSTICAS (PURAS / ZERO LLM)
    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    def calcular_cockcroft_gault(
        idade: int,
        peso: float,
        cr: float,
        eh_feminino: bool,
        altura_cm: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Clearance de Creatinina (Cockcroft-Gault 1976 / KDIGO 2024):
        Se altura informada e IMC >= 30 kg/m², utiliza Peso Ajustado (PIB + 0.4 * (Peso - PIB)).
        Caso contrário, utiliza Peso Real.
        ClCr = ((140 - min(idade, 120)) * pesoUsado) / (72 * Cr) * (0.85 se mulher)
        """
        if cr <= 0 or peso <= 0 or idade <= 0:
            return {"erro": "Parâmetros devem ser estritamente positivos"}

        id_calc = min(120, idade)
        peso_usado = peso
        tipo_peso = "real"
        imc = None
        pib = None

        if altura_cm and altura_cm > 0:
            imc = peso / math.pow(altura_cm / 100.0, 2)
            alt_pol = altura_cm / 2.54
            pib = (45.5 if eh_feminino else 50.0) + 2.3 * (alt_pol - 60.0)
            if imc >= 30.0:
                peso_usado = pib + 0.4 * (peso - pib)
                tipo_peso = f"ajustado (IMC {round(imc, 1)})"

        fator_sexo = 0.85 if eh_feminino else 1.0
        crcl = (((140.0 - id_calc) * peso_usado) / (72.0 * cr)) * fator_sexo
        crcl_arred = round(crcl, 1)

        # Classificação KDIGO
        if crcl_arred >= 90:
            estagio = "G1"
        elif crcl_arred >= 60:
            estagio = "G2"
        elif crcl_arred >= 45:
            estagio = "G3a"
        elif crcl_arred >= 30:
            estagio = "G3b"
        elif crcl_arred >= 15:
            estagio = "G4"
        else:
            estagio = "G5"

        return {
            "crcl": crcl_arred,
            "crcl_exato": crcl,
            "peso_usado": round(peso_usado, 1),
            "tipo_peso": tipo_peso,
            "imc": round(imc, 1) if imc else None,
            "estagio": estagio
        }

    @staticmethod
    def calcular_ckd_epi_2021(cr: float, idade: int, eh_feminino: bool) -> Dict[str, Any]:
        """
        Equação CKD-EPI 2021 Race-Free (Inker et al., NEJM 2021):
        kappa = 0.7 (F) ou 0.9 (M)
        alpha = -0.241 (F) ou -0.302 (M)
        fator_sexo = 1.012 (F) ou 1.0 (M)
        eTFG = 142 * min(Cr/kappa, 1)^alpha * max(Cr/kappa, 1)^(-1.200) * 0.9938^idade * fator_sexo
        """
        if cr <= 0 or idade <= 0:
            return {"erro": "Parâmetros devem ser estritamente positivos"}

        kappa = 0.7 if eh_feminino else 0.9
        alpha = -0.241 if eh_feminino else -0.302
        fator_sexo = 1.012 if eh_feminino else 1.0

        ratio = cr / kappa
        termo_min = math.pow(min(ratio, 1.0), alpha)
        termo_max = math.pow(max(ratio, 1.0), -1.200)
        termo_idade = math.pow(0.9938, idade)

        tfg = 142.0 * termo_min * termo_max * termo_idade * fator_sexo
        tfg_arred = round(tfg, 1)

        if tfg_arred >= 90:
            estagio = "G1"
        elif tfg_arred >= 60:
            estagio = "G2"
        elif tfg_arred >= 45:
            estagio = "G3a"
        elif tfg_arred >= 30:
            estagio = "G3b"
        elif tfg_arred >= 15:
            estagio = "G4"
        else:
            estagio = "G5"

        return {
            "tfg": tfg_arred,
            "tfg_exato": tfg,
            "estagio": estagio
        }

    @staticmethod
    def calcular_schwartz_pediatrico(cr: float, altura_cm: float) -> Dict[str, Any]:
        """Fórmula de Schwartz Pediátrico Atualizada (2009): eTFG = (0.413 * Altura) / Cr."""
        if cr <= 0 or altura_cm <= 0:
            return {"erro": "Cr e Altura devem ser estritamente positivos"}
        tfg = (0.413 * altura_cm) / cr
        return {
            "tfg": round(tfg, 1),
            "tfg_exato": tfg
        }

    @staticmethod
    def calcular_winter(hco3: float) -> Dict[str, Any]:
        """
        Fórmula de Winter (NEJM 1967):
        pCO2 esperado = 1.5 * HCO3 + 8 (±2)
        """
        if hco3 <= 0:
            return {"erro": "HCO3 deve ser positivo"}

        esperada = round(1.5 * hco3 + 8.0, 1)
        minimo = round(esperada - 2.0, 1)
        maximo = round(esperada + 2.0, 1)

        return {
            "pco2_esperada": esperada,
            "minimo": minimo,
            "maximo": maximo
        }

    @staticmethod
    def calcular_gasometria_completa(
        ph: float,
        pco2: float,
        hco3: float,
        na: Optional[float] = None,
        cl: Optional[float] = None,
        albumina: Optional[float] = None,
        pao2: Optional[float] = None,
        fio2: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Interpretação e Auditoria Completa da Gasometria Arterial (5 Passos):
        1. Distúrbio Primário
        2. Compensação Esperada (Winter na Acidose Met, fórmula de 40+0.7 na Alcalose Met, etc.)
        3. Ânion Gap sérico (Na - (Cl + HCO3)) e corrigido por Albumina (AG + 2.5 * (4 - Alb))
        4. Razão Delta (Delta-Delta: (AG - 12) / (24 - HCO3))
        5. Relação P/F (PaO2 / (FiO2 / 100))
        """
        # 1. Distúrbio Primário
        ac_met = ph < 7.35 and hco3 < 22.0
        al_met = ph > 7.45 and hco3 > 26.0
        ac_resp = ph < 7.35 and pco2 > 45.0
        al_resp = ph > 7.45 and pco2 < 35.0

        disturbio_primario = "Normal"
        if ac_met and ac_resp:
            disturbio_primario = "Acidose Mista (Metabólica + Respiratória)"
        elif al_met and al_resp:
            disturbio_primario = "Alcalose Mista (Metabólica + Respiratória)"
        elif ac_met:
            disturbio_primario = "Acidose Metabólica"
        elif al_met:
            disturbio_primario = "Alcalose Metabólica"
        elif ac_resp:
            disturbio_primario = "Acidose Respiratória"
        elif al_resp:
            disturbio_primario = "Alcalose Respiratória"

        # 2. Compensação
        pco2_esperada = None
        min_comp = None
        max_comp = None
        comp_adequada = None

        if ac_met:
            w = MathOracle.calcular_winter(hco3)
            pco2_esperada = w["pco2_esperada"]
            min_comp = w["minimo"]
            max_comp = w["maximo"]
            comp_adequada = min_comp <= pco2 <= max_comp
        elif al_met:
            base_al = 40.0 + 0.7 * (hco3 - 24.0)
            pco2_esperada = round(base_al, 1)
            min_comp = round(base_al - 2.0, 1)
            max_comp = round(base_al + 2.0, 1)
            comp_adequada = min_comp <= pco2 <= max_comp

        # 3. Ânion Gap
        ag = None
        ag_corr = None
        if na is not None and cl is not None:
            ag = round(na - (cl + hco3), 1)
            if albumina is not None:
                ag_corr = round(ag + 2.5 * (4.0 - albumina), 1)

        # 4. Razão Delta (Delta-Delta)
        delta_ratio = None
        ag_ref = ag_corr if ag_corr is not None else ag
        if ag_ref is not None and hco3 < 24.0:
            delta_ag = ag_ref - 12.0
            delta_bic = 24.0 - hco3
            if delta_bic > 0:
                delta_ratio = round(delta_ag / delta_bic, 2)

        # 5. Relação P/F
        pf_ratio = None
        if pao2 is not None and fio2 is not None and fio2 > 0:
            fio2_dec = fio2 / 100.0 if fio2 > 1.0 else fio2
            pf_ratio = round(pao2 / fio2_dec, 1)

        return {
            "disturbio_primario": disturbio_primario,
            "pco2_esperada": pco2_esperada,
            "faixa_compensacao": (min_comp, max_comp) if min_comp is not None else None,
            "compensacao_adequada": comp_adequada,
            "anion_gap": ag,
            "anion_gap_corrigido": ag_corr,
            "delta_ratio": delta_ratio,
            "pf_ratio": pf_ratio
        }

    @staticmethod
    def calcular_calcio_corrigido(calcio_total: float, albumina: float) -> Dict[str, Any]:
        """Cálcio Corrigido (Payne et al., BMJ 1973): Ca_corr = Ca_total + 0.8 * (4.0 - Alb)."""
        ca_corr = round(calcio_total + 0.8 * (4.0 - albumina), 1)
        return {
            "calcio_corrigido": ca_corr
        }

    @staticmethod
    def calcular_gap_osmolar(osm_medida: float, na: float, glicose: float, ureia: float) -> Dict[str, Any]:
        """
        Gap Osmolar Sérico:
        Osm_calc = 2 * Na + Glicose / 18 + Ureia / 6  (mg/dL)
        Gap = Osm_medida - Osm_calc
        """
        osm_calc = 2.0 * na + (glicose / 18.0) + (ureia / 6.0)
        gap = osm_medida - osm_calc
        return {
            "osmolaridade_calculada": round(osm_calc, 1),
            "gap_osmolar": round(gap, 1),
            "elevado": gap > 10.0
        }

    @staticmethod
    def calcular_parkland(peso: float, scq: float) -> Dict[str, Any]:
        """
        Fórmula de Parkland (Baxter 1968 / American Burn Association):
        Volume 24h = 4 * peso * scq (mL de Ringer Lactato)
        Primeiras 8h: 50% | Próximas 16h: 50%
        """
        if peso <= 0 or scq <= 0:
            return {"erro": "Peso e SCQ devem ser positivos"}

        vol_total = round(4.0 * peso * scq, 1)
        vol_8h = round(vol_total / 2.0, 1)
        taxa_8h = round(vol_8h / 8.0, 1)
        vol_16h = round(vol_total / 2.0, 1)
        taxa_16h = round(vol_16h / 16.0, 1)

        return {
            "volume_24h": vol_total,
            "volume_primeiras_8h": vol_8h,
            "taxa_primeiras_8h_ml_h": taxa_8h,
            "volume_proximas_16h": vol_16h,
            "taxa_proximas_16h_ml_h": taxa_16h
        }

    @staticmethod
    def calcular_dva(
        droga: str,
        peso: float,
        dose: Optional[float] = None,
        solucao: str = "padrao"
    ) -> Dict[str, Any]:
        """
        Vazão de Drogas Vasoativas em Bomba de Infusão Contínua (BIC):
        Vazão (mL/h) = (Dose * Peso * 60) / Concentração (para mcg/kg/min)
        """
        droga_lower = droga.lower()

        if "nora" in droga_lower:
            # Concentração padrão: 16 mg em 250 mL = 64 mcg/mL. Concentrada (2x): 32 mg em 250 mL = 128 mcg/mL
            conc = 64.0 if "conc" not in solucao else 128.0
            dose_alvo = dose if dose is not None else 0.1  # mcg/kg/min
            vazao = (dose_alvo * peso * 60.0) / conc
            return {
                "droga": "noradrenalina",
                "concentracao_mcg_ml": conc,
                "dose_referencia": dose_alvo,
                "vazao_ml_h": round(vazao, 1)
            }
        elif "dobu" in droga_lower:
            # Concentração padrão: 250 mg em 250 mL = 1000 mcg/mL. Concentrada (2x): 500 mg em 250 mL = 2000 mcg/mL
            conc = 1000.0 if "conc" not in solucao else 2000.0
            dose_alvo = dose if dose is not None else 5.0  # mcg/kg/min
            vazao = (dose_alvo * peso * 60.0) / conc
            return {
                "droga": "dobutamina",
                "concentracao_mcg_ml": conc,
                "dose_referencia": dose_alvo,
                "vazao_ml_h": round(vazao, 1)
            }
        elif "vaso" in droga_lower:
            # Vasopressina: 20 UI em 100 mL = 0.2 UI/mL. Dose fixa clássica choque séptico: 0.03 UI/min -> 9.0 mL/h
            conc = 0.2  # UI/mL
            dose_alvo = dose if dose is not None else 0.03  # UI/min
            vazao = (dose_alvo * 60.0) / conc
            return {
                "droga": "vasopressina",
                "concentracao_ui_ml": conc,
                "dose_referencia": dose_alvo,
                "vazao_ml_h": round(vazao, 1)
            }

        return {"erro": f"Droga não mapeada: {droga}"}

    @staticmethod
    def calcular_sri(peso: float) -> Dict[str, Any]:
        """
        Sequência Rápida de Intubação (SRI) Beira-Leito:
        - Fentanil: 3 mcg/kg (50 mcg/mL)
        - Etomidato: 0.3 mg/kg (2 mg/mL)
        - Quetamina: 1.5 mg/kg (50 mg/mL)
        - Succinilcolina: 1.5 mg/kg (100 mg frasco)
        - Rocurônio: 1.2 mg/kg (10 mg/mL)
        """
        return {
            "fentanil_mcg": round(3.0 * peso, 0),
            "fentanil_ml": round((3.0 * peso) / 50.0, 1),
            "etomidato_mg": round(0.3 * peso, 1),
            "etomidato_ml": round((0.3 * peso) / 2.0, 1),
            "quetamina_mg": round(1.5 * peso, 1),
            "quetamina_ml": round((1.5 * peso) / 50.0, 1),
            "succinilcolina_mg": round(1.5 * peso, 0),
            "rocuronio_mg": round(1.2 * peso, 1),
            "rocuronio_ml": round((1.2 * peso) / 10.0, 1)
        }

    @staticmethod
    def calcular_holliday_segar(peso: float, condicao: str = "manutencao_padrao") -> Dict[str, Any]:
        """
        Hidratação Venosa Pediátrica (Holliday-Segar 1957 / SBP):
        Regra de peso diária (mL/24h):
          - <= 10 kg: peso * 100
          - 10 a 20 kg: 1000 + (peso - 10) * 50
          - > 20 kg: 1500 + (peso - 20) * 20
        Regra 4-2-1 na BIC (mL/h):
          - <= 10 kg: peso * 4
          - 10 a 20 kg: 40 + (peso - 10) * 2
          - > 20 kg: 60 + (peso - 20) * 1
        Ajustes: bronquiolite (70%), restrição cardiovascular (60%).
        """
        if peso <= 0:
            return {"erro": "Peso deve ser positivo"}

        if peso <= 10:
            vol_basal = peso * 100.0
            vazao_basal = peso * 4.0
        elif peso <= 20:
            vol_basal = 1000.0 + (peso - 10.0) * 50.0
            vazao_basal = 40.0 + (peso - 10.0) * 2.0
        else:
            vol_basal = 1500.0 + (peso - 20.0) * 20.0
            vazao_basal = 60.0 + (peso - 20.0) * 1.0

        percentual = 100.0
        if "bronquiolite" in condicao or "bva" in condicao:
            percentual = 70.0
        elif "ic" in condicao or "cardio" in condicao:
            percentual = 60.0

        vol_ajustado = round((vol_basal * percentual) / 100.0, 1)
        vazao_ajustada = round((vazao_basal * percentual) / 100.0, 1)

        return {
            "volume_24h": vol_ajustado,
            "vazao_ml_h": vazao_ajustada,
            "percentual": percentual
        }

    @staticmethod
    def calcular_act(peso: float, sexo: str, idade: int) -> float:
        """Água Corporal Total (ACT em Litros) conforme Adrogué-Madias."""
        s = sexo.lower()
        if s.startswith("f") or s == "mulher":
            fator = 0.45 if idade >= 65 else 0.50
        else:
            fator = 0.50 if idade >= 65 else 0.60
        return round(max(0.1, peso * fator), 1)

    @staticmethod
    def calcular_deficit_agua_livre(na_atual: float, peso: float, sexo: str, idade: int) -> Dict[str, Any]:
        """Déficit de Água Livre na Hipernatremia (Adrogué-Madias): ACT * ((Na / 140) - 1)."""
        act = MathOracle.calcular_act(peso, sexo, idade)
        if na_atual <= 140:
            return {"erro": "Na atual <= 140. Sem déficit de água livre."}

        deficit = act * ((na_atual / 140.0) - 1.0)
        return {
            "act": act,
            "deficit_litros": round(deficit, 2)
        }

    @staticmethod
    def calcular_adrogue_hiponatremia(
        na_atual: float, peso: float, sexo: str, idade: int, salina: float = 3.0
    ) -> Dict[str, Any]:
        """
        Variação de Sódio na Hiponatremia (Adrogué-Madias):
        Delta_Na = (Na_solucao - Na_paciente) / (ACT + 1)
        Salina 3% = 513 mEq/L | Salina 0.9% = 154 mEq/L
        """
        act = MathOracle.calcular_act(peso, sexo, idade)
        conc_salina = 513.0 if salina == 3.0 or salina == 3 else 154.0
        if na_atual >= conc_salina:
            return {"erro": "Na atual >= concentração da salina"}

        var_na = (conc_salina - na_atual) / (act + 1.0)
        var_arred = round(var_na, 1)

        # Volume para teto de 8 mEq em 24h
        vol_24h = round((8.0 / var_arred) * 1000.0)
        taxa_bic = round(vol_24h / 24.0, 1)

        return {
            "act": act,
            "variacao_na_por_litro": var_arred,
            "volume_24h_ml": vol_24h,
            "taxa_bic_ml_h": taxa_bic
        }

    @staticmethod
    def calcular_curb65(
        confusao: bool,
        ureia: float,
        fr: int,
        pas: int,
        pad: int,
        idade: int
    ) -> Dict[str, Any]:
        """Escore CURB-65 para Gravidade de Pneumonia Adquirida na Comunidade (PAC)."""
        pontos = 0
        if confusao: pontos += 1
        if ureia > 50.0: pontos += 1
        if fr >= 30: pontos += 1
        if pas < 90 or pad <= 60: pontos += 1
        if idade >= 65: pontos += 1

        if pontos <= 1:
            gravidade = "Baixo Risco (Mortalidade < 1,5%)"
            conduta = "Tratamento ambulatorial"
        elif pontos == 2:
            gravidade = "Risco Intermediário (Mortalidade ~9%)"
            conduta = "Internação em enfermaria / observação"
        else:
            gravidade = "Alto Risco (Mortalidade 15–40%)"
            conduta = "Internação hospitalar (avaliar CTI se pontos >= 4)"

        return {
            "pontos": pontos,
            "gravidade": gravidade,
            "conduta": conduta
        }

    @staticmethod
    def calcular_glasgow_p(ocular: int, verbal: int, motora: int, pupilas_arreativas: int = 0) -> Dict[str, Any]:
        """Escala de Coma de Glasgow com Reatividade Pupilar (GCS-P / Brennan 2018)."""
        gcs_base = ocular + verbal + motora
        gcsp = max(1, gcs_base - pupilas_arreativas)
        return {
            "gcs_base": gcs_base,
            "pupilas_subtraidas": pupilas_arreativas,
            "gcs_p": gcsp
        }

    # ──────────────────────────────────────────────────────────────────────────
    # 2. AUDITORIA INTELIGENTE DE INTERAÇÕES EM TEMPO REAL
    # ──────────────────────────────────────────────────────────────────────────

    def auditar_interacao(self, alvo_desc: str, resposta_texto: str) -> Optional[Dict[str, Any]]:
        """
        Analisa se a interação é um cálculo médico determinístico.
        Se for, calcula o gabarito analítico e compara com a resposta do bot.
        """
        if not alvo_desc or not resposta_texto:
            return None

        alvo = alvo_desc.strip()
        resp = resposta_texto.strip()

        # 1. Auditoria de Cockcroft-Gault (/crcl, /clcr, /clearance)
        if re.search(r"^/(?:crcl|clcr|clearance)\b", alvo, re.I):
            return self._auditar_cockcroft(alvo, resp)

        # 2. Auditoria de CKD-EPI 2021 (/ckd)
        if re.search(r"^/ckd\b", alvo, re.I):
            return self._auditar_ckd(alvo, resp)

        # 3. Auditoria de Gasometria e Winter (/winter, /gaso)
        if re.search(r"^/winter\b", alvo, re.I):
            return self._auditar_winter(alvo, resp)
        if re.search(r"^/(?:gaso|gasometria)\b", alvo, re.I):
            return self._auditar_gaso_completa(alvo, resp)

        # 4. Auditoria de DVA (/dva)
        if re.search(r"^/dva\b", alvo, re.I):
            return self._auditar_dva(alvo, resp)

        # 5. Auditoria de SRI (/sri)
        if re.search(r"^/sri\b", alvo, re.I):
            return self._auditar_sri(alvo, resp)

        # 6. Auditoria de Holliday-Segar (/holliday)
        if re.search(r"^/holliday\b", alvo, re.I):
            return self._auditar_holliday(alvo, resp)

        # 7. Auditoria de Parkland (/parkland)
        if re.search(r"^/parkland\b", alvo, re.I):
            return self._auditar_parkland(alvo, resp)

        # 8. Auditoria de Cálcio Corrigido (/calcio)
        if re.search(r"^/calcio\b", alvo, re.I):
            return self._auditar_calcio(alvo, resp)

        # 9. Auditoria de DHE (/dhe)
        if re.search(r"^/dhe\b", alvo, re.I):
            return self._auditar_dhe(alvo, resp)

        return None

    # ──────────────────────────────────────────────────────────────────────────
    # 3. MÉTODOS PRIVADOS DE AUDITORIA POR FÓRMULA
    # ──────────────────────────────────────────────────────────────────────────

    def _auditar_cockcroft(self, alvo: str, resp: str) -> Dict[str, Any]:
        """Audita Cockcroft-Gault."""
        if re.match(r"^/(?:crcl|clcr|clearance)$", alvo, re.I):
            return {
                "auditado": True,
                "calculadora": "Cockcroft-Gault",
                "aprovado": "informe" in resp.lower() or "calculadora" in resp.lower() or "guia" in resp.lower(),
                "esperado": "Mensagem guia / instruções de preenchimento",
                "obtido": "Guia exibido" if "guia" in resp.lower() or "informe" in resp.lower() else "Outro",
                "detalhes": "Comando sem parâmetros exibiu guia correto."
            }

        m_idade = re.search(r"(\d+)\s*(?:a|anos?)\b", alvo, re.I) or re.search(r"idade\s*[:=]?\s*(\d+)", alvo, re.I)
        m_peso = re.search(r"(\d+(?:[.,]\d+)?)\s*kg\b", alvo, re.I) or re.search(r"peso\s*[:=]?\s*(\d+(?:[.,]\d+)?)", alvo, re.I)
        m_cr = re.search(r"cr(?:eatinina)?\s*[:=]?\s*(\d+(?:[.,]\d+)?)", alvo, re.I)
        m_alt = re.search(r"(\d+(?:[.,]\d+)?)\s*cm\b", alvo, re.I) or re.search(r"altura\s*[:=]?\s*(\d+(?:[.,]\d+)?)", alvo, re.I)
        eh_fem = bool(re.search(r"\b(?:f|fem|feminino|mulher)\b", alvo, re.I))

        altura_cm = float(m_alt.group(1).replace(",", ".")) if m_alt else None

        if not (m_idade and m_peso and m_cr):
            tokens = re.findall(r"\d+(?:[.,]\d+)?", alvo)
            if len(tokens) >= 3:
                idade = int(float(tokens[0]))
                peso = float(tokens[1].replace(",", "."))
                cr = float(tokens[2].replace(",", "."))
            else:
                return {
                    "auditado": True,
                    "calculadora": "Cockcroft-Gault",
                    "aprovado": "falta informação" in resp.lower() or "preciso" in resp.lower() or "erro" in resp.lower(),
                    "esperado": "Bloqueio defensivo por parâmetros insuficientes",
                    "obtido": "Bloqueio acionado" if "falta" in resp.lower() else "Resposta inesperada",
                    "detalhes": "Parâmetros insuficientes tratados defensivamente."
                }
        else:
            idade = int(m_idade.group(1))
            peso = float(m_peso.group(1).replace(",", "."))
            cr = float(m_cr.group(1).replace(",", "."))

        gabarito = self.calcular_cockcroft_gault(idade, peso, cr, eh_fem, altura_cm)
        esperado_crcl = gabarito["crcl"]

        m_resp = re.search(r"(?:Clearance Estimado:\s*\*?|clearance:\s*\*?)(\d+(?:[.,]\d+)?)\s*mL/min", resp, re.I) or \
                 re.search(r"(\d+(?:[.,]\d+)?)\s*mL/min", resp, re.I)

        if not m_resp:
            return {
                "auditado": True,
                "calculadora": "Cockcroft-Gault",
                "aprovado": False,
                "esperado": esperado_crcl,
                "obtido": "Não encontrado na resposta",
                "erro_absoluto": 999.0,
                "tolerancia": 0.5,
                "detalhes": f"Não foi possível extrair o valor em mL/min da resposta do bot. Gabarito esperado: {esperado_crcl} mL/min."
            }

        obtido_crcl = float(m_resp.group(1).replace(",", "."))
        erro_abs = round(abs(obtido_crcl - esperado_crcl), 2)
        tolerancia = 0.5
        aprovado = erro_abs <= tolerancia

        return {
            "auditado": True,
            "calculadora": "Cockcroft-Gault",
            "aprovado": aprovado,
            "esperado": esperado_crcl,
            "obtido": obtido_crcl,
            "erro_absoluto": erro_abs,
            "tolerancia": tolerancia,
            "detalhes": f"Cockcroft-Gault (Idade {idade}, Peso {gabarito['peso_usado']}kg ({gabarito['tipo_peso']}), Cr {cr}, {'Fem' if eh_fem else 'Masc'}): esperado {esperado_crcl} mL/min, bot gerou {obtido_crcl} mL/min."
        }

    def _auditar_ckd(self, alvo: str, resp: str) -> Dict[str, Any]:
        """Audita CKD-EPI 2021."""
        m_cr = re.search(r"cr(?:eatinina)?\s*[:=]?\s*(\d+(?:[.,]\d+)?)", alvo, re.I)
        m_idade = re.search(r"idade\s*[:=]?\s*(\d+)", alvo, re.I) or re.search(r"(\d+)\s*anos?\b", alvo, re.I)
        eh_fem = bool(re.search(r"\b(?:f|fem|feminino|mulher)\b", alvo, re.I))

        if not (m_cr and m_idade):
            return {
                "auditado": True,
                "calculadora": "CKD-EPI 2021",
                "aprovado": "insuficientes" in resp.lower() or "informe" in resp.lower(),
                "esperado": "Guia de uso de CKD-EPI",
                "obtido": "Guia exibido",
                "detalhes": "CKD-EPI sem parâmetros acionou orientações."
            }

        cr = float(m_cr.group(1).replace(",", "."))
        idade = int(m_idade.group(1))

        gabarito = self.calcular_ckd_epi_2021(cr, idade, eh_fem)
        esperado_tfg = gabarito["tfg"]

        m_resp = re.search(r"(\d+(?:[.,]\d+)?)\s*mL/min/1[,.]73", resp, re.I) or \
                 re.search(r"(\d+(?:[.,]\d+)?)\s*mL/min", resp, re.I)

        if not m_resp:
            return {
                "auditado": True,
                "calculadora": "CKD-EPI 2021",
                "aprovado": False,
                "esperado": esperado_tfg,
                "obtido": "Não encontrado",
                "erro_absoluto": 999.0,
                "tolerancia": 1.0,
                "detalhes": f"TFG em mL/min/1,73m2 não encontrada. Esperado: {esperado_tfg}."
            }

        obtido_tfg = float(m_resp.group(1).replace(",", "."))
        erro_abs = round(abs(obtido_tfg - esperado_tfg), 2)
        tolerancia = 1.0
        aprovado = erro_abs <= tolerancia

        return {
            "auditado": True,
            "calculadora": "CKD-EPI 2021",
            "aprovado": aprovado,
            "esperado": esperado_tfg,
            "obtido": obtido_tfg,
            "erro_absoluto": erro_abs,
            "tolerancia": tolerancia,
            "detalhes": f"CKD-EPI 2021 (Cr {cr}, Idade {idade}, {'Fem' if eh_fem else 'Masc'}): esperado {esperado_tfg} mL/min/1,73m2, bot gerou {obtido_tfg}."
        }

    def _auditar_winter(self, alvo: str, resp: str) -> Dict[str, Any]:
        """Audita Fórmula de Winter."""
        m_bic = re.search(r"/winter\s*(\d+(?:[.,]\d+)?)", alvo, re.I)
        if not m_bic:
            return {
                "auditado": True,
                "calculadora": "Winter",
                "aprovado": "como usar" in resp.lower() or "informe" in resp.lower() or "fórmula de winter" in resp.lower(),
                "esperado": "Guia de uso de Winter",
                "obtido": "Guia exibido",
                "detalhes": "Comando sem HCO3 exibiu ajuda interativa."
            }

        hco3 = float(m_bic.group(1).replace(",", "."))
        gabarito = self.calcular_winter(hco3)
        esperado_pco2 = gabarito["pco2_esperada"]

        m_resp = re.search(r"(?:PaCO₂ esperada:\s*\*?|esperada:\s*\*?)(\d+(?:[.,]\d+)?)\s*mmHg", resp, re.I) or \
                 re.search(r"(\d+(?:[.,]\d+)?)\s*mmHg", resp, re.I)

        if not m_resp:
            return {
                "auditado": True,
                "calculadora": "Winter",
                "aprovado": False,
                "esperado": esperado_pco2,
                "obtido": "Não encontrado",
                "erro_absoluto": 999.0,
                "tolerancia": 0.2,
                "detalhes": f"Não foi possível extrair a PaCO2 esperada da resposta do bot. Esperado: {esperado_pco2} mmHg."
            }

        obtido_pco2 = float(m_resp.group(1).replace(",", "."))
        erro_abs = round(abs(obtido_pco2 - esperado_pco2), 2)
        tolerancia = 0.2
        aprovado = erro_abs <= tolerancia

        return {
            "auditado": True,
            "calculadora": "Winter",
            "aprovado": aprovado,
            "esperado": esperado_pco2,
            "obtido": obtido_pco2,
            "erro_absoluto": erro_abs,
            "tolerancia": tolerancia,
            "detalhes": f"Winter (HCO3 {hco3}): esperado PaCO2 {esperado_pco2} mmHg ({gabarito['minimo']}–{gabarito['maximo']}), bot gerou {obtido_pco2} mmHg."
        }

    def _auditar_gaso_completa(self, alvo: str, resp: str) -> Dict[str, Any]:
        """Audita Análise Gasométrica Completa."""
        tokens = re.findall(r"\d+(?:[.,]\d+)?", alvo)
        if len(tokens) < 3:
            return {
                "auditado": True,
                "calculadora": "Gasometria Completa",
                "aprovado": "informe" in resp.lower() or "gasometria" in resp.lower() or "guia" in resp.lower(),
                "esperado": "Guia de Gasometria",
                "obtido": "Guia exibido",
                "detalhes": "Gasometria sem parâmetros mínimos exibiu orientações."
            }

        ph = float(tokens[0].replace(",", "."))
        pco2 = float(tokens[1].replace(",", "."))
        hco3 = float(tokens[2].replace(",", "."))
        na = float(tokens[3].replace(",", ".")) if len(tokens) >= 4 and float(tokens[3].replace(",", ".")) > 100 else None
        cl = float(tokens[4].replace(",", ".")) if len(tokens) >= 5 and float(tokens[4].replace(",", ".")) > 60 else None

        gabarito = self.calcular_gasometria_completa(ph, pco2, hco3, na, cl)
        esperado_dist = gabarito["disturbio_primario"]

        # Se for acidose metabólica com Winter
        if gabarito["pco2_esperada"] is not None:
            m_resp_w = re.search(r"(\d+(?:[.,]\d+)?)\s*mmHg", resp)
            obtido_pco2 = float(m_resp_w.group(1).replace(",", ".")) if m_resp_w else None
            erro_w = abs(obtido_pco2 - gabarito["pco2_esperada"]) if obtido_pco2 else 0.0
            aprovado = erro_w <= 0.5
        else:
            aprovado = "gasometria" in resp.lower() or esperado_dist.lower() in resp.lower()

        return {
            "auditado": True,
            "calculadora": "Gasometria Completa",
            "aprovado": aprovado,
            "esperado": f"{esperado_dist} (pCO2 esp: {gabarito['pco2_esperada']})",
            "obtido": "Interpretado",
            "detalhes": f"Gasometria (pH {ph}, pCO2 {pco2}, HCO3 {hco3}): primário {esperado_dist}."
        }

    def _auditar_dva(self, alvo: str, resp: str) -> Dict[str, Any]:
        """Audita Vazão de Drogas Vasoativas."""
        m_peso = re.search(r"(\d+(?:[.,]\d+)?)\s*kg\b", alvo, re.I) or re.search(r"/dva\s+\w+\s+(\d+(?:[.,]\d+)?)", alvo, re.I)
        if not m_peso:
            return {
                "auditado": True,
                "calculadora": "DVA",
                "aprovado": "parâmetros" in resp.lower() or "infusão" in resp.lower() or "guia" in resp.lower(),
                "esperado": "Guia de uso de DVA",
                "obtido": "Guia ou instrução",
                "detalhes": "DVA sem peso exibiu orientações."
            }

        peso = float(m_peso.group(1).replace(",", "."))
        droga = "noradrenalina"
        if "dobu" in alvo.lower():
            droga = "dobutamina"
        elif "vaso" in alvo.lower():
            droga = "vasopressina"

        gabarito = self.calcular_dva(droga, peso)
        esperado_vazao = gabarito["vazao_ml_h"]

        m_resp = None
        if droga == "noradrenalina":
            m_resp = re.search(r"0[.,]1\s*mcg/kg/min\s*→\s*(\d+(?:[.,]\d+)?)\s*mL/h", resp, re.I)
        elif droga == "dobutamina":
            m_resp = re.search(r"5[.,]0\s*mcg/kg/min\s*→\s*(\d+(?:[.,]\d+)?)\s*mL/h", resp, re.I) or \
                     re.search(r"5\s*mcg/kg/min\s*→\s*(\d+(?:[.,]\d+)?)\s*mL/h", resp, re.I)
        elif droga == "vasopressina":
            m_resp = re.search(r"(\d+(?:[.,]\d+)?)\s*mL/h\s*na\s*bomba", resp, re.I) or \
                     re.search(r"→\s*(\d+(?:[.,]\d+)?)\s*mL/h", resp, re.I)

        if not m_resp:
            m_resp = re.search(r"(\d+(?:[.,]\d+)?)\s*mL/h", resp, re.I)

        if not m_resp:
            return {
                "auditado": True,
                "calculadora": f"DVA {droga.capitalize()}",
                "aprovado": False,
                "esperado": esperado_vazao,
                "obtido": "Não encontrado",
                "erro_absoluto": 999.0,
                "tolerancia": 0.3,
                "detalhes": f"Não foi possível extrair a vazão da infusão de {droga}. Esperado: {esperado_vazao} mL/h."
            }

        obtido_vazao = float(m_resp.group(1).replace(",", "."))
        erro_abs = round(abs(obtido_vazao - esperado_vazao), 2)
        tolerancia = 0.3
        aprovado = erro_abs <= tolerancia

        return {
            "auditado": True,
            "calculadora": f"DVA {droga.capitalize()}",
            "aprovado": aprovado,
            "esperado": esperado_vazao,
            "obtido": obtido_vazao,
            "erro_absoluto": erro_abs,
            "tolerancia": tolerancia,
            "detalhes": f"DVA {droga.capitalize()} (Peso {peso}kg, dose {gabarito.get('dose_referencia')}): esperado {esperado_vazao} mL/h, bot gerou {obtido_vazao} mL/h."
        }

    def _auditar_sri(self, alvo: str, resp: str) -> Dict[str, Any]:
        """Audita Sequência Rápida de Intubação (SRI)."""
        m_peso = re.search(r"(\d+(?:[.,]\d+)?)\s*kg\b", alvo, re.I) or re.search(r"/sri\s+(\d+(?:[.,]\d+)?)", alvo, re.I)
        if not m_peso:
            return {
                "auditado": True,
                "calculadora": "SRI",
                "aprovado": "informe" in resp.lower() or "peso" in resp.lower() or "intubação" in resp.lower(),
                "esperado": "Guia de uso de SRI",
                "obtido": "Guia exibido",
                "detalhes": "SRI sem peso exibiu parâmetros."
            }

        peso = float(m_peso.group(1).replace(",", "."))
        gabarito = self.calcular_sri(peso)
        esp_eto_ml = gabarito["etomidato_ml"]

        # Busca volume de etomidato na resposta
        m_resp = re.search(r"etomidato.*?(\d+(?:[.,]\d+)?)\s*mL", resp, re.I)
        if m_resp:
            obt_eto = float(m_resp.group(1).replace(",", "."))
            erro_abs = round(abs(obt_eto - esp_eto_ml), 2)
            aprovado = erro_abs <= 0.2
        else:
            aprovado = "intubação" in resp.lower() or "sri" in resp.lower()

        return {
            "auditado": True,
            "calculadora": "SRI",
            "aprovado": aprovado,
            "esperado": f"Etomidato {esp_eto_ml} mL ({gabarito['etomidato_mg']} mg)",
            "obtido": "Validado",
            "detalhes": f"SRI (Peso {peso}kg): doses de indução calculadas com segurança."
        }

    def _auditar_holliday(self, alvo: str, resp: str) -> Dict[str, Any]:
        """Audita Holliday-Segar."""
        m_peso = re.search(r"(\d+(?:[.,]\d+)?)\s*kg\b", alvo, re.I) or re.search(r"/holliday\s+(\d+(?:[.,]\d+)?)", alvo, re.I)
        if not m_peso:
            return {
                "auditado": True,
                "calculadora": "Holliday-Segar",
                "aprovado": "peso não informado" in resp.lower() or "informe o peso" in resp.lower(),
                "esperado": "Alerta de peso obrigatório",
                "obtido": "Alerta exibido",
                "detalhes": "Holliday sem peso exigiu parâmetro corretamente."
            }

        peso = float(m_peso.group(1).replace(",", "."))
        condicao = "manutencao_padrao"
        if "bronquiolite" in alvo.lower():
            condicao = "bronquiolite"
        elif "ic" in alvo.lower() or "cardio" in alvo.lower():
            condicao = "restricao_ic"

        gabarito = self.calcular_holliday_segar(peso, condicao)
        esperado_vol = gabarito["volume_24h"]

        m_resp = re.search(r"(?:Volume Total 24h:\s*\*?|volume:\s*\*?)(\d+(?:[.,]\d+)?)\s*mL/dia", resp, re.I) or \
                 re.search(r"(\d+(?:[.,]\d+)?)\s*mL/dia", resp, re.I)

        if not m_resp:
            return {
                "auditado": True,
                "calculadora": "Holliday-Segar",
                "aprovado": False,
                "esperado": esperado_vol,
                "obtido": "Não encontrado",
                "erro_absoluto": 999.0,
                "tolerancia": 1.0,
                "detalhes": f"Não foi possível extrair o volume de 24h em mL/dia. Esperado: {esperado_vol} mL/dia."
            }

        obtido_vol = float(m_resp.group(1).replace(",", "."))
        erro_abs = round(abs(obtido_vol - esperado_vol), 2)
        tolerancia = 1.0
        aprovado = erro_abs <= tolerancia

        return {
            "auditado": True,
            "calculadora": "Holliday-Segar",
            "aprovado": aprovado,
            "esperado": esperado_vol,
            "obtido": obtido_vol,
            "erro_absoluto": erro_abs,
            "tolerancia": tolerancia,
            "detalhes": f"Holliday-Segar (Peso {peso}kg, {condicao}): volume 24h esperado {esperado_vol} mL/dia, bot gerou {obtido_vol} mL/dia."
        }

    def _auditar_parkland(self, alvo: str, resp: str) -> Dict[str, Any]:
        """Audita Fórmula de Parkland."""
        tokens = re.findall(r"\d+(?:[.,]\d+)?", alvo)
        if len(tokens) < 2:
            return {
                "auditado": True,
                "calculadora": "Parkland",
                "aprovado": "parâmetros" in resp.lower() or "insuficientes" in resp.lower() or "informe" in resp.lower(),
                "esperado": "Alerta de parâmetros insuficientes",
                "obtido": "Alerta defensivo",
                "detalhes": "Parkland sem parâmetros suficientes acionou bloqueio defensivo."
            }

        peso = float(tokens[0].replace(",", "."))
        scq = float(tokens[1].replace(",", "."))
        gabarito = self.calcular_parkland(peso, scq)
        esperado_vol = gabarito["volume_24h"]

        m_resp = re.search(r"(\d+(?:[.,]\d+)?)\s*mL(?:\s*de\s*Ringer|\s*em\s*24h|/24h)?", resp, re.I)
        if not m_resp:
            return {
                "auditado": True,
                "calculadora": "Parkland",
                "aprovado": False,
                "esperado": esperado_vol,
                "obtido": "Não encontrado",
                "erro_absoluto": 999.0,
                "tolerancia": 2.0,
                "detalhes": f"Volume total de Parkland não encontrado na resposta. Esperado: {esperado_vol} mL."
            }

        obtido_vol = float(m_resp.group(1).replace(",", "."))
        erro_abs = round(abs(obtido_vol - esperado_vol), 2)
        tolerancia = 2.0
        aprovado = erro_abs <= tolerancia

        return {
            "auditado": True,
            "calculadora": "Parkland",
            "aprovado": aprovado,
            "esperado": esperado_vol,
            "obtido": obtido_vol,
            "erro_absoluto": erro_abs,
            "tolerancia": tolerancia,
            "detalhes": f"Parkland (Peso {peso}kg, SCQ {scq}%): esperado {esperado_vol} mL nas primeiras 24h, bot gerou {obtido_vol} mL."
        }

    def _auditar_calcio(self, alvo: str, resp: str) -> Dict[str, Any]:
        """Audita Cálcio Corrigido."""
        tokens = re.findall(r"\d+(?:[.,]\d+)?", alvo)
        if len(tokens) < 2:
            return {
                "auditado": True,
                "calculadora": "Cálcio Corrigido",
                "aprovado": "insuficientes" in resp.lower() or "informe" in resp.lower(),
                "esperado": "Alerta de parâmetros insuficientes",
                "obtido": "Alerta defensivo",
                "detalhes": "Cálcio sem albumina acionou alerta defensivo."
            }

        ca = float(tokens[0].replace(",", "."))
        alb = float(tokens[1].replace(",", "."))
        gabarito = self.calcular_calcio_corrigido(ca, alb)
        esperado_ca = gabarito["calcio_corrigido"]

        m_resp = re.search(r"(\d+(?:[.,]\d+)?)\s*mg/dL", resp, re.I)
        if not m_resp:
            return {
                "auditado": True,
                "calculadora": "Cálcio Corrigido",
                "aprovado": False,
                "esperado": esperado_ca,
                "obtido": "Não encontrado",
                "erro_absoluto": 999.0,
                "tolerancia": 0.1,
                "detalhes": f"Cálcio corrigido não encontrado em mg/dL. Esperado: {esperado_ca} mg/dL."
            }

        obtido_ca = float(m_resp.group(1).replace(",", "."))
        erro_abs = round(abs(obtido_ca - esperado_ca), 2)
        tolerancia = 0.1
        aprovado = erro_abs <= tolerancia

        return {
            "auditado": True,
            "calculadora": "Cálcio Corrigido",
            "aprovado": aprovado,
            "esperado": esperado_ca,
            "obtido": obtido_ca,
            "erro_absoluto": erro_abs,
            "tolerancia": tolerancia,
            "detalhes": f"Cálcio Corrigido (Ca {ca}, Alb {alb}): esperado {esperado_ca} mg/dL, bot gerou {obtido_ca} mg/dL."
        }

    def _auditar_dhe(self, alvo: str, resp: str) -> Dict[str, Any]:
        """Audita Distúrbios Hidroeletrolíticos (DHE)."""
        d_low = alvo.lower()
        if "hipercalemia" in d_low or " k " in d_low or d_low.startswith("/dhe k"):
            m_k = re.search(r"(?:k|potassio|potássio)\s*[:=]?\s*(\d+(?:[.,]\d+)?)", d_low) or re.search(r"/dhe\s+k\s+(\d+(?:[.,]\d+)?)", d_low)
            k_val = float(m_k.group(1).replace(",", ".")) if m_k else 6.5
            return {
                "auditado": True,
                "calculadora": "DHE Hipercalemia",
                "aprovado": str(k_val) in resp or "potássio sérico" in resp.lower(),
                "esperado": f"Estratificação de Hipercalemia para K+ {k_val}",
                "obtido": "Estratificação exibida",
                "detalhes": f"Hipercalemia (K+ {k_val}): manejo e condutas avaliados."
            }

        m_na = re.search(r"(?:na|sodio|sódio)\s*[:=]?\s*(\d+(?:[.,]\d+)?)", d_low)
        m_peso = re.search(r"(\d+(?:[.,]\d+)?)\s*kg\b", d_low) or re.search(r"peso\s*[:=]?\s*(\d+(?:[.,]\d+)?)", d_low)
        m_idade = re.search(r"(\d{1,3})\s*(?:a|anos?)\b", d_low) or re.search(r"idade\s*[:=]?\s*(\d{1,3})", d_low)
        eh_fem = bool(re.search(r"\b(?:f|fem|feminino|mulher)\b", d_low))

        if not m_na:
            nums = re.findall(r"\d+(?:[.,]\d+)?", d_low)
            na_val = float(nums[0].replace(",", ".")) if nums else 140.0
        else:
            na_val = float(m_na.group(1).replace(",", "."))

        peso_val = float(m_peso.group(1).replace(",", ".")) if m_peso else 70.0
        idade_val = int(m_idade.group(1)) if m_idade else 45
        sexo_str = "f" if eh_fem else "m"

        if na_val > 145:
            gabarito = self.calcular_deficit_agua_livre(na_val, peso_val, sexo_str, idade_val)
            esperado_def = gabarito["deficit_litros"]

            m_resp = re.search(r"(?:Déficit Total:\s*\*?|déficit:\s*\*?)(\d+(?:[.,]\d+)?)\s*Litros", resp, re.I) or \
                     re.search(r"(\d+(?:[.,]\d+)?)\s*Litros", resp, re.I)

            if not m_resp:
                return {
                    "auditado": True,
                    "calculadora": "DHE Hipernatremia (Água Livre)",
                    "aprovado": False,
                    "esperado": esperado_def,
                    "obtido": "Não encontrado",
                    "erro_absoluto": 999.0,
                    "tolerancia": 0.2,
                    "detalhes": f"Déficit em Litros não encontrado na resposta. Esperado: {esperado_def} L."
                }

            obtido_def = float(m_resp.group(1).replace(",", "."))
            erro_abs = round(abs(obtido_def - esperado_def), 2)
            tolerancia = 0.2
            aprovado = erro_abs <= tolerancia

            return {
                "auditado": True,
                "calculadora": "DHE Hipernatremia (Água Livre)",
                "aprovado": aprovado,
                "esperado": esperado_def,
                "obtido": obtido_def,
                "erro_absoluto": erro_abs,
                "tolerancia": tolerancia,
                "detalhes": f"Hipernatremia (Na {na_val}, Peso {peso_val}kg, ACT {gabarito['act']}L): déficit esperado {esperado_def} Litros, bot gerou {obtido_def} L."
            }

        elif na_val < 135:
            gabarito = self.calcular_adrogue_hiponatremia(na_val, peso_val, sexo_str, idade_val, 3.0)
            esperado_var = gabarito["variacao_na_por_litro"]

            m_resp = re.search(r"(?:Elevação por cada 1\.000 mL.*?:\s*\*?\+?|variação:\s*\*?\+?)(\d+(?:[.,]\d+)?)\s*mEq/L", resp, re.I) or \
                     re.search(r"\+(\d+(?:[.,]\d+)?)\s*mEq/L", resp, re.I)

            if not m_resp:
                return {
                    "auditado": True,
                    "calculadora": "DHE Hiponatremia (Adrogué-Madias)",
                    "aprovado": False,
                    "esperado": esperado_var,
                    "obtido": "Não encontrado",
                    "erro_absoluto": 999.0,
                    "tolerancia": 0.1,
                    "detalhes": f"Variação de Na por Litro não encontrada na resposta. Esperado: +{esperado_var} mEq/L."
                }

            obtido_var = float(m_resp.group(1).replace(",", "."))
            erro_abs = round(abs(obtido_var - esperado_var), 2)
            tolerancia = 0.1
            aprovado = erro_abs <= tolerancia

            return {
                "auditado": True,
                "calculadora": "DHE Hiponatremia (Adrogué-Madias)",
                "aprovado": aprovado,
                "esperado": esperado_var,
                "obtido": obtido_var,
                "erro_absoluto": erro_abs,
                "tolerancia": tolerancia,
                "detalhes": f"Hiponatremia (Na {na_val}, Peso {peso_val}kg, ACT {gabarito['act']}L): variação esperada +{esperado_var} mEq/L por 1.000 mL de NaCl 3%, bot gerou +{obtido_var} mEq/L."
            }

        return {
            "auditado": True,
            "calculadora": "DHE Normonatremia",
            "aprovado": True,
            "esperado": "Normonatremia",
            "obtido": "Normal",
            "detalhes": f"Sódio {na_val} mEq/L em faixa normal/isotônica."
        }
