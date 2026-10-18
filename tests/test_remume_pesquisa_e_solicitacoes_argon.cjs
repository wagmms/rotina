/**
 * TESTE DE VALIDAÇÃO: PESQUISA MULTI-TOKEN REMUME E GESTÃO DE SOLICITAÇÕES
 * Valida:
 * 1. Parser inteligente de Cidade + UF (extrairMunicipioEUf).
 * 2. Busca Multi-Token no catálogo REMUME com sinônimos e higienização de sais.
 * 3. Fluxo de solicitação de REMUME ao desenvolvedor (registro persistente com detalhes).
 * 4. Painel de curadoria do desenvolvedor (/solicitacoes_remume, /fila_remume, arquivar).
 */
const assert = require('assert');
const path = require('path');
const CatalogoRemumeService = require('../src/data/remumes/index.js');
const ConfigService = require('../src/00_config.js');

let total = 0, pass = 0;
function test(name, fn) {
  total++;
  try {
    fn();
    pass++;
    console.log('✅ APROVADO: ' + name);
  } catch (e) {
    process.exitCode = 1;
    console.error('❌ FALHOU: ' + name + '\n' + e.stack);
  }
}

// 1. Parser flexível de cidade e UF
test('1. extrairMunicipioEUf faz o parse correto de vários formatos', () => {
  const p1 = CatalogoRemumeService.extrairMunicipioEUf('Ribeirão Preto - SP');
  assert.strictEqual(p1.municipio, 'Ribeirão Preto');
  assert.strictEqual(p1.uf, 'SP');

  const p2 = CatalogoRemumeService.extrairMunicipioEUf('Ribeirão Preto SP');
  assert.strictEqual(p2.municipio, 'Ribeirão Preto');
  assert.strictEqual(p2.uf, 'SP');

  const p3 = CatalogoRemumeService.extrairMunicipioEUf('Pariquera-Açu - SP');
  assert.strictEqual(p3.municipio, 'Pariquera-Açu');
  assert.strictEqual(p3.uf, 'SP');

  const p4 = CatalogoRemumeService.extrairMunicipioEUf('Campinas / SP');
  assert.strictEqual(p4.municipio, 'Campinas');
  assert.strictEqual(p4.uf, 'SP');

  const p5 = CatalogoRemumeService.extrairMunicipioEUf('Belém (PA)');
  assert.strictEqual(p5.municipio, 'Belém');
  assert.strictEqual(p5.uf, 'PA');
});

// 2. Busca de presets oficiais
test('2. buscarPresetPorCidade encontra cidades com formato sem hífen ou com acento', () => {
  const enc1 = CatalogoRemumeService.buscarPresetPorCidade('Ribeirão Preto SP');
  assert.ok(enc1, 'Deve encontrar Ribeirão Preto mesmo sem hífen');
  assert.strictEqual(enc1.slug, 'sp_ribeirao_preto');

  const enc2 = CatalogoRemumeService.buscarPresetPorCidade('São Paulo - SP');
  assert.ok(enc2, 'Deve encontrar São Paulo');
  assert.strictEqual(enc2.slug, 'sp_sao_paulo');
});

// 3. Consulta de disponibilidade multi-token com sinônimos e higienização de sais
test('3. consultarDisponibilidade localiza apresentações com busca multi-token e marcas comuns', () => {
  // Amoxicilina + Clavulanato
  const r1 = CatalogoRemumeService.consultarDisponibilidade('amoxi clav', 'rename_nacional');
  assert.strictEqual(r1.disponivel, true, 'Deve encontrar amoxicilina + clavulanato');
  assert.ok(r1.correspondencias.some(m => /amoxicilina.*clavulan/i.test(m)));

  // Losartana 50
  const r2 = CatalogoRemumeService.consultarDisponibilidade('losartana 50', 'rename_nacional');
  assert.strictEqual(r2.disponivel, true, 'Deve encontrar losartana 50mg');

  // Sinônimo Lasix -> Furosemida
  const r3 = CatalogoRemumeService.consultarDisponibilidade('lasix', 'rename_nacional');
  assert.strictEqual(r3.disponivel, true, 'Deve mapear Lasix para Furosemida');
  assert.ok(r3.correspondencias.some(m => /furosemida/i.test(m)));
});

// 4. Registro e gestão de solicitações ao desenvolvedor
test('4. ConfigService registra, lista e rejeita/arquiva solicitações de REMUME', () => {
  const munTeste = 'Cidade Inexistente Teste';
  const ufTeste = 'PA';
  const chatTeste = '999888777';

  // Registra
  const reg = ConfigService.registrarSolicitacaoRemume(munTeste, ufTeste, chatTeste);
  assert.strictEqual(reg.status, 'PENDENTE');
  assert.strictEqual(reg.municipio, munTeste);
  assert.strictEqual(reg.uf, ufTeste);
  assert.ok(reg.solicitantes.includes(chatTeste));

  // Lista
  const lista = ConfigService.listarSolicitacoesRemume();
  const encontrada = lista.find(s => s.slug === reg.slug);
  assert.ok(encontrada, 'Solicitação deve estar na lista');
  assert.strictEqual(encontrada.status, 'PENDENTE');

  // Rejeita / Arquiva
  const arquivada = ConfigService.rejeitarSolicitacaoRemume(reg.slug);
  assert.ok(arquivada, 'Deve retornar a solicitação arquivada');
  assert.strictEqual(arquivada.status, 'ARQUIVADA');
});
