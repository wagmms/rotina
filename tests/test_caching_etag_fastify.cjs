/**
 * ==============================================================================
 * ULTRA ROTINA · TESTES DE CACHING HTTP (ETag, 304 & Stale-While-Revalidate)
 * ==============================================================================
 * Validação exaustiva de headers de cache, ETags determinísticos, status HTTP 304
 * e economia de banda para catálogos estáticos no Fastify (Aulas, REMUME, Assets).
 * ==============================================================================
 */

const assert = require('assert');
const { buildServer } = require('../server/index.js');
const runtime = require('../server/runtime.js');

async function testCachingEtagFastify() {
  console.log('=== TESTE DE OTIMIZAÇÃO DE CACHING HTTP (ETAG & STALE-WHILE-REVALIDATE) ===\n');
  const app = await buildServer();

  try {
    const chatId = runtime.ctx.ConfigService.get('TELEGRAM_CHAT_ID');
    const token = runtime.ctx.criarSessaoCockpit_(chatId);

    // ──────────────────────────────────────────────────────────────────────────
    // [1] Testando Catálogo de Aulas Flash (/api/aulas-flash)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[1] Testando Catálogo de Aulas Flash (/api/aulas-flash)...');
    
    // 1.1 Requisição inicial sem cache
    const resAulas = await app.inject({ method: 'GET', url: '/api/aulas-flash' });
    assert.strictEqual(resAulas.statusCode, 200, 'Aulas flash deve retornar 200');
    const etagAulas = resAulas.headers['etag'];
    assert(etagAulas, 'Deve emitir cabeçalho ETag');
    const cacheControlAulas = resAulas.headers['cache-control'];
    assert(cacheControlAulas && cacheControlAulas.includes('stale-while-revalidate=86400'), 'Cache-Control deve incluir stale-while-revalidate');
    assert(cacheControlAulas.includes('max-age=3600'), 'Cache-Control deve ter max-age=3600');
    const jsonAulas = resAulas.json();
    assert.strictEqual(jsonAulas.ok, true);
    assert(jsonAulas.total > 0, 'Deve ter aulas no catálogo');
    console.log(`  ✓ 200 OK com ETag: ${etagAulas} e Cache-Control: ${cacheControlAulas}`);

    // 1.2 Requisição condicional com If-None-Match correspondente (304 Not Modified)
    const resAulasCond = await app.inject({
      method: 'GET',
      url: '/api/aulas-flash',
      headers: { 'if-none-match': etagAulas }
    });
    assert.strictEqual(resAulasCond.statusCode, 304, 'Deve responder HTTP 304 para ETag idêntico');
    assert.strictEqual(resAulasCond.payload, '', 'Corpo da resposta 304 deve ser vazio para poupar banda');
    assert.strictEqual(resAulasCond.headers['etag'], etagAulas, 'Deve preservar ETag no 304');
    console.log('  ✓ 304 Not Modified recebido com 0 bytes de payload transferidos.');

    // 1.3 Requisição com If-None-Match obsoleto/inválido (200 com payload)
    const resAulasMismatch = await app.inject({
      method: 'GET',
      url: '/api/aulas-flash',
      headers: { 'if-none-match': '"hash-obsoleto-123"' }
    });
    assert.strictEqual(resAulasMismatch.statusCode, 200, 'Deve responder 200 para ETag diferente');
    console.log('  ✓ 200 OK quando o cliente possui ETag desatualizado.');

    // ──────────────────────────────────────────────────────────────────────────
    // [2] Testando Endpoint REST da REMUME Municipal (/api/remume)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[2] Testando Endpoint REST da REMUME (/api/remume)...');

    // 2.1 Requisição inicial da REMUME
    const resRemumeRest = await app.inject({ method: 'GET', url: '/api/remume' });
    assert.strictEqual(resRemumeRest.statusCode, 200, 'Endpoint /api/remume deve retornar 200');
    const etagRemume = resRemumeRest.headers['etag'];
    assert(etagRemume, 'Endpoint /api/remume deve emitir ETag');
    const ccRemume = resRemumeRest.headers['cache-control'];
    assert(ccRemume && ccRemume.includes('stale-while-revalidate=86400'), 'Cache-Control deve conter stale-while-revalidate');
    const jsonRemumeRest = resRemumeRest.json();
    assert.strictEqual(jsonRemumeRest.ok, true);
    assert(jsonRemumeRest.itens && jsonRemumeRest.itens.length > 200, 'Deve conter catálogo com mais de 200 itens');
    console.log(`  ✓ 200 OK com ${jsonRemumeRest.itens.length} medicamentos, ETag: ${etagRemume}`);

    // 2.2 Requisição condicional com If-None-Match (304 Not Modified)
    const resRemumeCond = await app.inject({
      method: 'GET',
      url: '/api/remume',
      headers: { 'if-none-match': etagRemume }
    });
    assert.strictEqual(resRemumeCond.statusCode, 304, 'Deve retornar 304 Not Modified');
    assert.strictEqual(resRemumeCond.payload, '', 'Corpo da resposta 304 deve ser vazio');
    console.log('  ✓ 304 Not Modified validado para REMUME REST.');

    // ──────────────────────────────────────────────────────────────────────────
    // [3] Testando Otimização RPC do Cockpit (/api/cockpit)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[3] Testando Otimização de Caching RPC no Cockpit (/api/cockpit)...');

    // 3.1 Consulta cockpitRemume inicial
    const resRpcRemume = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { metodo: 'cockpitRemume', session: token, args: [] }
    });
    assert.strictEqual(resRpcRemume.statusCode, 200);
    const rpcEtag = resRpcRemume.headers['etag'];
    assert(rpcEtag, 'RPC cockpitRemume deve incluir header ETag');
    const rpcCc = resRpcRemume.headers['cache-control'];
    assert(rpcCc && rpcCc.includes('stale-while-revalidate=86400'), 'RPC cockpitRemume deve ter stale-while-revalidate');
    console.log(`  ✓ RPC cockpitRemume emite ETag (${rpcEtag}) e Cache-Control (${rpcCc})`);

    // 3.2 Requisição condicional HTTP via header If-None-Match no POST (304 Not Modified)
    const resRpcRemume304 = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      headers: { 'if-none-match': rpcEtag },
      payload: { metodo: 'cockpitRemume', session: token, args: [] }
    });
    assert.strictEqual(resRpcRemume304.statusCode, 304, 'POST condicional com If-None-Match deve responder 304');
    assert.strictEqual(resRpcRemume304.payload, '');
    console.log('  ✓ POST condicional com If-None-Match respondeu HTTP 304 (0 bytes transferidos).');

    // 3.3 Requisição condicional via payload JSON { etag } para clientes PWA
    const resRpcPayloadEtag = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { metodo: 'cockpitRemume', session: token, etag: rpcEtag, args: [] }
    });
    assert.strictEqual(resRpcPayloadEtag.statusCode, 200);
    const jsonRpcNotMod = resRpcPayloadEtag.json();
    assert.strictEqual(jsonRpcNotMod.ok, true);
    assert.strictEqual(jsonRpcNotMod.notModified, true, 'Deve informar notModified: true');
    assert.strictEqual(jsonRpcNotMod.etag, rpcEtag);
    console.log('  ✓ RPC com etag em JSON respondeu notModified: true sem reenviar itens.');

    // 3.4 RPC cockpitConsultar (leitura dinâmica com stale-while-revalidate curto)
    const resRpcConsultar = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { metodo: 'cockpitConsultar', session: token, args: [] }
    });
    assert.strictEqual(resRpcConsultar.statusCode, 200);
    const ccConsultar = resRpcConsultar.headers['cache-control'];
    assert(ccConsultar && ccConsultar.includes('stale-while-revalidate=60'), 'cockpitConsultar deve ter stale-while-revalidate');
    assert(ccConsultar.includes('max-age=30'), 'cockpitConsultar deve ter max-age=30');
    console.log(`  ✓ RPC cockpitConsultar configurado com: ${ccConsultar}`);

    // 3.5 RPC cockpitBuscarCid (catálogo estável)
    const resRpcCid = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { metodo: 'cockpitBuscarCid', session: token, args: ['pneumonia'] }
    });
    assert.strictEqual(resRpcCid.statusCode, 200);
    const ccCid = resRpcCid.headers['cache-control'];
    assert(ccCid && ccCid.includes('max-age=1800') && ccCid.includes('stale-while-revalidate=86400'));
    console.log(`  ✓ RPC cockpitBuscarCid configurado com: ${ccCid}`);

    // 3.6 RPC de mutação (ex: cockpitConversar ação novo) -> Cache-Control: no-store
    const resRpcMutacao = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { metodo: 'cockpitConversar', session: token, args: [{ acao: 'novo' }] }
    });
    assert.strictEqual(resRpcMutacao.statusCode, 200);
    const ccMutacao = resRpcMutacao.headers['cache-control'];
    assert.strictEqual(ccMutacao, 'no-store', 'Mutação deve ter Cache-Control: no-store');
    console.log('  ✓ RPC de mutação blindada com Cache-Control: no-store.');

    // ──────────────────────────────────────────────────────────────────────────
    // [4] Testando Assets Estáticos PWA (manifest, sw.js, ícones)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[4] Testando Assets Estáticos PWA...');

    // 4.1 manifest.json
    const resManifest = await app.inject({ method: 'GET', url: '/manifest.json' });
    assert.strictEqual(resManifest.statusCode, 200);
    const etagManifest = resManifest.headers['etag'];
    assert(etagManifest, 'manifest.json deve ter ETag');
    const ccManifest = resManifest.headers['cache-control'];
    assert(ccManifest && ccManifest.includes('stale-while-revalidate=604800'));
    const resManifest304 = await app.inject({
      method: 'GET',
      url: '/manifest.json',
      headers: { 'if-none-match': etagManifest }
    });
    assert.strictEqual(resManifest304.statusCode, 304, 'manifest.json deve responder 304');
    console.log('  ✓ /manifest.json validado (200 + ETag + 304).');

    // 4.2 sw.js (Service Worker deve revalidar imediatamente: must-revalidate)
    const resSw = await app.inject({ method: 'GET', url: '/sw.js' });
    assert.strictEqual(resSw.statusCode, 200);
    const etagSw = resSw.headers['etag'];
    assert(etagSw, 'sw.js deve ter ETag');
    const ccSw = resSw.headers['cache-control'];
    assert(ccSw && ccSw.includes('must-revalidate'), 'sw.js deve ter must-revalidate');
    const resSw304 = await app.inject({
      method: 'GET',
      url: '/sw.js',
      headers: { 'if-none-match': etagSw }
    });
    assert.strictEqual(resSw304.statusCode, 304, 'sw.js deve responder 304');
    console.log('  ✓ /sw.js validado (200 + must-revalidate + ETag + 304).');

    // 4.3 Ícone PWA (pwa-192x192.png)
    const resImg = await app.inject({ method: 'GET', url: '/pwa-192x192.png' });
    assert.strictEqual(resImg.statusCode, 200);
    assert.strictEqual(resImg.headers['content-type'], 'image/png');
    const etagImg = resImg.headers['etag'];
    assert(etagImg, 'Ícone deve ter ETag');
    const ccImg = resImg.headers['cache-control'];
    assert(ccImg && ccImg.includes('stale-while-revalidate=2592000'));
    const resImg304 = await app.inject({
      method: 'GET',
      url: '/pwa-192x192.png',
      headers: { 'if-none-match': etagImg }
    });
    assert.strictEqual(resImg304.statusCode, 304, 'Imagem deve responder 304');
    console.log('  ✓ /pwa-192x192.png validado (200 + image/png + ETag + 304).');

    console.log('\n🎉 SUCESSO TOTAL: Todos os testes de Caching HTTP, ETag, 304 e Stale-While-Revalidate foram aprovados com 100% de sucesso!');
  } finally {
    await app.close();
  }
}

testCachingEtagFastify().catch(e => {
  console.error('\n❌ Falha nos testes de caching Fastify:', e);
  process.exit(1);
});
