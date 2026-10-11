/**
 * TESTE DA FUNCIONALIDADE OU VIR NO FONE (TTS & RESILIÊNCIA DE ÁUDIO NO TELEGRAM)
 * Valida:
 * 1. formatarTextoParaVoz: sanitização de markdown, emojis, tabelas e expansão de abreviações médicas
 * 2. enviarAudioVozTelegram: truncamento defensivo da legenda (<= 1000 chars) e contingência sendAudio
 * 3. tratarCallbackPreceptorSocratico_: tratamento de ouvirPreceptor_ com cache e fallback para cb.message.text
 * 4. responderPreceptorVozComIA: modo apenasNarrar gerando áudio com legenda concisa sem falha de caption
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const source = fs.readFileSync(path.resolve(__dirname, '../ultra_rotina_master.js'), 'utf8');

function setupContext(customProps = {}) {
  const props = {
    TELEGRAM_CHAT_ID: '123456',
    TELEGRAM_BOT_TOKEN: 'fake-token-test',
    GEMINI_API_KEY: 'fake-gemini-key',
    ...customProps
  };
  const cache = {};
  const chamadasHttp = [];

  const p = {
    getProperty: k => props[k] ?? null,
    setProperty: (k, v) => { props[k] = String(v); },
    deleteProperty: k => { delete props[k]; },
    getProperties: () => ({ ...props })
  };

  const c = {
    Buffer,
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
        chamadasHttp.push({ url, opts });
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ ok: true, result: { message_id: 111 } }),
          getBlob: () => ({
            setContentType: () => {},
            setName: () => {},
            getBytes: () => Buffer.from('fake-audio-bytes'),
            getContentType: () => 'audio/mpeg'
          })
        };
      }
    }
  };

  vm.createContext(c);
  vm.runInContext(source, c);
  return { ctx: c, cache, chamadasHttp };
}

// 1. Validação de formatarTextoParaVoz
{
  const { ctx } = setupContext();
  const rawText = "📋 *SOAP CLÍNICO*\n\n" +
    "Paciente em BEG, com PA 130x80 mmHg, FC 75 bpm, FR 16 irpm e SpO2 98%.\n" +
    "Prescrito: Losartana 50mg VO 1x/dia e Ceftriaxona 1g EV de 12/12h.\n" +
    "| Med | Dose |\n| Losartana | 50mg |\n---\n```codigo```";

  const falado = ctx.formatarTextoParaVoz(rawText);
  assert(!falado.includes("📋"), "Deve remover emojis");
  assert(!falado.includes("```"), "Deve remover blocos de código");
  assert(!falado.includes("|"), "Deve remover barras de tabela");
  assert(falado.includes("pressão arterial"), "Deve expandir PA para pressão arterial");
  assert(falado.includes("via oral"), "Deve expandir VO para via oral");
  assert(falado.includes("endovenoso"), "Deve expandir EV para endovenoso");
  assert(falado.includes("uma vez ao dia"), "Deve expandir 1x/dia");
  assert(falado.includes("de doze em doze horas"), "Deve expandir de 12/12h");
  console.log("✅ formatarTextoParaVoz sanitiza Markdown e expande abreviações médicas");
}

// 2. Validação de enviarAudioVozTelegram com legenda gigante (> 1024 caracteres)
{
  const { ctx, chamadasHttp } = setupContext();
  const blobFake = {
    getBytes: () => Buffer.from('wav-data'),
    getContentType: () => 'audio/wav',
    getName: () => 'teste.wav'
  };
  const legendaLonga = "Cabeçalho: " + "X".repeat(1500);

  const enviado = ctx.enviarAudioVozTelegram('123456', blobFake, legendaLonga);
  assert.strictEqual(enviado, true, "Deve enviar áudio com sucesso");

  const reqTelegram = chamadasHttp.find(r => r.url.includes('/sendVoice'));
  assert(reqTelegram, "Deve ter chamado sendVoice");
  assert(reqTelegram.opts.payload.caption.length <= 1000, "Caption deve ter sido truncado defensivamente abaixo de 1024 chars");
  assert(reqTelegram.opts.payload.caption.endsWith("..."), "Caption truncado deve terminar com reticências");
  console.log("✅ enviarAudioVozTelegram trunca defensivamente legendas longas para <= 1000 chars");
}

// 3. Validação de contingência sendAudio se sendVoice falhar
{
  const { ctx, chamadasHttp } = setupContext();
  let tentouVoice = false;
  let tentouAudio = false;

  ctx.UrlFetchApp.fetch = (url, opts) => {
    chamadasHttp.push({ url, opts });
    if (url.includes('/sendVoice')) {
      tentouVoice = true;
      return {
        getResponseCode: () => 400,
        getContentText: () => JSON.stringify({ ok: false, description: "Wrong format" })
      };
    }
    if (url.includes('/sendAudio')) {
      tentouAudio = true;
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true, result: { message_id: 222 } })
      };
    }
    return { getResponseCode: () => 200, getContentText: () => "{}" };
  };

  const blobFake = {
    getBytes: () => Buffer.from('wav-data'),
    getContentType: () => 'audio/wav',
    getName: () => 'teste.wav'
  };

  const enviado = ctx.enviarAudioVozTelegram('123456', blobFake, 'Legenda de teste');
  assert.strictEqual(enviado, true, "Deve ter sucesso via contingência sendAudio");
  assert.strictEqual(tentouVoice, true, "Deve ter tentado sendVoice primeiro");
  assert.strictEqual(tentouAudio, true, "Deve ter acionado sendAudio como fallback");
  console.log("✅ enviarAudioVozTelegram aciona contingência sendAudio se sendVoice falhar");
}

// 4. Validação de tratarCallbackPreceptorSocratico_ com cache e com fallback em cb.message.text
{
  const { ctx, cache } = setupContext();
  let narradoComTexto = null;
  ctx.responderPreceptorVozComIA = (chatId, texto, opts) => {
    narradoComTexto = texto;
    return true;
  };

  // Cenário A: Caso presente no cache
  cache["chave123"] = "Paciente com quadro de bronquiolite viral aguda.";
  const cbComCache = {
    id: "cb1",
    message: { chat: { id: "123456" } }
  };
  const ctxA = { chatId: "123456" };
  const resA = ctx.tratarCallbackPreceptorSocratico_(cbComCache, "ouvirPreceptor_chave123", ctxA);
  assert.strictEqual(resA, true);
  assert.strictEqual(narradoComTexto, "Paciente com quadro de bronquiolite viral aguda.");

  // Cenário B: Cache expirado mas mensagem disponível no Telegram
  const cbExpirado = {
    id: "cb2",
    message: { chat: { id: "123456" }, text: "Texto resgatado da mensagem do Telegram." }
  };
  const resB = ctx.tratarCallbackPreceptorSocratico_(cbExpirado, "ouvirPreceptor_chaveExpirada", ctxA);
  assert.strictEqual(resB, true);
  assert.strictEqual(narradoComTexto, "Texto resgatado da mensagem do Telegram.");
  console.log("✅ tratarCallbackPreceptorSocratico_ resgata texto do cache ou da mensagem em tela");
}

// 5. Validação de responderPreceptorVozComIA modo apenasNarrar com SOAP longo
{
  const { ctx, chamadasHttp } = setupContext();
  const casoSoapLongo = "S: Paciente refere tosse.\nO: BEG.\nA: IVAS.\nP: Hidratação e sintomáticos.\n" + "Observação adicional: ".repeat(50);

  ctx.sintetizarVozPreceptor = () => ({
    getBytes: () => Buffer.from('mock-audio'),
    getContentType: () => 'audio/wav',
    getName: () => 'voz.wav'
  });

  const res = ctx.responderPreceptorVozComIA('123456', casoSoapLongo, { apenasNarrar: true });
  assert.strictEqual(res, true, "responderPreceptorVozComIA deve retornar true");

  const reqVoice = chamadasHttp.find(r => r.url.includes('/sendVoice'));
  assert(reqVoice, "Deve ter disparado sendVoice");
  assert(reqVoice.opts.payload.caption.length <= 1000, "Caption não deve exceder limite de 1024 caracteres do Telegram");
  console.log("✅ responderPreceptorVozComIA apenasNarrar entrega áudio com legenda segura");
}

console.log("\n🎯 Todos os testes da funcionalidade 'Ouvir no Fone' passaram com êxito!");
