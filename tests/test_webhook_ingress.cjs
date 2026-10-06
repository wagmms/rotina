process.env.NODE_ENV = 'test';
const assert = require('node:assert/strict');
const runtime = require('../server/runtime.js');
const { buildServer } = require('../server/index.js');

async function main() {
  const app = await buildServer();
  const getOriginal = runtime.ctx.ConfigService.get;
  const postOriginal = runtime.doPost;
  const enqueueOriginal = runtime.ctx.enfileirarUpdate;
  const filaOriginal = runtime.ctx.processarFilaTelegram;
  const persistOriginal = runtime.persistirPropriedades;
  let secret = 'segredo-de-teste';
  let chat = '123';
  let asyncWorker = false;
  const processados = [];
  const eventos = [];
  runtime.ctx.ConfigService.get = key => key === 'WEBHOOK_SECRET' ? secret : key === 'TELEGRAM_CHAT_ID' ? chat : key === 'TELEGRAM_ASYNC_WORKER' ? String(asyncWorker) : getOriginal(key);
  runtime.ctx.enfileirarUpdate = update => eventos.push(`gravado:${update.update_id}`);
  runtime.ctx.processarFilaTelegram = () => eventos.push('fila');
  runtime.persistirPropriedades = () => eventos.push('persistido');
  runtime.doPost = evento => {
    eventos.push('processado');
    processados.push(JSON.parse(evento.postData.contents));
  };
  const payload = { update_id: 0, message: { chat: { id: 123 }, text: 'Pedido clínico de teste' } };
  const enviar = (body, header = secret) => app.inject({
    method: 'POST', url: '/webhook',
    headers: { 'x-telegram-bot-api-secret-token': header }, payload: body
  });

  try {
    secret = '';
    assert.equal((await enviar(payload)).statusCode, 503);
    secret = 'segredo-de-teste';
    assert.equal((await enviar(payload, 'incorreto')).statusCode, 401);
    assert.equal((await enviar({ ...payload, update_id: '0' })).statusCode, 400);
    const ignorado = await enviar({ ...payload, message: { chat: { id: 999 }, text: 'teste' } });
    assert.equal(ignorado.statusCode, 200);
    assert.equal(ignorado.json().ignored, true);
    const ok = await enviar(payload);
    assert.equal(ok.statusCode, 200);
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(processados, [payload]);
    assert.deepEqual(eventos, ['gravado:0', 'persistido', 'processado']);
    eventos.length = 0;
    runtime.persistirPropriedades = () => { throw new Error('disco indisponível'); };
    assert.equal((await enviar({ ...payload, update_id: 1 })).statusCode, 500);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(processados.length, 1);
    runtime.persistirPropriedades = () => eventos.push('persistido');
    asyncWorker = true;
    eventos.length = 0;
    assert.equal((await enviar({ ...payload, update_id: 2 })).statusCode, 200);
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(eventos, ['gravado:2', 'persistido', 'processado', 'fila']);
    console.log('OK: webhook só confirma pedido válido, autenticado e configurado');
  } finally {
    runtime.ctx.ConfigService.get = getOriginal;
    runtime.ctx.enfileirarUpdate = enqueueOriginal;
    runtime.ctx.processarFilaTelegram = filaOriginal;
    runtime.persistirPropriedades = persistOriginal;
    runtime.doPost = postOriginal;
    await app.close();
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
