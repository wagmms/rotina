/**
 * ==============================================================================
 * TESTES AUTOMATIZADOS: GUIA FARMACÊUTICO HSL & PRESCRIÇÃO REMUME
 * ==============================================================================
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const runtime = require(path.join(ROOT_DIR, 'server', 'runtime.js'));

function runTests() {
  console.log('🧪 Iniciando testes de integração Guia Farmacêutico HSL & REMUME...\n');

  // Teste 1
  console.log('Test 1: Arquivo de dados oficial src/data/guia_farmaceutico_hsl.json existe e é válido');
  const jsonPath = path.join(ROOT_DIR, 'src', 'data', 'guia_farmaceutico_hsl.json');
  assert.ok(fs.existsSync(jsonPath), 'Arquivo guia_farmaceutico_hsl.json deve existir em src/data');
  const content = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.ok(content.metadados, 'Deve conter metadados da extração');
  assert.ok(content.medicamentos, 'Deve conter a lista de medicamentos');
  assert.ok(content.medicamentos.length >= 900, `Esperado pelo menos 900 medicamentos, obteve ${content.medicamentos.length}`);
  assert.ok(content.metadados.total_com_posologia >= 800, 'A grande maioria deve ter posologia cadastrada');
  assert.ok(content.metadados.total_na_remume > 100, 'Deve haver medicamentos cruzados com a REMUME');
  console.log(`  ✓ OK (${content.medicamentos.length} medicamentos, ${content.metadados.total_na_remume} na REMUME)`);

  // Teste 2
  console.log('\nTest 2: Runtime carrega a base HSL em RAM no boot');
  const meds = runtime.ctx.obterGuiaFarmaceuticoHSL();
  assert.ok(Array.isArray(meds), 'obterGuiaFarmaceuticoHSL deve retornar array');
  assert.ok(meds.length >= 900, `Runtime deve ter >= 900 medicamentos em RAM, obteve ${meds.length}`);
  console.log(`  ✓ OK (${meds.length} medicamentos carregados em RAM)`);

  // Teste 3
  console.log('\nTest 3: Busca direta por nome exato e case-insensitive');
  const amox = runtime.ctx.buscarMedicamentoNoHSL('amoxicilina');
  assert.ok(amox, 'Deve encontrar AMOXICILINA');
  assert.strictEqual(amox.farnaco, 'AMOXICILINA');
  assert.strictEqual(amox.na_remume, true, 'Amoxicilina deve constar na REMUME');
  assert.ok(amox.apresentacoes_remume.length > 0, 'Deve ter apresentações da REMUME');
  assert.ok(amox.dose_adulto.includes('250-500mg') || amox.dose_adulto.includes('12 horas'), 'Deve ter dose adulto ou ajuste');
  const ceftPed = runtime.ctx.buscarMedicamentoNoHSL('ceftriaxona');
  assert.ok(ceftPed && ceftPed.dose_pediatria.length > 0, 'Ceftriaxona deve ter dose pediátrica no HSL');
  assert.ok(ceftPed && ceftPed.ajuste_dose.length > 0, 'Ceftriaxona deve ter ajuste de dose no HSL');
  console.log(`  ✓ OK (${amox.farnaco}: Validação de busca e doses HSL concluída)`);

  // Teste 4
  console.log('\nTest 4: Busca com caracteres especiais e acentos');
  const medAcentuado = runtime.ctx.buscarMedicamentoNoHSL('acido acetilsalicilico');
  assert.ok(medAcentuado, 'Deve encontrar ÁCIDO ACETILSALICÍLICO mesmo sem acento');
  assert.ok(medAcentuado.farnaco.includes('ÁCIDO ACETILSALICÍLICO'));
  console.log(`  ✓ OK (busca sem acento resolveu: ${medAcentuado.farnaco})`);

  // Teste 5
  console.log('\nTest 5: Busca por nomes comerciais e sinônimos (DCB)');
  const dipNovalgina = runtime.ctx.buscarMedicamentoNoHSL('novalgina');
  assert.ok(dipNovalgina, 'Deve encontrar Dipirona ao buscar Novalgina');
  assert.ok(dipNovalgina.farnaco.includes('DIPIRONA'));

  const metfGlifage = runtime.ctx.buscarMedicamentoNoHSL('glifage');
  assert.ok(metfGlifage, 'Deve encontrar Metformina ao buscar Glifage');
  assert.ok(metfGlifage.farnaco.includes('METFORMINA'));
  console.log(`  ✓ OK (Novalgina -> DIPIRONA, Glifage -> METFORMINA)`);

  // Teste 6
  console.log('\nTest 6: Formatação de ficha posológica para Telegram');
  const ceft = runtime.ctx.buscarMedicamentoNoHSL('ceftriaxona');
  assert.ok(ceft, 'Ceftriaxona deve existir');
  const ficha = runtime.ctx.formatarFichaPosologicaHSL(ceft);
  assert.ok(ficha.includes('GUIA FARMACÊUTICO HSL'), 'Deve conter cabeçalho oficial HSL');
  assert.ok(ficha.includes('CEFTRIAXONA'), 'Deve conter o nome do fármaco');
  assert.ok(ficha.includes('DOSE ADULTO'), 'Deve conter dose adulto');
  assert.ok(ficha.includes('AJUSTE DE DOSE'), 'Deve conter ajuste de dose');
  assert.ok(ficha.includes('Fonte Oficial'), 'Deve citar fonte oficial');
  console.log(`  ✓ OK (Ficha gerada com ${ficha.split('\n').length} linhas)`);

  // Teste 7
  console.log('\nTest 7: RAG do HSL prioriza medicamentos da REMUME para síndromes clínicas');
  const contexto = runtime.ctx.filtrarContextoPosologiasHSL('amigdalite');
  assert.ok(contexto.length > 0, 'Deve gerar contexto para amigdalite');
  assert.ok(contexto.includes('AMOXICILINA') || contexto.includes('AZITROMICINA'), 'Deve incluir antimicrobianos');
  assert.ok(contexto.includes('PADRONIZADO NA REMUME') || contexto.includes('DISPONÍVEL NA REMUME'), 'Deve marcar itens como padronizados na REMUME');
  console.log(`  ✓ OK (Contexto para amigdalite inclui itens prioritários da REMUME)`);

  // Teste 8
  console.log('\nTest 8: Medicamento fora da REMUME possui flag e indicação correta');
  const medHospitalar = runtime.ctx.buscarMedicamentoNoHSL('vancomicina');
  assert.ok(medHospitalar, 'Vancomicina deve constar no Guia HSL');
  const fichaHosp = runtime.ctx.formatarFichaPosologicaHSL(medHospitalar);
  assert.ok(fichaHosp.includes('NÃO CONSTA NA REMUME') || !medHospitalar.na_remume, 'Vancomicina deve indicar que não é da REMUME municipal');
  console.log(`  ✓ OK (${medHospitalar.farnaco}: Tag SUS fora da REMUME municipal confirmada)`);

  console.log('\n==============================================================================');
  console.log('🎉 TODOS OS TESTES DO GUIA HSL E REMUME PASSARAM COM 100% DE SUCESSO!');
  console.log('==============================================================================\n');
}

runTests();
