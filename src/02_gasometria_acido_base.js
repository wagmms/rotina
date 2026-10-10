/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Módulo de Inteligência Gasométrica e Distúrbios Ácido-Base
 * REGRA DOS 5 PASSOS — Motor Determinístico Beira-Leito
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Baseado em:
 *  - Adrogué HJ, Madias NE. "Management of life-threatening acid–base disorders"
 *    (NEJM 1998 / update 2018)
 *  - Haber RJ. "A Practical Approach to Acid-Base Disorders" (West J Med 1991)
 *  - Fórmula de Winter: pCO₂ = 1.5 × HCO₃⁻ + 8 (±2) — NEJM 1967
 *  - Narins RG, Emmett M. "Simple and mixed acid-base disorders: a practical approach"
 *    (Medicine 1980)
 *  - SDRA: Definição de Berlim 2012 (JAMA)
 *  - Gradiente A-a: Guyton & Hall, Textbook of Medical Physiology, 14th ed.
 *
 * Passos implementados:
 *  1. Identificação do distúrbio primário (pH, PaCO₂, HCO₃⁻)
 *  2. Avaliação da compensação esperada (Winter, fórmulas metabólicas/respiratórias)
 *  3. Cálculo do Ânion Gap (AG) e AG corrigido por albumina
 *  4. Cálculo da Razão Delta (Delta-Delta) para distúrbios ocultos
 *  5. Avaliação da oxigenação: P/F Ratio, Gradiente A-a, SatO₂ esperada
 *
 * @author Ultra Rotina — Motor de Evolução Perpétua
 */

var GasometriaAcidoBaseService = (function () {
  'use strict';

  // ═══════════════════════════ CONSTANTES ════════════════════════════════════

  var EPS = 1e-9;
  var AG_NORMAL = 12;        // Ânion Gap de referência (mEq/L)
  var ALB_NORMAL = 4.0;      // Albumina sérica normal (g/dL)
  var HCO3_NORMAL = 24;      // HCO₃⁻ normal (mEq/L)
  var PCO2_NORMAL = 40;       // PaCO₂ normal (mmHg)
  var PH_NORMAL_LOW = 7.35;
  var PH_NORMAL_HIGH = 7.45;
  var HCO3_LOW = 22;
  var HCO3_HIGH = 26;
  var PCO2_LOW = 35;
  var PCO2_HIGH = 45;

  // ════════════════════════ HELPERS NUMÉRICOS ════════════════════════════════

  function lt(a, b)  { return a < b - EPS; }
  function lte(a, b) { return a <= b + EPS; }
  function gt(a, b)  { return a > b + EPS; }
  function gte(a, b) { return a >= b - EPS; }
  function entre(v, min, max) { return gte(v, min) && lte(v, max); }

  function arred(x, casas) {
    if (!Number.isFinite(x)) return x;
    var f = Math.pow(10, casas || 0);
    return Math.round((x + EPS) * f) / f;
  }
  function fmt(x, casas) {
    if (x === null || x === undefined) return '—';
    return arred(x, casas).toFixed(casas).replace('.', ',');
  }

  function validarNumero(val, nome, min, max, obrigatorio) {
    if (val === null || val === undefined || val === '') {
      if (obrigatorio) throw new Error('Parâmetro obrigatório ausente: ' + nome);
      return null;
    }
    var n = Number(val);
    if (!Number.isFinite(n)) throw new Error(nome + ': valor não numérico (' + val + ')');
    if (n < min || n > max) throw new Error(nome + ': valor ' + n + ' fora da faixa [' + min + '–' + max + ']');
    return n;
  }

  // ═══════════════ PASSO 1: DISTÚRBIO PRIMÁRIO ══════════════════════════════

  function identificarDisturbio(ph, pco2, hco3) {
    var pHbaixo = lt(ph, PH_NORMAL_LOW);
    var pHalto  = gt(ph, PH_NORMAL_HIGH);
    var acMet   = lt(hco3, HCO3_LOW);
    var alMet   = gt(hco3, HCO3_HIGH);
    var acResp  = gt(pco2, PCO2_HIGH);
    var alResp  = lt(pco2, PCO2_LOW);

    var tipo, subtipo, gravidade;

    if (pHbaixo) {
      if (acMet && acResp) {
        tipo = 'Acidose Mista (Metabólica + Respiratória)';
        subtipo = 'mista';
      } else if (acMet) {
        tipo = 'Acidose Metabólica';
        subtipo = 'acidose_metabolica';
      } else if (acResp) {
        tipo = 'Acidose Respiratória';
        subtipo = 'acidose_respiratoria';
      } else {
        tipo = 'Acidemia sem alteração evidente de PaCO₂/HCO₃⁻';
        subtipo = 'acidemia_indefinida';
      }
    } else if (pHalto) {
      if (alMet && alResp) {
        tipo = 'Alcalose Mista (Metabólica + Respiratória)';
        subtipo = 'mista';
      } else if (alMet) {
        tipo = 'Alcalose Metabólica';
        subtipo = 'alcalose_metabolica';
      } else if (alResp) {
        tipo = 'Alcalose Respiratória';
        subtipo = 'alcalose_respiratoria';
      } else {
        tipo = 'Alcalemia sem alteração evidente de PaCO₂/HCO₃⁻';
        subtipo = 'alcalemia_indefinida';
      }
    } else {
      if (acMet && alResp) {
        tipo = 'Distúrbio Misto com pH normal (Acidose Metabólica + Alcalose Respiratória)';
        subtipo = 'misto_ph_normal';
      } else if (alMet && acResp) {
        tipo = 'Distúrbio Misto com pH normal (Alcalose Metabólica + Acidose Respiratória)';
        subtipo = 'misto_ph_normal';
      } else if (acMet || alMet || acResp || alResp) {
        tipo = 'pH normal compensado ou distúrbio misto';
        subtipo = 'compensado';
      } else {
        tipo = 'Gasometria Normal — sem distúrbio ácido-base evidente';
        subtipo = 'normal';
      }
    }

    // Gravidade baseada no pH
    if (lt(ph, 7.10))      gravidade = 'CRITICA';
    else if (lt(ph, 7.20)) gravidade = 'GRAVE';
    else if (lt(ph, 7.30)) gravidade = 'MODERADA';
    else if (gt(ph, 7.60)) gravidade = 'CRITICA';
    else if (gt(ph, 7.55)) gravidade = 'GRAVE';
    else                   gravidade = 'LEVE_OU_NORMAL';

    return {
      descricao: tipo,
      subtipo: subtipo,
      gravidade: gravidade,
      flags: {
        pHbaixo: pHbaixo, pHalto: pHalto,
        acMet: acMet, alMet: alMet,
        acResp: acResp, alResp: alResp
      }
    };
  }

  // ═══════════════ PASSO 2: COMPENSAÇÃO ESPERADA ════════════════════════════

  function avaliarCompensacao(ph, pco2, hco3, flags) {
    var resultado = {
      formulaUsada: null,
      esperadoMin: null,
      esperadoMax: null,
      valorReal: null,
      parametroAvaliado: null,
      avaliacao: null,
      disturbioAssociado: null
    };

    // ─── Acidose Metabólica: Fórmula de Winter ──────────────────────
    if (flags.acMet && !flags.pHalto) {
      var base = 1.5 * hco3 + 8;
      resultado.formulaUsada = 'Winter: PaCO₂ = 1,5 × HCO₃⁻ + 8 (±2)';
      resultado.esperadoMin = arred(base - 2, 1);
      resultado.esperadoMax = arred(base + 2, 1);
      resultado.valorReal = pco2;
      resultado.parametroAvaliado = 'PaCO₂';

      if (gt(pco2, resultado.esperadoMax)) {
        resultado.avaliacao = 'PaCO₂ acima do esperado: Acidose Respiratória associada';
        resultado.disturbioAssociado = 'acidose_respiratoria';
      } else if (lt(pco2, resultado.esperadoMin)) {
        resultado.avaliacao = 'PaCO₂ abaixo do esperado: Alcalose Respiratória associada';
        resultado.disturbioAssociado = 'alcalose_respiratoria';
      } else {
        resultado.avaliacao = 'Resposta compensatória adequada';
        resultado.disturbioAssociado = null;
      }
    }

    // ─── Alcalose Metabólica ────────────────────────────────────────
    else if (flags.alMet && !flags.pHbaixo) {
      var base2 = PCO2_NORMAL + 0.7 * (hco3 - HCO3_NORMAL);
      resultado.formulaUsada = 'PaCO₂ = 40 + 0,7 × (HCO₃⁻ − 24) (±2)';
      resultado.esperadoMin = arred(base2 - 2, 1);
      resultado.esperadoMax = arred(base2 + 2, 1);
      resultado.valorReal = pco2;
      resultado.parametroAvaliado = 'PaCO₂';

      if (gt(pco2, resultado.esperadoMax)) {
        resultado.avaliacao = 'PaCO₂ acima do esperado: Acidose Respiratória associada';
        resultado.disturbioAssociado = 'acidose_respiratoria';
      } else if (lt(pco2, resultado.esperadoMin)) {
        resultado.avaliacao = 'PaCO₂ abaixo do esperado: Alcalose Respiratória associada';
        resultado.disturbioAssociado = 'alcalose_respiratoria';
      } else {
        resultado.avaliacao = 'Resposta compensatória adequada';
        resultado.disturbioAssociado = null;
      }
    }

    // ─── Acidose Respiratória (aguda vs crônica) ────────────────────
    else if (flags.acResp && !flags.acMet && flags.pHbaixo) {
      var aguda  = HCO3_NORMAL + 0.1 * (pco2 - PCO2_NORMAL);
      var cronica = HCO3_NORMAL + 0.35 * (pco2 - PCO2_NORMAL);
      resultado.formulaUsada = 'HCO₃⁻ agudo: +0,1 × Δ PaCO₂ | crônico: +0,35 × Δ PaCO₂';
      resultado.esperadoMin = arred(aguda - 2, 1);
      resultado.esperadoMax = arred(cronica + 2, 1);
      resultado.valorReal = hco3;
      resultado.parametroAvaliado = 'HCO₃⁻';

      if (lt(hco3, resultado.esperadoMin)) {
        resultado.avaliacao = 'HCO₃⁻ abaixo do esperado: Acidose Metabólica associada';
        resultado.disturbioAssociado = 'acidose_metabolica';
      } else if (gt(hco3, resultado.esperadoMax)) {
        resultado.avaliacao = 'HCO₃⁻ acima do esperado: Alcalose Metabólica associada';
        resultado.disturbioAssociado = 'alcalose_metabolica';
      } else {
        resultado.avaliacao = 'Compatível com acidose respiratória pura (aguda a crônica)';
        resultado.disturbioAssociado = null;
      }
    }

    // ─── Alcalose Respiratória (aguda vs crônica) ───────────────────
    else if (flags.alResp && !flags.alMet && flags.pHalto) {
      var aguda2  = HCO3_NORMAL - 0.2 * (PCO2_NORMAL - pco2);
      var cronica2 = HCO3_NORMAL - 0.5 * (PCO2_NORMAL - pco2);
      resultado.formulaUsada = 'HCO₃⁻ agudo: −0,2 × Δ PaCO₂ | crônico: −0,5 × Δ PaCO₂';
      resultado.esperadoMin = arred(cronica2 - 2, 1);
      resultado.esperadoMax = arred(aguda2 + 2, 1);
      resultado.valorReal = hco3;
      resultado.parametroAvaliado = 'HCO₃⁻';

      if (gt(hco3, resultado.esperadoMax)) {
        resultado.avaliacao = 'HCO₃⁻ acima do esperado: Alcalose Metabólica associada';
        resultado.disturbioAssociado = 'alcalose_metabolica';
      } else if (lt(hco3, resultado.esperadoMin)) {
        resultado.avaliacao = 'HCO₃⁻ abaixo do esperado: Acidose Metabólica associada';
        resultado.disturbioAssociado = 'acidose_metabolica';
      } else {
        resultado.avaliacao = 'Compatível com alcalose respiratória pura (aguda a crônica)';
        resultado.disturbioAssociado = null;
      }
    }

    return resultado;
  }

  // ═══════════════ PASSO 3: ÂNION GAP ═══════════════════════════════════════

  function calcularAnionGap(na, cl, hco3, albumina) {
    if (na === null || cl === null) {
      return { calculado: false, motivo: 'Na e/ou Cl ausentes' };
    }

    var ag = na - (cl + hco3);
    var agCorr = null;
    if (albumina !== null) {
      agCorr = ag + 2.5 * (ALB_NORMAL - albumina);
    }

    var agRef = agCorr !== null ? agCorr : ag;
    var elevado = gt(agRef, AG_NORMAL);
    var interpretacao;
    if (elevado) {
      interpretacao = 'Ânion Gap ELEVADO (> 12 mEq/L)';
    } else {
      interpretacao = 'Ânion Gap NORMAL (≤ 12 mEq/L)';
    }

    return {
      calculado: true,
      anionGap: arred(ag, 1),
      anionGapCorrigido: agCorr !== null ? arred(agCorr, 1) : null,
      agReferencia: arred(agRef, 1),
      elevado: elevado,
      interpretacao: interpretacao,
      albuminaUsada: albumina
    };
  }

  // ═══════════════ PASSO 4: RAZÃO DELTA (DELTA-DELTA) ═══════════════════════

  /**
   * Delta Ratio = (AG - 12) / (24 - HCO₃⁻)
   *
   * Interpretação:
   *  < 0.4  → Acidose hiperclorêmica pura (AG normal)
   *  0.4–0.8 → Acidose mista (AG elevado + hiperclorêmica)
   *  0.8–2.0 → Acidose de AG elevado pura
   *  > 2.0  → Alcalose metabólica associada (HCO₃⁻ "falsamente preservado")
   *
   * Referências:
   *  - Narins RG & Emmett M, Medicine 1980
   *  - Emmett M, Narins RG. Medicine (Baltimore) 1977;56:38-54
   */
  function calcularDeltaRatio(ag, hco3) {
    var resultado = {
      calculado: false,
      deltaAG: null,
      deltaHCO3: null,
      razaoDelta: null,
      interpretacao: null,
      diagnosticosDiferenciais: []
    };

    if (ag === null || !gt(ag, AG_NORMAL)) {
      resultado.motivo = 'AG não elevado — Delta Ratio não aplicável';
      return resultado;
    }

    var deltaAG   = ag - AG_NORMAL;
    var deltaHCO3 = HCO3_NORMAL - hco3;

    if (lte(deltaHCO3, 0)) {
      // HCO₃⁻ ≥ 24 com AG elevado → fortemente sugestivo de alcalose metabólica concomitante
      resultado.calculado = true;
      resultado.deltaAG = arred(deltaAG, 1);
      resultado.deltaHCO3 = arred(deltaHCO3, 1);
      resultado.razaoDelta = null; // Divisão por zero/negativo
      resultado.interpretacao = 'HCO₃⁻ ≥ 24 com AG elevado: Alcalose Metabólica concomitante fortemente sugestiva';
      resultado.diagnosticosDiferenciais = [
        'Vômitos persistentes com cetoacidose',
        'Uso de diuréticos de alça com acidose lática',
        'Aspiração nasogástrica + sepse'
      ];
      return resultado;
    }

    var ratio = deltaAG / deltaHCO3;
    resultado.calculado = true;
    resultado.deltaAG = arred(deltaAG, 1);
    resultado.deltaHCO3 = arred(deltaHCO3, 1);
    resultado.razaoDelta = arred(ratio, 2);

    if (lt(ratio, 0.4)) {
      resultado.interpretacao = 'Razão delta < 0,4: Acidose hiperclorêmica pura predominante (sem AG elevado significativo)';
      resultado.diagnosticosDiferenciais = [
        'Diarreia grave (perda intestinal de HCO₃⁻)',
        'Acidose tubular renal (ATR tipo I, II ou IV)',
        'Infusão excessiva de SF 0,9% (acidose dilucional)',
        'Uso de Acetazolamida',
        'Fístula biliar/pancreática',
        'Derivação ureterossigmoide'
      ];
    } else if (lt(ratio, 0.8)) {
      resultado.interpretacao = 'Razão delta 0,4–0,8: Acidose mista (AG elevado + componente hiperclorêmico)';
      resultado.diagnosticosDiferenciais = [
        'Cetoacidose diabética em resolução + SF 0,9% em excesso',
        'Sepse com acidose lática + ressuscitação com cristaloides',
        'Acidose urêmica + ATR associada'
      ];
    } else if (lte(ratio, 2.0)) {
      resultado.interpretacao = 'Razão delta 0,8–2,0: Acidose de AG elevado pura';
      resultado.diagnosticosDiferenciais = [
        'Cetoacidose diabética (CAD)',
        'Acidose lática (tipo A: hipóxia/choque; tipo B: fármacos/metformina)',
        'Uremia (TFG < 15 mL/min)',
        'Intoxicação por metanol, etilenoglicol ou salicilatos (MUDPILES)',
        'Rabdomiólise severa'
      ];
    } else {
      resultado.interpretacao = 'Razão delta > 2,0: Alcalose Metabólica associada oculta';
      resultado.diagnosticosDiferenciais = [
        'Vômitos + cetoacidose diabética',
        'Uso de diuréticos tiazídicos/alça com insuficiência renal',
        'Hipovolemia com contração de volume + acidose lática'
      ];
    }

    return resultado;
  }

  // ═══════════════ PASSO 5: OXIGENAÇÃO ══════════════════════════════════════

  /**
   * Gradiente Alvéolo-Arterial (A-a):
   *   PAO₂ = FiO₂ × (Patm - PH₂O) - PaCO₂ / QR
   *   A-a  = PAO₂ - PaO₂
   *
   * Normal: A-a = 2,5 + (0,21 × idade)  — com margem de ±5
   * Elevado sugere: shunt, V/Q mismatch, difusão prejudicada
   *
   * PaO₂/FiO₂ (P/F Ratio) — Classificação de Berlim 2012:
   *   > 300: normal | 200–300: SDRA Leve | 100–200: SDRA Moderada | ≤ 100: SDRA Grave
   */
  function avaliarOxigenacao(pao2, fio2Raw, pco2, idade, altitudeMetros) {
    var resultado = {
      pfRatio: null,
      classificacaoPF: null,
      gradienteAa: null,
      gradienteAaEsperado: null,
      gradienteAaElevado: null,
      pao2Alveolar: null,
      diagnosticosShunt: [],
      avisos: []
    };

    if (pao2 === null || fio2Raw === null) return resultado;

    var fio2 = fio2Raw > 1 ? fio2Raw / 100 : fio2Raw;
    if (fio2 < 0.21 - EPS || fio2 > 1 + EPS) {
      throw new Error('FiO₂ inválida: ' + fio2Raw + '. Informar entre 21-100% ou 0,21-1,0');
    }

    // P/F Ratio
    var pf = pao2 / fio2;
    resultado.pfRatio = Math.round(pf);
    if (gt(pf, 300))      resultado.classificacaoPF = 'Oxigenação Normal (P/F > 300)';
    else if (gt(pf, 200)) resultado.classificacaoPF = 'SDRA Leve (Berlim: P/F 201–300)';
    else if (gt(pf, 100)) resultado.classificacaoPF = 'SDRA Moderada (Berlim: P/F 101–200)';
    else                  resultado.classificacaoPF = 'SDRA Grave (Berlim: P/F ≤ 100)';

    if (lte(pf, 300)) {
      resultado.avisos.push('SDRA (Berlim 2012): exige opacidades bilaterais agudas, PEEP ≥ 5 cmH₂O e exclusão de causa cardiogênica pura.');
    }

    // Gradiente A-a (requer PaCO₂)
    if (pco2 !== null) {
      var patm = 760; // mmHg ao nível do mar
      if (altitudeMetros && altitudeMetros > 0) {
        patm = 760 * Math.pow(1 - 0.0000225577 * altitudeMetros, 5.25588);
      }
      var ph2o = 47; // pressão de vapor d'água a 37°C
      var qr = 0.8;  // quociente respiratório

      var pao2Alveolar = fio2 * (patm - ph2o) - pco2 / qr;
      resultado.pao2Alveolar = arred(pao2Alveolar, 1);

      var gradAa = pao2Alveolar - pao2;
      resultado.gradienteAa = arred(gradAa, 1);

      // A-a esperado para idade (se informada)
      if (idade !== null && idade !== undefined) {
        var aaNormal = 2.5 + 0.21 * idade;
        resultado.gradienteAaEsperado = arred(aaNormal, 1);
        resultado.gradienteAaElevado = gt(gradAa, aaNormal + 5);
      } else {
        // Sem idade: considerar elevado se > 15 (corte prático em adultos jovens)
        resultado.gradienteAaElevado = gt(gradAa, 15);
      }

      if (resultado.gradienteAaElevado) {
        resultado.diagnosticosShunt = [
          'Shunt intrapulmonar (SDRA, atelectasia, PNM extensa)',
          'Alteração ventilação-perfusão (V/Q mismatch): TEP, DPOC, asma grave',
          'Déficit de difusão (fibrose pulmonar, pneumocistose, edema intersticial)',
          'Shunt intracardíaco (CIA, CIV, Foramen oval patente)'
        ];
      }
    }

    return resultado;
  }

  // ══════════════════ DETECÇÃO DE DISTÚRBIOS TRIPLOS ════════════════════════

  /**
   * Um distúrbio triplo ocorre quando:
   *  1. Há acidose de AG elevado (distúrbio base)
   *  2. A Delta Ratio revela um SEGUNDO distúrbio oculto (< 0.8 → hiperclorêmica; > 2.0 → alcalose met)
   *  3. A compensação respiratória está inadequada (→ acid. resp. ou alc. resp. como TERCEIRO componente)
   *
   * Exemplo clássico: paciente com CAD (AG elevado) + vômitos (alcalose metabólica) + DPOC (acidose respiratória)
   */
  function detectarDisturbioTriplo(disturbio, compensacao, deltaRatio) {
    var triplo = {
      detectado: false,
      componentes: [],
      descricao: null
    };

    // Distúrbio triplo requer acidose metabólica de AG elevado como base
    if (disturbio.subtipo !== 'acidose_metabolica' && disturbio.subtipo !== 'mista') return triplo;
    if (!deltaRatio.calculado) return triplo;

    var segundoDisturbio = null;
    if (deltaRatio.razaoDelta !== null) {
      if (lt(deltaRatio.razaoDelta, 0.8)) {
        segundoDisturbio = 'Acidose Hiperclorêmica (AG normal)';
      } else if (gt(deltaRatio.razaoDelta, 2.0)) {
        segundoDisturbio = 'Alcalose Metabólica oculta';
      }
    } else if (deltaRatio.interpretacao && deltaRatio.interpretacao.indexOf('Alcalose Metabólica') !== -1) {
      segundoDisturbio = 'Alcalose Metabólica oculta';
    }

    var terceiroDisturbio = null;
    if (compensacao.disturbioAssociado === 'acidose_respiratoria') {
      terceiroDisturbio = 'Acidose Respiratória (compensação inadequada)';
    } else if (compensacao.disturbioAssociado === 'alcalose_respiratoria') {
      terceiroDisturbio = 'Alcalose Respiratória (hiperventilação excessiva)';
    }

    if (segundoDisturbio && terceiroDisturbio) {
      triplo.detectado = true;
      triplo.componentes = [
        'Acidose Metabólica de AG elevado',
        segundoDisturbio,
        terceiroDisturbio
      ];
      triplo.descricao = '⚠️ DISTÚRBIO ÁCIDO-BASE TRIPLO detectado: ' + triplo.componentes.join(' + ');
    }

    return triplo;
  }

  // ═══════════════ CONSISTÊNCIA INTERNA (HENDERSON-HASSELBALCH) ═════════════

  function verificarConsistencia(ph, pco2, hco3) {
    var phCalc = 6.1 + Math.log(hco3 / (0.0307 * pco2)) / Math.LN10;
    var diff = Math.abs(phCalc - ph);
    return {
      phCalculado: arred(phCalc, 3),
      diferenca: arred(diff, 3),
      consistente: lte(diff, 0.1),
      aviso: gt(diff, 0.1)
        ? 'Inconsistência interna (pH calculado ≈ ' + fmt(phCalc, 2) + '): conferir se a amostra é arterial e se os valores foram digitados corretamente.'
        : null
    };
  }

  // ═══════════════ DIAGNÓSTICOS DIFERENCIAIS POR TIPO ═══════════════════════

  function gerarDiferenciais(disturbio, agResult, deltaResult) {
    var diferenciais = [];

    if (disturbio.flags.acMet) {
      if (agResult.calculado && agResult.elevado) {
        diferenciais.push({
          categoria: 'Acidose Metabólica com AG Elevado (MUDPILES)',
          causas: [
            'M — Metanol (intoxicação)',
            'U — Uremia (IRA/DRC estágio 5, TFG < 15)',
            'D — Cetoacidose Diabética (CAD)',
            'P — Propilenoglicol (infusão IV prolongada)',
            'I — Isoniazida / Ferro (intoxicação)',
            'L — Acidose Lática (tipo A: choque/hipóxia; tipo B: metformina, linezolida)',
            'E — Etilenoglicol (intoxicação)',
            'S — Salicilatos (AAS em dose tóxica)'
          ]
        });
      } else if (agResult.calculado && !agResult.elevado) {
        diferenciais.push({
          categoria: 'Acidose Metabólica Hiperclorêmica (AG Normal)',
          causas: [
            'Diarreia grave (perda intestinal de HCO₃⁻)',
            'Acidose Tubular Renal tipo I (distal), II (proximal) ou IV (hipercalêmica)',
            'Infusão excessiva de SF 0,9% (acidose dilucional)',
            'Acetazolamida (inibidor da anidrase carbônica)',
            'Fístula biliar, pancreática ou entérica',
            'Derivação ureterossigmoide',
            'Fase de resolução de CAD (perda renal de cetoânions)'
          ]
        });
      }
    }

    if (disturbio.flags.alMet) {
      diferenciais.push({
        categoria: 'Alcalose Metabólica',
        causas: [
          'Responsiva a Cloro (Cl urinário < 20): vômitos, SNG em aspiração, uso de diuréticos (pós)',
          'Resistente a Cloro (Cl urinário > 20): hiperaldosteronismo, Cushing, estenose de artéria renal',
          'Contração de volume (alcalose de contração)',
          'Hipocalemia grave (shift transcelular de H⁺)',
          'Síndrome de Bartter / Gitelman',
          'Ingestão excessiva de bases (síndrome leite-álcali)'
        ]
      });
    }

    if (disturbio.flags.acResp) {
      diferenciais.push({
        categoria: 'Acidose Respiratória (hipoventilação)',
        causas: [
          'DPOC exacerbado',
          'Asma grave / Status asthmaticus',
          'Obesidade + síndrome de hipoventilação (Pickwick)',
          'Fraqueza muscular respiratória (miastenia, Guillain-Barré, ELA)',
          'Depressão do SNC (opioides, benzodiazepínicos, AVC de tronco)',
          'Pneumotórax hipertensivo',
          'Derrame pleural volumoso bilateral',
          'Obstrução de via aérea superior'
        ]
      });
    }

    if (disturbio.flags.alResp) {
      diferenciais.push({
        categoria: 'Alcalose Respiratória (hiperventilação)',
        causas: [
          'Dor / ansiedade / pânico (causa mais comum)',
          'Sepse precoce (fase hiperdinâmica)',
          'Insuficiência hepática aguda (estímulo central)',
          'TEP agudo',
          'Gravidez (progesterona ↑ drive ventilatório)',
          'Intoxicação por salicilatos (fase inicial → alcalose resp mista)',
          'Ventilação mecânica excessiva (iatrogênica)',
          'Altitude elevada'
        ]
      });
    }

    return diferenciais;
  }

  // ═══════════════ SUGESTÕES DE CONDUTA BEIRA-LEITO ═════════════════════════

  function sugerirCondutas(disturbio, agResult, oxigenacao) {
    var condutas = [];

    if (disturbio.gravidade === 'CRITICA' || disturbio.gravidade === 'GRAVE') {
      condutas.push('⚠️ PRIORIDADE MÁXIMA: pH crítico — considerar UTI, monitorização contínua e gasometria seriada a cada 1-2h.');
    }

    if (disturbio.flags.acMet && agResult.calculado && agResult.elevado) {
      condutas.push('Solicitar: Lactato, Glicemia capilar/plasmática, Cetonemia/cetonúria, Função renal (Ureia/Cr), Gap osmolar (se intoxicação).');
      condutas.push('Se lactato ↑: investigar choque, hipóxia tecidual, uso de metformina, sepse.');
      condutas.push('NaHCO₃ IV considerar APENAS se pH < 7,1 com instabilidade hemodinâmica (dose parcial: 1-2 mEq/kg, reavaliar).');
    }

    if (disturbio.flags.acMet && agResult.calculado && !agResult.elevado) {
      condutas.push('Solicitar: Eletrólitos urinários (Na, K, Cl), AG urinário (Na+K-Cl), pH urinário.');
      condutas.push('AG urinário positivo → sugere ATR (defeito de acidificação renal).');
      condutas.push('AG urinário negativo → sugere perda GI de HCO₃⁻ (diarreia).');
    }

    if (disturbio.flags.alMet) {
      condutas.push('Solicitar: Cl⁻ urinário para classificar em responsiva (< 20 mEq/L) vs resistente a Cloro.');
      condutas.push('Se Cl⁻ urinário < 20: expansão com SF 0,9% + reposição de KCl.');
      condutas.push('Se Cl⁻ urinário > 20: investigar hiperaldosteronismo, Cushing.');
    }

    if (disturbio.flags.acResp) {
      condutas.push('Avaliar necessidade de VNI (BiPAP) ou IOT se sinais de falência ventilatória (rebaixamento, FR > 35, fadiga).');
      condutas.push('Reverter causas tratáveis: Naloxona (opioides), Flumazenil (BZD com cautela).');
    }

    if (oxigenacao.pfRatio !== null && lte(oxigenacao.pfRatio, 200)) {
      condutas.push('P/F ≤ 200: ventilação protetora com VT 6 mL/kg (peso predito), Pplatô ≤ 30 cmH₂O, PEEP tabela ARDSnet.');
      condutas.push('Se P/F ≤ 150: considerar posição prona por ≥ 16h e bloqueio neuromuscular precoce (cisatracúrio).');
    }

    return condutas;
  }

  // ═══════════════════════ FUNÇÃO PRINCIPAL ══════════════════════════════════

  /**
   * Análise gasométrica completa — Regra dos 5 Passos
   *
   * @param {Object} dados Objeto com os parâmetros do paciente
   * @param {number} dados.ph         pH arterial (obrigatório, 6.5–8.0)
   * @param {number} dados.pco2       PaCO₂ em mmHg (obrigatório, 5–200)
   * @param {number} dados.hco3       HCO₃⁻ em mEq/L (obrigatório, 2–70)
   * @param {number} [dados.na]       Na⁺ sérico em mEq/L (opcional, 100–200)
   * @param {number} [dados.cl]       Cl⁻ sérico em mEq/L (opcional, 60–160)
   * @param {number} [dados.albumina] Albumina sérica em g/dL (opcional, 0.5–7.0)
   * @param {number} [dados.pao2]     PaO₂ em mmHg (opcional, 10–700)
   * @param {number} [dados.fio2]     FiO₂ em % (21–100) ou decimal (0.21–1.0)
   * @param {number} [dados.idade]    Idade em anos (opcional, para A-a gradient)
   * @param {number} [dados.altitude] Altitude em metros (opcional, default: nível do mar)
   * @param {number} [dados.lactato]  Lactato arterial em mmol/L (opcional)
   * @param {number} [dados.potassio] Potássio sérico em mEq/L (opcional)
   * @returns {Object} Resultado completo da análise gasométrica
   */
  /**
   * Cálculo determinístico isolado da Fórmula de Winter (Acidose Metabólica)
   * PaCO₂ esperada = 1,5 × HCO₃⁻ + 8 (±2)
   */
  function calcularWinter(hco3) {
    var h = validarNumero(hco3, 'HCO₃⁻', 2, 70, true);
    var base = 1.5 * h + 8;
    return {
      pco2Esperada: arred(base, 1),
      minimo: arred(base - 2, 1),
      maximo: arred(base + 2, 1),
      formula: 'Winter: PaCO₂ = 1,5 × HCO₃⁻ + 8 (±2)'
    };
  }

  function analisarGasometria(dados) {
    if (!dados || typeof dados !== 'object') {
      throw new Error('Parâmetros obrigatórios não fornecidos para análise gasométrica.');
    }

    // Normalização flexível de chaves (suporte a camelCase, maiúsculas e abreviações)
    var p_ph   = dados.ph !== undefined ? dados.ph : dados.pH;
    var p_pco2 = dados.pco2 !== undefined ? dados.pco2 : (dados.paCO2 !== undefined ? dados.paCO2 : dados.pCO2);
    var p_hco3 = dados.hco3 !== undefined ? dados.hco3 : (dados.HCO3 !== undefined ? dados.HCO3 : dados.bicarbonato);
    var p_na   = dados.na !== undefined ? dados.na : (dados.Na !== undefined ? dados.Na : dados.sodio);
    var p_cl   = dados.cl !== undefined ? dados.cl : (dados.Cl !== undefined ? dados.Cl : dados.cloro);
    var p_alb  = dados.albumina !== undefined ? dados.albumina : dados.alb;
    var p_pao2 = dados.pao2 !== undefined ? dados.pao2 : (dados.paO2 !== undefined ? dados.paO2 : dados.po2);
    var p_fio2 = dados.fio2 !== undefined ? dados.fio2 : dados.FiO2;
    var p_idade = dados.idade !== undefined ? dados.idade : dados.age;
    var p_alt   = dados.altitude;
    var p_lac   = dados.lactato !== undefined ? dados.lactato : dados.lac;
    var p_k     = dados.potassio !== undefined ? dados.potassio : (dados.k !== undefined ? dados.k : dados.K);

    // Validação de entradas
    var ph    = validarNumero(p_ph,   'pH',          6.0,  8.0,  true);
    var pco2  = validarNumero(p_pco2, 'PaCO₂ (mmHg)', 5,   200,  true);
    var hco3  = validarNumero(p_hco3, 'HCO₃⁻ (mEq/L)', 2,  70,   true);
    var na    = validarNumero(p_na,   'Na⁺ (mEq/L)', 100,  200,  false);
    var cl    = validarNumero(p_cl,   'Cl⁻ (mEq/L)', 60,   160,  false);
    var alb   = validarNumero(p_alb, 'Albumina (g/dL)', 0.5, 7.0, false);
    var pao2  = validarNumero(p_pao2, 'PaO₂ (mmHg)', 10,   700,  false);
    var fio2  = validarNumero(p_fio2, 'FiO₂',        0.21, 100,  false);
    var idade = validarNumero(p_idade, 'Idade (anos)', 0,   130,  false);
    var altitude = validarNumero(p_alt, 'Altitude (m)', 0, 9000, false);
    var lactato  = validarNumero(p_lac,  'Lactato (mmol/L)', 0, 40, false);
    var potassio = validarNumero(p_k, 'K⁺ (mEq/L)', 1.0, 12.0, false);

    var avisos = [];

    // Passo 0: Consistência Henderson-Hasselbalch
    var consistencia = verificarConsistencia(ph, pco2, hco3);
    if (consistencia.aviso) avisos.push(consistencia.aviso);

    // Passo 1: Identificar distúrbio primário
    var disturbio = identificarDisturbio(ph, pco2, hco3);

    // Passo 2: Avaliar compensação
    var compensacao = avaliarCompensacao(ph, pco2, hco3, disturbio.flags);

    // Passo 3: Calcular Ânion Gap
    var agResult = calcularAnionGap(na, cl, hco3, alb);
    if (!agResult.calculado && (na !== null || cl !== null)) {
      avisos.push('Ânion Gap não calculado: informar Na e Cl juntos.');
    }

    // Passo 4: Razão Delta
    var agRef = agResult.calculado ? agResult.agReferencia : null;
    var deltaResult = calcularDeltaRatio(agRef, hco3);

    // Passo 5: Oxigenação
    var oxigenacao = avaliarOxigenacao(pao2, fio2, pco2, idade, altitude);
    avisos = avisos.concat(oxigenacao.avisos);

    // Detecção de distúrbio triplo
    var triplo = detectarDisturbioTriplo(disturbio, compensacao, deltaResult);
    if (triplo.detectado) avisos.unshift(triplo.descricao);

    // Diagnósticos diferenciais
    var diferenciais = gerarDiferenciais(disturbio, agResult, deltaResult);

    // Condutas sugeridas
    var condutas = sugerirCondutas(disturbio, agResult, oxigenacao);

    // Alertas de extremos fisiológicos (pH < 6.80)
    if (lt(ph, 6.80)) {
      avisos.unshift('🚨 ACIDEMIA EXTREMA (pH < 6.80): Limite crítico de viabilidade fisiológica. Colapso cardiovascular iminente, perda do inotropismo cardíaco e vasoplegia refratária a catecolaminas. Risco iminente de PCR. Priorizar ressuscitação ventilatória agressiva e medidas imediatas de suporte.');
      condutas.unshift('Acidemia extrema (pH < 6.80): Monitorização invasiva contínua em UTI, suporte hemodinâmico avançado e consideração de bicarbonato de sódio IV de resgate.');
    }
    if (lte(hco3, 5)) {
      avisos.push('🚨 BICARBONATO EXTREMAMENTE CONSUMIDO (≤ 5 mEq/L): Acidose metabólica severa com esgotamento da capacidade tampão.');
    }

    // Alertas extras com dados complementares
    if (lactato !== null) {
      if (gt(lactato, 4.0)) {
        avisos.push('🔴 Lactato > 4 mmol/L: hiperlactatemia grave — excluir choque, hipóxia tecidual, sepse.');
        condutas.push('Lactato > 4: ressuscitação volêmica guiada + vasopressor se hipotensão refratária. Medir lactato seriado a cada 2-4h.');
      } else if (gt(lactato, 2.0)) {
        avisos.push('🟡 Lactato 2–4 mmol/L: hiperlactatemia leve a moderada.');
      }
    }

    if (potassio !== null) {
      if (lt(potassio, 3.0)) {
        avisos.push('⚠️ Hipocalemia (K⁺ < 3,0): corrigir ANTES de administrar NaHCO₃ (risco de arritmia fatal por shift intracelular).');
      } else if (gt(potassio, 8.0)) {
        avisos.push('🚨 HIPERCALEMIA EXTREMA (K⁺ > 8,0 mEq/L): Risco iminente de parada cardíaca em assistolia/FV. Gluconato de Cálcio 10% IV IMEDIATO para estabilização de membrana miocárdica e acionamento urgente de hemodiálise de emergência.');
        condutas.push('K⁺ > 8,0 mEq/L: Gluconato de Cálcio 10% 20 mL IV em 3 min imediatamente; solução polarizante e preparo de hemodiálise.');
      } else if (gt(potassio, 6.0)) {
        avisos.push('⚠️ Hipercalemia grave (K⁺ > 6,0): ECG urgente, Gluconato de Ca²⁺ IV, insulina+glicose, nebulização com salbutamol.');
      }
    }

    // Estado de prioridade
    var critico = lt(ph, 7.20) || gt(ph, 7.60) ||
                  (oxigenacao.pfRatio !== null && lte(oxigenacao.pfRatio, 100));
    var alterado = disturbio.subtipo !== 'normal';
    var estado = critico ? 'PRIORITARIO' : (alterado ? 'ATENCAO' : 'NORMAL');

    return {
      sucesso: true,
      estado: estado,

      // Passo 1
      disturbio: disturbio.descricao,
      subtipo: disturbio.subtipo,
      gravidade: disturbio.gravidade,

      // Passo 2
      compensacao: {
        formulaUsada: compensacao.formulaUsada,
        esperadoMin: compensacao.esperadoMin,
        esperadoMax: compensacao.esperadoMax,
        valorReal: compensacao.valorReal,
        parametroAvaliado: compensacao.parametroAvaliado,
        avaliacao: compensacao.avaliacao,
        disturbioAssociado: compensacao.disturbioAssociado
      },

      // Passo 3
      anionGap: agResult.calculado ? {
        calculado: true,
        ag: agResult.anionGap,
        anionGap: agResult.anionGap,
        agCorrigido: agResult.anionGapCorrigido,
        anionGapCorrigido: agResult.anionGapCorrigido,
        elevado: agResult.elevado,
        interpretacao: agResult.interpretacao
      } : null,

      // Passo 4
      deltaRatio: deltaResult.calculado ? {
        calculado: true,
        deltaAG: deltaResult.deltaAG,
        deltaHCO3: deltaResult.deltaHCO3,
        razao: deltaResult.razaoDelta,
        razaoDelta: deltaResult.razaoDelta,
        interpretacao: deltaResult.interpretacao,
        diagnosticosDiferenciais: deltaResult.diagnosticosDiferenciais
      } : null,

      // Passo 5
      oxigenacao: {
        pfRatio: oxigenacao.pfRatio,
        classificacaoPF: oxigenacao.classificacaoPF,
        gradienteAa: oxigenacao.gradienteAa,
        gradienteAaEsperado: oxigenacao.gradienteAaEsperado,
        gradienteAaElevado: oxigenacao.gradienteAaElevado,
        pao2Alveolar: oxigenacao.pao2Alveolar
      },

      // Distúrbio triplo
      disturbioTriplo: triplo.detectado ? triplo : null,

      // Henderson-Hasselbalch
      consistencia: consistencia,

      // Diagnósticos e condutas
      diferenciais: diferenciais,
      condutas: condutas,
      avisos: avisos,

      // Valores de entrada (para rastreabilidade)
      valoresEntrada: {
        ph: ph, pco2: pco2, hco3: hco3, na: na, cl: cl,
        albumina: alb, pao2: pao2, fio2: fio2, idade: idade,
        lactato: lactato, potassio: potassio
      }
    };
  }

  // ════════════════════════ FORMATAÇÃO TELEGRAM ══════════════════════════════

  function formatarTextoTelegram(resultado) {
    var linhas = [];

    // Cabeçalho
    linhas.push('🧪 <b>GASOMETRIA ARTERIAL — ANÁLISE DE 5 PASSOS</b>');
    linhas.push('');

    // Valores de entrada
    var v = resultado.valoresEntrada;
    linhas.push('📋 <b>DADOS:</b> pH ' + fmt(v.ph, 2) + ' | PaCO₂ ' + fmt(v.pco2, 0) +
      ' mmHg | HCO₃⁻ ' + fmt(v.hco3, 0) + ' mEq/L');
    if (v.na !== null) linhas.push('   Na⁺ ' + fmt(v.na, 0) + ' | Cl⁻ ' + fmt(v.cl, 0) +
      (v.albumina !== null ? ' | Alb ' + fmt(v.albumina, 1) + ' g/dL' : ''));
    if (v.pao2 !== null) linhas.push('   PaO₂ ' + fmt(v.pao2, 0) + ' mmHg | FiO₂ ' +
      fmt(v.fio2 > 1 ? v.fio2 : v.fio2 * 100, 0) + '%');
    if (v.lactato !== null) linhas.push('   Lactato ' + fmt(v.lactato, 1) + ' mmol/L');
    linhas.push('');

    // Passo 1: Distúrbio
    var emoji = resultado.estado === 'PRIORITARIO' ? '🔴' :
                resultado.estado === 'ATENCAO' ? '🟡' : '🟢';
    linhas.push(emoji + ' <b>PASSO 1 — DISTÚRBIO PRIMÁRIO:</b>');
    linhas.push('   ' + resultado.disturbio);
    if (resultado.gravidade !== 'LEVE_OU_NORMAL') {
      linhas.push('   Gravidade: <b>' + resultado.gravidade + '</b>');
    }
    linhas.push('');

    // Passo 2: Compensação
    var comp = resultado.compensacao;
    if (comp.formulaUsada) {
      linhas.push('📐 <b>PASSO 2 — COMPENSAÇÃO:</b>');
      linhas.push('   Fórmula: ' + comp.formulaUsada);
      linhas.push('   ' + comp.parametroAvaliado + ' esperado: ' +
        fmt(comp.esperadoMin, 1) + '–' + fmt(comp.esperadoMax, 1) + ' | Real: ' +
        fmt(comp.valorReal, 1));
      linhas.push('   → ' + comp.avaliacao);
      linhas.push('');
    }

    // Passo 3: Ânion Gap
    var ag = resultado.anionGap;
    if (ag) {
      linhas.push('🔬 <b>PASSO 3 — ÂNION GAP:</b>');
      linhas.push('   AG: ' + fmt(ag.ag, 1) + ' mEq/L' +
        (ag.agCorrigido !== null ? ' | AG corrigido: ' + fmt(ag.agCorrigido, 1) + ' mEq/L' : ''));
      linhas.push('   → ' + ag.interpretacao);
      linhas.push('');
    }

    // Passo 4: Delta Ratio
    var dr = resultado.deltaRatio;
    if (dr) {
      linhas.push('📊 <b>PASSO 4 — RAZÃO DELTA (Δ/Δ):</b>');
      if (dr.razao !== null) {
        linhas.push('   ΔAG: ' + fmt(dr.deltaAG, 1) + ' | ΔHCO₃⁻: ' + fmt(dr.deltaHCO3, 1) +
          ' | Razão: ' + fmt(dr.razao, 2));
      }
      linhas.push('   → ' + dr.interpretacao);
      if (dr.diagnosticosDiferenciais && dr.diagnosticosDiferenciais.length > 0) {
        linhas.push('   <i>Pensar em:</i>');
        for (var d = 0; d < dr.diagnosticosDiferenciais.length; d++) {
          linhas.push('     • ' + dr.diagnosticosDiferenciais[d]);
        }
      }
      linhas.push('');
    }

    // Passo 5: Oxigenação
    var ox = resultado.oxigenacao;
    if (ox.pfRatio !== null) {
      linhas.push('🫁 <b>PASSO 5 — OXIGENAÇÃO:</b>');
      linhas.push('   P/F: ' + ox.pfRatio + ' → ' + ox.classificacaoPF);
      if (ox.gradienteAa !== null) {
        linhas.push('   Gradiente A-a: ' + fmt(ox.gradienteAa, 1) + ' mmHg' +
          (ox.gradienteAaEsperado !== null ? ' (esperado ≤ ' + fmt(ox.gradienteAaEsperado, 1) + ')' : ''));
        linhas.push('   → Gradiente A-a ' + (ox.gradienteAaElevado ? 'ELEVADO' : 'Normal'));
      }
      linhas.push('');
    }

    // Distúrbio triplo
    if (resultado.disturbioTriplo) {
      linhas.push('⚠️ <b>DISTÚRBIO TRIPLO DETECTADO:</b>');
      for (var t = 0; t < resultado.disturbioTriplo.componentes.length; t++) {
        linhas.push('   ' + (t + 1) + '. ' + resultado.disturbioTriplo.componentes[t]);
      }
      linhas.push('');
    }

    // Diferenciais
    if (resultado.diferenciais.length > 0) {
      linhas.push('🔍 <b>DIAGNÓSTICOS DIFERENCIAIS:</b>');
      for (var i = 0; i < resultado.diferenciais.length; i++) {
        var cat = resultado.diferenciais[i];
        linhas.push('   <b>' + cat.categoria + '</b>');
        for (var j = 0; j < cat.causas.length; j++) {
          linhas.push('     • ' + cat.causas[j]);
        }
      }
      linhas.push('');
    }

    // Condutas
    if (resultado.condutas.length > 0) {
      linhas.push('💊 <b>CONDUTAS SUGERIDAS:</b>');
      for (var c = 0; c < resultado.condutas.length; c++) {
        linhas.push('   • ' + resultado.condutas[c]);
      }
      linhas.push('');
    }

    // Avisos
    if (resultado.avisos.length > 0) {
      linhas.push('📌 <b>AVISOS:</b>');
      for (var a = 0; a < resultado.avisos.length; a++) {
        linhas.push('   • ' + resultado.avisos[a]);
      }
    }

    return linhas.join('\n');
  }

  // ═════════════════════ PARSER E TECLADOS TELEGRAM ══════════════════════════

  /**
   * Extrai e valida parâmetros gasométricos a partir de texto livre ou comando do Telegram
   * @param {string} textoInput Texto fornecido pelo médico
   * @returns {Object} Resultado estruturado do parsing e validação
   */
  function extrairParametrosGasometria(textoInput) {
    if (!textoInput || typeof textoInput !== 'string') {
      return {
        sucesso: false,
        valido: false,
        vazio: true,
        incompleto: false,
        inversaoSuspeita: false,
        mensagemInversao: null,
        parametros: null,
        informados: [],
        ausentes: ['pH', 'pCO2', 'HCO3'],
        erro: 'Nenhum parâmetro fornecido.'
      };
    }

    var limpo = textoInput
      .replace(/^\/(?:gaso(?:metria)?|aniongap|gaso_calc)\b/i, '')
      .replace(/^(?:gasometria\s*(?:arterial)?|gaso|anion\s*gap)\s*[:=]?\s*/i, '')
      .trim();

    if (!limpo) {
      return {
        sucesso: false,
        valido: false,
        vazio: true,
        incompleto: false,
        inversaoSuspeita: false,
        mensagemInversao: null,
        parametros: null,
        informados: [],
        ausentes: ['pH', 'pCO2', 'HCO3'],
        erro: 'Texto vazio após remoção do comando.'
      };
    }

    function extrairNumero(re, t) {
      var m = t.match(re);
      if (!m) return null;
      var raw = m[1] !== undefined ? m[1] : m[0];
      var numStr = String(raw).replace(',', '.');
      var val = parseFloat(numStr);
      return Number.isFinite(val) ? val : null;
    }

    // 1. Extração por rótulos/chaves explícitas
    var g_ph = extrairNumero(/\bph\s*[:=]?\s*([0-9]+[.,]?[0-9]*)/i, limpo);
    var g_pco2 = extrairNumero(/\b(?:p?a?co2|pa\s*co2|co2)\s*[:=]?\s*([0-9]+[.,]?[0-9]*)/i, limpo);
    var g_hco3 = extrairNumero(/\b(?:hco3[-–]?|bicarb(?:onato)?|bic)\s*[:=]?\s*([0-9]+[.,]?[0-9]*)/i, limpo);
    var g_na = extrairNumero(/\b(?:na\+?|s[oó]dio|natremia)\s*[:=]?\s*([0-9]+[.,]?[0-9]*)/i, limpo);
    var g_cl = extrairNumero(/\b(?:cl[-–]?|cloro|cloremia)\s*[:=]?\s*([0-9]+[.,]?[0-9]*)/i, limpo);
    var g_alb = extrairNumero(/\b(?:alb(?:umina)?|albu)\s*[:=]?\s*([0-9]+[.,]?[0-9]*)/i, limpo);
    var g_pao2 = extrairNumero(/\b(?:p?a?o2|pa\s*o2|oxig[eê]nio)\s*[:=]?\s*([0-9]+[.,]?[0-9]*)/i, limpo);
    var g_fio2 = extrairNumero(/\b(?:fi\s*o2|fio2)\s*[:=]?\s*([0-9]+[.,]?[0-9]*)\s*%?/i, limpo);
    var g_lac = extrairNumero(/\b(?:lact(?:ato)?|[aá]cido\s+l[aá]tico)\s*[:=]?\s*([0-9]+[.,]?[0-9]*)/i, limpo);
    var g_k = extrairNumero(/\b(?:pot[aá]ssio|k\+?)\s*[:=]?\s*([0-9]+[.,]?[0-9]*)/i, limpo);
    var g_idade = extrairNumero(/\b(?:idade|anos)[:=]?\s*([0-9]+)|([0-9]+)\s*(?:anos|a\b)/i, limpo);

    // 2. Extração posicional inteligente se faltarem rótulos de pH, pCO2 ou HCO3
    if (g_ph === null || g_pco2 === null || g_hco3 === null) {
      var tokensNumericos = [];
      var regexNum = /([0-9]+(?:[.,][0-9]+)?)/g;
      var match;
      while ((match = regexNum.exec(limpo)) !== null) {
        tokensNumericos.push(parseFloat(match[1].replace(',', '.')));
      }

      if (tokensNumericos.length >= 3 && (g_ph === null && g_pco2 === null && g_hco3 === null)) {
        var t0 = tokensNumericos[0];
        var t1 = tokensNumericos[1];
        var t2 = tokensNumericos[2];

        // Ordem clássica beira-leito: [pH, pCO2, HCO3]
        if (t0 >= 6.0 && t0 <= 8.0 && t1 >= 5 && t1 <= 200 && t2 >= 2 && t2 <= 70) {
          g_ph = t0;
          g_pco2 = t1;
          g_hco3 = t2;

          if (tokensNumericos.length >= 4) {
            var t3 = tokensNumericos[3];
            if (t3 >= 100 && t3 <= 200 && g_na === null) {
              g_na = t3;
            } else if (t3 >= 10 && t3 <= 700 && g_pao2 === null) {
              g_pao2 = t3;
            }
          }
          if (tokensNumericos.length >= 5) {
            var t4 = tokensNumericos[4];
            if (t4 >= 60 && t4 <= 160 && g_cl === null) {
              g_cl = t4;
            } else if (t4 >= 0.21 && t4 <= 100 && g_fio2 === null) {
              g_fio2 = t4;
            }
          }
          if (tokensNumericos.length >= 6) {
            var t5 = tokensNumericos[5];
            if (t5 >= 0.5 && t5 <= 7.0 && g_alb === null) {
              g_alb = t5;
            }
          }
        }
      }
    }

    // 3. Detecção de inversão de digitação comum (ex: pH 25, pCO2 7.20)
    var inversaoSuspeita = false;
    var msgInversao = null;
    if (g_ph !== null && g_pco2 !== null) {
      if ((g_ph > 8.0 || g_ph < 6.0) && (g_pco2 >= 6.8 && g_pco2 <= 7.8)) {
        inversaoSuspeita = true;
        msgInversao = 'Valores aparentemente invertidos: pH informado como ' + g_ph + ' e pCO2 como ' + g_pco2 + '. Corrigindo para pH ' + g_pco2 + ' e pCO2 ' + g_ph + '.';
        var tmp = g_ph;
        g_ph = g_pco2;
        g_pco2 = tmp;
      }
    }

    // 4. Verificação de completude
    var informados = [];
    var ausentes = [];
    if (g_ph !== null) informados.push('pH ' + g_ph); else ausentes.push('pH');
    if (g_pco2 !== null) informados.push('pCO2 ' + g_pco2); else ausentes.push('pCO2');
    if (g_hco3 !== null) informados.push('HCO3 ' + g_hco3); else ausentes.push('HCO3');

    if (g_na !== null) informados.push('Na ' + g_na);
    if (g_cl !== null) informados.push('Cl ' + g_cl);
    if (g_alb !== null) informados.push('Alb ' + g_alb);
    if (g_pao2 !== null) informados.push('PaO2 ' + g_pao2);
    if (g_fio2 !== null) informados.push('FiO2 ' + g_fio2);
    if (g_lac !== null) informados.push('Lactato ' + g_lac);
    if (g_k !== null) informados.push('K ' + g_k);

    var incompleto = (g_ph === null || g_pco2 === null || g_hco3 === null);

    if (incompleto) {
      return {
        sucesso: false,
        valido: false,
        vazio: false,
        incompleto: true,
        inversaoSuspeita: inversaoSuspeita,
        mensagemInversao: msgInversao,
        informados: informados,
        ausentes: ausentes,
        parametros: {
          ph: g_ph,
          pco2: g_pco2,
          hco3: g_hco3,
          na: g_na,
          cl: g_cl,
          albumina: g_alb,
          pao2: g_pao2,
          fio2: g_fio2,
          lactato: g_lac,
          potassio: g_k,
          idade: g_idade
        },
        erro: 'Gasometria incompleta. Parâmetros obrigatórios ausentes: ' + ausentes.join(', ') + '.'
      };
    }

    // 5. Validação de faixas de viabilidade biológica
    if (g_ph < 6.0 || g_ph > 8.0) {
      return {
        sucesso: false,
        valido: false,
        vazio: false,
        incompleto: false,
        inversaoSuspeita: false,
        mensagemInversao: null,
        informados: informados,
        ausentes: [],
        parametros: null,
        erro: 'pH fora dos limites de sobrevivência humana viável (6.0 a 8.0): ' + g_ph
      };
    }
    if (g_pco2 < 5 || g_pco2 > 200) {
      return {
        sucesso: false,
        valido: false,
        vazio: false,
        incompleto: false,
        inversaoSuspeita: false,
        mensagemInversao: null,
        informados: informados,
        ausentes: [],
        parametros: null,
        erro: 'PaCO2 fora dos limites fisiológicos compatíveis (5 a 200 mmHg): ' + g_pco2
      };
    }
    if (g_hco3 < 2 || g_hco3 > 70) {
      return {
        sucesso: false,
        valido: false,
        vazio: false,
        incompleto: false,
        inversaoSuspeita: false,
        mensagemInversao: null,
        informados: informados,
        ausentes: [],
        parametros: null,
        erro: 'HCO3 fora dos limites fisiológicos compatíveis (2 a 70 mEq/L): ' + g_hco3
      };
    }

    return {
      sucesso: true,
      valido: true,
      vazio: false,
      incompleto: false,
      inversaoSuspeita: inversaoSuspeita,
      mensagemInversao: msgInversao,
      informados: informados,
      ausentes: [],
      parametros: {
        ph: g_ph,
        pco2: g_pco2,
        hco3: g_hco3,
        na: g_na,
        cl: g_cl,
        albumina: g_alb,
        pao2: g_pao2,
        fio2: g_fio2,
        lactato: g_lac,
        potassio: g_k,
        idade: g_idade
      },
      erro: null
    };
  }

  /**
   * Gera teclados inline interativos adaptados para o bot do Telegram
   */
  function obterTecladoInlineGasometria(modo, opcoes) {
    opcoes = opcoes || {};
    if (modo === 'inicial' || modo === 'ajuda' || modo === 'incompleto') {
      return {
        inline_keyboard: [
          [
            { text: "🚨 CAD (Winter)", callback_data: "ux:gaso:pre:cad" },
            { text: "🫁 DPOC (Acidose Resp)", callback_data: "ux:gaso:pre:dpoc" }
          ],
          [
            { text: "⚡ Sepse (Choque Lático)", callback_data: "ux:gaso:pre:sepse" },
            { text: "🤮 Vômitos (Alcalose Met)", callback_data: "ux:gaso:pre:vomitos" }
          ],
          [
            { text: "🌪️ Ansiedade/TEP (Alcalose Resp)", callback_data: "ux:gaso:pre:alcaloseresp" },
            { text: "📐 Fórmula de Winter", callback_data: "ux:gaso:winter" }
          ],
          [
            { text: "🔙 Voltar ao Menu", callback_data: "ux:menu" },
            { text: "🏠 Início", callback_data: "ux:hub:inicio" }
          ]
        ]
      };
    }

    if (modo === 'winter') {
      return {
        inline_keyboard: [
          [
            { text: "HCO₃⁻ 8", callback_data: "ux:gaso:winter:calc:8" },
            { text: "HCO₃⁻ 10", callback_data: "ux:gaso:winter:calc:10" },
            { text: "HCO₃⁻ 12", callback_data: "ux:gaso:winter:calc:12" }
          ],
          [
            { text: "HCO₃⁻ 14", callback_data: "ux:gaso:winter:calc:14" },
            { text: "HCO₃⁻ 16", callback_data: "ux:gaso:winter:calc:16" },
            { text: "HCO₃⁻ 18", callback_data: "ux:gaso:winter:calc:18" }
          ],
          [
            { text: "🩸 Gasometria Completa (5 Passos)", callback_data: "ux:iniciar:gaso" },
            { text: "🔙 Voltar", callback_data: "ux:hub:sala" }
          ]
        ]
      };
    }

    if (modo === 'resultado') {
      var linhas = [];
      var cacheKey = opcoes.cacheKey;
      var btnCopiar;
      if (cacheKey) {
        btnCopiar = { text: "📋 Copiar Laudo PEP", callback_data: "ux:copiar:" + cacheKey };
      } else {
        btnCopiar = { text: "🔄 Novo Cálculo", callback_data: "ux:iniciar:gaso" };
      }

      linhas.push([
        btnCopiar,
        { text: "🔄 Novo Cálculo", callback_data: "ux:iniciar:gaso" }
      ]);

      if (opcoes.temAcidoseMetabolica) {
        linhas.push([
          { text: "📐 Ver Compensação de Winter", callback_data: "ux:gaso:winter" }
        ]);
      }

      linhas.push([
        { text: "🚨 Sala Vermelha", callback_data: "ux:hub:sala" },
        { text: "🏠 Início", callback_data: "ux:hub:inicio" }
      ]);

      return { inline_keyboard: linhas };
    }

    return null;
  }

  /**
   * Retorna cenários clínicos clássicos predefinidos para agilidade beira-leito
   */
  function obterExemploGasometriaPredefinido(id) {
    var exemplos = {
      cad: {
        id: 'cad',
        titulo: 'Cetoacidose Diabética (CAD)',
        subtitulo: 'Acidose Metabólica com AG Elevado e Resposta de Winter Adequada',
        texto: 'pH 7.20, pCO2 23, HCO3 10, Na 140, Cl 105, Alb 4.0',
        parametros: { ph: 7.20, pco2: 23, hco3: 10, na: 140, cl: 105, albumina: 4.0 }
      },
      dpoc: {
        id: 'dpoc',
        titulo: 'DPOC Exacerbado / Retenção Crônica',
        subtitulo: 'Acidose Respiratória com Compensação Renal Crônica',
        texto: 'pH 7.32, pCO2 62, HCO3 31, PaO2 55, FiO2 24%',
        parametros: { ph: 7.32, pco2: 62, hco3: 31, pao2: 55, fio2: 24 }
      },
      sepse: {
        id: 'sepse',
        titulo: 'Choque Séptico / Hiperlactatemia',
        subtitulo: 'Acidose Lática Grave com Winter Adequado e Alerta de Choque',
        texto: 'pH 7.25, pCO2 28, HCO3 12, Na 138, Cl 102, Lactato 4.8',
        parametros: { ph: 7.25, pco2: 28, hco3: 12, na: 138, cl: 102, lactato: 4.8 }
      },
      vomitos: {
        id: 'vomitos',
        titulo: 'Vômitos Volumosos / Perdas Gástricas',
        subtitulo: 'Alcalose Metabólica Hipoclorêmica e Hipocalêmica por Perda de HCl',
        texto: 'pH 7.52, pCO2 48, HCO3 38, Na 137, Cl 88, K 2.8',
        parametros: { ph: 7.52, pco2: 48, hco3: 38, na: 137, cl: 88, potassio: 2.8 }
      },
      alcaloseresp: {
        id: 'alcaloseresp',
        titulo: 'Crise de Pânico / Hiperventilação / TEP',
        subtitulo: 'Alcalose Respiratória Aguda Pura',
        texto: 'pH 7.55, pCO2 24, HCO3 21, PaO2 95, FiO2 21%',
        parametros: { ph: 7.55, pco2: 24, hco3: 21, pao2: 95, fio2: 21 }
      }
    };
    return exemplos[id] || null;
  }

  // ════════════════════════ API PÚBLICA ══════════════════════════════════════

  var publico = {
    analisarGasometria: analisarGasometria,
    formatarTextoTelegram: formatarTextoTelegram,

    // Parser e Teclados Interativos Beira-Leito
    extrairParametrosGasometria: extrairParametrosGasometria,
    obterTecladoInlineGasometria: obterTecladoInlineGasometria,
    obterExemploGasometriaPredefinido: obterExemploGasometriaPredefinido,

    // Funções individuais expostas para testes unitários
    calcularWinter: calcularWinter,
    identificarDisturbio: identificarDisturbio,
    avaliarCompensacao: avaliarCompensacao,
    calcularAnionGap: calcularAnionGap,
    calcularDeltaRatio: calcularDeltaRatio,
    avaliarOxigenacao: avaliarOxigenacao,
    detectarDisturbioTriplo: detectarDisturbioTriplo,
    verificarConsistencia: verificarConsistencia,
    gerarDiferenciais: gerarDiferenciais,
    sugerirCondutas: sugerirCondutas
  };

  return publico;
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GasometriaAcidoBaseService;
}
