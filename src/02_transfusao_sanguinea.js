/**
 * ==============================================================================
 * MÓDULO 02: PROTOCOLO AVANÇADO DE TRANSFUSÃO SANGUÍNEA E HEMOTERAPIA
 * ==============================================================================
 * Diretrizes Clínicas Oficiais e Ensaios Clínicos Seminais:
 *  - Ministério da Saúde do Brasil (Portaria de Consolidação nº 5/2017, Anexo IV)
 *  - Guia para o Uso de Hemocomponentes do Ministério da Saúde (2ª Edição)
 *  - Associação Brasileira de Hematologia, Hemoterapia e Terapia Celular (ABHH)
 *  - AABB Clinical Practice Guidelines on Red Blood Cell Transfusion (2023 Update)
 *  - Ensaios Seminais: TRICC, TRISS, FOCUS, REALITY, PROPPR, CRASH-2, WOMAN
 *  - International Society on Thrombosis and Haemostasis (ISTH) - Critérios de CIVD
 *
 * PILARES DETERMINÍSTICOS IMPLEMENTADOS:
 *  1. Gatilhos Transfusionais Restritivos vs Liberais para CHAD:
 *     - Estável / Clínico: Gatilho Hb < 7.0 g/dL (Alvo 7.0 - 9.0 g/dL)
 *     - Doença Coronariana Aguda / SCA / IAM: Gatilho Hb < 8.0 g/dL (Alvo 8.0 - 10.0 g/dL)
 *     - Neurocrítico / TCE Grave: Gatilho Hb < 7.0-8.0 g/dL (Alvo >= 8.0 - 9.0 g/dL)
 *     - Choque Séptico: Gatilho Hb < 7.0 g/dL (Alvo 7.0 - 9.0 g/dL)
 *     - Hemorragia Ativa com Instabilidade: Indicação imediata independente de Hb prévia
 *     - Cálculo ponderado de bolsas e incremento esperado (~1 g/dL por bolsa de 300 mL no adulto de 70 kg)
 *     - Alerta e prevenção de TACO (Transfusion-Associated Circulatory Overload)
 *  2. Protocolo de Transfusão Maciça (PTM / MTP - 1:1:1):
 *     - Escore ABC (Assessment of Blood Consumption: FC>=120, PAS<=90, trauma penetrante, FAST+)
 *     - Índice de Choque (FC/PAS >= 1.4 = choque catastrófico)
 *     - Pacote 1 (Imediato): 4-6 CHAD + 4-6 PFC + 1 Aférese de Plaquetas + Ácido Tranexâmico (TXA)
 *     - Regra de O Negativo em mulheres em idade fértil (<= 50 anos) vs O Positivo em homens/idosas
 *     - Janela crítica do TXA: 1g ataque + 1g infusão contínua em 8h se < 3h do trauma
 *     - Pacote 2 (Sequencial): Crioprecipitado + Gluconato de Cálcio 10% (combate à hipocalcemia por citrato)
 *     - Metas fisiológicas: Hb 7-9, Plaquetas > 50k (> 100k se TCE), Fibrinogênio > 150-200, RNI < 1.5, T > 35°C, pH > 7.20, Ca++ > 1.1 mmol/L
 *  3. Reposição Individual de Hemocomponentes & Coagulopatias:
 *     - Plasma Fresco Congelado (PFC): 10 a 15 mL/kg em sangramento ativo com RNI > 1.5 ou TTPA alargado
 *     - Concentrado de Plaquetas (CP): Gatilhos 10k (profilático), 20k (sepse/febre), 50k (sangramento/cirurgia), 100k (SNC/ocular)
 *     - Bloqueio sentinela de plaquetas em PTT e HIT (risco de trombose fatal)
 *     - Crioprecipitado: 1 UI a cada 5-10 kg (ou 10 UI) para Fibrinogênio < 150 mg/dL (< 200 em HPP/trauma)
 *     - Escore ISTH para CIVD Manifesta (Overt DIC) com suporte hemoterápico multimodal
 *  4. Diagnóstico e Manejo de Reações Transfusionais Agudas (RTA):
 *     - Reação Hemolítica Aguda (ABO), Anafilaxia, TACO, TRALI, RFNH, Alérgica Leve e Choque Séptico/Bacteriano
 * ==============================================================================
 */

var TransfusaoSanguineaService = (function() {
  'use strict';

  /**
   * Avalia gatilho transfusional determinístico para Concentrado de Hemácias (CHAD).
   * @param {Object} params
   * @returns {Object}
   */
  function avaliarGatilhoTransfusionalChad(params) {
    params = params || {};
    var peso = Math.max(30, Math.min(250, Number(params.peso) || 70));
    var sexo = String(params.sexo || 'M').toUpperCase() === 'F' ? 'F' : 'M';
    var hb = params.hb !== undefined && params.hb !== null ? Number(params.hb) : null;
    var ht = params.ht !== undefined && params.ht !== null ? Number(params.ht) : null;

    if (hb === null && ht !== null) {
      hb = Math.round((ht / 3) * 10) / 10;
    }

    var cenario = String(params.cenarioClinico || params.condicao || 'ESTAVEL_GERAL').toUpperCase();
    var sintomas = params.sintomasAnemia || false;
    var comorbidades = Array.isArray(params.comorbidades) ? params.comorbidades : [];
    var idade = Number(params.idade) || 50;

    // Detecção de risco de sobrecarga circulatória (TACO)
    var riscoTaco = params.riscoTaco === true || idade >= 65;
    for (var i = 0; i < comorbidades.length; i++) {
      var cNorm = String(comorbidades[i]).toUpperCase();
      if (cNorm.indexOf('ICC') >= 0 || cNorm.indexOf('CARDIACA') >= 0 || cNorm.indexOf('DRC') >= 0 || cNorm.indexOf('RENAL') >= 0) {
        riscoTaco = true;
      }
    }

    // Definição do limiar/gatilho baseado em diretrizes (TRICC, FOCUS, REALITY, AABB, MS)
    var gatilhoHb = 7.0;
    var hbAlvo = 8.0;
    var estrategia = 'RESTRITIVA';
    var justificativaGatilho = '';

    if (cenario.indexOf('HEMORRAGIA') >= 0 || cenario.indexOf('CHOQUE_HEMORRAGICO') >= 0 || cenario.indexOf('SANGRAMENTO_ATIVO_INSTAVEL') >= 0) {
      estrategia = 'RESSUSCITACAO_HEMORRAGICA';
      gatilhoHb = 10.0; // Não aguarda exames laboratoriais
      hbAlvo = 9.0;
      justificativaGatilho = 'Hemorragia aguda com instabilidade hemodinâmica. A indicação transfusional é CLÍNICA e IMEDIATA, não devendo aguardar dosagem laboratorial.';
    } else if (cenario.indexOf('CORONARI') >= 0 || cenario.indexOf('SCA') >= 0 || cenario.indexOf('IAM') >= 0 || cenario.indexOf('ISQUEMIA_MIOCARDICA') >= 0) {
      estrategia = 'LIBERAL_MODIFICADA';
      gatilhoHb = 8.0;
      hbAlvo = 9.0;
      justificativaGatilho = 'Síndrome Coronariana Aguda / Doença Coronariana Isquêmica ativa (estudos REALITY e FOCUS). Meta de manter Hb >= 8,0 g/dL para prevenir isquemia miocárdica.';
    } else if (cenario.indexOf('NEUROCRITICO') >= 0 || cenario.indexOf('TCE') >= 0 || cenario.indexOf('HIC') >= 0 || cenario.indexOf('AVC_AGUDO') >= 0) {
      estrategia = 'NEUROPROTECAO';
      gatilhoHb = 8.0;
      hbAlvo = 9.0;
      justificativaGatilho = 'Paciente neurocrítico com TCE grave ou risco de isquemia cerebral secundária. Recomenda-se manter Hb em torno de 8,0 a 9,0 g/dL.';
    } else if (cenario.indexOf('CHOQUE_SEPTICO') >= 0 || cenario.indexOf('SEPSE') >= 0) {
      estrategia = 'RESTRITIVA_SEPSE';
      gatilhoHb = 7.0;
      hbAlvo = 8.0;
      justificativaGatilho = 'Sepse / Choque Séptico (Diretrizes Surviving Sepsis Campaign 2021). Estratégia restritiva com gatilho Hb < 7,0 g/dL, reduzindo mortalidade e complicações pulmonares.';
    } else if (cenario.indexOf('ORTOPED') >= 0 || cenario.indexOf('POS_OP') >= 0) {
      if (riscoTaco || comorbidades.length > 0) {
        estrategia = 'LIBERAL_MODIFICADA';
        gatilhoHb = 8.0;
        hbAlvo = 8.5;
        justificativaGatilho = 'Pós-operatório cirúrgico com comorbidade cardiovascular associada. Gatilho seguro com Hb < 8,0 g/dL.';
      } else {
        estrategia = 'RESTRITIVA';
        gatilhoHb = 7.0;
        hbAlvo = 8.0;
        justificativaGatilho = 'Pós-operatório sem doença coronariana prévia. Estratégia restritiva segura (Hb < 7,0 g/dL).';
      }
    } else {
      estrategia = 'RESTRITIVA';
      gatilhoHb = 7.0;
      hbAlvo = 8.0;
      justificativaGatilho = 'Paciente clínico estável (TRICC Trial / Diretrizes AABB 2023). Estratégia restritiva com gatilho estrito de Hb < 7,0 g/dL.';
    }

    // Avaliação de sintomas graves de hipóxia tecidual mesmo com Hb limítrofe
    var sintomasAnemiaGraves = false;
    if (sintomas === true || (Array.isArray(sintomas) && sintomas.length > 0)) {
      sintomasAnemiaGraves = true;
    }

    var indicada = false;
    var urgencia = 'NAO_INDICADA';

    if (estrategia === 'RESSUSCITACAO_HEMORRAGICA') {
      indicada = true;
      urgencia = 'EMERGENCIA';
    } else if (hb !== null && hb < gatilhoHb) {
      indicada = true;
      urgencia = hb < 5.0 ? 'URGENTE' : 'ROTINA_SUPERVISIONADA';
    } else if (hb !== null && hb >= gatilhoHb && hb < (gatilhoHb + 1.0) && sintomasAnemiaGraves) {
      indicada = true;
      urgencia = 'ROTINA_SUPERVISIONADA';
      justificativaGatilho += ' Presença de sintomas clínicos de descompensação anêmica (ex: taquicardia desproporcional, angina, síncope ou hipotensão ortostática).';
    }

    // Cálculo do incremento esperado e bolsas
    // 1 bolsa de CHAD (~300 mL com Ht 60-70%) eleva ~1 g/dL de Hb em adulto de 70 kg
    var deltaHbPorBolsa = Math.round((1.0 * (70 / peso)) * 100) / 100;
    var bolsasRecomendadas = 0;

    if (indicada) {
      if (estrategia === 'RESSUSCITACAO_HEMORRAGICA') {
        bolsasRecomendadas = 2; // Início habitual antes do PTM pleno
      } else if (hb !== null) {
        var deficitHb = Math.max(0.5, hbAlvo - hb);
        bolsasRecomendadas = Math.max(1, Math.round(deficitHb / deltaHbPorBolsa));
        // Regra de ouro da segurança: no paciente estável, transfundir 1 bolsa de cada vez
        if (cenario.indexOf('ESTAVEL') >= 0 && hb >= 5.5) {
          bolsasRecomendadas = 1;
        }
      } else {
        bolsasRecomendadas = 1;
      }
    }

    var alertaTaco = null;
    var recomendacaoVelocidade = 'Infundir cada bolsa em 60 a 120 minutos (máximo de 4 horas por bolsa pelo risco de contaminação bacteriana).';

    if (idade >= 90) {
      alertaTaco = '🚨 PACIENTE NONAGENÁRIO (≥ 90 ANOS) - RISCO CRÍTICO DE TACO: Sobrecarga circulatória é a principal causa de óbito hemoterápico no paciente muito idoso. Transfundir estritamente UMA unidade por vez em velocidade lenta (3 a 4 horas). Administrar Furosemida 20 a 40 mg IV profilática antes ou entre as bolsas e monitorar ausculta respiratória e oximetria continuamente.';
      recomendacaoVelocidade = 'Infundir ultralentamente em 3 a 4 horas sob vigilância cardiorrespiratória estrita.';
    } else if (riscoTaco) {
      alertaTaco = '⚠️ ALTO RISCO DE SOBRECARGA CIRCULATÓRIA (TACO): Idade avançada, cardiopatia ou nefropatia prévia. Infundir em velocidade lenta (3 a 4 horas por unidade). Avaliar Furosemida 20 a 40 mg IV entre as bolsas e monitorar ausculta pulmonar e SpO2.';
      recomendacaoVelocidade = 'Infundir lentamente em 3 a 4 horas sob estrita vigilância de sinais de congestão (estertores, turgência jugular, dispneia).';
    }

    var alertas = [];
    var pesoInformado = params.peso !== undefined && params.peso !== null ? Number(params.peso) : null;
    if (pesoInformado !== null && pesoInformado > 0 && pesoInformado < 30) {
      alertas.unshift('⚠️ ALÍQUOTA PEDIÁTRICA/NEONATAL (< 30 kg): NUNCA prescrever bolsas inteiras de adulto (300 mL). Transfusão pediátrica deve ser prescrita em alíquotas de 10 a 15 mL/kg de CHAD (' + Math.round(pesoInformado * 10) + ' a ' + Math.round(pesoInformado * 15) + ' mL para ' + pesoInformado + ' kg) em bomba de infusão.');
    }
    if (pesoInformado !== null && pesoInformado > 150) {
      alertas.unshift('⚠️ OBESIDADE SEVERA (> 150 kg): O volume circulatório relativo é reduzido (~45-50 mL/kg vs 70 mL/kg). O risco de sobrecarga circulatória (TACO) é aumentado se houver cardiopatia associada.');
    }
    if (hb !== null && hb <= 4.0) {
      alertas.unshift('🚨 HEMOGLOBINA CRÍTICA EXTREMA (Hb ≤ 4.0 g/dL): Risco iminente de colapso circulatório anóxico e parada cardíaca. Transfusão de hemácias emergencial imediata e admissão em UTI.');
    }

    if (!indicada && hb !== null && hb >= gatilhoHb) {
      alertas.push('Estratégia restritiva mantida: Transfusão de hemácias NÃO indicada neste momento (Hb atual >= gatilho de ' + gatilhoHb.toFixed(1) + ' g/dL). Evita riscos de aloimunização, sobrecarga volêmica (TACO) e lesão pulmonar aguda (TRALI).');
      alertas.push('Reavaliar clinicamente e investigar a etiologia da anemia (deficiência de ferro, B12, folato ou perda crônica).');
    }

    if (indicada) {
      alertas.push('Doutrina PBM (Patient Blood Management): Transfundir UMA unidade por vez no paciente estável e dosar Hb de controle após 1-2h da infusão.');
      alertas.push('Coleta pré-transfusional obrigatória: Tipagem ABO/Rh, Pesquisa de Anticorpos Irregulares (PAI) e Prova de Compatibilidade Maior.');
    }

    return {
      indicada: indicada,
      urgencia: urgencia,
      estrategia: estrategia,
      hbInformada: hb,
      gatilhoHb: gatilhoHb,
      hbAlvo: hbAlvo,
      pesoKg: peso,
      sexo: sexo,
      deltaEsperadoPorBolsa: deltaHbPorBolsa,
      bolsasCalculadas: bolsasRecomendadas,
      justificativaGatilho: justificativaGatilho,
      riscoTaco: riscoTaco,
      alertaTaco: alertaTaco,
      recomendacaoVelocidade: recomendacaoVelocidade,
      alertas: alertas
    };
  }

  /**
   * Avalia escores e calcula pacotes determinísticos para o Protocolo de Transfusão Maciça (PTM).
   * @param {Object} params
   * @returns {Object}
   */
  function calcularProtocoloTransfusaoMaciça(params) {
    params = params || {};
    var peso = Math.max(30, Math.min(250, Number(params.peso) || 70));
    var idade = Number(params.idade) || 35;
    var sexo = String(params.sexo || 'M').toUpperCase() === 'F' ? 'F' : 'M';
    var fc = Number(params.fc) || 80;
    var pas = Number(params.pas) || 120;
    var traumaPenetrante = params.traumaPenetrante === true;
    var fastPositivo = params.fastPositivo === true;
    var sangramentoAtivo = params.sangramentoAtivo !== false;
    var tempoInicioSangramentoHoras = params.tempoInicioSangramentoHoras !== undefined ? Number(params.tempoInicioSangramentoHoras) : 1.0;

    // 1. Escore ABC (Assessment of Blood Consumption)
    // 4 parâmetros: FC >= 120, PAS <= 90, trauma penetrante, FAST positivo
    var abcPontos = 0;
    var abcCriterios = [];

    if (fc >= 120) {
      abcPontos += 1;
      abcCriterios.push('Taquicardia severa (FC >= 120 bpm: ' + fc + ' bpm)');
    }
    if (pas <= 90) {
      abcPontos += 1;
      abcCriterios.push('Hipotensão arterial sistólica (PAS <= 90 mmHg: ' + pas + ' mmHg)');
    }
    if (traumaPenetrante) {
      abcPontos += 1;
      abcCriterios.push('Mecanismo de trauma penetrante (alto risco de lesão vascular)');
    }
    if (fastPositivo) {
      abcPontos += 1;
      abcCriterios.push('Ultrassonografia beira-leito FAST positiva com líquido livre intra-abdominal/pélvico');
    }

    // 2. Índice de Choque (Shock Index = FC / PAS)
    var shockIndex = Math.round((fc / Math.max(1, pas)) * 100) / 100;
    var gravidadeChoque = 'NORMAL';
    var alertaShockIndex = 'Índice de choque normal (0,5 a 0,7). Sem evidência de colapso hemodinâmico.';

    if (shockIndex >= 1.4) {
      gravidadeChoque = 'CHOQUE_GRAVE_CATASTROFICO';
      alertaShockIndex = '🚨 ÍNDICE DE CHOQUE >= 1.4: Choque hemorrágico catastrófico com perda superior a 40-50% da volemia! Risco iminente de colapso circulatório.';
    } else if (shockIndex >= 1.0) {
      gravidadeChoque = 'CHOQUE_MODERADO';
      alertaShockIndex = '⚠️ ÍNDICE DE CHOQUE >= 1.0: Choque descompensado com perda volêmica importante (30-40%).';
    } else if (shockIndex >= 0.8) {
      gravidadeChoque = 'CHOQUE_COMPENSADO';
      alertaShockIndex = 'Índice de choque discretamente elevado (0,8 a 0,9). Alerta para sangramento oculto.';
    }

    // Critério formal de ativação do PTM: ABC >= 2 OU Shock Index >= 1.4 com sangramento OU sangramento maciço ativo
    var ativacaoPtm = (abcPontos >= 2) || (shockIndex >= 1.4 && sangramentoAtivo) || params.ativacaoManual === true;

    // Regra estrita de seleção de CHAD emergencial não-tipado
    var tipoChadEmergencia = 'O_POSITIVO';
    var justificativaTipoChad = '';

    if (sexo === 'F' && idade <= 50) {
      tipoChadEmergencia = 'O_NEGATIVO';
      justificativaTipoChad = 'MULHER EM IDADE FÉRTIL (<= 50 ANOS): Concentrado de Hemácias O NEGATIVO obrigatório até sair tipagem para prevenir aloimunização contra antígeno RhD e doença hemolítica perinatal em futuras gestações.';
    } else {
      tipoChadEmergencia = 'O_POSITIVO';
      justificativaTipoChad = 'HOMEM OU MULHER PÓS-MENOPAUSA (> 50 ANOS): CHAD O POSITIVO liberado imediatamente na emergência para preservação do estoque crítico de O Negativo do hemocentro.';
    }

    // Manejo de Ácido Tranexâmico (TXA - CRASH-2 e WOMAN)
    var indicacaoTxa = false;
    var prescricaoTxa = null;
    var alertaTxa = '';

    if (sangramentoAtivo) {
      if (tempoInicioSangramentoHoras <= 3.0) {
        indicacaoTxa = true;
        prescricaoTxa = {
          droga: 'Ácido Tranexâmico (TXA)',
          ataque: '1 g IV diluído em 100 mL de SF 0,9% infundido em 10 minutos',
          manutencao: '1 g IV diluído em 500 mL de SF 0,9% em infusão contínua por 8 horas',
          janelaTempo: tempoInicioSangramentoHoras.toFixed(1) + ' horas do trauma/sangramento',
          estudoReferencia: 'CRASH-2 / WOMAN Trial (redução de 20-30% de mortalidade por sangramento se < 3h)'
        };
        alertaTxa = 'Iniciar Ácido Tranexâmico IMEDIATAMENTE (dentro da janela salvadora de 3 horas).';
      } else {
        indicacaoTxa = false;
        alertaTxa = '⛔ JANELA TERAPÊUTICA DO ÁCIDO TRANEXÂMICO EXPIRADA (> 3 HORAS): Evidências demonstram que administrar TXA após 3 horas do sangramento aumenta a mortalidade por eventos trombóticos sem benefício hemostático.';
      }
    }

    // Pacotes Balanceados de Ressuscitação Hemostática (Damage Control Resuscitation 1:1:1)
    var pacote1 = {
      nome: 'Pacote 1 (Ressuscitação Imediata)',
      chad: {
        quantidade: 4,
        unidade: 'bolsas',
        tipoRecomendado: tipoChadEmergencia,
        volumeTotalAproxMl: 1200
      },
      pfc: {
        quantidade: 4,
        unidade: 'bolsas',
        tipoRecomendado: 'Plasma Fresco Congelado tipo AB (ou tipo A de baixo título)',
        volumeTotalAproxMl: 900
      },
      plaquetas: {
        quantidade: 1,
        unidade: 'pool de aférese',
        equivalencia: 'Equivalente a 5-6 unidades de concentrado de plaquetas randômico'
      },
      txa: prescricaoTxa
    };

    var pacote2 = {
      nome: 'Pacote 2 (Manutenção & Coagulopatia de Consumo)',
      chad: { quantidade: 4, unidade: 'bolsas' },
      pfc: { quantidade: 4, unidade: 'bolsas' },
      plaquetas: { quantidade: 1, unidade: 'pool de aférese' },
      crioprecipitado: {
        quantidade: 10,
        unidade: 'bolsas',
        indicacao: 'Reposição maciça de fibrinogênio para prevenir coagulopatia dilucional'
      },
      gluconatoCalcio: {
        droga: 'Gluconato de Cálcio 10%',
        posologia: '1 a 2 g IV lento (10 a 20 mL) a cada 4 unidades de hemocomponentes infundidas',
        justificativa: 'O citrato anticoagulante das bolsas quela o cálcio iônico sérico causando hipotensão refratária, arritmias e inibição da coagulação.'
      }
    };

    var metasFisiologicas = [
      { parametro: 'Hemoglobina (Hb)', alvo: '7,0 a 9,0 g/dL', conduta: 'Evitar hiperviscosidade ou hipóxia' },
      { parametro: 'Plaquetas', alvo: '> 50.000/mcL (> 100.000 se TCE/SNC)', conduta: 'Repor concentrado de plaquetas' },
      { parametro: 'Fibrinogênio', alvo: '> 150 a 200 mg/dL', conduta: 'Repor Crioprecipitado 10 UI se < 150-200' },
      { parametro: 'RNI / TAP', alvo: '< 1,5', conduta: 'Titular Plasma Fresco Congelado (PFC)' },
      { parametro: 'Temperatura Central', alvo: '> 35,0 ºC', conduta: 'Aquecedor rápido de fluidos e mantas térmicas' },
      { parametro: 'pH Arterial', alvo: '> 7,20 (Lactato em queda)', conduta: 'Restabelecer perfusão e debelar acidose' },
      { parametro: 'Cálcio Iônico', alvo: '> 1,1 mmol/L (> 4,5 mg/dL)', conduta: 'Gluconato de Cálcio 10% 1-2g a cada 4 bolsas' }
    ];

    var alertasCriticos = [];
    alertasCriticos.push(justificativaTipoChad);
    if (alertaTxa) alertasCriticos.push(alertaTxa);
    alertasCriticos.push('Tríade Letal do Trauma (Hipotermia + Acidose + Coagulopatia): Manter aquecimento ativo mandatória. A cada 1ºC de queda térmica, a função dos fatores de coagulação cai em 10%.');
    alertasCriticos.push('Vigilância de Hipercalemia: Em transfusões rápidas de múltiplas unidades de hemácias estocadas, monitorar ECG e K+ sérico.');

    return {
      ativacaoPtm: ativacaoPtm,
      abcPontos: abcPontos,
      abcCriterios: abcCriterios,
      shockIndex: shockIndex,
      gravidadeChoque: gravidadeChoque,
      alertaShockIndex: alertaShockIndex,
      tipoChadEmergencia: tipoChadEmergencia,
      pacote1: pacote1,
      pacote2: pacote2,
      txa: prescricaoTxa,
      metasFisiologicas: metasFisiologicas,
      alertasCriticos: alertasCriticos
    };
  }

  /**
   * Avalia necessidade e calcula dose determinística de Plasma Fresco Congelado (PFC).
   * @param {Object} params
   * @returns {Object}
   */
  function calcularReposicaoPfc(params) {
    params = params || {};
    var peso = Math.max(30, Math.min(250, Number(params.peso) || 70));
    var rni = params.rni !== undefined && params.rni !== null ? Number(params.rni) : null;
    var ttpaRatio = params.ttpaRatio !== undefined && params.ttpaRatio !== null ? Number(params.ttpaRatio) : null;
    var sangramentoAtivo = params.sangramentoAtivo === true;
    var procedimentoInvasivo = params.procedimentoInvasivo === true;
    var motivoClinico = String(params.motivo || '').toUpperCase();

    var alteracaoCoagulacao = (rni !== null && rni > 1.5) || (ttpaRatio !== null && ttpaRatio > 1.5);
    var indicada = false;
    var justificativa = '';

    if (alteracaoCoagulacao && (sangramentoAtivo || procedimentoInvasivo)) {
      indicada = true;
      justificativa = 'Coagulopatia documentada (RNI > 1,5 ou TTPa alargado > 1,5x) associada a sangramento ativo ou necessidade de procedimento invasivo de médio/alto porte.';
    } else if (motivoClinico.indexOf('CIVD') >= 0 || motivoClinico.indexOf('PTM') >= 0 || motivoClinico.indexOf('TRANSFUSAO_MACICA') >= 0) {
      indicada = true;
      justificativa = 'Indicação no contexto de Transfusão Maciça ou CIVD com sangramento associado.';
    } else if (alteracaoCoagulacao && !sangramentoAtivo && !procedimentoInvasivo) {
      indicada = false;
      justificativa = 'RNI discretamente alterado sem sangramento ativo nem procedimento cirúrgico programado. Transfusão de PFC NÃO indicada profilaticamente pelo risco de TACO e TRALI.';
    } else {
      indicada = false;
      justificativa = 'Ausência de coagulopatia clinicamente relevante que justifique uso de PFC.';
    }

    // Dose padrão internacional: 10 a 15 mL/kg de peso
    var volumeMlMin = Math.round(peso * 10);
    var volumeMlMax = Math.round(peso * 15);
    var volumeMlPadrao = Math.round(peso * 12);
    // Cada bolsa de PFC contém em média 200 a 250 mL
    var bolsasRecomendadas = Math.max(2, Math.ceil(volumeMlPadrao / 225));

    var alertas = [];
    if (!indicada) {
      alertas.push('Contraindicação relativa: PFC NÃO deve ser usado como expansor plasmático volêmico nem apenas para normalizar RNI < 1,5.');
    } else {
      alertas.push('Velocidade de infusão: 30 a 60 minutos por bolsa. Monitorar sinais de sobrecarga volêmica.');
      alertas.push('Compatibilidade ABO obrigatória: O PFC deve ser compatível com os eritrócitos do receptor (não requer prova cruzada de hemácias).');
      alertas.push('Incremento esperado: Esta dose eleva os fatores de coagulação séricos em aproximadamente 15% a 25%.');
    }

    return {
      indicada: indicada,
      rni: rni,
      ttpaRatio: ttpaRatio,
      pesoKg: peso,
      justificativa: justificativa,
      dosePorKg: '10 a 15 mL/kg',
      volumeTotalRecomendadoMl: volumeMlPadrao,
      intervaloVolumeMl: volumeMlMin + ' a ' + volumeMlMax + ' mL',
      bolsasRecomendadas: bolsasRecomendadas,
      alertas: alertas
    };
  }

  /**
   * Avalia gatilhos e calcula reposição determinística de Concentrado de Plaquetas (CP).
   * @param {Object} params
   * @returns {Object}
   */
  function calcularReposicaoPlaquetas(params) {
    params = params || {};
    var peso = Math.max(30, Math.min(250, Number(params.peso) || 70));
    var plaquetas = params.plaquetasAtual !== undefined ? Number(params.plaquetasAtual) : null;
    var sangramentoAtivo = params.sangramentoAtivo === true;
    var tceOuNeuro = params.tceOuNeurotrauma === true;
    var procedimento = String(params.procedimento || 'NENHUM').toUpperCase();
    var febreOuInfeccao = params.febreOuInfeccao === true || params.sepse === true;
    var suspeitaPttOuHit = params.suspeitaPttOuHit === true;

    // BLOQUEIO SENTINELA ABSOLUTO: PTT e HIT
    if (suspeitaPttOuHit) {
      return {
        indicada: false,
        bloqueioAbsoluto: true,
        categoria: 'CONTRAINDICADA_RISCO_TROMBOSE_FATAL',
        gatilhoAlvo: 0,
        unidadesRecomendadas: 0,
        aféreseRecomendada: 0,
        justificativa: '🛑 CONTRAINDICAÇÃO FORMAL ABSOLUTA: Suspeita de Púrpura Trombocitopênica Trombótica (PTT) ou Trombocitopenia Induzida por Heparina (HIT tipo II). A transfusão de plaquetas pode precipitar trombose arterial e venosa maciça catastrófica (combustível no fogo). Só transfundir em sangramento de risco iminente de morte no SNC.',
        alertas: [
          'Em PTT: Iniciar Plasmaférese de emergência com reposição de plasma e corticoterapia.',
          'Em HIT: Suspender imediatamente todas as heparinas (HNF e HBPM) e iniciar anticoagulante não-heparínico (Fondaparinux ou Argatrobana).'
        ]
      };
    }

    var gatilho = 10000;
    var justificativa = '';
    var categoria = 'PROFILATICA_MEDULAR';

    if (tceOuNeuro || procedimento.indexOf('NEURO') >= 0 || procedimento.indexOf('OCULAR') >= 0) {
      gatilho = 100000;
      categoria = 'NEUROCIRURGIA_SNC';
      justificativa = 'Neurocirurgia, trauma cranioencefálico grave ou cirurgia oftalmológica de câmara posterior. Alvo rigoroso de plaquetas >= 100.000/mcL para prevenir hematoma expansivo no SNC.';
    } else if (sangramentoAtivo || procedimento.indexOf('PUNCAO_LOMBAR') >= 0 || procedimento.indexOf('BIOPSIA') >= 0 || procedimento.indexOf('CIRURGIA_GRANDE') >= 0) {
      gatilho = 50000;
      categoria = 'SANGRAMENTO_OU_PROCEDIMENTO_INVASIVO';
      justificativa = 'Sangramento clinicamente significativo, CIVD ou necessidade de cirurgia de grande porte / punção lombar / biópsia de órgão maciço. Alvo plaquetário >= 50.000/mcL.';
    } else if (febreOuInfeccao) {
      gatilho = 20000;
      categoria = 'PROFILAXIA_COM_FATORES_DE_RISCO';
      justificativa = 'Trombocitopenia com fatores de consumo/consumo acelerado associados (febre > 38°C, sepse grave, mucosite extensa ou alterações de coagulação). Alvo >= 20.000/mcL.';
    } else {
      gatilho = 10000;
      categoria = 'PROFILAXIA_FALENCIA_MEDULAR';
      justificativa = 'Profilaxia em hipoproliferação medular estável (quimioterapia / aplasia) sem outros fatores de risco. Alvo >= 10.000/mcL.';
    }

    var indicada = (plaquetas !== null && plaquetas < gatilho);
    var unidadesRandomicas = 0;
    var aféreseRecomendada = 0;
    var incrementoEsperado = '';

    if (indicada) {
      // 1 unidade convencional a cada 10 kg de peso (ex: 70 kg -> 7 UI, teto seguro de 10 UI no adulto)
      unidadesRandomicas = Math.min(10, Math.max(4, Math.round(peso / 10)));
      // 1 aférese de doador único equivale a 6-8 unidades randômicas
      aféreseRecomendada = 1;
      incrementoEsperado = 'Elevação esperada de 30.000 a 50.000/mcL após 1 pool de aférese (ou ~5.000 a 8.000/mcL por unidade randômica em adulto de 70 kg).';
    }

    var alertas = [];
    if (peso > 150) {
      alertas.push('⚠️ OBESIDADE SEVERA (> 150 kg): O cálculo de plaquetas randômicas foi limitado ao teto padrão de 10 unidades para prevenir sobrecarga volêmica. Recomenda-se transfundir concentrado de plaquetas por aférese (1 a 2 pools).');
    }
    if (!indicada && plaquetas !== null) {
      alertas.push('Plaquetas atuais (' + plaquetas.toLocaleString('pt-BR') + '/mcL) estão acima do gatilho recomendado de ' + gatilho.toLocaleString('pt-BR') + '/mcL. Transfusão desnecessária evitada.');
    } else if (indicada) {
      alertas.push('Preferencia por Aférese: O concentrado de plaquetas por aférese reduz o número de doadores expostos e a taxa de aloimunização.');
      alertas.push('Infusão rápida: Administrar em 20 a 30 minutos em equipo com filtro específico para plaquetas.');
      alertas.push('Duração biológica: A meia-vida plaquetária transfundida é de cerca de 3 a 4 dias (ou poucas horas em estados sépticos/imunológicos).');
    }

    return {
      indicada: indicada,
      bloqueioAbsoluto: false,
      plaquetasAtual: plaquetas,
      gatilhoAlvo: gatilho,
      categoria: categoria,
      justificativa: justificativa,
      pesoKg: peso,
      unidadesRandomicasCalculadas: unidadesRandomicas,
      aféreseRecomendada: aféreseRecomendada,
      incrementoEsperado: incrementoEsperado,
      alertas: alertas
    };
  }

  /**
   * Avalia necessidade e calcula reposição determinística de Crioprecipitado.
   * @param {Object} params
   * @returns {Object}
   */
  function calcularReposicaoCrioprecipitado(params) {
    params = params || {};
    var peso = Math.max(30, Math.min(250, Number(params.peso) || 70));
    var fibrinogenio = params.fibrinogenioAtual !== undefined ? Number(params.fibrinogenioAtual) : null;
    var cenario = String(params.cenario || 'GERAL').toUpperCase();
    var sangramentoAtivo = params.sangramentoAtivo === true;

    // Gatilhos de Fibrinogênio:
    // Em HPP e Trauma Grave / PTM: meta >= 200 mg/dL (gatilho < 200)
    // Em sangramento clínico geral / CIVD: meta >= 150 mg/dL (gatilho < 150)
    // Em profilaxia assintomática: gatilho < 100 mg/dL
    var gatilhoFibrinogenio = 150;
    var alvoFibrinogenio = 200;

    if (cenario.indexOf('HPP') >= 0 || cenario.indexOf('OBSTETRIC') >= 0 || cenario.indexOf('TRAUMA') >= 0 || cenario.indexOf('PTM') >= 0) {
      gatilhoFibrinogenio = 200;
      alvoFibrinogenio = 200;
    } else if (!sangramentoAtivo) {
      gatilhoFibrinogenio = 100;
      alvoFibrinogenio = 150;
    }

    var indicada = (fibrinogenio !== null && fibrinogenio < gatilhoFibrinogenio);
    var bolsasRecomendadas = 0;
    var incrementoEsperado = '';

    if (indicada) {
      // Regra clínica: 1 bolsa para cada 7 a 10 kg de peso (habitual adulto = 1 pool de 10 bolsas)
      // Cálculo detalhado: Cada bolsa possui em média 200 a 250 mg de fibrinogênio
      var volumePlasmaticoDl = (peso * 40) / 100;
      var deficitMg = Math.max(0, alvoFibrinogenio - fibrinogenio) * volumePlasmaticoDl;
      var bolsasExatas = Math.ceil(deficitMg / 250);
      bolsasRecomendadas = Math.max(6, Math.min(15, bolsasExatas || Math.round(peso / 7)));
      incrementoEsperado = 'Elevação estimada de aproximadamente ' + Math.round((bolsasRecomendadas * 220) / volumePlasmaticoDl) + ' mg/dL de fibrinogênio plasmático.';
    }

    var alertas = [];
    if (!indicada && fibrinogenio !== null) {
      alertas.push('Fibrinogênio sérico (' + fibrinogenio + ' mg/dL) adequado para o cenário clínico (alvo >= ' + gatilhoFibrinogenio + ' mg/dL).');
    } else if (indicada) {
      alertas.push('Composição nobre: O Crioprecipitado é rico em Fibrinogênio, Fator VIII, Fator de von Willebrand (vWF) e Fator XIII.');
      alertas.push('Modo de administração: Infundir em velocidade rápida (pool de 10 unidades infundido em 15 a 30 minutos).');
    }

    return {
      indicada: indicada,
      fibrinogenioAtual: fibrinogenio,
      gatilhoFibrinogenio: gatilhoFibrinogenio,
      alvoFibrinogenio: alvoFibrinogenio,
      pesoKg: peso,
      bolsasCalculadas: bolsasRecomendadas,
      incrementoEsperado: incrementoEsperado,
      alertas: alertas
    };
  }

  /**
   * Avalia escore ISTH para Coagulação Intravascular Disseminada (CIVD Manifesta / Overt DIC).
   * @param {Object} params
   * @returns {Object}
   */
  function avaliarCivd(params) {
    params = params || {};
    var plaquetas = Number(params.plaquetas) || 150000;
    var dDimeroAumento = String(params.dDimeroAumento || 'NORMAL').toUpperCase(); // NORMAL, MODERADO, ACENTUADO
    var tpAlargadoSegundos = Number(params.tpAlargadoSegundos) || 0; // segundos acima do controle
    var fibrinogenio = Number(params.fibrinogenio) || 200;
    var temSangramento = params.sangramentoAtivo === true;

    var pontos = 0;
    var achados = [];

    // 1. Plaquetas
    if (plaquetas < 50000) {
      pontos += 2;
      achados.push({ criterio: 'Plaquetas < 50.000/mcL (' + plaquetas.toLocaleString('pt-BR') + ')', pontos: 2 });
    } else if (plaquetas <= 100000) {
      pontos += 1;
      achados.push({ criterio: 'Plaquetas entre 50.000 e 100.000/mcL (' + plaquetas.toLocaleString('pt-BR') + ')', pontos: 1 });
    } else {
      achados.push({ criterio: 'Plaquetas > 100.000/mcL', pontos: 0 });
    }

    // 2. Marcadores relacionados à fibrina (D-dímero / PDF)
    if (dDimeroAumento === 'ACENTUADO' || dDimeroAumento === 'FORTE') {
      pontos += 3;
      achados.push({ criterio: 'Aumento acentuado de marcadores de fibrina (D-dímero muito alto)', pontos: 3 });
    } else if (dDimeroAumento === 'MODERADO') {
      pontos += 2;
      achados.push({ criterio: 'Aumento moderado de marcadores de fibrina', pontos: 2 });
    } else {
      achados.push({ criterio: 'Marcadores de fibrina normais', pontos: 0 });
    }

    // 3. Tempo de Protrombina (segundos acima do controle)
    if (tpAlargadoSegundos >= 6) {
      pontos += 2;
      achados.push({ criterio: 'Tempo de Protrombina prolongado >= 6 segundos acima do controle', pontos: 2 });
    } else if (tpAlargadoSegundos >= 3) {
      pontos += 1;
      achados.push({ criterio: 'Tempo de Protrombina prolongado entre 3 e 6 segundos', pontos: 1 });
    } else {
      achados.push({ criterio: 'Tempo de Protrombina prolongado < 3 segundos', pontos: 0 });
    }

    // 4. Fibrinogênio sérico
    if (fibrinogenio < 100) {
      pontos += 1;
      achados.push({ criterio: 'Hipofibrinogenemia severa (< 100 mg/dL: ' + fibrinogenio + ' mg/dL)', pontos: 1 });
    } else {
      achados.push({ criterio: 'Fibrinogênio sérico >= 100 mg/dL', pontos: 0 });
    }

    var civdManifesta = pontos >= 5;
    var planoAcao = [];

    if (civdManifesta) {
      planoAcao.push('DIAGNÓSTICO CONFIRMADO DE CIVD MANIFESTA (Overt DIC Score >= 5). Alta mortalidade associada.');
      planoAcao.push('PRIORIDADE ABSOLUTA: Tratar agressivamente a doença de base (foco séptico, controle de descolamento de placenta, quimioterapia para leucemia promielocítica).');
      if (temSangramento) {
        if (plaquetas < 50000) planoAcao.push('Reposição de Plaquetas (alvo > 50.000/mcL) devido ao sangramento ativo.');
        if (tpAlargadoSegundos >= 3) planoAcao.push('Reposição de Plasma Fresco Congelado (PFC 15 mL/kg) para repor múltiplos fatores de coagulação.');
        if (fibrinogenio < 150) planoAcao.push('Reposição de Crioprecipitado (1 pool de 10 UI) para restaurar fibrinogênio > 150 mg/dL.');
      } else {
        planoAcao.push('Sem sangramento ativo: Tratamento direcionado exclusivamente à causa base; transfusões profiláticas de rotina são desaconselhadas para não alimentar a microtrombose.');
      }
    } else {
      planoAcao.push('Escore ISTH < 5: Não fecha critérios de CIVD manifesta no momento. Reavaliar diariamente em pacientes críticos com suspeita em evolução.');
    }

    return {
      pontosTotais: pontos,
      civdManifesta: civdManifesta,
      classificacao: civdManifesta ? 'CIVD_MANIFESTA' : 'NAO_MANIFESTA',
      achados: achados,
      planoAcao: planoAcao
    };
  }

  /**
   * Avalia e classifica diagnósticos diferenciais de Reações Transfusionais Agudas (RTA).
   * @param {Object} params
   * @returns {Object}
   */
  function avaliarReacaoTransfusional(params) {
    params = params || {};
    var febre = params.febre === true || Number(params.temperatura) >= 37.8;
    var hipotensao = params.hipotensao === true || Number(params.pas) < 90;
    var dispneia = params.dispneia === true;
    var estertores = params.estertores === true || params.edemaPulmonar === true;
    var turgenciaJugular = params.turgenciaJugular === true;
    var dorLombar = params.dorLombar === true;
    var coluria = params.coluria === true || params.urinaEscura === true;
    var urticaria = params.urticaria === true || params.prurido === true;
    var estridor = params.estridor === true || params.broncoespasmo === true;
    var calafrios = params.calafrios === true;

    var tipoReacao = 'INDETERMINADA';
    var gravidade = 'MODERADA';
    var condutaImediata = [];
    var investigacao = [];

    if (dorLombar && (coluria || hipotensao || febre)) {
      tipoReacao = 'REACAO_HEMOLITICA_AGUDA_ABO';
      gravidade = 'EMERGENCIA_MAXIMA';
      condutaImediata.push('🛑 INTERRUPÇÃO IMEDIATA E DEFINITIVA DA TRANSFUSÃO!');
      condutaImediata.push('Manter acesso venoso calibroso pérvio com infusão de Soro Fisiológico 0,9%. Não desconectar equipo da bolsa para envio ao banco de sangue.');
      condutaImediata.push('Hiper-hidratação vigorosa com cristaloides para manter diurese > 100 mL/h e prevenir necrose tubular aguda por hemoglobina livre.');
      condutaImediata.push('Suporte hemodinâmico com vasopressores (Noradrenalina) se choque persistente.');
      investigacao.push('Enviar bolsa de sangue e equipo intactos imediatamente ao Hemocentro.');
      investigacao.push('Coleta de amostra de sangue pós-reação: Teste de Coombs Direto, Hemoglobina livre plasmática, Haptoglobina, Bilirrubinas, LDH e Urina I.');
    } else if (dispneia && (estridor || (urticaria && hipotensao))) {
      tipoReacao = 'ANAFILAXIA_TRANSFUSIONAL';
      gravidade = 'EMERGENCIA_MAXIMA';
      condutaImediata.push('🛑 INTERRUPÇÃO IMEDIATA DA TRANSFUSÃO!');
      condutaImediata.push('Adrenalina 1:1.000 (0,5 mg IM no vasto lateral da coxa) IMEDIATAMENTE. Repetir em 5-10 min se necessário.');
      condutaImediata.push('Oxigenoterapia sob máscara e preparo para intubação se edema de glote.');
      condutaImediata.push('Anti-histamínico IV (Difenidramina 50 mg) + Corticoide IV (Hidrocortisona 200 a 500 mg).');
      investigacao.push('Dosar IgA sérica e anticorpos anti-IgA (suspeita de deficiência congênita de IgA).');
    } else if (dispneia && estertores && turgenciaJugular) {
      tipoReacao = 'TACO_SOBRECARGA_CIRCULATORIA';
      gravidade = 'ALTA';
      condutaImediata.push('🛑 INTERRUPÇÃO DA TRANSFUSÃO!');
      condutaImediata.push('Posicionar paciente sentado com membros pendentes.');
      condutaImediata.push('Oxigenoterapia suplementar (manter SpO2 > 94%).');
      condutaImediata.push('Furosemida 20 a 40 mg IV em bolus imediato.');
      condutaImediata.push('Vasodilatadores venosos (Nitroglicerina) se pressão arterial elevada.');
      investigacao.push('Ecocardiograma beira-leito, Radiografia de tórax e dosagem de BNP / NT-proBNP.');
    } else if (dispneia && estertores && !turgenciaJugular && !hipotensao) {
      tipoReacao = 'TRALI_LESAO_PULMONAR_AGUDA';
      gravidade = 'ALTA';
      condutaImediata.push('🛑 INTERRUPÇÃO DA TRANSFUSÃO!');
      condutaImediata.push('Suporte ventilatório protetor com PEEP moderada (VNI ou Intubação Orotraqueal).');
      condutaImediata.push('NÃO administrar diuréticos em doses agressivas se não houver hipervolemia evidente.');
      condutaImediata.push('Notificação imediata ao hemocentro para bloqueio cautelar do doador.');
      investigacao.push('Radiografia de tórax (infiltrado bilateral), gasometria arterial e pesquisa de anticorpos anti-HLA / anti-HNA no doador.');
    } else if (febre && hipotensao && calafrios) {
      tipoReacao = 'CONTAMINACAO_BACTERIANA_SEPSE';
      gravidade = 'EMERGENCIA_MAXIMA';
      condutaImediata.push('🛑 INTERRUPÇÃO IMEDIATA DA TRANSFUSÃO!');
      condutaImediata.push('Coletar hemoculturas do paciente (2 sítios) e hemocultura direta da bolsa de sangue.');
      condutaImediata.push('Iniciar antibioticoterapia de amplo espectro em até 1 hora (ex: Meropenem ou Vancomicina + Cefepime).');
      condutaImediata.push('Ressuscitação volêmica vigorosa e vasopressores conforme protocolo de choque séptico.');
      investigacao.push('Bacterioscopia por Gram imediata do conteúdo da bolsa de sangue.');
    } else if (febre && !hipotensao && !coluria && !dorLombar) {
      tipoReacao = 'RFNH_REACAO_FEBRIL_NAO_HEMOLITICA';
      gravidade = 'LEVE_A_MODERADA';
      condutaImediata.push('Pausar a infusão temporariamente para excluir hemólise aguda.');
      condutaImediata.push('Antitérmico: Dipirona 1g IV ou Paracetamol 750mg VO.');
      condutaImediata.push('Pode reiniciar transfusão somente se descartada hemólise e com regressão térmica.');
      investigacao.push('Prescrever hemocomponentes DESLEUCOCITADOS (filtrados) nas próximas transfusões para evitar recidiva.');
    } else if (urticaria && !dispneia && !hipotensao) {
      tipoReacao = 'REACAO_ALERGICA_LEVE';
      gravidade = 'LEVE';
      condutaImediata.push('Pausar a transfusão.');
      condutaImediata.push('Administrar anti-histamínico IV ou VO (ex: Difenidramina 25-50 mg ou Dexclorfeniramina).');
      condutaImediata.push('Se sintomas regredirem completamente em 20-30 minutos sem surgimento de novos sinais, a transfusão pode ser reiniciada em velocidade lenta.');
      investigacao.push('Se reação recorrente, indicar hemocomponentes lavados.');
    }

    return {
      tipoReacao: tipoReacao,
      gravidade: gravidade,
      condutaImediata: condutaImediata,
      investigacao: investigacao
    };
  }

  /**
   * Consolida a prescrição médica hemoterápica padronizada.
   * @param {Object} params
   * @returns {Object}
   */
  function gerarPrescricaoTransfusionalCompleta(params) {
    params = params || {};
    var avalChad = avaliarGatilhoTransfusionalChad(params);
    var avalPfc = params.avaliarPfc ? calcularReposicaoPfc(params) : null;
    var avalPlaq = params.avaliarPlaquetas ? calcularReposicaoPlaquetas(params) : null;
    var avalCrio = params.avaliarCrioprecipitado ? calcularReposicaoCrioprecipitado(params) : null;

    var linhas = [];
    linhas.push('═══════════════════════════════════════════════════════════');
    linhas.push('       PRESCRIÇÃO E SOLICITAÇÃO HEMOTERÁPICA BEIRA-LEITO   ');
    linhas.push('═══════════════════════════════════════════════════════════');
    linhas.push('Paciente: ' + (params.pacienteNome || 'Não identificado') + ' | Peso: ' + avalChad.pesoKg + ' kg');
    linhas.push('Indicação Clínica: ' + (params.cenarioClinico || 'Avaliação Transfusional Hospitalar'));
    linhas.push('-----------------------------------------------------------');

    if (avalChad.indicada) {
      linhas.push('1. CONCENTRADO DE HEMÁCIAS (CHAD):');
      linhas.push('   • Quantidade: ' + avalChad.bolsasCalculadas + ' unidade(s) de CHAD (' + (avalChad.bolsasCalculadas * 300) + ' mL)');
      linhas.push('   • Exames obrigatórios: Tipagem ABO/Rh, PAI e Prova de Compatibilidade Maior');
      linhas.push('   • Velocidade: ' + avalChad.recomendacaoVelocidade);
      if (avalChad.alertaTaco) {
        linhas.push('   • PREVENÇÃO DE TACO: ' + avalChad.alertaTaco);
      }
    } else {
      linhas.push('1. CONCENTRADO DE HEMÁCIAS (CHAD): NÃO INDICADO no momento (Estratégia Restritiva mantida).');
    }

    if (avalPfc && avalPfc.indicada) {
      linhas.push('\n2. PLASMA FRESCO CONGELADO (PFC):');
      linhas.push('   • Quantidade: ' + avalPfc.bolsasRecomendadas + ' bolsa(s) (~' + avalPfc.volumeTotalRecomendadoMl + ' mL - Dose ' + avalPfc.dosePorKg + ')');
      linhas.push('   • Velocidade: Infusão em 30 a 60 min por bolsa com equipo com filtro');
    }

    if (avalPlaq && avalPlaq.indicada && !avalPlaq.bloqueioAbsoluto) {
      linhas.push('\n3. CONCENTRADO DE PLAQUETAS:');
      linhas.push('   • Quantidade: 1 pool de aférese OU ' + avalPlaq.unidadesRandomicasCalculadas + ' unidades randômicas');
      linhas.push('   • Velocidade: Infusão rápida em 20 a 30 minutos em equipo próprio');
    } else if (avalPlaq && avalPlaq.bloqueioAbsoluto) {
      linhas.push('\n3. CONCENTRADO DE PLAQUETAS: BLOQUEADO POR SEGURANÇA!');
      linhas.push('   • ' + avalPlaq.justificativa);
    }

    if (avalCrio && avalCrio.indicada) {
      linhas.push('\n4. CRIOPRECIPITADO:');
      linhas.push('   • Quantidade: ' + avalCrio.bolsasCalculadas + ' bolsas (pool de crioprecipitado)');
      linhas.push('   • Velocidade: Infusão rápida em 15 a 30 minutos');
    }

    linhas.push('\n-----------------------------------------------------------');
    linhas.push('ROTINA DE SEGURANÇA TRANSFUSIONAL (PORTARIA MS 5/2017):');
    linhas.push(' • Dupla checagem obrigatória à beira do leito por dois profissionais');
    linhas.push(' • Aferição de SSVV pré-transfusão, aos 10-15 minutos e ao término');
    linhas.push(' • Interromper imediatamente e comunicar o médico em caso de febre, calafrios, dispneia ou dor lombar');
    linhas.push('═══════════════════════════════════════════════════════════');

    return {
      textoPrescricao: linhas.join('\n'),
      chad: avalChad,
      pfc: avalPfc,
      plaquetas: avalPlaq,
      crioprecipitado: avalCrio
    };
  }

  /**
   * Formata resumo executivo em Markdown para Telegram / Terminal / Cockpit.
   * @param {Object} dados
   * @returns {string}
   */
  function formatarResumoTransfusional(dados) {
    dados = dados || {};
    var out = [];
    out.push('🩸 *PAINEL DE HEMOTERAPIA & TRANSFUSÃO SANGUÍNEA*');
    out.push('════════════════════════════════════════════');

    if (dados.chad) {
      out.push('\n🩸 *Concentrado de Hemácias (CHAD):*');
      out.push('• Status: *' + (dados.chad.indicada ? 'INDICADA ✅' : 'NÃO INDICADA 🛑') + '* (' + dados.chad.estrategia + ')');
      if (dados.chad.hbInformada !== null) out.push('• Hb Atual: *' + dados.chad.hbInformada + ' g/dL* | Gatilho: *' + dados.chad.gatilhoHb + ' g/dL* | Alvo: *' + dados.chad.hbAlvo + ' g/dL*');
      if (dados.chad.indicada) {
        out.push('• Prescrição: *' + dados.chad.bolsasCalculadas + ' bolsa(s)* (~' + (dados.chad.bolsasCalculadas * 300) + ' mL)');
        out.push('• Incremento Esperado: *+' + (dados.chad.bolsasCalculadas * dados.chad.deltaEsperadoPorBolsa).toFixed(1) + ' g/dL* de Hb');
      }
      if (dados.chad.alertaTaco) out.push('• ' + dados.chad.alertaTaco);
    }

    if (dados.ptm) {
      out.push('\n🚨 *PROTOCOLO DE TRANSFUSÃO MACIÇA (PTM 1:1:1):*');
      out.push('• Ativação Recomendada: *' + (dados.ptm.ativacaoPtm ? 'SIM 🛑' : 'NÃO') + '*');
      out.push('• Escore ABC: *' + dados.ptm.abcPontos + '/4 pontos* | Índice Choque: *' + dados.ptm.shockIndex + '* (' + dados.ptm.gravidadeChoque + ')');
      out.push('• Tipo CHAD Imediato: *' + dados.ptm.tipoChadEmergencia + '*');
      if (dados.ptm.txa) {
        out.push('• Ácido Tranexâmico (TXA): *' + dados.ptm.txa.ataque + '* seguido de *' + dados.ptm.txa.manutencao + '*');
      }
    }

    if (dados.plaquetas) {
      out.push('\n🩹 *Plaquetas:*');
      if (dados.plaquetas.bloqueioAbsoluto) {
        out.push('• 🛑 *BLOQUEIO ABSOLUTO:* ' + dados.plaquetas.justificativa);
      } else {
        out.push('• Status: *' + (dados.plaquetas.indicada ? 'INDICADA' : 'NÃO INDICADA') + '* (Gatilho: ' + dados.plaquetas.gatilhoAlvo.toLocaleString('pt-BR') + '/mcL)');
        if (dados.plaquetas.indicada) out.push('• Dose: *1 Aférese* ou *' + dados.plaquetas.unidadesRandomicasCalculadas + ' UI randômicas*');
      }
    }

    if (dados.pfc && dados.pfc.indicada) {
      out.push('\n🧪 *Plasma Fresco Congelado (PFC):*');
      out.push('• Dose: *' + dados.pfc.bolsasRecomendadas + ' bolsas* (~' + dados.pfc.volumeTotalRecomendadoMl + ' mL)');
    }

    if (dados.crioprecipitado && dados.crioprecipitado.indicada) {
      out.push('\n💉 *Crioprecipitado:*');
      out.push('• Dose: *' + dados.crioprecipitado.bolsasCalculadas + ' bolsas* (Pool)');
    }

    return out.join('\n');
  }

  return {
    avaliarGatilhoTransfusionalChad: avaliarGatilhoTransfusionalChad,
    calcularProtocoloTransfusaoMaciça: calcularProtocoloTransfusaoMaciça,
    calcularReposicaoPfc: calcularReposicaoPfc,
    calcularReposicaoPlaquetas: calcularReposicaoPlaquetas,
    calcularReposicaoCrioprecipitado: calcularReposicaoCrioprecipitado,
    avaliarCivd: avaliarCivd,
    avaliarReacaoTransfusional: avaliarReacaoTransfusional,
    gerarPrescricaoTransfusionalCompleta: gerarPrescricaoTransfusionalCompleta,
    formatarResumoTransfusional: formatarResumoTransfusional
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TransfusaoSanguineaService;
}
