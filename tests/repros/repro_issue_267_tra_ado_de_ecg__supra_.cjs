/**
 * ==============================================================================
 * SCRIPT DE REPRODUÇÃO AUTOMATIZADO · ULTRA ROTINA (BUG REPRO-GENERATOR)
 * ==============================================================================
 * Issue ID:   ISSUE-267
 * Categoria:  ⚠️ FORMATAÇÃO MARKDOWN
 * Alvo:       Traçado de ECG (Supra de ST Inferior)
 * Descrição:  Texto retornado possui número ímpar de asteriscos (*), o que pode quebrar formatação negrito no Telegram.
 * Gerado em:  2026-10-12T10:57:30.844746
 *
 * Como executar este teste isolado:
 *   node tests/repros/repro_issue_267_tra_ado_de_ecg__supra_.cjs
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');
const runtime = require('../../server/runtime.js');

async function executarReproducao() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 TESTE DE REPRODUÇÃO: ISSUE-267 (⚠️ FORMATAÇÃO MARKDOWN)');
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

  // 1. Simula recebimento de imagem/exame
  console.log('👉 [DISPARO] Enviando imagem de exame clínico com caption: "ECG de entrada na Sala Vermelha (dor no peito)"');
  if (typeof ctx.processarMensagemFoto === 'function') {
    ctx.processarMensagemFoto({
      message_id: 1,
      chat: { id: chatId },
      from: { id: chatId, first_name: 'Dr. Testador (Repro)' },
      photo: [{ file_id: 'mock_repro_photo', width: 700, height: 240 }],
      caption: 'ECG de entrada na Sala Vermelha (dor no peito)'
    });
  } else {
    ctx.processarMensagemTexto({
      message_id: 1,
      chat: { id: chatId },
      from: { id: chatId, first_name: 'Dr. Testador (Repro)' },
      text: 'Traçado de ECG (Supra de ST Inferior)'
    });
  }

  // 2. Valida se o bot gerou alguma resposta
  assert.ok(mensagensEnviadas.length > 0, 'O bot deve responder à interação.');
  const msg = mensagensEnviadas[0];
  const textoResposta = msg.texto || '';

  console.log('\n📋 [RESPOSTA RECEBIDA DO BOT]:');
  console.log('----------------------------------------------------------------------');
  console.log(textoResposta.length > 400 ? textoResposta.substring(0, 400) + '\n[... truncado ...]' : textoResposta);
  console.log('----------------------------------------------------------------------\n');

  console.log('🔍 [AUDITORIA DA REPRODUÇÃO]:');
  // Validação: entidades markdown devem estar balanceadas em pares
  const asteriscos = (textoResposta.match(/\*/g) || []).length;
  const crases = (textoResposta.match(/`/g) || []).length;
  if (asteriscos % 2 !== 0) {
    throw new Error(`MARKDOWN QUEBRADO: Quantidade ímpar de asteriscos (*) encontrada (${asteriscos}).`);
  }
  if (crases % 2 !== 0) {
    throw new Error(`MARKDOWN QUEBRADO: Quantidade ímpar de crases ('\`') encontrada (${crases}).`);
  }
  console.log('  ✓ Entidades Markdown balanceadas com sucesso.');

  console.log('\n🎉 [SUCESSO]: O comportamento esperado foi verificado e o bug NÃO ocorreu (ou foi corrigido)!\n');
}

executarReproducao().catch(err => {
  console.error('\n💥 [BUG CONFIRMADO NA REPRODUÇÃO]:');
  console.error(err.message);
  console.error('\n💡 O script reproduziu a falha com sucesso. Corrija o código-fonte e rode novamente este teste.\n');
  process.exit(1);
});
