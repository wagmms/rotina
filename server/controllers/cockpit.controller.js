/**
 * ==============================================================================
 * ULTRA ROTINA · COCKPIT CONTROLLER (/api/cockpit)
 * ==============================================================================
 * Controlador desacoplado para a API RPC do Cockpit PWA.
 * Processamento determinístico em RAM, controle fino de cache HTTP e ETag.
 * ==============================================================================
 */

const {
  ehErroAutenticacaoOuSessao,
  sanitizarMensagemErro,
  etagCorresponde,
  verificarPayloadSeguro,
  COCKPIT_READ_METHODS
} = require('./utils');
const { validarParametrosCalculadora } = require('../validators');

function preValidationCockpit(request, reply, done) {
  if (!verificarPayloadSeguro(request, reply, 'do Cockpit')) {
    return;
  }

  const body = request.body;
  const metodo = typeof body.metodo === 'string' ? body.metodo.trim() : '';
  if (!metodo) {
    reply.status(400).send({
      ok: false,
      erro: 'Parâmetro "metodo" deve ser uma string válida.',
      detalhes: 'O método RPC solicitado não foi informado ou é inválido.',
      requestId: request.id
    });
    return;
  }

  if (metodo === '__proto__' || metodo === 'constructor' || metodo === 'prototype') {
    reply.status(400).send({
      ok: false,
      erro: 'Método solicitado inválido ou proibido.',
      detalhes: 'Tentativa de acesso a propriedade reservada.',
      requestId: request.id
    });
    return;
  }

  // Validação e sanitização estrita para calculadoras clínicas no handshake
  if (metodo === 'cockpitCalcular') {
    let args = body.args;
    if (!Array.isArray(args) || args.length < 2) {
      reply.status(400).send({
        ok: false,
        erro: 'Argumentos de cálculo devem conter [tipo, parametros].',
        detalhes: 'Esperado array com tipo de calculadora e objeto de parâmetros.',
        requestId: request.id
      });
      return;
    }
    const tipo = args[0];
    const entrada = args[1];
    const validacao = validarParametrosCalculadora(tipo, entrada);
    if (!validacao.valido) {
      reply.status(400).send({
        ok: false,
        erro: `Parâmetros inválidos para a calculadora: ${validacao.erro}`,
        detalhes: validacao.erro,
        requestId: request.id
      });
      return;
    }
    args[1] = validacao.entradaSanitizada;
  }

  done();
}

async function handlerCockpit(request, reply, runtime, { obterRemumeCacheada, registrarInteracaoAoVivo, fastifyLog } = {}) {
  const t0 = performance.now();
  try {
    let body = request.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (_) { body = {}; }
    }
    body = body || {};

    const metodo = (body && typeof body.metodo === 'string') ? body.metodo.trim() : '';
    const session = (body && (body.session || body.token)) ? String(body.session || body.token) : '';
    let args = body && body.args;
    if (args === undefined || args === null) {
      args = [];
    } else if (!Array.isArray(args)) {
      args = [args];
    }

    if (!metodo) {
      reply.status(400);
      return { ok: false, erro: 'Parâmetro "metodo" deve ser uma string válida.' };
    }

    // Otimização de Caching HTTP para Catálogo REMUME (ETag e 304 Condicional)
    if (metodo === 'cockpitRemume' && typeof obterRemumeCacheada === 'function') {
      const { etag: remumeEtag } = obterRemumeCacheada();
      reply.header('ETag', remumeEtag);
      reply.header('Cache-Control', 'private, max-age=3600, stale-while-revalidate=86400');

      if (etagCorresponde(request.headers['if-none-match'], remumeEtag)) {
        reply.status(304).send();
        return;
      }

      const clientEtag = (body && body.etag) || (args && args[0] && args[0].etag);
      if (clientEtag && etagCorresponde(String(clientEtag), remumeEtag)) {
        const elapsed = (performance.now() - t0).toFixed(2);
        return {
          ok: true,
          notModified: true,
          etag: remumeEtag,
          benchmark_ms: Number(elapsed)
        };
      }
    }

    const resultado = await runtime.cockpitRpc(metodo, session, args);
    const elapsed = (performance.now() - t0).toFixed(2);

    // Métodos de leitura: cabeçalhos de cache otimizados com stale-while-revalidate
    if (metodo !== 'cockpitRemume') {
      if (metodo === 'cockpitConsultar' || metodo === 'cockpitPerfil') {
        reply.header('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
      } else if (metodo === 'cockpitBuscarCid' || metodo === 'cockpitAulasProgresso' || metodo === 'cockpitEstratificarRisco') {
        reply.header('Cache-Control', 'private, max-age=1800, stale-while-revalidate=86400');
      } else if (COCKPIT_READ_METHODS.has(metodo)) {
        reply.header('Cache-Control', 'private, max-age=30, stale-while-revalidate=120');
      } else {
        reply.header('Cache-Control', 'no-store');
      }
    }

    // Telemetria ao vivo da interação no Cockpit
    if (typeof registrarInteracaoAoVivo === 'function') {
      registrarInteracaoAoVivo({
        origem: 'cockpit_pwa',
        tipo: 'rpc',
        resumo: `RPC: ${metodo}${args && args[0] && args[0].acao ? ' (' + args[0].acao + ')' : ''}`,
        duracao_ms: Number(elapsed),
        status: 'sucesso'
      });
    }

    return {
      ok: true,
      resultado,
      benchmark_ms: Number(elapsed)
    };
  } catch (err) {
    const elapsed = (performance.now() - t0).toFixed(2);
    if (fastifyLog && typeof fastifyLog.warn === 'function') {
      fastifyLog.warn(`[Cockpit RPC Error] ${err.message} (${elapsed}ms)`);
    }

    if (typeof registrarInteracaoAoVivo === 'function') {
      registrarInteracaoAoVivo({
        origem: 'cockpit_pwa',
        tipo: 'rpc',
        resumo: `RPC: ${request.body?.metodo || 'desconhecido'}`,
        duracao_ms: Number(elapsed),
        status: 'erro',
        detalhes: err.message
      });
    }

    reply.header('Cache-Control', 'no-store');
    const isAuthError = ehErroAutenticacaoOuSessao(err);
    reply.status(isAuthError ? 401 : 400);
    return {
      ok: false,
      erro: sanitizarMensagemErro(err.message) || 'Falha ao processar solicitação clínica.',
      detalhes: sanitizarMensagemErro(err.message),
      benchmark_ms: Number(elapsed),
      requestId: request.id
    };
  }
}

module.exports = {
  preValidationCockpit,
  handlerCockpit
};
