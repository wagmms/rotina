/** Medições de latência sem URLs, corpos de requisição ou conteúdo clínico. */
function roundMs(value) {
  return Math.round(Math.max(0, value) * 10) / 10;
}

function updateKind(update) {
  if (update.callback_query) return 'callback';
  const message = update.message || {};
  if (message.voice) return 'voice';
  if (message.audio) return 'audio';
  if (message.photo) return 'photo';
  if (message.document) return 'document';
  return 'text';
}

function httpKind(rawUrl) {
  try {
    const { hostname, pathname } = new URL(String(rawUrl));
    if (hostname === 'api.telegram.org') {
      if (pathname.endsWith('/sendChatAction')) return 'telegram_action';
      if (pathname.endsWith('/getFile')) return 'telegram_get_file';
      if (pathname.startsWith('/file/')) return 'telegram_download';
      if (/\/send[A-Za-z]+$/.test(pathname) || pathname.endsWith('/editMessageText')) return 'telegram_delivery';
      return 'telegram_other';
    }
    if (hostname === 'generativelanguage.googleapis.com') return 'gemini';
    if (hostname === 'api.groq.com') return 'groq';
    if (hostname === 'openrouter.ai') return 'openrouter';
    if (hostname === 'api.z.ai') return 'zai';
  } catch (_) {}
  return 'other';
}

function measureLegacyHttp(ctx, metrics, action) {
  const original = ctx.UrlFetchApp.fetch;
  ctx.UrlFetchApp.fetch = function (...args) {
    const kind = httpKind(args[0]);
    const start = performance.now();
    let failed = true;
    try {
      const response = original.apply(this, args);
      failed = false;
      // muteHttpExceptions transforma 4xx/5xx em respostas, não em exceções.
      // Falha na leitura da métrica jamais altera o resultado da chamada.
      try {
        const status = typeof response.getResponseCode === 'function' ? Number(response.getResponseCode()) : Number(response.status);
        if (status >= 400) failed = true;
      } catch (_) {}
      return response;
    } finally {
      const entry = metrics[kind] || { calls: 0, errors: 0, ms: 0 };
      entry.calls++;
      if (failed) entry.errors++;
      entry.ms = roundMs(entry.ms + performance.now() - start);
      metrics[kind] = entry;
    }
  };
  try {
    return action();
  } finally {
    ctx.UrlFetchApp.fetch = original;
  }
}

function clinicalStages(job) {
  const allowed = ['download_midia', 'processamento_audio', 'geracao_clinica'];
  const source = job && job.metricas && job.metricas.etapas || {};
  const stages = {};
  for (const name of allowed) {
    const entry = source[name];
    if (!entry || typeof entry !== 'object') continue;
    const ms = Number(entry.ms);
    const calls = Number(entry.chamadas);
    const errors = Number(entry.falhas);
    if (!Number.isFinite(ms) || !Number.isFinite(calls) || !Number.isFinite(errors)) continue;
    stages[name] = { ms: roundMs(ms), calls: Math.max(0, calls), errors: Math.max(0, errors) };
  }
  return stages;
}

const fs = require('fs');
const path = require('path');

const LOGS_FILE = path.join(__dirname, '..', 'logs', 'interacao_ao_vivo.jsonl');
const MAX_LOG_BYTES = 5 * 1024 * 1024; // 5 MB

function registrarInteracaoAoVivo(evento) {
  try {
    const agora = new Date();
    const registro = {
      timestamp: agora.toISOString(),
      hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      origem: evento.origem || 'desconhecido',
      tipo: evento.tipo || 'geral',
      resumo: String(evento.resumo || '').slice(0, 250),
      duracao_ms: roundMs(evento.duracao_ms || 0),
      status: evento.status || 'sucesso',
      detalhes: evento.detalhes || null
    };

    const dir = path.dirname(LOGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Rotação leve se exceder tamanho máximo
    try {
      if (fs.existsSync(LOGS_FILE) && fs.statSync(LOGS_FILE).size > MAX_LOG_BYTES) {
        const conteudo = fs.readFileSync(LOGS_FILE, 'utf-8');
        const linhas = conteudo.trim().split('\n');
        fs.writeFileSync(LOGS_FILE, linhas.slice(-500).join('\n') + '\n', 'utf-8');
      }
    } catch (_) {}

    fs.appendFile(LOGS_FILE, JSON.stringify(registro) + '\n', (err) => {
      if (err) console.error('[Telemetria] Falha ao registrar interação:', err.message);
    });
  } catch (_) {
    // Falha em telemetria jamais afeta fluxo de atendimento
  }
}

function obterUltimasInteracoes(limite = 30) {
  try {
    if (!fs.existsSync(LOGS_FILE)) return [];
    const conteudo = fs.readFileSync(LOGS_FILE, 'utf-8');
    const linhas = conteudo.trim().split('\n').filter(Boolean);
    const selecionadas = linhas.slice(-limite);
    return selecionadas.map(l => {
      try { return JSON.parse(l); } catch (_) { return null; }
    }).filter(Boolean);
  } catch (_) {
    return [];
  }
}

module.exports = {
  roundMs,
  updateKind,
  measureLegacyHttp,
  clinicalStages,
  registrarInteracaoAoVivo,
  obterUltimasInteracoes
};
