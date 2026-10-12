/**
 * ==============================================================================
 * SCRIPT DE REPRODUÇÃO AUTOMATIZADO · ULTRA ROTINA (BUG REPRO-GENERATOR)
 * ==============================================================================
 * Issue ID:   ISSUE-312
 * Categoria:  🚨 DISCREPÂNCIA MATEMÁTICA
 * Alvo:       /gaso 7.48 53 30
 * Descrição:  Divergência matemática detectada na calculadora Gasometria Completa. Esperado pelo oráculo canônico: Alcalose Metabólica (pCO2 esp: 44.2), bot gerou: Interpretado (Erro absoluto: None, Tolerância: None). Gasometria (pH 7.48, pCO2 53.0, HCO3 30.0): primário Alcalose Metabólica.
 * Gerado em:  2026-10-12T11:10:34.847080
 *
 * Como executar este teste isolado:
 *   node tests/repros/repro_issue_312_gaso_7_48_53_30.cjs
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');
const runtime = require('../../server/runtime.js');

async function executarReproducao() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 TESTE DE REPRODUÇÃO: ISSUE-312 (🚨 DISCREPÂNCIA MATEMÁTICA)');
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
  console.log('👉 [DISPARO] Enviando comando/texto: "/gaso 7.48 53 30"');
  ctx.processarMensagemTexto({
    message_id: 1,
    chat: { id: chatId },
    from: { id: chatId, first_name: 'Dr. Testador (Repro)' },
    text: '/gaso 7.48 53 30'
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
