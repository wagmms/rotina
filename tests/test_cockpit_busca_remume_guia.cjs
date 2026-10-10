/**
 * ==============================================================================
 * TESTE DE AUDITORIA E OTIMIZAÇÃO: BUSCA REMUME E GUIA FARMACÊUTICO COCKPIT PWA
 * ==============================================================================
 * Bateria automatizada testando:
 * 1. Paridade de hash SHA-256 entre cockpit_movel.html e gh_cockpit_deploy/index.html
 * 2. Proibição absoluta de Google Apps Script (GAS)
 * 3. Estrutura semântica e acessibilidade do Modal de Ficha Farmacológica (#modal-ficha-farmaco)
 * 4. Compilação e inicialização do JavaScript do Cockpit no sandbox VM
 * 5. Normalização robusta sem acentos (NFD) e busca multi-token flexível
 * 6. Reconhecimento determinístico de marcas comerciais consagradas e DCI (Novalgina, Plasil, Tylenol, Lasix, etc.)
 * 7. Geração de Posologias de Referência e Cópia Estruturada de 1 Toque para PEP
 * 8. Feedback visual acessível de 'Nenhum medicamento encontrado' com dicas e botão de restauração
 * 9. Desempenho e tempo de resposta em 0ms no cache em memória
 * 10. Handshake RPC Fastify (cockpitConsultarFarmaco) com dados oficiais do Guia HSL
 * ==============================================================================
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const ROOT_DIR = path.resolve(__dirname, '..');
const COCKPIT_PATH = path.join(ROOT_DIR, 'cockpit_movel.html');
const DEPLOY_PATH = path.join(ROOT_DIR, 'gh_cockpit_deploy', 'index.html');

const htmlCockpit = fs.readFileSync(COCKPIT_PATH, 'utf8');
const htmlDeploy = fs.readFileSync(DEPLOY_PATH, 'utf8');

test('Cockpit REMUME & Guia Farmacêutico - Paridade estrita SHA-256 de build de produção', () => {
  const hashCockpit = crypto.createHash('sha256').update(htmlCockpit).digest('hex');
  const hashDeploy = crypto.createHash('sha256').update(htmlDeploy).digest('hex');
  assert.strictEqual(hashCockpit, hashDeploy, 'cockpit_movel.html e gh_cockpit_deploy/index.html devem ter SHA-256 100% idêntico');
});

test('Cockpit REMUME & Guia Farmacêutico - Proibição absoluta de Google Apps Script (GAS)', () => {
  assert.ok(!htmlCockpit.includes('google.script.run'), 'Proibido google.script.run em cockpit_movel.html');
  assert.ok(!htmlDeploy.includes('google.script.run'), 'Proibido google.script.run em gh_cockpit_deploy/index.html');
  assert.ok(!htmlCockpit.includes('GAS_BACKEND_URL'), 'Proibido GAS_BACKEND_URL no Cockpit');
});

test('Cockpit REMUME & Guia Farmacêutico - Estrutura e semântica do Modal de Ficha Farmacológica (#modal-ficha-farmaco)', () => {
  assert.ok(htmlCockpit.includes('id="modal-ficha-farmaco"'), 'Deve conter modal-ficha-farmaco no DOM');
  assert.ok(htmlCockpit.includes('role="dialog"'), 'Modal deve ter role="dialog"');
  assert.ok(htmlCockpit.includes('aria-modal="true"'), 'Modal deve ter aria-modal="true"');
  assert.ok(htmlCockpit.includes('aria-labelledby="titulo-ficha-farmaco"'), 'Modal deve ter aria-labelledby apontando para título');
  assert.ok(htmlCockpit.includes('id="titulo-ficha-farmaco"'), 'Deve ter elemento de título do modal');
  assert.ok(htmlCockpit.includes('id="btn-copiar-ficha-farmaco"'), 'Deve ter botão de cópia estruturada para PEP');
  assert.ok(htmlCockpit.includes('id="ficha-dose-adulto"'), 'Deve ter elemento para dose adulto');
  assert.ok(htmlCockpit.includes('id="ficha-ajuste-dose"'), 'Deve ter elemento para ajuste renal');
  assert.ok(htmlCockpit.includes('id="ficha-dose-maxima"'), 'Deve ter elemento para dose máxima');
});

test('Cockpit REMUME & Guia Farmacêutico - Elementos estruturais da busca e catálogo na Aba REMUME', () => {
  assert.ok(htmlCockpit.includes('id="busca-remume"'), 'Deve ter campo de busca-remume');
  assert.ok(htmlCockpit.includes('id="btn-limpar-busca-remume"'), 'Deve ter botão de limpar busca');
  assert.ok(htmlCockpit.includes('id="filtro-remume-categorias"'), 'Deve ter seletor de categorias com chips');
  assert.ok(htmlCockpit.includes('id="lista-remume-container"'), 'Deve ter container de lista da REMUME');
  assert.ok(htmlCockpit.includes('id="remume-status"'), 'Deve ter aviso de status da REMUME');
});

function criarAmbienteSimulacaoCockpit() {
  const scriptMatches = [...htmlCockpit.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scriptMatches.length >= 1, 'Deve possuir scripts embutidos');
  const scriptContent = scriptMatches[scriptMatches.length - 1][1];

  const elementosCriados = [];
  const elementos = new Map();

  function criarMockElemento(id, tag = 'div') {
    const classes = new Set();
    const attrs = new Map();
    const filhos = [];
    let _textoProprio = '';
    const obj = {
      id: id || '',
      tagName: tag.toUpperCase(),
      dataset: {},
      style: {},
      get textContent() {
        if (filhos.length > 0) {
          return filhos.map(f => f.textContent).join(' ');
        }
        return _textoProprio;
      },
      set textContent(v) {
        _textoProprio = String(v || '');
      },
      innerHTML: '',
      value: '',
      classList: {
        add: (...c) => c.forEach(x => classes.add(x)),
        remove: (...c) => c.forEach(x => classes.delete(x)),
        toggle: (c, force) => {
          if (force === undefined) {
            if (classes.has(c)) classes.delete(c); else classes.add(c);
          } else if (force) classes.add(c); else classes.delete(c);
        },
        contains: (c) => classes.has(c)
      },
      get className() { return Array.from(classes).join(' '); },
      set className(v) { classes.clear(); (v || '').split(/\s+/).filter(Boolean).forEach(x => classes.add(x)); },
      setAttribute: (k, v) => attrs.set(k, String(v)),
      getAttribute: (k) => attrs.get(k) || null,
      appendChild: (f) => { filhos.push(f); return f; },
      append: (...f) => { f.forEach(x => filhos.push(x)); },
      replaceChildren: (...f) => { filhos.length = 0; if (f.length) f.forEach(x => filhos.push(x)); },
      querySelector: (sel) => null,
      querySelectorAll: (sel) => [],
      addEventListener: (evt, fn) => {},
      focus: () => {},
      blur: () => {},
      get children() { return filhos; },
      get firstChild() { return filhos[0] || null; }
    };
    elementosCriados.push(obj);
    if (id) elementos.set(id, obj);
    return obj;
  }

  // Pre-popula os elementos necessários do DOM
  [
    'busca-remume', 'btn-limpar-busca-remume', 'filtro-remume-categorias',
    'lista-remume-container', 'remume-status', 'prescricao-itens-contagem',
    'prescricao-itens-container', 'prescricao-vazia-aviso',
    'modal-ficha-farmaco', 'ficha-farmaco-loading', 'ficha-farmaco-detalhes',
    'titulo-ficha-farmaco', 'ficha-farmaco-badge-status', 'ficha-dci-status-sus',
    'ficha-nome-farmaco', 'ficha-apresentacoes-bloco', 'ficha-dose-adulto',
    'ficha-dose-pediatria', 'ficha-ajuste-dose', 'ficha-dose-maxima',
    'ficha-preparo-diluicao', 'ficha-cuidados', 'btn-copiar-ficha-farmaco',
    'toast-notificacao', 'toast-mensagem'
  ].forEach(id => criarMockElemento(id));

  let toastMensagens = [];
  let clipboardTexto = '';

  const sandbox = {
    console,
    performance: { now: () => Date.now() },
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    setInterval: () => {},
    clearInterval: () => {},
    lucide: { createIcons: () => {} },
    tailwind: { config: {} },
    window: {
      tailwind: { config: {} },
      lucide: { createIcons: () => {} },
      addEventListener: (evt, fn) => {},
      removeEventListener: (evt, fn) => {},
      sessionStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
      },
      localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
      }
    },
    document: {
      getElementById: (id) => elementos.get(id) || null,
      querySelector: (sel) => null,
      querySelectorAll: (sel) => [],
      createElement: (tag) => criarMockElemento('', tag)
    },
    navigator: {
      clipboard: {
        writeText: async (t) => { clipboardTexto = t; return Promise.resolve(); }
      },
      vibrate: () => true
    },
    hapticFeedback: () => {},
    copiarToast: (msg) => { toastMensagens.push(msg); },
    copiarTextoClipboard: (txt, msg) => { clipboardTexto = txt; toastMensagens.push(msg); },
    isDeviceOffline: () => true,
    carregarSnapshotOffline: async () => null,
    salvarSnapshotOffline: () => {},
    cockpitRpc: async () => ({ ok: true })
  };

  sandbox.window.document = sandbox.document;
  sandbox.window.navigator = sandbox.navigator;
  const ctx = vm.createContext(sandbox);

  vm.runInContext(scriptContent, ctx);

  return { ctx, sandbox, elementos, toastMensagens, getClipboard: () => clipboardTexto };
}

test('Cockpit REMUME & Guia Farmacêutico - Normalização sem acentos e busca multi-token', () => {
  const { ctx } = criarAmbienteSimulacaoCockpit();

  assert.strictEqual(typeof ctx.normalizarBuscaFarmaco, 'function', 'normalizarBuscaFarmaco deve estar definida');
  
  // Testes de remoção de acentos e diacríticos
  assert.strictEqual(ctx.normalizarBuscaFarmaco('Ácido Acetilsalicílico'), 'acido acetilsalicilico');
  assert.strictEqual(ctx.normalizarBuscaFarmaco('Clonidína 0,15mg'), 'clonidina 0 15mg');
  assert.strictEqual(ctx.normalizarBuscaFarmaco('Amoxicilina + Clavulanato'), 'amoxicilina clavulanato');
  assert.strictEqual(ctx.normalizarBuscaFarmaco('Solução Injetável 50%'), 'solucao injetavel 50');
});

test('Cockpit REMUME & Guia Farmacêutico - Busca por Marcas Comerciais consagradas e DCI', () => {
  const { ctx, elementos } = criarAmbienteSimulacaoCockpit();

  // Alimenta remumeDatabase com catálogo representativo da REMUME
  ctx.remumeDatabase = [
    'Dipirona 500 mg',
    'Dipirona 500 mg/mL ap. 2 mL',
    'Paracetamol 500 mg',
    'Metoclopramida 10 mg',
    'Furosemida 40 mg',
    'Butilbrometo de escopolamina 10 mg',
    'Amoxicilina 500 mg',
    'Amoxicilina+clavulanato de potássio 500+125 mg',
    'Metformina 850 mg',
    'Ceftriaxona 1 g fr.ap.',
    'Diclofenaco Sódico 25 mg/mL',
    'Salbutamol 100 mcg',
    'Diazepam 10 mg',
    'Clonazepam 2 mg',
    'Haloperidol 5 mg',
    'Ácido acetilsalicílico 100 mg',
    'Cefalexina 500 mg',
    'Azitromicina 500 mg',
    'Omeprazol 20 mg',
    'Sulfametoxazol + Trimetoprima 400+80 mg'
  ];

  const input = elementos.get('busca-remume');
  const container = elementos.get('lista-remume-container');

  // Teste 1: Buscar por Marca 'novalgina' deve retornar Dipirona
  input.value = 'novalgina';
  ctx.filtrarRemume();
  assert.ok(container.children.length > 0, 'Deve encontrar apresentações de Dipirona ao buscar novalgina');
  assert.ok(container.children.some(c => c.textContent.includes('Dipirona')), 'Card deve conter Dipirona');

  // Teste 2: Buscar por Marca 'plasil' deve retornar Metoclopramida
  input.value = 'plasil';
  ctx.filtrarRemume();
  assert.ok(container.children.length > 0, 'Deve encontrar Metoclopramida ao buscar plasil');
  assert.ok(container.children.some(c => c.textContent.includes('Metoclopramida')));

  // Teste 3: Buscar por Marca 'lasix' deve retornar Furosemida
  input.value = 'lasix';
  ctx.filtrarRemume();
  assert.ok(container.children.length > 0, 'Deve encontrar Furosemida ao buscar lasix');
  assert.ok(container.children.some(c => c.textContent.includes('Furosemida')));

  // Teste 4: Buscar por Marca 'glifage' deve retornar Metformina
  input.value = 'glifage';
  ctx.filtrarRemume();
  assert.ok(container.children.length > 0, 'Deve encontrar Metformina ao buscar glifage');
  assert.ok(container.children.some(c => c.textContent.includes('Metformina')));

  // Teste 5: Buscar por Marca 'rocefin' deve retornar Ceftriaxona
  input.value = 'rocefin';
  ctx.filtrarRemume();
  assert.ok(container.children.length > 0, 'Deve encontrar Ceftriaxona ao buscar rocefin');
  assert.ok(container.children.some(c => c.textContent.includes('Ceftriaxona')));

  // Teste 6: Buscar por Multi-token "amoxi 500" e invertido "500 amoxi"
  input.value = 'amoxi 500';
  ctx.filtrarRemume();
  const countAmoxi1 = container.children.length;
  assert.ok(countAmoxi1 > 0, 'Deve encontrar Amoxicilina 500');

  input.value = '500 amoxi';
  ctx.filtrarRemume();
  const countAmoxi2 = container.children.length;
  assert.strictEqual(countAmoxi1, countAmoxi2, 'Multi-token independente da ordem de palavras');
});

test('Cockpit REMUME & Guia Farmacêutico - Posologias de referência e cópia de 1 toque para PEP', async () => {
  const { ctx, getClipboard, toastMensagens, elementos } = criarAmbienteSimulacaoCockpit();

  assert.strictEqual(typeof ctx.obterPosologiaReferencia, 'function');
  assert.strictEqual(typeof ctx.copiarPosologiaTexto, 'function');

  // Teste de extração posológica para fármacos consagrados
  const posoDipirona = ctx.obterPosologiaReferencia('Dipirona 500 mg');
  assert.ok(posoDipirona.includes('6/6h'), 'Dipirona deve conter frequência de 6/6h');
  assert.ok(posoDipirona.includes('dor ou febre'), 'Dipirona deve conter indicação');

  const posoAmoxi = ctx.obterPosologiaReferencia('Amoxicilina 500 mg');
  assert.ok(posoAmoxi.includes('8/8h'), 'Amoxicilina deve conter intervalo de 8/8h');
  assert.ok(posoAmoxi.includes('7 a 10 dias'), 'Amoxicilina deve indicar duração terapêutica');

  const posoFurosemida = ctx.obterPosologiaReferencia('Furosemida 40 mg');
  assert.ok(posoFurosemida.includes('jejum') || posoFurosemida.includes('manhã'), 'Furosemida matinal');

  // Teste de cópia de posologia com 1 toque
  ctx.copiarPosologiaTexto('Dipirona 500 mg', posoDipirona);
  await new Promise(r => setTimeout(r, 20));
  const clip = getClipboard();
  assert.ok(clip.includes('Dipirona 500 mg'), 'Texto copiado deve incluir nome');
  assert.ok(clip.includes('Posologia:'), 'Texto copiado deve incluir posologia formatada');
  const toastTexto = elementos.get('toast-mensagem')?.textContent || '';
  assert.ok(toastTexto.includes('Posologia copiada') || toastMensagens.some(m => m.includes('Posologia copiada')), 'Toast deve confirmar a cópia');
});

test('Cockpit REMUME & Guia Farmacêutico - Feedback visual quando nenhum medicamento for encontrado', () => {
  const { ctx, elementos } = criarAmbienteSimulacaoCockpit();

  ctx.remumeDatabase = ['Amoxicilina 500 mg', 'Dipirona 500 mg'];
  const input = elementos.get('busca-remume');
  const container = elementos.get('lista-remume-container');

  input.value = 'medicamento_totalmente_inexistente_xyz';
  ctx.filtrarRemume();

  assert.strictEqual(container.children.length, 1, 'Deve exibir exatamente o card de feedback');
  const feedbackCard = container.children[0];
  assert.strictEqual(feedbackCard.getAttribute('role'), 'status', 'Card deve ter role=status acessível');
  assert.ok(feedbackCard.textContent.includes('Nenhum medicamento encontrado'), 'Deve conter aviso claro');
  assert.ok(feedbackCard.textContent.includes('Verifique a grafia'), 'Deve orientar sobre grafia e DCI');
  assert.ok(feedbackCard.textContent.includes('Guia HSL'), 'Deve sugerir Guia HSL caso seja de uso hospitalar');
});

test('Cockpit REMUME & Guia Farmacêutico - Desempenho e resposta em 0ms no cache em memória', () => {
  const { ctx, elementos } = criarAmbienteSimulacaoCockpit();

  // Simula base completa com 256 itens
  const linhasRemume = fs.readFileSync(path.join(ROOT_DIR, 'REMUME_RP.csv'), 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && l !== 'Medicamento');

  ctx.remumeDatabase = linhasRemume;
  const input = elementos.get('busca-remume');

  const t0 = performance.now();
  input.value = 'amoxi';
  ctx.filtrarRemume();
  input.value = 'lasix';
  ctx.filtrarRemume();
  input.value = 'novalgina';
  ctx.filtrarRemume();
  input.value = 'paracetamol';
  ctx.filtrarRemume();
  input.value = 'omeprazol';
  ctx.filtrarRemume();
  const tempoTotal = performance.now() - t0;

  // 5 buscas consecutivas em 256 itens devem rodar com extrema fluidez (< 200ms no sandbox de teste VM)
  assert.ok(tempoTotal < 200, `Buscas locais em RAM devem ser instantâneas (< 200ms no sandbox de teste). Tempo obtido: ${tempoTotal.toFixed(2)}ms`);
});

test('Fastify Runtime - Handshake RPC cockpitConsultarFarmaco com dados oficiais do Guia HSL', () => {
  const runtime = require('../server/runtime');
  assert.strictEqual(typeof runtime.cockpitRpc, 'function', 'runtime.cockpitRpc deve estar disponível');

  // Teste 1: Consulta de medicamento presente no HSL (Amoxicilina)
  const resAmoxi = runtime.cockpitRpc('cockpitConsultarFarmaco', 'bot', [{ termo: 'amoxicilina' }]);
  assert.strictEqual(resAmoxi.sucesso, true, 'Deve retornar sucesso para Amoxicilina');
  assert.strictEqual(resAmoxi.encontrado, true, 'Deve encontrar Amoxicilina');
  assert.ok(resAmoxi.farmaco.toLowerCase().includes('amoxicilina'), 'Nome do fármaco deve conter amoxicilina');
  assert.ok(resAmoxi.dose_adulto.length > 0, 'Deve conter dose adulto oficial');
  assert.ok(resAmoxi.texto_formatado.includes('GUIA FARMACÊUTICO HSL'), 'Deve conter texto oficial formatado');

  // Teste 2: Consulta de medicamento por sinônimo/marca comercial (Rocefin -> Ceftriaxona)
  const resRocefin = runtime.cockpitRpc('cockpitConsultarFarmaco', 'bot', [{ termo: 'rocefin' }]);
  assert.strictEqual(resRocefin.sucesso, true);
  assert.strictEqual(resRocefin.encontrado, true);
  assert.ok(resRocefin.farmaco.toLowerCase().includes('ceftriaxona'));

  // Teste 3: Consulta de medicamento inexistente
  const resInexistente = runtime.cockpitRpc('cockpitConsultarFarmaco', 'bot', [{ termo: 'farmaco_desconhecido_12345' }]);
  assert.strictEqual(resInexistente.sucesso, false);
  assert.strictEqual(resInexistente.encontrado, false);
});
