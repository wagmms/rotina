/**
 * tests/test_aba_rotina_cockpit.cjs
 * Suíte de Testes Automatizados E2E & Arquitetura Modular da Aba Rotina
 * Valida integridade visual, paridade de artefatos, desacoplamento e métodos do RotinaTimeline.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

console.log('=== TESTE E2E: ABA ROTINA & MÓDULO DESACOPLADO ROTINA_TIMELINE ===\n');

const rootDir = path.resolve(__dirname, '..');
const cockpitHtmlPath = path.join(rootDir, 'cockpit_movel.html');
const deployHtmlPath = path.join(rootDir, 'gh_cockpit_deploy', 'index.html');
const rotinaJsRootPath = path.join(rootDir, 'rotina_timeline.js');
const rotinaJsDeployPath = path.join(rootDir, 'gh_cockpit_deploy', 'rotina_timeline.js');
const swRootPath = path.join(rootDir, 'sw.js');
const swDeployPath = path.join(rootDir, 'gh_cockpit_deploy', 'sw.js');

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

// 1. Paridade Absoluta de Artefatos
console.log('[1] Validando paridade de artefatos e integridade SHA-256...');
assert.ok(fs.existsSync(cockpitHtmlPath), 'cockpit_movel.html deve existir na raiz');
assert.ok(fs.existsSync(deployHtmlPath), 'gh_cockpit_deploy/index.html deve existir');
assert.strictEqual(sha256(cockpitHtmlPath), sha256(deployHtmlPath), 'Paridade SHA-256 entre cockpit_movel.html e deploy deve ser 100%');

assert.ok(fs.existsSync(rotinaJsRootPath), 'rotina_timeline.js deve existir na raiz');
assert.ok(fs.existsSync(rotinaJsDeployPath), 'rotina_timeline.js deve existir em gh_cockpit_deploy/');
assert.strictEqual(sha256(rotinaJsRootPath), sha256(rotinaJsDeployPath), 'Paridade SHA-256 de rotina_timeline.js deve ser 100%');

assert.ok(fs.existsSync(swRootPath), 'sw.js deve existir na raiz');
assert.ok(fs.existsSync(swDeployPath), 'sw.js deve existir em gh_cockpit_deploy/');
assert.strictEqual(sha256(swRootPath), sha256(swDeployPath), 'Paridade SHA-256 de sw.js deve ser 100%');
console.log('  ✓ Paridade de arquivos verificada com sucesso.');

// 2. Precache no Service Worker
console.log('\n[2] Validando pré-carregamento no Service Worker...');
const swContent = fs.readFileSync(swRootPath, 'utf8');
assert.ok(swContent.includes("'./rotina_timeline.js'"), 'sw.js deve precachear ./rotina_timeline.js');
assert.ok(swContent.includes("'/rotina_timeline.js'"), 'sw.js deve precachear /rotina_timeline.js');
console.log('  ✓ Precache offline do módulo rotina_timeline.js confirmado.');

// 3. Inspeção de Elementos Visuais e Desmockagem do HTML
console.log('\n[3] Inspecionando seletores e erradicação de mocks na Aba Rotina...');
const htmlContent = fs.readFileSync(cockpitHtmlPath, 'utf8');

// Proibição estrita de mocks estáticos antigos
assert.ok(!htmlContent.includes('Rodízio Internato — Turma J'), 'MOCK BANIDO: Turma J não deve estar no HTML');
assert.ok(!htmlContent.includes('Sangramento de 1º Trimestre e DHEG'), 'MOCK BANIDO: Sangramento 1º Trimestre mockado não deve estar no HTML');

// Presença de elementos chave de time-blocking
assert.ok(htmlContent.includes('id="tab-rotina"'), 'Container tab-rotina deve existir');
assert.ok(htmlContent.includes('id="rotina-sync-badge"'), 'Badge de status de sincronização rotina-sync-badge deve existir');
assert.ok(htmlContent.includes('id="rotina-contador-concluidos"'), 'Contador rotina-contador-concluidos deve existir');
assert.ok(htmlContent.includes('id="rotina-contador-total"'), 'Contador rotina-contador-total deve existir');
assert.ok(htmlContent.includes('id="rotina-barra-progresso"'), 'Barra de progresso rotina-barra-progresso deve existir');
assert.ok(htmlContent.includes('id="rotina-filtros-container"'), 'Container de filtros de categoria deve existir');
assert.ok(htmlContent.includes('id="rotina-blocos-container"'), 'Container rotina-blocos-container deve existir');
assert.ok(htmlContent.includes('RotinaTimeline.ativarModoDescanso()'), 'Ação rápida de modo descanso deve existir');
assert.ok(htmlContent.includes('RotinaTimeline.carregarGradePadrao()'), 'Ação rápida de carregar grade padrão deve existir');
assert.ok(htmlContent.includes('rotina_timeline.js'), 'Tag de script de rotina_timeline.js deve ser importada');
console.log('  ✓ Todos os seletores e ausência de mocks validados no HTML.');

// 4. Execução Isolada do Módulo rotina_timeline.js em VM
console.log('\n[4] Testando funções lógicas e reatividade do módulo RotinaTimeline...');
const rotinaJsCode = fs.readFileSync(rotinaJsRootPath, 'utf8');

// Monta DOM mock mínimo
const domStore = {};
function createMockElement(tag) {
  return {
    tagName: tag,
    className: '',
    id: '',
    style: {},
    children: [],
    textContent: '',
    innerHTML: '',
    replaceChildren: function() { this.children = []; this.innerHTML = ''; },
    append: function(...els) { this.children.push(...els); },
    setAttribute: function(k, v) { this[k] = v; },
    getAttribute: function(k) { return this[k] || null; }
  };
}

const mockDoc = {
  getElementById: function(id) {
    if (!domStore[id]) {
      domStore[id] = createMockElement('div');
      domStore[id].id = id;
    }
    return domStore[id];
  },
  createElement: function(tag) { return createMockElement(tag); },
  querySelectorAll: function(sel) { return []; }
};

const localStorageMock = {
  _store: {},
  getItem: function(k) { return this._store[k] || null; },
  setItem: function(k, v) { this._store[k] = String(v); },
  removeItem: function(k) { delete this._store[k]; }
};

const sandbox = {
  window: {},
  document: mockDoc,
  localStorage: localStorageMock,
  navigator: { onLine: true },
  fetch: async function() { return { ok: true }; },
  console: console,
  JSON: JSON,
  Array: Array,
  Math: Math,
  String: String,
  Boolean: Boolean,
  Date: Date
};
sandbox.window = sandbox;

vm.createContext(sandbox);
vm.runInContext(rotinaJsCode, sandbox);

const RotinaTimeline = sandbox.RotinaTimeline;
assert.ok(RotinaTimeline, 'RotinaTimeline deve estar exportado na window');
assert.strictEqual(typeof RotinaTimeline.renderizar, 'function', 'renderizar deve ser função');
assert.strictEqual(typeof RotinaTimeline.alterarStatus, 'function', 'alterarStatus deve ser função');
assert.strictEqual(typeof RotinaTimeline.ativarModoDescanso, 'function', 'ativarModoDescanso deve ser função');
assert.strictEqual(typeof RotinaTimeline.carregarGradePadrao, 'function', 'carregarGradePadrao deve ser função');

// 4.1 Normalização de Blocos e Categorias
const bNormal = RotinaTimeline.normalizarBloco({
  id: 'b1',
  titulo: 'Plantão Sala Vermelha',
  horario: '07:00 - 19:00',
  nota: 'Passagem SBAR + DVA'
}, 0);
assert.strictEqual(bNormal.id, 'b1');
assert.strictEqual(bNormal.categoria, 'plantao');
assert.strictEqual(bNormal.inicio, '07:00');
assert.strictEqual(bNormal.fim, '19:00');
assert.strictEqual(bNormal.status, 'pendente');

// 4.2 Renderização de Blocos
const blocosTeste = [
  bNormal,
  RotinaTimeline.normalizarBloco({
    id: 'b2',
    titulo: 'MedQuest Questões Comentadas',
    horario: '20:00 - 22:00',
    nota: '30 questões cardiologia'
  }, 1),
  RotinaTimeline.normalizarBloco({
    id: 'b3',
    titulo: 'Treino Hipertrofia A',
    horario: '18:00 - 19:00',
    status: 'pendente'
  }, 2)
];

RotinaTimeline.renderizar(blocosTeste, 'rotina-blocos-container');
const container = mockDoc.getElementById('rotina-blocos-container');
assert.strictEqual(container.children.length, 3, 'Container deve conter 3 cards renderizados');
assert.strictEqual(mockDoc.getElementById('rotina-contador-total').textContent, '3');
assert.strictEqual(mockDoc.getElementById('rotina-contador-concluidos').textContent, '0');

// 4.3 Transição de Status (Ação Rápida Concluir)
RotinaTimeline.alterarStatus('b1', 'concluido');
assert.strictEqual(mockDoc.getElementById('rotina-contador-concluidos').textContent, '1');

// 4.4 Modo Descanso (pausa treino e estudo)
RotinaTimeline.ativarModoDescanso();
const blocosAposDescanso = RotinaTimeline.carregarBlocosLocais();
const treinoBloco = blocosAposDescanso.find(b => b.id === 'b3');
assert.strictEqual(treinoBloco.status, 'descanso', 'Bloco de treino deve ter transitado para status descanso');
console.log('  ✓ Lógica de normalização, renderização, contadores e modo descanso aprovada.');

console.log('\n=== TODOS OS TESTES DA ABA ROTINA COCKPIT APROVADOS COM SUCESSO! ===');
