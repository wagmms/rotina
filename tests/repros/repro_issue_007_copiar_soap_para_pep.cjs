/**
 * ==============================================================================
 * SCRIPT DE REPRODUÇÃO AUTOMATIZADO · ULTRA ROTINA (BUG REPRO-GENERATOR)
 * ==============================================================================
 * Issue ID:   ISSUE-007
 * Categoria:  ⚠️ UX DEAD-END
 * Alvo:       📋 Copiar SOAP para PEP
 * Descrição:  Tela gerada por '📋 Copiar SOAP para PEP' não possui teclado inline nem instruções de como voltar ou avançar.
 * Gerado em:  2026-10-12T00:18:42.849802
 *
 * Como executar este teste isolado:
 *   node tests/repros/repros/repro.cjs
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');
const runtime = require('../../server/runtime.js');

async function executarReproducao() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 TESTE DE REPRODUÇÃO: ISSUE-007 (⚠️ UX DEAD-END)');
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
  console.log('👉 [DISPARO] Clicando no botão inline com callback: "ux:copiar:4e2f505595004f76a8db5f927a12e9ff"');
  ctx.processarCallbackBotao({
    id: 'cb_repro_test',
    from: { id: chatId, first_name: 'Dr. Testador (Repro)' },
    message: { chat: { id: chatId }, message_id: 100 },
    data: 'ux:copiar:4e2f505595004f76a8db5f927a12e9ff'
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
