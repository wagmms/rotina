/**
 * ==============================================================================
 * MÓDULO 01: UTILITÁRIOS, SANITIZAÇÃO E COMUNICAÇÃO TELEGRAM
 * ==============================================================================
 */

// Shim de compatibilidade universal (Node.js / Ambientes de Teste / GAS)
if (typeof Logger === "undefined") {
  var Logger = {
    log: function(msg) {
      if (typeof console !== "undefined" && console.log) {
        // Silencioso em testes ou log se necessário
      }
    }
  };
}

if (typeof PropertiesService === "undefined") {
  var _mockScriptProps = {};
  var PropertiesService = {
    getScriptProperties: function() {
      return {
        getProperty: function(k) { return _mockScriptProps[k] !== undefined ? _mockScriptProps[k] : null; },
        setProperty: function(k, v) { _mockScriptProps[k] = String(v); },
        deleteProperty: function(k) { delete _mockScriptProps[k]; },
        getProperties: function() { return _mockScriptProps; }
      };
    }
  };
}

if (typeof Utilities === "undefined") {
  var Utilities = {
    formatDate: function(date, tz, format) {
      var d = new Date(date);
      var pad = function(n) { return n < 10 ? "0" + n : "" + n; };
      var yyyy = d.getFullYear();
      var MM = pad(d.getMonth() + 1);
      var dd = pad(d.getDate());
      var HH = pad(d.getHours());
      var mm = pad(d.getMinutes());
      var ss = pad(d.getSeconds());
      return format.replace("yyyy", yyyy)
                   .replace("MM", MM)
                   .replace("dd", dd)
                   .replace("HH", HH)
                   .replace("mm", mm)
                   .replace("ss", ss)
                   .replace("EEE", "Seg");
    },
    getUuid: function() {
      return "mock-uuid-" + Math.random().toString(36).substring(2, 10);
    },
    base64Encode: function(bytes) {
      return Buffer.from(bytes || "").toString("base64");
    },
    newBlob: function(content, contentType, name) {
      var blobName = name || "arquivo";
      return {
        getDataAsString: function() { return String(content); },
        getBytes: function() { return Buffer.from(String(content)); },
        getContentType: function() { return contentType; },
        getName: function() { return blobName; },
        setName: function(n) { blobName = n; return this; },
        getAs: function(newType) {
          var asName = (blobName || "arquivo").replace(/\.[^.]+$/, "") + ".pdf";
          return {
            getDataAsString: function() { return String(content); },
            getBytes: function() { return Buffer.from(String(content)); },
            getContentType: function() { return newType; },
            getName: function() { return asName; },
            setName: function(n) { asName = n; return this; }
          };
        }
      };
    }
  };
}

if (typeof CalendarApp === "undefined") {
  var _mockEventosCalendario = [];
  var CalendarApp = {
    getDefaultCalendar: function() {
      return {
        getEvents: function(inicio, fim) { return _mockEventosCalendario; },
        createEvent: function(titulo, inicio, fim, opts) {
          var ev = {
            getId: function() { return "mock-event-" + Math.random().toString(36).substring(2, 8); },
            getTitle: function() { return titulo; },
            getStartTime: function() { return inicio; },
            getEndTime: function() { return fim; },
            getLocation: function() { return (opts && opts.location) || ""; },
            getDescription: function() { return (opts && opts.description) || ""; },
            isAllDayEvent: function() { return false; }
          };
          _mockEventosCalendario.push(ev);
          return ev;
        }
      };
    },
    _setMockEventos: function(lista) {
      _mockEventosCalendario = lista || [];
    }
  };
}

var SAFE_CACHE_TTL = 21600; // Limite máximo de segurança do CacheService no Google Apps Script (6 horas)




function safePutCache(cache, key, value, ttlSeconds) {
  var ttl = Math.min(ttlSeconds || SAFE_CACHE_TTL, SAFE_CACHE_TTL);
  try {
    cache.put(key, String(value), ttl);
    return true;
  } catch (e) {
    Logger.log("Erro ao gravar no CacheService [" + key + "]: " + e.message);
    return false;
  }
}

function obterDiaSemanaExtenso(data) {
  var dias = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  return dias[data.getDay()];
}

/**
 * Sanitizador Universal de Markdown para o Telegram Bot API.
 * Remove fragmentos LaTeX, fecha marcações ímpares (* e _) e trata caracteres sensíveis.
 */
function limparMarkdownTelegram(texto) {
  if (!texto) return "";
  var str = String(texto);

  // 1. Converte sintaxe LaTeX ($ ou $$ ou \frac) para texto simples
  str = str.replace(/\$\$([\s\S]*?)\$\$/g, "$1")
           .replace(/\$([^\$\n]+)\$/g, "$1")
           .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1 / $2)")
           .replace(/\\times/g, "x")
           .replace(/\\cdot/g, "·");

  // 2. Normaliza asteriscos duplicados
  str = str.replace(/\*\*/g, "*").replace(/\\\*/g, "*");

  // 3. Balanceamento de asteriscos (*)
  var countAsterisk = (str.match(/\*/g) || []).length;
  if (countAsterisk % 2 !== 0) {
    var lastIdx = str.lastIndexOf("*");
    if (lastIdx !== -1) {
      str = str.substring(0, lastIdx) + str.substring(lastIdx + 1);
    }
  }

  // 4. Balanceamento de underscores (_)
  var countUnderscore = (str.match(/_/g) || []).length;
  if (countUnderscore % 2 !== 0) {
    var lastIdxU = str.lastIndexOf("_");
    if (lastIdxU !== -1) {
      str = str.substring(0, lastIdxU) + str.substring(lastIdxU + 1);
    }
  }

  return str;
}

/**
 * Fragmentação inteligente de strings com preservação de emojis e limites de janela.
 */
function fragmentarTexto(texto, limite) {
  texto = String(texto || "");
  var maxLimit = limite || 3800;
  var partes = [];
  var pos = 0;

  while (pos < texto.length) {
    var fim = Math.min(pos + maxLimit, texto.length);
    if (fim < texto.length) {
      var ultimaQuebra = texto.lastIndexOf("\n", fim);
      if (ultimaQuebra > pos && (fim - ultimaQuebra) < 800) {
        fim = ultimaQuebra + 1;
      } else {
        var ultimoEspaco = texto.lastIndexOf(" ", fim);
        if (ultimoEspaco > pos) {
          fim = ultimoEspaco;
        } else if (/[\uD800-\uDBFF]/.test(texto.charAt(fim - 1))) {
          fim--;
        }
      }
    }
    partes.push(texto.slice(pos, fim).trim());
    while (fim < texto.length && (texto.charAt(fim) === " " || texto.charAt(fim) === "\n")) {
      fim++;
    }
    pos = fim;
  }
  return partes.filter(function(p) { return p.length > 0; });
}

// Compatibilidade de nome antigo
function fragmentarTextoParaNotion(texto, limite) {
  return fragmentarTexto(texto, limite || 1900);
}

// ==============================================================================
// COMUNICAÇÕES TELEGRAM
// ==============================================================================

function enviarChatAction(chatId, acao) {
  var token = ConfigService.get("TELEGRAM_BOT_TOKEN");
  if (!token) return;
  executarPostTelegram("https://api.telegram.org/bot" + token + "/sendChatAction", {
    "chat_id": chatId,
    "action": acao || "typing"
  });
}

function enviarMensagemParaChat(chatId, texto) {
  return enviarMensagemSegmentada(chatId, texto, null);
}

function enviarMensagemComTecladoParaChat(chatId, texto, teclado) {
  return enviarMensagemSegmentada(chatId, texto, teclado);
}

function enviarMensagemSegmentada(chatId, texto, teclado) {
  if (!texto) return false;
  var token = ConfigService.get("TELEGRAM_BOT_TOKEN");
  if (!token) return false;

  var partes = fragmentarTexto(texto, 3800);
  var sucessoGeral = true;

  for (var i = 0; i < partes.length; i++) {
    var ehUltima = (i === partes.length - 1);
    var contemHtml = /<\/?(?:b|i|u|s|code|pre|a)\b/i.test(partes[i]);
    var textoEnvio = contemHtml ? partes[i] : limparMarkdownTelegram(partes[i]);
    var payload = {
      "chat_id": chatId,
      "text": textoEnvio,
      "parse_mode": contemHtml ? "HTML" : "Markdown"
    };
    if (ehUltima && teclado) {
      payload.reply_markup = teclado;
    }

    var enviado = executarPostTelegram("https://api.telegram.org/bot" + token + "/sendMessage", payload);
    if (!enviado) sucessoGeral = false;

    if (partes.length > 1 && !ehUltima) {
      Utilities.sleep(500);
    }
  }
  return sucessoGeral;
}

function responderCallbackTelegram(callbackId, textoToast) {
  var token = ConfigService.get("TELEGRAM_BOT_TOKEN");
  if (!token) return;
  executarPostTelegram("https://api.telegram.org/bot" + token + "/answerCallbackQuery", {
    "callback_query_id": callbackId,
    "text": textoToast || "",
    "show_alert": false
  });
}

function removerBotaoInline(callbackQuery) {
  if (!callbackQuery || !callbackQuery.message) return;
  var token = ConfigService.get("TELEGRAM_BOT_TOKEN");
  if (!token) return;
  var url = "https://api.telegram.org/bot" + token + "/editMessageReplyMarkup";
  var payload = {
    "chat_id": callbackQuery.message.chat.id,
    "message_id": callbackQuery.message.message_id,
    "reply_markup": { "inline_keyboard": [] }
  };
  executarPostTelegram(url, payload);
}

/**
 * Sanitiza e valida o peso em kg para calculadoras clínicas.
 * Aceita vírgula ou ponto decimal, rejeita caracteres não numéricos e valores não finitos ou <= 0.
 * Retorna o float numérico ou null se inválido.
 */
function sanitizarEValidarPesoKg(valor) {
  if (valor === undefined || valor === null) return null;
  var str = String(valor).trim().replace(",", ".");
  if (!/^(\d+(\.\d+)?)$/.test(str)) return null;
  var num = parseFloat(str);
  if (!isFinite(num) || isNaN(num) || num <= 0 || num > 500) return null;
  return num;
}

function executarPostTelegram(url, payload) {
  var metodo=url.split("/").pop();
  if(typeof PersistenciaBot!=="undefined" && ["sendMessage","editMessageText","editMessageReplyMarkup"].indexOf(metodo)!==-1) return entregarTelegramPersistente(metodo,payload);
  var options = {method:"post",contentType:"application/json",payload:JSON.stringify(payload),muteHttpExceptions:true};
  try {
    var res = UrlFetchApp.fetch(url, options);
    var code = res.getResponseCode();
    if (code === 200) return true;

    // Trata rate limit (HTTP 429): respeita retry_after e evita retentativas imediatas cegas
    if (code === 429) {
      var retryAfter = 1;
      try {
        var textoCorpo429 = res.getContentText ? res.getContentText() : "";
        var json429 = JSON.parse(textoCorpo429 || "{}");
        if (json429.parameters && json429.parameters.retry_after) {
          retryAfter = parseInt(json429.parameters.retry_after, 10) || 1;
        }
      } catch (eParse) {}
      Logger.log("Telegram Rate Limit (429). Retry-after: " + retryAfter + "s");

      // Em janelas muito curtas (<= 2s), aguarda com backoff se Utilities.sleep estiver disponível
      if (retryAfter <= 2 && typeof Utilities !== "undefined" && Utilities.sleep) {
        Utilities.sleep(retryAfter * 1000);
        var resRetry429 = UrlFetchApp.fetch(url, options);
        return resRetry429.getResponseCode() === 200;
      }
      return false;
    }

    // Se houve erro de parse no Markdown do Telegram (HTTP 400 de formatação/entidade), tenta reenviar texto plano
    if (code === 400 && payload.parse_mode) {
      var corpo400 = res.getContentText ? res.getContentText() : "";
      if (corpo400.indexOf("can't parse") !== -1 || corpo400.indexOf("entity") !== -1 || !corpo400) {
        delete payload.parse_mode;
        options.payload = JSON.stringify(payload);
        var retryRes = UrlFetchApp.fetch(url, options);
        return retryRes.getResponseCode() === 200;
      }
    }
    return false;
  } catch (e) {
    Logger.log("Exceção ao postar no Telegram: " + e.message);
    return false;
  }
}

/**
 * Retorna a estrutura do teclado fixo principal (ReplyKeyboardMarkup)
 * Projetado para navegação rápida de 1 toque no celular em ambiente hospitalar e rotina.
 */
function obterTecladoFixoPrincipal() {
  return {keyboard:[[{text:"🩺 Novo SOAP"},{text:"💊 Prescrever"}],[{text:"🏥 Enfermaria"},{text:"📐 Calculadoras"}],[{text:"📅 Minha rotina"},{text:"🚨 Sala Vermelha"}]],resize_keyboard:true,is_persistent:true};
}

function registrarComandosNativosTelegram() {
  var token = ConfigService.get("TELEGRAM_BOT_TOKEN");
  if (!token) return false;
  var url = "https://api.telegram.org/bot" + token + "/setMyCommands";
  var comandos = [
    { command: "menu", description: "Central de comandos e especialidades" },
    { command: "novo", description: "Limpar memória e iniciar novo caso" },
    { command: "cancelar", description: "Encerrar modo ativo ou ação atual" },
    { command: "teclado", description: "Ativar botões rápidos no rodapé" },
    { command: "fila", description: "Ver pedidos e entregas pendentes" },
    { command: "ajuda", description: "Manual completo de instruções" }
  ];
  executarPostTelegram(url, { commands: comandos });
  return executarPostTelegram(url, { commands: comandos, scope: { type: "all_private_chats" } });
}

function enviarMensagemComTecladoFixo(chatId, texto) {
  return enviarMensagemSegmentada(chatId, texto, obterTecladoFixoPrincipal());
}

/**
 * Envio nativo de documentos/arquivos (como PDF de receitas) para o Telegram
 */
function enviarDocumentoTelegram(chatId, blobDocumento, legenda) {
  var token = ConfigService.get("TELEGRAM_BOT_TOKEN");
  if (!token || !blobDocumento) return false;

  var url = "https://api.telegram.org/bot" + token + "/sendDocument";
  var payload = {
    "chat_id": String(chatId),
    "document": blobDocumento,
    "caption": legenda ? limparMarkdownTelegram(legenda) : "",
    "parse_mode": "Markdown"
  };

  var options = {
    "method": "post",
    "payload": payload,
    "muteHttpExceptions": true
  };

  try {
    var res = UrlFetchApp.fetch(url, options);
    var code = res.getResponseCode();
    if (code === 200) return true;
    Logger.log("Erro ao enviar documento no Telegram (HTTP " + code + "): " + res.getContentText());
    return false;
  } catch (e) {
    Logger.log("Exceção ao enviar documento no Telegram: " + e.message);
    return false;
  }
}

function gerarAudioTtsGeminiNeural(texto) {
  var limpo = String(texto || "").replace(/[*_#`\[\]\(\)]/g, "").replace(/\s+/g, " ").trim();
  if (!limpo) return null;
  if (limpo.length > 500) {
    var corte = limpo.substring(0, 496);
    var ultimoEspaco = Math.max(corte.lastIndexOf("?"), corte.lastIndexOf("."), corte.lastIndexOf(" "));
    if (ultimoEspaco > 300) {
      limpo = corte.substring(0, ultimoEspaco) + "...";
    } else {
      limpo = corte + "...";
    }
  }

  var chaves = ConfigService.getArray("GEMINI_API_KEYS");
  if (!chaves || chaves.length === 0) return null;

  for (var k = 0; k < chaves.length; k++) {
    var chave = chaves[k].trim();
    var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-lite-tts:generateContent?key=" + encodeURIComponent(chave);
    var payload = {
      "contents": [{ "parts": [{ "text": limpo }] }],
      "generationConfig": {
        "responseModalities": ["AUDIO"],
        "speechConfig": {
          "voiceConfig": {
            "prebuiltVoiceConfig": {
              "voiceName": "Fenrir"
            }
          }
        }
      }
    };
    try {
      var res = UrlFetchApp.fetch(url, {
        "method": "post",
        "contentType": "application/json",
        "payload": JSON.stringify(payload),
        "muteHttpExceptions": true
      });
      if (res.getResponseCode() === 200) {
        var json = JSON.parse(res.getContentText());
        if (json.candidates && json.candidates[0].content && json.candidates[0].content.parts) {
          var part = json.candidates[0].content.parts[0];
          if (part.inlineData && part.inlineData.data) {
            var bytes = Utilities.base64Decode(part.inlineData.data);
            var blob = Utilities.newBlob(bytes, "audio/wav", "preceptor_voz.wav");
            return blob;
          }
        }
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

/**
 * Síntese de Voz (Text-to-Speech) em Português
 * Converte frases curtas em áudio nativo MP3 usando TTS.
 */
function gerarAudioTtsGoogle(texto) {
  var limpo = String(texto || "").replace(/[*_#`\[\]\(\)]/g, "").replace(/\s+/g, " ").trim();
  if (!limpo) return null;
  if (limpo.length > 200) {
    var corte = limpo.substring(0, 196);
    var ultimoEspaco = Math.max(corte.lastIndexOf(" "), corte.lastIndexOf(". "), corte.lastIndexOf(", "));
    if (ultimoEspaco > 120) {
      limpo = corte.substring(0, ultimoEspaco) + "...";
    } else {
      limpo = corte + "...";
    }
  }

  var url = "https://translate.google.com/translate_tts?ie=UTF-8&tl=pt-BR&client=tw-ob&q=" + encodeURIComponent(limpo);
  try {
    var res = UrlFetchApp.fetch(url, {
      "headers": { "User-Agent": "Mozilla/5.0" },
      "muteHttpExceptions": true
    });
    if (res.getResponseCode() === 200) {
      var blob = res.getBlob();
      blob.setContentType("audio/mpeg");
      blob.setName("preceptor_voz.mp3");
      return blob;
    }
    return null;
  } catch (e) {
    Logger.log("Erro na síntese TTS: " + e.message);
    return null;
  }
}

/**
 * Pipeline Integrado de Áudio do Preceptor
 * Prioriza a voz neural humana realista e utiliza o TTS clássico como contingência.
 */
function sintetizarVozPreceptor(texto) {
  var audioNeural = gerarAudioTtsGeminiNeural(texto);
  if (audioNeural) return audioNeural;
  return gerarAudioTtsGoogle(texto);
}

/**
 * Envio de mensagem de voz nativa no Telegram (sendVoice)
 */
function enviarAudioVozTelegram(chatId, blobAudio, legenda) {
  var token = ConfigService.get("TELEGRAM_BOT_TOKEN");
  if (!token || !blobAudio) return false;

  var url = "https://api.telegram.org/bot" + token + "/sendVoice";
  var payload = {
    "chat_id": String(chatId),
    "voice": blobAudio,
    "caption": legenda ? limparMarkdownTelegram(legenda) : "",
    "parse_mode": "Markdown"
  };

  var options = {
    "method": "post",
    "payload": payload,
    "muteHttpExceptions": true
  };

  try {
    var res = UrlFetchApp.fetch(url, options);
    return res.getResponseCode() === 200;
  } catch (e) {
    Logger.log("Exceção ao enviar voz no Telegram: " + e.message);
    return false;
  }
}



