/**
 * @file 02_hepatologia_colestase_gestacional.js
 * @description Módulo de Hepatologia & Emergência Obstétrica: Colestase Intra-hepática
 * da Gestação (CIG) e Esteatose Hepática Aguda da Gestação (EHAG / AFLP).
 *
 * Fontes (rastreabilidade clínica):
 *  - RCOG Green-top Guideline No. 43: Obstetric Cholestasis (2024 revision).
 *  - SMFM Consult Series #53: Intrahepatic Cholestasis of Pregnancy (2021, atualização 2024).
 *  - Ovadia C et al. Association of adverse perinatal outcomes of ICP with biochemical markers:
 *    results of aggregate and individual patient data meta-analyses. Lancet 2019;393:899-909.
 *  - ACOG Practice Bulletin: Liver Disease in Pregnancy (2022).
 *  - Ch'ng CL et al. Prospective study of liver dysfunction in pregnancy in Southwest Wales.
 *    Gut 2002;51:876-880 (Critérios de Swansea para EHAG).
 *  - Knight M et al. A prospective national study of AFLP in the UK.
 *    Gut 2008;57:951-956 (validação Swansea).
 *  - FEBRASGO — Protocolo de Hepatopatias na Gestação (2024).
 *  - AASLD Position Statement: Liver Disease in Pregnancy (Terrault NA et al., Hepatology 2021).
 *
 * Escopo:
 *  - Estratificação de gravidade da CIG por ácidos biliares totais séricos (ABT).
 *  - Posologia ponderada de Ácido Ursodesoxicólico (UDCA) como 1ª linha.
 *  - Programação do momento ideal do parto (delivery timing).
 *  - Critérios de Swansea para diagnóstico clínico de EHAG/AFLP.
 *  - Protocolo de estabilização pré-parto na EHAG.
 *  - Diagnóstico diferencial entre CIG, EHAG, pré-eclâmpsia/HELLP.
 */

var HepatologiaColestaseGestacionalService = (function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. CONSTANTES CLÍNICAS — CIG (Colestase Intra-hepática da Gestação)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Estratificação por ácidos biliares totais séricos (mcmol/L).
   * - Leve: 10-39 mcmol/L
   * - Moderada: 40-99 mcmol/L (risco fetal significativo: parto precoce pode ser necessário)
   * - Grave: >= 100 mcmol/L (risco de óbito fetal súbito — Lancet 2019 meta-análise)
   *
   * Ponto de corte diagnóstico: >= 19 mcmol/L em jejum (RCOG) ou >= 10 mcmol/L (SMFM).
   * Este módulo utiliza >= 10 mcmol/L como limiar diagnóstico para maximizar sensibilidade.
   */
  var FAIXAS_ABT = {
    NORMAL:   { min: 0,   max: 9,   gravidade: 'NORMAL',   risco_fetal: 'Populacionamento basal' },
    LEVE:     { min: 10,  max: 39,  gravidade: 'LEVE',     risco_fetal: 'Baixo (OR natimorto ~1,0-1,5)' },
    MODERADA: { min: 40,  max: 99,  gravidade: 'MODERADA', risco_fetal: 'Intermediário (OR natimorto ~1,5-2,5)' },
    GRAVE:    { min: 100, max: Infinity, gravidade: 'GRAVE', risco_fetal: 'Elevado (OR natimorto ~3,4; risco ~3,44% — Ovadia Lancet 2019)' }
  };

  /**
   * Programação do parto conforme gravidade bioquímica (Timing of delivery).
   * Baseado em SMFM 2021/2024, RCOG 2024, FEBRASGO 2024.
   */
  var TIMING_PARTO = {
    LEVE:     { ig_semanas: 38, ig_texto: '38+0 a 39+0 semanas', justificativa: 'CIG leve (ABT 10-39): risco fetal discretamente elevado, equilibrar prematuridade iatrogênica.' },
    MODERADA: { ig_semanas: 37, ig_texto: '37+0 a 38+0 semanas', justificativa: 'CIG moderada (ABT 40-99): risco fetal significativo; parto precoce justificado.' },
    GRAVE:    { ig_semanas: 36, ig_texto: '36+0 a 37+0 semanas', justificativa: 'CIG grave (ABT >= 100): risco de óbito fetal súbito sem aviso cardiotocográfico (Ovadia Lancet 2019). NÃO postergar além de 37 semanas.' }
  };

  // Dose terapêutica de UDCA: 10-15 mg/kg/dia, dividida em 2-3 tomadas.
  var UDCA_DOSE_MIN_MG_KG = 10;
  var UDCA_DOSE_MAX_MG_KG = 15;
  var UDCA_DOSE_ABS_MAX_MG = 2000; // Dose máxima absoluta por dia

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CONSTANTES CLÍNICAS — EHAG (Esteatose Hepática Aguda da Gestação)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Critérios de Swansea (Ch'ng et al., Gut 2002; Knight et al., Gut 2008).
   * Diagnóstico: >= 6 critérios presentes, na ausência de outra etiologia.
   */
  var CRITERIOS_SWANSEA = [
    { id: 'vomitos',           descricao: 'Vômitos',                         categoria: 'clínico' },
    { id: 'dor_abdominal',     descricao: 'Dor abdominal (epigástrica ou HCD)', categoria: 'clínico' },
    { id: 'polidipsia_poliuria', descricao: 'Polidipsia / Poliúria',         categoria: 'clínico' },
    { id: 'encefalopatia',     descricao: 'Encefalopatia hepática',          categoria: 'clínico' },
    { id: 'bilirrubina_elevada', descricao: 'Bilirrubina elevada (> 0,8 mg/dL ou > 14 µmol/L)', categoria: 'laboratorial' },
    { id: 'hipoglicemia',      descricao: 'Hipoglicemia (< 72 mg/dL ou < 4 mmol/L)', categoria: 'laboratorial' },
    { id: 'acido_urico_elevado', descricao: 'Ácido úrico elevado (> 5,7 mg/dL ou > 340 µmol/L)', categoria: 'laboratorial' },
    { id: 'leucocitose',       descricao: 'Leucocitose (> 11.000/mm³)',      categoria: 'laboratorial' },
    { id: 'ascite_usg',        descricao: 'Ascite ou fígado brilhante na USG', categoria: 'imagem' },
    { id: 'transaminases_elevadas', descricao: 'Transaminases elevadas (AST ou ALT > 42 UI/L)', categoria: 'laboratorial' },
    { id: 'amonia_elevada',    descricao: 'Amônia elevada (> 47 µmol/L)',    categoria: 'laboratorial' },
    { id: 'insuf_renal',       descricao: 'Insuficiência renal (creatinina > 1,7 mg/dL ou > 150 µmol/L)', categoria: 'laboratorial' },
    { id: 'coagulopatia',      descricao: 'Coagulopatia (TP > 14s ou TTPa > 34s)',  categoria: 'laboratorial' },
    { id: 'esteatose_biopsia', descricao: 'Esteatose microvesicular na biópsia hepática', categoria: 'histológico' }
  ];

  var SWANSEA_LIMIAR = 6; // >= 6 critérios = diagnóstico de EHAG

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. REFERÊNCIAS BIBLIOGRÁFICAS
  // ═══════════════════════════════════════════════════════════════════════════

  var REFERENCIAS = [
    'RCOG Green-top Guideline No. 43: Obstetric Cholestasis (2024).',
    'SMFM Consult Series #53: ICP (2021, atualização 2024).',
    'Ovadia C et al. Lancet 2019;393:899-909 (meta-análise ABT e desfecho perinatal).',
    'ACOG Practice Bulletin: Liver Disease in Pregnancy (2022).',
    "Ch'ng CL et al. Gut 2002;51:876-880 (Critérios de Swansea para EHAG).",
    'Knight M et al. Gut 2008;57:951-956 (validação prospectiva dos critérios de Swansea).',
    'FEBRASGO — Protocolo de Hepatopatias na Gestação (2024).',
    'Terrault NA et al. Hepatology 2021 (AASLD Position Statement: Liver Disease in Pregnancy).'
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. FUNÇÕES — CIG
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Classifica a gravidade da CIG com base nos ácidos biliares totais séricos.
   * @param {number} abt - Ácidos biliares totais séricos (mcmol/L).
   * @returns {{ gravidade: string, faixa: object, timing_parto: object|null }}
   */
  function classificarGravidadeCIG(abt) {
    if (typeof abt !== 'number' || isNaN(abt) || abt < 0) {
      throw new Error('Ácidos biliares totais (ABT) devem ser um número >= 0.');
    }

    if (abt < 10) {
      return { gravidade: 'NORMAL', faixa: FAIXAS_ABT.NORMAL, timing_parto: null };
    }
    if (abt <= 39) {
      return { gravidade: 'LEVE', faixa: FAIXAS_ABT.LEVE, timing_parto: TIMING_PARTO.LEVE };
    }
    if (abt <= 99) {
      return { gravidade: 'MODERADA', faixa: FAIXAS_ABT.MODERADA, timing_parto: TIMING_PARTO.MODERADA };
    }
    return { gravidade: 'GRAVE', faixa: FAIXAS_ABT.GRAVE, timing_parto: TIMING_PARTO.GRAVE };
  }

  /**
   * Calcula a posologia ponderada de Ácido Ursodesoxicólico (UDCA).
   * @param {number} peso - Peso corporal em kg.
   * @returns {{ dose_min_mg: number, dose_max_mg: number, dose_diaria_texto: string, posologia: string }}
   */
  function calcularDoseUDCA(peso) {
    if (typeof peso !== 'number' || isNaN(peso) || peso <= 0) {
      throw new Error('Peso deve ser um número positivo em kg.');
    }

    var doseMin = Math.round(peso * UDCA_DOSE_MIN_MG_KG);
    var doseMax = Math.round(peso * UDCA_DOSE_MAX_MG_KG);

    // Aplicar teto absoluto
    if (doseMin > UDCA_DOSE_ABS_MAX_MG) doseMin = UDCA_DOSE_ABS_MAX_MG;
    if (doseMax > UDCA_DOSE_ABS_MAX_MG) doseMax = UDCA_DOSE_ABS_MAX_MG;

    // Arredondar para múltiplos de 50mg (apresentação comercial: cáps 150mg, 300mg)
    var doseMinArredondada = Math.round(doseMin / 50) * 50;
    var doseMaxArredondada = Math.round(doseMax / 50) * 50;

    // Calcular número de tomadas (geralmente 2-3x/dia)
    // Dose prática: preferência por divisão em 2x se dose <= 900mg, 3x se > 900mg
    var numTomadas = doseMaxArredondada > 900 ? 3 : 2;
    var dosePorTomada = Math.round(doseMaxArredondada / numTomadas / 50) * 50;

    return {
      dose_min_mg: doseMinArredondada,
      dose_max_mg: doseMaxArredondada,
      dose_diaria_texto: doseMinArredondada + ' a ' + doseMaxArredondada + ' mg/dia',
      posologia: dosePorTomada + ' mg VO a cada ' + (numTomadas === 2 ? '12h (2x/dia)' : '8h (3x/dia)'),
      num_tomadas: numTomadas,
      dose_por_tomada_mg: dosePorTomada,
      apresentacao: 'Comprimidos/cápsulas de 150 mg ou 300 mg'
    };
  }

  /**
   * Avaliação completa de CIG — estratificação, tratamento e plano de parto.
   * @param {object} params - Parâmetros clínicos.
   * @param {number} params.acidos_biliares - Ácidos biliares totais séricos (mcmol/L).
   * @param {number} [params.peso] - Peso corporal em kg (para cálculo de UDCA).
   * @param {number} [params.ig_semanas] - Idade gestacional em semanas completas.
   * @param {number} [params.ig_dias] - Dias adicionais da IG.
   * @param {boolean} [params.prurido] - Prurido presente.
   * @param {number} [params.tgo] - TGO/AST (UI/L).
   * @param {number} [params.tgp] - TGP/ALT (UI/L).
   * @param {number} [params.bilirrubina_total] - Bilirrubina total (mg/dL).
   * @param {boolean} [params.antecedente_cig] - CIG em gestação prévia.
   * @param {boolean} [params.gestacao_gemelar] - Gestação gemelar.
   * @returns {object} Análise completa com classificação, tratamento e plano.
   */
  function avaliarCIG(params) {
    if (!params || typeof params.acidos_biliares !== 'number') {
      throw new Error('O parâmetro "acidos_biliares" (mcmol/L) é obrigatório para avaliação de CIG.');
    }

    var abt = params.acidos_biliares;
    var classificacao = classificarGravidadeCIG(abt);

    var ig = null;
    if (params.ig_semanas != null) {
      var sem = parseInt(params.ig_semanas, 10);
      var dias = params.ig_dias ? parseInt(params.ig_dias, 10) : 0;
      ig = { semanas: sem, dias: dias, texto: sem + 's' + (dias > 0 ? dias + 'd' : '') };
    }

    var resultado = {
      diagnostico: 'COLESTASE_INTRAHEPATICA_GESTACIONAL',
      acidos_biliares_mcmol: abt,
      classificacao: classificacao,
      ig: ig,
      tratamento: null,
      vigilancia: null,
      parto: null,
      alertas: [],
      bloqueios_seguranca: [],
      diagnostico_diferencial: [],
      referencias: REFERENCIAS.slice()
    };

    // Se ABT < 10, não confirma CIG
    if (classificacao.gravidade === 'NORMAL') {
      resultado.diagnostico = 'NAO_CONFIRMADO';
      resultado.alertas.push('⚠️ ABT < 10 mcmol/L: CIG não confirmada. Considerar diagnósticos diferenciais de prurido gestacional (dermatose gestacional, dermatite alérgica, hepatites virais).');
      resultado.alertas.push('💡 Repetir dosagem em 1-2 semanas se prurido persistir (sensibilidade dos ABT é tempo-dependente).');
      return resultado;
    }

    // ── Tratamento ──
    var tratamento = {
      farmacologico: [],
      nao_farmacologico: []
    };

    // UDCA
    if (params.peso) {
      var doseUDCA = calcularDoseUDCA(params.peso);
      tratamento.farmacologico.push({
        farmaco: 'Ácido Ursodesoxicólico (UDCA)',
        linha: '1ª linha',
        dose: doseUDCA.dose_diaria_texto,
        posologia: doseUDCA.posologia,
        apresentacao: doseUDCA.apresentacao,
        observacao: 'Iniciar e titular até dose máxima tolerada. Melhora do prurido em 1-2 semanas. Pode não reduzir risco de natimorto (PITCHES trial), mas reduz ABT e melhora sintomas maternos.'
      });
    } else {
      tratamento.farmacologico.push({
        farmaco: 'Ácido Ursodesoxicólico (UDCA)',
        linha: '1ª linha',
        dose: '10-15 mg/kg/dia (informar peso para cálculo exato)',
        posologia: 'Dividido em 2-3 tomadas diárias',
        apresentacao: 'Comprimidos/cápsulas de 150 mg ou 300 mg',
        observacao: 'Iniciar e titular até dose máxima tolerada (máx 2000 mg/dia).'
      });
    }

    // Anti-histamínicos para prurido (2ª linha sintomática)
    tratamento.farmacologico.push({
      farmaco: 'Hidroxizina',
      linha: 'Adjuvante (prurido)',
      dose: '25 mg VO à noite',
      observacao: 'Uso noturno para alívio do prurido refratário ao UDCA. Evitar no 3º trimestre próximo ao parto (sedação neonatal).'
    });

    // Medidas não farmacológicas
    tratamento.nao_farmacologico.push('Hidratante corporal emoliente (sem fragrância) para alívio sintomático do prurido.');
    tratamento.nao_farmacologico.push('Banhos mornos (evitar quentes, pioram prurido).');
    tratamento.nao_farmacologico.push('Roupas de algodão folgadas.');

    resultado.tratamento = tratamento;

    // ── Vigilância ──
    var vigilancia = {
      laboratorial: 'ABT séricos semanais até o parto (monitorar progressão para faixa grave).',
      hepatica: 'TGO, TGP, bilirrubinas e coagulograma semanal.',
      fetal: 'Cardiotocografia (CTG) 2x/semana a partir de 32 semanas.',
      nota: '⚠️ A CTG NÃO previne óbito fetal súbito na CIG grave. O parto programado é a principal intervenção para reduzir risco.'
    };

    if (classificacao.gravidade === 'GRAVE') {
      vigilancia.fetal = 'CTG diária. Internação para monitorização intensiva a partir de 34 semanas.';
      vigilancia.laboratorial = 'ABT séricos 2x/semana. Coagulograma 2x/semana (risco de coagulopatia por má absorção de vitamina K).';
    }

    resultado.vigilancia = vigilancia;

    // ── Parto ──
    if (classificacao.timing_parto) {
      var parto = {
        ig_alvo_semanas: classificacao.timing_parto.ig_semanas,
        ig_alvo_texto: classificacao.timing_parto.ig_texto,
        justificativa: classificacao.timing_parto.justificativa,
        via_parto: 'Via obstétrica habitual (indução do trabalho de parto é preferida).',
        parto_indicado_agora: false
      };

      // Verificar se IG atual já atingiu o alvo
      if (ig && ig.semanas >= parto.ig_alvo_semanas) {
        parto.parto_indicado_agora = true;
      }

      // Corticoide antenatal
      parto.corticoide = { indicado: false };
      if (ig && ig.semanas >= 24 && ig.semanas < 37) {
        // Se parto previsto em <= 7 dias e < 34+6 semanas
        if (ig.semanas < 37 && classificacao.timing_parto.ig_semanas - ig.semanas <= 1) {
          parto.corticoide = {
            indicado: true,
            esquema: 'Betametasona 12 mg IM a cada 24h (2 doses) OU Dexametasona 6 mg IM a cada 12h (4 doses).',
            observacao: 'Maturação pulmonar fetal. Administrar se parto previsto em < 7 dias e IG 24-36+6 semanas (ALPS trial).'
          };
        }
      }

      // Vitamina K
      if (classificacao.gravidade === 'GRAVE') {
        parto.vitamina_k = {
          indicada: true,
          dose: 'Vitamina K1 (Fitomenadiona) 10 mg IM/IV pré-parto.',
          justificativa: 'CIG grave causa má absorção de vitamina K por redução de sais biliares no intestino, aumentando risco de coagulopatia materna e hemorragia pós-parto.'
        };
      }

      resultado.parto = parto;
    }

    // ── Alertas ──
    if (params.antecedente_cig) {
      resultado.alertas.push('🔄 Antecedente de CIG em gestação prévia: risco de recorrência de 45-90%.');
    }
    if (params.gestacao_gemelar) {
      resultado.alertas.push('👶👶 Gestação gemelar: risco aumentado de CIG (maior carga hormonal placentária).');
    }
    if (classificacao.gravidade === 'GRAVE') {
      resultado.alertas.push('🚨 CIG GRAVE (ABT >= 100 mcmol/L): Risco de natimorto de ~3,44% (Ovadia Lancet 2019). O parto é a principal intervenção de proteção fetal.');
      resultado.alertas.push('⚠️ CTG NÃO é preditiva de óbito fetal na CIG grave. O evento é frequentemente SÚBITO e sem sinais premonitórios cardiotocográficos.');
    }
    if (params.tgo && params.tgo > 200) {
      resultado.alertas.push('🔬 TGO > 200 UI/L: Excluir hepatites virais agudas (HAV, HBV, HCV, HEV) e EHAG/AFLP.');
    }
    if (params.bilirrubina_total && params.bilirrubina_total > 2.0) {
      resultado.alertas.push('🟡 Bilirrubina > 2,0 mg/dL é incomum na CIG isolada. Investigar EHAG, HELLP ou obstrução biliar.');
    }

    // ── Diagnóstico diferencial ──
    resultado.diagnostico_diferencial = [
      'EHAG / AFLP (Esteatose Hepática Aguda da Gestação) — encefalopatia, hipoglicemia, coagulopatia.',
      'Síndrome HELLP — plaquetopenia, hemólise (LDH elevada), dor epigástrica.',
      'Pré-eclâmpsia com sinais de gravidade — hipertensão arterial, proteinúria.',
      'Hepatite viral aguda (A, B, C, E) — sorologia viral.',
      'Coledocolitíase — dor em HCD, icterícia colestática, dilatação de vias biliares à USG.',
      'Dermatose gestacional (PUPPP, penfigoide gestacional) — prurido sem elevação de ABT.'
    ];

    // ── Bloqueios de segurança ──
    resultado.bloqueios_seguranca.push('🚫 NÃO utilizar Colestiramina como monoterapia (inferior ao UDCA e interfere na absorção de vitaminas lipossolúveis e medicamentos).');
    resultado.bloqueios_seguranca.push('🚫 NÃO utilizar Dexametasona para tratamento da CIG (sem evidência de benefício e efeitos adversos materno-fetais).');
    resultado.bloqueios_seguranca.push('🚫 S-adenosilmetionina (SAMe) NÃO é recomendada como monoterapia (evidência insuficiente).');
    resultado.bloqueios_seguranca.push('⚠️ Monitorar coagulograma: CIG grave pode causar deficiência de vitamina K por colestase.');
    resultado.bloqueios_seguranca.push('⚠️ NÃO postergar o parto além do limiar recomendado para a faixa de ABT — o principal risco é o óbito fetal súbito.');

    return resultado;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. FUNÇÕES — EHAG / AFLP (Esteatose Hepática Aguda da Gestação)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Avalia os Critérios de Swansea para diagnóstico de EHAG/AFLP.
   * @param {object} criterios - Objeto com booleans para cada critério.
   * @returns {{ diagnostico: string, criterios_presentes: string[], total: number,
   *             limiar: number, confirmado: boolean, protocolo: object }}
   */
  function avaliarSwansea(criterios) {
    if (!criterios || typeof criterios !== 'object') {
      throw new Error('Critérios de Swansea devem ser informados como objeto.');
    }

    var presentes = [];
    var ausentes = [];

    CRITERIOS_SWANSEA.forEach(function(c) {
      if (criterios[c.id]) {
        presentes.push(c.descricao);
      } else {
        ausentes.push(c.descricao);
      }
    });

    var total = presentes.length;
    var confirmado = total >= SWANSEA_LIMIAR;

    var resultado = {
      diagnostico: confirmado ? 'EHAG_CONFIRMADA' : 'EHAG_NAO_CONFIRMADA',
      criterios_presentes: presentes,
      criterios_ausentes: ausentes,
      total_presentes: total,
      total_criterios: CRITERIOS_SWANSEA.length,
      limiar: SWANSEA_LIMIAR,
      confirmado: confirmado,
      protocolo: null,
      alertas: [],
      bloqueios_seguranca: [],
      referencias: REFERENCIAS.slice()
    };

    if (confirmado) {
      resultado.protocolo = gerarProtocoloEHAG(criterios);
      resultado.alertas.push('🚨 EHAG/AFLP CONFIRMADA: EMERGÊNCIA OBSTÉTRICA. O parto é o tratamento DEFINITIVO.');
      resultado.alertas.push('⚠️ Mortalidade materna: 1,8% (séries recentes). Mortalidade perinatal: 9-23%.');
      resultado.alertas.push('⚡ A recuperação hepática inicia tipicamente 48-72h após o parto, mas CIVD e insuficiência hepática podem progredir no pós-parto imediato.');
    } else {
      resultado.alertas.push('ℹ️ Critérios de Swansea não preenchidos (' + total + '/' + SWANSEA_LIMIAR + '). Reavaliar em 24-48h se quadro clínico-laboratorial progredir.');
    }

    return resultado;
  }

  /**
   * Gera o protocolo de estabilização e manejo da EHAG.
   * @param {object} criterios - Critérios avaliados.
   * @returns {object} Protocolo de manejo.
   */
  function gerarProtocoloEHAG(criterios) {
    var protocolo = {
      prioridade: 'EMERGÊNCIA OBSTÉTRICA',
      equipe: [
        'Obstetra sênior',
        'Hepatologista / Intensivista',
        'Anestesiologista',
        'Hematologista (se CIVD)',
        'Neonatologista'
      ],
      estabilizacao_pre_parto: [],
      parto: {},
      pos_parto: [],
      suporte_uti: []
    };

    // Estabilização pré-parto
    protocolo.estabilizacao_pre_parto.push('Acesso venoso calibroso (2 acessos periféricos 16-18G ou acesso central).');
    protocolo.estabilizacao_pre_parto.push('Monitorização hemodinâmica contínua (PA, FC, SpO2, débito urinário).');
    protocolo.estabilizacao_pre_parto.push('Reserva de hemoderivados: 4U CHAD, 4U PFC, 6U crio, 1 pool de plaquetas.');
    protocolo.estabilizacao_pre_parto.push('Coleta imediata: hemograma, coagulograma (TP, TTPa, fibrinogênio), TGO, TGP, bilirrubinas, glicemia, creatinina, ácido úrico, lactato, amônia, gasometria arterial.');

    if (criterios.hipoglicemia) {
      protocolo.estabilizacao_pre_parto.push('💉 HIPOGLICEMIA: Glicose hipertônica 50% — 40 mL IV em bolus + SG 10% em infusão contínua (100-150 mL/h). Monitorar glicemia capilar a cada 1h.');
    }

    if (criterios.coagulopatia) {
      protocolo.estabilizacao_pre_parto.push('🩸 COAGULOPATIA/CIVD: Plasma Fresco Congelado (PFC) 15-20 mL/kg IV. Crioprecipitado 10U se fibrinogênio < 150 mg/dL. Plaquetas se < 50.000/mm³ pré-parto.');
      protocolo.estabilizacao_pre_parto.push('Vitamina K1 (Fitomenadiona) 10 mg IV lento.');
    }

    if (criterios.encefalopatia) {
      protocolo.estabilizacao_pre_parto.push('🧠 ENCEFALOPATIA HEPÁTICA: Lactulose 30 mL VO/SNG a cada 6-8h (alvo: 2-3 evacuações pastosas/dia). Evitar sedativos.');
      protocolo.estabilizacao_pre_parto.push('Considerar N-acetilcisteína (NAC) IV 150 mg/kg em 60 min (protocolo de insuficiência hepática aguda não paracetamol — AASLD).');
    }

    // Parto
    protocolo.parto = {
      urgencia: 'Parto URGENTE após estabilização materna (não postergar > 24-48h do diagnóstico).',
      via: 'Cesariana é frequentemente necessária, mas indução vaginal pode ser considerada se condição materna estável e colo favorável.',
      anestesia: 'Avaliação anestésica OBRIGATÓRIA: bloqueio neuroaxial somente se plaquetas > 75.000 e coagulograma adequado; caso contrário, anestesia geral com intubação de sequência rápida.',
      nota: 'A decisão da via de parto deve ser INDIVIDUALIZADA com base na gravidade da coagulopatia e estabilidade hemodinâmica.'
    };

    // Pós-parto
    protocolo.pos_parto.push('Monitoramento em UTI por no mínimo 48-72h após o parto.');
    protocolo.pos_parto.push('Controle laboratorial seriado a cada 12-24h: TGO, TGP, bilirrubinas, coagulograma, glicemia, creatinina, hemograma, lactato.');
    protocolo.pos_parto.push('Melhora esperada em 48-72h. Se piora progressiva após 72h → considerar transplante hepático (acionar centro de referência).');
    protocolo.pos_parto.push('Manter suporte glicêmico e correção de coagulopatia até normalização.');

    // Suporte de UTI
    protocolo.suporte_uti.push('Fluidoterapia com cristaloides balanceados (evitar sobrecarga).');
    protocolo.suporte_uti.push('Profilaxia de úlcera de estresse: Pantoprazol 40 mg IV 1x/dia.');
    protocolo.suporte_uti.push('Se insuficiência renal aguda: considerar diálise precoce (hemodiafiltração venovenosa contínua).');
    protocolo.suporte_uti.push('Contatar centro de transplante hepático se critérios de King\'s College para insuficiência hepática aguda.');

    return protocolo;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. DIAGNÓSTICO DIFERENCIAL UNIFICADO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Diferencial clínico entre CIG, EHAG e HELLP.
   * @param {object} dados - Dados clínico-laboratoriais.
   * @returns {{ diagnosticos_provaveis: string[], tabela: object[] }}
   */
  function diagnosticoDiferencial(dados) {
    if (!dados) dados = {};

    var tabela = [
      {
        diagnostico: 'CIG (Colestase Intra-hepática)',
        prurido: 'Intenso (palmas e plantas)',
        transaminases: 'Normais a moderadamente elevadas',
        bilirrubina: 'Normal ou levemente elevada',
        plaquetas: 'Normais',
        coagulopatia: 'Rara (apenas em CIG grave por def. vit K)',
        hipoglicemia: 'Ausente',
        hipertensao: 'Ausente',
        encefalopatia: 'Ausente',
        abt_elevados: 'SIM (> 10 mcmol/L)',
        pico_incidencia: '3º trimestre (> 28 semanas)'
      },
      {
        diagnostico: 'EHAG / AFLP',
        prurido: 'Incomum',
        transaminases: 'Elevadas (geralmente < 500-1000)',
        bilirrubina: 'Elevada',
        plaquetas: 'Normais ou reduzidas',
        coagulopatia: 'Frequente (CIVD)',
        hipoglicemia: 'Frequente (sinal cardinal)',
        hipertensao: 'Presente em ~50%',
        encefalopatia: 'Pode ocorrer (insuf. hepática)',
        abt_elevados: 'Podem estar elevados',
        pico_incidencia: '3º trimestre (> 30 semanas)'
      },
      {
        diagnostico: 'Síndrome HELLP',
        prurido: 'Ausente',
        transaminases: 'Elevadas',
        bilirrubina: 'Elevada (hemólise)',
        plaquetas: 'REDUZIDAS (< 100.000)',
        coagulopatia: 'Possível (CIVD em formas graves)',
        hipoglicemia: 'Rara',
        hipertensao: 'Presente (pré-eclâmpsia)',
        encefalopatia: 'Rara',
        abt_elevados: 'Normais',
        pico_incidencia: '3º trimestre'
      }
    ];

    var provaveis = [];

    // Heurística de sugestão diagnóstica
    if (dados.acidos_biliares && dados.acidos_biliares >= 10) {
      provaveis.push('CIG');
    }
    if (dados.hipoglicemia || dados.encefalopatia || (dados.coagulopatia && dados.transaminases_elevadas)) {
      provaveis.push('EHAG/AFLP');
    }
    if (dados.plaquetas_baixas && dados.hipertensao) {
      provaveis.push('HELLP');
    }
    if (provaveis.length === 0) {
      provaveis.push('Dados insuficientes para sugestão diagnóstica');
    }

    return {
      diagnosticos_provaveis: provaveis,
      tabela: tabela
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. PARSER DE TEXTO LIVRE (Telegram)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extrai parâmetros clínicos de um texto livre para avaliação de CIG/EHAG.
   * @param {string} texto - Texto livre do usuário.
   * @returns {object} Parâmetros extraídos.
   */
  function extrairParametrosTexto(texto) {
    if (!texto || typeof texto !== 'string') return {};

    var t = texto.toLowerCase().replace(/,/g, '.').trim();
    var params = {};

    // Ácidos biliares totais
    var mAbt = t.match(/(?:abt|acidos?\s*biliares?|bile\s*acids?|ab)\s*[:=]?\s*(\d+(?:\.\d+)?)/);
    if (mAbt) params.acidos_biliares = parseFloat(mAbt[1]);

    // Peso
    var mPeso = t.match(/(?:peso|weight)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:kg)?/);
    if (mPeso) params.peso = parseFloat(mPeso[1]);

    // IG
    var mIg = t.match(/(?:ig|idade\s*gestacional)?\s*(\d{1,2})\s*(?:s(?:em(?:anas?)?)?|semanas?)\s*(?:e?\s*(\d)\s*(?:d(?:ias?)?)?)?/);
    if (!mIg) {
      mIg = t.match(/(\d{1,2})\s*\+\s*(\d)/);
    }
    if (mIg) {
      params.ig_semanas = parseInt(mIg[1], 10);
      if (mIg[2]) params.ig_dias = parseInt(mIg[2], 10);
    }

    // TGO/TGP
    var mTgo = t.match(/(?:tgo|ast)\s*[:=]?\s*(\d+(?:\.\d+)?)/);
    if (mTgo) params.tgo = parseFloat(mTgo[1]);
    var mTgp = t.match(/(?:tgp|alt)\s*[:=]?\s*(\d+(?:\.\d+)?)/);
    if (mTgp) params.tgp = parseFloat(mTgp[1]);

    // Bilirrubina
    var mBil = t.match(/(?:bilirrubina|bt|bil)\s*[:=]?\s*(\d+(?:\.\d+)?)/);
    if (mBil) params.bilirrubina_total = parseFloat(mBil[1]);

    // Booleanos
    if (/prurido|coceira|pruri/i.test(t)) params.prurido = true;
    if (/antecedente|previa|anterior|recorrente/i.test(t)) params.antecedente_cig = true;
    if (/gemelar|gemeo|gemeos|twins/i.test(t)) params.gestacao_gemelar = true;

    // Critérios de Swansea (EHAG)
    if (/ehag|aflp|esteatose|fatty\s*liver|swansea/i.test(t)) {
      params.modo = 'EHAG';
      params.swansea = {};
      if (/v[oô]mito/i.test(t)) params.swansea.vomitos = true;
      if (/dor\s*(?:abdominal|epig[aá]strica|hcd)/i.test(t)) params.swansea.dor_abdominal = true;
      if (/polidipsia|poli[uú]ria/i.test(t)) params.swansea.polidipsia_poliuria = true;
      if (/encefalopatia|confus[aã]o\s*mental|rebaixamento/i.test(t)) params.swansea.encefalopatia = true;
      if (/bilirrubina\s*(?:elevada|alta|>)/i.test(t) || (params.bilirrubina_total && params.bilirrubina_total > 0.8)) params.swansea.bilirrubina_elevada = true;
      if (/hipoglicemia|glicose\s*(?:baixa|<)|glicemia\s*(?:baixa|<)/i.test(t)) params.swansea.hipoglicemia = true;
      if (/[aá]cido\s*[uú]rico\s*(?:elevado|alto|>)|hiperuricemia/i.test(t)) params.swansea.acido_urico_elevado = true;
      if (/leucocitose|leuc[oó]citos?\s*(?:elevad|alt|>)|gb\s*>\s*11/i.test(t)) params.swansea.leucocitose = true;
      if (/ascite|f[ií]gado\s*brilhante/i.test(t)) params.swansea.ascite_usg = true;
      if (/transaminases?\s*(?:elevad|alt|>)|tgo\s*>\s*42|tgp\s*>\s*42/i.test(t) || (params.tgo && params.tgo > 42) || (params.tgp && params.tgp > 42)) params.swansea.transaminases_elevadas = true;
      if (/am[oô]nia\s*(?:elevad|alt|>)/i.test(t)) params.swansea.amonia_elevada = true;
      if (/insuf(?:ici[eê]ncia)?\s*renal|creatinina\s*(?:elevad|alt|>)/i.test(t)) params.swansea.insuf_renal = true;
      if (/coagulopatia|civd|dic|tp\s*>\s*14|ttpa\s*>\s*34/i.test(t)) params.swansea.coagulopatia = true;
      if (/bi[oó]psia|esteatose\s*micro/i.test(t)) params.swansea.esteatose_biopsia = true;
    }

    return params;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. AVALIAÇÃO UNIFICADA (entry point principal)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Função principal de avaliação. Despacha para CIG ou EHAG conforme os dados.
   * @param {object} params - Parâmetros clínicos.
   * @returns {object} Resultado da avaliação.
   */
  function avaliar(params) {
    if (!params || typeof params !== 'object') {
      throw new Error('Parâmetros clínicos obrigatórios.');
    }

    // Modo EHAG
    if (params.modo === 'EHAG' && params.swansea) {
      return avaliarSwansea(params.swansea);
    }

    // Modo CIG (padrão)
    if (params.acidos_biliares != null) {
      return avaliarCIG(params);
    }

    throw new Error('Informe "acidos_biliares" para avaliação de CIG ou "modo: EHAG" com critérios de Swansea.');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. FORMATAÇÃO TELEGRAM
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Formata o resultado da avaliação em texto Markdown para Telegram.
   * @param {object} resultado - Resultado de avaliar() ou avaliarCIG() ou avaliarSwansea().
   * @returns {string} Texto formatado.
   */
  function formatarTextoTelegram(resultado) {
    if (!resultado) return '';
    var t = [];

    if (resultado.diagnostico === 'COLESTASE_INTRAHEPATICA_GESTACIONAL' || resultado.diagnostico === 'NAO_CONFIRMADO') {
      // ── CIG ──
      t.push('🟡 *COLESTASE INTRA-HEPÁTICA DA GESTAÇÃO (CIG)*');
      t.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      t.push('');

      t.push('📊 *ÁCIDOS BILIARES TOTAIS:* ' + resultado.acidos_biliares_mcmol + ' mcmol/L');
      t.push('🏷️ *CLASSIFICAÇÃO:* ' + resultado.classificacao.gravidade);
      t.push('⚠️ *RISCO FETAL:* ' + resultado.classificacao.faixa.risco_fetal);

      if (resultado.ig) {
        t.push('📅 *IG:* ' + resultado.ig.texto);
      }
      t.push('');

      if (resultado.diagnostico === 'NAO_CONFIRMADO') {
        t.push('ℹ️ *CIG não confirmada (ABT < 10 mcmol/L).*');
        t.push('');
      }

      // Tratamento
      if (resultado.tratamento) {
        t.push('💊 *TRATAMENTO:*');
        resultado.tratamento.farmacologico.forEach(function(f) {
          t.push(' • *' + f.farmaco + '* (' + f.linha + ')');
          t.push('   Dose: ' + f.dose);
          if (f.posologia) t.push('   Posologia: ' + f.posologia);
          if (f.observacao) t.push('   _' + f.observacao + '_');
        });
        if (resultado.tratamento.nao_farmacologico.length > 0) {
          t.push('');
          t.push('🧴 *Medidas não farmacológicas:*');
          resultado.tratamento.nao_farmacologico.forEach(function(m) {
            t.push(' • ' + m);
          });
        }
        t.push('');
      }

      // Vigilância
      if (resultado.vigilancia) {
        t.push('👁️ *VIGILÂNCIA:*');
        t.push(' • Lab: ' + resultado.vigilancia.laboratorial);
        t.push(' • Hepática: ' + resultado.vigilancia.hepatica);
        t.push(' • Fetal: ' + resultado.vigilancia.fetal);
        if (resultado.vigilancia.nota) t.push(' • ' + resultado.vigilancia.nota);
        t.push('');
      }

      // Parto
      if (resultado.parto) {
        t.push('🏥 *PROGRAMAÇÃO DO PARTO:*');
        t.push(' • IG alvo: *' + resultado.parto.ig_alvo_texto + '*');
        t.push(' • Via: ' + resultado.parto.via_parto);
        t.push(' • Justificativa: ' + resultado.parto.justificativa);
        if (resultado.parto.parto_indicado_agora) {
          t.push(' • 🚨 *PARTO INDICADO AGORA* (IG >= alvo)');
        }
        if (resultado.parto.corticoide && resultado.parto.corticoide.indicado) {
          t.push('');
          t.push('💉 *CORTICOIDE ANTENATAL (INDICADO):*');
          t.push(' • ' + resultado.parto.corticoide.esquema);
        }
        if (resultado.parto.vitamina_k && resultado.parto.vitamina_k.indicada) {
          t.push('');
          t.push('💊 *VITAMINA K:*');
          t.push(' • ' + resultado.parto.vitamina_k.dose);
          t.push('   _' + resultado.parto.vitamina_k.justificativa + '_');
        }
        t.push('');
      }

    } else if (resultado.diagnostico === 'EHAG_CONFIRMADA' || resultado.diagnostico === 'EHAG_NAO_CONFIRMADA') {
      // ── EHAG ──
      t.push('🔴 *ESTEATOSE HEPÁTICA AGUDA DA GESTAÇÃO (EHAG / AFLP)*');
      t.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      t.push('');

      t.push('📊 *CRITÉRIOS DE SWANSEA:* ' + resultado.total_presentes + '/' + resultado.total_criterios + ' (limiar >= ' + resultado.limiar + ')');
      t.push('🏷️ *STATUS:* ' + (resultado.confirmado ? '✅ CONFIRMADA' : '❌ NÃO CONFIRMADA'));
      t.push('');

      if (resultado.criterios_presentes.length > 0) {
        t.push('✅ *Critérios presentes:*');
        resultado.criterios_presentes.forEach(function(c) {
          t.push(' • ' + c);
        });
        t.push('');
      }

      // Protocolo
      if (resultado.protocolo) {
        var p = resultado.protocolo;
        t.push('🚨 *PRIORIDADE:* ' + p.prioridade);
        t.push('');

        t.push('👥 *EQUIPE MULTIDISCIPLINAR:*');
        p.equipe.forEach(function(e) { t.push(' • ' + e); });
        t.push('');

        t.push('⚡ *ESTABILIZAÇÃO PRÉ-PARTO:*');
        p.estabilizacao_pre_parto.forEach(function(e) { t.push(' • ' + e); });
        t.push('');

        t.push('🏥 *PARTO:*');
        t.push(' • *Urgência:* ' + p.parto.urgencia);
        t.push(' • *Via:* ' + p.parto.via);
        t.push(' • *Anestesia:* ' + p.parto.anestesia);
        t.push(' • _' + p.parto.nota + '_');
        t.push('');

        t.push('🔄 *PÓS-PARTO:*');
        p.pos_parto.forEach(function(e) { t.push(' • ' + e); });
        t.push('');
      }
    }

    // Alertas
    if (resultado.alertas && resultado.alertas.length > 0) {
      t.push('⚠️ *ALERTAS:*');
      resultado.alertas.forEach(function(a) { t.push(' • ' + a); });
      t.push('');
    }

    // Diagnóstico diferencial
    if (resultado.diagnostico_diferencial && resultado.diagnostico_diferencial.length > 0) {
      t.push('🔍 *DIAGNÓSTICO DIFERENCIAL:*');
      resultado.diagnostico_diferencial.forEach(function(d) { t.push(' • ' + d); });
      t.push('');
    }

    // Bloqueios de segurança
    if (resultado.bloqueios_seguranca && resultado.bloqueios_seguranca.length > 0) {
      t.push('🛡️ *BLOQUEIOS DE SEGURANÇA:*');
      resultado.bloqueios_seguranca.forEach(function(b) { t.push(' • ' + b); });
      t.push('');
    }

    // Referências
    t.push('📚 Fontes: RCOG 2024, SMFM 2024, Ovadia Lancet 2019, ACOG 2022, Swansea (Gut 2002/2008), FEBRASGO 2024, AASLD 2021.');
    t.push('Decisão final do obstetra e hepatologista assistente.');

    return t.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. API PÚBLICA
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    classificarGravidadeCIG: classificarGravidadeCIG,
    calcularDoseUDCA: calcularDoseUDCA,
    avaliarCIG: avaliarCIG,
    avaliarSwansea: avaliarSwansea,
    diagnosticoDiferencial: diagnosticoDiferencial,
    extrairParametrosTexto: extrairParametrosTexto,
    avaliar: avaliar,
    formatarTextoTelegram: formatarTextoTelegram,
    CRITERIOS_SWANSEA: CRITERIOS_SWANSEA,
    FAIXAS_ABT: FAIXAS_ABT,
    REFERENCIAS: REFERENCIAS
  };
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = HepatologiaColestaseGestacionalService;
}
