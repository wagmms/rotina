const assert = require('assert');
const { EmergenciaChoqueSepticoService } = require('../src/02_emergencia_choque_septico_circi.js');

function runTests() {
  console.log("=== INICIANDO TESTES: EMERGÊNCIA CHOQUE SÉPTICO REFRATÁRIO & CIRCI ===");

  // Teste 1: Choque responsivo (Nora < 0.25 mcg/kg/min) - 70kg, 0.1 mcg/kg/min
  let res1 = EmergenciaChoqueSepticoService.avaliarCirciEVasopressina(70, 0.1);
  assert.strictEqual(res1.sucesso, true);
  assert.strictEqual(res1.choqueRefratario, false);
  assert.strictEqual(res1.pesoKg, 70);
  assert.strictEqual(res1.doseNoraMcgKgMin, 0.1);

  // Validação dos cálculos determinísticos para 70kg
  assert.strictEqual(res1.calculos.concentracaoNoraMcgMl, 64);
  assert.strictEqual(res1.calculos.vazaoNoraAtualMlh, 6.6); // (0.1 * 70 * 60) / 64 = 6.5625 -> 6.6
  assert.strictEqual(res1.calculos.vazaoNoraInicialMlh, 3.3); // (0.05 * 70 * 60) / 64 = 3.28125 -> 3.3
  assert.strictEqual(res1.calculos.vazaoNoraInicialMaxMlh, 6.6); // (0.10 * 70 * 60) / 64 = 6.5625 -> 6.6
  assert.strictEqual(res1.calculos.vazaoNoraRefratarioMlh, 16.4); // (0.25 * 70 * 60) / 64 = 16.40625 -> 16.4
  assert.strictEqual(res1.calculos.vazaoNoraTetoMlh, 65.6); // (1.00 * 70 * 60) / 64 = 65.625 -> 65.6
  assert.strictEqual(res1.calculos.concentracaoVasoUiMl, 0.2);
  assert.strictEqual(res1.calculos.vazaoVasoFixaMlh, 9.0);

  // Prescrição PEP - Fase inicial
  assert.ok(res1.prescricaoPEP.noradrenalina.includes("Noradrenalina 4mg/4mL (4 amp = 16mg) + SG 5% 234mL (64 mcg/mL)"));
  assert.ok(res1.prescricaoPEP.noradrenalina.includes("6.6 mL/h"));
  assert.ok(res1.prescricaoPEP.noradrenalina.includes("PAM >= 65 mmHg"));
  assert.strictEqual(res1.prescricaoPEP.vasopressina, null);
  assert.strictEqual(res1.prescricaoPEP.hidrocortisona, null);

  // Alertas Canônicos
  assert.ok(res1.textoSOAP.includes("fase inicial/responsiva"));
  assert.ok(res1.textoSOAP.includes("PAM alvo >= 65 mmHg"));
  assert.ok(res1.textoSOAP.includes("Lactato sérico seriado de 2-4h"));
  assert.ok(res1.textoSOAP.includes("Restrição volêmica pós-ressuscitação inicial"));

  // Teste 2: Choque Refratário (Nora >= 0.25 mcg/kg/min) - 80kg, 0.3 mcg/kg/min
  let res2 = EmergenciaChoqueSepticoService.avaliarCirciEVasopressina(80, 0.3);
  assert.strictEqual(res2.sucesso, true);
  assert.strictEqual(res2.choqueRefratario, true);
  assert.strictEqual(res2.pesoKg, 80);
  assert.strictEqual(res2.doseNoraMcgKgMin, 0.3);

  // Validação dos cálculos determinísticos para 80kg
  assert.strictEqual(res2.calculos.vazaoNoraAtualMlh, 22.5); // (0.3 * 80 * 60) / 64 = 22.5
  assert.strictEqual(res2.calculos.vazaoNoraInicialMlh, 3.8); // (0.05 * 80 * 60) / 64 = 3.75 -> 3.8
  assert.strictEqual(res2.calculos.vazaoNoraTetoMlh, 75.0); // (1.00 * 80 * 60) / 64 = 75.0

  // Prescrição PEP - Choque refratário
  assert.ok(res2.prescricaoPEP.noradrenalina.includes("22.5 mL/h"));
  assert.strictEqual(res2.prescricaoPEP.vasopressina, "Vasopressina 20 UI/1mL (1 amp = 20 UI) + SF 0,9% 99mL (0,2 UI/mL) --- EV em BIC a 9 mL/h contínuo (sem titulação).");
  assert.strictEqual(res2.prescricaoPEP.hidrocortisona, "Hidrocortisona 50mg pó liofilizado + SF 0,9% 10mL --- EV direto em bolus lento (em 3 min) de 6/6h.");

  // Conteúdo textual do SOAP
  assert.ok(res2.textoSOAP.includes("Choque Séptico Refratário detectado"));
  assert.ok(res2.textoSOAP.includes("Solução de Noradrenalina padrão (4 ampolas de 4mg/4mL = 16mg em 234mL de SG 5%, concentração 64 mcg/mL)"));
  assert.ok(res2.textoSOAP.includes("Solução padrão de Vasopressina (1 ampola de 20 UI/1mL em 99mL de SF 0,9% = 0,2 UI/mL)"));
  assert.ok(res2.textoSOAP.includes("vazão fixa em BIC de 9 mL/h (0,03 UI/min) sem titulação"));
  assert.ok(res2.textoSOAP.includes("Diluição da Hidrocortisona (50mg pó liofilizado diluído em 10mL de SF 0,9% administrado IV em 3 min de 6/6h)"));
  assert.ok(res2.textoSOAP.includes("50 mg IV de 6/6h (200 mg/dia)"));
  assert.ok(res2.textoSOAP.includes("Azul de Metileno"));

  // Teste 3: Limiar exato de refratariedade (0.25 vs 0.24)
  let resLimiarRef = EmergenciaChoqueSepticoService.avaliarCirciEVasopressina(70, 0.25);
  assert.strictEqual(resLimiarRef.choqueRefratario, true);
  let resLimiarResp = EmergenciaChoqueSepticoService.avaliarCirciEVasopressina(70, 0.24);
  assert.strictEqual(resLimiarResp.choqueRefratario, false);

  // Teste 4: Formatação Telegram
  let txtTelegram = EmergenciaChoqueSepticoService.formatarTextoTelegram(res2);
  assert.ok(txtTelegram.includes("PROTOCOLO DE CHOQUE SÉPTICO REFRATÁRIO & CIRCI"));
  assert.ok(txtTelegram.includes("PRESCRIÇÃO PRONTA PARA PRONTUÁRIO (PEP)"));

  // Teste 5: Validação de entradas e erros defensivos
  let res3 = EmergenciaChoqueSepticoService.avaliarCirciEVasopressina(20, 0.3);
  assert.ok(res3.erro);
  assert.ok(res3.erro.includes("Peso inválido"));

  let res4 = EmergenciaChoqueSepticoService.avaliarCirciEVasopressina(360, 0.3);
  assert.ok(res4.erro);
  assert.ok(res4.erro.includes("Peso inválido"));

  let res5 = EmergenciaChoqueSepticoService.avaliarCirciEVasopressina(70, -0.1);
  assert.ok(res5.erro);
  assert.ok(res5.erro.includes("Dose de Noradrenalina inválida"));

  let res6 = EmergenciaChoqueSepticoService.avaliarCirciEVasopressina(null, 0.2);
  assert.ok(res6.erro);

  console.log("🎉 SUCESSO TOTAL: Todos os testes do módulo Choque Séptico (CIRCI) passaram com 100% de cobertura dos critérios de aceite!");
}

runTests();

