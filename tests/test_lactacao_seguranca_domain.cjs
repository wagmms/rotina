/**
 * ==============================================================================
 * TESTE UNITÁRIO: DOMÍNIO DE SEGURANÇA DE MEDICAMENTOS NA LACTAÇÃO (HALE / MS)
 * ==============================================================================
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const domain = require('../src/domain/lactacao_seguranca_domain.js');

test('Lactação Domínio - Metadados e Catálogo Farmacológico', () => {
  const meta = domain.obterMetadadosCatalogo();
  assert.ok(meta.totalMedicamentos >= 45, 'Catálogo deve conter pelo menos 45 medicamentos');
  assert.ok(meta.totalTermosIndexados >= 150, 'Deve ter índice de sinônimos/marcas robusto');
  assert.ok(meta.distribuicaoMS.VERMELHO >= 10, 'Deve categorizar contraindicados absolutos');
  assert.ok(meta.distribuicaoMS.VERDE >= 15, 'Deve categorizar medicamentos de primeira escolha');
});

test('Lactação Domínio - Fármacos Contraindicados Absolutos (Vermelho MS / Hale L4-L5)', () => {
  const amiodarona = domain.consultarMedicamento('Amiodarona');
  assert.ok(amiodarona, 'Amiodarona deve existir');
  assert.strictEqual(amiodarona.ms, 'VERMELHO');
  assert.strictEqual(amiodarona.hale, 'L5');
  assert.ok(amiodarona.exigeIntervencaoImediata);

  const litio = domain.consultarMedicamento('Carbonato de Lítio');
  assert.ok(litio, 'Lítio deve existir');
  assert.strictEqual(litio.ms, 'VERMELHO');
  assert.ok(litio.hale === 'L4' || litio.hale === 'L5');

  const ergotamina = domain.consultarMedicamento('Ergotamina');
  assert.ok(ergotamina, 'Ergotamina deve existir');
  assert.strictEqual(ergotamina.ms, 'VERMELHO');

  const cabergolina = domain.consultarMedicamento('Cabergolina');
  assert.ok(cabergolina, 'Cabergolina deve existir');
  assert.strictEqual(cabergolina.ms, 'VERMELHO');

  const isotretinoina = domain.consultarMedicamento('Roacutan');
  assert.ok(isotretinoina, 'Roacutan deve ser indexado para Isotretinoína');
  assert.strictEqual(isotretinoina.ms, 'VERMELHO');
  assert.strictEqual(isotretinoina.hale, 'L5');
});

test('Lactação Domínio - Fármacos de Uso Criterioso / Monitorar (Amarelo MS / Hale L3)', () => {
  const cipro = domain.consultarMedicamento('Ciprofloxacino');
  assert.ok(cipro, 'Ciprofloxacino deve existir');
  assert.strictEqual(cipro.ms, 'AMARELO');

  const bactrim = domain.consultarMedicamento('Bactrim');
  assert.ok(bactrim, 'Bactrim deve existir');
  assert.strictEqual(bactrim.ms, 'AMARELO');
});

test('Lactação Domínio - Fármacos Seguros de Primeira Escolha (Verde MS / Hale L1-L2)', () => {
  const dipirona = domain.consultarMedicamento('Dipirona');
  assert.ok(dipirona, 'Dipirona deve existir');
  assert.strictEqual(dipirona.ms, 'VERDE');

  const paracetamol = domain.consultarMedicamento('Paracetamol');
  assert.ok(paracetamol, 'Paracetamol deve existir');
  assert.strictEqual(paracetamol.ms, 'VERDE');
  assert.strictEqual(paracetamol.hale, 'L1');

  const ibuprofeno = domain.consultarMedicamento('Ibuprofeno');
  assert.ok(ibuprofeno, 'Ibuprofeno deve existir');
  assert.strictEqual(ibuprofeno.ms, 'VERDE');
  assert.strictEqual(ibuprofeno.hale, 'L1');

  const sertralina = domain.consultarMedicamento('Sertralina');
  assert.ok(sertralina, 'Sertralina deve existir');
  assert.strictEqual(sertralina.ms, 'VERDE');

  const enalapril = domain.consultarMedicamento('Enalapril');
  assert.ok(enalapril, 'Enalapril deve existir');
  assert.strictEqual(enalapril.ms, 'VERDE');
});

test('Lactação Domínio - Avaliação de Prescrição Multidrogas em Tempo Sub-1ms', () => {
  const prescricao = [
    'Amiodarona 200mg VO 1x/dia',
    'Dipirona 500mg VO 6/6h',
    'Sertralina 50mg VO pela manhã'
  ];
  const resultado = domain.avaliarPrescricaoNutriz(prescricao);
  assert.ok(resultado.contraindicados.length > 0, 'Deve alertar a Amiodarona como contraindicada');
  assert.ok(resultado.seguros.length >= 2, 'Dipirona e Sertralina devem ser marcadas como seguras');
  assert.ok(resultado.tempoProcessamentoMs < 1.0, 'Tempo de execução deve ser < 1ms');
  assert.ok(resultado.statusGlobal.includes('CONTRAINDICAÇÃO'), 'Status deve apontar contraindicação');
});
