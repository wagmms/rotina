/**
 * Testes Automatizados para a Consulta de Últimas Mudanças e Deploy no Wagner Rotina Bot.
 * Valida:
 * 1. Comando /mudancas e /deploy retornam status do último deploy e commits.
 * 2. Linguagem natural ("quais as últimas mudanças feitas", "o que mudou") é interceptada com sucesso.
 */
const assert = require('assert');
const runtime = require('../server/runtime.js');

async function testMudancas() {
  console.log('=== TESTE: COMANDO DE MUDANÇAS & CONSULTA DE DEPLOY ===\n');
  const ctx = runtime.ctx;
  const chatId = '123456789';

  let mensagensEnviadas = [];
  ctx.enviarMensagemParaChat = (id, texto) => {
    mensagensEnviadas.push({ tipo: 'texto', id, texto });
    return true;
  };
  ctx.enviarMensagemComTecladoParaChat = (id, texto, kb) => {
    mensagensEnviadas.push({ tipo: 'teclado', id, texto, kb });
    return true;
  };

  // Teste 1: Comando /mudancas
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/mudancas' });
  assert.ok(mensagensEnviadas.length > 0, 'Comando /mudancas deve enviar resposta');
  let texto1 = mensagensEnviadas[0].texto;
  assert.ok(texto1.includes('ULTRA ROTINA'), 'Resposta deve conter título do Ultra Rotina');
  assert.ok(texto1.includes('Último Deploy') || texto1.includes('Deploy'), 'Resposta deve conter seção de deploy');

  // Teste 2: Pergunta em Linguagem Natural: "quais as últimas mudanças feitas"
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: 'quais as últimas mudanças feitas' });
  assert.ok(mensagensEnviadas.length > 0, 'Pergunta coloquial deve ser interceptada');
  let texto2 = mensagensEnviadas[0].texto;
  assert.ok(texto2.includes('ULTRA ROTINA'), 'Resposta deve ser o relatório de mudanças');

  // Teste 3: Pergunta coloquial curta: "o que mudou"
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: 'o que mudou' });
  assert.ok(mensagensEnviadas.length > 0, '"o que mudou" deve ser interceptado');
  let texto3 = mensagensEnviadas[0].texto;
  assert.ok(texto3.includes('ULTRA ROTINA'), 'Resposta deve ser o relatório de mudanças');

  // Teste 4: Comando /deploy
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/deploy' });
  assert.ok(mensagensEnviadas.length > 0, 'Comando /deploy deve enviar resposta');
  let texto4 = mensagensEnviadas[0].texto;
  assert.ok(texto4.includes('Deploy'), 'Resposta deve conter informações de deploy');

  console.log('✅ Todos os 4 testes de consulta de mudanças passaram com sucesso!');
}

testMudancas().catch(err => {
  console.error('❌ Falha nos testes de mudanças:', err);
  process.exit(1);
});
