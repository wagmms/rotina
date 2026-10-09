const assert = require('assert');
const NeurologiaAvcService = require('../src/02_neurologia_avc.js');

function runTests() {
  console.log("=== INICIANDO TESTES NEUROLOGIA AVC ===");

  // Teste 1: Elegível Janela 2 horas
  let res1 = NeurologiaAvcService.avaliarTrombolise({ idade: 60, tempoSintomasHoras: 2, pesoKg: 80 });
  assert.strictEqual(res1.elegibilidade.elegivel, true);
  assert.strictEqual(res1.elegibilidade.posologiaAlteplase.includes("72.0 mg"), true);
  assert.strictEqual(res1.elegibilidade.posologiaTenecteplase.includes("20.0 mg"), true);
  
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
  // Dose max 90mg para Alteplase e 25mg para Tenecteplase
  assert.strictEqual(res4.elegibilidade.posologiaAlteplase.includes("Dose Total: 90.0 mg"), true);
  assert.strictEqual(res4.elegibilidade.posologiaTenecteplase.includes("25.0 mg"), true);

  // Teste 5: Cálculo HIC Manitol e Salina
  let resHic = NeurologiaAvcService.calcularHic({ pesoKg: 70 });
  assert.strictEqual(resHic.manitol20.volumeMl, "175 a 350 mL"); // 70*2.5 = 175, 70*5 = 350
  assert.strictEqual(resHic.salinaHipertonica3.volumeMl, "210 mL"); // 70 * 3
  assert.strictEqual(resHic.salinaHipertonica20.volumeMl, "70 mL"); // 70 * 1

  // Teste 6: Hipoglicemia (< 50 mg/dL) como contraindicação/mímico
  let resHipo = NeurologiaAvcService.avaliarTrombolise({ idade: 55, tempoSintomasHoras: 1.5, glicemia: 42 });
  assert.strictEqual(resHipo.elegibilidade.elegivel, false);
  assert.strictEqual(resHipo.elegibilidade.contraindicacoesAbsolutas.some(c => c.includes("Hipoglicemia")), true);

  // Teste 7: Coagulopatia e DOAC
  let resDoac = NeurologiaAvcService.avaliarTrombolise({ idade: 65, tempoSintomasHoras: 2, usoDoacUltimas48h: true, plaquetas: 85000, inr: 2.1 });
  assert.strictEqual(resDoac.elegibilidade.elegivel, false);
  assert.strictEqual(resDoac.elegibilidade.contraindicacoesAbsolutas.some(c => c.includes("DOAC")), true);
  assert.strictEqual(resDoac.elegibilidade.contraindicacoesAbsolutas.some(c => c.includes("Plaquetopenia")), true);
  assert.strictEqual(resDoac.elegibilidade.contraindicacoesAbsolutas.some(c => c.includes("INR > 1.7")), true);

  // Teste 8: Pressão arterial descontrolada pré-trombólise
  let resPa = NeurologiaAvcService.avaliarTrombolise({ idade: 62, tempoSintomasHoras: 2, pas: 195, pad: 115, pesoKg: 75 });
  assert.strictEqual(resPa.elegibilidade.paDescontrolada, true);
  assert.strictEqual(resPa.elegibilidade.alertasClinicos.some(a => a.includes("195/115")), true);
  assert.strictEqual(resPa.controlePressao.alvoPreTrombolise.includes("PA < 185/110"), true);
  assert.strictEqual(resPa.controlePressao.alvoPosTrombolise.includes("PA < 180/105"), true);

  // Teste 9: Osmolaridade sérica com teto de segurança
  let resHicOsm = NeurologiaAvcService.calcularHic({
    pesoKg: 80,
    sodio: 156,
    glicemia: 280,
    ureia: 85
  });
  assert.strictEqual(resHicOsm.osmolaridadeCalculada >= 320, true);
  assert.strictEqual(resHicOsm.alertasOsmolares.some(a => a.includes("TETO OSMOLAR ATINGIDO")), true);
  assert.strictEqual(resHicOsm.alertasOsmolares.some(a => a.includes("TETO DE SÓDIO ATINGIDO")), true);
  assert.strictEqual(resHicOsm.salinaHipertonica3.preparo.frasco500.includes("SF 0,9% + 55 mL de NaCl 20%"), true);

  // Teste 10: Formatação de Resumo Clínico
  let resumoAvc = NeurologiaAvcService.formatarResumoAvc(Object.assign({}, res1, resHic));
  assert.strictEqual(typeof resumoAvc, 'string');
  assert.strictEqual(resumoAvc.includes("MANEJO DE AVC ISQUÊMICO AGUDO"), true);
  assert.strictEqual(resumoAvc.includes("Alteplase"), true);
  assert.strictEqual(resumoAvc.includes("Manitol 20%"), true);
  assert.strictEqual(resumoAvc.includes("Salina 3%"), true);

  console.log("=== TODOS OS TESTES NEUROLOGIA AVC PASSARAM COM SUCESSO ===");
}

runTests();
