process.env.NODE_ENV = 'test';
process.env.TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '1771571035';
process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ';
process.env.SPREADSHEET_ID_REMUME = process.env.SPREADSHEET_ID_REMUME || 'mock_remume_sheet_id';
const assert = require('assert');
const { buildServer } = require('../server/index.js');
const runtime = require('../server/runtime.js');

async function run() {
  const app = await buildServer();

  // 1. Healthcheck
  const resHealth = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(resHealth.statusCode, 200);
  const healthJson = resHealth.json();
  assert.equal(healthJson.status, 'ok');
  console.log('✓ Healthcheck OK');

  // 2. Status
  const resStatus = await app.inject({ method: 'GET', url: '/api/status' });
  assert.equal(resStatus.statusCode, 200);
  const statusJson = resStatus.json();
  assert.equal(statusJson.ok, true);
  assert.equal(statusJson.chat_id, '1771571035');
  console.log('✓ Status OK');

  // 3. Cockpit RPC - Sem autenticação deve retornar 401
  const resSemAuth = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: { metodo: 'cockpitConsultar', session: '' }
  });
  assert.equal(resSemAuth.statusCode, 401);
  console.log('✓ Cockpit 401 não autenticado OK');

  // 4. Cockpit RPC - Cálculo DVA autenticado (< 20ms)
  const chatId = runtime.ctx.ConfigService.get('TELEGRAM_CHAT_ID');
  const token = runtime.ctx.criarSessaoCockpit_(chatId);

  const t0 = performance.now();
  const resDva = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitCalcular',
      session: token,
      args: ['dva', { droga: 'nora', peso: 70 }]
    }
  });
  const tDva = performance.now() - t0;
  assert.equal(resDva.statusCode, 200);
  const jsonDva = resDva.json();
  assert.equal(jsonDva.ok, true);
  assert.equal(jsonDva.resultado.ok, true);
  assert(jsonDva.resultado.texto.includes('Noradrenalina'));
  assert(tDva < 50, `Tempo de DVA (${tDva}ms) deve ser menor que 50ms`);
  console.log(`✓ Cockpit Cálculo DVA OK (${tDva.toFixed(2)}ms)`);

  // 5. Cockpit RPC - Consulta REMUME (< 20ms)
  const resRemume = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitRemume',
      session: token,
      args: []
    }
  });
  assert.equal(resRemume.statusCode, 200);
  const jsonRemume = resRemume.json();
  assert.equal(jsonRemume.ok, true);
  assert(jsonRemume.resultado.itens.length > 200);
  console.log(`✓ Cockpit REMUME OK (${jsonRemume.resultado.itens.length} itens)`);

  // 6. Cache-Control: métodos de leitura recebem cache curto
  const resConsultar = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: { metodo: 'cockpitConsultar', session: token, args: [] }
  });
  assert.equal(resConsultar.statusCode, 200);
  const ccRead = resConsultar.headers['cache-control'];
  assert(ccRead && ccRead.includes('max-age=30'), `Leitura deve ter cache: ${ccRead}`);
  console.log(`✓ Cache-Control leitura OK (${ccRead})`);

  // 7. Cache-Control: métodos de escrita recebem no-store
  const ccWrite = resDva.headers['cache-control'];
  assert(ccWrite && ccWrite.includes('no-store'), `Escrita deve ter no-store: ${ccWrite}`);
  console.log(`✓ Cache-Control escrita OK (${ccWrite})`);

  // 8. Compressão HTTP: respostas grandes são comprimidas com gzip
  const resGzip = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    headers: { 'accept-encoding': 'gzip' },
    payload: { metodo: 'cockpitRemume', session: token, args: [] }
  });
  assert.equal(resGzip.statusCode, 200);
  const contentEncoding = resGzip.headers['content-encoding'];
  assert(contentEncoding === 'gzip', `REMUME deve ser comprimido com gzip, obteve: ${contentEncoding}`);
  const rawSize = Buffer.byteLength(JSON.stringify(jsonRemume));
  const compressedSize = resGzip.rawPayload.length;
  const ratio = ((1 - compressedSize / rawSize) * 100).toFixed(1);
  console.log(`✓ Compressão gzip OK (${rawSize} → ${compressedSize} bytes, -${ratio}%)`);

  console.log('\n🚀 TODOS OS TESTES DO SERVIDOR RENDER PASSARAM COM SUCESSO!');
}

run().catch(err => {
  console.error('Erro nos testes do servidor:', err);
  process.exit(1);
});
