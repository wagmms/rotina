/**
 * ==============================================================================
 * SCRIPT DE REPRODUÇÃO AUTOMATIZADO · ULTRA ROTINA (BUG REPRO-GENERATOR)
 * ==============================================================================
 * Issue ID:   ISSUE-020
 * Categoria:  🚨 BUG CRÍTICO
 * Alvo:       🎧 Ouvir no Fone
 * Descrição:  Falha ao processar ação '🎧 Ouvir no Fone'. O bot não respondeu ou gerou erro: Sem resposta
 * Gerado em:  2026-10-12T11:45:48.326105
 *
 * Como executar este teste isolado:
 *   node tests/repros/repro_issue_020_ouvir_no_fone.cjs
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');
const runtime = require('../../server/runtime.js');

async function executarReproducao() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 TESTE DE REPRODUÇÃO: ISSUE-020 (🚨 BUG CRÍTICO)');
  console.log('='.repeat(70));

  const ctx = runtime.ctx;
  const chatId = '123456789';

  // Configura ambiente e permissões do titular
  if (typeof ctx.ehUsuarioTitular === 'function') {
    ctx.ehUsuarioTitular = () => true;
  }

  let mensagensEnviadas = [];
  let callbacksRespondidos = [];

  // Mocks dos despachadores Telegram
  ctx.enviarMensagemParaChat = (id, texto) => {
    mensagensEnviadas.push({ tipo: 'texto', id, texto: String(texto || '') });
    return true;
  };

  ctx.enviarMensagemComTecladoParaChat = (id, texto, kb) => {
    mensagensEnviadas.push({ tipo: 'teclado', id, texto: String(texto || ''), kb });
    return true;
  };

  ctx.enviarTelaBot = (id, texto, kb, msgId) => {
    mensagensEnviadas.push({ tipo: 'tela', id, texto: String(texto || ''), kb, msgId });
    return true;
  };

  ctx.responderCallbackTelegram = (cbId, texto) => {
    callbacksRespondidos.push({ id: cbId, texto: String(texto || '') });
    return true;
  };

  ctx.executarPostTelegram = (url, payload) => {
    if (payload && payload.text) {
      mensagensEnviadas.push({ tipo: 'edit', id: payload.chat_id, texto: String(payload.text), kb: payload.reply_markup });
    }
    return true;
  };

  // 1. Simula clique de botão inline no Telegram
  console.log('👉 [DISPARO] Clicando no botão inline com callback: "ouvirPreceptor_14cee806edc24257ad1b967f96025f99"');
  ctx.processarCallbackBotao({
    id: 'cb_repro_test',
    from: { id: chatId, first_name: 'Dr. Testador (Repro)' },
    message: { chat: { id: chatId }, message_id: 100 },
    data: 'ouvirPreceptor_14cee806edc24257ad1b967f96025f99'
  });

  // 2. Valida se o bot gerou alguma resposta
  assert.ok(mensagensEnviadas.length > 0, 'O bot deve responder à interação.');
  const msg = mensagensEnviadas[0];
  const textoResposta = msg.texto || '';

  console.log('\n📋 [RESPOSTA RECEBIDA DO BOT]:');
  console.log('----------------------------------------------------------------------');
  console.log(textoResposta.length > 400 ? textoResposta.substring(0, 400) + '\n[... truncado ...]' : textoResposta);
  console.log('----------------------------------------------------------------------\n');

  console.log('🔍 [AUDITORIA DA REPRODUÇÃO]:');
  // Validação geral de resposta e integridade
  if (!mensagensEnviadas || mensagensEnviadas.length === 0) {
    throw new Error('FALHA DE PROCESSAMENTO: Nenhuma mensagem retornada pelo bot.');
  }
  console.log('  ✓ Resposta recebida e processada com sucesso.');

  console.log('\n🎉 [SUCESSO]: O comportamento esperado foi verificado e o bug NÃO ocorreu (ou foi corrigido)!\n');
}

executarReproducao().catch(err => {
  console.error('\n💥 [BUG CONFIRMADO NA REPRODUÇÃO]:');
  console.error(err.message);
  console.error('\n💡 O script reproduziu a falha com sucesso. Corrija o código-fonte e rode novamente este teste.\n');
  process.exit(1);
});
