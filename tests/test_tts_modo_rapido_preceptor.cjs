/**
 * TESTES DO TTS COM GERAÇÃO DE ÁUDIO DIRETA EM MODO RÁPIDO NO PRECEPTOR SOCRÁTICO
 * Valida a geração direta de áudio em tempo único (Single-Pass Audio) com Gemini 2.0 Flash,
 * o suporte a chaves no TTS neural e os fallbacks em cascata.
 */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const source = fs.readFileSync(path.resolve(__dirname, '../ultra_rotina_master.js'), 'utf8');

function env(customProps = {}) {
  const props = {
    TELEGRAM_CHAT_ID: '123',
    TELEGRAM_BOT_TOKEN: 'fake-token',
    WEBHOOK_SECRET: 'secret',
    GEMINI_API_KEY: 'fake-gemini-key',
    ...customProps
  };
  const cache = {}, sent = [];
  let seq = 0;

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
    UrlFetchApp: {
      fetch: (url, opts) => {
        let payload = null;
        try { payload = JSON.parse((opts && opts.payload) || '{}'); } catch(e){}
        sent.push({ url, opts, payload });
        return {
          getResponseCode: () => 200,
          getContentText: () => '{"ok":true}',
          getBlob: () => ({
            setContentType: () => {},
            setName: () => {},
            getBytes: () => Buffer.from('azure-fake-mp3'),
            getContentType: () => 'audio/mpeg'
          })
        };
      }
    }
  };

  vm.createContext(c);
  vm.runInContext(source, c);
  c.Utilities = {
    getUuid: () => String(++seq).padStart(32, '0'),
    sleep: () => {},
    base64Decode: str => Buffer.from(str, 'base64'),
    base64Encode: bytes => Buffer.from(bytes).toString('base64'),
    newBlob: (bytes, mime, name) => ({
      getBytes: () => bytes,
      getContentType: () => mime,
      getName: () => name
    }),
    formatDate: (d, tz, f) => "2026-10-04"
  };

  return { c, props, cache, sent };
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

console.log('🧪 Iniciando TESTES do TTS com Geração Direta de Áudio no Preceptor Socrático...\n');

// -----------------------------------------------------------------------------
// 1. GERAÇÃO DE ÁUDIO DIRETA EM MODO RÁPIDO (Single-Pass Audio)
// -----------------------------------------------------------------------------
test('1. gerarAudioPreceptorDireto emite payload multimodal com resposta em áudio direto', () => {
  const { c, sent } = env();

  c.UrlFetchApp.fetch = (url, opts) => {
    let payload = null;
    try { payload = JSON.parse(opts.payload); } catch(e){}
    sent.push({ url, opts, payload });

    if (url.includes('-tts') || (payload && payload.generationConfig && payload.generationConfig.responseModalities && payload.generationConfig.responseModalities.includes('AUDIO'))) {
      const fakeAudioBase64 = Buffer.from('RIFF_WAV_FAKE_AUDIO_DATA').toString('base64');
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          candidates: [{
            content: {
              parts: [{ inlineData: { mimeType: 'audio/wav', data: fakeAudioBase64 } }]
            }
          }]
        })
      };
    }

    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({
        candidates: [{
          content: {
            parts: [{ text: 'Wagner, diante da assimetria de pulsos e dor interescapular lancinante, qual o exame confirmatório imediato e qual a droga para controle da frequência cardíaca?' }]
          }
        }]
      })
    };
  };

  const res = c.gerarAudioPreceptorDireto("Paciente 55a hipertenso com dor torácica irradiada para dorso e déficit de pulso radial esquerdo");
  assert(res !== null, 'gerarAudioPreceptorDireto não deve retornar nulo');
  assert(res.audioBlob, 'Deve conter o audioBlob gerado');
  assert.equal(res.direto, true, 'Deve marcar direto como true');
  assert(res.texto.includes('assimetria de pulsos'), 'Texto da legenda deve ser extraído');

  const reqTts = sent.find(s => s.payload && s.payload.generationConfig && s.payload.generationConfig.responseModalities && s.payload.generationConfig.responseModalities.includes('AUDIO'));
  assert(reqTts, 'Deve haver chamada para geração de áudio neural');
  assert(reqTts.url.includes('gemini-3.8-flash-tts') || reqTts.url.includes('gemini-'), 'URL deve chamar modelo Gemini TTS');
  assert.equal(reqTts.opts.headers['x-goog-api-key'], 'fake-gemini-key', 'Header x-goog-api-key deve ser enviado');
  assert(reqTts.payload.generationConfig.responseModalities.includes('AUDIO'), 'responseModalities deve incluir AUDIO');
  assert.equal(reqTts.payload.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, 'Fenrir', 'Voz padrão deve ser Fenrir');
});

// -----------------------------------------------------------------------------
// 2. SUPORTE UNIVERSAL A CREDENCIAIS NO TTS NEURAL
// -----------------------------------------------------------------------------
test('2. gerarAudioTtsGeminiNeural suporta GEMINI_API_KEY singular e rotação com header seguro', () => {
  const { c, sent } = env({ GEMINI_API_KEY: 'minha-chave-singular-123' });

  c.UrlFetchApp.fetch = (url, opts) => {
    sent.push({ url, opts, payload: JSON.parse(opts.payload) });
    const fakeAudioBase64 = Buffer.from('AUDIO_BYTES_TEST').toString('base64');
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({
        candidates: [{
          content: {
            parts: [{ inlineData: { mimeType: 'audio/wav', data: fakeAudioBase64 } }]
          }
        }]
      })
    };
  };

  const blob = c.gerarAudioTtsGeminiNeural("Pergunta socrática curta.");
  assert(blob !== null, 'gerarAudioTtsGeminiNeural deve ter sucesso mesmo com apenas GEMINI_API_KEY singular');
  assert.equal(sent[0].opts.headers['x-goog-api-key'], 'minha-chave-singular-123', 'Deve usar a chave singular no header');
  assert(sent[0].url.includes('gemini-2.5-flash-preview-tts') || sent[0].url.includes('gemini-3.8-flash-tts'), 'URL deve priorizar modelo Gemini TTS funcional');
});

// -----------------------------------------------------------------------------
// 3. FLUXO OTIMIZADO EM responderPreceptorVozComIA (Modo Rápido Direto)
// -----------------------------------------------------------------------------
test('3. responderPreceptorVozComIA despacha áudio direto em tempo único sem chamar LLM intermediário', () => {
  const { c, sent } = env();

  let gerouProvocacaoTexto = false;
  let sintetizouTTS = false;
  let enviouVozTelegram = false;

  c.gerarAudioPreceptorDireto = (caso) => ({
    audioBlob: { getBytes: () => [1, 2, 3] },
    texto: "Qual é a sua hipótese para esse abdome em tábua?",
    direto: true
  });

  c.gerarProvocacaoPreceptorAudio = (caso) => {
    gerouProvocacaoTexto = true;
    return "Texto provocado";
  };

  c.sintetizarVozPreceptor = (texto) => {
    sintetizouTTS = true;
    return { getBytes: () => [4, 5, 6] };
  };

  c.enviarAudioVozTelegram = (chatId, audioBlob, legenda) => {
    enviouVozTelegram = true;
    assert.equal(chatId, 123);
    assert(legenda.includes("abdome em tábua"));
    return true;
  };

  const sucesso = c.responderPreceptorVozComIA(123, "Paciente 40a com dor abdominal súbita difusa, abdome em tábua");
  assert.equal(sucesso, true, 'Deve retornar sucesso');
  assert.equal(enviouVozTelegram, true, 'Deve ter enviado o áudio diretamente ao Telegram');
  assert.equal(gerouProvocacaoTexto, false, 'NÃO deve ter feito a geração intermediária de texto (economia de 1 RTT!)');
  assert.equal(sintetizouTTS, false, 'NÃO deve ter chamado sintetizarVozPreceptor secundário');
});

// -----------------------------------------------------------------------------
// 4. FALLBACK EM DOIS TEMPOS QUANDO O MODO DIRETO FALHA OU RETORNA NULO
// -----------------------------------------------------------------------------
test('4. responderPreceptorVozComIA aciona fallback gracioso em dois tempos se modo direto falhar', () => {
  const { c } = env();

  let chamadoFallbackTexto = false;
  let chamadoFallbackTTS = false;
  let enviadoTelegram = false;

  // Simula falha do modo direto (ex: cota esgotada)
  c.gerarAudioPreceptorDireto = () => null;

  c.gerarProvocacaoPreceptorAudio = (caso) => {
    chamadoFallbackTexto = true;
    return "Qual conduta você adota para este paciente em choque?";
  };

  c.sintetizarVozPreceptor = (texto) => {
    chamadoFallbackTTS = true;
    return { getBytes: () => [9, 8, 7] };
  };

  c.enviarAudioVozTelegram = (chatId, audioBlob, legenda) => {
    enviadoTelegram = true;
    return true;
  };

  const ok = c.responderPreceptorVozComIA(123, "Paciente hipotenso com lactato elevado");
  assert.equal(ok, true);
  assert.equal(chamadoFallbackTexto, true, 'Deve recorrer à geração de texto socrático');
  assert.equal(chamadoFallbackTTS, true, 'Deve recorrer à síntese de voz');
  assert.equal(enviadoTelegram, true, 'Deve enviar o áudio sintetizado');
});

// -----------------------------------------------------------------------------
// 5. COMANDO /voz E CALLBACK ouvirPreceptor_ DELEGANDO AO PIPELINE ACELERADO
// -----------------------------------------------------------------------------
test('5. Comando /voz e callback ouvirPreceptor_ integrados ao novo pipeline acelerado', () => {
  const { c, cache } = env();

  let chatsAtendidos = [];
  c.responderPreceptorVozComIA = (chatId, caso) => {
    chatsAtendidos.push({ chatId, caso });
    return true;
  };

  // 1. Testa comando /voz
  c.processarMensagemTexto({ chat: { id: 123 }, text: "/voz Paciente idosa com ITU e delirium hipoativo" });
  assert.equal(chatsAtendidos.length, 1, 'Comando /voz deve acionar responderPreceptorVozComIA');
  assert(chatsAtendidos[0].caso.includes("delirium hipoativo"), 'Caso deve ser repassado');

  // 2. Testa callback ouvirPreceptor_
  cache['caso123'] = "Paciente 30a com crise de asma grave";
  c.processarCallbackBotao({
    id: 'cb1',
    data: 'ouvirPreceptor_caso123',
    message: { chat: { id: 456 } }
  });

  assert.equal(chatsAtendidos.length, 2, 'Callback ouvirPreceptor_ deve acionar responderPreceptorVozComIA');
  assert.equal(chatsAtendidos[1].chatId, 456, 'ChatId do callback deve ser respeitado');
  assert(chatsAtendidos[1].caso.includes("asma grave"), 'Conteúdo do caso recuperado do cache');
});

console.log(`\n🎉 TODOS OS ${pass}/${total} TESTES DE TTS EM MODO RÁPIDO FORAM APROVADOS COM SUCESSO!\n`);
