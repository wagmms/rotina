/**
 * tests/test_cockpit_soap_modais_responsividade.cjs
 * Suíte de testes automatizados para:
 * 1. Sincronização em tempo real do caso SOAP do Telegram com o Cockpit PWA (soapview_).
 * 2. Função cockpitRenderizarSoap e atualização dinâmica de estado.
 * 3. Função abrirModalCalc e fechamento anti-travamento de modais (fecharTodosModais).
 * 4. Persistência de cálculos recentes em memória offline (sessionStorage + localStorage).
 * 5. Responsividade mobile (320px a 420px) e ausência de estouro nos botões de cópia.
 * 6. Paridade absoluta SHA-256 entre cockpit_movel.html e gh_cockpit_deploy/index.html.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const rootDir = path.resolve(__dirname, '..');
const cockpitHtmlPath = path.join(rootDir, 'cockpit_movel.html');
const deployHtmlPath = path.join(rootDir, 'gh_cockpit_deploy', 'index.html');

test('Cockpit Responsividade & SOAP - Paridade estrita SHA-256 de build de produção', () => {
  assert.ok(fs.existsSync(cockpitHtmlPath), 'cockpit_movel.html deve existir');
  assert.ok(fs.existsSync(deployHtmlPath), 'gh_cockpit_deploy/index.html deve existir');

  const hashDev = crypto.createHash('sha256').update(fs.readFileSync(cockpitHtmlPath)).digest('hex');
  const hashDeploy = crypto.createHash('sha256').update(fs.readFileSync(deployHtmlPath)).digest('hex');

  assert.strictEqual(hashDev, hashDeploy, 'cockpit_movel.html e gh_cockpit_deploy/index.html devem ter hash SHA-256 100% idêntico');
});

test('Cockpit Responsividade & SOAP - Presença de classes responsivas flex-wrap nos botões de cópia', () => {
  const html = fs.readFileSync(cockpitHtmlPath, 'utf8');

  // Asma
  assert.ok(html.includes('id="btn-copiar-asma"'), 'Deve conter btn-copiar-asma');
  const matchAsma = html.match(/<div class="([^"]*)">\s*<button id="btn-copiar-asma"/);
  assert.ok(matchAsma && matchAsma[1].includes('flex-wrap'), 'Container de Asma deve conter flex-wrap para evitar estouro em 320px');

  // Gasometria
  assert.ok(html.includes('id="btn-copiar-gaso"'), 'Deve conter btn-copiar-gaso');
  const matchGaso = html.match(/<div class="([^"]*)">\s*<button id="btn-copiar-gaso"/);
  assert.ok(matchGaso && matchGaso[1].includes('flex-wrap'), 'Container de Gasometria deve conter flex-wrap');

  // HEART
  assert.ok(html.includes('id="btn-copiar-heart"'), 'Deve conter btn-copiar-heart');
  const matchHeart = html.match(/<div class="([^"]*)">\s*<button id="btn-copiar-heart"/);
  assert.ok(matchHeart && matchHeart[1].includes('flex-wrap'), 'Container de HEART deve conter flex-wrap');

  // SOAP Ambulatorial
  assert.ok(html.includes('id="btn-copiar-prescricao-amb"'), 'Deve conter btn-copiar-prescricao-amb');
  assert.ok(html.includes('id="btn-copiar-soap-amb"'), 'Deve conter btn-copiar-soap-amb');
  const matchAmb = html.match(/<div class="([^"]*)">\s*<button onclick="copiarPrescricaoAmbulatorialGerada\(\)"/);
  assert.ok(matchAmb && matchAmb[1].includes('flex-wrap'), 'Container de botões de cópia ambulatorial deve conter flex-wrap');
});

test('Cockpit Responsividade & SOAP - Simulação VM de cockpitRenderizarSoap e abrirModalCalc', () => {
  const html = fs.readFileSync(cockpitHtmlPath, 'utf8');
  const scripts = Array.from(html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi));
  assert.ok(scripts.length > 0, 'Scripts inline devem estar presentes no Cockpit');
  const scriptCodigo = scripts.map(m => m[1]).reduce((maior, s) => s.length > maior.length ? s : maior, '');

  const domElements = {};
  function mockEl(id) {
    if (!domElements[id]) {
      domElements[id] = {
        id,
        textContent: '',
        value: '',
        classList: {
          classes: new Set(),
          add: function(...c) { c.forEach(x => this.classes.add(x)); },
          remove: function(...c) { c.forEach(x => this.classes.delete(x)); },
          contains: function(x) { return this.classes.has(x); },
          toggle: function(x, force) {
            if (force !== undefined) {
              if (force) this.classes.add(x); else this.classes.delete(x);
              return force;
            }
            if (this.classes.has(x)) { this.classes.delete(x); return false; }
            this.classes.add(x); return true;
          }
        },
        querySelectorAll: () => [],
        querySelector: () => null,
        scrollIntoView: () => {},
        dataset: {}
      };
    }
    return domElements[id];
  }

  const sessionStore = {};
  const localStore = {};

  const sandbox = {
    console,
    navigator: {
      clipboard: { writeText: async () => {} },
      onLine: true
    },
    location: { protocol: 'https:' },
    window: {
      sessionStorage: {
        getItem: (k) => sessionStore[k] || null,
        setItem: (k, v) => { sessionStore[k] = String(v); },
        removeItem: (k) => { delete sessionStore[k]; }
      },
      localStorage: {
        getItem: (k) => localStore[k] || null,
        setItem: (k, v) => { localStore[k] = String(v); },
        removeItem: (k) => { delete localStore[k]; }
      },
      location: { protocol: 'https:' },
      navigator: {
        clipboard: { writeText: async () => {} },
        onLine: true
      },
      addEventListener: () => {},
      scrollTo: () => {}
    },
    document: {
      getElementById: (id) => mockEl(id),
      querySelectorAll: () => [],
      querySelector: () => null,
      addEventListener: () => {}
    },
    hapticFeedback: () => {},
    copiarToast: () => {},
    isDeviceOffline: () => false,
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    setInterval: () => {},
    clearInterval: () => {},
    Date: Date
  };

  const context = vm.createContext(sandbox);
  vm.runInContext(scriptCodigo, context);

  // 1. Validação de cockpitRenderizarSoap
  assert.equal(typeof context.cockpitRenderizarSoap, 'function', 'cockpitRenderizarSoap deve ser função global');
  const soapEl = mockEl('soap-integral');
  const avisoEl = mockEl('cockpit-status');

  // Teste com string direta
  context.cockpitRenderizarSoap('S: Tosse há 3 dias. O: MVUA. A: IVAS. P: Sintomáticos.');
  assert.ok(soapEl.textContent.includes('S: Tosse há 3 dias'), 'Deve renderizar texto do SOAP');
  assert.ok(avisoEl.textContent.includes('SOAP do atendimento atual'), 'Deve atualizar aviso de status');

  // Teste com objeto do backend
  context.cockpitRenderizarSoap({ soap: 'S: Cefaleia tensional. O: Exame neurológico normal.', casoAtivo: true });
  assert.ok(soapEl.textContent.includes('Cefaleia tensional'), 'Deve suportar objeto com chave soap');

  // Teste com estado vazio
  context.cockpitRenderizarSoap('');
  assert.ok(soapEl.textContent.includes('Nenhum prontuário SOAP') || soapEl.textContent.includes('Nenhum SOAP'), 'Deve exibir empty state amigável');

  // 2. Validação de fecharTodosModais
  assert.equal(typeof context.fecharTodosModais, 'function', 'fecharTodosModais deve ser função');
  context.fecharTodosModais(); // Não deve lançar erro

  // 3. Validação de abrirModalCalc
  assert.equal(typeof context.abrirModalCalc, 'function', 'abrirModalCalc deve ser função global');
  assert.doesNotThrow(() => context.abrirModalCalc('dva'));
  assert.doesNotThrow(() => context.abrirModalCalc('asma'));
  assert.doesNotThrow(() => context.abrirModalCalc('pediatria'));
  assert.doesNotThrow(() => context.abrirModalCalc('calc-heart'));

  // 4. Validação de persistência de cálculos em memória offline
  context.limparHistoricoCalculos();
  assert.equal(context.obterHistoricoCalculos().length, 0);

  context.registrarHistoricoCalculo('dva', { peso: 75, droga: 'nora' }, 'Nora 0.1 mcg/kg/min');
  const hist = context.obterHistoricoCalculos();
  assert.equal(hist.length, 1);
  assert.equal(hist[0].tipo, 'dva');

  // Verifica que salvou em localStorage offline
  assert.ok(localStore['rotina_historico_calculos_v1_offline'], 'Deve persistir cópia no localStorage para resiliência offline');
});

test('Cockpit Responsividade & SOAP - Integração Fastify / Runtime com soapview_ e cockpitConsultar', () => {
  const runtime = require('../server/runtime.js');
  assert.ok(runtime.cockpitRpc, 'cockpitRpc deve estar disponível no runtime');

  // Consulta inicial com sessão 'bot'
  const consulta = runtime.cockpitRpc('cockpitConsultar', 'bot', []);
  assert.ok(consulta && typeof consulta === 'object', 'cockpitConsultar deve retornar objeto');
  assert.ok(Array.isArray(consulta.leitos), 'consulta.leitos deve ser array');
  assert.ok(Array.isArray(consulta.casosDoDia), 'consulta.casosDoDia deve ser array');
  assert.strictEqual(typeof consulta.soap, 'string', 'consulta.soap deve ser string');
});

test('Cockpit Responsividade & SOAP - Modal Ambulatorial com Gaveta de Queixas Frequentes e Ações Cirúrgicas', () => {
  const html = fs.readFileSync(cockpitHtmlPath, 'utf8');

  // 1. Elementos da interface limpa (sem poluição)
  assert.ok(html.includes('id="btn-toggle-queixas-freq"'), 'Deve conter botão toggle de Queixas Frequentes');
  assert.ok(html.includes('id="gaveta-queixas-frequentes"'), 'Deve conter gaveta recolhível de Queixas Frequentes');
  assert.ok(html.includes('id="amb-sv-badge"'), 'Deve conter badge dinâmico de sinais vitais');

  // 2. Os 8 protocolos rápidos da APS
  const tiposEsperados = ['has', 'dm', 'ivas', 'lombalgia', 'dispepsia', 'cefaleia', 'saude_mental', 'checkup'];
  for (const tipo of tiposEsperados) {
    assert.ok(html.includes(`setSoapQueixaRapida('${tipo}')`), `Gaveta deve conter atalho clínico para ${tipo}`);
  }

  // 3. Botões de cópia e exportação cirúrgica
  assert.ok(html.includes('id="btn-copiar-so-amb"'), 'Deve conter botão de copiar Subjetivo + Objetivo (S+O)');
  assert.ok(html.includes('id="btn-atestado-from-soap"'), 'Deve conter botão de transferir para Atestado CFM');
  assert.ok(html.includes('id="btn-sisreg-amb"'), 'Deve conter botão de gerar Guia SISREG');

  // 4. Presença das funções no JavaScript
  assert.ok(html.includes('id="amb-input-diagnostico"'), 'Deve conter input de busca de diagnóstico');
  assert.ok(html.includes('id="amb-lista-sugestoes-cid"'), 'Deve conter dropdown de sugestões de CID');
  assert.ok(html.includes('id="amb-cid-badge-selecionado"'), 'Deve conter badge de CID selecionado');
  assert.ok(html.includes('function alternarGavetaQueixasFrequentes()'), 'Deve definir alternarGavetaQueixasFrequentes');
  assert.ok(html.includes('function atualizarBadgeSinaisVitaisAmbulatorial()'), 'Deve definir atualizarBadgeSinaisVitaisAmbulatorial');
  assert.ok(html.includes('function buscarDiagnosticosAmbulatorial('), 'Deve definir buscarDiagnosticosAmbulatorial');
  assert.ok(html.includes('function selecionarDiagnosticoAmbulatorial('), 'Deve definir selecionarDiagnosticoAmbulatorial');
  assert.ok(html.includes('function copiarSOAPAmbulatorialSO()'), 'Deve definir copiarSOAPAmbulatorialSO');
  assert.ok(html.includes('function transferirParaAtestadoAmbulatorial()'), 'Deve definir transferirParaAtestadoAmbulatorial');
  assert.ok(html.includes('function gerarEncaminhamentoSisregModal()'), 'Deve definir gerarEncaminhamentoSisregModal');
  assert.ok(html.includes('function limparFormularioAmbulatorioSOAP()'), 'Deve definir limparFormularioAmbulatorioSOAP');
  assert.ok(html.includes('function salvarEstadoSoapAmbulatorialLocal()'), 'Deve definir salvarEstadoSoapAmbulatorialLocal');
  assert.ok(html.includes('function restaurarEstadoSoapAmbulatorialLocal()'), 'Deve definir restaurarEstadoSoapAmbulatorialLocal');
});

test('Cockpit Responsividade & SOAP - Filtro Contextual Anti-Poluição de Ações Rápidas na Aba SOAP', () => {
  const html = fs.readFileSync(cockpitHtmlPath, 'utf8');

  // 1. Botão de atalho rápido no header do Copiloto
  assert.ok(html.includes('Consultório APS'), 'Deve conter atalho Consultório APS no header do Copiloto');
  assert.ok(html.includes('abrirModalAmbulatorioSOAP()'), 'Atalho deve invocar abrirModalAmbulatorioSOAP');

  // 2. Filtro de Contexto Clínico Anti-Poluição
  assert.ok(html.includes('id="filtro-acoes-todos"'), 'Deve conter botão de filtro Todos');
  assert.ok(html.includes('id="filtro-acoes-amb"'), 'Deve conter botão de filtro Ambulatório');
  assert.ok(html.includes('id="filtro-acoes-emerg"'), 'Deve conter botão de filtro Emergência');
  assert.ok(html.includes('id="filtro-acoes-materno"'), 'Deve conter botão de filtro Materno');
  assert.ok(html.includes('id="filtro-acoes-pep"'), 'Deve conter botão de filtro PEP');

  // 3. Atributos data-soap-cat nos botões
  assert.ok(html.includes('data-soap-cat="amb"'), 'Botão de SOAP Ambulatorial deve ter tag amb');
  assert.ok(html.includes('data-soap-cat="emerg"'), 'Botões de DVA/SRI devem ter tag emerg');
  assert.ok(html.includes('data-soap-cat="materno amb"'), 'Botão de Pré-natal deve ter tag materno');

  // 4. Funções no JavaScript
  assert.ok(html.includes('function filtrarAcoesRapidasSOAP('), 'Deve definir função filtrarAcoesRapidasSOAP');
  assert.ok(html.includes('function restaurarFiltroAcoesRapidasSOAP('), 'Deve definir função restaurarFiltroAcoesRapidasSOAP');
});
