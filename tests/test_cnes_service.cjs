/**
 * @file tests/test_cnes_service.cjs
 * @description Testes automatizados para o serviço CNES e Cabeçalho de Receituário.
 */

const assert = require('node:assert/strict');
const { CnesService } = require('../src/clinical/cnes_service');

function runTests() {
  console.log('🧪 Iniciando testes do CnesService (CNES & Cabeçalho de Receituário)...');
  const service = new CnesService();

  // 1. Busca de municípios e latência < 5ms
  const t0 = process.hrtime.bigint();
  const cidadesRP = service.buscarMunicipios('ribeirao preto');
  const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6;

  assert.equal(cidadesRP.length, 1, 'Deve encontrar Ribeirão Preto sem acento');
  assert.equal(cidadesRP[0].ibge, '3543402', 'Código IBGE de Ribeirão Preto deve ser 3543402');
  assert.ok(elapsedMs < 5, `Busca de municípios deve responder em < 5ms (atual: ${elapsedMs.toFixed(3)}ms)`);

  // 2. Busca de estabelecimentos por cidade e por código IBGE
  const estabelecimentosRP = service.buscarEstabelecimentos({ cidade: 'Ribeirao Preto' });
  assert.ok(estabelecimentosRP.length >= 5, 'Deve retornar hospitais, UPAs e UBS de Ribeirão Preto');

  const estabelecimentosSP = service.buscarEstabelecimentos({ ibge: '3550308', q: 'Einstein' });
  assert.ok(estabelecimentosSP.length >= 1, 'Deve encontrar estabelecimentos do Albert Einstein em SP');
  assert.ok(estabelecimentosSP.some(e => e.nome_fantasia.toUpperCase().includes('EINSTEIN')), 'Deve conter unidades do Einstein');

  // 3. Filtro estrito por tipo (UPA, HOSPITAL, UBS)
  const upasRP = service.buscarEstabelecimentos({ ibge: '3543402', tipo: 'UPA' });
  assert.ok(upasRP.length >= 2, 'Deve retornar as UPAs de Ribeirão Preto');
  assert.ok(upasRP.every((u) => u.tipo === 'UPA'), 'Todos os itens filtrados devem ser do tipo UPA');

  // 4. Persistência de Consultório Particular / Personalizado e Formatação de Cabeçalho
  const consultorioProprio = service.registrarEstabelecimentoPersonalizado({
    nome_fantasia: 'Clínica Médica Dr. Rotina',
    razao_social: 'Dr. Rotina Serviços Médicos LTDA',
    cnes: '9988776',
    cidade: 'Ribeirão Preto',
    uf: 'SP',
    tipo: 'CONSULTORIO',
    logradouro: 'Av. Coronel Fernando Ferreira Leite, 1540 - Sala 802',
    bairro: 'Jardim Califórnia',
    cep: '14026-020',
    telefone: '(16) 3234-5678'
  });

  assert.equal(consultorioProprio.personalizado, true);
  assert.equal(consultorioProprio.tipo, 'CONSULTORIO');

  // Verifica se o consultório personalizado aparece na busca instantânea
  const buscaCustom = service.buscarEstabelecimentos({
    cidade: 'Ribeirão Preto',
    tipo: 'CONSULTORIO',
    q: 'Dr. Rotina'
  });
  assert.equal(buscaCustom.length, 1, 'Consultório personalizado deve ser encontrado na busca');

  // 5. Validação do Cabeçalho Automático do Receituário
  const cabecalho = service.formatarCabecalhoReceituario(consultorioProprio);
  assert.equal(cabecalho.titulo, 'Clínica Médica Dr. Rotina');
  assert.equal(cabecalho.cnes_formatado, 'CNES: 9988776');
  assert.ok(cabecalho.endereco_linha1.includes('Jardim Califórnia'));
  assert.ok(cabecalho.endereco_linha2.includes('Ribeirão Preto/SP'));
  assert.ok(cabecalho.endereco_linha2.includes('14026-020'));

  console.log(`✅ Todos os testes do CNES passaram com sucesso! (Latência de busca: ${elapsedMs.toFixed(3)}ms)`);
}

runTests();
