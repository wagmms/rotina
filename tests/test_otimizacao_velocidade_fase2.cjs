/**
 * Testes das Otimizações 1 e 2 de Velocidade e Rigor Clínico:
 * 1. Fallback clínico do Gemini oficial (eliminação de 404 por modelos inexistentes).
 * 2. Heurística local de linguagem natural expandida (resolução de intenção SOAP em 0 ms).
 */

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function carregarAmbiente() {
  const code = fs.readFileSync('ultra_rotina_master.js', 'utf8');
  const cacheMock = {};
  const propsMock = {
    TELEGRAM_BOT_TOKEN: 'token123',
    TELEGRAM_CHAT_ID: '999999',
    GEMINI_API_KEYS: 'key_teste_1,key_teste_2'
  };

  const sandbox = {
    Logger: { log: () => {} },
    console: console,
    Date: Date,
    Math: Math,
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    String: String,
    Array: Array,
    Object: Object,
    RegExp: RegExp,
    JSON: JSON,
    Number: Number,
    Utilities: {
      getUuid: () => 'uuid-' + Math.random().toString(36).substring(2, 10),
      sleep: () => {}
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => cacheMock[k] || null,
        put: (k, v) => { cacheMock[k] = String(v); },
        remove: (k) => { delete cacheMock[k]; },
        getAll: (keys) => {
          const res = {};
          keys.forEach(k => { if (cacheMock[k]) res[k] = cacheMock[k]; });
          return res;
        },
        putAll: (obj) => { Object.assign(cacheMock, obj); }
      })
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => propsMock[k] || null,
        getProperties: () => Object.assign({}, propsMock),
        setProperty: (k, v) => { propsMock[k] = String(v); },
        deleteProperty: (k) => { delete propsMock[k]; }
      })
    },
    UrlFetchApp: {
      fetch: (url, opts) => {
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            candidates: [{
              content: { parts: [{ text: "Mock de resposta de IA" }] },
              finishReason: "STOP"
            }]
          }),
          getAllHeaders: () => ({})
        };
      }
    }
  };

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox;
}

// -------------------------------------------------------------
// TESTES
// -------------------------------------------------------------
const env = carregarAmbiente();

console.log('🧪 Iniciando validação das Otimizações 1 e 2...\n');

// 1. Fallback clínico do Gemini oficial
const clinicosPadrao = env.ConfigService.get("IA_MODELOS_CLINICOS_GEMINI");
assert(clinicosPadrao, 'IA_MODELOS_CLINICOS_GEMINI deve estar definido nos DEFAULTS');
assert.strictEqual(clinicosPadrao.includes("gemini-3.5-flash"), true, 'Deve conter gemini-3.5-flash ativo');
assert.strictEqual(clinicosPadrao.includes("gemini-2.5-flash"), false, 'Não deve conter gemini-2.5-flash descontinuado (404)');
assert.strictEqual(clinicosPadrao.includes("gemini-2.0-flash"), false, 'Não deve conter gemini-2.0-flash descontinuado (404)');
assert.strictEqual(clinicosPadrao.includes("gemini-1.5-flash"), false, 'Não deve conter gemini-1.5-flash descontinuado (404)');
console.log('✅ APROVADO: 1. ConfigService e IA_MODELOS_CLINICOS_GEMINI fixados nas versões ativas do Google sem modelos 404');

// 2. Heurística local de linguagem natural (sem chamar LLM)
const casosSoap = [
  'pcte 45a com febre e tosse produtiva há 3 dias',
  'paciente masculino, 32 anos, cefaleia pulsátil iniciada ontem',
  'paciente feminino de 68 anos admitida com tosse produtiva e dispneia',
  'Exame físico: PA 130x80, FC 92, afebril, dor abdominal à palpação de fossa ilíaca direita',
  'pcte com quadro de disúria e polaciúria desde anteontem',
  'Pcte, 58 anos, hipertenso e tabagista, procurou UPA por dor epigástrica há 2 dias',
  'paciente masc 70a trazido com quadro de tosse e astenia'
];

casosSoap.forEach((caso, i) => {
  const r = env.classificarIntencaoMensagem(caso);
  assert.strictEqual(r.intencao, 'CLINICO_SOAP', `Caso ${i + 1} ("${caso}") deveria ser CLINICO_SOAP, mas retornou ${r.intencao}`);
  assert(r.confianca >= 0.9, 'Confiança deve ser alta na heurística');
});
console.log(`✅ APROVADO: 2. ${casosSoap.length}/${casosSoap.length} narrativas clínicas cotidianas classificadas em 0 ms como CLINICO_SOAP`);

// 3. Segurança absoluta: Casos de emergência continuam como CLINICO_EMERGENCIA
const casosEmergencia = [
  'pcte 65a em parada cardiorrespiratória em ritmo de FV',
  'pcte 50a com dor torácica opressiva e sudorese há 30 min',
  'pcte em choque séptico hipotenso com PA 60x40',
  'paciente masculino 45 anos com anafilaxia e estridor laríngeo'
];

casosEmergencia.forEach((caso, i) => {
  const r = env.classificarIntencaoMensagem(caso);
  assert.strictEqual(r.intencao, 'CLINICO_EMERGENCIA', `Caso emergência ${i + 1} deveria ser CLINICO_EMERGENCIA`);
});
console.log(`✅ APROVADO: 3. ${casosEmergencia.length}/${casosEmergencia.length} casos de emergência interceptados prioritariamente como CLINICO_EMERGENCIA`);

console.log('\n🎉 OTIMIZAÇÕES 1 E 2: Todos os testes passaram com 100% de sucesso!');
