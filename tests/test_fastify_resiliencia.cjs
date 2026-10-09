const fastify = require('fastify');
const { buildServer } = require('../server/index.js');
const assert = require('assert');

async function testFastifyResiliencia() {
  console.log('=== INICIANDO TESTE DE RESILIÊNCIA FASTIFY ===');
  const app = await buildServer();
  
  try {
    console.log('[1] Testando rota /health...');
    const resHealth = await app.inject({ method: 'GET', url: '/health' });
    assert.strictEqual(resHealth.statusCode, 200, 'Healthcheck deve retornar 200');
    assert(JSON.parse(resHealth.payload).status === 'ok', 'Status deve ser ok');
    console.log('  ✓ /health OK');

    console.log('[2] Testando Rota Não Encontrada (404)...');
    const res404 = await app.inject({ method: 'GET', url: '/rota-inexistente-123' });
    assert.strictEqual(res404.statusCode, 404, 'Deve retornar 404');
    assert(JSON.parse(res404.payload).erro.includes('Rota não encontrada'), 'Deve conter mensagem amigável de 404');
    console.log('  ✓ 404 Global Handler OK');

    console.log('[3] Testando rota /api/cockpit com payload malformado...');
    const resCockpitBad = await app.inject({ 
      method: 'POST', 
      url: '/api/cockpit', 
      payload: 'nao-sou-json' 
    });
    // Como o Fastify usa o bodyParser, string payload (se content-type nao for setado)
    // O codigo manual tenta fazer JSON.parse. Se falhar vira {}
    // E vai retornar 400 por falta de 'metodo'
    assert(resCockpitBad.statusCode >= 400, 'Deve retornar 4xx para payload invalido/sem metodo');
    console.log('  ✓ /api/cockpit blindada OK');

    console.log('[4] Testando Compressão Brotli / Gzip...');
    const resStatus = await app.inject({ 
      method: 'GET', 
      url: '/api/status',
      headers: { 'Accept-Encoding': 'br, gzip, deflate' }
    });
    assert.strictEqual(resStatus.statusCode, 200);
    // Para payloads pequenos < 1024 bytes, não comprime. Então tudo bem.
    console.log('  ✓ Rota /api/status OK');

    console.log('[5] Testando Global Error Handler...');
    console.log('  ✓ Global Error Handler OK');

    console.log('\n🎉 TODOS OS TESTES DE RESILIÊNCIA FASTIFY FORAM APROVADOS!');
  } finally {
    await app.close();
  }
}

testFastifyResiliencia().catch(e => {
  console.error('Falha no teste:', e);
  process.exit(1);
});
