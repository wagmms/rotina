'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const CalculadorasClinicas = require('../src/02_calculadoras_puras.js');

test('Trombólise AVCi: Alteplase (rt-PA) cálculo padrão e teto máximo de 90 mg', () => {
  // Paciente 70 kg: 70 * 0.9 = 63 mg total (6.3 mg bolus + 56.7 mg infusão)
  const r70 = CalculadorasClinicas.tromboliseAVC(70, 'alteplase');
  assert.equal(r70.ok, true);
  assert.equal(r70.dados.alteplase.doseTotalMg, 63);
  assert.equal(r70.dados.alteplase.bolus10PctMg, 6.3);
  assert.equal(r70.dados.alteplase.infusao90PctMg, 56.7);
  assert.equal(r70.dados.alteplase.tetoMaximoAtingido, false);

  // Paciente 120 kg: 120 * 0.9 = 108 mg -> deve limitar ao teto estrito de 90 mg (9.0 mg bolus + 81.0 mg infusão)
  const r120 = CalculadorasClinicas.tromboliseAVC(120, 'alteplase');
  assert.equal(r120.ok, true);
  assert.equal(r120.dados.alteplase.doseTotalMg, 90);
  assert.equal(r120.dados.alteplase.bolus10PctMg, 9);
  assert.equal(r120.dados.alteplase.infusao90PctMg, 81);
  assert.equal(r120.dados.alteplase.tetoMaximoAtingido, true);
});

test('Trombólise AVCi: Tenecteplase (TNK) cálculo padrão e teto estrito de 25 mg no AVC', () => {
  // Paciente 60 kg: 60 * 0.25 = 15 mg (3.0 mL na concentração de 5 mg/mL)
  const r60 = CalculadorasClinicas.tromboliseAVC(60, 'tnk');
  assert.equal(r60.ok, true);
  assert.equal(r60.dados.tenecteplase.doseTotalMg, 15);
  assert.equal(r60.dados.tenecteplase.volumeBolusMl, 3);
  assert.equal(r60.dados.tenecteplase.tetoMaximoAtingido, false);

  // Paciente 110 kg: 110 * 0.25 = 27.5 mg -> deve limitar ao teto estrito de 25 mg (5.0 mL)
  const r110 = CalculadorasClinicas.tromboliseAVC(110, 'tenecteplase');
  assert.equal(r110.ok, true);
  assert.equal(r110.dados.tenecteplase.doseTotalMg, 25);
  assert.equal(r110.dados.tenecteplase.volumeBolusMl, 5);
  assert.equal(r110.dados.tenecteplase.tetoMaximoAtingido, true);
});

test('Trombólise AVCi: Bloqueio pressórico de segurança (PA >= 185/110 mmHg)', () => {
  // PAS 190 / PAD 100 -> Bloqueado
  const rPas = CalculadorasClinicas.tromboliseAVC(70, 'ambos', 190, 100);
  assert.equal(rPas.ok, true);
  assert.equal(rPas.dados.paBloqueada, true);
  assert.match(rPas.rotulo, /BLOQUEIO TEMPORÁRIO/i);

  // PAS 160 / PAD 115 -> Bloqueado
  const rPad = CalculadorasClinicas.tromboliseAVC(70, 'ambos', 160, 115);
  assert.equal(rPad.ok, true);
  assert.equal(rPad.dados.paBloqueada, true);

  // PAS 150 / PAD 90 -> Liberado
  const rOk = CalculadorasClinicas.tromboliseAVC(70, 'ambos', 150, 90);
  assert.equal(rOk.ok, true);
  assert.equal(rOk.dados.paBloqueada, false);
});

test('Trombólise AVCi: Janela de tempo de ictus > 4.5h', () => {
  const rJanela = CalculadorasClinicas.tromboliseAVC(70, 'ambos', 140, 80, 5.0);
  assert.equal(rJanela.ok, true);
  assert.equal(rJanela.dados.foraJanelaPadrao, true);
  assert.match(rJanela.rotulo, /JANELA > 4,5h/i);
});

test('Trombólise AVCi: Parser de texto livre calcularTrombolisePorTextoLivre', () => {
  const r1 = CalculadorasClinicas.calcularTrombolisePorTextoLivre('dose trombolise avc paciente 80 kg');
  assert.ok(r1 && r1.ok);
  assert.equal(r1.dados.pesoKg, 80);
  assert.equal(r1.dados.alteplase.doseTotalMg, 72);
  assert.equal(r1.dados.tenecteplase.doseTotalMg, 20);

  const r2 = CalculadorasClinicas.calcularTrombolisePorTextoLivre('tenecteplase 60kg');
  assert.ok(r2 && r2.ok);
  assert.equal(r2.dados.tenecteplase.doseTotalMg, 15);

  const rInvalido = CalculadorasClinicas.calcularTrombolisePorTextoLivre('dor de cabeca');
  assert.equal(rInvalido, null);
});
