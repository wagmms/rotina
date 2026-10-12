/**
 * ==============================================================================
 * SCRIPT DE REPRODUÇÃO AUTOMATIZADO · ULTRA ROTINA (BUG REPRO-GENERATOR)
 * ==============================================================================
 * Issue ID:   ISSUE-335
 * Categoria:  ⚠️ UX DEAD-END
 * Alvo:       /ped prednisolona 11
 * Descrição:  Tela gerada por '/ped prednisolona 11' não possui teclado inline nem instruções de como voltar ou avançar.
 * Gerado em:  2026-10-12T11:17:06.326042
 *
 * Como executar este teste isolado:
 *   node tests/repros/repro_issue_335_ped_prednisolona_11.cjs
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');
const runtime = require('../../server/runtime.js');

async function executarReproducao() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 TESTE DE REPRODUÇÃO: ISSUE-335 (⚠️ UX DEAD-END)');
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

  // 1. Simula envio de comando de texto ou fuzzing
  console.log('👉 [DISPARO] Enviando comando/texto: "/ped prednisolona 11"');
  ctx.processarMensagemTexto({
    message_id: 1,
    chat: { id: chatId },
    from: { id: chatId, first_name: 'Dr. Testador (Repro)' },
    text: '/ped prednisolona 11'
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
  // Validação: a tela deve possuir teclado inline ou instrução explícita de retorno
  const temTeclado = (msg.kb && msg.kb.inline_keyboard && msg.kb.inline_keyboard.length > 0);
  const temDicaRetorno = /voltar|menu|início|ajuda|\/menu|\/novo/i.test(textoResposta);
  if (!temTeclado && !temDicaRetorno) {
    throw new Error(`DEAD-END DETECTADO: Tela sem teclado inline e sem instruções de como retornar.`);
  }
  console.log('  ✓ Navegabilidade garantida (teclado inline ou dicas presentes).');

  console.log('\n🎉 [SUCESSO]: O comportamento esperado foi verificado e o bug NÃO ocorreu (ou foi corrigido)!\n');
}

executarReproducao().catch(err => {
  console.error('\n💥 [BUG CONFIRMADO NA REPRODUÇÃO]:');
  console.error(err.message);
  console.error('\n💡 O script reproduziu a falha com sucesso. Corrija o código-fonte e rode novamente este teste.\n');
  process.exit(1);
});
