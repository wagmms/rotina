const assert = require('assert');
const GasometriaAcidoBaseService = require('../src/02_gasometria_acido_base.js');

function runTests() {
  console.log("=== Iniciando Testes Determinísticos: Gasometria Ácido-Base (Regra dos 5 Passos) ===");

  // 1. Fórmula de Winter Isolada
  const w1 = GasometriaAcidoBaseService.calcularWinter(10);
  assert.strictEqual(w1.pco2Esperada, 23, "Winter esperada para HCO3 10 deve ser 23");
  assert.strictEqual(w1.minimo, 21, "Winter mínimo deve ser 21");
  assert.strictEqual(w1.maximo, 25, "Winter máximo deve ser 25");
  console.log("✓ Teste 1: Fórmula de Winter isolada validada com sucesso.");

  // 2. Acidose Metabólica com compensação de Winter adequada
  const rWinterOk = GasometriaAcidoBaseService.analisarGasometria({
    ph: 7.20,
    pco2: 23,
    hco3: 10,
    na: 140,
    cl: 105,
    albumina: 4.0
  });
  assert.strictEqual(rWinterOk.disturbio, "Acidose Metabólica");
  assert.strictEqual(rWinterOk.gravidade, "MODERADA");
  assert(rWinterOk.compensacao.avaliacao.includes("adequada"), "Compensação de Winter deve ser adequada");
  assert.strictEqual(rWinterOk.anionGap.ag, 25, "AG deve ser 25");
  assert.strictEqual(rWinterOk.anionGap.elevado, true, "AG deve ser elevado");
  assert.strictEqual(rWinterOk.deltaRatio.razao, 0.93, "Delta ratio deve ser ~0.93 (0.8-2.0 pura)");
  assert(rWinterOk.deltaRatio.interpretacao.includes("pura"), "Delta ratio deve indicar acidose pura de AG elevado");
  console.log("✓ Teste 2: Acidose Metabólica com Winter adequado e Delta Ratio pura validado.");

  // 3. Acidose Metabólica com Acidose Respiratória associada (pCO2 acima do esperado)
  const rWinterAlta = GasometriaAcidoBaseService.analisarGasometria({
    ph: 7.15,
    pco2: 32, // Winter esperava 21 a 25 mmHg
    hco3: 10,
    na: 140,
    cl: 105,
    albumina: 4.0
  });
  assert(rWinterAlta.compensacao.avaliacao.includes("Acidose Respiratória associada"));
  assert.strictEqual(rWinterAlta.compensacao.disturbioAssociado, "acidose_respiratoria");
  assert.strictEqual(rWinterAlta.gravidade, "GRAVE");
  console.log("✓ Teste 3: Retenção de CO2 com Acidose Respiratória associada validada.");

  // 4. Acidose Metabólica com Alcalose Respiratória associada (pCO2 abaixo do esperado)
  const rWinterBaixa = GasometriaAcidoBaseService.analisarGasometria({
    ph: 7.28,
    pco2: 17, // Winter esperava 21 a 25 mmHg
    hco3: 10,
    na: 140,
    cl: 105,
    albumina: 4.0
  });
  assert(rWinterBaixa.compensacao.avaliacao.includes("Alcalose Respiratória associada"));
  assert.strictEqual(rWinterBaixa.compensacao.disturbioAssociado, "alcalose_respiratoria");
  console.log("✓ Teste 4: Hiperventilação excessiva com Alcalose Respiratória associada validada.");

  // 5. Alcalose Metabólica Primária com compensação esperada
  const rAlcaloseMet = GasometriaAcidoBaseService.analisarGasometria({
    ph: 7.50,
    pco2: 48, // Esperado: 40 + 0.7 * (35 - 24) = 47.7 +/- 2 (45.7 a 49.7)
    hco3: 35
  });
  assert.strictEqual(rAlcaloseMet.disturbio, "Alcalose Metabólica");
  assert(rAlcaloseMet.compensacao.avaliacao.includes("adequada"));
  console.log("✓ Teste 5: Alcalose Metabólica primária com compensação adequada validada.");

  // 6. Ânion Gap Corrigido por Albumina (Hipoalbuminemia)
  const rAlb = GasometriaAcidoBaseService.analisarGasometria({
    ph: 7.28,
    pco2: 30,
    hco3: 15,
    na: 140,
    cl: 100,
    albumina: 2.0 // Hipoalbuminemia grave: AG não corrigido = 25, corrigido = 25 + 2.5 * (4 - 2) = 30
  });
  assert.strictEqual(rAlb.anionGap.ag, 25);
  assert.strictEqual(rAlb.anionGap.agCorrigido, 30);
  console.log("✓ Teste 6: Ânion Gap corrigido por albumina (25 -> 30) validado.");

  // 7. Razão Delta (Delta-Delta): Acidose Hiperclorêmica vs Mista vs Alcalose Oculta
  // 7a. Hiperclorêmica com AG normal (< 0.4)
  const rHiper = GasometriaAcidoBaseService.analisarGasometria({
    ph: 7.25,
    pco2: 26,
    hco3: 11,
    na: 140,
    cl: 115, // AG = 140 - (115 + 11) = 14. deltaAG = 2, deltaHCO3 = 13. ratio = 2/13 = 0.15 (< 0.4)
    albumina: 4.0
  });
  assert(rHiper.deltaRatio.razao < 0.4);
  assert(rHiper.deltaRatio.interpretacao.includes("hiperclorêmica"));
  console.log("✓ Teste 7a: Razão Delta < 0.4 (acidose hiperclorêmica) validada.");

  // 7b. Mista AG elevado + hiperclorêmica (0.4 a 0.8)
  const rMistaAG = GasometriaAcidoBaseService.analisarGasometria({
    ph: 7.22,
    pco2: 24,
    hco3: 10,
    na: 140,
    cl: 110, // AG = 140 - (110 + 10) = 20. deltaAG = 8, deltaHCO3 = 14. ratio = 8/14 = 0.57
    albumina: 4.0
  });
  assert(rMistaAG.deltaRatio.razao >= 0.4 && rMistaAG.deltaRatio.razao < 0.8);
  assert(rMistaAG.deltaRatio.interpretacao.includes("mista"));
  console.log("✓ Teste 7b: Razão Delta 0.4-0.8 (acidose mista) validada.");

  // 7c. Alcalose Metabólica oculta (> 2.0)
  const rAlcaloseOculta = GasometriaAcidoBaseService.analisarGasometria({
    ph: 7.36,
    pco2: 38,
    hco3: 21,
    na: 145,
    cl: 95, // AG = 145 - (95 + 21) = 29. deltaAG = 17, deltaHCO3 = 3. ratio = 17/3 = 5.67 (> 2.0)
    albumina: 4.0
  });
  assert(rAlcaloseOculta.deltaRatio.razao > 2.0);
  assert(rAlcaloseOculta.deltaRatio.interpretacao.includes("Alcalose Metabólica"));
  console.log("✓ Teste 7c: Razão Delta > 2.0 (alcalose metabólica oculta) validada.");

  // 8. Distúrbio Ácido-Base Triplo (CAD + vômitos + DPOC)
  const rTriplo = GasometriaAcidoBaseService.analisarGasometria({
    ph: 7.25,
    pco2: 42, // Winter esperava 1.5*18 + 8 = 35 +/- 2 (33 a 37). Com 42 -> Acidose Resp!
    hco3: 18,
    na: 145,
    cl: 95,   // AG = 145 - (95 + 18) = 32. deltaAG = 20, deltaHCO3 = 6. ratio = 3.33 -> Alcalose Met!
    albumina: 4.0
  });
  assert.strictEqual(rTriplo.disturbioTriplo !== null, true, "Deve detectar distúrbio triplo");
  assert.strictEqual(rTriplo.disturbioTriplo.detectado, true);
  assert(rTriplo.disturbioTriplo.componentes.some(c => c.includes("AG elevado")));
  assert(rTriplo.disturbioTriplo.componentes.some(c => c.includes("Alcalose Metabólica")));
  assert(rTriplo.disturbioTriplo.componentes.some(c => c.includes("Acidose Respiratória")));
  console.log("✓ Teste 8: Detecção determinística de distúrbio ácido-base triplo validada.");

  // 9. Oxigenação: Relação P/F Berlim 2012 e Gradiente Alvéolo-Arterial (A-a)
  const rOxig = GasometriaAcidoBaseService.analisarGasometria({
    ph: 7.35,
    pco2: 40,
    hco3: 24,
    pao2: 85,
    fio2: 50, // 50% -> 0.50. P/F = 85 / 0.5 = 170 (SDRA Moderada)
    idade: 60
  });
  assert.strictEqual(rOxig.oxigenacao.pfRatio, 170);
  assert(rOxig.oxigenacao.classificacaoPF.includes("SDRA Moderada"));
  assert(rOxig.oxigenacao.gradienteAa !== null);
  assert.strictEqual(rOxig.oxigenacao.gradienteAaElevado, true);
  console.log("✓ Teste 9: Oxigenação, P/F Berlim e Gradiente A-a validados.");

  // 10. Consistência Interna de Henderson-Hasselbalch
  const rConsistente = GasometriaAcidoBaseService.analisarGasometria({
    ph: 7.40,
    pco2: 40,
    hco3: 24
  });
  assert.strictEqual(rConsistente.consistencia.consistente, true);

  const rInconsistente = GasometriaAcidoBaseService.analisarGasometria({
    ph: 7.10, // Incompatível com pCO2 40 e HCO3 24
    pco2: 40,
    hco3: 24
  });
  assert.strictEqual(rInconsistente.consistencia.consistente, false);
  assert(rInconsistente.avisos.some(a => a.includes("Inconsistência interna")));
  console.log("✓ Teste 10: Consistência de Henderson-Hasselbalch validada.");

  // 11. Alertas de Segurança Beira-Leito: Hipocalemia antes de Bicarbonato e Lactato Crítico
  const rSeguranca = GasometriaAcidoBaseService.analisarGasometria({
    ph: 7.05, // Crítico
    pco2: 20,
    hco3: 6,
    na: 140,
    cl: 100,
    lactato: 5.5, // Crítico > 4
    potassio: 2.8 // Hipocalemia crítica < 3.0
  });
  assert(rSeguranca.avisos.some(a => a.includes("Hipocalemia") && a.includes("NaHCO₃")));
  assert(rSeguranca.avisos.some(a => a.includes("Lactato > 4 mmol/L")));
  assert.strictEqual(rSeguranca.gravidade, "CRITICA");
  console.log("✓ Teste 11: Alertas críticos de hipocalemia e lactato validados.");

  // 12. Formatação para Telegram (HTML válido)
  const textoTelegram = GasometriaAcidoBaseService.formatarTextoTelegram(rTriplo);
  assert(textoTelegram.includes("<b>GASOMETRIA ARTERIAL — ANÁLISE DE 5 PASSOS</b>"));
  assert(textoTelegram.includes("PASSO 1"));
  assert(textoTelegram.includes("PASSO 2"));
  assert(textoTelegram.includes("PASSO 3"));
  assert(textoTelegram.includes("PASSO 4"));
  assert(textoTelegram.includes("DISTÚRBIO TRIPLO DETECTADO"));
  console.log("✓ Teste 12: Formatação Telegram HTML validada com sucesso.");

  // 13. Integração com Servidor Fastify / Runtime RPC
  const runtime = require('../server/runtime.js');
  const crypto = require('crypto');
  const botToken = 'dummy-token-gaso';
  if (!runtime.ctx.ConfigService) runtime.ctx.ConfigService = {};
  runtime.ctx.ConfigService.exigir = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : (k === 'TELEGRAM_BOT_TOKEN' ? botToken : 'dummy');
  const hashEsperado = crypto.createHmac('sha256', botToken).update('123').digest('hex');
  const fakeSession = 'ck_' + hashEsperado;

  const rpcRes = runtime.cockpitRpc('cockpitGasometriaAcidoBase', fakeSession, [{
    ph: 7.20,
    pco2: 23,
    hco3: 10,
    na: 140,
    cl: 105,
    albumina: 4.0
  }]);
  assert.strictEqual(rpcRes.sucesso, true);
  assert.strictEqual(rpcRes.resultado.disturbio, "Acidose Metabólica");
  assert(rpcRes.textoFormatado.includes("GASOMETRIA ARTERIAL"));

  // Validação do alias cockpitGasometria
  const rpcResAlias = runtime.cockpitRpc('cockpitGasometria', fakeSession, [{
    ph: 7.50,
    pco2: 48,
    hco3: 35
  }]);
  assert.strictEqual(rpcResAlias.sucesso, true);
  assert.strictEqual(rpcResAlias.resultado.disturbio, "Alcalose Metabólica");
  console.log("✓ Teste 13: Integração RPC Fastify (cockpitGasometriaAcidoBase e cockpitGasometria) validada.");

  console.log("=== TODOS OS 13 TESTES DE GASOMETRIA ÁCIDO-BASE PASSARAM COM SUCESSO! ===");
}

runTests();
