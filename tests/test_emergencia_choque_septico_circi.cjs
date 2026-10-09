const assert = require('assert');
const { EmergenciaChoqueSepticoService } = require('../src/02_emergencia_choque_septico_circi.js');

function runTests() {
  console.log("=== INICIANDO TESTES: EMERGÊNCIA CHOQUE SÉPTICO REFRATÁRIO & CIRCI ===");

  // Teste 1: Choque responsivo (Nora < 0.25)
  let res1 = EmergenciaChoqueSepticoService.avaliarCirciEVasopressina(70, 0.1);
  assert.strictEqual(res1.sucesso, true);
  assert.strictEqual(res1.choqueRefratario, false);
  assert.ok(res1.textoSOAP.includes("fase inicial/responsiva"));

  // Teste 2: Choque Refratário (Nora >= 0.25)
  let res2 = EmergenciaChoqueSepticoService.avaliarCirciEVasopressina(80, 0.3);
  assert.strictEqual(res2.sucesso, true);
  assert.strictEqual(res2.choqueRefratario, true);
  assert.ok(res2.textoSOAP.includes("Choque Séptico Refratário detectado"));
  assert.ok(res2.textoSOAP.includes("HIDROCORTISONA (CIRCI"));
  assert.ok(res2.textoSOAP.includes("VASOPRESSINA"));
  assert.ok(res2.textoSOAP.includes("Azul de Metileno"));

  // Teste 3: Validação de entradas
  let res3 = EmergenciaChoqueSepticoService.avaliarCirciEVasopressina(20, 0.3);
  assert.ok(res3.erro);

  let res4 = EmergenciaChoqueSepticoService.avaliarCirciEVasopressina(70, -0.1);
  assert.ok(res4.erro);

  console.log("🎉 SUCESSO TOTAL: Todos os testes do módulo Choque Séptico (CIRCI) passaram!");
}

runTests();
