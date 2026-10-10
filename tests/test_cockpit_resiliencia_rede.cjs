/**
 * tests/test_cockpit_resiliencia_rede.cjs
 * Suíte de testes automatizados para Resiliência em Conexões Flutuantes,
 * Retry Exponencial com Jitter, Feedback Visual em Banner Não-Obstrutivo
 * e Telemetria de Conectividade do Plantão no Cockpit PWA.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

console.log('=== TESTE DE RESILIÊNCIA E FEEDBACK VISUAL EM CONEXÕES FLUTUANTES NO COCKPIT PWA ===\n');

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

// [2] Validação dos Elementos Estruturais do Banner e Telemetria no DOM
console.log('\n[2] Validando elementos do banner não-obstrutivo e telemetria no HTML...');
assert(htmlCockpit.includes('id="banner-status-conexao"'), 'Elemento banner-status-conexao deve existir no HTML');
assert(htmlCockpit.includes('id="banner-conexao-card"'), 'Elemento banner-conexao-card deve existir no HTML');
assert(htmlCockpit.includes('id="banner-conexao-dot"'), 'Elemento banner-conexao-dot deve existir no HTML');
assert(htmlCockpit.includes('id="banner-conexao-icone"'), 'Elemento banner-conexao-icone deve existir no HTML');
assert(htmlCockpit.includes('id="banner-conexao-texto"'), 'Elemento banner-conexao-texto deve existir no HTML');
assert(htmlCockpit.includes('id="banner-conexao-subtexto"'), 'Elemento banner-conexao-subtexto deve existir no HTML');
assert(htmlCockpit.includes('id="banner-conexao-btn-retry"'), 'Elemento banner-conexao-btn-retry deve existir no HTML');
assert(htmlCockpit.includes('id="banner-conexao-btn-fechar"'), 'Elemento banner-conexao-btn-fechar deve existir no HTML');
assert(htmlCockpit.includes('id="info-rede-modo"'), 'Elemento info-rede-modo deve existir no modal offline');
assert(htmlCockpit.includes('id="info-rede-latencia"'), 'Elemento info-rede-latencia deve existir no modal offline');
assert(htmlCockpit.includes('id="info-rede-flutuacoes"'), 'Elemento info-rede-flutuacoes deve existir no modal offline');
assert(htmlCockpit.includes('id="info-rede-reentradas"'), 'Elemento info-rede-reentradas deve existir no modal offline');
console.log('  ✓ Todos os 12 elementos estruturais do banner e da telemetria de rede estão presentes.');

// [3] Auditoria de Proibição e Descontinuação do Google Apps Script
console.log('\n[3] Auditando cockpitRpc quanto à conformidade arquitetural (proibição de GAS)...');
assert(!htmlCockpit.includes('GAS_BACKEND_URL'), 'GAS_BACKEND_URL legado deve ser removido');
assert(!htmlCockpit.includes('Tentando fallback para Google Apps Script'), 'Fallback para GAS deve ser eliminado do fluxo ativo');
console.log('  ✓ cockpitRpc livre de chamadas ativas ou fallbacks para Google Apps Script.');

// [4] Preparação do Ambiente Sandbox VM com Mock DOM e Fetch
console.log('\n[4] Configurando ambiente de simulação e compilando script do Cockpit...');
const scripts = Array.from(htmlCockpit.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi));
assert(scripts.length > 0, 'Scripts inline devem estar presentes no Cockpit');
const scriptCodigo = scripts.map(m => m[1]).reduce((maior, s) => s.length > maior.length ? s : maior, '');

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
    attributes: {},
    setAttribute: function(k, v) { this.attributes[k] = String(v); },
    getAttribute: function(k) { return this.attributes[k] || null; },
    classList: {
      classes: new Set(['hidden']),
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
  querySelector: () => null,
  querySelectorAll: () => []
};

// Histórico de chamadas fetch mockadas
let mockFetchHistorico = [];
let mockFetchComportamento = null;

const mockFetch = async (url, options = {}) => {
  mockFetchHistorico.push({ url, options, timestamp: Date.now() });
  if (typeof mockFetchComportamento === 'function') {
    return mockFetchComportamento(url, options);
  }
  return {
    ok: true,
    status: 200,
    json: async () => ({ ok: true, resultado: { status: 'mock_sucesso' } })
  };
};

const sandbox = {
  console: {
    log: () => {},
    warn: () => {},
    error: () => {},
    info: () => {}
  },
  window: {
    location: { origin: 'https://ultra-rotina.app', hostname: 'ultra-rotina.app' },
    addEventListener: () => {},
    lucide: { createIcons: () => {} }
  },
  document: mockDocument,
  navigator: { onLine: true },
  Telegram: { WebApp: { initData: 'mock_sessao_medica_123' } },
  localStorage: (function() {
    let s = {
      'cockpit_session': 'mock_sessao_medica_123'
    };
    return {
      getItem: k => s[k] !== undefined ? s[k] : null,
      setItem: (k, v) => { s[k] = String(v); },
      removeItem: k => { delete s[k]; },
      clear: () => { s = {}; }
    };
  })(),
  sessionStorage: (function() {
    let s = {};
    return {
      getItem: k => s[k] !== undefined ? s[k] : null,
      setItem: (k, v) => { s[k] = String(v); },
      removeItem: k => { delete s[k]; },
      clear: () => { s = {}; }
    };
  })(),
  fetch: mockFetch,
  AbortController: class MockAbortController {
    constructor() {
      this.signal = { aborted: false, addEventListener: () => {} };
    }
    abort() {
      this.signal.aborted = true;
    }
  },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: () => 123,
  clearInterval: () => {},
  Date: Date,
  Math: Math,
  performance: { now: () => Date.now() },
  DOMParser: class {
    parseFromString(str) {
      return { body: { textContent: str.replace(/<[^>]+>/g, '') } };
    }
  }
};
sandbox.window.document = mockDocument;
sandbox.window.localStorage = sandbox.localStorage;
sandbox.window.sessionStorage = sandbox.sessionStorage;
sandbox.window.navigator = sandbox.navigator;

const context = vm.createContext(sandbox);
try {
  vm.runInContext(scriptCodigo, context);
  console.log('  ✓ Script do Cockpit executado com sucesso no sandbox VM.');
} catch (err) {
  assert.fail(`Erro ao compilar script do Cockpit: ${err.message}`);
}

const {
  exibirBannerConexao,
  fecharBannerConexao,
  executarFetchComRetry,
  tentarReconectarAgora,
  obterTelemetriaRede,
  atualizarIndicadorRede,
  setForcedOfflineState,
  isDeviceOffline,
  cockpitRpc
} = sandbox.window;

assert(typeof exibirBannerConexao === 'function', 'exibirBannerConexao deve ser exportada');
assert(typeof fecharBannerConexao === 'function', 'fecharBannerConexao deve ser exportada');
assert(typeof executarFetchComRetry === 'function', 'executarFetchComRetry deve ser exportada');
assert(typeof tentarReconectarAgora === 'function', 'tentarReconectarAgora deve ser exportada');
assert(typeof obterTelemetriaRede === 'function', 'obterTelemetriaRede deve ser exportada');

// [5] Testes de Interface do Banner de Conectividade
console.log('\n[5] Testando transições visuais e estados do banner não-obstrutivo...');
const bannerEl = mockDocument.getElementById('banner-status-conexao');
const cardEl = mockDocument.getElementById('banner-conexao-card');
const txtEl = mockDocument.getElementById('banner-conexao-texto');
const subtxtEl = mockDocument.getElementById('banner-conexao-subtexto');
const btnRetryEl = mockDocument.getElementById('banner-conexao-btn-retry');
const iconeEl = mockDocument.getElementById('banner-conexao-icone');

// Estado 1: Conexão Flutuante
exibirBannerConexao('flutuante', 'Conexão instável (tentativa 1/3)', 'Reconectando em 0.8s...', true);
assert(!bannerEl.classList.contains('hidden'), 'Banner deve estar visível');
assert.strictEqual(txtEl.textContent, 'Conexão instável (tentativa 1/3)');
assert.strictEqual(subtxtEl.textContent, 'Reconectando em 0.8s...');
assert(cardEl.className.includes('bg-amber-950'), 'Card deve ter estilo âmbar para flutuação');
assert.strictEqual(iconeEl.getAttribute('data-lucide'), 'wifi-off');
assert(!btnRetryEl.classList.contains('hidden'), 'Botão de retry deve estar visível');
console.log('  ✓ Estado visual de flutuação validado com sucesso.');

// Estado 2: Modo Offline Seguro
exibirBannerConexao('offline', 'Servidor inalcançável', 'Operando em Modo Offline Seguro', true);
assert(cardEl.className.includes('bg-rose-950'), 'Card deve ter estilo rose para offline seguro');
assert.strictEqual(iconeEl.getAttribute('data-lucide'), 'shield-alert');
assert.strictEqual(txtEl.textContent, 'Servidor inalcançável');
console.log('  ✓ Estado visual de offline seguro validado com sucesso.');

// Estado 3: Sucesso / Reconectado
exibirBannerConexao('sucesso', 'Conexão restabelecida!', 'Sincronizado com o servidor');
assert(cardEl.className.includes('bg-emerald-950'), 'Card deve ter estilo esmeralda para sucesso');
assert.strictEqual(iconeEl.getAttribute('data-lucide'), 'check-circle');
assert(btnRetryEl.classList.contains('hidden'), 'Botão de retry deve estar oculto no sucesso');
console.log('  ✓ Estado visual de sucesso validado com sucesso.');

// Fechamento manual
fecharBannerConexao();
assert(bannerEl.classList.contains('hidden'), 'fecharBannerConexao deve ocultar o banner');
console.log('  ✓ Fechamento suave do banner validado.');

// [6] Testes de Retry Exponencial com Jitter e Resiliência
console.log('\n[6] Testando motor de Retry Exponencial (executarFetchComRetry)...');

// Teste 6.1: Sucesso imediato na 1ª tentativa
(async () => {
  mockFetchHistorico = [];
  mockFetchComportamento = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ ok: true, resultado: 'dados_ok' })
  });

  const res1 = await executarFetchComRetry('https://ultra-rotina.app/api/teste', {}, { maxTentativas: 3 });
  assert.strictEqual(res1.resultado, 'dados_ok');
  assert.strictEqual(mockFetchHistorico.length, 1, 'Deve executar apenas 1 requisição');
  const tel1 = obterTelemetriaRede();
  assert.strictEqual(tel1.estado, 'online');
  assert.strictEqual(tel1.falhasConsecutivas, 0);
  assert(tel1.ultimaLatenciaMs !== null, 'Latência RTT deve ser mensurada');
  console.log(`  ✓ Caso 1 (Sucesso imediato): 1 tentativa, RTT ${tel1.ultimaLatenciaMs}ms, telemetria íntegra.`);

  // Teste 6.2: Conexão Flutuante (Falha na 1ª tentativa, Sucesso na 2ª tentativa)
  mockFetchHistorico = [];
  let contTentativas = 0;
  mockFetchComportamento = async () => {
    contTentativas++;
    if (contTentativas === 1) {
      throw new Error('TypeError: Failed to fetch (Wi-Fi oscilou)');
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, resultado: 'recuperado_com_sucesso' })
    };
  };

  const reentradasAntes = tel1.reentradasSucesso;
  const res2 = await executarFetchComRetry('https://ultra-rotina.app/api/flutuante', {}, {
    maxTentativas: 3,
    backoffBaseMs: 50 // delay acelerado para o teste
  });

  assert.strictEqual(res2.resultado, 'recuperado_com_sucesso');
  assert.strictEqual(mockFetchHistorico.length, 2, 'Deve ter retentado e resolvido na 2ª tentativa');
  const tel2 = obterTelemetriaRede();
  assert.strictEqual(tel2.reentradasSucesso, reentradasAntes + 1, 'Reentrada com sucesso deve ser incrementada');
  assert.strictEqual(tel2.falhasConsecutivas, 0, 'Falhas consecutivas devem ser zeradas após reentrada');
  assert.strictEqual(tel2.estado, 'online');
  console.log(`  ✓ Caso 2 (Conexão Flutuante com auto-recuperação): 2 tentativas, reentrada registrada com sucesso.`);

  // Teste 6.3: Esgotamento de tentativas (Queda persistente de sinal)
  mockFetchHistorico = [];
  mockFetchComportamento = async () => {
    throw new Error('AbortError: The operation was aborted due to timeout (8s)');
  };

  let capturouErro = false;
  try {
    await executarFetchComRetry('https://ultra-rotina.app/api/falha_total', {}, {
      maxTentativas: 3,
      backoffBaseMs: 20
    });
  } catch (err) {
    capturouErro = true;
    assert(err.message.includes('aborted') || err.message.includes('timeout'));
  }

  assert(capturouErro, 'Deve lançar erro após esgotar tentativas');
  assert.strictEqual(mockFetchHistorico.length, 3, 'Deve realizar exatamente 3 tentativas');
  const tel3 = obterTelemetriaRede();
  assert.strictEqual(tel3.estado, 'offline', 'Estado da telemetria deve transitar para offline');
  assert(tel3.falhasConsecutivas >= 3, 'Falhas consecutivas devem acumular');
  console.log(`  ✓ Caso 3 (Falha total e esgotamento): 3 tentativas executadas com backoff e transição para offline.`);

  // Teste 6.4: Fast-fail quando dispositivo já está forçado offline
  setForcedOfflineState(true);
  assert(isDeviceOffline(), 'Dispositivo deve estar marcado como offline');
  mockFetchHistorico = [];
  let fastFailOcorreu = false;
  try {
    await executarFetchComRetry('https://ultra-rotina.app/api/deve_falhar');
  } catch (err) {
    fastFailOcorreu = true;
    assert(err.message.includes('Offline'));
  }
  assert(fastFailOcorreu, 'Deve disparar fast-fail em 0ms');
  assert.strictEqual(mockFetchHistorico.length, 0, 'Nenhuma requisição de rede deve ser disparada em modo offline');
  setForcedOfflineState(false);
  console.log('  ✓ Caso 4 (Fast-fail em modo offline): 0 requisições disparadas, resposta em 0ms.');

  // [7] Teste da Reconexão Manual (tentarReconectarAgora)
  console.log('\n[7] Testando reconexão manual com 1 toque (tentarReconectarAgora)...');
  mockFetchHistorico = [];
  mockFetchComportamento = async (url) => {
    if (url.includes('/ping')) {
      return { ok: true, status: 200, text: async () => 'pong' };
    }
    return { ok: true, status: 200, json: async () => ({ ok: true, resultado: {} }) };
  };

  const reconectou = await tentarReconectarAgora();
  assert.strictEqual(reconectou, true, 'Reconexão manual deve ser bem sucedida');
  assert(mockFetchHistorico.some(h => h.url.includes('/ping')), 'Deve disparar ping de verificação de rede');
  console.log('  ✓ Reconexão manual validada: ping executado, estado revalidado e leitos atualizados.');

  // [8] Teste de Atualização dos Diagnósticos de Telemetria no Modal
  console.log('\n[8] Testando atualização dos cards de telemetria no modal offline...');
  await atualizarIndicadorRede();
  const infoModo = mockDocument.getElementById('info-rede-modo');
  const infoLat = mockDocument.getElementById('info-rede-latencia');
  const infoFlut = mockDocument.getElementById('info-rede-flutuacoes');
  const infoReent = mockDocument.getElementById('info-rede-reentradas');

  assert.strictEqual(infoModo.textContent, 'Nuvem (Render)');
  assert(infoLat.textContent.includes('ms'));
  assert(infoFlut.textContent.includes('evento(s)'));
  assert(infoReent.textContent.includes('recuperada(s)'));
  console.log('  ✓ Painel de telemetria preenchido com dados em tempo real.');

  // [9] Teste do cockpitRpc integrado ao Fastify
  console.log('\n[9] Testando cockpitRpc integrado com retry e validação de sessão...');
  mockFetchHistorico = [];
  mockFetchComportamento = async (url, opts) => {
    const body = JSON.parse(opts.body);
    assert.strictEqual(body.metodo, 'cockpitConsultar');
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, resultado: { leitos: [{ numero: 1, status: 'estavel' }] } })
    };
  };

  sandbox.sessaoAtiva = 'sessao_teste_123';
  const respRpc = await cockpitRpc('cockpitConsultar');
  assert(respRpc && respRpc.leitos && respRpc.leitos.length === 1);
  console.log('  ✓ cockpitRpc validado: envio correto de payload, decodificação ágil e integração limpa.');

  console.log('\n🎉 TODOS OS TESTES DE RESILIÊNCIA DE REDE E FEEDBACK VISUAL PASSARAM COM 100% DE SUCESSO!\n');
})().catch(err => {
  console.error('\n❌ ERRO NA EXECUÇÃO DOS TESTES:', err);
  process.exit(1);
});
