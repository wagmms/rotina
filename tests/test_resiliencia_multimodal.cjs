/**
 * TESTES DE RESILIÊNCIA E SANITIZAÇÃO MULTIMODAL (ÁUDIO E IMAGEM)
 * Valida:
 * 1. baixarMidiaTelegram tolera erros HTTP e exceções de rede retornando null com segurança.
 * 2. Normalização estrita de MIME types aceitos pelo Gemini (oga/opus -> audio/ogg; jpg -> image/jpeg).
 * 3. _iaLista descarta modelos obsoletos mesmo se persistidos em ScriptProperties.
 * 4. Tratamento informativo de exceções em processarMensagemVoz e processarMensagemFoto.
 */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const source = fs.readFileSync(path.resolve(__dirname, '../ultra_rotina_master.js'), 'utf8');

function criarAmbiente(fetchMock) {
  const props = {
    TELEGRAM_CHAT_ID: '123',
    TELEGRAM_BOT_TOKEN: 'fake-token-123',
    WEBHOOK_SECRET: 'secret',
    GEMINI_API_KEY: 'fake-gemini-key'
  };
  const cache = {}, sent = [];
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
    Buffer, console: { log() {}, error() {} },
    PropertiesService: { getScriptProperties: () => p },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] ?? null, put: (k, v) => { cache[k] = String(v); }, remove: k => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }), getUserLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    HtmlService: { createHtmlOutput: body => ({ body }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: body => ({ body, setMimeType() { return this; } }) },
    ScriptApp: { getProjectTriggers: () => [] },
    Utilities: {
      getUuid: () => 'uuid-' + Math.random().toString(36).slice(2),
      base64Encode: bytes => Buffer.from(bytes || '').toString('base64'),
      sleep: () => {}
    },
    Logger: { log: () => {} },
    UrlFetchApp: {
      fetch: fetchMock || ((url, opts) => {
        sent.push({ url, opts });
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ ok: true, result: { file_path: 'voice/sample.oga' } }),
          getBlob: () => ({
            getContentType: () => 'audio/oga',
            getBytes: () => Buffer.from('audio_bytes')
          })
        };
      })
    }
  };

  vm.createContext(c);
  vm.runInContext(source, c);
  return { c, props, cache, sent };
}

let total = 0, passed = 0;
function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(e);
  }
}

console.log('--- TESTES DE RESILIÊNCIA MULTIMODAL ---');

test('1. baixarMidiaTelegram normaliza áudio .oga/audio/oga para audio/ogg compatível com Gemini', () => {
  const { c } = criarAmbiente((url) => {
    if (url.includes('/getFile')) {
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true, result: { file_path: 'voice/audio_gravado.oga' } })
      };
    }
    return {
      getResponseCode: () => 200,
      getBlob: () => ({
        getContentType: () => 'audio/oga',
        getBytes: () => Buffer.from('fake-audio-payload')
      })
    };
  });

  const midia = c.baixarMidiaTelegram({ file_id: 'voz_1' });
  assert(midia !== null, 'Deveria baixar com sucesso');
  assert.strictEqual(midia.mime, 'audio/ogg', 'MIME deve ser audio/ogg');
  assert(midia.data, 'Deve conter os dados base64');
});

test('2. baixarMidiaTelegram tolera HTTP 404/500 no download sem lançar exceção', () => {
  const { c } = criarAmbiente((url) => {
    if (url.includes('/getFile')) {
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true, result: { file_path: 'photos/expirado.jpg' } })
      };
    }
    // Falha no download do binário
    return {
      getResponseCode: () => 404,
      getContentText: () => 'Not Found'
    };
  });

  const midia = c.baixarMidiaTelegram({ file_id: 'foto_expirada' });
  assert.strictEqual(midia, null, 'Deveria retornar null de forma segura quando HTTP != 200');
});

test('3. baixarMidiaTelegram tolera exceção de timeout de rede sem quebrar', () => {
  const { c } = criarAmbiente(() => {
    throw new Error('Connection timed out after 30000ms');
  });

  const midia = c.baixarMidiaTelegram({ file_id: 'foto_timeout' });
  assert.strictEqual(midia, null, 'Deveria retornar null capturando a exceção de rede');
});

test('4. _iaLista descarta modelos obsoletos mesmo se configurados em PropertiesService', () => {
  const { c, props } = criarAmbiente();
  props.IA_MODELOS_CLINICOS_GEMINI = 'gemini-2.5-pro,gemini-2.5-flash,gemini-3.5-flash';
  c.ConfigService.invalidar();

  const modelos = c._iaLista('IA_MODELOS_CLINICOS_GEMINI', ['gemini-3.5-flash']);
  assert.strictEqual(JSON.stringify(modelos), JSON.stringify(['gemini-3.5-flash']), 'Deve descartar 2.5-pro e 2.5-flash e manter apenas 3.5-flash');
});

test('5. _iaLista usa padrão vigente se todos os modelos em PropertiesService forem obsoletos', () => {
  const { c, props } = criarAmbiente();
  props.IA_MODELOS_CLINICOS_GEMINI = 'gemini-2.0-flash,gemini-1.5-flash';
  c.ConfigService.invalidar();

  const padrao = ['gemini-3.5-flash', 'gemini-flash-lite-latest'];
  const modelos = c._iaLista('IA_MODELOS_CLINICOS_GEMINI', padrao);
  assert.strictEqual(JSON.stringify(modelos), JSON.stringify(padrao), 'Deve recorrer ao padrão vigente');
});

test('6. processarMensagemFoto inclui mensagem detalhada do erro no catch', () => {
  const { c } = criarAmbiente();
  let msgEnviada = '';
  c.enviarMensagemParaChat = (chatId, texto) => { msgEnviada = texto; };
  c.baixarMidiaTelegram = () => { throw new Error('Falha simulada de I/O'); };

  c.processarMensagemFoto({
    chat: { id: 123 },
    photo: [{ file_id: 'p1' }, { file_id: 'p2' }]
  });

  assert(msgEnviada.includes('⚠️ Erro ao processar imagem: Falha simulada de I/O'), 'Deve conter o detalhe da exceção');
});

test('7. processarMensagemVoz inclui mensagem detalhada do erro no catch', () => {
  const { c } = criarAmbiente();
  let msgEnviada = '';
  c.enviarMensagemParaChat = (chatId, texto) => { msgEnviada = texto; };
  c.baixarMidiaTelegram = () => { throw new Error('Falha de memória base64'); };

  c.processarMensagemVoz({
    chat: { id: 123 },
    voice: { file_id: 'v1' }
  });

  assert(msgEnviada.includes('⚠️ Erro ao processar áudio: Falha de memória base64'), 'Deve conter o detalhe da exceção');
});

console.log(`\nResultado: ${passed}/${total} testes passaram.`);
if (passed !== total) process.exit(1);
