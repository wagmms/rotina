/**
 * Teste de Integração: Roteamento de comandos do Sniper e Rotina no Router Principal do Telegram
 */

const assert = require('assert');
const runtime = require('../server/runtime.js');

async function testarRoteamentoSniperNoTelegram() {
  const ctx = runtime.ctx;
  const chatId = '1771571035';

  let mensagensEnviadas = [];
  ctx.enviarMensagemParaChat = (id, texto) => {
    mensagensEnviadas.push({ id, texto: String(texto) });
    return true;
  };
  ctx.enviarMensagemComTecladoParaChat = (id, texto, kb) => {
    mensagensEnviadas.push({ id, texto: String(texto), kb });
    return true;
  };

  function limpar() {
    mensagensEnviadas = [];
  }

  console.log('[1] Testando /sniper via processarMensagemTexto...');
  limpar();
  ctx.processarMensagemTexto({
    chat: { id: chatId },
    from: { id: chatId },
    text: '/sniper'
  });
  assert.ok(mensagensEnviadas.length > 0, 'Deve enviar mensagem');
  assert.ok(!mensagensEnviadas[0].texto.includes('Comando não reconhecido'), 'Não pode ser comando não reconhecido');
  assert.ok(mensagensEnviadas[0].texto.includes('SNIPER DE PLANTÕES'), 'Deve abrir o painel do Sniper');

  console.log('[2] Testando comando sem barra "sniper"...');
  limpar();
  ctx.processarMensagemTexto({
    chat: { id: chatId },
    from: { id: chatId },
    text: 'sniper'
  });
  assert.ok(mensagensEnviadas.length > 0, 'Deve enviar mensagem');
  assert.ok(!mensagensEnviadas[0].texto.includes('Comando não reconhecido'), 'Não pode ser comando não reconhecido');
  assert.ok(mensagensEnviadas[0].texto.includes('SNIPER DE PLANTÕES'), 'Deve abrir o painel do Sniper');

  console.log('[3] Testando /piso 1500 via processarMensagemTexto...');
  limpar();
  ctx.processarMensagemTexto({
    chat: { id: chatId },
    from: { id: chatId },
    text: '/piso 1500'
  });
  assert.ok(mensagensEnviadas.length > 0, 'Deve enviar mensagem');
  assert.ok(!mensagensEnviadas[0].texto.includes('Comando não reconhecido'), 'Não pode ser comando não reconhecido');
  assert.ok(mensagensEnviadas[0].texto.includes('PISO') || mensagensEnviadas[0].texto.includes('1500'), 'Deve registrar o novo piso');

  console.log('[4] Testando comando sem barra "ctg"...');
  limpar();
  ctx.processarMensagemTexto({
    chat: { id: chatId },
    from: { id: chatId },
    text: 'ctg'
  });
  assert.ok(mensagensEnviadas.length > 0, 'Deve enviar mensagem');
  assert.ok(!mensagensEnviadas[0].texto.includes('Comando não reconhecido'), 'Não pode ser comando não reconhecido');
  assert.ok(mensagensEnviadas[0].texto.includes('CARDIOTOCOGRAFIA INTRAPARTO'), 'Deve exibir o guia de CTG');

  console.log('✅ Roteador Principal do Telegram validado com 100% de sucesso!');
}

testarRoteamentoSniperNoTelegram().catch(err => {
  console.error('❌ Falha:', err);
  process.exit(1);
});
