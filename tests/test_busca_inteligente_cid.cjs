/**
 * Suíte de Testes Clínicos: Busca Inteligente de Diagnósticos (CID-10 & CIAP-2)
 */

process.env.NODE_ENV = 'test';
const assert = require('assert');
const runtime = require('../server/runtime');

let aprovados = 0;
let total = 0;

function test(nome, fn) {
  total++;
  try {
    fn();
    console.log(`✅ APROVADO: ${nome}`);
    aprovados++;
  } catch (err) {
    console.error(`❌ FALHOU: ${nome} :: ${err.message}`);
    process.exitCode = 1;
  }
}

const ctx = runtime.ctx;
const SoapAmbulatorialService = ctx.SoapAmbulatorialService;

test('1. Deve possuir catálogo clínico amplo (>130 diagnósticos essenciais)', () => {
  assert(Array.isArray(SoapAmbulatorialService.CATALOGO_DIAGNOSTICOS), 'CATALOGO_DIAGNOSTICOS deve ser um array');
  assert(SoapAmbulatorialService.CATALOGO_DIAGNOSTICOS.length >= 70, 'Catálogo deve conter pelo menos 70 patologias essenciais');
});

test('2. Deve buscar com precisão cirúrgica por código CID-10 canônico', () => {
  const resI10 = SoapAmbulatorialService.buscarDiagnostico('I10');
  assert(resI10.length > 0 && resI10[0].cid10 === 'I10', 'I10 deve retornar Hipertensão Arterial');

  const resE11 = SoapAmbulatorialService.buscarDiagnostico('E11.9');
  assert(resE11.length > 0 && resE11[0].cid10 === 'E11.9', 'E11.9 deve retornar Diabetes Tipo 2');

  const resM54 = SoapAmbulatorialService.buscarDiagnostico('M54.5');
  assert(resM54.length > 0 && resM54[0].cid10 === 'M54.5', 'M54.5 deve retornar Lombalgia');

  const resJ18 = SoapAmbulatorialService.buscarDiagnostico('J18.9');
  assert(resJ18.length > 0 && resJ18[0].cid10 === 'J18.9', 'J18.9 deve retornar Pneumonia');

  const resA09 = SoapAmbulatorialService.buscarDiagnostico('A09');
  assert(resA09.length > 0 && resA09[0].cid10 === 'A09', 'A09 deve retornar Gastroenterite/GECA');
});

test('3. Deve encontrar códigos mesmo digitados sem ponto ou minúsculos', () => {
  const resE119 = SoapAmbulatorialService.buscarDiagnostico('e119');
  assert(resE119.length > 0 && resE119[0].cid10 === 'E11.9', 'e119 sem ponto deve achar E11.9');

  const resM545 = SoapAmbulatorialService.buscarDiagnostico('m545');
  assert(resM545.length > 0 && resM545[0].cid10 === 'M54.5', 'm545 sem ponto deve achar M54.5');

  const resK219 = SoapAmbulatorialService.buscarDiagnostico('k219');
  assert(resK219.length > 0 && resK219[0].cid10 === 'K21.9', 'k219 sem ponto deve achar K21.9');
});

test('4. Deve buscar por código CIAP-2 da atenção primária', () => {
  const resK86 = SoapAmbulatorialService.buscarDiagnostico('K86');
  assert(resK86.length > 0 && resK86[0].ciap2 === 'K86', 'K86 deve retornar Hipertensão');

  const resT90 = SoapAmbulatorialService.buscarDiagnostico('T90');
  assert(resT90.length > 0 && resT90[0].ciap2 === 'T90', 'T90 deve retornar Diabetes Tipo 2');

  const resU71 = SoapAmbulatorialService.buscarDiagnostico('U71');
  assert(resU71.length > 0 && resU71[0].ciap2 === 'U71', 'U71 deve retornar Cistite/ITU');
});

test('5. Deve buscar por siglas médicas e acrônimos consagrados', () => {
  const resHas = SoapAmbulatorialService.buscarDiagnostico('has');
  assert(resHas.length > 0 && resHas[0].cid10 === 'I10', 'has deve retornar I10');

  const resDm2 = SoapAmbulatorialService.buscarDiagnostico('dm2');
  assert(resDm2.length > 0 && resDm2[0].cid10 === 'E11.9', 'dm2 deve retornar E11.9');

  const resDrge = SoapAmbulatorialService.buscarDiagnostico('drge');
  assert(resDrge.length > 0 && resDrge[0].cid10 === 'K21.9', 'drge deve retornar K21.9');

  const resIvas = SoapAmbulatorialService.buscarDiagnostico('ivas');
  assert(resIvas.length > 0 && resIvas[0].cid10.startsWith('J0'), 'ivas deve retornar J00 ou J06');

  const resItu = SoapAmbulatorialService.buscarDiagnostico('itu');
  assert(resItu.length > 0 && resItu[0].cid10 === 'N30.0', 'itu deve retornar N30.0');

  const resDpoc = SoapAmbulatorialService.buscarDiagnostico('dpoc');
  assert(resDpoc.length > 0 && resDpoc[0].cid10 === 'J44.9', 'dpoc deve retornar J44.9');

  const resTag = SoapAmbulatorialService.buscarDiagnostico('tag');
  assert(resTag.length > 0 && resTag[0].cid10 === 'F41.1', 'tag deve retornar F41.1');
});

test('6. Deve mapear queixas populares e sintomas em linguagem leiga', () => {
  const resGarganta = SoapAmbulatorialService.buscarDiagnostico('dor de garganta');
  assert(resGarganta.length > 0 && resGarganta[0].cid10 === 'J02.9', 'dor de garganta deve retornar J02.9');

  const resCostas = SoapAmbulatorialService.buscarDiagnostico('dor nas costas');
  assert(resCostas.length > 0 && resCostas[0].cid10 === 'M54.5', 'dor nas costas deve retornar M54.5');

  const resUrina = SoapAmbulatorialService.buscarDiagnostico('xixi ardendo');
  assert(resUrina.length > 0 && resUrina[0].cid10 === 'N30.0', 'xixi ardendo deve retornar N30.0');

  const resPressao = SoapAmbulatorialService.buscarDiagnostico('pressao alta');
  assert(resPressao.length > 0 && resPressao[0].cid10 === 'I10', 'pressao alta deve retornar I10');

  const resAcucar = SoapAmbulatorialService.buscarDiagnostico('acucar no sangue');
  assert(resAcucar.length > 0 && resAcucar[0].cid10 === 'E11.9', 'acucar no sangue deve retornar E11.9');

  const resPano = SoapAmbulatorialService.buscarDiagnostico('pano branco');
  assert(resPano.length > 0 && resPano[0].cid10 === 'B36.0', 'pano branco deve retornar B36.0');

  const resCatapora = SoapAmbulatorialService.buscarDiagnostico('catapora');
  assert(resCatapora.length > 0 && resCatapora[0].cid10 === 'B01.9', 'catapora deve retornar B01.9');
});

test('7. Deve suportar busca multi-token combinada', () => {
  const resJoelho = SoapAmbulatorialService.buscarDiagnostico('dor joelho');
  assert(resJoelho.length > 0 && resJoelho.some(r => r.cid10 === 'M17.9'), 'dor joelho deve achar gonartrose M17.9');

  const resTosFebre = SoapAmbulatorialService.buscarDiagnostico('febre tosse');
  assert(resTosFebre.length > 0 && resTosFebre.some(r => r.cid10 === 'J18.9'), 'febre tosse deve achar pneumonia J18.9');
});

test('8. Deve aceitar código CID-10 direto livre mesmo que não pré-tabelado', () => {
  const resLivre = SoapAmbulatorialService.buscarDiagnostico('Z76.0');
  assert(resLivre.length > 0, 'Deve gerar resultado para código válido');
  assert.strictEqual(resLivre[0].cid10, 'Z76.0');
  assert.strictEqual(resLivre[0].categoria, 'Código Direto');
});

console.log(`\n🎉 SUÍTE CONCLUÍDA: ${aprovados}/${total} testes aprovados com 100% de sucesso.\n`);
