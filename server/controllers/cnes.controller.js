/**
 * @file server/controllers/cnes.controller.js
 * @description Controller e rotas Fastify para busca instantânea de municípios e CNES.
 */

const { cnesService } = require('../../src/clinical/cnes_service');

async function cnesRoutes(fastify) {
  /**
   * GET /api/cnes/municipios?q=ribeirao
   */
  fastify.get('/api/cnes/municipios', async (request, reply) => {
    const startTime = process.hrtime.bigint();
    const { q = '', limit = 20 } = request.query || {};

    const resultados = cnesService.buscarMunicipios(q, Number(limit) || 20);
    const elapsedMs = Number(process.hrtime.bigint() - startTime) / 1e6;

    return reply.code(200).send({
      ok: true,
      count: resultados.length,
      latency_ms: Number(elapsedMs.toFixed(3)),
      municipios: resultados
    });
  });

  /**
   * GET /api/cnes/estabelecimentos?cidade=Ribeirao&ibge=3543402&q=upa&tipo=UPA
   */
  fastify.get('/api/cnes/estabelecimentos', async (request, reply) => {
    const startTime = process.hrtime.bigint();
    const { ibge, cidade, q = '', tipo = '', limit = 30 } = request.query || {};

    const estabelecimentos = cnesService.buscarEstabelecimentos({
      ibge,
      cidade,
      q,
      tipo,
      limit: Number(limit) || 30
    });

    const elapsedMs = Number(process.hrtime.bigint() - startTime) / 1e6;

    return reply.code(200).send({
      ok: true,
      count: estabelecimentos.length,
      latency_ms: Number(elapsedMs.toFixed(3)),
      estabelecimentos
    });
  });

  /**
   * POST /api/cnes/personalizado
   * Salva ou valida um consultório próprio / clínica personalizada do médico.
   */
  fastify.post('/api/cnes/personalizado', async (request, reply) => {
    try {
      const payload = request.body || {};
      const salvo = cnesService.registrarEstabelecimentoPersonalizado(payload);
      const cabecalho = cnesService.formatarCabecalhoReceituario(salvo);

      return reply.code(201).send({
        ok: true,
        estabelecimento: salvo,
        cabecalho
      });
    } catch (err) {
      return reply.code(400).send({
        ok: false,
        error: err.message || 'Erro ao cadastrar estabelecimento personalizado.'
      });
    }
  });
}

module.exports = cnesRoutes;
