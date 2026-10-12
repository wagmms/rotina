/**
 * ==============================================================================
 * SCRIPT DE REPRODUÇÃO AUTOMATIZADO · ULTRA ROTINA (BUG REPRO-GENERATOR)
 * ==============================================================================
 * Issue ID:   ISSUE-296
 * Categoria:  🚨 VAZAMENTO TÉCNICO
 * Alvo:       Fita de Gasometria Arterial (pH 7.21 / AG 27)
 * Descrição:  Mensagem contém termo técnico suspeito ('nan') exibido ao usuário.
 * Gerado em:  2026-10-12T11:05:38.423395
 *
 * Como executar este teste isolado:
 *   node tests/repros/repro_issue_296_fita_de_gasometria_art.cjs
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');
const runtime = require('../../server/runtime.js');

async function executarReproducao() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 TESTE DE REPRODUÇÃO: ISSUE-296 (🚨 VAZAMENTO TÉCNICO)');
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
  console.log('👉 [DISPARO] Enviando imagem de exame clínico com caption: "Interpretação socrática de gasometria"');
  if (typeof ctx.processarMensagemFoto === 'function') {
    ctx.processarMensagemFoto({
      message_id: 1,
      chat: { id: chatId },
      from: { id: chatId, first_name: 'Dr. Testador (Repro)' },
      photo: [{ file_id: 'mock_repro_photo', width: 700, height: 240 }],
      caption: 'Interpretação socrática de gasometria'
    });
  } else {
    ctx.processarMensagemTexto({
      message_id: 1,
      chat: { id: chatId },
      from: { id: chatId, first_name: 'Dr. Testador (Repro)' },
      text: 'Fita de Gasometria Arterial (pH 7.21 / AG 27)'
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
  // Validação: a resposta NÃO pode vazar termos técnicos como 'undefined' ou 'NaN'
  const termosVazamento = ['undefined', 'nan', '[object object]', 'referenceerror', 'typeerror'];
  for (const termo of termosVazamento) {
    if (textoResposta.toLowerCase().includes(termo)) {
      throw new Error(`VAZAMENTO DETECTADO: A resposta contém '${termo}':\n"${textoResposta.substring(0, 300)}..."`);
    }
  }
  console.log('  ✓ Nenhuma variável undefined ou termo técnico encontrado.');

  console.log('\n🎉 [SUCESSO]: O comportamento esperado foi verificado e o bug NÃO ocorreu (ou foi corrigido)!\n');
}

executarReproducao().catch(err => {
  console.error('\n💥 [BUG CONFIRMADO NA REPRODUÇÃO]:');
  console.error(err.message);
  console.error('\n💡 O script reproduziu a falha com sucesso. Corrija o código-fonte e rode novamente este teste.\n');
  process.exit(1);
});
