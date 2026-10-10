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

  // 14. Parser Robusto por Rótulos e Decimais com Vírgula
  const pRotulos = GasometriaAcidoBaseService.extrairParametrosGasometria(
    "gasometria pH: 7,22 paco2: 28,5 bicarb: 11,2 natremia: 138 cl-: 100 albumina: 3,5 oxigênio: 80 fio2: 50% lactato: 3,2 potássio: 4,1 68 anos"
  );
  assert.strictEqual(pRotulos.valido, true, "Parser deve aceitar rótulos clínicos variados");
  assert.strictEqual(pRotulos.parametros.ph, 7.22);
  assert.strictEqual(pRotulos.parametros.pco2, 28.5);
  assert.strictEqual(pRotulos.parametros.hco3, 11.2);
  assert.strictEqual(pRotulos.parametros.na, 138);
  assert.strictEqual(pRotulos.parametros.cl, 100);
  assert.strictEqual(pRotulos.parametros.albumina, 3.5);
  assert.strictEqual(pRotulos.parametros.pao2, 80);
  assert.strictEqual(pRotulos.parametros.fio2, 50);
  assert.strictEqual(pRotulos.parametros.lactato, 3.2);
  assert.strictEqual(pRotulos.parametros.potassio, 4.1);
  assert.strictEqual(pRotulos.parametros.idade, 68);
  console.log("✓ Teste 14: Parser por rótulos variados e decimais com vírgula validado com sucesso.");

  // 15. Extração Posicional Sequencial Rápida (sem rótulos - plantão de emergência)
  const pSeq3 = GasometriaAcidoBaseService.extrairParametrosGasometria("7.20 23 10");
  assert.strictEqual(pSeq3.valido, true);
  assert.strictEqual(pSeq3.parametros.ph, 7.20);
  assert.strictEqual(pSeq3.parametros.pco2, 23);
  assert.strictEqual(pSeq3.parametros.hco3, 10);

  const pSeq6 = GasometriaAcidoBaseService.extrairParametrosGasometria("/gaso 7,28 30 14 140 102 3,0");
  assert.strictEqual(pSeq6.valido, true);
  assert.strictEqual(pSeq6.parametros.ph, 7.28);
  assert.strictEqual(pSeq6.parametros.pco2, 30);
  assert.strictEqual(pSeq6.parametros.hco3, 14);
  assert.strictEqual(pSeq6.parametros.na, 140);
  assert.strictEqual(pSeq6.parametros.cl, 102);
  assert.strictEqual(pSeq6.parametros.albumina, 3.0);
  console.log("✓ Teste 15: Extração posicional sequencial ágil (sem rótulos) validada.");

  // 16. Tratamento Defensivo de Inputs Parciais/Incompletos
  const pIncompleto = GasometriaAcidoBaseService.extrairParametrosGasometria("pH 7.20 pCO2 25");
  assert.strictEqual(pIncompleto.valido, false);
  assert.strictEqual(pIncompleto.incompleto, true);
  assert(pIncompleto.ausentes.includes("HCO3"), "Deve acusar ausência de HCO3");
  assert(pIncompleto.informados.includes("pH 7.2"), "Deve registrar pH informado");

  const pVazio = GasometriaAcidoBaseService.extrairParametrosGasometria("/gaso");
  assert.strictEqual(pVazio.vazio, true);
  console.log("✓ Teste 16: Tratamento defensivo de inputs parciais e vazios validado.");

  // 17. Detecção Inteligente de Inversão de Digitação Rápida
  const pInvertido = GasometriaAcidoBaseService.extrairParametrosGasometria("pH 25 pCO2 7.20 HCO3 10");
  assert.strictEqual(pInvertido.valido, true);
  assert.strictEqual(pInvertido.inversaoSuspeita, true);
  assert.strictEqual(pInvertido.parametros.ph, 7.20, "Deve inverter pH para valor correto");
  assert.strictEqual(pInvertido.parametros.pco2, 25, "Deve inverter pCO2 para valor correto");
  console.log("✓ Teste 17: Detecção e swap defensivo de inversão de digitação validado.");

  // 18. Validação de Limites Fisiológicos de Sobrevivência
  const pExtremo = GasometriaAcidoBaseService.extrairParametrosGasometria("pH 9.5 pCO2 250 HCO3 90");
  assert.strictEqual(pExtremo.valido, false);
  assert(pExtremo.erro.includes("limites"), "Deve rejeitar valores biológicos incompatíveis");
  console.log("✓ Teste 18: Rejeição de valores fora dos limites biológicos validada.");

  // 19. Teclados Inline Adaptativos para Telegram
  const kbInicial = GasometriaAcidoBaseService.obterTecladoInlineGasometria("inicial");
  assert.ok(kbInicial && kbInicial.inline_keyboard.length >= 3, "Teclado inicial deve conter linhas de atalhos");
  assert(kbInicial.inline_keyboard[0].some(b => b.callback_data === "ux:gaso:pre:cad"), "Deve conter atalho para CAD");

  const kbWinter = GasometriaAcidoBaseService.obterTecladoInlineGasometria("winter");
  assert(kbWinter.inline_keyboard[0].some(b => b.callback_data === "ux:gaso:winter:calc:8"), "Deve conter atalho HCO3 8");

  const kbRes = GasometriaAcidoBaseService.obterTecladoInlineGasometria("resultado", {
    cacheKey: "mockkey123",
    temAcidoseMetabolica: true
  });
  assert(kbRes.inline_keyboard[0].some(b => b.callback_data === "ux:copiar:mockkey123"), "Deve conter botão copiar laudo PEP");
  assert(kbRes.inline_keyboard.some(row => row.some(b => b.callback_data === "ux:gaso:winter")), "Deve conter botão de Winter se acidose metabólica");
  console.log("✓ Teste 19: Teclados inline interativos adaptativos validados.");

  // 20. Casos Clínicos Predefinidos de Ouro
  const casoCad = GasometriaAcidoBaseService.obterExemploGasometriaPredefinido("cad");
  assert.strictEqual(casoCad.parametros.ph, 7.20);
  assert.strictEqual(casoCad.parametros.hco3, 10);

  const casoDpoc = GasometriaAcidoBaseService.obterExemploGasometriaPredefinido("dpoc");
  assert.strictEqual(casoDpoc.parametros.pco2, 62);
  assert.strictEqual(casoDpoc.parametros.hco3, 31);
  console.log("✓ Teste 20: Casos clínicos predefinidos de ouro validados.");

  // 21. Disparo de Comandos Telegram no Runtime
  let msgEnviada = null;
  let kbEnviado = null;
  runtime.ctx.enviarMensagemParaChat = (chatId, texto) => {
    msgEnviada = texto;
    return true;
  };
  runtime.ctx.enviarMensagemComTecladoParaChat = (chatId, texto, kb) => {
    msgEnviada = texto;
    kbEnviado = kb;
    return true;
  };

  // /gaso sem args -> exibe ajuda e teclado inicial
  msgEnviada = null; kbEnviado = null;
  runtime.ctx.processarMensagemTexto({ chat: { id: 123 }, text: "/gaso" });
  assert(msgEnviada.includes("GASOMETRIA ARTERIAL — REGRA DOS 5 PASSOS"));
  assert.ok(kbEnviado && kbEnviado.inline_keyboard, "Deve enviar teclado inicial");

  // /gaso com args posicionais
  msgEnviada = null; kbEnviado = null;
  runtime.ctx.processarMensagemTexto({ chat: { id: 123 }, text: "/gaso 7.20 23 10 140 105 4.0" });
  assert(msgEnviada.includes("Acidose Metabólica"));
  assert(msgEnviada.includes("PASSO 1"));
  assert.ok(kbEnviado && kbEnviado.inline_keyboard, "Deve enviar teclado de resultado");

  // /winter sem args -> exibe teclado de atalhos de HCO3
  msgEnviada = null; kbEnviado = null;
  runtime.ctx.processarMensagemTexto({ chat: { id: 123 }, text: "/winter" });
  assert(msgEnviada.includes("FÓRMULA DE WINTER"));
  assert.ok(kbEnviado && kbEnviado.inline_keyboard, "Deve enviar teclado de HCO3");

  // /winter 12 -> cálculo determinístico
  msgEnviada = null; kbEnviado = null;
  runtime.ctx.processarMensagemTexto({ chat: { id: 123 }, text: "/winter 12" });
  assert(msgEnviada.includes("PaCO₂ esperada"));
  console.log("✓ Teste 21: Comandos /gaso e /winter executados no Telegram com teclados inline validados.");

  // 22. Roteamento de Texto Livre em tentarCalcularDeterministico
  const resLivreGaso = runtime.ctx.tentarCalcularDeterministico("gasometria ph 7.20 pco2 23 hco3 10 na 140 cl 105 alb 4.0");
  assert.ok(resLivreGaso, "Deve retornar resultado determinístico para texto livre");
  assert(resLivreGaso.includes("Acidose Metabólica"));
  console.log("✓ Teste 22: Roteamento determinístico em 0ms de texto livre validado.");

  console.log("=== TODOS OS 22 TESTES DE GASOMETRIA ÁCIDO-BASE PASSARAM COM SUCESSO! ===");
}

runTests();
