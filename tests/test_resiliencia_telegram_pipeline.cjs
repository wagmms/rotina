const assert = require('assert');
const { buildServer } = require('../server/index.js');
const runtime = require('../server/runtime.js');

async function testResilienciaTelegramPipeline() {
  console.log('=== TESTE DE RESILIÊNCIA E BLINDAGEM DO PIPELINE DO TELEGRAM ===\n');
  const ctx = runtime.ctx;

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. TESTE DE IDEMPOTÊNCIA DE WEBHOOK (update_id duplicado sem D1)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[1] Testando idempotência de enfileirarUpdate (update_id duplicado)...');
  const uid1 = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 100000);
  try { ctx.PersistenciaBot.remover('inbox_' + uid1); } catch (_) {}
  const updateFake1 = { update_id: uid1, message: { chat: { id: 1771571035 }, text: '/start' } };
  const resultadoNovo = ctx.enfileirarUpdate(updateFake1);
  assert.strictEqual(resultadoNovo, true, 'Primeiro update deve retornar true (novo)');

  const resultadoDuplicado = ctx.enfileirarUpdate(updateFake1);
  assert.strictEqual(resultadoDuplicado, false, 'Update duplicado deve retornar false (já existe na inbox)');
  console.log('  ✓ enfileirarUpdate descarta update_id repetido retornando false');

  console.log('[2] Testando rota Fastify /webhook com update repetido...');
  const app = await buildServer();
  const getOriginal = ctx.ConfigService.get;
  try {
    const secret = 'segredo_teste_123';
    ctx.ConfigService.get = (key) => {
      if (key === 'WEBHOOK_SECRET') return secret;
      if (key === 'TELEGRAM_CHAT_ID') return '1771571035';
      return getOriginal.call(ctx.ConfigService, key);
    };

    const uid2 = uid1 + 1000;
    try { ctx.PersistenciaBot.remover('inbox_' + uid2); } catch (_) {}
    const updateHttp = { update_id: uid2, message: { chat: { id: 1771571035 }, text: '/start' } };

    // 1ª Requisição HTTP (novo)
    const res1 = await app.inject({
      method: 'POST',
      url: `/webhook?secret=${secret}`,
      payload: updateHttp
    });
    assert.strictEqual(res1.statusCode, 200);
    const body1 = JSON.parse(res1.payload);
    assert.strictEqual(body1.ok, true);
    assert.strictEqual(body1.duplicate, undefined, 'Primeira requisição não deve ser marcada como duplicate');

    // 2ª Requisição HTTP (duplicata de rede móvel)
    const res2 = await app.inject({
      method: 'POST',
      url: `/webhook?secret=${secret}`,
      payload: updateHttp
    });
    assert.strictEqual(res2.statusCode, 200);
    const body2 = JSON.parse(res2.payload);
    assert.strictEqual(body2.ok, true);
    assert.strictEqual(body2.duplicate, true, 'Segunda requisição com mesmo update_id deve retornar duplicate: true');
    console.log('  ✓ /webhook responde { ok: true, duplicate: true } sem reprocessar update repetido');
  } finally {
    ctx.ConfigService.get = getOriginal;
    await app.close();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. TESTE DE IDEMPOTÊNCIA DE CALLBACK QUERY (callback_query.id repetido)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[3] Testando idempotência de callback_query.id e destravamento silencioso...');
  const cbId = 'cb_id_teste_' + Date.now();
  assert.strictEqual(ctx.verificarERegistrarCallbackId(cbId), true, 'Novo callback ID deve retornar true');
  assert.strictEqual(ctx.verificarERegistrarCallbackId(cbId), false, 'Callback ID repetido deve retornar false');

  let callbacksRespondidos = [];
  const originalResponder = ctx.responderCallbackTelegram;
  ctx.responderCallbackTelegram = function(id, texto) {
    callbacksRespondidos.push({ id, texto });
  };

  try {
    const cbDup = {
      id: 'cb_dup_teste_' + Date.now(),
      data: 'ux:menu',
      message: { chat: { id: 1771571035 }, message_id: 99 }
    };

    // 1ª execução
    ctx.processarCallbackBotao(cbDup);

    callbacksRespondidos = [];
    // 2ª execução (duplicata de clique duplo ou jitter móvel)
    ctx.processarCallbackBotao(cbDup);
    assert.strictEqual(callbacksRespondidos.length, 1, 'Deve disparar responderCallbackTelegram silencioso');
    assert.strictEqual(callbacksRespondidos[0].id, cbDup.id);
    assert.strictEqual(callbacksRespondidos[0].texto, '', 'Deve enviar toast vazio para destravar o spinner');
    console.log('  ✓ Callback duplicado destrava spinner silenciosamente e retorna sem efeitos colaterais');
  } finally {
    ctx.responderCallbackTelegram = originalResponder;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. TESTE DE FRAGMENTAÇÃO DE CÓDIGO COM LINGUAGEM PRESERVADA
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[4] Testando fragmentarTexto com bloco de código longo e linguagem...');
  const jsonLongo = JSON.stringify({ itens: Array.from({ length: 150 }, (_, i) => ({ id: i, posologia: 'Amoxicilina 500mg VO 8/8h por 7 dias' })) }, null, 2);
  const textoComBloco = 'Resumo da Análise:\n\n```json\n' + jsonLongo + '\n```\n\nFim da receita.';
  assert(textoComBloco.length > 4000, 'Texto deve exceder 4000 caracteres');

  const chunks = ctx.fragmentarTexto(textoComBloco, 2000);
  assert(chunks.length > 1, 'Deve ter dividido em múltiplos chunks');

  // O primeiro chunk deve fechar com ```
  assert(chunks[0].endsWith('```'), 'Primeiro chunk deve fechar o bloco com ```');
  // O segundo chunk deve reabrir com ```json
  assert(chunks[1].startsWith('```json\n'), 'Segundo chunk deve reabrir preservando a linguagem ```json');
  console.log(`  ✓ fragmentarTexto dividiu em ${chunks.length} chunks preservando \`\`\`json entre fragmentos`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. TESTE DE CHUNKING EM entregarTelegramPersistente COM reply_markup
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[5] Testando entregarTelegramPersistente com payload > 4000 caracteres e reply_markup...');
  const tecladoTeste = { inline_keyboard: [[{ text: 'Botão Teste', callback_data: 'teste' }]] };
  const textoLongo = 'Posologia de Emergência:\n\n' + '1. Medicamento Teste 500mg VO 8/8h por 10 dias\n'.repeat(120);
  assert(textoLongo.length > 4000);

  let payloadsEnviados = [];
  const originalFetch = ctx.UrlFetchApp.fetch;
  ctx.UrlFetchApp.fetch = function(url, options) {
    if (url.includes('/sendMessage')) {
      const p = JSON.parse(options.payload);
      payloadsEnviados.push(p);
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true, result: { message_id: Math.floor(Math.random() * 10000) } })
      };
    }
    return originalFetch(url, options);
  };

  try {
    const payloadGrande = {
      chat_id: '1771571035',
      text: textoLongo,
      parse_mode: 'Markdown',
      reply_markup: tecladoTeste
    };

    const resEntrega = ctx.entregarTelegramPersistente('sendMessage', payloadGrande);
    assert.strictEqual(resEntrega, true, 'Entrega persistente deve ter sucesso');
    assert(payloadsEnviados.length >= 2, 'Deve ter gerado pelo menos 2 mensagens enviadas');

    for (let i = 0; i < payloadsEnviados.length; i++) {
      const p = payloadsEnviados[i];
      assert(p.text.length <= 4000, `Chunk ${i + 1} deve ter <= 4000 caracteres (atual: ${p.text.length})`);
      if (i < payloadsEnviados.length - 1) {
        assert.strictEqual(p.reply_markup, undefined, `Chunk intermediário ${i + 1} NÃO deve conter reply_markup`);
      } else {
        assert.deepStrictEqual(p.reply_markup, tecladoTeste, 'Último chunk DEVE conter o reply_markup intacto');
      }
    }
    console.log(`  ✓ Mensagem longa fracionada em ${payloadsEnviados.length} partes; reply_markup isolado no último chunk`);
  } finally {
    ctx.UrlFetchApp.fetch = originalFetch;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. TESTE DE RETENTATIVA COM FALLBACK DE ERRO 400 DE ENTIDADES
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[6] Testando fallback automático de erro 400 Bad Request: can\'t parse entities...');
  let chamadasFetch400 = [];
  ctx.UrlFetchApp.fetch = function(url, options) {
    if (url.includes('/sendMessage')) {
      const p = JSON.parse(options.payload);
      chamadasFetch400.push(p);
      if (p.parse_mode) {
        // Simula rejeição de entities do Telegram
        return {
          getResponseCode: () => 400,
          getContentText: () => JSON.stringify({ ok: false, description: "Bad Request: can't parse entities in message text: unmatched *" })
        };
      }
      // Sucesso na segunda chamada sem parse_mode
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true, result: { message_id: 777 } })
      };
    }
    return originalFetch(url, options);
  };

  try {
    const itemComErroFormatacao = {
      method: 'sendMessage',
      payload: {
        chat_id: '1771571035',
        text: 'Prescrição com asterisco solto * e tag <invalida>',
        parse_mode: 'Markdown'
      },
      status: 'sending',
      attempts: 1
    };

    const okEnvio = ctx.enviarItemTelegram('outbox_teste_400', itemComErroFormatacao);
    assert.strictEqual(okEnvio, true, 'Envio com fallback de erro 400 deve ter sucesso');
    assert.strictEqual(chamadasFetch400.length, 2, 'Deve ter tentado com Markdown e retentado sem parse_mode');
    assert.strictEqual(chamadasFetch400[0].parse_mode, 'Markdown');
    assert.strictEqual(chamadasFetch400[1].parse_mode, undefined, 'Segunda tentativa deve remover parse_mode');
    assert(!chamadasFetch400[1].text.includes('<invalida>'), 'Segunda tentativa deve limpar tags residuais');
    console.log('  ✓ Erro 400 de entidade tratado com retentativa em texto puro sanitizado (Zero perda de mensagem)');
  } finally {
    ctx.UrlFetchApp.fetch = originalFetch;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. TESTE DE FEEDBACK VISUAL EM RECEITAS PDF
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[7] Testando feedback visual upload_document em ReceitaPdfService...');
  let chatActions = [];
  const originalChatAction = ctx.enviarChatAction;
  ctx.enviarChatAction = function(chatId, acao, forcar) {
    chatActions.push({ chatId, acao, forcar });
    return true;
  };

  try {
    const receitaValida = '1. Dipirona 500mg VO de 6/6h por 3 dias se dor ou febre';
    ctx.ReceitaPdfService.processarEEnviarPdf('1771571035', receitaValida);
    const teveUploadDoc = chatActions.some(a => a.acao === 'upload_document');
    assert.strictEqual(teveUploadDoc, true, 'Deve ter disparado enviarChatAction com upload_document');
    console.log('  ✓ ReceitaPdfService envia sendChatAction(\'upload_document\') no início do processamento');
  } finally {
    ctx.enviarChatAction = originalChatAction;
  }

  console.log('\n🎉 TODOS OS 7 TESTES DA SUÍTE DE RESILIÊNCIA DO TELEGRAM FORAM APROVADOS COM SUCESSO!');
}

testResilienciaTelegramPipeline().catch(err => {
  console.error('\n❌ Falha no teste de resiliência:', err);
  process.exit(1);
});
