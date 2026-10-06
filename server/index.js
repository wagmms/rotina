/**
 * ==============================================================================
 * ULTRA ROTINA · FASTIFY API SERVER (RENDER / CLOUD PRODUCTION)
 * ==============================================================================
 * Servidor HTTP de altíssima velocidade para o Telegram Bot e Cockpit PWA.
 * Latência de resposta: < 50ms para consultas e cálculos locais em RAM.
 * ==============================================================================
 */

const fastify = require('fastify')({
  logger: process.env.NODE_ENV === 'test' ? false : true,
  bodyLimit: 15 * 1024 * 1024 // 15MB para suportar áudio base64 do Cockpit
});

const cors = require('@fastify/cors');
const runtime = require('./runtime');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function buildServer() {
  // 1. CORS para permitir chamadas do Cockpit PWA (GitHub Pages e local)
  await fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Telegram-Bot-Api-Secret-Token']
  });

  // 2. Healthcheck & Keep-Alive (Evita hibernação no Render Free)
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      service: 'Ultra Rotina — Backend Render',
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    };
  });

  fastify.get('/ping', async (request, reply) => 'pong');

  // 3. Status e Diagnóstico do Sistema
  fastify.get('/api/status', async (request, reply) => {
    try {
      const cfg = runtime.ctx.ConfigService;
      return {
        ok: true,
        service: 'Ultra Rotina Core Engine',
        version: '2026.10-render',
        chat_id: cfg.get('TELEGRAM_CHAT_ID'),
        gemini_keys_configured: cfg.getArray('GEMINI_API_KEYS').length,
        provedor_padrao: cfg.get('PROVEDOR_TEXTO_PADRAO'),
        uptime: Math.floor(process.uptime()),
        memoria_mb: Math.round(process.memoryUsage().rss / (1024 * 1024))
      };
    } catch (err) {
      reply.status(500);
      return { ok: false, erro: err.message };
    }
  });

  // 4. Endpoint de geração da URL com sessão do Cockpit PWA
  fastify.get('/api/cockpit-url', async (request, reply) => {
    try {
      const url = runtime.ctx.obterUrlCockpit();
      return { ok: true, url };
    } catch (err) {
      reply.status(500);
      return { ok: false, erro: err.message };
    }
  });

  // 5. API RPC DO COCKPIT PWA (Substitui o doGet/doPost lento do GAS)
  fastify.post('/api/cockpit', async (request, reply) => {
    const t0 = performance.now();
    try {
      let body = request.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
      }
      body = body || {};

      const metodo = body.metodo;
      const session = body.session || body.token || '';
      const args = Array.isArray(body.args) ? body.args : [];

      if (!metodo) {
        reply.status(400);
        return { ok: false, erro: 'Parâmetro "metodo" é obrigatório.' };
      }

      const resultado = runtime.cockpitRpc(metodo, session, args);
      const elapsed = (performance.now() - t0).toFixed(2);

      return {
        ok: true,
        resultado,
        benchmark_ms: Number(elapsed)
      };
    } catch (err) {
      const elapsed = (performance.now() - t0).toFixed(2);
      fastify.log.warn(`[Cockpit RPC Error] ${err.message} (${elapsed}ms)`);
      reply.status(err.message.includes('autorizado') || err.message.includes('sessão') ? 401 : 400);
      return {
        ok: false,
        erro: err.message || 'Falha ao processar solicitação clínica.',
        benchmark_ms: Number(elapsed)
      };
    }
  });

  // 6. WEBHOOK DO TELEGRAM (Despacho ultra-rápido com persistência em RAM)
  fastify.post('/webhook', async (request, reply) => {
    const t0 = performance.now();
    try {
      const secretEsperado = runtime.ctx.ConfigService.get('WEBHOOK_SECRET');
      const secretHeader = request.headers['x-telegram-bot-api-secret-token'];
      const secretQuery = request.query ? request.query.secret : null;

      // Validação de segredo do webhook
      if (secretEsperado) {
        const secretRecebido = secretHeader || secretQuery;
        if (secretRecebido !== secretEsperado) {
          fastify.log.warn('[Webhook] Acesso não autorizado ao webhook.');
          reply.status(401);
          return { ok: false, erro: 'Unauthorized' };
        }
      }

      const updateData = request.body;
      const fakeGasEvent = {
        parameter: {
          secret: secretEsperado
        },
        postData: {
          contents: JSON.stringify(updateData)
        }
      };

      // Executa o pipeline de entrega e raciocínio clínico
      runtime.doPost(fakeGasEvent);
      const elapsed = (performance.now() - t0).toFixed(2);
      fastify.log.info(`[Webhook Telegram] Update processado com sucesso em ${elapsed}ms.`);

      return { ok: true, tempo_ms: Number(elapsed) };
    } catch (err) {
      fastify.log.error(`[Webhook Erro] ${err.message}`);
      return { ok: false, erro: err.message };
    }
  });

  // Rota raiz de boas-vindas e verificação
  fastify.get('/', async (request, reply) => {
    return {
      status: 'online',
      message: 'Ultra Rotina — Backend Server Ativo e Operacional',
      docs: '/api/status',
      health: '/health'
    };
  });

  return fastify;
}

if (require.main === module) {
  buildServer().then(server => {
    server.listen({ port: PORT, host: HOST }, (err, address) => {
      if (err) {
        console.error('Erro ao iniciar servidor:', err);
        process.exit(1);
      }
      console.log(`\n======================================================`);
      console.log(`🚀 SERVIDOR ULTRA ROTINA ATIVO EM: ${address}`);
      console.log(`🏥 Health Check / Keep-Alive: ${address}/health`);
      console.log(`📱 Cockpit RPC API: ${address}/api/cockpit`);
      console.log(`🤖 Telegram Webhook: ${address}/webhook`);
      console.log(`======================================================\n`);
    });
  });
}

module.exports = { buildServer };
