/**
 * ==============================================================================
 * MÓDULO 02: ENDOCRINOLOGIA E DIABETES MELLITUS AVANÇADO (SBD / ADA)
 * ==============================================================================
 * Diretrizes Clínicas Oficiais:
 *  - Sociedade Brasileira de Diabetes (Diretrizes SBD 2024-2026)
 *  - American Diabetes Association (ADA Standards of Care in Diabetes 2024-2026)
 *  - Consenso Brasileiro de Emergências Hiperglicêmicas (CAD e EHH)
 *
 * PILARES CLÍNICOS DETERMINÍSTICOS:
 *  1. Calculadora Ambulatorial Basal-Bolus (DM1 e DM2):
 *     - DM1: 0.4 a 1.0 U/kg/dia com partição 50% Basal / 50% Prandial.
 *     - Fator de Sensibilidade à Insulina (FSI - Regra 1800 para análogos e 1500 para regular).
 *     - Relação Insulina:Carboidrato (ICR - Regra 500 para análogos).
 *     - DM2: Basalização inicial (10 UI ou 0.1 a 0.2 U/kg) e algoritmo de titulação 2-2-2.
 *     - Alertas de segurança farmacológica (suspensão de iSGLT2 perioperatório/grave contra CAD euglicêmica;
 *       ajuste de Metformina por TFG; bloqueio de sulfonilureias em idosos/renais).
 *  2. Protocolo de Hiperglicemia Hospitalar (Enfermaria e UTI):
 *     - Alvo hospitalar estruturado: 140 a 180 mg/dL (evitando < 110 mg/dL via ensaio NICE-SUGAR).
 *     - Condenação formal da "Sliding Scale" isolada sem basal.
 *     - Escala de correção rápida estratificada por sensibilidade (Sensível, Padrão, Resistente).
 *  3. Emergências Hiperglicêmicas: Cetoacidose Diabética (CAD) e Estado Hiperosmolar (EHH):
 *     - Estratificação diagnóstica e gravidade (CAD Leve, Moderada, Grave e EHH com Osmolaridade Efetiva).
 *     - Expansão volêmica inicial (15-20 mL/kg/h) e cálculo do Sódio Corrigido (Katz).
 *     - REGRA DE OURO DO POTÁSSIO: Bloqueio absoluto de Insulina IV se K < 3.3 mEq/L contra PCR por arritmia.
 *     - Titulação de Insulina Regular IV contínua (0.1 U/kg/h) com alvo de queda de 50-75 mg/dL/h.
 *     - Transição hídrica com SG 5% + SF 0.45% quando glicemia < 200 (CAD) ou < 250 (EHH).
 *     - Critérios restritivos de Bicarbonato de Sódio (apenas se pH < 6.90).
 *     - Critérios formais de resolução e Regra de Transição para SC (basal SC 1-2h antes de desligar a bomba).
 * ==============================================================================
 */

var EndocrinologiaDiabetesService = (function() {
  'use strict';

  // ───────────────────────────────────────────────────────────────────────────
  // 1. CALCULADORA BASAL-BOLUS AMBULATORIAL (DM1 & DM2)
  // ───────────────────────────────────────────────────────────────────────────

  function calcularInsulinaAmbulatorial(dados) {
    dados = dados || {};
    var peso = Number(dados.peso || 70);
    var tipoDm = Number(dados.tipoDm || 2);
    var descompensado = !!dados.descompensado;
    var tfg = dados.tfg !== undefined ? Number(dados.tfg) : 90;
    var ehIdoso = !!(dados.ehIdoso || (dados.idade && dados.idade >= 65));
    var emUsoIsglt2 = !!dados.emUsoIsglt2;

    if (peso <= 0) throw new Error('Peso inválido para cálculo de insulinoterapia.');

    var alertasFarmacologicos = [];

    // Alertas de Antidiabéticos Orais e Segurança
    if (emUsoIsglt2) {
      alertasFarmacologicos.push('⚠️ ALERTA iSGLT2: Suspender Dapagliflozina/Empagliflozina 3 a 4 dias antes de cirurgias eletivas ou imediatamente em casos de infecção/doença aguda (risco de Cetoacidose Diabética Euglicêmica com glicemia normal/pouco elevada).');
    }
    if (tfg < 30) {
      alertasFarmacologicos.push('⛔ CONTRAINDICAÇÃO METFORMINA: TFG < 30 mL/min contraindica formalmente a metformina devido ao risco de acidose lática grave. Suspender e ajustar para insulinoterapia.');
    } else if (tfg < 45) {
      alertasFarmacologicos.push('⚠️ AJUSTE METFORMINA: TFG entre 30 e 44 mL/min exige redução da dose máxima de metformina para 1.000 mg/dia com monitoramento renal semestral.');
    }
    if (ehIdoso) {
      alertasFarmacologicos.push('⚠️ CRITÉRIOS DE BEERS: Evitar sulfonilureias de longa ação (Glibenclamida) em idosos pelo risco severo de hipoglicemia prolongada e quedas. Preferir Gliclazida MR ou Insulina em esquema simplificado.');
    }

    if (tipoDm === 1) {
      // DM1: 0.5 U/kg/dia padrão (0.4 a 0.6 em fase inicial; até 0.8-1.0 em estresse/puberdade)
      var fatorDose = descompensado ? 0.6 : 0.5;
      var doseTotalDia = Math.max(1, Math.round(peso * fatorDose));
      var basal = Math.round(doseTotalDia * 0.5);
      var bolusTotal = doseTotalDia - basal;
      var bolusPorRefeicao = Math.round(bolusTotal / 3);

      // Regra 1800 para Fator de Sensibilidade (análogos rápidos)
      var fsi = Math.round(1800 / doseTotalDia);
      // Regra 500 para Relação Insulina:Carboidrato (ICR)
      var icr = Math.round(500 / doseTotalDia);

      return {
        sucesso: true,
        tipoDm: 'DM1',
        peso: peso,
        doseTotalDia: doseTotalDia,
        esquemaRecomendado: 'Basal-Bolus Intensivo (Múltiplas Doses Diárias)',
        basal: {
          dose: basal,
          tipo: 'Insulina Basal (Glargina U100/U300, Degludeca ou Detemir; ou NPH 2x/dia)',
          posologia: 'Administrar ' + basal + ' UI SC 1x ao dia (mesmo horário) ou NPH 2/3 pela manhã e 1/3 ao deitar.'
        },
        bolusPrandial: {
          doseTotalBolus: bolusTotal,
          dosePorRefeicaoFixa: bolusPorRefeicao,
          posologiaFixa: 'Administrar ' + bolusPorRefeicao + ' UI SC antes do café, almoço e jantar (análogo ultrarrápido 0-15 min antes da refeição).',
          contagemCarboidratos: {
            icr: icr,
            regraIcr: '1 UI de insulina para cada ' + icr + ' gramas de carboidrato consumidos.',
            fsi: fsi,
            regraFsi: 'Fator de Sensibilidade: 1 UI reduz aproximadamente ' + fsi + ' mg/dL de glicose.',
            metaGlicemicaPrandial: 'Alvo pré-prandial: 80 a 130 mg/dL; pós-prandial < 180 mg/dL.'
          }
        },
        alertasSeguranca: alertasFarmacologicos,
        orientacoes: 'Prescrever glicagão nasal ou injetável de resgate para hipoglicemia severa. Educação em contagem de carboidratos e automonitoramento capilar/sensor contínuo.'
      };
    } else if (tipoDm === 2) {
      // DM2: Início com Basalização oportuna (10 UI ou 0.1 a 0.2 U/kg)
      var doseBasalInicial = descompensado ? Math.max(10, Math.round(peso * 0.2)) : Math.max(10, Math.round(peso * 0.1));

      return {
        sucesso: true,
        tipoDm: 'DM2',
        peso: peso,
        esquemaRecomendado: 'Basalização Inicial (Insulina Noturna ou Matinal)',
        basal: {
          doseInicial: doseBasalInicial,
          tipo: 'Insulina Basal (Glargina, Degludeca ou NPH ao deitar)',
          posologia: 'Iniciar ' + doseBasalInicial + ' UI SC 1x ao dia (à noite ao deitar se NPH, ou horário fixo se análogo longo).'
        },
        algoritmoTitulacao: {
          regra: 'Titulação 2-2-2 / Treat-to-Target (SBD/ADA)',
          instrucao: 'Verificar glicemia de jejum por 3 dias consecutivos. Se média de jejum > 130 mg/dL, aumentar 2 UI da basal a cada 3 dias. Se média entre 80-130 mg/dL, manter dose. Se glicemia < 70 mg/dL, reduzir dose em 10-20% imediatamente.',
          adicaoBolusPrandial: 'Se basal titulada com jejum no alvo, mas HbA1c persistir elevada por glicemia pós-prandial > 180 mg/dL: progredir para esquema Basal-Plus adicionando 4 UI de insulina rápida antes da maior refeição do dia.'
        },
        alertasSeguranca: alertasFarmacologicos,
        orientacoes: 'Manter Metformina associada se tolerada e TFG >= 30 mL/min para reduzir demanda de insulina e ganho ponderal.'
      };
    }

    throw new Error('Tipo de DM inválido. Utilize 1 ou 2.');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. PROTOCOLO HOSPITALAR DE CORREÇÃO E ALVO GLICÊMICO (ENFERMARIA & UTI)
  // ───────────────────────────────────────────────────────────────────────────

  function protocoloCorrecaoHospitalar(dados) {
    dados = dados || {};
    var glicemia = Number(dados.glicemia || 0);
    var perfil = String(dados.perfil || 'padrao').toLowerCase(); // 'sensivel', 'padrao', 'resistente'

    if (glicemia <= 0) throw new Error('Glicemia capilar inválida.');

    // Alvo Hospitalar Recomendado pela ADA/SBD: 140 a 180 mg/dL
    var doseCorrecao = 0;
    var conduta = '';
    var alertaCritico = '';

    if (glicemia < 70) {
      doseCorrecao = 0;
      conduta = 'HIPOGLICEMIA (Glicemia < 70 mg/dL): NÃO aplicar insulina. Administrar 15g de carboidrato rápido VO (150 mL de suco ou água com 1 colher de sopa de açúcar) se consciente; se inconsciente/NPO, infundir 40 a 50 mL de Glicose 50% EV em bolus. Reavaliar glicemia em 15 minutos (Regra dos 15).';
      alertaCritico = '🚨 HIPOGLICEMIA HOSPITALAR DETECTADA. Notificar enfermagem e equipe médica imediatamente.';
    } else if (glicemia < 140) {
      doseCorrecao = 0;
      conduta = 'Glicemia dentro da faixa segura / sem necessidade de correção imediata. Alvo hospitalar padrão: 140 a 180 mg/dL.';
    } else if (glicemia <= 180) {
      // Faixa Alvo da ADA/SBD (140-180 mg/dL): nenhuma insulina de correção em enfermaria
      doseCorrecao = perfil === 'resistente' ? 2 : 0;
      conduta = doseCorrecao > 0
        ? 'Glicemia no limite superior do alvo (' + glicemia + ' mg/dL). Aplicar ' + doseCorrecao + ' UI SC de Insulina Rápida apenas por perfil resistente.'
        : 'Glicemia no alvo terapêutico hospitalar (140 a 180 mg/dL). Nenhuma correção suplementar necessária.';
    } else if (glicemia <= 220) {
      if (perfil === 'sensivel') doseCorrecao = 2;
      else if (perfil === 'resistente') doseCorrecao = 6;
      else doseCorrecao = 4;
      conduta = 'Aplicar ' + doseCorrecao + ' UI de Insulina Rápida/Ultrarrápida SC.';
    } else if (glicemia <= 260) {
      if (perfil === 'sensivel') doseCorrecao = 4;
      else if (perfil === 'resistente') doseCorrecao = 8;
      else doseCorrecao = 6;
      conduta = 'Aplicar ' + doseCorrecao + ' UI de Insulina Rápida/Ultrarrápida SC.';
    } else if (glicemia <= 300) {
      if (perfil === 'sensivel') doseCorrecao = 6;
      else if (perfil === 'resistente') doseCorrecao = 10;
      else doseCorrecao = 8;
      conduta = 'Aplicar ' + doseCorrecao + ' UI de Insulina Rápida/Ultrarrápida SC.';
    } else {
      // Glicemia > 300 mg/dL
      if (perfil === 'sensivel') doseCorrecao = 8;
      else if (perfil === 'resistente') doseCorrecao = 14;
      else doseCorrecao = 10;
      conduta = 'Aplicar ' + doseCorrecao + ' UI de Insulina Rápida/Ultrarrápida SC.';
      alertaCritico = '⚠️ HIPERGLICEMIA GRAVE (> 300 mg/dL): Avaliar hidratação, cetonemia/cetonúria, gasometria e excluir emergência hiperglicêmica (CAD / EHH).';
    }

    return {
      sucesso: true,
      glicemiaMedida: glicemia,
      perfilSensibilidade: perfil,
      doseCorrecaoSc: doseCorrecao,
      alvoRecomendadoAdaSbd: '140 a 180 mg/dL (NICE-SUGAR trial)',
      condutaPrescricao: conduta,
      alertaCritico: alertaCritico,
      advertenciaSlidingScale: 'IMPORTANTE: A diretriz SBD/ADA condena o uso isolado de escala móvel ("Sliding Scale pura") sem insulina basal. Pacientes internados devem receber esquema Basal-Bolus planejado com esta escala servindo apenas como resgate complementar.'
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. MANEJO DE CRISES HIPERGLICÊMICAS: CAD E EHH (SBD / ADA)
  // ───────────────────────────────────────────────────────────────────────────

  function manejoCriseHiperglicemica(dados) {
    dados = dados || {};
    var peso = Number(dados.peso || 70);
    var tipoCrise = String(dados.tipo || 'CAD').toUpperCase(); // 'CAD' ou 'EHH'
    var glicemia = Number(dados.glicemia || 350);
    var potassio = Number(dados.potassio !== undefined ? dados.potassio : 4.2);
    var sodioMedido = Number(dados.sodio || 135);
    var phArterial = dados.ph !== undefined ? Number(dados.ph) : 7.15;
    var bicarbonato = dados.bicarbonato !== undefined ? Number(dados.bicarbonato) : 12;
    var cloreto = Number(dados.cloreto || 100);

    if (peso <= 0) throw new Error('Peso inválido para protocolo de cetoacidose/estado hiperosmolar.');

    // Cálculo do Sódio Corrigido (Fórmula de Katz / Hillier)
    // Na Corrigido = Na_medido + 0.016 * (Glicose - 100)
    var deltaGlicose = Math.max(0, glicemia - 100);
    var fatorCorrecaoNa = glicemia > 400 ? 0.020 : 0.016;
    var sodioCorrigido = Math.round((sodioMedido + (fatorCorrecaoNa * deltaGlicose)) * 10) / 10;

    // Cálculo do Anion Gap: Na - (Cl + HCO3)
    var anionGap = Math.round(sodioMedido - (cloreto + bicarbonato));

    // Cálculo da Osmolaridade Plasmática Efetiva: 2*Na + Glicose/18
    var osmolaridadeEfetiva = Math.round((2 * sodioMedido) + (glicemia / 18));

    // Estratificação de Gravidade da CAD
    var gravidadeCad = 'N/A';
    if (tipoCrise === 'CAD') {
      if (phArterial < 7.00 || bicarbonato < 10) gravidadeCad = 'GRAVE (UTI Obrigatória, gasometria seriada)';
      else if (phArterial <= 7.24 || bicarbonato < 15) gravidadeCad = 'MODERADA (Semi-intensiva ou UTI)';
      else gravidadeCad = 'LEVE';
    }

    var condutaPotassio = '';
    var condutaInsulina = '';
    var bloqueioInsulinaAtivo = false;
    var condutaHidratacao = '';
    var condutaBicarbonato = '';
    var alertasSentinela = [];

    // ─────────────────────────────────────────────────────────────────────────
    // REGRA DE OURO 1: POTÁSSIO & LIBERAÇÃO DA INSULINA
    // ─────────────────────────────────────────────────────────────────────────
    if (potassio > 8.0) {
      alertasSentinela.push('🚨 HIPERCALEMIA EXTREMA (K+ > 8.0 mEq/L: ' + potassio + ' mEq/L): Risco iminente de assistolia/FV e PCR. Proibida reposição de potássio. Administrar Gluconato de Cálcio 10% 20 mL IV imediatamente se qualquer alteração no ECG e acionar nefrologia para Hemodiálise de Urgência.');
      condutaPotassio = 'K+ > 8.0 mEq/L (' + potassio + ' mEq/L): Risco crítico de PCR. NÃO repor potássio. Gluconato de Cálcio 10% IV imediato para estabilização de membrana miocárdica. Checar ECG seriado e acionar suporte dialítico.';
      var vazaoInsExtrema = Math.min(15, Math.round(peso * 0.1 * 10) / 10);
      condutaInsulina = 'Iniciar Insulina Regular IV contínua: ' + vazaoInsExtrema + ' UI/h (0.1 UI/kg/h) em BIC para auxiliar no shift intracelular de K+. Monitorar K+ sérico a cada 1 a 2 horas.';
    } else if (potassio < 3.3) {
      bloqueioInsulinaAtivo = true;
      alertasSentinela.push('🚨 BLOQUEIO FATAL DE INSULINA: K+ < 3.3 mEq/L (' + potassio + ' mEq/L). Iniciar insulina com hipocalemia causa influxo celular agudo maciço de potássio, levando a arritmias ventriculares malignas e PCR súbita.');
      condutaPotassio = 'K+ < 3.3 mEq/L: PARAR/NÃO INICIAR insulina. Repor 20 a 40 mEq/h de KCl IV diluído em infusão contínua com monitorização cardíaca contínua até K+ atingir >= 3.3 mEq/L.';
      condutaInsulina = '⛔ INSULINOTERAPIA BLOQUEADA. Aguardar reposição vigorosa de potássio e documentação de K+ >= 3.3 mEq/L antes de iniciar qualquer dose de insulina.';
    } else if (potassio <= 5.2) {
      condutaPotassio = 'K+ entre 3.3 e 5.2 mEq/L (' + potassio + ' mEq/L): Adicionar 20 a 30 mEq de KCl em cada litro de fluido de manutenção para manter K+ entre 4.0 e 5.0 mEq/L durante toda a insulinoterapia.';
      var doseBolusOpcional = Math.min(15, Math.round(peso * 0.1 * 10) / 10);
      var vazaoBombaInsulina = Math.min(15, Math.round(peso * 0.1 * 10) / 10);
      condutaInsulina = 'Iniciar Insulina Regular IV contínua: ' + vazaoBombaInsulina + ' UI/h (0.1 UI/kg/h) em bomba de infusão (opcional bolus inicial de ' + doseBolusOpcional + ' UI EV). Alvo de redução: 50 a 75 mg/dL por hora.';
    } else {
      // K > 5.2 mEq/L
      condutaPotassio = 'K+ > 5.2 mEq/L (' + potassio + ' mEq/L): NÃO repor potássio neste momento. Checar eletrólitos a cada 2 horas (o potássio cairá rapidamente com a infusão de insulina e hidratação). Iniciar reposição assim que K < 5.3.';
      var vazaoInsKAlto = Math.min(15, Math.round(peso * 0.1 * 10) / 10);
      condutaInsulina = 'Iniciar Insulina Regular IV contínua: ' + vazaoInsKAlto + ' UI/h (0.1 UI/kg/h). Monitorar K+ sérico a cada 2 horas.';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REGRA DE OURO 2: EXPANSÃO VOLÊMICA E TRANSIÇÃO COM GLICOSE
    // ─────────────────────────────────────────────────────────────────────────
    var volPrimeiraHoraMin = Math.round(peso * 15);
    var volPrimeiraHoraMax = Math.round(peso * 20);

    if (peso > 150) {
      volPrimeiraHoraMin = Math.min(volPrimeiraHoraMin, 2000);
      volPrimeiraHoraMax = Math.min(volPrimeiraHoraMax, 2000);
      alertasSentinela.push('⚠️ OBESIDADE SEVERA (> 150 kg: ' + peso + ' kg): Volume de expansão da 1ª hora limitado ao teto seguro de 2.000 mL (2 L) para prevenir sobrecarga hídrica e edema pulmonar agudo. Dose inicial de insulina com teto de 15 UI/h.');
    }

    var fluidoManutencao = sodioCorrigido >= 135
      ? 'NaCl 0.45% a 250-500 mL/h (devido ao Sódio Corrigido normal/alto: ' + sodioCorrigido + ' mEq/L).'
      : 'SF 0.9% a 250-500 mL/h (devido ao Sódio Corrigido baixo: ' + sodioCorrigido + ' mEq/L).';

    var gatilhoGlicose = tipoCrise === 'CAD' ? 200 : 250;
    condutaHidratacao = '1. Primeira Hora: Infundir SF 0.9% 15 a 20 mL/kg/h (' + volPrimeiraHoraMin + ' a ' + volPrimeiraHoraMax + ' mL na 1ª hora).\n' +
      '2. Horas Subsequentes: Infundir ' + fluidoManutencao + '\n' +
      '3. Ponto de Corte de Salvaguarda: Assim que glicemia atingir < ' + gatilhoGlicose + ' mg/dL, associar Soro Glicosado a 5% com NaCl 0.45% (SG 5% + SF 0.45%) a 150-250 mL/h para manter glicemia entre ' + (tipoCrise === 'CAD' ? '150-200' : '200-300') + ' mg/dL enquanto a insulina IV continua até resolução completa da acidose e do Anion Gap.';

    // ─────────────────────────────────────────────────────────────────────────
    // REGRA DE OURO 3: BICARBONATO DE SÓDIO (CRITÉRIOS ESTREITOS)
    // ─────────────────────────────────────────────────────────────────────────
    if (tipoCrise === 'CAD') {
      if (phArterial < 6.80) {
        alertasSentinela.push('🚨 ACIDEMIA EXTREMA (pH < 6.80: ' + phArterial + '): Disfunção miocárdica crítica e vasoplegia refratária com risco iminente de PCR. Bicarbonato de sódio IV mandatório para elevar o pH acima de 7.00.');
        condutaBicarbonato = 'pH < 6.80 (' + phArterial + '): Acidemia extrema com risco iminente de PCR. Indicação emergencial mandatória de Bicarbonato de Sódio. Administrar 100 mmol de Bicarbonato de Sódio 8.4% diluídos em 400 mL de água destilada com 20 mEq de KCl em infusão lenta de 2 horas. Repetir gasometria de controle ao término.';
      } else if (phArterial < 6.90) {
        condutaBicarbonato = 'pH < 6.90 (' + phArterial + '): Indicação formal de Bicarbonato de Sódio. Administrar 100 mmol de Bicarbonato de Sódio 8.4% diluídos em 400 mL de água destilada com 20 mEq de KCl em infusão lenta de 2 horas. Repetir dosagem gasométrica após o término.';
      } else {
        condutaBicarbonato = 'pH >= 6.90 (' + phArterial + '): Bicarbonato de Sódio é FORMALMENTE CONTRAINDICADO. Consensos ADA/SBD demonstram aumento do risco de hipocalemia severa, edema cerebral e acidose paradoxal intracelular do SNC.';
      }
    } else {
      condutaBicarbonato = 'EHH: Bicarbonato de Sódio não indicado (ausência de cetoacidose primária).';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REGRA DE TRANSIÇÃO PARA SUBCUTÂNEA (SC)
    // ─────────────────────────────────────────────────────────────────────────
    var criteriosResolucao = tipoCrise === 'CAD'
      ? 'Critérios de Resolução da CAD: Glicemia < 200 mg/dL associada a Bicarbonato sérico >= 15 mEq/L, pH venoso > 7.30, Anion Gap normal (<= 12) e tolerância à via oral.'
      : 'Critérios de Resolução do EHH: Glicemia < 250 mg/dL, Osmolaridade efetiva < 315 mOsm/kg, recuperação da consciência e tolerância oral.';

    var protocoloTransicaoSc = 'REGRA DE OURO DA TRANSIÇÃO SC: A primeira dose de Insulina Subcutânea (Basal: Glargina/NPH + Bolus de refeição) DEVE ser aplicada 1 a 2 horas ANTES de desligar a bomba de infusão IV contínua. Desligar a bomba sem insulina SC prévia causa hiperglicemia e cetoacidose rebote imediata.';

    return {
      sucesso: true,
      tipoCrise: tipoCrise,
      gravidadeCad: gravidadeCad,
      peso: peso,
      glicemiaInicial: glicemia,
      potassioInicial: potassio,
      sodioMedido: sodioMedido,
      sodioCorrigidoKatz: sodioCorrigido,
      anionGap: anionGap,
      osmolaridadeEfetiva: osmolaridadeEfetiva,
      bloqueioInsulinaAtivo: bloqueioInsulinaAtivo,
      alertasSentinela: alertasSentinela,
      hidratacaoVenosa: condutaHidratacao,
      potassioConduta: condutaPotassio,
      insulinoterapiaConduta: condutaInsulina,
      bicarbonatoConduta: condutaBicarbonato,
      criteriosResolucao: criteriosResolucao,
      protocoloTransicaoSc: protocoloTransicaoSc
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. AVALIAÇÃO INTEGRADA E FORMATAÇÃO UI (TELEGRAM & COCKPIT)
  // ───────────────────────────────────────────────────────────────────────────

  function formatarResumoDiabetes(resultado) {
    if (!resultado) return 'Erro ao gerar resumo endocrinológico.';
    var l = [];

    if (resultado.tipoCrise) {
      // Formatação de Emergência (CAD / EHH)
      l.push('🚨 *PROTOCOLO DE EMERGÊNCIA HIPERGLICÊMICA (' + resultado.tipoCrise + ')*');
      l.push('════════════════════════════════════════════');
      l.push('⚖️ *Dados do Paciente:* ' + resultado.peso + ' kg | Glicemia: ' + resultado.glicemiaInicial + ' mg/dL');
      l.push('🧪 *Biomarcadores:* K+ ' + resultado.potassioInicial + ' mEq/L | Na+ Corrigido ' + resultado.sodioCorrigidoKatz + ' mEq/L | Anion Gap ' + resultado.anionGap + ' | Osmolaridade ' + resultado.osmolaridadeEfetiva + ' mOsm/kg');
      if (resultado.gravidadeCad !== 'N/A') {
        l.push('📊 *Gravidade CAD:* ' + resultado.gravidadeCad);
      }
      l.push('');

      if (resultado.alertasSentinela && resultado.alertasSentinela.length > 0) {
        resultado.alertasSentinela.forEach(function(a) {
          l.push(a);
        });
        l.push('');
      }

      l.push('💉 *1. INSULINOTERAPIA:*');
      l.push(resultado.insulinoterapiaConduta);
      l.push('');

      l.push('🍌 *2. CONDUTA DE POTÁSSIO:*');
      l.push(resultado.potassioConduta);
      l.push('');

      l.push('💧 *3. EXPANSÃO VOLÊMICA:*');
      l.push(resultado.hidratacaoVenosa);
      l.push('');

      l.push('🧪 *4. BICARBONATO DE SÓDIO:*');
      l.push(resultado.bicarbonatoConduta);
      l.push('');

      l.push('🎯 *5. CRITÉRIOS DE RESOLUÇÃO & TRANSIÇÃO:*');
      l.push(resultado.criteriosResolucao);
      l.push('💡 _' + resultado.protocoloTransicaoSc + '_');
    } else if (resultado.tipoDm) {
      // Formatação Ambulatorial Basal-Bolus
      l.push('🩺 *PRESCRIÇÃO DE INSULINOTERAPIA AMBULATORIAL (' + resultado.tipoDm + ')*');
      l.push('════════════════════════════════════════════');
      l.push('⚖️ Peso: ' + resultado.peso + ' kg | Estratégia: ' + resultado.esquemaRecomendado);
      if (resultado.doseTotalDia) {
        l.push('📊 Dose Total Diária Estimada: ' + resultado.doseTotalDia + ' UI/dia');
      }
      l.push('');
      l.push('💉 *Insulina Basal:*');
      l.push('• ' + (resultado.basal.posologia || resultado.basal.tipo));
      l.push('');

      if (resultado.bolusPrandial) {
        l.push('🍽️ *Insulina Prandial (Bolus):*');
        l.push('• ' + resultado.bolusPrandial.posologiaFixa);
        if (resultado.bolusPrandial.contagemCarboidratos) {
          l.push('• ' + resultado.bolusPrandial.contagemCarboidratos.regraIcr);
          l.push('• ' + resultado.bolusPrandial.contagemCarboidratos.regraFsi);
        }
        l.push('');
      }

      if (resultado.algoritmoTitulacao) {
        l.push('📈 *Algoritmo de Titulação:*');
        l.push('• ' + resultado.algoritmoTitulacao.instrucao);
        l.push('');
      }

      if (resultado.alertasSeguranca && resultado.alertasSeguranca.length > 0) {
        l.push('⚠️ *Alertas de Segurança Farmacológica:*');
        resultado.alertasSeguranca.forEach(function(al) {
          l.push('  ' + al);
        });
        l.push('');
      }

      l.push('📋 *Recomendações:* ' + resultado.orientacoes);
    }

    return l.join('\n');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. SÍNDROME CARDIO-RENAL-METABÓLICA (CKM - AHA 2024)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avalia o Estadiamento da Síndrome Cardio-Renal-Metabólica (CKM - AHA 2024).
   *
   * @param {Object} params - Parâmetros clínicos e laboratoriais do paciente
   * @param {number} params.imc - Índice de Massa Corporal (kg/m²)
   * @param {boolean} [params.etniaAsiatica=false] - Ponto de corte de IMC/CA ajustado para asiáticos
   * @param {number} [params.circunferenciaAbdominal] - Em cm
   * @param {string} [params.sexo='M'] - 'M' ou 'F'
   * @param {number} [params.glicemiaJejum=85] - mg/dL
   * @param {number} [params.hba1c=5.0] - %
   * @param {boolean} [params.dm2Diagnostico=false] - Diagnóstico prévio de DM2
   * @param {boolean} [params.hasDiagnostico=false] - Diagnóstico prévio de Hipertensão
   * @param {number} [params.pas=120] - Pressão Arterial Sistólica (mmHg)
   * @param {number} [params.pad=80] - Pressão Arterial Diastólica (mmHg)
   * @param {number} [params.triglicerideos=100] - mg/dL
   * @param {boolean} [params.sindromeMetabolica=false] - Critérios de SM preenchidos
   * @param {number} params.tfg - Taxa de Filtração Glomerular estimada (mL/min/1.73m²)
   * @param {number} [params.rac=0] - Relação Albumina/Creatinina urinária (mg/g)
   * @param {boolean} [params.dialise=false] - Paciente em terapia renal substitutiva
   * @param {Object} [params.dcvSubclinica={}] - Marcadores de DCV subclínica
   * @param {Object} [params.dcvClinica={}] - Doença Cardiovascular Clínica estabelecida
   * @returns {Object} Resultado determinístico do estadiamento CKM e condutas
   */
  function avaliarSindromeCKM(params) {
    if (!params || typeof params.imc !== 'number' || typeof params.tfg !== 'number') {
      throw new Error("Parâmetros obrigatórios ausentes: 'imc' e 'tfg' devem ser fornecidos como números.");
    }

    const {
      imc,
      etniaAsiatica = false,
      circunferenciaAbdominal = 0,
      sexo = 'M',
      glicemiaJejum = 85,
      hba1c = 5.0,
      dm2Diagnostico = false,
      hasDiagnostico = false,
      pas = 120,
      pad = 80,
      triglicerideos = 100,
      sindromeMetabolica = false,
      tfg,
      rac = 0,
      dialise = false,
      dcvSubclinica = {},
      dcvClinica = {}
    } = params;

    const criteriosAtendidos = [];
    let estadio = "0";
    let nomeEstadio = "";
    let condutasEspecificas = [];

    // 1. Critérios de Adiposidade (Estádio 1)
    const corteImcSobrepeso = etniaAsiatica ? 23 : 25;
    const corteCaHomem = etniaAsiatica ? 90 : 102;
    const corteCaMulher = etniaAsiatica ? 80 : 88;
    const caAumentada = (sexo.toUpperCase() === 'M' && circunferenciaAbdominal >= corteCaHomem) ||
                        (sexo.toUpperCase() === 'F' && circunferenciaAbdominal >= corteCaMulher);
    const excessoAdiposidade = (imc >= corteImcSobrepeso) || caAumentada;

    // 2. Critérios Glicêmicos (Pré-DM vs DM2)
    const isDiabetes = dm2Diagnostico || glicemiaJejum >= 126 || hba1c >= 6.5;
    const isPreDiabetes = !isDiabetes && ((glicemiaJejum >= 100 && glicemiaJejum <= 125) || (hba1c >= 5.7 && hba1c <= 6.4));

    // 3. Critérios de Fatores de Risco Metabólicos (Estádio 2)
    const isHipertenso = hasDiagnostico || pas >= 130 || pad >= 80;
    const isHipertrigliceridemia = triglicerideos >= 135;

    // 4. Critérios Renais (KDIGO / AHA)
    const isFalenciaRenal = dialise || tfg < 15;
    const isDrcMuitoAltoRisco = !isFalenciaRenal && (
      tfg < 30 ||
      rac > 300 ||
      (tfg >= 30 && tfg < 45 && rac >= 30)
    );
    const isDrcModeradaAltoRisco = !isFalenciaRenal && !isDrcMuitoAltoRisco && (
      (tfg >= 30 && tfg < 60) ||
      (rac >= 30 && rac <= 300)
    );

    // 5. Critérios Cardiovasculares (Subclínico vs Clínico)
    const temDcvClinica = Boolean(
      dcvClinica.dac || dcvClinica.ic || dcvClinica.avc || dcvClinica.dap || dcvClinica.fa
    );

    const temDcvSubclinica = Boolean(
      (dcvSubclinica.escoreCalcioCoronario && dcvSubclinica.escoreCalcioCoronario >= 100) ||
      dcvSubclinica.biomarcadoresElevados ||
      dcvSubclinica.ecocardiogramaAlterado ||
      dcvSubclinica.riscoPreventAlto
    );

    if (temDcvClinica) {
      if (isFalenciaRenal) {
        estadio = "4b";
        nomeEstadio = "Estádio 4b: DCV Clínica na presença de Falência Renal (DRC G5 / Diálise)";
        criteriosAtendidos.push("Doença Cardiovascular Clínica manifesta associada a TFG < 15 mL/min/1.73m² ou diálise.");
        condutasEspecificas = [
          "Manejo multidisciplinar intensivo (Cardio-Nefro-Endócrino).",
          "Atenção às restrições de prescrição na DRC G5 (iSGLT2 não devem ser iniciados se TFG < 20, mas mantidos até diálise se já em uso).",
          "Agonistas de GLP-1 (Semaglutida, Liraglutida, Dulaglutida) podem ser usados com segurança até TFG < 15 mL/min.",
          "Controle rigoroso de volume, potássio e metabolismo mineral ósseo."
        ];
      } else {
        estadio = "4a";
        nomeEstadio = "Estádio 4a: DCV Clínica sem Falência Renal Terminal";
        if (dcvClinica.dac) criteriosAtendidos.push("Doença Arterial Coronariana (DAC/IAM)");
        if (dcvClinica.ic) criteriosAtendidos.push("Insuficiência Cardíaca (IC)");
        if (dcvClinica.avc) criteriosAtendidos.push("Doença Cerebrovascular (AVC/AIT)");
        if (dcvClinica.dap) criteriosAtendidos.push("Doença Arterial Periférica (DAP)");
        if (dcvClinica.fa) criteriosAtendidos.push("Fibrilação Atrial (FA)");

        condutasEspecificas = [
          "Prevenção secundária intensiva (Estatina de alta potência +/- Ezetimiba para LDL < 55 mg/dL).",
          "Priorização absoluta de fármacos cardioprotetores: iSGLT2 e/ou AR-GLP1 (ou co-agonista GIP/GLP-1).",
          "Se DRC albuminúrica (RAC >= 30) e DM2: associar IECA/BRA + iSGLT2 + Finerenona (se K+ <= 4.8 e TFG >= 25).",
          "Terapia antitrombótica e bloqueio neuro-hormonal conforme diretrizes específicas da DCV de base."
        ];
      }
    } else if (temDcvSubclinica || isDrcMuitoAltoRisco || isFalenciaRenal) {
      estadio = "3";
      nomeEstadio = "Estádio 3: DCV Subclínica ou Equivalente de Muito Alto Risco Renal/PREVENT";
      if (dcvSubclinica.escoreCalcioCoronario >= 100) criteriosAtendidos.push(`Escore de Cálcio Coronário (CAC) >= 100 (${dcvSubclinica.escoreCalcioCoronario} UA)`);
      if (dcvSubclinica.biomarcadoresElevados) criteriosAtendidos.push("Elevação subclínica de Troponina US ou BNP/NT-proBNP");
      if (dcvSubclinica.ecocardiogramaAlterado) criteriosAtendidos.push("Alteração ecocardiográfica subclínica (HVE ou disfunção assintomática)");
      if (dcvSubclinica.riscoPreventAlto) criteriosAtendidos.push("Risco cardiovascular PREVENT em 10 anos >= 20%");
      if (isDrcMuitoAltoRisco || isFalenciaRenal) criteriosAtendidos.push(`DRC de muito alto risco (TFG: ${tfg} mL/min, RAC: ${rac} mg/g)`);

      condutasEspecificas = [
        "Intensificação farmacológica preventiva para evitar progressão para DCV sintomática (IC/IAM/AVC).",
        "Início mandatório de iSGLT2 se DRC ou IC subclínica e TFG >= 20.",
        "Introdução de estatinas de alta intensidade (particularmente se CAC >= 100 ou DRC avançada não dialítica).",
        "Controle pressórico estrito (Meta PA < 130/80 mmHg, preferencialmente com IECA ou BRA se RAC >= 30)."
      ];
    } else if (isDiabetes || isHipertenso || isHipertrigliceridemia || sindromeMetabolica || isDrcModeradaAltoRisco) {
      estadio = "2";
      nomeEstadio = "Estádio 2: Fatores de Risco Metabólicos Estabelecidos e/ou DRC Moderada a Alto Risco";
      if (isDiabetes) criteriosAtendidos.push("Diabetes Mellitus tipo 2");
      if (isHipertenso) criteriosAtendidos.push(`Hipertensão Arterial (PA: ${pas}x${pad} mmHg)`);
      if (isHipertrigliceridemia) criteriosAtendidos.push(`Hipertrigliceridemia (${triglicerideos} mg/dL)`);
      if (sindromeMetabolica) criteriosAtendidos.push("Síndrome Metabólica");
      if (isDrcModeradaAltoRisco) criteriosAtendidos.push(`DRC moderado/alto risco (TFG: ${tfg} mL/min, RAC: ${rac} mg/g)`);

      condutasEspecificas = [
        "Rastreamento anual de DRC com dupla avaliação obrigatória: Creatinina sérica (TFGe) + Relação Albumina/Creatinina urinária (RAC).",
        "Se DRC presente (TFG < 60 ou RAC >= 30): iniciar IECA/BRA + iSGLT2 imediatamente.",
        "Se DM2: priorizar agentes com benefício cardiorrenal (iSGLT2 / AR-GLP1) e controle ponderal.",
        "Calcular escore PREVENT (AHA) para definir metas lipídicas e pressóricas."
      ];
    } else if (excessoAdiposidade || isPreDiabetes) {
      estadio = "1";
      nomeEstadio = "Estádio 1: Excesso ou Disfunção de Adiposidade (Pré-clínico)";
      if (excessoAdiposidade) criteriosAtendidos.push(`Excesso de adiposidade (IMC: ${imc} kg/m²${caAumentada ? ', Circunferência Abdominal aumentada' : ''})`);
      if (isPreDiabetes) criteriosAtendidos.push(`Pré-diabetes / Intolerância à glicose (GJ: ${glicemiaJejum} mg/dL, HbA1c: ${hba1c}%)`);

      condutasEspecificas = [
        "Meta primária: Perda ponderal >= 5% a 10% através de intervenção intensiva no estilo de vida.",
        "Se IMC >= 30 (ou >= 27 com pré-diabetes): considerar farmacoterapia antiobesidade (ex: Semaglutida 2.4mg ou Tirzepatida).",
        "Se Pré-diabetes: considerar Metformina.",
        "Rastreamento de PA, perfil lipídico e glicemia a cada 1-2 anos."
      ];
    } else {
      estadio = "0";
      nomeEstadio = "Estádio 0: Ausência de Fatores de Risco CKM";
      criteriosAtendidos.push("Antropometria, pressão arterial, glicemia, perfil lipídico e função renal normais.");
      condutasEspecificas = [
        "Manutenção da saúde cardiovascular primordial (Life's Essential 8 - AHA).",
        "Reavaliação clínica e triagem metabólica a cada 3 a 5 anos."
      ];
    }

    return {
      estadio,
      nomeEstadio,
      criteriosAtendidos,
      classificacaoRenal: {
        tfg,
        rac,
        status: isFalenciaRenal ? "Falência Renal (G5)" :
                isDrcMuitoAltoRisco ? "DRC Muito Alto Risco" :
                isDrcModeradaAltoRisco ? "DRC Risco Moderado/Alto" : "Normal / Baixo Risco"
      },
      condutasEspecificas,
      referencia: "AHA Presidential Advisory: Cardiovascular-Kidney-Metabolic Health (Circulation 2024)"
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. DIRETRIZES FARMACOLÓGICAS DE DM2 (ADA STANDARDS OF CARE 2025/2026)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Algoritmo de Conduta Farmacológica no DM2 (Diretrizes ADA 2025/2026).
   * Priorização Classe I de iSGLT2 e/ou AR-GLP1 em pacientes com DCV, IC ou DRC,
   * INDEPENDENTEMENTE da HbA1c basal e do uso prévio de Metformina.
   *
   * @param {Object} params - Perfil clínico do paciente com DM2
   * @param {number} params.hba1c - Hemoglobina glicada atual (%)
   * @param {number} [params.metaHba1c=7.0] - Meta individualizada de HbA1c (%)
   * @param {number} params.tfg - Taxa de Filtração Glomerular (mL/min/1.73m²)
   * @param {number} [params.rac=0] - Relação Albumina/Creatinina urinária (mg/g)
   * @param {number} [params.imc=25] - Índice de Massa Corporal (kg/m²)
   * @param {boolean} [params.dcvAterosclerotica=false] - DAC, AVC isquêmico, DAP ou Alto Risco CV
   * @param {boolean} [params.insuficienciaCardiaca=false] - IC clínica (ICFEr, ICFElr ou ICFEp)
   * @param {boolean} [params.mashFibrose=false] - Esteato-hepatite associada à disfunção metabólica (MASH) com fibrose F2-F3
   * @param {boolean} [params.emUsoMetformina=false] - Se o paciente já utiliza metformina
   * @param {boolean} [params.contraindicacaoGlp1=false] - Contraindicação a agonistas GLP-1
   * @returns {Object} Plano terapêutico estruturado (ADA 2025/2026)
   */
  function prescreverTerapiaDM2_ADA2026(params) {
    if (!params || typeof params.hba1c !== 'number' || typeof params.tfg !== 'number') {
      throw new Error("Parâmetros obrigatórios ausentes: 'hba1c' e 'tfg' devem ser fornecidos.");
    }

    const {
      hba1c,
      metaHba1c = 7.0,
      tfg,
      rac = 0,
      imc = 25,
      dcvAterosclerotica = false,
      insuficienciaCardiaca = false,
      mashFibrose = false,
      emUsoMetformina = false,
      contraindicacaoGlp1 = false
    } = params;

    const prescricaoPrioritaria = [];
    const manejoGlicemicoPeso = [];
    const alertasSegurancaRenal = [];
    const classesRecomendadas = new Set();

    const temDRC = (tfg < 60) || (rac >= 30);
    const elegivelInicioSGLT2 = tfg >= 20;

    // 1.1 Insuficiência Cardíaca
    if (insuficienciaCardiaca) {
      if (elegivelInicioSGLT2) {
        classesRecomendadas.add("iSGLT2");
        prescricaoPrioritaria.push({
          indicacao: "Insuficiência Cardíaca (ICFEr / ICFEp)",
          evidencia: "Classe I, Nível A (ADA 2025/2026)",
          conduta: "Iniciar Inibidor de SGLT2 com benefício comprovado em IC (Dapagliflozina 10mg/dia ou Empagliflozina 10mg/dia) IMEDIATAMENTE, independentemente da HbA1c basal ou uso de metformina.",
          observacao: (imc >= 30 && !contraindicacaoGlp1)
            ? "Se ICFEp associada à obesidade (IMC >= 30): considerar associação de Semaglutida ou Tirzepatida para redução de sintomas e eventos de IC."
            : null
        });
      } else {
        alertasSegurancaRenal.push("TFG < 20 mL/min/1.73m²: Não iniciar iSGLT2 de novo. Se já em uso prévio, pode ser mantido até o início de diálise.");
      }
    }

    // 1.2 Doença Renal Crônica (TFG < 60 ou RAC >= 30)
    if (temDRC) {
      if (elegivelInicioSGLT2) {
        classesRecomendadas.add("iSGLT2");
        prescricaoPrioritaria.push({
          indicacao: `Doença Renal Crônica (TFG: ${tfg} mL/min | RAC: ${rac} mg/g)`,
          evidencia: "Classe I, Nível A (ADA 2025/2026 / KDIGO)",
          conduta: "Iniciar iSGLT2 com benefício nefroprotetor comprovado (Empagliflozina, Dapagliflozina ou Canagliflozina) IMEDIATAMENTE, independentemente da HbA1c ou uso de metformina.",
          observacao: (!contraindicacaoGlp1)
            ? "Associar ou substituir por Agonista de GLP-1 (Semaglutida com benefício nefroprotetor - Estudo FLOW) se intolerância ou necessidade adicional."
            : null
        });
        if (!contraindicacaoGlp1 && (rac >= 30 || tfg < 45)) {
          classesRecomendadas.add("AR-GLP1");
        }
      } else {
        if (!contraindicacaoGlp1) {
          classesRecomendadas.add("AR-GLP1");
          prescricaoPrioritaria.push({
            indicacao: `DRC Avançada (TFG ${tfg} mL/min < 20 mL/min)`,
            evidencia: "Classe I, Nível A (ADA 2025/2026)",
            conduta: "Como a TFG é < 20 mL/min, priorizar Agonista do Receptor de GLP-1 (Semaglutida, Liraglutida ou Dulaglutida) para redução de risco cardiovascular e controle glicêmico seguro."
          });
        }
      }
    }

    // 1.3 Doença Cardiovascular Aterosclerótica Estabelecida (DCVA)
    if (dcvAterosclerotica) {
      const opcoesDCVA = [];
      if (!contraindicacaoGlp1) {
        classesRecomendadas.add("AR-GLP1");
        opcoesDCVA.push("Agonista de GLP-1 com benefício CV comprovado (Semaglutida, Dulaglutida ou Liraglutida)");
      }
      if (elegivelInicioSGLT2) {
        classesRecomendadas.add("iSGLT2");
        opcoesDCVA.push("Inibidor de SGLT2 com benefício CV comprovado (Empagliflozina, Dapagliflozina ou Canagliflozina)");
      }

      prescricaoPrioritaria.push({
        indicacao: "Doença Cardiovascular Aterosclerótica (DCVA) Estabelecida / Alto Risco",
        evidencia: "Classe I, Nível A (ADA 2025/2026)",
        conduta: `Iniciar ${opcoesDCVA.join(" E/OU ")} IMEDIATAMENTE, independentemente da HbA1c basal e sem necessidade de aguardar falha da metformina.`,
        observacao: (elegivelInicioSGLT2 && !contraindicacaoGlp1)
          ? "Terapia combinada (AR-GLP1 + iSGLT2) deve ser considerada para redução aditiva de desfechos cardiovasculares e renais."
          : null
      });
    }

    // 2.1 MASH / Esteatose Metabólica
    if (mashFibrose && !contraindicacaoGlp1) {
      classesRecomendadas.add("AR-GLP1 / Co-agonista GIP/GLP-1");
      manejoGlicemicoPeso.push(
        "MASH com fibrose (F2-F3): Priorizar Agonista de GLP-1 (Semaglutida) ou Co-agonista Duplo GIP/GLP-1 (Tirzepatida) e/ou Pioglitazona (se ausência de IC) para resolução histológica da esteato-hepatite."
      );
    }

    // 2.2 Gestão de Peso
    if (imc >= 27 && !contraindicacaoGlp1) {
      classesRecomendadas.add("AR-GLP1 / Co-agonista GIP/GLP-1");
      manejoGlicemicoPeso.push(
        `Sobrepeso/Obesidade (IMC ${imc} kg/m²): Priorizar agentes de Muito Alta Eficácia para perda ponderal e redução de HbA1c (Tirzepatida ou Semaglutida).`
      );
    }

    // 2.3 Metformina
    if (tfg >= 45) {
      classesRecomendadas.add("Metformina");
      manejoGlicemicoPeso.push(
        emUsoMetformina
          ? "Manter Metformina em dose otimizada (até 2000 mg/dia) como terapia de base."
          : "Iniciar ou associar Metformina para eficácia glicêmica adicional, salvo contraindicação (não deve atrasar o início de iSGLT2/AR-GLP1 se indicados)."
      );
    } else if (tfg >= 30 && tfg < 45) {
      classesRecomendadas.add("Metformina (Dose Ajustada)");
      alertasSegurancaRenal.push(
        "TFG entre 30 e 44 mL/min/1.73m²: Reduzir dose máxima de Metformina para 1000 mg/dia."
      );
    } else {
      alertasSegurancaRenal.push(
        "TFG < 30 mL/min/1.73m²: CONTRAINDICADO o uso de Metformina (risco de acidose lática). Suspender imediatamente se estiver em uso."
      );
    }

    const deltaHba1c = +(hba1c - metaHba1c).toFixed(1);

    if (hba1c >= 10.0) {
      classesRecomendadas.add("Insulina Basal (+/- AR-GLP1)");
      manejoGlicemicoPeso.push(
        `HbA1c severamente elevada (${hba1c}%): Iniciar Insulina Basal (10 UI/dia ou 0.1-0.2 UI/kg/dia), preferencialmente com AR-GLP1.`
      );
    } else if (deltaHba1c >= 1.5) {
      manejoGlicemicoPeso.push(
        `HbA1c (${hba1c}%) está >= 1.5% acima da meta (${metaHba1c}%): Indicada TERAPIA COMBINADA DUPLA OU TRIPLA DESDE O INÍCIO (estratégia VERIFY / ADA 2026).`
      );
    } else if (deltaHba1c <= 0 && prescricaoPrioritaria.length > 0) {
      manejoGlicemicoPeso.push(
        `Atenção: Embora a HbA1c (${hba1c}%) esteja na meta (${metaHba1c}%), a introdução de iSGLT2 e/ou AR-GLP1 permanece MANDATÓRIA para redução de mortalidade cardiorrenal.`
      );
    }

    if (tfg < 45 && classesRecomendadas.has("iSGLT2")) {
      alertasSegurancaRenal.push(
        "Nota Farmacodinâmica: Com TFG < 45 mL/min, o efeito redutor de HbA1c dos iSGLT2 é atenuado, mas a proteção renal e contra IC permanece intacta."
      );
    }

    return {
      statusGlicemico: {
        hba1cAtual: hba1c,
        metaHba1c,
        acimaDaMeta: hba1c > metaHba1c,
        diferencaMeta: deltaHba1c
      },
      temIndicacaoCardiorrenalPrioritaria: prescricaoPrioritaria.length > 0,
      eixo1_ProtecaoOrgaoAlvo: prescricaoPrioritaria,
      eixo2_ControleGlicemicoPonderal: manejoGlicemicoPeso,
      alertasSegurancaRenal,
      classesFarmacologicasRecomendadas: Array.from(classesRecomendadas),
      referencia: "ADA Standards of Care in Diabetes - 2025/2026"
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // EXPORTAÇÃO PÚBLICA
  // ───────────────────────────────────────────────────────────────────────────

  return {
    calcularInsulinaAmbulatorial: calcularInsulinaAmbulatorial,
    protocoloCorrecaoHospitalar: protocoloCorrecaoHospitalar,
    manejoCriseHiperglicemica: manejoCriseHiperglicemica,
    formatarResumoDiabetes: formatarResumoDiabetes,
    avaliarSindromeCKM: avaliarSindromeCKM,
    prescreverTerapiaDM2_ADA2026: prescreverTerapiaDM2_ADA2026
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EndocrinologiaDiabetesService;
  module.exports.EndocrinologiaDiabetesService = EndocrinologiaDiabetesService;
}
