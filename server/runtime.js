/**
 * ==============================================================================
 * ULTRA ROTINA · NODE.JS PRODUCTION RUNTIME BRIDGE (GAS COMPATIBILITY)
 * ==============================================================================
 * Fornece compatibilidade transparente e nativa para executar os módulos de src/*.js
 * no Node.js v20+ com máxima performance, I/O assíncrono e zero latência.
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const syncFetch = require('sync-fetch');
const { Worker } = require('worker_threads');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = process.env.BOT_DATA_DIR ? path.resolve(process.env.BOT_DATA_DIR) : path.resolve(ROOT_DIR, 'data');
const SRC_DIR = path.resolve(ROOT_DIR, 'src');
const PROPERTIES_FILE = path.join(DATA_DIR, 'properties.json');
const DEPLOY_STATE_FILE = path.join(ROOT_DIR, '.deploy_state.json');
const REMUME_CSV_FILE = path.join(ROOT_DIR, 'REMUME_RP.csv');
const INTERACOES_JSON_FILE = path.join(DATA_DIR, 'interacoes.json');
const INTERACOES_SRC_JSON_FILE = path.join(SRC_DIR, 'data', 'interacoes.json');
const GUIA_HSL_SRC_JSON_FILE = path.join(SRC_DIR, 'data', 'guia_farmaceutico_hsl.json');
const GUIA_HSL_DATA_JSON_FILE = path.join(DATA_DIR, 'guia_farmaceutico_hsl.json');
const GUIA_PEDB_SRC_JSON_FILE = path.join(SRC_DIR, 'data', 'guia_pediatrico_pedb.json');
const GUIA_PEDB_DATA_JSON_FILE = path.join(DATA_DIR, 'guia_pediatrico_pedb.json');
const CONDUTAS_PEDB_SRC_JSON_FILE = path.join(SRC_DIR, 'data', 'condutas_pediatricas_pedb.json');
const CONDUTAS_PEDB_DATA_JSON_FILE = path.join(DATA_DIR, 'condutas_pediatricas_pedb.json');

// Garante que o diretório de dados persistentes exista
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 1. CARREGAMENTO INICIAL DE PROPRIEDADES (process.env > properties.json > .deploy_state.json)
let propsStore = {};

// Carrega .deploy_state.json se existir
if (fs.existsSync(DEPLOY_STATE_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(DEPLOY_STATE_FILE, 'utf8'));
    if (raw && raw.config) {
      propsStore = { ...raw.config };
    }
  } catch (e) {
    console.warn('[Runtime] Falha ao carregar .deploy_state.json:', e.message);
  }
}

// Carrega properties.json persistido
if (fs.existsSync(PROPERTIES_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(PROPERTIES_FILE, 'utf8'));
    propsStore = { ...propsStore, ...saved };
  } catch (e) {
    console.warn('[Runtime] Falha ao ler properties.json:', e.message);
  }
}

const ENV_BLOCKLIST = new Set([
  'CF_D1_API_TOKEN', 'BOT_INBOX_KEY',
  'SHELL', 'PATH', 'PWD', 'HOME', 'USER', 'LANG', 'TERM', 'SHLVL',
  'LOGNAME', 'OLDPWD', 'HOSTNAME', 'DISPLAY', 'XDG_SESSION_TYPE',
  'XDG_RUNTIME_DIR', 'XDG_DATA_DIRS', 'XDG_CONFIG_DIRS', 'DBUS_SESSION_BUS_ADDRESS',
  'SSH_AUTH_SOCK', 'SSH_AGENT_PID', 'GPG_AGENT_INFO', 'LESSOPEN', 'LESSCLOSE',
  'LS_COLORS', 'COLORTERM', 'TERM_PROGRAM', 'TERM_PROGRAM_VERSION',
  '_', 'MAIL', 'EDITOR', 'VISUAL', 'PAGER'
]);

const BOT_ENV_PREFIXES = [
  'BOT_', 'TELEGRAM_', 'GEMINI_', 'NOTION_', 'GROQ_', 'OPENROUTER_', 'ZAI_',
  'LOCAL_LLM_', 'OLLAMA_', 'LOCAL_',
  'SPREADSHEET_', 'WEBHOOK_', 'WEB_APP_', 'IA_', 'TIMEZONE', 'PORT', 'HOST',
  'D1_', 'CF_', 'RENDER_', 'NODE_ENV'
];

function ehVariavelPermitida(chave) {
  if (ENV_BLOCKLIST.has(chave)) return false;
  return BOT_ENV_PREFIXES.some(prefix => chave.startsWith(prefix)) ||
         ['WEB_APP_URL', 'TIMEZONE', 'PORT', 'HOST'].includes(chave);
}

// Sobrescreve com variáveis de ambiente reais do sistema (Render / Docker)
for (const [k, v] of Object.entries(process.env)) {
  if (!ehVariavelPermitida(k)) continue;
  if (v !== undefined && v !== '') {
    propsStore[k] = v;
  }
}

// Higieniza chaves de sistema legadas do arquivo de propriedades
for (const k of Object.keys(propsStore)) {
  if (!ehVariavelPermitida(k) && !k.startsWith('LEITO_') && !k.startsWith('inbox_') && !k.startsWith('outbox_') && !k.startsWith('ctx_') && !k.startsWith('modo_') && !k.startsWith('ultima_') && !k.startsWith('RECEITAS_')) {
    delete propsStore[k];
  }
}

if (!propsStore.SPREADSHEET_ID_REMUME) {
  propsStore.SPREADSHEET_ID_REMUME = 'mock_remume_sheet_id';
}
if (!propsStore.SPREADSHEET_ID_INTERACOES) {
  propsStore.SPREADSHEET_ID_INTERACOES = 'mock_interacoes_sheet_id';
}

let persistTimer = null;
function escreverPropriedades() {
  const temporario = path.join(DATA_DIR, `.properties-${process.pid}.tmp`);
  try {
    fs.writeFileSync(temporario, JSON.stringify(propsStore, null, 2), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temporario, PROPERTIES_FILE);
  } catch (err) {
    try { fs.unlinkSync(temporario); } catch (_) {}
    throw err;
  }
}
function persistirPropriedades(imediato = false) {
  if (imediato) {
    if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; }
    // O webhook só pode confirmar o update se a gravação local foi concluída.
    escreverPropriedades();
    return;
  }
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      escreverPropriedades();
    } catch (e) {
      console.error('[Runtime] Erro ao persistir properties.json:', e.message);
    }
  }, 150);
}

process.on('beforeExit', () => {
  try {
    escreverPropriedades();
  } catch (e) {}
});

// WORKER THREAD HTTP PERSISTENTE DE ALTA VELOCIDADE (KEEP-ALIVE REAL & ZERO FORK)
const httpWorkerCode = `
  const { parentPort } = require('worker_threads');

  parentPort.on('message', async (task) => {
    const { sabCtrl, sabData, url, method, headers, body, timeoutMs } = task;
    const ctrl = new Int32Array(sabCtrl);
    const dataArr = new Uint8Array(sabData);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs || 60000);

    try {
      const fetchOpts = {
        method: method || 'GET',
        headers: headers || {},
        signal: controller.signal
      };
      if (body && method !== 'GET' && method !== 'HEAD') {
        fetchOpts.body = (body instanceof Uint8Array || Buffer.isBuffer(body)) ? Buffer.from(body.buffer || body, body.byteOffset || 0, body.byteLength || body.length) : String(body);
      }

      const res = await fetch(url, fetchOpts);

      const resHeaders = {};
      for (const [k, v] of res.headers.entries()) {
        resHeaders[k.toLowerCase()] = v;
      }

      const arrayBuf = await res.arrayBuffer();
      clearTimeout(timer);
      const bodyBuf = Buffer.from(arrayBuf);

      const metaStr = JSON.stringify({ status: res.status, headers: resHeaders });
      const metaBuf = Buffer.from(metaStr, 'utf8');

      if (metaBuf.length + bodyBuf.length > sabData.byteLength) {
        throw new Error('Resposta HTTP excedeu limite do buffer compartilhado');
      }

      dataArr.set(metaBuf, 0);
      dataArr.set(bodyBuf, metaBuf.length);

      ctrl[1] = bodyBuf.length;
      ctrl[2] = res.status;
      ctrl[3] = metaBuf.length;
      ctrl[0] = 1; // Sucesso
    } catch (err) {
      clearTimeout(timer);
      const isTimeout = err.name === 'AbortError' || (err.message && (err.message.includes('timeout') || err.message.includes('aborted')));
      const errStr = JSON.stringify({ error: isTimeout ? 'Gateway Timeout' : err.message, isTimeout: !!isTimeout });
      const errBuf = Buffer.from(errStr, 'utf8');
      dataArr.set(errBuf, 0);
      ctrl[2] = isTimeout ? 504 : 500;
      ctrl[3] = errBuf.length;
      ctrl[0] = 2; // Erro
    } finally {
      Atomics.notify(ctrl, 0);
    }
  });
`;

let httpWorker = null;
let sabCtrl = null;
let ctrl = null;
let sabData = null;

function iniciarHttpWorker() {
  try {
    sabCtrl = new SharedArrayBuffer(32);
    ctrl = new Int32Array(sabCtrl);
    sabData = new SharedArrayBuffer(16 * 1024 * 1024); // 16MB
    httpWorker = new Worker(httpWorkerCode, { eval: true });
    httpWorker.unref();
  } catch (eWorker) {
    console.warn('[Runtime] Worker Threads indisponível, usando fallback sync-fetch:', eWorker.message);
    httpWorker = null;
  }
}

iniciarHttpWorker();

// 2. CACHE EM MEMÓRIA DE ALTA VELOCIDADE (CacheService)
const cacheMemoryStore = new Map();

// 3. TABELAS LOCAIS EM MEMÓRIA (REMUME E INTERAÇÕES MEDICAMENTOSAS)
let remumeRows = [];
try {
  if (fs.existsSync(REMUME_CSV_FILE)) {
    const content = fs.readFileSync(REMUME_CSV_FILE, 'utf8');
    remumeRows = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => [line.replace(/^"|"$/g, '').trim()]);
    console.log(`[Runtime] REMUME carregado localmente: ${remumeRows.length} itens prontos em RAM.`);
  }
} catch (eCsv) {
  console.warn('[Runtime] Não foi possível carregar REMUME_RP.csv:', eCsv.message);
}

let interacoesRows = [];
try {
  const jsonPath = fs.existsSync(INTERACOES_SRC_JSON_FILE)
    ? INTERACOES_SRC_JSON_FILE
    : (fs.existsSync(INTERACOES_JSON_FILE) ? INTERACOES_JSON_FILE : null);
  if (jsonPath) {
    interacoesRows = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`[Runtime] Interações Medicamentosas carregadas localmente: ${interacoesRows.length - 1} regras prontas em RAM.`);
  }
} catch (eInt) {
  console.warn('[Runtime] Não foi possível carregar interacoes.json:', eInt.message);
}

let guiaHslData = { metadados: {}, medicamentos: [] };
try {
  const hslPath = fs.existsSync(GUIA_HSL_SRC_JSON_FILE)
    ? GUIA_HSL_SRC_JSON_FILE
    : (fs.existsSync(GUIA_HSL_DATA_JSON_FILE) ? GUIA_HSL_DATA_JSON_FILE : null);
  if (hslPath) {
    guiaHslData = JSON.parse(fs.readFileSync(hslPath, 'utf8'));
    const totalMed = (guiaHslData.medicamentos || []).length;
    console.log(`[Runtime] Guia Farmacêutico HSL carregado localmente: ${totalMed} medicamentos oficiais prontos em RAM.`);
  }
} catch (eHsl) {
  console.warn('[Runtime] Não foi possível carregar guia_farmaceutico_hsl.json:', eHsl.message);
}

let guiaPedBData = { metadados: {}, medicamentos: [] };
try {
  const pedbPath = fs.existsSync(GUIA_PEDB_SRC_JSON_FILE)
    ? GUIA_PEDB_SRC_JSON_FILE
    : (fs.existsSync(GUIA_PEDB_DATA_JSON_FILE) ? GUIA_PEDB_DATA_JSON_FILE : null);
  if (pedbPath) {
    guiaPedBData = JSON.parse(fs.readFileSync(pedbPath, 'utf8'));
    const totalMedPedB = (guiaPedBData.medicamentos || []).length;
    console.log(`[Runtime] Guia Pediátrico PedBook carregado localmente: ${totalMedPedB} medicamentos pediátricos prontos em RAM.`);
  }
} catch (ePedB) {
  console.warn('[Runtime] Não foi possível carregar guia_pediatrico_pedb.json:', ePedB.message);
}

let condutasPedBData = { metadados: {}, condutas: [] };
try {
  const condPath = fs.existsSync(CONDUTAS_PEDB_SRC_JSON_FILE)
    ? CONDUTAS_PEDB_SRC_JSON_FILE
    : (fs.existsSync(CONDUTAS_PEDB_DATA_JSON_FILE) ? CONDUTAS_PEDB_DATA_JSON_FILE : null);
  if (condPath) {
    condutasPedBData = JSON.parse(fs.readFileSync(condPath, 'utf8'));
    const totalCond = (condutasPedBData.condutas || []).length;
    console.log(`[Runtime] Condutas Pediátricas PedBook carregadas localmente: ${totalCond} protocolos clínicos prontos em RAM.`);
  }
} catch (eCond) {
  console.warn('[Runtime] Não foi possível carregar condutas_pediatricas_pedb.json:', eCond.message);
}

// 4. CONSTRUÇÃO DO CONTEXTO VIRTUAL (GAS COMPATIBLE)
const ctx = {
  console,
  Buffer,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Date,
  Math,
  JSON,
  RegExp,
  Array,
  Object,
  String,
  Number,
  Boolean,
  Error,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,

  Logger: {
    log: (...args) => console.log('[BOT LOG]', ...args)
  },

  __BASE_GUIA_HSL__: guiaHslData,
  obterBaseGuiaHSL: () => guiaHslData,

  __BASE_GUIA_PEDB__: guiaPedBData,
  obterBaseGuiaPedB: () => guiaPedBData,

  __BASE_CONDUTAS_PEDB__: condutasPedBData,
  obterBaseCondutasPedB: () => condutasPedBData,

  gerarPdfReceitaNativo: (dados) => {
    try {
      const { gerarPdfReceitaSync } = require('./pdf-generator');
      return gerarPdfReceitaSync(dados);
    } catch (e) {
      console.warn('[Runtime] Falha na geração nativa de PDF:', e.message);
      return null;
    }
  },

  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (k) => (propsStore[k] !== undefined && propsStore[k] !== null) ? String(propsStore[k]) : null,
      setProperty: (k, v) => {
        propsStore[k] = String(v);
        if (ctx.ConfigService && typeof ctx.ConfigService.invalidar === 'function') ctx.ConfigService.invalidar();
        persistirPropriedades();
      },
      deleteProperty: (k) => {
        delete propsStore[k];
        if (ctx.ConfigService && typeof ctx.ConfigService.invalidar === 'function') ctx.ConfigService.invalidar();
        persistirPropriedades();
      },
      getProperties: () => ({ ...propsStore }),
      setProperties: (obj) => {
        for (const k in obj) {
          propsStore[k] = String(obj[k]);
        }
        if (ctx.ConfigService && typeof ctx.ConfigService.invalidar === 'function') ctx.ConfigService.invalidar();
        persistirPropriedades();
      }
    }),
    getUserProperties: () => ctx.PropertiesService.getScriptProperties(),
    getDocumentProperties: () => ctx.PropertiesService.getScriptProperties()
  },

  CacheService: {
    getScriptCache: () => ({
      get: (k) => {
        const item = cacheMemoryStore.get(k);
        if (!item) return null;
        if (Date.now() > item.expiresAt) {
          cacheMemoryStore.delete(k);
          return null;
        }
        return item.value;
      },
      put: (k, v, expirationSec = 600) => {
        cacheMemoryStore.set(k, {
          value: String(v),
          expiresAt: Date.now() + (Number(expirationSec) * 1000)
        });
      },
      remove: (k) => {
        cacheMemoryStore.delete(k);
      },
      getAll: (keys) => {
        const res = {};
        for (const k of keys) {
          const item = cacheMemoryStore.get(k);
          if (item && Date.now() <= item.expiresAt) {
            res[k] = item.value;
          }
        }
        return res;
      },
      putAll: (map, expirationSec = 600) => {
        const expiresAt = Date.now() + (Number(expirationSec) * 1000);
        for (const [k, v] of Object.entries(map)) {
          cacheMemoryStore.set(k, { value: String(v), expiresAt });
        }
      }
    })
  },

  LockService: (() => {
    // Mutex simples para ambiente Node.js single-threaded com processamento
    // serializado. Previne race conditions quando webhooks são processados
    // via fila (processWebhookQueue) mas código GAS assume locks reais.
    const locks = new Map();

    function createLock(lockId) {
      return {
        waitLock: (timeoutMs) => {
          const deadline = Date.now() + (timeoutMs || 30000);
          while (locks.get(lockId)) {
            if (Date.now() >= deadline) return false;
            // Espera curta não-bloqueante — no ambiente serializado do webhook,
            // isso quase nunca executa mais de 1 iteração
            try {
              const sleepBuf = new Int32Array(new SharedArrayBuffer(4));
              Atomics.wait(sleepBuf, 0, 0, 50);
            } catch (e) {
              const end = Date.now() + 50;
              while (Date.now() < end) {}
            }
          }
          locks.set(lockId, true);
          return true;
        },
        tryLock: (timeoutMs) => {
          if (locks.get(lockId)) return false;
          locks.set(lockId, true);
          return true;
        },
        releaseLock: () => {
          locks.delete(lockId);
        },
        hasLock: () => locks.has(lockId)
      };
    }

    const scriptLock = createLock('__script__');

    return {
      getScriptLock: () => scriptLock,
      getUserLock: () => createLock('__user__')
    };
  })(),

  UrlFetchApp: {
    fetch: (url, options = {}) => {
      const method = (options.method || 'GET').toUpperCase();
      const headers = { ...(options.headers || {}) };
      if (options.contentType) {
        headers['Content-Type'] = options.contentType;
      }
      let requestPayload = options.payload || null;
      if (requestPayload && typeof requestPayload === 'object' && !Buffer.isBuffer(requestPayload)) {
        const hasBlob = Object.values(requestPayload).some(v => v && typeof v === 'object' && typeof v.getBytes === 'function');
        if (hasBlob) {
          const boundary = '----GASCompatibilityBoundary' + crypto.randomBytes(8).toString('hex');
          const chunks = [];
          for (const [key, val] of Object.entries(requestPayload)) {
            if (val === undefined || val === null) continue;
            if (typeof val === 'object' && typeof val.getBytes === 'function') {
              const bytes = Buffer.from(val.getBytes());
              const filename = val.getName ? val.getName() : 'file';
              const contentType = val.getContentType ? val.getContentType() : 'application/octet-stream';
              chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`));
              chunks.push(bytes);
              chunks.push(Buffer.from('\r\n'));
            } else {
              chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${String(val)}\r\n`));
            }
          }
          chunks.push(Buffer.from(`--${boundary}--\r\n`));
          requestPayload = Buffer.concat(chunks);
          headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
        }
      }
      const timeoutMs = options.timeoutMs || options.timeout || 60000;

      // 1. Despacho Ultra-Rápido via Worker Thread Persistente (Keep-Alive & Zero Fork)
      if (httpWorker && ctrl && sabData) {
        ctrl[0] = 0; ctrl[1] = 0; ctrl[2] = 0; ctrl[3] = 0;
        httpWorker.postMessage({
          sabCtrl, sabData, url, method, headers,
          body: requestPayload,
          timeoutMs
        });

        const waitRes = Atomics.wait(ctrl, 0, 0, timeoutMs + 1000);
        if (waitRes === 'timed-out' || ctrl[0] === 0) {
          // A chamada anterior ainda pode concluir. Descarte o worker e os
          // buffers compartilhados antes de aceitar outra requisição.
          const workerAntigo = httpWorker;
          httpWorker = null;
          iniciarHttpWorker();
          workerAntigo.terminate().catch(() => {});
          if (options.muteHttpExceptions) {
            return {
              getResponseCode: () => 504,
              getContentText: () => JSON.stringify({ error: 'Gateway Timeout' }),
              getHeaders: () => ({}),
              getBlob: () => ({ getBytes: () => Buffer.from(''), getContentType: () => 'text/plain', getName: () => 'error' })
            };
          }
          throw new Error(`Timeout na requisição HTTP para ${url} (${timeoutMs}ms)`);
        }

        if (ctrl[0] === 2) {
          const errLen = ctrl[3];
          const errObj = JSON.parse(Buffer.from(sabData, 0, errLen).toString('utf8'));
          if (options.muteHttpExceptions) {
            return {
              getResponseCode: () => ctrl[2] || 500,
              getContentText: () => JSON.stringify(errObj),
              getHeaders: () => ({}),
              getBlob: () => ({ getBytes: () => Buffer.from(''), getContentType: () => 'text/plain', getName: () => 'error' })
            };
          }
          throw new Error(errObj.error || 'Erro na requisição');
        }

        const metaLen = ctrl[3];
        const bodyLen = ctrl[1];
        const meta = JSON.parse(Buffer.from(sabData, 0, metaLen).toString('utf8'));
        // O próximo fetch sobrescreve sabData; o blob precisa manter seus bytes.
        const bodyBuf = Buffer.from(Buffer.from(sabData, metaLen, bodyLen));

        return {
          getResponseCode: () => meta.status,
          getContentText: () => bodyBuf.toString('utf8'),
          getHeaders: () => meta.headers,
          getBlob: () => {
            let ct = meta.headers['content-type'] || 'application/octet-stream';
            let nm = 'response';
            const b = {
              getBytes: () => bodyBuf,
              getContentType: () => ct,
              setContentType: (t) => { ct = t; return b; },
              getName: () => nm,
              setName: (n) => { nm = n; return b; }
            };
            return b;
          }
        };
      }

      // 2. Fallback de Segurança com sync-fetch caso Worker não esteja inicializado
      const fetchOpts = { method, headers, timeout: timeoutMs };
      if (requestPayload) {
        fetchOpts.body = requestPayload;
      }

      try {
        const res = syncFetch(url, fetchOpts);
        const statusCode = res.status;
        const bodyBuf = Buffer.from(res.arrayBuffer());
        const text = bodyBuf.toString('utf8');
        const responseHeaders = {};
        for (const [k, v] of res.headers.entries()) {
          responseHeaders[k.toLowerCase()] = v;
        }

        return {
          getResponseCode: () => statusCode,
          getContentText: () => text,
          getHeaders: () => responseHeaders,
          getBlob: () => {
            let ct = responseHeaders['content-type'] || 'application/octet-stream';
            let nm = 'response';
            const b = {
              getBytes: () => bodyBuf,
              getContentType: () => ct,
              setContentType: (t) => { ct = t; return b; },
              getName: () => nm,
              setName: (n) => { nm = n; return b; }
            };
            return b;
          }
        };
      } catch (err) {
        if (options.muteHttpExceptions) {
          return {
            getResponseCode: () => 500,
            getContentText: () => JSON.stringify({ error: err.message }),
            getHeaders: () => ({}),
            getBlob: () => {
              let ct = 'text/plain';
              let nm = 'error';
              const b = {
                getBytes: () => Buffer.from(''),
                getContentType: () => ct,
                setContentType: (t) => { ct = t; return b; },
                getName: () => nm,
                setName: (n) => { nm = n; return b; }
              };
              return b;
            }
          };
        }
        throw err;
      }
    }
  },

  Utilities: {
    computeHmacSha256Signature: (val, key) => {
      const hmac = crypto.createHmac('sha256', Buffer.from(key));
      hmac.update(Buffer.from(val));
      return Array.from(hmac.digest());
    },
    computeDigest: (algo, val) => {
      const hash = crypto.createHash('sha256');
      hash.update(Buffer.from(val));
      return Array.from(hash.digest());
    },
    base64Encode: (data) => Buffer.from(data).toString('base64'),
    base64Decode: (data) => Buffer.from(data, 'base64'),
    getUuid: () => crypto.randomUUID(),
    formatDate: (date, tz, fmt) => {
      const d = (date instanceof Date) ? date : new Date(date);
      const targetTz = tz || 'America/Sao_Paulo';
      let m = {};
      try {
        const formatter = new Intl.DateTimeFormat('pt-BR', {
          timeZone: targetTz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          weekday: 'short',
          hour12: false
        });
        for (const p of formatter.formatToParts(d)) {
          m[p.type] = p.value;
        }
      } catch (_) {
        m = {};
      }
      const pad = n => String(n).padStart(2, '0');
      const YYYY = m.year || String(d.getFullYear());
      const MM = m.month || pad(d.getMonth() + 1);
      const DD = m.day || pad(d.getDate());
      let HH = m.hour || pad(d.getHours());
      if (HH === '24') HH = '00';
      const mm = m.minute || pad(d.getMinutes());
      const ss = m.second || pad(d.getSeconds());
      const eee = (m.weekday || '').replace(/\.$/, '');

      if (!fmt || fmt === 'yyyy-MM-dd') return `${YYYY}-${MM}-${DD}`;
      if (fmt === 'HH:mm') return `${HH}:${mm}`;
      if (fmt === 'dd/MM') return `${DD}/${MM}`;
      if (fmt === 'dd/MM/yyyy') return `${DD}/${MM}/${YYYY}`;
      if (fmt === 'dd/MM HH:mm') return `${DD}/${MM} ${HH}:${mm}`;
      if (fmt === 'yyyyMMdd_HHmm') return `${YYYY}${MM}${DD}_${HH}${mm}`;
      if (fmt === 'dd/MM/yyyy (EEE)') return `${DD}/${MM}/${YYYY} (${eee})`;
      if (fmt === "yyyy-MM-dd'T'HH:mm:ss" || fmt === 'yyyy-MM-ddTHH:mm:ss') return `${YYYY}-${MM}-${DD}T${HH}:${mm}:${ss}`;

      return String(fmt)
        .replace(/yyyy/g, YYYY)
        .replace(/MM/g, MM)
        .replace(/dd/g, DD)
        .replace(/HH/g, HH)
        .replace(/mm/g, mm)
        .replace(/ss/g, ss)
        .replace(/EEE/g, eee);
    },
    newBlob: (content, contentType = 'text/plain', name = 'file') => {
      const buf = Buffer.isBuffer(content) ? content : Buffer.from(content || '');
      return {
        getBytes: () => buf,
        getContentType: () => contentType,
        getName: () => name,
        setName: (n) => { name = n; },
        getAs: (type) => ctx.Utilities.newBlob(buf, type, name)
      };
    },
    sleep: (ms) => {
      const waitMs = Math.max(0, Number(ms) || 0);
      if (waitMs <= 0) return;
      try {
        const sleepBuf = new Int32Array(new SharedArrayBuffer(4));
        Atomics.wait(sleepBuf, 0, 0, waitMs);
      } catch (e) {
        const end = Date.now() + waitMs;
        while (Date.now() < end) {}
      }
    }
  },

  SpreadsheetApp: {
    openById: (id, isInteracao) => {
      const idStr = String(id || '').trim();
      const idPropInteracoes = String(propsStore.SPREADSHEET_ID_INTERACOES || '').trim();
      const isInteracaoId = isInteracao === true ||
                            (idPropInteracoes && idStr === idPropInteracoes) ||
                            idStr.toLowerCase().includes('interac');
      const activeRows = isInteracaoId ? interacoesRows : remumeRows;
      const numCols = (activeRows.length > 0 && Array.isArray(activeRows[0])) ? activeRows[0].length : 1;
      return {
        getSheets: () => [{
          getLastRow: () => activeRows.length,
          getLastColumn: () => numCols,
          getRange: (startRow, startCol, numRows, numColsToFetch) => ({
            getValues: () => activeRows.slice(startRow - 1, startRow - 1 + numRows).map(r => Array.isArray(r) ? r : [r])
          })
        }]
      };
    }
  },

  ContentService: {
    MimeType: { JSON: 'application/json', TEXT: 'text/plain' },
    createTextOutput: (t) => {
      let mime = 'text/plain';
      const obj = {
        setMimeType: (m) => { mime = m; return obj; },
        getContent: () => t,
        getMimeType: () => mime
      };
      return obj;
    }
  },

  HtmlService: {
    XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' },
    createHtmlOutput: (h) => ({
      getContent: () => h,
      setTitle: function() { return this; },
      addMetaTag: function() { return this; },
      setXFrameOptionsMode: function() { return this; }
    })
  }
};

// 5. CARREGA TODOS OS MÓDULOS DE SRC/ NA VM DO NODE.JS
vm.createContext(ctx);

const srcFiles = fs.readdirSync(SRC_DIR).sort().filter(f => f.endsWith('.js'));
console.log(`[Runtime] Compilando ${srcFiles.length} módulos JavaScript de src/...`);
for (const file of srcFiles) {
  const code = fs.readFileSync(path.join(SRC_DIR, file), 'utf8');
  try {
    vm.runInContext(code, ctx, { filename: file });
  } catch (err) {
    console.error(`[Runtime] Erro fatal ao compilar ${file}:`, err);
    throw err;
  }
}
console.log('[Runtime] ✅ Núcleo clínico do Ultra Rotina compilado e inicializado com sucesso.');

module.exports = {
  ctx,
  propsStore,
  persistirPropriedades,
  
  // Helpers de despacho direto
  doPost: (reqData) => ctx.doPost(reqData),
  doGet: (reqData) => ctx.doGet(reqData),
  cockpitRpc: (() => {
    // Mapa de dispatch cacheado como singleton — evita alocação de objeto a cada chamada RPC.
    // Inicializado lazily no primeiro uso para garantir que o ctx já esteja populado.
    let _rpcMap = null;
    return (metodo, session, args = []) => {
      if (!_rpcMap) {
        _rpcMap = Object.create(null);
        _rpcMap.cockpitConsultar = ctx.cockpitConsultar;
        _rpcMap.cockpitPreceptor = ctx.cockpitPreceptor;
        _rpcMap.cockpitStatusLeito = ctx.cockpitStatusLeito;
        _rpcMap.cockpitPassagem = ctx.cockpitPassagem;
        _rpcMap.cockpitCalcular = ctx.cockpitCalcular;
        _rpcMap.cockpitRemume = ctx.cockpitRemume;
        _rpcMap.cockpitConversar = ctx.cockpitConversar;
        _rpcMap.cockpitPerfil = ctx.cockpitPerfil;
        _rpcMap.cockpitRegistrarPeso = ctx.cockpitRegistrarPeso;
        _rpcMap.cockpitAulasProgresso = ctx.cockpitAulasProgresso;
        _rpcMap.cockpitAlternarAula = ctx.cockpitAlternarAula;
        _rpcMap.cockpitChecarSeguranca = ctx.cockpitChecarSeguranca;
        _rpcMap.cockpitSoapAmbulatorial = ctx.cockpitSoapAmbulatorial;
        _rpcMap.cockpitGerarReceitaTexto = ctx.cockpitGerarReceitaTexto;
        _rpcMap.cockpitGerarAtestadoTexto = ctx.cockpitGerarAtestadoTexto;
        _rpcMap.cockpitEstratificarRisco = ctx.cockpitEstratificarRisco;
        _rpcMap.cockpitBuscarCid = ctx.cockpitBuscarCid;
        _rpcMap.cockpitCalcularPrenatal = ctx.cockpitCalcularPrenatal;
        _rpcMap.cockpitRastreioTrimestre = ctx.cockpitRastreioTrimestre;
        _rpcMap.cockpitValidarFarmacoGestacao = ctx.cockpitValidarFarmacoGestacao;
        _rpcMap.cockpitAuditarPrescricaoGestante = ctx.cockpitAuditarPrescricaoGestante;
        _rpcMap.cockpitTrabalhoParto = ctx.cockpitTrabalhoParto;
        _rpcMap.cockpitSulfatoMagnesio = ctx.cockpitSulfatoMagnesio;
        _rpcMap.cockpitCriseHipertensivaObstetrica = ctx.cockpitCriseHipertensivaObstetrica;
        _rpcMap.cockpitHemorragiaPosParto = ctx.cockpitHemorragiaPosParto;
        _rpcMap.cockpitProfilaxiaGbs = ctx.cockpitProfilaxiaGbs;
        _rpcMap.cockpitPrematuridadeRpmo = ctx.cockpitPrematuridadeRpmo;
        _rpcMap.cockpitResumoCentroObstetrico = ctx.cockpitResumoCentroObstetrico;
        _rpcMap.cockpitRastreioColoUterino = ctx.cockpitRastreioColoUterino;
        _rpcMap.cockpitSangramentoUterinoAnormal = ctx.cockpitSangramentoUterinoAnormal;
        _rpcMap.cockpitElegibilidadeAnticoncepcao = ctx.cockpitElegibilidadeAnticoncepcao;
        _rpcMap.cockpitInfeccaoVulvovaginal = ctx.cockpitInfeccaoVulvovaginal;
        _rpcMap.cockpitResumoGinecologia = ctx.cockpitResumoGinecologia;
        _rpcMap.cockpitPainelPuericultura = ctx.cockpitPainelPuericultura;
        _rpcMap.cockpitSaudeIdosoAga = ctx.cockpitSaudeIdosoAga;
        _rpcMap.cockpitAuditarInfusaoUti = ctx.cockpitAuditarInfusaoUti;
        _rpcMap.cockpitSepsePuerperal = ctx.cockpitSepsePuerperal;
        _rpcMap.cockpitAuditarYSite = ctx.cockpitAuditarYSite;
        _rpcMap.cockpitPcrGestante = ctx.cockpitPcrGestante;
        _rpcMap.cockpitTevGestante = ctx.cockpitTevGestante;
        _rpcMap.cockpitClimaterioThm = ctx.cockpitClimaterioThm;
        _rpcMap.cockpitSopOvariosPolicisticos = ctx.cockpitSopOvariosPolicisticos;
        _rpcMap.cockpitDipAbscessoTuboOvariano = ctx.cockpitDipAbscessoTuboOvariano;
        _rpcMap.cockpitPsiquiatriaUrgencia = ctx.cockpitPsiquiatriaUrgencia;
        _rpcMap.cockpitObterModelosExameFisico = ctx.cockpitObterModelosExameFisico;
        _rpcMap.cockpitSedacaoOpioides = ctx.cockpitSedacaoOpioides;
        _rpcMap.cockpitNefrologiaDhe = ctx.cockpitNefrologiaDhe;
        _rpcMap.cockpitSdraMecanica = ctx.cockpitSdraMecanica;
        _rpcMap.cockpitLocalLlm = ctx.cockpitLocalLlm;
        _rpcMap.cockpitIaLocalStatus = ctx.cockpitIaLocalStatus;
        _rpcMap.cockpitIaLocalFallback = ctx.cockpitIaLocalFallback;
        _rpcMap.cockpitRbac = ctx.cockpitRbac;
        Object.freeze(_rpcMap);
      }
      const fn = _rpcMap[metodo];
      if (typeof fn !== 'function') {
        throw new Error(`Método do Cockpit não suportado: ${metodo}`);
      }
      return fn.apply(null, [session].concat(args));
    };
  })()
};
