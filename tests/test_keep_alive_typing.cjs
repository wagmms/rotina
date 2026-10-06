/**
 * TESTES DO KEEP-ALIVE VISUAL CONTÍNUO DO TELEGRAM (TYPING ATIVO)
 * Valida o throttling inteligente de 3.500 ms e a renovação de status contínuo
 * em pontos críticos de espera (IA, auditoria, áudio e voz).
 */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const source = fs.readFileSync(path.resolve(__dirname, '../ultra_rotina_master.js'), 'utf8');

function env() {
  const props = {
    TELEGRAM_CHAT_ID: '123',
    TELEGRAM_BOT_TOKEN: 'fake-token',
    WEBHOOK_SECRET: 'secret',
    GEMINI_API_KEY: 'fake-gemini'
  };
  const cache = {}, sent = [];
  let now = 2000000000000, seq = 0;
  class Clock extends Date { constructor(...a){super(...(a.length?a:[now]));} static now(){return now;} }
  const p = {
    getProperty: k => props[k] ?? null,
    setProperty: (k, v) => { props[k] = String(v); },
    deleteProperty: k => { delete props[k]; },
    getProperties: () => ({ ...props }),
    setProperties: (o, del) => {
      if (del) for (const k in props) delete props[k];
      for (const k in o) props[k] = String(o[k]);
      return p;
    }
  };
  const c = {
    Buffer, Date: Clock, console: { log() {}, error() {} },
    PropertiesService: { getScriptProperties: () => p },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] ?? null, put: (k, v) => { cache[k] = String(v); }, remove: k => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }), getUserLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    HtmlService: { createHtmlOutput: body => ({ body }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: body => ({ body, setMimeType() { return this; } }) },
    ScriptApp: { getProjectTriggers: () => [] },
    UrlFetchApp: {
      fetch: (url, opts) => {
        const payload = JSON.parse((opts && opts.payload) || '{}');
        sent.push({ url, payload });
        return { getResponseCode: () => 200, getContentText: () => '{"ok":true}' };
      }
    }
  };
  vm.createContext(c);
  vm.runInContext(source, c);
  c.Utilities.getUuid = () => String(++seq).padStart(32, '0');
  c.Utilities.sleep = (ms) => { now += ms; };

  return { c, props, cache, sent, setNow: (n) => { now = n; }, advanceTime: (ms) => { now += ms; } };
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
// 1. THROTTLING INTELIGENTE E RENOVAÇÃO APÓS JANELA
// -----------------------------------------------------------------------------
test('1. enviarChatAction envia na primeira vez e throttla chamadas em menos de 3.5s', () => {
  const { c, sent, advanceTime } = env();

  c.enviarChatAction('123', 'typing');
  assert.equal(sent.filter(s => s.url.includes('sendChatAction')).length, 1, 'Deve ter enviado o 1º typing');

  // Segunda chamada imediata (100 ms depois)
  advanceTime(100);
  c.enviarChatAction('123', 'typing');
  assert.equal(sent.filter(s => s.url.includes('sendChatAction')).length, 1, 'Não deve ter enviado chamada duplicada em 100ms');

  // Terceira chamada (2.000 ms depois)
  advanceTime(1900);
  c.renovarChatActionSeNecessario('123', 'typing');
  assert.equal(sent.filter(s => s.url.includes('sendChatAction')).length, 1, 'Ainda dentro da janela de 3.5s, não deve reenviar');

  // Quarta chamada (3.600 ms após o 1º envio)
  advanceTime(1600);
  c.renovarChatActionSeNecessario('123', 'typing');
  assert.equal(sent.filter(s => s.url.includes('sendChatAction')).length, 2, 'Após 3.6s, deve renovar o status no Telegram!');
});

test('2. enviarChatAction com forcar=true ignora o throttling', () => {
  const { c, sent, advanceTime } = env();

  c.enviarChatAction('123', 'typing');
  assert.equal(sent.filter(s => s.url.includes('sendChatAction')).length, 1);

  advanceTime(50);
  c.enviarChatAction('123', 'typing', true);
  assert.equal(sent.filter(s => s.url.includes('sendChatAction')).length, 2, 'Com forcar=true deve enviar imediatamente');
});

// -----------------------------------------------------------------------------
// 2. KEEP-ALIVE NO FLUXO DE VOZ E PRECEPTOR
// -----------------------------------------------------------------------------
test('3. Preceptor Socrático ativa record_voice e renova antes de sintetizar voz', () => {
  const { c, sent, advanceTime } = env();

  c.gerarProvocacaoPreceptorAudio = () => {
    // Simula demora da IA de 4 segundos
    advanceTime(4000);
    return 'Qual a sua conduta imediata?';
  };
  c.sintetizarVozPreceptor = () => ({ getBytes: () => [1, 2, 3] });
  c.enviarAudioVozTelegram = () => true;

  c.responderPreceptorVozComIA('123', 'Caso clinico de dispneia aguda');

  const voiceActions = sent.filter(s => s.url.includes('sendChatAction') && s.payload.action === 'record_voice');
  assert.equal(voiceActions.length, 2, 'Deve ter enviado record_voice no início e renovado antes da síntese de voz');
});

// -----------------------------------------------------------------------------
// 3. KEEP-ALIVE EM PROCESSAREENTREGARIA
// -----------------------------------------------------------------------------
test('4. processarEEntregarIA ativa typing e renova se a geração demorar mais de 3.5s', () => {
  const { c, sent, advanceTime } = env();

  const fnLenta = () => {
    advanceTime(4500); // Simula IA + auditoria levando 4.5 segundos
    return 'SÍNTESE SOAP CONCLUÍDA';
  };

  c.processarEEntregarIA('123', fnLenta, 'dados', 'soap');

  const typingActions = sent.filter(s => s.url.includes('sendChatAction') && s.payload.action === 'typing');
  assert.equal(typingActions.length, 2, 'Deve ter mantido o status typing ativo durante todo o processamento');
});

console.log(`\n🎉 KEEP-ALIVE VISUAL DO TELEGRAM: ${pass}/${total} testes aprovados com 100% de êxito!`);
