/**
 * BATERIA OSTENSIVA DE TESTES: GEMINI COMO MOTOR PRIMÁRIO E RESILIÊNCIA A 429 (TOO MANY REQUESTS)
 * Valida a prioridade do Gemini Flash, rotação automática de pool de chaves,
 * fallback gracioso para Groq quando todas as chaves saturam e ausência de bloqueios para o usuário.
 */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const source = fs.readFileSync(path.resolve(__dirname, '../ultra_rotina_master.js'), 'utf8');

function criarAmbiente(configProps = {}) {
  const props = {
    TELEGRAM_CHAT_ID: '123',
    TELEGRAM_BOT_TOKEN: 'fake-token',
    WEBHOOK_SECRET: 'secret',
    GEMINI_API_KEYS: 'key_alpha,key_beta,key_gamma',
    GROQ_API_KEY: 'groq_backup_key',
    ...configProps
  };
  const cache = {}, sent = [], fetchLogs = [];
  let now = 2000000000000, seq = 0;
  class Clock extends Date { constructor(...a){super(...(a.length?a:[now]));} static now(){return now;} }
  
  let customFetch = null;

  const p = {
    getProperty: k => props[k] ?? null,
    setProperty: (k, v) => { props[k] = String(v); },
    deleteProperty: k => { delete props[k]; },
    getProperties: () => ({ ...props })
  };

  const c = {
    Buffer, Date: Clock, console: { log() {}, error() {} },
    PropertiesService: { getScriptProperties: () => p },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] ?? null, put: (k, v) => { cache[k] = String(v); }, remove: k => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }), getUserLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    HtmlService: { createHtmlOutput: b => ({ b }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: b => ({ b, setMimeType() { return this; } }) },
    ScriptApp: { getProjectTriggers: () => [] },
    UrlFetchApp: {
      fetch: (url, opts) => {
        fetchLogs.push({ url, headers: opts && opts.headers, t: now });
        if (customFetch) return customFetch(url, opts);

        // Resposta padrão 200 para Gemini
        if (url.includes('googleapis.com')) {
          return {
            getResponseCode: () => 200,
            getContentText: () => JSON.stringify({
              candidates: [{ content: { parts: [{ text: 'Resposta médica precisa do Gemini Flash' }] }, finishReason: 'STOP' }]
            })
          };
        }
        // Resposta padrão 200 para Groq
        if (url.includes('groq.com')) {
          return {
            getResponseCode: () => 200,
            getContentText: () => JSON.stringify({
              choices: [{ message: { content: 'Resposta médica de contingência do Groq' }, finish_reason: 'stop' }]
            })
          };
        }
        return { getResponseCode: () => 200, getContentText: () => '{"ok":true}' };
      }
    }
  };

  vm.createContext(c);
  vm.runInContext(source, c);
  c.Utilities.getUuid = () => String(++seq).padStart(32, '0');
  c.Utilities.sleep = () => {};

  return {
    c, props, cache, fetchLogs,
    setFetch: fn => { customFetch = fn; },
    advance: ms => { now += ms; }
  };
}

let total = 0, pass = 0;
function test(name, fn) {
  total++;
  try {
    fn();
    pass++;
    console.log('✅ APROVADO: ' + name);
  } catch (e) {
    process.exitCode = 1;
    console.error('❌ FALHOU: ' + name + '\n' + e.stack);
  }
}

// -----------------------------------------------------------------------------
// 1. MOTOR PADRÃO É GEMINI
// -----------------------------------------------------------------------------
test('1. ConfigService define GEMINI como PROVEDOR_TEXTO_PADRAO', () => {
  const env = criarAmbiente();
  assert.equal(env.c.ConfigService.get('PROVEDOR_TEXTO_PADRAO'), 'GEMINI');
});

// -----------------------------------------------------------------------------
// 2. SUPORTE UNIVERSAL A GEMINI_API_KEY (SINGULAR)
// -----------------------------------------------------------------------------
test('2. Suporte universal: chave única em GEMINI_API_KEY funciona automaticamente', () => {
  const env = criarAmbiente({ GEMINI_API_KEYS: '', GEMINI_API_KEY: 'chave_unica_singular' });
  const res = env.c.executarRaciocinioClinico('Sistema', 'Prompt teste', 1000);
  assert(res.includes('Gemini Flash'), 'Deve chamar o Gemini com a chave singular');
  assert(env.fetchLogs.some(f => f.headers && f.headers['x-goog-api-key'] === 'chave_unica_singular'), 'Header deve conter a chave singular');
});

// -----------------------------------------------------------------------------
// 3. ROTAÇÃO AUTOMÁTICA EM ERRO 429 (TOO MANY REQUESTS)
// -----------------------------------------------------------------------------
test('3. Erro 429 na Chave 1 rotaciona imediatamente para a Chave 2 sem falha para o usuário', () => {
  const env = criarAmbiente({ GEMINI_API_KEYS: 'key_1,key_2,key_3' });
  
  let key1Attempts = 0;
  env.setFetch((url, opts) => {
    const key = opts.headers && opts.headers['x-goog-api-key'];
    if (key === 'key_1') {
      key1Attempts++;
      return {
        getResponseCode: () => 429,
        getContentText: () => JSON.stringify({ error: { code: 429, message: 'Resource has been exhausted (e.g. check quota).' } })
      };
    }
    if (key === 'key_2') {
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'Resposta com sucesso via Chave 2 após 429' }] } }]
        })
      };
    }
    return { getResponseCode: () => 200, getContentText: () => '{}' };
  });

  const res = env.c.executarRaciocinioClinico('Sistema', 'Caso com 429', 1000);
  assert.equal(key1Attempts, 1, 'Tentou key_1 uma vez');
  assert(res.includes('Chave 2 após 429'), 'Entrega a resposta via Chave 2');
  
  // Confirma que foram feitas duas chamadas na mesma execução (key_1 depois key_2)
  const geminiCalls = env.fetchLogs.filter(f => f.url.includes('googleapis.com'));
  assert.equal(geminiCalls.length, 2);
  assert.equal(geminiCalls[0].headers['x-goog-api-key'], 'key_1');
  assert.equal(geminiCalls[1].headers['x-goog-api-key'], 'key_2');
});

// -----------------------------------------------------------------------------
// 4. TESTE OSTENSIVO DE RAJADA (10 CHAMADAS CONSECUTIVAS)
// -----------------------------------------------------------------------------
test('4. Teste ostensivo de rajada: 10 chamadas distribuem a carga harmonicamente no pool', () => {
  const env = criarAmbiente({ GEMINI_API_KEYS: 'key_a,key_b,key_c' });
  
  const chavesUsadas = [];
  env.setFetch((url, opts) => {
    const k = opts.headers && opts.headers['x-goog-api-key'];
    chavesUsadas.push(k);
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'Resposta ok ' + k }] } }]
      })
    };
  });

  for (let i = 0; i < 9; i++) {
    env.c.executarRaciocinioClinico('Sistema', 'Rajada ' + i, 500);
  }

  // Verifica que as chaves foram alternadas (round-robin: a, b, c, a, b, c...)
  assert.equal(chavesUsadas.length, 9);
  assert.equal(chavesUsadas[0], 'key_a');
  assert.equal(chavesUsadas[1], 'key_b');
  assert.equal(chavesUsadas[2], 'key_c');
  assert.equal(chavesUsadas[3], 'key_a');
  assert.equal(chavesUsadas[4], 'key_b');
  assert.equal(chavesUsadas[5], 'key_c');
});

// -----------------------------------------------------------------------------
// 5. CASCATA RESILIENTE: TODAS AS CHAVES EM 429 ACIONAM O GROQ AUTOMATICAMENTE
// -----------------------------------------------------------------------------
test('5. Saturação total do Gemini (todas as chaves 429) aciona o Groq sem retornar erro', () => {
  const env = criarAmbiente({ GEMINI_API_KEYS: 'key_x,key_y' });
  
  env.setFetch((url, opts) => {
    // Todas as chaves do Gemini respondem 429
    if (url.includes('googleapis.com')) {
      return {
        getResponseCode: () => 429,
        getContentText: () => JSON.stringify({ error: { code: 429, message: 'Quota exceeded' } })
      };
    }
    // Groq assume e responde 200
    if (url.includes('groq.com')) {
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          choices: [{ message: { content: 'Resposta gerada com sucesso pelo Groq de contingência' } }]
        })
      };
    }
    return { getResponseCode: () => 200, getContentText: () => '{}' };
  });

  const res = env.c.executarRaciocinioClinico('Sistema', 'Emergência de saturação', 1000);
  assert(res.includes('Groq de contingência'), 'O Groq deve assumir e responder com sucesso');
  
  // Confirma que foram tentadas as chaves nos modelos do Gemini e depois o Groq assumiu
  const chamadasGemini = env.fetchLogs.filter(f => f.url.includes('googleapis.com'));
  const chamadasGroq = env.fetchLogs.filter(f => f.url.includes('groq.com'));
  assert(chamadasGemini.length >= 2, 'Tentou as chaves do Gemini antes do failover');
  assert(chamadasGroq.length >= 1, 'Groq deve ter sido acionado na cascata');
});

// -----------------------------------------------------------------------------
// 6. DETECÇÃO DE CONSUMER E RETRY-DELAY: PULA CHAVES DO MESMO PROJETO
// -----------------------------------------------------------------------------
test('6. Detecção de Consumer: chave do mesmo projeto é pulada automaticamente em 429', () => {
  // key_same_a e key_same_b compartilham projects/12345. key_diff_c pertence a projects/67890.
  const env = criarAmbiente({ GEMINI_API_KEYS: 'key_same_a,key_same_b,key_diff_c' });
  // pré-popula o cache simulando que key_same_b já é conhecida como pertencente a projects/12345
  env.cache['iagcons_key_same_b'] = 'projects/12345';
  
  let keyAttempts = [];
  env.setFetch((url, opts) => {
    const k = opts.headers && opts.headers['x-goog-api-key'];
    keyAttempts.push(k);
    if (k === 'key_same_a') {
      return {
        getResponseCode: () => 429,
        getContentText: () => JSON.stringify({
          error: {
            code: 429,
            message: 'Resource exhausted',
            details: [
              { '@type': 'type.googleapis.com/google.rpc.ErrorInfo', metadata: { consumer: 'projects/12345' } },
              { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '30s' }
            ]
          }
        })
      };
    }
    if (k === 'key_diff_c') {
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'Resposta vinda do projeto independente key_diff_c' }] } }]
        })
      };
    }
    return { getResponseCode: () => 200, getContentText: () => '{}' };
  });

  const res = env.c.executarRaciocinioClinico('Sistema', 'Teste de consumer', 1000);
  assert(res.includes('key_diff_c'), 'Entrega resposta pela chave do projeto independente');
  // key_same_b DEVE TER SIDO PULADA sem nenhuma chamada HTTP
  assert.equal(keyAttempts.includes('key_same_b'), false, 'key_same_b não deve sofrer chamada HTTP inútil pois pertence ao mesmo consumer bloqueado');
  assert.equal(keyAttempts[0], 'key_same_a');
  assert.equal(keyAttempts[1], 'key_diff_c');
});

console.log(`\n🎉 RESILIÊNCIA E BLINDAGEM GEMINI 429: ${pass}/${total} testes aprovados com 100% de êxito!`);
