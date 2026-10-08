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
const { createD1Inbox } = require('./d1-inbox');
const { roundMs, updateKind, measureLegacyHttp, clinicalStages } = require('./telemetry');
const d1Inbox = createD1Inbox();

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function buildServer() {
  // 1. CORS para permitir chamadas do Cockpit PWA (GitHub Pages e local)
  await fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Telegram-Bot-Api-Secret-Token']
  });

  let pingTracker = {
    total: 0,
    lastPing: null,
    lastUserAgent: null
  };

  // 2. Healthcheck & Keep-Alive (Evita hibernação no Render Free)
  fastify.get('/health', async (request, reply) => {
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
        memoria_mb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
        pings_received: pingTracker.total,
        last_ping_time: pingTracker.lastPing,
        last_ping_from: pingTracker.lastUserAgent
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

  // 4.1 Catálogo de Aulas Flash R1 (cacheado em memória para o Cockpit)
  const pathAulas = require('path').join(__dirname, '..', 'src', 'data', 'aulas_compactas.json');
  let cacheAulasJson = null;
  fastify.get('/api/aulas-flash', async (request, reply) => {
    try {
      if (!cacheAulasJson && require('fs').existsSync(pathAulas)) {
        cacheAulasJson = JSON.parse(require('fs').readFileSync(pathAulas, 'utf8'));
      }
      reply.header('Cache-Control', 'public, max-age=3600');
      return { ok: true, total: cacheAulasJson ? cacheAulasJson.length : 0, aulas: cacheAulasJson || [] };
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

  fastify.post('/webhook', async (request, reply) => {
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
      if (!mensagem || !mensagem.chat || String(mensagem.chat.id) !== String(chatPermitido)) {
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

  fastify.get('/manifest.json', async (request, reply) => {
    reply.type('application/manifest+json');
    const pathManifest = require('path').join(__dirname, '..', 'manifest.json');
    return require('fs').readFileSync(pathManifest, 'utf8');
  });

  fastify.get('/sw.js', async (request, reply) => {
    reply.type('application/javascript');
    const pathSw = require('path').join(__dirname, '..', 'sw.js');
    return require('fs').readFileSync(pathSw, 'utf8');
  });

  fastify.get('/pwa-192x192.png', async (request, reply) => {
    reply.type('image/png');
    const pathImg = require('path').join(__dirname, '..', 'pwa-192x192.png');
    return require('fs').readFileSync(pathImg);
  });

  fastify.get('/pwa-512x512.png', async (request, reply) => {
    reply.type('image/png');
    const pathImg = require('path').join(__dirname, '..', 'pwa-512x512.png');
    return require('fs').readFileSync(pathImg);
  });

  fastify.get('/apple-touch-icon.png', async (request, reply) => {
    reply.type('image/png');
    const pathImg = require('path').join(__dirname, '..', 'apple-touch-icon.png');
    return require('fs').readFileSync(pathImg);
  });

  fastify.get('/favicon.ico', async (request, reply) => {
    reply.type('image/png');
    const pathImg = require('path').join(__dirname, '..', 'apple-touch-icon.png');
    return require('fs').readFileSync(pathImg);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // PRECEPTOR IA · VOZ EM TEMPO REAL (GEMINI-3.8-LIVE / WEBSOCKET FULL-DUPLEX)
  // ══════════════════════════════════════════════════════════════════════════════
  const { WebSocketServer } = require('ws');
  const { GoogleGenAI, Modality } = require('@google/genai');

  const liveWss = new WebSocketServer({ noServer: true });

  fastify.server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/live' || url.pathname === '/api/live' || url.pathname === '/live-preceptor') {
      liveWss.handleUpgrade(request, socket, head, (ws) => {
        liveWss.emit('connection', ws, request);
      });
    }
  });

  liveWss.on('connection', async (clientWs) => {
    const apiKey = process.env.GEMINI_API_KEY ||
      (process.env.GEMINI_API_KEYS ? process.env.GEMINI_API_KEYS.split(',')[0].trim() : '') ||
      (runtime.ctx?.ConfigService?.get?.('GEMINI_API_KEY') || '');

    const isTestMode = process.env.NODE_ENV === 'test' || !apiKey || apiKey.startsWith('test_') || apiKey === 'mock_token';

    if (isTestMode) {
      clientWs.send(JSON.stringify({
        type: 'ready',
        message: 'Preceptor Socrático conectado em modo teste (gemini-3.8-live)!'
      }));

      clientWs.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.audio) {
            clientWs.send(JSON.stringify({
              type: 'transcript',
              role: 'model',
              text: 'Preceptor ouvindo: Prossiga com o exame segmentar e a hipótese.'
            }));
            clientWs.send(JSON.stringify({ type: 'turnComplete' }));
          } else if (msg.text) {
            clientWs.send(JSON.stringify({
              type: 'transcript',
              role: 'model',
              text: 'Preceptor: Qual conduta imediata você preconiza para este quadro?'
            }));
            clientWs.send(JSON.stringify({ type: 'turnComplete' }));
          }
        } catch (_) {}
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } }
          },
          systemInstruction: `Você é o Preceptor Sênior de Clínica Médica, Cardiologia e Terapia Intensiva da FMRP-USP.
Você está conversando por voz em tempo real diretamente no fone de ouvido do médico Dr. Wagner enquanto ele caminha na enfermaria ou na emergência.
Seu estilo é socrático, ágil, estimulante e acolhedor:
1. Discuta o caso clínico com alto rigor técnico e vocabulário médico culto e direto.
2. Faça perguntas socráticas provocativas e curtas para estimular o raciocínio: "Qual hipótese diagnóstica você prioriza?", "Qual o próximo exame confirmatório?", "Por que indicou essa droga e não a primeira linha?".
3. Mantenha cada turno de fala curto (15 a 40 segundos), permitindo que Wagner fale livremente.
4. Ao ouvir uma conduta, reforce a segurança do paciente, alergias, contraindicações e diretrizes brasileiras (SBC, ILAS, AMIB, SBPT).`
        },
        callbacks: {
          onmessage: (message) => {
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
            console.error('[Gemini Live Error]:', err.message || err);
            clientWs.send(JSON.stringify({ type: 'error', error: err.message || 'Erro no Gemini Live' }));
          },
          onclose: () => {
            clientWs.send(JSON.stringify({ type: 'close' }));
          }
        }
      });

      clientWs.send(JSON.stringify({
        type: 'ready',
        message: 'Preceptor Socrático conectado em tempo real (gemini-3.8-live)!'
      }));

      clientWs.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.audio) {
            session.sendRealtimeInput({
              audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' }
            });
          } else if (msg.text) {
            session.sendRealtimeInput({ text: msg.text });
          }
        } catch (eParse) {
          console.warn('[Live Ws Parse]:', eParse.message);
        }
      });

      clientWs.on('close', () => {
        if (session && typeof session.close === 'function') {
          try { session.close(); } catch (_) {}
        }
      });

    } catch (errLive) {
      console.error('[Gemini Live Setup Error]:', errLive.message || errLive);
      clientWs.send(JSON.stringify({
        type: 'error',
        error: 'Não foi possível conectar ao Gemini Live: ' + (errLive.message || 'Verifique a chave')
      }));
      clientWs.close();
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
