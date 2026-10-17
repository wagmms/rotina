/**
 * @file tests/test_cnes_api.cjs
 * @description Testes de integração para as rotas REST do CNES (/api/cnes/*) no Fastify.
 */

const assert = require('node:assert/strict');
const fastifyLib = require('fastify');
const cnesRoutes = require('../server/controllers/cnes.controller');

async function runTests() {
  console.log('🧪 Iniciando testes de integração da API CNES no Fastify...');
  const app = fastifyLib({ logger: false });
  await app.register(cnesRoutes);

  // 1. GET /api/cnes/municipios
  const resMunicipios = await app.inject({
    method: 'GET',
    url: '/api/cnes/municipios?q=sao%20paulo'
  });
  assert.equal(resMunicipios.statusCode, 200);
  const dataMun = resMunicipios.json();
  assert.equal(dataMun.ok, true);
  assert.ok(dataMun.municipios.some((m) => m.ibge === '3550308'));

  // 2. GET /api/cnes/estabelecimentos com filtro de tipo
  const resEst = await app.inject({
    method: 'GET',
    url: '/api/cnes/estabelecimentos?cidade=Ribeirao%20Preto&tipo=HOSPITAL'
  });
  assert.equal(resEst.statusCode, 200);
  const dataEst = resEst.json();
  assert.equal(dataEst.ok, true);
  assert.ok(dataEst.estabelecimentos.length >= 3);
  assert.ok(dataEst.estabelecimentos.every((e) => e.tipo === 'HOSPITAL'));

  // 3. POST /api/cnes/personalizado
  const resCustom = await app.inject({
    method: 'POST',
    url: '/api/cnes/personalizado',
    payload: {
      nome_fantasia: 'Consultório Integrado de Cardiologia',
      cidade: 'Campinas',
      uf: 'SP',
      logradouro: 'Rua Barreto Leme, 1200',
      bairro: 'Cambuí',
      cep: '13025-085',
      telefone: '(19) 3211-9988'
    }
  });
  assert.equal(resCustom.statusCode, 201);
  const dataCustom = resCustom.json();
  assert.equal(dataCustom.ok, true);
  assert.equal(dataCustom.estabelecimento.nome_fantasia, 'Consultório Integrado de Cardiologia');
  assert.ok(dataCustom.cabecalho.endereco_linha1.includes('Cambuí'));

  await app.close();
  console.log('✅ Todos os endpoints da API CNES responderam com sucesso e schema validado!');
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes da API CNES:', err);
  process.exit(1);
});
