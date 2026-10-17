'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateMAP,
  calculateShockIndex,
  calculateQSOFA,
  calculateBMI,
  checkPediatricSafety,
  runAllCalculations
} = require('../src/clinical/calculators.js');

const { validateSafety } = require('../src/clinical/safety_guard.js');
const { SoapInputSchema, VertexSoapOutputSchema } = require('../src/clinical/schemas/soap.schema.js');

test('1. calculateMAP: Avaliação hemodinâmica (Normotenso, Hipoperfusão e Crise Hipertensiva)', () => {
  // Normotenso: 120/80 -> PAM = (120 + 160)/3 = 93 mmHg
  const normal = calculateMAP(120, 80);
  assert.equal(normal.value, 93);
  assert.equal(normal.alerts.length, 0);

  // Hipoperfusão: 80/50 -> PAM = (80 + 100)/3 = 60 mmHg (< 65)
  const low = calculateMAP(80, 50);
  assert.equal(low.value, 60);
  assert.equal(low.alerts.length, 1);
  assert.equal(low.alerts[0].code, 'ALERTA_HIPOPERFUSAO');

  // Crise Hipertensiva: 190/120 -> PAM = 143 mmHg
  const high = calculateMAP(190, 120);
  assert.equal(high.value, 143);
  assert.ok(high.alerts.some(a => a.code === 'ALERTA_CRISE_HIPERTENSIVA'));

  // Dados nulos / inválidos
  assert.equal(calculateMAP(null, 80), null);
});

test('2. calculateShockIndex: Índice de Choque (Normal vs Alerta de Choque Oculto)', () => {
  // Normal: FC 70 / PAS 120 = 0.58
  const normal = calculateShockIndex(70, 120);
  assert.equal(normal.value, 0.58);
  assert.equal(normal.alerts.length, 0);

  // Choque Oculto: FC 115 / PAS 100 = 1.15 (> 0.9)
  const shock = calculateShockIndex(115, 100);
  assert.equal(shock.value, 1.15);
  assert.equal(shock.alerts.length, 1);
  assert.equal(shock.alerts[0].code, 'ALERTA_INDICE_CHOQUE_ELEVADO');
});

test('3. calculateQSOFA: Triagem de Sepse (Baixo Risco vs Alto Risco >= 2 pontos)', () => {
  // Baixo risco: FR 16, PAS 120, Glasgow 15 = 0 pontos
  const lowRisk = calculateQSOFA(16, 120, 15);
  assert.equal(lowRisk.score, 0);
  assert.equal(lowRisk.alerts.length, 0);

  // Alto risco: FR 24 (+1), PAS 90 (+1), Glasgow 14 (+1) = 3 pontos
  const highRisk = calculateQSOFA(24, 90, 14);
  assert.equal(highRisk.score, 3);
  assert.equal(highRisk.alerts.length, 1);
  assert.equal(highRisk.alerts[0].code, 'ALERTA_SEPSE_QSOFA_POSITIVO');
});

test('4. calculateBMI: Índice de Massa Corporal (Suporte a metros e centímetros)', () => {
  // Eutrófico (altura em metros): 70kg / (1.75m)^2 = 22.9
  const normalM = calculateBMI(70, 1.75);
  assert.equal(normalM.value, 22.9);
  assert.equal(normalM.classification, 'Eutrófico');

  // Eutrófico (altura em centímetros): 70kg / (175cm)^2 = 22.9
  const normalCm = calculateBMI(70, 175);
  assert.equal(normalCm.value, 22.9);

  // Obesidade Grau I: 95kg / (170cm)^2 = 32.9
  const obese = calculateBMI(95, 170);
  assert.equal(obese.value, 32.9);
  assert.equal(obese.classification, 'Obesidade Grau I');
});

test('5. checkPediatricSafety: Trava de Segurança Pediátrica', () => {
  // Adulto (25 anos) sem peso -> Não gera alerta pediátrico
  const adult = checkPediatricSafety(25, null);
  assert.equal(adult.isPediatric, false);
  assert.equal(adult.alerts.length, 0);

  // Criança (4 anos) sem peso -> Alerta Crítico!
  const childNoWeight = checkPediatricSafety(4, null);
  assert.equal(childNoWeight.isPediatric, true);
  assert.equal(childNoWeight.weightValid, false);
  assert.equal(childNoWeight.alerts.length, 1);
  assert.equal(childNoWeight.alerts[0].code, 'ALERTA_PEDIATRIA_PESO_AUSENTE');

  // Criança (4 anos) com peso (16kg) -> Seguro
  const childWithWeight = checkPediatricSafety(4, 16);
  assert.equal(childWithWeight.isPediatric, true);
  assert.equal(childWithWeight.weightValid, true);
  assert.equal(childWithWeight.alerts.length, 0);
});

test('6. runAllCalculations: Orquestrador Clínico e Geração de Summary Text', () => {
  const vitals = {
    pas: 90,
    pad: 50,
    fc: 115,
    fr: 24,
    glasgow: 14,
    peso: 70,
    altura: 175
  };
  const context = { idade: 35 };

  const result = runAllCalculations(vitals, context);
  assert.equal(result.metrics.pam, 63);
  assert.equal(result.metrics.indice_choque, 1.28);
  assert.equal(result.metrics.qsofa, 3);
  assert.equal(result.metrics.imc, 22.9);
  assert.ok(result.alerts.length >= 3);
  assert.ok(result.summary_text.includes('PAM: 63 mmHg'));
  assert.ok(result.summary_text.includes('Índice de Choque: 1.28'));
  assert.ok(result.summary_text.includes('qSOFA: 3/3'));
});

test('7. validateSafety: Safety Guard (Alergias Diretas e Reatividade Cruzada)', () => {
  // 7.1 Colisão Direta: Alergia a Dipirona vs Prescrição de Dipirona
  const rawInputDirect = {
    patient_context: { alergias: ['Dipirona'] }
  };
  const soapDirect = {
    plano: {
      prescricao: [
        { medicamento: 'Dipirona 500mg', posologia: '1 comp VO 6/6h' }
      ]
    }
  };
  const resDirect = validateSafety(soapDirect, rawInputDirect);
  assert.equal(resDirect.is_safe, false);
  assert.equal(resDirect.safety_alerts.length, 1);
  assert.equal(resDirect.safety_alerts[0].code, 'ALERTA_COLISAO_ALERGIA_MEDICAMENTOSA');
  assert.equal(resDirect.sanitized_soap.plano.prescricao[0].has_allergy_warning, true);

  // 7.2 Colisão por Grupo: Alergia a Penicilina vs Prescrição de Amoxicilina
  const rawInputCross = {
    patient_context: { alergias: ['Penicilina'] }
  };
  const soapCross = {
    plano: {
      prescricao: [
        { medicamento: 'Amoxicilina 500mg', posologia: '1 comp VO 8/8h' }
      ]
    }
  };
  const resCross = validateSafety(soapCross, rawInputCross);
  assert.equal(resCross.is_safe, false);
  assert.equal(resCross.safety_alerts.length, 1);
  assert.equal(resCross.safety_alerts[0].code, 'ALERTA_COLISAO_ALERGIA_MEDICAMENTOSA');

  // 7.3 Caso Seguro: Alergia a Sulfa vs Prescrição de Paracetamol
  const rawInputSafe = {
    patient_context: { alergias: ['Sulfa'] }
  };
  const soapSafe = {
    plano: {
      prescricao: [
        { medicamento: 'Paracetamol 750mg', posologia: '1 comp VO 6/6h' }
      ]
    }
  };
  const resSafe = validateSafety(soapSafe, rawInputSafe);
  assert.equal(resSafe.is_safe, true);
  assert.equal(resSafe.safety_alerts.length, 0);
  assert.equal(resSafe.sanitized_soap.plano.prescricao[0].has_allergy_warning, false);
});

test('8. Schemas JSON: Validação Estrutural (SoapInputSchema & VertexSoapOutputSchema)', () => {
  assert.ok(SoapInputSchema.required.includes('brain_dump'));
  assert.equal(SoapInputSchema.type, 'object');

  assert.ok(VertexSoapOutputSchema.required.includes('subjetivo_formatado'));
  assert.ok(VertexSoapOutputSchema.required.includes('objetivo_formatado'));
  assert.ok(VertexSoapOutputSchema.required.includes('avaliacao'));
  assert.ok(VertexSoapOutputSchema.required.includes('plano'));
  assert.ok(VertexSoapOutputSchema.required.includes('referencias_bibliograficas'));
});