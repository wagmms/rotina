'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { buildServer } = require('../server/index.js');
const { formatClipboardSoap, formatClipboardPrescription } = require('../src/clinical/soap_service.js');

describe('SOAP Clinical API & Formatting Suite', () => {
  let app;

  before(async () => {
    app = await buildServer();
    await app.ready();
  });

  after(async () => {
    if (app) {
      await app.close();
    }
  });

  it('Teste 1: POST /api/clinical/soap com { brain_dump: "" } retorna HTTP 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/clinical/soap',
      payload: { brain_dump: '' }
    });

    assert.equal(response.statusCode, 400);
  });

  it('Teste 2: POST /api/clinical/soap sem o campo brain_dump retorna HTTP 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/clinical/soap',
      payload: {}
    });

    assert.equal(response.statusCode, 400);
  });

  it('Teste 3: POST /api/clinical/soap com { brain_dump: "12" } (menos de 3 chars) retorna HTTP 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/clinical/soap',
      payload: { brain_dump: '12' }
    });

    assert.equal(response.statusCode, 400);
  });

  it('Teste 4: formatClipboardSoap e formatClipboardPrescription formatam corretamente dados completos', () => {
    const mockSoapData = {
      subjetivo: 'Paciente relata cefaleia frontal há 2 dias.',
      objetivo: 'PA 120/80 mmHg, FC 78 bpm, afebril.',
      avaliacao: 'Cefaleia tensional (CID-10: G44.2).',
      plano: 'Analgesia, hidratação e repouso.'
    };

    const mockPrescriptionData = [
      {
        medicamento: 'Dipirona 500mg',
        posologia: '1 comprimido de 6/6h se dor',
        quantidade: '1 caixa',
        via: 'Uso Oral'
      },
      {
        medicamento: 'Ibuprofeno 400mg',
        posologia: '1 comprimido de 8/8h por 3 dias',
        quantidade: '1 caixa',
        via: 'Uso Oral'
      }
    ];

    const formattedSoap = formatClipboardSoap(mockSoapData);
    assert.equal(typeof formattedSoap, 'string');
    assert.ok(formattedSoap.includes('Paciente relata cefaleia frontal há 2 dias.'));
    assert.ok(formattedSoap.includes('PA 120/80 mmHg, FC 78 bpm, afebril.'));
    assert.ok(formattedSoap.includes('Cefaleia tensional (CID-10: G44.2).'));
    assert.ok(formattedSoap.includes('Analgesia, hidratação e repouso.'));

    const formattedPrescription = formatClipboardPrescription(mockPrescriptionData);
    assert.equal(typeof formattedPrescription, 'string');
    assert.ok(formattedPrescription.includes('Dipirona 500mg'));
    assert.ok(formattedPrescription.includes('1 comprimido de 6/6h se dor'));
    assert.ok(formattedPrescription.includes('Ibuprofeno 400mg'));
    assert.ok(formattedPrescription.includes('1 comprimido de 8/8h por 3 dias'));
  });
});