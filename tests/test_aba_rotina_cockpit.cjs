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
// Elementos específicos individuais devem ser excluídos da UI genérica
assert.ok(!htmlContent.includes('RotinaTimeline.ativarModoDescanso()'), 'Ação de modo descanso deve ter sido excluída da UI');
assert.ok(!htmlContent.includes('id="rotina-duvidas-card"'), 'Gaveta rotina-duvidas-card deve ter sido excluída da UI');
assert.ok(!htmlContent.includes('id="rotina-duvidas-lista"'), 'Lista rotina-duvidas-lista deve ter sido excluída da UI');
assert.ok(!htmlContent.includes('id="input-nova-duvida-cockpit"'), 'Input de nova dúvida deve ter sido excluído da UI');
assert.ok(!htmlContent.includes('RotinaTimeline.alternarGavetaDuvidas()'), 'Ação de alternar gaveta de dúvidas deve ter sido excluída da UI');
assert.ok(htmlContent.includes('RotinaTimeline.carregarGradePadrao()'), 'Ação rápida de carregar grade padrão deve existir');
assert.ok(htmlContent.includes('data-filtro="lifestyle"'), 'Filtro de lifestyle deve existir');
assert.ok(htmlContent.includes('id="painel-aderencia-rotina"'), 'Painel de aderência semanal deve existir');
assert.ok(htmlContent.includes('id="aderencia-pct-semanal"'), 'Badge de aderência percentual deve existir');
assert.ok(htmlContent.includes('id="aderencia-eixos-grid"'), 'Grid de mini-barras por eixo deve existir');
assert.ok(htmlContent.includes('id="aderencia-eixo-plantao-val"'), 'Mini-barra de plantão deve existir');
assert.ok(htmlContent.includes('id="aderencia-eixo-estudo-val"'), 'Mini-barra de estudo deve existir');
assert.ok(htmlContent.includes('id="aderencia-eixo-treino-val"'), 'Mini-barra de treino deve existir');
assert.ok(htmlContent.includes('id="aderencia-eixo-habitos-val"'), 'Mini-barra de hábitos deve existir');
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
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
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
assert.strictEqual(typeof RotinaTimeline.calcularAderenciaSemanalLocal, 'function', 'calcularAderenciaSemanalLocal deve ser função');
assert.strictEqual(typeof RotinaTimeline.atualizarPainelAderencia, 'function', 'atualizarPainelAderencia deve ser função');

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

// 4.5 Cálculo de Horários e Ação Adiar (+30m)
assert.strictEqual(typeof RotinaTimeline.adiarBloco, 'function', 'adiarBloco deve ser função');
assert.strictEqual(RotinaTimeline.converterHoraEmMinutos('10:30'), 630);
assert.strictEqual(RotinaTimeline.formatarMinutosEmHora(660), '11:00');

RotinaTimeline.adiarBloco('b2', 30);
const blocosAposAdiar = RotinaTimeline.carregarBlocosLocais();
const b2Adiado = blocosAposAdiar.find(b => b.id === 'b2');
assert.strictEqual(b2Adiado.status, 'adiado');
assert.strictEqual(b2Adiado.inicio, '20:30');
assert.strictEqual(b2Adiado.fim, '22:30');
console.log('  ✓ Lógica de normalização, renderização, contadores, modo descanso e adiar (+30m) aprovada.');

// 4.6 Categoria Lifestyle & Vida Pessoal
console.log('\n[5] Testando categoria lifestyle e normalização inteligente...');
const blocoLifestyle = RotinaTimeline.normalizarBloco({
  id: 'b-life',
  titulo: 'Prática de Violão & Teoria Musical',
  horario: '19:30 - 20:30'
}, 3);
assert.strictEqual(blocoLifestyle.categoria, 'lifestyle', 'Título com violão deve ser classificado como lifestyle');
assert.ok(RotinaTimeline.CATEGORIA_CONFIG.lifestyle, 'CATEGORIA_CONFIG deve conter lifestyle');
console.log('  ✓ Categoria lifestyle reconhecida com sucesso.');

// 4.7 Gaveta de Dúvidas MedQuest
console.log('\n[6] Testando persistência e resolução de dúvidas MedQuest...');
assert.strictEqual(typeof RotinaTimeline.carregarDuvidasLocais, 'function');
assert.strictEqual(typeof RotinaTimeline.salvarDuvidasLocais, 'function');
assert.strictEqual(typeof RotinaTimeline.renderizarDuvidas, 'function');
assert.strictEqual(typeof RotinaTimeline.resolverDuvidaCockpit, 'function');
assert.strictEqual(typeof RotinaTimeline.alternarGavetaDuvidas, 'function');

const listaDuvidasTeste = [
  { id: 'd1', texto: 'Critérios de Light para exsudato pleural', resolvida: false },
  { id: 'd2', texto: 'Tratamento de status epilepticus na emergência', resolvida: true }
];
RotinaTimeline.salvarDuvidasLocais(listaDuvidasTeste);
const lidas = RotinaTimeline.carregarDuvidasLocais();
assert.strictEqual(lidas.length, 2);
assert.strictEqual(lidas[0].texto, 'Critérios de Light para exsudato pleural');

RotinaTimeline.renderizarDuvidas(lidas);
const badgeDuvidas = mockDoc.getElementById('duvidas-contador-badge');
assert.strictEqual(badgeDuvidas.textContent, '1', 'Badge deve contar 1 dúvida pendente');

RotinaTimeline.resolverDuvidaCockpit('d1');
const lidasAposResolver = RotinaTimeline.carregarDuvidasLocais();
assert.strictEqual(lidasAposResolver.find(d => d.id === 'd1').resolvida, true, 'Dúvida d1 deve estar marcada como resolvida');
console.log('  ✓ Persistência e ciclo de vida de dúvidas MedQuest validados.');

// 4.8 Grade Padrão com Confirmação e Polling Suave
console.log('\n[7] Testando proteção de grade padrão e polling suave...');
assert.strictEqual(typeof RotinaTimeline.carregarGradePadraoComConfirmacao, 'function');
assert.strictEqual(typeof RotinaTimeline.iniciarPollingSuave, 'function');
console.log('  ✓ Métodos de proteção e polling suave validados.');

// 4.9 Persistência Offline-First IndexedDB e Fila de Sincronização Resiliente
console.log('\n[8] Testando Persistência Offline-First IndexedDB e Fila de Sincronização Resiliente...');
assert.strictEqual(typeof RotinaTimeline.salvarBlocosOfflineAsync, 'function', 'salvarBlocosOfflineAsync deve ser função');
assert.strictEqual(typeof RotinaTimeline.carregarBlocosOfflineAsync, 'function', 'carregarBlocosOfflineAsync deve ser função');
assert.strictEqual(typeof RotinaTimeline.obterFilaOffline, 'function', 'obterFilaOffline deve ser função');
assert.strictEqual(typeof RotinaTimeline.obterStatusFilaOffline, 'function', 'obterStatusFilaOffline deve ser função');

// Validação de enfileiramento e contagem
RotinaTimeline.enfileirarMutacaoOffline('b-offline-1', 'concluido', 'Marcado no leito sem sinal');
const fila = RotinaTimeline.obterFilaOffline();
assert.ok(Array.isArray(fila), 'Fila offline deve retornar array');
assert.ok(fila.length >= 1, 'Fila offline deve conter pelo menos 1 mutação');
assert.strictEqual(fila[fila.length - 1].blocoId, 'b-offline-1');

const statusFila = RotinaTimeline.obterStatusFilaOffline();
assert.ok(statusFila.pendencias >= 1, 'Status da fila deve apontar pendências');

// Validação de roundtrip assíncrono (Promise)
const blocosParaSalvar = [
  { id: 'b-off-roundtrip', titulo: 'Plantão Noturno Sem Sinal', inicio: '19:00', fim: '07:00', categoria: 'plantao', status: 'ativo' }
];
RotinaTimeline.salvarBlocosOfflineAsync(blocosParaSalvar, '2026-10-12').then(function() {
  return RotinaTimeline.carregarBlocosOfflineAsync('2026-10-12');
}).then(function(blocosCarregados) {
  assert.ok(Array.isArray(blocosCarregados));
  assert.ok(blocosCarregados.some(b => b.id === 'b-off-roundtrip'), 'Bloco salvo assincronamente deve ser recuperado');
});

// 4.10 Novos Recursos: Modo Plantão, Visualizações, Metas Diárias, Pomodoro e Bloco Personalizado
console.log('\n[9] Testando novos recursos: Modo Plantão, Visualizações, Metas Diárias e Pomodoro...');
assert.strictEqual(typeof RotinaTimeline.alternarModoPlantaoAltoContraste, 'function');
assert.strictEqual(typeof RotinaTimeline.alternarVisualizacao, 'function');
assert.strictEqual(typeof RotinaTimeline.incrementarMetaDiaria, 'function');
assert.strictEqual(typeof RotinaTimeline.iniciarPomodoroBloco, 'function');
assert.strictEqual(typeof RotinaTimeline.salvarBlocoPersonalizado, 'function');
assert.strictEqual(typeof RotinaTimeline.selecionarAreaDuvida, 'function');

// Teste de Modo Plantão Alto Contraste
RotinaTimeline.alternarModoPlantaoAltoContraste(true);
RotinaTimeline.alternarModoPlantaoAltoContraste(false);

// Teste de Metas Diárias
RotinaTimeline.incrementarMetaDiaria('questoes', 10);
const metasLidas = RotinaTimeline.carregarMetasDiarias();
assert.ok(metasLidas.questoes >= 10, 'Metas de questões devem ser incrementadas');

// Teste de Pomodoro
RotinaTimeline.iniciarPomodoroBloco('b2', 25);
RotinaTimeline.resetarPomodoroBloco('b2', 25);

// Teste de Bloco Personalizado
const novoB = RotinaTimeline.salvarBlocoPersonalizado({
  titulo: 'Sessão Extra Casos R1',
  inicio: '21:15',
  fim: '22:00',
  categoria: 'estudo',
  nota: 'Casos difíceis'
});
assert.ok(novoB, 'Bloco personalizado deve ser retornado');
assert.strictEqual(novoB.inicio, '21:15');

// Teste de seleção de grande área
RotinaTimeline.selecionarAreaDuvida('Cirurgia');

console.log('  ✓ Novos recursos da Aba Rotina v2.0 validados com sucesso.');

console.log('\n=== TODOS OS TESTES DA ABA ROTINA COCKPIT APROVADOS COM SUCESSO! ===');

