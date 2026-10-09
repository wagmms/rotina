const assert = require('assert');
const NeurologiaAvcService = require('../src/02_neurologia_avc.js');

function runTests() {
  console.log("=== INICIANDO TESTES NEUROLOGIA AVC ===");

  // Teste 1: Elegível Janela 2 horas
  let res1 = NeurologiaAvcService.avaliarTrombolise({ idade: 60, tempoSintomasHoras: 2, pesoKg: 80 });
  assert.strictEqual(res1.elegibilidade.elegivel, true);
  assert.strictEqual(res1.elegibilidade.posologiaAlteplase.includes("72.0 mg"), true);
  
  // Teste 2: Janela > 4.5h
  let res2 = NeurologiaAvcService.avaliarTrombolise({ idade: 60, tempoSintomasHoras: 5 });
  assert.strictEqual(res2.elegibilidade.elegivel, false);
  assert.strictEqual(res2.elegibilidade.mensagem.includes("contraindicada"), true);

  // Teste 3: Janela estendida (3 a 4.5h) com critérios de exclusão
  let res3 = NeurologiaAvcService.avaliarTrombolise({ idade: 85, tempoSintomasHoras: 4 });
  assert.strictEqual(res3.elegibilidade.elegivel, false);
  assert.strictEqual(res3.elegibilidade.mensagem.includes("Idade > 80 anos"), true);

  // Teste 4: Janela estendida (3 a 4.5h) sem exclusão
  let res4 = NeurologiaAvcService.avaliarTrombolise({ idade: 70, tempoSintomasHoras: 4, pesoKg: 110 });
  assert.strictEqual(res4.elegibilidade.elegivel, true);
  // Dose max 90mg
  assert.strictEqual(res4.elegibilidade.posologiaAlteplase.includes("Dose Total: 90.0 mg"), true);

  // Teste 5: Cálculo HIC Manitol e Salina
  let resHic = NeurologiaAvcService.calcularHic({ pesoKg: 70 });
  assert.strictEqual(resHic.manitol20.volumeMl, "175 a 350 mL"); // 70*2.5 = 175, 70*5 = 350
  assert.strictEqual(resHic.salinaHipertonica3.volumeMl, "210 mL"); // 70 * 3
  assert.strictEqual(resHic.salinaHipertonica20.volumeMl, "70 mL"); // 70 * 1

  console.log("=== TODOS OS TESTES NEUROLOGIA AVC PASSARAM COM SUCESSO ===");
}

runTests();
