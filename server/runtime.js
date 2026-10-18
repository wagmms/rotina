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
const { EventEmitter } = require('events');
const syncFetch = require('sync-fetch');
const { Worker } = require('worker_threads');
const { googleCalendarInstance } = require('./google_calendar');

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

const PROFILES_DATA_DIR = path.join(DATA_DIR, 'profiles');
const PROFILES_SRC_DIR = path.join(SRC_DIR, 'data', 'profiles');

// Garante que o diretório de dados persistentes exista
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(PROFILES_DATA_DIR)) {
  fs.mkdirSync(PROFILES_DATA_DIR, { recursive: true });
}

// Sincroniza perfis canônicos para o diretório de execução se ainda não existirem
if (fs.existsSync(PROFILES_SRC_DIR)) {
  try {
    const perfisSrc = fs.readdirSync(PROFILES_SRC_DIR);
    for (const arq of perfisSrc) {
      if (arq.endsWith('.json')) {
        const dest = path.join(PROFILES_DATA_DIR, arq);
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(path.join(PROFILES_SRC_DIR, arq), dest);
        }
      }
    }
  } catch (e) {
    console.warn('[Runtime] Falha ao sincronizar perfis canônicos de src/data/profiles:', e.message);
  }
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

// Carrega .env local da Rotina (prioridade máxima para configuração de produção/desenvolvimento)
const ENV_FILE = path.join(ROOT_DIR, '.env');
if (fs.existsSync(ENV_FILE)) {
  try {
    const rawEnv = fs.readFileSync(ENV_FILE, 'utf8');
    for (const linha of rawEnv.split(/\r?\n/)) {
      const l = linha.trim();
      if (l && !l.startsWith('#') && l.includes('=')) {
        const [k, ...rest] = l.split('=');
        const chave = k.trim();
        const val = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
        if (chave && val) {
          propsStore[chave] = val;
        }
      }
    }
  } catch (e) {
    console.warn('[Runtime] Falha ao ler .env local:', e.message);
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
  'BOT_', 'TELEGRAM_', 'GEMINI_', 'VERTEX_', 'GCP_', 'NOTION_', 'GROQ_', 'OPENROUTER_', 'ZAI_',
  'LOCAL_LLM_', 'OLLAMA_', 'LOCAL_', 'GOOGLE_', 'CALENDAR_',
  'SPREADSHEET_', 'WEBHOOK_', 'WEB_APP_', 'IA_', 'TIMEZONE', 'PORT', 'HOST',
  'D1_', 'CF_', 'RENDER_', 'NODE_ENV', 'PERFIL_'
];

function ehVariavelPermitida(chave) {
  if (ENV_BLOCKLIST.has(chave)) return false;
  return BOT_ENV_PREFIXES.some(prefix => chave.startsWith(prefix)) ||
         ['WEB_APP_URL', 'TIMEZONE', 'PORT', 'HOST'].includes(chave);
}

function sanitizarTokenTelegram(token) {
  if (!token || typeof token !== 'string') return '';
  const limpo = token.trim();
  const match = limpo.match(/^([0-9]{8,10}:[a-zA-Z0-9_-]{35})/);
  return match ? match[1] : limpo;
}

// Sobrescreve com variáveis de ambiente reais do sistema (Render / Docker)
for (const [k, v] of Object.entries(process.env)) {
  if (!ehVariavelPermitida(k)) continue;
  if (k === 'TELEGRAM_BOT_TOKEN' && String(v).includes('8971405790')) {
    // Rejeita contaminação cruzada: 8971405790 é exclusivo do IA-Hub
    continue;
  }
  if (v !== undefined && v !== '') {
    propsStore[k] = (k === 'TELEGRAM_BOT_TOKEN') ? sanitizarTokenTelegram(v) : v;
  }
}

if (propsStore.TELEGRAM_BOT_TOKEN) {
  propsStore.TELEGRAM_BOT_TOKEN = sanitizarTokenTelegram(propsStore.TELEGRAM_BOT_TOKEN);
}

// Higieniza chaves de sistema legadas do arquivo de propriedades, preservando estado clínico e operacional legítimo
const PREFIXOS_ESTADO_PRESERVADOS = [
  'LEITO_', 'inbox_', 'outbox_', 'ctx_', 'modo_', 'ultima_', 'RECEITAS_',
  'duvidas_', 'habito_', 'rotina_', 'ROTINA_', 'bloco_', 'BLOCOS_',
  'CONTEXTO_CLINICO_', 'PERFIL_CLINICO_', 'PERFIL_', 'SOLICITACOES_REMUME_', 'REMUME_CUSTOM_',
  'GCAL_', 'SNIPER_PLANTOES_', 'PESO_ATUAL', 'atendimento_', 'soapview_',
  'PACIENTE_', 'PRONTUARIO_', 'PLANTAO_', 'PLANTÃO_'
];

for (const k of Object.keys(propsStore)) {
  const preservar = ehVariavelPermitida(k) || PREFIXOS_ESTADO_PRESERVADOS.some((p) => k.startsWith(p));
  if (!preservar) {
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
    fs.writeFileSync(temporario, JSON.stringify(propsStore), { encoding: 'utf8', mode: 0o600 });
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

// Conecta a ponte de credenciais e persistência de token do Google Calendar
if (typeof googleCalendarInstance.setPropsBridge === 'function') {
  googleCalendarInstance.setPropsBridge(
    (k) => propsStore[k] || null,
    (k, v) => {
      propsStore[k] = String(v);
      persistirPropriedades(true);
    }
  );
}

process.on('beforeExit', () => {
  try {
    escreverPropriedades();
  } catch (e) {}
});

// ==============================================================================
// BARRAMENTO REATIVO DE ROTINA (SSE & TELEGRAM SYNC) E VERSIONAMENTO MONOTÔNICO
// ==============================================================================
const rotinaBus = new EventEmitter();
rotinaBus.setMaxListeners(100);

let currentMutationOrigin = 'system'; // 'telegram' | 'cockpit' | 'gcal' | 'system'

function runWithOrigin(origin, fn) {
  const prev = currentMutationOrigin;
  currentMutationOrigin = origin || 'system';
  try {
    return fn();
  } finally {
    currentMutationOrigin = prev;
  }
}

function extractDateKeyFromProperty(key) {
  const match = String(key || '').match(/(20\d{2}-\d{2}-\d{2})/);
  if (match) return match[1];
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}

function bumpRotinaVersion(dateKey, keyChanged = 'ROTINA_MUTATION', origin = currentMutationOrigin) {
  const targetDate = String(dateKey || '').trim().slice(0, 10) || new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const verKey = `ROTINA_VER_${targetDate}`;
  const baseVer = getRotinaVersion(targetDate).version;
  const currentVer = baseVer + 1;
  const nowIso = new Date().toISOString();

  propsStore[verKey] = String(currentVer);
  propsStore[`ROTINA_UPDATED_AT_${targetDate}`] = nowIso;
  persistirPropriedades(true);

  const eventPayload = {
    dateKey: targetDate,
    version: currentVer,
    updatedAt: nowIso,
    key: keyChanged,
    origin
  };

  rotinaBus.emit('rotina:mutated', eventPayload);
  return eventPayload;
}

function getRotinaVersion(dateKey) {
  const targetDate = String(dateKey || '').trim().slice(0, 10) || new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const verKey = `ROTINA_VER_${targetDate}`;
  const v = parseInt(propsStore[verKey], 10);
  return {
    dateKey: targetDate,
    version: Number.isSafeInteger(v) && v > 0 ? v : 1,
    updatedAt: propsStore[`ROTINA_UPDATED_AT_${targetDate}`] || new Date().toISOString()
  };
}

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

// ==============================================================================
// MOTOR NATIVO VERTEX AI (OAUTH2 RS256 + TOKEN CACHE EM RAM)
// ==============================================================================
let vertexTokenCache = { accessToken: null, expiresAt: 0, projectId: null, credsPath: null };

function carregarCredenciaisVertex() {
  const candidatos = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    propsStore.GOOGLE_APPLICATION_CREDENTIALS,
    propsStore.VERTEX_CREDENTIALS_PATH,
    '/home/wagmoraes/.gemini/config/vertex-key.json',
    path.join(ROOT_DIR, 'google-credentials.json')
  ].filter(Boolean);

  for (const caminho of candidatos) {
    try {
      const resolvido = path.resolve(ROOT_DIR, caminho);
      if (fs.existsSync(resolvido)) {
        const raw = JSON.parse(fs.readFileSync(resolvido, 'utf8'));
        if (raw && raw.client_email && raw.private_key) {
          return { creds: raw, path: resolvido };
        }
      }
    } catch (e) {
      console.warn(`[VertexAI] Aviso ao ler credencial ${caminho}:`, e.message);
    }
  }
  return null;
}

function obterTokenVertexAISync() {
  const agora = Date.now();
  if (vertexTokenCache.accessToken && agora < vertexTokenCache.expiresAt - 60000) {
    return vertexTokenCache;
  }

  const info = carregarCredenciaisVertex();
  if (!info || !info.creds) {
    throw new Error('Credenciais Service Account da Vertex AI não encontradas (google-credentials.json / vertex-key.json).');
  }

  const { creds } = info;
  const nowSec = Math.floor(agora / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claim = Buffer.from(JSON.stringify({
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: nowSec + 3600,
    iat: nowSec
  })).toString('base64url');

  const signatureInput = `${header}.${claim}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  signer.end();
  const signature = signer.sign(creds.private_key, 'base64url');
  const assertion = `${signatureInput}.${signature}`;

  const bodyPayload = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${assertion}`;
  const res = ctx.UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    contentType: 'application/x-www-form-urlencoded',
    payload: bodyPayload,
    muteHttpExceptions: true,
    timeoutMs: 10000
  });

  if (!res || res.getResponseCode() !== 200) {
    throw new Error(`Falha OAuth2 Vertex AI (HTTP ${res ? res.getResponseCode() : 'null'}): ${res ? res.getContentText() : ''}`);
  }

  const tokenData = JSON.parse(res.getContentText());
  vertexTokenCache = {
    accessToken: tokenData.access_token,
    expiresAt: agora + ((tokenData.expires_in || 3600) * 1000),
    projectId: propsStore.VERTEX_PROJECT_ID || propsStore.GCP_PROJECT_ID || creds.project_id || 'gen-lang-client-0798056953',
    credsPath: info.path
  };
  return vertexTokenCache;
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

  VertexAuthService: {
    isConfigured: () => Boolean(carregarCredenciaisVertex()),
    getAuthInfo: () => obterTokenVertexAISync(),
    getProjectId: () => {
      const info = carregarCredenciaisVertex();
      return propsStore.VERTEX_PROJECT_ID || propsStore.GCP_PROJECT_ID || (info && info.creds && info.creds.project_id) || 'gen-lang-client-0798056953';
    },
    getLocation: () => propsStore.VERTEX_LOCATION || 'global',
    getModel: () => propsStore.VERTEX_MODEL || propsStore.GEMINI_MODEL || 'gemini-4-argon'
  },

  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (k) => (propsStore[k] !== undefined && propsStore[k] !== null) ? String(propsStore[k]) : null,
      setProperty: (k, v) => {
        const strVal = (v !== undefined && v !== null) ? String(v) : '';
        const changed = propsStore[k] !== strVal;
        propsStore[k] = strVal;
        if (ctx.ConfigService && typeof ctx.ConfigService.invalidar === 'function') ctx.ConfigService.invalidar();
        const ehRotina = k.startsWith('ROTINA_') || k.startsWith('GCAL_');
        const imediato = ehRotina || k.startsWith('ultima_') || k.startsWith('inbox_') || k.startsWith('LEITO_') || k.startsWith('atendimento_');
        persistirPropriedades(imediato);

        if (ehRotina && !k.startsWith('ROTINA_VER_') && !k.startsWith('ROTINA_UPDATED_AT_')) {
          if (changed) {
            const dateKey = extractDateKeyFromProperty(k);
            bumpRotinaVersion(dateKey, k, currentMutationOrigin);
          }
        }
      },
      deleteProperty: (k) => {
        delete propsStore[k];
        if (ctx.ConfigService && typeof ctx.ConfigService.invalidar === 'function') ctx.ConfigService.invalidar();
        const ehRotina = k.startsWith('ROTINA_') || k.startsWith('GCAL_');
        persistirPropriedades(ehRotina);
        if (ehRotina && !k.startsWith('ROTINA_VER_') && !k.startsWith('ROTINA_UPDATED_AT_')) {
          const dateKey = extractDateKeyFromProperty(k);
          bumpRotinaVersion(dateKey, k, currentMutationOrigin);
        }
      },
      getProperties: () => ({ ...propsStore }),
      setProperties: (obj) => {
        let touchedDateKey = null;
        for (const k in obj) {
          propsStore[k] = String(obj[k]);
          if ((k.startsWith('ROTINA_') || k.startsWith('GCAL_')) && !k.startsWith('ROTINA_VER_') && !k.startsWith('ROTINA_UPDATED_AT_')) {
            touchedDateKey = extractDateKeyFromProperty(k);
          }
        }
        if (ctx.ConfigService && typeof ctx.ConfigService.invalidar === 'function') ctx.ConfigService.invalidar();
        const imediato = !!touchedDateKey;
        persistirPropriedades(imediato);
        if (touchedDateKey) {
          bumpRotinaVersion(touchedDateKey, 'BATCH_ROTINA', currentMutationOrigin);
        }
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
      // Bloqueio defensivo absoluto: Em ambiente de teste automatizado, nunca disparar chamadas reais ao Telegram
      if ((process.env.NODE_ENV === 'test' || propsStore.NODE_ENV === 'test') && url.includes('api.telegram.org')) {
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ ok: true, result: { message_id: 99999 } }),
          getHeaders: () => ({ 'content-type': 'application/json' }),
          getBlob: () => ({ getBytes: () => Buffer.from('{"ok":true}'), getContentType: () => 'application/json', getName: () => 'telegram_mock' })
        };
      }

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
  },
  CalendarApp: {
    _mockEventos: null,
    _setMockEventos: function(evs) { this._mockEventos = evs; },
    getDefaultCalendar: function() {
      const self = this;
      return {
        getEvents: (inicio, fim) => {
          if (Array.isArray(self._mockEventos)) {
            return self._mockEventos;
          }
          return googleCalendarInstance.listarEventosSync(inicio, fim);
        },
        createEvent: (tit, ini, fim, opt) => {
          if (Array.isArray(self._mockEventos)) {
            const ev = {
              getId: () => 'mock-event-' + Math.random().toString(36).substring(2, 8),
              getTitle: () => tit,
              getStartTime: () => ini,
              getEndTime: () => fim,
              getLocation: () => (opt && opt.location) || '',
              getDescription: () => (opt && opt.description) || '',
              isAllDayEvent: () => false
            };
            self._mockEventos.push(ev);
            return ev;
          }
          return googleCalendarInstance.criarEventoSync(tit, ini, fim, opt);
        },
        updateEvent: (eventId, alteracoes) => {
          if (Array.isArray(self._mockEventos)) {
            const ev = self._mockEventos.find(e => {
              const id = typeof e.getId === 'function' ? e.getId() : e.id;
              return id === eventId;
            });
            if (ev) {
              if (alteracoes.summary !== undefined && typeof ev.getTitle === 'function') {
                const s = alteracoes.summary;
                ev.getTitle = () => s;
              }
              if (alteracoes.start) {
                const stStr = alteracoes.start.dateTime || alteracoes.start;
                const st = (stStr instanceof Date) ? stStr : new Date(stStr);
                ev.getStartTime = () => st;
              }
              if (alteracoes.end) {
                const enStr = alteracoes.end.dateTime || alteracoes.end;
                const en = (enStr instanceof Date) ? enStr : new Date(enStr);
                ev.getEndTime = () => en;
              }
              return ev;
            }
            return null;
          }
          return googleCalendarInstance.atualizarEventoSync(eventId, alteracoes);
        }
      };
    }
  },
  GoogleCalendarService: googleCalendarInstance,
  CatalogoRemumeService: require('../src/data/remumes/index.js'),
  process: process,
  require: require
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
console.log('Chaves no ctx:', Object.keys(ctx).filter(k => k.includes('Cardiologia'))); console.log('[Runtime] ✅ Núcleo clínico do Ultra Rotina compilado e inicializado com sucesso.');

module.exports = {
  ctx,
  propsStore,
  persistirPropriedades,
  rotinaBus,
  bumpRotinaVersion,
  getRotinaVersion,
  runWithOrigin,
  PropertiesService: ctx.PropertiesService,
  
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
        _rpcMap.cockpitConsultarFarmaco = ctx.cockpitConsultarFarmaco;
        _rpcMap.cockpitConversar = ctx.cockpitConversar;
        _rpcMap.cockpitPerfil = ctx.cockpitPerfil;
        _rpcMap.cockpitRegistrarPeso = ctx.cockpitRegistrarPeso;
        _rpcMap.cockpitAulasProgresso = ctx.cockpitAulasProgresso;
        _rpcMap.cockpitAlternarAula = ctx.cockpitAlternarAula;
        _rpcMap.cockpitChecarSeguranca = ctx.cockpitChecarSeguranca;
        _rpcMap.cockpitCompatibilidadeYDva = ctx.cockpitCompatibilidadeYDva;
        _rpcMap.cockpitSoapAmbulatorial = ctx.cockpitSoapAmbulatorial;
        _rpcMap.cockpitGerarReceitaTexto = ctx.cockpitGerarReceitaTexto;
        _rpcMap.cockpitGerarAtestadoTexto = ctx.cockpitGerarAtestadoTexto;
        _rpcMap.cockpitEstratificarRisco = ctx.cockpitEstratificarRisco;
        _rpcMap.cockpitBuscarCid = ctx.cockpitBuscarCid;
        _rpcMap.cockpitEstruturarCondutaHas = ctx.cockpitEstruturarCondutaHas;
        _rpcMap.cockpitGerarEncaminhamentoTexto = ctx.cockpitGerarEncaminhamentoTexto;
        _rpcMap.cockpitCalcularPrenatal = ctx.cockpitCalcularPrenatal;
        _rpcMap.cockpitRastreioTrimestre = ctx.cockpitRastreioTrimestre;
        _rpcMap.cockpitValidarFarmacoGestacao = ctx.cockpitValidarFarmacoGestacao;
        _rpcMap.cockpitAuditarPrescricaoGestante = ctx.cockpitAuditarPrescricaoGestante;
        _rpcMap.cockpitInterpretarSorologiasPrenatal = ctx.cockpitInterpretarSorologiasPrenatal;
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
        _rpcMap.executarFallbackLocalOffline = ctx.executarFallbackLocalOffline;
        _rpcMap.chamarOllamaNativoAPI = ctx.chamarOllamaNativoAPI;
        _rpcMap.cockpitRbac = ctx.cockpitRbac;
        _rpcMap.cockpitSuporteNutricional = ctx.cockpitSuporteNutricional;
        _rpcMap.cockpitOncologiaBasica = ctx.cockpitOncologiaBasica;
        _rpcMap.cockpitEndocrinologiaDiabetes = ctx.cockpitEndocrinologiaDiabetes;
        _rpcMap.cockpitPalsPediatria = ctx.cockpitPalsPediatria;
        _rpcMap.cockpitNeurologiaAvc = ctx.cockpitNeurologiaAvc;
        _rpcMap.cockpitToxicologiaEmergencia = ctx.cockpitToxicologiaEmergencia;
        _rpcMap.cockpitHepatologiaHda = ctx.cockpitHepatologiaHda;
        _rpcMap.cockpitAnalgesiaPca = ctx.cockpitAnalgesiaPca;
        _rpcMap.cockpitViaAereaDificil = ctx.cockpitViaAereaDificil;
        _rpcMap.cockpitAuditoriaKaizen = ctx.cockpitAuditoriaKaizen;
        _rpcMap.cockpitTransfusaoSanguinea = ctx.cockpitTransfusaoSanguinea;
        _rpcMap.cockpitNefrologiaClearance = ctx.cockpitNefrologiaClearance;
        _rpcMap.cockpitInfectologiaNeutropenia = ctx.cockpitInfectologiaNeutropenia;
        _rpcMap.cockpitGastroenterologiaPancreatite = ctx.cockpitGastroenterologiaPancreatite;
        _rpcMap.cockpitCardiologiaEmergencia = ctx.cockpitCardiologiaEmergencia;
        _rpcMap.cockpitCardiologiaIntensiva = ctx.cockpitCardiologiaIntensiva;
        _rpcMap.cockpitCardiologiaIcc = ctx.cockpitCardiologiaIcc;
        _rpcMap.cockpitICC = ctx.cockpitICC || ctx.cockpitCardiologiaIcc;
        _rpcMap.cockpitICDescompensada = ctx.cockpitICDescompensada;
        _rpcMap.cockpitChoqueSeptico = ctx.cockpitChoqueSeptico;
        _rpcMap.cockpitGasometriaAcidoBase = ctx.cockpitGasometriaAcidoBase;
        _rpcMap.cockpitGasometria = ctx.cockpitGasometria || ctx.cockpitGasometriaAcidoBase;
        _rpcMap.cockpitSuporteNutricionalPediatrico = ctx.cockpitSuporteNutricionalPediatrico;
        _rpcMap.cockpitNutricaoPediatrica = ctx.cockpitNutricaoPediatrica || ctx.cockpitSuporteNutricionalPediatrico;
        _rpcMap.cockpitHematologiaAnemias = ctx.cockpitHematologiaAnemias;
        _rpcMap.cockpitManejoAnemias = ctx.cockpitManejoAnemias || ctx.cockpitHematologiaAnemias;
        _rpcMap.cockpitAnemia = ctx.cockpitAnemia || ctx.cockpitHematologiaAnemias;
        _rpcMap.cockpitNefrologiaKdigo = ctx.cockpitNefrologiaKdigo;
        _rpcMap.cockpitPneumologiaAsma = ctx.cockpitPneumologiaAsma;
        _rpcMap.cockpitCriseAsmatica = ctx.cockpitCriseAsmatica || ctx.cockpitPneumologiaAsma;
        _rpcMap.cockpitObstetriciaRcf = ctx.cockpitObstetriciaRcf;
        _rpcMap.cockpitRestricaoCrescimentoFetal = ctx.cockpitRestricaoCrescimentoFetal || ctx.cockpitObstetriciaRcf;
        _rpcMap.cockpitHepatologiaColestase = ctx.cockpitHepatologiaColestase;
        _rpcMap.cockpitColestaseGestacional = ctx.cockpitColestaseGestacional || ctx.cockpitHepatologiaColestase;
        _rpcMap.cockpitHepatologiaColestaseGestacional = ctx.cockpitHepatologiaColestaseGestacional || ctx.cockpitHepatologiaColestase;
        _rpcMap.cockpitEhagSwansea = ctx.cockpitEhagSwansea;
        _rpcMap.cockpitObstetriciaToxoplasmose = ctx.cockpitObstetriciaToxoplasmose;
        _rpcMap.cockpitToxoplasmoseGestacional = ctx.cockpitToxoplasmoseGestacional || ctx.cockpitObstetriciaToxoplasmose;
        _rpcMap.cockpitCardiologiaFaAnticoagulacao = ctx.cockpitCardiologiaFaAnticoagulacao;
        _rpcMap.cockpitFibrilacaoAtrial = ctx.cockpitFibrilacaoAtrial || ctx.cockpitCardiologiaFaAnticoagulacao;
        _rpcMap.cockpitUrologiaColicaNefretica = ctx.cockpitUrologiaColicaNefretica;
        _rpcMap.cockpitColicaNefretica = ctx.cockpitColicaNefretica || ctx.cockpitUrologiaColicaNefretica;
        _rpcMap.cockpitPediatriaBronquiolite = ctx.cockpitPediatriaBronquiolite;
        _rpcMap.cockpitBronquiolite = ctx.cockpitBronquiolite || ctx.cockpitPediatriaBronquiolite;
        _rpcMap.cockpitEndocrinologiaHiperprolactinemia = ctx.cockpitEndocrinologiaHiperprolactinemia;
        _rpcMap.cockpitHiperprolactinemia = ctx.cockpitHiperprolactinemia || ctx.cockpitEndocrinologiaHiperprolactinemia;
        _rpcMap.cockpitGinecologiaEndometriose = ctx.cockpitGinecologiaEndometriose;
        _rpcMap.cockpitEndometriose = ctx.cockpitEndometriose || ctx.cockpitGinecologiaEndometriose;
        _rpcMap.cockpitObstetriciaSaf = ctx.cockpitObstetriciaSaf;
        _rpcMap.cockpitSafTrombofilias = ctx.cockpitSafTrombofilias || ctx.cockpitObstetriciaSaf;
        _rpcMap.cockpitSafGestacional = ctx.cockpitSafGestacional || ctx.cockpitObstetriciaSaf;
        _rpcMap.cockpitCardiologiaIcCronica = ctx.cockpitCardiologiaIcCronica;
        _rpcMap.cockpitIcCronica = ctx.cockpitIcCronica || ctx.cockpitCardiologiaIcCronica;
        _rpcMap.cockpitOftalmologiaEmergencia = ctx.cockpitOftalmologiaEmergencia;
        _rpcMap.cockpitOftalmologia = ctx.cockpitOftalmologia || ctx.cockpitOftalmologiaEmergencia;
        _rpcMap.cockpitGeriatriaFrax = ctx.cockpitGeriatriaFrax;
        _rpcMap.cockpitFrax = ctx.cockpitFrax || ctx.cockpitGeriatriaFrax;
        _rpcMap.cockpitGeriatriaOsteoporose = ctx.cockpitGeriatriaOsteoporose;
        _rpcMap.cockpitOsteoporose = ctx.cockpitOsteoporose || ctx.cockpitGeriatriaOsteoporose;
        _rpcMap.cockpitGeriatriaQuedas = ctx.cockpitGeriatriaQuedas;
        _rpcMap.cockpitQuedas = ctx.cockpitQuedas || ctx.cockpitGeriatriaQuedas;
        _rpcMap.cockpitGeriatriaPolifarmacia = ctx.cockpitGeriatriaPolifarmacia;
        _rpcMap.cockpitGeriatriaAvancada = ctx.cockpitGeriatriaAvancada;
        _rpcMap.cockpitPneumologiaDpocVni = ctx.cockpitPneumologiaDpocVni;
        _rpcMap.cockpitDpocVni = ctx.cockpitDpocVni || ctx.cockpitPneumologiaDpocVni;
        _rpcMap.cockpitReumatologiaMonoartrite = ctx.cockpitReumatologiaMonoartrite;
        _rpcMap.cockpitMonoartrite = ctx.cockpitMonoartrite || ctx.cockpitReumatologiaMonoartrite;
        _rpcMap.cockpitReumatologiaFebreReumatica = ctx.cockpitReumatologiaFebreReumatica;
        _rpcMap.cockpitFebreReumatica = ctx.cockpitFebreReumatica || ctx.cockpitReumatologiaFebreReumatica;
        _rpcMap.cockpitJones = ctx.cockpitJones || ctx.cockpitReumatologiaFebreReumatica;
        _rpcMap.cockpitDermatologiaLesao = ctx.cockpitDermatologiaLesao;
        _rpcMap.cockpitDermatologiaHerpes = ctx.cockpitDermatologiaHerpes;
        _rpcMap.cockpitHerpes = ctx.cockpitHerpes || ctx.cockpitDermatologiaHerpes;
        _rpcMap.cockpitZoster = ctx.cockpitZoster || ctx.cockpitDermatologiaHerpes;
        _rpcMap.cockpitDermatologiaUlcerasGenitais = ctx.cockpitDermatologiaUlcerasGenitais;
        _rpcMap.cockpitUlceraGenital = ctx.cockpitUlceraGenital || ctx.cockpitDermatologiaUlcerasGenitais;
        _rpcMap.cockpitDermatologiaSifilis = ctx.cockpitDermatologiaSifilis;
        _rpcMap.cockpitSifilis = ctx.cockpitSifilis || ctx.cockpitDermatologiaSifilis;
        _rpcMap.cockpitDermatologiaMpox = ctx.cockpitDermatologiaMpox;
        _rpcMap.cockpitMpox = ctx.cockpitMpox || ctx.cockpitDermatologiaMpox;
        _rpcMap.cockpitOtorrinoVertigemHints = ctx.cockpitOtorrinoVertigemHints;
        _rpcMap.cockpitVertigem = ctx.cockpitVertigem || ctx.cockpitOtorrinoVertigemHints;
        _rpcMap.cockpitHints = ctx.cockpitHints || ctx.cockpitOtorrinoVertigemHints;
        _rpcMap.cockpitOtorrinoEpistaxe = ctx.cockpitOtorrinoEpistaxe;
        _rpcMap.cockpitEpistaxe = ctx.cockpitEpistaxe || ctx.cockpitOtorrinoEpistaxe;
        _rpcMap.cockpitTamponamento = ctx.cockpitTamponamento || ctx.cockpitOtorrinoEpistaxe;
        _rpcMap.cockpitOtorrinoResumo = ctx.cockpitOtorrinoResumo;
        _rpcMap.cockpitArbovirosesDengue = ctx.cockpitArbovirosesDengue;
        _rpcMap.cockpitDengue = ctx.cockpitDengue || ctx.cockpitArbovirosesDengue;
        _rpcMap.cockpitPneumologiaPac = ctx.cockpitPneumologiaPac;
        _rpcMap.cockpitPac = ctx.cockpitPac || ctx.cockpitPneumologiaPac;
        _rpcMap.cockpitInfectologiaItu = ctx.cockpitInfectologiaItu;
        _rpcMap.cockpitItu = ctx.cockpitItu || ctx.cockpitInfectologiaItu;
        _rpcMap.cockpitEmergenciaCriseHipertensiva = ctx.cockpitEmergenciaCriseHipertensiva;
        _rpcMap.cockpitCriseHipertensiva = ctx.cockpitCriseHipertensiva || ctx.cockpitEmergenciaCriseHipertensiva;
        _rpcMap.cockpitNeurologiaCefaleias = ctx.cockpitNeurologiaCefaleias;
        _rpcMap.cockpitCefaleia = ctx.cockpitCefaleia || ctx.cockpitNeurologiaCefaleias;
        _rpcMap.cockpitPequenasUrgencias = ctx.cockpitPequenasUrgencias;
        _rpcMap.cockpitSutura = ctx.cockpitSutura || ctx.cockpitPequenasUrgencias;
        _rpcMap.cockpitMedicinaLegalObito = ctx.cockpitMedicinaLegalObito;
        _rpcMap.cockpitObito = ctx.cockpitObito || ctx.cockpitMedicinaLegalObito;
        _rpcMap.cockpitRotinaBlocos = ctx.cockpitRotinaBlocos;
        _rpcMap.cockpitRotinaMarcarStatus = ctx.cockpitRotinaMarcarStatus;
        _rpcMap.cockpitRotinaSyncAgenda = ctx.cockpitRotinaSyncAgenda;
        _rpcMap.cockpitRotinaAderencia = ctx.cockpitRotinaAderencia;
        _rpcMap.cockpitRotinaAdiarBloco = ctx.cockpitRotinaAdiarBloco;
        Object.freeze(_rpcMap);
      }
      if (!metodo || typeof metodo !== 'string') {
        throw new Error('Método do Cockpit deve ser uma string válida.');
      }
      const metodoTrim = metodo.trim();
      if (!metodoTrim || metodoTrim === '__proto__' || metodoTrim === 'constructor' || metodoTrim === 'prototype' || metodoTrim === 'toString' || metodoTrim === 'valueOf' || metodoTrim === 'hasOwnProperty' || metodoTrim === 'isPrototypeOf' || metodoTrim === 'propertyIsEnumerable') {
        throw new Error('Método solicitado inválido ou proibido.');
      }
      const fn = _rpcMap[metodoTrim] || null;
      if (typeof fn !== 'function') {
        throw new Error(`Método do Cockpit não suportado: ${metodoTrim}`);
      }
      const safeArgs = Array.isArray(args) ? args : (args !== undefined && args !== null ? [args] : []);
      return fn.apply(null, [session].concat(safeArgs));
    };
  })()
};
