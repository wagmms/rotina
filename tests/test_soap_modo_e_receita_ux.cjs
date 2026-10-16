/**
 * ==============================================================================
 * TESTE DE AUDITORIA E OTIMIZAÇÃO: MODO SOAP & PRESCRIÇÃO AMBULATORIAL ÁGIL
 * ==============================================================================
 * Validação exaustiva dos critérios de aceite da tarefa:
 * 1. Inicialização do Modo SOAP (iniciarModoBot modo 'soap') com atalhos rápidos e retorno contextual
 * 2. processarEntradaSoap e formatarRascunhoSoapTelegram com EF normal estruturado por aparelho
 * 3. Botão primário [📋 Copiar SOAP para PEP] em largura total em Fase 1 e Fase 2
 * 4. Navegação contextual obrigatória: [🔙 Ambulatório] e [🏠 Início] em Fase 1 e Fase 2
 * 5. Transição de Fase 1 para Fase 2 via [ux:soap:plano] sem perda de contexto
 * 6. Inserção de EF normal via [ux:soap:ef_normal], confirmação e cancelamento sem telas órfãs
 * 7. Botão [ux:soap:atualizar] com teclado completo e zero telas órfãs
 * 8. Comandos /soap e /receita com resiliência, exemplos e retorno contextual
 * ==============================================================================
 */

'use strict';

process.env.NODE_ENV = 'test';
const assert = require('assert');
const path = require('path');
const runtime = require(path.join(__dirname, '..', 'server', 'runtime.js'));

async function testSoapModoEReceitaUX() {
  console.log('=== TESTE DE AUDITORIA E OTIMIZAÇÃO: MODO SOAP & PRESCRIÇÃO AMBULATORIAL ===\n');

  const ctx = runtime.ctx;
  const chatId = ctx.ConfigService ? (ctx.ConfigService.get('TELEGRAM_CHAT_ID') || '1771571035') : '1771571035';

  // Mock determinístico 0ms para IA durante os testes de UI/UX
  ctx.gerarSOAPComIA = (caso, opts) => {
    return ctx.formatarRascunhoSoapTelegram(caso, opts);
  };
  ctx.gerarPrescricaoComIA = (dados) => {
    return "💊 *PRESCRIÇÃO AMBULATORIAL (REMUME SUS)*\n\n1) Losartana 50mg VO 12/12h\n2) Hidroclorotiazida 25mg VO 1x/dia";
  };

  let mensagensEnviadas = [];
  ctx.enviarMensagemParaChat = (id, texto) => {
    mensagensEnviadas.push({ metodo: 'enviarMensagemParaChat', id, texto });
  };
  ctx.enviarMensagemComTecladoParaChat = (id, texto, kb) => {
    mensagensEnviadas.push({ metodo: 'enviarMensagemComTecladoParaChat', id, texto, kb });
  };
  ctx.responderCallbackTelegram = (cbId, texto) => {
    mensagensEnviadas.push({ metodo: 'responderCallbackTelegram', cbId, texto });
  };
  ctx.executarPostTelegram = (url, payload) => {
    if (payload && payload.text) {
      mensagensEnviadas.push({
        metodo: 'executarPostTelegram',
        id: payload.chat_id,
        texto: payload.text,
        kb: payload.reply_markup
      });
    }
    return true;
  };
  ctx.UrlFetchApp = {
    fetch: () => ({
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({ ok: true, result: { message_id: 12345 } })
    })
  };

  // Helper para acionar callback
  function acionarCallback(callbackData, messageId = 9999) {
    mensagensEnviadas = [];
    ctx.processarCallbackBotao({
      id: 'cb_' + String(callbackData).replace(/[^a-zA-Z0-9]/g, '_'),
      data: callbackData,
      message: { chat: { id: chatId }, message_id: messageId }
    });
    return mensagensEnviadas;
  }

  // Helper para enviar mensagem de texto
  function enviarTextoComando(textoComando) {
    mensagensEnviadas = [];
    ctx.processarMensagemTexto({
      chat: { id: chatId },
      text: textoComando
    });
    return mensagensEnviadas;
  }

  // ---------------------------------------------------------------------------
  // [1] TESTE DO MODO SOAP INICIAL (iniciarModoBot modo 'soap')
  // ---------------------------------------------------------------------------
  console.log('[1] Testando iniciarModoBot no modo soap...');
  mensagensEnviadas = [];
  ctx.iniciarModoBot(chatId, 'soap', true);
  assert(mensagensEnviadas.length > 0, 'Deve ter enviado mensagem ao iniciar modo SOAP');
  const msgInicio = mensagensEnviadas[mensagensEnviadas.length - 1];
  assert(msgInicio.texto.includes('SOAP') && msgInicio.texto.includes('Novo Caso'), 'Texto deve indicar Novo Caso SOAP');
  
  // Validar botões da tela inicial: deve ter interface limpa e retorno contextual
  const botoesInicio = msgInicio.kb.inline_keyboard;
  const callbacksInicio = botoesInicio.flat().map(b => b.callback_data);
  assert(callbacksInicio.includes('ux:hub:amb'), 'Deve conter retorno contextual [🔙 Ambulatório]');
  assert(callbacksInicio.includes('ux:hub:inicio'), 'Deve conter retorno contextual [🏠 Início]');
  console.log('  ✓ IniciarModoBot no modo SOAP validado com foco em captura e retorno contextual.');

  // ---------------------------------------------------------------------------
  // [2] TESTE DE formatarRascunhoSoapTelegram E obterModeloExameFisicoCompleto
  // ---------------------------------------------------------------------------
  console.log('\n[2] Testando formatarRascunhoSoapTelegram e inserção determinística de EF normal...');
  const efNormal = ctx.obterModeloExameFisicoCompleto('Paciente com PA 130/80 mmHg, FC 74 bpm');
  assert(efNormal.includes('PA: 130/80 mmHg'), 'Deve extrair PA informada');
  assert(efNormal.includes('FC: 74 bpm'), 'Deve extrair FC informada');
  assert(efNormal.includes('ACV:') && efNormal.includes('AR:') && efNormal.includes('Abdome:') && efNormal.includes('Extremidades:'),
    'EF normal deve cobrir todos os aparelhos sistematicamente');

  // Validação de idempotência de formatarExameFisicoSistemas (sem "Geral: Geral:")
  let efRepetido = efNormal;
  for (let step = 0; step < 3; step++) {
    efRepetido = ctx.formatarExameFisicoSistemas(efRepetido);
  }
  assert(!efRepetido.includes('Geral: Geral:'), 'formatarExameFisicoSistemas não deve duplicar o prefixo Geral:');

  const rascunhoFase1 = ctx.formatarRascunhoSoapTelegram('Homem 52a, tosse e febre há 3 dias', { fecharPlano: false });
  assert(rascunhoFase1.includes('S - Subjetivo') && rascunhoFase1.includes('O - Objetivo'), 'Fase 1 deve conter S e O');
  assert(!rascunhoFase1.includes('🧠 *A - Avaliação*'), 'Fase 1 NÃO deve conter Avaliação prematura');
  assert(!rascunhoFase1.includes('📋 *P - Plano*'), 'Fase 1 NÃO deve conter Plano prematuro');

  // Validação de caso com EF anexado: EF deve pertencer a O e não vazar em S
  const casoComEf = 'Homem 52a, tosse e febre há 3 dias\n\n' + efNormal;
  const rascunhoComEf = ctx.formatarRascunhoSoapTelegram(casoComEf, { fecharPlano: false });
  const partesRasc = rascunhoComEf.split('🔍 *O - Objetivo');
  const subExtraido = partesRasc[0];
  const objExtraido = partesRasc[1];
  assert(!subExtraido.includes('ACV:') && !subExtraido.includes('AR:'), 'Subjetivo NÃO deve conter sistemas do Exame Físico');
  assert(objExtraido.includes('ACV:') && objExtraido.includes('AR:'), 'Objetivo DEVE conter sistemas do Exame Físico');

  const rascunhoFase2 = ctx.formatarRascunhoSoapTelegram('Homem 52a, tosse e febre há 3 dias', { fecharPlano: true });
  assert(rascunhoFase2.includes('S - Subjetivo'), 'Fase 2 deve conter Subjetivo');
  assert(rascunhoFase2.includes('O - Objetivo'), 'Fase 2 deve conter Objetivo');
  assert(rascunhoFase2.includes('A - Avaliação'), 'Fase 2 deve conter Avaliação');
  assert(rascunhoFase2.includes('P - Plano'), 'Fase 2 deve conter Plano');
  console.log('  ✓ formatarExameFisicoSistemas idempotente e isolamento de EF entre S e O validado.');

  // ---------------------------------------------------------------------------
  // [3] TESTE DO BOTÃO PRIMÁRIO E NAVEGAÇÃO CONTEXTUAL NO PROCESSAR E ENTREGAR
  // ---------------------------------------------------------------------------
  console.log('\n[3] Testando botões [📋 Copiar SOAP para PEP], retorno contextual e Fase 1 vs 2...');
  
  // Teste Fase 1
  mensagensEnviadas = [];
  const soapFase1Mock = "🩺 *SÍNTESE SOAP · ATENDIMENTO CLÍNICO*\n\n👤 *S - Subjetivo*\nPaciente com epigastralgia.\n\n🔍 *O - Objetivo*\nAbdome indolor.";
  ctx.processarEEntregarIA(chatId, () => soapFase1Mock, "Paciente com epigastralgia", "soap");
  assert(mensagensEnviadas.length > 0, 'Deve ter gerado resposta de SOAP Fase 1');
  const telaFase1 = mensagensEnviadas[mensagensEnviadas.length - 1];
  const botoesFase1 = telaFase1.kb.inline_keyboard;
  
  // 1. Botão primário de cópia
  const btnCopiarFase1 = botoesFase1[0][0];
  assert(btnCopiarFase1.text.includes('Copiar SOAP para PEP'), 'Botão primário deve ser [📋 Copiar SOAP para PEP]');
  
  // 2. Botões da Fase 1
  const callbacksFase1 = botoesFase1.flat().map(b => b.callback_data).filter(Boolean);
  assert(callbacksFase1.some(c => c.startsWith('ux:soap:plano')), 'Fase 1 deve conter botão Fechar Plano');
  assert(callbacksFase1.some(c => c.startsWith('ux:soap:ef_normal')), 'Fase 1 deve conter botão EF Normal');
  assert(callbacksFase1.includes('ux:hub:amb'), 'Fase 1 DEVE conter retorno contextual [🔙 Ambulatório]');
  assert(callbacksFase1.includes('ux:hub:inicio'), 'Fase 1 DEVE conter retorno contextual [🏠 Início]');

  // Teste Fase 2
  mensagensEnviadas = [];
  const soapFase2Mock = "🩺 *SÍNTESE SOAP · REGISTRO CONSOLIDADO*\n\n👤 *S - Subjetivo*\nPaciente com epigastralgia.\n\n🔍 *O - Objetivo*\nAbdome indolor.\n\n🧠 *A - Avaliação*\nDispepsia.\n\n📋 *P - Plano*\nOmeprazol 20mg.";
  ctx.processarEEntregarIA(chatId, () => soapFase2Mock, "Paciente com epigastralgia", "soap");
  assert(mensagensEnviadas.length > 0, 'Deve ter gerado resposta de SOAP Fase 2');
  const telaFase2 = mensagensEnviadas[mensagensEnviadas.length - 1];
  const botoesFase2 = telaFase2.kb.inline_keyboard;
  
  const btnCopiarFase2 = botoesFase2[0][0];
  assert(btnCopiarFase2.text.includes('Copiar SOAP para PEP'), 'Fase 2 também deve ter [📋 Copiar SOAP para PEP]');
  
  const callbacksFase2 = botoesFase2.flat().map(b => b.callback_data).filter(Boolean);
  assert(callbacksFase2.some(c => c.startsWith('ux:soap:extrair_rx')), 'Fase 2 deve conter Extrair Receita');
  assert(callbacksFase2.some(c => c.startsWith('ux:soap:atualizar')), 'Fase 2 deve conter Refinar Conduta / Atualizar');
  assert(callbacksFase2.includes('ux:hub:amb'), 'Fase 2 DEVE conter retorno contextual [🔙 Ambulatório]');
  assert(callbacksFase2.includes('ux:hub:inicio'), 'Fase 2 DEVE conter retorno contextual [🏠 Início]');
  console.log('  ✓ Botão de cópia para PEP e navegação contextual [🔙 Ambulatório] e [🏠 Início] validados em ambas as fases.');

  // ---------------------------------------------------------------------------
  // [4] TESTE DE TRANSIÇÃO FASE 1 -> FASE 2 (ux:soap:plano) SEM PERDA DE CONTEXTO
  // ---------------------------------------------------------------------------
  console.log('\n[4] Testando callback ux:soap:plano...');
  ctx.definirModoBot(chatId, 'soap', 'Mulher 45a, cefaleia e PA 150/95');
  const revPlano = ctx.modoBot(chatId).revision;
  const msgsPlano = acionarCallback('ux:soap:plano:' + revPlano);
  assert(msgsPlano.length > 0, 'Callback ux:soap:plano deve processar o caso sem erro de versão anterior');
  const telaPosPlano = msgsPlano[msgsPlano.length - 1];
  assert(telaPosPlano.texto.includes('A - Avaliação') || telaPosPlano.texto.includes('P - Plano') || telaPosPlano.texto.includes('Consolidando'),
    'Deve transicionar para consolidar o plano');
  console.log('  ✓ Transição para Fase 2 via ux:soap:plano executada com sucesso.');

  // ---------------------------------------------------------------------------
  // [5] TESTE DE EF NORMAL (ux:soap:ef_normal), CONFIRMAÇÃO E CANCELAMENTO
  // ---------------------------------------------------------------------------
  console.log('\n[5] Testando ux:soap:ef_normal e cancelamento sem telas órfãs...');
  ctx.definirModoBot(chatId, 'soap', 'Homem 60a, tosse seca');
  const revEf = ctx.modoBot(chatId).revision;
  const msgsEf = acionarCallback('ux:soap:ef_normal:' + revEf);
  assert(msgsEf.length > 0, 'Deve ter enviado tela de confirmação de EF');
  const telaConfEf = msgsEf.find(m => m.texto && m.texto.includes('Confirmar exame físico normal'));
  assert(telaConfEf, 'Deve solicitar confirmação de EF normal');
  
  // Extrai o botão de cancelamento dinâmico
  const btnCanc = telaConfEf.kb.inline_keyboard.flat().find(b => b.callback_data && b.callback_data.startsWith('ux:soap:ef_cancelar:'));
  assert(btnCanc, 'Deve possuir botão de cancelar com ID de confirmação');
  const msgsEfCanc = acionarCallback(btnCanc.callback_data);
  assert(msgsEfCanc.length > 0, 'Deve responder ao cancelamento');
  const telaCanc = msgsEfCanc.find(m => m.kb && m.kb.inline_keyboard);
  assert(telaCanc && telaCanc.kb && telaCanc.kb.inline_keyboard, 'Tela de cancelamento deve possuir teclado (sem telas órfãs)');
  const cbCancList = telaCanc.kb.inline_keyboard.flat().map(b => b.callback_data);
  assert(cbCancList.includes('ux:hub:amb'), 'Deve permitir retorno contextual ao Ambulatório após cancelamento');
  assert(cbCancList.includes('ux:hub:inicio'), 'Deve permitir retorno ao Início após cancelamento');
  console.log('  ✓ ux:soap:ef_normal validado com confirmação e cancelamento resiliente sem telas órfãs.');

  // ---------------------------------------------------------------------------
  // [6] TESTE DE BOTÃO REFINAR CONDUTA / ATUALIZAR (ux:soap:atualizar)
  // ---------------------------------------------------------------------------
  console.log('\n[6] Testando ux:soap:atualizar sem telas órfãs...');
  const revAtu = ctx.modoBot(chatId).revision;
  const msgsAtu = acionarCallback('ux:soap:atualizar:' + revAtu);
  assert(msgsAtu.length > 0, 'Deve responder ao botão atualizar');
  const telaAtu = msgsAtu[msgsAtu.length - 1];
  assert(telaAtu.kb && telaAtu.kb.inline_keyboard, 'A tela de atualizar DEVE possuir teclado (sem telas órfãs)');
  const cbAtuList = telaAtu.kb.inline_keyboard.flat().map(b => b.callback_data);
  assert(cbAtuList.includes('ux:hub:amb'), 'Tela de atualizar deve conter retorno contextual [🔙 Ambulatório]');
  assert(cbAtuList.includes('ux:hub:inicio'), 'Tela de atualizar deve conter retorno contextual [🏠 Início]');
  console.log('  ✓ ux:soap:atualizar validado com teclado de retorno contextual e sem telas órfãs.');

  // ---------------------------------------------------------------------------
  // [7] TESTE DE RECEITA AMBULATORIAL E RETORNO CONTEXTUAL (tipoCache === "rx")
  // ---------------------------------------------------------------------------
  console.log('\n[7] Testando retorno contextual na prescrição / receita (rx)...');
  mensagensEnviadas = [];
  const rxMock = "💊 *PRESCRIÇÃO AMBULATORIAL (REMUME)*\n\n1) Losartana 50mg VO 12/12h\n2) Hidroclorotiazida 25mg VO 1x/dia";
  ctx.processarEEntregarIA(chatId, () => rxMock, "Hipertensão", "rx");
  assert(mensagensEnviadas.length > 0, 'Deve ter entregado a receita');
  const telaRx = mensagensEnviadas[mensagensEnviadas.length - 1];
  const botoesRx = telaRx.kb.inline_keyboard;
  const cbRxList = botoesRx.flat().map(b => b.callback_data).filter(Boolean);
  assert(cbRxList.includes('ux:hub:amb'), 'Receita ambulatorial DEVE retornar diretamente para [🔙 Ambulatório]');
  assert(cbRxList.includes('ux:hub:inicio'), 'Receita ambulatorial DEVE conter [🏠 Início]');
  console.log('  ✓ Prescrição / receita retorna diretamente para [🔙 Ambulatório] e [🏠 Início].');

  // ---------------------------------------------------------------------------
  // [8] TESTE DE COMANDO /soap E /receita DO ROTEADOR
  // ---------------------------------------------------------------------------
  console.log('\n[8] Testando comandos de texto /soap e /receita no roteador...');
  const msgsCmdSoap = enviarTextoComando('/soap');
  assert(msgsCmdSoap.length > 0, 'Comando /soap sem argumentos deve responder');
  const telaCmdSoap = msgsCmdSoap[msgsCmdSoap.length - 1];
  assert(telaCmdSoap.kb && telaCmdSoap.kb.inline_keyboard, 'Comando /soap deve entregar teclado com opções de 1 toque');
  const cbCmdSoapList = telaCmdSoap.kb.inline_keyboard.flat().map(b => b.callback_data);
  assert(cbCmdSoapList.includes('ux:hub:amb'), 'Comando /soap deve conter retorno [🔙 Ambulatório]');
  assert(cbCmdSoapList.includes('ux:hub:inicio'), 'Comando /soap deve conter retorno [🏠 Início]');

  const msgsCmdRx = enviarTextoComando('/receita');
  assert(msgsCmdRx.length > 0, 'Comando /receita sem argumentos deve responder');
  const telaCmdRx = msgsCmdRx[msgsCmdRx.length - 1];
  assert(telaCmdRx.kb && telaCmdRx.kb.inline_keyboard, 'Comando /receita deve entregar teclado com kits rápidos');
  const cbCmdRxList = telaCmdRx.kb.inline_keyboard.flat().map(b => b.callback_data);
  assert(cbCmdRxList.includes('ux:hub:amb'), 'Comando /receita deve conter retorno [🔙 Ambulatório]');
  assert(cbCmdRxList.includes('ux:hub:inicio'), 'Comando /receita deve conter retorno [🏠 Início]');
  console.log('  ✓ Comandos /soap e /receita respondem com assertividade e sem telas órfãs.');

  console.log('\n🎉 TODOS OS 8 BLOCOS DE TESTES DO MODO SOAP E RECEITA FORAM APROVADOS COM 100% DE SUCESSO!\n');
}

testSoapModoEReceitaUX().catch(err => {
  console.error('❌ FALHA NO TESTE:', err);
  process.exit(1);
});
