/**
 * ==============================================================================
 * ULTRA ROTINA · CALCULADORA CONTROLLER (/api/calcular e /api/calc)
 * ==============================================================================
 * Controlador desacoplado para execução de cálculos clínicos de emergência,
 * pediatria, gasometria, ajuste renal e drogas vasoativas em RAM.
 * ==============================================================================
 */

const {
  ehErroAutenticacaoOuSessao,
  sanitizarMensagemErro,
  verificarPayloadSeguro
} = require('./utils');
const { validarParametrosCalculadora } = require('../validators');

function preValidationCalcular(request, reply, done) {
  if (!verificarPayloadSeguro(request, reply, 'da requisição')) {
    return;
  }

  const { tipo, parametros } = request.body;
  const validacao = validarParametrosCalculadora(tipo, parametros);
  if (!validacao.valido) {
    reply.status(400).send({
      ok: false,
      erro: `Parâmetros inválidos para a calculadora: ${validacao.erro}`,
      detalhes: validacao.erro,
      requestId: request.id
    });
    return;
  }
  request.body.parametros = validacao.entradaSanitizada;
  done();
}

async function handlerCalcular(request, reply, runtime, { registrarInteracaoAoVivo } = {}) {
  const t0 = performance.now();
  try {
    const { tipo, parametros, session, token } = request.body;
    const sessao = session || token || '';
    const resultado = runtime.cockpitRpc('cockpitCalcular', sessao, [tipo, parametros]);
    const elapsed = (performance.now() - t0).toFixed(2);

    if (typeof registrarInteracaoAoVivo === 'function') {
      registrarInteracaoAoVivo({
        origem: 'fastify_rest_calc',
        tipo: 'calculadora',
        resumo: `Calc REST: ${tipo}`,
        duracao_ms: Number(elapsed),
        status: 'sucesso'
      });
    }

    return {
      ok: true,
      tipo,
      resultado,
      benchmark_ms: Number(elapsed)
    };
  } catch (err) {
    const elapsed = (performance.now() - t0).toFixed(2);
    const isAuthError = ehErroAutenticacaoOuSessao(err);
    reply.status(isAuthError ? 401 : 400);
    return {
      ok: false,
      erro: sanitizarMensagemErro(err.message) || 'Falha ao processar cálculo clínico.',
      detalhes: sanitizarMensagemErro(err.message),
      benchmark_ms: Number(elapsed),
      requestId: request.id
    };
  }
}

module.exports = {
  preValidationCalcular,
  handlerCalcular
};
