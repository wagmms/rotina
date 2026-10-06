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

// Sobrescreve com variáveis de ambiente reais do sistema (Render / Docker)
for (const [k, v] of Object.entries(process.env)) {
  if (v !== undefined && v !== '') {
    propsStore[k] = v;
  }
}

function persistirPropriedades() {
  try {
    fs.writeFileSync(PROPERTIES_FILE, JSON.stringify(propsStore, null, 2), 'utf8');
  } catch (e) {
    console.error('[Runtime] Erro ao persistir properties.json:', e.message);
  }
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

  LockService: {
    getScriptLock: () => ({
      waitLock: () => true,
      tryLock: () => true,
      releaseLock: () => {}
    }),
    getUserLock: () => {
      let isBusy = false;
      return {
        waitLock: () => true,
        tryLock: () => {
          if (isBusy) return false;
          isBusy = true;
          return true;
        },
        releaseLock: () => {
          isBusy = false;
        }
      };
    }
  },

  UrlFetchApp: {
    fetch: (url, options = {}) => {
      const method = (options.method || 'GET').toUpperCase();
      const headers = { ...(options.headers || {}) };
      if (options.contentType) {
        headers['Content-Type'] = options.contentType;
      }
      const fetchOpts = { method, headers };
      if (options.payload) {
        fetchOpts.body = options.payload;
      }

      try {
        const res = syncFetch(url, fetchOpts);
        const statusCode = res.status;
        const text = res.text();
        const responseHeaders = {};
        for (const [k, v] of res.headers.entries()) {
          responseHeaders[k] = v;
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
      const end = Date.now() + ms;
      while (Date.now() < end) {}
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
      return {
        setMimeType: (m) => { mime = m; return this; },
        getContent: () => t,
        getMimeType: () => mime
      };
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
      cockpitRegistrarPeso: ctx.cockpitRegistrarPeso
    };
    if (typeof funcoes[metodo] !== 'function') {
      throw new Error(`Método do Cockpit não suportado: ${metodo}`);
    }
    return funcoes[metodo].apply(null, [session].concat(args));
  }
};
