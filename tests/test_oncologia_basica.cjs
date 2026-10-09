const { OncologiaBasicaService } = require('../src/02_oncologia_basica');
const assert = require('assert');

function testRastreioMama() {
  const res1 = OncologiaBasicaService.avaliarRastreamento({ idade: 55, sexo: 'F' });
  assert.strictEqual(res1.mama.indicado, true);
  assert.ok(res1.mama.conduta.includes('cada 2 anos'));

  const res2 = OncologiaBasicaService.avaliarRastreamento({ idade: 40, sexo: 'F', alto_risco_mama: true });
  assert.strictEqual(res2.mama.indicado, true);
  assert.ok(res2.mama.conduta.includes('35-40 anos'));

  const res3 = OncologiaBasicaService.avaliarRastreamento({ idade: 45, sexo: 'F' });
  assert.strictEqual(res3.mama.indicado, false);
}

function testRastreioColon() {
  const res1 = OncologiaBasicaService.avaliarRastreamento({ idade: 60, sexo: 'M' });
  assert.strictEqual(res1.colon.indicado, true);
  assert.ok(res1.colon.conduta.includes('Pesquisa de Sangue Oculto'));

  const res2 = OncologiaBasicaService.avaliarRastreamento({ idade: 42, sexo: 'F', alto_risco_colon: true });
  assert.strictEqual(res2.colon.indicado, true);
  assert.ok(res2.colon.conduta.includes('40 anos'));
}

function testBiRads() {
  const b3 = OncologiaBasicaService.condutaBiRads('3');
  assert.strictEqual(b3.categoria, 'Provavelmente benigna');
  
  const b4a = OncologiaBasicaService.condutaBiRads('4A');
  assert.ok(b4a.categoria.includes('Suspeita'));
  assert.ok(b4a.conduta.includes('Biópsia'));

  const b0 = OncologiaBasicaService.condutaBiRads(0);
  assert.strictEqual(b0.categoria, 'Incompleta');
}

function testEfeitos() {
  const neutro = OncologiaBasicaService.manejoEfeitoAdverso('neutropenia_febril', { mascc: 25 });
  assert.ok(neutro.detalhes.includes('Risco BAIXO'));

  const dor = OncologiaBasicaService.manejoEfeitoAdverso('dor_oncologica', { eva: 8 });
  assert.ok(dor.conduta_aps.includes('Opioides fortes'));
}

function runTests() {
  testRastreioMama();
  testRastreioColon();
  testBiRads();
  testEfeitos();
  console.log("Todos os testes de Oncologia Básica passaram!");
}

runTests();
