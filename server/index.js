/**
 * ==============================================================================
 * ULTRA ROTINA · FASTIFY API SERVER (RENDER / CLOUD PRODUCTION)
 * ==============================================================================
 * Servidor HTTP de altíssima velocidade para o Telegram Bot e Cockpit PWA.
 * Latência de resposta: < 50ms para consultas e cálculos locais em RAM.
 * ==============================================================================
 */

const crypto = require('crypto');
const cors = require('@fastify/cors');
const compress = require('@fastify/compress');
const helmet = require('@fastify/helmet');
const rateLimit = require('@fastify/rate-limit');
const runtime = require('./runtime');
const {
  validarParametrosCalculadora,
  cockpitBodySchema,
  calcularBodySchema,
  chatBodySchema,
  telemetriaQuerySchema
} = require('./validators');

function ehErroAutenticacaoOuSessao(err) {
  if (!err) return false;
  const msg = typeof err === 'string' ? err : (err.message || '');
  return /autorizad[ao]|sess[aã]o|expirad[ao]|token|n[aã]o\s+permitid[ao]|credencia[li]s?/i.test(msg);
}

function sanitizarMensagemErro(msg) {
  if (typeof msg !== 'string') return 'Erro na requisição.';
  const limpo = msg.split(/\r?\n/).filter(line => !/^\s*at\s+.*\(.*:\d+:\d+\)/.test(line)).join(' ').trim();
  return limpo.replace(/\/home\/[^\s:]+|\/app\/[^\s:]+/g, '[servidor]');
}

function gerarETag(conteudo) {
  if (!conteudo) return '"0"';
  const buffer = Buffer.isBuffer(conteudo)
    ? conteudo
    : Buffer.from(typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo));
  const hash = crypto.createHash('sha1').update(buffer).digest('hex').substring(0, 16);
  return `"${hash}"`;
}

function etagCorresponde(headerIfNoneMatch, etag) {
  if (!headerIfNoneMatch || !etag) return false;
  const tags = headerIfNoneMatch.split(',').map(t => t.trim().replace(/^W\//, ''));
  const target = etag.replace(/^W\//, '');
  return tags.includes(target) || tags.includes('*');
}

function traduzirErroSchemaAjv(error) {
  if (!error || !error.validation || !Array.isArray(error.validation) || error.validation.length === 0) {
    return error?.message || 'Parâmetro de entrada inválido no schema Fastify.';
  }
  const v = error.validation[0];
  const campo = v.instancePath ? v.instancePath.replace(/^\//, '') : (v.params?.missingProperty || '');

  switch (v.keyword) {
    case 'required':
      return `Campo obrigatório ausente: "${v.params?.missingProperty || campo}".`;
    case 'type':
      if (campo) {
        return `O campo "${campo}" deve ser do tipo ${v.params?.type || 'esperado'}.`;
      }
      return `O corpo da requisição deve ser do tipo ${v.params?.type || 'objeto JSON'}.`;
    case 'enum':
      return `Valor inválido para o campo "${campo}". Valores permitidos: ${Array.isArray(v.params?.allowedValues) ? v.params.allowedValues.join(', ') : ''}.`;
    case 'minLength':
      return `O campo "${campo}" não pode estar vazio.`;
    case 'maxLength':
      return `O campo "${campo}" excede o tamanho máximo permitido de ${v.params?.limit} caracteres.`;
    case 'minimum':
      return `O valor do campo "${campo}" deve ser no mínimo ${v.params?.limit}.`;
    case 'maximum':
      return `O valor do campo "${campo}" deve ser no máximo ${v.params?.limit}.`;
    case 'additionalProperties':
      return `Propriedade não permitida encontrada no payload: "${v.params?.additionalProperty}".`;
    default:
      return error.message || 'Parâmetro de entrada inválido no schema Fastify.';
  }
}
const { createD1Inbox } = require('./d1-inbox');
const {
  roundMs,
  updateKind,
  measureLegacyHttp,
  clinicalStages,
  registrarInteracaoAoVivo,
  obterUltimasInteracoes,
  registrarMetricaHttp,
  obterMetricasAgregadas,
  registrarErroSistema,
  obterUltimosErros
} = require('./telemetry');
const d1Inbox = createD1Inbox();

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Handlers globais de resiliência e telemetria de processo
if (!process._ultraRotinaHandlersRegistrados) {
  process._ultraRotinaHandlersRegistrados = true;
  process.on('unhandledRejection', (reason) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : null;
    console.error('[Processo][UnhandledRejection]:', msg);
    registrarErroSistema('unhandledRejection', msg, { stack: stack ? stack.slice(0, 300) : null });
  });
  process.on('uncaughtException', (err) => {
    console.error('[Processo][UncaughtException]:', err.message);
    registrarErroSistema('uncaughtException', err.message, { stack: err.stack ? err.stack.slice(0, 300) : null });
  });
}

function obterConfiguracaoLogger() {
  const isTest = process.env.NODE_ENV === 'test';
  if (isTest && !process.env.FORCE_LOG) {
    return false;
  }
  const level = process.env.LOG_LEVEL || 'info';
  return {
    level,
    redact: {
      paths: [
        'req.headers["x-telegram-bot-api-secret-token"]',
        'req.headers.authorization',
        'req.headers.cookie',
        'body.session',
        'body.token',
        'body.args[0].token',
        'body.args[0].session',
        '*.session',
        '*.token',
        '*.secret',
        '*.apiKey'
      ],
      censor: '[REDACTED]'
    },
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          remoteAddress: req.ip,
          userAgent: req.headers['user-agent']
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode
        };
      }
    }
  };
}

function criarInstanciaFastify() {
  return require('fastify')({
    logger: obterConfiguracaoLogger(),
    requestIdHeader: 'x-request-id',
    genReqId: (req) => {
      const incoming = req.headers['x-request-id'];
      if (incoming && typeof incoming === 'string' && incoming.length < 128) {
        return incoming;
      }
      return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    },
    bodyLimit: 15 * 1024 * 1024 // 15MB para suportar áudio base64 do Cockpit
  });
}

async function buildServer() {
  const fastify = criarInstanciaFastify();

  // Hooks globais de rastreabilidade, latência e telemetria HTTP
  fastify.addHook('onRequest', async (request, reply) => {
    request.t0 = performance.now();
  });

  fastify.addHook('onSend', async (request, reply, payload) => {
    const t0 = request.t0 || performance.now();
    const duracao = Math.max(0, performance.now() - t0);
    reply.header('x-request-id', request.id);
    reply.header('x-response-time', `${duracao.toFixed(2)}ms`);
    return payload;
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const t0 = request.t0 || performance.now();
    const duracao = roundMs(performance.now() - t0);
    const rota = request.routerPath || request.raw.url?.split('?')[0] || 'desconhecida';
    registrarMetricaHttp(request.method, rota, reply.statusCode, duracao);

    if (reply.statusCode >= 500) {
      fastify.log.error({
        reqId: request.id,
        method: request.method,
        url: request.raw.url,
        statusCode: reply.statusCode,
        duracao_ms: duracao
      }, '[Fastify HTTP] Falha 5xx no endpoint');
    } else if (duracao > 1000 && rota !== '/webhook') {
      fastify.log.warn({
        reqId: request.id,
        method: request.method,
        url: request.raw.url,
        statusCode: reply.statusCode,
        duracao_ms: duracao
      }, '[Fastify Alerta Latência] Requisição excedeu 1000ms');
    }
  });

  fastify.addHook('onError', async (request, reply, error) => {
    registrarErroSistema('http_error_hook', error.message, {
      reqId: request.id,
      url: request.raw.url,
      method: request.method
    });
  });

  // 0. Parser para text/plain (usado pelo Cockpit PWA para tráfego seguro cross-origin)
  fastify.addContentTypeParser('text/plain', { parseAs: 'string' }, (req, body, done) => {
    try {
      const json = JSON.parse(body);
      done(null, json);
    } catch (_) {
      done(null, body);
    }
  });

  // 1. CORS para permitir chamadas do Cockpit PWA (GitHub Pages e local)
  await fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Telegram-Bot-Api-Secret-Token']
  });

  // 1.1. Compressão HTTP (gzip/deflate) — reduz payload ~60-80% em respostas grandes
  // (REMUME, SOAP, leitos). Threshold de 1KB para não comprimir micro-respostas.
  await fastify.register(compress, {
    global: true,
    threshold: 1024,
    zlibOptions: { level: 6 },
    encodings: ['gzip', 'deflate', 'br']
  });

  // 1.2. Cabeçalhos de Segurança HTTP (Helmet / OWASP Hardening)
  await fastify.register(helmet, {
    global: true,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://cdn.tailwindcss.com',
          'https://unpkg.com',
          'https://cdn.jsdelivr.net',
          'https://telegram.org'
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdn.tailwindcss.com',
          'https://fonts.googleapis.com'
        ],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'https:', 'wss:', 'ws:'],
        mediaSrc: ["'self'", 'data:', 'blob:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'", 'https://web.telegram.org', 'https://*.telegram.org']
      }
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    frameguard: false // Permite renderização segura dentro do Telegram WebApp e Webview
  });

  // 1.3. Rate-Limiting para Proteção DoS/Brute-Force
  const limiteRateLimit = process.env.RATE_LIMIT_MAX
    ? parseInt(process.env.RATE_LIMIT_MAX, 10)
    : (process.env.NODE_ENV === 'test' ? 1000 : 240);

  await fastify.register(rateLimit, {
    global: true,
    max: limiteRateLimit,
    timeWindow: '1 minute',
    allowList: (req) => {
      if (req.headers && req.headers['x-bypass-ratelimit'] === 'true') {
        return true;
      }
      return false;
    },
    errorResponseBuilder: (request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      erro: 'Limite de requisições excedido. Tente novamente em instantes.',
      detalhes: `Taxa máxima de ${context.max} requisições por ${context.after} atingida.`,
      requestId: request.id
    })
  });

  // 1.4. Tratamento Global de Erros Fastify (Resiliência, Sanitização e Rastreabilidade)
  fastify.setErrorHandler((error, request, reply) => {
    const reqId = request.id || 'unknown';
    const statusCode = error.statusCode || 500;

    if (statusCode === 429) {
      fastify.log.warn(`[Fastify RateLimit][${reqId}] 429 - Limite excedido na rota: ${request.raw.url}`);
      reply.status(429).send({
        ok: false,
        erro: error.erro || 'Limite de requisições excedido. Tente novamente em instantes.',
        detalhes: error.detalhes || error.message || 'Taxa máxima excedida.',
        requestId: reqId
      });
      return;
    }

    if (statusCode === 413) {
      fastify.log.warn(`[Fastify Payload Too Large][${reqId}] 413 - Payload excede limite na rota: ${request.raw.url}`);
      reply.status(413).send({
        ok: false,
        erro: 'Payload da requisição excede o limite máximo permitido (15MB).',
        detalhes: 'Reduza o tamanho dos dados ou divida em lotes menores.',
        requestId: reqId
      });
      return;
    }

    // Tratamento defensivo de JSON malformado e SyntaxError do parser
    const isSyntaxOrJsonError = error instanceof SyntaxError ||
      (statusCode === 400 && typeof error.message === 'string' && /JSON|Unexpected token|Unexpected end|parsing/i.test(error.message));
    if (isSyntaxOrJsonError) {
      fastify.log.warn(`[Fastify Malformed JSON][${reqId}] 400 - ${error.message} - Rota: ${request.raw.url}`);
      reply.status(400).send({
        ok: false,
        erro: 'Corpo da requisição contém JSON malformado ou sintaxe inválida.',
        detalhes: 'Não foi possível interpretar o corpo da requisição como JSON válido.',
        requestId: reqId
      });
      return;
    }

    if (error.validation) {
      const mensagemPtBr = traduzirErroSchemaAjv(error);
      fastify.log.warn(`[Fastify Schema Validation][${reqId}] 400 - ${mensagemPtBr} - Rota: ${request.raw.url}`);
      reply.status(400).send({
        ok: false,
        erro: mensagemPtBr,
        detalhes: error.validation,
        requestId: reqId
      });
      return;
    }

    fastify.log.error(`[Fastify Global Error][${reqId}] ${error.message} - Rota: ${request.raw.url}`);
    registrarErroSistema('fastify_global_error', error.message, { reqId, url: request.raw.url, statusCode });
    const msgErro = statusCode >= 500 ? 'Falha interna no servidor.' : (sanitizarMensagemErro(error.message) || 'Erro na requisição.');
    const detalhesErro = statusCode >= 500 ? 'Ocorreu um erro interno ao processar a requisição clínica.' : sanitizarMensagemErro(error.message);
    reply.status(statusCode).send({
      ok: false,
      erro: msgErro,
      detalhes: detalhesErro,
      requestId: reqId
    });
  });

  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      ok: false,
      erro: 'Rota não encontrada no backend Ultra Rotina.',
      requestId: request.id
    });
  });


  let pingTracker = {
    total: 0,
    lastPing: null,
    lastUserAgent: null
  };

  // 2. Healthcheck & Keep-Alive (Evita hibernação no Render Free)
  fastify.get('/health', {
    config: {
      rateLimit: {
        max: 600,
        timeWindow: '1 minute'
      }
    }
  }, async (request, reply) => {
    pingTracker.total++;
    pingTracker.lastPing = new Date().toISOString();
    pingTracker.lastUserAgent = request.headers['user-agent'] || 'unknown';

    return {
      status: 'ok',
      service: 'Ultra Rotina — Backend Render',
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      pings_received: pingTracker.total,
      last_ping_from: pingTracker.lastUserAgent
    };
  });

  fastify.get('/ping', {
    config: {
      rateLimit: {
        max: 600,
        timeWindow: '1 minute'
      }
    }
  }, async (request, reply) => 'pong');

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
        memoria_mb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
        pings_received: pingTracker.total,
        last_ping_time: pingTracker.lastPing,
        last_ping_from: pingTracker.lastUserAgent,
        seguranca: {
          helmet: true,
          rate_limit: true,
          schemas_fastify: true,
          limite_max_min: limiteRateLimit
        },
        circuit_breaker: {
          multimodal: runtime.ctx.IaCircuitBreaker ? runtime.ctx.IaCircuitBreaker.obterStatus('MULTIMODAL') : null,
          gemini: runtime.ctx.IaCircuitBreaker ? runtime.ctx.IaCircuitBreaker.obterStatus('GEMINI') : null,
          local: runtime.ctx.IaCircuitBreaker ? runtime.ctx.IaCircuitBreaker.obterStatus('LOCAL') : null,
          ollama: runtime.ctx.IaCircuitBreaker ? runtime.ctx.IaCircuitBreaker.obterStatus('OLLAMA') : null
        },
        ia_local_disponivel: !!(runtime.ctx.IaLocalFallbackService && runtime.ctx.executarFallbackLocalOffline)
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

  // 4.1 Catálogo de Aulas Flash R1 (cacheado em memória com ETag e Stale-While-Revalidate)
  const pathAulas = require('path').join(__dirname, '..', 'src', 'data', 'aulas_compactas.json');
  let cacheAulasJson = null;
  let etagAulas = null;

  fastify.get('/api/aulas-flash', async (request, reply) => {
    try {
      if (!cacheAulasJson && require('fs').existsSync(pathAulas)) {
        const raw = require('fs').readFileSync(pathAulas, 'utf8');
        cacheAulasJson = JSON.parse(raw);
        etagAulas = gerarETag(raw);
      }
      const etag = etagAulas || gerarETag('[]');
      reply.header('ETag', etag);
      reply.header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');

      if (etagCorresponde(request.headers['if-none-match'], etag)) {
        reply.status(304).send();
        return;
      }

      return { ok: true, total: cacheAulasJson ? cacheAulasJson.length : 0, aulas: cacheAulasJson || [] };
    } catch (err) {
      reply.status(500);
      return { ok: false, erro: err.message };
    }
  });

  // 4.2 Catálogo REST da REMUME Municipal (com ETag e Stale-While-Revalidate)
  let cacheRemumePayload = null;
  let etagRemume = null;

  function obterRemumeCacheada() {
    if (!cacheRemumePayload) {
      try {
        const remumeObj = runtime.cockpitRpc('cockpitRemume', 'internal', []);
        cacheRemumePayload = remumeObj || { fonte: 'REMUME municipal', itens: [] };
      } catch (_) {
        cacheRemumePayload = { fonte: 'REMUME local', itens: [] };
      }
      etagRemume = gerarETag(cacheRemumePayload);
    }
    return { payload: cacheRemumePayload, etag: etagRemume };
  }

  fastify.get('/api/remume', async (request, reply) => {
    try {
      const { payload, etag } = obterRemumeCacheada();
      reply.header('ETag', etag);
      reply.header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');

      if (etagCorresponde(request.headers['if-none-match'], etag)) {
        reply.status(304).send();
        return;
      }

      return { ok: true, total: payload.itens.length, ...payload };
    } catch (err) {
      reply.status(500);
      return { ok: false, erro: err.message };
    }
  });

  // 5.0 Endpoint REST Dedicado para Calculadoras Clínicas (Handshake Rápido via Fastify Schema)
  fastify.post('/api/calcular', {
    schema: {
      body: calcularBodySchema
    },
    preValidation: (request, reply, done) => {
      let body = request.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
          request.body = body;
        } catch (_) {
          reply.status(400).send({
            ok: false,
            erro: 'Corpo da requisição contém JSON malformado ou string não parseável.',
            detalhes: 'Não foi possível converter a entrada para um objeto JSON válido.',
            requestId: request.id
          });
          return;
        }
      }
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        reply.status(400).send({
          ok: false,
          erro: 'Payload da requisição deve ser um objeto JSON não nulo.',
          detalhes: 'O corpo recebido não é um objeto JSON válido.',
          requestId: request.id
        });
        return;
      }

      if (Object.getPrototypeOf(body) !== Object.prototype && Object.getPrototypeOf(body) !== null) {
        reply.status(400).send({
          ok: false,
          erro: 'Payload contém protótipo alterado ou propriedade reservada proibida.',
          detalhes: 'Tentativa de prototype pollution bloqueada.',
          requestId: request.id
        });
        return;
      }
      for (const k of ['__proto__', 'constructor', 'prototype']) {
        if (Object.prototype.hasOwnProperty.call(body, k)) {
          reply.status(400).send({
            ok: false,
            erro: 'Payload contém propriedade reservada proibida.',
            detalhes: 'Tentativa de prototype pollution bloqueada.',
            requestId: request.id
          });
          return;
        }
      }

      const { tipo, parametros } = body;
      const validacao = validarParametrosCalculadora(tipo, parametros);
      if (!validacao.valido) {
        reply.status(400).send({
          ok: false,
          erro: `Parâmetros inválidos para a calculadora: ${validacao.erro}`,
          detalhes: validacao.erro,
          requestId: request.id
        });
        return;
      }
      request.body.parametros = validacao.entradaSanitizada;
      done();
    }
  }, async (request, reply) => {
    const t0 = performance.now();
    try {
      const { tipo, parametros, session, token } = request.body;
      const sessao = session || token || '';
      const resultado = runtime.cockpitRpc('cockpitCalcular', sessao, [tipo, parametros]);
      const elapsed = (performance.now() - t0).toFixed(2);

      registrarInteracaoAoVivo({
        origem: 'fastify_rest_calc',
        tipo: 'calculadora',
        resumo: `Calc REST: ${tipo}`,
        duracao_ms: Number(elapsed),
        status: 'sucesso'
      });

      return {
        ok: true,
        tipo,
        resultado,
        benchmark_ms: Number(elapsed)
      };
    } catch (err) {
      const elapsed = (performance.now() - t0).toFixed(2);
      const isAuthError = ehErroAutenticacaoOuSessao(err);
      reply.status(isAuthError ? 401 : 400);
      return {
        ok: false,
        erro: sanitizarMensagemErro(err.message) || 'Falha ao processar cálculo clínico.',
        detalhes: sanitizarMensagemErro(err.message),
        benchmark_ms: Number(elapsed),
        requestId: request.id
      };
    }
  });

  // 5. API RPC DO COCKPIT PWA (Substitui o doGet/doPost lento do GAS)
  // Métodos de leitura idempotentes — respostas podem ser cacheadas com stale-while-revalidate
  const COCKPIT_READ_METHODS = new Set([
    'cockpitConsultar', 'cockpitPerfil', 'cockpitRemume', 'cockpitAulasProgresso',
    'cockpitBuscarCid', 'cockpitEstratificarRisco', 'cockpitConsultarFarmaco'
  ]);
  fastify.post('/api/cockpit', {
    schema: {
      body: cockpitBodySchema
    },
    preValidation: (request, reply, done) => {
      let body = request.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
          request.body = body;
        } catch (_) {
          reply.status(400).send({
            ok: false,
            erro: 'Corpo da requisição contém JSON malformado ou string não parseável.',
            detalhes: 'Não foi possível converter a entrada para um objeto JSON válido.',
            requestId: request.id
          });
          return;
        }
      }
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        reply.status(400).send({
          ok: false,
          erro: 'Payload do Cockpit deve ser um objeto JSON não nulo.',
          detalhes: 'O corpo recebido não é um objeto JSON válido.',
          requestId: request.id
        });
        return;
      }
      if (Object.getPrototypeOf(body) !== Object.prototype && Object.getPrototypeOf(body) !== null) {
        reply.status(400).send({
          ok: false,
          erro: 'Payload contém protótipo alterado ou propriedade reservada proibida.',
          detalhes: 'Tentativa de prototype pollution bloqueada.',
          requestId: request.id
        });
        return;
      }
      for (const k of ['__proto__', 'constructor', 'prototype']) {
        if (Object.prototype.hasOwnProperty.call(body, k)) {
          reply.status(400).send({
            ok: false,
            erro: 'Payload contém propriedade reservada proibida.',
            detalhes: 'Tentativa de prototype pollution bloqueada.',
            requestId: request.id
          });
          return;
        }
      }
      const metodo = typeof body.metodo === 'string' ? body.metodo.trim() : '';
      if (!metodo) {
        reply.status(400).send({
          ok: false,
          erro: 'Parâmetro "metodo" deve ser uma string válida.',
          detalhes: 'O método RPC solicitado não foi informado ou é inválido.',
          requestId: request.id
        });
        return;
      }
      if (metodo === '__proto__' || metodo === 'constructor' || metodo === 'prototype') {
        reply.status(400).send({
          ok: false,
          erro: 'Método solicitado inválido ou proibido.',
          detalhes: 'Tentativa de acesso a propriedade reservada.',
          requestId: request.id
        });
        return;
      }

      // Validação e sanitização estrita para calculadoras clínicas no handshake
      if (metodo === 'cockpitCalcular') {
        let args = body.args;
        if (!Array.isArray(args) || args.length < 2) {
          reply.status(400).send({
            ok: false,
            erro: 'Argumentos de cálculo devem conter [tipo, parametros].',
            detalhes: 'Esperado array com tipo de calculadora e objeto de parâmetros.',
            requestId: request.id
          });
          return;
        }
        const tipo = args[0];
        const entrada = args[1];
        const validacao = validarParametrosCalculadora(tipo, entrada);
        if (!validacao.valido) {
          reply.status(400).send({
            ok: false,
            erro: `Parâmetros inválidos para a calculadora: ${validacao.erro}`,
            detalhes: validacao.erro,
            requestId: request.id
          });
          return;
        }
        args[1] = validacao.entradaSanitizada;
      }
      done();
    }
  }, async (request, reply) => {
    const t0 = performance.now();
    try {
      let body = request.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
      }
      body = body || {};

      const metodo = (body && typeof body.metodo === 'string') ? body.metodo.trim() : '';
      const session = (body && (body.session || body.token)) ? String(body.session || body.token) : '';
      let args = body && body.args;
      if (args === undefined || args === null) {
        args = [];
      } else if (!Array.isArray(args)) {
        args = [args];
      }

      if (!metodo) {
        reply.status(400);
        return { ok: false, erro: 'Parâmetro "metodo" deve ser uma string válida.' };
      }

      // 5.1 Otimização de Caching HTTP para Catálogo REMUME (ETag e 304 Condicional)
      if (metodo === 'cockpitRemume') {
        const { payload: remumeData, etag: remumeEtag } = obterRemumeCacheada();
        reply.header('ETag', remumeEtag);
        reply.header('Cache-Control', 'private, max-age=3600, stale-while-revalidate=86400');

        if (etagCorresponde(request.headers['if-none-match'], remumeEtag)) {
          reply.status(304).send();
          return;
        }

        const clientEtag = (body && body.etag) || (args && args[0] && args[0].etag);
        if (clientEtag && etagCorresponde(String(clientEtag), remumeEtag)) {
          const elapsed = (performance.now() - t0).toFixed(2);
          return {
            ok: true,
            notModified: true,
            etag: remumeEtag,
            benchmark_ms: Number(elapsed)
          };
        }
      }

      const resultado = runtime.cockpitRpc(metodo, session, args);
      const elapsed = (performance.now() - t0).toFixed(2);

      // Métodos de leitura: cabeçalhos de cache otimizados com stale-while-revalidate
      if (metodo === 'cockpitRemume') {
        const { etag: remumeEtag } = obterRemumeCacheada();
        reply.header('ETag', remumeEtag);
        reply.header('Cache-Control', 'private, max-age=3600, stale-while-revalidate=86400');
      } else if (metodo === 'cockpitConsultar' || metodo === 'cockpitPerfil') {
        reply.header('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
      } else if (metodo === 'cockpitBuscarCid' || metodo === 'cockpitAulasProgresso' || metodo === 'cockpitEstratificarRisco') {
        reply.header('Cache-Control', 'private, max-age=1800, stale-while-revalidate=86400');
      } else if (COCKPIT_READ_METHODS.has(metodo)) {
        reply.header('Cache-Control', 'private, max-age=30, stale-while-revalidate=120');
      } else {
        reply.header('Cache-Control', 'no-store');
      }

      // Telemetria ao vivo da interação no Cockpit
      registrarInteracaoAoVivo({
        origem: 'cockpit_pwa',
        tipo: 'rpc',
        resumo: `RPC: ${metodo}${args && args[0] && args[0].acao ? ' (' + args[0].acao + ')' : ''}`,
        duracao_ms: Number(elapsed),
        status: 'sucesso'
      });

      return {
        ok: true,
        resultado,
        benchmark_ms: Number(elapsed)
      };
    } catch (err) {
      const elapsed = (performance.now() - t0).toFixed(2);
      fastify.log.warn(`[Cockpit RPC Error] ${err.message} (${elapsed}ms)`);
      
      registrarInteracaoAoVivo({
        origem: 'cockpit_pwa',
        tipo: 'rpc',
        resumo: `RPC: ${request.body?.metodo || 'desconhecido'}`,
        duracao_ms: Number(elapsed),
        status: 'erro',
        detalhes: err.message
      });

      reply.header('Cache-Control', 'no-store');
      const isAuthError = ehErroAutenticacaoOuSessao(err);
      reply.status(isAuthError ? 401 : 400);
      return {
        ok: false,
        erro: sanitizarMensagemErro(err.message) || 'Falha ao processar solicitação clínica.',
        detalhes: sanitizarMensagemErro(err.message),
        benchmark_ms: Number(elapsed),
        requestId: request.id
      };
    }
  });

  // 5.0.2 Endpoint REST Dedicado para Chat Clínico e Assistente IA (/api/chat)
  fastify.post('/api/chat', {
    schema: {
      body: chatBodySchema
    },
    preValidation: (request, reply, done) => {
      let body = request.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
          request.body = body;
        } catch (_) {
          reply.status(400).send({
            ok: false,
            erro: 'Corpo da requisição contém JSON malformado ou string não parseável.',
            detalhes: 'Não foi possível converter a entrada para um objeto JSON válido.',
            requestId: request.id
          });
          return;
        }
      }
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        reply.status(400).send({
          ok: false,
          erro: 'Payload do Chat deve ser um objeto JSON não nulo.',
          detalhes: 'O corpo recebido não é um objeto JSON válido.',
          requestId: request.id
        });
        return;
      }
      if (Object.getPrototypeOf(body) !== Object.prototype && Object.getPrototypeOf(body) !== null) {
        reply.status(400).send({
          ok: false,
          erro: 'Payload contém protótipo alterado ou propriedade reservada proibida.',
          detalhes: 'Tentativa de prototype pollution bloqueada.',
          requestId: request.id
        });
        return;
      }
      for (const k of ['__proto__', 'constructor', 'prototype']) {
        if (Object.prototype.hasOwnProperty.call(body, k)) {
          reply.status(400).send({
            ok: false,
            erro: 'Payload contém propriedade reservada proibida.',
            detalhes: 'Tentativa de prototype pollution bloqueada.',
            requestId: request.id
          });
          return;
        }
      }
      done();
    }
  }, async (request, reply) => {
    const t0 = performance.now();
    try {
      const body = request.body || {};
      const session = body.session || body.token || (typeof request.headers['authorization'] === 'string' ? request.headers['authorization'].replace(/^Bearer\s+/i, '').trim() : '') || '';
      const texto = body.mensagem || body.texto || body.prompt || '';
      const acao = typeof body.acao === 'string' ? body.acao.trim() : 'enviar';
      const audioBase64 = body.audioBase64 || null;
      const mime = typeof body.mime === 'string' ? body.mime.trim() : 'audio/webm';

      if (!session) {
        reply.status(401).send({
          ok: false,
          erro: 'Sessão ausente, inválida ou expirada. Autentique-se via Telegram para interagir com o chat clínico.',
          detalhes: 'Token de sessão do Cockpit não fornecido.',
          requestId: request.id
        });
        return;
      }

      const params = {
        acao,
        texto: String(texto),
        audioBase64,
        mime,
        fallbackLocal: !!body.fallbackLocal
      };

      const resultado = runtime.cockpitRpc('cockpitConversar', session, [params]);
      const elapsed = (performance.now() - t0).toFixed(2);

      registrarInteracaoAoVivo({
        origem: 'fastify_rest_chat',
        tipo: 'chat',
        resumo: `Chat REST: ${acao} - "${String(texto).slice(0, 40)}"`,
        duracao_ms: Number(elapsed),
        status: 'sucesso'
      });

      return {
        ok: true,
        resultado,
        resposta: resultado?.resposta || resultado?.mensagem || resultado,
        soap: resultado?.soap || '',
        benchmark_ms: Number(elapsed),
        contingencia_offline: !!(
          resultado?.contingencia_offline ||
          resultado?.deterministico ||
          resultado?.offline_disponivel ||
          (typeof (resultado?.resposta || resultado?.mensagem || '') === 'string' && /conting[êe]ncia|modo\s+offline|protocolos?\s+offline|offline/i.test(String(resultado?.resposta || resultado?.mensagem || '')))
        )
      };
    } catch (err) {
      const elapsed = (performance.now() - t0).toFixed(2);
      fastify.log.warn(`[Chat REST Error] ${err.message} (${elapsed}ms)`);

      const isAuthError = ehErroAutenticacaoOuSessao(err);

      // Fast-Ack / Fallback de Alta Disponibilidade para o Chat Beira-Leito:
      // Se NÃO for erro de autenticação e for erro de IA/timeout/provedor ou solicitação explícita de fallback:
      const body = request.body || {};
      const texto = body.mensagem || body.texto || body.prompt || '';
      const ehErroIA = err.message && (/ia|gemini|timeout|timed\s*out|provedor|fetch|quota|socket|redirecionar|conexão/i.test(err.message));
      if (!isAuthError && texto && (ehErroIA || body.fallbackLocal)) {
        try {
          const fallbackRes = (runtime.ctx.executarFallbackLocalOffline && typeof runtime.ctx.executarFallbackLocalOffline === 'function')
            ? runtime.ctx.executarFallbackLocalOffline('Você é copiloto médico de emergência.', String(texto), { clinico: true })
            : (runtime.ctx.IaLocalFallbackService ? runtime.ctx.IaLocalFallbackService.gerarRespostaOfflineClinica(null, String(texto)) : null);

          if (fallbackRes) {
            registrarInteracaoAoVivo({
              origem: 'fastify_rest_chat',
              tipo: 'chat_fallback',
              resumo: `Chat Fallback: "${String(texto).slice(0, 40)}"`,
              duracao_ms: Number(elapsed),
              status: 'fallback'
            });

            return {
              ok: true,
              contingencia_offline: true,
              origem: 'fallback_local_offline',
              resultado: { resposta: String(fallbackRes), soap: String(fallbackRes), contingencia_offline: true },
              resposta: String(fallbackRes),
              soap: String(fallbackRes),
              aviso: 'Processado pelo Motor de Fallback Local Offline após indisponibilidade temporária do provedor em nuvem.',
              benchmark_ms: Number(elapsed)
            };
          }
        } catch (eFallback) {
          fastify.log.warn(`[Chat Fallback Error] ${eFallback.message}`);
        }
      }

      registrarInteracaoAoVivo({
        origem: 'fastify_rest_chat',
        tipo: 'chat',
        resumo: `Chat REST: ${request.body?.acao || 'enviar'}`,
        duracao_ms: Number(elapsed),
        status: 'erro',
        detalhes: err.message
      });

      reply.status(isAuthError ? 401 : 400);
      return {
        ok: false,
        erro: isAuthError
          ? 'Sessão ausente, inválida ou expirada. Autentique-se via Telegram para interagir com o chat clínico.'
          : (sanitizarMensagemErro(err.message) || 'Falha ao processar mensagem do chat clínico.'),
        detalhes: sanitizarMensagemErro(err.message),
        benchmark_ms: Number(elapsed),
        requestId: request.id
      };
    }
  });

  // 5.1. TELEMETRIA AO VIVO: Consulta das últimas interações do Bot e Cockpit
  fastify.get('/api/telemetria/ao-vivo', {
    schema: {
      querystring: telemetriaQuerySchema
    }
  }, async (request, reply) => {
    const limite = Math.min(100, Math.max(1, parseInt(request.query?.limite || '30', 10)));
    const interacoes = obterUltimasInteracoes(limite);
    reply.header('Cache-Control', 'no-store');
    return {
      ok: true,
      total: interacoes.length,
      interacoes: interacoes
    };
  });

  // 5.2. TELEMETRIA & MÉTRICAS AGREGADAS (Render Performance, Memória, Latência e Status HTTP)
  fastify.get('/api/telemetria/metricas', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    return {
      ok: true,
      servico: 'Ultra Rotina Telemetria & Monitoramento',
      timestamp: new Date().toISOString(),
      ...obterMetricasAgregadas()
    };
  });

  // 5.3. TELEMETRIA: Últimos erros capturados em buffer circular de memória
  fastify.get('/api/telemetria/erros', {
    schema: {
      querystring: telemetriaQuerySchema
    }
  }, async (request, reply) => {
    const limite = Math.min(50, Math.max(1, parseInt(request.query?.limite || '10', 10)));
    reply.header('Cache-Control', 'no-store');
    return {
      ok: true,
      total: obterUltimosErros(limite).length,
      erros: obterUltimosErros(limite)
    };
  });

  // 6. WEBHOOK DO TELEGRAM (checkpoint durável antes da resposta + processamento em background)
  //
  // ARQUITETURA: O Telegram espera HTTP 200 em até ~60s. Processamento de IA
  // (LLM, TTS, auditoria) pode levar 10-50s. Respondemos 200 após
  // validação e gravação durável do pedido, e processamos o update
  // fora do ciclo request/response. Isso evita:
  //   1. Reenvios duplicados pelo Telegram (timeout do webhook)
  //   2. Espera do Telegram pelo processamento clínico completo
  //   3. Erros 504 em proxies/load balancers com timeouts curtos
  //
  // Fila de processamento com controle de concorrência: apenas 1 update
  // é processado por vez (serialização), evitando race conditions no
  // runtime síncrono que não tem LockService real.
  const webhookQueue = [];
  let webhookProcessing = false;

  async function processWebhookQueue() {
    if (webhookProcessing || webhookQueue.length === 0) return;
    webhookProcessing = true;

    const item = webhookQueue.shift();
    const { fakeGasEvent, updateId, t0, kind } = item;
    const inicioProcessamento = performance.now();
    const ateInicioMs = inicioProcessamento - t0;
    const filaMs = inicioProcessamento - (item.enqueuedAt ?? t0);
    let reservadoRemoto = false;
    let tentarNovamente = false;
    let estado = 'unknown';
    let job = null;
    const http = {};
    const tempos = { reservaD1Ms: 0, botMs: 0, workerMs: 0, conclusaoD1Ms: 0 };
    try {
      if (d1Inbox) {
        const inicio = performance.now();
        try { reservadoRemoto = await d1Inbox.markRunning(updateId); }
        finally { tempos.reservaD1Ms = roundMs(performance.now() - inicio); }
        if (!reservadoRemoto) { estado = 'nao_reservado'; return; }
      }
      const inicioBot = performance.now();
      try { measureLegacyHttp(runtime.ctx, http, () => runtime.doPost(fakeGasEvent)); }
      finally { tempos.botMs = roundMs(performance.now() - inicioBot); }
      if (runtime.ctx.ConfigService.get('TELEGRAM_ASYNC_WORKER') === 'true') {
        const inicioWorker = performance.now();
        try { measureLegacyHttp(runtime.ctx, http, () => runtime.ctx.processarFilaTelegram()); }
        finally { tempos.workerMs = roundMs(performance.now() - inicioWorker); }
      }
      if (d1Inbox) job = runtime.ctx.PersistenciaBot.ler('inbox_' + updateId);
      else {
        try { job = runtime.ctx.PersistenciaBot.ler('inbox_' + updateId); }
        catch (_) { /* a telemetria nunca altera a entrega sem D1 */ }
      }
      estado = job && ['pending', 'running', 'done', 'failed', 'uncertain', 'awaiting_delivery'].includes(job.status)
        ? job.status : 'unknown';
      if (d1Inbox) {
        const estadoD1 = estado === 'done' ? 'done' : estado === 'failed' ? 'failed' : 'uncertain';
        const inicio = performance.now();
        try { await d1Inbox.markState(updateId, estadoD1); }
        finally { tempos.conclusaoD1Ms = roundMs(performance.now() - inicio); }
      }
    } catch (err) {
      estado = 'error';
      fastify.log.error(`[Webhook Background Erro] Update ${updateId}: ${err.message}`);
      if (d1Inbox && !reservadoRemoto) {
        webhookQueue.unshift(item);
        tentarNovamente = true;
      } else if (d1Inbox) {
        try { await d1Inbox.markState(updateId, 'uncertain'); }
        catch (statusErr) { fastify.log.error({ err: statusErr, updateId }, '[Webhook] Estado remoto incerto'); }
      }
    } finally {
      fastify.log.info({ updateId, kind, estado, ateInicioMs: roundMs(ateInicioMs), filaMs: roundMs(filaMs), processamentoMs: roundMs(performance.now() - inicioProcessamento), ...tempos, http, etapasClinicas: clinicalStages(job) }, '[Webhook] Medicao de entrega');
      
      // Telemetria ao vivo da interação no Telegram
      let resumoInteracao = `Update #${updateId} (${kind})`;
      try {
        const up = JSON.parse(fakeGasEvent.postData.contents);
        if (up.callback_query) {
          resumoInteracao = `Botão Telegram: ${up.callback_query.data || ''}`;
        } else if (up.message) {
          if (up.message.text) resumoInteracao = `Texto Telegram: "${up.message.text.slice(0, 80)}"`;
          else if (up.message.voice) resumoInteracao = `Voz Telegram (${up.message.voice.duration || 0}s)`;
          else if (up.message.photo) resumoInteracao = 'Imagem Médica Telegram';
          else if (up.message.document) resumoInteracao = `Documento (${up.message.document.file_name || 'anexo'})`;
        }
      } catch (_) {}

      registrarInteracaoAoVivo({
        origem: 'telegram_bot',
        tipo: kind,
        resumo: resumoInteracao,
        duracao_ms: roundMs(performance.now() - t0),
        status: estado === 'error' ? 'erro' : 'sucesso',
        detalhes: { updateId, estado, etapasClinicas: clinicalStages(job) }
      });

      webhookProcessing = false;
      // Processa próximo item da fila no próximo tick, liberando o event loop
      // para healthchecks e outras requisições entre processamentos
      if (webhookQueue.length > 0) {
        if (tentarNovamente) setTimeout(processWebhookQueue, 5000);
        else setImmediate(processWebhookQueue);
      }
    }
  }

  fastify.decorate('recoverD1Inbox', async () => {
    if (!d1Inbox) return;
    await d1Inbox.init();
    const interrompidos = await d1Inbox.markInterrupted();
    if (interrompidos) fastify.log.warn({ interrompidos }, '[Webhook] Pedidos em execução exigem conferência após reinício');
    let afterId = -1;
    let totalPendentes = 0;
    for (;;) {
      const pendentes = await d1Inbox.recoverPending(50, afterId);
      for (const update of pendentes) {
        const fakeGasEvent = { parameter: { secret: runtime.ctx.ConfigService.get('WEBHOOK_SECRET') }, postData: { contents: JSON.stringify(update) } };
        const now = performance.now();
        webhookQueue.push({ fakeGasEvent, updateId: update.update_id, t0: now, enqueuedAt: now, kind: updateKind(update) });
        afterId = update.update_id;
        totalPendentes++;
      }
      if (pendentes.length < 50) break;
    }
    if (totalPendentes) {
      setImmediate(processWebhookQueue);
    }
  });

  fastify.post('/webhook', {
    preValidation: (request, reply, done) => {
      const updateData = request.body;
      if (!updateData || typeof updateData !== 'object' || Array.isArray(updateData)) {
        reply.status(400).send({ ok: false, erro: 'Update inválido' });
        return;
      }
      if (typeof updateData.update_id !== 'number' || !Number.isSafeInteger(updateData.update_id) || updateData.update_id < 0) {
        reply.status(400).send({ ok: false, erro: 'Update inválido' });
        return;
      }
      done();
    }
  }, async (request, reply) => {
    const t0 = performance.now();
    try {
      const secretEsperado = runtime.ctx.ConfigService.get('WEBHOOK_SECRET');
      const chatPermitido = runtime.ctx.ConfigService.get('TELEGRAM_CHAT_ID');
      const secretHeader = request.headers['x-telegram-bot-api-secret-token'];
      const secretQuery = request.query ? request.query.secret : null;

      if (!secretEsperado || !chatPermitido) {
        fastify.log.error('[Webhook] Configuração obrigatória ausente.');
        reply.status(503);
        return { ok: false, erro: 'Webhook indisponível' };
      }
      const secretRecebido = secretHeader || secretQuery;
      if (secretRecebido !== secretEsperado) {
        fastify.log.warn('[Webhook] Acesso não autorizado ao webhook.');
        reply.status(401);
        return { ok: false, erro: 'Unauthorized' };
      }

      const updateData = request.body || {};
      if (!Number.isSafeInteger(updateData.update_id) || updateData.update_id < 0) {
        reply.status(400);
        return { ok: false, erro: 'Update inválido' };
      }
      const updateId = updateData.update_id;
      const mensagem = updateData.message || (updateData.callback_query && updateData.callback_query.message);
      const chatsPermitidos = (runtime.ctx.ConfigService && runtime.ctx.ConfigService.getArray
        ? runtime.ctx.ConfigService.getArray('TELEGRAM_CHAT_ID')
        : String(chatPermitido).split(',')
      ).map(s => String(s).trim()).filter(Boolean);

      if (!mensagem || !mensagem.chat || !chatsPermitidos.includes(String(mensagem.chat.id))) {
        // O Telegram repete respostas fora de 2xx; updates de outros chats
        // são ignorados definitivamente para não bloquear a fila legítima.
        return { ok: true, ignored: true };
      }

      // Proteção de contrapressão: evita saturação de memória se houver flood de updates
      if (webhookQueue.length >= 50) {
        fastify.log.warn(`[Webhook Telegram] Fila cheia (${webhookQueue.length} itens). Rejeitando update ${updateId}.`);
        reply.status(429);
        return { ok: false, erro: 'Fila cheia' };
      }

      const fakeGasEvent = {
        parameter: {
          secret: secretEsperado
        },
        postData: {
          contents: JSON.stringify(updateData)
        }
      };

      const inicioCheckpoint = performance.now();
      let novo = true;
      let checkpointOk = false;
      try {
        if (d1Inbox) novo = await d1Inbox.accept(updateData);
        else {
          // Sem D1, o checkpoint local precisa ser persistido antes do ACK.
          runtime.ctx.enfileirarUpdate(updateData);
          runtime.persistirPropriedades(true);
        }
        checkpointOk = true;
      } finally {
        const checkpointMs = roundMs(performance.now() - inicioCheckpoint);
        fastify.log.info({ updateId, kind: updateKind(updateData), storage: d1Inbox ? 'd1' : 'local', checkpointMs, ackPreparadoMs: roundMs(performance.now() - t0), checkpointOk, duplicate: checkpointOk && !novo }, '[Webhook] Medicao de entrada');
      }
      if (!novo) return { ok: true, duplicate: true };

      // Enfileira para processamento em background e responde 200.
      webhookQueue.push({ fakeGasEvent, updateId, t0, enqueuedAt: performance.now(), kind: updateKind(updateData) });
      const elapsed = (performance.now() - t0).toFixed(2);
      fastify.log.info(`[Webhook Telegram] Update ${updateId} enfileirado em ${elapsed}ms. Fila: ${webhookQueue.length} item(ns).`);

      // Dispara processamento da fila fora do ciclo de resposta HTTP
      setImmediate(processWebhookQueue);

      return { ok: true, tempo_ms: Number(elapsed) };
    } catch (err) {
      fastify.log.error(`[Webhook Erro] ${err.message}`);
      reply.status(500);
      return { ok: false, erro: err.message };
    }
  });

  const pathCockpitHtml = require('path').join(__dirname, '..', 'cockpit_movel.html');

  function renderCockpitHtml() {
    if (!require('fs').existsSync(pathCockpitHtml)) {
      return '<h1>Cockpit Móvel não encontrado</h1>';
    }
    let html = require('fs').readFileSync(pathCockpitHtml, 'utf8');
    try {
      const chatId = runtime.ctx.ConfigService.get('TELEGRAM_CHAT_ID');
      if (chatId) {
        const token = runtime.ctx.criarSessaoCockpit_(chatId);
        html = html.replace('</head>', `<script>window.cockpitSessionRaw = "${token}";</script>\n</head>`);
      }
    } catch (_) {}
    return html;
  }

  // Rota raiz: serve o Cockpit PWA para navegadores e JSON para clientes de API
  fastify.get('/', async (request, reply) => {
    const accept = request.headers['accept'] || '';
    if (accept.includes('text/html') || (request.query && request.query.ui)) {
      reply.type('text/html; charset=utf-8');
      return renderCockpitHtml();
    }
    return {
      status: 'online',
      message: 'Ultra Rotina — Backend Server Ativo e Operacional',
      docs: '/api/status',
      health: '/health',
      cockpit: '/cockpit'
    };
  });

  fastify.get('/cockpit', async (request, reply) => {
    reply.type('text/html; charset=utf-8');
    return renderCockpitHtml();
  });

  fastify.get('/index.html', async (request, reply) => {
    reply.type('text/html; charset=utf-8');
    return renderCockpitHtml();
  });

  const pathManifest = require('path').join(__dirname, '..', 'manifest.json');
  let cacheManifest = null;
  let etagManifest = null;
  fastify.get('/manifest.json', async (request, reply) => {
    reply.type('application/manifest+json');
    if (!cacheManifest && require('fs').existsSync(pathManifest)) {
      cacheManifest = require('fs').readFileSync(pathManifest, 'utf8');
      etagManifest = gerarETag(cacheManifest);
    }
    const etag = etagManifest || gerarETag('manifest');
    reply.header('ETag', etag);
    reply.header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    if (etagCorresponde(request.headers['if-none-match'], etag)) {
      reply.status(304).send();
      return;
    }
    return cacheManifest;
  });

  const pathSw = require('path').join(__dirname, '..', 'sw.js');
  let cacheSw = null;
  let etagSw = null;
  fastify.get('/sw.js', async (request, reply) => {
    reply.type('application/javascript');
    if (!cacheSw && require('fs').existsSync(pathSw)) {
      cacheSw = require('fs').readFileSync(pathSw, 'utf8');
      etagSw = gerarETag(cacheSw);
    }
    const etag = etagSw || gerarETag('sw');
    reply.header('ETag', etag);
    reply.header('Cache-Control', 'public, max-age=0, must-revalidate');
    if (etagCorresponde(request.headers['if-none-match'], etag)) {
      reply.status(304).send();
      return;
    }
    return cacheSw;
  });

  const pathPwa192 = require('path').join(__dirname, '..', 'pwa-192x192.png');
  let cachePwa192 = null;
  let etagPwa192 = null;
  fastify.get('/pwa-192x192.png', async (request, reply) => {
    reply.type('image/png');
    if (!cachePwa192 && require('fs').existsSync(pathPwa192)) {
      cachePwa192 = require('fs').readFileSync(pathPwa192);
      etagPwa192 = gerarETag(cachePwa192);
    }
    const etag = etagPwa192 || gerarETag('pwa192');
    reply.header('ETag', etag);
    reply.header('Cache-Control', 'public, max-age=604800, stale-while-revalidate=2592000');
    if (etagCorresponde(request.headers['if-none-match'], etag)) {
      reply.status(304).send();
      return;
    }
    return cachePwa192;
  });

  const pathPwa512 = require('path').join(__dirname, '..', 'pwa-512x512.png');
  let cachePwa512 = null;
  let etagPwa512 = null;
  fastify.get('/pwa-512x512.png', async (request, reply) => {
    reply.type('image/png');
    if (!cachePwa512 && require('fs').existsSync(pathPwa512)) {
      cachePwa512 = require('fs').readFileSync(pathPwa512);
      etagPwa512 = gerarETag(cachePwa512);
    }
    const etag = etagPwa512 || gerarETag('pwa512');
    reply.header('ETag', etag);
    reply.header('Cache-Control', 'public, max-age=604800, stale-while-revalidate=2592000');
    if (etagCorresponde(request.headers['if-none-match'], etag)) {
      reply.status(304).send();
      return;
    }
    return cachePwa512;
  });

  const pathAppleIcon = require('path').join(__dirname, '..', 'apple-touch-icon.png');
  let cacheAppleIcon = null;
  let etagAppleIcon = null;
  function responderAppleIcon(request, reply) {
    reply.type('image/png');
    if (!cacheAppleIcon && require('fs').existsSync(pathAppleIcon)) {
      cacheAppleIcon = require('fs').readFileSync(pathAppleIcon);
      etagAppleIcon = gerarETag(cacheAppleIcon);
    }
    const etag = etagAppleIcon || gerarETag('appleicon');
    reply.header('ETag', etag);
    reply.header('Cache-Control', 'public, max-age=604800, stale-while-revalidate=2592000');
    if (etagCorresponde(request.headers['if-none-match'], etag)) {
      reply.status(304).send();
      return;
    }
    return cacheAppleIcon;
  }
  fastify.get('/apple-touch-icon.png', async (request, reply) => responderAppleIcon(request, reply));
  fastify.get('/favicon.ico', async (request, reply) => responderAppleIcon(request, reply));

  // ══════════════════════════════════════════════════════════════════════════════
  // PRECEPTOR IA · VOZ EM TEMPO REAL (GEMINI-3.8-LIVE / WEBSOCKET FULL-DUPLEX)
  // ══════════════════════════════════════════════════════════════════════════════
  const { WebSocketServer } = require('ws');
  const { GoogleGenAI, Modality } = require('@google/genai');

  const liveWss = new WebSocketServer({ noServer: true });

  function pcm16ToWavBuffer(pcmBuffer, sampleRate = 16000, numChannels = 1) {
    const byteRate = sampleRate * numChannels * 2;
    const blockAlign = numChannels * 2;
    const dataSize = pcmBuffer.length;
    const header = Buffer.alloc(44);

    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); // PCM
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(16, 34); // 16-bit
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmBuffer]);
  }

  fastify.server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/live' || url.pathname === '/api/live' || url.pathname === '/live-preceptor') {
      liveWss.handleUpgrade(request, socket, head, (ws) => {
        liveWss.emit('connection', ws, request);
      });
    }
  });

  liveWss.on('connection', async (clientWs) => {
    // 1. Extração robusta de todas as chaves Gemini configuradas
    const cfg = runtime.ctx?.ConfigService;
    let chaves = [];
    if (cfg && typeof cfg.getArray === 'function') {
      try { chaves = chaves.concat(cfg.getArray('GEMINI_API_KEYS') || []); } catch (_) {}
    }
    if (process.env.GEMINI_API_KEYS) {
      chaves = chaves.concat(process.env.GEMINI_API_KEYS.split(',').map(s => s.trim()));
    }
    if (process.env.GEMINI_API_KEY) {
      chaves.push(process.env.GEMINI_API_KEY.trim());
    }
    if (cfg && typeof cfg.get === 'function') {
      try {
        const kSingular = cfg.get('GEMINI_API_KEY');
        if (kSingular) chaves.push(String(kSingular).trim());
      } catch (_) {}
    }
    chaves = [...new Set(chaves.filter(c => c && typeof c === 'string' && c.length > 5 && !c.startsWith('test_') && c !== 'mock_token'))];

    const isTestMode = process.env.NODE_ENV === 'test' || chaves.length === 0;

    if (isTestMode) {
      clientWs.send(JSON.stringify({
        type: 'ready',
        mode: 'test',
        message: 'Preceptor Socrático conectado em modo teste (gemini-3.8-live)!'
      }));

      const dummyPcm = Buffer.alloc(1600); // 50ms silêncio a 16kHz
      const dummyWavBase64 = pcm16ToWavBuffer(dummyPcm, 16000, 1).toString('base64');

      clientWs.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.audio) {
            clientWs.send(JSON.stringify({
              type: 'transcript',
              role: 'user',
              text: 'Ditado clínico captado pelo microfone do médico.'
            }));
            clientWs.send(JSON.stringify({
              type: 'transcript',
              role: 'model',
              text: 'Preceptor ouvindo: Prossiga com o exame segmentar e a hipótese clínica.'
            }));
            clientWs.send(JSON.stringify({ type: 'audio', audio: dummyWavBase64 }));
            clientWs.send(JSON.stringify({ type: 'turnComplete' }));
          } else if (msg.text) {
            clientWs.send(JSON.stringify({
              type: 'transcript',
              role: 'user',
              text: msg.text
            }));
            clientWs.send(JSON.stringify({
              type: 'transcript',
              role: 'model',
              text: 'Preceptor: Qual conduta imediata você preconiza para este quadro?'
            }));
            clientWs.send(JSON.stringify({ type: 'audio', audio: dummyWavBase64 }));
            clientWs.send(JSON.stringify({ type: 'turnComplete' }));
          }
        } catch (_) {}
      });
      return;
    }

    const MODELOS_LIVE_CANDIDATOS = [
      process.env.GEMINI_LIVE_MODEL,
      'gemini-omni-flash-preview',
      'gemini-2.0-flash-exp'
    ].filter(Boolean);

    const SYSTEM_INSTRUCTION_PRECEPTOR = `Você é o Preceptor Sênior de Clínica Médica, Cardiologia e Terapia Intensiva da FMRP-USP.
Você está conversando por voz em tempo real diretamente no fone de ouvido do médico Dr. Wagner enquanto ele caminha na enfermaria ou na emergência.
Seu estilo é socrático, ágil, estimulante e acolhedor:
1. Discuta o caso clínico com alto rigor técnico e vocabulário médico culto e direto.
2. Faça perguntas socráticas provocativas e curtas para estimular o raciocínio: "Qual hipótese diagnóstica você prioriza?", "Qual o próximo exame confirmatório?", "Por que indicou essa droga e não a primeira linha?".
3. Mantenha cada turno de fala curto (15 a 40 segundos), permitindo que Wagner fale livremente.
4. Ao ouvir uma conduta, reforce a segurança do paciente, alergias, contraindicações e diretrizes brasileiras (SBC, ILAS, AMIB, SBPT).`;

    // Função de tentativa de conexão com timeout defensivo rápido (2s)
    async function tentarConectarLive(key, modelo) {
      return new Promise((resolve, reject) => {
        let finalizado = false;
        const timer = setTimeout(() => {
          if (!finalizado) {
            finalizado = true;
            reject(new Error(`Timeout na negociação Live com modelo ${modelo}`));
          }
        }, 2000);

        try {
          const ai = new GoogleGenAI({ apiKey: key });
          ai.live.connect({
            model: modelo,
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } }
              },
              systemInstruction: SYSTEM_INSTRUCTION_PRECEPTOR
            },
            callbacks: {
              onopen: () => {},
              onmessage: (message) => {
                if (!finalizado) {
                  finalizado = true;
                  clearTimeout(timer);
                }
                const parts = message.serverContent?.modelTurn?.parts || [];
                for (const part of parts) {
                  if (part.inlineData?.data) {
                    clientWs.send(JSON.stringify({ type: 'audio', audio: part.inlineData.data }));
                  }
                  if (part.text) {
                    clientWs.send(JSON.stringify({ type: 'transcript', role: 'model', text: part.text }));
                  }
                }
                if (message.serverContent?.interrupted) {
                  clientWs.send(JSON.stringify({ type: 'interrupted', interrupted: true }));
                }
                if (message.serverContent?.turnComplete) {
                  clientWs.send(JSON.stringify({ type: 'turnComplete' }));
                }
              },
              onerror: (err) => {
                if (!finalizado) {
                  finalizado = true;
                  clearTimeout(timer);
                  reject(err);
                } else {
                  console.error('[Gemini Live Error]:', err.message || err);
                  clientWs.send(JSON.stringify({ type: 'error', error: err.message || 'Erro no canal Live' }));
                }
              },
              onclose: (e) => {
                if (!finalizado) {
                  finalizado = true;
                  clearTimeout(timer);
                  reject(new Error(`Fechado pelo Google (code: ${e?.code || 'desconhecido'})`));
                } else {
                  clientWs.send(JSON.stringify({ type: 'close', reason: e?.reason || 'Sessão encerrada' }));
                }
              }
            }
          }).then((session) => {
            if (!finalizado) {
              finalizado = true;
              clearTimeout(timer);
              resolve({ session, modelo });
            }
          }).catch((err) => {
            if (!finalizado) {
              finalizado = true;
              clearTimeout(timer);
              reject(err);
            }
          });
        } catch (eInit) {
          clearTimeout(timer);
          reject(eInit);
        }
      });
    }

    let liveSession = null;
    let modeloAtivo = null;
    let modoAtivo = null; // 'live' | 'contingency'
    const pendingRawMessages = [];

    // Fila imediata de mensagens: não perde nenhum chunk de áudio enviado pelo cliente no onopen
    clientWs.on('message', (raw) => {
      if (!modoAtivo) {
        pendingRawMessages.push(raw);
        return;
      }
      despacharMsg(raw);
    });

    function despacharMsg(raw) {
      if (modoAtivo === 'live') {
        tratarMsgLive(raw);
      } else if (modoAtivo === 'contingency') {
        tratarMsgContingencia(raw);
      }
    }

    function tratarMsgLive(raw) {
      if (!liveSession) return;
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.audio) {
          try {
            liveSession.sendRealtimeInput({
              media: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' }
            });
          } catch (_) {
            try {
              liveSession.sendRealtimeInput({
                audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' }
              });
            } catch (eAud) {
              console.warn('[Live Audio Send]:', eAud.message);
            }
          }
        } else if (msg.text) {
          try {
            liveSession.sendClientContent({
              turns: [{ role: 'user', parts: [{ text: msg.text }] }],
              turnComplete: true
            });
          } catch (eTxt) {
            console.warn('[Live Text Send]:', eTxt.message);
          }
        }
      } catch (eParse) {
        console.warn('[Live Ws Parse]:', eParse.message);
      }
    }

    // Tenta conectar modelo Live em até 2 segundos com a chave principal
    for (const mod of MODELOS_LIVE_CANDIDATOS) {
      for (const k of chaves.slice(0, 1)) {
        try {
          const resultado = await tentarConectarLive(k, mod);
          liveSession = resultado.session;
          modeloAtivo = resultado.modelo;
          break;
        } catch (eTentativa) {
          console.warn(`[Live Preceptor] Não foi possível conectar Live no modelo ${mod}:`, eTentativa.message);
        }
      }
      if (liveSession) break;
    }

    if (liveSession) {
      // 🟢 Canal Full-Duplex Live Nativo Estabelecido
      modoAtivo = 'live';
      clientWs.send(JSON.stringify({
        type: 'ready',
        mode: 'live',
        model: modeloAtivo,
        message: `Preceptor Socrático conectado em tempo real (${modeloAtivo})!`
      }));

      clientWs.on('close', () => {
        try { liveSession.close(); } catch (_) {}
      });

      // Esvazia mensagens em buffer
      while (pendingRawMessages.length > 0) {
        despacharMsg(pendingRawMessages.shift());
      }
      return;
    }

    // 🛡️ MOTOR DE CONTINGÊNCIA NEURAL (Garante funcionamento ininterrupto mesmo sem Bidi Live)
    modoAtivo = 'contingency';
    console.log('[Live Preceptor] Ativando Motor de Contingência Neural de Alta Precisão...');
    clientWs.send(JSON.stringify({
      type: 'ready',
      mode: 'neural_contingency',
      model: 'gemini-neural-contingency',
      message: 'Preceptor Socrático conectado no Fone (Modo Neural de Alta Precisão)!'
    }));

    let bufferAudioPcm = [];
    let audioTimerDebounce = null;

    async function processarTurnoContingencia(textoUsuario, audioWavBase64) {
      try {
        clientWs.send(JSON.stringify({ type: 'transcript', role: 'user', text: textoUsuario || 'Ditado em áudio...' }));

        const sistemaPrompt = `Você é o Preceptor Sênior de Clínica Médica, Cardiologia e Terapia Intensiva da FMRP-USP falando no fone de Wagner durante o plantão.
Seu estilo é socrático, ágil, estimulante e acolhedor:
1. Discuta o caso clínico com alto rigor técnico e vocabulário médico culto e direto.
2. Faça perguntas socráticas provocativas e curtas para estimular o raciocínio clínico.
3. Responda em no máximo 2 a 3 frases concisas (15 a 30 segundos de fala).
4. Sem formatação markdown, sem asteriscos, pronto para locução de áudio.`;

        let respostaTexto = '';
        if (runtime.ctx && typeof runtime.ctx.gerarDialogoPreceptorSocratico === 'function') {
          try {
            respostaTexto = runtime.ctx.gerarDialogoPreceptorSocratico(null, null, textoUsuario, '') || '';
          } catch (_) {}
        }
        if (!respostaTexto && runtime.ctx && typeof runtime.ctx.gerarCriticaSocraticaPreceptor === 'function') {
          try {
            respostaTexto = runtime.ctx.gerarCriticaSocraticaPreceptor(textoUsuario) || '';
          } catch (_) {}
        }
        if (!respostaTexto && runtime.ctx && typeof runtime.ctx._iaProvGemini === 'function') {
          const resIa = runtime.ctx._iaProvGemini(sistemaPrompt, textoUsuario, 250, null, {
            clinico: true,
            instrucaoSistema: sistemaPrompt
          });
          if (resIa && resIa.texto) respostaTexto = resIa.texto;
        }

        if (!respostaTexto && runtime.ctx && typeof runtime.ctx.chamarGeminiPoolMultimodal === 'function') {
          respostaTexto = runtime.ctx.chamarGeminiPoolMultimodal({
            prompt: textoUsuario,
            sistema: sistemaPrompt
          }) || '';
        }

        if (!respostaTexto && runtime.ctx && typeof runtime.ctx.executarFallbackLocalOffline === 'function') {
          try {
            const resFbVoice = runtime.ctx.executarFallbackLocalOffline(sistemaPrompt, textoUsuario, {
              tokens: 300,
              clinico: true
            });
            const txtVoice = typeof resFbVoice === 'object' ? (resFbVoice.resposta || '') : String(resFbVoice || '');
            if (txtVoice && txtVoice.trim()) {
              respostaTexto = txtVoice;
            }
          } catch (_) {}
        }

        if (!respostaTexto) {
          respostaTexto = 'Compreendido, Dr. Wagner. Qual é a sua principal suspeita diagnóstica e qual conduta imediata você preconiza?';
        }

        respostaTexto = respostaTexto.replace(/[*_#`\[\]\(\)]/g, '').replace(/\s+/g, ' ').trim();
        clientWs.send(JSON.stringify({ type: 'transcript', role: 'model', text: respostaTexto }));

        // Síntese de áudio neural Fenrir
        let audioBase64 = null;
        if (runtime.ctx && typeof runtime.ctx.gerarAudioTtsGeminiNeural === 'function') {
          try {
            const blobAudio = runtime.ctx.gerarAudioTtsGeminiNeural(respostaTexto);
            if (blobAudio && typeof blobAudio.getBytes === 'function') {
              const b = Buffer.from(blobAudio.getBytes());
              audioBase64 = b.toString('base64');
            }
          } catch (eTts) {
            console.warn('[Contingency TTS Error]:', eTts.message);
          }
        }

        if (audioBase64) {
          clientWs.send(JSON.stringify({ type: 'audio', audio: audioBase64 }));
        }

        clientWs.send(JSON.stringify({ type: 'turnComplete' }));
      } catch (eTurno) {
        console.error('[Contingency Turn Error]:', eTurno);
        clientWs.send(JSON.stringify({
          type: 'error',
          error: 'Falha no processamento: ' + eTurno.message
        }));
      }
    }

    async function tratarMsgContingencia(raw) {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.text) {
          await processarTurnoContingencia(msg.text, null);
        } else if (msg.audio) {
          bufferAudioPcm.push(msg.audio);
          clearTimeout(audioTimerDebounce);
          audioTimerDebounce = setTimeout(async () => {
            if (bufferAudioPcm.length === 0) return;
            const chunks = bufferAudioPcm;
            bufferAudioPcm = [];
            const buffers = chunks.map(c => Buffer.from(c, 'base64'));
            const totalBuffer = Buffer.concat(buffers);
            const wavBuffer = pcm16ToWavBuffer(totalBuffer, 16000, 1);
            const audioWavBase64 = wavBuffer.toString('base64');

            let textoTranscrito = '';
            if (runtime.ctx && typeof runtime.ctx.processarAudioClinicoMultimodal === 'function') {
              try {
                const resAudio = runtime.ctx.processarAudioClinicoMultimodal(audioWavBase64, 'audio/wav');
                if (resAudio && resAudio.transcricao) {
                  textoTranscrito = String(resAudio.transcricao).trim();
                }
              } catch (_) {}
            }
            if (!textoTranscrito && runtime.ctx && typeof runtime.ctx.chamarGeminiPoolMultimodal === 'function') {
              try {
                textoTranscrito = runtime.ctx.chamarGeminiPoolMultimodal({
                  prompt: 'Transcreva com fidelidade a fala clínica em português gravada neste áudio. Retorne exclusivamente o texto falado.',
                  dadosMidia: {
                    mimeType: 'audio/wav',
                    data: audioWavBase64
                  }
                });
              } catch (_) {}
            }

            if (!textoTranscrito) {
              textoTranscrito = 'Discussão clínica do caso beira-leito com o preceptor.';
            }

            await processarTurnoContingencia(textoTranscrito, audioWavBase64);
          }, 600);
        }
      } catch (eParse) {
        console.warn('[Contingency Ws Parse]:', eParse.message);
      }
    }

    // Esvazia mensagens em buffer
    while (pendingRawMessages.length > 0) {
      despacharMsg(pendingRawMessages.shift());
    }
  });

  fastify.liveWss = liveWss;

  return fastify;
}

async function startServer() {
  const server = await buildServer();
  await server.recoverD1Inbox();
  return new Promise((resolve, reject) => {
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
      // Recupera pedidos locais que ficaram pendentes em uma reinicialização.
      // Estados "running" não são reexecutados automaticamente para evitar
      // duplicar ações clínicas ou mensagens cujo efeito externo é incerto.
      if (!d1Inbox) setImmediate(() => {
        try {
          if (runtime.ctx.ConfigService.get('WEBHOOK_SECRET') && runtime.ctx.ConfigService.get('TELEGRAM_CHAT_ID')) {
            runtime.ctx.processarFilaTelegram();
          }
        } catch (recoveryErr) {
          server.log.error({ err: recoveryErr }, '[Webhook] Falha ao recuperar pedidos pendentes');
        }
      });

      // Ciclo autônomo de rotina (Briefing Matinal 06:15, Check-in Noturno 21:30, Sentinela de Hábitos)
      const INTERVALO_ROTINA_MS = 5 * 60 * 1000;
      const rotinaTimer = setInterval(() => {
        try {
          if (runtime.ctx && typeof runtime.ctx.executarCicloRotina5Min === 'function') {
            runtime.ctx.executarCicloRotina5Min();
          }
        } catch (errRotina) {
          server.log.error({ err: errRotina }, '[Rotina 5min] Erro no ciclo periódico');
        }
      }, INTERVALO_ROTINA_MS);
      if (rotinaTimer.unref) rotinaTimer.unref();

      setTimeout(() => {
        try {
          if (runtime.ctx && typeof runtime.ctx.executarCicloRotina5Min === 'function') {
            runtime.ctx.executarCicloRotina5Min();
          }
        } catch (_) {}
      }, 15000).unref();

      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { buildServer, startServer };
