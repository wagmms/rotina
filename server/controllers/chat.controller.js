/**
 * ==============================================================================
 * ULTRA ROTINA · CHAT CONTROLLER (/api/chat)
 * ==============================================================================
 * Controlador desacoplado para chat clínico, assistente IA e contingência offline.
 * Processamento multimodal (áudio ditado de leito / texto) e fast-ack beira-leito.
 * ==============================================================================
 */

const {
  ehErroAutenticacaoOuSessao,
  sanitizarMensagemErro,
  verificarPayloadSeguro
} = require('./utils');

function preValidationChat(request, reply, done) {
  if (!verificarPayloadSeguro(request, reply, 'do Chat')) {
    return;
  }
  done();
}

async function handlerChat(request, reply, runtime, { registrarInteracaoAoVivo, fastifyLog } = {}) {
  const t0 = performance.now();
  try {
    const body = request.body || {};
    const session = body.session || body.token || (typeof request.headers['authorization'] === 'string' ? request.headers['authorization'].replace(/^Bearer\s+/i, '').trim() : '') || '';
    const texto = body.mensagem || body.texto || body.prompt || '';
    const acao = typeof body.acao === 'string' ? body.acao.trim() : 'enviar';
    const audioBase64 = body.audioBase64 || null;
    const mime = typeof body.mime === 'string' ? body.mime.trim() : 'audio/webm';

    if (!session) {
      reply.status(401).send({
        ok: false,
        erro: 'Sessão ausente, inválida ou expirada. Autentique-se via Telegram para interagir com o chat clínico.',
        detalhes: 'Token de sessão do Cockpit não fornecido.',
        requestId: request.id
      });
      return;
    }

    const params = {
      acao,
      texto: String(texto),
      audioBase64,
      mime,
      fallbackLocal: !!body.fallbackLocal
    };

    const resultado = runtime.cockpitRpc('cockpitConversar', session, [params]);
    const elapsed = (performance.now() - t0).toFixed(2);

    if (typeof registrarInteracaoAoVivo === 'function') {
      registrarInteracaoAoVivo({
        origem: 'fastify_rest_chat',
        tipo: 'chat',
        resumo: `Chat REST: ${acao} - "${String(texto).slice(0, 40)}"`,
        duracao_ms: Number(elapsed),
        status: 'sucesso'
      });
    }

    return {
      ok: true,
      resultado,
      resposta: resultado?.resposta || resultado?.mensagem || resultado,
      soap: resultado?.soap || '',
      benchmark_ms: Number(elapsed),
      contingencia_offline: !!(
        resultado?.contingencia_offline ||
        resultado?.deterministico ||
        resultado?.offline_disponivel ||
        (typeof (resultado?.resposta || resultado?.mensagem || '') === 'string' && /conting[êe]ncia|modo\s+offline|protocolos?\s+offline|offline/i.test(String(resultado?.resposta || resultado?.mensagem || '')))
      )
    };
  } catch (err) {
    const elapsed = (performance.now() - t0).toFixed(2);
    if (fastifyLog && typeof fastifyLog.warn === 'function') {
      fastifyLog.warn(`[Chat REST Error] ${err.message} (${elapsed}ms)`);
    }

    const isAuthError = ehErroAutenticacaoOuSessao(err);

    // Fast-Ack / Fallback de Alta Disponibilidade para o Chat Beira-Leito:
    // Se NÃO for erro de autenticação e for erro de IA/timeout/provedor ou solicitação explícita de fallback:
    const body = request.body || {};
    const texto = body.mensagem || body.texto || body.prompt || '';
    const ehErroIA = err.message && (/ia|gemini|timeout|timed\s*out|provedor|fetch|quota|socket|redirecionar|conexão/i.test(err.message));
    if (!isAuthError && texto && (ehErroIA || body.fallbackLocal)) {
      try {
        const fallbackRes = (runtime.ctx && runtime.ctx.executarFallbackLocalOffline && typeof runtime.ctx.executarFallbackLocalOffline === 'function')
          ? runtime.ctx.executarFallbackLocalOffline('Você é copiloto médico de emergência.', String(texto), { clinico: true })
          : (runtime.ctx && runtime.ctx.IaLocalFallbackService ? runtime.ctx.IaLocalFallbackService.gerarRespostaOfflineClinica(null, String(texto)) : null);

        if (fallbackRes) {
          if (typeof registrarInteracaoAoVivo === 'function') {
            registrarInteracaoAoVivo({
              origem: 'fastify_rest_chat',
              tipo: 'chat_fallback',
              resumo: `Chat Fallback: "${String(texto).slice(0, 40)}"`,
              duracao_ms: Number(elapsed),
              status: 'fallback'
            });
          }

          return {
            ok: true,
            contingencia_offline: true,
            origem: 'fallback_local_offline',
            resultado: { resposta: String(fallbackRes), soap: String(fallbackRes), contingencia_offline: true },
            resposta: String(fallbackRes),
            soap: String(fallbackRes),
            aviso: 'Processado pelo Motor de Fallback Local Offline após indisponibilidade temporária do provedor em nuvem.',
            benchmark_ms: Number(elapsed)
          };
        }
      } catch (eFallback) {
        if (fastifyLog && typeof fastifyLog.warn === 'function') {
          fastifyLog.warn(`[Chat Fallback Error] ${eFallback.message}`);
        }
      }
    }

    if (typeof registrarInteracaoAoVivo === 'function') {
      registrarInteracaoAoVivo({
        origem: 'fastify_rest_chat',
        tipo: 'chat',
        resumo: `Chat REST: ${request.body?.acao || 'enviar'}`,
        duracao_ms: Number(elapsed),
        status: 'erro',
        detalhes: err.message
      });
    }

    reply.status(isAuthError ? 401 : 400);
    return {
      ok: false,
      erro: isAuthError
        ? 'Sessão ausente, inválida ou expirada. Autentique-se via Telegram para interagir com o chat clínico.'
        : (sanitizarMensagemErro(err.message) || 'Falha ao processar mensagem do chat clínico.'),
      detalhes: sanitizarMensagemErro(err.message),
      benchmark_ms: Number(elapsed),
      requestId: request.id
    };
  }
}

module.exports = {
  preValidationChat,
  handlerChat
};
