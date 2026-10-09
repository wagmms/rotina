/**
 * tests/test_cockpit_offline_indexeddb.cjs
 * Testes automatizados para Cache Local Criptografado, IndexedDB, Fila Offline e Telemetria do Cockpit PWA.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== INICIANDO TESTES DO COCKPIT PWA: CACHE CRIPTOGRAFADO, INDEXEDDB E TELEMETRIA ===\n');

// 1. Carrega o cockpit_movel.html e extrai os scripts
const htmlPath = path.resolve(__dirname, '../cockpit_movel.html');
assert(fs.existsSync(htmlPath), 'cockpit_movel.html não encontrado');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Valida tags fundamentais no HTML
console.log('[1] Verificando elementos visuais e de telemetria no HTML...');
assert(htmlContent.includes('id="btn-status-rede"'), 'Botão btn-status-rede presente no cabeçalho');
assert(htmlContent.includes('id="icon-status-rede"'), 'Ícone de telemetria icon-status-rede presente');
assert(htmlContent.includes('id="texto-status-rede"'), 'Texto de status texto-status-rede presente');
assert(htmlContent.includes('id="badge-pendencias-rede"'), 'Badge de pendências presente');
assert(htmlContent.includes('id="modal-plantao-offline"'), 'Modal de plantão offline presente');
assert(htmlContent.includes('id="modal-offline-status-pill"'), 'Pílula de modo modal-offline-status-pill presente');
assert(htmlContent.includes('id="info-protocolos-count"'), 'Contador de protocolos presente');
assert(htmlContent.includes('id="info-calculos-count"'), 'Contador de cálculos presente');
assert(htmlContent.includes('id="info-storage-status"'), 'Status de armazenamento seguro presente');
assert(htmlContent.includes('id="lista-fila-offline"'), 'Lista da fila offline presente');
assert(htmlContent.includes('id="btn-pn-soro"'), 'Botão btn-pn-soro presente no modal de pré-natal');
assert(htmlContent.includes('id="sec-pn-soro"'), 'Painel sec-pn-soro presente no modal de pré-natal');
assert(htmlContent.includes('id="pn-soro-gj"'), 'Input de Glicemia de Jejum presente');
assert(htmlContent.includes('id="pn-box-resultado-soro"'), 'Box de resultado de sorologias presente');
assert(htmlContent.includes('id="calc-pediatria"'), 'Painel calc-pediatria presente no tab-calculadoras');
assert(htmlContent.includes('id="ped-peso"'), 'Input de peso pediátrico ped-peso presente');
assert(htmlContent.includes('id="pediatria-resultado"'), 'Box de resultado pediátrico presente');
assert(htmlContent.includes('id="btn-copiar-dva"'), 'Botão btn-copiar-dva presente');
assert(htmlContent.includes('id="btn-copiar-sri"'), 'Botão btn-copiar-sri presente');
assert(htmlContent.includes('id="btn-copiar-crcl"'), 'Botão btn-copiar-crcl presente');
assert(htmlContent.includes('id="btn-copiar-gaso"'), 'Botão btn-copiar-gaso presente');
console.log('  ✓ Elementos de telemetria, UI, Sorologias, Pediatria e Botões PEP validados com sucesso no DOM.');

// 2. Extrai o bloco de script principal (maior bloco de script inline)
const scripts = Array.from(htmlContent.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi));
assert(scripts.length > 0, 'Nenhum script encontrado no HTML');
const scriptCodigo = scripts.map(m => m[1]).reduce((maior, s) => s.length > maior.length ? s : maior, '');
assert(scriptCodigo.length > 10000, 'Script principal do Cockpit Móvel encontrado e carregado');

// 3. Monta um ambiente de simulação completo (DOM, WebCrypto, LocalStorage, Dexie)
function criarAmbienteSimulacao() {
  const localStorageStore = {};
  const mockLocalStorage = {
    getItem: (k) => localStorageStore[k] || null,
    setItem: (k, v) => { localStorageStore[k] = String(v); },
    removeItem: (k) => { delete localStorageStore[k]; },
    clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); }
  };

  const dexieTables = {
    snapshots: new Map(),
    protocolos: new Map(),
    calculos: new Map(),
    consultas: new Map(),
    syncQueue: new Map()
  };
  let syncQueueSeq = 0;

  function mockTable(nome) {
    return {
      put: async (item) => {
        const key = item.id || item.chave;
        dexieTables[nome].set(key, item);
        return key;
      },
      get: async (key) => dexieTables[nome].get(key) || null,
      add: async (item) => {
        const id = ++syncQueueSeq;
        item.id = id;
        dexieTables[nome].set(id, item);
        return id;
      },
      toArray: async () => Array.from(dexieTables[nome].values()),
      delete: async (id) => dexieTables[nome].delete(id),
      clear: async () => dexieTables[nome].clear(),
      count: async () => dexieTables[nome].size
    };
  }

  class MockDexie {
    constructor(dbName) {
      this.name = dbName;
      this.snapshots = mockTable('snapshots');
      this.protocolos = mockTable('protocolos');
      this.calculos = mockTable('calculos');
      this.consultas = mockTable('consultas');
      this.syncQueue = mockTable('syncQueue');
    }
    version() {
      return { stores: () => this };
    }
  }

  const elementsStore = {};
  function mockElement(id) {
    if (!elementsStore[id]) {
      elementsStore[id] = {
        id,
        textContent: '',
        value: '',
        className: '',
        classList: {
          add(c) { this.classes = this.classes || new Set(); this.classes.add(c); },
          remove(c) { this.classes = this.classes || new Set(); this.classes.delete(c); },
          contains(c) { return (this.classes || new Set()).has(c); },
          toggle(c, v) { if (v) this.add(c); else this.remove(c); }
        },
        setAttribute(k, v) { this[k] = v; },
        removeAttribute(k) { delete this[k]; },
        append() {},
        replaceChildren() {},
        innerHTML: ''
      };
    }
    return elementsStore[id];
  }

  const listeners = {};
  const mockWindow = {
    location: { origin: 'https://ultra-rotina-backend.onrender.com', hostname: 'ultra-rotina-backend.onrender.com', search: '' },
    navigator: { onLine: true, clipboard: { writeText: async () => {} } },
    crypto: {
      getRandomValues(arr) {
        for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
        return arr;
      }
    },
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
      createElement: (tag) => mockElement('elem_' + Math.random())
    },
    navigator: mockWindow.navigator,
    localStorage: mockLocalStorage,
    Dexie: MockDexie,
    setTimeout: (fn) => setTimeout(fn, 0),
    setInterval: () => {},
    clearTimeout: () => {},
    clearInterval: () => {},
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    TextEncoder: require('util').TextEncoder,
    TextDecoder: require('util').TextDecoder,
    console: console
  };

  vm.createContext(sandbox);
  return { sandbox, localStorageStore, dexieTables, mockWindow };
}

// 4. Execução dos testes unitários
(async () => {
  const { sandbox, localStorageStore, dexieTables, mockWindow } = criarAmbienteSimulacao();

  // Executa o script no sandbox
  vm.runInContext(scriptCodigo, sandbox);

  console.log('\n[2] Testando Subsistema CockpitCrypto (Criptografia em Repouso)...');
  const w = sandbox.window || sandbox;
  const CockpitCrypto = w.CockpitCrypto || sandbox.CockpitCrypto;
  assert(CockpitCrypto, 'CockpitCrypto inicializado');

  const dadoOriginal = { leito: '4', paciente: 'Paciente Teste UTI', fr: 18, sat: 97, drogas: ['Noradrenalina'] };
  const cifrado = await CockpitCrypto.encriptar(dadoOriginal);
  assert(typeof cifrado === 'string', 'Retorno de encriptação é string');
  assert(cifrado.startsWith('enc:'), 'String cifrada possui prefixo de integridade enc:');
  assert(!cifrado.includes('Paciente Teste UTI'), 'Dado sensível em texto plano não aparece no ciphertext');

  const decifrado = await CockpitCrypto.decriptar(cifrado);
  assert.deepEqual(decifrado, dadoOriginal, 'Decriptação recupera exatamente os dados clínicos originais');
  console.log('  ✓ Encriptação e decriptação simétrica com integridade confirmada.');

  // Teste de retrocompatibilidade com dados planos legados
  const dadoLegado = { leito: '1', status: 'estavel' };
  const decifradoLegado = await CockpitCrypto.decriptar(JSON.stringify(dadoLegado));
  assert.deepEqual(decifradoLegado, dadoLegado, 'Dados legados não cifrados são recuperados sem quebra');
  console.log('  ✓ Suporte a dados legados não cifrados validado com sucesso.');

  console.log('\n[3] Testando Persistência Criptografada no IndexedDB...');
  // Snapshot
  await w.salvarSnapshotOffline('leitos_dados', { leitos: [{ numero: '10', status: 'estavel' }] });
  const snapLido = await w.carregarSnapshotOffline('leitos_dados');
  assert(snapLido && snapLido.dados && snapLido.dados.leitos[0].numero === '10', 'Snapshot recuperado com dados corretos');
  console.log('  ✓ Snapshots de leitos persistidos e recuperados com criptografia.');

  // Protocolo
  await w.salvarProtocoloOffline('cad', { titulo: 'Cetoacidose Diabética', metaGlicemica: '150-200' }, 'endocrino');
  const protoLido = await w.carregarProtocoloOffline('cad');
  assert(protoLido && protoLido.titulo === 'Cetoacidose Diabética', 'Protocolo clínico recuperado com sucesso');
  console.log('  ✓ Protocolos clínicos persistidos e lidos do cache seguro.');

  // Cálculos memorizados
  const entradaCalc = { peso: 70, droga: 'nora' };
  const resCalc = { taxa: '0.1 mcg/kg/min', vazao: '6.5 mL/h', textoFormatado: 'Noradrenalina 6.5 mL/h' };
  await w.salvarCalculoOffline('dva', entradaCalc, resCalc);
  const calcLido = await w.carregarCalculoOffline('dva', entradaCalc);
  assert(calcLido && calcLido.vazao === '6.5 mL/h', 'Cálculo clínico memorizado recuperado com 0ms de latência');
  console.log('  ✓ Cache de cálculos memorizados com busca determinística validado.');

  // Consultas
  await w.salvarConsultaOffline('perfil_dados', { peso_atual: 73.8, bf: 12.2 });
  const perfilLido = await w.carregarConsultaOffline('perfil_dados');
  assert(perfilLido && perfilLido.peso_atual === 73.8, 'Consulta de perfil recuperada com sucesso');
  console.log('  ✓ Consultas de perfil e atendimentos gravadas e lidas com segurança.');

  console.log('\n[4] Testando Fila Offline Resiliente (Offline Action Queue)...');
  await w.limparFilaOffline();
  let fila = await w.obterFilaOffline();
  assert.strictEqual(fila.length, 0, 'Fila inicia vazia após limpeza');

  // Enfileira duas mutações
  await w.enfileirarAcaoOffline('cockpitStatusLeito', ['3', 1, 'vigilancia'], 'Leito 3: Em vigilância');
  await w.enfileirarAcaoOffline('cockpitRegistrarPeso', ['73.5', '12.0', null], 'Pesagem: 73.5 kg');

  fila = await w.obterFilaOffline();
  assert.strictEqual(fila.length, 2, 'Dois itens gravados na fila');
  assert(fila[0].payload.startsWith('enc:'), 'Payload dos argumentos na fila está criptografado');

  // Decripta os argumentos da fila
  const argsLeito = await CockpitCrypto.decriptar(fila[0].payload);
  assert.deepEqual(argsLeito, ['3', 1, 'vigilancia'], 'Argumentos recuperados intactos da fila');

  // Remove um item
  await w.removerItemFilaOffline(fila[0].id);
  fila = await w.obterFilaOffline();
  assert.strictEqual(fila.length, 1, 'Item removido após processamento');
  assert(fila[0].descricao.includes('Pesagem'), 'Item remanescente correto mantido');
  console.log('  ✓ Fila Offline Resiliente armazena, protege e consome itens ordenadamente.');

  console.log('\n[5] Testando Telemetria Visual em Tempo Real...');
  // Cenário 1: Conectado à Nuvem (Render)
  w.setForcedOfflineState(false);
  mockWindow.navigator.onLine = true;
  mockWindow.location.origin = 'https://ultra-rotina-backend.onrender.com';
  let modo = w.detectarModoConexao();
  assert.strictEqual(modo, 'NUVEM', 'Modo Nuvem detectado para endpoint oficial Render');

  // Cenário 2: Conectado a Nó Local (localhost / IP da rede)
  sandbox.localStorage.setItem('cockpit_backend_url', 'http://192.168.1.100:3000');
  modo = w.detectarModoConexao();
  assert.strictEqual(modo, 'NO_LOCAL', 'Modo Nó Local detectado para IP privado hospitalar/LAN');

  sandbox.localStorage.setItem('cockpit_backend_url', 'http://localhost:3000');
  modo = w.detectarModoConexao();
  assert.strictEqual(modo, 'NO_LOCAL', 'Modo Nó Local detectado para localhost');

  // Cenário 3: Offline Seguro (Modo Plantão Forçado ou sem sinal)
  w.setForcedOfflineState(true);
  modo = w.detectarModoConexao();
  assert.strictEqual(modo, 'OFFLINE_SEGURO', 'Modo Offline Seguro detectado quando modo plantão forçado ativado');

  w.setForcedOfflineState(false);
  mockWindow.navigator.onLine = false;
  modo = w.detectarModoConexao();
  assert.strictEqual(modo, 'OFFLINE_SEGURO', 'Modo Offline Seguro detectado quando navigator.onLine é false');

  // Testa atualização de elementos da UI
  await w.atualizarIndicadorRede();
  const txtRede = sandbox.document.getElementById('texto-status-rede');
  assert(txtRede.textContent.includes('Offline'), 'Texto no header reflete modo Offline Seguro em tempo real');
  // Testa motor de cálculo offline de sorologias de pré-natal
  console.log('\n[6] Testando motor offline determinístico de sorologias de pré-natal...');
  const fnInterpretarSoro = sandbox.interpretarSorologiasOfflineLocal || w.interpretarSorologiasOfflineLocal;
  assert(typeof fnInterpretarSoro === 'function', 'interpretarSorologiasOfflineLocal disponível');
  const resSoroOffline = fnInterpretarSoro({
    glicemiaJejum: 98,
    semanasGestacao: 12,
    toxoIgg: 'reagente',
    toxoIgm: 'nao_reagente',
    vdrl: 'nao_reagente',
    hb: 10.2
  });
  assert(resSoroOffline && resSoroOffline.sucesso, 'Interpretação offline de sorologias executada com sucesso');
  assert(resSoroOffline.textoFormatado.includes('DIABETES MELLITUS GESTACIONAL'), 'DMG detectado em glicemia 98 mg/dL');
  assert(resSoroOffline.textoFormatado.includes('Imunidade Pregressa'), 'Toxoplasmose IgG+ IgM- interpretada como imunidade');
  assert(resSoroOffline.textoFormatado.includes('ANEMIA GESTACIONAL LEVE A MODERADA'), 'Hemoglobina 10.2 g/dL identificada como anemia gestacional');

  const fnCalcOffline = sandbox.calcularOfflineLocal || w.calcularOfflineLocal;
  assert(typeof fnCalcOffline === 'function', 'calcularOfflineLocal disponível');
  const resCalcSoro = fnCalcOffline('sorologias_prenatal', {
    glicemiaJejum: 94
  });
  assert(resCalcSoro.includes('DIABETES MELLITUS GESTACIONAL'), 'calcularOfflineLocal suporta sorologias_prenatal determinísticamente');
  console.log('  ✓ Motor offline de sorologias e exames de pré-natal validado com 100% de sucesso.');

  console.log('\n[7] Testando motor offline determinístico de Pediatria (Holliday-Segar, PALS e Posologia)...');
  // 7.1 Holliday-Segar Padrão
  const resHS = fnCalcOffline('pediatria', { peso: 12, modo: 'holliday', condicaoClinica: 'manutencao_padrao' });
  assert(resHS && resHS.includes('HIDRATAÇÃO HOLLIDAY-SEGAR'), 'Holliday-Segar executado offline');
  assert(resHS.includes('1100 mL/dia'), 'Volume 12kg calculado corretamente: 1000 + 2*50 = 1100 mL');
  assert(resHS.includes('45.8 mL/h'), 'Vazão 1100/24 calculada corretamente');
  assert(resHS.includes('Sódio'), 'Eletrólitos SBP presentes');

  // 7.2 Bronquiolite (70%)
  const resBronq = fnCalcOffline('pediatria', { peso: 10, modo: 'holliday', condicaoClinica: 'restricao_bronquiolite' });
  assert(resBronq.includes('700 mL/dia'), 'Restrição 70% na bronquiolite para 10kg (1000 * 0.7 = 700 mL)');

  // 7.3 PALS (Adrenalina, Amiodarona, Choque)
  const resPals = fnCalcOffline('pediatria', { peso: 15, modo: 'pals' });
  assert(resPals.includes('PALS · REANIMAÇÃO PEDIÁTRICA'), 'PALS executado offline');
  assert(resPals.includes('Adrenalina 1:10.000'), 'Adrenalina presente no PALS');
  assert(resPals.includes('0.15 mg (1.5 mL)'), 'Dose de Adrenalina 0.01mg/kg para 15kg');
  assert(resPals.includes('30 Joules'), '1º choque 2 J/kg para 15kg');
  assert(resPals.includes('60 Joules'), '2º choque 4 J/kg para 15kg');

  // 7.4 Posologia Sintomáticos e Amoxicilina
  const resDipi = fnCalcOffline('pediatria', { peso: 18, modo: 'posologia', farmaco: 'dipirona' });
  assert(resDipi.includes('18 gotas'), 'Dipirona 1 gota/kg calculada para 18kg');

  const resAmoxi = fnCalcOffline('pediatria', { peso: 15, modo: 'posologia', farmaco: 'amoxicilina' });
  assert(resAmoxi.includes('AMOXICILINA 250mg/5mL'), 'Amoxicilina calculada');
  assert(resAmoxi.includes('5.0 mL VO de 8 em 8 horas'), 'Amoxicilina 50mg/kg/dia para 15kg = 750mg = 15mL/dia = 5mL 8/8h');
  console.log('  ✓ Motor offline de Pediatria (Holliday-Segar, PALS e Posologia) validado com 100% de sucesso.');

  console.log('\n[8] Testando motor offline determinístico de Emergência (DVA e SRI Avançada)...');
  // 8.1 DVA - Adrenalina
  const resAdrena = fnCalcOffline('dva', { peso: 70, droga: 'adrena' });
  assert(resAdrena.includes('ADRENALINA'), 'Adrenalina calculada offline');
  assert(resAdrena.includes('13.1 mL/h'), 'Dose inicial de adrenalina para 70kg ((0.05 * 70 * 60)/16 = 13.125 -> 13.1)');
  assert(resAdrena.includes('Choque Séptico refratário'), 'Alerta clínico de indicação presente');

  // 8.2 DVA - Tridil / Nitroglicerina
  const resTridil = fnCalcOffline('dva', { peso: 70, droga: 'tridil' });
  assert(resTridil.includes('NITROGLICERINA / TRIDIL'), 'Tridil calculado offline');
  assert(resTridil.includes('1,5 mL/h'), 'Vazão inicial 5 mcg/min de Tridil');
  assert(resTridil.includes('Infarto de VD'), 'Contraindicação formal presente');

  // 8.3 DVA - Nipride / Nitroprussiato
  const resNipride = fnCalcOffline('dva', { peso: 80, droga: 'nipride' });
  assert(resNipride.includes('NITROPRUSSIATO DE SÓDIO / NIPRIDE'), 'Nipride calculado offline');
  assert(resNipride.includes('7.2 mL/h'), 'Vazão inicial 0.3 mcg/kg/min para 80kg ((0.3 * 80 * 60)/200 = 7.2)');
  assert(resNipride.includes('Emergência Hipertensiva'), 'Indicação clínica de crise HAS presente');

  // 8.4 SRI - Neurointensivismo / TCE / HIC
  const resSriNeuro = fnCalcOffline('sri', { peso: 70, cenario: 'neuro' });
  assert(resSriNeuro.includes('NEUROINTENSIVISMO / TCE / HIC'), 'SRI cenário neuro executado offline');
  assert(resSriNeuro.includes('Fentanil 210 mcg'), 'Fentanil 3 mcg/kg para 70kg (210 mcg)');
  assert(resSriNeuro.includes('ETOMIDATO 21.0 mg'), 'Etomidato 0.3 mg/kg para 70kg (21.0 mg)');
  assert(resSriNeuro.includes('ROCURÔNIO 84 mg'), 'Rocurônio 1.2 mg/kg para 70kg (84 mg)');
  assert(resSriNeuro.includes('PAS > 100-110 mmHg'), 'Alvo hemodinâmico de neuroproteção presente');
  console.log('  ✓ Motor offline de DVA (Adrenalina, Tridil, Nipride) e SRI (Neuro/TCE) validado com 100% de sucesso.');

  console.log('\n🚀 TODOS OS TESTES DE CACHE CRIPTOGRAFADO, INDEXEDDB E TELEMETRIA PASSARAM COM SUCESSO!\n');
})().catch(err => {
  console.error('❌ FALHA NOS TESTES DO COCKPIT OFFLINE:', err);
  process.exit(1);
});
