const { processClinicalSoap } = require('../../src/clinical/soap_service.js');

/**
 * Controller para o endpoint de processamento clínico no formato SOAP.
 * 
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 * @param {Object} [options={}]
 */
async function handlerClinicalSoap(request, reply, options = {}) {
  try {
    const body = request.body;

    if (!body || !body.brain_dump) {
      return reply.status(400).send({
        ok: false,
        error: 'O campo "brain_dump" é obrigatório.',
      });
    }

    const result = await processClinicalSoap(body);

    if (typeof options.registrarInteracaoAoVivo === 'function') {
      options.registrarInteracaoAoVivo({
        modulo: 'clinical_soap',
        acao: 'process_soap',
        timestamp: new Date().toISOString(),
        sucesso: true,
      });
    }

    return reply.status(200).send({
      ok: true,
      ...result,
    });
  } catch (err) {
    const logger = request.log?.error ? request.log.error.bind(request.log) : console.error;
    logger(err);

    return reply.status(500).send({
      ok: false,
      error: err.message || 'Falha no processamento clínico do SOAP',
    });
  }
}

module.exports = { handlerClinicalSoap };