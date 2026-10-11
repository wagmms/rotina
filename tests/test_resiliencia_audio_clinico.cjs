const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const vm = require('node:vm');
const source = require('./source_producao.cjs');

function criarAmbienteTeste() {
  const props = {
    TELEGRAM_CHAT_ID: '123456',
    TELEGRAM_BOT_TOKEN: 'fake-token-test',
    WEBHOOK_SECRET: 'secret-test',
    GEMINI_API_KEY: 'fake-gemini-key'
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
    Buffer,
    Date: Clock,
    console: { log() {}, error() {}, warn() {} },
    PropertiesService: { getScriptProperties: () => p },
    CacheService: {
      getScriptCache: () => ({
        get: k => cache[k] ?? null,
        put: (k, v) => { cache[k] = String(v); },
        remove: k => { delete cache[k]; }
      })
    },
    LockService: {
      getScriptLock: () => ({ waitLock() {}, releaseLock() {} }),
      getUserLock: () => ({ tryLock: () => true, releaseLock() {} })
    },
    HtmlService: { createHtmlOutput: body => ({ body }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: body => ({ body, setMimeType() { return this; } }) },
    ScriptApp: { getProjectTriggers: () => [] },
    UrlFetchApp: {
      fetch: (url, opts) => {
        sent.push({ url, payload: JSON.parse((opts && opts.payload) || '{}') });
        return { getResponseCode: () => 200, getContentText: () => '{"ok":true}' };
      }
    }
  };
  vm.createContext(c);
  vm.runInContext(source, c);
  c.Utilities.getUuid = () => String(++seq).padStart(32, '0');
  c.Utilities.sleep = () => {};
  c.Utilities.newBlob = s => ({ getBytes: () => [...Buffer.from(s)] });
  c.Utilities.computeHmacSha256Signature = (valor, chave) => [...crypto.createHmac('sha256', Buffer.from(chave)).update(Buffer.from(valor)).digest()];
  return { c, props, cache, sent };
}

test('Resiliência de Áudio Clínico e Transcrição Multimodal', async (t) => {
  const { c } = criarAmbienteTeste();

  await t.test('Deve expor processarAudioMensagemTelegram como alias funcional de processarMensagemVoz', () => {
    assert.equal(typeof c.processarAudioMensagemTelegram, 'function');
    assert.equal(typeof c.processarMensagemVoz, 'function');
  });

  await t.test('Deve sanitizar MIME types de áudio complexos e ativar fallback offline em caso de falha de IA', () => {
    // Simula falha em chamarGeminiPoolMultimodal
    const origChamar = c.chamarGeminiPoolMultimodal;
    c.chamarGeminiPoolMultimodal = () => {
      throw new Error('API Gemini Unavailable 503');
    };

    try {
      const res = c.processarAudioClinicoMultimodal('dGVzdGU=', 'audio/ogg; codecs=opus', {
        caption: 'Paciente leito 4 febril taquicardico',
        fallbackOffline: true
      });

      assert.ok(res, 'Deve retornar resultado de contingência offline');
      assert.equal(res.sucesso, true);
      assert.equal(res.eh_clinico, true);
      assert.equal(res.contingencia_offline, true);
      assert.equal(res.tipo_relato, 'leito');
      assert.equal(res.numero_leito, '4');
      assert.ok(res.transcricao.includes('leito 4'));
    } finally {
      c.chamarGeminiPoolMultimodal = origChamar;
    }
  });

  await t.test('Deve retornar SOAP direto no Cockpit quando áudio for estruturado em tempo único', () => {
    const origProcessar = c.processarAudioClinicoMultimodal;
    c.processarAudioClinicoMultimodal = () => {
      return {
        sucesso: true,
        transcricao: 'Paciente relata dor toracica ventilatorio dependente ha 2 dias.',
        eh_clinico: true,
        tipo_relato: 'soap',
        soapTexto: 'Subjetivo: Dor toracica ha 2 dias.\nObjetivo: Murmurio vesicular preservado sem ruidos adventicios.',
        contingencia_offline: true
      };
    };

    try {
      const url = c.obterUrlCockpit('123456');
      const session = new URL(url).searchParams.get('session');

      const resCockpit = c.cockpitConversar(session, {
        acao: 'enviar',
        audioBase64: 'base64_audio_mock',
        mime: 'audio/webm'
      });

      assert.ok(resCockpit, 'Deve responder à interação com áudio');
      assert.equal(resCockpit.sucesso, true);
      assert.ok(resCockpit.resposta.includes('Subjetivo: Dor toracica'));
      assert.equal(resCockpit.contingencia_offline, true);
    } finally {
      c.processarAudioClinicoMultimodal = origProcessar;
    }
  });

  await t.test('Cockpit deve acionar fallback offline gracioso se o provedor falhar e não estourar exceção', () => {
    const origProcessar = c.processarAudioClinicoMultimodal;
    const origChamar = c.chamarGeminiPoolMultimodal;

    c.processarAudioClinicoMultimodal = () => {
      throw new Error('Falha de rede ou timeout de inferência de áudio');
    };
    c.chamarGeminiPoolMultimodal = () => {
      throw new Error('Timeout de transcrição');
    };

    try {
      const url = c.obterUrlCockpit('123456');
      const session = new URL(url).searchParams.get('session');

      const resCockpit = c.cockpitConversar(session, {
        acao: 'enviar',
        audioBase64: 'base64_audio_mock',
        mime: 'audio/ogg; codecs=opus',
        texto: 'Passagem de plantao leito 12'
      });

      assert.ok(resCockpit, 'Deve concluir com sucesso via fallback offline');
      assert.equal(resCockpit.sucesso, true);
      assert.equal(resCockpit.contingencia_offline, true);
    } finally {
      c.processarAudioClinicoMultimodal = origProcessar;
      c.chamarGeminiPoolMultimodal = origChamar;
    }
  });
});
