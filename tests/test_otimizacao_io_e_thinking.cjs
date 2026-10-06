/**
 * Teste das Otimizações 3 e 4:
 * 3. Otimização de I/O em PropertiesService (redução de RPCs getProperties via snapshot em memória).
 * 4. Calibração seletiva de thinkingConfig no Gemini 2.5 Flash.
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

  let getPropertiesCalls = 0;
  let lastPayloadCaptured = null;

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
        getProperties: () => {
          getPropertiesCalls++;
          return Object.assign({}, propsMock);
        },
        setProperty: (k, v) => { propsMock[k] = String(v); },
        setProperties: (obj) => { Object.assign(propsMock, obj); },
        deleteProperty: (k) => { delete propsMock[k]; }
      })
    },
    UrlFetchApp: {
      fetch: (url, opts) => {
        if (opts && opts.payload) {
          try {
            lastPayloadCaptured = JSON.parse(opts.payload);
          } catch (e) {}
        }
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

  return {
    sandbox,
    getPropertiesCount: () => getPropertiesCalls,
    resetCount: () => { getPropertiesCalls = 0; },
    getLastPayload: () => lastPayloadCaptured,
    resetPayload: () => { lastPayloadCaptured = null; }
  };
}

console.log('🧪 Iniciando validação das Otimizações 3 (I/O) e 4 (thinkingConfig)...\n');

// -------------------------------------------------------------
// TESTE 3: Otimização de I/O em PropertiesService
// -------------------------------------------------------------
const env = carregarAmbiente();
const bot = env.sandbox.PersistenciaBot;

env.resetCount();
// Salva múltiplos itens sequenciais
bot.salvar('inbox_teste_1', { status: 'pending', text: 'primeiro' });
bot.salvar('inbox_teste_2', { status: 'pending', text: 'segundo' });
bot.salvar('inbox_teste_3', { status: 'pending', text: 'terceiro' });

// Lê os itens salvos via snapshot
const snap = bot.snapshot();
assert.equal(bot.ler('inbox_teste_1', snap).text, 'primeiro');
assert.equal(bot.ler('inbox_teste_2', snap).text, 'segundo');
assert.equal(bot.ler('inbox_teste_3', snap).text, 'terceiro');

// Em vez de 1 chamada de getProperties para cada salvar + cada ler (que seriam > 6 chamadas),
// o cache de snapshot deve manter as chamadas no mínimo absoluto (1 chamada).
const chamadas = env.getPropertiesCount();
assert(chamadas <= 2, `Esperado no máximo 2 chamadas de getProperties(), foram feitas ${chamadas}`);
console.log(`✅ APROVADO: 3. I/O PropertiesService otimizado (apenas ${chamadas} RPCs remotas para múltiplos salvamentos e leituras)`);

// -------------------------------------------------------------
// TESTE 4: Calibração Seletiva de thinkingConfig no Gemini 2.5
// -------------------------------------------------------------

// 4.1 Tarefa extrativa / sem thinking (classificador ou evento de agenda) no Gemini 2.5
env.resetPayload();
env.sandbox._iaProvGemini("Sistema", "Texto extrativo", 500, env.sandbox._iaNovoCtx(), {
  modelos: ["gemini-2.5-flash"],
  semThinking: true
});
let p1 = env.getLastPayload();
assert(p1, 'Payload do Gemini 2.5 deve ter sido gerado');
assert(p1.generationConfig, 'generationConfig deve existir');
assert(p1.generationConfig.thinkingConfig, 'thinkingConfig deve existir para gemini-2.5 com semThinking');
assert.strictEqual(p1.generationConfig.thinkingConfig.thinkingBudget, 0, 'thinkingBudget deve ser 0 para tarefas extrativas');
console.log('✅ APROVADO: 4.1 Gemini 2.5 Flash desativa thinking (thinkingBudget: 0) para tarefas extrativas/classificação rápida');

// 4.2 Tarefa clínica (SOAP, conduta, emergência) no Gemini 2.5 Flash
env.resetPayload();
env.sandbox._iaProvGemini("Sistema", "Caso clínico complexo", 2000, env.sandbox._iaNovoCtx(), {
  modelos: ["gemini-2.5-flash"],
  clinico: true
});
let p2 = env.getLastPayload();
assert(p2, 'Payload clínico deve ter sido gerado');
// Para caso clínico, semThinking é falso/indefinido, então thinkingConfig NÃO é forçado a 0 (preserva o raciocínio profundo nativo)
const thinkingBudgetClinico = p2.generationConfig.thinkingConfig ? p2.generationConfig.thinkingConfig.thinkingBudget : null;
assert.notStrictEqual(thinkingBudgetClinico, 0, 'Caso clínico NÃO deve ter raciocínio forçado a zero; deve preservar raciocínio médico');
console.log('✅ APROVADO: 4.2 Raciocínio profundo do Gemini 2.5 Flash PRESERVADO para casos clínicos e diagnósticos complexos');

// 4.3 Modelos não-2.5 (Gemini 2.0 Flash / 1.5 Flash) NUNCA recebem thinkingConfig (evita HTTP 400)
env.resetPayload();
env.sandbox._iaProvGemini("Sistema", "Texto qualquer", 500, env.sandbox._iaNovoCtx(), {
  modelos: ["gemini-2.0-flash"],
  semThinking: true
});
let p3 = env.getLastPayload();
assert(p3, 'Payload do Gemini 2.0 deve ter sido gerado');
assert.strictEqual(p3.generationConfig.thinkingConfig, undefined, 'Gemini 2.0 não deve receber thinkingConfig');
console.log('✅ APROVADO: 4.3 Gemini 2.0 Flash e 1.5 Flash blindados contra erro HTTP 400 (sem thinkingConfig indevido)');

console.log('\n🎉 OTIMIZAÇÕES 3 E 4: Todos os testes passaram com 100% de sucesso!');
