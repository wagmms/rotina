'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeSoapInputPayload } = require('../src/clinical/soap_service.js');
const {
  calculateMAP,
  calculateShockIndex,
  calculateQSOFA,
  calculateBMI
} = require('../src/clinical/calculators.js');

test('1. normalizeSoapInputPayload: expurga estritamente sinais vitais e idade negativos enviados na raiz', () => {
  const payloadComNegativos = {
    brain_dump: 'Paciente com dispneia',
    idade: -45,
    pas: -140,
    pad: -90,
    fc: -27,
    fr: -5,
    spo2: -98,
    tax: -36.5,
    peso: -70,
    altura: -2
  };

  const normalizado = normalizeSoapInputPayload(payloadComNegativos);

  assert.equal(normalizado.patient_context.idade, undefined, 'Idade negativa deve ser descartada');
  assert.equal(normalizado.vitals.pas, undefined, 'PAS negativa deve ser descartada');
  assert.equal(normalizado.vitals.pad, undefined, 'PAD negativa deve ser descartada');
  assert.equal(normalizado.vitals.fc, undefined, 'FC negativa deve ser descartada');
  assert.equal(normalizado.vitals.fr, undefined, 'FR negativa deve ser descartada');
  assert.equal(normalizado.vitals.spo2, undefined, 'SpO2 negativa deve ser descartada');
  assert.equal(normalizado.vitals.tax, undefined, 'Tax negativa deve ser descartada');
  assert.equal(normalizado.vitals.peso, undefined, 'Peso negativo deve ser descartado');
  assert.equal(normalizado.vitals.altura, undefined, 'Altura negativa deve ser descartada');
});

test('2. normalizeSoapInputPayload: expurga sinais vitais negativos mesmo quando enviados dentro de vitals estruturado', () => {
  const payloadComVitalsEstruturado = {
    brain_dump: 'Paciente em avaliação',
    patient_context: { idade: -12 },
    vitals: {
      pas: 120,
      pad: -80,
      fc: -100,
      peso: -65
    }
  };

  const normalizado = normalizeSoapInputPayload(payloadComVitalsEstruturado);

  assert.equal(normalizado.patient_context.idade, undefined, 'Idade negativa em patient_context deve ser expurgada');
  assert.equal(normalizado.vitals.pas, 120, 'PAS positiva válida deve ser mantida');
  assert.equal(normalizado.vitals.pad, undefined, 'PAD negativa em vitals deve ser expurgada');
  assert.equal(normalizado.vitals.fc, undefined, 'FC negativa em vitals deve ser expurgada');
  assert.equal(normalizado.vitals.peso, undefined, 'Peso negativo em vitals deve ser expurgado');
});

test('3. normalizeSoapInputPayload: preserva valores válidos positivos', () => {
  const payloadValido = {
    brain_dump: 'Paciente estável',
    idade: 35,
    pas: 120,
    pad: 80,
    fc: 72,
    fr: 16,
    spo2: 98,
    tax: 36.5,
    peso: 70,
    altura: 175
  };

  const normalizado = normalizeSoapInputPayload(payloadValido);

  assert.equal(normalizado.patient_context.idade, 35);
  assert.equal(normalizado.vitals.pas, 120);
  assert.equal(normalizado.vitals.pad, 80);
  assert.equal(normalizado.vitals.fc, 72);
  assert.equal(normalizado.vitals.fr, 16);
  assert.equal(normalizado.vitals.spo2, 98);
  assert.equal(normalizado.vitals.tax, 36.5);
  assert.equal(normalizado.vitals.peso, 70);
  assert.equal(normalizado.vitals.altura, 175);
});

test('4. Calculadoras clínicas determinísticas: rejeitam e retornam null para valores negativos', () => {
  // PAM com valores negativos
  assert.equal(calculateMAP(-140, 90), null);
  assert.equal(calculateMAP(140, -90), null);
  assert.equal(calculateMAP(-140, -90), null);

  // Shock Index com FC negativa ou PAS negativa
  assert.equal(calculateShockIndex(-70, 120), null);
  assert.equal(calculateShockIndex(70, -120), null);

  // qSOFA com FR ou PAS negativa
  assert.equal(calculateQSOFA(-20, 120, 15), null);
  assert.equal(calculateQSOFA(20, -100, 15), null);

  // IMC com peso ou altura negativa
  assert.equal(calculateBMI(-70, 1.75), null);
  assert.equal(calculateBMI(70, -1.75), null);
});
