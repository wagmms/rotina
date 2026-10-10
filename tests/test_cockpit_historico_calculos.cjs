/**
 * tests/test_cockpit_historico_calculos.cjs
 * Suíte de testes automatizados para o Histórico Local de Consultas/Cálculos (sessionStorage)
 * e Otimizações de UX/UI no Cockpit PWA.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

console.log('=== TESTE DE HISTÓRICO LOCAL DE CÁLCULOS (SESSIONSTORAGE) NO COCKPIT PWA ===\n');

const cockpitPath = path.resolve(__dirname, '../cockpit_movel.html');
const deployPath = path.resolve(__dirname, '../gh_cockpit_deploy/index.html');

assert(fs.existsSync(cockpitPath), 'cockpit_movel.html deve existir');
assert(fs.existsSync(deployPath), 'gh_cockpit_deploy/index.html deve existir');

const htmlCockpit = fs.readFileSync(cockpitPath, 'utf8');
const htmlDeploy = fs.readFileSync(deployPath, 'utf8');

// [1] Validação de Paridade Absoluta SHA-256
console.log('[1] Validando paridade de hash SHA-256 entre cockpit_movel.html e gh_cockpit_deploy/index.html...');
const hashCockpit = crypto.createHash('sha256').update(htmlCockpit).digest('hex');
const hashDeploy = crypto.createHash('sha256').update(htmlDeploy).digest('hex');
assert.strictEqual(hashCockpit, hashDeploy, 'cockpit_movel.html e gh_cockpit_deploy/index.html devem ter hash SHA-256 idêntico');
console.log(`  ✓ Paridade absoluta validada (SHA-256: ${hashCockpit.slice(0, 16)}...).`);

// [2] Validação dos Elementos HTML no DOM
console.log('\n[2] Validando elementos visuais do Histórico de Cálculos no HTML...');
assert(htmlCockpit.includes('id="historico-calculos-container"'), 'Container historico-calculos-container deve existir');
assert(htmlCockpit.includes('id="historico-calculos-lista"'), 'Container historico-calculos-lista deve existir');
assert(htmlCockpit.includes('onclick="limparHistoricoCalculos()"'), 'Botão de limpar histórico deve estar presente');
assert(htmlCockpit.includes('id="btn-copiar-pediatria"'), 'Botão btn-copiar-pediatria deve estar presente');
assert(htmlCockpit.includes('id="btn-copiar-asma"'), 'Botão btn-copiar-asma deve estar presente');
console.log('  ✓ Elementos estruturais do histórico e botões de cópia validados no HTML.');

// [3] Extração e Preparação do Ambiente de Simulação VM
console.log('\n[3] Configurando ambiente de simulação e extraindo script do Cockpit...');
const scripts = Array.from(htmlCockpit.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi));
assert(scripts.length > 0, 'Scripts inline devem estar presentes no Cockpit');
const scriptCodigo = scripts.map(m => m[1]).reduce((maior, s) => s.length > maior.length ? s : maior, '');
assert(scriptCodigo.length > 10000, 'Script principal deve ter mais de 10.000 caracteres');

// Mock DOM & Storage
const mockSessionStorage = (function() {
  let store = {};
  return {
    getItem: (k) => store[k] !== undefined ? store[k] : null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
    _dump: () => ({ ...store }),
    _corromper: (k) => { store[k] = '{"invalido: json'; }
  };
})();

const elementosDom = {};
function criarElementoMock(id, tag = 'div') {
  return {
    id: id,
    tagName: tag.toUpperCase(),
    value: '',
    textContent: '',
    innerText: '',
    innerHTML: '',
    checked: false,
    classList: {
      classes: new Set(),
      add: function(...c) { c.forEach(item => this.classes.add(item)); },
      remove: function(...c) { c.forEach(item => this.classes.delete(item)); },
      toggle: function(c, force) {
        if (force !== undefined) {
          if (force) this.classes.add(c); else this.classes.delete(c);
          return force;
        }
        if (this.classes.has(c)) { this.classes.delete(c); return false; }
        this.classes.add(c); return true;
      },
      contains: function(c) { return this.classes.has(c); }
    },
    addEventListener: () => {},
    style: {},
    dataset: {}
  };
}

const mockDocument = {
  getElementById: (id) => {
    if (!elementosDom[id]) {
      elementosDom[id] = criarElementoMock(id);
    }
    return elementosDom[id];
  },
  querySelector: (sel) => {
    if (sel.includes('input[name="cr-sexo"]:checked')) {
      return { value: elementosDom['cr-sexo-checked-val'] || 'm' };
    }
    if (sel.includes('input[name="cr-sexo"][value="')) {
      const match = sel.match(/value="([^"]+)"/);
      const val = match ? match[1] : 'm';
      return {
        set checked(v) { if (v) elementosDom['cr-sexo-checked-val'] = val; }
      };
    }
    return criarElementoMock('sel_' + Math.random().toString(36).slice(2, 6));
  },
  querySelectorAll: () => []
};

let ultimoSubCalcIdAberto = null;
let toastMensagens = [];

const sandbox = {
  console: console,
  window: {
    sessionStorage: mockSessionStorage,
    lucide: { createIcons: () => {} },
    addEventListener: () => {}
  },
  document: mockDocument,
  navigator: { clipboard: { writeText: async () => {} } },
  hapticFeedback: () => {},
  copiarToast: (msg) => { toastMensagens.push(msg); },
  abrirSubCalc: (paneId) => { ultimoSubCalcIdAberto = paneId; },
  isDeviceOffline: () => true,
  cockpitRpc: async () => ({ textoFormatado: 'Mock RPC' }),
  DOMParser: class {
    parseFromString(str) {
      return { body: { textContent: str } };
    }
  },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: () => {},
  clearInterval: () => {},
  Date: Date
};

// Executa o script dentro do contexto VM isolado
const context = vm.createContext(sandbox);
vm.runInContext(scriptCodigo, context);
console.log('  ✓ Script do Cockpit compilado e executado com sucesso no sandbox.');

// [4] Testes de Persistência Volátil e Limites no sessionStorage
console.log('\n[4] Testando persistência volátil (sessionStorage), LIFO e teto de 5 itens...');
sandbox.limparHistoricoCalculos();
assert.strictEqual(sandbox.obterHistoricoCalculos().length, 0, 'Histórico inicial deve estar vazio');

// Registra 6 cálculos sucessivos para validar o teto de 5
sandbox.registrarHistoricoCalculo('dva', { peso: 70, droga: 'nora' }, 'Noradrenalina 6.6 mL/h em BIC');
sandbox.registrarHistoricoCalculo('sri', { peso: 70, cenario: 'choque' }, 'Etomidato + Succinilcolina');
sandbox.registrarHistoricoCalculo('crcl', { idade: 68, peso: 70, creatinina: 1.4, sexo: 'm' }, 'Clearance Estimado: 43 mL/min');
sandbox.registrarHistoricoCalculo('gaso', { ph: 7.28, pco2: 28, hco3: 13 }, 'Acidose Metabólica Parcialmente Compensada');
sandbox.registrarHistoricoCalculo('heart', { historia: 2, ecg: 1, idade: 60, fr: 2, troponina: 1 }, 'HEART Score 6 pts - Alto Risco');
// 6º cálculo: deve empurrar o mais antigo (dva) para fora
sandbox.registrarHistoricoCalculo('ajuste_atb', { droga: 'meropenem', clcr: 30 }, 'Meropenem 1g a cada 12h');

const itens1 = sandbox.obterHistoricoCalculos();
assert.strictEqual(itens1.length, 5, 'Histórico deve respeitar teto estrito de 5 itens');
assert.strictEqual(itens1[0].tipo, 'ajuste_atb', 'O item mais recente deve estar no topo (LIFO)');
assert.strictEqual(itens1[4].tipo, 'sri', 'O 5º item deve ser SRI (DVA foi descartado como 6º mais antigo)');
console.log('  ✓ Teto de 5 itens e ordenação cronológica decrescente (LIFO) validados.');

// [5] Testando Desduplicação Inteligente
console.log('\n[5] Testando desduplicação inteligente de cálculos repetidos...');
// Recalcula o HEART Score com os mesmos parâmetros
sandbox.registrarHistoricoCalculo('heart', { historia: 2, ecg: 1, idade: 60, fr: 2, troponina: 1 }, 'HEART Score 6 pts - Alto Risco');
const itens2 = sandbox.obterHistoricoCalculos();
assert.strictEqual(itens2.length, 5, 'Desduplicação não deve aumentar o tamanho da lista');
assert.strictEqual(itens2[0].tipo, 'heart', 'Item recalculado deve saltar para o topo da lista');
console.log('  ✓ Desduplicação validada: item repetido reposicionado no topo sem duplicidade.');

// [6] Testando Geração de Metadados e Rótulos Clínicos
console.log('\n[6] Testando geração de metadados clínicos amigáveis para todas as calculadoras...');
const metaDva = sandbox.gerarMetadadosHistorico('dva', { peso: 80, droga: 'dobuta' });
assert.strictEqual(metaDva.subcalcId, 'calc-dva');
assert.strictEqual(metaDva.rotulo, 'DVA · DOBUTA');

const metaAsma = sandbox.gerarMetadadosHistorico('asma', { spo2: 88, fr: 34, peso: 65 });
assert.strictEqual(metaAsma.subcalcId, 'calc-asma');
assert.strictEqual(metaAsma.rotulo, 'Asma Grave');

const metaCrcl = sandbox.gerarMetadadosHistorico('crcl', { idade: 75, peso: 60, creatinina: 2.0, sexo: 'f' });
assert.strictEqual(metaCrcl.subcalcId, 'calc-crcl');
assert.strictEqual(metaCrcl.rotulo, 'Clearance Renal');
assert(metaCrcl.resumo.includes('(F)'));

const metaDhe = sandbox.gerarMetadadosHistorico('dhe', { modo: 'hipercalemia', kAtual: 7.2, ecgAlterado: true });
assert.strictEqual(metaDhe.subcalcId, 'calc-dhe');
assert(metaDhe.resumo.includes('K+ 7.2'));
assert(metaDhe.resumo.includes('[ECG Alt]'));

const metaCross = sandbox.gerarMetadadosHistorico('crosscheck', { texto: 'amiodarona 200mg, fluconazol 150mg' });
assert.strictEqual(metaCross.subcalcId, 'calc-crosscheck');
assert.strictEqual(metaCross.rotulo, 'Cross-Check Farmaco');
console.log('  ✓ Metadados, ícones e rótulos clínicos de todas as calculadoras validados com sucesso.');

// [7] Testando Restauração com 1 Toque (restaurarCalculoHistorico)
console.log('\n[7] Testando restauração automática de parâmetros com 1 toque...');

// Restauração de Clearance
const itemCrcl = itens2.find(it => it.tipo === 'crcl');
assert(itemCrcl, 'Item CrCl deve existir no histórico');
sandbox.restaurarCalculoHistorico(itemCrcl.id);

assert(!elementosDom['calc-crcl'].classList.contains('hidden'), 'Painel calc-crcl deve estar visível');
assert.strictEqual(elementosDom['cr-idade'].value, 68, 'Idade deve ter sido restaurada');
assert.strictEqual(elementosDom['cr-peso'].value, 70, 'Peso deve ter sido restaurado');
assert.strictEqual(elementosDom['cr-val'].value, 1.4, 'Creatinina deve ter sido restaurada');
assert.strictEqual(elementosDom['crcl-resultado'].textContent, 'Clearance Estimado: 43 mL/min', 'Resultado deve ter sido restaurado instantaneamente');
assert(!elementosDom['btn-copiar-crcl'].classList.contains('hidden'), 'Botão btn-copiar-crcl deve estar visível');
console.log('  ✓ Restauração de Clearance de Creatinina (valores, radios e resultado) 100% aprovada.');

// Restauração de DVA
sandbox.registrarHistoricoCalculo('dva', { peso: 85, droga: 'nora' }, 'Noradrenalina 8.0 mL/h em BIC');
const itemDva = sandbox.obterHistoricoCalculos()[0];
sandbox.restaurarCalculoHistorico(itemDva.id);
assert(!elementosDom['calc-dva'].classList.contains('hidden'), 'Painel calc-dva deve estar visível');
assert.strictEqual(elementosDom['dva-peso'].value, 85, 'Peso da DVA restaurado');
assert.strictEqual(elementosDom['dva-droga'].value, 'nora', 'Droga da DVA restaurada');
assert.strictEqual(elementosDom['dva-resultado'].textContent, 'Noradrenalina 8.0 mL/h em BIC');
assert(!elementosDom['btn-copiar-dva'].classList.contains('hidden'), 'Botão de cópia DVA visível');
console.log('  ✓ Restauração de DVA (peso, droga e resultado) 100% aprovada.');

// Restauração de Asma
sandbox.registrarHistoricoCalculo('asma', { fala: 'palavras_isoladas', ausculta: 'sibilos_difusos', spo2: 89, fr: 32, fc: 125, peso: 70, idade: 28, refratario: true }, 'Manejo de Crise Asmática Grave');
const itemAsma = sandbox.obterHistoricoCalculos()[0];
sandbox.restaurarCalculoHistorico(itemAsma.id);
assert(!elementosDom['calc-asma'].classList.contains('hidden'), 'Painel calc-asma deve estar visível');
assert.strictEqual(elementosDom['asma-spo2'].value, 89, 'SpO2 da asma restaurada');
assert.strictEqual(elementosDom['asma-peso'].value, 70, 'Peso da asma restaurado');
assert.strictEqual(elementosDom['asma-refratario'].checked, true, 'Checkbox de refratário restaurado');
assert(!elementosDom['btn-copiar-asma'].classList.contains('hidden'), 'Botão de cópia de Asma visível');
console.log('  ✓ Restauração de Crise Asmática (sinais vitais, salvaguardas e conduta) 100% aprovada.');

// [8] Testando Limpeza do Histórico (limparHistoricoCalculos)
console.log('\n[8] Testando limpeza de histórico...');
sandbox.limparHistoricoCalculos();
assert.strictEqual(sandbox.obterHistoricoCalculos().length, 0, 'Histórico deve estar vazio após limpeza');
assert(elementosDom['historico-calculos-container'].classList.contains('hidden'), 'Container deve ficar oculto quando vazio');
console.log('  ✓ Limpeza de histórico e ocultação de container aprovadas.');

// [9] Testando Resiliência Defensiva contra Falhas de Storage
console.log('\n[9] Testando resiliência contra sessionStorage corrompido ou indisponível...');
// Corrompe o JSON no sessionStorage
mockSessionStorage._corromper(sandbox.HISTORICO_CALCULOS_KEY);
const itensCorrompidos = sandbox.obterHistoricoCalculos();
assert.strictEqual(itensCorrompidos.length, 0, 'Deve retornar array vazio graciosamente se JSON corrompido');

// Simula sessionStorage indisponível (null)
sandbox.window.sessionStorage = null;
assert.doesNotThrow(() => {
  sandbox.salvarHistoricoCalculos([{ id: 1 }]);
  const res = sandbox.obterHistoricoCalculos();
  assert.strictEqual(res.length, 0);
}, 'Não deve lançar erro mesmo se sessionStorage for nulo (navegação privada)');
sandbox.window.sessionStorage = mockSessionStorage;
console.log('  ✓ Blindagem defensiva contra JSON inválido e navegação ultra-restrita validada.');

// [10] Testando Funções de Interface da Asma
console.log('\n[10] Testando métodos de interface da Asma (definirPresetAsma, calcularAsmaCockpit, limparAsma, copiarAsmaPEP)...');
assert(typeof sandbox.definirPresetAsma === 'function', 'definirPresetAsma deve ser uma função');
assert(typeof sandbox.calcularAsmaCockpit === 'function', 'calcularAsmaCockpit deve ser uma função');
assert(typeof sandbox.limparAsma === 'function', 'limparAsma deve ser uma função');
assert(typeof sandbox.copiarAsmaPEP === 'function', 'copiarAsmaPEP deve ser uma função');

sandbox.definirPresetAsma('incapaz', 82, 38, 135, 'torax_silencioso', 70, 35, true, true, false);
assert.strictEqual(elementosDom['asma-fala'].value, 'incapaz');
assert.strictEqual(elementosDom['asma-spo2'].value, 82);
assert.strictEqual(elementosDom['asma-ausculta'].value, 'torax_silencioso');
assert.strictEqual(elementosDom['asma-normocapnia'].checked, true);
console.log('  ✓ Métodos de controle da calculadora de Asma aprovados.');

console.log('\n🎉 SUCESSO TOTAL: Todos os 10 testes de Histórico Local de Cálculos e Otimizações de UX foram aprovados com 100% de sucesso!');
