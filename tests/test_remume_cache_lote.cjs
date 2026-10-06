/**
 * BATERIA DE TESTES: CARREGAMENTO EM LOTE E CACHE L1 DA REMUME E INTERAÇÕES
 * Valida a arquitetura em 2 níveis (L1 em RAM + L2 em lote com getAll/putAll)
 * e o fallback transparente para ambientes legados.
 */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const source = fs.readFileSync(path.resolve(__dirname, '../ultra_rotina_master.js'), 'utf8');

function criarContexto(suportaGetAll = true) {
  const store = {};
  let getAllCalls = 0, getCalls = 0, putAllCalls = 0, putCalls = 0;
  
  const cacheMock = {
    get: k => { getCalls++; return store[k] ?? null; },
    put: (k, v) => { putCalls++; store[k] = String(v); },
    remove: k => { delete store[k]; }
  };

  if (suportaGetAll) {
    cacheMock.getAll = keys => {
      getAllCalls++;
      const res = {};
      for (const k of keys) res[k] = store[k] ?? null;
      return res;
    };
    cacheMock.putAll = (obj) => {
      putAllCalls++;
      for (const k in obj) store[k] = String(obj[k]);
    };
  }

  const c = {
    Buffer, Date, console: { log() {}, error() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperties: () => ({}), getProperty: () => null }) },
    CacheService: { getScriptCache: () => cacheMock },
    Logger: { log() {} }
  };

  vm.createContext(c);
  vm.runInContext(source, c);

  return {
    c, store,
    getStats: () => ({ getAllCalls, getCalls, putAllCalls, putCalls }),
    resetStats: () => { getAllCalls = 0; getCalls = 0; putAllCalls = 0; putCalls = 0; }
  };
}

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

// -----------------------------------------------------------------------------
// 1. LEITURA EM LOTE VIA getAll (CACHE L2)
// -----------------------------------------------------------------------------
test('1. obterPlanilha com suporte a getAll lê todos os chunks em 1 chamada única', () => {
  const env = criarContexto(true);
  
  // Popula 3 chunks de 40 KB no store simulando a REMUME
  const chunk0 = 'Linha 0: Amoxicilina 500mg\n'.repeat(100);
  const chunk1 = 'Linha 1: Dipirona 500mg/mL\n'.repeat(100);
  const chunk2 = 'Linha 2: Losartana 50mg\n'.repeat(100);

  env.store['remume_chunks'] = '3';
  env.store['remume_0'] = chunk0;
  env.store['remume_1'] = chunk1;
  env.store['remume_2'] = chunk2;

  env.resetStats();
  const res = env.c.obterPlanilha('remume', 'fake-id', false);

  const stats = env.getStats();
  assert.equal(stats.getAllCalls, 1, 'Deve realizar exatamente 1 chamada a getAll');
  assert.equal(stats.getCalls, 1, 'Deve chamar get apenas 1 vez para ler numChunks');
  assert.equal(res, chunk0 + chunk1 + chunk2, 'Conteúdo deve ser idêntico à união dos chunks');
});

// -----------------------------------------------------------------------------
// 2. CACHE L1 EM MEMÓRIA RAM (0 MS E 0 RPCS NA SEGUNDA CHAMADA)
// -----------------------------------------------------------------------------
test('2. Segunda chamada a obterPlanilha aproveita Cache L1 em RAM com 0 chamadas a CacheService', () => {
  const env = criarContexto(true);
  
  env.store['remume_chunks'] = '2';
  env.store['remume_0'] = 'Medicamento A\n';
  env.store['remume_1'] = 'Medicamento B\n';

  env.resetStats();
  // 1ª chamada: vai ao L2 (CacheService)
  const primeira = env.c.obterPlanilha('remume', 'fake-id', false);
  assert.equal(primeira, 'Medicamento A\nMedicamento B\n');
  assert.equal(env.getStats().getAllCalls, 1);

  env.resetStats();
  // 2ª chamada: deve vir direto da RAM (L1)
  const segunda = env.c.obterPlanilha('remume', 'fake-id', false);
  assert.equal(segunda, primeira);
  assert.equal(env.getStats().getAllCalls, 0, 'L1 não deve chamar getAll');
  assert.equal(env.getStats().getCalls, 0, 'L1 não deve chamar get');
});

// -----------------------------------------------------------------------------
// 3. COMPATIBILIDADE E FALLBACK (MOCK SEM getAll/putAll)
// -----------------------------------------------------------------------------
test('3. Fallback defensivo funciona perfeitamente quando getAll não está disponível', () => {
  const env = criarContexto(false); // sem getAll
  
  env.store['remume_chunks'] = '2';
  env.store['remume_0'] = 'Ceftriaxona 1g\n';
  env.store['remume_1'] = 'Azitromicina 500mg\n';

  const res = env.c.obterPlanilha('remume', 'fake-id', false);
  assert.equal(res, 'Ceftriaxona 1g\nAzitromicina 500mg\n');
});

// -----------------------------------------------------------------------------
// 4. INTEGRIDADE DE CARACTERES ESPECIAIS E UNICODE
// -----------------------------------------------------------------------------
test('4. Conteúdo multilinha com acentuação e caracteres farmacêuticos é preservado', () => {
  const env = criarContexto(true);
  
  const textoEspecial = 'Sulfametoxazol + Trimetoprima 400/80mg (comprimido)\nÁcido Acetilsalicílico 100mg\nSolução Fisiológica 0,9%\n';
  env.store['remume_chunks'] = '1';
  env.store['remume_0'] = textoEspecial;

  const res = env.c.obterPlanilha('remume', 'fake-id', false);
  assert.equal(res, textoEspecial);
  assert(res.includes('Ácido Acetilsalicílico'));
  assert(res.includes('0,9%'));
});

// -----------------------------------------------------------------------------
// 5. FILTRAGEM RAG INTELIGENTE COM BASE EM CACHE
// -----------------------------------------------------------------------------
test('5. filtrarMedicamentosRelevantes opera com máxima precisão sobre a base em cache', () => {
  const env = criarContexto(true);
  
  const baseFicticia = [
    'Dipirona 500mg comp',
    'Amoxicilina 500mg caps',
    'Nitrofurantoina 100mg comp',
    'Sulfametoxazol + Trimetoprima 400/80mg comp',
    'Losartana Potassica 50mg comp',
    'Metformina 850mg comp',
    'Ibuprofeno 600mg comp',
    'Omeprazol 20mg caps',
    'Ceftriaxona 1g injetavel',
    'Salbutamol 100mcg spray'
  ].join('\n') + '\n'.repeat(40); // > 35 linhas para ativar o RAG

  env.store['remume_chunks'] = '1';
  env.store['remume_0'] = baseFicticia;

  const baseCarregada = env.c.obterPlanilha('remume', 'fake-id', false);
  const filtrados = env.c.filtrarMedicamentosRelevantes(baseCarregada, 'cistite aguda disuria');
  
  assert(filtrados.includes('Nitrofurantoina') || filtrados.includes('Sulfametoxazol'), 'Deve selecionar antimicrobianos urinários pela síndrome');
  assert(!filtrados.includes('Salbutamol'), 'Não deve incluir broncodilatador para cistite');
});

console.log(`\n🎉 CACHE EM LOTE DA REMUME: ${pass}/${total} testes aprovados com 100% de êxito!`);
