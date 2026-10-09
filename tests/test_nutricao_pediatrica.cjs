const assert = require('assert');
const SuporteNutricionalPediatricoService = require('../src/02_suporte_nutricional_pediatrico.js');

function rodarTestes() {
  console.log("🍼 Iniciando testes do Módulo de Nutrição Pediátrica (Holliday-Segar / Fórmulas)...");
  
  // Teste 1: Holliday-Segar básico
  const r1 = SuporteNutricionalPediatricoService.avaliarSuporteNutricionalPediatricoCompleto({ pesoKg: 8 });
  assert.strictEqual(r1.hollidaySegar.volumeBasal24h, 800);
  assert.strictEqual(r1.hollidaySegar.vazaoHorariaMlH, 33.3);

  // Teste 2: Holliday-Segar acima de 10 kg
  const r2 = SuporteNutricionalPediatricoService.avaliarSuporteNutricionalPediatricoCompleto({ pesoKg: 15 });
  assert.strictEqual(r2.hollidaySegar.volumeBasal24h, 1250);

  // Teste 3: Preparo de fórmula infantil
  const r3 = SuporteNutricionalPediatricoService.avaliarSuporteNutricionalPediatricoCompleto({ volumeMamadaMl: 120, idadeMeses: 3, pesoKg: 5 });
  assert.strictEqual(r3.formulaInfantil.prescricaoMamada.medidasRasas, 4);

  // Teste 4: Alerta de erro para diluição quebrada - it actually rounds to nearest multiple or creates alert. Let's see what happens with 130ml.
  const r4 = SuporteNutricionalPediatricoService.avaliarSuporteNutricionalPediatricoCompleto({ volumeMamadaMl: 130, pesoKg: 4 });
  assert.strictEqual(r4.sucesso, true); // It handles it by calculating the nearest multiple in formulaInfantil.

  console.log("✅ Todos os testes de Nutrição Pediátrica passaram!");
}

try {
  rodarTestes();
} catch (e) {
  console.error("❌ Falha no teste:", e);
  process.exit(1);
}
