/**
 * ==============================================================================
 * SCRIPT DE REPRODUÇÃO AUTOMATIZADO · ULTRA ROTINA (BUG REPRO-GENERATOR)
 * ==============================================================================
 * Issue ID:   ISSUE-297
 * Categoria:  🚨 SEGURANÇA CLÍNICA
 * Alvo:       /choqueseptico 95 0.15
 * Descrição:  Calculadora médica retornou dose ou vazão positiva para entrada com valor nulo ou negativo sem exibir alerta de bloqueio.
 * Gerado em:  2026-10-12T12:03:56.651503
 *
 * Como executar este teste isolado:
 *   node tests/repros/repro_issue_297_choqueseptico_95_0_15.cjs
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');
const runtime = require('../../server/runtime.js');

async function executarReproducao() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 TESTE DE REPRODUÇÃO: ISSUE-297 (🚨 SEGURANÇA CLÍNICA)');
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
  console.log('👉 [DISPARO] Enviando comando/texto: "/choqueseptico 95 0.15"');
  ctx.processarMensagemTexto({
    message_id: 1,
    chat: { id: chatId },
    from: { id: chatId, first_name: 'Dr. Testador (Repro)' },
    text: '/choqueseptico 95 0.15'
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
  // Validação: valores zerados ou negativos NÃO podem produzir vazão/dose sem aviso de bloqueio
  const contemDosePositiva = /doses?\s+calculada|ml\/h|\bmg\b/i.test(textoResposta);
  const contemAlertaBloqueio = /inválid|erro|atenção|bloque|positiv|alerta/i.test(textoResposta);
  if (contemDosePositiva && !contemAlertaBloqueio) {
    throw new Error(`FALHA DE SEGURANÇA CLÍNICA: Dose foi calculada sem alerta de bloqueio para valor inválido:\n"${textoResposta.substring(0, 300)}"`);
  }
  console.log('  ✓ Salvaguarda clínica respeitada (bloqueio ou alerta exibido).');

  console.log('\n🎉 [SUCESSO]: O comportamento esperado foi verificado e o bug NÃO ocorreu (ou foi corrigido)!\n');
}

executarReproducao().catch(err => {
  console.error('\n💥 [BUG CONFIRMADO NA REPRODUÇÃO]:');
  console.error(err.message);
  console.error('\n💡 O script reproduziu a falha com sucesso. Corrija o código-fonte e rode novamente este teste.\n');
  process.exit(1);
});
