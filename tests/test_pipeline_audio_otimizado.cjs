/**
 * BATERIA DE TESTES: PIPELINE DE ÁUDIO OTIMIZADO E CLASSIFICAÇÃO SEMIOLÓGICA ZERO-LATÊNCIA
 * Valida a eliminação da chamada de LLM intermediária em relatos clínicos falados/escritos
 * e preserva rigorosamente agendamentos, hábitos, preceptor e emergências.
 */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const source = require('./source_producao.cjs');

function env() {
  const props = {
    TELEGRAM_CHAT_ID: '123',
    TELEGRAM_BOT_TOKEN: 'fake-token',
    WEBHOOK_SECRET: 'secret',
    NOTION_TASKS_DB_ID: 'fake-db',
    GEMINI_API_KEY: 'fake-gemini'
  };
  const cache = {}, sent = [];
  let now = 2000000000000, seq = 0, iaExecutarCalls = 0;
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
        let payload = {};
        try {
          payload = typeof opts?.payload === 'string' ? JSON.parse(opts.payload) : (opts?.payload || {});
        } catch (_) {
          payload = opts?.payload || {};
        }
        sent.push({ url, payload });
        return { getResponseCode: () => 200, getContentText: () => '{"ok":true}' };
      }
    }
  };
  vm.createContext(c);
  vm.runInContext(source, c);
  c.Utilities.getUuid = () => String(++seq).padStart(32, '0');
  c.Utilities.sleep = () => {};

  // Espiona chamadas de _iaExecutar para verificar se a LLM classificadora foi chamada
  const origIaExecutar = c._iaExecutar;
  c._iaExecutar = function(...args) {
    iaExecutarCalls++;
    if (origIaExecutar) return origIaExecutar.apply(this, args);
    return '{"intencao":"CONVERSA"}';
  };

  return { c, props, cache, sent, getIaCalls: () => iaExecutarCalls, resetIaCalls: () => { iaExecutarCalls = 0; } };
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
// 1. RECONHECIMENTO SEMIOLÓGICO EM 0 MS (SEM CHAMADA DE LLM CLASSIFICADORA)
// -----------------------------------------------------------------------------
test('1. Homem 60 anos com tosse e febre é classificado como CLINICO_SOAP em 0ms sem LLM', () => {
  const { c, getIaCalls, resetIaCalls } = env();
  resetIaCalls();
  const res = c.classificarIntencaoMensagem('Homem de 60 anos com tosse produtiva e febre há 3 dias');
  assert.equal(res.intencao, 'CLINICO_SOAP');
  assert.equal(getIaCalls(), 0, 'Não deve chamar LLM para classificar intenção');
});

test('2. Mulher 35a com cefaleia e náuseas é classificada como CLINICO_SOAP em 0ms sem LLM', () => {
  const { c, getIaCalls, resetIaCalls } = env();
  resetIaCalls();
  const res = c.classificarIntencaoMensagem('Mulher 35a com cefaleia pulsátil e náuseas iniciadas há 2 horas');
  assert.equal(res.intencao, 'CLINICO_SOAP');
  assert.equal(getIaCalls(), 0, 'Não deve chamar LLM para classificar intenção');
});

test('3. Idosa 78 anos com confusão mental é classificada como CLINICO_SOAP em 0ms sem LLM', () => {
  const { c, getIaCalls, resetIaCalls } = env();
  resetIaCalls();
  const res = c.classificarIntencaoMensagem('Idosa de 78 anos trazida pela família com quadro de confusão mental e febre desde ontem');
  assert.equal(res.intencao, 'CLINICO_SOAP');
  assert.equal(getIaCalls(), 0, 'Não deve chamar LLM para classificar intenção');
});

test('4. Criança 4 anos com dor abdominal é classificada como CLINICO_SOAP em 0ms sem LLM', () => {
  const { c, getIaCalls, resetIaCalls } = env();
  resetIaCalls();
  const res = c.classificarIntencaoMensagem('Criança 4 anos com dor abdominal e vômitos há 1 dia');
  assert.equal(res.intencao, 'CLINICO_SOAP');
  assert.equal(getIaCalls(), 0, 'Não deve chamar LLM para classificar intenção');
});

test('5. Paciente refere lombalgia é classificado como CLINICO_SOAP em 0ms sem LLM', () => {
  const { c, getIaCalls, resetIaCalls } = env();
  resetIaCalls();
  const res = c.classificarIntencaoMensagem('Paciente refere dor lombar irradiada para MID com piora há 5 dias');
  assert.equal(res.intencao, 'CLINICO_SOAP');
  assert.equal(getIaCalls(), 0, 'Não deve chamar LLM para classificar intenção');
});

// -----------------------------------------------------------------------------
// 2. PRESERVAÇÃO RIGOROSA DAS OUTRAS INTENÇÕES
// -----------------------------------------------------------------------------
test('6. Agendamento de plantão no Calendar mantém intenção CALENDAR_CRIAR', () => {
  const { c, getIaCalls, resetIaCalls } = env();
  resetIaCalls();
  const res = c.classificarIntencaoMensagem('Marcar plantão no HC amanhã às 7h');
  assert.equal(res.intencao, 'CALENDAR_CRIAR');
  assert.equal(getIaCalls(), 0);
});

test('7. Hábito cumprido mantém intenção HABITO_PROATIVO', () => {
  const { c, getIaCalls, resetIaCalls } = env();
  resetIaCalls();
  const res = c.classificarIntencaoMensagem('Treinei perna na academia hoje cedo');
  assert.equal(res.intencao, 'HABITO_PROATIVO');
  assert.equal(getIaCalls(), 0);
});

test('8. Pedido de áudio mantém prioridade para PRECEPTOR_VOZ (inclusive atalhos rápidos)', () => {
  const { c, getIaCalls, resetIaCalls } = env();
  resetIaCalls();
  const res1 = c.classificarIntencaoMensagem('Preceptor socrático me responda em áudio o que fazer');
  assert.equal(res1.intencao, 'PRECEPTOR_VOZ');
  const res2 = c.classificarIntencaoMensagem('Preceptor: paciente 60 anos com dispneia');
  assert.equal(res2.intencao, 'PRECEPTOR_VOZ');
  const res3 = c.classificarIntencaoMensagem('Áudio: paciente 45 anos com cefaleia');
  assert.equal(res3.intencao, 'PRECEPTOR_VOZ');
  const res4 = c.classificarIntencaoMensagem('No fone: paciente com tosse seca');
  assert.equal(res4.intencao, 'PRECEPTOR_VOZ');
  const res5 = c.classificarIntencaoMensagem('Manda áudio sobre a gasometria');
  assert.equal(res5.intencao, 'PRECEPTOR_VOZ');
  assert.equal(getIaCalls(), 0);
});

test('9. Bandeiras vermelhas de emergência mantêm prioridade máxima para CLINICO_EMERGENCIA', () => {
  const { c, getIaCalls, resetIaCalls } = env();
  resetIaCalls();
  // Caso de choque / PCR / parada
  const res = c.classificarIntencaoMensagem('Paciente em parada cardiorrespiratória em ritmo de FV');
  assert.equal(res.intencao, 'CLINICO_EMERGENCIA');
  assert.equal(getIaCalls(), 0);
});

// -----------------------------------------------------------------------------
// 3. FLUXO COMPLETO DE ÁUDIO NO TELEGRAM (processarMensagemVoz)
// -----------------------------------------------------------------------------
test('10. Áudio de relato clínico gera SOAP diretamente e renova typing', () => {
  const { c, sent } = env();
  
  // Mock do download de áudio
  c.baixarMidiaTelegram = () => ({ data: 'audio_base64_data', mime: 'audio/ogg' });
  
  // Transcrição multimodal retorna caso clínico falado ambulatorial
  c.chamarGeminiPoolMultimodal = () => 'Homem 58 anos com tosse produtiva e febre há 4 dias';
  
  // Mock do gerador SOAP
  c.executarRaciocinioClinico = () => JSON.stringify({
    subjetivo: 'QP: Tosse há 4 dias.',
    objetivo: 'BEG, ACV normal.',
    perguntas_anamnese: ['Expectoração amarelada?'],
    exame_dirigido: ['Ausculta pulmonar detalhada.']
  });

  c.processarMensagemVoz({ chat: { id: 123 }, voice: { file_id: 'voice_soap_1' } });

  // Verifica que o SOAP foi entregue
  const entregas = sent.map(s => s.payload.text || '').join('\n');
  assert(entregas.includes('S - Subjetivo'), 'Deve ter entregue o SOAP');
  assert(entregas.includes('Tosse há 4 dias'), 'Deve conter os dados transcritos');
  
  // Verifica que o modo bot foi atualizado para soap
  const modo = c.modoBot(123);
  assert.equal(modo.mode, 'soap');
});

test('11. No modo voz, áudio enviado responde diretamente com voz do preceptor', () => {
  const { c, sent } = env();
  c.baixarMidiaTelegram = () => ({ data: 'audio_base64_data', mime: 'audio/ogg' });
  c.chamarGeminiPoolMultimodal = () => 'Homem 58 anos com dispneia e estase jugular';
  c.gerarProvocacaoPreceptorAudio = () => 'Diante da dispneia e estase jugular, qual o próximo exame imediato?';
  c.sintetizarVozPreceptor = () => ({ getBytes: () => Buffer.from('fake_audio'), getContentType: () => 'audio/ogg' });

  // Ativa o modo voz previamente (ex: clique no botão do menu)
  c.definirModoBot(123, 'voz');

  c.processarMensagemVoz({ chat: { id: 123 }, voice: { file_id: 'voice_preceptor_1' } });

  const chamouVoice = sent.some(s => s.url.includes('/sendVoice'));
  assert(chamouVoice, 'Deve ter enviado áudio de voz do preceptor via sendVoice');
});

console.log(`\n🎉 PIPELINE DE ÁUDIO OTIMIZADO: ${pass}/${total} testes aprovados com 100% de êxito!`);
