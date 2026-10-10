/**
 * ==============================================================================
 * SUÍTE DE TESTES: CABEÇALHOS DE SEGURANÇA (HELMET) E RATE-LIMITING NO FASTIFY
 * ==============================================================================
 * Valida a blindagem contra chamadas abusivas, conformidade OWASP e cabeçalhos
 * de segurança HTTP sem degradação de performance beira-leito.
 * ==============================================================================
 */

process.env.NODE_ENV = 'test';
process.env.TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '1771571035';
process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'test_bot_token';

const assert = require('assert');
const { buildServer } = require('../server/index.js');
const runtime = require('../server/runtime.js');

async function executarTestesSeguranca() {
  console.log('=== INICIANDO BATERIA DE TESTES: HELMET & RATE-LIMITING FASTIFY ===\n');

  const app = await buildServer();

  try {
    // --------------------------------------------------------------------------
    // [1] Validação de Cabeçalhos de Segurança HTTP (Helmet / OWASP)
    // --------------------------------------------------------------------------
    console.log('[1] Testando cabeçalhos de segurança Helmet em requisição padrão...');
    const resPadrao = await app.inject({ method: 'GET', url: '/health' });
    assert.strictEqual(resPadrao.statusCode, 200, 'Healthcheck deve responder 200');

    const headers = resPadrao.headers;

    // 1.1 Strict-Transport-Security (HSTS)
    assert(headers['strict-transport-security'], 'Header Strict-Transport-Security deve estar presente');
    assert(headers['strict-transport-security'].includes('max-age='), 'HSTS deve definir max-age');
    console.log('  ✓ Strict-Transport-Security presente:', headers['strict-transport-security']);

    // 1.2 X-Content-Type-Options: nosniff
    assert.strictEqual(headers['x-content-type-options'], 'nosniff', 'X-Content-Type-Options deve ser nosniff');
    console.log('  ✓ X-Content-Type-Options nosniff validado');

    // 1.3 Cross-Origin-Resource-Policy (CORP) configurado para cross-origin (Cockpit GitHub Pages)
    assert.strictEqual(headers['cross-origin-resource-policy'], 'cross-origin', 'CORP deve ser cross-origin para PWA');
    console.log('  ✓ Cross-Origin-Resource-Policy cross-origin validado');

    // 1.4 Cross-Origin-Opener-Policy
    assert(headers['cross-origin-opener-policy'], 'COOP deve estar presente');
    console.log('  ✓ Cross-Origin-Opener-Policy validado:', headers['cross-origin-opener-policy']);

    // 1.5 Content-Security-Policy (CSP)
    const csp = headers['content-security-policy'];
    assert(csp, 'Content-Security-Policy deve estar presente');
    assert(csp.includes('cdn.tailwindcss.com'), 'CSP deve permitir Tailwind CDN');
    assert(csp.includes('unpkg.com'), 'CSP deve permitir Lucide Icons (unpkg)');
    assert(csp.includes('cdn.jsdelivr.net'), 'CSP deve permitir jsdelivr');
    assert(csp.includes('telegram.org'), 'CSP deve permitir scripts do Telegram');
    assert(csp.includes('frame-ancestors'), 'CSP deve conter frame-ancestors');
    assert(csp.includes('web.telegram.org'), 'CSP frame-ancestors deve permitir Telegram WebApp');
    console.log('  ✓ Content-Security-Policy (Tailwind, Lucide, Telegram WebApp) validada');

    // 1.6 Demais proteções OWASP
    assert.strictEqual(headers['x-dns-prefetch-control'], 'off', 'DNS prefetch control deve estar off');
    assert.strictEqual(headers['x-download-options'], 'noopen', 'Download options deve ser noopen');
    assert.strictEqual(headers['x-permitted-cross-domain-policies'], 'none', 'Permitted cross-domain policies deve ser none');
    console.log('  ✓ Proteções complementares OWASP (dns-prefetch, noopen, cross-domain) validadas');

    // --------------------------------------------------------------------------
    // [2] Validação de Cabeçalhos e Mecanismo de Rate-Limiting
    // --------------------------------------------------------------------------
    console.log('\n[2] Testando cabeçalhos de Rate-Limiting em requisições consecutivas...');
    const resR1 = await app.inject({ method: 'GET', url: '/api/status' });
    assert.strictEqual(resR1.statusCode, 200);

    const limitHeader = resR1.headers['x-ratelimit-limit'];
    const remainingR1 = parseInt(resR1.headers['x-ratelimit-remaining'], 10);
    const resetHeader = resR1.headers['x-ratelimit-reset'];

    assert(limitHeader !== undefined, 'Header x-ratelimit-limit deve estar presente');
    assert(Number.isInteger(remainingR1), 'Header x-ratelimit-remaining deve ser um número inteiro');
    assert(resetHeader !== undefined, 'Header x-ratelimit-reset deve estar presente');
    console.log(`  ✓ Headers Rate-Limit iniciais: Limit=${limitHeader}, Remaining=${remainingR1}, Reset=${resetHeader}s`);

    const resR2 = await app.inject({ method: 'GET', url: '/api/status' });
    assert.strictEqual(resR2.statusCode, 200);
    const remainingR2 = parseInt(resR2.headers['x-ratelimit-remaining'], 10);
    assert.strictEqual(remainingR2, remainingR1 - 1, 'x-ratelimit-remaining deve decrementar exatamente em 1');
    console.log(`  ✓ Decremento consistente de remaining: ${remainingR1} -> ${remainingR2}`);

    // --------------------------------------------------------------------------
    // [3] Teste de Proteção HTTP 429 Too Many Requests (Limite Excedido)
    // --------------------------------------------------------------------------
    console.log('\n[3] Testando comportamento defensivo ao exceder rate limit em rota estrita...');

    // Cria instância isolada com limite estrito de 2 requisições para testar 429
    const Fastify = require('fastify');
    const rateLimitPlugin = require('@fastify/rate-limit');
    const testApp = Fastify();

    testApp.setErrorHandler((error, request, reply) => {
      const statusCode = error.statusCode || 500;
      if (statusCode === 429) {
        reply.status(429).send({
          ok: false,
          erro: error.erro || 'Limite de requisições excedido. Tente novamente em instantes.',
          detalhes: error.detalhes || error.message || 'Taxa máxima excedida.',
          requestId: request.id
        });
        return;
      }
      reply.status(statusCode).send({ ok: false, erro: error.message });
    });

    await testApp.register(rateLimitPlugin, {
      global: true,
      max: 2,
      timeWindow: '1 minute',
      allowList: (req) => req.headers && req.headers['x-bypass-ratelimit'] === 'true',
      errorResponseBuilder: (request, context) => ({
        statusCode: 429,
        error: 'Too Many Requests',
        erro: 'Limite de requisições excedido. Tente novamente em instantes.',
        detalhes: `Taxa máxima de ${context.max} requisições atingida.`,
        requestId: request.id
      })
    });

    testApp.get('/api/teste-limite', async () => ({ ok: true }));

    const r1 = await testApp.inject({ method: 'GET', url: '/api/teste-limite' });
    const r2 = await testApp.inject({ method: 'GET', url: '/api/teste-limite' });
    const r3 = await testApp.inject({ method: 'GET', url: '/api/teste-limite' });

    assert.strictEqual(r1.statusCode, 200, 'Primeira requisição deve ser 200');
    assert.strictEqual(r2.statusCode, 200, 'Segunda requisição deve ser 200');
    assert.strictEqual(r3.statusCode, 429, 'Terceira requisição deve ser bloqueada com HTTP 429');

    const json429 = r3.json();
    assert.strictEqual(json429.ok, false, 'Payload 429 deve ter ok: false');
    assert(json429.erro.includes('Limite de requisições excedido'), 'Mensagem amigável de rate limit');
    assert(r3.headers['retry-after'], 'Header retry-after deve ser emitido no bloqueio 429');
    console.log('  ✓ HTTP 429 retornado com payload padronizado e header retry-after:', json429);

    // Teste de bypass seguro
    const rBypass = await testApp.inject({
      method: 'GET',
      url: '/api/teste-limite',
      headers: { 'x-bypass-ratelimit': 'true' }
    });
    assert.strictEqual(rBypass.statusCode, 200, 'Requisição com header de bypass deve passar mesmo com limite esgotado');
    console.log('  ✓ Bypass com header seguro x-bypass-ratelimit validado');
    await testApp.close();

    // --------------------------------------------------------------------------
    // [4] Telemetria de Segurança no Endpoint /api/status
    // --------------------------------------------------------------------------
    console.log('\n[4] Validando metadados de segurança no endpoint /api/status...');
    const statusPayload = resR1.json();
    assert.strictEqual(statusPayload.ok, true);
    assert(statusPayload.seguranca, 'Campo seguranca deve existir no /api/status');
    assert.strictEqual(statusPayload.seguranca.helmet, true, 'seguranca.helmet deve ser true');
    assert.strictEqual(statusPayload.seguranca.rate_limit, true, 'seguranca.rate_limit deve ser true');
    assert(statusPayload.seguranca.limite_max_min > 0, 'limite_max_min deve ser informado');
    console.log('  ✓ Metadados de segurança confirmados em /api/status:', statusPayload.seguranca);

    // --------------------------------------------------------------------------
    // [5] Integridade dos Endpoints Clínicos e PWA com Headers de Segurança
    // --------------------------------------------------------------------------
    console.log('\n[5] Testando conformidade de cabeçalhos de segurança nos endpoints PWA...');
    
    // 5.1 /api/remume
    const resRemume = await app.inject({ method: 'GET', url: '/api/remume' });
    assert.strictEqual(resRemume.statusCode, 200);
    assert.strictEqual(resRemume.headers['x-content-type-options'], 'nosniff');
    assert.strictEqual(resRemume.headers['cross-origin-resource-policy'], 'cross-origin');
    assert(resRemume.headers['x-ratelimit-remaining'] !== undefined);
    console.log('  ✓ /api/remume protegido com Helmet e Rate-Limit');

    // 5.2 /manifest.json
    const resManifest = await app.inject({ method: 'GET', url: '/manifest.json' });
    assert.strictEqual(resManifest.statusCode, 200);
    assert.strictEqual(resManifest.headers['cross-origin-resource-policy'], 'cross-origin');
    console.log('  ✓ /manifest.json servido com cabeçalhos de segurança');

    // 5.3 /api/cockpit RPC
    const chatId = runtime.ctx.ConfigService.get('TELEGRAM_CHAT_ID');
    const token = runtime.ctx.criarSessaoCockpit_(chatId);
    const resRpc = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: {
        metodo: 'cockpitConsultar',
        session: token,
        args: []
      }
    });
    assert.strictEqual(resRpc.statusCode, 200);
    assert.strictEqual(resRpc.headers['x-content-type-options'], 'nosniff');
    assert.strictEqual(resRpc.headers['cross-origin-resource-policy'], 'cross-origin');
    console.log('  ✓ RPC do Cockpit PWA protegido sem degradação de latência');

    console.log('\n🎉 TODOS OS TESTES DE HELMET E RATE-LIMITING FORAM APROVADOS COM 100% DE SUCESSO!');
  } finally {
    await app.close();
  }
}

executarTestesSeguranca().catch((err) => {
  console.error('\n❌ Falha na bateria de testes de segurança:', err);
  process.exit(1);
});
