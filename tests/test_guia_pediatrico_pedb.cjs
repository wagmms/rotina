/**
 * ==============================================================================
 * TESTES AUTOMATIZADOS: GUIA PEDIÁTRICO PEDBOOK (pedb.com.br) & CONDUTAS
 * ==============================================================================
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const runtime = require(path.join(ROOT_DIR, 'server', 'runtime.js'));

function runTests() {
  console.log('🧪 Iniciando testes de integração Guia Pediátrico PedBook...\n');

  // Teste 1: Arquivos de dados existem e são válidos
  console.log('Test 1: Arquivos de dados oficiais em src/data e data/ existem e são válidos');
  const jsonMeds = path.join(ROOT_DIR, 'src', 'data', 'guia_pediatrico_pedb.json');
  const jsonCond = path.join(ROOT_DIR, 'src', 'data', 'condutas_pediatricas_pedb.json');

  assert.ok(fs.existsSync(jsonMeds), 'guia_pediatrico_pedb.json deve existir em src/data');
  assert.ok(fs.existsSync(jsonCond), 'condutas_pediatricas_pedb.json deve existir em src/data');

  const medsContent = JSON.parse(fs.readFileSync(jsonMeds, 'utf8'));
  const condContent = JSON.parse(fs.readFileSync(jsonCond, 'utf8'));

  assert.ok(medsContent.metadados, 'Deve conter metadados dos medicamentos');
  assert.ok(Array.isArray(medsContent.medicamentos), 'Deve conter array de medicamentos');
  assert.ok(medsContent.medicamentos.length >= 200, `Esperado >= 200 medicamentos, obteve ${medsContent.medicamentos.length}`);
  assert.ok(medsContent.metadados.total_com_posologias >= 200, 'Medicamentos devem ter esquemas posológicos');
  assert.ok(medsContent.metadados.total_na_remume >= 50, 'Deve haver medicamentos cruzados com a REMUME');

  assert.ok(condContent.metadados, 'Deve conter metadados das condutas');
  assert.ok(Array.isArray(condContent.condutas), 'Deve conter array de condutas');
  assert.ok(condContent.condutas.length >= 200, `Esperado >= 200 condutas, obteve ${condContent.condutas.length}`);
  console.log(`  ✓ OK (${medsContent.medicamentos.length} medicamentos, ${condContent.condutas.length} condutas, ${medsContent.metadados.total_na_remume} na REMUME)`);

  // Teste 2: Runtime carrega as bases em RAM no boot
  console.log('\nTest 2: Runtime carrega PedBook em RAM no boot');
  const meds = runtime.ctx.obterGuiaPediatricoPedB();
  assert.ok(Array.isArray(meds), 'obterGuiaPediatricoPedB deve retornar array');
  assert.ok(meds.length >= 200, `Runtime deve ter >= 200 medicamentos em RAM, obteve ${meds.length}`);

  const conds = runtime.ctx.obterCondutasPediatricasPedB();
  assert.ok(Array.isArray(conds), 'obterCondutasPediatricasPedB deve retornar array');
  assert.ok(conds.length >= 200, `Runtime deve ter >= 200 condutas em RAM, obteve ${conds.length}`);
  console.log(`  ✓ OK (${meds.length} meds e ${conds.length} condutas carregados em RAM)`);

  // Teste 3: Busca direta por nome exato e case-insensitive
  console.log('\nTest 3: Busca direta de medicamento pediátrico');
  const amox = runtime.ctx.buscarMedicamentoPediatricoPedB('amoxicilina');
  assert.ok(amox, 'Deve encontrar AMOXICILINA no PedBook');
  assert.strictEqual(amox.na_remume, true, 'Amoxicilina deve constar na REMUME municipal');
  assert.ok(amox.apresentacoes.length > 0, 'Deve ter apresentações líquidas pediátricas');
  assert.ok(amox.posologias.length > 0, 'Deve ter esquemas posológicos pediátricos');
  console.log(`  ✓ OK (${amox.nome}: ${amox.apresentacoes.length} apresentações, ${amox.posologias.length} esquemas)`);

  // Teste 4: Busca por sinônimos e nomes comerciais
  console.log('\nTest 4: Busca por marcas e nomes comerciais pediátricos');
  const dipNovalgina = runtime.ctx.buscarMedicamentoPediatricoPedB('novalgina');
  assert.ok(dipNovalgina, 'Deve encontrar Dipirona ao buscar Novalgina');
  assert.ok(dipNovalgina.nome.toLowerCase().includes('dipirona'));

  const ibuAlivium = runtime.ctx.buscarMedicamentoPediatricoPedB('alivium');
  assert.ok(ibuAlivium, 'Deve encontrar Ibuprofeno ao buscar Alivium');
  assert.ok(ibuAlivium.nome.toLowerCase().includes('ibuprofeno'));
  console.log(`  ✓ OK (Novalgina -> ${dipNovalgina.nome}, Alivium -> ${ibuAlivium.nome})`);

  // Teste 5: Formatação de ficha pediátrica oficial para Telegram
  console.log('\nTest 5: Formatação de ficha pediátrica oficial do PedBook');
  const fichaAmox = runtime.ctx.formatarFichaPediatricaPedB(amox);
  assert.ok(fichaAmox.includes('GUIA PEDIÁTRICO OFICIAL (PEDBOOK)'), 'Deve conter cabeçalho PedBook');
  assert.ok(fichaAmox.includes('AMOXICILINA'), 'Deve conter nome do fármaco');
  assert.ok(fichaAmox.includes('APRESENTAÇÕES PEDIÁTRICAS'), 'Deve detalhar apresentações pediátricas');
  assert.ok(fichaAmox.includes('DOSES & ESQUEMAS POSOLÓGICOS'), 'Deve detalhar doses por kg/idade');
  assert.ok(fichaAmox.includes('pedb.com.br'), 'Deve citar fonte oficial PedBook');
  console.log(`  ✓ OK (Ficha gerada com ${fichaAmox.split('\n').length} linhas)`);

  // Teste 6: RAG pediátrico para IA
  console.log('\nTest 6: RAG pediátrico contextual');
  const contextoPed = runtime.ctx.filtrarContextoPediatricoPedB('criança 14kg febre amoxicilina');
  assert.ok(contextoPed.length > 0, 'Deve gerar contexto pediátrico para o caso');
  assert.ok(contextoPed.includes('MEDICAMENTO PEDIÁTRICO (PEDBOOK)'), 'Deve conter identificação do PedBook');
  assert.ok(contextoPed.includes('AMOXICILINA'), 'Deve incluir Amoxicilina');

  const contextoIA = runtime.ctx.obterContextoMedicamentosParaIA('amoxicilina 12kg amigdalite');
  assert.ok(contextoIA.pedb, 'Contexto da IA deve incluir pedb');
  assert.ok(contextoIA.texto.includes('PEDBOOK pedb.com.br'), 'Texto consolidado deve conter seção PedBook');
  console.log(`  ✓ OK (Contexto IA enriquecido com dados do PedBook)`);

  // Teste 7: Busca e formatação de Condutas Pediátricas
  console.log('\nTest 7: Protocolos de condutas pediátricas');
  const condutaBronq = runtime.ctx.buscarCondutaPediatricaPedB('bronquiolite');
  assert.ok(condutaBronq, 'Deve encontrar conduta de Bronquiolite');
  const resumoBronq = runtime.ctx.formatarResumoCondutaPedB(condutaBronq);
  assert.ok(resumoBronq.includes('CONDUTA PEDIÁTRICA OFICIAL (PEDBOOK)'), 'Deve conter cabeçalho da conduta');
  assert.ok(resumoBronq.includes('BRONQUIOLITE'), 'Deve citar bronquiolite');
  console.log(`  ✓ OK (Conduta '${condutaBronq.titulo}' validada com sucesso)`);

  console.log('\n==============================================================================');
  console.log('🎉 TODOS OS TESTES DO GUIA PEDIÁTRICO PEDBOOK PASSARAM COM 100% DE SUCESSO!');
  console.log('==============================================================================\n');
}

runTests();
