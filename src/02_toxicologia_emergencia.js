/**
 * ==============================================================================
 * MÓDULO 02: TOXICOLOGIA DE EMERGÊNCIA E INTOXICAÇÕES EXÓGENAS
 * ==============================================================================
 * Diretrizes Clínicas Oficiais:
 *  - American College of Medical Toxicology (ACMT) Guidelines
 *  - Diretrizes Brasileiras de Toxicologia Clínica (ABRATOX)
 *  - Protocolos de Suporte Avançado de Vida em Toxicologia
 *
 * PILARES CLÍNICOS DETERMINÍSTICOS:
 *  1. Intoxicação por Paracetamol (Acetaminofeno):
 *     - Avaliação de risco baseada na dose ingerida (> 150 mg/kg ou > 7.5g no adulto).
 *     - Nomograma de Rumack-Matthew para estratificação de risco hepatotóxico (a partir de 4h).
 *     - Protocolos posológicos de N-acetilcisteína (NAC) IV (Esquema de 21h) e VO (Esquema de 72h).
 *  2. Intoxicação por Antidepressivos Tricíclicos (TCA):
 *     - Critério eletrocardiográfico (QRS > 100ms prediz convulsão, QRS > 160ms prediz arritmia ventricular).
 *     - Protocolo de alcalinização sistêmica com Bicarbonato de Sódio 8,4% 1 a 2 mEq/kg.
 *  3. Intoxicação por Beta-bloqueadores e Bloqueadores de Canal de Cálcio:
 *     - Glucagon em bolus e infusão contínua.
 *     - Gluconato/Cloreto de Cálcio para inotropismo e vasopressão.
 *     - Terapia Hiperinsulinêmica Euglicêmica (HIET) para choque refratário.
 *  4. Intoxicação por Opioides:
 *     - Protocolo escalonado de Naloxona guiado por status ventilatório (apneia vs depressão respiratória).
 * ==============================================================================
 */

var ToxicologiaEmergenciaService = (function() {
  'use strict';

  /**
   * Avalia intoxicação por Paracetamol e indica tratamento com N-acetilcisteína (NAC)
   * @param {Object} params
   *  - pesoKg (Number): peso do paciente
   *  - doseIngeridaMg (Number): dose total de paracetamol ingerida em mg
   *  - tempoIngestaoHoras (Number): tempo decorrido desde a ingestão aguda (horas)
   *  - nivelSericoMcgMl (Number): nível de paracetamol sérico medido (mcg/mL)
   *  - viaPreferencia (String): 'IV' ou 'VO' (padrão IV)
   */
  function avaliarParacetamol(params) {
    params = params || {};
    var pesoKg = params.pesoKg !== undefined ? Number(params.pesoKg) : undefined;
    var doseIngeridaMg = params.doseIngeridaMg !== undefined ? Number(params.doseIngeridaMg) : undefined;
    var tempoIngestaoHoras = params.tempoIngestaoHoras !== undefined ? Number(params.tempoIngestaoHoras) : undefined;
    var nivelSericoMcgMl = params.nivelSericoMcgMl !== undefined ? Number(params.nivelSericoMcgMl) : undefined;
    var via = (params.viaPreferencia || 'IV').toUpperCase();

    if (!pesoKg || pesoKg <= 0) {
      return { erro: 'O peso do paciente é obrigatório para avaliação toxicológica.' };
    }

    var limiarDoseToxicaAdulto = 7500; // mg (7.5g)
    var limiarDoseToxicaPeso = 150; // mg/kg
    var dosePorKg = doseIngeridaMg ? (doseIngeridaMg / pesoKg) : undefined;
    
    var provavelToxica = false;
    if (dosePorKg >= limiarDoseToxicaPeso || (doseIngeridaMg >= limiarDoseToxicaAdulto)) {
      provavelToxica = true;
    }

    var indicacaoNac = false;
    var motivoIndicacao = [];
    var linhaTratamentoRumack = undefined;

    // Se o nível sérico estiver disponível, aplicar Nomograma de Rumack-Matthew
    if (nivelSericoMcgMl !== undefined && tempoIngestaoHoras !== undefined) {
      if (tempoIngestaoHoras < 4) {
        motivoIndicacao.push('Nível sérico medido antes de 4h pós-ingestão aguda não é interpretável no nomograma. Aguarde 4h para coletar novo nível ou inicie NAC empiricamente se dose altamente suspeita.');
        if (provavelToxica) {
          indicacaoNac = true;
          motivoIndicacao.push('Início empírico de NAC indicado devido à dose possivelmente tóxica reportada (aguardando nível das 4h).');
        }
      } else if (tempoIngestaoHoras > 24) {
        motivoIndicacao.push('Apresentação tardia (>24h). O nomograma não é válido. Indicar NAC se Paracetamol sérico detectável ou transaminases elevadas.');
        if (nivelSericoMcgMl > 0) {
          indicacaoNac = true;
          motivoIndicacao.push('NAC indicado: nível sérico ainda detectável após 24h.');
        }
      } else {
        // Linha de tratamento: Y = 150 * (0.5)^((t-4)/4)
        linhaTratamentoRumack = 150 * Math.pow(0.5, (tempoIngestaoHoras - 4) / 4);
        
        if (nivelSericoMcgMl >= linhaTratamentoRumack) {
          indicacaoNac = true;
          motivoIndicacao.push('Nível sérico de ' + nivelSericoMcgMl + ' mcg/mL às ' + tempoIngestaoHoras + 'h está ACIMA da linha de tratamento do Nomograma de Rumack-Matthew (' + linhaTratamentoRumack.toFixed(1) + ' mcg/mL).');
        } else {
          motivoIndicacao.push('Nível sérico de ' + nivelSericoMcgMl + ' mcg/mL às ' + tempoIngestaoHoras + 'h está ABAIXO da linha de tratamento do Nomograma de Rumack-Matthew (' + linhaTratamentoRumack.toFixed(1) + ' mcg/mL). Sem indicação de NAC no momento (se aguda única).');
        }
      }
    } else {
      // Sem nível sérico
      if (provavelToxica) {
        indicacaoNac = true;
        motivoIndicacao.push('Nível sérico indisponível, mas dose reportada (' + (dosePorKg ? dosePorKg.toFixed(1) + ' mg/kg' : doseIngeridaMg + ' mg') + ') é tóxica. Iniciar NAC empiricamente.');
      } else if (doseIngeridaMg !== undefined) {
        motivoIndicacao.push('Nível sérico indisponível e dose reportada não atinge limiar tóxico clássico, mas a observação clínica e coleta de nível às 4h é recomendada.');
      } else {
        motivoIndicacao.push('Dados insuficientes para decisão baseada em dose ou nomograma. Na dúvida, inicie NAC ou colete nível.');
      }
    }

    var prescricaoNac = null;
    if (indicacaoNac) {
      if (via === 'VO') {
        prescricaoNac = {
          esquema: 'Esquema de 72 horas (VO)',
          doseAtaque: {
            descricao: '140 mg/kg VO/SNE dose única',
            doseMg: Math.round(pesoKg * 140)
          },
          doseManutencao: {
            descricao: '70 mg/kg VO/SNE a cada 4 horas por 17 doses (iniciar 4h após ataque)',
            doseMg: Math.round(pesoKg * 70),
            repeticoes: 17
          },
          observacao: 'A via VO é frequentemente associada a vômitos. Antiéticos (ex: Ondansetrona) podem ser necessários. Em caso de êmese em < 1h da dose, repetir a administração.'
        };
      } else {
        // IV - Protocolo de 21 horas
        prescricaoNac = {
          esquema: 'Protocolo Padrão de 21 horas (IV)',
          etapa1: {
            descricao: '150 mg/kg IV em 1 hora',
            doseMg: Math.round(pesoKg * 150),
            diluicao: pesoKg > 40 ? 'Diluir em 200 mL de SG 5%' : 'Diluir em 3 mL/kg de SG 5%',
            alerta: 'Infusão rápida pode causar reação anafilactoide. Se ocorrer rash/rubor, pausar, administrar anti-histamínico e reiniciar mais lento.'
          },
          etapa2: {
            descricao: '50 mg/kg IV em 4 horas',
            doseMg: Math.round(pesoKg * 50),
            diluicao: pesoKg > 40 ? 'Diluir em 500 mL de SG 5%' : 'Diluir em 7 mL/kg de SG 5%'
          },
          etapa3: {
            descricao: '100 mg/kg IV em 16 horas',
            doseMg: Math.round(pesoKg * 100),
            diluicao: pesoKg > 40 ? 'Diluir em 1000 mL de SG 5%' : 'Diluir em 14 mL/kg de SG 5%'
          },
          criteriosFim: 'Ao final de 21h, dosar transaminases e Paracetamol sérico. Se Paracetamol detectável ou TGP muito elevada, manter infusão da Etapa 3.'
        };
      }
    }

    return {
      sucesso: true,
      provavelDoseToxica: provavelToxica,
      linhaTratamentoNomograma: linhaTratamentoRumack !== undefined ? Number(linhaTratamentoRumack.toFixed(1)) : null,
      indicacaoNac: indicacaoNac,
      motivos: motivoIndicacao,
      prescricaoNac: prescricaoNac
    };
  }

  /**
   * Avalia intoxicação por Antidepressivos Tricíclicos (TCA)
   * @param {Object} params
   *  - pesoKg (Number)
   *  - qrsMs (Number): Duração do complexo QRS em milissegundos
   *  - convulsao (Boolean): Apresentou convulsão
   *  - hipotensao (Boolean): Apresentou hipotensão
   *  - arritmia (Boolean): Arritmias ventriculares
   */
  function avaliarTriciclicos(params) {
    params = params || {};
    var pesoKg = params.pesoKg !== undefined ? Number(params.pesoKg) : undefined;
    var qrsMs = params.qrsMs !== undefined ? Number(params.qrsMs) : undefined;
    var convulsao = params.convulsao === true;
    var hipotensao = params.hipotensao === true;
    var arritmia = params.arritmia === true;

    var riscoConvulsao = qrsMs >= 100;
    var riscoArritmia = qrsMs >= 160;
    
    var indicacaoBicarbonato = (qrsMs !== undefined && qrsMs >= 100) || arritmia || hipotensao;
    var prescricaoBicarbonato = null;

    var condutas = [
      'Monitorização eletrocardiográfica contínua obrigatória.',
      'Contraindicação absoluta à Fisostigmina (risco de assistolia).',
      'Contraindicação a bloqueadores de canal de sódio (ex: Amiodarona) para tratar arritmias de TCA.'
    ];

    if (convulsao) {
      condutas.push('Para convulsões: uso de Benzodiazepínicos de 1ª linha (Diazepam ou Midazolam). Evitar Fenitoína.');
    }

    if (indicacaoBicarbonato) {
      condutas.push('Alcalinização sistêmica com Bicarbonato de Sódio indicada pelo alargamento do QRS ou instabilidade hemodinâmica/arrítmica.');
      if (pesoKg && pesoKg > 0) {
        var doseBolusMin = Math.round(pesoKg * 1); // 1 mEq/kg
        var doseBolusMax = Math.round(pesoKg * 2); // 2 mEq/kg
        prescricaoBicarbonato = {
          descricaoBolus: 'Bicarbonato de Sódio 8,4% IV em bolus lento (' + doseBolusMin + ' a ' + doseBolusMax + ' mEq)',
          alvoDose: '1 a 2 mEq/kg (1 mL de Bicarbonato 8,4% = 1 mEq)',
          volumeBolus: doseBolusMin + ' a ' + doseBolusMax + ' mL',
          manutencao: 'Se QRS estreitar: infusão contínua de BIC 8,4% 150 mL em 1000 mL de SG 5% a 200 mL/h. Alvo: pH arterial 7.45 - 7.55.',
          repetirBolus: 'Pode-se repetir bolus a cada 3 a 5 min se arritmia ou QRS refratário, respeitando pH máximo de 7.55.'
        };
      } else {
        prescricaoBicarbonato = {
          alvoDose: '1 a 2 mEq/kg IV em bolus (1 mL de Bicarbonato 8,4% = 1 mEq)',
          manutencao: 'Alvo de pH gasométrico 7.45 - 7.55. Repetir bolus e manter infusão contínua para sustentar alcalinização até melhora clínica e ECG.'
        };
      }
    }

    if (hipotensao) {
      condutas.push('Para hipotensão: Reposição volêmica inicial com cristaloides. Se refratário, vasopressor de escolha: Noradrenalina.');
    }

    return {
      sucesso: true,
      riscoConvulsao: riscoConvulsao,
      riscoArritmiaVentricular: riscoArritmia,
      indicacaoBicarbonato: indicacaoBicarbonato,
      prescricaoBicarbonato: prescricaoBicarbonato,
      condutasGerais: condutas
    };
  }

  /**
   * Avalia intoxicação por Beta-bloqueadores (BB) ou Bloqueadores de Canal de Cálcio (BCC)
   * @param {Object} params
   *  - toxina (String): 'BB', 'BCC' ou 'MISTA'
   *  - pesoKg (Number)
   *  - estadoChoque (Boolean): Choque cardiogênico / vasoplégico refratário a fluidos
   */
  function avaliarCardiotoxicos(params) {
    params = params || {};
    var toxina = (params.toxina || '').toUpperCase();
    var pesoKg = params.pesoKg !== undefined ? Number(params.pesoKg) : undefined;
    var estadoChoque = params.estadoChoque === true;

    if (!toxina || (toxina !== 'BB' && toxina !== 'BCC' && toxina !== 'MISTA')) {
      return { erro: 'O tipo de toxina ("BB", "BCC" ou "MISTA") deve ser especificado.' };
    }

    var condutas = [];
    var farmacoterapia = {};

    condutas.push('Garantir acesso vascular periférico calibroso e cristaloides isotônicos IV para hipotensão inicial (cautela com edema pulmonar).');
    
    // Cálcio
    if (toxina === 'BCC' || toxina === 'MISTA') {
      condutas.push('Administração de Cálcio é prioritária para reverter inotropismo negativo e hipotensão em BCC.');
      farmacoterapia.calcio = {
        descricao: 'Gluconato de Cálcio 10% (30-60 mL) OU Cloreto de Cálcio 10% (10-20 mL - preferir acesso central) em bolus IV lento (5-10 min).',
        manutencao: 'Se resposta favorável, considerar infusão de Gluconato 10% 0,2 a 0,5 mL/kg/h.'
      };
    }

    // Glucagon
    if (toxina === 'BB' || toxina === 'MISTA' || (toxina === 'BCC' && estadoChoque)) {
      condutas.push('Glucagon é altamente eficaz para bradicardia e hipotensão induzida por BB (bypass dos receptores beta estimulando AMPc).');
      farmacoterapia.glucagon = {
        descricao: 'Glucagon 3 a 5 mg IV em bolus lento (1-2 min).',
        observacao: 'Se efeito positivo, iniciar infusão contínua de 1 a 5 mg/h (geralmente igual à dose do bolus eficaz). Pode causar náusea e vômito (pré-medicar com antiemético). O Glucagon esgota o estoque hospitalar rapidamente, providenciar reposição.'
      };
    }

    // HIET
    if (estadoChoque) {
      condutas.push('Em choque refratário: Iniciar Terapia Hiperinsulinêmica Euglicêmica (HIET). A insulina tem forte efeito inotrópico positivo em miocárdio deprimido por estas toxinas.');
      var doseAtaqueHiet = pesoKg ? Math.round(pesoKg * 1) : '1';
      farmacoterapia.hiet = {
        descricao: 'Terapia Hiperinsulinêmica Euglicêmica (HIET)',
        bolus: 'Insulina Regular ' + doseAtaqueHiet + ' U/kg IV bolus + Glicose 50% 1 mL/kg (se dextro < 200).',
        infusao: 'Insulina Regular 0.5 a 1 U/kg/h contínua.',
        monitorizacao: 'Glicemia capilar a cada 15-30 min inicialmente (infundir SG 10% para manter euglicemia) e Potássio horário (repor se < 3.0 mEq/L).'
      };
      
      condutas.push('Considerar Vasopressores (Noradrenalina, Adrenalina) se choque persistente, e Emulsão Lipídica (Intralipid 20%) se a droga for altamente lipofílica (ex: Propranolol, Verapamil).');
    }

    return {
      sucesso: true,
      toxina: toxina,
      farmacoterapia: farmacoterapia,
      condutasGerais: condutas
    };
  }

  /**
   * Avalia intoxicação por Opioides e prescreve Naloxona
   * @param {Object} params
   *  - ventilacao (String): 'APNEIA', 'DEPRIMIDA' ou 'NORMAL'
   */
  function avaliarOpioides(params) {
    params = params || {};
    var ventilacao = (params.ventilacao || 'DEPRIMIDA').toUpperCase();

    var condutas = [];
    var prescricaoNaloxona = null;

    condutas.push('O principal objetivo é restaurar a ventilação espontânea adequada, e NÃO necessariamente o despertar completo do paciente (risco de síndrome de abstinência aguda e agitação).');

    if (ventilacao === 'APNEIA') {
      condutas.push('Paciente em apneia: Necessidade imediata de ventilação com bolsa-válvula-máscara (Ambu) e altas doses de Naloxona.');
      prescricaoNaloxona = {
        doseInicial: '0.4 mg a 2.0 mg IV/IM ou Intranasal.',
        titulacao: 'Repetir a cada 2-3 minutos se não houver resposta, até máximo de 10 mg (considerar outro diagnóstico se não reverter).',
        preparo: 'Dose direta de ampolas padrão (0.4 mg/mL).'
      };
    } else if (ventilacao === 'DEPRIMIDA') {
      condutas.push('Paciente com depressão respiratória, mas respirando: Escalonamento cauteloso de Naloxona para evitar abstinência aguda.');
      prescricaoNaloxona = {
        doseInicial: '0.04 mg a 0.08 mg IV.',
        titulacao: 'Repetir e aumentar a dose gradualmente a cada 2 minutos (ex: 0.04 -> 0.08 -> 0.16 -> 0.4 mg) até FR > 12 ipm.',
        preparo: 'Diluir 1 ampola (0.4 mg / 1 mL) em 9 mL de SF 0,9%. Solução resultante = 0.04 mg/mL. Administrar 1 a 2 mL (0.04 a 0.08 mg) em bolus lento.'
      };
    } else {
      condutas.push('Paciente com ventilação normal: Não requer administração de Naloxona no momento, manter monitorização.');
    }

    condutas.push('Atenção: A meia-vida da Naloxona (30-60 min) é geralmente menor que a maioria dos opioides. Risco de re-narcotização. Pacientes revertidos devem ser observados por pelo menos 4 a 6 horas.');

    return {
      sucesso: true,
      condicaoVentilatoria: ventilacao,
      indicacaoNaloxona: ventilacao === 'APNEIA' || ventilacao === 'DEPRIMIDA',
      prescricaoNaloxona: prescricaoNaloxona,
      condutasGerais: condutas
    };
  }

  // API Pública do Módulo
  return {
    avaliarParacetamol: avaliarParacetamol,
    avaliarTriciclicos: avaliarTriciclicos,
    avaliarCardiotoxicos: avaliarCardiotoxicos,
    avaliarOpioides: avaliarOpioides
  };

})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = ToxicologiaEmergenciaService;
}
