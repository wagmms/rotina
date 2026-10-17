/**
 * @fileoverview Módulo de Calculadoras Clínicas e Segurança do Paciente - Projeto Rotina (Gemini 4 Argon)
 * @description Funções puras e determinísticas para avaliação hemodinâmica, triagem de sepse,
 * antropometria (com separação adulto vs pediátrico) e travas de segurança pediátrica.
 */

'use strict';

/**
 * Converte e valida se um valor é um número finito dentro de limites fisiológicos plausíveis.
 * @param {any} val - Valor a ser testado.
 * @param {number} min - Limite mínimo aceitável.
 * @param {number} max - Limite máximo aceitável.
 * @returns {number|null} Número validado ou null se inválido.
 */
function parseValidNumber(val, min = 0.01, max = 1000) {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  if (Number.isNaN(num) || !Number.isFinite(num)) return null;
  if (num < min || num > max) return null;
  return num;
}

/**
 * Calcula a Pressão Arterial Média (PAM) e identifica alertas pressóricos críticos.
 * @param {number|string} pas - Pressão Arterial Sistólica (mmHg).
 * @param {number|string} pad - Pressão Arterial Diastólica (mmHg).
 * @returns {{ value: number, unit: string, alerts: Array<{code: string, severity: string, message: string}> } | null}
 */
function calculateMAP(pas, pad) {
  const validPas = parseValidNumber(pas, 20, 350);
  const validPad = parseValidNumber(pad, 10, 250);

  if (validPas === null || validPad === null || validPas <= validPad) {
    return null;
  }

  const pam = Math.round((validPas + 2 * validPad) / 3);
  const alerts = [];

  if (pam < 65) {
    alerts.push({
      code: 'ALERTA_HIPOPERFUSAO',
      severity: 'CRITICAL',
      message: 'PAM crítica < 65 mmHg: risco de choque/hipoperfusão tecidual'
    });
  }

  if (validPas >= 180 || validPad >= 120) {
    alerts.push({
      code: 'ALERTA_CRISE_HIPERTENSIVA',
      severity: 'CRITICAL',
      message: 'Crise Hipertensiva: PAS >= 180 ou PAD >= 120 mmHg. Investigar lesão de órgão-alvo'
    });
  }

  return {
    value: pam,
    unit: 'mmHg',
    alerts
  };
}

/**
 * Calcula o Índice de Choque (Shock Index - IC = FC / PAS).
 * @param {number|string} fc - Frequência Cardíaca (bpm).
 * @param {number|string} pas - Pressão Arterial Sistólica (mmHg).
 * @returns {{ value: number, alerts: Array<{code: string, severity: string, message: string}> } | null}
 */
function calculateShockIndex(fc, pas) {
  const validFc = parseValidNumber(fc, 15, 300);
  const validPas = parseValidNumber(pas, 20, 350);

  if (validFc === null || validPas === null) {
    return null;
  }

  const ic = Number((validFc / validPas).toFixed(2));
  const alerts = [];

  if (ic > 0.9) {
    alerts.push({
      code: 'ALERTA_INDICE_CHOQUE_ELEVADO',
      severity: 'WARNING',
      message: 'Índice de Choque > 0.9: suspeita de instabilidade hemodinâmica oculta/choque precoce'
    });
  }

  return {
    value: ic,
    alerts
  };
}

/**
 * Calcula o escore quick SOFA (qSOFA) para triagem adulta de disfunção orgânica em sepse.
 * Exige pelo menos FR e PAS informados para não fabricar escore zero falso em dados omitidos.
 * @param {number|string} fr - Frequência Respiratória (irpm).
 * @param {number|string} pas - Pressão Arterial Sistólica (mmHg).
 * @param {number|string} [glasgow=15] - Escala de Coma de Glasgow (3 a 15).
 * @returns {{ score: number, maxScore: number, complete: boolean, missingFields: string[], criteriaMet: string[], alerts: Array<{code: string, severity: string, message: string}> } | null}
 */
function calculateQSOFA(fr, pas, glasgow = 15) {
  const validFr = parseValidNumber(fr, 1, 120);
  const validPas = parseValidNumber(pas, 20, 350);
  const hasExplicitGlasgow = glasgow !== null && glasgow !== undefined && glasgow !== '';
  const validGcs = hasExplicitGlasgow ? parseValidNumber(glasgow, 3, 15) : 15;

  // Se nem FR nem PAS foram informados, ou se apenas 1 sinal vital isolado foi informado sem o par hemodinâmico/respiratório,
  // não fabricamos qSOFA = 0 para não induzir falsa normalidade clínica (Achado C4).
  if (validFr === null || validPas === null) {
    return null;
  }

  const missingFields = [];
  if (!hasExplicitGlasgow) missingFields.push('glasgow');

  let score = 0;
  const criteriaMet = [];

  if (validFr >= 22) {
    score += 1;
    criteriaMet.push('FR >= 22 irpm');
  }

  if (validPas <= 100) {
    score += 1;
    criteriaMet.push('PAS <= 100 mmHg');
  }

  if (validGcs !== null && validGcs < 15) {
    score += 1;
    criteriaMet.push('Glasgow < 15');
  }

  const alerts = [];
  if (score >= 2) {
    alerts.push({
      code: 'ALERTA_SEPSE_QSOFA_POSITIVO',
      severity: 'CRITICAL',
      message: 'qSOFA >= 2: alto risco de sepse / disfunção orgânica grave. Acionar Protocolo de Sepse'
    });
  }

  return {
    score,
    maxScore: 3,
    complete: missingFields.length === 0,
    missingFields,
    criteriaMet,
    alerts
  };
}

/**
 * Calcula o Índice de Massa Corporal (IMC).
 * Em crianças/adolescentes (< 18 anos), não aplica os pontos de corte fixos de adultos da OMS,
 * sinalizando a necessidade de avaliação por curva de Escore-Z / Percentil (OMS/SBP).
 * @param {number|string} peso - Peso em quilogramas (kg).
 * @param {number|string} alturaCm - Altura em centímetros (cm) ou metros (se <= 3.0).
 * @param {number|string} [idade=null] - Idade em anos (opcional, para diferenciar pediatria vs adulto).
 * @returns {{ value: number, unit: string, classification: string|null, population: string } | null}
 */
function calculateBMI(peso, alturaCm, idade = null) {
  const validPeso = parseValidNumber(peso, 0.5, 500);
  const validAltura = parseValidNumber(alturaCm, 0.3, 280);
  const validIdade = parseValidNumber(idade, 0, 150);

  if (validPeso === null || validAltura === null) {
    return null;
  }

  const alturaMetros = validAltura <= 3.0 ? validAltura : validAltura / 100;
  const imc = Number((validPeso / (alturaMetros * alturaMetros)).toFixed(1));

  if (validIdade !== null && validIdade < 18) {
    return {
      value: imc,
      unit: 'kg/m²',
      classification: 'Avaliar por Escore-Z / Percentil Pediátrico (OMS/SBP)',
      population: 'PEDIATRIC'
    };
  }

  let classification = '';
  if (imc < 18.5) {
    classification = 'Baixo peso';
  } else if (imc < 25.0) {
    classification = 'Eutrófico';
  } else if (imc < 30.0) {
    classification = 'Sobrepeso';
  } else if (imc < 35.0) {
    classification = 'Obesidade Grau I';
  } else if (imc < 40.0) {
    classification = 'Obesidade Grau II';
  } else {
    classification = 'Obesidade Grau III';
  }

  return {
    value: imc,
    unit: 'kg/m²',
    classification,
    population: 'ADULT'
  };
}

/**
 * Verifica regras de segurança farmacológica para pacientes pediátricos (< 12 anos).
 * @param {number|string} idade - Idade em anos.
 * @param {number|string} peso - Peso em quilogramas (kg).
 * @returns {{ isPediatric: boolean, weightValid: boolean, alerts: Array<{code: string, severity: string, message: string}> } | null}
 */
function checkPediatricSafety(idade, peso) {
  const validIdade = parseValidNumber(idade, 0, 130);
  if (validIdade === null) {
    return null;
  }

  const isPediatric = validIdade < 12;
  const validPeso = parseValidNumber(peso, 0.5, 200);
  const weightValid = validPeso !== null && validPeso > 0;
  const alerts = [];

  if (isPediatric && !weightValid) {
    alerts.push({
      code: 'ALERTA_PEDIATRIA_PESO_AUSENTE',
      severity: 'CRITICAL',
      message: 'Paciente pediátrico sem peso aferido. Obrigatório cálculo ponderal em mg/kg antes de prescrever'
    });
  }

  return {
    isPediatric,
    weightValid,
    alerts
  };
}

/**
 * Executa todas as calculadoras clínicas disponíveis com base nos sinais vitais e contexto do paciente.
 * @param {Object} [vitals={}] - Objeto contendo sinais vitais e antropometria.
 * @param {Object} [patientContext={}] - Contexto demográfico do paciente.
 */
function runAllCalculations(vitals = {}, patientContext = {}) {
  const safeVitals = vitals || {};
  const safeContext = patientContext || {};

  const pas = safeVitals.pas ?? safeVitals.pa_sistolica;
  const pad = safeVitals.pad ?? safeVitals.pa_diastolica;
  const fc = safeVitals.fc ?? safeVitals.frequencia_cardiaca;
  const fr = safeVitals.fr ?? safeVitals.frequencia_respiratoria;
  const glasgow = safeVitals.glasgow ?? safeVitals.ecg;
  const peso = safeVitals.peso ?? safeContext.peso;
  const altura = safeVitals.altura ?? safeVitals.altura_cm ?? safeContext.altura;
  const idade = safeContext.idade ?? safeVitals.idade;
  const validIdade = parseValidNumber(idade, 0, 150);

  const mapResult = calculateMAP(pas, pad);
  const shockResult = calculateShockIndex(fc, pas);
  // qSOFA aplica-se a adultos (ou quando idade não é pediátrica) e exige FR + PAS
  const isPediatricPatient = validIdade !== null && validIdade < 18;
  const qsofaResult = isPediatricPatient ? null : calculateQSOFA(fr, pas, glasgow);
  const bmiResult = calculateBMI(peso, altura, validIdade);
  const pedResult = checkPediatricSafety(idade, peso);

  const alerts = [];
  if (mapResult && mapResult.alerts.length) alerts.push(...mapResult.alerts);
  if (shockResult && shockResult.alerts.length) alerts.push(...shockResult.alerts);
  if (qsofaResult && qsofaResult.alerts.length) alerts.push(...qsofaResult.alerts);
  if (pedResult && pedResult.alerts.length) alerts.push(...pedResult.alerts);

  const metrics = {
    pam: mapResult ? mapResult.value : null,
    indice_choque: shockResult ? shockResult.value : null,
    qsofa: qsofaResult ? qsofaResult.score : null,
    imc: bmiResult ? bmiResult.value : null,
    imc_classificacao: bmiResult ? bmiResult.classification : null
  };

  const summaryParts = [];
  if (metrics.pam !== null) summaryParts.push(`PAM: ${metrics.pam} mmHg`);
  if (metrics.indice_choque !== null) summaryParts.push(`Índice de Choque: ${metrics.indice_choque}`);
  if (metrics.qsofa !== null) summaryParts.push(`qSOFA: ${metrics.qsofa}/3`);
  if (metrics.imc !== null) summaryParts.push(`IMC: ${metrics.imc} kg/m² (${metrics.imc_classificacao})`);

  const summary_text = summaryParts.length > 0
    ? `[Índices Calculados] ${summaryParts.join(' | ')}`
    : '';

  return {
    metrics,
    alerts,
    summary_text
  };
}

module.exports = {
  calculateMAP,
  calculateShockIndex,
  calculateQSOFA,
  calculateBMI,
  checkPediatricSafety,
  runAllCalculations
};