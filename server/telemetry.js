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

module.exports = { roundMs, updateKind, measureLegacyHttp, clinicalStages };
