/**
 * ==============================================================================
 * ULTRA ROTINA - MÓDULO DE INFECTOLOGIA & OBSTETRÍCIA
 * ==============================================================================
 * Rastreamento e Manejo de Toxoplasmose Aguda na Gestação
 * Diretrizes Ministério da Saúde (MS 2022/2024), FEBRASGO (2023), ACOG e CDC.
 * 
 * Escopo:
 * - Interpretação sorológica (IgG, IgM e Teste de Avidez de IgG no 1º trimestre)
 * - Início precoce de Espiramicina 1g VO 8/8h para prevenção de transmissão vertical
 * - Diagnóstico de infecção fetal por PCR no líquido amniótico (amniocentese >= 18 semanas)
 * - Tratamento fetal intraútero com Esquema Tríplice (Sulfadiazina + Pirimetamina + Ácido Folínico)
 * - Manejo seguro próximo ao termo (>= 37 semanas) para prevenção de Kernicterus
 * - Esquema alternativo para pacientes alérgicas a Sulfonamidas (Clindamicina)
 * ==============================================================================
 */

var ObstetriciaToxoplasmoseService = (function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. CONSTANTES CLÍNICAS E REFERÊNCIAS
  // ═══════════════════════════════════════════════════════════════════════════

  var REFERENCIAS = [
    'Ministério da Saúde (Brasil). Protocolo de Notificação e Investigação: Toxoplasmose Gestacional e Congênita (2022).',
    'FEBRASGO. Toxoplasmose na Gestação — Protocolo Oficial da Comissão Nacional Especializada em Infectologia Pediátrica e Obstétrica (2023).',
    'ACOG Practice Bulletin No. 151: Cytomegalovirus, Parvovirus B19, Varicella Zoster, and Toxoplasmosis in Pregnancy (2015, reaff. 2023).',
    'Montoya JG, Remington JS. Management of Toxoplasma gondii infection during pregnancy. Clin Infect Dis 2008;47(4):554-566.',
    'Robert-Gangneux F, Dardé ML. Epidemiology of and diagnostic strategies for toxoplasmosis. Clin Microbiol Rev 2012;25(2):264-296.'
  ];

  var ESQUEMAS_MEDICAMENTOSOS = {
    ESPIRAMICINA: {
      fase: 'Prevenção de Transmissão Vertical (Profilaxia Fetal)',
      indicacao: 'Infecção aguda materna suspeita ou confirmada sem evidência de infecção fetal (PCR LA negativo ou amniocentese pendente).',
      medicamentos: [
        {
          farmaco: 'Espiramicina',
          apresentacao: 'Comprimidos de 500 mg (1.500.000 UI)',
          dose: '1 g (3.000.000 UI - 2 comprimidos)',
          via: 'VO',
          frequencia: 'A cada 8 horas (total: 3g/dia)',
          duracao: 'Até o final da gestação (ou até substituição pelo esquema tríplice se PCR fetal positivo)',
          observacao: 'Concentra-se na placenta prevenindo a passagem do parasita, mas tem baixa passagem transplacentária para o feto; NÃO trata infecção fetal já estabelecida.'
        }
      ]
    },
    TRIPLICE_CLASSICO: {
      fase: 'Tratamento de Infecção Fetal Intraútero (Esquema Tríplice)',
      indicacao: 'PCR do Líquido Amniótico POSITIVO, alterações ultrassonográficas fetais típicas ou infecção materna confirmada no 3º trimestre tardio.',
      medicamentos: [
        {
          farmaco: 'Sulfadiazina',
          apresentacao: 'Comprimidos de 500 mg',
          dose: '1.500 mg (3 comprimidos)',
          via: 'VO',
          frequencia: 'A cada 12 horas (total: 3g/dia)',
          duracao: 'Até 37 semanas (ou até o termo, com substituição por espiramicina antes do parto para evitar kernicterus).'
        },
        {
          farmaco: 'Pirimetamina',
          apresentacao: 'Comprimidos de 25 mg',
          dose: '50 mg (2 comprimidos)',
          via: 'VO',
          frequencia: 'A cada 24 horas (dose de ataque de 100 mg no 1º dia é opcional)',
          duracao: 'Até o final da gestação (sob monitorização hematológica).'
        },
        {
          farmaco: 'Ácido Folínico (Leucovorina)',
          apresentacao: 'Comprimidos de 15 mg',
          dose: '15 mg (1 comprimido)',
          via: 'VO',
          frequencia: 'A cada 24 horas',
          duracao: 'Durante todo o uso de Pirimetamina e até 1 semana após sua suspensão.',
          observacao: 'Obrigatório para proteger a medula óssea materna contra a inibição da di-hidrofolato redutase pela pirimetamina. O ÁCIDO FÓLICO COMUM NÃO SUBSTITUI O ÁCIDO FOLÍNICO.'
        }
      ],
      alertas: [
        '⚠️ Ingestão hídrica abundante materna (> 2 a 3 L/dia) é obrigatória para prevenir cristalúria e nefrolitíase por Sulfadiazina.',
        '⚠️ Hemograma materno a cada 15-30 dias pelo risco de neutropenia e plaquetopenia induzidas por Pirimetamina.',
        '⚠️ Substituir Sulfadiazina por Espiramicina a partir de 37 semanas de gestação para prevenir Kernicterus neonatal (deslocamento da bilirrubina da albumina sérica).'
      ]
    },
    TRIPLICE_ALERGIA_SULFA: {
      fase: 'Tratamento de Infecção Fetal em Paciente Alérgica a Sulfas',
      indicacao: 'Infecção fetal confirmada em gestante com histórico de anafilaxia ou rash grave por sulfonamidas.',
      medicamentos: [
        {
          farmaco: 'Clindamicina',
          apresentacao: 'Cápsulas de 300 mg',
          dose: '600 mg (2 cápsulas)',
          via: 'VO',
          frequencia: 'A cada 6 horas (total: 2.400 mg/dia)',
          duracao: 'Substitui a Sulfadiazina até o parto.'
        },
        {
          farmaco: 'Pirimetamina',
          apresentacao: 'Comprimidos de 25 mg',
          dose: '50 mg / dia',
          via: 'VO',
          frequencia: 'A cada 24 horas',
          duracao: 'Até o final da gestação.'
        },
        {
          farmaco: 'Ácido Folínico (Leucovorina)',
          apresentacao: 'Comprimidos de 15 mg',
          dose: '15 mg / dia',
          via: 'VO',
          frequencia: 'A cada 24 horas',
          duracao: 'Até 1 semana após suspensão da pirimetamina.'
        }
      ]
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. REGRAS DE INTERPRETAÇÃO SOROLÓGICA (MS / FEBRASGO)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Normaliza a classificação do Teste de Avidez de IgG
   * @param {string|number} avidez - Valor numérico (ex: 65, 30) ou textual ('ALTA', 'BAIXA', 'INTERMEDIARIA')
   * @returns {string} 'ALTA', 'BAIXA', 'INTERMEDIARIA' ou 'PENDENTE'
   */
  function normalizarAvidez(avidez) {
    if (avidez == null) return 'PENDENTE';
    if (typeof avidez === 'number') {
      if (avidez >= 60) return 'ALTA';
      if (avidez < 50) return 'BAIXA';
      return 'INTERMEDIARIA';
    }
    var str = String(avidez).trim().toUpperCase();
    var matchNum = str.match(/(\d+(?:\.\d+)?)/);
    if (matchNum) {
      var num = parseFloat(matchNum[1]);
      if (num >= 60) return 'ALTA';
      if (num < 50) return 'BAIXA';
      return 'INTERMEDIARIA';
    }
    if (str.includes('ALT') || str.includes('FORT')) return 'ALTA';
    if (str.includes('BAIX') || str.includes('FRAC')) return 'BAIXA';
    if (str.includes('INTER') || str.includes('MODERAD') || str.includes('CINZA')) return 'INTERMEDIARIA';
    return 'PENDENTE';
  }

  function avaliarSorologia(ig, igg, igm, avidez_igg, ig_exame) {
    var resultado = {
      cenario: '',
      interpretacao: '',
      conduta_imediata: '',
      investigacao_fetal: null,
      tratamento: null,
      orientacoes: []
    };

    var _igg = igg ? igg.toUpperCase() : '';
    var _igm = igm ? igm.toUpperCase() : '';
    var _avidez = normalizarAvidez(avidez_igg);

    // 1. Suscetível: IgG- / IgM-
    if ((_igg === 'NEGATIVO' || _igg === 'NAO_REAGENTE') && (_igm === 'NEGATIVO' || _igm === 'NAO_REAGENTE')) {
      resultado.cenario = 'SUSCETÍVEL';
      resultado.interpretacao = 'Paciente suscetível (ausência de anticorpos protetores). Risco de primoinfecção durante a gestação com repercussões fetais graves.';
      resultado.conduta_imediata = 'Repetir sorologia trimestralmente (idealmente a cada 4-8 semanas). Orientar rigorosamente medidas de prevenção primária.';
      resultado.orientacoes.push('Não ingerir carnes cruas ou malpassadas (cozinhar a mais de 67°C ou congelar a -12°C por pelo menos 3 dias).');
      resultado.orientacoes.push('Lavar rigorosamente frutas, verduras e legumes com água potável e solução clorada antes do consumo.');
      resultado.orientacoes.push('Evitar contato direto com solo e terra de jardinagem (utilizar luvas descartáveis e higienizar mãos em seguida).');
      resultado.orientacoes.push('Evitar manipular caixas de areia de gatos. Se inevitável, usar luvas, máscara e trocar a areia diariamente com água fervente.');
      resultado.orientacoes.push('Não ingerir água não tratada ou leite cru não pasteurizado.');
      return resultado;
    }

    // 2. Imunidade Pregressa: IgG+ / IgM-
    if ((_igg === 'POSITIVO' || _igg === 'REAGENTE') && (_igm === 'NEGATIVO' || _igm === 'NAO_REAGENTE')) {
      resultado.cenario = 'IMUNIDADE PREGRESSA';
      resultado.interpretacao = 'Infecção prévia adquirida antes da gestação atual. Feto protegido por imunidade materna humoral duradoura.';
      resultado.conduta_imediata = 'Tranquilizar a gestante. Não há risco de transmissão vertical para o feto e não há indicação de nova sorologia, exceto em imunossupressão grave (ex: HIV com CD4 baixo).';
      return resultado;
    }

    // 3. Infecção Aguda Muito Recente ou Falso Positivo: IgG- / IgM+
    if ((_igg === 'NEGATIVO' || _igg === 'NAO_REAGENTE') && (_igm === 'POSITIVO' || _igm === 'REAGENTE')) {
      resultado.cenario = 'INFECÇÃO AGUDA RECENTE OU IgM FALSO-POSITIVO';
      resultado.interpretacao = 'Padrão compatível com infecção aguda em fase muito inicial (janela imunológica antes da viragem do IgG) OU IgM natural/falso-positivo.';
      resultado.conduta_imediata = 'Iniciar Espiramicina 1g VO 8/8h IMEDIATAMENTE. Repetir sorologia (IgG e IgM) em 2 a 3 semanas para confirmar ou afastar soroconversão. Encaminhar amostra para laboratório de referência.';
      resultado.tratamento = ESQUEMAS_MEDICAMENTOSOS.ESPIRAMICINA;
      return resultado;
    }

    // 4. IgG+ e IgM+
    if ((_igg === 'POSITIVO' || _igg === 'REAGENTE') && (_igm === 'POSITIVO' || _igm === 'REAGENTE')) {
      var idadeColeta = (ig_exame != null && ig_exame > 0) ? ig_exame : ig;

      if (idadeColeta <= 16) {
        // Coleta precoce no 1º trimestre (<= 16 semanas)
        if (_avidez === 'PENDENTE') {
          resultado.cenario = 'INFECÇÃO AGUDA SUSPEITA (AVIDEZ PENDENTE)';
          resultado.interpretacao = 'IgG e IgM reagentes no primeiro trimestre. O IgM pode persistir residual por meses a anos; o Teste de Avidez de IgG é indispensável para datação.';
          resultado.conduta_imediata = 'Iniciar Espiramicina 1g VO 8/8h IMEDIATAMENTE (não aguardar resultado da avidez para iniciar). Solicitar Teste de Avidez de IgG urgente na mesma amostra sorológica.';
          resultado.tratamento = ESQUEMAS_MEDICAMENTOSOS.ESPIRAMICINA;
        } else if (_avidez === 'ALTA') {
          resultado.cenario = 'INFECÇÃO PREGRESSA (AVIDEZ ALTA)';
          resultado.interpretacao = 'Teste de Avidez de IgG ALTA (>= 60%) realizado com <= 16 semanas: afasta com segurança infecção adquirida nos últimos 3 a 4 meses, confirmando que a infecção ocorreu ANTES da concepção.';
          resultado.conduta_imediata = 'Suspender Espiramicina (se havia sido iniciada preventivamente). Tranquilizar a paciente. Seguir pré-natal habitual de baixo risco.';
        } else {
          // Baixa ou intermediária
          resultado.cenario = 'INFECÇÃO AGUDA MATERNA CONFIRMADA';
          resultado.interpretacao = 'Teste de Avidez de IgG BAIXA (< 50%) ou intermediária no 1º trimestre: confirma infecção aguda recente adquirida durante a gestação ou período periconcepcional imediato.';
          resultado.conduta_imediata = 'Manter Espiramicina 1g VO 8/8h ininterruptamente para profilaxia placentária. Programar investigação de infecção fetal por amniocentese (PCR) a partir de 18 semanas.';
          resultado.tratamento = ESQUEMAS_MEDICAMENTOSOS.ESPIRAMICINA;
          resultado.investigacao_fetal = obterProtocoloInvestigacaoFetal();
        }
      } else {
        // Coleta tardia (> 16 semanas)
        resultado.cenario = 'INFECÇÃO AGUDA MATERNA PROVÁVEL (COLETA TARDIA)';
        resultado.interpretacao = 'Sorologia coletada com mais de 16 semanas de gestação. O Teste de Avidez de IgG PERDE O VALOR preditivo nesta fase (avidez alta não exclui infecção no 1º trimestre). Deve-se considerar infecção aguda gestacional por segurança.';
        resultado.conduta_imediata = 'Iniciar Espiramicina 1g VO 8/8h IMEDIATAMENTE e manter. Programar investigação invasiva de infecção fetal por amniocentese (PCR) a partir de 18 semanas.';
        resultado.tratamento = ESQUEMAS_MEDICAMENTOSOS.ESPIRAMICINA;
        resultado.investigacao_fetal = obterProtocoloInvestigacaoFetal();
      }
      return resultado;
    }

    resultado.cenario = 'SOROLOGIA INDETERMINADA';
    resultado.interpretacao = 'Padrão sorológico atípico ou inconclusivo. Necessário confirmar os laudos e repetir a sorologia.';
    resultado.conduta_imediata = 'Repetir IgG e IgM em laboratório de referência em 2 semanas. Se alta suspeita clínica, iniciar Espiramicina preventivamente.';
    return resultado;
  }

  function obterProtocoloInvestigacaoFetal() {
    return {
      exame: 'PCR para Toxoplasma gondii no Líquido Amniótico (via Amniocentese)',
      timing: 'Realizar A PARTIR de 18 semanas de gestação E com intervalo mínimo de 4 semanas após a infecção aguda materna estimada.',
      justificativa_timing: 'Amniocentese realizada antes de 18 semanas ou com menos de 4 semanas da infecção apresenta alto índice de resultado falso-negativo (tempo necessário para o taquizoíto colonizar a placenta e ser eliminado pelos rins fetais no líquido amniótico).',
      ultrassom_seriado: 'USG Morfológico fetal a cada 3 a 4 semanas para rastreio de sinais de infecção congênita: dilatação ventricular/hidrocefalia, calcificações cerebrais periventriculares/difusas, microcefalia, espessamento placentário, ascite fetal, hidropsia e hepatoesplenomegalia.'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. MOTOR DETERMINÍSTICO PRINCIPAL: avaliar()
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Avalia caso completo de toxoplasmose na gestação
   * @param {object} params - Parâmetros da paciente
   * @param {number} params.ig - Idade gestacional atual em semanas
   * @param {string} params.igg - 'POSITIVO' / 'NEGATIVO'
   * @param {string} params.igm - 'POSITIVO' / 'NEGATIVO'
   * @param {string|number} [params.avidez_igg] - Valor da avidez (ex: 'ALTA', 'BAIXA', 65, 30)
   * @param {number} [params.ig_exame] - IG no momento da coleta do exame
   * @param {string} [params.pcr_amniotico] - 'POSITIVO' / 'NEGATIVO'
   * @param {boolean} [params.usg_alterado] - Presença de sinais ultrassonográficos
   * @param {boolean} [params.alergia_sulfa] - Se a gestante é alérgica a sulfas
   * @returns {object} Conduta estruturada completa
   */
  function avaliar(params) {
    if (!params || typeof params.ig !== 'number' || params.ig < 4 || params.ig > 43) {
      throw new Error('Informe a idade gestacional atual (ig) válida em semanas (4 a 43).');
    }

    var ig = params.ig;
    var sorologia = avaliarSorologia(ig, params.igg, params.igm, params.avidez_igg, params.ig_exame);
    var pcr = params.pcr_amniotico ? params.pcr_amniotico.toUpperCase() : null;
    var usgAlterado = !!params.usg_alterado;
    var alergiaSulfa = !!params.alergia_sulfa;

    var resultado = {
      ig: ig,
      sorologia: sorologia,
      pcr_amniotico: pcr,
      usg_alterado: usgAlterado,
      alergia_sulfa: alergiaSulfa,
      tratamento_fetal: null,
      alertas: [],
      bloqueios_seguranca: [],
      referencias: REFERENCIAS.slice()
    };

    // Avaliação de Transmissão Fetal / Tratamento Fetal
    var infeccaoFetalConfirmada = (pcr === 'POSITIVO' || usgAlterado);

    // Infecção no 3º trimestre tardio (> 32-34 sem): risco de transmissão é altíssimo (> 70-80%)
    var terceiroTrimestreTardio = (ig >= 32 && sorologia.cenario.includes('AGUDA'));

    if (infeccaoFetalConfirmada || terceiroTrimestreTardio) {
      var esquema = alergiaSulfa ? ESQUEMAS_MEDICAMENTOSOS.TRIPLICE_ALERGIA_SULFA : ESQUEMAS_MEDICAMENTOSOS.TRIPLICE_CLASSICO;
      resultado.tratamento_fetal = JSON.parse(JSON.stringify(esquema));
      resultado.sorologia.tratamento = null; // Substitui profilaxia por tratamento fetal

      if (infeccaoFetalConfirmada) {
        resultado.sorologia.conduta_imediata = '🚨 INFECÇÃO FETAL CONFIRMADA/ALTAMENTE SUSPEITA (PCR positivo no LA ou USG com anomalias). Suspender Espiramicina e iniciar Esquema Tríplice para tratamento fetal intraútero imediatamente.';
      } else {
        resultado.sorologia.conduta_imediata = '🚨 INFECÇÃO AGUDA MATERNA EM FASE AVANÇADA (>= 32 semanas). Devido à altíssima taxa de transmissão vertical fetal (> 70-80%), iniciar Esquema Tríplice para tratamento fetal intraútero.';
      }

      // Alerta de termo e risco de Kernicterus
      if (ig >= 37 && !alergiaSulfa) {
        resultado.alertas.push('⚠️ GESTAÇÃO A TERMO (>= 37 semanas): Risco de Kernicterus neonatal! A Sulfadiazina desloca a bilirrubina dos sítios de ligação da albumina sérica. Suspender Sulfadiazina e substituir por Espiramicina 1g VO 8/8h até o parto.');
      }
    } else if (pcr === 'NEGATIVO') {
      resultado.sorologia.conduta_imediata += ' ✅ PCR NEGATIVO no líquido amniótico: Infecção fetal não detectada. Manter Espiramicina 1g VO 8/8h até o parto e manter vigilância com USG mensal.';
    }

    // Bloqueios de segurança clínicos
    if (resultado.tratamento_fetal) {
      resultado.bloqueios_seguranca.push('🛑 O ÁCIDO FOLÍNICO (Leucovorina 15 mg/dia) é MANDATÓRIO durante o uso de Pirimetamina. O Ácido fólico convencional do pré-natal NÃO reverte a mielotoxicidade da pirimetamina.');
      resultado.bloqueios_seguranca.push('🩸 Monitorar HEMOGRAMA COMPLETO com plaquetas a cada 15 a 30 dias durante o tratamento tríplice materna pelo risco de pancitopenia e neutropenia grave.');
    }

    if (sorologia.cenario.includes('AGUDA') && ig < 18) {
      resultado.bloqueios_seguranca.push('🛑 NÃO realizar amniocentese antes de 18 semanas de gestação nem com menos de 4 semanas da infecção presumida (risco crítico de resultado falso-negativo).');
    }

    if (sorologia.cenario === 'SUSCETÍVEL') {
      resultado.bloqueios_seguranca.push('🛡️ NÃO deixar de repetir sorologia trimestralmente na gestante suscetível (identificação precoce de soroconversão salva o prognóstico neurológico fetal).');
    }

    return resultado;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. PARSER DE TEXTO LIVRE (TELEGRAM)
  // ═══════════════════════════════════════════════════════════════════════════

  function extrairParametrosTexto(texto) {
    if (!texto || typeof texto !== 'string') return {};
    var txt = texto.toLowerCase().replace(/,/g, '.');
    var params = { ig: 16, igg: null, igm: null, avidez_igg: null, ig_exame: null, pcr_amniotico: null, usg_alterado: false, alergia_sulfa: false };

    // IG
    var matchIG = txt.match(/(?:ig|idade\s*gestacional)?\s*(\d{1,2})\s*(?:s|sem|semanas?)\b/);
    if (!matchIG) matchIG = txt.match(/\b(\d{1,2})\s*\+\s*\d/);
    if (matchIG) params.ig = parseInt(matchIG[1], 10);

    // IgG
    var matchIgG = txt.match(/igg\s*[:=]?\s*(positivo|negativo|reagente|nao\s*reagente|não\s*reagente|\+|\-)/);
    if (matchIgG) {
      var valG = matchIgG[1];
      params.igg = (valG.includes('pos') || valG.includes('+') || (valG.includes('reag') && !valG.includes('nao') && !valG.includes('não'))) ? 'POSITIVO' : 'NEGATIVO';
    }

    // IgM
    var matchIgM = txt.match(/igm\s*[:=]?\s*(positivo|negativo|reagente|nao\s*reagente|não\s*reagente|\+|\-)/);
    if (matchIgM) {
      var valM = matchIgM[1];
      params.igm = (valM.includes('pos') || valM.includes('+') || (valM.includes('reag') && !valM.includes('nao') && !valM.includes('não'))) ? 'POSITIVO' : 'NEGATIVO';
    }

    // Avidez
    var matchAvidezNum = txt.match(/avidez\s*[:=]?\s*(\d+(?:\.\d+)?)\s*%?/);
    if (matchAvidezNum) {
      params.avidez_igg = parseFloat(matchAvidezNum[1]);
    } else {
      var matchAvidezTxt = txt.match(/avidez\s*[:=]?\s*(alta|baixa|fraca|forte|intermediaria|pendente)/);
      if (matchAvidezTxt) {
        var av = matchAvidezTxt[1];
        if (av === 'alta' || av === 'forte') params.avidez_igg = 'ALTA';
        else if (av === 'baixa' || av === 'fraca') params.avidez_igg = 'BAIXA';
        else if (av.includes('inter')) params.avidez_igg = 'INTERMEDIARIA';
        else params.avidez_igg = 'PENDENTE';
      } else if (txt.includes('sem avidez') || txt.includes('avidez pendente')) {
        params.avidez_igg = 'PENDENTE';
      }
    }

    // IG na coleta
    var matchIgExame = txt.match(/coleta\s*[:=]?\s*(\d{1,2})\s*s/);
    if (matchIgExame) params.ig_exame = parseInt(matchIgExame[1], 10);

    // PCR no líquido amniótico
    if (txt.includes('pcr positivo') || txt.includes('pcr la positivo') || txt.includes('amniocentese positiva')) params.pcr_amniotico = 'POSITIVO';
    if (txt.includes('pcr negativo') || txt.includes('pcr la negativo') || txt.includes('amniocentese negativa')) params.pcr_amniotico = 'NEGATIVO';

    // USG
    if (txt.includes('usg alterado') || txt.includes('hidrocefalia') || txt.includes('calcificacoes') || txt.includes('calcificações') || txt.includes('ventriculomegalia')) {
      params.usg_alterado = true;
    }

    // Alergia a sulfa
    if (txt.includes('alergia a sulfa') || txt.includes('alergica a sulfa') || txt.includes('alergica a sulfadiazina')) {
      params.alergia_sulfa = true;
    }

    return params;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. FORMATAÇÃO TELEGRAM
  // ═══════════════════════════════════════════════════════════════════════════

  function formatarTextoTelegram(resultado) {
    if (!resultado) return '';
    var t = [];

    t.push('🦠 *TOXOPLASMOSE NA GESTAÇÃO (DIRETRIZ MS / FEBRASGO)*');
    t.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    t.push('');

    t.push('📅 *Idade Gestacional Atual:* ' + resultado.ig + ' semanas');
    t.push('🏷️ *CENÁRIO CLÍNICO:* *' + resultado.sorologia.cenario + '*');
    t.push('');

    t.push('📝 *INTERPRETAÇÃO CLÍNICA:*');
    t.push(resultado.sorologia.interpretacao);
    t.push('');
    
    t.push('⚡ *CONDUTA IMEDIATA:*');
    t.push(' • ' + resultado.sorologia.conduta_imediata);
    t.push('');

    if (resultado.sorologia.tratamento && !resultado.tratamento_fetal) {
      t.push('💊 *TRATAMENTO MATERNO (Profilaxia de Transmissão Vertical):*');
      resultado.sorologia.tratamento.medicamentos.forEach(function(m) {
        t.push(' • *' + m.farmaco + '*: ' + m.dose + ' ' + m.via + ' ' + m.frequencia);
        if (m.observacao) t.push('   _' + m.observacao + '_');
      });
      t.push('');
    }

    if (resultado.sorologia.investigacao_fetal) {
      t.push('🔬 *INVESTIGAÇÃO FETAL (Amniocentese / PCR):*');
      t.push(' • *Exame:* ' + resultado.sorologia.investigacao_fetal.exame);
      t.push(' • *Timing ideal:* ' + resultado.sorologia.investigacao_fetal.timing);
      t.push(' • _' + resultado.sorologia.investigacao_fetal.justificativa_timing + '_');
      t.push('');
    }

    if (resultado.tratamento_fetal) {
      t.push('🚨 *TRATAMENTO FETAL INTRAÚTERO (' + resultado.tratamento_fetal.fase.toUpperCase() + '):*');
      t.push(' • _Indicação:_ ' + resultado.tratamento_fetal.indicacao);
      resultado.tratamento_fetal.medicamentos.forEach(function(m) {
        t.push(' • *' + m.farmaco + '*: ' + m.dose + ' ' + m.via + ' ' + m.frequencia);
        if (m.observacao) t.push('   _' + m.observacao + '_');
      });
      t.push('');
      if (resultado.tratamento_fetal.alertas && resultado.tratamento_fetal.alertas.length > 0) {
        resultado.tratamento_fetal.alertas.forEach(function(a) { t.push(a); });
        t.push('');
      }
    }

    if (resultado.alertas && resultado.alertas.length > 0) {
      t.push('⚠️ *ALERTAS CLÍNICOS CRÍTICOS:*');
      resultado.alertas.forEach(function(a) { t.push(' • ' + a); });
      t.push('');
    }

    if (resultado.sorologia.orientacoes && resultado.sorologia.orientacoes.length > 0) {
      t.push('🛡️ *MEDIDAS DE PREVENÇÃO PRIMÁRIA:*');
      resultado.sorologia.orientacoes.forEach(function(o) { t.push(' • ' + o); });
      t.push('');
    }

    if (resultado.bloqueios_seguranca && resultado.bloqueios_seguranca.length > 0) {
      t.push('🛑 *BLOQUEIOS DE SEGURANÇA MANDATÓRIOS:*');
      resultado.bloqueios_seguranca.forEach(function(b) { t.push(' • ' + b); });
      t.push('');
    }

    t.push('📚 Fontes: Protocolo MS 2022, FEBRASGO 2023, ACOG PB 151, Montoya & Remington (CID).');
    t.push('Decisão final conjunta de Obstetrícia de Alto Risco e Infectologia.');
    return t.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. API PÚBLICA
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    avaliarSorologia: avaliarSorologia,
    obterProtocoloInvestigacaoFetal: obterProtocoloInvestigacaoFetal,
    avaliar: avaliar,
    extrairParametrosTexto: extrairParametrosTexto,
    formatarTextoTelegram: formatarTextoTelegram,
    normalizarAvidez: normalizarAvidez,
    ESQUEMAS_MEDICAMENTOSOS: ESQUEMAS_MEDICAMENTOSOS,
    REFERENCIAS: REFERENCIAS
  };
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = ObstetriciaToxoplasmoseService;
}
