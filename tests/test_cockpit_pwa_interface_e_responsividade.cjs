/**
 * tests/test_cockpit_pwa_interface_e_responsividade.cjs
 * Teste automatizado de auditoria da interface, modais, sincronização SOAP e resiliência offline do Cockpit PWA.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const assert = require('assert');

console.log('=== TESTE DE AUDITORIA: COCKPIT PWA INTERFACE, MODAIS & SINCRONIZAÇÃO ===\n');

// 1. Validando paridade de hash SHA-256 entre cockpit_movel.html e gh_cockpit_deploy/index.html
console.log('[1] Validando paridade de hash SHA-256 entre cockpit_movel.html e gh_cockpit_deploy/index.html...');
const htmlRaiz = fs.readFileSync(path.resolve(__dirname, '../cockpit_movel.html'), 'utf8');
const htmlDeploy = fs.readFileSync(path.resolve(__dirname, '../gh_cockpit_deploy/index.html'), 'utf8');

const hashRaiz = crypto.createHash('sha256').update(htmlRaiz).digest('hex');
const hashDeploy = crypto.createHash('sha256').update(htmlDeploy).digest('hex');

assert.strictEqual(hashRaiz, hashDeploy, 'cockpit_movel.html e gh_cockpit_deploy/index.html devem ter hash SHA-256 idêntico!');
console.log(`  ✓ Paridade absoluta validada (SHA-256: ${hashRaiz.substring(0, 16)}...).`);

// 2. Validando regras CSS responsivas para mobile estreito (320px a 420px)
console.log('\n[2] Validando regras CSS responsivas para mobile estreito (320px a 420px)...');
assert(htmlRaiz.includes('@media screen and (max-width: 420px)'), 'Deve conter media query para max-width: 420px.');
assert(htmlRaiz.includes('btn-copiar-conduta') || htmlRaiz.includes('[id^="btn-copiar-"]'), 'Deve conter seletores para botões de cópia.');
assert(htmlRaiz.includes('word-break: break-word !important'), 'Deve garantir quebra de palavra para prevenir estouro horizontal.');
console.log('  ✓ Regras CSS responsivas anti-estouro (320px a 420px) validadas com sucesso.');

// 3. Montando sandbox DOM para testar funções do Cockpit
console.log('\n[3] Configurando sandbox DOM para testar scripts do Cockpit PWA...');
const elementsStore = {};
function mockElement(id) {
  if (!elementsStore[id]) {
    elementsStore[id] = {
      id,
      textContent: '',
      value: '',
      className: '',
      classes: new Set(),
      dataset: {},
      classList: {
        add(c) { this.classes = this.classes || new Set(); this.classes.add(c); },
        remove(c) { this.classes = this.classes || new Set(); this.classes.delete(c); },
        contains(c) { return (this.classes || new Set()).has(c); },
        toggle(c, v) { if (v) this.add(c); else this.remove(c); }
      },
      setAttribute(k, v) { this[k] = v; },
      removeAttribute(k) { delete this[k]; },
      append() {},
      appendChild() {},
      replaceChildren() {},
      scrollIntoView() {},
      querySelectorAll() { return []; },
      querySelector() { return null; },
      innerHTML: ''
    };
  }
  return elementsStore[id];
}

const mockSessionStorage = {
  store: {},
  getItem(k) { return this.store[k] ?? null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};

const mockLocalStorage = {
  store: {},
  getItem(k) { return this.store[k] ?? null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};

const listeners = {};
const mockWindow = {
  location: { origin: 'https://ultra-rotina-backend.onrender.com', hostname: 'ultra-rotina-backend.onrender.com', search: '' },
  navigator: { onLine: true, clipboard: { writeText: async () => {} } },
  sessionStorage: mockSessionStorage,
  localStorage: mockLocalStorage,
  scrollTo: () => {},
  addEventListener(event, fn) {
    listeners[event] = listeners[event] || [];
    listeners[event].push(fn);
  },
  dispatchEvent(event) {
    if (listeners[event]) listeners[event].forEach(fn => fn());
  }
};

const sandbox = {
  window: mockWindow,
  document: {
    getElementById: (id) => mockElement(id),
    querySelector: (s) => mockElement(s.replace(/[^a-zA-Z0-9_-]/g, '')),
    querySelectorAll: (s) => {
      if (s.startsWith('[id^="modal-"]')) {
        return ['modal-sbar-passagem', 'modal-ficha-farmaco', 'modal-ambulatorio-soap', 'modal-atestado-cfm',
                'modal-prenatal', 'modal-centro-obstetrico', 'modal-ginecologia-ambulatorial', 'modal-plantao-offline',
                'modal-raiox-preceptor', 'modal-preceptor-live', 'modal-sintese-dia-soap', 'modal-exame-fisico-normal']
                .map(id => mockElement(id));
      }
      return [];
    },
    createElement: (tag) => mockElement('elem_' + Math.random()),
    addEventListener: mockWindow.addEventListener
  },
  navigator: mockWindow.navigator,
  sessionStorage: mockSessionStorage,
  localStorage: mockLocalStorage,
  setTimeout: (fn) => setTimeout(fn, 0),
  setInterval: () => {},
  clearTimeout: () => {},
  clearInterval: () => {},
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  tailwind: { config: {} },
  console: { log() {}, warn() {}, error() {} }
};

vm.createContext(sandbox);

// Extrai o maior bloco <script> inline do HTML (script principal da aplicação)
const scripts = [...htmlRaiz.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)];
const scriptPrincipal = scripts.reduce((maior, s) => s[1].length > maior.length ? s[1] : maior, '');
assert(scriptPrincipal && scriptPrincipal.length > 5000, 'Deve conter script principal no HTML');
vm.runInContext(scriptPrincipal, sandbox);
console.log('  ✓ Script do Cockpit executado com sucesso no sandbox.');

// 4. Testando cockpitRenderizarSoap
console.log('\n[4] Testando cockpitRenderizarSoap...');
assert.strictEqual(typeof sandbox.cockpitRenderizarSoap, 'function', 'cockpitRenderizarSoap deve ser uma função');

// Cenário A: Com texto SOAP substantivo
sandbox.cockpitRenderizarSoap('S: Paciente refere tosse.\nO: PA 120/80.\nA: IVAS.\nP: Hidratação e sintomáticos.', true);
const soapElem = mockElement('soap-integral');
const avisoElem = mockElement('cockpit-status');
assert(soapElem.textContent.includes('S: Paciente refere tosse'), 'Elemento soap-integral deve conter o texto fornecido');
assert(avisoElem.textContent.includes('SOAP do atendimento atual'), 'Aviso de status deve indicar atendimento atual atualizado');

// Cenário B: Com texto vazio (nenhum atendimento ativo)
sandbox.cockpitRenderizarSoap('', false);
assert(soapElem.textContent.includes('Nenhum prontuário SOAP carregado'), 'Deve exibir mensagem amigável quando vazio');
assert(avisoElem.textContent.includes('Nenhum atendimento ativo'), 'Aviso deve informar que não há atendimento ativo');

// Cenário C: Com aviso customizado (ex: modo offline ou sinal indisponível)
sandbox.cockpitRenderizarSoap('SOAP Local', true, '📴 Modo Plantão sem Sinal (12:00)');
assert.strictEqual(avisoElem.textContent, '📴 Modo Plantão sem Sinal (12:00)', 'Aviso customizado deve ter precedência');
console.log('  ✓ cockpitRenderizarSoap validado com sucesso em todos os cenários.');

// 5. Testando abrirModalCalc e fecharTodosModais
console.log('\n[5] Testando abrirModalCalc e fecharTodosModais...');
assert.strictEqual(typeof sandbox.fecharTodosModais, 'function', 'fecharTodosModais deve ser uma função');
assert.strictEqual(typeof sandbox.abrirModalCalc, 'function', 'abrirModalCalc deve ser uma função');

// Abre um modal simulado
const modalSbar = mockElement('modal-sbar-passagem');
modalSbar.classList.remove('hidden');
assert(!modalSbar.classList.contains('hidden'), 'Modal deve estar visível antes de fechar');

// Executa fecharTodosModais
sandbox.fecharTodosModais();
assert(modalSbar.classList.contains('hidden'), 'Todos os modais devem receber classe hidden');

// Testando abrirModalCalc para subcalculadoras
sandbox.abrirModalCalc('dva');
const paneDva = mockElement('calc-dva');
assert(!paneDva.classList.contains('hidden'), 'Painel calc-dva deve ser exibido');

sandbox.abrirModalCalc('calc-asma');
const paneAsma = mockElement('calc-asma');
assert(!paneAsma.classList.contains('hidden'), 'Painel calc-asma deve ser exibido');
console.log('  ✓ abrirModalCalc e fecharTodosModais validados com sucesso.');

// 6. Testando persistência offline do histórico de cálculos
console.log('\n[6] Testando persistência offline do histórico de cálculos...');
mockSessionStorage.clear();
mockLocalStorage.clear();

const listaCalculos = [
  { id: 'c1', tipo: 'dva', rotulo: 'DVA Nora', resumo: '70 kg', timestamp: '10:00' },
  { id: 'c2', tipo: 'asma', rotulo: 'Asma Grave', resumo: 'SpO2 88%', timestamp: '10:05' }
];

sandbox.salvarHistoricoCalculos(listaCalculos);
assert(mockSessionStorage.getItem('rotina_historico_calculos_v1'), 'Deve persistir em sessionStorage');
assert(mockLocalStorage.getItem('rotina_historico_calculos_v1_offline'), 'Deve espelhar em localStorage para memória offline persistente');

// Simula reinício de sessão limpando sessionStorage
mockSessionStorage.clear();
const recuperado = sandbox.obterHistoricoCalculos();
assert.strictEqual(recuperado.length, 2, 'Deve recuperar os 2 cálculos do localStorage quando sessionStorage estiver vazio');
assert.strictEqual(recuperado[0].rotulo, 'DVA Nora');
console.log('  ✓ Persistência de cálculos recentes em memória offline validada.');

// 7. Testando resiliência da fila offline (unificação Dexie e localStorage)
console.log('\n[7] Testando resiliência da fila offline (unificação Dexie e localStorage)...');
assert.strictEqual(typeof sandbox.obterFilaOffline, 'function');
assert.strictEqual(typeof sandbox.removerItemFilaOffline, 'function');
assert.strictEqual(typeof sandbox.limparFilaOffline, 'function');

// Adiciona itens manuais em localStorage
mockLocalStorage.setItem('cockpit_sync_queue', JSON.stringify([
  { id: 'item_1', acao: 'cockpitStatusLeito', args: [7, 'v1', 'estavel'] },
  { id: 'item_2', acao: 'cockpitStatusLeito', args: [8, 'v1', 'alta'] }
]));

sandbox.obterFilaOffline().then(async (fila) => {
  assert.strictEqual(fila.length, 2, 'Fila deve recuperar os 2 itens');
  await sandbox.removerItemFilaOffline('item_1');
  const filaRestante = await sandbox.obterFilaOffline();
  assert.strictEqual(filaRestante.length, 1, 'Deve restar 1 item após remoção');
  assert.strictEqual(filaRestante[0].id, 'item_2');

  await sandbox.limparFilaOffline();
  const filaVazia = await sandbox.obterFilaOffline();
  assert.strictEqual(filaVazia.length, 0, 'Fila deve estar vazia após limparFilaOffline');
  console.log('  ✓ Fila offline resiliente testada e aprovada.');

  console.log('\n🎉 TODOS OS TESTES DE AUDITORIA, INTERFACE E RESILIÊNCIA DO COCKPIT PWA FORAM APROVADOS COM 100% DE SUCESSO!\n');
}).catch(err => {
  console.error('Erro na validação da fila offline:', err);
  process.exit(1);
});
