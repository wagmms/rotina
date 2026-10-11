/** Medições de latência sem URLs, corpos de requisição ou conteúdo clínico. */
function roundMs(value) {
  return Math.round(Math.max(0, value) * 10) / 10;
}

function updateKind(update) {
  if (update.inline_query) return 'inline_query';
  if (update.callback_query) return 'callback';
  const message = update.message || {};
  if (message.web_app_data) return 'web_app_data';
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

// Estruturas leves em memória (O(1)) para telemetria em tempo real
const latenciasRecentes = [];
const ultimosErros = [];
const contadoresHttp = {
  total: 0,
  status2xx: 0,
  status3xx: 0,
  status4xx: 0,
  status5xx: 0,
  rotas: {},
  inicioEm: new Date().toISOString()
};

function registrarErroSistema(origem, mensagem, detalhes = null) {
  try {
    const agora = new Date();
    const item = {
      timestamp: agora.toISOString(),
      origem: String(origem || 'sistema'),
      mensagem: String(mensagem || '').slice(0, 300),
      detalhes: detalhes || null
    };
    ultimosErros.unshift(item);
    if (ultimosErros.length > 20) {
      ultimosErros.pop();
    }
  } catch (_) {}
}

function obterUltimosErros(limite = 10) {
  return ultimosErros.slice(0, Math.max(1, Math.min(50, limite)));
}

function registrarMetricaHttp(metodo, rota, status, duracaoMs) {
  try {
    const duracao = roundMs(duracaoMs);
    contadoresHttp.total++;
    const code = Number(status) || 0;
    if (code >= 200 && code < 300) contadoresHttp.status2xx++;
    else if (code >= 300 && code < 400) contadoresHttp.status3xx++;
    else if (code >= 400 && code < 500) contadoresHttp.status4xx++;
    else if (code >= 500) {
      contadoresHttp.status5xx++;
      registrarErroSistema('http_5xx', `HTTP ${code} em ${metodo} ${rota}`, { duracao_ms: duracao });
    }

    const rotaKey = `${metodo} ${rota || '/'}`;
    contadoresHttp.rotas[rotaKey] = (contadoresHttp.rotas[rotaKey] || 0) + 1;

    latenciasRecentes.push(duracao);
    if (latenciasRecentes.length > 100) {
      latenciasRecentes.shift();
    }
  } catch (_) {}
}

function calcularEstatisticasLatencia() {
  if (latenciasRecentes.length === 0) {
    return { media_ms: 0, p95_ms: 0, max_ms: 0, amostras: 0 };
  }
  const soma = latenciasRecentes.reduce((acc, v) => acc + v, 0);
  const media = roundMs(soma / latenciasRecentes.length);
  const ordenados = [...latenciasRecentes].sort((a, b) => a - b);
  const idxP95 = Math.min(ordenados.length - 1, Math.floor(0.95 * ordenados.length));
  const p95 = roundMs(ordenados[idxP95]);
  const max = roundMs(ordenados[ordenados.length - 1]);
  return { media_ms: media, p95_ms: p95, max_ms: max, amostras: latenciasRecentes.length };
}

function obterMetricasAgregadas() {
  const mem = process.memoryUsage();
  const totalReq = contadoresHttp.total;
  const totalErros = contadoresHttp.status4xx + contadoresHttp.status5xx;
  const taxaErroPct = totalReq > 0 ? roundMs((totalErros / totalReq) * 100) : 0;
  
  return {
    uptime_segundos: Math.floor(process.uptime()),
    inicio_timestamp: contadoresHttp.inicioEm,
    memoria_mb: {
      rss: Math.round(mem.rss / 1048576),
      heap_total: Math.round(mem.heapTotal / 1048576),
      heap_used: Math.round(mem.heapUsed / 1048576),
      external: Math.round(mem.external / 1048576)
    },
    requisicoes: {
      total: contadoresHttp.total,
      sucesso_2xx: contadoresHttp.status2xx,
      redirecionamento_3xx: contadoresHttp.status3xx,
      erro_cliente_4xx: contadoresHttp.status4xx,
      erro_servidor_5xx: contadoresHttp.status5xx,
      taxa_erro_pct: taxaErroPct
    },
    latencia: calcularEstatisticasLatencia(),
    rotas_mais_acessadas: contadoresHttp.rotas,
    ultimos_erros: obterUltimosErros(10)
  };
}

function limparMetricasTeste() {
  latenciasRecentes.length = 0;
  ultimosErros.length = 0;
  contadoresHttp.total = 0;
  contadoresHttp.status2xx = 0;
  contadoresHttp.status3xx = 0;
  contadoresHttp.status4xx = 0;
  contadoresHttp.status5xx = 0;
  contadoresHttp.rotas = {};
}

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
  obterUltimasInteracoes,
  registrarMetricaHttp,
  obterMetricasAgregadas,
  registrarErroSistema,
  obterUltimosErros,
  limparMetricasTeste
};

