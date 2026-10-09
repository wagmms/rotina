/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MÓDULO 02: SUPORTE NUTRICIONAL EM PEDIATRIA E TERAPIA NUTRICIONAL
 * ═══════════════════════════════════════════════════════════════════════════════
 * Motor Determinístico Beira-Leito para Cálculos Nutricionais Pediátricos:
 *  1. Fórmula de Holliday-Segar (Manutenção Hídrica, Vazão Horária 4-2-1 e Ajustes Clínicos)
 *  2. Prescrição Eletrolítica de Manutenção (SBP / AAP - Prevenção de Hiponatremia Hospitalar)
 *  3. Taxa de Infusão de Glicose (TIG) Basal e Suporte Calórico
 *  4. Diluição e Preparo Seguro de Fórmulas Infantis (Padronização 1 medida para 30 mL)
 *  5. Seleção Racional de Fórmulas Especiais (APLV, Prematuros, AR, Sem Lactose, AAF)
 *  6. Alertas Beira-Leito: Hipodiluição, Hiperconcentração, Cronobacter sakazakii e Bloqueios
 *
 * REFERÊNCIAS CLÍNICAS OFICIAIS:
 *  - Holliday MA, Segar WE. "The maintenance need for water in parenteral fluid therapy" (Pediatrics 1957)
 *  - Sociedade Brasileira de Pediatria (SBP) - Departamento de Nutrologia e Terapia Nutricional (2023-2026)
 *  - American Academy of Pediatrics (AAP) - Clinical Practice Guideline: Maintenance Intravenous Fluids in Children (2018/reafirmado)
 *  - ESPGHAN Committee on Nutrition - Pediatric Enteral and Parenteral Guidelines (2022-2026)
 *  - Ministério da Saúde do Brasil - Guia Alimentar para Crianças Brasileiras Menores de 2 Anos
 *  - OMS / FAO - Safe preparation, storage and handling of powdered infant formula guidelines
 * ═══════════════════════════════════════════════════════════════════════════════
 */

var SuporteNutricionalPediatricoService = (function () {
  'use strict';

  var EPS = 1e-9;

  // ───────────────────────────────────────────────────────────────────────────
  // CONSTANTES & PADRÕES CLÍNICOS
  // ───────────────────────────────────────────────────────────────────────────
  var DILUICAO_PADRAO_ML_POR_MEDIDA = 30; // 1 scoop raso para cada 30 mL de água fervida morna
  var DENSIDADE_PADRAO_KCAL_ML = 0.67;    // ~67 kcal/100 mL para fórmulas padrão de lactentes
  var DENSIDADE_PREMATURO_KCAL_ML = 0.80; // ~80 kcal/100 mL para fórmulas de pré-termo
  var DENSIDADE_HIPERCALORICA_KCAL_ML = 1.0; // 1.0 kcal/mL

  var TIPOS_FORMULA = {
    'partida': {
      nome: 'Fórmula Infantil de Partida (Fase 1)',
      faixaEtaria: '0 a 6 meses',
      medidaMl: 30,
      densidadeKcalMl: 0.67,
      descricao: 'Predomínio de proteínas do soro (60/40), lactose como carboidrato primário, DHA/ARA.'
    },
    'seguimento': {
      nome: 'Fórmula Infantil de Seguimento (Fase 2)',
      faixaEtaria: '6 a 12 meses',
      medidaMl: 30,
      densidadeKcalMl: 0.67,
      descricao: 'Maior teor de ferro, cálcio e caseína para complementar a introdução alimentar sólida.'
    },
    'prematuro': {
      nome: 'Fórmula para Prematuros / PIG',
      faixaEtaria: 'Recém-nascidos pré-termo até 40-52 sem IG corrigida',
      medidaMl: 30,
      densidadeKcalMl: 0.80,
      descricao: 'Hipercalórica (~80 kcal/100mL), TCM (lipídios de fácil absorção), alto teor proteico e mineral.'
    },
    'anti_regurgitacao': {
      nome: 'Fórmula Anti-Regurgitação (AR)',
      faixaEtaria: '0 a 12 meses',
      medidaMl: 30,
      densidadeKcalMl: 0.67,
      descricao: 'Espessada com amido de milho pré-gelatinizado ou goma jataí. Indicada para RGE sintomático com regurgitações volumosas.'
    },
    'sem_lactose': {
      nome: 'Fórmula Sem Lactose (SL)',
      faixaEtaria: '0 a 12 meses',
      medidaMl: 30,
      densidadeKcalMl: 0.67,
      descricao: 'Carboidratos à base de maltodextrina. Indicada na diarreia persistente com intolerância secundária à lactose. NÃO indicada para APLV.'
    },
    'hidrolisada_extensa': {
      nome: 'Fórmula Extensamente Hidrolisada (eHF)',
      faixaEtaria: '0 a 12 meses',
      medidaMl: 30,
      densidadeKcalMl: 0.67,
      descricao: '1ª linha para Alergia à Proteína do Leite de Vaca (APLV) leve a moderada. Peptídeos com peso < 1.500 Da.'
    },
    'aminoacidos': {
      nome: 'Fórmula de Aminoácidos Livres (AAF)',
      faixaEtaria: '0 a 12 meses',
      medidaMl: 30,
      densidadeKcalMl: 0.68,
      descricao: '100% aminoácidos livres elementares. Indicada para APLV com anafilaxia, proctocolite grave, falência de crescimento ou falha de eHF.'
    },
    'soja': {
      nome: 'Fórmula à Base de Proteína Isolada de Soja',
      faixaEtaria: 'Somente a partir de 6 meses',
      medidaMl: 30,
      densidadeKcalMl: 0.67,
      descricao: 'Alternativa em galactosemia ou vegetarianismo estrito após os 6 meses. CONTRAINDICADA em < 6 meses pelo risco de fitoestrógenos.'
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // HELPERS MATEMÁTICOS E DE FORMATAÇÃO
  // ───────────────────────────────────────────────────────────────────────────
  function arred(val, casas) {
    if (!Number.isFinite(val)) return 0;
    var f = Math.pow(10, casas || 0);
    return Math.round((val + EPS) * f) / f;
  }

  function fmt(val, casas) {
    if (val === null || val === undefined || !Number.isFinite(val)) return '—';
    return arred(val, casas).toFixed(casas).replace('.', ',');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 1. CÁLCULO DE HOLLIDAY-SEGAR (MANUTENÇÃO HÍDRICA PEDIÁTRICA)
  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Calcula o volume de manutenção hídrica diário e taxa horária pela Fórmula de Holliday-Segar.
   * @param {number} pesoKg Peso da criança em kg
   * @param {Object} opcoes Opções clínicas (condicaoClinica, temperaturaC, percentualAjuste)
   * @returns {Object} Dados do cálculo hídrico
   */
  function calcularHollidaySegar(pesoKg, opcoes) {
    opcoes = opcoes || {};
    var p = Number(pesoKg);
    if (!p || p <= 0 || isNaN(p)) {
      throw new Error('Peso em kg inválido ou não fornecido para cálculo de Holliday-Segar.');
    }

    // 1. Volume Basal Holliday-Segar (mL/24h)
    var volBasal = 0;
    if (p <= 10) {
      volBasal = p * 100;
    } else if (p <= 20) {
      volBasal = 1000 + (p - 10) * 50;
    } else {
      volBasal = 1500 + (p - 20) * 20;
    }

    // Alerta se peso exceder teto habitual de enfermaria pediátrica / adulto
    var tetoMaximoRecomendado = 2500;
    var alertaTetoAdulto = false;
    if (volBasal > tetoMaximoRecomendado) {
      alertaTetoAdulto = true;
    }

    // 2. Regra 4-2-1 para Vazão Horária Basal (mL/h)
    var vazaoBasal421 = 0;
    if (p <= 10) {
      vazaoBasal421 = p * 4;
    } else if (p <= 20) {
      vazaoBasal421 = (10 * 4) + ((p - 10) * 2);
    } else {
      vazaoBasal421 = (10 * 4) + (10 * 2) + ((p - 20) * 1);
    }

    // 3. Fatores de Ajuste Clínico
    var condicao = String(opcoes.condicaoClinica || 'manutencao_padrao').toLowerCase();
    var percentual = 100;
    var justificativaAjuste = 'Manutenção basal habitual (100% de Holliday-Segar).';

    if (opcoes.percentualAjuste && Number(opcoes.percentualAjuste) > 0) {
      percentual = Number(opcoes.percentualAjuste);
      justificativaAjuste = 'Ajuste percentual customizado para ' + percentual + '%.';
    } else if (condicao === 'restricao_bronquiolite' || condicao === 'bronquiolite') {
      percentual = 70;
      justificativaAjuste = 'Restrição hídrica (70%): recomendada na Bronquiolite Viral Aguda moderada/grave para prevenir sobrecarga hídrica pulmonar (estímulo não-osmótico de ADH).';
    } else if (condicao === 'restricao_ic' || condicao === 'cardiopatia' || condicao === 'edema') {
      percentual = 60;
      justificativaAjuste = 'Restrição hídrica rigorosa (60%): indicada em Cardiopatias congênitas descompensadas, ICC ou Síndrome Nefrótica.';
    } else if (condicao === 'siadh' || condicao === 'oliguria') {
      percentual = 50;
      justificativaAjuste = 'Restrição hídrica severa (50%): indicada em SIADH, insuficiência renal oligúrica ou pós-parada.';
    } else if (condicao === 'desidratacao_leve' || condicao === 'reposicao_perdas') {
      percentual = 125;
      justificativaAjuste = 'Acréscimo hídrico (125%): manutenção acrescida de cota para reposição de déficit leve ou perdas digestivas em curso.';
    } else if (condicao === 'catch_up' || condicao === 'desnutricao') {
      percentual = 120;
      justificativaAjuste = 'Acréscimo metabólico (120%): terapia nutricional de recuperação ponderal (catch-up growth).';
    } else if (condicao === 'febre') {
      var temp = Number(opcoes.temperaturaC || 38.5);
      if (temp > 37.8) {
        var grausAcima = temp - 37.8;
        var incremento = Math.min(36, Math.round(grausAcima * 12)); // 12% por grau acima de 37.8
        percentual = 100 + incremento;
        justificativaAjuste = 'Acréscimo por febre (' + fmt(temp, 1) + '°C): +' + incremento + '% para compensar perdas insensíveis aumentadas.';
      }
    }

    var volAjustado = arred((volBasal * percentual) / 100, 1);
    var vazaoAjustadaMlH = arred(volAjustado / 24, 1);

    // 4. Prescrição Eletrolítica de Manutenção (Diretrizes SBP e AAP)
    // Sódio: 2 a 3 mEq / 100 mL de solução (solução balanceada ou isotônica)
    var sodioTotalMeq = arred((volAjustado / 100) * 2.5, 1);
    var sodioMeqKgDia = arred(sodioTotalMeq / p, 2);

    // Potássio: 2 mEq / 100 mL de solução (adicionar APENAS após diurese presente)
    var potassioTotalMeq = arred((volAjustado / 100) * 2.0, 1);
    var potassioMeqKgDia = arred(potassioTotalMeq / p, 2);

    // 5. Cálculo da TIG (Taxa de Infusão de Glicose) em SG 5%
    // TIG (mg/kg/min) = (% Glicose * Vazão mL/h * 10) / (pesoKg * 60) = (% * Vazão) / (p * 6)
    var tigSg5 = arred((5 * vazaoAjustadaMlH) / (p * 6), 2);
    var tigSg10 = arred((10 * vazaoAjustadaMlH) / (p * 6), 2);

    var alertas = [];
    if (p < 1.0) {
      alertas.push('⚠️ RECÉM-NASCIDO DE EXTREMO BAIXO PESO (< 1 kg): A fórmula de Holliday-Segar tradicional foi concebida para crianças > 1 mês. Em prematuros extremos (< 1 kg), o balanço hídrico diário deve ser rigorosamente individualizado pela neonatologia devido às perdas insensíveis aumentadas e risco de persistência do canal arterial.');
    }
    if (p > 150) {
      alertas.push('⚠️ OBESIDADE SEVERA (> 150 kg): O volume hídrico basal calculado não deve ser expandido linearmente pelo peso total. Recomenda-se fixar o teto adulto de 2.000 a 2.500 mL/dia para prevenir sobrecarga cardiopulmonar.');
    }
    if (alertaTetoAdulto) {
      alertas.push('⚠️ ATENÇÃO AO TETO HÍDRICO: O volume calculado (' + volBasal + ' mL) ultrapassa o limite adulto padrão (2.500 mL/dia). Avaliar prescrição de manutenção baseada em adulto.');
    }
    alertas.push('🚨 SEGURANÇA ELETROLÍTICA (SBP/AAP): Prescrever preferencialmente fluidos isotônicos (ex: NaCl 0.9% ou NaCl 0.45%) para evitar HIPONATREMIA HOSPITALAR AGUDA grave induzida por secreção não osmótica de ADH.');
    alertas.push('⚠️ REGRA DO POTÁSSIO: O cloreto de potássio (KCl) DEVE ser adicionado à solução SOMENTE após confirmação de micção espontânea/diurese efetiva preservada (risco de hipercalemia fatal na anúria).');

    return {
      pesoKg: p,
      volumeBasal24h: arred(volBasal, 1),
      volumeBasalMlKgDia: arred(volBasal / p, 1),
      volumeAjustado24h: volAjustado,
      volumeAjustadoMlKgDia: arred(volAjustado / p, 1),
      vazaoHorariaMlH: vazaoAjustadaMlH,
      vazaoBasal421MlH: arred(vazaoBasal421, 1),
      percentualAplicado: percentual,
      condicaoClinica: condicao,
      justificativaAjuste: justificativaAjuste,
      eletrolitos: {
        sodioTotalMeqDia: sodioTotalMeq,
        sodioMeqKgDia: sodioMeqKgDia,
        potassioTotalMeqDia: potassioTotalMeq,
        potassioMeqKgDia: potassioMeqKgDia,
        orientacaoSodio: '2,5 mEq de Na+ para cada 100 mL de solução (recomenda-se evitar SG 5% puro ou soluções excessivamente hipotônicas).',
        orientacaoPotassio: '2,0 mEq de K+ para cada 100 mL de solução (iniciar somente com diurese confirmada).'
      },
      glicoseTig: {
        tigComSg5: tigSg5,
        tigComSg10: tigSg10,
        faixaRecomendadaLactente: '4,0 a 6,0 mg/kg/min',
        avaliacao: (tigSg5 >= 4.0 && tigSg5 <= 6.5)
          ? 'TIG adequada com SG 5% para prevenir hipoglicemia e cetose.'
          : (tigSg5 < 4.0 ? 'TIG baixa com SG 5% (< 4 mg/kg/min). Considerar SG 7.5% ou SG 10% para suprir demanda metabólica.' : 'TIG elevada com SG 5%.')
      },
      alertas: alertas
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. METAS NUTRICIONAIS E CALÓRICAS PEDIÁTRICAS
  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Fornece metas calóricas, proteicas e hídricas por faixa etária segundo SBP/ESPGHAN.
   * @param {number} pesoKg Peso em kg
   * @param {number} idadeMeses Idade em meses
   * @param {string} condicao Condição clínica ('padrao', 'catch_up', 'prematuro', 'critico')
   * @returns {Object} Metas nutricionais estimadas
   */
  function calcularMetasNutricionais(pesoKg, idadeMeses, condicao) {
    var p = Number(pesoKg || 5);
    var idade = Number(idadeMeses !== undefined && idadeMeses !== null ? idadeMeses : 3);
    condicao = String(condicao || 'padrao').toLowerCase();

    var metaKcalKgMin = 100;
    var metaKcalKgMax = 115;
    var metaProtKgMin = 1.5;
    var metaProtKgMax = 2.0;
    var descricaoFaixa = '';

    if (condicao === 'prematuro' || idade < 0) {
      descricaoFaixa = 'Recém-Nascido Pré-termo / PIG';
      metaKcalKgMin = 110;
      metaKcalKgMax = 135;
      metaProtKgMin = 3.0;
      metaProtKgMax = 4.0;
    } else if (idade < 6) {
      descricaoFaixa = 'Lactente jovem (0 a 6 meses)';
      metaKcalKgMin = 100;
      metaKcalKgMax = 115;
      metaProtKgMin = 1.5;
      metaProtKgMax = 2.0;
    } else if (idade < 12) {
      descricaoFaixa = 'Lactente (6 a 12 meses)';
      metaKcalKgMin = 85;
      metaKcalKgMax = 100;
      metaProtKgMin = 1.2;
      metaProtKgMax = 1.5;
    } else if (idade < 36) {
      descricaoFaixa = 'Primeira infância (1 a 3 anos)';
      metaKcalKgMin = 75;
      metaKcalKgMax = 90;
      metaProtKgMin = 1.0;
      metaProtKgMax = 1.2;
    } else if (idade < 84) {
      descricaoFaixa = 'Pré-escolar (3 a 7 anos)';
      metaKcalKgMin = 65;
      metaKcalKgMax = 75;
      metaProtKgMin = 0.9;
      metaProtKgMax = 1.1;
    } else {
      descricaoFaixa = 'Escolar e Adolescente (> 7 anos)';
      metaKcalKgMin = 45;
      metaKcalKgMax = 65;
      metaProtKgMin = 0.9;
      metaProtKgMax = 1.0;
    }

    if (condicao === 'catch_up') {
      metaKcalKgMin = arred(metaKcalKgMin * 1.25, 0);
      metaKcalKgMax = arred(metaKcalKgMax * 1.30, 0);
      metaProtKgMin = arred(metaProtKgMin * 1.2, 1);
      metaProtKgMax = arred(metaProtKgMax * 1.25, 1);
      descricaoFaixa += ' [Recuperação Nutricional / Catch-Up]';
    } else if (condicao === 'critico') {
      metaKcalKgMin = arred(metaKcalKgMin * 0.8, 0);
      metaKcalKgMax = arred(metaKcalKgMax * 0.85, 0);
      descricaoFaixa += ' [Fase Aguda Crítica / UTI]';
    }

    var kcalDiaMin = arred(p * metaKcalKgMin, 0);
    var kcalDiaMax = arred(p * metaKcalKgMax, 0);
    var protDiaMin = arred(p * metaProtKgMin, 1);
    var protDiaMax = arred(p * metaProtKgMax, 1);

    return {
      faixaEtaria: descricaoFaixa,
      pesoKg: p,
      idadeMeses: idade,
      metaCaloricaKcalKg: { min: metaKcalKgMin, max: metaKcalKgMax },
      metaCaloricaTotalDiaKcal: { min: kcalDiaMin, max: kcalDiaMax },
      metaProteicaGKg: { min: metaProtKgMin, max: metaProtKgMax },
      metaProteicaTotalDiaG: { min: protDiaMin, max: protDiaMax }
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. CALCULADORA DETERMINÍSTICA DE DILUIÇÃO E PREPARO DE FÓRMULAS INFANTIS
  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Calcula a diluição de fórmula infantil com respeito inflexível à padronização 1 medida para 30 mL.
   * @param {Object} params Parâmetros de cálculo
   * @returns {Object} Prescrição completa com instruções de preparo
   */
  function calcularDiluicaoFormula(params) {
    params = params || {};
    var pesoKg = params.pesoKg ? Number(params.pesoKg) : null;
    var idadeMeses = params.idadeMeses !== undefined && params.idadeMeses !== null ? Number(params.idadeMeses) : null;
    var tipoChave = String(params.tipoFormula || 'partida').toLowerCase();
    var configTipo = TIPOS_FORMULA[tipoChave] || TIPOS_FORMULA['partida'];

    var densidadeKcalMl = params.densidadeKcalMl ? Number(params.densidadeKcalMl) : configTipo.densidadeKcalMl;

    // 1. Definição do fracionamento habitual por idade se não fornecido
    var mamadasSugeridas = 8;
    var volumeMamadaSugerido = 60;

    if (idadeMeses !== null) {
      if (idadeMeses < 1) {
        mamadasSugeridas = 8;
        volumeMamadaSugerido = 60; // 2 medidas (60 mL)
      } else if (idadeMeses < 2) {
        mamadasSugeridas = 7;
        volumeMamadaSugerido = 90; // 3 medidas (90 mL)
      } else if (idadeMeses < 4) {
        mamadasSugeridas = 6;
        volumeMamadaSugerido = 120; // 4 medidas (120 mL)
      } else if (idadeMeses < 6) {
        mamadasSugeridas = 5;
        volumeMamadaSugerido = 150; // 5 medidas (150 mL)
      } else if (idadeMeses < 9) {
        mamadasSugeridas = 4;
        volumeMamadaSugerido = 180; // 6 medidas (180 mL)
      } else {
        mamadasSugeridas = 3;
        volumeMamadaSugerido = 210; // 7 medidas (210 mL)
      }
    } else if (pesoKg) {
      // Estima volume baseado em ~120-150 mL/kg/dia dividido em 6-8 mamadas
      var volEstimadoDia = pesoKg * 135;
      mamadasSugeridas = pesoKg < 4 ? 8 : (pesoKg < 7 ? 6 : 5);
      var volPorMamadaCalculado = volEstimadoDia / mamadasSugeridas;
      // Arredonda para o múltiplo de 30 mais próximo
      volumeMamadaSugerido = Math.max(30, Math.round(volPorMamadaCalculado / 30) * 30);
    }

    var numMamadas = params.numeroMamadasDia ? Number(params.numeroMamadasDia) : mamadasSugeridas;
    var volumeDesejado = params.volumeMamadaMl ? Number(params.volumeMamadaMl) : volumeMamadaSugerido;

    // 2. Análise da Diluição e Múltiplo de 30 mL
    var resto30 = volumeDesejado % DILUICAO_PADRAO_ML_POR_MEDIDA;
    var ehMultiploExato = resto30 === 0;

    var medidasExatas = Math.floor(volumeDesejado / DILUICAO_PADRAO_ML_POR_MEDIDA);
    var volumeAguaExatoMl = volumeDesejado;
    var avisoFracionamento = null;

    if (!ehMultiploExato) {
      var multiploInferior = Math.max(30, Math.floor(volumeDesejado / 30) * 30);
      var multiploSuperior = multiploInferior + 30;
      var medInf = multiploInferior / 30;
      var medSup = multiploSuperior / 30;

      // Escolhe o mais próximo para o cálculo da mamada
      if (volumeDesejado - multiploInferior <= multiploSuperior - volumeDesejado) {
        medidasExatas = medInf;
        volumeAguaExatoMl = multiploInferior;
      } else {
        medidasExatas = medSup;
        volumeAguaExatoMl = multiploSuperior;
      }

      avisoFracionamento = '⚠️ VOLUME NÃO MÚLTIPLO DE 30 mL (' + volumeDesejado + ' mL): NUNCA divida medidas ao meio (ex: meia colher medidora), pois gera erro grave de osmolaridade! ' +
        'Recomendação: Para ofertar ' + volumeDesejado + ' mL, prepare ' + multiploSuperior + ' mL (' + medSup + ' medidas em ' + multiploSuperior + ' mL de água) e descarte o excedente após pronto; ou prepare ' + multiploInferior + ' mL (' + medInf + ' medidas em ' + multiploInferior + ' mL de água).';
    }

    // Volume final reconstituído (o pó desloca aproximadamente 0.7-0.8 mL por grama de pó = ~3 mL por medida)
    var volumeFinalAproximadoMl = volumeAguaExatoMl + (medidasExatas * 3);

    // Cálculos Energéticos e Volumétricos
    var kcalPorMamada = arred(volumeAguaExatoMl * densidadeKcalMl, 1);
    var volumeTotalDiaMl = volumeAguaExatoMl * numMamadas;
    var kcalTotalDia = arred(volumeTotalDiaMl * densidadeKcalMl, 1);

    var volumeMlKgDia = pesoKg ? arred(volumeTotalDiaMl / pesoKg, 1) : null;
    var kcalKgDia = pesoKg ? arred(kcalTotalDia / pesoKg, 1) : null;

    // Avaliação da Capacidade Gástrica Fisiológica
    var alertaCapacidadeGastrica = null;
    if (pesoKg) {
      var capacidadeMaxEstimada = arred(pesoKg * 30, 0); // ~30 mL/kg
      if (volumeAguaExatoMl > pesoKg * 35) {
        alertaCapacidadeGastrica = '🚨 SOBRECARGA GÁSTRICA POTENCIAL: O volume ofertado por mamada (' + volumeAguaExatoMl + ' mL) excede o limite gástrico fisiológico seguro (~30 mL/kg = ' + capacidadeMaxEstimada + ' mL para ' + pesoKg + ' kg). Risco aumentado de regurgitações, vômitos e broncoaspiração.';
      }
    }

    // Alertas de Segurança Clínica Beira-Leito
    var alertasSeguranca = [];
    if (avisoFracionamento) {
      alertasSeguranca.push(avisoFracionamento);
    }
    if (alertaCapacidadeGastrica) {
      alertasSeguranca.push(alertaCapacidadeGastrica);
    }

    // Regras Especiais por Idade e Tipo
    if (tipoChave === 'soja' && idadeMeses !== null && idadeMeses < 6) {
      alertasSeguranca.push('🚨 CONTRAINDICAÇÃO FORMAL (SBP/ESPGHAN): Fórmula de soja é CONTRAINDICADA em lactentes menores de 6 meses devido à alta concentração de isoflavonas/fitoestrógenos com atividade estrogênica e potencial de alergenicidade cruzada com a proteína do leite.');
    }

    if (tipoChave === 'sem_lactose') {
      alertasSeguranca.push('💡 INDICAÇÃO CLÍNICA: Fórmulas sem lactose (SL) são destinadas exclusivamente à intolerância secundária a carboidratos pós-gastroenterite. NÃO protegem nem tratam APLV.');
    }

    if (tipoChave === 'anti_regurgitacao') {
      alertasSeguranca.push('💡 FÓRMULA AR: Utilizar bicos com furo maior (para líquidos espessados). Contraindicada em prematuros pelo risco de bezoar e enterocolite.');
    }

    // Alerta de Hipodiluição e Hiperconcentração
    alertasSeguranca.push('⚠️ ALERTA CONTRA HIPODILUIÇÃO: Colocar mais água do que 30 mL por medida causa desnutrição calórico-proteica grave e hiponatremia dilucional aguda com risco de convulsões!');
    alertasSeguranca.push('⚠️ ALERTA CONTRA HIPERCONCENTRAÇÃO: Pressionar o pó na colher ou usar menos água causa sobrecarga renal de solutos, desidratação hipernatrêmica e constipação grave.');

    // 3. Guia de Preparo Seguro (OMS / FAO / SBP)
    var passosPreparo = [
      '1. Higienizar rigorosamente as mãos com água e sabão antes do manuseio.',
      '2. Esterilizar a mamadeira, o bico e a tampa (fervura por 5 a 10 minutos).',
      '3. Ferver água potável filtrada por 5 minutos e deixar amornar até aproximadamente 70°C (esta temperatura é mandatória para inativar patógenos como Cronobacter sakazakii e Salmonella enterica sem degradar vitaminas).',
      '4. Colocar PRIMEIRO o volume exato de água morna na mamadeira (' + volumeAguaExatoMl + ' mL).',
      '5. Adicionar ' + medidasExatas + ' medida(s) RASA(S) da fórmula infantil em pó. Nivele com as costas de uma faca limpa ou no nivelador da lata, SEM compactar ou pressionar o pó.',
      '6. Tampar e agitar vigorosamente até completa dissolução do pó.',
      '7. Resfriar rapidamente sob água corrente e testar a temperatura no dorso do pulso antes de ofertar (~37°C / morna ao toque).',
      '8. TEMPO E DESCARTE: Oferecer imediatamente. Consumir em no máximo 1 a 2 horas em temperatura ambiente. Sobras da mamada devem ser DESCARTADAS (risco de proliferação bacteriana após contato com a saliva). Se preparada com antecedência, conservar em geladeira (< 4°C) por no máximo 24 horas.'
    ];

    return {
      tipoFormula: configTipo.nome,
      chaveFormula: tipoChave,
      descricaoFormula: configTipo.descricao,
      pesoKg: pesoKg,
      idadeMeses: idadeMeses,
      prescricaoMamada: {
        volumeAguaMl: volumeAguaExatoMl,
        medidasRasas: medidasExatas,
        regraPadrao: '1 medida rasa para cada 30 mL de água',
        volumeFinalProntoAproxMl: volumeFinalAproximadoMl,
        caloriasPorMamadaKcal: kcalPorMamada
      },
      esquemaDiario: {
        numeroMamadasPorDia: numMamadas,
        intervaloHoras: arred(24 / numMamadas, 1),
        volumeTotalAguaDiaMl: volumeTotalDiaMl,
        caloriasTotalDiaKcal: kcalTotalDia,
        volumeMlKgDia: volumeMlKgDia,
        caloriasKcalKgDia: kcalKgDia
      },
      alertas: alertasSeguranca,
      passosPreparoSeguro: passosPreparo
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. AVALIAÇÃO INTEGRADA COMPLETA BEIRA-LEITO
  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Avaliação nutricional pediátrica abrangente combinando Holliday-Segar, metas e fórmulas.
   * @param {Object} params Parâmetros completos do paciente
   * @returns {Object} Relatório clínico detalhado e texto formatado
   */
  function avaliarSuporteNutricionalPediatricoCompleto(params) {
    params = params || {};
    var pesoKg = Number(params.pesoKg || 0);
    var idadeMeses = params.idadeMeses !== undefined && params.idadeMeses !== null ? Number(params.idadeMeses) : null;

    if (!pesoKg || pesoKg <= 0) {
      if (idadeMeses !== null) {
        // Estima peso por idade caso não fornecido (fórmulas práticas OMS/APLS)
        if (idadeMeses <= 3) pesoKg = 3.5 + (idadeMeses * 0.8);
        else if (idadeMeses <= 12) pesoKg = 3.5 + (idadeMeses * 0.6);
        else pesoKg = (idadeMeses / 12) * 2 + 8;
        pesoKg = arred(pesoKg, 1);
      } else {
        throw new Error('Peso em kg ou Idade em meses obrigatórios para avaliação de suporte nutricional pediátrico.');
      }
    }

    var condicaoClinica = params.condicaoClinica || 'manutencao_padrao';
    var temperaturaC = params.temperaturaC ? Number(params.temperaturaC) : null;
    var tipoFormula = params.tipoFormula || (idadeMeses !== null && idadeMeses >= 6 ? 'seguimento' : 'partida');

    // 1. Holliday-Segar
    var hs = calcularHollidaySegar(pesoKg, {
      condicaoClinica: condicaoClinica,
      temperaturaC: temperaturaC,
      percentualAjuste: params.percentualAjuste
    });

    // 2. Metas Nutricionais
    var metas = calcularMetasNutricionais(pesoKg, idadeMeses, condicaoClinica);

    // 3. Fórmula Infantil
    var formula = calcularDiluicaoFormula({
      pesoKg: pesoKg,
      idadeMeses: idadeMeses,
      tipoFormula: tipoFormula,
      volumeMamadaMl: params.volumeMamadaMl,
      numeroMamadasDia: params.numeroMamadasDia
    });

    // 4. Montagem do Resumo Clínico Estruturado
    var linhas = [];
    linhas.push('👶 <b>SUPORTE NUTRICIONAL EM PEDIATRIA & TERAPIA NUTRICIONAL</b>');
    linhas.push('──────────────────────────────────────');
    linhas.push('📋 <b>DADOS DO PACIENTE:</b>');
    linhas.push('• Peso: <b>' + fmt(pesoKg, 1) + ' kg</b>' + (params.pesoKg ? '' : ' <i>(estimado por idade)</i>'));
    if (idadeMeses !== null) {
      linhas.push('• Idade: <b>' + idadeMeses + ' meses</b> (' + metas.faixaEtaria + ')');
    }
    linhas.push('• Condição Clínica: <b>' + condicaoClinica + '</b>');
    linhas.push('');

    linhas.push('💧 <b>HIDRATAÇÃO VENOSA / MANUTENÇÃO (HOLLIDAY-SEGAR):</b>');
    linhas.push('• Volume Basal (100%): <b>' + hs.volumeBasal24h + ' mL/dia</b> (' + fmt(hs.volumeBasalMlKgDia, 1) + ' mL/kg/dia)');
    linhas.push('• Volume Ajustado (' + hs.percentualAplicado + '%): <b>' + hs.volumeAjustado24h + ' mL/dia</b> (' + fmt(hs.volumeAjustadoMlKgDia, 1) + ' mL/kg/dia)');
    linhas.push('• Vazão em Bomba de Infusão: <b>' + fmt(hs.vazaoHorariaMlH, 1) + ' mL/h</b>');
    linhas.push('• Regra 4-2-1 Basal: ' + fmt(hs.vazaoBasal421MlH, 1) + ' mL/h');
    linhas.push('• Justificativa: <i>' + hs.justificativaAjuste + '</i>');
    linhas.push('');

    linhas.push('⚡ <b>ELETRÓLITOS & APORTE DE GLICOSE (SBP / AAP):</b>');
    linhas.push('• Sódio (Na+): <b>' + fmt(hs.eletrolitos.sodioTotalMeqDia, 1) + ' mEq/dia</b> (' + fmt(hs.eletrolitos.sodioMeqKgDia, 2) + ' mEq/kg/dia)');
    linhas.push('  └ <i>' + hs.eletrolitos.orientacaoSodio + '</i>');
    linhas.push('• Potássio (K+): <b>' + fmt(hs.eletrolitos.potassioTotalMeqDia, 1) + ' mEq/dia</b> (' + fmt(hs.eletrolitos.potassioMeqKgDia, 2) + ' mEq/kg/dia)');
    linhas.push('  └ <i>' + hs.eletrolitos.orientacaoPotassio + '</i>');
    linhas.push('• TIG com SG 5%: <b>' + fmt(hs.glicoseTig.tigComSg5, 2) + ' mg/kg/min</b> (alvo: ' + hs.glicoseTig.faixaRecomendadaLactente + ')');
    linhas.push('');

    linhas.push('🍼 <b>PRESCRIÇÃO DE FÓRMULA INFANTIL:</b>');
    linhas.push('• Tipo: <b>' + formula.tipoFormula + '</b>');
    linhas.push('• Diluição Exata: <b>' + formula.prescricaoMamada.medidasRasas + ' medida(s) rasa(s)</b> em <b>' + formula.prescricaoMamada.volumeAguaMl + ' mL de água</b>');
    linhas.push('• Regra Beira-Leito: <i>' + formula.prescricaoMamada.regraPadrao + '</i>');
    linhas.push('• Volume por Mamada: ~' + formula.prescricaoMamada.volumeFinalProntoAproxMl + ' mL prontos (' + fmt(formula.prescricaoMamada.caloriasPorMamadaKcal, 0) + ' kcal)');
    linhas.push('• Fracionamento: <b>' + formula.esquemaDiario.numeroMamadasPorDia + ' mamadas/dia</b> (a cada ' + fmt(formula.esquemaDiario.intervaloHoras, 1) + 'h)');
    linhas.push('• Aporte Total Diário: <b>' + formula.esquemaDiario.volumeTotalAguaDiaMl + ' mL/dia</b> (' + fmt(formula.esquemaDiario.volumeMlKgDia, 1) + ' mL/kg/dia) | <b>' + fmt(formula.esquemaDiario.caloriasTotalDiaKcal, 0) + ' kcal/dia</b> (' + fmt(formula.esquemaDiario.caloriasKcalKgDia, 1) + ' kcal/kg/dia)');
    linhas.push('');

    linhas.push('🛡️ <b>ALERTAS DE SEGURANÇA & BOAS PRÁTICAS:</b>');
    for (var a = 0; a < formula.alertas.length; a++) {
      linhas.push('• ' + formula.alertas[a]);
    }
    for (var h = 0; h < hs.alertas.length; h++) {
      linhas.push('• ' + hs.alertas[h]);
    }

    var textoFormatado = linhas.join('\n');

    return {
      sucesso: true,
      pesoKg: pesoKg,
      idadeMeses: idadeMeses,
      hollidaySegar: hs,
      metasNutricionais: metas,
      formulaInfantil: formula,
      textoFormatado: textoFormatado
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. FORMATADOR PARA TELEGRAM
  // ───────────────────────────────────────────────────────────────────────────
  function formatarTextoTelegram(resultado) {
    if (!resultado || !resultado.sucesso) {
      return '❌ Erro ao processar cálculo nutricional pediátrico.';
    }
    return resultado.textoFormatado;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // EXPORTAÇÃO PÚBLICA
  // ───────────────────────────────────────────────────────────────────────────
  return {
    calcularHollidaySegar: calcularHollidaySegar,
    calcularMetasNutricionais: calcularMetasNutricionais,
    calcularDiluicaoFormula: calcularDiluicaoFormula,
    avaliarSuporteNutricionalPediatricoCompleto: avaliarSuporteNutricionalPediatricoCompleto,
    formatarTextoTelegram: formatarTextoTelegram,
    TIPOS_FORMULA: TIPOS_FORMULA,
    DILUICAO_PADRAO_ML_POR_MEDIDA: DILUICAO_PADRAO_ML_POR_MEDIDA
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SuporteNutricionalPediatricoService;
}
