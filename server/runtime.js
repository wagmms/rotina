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
const DATA_DIR = path.resolve(ROOT_DIR, 'data');
const SRC_DIR = path.resolve(ROOT_DIR, 'src');
const PROPERTIES_FILE = path.join(DATA_DIR, 'properties.json');
const DEPLOY_STATE_FILE = path.join(ROOT_DIR, '.deploy_state.json');
const REMUME_CSV_FILE = path.join(ROOT_DIR, 'REMUME_RP.csv');

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
  'SHELL', 'PATH', 'PWD', 'HOME', 'USER', 'LANG', 'TERM', 'SHLVL',
  'LOGNAME', 'OLDPWD', 'HOSTNAME', 'DISPLAY', 'XDG_SESSION_TYPE',
  'XDG_RUNTIME_DIR', 'XDG_DATA_DIRS', 'XDG_CONFIG_DIRS', 'DBUS_SESSION_BUS_ADDRESS',
  'SSH_AUTH_SOCK', 'SSH_AGENT_PID', 'GPG_AGENT_INFO', 'LESSOPEN', 'LESSCLOSE',
  'LS_COLORS', 'COLORTERM', 'TERM_PROGRAM', 'TERM_PROGRAM_VERSION',
  '_', 'MAIL', 'EDITOR', 'VISUAL', 'PAGER'
]);

// Sobrescreve com variáveis de ambiente reais do sistema (Render / Docker)
for (const [k, v] of Object.entries(process.env)) {
  if (ENV_BLOCKLIST.has(k)) continue;
  if (k.startsWith('npm_') || k.startsWith('LC_') || k.startsWith('XDG_') ||
      k.startsWith('QT_') || k.startsWith('COSMIC_') || k.startsWith('ANTIGRAVITY_') ||
      k.startsWith('AGY_') || k.startsWith('FZF_') || k.startsWith('STARSHIP_') ||
      k.startsWith('NODE_') || k.startsWith('PYTEST_') || k.startsWith('GTK_') ||
      k.startsWith('ZSH') || ['LSCOLORS', 'LESS', 'LANGUAGE', 'COLOR', 'NODE', 'PYTHONPATH',
      'INIT_CWD', 'PAPERSIZE', 'FC_FONTATIONS', 'PANEL_NOTIFICATIONS_FD', 'MOZ_ENABLE_WAYLAND',
      'GSM_SKIP_SSH_AGENT_WORKAROUND', 'GIT_PAGER', 'EGL_PLATFORM', 'GDK_BACKEND',
      'DCONF_PROFILE', 'CHROME_DESKTOP', 'CHROME_DEVTOOLS_MCP_JS', 'CLUTTER_IM_MODULE',
      'QTWEBENGINE_DICTIONARIES_PATH', 'XMODIFIERS', 'NO_AT_BRIDGE', 'GTK_MODULES',
      'IM_CONFIG_PHASE', 'DISABLE_AUTO_UPDATE', '_JAVA_AWT_WM_NONREPARENTING',
      'WAYLAND_DISPLAY', 'X_MINIMIZE_APPLET', 'X_PRIVILEGED_WAYLAND_SOCKET'].includes(k)) {
    continue;
  }
  if (v !== undefined && v !== '') {
    propsStore[k] = v;
  }
}

let persistTimer = null;
function persistirPropriedades(imediato = false) {
  if (imediato) {
    if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; }
    try {
      fs.writeFileSync(PROPERTIES_FILE, JSON.stringify(propsStore, null, 2), 'utf8');
    } catch (e) {
      console.error('[Runtime] Erro ao persistir properties.json:', e.message);
    }
    return;
  }
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      fs.writeFileSync(PROPERTIES_FILE, JSON.stringify(propsStore, null, 2), 'utf8');
    } catch (e) {
      console.error('[Runtime] Erro ao persistir properties.json:', e.message);
    }
  }, 150);
}

process.on('beforeExit', () => {
  try {
    fs.writeFileSync(PROPERTIES_FILE, JSON.stringify(propsStore, null, 2), 'utf8');
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
        fetchOpts.body = Buffer.isBuffer(body) ? body : String(body);
      }

      const res = await fetch(url, fetchOpts);
      clearTimeout(timer);

      const resHeaders = {};
      for (const [k, v] of res.headers.entries()) {
        resHeaders[k.toLowerCase()] = v;
      }

      const arrayBuf = await res.arrayBuffer();
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

// 2. CACHE EM MEMÓRIA DE ALTA VELOCIDADE (CacheService)
const cacheMemoryStore = new Map();

// 3. TABELA REMUME LOCAL EM MEMÓRIA (SpreadsheetApp)
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

  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (k) => (propsStore[k] !== undefined && propsStore[k] !== null) ? String(propsStore[k]) : null,
      setProperty: (k, v) => {
        propsStore[k] = String(v);
        persistirPropriedades();
      },
      deleteProperty: (k) => {
        delete propsStore[k];
        persistirPropriedades();
      },
      getProperties: () => ({ ...propsStore }),
      setProperties: (obj) => {
        for (const k in obj) {
          propsStore[k] = String(obj[k]);
        }
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
      const timeoutMs = options.timeoutMs || options.timeout || 60000;

      // 1. Despacho Ultra-Rápido via Worker Thread Persistente (Keep-Alive & Zero Fork)
      if (httpWorker && ctrl && sabData) {
        ctrl[0] = 0; ctrl[1] = 0; ctrl[2] = 0; ctrl[3] = 0;
        httpWorker.postMessage({
          sabCtrl, sabData, url, method, headers,
          body: options.payload || null,
          timeoutMs
        });

        const waitRes = Atomics.wait(ctrl, 0, 0, timeoutMs + 1000);
        if (waitRes === 'timed-out' || ctrl[0] === 0) {
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
        const bodyBuf = Buffer.from(sabData, metaLen, bodyLen);

        return {
          getResponseCode: () => meta.status,
          getContentText: () => bodyBuf.toString('utf8'),
          getHeaders: () => meta.headers,
          getBlob: () => ({
            getBytes: () => bodyBuf,
            getContentType: () => meta.headers['content-type'] || 'application/octet-stream',
            getName: () => 'response'
          })
        };
      }

      // 2. Fallback de Segurança com sync-fetch caso Worker não esteja inicializado
      const fetchOpts = { method, headers, timeout: timeoutMs };
      if (options.payload) {
        fetchOpts.body = options.payload;
      }

      try {
        const res = syncFetch(url, fetchOpts);
        const statusCode = res.status;
        const text = res.text();
        const responseHeaders = {};
        for (const [k, v] of res.headers.entries()) {
          responseHeaders[k.toLowerCase()] = v;
        }

        return {
          getResponseCode: () => statusCode,
          getContentText: () => text,
          getHeaders: () => responseHeaders,
          getBlob: () => ({
            getBytes: () => Buffer.from(text),
            getContentType: () => responseHeaders['content-type'] || 'application/octet-stream',
            getName: () => 'response'
          })
        };
      } catch (err) {
        if (options.muteHttpExceptions) {
          return {
            getResponseCode: () => 500,
            getContentText: () => JSON.stringify({ error: err.message }),
            getHeaders: () => ({}),
            getBlob: () => ({ getBytes: () => Buffer.from(''), getContentType: () => 'text/plain', getName: () => 'error' })
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
    base64Decode: (data) => Buffer.from(data, 'base64').toString('utf8'),
    getUuid: () => crypto.randomUUID(),
    formatDate: (date, tz, fmt) => {
      const d = new Date(date);
      const pad = n => String(n).padStart(2, '0');
      if (fmt === 'dd/MM/yyyy') {
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
      }
      if (fmt === 'yyyyMMdd_HHmm') {
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
      }
      return d.toISOString();
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
    openById: (id) => ({
      getSheets: () => [{
        getLastRow: () => remumeRows.length,
        getLastColumn: () => 1,
        getRange: (startRow, startCol, numRows, numCols) => ({
          getValues: () => remumeRows.slice(startRow - 1, startRow - 1 + numRows)
        })
      }]
    })
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
  cockpitRpc: (metodo, session, args = []) => {
    const funcoes = {
      cockpitConsultar: ctx.cockpitConsultar,
      cockpitPreceptor: ctx.cockpitPreceptor,
      cockpitStatusLeito: ctx.cockpitStatusLeito,
      cockpitPassagem: ctx.cockpitPassagem,
      cockpitCalcular: ctx.cockpitCalcular,
      cockpitRemume: ctx.cockpitRemume,
      cockpitConversar: ctx.cockpitConversar,
      cockpitPerfil: ctx.cockpitPerfil,
      cockpitRegistrarPeso: ctx.cockpitRegistrarPeso,
      cockpitAulasProgresso: ctx.cockpitAulasProgresso,
      cockpitAlternarAula: ctx.cockpitAlternarAula
    };
    if (typeof funcoes[metodo] !== 'function') {
      throw new Error(`Método do Cockpit não suportado: ${metodo}`);
    }
    return funcoes[metodo].apply(null, [session].concat(args));
  }
};
