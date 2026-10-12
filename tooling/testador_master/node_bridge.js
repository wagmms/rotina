/**
 * ==============================================================================
 * ULTRA ROTINA · TESTADOR MASTER: NODE RUNTIME BRIDGE
 * ==============================================================================
 * Fornece interface JSON-RPC via stdin/stdout para o Testador Master (Python)
 * interagir diretamente com o runtime em memória do Ultra Rotina (77 módulos),
 * processando comandos slash, mensagens de texto e callbacks de botões inline.
 * ==============================================================================
 */

const readline = require('readline');
const path = require('path');

// Carrega o runtime oficial
const ROOT_DIR = path.resolve(__dirname, '../../');
const runtime = require(path.join(ROOT_DIR, 'server/runtime.js'));
const ctx = runtime.ctx;

// Identificadores de teste
const CHAT_ID = (ctx.ConfigService && ctx.ConfigService.getPrimary)
  ? ctx.ConfigService.getPrimary('TELEGRAM_CHAT_ID')
  : (ctx.ConfigService ? String(ctx.ConfigService.get('TELEGRAM_CHAT_ID') || '123456789').split(',')[0].trim() : '123456789');

let lastMessageId = 1000;
let mensagensCapturadas = [];
let callbacksRespondidos = [];

// Intercepta envio de mensagens
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
  if (payload && payload.text) {
    lastMessageId++;
    const botoesFormatados = formatarBotoesTeclado(payload.reply_markup);
    mensagensCapturadas.push({
      id: lastMessageId,
      tipo: 'edit',
      chat_id: payload.chat_id,
      texto: String(payload.text || ''),
      buttons: botoesFormatados,
      raw_markup: payload.reply_markup
    });
  }
  return true;
};

ctx.responderCallbackTelegram = (id, texto) => {
  callbacksRespondidos.push({ id, texto: String(texto || '') });
  return true;
};

function formatarBotoesTeclado(replyMarkup) {
  if (!replyMarkup) return [];
  const rows = replyMarkup.inline_keyboard || replyMarkup.keyboard || [];
  const resultado = [];
  for (const row of rows) {
    const rowBtns = [];
    for (const b of row) {
      rowBtns.push({
        text: b.text || '',
        callback_data: b.callback_data || '',
        url: b.url || ''
      });
    }
    if (rowBtns.length > 0) resultado.push(rowBtns);
  }
  return resultado;
}

function processarComandoOuTexto(texto) {
  mensagensCapturadas = [];
  callbacksRespondidos = [];
  const inicio = Date.now();

  try {
    const fakeMsg = {
      message_id: ++lastMessageId,
      chat: { id: CHAT_ID },
      from: { id: CHAT_ID, first_name: 'Dr. Wagner (Testador Master)' },
      text: texto,
      date: Math.floor(inicio / 1000)
    };

    if (typeof ctx.processarMensagemTexto === 'function') {
      ctx.processarMensagemTexto(fakeMsg);
    }
  } catch (err) {
    return {
      ok: false,
      erro: err.message,
      stack: err.stack,
      tempo_ms: Date.now() - inicio,
      mensagens: []
    };
  }

  const fim = Date.now();
  return {
    ok: true,
    tempo_ms: fim - inicio,
    mensagens: mensagensCapturadas,
    callbacks: callbacksRespondidos
  };
}

function processarCallback(callbackData, msgId) {
  mensagensCapturadas = [];
  callbacksRespondidos = [];
  const inicio = Date.now();

  try {
    const fakeCb = {
      id: 'cb_' + Date.now(),
      data: callbackData,
      from: { id: CHAT_ID, first_name: 'Dr. Wagner (Testador Master)' },
      message: {
        message_id: msgId || lastMessageId,
        chat: { id: CHAT_ID },
        date: Math.floor(inicio / 1000)
      }
    };

    if (typeof ctx.processarCallbackBotao === 'function') {
      ctx.processarCallbackBotao(fakeCb);
    }
  } catch (err) {
    return {
      ok: false,
      erro: err.message,
      stack: err.stack,
      tempo_ms: Date.now() - inicio,
      mensagens: []
    };
  }

  const fim = Date.now();
  return {
    ok: true,
    tempo_ms: fim - inicio,
    mensagens: mensagensCapturadas,
    callbacks: callbacksRespondidos
  };
}

// Loop de escuta JSON-RPC via stdin
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const req = JSON.parse(trimmed);
    let resp = null;

    if (req.action === 'send') {
      resp = processarComandoOuTexto(req.text);
    } else if (req.action === 'click') {
      if (!req.callback_data && req.rotulo) {
        resp = processarComandoOuTexto(req.rotulo);
      } else {
        resp = processarCallback(req.callback_data, req.message_id);
      }
    } else if (req.action === 'ping') {
      resp = { ok: true, status: 'online', modulos_carregados: 77 };
    } else {
      resp = { ok: false, erro: 'Ação desconhecida: ' + req.action };
    }

    resp.req_id = req.req_id;
    console.log(JSON.stringify(resp));
  } catch (err) {
    console.log(JSON.stringify({ ok: false, erro: 'JSON parse error: ' + err.message }));
  }
});
