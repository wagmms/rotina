/**
 * ==============================================================================
 * SUÍTE DE TESTES: AUDITORIA DE ACESSIBILIDADE E TECLADOS NUMÉRICOS NAS
 * CALCULADORAS DE NEFROLOGIA E HIDRATAÇÃO VENOSA NO COCKPIT PWA
 * ==============================================================================
 * Valida labels semânticos (for=...), teclados táteis (inputmode="decimal"/"numeric"),
 * validação fisiológica local em 0ms com suporte a aliases (altura, potássio, sódio,
 * creatinina, clcr), cálculo determinístico offline com peso ajustado (IMC >= 30) e
 * paridade estrita com o backend oficial Fastify no Render.
 * ==============================================================================
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const COCKPIT_PATH = path.resolve(__dirname, '../cockpit_movel.html');
const GHPAGES_PATH = path.resolve(__dirname, '../gh_cockpit_deploy/index.html');
const VALIDATORS_PATH = path.resolve(__dirname, '../server/validators.js');

const htmlCockpit = fs.readFileSync(COCKPIT_PATH, 'utf-8');
const htmlGhPages = fs.readFileSync(GHPAGES_PATH, 'utf-8');

// Extrai o script principal da aplicação
const scripts = Array.from(htmlCockpit.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi));
const scriptCodigoPrincipal = scripts.map(m => m[1]).reduce((maior, s) => s.length > maior.length ? s : maior, '');

function criarSandboxCockpit() {
  const sandbox = {
    tailwind: { config: {} },
    window: {
      sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      location: { protocol: 'https:' },
      addEventListener: () => {}
    },
    navigator: { serviceWorker: { register: () => {} }, clipboard: { writeText: async () => {} } },
    document: {
      getElementById: (id) => ({ id, value: '', textContent: '', classList: { add: () => {}, remove: () => {}, toggle: () => {} } }),
      querySelector: () => ({ value: 'm' }),
      querySelectorAll: () => []
    },
    hapticFeedback: () => {},
    copiarToast: () => {},
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    setInterval: () => {},
    clearInterval: () => {},
    Date: Date,
    isDeviceOffline: () => true
  };
  vm.createContext(sandbox);
  vm.runInContext(scriptCodigoPrincipal, sandbox);
  return sandbox;
}

test('Cockpit Nefrologia & Hidratação - Paridade estrita SHA-256 de build de produção', () => {
  const hashDev = crypto.createHash('sha256').update(htmlCockpit).digest('hex');
  const hashProd = crypto.createHash('sha256').update(htmlGhPages).digest('hex');
  assert.strictEqual(hashDev, hashProd, 'cockpit_movel.html e gh_cockpit_deploy/index.html devem ter SHA-256 idêntico');
});

test('Cockpit Nefrologia & Hidratação - Proibição absoluta de Google Apps Script (GAS)', () => {
  assert(!htmlCockpit.includes('google.script.run'), 'Proibido google.script.run no Cockpit');
  assert(!htmlCockpit.includes('clasp'), 'Proibido clasp no Cockpit');
  assert(!htmlCockpit.includes('GAS_BACKEND_URL'), 'Proibido GAS_BACKEND_URL no Cockpit');
});

test('Cockpit Nefrologia & Hidratação - Semântica acessível, labels (for=...) e inputmode nos painéis', () => {
  // 1. Clearance de Creatinina (#calc-crcl)
  assert(htmlCockpit.includes('id="calc-crcl"'), 'Painel calc-crcl deve existir');
  assert(htmlCockpit.includes('id="titulo-calc-crcl"'), 'Título calc-crcl deve ter id semântico');
  assert(htmlCockpit.includes('for="cr-idade"'), 'Label for="cr-idade" deve existir');
  assert(htmlCockpit.includes('for="cr-peso"'), 'Label for="cr-peso" deve existir');
  assert(htmlCockpit.includes('for="cr-altura"'), 'Label for="cr-altura" deve existir');
  assert(htmlCockpit.includes('for="cr-val"'), 'Label for="cr-val" deve existir');
  assert(htmlCockpit.includes('for="cr-sexo-m"'), 'Label for="cr-sexo-m" deve existir');
  assert(htmlCockpit.includes('for="cr-sexo-f"'), 'Label for="cr-sexo-f" deve existir');
  assert(htmlCockpit.includes('id="cr-idade"') && htmlCockpit.includes('inputmode="numeric"'), 'cr-idade deve ter inputmode="numeric"');
  assert(htmlCockpit.includes('id="cr-peso"') && htmlCockpit.includes('inputmode="decimal"'), 'cr-peso deve ter inputmode="decimal"');
  assert(htmlCockpit.includes('id="cr-altura"') && htmlCockpit.includes('inputmode="decimal"'), 'cr-altura deve ter inputmode="decimal"');
  assert(htmlCockpit.includes('id="cr-val"') && htmlCockpit.includes('inputmode="decimal"'), 'cr-val deve ter inputmode="decimal"');
  assert(htmlCockpit.includes('id="crcl-resultado"') && htmlCockpit.includes('role="status" aria-live="polite"'), 'crcl-resultado deve ter role="status" e aria-live="polite"');

  // 2. Ajuste Renal de Antimicrobianos (#calc-atb)
  assert(htmlCockpit.includes('id="calc-atb"'), 'Painel calc-atb deve existir');
  assert(htmlCockpit.includes('for="atb-droga"'), 'Label for="atb-droga" deve existir');
  assert(htmlCockpit.includes('for="atb-clcr"'), 'Label for="atb-clcr" deve existir');
  assert(htmlCockpit.includes('for="atb-hd"'), 'Label for="atb-hd" deve existir');
  assert(htmlCockpit.includes('id="atb-clcr"') && htmlCockpit.includes('inputmode="decimal"'), 'atb-clcr deve ter inputmode="decimal"');
  assert(htmlCockpit.includes('id="atb-resultado"') && htmlCockpit.includes('role="status" aria-live="polite"'), 'atb-resultado deve ter role="status" e aria-live="polite"');

  // 3. Distúrbios Hidroeletrolíticos (#calc-dhe)
  assert(htmlCockpit.includes('id="calc-dhe"'), 'Painel calc-dhe deve existir');
  assert(htmlCockpit.includes('for="dhe-modulo"'), 'Label for="dhe-modulo" deve existir');
  assert(htmlCockpit.includes('for="dhe-peso"'), 'Label for="dhe-peso" deve existir');
  assert(htmlCockpit.includes('for="dhe-na-atual"'), 'Label for="dhe-na-atual" deve existir');
  assert(htmlCockpit.includes('for="dhe-salina"'), 'Label for="dhe-salina" deve existir');
  assert(htmlCockpit.includes('for="dhe-idade"'), 'Label for="dhe-idade" deve existir');
  assert(htmlCockpit.includes('for="dhe-sexo"'), 'Label for="dhe-sexo" deve existir');
  assert(htmlCockpit.includes('for="dhe-k-atual"'), 'Label for="dhe-k-atual" deve existir');
  assert(htmlCockpit.includes('for="dhe-ecg-alt"'), 'Label for="dhe-ecg-alt" deve existir');
  assert(htmlCockpit.includes('for="dhe-na-hiper"'), 'Label for="dhe-na-hiper" deve existir');
  assert(htmlCockpit.includes('for="dhe-hiper-idade"'), 'Label for="dhe-hiper-idade" deve existir');
  assert(htmlCockpit.includes('for="dhe-hiper-sexo"'), 'Label for="dhe-hiper-sexo" deve existir');
  assert(htmlCockpit.includes('id="dhe-peso"') && htmlCockpit.includes('inputmode="decimal"'), 'dhe-peso deve ter inputmode="decimal"');
  assert(htmlCockpit.includes('id="dhe-k-atual"') && htmlCockpit.includes('inputmode="decimal"'), 'dhe-k-atual deve ter inputmode="decimal"');
  assert(htmlCockpit.includes('id="dhe-na-atual"') && htmlCockpit.includes('inputmode="decimal"'), 'dhe-na-atual deve ter inputmode="decimal"');
  assert(htmlCockpit.includes('id="dhe-na-hiper"') && htmlCockpit.includes('inputmode="decimal"'), 'dhe-na-hiper deve ter inputmode="decimal"');
  assert(htmlCockpit.includes('id="dhe-resultado"') && htmlCockpit.includes('role="status" aria-live="polite"'), 'dhe-resultado deve ter role="status" e aria-live="polite"');

  // 4. Hidratação Pediátrica Holliday-Segar (#calc-pediatria)
  assert(htmlCockpit.includes('id="calc-pediatria"'), 'Painel calc-pediatria deve existir');
  assert(htmlCockpit.includes('for="ped-peso"'), 'Label for="ped-peso" deve existir');
  assert(htmlCockpit.includes('for="ped-modulo"'), 'Label for="ped-modulo" deve existir');
  assert(htmlCockpit.includes('for="ped-condicao"'), 'Label for="ped-condicao" deve existir');
  assert(htmlCockpit.includes('for="ped-droga"'), 'Label for="ped-droga" deve existir');
  assert(htmlCockpit.includes('id="ped-peso"') && htmlCockpit.includes('inputmode="decimal"'), 'ped-peso deve ter inputmode="decimal"');
  assert(htmlCockpit.includes('id="pediatria-resultado"') && htmlCockpit.includes('role="status" aria-live="polite"'), 'pediatria-resultado deve ter role="status" e aria-live="polite"');
});

test('Cockpit Nefrologia & Hidratação - Validação fisiológica em 0ms (validarEntradaFisiologica) com Aliases', () => {
  const sandbox = criarSandboxCockpit();
  assert.strictEqual(typeof sandbox.validarEntradaFisiologica, 'function', 'validarEntradaFisiologica deve estar definida');

  // Testes de limites fisiológicos de Creatinina
  const erroCrAlta = sandbox.validarEntradaFisiologica('crcl', { creatinina: 35.0 });
  assert(erroCrAlta && erroCrAlta.includes('Creatinina') && erroCrAlta.includes('fora da faixa biológica'), 'Deve detectar Cr > 30 mg/dL');

  const erroCrBaixa = sandbox.validarEntradaFisiologica('crcl', { creatinina: 0.05 });
  assert(erroCrBaixa && erroCrBaixa.includes('Creatinina'), 'Deve detectar Cr < 0.1 mg/dL');

  const okCr = sandbox.validarEntradaFisiologica('crcl', { creatinina: 1.2, idade: 65, peso: 70, altura: 175 });
  assert.strictEqual(okCr, null, 'Cr legítima não deve gerar alerta');

  // Testes de Altura (suporte a cm e metros)
  const erroAltAlta = sandbox.validarEntradaFisiologica('crcl', { altura: 290 });
  assert(erroAltAlta && erroAltAlta.includes('Altura'), 'Deve detectar Altura > 250 cm');

  const erroAltBaixa = sandbox.validarEntradaFisiologica('crcl', { altura: 20 });
  assert(erroAltBaixa && erroAltBaixa.includes('Altura'), 'Deve detectar Altura < 30 cm');

  const okAltMetro = sandbox.validarEntradaFisiologica('crcl', { altura: 1.75 });
  assert.strictEqual(okAltMetro, null, 'Altura em metros (1.75m) deve ser convertida para 175cm e aceita sem erro');

  // Testes de Potássio com Aliases (kAtual, potassio, k)
  const erroKAtual = sandbox.validarEntradaFisiologica('dhe', { kAtual: 14.5 });
  assert(erroKAtual && erroKAtual.includes('Potássio') && erroKAtual.includes('fora da faixa'), 'Deve capturar kAtual > 10.0 mEq/L');

  const erroKBaixo = sandbox.validarEntradaFisiologica('dhe', { k: 0.5 });
  assert(erroKBaixo && erroKBaixo.includes('Potássio'), 'Deve capturar K < 1.0 mEq/L');

  const okK = sandbox.validarEntradaFisiologica('dhe', { kAtual: 6.8, peso: 70 });
  assert.strictEqual(okK, null, 'K+ sérico 6.8 mEq/L deve ser aceito');

  // Testes de Sódio com Aliases (naAtual, sodio, na)
  const erroNaAlto = sandbox.validarEntradaFisiologica('dhe', { naAtual: 195 });
  assert(erroNaAlto && erroNaAlto.includes('Sódio') && erroNaAlto.includes('fora da faixa'), 'Deve capturar naAtual > 180 mEq/L');

  const erroNaBaixo = sandbox.validarEntradaFisiologica('dhe', { sodio: 80 });
  assert(erroNaBaixo && erroNaBaixo.includes('Sódio'), 'Deve capturar Na < 90 mEq/L');

  const okNa = sandbox.validarEntradaFisiologica('dhe', { naAtual: 118, peso: 70, idade: 50 });
  assert.strictEqual(okNa, null, 'Na+ sérico 118 mEq/L deve ser aceito');

  // Testes de Peso e Idade
  const erroPeso = sandbox.validarEntradaFisiologica('crcl', { peso: 420 });
  assert(erroPeso && erroPeso.includes('Peso'), 'Deve capturar Peso > 350 kg');

  const erroIdade = sandbox.validarEntradaFisiologica('crcl', { idade: 135 });
  assert(erroIdade && erroIdade.includes('Idade'), 'Deve capturar Idade > 125 anos');
});

test('Cockpit Nefrologia & Hidratação - Cálculo determinístico offline com suporte a Peso Ideal e Ajustado (IMC >= 30)', () => {
  const sandbox = criarSandboxCockpit();

  // 1. Paciente Não-Obeso (70 kg, 175 cm, IMC 22.9 kg/m²)
  const resCrclNormal = sandbox.calcularOfflineLocal('crcl', {
    idade: 50,
    peso: 70,
    altura: 175,
    creatinina: 1.0,
    sexo: 'm'
  });
  assert(resCrclNormal.includes('CLEARANCE DE CREATININA (Cockcroft-Gault)'), 'Cabeçalho de CrCl deve estar presente');
  assert(resCrclNormal.includes('ClCr Estimado: 87.5 mL/min'), 'ClCr de 87.5 mL/min esperado para 70kg, 50a, Cr 1.0 masc');
  assert(resCrclNormal.includes('IMC: 22.9 kg/m²'), 'IMC deve ser exibido');

  // 2. Paciente Obeso (120 kg, 170 cm, IMC 41.5 kg/m² >= 30)
  const resCrclObeso = sandbox.calcularOfflineLocal('crcl', {
    idade: 60,
    peso: 120,
    altura: 170,
    creatinina: 1.5,
    sexo: 'm'
  });
  assert(resCrclObeso.includes('IMC: 41.5 kg/m² (Obesidade ≥ 30)'), 'Deve classificar como obesidade severa');
  assert(resCrclObeso.includes('Peso Ideal (Devine):'), 'Deve calcular Peso Ideal');
  assert(resCrclObeso.includes('Peso Ajustado:'), 'Deve calcular Peso Ajustado');
  assert(resCrclObeso.includes('ClCr por Peso Ajustado:'), 'Deve fornecer ClCr ajustado para prescrição segura');

  // 3. Paciente Feminino em metros (60 kg, 1.60 m, 65 anos, Cr 1.4)
  const resCrclFem = sandbox.calcularOfflineLocal('crcl', {
    idade: 65,
    peso: 60,
    altura: 1.60,
    creatinina: 1.4,
    sexo: 'f'
  });
  assert(resCrclFem.includes('IMC: 23.4 kg/m²'), 'Deve converter 1.60 m para 160 cm e calcular IMC');

  // 4. Distúrbios Hidroeletrolíticos - Hipercalemia com ECG
  const resDheK = sandbox.calcularOfflineLocal('dhe', {
    modo: 'hipercalemia',
    kAtual: 7.2,
    ecgAlterado: true,
    peso: 70
  });
  assert(resDheK.includes('MANEJO EMERGENCIAL DE HIPERCALEMIA'), 'Deve calcular hipercalemia');
  assert(resDheK.includes('Gluconato de Cálcio 10%'), 'Deve prescrever Gluconato de Cálcio');
  assert(resDheK.includes('Glicoinsulina'), 'Deve prescrever Glicoinsulina polarizante');

  // 5. Hidratação Pediátrica Holliday-Segar
  const resPed = sandbox.calcularOfflineLocal('pediatria', {
    peso: 12,
    modo: 'holliday',
    condicaoClinica: 'manutencao_padrao'
  });
  assert(resPed.includes('HIDRATAÇÃO HOLLIDAY-SEGAR'), 'Deve calcular Holliday-Segar');
  assert(resPed.includes('Volume Total 24h: 1100 mL/dia'), '12 kg deve dar 1000 + 2*50 = 1100 mL/dia');
  assert(resPed.includes('Vazão Contínua na BIC: 45.8 mL/h'), 'Vazão horária deve ser 1100/24 = 45.8 mL/h');
});

test('Fastify Validators - Suporte nativo a altura e limites fisiológicos no backend', () => {
  const { validarParametrosCalculadora } = require(VALIDATORS_PATH);

  // 1. CrCl com altura em cm
  const v1 = validarParametrosCalculadora('crcl', {
    idade: 55,
    peso: 80,
    altura: 178,
    creatinina: 1.1,
    sexo: 'm'
  });
  assert.strictEqual(v1.valido, true, 'Payload com altura em cm deve ser válido');
  assert.strictEqual(v1.entradaSanitizada.altura, 178, 'Altura deve ser sanitizada como 178 cm');

  // 2. CrCl com altura em metros
  const v2 = validarParametrosCalculadora('crcl', {
    idade: 55,
    peso: 80,
    altura: 1.78,
    creatinina: 1.1,
    sexo: 'm'
  });
  assert.strictEqual(v2.valido, true, 'Payload com altura em metros deve ser normalizado');
  assert.strictEqual(v2.entradaSanitizada.altura, 178, '1.78m deve ser convertido para 178 cm');

  // 3. CrCl com altura fora dos limites biológicos (> 250 cm)
  const v3 = validarParametrosCalculadora('crcl', {
    idade: 55,
    peso: 80,
    altura: 280,
    creatinina: 1.1
  });
  assert.strictEqual(v3.valido, false, 'Altura 280 cm deve ser rejeitada');
  assert(v3.erro.includes('Altura corporal') && v3.erro.includes('fora dos limites'), 'Mensagem amigável de altura');

  // 4. DHE Hipercalemia e Potássio
  const v4 = validarParametrosCalculadora('dhe', {
    modo: 'hipercalemia',
    kAtual: 6.5,
    peso: 70
  });
  assert.strictEqual(v4.valido, true, 'DHE com potássio válido deve ser aceito');

  const v5 = validarParametrosCalculadora('dhe', {
    modo: 'hipercalemia',
    kAtual: 14.0,
    peso: 70
  });
  assert.strictEqual(v5.valido, false, 'K+ 14.0 mEq/L deve ser rejeitado por limites fisiológicos');
});
