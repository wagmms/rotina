const assert = require('node:assert/strict');
const { test } = require('node:test');
const { updateKind, measureLegacyHttp, clinicalStages } = require('../server/telemetry');

test('mede chamadas sem registrar URL, token, texto clínico ou corpo', () => {
  const original = (url, options) => ({ url, options, status: 200 });
  const ctx = { UrlFetchApp: { fetch: original } };
  const metrics = {};
  const url = 'https://api.telegram.org/botTOKEN_PRIVADO/sendMessage';
  const options = { payload: 'CONTEUDO_CLINICO' };
  const result = measureLegacyHttp(ctx, metrics, () => ctx.UrlFetchApp.fetch(url, options));
  assert.deepEqual(result, { url, options, status: 200 });
  assert.equal(ctx.UrlFetchApp.fetch, original);
  assert.equal(metrics.telegram_delivery.calls, 1);
  assert.equal(metrics.telegram_delivery.errors, 0);
  assert.ok(metrics.telegram_delivery.ms >= 0);
  assert.ok(!JSON.stringify(metrics).includes('TOKEN_PRIVADO'));
  assert.ok(!JSON.stringify(metrics).includes('CONTEUDO_CLINICO'));
});

test('preserva falhas e restaura fetch mesmo quando processamento falha', () => {
  const failure = new Error('erro original');
  const original = () => { throw failure; };
  const ctx = { UrlFetchApp: { fetch: original } };
  const metrics = {};
  assert.throws(() => measureLegacyHttp(ctx, metrics, () => {
    ctx.UrlFetchApp.fetch('https://api.groq.com/openai/v1/chat/completions?key=SEGREDO');
  }), error => error === failure);
  assert.equal(ctx.UrlFetchApp.fetch, original);
  assert.equal(metrics.groq.errors, 1);
  assert.equal(metrics.groq.calls, 1);
});

test('publica apenas modalidades e etapas numéricas permitidas', () => {
  assert.equal(updateKind({ message: { text: 'DIAGNOSTICO_PRIVADO' } }), 'text');
  assert.equal(updateKind({ message: { photo: [{}], caption: 'DIAGNOSTICO_PRIVADO' } }), 'photo');
  const metrics = clinicalStages({ metricas: { etapas: {
    geracao_clinica: { ms: 123.45, chamadas: 1, falhas: 0, prompt: 'DIAGNOSTICO_PRIVADO' },
    nome_livre: { ms: 999, chamadas: 1, falhas: 0 }
  } } });
  assert.deepEqual(metrics, { geracao_clinica: { ms: 123.5, calls: 1, errors: 0 } });
  assert.ok(!JSON.stringify(metrics).includes('DIAGNOSTICO_PRIVADO'));
  assert.ok(!JSON.stringify(metrics).includes('nome_livre'));
});
