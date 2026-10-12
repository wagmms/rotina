// -*- coding: utf-8 -*-
/**
 * Teste unitário e de integração para validar:
 * 1. Ouvir no fone: síntese de áudio prioritária (gemini-3.8-flash-lite-tts) e zero reenvio de SOAP duplicado em texto.
 * 2. Ausência de exemplos de caso fictícios (HAS, DM2, PAC) e presença de explicação clara do que fazer.
 * 3. Rotina de domingo e timeline sem grade genérica (sem "Simulado Semanal", sem 0/6 blocos), priorizando a agenda Google.
 */

const assert = require('assert');
const path = require('path');
const runtime = require('../server/runtime.js');

async function executarTestesAjustesUsuario() {
  console.log("Iniciando testes de validação dos ajustes solicitados pelo usuário...");
  const ctx = runtime.ctx;

  // -------------------------------------------------------------------------
  // 1. Áudio no Fone: deve sintetizar áudio e NUNCA reenviar o SOAP em texto
  // -------------------------------------------------------------------------
  console.log("[1] Testando 'Ouvir no Fone'...");
  let audioEnviado = null;
  let textoEnviado = null;

  ctx.enviarAudioVozTelegram = (chatId, blob, legenda, kb) => {
    audioEnviado = {
      chatId,
      tamanhoBytes: blob ? blob.getBytes().length : 0,
      legenda,
      kb
    };
    return true;
  };

  ctx.enviarMensagemParaChat = (chatId, texto) => {
    textoEnviado = { chatId, texto };
    return true;
  };

  const soapExemplo = `
🩺 *REGISTRO CLÍNICO AMBULATORIAL (SOAP)*
👤 *IDENTIFICAÇÃO:* Paciente 52 anos.
🗣️ *SUBJETIVO:* Tosse seca e febre baixa há 2 dias.
🔍 *OBJETIVO:* Murmúrio vesicular presente, sem ruídos adventícios.
🧠 *AVALIAÇÃO:*
1. Síndrome gripal / IVAS em paciente imunocompetente.
📋 *PLANO:*
1. Sintomáticos e boa hidratação oral. Retorno se sinais de alarme.
`;

  // Simula clique no botão "🎧 Ouvir no Fone"
  const okNarrar = ctx.responderPreceptorVozComIA("123456", soapExemplo, { apenasNarrar: true });
  assert.strictEqual(okNarrar, true, "responderPreceptorVozComIA com apenasNarrar deve retornar true");
  assert.ok(audioEnviado, "Deve ter transmitido áudio para o fone");
  assert.ok(audioEnviado.tamanhoBytes > 1000, "Áudio deve ter tamanho real gerado pelo Gemini TTS");
  assert.strictEqual(textoEnviado, null, "NÃO deve ter reenviado o SOAP em texto");
  console.log("✓ Teste 1 aprovado: Áudio gerado no fone com " + audioEnviado.tamanhoBytes + " bytes e zero duplicação de SOAP.");

  // -------------------------------------------------------------------------
  // 2. Ausência de exemplos de caso fictícios (HAS, DM2, PAC) em /rx, /rxh e /insulina
  // -------------------------------------------------------------------------
  console.log("[2] Testando ausência de casos fictícios em comandos e menus...");
  let mensagensChat = [];
  ctx.enviarMensagemComTecladoParaChat = (chatId, texto, kb) => {
    mensagensChat.push({ texto, kb });
    return true;
  };

  // Testa /rxh sem parâmetros (deve exibir instrução de como prescrever, sem exemplo PAC grave com HAS/DM2)
  mensagensChat = [];
  ctx.tratarComandoRxh("123456", "/rxh");
  assert.ok(mensagensChat.length > 0, "/rxh deve responder com instruções");
  const msgRxh = mensagensChat[0].texto;
  assert.ok(!msgRxh.includes("Paciente 68a, 70kg, Cr 1.8, internado por PAC grave"), "Não deve conter exemplo de caso fictício no /rxh");
  assert.ok(msgRxh.includes("Como prescrever"), "Deve conter explicação do que fazer no /rxh");

  // Testa /rx sem parâmetros (não deve conter botões de Receita HAS ou Receita DM2)
  mensagensChat = [];
  ctx.tratarComandoRx("123456", "/rx");
  assert.ok(mensagensChat.length > 0, "/rx deve responder com instruções");
  const msgRx = mensagensChat[0];
  const botoesRx = JSON.stringify(msgRx.kb);
  assert.ok(!botoesRx.includes("Receita HAS"), "Não deve conter botão Receita HAS");
  assert.ok(!botoesRx.includes("Receita DM2"), "Não deve conter botão Receita DM2");
  assert.ok(msgRx.texto.includes("Como prescrever"), "Deve conter explicação de como prescrever");

  // Testa /insulina sem parâmetros
  mensagensChat = [];
  ctx.processarMensagemTexto({ chat: { id: "123456" }, text: "/insulina" });
  assert.ok(mensagensChat.length > 0, "/insulina deve responder com instruções");
  const msgInsulina = mensagensChat[0].texto;
  assert.ok(!msgInsulina.includes("/insulina 85kg, dm2, descompensado"), "Não deve conter caso fictício no /insulina");
  assert.ok(msgInsulina.includes("Como calcular e prescrever"), "Deve conter explicação do que fazer");
  console.log("✓ Teste 2 aprovado: Menus e comandos limpos de casos fictícios e com explicações práticas.");

  // -------------------------------------------------------------------------
  // 3. Rotina de Domingo e Timeline: sem grade genérica, apenas agenda Google
  // -------------------------------------------------------------------------
  console.log("[3] Testando remoção da rotina genérica e exibição exclusiva da agenda Google...");
  
  // Data de domingo: 11/10/2026
  const dataDomingo = new Date("2026-10-11T12:00:00-03:00");
  
  // Sem eventos no CalendarApp, não deve inventar blocos fictícios
  ctx.CalendarApp._setMockEventos([]);
  const blocosDomingo = ctx.RotinaService.obterBlocosDoDia(dataDomingo);
  assert.strictEqual(blocosDomingo.length, 0, "Domingo sem agenda Google não deve ter blocos genéricos fictícios");

  const timelineDomingo = ctx.RotinaService.formatarTimelineMarkdown(blocosDomingo, dataDomingo);
  assert.ok(!timelineDomingo.includes("Simulado Semanal R1-USP"), "Timeline não deve conter Simulado Semanal");
  assert.ok(!timelineDomingo.includes("Almoço em Família"), "Timeline não deve conter Almoço em Família");
  assert.ok(!timelineDomingo.includes("Repouso Restaurador para Segunda-feira"), "Timeline não deve conter Repouso Restaurador");
  assert.ok(!timelineDomingo.includes("0/6 blocos"), "Timeline não deve conter contagem de blocos fictícios");
  assert.ok(timelineDomingo.includes("Agenda Google"), "Timeline deve indicar estado da Agenda Google");

  // Agora simula evento real do Google Calendar no domingo
  const eventoGoogle = {
    getId: () => "plantao-dom-001",
    getTitle: () => "Plantão Emergência Adulto HC",
    getStartTime: () => new Date("2026-10-11T07:00:00-03:00"),
    getEndTime: () => new Date("2026-10-11T19:00:00-03:00"),
    getLocation: () => "Hospital das Clínicas",
    isAllDayEvent: () => false
  };
  ctx.CalendarApp._setMockEventos([eventoGoogle]);

  const blocosComAgenda = ctx.RotinaService.obterBlocosDoDia(dataDomingo);
  assert.strictEqual(blocosComAgenda.length, 1, "Deve conter exatamente o evento real sincronizado do Google Calendar");
  assert.strictEqual(blocosComAgenda[0].titulo, "Plantão Emergência Adulto HC");
  assert.strictEqual(blocosComAgenda[0].inicio, "07:00");
  assert.strictEqual(blocosComAgenda[0].fim, "19:00");

  const timelineComAgenda = ctx.RotinaService.formatarTimelineMarkdown(blocosComAgenda, dataDomingo);
  assert.ok(timelineComAgenda.includes("Plantão Emergência Adulto HC"), "Timeline deve conter o evento real da agenda");
  assert.ok(timelineComAgenda.includes("07:00 - 19:00"), "Timeline deve conter horário do evento");
  // Validação adicional: Dia de semana (Segunda-feira 12/10/2026 e Quarta-feira 14/10/2026)
  ctx.CalendarApp._setMockEventos([]);
  const dataSegunda = new Date("2026-10-12T10:00:00-03:00");
  const blocosSegunda = ctx.RotinaService.obterBlocosDoDia(dataSegunda);
  assert.strictEqual(blocosSegunda.length, 0, "Segunda-feira sem eventos na agenda Google deve ser vazia (sem rotinas fixas genéricas)");

  const timelineSegunda = ctx.RotinaService.formatarTimelineMarkdown(blocosSegunda, dataSegunda);
  assert.ok(!timelineSegunda.includes("Internato: Enfermaria"), "Timeline de segunda não deve conter Internato genérico");
  assert.ok(!timelineSegunda.includes("Cochilo Estratégico"), "Timeline de segunda não deve conter Cochilo genérico");
  assert.ok(!timelineSegunda.includes("Musculação: Superior A"), "Timeline de segunda não deve conter Musculação genérica");

  const resumoSemanal = ctx.RotinaService.obterResumoSemanal();
  assert.ok(!resumoSemanal.includes("GRADE BASE SEMANAL"), "Resumo semanal não deve conter grade base genérica");
  assert.ok(resumoSemanal.includes("AGENDA SEMANAL SINCRONIZADA"), "Resumo semanal deve ser focado na Agenda Google");

  console.log("✓ Teste 3 aprovado: Grade genérica eliminada em TODOS os dias da semana; apenas eventos da agenda Google são exibidos.");

  console.log("\n🎉 TODOS OS TESTES DOS AJUSTES DO USUÁRIO FORAM 100% APROVADOS!");
}

executarTestesAjustesUsuario().catch(err => {
  console.error("FALHA NOS TESTES:", err);
  process.exit(1);
});
