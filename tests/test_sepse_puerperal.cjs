const assert = require('assert');
const { SepsePuerperalService } = require('../src/02_sepse_puerperal');

function runTests() {
  console.log("Iniciando suite de testes: Sepse Puerperal");

  // Teste 1: Gestante normal com fisiologia adaptada (leucocitose e taquicardia leves)
  const casoNormal = SepsePuerperalService.avaliarRiscoSepsis({
    temperatura: 37,
    fc: 110,
    fr: 18,
    pas: 110,
    pad: 70,
    spo2: 98,
    leucocitos: 15000,
    glasgow: 15,
    lactato: 1.0
  });

  assert.strictEqual(casoNormal.sosScore, 0, "Score SOS deve ser 0 para gestante normal");
  assert.strictEqual(casoNormal.qSofaScore, 0, "qSOFA deve ser 0");
  assert.strictEqual(casoNormal.classificacao, "BAIXO RISCO", "Deve classificar como baixo risco");

  // Teste 2: Gestante com infecção pélvica e alto risco
  const casoGrave = SepsePuerperalService.avaliarRiscoSepsis({
    temperatura: 39.5, // +2
    fc: 135, // +2
    fr: 26, // SOS: +2, qSOFA: +1
    pas: 85, // SOS: +1, qSOFA: +1
    pad: 50, // 0
    spo2: 94, // +1
    leucocitos: 18000, // +1
    glasgow: 15,
    lactato: 2.5 // choque septico
  });

  assert.strictEqual(casoGrave.sosScore, 9, "Score SOS deve somar 9");
  assert.strictEqual(casoGrave.qSofaScore, 2, "qSOFA deve ser 2 (FR>=25 e PAS<=90)");
  assert.strictEqual(casoGrave.riscoAltoSOS, true, "Risco alto no SOS");
  assert.strictEqual(casoGrave.riscoAltoQSofa, true, "Risco alto no qSOFA");
  assert.strictEqual(casoGrave.choqueSeptico, true, "Deve identificar choque séptico devido ao lactato > 2.0 ou PAS < 90");
  assert.strictEqual(casoGrave.classificacao, "ALTO RISCO PARA SEPSE", "Deve alertar alto risco");
  assert.ok(casoGrave.conduta.some(c => c.includes("Noradrenalina")), "Conduta de choque deve incluir noradrenalina");

  console.log("✅ Todos os testes de Sepse Puerperal passaram com sucesso!");
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
