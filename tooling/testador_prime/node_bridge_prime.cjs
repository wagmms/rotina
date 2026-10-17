#!/usr/bin/env node
/**
 * ==============================================================================
 * ULTRA ROTINA · TESTADOR PRIME 2.0: NODE RUNTIME & FASTIFY BRIDGE
 * ==============================================================================
 * Ponte de alta performance em memória para testes unificados do Telegram Bot
 * e do Cockpit Fastify (app.inject + Runtime Interceptor).
 * Proibição estrita de Google Apps Script — 100% Node.js 20+ Nativo.
 * ==============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { performance } = require('perf_hooks');

const ROOT_DIR = path.resolve(__dirname, '../..');

// Redireciona console.log para stderr para manter stdout 100% puro para JSON-RPC
console.log = (...args) => {
  process.stderr.write(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n');
};

// Configura variáveis de ambiente seguras para o modo de teste
process.env.NODE_ENV = 'test';
process.env.DRY_RUN = 'true';
process.env.TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '1771571035';
process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'test_bot_token_prime_2025';
process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'prime_webhook_secret_2025';
process.env.COCKPIT_API_TOKEN = process.env.COCKPIT_API_TOKEN || 'prime-test-token-2025';

let fastifyApp = null;
let runtime = null;
let ctx = null;
let CHAT_ID = '1771571035';

let lastMessageId = 1000;
let mensagensCapturadas = [];
let callbacksRespondidos = [];
let lastReplyMarkup = null;

function formatarBotoesTeclado(replyMarkup) {
  if (!replyMarkup) return [];
  const rows = replyMarkup.inline_keyboard || replyMarkup.keyboard || [];
  const resultado = [];
  rows.forEach((row, rowIdx) => {
    if (Array.isArray(row)) {
      row.forEach((btn, colIdx) => {
        resultado.push({
          text: String(btn.text || ''),
          callback_data: String(btn.callback_data || btn.url || ''),
          row: rowIdx,
          col: colIdx,
          row_size: row.length
        });
      });
    }
  });
  return resultado;
}

function setupTelegramInterception() {
  if (!ctx) return;

  ctx.enviarMensagemParaChat = (id, texto) => {
    lastMessageId++;
    mensagensCapturadas.push({
      id: lastMessageId,
      tipo: 'texto',
      chat_id: id,
      texto: String(texto || ''),
      buttons: []
    });
    return true;
  };

  ctx.enviarMensagemComTecladoParaChat = (id, texto, kb) => {
    lastMessageId++;
    lastReplyMarkup = kb;
    const botoesFormatados = formatarBotoesTeclado(kb);
    mensagensCapturadas.push({
      id: lastMessageId,
      tipo: 'teclado',
      chat_id: id,
      texto: String(texto || ''),
      buttons: botoesFormatados,
      raw_markup: kb
    });
    return true;
  };

  ctx.executarPostTelegram = (url, payload) => {
    if (payload) {
      lastMessageId++;
      if (payload.reply_markup) lastReplyMarkup = payload.reply_markup;
      const botoesFormatados = formatarBotoesTeclado(payload.reply_markup || lastReplyMarkup);
      mensagensCapturadas.push({
        id: lastMessageId,
        tipo: payload.text ? 'edit' : 'edit_markup',
        chat_id: payload.chat_id,
        texto: String(payload.text || 'Teclado atualizado com sucesso'),
        buttons: botoesFormatados,
        raw_markup: payload.reply_markup || lastReplyMarkup
      });
    }
    return true;
  };

  ctx.responderCallbackTelegram = (id, texto) => {
    callbacksRespondidos.push({ id, texto: String(texto || '') });
    return true;
  };

  ctx.enviarChatAction = () => true;
  ctx.chamarGeminiPoolMultimodal = () => null;
  ctx.processarAudioClinicoMultimodal = () => null;

  ctx.processarEEntregarIA = (chatId, fn, texto, modo) => {
    lastMessageId++;
    const resp = `🩺 *Conduta Clínica Simulada (${modo || 'clínica'})*\nAnálise beira-leito gerada com sucesso para: ${String(texto).slice(0, 100)}...`;
    mensagensCapturadas.push({
      id: lastMessageId,
      tipo: 'texto',
      chat_id: chatId,
      texto: resp,
      buttons: []
    });
    return true;
  };
}

async function initEngines() {
  // 1. Carrega runtime oficial
  try {
    runtime = require(path.join(ROOT_DIR, 'server/runtime.js'));
    ctx = runtime.ctx;
    if (ctx && ctx.ConfigService) {
      CHAT_ID = String(ctx.ConfigService.get('TELEGRAM_CHAT_ID') || '1771571035').split(',')[0].trim();
      ctx.PropertiesService.getScriptProperties().setProperty('TELEGRAM_CHAT_ID', CHAT_ID);
      ctx.PropertiesService.getScriptProperties().setProperty('TELEGRAM_BOT_TOKEN', process.env.TELEGRAM_BOT_TOKEN);
      ctx.PropertiesService.getScriptProperties().setProperty('WEBHOOK_SECRET', process.env.WEBHOOK_SECRET);
    }
    setupTelegramInterception();
  } catch (err) {
    process.stderr.write(`[BRIDGE_WARN] Falha ao carregar runtime: ${err.message}\n`);
  }

  // 2. Carrega Fastify App para testes de API/RPC em memória
  try {
    const serverModule = require(path.join(ROOT_DIR, 'server/index.js'));
    const buildApp = serverModule.buildServer || serverModule.buildApp || serverModule;
    if (typeof buildApp === 'function') {
      fastifyApp = await buildApp();
      await fastifyApp.ready();
    }
  } catch (err) {
    process.stderr.write(`[BRIDGE_WARN] Falha ao carregar Fastify: ${err.message}\n`);
  }
}

async function handleTelegramStep(action) {
  mensagensCapturadas = [];
  callbacksRespondidos = [];
  const t0 = performance.now();
  let errorMsg = null;

  try {
    if (action.type === 'callback') {
      const fakeCb = {
        id: 'cb_' + Date.now(),
        data: action.data || '',
        from: { id: CHAT_ID, first_name: 'Dr. Prime (Testador)' },
        message: {
          message_id: action.message_id || lastMessageId,
          chat: { id: CHAT_ID },
          date: Math.floor(Date.now() / 1000),
          reply_markup: lastReplyMarkup
        }
      };

      if (ctx && typeof ctx.processarCallbackBotao === 'function') {
        ctx.processarCallbackBotao(fakeCb);
      } else {
        throw new Error('Função ctx.processarCallbackBotao indisponível.');
      }
    } else {
      const texto = String(action.text || '/start');
      const fakeMsg = {
        message_id: ++lastMessageId,
        chat: { id: CHAT_ID },
        from: { id: CHAT_ID, first_name: 'Dr. Prime (Testador)' },
        text: texto,
        date: Math.floor(Date.now() / 1000)
      };

      if (ctx && typeof ctx.processarMensagemTexto === 'function') {
        ctx.processarMensagemTexto(fakeMsg);
      } else {
        throw new Error('Função ctx.processarMensagemTexto indisponível.');
      }
    }
  } catch (err) {
    errorMsg = `${err.name}: ${err.message}\n${err.stack || ''}`;
  }

  const latencyMs = Number((performance.now() - t0).toFixed(2));
  const messages = mensagensCapturadas.map(m => m.texto).filter(Boolean);
  const inlineButtons = [];

  for (const m of mensagensCapturadas) {
    if (Array.isArray(m.buttons)) {
      inlineButtons.push(...m.buttons);
    }
  }

  return {
    ok: !errorMsg,
    latency_ms: latencyMs,
    messages,
    full_text: messages.join('\n\n'),
    buttons: inlineButtons,
    error: errorMsg
  };
}

async function handleCockpitHttp(action) {
  const t0 = performance.now();
  if (!fastifyApp) {
    return {
      ok: false,
      status: 503,
      latency_ms: 0,
      error: 'Fastify App não inicializado na ponte Node.js.'
    };
  }

  const method = (action.method || 'GET').toUpperCase();
  const url = action.url || '/health';
  const headers = Object.assign({ 'content-type': 'application/json' }, action.headers || {});

  let sessionToken = '';
  if (ctx && typeof ctx.criarSessaoCockpit_ === 'function') {
    try {
      sessionToken = ctx.criarSessaoCockpit_(CHAT_ID);
    } catch (_) {}
  }

  let payload = action.payload;
  if (action.auth !== false && method !== 'GET') {
    if (payload && typeof payload === 'object' && !payload.session && sessionToken) {
      payload.session = sessionToken;
    }
  }

  try {
    const injectOpts = { method, url, headers };
    if (payload && method !== 'GET') {
      injectOpts.payload = payload;
    }

    const res = await fastifyApp.inject(injectOpts);
    const latencyMs = Number((performance.now() - t0).toFixed(2));
    let parsedBody = res.body;
    try {
      parsedBody = JSON.parse(res.body);
    } catch (_) {
      // Deixa como string caso seja HTML ou texto
    }

    return {
      ok: res.statusCode >= 200 && res.statusCode < 400,
      status: res.statusCode,
      latency_ms: latencyMs,
      body: parsedBody,
      headers: res.headers,
      error: null
    };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      latency_ms: Number((performance.now() - t0).toFixed(2)),
      body: null,
      error: `${err.name}: ${err.message}`
    };
  }
}

async function main() {
  await initEngines();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  // Sinaliza inicialização concluída
  process.stdout.write(JSON.stringify({
    ready: true,
    fastify: Boolean(fastifyApp),
    runtime: Boolean(ctx)
  }) + '\n');

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let req;
    try {
      req = JSON.parse(trimmed);
    } catch (err) {
      process.stdout.write(JSON.stringify({ ok: false, error: 'JSON inválido.' }) + '\n');
      continue;
    }

    if (req.cmd === 'EXIT') {
      if (fastifyApp) {
        try { await fastifyApp.close(); } catch (_) {}
      }
      process.exit(0);
    } else if (req.cmd === 'TELEGRAM') {
      const result = await handleTelegramStep(req);
      process.stdout.write(JSON.stringify(result) + '\n');
    } else if (req.cmd === 'COCKPIT_HTTP') {
      const result = await handleCockpitHttp(req);
      process.stdout.write(JSON.stringify(result) + '\n');
    } else {
      process.stdout.write(JSON.stringify({ ok: false, error: `Comando desconhecido: ${req.cmd}` }) + '\n');
    }
  }
}

main().catch((err) => {
  process.stderr.write(`[BRIDGE_FATAL] ${err.stack || err.message}\n`);
  process.exit(1);
});
