const assert = require('assert');
const { buildServer } = require('../server/index.js');
const runtime = require('../server/runtime.js');

async function run() {
  process.env.NODE_ENV = 'test';
  process.env.TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '1771571035';
  process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'test_bot_token';
  runtime.ctx.PropertiesService.getScriptProperties().setProperty('TELEGRAM_CHAT_ID', process.env.TELEGRAM_CHAT_ID);
  runtime.ctx.PropertiesService.getScriptProperties().setProperty('TELEGRAM_BOT_TOKEN', process.env.TELEGRAM_BOT_TOKEN);
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

  // 6. Cockpit RPC - Cross-Check de Segurança Clínica & Interações (< 20ms)
  const tCross0 = performance.now();
  const resCross = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitChecarSeguranca',
      session: token,
      args: ['amiodarona 200mg, fluconazol 150mg, enoxaparina 40mg, clcr 28']
    }
  });
  const tCross = performance.now() - tCross0;
  assert.equal(resCross.statusCode, 200);
  const jsonCross = resCross.json();
  assert.equal(jsonCross.ok, true);
  assert.equal(jsonCross.resultado.ok, true);
  assert.equal(jsonCross.resultado.temAlertasCriticos, true);
  assert(jsonCross.resultado.interacoes.length >= 1);
  assert(jsonCross.resultado.ajustesRenais.length >= 1);
  assert(tCross < 50, `Tempo de Cross-Check (${tCross}ms) deve ser menor que 50ms`);
  console.log(`✓ Cockpit Cross-Check de Segurança OK (${tCross.toFixed(2)}ms, ${jsonCross.resultado.interacoes.length} interações, ${jsonCross.resultado.ajustesRenais.length} ajustes renais)`);

  // 7. PWA Manifest & Service Worker
  const resManifest = await app.inject({ method: 'GET', url: '/manifest.json' });
  assert.equal(resManifest.statusCode, 200);
  const jsonManifest = JSON.parse(resManifest.body);
  assert.equal(jsonManifest.short_name, 'Cockpit');
  assert.equal(jsonManifest.display, 'standalone');
  console.log('✓ PWA Manifest.json OK');

  const resSw = await app.inject({ method: 'GET', url: '/sw.js' });
  assert.equal(resSw.statusCode, 200);
  assert(resSw.body.includes('CACHE_NAME'));
  assert(resSw.body.includes('caches.match'));
  console.log('✓ PWA Service Worker (sw.js) OK');

  console.log('\n🚀 TODOS OS TESTES DO SERVIDOR RENDER PASSARAM COM SUCESSO!');
}

run().catch(err => {
  console.error('Erro nos testes do servidor:', err);
  process.exit(1);
});
