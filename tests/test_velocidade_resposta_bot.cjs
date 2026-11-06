process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const runtime = require('../server/runtime.js');
const { buildServer } = require('../server/index.js');

test('Velocidade e Otimizações de Latência do Bot', async (t) => {
  await t.test('1. Compactação de contexto medicamentoso (Anti-Bloat RAG)', () => {
    const msg = 'Qual a dose de amoxicilina na otite média aguda em criança?';
    const ctxMed = runtime.ctx.obterContextoMedicamentosParaIA(msg);
    assert.ok(ctxMed && ctxMed.texto, 'Deve retornar contexto farmacológico');
    // Contexto não deve inflar desnecessariamente além de 18.000 chars (antes era ~27.000)
    assert.ok(ctxMed.texto.length < 18000, `Contexto muito inflado: ${ctxMed.texto.length} chars`);
    assert.match(ctxMed.texto, /AMOXICILINA/i, 'Deve conter amoxicilina');
  });

  await t.test('2. Adaptação de Thinking Level no Gemini 4 Argon', () => {
    // 2.1 Multimodal deve usar 'low' por padrão para áudio instantâneo
    let thinkingCapturado = null;
    const origChamarVertex = runtime.ctx.chamarVertexAIGemini;
    runtime.ctx.chamarVertexAIGemini = (parts, sys, opts) => {
      thinkingCapturado = opts.thinkingLevel || opts.thinking;
      return '{"transcricao":"teste","eh_clinico":false}';
    };

    try {
      runtime.ctx.chamarGeminiPoolMultimodal(Buffer.from('teste'), 'audio/ogg', 'Sistema', 'Transcreva');
      assert.equal(thinkingCapturado, 'low', 'Multimodal de áudio deve solicitar thinking "low" para transcrição rápida');

      // 2.2 Conversa geral deve usar 'medium' e emergência deve usar 'high'
      runtime.ctx.chamarVertexAIGemini = (parts, sys, opts) => {
        thinkingCapturado = opts.thinkingLevel || opts.thinking;
        return 'Resposta médica';
      };

      runtime.ctx.gerarRespostaConversaClinica('Olá, como funciona a metformina?', '');
      assert.equal(thinkingCapturado, 'medium', 'Conversa geral deve usar thinking "medium" para resposta ágil');

      runtime.ctx.gerarRespostaConversaClinica('Paciente em PCR ritmo de fibrilação ventricular', '');
      assert.equal(thinkingCapturado, 'high', 'Emergência crítica deve usar thinking "high" para máxima salvaguarda médica');
    } finally {
      runtime.ctx.chamarVertexAIGemini = origChamarVertex;
    }
  });

  await t.test('3. Endpoint /health e Keep-Alive anti-hibernação ativo', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.status, 'ok');
    assert.ok(body.uptime_seconds >= 0);
  });

  await t.test('4. Fast-Lane de Comandos Determinísticos e Callbacks no Webhook', async () => {
    const app = await buildServer();
    const secret = 'segredo_teste_fastlane';
    const chatId = '123456';
    const origGet = runtime.ctx.ConfigService.get;
    runtime.ctx.ConfigService.get = (k) => {
      if (k === 'WEBHOOK_SECRET') return secret;
      if (k === 'TELEGRAM_CHAT_ID') return chatId;
      return origGet(k);
    };

    try {
      // 4.1 Callback query recebe fast-lane
      const cbPayload = {
        update_id: 10001,
        callback_query: { id: 'cb_123', from: { id: chatId }, message: { chat: { id: chatId }, message_id: 42 }, data: 'ux:menu' }
      };
      const resCb = await app.inject({
        method: 'POST',
        url: '/webhook',
        headers: { 'x-telegram-bot-api-secret-token': secret },
        payload: cbPayload
      });
      assert.equal(resCb.statusCode, 200);

      // 4.2 Comando determinístico (/pcr) recebe fast-lane
      const pcrPayload = {
        update_id: 10002,
        message: { chat: { id: chatId }, text: '/pcr' }
      };
      const resPcr = await app.inject({
        method: 'POST',
        url: '/webhook',
        headers: { 'x-telegram-bot-api-secret-token': secret },
        payload: pcrPayload
      });
      assert.equal(resPcr.statusCode, 200);
    } finally {
      runtime.ctx.ConfigService.get = origGet;
    }
  });
});
