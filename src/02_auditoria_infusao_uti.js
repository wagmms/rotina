/**
 * ==============================================================================
 * MÓDULO 02-E: AUDITORIA DE TOXICIDADE EM INFUSÕES CONTÍNUAS DE UTI
 * ==============================================================================
 * Motor determinístico de alta fidelidade para segurança farmacológica em terapia
 * intensiva e sala de emergência (UTI / Sala Vermelha):
 *  - Validação e limites de taxa de infusão (mcg/kg/min, UI/min, mcg/min).
 *  - Auditoria reversa de bomba beira-leito (mL/h → dose real entregue).
 *  - Cálculo de vazão segura com indicação de transição para solução concentrada.
 *  - Detecção imediata de erros por ordem de grandeza (10x) e doses potencialmente letais.
 *  - Diretrizes clínicas estritas: Surviving Sepsis Campaign 2021, ILAS, AHA, SBC.
 * ==============================================================================
 */

var AuditoriaInfusaoUtiService = (function () {
  'use strict';

  // ───────────────────────────────────────────────────────────────────────────
  // 1. BASE DE CONHECIMENTO DETERMINÍSTICA DE DROGAS DE INFUSÃO CONTÍNUA
  // ───────────────────────────────────────────────────────────────────────────
  var DROGAS = {
    noradrenalina: {
      id: 'noradrenalina',
      nome: 'Noradrenalina (Norepinefrina)',
      classe: 'Vasopressor de 1ª linha no Choque Séptico (Agonista Alfa-1 > Beta-1)',
      unidade: 'mcg/kg/min',
      depende_peso: true,
      preparos: {
        padrao: {
          nome: 'Padrão (1x)',
          mg: 16,
          vol_ml: 250,
          conc: 64,
          unidade_conc: 'mcg/mL',
          veiculo: 'SG5%',
          descricao: '4 ampolas (16 mg/16 mL) em 234 mL SG5% → Concentração: 64 mcg/mL'
        },
        concentrada: {
          nome: 'Concentrada (2x)',
          mg: 32,
          vol_ml: 250,
          conc: 128,
          unidade_conc: 'mcg/mL',
          veiculo: 'SG5%',
          descricao: '8 ampolas (32 mg/32 mL) em 218 mL SG5% → Concentração: 128 mcg/mL'
        },
        quadrupla: {
          nome: 'Superconcentrada / Quádrupla (4x)',
          mg: 64,
          vol_ml: 250,
          conc: 256,
          unidade_conc: 'mcg/mL',
          veiculo: 'SG5%',
          descricao: '16 ampolas (64 mg/64 mL) em 186 mL SG5% → Concentração: 256 mcg/mL (restrição hídrica severa)'
        }
      },
      limites: {
        dose_min: 0.01,
        dose_inicial_min: 0.05,
        dose_inicial_max: 0.10,
        dose_habitual_max: 0.50,
        dose_alerta_segundo_agente: 0.25, // SSC 2021: associar Vasopressina 0,03 UI/min
        dose_teto_recomendado: 1.00,
        dose_toxica: 1.00,
        dose_letal_ordem_grandeza: 2.00
      },
      doses_referencia: [0.05, 0.10, 0.20, 0.25, 0.50, 1.00],
      via_preferencial: 'Acesso Venoso Central (CVC). Em emergência, periférico calibroso proximal por até 12-24h com vigilância rigorosa.',
      antidoto_extravasamento: 'Fentolamina 5 a 10 mg diluída em 10 mL de SF0.9% infiltrada por via subcutânea no local do extravasamento em até 12h. Alternativa tópica: pasta de Nitroglicerina 2%.',
      incompatibilidades_criticas: [
        'Bicarbonato de Sódio 8,4% (meio alcalino inativa oxidativamente catecolaminas em Y-site)',
        'Soluções alcalinas (Fenitoína, Furosemida)'
      ],
      alertas_clinicos: [
        'Alvo primário: PAM ≥ 65 mmHg (ou 65-70 mmHg no choque séptico).',
        'Dose > 0,25 mcg/kg/min: Iniciar Vasopressina 0,03 UI/min imediatamente e avaliar Hidrocortisona 200 mg/dia (SSC 2021 / ILAS).',
        'Dose > 1,00 mcg/kg/min: Isquemia periférica grave, necrose de extremidades e hipoperfusão esplâncnica.',
        'Dose > 2,00 mcg/kg/min: Risco de dose letal ou erro de ordem de grandeza (10x).',
        '⚠️ CONDUTA EXCLUSIVA DE UTI TERCIÁRIA: Choque refratário a vasopressores em dose elevada exige leito de CTI imediato. Protocolos experimentais ou de resgate terciário (Azul de Metileno, ECMO venoarterial) são exclusivos de centros terciários intensivos e não devem ser manejados fora de CTI.'
      ]
    },

    vasopressina: {
      id: 'vasopressina',
      nome: 'Vasopressina (Arginina Vasopressina)',
      classe: 'Vasopressor não-adrenérgico de 2ª linha (Agonista dos receptores V1 vasculares)',
      unidade: 'UI/min',
      depende_peso: false,
      preparos: {
        padrao: {
          nome: 'Padrão (1x)',
          mg: 20, // 20 UI
          vol_ml: 100,
          conc: 0.2,
          unidade_conc: 'UI/mL',
          veiculo: 'SG5% ou SF0.9%',
          descricao: '1 ampola (20 UI/1 mL) em 99 mL SG5% ou SF0.9% → Concentração: 0,2 UI/mL'
        },
        concentrada: {
          nome: 'Concentrada (2x)',
          mg: 40, // 40 UI
          vol_ml: 100,
          conc: 0.4,
          unidade_conc: 'UI/mL',
          veiculo: 'SG5% ou SF0.9%',
          descricao: '2 ampolas (40 UI/2 mL) em 98 mL SG5% ou SF0.9% → Concentração: 0,4 UI/mL'
        }
      },
      limites: {
        dose_min: 0.01,
        dose_inicial_min: 0.01,
        dose_inicial_max: 0.03,
        dose_habitual_max: 0.03,
        dose_alerta_segundo_agente: 0.03,
        dose_teto_recomendado: 0.04,
        dose_toxica: 0.04,
        dose_letal_ordem_grandeza: 0.08
      },
      doses_referencia: [0.01, 0.02, 0.03, 0.04],
      via_preferencial: 'Acesso Venoso Central (CVC).',
      antidoto_extravasamento: 'Interrupção imediata, calor local e infiltração de vasodilatador periférico.',
      incompatibilidades_criticas: ['Compatível com a maioria das aminas; evitar em linha com soluções muito alcalinas.'],
      alertas_clinicos: [
        'REGRA DE OURO: NÃO TITULAR como catecolamina! Administrar em taxa fixa contínua de 0,03 UI/min (9,0 mL/h na solução padrão).',
        'Dose > 0,04 UI/min: CONTRAINDICADA. Provoca vasoconstrição coronariana grave, isquemia mesentérica aguda, necrose cutânea e arritmias sem ganho pressórico comprovado.',
        'Não utilizar como monoterapia vasopressora inicial em choque séptico.'
      ]
    },

    adrenalina: {
      id: 'adrenalina',
      nome: 'Adrenalina (Epinefrina)',
      classe: 'Vasopressor e Inotrópico potente (Agonista Alfa-1, Alfa-2, Beta-1, Beta-2)',
      unidade: 'mcg/kg/min',
      depende_peso: true,
      preparos: {
        padrao: {
          nome: 'Padrão (1x)',
          mg: 4,
          vol_ml: 250,
          conc: 16,
          unidade_conc: 'mcg/mL',
          veiculo: 'SG5%',
          descricao: '4 ampolas (4 mg/4 mL) em 246 mL SG5% → Concentração: 16 mcg/mL'
        },
        concentrada: {
          nome: 'Concentrada (2x)',
          mg: 8,
          vol_ml: 250,
          conc: 32,
          unidade_conc: 'mcg/mL',
          veiculo: 'SG5%',
          descricao: '8 ampolas (8 mg/8 mL) em 242 mL SG5% → Concentração: 32 mcg/mL'
        },
        quadrupla: {
          nome: 'Superconcentrada / Quádrupla (4x)',
          mg: 16,
          vol_ml: 250,
          conc: 64,
          unidade_conc: 'mcg/mL',
          veiculo: 'SG5%',
          descricao: '16 ampolas (16 mg/16 mL) em 234 mL SG5% → Concentração: 64 mcg/mL'
        }
      },
      limites: {
        dose_min: 0.01,
        dose_inicial_min: 0.02,
        dose_inicial_max: 0.05, // predomínio beta
        dose_habitual_max: 0.50, // predomínio alfa
        dose_alerta_segundo_agente: 0.50,
        dose_teto_recomendado: 1.00,
        dose_toxica: 1.00,
        dose_letal_ordem_grandeza: 1.50
      },
      doses_referencia: [0.02, 0.05, 0.10, 0.20, 0.50, 1.00],
      via_preferencial: 'Acesso Venoso Central (CVC). Em parada cardíaca ou anafilaxia refratária imediata pode-se usar via periférica ou IO.',
      antidoto_extravasamento: 'Fentolamina 5 a 10 mg diluída em 10 mL SF0.9% infiltrada localmente em até 12h.',
      incompatibilidades_criticas: [
        'Bicarbonato de Sódio (inativação imediata por alcalinização)',
        'Soluções alcalinas e Ampicilina'
      ],
      alertas_clinicos: [
        'Dose 0,01 a 0,05 mcg/kg/min: Efeito preferencialmente Beta-1/Beta-2 (inotropismo positivo, broncodilatação).',
        'Dose > 0,05 mcg/kg/min: Efeito Alfa-1 progressivo e vasoconstrição intensa.',
        'Dose > 0,50 mcg/kg/min: Risco acentuado de taquiarritmias ventriculares (FV/TV), isquemia miocárdica e hiperlactatemia glicolítica transitória.',
        'Dose > 1,50 mcg/kg/min: Risco de dose letal imediata ou erro grave de cálculo de bomba.'
      ]
    },

    dobutamina: {
      id: 'dobutamina',
      nome: 'Dobutamina',
      classe: 'Inotrópico / Inodilatador (Agonista Beta-1 adrenérgico com discreto efeito Beta-2 e Alfa-1)',
      unidade: 'mcg/kg/min',
      depende_peso: true,
      preparos: {
        padrao: {
          nome: 'Padrão (1x)',
          mg: 250,
          vol_ml: 250,
          conc: 1000,
          unidade_conc: 'mcg/mL',
          veiculo: 'SG5%',
          descricao: '1 ampola (250 mg/20 mL) em 230 mL SG5% → Concentração: 1000 mcg/mL (1 mg/mL)'
        },
        concentrada: {
          nome: 'Concentrada (2x)',
          mg: 500,
          vol_ml: 250,
          conc: 2000,
          unidade_conc: 'mcg/mL',
          veiculo: 'SG5%',
          descricao: '2 ampolas (500 mg/40 mL) em 210 mL SG5% → Concentração: 2000 mcg/mL (2 mg/mL)'
        }
      },
      limites: {
        dose_min: 2.50,
        dose_inicial_min: 2.50,
        dose_inicial_max: 5.00,
        dose_habitual_max: 15.00,
        dose_alerta_segundo_agente: 15.00,
        dose_teto_recomendado: 20.00,
        dose_toxica: 20.00,
        dose_letal_ordem_grandeza: 40.00
      },
      doses_referencia: [2.5, 5.0, 7.5, 10.0, 15.0, 20.0],
      via_preferencial: 'Acesso Venoso Central (CVC) preferencial; tolerado em veia periférica calibrosa bem puncionada.',
      antidoto_extravasamento: 'Suspensão da infusão, elevação de membro e compressas mornas.',
      incompatibilidades_criticas: [
        'Bicarbonato de Sódio e soluções alcalinas (degradação química)',
        'Furosemida, Heparina sódica'
      ],
      alertas_clinicos: [
        'Indicação: Disfunção miocárdica com baixo débito cardíaco (choque cardiogênico ou choque séptico com contratilidade deprimida).',
        'Cuidado com vasodilatação e hipotensão reflexa: se PAM < 65 mmHg, associar Noradrenalina antes de titular Dobutamina.',
        'Dose > 20 mcg/kg/min: Saturação de receptores Beta-1 com ausência de ganho inotrópico adicional, taquiarritmias ventriculares graves e aumento desproporcional do consumo miocárdico de O2.',
        'Dose > 40 mcg/kg/min: Toxicidade crítica com risco de colapso arrítmico ou erro de programação de bomba.'
      ]
    },

    nitroprussiato: {
      id: 'nitroprussiato',
      nome: 'Nitroprussiato de Sódio (Nipride)',
      classe: 'Vasodilatador misto arterial e venoso potente (Doador direto de Óxido Nítrico)',
      unidade: 'mcg/kg/min',
      depende_peso: true,
      preparos: {
        padrao: {
          nome: 'Padrão (1x)',
          mg: 50,
          vol_ml: 250,
          conc: 200,
          unidade_conc: 'mcg/mL',
          veiculo: 'SG5%',
          descricao: '1 ampola (50 mg/2 mL) em 248 mL SG5% → Concentração: 200 mcg/mL (frasco e equipo fotoprotetor obrigatório)'
        }
      },
      limites: {
        dose_min: 0.25,
        dose_inicial_min: 0.30,
        dose_inicial_max: 0.50,
        dose_habitual_max: 2.00,
        dose_alerta_segundo_agente: 2.00,
        dose_teto_recomendado: 5.00,
        dose_toxica: 5.00,
        dose_letal_ordem_grandeza: 10.00
      },
      doses_referencia: [0.3, 0.5, 1.0, 2.0, 3.0, 5.0],
      via_preferencial: 'Acesso Venoso Central ou periférico calibroso com linha arterial (PAI) contínua obrigatória.',
      antidoto_extravasamento: 'Toxicidade sistêmica por cianeto: Hidroxocobalamina 5g IV lento OU Nitrito de Sódio + Tiossulfato de Sódio.',
      incompatibilidades_criticas: ['Incompatível com a maioria dos outros fármacos em Y-site; equipo fotossensível obrigatório.'],
      alertas_clinicos: [
        'Uso com monitorização invasiva de PA (Linha Arterial / PAI) recomendada.',
        'Risco de Intoxicação por Cianeto e Tiocianato: Infusões > 2 mcg/kg/min por mais de 24-48h ou qualquer dose em disfunção renal/hepática.',
        'Sinais de alarme de toxicidade: Acidose láctica inexplicada, perda da resposta vasomotora e rebaixamento neurológico.'
      ]
    },

    nitroglicerina: {
      id: 'nitroglicerina',
      nome: 'Nitroglicerina (Tridil)',
      classe: 'Vasodilatador venoso e coronariano (Nitrato orgânico)',
      unidade: 'mcg/min',
      depende_peso: false,
      preparos: {
        padrao: {
          nome: 'Padrão (1x)',
          mg: 50,
          vol_ml: 250,
          conc: 200,
          unidade_conc: 'mcg/mL',
          veiculo: 'SG5% ou SF0.9%',
          descricao: '1 ampola (50 mg/10 mL) em 240 mL SG5% ou SF0.9% → Concentração: 200 mcg/mL (frasco de vidro/polietileno)'
        }
      },
      limites: {
        dose_min: 5.0,
        dose_inicial_min: 5.0,
        dose_inicial_max: 10.0,
        dose_habitual_max: 50.0,
        dose_alerta_segundo_agente: 100.0,
        dose_teto_recomendado: 200.0,
        dose_toxica: 200.0,
        dose_letal_erro: 400.0
      },
      doses_referencia: [5, 10, 20, 30, 50, 100, 200],
      via_preferencial: 'Acesso Venoso Periférico calibroso ou Central (equipo e frasco não-PVC).',
      antidoto_extravasamento: 'Suspensão da infusão e elevação dos membros inferiores se hipotensão.',
      incompatibilidades_criticas: ['Adsorção em equipos comuns de PVC (usar equipo e frasco de polietileno/vidro).'],
      alertas_clinicos: [
        'CONTRAINDICAÇÃO ABSOLUTA: Uso de inibidores da Fosfodiesterase-5 (Sildenafila < 24h ou Tadalafila < 48h) pelo risco de choque refratário e óbito.',
        'Contraindicado em Infarto de Ventrículo Direito (dependente de pré-carga) e PAS < 90 mmHg.',
        'Efeito colateral comum: Cefaleia pulsátil intensa e taquifilaxia (tolerância após 24-48h de infusão).'
      ]
    },

    milrinona: {
      id: 'milrinona',
      nome: 'Milrinona (Primacor)',
      classe: 'Inodilatador (Inibidor da Fosfodiesterase-3 / PDE-3)',
      unidade: 'mcg/kg/min',
      depende_peso: true,
      preparos: {
        padrao: {
          nome: 'Padrão (1x)',
          mg: 20,
          vol_ml: 100,
          conc: 200,
          unidade_conc: 'mcg/mL',
          veiculo: 'SG5% ou SF0.9%',
          descricao: '1 ampola (20 mg/20 mL) em 80 mL SG5% ou SF0.9% → Concentração: 200 mcg/mL'
        }
      },
      limites: {
        dose_min: 0.25,
        dose_inicial_min: 0.375,
        dose_inicial_max: 0.50,
        dose_habitual_max: 0.75,
        dose_alerta_segundo_agente: 0.75,
        dose_teto_recomendado: 0.75,
        dose_toxica: 0.75,
        dose_letal_ordem_grandeza: 1.50
      },
      doses_referencia: [0.375, 0.50, 0.75],
      via_preferencial: 'Acesso Venoso Central (CVC).',
      antidoto_extravasamento: 'Suporte pressórico imediato com Noradrenalina se hipotensão profunda.',
      incompatibilidades_criticas: ['Furosemida em Y-site (precipitação imediata).'],
      alertas_clinicos: [
        'Ajuste obrigatório para função renal (ClCr < 50 mL/min): meia-vida prolongada e acúmulo tóxico.',
        'Evitar dose de ataque venosa (bolus) na maioria dos pacientes para prevenir hipotensão abrupta.',
        'Risco de taquiarritmias ventriculares e hipotensão por vasodilatação sistêmica.'
      ]
    }
  };

  // Mapeamento de sinônimos / aliases
  var ALIASES = {
    noradrenalina: 'noradrenalina',
    norepinefrina: 'noradrenalina',
    nora: 'noradrenalina',
    levophed: 'noradrenalina',

    vasopressina: 'vasopressina',
    vaso: 'vasopressina',
    pitressin: 'vasopressina',
    enapress: 'vasopressina',

    adrenalina: 'adrenalina',
    adrena: 'adrenalina',
    epinefrina: 'adrenalina',
    epi: 'adrenalina',

    dobutamina: 'dobutamina',
    dobuta: 'dobutamina',
    dobutrex: 'dobutamina',

    nitroprussiato: 'nitroprussiato',
    nitroprussiato_sodio: 'nitroprussiato',
    nipride: 'nitroprussiato',

    nitroglicerina: 'nitroglicerina',
    tridil: 'nitroglicerina',

    milrinona: 'milrinona',
    primacor: 'milrinona'
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 2. FUNÇÕES AUXILIARES DE NORMALIZAÇÃO E SANITIZAÇÃO
  // ───────────────────────────────────────────────────────────────────────────
  function normalizarDroga(termo) {
    if (!termo || typeof termo !== 'string') return null;
    var t = termo.toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
    for (var k in ALIASES) {
      var kNorm = k.replace(/[^a-z0-9]/g, '');
      if (t === kNorm || t.indexOf(kNorm) === 0) {
        return ALIASES[k];
      }
    }
    return null;
  }

  function obterPerfilDroga(chaveDroga) {
    var id = normalizarDroga(chaveDroga);
    return id ? DROGAS[id] : null;
  }

  function sanitizarPeso(peso) {
    if (peso === null || peso === undefined) return null;
    var num = typeof peso === 'number' ? peso : parseFloat(String(peso).replace(',', '.'));
    if (isNaN(num) || !isFinite(num)) return null;
    if (num < 30 || num > 350) return null; // limites clínicos para UTI adulto
    return Math.round(num * 10) / 10;
  }

  function sanitizarNumero(valor, min, max) {
    if (valor === null || valor === undefined) return null;
    var num = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(',', '.'));
    if (isNaN(num) || !isFinite(num)) return null;
    if (min !== undefined && num < min) return null;
    if (max !== undefined && num > max) return null;
    return num;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. AUDITORIA DE VAZÃO DA BOMBA (mL/h → mcg/kg/min ou UI/min)
  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Converte a taxa de vazão programada na bomba de infusão (mL/h) para a dose real entregue.
   * Classifica a dose segundo limites de segurança estritos e alerta sobre ordens de grandeza.
   *
   * @param {Object} params
   * @param {string} params.droga Nome da droga ('noradrenalina', 'vaso', 'dobuta', etc.)
   * @param {number} [params.pesoKg] Peso do paciente em kg (obrigatório se depende_peso)
   * @param {number} params.vazaoMlH Vazão programada na bomba em mL/h
   * @param {string|number} [params.solucaoOuConc='padrao'] 'padrao', 'concentrada', 'quadrupla' ou valor numérico da conc
   * @returns {Object} Diagnóstico determinístico de segurança da infusão
   */
  function auditarVazaoBomba(params) {
    if (!params || typeof params !== 'object') {
      throw new Error('Parâmetros de auditoria inválidos. Forneça um objeto com droga e vazão.');
    }

    var drogaId = normalizarDroga(params.droga);
    if (!drogaId) {
      throw new Error('Droga não reconhecida para auditoria de UTI. Opções: Noradrenalina, Vasopressina, Adrenalina, Dobutamina, Nitroprussiato, Nitroglicerina, Milrinona.');
    }

    var config = DROGAS[drogaId];
    var peso = null;
    if (config.depende_peso) {
      peso = sanitizarPeso(params.pesoKg);
      if (peso === null) {
        throw new Error('Peso inválido ou ausente para ' + config.nome + '. Informe um peso de 30 a 350 kg.');
      }
    }

    var vazao = sanitizarNumero(params.vazaoMlH, 0.01, 1000);
    if (vazao === null) {
      throw new Error('Vazão da bomba inválida. Informe um valor numérico positivo em mL/h.');
    }

    // Identifica concentração
    var conc = null;
    var tipoPreparo = 'padrao';
    var textoPreparo = '';

    if (typeof params.solucaoOuConc === 'number' && params.solucaoOuConc > 0) {
      conc = params.solucaoOuConc;
      tipoPreparo = 'manual';
      textoPreparo = 'Concentração personalizada: ' + conc + ' ' + (config.preparos.padrao.unidade_conc || 'mcg/mL');
    } else {
      var solStr = String(params.solucaoOuConc || 'padrao').toLowerCase();
      if (/concentrad[ao]|2x|dupla/i.test(solStr) && config.preparos.concentrada) {
        tipoPreparo = 'concentrada';
      } else if (/quadrupla|super|4x/i.test(solStr) && config.preparos.quadrupla) {
        tipoPreparo = 'quadrupla';
      } else {
        tipoPreparo = 'padrao';
      }
      var prepObj = config.preparos[tipoPreparo];
      conc = prepObj.conc;
      textoPreparo = prepObj.descricao;
    }

    // Cálculo da dose entregue
    // Se depende de peso: dose = (vazao * conc) / (peso * 60)
    // Se fixa: dose = (vazao * conc) / 60
    var doseCalculada = 0;
    if (config.depende_peso) {
      doseCalculada = (vazao * conc) / (peso * 60);
    } else {
      doseCalculada = (vazao * conc) / 60;
    }
    doseCalculada = Math.round(doseCalculada * 1000) / 1000;

    // Classificação de risco determinística
    var limites = config.limites;
    var nivelRisco = '';
    var statusSeguranca = '';
    var suspeitaErroOrdemGrandeza = false;
    var alertaCritico = false;
    var mensagensAlerta = [];
    var recomendacoes = [];

    if (doseCalculada < limites.dose_min) {
      nivelRisco = 'SUBTERAPEUTICA';
      statusSeguranca = '⚠️ Dose Abaixo do Limite Terapêutico';
      mensagensAlerta.push('Dose calculada (' + doseCalculada + ' ' + config.unidade + ') está abaixo do limite mínimo habitual (' + limites.dose_min + ' ' + config.unidade + ').');
      recomendacoes.push('Verificar se o objetivo é desmame final ou se há erro de taxa mínima na bomba.');
    } else if (doseCalculada <= limites.dose_inicial_max) {
      nivelRisco = 'TERAPEUTICA_INICIAL';
      statusSeguranca = '✅ Faixa Terapêutica Inicial Segura';
      mensagensAlerta.push('Dose em faixa inicial padrão (' + limites.dose_inicial_min + ' a ' + limites.dose_inicial_max + ' ' + config.unidade + ').');
      recomendacoes.push('Titular progressivamente conforme metas hemodinâmicas beira-leito (PAM ≥ 65 mmHg).');
    } else if (doseCalculada <= limites.dose_habitual_max) {
      nivelRisco = 'TERAPEUTICA_HABITUAL';
      statusSeguranca = '✅ Faixa Terapêutica Habitual';
      mensagensAlerta.push('Dose dentro da faixa terapêutica intermediária esperada para choque/instabilidade.');
      recomendacoes.push('Manter monitorização hemodinâmica contínua e perfusão tecidual (lactato, diurese, tempo de enchimento capilar).');
    } else if (doseCalculada <= limites.dose_teto_recomendado) {
      nivelRisco = 'ALERTA_DOSE_ELEVADA';
      statusSeguranca = '⚠️ ALERTA: Dose Elevada / Suporte Intensivo';
      alertaCritico = true;
      mensagensAlerta.push('Dose elevada (' + doseCalculada + ' ' + config.unidade + '). Próxima do teto máximo recomendado (' + limites.dose_teto_recomendado + ' ' + config.unidade + ').');
      recomendacoes.push('Atenção para vasoconstrição periférica intensa, isquemia de extremidades ou arritmias.');
    } else if (doseCalculada <= limites.dose_letal_erro) {
      nivelRisco = 'CRITICA_TOXICA';
      statusSeguranca = '🚨 PERIGO: Dose Supraterapêutica / Toxicidade Iminente';
      alertaCritico = true;
      mensagensAlerta.push('Dose calculada (' + doseCalculada + ' ' + config.unidade + ') EXCEDE o teto de segurança clínica (' + limites.dose_teto_recomendado + ' ' + config.unidade + ').');
      recomendacoes.push('Alto risco de isquemia tecidual grave, arritmias ventriculares fatais e falência de múltiplos órgãos.');
    } else {
      nivelRisco = 'LETAL_ORDEM_GRANDEZA';
      statusSeguranca = '☠️ ALERTA VERMELHO: DOSE POTENCIALMENTE LETAL / ERRO DE ORDEM DE GRANDEZA (10x)';
      alertaCritico = true;
      suspeitaErroOrdemGrandeza = true;
      mensagensAlerta.push('ATENÇÃO EXTREMA: A dose de ' + doseCalculada + ' ' + config.unidade + ' supera em ' + Math.round((doseCalculada / limites.dose_teto_recomendado) * 100) + '% o teto de segurança!');
      mensagensAlerta.push('SUSPEITA GRAVE DE ERRO BEIRA-LEITO: Erro clássico de digitação por ordem de grandeza (10x) na bomba de infusão ou confusão entre taxa em mL/h e dose em mcg/kg/min.');
      recomendacoes.push('INTERROMPA IMEDIATAMENTE A INFUSÃO OU CONFIGURE A VAZÃO CORRETA ANTES DA ADMINISTRAÇÃO!');
    }

    // Regras farmacológicas específicas de diretrizes (SSC, ILAS, AHA)
    if (drogaId === 'noradrenalina') {
      if (doseCalculada >= limites.dose_alerta_segundo_agente && doseCalculada <= limites.dose_teto_recomendado) {
        mensagensAlerta.push('👉 DIRETRIZ SSC 2021: Noradrenalina ≥ 0,25 mcg/kg/min. Indicação formal de associar Vasopressina fixa a 0,03 UI/min (9 mL/h) como agente poupador de catecolamina e avaliar Hidrocortisona 200 mg/dia.');
      }
    } else if (drogaId === 'vasopressina') {
      if (doseCalculada > 0.04) {
        alertaCritico = true;
        mensagensAlerta.push('👉 TOXICIDADE VASCULAR CORONARIANA E MESENTÉRICA: Vasopressina > 0,04 UI/min é CONTRAINDICADA. NÃO deve ser titulada como catecolamina. Reduza para a taxa fixa recomendada de 0,03 UI/min (9 mL/h na solução padrão).');
      }
    } else if (drogaId === 'dobutamina') {
      if (doseCalculada > 20) {
        alertaCritico = true;
        mensagensAlerta.push('👉 TOXICIDADE MIOCÁRDICA: Dobutamina > 20 mcg/kg/min causa saturação de receptores Beta-1, sem benefício inotrópico e com aumento letal do consumo de O2 e taquiarritmias ventriculares.');
      }
    } else if (drogaId === 'adrenalina') {
      if (doseCalculada > 0.50) {
        mensagensAlerta.push('👉 MONITORAR LACTATO E ECG: Doses elevadas de Adrenalina causam hiperlactatemia aeróbia e arritmogênese severa.');
      }
    }

    // Análise de otimização de volume / troca para solução concentrada
    var recomendacaoConcentracao = null;
    if (vazao >= 35 && tipoPreparo === 'padrao' && config.preparos.concentrada) {
      recomendacaoConcentracao = {
        sugerir_troca: true,
        motivo: 'Vazão elevada (' + vazao + ' mL/h). Risco de sobrecarga hídrica desnecessária.',
        preparo_sugerido: config.preparos.concentrada.nome,
        vazao_equivalente_ml_h: Math.round(((vazao * conc) / config.preparos.concentrada.conc) * 10) / 10
      };
      recomendacoes.push('Considerar transição para SOLUÇÃO CONCENTRADA (2x): reduz a vazão da bomba de ' + vazao + ' mL/h para ' + recomendacaoConcentracao.vazao_equivalente_ml_h + ' mL/h, preservando balanço hídrico.');
    }

    // Alerta de vazão muito baixa (< 0.5 - 1.0 mL/h)
    if (vazao < 1.0) {
      mensagensAlerta.push('⚠️ VAZÃO MUITO BAIXA (< 1 mL/h): Risco de interrupção de fluxo na bomba e oclusão de cateter.');
      if (tipoPreparo !== 'padrao') {
        recomendacoes.push('Avaliar retorno para a Solução Padrão para aumentar a taxa volumétrica e garantir infusão contínua estável.');
      }
    }

    return {
      droga_id: drogaId,
      nome_droga: config.nome,
      classe: config.classe,
      unidade_dose: config.unidade,
      depende_peso: config.depende_peso,
      peso_kg: peso,
      vazao_bomba_ml_h: vazao,
      concentracao: conc,
      unidade_concentracao: config.preparos.padrao.unidade_conc || 'mcg/mL',
      tipo_preparo: tipoPreparo,
      descricao_preparo: textoPreparo,
      dose_entregue: doseCalculada,
      nivel_risco: nivelRisco,
      status_seguranca: statusSeguranca,
      alerta_critico: alertaCritico,
      suspeita_erro_ordem_grandeza: suspeitaErroOrdemGrandeza,
      mensagens_alerta: mensagensAlerta,
      recomendacoes: recomendacoes,
      recomendacao_concentracao: recomendacaoConcentracao,
      via_preferencial: config.via_preferencial,
      antidoto_extravasamento: config.antidoto_extravasamento,
      incompatibilidades_criticas: config.incompatibilidades_criticas
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. CÁLCULO DE VAZÃO SEGURA (mcg/kg/min ou UI/min → mL/h na Bomba)
  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Calcula a vazão em mL/h para programar na bomba de infusão garantindo tetos de segurança.
   *
   * @param {Object} params
   * @param {string} params.droga
   * @param {number} [params.pesoKg]
   * @param {number} params.doseAlvo Dose desejada em mcg/kg/min (ou UI/min, mcg/min)
   * @param {string} [params.solucao='padrao'] 'padrao', 'concentrada', 'quadrupla'
   * @returns {Object}
   */
  function calcularVazaoSegura(params) {
    if (!params || typeof params !== 'object') {
      throw new Error('Parâmetros inválidos. Forneça droga e dose desejada.');
    }

    var drogaId = normalizarDroga(params.droga);
    if (!drogaId) {
      throw new Error('Droga não reconhecida para cálculo de infusão de UTI.');
    }

    var config = DROGAS[drogaId];
    var peso = null;
    if (config.depende_peso) {
      peso = sanitizarPeso(params.pesoKg);
      if (peso === null) {
        throw new Error('Peso inválido ou ausente para ' + config.nome + ' (esperado de 30 a 350 kg).');
      }
    }

    var doseAlvo = sanitizarNumero(params.doseAlvo, 0.001, 1000);
    if (doseAlvo === null) {
      throw new Error('Dose alvo inválida.');
    }

    var solStr = String(params.solucao || 'padrao').toLowerCase();
    var tipoPreparo = 'padrao';
    if (/concentrad[ao]|2x|dupla/i.test(solStr) && config.preparos.concentrada) {
      tipoPreparo = 'concentrada';
    } else if (/quadrupla|super|4x/i.test(solStr) && config.preparos.quadrupla) {
      tipoPreparo = 'quadrupla';
    }
    var prepObj = config.preparos[tipoPreparo];
    var conc = prepObj.conc;

    // Cálculo da vazão:
    // Se depende de peso: vazao = (dose * peso * 60) / conc
    // Se fixa: vazao = (dose * 60) / conc
    var vazao = 0;
    if (config.depende_peso) {
      vazao = (doseAlvo * peso * 60) / conc;
    } else {
      vazao = (doseAlvo * 60) / conc;
    }
    var vazaoArred = Math.round(vazao * 10) / 10;

    // Audita a dose pretendida
    var audit = auditarVazaoBomba({
      droga: drogaId,
      pesoKg: peso,
      vazaoMlH: vazaoArred,
      solucaoOuConc: tipoPreparo
    });

    return {
      droga_id: drogaId,
      nome_droga: config.nome,
      dose_solicitada: doseAlvo,
      unidade_dose: config.unidade,
      peso_kg: peso,
      tipo_preparo: tipoPreparo,
      descricao_preparo: prepObj.descricao,
      vazao_ml_h: vazaoArred,
      status_seguranca: audit.statusSeguranca,
      nivel_risco: audit.nivelRisco,
      alerta_critico: audit.alertaCritico,
      suspeita_erro_ordem_grandeza: audit.suspeitaErroOrdemGrandeza,
      mensagens_alerta: audit.mensagensAlerta,
      recomendacoes: audit.recomendacoes,
      recomendacao_concentracao: audit.recomendacaoConcentracao
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. AUDITORIA DE PRESCRIÇÃO MÚLTIPLA / SÍNDROME DO CHOQUE EM UTI
  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Avalia um conjunto de drogas vasoativas administradas simultaneamente ao mesmo paciente.
   *
   * @param {Object} dados
   * @param {number} dados.pesoKg
   * @param {Array<Object>} dados.infusoes Array com { droga, vazaoMlH, solucao }
   * @returns {Object} Diagnóstico global de segurança de suporte vasoativo
   */
  function auditarPrescricaoMultipla(dados) {
    if (!dados || !Array.isArray(dados.infusoes) || dados.infusoes.length === 0) {
      throw new Error('Informe a lista de infusões ativas para auditoria múltipla.');
    }

    var peso = sanitizarPeso(dados.pesoKg);
    var resultadosIndividuais = [];
    var mapaDrogas = {};
    var alertasGlobais = [];

    dados.infusoes.forEach(function (inf) {
      try {
        var res = auditarVazaoBomba({
          droga: inf.droga,
          pesoKg: peso,
          vazaoMlH: inf.vazaoMlH,
          solucaoOuConc: inf.solucao || 'padrao'
        });
        resultadosIndividuais.push(res);
        mapaDrogas[res.droga_id] = res;
      } catch (e) {
        resultadosIndividuais.push({
          droga: inf.droga,
          erro: e.message
        });
      }
    });

    // Análise de Sinergismo e Estratégia de Vasopressores (SSC 2021)
    var temNora = mapaDrogas.noradrenalina;
    var temVaso = mapaDrogas.vasopressina;
    var temAdrena = mapaDrogas.adrenalina;
    var temDobuta = mapaDrogas.dobutamina;

    // 1. Noradrenalina elevada sem 2º vasopressor
    if (temNora && temNora.dose_entregue >= 0.25 && !temVaso) {
      alertasGlobais.push('🚨 SSC 2021 / ILAS: Noradrenalina em dose moderada a alta (' + temNora.dose_entregue + ' mcg/kg/min) SEM Vasopressina associada. Recomenda-se iniciar Vasopressina fixa a 0,03 UI/min (9 mL/h) como poupador de catecolamina.');
    }

    // 2. Vasopressina utilizada como vasopressor único
    if (temVaso && !temNora && !temAdrena) {
      alertasGlobais.push('⚠️ Vasopressina em infusão isolada sem catecolamina vasopressora primária. Não é recomendado o uso isolado de Vasopressina como 1ª linha em choque séptico.');
    }

    // 3. Noradrenalina + Dobutamina (choque séptico com disfunção miocárdica ou choque cardiogênico)
    if (temNora && temDobuta) {
      alertasGlobais.push('💡 Associação Vasopressor + Inotrópico (Nora + Dobuta): Monitorar PAM ≥ 65 mmHg e sinais de melhora de débito (ScvO2 ≥ 70%, clearance de lactato, diurese).');
    }

    // 4. Choque refratário com altas doses
    var suporteVasoativoPesado = false;
    if ((temNora && temNora.dose_entregue >= 0.5) || (temAdrena && temAdrena.dose_entregue >= 0.5)) {
      suporteVasoativoPesado = true;
      alertasGlobais.push('🚨 CHOQUE REFRATÁRIO SEVERO: Altas doses de catecolaminas. Indicação formal de avaliação de Hidrocortisona 200 mg/dia (em infusão contínua ou 50 mg IV 6/6h), ecocardiograma beira-leito (POCUS) para avaliar função ventricular e descartar tamponamento/pneumotórax.');
    }

    // 5. Incompatibilidades de via venosa e Bicarbonato
    if (dados.solucoes_concomitantes && Array.isArray(dados.solucoes_concomitantes)) {
      var temBicarbonato = dados.solucoes_concomitantes.some(function (s) {
        return /bicarbonato/i.test(s);
      });
      if (temBicarbonato && (temNora || temAdrena || temDobuta)) {
        alertasGlobais.push('☠️ CONTRAINDICAÇÃO ABSOLUTA DE Y-SITE: Bicarbonato de Sódio em infusão concomitante com Catecolaminas. O meio alcalino inativa quimicamente e degrada Noradrenalina, Adrenalina e Dobutamina.');
      }
    }

    return {
      peso_kg: peso,
      total_infusoes: resultadosIndividuais.length,
      infusoes: resultadosIndividuais,
      alertas_globais: alertasGlobais,
      suporte_vasoativo_pesado: suporteVasoativoPesado
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. GERADOR DE TABELA DE TITULAÇÃO DETERMINÍSTICA
  // ───────────────────────────────────────────────────────────────────────────
  function gerarTabelaTitulacao(droga, pesoKg, solucao) {
    var drogaId = normalizarDroga(droga);
    if (!drogaId) throw new Error('Droga não reconhecida.');
    var config = DROGAS[drogaId];

    var peso = null;
    if (config.depende_peso) {
      peso = sanitizarPeso(pesoKg);
      if (peso === null) throw new Error('Peso inválido para ' + config.nome);
    }

    var solStr = String(solucao || 'padrao').toLowerCase();
    var tipoPreparo = 'padrao';
    if (/concentrad[ao]|2x|dupla/i.test(solStr) && config.preparos.concentrada) {
      tipoPreparo = 'concentrada';
    } else if (/quadrupla|super|4x/i.test(solStr) && config.preparos.quadrupla) {
      tipoPreparo = 'quadrupla';
    }
    var prepObj = config.preparos[tipoPreparo];
    var conc = prepObj.conc;

    var linhas = config.doses_referencia.map(function (dose) {
      var mlH = 0;
      if (config.depende_peso) {
        mlH = (dose * peso * 60) / conc;
      } else {
        mlH = (dose * 60) / conc;
      }
      mlH = Math.round(mlH * 10) / 10;

      var tag = 'Habitual';
      if (dose <= config.limites.dose_inicial_max) tag = 'Inicial';
      else if (dose === config.limites.dose_alerta_segundo_agente) tag = 'Alerta / Associar 2º Agente';
      else if (dose >= config.limites.dose_teto_recomendado) tag = 'Teto / Risco Tóxico';

      return {
        dose: dose,
        unidade_dose: config.unidade,
        vazao_ml_h: mlH,
        classificacao: tag
      };
    });

    return {
      droga: config.nome,
      unidade: config.unidade,
      peso_kg: peso,
      preparo: prepObj.descricao,
      tabela: linhas
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 7. FORMATADOR DE RELATÓRIO CLÍNICO (MARKDOWN / TELEGRAM / PEP)
  // ───────────────────────────────────────────────────────────────────────────
  function formatarRelatorioAuditoria(resultado) {
    if (!resultado || !resultado.nome_droga) return 'Dados insuficientes para exibição.';

    var txt = '💉 *AUDITORIA DE INFUSÃO DE UTI — BEIRA-LEITO*\n\n';
    txt += '• *Fármaco:* `' + resultado.nome_droga + '`\n';
    if (resultado.depende_peso) {
      txt += '• *Peso do Paciente:* `' + resultado.peso_kg + ' kg`\n';
    }
    txt += '• *Preparo:* `' + resultado.descricao_preparo + '`\n';
    txt += '• *Vazão na Bomba:* `' + resultado.vazao_bomba_ml_h + ' mL/h`\n';
    txt += '• *Dose Entregue:* `' + resultado.dose_entregue + ' ' + resultado.unidade_dose + '`\n\n';

    txt += '*STATUS DE SEGURANÇA:*\n' + resultado.statusSeguranca + '\n\n';

    if (resultado.mensagens_alerta && resultado.mensagens_alerta.length > 0) {
      txt += '*ALERTAS FARMACOLÓGICOS:*\n';
      resultado.mensagens_alerta.forEach(function (m) {
        txt += '• ' + m + '\n';
      });
      txt += '\n';
    }

    if (resultado.recomendacoes && resultado.recomendacoes.length > 0) {
      txt += '*CONDUTAS RECOMENDADAS:*\n';
      resultado.recomendacoes.forEach(function (r) {
        txt += '👉 ' + r + '\n';
      });
      txt += '\n';
    }

    if (resultado.antidoto_extravasamento) {
      txt += '🚨 *Extravasamento Periférico:* ' + resultado.antidoto_extravasamento + '\n';
    }

    return txt.trim();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // EXPORTAÇÃO PÚBLICA
  // ───────────────────────────────────────────────────────────────────────────
  return {
    DROGAS: DROGAS,
    normalizarDroga: normalizarDroga,
    obterPerfilDroga: obterPerfilDroga,
    auditarVazaoBomba: auditarVazaoBomba,
    calcularVazaoSegura: calcularVazaoSegura,
    auditarPrescricaoMultipla: auditarPrescricaoMultipla,
    gerarTabelaTitulacao: gerarTabelaTitulacao,
    formatarRelatorioAuditoria: formatarRelatorioAuditoria
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuditoriaInfusaoUtiService;
}
