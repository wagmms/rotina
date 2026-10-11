/**
 * ==============================================================================
 * ULTRA ROTINA · CONTROLLERS UTILS (HELPERS E SANITIZAÇÃO HTTP)
 * ==============================================================================
 * Funções utilitárias compartilhadas entre os controladores Fastify.
 * ==============================================================================
 */

const crypto = require('crypto');

function ehErroAutenticacaoOuSessao(err) {
  if (!err) return false;
  const msg = typeof err === 'string' ? err : (err.message || '');
  return /autorizad[ao]|sess[aã]o|expirad[ao]|token|n[aã]o\s+permitid[ao]|credencia[li]s?/i.test(msg);
}

function sanitizarMensagemErro(msg) {
  if (typeof msg !== 'string') return 'Erro na requisição.';
  const limpo = msg.split(/\r?\n/).filter(line => !/^\s*at\s+.*\(.*:\d+:\d+\)/.test(line)).join(' ').trim();
  return limpo.replace(/\/home\/[^\s:]+|\/app\/[^\s:]+/g, '[servidor]');
}

function gerarETag(conteudo) {
  if (!conteudo) return '"0"';
  const buffer = Buffer.isBuffer(conteudo)
    ? conteudo
    : Buffer.from(typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo));
  const hash = crypto.createHash('sha1').update(buffer).digest('hex').substring(0, 16);
  return `"${hash}"`;
}

function etagCorresponde(headerIfNoneMatch, etag) {
  if (!headerIfNoneMatch || !etag) return false;
  const tags = headerIfNoneMatch.split(',').map(t => t.trim().replace(/^W\//, ''));
  const target = etag.replace(/^W\//, '');
  return tags.includes(target) || tags.includes('*');
}

/**
 * Validação segura de payload JSON na camada de pré-validação HTTP:
 * 1. Converte string JSON malformada com 400 imediato
 * 2. Bloqueia arrays vazios ou primitivos na raiz
 * 3. Protege contra prototype pollution (__proto__, constructor, prototype)
 */
function verificarPayloadSeguro(request, reply, nomeEntidade = 'da requisição') {
  let body = request.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
      request.body = body;
    } catch (_) {
      reply.status(400).send({
        ok: false,
        erro: 'Corpo da requisição contém JSON malformado ou string não parseável.',
        detalhes: 'Não foi possível converter a entrada para um objeto JSON válido.',
        requestId: request.id
      });
      return false;
    }
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    reply.status(400).send({
      ok: false,
      erro: `Payload ${nomeEntidade} deve ser um objeto JSON não nulo.`,
      detalhes: 'O corpo recebido não é um objeto JSON válido.',
      requestId: request.id
    });
    return false;
  }

  if (Object.getPrototypeOf(body) !== Object.prototype && Object.getPrototypeOf(body) !== null) {
    reply.status(400).send({
      ok: false,
      erro: 'Payload contém protótipo alterado ou propriedade reservada proibida.',
      detalhes: 'Tentativa de prototype pollution bloqueada.',
      requestId: request.id
    });
    return false;
  }

  for (const k of ['__proto__', 'constructor', 'prototype']) {
    if (Object.prototype.hasOwnProperty.call(body, k)) {
      reply.status(400).send({
        ok: false,
        erro: 'Payload contém propriedade reservada proibida.',
        detalhes: 'Tentativa de prototype pollution bloqueada.',
        requestId: request.id
      });
      return false;
    }
  }

  return true;
}

const COCKPIT_READ_METHODS = new Set([
  'cockpitConsultar', 'cockpitPerfil', 'cockpitRemume', 'cockpitAulasProgresso',
  'cockpitBuscarCid', 'cockpitEstratificarRisco', 'cockpitConsultarFarmaco'
]);

module.exports = {
  ehErroAutenticacaoOuSessao,
  sanitizarMensagemErro,
  gerarETag,
  etagCorresponde,
  verificarPayloadSeguro,
  COCKPIT_READ_METHODS
};
