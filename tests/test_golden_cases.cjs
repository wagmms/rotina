'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { runAllCalculations } = require('../src/clinical/calculators.js');
const { validateSafety } = require('../src/clinical/safety_guard.js');
const { formatClipboardSoap, formatClipboardPrescription } = require('../src/clinical/soap_service.js');

test('Casos Clínicos Padrão-Ouro (Golden Cases) - Validação Integrada', async (t) => {

  await t.test('Caso 1: Emergência Cardiológica (Dor Torácica Típica / SCA)', () => {
    const vitals = { pas: 150, pad: 95, fc: 102, fr: 20, spo2: 96, tax: 36.6, glasgow: 15 };
    const context = { idade: 62, sexo: 'M', peso: 82 };
    const calcs = runAllCalculations(vitals, context);

    assert.equal(calcs.metrics.pam, 113);
    assert.equal(calcs.metrics.indice_choque, 0.68);
    assert.equal(calcs.metrics.qsofa, 0);

    const rawInput = {
      patient_context: context,
      vitals
    };

    const soapResult = {
      subjetivo_formatado: {
        texto_unificado: 'Dor retroesternal opressiva há 2 horas com irradiação para MSE e sudorese fria.'
      },
      objetivo_formatado: {
        texto_unificado: 'Sudoreico, pálido, BNF 2T sem sopros, MV+ bilateral sem ruídos adventícios.'
      },
      avaliacao: {
        hipoteses_diagnosticas: [
          { cid10: 'I20.0', descricao: 'Síndrome Coronariana Aguda sem supra de ST', probabilidade: 'ALTA', justificativa: 'Dor típica com fatores de risco' }
        ],
        raciocinio_clinico: 'Quadro clínico de alta probabilidade isquêmica miocárdica.',
        red_flags: ['Dor em aperto em repouso', 'Sudorese fria associada']
      },
      plano: {
        exames_solicitados: ['ECG de 12 derivações em até 10 minutos', 'Troponina I ultrassensível seriada'],
        prescricao: [
          { medicamento: 'Ácido Acetilsalicílico (AAS)', concentracao: '100mg', via: 'USO INTERNO (ORAL)', posologia: '3 comprimidos mastigados imediatamente (300mg)', duracao: 'Dose única de ataque' },
          { medicamento: 'Clopidogrel', concentracao: '75mg', via: 'USO INTERNO (ORAL)', posologia: '4 comprimidos VO imediatamente (300mg)', duracao: 'Dose única de ataque' }
        ],
        orientacoes_paciente: ['Repouso absoluto no leito', 'Monitorização cardíaca contínua'],
        criterios_retorno_encaminhamento: 'Encaminhamento imediato para Sala Vermelha / Hemodinâmica.'
      }
    };

    const safety = validateSafety(soapResult, rawInput);
    assert.equal(safety.is_safe, true);

    const soapText = formatClipboardSoap(soapResult, calcs.metrics);
    assert.match(soapText, /Síndrome Coronariana Aguda/i);
    assert.match(soapText, /ECG/i);
    assert.match(soapText, /Troponina/i);
    assert.match(soapText, /PAM: 113 mmHg/);

    const rxText = formatClipboardPrescription(soapResult.plano.prescricao);
    assert.match(rxText, /Ácido Acetilsalicílico/i);
    assert.match(rxText, /Clopidogrel/i);
  });

  await t.test('Caso 2: Pediatria - Otite Média Aguda (Bloqueio sem peso vs Liberação com peso)', () => {
    const vitals = { pas: 95, pad: 60, fc: 110, tax: 38.5, fr: 22, spo2: 98 };

    // 2.1 Sem peso informado
    const rawInputSemPeso = {
      patient_context: { idade: 4, sexo: 'F', peso: null },
      vitals
    };
    const soapSemPeso = {
      subjetivo_formatado: { texto_unificado: 'Otalgia intensa à direita e febre há 24h.' },
      objetivo_formatado: { texto_unificado: 'Otoscopia direita com membrana timpânica abaulada e hiperemiada.' },
      avaliacao: {
        hipoteses_diagnosticas: [{ cid10: 'H66.9', descricao: 'Otite Média Aguda', probabilidade: 'ALTA' }],
        raciocinio_clinico: 'OMA bacteriana típica de infância.'
      },
      plano: {
        prescricao: [
          { medicamento: 'Amoxicilina', concentracao: '250mg/5mL', via: 'USO INTERNO (ORAL)', posologia: 'Tomar 5 mL de 8/8h', duracao: 'por 10 dias' }
        ]
      }
    };

    const safetySemPeso = validateSafety(soapSemPeso, rawInputSemPeso);
    assert.ok(safetySemPeso.safety_alerts.some(a => a.code === 'ALERTA_PEDIATRIA_REVISAO_DOSE'));

    // 2.2 Com peso informado (16 kg)
    const rawInputComPeso = {
      patient_context: { idade: 4, sexo: 'F', peso: 16 },
      vitals
    };

    const safetyComPeso = validateSafety(soapSemPeso, rawInputComPeso);
    assert.equal(safetyComPeso.safety_alerts.length, 0);

    const rxText = formatClipboardPrescription(soapSemPeso.plano.prescricao);
    assert.match(rxText, /Amoxicilina/i);
    assert.match(rxText, /8\/8h/i);
  });

  await t.test('Caso 3: Crise Hipertensiva com Alerta Hemodinâmico Grave', () => {
    const vitals = { pas: 200, pad: 120, fc: 88, fr: 18, spo2: 97, glasgow: 15 };
    const context = { idade: 58, sexo: 'M', peso: 90 };
    const calcs = runAllCalculations(vitals, context);

    assert.equal(calcs.metrics.pam, 147);
    assert.ok(calcs.alerts.some(a => a.code === 'ALERTA_CRISE_HIPERTENSIVA'));

    const rawInput = { patient_context: context, vitals };
    const soapResult = {
      subjetivo_formatado: { texto_unificado: 'Cefaleia nucal moderada, sem déficits focais ou dor torácica.' },
      objetivo_formatado: { texto_unificado: 'PA 200x120 mmHg, exame neurológico sem alterações.' },
      avaliacao: {
        hipoteses_diagnosticas: [{ cid10: 'I10', descricao: 'Urgência Hipertensiva', probabilidade: 'ALTA' }],
        raciocinio_clinico: 'Elevação pressórica sintomática sem evidência imediata de lesão de órgão-alvo aguda.'
      },
      plano: {
        prescricao: []
      }
    };

    const safety = validateSafety(soapResult, rawInput);
    assert.equal(safety.is_safe, true);
  });

  await t.test('Caso 4: Choque Séptico / qSOFA Positivo', () => {
    const vitals = { pas: 85, pad: 45, fc: 125, fr: 26, tax: 39.1, spo2: 91, glasgow: 13 };
    const context = { idade: 74, sexo: 'F', peso: 65 };
    const calcs = runAllCalculations(vitals, context);

    assert.equal(calcs.metrics.pam, 58);
    assert.equal(calcs.metrics.qsofa, 3);
    assert.equal(calcs.metrics.indice_choque, 1.47);

    assert.ok(calcs.alerts.some(a => a.code === 'ALERTA_SEPSE_QSOFA_POSITIVO'));
    assert.ok(calcs.alerts.some(a => a.code === 'ALERTA_HIPOPERFUSAO'));
    assert.ok(calcs.alerts.some(a => a.code === 'ALERTA_INDICE_CHOQUE_ELEVADO'));
  });

});