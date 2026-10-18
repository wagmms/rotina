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
assert(htmlContent.includes('id="calc-atb"'), 'Painel calc-atb presente');
assert(htmlContent.includes('id="atb-droga"'), 'Seletor atb-droga presente');
assert(htmlContent.includes('id="atb-clcr"'), 'Input atb-clcr presente');
assert(htmlContent.includes('id="btn-copiar-atb"'), 'Botão btn-copiar-atb presente');
assert(htmlContent.includes('id="btn-migrar-crcl-atb"'), 'Botão de migração ClCr para ATB presente');
assert(htmlContent.includes("adicionarKitPrescricao('atb_pac')"), 'Kit empírico PAC presente');
assert(htmlContent.includes("adicionarKitPrescricao('atb_itu')"), 'Kit empírico ITU presente');
assert(htmlContent.includes('id="amb-input-queixa"'), 'Input de queixa do SOAP ambulatorial presente');
assert(htmlContent.includes("onclick=\"setAtestadoDias(3)\""), 'Atalho de dias de atestado presente');
assert(htmlContent.includes("onclick=\"setAtestadoCid("), 'Atalhos de CIDs presentes');
assert(htmlContent.includes('id="calc-dhe"'), 'Painel calc-dhe presente');
assert(htmlContent.includes('id="btn-copiar-dhe"'), 'Botão btn-copiar-dhe presente');
assert(htmlContent.includes('id="dhe-na-atual"'), 'Input dhe-na-atual presente');
assert(htmlContent.includes('id="dhe-k-atual"'), 'Input dhe-k-atual presente');
assert(htmlContent.includes('id="calc-heart"'), 'Painel calc-heart presente');
assert(htmlContent.includes('id="btn-copiar-heart"'), 'Botão btn-copiar-heart presente');
assert(htmlContent.includes('id="heart-historia"'), 'Select heart-historia presente');
assert(htmlContent.includes('id="heart-ecg"'), 'Select heart-ecg presente');
assert(htmlContent.includes('id="heart-troponina"'), 'Select heart-troponina presente');
console.log('  ✓ Elementos de telemetria, UI, Sorologias, Pediatria, Ajuste ATB, DHE, HEART/SCA, SOAP e Atestado CFM validados com sucesso no DOM.');

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
    location: { origin: 'https://rotina-tt8n.onrender.com', hostname: 'rotina-tt8n.onrender.com', search: '' },
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
  mockWindow.location.origin = 'https://rotina-tt8n.onrender.com';
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

  console.log('\n[9] Testando motor offline determinístico de SOAP Ambulatorial e Atestado Médico CFM...');
  const fnSoapOffline = sandbox.gerarSOAPAmbulatorialOfflineLocal || w.gerarSOAPAmbulatorialOfflineLocal;
  assert(typeof fnSoapOffline === 'function', 'gerarSOAPAmbulatorialOfflineLocal disponível');

  // 9.1 SOAP Ambulatorial - Hipertensão Arterial
  const resSoapHas = fnSoapOffline({
    pacienteNome: 'João Silva',
    queixaPrincipal: 'Acompanhamento de HAS',
    modeloExameFisico: 'has_rotina',
    sinaisVitais: { pa: '145/95', fc: '76', glicemia: '92', peso: '78' }
  });
  assert(resSoapHas && resSoapHas.sucesso, 'SOAP offline gerado com sucesso');
  assert(resSoapHas.soap.textoProntuario.includes('Hipertensão Estágio 1'), 'Classificação SBC da PA correta: 145/95 é Estágio 1');
  assert(resSoapHas.soap.textoProntuario.includes('Losartana Potássica 50 mg'), 'Prescrição REMUME de 1ª linha presente');
  assert(resSoapHas.soap.textoProntuario.includes('Dieta DASH'), 'Orientações MEV presentes');
  assert(resSoapHas.soap.textoProntuario.includes('Sinais de Alarme'), 'Sinais de alarme para PS presentes');

  // 9.2 SOAP Ambulatorial - Diabetes Mellitus com Alerta
  const resSoapDm = fnSoapOffline({
    pacienteNome: 'Maria Santos',
    queixaPrincipal: 'Consulta de rotina DM2',
    modeloExameFisico: 'dm_rotina',
    sinaisVitais: { pa: '128/82', fc: '72', glicemia: '210', peso: '68' }
  });
  assert(resSoapDm.soap.textoProntuario.includes('Hiperglicemia Acentuada'), 'Detecção SBD de glicemia >= 200 mg/dL');
  assert(resSoapDm.soap.textoProntuario.includes('Metformina 850 mg'), 'Prescrição de Metformina presente');
  assert(resSoapDm.soap.textoProntuario.includes('monofilamento 10g'), 'Exame dos pés e sensibilidade presentes');

  // 9.3 Atestado CFM - com inclusão expressa de CID e dias por extenso
  const fnAtestadoOffline = sandbox.gerarAtestadoOfflineLocal || w.gerarAtestadoOfflineLocal;
  assert(typeof fnAtestadoOffline === 'function', 'gerarAtestadoOfflineLocal disponível');

  const resAtestadoComCid = fnAtestadoOffline({
    pacienteNome: 'Carlos Eduardo',
    pacienteDoc: '12.345.678-9',
    dias: 3,
    cid: 'M54.5 - Lombalgia Aguda',
    incluirCid: true
  });
  assert(resAtestadoComCid && resAtestadoComCid.sucesso, 'Atestado gerado com sucesso');
  assert(resAtestadoComCid.textoAtestado.includes('3 (três) dia(s)'), 'Dias convertidos por extenso: 3 -> três');
  assert(resAtestadoComCid.textoAtestado.includes('Diagnóstico / CID-10: M54.5'), 'CID-10 incluído quando solicitado');
  assert(resAtestadoComCid.textoAtestado.includes('Resoluções CFM nº 1.658/2002 e nº 1.851/2008'), 'Conformidade legal CFM explícita');

  // 9.4 Atestado CFM - sem inclusão de CID (sigilo médico preservado)
  const resAtestadoSemCid = fnAtestadoOffline({
    pacienteNome: 'Ana Paula',
    pacienteDoc: '98.765.432-1',
    dias: 5,
    cid: 'G44.2 - Cefaleia',
    incluirCid: false
  });
  assert(resAtestadoSemCid.textoAtestado.includes('5 (cinco) dia(s)'), 'Dias convertidos por extenso: 5 -> cinco');
  assert(resAtestadoSemCid.textoAtestado.includes('Diagnóstico omitido nos termos do sigilo médico'), 'Sigilo médico preservado conforme Art. 5º');
  assert(!resAtestadoSemCid.textoAtestado.includes('Diagnóstico / CID-10: G44.2'), 'CID não vazou quando desmarcado');

  console.log('  ✓ Motor offline de SOAP Ambulatorial e Atestado Médico CFM validado com 100% de sucesso.');

  console.log('\n[10] Testando motor offline determinístico de Ajuste Renal de Antimicrobianos e Cross-Check Local...');
  // 10.1 Meropenem ClCr 30
  const resMero30 = fnCalcOffline('ajuste_atb', { droga: 'meropenem', clcr: 30 });
  assert(resMero30.includes('Meropenem'), 'Meropenem presente');
  assert(resMero30.includes('1g EV a cada 12h'), 'Dose de Meropenem para ClCr 30 mL/min (1g 12/12h)');

  // 10.2 Vancomicina em Hemodiálise
  const resVancoHd = fnCalcOffline('ajuste_atb', { droga: 'vancomicina', hemodialise: true });
  assert(resVancoHd.includes('Vancomicina'), 'Vancomicina presente');
  assert(resVancoHd.includes('pós-hemodiálise'), 'Orientação de dose pós-HD presente');
  assert(resVancoHd.includes('homem vermelho'), 'Alerta de infusão lenta presente');

  // 10.3 Cefepime com Alerta de Neurotoxicidade
  const resCefepime = fnCalcOffline('ajuste_atb', { droga: 'cefepime', clcr: 20 });
  assert(resCefepime.includes('Cefepime'), 'Cefepime presente');
  assert(resCefepime.includes('ENCEFALOPATIA POR CEFEPIME'), 'Alerta crítico de neurotoxicidade/encefalopatia presente');

  // 10.4 Ceftriaxona sem necessidade de redução
  const resCeftriax = fnCalcOffline('ajuste_atb', { droga: 'ceftriaxona', clcr: 10 });
  assert(resCeftriax.includes('NÃO REQUER AJUSTE RENAL'), 'Ceftriaxona sem necessidade de ajuste');
  assert(resCeftriax.includes('Ringer Lactato'), 'Alerta de incompatibilidade com cálcio presente');

  // 10.5 Cross-Check Farmacológico de Contingência Offline
  const fnCrossCheckOffline = sandbox.executarCrossCheckOfflineLocal || w.executarCrossCheckOfflineLocal;
  assert(typeof fnCrossCheckOffline === 'function', 'executarCrossCheckOfflineLocal disponível');

  // Teste Amiodarona + Fluconazol (QTc crítico)
  const ccQtc = fnCrossCheckOffline('amiodarona 200mg e fluconazol 150mg');
  assert(ccQtc.temAlertasCriticos, 'Detecção de alerta crítico em Amiodarona + Fluconazol');
  assert(ccQtc.textoFormatado.includes('Torsades de Pointes'), 'Alerta específico de Torsades emitido');

  // Teste Clopidogrel + Omeprazol (CYP2C19)
  const ccClopi = fnCrossCheckOffline('clopidogrel 75mg e omeprazol 20mg');
  assert(ccClopi.interacoes.length > 0, 'Detecção de interação moderada/grave Clopidogrel + Omeprazol');
  assert(ccClopi.textoFormatado.includes('Pantoprazol'), 'Recomendação de Pantoprazol presente');

  // Teste Ceftriaxona + Ringer Lactato (Incompatibilidade Y-Site)
  const ccYsite = fnCrossCheckOffline('ceftriaxona 1g IV e ringer lactato');
  assert(ccYsite.temAlertasCriticos, 'Detecção de incompatibilidade fatal Ceftriaxona + Ringer');
  assert(ccYsite.textoFormatado.includes('INCOMPATIBILIDADE FATAL NO Y-SITE'), 'Alerta fatal de Y-site emitido');

  console.log('  ✓ Motor offline de Ajuste Renal de Antimicrobianos e Cross-Check Farmacológico validado com 100% de sucesso.');

  console.log('\n[11] Testando motor offline determinístico de Distúrbios Hidroeletrolíticos (DHE - Sódio, Potássio e Água Livre)...');
  // 11.1 Hiponatremia: Adrogué-Madias com NaCl 3%
  const resHipo = fnCalcOffline('dhe', { modo: 'hiponatremia', naAtual: 118, peso: 70, sexo: 'm', idade: 50, salina: 3 });
  assert(resHipo.includes('CORREÇÃO DE HIPONATREMIA'), 'Título de Hiponatremia presente');
  assert(resHipo.includes('NaCl 3% (513 mEq/L)'), 'Solução NaCl 3% indicada');
  assert(resHipo.includes('Taxa Segura de Infusão'), 'Taxa segura de infusão calculada');
  assert(resHipo.includes('Teto 8 mEq'), 'Teto de 8 mEq em 24h indicado');
  assert(resHipo.includes('MIELINÓLISE PONTINA'), 'Alerta contra mielinólise pontina presente');

  // 11.2 Hiponatremia Gravíssima (< 105 mEq/L)
  const resHipoGrave = fnCalcOffline('dhe', { modo: 'hiponatremia', naAtual: 102, peso: 70 });
  assert(resHipoGrave.includes('HIPONATREMIA GRAVÍSSIMA'), 'Alerta de hiponatremia gravíssima acionado');
  assert(resHipoGrave.includes('Bolus de Emergência'), 'Bolus de emergência de NaCl 3% indicado');

  // 11.3 Hipercalemia Grave (K+ 6.8 com ECG alterado)
  const resHiperK = fnCalcOffline('dhe', { modo: 'hipercalemia', kAtual: 6.8, ecgAlterado: true });
  assert(resHiperK.includes('MANEJO EMERGENCIAL DE HIPERCALEMIA'), 'Título de Hipercalemia presente');
  assert(resHiperK.includes('Gluconato de Cálcio 10%'), 'Gluconato de Cálcio para estabilização de membrana indicado');
  assert(resHiperK.includes('Glicoinsulina'), 'Solução polarizante/glicoinsulina indicada');
  assert(resHiperK.includes('Sorcal'), 'Resina de troca/Sorcal indicada');
  assert(resHiperK.includes('ALERTA CARDÍACO'), 'Alerta cardíaco presente');

  // 11.4 Hipercalemia Extrema (K+ 8.4 com PCR iminente)
  const resHiperKExtrema = fnCalcOffline('dhe', { modo: 'hipercalemia', kAtual: 8.4 });
  assert(resHiperKExtrema.includes('ALERTA VERMELHO MÁXIMO'), 'Alerta vermelho máximo emitido para K+ > 8.0');
  assert(resHiperKExtrema.includes('EMERGÊNCIA ZERO'), 'Emergência zero ativada');
  assert(resHiperKExtrema.includes('HEMODIÁLISE'), 'Hemodiálise de emergência acionada');

  // 11.5 Hipernatremia: Déficit de Água Livre
  const resHiperNa = fnCalcOffline('dhe', { modo: 'hipernatremia', naAtual: 160, peso: 70, sexo: 'm', idade: 60 });
  assert(resHiperNa.includes('DÉFICIT DE ÁGUA LIVRE'), 'Déficit de água livre presente');
  assert(resHiperNa.includes('Déficit Total de Água Livre'), 'Déficit em litros calculado');
  assert(resHiperNa.includes('Repor 50% do déficit'), 'Programação de 50% em 24h presente');
  assert(resHiperNa.includes('edema cerebral'), 'Alerta de edema cerebral presente');

  console.log('  ✓ Motor offline de Distúrbios Hidroeletrolíticos (DHE - Sódio, Potássio e Água Livre) validado com 100% de sucesso.');

  console.log('\n[12] Testando motor offline determinístico de Gasometria Arterial 5 Passos (Winter, Ânion Gap & Berlim)...');
  // 12.1 Gasometria Normal
  const resGasoNormal = fnCalcOffline('gaso', { ph: 7.40, pco2: 40, hco3: 24, na: 140, cl: 104, alb: 4.0, pao2: 95, fio2: 21 });
  assert(resGasoNormal.includes('GASOMETRIA ARTERIAL'), 'Título presente');
  assert(resGasoNormal.includes('Gasometria Normal') || resGasoNormal.includes('Sem distúrbio'), 'Identificação de gaso normal');
  assert(resGasoNormal.includes('Ânion Gap Sérico: 12 mEq/L'), 'AG sérico 140 - (104 + 24) = 12');
  assert(resGasoNormal.includes('Oxigenação Normal'), 'PaO2/FiO2 normal (> 300)');

  // 12.2 Cetoacidose / Acidose Metabólica AG Elevado (CAD)
  const resGasoCad = fnCalcOffline('gaso', { ph: 7.15, pco2: 20, hco3: 7, na: 135, cl: 98, alb: 4.0 });
  assert(resGasoCad.includes('Acidose Metabólica'), 'Acidose metabólica primária identificada');
  assert(resGasoCad.includes('Winter'), 'Fórmula de Winter presente');
  assert(resGasoCad.includes('Compensação respiratória adequada'), 'Winter 1.5*7+8 = 18.5 +-2 (16.5 a 20.5), medido 20');
  assert(resGasoCad.includes('ÂNION GAP ELEVADO'), 'Ânion gap elevado (> 12 mEq/L)');
  assert(resGasoCad.includes('30 mEq/L'), 'AG sérico 135 - (98 + 7) = 30');
  assert(resGasoCad.includes('Razão delta'), 'Razão delta calculada');
  assert(resGasoCad.includes('Acidose de Ânion Gap elevado pura'), 'Razão delta (30-12)/(24-7) = 18/17 = 1.06 (0.8-2.0: pura)');

  // 12.3 Distúrbio Misto: Acidose Metabólica + Acidose Respiratória (Winter falho)
  const resGasoMista = fnCalcOffline('gaso', { ph: 7.10, pco2: 32, hco3: 10 });
  assert(resGasoMista.includes('ACIDOSE RESPIRATÓRIA ASSOCIADA'), 'Detecção de acidose respiratória associada por Winter');

  // 12.4 DPOC Retentor / Alcalose Metabólica + Acidose Respiratória com pH normal
  const resGasoDpoc = fnCalcOffline('gaso', { ph: 7.36, pco2: 58, hco3: 33 });
  assert(resGasoDpoc.includes('pH: 7.36') && resGasoDpoc.includes('pCO2: 58'), 'Valores de DPOC refletidos');
  assert(resGasoDpoc.includes('Distúrbio Misto com pH normal') || resGasoDpoc.includes('Acidose Respiratória'), 'Classificação correta com pH normal');

  // 12.5 Acidose Respiratória Aguda/Crônica com Acidemia
  const resGasoResp = fnCalcOffline('gaso', { ph: 7.28, pco2: 60, hco3: 28 });
  assert(resGasoResp.includes('Acidose Respiratória Primária'), 'Acidose respiratória primária identificada');
  assert(resGasoResp.includes('Compatível com acidose respiratória pura'), 'Compensação renal adequada identificada');

  // 12.5 SDRA e Oxigenação de Berlim (PaO2/FiO2)
  const resGasoSdra = fnCalcOffline('gaso', { ph: 7.24, pco2: 28, hco3: 12, pao2: 65, fio2: 50 });
  assert(resGasoSdra.includes('PaO2/FiO2: 130 mmHg'), 'Relação PaO2/FiO2 65 / 0.5 = 130 mmHg');
  assert(resGasoSdra.includes('SDRA Moderada (Berlim: 101–200)'), 'Classificação de Berlim correta');
  assert(resGasoSdra.includes('Critérios de Berlim'), 'Alerta clínico de Berlim presente');

  // 12.6 Acidemia Extrema (pH < 6.80) e Bicarbonato Esgotado (HCO3 <= 5)
  const resGasoExtrema = fnCalcOffline('gaso', { ph: 6.75, pco2: 18, hco3: 4 });
  assert(resGasoExtrema.includes('ACIDEMIA EXTREMA (pH < 6.80)'), 'Alerta crítico de acidemia extrema emitido');
  assert(resGasoExtrema.includes('BICARBONATO EXTREMAMENTE CONSUMIDO'), 'Alerta de reserva tampão consumida emitido');

  console.log('  ✓ Motor offline de Gasometria Arterial 5 Passos (Winter, Ânion Gap & Berlim) validado com 100% de sucesso.');

  console.log('\n[13] Testando motor offline determinístico de Escore HEART, Dor Torácica (SCA) e DAPT...');
  // 13.1 Baixo Risco (HEART 0 pts)
  const resHeartBaixo = fnCalcOffline('heart', { historia: 0, ecg: 0, idade: 38, fr: 0, troponina: 0 });
  assert(resHeartBaixo.includes('ESCORE HEART'), 'Título presente');
  assert(resHeartBaixo.includes('HEART Score: 0 pontos'), 'Pontuação 0 calculada');
  assert(resHeartBaixo.includes('BAIXO RISCO'), 'Classificação de Baixo Risco');
  assert(resHeartBaixo.includes('0.9% a 1.7%'), 'Taxa de MACE de Baixo Risco');
  assert(resHeartBaixo.includes('alta precoce'), 'Conduta de alta precoce indicada');

  // 13.2 Risco Intermediário (HEART 4 pts)
  const resHeartInter = fnCalcOffline('heart', { historia: 1, ecg: 1, idade: 56, fr: 1, troponina: 0 });
  assert(resHeartInter.includes('HEART Score: 4 pontos'), 'Pontuação 4 calculada');
  assert(resHeartInter.includes('RISCO INTERMEDIÁRIO'), 'Classificação de Risco Intermediário');
  assert(resHeartInter.includes('Internação hospitalar'), 'Conduta de internação/observação indicada');

  // 13.3 Alto Risco (HEART 10 pts) com Ticagrelor e Enoxaparina
  const resHeartAlto = fnCalcOffline('heart', { historia: 2, ecg: 2, idade: 68, fr: 2, troponina: 2 });
  assert(resHeartAlto.includes('HEART Score: 10 pontos'), 'Pontuação 10 calculada');
  assert(resHeartAlto.includes('ALTO RISCO'), 'Classificação de Alto Risco');
  assert(resHeartAlto.includes('UCO/UTI'), 'Indicação de UCO/UTI');
  assert(resHeartAlto.includes('Cateterismo cardíaco'), 'Indicação de cateterismo precoce');
  assert(resHeartAlto.includes('Ticagrelor (1ª Linha)'), 'Ticagrelor de 1ª linha');
  assert(resHeartAlto.includes('Atorvastatina: 80 mg'), 'Atorvastatina 80 mg indicada');

  // 13.4 Bloqueio Sentinela de Prasugrel por AVC prévio
  const resHeartAvc = fnCalcOffline('heart', { historia: 2, ecg: 2, idade: 65, fr: 2, troponina: 1, avcPrevio: true });
  assert(resHeartAvc.includes('BLOQUEIO SENTINELA DE PRASUGREL'), 'Alerta de bloqueio de Prasugrel por AVC emitido');
  assert(resHeartAvc.includes('TRITON-TIMI 38'), 'Referência ao ensaio TRITON-TIMI 38');
  assert(resHeartAvc.includes('Ticagrelor: Ataque 180 mg'), 'Ticagrelor prescrito como alternativa segura');

  // 13.5 Regra de Trombólise em Idoso (> 75 anos): Omissão de Ataque de Clopidogrel
  const resHeartTrombo = fnCalcOffline('heart', { historia: 2, ecg: 2, idade: 78, fr: 2, troponina: 2, trombolise: true });
  assert(resHeartTrombo.includes('SEM DOSE DE ATAQUE'), 'Omissão de dose de ataque de Clopidogrel');
  assert(resHeartTrombo.includes('REGRA DE SEGURANÇA EM TROMBÓLISE'), 'Alerta de trombólise > 75 anos emitido');

  // 13.6 Bloqueio Fatal de Nitratos em IAM-VD ou Sildenafil
  const resHeartVd = fnCalcOffline('heart', { historia: 2, ecg: 2, idade: 60, fr: 2, troponina: 2, iamVd: true });
  assert(resHeartVd.includes('BLOQUEIO FATAL DE NITRATOS'), 'Alerta de contraindicação fatal de nitratos emitido');
  assert(resHeartVd.includes('choque refratário por queda súbita de pré-carga'), 'Mecanismo hemodinâmico alertado');

  // 13.7 Interação CYP2C19 (Clopidogrel + Omeprazol)
  const resHeartOmeprazol = fnCalcOffline('heart', { historia: 2, ecg: 2, idade: 65, fr: 2, troponina: 1, trombolise: true, usoOmeprazol: true });
  assert(resHeartOmeprazol.includes('INTERAÇÃO CYP2C19'), 'Detecção de interação CYP2C19');
  assert(resHeartOmeprazol.includes('Pantoprazol'), 'Recomendação de Pantoprazol presente');

  console.log('  ✓ Motor offline de Escore HEART, Dor Torácica (SCA) e DAPT validado com 100% de sucesso.');

  console.log('\n🚀 TODOS OS TESTES DE CACHE CRIPTOGRAFADO, INDEXEDDB E TELEMETRIA PASSARAM COM SUCESSO!\n');
})().catch(err => {
  console.error('❌ FALHA NOS TESTES DO COCKPIT OFFLINE:', err);
  process.exit(1);
});
