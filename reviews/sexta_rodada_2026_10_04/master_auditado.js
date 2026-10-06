/**
 * ==============================================================================
 * ULTRA ROTINA · MASTER CLOUD ASSISTANT & COPILOTO CLÍNICO MULTIMODAL (v2.0)
 * ==============================================================================
 * Executa 100% na nuvem do Google (24/7), gratuito, sem precisar de PC ligado.
 * Gerado automaticamente via build_master.py em: 2026-10-04 11:33:29
 * Checksum SHA256: 35e3bb7902130032
 * ==============================================================================
 */



// ==============================================================================
// ARQUIVO FONTE: 00_config.js
// ==============================================================================

/**
 * ==============================================================================
 * MÓDULO 00: CONFIGURAÇÕES, SEGREDOS E AMBIENTE (ConfigService)
 * ==============================================================================
 * Arquitetura de Gestão de Chaves e Propriedades:
 * Lê prioritariamente de PropertiesService.getScriptProperties().
 * ==============================================================================
 */

var ConfigService = (function() {
  var propsCache = null;

  function carregarPropriedades() {
    if (propsCache) return propsCache;
    try {
      if (typeof PropertiesService !== "undefined" && PropertiesService.getScriptProperties) {
        propsCache = PropertiesService.getScriptProperties().getProperties() || {};
      } else {
        propsCache = {};
      }
    } catch (e) {
      propsCache = {};
    }
    return propsCache;
  }

  // Valores padrão estruturais não-sensíveis.
  // Todos os segredos e credenciais devem ser definidos exclusivamente em ScriptProperties.
  var DEFAULTS = {
    PROVEDOR_TEXTO_PADRAO: "GROQ",
    TIMEZONE: "America/Sao_Paulo",
    SPREADSHEET_ID_REMUME: "",
    SPREADSHEET_ID_INTERACOES: "",
    WEB_APP_URL: ""
  };

  return {
    get: function(chave, valorPadrao) {
      try {
        if (typeof PropertiesService !== "undefined" && PropertiesService.getScriptProperties) {
          var valDireto = PropertiesService.getScriptProperties().getProperty(chave);
          if (valDireto !== undefined && valDireto !== null && valDireto !== "") {
            return valDireto;
          }
        }
      } catch (e) {}
      var p = carregarPropriedades();
      if (p[chave] !== undefined && p[chave] !== null && p[chave] !== "") {
        return p[chave];
      }
      if (DEFAULTS[chave] !== undefined) {
        return DEFAULTS[chave];
      }
      return valorPadrao;
    },
    getArray: function(chave) {
      var val = this.get(chave, "[]");
      try {
        var parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
      if (typeof val === "string" && val.indexOf(",") !== -1) {
        return val.split(",").map(function(s) { return s.trim(); });
      }
      return val ? [val] : [];
    },
    invalidar: function() { propsCache=null; },
    exigir: function(chave) {
      var val = this.get(chave);
      if (!val) {
        throw new Error("Configuração obrigatória ausente em ScriptProperties: " + chave);
      }
      return val;
    },
    getDefaults: function() {
      return DEFAULTS;
    }
  };
})();

// Variáveis globais de compatibilidade
var TELEGRAM_BOT_TOKEN = ConfigService.get("TELEGRAM_BOT_TOKEN");
var TELEGRAM_CHAT_ID = ConfigService.get("TELEGRAM_CHAT_ID");
var NOTION_TOKEN = ConfigService.get("NOTION_TOKEN");
var NOTION_HABIT_LOG_DB_ID = ConfigService.get("NOTION_HABIT_LOG_DB_ID");
var NOTION_TASKS_DB_ID = ConfigService.get("NOTION_TASKS_DB_ID");
var PROVEDOR_TEXTO_PADRAO = ConfigService.get("PROVEDOR_TEXTO_PADRAO", "GROQ");
var GROQ_API_KEY = ConfigService.get("GROQ_API_KEY");
var OPENROUTER_API_KEY = ConfigService.get("OPENROUTER_API_KEY");
var ZAI_API_KEY = ConfigService.get("ZAI_API_KEY");
var GEMINI_API_KEYS = ConfigService.getArray("GEMINI_API_KEYS");
var TIMEZONE = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
var SPREADSHEET_ID_REMUME = ConfigService.get("SPREADSHEET_ID_REMUME");
var SPREADSHEET_ID_INTERACOES = ConfigService.get("SPREADSHEET_ID_INTERACOES");
var WEB_APP_URL = ConfigService.get("WEB_APP_URL");


// ==============================================================================
// ARQUIVO FONTE: 01_utils.js
// ==============================================================================

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


// ==============================================================================
// ARQUIVO FONTE: 02_calculadoras_puras.js
// ==============================================================================

/**
 * ==============================================================================
 * MÓDULO 02: CALCULADORAS CLÍNICAS DETERMINÍSTICAS  ·  v3.0.0
 * Compatível com Google Apps Script (V8) e Node.js. Sem dependências externas.
 * ==============================================================================
 * CONTRATO DE QUALIDADE (Conselho de Especialistas: Kimi K3 + Nemotron 3 + GPT-6.1 Sol + Sonnet 5.5)
 *  - Funções puras: sem I/O, sem data/hora, sem aleatoriedade, sem estado global.
 *  - Validação estrita: tipo numérico, finitude, limites fisiológicos.
 *  - Tolerância de ponto flutuante: EPS 1e-9; soma de Wells em meios-pontos inteiros.
 *  - Imunidade a falhas: try/catch global em cada calculadora; nenhuma exceção ou NaN vaza.
 *  - UX Telegram: retornos em HTML formatado com estados funcionais (🔴, 🟠, 🟢, 🔵, ⚪, ⛔)
 *    e teclados inline pré-montados ('calc:<id>:<acao>').
 *  - Camada de compatibilidade reversa: mantém propriedades legadas (textoFormatado, etc.)
 *    para não quebrar handlers existentes nem integrações com IA.
 *
 * REFERÊNCIAS: KDIGO 2024 (CKD-EPI 2021 race-free); SBC 2025 / ESC 2024 (CHA2DS2-VA);
 *   Lim et al. 2003 (CURB-65); Pisters 2010 (HAS-BLED); Wells 2000/2001;
 *   Brennan 2018 (GCS-P); Surviving Sepsis Campaign 2021; Berlim 2012 (SDRA).
 * ==============================================================================
 */

var CalculadorasClinicas = (function () {
  'use strict';

  var VERSAO = '3.0.0';
  var EPS = 1e-9;

  // ───────────────────────── Estados visuais ─────────────────────────
  var ESTADOS = {
    PRIORITARIO: { icone: '🔴', texto: 'AVALIAÇÃO PRIORITÁRIA' },
    ATENCAO:     { icone: '🟠', texto: 'ATENÇÃO' },
    BAIXO:       { icone: '🟢', texto: 'BAIXO RISCO PELO ESCORE' },
    CALCULO:     { icone: '🔵', texto: 'ESTIMATIVA / CÁLCULO' },
    INCOMPLETO:  { icone: '⚪', texto: 'INCOMPLETO' },
    ERRO:        { icone: '⛔', texto: 'NÃO CALCULADO' },
    INTERROMPIDO:{ icone: '⛔', texto: 'CÁLCULO INTERROMPIDO' }
  };

  // ───────────────────────── Utilitários numéricos ─────────────────────────
  function lt(a, b)  { return a < b - EPS; }
  function lte(a, b) { return a <= b + EPS; }
  function gt(a, b)  { return a > b + EPS; }
  function gte(a, b) { return a >= b - EPS; }

  function arred(x, casas) {
    var f = Math.pow(10, casas);
    var s = x < 0 ? -1 : 1;
    return s * Math.round((Math.abs(x) + 1e-12) * f) / f;
  }

  function fmt(x, casas) {
    var r = arred(x, casas);
    if (r === 0) r = 0;
    return r.toFixed(casas).replace('.', ',');
  }

  function fmtMl(x) { return fmt(x, x < 1 ? 2 : 1); }

  function exigirFinito() {
    for (var i = 0; i < arguments.length; i++) {
      if (typeof arguments[i] !== 'number' || !isFinite(arguments[i])) {
        throw new Error('RESULTADO_NAO_FINITO');
      }
    }
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function semAcento(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  // ───────────────────────── Contexto de validação ─────────────────────────
  function novoCtx() { return { erros: [], faltas: [], avisos: [] }; }

  function ausente(v) {
    return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
  }

  function num(ctx, v, nome, min, max, opt) {
    opt = opt || {};
    if (ausente(v)) {
      if (opt.opcional) return null;
      ctx.faltas.push(nome);
      return NaN;
    }
    var x;
    if (typeof v === 'number') {
      x = v;
    } else if (typeof v === 'string') {
      var s = v.trim().replace(',', '.');
      if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) {
        ctx.erros.push(nome + ': valor não numérico');
        return NaN;
      }
      x = Number(s);
    } else {
      ctx.erros.push(nome + ': tipo inválido');
      return NaN;
    }
    if (!isFinite(x)) { ctx.erros.push(nome + ': valor não finito'); return NaN; }
    if (opt.inteiro && Math.floor(x) !== x) { ctx.erros.push(nome + ': deve ser inteiro'); return NaN; }
    if (x < min || x > max) {
      ctx.erros.push(nome + ': fora da faixa plausível (' + min + ' a ' + max + ')');
      return NaN;
    }
    return x;
  }

  function bool(ctx, v, nome) {
    if (ausente(v)) { ctx.faltas.push(nome); return null; }
    if (v === true || v === false) return v;
    if (v === 1 || v === 0) return v === 1;
    if (typeof v === 'string') {
      var s = semAcento(v);
      if (s === 'true' || s === 'sim' || s === 's' || s === '1') return true;
      if (s === 'false' || s === 'nao' || s === 'n' || s === '0') return false;
    }
    ctx.erros.push(nome + ': esperado sim/não');
    return null;
  }

  function pendente(ctx) { return ctx.erros.length > 0 || ctx.faltas.length > 0; }

  // ───────────────────────── Renderização Telegram ─────────────────────────
  function btn(texto, id, acao) {
    return { text: texto, callback_data: ('calc:' + id + ':' + acao).slice(0, 64) };
  }

  function montar(o) {
    var est = ESTADOS[o.estado] || ESTADOS.CALCULO;
    var rotulo = o.rotulo || est.texto;
    var L = [];
    L.push(est.icone + ' <b>' + esc(rotulo) + '</b>');
    L.push(esc(o.nome) + ' · <b>' + esc(o.principal) + '</b>');
    (o.secoes || []).forEach(function (s) {
      if (!s[1] || !s[1].length) return;
      L.push('');
      L.push('<b>' + esc(s[0]) + '</b>');
      s[1].forEach(function (x) { L.push('• ' + esc(x)); });
    });
    (o.avisos || []).forEach(function (a, i) {
      if (i === 0) L.push('');
      L.push('⚠️ ' + esc(a));
    });
    return L.join('\n');
  }

  function sucesso(o) {
    var estObj = ESTADOS[o.estado] || ESTADOS.CALCULO;
    var txt = montar(o);
    var obj = {
      ok: true,
      id: o.id,
      nome: o.nome,
      estado: o.rotulo || estObj.texto,
      rotulo: o.rotulo || estObj.texto,
      icone: estObj.icone,
      principal: o.principal,
      dados: o.dados || {},
      avisos: o.avisos || [],
      texto: txt,
      textoFormatado: txt, // Compatibilidade reversa
      botoes: o.botoes || [],
      versao: VERSAO
    };
    // Mescla campos legados diretamente no topo se existirem
    if (o.legado) {
      for (var k in o.legado) {
        if (o.legado.hasOwnProperty(k)) {
          obj[k] = o.legado[k];
        }
      }
    }
    return obj;
  }

  function falhaCtx(id, nome, ctx) {
    var inval = ctx.erros.length > 0;
    var est = inval ? 'ERRO' : 'INCOMPLETO';
    var secoes = [];
    if (inval) {
      secoes.push(['CORRIGIR', ctx.erros.slice()]);
      if (ctx.faltas.length) secoes.push(['FALTA INFORMAR', ctx.faltas.slice()]);
    } else {
      secoes.push(['FALTA INFORMAR', ctx.faltas.slice()]);
    }
    var txt = montar({
      estado: est,
      nome: nome,
      principal: inval ? 'Nenhuma classificação gerada' : 'Dados ausentes não foram considerados negativos',
      secoes: secoes
    });
    var msgErro = (ctx.erros[0] || ctx.faltas[0] || 'Parâmetros inválidos');
    return {
      ok: false,
      id: id,
      nome: nome,
      estado: ESTADOS[est].texto,
      icone: ESTADOS[est].icone,
      erro: msgErro, // Compatibilidade reversa
      erros: ctx.erros.slice(),
      faltas: ctx.faltas.slice(),
      avisos: [],
      texto: txt,
      textoFormatado: txt,
      botoes: [[btn('✏️ Corrigir dados', id, 'editar'), btn('↩️ Voltar', id, 'voltar')]],
      versao: VERSAO
    };
  }

  function falhaInterna(id, nome, e) {
    var codigo = 'E_' + id.toUpperCase() + '_' + (e && e.message ? String(e.message).replace(/[^A-Z0-9_]/gi, '').slice(0, 24).toUpperCase() : 'DESCONHECIDO');
    var txt = montar({
      estado: 'INTERROMPIDO',
      nome: nome,
      principal: 'Sem resultado válido',
      secoes: [['DETALHE', ['Não foi possível produzir um resultado numérico válido.', 'Nenhuma classificação ou orientação foi gerada.', 'Código: ' + codigo]]]
    });
    return {
      ok: false,
      id: id,
      nome: nome,
      estado: ESTADOS.INTERROMPIDO.texto,
      icone: ESTADOS.INTERROMPIDO.icone,
      erro: 'Erro interno no cálculo: ' + codigo,
      codigo: codigo,
      avisos: [],
      texto: txt,
      textoFormatado: txt,
      botoes: [[btn('✏️ Revisar entradas', id, 'editar'), btn('🛠️ Reportar erro', id, 'erro')]],
      versao: VERSAO
    };
  }

  function seguro(id, nome, fn) {
    try { return fn(); } catch (e) { return falhaInterna(id, nome, e); }
  }

  function botoesPadrao(id, linha1) {
    return [linha1, [btn('📚 Ver critérios', id, 'criterios'), btn('📄 Gerar PDF', id, 'pdf')]];
  }

  // ═════════════════════════════ ESCORES ═════════════════════════════

  /** CURB-65 (Lim 2003). Ureia em mg/dL (corte > 50). */
  function curb65(confusao, ureia, fr, pas, pad, idade) {
    var ID = 'curb65', NOME = 'CURB-65';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var conf = bool(c, confusao, 'Confusão mental aguda');
      var u = num(c, ureia, 'Ureia (mg/dL)', 1, 500);
      var f = num(c, fr, 'FR (irpm)', 4, 80);
      var s = num(c, pas, 'PAS (mmHg)', 40, 300);
      var d = num(c, pad, 'PAD (mmHg)', 20, 200);
      var i = num(c, idade, 'Idade (anos)', 0, 120);
      if (!pendente(c) && d >= s) c.erros.push('PAD deve ser menor que a PAS');
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      var crit = [];
      if (conf) crit.push('Confusão mental aguda (+1)');
      if (gt(u, 50)) crit.push('Ureia ' + fmt(u, 0) + ' mg/dL (> 50) (+1)');
      if (gte(f, 30)) crit.push('FR ' + fmt(f, 0) + ' irpm (≥ 30) (+1)');
      if (lt(s, 90) || lte(d, 60)) crit.push('PA ' + fmt(s, 0) + '/' + fmt(d, 0) + ' mmHg (PAS < 90 ou PAD ≤ 60) (+1)');
      if (gte(i, 65)) crit.push('Idade ' + fmt(i, 0) + ' anos (≥ 65) (+1)');
      var score = crit.length;

      var estado, rotulo, mort, acoes, riscoTexto, condutaTexto;
      if (score <= 1) {
        estado = 'BAIXO'; rotulo = 'BAIXO RISCO PELO ESCORE'; mort = '~1,5%';
        riscoTexto = 'Baixo Risco (Mortalidade ~1.5%)';
        condutaTexto = 'Tratamento ambulatorial habitualmente seguro. Antibioticoterapia oral (ex: Amoxicilina + Clavulanato ou Macrolídeo).';
        acoes = ['Tratamento ambulatorial pode ser considerado.', 'Conferir SpO₂, comorbidades e suporte domiciliar.'];
      } else if (score === 2) {
        estado = 'ATENCAO'; rotulo = 'RISCO INTERMEDIÁRIO PELO ESCORE'; mort = '~9,2%';
        riscoTexto = 'Risco Moderado (Mortalidade ~9.2%)';
        condutaTexto = 'Considerar internação hospitalar em enfermaria ou supervisão ambulatorial estrita nas primeiras 48h.';
        acoes = ['Considerar internação em enfermaria ou observação curta.', 'Conferir SpO₂ e necessidade de oxigênio.'];
      } else {
        estado = 'PRIORITARIO'; rotulo = 'ALTO RISCO PELO ESCORE'; mort = '~22%';
        riscoTexto = 'Alto Risco (Mortalidade 15% a 40%)';
        condutaTexto = score >= 4 ? 'Internar; leito de UTI prioritário. Avaliar suporte intensivo e sepse.' : 'Internar em leito hospitalar. Avaliar UTI se instabilidade hemodinâmica.';
        acoes = score >= 4
          ? ['Internar; avaliar leito de UTI.', 'Avaliar sepse, oxigenação e necessidade de suporte.']
          : ['Internar; reavaliar gravidade em curto prazo.', 'Avaliar sepse e oxigenação; considerar UTI se instável.'];
      }
      return sucesso({
        id: ID, nome: NOME, estado: estado, rotulo: rotulo,
        principal: score + '/5 · mortalidade 30 d ' + mort + ' (grupo)',
        secoes: [['PONTUARAM', crit.length ? crit : ['Nenhum critério pontuou.']],
                 ['AÇÃO', acoes]],
        avisos: [(5 - score) + ' critérios negativos conferidos. O escore isolado não autoriza alta nem define UTI.'],
        dados: { pontos: score, maximo: 5, criterios: crit },
        legado: {
          pontuacao: score + '/5',
          criterios: crit,
          risco: riscoTexto,
          conduta: condutaTexto
        },
        botoes: botoesPadrao(ID, [btn('🫁 Avaliar gravidade', ID, 'gravidade'), btn('✏️ Revisar dados', ID, 'editar')])
      });
    });
  }

  /** CKD-EPI 2021 (sem raça). Creatinina em mg/dL. Adultos ≥ 18 anos. */
  function ckdEpi2021(creatinina, idade, ehFeminino) {
    var ID = 'ckdepi', NOME = 'CKD-EPI 2021';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var cr = num(c, creatinina, 'Creatinina (mg/dL)', 0.1, 30);
      var id = num(c, idade, 'Idade (anos)', 18, 120);
      var fem = bool(c, ehFeminino, 'Sexo feminino (parâmetro da equação)');
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      var kappa = fem ? 0.7 : 0.9, alfa = fem ? -0.241 : -0.302, mult = fem ? 1.012 : 1.0;
      var r = cr / kappa;
      var tfg = 142 * Math.pow(Math.min(r, 1), alfa) * Math.pow(Math.max(r, 1), -1.200) * Math.pow(0.9938, id) * mult;
      exigirFinito(tfg);

      var g, desc;
      if (gte(tfg, 90)) { g = 'G1'; desc = 'Normal ou elevada (≥ 90 mL/min/1.73m²)'; }
      else if (gte(tfg, 60)) { g = 'G2'; desc = 'Levemente diminuída (60–89 mL/min/1.73m²)'; }
      else if (gte(tfg, 45)) { g = 'G3a'; desc = 'Leve a moderadamente diminuída (45–59 mL/min/1.73m²)'; }
      else if (gte(tfg, 30)) { g = 'G3b'; desc = 'Moderada a gravemente diminuída (30–44 mL/min/1.73m²)'; }
      else if (gte(tfg, 15)) { g = 'G4'; desc = 'Gravemente diminuída (15–29 mL/min/1.73m²)'; }
      else { g = 'G5'; desc = 'Falência renal (< 15 mL/min/1.73m²)'; }
      var grave = (g === 'G4' || g === 'G5');

      var tfgNum = Math.round(tfg * 10) / 10;
      return sucesso({
        id: ID, nome: NOME, estado: grave ? 'ATENCAO' : 'CALCULO',
        rotulo: grave ? 'TFG GRAVEMENTE REDUZIDA' : null,
        principal: fmt(tfg, 1) + ' mL/min/1,73 m²',
        secoes: [
          ['CATEGORIA', [g + ': ' + desc]],
          ['ENTRADAS', ['Creatinina: ' + fmt(cr, 2) + ' mg/dL', 'Idade: ' + fmt(id, 0) + ' anos', 'Parâmetro sexual: ' + (fem ? 'feminino' : 'masculino')]],
          ['AÇÃO', ['Válida apenas com creatinina estável.', 'Para dose de fármaco, conferir também o clearance (Cockcroft-Gault) e a bula.']]
        ],
        avisos: ['Em lesão renal aguda, sarcopenia ou dieta atípica a eTFG pode ser imprecisa; considerar cistatina C (KDIGO 2024). Categoria de eTFG isolada não define DRC.'],
        dados: { tfg: tfgNum, categoria: g, estagio: g },
        legado: {
          tfg: tfgNum,
          estagio: g,
          descricao: desc
        },
        botoes: botoesPadrao(ID, [btn('💊 Revisar ajuste renal', ID, 'ajuste'), btn('✏️ Revisar dados', ID, 'editar')])
      });
    });
  }

  /** Cockcroft-Gault (mL/min). Se altura informada e IMC ≥ 30, usa peso ajustado. */
  function cockcroftGault(creatinina, pesoKg, idade, ehFeminino, alturaCm) {
    var ID = 'cg', NOME = 'Cockcroft-Gault';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var cr = num(c, creatinina, 'Creatinina (mg/dL)', 0.1, 30);
      var peso = num(c, pesoKg, 'Peso (kg)', 20, 350);
      var id = num(c, idade, 'Idade (anos)', 18, 120);
      var fem = bool(c, ehFeminino, 'Sexo feminino (parâmetro da equação)');
      var alt = num(c, alturaCm, 'Altura (cm)', 100, 230, { opcional: true });
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      var pesoUsado = peso, tipo = 'real', imc = null, pib = null, avisos = [];
      if (alt !== null) {
        imc = peso / Math.pow(alt / 100, 2);
        var pol = alt / 2.54;
        pib = (fem ? 45.5 : 50) + 2.3 * (pol - 60);
        if (pib <= 0) throw new Error('PIB_INVALIDO');
        if (gte(imc, 30)) {
          pesoUsado = pib + 0.4 * (peso - pib);
          tipo = 'ajustado (IMC ' + fmt(imc, 1) + ' ≥ 30)';
        } else if (lt(peso, pib)) {
          tipo = 'real (menor que o ideal)';
        }
      } else {
        avisos.push('Altura não informada: peso real usado. Em IMC ≥ 30 o clearance fica superestimado.');
      }
      var cl = ((140 - id) * pesoUsado) / (72 * cr);
      if (fem) cl *= 0.85;
      exigirFinito(cl, pesoUsado);
      if (cl < 0) cl = 0;
      if (gt(cl, 200)) avisos.push('Valor muito alto: conferir peso, idade e creatinina.');
      avisos.push('Fórmula válida só com creatinina estável (não usar em lesão renal aguda). Unidade: mL/min, não mL/min/1,73 m².');

      var estado, acao;
      if (lt(cl, 30)) { estado = 'ATENCAO'; acao = ['Clearance < 30 mL/min: revisar dose da maioria dos fármacos de excreção renal.']; }
      else if (lt(cl, 50)) { estado = 'ATENCAO'; acao = ['Clearance 30–49 mL/min: conferir ajuste de fármacos de excreção renal.']; }
      else { estado = 'CALCULO'; acao = ['Conferir a regra de ajuste do medicamento escolhido; limiares variam por fármaco.']; }

      var entradas = [
        'Creatinina: ' + fmt(cr, 2) + ' mg/dL',
        'Idade: ' + fmt(id, 0) + ' anos',
        'Peso usado: ' + fmt(pesoUsado, 1) + ' kg · ' + tipo,
        'Parâmetro sexual da equação: ' + (fem ? 'feminino' : 'masculino')
      ];
      var clNum = Math.round(cl * 10) / 10;
      return sucesso({
        id: ID, nome: NOME, estado: estado, rotulo: estado === 'ATENCAO' ? 'REVISÃO DE DOSE NECESSÁRIA' : null,
        principal: fmt(cl, 0) + ' mL/min',
        secoes: [['ENTRADAS', entradas], ['AÇÃO', acao]], avisos: avisos,
        dados: { clearance: clNum, pesoUsadoKg: pesoUsado, tipoPeso: tipo, imc: imc },
        legado: { clearance: clNum, pesoUsadoKg: pesoUsado, tipoPeso: tipo, imc: imc },
        botoes: botoesPadrao(ID, [btn('💊 Selecionar medicamento', ID, 'medicamento'), btn('⚖️ Revisar peso', ID, 'peso')])
      });
    });
  }

  /**
   * CHA2DS2-VA (SBC 2025 / ESC 2024): sem pontuação para sexo feminino.
   * a2 = idade ≥ 75 (+2); a = idade 65–74 (+1).
   */
  function cha2ds2va(c1, h, a2, d, s2, v, a) {
    var ID = 'cha2ds2va', NOME = 'CHA₂DS₂-VA';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var ic = bool(c, c1, 'Insuficiência cardíaca / disfunção de VE');
      var has = bool(c, h, 'Hipertensão arterial');
      var i75 = bool(c, a2, 'Idade ≥ 75 anos');
      var dm = bool(c, d, 'Diabetes mellitus');
      var avc = bool(c, s2, 'AVC / AIT / tromboembolismo prévio');
      var vasc = bool(c, v, 'Doença vascular (IAM, DAOP, placa aórtica)');
      var i65 = bool(c, a, 'Idade 65–74 anos');
      if (!pendente(c) && i75 && i65) c.erros.push('Idade ≥ 75 e 65–74 não podem ser ambas verdadeiras');
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      var crit = [], score = 0;
      function add(cond, txt, p) { if (cond) { score += p; crit.push(txt + ' · +' + p); } }
      add(ic, 'Insuficiência cardíaca', 1);
      add(has, 'Hipertensão', 1);
      add(i75, 'Idade ≥ 75 anos', 2);
      add(dm, 'Diabetes mellitus', 1);
      add(avc, 'AVC/AIT/tromboembolismo prévio', 2);
      add(vasc, 'Doença vascular', 1);
      add(i65 && !i75, 'Idade 65–74 anos', 1);
      var neg = 7 - crit.length;

      var estado, rotulo, acoes, recTexto;
      if (score === 0) {
        estado = 'BAIXO'; rotulo = 'BAIXO RISCO TROMBOEMBÓLICO';
        recTexto = 'Baixo risco (0 pontos). Anticoagulação oral habitualmente NÃO recomendada.';
        acoes = ['Anticoagulação oral não indicada pelo escore.', 'Reavaliar periodicamente.'];
      } else if (score === 1) {
        estado = 'ATENCAO'; rotulo = 'RISCO INTERMEDIÁRIO';
        recTexto = 'Risco intermediário (1 ponto). Considerar anticoagulação oral individualizada.';
        acoes = ['Considerar anticoagulação oral (individualizar).', 'Pesar risco de sangramento (HAS-BLED).'];
      } else {
        estado = 'PRIORITARIO'; rotulo = 'ANTICOAGULAÇÃO RECOMENDADA';
        recTexto = 'Alto risco (≥ 2 pontos). Anticoagulação oral fortemente recomendada (preferência DOACs).';
        acoes = ['Anticoagulação oral recomendada; DOAC preferencial.', 'Conferir função renal, interações e contraindicações.'];
      }
      return sucesso({
        id: ID, nome: NOME, estado: estado, rotulo: rotulo, principal: score + '/8',
        secoes: [['PONTUARAM', crit.length ? crit : ['Nenhum critério pontuou.']], ['AÇÃO', acoes]],
        avisos: [neg + ' critérios negativos conferidos. Não se aplica a estenose mitral moderada/grave ou prótese mecânica (usar AVK). Diretriz ESC 2024 / SBC 2025.'],
        dados: { pontos: score, maximo: 8, criterios: crit },
        legado: { pontuacao: score, recomendacao: recTexto, criterios: crit },
        botoes: botoesPadrao(ID, [btn('💊 Revisar anticoagulação', ID, 'anticoag'), btn('🩸 Avaliar sangramento', ID, 'hasbled')])
      });
    });
  }

  /**
   * Compatibilidade com versão legada (CHA2DS2-VASc com sexo feminino como 8º argumento).
   */
  function cha2ds2vasc(c1, h, a2, d, s2, v, a, scFeminino) {
    var ID = 'cha2ds2vasc', NOME = 'CHA₂DS₂-VASc';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var ic = bool(c, c1, 'Insuficiência cardíaca / disfunção VE');
      var has = bool(c, h, 'Hipertensão arterial');
      var i75 = bool(c, a2, 'Idade ≥ 75 anos');
      var dm = bool(c, d, 'Diabetes mellitus');
      var avc = bool(c, s2, 'AVC / AIT / tromboembolismo prévio');
      var vasc = bool(c, v, 'Doença vascular (IAM, DAOP, placa aórtica)');
      var i65 = bool(c, a, 'Idade 65–74 anos');
      var fem = bool(c, scFeminino, 'Sexo feminino (Sc)', { opcional: true });
      if (!pendente(c) && i75 && i65) c.erros.push('Idade ≥ 75 e 65–74 não podem ser ambas verdadeiras');
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      var crit = [], score = 0;
      function add(cond, txt, p) { if (cond) { score += p; crit.push(txt + ' · +' + p); } }
      add(ic, 'Insuficiência cardíaca', 1);
      add(has, 'Hipertensão', 1);
      add(i75, 'Idade ≥ 75 anos', 2);
      add(dm, 'Diabetes mellitus', 1);
      add(avc, 'AVC/AIT/tromboembolismo prévio', 2);
      add(vasc, 'Doença vascular', 1);
      add(i65 && !i75, 'Idade 65–74 anos', 1);
      if (fem) add(true, 'Sexo feminino (Sc)', 1);

      var estado, rotulo, acoes, recTexto;
      var pontosClinicos = score - (fem ? 1 : 0);

      if (pontosClinicos === 0) {
        estado = 'BAIXO';
        rotulo = fem ? 'BAIXO RISCO (APENAS CRITÉRIO DE SEXO)' : 'BAIXO RISCO TROMBOEMBÓLICO';
        recTexto = fem
          ? 'Baixo risco (1 ponto isolado por sexo feminino). Anticoagulação oral NÃO recomendada (Classe III).'
          : 'Baixo risco (0 pontos). Anticoagulação oral NÃO recomendada (Classe III).';
        acoes = ['Anticoagulação oral não indicada pelo escore.', 'Reavaliar fatores clínicos periodicamente.'];
      } else if (pontosClinicos === 1) {
        estado = 'ATENCAO';
        rotulo = 'RISCO INTERMEDIÁRIO';
        recTexto = fem
          ? 'Risco intermediário (2 pontos em mulher: 1 fator clínico não-sexo). Anticoagulação oral pode ser considerada (Classe IIa). Pesar risco de sangramento.'
          : 'Risco intermediário (1 ponto em homem: 1 fator clínico). Anticoagulação oral pode ser considerada (Classe IIa). Pesar risco de sangramento.';
        acoes = ['Considerar anticoagulação oral individualizada (DOAC preferencial).', 'Avaliar risco de sangramento (HAS-BLED).'];
      } else {
        estado = 'PRIORITARIO';
        rotulo = 'ANTICOAGULAÇÃO FORTEMENTE RECOMENDADA';
        recTexto = 'Alto risco (pontuação clínica ≥ 2: homem ≥ 2 ou mulher ≥ 3). Anticoagulação oral fortemente recomendada (Classe I, preferência DOACs).';
        acoes = ['Anticoagulação oral fortemente recomendada; DOAC preferencial.', 'Conferir função renal, interações e contraindicações.'];
      }
      return sucesso({
        id: ID, nome: NOME, estado: estado, rotulo: rotulo, principal: score + '/9',
        secoes: [['PONTUARAM', crit.length ? crit : ['Nenhum critério pontuou.']], ['AÇÃO', acoes]],
        avisos: ['Diretrizes recomendam CHA2DS2-VA (race/sex-free) para tomada de decisão; no CHA2DS2-VASc clássico, sexo feminino isolado não pontua como indicação.'],
        dados: { pontos: score, maximo: 9, criterios: crit },
        legado: { pontuacao: score, recomendacao: recTexto, criterios: crit },
        botoes: botoesPadrao(ID, [btn('💊 Revisar anticoagulação', ID, 'anticoag'), btn('🩸 Avaliar sangramento', ID, 'hasbled')])
      });
    });
  }

  /** HAS-BLED (Pisters 2010). E = idade > 65 anos. */
  function hasbled(h, aRenal, aHepatico, s, b, l, e, dDrogas, dAlcool) {
    var ID = 'hasbled', NOME = 'HAS-BLED';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var v = [
        bool(c, h, 'Hipertensão não controlada (PAS > 160)'),
        bool(c, aRenal, 'Disfunção renal (diálise, transplante ou Cr > 2,26 mg/dL)'),
        bool(c, aHepatico, 'Disfunção hepática (cirrose ou bilirrubina > 2× com AST/ALT > 3×)'),
        bool(c, s, 'AVC prévio'),
        bool(c, b, 'Sangramento maior prévio ou predisposição'),
        bool(c, l, 'INR lábil (se em uso de varfarina)'),
        bool(c, e, 'Idade > 65 anos'),
        bool(c, dDrogas, 'Antiplaquetário ou AINE'),
        bool(c, dAlcool, 'Álcool excessivo (≥ 8 doses/semana)')
      ];
      if (pendente(c)) return falhaCtx(ID, NOME, c);
      var nomes = ['H · Hipertensão não controlada', 'A · Disfunção renal', 'A · Disfunção hepática', 'S · AVC prévio',
                   'B · Sangramento prévio/predisposição', 'L · INR lábil', 'E · Idade > 65 anos',
                   'D · Antiplaquetário/AINE', 'D · Álcool excessivo'];
      var crit = [], score = 0;
      v.forEach(function (x, i) { if (x) { score++; crit.push(nomes[i] + ' · +1'); } });
      var mod = [];
      if (v[0]) mod.push('Controlar a pressão arterial');
      if (v[5]) mod.push('Melhorar controle do INR ou considerar DOAC');
      if (v[7]) mod.push('Revisar antiplaquetário/AINE');
      if (v[8]) mod.push('Reduzir o consumo de álcool');

      var alto = score >= 3;
      return sucesso({
        id: ID, nome: NOME, estado: alto ? 'ATENCAO' : 'BAIXO',
        rotulo: alto ? 'ALTO RISCO DE SANGRAMENTO' : 'RISCO BAIXO A MODERADO',
        principal: score + '/9',
        secoes: [
          ['PONTUARAM', crit.length ? crit : ['Nenhum critério pontuou.']],
          ['FATORES A REVISAR', mod.length ? mod : ['Nenhum identificado nas respostas fornecidas.']],
          ['AÇÃO', alto ? ['Corrigir fatores modificáveis e reforçar o acompanhamento.', 'Escore elevado, por si só, não contraindica anticoagulação.']
                        : ['Manter acompanhamento habitual.']]
        ],
        avisos: ['Não usar a pontuação isolada para suspender anticoagulação.'],
        dados: { pontos: score, maximo: 9 },
        legado: { pontuacao: score, altoRisco: alto, fatoresModificaveis: mod },
        botoes: botoesPadrao(ID, [btn('🔎 Revisar fatores', ID, 'fatores'), btn('✏️ Revisar dados', ID, 'editar')])
      });
    });
  }

  /** Wells para TEP. Pontuação em meios-pontos inteiros (sem erro de ponto flutuante). */
  function wellsTEP(sinaisTVP, diagAlternativoMenosProvavel, fcMaior100, imobilizacaoCirurgia, tepTvpPrevio, hemoptise, cancer) {
    var ID = 'wells', NOME = 'Wells (TEP)';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var itens = [
        [bool(c, sinaisTVP, 'Sinais/sintomas de TVP'), 'Sinais/sintomas de TVP', 6],
        [bool(c, diagAlternativoMenosProvavel, 'TEP é o diagnóstico mais provável'), 'TEP mais provável que diagnóstico alternativo', 6],
        [bool(c, fcMaior100, 'FC > 100 bpm'), 'FC > 100 bpm', 3],
        [bool(c, imobilizacaoCirurgia, 'Imobilização ≥ 3 dias ou cirurgia em 4 semanas'), 'Imobilização ≥ 3 dias ou cirurgia em 4 semanas', 3],
        [bool(c, tepTvpPrevio, 'TEP/TVP prévio'), 'TEP/TVP prévio', 3],
        [bool(c, hemoptise, 'Hemoptise'), 'Hemoptise', 2],
        [bool(c, cancer, 'Câncer ativo'), 'Câncer ativo', 2]
      ];
      if (pendente(c)) return falhaCtx(ID, NOME, c);
      var meios = 0, crit = [];
      itens.forEach(function (it) {
        if (it[0]) { meios += it[2]; crit.push(it[1] + ' · +' + fmt(it[2] / 2, 1)); }
      });
      var pontos = meios / 2;
      var provavel = meios > 8; // > 4,0 pontos
      var condutaTexto = provavel
        ? 'TEP Provável (> 4.0 pontos). Encaminhar para Angiotomografia computadorizada de tórax ou considerar anticoagulação se atraso.'
        : 'TEP Improvável (≤ 4.0 pontos). Solicitar D-dímero de alta sensibilidade; se negativo, TEP excluído com segurança.';

      return sucesso({
        id: ID, nome: NOME, estado: provavel ? 'PRIORITARIO' : 'BAIXO',
        rotulo: provavel ? 'TEP PROVÁVEL PELO ESCORE' : 'TEP IMPROVÁVEL PELO ESCORE',
        principal: fmt(pontos, 1) + ' pontos',
        secoes: [
          ['PONTUARAM', crit.length ? crit : ['Nenhum critério pontuou.']],
          ['PRÓXIMA ETAPA', provavel
            ? ['Angiotomografia de tórax; cintilografia V/Q se contraindicada.', 'Instabilidade hemodinâmica: ecocardiograma à beira-leito e conduta de TEP de alto risco.', 'Considerar anticoagulação empírica se atraso e baixo risco de sangramento.']
            : ['D-dímero de alta sensibilidade.', 'Negativo (corte idade-ajustado > 50a: idade × 10 ng/mL) exclui TEP.', 'Positivo: angiotomografia.']]
        ],
        avisos: [(7 - crit.length) + ' critérios negativos conferidos. D-dímero só se aplica em probabilidade improvável.'],
        dados: { pontos: pontos, provavel: provavel },
        legado: {
          pontuacao: pontos,
          classificacao: provavel ? 'TEP PROVÁVEL' : 'TEP IMPROVÁVEL',
          conduta: condutaTexto
        },
        botoes: botoesPadrao(ID, [btn('🔎 Abrir investigação', ID, 'investigar'), btn('✏️ Revisar dados', ID, 'editar')])
      });
    });
  }

  /** Glasgow e Glasgow-P (Brennan 2018). Pupilas não reagentes: 0, 1 ou 2. */
  function glasgowP(ocular, verbal, motor, pupilasNaoReagentes) {
    var ID = 'glasgow', NOME = 'Glasgow-P';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var o = num(c, ocular, 'Resposta ocular (1–4)', 1, 4, { inteiro: true });
      var vb = num(c, verbal, 'Resposta verbal (1–5)', 1, 5, { inteiro: true });
      var m = num(c, motor, 'Resposta motora (1–6)', 1, 6, { inteiro: true });
      var pInformado = !ausente(pupilasNaoReagentes);
      var p = pInformado ? num(c, pupilasNaoReagentes, 'Pupilas não reagentes (0–2)', 0, 2, { inteiro: true }) : null;
      if (pendente(c)) return falhaCtx(ID, NOME, c);
      var gcs = o + vb + m;
      var gp = pInformado ? (gcs - p) : null;
      var estado, rot, acao, gravidadeTexto;
      if (gcs <= 8) {
        estado = 'PRIORITARIO'; rot = 'GRAVE (GCS ≤ 8)';
        gravidadeTexto = 'TCE Grave (GCS ≤ 8). Indicação formal de via aérea definitiva e vaga de UTI.';
        acao = ['Avaliar via aérea definitiva (intubação orotraqueal imediata).', 'Neuroimagem urgente e avaliação neurocirúrgica se TCE.'];
      } else if (gcs <= 12) {
        estado = 'ATENCAO'; rot = 'MODERADO (GCS 9–12)';
        gravidadeTexto = 'TCE Moderado (GCS 9–12). Observação clínica estrita e tomografia de crânio.';
        acao = ['Observação seriada e neuroimagem.', 'Reavaliar a cada poucos minutos; piora exige via aérea definitiva.'];
      } else {
        estado = 'BAIXO'; rot = 'LEVE (GCS 13–15)';
        gravidadeTexto = 'TCE Leve (GCS 13–15). Avaliar critérios para TC de crânio (New Orleans / Canadian).';
        acao = ['Reavaliação seriada; seguir critérios de neuroimagem.'];
      }
      var comps = ['Ocular: ' + o + '/4', 'Verbal: ' + vb + '/5', 'Motor: ' + m + '/6'];
      if (pInformado) {
        comps.push('Pupilas não reagentes: ' + p + '/2');
      } else {
        comps.push('Reatividade pupilar: Não informada / pendente de exame');
      }
      var resLinhas = ['Glasgow (GCS): ' + gcs + '/15'];
      if (pInformado) {
        resLinhas.push('Glasgow-P: ' + gp + '/15 (GCS − ' + p + ')');
      } else {
        resLinhas.push('Glasgow-P: Não calculado (requer avaliação pupilar)');
      }
      return sucesso({
        id: ID, nome: NOME, estado: estado, rotulo: rot,
        principal: pInformado ? ('GCS-P ' + gp + '/15') : ('GCS ' + gcs + '/15'),
        secoes: [
          ['COMPONENTES', comps],
          ['RESULTADOS', resLinhas],
          ['AÇÃO', acao]
        ],
        avisos: ['Classificação por GCS; o GCS-P é índice prognóstico (TCE). Registrar fatores que limitam o exame (sedação, edema).'],
        dados: { gcs: gcs, gcsP: gp, pupilasAvaliadas: pInformado },
        legado: {
          glasgow: gcs + '/15',
          glasgowP: pInformado ? (gp + '/15') : null,
          gcs: gcs,
          gcsP: gp,
          gravidade: gravidadeTexto
        },
        botoes: botoesPadrao(ID, [btn('🫁 Avaliar via aérea', ID, 'via_aerea'), btn('✏️ Revisar exame', ID, 'editar')])
      });
    });
  }

  // ═════════════════════════════ ESTIMATIVAS & ELETRÓLITOS ═════════════════════════════

  /** Déficit de água livre (hipernatremia). */
  function deficitAguaLivre(naAtual, naAlvo, pesoKg, perfil) {
    var ID = 'dal', NOME = 'Déficit de Água Livre';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var na = num(c, naAtual, 'Na atual (mEq/L)', 100, 200);
      var alvo = num(c, naAlvo, 'Na de referência (mEq/L)', 120, 160, { opcional: true });
      if (alvo === null || alvo === 0) alvo = 140;
      var peso = num(c, pesoKg, 'Peso (kg)', 2, 350);
      var fator = NaN;
      if (ausente(perfil)) { c.faltas.push('Perfil (homem, mulher, idoso, idosa, criança)'); }
      else if (typeof perfil !== 'string') { c.erros.push('Perfil: texto esperado'); }
      else {
        var p = semAcento(perfil);
        var crianca = p.indexOf('crianca') !== -1;
        var fem = p.indexOf('mulher') !== -1 || p.indexOf('idosa') !== -1;
        var masc = p.indexOf('homem') !== -1 || p.indexOf('idoso') !== -1;
        var idoso = p.indexOf('idos') !== -1;
        if (crianca) fator = 0.6;
        else if (fem && !masc) fator = idoso ? 0.45 : 0.5;
        else if (masc && !fem) fator = idoso ? 0.5 : 0.6;
        else c.erros.push('Perfil não reconhecido (use homem, mulher, idoso, idosa ou criança)');
      }
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      var act = peso * fator;
      var def = act * (na / alvo - 1);
      exigirFinito(act, def);
      var defL = Math.round(def * 10) / 10;
      var actL = Math.round(act * 10) / 10;

      if (lte(na, alvo)) {
        return sucesso({
          id: ID, nome: NOME, estado: 'CALCULO', rotulo: 'SEM DÉFICIT PELA FÓRMULA',
          principal: '0,0 L',
          secoes: [['ENTRADAS', ['Na atual: ' + fmt(na, 0) + ' mEq/L', 'Na de referência: ' + fmt(alvo, 0) + ' mEq/L', 'Peso: ' + fmt(peso, 1) + ' kg']]],
          avisos: ['Na atual não é maior que a referência: fórmula de hipernatremia não se aplica.'],
          dados: { deficitL: 0, actL: actL },
          legado: { deficitLitros: 0, aguaCorporalTotal: actL },
          botoes: [[btn('✏️ Revisar dados', ID, 'editar'), btn('📄 Gerar PDF', ID, 'pdf')]]
        });
      }
      return sucesso({
        id: ID, nome: NOME, estado: 'CALCULO', principal: fmt(def, 1) + ' L',
        secoes: [
          ['ENTRADAS', ['Na atual: ' + fmt(na, 0) + ' mEq/L', 'Na de referência: ' + fmt(alvo, 0) + ' mEq/L', 'Peso: ' + fmt(peso, 1) + ' kg',
                        'Perfil: ' + semAcento(perfil), 'Água corporal estimada: ' + fmt(act, 1) + ' L (fator ' + fmt(fator, 2) + ')']],
          ['AÇÃO', ['Usar como estimativa inicial de planejamento.', 'Reposição preferencialmente enteral/VO ou SG 5%; checar Na a cada 4–6 h.']]
        ],
        avisos: ['Estimativa: não inclui perdas contínuas nem a água de manutenção.', 'Limite de correção: no máximo 10 mEq/L em 24 h (menor em hipernatremia crônica).'],
        dados: { deficitL: defL, actL: actL, fator: fator },
        legado: { deficitLitros: defL, aguaCorporalTotal: actL },
        botoes: botoesPadrao(ID, [btn('💧 Abrir planejamento', ID, 'plano'), btn('✏️ Revisar dados', ID, 'editar')])
      });
    });
  }

  /**
   * Cálcio Corrigido pela Albumina (Payne 1973)
   * Ca_corr = Ca_total + 0.8 * (4.0 - Albumina)
   */
  function calcioCorrigido(calcioTotal, albumina) {
    var ID = 'calcio', NOME = 'Cálcio Corrigido por Albumina';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var ca = num(c, calcioTotal, 'Cálcio total (mg/dL)', 2, 25);
      var alb = num(c, albumina, 'Albumina sérica (g/dL)', 0.5, 7.0);
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      var caCorr = ca + 0.8 * (4.0 - alb);
      exigirFinito(caCorr);
      var caCorrFmt = Math.round(caCorr * 10) / 10;

      var estado, rotulo, statusTexto, conduta;
      if (caCorr < 8.5) {
        estado = 'ATENCAO'; rotulo = 'HIPOCALCEMIA VERDADEIRA';
        statusTexto = 'Hipocalcemia (< 8.5 mg/dL)';
        conduta = ['Investigar hipomagnesemia e deficiência de vitamina D.', 'Sintomático (Chvostek, Trousseau, QT longo): Gluconato de Cálcio 10% IV lento.'];
      } else if (caCorr > 10.5) {
        estado = 'PRIORITARIO'; rotulo = 'HIPERCALCEMIA VERDADEIRA';
        statusTexto = 'Hipercalcemia (> 10.5 mg/dL)';
        conduta = ['Hipercalcemia grave (> 14 mg/dL): Hidratação venosa vigorosa com SF 0.9% e Furosemida.', 'Avaliar Bisfosfonatos (Ácido Zoledrônico) e investigar hiperparatireoidismo / neoplasia.'];
      } else {
        estado = 'BAIXO'; rotulo = 'CÁLCIO CORRIGIDO NORMAL';
        statusTexto = 'Normocalcemia (8.5 a 10.5 mg/dL)';
        conduta = ['Níveis normocalcêmicos fisiológicos após correção de albumina. Manter seguimento habitual.'];
      }

      return sucesso({
        id: ID, nome: NOME, estado: estado, rotulo: rotulo,
        principal: fmt(caCorr, 1) + ' mg/dL',
        secoes: [
          ['ENTRADAS', ['Cálcio Total Medido: ' + fmt(ca, 1) + ' mg/dL', 'Albumina Sérica: ' + fmt(alb, 1) + ' g/dL']],
          ['CLASSIFICAÇÃO', [statusTexto]],
          ['AÇÃO', conduta]
        ],
        avisos: ['A fórmula de Payne é uma estimativa. Em UTI ou distúrbios críticos, o padrão-ouro é dosar o Cálcio Iônico diretamente.'],
        dados: { calcioMedido: ca, albumina: alb, calcioCorrigido: caCorrFmt },
        legado: { calcioCorrigido: caCorrFmt, status: statusTexto },
        botoes: botoesPadrao(ID, [btn('🧪 Repetir exame', ID, 'repetir'), btn('✏️ Editar dados', ID, 'editar')])
      });
    });
  }

  /**
   * Gap Osmolar (Diferença entre osmolaridade medida e calculada)
   * Osm_calc = 2 * Na + Glicose / 18 + Ureia / 6  (ou BUN / 2.8)
   */
  function gapOsmolar(osmMedida, na, glicose, ureia) {
    var ID = 'gaposm', NOME = 'Gap Osmolar Sérico';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var om = num(c, osmMedida, 'Osmolaridade medida (mOsm/kg)', 150, 500);
      var n = num(c, na, 'Sódio (mEq/L)', 100, 200);
      var g = num(c, glicose, 'Glicose (mg/dL)', 10, 2000);
      var u = num(c, ureia, 'Ureia (mg/dL)', 5, 500);
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      var osmCalc = 2 * n + (g / 18) + (u / 6);
      var gap = om - osmCalc;
      exigirFinito(osmCalc, gap);
      var gapFmt = Math.round(gap * 10) / 10;

      var estado, rotulo, conduta;
      if (gap > 10) {
        estado = 'PRIORITARIO'; rotulo = 'GAP OSMOLAR ELEVADO (> 10 mOsm/kg)';
        conduta = [
          'Sugere presença de solutos não medidos: Metanol, Etilenoglicol, Isopropanol, Propilenoglicol, Manitol.',
          'Se acidose metabólica grave concomitante: suspeita máxima de intoxicação por álcoois tóxicos.',
          'Iniciar suporte, Fomepizol ou Etanol e avaliar hemodiálise de emergência.'
        ];
      } else {
        estado = 'BAIXO'; rotulo = 'GAP OSMOLAR NORMAL (≤ 10 mOsm/kg)';
        conduta = ['Gap osmolar dentro da faixa de referência habitual.'];
      }

      return sucesso({
        id: ID, nome: NOME, estado: estado, rotulo: rotulo,
        principal: fmt(gap, 1) + ' mOsm/kg',
        secoes: [
          ['VALORES', ['Osmolaridade Medida: ' + fmt(om, 1) + ' mOsm/kg', 'Osmolaridade Calculada: ' + fmt(osmCalc, 1) + ' mOsm/kg', 'Fórmula: 2×Na + Glicose/18 + Ureia/6']],
          ['AÇÃO', conduta]
        ],
        avisos: ['Um gap normal não exclui totalmente intoxicação em fases muito tardias de metabolização.'],
        dados: { osmolaridadeMedida: om, osmolaridadeCalculada: Math.round(osmCalc * 10) / 10, gapOsmolar: gapFmt },
        legado: { gapOsmolar: gapFmt, osmCalculada: Math.round(osmCalc * 10) / 10 },
        botoes: botoesPadrao(ID, [btn('🧪 Investigar intoxicação', ID, 'intoxicacao'), btn('✏️ Editar dados', ID, 'editar')])
      });
    });
  }

  /**
   * Estadiamento KDIGO de Injúria Renal Aguda (IRA / LRA)
   */
  function estadiamentoKDIGO(crAtual, crBase, debitoUrinarioMlKgH, tempoHoras) {
    var ID = 'kdigo_ira', NOME = 'Estadiamento KDIGO (Injúria Renal Aguda)';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var ca = num(c, crAtual, 'Creatinina atual (mg/dL)', 0.1, 30);
      var cb = num(c, crBase, 'Creatinina basal (mg/dL)', 0.1, 30, { opcional: true });
      var du = num(c, debitoUrinarioMlKgH, 'Débito urinário (mL/kg/h)', 0, 10, { opcional: true });
      var th = num(c, tempoHoras, 'Tempo do débito (horas)', 1, 72, { opcional: true });
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      // Verificação de suficiência de dados
      if (cb === null && (du === null || th === null)) {
        return {
          ok: false,
          incompleto: true,
          id: ID,
          nome: NOME,
          estado: 'INCOMPLETO',
          icone: '⚪',
          rotulo: 'DADOS INSUFICIENTES PARA ESTADIAMENTO KDIGO',
          texto: '⚪ <b>ESTADIAMENTO KDIGO DE IRA</b>\n\n' +
            '⚠️ <b>Dados insuficientes:</b> Para estadiar Injúria Renal Aguda pelo KDIGO, é obrigatório informar:\n' +
            '• Creatinina basal (para comparação com a creatinina atual de ' + fmt(ca, 2) + ' mg/dL), OU\n' +
            '• Débito urinário (mL/kg/h) e período de monitorização (horas).\n\n' +
            '<i>Nota: Um valor isolado de creatinina sem basal ou diurese não permite distinguir IRA de DRC prévia estável.</i>',
          textoFormatado: '⚪ *ESTADIAMENTO KDIGO INCOMPLETO*\nInforme Creatinina Basal ou Débito Urinário.',
          dados: { estagio: null, crAtual: ca, estagioCr: null, estagioDU: null }
        };
      }

      var estagioCr = 0, estagioDU = 0, criterios = [];
      if (cb !== null) {
        var aumentoAbs = ca - cb;
        var razaoCr = ca / cb;
        if (razaoCr >= 3.0 || ca >= 4.0) {
          estagioCr = 3;
          criterios.push('Creatinina ≥ 3.0× basal ou ≥ 4.0 mg/dL com aumento agudo');
        } else if (razaoCr >= 2.0) {
          estagioCr = 2;
          criterios.push('Creatinina 2.0 a 2.9× basal');
        } else if (razaoCr >= 1.5 || aumentoAbs >= 0.3) {
          estagioCr = 1;
          criterios.push('Aumento de Cr ≥ 0.3 mg/dL ou 1.5 a 1.9× basal');
        }
      }

      if (du !== null && th !== null) {
        // KDIGO 2012 / 2024:
        // Estágio 3: Débito < 0.3 mL/kg/h por ≥ 24h OU Anúria por ≥ 12h
        // Estágio 2: Débito < 0.5 mL/kg/h por ≥ 12h
        // Estágio 1: Débito < 0.5 mL/kg/h por 6-12h
        if (du === 0 && th >= 12) {
          estagioDU = 3;
          criterios.push('Anúria por ≥ 12h (Critério KDIGO 3)');
        } else if (du < 0.3 && th >= 24) {
          estagioDU = 3;
          criterios.push('Débito < 0.3 mL/kg/h por ≥ 24h (Critério KDIGO 3)');
        } else if (du < 0.5 && th >= 12) {
          estagioDU = 2;
          criterios.push('Débito < 0.5 mL/kg/h por ' + th + 'h (Critério KDIGO 2)');
        } else if (du < 0.5 && th >= 6) {
          estagioDU = 1;
          criterios.push('Débito < 0.5 mL/kg/h por 6-12h (Critério KDIGO 1)');
        }
      }

      var estagioFinal = Math.max(estagioCr, estagioDU);
      var estado, rotulo, conduta;
      if (estagioFinal === 3) {
        estado = 'PRIORITARIO'; rotulo = 'KDIGO ESTÁGIO 3 (GRAVE)';
        conduta = ['Ajustar rigorosamente doses de antimicrobianos e medicações nefrotóxicas.', 'Monitorar K⁺ e equilíbrio ácido-base a cada 4-6h.', 'Avaliar indicações de Terapia de Substituição Renal (TRS/Hemodiálise).'];
      } else if (estagioFinal === 2) {
        estado = 'ATENCAO'; rotulo = 'KDIGO ESTÁGIO 2 (MODERADO)';
        conduta = ['Suspender todos os nefrotóxicos (AINEs, contraste iodado, etc.).', 'Otimizar perfusão volêmica e PAM alvo ≥ 65 mmHg.', 'Revisar exames e débito urinário de horário.'];
      } else if (estagioFinal === 1) {
        estado = 'ATENCAO'; rotulo = 'KDIGO ESTÁGIO 1 (LEVE)';
        conduta = ['Identificar e corrigir etiologia (desidratação, sepse, drogas).', 'Evitar contraste e monitorar creatinina em 24-48h.'];
      } else {
        estado = 'BAIXO'; rotulo = 'SEM CRITÉRIO KDIGO PARA IRA';
        conduta = ['Função renal estável conforme parâmetros basais informados.'];
      }

      return sucesso({
        id: ID, nome: NOME, estado: estado, rotulo: rotulo,
        principal: 'Estágio ' + estagioFinal,
        secoes: [
          ['CRITÉRIOS ATENDIDOS', criterios.length ? criterios : ['Nenhum critério para IRA atingido']],
          ['AÇÃO', conduta]
        ],
        avisos: ['KDIGO 2024: A classificação por débito urinário e creatinina tem implicações prognósticas diretas.'],
        dados: { estagio: estagioFinal, criterios: criterios },
        legado: { estagioKDIGO: estagioFinal },
        botoes: botoesPadrao(ID, [btn('💊 Ajuste renal', ID, 'ajuste'), btn('💧 Balanço hídrico', ID, 'balanco')])
      });
    });
  }

  // ═════════════════════════════ GASOMETRIA ═════════════════════════════

  function gasometria(phVal, pco2Val, hco3Val, naVal, clVal, albVal, pao2Val, fio2Val) {
    var ID = 'gaso', NOME = 'Gasometria arterial';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var ph = num(c, phVal, 'pH', 6.5, 8.0);
      var pco2 = num(c, pco2Val, 'PaCO₂ (mmHg)', 5, 200);
      var hco3 = num(c, hco3Val, 'HCO₃⁻ (mEq/L)', 2, 70);
      var na = num(c, naVal, 'Na (mEq/L)', 100, 200, { opcional: true });
      var cl = num(c, clVal, 'Cl (mEq/L)', 60, 160, { opcional: true });
      var alb = num(c, albVal, 'Albumina (g/dL)', 0.5, 7, { opcional: true });
      var pao2 = num(c, pao2Val, 'PaO₂ (mmHg)', 10, 700, { opcional: true });
      var fio2raw = num(c, fio2Val, 'FiO₂ (0,21–1,0 ou 21–100%)', 0.21, 100, { opcional: true });
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      var avisos = [];
      var phCalc = 6.1 + Math.log(hco3 / (0.0307 * pco2)) / Math.LN10;
      exigirFinito(phCalc);
      if (Math.abs(phCalc - ph) > 0.1) avisos.push('Inconsistência interna (pH calculado ≈ ' + fmt(phCalc, 2) + '): conferir se a amostra é arterial.');

      var pHbaixo = lt(ph, 7.35), pHalto = gt(ph, 7.45);
      var acMet = lt(hco3, 22), alMet = gt(hco3, 26), acResp = gt(pco2, 45), alResp = lt(pco2, 35);

      var disturbio;
      if (pHbaixo) {
        if (acMet && acResp) disturbio = 'Acidose Mista (Metabólica + Respiratória)';
        else if (acMet) disturbio = 'Acidose Metabólica';
        else if (acResp) disturbio = 'Acidose Respiratória';
        else disturbio = 'Acidemia sem alteração evidente de PaCO₂/HCO₃⁻';
      } else if (pHalto) {
        if (alMet && alResp) disturbio = 'Alcalose Mista (Metabólica + Respiratória)';
        else if (alMet) disturbio = 'Alcalose Metabólica';
        else if (alResp) disturbio = 'Alcalose Respiratória';
        else disturbio = 'Alcalemia sem alteração evidente de PaCO₂/HCO₃⁻';
      } else {
        if (acMet && alResp) disturbio = 'Distúrbio Misto com pH normal (Acidose Metabólica + Alcalose Respiratória)';
        else if (alMet && acResp) disturbio = 'Distúrbio Misto com pH normal (Alcalose Metabólica + Acidose Respiratória)';
        else if (acMet || alMet || acResp || alResp) disturbio = 'pH normal compensado ou distúrbio misto';
        else disturbio = 'Gasometria Normal / Sem distúrbio ácido-base evidente';
      }

      var compEsp = null, compAval = null;
      if (acMet && !pHalto) {
        var base = 1.5 * hco3 + 8, mn = base - 2, mx = base + 2;
        compEsp = 'Winter: PaCO₂ esperada ' + fmt(mn, 1) + '–' + fmt(mx, 1) + ' mmHg';
        compAval = gt(pco2, mx) ? 'PaCO₂ acima do esperado: Acidose Respiratória associada'
                 : lt(pco2, mn) ? 'PaCO₂ abaixo do esperado: Alcalose Respiratória associada'
                 : 'Resposta compensatória adequada';
      } else if (alMet && !pHbaixo) {
        var b2 = 40 + 0.7 * (hco3 - 24), mn2 = b2 - 2, mx2 = b2 + 2;
        compEsp = 'PaCO₂ esperada ' + fmt(mn2, 1) + '–' + fmt(mx2, 1) + ' mmHg';
        compAval = gt(pco2, mx2) ? 'PaCO₂ acima do esperado: Acidose Respiratória associada'
                 : lt(pco2, mn2) ? 'PaCO₂ abaixo do esperado: Alcalose Respiratória associada'
                 : 'Resposta compensatória adequada';
      } else if (acResp && !acMet && pHbaixo) {
        var ag1 = 24 + 0.1 * (pco2 - 40), cr1 = 24 + 0.35 * (pco2 - 40);
        compEsp = 'HCO₃⁻ esperado ' + fmt(ag1, 1) + ' (aguda) a ' + fmt(cr1, 1) + ' (crônica) mEq/L';
        compAval = lt(hco3, ag1 - 2) ? 'HCO₃⁻ abaixo do esperado: Acidose Metabólica associada'
                 : gt(hco3, cr1 + 2) ? 'HCO₃⁻ acima do esperado: Alcalose Metabólica associada'
                 : 'Compatível com acidose respiratória pura (aguda a crônica)';
      } else if (alResp && !alMet && pHalto) {
        var ag2 = 24 - 0.2 * (40 - pco2), cr2 = 24 - 0.5 * (40 - pco2);
        compEsp = 'HCO₃⁻ esperado ' + fmt(cr2, 1) + ' (crônica) a ' + fmt(ag2, 1) + ' (aguda) mEq/L';
        compAval = gt(hco3, ag2 + 2) ? 'HCO₃⁻ acima do esperado: Alcalose Metabólica associada'
                 : lt(hco3, cr2 - 2) ? 'HCO₃⁻ abaixo do esperado: Acidose Metabólica associada'
                 : 'Compatível com alcalose respiratória pura (aguda a crônica)';
      }

      var secAG = [], agSerico = null, agCorr = null, delta = null, interpAG = '';
      if ((na === null) !== (cl === null)) {
        avisos.push('Ânion gap não calculado: informar Na e Cl juntos.');
      } else if (na !== null) {
        agSerico = na - (cl + hco3);
        agCorr = alb !== null ? agSerico + 2.5 * (4.0 - alb) : null;
        exigirFinito(agSerico);
        var agRef = agCorr !== null ? agCorr : agSerico;
        secAG.push('AG: ' + fmt(agSerico, 1) + ' mEq/L');
        secAG.push(agCorr !== null ? 'AG corrigido (albumina ' + fmt(alb, 1) + ' g/dL): ' + fmt(agCorr, 1) + ' mEq/L'
                                   : 'AG corrigido: não calculado — albumina ausente');
        if (gt(agRef, 12)) {
          interpAG = 'Ânion Gap ELEVADO (> 12 mEq/L)';
          secAG.push(interpAG);
          if (lt(hco3, 24)) {
            delta = (agRef - 12) / (24 - hco3);
            exigirFinito(delta);
            var it;
            if (lt(delta, 0.4)) it = 'Razão delta ' + fmt(delta, 2) + ' (< 0,4): predomina acidose hiperclorêmica associada';
            else if (lt(delta, 0.8)) it = 'Razão delta ' + fmt(delta, 2) + ' (0,4–0,8): acidose mista AG elevado + hiperclorêmica';
            else if (lte(delta, 2.0)) it = 'Razão delta ' + fmt(delta, 2) + ' (0,8–2,0): acidose de AG elevado pura';
            else it = 'Razão delta ' + fmt(delta, 2) + ' (> 2,0): considerar alcalose metabólica associada';
            secAG.push(it);
          }
        } else {
          interpAG = 'Ânion Gap NORMAL (≤ 12 mEq/L)';
          secAG.push(acMet ? 'AG normal: acidose hiperclorêmica (perda digestiva, ATR, SF 0.9%)' : interpAG);
        }
      }

      var secOx = [], pf = null, classifPF = '';
      if (pao2 !== null && fio2raw !== null) {
        var fio2 = fio2raw > 1 ? fio2raw / 100 : fio2raw;
        if (fio2 < 0.21 - EPS || fio2 > 1 + EPS) throw new Error('FIO2_INVALIDA');
        pf = pao2 / fio2;
        exigirFinito(pf);
        var pfNum = Math.round(pf);
        secOx.push('PaO₂/FiO₂: ' + fmt(pf, 0) + ' mmHg (FiO₂ ' + fmt(fio2 * 100, 0) + '%)');
        if (gt(pf, 300)) classifPF = 'Oxigenação Normal (> 300)';
        else if (gt(pf, 200)) classifPF = 'SDRA Leve (Berlim 201–300)';
        else if (gt(pf, 100)) classifPF = 'SDRA Moderada (Berlim 101–200)';
        else classifPF = 'SDRA Grave (Berlim ≤ 100)';
        secOx.push(classifPF);
        avisos.push('SDRA (Berlim 2012) exige: opacidades bilaterais agudas, PEEP ≥ 5 cmH₂O e sem origem cardiogênica exclusiva.');
      }

      var critico = lt(ph, 7.20) || gt(ph, 7.60) || (pf !== null && lte(pf, 100));
      var alterado = disturbio.indexOf('Normal') === -1;
      var estado = critico ? 'PRIORITARIO' : (alterado || (pf !== null && lte(pf, 300)) ? 'ATENCAO' : 'CALCULO');
      var rotulo = critico ? 'ALTERAÇÃO GRAVE · ' + disturbio.toUpperCase() : disturbio.toUpperCase();

      var secoes = [['RESULTADO', ['pH: ' + fmt(ph, 2), 'PaCO₂: ' + fmt(pco2, 0) + ' mmHg', 'HCO₃⁻: ' + fmt(hco3, 0) + ' mEq/L', disturbio]]];
      if (compEsp) secoes.push(['COMPENSAÇÃO', [compEsp, compAval]]);
      if (secAG.length) secoes.push(['ÂNION GAP', secAG]);
      if (secOx.length) secoes.push(['OXIGENAÇÃO', secOx]);

      var pfFinal = (pf !== null ? Math.round(pf) : null);
      var agFinal = (agSerico !== null ? Math.round(agSerico * 10) / 10 : null);
      var agcFinal = (agCorr !== null ? Math.round(agCorr * 10) / 10 : null);

      return sucesso({
        id: ID, nome: NOME, estado: estado, rotulo: rotulo, principal: 'pH ' + fmt(ph, 2),
        secoes: secoes, avisos: avisos,
        dados: { disturbio: disturbio, anionGap: agFinal, anionGapCorrigido: agcFinal, razaoDelta: delta, pfRatio: pfFinal },
        legado: {
          ph: ph,
          pco2: pco2,
          hco3: hco3,
          disturbio: disturbio,
          compensacao: compEsp,
          avaliacaoCompensacao: compAval,
          anionGap: agFinal,
          anionGapCorrigido: agcFinal,
          interpretacaoAG: interpAG,
          pfRatio: pfFinal,
          classificacaoPF: classifPF
        },
        botoes: [[btn('🧪 Ver ácido-base', ID, 'acidobase'), btn('🫁 Ver oxigenação', ID, 'oxigenacao')],
                 [btn('✏️ Revisar dados', ID, 'editar'), btn('📄 Gerar PDF', ID, 'pdf')]]
      });
    });
  }

  // ═════════════════════════════ INFUSÕES (SALA VERMELHA) ═════════════════════════════

  var DVA = {
    noradrenalina: {
      nome: 'Noradrenalina', unidade: 'mcg/kg/min', peso: true, conc: 'mcg/mL',
      preparos: {
        padrao: { mg: 16, vol: 250, conc: 64, ref: 'Ampola: 4 mg/4 mL (1 mg/mL); padrão: 4 ampolas (16 mg) em 234 mL SG5% (64 mcg/mL).' },
        concentrada: { mg: 32, vol: 250, conc: 128, ref: 'Ampola: 4 mg/4 mL (1 mg/mL); concentrada: 8 ampolas (32 mg) em 218 mL SG5% (128 mcg/mL).' }
      },
      doses: [0.05, 0.1, 0.2, 0.5, 1.0],
      acoes: ['Início habitual: 0,05–0,1 mcg/kg/min; titular para PAM ≥ 65 mmHg.', 'Preferir acesso venoso central. Monitorar perfusão periférica e lactato.'],
      aviso: null
    },
    dobutamina: {
      nome: 'Dobutamina', unidade: 'mcg/kg/min', peso: true, conc: 'mcg/mL',
      preparos: {
        padrao: { mg: 250, vol: 250, conc: 1000, ref: 'Ampola: 250 mg/20 mL; padrão: 1 ampola (250 mg) em 230 mL SG5% (1000 mcg/mL).' }
      },
      doses: [2.5, 5, 10, 15, 20],
      acoes: ['Início habitual: 2,5–5 mcg/kg/min; titular até 20 mcg/kg/min.', 'Monitorar taquiarritmias, isquemia miocárdica e hipotensão.'],
      aviso: null
    },
    nitroprussiato: {
      nome: 'Nitroprussiato de sódio', unidade: 'mcg/kg/min', peso: true, conc: 'mcg/mL',
      preparos: {
        padrao: { mg: 50, vol: 250, conc: 200, ref: 'Ampola: 50 mg/2 mL; padrão: 1 ampola (50 mg) em 248 mL SG5% (200 mcg/mL, fotoprotetor).' }
      },
      doses: [0.3, 0.5, 1, 2, 3, 5],
      acoes: ['Início habitual: 0,3–0,5 mcg/kg/min; titular com linha arterial.', 'Cuidado com toxicidade por cianeto/tiocianato em uso prolongado.'],
      aviso: null
    },
    nitroglicerina: {
      nome: 'Nitroglicerina', unidade: 'mcg/min', peso: false, conc: 'mcg/mL',
      preparos: {
        padrao: { mg: 50, vol: 250, conc: 200, ref: 'Ampola: 50 mg/10 mL; padrão: 1 ampola (50 mg) em 240 mL SG5% ou SF0.9% (200 mcg/mL).' }
      },
      doses: [5, 10, 20, 30, 50, 100],
      acoes: ['Início habitual: 5–10 mcg/min; titular a cada 5–10 min.', 'Contraindicações: Infarto de VD, PAS < 90 mmHg, Sildenafila < 24h ou Tadalafila < 48h.'],
      aviso: null
    },
    vasopressina: {
      nome: 'Vasopressina', unidade: 'UI/min', peso: false, conc: 'UI/mL',
      preparos: {
        padrao: { mg: 20, vol: 100, conc: 0.2, ref: 'Ampola: 20 UI/1 mL; padrão: 1 ampola (20 UI) em 99 mL SG5% (0,2 UI/mL).' }
      },
      doses: [0.01, 0.02, 0.03, 0.04],
      acoes: ['Dose fixa: 0,03 UI/min (SSC 2021) = 9 mL/h; não titular.', 'Iniciar quando noradrenalina estiver em 0,25–0,5 mcg/kg/min.'],
      aviso: 'Não titular como catecolamina. Dose contínua fixa.'
    }
  };

  var DVA_ALIAS = {
    noradrenalina: 'noradrenalina', norepinefrina: 'noradrenalina', nora: 'noradrenalina',
    dobutamina: 'dobutamina', dobuta: 'dobutamina',
    vasopressina: 'vasopressina', vaso: 'vasopressina', pitressin: 'vasopressina',
    nitroprussiato: 'nitroprussiato', nipride: 'nitroprussiato',
    nitroglicerina: 'nitroglicerina', tridil: 'nitroglicerina'
  };

  function drogasVasoativas(droga, pesoKg, solucao) {
    var ID = 'dva', NOME = 'Infusão de Vasoativo';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var chave = ausente(droga) ? 'noradrenalina' : DVA_ALIAS[semAcento(droga)];
      if (!chave) {
        c.erros.push('Droga não reconhecida (noradrenalina, dobutamina, vasopressina, nitroprussiato, nitroglicerina)');
        return falhaCtx(ID, NOME, c);
      }
      var d = DVA[chave];
      var peso = null;
      if (d.peso) peso = num(c, pesoKg, 'Peso (kg)', 30, 350);
      var tipoSol = ausente(solucao) ? 'padrao' : semAcento(solucao);
      if (tipoSol === 'concentrado' || tipoSol === 'concentrada' || tipoSol === '2x') tipoSol = 'concentrada';
      if (tipoSol !== 'padrao' && tipoSol !== 'concentrada') c.erros.push('Solução: use "padrao" ou "concentrada"');
      else if (!d.preparos[tipoSol]) c.erros.push('Solução "' + tipoSol + '" não disponível para ' + d.nome);
      if (pendente(c)) return falhaCtx(ID, d.nome, c);

      var prep = d.preparos[tipoSol];
      var mg = prep.mg;
      var volFinal = prep.vol;
      var conc = prep.conc;
      var textoPreparo = prep.ref;
      exigirFinito(conc);
      if (!(conc > 0)) throw new Error('CONCENTRACAO_ZERO');

      var maxRate = 0;
      var tabelaLegada = [];
      var linhas = d.doses.map(function (dose) {
        var ml;
        if (d.unidade === 'mcg/kg/min') ml = (dose * peso * 60) / conc;
        else if (d.unidade === 'mcg/min') ml = (dose * 60) / conc;
        else ml = (dose * 60) / conc;
        exigirFinito(ml);
        if (ml > maxRate) maxRate = ml;
        var mlArred = Math.round(ml * 10) / 10;
        tabelaLegada.push({ doseMcgKgMin: dose, mlH: mlArred, dose: dose });
        var mlTxt = (mlArred % 1 === 0 ? mlArred : fmt(mlArred, 1)) + ' mL/h';
        return fmt(dose, dose < 0.1 ? 2 : (dose % 1 === 0 ? 0 : 1)) + ' ' + d.unidade + ' → ' + mlTxt;
      });

      var base = [];
      if (d.peso) base.push('Peso: ' + fmt(peso, 1) + ' kg');
      base.push('Quantidade de fármaco: ' + fmt(mg, 0) + (d.unidade === 'UI/min' ? ' UI' : ' mg'));
      base.push('Volume final: ' + fmt(volFinal, 0) + ' mL');
      base.push('Concentração: ' + fmt(conc, d.unidade === 'UI/min' ? 1 : 0) + ' ' + d.conc);
      base.push(textoPreparo);

      var avisos = ['Vazões calculadas para a concentração acima. Dupla checagem obrigatória na bomba.'];
      if (d.aviso) avisos.unshift(d.aviso);

      var taxaFixaVaso = (chave === 'vasopressina' ? 9.0 : null);
      return sucesso({
        id: ID, nome: d.nome, estado: 'CALCULO', rotulo: 'CÁLCULO DE INFUSÃO · CONFERIR PREPARO',
        principal: fmt(conc, d.unidade === 'UI/min' ? 1 : 0) + ' ' + d.conc,
        secoes: [['BASE DO CÁLCULO', base], ['DOSE → VAZÃO', linhas], ['AÇÃO', ['Alvo inicial: PAM ≥ 65 mmHg.'].concat(d.acoes)]],
        avisos: avisos,
        dados: { droga: chave, concentracao: conc, unidadeConcentracao: d.conc, solucao: tipoSol, tabela: tabelaLegada },
        legado: {
          droga: d.nome,
          concentracaoMcgMl: conc,
          pesoKg: peso,
          tabela: tabelaLegada,
          taxaMlH: taxaFixaVaso || (tabelaLegada[0] ? tabelaLegada[0].mlH : null),
          preparo: textoPreparo
        },
        botoes: botoesPadrao(ID, [btn('🎚️ Calcular outra dose', ID, 'dose'), btn('🧴 Revisar preparo', ID, 'preparo')])
      });
    });
  }

  // ═════════════════════════════ SEQUÊNCIA RÁPIDA DE INTUBAÇÃO ═════════════════════════════

  var SRI_FARMACOS = {
    etomidato:      { nome: 'Etomidato',      dose: 0.3, un: 'mg', conc: 2,  txt: '0,3 mg/kg · 2 mg/mL (ampola 20mg/10mL)',  grupo: 'indutor' },
    quetamina:      { nome: 'Quetamina',      dose: 1.5, un: 'mg', conc: 50, txt: '1,5 mg/kg · 50 mg/mL (ampola 50mg/mL)', grupo: 'indutor' },
    propofol:       { nome: 'Propofol 1%',    dose: 1.5, un: 'mg', conc: 10, txt: '1,5 mg/kg · 10 mg/mL (ampola 1%)',        grupo: 'indutor' },
    midazolam:      { nome: 'Midazolam',      dose: 0.2, un: 'mg', conc: 5,  txt: '0,2 mg/kg · 5 mg/mL (ampola 5mg/mL)',   grupo: 'indutor' },
    rocuronio:      { nome: 'Rocurônio',      dose: 1.2, un: 'mg', conc: 10, txt: '1,2 mg/kg · 10 mg/mL (frasco 50mg/5mL)', grupo: 'bloqueador' },
    succinilcolina: { nome: 'Succinilcolina', dose: 1.5, un: 'mg', conc: 10, txt: '1,5 mg/kg · 10 mg/mL (frasco 100mg/10mL)', grupo: 'bloqueador' },
    fentanil:       { nome: 'Fentanil',       dose: 2.0, un: 'mcg',conc: 50, txt: '2 mcg/kg · 50 mcg/mL (ampola 50mcg/mL)',  grupo: 'adjuvante' }
  };

  function resolverFarmaco(ctx, v, grupo, rotulo) {
    if (ausente(v)) return null;
    var k = semAcento(v);
    if (k === 'succinil' || k === 'suxametonio') k = 'succinilcolina';
    if (k === 'rocuronio' || k === 'roc') k = 'rocuronio';
    if (k === 'ketamina' || k === 'cetamina') k = 'quetamina';
    if (k === 'nenhum' || k === 'nao') return null;
    var f = SRI_FARMACOS[k];
    if (!f || f.grupo !== grupo) { ctx.erros.push(rotulo + ': fármaco inválido para esta etapa'); return null; }
    return { chave: k, f: f };
  }

  /**
   * SRI / IOT (Pronto-Socorro & UTI)
   * Se indutor/bloqueador forem informados, gera relatório direcionado.
   * Se NÃO informados (ex: '/sri 70'), calcula e exibe o CARTÃO DE EMERGÊNCIA COMPLETO
   * para tomada de decisão imediata à beira-leito sem atraso de comunicação.
   */
  function sequenciaRapidaIntubacao(pesoKg, contextoClinico, indutor, bloqueador, adjuvante) {
    var ID = 'sri', NOME = 'Sequência Rápida de Intubação (SRI)';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var peso = num(c, pesoKg, 'Peso (kg)', 30, 300);
      var ctxTxt = 'Padrão / Hemodinâmica Estável';
      var ctxChave = 'padrao';
      if (!ausente(contextoClinico)) {
        if (typeof contextoClinico !== 'string') c.erros.push('Contexto: texto esperado');
        else {
          var t = semAcento(contextoClinico);
          if (/choque|sepse|instav|hipotens/.test(t)) { ctxChave = 'choque'; ctxTxt = 'Choque / Instabilidade Hemodinâmica'; }
          else if (/asma|bronco|dpoc/.test(t)) { ctxChave = 'asma'; ctxTxt = 'Broncoespasmo Grave / Asma / DPOC'; }
          else if (/tce|neuro|avc/.test(t)) { ctxChave = 'tce'; ctxTxt = 'Neurointensivismo / TCE / AVC'; }
        }
      }
      var ind = resolverFarmaco(c, indutor, 'indutor', 'Indutor');
      var blq = resolverFarmaco(c, bloqueador, 'bloqueador', 'Bloqueador');
      var adj = resolverFarmaco(c, adjuvante, 'adjuvante', 'Adjuvante');
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      // Pré-cálculo universal de todas as drogas para disponibilidade imediata
      function calcDose(farmaco) {
        var d = farmaco.dose * peso;
        var ml = d / farmaco.conc;
        exigirFinito(d, ml);
        return {
          dose: Math.round(d * 10) / 10,
          ml: Math.round(ml * 10) / 10,
          un: farmaco.un,
          conc: farmaco.conc
        };
      }

      var dFentanil = calcDose(SRI_FARMACOS.fentanil);
      var dEtomidato = calcDose(SRI_FARMACOS.etomidato);
      var dQuetamina = calcDose(SRI_FARMACOS.quetamina);
      var dPropofol = calcDose(SRI_FARMACOS.propofol);
      var dMidazolam = calcDose(SRI_FARMACOS.midazolam);
      var dSuccinil = calcDose(SRI_FARMACOS.succinilcolina);
      var dRocuronio = calcDose(SRI_FARMACOS.rocuronio);

      var mostrarTodos = (ind === null && blq === null && adj === null && semAcento(String(adjuvante || '')) !== 'nenhum');
      var linhasDoses = [];
      if (mostrarTodos) {
        linhasDoses.push('1️⃣ Pré-tratamento: Fentanil (50 mcg/mL · 2 mcg/kg): ' + fmt(dFentanil.dose, 0) + ' mcg → ' + fmt(dFentanil.ml, 1) + ' mL IV lento');
        linhasDoses.push('2️⃣ Sedativos / Indução (escolha 1):');
        linhasDoses.push('   • Etomidato (2 mg/mL · 0,3 mg/kg): ' + fmt(dEtomidato.dose, 1) + ' mg → ' + fmt(dEtomidato.ml, 1) + ' mL IV');
        linhasDoses.push('   • Quetamina (50 mg/mL · 1,5 mg/kg): ' + fmt(dQuetamina.dose, 0) + ' mg → ' + fmt(dQuetamina.ml, 1) + ' mL IV');
        if (ctxChave !== 'choque') {
          linhasDoses.push('   • Propofol 1% (10 mg/mL · 1,5 mg/kg): ' + fmt(dPropofol.dose, 0) + ' mg → ' + fmt(dPropofol.ml, 1) + ' mL IV');
        }
        linhasDoses.push('3️⃣ Bloqueadores Neuromusculares (escolha 1):');
        linhasDoses.push('   • Succinilcolina (10 mg/mL · 1,5 mg/kg): ' + fmt(dSuccinil.dose, 0) + ' mg → ' + fmt(dSuccinil.ml, 1) + ' mL IV');
        linhasDoses.push('   • Rocurônio (10 mg/mL · 1,2 mg/kg): ' + fmt(dRocuronio.dose, 1) + ' mg → ' + fmt(dRocuronio.ml, 1) + ' mL IV');
      } else {
        if (adj && adj.chave === 'fentanil') {
          linhasDoses.push('1️⃣ Pré-tratamento Selecionado: Fentanil (50 mcg/mL · 2 mcg/kg): ' + fmt(dFentanil.dose, 0) + ' mcg → ' + fmt(dFentanil.ml, 1) + ' mL IV lento');
        } else if (semAcento(String(adjuvante || '')) === 'nenhum') {
          linhasDoses.push('1️⃣ Pré-tratamento: Nenhum adjuvante (sem opioide)');
        }
        if (ind) {
          var dInd = calcDose(ind.f);
          linhasDoses.push('2️⃣ Indutor Selecionado: ' + ind.f.nome + ' (' + ind.f.conc + ' ' + ind.f.un + '/mL · ' + fmt(ind.f.dose, 1) + ' ' + ind.f.un + '/kg): ' + fmt(dInd.dose, 1) + ' ' + ind.f.un + ' → ' + fmt(dInd.ml, 1) + ' mL IV');
        }
        if (blq) {
          var dBlq = calcDose(blq.f);
          linhasDoses.push('3️⃣ Bloqueador Selecionado: ' + blq.f.nome + ' (' + blq.f.conc + ' ' + blq.f.un + '/mL · ' + fmt(blq.f.dose, 1) + ' ' + blq.f.un + '/kg): ' + fmt(dBlq.dose, 1) + ' ' + blq.f.un + ' → ' + fmt(dBlq.ml, 1) + ' mL IV');
        }
      }

      var recomendacoes = [];
      if (ctxChave === 'choque') {
        recomendacoes.push('🏆 Sedativo: Etomidato ou Quetamina (estabilidade cardiovascular).');
        recomendacoes.push('⚠️ Evite Midazolam e Propofol (risco alto de colapso hemodinâmico e vasodilatação).');
        recomendacoes.push('🏆 BNM: Rocurônio preferencial (Succinilcolina se K⁺ comprovadamente normal).');
      } else if (ctxChave === 'asma') {
        recomendacoes.push('🏆 Sedativo: Quetamina (potente broncodilatador simpaticomimético).');
        recomendacoes.push('🏆 BNM: Rocurônio ou Succinilcolina.');
      } else if (ctxChave === 'tce') {
        recomendacoes.push('🏆 Sedativo: Etomidato (mantém Pressão de Perfusão Cerebral e reduz PIC).');
        recomendacoes.push('💉 Fentanil 3 min antes da laringoscopia para atenuar pico simpático.');
        recomendacoes.push('🏆 BNM: Rocurônio preferencial.');
      } else {
        recomendacoes.push('🏆 Sedativo padrão: Etomidato ou Quetamina.');
        recomendacoes.push('🏆 BNM padrão: Succinilcolina ou Rocurônio.');
      }

      var avisos = [
        'Succinilcolina é contraindicada se hipercalemia, queimadura/grande trauma > 72h ou miopatias.',
        'Checklist 7 Ps: Preparação ➔ Pré-oxigenação ➔ Pré-tratamento ➔ Paralisia com indução ➔ Posicionamento ➔ Passagem do tubo ➔ Pós-intubação.'
      ];

      var secoes = [
        ['BASE DO CÁLCULO', ['Peso do Paciente: ' + fmt(peso, 1) + ' kg', 'Contexto: ' + ctxTxt]],
        ['CONDUTA RECOMENDADA', recomendacoes],
        ['CARTÃO DE DOSES CALCULADAS (BEIRA-LEITO)', linhasDoses]
      ];

      return sucesso({
        id: ID, nome: NOME, estado: 'PRIORITARIO', rotulo: 'SALA VERMELHA · SRI / IOT',
        principal: fmt(peso, 0) + ' kg · ' + ctxTxt,
        secoes: secoes,
        avisos: avisos,
        dados: {
          pesoKg: peso,
          contexto: ctxChave,
          fentanil: { doseMcg: dFentanil.dose, ml: dFentanil.ml },
          etomidato: { doseMg: dEtomidato.dose, ml: dEtomidato.ml },
          quetamina: { doseMg: dQuetamina.dose, ml: dQuetamina.ml },
          succinilcolina: { doseMg: dSuccinil.dose, ml: dSuccinil.ml },
          rocuronio: { doseMg: dRocuronio.dose, ml: dRocuronio.ml },
          propofol: { doseMg: dPropofol.dose, ml: dPropofol.ml }
        },
        legado: {
          pesoKg: peso,
          fentanil: { doseMcg: dFentanil.dose, ml: dFentanil.ml },
          etomidato: { doseMg: dEtomidato.dose, ml: dEtomidato.ml },
          quetamina: { doseMg: dQuetamina.dose, ml: dQuetamina.ml },
          succinilcolina: { doseMg: dSuccinil.dose, ml: dSuccinil.ml },
          rocuronio: { doseMg: dRocuronio.dose, ml: dRocuronio.ml }
        },
        botoes: botoesPadrao(ID, [btn('✅ Checklist 7 Ps', ID, 'checklist'), btn('🫁 Via Aérea Difícil', ID, 'vad')])
      });
    });
  }

  /**
   * MELD (Model for End-Stage Liver Disease - UNOS / Kamath et al. 2007) e MELD-Na (OPTN 2016)
   */
  function meld(bilirrubina, creatinina, inr, sodio, dialiseRecente) {
    var ID = 'meld', NOME = 'MELD / MELD-Na';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var b = num(c, bilirrubina, 'Bilirrubina total (mg/dL)', 0.1, 100);
      var cr = num(c, creatinina, 'Creatinina (mg/dL)', 0.1, 30);
      var i = num(c, inr, 'INR', 0.5, 20);
      var na = num(c, sodio, 'Sódio sérico (mEq/L)', 100, 180, { opcional: true });
      var dialise = bool(c, dialiseRecente, 'Diálise recente (≥ 2x na última semana)', { opcional: true }) || false;
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      // Regras UNOS: Valores mínimos = 1.0; Cr máxima = 4.0
      var bVal = Math.max(1.0, b);
      var inrVal = Math.max(1.0, i);
      var crVal = dialise ? 4.0 : Math.min(4.0, Math.max(1.0, cr));

      // Fórmula UNOS MELD:
      // 9.57 * ln(Cr) + 3.78 * ln(Bilirrubina) + 11.2 * ln(INR) + 6.43
      var meldScore = 9.57 * Math.log(crVal) + 3.78 * Math.log(bVal) + 11.2 * Math.log(inrVal) + 6.43;
      var meldArred = Math.round(meldScore);
      meldArred = Math.max(6, Math.min(40, meldArred));

      var meldNaArred = meldArred;
      var temMeldNa = false;
      if (na !== null && meldArred > 11) {
        temMeldNa = true;
        var naVal = Math.max(125, Math.min(137, na));
        var meldNa = meldArred + 1.32 * (137 - naVal) - (0.033 * meldArred * (137 - naVal));
        meldNaArred = Math.round(meldNa);
        meldNaArred = Math.max(6, Math.min(40, meldNaArred));
      }

      var mortalidade3m = '';
      var estado = 'BAIXO';
      if (meldArred >= 40) { mortalidade3m = '≥ 71,3% de mortalidade em 3 meses'; estado = 'PRIORITARIO'; }
      else if (meldArred >= 30) { mortalidade3m = '52,6% de mortalidade em 3 meses'; estado = 'PRIORITARIO'; }
      else if (meldArred >= 20) { mortalidade3m = '19,6% de mortalidade em 3 meses'; estado = 'ATENCAO'; }
      else if (meldArred >= 10) { mortalidade3m = '6,0% de mortalidade em 3 meses'; estado = 'ATENCAO'; }
      else { mortalidade3m = '1,9% de mortalidade em 3 meses'; estado = 'BAIXO'; }

      var principal = 'MELD ' + meldArred + (temMeldNa ? (' · MELD-Na ' + meldNaArred) : '');
      return sucesso({
        id: ID, nome: NOME, estado: estado, rotulo: 'ESTIMATIVA DE MORTALIDADE HEPÁTICA (MELD)',
        principal: principal,
        secoes: [
          ['PARÂMETROS UTILIZADOS', [
            'Bilirrubina: ' + fmt(b, 1) + ' mg/dL' + (b < 1.0 ? ' (ajustada para 1,0 pelo UNOS)' : ''),
            'Creatinina: ' + fmt(cr, 2) + ' mg/dL' + (dialise ? ' (fixada em 4,0 por diálise)' : (cr < 1.0 ? ' (ajustada para 1,0)' : '')),
            'INR: ' + fmt(i, 2) + (i < 1.0 ? ' (ajustado para 1,0)' : ''),
            (na !== null ? ('Sódio sérico: ' + fmt(na, 0) + ' mEq/L') : 'Sódio: não informado (MELD-Na não calculado)')
          ]],
          ['PROGNÓSTICO ESTIMADO', [mortalidade3m, 'Critério regulador de fila de transplante hepático no Brasil e UNOS.']]
        ],
        avisos: ['MELD pontua entre 6 e 40. Diálise pelo menos 2x nos últimos 7 dias fixa Cr em 4,0 mg/dL.'],
        dados: { meld: meldArred, meldNa: temMeldNa ? meldNaArred : null, dialise: dialise },
        legado: { pontuacao: meldArred, meld: meldArred, meldNa: temMeldNa ? meldNaArred : null, mortalidade: mortalidade3m }
      });
    });
  }

  // ═════════════════════════════ AUTOTESTE ═════════════════════════════

  function autoTeste() {
    var f = [];
    function ok(cond, msg) { if (!cond) f.push(msg); }
    var API = publico;
    var r;
    r = API.ckdEpi2021(1.0, 60, false); ok(r.ok && Math.abs(r.dados.tfg - 86.2) < 2.0, 'CKD-EPI homem 60a Cr1,0');
    r = API.ckdEpi2021(0, 60, false);   ok(!r.ok, 'CKD-EPI Cr=0 deve falhar');
    r = API.cockcroftGault(1.0, 70, 60, false); ok(r.ok && Math.abs(r.dados.clearance - 77.8) < 1.0, 'CG base');
    r = API.cockcroftGault(1.0, 120, 50, false, 170); ok(r.ok && r.dados.tipoPeso.indexOf('ajustado') === 0, 'CG peso ajustado em obeso');
    r = API.wellsTEP(false, true, true, false, false, false, false); ok(r.ok && r.dados.pontos === 4.5 && r.dados.provavel === true, 'Wells 4,5 provável');
    r = API.wellsTEP(false, false, true, true, false, false, false); ok(r.ok && r.dados.pontos === 3 && r.dados.provavel === false, 'Wells 3,0 improvável');
    r = API.wellsTEP('talvez', false, false, false, false, false, false); ok(!r.ok, 'Wells entrada inválida');
    r = API.curb65(true, 60, 32, 85, 50, 71); ok(r.ok && r.dados.pontos === 5, 'CURB-65 máx');
    r = API.curb65(false, 'abc', 20, 120, 80, 40); ok(!r.ok, 'CURB-65 ureia textual');
    r = API.cha2ds2va(false, true, false, false, false, false, true); ok(r.ok && r.dados.pontos === 2, 'CHA2DS2-VA 2');
    r = API.cha2ds2va(false, false, true, false, false, false, true); ok(!r.ok, 'CHA2DS2-VA idades conflitantes');
    r = API.gasometria(7.10, 24, 8, 140, 105, 4, 80, 0); ok(!r.ok, 'FiO2=0 rejeitado');
    r = API.gasometria(7.30, 29, 14, 140, 100, 4, 60, 40); ok(r.ok && /adequada/i.test(r.texto), 'Winter na borda');
    r = API.drogasVasoativas('noradrenalina', 70, 'padrao'); ok(r.ok && /6,6 mL\/h/.test(r.texto), 'Nora 70 kg 0,1 = 6,6 mL/h');
    r = API.drogasVasoativas('noradrenalina', 0, 'padrao'); ok(!r.ok, 'Nora peso 0');
    r = API.deficitAguaLivre(160, 140, 70, 'homem'); ok(r.ok && Math.abs(r.dados.deficitL - 6.0) < 0.2, 'Déficit 6,0 L');
    r = API.sequenciaRapidaIntubacao(70, 'padrao'); ok(r.ok && r.dados.etomidato.ml === 10.5, 'SRI etomidato 10.5 mL');
    r = API.glasgowP(4, 5, 6, 2); ok(r.ok && r.dados.gcsP === 13, 'GCS-P 13');
    r = API.calcioCorrigido(7.5, 2.5); ok(r.ok && r.dados.calcioCorrigido === 8.7, 'Cálcio corrigido Payne');
    r = API.gapOsmolar(315, 140, 90, 30); ok(r.ok && r.dados.gapOsmolar > 15, 'Gap osmolar elevado');
    r = API.estadiamentoKDIGO(2.5, 1.0, null, null); ok(r.ok && r.dados.estagio === 2, 'KDIGO estagio 2');
    r = API.processarAcao(null, 'curb65', 'criterios'); ok(r.ok && /CURB-65/.test(r.textoFormatado), 'processarAcao curb65 criterios');
    return f;
  }

  function processarAcao(chatId, id, acao, args) {
    id = String(id || '').toLowerCase();
    acao = String(acao || '').toLowerCase();
    var titulo = '';
    var linhas = [];
    var botoes = null;

    if (acao === 'criterios') {
      if (id === 'curb65') {
        titulo = '📚 CRITÉRIOS · CURB-65';
        linhas = [
          'Escore prognóstico de mortalidade em PAC (Pneumonia Adquirida na Comunidade):',
          '• <b>C</b>onfusão mental (AMTS ≤ 8 ou desorientação tempo/espaço) = 1 pt',
          '• <b>U</b>reia > 50 mg/dL (BUN > 19 mg/dL) = 1 pt',
          '• <b>R</b>espiratória (FR ≥ 30 irpm) = 1 pt',
          '• <b>B</b>lood Pressure (PAS < 90 mmHg ou PAD ≤ 60 mmHg) = 1 pt',
          '• <b>65</b> Idade ≥ 65 anos = 1 pt',
          '',
          '<b>Interpretação e Conduta:</b>',
          '• 0–1 pt: Baixo risco (mortalidade < 3%). Tratamento ambulatorial seguro.',
          '• 2 pts: Risco intermediário (mortalidade ~9%). Considerar internação em enfermaria.',
          '• ≥ 3 pts: Alto risco (mortalidade 15–40%). Internação hospitalar obrigatória; ≥ 4 avaliar UTI.',
          '',
          '<i>Fonte: Lim WS et al. Thorax 2003 / Diretriz SBPT 2018.</i>'
        ];
      } else if (id === 'wells_tep') {
        titulo = '📚 CRITÉRIOS · Wells para TEP';
        linhas = [
          'Escore preditivo para Tromboembolismo Pulmonar:',
          '• Sinais/sintomas clínicos de TVP (+3,0 pts)',
          '• Diagnóstico alternativo menos provável que TEP (+3,0 pts)',
          '• Frequência cardíaca > 100 bpm (+1,5 pts)',
          '• Imobilização ≥ 3 dias ou cirurgia prévia nas últimas 4 semanas (+1,5 pts)',
          '• História prévia documentada de TVP ou TEP (+1,5 pts)',
          '• Hemoptise (+1,0 pt)',
          '• Neoplasia ativa em tratamento ou paliativo (+1,0 pt)',
          '',
          '<b>Interpretação (Modelo Dicotômico ESC 2019):</b>',
          '• ≤ 4,0 pts: TEP Improvável. Solicitar D-Dímero de alta sensibilidade para exclusão.',
          '• > 4,0 pts: TEP Provável. Não aguardar D-Dímero; indicar Angiotomografia de Tórax imediata.',
          '',
          '<i>Fonte: Wells PS et al. Thromb Haemost 2000 / ESC Guidelines 2019.</i>'
        ];
      } else if (id === 'hasbled') {
        titulo = '📚 CRITÉRIOS · HAS-BLED';
        linhas = [
          'Escore de Risco Hemorrágico em Fibrilação Atrial:',
          '• <b>H</b>ipertensão (PAS > 160 mmHg não controlada) = 1 pt',
          '• <b>A</b>bnormal Renal ou Hepático (1 pt cada, máx 2)',
          '• <b>S</b>troke (história prévia de AVC) = 1 pt',
          '• <b>B</b>leeding (história de sangramento maior ou predisposição) = 1 pt',
          '• <b>L</b>ábil INR (tempo na faixa terapêutica < 60%) = 1 pt',
          '• <b>E</b>lderly (Idade > 65 anos) = 1 pt',
          '• <b>D</b>rogas ou Álcool (AINEs/antiagregantes ou etilismo, 1 pt cada, máx 2)',
          '',
          '<b>Interpretação:</b>',
          '• ≥ 3 pts: Alto risco de sangramento. <b>Atenção:</b> HAS-BLED elevado NÃO contraindica anticoagulação; sinaliza necessidade de vigilância intensiva e correção de fatores modificáveis.',
          '',
          '<i>Fonte: Pisters R et al. Chest 2010 / SBC Diretriz de FA 2025.</i>'
        ];
      } else if (id === 'cha2ds2va') {
        titulo = '📚 CRITÉRIOS · CHA₂DS₂-VA (ESC 2024 / SBC 2025)';
        linhas = [
          'Prevenção de AVC na Fibrilação Atrial (escala 0–8):',
          '• <b>C</b> Insuficiência Cardíaca congestiva / disfunção VE = 1 pt',
          '• <b>H</b> Hipertensão arterial sistêmica = 1 pt',
          '• <b>A₂</b> Idade ≥ 75 anos = 2 pts',
          '• <b>D</b> Diabetes Mellitus = 1 pt',
          '• <b>S₂</b> AVC / AIT / Tromboembolismo prévio = 2 pts',
          '• <b>V</b> Doença Vascular (IAM prévio, DAP, placa aórtica) = 1 pt',
          '• <b>A</b> Idade 65–74 anos = 1 pt',
          '*(Critério sexo feminino retirado das diretrizes ESC 2024 e SBC 2025)*',
          '',
          '<b>Conduta:</b>',
          '• 0 pt: Sem terapia antitrombótica.',
          '• 1 pt: Anticoagulação deve ser considerada (classe IIa).',
          '• ≥ 2 pts: Anticoagulação oral recomendada (classe I) — preferencialmente DOACs.',
          '',
          '<i>Fonte: ESC Guidelines AF 2024 / Diretriz SBC 2025.</i>'
        ];
      } else if (id === 'kdigo_ira') {
        titulo = '📚 CRITÉRIOS · KDIGO para Injúria Renal Aguda';
        linhas = [
          'Estadiamento de IRA baseado em Creatinina e Débito Urinário:',
          '• <b>Estágio 1:</b> Cr 1,5–1,9× o basal OU aumento ≥ 0,3 mg/dL em 48h; DU < 0,5 mL/kg/h por 6–12h.',
          '• <b>Estágio 2:</b> Cr 2,0–2,9× o basal; DU < 0,5 mL/kg/h por ≥ 12h.',
          '• <b>Estágio 3:</b> Cr 3,0× o basal OU Cr ≥ 4,0 mg/dL com aumento agudo ≥ 0,5 mg/dL OU início de TRS; DU < 0,3 mL/kg/h por ≥ 24h ou anúria por ≥ 12h.',
          '',
          '<i>Fonte: KDIGO AKI Guidelines 2012.</i>'
        ];
      } else {
        titulo = '📚 CRITÉRIOS · ' + id.toUpperCase();
        linhas = [
          'Critérios validados de acordo com a literatura médica de referência.',
          'Utilize a calculadora fornecendo os dados clínicos correspondentes.'
        ];
      }
    } else if (acao === 'ajuste' || acao === 'medicamento') {
      titulo = '💊 REVISÃO DE AJUSTE RENAL DE FÁRMACOS';
      linhas = [
        'Ajuste posológico conforme estimativa da função renal:',
        '• Utilize <b>Cockcroft-Gault</b> com peso ajustado (Devine) para antibióticos, quimioterápicos e bulas de DOACs.',
        '• Utilize <b>CKD-EPI 2021</b> para estadiamento crônico de DRC e prognóstico.',
        '',
        '<b>Para revisar um medicamento específico:</b>',
        'Envie: <code>/rx &lt;medicamento&gt; ClCr &lt;valor&gt;</code> ou <code>/rx &lt;medicamento&gt; DRC estádio &lt;G3a-G5&gt;</code>',
        '',
        '⚠️ <i>Nenhuma dose foi alterada automaticamente. Confirme sempre na bula do medicamento e no protocolo institucional.</i>'
      ];
    } else if (acao === 'anticoag') {
      titulo = '🩸 CONDUTA EM ANTICOAGULAÇÃO (FA)';
      linhas = [
        'Recomendações da Diretriz Brasileira de FA (2025) e ESC (2024):',
        '• <b>DOACs como 1ª linha:</b> Apixabana, Rivaroxabana, Dabigatrana ou Edoxabana (preferíveis à Varfarina na ausência de prótese valvar mecânica ou estenose mitral moderada/grave).',
        '• <b>Critérios de Dose Reduzida (Apixabana):</b> Se 2 de 3: Idade ≥ 80a, Peso ≤ 60kg, Cr ≥ 1,5 mg/dL ➔ reduzir para 2,5 mg 12/12h.',
        '• <b>Rivaroxabana:</b> ClCr 15–49 mL/min ➔ reduzir de 20 mg/dia para 15 mg/dia.',
        '',
        'Calcule também o risco hemorrágico com HAS-BLED para acompanhamento seguro.'
      ];
    } else if (acao === 'checklist') {
      titulo = '✅ CHECKLIST DOS 7 Ps · SRI / IOT';
      linhas = [
        'Sequência cronológica para intubação em via aérea de emergência:',
        '1. <b>Planejamento e Preparação (T-10 min):</b> Monitorização contínua, acesso venoso pérvio, laringo/videolaringo testado, tubos com guia, aspiração montada, drogas aspiradas e rotuladas, material de resgate (Bougie, Máscara Laríngea).',
        '2. <b>Pré-oxigenação (T-5 min):</b> FiO₂ 100% sob máscara com reservatório a 15 L/min por 3–5 min ou 8 incursões vitais profundas. Elevar cabeceira 20–30° (rampa se obeso).',
        '3. <b>Pré-tratamento / Otimização (T-3 min):</b> Ressuscitação hemodinâmica antes da indução (cristaloide ou noradrenalina em push-dose se PAM baixa). Fentanil se trauma de crânio ou dissecção de aorta.',
        '4. <b>Paralisia com Indução Simultânea (T-0):</b> Administrar indutor (ex: Etomidato 0,3 mg/kg ou Cetamina 1,5–2 mg/kg) seguido imediatamente de bloqueador neuromuscular (ex: Rocurônio 1,2 mg/kg ou Succinilcolina 1,5 mg/kg) em bolus EV rápido.',
        '5. <b>Posicionamento e Proteção (T+45s):</b> Aguardar 45–60s para relaxamento total. Alinhamento dos eixos (posição de olfacionista).',
        '6. <b>Passagem do Tubo com Confirmação (T+60s):</b> Laringoscopia, visualização das cordas vocais, introdução do TOT, insuflação do cuff. Confirmação imediata: capnografia em onda (padrão-ouro) + ausculta epigástrica e pulmonar bilateral.',
        '7. <b>Pós-intubação:</b> Fixação rígida do TOT, radiografia de tórax de controle, sedoanalgesia contínua iniciada de imediato (ex: Fentanil + Midazolam/Propofol) e acoplamento em ventilação mecânica protetora.'
      ];
    } else if (acao === 'vad') {
      titulo = '🫁 AVALIAÇÃO DE VIA AÉREA DIFÍCIL (LEMON)';
      linhas = [
        'Mnemônico LEMON para predição de laringoscopia difícil:',
        '• <b>L (Look externally):</b> Micrognatia, retrognatia, trauma facial, pescoço curto/espesso, barba densa, obesidade mórbida.',
        '• <b>E (Evaluate 3-3-2):</b> Abertura bucal < 3 dedos, distância mento-hioide < 3 dedos, distância tireo-hioide < 2 dedos.',
        '• <b>M (Mallampati):</b> Classes III (apenas base da úvula visível) e IV (apenas palato duro).',
        '• <b>O (Obstruction):</b> Estridor, hematoma cervical, abscesso periamigdaliano, neoplasia de via aérea.',
        '• <b>N (Neck mobility):</b> Limitação de extensão cervical (colar cervical rígido, espondilite anquilosante).',
        '',
        '⚠️ <b>Regra de Ouro da Sala Vermelha:</b>',
        'Se suspeita de via aérea difícil: convoque ajuda sênior, prepare o <b>Bougie</b> desde a primeira tentativa, tenha <b>Máscara Laríngea</b> desembalada para resgate e kit de cricotireoidostomia cirúrgica à beira do leito.'
      ];
    } else if (acao === 'acidobase') {
      titulo = '🧪 FISIOLOGIA ÁCIDO-BASE · GASOMETRIA';
      linhas = [
        'Interpretação sistemática do equilíbrio ácido-base:',
        '1. <b>pH:</b> &lt; 7,35 (Acidemia) | &gt; 7,45 (Alcalemia).',
        '2. <b>Distúrbio Primário:</b> Olhar PaCO₂ e HCO₃⁻.',
        '3. <b>Compensação Respiratória (Winter na Acidose Metabólica):</b>',
        '   • PaCO₂ esperada = (1,5 × HCO₃⁻) + 8 ± 2',
        '   • Se PaCO₂ aferida &gt; esperada: Acidose Respiratória associada.',
        '   • Se PaCO₂ aferida &lt; esperada: Alcalose Respiratória associada.',
        '4. <b>Ânion Gap:</b> Na⁺ - (Cl⁻ + HCO₃⁻) [VR: 8–12 mEq/L]. Corrigir por albumina se &lt; 4,0 g/dL.',
        '5. <b>Razão Delta (ΔAG / ΔHCO₃):</b> (AG - 12) / (24 - HCO₃⁻).',
        '   • &lt; 0,4: Acidose hiperclorêmica pura (AG normal).',
        '   • 0,4–0,8: Acidose mista (AG elevado + hiperclorêmica).',
        '   • 0,8–2,0: Acidose metabólica pura com AG elevado.',
        '   • &gt; 2,0: Acidose com AG elevado associada a Alcalose Metabólica preexistente.'
      ];
    } else if (acao === 'oxigenacao') {
      titulo = '🫁 OXIGENAÇÃO E CRITÉRIOS DE BERLIN (SDRA)';
      linhas = [
        'Classificação da SDRA pela relação PaO₂ / FiO₂ (com PEEP ≥ 5 cmH₂O):',
        '• <b>Leve:</b> 201 a 300 mmHg',
        '• <b>Moderada:</b> 101 a 200 mmHg',
        '• <b>Grave:</b> ≤ 100 mmHg',
        '',
        '<b>Pilares da Ventilação Protetora:</b>',
        '• Volume corrente: 4 a 6 mL/kg do Peso Ideal / Predito (Fórmula de Devine).',
        '• Pressão de platô ≤ 30 cmH₂O.',
        '• Driving Pressure (Pressão de Distensão = Platô - PEEP) ≤ 15 cmH₂O.',
        '• Posição Prona precoce por ≥ 16 horas contínuas se PaO₂/FiO₂ &lt; 150 mmHg.'
      ];
    } else if (acao === 'dose' || acao === 'preparo') {
      titulo = '🧴 PREPARO E TITULAÇÃO DE VASOATIVOS';
      linhas = [
        '<b>Noradrenalina:</b>',
        '• Padrão: 4 ampolas (16 mg) + 234 mL SG 5% = 64 mcg/mL.',
        '• Concentrada (2x): 8 ampolas (32 mg) + 218 mL SG 5% = 128 mcg/mL.',
        '• Titulação: Iniciar a 0,05–0,1 mcg/kg/min; titular a cada 2–5 min buscando PAM ≥ 65 mmHg.',
        '',
        '<b>Vasopressina:</b>',
        '• Diluição: 1 ampola (20 UI) + 99 mL SG 5% ou SF 0,9% = 0,2 UI/mL.',
        '• Dose fixa: 0,03 UI/min (9 mL/h na bomba contínua). Não requer titulação rápida.',
        '• Associação: Iniciar quando noradrenalina atingir 0,25–0,5 mcg/kg/min no choque séptico (Surviving Sepsis Campaign).'
      ];
    } else if (acao === 'editar' || acao === 'voltar' || acao === 'peso') {
      titulo = '✏️ REVISÃO DE PARÂMETROS';
      linhas = [
        'Para refazer este cálculo com novos valores clínicos, digite diretamente no chat os novos dados do paciente.',
        '💡 <i>Exemplos:</i>',
        '• Para DVA: <code>/dva nora 75 concentrada</code>',
        '• Para SRI: <code>/sri 82 choque</code>',
        '• Para Gaso: <code>/gaso pH 7.20, pCO2 24, HCO3 9, Na 138, Cl 102</code>',
        '• Para DRC: <code>/calc ckd_epi Cr 1.6, idade 72, feminino</code>'
      ];
    } else if (acao === 'pdf') {
      titulo = '📄 EXPORTAÇÃO E REGISTRO';
      linhas = [
        'Para arquivar este resultado clínico estruturado com data e hora oficiais no seu prontuário pessoal:',
        '• Utilize o botão <b>📁 Salvar no Notion Tasks</b> na mensagem de resumo.',
        '• Para gerar receituário oficial em PDF para medicamentos, utilize o comando <code>/rx</code>.'
      ];
    } else {
      titulo = 'ℹ️ INFORMAÇÕES DA CALCULADORA (' + id.toUpperCase() + ')';
      linhas = [
        'Ação solicitada: ' + acao,
        'Módulo determinístico de apoio à decisão clínica validado (v3.0).'
      ];
    }

    var textoFormatado = '<b>' + titulo + '</b>\n\n' + linhas.join('\n');
    return {
      ok: true,
      id: id,
      acao: acao,
      textoFormatado: textoFormatado,
      botoes: botoes
    };
  }

  var publico = {
    versao: VERSAO,
    curb65: curb65,
    ckdEpi2021: ckdEpi2021,
    cockcroftGault: cockcroftGault,
    cha2ds2va: cha2ds2va,
    cha2ds2vasc: cha2ds2vasc,
    hasbled: hasbled,
    wellsTEP: wellsTEP,
    deficitAguaLivre: deficitAguaLivre,
    calcioCorrigido: calcioCorrigido,
    gapOsmolar: gapOsmolar,
    estadiamentoKDIGO: estadiamentoKDIGO,
    glasgowP: glasgowP,
    gasometria: gasometria,
    meld: meld,
    drogasVasoativas: drogasVasoativas,
    sequenciaRapidaIntubacao: sequenciaRapidaIntubacao,
    processarAcao: processarAcao,
    autoTeste: autoTeste
  };
  return publico;
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CalculadorasClinicas;
}


// ==============================================================================
// ARQUIVO FONTE: 03_bases_locais.js
// ==============================================================================

/**
 * ==============================================================================
 * MÓDULO 03: BASES LOCAIS, RAG OTIMIZADO E MAPEAMENTO FARMACOLÓGICO (REMUME)
 * ==============================================================================
 * Otimiza a ingestão de planilhas do Google Drive, reduzindo em até 80% o uso
 * de tokens e acelerando a resposta de prescrições e checagem de interações.
 * ==============================================================================
 */

// Dicionário de sinônimos comerciais e equivalências para Denominação Comum Brasileira (DCB)
var DICIONARIO_FARMACO = {
  "glifage": "metformina",
  "novalgina": "dipirona",
  "tylenol": "paracetamol",
  "rocefin": "ceftriaxona",
  "clexane": "enoxaparina",
  "plasil": "metoclopramida",
  "buscopan": "escopolamina",
  "aerolin": "salbutamol",
  "clavulin": "amoxicilina + clavulanato",
  "claven": "amoxicilina + clavulanato",
  "cataflam": "diclofenaco",
  "voltaren": "diclofenaco",
  "polaramine": "dexclorfeniramina",
  "lasix": "furosemida",
  "aldactone": "espironolactona",
  "selozok": "metoprolol",
  "aradois": "losartana",
  "norvasc": "anlodipino",
  "daonil": "glibenclamida",
  "prozac": "fluoxetina",
  "zoloft": "sertralina",
  "cipro": "ciprofloxacino",
  "bactrim": "sulfametoxazol + trimetoprima",
  "amplictil": "clorpromazina",
  "haldol": "haloperidol",
  "tegretol": "carbamazepina",
  "depakene": "acido valproico",
  "omeprazol": "omeprazol",
  "pantoprazol": "pantoprazol"
};

// Mapeamento de condições clínicas frequentes na APS para classes prioritárias
var MAPA_SINDROMES_APS = {
  "cistite": ["nitrofurantoina", "fosfomicina", "sulfametoxazol", "cefalexina", "ciprofloxacino", "escopolamina"],
  "itu": ["nitrofurantoina", "fosfomicina", "sulfametoxazol", "cefalexina", "ciprofloxacino"],
  "amigdalite": ["amoxicilina", "penicilina", "azitromicina", "ibuprofeno", "dipirona", "paracetamol"],
  "faringite": ["amoxicilina", "penicilina", "azitromicina", "ibuprofeno", "dipirona"],
  "otite": ["amoxicilina", "clavulanato", "ibuprofeno", "dipirona", "paracetamol"],
  "sinusite": ["amoxicilina", "clavulanato", "soro fisiologico", "budesonida"],
  "pneumonia": ["amoxicilina", "clavulanato", "azitromicina", "claritromicina", "ceftriaxona"],
  "pac": ["amoxicilina", "clavulanato", "azitromicina", "ceftriaxona"],
  "hipertensao": ["losartana", "enalapril", "hidroclorotiazida", "anlodipino", "atenolol", "espironolactona"],
  "has": ["losartana", "enalapril", "hidroclorotiazida", "anlodipino", "espironolactona"],
  "diabetes": ["metformina", "glibenclamida", "insulina", "gliclazida"],
  "dm": ["metformina", "glibenclamida", "insulina"],
  "asma": ["salbutamol", "beclometasona", "budesonida", "prednisona", "prednisolona", "ipratropio"],
  "dpoc": ["salbutamol", "ipratropio", "beclometasona", "prednisona", "azitromicina"],
  "lombalgia": ["dipirona", "paracetamol", "ibuprofeno", "ciclobenzaprina", "tramadol"],
  "dor": ["dipirona", "paracetamol", "ibuprofeno", "tramadol"],
  "depressao": ["fluoxetina", "sertralina", "amitriptilina", "nortriptilina", "escitalopram"],
  "ansiedade": ["fluoxetina", "sertralina", "clonazepam", "diazepam"],
  "gastrite": ["omeprazol", "ranitidina", "hidroxido de aluminio", "metoclopramida"],
  "geca": ["soro de reidratacao", "ondansetrona", "metoclopramida", "zinco", "dipirona"]
};

function normalizarTexto(texto) {
  if (!texto) return "";
  return texto.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s\+]/g, " ")
    .trim();
}

/**
 * Lê do CacheService ou do Google Drive Sheets com TTL máximo de 21.600s (6h).
 */
function obterPlanilha(cachePrefix, idPlanilha, isInteracao) {
  var cache = CacheService.getScriptCache();
  var numChunks = cache.get(cachePrefix + "_chunks");
  var conteudo = "";

  if (numChunks) {
    var totalChunks = parseInt(numChunks, 10);
    var partesCarregadas = [];
    var todosPresentes = true;
    for (var i = 0; i < totalChunks; i++) {
      var chunk = cache.get(cachePrefix + "_" + i);
      if (chunk === null || chunk === undefined) {
        todosPresentes = false;
        break;
      }
      partesCarregadas.push(chunk);
    }
    if (todosPresentes && partesCarregadas.length === totalChunks) {
      return partesCarregadas.join("");
    }
  }

  try {
    var ss = SpreadsheetApp.openById(idPlanilha);
    var sheet = ss.getSheets()[0];
    var lastRow = sheet.getLastRow();
    var lastCol = isInteracao ? sheet.getLastColumn() : 1;

    if (lastRow > 1 && lastCol > 0) {
      var valores = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      if (isInteracao) {
        conteudo = valores.map(function(linha) { return linha.join(" | "); }).join("\n");
      } else {
        conteudo = valores.map(function(linha) { return linha[0]; }).join("\n");
      }

      var partes = [];
      for (var p = 0; p < conteudo.length; p += 40000) {
        partes.push(conteudo.substring(p, p + 40000));
      }

      safePutCache(cache, cachePrefix + "_chunks", partes.length.toString(), 21600);
      for (var k = 0; k < partes.length; k++) {
        safePutCache(cache, cachePrefix + "_" + k, partes[k], 21600);
      }
    }
  } catch (e) {
    Logger.log("Erro ao acessar a planilha " + cachePrefix + ": " + e.message);
    throw new Error("Erro ao acessar a base de dados (" + cachePrefix + "). Verifique permissões do Drive.");
  }
  return conteudo;
}

function aquecerCachePlanilhas() {
  var idRemume = ConfigService.get("SPREADSHEET_ID_REMUME");
  var idInteracoes = ConfigService.get("SPREADSHEET_ID_INTERACOES");
  if (idRemume) obterPlanilha("remume", idRemume, false);
  if (idInteracoes) obterPlanilha("interacoes", idInteracoes, true);
  Logger.log("Cache das bases de dados aquecido com sucesso.");
}

/**
 * Filtro RAG Inteligente da REMUME:
 * Extrai apenas as linhas pertinentes à consulta do usuário em vez de injetar a planilha inteira.
 */
function filtrarMedicamentosRelevantes(baseCompleta, pedidoUsuario) {
  if (!baseCompleta) return "";
  var linhas = baseCompleta.split("\n");
  if (linhas.length <= 35) return baseCompleta; // Se a base for pequena, envia inteira

  var pedidoNorm = normalizarTexto(pedidoUsuario);
  var termosBusca = pedidoNorm.split(/\s+/).filter(function(t) { return t.length >= 3; });

  // 1. Expande termos com sinônimos de marcas (sem expansão autorreferente infinita)
  var originais = termosBusca.slice();
  var termosSet = {};
  originais.forEach(function(t) { termosSet[t] = true; });
  originais.forEach(function(termo) {
    var sin = DICIONARIO_FARMACO[termo];
    if (sin && !termosSet[sin]) {
      termosSet[sin] = true;
      termosBusca.push(sin);
    }
  });

  // 2. Expande por síndromes clínicas mapeadas
  for (var sindrome in MAPA_SINDROMES_APS) {
    if (pedidoNorm.indexOf(sindrome) !== -1) {
      MAPA_SINDROMES_APS[sindrome].forEach(function(item) {
        if (!termosSet[item]) {
          termosSet[item] = true;
          termosBusca.push(item);
        }
      });
    }
  }

  // 3. Filtra linhas que contenham ao menos um dos termos
  var linhasRelevantes = [];
  var setAdicionados = {};

  for (var j = 0; j < linhas.length; j++) {
    var linha = linhas[j].trim();
    if (!linha) continue;
    var linhaNorm = normalizarTexto(linha);

    for (var k = 0; k < termosBusca.length; k++) {
      if (linhaNorm.indexOf(termosBusca[k]) !== -1) {
        if (!setAdicionados[linha]) {
          linhasRelevantes.push(linha);
          setAdicionados[linha] = true;
        }
        break;
      }
    }
    if (linhasRelevantes.length >= 40) break; // Limite de 40 itens para não estourar o prompt
  }

  // Se o filtro encontrou itens relevantes, retorna o subconjunto enxuto preservando qualquer match
  if (linhasRelevantes.length > 0) {
    return linhasRelevantes.join("\n");
  }

  // Fallback: se não deu match direto, retorna primeiras 50 linhas para manter contexto
  return linhas.slice(0, 50).join("\n");
}

function checarStatusFonteDrive(idPlanilha, isInteracao) {
  try {
    var ss = SpreadsheetApp.openById(idPlanilha);
    var sheets = ss.getSheets();
    if (!sheets || sheets.length === 0) return "❌ Sem abas na planilha";
    var sheet = sheets[0];
    var totalLinhas = sheet.getLastRow();
    if (totalLinhas <= 1) return "⚠️ Conectada, mas sem linhas de dados (apenas cabeçalho)";
    return "Conectada ✅ (" + (totalLinhas - 1) + " registros)";
  } catch (e) {
    return "❌ Erro ao acessar: " + e.message;
  }
}

// ==============================================================================
// BASE DE PROTOCOLOS DETERMINÍSTICOS E DIRETRIZES BRASILEIRAS (FMRP-USP / SBC / ILAS)
// ==============================================================================

var PROTOCOLOS_CLINICOS_EMERGENCIA = {
  "sepse": {
    "titulo": "Sepse e Choque Séptico",
    "diretriz_brasileira": "ILAS (Instituto Latino-Americano de Sepse) 2023 / CFM",
    "diretriz_internacional": "Surviving Sepsis Campaign (SSC) 2021",
    "conduta_imediata": "1. Reconhecimento precoce (qSOFA ≥ 2 ou alteração de disfunção orgânica: Glasgow, PA, FR).\n" +
      "2. Pacote de 1ª hora (ILAS / SSC):\n" +
      "   • Coleta de lactato arterial ou venoso imediato.\n" +
      "   • 2 pares de hemoculturas antes do antimicrobiano (sem atrasar início > 45 min).\n" +
      "   • Antibioticoterapia de amplo espectro na 1ª hora.\n" +
      "   • Ressuscitação volêmica: Cristaloide balanceado (Ringer Lactato preferível a SF 0,9%) 30 mL/kg nas primeiras 3h se hipotensão (PAS < 90 ou PAM < 65) ou Lactato ≥ 4 mmol/L (36 mg/dL).\n" +
      "   • Droga vasoativa de 1ª escolha: Noradrenalina precoce (iniciar se PAM < 65 mesmo durante infusão de cristaloide). Alvo PAM ≥ 65 mmHg.",
    "divergencia": "🇧🇷 ILAS vs 🌐 SSC: O ILAS reforça que em hospitais brasileiros sem leito imediato de UTI, a noradrenalina em veia periférica calibrosa bem puncionada é fortemente encorajada nas primeiras horas para não atrasar reversão de choque enquanto se providencia CVC. A SSC sugere corticoide (Hidrocortisona 200 mg/dia) se noradrenalina > 0,25 mcg/kg/min por mais de 4h."
  },
  "iam": {
    "titulo": "Síndrome Coronariana Aguda (IAM com e sem supra de ST)",
    "diretriz_brasileira": "Diretrizes SBC (Sociedade Brasileira de Cardiologia) 2021/2023",
    "diretriz_internacional": "AHA/ACC 2023 / ESC 2023",
    "conduta_imediata": "1. ECG de 12 derivações em até 10 minutos da admissão.\n" +
      "2. Terapia Antiplaquetária Dupla Imediata (DAPT):\n" +
      "   • AAS 200-300 mg mastigável (manutenção 81-100 mg/dia).\n" +
      "   • Inibidor P2Y12: Ticagrelor 180 mg VO de ataque (manutenção 90 mg 12/12h) OU Clopidogrel 300 mg (600 mg se ICP primária ou 300 mg se trombólise ≤ 75 anos).\n" +
      "3. Anticoagulação: Enoxaparina 30 mg IV bolus + 1 mg/kg SC 12/12h (se < 75 anos e ClCr > 30) ou HNF.\n" +
      "4. Alívio de Sintomas e Isquemia:\n" +
      "   • Nitrato sublingual (Isordil 5 mg) se dor persistente (CONTRAINDICADO se PAS < 90, infarto de VD ou uso de inibidor de PDE5 nas últimas 24-48h).\n" +
      "   • Morfina 2 a 4 mg IV apenas se dor refratária (evitar de rotina por retardar absorção de P2Y12).\n" +
      "5. Reperfusão no IAM com Supra:\n" +
      "   • ICP Primária: tempo porta-balão ≤ 90 min (ou ≤ 120 min se transferido).\n" +
      "   • Trombólise (Tenecteplase/Alteplase): tempo porta-agulha ≤ 30 min se ICP não disponível em 120 min.",
    "divergencia": "🇧🇷 SBC vs 🌐 ESC/AHA: No Brasil, o Clopidogrel permanece como opção prioritária no SUS pela indisponibilidade frequente de Ticagrelor/Prasugrel na rede pública. Se trombolisado com Tenecteplase, a SBC e o Ministério da Saúde recomendam dose ajustada por peso exato; se idade ≥ 75 anos, meia dose de TNK sem bolus de enoxaparina."
  },
  "eap": {
    "titulo": "Edema Agudo de Pulmão (EAP Hipertensivo) e IC Descompensada",
    "diretriz_brasileira": "Diretrizes SBC de Insuficiência Cardíaca 2021/2023",
    "diretriz_internacional": "ESC Heart Failure 2023 / AHA 2022",
    "conduta_imediata": "1. Oxigenoterapia e VNI Imediata: CPAP (8-10 cmH2O) ou BIPAP (IPAP 12-14, EPAP 6-8) reduzem intubação e mortalidade na primeira hora.\n" +
      "2. Vasodilatador Venoso de Ação Rápida (EAP Hipertensivo com PAS > 140):\n" +
      "   • Nitroglicerina (Tridil) IV: iniciar a 10-20 mcg/min e titular a cada 5 min OU Nitroprussiato de Sódio (Nipride) 0,3-0,5 mcg/kg/min se emergência hipertensiva grave.\n" +
      "3. Diurético de Alça Venoso: Furosemida 20 a 40 mg IV (ou 1 a 2x a dose oral prévia do paciente).\n" +
      "4. Posição: Cabeceira elevada a 90 graus com pernas pendentes.\n" +
      "5. Morfina NÃO é recomendada de rotina (aumenta intubação e UTI pela ESC/SBC).",
    "divergencia": "A SBC e ESC desaconselham formalmente morfina de rotina no EAP. O foco imediato no EAP hipertensivo é a vasodilatação rápida (redução de pós-carga) antes de grandes volumes de diurético."
  },
  "cad": {
    "titulo": "Cetoacidose Diabética (CAD) e Estado Hiperosmolar Hiperglicêmico (EHH)",
    "diretriz_brasileira": "Diretrizes SBD (Sociedade Brasileira de Diabetes) 2023/2024",
    "diretriz_internacional": "ADA (American Diabetes Association) Standards of Care 2024",
    "conduta_imediata": "1. Hidratação Venosa (Etapa 1):\n" +
      "   • SF 0,9% 1000 a 1500 mL na 1ª hora (15-20 mL/kg/h).\n" +
      "   • Após 1ª hora: avaliar Na corrigido. Se Na normal/alto: trocar para NaCl 0,45% 250-500 mL/h.\n" +
      "2. Avaliação Mandatória do Potássio ANTES da Insulina (ADA 2024):\n" +
      "   • Se K < 3,5 mEq/L: NÃO INICIAR INSULINA! Repor KCl 20 a 30 mEq/h até K > 3,5 mEq/L.\n" +
      "   • Se K 3,5 a 5,2 mEq/L: Iniciar insulina E repor KCl 20-30 mEq por litro de soro de manutenção.\n" +
      "   • Se K > 5,2 mEq/L: Iniciar insulina e NÃO repor potássio (monitorar a cada 2h).\n" +
      "3. Insulinoterapia:\n" +
      "   • Insulina Regular IV contínua: 0,1 U/kg/h (ou bolus 0,1 U/kg + 0,1 U/kg/h).\n" +
      "   • Meta de queda glicêmica: 50 a 70 mg/dL por hora.\n" +
      "   • Quando glicemia atingir 200 mg/dL: associar Soro Glicosado a 5% (SG 5%) e reduzir insulina para 0,02-0,05 U/kg/h para evitar hipoglicemia e edema cerebral enquanto fecha o ânion gap.\n" +
      "4. Bicarbonato: reservado APENAS se pH < 6,9.",
    "divergencia": "Tanto SBD quanto ADA condenam o uso de bicarbonato se pH ≥ 6,9 (risco de hipocalemia severa, hipóxia tecidual e acidose liquórica paradoxal). Critério de resolução: glicemia < 200 + 2 de: HCO3 ≥ 15, pH venoso > 7,30 e Anion Gap normal (≤ 12)."
  },
  "tep": {
    "titulo": "Tromboembolismo Pulmonar (TEP)",
    "diretriz_brasileira": "Diretriz SBC / SBACV de Embolia Pulmonar",
    "diretriz_internacional": "ESC Pulmonary Embolism Guidelines / CHEST",
    "conduta_imediata": "1. Estratificação de Risco Imediata:\n" +
      "   • Alto Risco (Instabilidade Hemodinâmica / Choque / PAS < 90):\n" +
      "     - Suporte ventilatório e hemodinâmico (evitar sobrecarga volêmica, vasopressor precoce: Noradrenalina).\n" +
      "     - Reperfusão de emergência imediata: Trombólise sistêmica com Alteplase (rtPA 100 mg IV em 2h ou 0,6 mg/kg em 15 min na PCR iminente).\n" +
      "     - Anticoagulação imediata com HNF venosa em bolus (80 UI/kg) e infusão (18 UI/kg/h).\n" +
      "   • Risco Intermediário / Baixo (Estável):\n" +
      "     - Anticoagulação plena com Enoxaparina 1 mg/kg SC 12/12h ou NOACs (Rivaroxabana 15 mg 12/12h 21 dias ou Apixabana 10 mg 12/12h 7 dias).\n" +
      "     - Escore sPESI para decisão de internação vs alta precoce.",
    "divergencia": "No SUS/Brasil, Enoxaparina e Varfarina ainda são as mais disponíveis na internação e alta, enquanto no cenário privado e internacional os NOACs (DOACs) são primeira linha isolada."
  },
  "dpoc": {
    "titulo": "DPOC Exacerbada",
    "diretriz_brasileira": "Diretrizes SBPT (Sociedade Brasileira de Pneumologia e Tisiologia) 2023",
    "diretriz_internacional": "GOLD 2024",
    "conduta_imediata": "1. Broncodilatadores de Ação Rápida:\n" +
      "   • Salbutamol 4 a 8 jatos com espaçador a cada 20 min na 1ª hora (ou nebulização 2,5-5 mg).\n" +
      "   • Brometo de Ipratrópio associado a cada 20 min na 1ª hora.\n" +
      "2. Corticoterapia Sistêmica Precoce:\n" +
      "   • Prednisona 40 mg VO 1x/dia por 5 dias (GOLD/SBPT) OU Hidrocortisona 100 mg IV se via oral inviável.\n" +
      "3. Oxigenoterapia Controlada:\n" +
      "   • Alvo SpO2: 88% a 92% (evitar hiperóxia que induz efeito Haldane e narcose por CO2).\n" +
      "4. Ventilação Não Invasiva (VNI):\n" +
      "   • Primeira linha se acidose respiratória aguda (pH < 7,35 e PaCO2 > 45 mmHg) ou fadiga muscular.\n" +
      "5. Antibioticoterapia (Critérios de Anthonisen: escarro purulento, aumento de volume, piora da dispneia):\n" +
      "   • Amoxicilina + Clavulanato 875/125 mg 12/12h por 5-7 dias OU Azitromicina 500 mg/dia por 5 dias.",
    "divergencia": "A SBPT e o GOLD 2024 reforçam tempo de corticoide curto de apenas 5 dias, eliminando desmames desnecessários."
  },
  "asma": {
    "titulo": "Crise de Asma Grave no Adulto",
    "diretriz_brasileira": "Diretrizes SBPT para Manejo da Asma",
    "diretriz_internacional": "GINA 2024/2026 Strategy Report",
    "conduta_imediata": "1. Broncodilatadores de Ação Rápida:\n" +
      "   • Salbutamol spray 4 a 10 jatos com espaçador a cada 20 min na 1ª hora (ou nebulização 2,5 a 5 mg).\n" +
      "   • Brometo de Ipratrópio (0,5 mg nebulizado ou 4 a 8 jatos) associado na 1ª hora em crise moderada a grave.\n" +
      "2. Corticoterapia Sistêmica Precoce (início na 1ª hora):\n" +
      "   • Prednisona 40 a 50 mg VO por 5 a 7 dias OU Hidrocortisona 200 mg IV se via oral impraticável.\n" +
      "3. Oxigenoterapia Titulada (Alvo GINA):\n" +
      "   • Alvo SpO₂: 93% a 95% em adultos (em gestantes ≥ 95%). Evitar hipoxemia e evitar hiperóxia excessiva.\n" +
      "4. Sulfato de Magnésio EV (se má resposta inicial ou crise grave):\n" +
      "   • Sulfato de magnésio 2 g IV em 20 minutos.\n" +
      "5. Critérios de Alarme (Via Aérea / UTI):\n" +
      "   • Silêncio respiratório, exaustão, confusão mental ou PaCO₂ normal/elevada (indica falência muscular iminente).",
    "divergencia": "Diferente da DPOC (alvo 88–92% pelo risco de retenção de CO₂), na Asma o alvo mandatório é SpO₂ 93–95% (GINA 2026)."
  }
};

/**
 * Consulta protocolo clínico estruturado determinístico
 */
function obterProtocoloClinico(termo) {
  if (!termo) return null;
  var t = termo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (var chave in PROTOCOLOS_CLINICOS_EMERGENCIA) {
    if (t.indexOf(chave) !== -1) {
      return PROTOCOLOS_CLINICOS_EMERGENCIA[chave];
    }
  }
  // Mapeamentos adicionais
  if (t.indexOf("choque") !== -1 || t.indexOf("infeccao grave") !== -1) return PROTOCOLOS_CLINICOS_EMERGENCIA["sepse"];
  if (t.indexOf("coronaria") !== -1 || t.indexOf("infarto") !== -1 || t.indexOf("dor toracica") !== -1) return PROTOCOLOS_CLINICOS_EMERGENCIA["iam"];
  if (t.indexOf("insuficiencia cardiaca") !== -1 || t.indexOf("congestao") !== -1) return PROTOCOLOS_CLINICOS_EMERGENCIA["eap"];
  if (t.indexOf("cetoacidose") !== -1 || t.indexOf("descompensacao diabetica") !== -1) return PROTOCOLOS_CLINICOS_EMERGENCIA["cad"];
  if (t.indexOf("embolia") !== -1 || t.indexOf("tvp") !== -1) return PROTOCOLOS_CLINICOS_EMERGENCIA["tep"];
  if (t.indexOf("asma") !== -1 || t.indexOf("broncoespasmo") !== -1) return PROTOCOLOS_CLINICOS_EMERGENCIA["asma"];
  if (t.indexOf("dpoc") !== -1) return PROTOCOLOS_CLINICOS_EMERGENCIA["dpoc"];
  return null;
}

// ==============================================================================
// CONSULTA EM BASES CIENTÍFICAS ABERTAS E GRATUITAS (EUROPE PMC & NCBI PUBMED)
// ==============================================================================

/**
 * Consulta a API aberta e gratuita do Europe PMC (EBI)
 * Retorna metadados de artigos científicos, revisões sistemáticas e ensaios clínicos.
 */
function consultarEuropePMC(query, maxArtigos) {
  var limite = maxArtigos || 3;
  var qTerm = encodeURIComponent(query + " AND (review OR clinical trial OR guideline OR meta-analysis)");
  var url = "https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=" + qTerm + "&format=json&pageSize=" + limite + "&resultType=lite&sort_date=y";
  
  try {
    var res = UrlFetchApp.fetch(url, { "muteHttpExceptions": true });
    if (res.getResponseCode() === 200) {
      var json = JSON.parse(res.getContentText());
      var resultados = [];
      if (json.resultList && json.resultList.result) {
        var lista = json.resultList.result;
        for (var i = 0; i < lista.length; i++) {
          var item = lista[i];
          resultados.push({
            "titulo": item.title || "Sem título",
            "autores": item.authorString ? item.authorString.split(",")[0] + " et al." : "Vários autores",
            "revista": item.journalTitle || "Periódico Internacional",
            "ano": item.pubYear || "",
            "pmid": item.pmid || "",
            "doi": item.doi || "",
            "link": item.pmid ? "https://pubmed.ncbi.nlm.nih.gov/" + item.pmid + "/" : (item.doi ? "https://doi.org/" + item.doi : "")
          });
        }
      }
      return resultados;
    }
  } catch (e) {
    Logger.log("Erro na consulta ao Europe PMC: " + e.message);
  }
  return [];
}

/**
 * Consulta direta à API pública do PubMed (NCBI Entrez E-utilities)
 */
function consultarPubMed(query, maxArtigos) {
  var limite = maxArtigos || 3;
  var qTerm = encodeURIComponent(query + " AND (guideline[pt] OR practice guideline[pt] OR systematic review[pt] OR randomized controlled trial[pt])");
  var urlBusca = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=" + qTerm + "&retmode=json&retmax=" + limite + "&sort=pub_date";

  try {
    var resBusca = UrlFetchApp.fetch(urlBusca, { "muteHttpExceptions": true });
    if (resBusca.getResponseCode() === 200) {
      var jsonBusca = JSON.parse(resBusca.getContentText());
      var idList = jsonBusca.esearchresult && jsonBusca.esearchresult.idlist ? jsonBusca.esearchresult.idlist : [];
      if (idList.length === 0) return [];

      var urlResumo = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=" + idList.join(",") + "&retmode=json";
      var resResumo = UrlFetchApp.fetch(urlResumo, { "muteHttpExceptions": true });
      if (resResumo.getResponseCode() === 200) {
        var jsonResumo = JSON.parse(resResumo.getContentText());
        var resultados = [];
        for (var i = 0; i < idList.length; i++) {
          var id = idList[i];
          var art = jsonResumo.result ? jsonResumo.result[id] : null;
          if (art) {
            resultados.push({
              "titulo": art.title || "Sem título",
              "autores": art.authors && art.authors.length > 0 ? art.authors[0].name + " et al." : "",
              "revista": art.source || "PubMed",
              "ano": art.pubdate ? art.pubdate.substring(0, 4) : "",
              "pmid": id,
              "link": "https://pubmed.ncbi.nlm.nih.gov/" + id + "/"
            });
          }
        }
        return resultados;
      }
    }
  } catch (e) {
    Logger.log("Erro na consulta ao PubMed: " + e.message);
  }
  return [];
}

/**
 * Busca científica unificada: consulta Europe PMC e PubMed e formata relatório com evidências reais
 */
function buscarEvidenciaMedica(tema) {
  if (!tema) return "Informe o tema médico para pesquisa científica (ex: /evidencia corticoide choque septico).";
  var artigos = consultarEuropePMC(tema, 3);
  if (!artigos || artigos.length === 0) {
    artigos = consultarPubMed(tema, 3);
  }

  var texto = "🔬 *EVIDÊNCIA CIENTÍFICA & LITERATURA MÉDICA (PUBMED / EUROPE PMC)*\n\n" +
    "📌 *Tema Pesquisado:* " + tema + "\n\n";

  if (!artigos || artigos.length === 0) {
    texto += "⚠️ Nenhum ensaio clínico ou diretriz indexada diretamente para este termo em texto livre. Tente termos em inglês ou palavras-chave específicas.";
    return texto;
  }

  for (var i = 0; i < artigos.length; i++) {
    var a = artigos[i];
    texto += "*" + (i + 1) + ". " + a.titulo + "*\n";
    texto += "👤 _" + a.autores + "_ · 📚 *" + a.revista + "* (" + a.ano + ")\n";
    if (a.pmid) texto += "🔗 PMID: `" + a.pmid + "` — [Abrir no PubMed](" + a.link + ")\n\n";
  }

  texto += "💡 *Dica:* Utilize os PMIDs para acessar os artigos originais e meta-análises completas.";
  return texto;
}


// ==============================================================================
// ARQUIVO FONTE: 04_motores_ia.js
// ==============================================================================

/**
 * ==============================================================================
 * src/04_motores_ia.js - MOTORES DE IA, PROMPTS CLÍNICOS E ROTEAMENTO DE INTENÇÃO
 * ==============================================================================
 * Versão consolidada (clínica + infraestrutura + persona/UX). Google Apps Script V8.
 *
 * Dependências externas (definidas em outros módulos): ConfigService, obterPlanilha,
 * filtrarMedicamentosRelevantes, normalizarTexto, DICIONARIO_FARMACO,
 * CalculadorasClinicas, obterProtocoloClinico, obterDiaSemanaExtenso.
 *
 * Configurações opcionais (ConfigService), todas com padrão seguro:
 *   PROVEDOR_TEXTO_PADRAO  GROQ | OPENROUTER | ZAI | GEMINI
 *   IA_MODELOS_GROQ / IA_MODELOS_OPENROUTER / IA_MODELOS_ZAI / IA_MODELOS_GEMINI /
 *   IA_MODELOS_GEMINI_GROUNDING  (lista separada por vírgula)
 *   IA_ORCAMENTO_MS              (padrão 50000) tempo máximo da cascata
 *   IA_GROUNDING_EMERGENCIA      ("true" tenta busca web antes da cascata)
 *   IA_AUDITORIA_PRESCRICAO      (padrão "true") segunda passada de segurança
 *   IA_AUDITORIA_EMERGENCIA      (padrão "false")
 * ==============================================================================
 */

var IA_PADROES = {
  ORCAMENTO_MS: 50000,
  FOLGA_TOKENS: 1024,
  TOKENS_TETO: 6000,
  GROQ: ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.3-70b-versatile"],
  OPENROUTER: ["openrouter/free"],
  ZAI: ["glm-4.7-flash", "glm-4.5-flash"],
  GEMINI: ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-flash-latest"],
  GEMINI_GROUNDING: ["gemini-3.8-flash", "gemini-3.5-flash"]
};

var IA_INTENCOES_VALIDAS = [
  "PRECEPTOR_VOZ", "EVIDENCIA_MEDICA", "CLINICO_EMERGENCIA", "CLINICO_SOAP", "CLINICO_RX",
  "CLINICO_GASO", "CALENDAR_CRIAR", "CALENDAR_CONSULTAR", "NOTION_TASK", "NOTION_DUVIDA",
  "HABITO_PROATIVO", "ENFERMARIA", "CONVERSA"
];

// ==============================================================================
// BLOCOS DE PERSONA, UX E SEGURANÇA (compartilhados pelos prompts)
// ==============================================================================

var IA_PERSONA = [
  "PERSONA - ASSISTENTE DE VIDA PESSOAL E CLÍNICO",
  "- Você é um assistente de IA de apoio a Wagner (estudante de medicina em internato, psicólogo, interessado em psiquiatria).",
  "- Adote a postura de uma preceptoria experiente de hospital universitário: firme, técnica, instigante e acolhedora.",
  "- Você NÃO é médico, NÃO assina prescrições e NÃO substitui a supervisão do preceptor ou da equipe assistente. Não afirme vínculo ou certificação institucional.",
  "- Português do Brasil. Técnico em medicina, simples em assuntos pessoais. Sem bajulação, sarcasmo, bronca ou infantilização.",
  "- Comece pela resposta, prioridade ou decisão. Nunca abra com saudação, elogio ou explicação sobre você.",
  "- Separe dado informado, interpretação e dado pendente. Nunca transforme ausência de informação em achado normal. Nunca invente dados do paciente.",
  "- Não use 'validado', 'seguro' ou 'confirmado' sem suporte verificável nos dados recebidos.",
  "- Não encerre com ofertas genéricas de ajuda. Pergunte apenas quando a resposta mudar a conduta ou sustentar a atividade pedagógica.",
  "- Brevidade nunca autoriza omitir condição de segurança."
].join("\n");

var IA_VISUAL = [
  "CONTRATO VISUAL (TELEGRAM, Markdown)",
  "- Título curto: um emoji funcional + nome do modo, em negrito com um asterisco: *título*. Nunca use ** nem # nem tabelas nem arte ASCII.",
  "- Prioridade, decisão ou estado nas duas primeiras linhas. Uma linha em branco entre blocos.",
  "- Bullets planos com hífen (-), sem listas aninhadas. Numere apenas quando a ordem de execução importar.",
  "- Emojis somente em títulos e avisos (não em cada bullet). Gravidade também por escrito (Instável, Pendente, Falhou), nunca só por emoji.",
  "- Negrito apenas em rótulos, dado decisivo e doses completas (fármaco + valor + unidade + via). Nunca em parágrafos inteiros.",
  "- Omita seções vazias, exceto campos obrigatórios de documentação ('Não informado').",
  "- NUNCA use LaTeX nem símbolos de cifrão para matemática. Escreva cálculos em texto simples, ex: (165 - 35) / 5; unidades como 200 mg, 90 mmHg.",
  "- Balanceie todos os asteriscos e underscores. Não deixe texto cortado."
].join("\n");

var IA_SEGURANCA_MEDICAMENTOSA = [
  "CHECAGEM DE SEGURANÇA MEDICAMENTOSA (OBRIGATÓRIA ANTES DE QUALQUER DOSE)",
  "1. DOSE MÁXIMA: informe a dose máxima por administração e por dia e sinalize se a sugestão ultrapassa o limite.",
  "2. FUNÇÃO RENAL/HEPÁTICA: se creatinina/TFG/Child-Pugh não foram informados e o fármaco exige ajuste (AINEs, metformina, digoxina, enoxaparina, antimicrobianos de depuração renal, sedativos, etc.), declare 'ajuste renal pendente' e oriente a conferir antes de administrar. Nunca suponha função normal em silêncio.",
  "3. PESO E DOSES: Para fármacos com dosagem dependente de peso em kg (DVA, sedativos/bloqueadores de SRI, ajustes pediátricos), NUNCA invente ou presuma peso arbitrário (como 70 kg). Se o peso em kg for obrigatório e não informado, declare a pendência explicitamente antes de calcular doses absolutas.",
  "4. DILUENTE E INFUSÃO: para cada droga EV informe diluente, concentração final, tempo ou velocidade e acesso (periférico/central). Armadilhas: amiodarona em SG 5% (não em SF); fenitoína somente em SF 0,9% e no máximo 50 mg/min em adulto; KCl nunca em bolus e, em acesso periférico, até cerca de 10 mEq/h; vasopressores titulados em mcg/kg/min ou mcg/min com acesso adequado. Em dúvida sobre compatibilidade, diga 'conferir compatibilidade/protocolo institucional'.",
  "5. POPULAÇÕES ESPECIAIS: considere gestação/lactação, idoso (medicamentos potencialmente inapropriados), polifarmácia, alergias e interações antes de concluir.",
  "6. UNIDADES: escreva 'unidades' (nunca 'U'), 'microgramas' ou 'mcg' (nunca 'ug'). Nunca omita a unidade.",
  "7. APRESENTAÇÕES: só cite número de ampolas/mL se a apresentação foi informada na lista/protocolo recebido; caso contrário use 'apresentação habitual (conferir rótulo)'.",
  "8. RODAPÉ OBRIGATÓRIO: 'Sugestão gerada por IA. Conferir dose, diluição e diretriz; a responsabilidade da prescrição é do prescritor.'"
].join("\n");

var IA_DIRETRIZES_EMERGENCIA = [
  "DIRETRIZES DE REFERÊNCIA (VERSÕES)",
  "- PCR/ACLS: American Heart Association 2025 (ILCOR CoSTR vigente). Não cite 'ACLS 2024'.",
  "- Sepse (adulto): Surviving Sepsis Campaign 2021 e atualizações subsequentes; a triagem NÃO deve usar qSOFA isolado. Hora 1: lactato, hemoculturas antes do antimicrobiano, antimicrobiano de amplo espectro, cristaloide 30 mL/kg se hipotensão ou lactato elevado, vasopressor (noradrenalina de primeira linha) para PAM alvo >= 65 mmHg.",
  "- Prioridade a diretrizes brasileiras (SBC, AMIB, ILAS, SBPT, SBN, Ministério da Saúde/Conitec). Cite sociedade e ano apenas quando tiver certeza; se não tiver, escreva 'conferir versão vigente'.",
  "- Se houver PROTOCOLO OFICIAL DE REFERÊNCIA no contexto, use-o como base e sinalize qualquer divergência sua em relação a ele.",
  "- Mencione divergência internacional somente se mudar a conduta prática."
].join("\n");

// ==============================================================================
// UTILITÁRIOS DE INFRAESTRUTURA
// ==============================================================================

function _iaCfg(chave, padrao) {
  try {
    var v = ConfigService.get(chave, padrao);
    return (v === undefined || v === null || v === "") ? padrao : v;
  } catch (e) {
    return padrao;
  }
}

function _iaCfgBool(chave, padrao) {
  var v = String(_iaCfg(chave, padrao ? "true" : "false")).toLowerCase();
  return v === "true" || v === "1" || v === "sim";
}

function _iaLista(chave, padrao) {
  var bruto = _iaCfg(chave, "");
  var lista = [];
  if (Array.isArray(bruto)) {
    lista = bruto;
  } else if (typeof bruto === "string" && bruto.trim()) {
    lista = bruto.split(",");
  }
  lista = lista.map(function (x) { return String(x).trim(); }).filter(function (x) { return x; });
  return lista.length ? lista : padrao.slice();
}

function _iaNovoCtx() {
  return {
    id: Utilities.getUuid().substring(0, 8),
    inicio: new Date().getTime(),
    limite: Number(_iaCfg("IA_ORCAMENTO_MS", IA_PADROES.ORCAMENTO_MS)) || IA_PADROES.ORCAMENTO_MS
  };
}

function _iaOrcamentoEsgotado(ctx) {
  return (new Date().getTime() - ctx.inicio) > ctx.limite;
}

function _iaLog(ctx, msg) {
  Logger.log("[IA " + ctx.id + "] " + msg);
}

function _iaBloqueado(chave) {
  try { return !!CacheService.getScriptCache().get("iabl_" + chave); } catch (e) { return false; }
}

function _iaBloquear(chave, segundos) {
  try { CacheService.getScriptCache().put("iabl_" + chave, "1", Math.min(segundos, 21600)); } catch (e) { /* sem cache */ }
}

function _iaEsperar(res, maxMs, padraoMs) {
  var ms = padraoMs || 0;
  try {
    var h = (typeof res.getAllHeaders === "function") ? res.getAllHeaders() : res.getHeaders();
    for (var k in h) {
      if (String(k).toLowerCase() === "retry-after") {
        var s = parseFloat(h[k]);
        if (!isNaN(s)) ms = s * 1000;
      }
    }
  } catch (e) { /* ignora */ }
  ms = Math.min(ms, maxMs);
  if (ms > 0) Utilities.sleep(ms);
}

function _iaTokensEfetivos(tokens) {
  var base = Number(tokens) || 2000;
  return Math.min(base + IA_PADROES.FOLGA_TOKENS, 8192);
}

function _iaTextoDeConteudo(conteudo) {
  if (typeof conteudo === "string") return conteudo;
  if (Array.isArray(conteudo)) {
    return conteudo.map(function (p) { return (p && p.text) ? p.text : (typeof p === "string" ? p : ""); }).join("");
  }
  return "";
}

// ==============================================================================
// SANITIZAÇÃO DE SAÍDA (LaTeX, raciocínio vazado, Markdown do Telegram)
// ==============================================================================

function _iaRemoverLatex(texto) {
  if (texto === null || texto === undefined) return texto;
  var t = String(texto);
  t = t.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");

  var mapa = {
    times: "x", cdot: ".", approx: "~", geq: ">=", leq: "<=", neq: "!=", pm: "+/-",
    rightarrow: "->", leftarrow: "<-", uparrow: "aumenta", downarrow: "diminui",
    mu: "micro", Delta: "Delta", delta: "delta", alpha: "alfa", beta: "beta", degree: "graus"
  };

  function limparMatematica(s) {
    var r = s;
    for (var i = 0; i < 3; i++) {
      r = r.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)");
    }
    r = r.replace(/\\(?:text|mathrm|mathbf|textbf|mathit|operatorname)\s*\{([^{}]*)\}/g, "$1");
    r = r.replace(/\\sqrt\s*\{([^{}]*)\}/g, "raiz($1)");
    r = r.replace(/\\([A-Za-z]+)/g, function (m, nome) { return mapa.hasOwnProperty(nome) ? mapa[nome] : ""; });
    r = r.replace(/\\[,;:!]/g, " ").replace(/\\([%&#])/g, "$1");
    r = r.replace(/\^\{([^{}]*)\}/g, "^$1").replace(/_\{([^{}]*)\}/g, "$1").replace(/[{}]/g, "");
    return r;
  }

  t = t.replace(/\$\$([\s\S]*?)\$\$/g, function (m, i) { return limparMatematica(i); });
  t = t.replace(/\\\[([\s\S]*?)\\\]/g, function (m, i) { return limparMatematica(i); });
  t = t.replace(/\\\(([\s\S]*?)\\\)/g, function (m, i) { return limparMatematica(i); });
  t = t.replace(/\$([^$\n]{1,160}?)\$/g, function (m, i) {
    return /[\\^_{}]/.test(i) ? limparMatematica(i) : m;
  });
  t = t.replace(/\\(?:text|mathrm|mathbf|textbf)\s*\{([^{}]*)\}/g, "$1");
  t = t.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)");
  return t;
}

function _iaFinalizarTexto(texto) {
  if (!texto) return texto;
  var t = String(texto).replace(/\r\n/g, "\n");
  t = t.replace(/^\s{0,3}#{1,6}\s*(.+)$/gm, "*$1*");
  t = t.replace(/\*\*([^*\n]+)\*\*/g, "*$1*");
  t = t.replace(/^(\s*)\*\s+/gm, "$1- ");
  ["*", "_", "`"].forEach(function (ch) {
    var partes = t.split(ch).length - 1;
    if (partes % 2 === 1) t = t.split(ch).join("");
  });
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  if (t.indexOf("RASCUNHO") === -1 && t.indexOf("Rascunho") === -1 && t.indexOf("rascunho") === -1) {
    t = "⚠️ *Rascunho para conferência médica*\n\n" + t;
  }
  return t;
}

function _iaCortarNaFrase(texto) {
  var t = String(texto || "");
  var corte = Math.max(t.lastIndexOf("\n"), t.lastIndexOf(". "), t.lastIndexOf("; "), t.lastIndexOf("? "));
  if (corte > t.length * 0.5) return t.substring(0, corte + 1).trim();
  return t.trim();
}

function _iaTextoFalado(texto) {
  if (!texto) return texto;
  return String(texto)
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_#`>~\[\]]/g, "")
    .replace(/^\s*[-\u2022]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function _iaExtrairJSON(texto) {
  if (!texto) return null;
  var limpo = String(texto).replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```json/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(limpo); } catch (e) { /* tenta recorte */ }
  var i = limpo.indexOf("{");
  var j = limpo.lastIndexOf("}");
  if (i >= 0 && j > i) {
    try { return JSON.parse(limpo.substring(i, j + 1)); } catch (e2) { /* falhou */ }
  }
  return null;
}

// ==============================================================================
// PROVEDORES (retornam {texto, truncado} ou null)
// ==============================================================================

function _iaProvOpenAICompat(cfg, sistema, prompt, tokens, ctx) {
  var apiKey = ConfigService.get(cfg.chaveApi);
  if (!apiKey) return null;
  var modelos = cfg.modelos;

  for (var i = 0; i < modelos.length; i++) {
    if (_iaOrcamentoEsgotado(ctx)) { _iaLog(ctx, cfg.rotulo + ": orçamento de tempo esgotado"); return null; }
    var modelo = modelos[i];
    if (_iaBloqueado(cfg.rotulo + "_" + modelo)) continue;

    var payload = {
      model: modelo,
      messages: [{ role: "system", content: sistema }, { role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: _iaTokensEfetivos(tokens)
    };
    if (cfg.raciocinioEfetivo && /gpt-oss/i.test(modelo)) {
      payload.reasoning_effort = tokens <= 600 ? "low" : "medium";
    }
    var headers = { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" };
    for (var h in (cfg.headersExtra || {})) headers[h] = cfg.headersExtra[h];

    try {
      var res = UrlFetchApp.fetch(cfg.url, {
        method: "post", headers: headers, payload: JSON.stringify(payload), muteHttpExceptions: true
      });
      var code = res.getResponseCode();
      if (code === 200) {
        var json = JSON.parse(res.getContentText());
        var escolha = json.choices && json.choices[0];
        var texto = escolha && escolha.message ? _iaTextoDeConteudo(escolha.message.content) : "";
        var truncado = !!(escolha && escolha.finish_reason === "length");
        if (texto && texto.trim()) return { texto: texto, truncado: truncado, modelo: modelo };
        if (truncado) return { texto: "", truncado: true, modelo: modelo };
        _iaLog(ctx, cfg.rotulo + " " + modelo + ": resposta vazia");
      } else if (code === 404) {
        _iaBloquear(cfg.rotulo + "_" + modelo, 3600);
        _iaLog(ctx, cfg.rotulo + " " + modelo + ": 404 (bloqueado por 1h)");
      } else if (code === 429) {
        _iaLog(ctx, cfg.rotulo + " " + modelo + ": 429");
        _iaEsperar(res, 2000, 300);
      } else if (code === 401 || code === 403) {
        _iaLog(ctx, cfg.rotulo + ": credencial recusada (" + code + ")");
        return null;
      } else {
        _iaLog(ctx, cfg.rotulo + " " + modelo + ": HTTP " + code);
      }
    } catch (e) {
      _iaLog(ctx, cfg.rotulo + " " + modelo + " exceção: " + e.message);
    }
  }
  return null;
}

function _iaProvGroq(sistema, prompt, tokens, ctx) {
  return _iaProvOpenAICompat({
    rotulo: "GROQ", chaveApi: "GROQ_API_KEY", url: "https://api.groq.com/openai/v1/chat/completions",
    modelos: _iaLista("IA_MODELOS_GROQ", IA_PADROES.GROQ), raciocinioEfetivo: true
  }, sistema, prompt, tokens, ctx);
}

function _iaProvOpenRouter(sistema, prompt, tokens, ctx) {
  return _iaProvOpenAICompat({
    rotulo: "OPENROUTER", chaveApi: "OPENROUTER_API_KEY", url: "https://openrouter.ai/api/v1/chat/completions",
    modelos: _iaLista("IA_MODELOS_OPENROUTER", IA_PADROES.OPENROUTER),
    headersExtra: { "HTTP-Referer": "https://t.me/wagmoraes", "X-Title": "Clinical Assistant GAS" }
  }, sistema, prompt, tokens, ctx);
}

function _iaProvZai(sistema, prompt, tokens, ctx) {
  return _iaProvOpenAICompat({
    rotulo: "ZAI", chaveApi: "ZAI_API_KEY", url: "https://api.z.ai/api/paas/v4/chat/completions",
    modelos: _iaLista("IA_MODELOS_ZAI", IA_PADROES.ZAI)
  }, sistema, prompt, tokens, ctx);
}

var IA_DIRETIVA_SEM_LATEX = "\n\nCRÍTICO: NUNCA use formatação matemática LaTeX (como $...$ ou $$...$$). Escreva números, dosagens e unidades (ex: 200 mg, 90 mmHg) como texto limpo e simples.";

function _iaProvGemini(sistema, prompt, tokens, ctx, opcoes) {
  opcoes = opcoes || {};
  var chaves = ConfigService.getArray("GEMINI_API_KEYS");
  chaves = (chaves || []).map(function (c) { return String(c).trim(); }).filter(function (c) { return c; });
  if (chaves.length === 0) return null;

  var modelos = opcoes.modelos || _iaLista("IA_MODELOS_GEMINI", IA_PADROES.GEMINI);
  var instrucao = (opcoes.instrucaoSistema || sistema) + IA_DIRETIVA_SEM_LATEX;
  var partesUsuario = opcoes.partesUsuario || [{ text: prompt }];

  var inicio = 0;
  try {
    inicio = parseInt(CacheService.getScriptCache().get("ia_gem_idx") || "0", 10) || 0;
  } catch (e0) { inicio = 0; }

  for (var m = 0; m < modelos.length; m++) {
    var modelo = modelos[m];
    if (_iaBloqueado("GEMINI_" + modelo)) continue;
    var todas429 = true;
    var tentou5xx = false;

    for (var j = 0; j < chaves.length; j++) {
      if (_iaOrcamentoEsgotado(ctx)) { _iaLog(ctx, "GEMINI: orçamento de tempo esgotado"); return null; }
      var idx = (inicio + j) % chaves.length;
      var payload = {
        systemInstruction: { parts: [{ text: instrucao }] },
        contents: [{ role: "user", parts: partesUsuario }],
        generationConfig: { temperature: 0.2, maxOutputTokens: _iaTokensEfetivos(tokens) }
      };
      if (opcoes.grounding) payload.tools = [{ googleSearch: {} }];

      try {
        var res = UrlFetchApp.fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" + modelo + ":generateContent",
          {
            method: "post", contentType: "application/json",
            headers: { "x-goog-api-key": chaves[idx] },
            payload: JSON.stringify(payload), muteHttpExceptions: true
          }
        );
        var code = res.getResponseCode();

        if (code === 200) {
          todas429 = false;
          var json = JSON.parse(res.getContentText());
          var cand = json.candidates && json.candidates[0];
          var partes = (cand && cand.content && cand.content.parts) ? cand.content.parts : [];
          var texto = partes.filter(function (p) { return p && p.text && !p.thought; })
                            .map(function (p) { return p.text; }).join("");
          var truncado = !!(cand && cand.finishReason === "MAX_TOKENS");
          if (texto.trim()) {
            try { CacheService.getScriptCache().put("ia_gem_idx", String((idx + 1) % chaves.length), 21600); } catch (e1) { /* ok */ }
            return { texto: texto, truncado: truncado, modelo: modelo };
          }
          if (truncado) return { texto: "", truncado: true, modelo: modelo };
          _iaLog(ctx, "GEMINI " + modelo + ": sem texto (finishReason=" + (cand ? cand.finishReason : "n/d") + ")");
          break;
        } else if (code === 429) {
          _iaLog(ctx, "GEMINI " + modelo + ": 429 na chave #" + idx + ", rotacionando");
          continue;
        } else if (code === 500 || code === 502 || code === 503 || code === 504) {
          todas429 = false;
          if (!tentou5xx) {
            tentou5xx = true;
            _iaLog(ctx, "GEMINI " + modelo + ": " + code + ", repetindo uma vez");
            _iaEsperar(res, 1500, 700);
            j--;
            continue;
          }
          break;
        } else if (code === 404) {
          todas429 = false;
          _iaBloquear("GEMINI_" + modelo, 3600);
          _iaLog(ctx, "GEMINI " + modelo + ": 404 (bloqueado por 1h)");
          break;
        } else if (code === 401 || code === 403) {
          _iaLog(ctx, "GEMINI: chave #" + idx + " recusada (" + code + ")");
          continue;
        } else {
          todas429 = false;
          _iaLog(ctx, "GEMINI " + modelo + ": HTTP " + code);
          break;
        }
      } catch (e) {
        todas429 = false;
        _iaLog(ctx, "GEMINI " + modelo + " exceção: " + e.message);
        continue;
      }
    }
    if (todas429 && chaves.length > 0) _iaBloquear("GEMINI_" + modelo, 60);
  }
  return null;
}

function _iaResolverTruncamento(chamar, tokens, r, ctx, json) {
  if (!r || !r.truncado) return r;
  if (!_iaOrcamentoEsgotado(ctx)) {
    var maisTokens = Math.min(Math.ceil((Number(tokens) || 2000) * 1.6), IA_PADROES.TOKENS_TETO);
    _iaLog(ctx, "Truncamento detectado, repetindo com " + maisTokens + " tokens");
    var r2 = chamar(maisTokens);
    if (r2 && r2.texto) r = r2;
  }
  if (r.truncado && r.texto && !json) {
    r.texto = _iaCortarNaFrase(r.texto) +
      "\n\n\u26A0\uFE0F Resposta interrompida por limite de tamanho. Não use como conduta completa; peça a continuação.";
  }
  return r;
}

function _iaOrdemProvedores() {
  var padrao = String(_iaCfg("PROVEDOR_TEXTO_PADRAO", "GROQ")).toUpperCase();
  var canonica = ["GROQ", "OPENROUTER", "ZAI", "GEMINI"];
  var ordem = canonica.indexOf(padrao) >= 0 ? [padrao] : [];
  canonica.forEach(function (p) { if (ordem.indexOf(p) < 0) ordem.push(p); });
  return ordem;
}

function _iaChamarProvedor(nome, sistema, prompt, tokens, ctx) {
  if (nome === "GROQ") return _iaProvGroq(sistema, prompt, tokens, ctx);
  if (nome === "OPENROUTER") return _iaProvOpenRouter(sistema, prompt, tokens, ctx);
  if (nome === "ZAI") return _iaProvZai(sistema, prompt, tokens, ctx);
  if (nome === "GEMINI") return _iaProvGemini(sistema, prompt, tokens, ctx);
  return null;
}

function _iaExecutar(sistema, promptUsuario, maxTokens, opcoes) {
  opcoes = opcoes || {};
  var tokens = Number(maxTokens) || 2000;
  var ctx = _iaNovoCtx();
  var ordem = _iaOrdemProvedores();

  for (var i = 0; i < ordem.length; i++) {
    if (_iaOrcamentoEsgotado(ctx)) { _iaLog(ctx, "Orçamento esgotado antes de " + ordem[i]); break; }
    var nome = ordem[i];
    var chamar = function (t) { return _iaChamarProvedor(nome, sistema, promptUsuario, t, ctx); };
    var r;
    try {
      r = chamar(tokens);
      r = _iaResolverTruncamento(chamar, tokens, r, ctx, opcoes.json);
    } catch (e) {
      _iaLog(ctx, nome + " falhou: " + e.message);
      continue;
    }
    if (r && r.texto && String(r.texto).trim()) {
      _iaLog(ctx, "OK via " + nome + " (" + r.modelo + ") em " + (new Date().getTime() - ctx.inicio) + " ms");
      return opcoes.json ? r.texto : _iaRemoverLatex(r.texto);
    }
  }
  _iaLog(ctx, "TODOS OS PROVEDORES FALHARAM");
  return null;
}

function _iaPublico(chamarInterno, tokensPadrao, maxTokens) {
  var tokens = Number(maxTokens) || tokensPadrao;
  var ctx = _iaNovoCtx();
  var chamar = function (t) { return chamarInterno(t, ctx); };
  var r = _iaResolverTruncamento(chamar, tokens, chamar(tokens), ctx, false);
  return (r && r.texto) ? _iaRemoverLatex(r.texto) : null;
}

// ==============================================================================
// FUNÇÕES EXPORTADAS - MOTORES
// ==============================================================================

function executarRaciocinioClinico(sistema, promptUsuario, maxTokens) {
  return _iaExecutar(sistema, promptUsuario, maxTokens, {});
}

function chamarGroqAPI(sistema, promptUsuario, maxTokens) {
  return _iaPublico(function (t, ctx) { return _iaProvGroq(sistema, promptUsuario, t, ctx); }, 2000, maxTokens);
}

function chamarOpenRouterAPI(sistema, promptUsuario, maxTokens) {
  return _iaPublico(function (t, ctx) { return _iaProvOpenRouter(sistema, promptUsuario, t, ctx); }, 2000, maxTokens);
}

function chamarZaiAPI(sistema, promptUsuario, maxTokens) {
  return _iaPublico(function (t, ctx) { return _iaProvZai(sistema, promptUsuario, t, ctx); }, 2000, maxTokens);
}

function chamarGeminiPool(sistema, promptUsuario, maxTokens) {
  return _iaPublico(function (t, ctx) { return _iaProvGemini(sistema, promptUsuario, t, ctx); }, 2000, maxTokens);
}

/**
 * Gemini com Google Search Grounding. Embasamento em diretrizes oficiais.
 */
function chamarGeminiPoolComGrounding(sistema, promptUsuario, maxTokens) {
  var instrucao = sistema + "\n\nDIRETRIZ DE EMBASAMENTO CIENTÍFICO:\n" +
    "1. PRIORIDADE: diretrizes brasileiras oficiais (SBC, SBPT, SBD, ILAS, AMIB, CFM, AMB, Conitec/PCDT Ministério da Saúde).\n" +
    "2. DIVERGÊNCIAS: aponte discrepâncias com diretrizes internacionais (AHA/ACC, ESC, SSC, GOLD, GINA, IDSA) apenas se mudarem a conduta prática.\n" +
    "3. CITAÇÃO: indique diretriz, sociedade e ano somente quando verificados na busca; caso contrário diga 'conferir versão vigente'.\n" +
    "4. NUNCA use LaTeX ($). Retorne Markdown simples do Telegram.";
  var modelos = _iaLista("IA_MODELOS_GEMINI_GROUNDING", IA_PADROES.GEMINI_GROUNDING);
  return _iaPublico(function (t, ctx) {
    return _iaProvGemini(sistema, promptUsuario, t, ctx, { grounding: true, modelos: modelos, instrucaoSistema: instrucao });
  }, 2500, maxTokens);
}

function chamarGeminiPoolMultimodal(base64Data, mimeType, sistema, promptUsuario) {
  var msg = promptUsuario ? promptUsuario : "Por favor, analise a mídia anexada em detalhes.";
  var partes = [{ inlineData: { mimeType: mimeType, data: base64Data } }, { text: msg }];
  return _iaPublico(function (t, ctx) {
    return _iaProvGemini(sistema, msg, t, ctx, { partesUsuario: partes });
  }, 2500, 2500);
}

// ==============================================================================
// AUDITORIA DE SEGURANÇA MEDICAMENTOSA (segunda passada, opcional)
// ==============================================================================

function _iaAuditarRascunho(rascunho, dadosCaso, titulo) {
  if (!rascunho) return rascunho;
  var sistema = [
    "Você é um auditor de segurança medicamentosa e de conformidade com diretrizes. Receba o CASO e o RASCUNHO e liste SOMENTE problemas reais:",
    "- dose acima do máximo ou abaixo do terapêutico; falta de ajuste renal/hepático/peso/idade; alergia ou interação ignorada;",
    "- diluente, velocidade de infusão ou acesso incorretos; erro aritmético (refaça a conta); medicamento fora da lista informada;",
    "- conduta em desacordo com AHA 2025 (PCR), Surviving Sepsis Campaign (sepse) ou diretrizes brasileiras vigentes.",
    "Se não houver problema, responda exatamente: SEM ALERTAS. Caso contrário, até 5 linhas iniciadas por '- ' (sem introdução).",
    "Não use LaTeX. Não reescreva o rascunho."
  ].join("\n");
  var r = _iaExecutar(sistema, "CASO:\n" + dadosCaso + "\n\nRASCUNHO:\n" + rascunho, 600, {});
  if (!r) return rascunho;
  var limpo = String(r).trim();
  if (/^SEM ALERTAS/i.test(limpo)) return rascunho;
  return rascunho + "\n\n\uD83D\uDED1 *Alertas da auditoria automática (" + titulo + ")*\n" + _iaFinalizarTexto(limpo);
}

// ==============================================================================
// PROMPTS MÉDICOS ESPECIALIZADOS
// ==============================================================================

function gerarSOAPComIA(casoClinico) {
  var promptSistema = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO: DOCUMENTAÇÃO CLÍNICA. Você auxilia um interno a redigir um RASCUNHO de registro SOAP para o prontuário eletrônico (e-SUS), com base nas diretrizes vigentes (MS, SBC, SBD, PCDT).",
    "",
    "REGRAS:",
    "1. Inicie IMEDIATAMENTE pelo título '\uD83E\uDE7A *SÍNTESE SOAP - RASCUNHO AMBULATORIAL*'. Sem saudações.",
    "2. Estilo técnico de prontuário, direto.",
    "3. No Plano (P), seja prescritivo e numere as condutas.",
    "",
    "INTEGRIDADE DOCUMENTAL (REGRA INVIOLÁVEL - RESOLUÇÃO CFM 2.299/2021):",
    "- NUNCA preencha exame físico normal para sistemas que o usuário não descreveu. Isso seria documentar o que não foi examinado (falsidade documental).",
    "- Registre apenas achados e sinais vitais efetivamente informados. Sistemas ausentes: '\u2B1C Não avaliado / não informado'.",
    "- Liste em 'Exame pendente para completar' o checklist semiológico sugerido (ACV, AR, abdome, extremidades, neurológico e demais pertinentes à queixa).",
    "- Hipóteses diagnósticas e CID-10/CIAP-2 são sugestões a confirmar pelo médico responsável.",
    "",
    "ESTRUTURA:",
    "\uD83E\uDE7A *SÍNTESE SOAP - RASCUNHO AMBULATORIAL*",
    "",
    "\uD83D\uDC64 *S - Subjetivo*",
    "- *Queixa principal:* [...]",
    "- *HDA:* [cronológica, apenas dados informados]",
    "- *Histórico:* [antecedentes, alergias, uso contínuo - ou 'Não informado']",
    "- *Hábitos e contexto:* [...]",
    "",
    "\uD83D\uDD0D *O - Objetivo*",
    "- *Sinais vitais / geral:* [informados ou 'Não informado']",
    "- *Achados descritos:* [sistema: achado]",
    "- *Não avaliado:* [sistemas sem informação]",
    "",
    "\uD83E\uDDE0 *A - Avaliação*",
    "- *Problema principal:* [...] (CID-10: [X] | CIAP-2: [Y] - sugestão)",
    "- *Comorbidades:* [...]",
    "- *Diferenciais:* [do mais provável ao que não pode ser perdido]",
    "- *\u26A0\uFE0F Sinais de alarme:* [...]",
    "",
    "\uD83D\uDCCB *P - Plano*",
    "1. *Prescrição:* [genérico/RENAME, dose, via, duração - com a checagem de segurança; se faltar peso/creatinina, declarar pendência]",
    "2. *Exames:* [...]",
    "3. *Medidas não farmacológicas:* [...]",
    "4. *Atestados / encaminhamentos:* [...]",
    "5. *Seguimento e retorno:* [quando voltar e sinais para buscar o PS]",
    "",
    "\uD83D\uDD0E *Exame pendente para completar:* [checklist]",
    "",
    "\uD83D\uDCAC *Pitch para apresentar:* [2 linhas, apenas fatos informados]",
    "",
    IA_SEGURANCA_MEDICAMENTOSA
  ].join("\n");
  return _iaFinalizarTexto(executarRaciocinioClinico(promptSistema, "CASO CLÍNICO:\n" + casoClinico, 2500));
}

function gerarPrescricaoComIA(dadosPrescricao) {
  var idRemume = ConfigService.get("SPREADSHEET_ID_REMUME");
  var baseCompleta = "";
  try {
    baseCompleta = obterPlanilha("remume", idRemume, false);
  } catch (erro) {
    return "\u274C " + erro.message;
  }

  var listaMedicamentos = (typeof filtrarMedicamentosRelevantes === "function")
    ? filtrarMedicamentosRelevantes(baseCompleta, dadosPrescricao)
    : String(baseCompleta || "").substring(0, 12000);

  var promptSistema = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO: PRESCRIÇÃO AMBULATORIAL (RASCUNHO PARA REVISÃO). Gere prescrições precisas a partir da doença informada ou do medicamento solicitado.",
    "",
    "REGRA DE OURO (REMUME LOCAL): SÓ PRESCREVA MEDICAMENTOS E APRESENTAÇÕES QUE CONSTAM EXATAMENTE NA LISTA ABAIXO.",
    "=== LISTA DE MEDICAMENTOS DISPONÍVEIS NO MUNICÍPIO ===",
    listaMedicamentos,
    "=====================================================",
    "",
    "DIRETRIZES:",
    "1. Escolha a melhor opção clínica DENTRO da lista. Se nenhum item da lista atende com segurança, diga 'Sem alternativa adequada na REMUME' e indique a classe/fármaco ideal fora da lista como sugestão ao prescritor, sem montá-lo como receita.",
    "2. Pediatria: sem peso informado, NÃO calcule; peça o peso. Com peso, mostre sempre: dose em mg/kg/dia / número de tomadas = mg por dose = conversão exata em mL da apresentação da lista; verifique a dose máxima.",
    "3. Indique a quantidade total a dispensar, coerente com posologia e duração.",
    "4. CHECAGEM CRUZADA OBRIGATÓRIA de alergias (penicilina, sulfas, AINEs etc.), medicamentos de uso contínuo, gestação e função renal/hepática. Descarte fármacos com risco e justifique no rodapé. Dado ausente = 'Não informado', nunca 'sem alergias'.",
    "5. Formato copiável para o e-SUS.",
    "6. Não escreva que o medicamento está 'validado' ou 'em estoque': escreva apenas que o item consta na lista fornecida (conferir disponibilidade no estoque).",
    "",
    IA_SEGURANCA_MEDICAMENTOSA,
    "",
    "ESTRUTURA:",
    "\uD83D\uDC8A *PRESCRIÇÃO AMBULATORIAL - RASCUNHO (REMUME)*",
    "*Status:* [Completa para revisão / Dados pendentes: listar]",
    "",
    "\uD83D\uDCDD *Receituário*",
    "*[USO ORAL / TÓPICO / INALATÓRIO]*",
    "1. *Nome genérico (DCI)* - [concentração da lista] - [quantidade a dispensar]",
    "- *Posologia:* tomar [dose] por [via] de [X] em [X] horas por [Y] dias.",
    "",
    "\uD83D\uDCA1 *Orientações ao paciente*",
    "- [uso com/sem alimento, sinais de alerta, quando retornar]",
    "",
    "\uD83D\uDCCB *Conferência médica*",
    "- *Indicação:* [...]",
    "- *Cálculo (se pediátrico):* [mg/kg/dia / tomadas = mL por dose]",
    "- *Alergias e interações:* [conferido / pendente]",
    "- *Ajustes (renal, hepático, idade, gestação):* [...]",
    "- *REMUME:* item presente na lista fornecida (conferir disponibilidade no estoque)."
  ].join("\n");

  var dados = "DADOS DO PACIENTE / PEDIDO:\n" + dadosPrescricao;
  var resposta = _iaFinalizarTexto(executarRaciocinioClinico(promptSistema, dados, 1800));
  if (resposta && _iaCfgBool("IA_AUDITORIA_PRESCRICAO", true)) {
    resposta = _iaAuditarRascunho(resposta, dadosPrescricao, "prescricao");
  }
  return resposta;
}

function gerarPassagemPlantaoSBAR(dadosCaso) {
  var promptSistema = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO: PASSAGEM DE PLANTÃO (SBAR) para enfermaria, pronto para rounds, com checklist de pendências críticas.",
    "REGRAS:",
    "1. Telegráfico e direto; será lido durante o plantão.",
    "2. Dado não fornecido = 'Não informado'. NUNCA escreva 'Sem alergias conhecidas' ou 'estável' se o usuário não disse isso.",
    "3. Status atual (Estável / Em vigilância / Instável / Paliativo) apenas se houver base nos dados; senão 'Não informado'.",
    "4. Gatilhos de intercorrência são SUGESTÕES derivadas dos dados do caso, rotuladas como tal. Não invente dados.",
    "",
    "ESTRUTURA:",
    "\uD83C\uDFE5 *SBAR - PASSAGEM DE PLANTÃO*",
    "*Status:* [...] | *Risco do próximo plantão:* [...]",
    "",
    "\uD83D\uDCCD *S - Situação*",
    "- *Leito / paciente:* [leito, iniciais, idade, sexo]",
    "- *DIH:* [...]",
    "- *Diagnóstico principal:* [...]",
    "- *Status atual:* [...]",
    "",
    "\uD83D\uDCDC *B - Contexto*",
    "- *Admissão e evolução:* [2 linhas]",
    "- *Comorbidades:* [...]",
    "- *Alergias:* [relatadas ou 'Não informado']",
    "- *Dispositivos:* [CVC/CVP, SVD, SNE, TOT etc.]",
    "- *Limitação de suporte / isolamento:* [se informado]",
    "",
    "\uD83E\uDE7A *A - Avaliação por sistemas*",
    "- *Neuro:* [LOTE, Glasgow, delirium, sedação]",
    "- *Cardio / hemodinâmica:* [PA, FC, ritmo, vasopressor/inotrópico]",
    "- *Resp:* [FR, SpO2, suporte de O2]",
    "- *Gastro / nutrição:* [...]",
    "- *Renal / balanço:* [diurese, BH 24h, função renal]",
    "- *Infeccioso:* [foco, ATB e dia de tratamento, febre]",
    "- *Profilaxias:* [TVP e úlcera de estresse - prescritas?]",
    "- *Exames relevantes:* [...]",
    "",
    "\uD83D\uDEA8 *R - Recomendações e pendências*",
    "- *Pendências:* [exames, culturas, pareceres]",
    "- *Gatilhos (sugestão):* [se febre..., se queda de PA...]",
    "- *Planejamento:* [desmame, dieta, alta]"
  ].join("\n");
  return _iaFinalizarTexto(executarRaciocinioClinico(promptSistema, "DADOS DO CASO:\n" + dadosCaso, 2200));
}

function gerarPitchERoundComIA(dadosCaso) {
  var promptSistema = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO: PRECEPTORIA SOCRÁTICA PARA O ROUND. Objetivo: treinar raciocínio diagnóstico ativo, não entregar respostas prontas.",
    "REGRAS:",
    "- O pitch usa SOMENTE fatos informados; lacunas aparecem como 'Não informado'.",
    "- As perguntas testam decisão e raciocínio (hipótese, achado discriminante, limiar de intervenção), nunca pegadinhas ou humilhação.",
    "- NÃO forneça gabarito agora. Encerre pedindo que Wagner responda; o feedback vem depois, comparando a resposta com a evidência.",
    "- Se houver instabilidade no caso, a primeira linha é a prioridade de segurança e a sabatina fica em segundo plano.",
    "",
    "ESTRUTURA:",
    "\uD83C\uDFA4 *ROUND - PITCH E SABATINA*",
    "",
    "*1. Pitch sugerido (5 a 7 linhas, falado):*",
    "[problema principal, evolução nas últimas 24h, achados relevantes, plano de hoje]",
    "",
    "\uD83D\uDD0D *2. Ponto a conferir:*",
    "- [UMA lacuna laboratorial, semiológica ou medicamentosa pertinente, sem presumir que foi negligenciada]",
    "",
    "\uD83C\uDFAF *3. Defenda sua conduta:*",
    "1) [Pergunta de fisiopatologia/semiologia: qual achado discrimina a hipótese principal?]",
    "2) [Pergunta de farmacologia/decisão: por que esta escolha, dose e monitorização?]",
    "3) [Pergunta de alta/intercorrência: qual critério mudaria sua conduta?]",
    "",
    "Responda por mensagem; depois dou o feedback do raciocínio e, se pedir, o gabarito."
  ].join("\n");
  return _iaFinalizarTexto(executarRaciocinioClinico(promptSistema, "DADOS DO CASO:\n" + dadosCaso, 2500));
}

function processarCalculadoraClinicaComIA(dadosCalc) {
  var promptSistema = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO: CALCULADORA E ESTRATIFICAÇÃO DE RISCO. Interprete escores e cálculos do internato com concisão.",
    "REGRAS:",
    "1. Se o texto trouxer um resultado já calculado pelo motor do sistema, PRESERVE-o integralmente; apenas interprete.",
    "2. Se precisar calcular, mostre a soma item a item em texto simples. Se faltar variável, diga qual falta e NÃO estime.",
    "3. Escore não deve substituir julgamento clínico: cite a principal limitação.",
    "4. Use apenas hifens para tópicos.",
    "",
    "ESTRUTURA:",
    "\uD83D\uDCD0 *CALCULADORA CLÍNICA*",
    "*Resultado:* [escore e pontuação total] - [classificação de risco]",
    "",
    "- *Critérios pontuados:* [...]",
    "- *Interpretação:* [...]",
    "- *Conduta sugerida:* [direta, condicionada ao contexto]",
    "- *Limitação / dado pendente:* [...]"
  ].join("\n");
  return _iaFinalizarTexto(executarRaciocinioClinico(promptSistema, "DADOS CÁLCULO:\n" + dadosCalc, 1800));
}

var IA_STOP_INTERACAO = ["com", "uso", "dose", "para", "and", "mais", "entre", "interacao", "interacoes", "the", "que", "por", "mg", "dos", "das", "uma"];

function verificarInteracaoComIA(drogas) {
  var idInteracoes = ConfigService.get("SPREADSHEET_ID_INTERACOES");
  var baseInteracoes = "";
  var erroPlanilha = null;
  try {
    baseInteracoes = obterPlanilha("interacoes", idInteracoes, true);
  } catch (erro) {
    erroPlanilha = erro.message;
  }

  var drogasNorm = (typeof normalizarTexto === "function") ? normalizarTexto(drogas) : String(drogas || "").toLowerCase();
  var termos = drogasNorm.split(/\s+/).filter(function (t) {
    return t.length >= 3 && IA_STOP_INTERACAO.indexOf(t) < 0;
  });

  var originais = termos.length;
  if (typeof DICIONARIO_FARMACO !== "undefined") {
    for (var i = 0; i < originais; i++) {
      var sin = DICIONARIO_FARMACO[termos[i]];
      if (Array.isArray(sin)) { sin.forEach(function (s) { termos.push(s); }); }
      else if (sin) { termos.push(sin); }
    }
  }

  var registrosEncontrados = [];
  if (baseInteracoes) {
    var linhas = String(baseInteracoes).split("\n");
    for (var j = 0; j < linhas.length; j++) {
      var linhaNorm = (typeof normalizarTexto === "function") ? normalizarTexto(linhas[j]) : linhas[j].toLowerCase();
      var matchCount = 0;
      for (var k = 0; k < termos.length; k++) {
        if (linhaNorm.indexOf(termos[k]) !== -1) matchCount++;
      }
      if (matchCount > 0) registrosEncontrados.push(linhas[j]);
    }
  }

  var instrucaoBase = "";
  if (erroPlanilha) {
    instrucaoBase = "AVISO TÉCNICO: a planilha de interações retornou erro de acesso (" + erroPlanilha + "). Avalie pelo conhecimento clínico e escreva no campo Fonte: 'Conhecimento Geral (planilha local inacessível)'.";
  } else if (!baseInteracoes || String(baseInteracoes).trim().length === 0) {
    instrucaoBase = "AVISO TÉCNICO: a planilha de interações está vazia. Avalie pelo conhecimento clínico e escreva no campo Fonte: 'Conhecimento Geral (planilha local sem registros)'.";
  } else if (registrosEncontrados.length > 0) {
    instrucaoBase = "=== REGISTROS DA BASE LOCAL DE INTERAÇÕES (PLANILHA) ===\n" +
      registrosEncontrados.slice(0, 40).join("\n") + "\n=======================================================\n\n" +
      "REGRA: os termos foram localizados na base local. Use-a como referência primária e indique no campo Fonte: 'Base Local (Planilha Google Drive)'. " +
      "Se seu conhecimento clínico indicar risco MAIOR do que o registrado, ou uma interação relevante ausente, sinalize a divergência explicitamente.";
  } else {
    instrucaoBase = "=== BASE LOCAL DE INTERAÇÕES ===\n[Nenhum registro para '" + drogas + "']\n================================\n\n" +
      "REGRA: avalie pelo conhecimento clínico e indique no campo Fonte: 'Conhecimento Geral (medicamento não cadastrado na Base Local)'. " +
      "Ausência na base local NÃO significa ausência de interação.";
  }

  var promptSistema = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO: FARMACOLOGIA CLÍNICA - INTERAÇÕES MEDICAMENTOSAS, com rigor científico. Seja conservador na gravidade; em dúvida entre dois níveis, informe o maior e justifique.",
    "",
    instrucaoBase, "",
    "LÓGICA:",
    "- Mais de um medicamento (A e B): avalie a interação entre eles. Inclua efeito clínico, fatores de risco (renal, idade, QT, serotoninérgico, sangramento) e monitorização.",
    "- Um único medicamento: liste as principais interações, priorizando graves/contraindicadas.",
    "",
    "ESTRUTURA (2 ou mais drogas):",
    "\uD83D\uDD2C *INTERAÇÃO MEDICAMENTOSA*",
    "*Grau de risco:* [Nenhum / Menor / Moderado / Grave / Contraindicado]",
    "- *Mecanismo:* [...]",
    "- *Conduta:* [evitar / ajustar / monitorizar o que e quando]",
    "- *Fonte:* [Base Local (Planilha Google Drive) OU Conhecimento Geral (medicamento não cadastrado na Base Local)]",
    "",
    "ESTRUTURA (1 droga):",
    "\uD83D\uDD2C *PRINCIPAIS INTERAÇÕES: [DROGA]*",
    "\u26D4 *Contraindicadas / graves:*",
    "- [Droga X]: [mecanismo resumido]",
    "\u26A0\uFE0F *Moderadas:*",
    "- [Droga Y]: [mecanismo resumido]",
    "- *Fonte:* [Base Local (Planilha Google Drive) OU Conhecimento Geral (medicamento não cadastrado na Base Local)]"
  ].join("\n");
  return _iaFinalizarTexto(executarRaciocinioClinico(promptSistema, "Drogas informadas: " + drogas, 1500));
}

function gerarAnaliseGasometriaComIA(dadosGaso) {
  var texto = String(dadosGaso || "").trim();
  var partesAmostra = texto.split(/(?:atualiza[çc][ãa]o|nova\s+amostra|amostra\s*\d*):?/i);
  var textoAmostra = (partesAmostra.length > 1 ? partesAmostra[partesAmostra.length - 1] : texto).trim();
  function num(re) {
    var m = textoAmostra.match(re);
    return m ? String(m[1]).replace(",", ".") : null;
  }
  var ph = num(/\bph\s*[:=]?\s*([67][.,]?\d+)/i);
  var pco2 = num(/\bp?a?co2\s*[:=]?\s*(\d+[.,]?\d*)/i);
  var hco3 = num(/\bhco3\s*[:=]?\s*(\d+[.,]?\d*)/i) || num(/bicarb[^\d]*(\d+[.,]?\d*)/i);
  var na = num(/\bna\b\s*[:=]?\s*(\d+[.,]?\d*)/i) || num(/s[oó]dio\s*[:=]?\s*(\d+[.,]?\d*)/i);
  var cl = num(/\bcl\b\s*[:=]?\s*(\d+[.,]?\d*)/i) || num(/cloro\s*[:=]?\s*(\d+[.,]?\d*)/i);
  var alb = num(/\balb\b\s*[:=]?\s*(\d+[.,]?\d*)/i) || num(/albumina\s*[:=]?\s*(\d+[.,]?\d*)/i);
  var pao2 = num(/\bpao2\s*[:=]?\s*(\d+[.,]?\d*)/i);
  var fio2 = num(/\bfio2\s*[:=]?\s*(\d+[.,]?\d*)/i);

  if (!ph || !pco2 || !hco3) {
    return "⚠️ *Gasometria Incompleta:* Para análise ácido-base, informe obrigatoriamente pH, pCO2 e HCO3 da mesma amostra (ex.: /gaso pH 7.25, pCO2 28, HCO3 11).";
  }

  var resCalc = null;
  if (typeof CalculadorasClinicas !== "undefined") {
    try {
      resCalc = CalculadorasClinicas.gasometria(ph, pco2, hco3, na, cl, alb, pao2, fio2);
      if (resCalc && !resCalc.ok) {
        return "⚠️ *Gasometria Inconsistente ou Inválida:*\n" + (resCalc.erro || "Valores fisiologicamente incompatíveis.");
      }
    } catch (e) {
      Logger.log("Motor de gasometria falhou: " + e.message);
      return "⚠️ *Falha no Processamento da Gasometria:* Não foi possível validar os parâmetros matemáticos da amostra. Por favor, verifique os valores informados.";
    }
  }

  var dadosMatematicos = "";
  if (resCalc && resCalc.ok) {
    dadosMatematicos =
      "=== RESULTADOS DETERMINÍSTICOS DO MOTOR MATEMÁTICO (NÃO ALTERE ESTES VALORES) ===\n" +
      "- pH: " + resCalc.ph + " | pCO2: " + resCalc.pco2 + " mmHg | HCO3: " + resCalc.hco3 + " mEq/L\n" +
      "- Distúrbio primário: " + resCalc.disturbio + "\n" +
      (resCalc.compensacao ? "- " + resCalc.compensacao + "\n" : "") +
      (resCalc.avaliacaoCompensacao ? "- Avaliação da compensação: " + resCalc.avaliacaoCompensacao + "\n" : "") +
      ((resCalc.anionGap !== null && resCalc.anionGap !== undefined) ? "- Ânion gap sérico: " + resCalc.anionGap + " mEq/L (corrigido pela albumina: " + resCalc.anionGapCorrigido + " mEq/L)\n" : "") +
      (resCalc.interpretacaoAG ? "- Ânion gap e delta-delta: " + resCalc.interpretacaoAG + "\n" : "") +
      ((resCalc.pfRatio !== null && resCalc.pfRatio !== undefined) ? "- Relação PaO2/FiO2: " + resCalc.pfRatio + " (" + resCalc.classificacaoPF + ")\n" : "") +
      "=================================================================================\n\n";
  }

  var promptSistema = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO: TERAPIA INTENSIVA - INTERPRETAÇÃO E CONDUTA GASOMÉTRICA.",
    "REGRAS:",
    "1. PRESERVE estritamente os cálculos determinísticos fornecidos.",
    "2. Não recalcule nem altere valores numéricos de pH, pCO2, HCO3 ou ânion gap.",
    "3. Forneça apenas a análise de hipóteses etiológicas e plano de conduta.",
    "",
    "ESTRUTURA:",
    "🔍 *Hipóteses Etiológicas Prováveis:*",
    "- [3 principais causas clínicas no contexto]",
    "",
    "💡 *Conduta Imediata Sugerida:*",
    "- [ajustes ventilatórios, reposição volêmica, tratamento da causa base]",
    "- *Reavaliação:* [momento e parâmetros a monitorar]"
  ].join("\n");

  var analiseIA = _iaFinalizarTexto(executarRaciocinioClinico(promptSistema, dadosMatematicos + "DADOS INFORMADOS PELO USUÁRIO:\n" + textoAmostra, 1500));

  // Higieniza cálculos espúrios e contraditórios de pH, pCO2, ânion gap e bicarbonato para preservar a autoridade do motor matemático
  if (analiseIA) {
    analiseIA = analiseIA.replace(/\bph\s*[:=]?\s*[67][.,]?\d+/gi, function() {
      return "pH conforme amostra (" + ph + ")";
    });
    analiseIA = analiseIA.replace(/\bp?a?co2\s*[:=]?\s*\d+[.,]?\d*/gi, function() {
      return "pCO2 conforme amostra (" + pco2 + " mmHg)";
    });
    analiseIA = analiseIA.replace(/(?:[aâ]nion\s+gap|\bag\b|gap)\s*[:=]?\s*\d+[.,]?\d*/gi, function() {
      var agTxt = (resCalc && resCalc.anionGap !== null && resCalc.anionGap !== undefined)
        ? "Ânion gap (" + resCalc.anionGap + " mEq/L)"
        : "Ânion gap conforme cálculo determinístico";
      return agTxt;
    });
    analiseIA = analiseIA.replace(/(?:hco3|bicarbonato)\s*[:=]?\s*\d+[.,]?\d*/gi, function() {
      return "HCO3 conforme amostra (" + hco3 + " mEq/L)";
    });
  }

  var resumoAmostra = "🧪 *Valores brutos da amostra:* pH " + ph + " · pCO2 " + pco2 + " · HCO3 " + hco3;
  var laudoDeterministico = (resCalc && resCalc.textoFormatado) ? (resCalc.textoFormatado + "\n\n" + resumoAmostra) : dadosMatematicos;
  return laudoDeterministico + "\n\n" + analiseIA;
}

function gerarCondutaEmergenciaComIA(dadosEmergencia) {
  var protocoloLocal = (typeof obterProtocoloClinico !== "undefined") ? obterProtocoloClinico(dadosEmergencia) : null;
  var contextoProtocolo = "";
  if (protocoloLocal) {
    contextoProtocolo = "\n\nPROTOCOLO OFICIAL DE REFERÊNCIA (DIRETRIZ BRASILEIRA):\n" +
      "Patologia: " + protocoloLocal.titulo + "\n" +
      "Diretriz Brasileira: " + protocoloLocal.diretriz_brasileira + "\n" +
      "Diretriz Internacional: " + protocoloLocal.diretriz_internacional + "\n" +
      "Conduta Padronizada: " + protocoloLocal.conduta_imediata + "\n" +
      "Divergência Notável: " + protocoloLocal.divergencia + "\n\n";
  }

  var promptSistema = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO: EMERGÊNCIA (SALA VERMELHA). Resposta telegráfica, operacional e ultra-precisa. Sem introdução, sem sabatina, sem perguntas didáticas.",
    "REGRAS:",
    "1. A AÇÃO PRIORITÁRIA é a primeira linha. Em dado crítico ausente (como peso), declare a pendência explicitamente antes de calcular doses absolutas.",
    "2. Sequência cronológica numerada (Passo 1, 2, 3). Cada medicamento em UMA linha com fármaco, dose + unidade, via, preparo (diluente e concentração final) e velocidade/tempo, mais a condição de segurança da própria droga.",
    "3. Inclua gatilhos para via aérea avançada, procedimentos invasivos e escalonamento (UTI, cirurgia, equipe de emergência). Se a decisão exceder a competência de um interno, ordene o acionamento do preceptor/equipe.",
    "4. Diga o que reavaliar, quando e qual resposta esperada.",
    "5. Se houver dúvida sobre a gravidade, trate como grave até prova em contrário.",
    "",
    IA_DIRETRIZES_EMERGENCIA, "",
    IA_SEGURANCA_MEDICAMENTOSA, "",
    "ESTRUTURA:",
    "\uD83D\uDEA8 *EMERGÊNCIA - [síndrome]*",
    "*Prioridade:* [ação imediata + motivo essencial]",
    "",
    "\u26A1 *Agora (minuto 0 a 5)*",
    "1. [ação]",
    "2. [ação]",
    "3. [ação]",
    "",
    "\uD83D\uDC8A *Medicação*",
    "- *[Fármaco] [dose + unidade]* [via], [intervalo]. Preparo: [diluente, concentração final]. Infusão: [velocidade/tempo]. Segurança: [limite, ajuste, contraindicação].",
    "",
    "\uD83C\uDFAF *Se refratário / próximos passos*",
    "- [...]",
    "",
    "\uD83D\uDD04 *Reavaliar*",
    "- [parâmetro + momento + resposta esperada]; se [critério], [escalonar].",
    "",
    "\u26A0\uFE0F [dado crítico pendente ou restrição que condiciona a conduta]",
    "\uD83D\uDCDA *Referência:* [diretriz, sociedade e ano - ou 'conferir versão vigente']",
    "_Sugestão gerada por IA. Conferir dose, diluição e diretriz; a responsabilidade da prescrição é do prescritor._"
  ].join("\n");

  var promptUsuario = contextoProtocolo + "EMERGÊNCIA APRESENTADA:\n" + dadosEmergencia;
  var resposta = null;

  if (_iaCfgBool("IA_GROUNDING_EMERGENCIA", false)) {
    resposta = chamarGeminiPoolComGrounding(promptSistema, promptUsuario, 2500);
  }
  if (!resposta) resposta = executarRaciocinioClinico(promptSistema, promptUsuario, 2500);
  resposta = _iaFinalizarTexto(resposta);

  if (resposta && _iaCfgBool("IA_AUDITORIA_EMERGENCIA", false)) {
    resposta = _iaAuditarRascunho(resposta, dadosEmergencia, "emergencia");
  }
  return resposta;
}

// ==============================================================================
// CLASSIFICADOR DE INTENÇÃO (FAST ROUTER) - sensibilidade máxima para emergência
// ==============================================================================

function _iaNormalizarParaRegex(texto) {
  var t = String(texto || "").toLowerCase();
  try { t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) { /* mantém */ }
  return t;
}

var IA_RE_EMERGENCIA_FORTE = new RegExp(
  "dor\\s+(tor[áa]cica|precordial|no\\s+peito|retroesternal)|\\bchoque\\b|\\bsepse\\b|\\bsepsis\\b|septic|rebaixamento|rebaixad|" +
  "glasgow\\s*(de\\s*)?[3-8]\\b|\\bconvuls|crise\\s+convulsiva|status\\s+epilep|anafila|\\biam\\b|infarto|supra\\s*(de\\s*)?st|" +
  "\\bavc\\b|acidente\\s+vascular|edema\\s+agudo|\\btep\\b|embolia\\s+pulmonar|pneumot[óo]rax|tamponamento|hipotens|\\bdva\\b|" +
  "vasopressor|noradrenalina|adrenalina|dobutamina|vasopressina|\\bsri\\b|intubacao|intubar|\\biot\\b|" +
  "parada\\s+(cardio|respirat)|ressuscit|\\brcp\\b|desfibril|assistolia|fibrilacao\\s+ventricular|taquicardia\\s+ventricular|" +
  "sangramento\\s+(maci|ativo|volumoso)|hemorragia|hematemese|intoxicacao|overdose|hipoglicemia\\s+grave|cetoacidose|" +
  "dessatur|sat(uracao)?\\s*(de|em)?\\s*[<=]?\\s*[5-8]\\d\\s*%?|spo2\\s*[<=]?\\s*[5-8]\\d|\\bpa\\s*(de\\s*)?[<]?\\s*[5-8]\\d\\s*[x\\/]"
);

function _iaEhEmergencia(t) {
  var tn = _iaNormalizarParaRegex(t);
  var estudo = /\b(explica|o\s+que\s+[ée]|fisiopatologia|resumo|revis[ãa]o|diretriz|estudar|flashcard|prova|resid[êe]ncia|quest[ãa]o|quest[õo]es|aula|slides?)\b/.test(tn);
  var buscaEvidencia = /(?:evid[êe]ncia|pubmed|artigos?|estudos?|meta-an[áa]lise|ensaios?\s+cl[íi]nicos?)/i.test(tn);
  var paciente = /\b(paciente|pcte|leito|chegou|chega|plant[ãa]o|na\s+sala|ps\b|uti\b|box)\b|\bpa\s*\d|\bfc\s*\d|\bsat\b/.test(tn);

  if ((estudo || buscaEvidencia) && !paciente) return false;
  if (IA_RE_EMERGENCIA_FORTE.test(tn)) return true;

  if (/\bnora\b/.test(tn) && /(mcg|ml\s*\/?\s*h|dose|dva|desmam|aument|reduz|titul|pam\b|map\b|paciente)/.test(tn)) return true;
  if (/\bpcr\b/.test(tn)) {
    var naoParada = /(prote[ií]na|reativa|dosagem|exame|rt-?pcr|covid|dna|resultado|coletar|solicitar)/.test(tn);
    var parada = /(parada|ritmo|rcp|choque|reanima|adrenalina|desfibril|assistolia|\bfv\b|\btv\b|massagem)/.test(tn);
    if (parada || !naoParada) return true;
  }
  if (/\bdobuta\b/.test(tn)) return true;
  return false;
}

function classificarIntencaoMensagem(textoMensagem) {
  var texto = (textoMensagem || "").trim();
  if (!texto) return { intencao: "CONVERSA", dados: "" };

  var t = texto.toLowerCase();
  var tn = _iaNormalizarParaRegex(texto);

  // 1) Solicitação explícita de áudio ou preceptor socrático
  if (/(?:me\s+)?respond(?:a|e)\s+(?:com\s+|em\s+)?(?:um\s+)?[aá]udio|no\s+fone|fala\s+comigo|preceptor\s+socr[aá]tico|sabatina|manda\s+[aá]udio/i.test(t)) {
    return { intencao: "PRECEPTOR_VOZ", confianca: 0.99 };
  }

  // 2) SEGURANÇA PRIMEIRO: bandeiras vermelhas de emergência antes de qualquer outra regra
  if (_iaEhEmergencia(texto)) {
    return { intencao: "CLINICO_EMERGENCIA", confianca: 0.98, resumo: "bandeira vermelha (pré-filtro)" };
  }

  if (t.indexOf("marcar") !== -1 || t.indexOf("agendar") !== -1 || (t.indexOf("compromisso") !== -1 && t.indexOf("agenda") !== -1)) {
    return { intencao: "CALENDAR_CRIAR", confianca: 0.9 };
  }
  if (t.indexOf("o que eu tenho") !== -1 || t.indexOf("minha agenda") !== -1 || t.indexOf("compromissos de") !== -1 || t.indexOf("agenda de hoje") !== -1) {
    return { intencao: "CALENDAR_CONSULTAR", confianca: 0.9 };
  }
  if (t.indexOf("treinei") !== -1 || t.indexOf("academia") !== -1 || (t.indexOf("medquest") !== -1 && t.indexOf("fiz") !== -1)) {
    return { intencao: "HABITO_PROATIVO", confianca: 0.9 };
  }
  var culinaria = /(bolo|culinar|comida|jantar|almo[çc]o|janta|frango|prato|ingrediente|air\s*fryer|marmita|molho|torta|massa\s+de)/.test(tn);
  if (/(?:prescrev|passar\s+receita|medicamento\s+para|rem[eé]dio\s+para)/.test(tn) || (/\breceita\b/.test(tn) && !culinaria)) {
    return { intencao: "CLINICO_RX", confianca: 0.9 };
  }
  if (t.indexOf("ph") !== -1 && (t.indexOf("pco2") !== -1 || t.indexOf("hco3") !== -1)) {
    return { intencao: "CLINICO_GASO", confianca: 0.95 };
  }
  if (t.indexOf("dúvida") !== -1 || t.indexOf("duvida") !== -1 && t.indexOf("medquest") !== -1) {
    return { intencao: "NOTION_DUVIDA", confianca: 0.85 };
  }
  if (/(?:evid[êe]ncia|pubmed|artigos?\s+(?:sobre|de)|estudos?\s+(?:sobre|de)|meta-an[áa]lise|ensaios?\s+cl[íi]nicos?)/i.test(t)) {
    return { intencao: "EVIDENCIA_MEDICA", confianca: 0.95 };
  }
  if (t.indexOf("leito") !== -1 && (t.indexOf("enfermaria") !== -1 || t.indexOf("evolu") !== -1)) {
    return { intencao: "ENFERMARIA", confianca: 0.85 };
  }
  if (/(?:paciente\s+\d+|paciente\s+com|anos,\s+(?:masculino|feminino|queixa)|chega\s+ao\s+pronto)/i.test(t)) {
    return { intencao: "CLINICO_SOAP", confianca: 0.85 };
  }

  // 3) Classificador por LLM
  var promptSistema = [
    "Você é um classificador de intenções ultrarrápido para um assistente médico pessoal.",
    "Retorne EXCLUSIVAMENTE um JSON: {\"intencao\": \"CATEGORIA\", \"confianca\": 0.95, \"resumo\": \"motivo curto\"}",
    "",
    "REGRA DE SEGURANÇA ABSOLUTA: se houver QUALQUER dúvida entre uma categoria de rotina e CLINICO_EMERGENCIA, escolha CLINICO_EMERGENCIA. Falso-positivo é aceitável; falso-negativo é inaceitável.",
    "",
    "Categorias válidas:",
    "- CLINICO_EMERGENCIA: parada, PCR, choque, sepse, dor torácica, SCA/IAM, AVC agudo, rebaixamento de consciência, convulsão, hipotensão, dessaturação, sangramento grave, anafilaxia, intoxicação, intubação/IOT/SRI, DVA/noradrenalina, dose de ataque, sala vermelha, pneumotórax.",
    "- PRECEPTOR_VOZ: pedidos de resposta em áudio, preceptor socrático, fone de ouvido, mensagem falada.",
    "- EVIDENCIA_MEDICA: busca de artigos, evidência, ensaios clínicos, PubMed.",
    "- CLINICO_SOAP: relato de caso, anamnese, história clínica, exame físico (sem instabilidade).",
    "- CLINICO_RX: pedido de prescrição médica, receita médica, remédio para sintomas ou patologia.",
    "- CLINICO_GASO: valores gasométricos (pH, pCO2, HCO3, Na, Cl).",
    "- ENFERMARIA: evolução ou passagem de plantão de paciente internado em leito de enfermaria.",
    "- CALENDAR_CRIAR: marcar compromisso, plantão, consulta na agenda.",
    "- CALENDAR_CONSULTAR: perguntas sobre agenda/compromissos.",
    "- NOTION_TASK: tarefas ou lembretes executivos.",
    "- NOTION_DUVIDA: registrar dúvida de estudo (ex: MedQuest) no Notion.",
    "- HABITO_PROATIVO: hábito cumprido (academia, MedQuest, inglês).",
    "- CONVERSA: dúvidas clínicas gerais, estudo, discussão médica ou conversa natural (sem paciente instável)."
  ].join("\n");

  var resposta = _iaExecutar(promptSistema, texto, 250, { json: true });
  var parsed = _iaExtrairJSON(resposta);
  if (parsed && parsed.intencao) {
    var cat = String(parsed.intencao).toUpperCase().trim();
    if (IA_INTENCOES_VALIDAS.indexOf(cat) >= 0) {
      parsed.intencao = cat;
      return parsed;
    }
    Logger.log("Classificador retornou categoria inválida: " + parsed.intencao);
  } else if (resposta) {
    Logger.log("Erro no parsing do classificador de intenção");
  }
  return { intencao: "CONVERSA", confianca: 0.7 };
}

// ==============================================================================
// CONVERSA CLÍNICA, VOZ E CALENDÁRIO
// ==============================================================================

function gerarRespostaConversaClinica(textoMensagem, contextoAnterior) {
  var protocoloLocal = (typeof obterProtocoloClinico !== "undefined") ? obterProtocoloClinico(textoMensagem) : null;
  var contextoProtocolo = "";
  if (protocoloLocal) {
    contextoProtocolo = "\n\nPROTOCOLO OFICIAL DE REFERÊNCIA (DIRETRIZ BRASILEIRA):\n" +
      "Patologia: " + protocoloLocal.titulo + "\n" +
      "Diretriz Brasileira: " + protocoloLocal.diretriz_brasileira + "\n" +
      "Diretriz Internacional: " + protocoloLocal.diretriz_internacional + "\n" +
      "Conduta Padronizada: " + protocoloLocal.conduta_imediata + "\n" +
      "Divergência Notável: " + protocoloLocal.divergencia + "\n\n";
  }

  var promptSistema = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO ADAPTATIVO - escolha o modo conforme a mensagem:",
    "1. EMERGÊNCIA: se descrever paciente instável ou risco de vida, aplique o modo emergência (ação prioritária na primeira linha, medicação com dose, via, preparo e velocidade, reavaliação, sem perguntas didáticas) e siga a checagem de segurança abaixo.",
    "2. DISCUSSÃO CLÍNICA: hipótese principal, achados que a sustentam, o que não pode ser perdido, próxima decisão e o dado pendente que mudaria a conduta. Tom de preceptor: firme, técnico, acolhedor.",
    "3. PRECEPTORIA: se Wagner pedir para treinar, ou se o HISTÓRICO mostrar perguntas de preceptoria aguardando resposta, avalie a resposta dele: o que está correto, o que precisa de ajuste e por que, e aplique ao caso. Só entregue gabarito completo se ele pedir. Uma pergunta por vez.",
    "4. ROTINA / VIDA PESSOAL / ESTUDO: assertivo, executivo e proativo; resultado e próximo passo primeiro. Conversa simples dispensa estrutura.",
    "",
    "EMBASAMENTO:",
    "- Priorize diretrizes brasileiras oficiais (SBC, SBPT, SBD, ILAS, AMIB, Conitec/PCDT, CFM, AMB). Diretrizes internacionais (AHA/ACC, ESC, SSC, GOLD, GINA) só quando mudarem a conduta.",
    "- Cite sociedade e ano apenas quando tiver certeza; senão diga 'conferir versão vigente'. Se não tiver base sólida, diga que não sabe.",
    "- Para ensaios clínicos e artigos, oriente: /evidencia <tema>.",
    "",
    IA_DIRETRIZES_EMERGENCIA, "",
    IA_SEGURANCA_MEDICAMENTOSA
  ].join("\n");

  var promptUsuario = contextoProtocolo + textoMensagem;
  if (contextoAnterior) {
    promptUsuario = "HISTÓRICO RECENTE DA CONVERSA:\n" + contextoAnterior + "\n\nNOVA MENSAGEM DE WAGNER:\n" + contextoProtocolo + textoMensagem;
  }
  return _iaFinalizarTexto(executarRaciocinioClinico(promptSistema, promptUsuario, 1800));
}

/**
 * Fala curta para áudio (TTS). Retorna texto limpo, sem markdown.
 */
function gerarProvocacaoPreceptorAudio(casoOuDuvida) {
  var promptSistema = [
    "Você é um preceptor experiente de clínica médica e emergência falando no fone de ouvido de Wagner durante o plantão.",
    "Gere uma fala concisa, firme e instigante, de 30 a 50 palavras, para ser lida em voz alta.",
    "REGRAS:",
    "1. Texto corrido, SEM tópicos, SEM markdown, SEM asteriscos, SEM emojis, SEM URLs.",
    "2. Emergência (ex: pneumotórax, choque, PCR): diga PRIMEIRO a ação prioritária imediata; só depois, uma pergunta curta de checagem.",
    "3. Caso clínico: aponte o achado semiológico discriminante ou o critério de gravidade mais crítico e termine com UMA pergunta de raciocínio.",
    "4. Nunca invente dados do paciente. Não use LaTeX. Termine sempre com frase completa.",
    "5. Você não é o médico responsável: em risco de vida, reforce acionar a equipe/preceptor."
  ].join("\n");
  var r = executarRaciocinioClinico(promptSistema, casoOuDuvida, 250);
  return r ? _iaTextoFalado(r) : r;
}

function extrairDadosEventoCalendario(textoMensagem, agoraDataRef) {
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
  var ref = agoraDataRef || new Date();
  var dataRefISO = Utilities.formatDate(ref, tz, "yyyy-MM-dd");
  var horaRefStr = Utilities.formatDate(ref, tz, "HH:mm");
  var diaSemana = obterDiaSemanaExtenso(ref);

  var promptSistema = [
    "Você é um extrator de compromissos para o Google Calendar.",
    "Data e hora de referência: " + dataRefISO + " (" + diaSemana + ") às " + horaRefStr + " (fuso: " + tz + ").",
    "",
    "Retorne EXCLUSIVAMENTE um JSON, sem texto extra:",
    "{",
    "  \"titulo\": \"Nome do Evento\",",
    "  \"dataInicio\": \"YYYY-MM-DDTHH:mm:ss\",",
    "  \"dataFim\": \"YYYY-MM-DDTHH:mm:ss\",",
    "  \"local\": \"Local ou vazio\",",
    "  \"descricao\": \"Observações relevantes\"",
    "}",
    "",
    "Regras:",
    "1. Interprete 'amanhã', 'depois de amanhã', dias da semana e datas explícitas a partir da referência.",
    "2. Sem hora de término, assuma 1 hora após o início.",
    "3. Plantão (ex: 'plantão de 12h das 07h às 19h'): duração exata informada; se terminar no dia seguinte, ajuste a data de fim.",
    "4. Datas em ISO 8601 local, sem sufixo Z.",
    "5. Se não houver data ou hora identificável, use null em dataInicio e dataFim. Nunca invente."
  ].join("\n");

  var resposta = _iaExecutar(promptSistema, "PEDIDO:\n" + textoMensagem, 600, { json: true });
  var obj = _iaExtrairJSON(resposta);
  if (!obj) {
    if (resposta) Logger.log("Erro no parsing do extrator de evento");
    return null;
  }
  var reISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
  if (!obj.dataInicio || !reISO.test(String(obj.dataInicio))) {
    Logger.log("Extrator de evento: dataInicio inválida");
    return null;
  }
  if (!obj.dataFim || !reISO.test(String(obj.dataFim))) {
    var d = new Date(String(obj.dataInicio).replace("T", " ").replace(/-/g, "/"));
    d.setHours(d.getHours() + 1);
    obj.dataFim = Utilities.formatDate(d, tz, "yyyy-MM-dd'T'HH:mm:ss");
  }
  return obj;
}

function gerarCriticaSocraticaPreceptor(casoOuLeitoTexto) {
  var promptSistema = [
    "Você é um preceptor experiente de clínica médica fazendo uma sabatina à beira do leito com um interno.",
    "Com base no caso informado, formule UMA ÚNICA pergunta clinicamente discriminante que teste raciocínio diagnóstico ou decisão de conduta em situação de risco. A pergunta deve exigir que o interno justifique a decisão, sem pegadinha e sem depender de detalhe não informado.",
    "REGRAS:",
    "1. Uma ou duas frases completas, terminando em interrogação (?).",
    "2. Sem introdução, saudação, gabarito ou rodeios. Comece direto na pergunta.",
    "3. Não invente dados do paciente. Não use LaTeX nem markdown. Português do Brasil natural.",
    "4. Se o caso descrever instabilidade, a pergunta deve focar a prioridade imediata de segurança."
  ].join("\n");
  var res = executarRaciocinioClinico(promptSistema, "CASO CLÍNICO:\n" + casoOuLeitoTexto, 400);
  if (res) {
    var limpo = _iaTextoFalado(res);
    if (/\?\s*$/.test(limpo)) return limpo;
    Logger.log("Crítica socrática incompleta; usando pergunta padrão");
  }
  return "Wagner, qual o principal risco de descompensação aguda desse paciente nas próximas duas horas e qual a sua conduta imediata?";
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    executarRaciocinioClinico: executarRaciocinioClinico,
    chamarGroqAPI: chamarGroqAPI,
    chamarOpenRouterAPI: chamarOpenRouterAPI,
    chamarZaiAPI: chamarZaiAPI,
    chamarGeminiPool: chamarGeminiPool,
    chamarGeminiPoolComGrounding: chamarGeminiPoolComGrounding,
    chamarGeminiPoolMultimodal: chamarGeminiPoolMultimodal,
    gerarSOAPComIA: gerarSOAPComIA,
    gerarPrescricaoComIA: gerarPrescricaoComIA,
    gerarPassagemPlantaoSBAR: gerarPassagemPlantaoSBAR,
    gerarPitchERoundComIA: gerarPitchERoundComIA,
    processarCalculadoraClinicaComIA: processarCalculadoraClinicaComIA,
    verificarInteracaoComIA: verificarInteracaoComIA,
    gerarAnaliseGasometriaComIA: gerarAnaliseGasometriaComIA,
    gerarCondutaEmergenciaComIA: gerarCondutaEmergenciaComIA,
    classificarIntencaoMensagem: classificarIntencaoMensagem,
    gerarRespostaConversaClinica: gerarRespostaConversaClinica,
    gerarProvocacaoPreceptorAudio: gerarProvocacaoPreceptorAudio,
    extrairDadosEventoCalendario: extrairDadosEventoCalendario,
    gerarCriticaSocraticaPreceptor: gerarCriticaSocraticaPreceptor
  };
}


// ==============================================================================
// ARQUIVO FONTE: 05_notion.js
// ==============================================================================

/**
 * ==============================================================================
 * MÓDULO 05: INTEGRAÇÃO NOTION (Habit Log & Tasks DB com Blocos Ricos)
 * ==============================================================================
 */

function chamarNotionAPI(url, metodo, dados) {
  var token = ConfigService.get("NOTION_TOKEN");
  if (!token) {
    Logger.log("Aviso: NOTION_TOKEN não configurado.");
    return null;
  }

  var options = {
    "method": metodo.toLowerCase(),
    "headers": {
      "Authorization": "Bearer " + token,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json"
    },
    "muteHttpExceptions": true
  };
  if (dados) {
    options.payload = JSON.stringify(dados);
  }

  for (var tentativa = 0; tentativa < 2; tentativa++) {
    try {
      var res = UrlFetchApp.fetch(url, options);
      var code = res.getResponseCode();
      if (code < 300) {
        return JSON.parse(res.getContentText());
      }
      if (code === 429) {
        Utilities.sleep(1500);
      } else {
        Logger.log("Notion erro HTTP " + code);
        return null;
      }
    } catch (e) {
      Logger.log("Falha de comunicação com o Notion; resultado incerto.");
      return null;
    }
  }
  return null;
}

function obterOuCriarPaginaHabitLog(dataISO) {
  var dbId = ConfigService.get("NOTION_HABIT_LOG_DB_ID");
  if (!dbId) return null;

  var res = chamarNotionAPI("https://api.notion.com/v1/databases/" + dbId + "/query", "POST", {
    "filter": { "property": "Date", "date": { "equals": dataISO } }
  });

  if (!res || !res.results) {
    Logger.log("Erro ao consultar página do Habit Log no Notion.");
    return null;
  }

  if (res.results.length > 0) {
    return res.results[0].id;
  }

  var diaNome = obterDiaSemanaExtenso(new Date());
  var ptitulo = diaNome + " (" + dataISO.slice(8, 10) + "/" + dataISO.slice(5, 7) + ")";
  var nova = chamarNotionAPI("https://api.notion.com/v1/pages", "POST", {
    "parent": { "database_id": dbId },
    "properties": {
      "Day": { "title": [{ "text": { "content": ptitulo } }] },
      "Date": { "date": { "start": dataISO } }
    }
  });

  return nova ? nova.id : null;
}

function atualizarCheckboxNotion(pageId, propName, valor) {
  var props = {};
  props[propName] = { "checkbox": valor };
  return chamarNotionAPI("https://api.notion.com/v1/pages/" + pageId, "PATCH", { "properties": props });
}

function atualizarNumeroNotion(pageId, propName, valor) {
  var props = {};
  props[propName] = { "number": valor };
  return chamarNotionAPI("https://api.notion.com/v1/pages/" + pageId, "PATCH", { "properties": props });
}

function enviarRelatorioSemanalHabitos(chatIdDestino) {
  var destino = chatIdDestino || ConfigService.get("TELEGRAM_CHAT_ID");
  var dbId = ConfigService.get("NOTION_HABIT_LOG_DB_ID");
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");

  var dataISO = Utilities.formatDate(new Date(new Date().getTime() - 7 * 86400000), tz, "yyyy-MM-dd");
  var payload = {
    "filter": { "property": "Date", "date": { "on_or_after": dataISO } },
    "sorts": [{ "property": "Date", "direction": "ascending" }]
  };

  var res = chamarNotionAPI("https://api.notion.com/v1/databases/" + dbId + "/query", "POST", payload);
  if (!res || !res.results) {
    return enviarMensagemParaChat(destino, "⚠️ Erro ao consultar o Notion Habit Log.");
  }

  var cMQ = 0, cGym = 0, cEng = 0, cVio = 0, cLov = 0, cRead = 0, sEn = 0, kEn = 0;
  for (var i = 0; i < res.results.length; i++) {
    var p = res.results[i].properties;
    if (p["🧠 MedQuest"] && p["🧠 MedQuest"].checkbox) cMQ++;
    if (p["🏋️ Academia"] && p["🏋️ Academia"].checkbox) cGym++;
    if (p["📚 Inglês"] && p["📚 Inglês"].checkbox) cEng++;
    if (p["🎸 Violão"] && p["🎸 Violão"].checkbox) cVio++;
    if (p["❤️ Namorada"] && p["❤️ Namorada"].checkbox) cLov++;
    if (p["📖 Leitura"] && p["📖 Leitura"].checkbox) cRead++;
    if (p["⚡ Energia (1–5)"] && p["⚡ Energia (1–5)"].number) {
      sEn += p["⚡ Energia (1–5)"].number;
      kEn++;
    }
  }

  var media = kEn > 0 ? (sEn / kEn).toFixed(1) : "N/A";
  var msg = "📊 *FECHAMENTO SEMANAL DE HÁBITOS*\n\n" +
            "🧠 MedQuest: " + cMQ + " dias\n" +
            "🏋️ Academia: " + cGym + " dias\n" +
            "📚 Inglês: " + cEng + " dias\n" +
            "🎸 Violão: " + cVio + " dias\n" +
            "❤️ Namorada: " + cLov + " dias\n" +
            "📖 Leitura: " + cRead + " dias\n" +
            "⚡ Energia Média: " + media + "/5.0\n";

  return enviarMensagemParaChat(destino, msg);
}

/**
 * Criação Avançada no Notion Tasks:
 * Salva as propriedades principais e injeta o texto completo no CORPO da página
 * em blocos de texto/callout, eliminando limitações de tamanho de rich_text.
 */
function criarTarefaNotion(titulo, area, prioridade, notas) {
  var dbId = ConfigService.get("NOTION_TASKS_DB_ID");
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
  if (!dbId) return false;

  var trechosTitulo = fragmentarTexto(titulo, 1800);
  var trechosNotas = fragmentarTexto(notas, 1800);

  // Blocos filhos para o corpo da página no Notion
  var childrenBlocks = [];
  var blocosNotas = fragmentarTexto(notas, 1900);
  for (var b = 0; b < blocosNotas.length; b++) {
    childrenBlocks.push({
      "object": "block",
      "type": "paragraph",
      "paragraph": {
        "rich_text": [{ "type": "text", "text": { "content": blocosNotas[b] } }]
      }
    });
  }

  var payload = {
    "parent": { "database_id": dbId },
    "properties": {
      "Task": { "title": trechosTitulo.map(function(t) { return { "text": { "content": t } }; }) },
      "Status": { "select": { "name": "Inbox" } },
      "Area": { "select": { "name": area || "Internship" } },
      "Priority": { "select": { "name": prioridade || "2 · Important" } },
      "Due": { "date": { "start": Utilities.formatDate(new Date(), tz, "yyyy-MM-dd") } },
      "Notes": { "rich_text": trechosNotas.slice(0, 1).map(function(t) { return { "text": { "content": t } }; }) }
    },
    "children": childrenBlocks.slice(0, 80) // Limite de 80 blocos por página na criação
  };

  var res = chamarNotionAPI("https://api.notion.com/v1/pages", "POST", payload);
  return res !== null;
}

function salvarDuvidaEstudoNotion(duvida) {
  var titulo = "🧠 Dúvida: " + duvida;
  return criarTarefaNotion(titulo, "Studies", "2 · Important", "Registrado via Telegram para revisão noturna no MedQuest:\n" + duvida);
}

function listarTarefasHojeNotion(chatIdDestino) {
  var destino = chatIdDestino || ConfigService.get("TELEGRAM_CHAT_ID");
  var dbId = ConfigService.get("NOTION_TASKS_DB_ID");
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
  if (!dbId) return enviarMensagemParaChat(destino, "⚠️ NOTION_TASKS_DB_ID não configurado.");

  var hojeISO = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
  var payload = {
    "filter": {
      "or": [
        { "property": "Due", "date": { "on_or_before": hojeISO } },
        { "property": "Status", "select": { "equals": "Inbox" } }
      ]
    },
    "sorts": [{ "property": "Due", "direction": "ascending" }],
    "page_size": 15
  };

  var res = chamarNotionAPI("https://api.notion.com/v1/databases/" + dbId + "/query", "POST", payload);
  if (!res || !res.results) {
    return enviarMensagemParaChat(destino, "⚠️ Erro ao consultar o Notion Tasks. Tente novamente em instantes.");
  }
  if (res.results.length === 0) {
    return enviarMensagemParaChat(destino, "📋 *Tarefas do Notion:* Nenhuma pendência para hoje ou no Inbox! Tudo zerado. 🎉");
  }

  var msg = "📋 *SUAS PENDÊNCIAS NO NOTION TASKS:*\n\n";
  for (var i = 0; i < res.results.length; i++) {
    var item = res.results[i];
    var props = item.properties;
    var titulo = "Sem título";
    if (props.Task && props.Task.title && props.Task.title.length > 0) {
      titulo = props.Task.title[0].text.content;
    }
    var status = (props.Status && props.Status.select) ? props.Status.select.name : "Inbox";
    var area = (props.Area && props.Area.select) ? props.Area.select.name : "";
    var due = (props.Due && props.Due.date) ? props.Due.date.start : "Sem data";

    msg += (i + 1) + ") *" + titulo + "*\n";
    msg += "   • `[" + status + "]` | " + (area ? "*" + area + "* | " : "") + "📅 " + due + "\n\n";
  }

  msg += "💡 *Dica:* Para adicionar nova tarefa, digite `/task <descrição>`.";
  return enviarMensagemParaChat(destino, msg);
}

/**
 * Marcação Proativa de Hábitos no Habit Log de Hoje
 * Chamado automaticamente quando o usuário relata ter treinado, estudado, etc.
 */
function marcarHabitoProativoHoje(textoRelato) {
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
  var hojeISO = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
  var pageId = obterOuCriarPaginaHabitLog(hojeISO);
  if (!pageId) return null;

  var t = (textoRelato || "").toLowerCase();
  var habitosMarcados = [];

  if (t.indexOf("medquest") !== -1 || t.indexOf("quest") !== -1 || t.indexOf("anki") !== -1 || t.indexOf("estud") !== -1) {
    if (atualizarCheckboxNotion(pageId, "🧠 MedQuest", true)) {
      habitosMarcados.push("🧠 MedQuest");
    }
  }
  if (t.indexOf("academia") !== -1 || t.indexOf("trein") !== -1 || t.indexOf("muscula") !== -1 || t.indexOf("supino") !== -1 || t.indexOf("perna") !== -1) {
    if (atualizarCheckboxNotion(pageId, "🏋️ Academia", true)) {
      habitosMarcados.push("🏋️ Academia");
    }
  }
  if (t.indexOf("ingl") !== -1 || t.indexOf("english") !== -1) {
    if (atualizarCheckboxNotion(pageId, "📚 Inglês", true)) {
      habitosMarcados.push("📚 Inglês");
    }
  }
  if (t.indexOf("viol") !== -1 || t.indexOf("guitar") !== -1) {
    if (atualizarCheckboxNotion(pageId, "🎸 Violão", true)) {
      habitosMarcados.push("🎸 Violão");
    }
  }
  if (t.indexOf("namorada") !== -1 || t.indexOf("date") !== -1 || t.indexOf("amor") !== -1) {
    if (atualizarCheckboxNotion(pageId, "❤️ Namorada", true)) {
      habitosMarcados.push("❤️ Namorada");
    }
  }
  if (t.indexOf("livro") !== -1 || t.indexOf("leitura") !== -1 || t.indexOf("li ") !== -1) {
    if (atualizarCheckboxNotion(pageId, "📖 Leitura", true)) {
      habitosMarcados.push("📖 Leitura");
    }
  }

  return habitosMarcados;
}

/**
 * Captura Rápida de Pensamentos / Insights (Segunda Mente)
 */
function criarNotaSegundaMenteNotion(textoNota) {
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
  var titulo = "💡 Insight · " + Utilities.formatDate(new Date(), tz, "dd/MM HH:mm");
  return criarTarefaNotion(titulo, "Personal", "3 · Medium", textoNota);
}


// ==============================================================================
// ARQUIVO FONTE: 06_rotina_agenda.js
// ==============================================================================

/**
 * ==============================================================================
 * MÓDULO 06: CICLO DE ROTINA, BRIEFING, CHECK-IN E SENTINELA DE AGENDA
 * ==============================================================================
 */

function executarCicloRotina5Min() {
  var token = ConfigService.get("TELEGRAM_BOT_TOKEN");
  var chatId = ConfigService.get("TELEGRAM_CHAT_ID");
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
  if (!token || !chatId) return;

  var agora = new Date();
  var dataHojeISO = Utilities.formatDate(agora, tz, "yyyy-MM-dd");
  var horaBrasiliaStr = Utilities.formatDate(agora, tz, "HH:mm");
  var partesHora = horaBrasiliaStr.split(":");
  var minutos = parseInt(partesHora[0], 10) * 60 + parseInt(partesHora[1], 10);

  var props = PropertiesService.getScriptProperties();

  // A. BRIEFING MATINAL (06:15 até 09:00)
  if (minutos >= 375 && minutos < 540) {
    if (props.getProperty("ultima_data_briefing") !== dataHojeISO) {
      if (enviarBriefingMatinal(chatId)) {
        props.setProperty("ultima_data_briefing", dataHojeISO);
      }
    }
  }

  // B. CHECK-IN NOTURNO (21:30 até 23:59)
  if (minutos >= 1290) {
    if (props.getProperty("ultima_data_checkin") !== dataHojeISO) {
      var stPl = detectarPlantaoStatus(agora);
      if (stPl.ehPlantaoHoje) {
        enviarMensagemParaChat(chatId, "🚨 *EM PLANTÃO NOTURNO:*\nCheck-in de hábitos silenciado para manter o foco nos pacientes. Se precisar de condutas, doses de Sala Vermelha (`/dva`, `/sri`) ou gasometria, estou na retaguarda. Bom plantão!");
        props.setProperty("ultima_data_checkin", dataHojeISO);
      } else {
        if (enviarCheckinNoturno(chatId)) {
          props.setProperty("ultima_data_checkin", dataHojeISO);
        }
      }
    }
  }

  // C. RELATÓRIO SEMANAL DE HÁBITOS (DOMINGOS ÀS 20:00)
  if (agora.getDay() === 0 && minutos >= 1200) {
    if (props.getProperty("ultima_data_relatorio") !== dataHojeISO) {
      if (enviarRelatorioSemanalHabitos(chatId)) {
        props.setProperty("ultima_data_relatorio", dataHojeISO);
      }
    }
  }

  // D. ALERTAS DA AGENDA
  try {
    verificarAgendaENotificar();
  } catch (e) {
    Logger.log("Erro ao verificar agenda: " + e.message);
  }
}

function verificarAgendaENotificar() {
  var token = ConfigService.get("TELEGRAM_BOT_TOKEN");
  var chatId = ConfigService.get("TELEGRAM_CHAT_ID");
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
  if (!token || !chatId) return;

  var agora = new Date();
  var janelaFrente = new Date(agora.getTime() + (8 * 60 * 1000));
  var calendario = CalendarApp.getDefaultCalendar();
  if (!calendario) return;

  var eventos = calendario.getEvents(agora, janelaFrente);
  var cache = CacheService.getScriptCache();

  for (var i = 0; i < eventos.length; i++) {
    var ev = eventos[i];
    if (ev.isAllDayEvent()) continue;

    var id = ev.getId();
    var inicio = ev.getStartTime();
    var diffMs = inicio.getTime() - agora.getTime();
    var diffMinutos = Math.round(diffMs / (60 * 1000));

    if (diffMinutos >= 0 && diffMinutos <= 7) {
      var chaveCache = "notif_" + id + "_" + inicio.getTime();
      if (cache.get(chaveCache)) continue;

      var titulo = ev.getTitle();
      var horaFormatada = Utilities.formatDate(inicio, tz, "HH:mm");
      var texto = construirMensagemEvento(titulo, horaFormatada, diffMinutos);

      if (enviarMensagemParaChat(chatId, texto)) {
        safePutCache(cache, chaveCache, "true", 21600); // 6 horas (limite seguro do GAS)
      }
    }
  }
}

function construirMensagemEvento(titulo, horaFormatada, minutosRestantes) {
  var tempoStr = minutosRestantes <= 1 ? "Começando agora" : "Em " + minutosRestantes + " minutos";
  var msg = "🔔 *" + tempoStr + " (" + horaFormatada + ")*\n\n📌 *" + titulo + "*\n";
  var t = titulo.toLowerCase();

  if (t.indexOf("medquest") !== -1 || t.indexOf("estudo") !== -1) {
    msg += "\n🧠 *Foco Total:* Modo ativo! Questões comentadas + Anki. Zero distrações.";
  } else if (t.indexOf("academia") !== -1 || t.indexOf("musculação") !== -1) {
    msg += "\n🏋️ *Treino de Força:* Foco nas séries válidas e descanso cronometrado!";
  } else if (t.indexOf("inglês") !== -1) {
    msg += "\n📚 *Inglês Ativo:* Listening, vocabulário e shadowing sem interrupção.";
  } else if (t.indexOf("violão") !== -1) {
    msg += "\n🎸 *Violão:* Prática fluida e relaxante. Aproveite a evolução musical!";
  } else if (t.indexOf("cochilo") !== -1 || t.indexOf("almoço") !== -1) {
    msg += "\n💤 *Power Nap:* Alarme em 25 min para resetar o córtex pré-frontal.";
  } else if (t.indexOf("namorada") !== -1 || t.indexOf("date") !== -1) {
    msg += "\n❤️ *Tempo de Qualidade:* Presença plena e zero preocupações.";
  }
  return msg;
}

function detectarPlantaoStatus(dataReferencia) {
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
  var ref = dataReferencia ? new Date(dataReferencia) : new Date();

  var resultado = {
    ehPlantaoHoje: false,
    ehPosPlantao: false,
    tituloPlantao: null,
    horarioInicio: null,
    horarioFim: null,
    detalhes: ""
  };

  try {
    if (typeof CalendarApp === "undefined" || !CalendarApp.getDefaultCalendar) {
      return resultado;
    }
    var cal = CalendarApp.getDefaultCalendar();
    if (!cal) return resultado;

    // Janela: 18h atrás até 18h à frente
    var janelaPassado = new Date(ref.getTime() - (18 * 60 * 60 * 1000));
    var janelaFuturo = new Date(ref.getTime() + (18 * 60 * 60 * 1000));

    var eventos = cal.getEvents(janelaPassado, janelaFuturo);
    if (!eventos || eventos.length === 0) return resultado;

    var termosPlantao = ["plantao", "plantão", "noturno", "ps", "uti", "cti", "emergencia", "emergência", "pronto socorro", "12h", "24h", "enfermaria", "hospital"];

    for (var i = 0; i < eventos.length; i++) {
      var ev = eventos[i];
      var tit = (ev.getTitle() || "").toLowerCase();
      var ehMatch = false;

      for (var t = 0; t < termosPlantao.length; t++) {
        if (tit.indexOf(termosPlantao[t]) !== -1) {
          ehMatch = true;
          break;
        }
      }

      if (ehMatch) {
        var inicio = ev.getStartTime();
        var fim = ev.getEndTime();
        resultado.tituloPlantao = ev.getTitle();
        resultado.horarioInicio = inicio;
        resultado.horarioFim = fim;

        var refTime = ref.getTime();
        // Em andamento
        if (refTime >= inicio.getTime() && refTime <= fim.getTime()) {
          resultado.ehPlantaoHoje = true;
          resultado.detalhes = "Plantão em andamento";
        }
        // Previsto para hoje ou próximas 14 horas
        else if (inicio.getTime() > refTime && (inicio.getTime() - refTime) <= (14 * 60 * 60 * 1000)) {
          resultado.ehPlantaoHoje = true;
          resultado.detalhes = "Plantão previsto para hoje";
        }

        // Concluído nas últimas 12 horas (Pós-plantão)
        var diffTermino = refTime - fim.getTime();
        if (diffTermino >= 0 && diffTermino <= (12 * 60 * 60 * 1000)) {
          resultado.ehPosPlantao = true;
          resultado.detalhes = "Pós-plantão imediato";
        }
      }
    }
  } catch (e) {
    Logger.log("Erro ao detectar status de plantão: " + e.message);
  }

  return resultado;
}

function enviarBriefingMatinal(chatIdDestino) {
  var destino = chatIdDestino || ConfigService.get("TELEGRAM_CHAT_ID");
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
  var hoje = new Date();
  var dataFormatada = Utilities.formatDate(hoje, tz, "dd/MM/yyyy");
  var diaSemana = obterDiaSemanaExtenso(hoje);

  var statusPlantao = detectarPlantaoStatus(hoje);

  // MODO PÓS-PLANTÃO: Se acabou de sair de um plantão, prioriza neuroproteção e descanso
  if (statusPlantao.ehPosPlantao) {
    var titPl = statusPlantao.tituloPlantao ? " (" + statusPlantao.tituloPlantao + ")" : "";
    var msgPos = "🛡️ *MODO PÓS-PLANTÃO ATIVADO: RECUPERAÇÃO BIOLÓGICA*\n" +
      "📅 *" + diaSemana + " (" + dataFormatada + ")*\n\n" +
      "Detectei que você concluiu seu turno de plantão" + titPl + ".\n\n" +
      "🛑 *Protocolo Anti-Burnout Imediato:*\n" +
      "  • 🚫 Treino de alta intensidade e cobrança de estudos suspensos.\n" +
      "  • 💤 Prioridade absoluta: Quarto escuro, frio e silencioso para 4-6h de sono ininterrupto.\n" +
      "  • 💧 Hidratação imediata e refeição leve antes de deitar.\n" +
      "  • 📵 Notificações não críticas silenciadas até seu despertar.\n\n" +
      "🩺 Se tiver pendência urgente de leito (`/leito`, `/enfermaria`) ou receita pendente (`/rx`), estou na retaguarda.\n" +
      "👉 Caso contrário: Bom descanso, Dr. Wagner! Sua mente descansada salva vidas amanhã.";
    return enviarMensagemComTecladoFixo(destino, msgPos);
  }

  var calendario = CalendarApp.getDefaultCalendar();
  var inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
  var fimDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);
  var eventos = calendario ? calendario.getEvents(inicioDia, fimDia) : [];

  var listaEventos = "";
  if (eventos.length === 0) {
    listaEventos = "  • Nenhum evento registrado na agenda hoje.";
  } else {
    for (var i = 0; i < eventos.length; i++) {
      var ev = eventos[i];
      if (ev.isAllDayEvent()) continue;
      var horaInicio = Utilities.formatDate(ev.getStartTime(), tz, "HH:mm");
      var horaFim = Utilities.formatDate(ev.getEndTime(), tz, "HH:mm");
      listaEventos += "  • `" + horaInicio + " - " + horaFim + "` | *" + ev.getTitle() + "*\n";
    }
  }

  var treinoMsg = obterTreinoDoDia(hoje.getDay());

  var msg = "☀️ *Bom dia, Wagner! Raio-X do Dia*\n" +
            "📅 *" + diaSemana + " (" + dataFormatada + ")*\n\n" +
            "🏋️ *Plano Físico Hoje:* " + treinoMsg + "\n" +
            "💤 *Almoço:* Não esqueça do cochilo estratégico de 25 min!\n\n" +
            "📋 *Sua Agenda de Hoje:*\n" + (listaEventos || "Nenhum evento.") + "\n\n" +
            "🩺 *Ferramentas Clínicas:* `/soap`, `/rx`, `/plantao`, `/calc`, `/interacao`\n" +
            "👉 *Dica:* Mande fotos de Exames/ECG ou áudios gravados direto para análise!";

  return enviarMensagemParaChat(destino, msg);
}

function obterTreinoDoDia(diaSemanaNum) {
  switch (diaSemanaNum) {
    case 1: return "*Musculação: Superior A* (Peito/Costas/Ombros/Braços)";
    case 2: return "*Musculação: Inferior A* (Pernas foco Quadríceps)";
    case 3: return "🌿 *DESCANSO DA ACADEMIA!* (2h de Imersão MedQuest 17:30-19:30)";
    case 4: return "*Musculação: Superior B* (Costas/Peito/Braços)";
    case 5: return "*Musculação: Inferior B* (Posterior/Glúteos)";
    case 6: return "🧘 *Fim de Semana:* Teoria Nobre (08h-12h20) + Hobbies à tarde";
    case 0: return "🧘 *Fim de Semana:* Simulado Semanal (08h-12h20) + Hobbies à tarde";
    default: return "Descanso";
  }
}

function enviarCheckinNoturno(chatIdDestino) {
  var destino = chatIdDestino || ConfigService.get("TELEGRAM_CHAT_ID");
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
  var hoje = new Date();
  var dataFormatada = Utilities.formatDate(hoje, tz, "dd/MM");

  var texto = "🌙 *Check-in da Noite (" + dataFormatada + ")*\n\n" +
              "Toque nos botões abaixo para marcar os hábitos cumpridos hoje no seu Notion:";

  var teclado = {
    "inline_keyboard": [
      [
        {"text": "🧠 MedQuest Feito", "callback_data": "habit_medquest"},
        {"text": "🏋️ Treino Feito", "callback_data": "habit_gym"}
      ],
      [
        {"text": "📚 Inglês Feito", "callback_data": "habit_english"},
        {"text": "🎸 Violão Feito", "callback_data": "habit_guitar"}
      ],
      [
        {"text": "❤️ Namorada", "callback_data": "habit_love"},
        {"text": "📖 Leitura", "callback_data": "habit_reading"}
      ],
      [
        {"text": "🔋 1", "callback_data": "energy_1"},
        {"text": "🔋 2", "callback_data": "energy_2"},
        {"text": "🔋 3", "callback_data": "energy_3"},
        {"text": "🔋 4", "callback_data": "energy_4"},
        {"text": "🔋 5", "callback_data": "energy_5"}
      ]
    ]
  };

  return enviarMensagemComTecladoParaChat(destino, texto, teclado);
}

/**
 * Criação Ativa de Eventos no Google Calendar
 */
function criarEventoAgendaGoogle(titulo, inicioIso, fimIso, local, descricao) {
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
  var cal = CalendarApp.getDefaultCalendar();
  if (!cal) {
    return { sucesso: false, erro: "Calendário padrão não encontrado no Google Apps Script." };
  }

  var dInicio = new Date(inicioIso);
  if (isNaN(dInicio.getTime())) {
    return { sucesso: false, erro: "Data ou horário de início inválido." };
  }
  var dFim = fimIso ? new Date(fimIso) : null;
  if (!dFim || isNaN(dFim.getTime()) || dFim.getTime() <= dInicio.getTime()) {
    dFim = new Date(dInicio.getTime() + (60 * 60 * 1000));
  }

  var options = {};
  if (local) options.location = local;
  if (descricao) options.description = descricao;

  var ev = cal.createEvent(titulo, dInicio, dFim, options);
  var dataFormatada = Utilities.formatDate(dInicio, tz, "dd/MM/yyyy (EEE)");
  var horaInicio = Utilities.formatDate(dInicio, tz, "HH:mm");
  var horaFim = Utilities.formatDate(dFim, tz, "HH:mm");

  var txtMsg = "📅 *COMPROMISSO AGENDADO NO GOOGLE CALENDAR!*\n\n" +
    "📌 *" + titulo + "*\n" +
    "🗓️ *Data:* " + dataFormatada + "\n" +
    "⏰ *Horário:* `" + horaInicio + " - " + horaFim + "`\n" +
    (local ? "📍 *Local:* " + local + "\n" : "") +
    (descricao ? "📝 *Notas:* " + descricao + "\n" : "") +
    "\n✅ Salvo e sincronizado 24/7 na sua nuvem Google.";

  return {
    sucesso: true,
    id: ev.getId(),
    titulo: titulo,
    horaInicio: horaInicio,
    horaFim: horaFim,
    mensagem: txtMsg
  };
}

/**
 * Consulta de Eventos da Agenda (Hoje / Amanhã)
 */
function consultarEventosAgenda(dataAlvoStr, chatIdDestino) {
  var destino = chatIdDestino || ConfigService.get("TELEGRAM_CHAT_ID");
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
  var agora = new Date();

  var ehAmanha = (dataAlvoStr || "").toLowerCase().indexOf("amanh") !== -1;
  var dataAlvo = agora;
  if (ehAmanha) {
    dataAlvo = new Date(agora.getTime() + 86400000);
  }

  var diaFormatado = Utilities.formatDate(dataAlvo, tz, "dd/MM/yyyy");
  var diaSemana = obterDiaSemanaExtenso(dataAlvo);

  var cal = CalendarApp.getDefaultCalendar();
  if (!cal) return enviarMensagemParaChat(destino, "⚠️ Calendário do Google não acessível.");

  var inicioDia = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate(), 0, 0, 0);
  var fimDia = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate(), 23, 59, 59);
  var eventos = cal.getEvents(inicioDia, fimDia);

  var rotulo = ehAmanha ? "AMANHÃ" : "HOJE";
  var msg = "📆 *AGENDA DE " + rotulo + " (" + diaSemana + ", " + diaFormatado + "):*\n\n";

  if (!eventos || eventos.length === 0) {
    msg += "✨ Nenhum compromisso agendado para este dia! Tempo livre ou escala de estudo flexível.";
    return enviarMensagemParaChat(destino, msg);
  }

  for (var i = 0; i < eventos.length; i++) {
    var ev = eventos[i];
    if (ev.isAllDayEvent()) {
      msg += "🌟 *Dia Todo:* " + ev.getTitle() + "\n";
      continue;
    }
    var hIni = Utilities.formatDate(ev.getStartTime(), tz, "HH:mm");
    var hFim = Utilities.formatDate(ev.getEndTime(), tz, "HH:mm");
    var loc = ev.getLocation();

    msg += (i + 1) + ") `" + hIni + " - " + hFim + "` | *" + ev.getTitle() + "*\n";
    if (loc) msg += "   📍 " + loc + "\n";
  }

  msg += "\n💡 *Para agendar:* Envie por texto ou áudio: _'Marcar plantão amanhã 07:00 às 19:00 no HC'_.";
  var botoesAgenda = {
    inline_keyboard: [
      ehAmanha
        ? [{ text: "📆 Ver Agenda de Hoje", callback_data: "ux:rotina:agenda" }]
        : [{ text: "📆 Ver Agenda de Amanhã", callback_data: "ux:rotina:agenda_amanha" }]
    ]
  };
  return enviarMensagemComTecladoParaChat(destino, msg, botoesAgenda);
}

/**
 * Fechamento e Passagem de Plantão (/plantao_fim)
 */
function gerarResumoFimPlantao(chatIdDestino) {
  var destino = chatIdDestino || ConfigService.get("TELEGRAM_CHAT_ID");
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
  var horaAgora = Utilities.formatDate(new Date(), tz, "HH:mm");

  var msg = "🏁 *DEBRIEFING & FECHAMENTO DE PLANTÃO (" + horaAgora + ")*\n\n" +
    "Prepare a passagem para o colega que está assumindo o leito/enfermaria:\n\n" +
    "1️⃣ *Checklist de Segurança Rápido:*\n" +
    "  ▫️ Todas as gasometrias e exames críticos foram checados e condutas tomadas?\n" +
    "  ▫️ Antibióticos do dia prescritos e aprazados com D.A.T correto?\n" +
    "  ▫️ Drogas vasoativas com vazão estável e alvos de PAM/diurese comunicados?\n" +
    "  ▫️ Pendências de pareceres e exames de imagem da noite listadas?\n\n" +
    "2️⃣ *Dica:* Envie um áudio narrando os leitos sob sua responsabilidade, e eu formato a passagem SBAR completa para colar no grupo do plantão!";

  return enviarMensagemParaChat(destino, msg);
}


// ==============================================================================
// ARQUIVO FONTE: 07_telegram_handlers.js
// ==============================================================================

/**
 * ==============================================================================
 * MÓDULO 07: HANDLERS DE MENSAGENS, MÍDIA E CALLBACKS DO TELEGRAM
 * ==============================================================================
 */

function processarMensagemTexto(message) {
  if (typeof tratarEntradaUX!=="undefined" && tratarEntradaUX(message)) return;
  var texto = message.text ? message.text.trim() : "";
  var textoLow = texto.toLowerCase();
  var chatId = (message.chat && message.chat.id) ? message.chat.id : ConfigService.get("TELEGRAM_CHAT_ID");
  if (!texto) return;

  var comando = textoLow.split(/\s/)[0];
  var contextoCache = CacheService.getScriptCache();
  var contextoKey = "ctx_" + chatId;

  // Gerenciamento de Memória (Contexto Clínico)
  if (comando === "/cancelar" || comando === "/novo" || texto === "🩺 Novo SOAP") {
    contextoCache.remove(contextoKey);
    contextoCache.remove("modo_" + chatId);
    contextoCache.remove("leito_" + chatId);
    contextoCache.remove("dvaw_" + chatId);
    contextoCache.remove("pending_" + chatId);
    if (typeof cancelarAcoesPendentes === "function") {
      try { cancelarAcoesPendentes(chatId); } catch (eCanc) {}
    }
    return enviarMensagemComTecladoFixo(chatId, "🧹 *Contexto limpo.* Envie um novo caso clínico por texto ou áudio.");
  }

  if (comando === "/manual") {
    return enviarManual(chatId);
  }

  // 1. ATALHOS DO TECLADO FIXO PERSISTENTE (1-TOQUE NO SMARTPHONE)
  if (texto === "🚨 Sala Vermelha") {
    var txtSR = "🚨 *SALA VERMELHA & CTI (EMERGÊNCIAS CLÍNICAS)*\n\n" +
      "Escolha uma ação imediata ou digite o comando:\n\n" +
      "💉 *Drogas Vasoativas (DVA):*\n" +
      "• `/dva nora 70` (Noradrenalina em mL/h para 70kg)\n" +
      "• `/dva nora 80 concentrada` (Solução 2x)\n" +
      "• `/dva dobuta 70` (Dobutamina 1mg/mL)\n" +
      "• `/dva vaso` (Vasopressina dose fixa 12 mL/h)\n" +
      "• `/dva nipride 75` ou `/dva tridil`\n\n" +
      "🫁 *Sequência Rápida de Intubação (SRI / IOT):*\n" +
      "• `/sri 70` (Doses e mL exatos de Etomidato, Quetamina, Succinil, Rocurônio e Fentanil)\n" +
      "• `/sri 70 choque` ou `/sri 70 asma`\n\n" +
      "⚡ *Condutas de Ataque:* `/conduta <intercorrência>` (ex: `/conduta EAP hipertensivo`)";
    return enviarMensagemParaChat(chatId, txtSR);
  }

  if (texto === "💊 Prescrever") {
    return enviarMensagemParaChat(chatId, "💊 *PRESCRIÇÃO AMBULATORIAL (REMUME)*\n\nEnvie o pedido ou diagnóstico:\n💡 *Ex:* `/rx amigdalite bacteriana criança 18kg, alérgica a penicilina` ou apenas descreva o caso.");
  }

  if (texto === "🏥 Enfermaria") {
    var kbEnf = {
      "inline_keyboard": [
        [
          {"text": "📋 Gerar Passagem SBAR", "callback_data": "enfermaria_passagem"},
          {"text": "🔄 Atualizar", "callback_data": "enfermaria_atualizar"}
        ]
      ]
    };
    return enviarMensagemComTecladoParaChat(chatId, EnfermariaService.formatarPainelBordo(), kbEnf);
  }

  if (texto === "📅 Agenda") {
    return consultarEventosAgenda("hoje", chatId);
  }

  if (texto === "📋 Minhas Tarefas") {
    return listarTarefasHojeNotion(chatId);
  }

  if (texto === "🩸 Gaso") {
    return enviarMensagemParaChat(chatId, "🩸 *GASOMETRIA ARTERIAL*\n\nEnvie os parâmetros:\n💡 *Ex:* `/gaso pH 7.24, pCO2 26, HCO3 11, Na 140, Cl 104, Alb 3.2`");
  }

  if (texto === "🏁 Fim de Plantão") {
    return gerarResumoFimPlantao(chatId);
  }

  if (texto === "🎧 Preceptor Voz") {
    var msgVoz = "🎧 *PRECEPTOR SOCRÁTICO NO FONE DE OUVIDO*\n\n" +
      "Envie o caso do paciente por áudio gravado ou comando `/voz`:\n\n" +
      "💡 *Exemplo:* `/voz Paciente 68a, DPOC grave exacerbado, gaso pH 7.28, pCO2 58, sonolento, iniciado VNI`\n\n" +
      "O preceptor sintetiza uma provocação socrática cirúrgica gravada em áudio para você ouvir e responder no fone.";
    return enviarMensagemParaChat(chatId, msgVoz);
  }

  if (texto === "🧠 Dúvida MedQuest") {
    return enviarMensagemParaChat(chatId, "🧠 *DÚVIDA MÉDICA (MEDQUEST)*\n\nDigite sua dúvida para arquivar no bloco de estudo noturno:\n💡 *Ex:* `/duvida Indicações de drenagem torácica no empiema`");
  }

  if (texto === "⚙️ Menu / Ajuda" || comando === "/teclado" || comando === "/menu") {
    if (typeof registrarComandosNativosTelegram === "function") {
      try { registrarComandosNativosTelegram(); } catch (eCmd) {}
    }
    if (typeof enviarHubPrincipal === "function") {
      return enviarHubPrincipal(chatId);
    }
    var msgTeclado = "⌨️ *Teclado de Acesso Rápido Ativado!*\n\nUse os botões na base do chat para navegação imediata de 1 toque no hospital e na rotina.";
    return enviarMensagemComTecladoFixo(chatId, msgTeclado);
  }

  // Se não for um comando com barra (/), verifica se tem contexto salvo para complementar
  if (texto.charAt(0) !== "/") {
    var contextoAnterior = contextoCache.get(contextoKey);
    if (contextoAnterior) {
      texto = contextoAnterior + "\n[Nova Informação do Usuário]: " + texto;
      comando = contextoAnterior.split(/\s/)[0].toLowerCase();
    }
  }

  var clinicos = ["/soap", "/rx", "/receita", "/plantao", "/sbar", "/calc", "/round", "/pitch", "/interacao", "/gaso", "/conduta", "/sos", "/dva", "/sri", "/iot", "/voz", "/sabatina"];

  // Se for comando clínico, salva no contexto de conversação (15 min)
  if (clinicos.indexOf(comando) !== -1) {
    if (texto.length > 6000) {
      return enviarMensagemParaChat(chatId, "⚠️ O caso excedeu o limite de caracteres. Use `/novo` e resuma.");
    }
    safePutCache(contextoCache, contextoKey, texto, 900); // compatibilidade
    if(typeof definirModoBot!=="undefined") {
      var mapaModos={"/soap":"soap","/rx":"rx","/receita":"rx","/gaso":"gaso","/voz":"voz","/sabatina":"voz","/calc":"calc","/plantao":"plantao","/sbar":"plantao","/round":"round","/pitch":"round","/interacao":"interacao","/conduta":"conduta","/sos":"conduta"};
      if(mapaModos[comando])definirModoBot(chatId,mapaModos[comando],texto.replace(/^\/\w+\s*/,""));
    }
  } else if (texto.charAt(0) === "/") {
    contextoCache.remove(contextoKey);
  }

  // 2. AJUDA E START
  if (comando === "/start" || comando === "/ajuda" || comando === "/help") {
    if (typeof registrarComandosNativosTelegram === "function") {
      try { registrarComandosNativosTelegram(); } catch (eCmd) {}
    }
    if (comando === "/start" && typeof enviarHubPrincipal === "function") {
      return enviarHubPrincipal(chatId);
    }
    var ajudaMsg = "⚡ *COPILOTO CLÍNICO & MASTER ASSISTANT 4.0*\n\n" +
                   "💡 *Dica:* Digite `/menu` para a Central de Comandos interativa ou `/manual` para o Guia Definitivo com todos os exemplos!\n\n" +
                   "🧠 *Modo Conversa:* Lembra do paciente por 15 min! Mande `/soap Caso X` e depois só envie atualizações (use `/novo` para limpar e trocar de caso).\n\n" +
                   "🚨 *SALA VERMELHA & URGÊNCIA DETERMINÍSTICA:*\n" +
                   "• `/dva <droga> <peso>`: Vazão em mL/h calculada (Nora padrão/concentrada, Dobuta, Vaso, Nipride, Tridil)\n" +
                   "• `/sri <peso> [contexto]`: Intubação rápida com doses e volumes exatos em mL (choque/asma)\n" +
                   "• `/conduta <emergência>`: Doses prontas para Sala Vermelha (PCR, EAP, Anafilaxia, etc.)\n" +
                   "• `/gaso <valores>`: Gasometria determinística (Winter + AG + Delta-Delta + P/F)\n\n" +
                   "🏥 *ENFERMARIA VIRTUAL & LEITOS:*\n" +
                   "• `/enfermaria`: Quadro geral de todos os leitos com status visual\n" +
                   "• `/leito <num> <dados>`: Registrar ou atualizar paciente no leito\n" +
                   "• `/passagem`: Consolidar passagem de plantão SBAR de toda a enfermaria\n" +
                   "• `/alta <num>`: Dar alta e liberar o leito\n\n" +
                   "🩺 *AMBULATÓRIO & ROUND:*\n" +
                   "• `/soap <caso>`: Síntese SOAP completa para prontuário\n" +
                   "• `/rx <pedido>`: Prescrição REMUME + botão para PDF A4 no Google Drive\n" +
                   "• `/voz <caso>`: Sabatina provocativa em áudio de voz no fone de ouvido\n" +
                   "• `/round <caso>`: Pitch de 60s para preceptor + 3 perguntas socráticas\n" +
                   "• `/calc`: Calculadoras clínicas determinísticas (Cockcroft, CHA2DS2-VASc, KDIGO, MELD, Glasgow)\n" +
                   "• `/interacao <drogas>`: Checagem cruzada com marcas comerciais\n\n" +
                   "📅 *LIFESTYLE, AGENDA & ROTINA:*\n" +
                   "• `/agenda [hoje/amanha]`: Consulta seus compromissos no Google Calendar\n" +
                   "• `/plantao_fim`: Checklist e passagem executiva ao terminar o turno\n" +
                   "• `/task <texto>`: Salvar tarefa rápida no Inbox do Notion Tasks\n" +
                   "• `/tasks`: Listar pendências de hoje no Notion\n" +
                   "• `/duvida <tema>`: Guardar dúvida para o estudo noturno (MedQuest)\n" +
                   "• `/teclado`: Reativar botões rápidos na base do chat\n\n" +
                   "🎙️ *Sem comandos:* Fale naturalmente por texto ou áudio no corredor! A IA classifica e executa automaticamente.";
    return enviarMensagemComTecladoFixo(chatId, ajudaMsg);
  }

  if (comando === "/status" || comando === "/fontes") {
    var motorPadrao = ConfigService.get("PROVEDOR_TEXTO_PADRAO", "GROQ");
    var idRemume = ConfigService.get("SPREADSHEET_ID_REMUME");
    var idInteracoes = ConfigService.get("SPREADSHEET_ID_INTERACOES");
    var stRemume = checarStatusFonteDrive(idRemume, false);
    var stInteracoes = checarStatusFonteDrive(idInteracoes, true);

    var msgStatus = "⚡ *STATUS DO MASTER ASSISTANT 3.0*\n\n" +
      "• *Modo:* Nuvem 24/7 (Google Apps Script Webhook)\n" +
      "• *Memória Clínica:* Ativa (Contexto de 15 min com LockService)\n" +
      "• *Motor de Raciocínio Primário:* *" + motorPadrao + "*\n" +
      "• *Cascata de IA:* Groq (120B) ➔ OpenRouter ➔ Z.ai ➔ Gemini Pool (4 chaves)\n\n" +
      "📂 *FONTES DE DADOS DO GOOGLE DRIVE:*\n" +
      "• *REMUME Ribeirão Preto:* " + stRemume + "\n" +
      "• *Base de Interações:* " + stInteracoes + "\n\n" +
      "✅ Todos os sistemas operacionais e integrados ao Notion e Google Calendar.";
    return enviarMensagemParaChat(chatId, msgStatus);
  }

  // 3. COMANDOS CLÍNICOS E SALA VERMELHA
  if (comando === "/dva") {
    var dadosDva = texto.replace(/^\/dva\s*/i, "").trim();
    if (!dadosDva) {
      return enviarMensagemParaChat(chatId, "💉 *CALCULADORA DE DROGAS VASOATIVAS (DVA)*\n\nUso: `/dva <droga> <pesoKg> [solução]`\n💡 *Exemplos:*\n• `/dva nora 70` (Noradrenalina padrão)\n• `/dva nora 80 concentrada` (Solução 2x)\n• `/dva dobuta 65`\n• `/dva vaso`\n• `/dva nipride 75`\n• `/dva tridil`");
    }
    var partesDva = dadosDva.split(/\s+/);
    var nomeDroga = (partesDva[0] || "").toLowerCase();

    // Drogas de dose fixa independentes de peso (Vasopressina, Nitroglicerina/Tridil)
    var ehDoseFixa = (nomeDroga.indexOf("vaso") !== -1 || nomeDroga.indexOf("tridil") !== -1 || nomeDroga.indexOf("nitroglicerina") !== -1);

    var pesoDva = null;
    var solucaoDva = "padrao";

    if (ehDoseFixa) {
      if (partesDva.length > 1) {
        var pesoTest = sanitizarEValidarPesoKg(partesDva[1]);
        if (pesoTest !== null) {
          pesoDva = pesoTest;
          solucaoDva = partesDva.slice(2).join(" ") || "padrao";
        } else {
          solucaoDva = partesDva.slice(1).join(" ") || "padrao";
        }
      }
    } else {
      if (partesDva.length < 2 || !partesDva[1]) {
        return enviarMensagemParaChat(chatId, "⚠️ *Peso obrigatório:* Para " + partesDva[0] + ", informe o peso do paciente em kg.\n\n💡 *Exemplo:* `/dva " + partesDva[0] + " 70` ou `/dva " + partesDva[0] + " 70,5`");
      }
      pesoDva = sanitizarEValidarPesoKg(partesDva[1]);
      if (pesoDva === null) {
        return enviarMensagemParaChat(chatId, "⚠️ *Peso inválido:* \"" + partesDva[1] + "\" não é um peso válido em kg. Digite um valor numérico positivo (ex: `/dva " + partesDva[0] + " 70` ou `/dva " + partesDva[0] + " 70,5`).");
      }
      solucaoDva = partesDva.slice(2).join(" ") || "padrao";
    }

    try {
      var resDva = CalculadorasClinicas.drogasVasoativas(nomeDroga, pesoDva, solucaoDva);
      if (resDva && resDva.erro) {
        return enviarMensagemParaChat(chatId, "⚠️ " + resDva.erro);
      }
      if (resDva && resDva.textoFormatado) {
        var tecladoDva = resDva.botoes ? (resDva.botoes.inline_keyboard ? resDva.botoes : { inline_keyboard: resDva.botoes }) : null;
        if (tecladoDva) {
          return enviarMensagemComTecladoParaChat(chatId, resDva.textoFormatado, tecladoDva);
        } else {
          return enviarMensagemParaChat(chatId, resDva.textoFormatado);
        }
      }
      return enviarMensagemParaChat(chatId, "⚠️ Droga não reconhecida. Opções: `nora`, `dobuta`, `vaso`, `nipride`, `tridil`.");
    } catch (eDva) {
      Logger.log("Erro /dva: " + eDva.message);
      return enviarMensagemParaChat(chatId, "⚠️ Erro ao calcular DVA. Tente novamente.");
    }
  }

  if (comando === "/sri" || comando === "/iot") {
    var dadosSri = texto.replace(/^\/(sri|iot)\s*/i, "").trim();
    if (!dadosSri) {
      return enviarMensagemParaChat(chatId, "🫁 *SEQUÊNCIA RÁPIDA DE INTUBAÇÃO (SRI / IOT)*\n\nUso: `/sri <pesoKg> [contexto]`\n💡 *Exemplos:*\n• `/sri 70`\n• `/sri 80 choque`\n• `/sri 65 asma`\n• `/sri 75 tce`");
    }
    var partesSri = dadosSri.split(/\s+/);
    var pesoSri = sanitizarEValidarPesoKg(partesSri[0]);
    if (pesoSri === null) {
      return enviarMensagemParaChat(chatId, "⚠️ *Peso obrigatório e inválido para SRI/IOT:*\nInforme um peso numérico positivo em kg.\n\n💡 *Exemplo:* `/sri 70` ou `/sri 72,5 choque`");
    }
    var contextoSri = partesSri.slice(1).join(" ") || "padrao";
    try {
      var resSri = CalculadorasClinicas.sequenciaRapidaIntubacao(pesoSri, contextoSri);
      if (resSri && resSri.erro) {
        return enviarMensagemParaChat(chatId, "⚠️ " + resSri.erro);
      }
      if (resSri && resSri.textoFormatado) {
        var tecladoSri = resSri.botoes ? (resSri.botoes.inline_keyboard ? resSri.botoes : { inline_keyboard: resSri.botoes }) : null;
        if (tecladoSri) {
          return enviarMensagemComTecladoParaChat(chatId, resSri.textoFormatado, tecladoSri);
        } else {
          return enviarMensagemParaChat(chatId, resSri.textoFormatado);
        }
      }
      return enviarMensagemParaChat(chatId, "⚠️ Erro ao calcular SRI.");
    } catch (eSri) {
      Logger.log("Erro /sri: " + eSri.message);
      return enviarMensagemParaChat(chatId, "⚠️ Erro ao calcular SRI. Tente novamente.");
    }
  }

  if (comando === "/soap") {
    var casoClinico = texto.replace(/^\/soap\s*/i, "").trim();
    if (!casoClinico) return enviarMensagemParaChat(chatId, "🩺 Envie os dados. Ex: `/soap Mulher 68a epigastralgia...`");
    return processarEEntregarIA(chatId, gerarSOAPComIA, casoClinico, "soap");
  }

  if (comando === "/rx" || comando === "/receita") {
    var dadosPrescricao = texto.replace(/^\/(rx|receita)\s*/i, "").trim();
    if (!dadosPrescricao) return enviarMensagemParaChat(chatId, "💊 Envie o pedido. Ex: `/rx amigdalite 16kg, alergia a penicilina`");
    return processarEEntregarIA(chatId, gerarPrescricaoComIA, dadosPrescricao, "rx");
  }

  if (comando === "/plantao" || comando === "/sbar") {
    var dadosPlantao = texto.replace(/^\/(plantao|sbar)\s*/i, "").trim();
    if (!dadosPlantao) return enviarMensagemParaChat(chatId, "🏥 Envie os dados. Ex: `/plantao Leito 12 PAC grave...`");
    return processarEEntregarIA(chatId, gerarPassagemPlantaoSBAR, dadosPlantao, "plantao");
  }

  // ENFERMARIA VIRTUAL MULTI-LEITOS
  if (comando === "/enfermaria") {
    var kbEnfPainel = {
      "inline_keyboard": [
        [
          {"text": "📋 Gerar Passagem SBAR", "callback_data": "enfermaria_passagem"},
          {"text": "🔄 Atualizar", "callback_data": "enfermaria_atualizar"}
        ]
      ]
    };
    return enviarMensagemComTecladoParaChat(chatId, EnfermariaService.formatarPainelBordo(), kbEnfPainel);
  }

  if (comando === "/leito") {
    var dadosLeito = texto.replace(/^\/leito\s*/i, "").trim();
    if (!dadosLeito) {
      return enviarMensagemParaChat(chatId, "🛏️ *ENFERMARIA VIRTUAL*\n\n" +
        "• Para ver ou atualizar: `/leito <número> <dados>`\n" +
        "💡 *Exemplo:* `/leito 4 72a, PAC grave, Ceftriaxona D3, aguarda vaga CTI`\n" +
        "• Para ver o leito: `/leito 4`\n" +
        "• Para ver todos: `/enfermaria`\n" +
        "• Para desocupar leito: `/alta 4`\n" +
        "• Para passagem geral: `/passagem`");
    }

    var matchLeito = dadosLeito.match(/^([a-zA-Z0-9_-]{1,24})(?:\s+([\s\S]+))?$/);
    if (matchLeito) {
      var numLeito = matchLeito[1];
      var infoLeito = matchLeito[2];

      if (!infoLeito) {
        var leitoAtual = EnfermariaService.obterLeito(numLeito);
        if (leitoAtual) {
          return enviarMensagemParaChat(chatId, "🛏️ *LEITO " + numLeito + "* [" + leitoAtual.status + "]\n" +
            "⏱️ *Atualizado às:* " + leitoAtual.atualizadoEm + "\n" +
            "📝 " + leitoAtual.dados + "\n\n" +
            "💡 Para atualizar: `/leito " + numLeito + " novos dados`\n" +
            "🟢 Para dar alta: `/alta " + numLeito + "`");
        } else {
          return enviarMensagemParaChat(chatId, "⚪ *Leito " + numLeito + " está vago.* Para ocupar, envie `/leito " + numLeito + " dados do paciente`.");
        }
      }

      var resAtualizacao = EnfermariaService.atualizarLeito(numLeito, infoLeito);
      return enviarMensagemParaChat(chatId, resAtualizacao.mensagem || resAtualizacao.erro);
    }
  }

  if (comando === "/alta") {
    var numAlta = texto.replace(/^\/alta\s*/i, "").trim();
    if (!numAlta) {
      return enviarMensagemParaChat(chatId, "🟢 Digite o número do leito a desocupar. Ex: `/alta 4`");
    }
    var resAlta = EnfermariaService.desocuparLeito(numAlta);
    return enviarMensagemParaChat(chatId, resAlta.mensagem);
  }

  if (comando === "/limpar_enfermaria") {
    var resLimpeza = EnfermariaService.limparTudo();
    return enviarMensagemParaChat(chatId, resLimpeza.mensagem);
  }

  if (comando === "/passagem") {
    var textoConsolidado = EnfermariaService.obterTextoConsolidadoParaPassagem();
    if (!textoConsolidado) {
      return enviarMensagemParaChat(chatId, "🏥 *Nenhum leito registrado na enfermaria para passar.* Registre os leitos usando `/leito <num> <dados>` antes de gerar a passagem.");
    }
    return processarEEntregarIA(chatId, gerarPassagemPlantaoSBAR, "PASSAGEM GERAL DE PLANTÃO DA ENFERMARIA (TODOS OS LEITOS ATIVOS):\n\n" + textoConsolidado, "plantao");
  }

  if (comando === "/plantao_fim") {
    return gerarResumoFimPlantao(chatId);
  }


  if (comando === "/gaso") {
    var dadosGaso = texto.replace(/^\/gaso\s*/i, "").trim();
    if (!dadosGaso) {
      return enviarMensagemParaChat(chatId, "🩸 *ANÁLISE DE GASOMETRIA ARTERIAL*\n\n" +
        "Envie os parâmetros gasométricos e eletrólitos:\n" +
        "• *pH*, *pCO2*, *HCO3* (obrigatórios)\n" +
        "• *Na*, *Cl*, *Albumina* (para Ânion Gap corrigido e Delta-Delta)\n" +
        "• *PaO2*, *FiO2* (para relação P/F)\n\n" +
        "💡 *Exemplo de envio:*\n" +
        "`/gaso pH 7.22, pCO2 28, HCO3 11, Na 140, Cl 102, Alb 3.0, PaO2 85, FiO2 21%`");
    }
    return processarEEntregarIA(chatId, gerarAnaliseGasometriaComIA, dadosGaso, "gaso");
  }

  if (comando === "/conduta" || comando === "/sos") {
    var dadosEmergencia = texto.replace(/^\/(conduta|sos)\s*/i, "").trim();
    if (!dadosEmergencia) {
      return enviarMensagemParaChat(chatId, "🚨 *CONDUTAS DE EMERGÊNCIA (SALA VERMELHA)*\n\n" +
        "Informe a intercorrência para receber conduta imediata em ampolas e mL:\n\n" +
        "💡 *Exemplos:*\n" +
        "• `/conduta EAP hipertensivo PA 220x120`\n" +
        "• `/conduta Anafilaxia em adulto`\n" +
        "• `/conduta Hipercalemia K 7.4 com onda T apiculada`\n" +
        "• `/conduta Crise convulsiva em curso há 6 minutos`\n" +
        "• `/conduta Cetoacidose diabética glicemia 480`");
    }
    return processarEEntregarIA(chatId, gerarCondutaEmergenciaComIA, dadosEmergencia, "conduta");
  }

  if (comando === "/calc") {
    var dadosCalc = texto.replace(/^\/calc\s*/i, "").trim();
    if (!dadosCalc) {
      return enviarMenuCategoriasCalculadoras(chatId);
    }

    if (ehApenasNomeCalculadora(dadosCalc)) {
      safePutCache(CacheService.getScriptCache(), contextoKey, "/calc Calculadora selecionada: " + dadosCalc + "\nDados do paciente: ", 900);
      var guias = obterInstrucoesCalculadora(dadosCalc);
      return enviarMensagemParaChat(chatId, guias);
    }

    var resDet = tentarCalcularDeterministico(dadosCalc);
    if (resDet) {
      return enviarMensagemParaChat(chatId, resDet);
    }

    // Se o usuário invocou uma calculadora reconhecida deterministicamente mas resDet não retornou resultado, NUNCA cai na IA!
    if (typeof ehCalculadoraReconhecida === "function" && ehCalculadoraReconhecida(dadosCalc)) {
      var instrucoes = obterInstrucoesCalculadora(dadosCalc);
      return enviarMensagemParaChat(chatId, "⚠️ *Calculadora Clínica: Parâmetros Insuficientes ou Inválidos*\n\n" + instrucoes);
    }

    return processarEEntregarIA(chatId, processarCalculadoraClinicaComIA, dadosCalc, "calc");
  }

  if (comando === "/round" || comando === "/pitch") {
    var dadosRound = texto.replace(/^\/(round|pitch)\s*/i, "").trim();
    if (!dadosRound) return enviarMensagemParaChat(chatId, "👨‍⚕️ Envie os dados do paciente.");
    return processarEEntregarIA(chatId, gerarPitchERoundComIA, dadosRound, "round");
  }

  if (comando === "/voz" || comando === "/sabatina") {
    var dadosVoz = texto.replace(/^\/(voz|sabatina)\s*/i, "").trim();
    if (!dadosVoz) {
      return enviarMensagemParaChat(chatId, "🎧 *PRECEPTOR SOCRÁTICO NO FONE DE OUVIDO*\n\n" +
        "Envie o caso clínico ou resumo do paciente para receber uma sabatina socrática em áudio de voz:\n" +
        "💡 *Exemplo:* `/voz Paciente 68a, DPOC exacerbado, gasometria pH 7.28, pCO2 58, sonolento, iniciado VNI`");
    }
    enviarChatAction(chatId, "record_voice");
    var criticaVoz = gerarCriticaSocraticaPreceptor(dadosVoz);
    var blobAudio = sintetizarVozPreceptor(criticaVoz);
    if (blobAudio) {
      return enviarAudioVozTelegram(chatId, blobAudio, "🎧 *Preceptor Socrático:*\n" + criticaVoz);
    } else {
      return enviarMensagemParaChat(chatId, "🎧 *Preceptor Socrático:*\n" + criticaVoz);
    }
  }

  if (comando === "/interacao") {
    var drogas = texto.replace(/^\/interacao\s*/i, "").trim();
    if (!drogas) return enviarMensagemParaChat(chatId, "💊 Informe os medicamentos para cruzar.");
    return processarEEntregarIA(chatId, verificarInteracaoComIA, drogas, "interacao");
  }

  // 4. AGENDA, TAREFAS E NOTION
  if (comando === "/agenda") {
    var paramAgenda = texto.replace(/^\/agenda\s*/i, "").trim();
    return consultarEventosAgenda(paramAgenda, chatId);
  }

  if (comando === "/task" || comando === "/tarefa") {
    var tarefaTexto = texto.replace(/^\/(task|tarefa)\s*/i, "").trim();
    if (!tarefaTexto) return enviarMensagemParaChat(chatId, "📋 Digite a tarefa a salvar no Inbox do Notion. Ex: `/task Revisar hemograma do leito 14`");
    var okTask = criarTarefaNotion(tarefaTexto, "Personal", "2 · Important", "Captura rápida via Telegram");
    if (okTask) return enviarMensagemParaChat(chatId, "✅ *Tarefa salva no Inbox do Notion Tasks!*");
    enviarMensagemParaChat(chatId, "❌ Falha ao salvar no Notion. O pedido foi preservado na fila.");
    throw new Error("FALHA_NOTION_CRIAR_TAREFA");
  }

  if (comando === "/tasks") {
    return listarTarefasHojeNotion(chatId);
  }

  if (comando === "/duvida") {
    var duvidaTexto = texto.replace(/^\/duvida\s*/i, "").trim();
    if (!duvidaTexto) return enviarMensagemParaChat(chatId, "🧠 Envie sua dúvida médica. Ex: `/duvida Critérios de Light para derrame pleural`");
    var okDuvida = salvarDuvidaEstudoNotion(duvidaTexto);
    if (okDuvida) return enviarMensagemParaChat(chatId, "🧠 *Dúvida arquivada no Notion para a sessão noturna do MedQuest!*");
    return enviarMensagemParaChat(chatId, "❌ Falha ao arquivar dúvida.");
  }

  if (comando === "/semana" || comando === "/relatorio") return enviarRelatorioSemanalHabitos(chatId);
  if (comando === "/checkin") return enviarCheckinNoturno(chatId);
  if (comando === "/briefing") return enviarBriefingMatinal(chatId);

  // 4.1. COMANDOS DE EVIDÊNCIA CIENTÍFICA E PROTOCOLOS BRASILEIROS
  if (comando === "/evidencia" || comando === "/pubmed") {
    var termoEvidencia = texto.replace(/^\/(evidencia|pubmed)\s*/i, "").trim();
    if (!termoEvidencia) {
      return enviarMensagemParaChat(chatId, "🔬 *BUSCA DE EVIDÊNCIA CIENTÍFICA (PUBMED / EUROPE PMC)*\n\nUso: `/evidencia <tema ou pergunta clínica>`\n💡 *Exemplo:*\n• `/evidencia corticoide choque septico`\n• `/evidencia vni insuficiencia respiratoria`\n• `/evidencia empagliflozina insuficiencia cardiaca`");
    }
    enviarChatAction(chatId, "typing");
    var resEv = buscarEvidenciaMedica(termoEvidencia);
    return enviarMensagemParaChat(chatId, resEv);
  }

  if (comando === "/protocolo") {
    var termoProto = texto.replace(/^\/protocolo\s*/i, "").trim();
    if (!termoProto) {
      return enviarMensagemParaChat(chatId, "📚 *PROTOCOLOS DE EMERGÊNCIA & DIRETRIZES BRASILEIRAS*\n\nUso: `/protocolo <patologia>`\n💡 *Exemplos:*\n• `/protocolo sepse` (ILAS / SSC)\n• `/protocolo iam` (SBC / AHA)\n• `/protocolo eap` (SBC / ESC)\n• `/protocolo cad` (SBD / ADA)\n• `/protocolo tep` (SBC / ESC)\n• `/protocolo dpoc` (SBPT / GOLD)");
    }
    var proto = obterProtocoloClinico(termoProto);
    if (!proto) {
      return enviarMensagemParaChat(chatId, "⚠️ Protocolo não cadastrado diretamente. Tente: sepse, iam, eap, cad, tep ou dpoc.");
    }
    var msgProto = "📋 *" + proto.titulo.toUpperCase() + "*\n\n" +
      "🇧🇷 *Diretriz Brasileira:* " + proto.diretriz_brasileira + "\n" +
      "🌐 *Diretriz Internacional:* " + proto.diretriz_internacional + "\n\n" +
      "⚡ *Conduta Recomendada:*\n" + proto.conduta_imediata + "\n\n" +
      "⚖️ *Divergência Notável:*\n" + proto.divergencia;
    return enviarMensagemParaChat(chatId, msgProto);
  }

  // 5. ROTEADOR DE INTENÇÃO AUTÔNOMO (SEM NECESSIDADE DE COMANDO COM BARRA /)
  enviarChatAction(chatId, "typing");
  var decisao = classificarIntencaoMensagem(texto);

  if (decisao.intencao === "CALENDAR_CRIAR") {
    var dadosEv = extrairDadosEventoCalendario(texto);
    if (dadosEv && dadosEv.titulo && dadosEv.dataInicio) {
      var resCriacao = criarEventoAgendaGoogle(dadosEv.titulo, dadosEv.dataInicio, dadosEv.dataFim, dadosEv.local, dadosEv.descricao);
      if (resCriacao && resCriacao.sucesso) {
        return enviarMensagemParaChat(chatId, resCriacao.mensagem);
      }
    }
  }

  if (decisao.intencao === "CALENDAR_CONSULTAR") {
    return consultarEventosAgenda(texto, chatId);
  }

  if (decisao.intencao === "HABITO_PROATIVO") {
    var habitosMarcados = marcarHabitoProativoHoje(texto);
    if (habitosMarcados && habitosMarcados.length > 0) {
      return enviarMensagemParaChat(chatId, "⚡ *Hábito registrado proativamente no Notion Habit Log!*\n\n✅ " + habitosMarcados.join("\n✅ ") + "\n\nSeu check-in noturno já estará atualizado! 🚀");
    }
  }

  if (decisao.intencao === "CLINICO_SOAP") {
    safePutCache(contextoCache, contextoKey, texto, 900);
    if(typeof definirModoBot!=="undefined")definirModoBot(chatId,"soap",texto);
    return processarEEntregarIA(chatId, gerarSOAPComIA, texto, "soap");
  }

  if (decisao.intencao === "CLINICO_RX") {
    if(typeof definirModoBot!=="undefined")definirModoBot(chatId,"rx",texto);
    return processarEEntregarIA(chatId, gerarPrescricaoComIA, texto, "rx");
  }

  if (decisao.intencao === "CLINICO_GASO") {
    return processarEEntregarIA(chatId, gerarAnaliseGasometriaComIA, texto, "gaso");
  }

  if (decisao.intencao === "PRECEPTOR_VOZ") {
    var casoAudio = texto.replace(/(?:me\s+)?respond(?:a|e)\s+(?:com\s+|em\s+)?(?:um\s+)?[áa]udio|no\s+fone|fala\s+comigo|preceptor\s+socr[áa]tico|sabatina|manda\s+[áa]udio/gi, "").trim();
    if (!casoAudio || casoAudio.length < 5) {
      casoAudio = contextoCache.get(contextoKey) || "Paciente em avaliação médica no pronto-socorro";
    } else {
      safePutCache(contextoCache, contextoKey, casoAudio, 900);
    }
    return responderPreceptorVozComIA(chatId, casoAudio);
  }

  if (decisao.intencao === "CLINICO_EMERGENCIA") {
    var tEmerg = texto.toLowerCase();
    if (tEmerg.indexOf("nora") !== -1) {
      var pesos = Array.from(texto.matchAll(/(?:peso\s*[:=]?\s*)?(\d+(?:[.,]\d+)?)\s*kg\b/gi));
      if (pesos.length!==1) return enviarMensagemParaChat(chatId,"Informe um único peso explícito em kg. Exemplo: nora, peso 70,5 kg.");
      var pNora = sanitizarEValidarPesoKg(pesos[0][1]);
      if (pNora===null) return enviarMensagemParaChat(chatId,"Peso inválido. Informe o peso em kg.");
      var solNora = /concentrad[ao]|dobrad[ao]|4x/i.test(texto) ? "concentrada" : "padrao";
      var resNora = CalculadorasClinicas.drogasVasoativas("noradrenalina", pNora, solNora);
      if (resNora) return enviarMensagemParaChat(chatId, resNora.textoFormatado || resNora.texto);
    }
    return processarEEntregarIA(chatId, gerarCondutaEmergenciaComIA, texto, "conduta");
  }

  if (decisao.intencao === "NOTION_TASK") {
    var okNovaTask = criarTarefaNotion(texto, "Personal", "2 · Important", "Captura autônoma via Telegram");
    if (okNovaTask) return enviarMensagemParaChat(chatId, "✅ *Tarefa salva no Inbox do Notion Tasks!*");
    enviarMensagemParaChat(chatId, "❌ Falha ao salvar no Notion. O pedido foi preservado na fila.");
    throw new Error("FALHA_NOTION_CRIAR_TAREFA");
  }

  if (decisao.intencao === "NOTION_DUVIDA") {
    var duvTexto = texto.replace(/^(?:minha\s+)?d[úu]vida(?:\s+para\s+o\s+medquest)?\s*[:=]?\s*/i, "").trim();
    var okDuv = salvarDuvidaEstudoNotion(duvTexto || texto);
    if (okDuv) return enviarMensagemParaChat(chatId, "🧠 *Dúvida arquivada no Notion para o MedQuest!*");
  }

  if (decisao.intencao === "EVIDENCIA_MEDICA") {
    enviarChatAction(chatId, "typing");
    var temaEv = texto.replace(/(?:qual\s+a\s+|o\s+que\s+diz\s+a\s+)?evid[êe]ncia\s+(?:para|sobre)?|artigos?\s+(?:sobre|de)?|estudos?\s+(?:sobre|de)?|pesquisar?\s+no\s+pubmed/gi, "").trim();
    var resEv = buscarEvidenciaMedica(temaEv || texto);
    return enviarMensagemParaChat(chatId, resEv);
  }

  if (decisao.intencao === "ENFERMARIA") {
    return enviarPainelEnfermaria(chatId, 0);
  }

  if (decisao.intencao === "SEGUNDA_MENTE") {
    var okNota = criarNotaSegundaMenteNotion(texto);
    if (okNota) return enviarMensagemParaChat(chatId, "💡 *Insight arquivado no Notion Second Brain!*");
  }

  // 6. CONVERSAÇÃO NATURAL E DÚVIDAS MÉDICAS EM LINGUAGEM NATURAL (GROQ / OPENROUTER)
  var contextoAnterior = contextoCache.get(contextoKey);
  var respostaConversa = gerarRespostaConversaClinica(texto, contextoAnterior);
  if (respostaConversa) {
    safePutCache(contextoCache, contextoKey, texto, 900);
    var cacheKeyConversa = Utilities.getUuid().replace(/-/g, "");
    safePutCache(CacheService.getScriptCache(), cacheKeyConversa, respostaConversa, 21600);
    var botoesConversa = {
      "inline_keyboard": [
        [
          {"text": "🎧 Ouvir no Fone", "callback_data": "ouvirPreceptor_" + cacheKeyConversa},
          {"text": "📁 Salvar no Notion", "callback_data": "salvarNotion_conversa_" + cacheKeyConversa}
        ]
      ]
    };
    return enviarMensagemComTecladoParaChat(chatId, respostaConversa, botoesConversa);
  }

  // Fallback conversacional
  enviarMensagemComTecladoFixo(chatId, "🤖 *Mensagem recebida.* Como posso te ajudar agora, Dr. Wagner? Envie seu caso clínico, dúvida, pedido de prescrição (/rx) ou peça resposta no fone.");
}

/**
 * Responde diretamente com Áudio de Voz Neural do Preceptor Socrático
 */
function responderPreceptorVozComIA(chatId, casoOuDuvida) {
  enviarChatAction(chatId, "record_voice");
  var provocacao = gerarProvocacaoPreceptorAudio(casoOuDuvida);
  if (!provocacao) {
    provocacao = "Diante deste quadro clínico, qual é a principal hipótese diagnóstica e a conduta imediata para descartar gravidade?";
  }
  var audioBlob = sintetizarVozPreceptor(provocacao);
  if (audioBlob) {
    var legenda = "🎧 *Preceptor Socrático:*\n" + provocacao;
    var enviado = enviarAudioVozTelegram(chatId, audioBlob, legenda);
    if (enviado) return true;
  }
  var cacheKey = Utilities.getUuid().replace(/-/g, "");
  safePutCache(CacheService.getScriptCache(), cacheKey, provocacao, 21600);
  var kb = { "inline_keyboard": [[{"text": "🎧 Ouvir no Fone", "callback_data": "ouvirPreceptor_" + cacheKey}]] };
  return enviarMensagemComTecladoParaChat(chatId, "🎧 *Preceptor Socrático:*\n\n" + provocacao, kb);
}

function validarReceitaTemMedicamentos(texto) {
  if (!texto || typeof texto !== "string") return false;

  var linhas = texto.split("\n");
  var temItemFarmacologicoReal = false;

  for (var i = 0; i < linhas.length; i++) {
    var l = linhas[i].trim();
    if (!l) continue;

    // Desconsidera orientações de exames, conduta geral, dieta e enfermagem sem medicamentos
    if (/^(?:(?:\d+[\.\)]|•|-)\s*)?(?:revisar|solicitar|pedir|checar|aguardar|colher|avaliar)\s+(?:exames?|laborat[oó]rio|tc|rx|eco|usg|imagem|laudo|parecer)\b/i.test(l)) {
      continue;
    }
    if (/^(?:(?:\d+[\.\)]|•|-)\s*)?(?:dieta|jejum|cabeceira|mudan[çc]a\s+de\s+dec[uú]bito|monitoriza[çc][ãa]o|sinais\s+vitais|glicemia\s+capilar|oxig[eê]nio|fisioterapia)\b/i.test(l)) {
      continue;
    }

    // Dosagem explícita com unidade médica estrita
    var temDosagemComUnidade = /\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ml|ui|unidades?|gotas?|cp|comprimidos?|ampolas?|frascos?|caps?|c[aá]psulas?)\b/i.test(l);
    // Posologia ou via de administração com limites léxicos estritos (\b)
    var temPosologiaOuVia = /\b(?:tomar|usar|aplicar|ingerir|via\s+oral|\bvo\b|\bev\b|\bim\b|\bsc\b|\biv\b|intravenos[ao]|intramuscular|subcut[aâ]ne[ao]|inalat[oó]ri[ao]|t[oó]pic[ao]|sublingual|\bsl\b|de\s+\d+\s*(?:em\s+\d+\s*)?h(?:oras?)?|\b\d+x\s*ao\s+dia\b|\b(?:1x|2x|3x|4x)\/dia\b|\b\d+\/\d+\s*h\b)\b/i.test(l);

    // Linha de prescrição contendo medicamento com dosagem e/ou posologia
    if (temDosagemComUnidade && (temPosologiaOuVia || /(?:^|\n)\s*(?:\d+[\.\)]|•|-)\s+[A-Za-zÀ-ÿ]{3,}/i.test(l))) {
      temItemFarmacologicoReal = true;
      break;
    }
  }

  return temItemFarmacologicoReal;
}

function processarEEntregarIA(chatId, funcaoGeradora, dados, tipoCache) {
  enviarChatAction(chatId, "typing");
  var resultado = funcaoGeradora(dados);
  if (resultado) {
    var strResultado = String(resultado);
    var cacheKey = Utilities.getUuid().replace(/-/g, "");
    safePutCache(CacheService.getScriptCache(), cacheKey, strResultado, 21600);

    var botoes = [];
    var limpo = typeof uxTextoProntuario === "function" ? uxTextoProntuario(strResultado) : strResultado.trim();

    // Ações primárias de alto valor (1 toque)
    var linhaPrimaria = [];
    if (limpo.length >= 1 && limpo.length <= 256) {
      linhaPrimaria.push({ "text": "📋 Copiar Texto Limpo", "copy_text": { "text": limpo } });
    } else {
      linhaPrimaria.push({ "text": "📋 Copiar Texto Limpo", "callback_data": "ux:copiar:" + cacheKey });
    }

    var ehErro = /❌|não foi possível|falha ao|erro ao acessar|erro:/i.test(strResultado);
    var ehIncompletoOuPendente = /⚠️\s*prescri[çc][ãa]o\s+incompleta|incomplet[ao]|pend[êe]ncia|informe\s+(?:o\s+)?(?:peso|alergia)|faltam?\s+(?:dados|informa)/i.test(strResultado);
    var temItensFarmacologicos = validarReceitaTemMedicamentos(strResultado);
    var elegivelPdfRx = (tipoCache === "rx") && !ehErro && !ehIncompletoOuPendente && temItensFarmacologicos;

    if (elegivelPdfRx) {
      linhaPrimaria.push({ "text": "📄 Gerar PDF da Receita", "callback_data": "gerarPdfRx_" + cacheKey });
    } else if (tipoCache !== "rx" && !ehErro) {
      linhaPrimaria.push({ "text": "📁 Salvar no Notion Tasks", "callback_data": "salvarNotion_" + tipoCache + "_" + cacheKey });
    }
    botoes.push(linhaPrimaria);

    var linhaSecundaria = [];
    if (elegivelPdfRx) {
      linhaSecundaria.push({ "text": "📁 Salvar no Notion Tasks", "callback_data": "salvarNotion_" + tipoCache + "_" + cacheKey });
    }

    if (tipoCache === "plantao" && !ehErro) {
      linhaSecundaria.push({ "text": "👨‍⚕️ Pitch do Round (60s)", "callback_data": "gerarRound_" + cacheKey });
    }

    if ((tipoCache === "round" || tipoCache === "soap" || tipoCache === "plantao") && !ehErro) {
      linhaSecundaria.push({ "text": "🎧 Ouvir no Fone", "callback_data": "ouvirPreceptor_" + cacheKey });
    }

    if (linhaSecundaria.length) botoes.push(linhaSecundaria);

    var tecladoSalvar = { "inline_keyboard": botoes };
    var textoFinal = "*" + tipoCache.toUpperCase() + " · Resumo Clínico*\n\n" + String(resultado);

    if (textoFinal.length <= 3900) {
      enviarMensagemComTecladoParaChat(chatId, textoFinal, tecladoSalvar);
    } else {
      enviarMensagemSegmentada(chatId, textoFinal, tecladoSalvar);
    }
  } else {
    enviarMensagemParaChat(chatId, "⚠️ Erro ao processar a resposta com a IA.");
  }
}

function processarCallbackBotao(cb) {
  if (typeof tratarCallbackUX!=="undefined" && tratarCallbackUX(cb)) return;
  var data = cb.data || "";
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");

  // Vincula o registro à data original da mensagem ou usa a data atual se não informada
  var dataReferencia = (cb.message && cb.message.date) ? new Date(cb.message.date * 1000) : new Date();
  var dataAlvoISO = Utilities.formatDate(dataReferencia, tz, "yyyy-MM-dd");

  // A. HÁBITOS E ENERGIA
  if (data.startsWith("habit_") || data.startsWith("energy_")) {
    responderCallbackTelegram(cb.id, "Salvando no Notion...");

    var pageId = obterOuCriarPaginaHabitLog(dataAlvoISO);
    if (!pageId) {
      responderCallbackTelegram(cb.id, "⚠️ Falha ao acessar o Habit Log do Notion.");
      return;
    }

    var kb = cb.message && cb.message.reply_markup ? cb.message.reply_markup.inline_keyboard : null;
    var valorStatus = true;

    if (kb) {
      for (var i = 0; i < kb.length; i++) {
        for (var j = 0; j < kb[i].length; j++) {
          var btn = kb[i][j];
          if (btn.callback_data === data) {
            if (data.startsWith("habit_")) {
              if (btn.text.indexOf("✅") !== -1) {
                valorStatus = false;
              } else {
                valorStatus = true;
              }
            }
          }
        }
      }
    }

    var gravouComSucesso = false;
    if (data.startsWith("habit_")) {
      var propName = "";
      if (data === "habit_medquest") propName = "🧠 MedQuest";
      else if (data === "habit_gym") propName = "🏋️ Academia";
      else if (data === "habit_english") propName = "📚 Inglês";
      else if (data === "habit_guitar") propName = "🎸 Violão";
      else if (data === "habit_love") propName = "❤️ Namorada";
      else if (data === "habit_reading") propName = "📖 Leitura";

      if (propName) {
        gravouComSucesso = atualizarCheckboxNotion(pageId, propName, valorStatus);
      }
    } else if (data.startsWith("energy_")) {
      var valorEnergia = parseInt(data.replace("energy_", ""), 10);
      gravouComSucesso = atualizarNumeroNotion(pageId, "⚡ Energia (1–5)", valorEnergia);
    }

    // Atualiza a indicação visual no Telegram SOMENTE após o sucesso da escrita no Notion
    if (!!gravouComSucesso && kb && cb.message && cb.message.chat) {
      for (var ki = 0; ki < kb.length; ki++) {
        for (var kj = 0; kj < kb[ki].length; kj++) {
          var kbtn = kb[ki][kj];
          if (kbtn.callback_data === data) {
            if (data.startsWith("habit_")) {
              if (valorStatus) {
                if (kbtn.text.indexOf("✅") === -1) kbtn.text = "✅ " + kbtn.text;
              } else {
                kbtn.text = kbtn.text.replace("✅ ", "");
              }
            } else if (data.startsWith("energy_")) {
              kbtn.text = "✅ " + kbtn.text.replace("✅ ", "");
            }
          } else if (data.startsWith("energy_") && kbtn.callback_data.startsWith("energy_")) {
            kbtn.text = kbtn.text.replace("✅ ", "");
          }
        }
      }
      var token = ConfigService.get("TELEGRAM_BOT_TOKEN");
      executarPostTelegram("https://api.telegram.org/bot" + token + "/editMessageReplyMarkup", {
        "chat_id": cb.message.chat.id,
        "message_id": cb.message.message_id,
        "reply_markup": { "inline_keyboard": kb }
      });
      responderCallbackTelegram(cb.id, "✅ Registrado no Notion!");
    } else if (!gravouComSucesso) {
      responderCallbackTelegram(cb.id, "⚠️ Erro ao salvar registro no Notion.");
    }
  }
  // B. GERAR ROUND DIRETO DO PLANTÃO SBAR
  else if (data.startsWith("gerarRound_")) {
    var cacheKeyRound = data.replace("gerarRound_", "");
    var conteudoPlantao = CacheService.getScriptCache().get(cacheKeyRound);
    if (conteudoPlantao) {
      responderCallbackTelegram(cb.id, "Gerando Pitch do Round...");
      processarEEntregarIA(cb.message.chat.id, gerarPitchERoundComIA, conteudoPlantao, "round");
    } else {
      responderCallbackTelegram(cb.id, "⚠️ Dados do plantão expirados.");
    }
  }
  // C. MENU E CATEGORIAS DE CALCULADORAS
  else if (data === "calc_menu_principal") {
    responderCallbackTelegram(cb.id, "");
    enviarMenuCategoriasCalculadoras(cb.message.chat.id, cb.message.message_id);
  }
  else if (data.startsWith("calc_cat_")) {
    responderCallbackTelegram(cb.id, "");
    enviarSubmenuCalculadoras(cb.message.chat.id, cb.message.message_id, data);
  }
  // D. CALCULADORAS v3.0 — FORMATO calc:<id>:<acao>
  else if (data.startsWith("calc:")) {
    responderCallbackTelegram(cb.id, "");
    var chatIdCb = (cb.message && cb.message.chat && cb.message.chat.id) ? cb.message.chat.id : cb.from.id;
    var segs = data.split(":");
    // segs[0] = "calc", segs[1] = id, segs[2] = acao, segs[3+] = args opcionais
    if (segs.length < 3) {
      enviarMensagemParaChat(chatIdCb, "⚠️ Callback de calculadora inválido.");
      return;
    }
    var calcId = segs[1];
    var calcAcao = segs[2];
    var calcArgs = segs.slice(3);
    try {
      if (typeof CalculadorasClinicas !== "undefined" && typeof CalculadorasClinicas.processarAcao === "function") {
        var resAcao = CalculadorasClinicas.processarAcao(chatIdCb, calcId, calcAcao, calcArgs);
        if (resAcao && resAcao.textoFormatado) {
          if (resAcao.botoes) {
            enviarMensagemComTecladoParaChat(chatIdCb, resAcao.textoFormatado, { inline_keyboard: resAcao.botoes });
          } else {
            enviarMensagemParaChat(chatIdCb, resAcao.textoFormatado);
          }
        }
      } else {
        enviarMensagemParaChat(chatIdCb, "⚠️ Módulo de calculadoras indisponível.");
      }
    } catch (eCalcCb) {
      Logger.log("Erro callback calc:: " + eCalcCb.message);
      enviarMensagemParaChat(chatIdCb, "⚠️ Erro ao processar ação da calculadora.");
    }
    return;
  }
  // D. SELEÇÃO DIRETA DE CALCULADORA (legado calc_)
  else if (data.startsWith("calc_")) {
    var tipoCalc = data.replace("calc_", "");
    var chatId = (cb.message && cb.message.chat && cb.message.chat.id) ? cb.message.chat.id : cb.from.id;

    var contextoCache = CacheService.getScriptCache();
    var contextoKey = "ctx_" + chatId;
    safePutCache(contextoCache, contextoKey, "/calc Calculadora selecionada: " + tipoCalc + "\nDados do paciente: ", 900);

    if(typeof definirModoBot!=="undefined")definirModoBot(chatId,"calc","Calculadora selecionada: "+tipoCalc+"\nDados do paciente: ");
    responderCallbackTelegram(cb.id, "Calculadora " + tipoCalc + " selecionada");
    var instrucoes = obterInstrucoesCalculadora(tipoCalc);
    enviarMensagemParaChat(chatId, instrucoes);
  }
  // E. ARQUIVAMENTO NO NOTION TASKS
  else if (data.startsWith("salvarNotion_")) {
    var partes = data.split("_");
    var tipo = partes[1];
    var cacheKey = partes.slice(2).join("_");

    var cache = CacheService.getScriptCache();
    var conteudo = cache.get(cacheKey);

    if(cache.get("saved_"+cacheKey)) { responderCallbackTelegram(cb.id,"Já salvo no Notion.");return; }
    if (conteudo) {
      responderCallbackTelegram(cb.id, "Arquivando no Notion...");
      var tituloNotion = "";
      if (tipo === "soap") tituloNotion = "Caso Clínico SOAP";
      else if (tipo === "rx") tituloNotion = "Prescrição Ambulatorial";
      else if (tipo === "plantao") tituloNotion = "Passagem de Plantão SBAR";
      else if (tipo === "round") tituloNotion = "Pitch & Round Socrático";
      else if (tipo === "gaso") tituloNotion = "Gasometria Arterial";
      else if (tipo === "conduta") tituloNotion = "Conduta de Emergência";
      else if (tipo === "audio") tituloNotion = "Registro Clínico por Áudio";
      else if (tipo === "imagem") tituloNotion = "Análise de Imagem/ECG";
      else if (tipo === "calc") tituloNotion = "Calculadora Clínica";
      else if (tipo === "interacao") tituloNotion = "Análise de Interação Medicamentosa";
      else tituloNotion = "Anotação Clínica";

      tituloNotion += " · " + Utilities.formatDate(new Date(), tz, "dd/MM HH:mm");

      var sucesso = criarTarefaNotion(tituloNotion, "Internship", "2 · Important", conteudo);
      if (sucesso) {
        enviarMensagemParaChat(cb.message.chat.id, "📁 Arquivado no Notion Tasks com sucesso!");
        var kbRestante=cb.message.reply_markup && cb.message.reply_markup.inline_keyboard;
        if(kbRestante) {
          kbRestante=kbRestante.map(function(row){return row.filter(function(b){return b.callback_data!==data;});}).filter(function(row){return row.length;});
          executarPostTelegram("https://api.telegram.org/bot"+ConfigService.get("TELEGRAM_BOT_TOKEN")+"/editMessageReplyMarkup",{chat_id:cb.message.chat.id,message_id:cb.message.message_id,reply_markup:{inline_keyboard:kbRestante}});
        }
        safePutCache(cache,"saved_"+cacheKey,"1",21600);
      } else {
        enviarMensagemParaChat(cb.message.chat.id, "❌ Falha ao salvar no Notion. Tente novamente.");
      }
    } else {
      responderCallbackTelegram(cb.id, "⚠️ Conteúdo expirado.");
      removerBotaoInline(cb);
    }
  }
  // F. GERAR PDF OFICIAL DA RECEITA NO DRIVE
  else if (data.startsWith("gerarPdfRx_")) {
    var cacheKeyPdf = data.replace("gerarPdfRx_", "");
    var conteudoPrescricao = CacheService.getScriptCache().get(cacheKeyPdf);
    if (conteudoPrescricao) {
      responderCallbackTelegram(cb.id, "Gerando receituário A4 em PDF...");
      var resPdf = ReceitaPdfService.processarEEnviarPdf(cb.message.chat.id, conteudoPrescricao);
      if (resPdf && resPdf.sucesso === false) {
        return false;
      }
      return true;
    } else {
      responderCallbackTelegram(cb.id, "⚠️ Prescrição expirada do cache.");
      return false;
    }
  }
  // G. OUVIR CRÍTICA SOCRÁTICA DO PRECEPTOR VIA ÁUDIO / TTS
  else if (data.startsWith("ouvirPreceptor_")) {
    var cacheKeyVoz = data.replace("ouvirPreceptor_", "");
    var conteudoCaso = CacheService.getScriptCache().get(cacheKeyVoz);
    if (conteudoCaso) {
      responderCallbackTelegram(cb.id, "Sintetizando crítica socrática em áudio...");
      enviarChatAction(cb.message.chat.id, "record_voice");
      var criticaTexto = gerarCriticaSocraticaPreceptor(conteudoCaso);
      var blobAudio = sintetizarVozPreceptor(criticaTexto);
      if (blobAudio) {
        enviarAudioVozTelegram(cb.message.chat.id, blobAudio, "🎧 *Preceptor Socrático:*\n" + criticaTexto);
      } else {
        enviarMensagemParaChat(cb.message.chat.id, "🎧 *Preceptor Socrático:*\n" + criticaTexto);
      }
    } else {
      responderCallbackTelegram(cb.id, "⚠️ Caso expirado do cache.");
    }
  }
  // H. AÇÕES RÁPIDAS DA ENFERMARIA
  else if (data === "enfermaria_passagem") {
    responderCallbackTelegram(cb.id, "Consolidando passagem SBAR...");
    var textoLeitos = EnfermariaService.obterTextoConsolidadoParaPassagem();
    if (!textoLeitos) {
      return enviarMensagemParaChat(cb.message.chat.id, "🏥 *Nenhum leito registrado na enfermaria para passar.* Registre os leitos usando `/leito <num> <dados>` antes de gerar a passagem.");
    }
    return processarEEntregarIA(cb.message.chat.id, gerarPassagemPlantaoSBAR, textoLeitos, "plantao");
  }
  else if (data === "enfermaria_atualizar") {
    responderCallbackTelegram(cb.id, "Quadro atualizado.");
    var kbAtualizar = {
      "inline_keyboard": [
        [
          {"text": "📋 Gerar Passagem SBAR", "callback_data": "enfermaria_passagem"},
          {"text": "🔄 Atualizar", "callback_data": "enfermaria_atualizar"}
        ]
      ]
    };
    return enviarPainelEnfermaria(cb.message.chat.id,0,cb.message.message_id);
  }
  // Z. CATCH-ALL PARA CALLBACKS NÃO RECONHECIDOS
  else {
    responderCallbackTelegram(cb.id, "⚠️ Ação não reconhecida.");
  }
}

function processarMensagemVoz(message) {
  var chatId = (message.chat && message.chat.id) ? message.chat.id : ConfigService.get("TELEGRAM_CHAT_ID");
  // Feedback imediato: transcrição + IA
  enviarChatAction(chatId, "typing");
  try {
    var midia = baixarMidiaTelegram(message.voice || message.audio);
    if (!midia || !midia.data) {
      return enviarMensagemParaChat(chatId, "⚠️ Não foi possível baixar o áudio do Telegram.");
    }

    // 1. Transcrição literal
    var promptTrans = "Transcreva fielmente o áudio em português do Brasil com pontuação correta. Não acrescente introdução ou inferência. Retorne somente a transcrição literal.";
    var transcricao = chamarGeminiPoolMultimodal(midia.data, midia.mime, promptTrans, "");
    if (transcricao && transcricao.trim()) {
      var tLimpo = transcricao.trim();
      var querVoz = /(?:me\s+)?respond(?:a|e)\s+(?:com\s+|em\s+)?(?:um\s+)?[áa]udio|no\s+fone|fala\s+comigo|preceptor\s+socr[áa]tico|sabatina|manda\s+[áa]udio/i.test(tLimpo);

      if (querVoz) {
        var casoAudio = tLimpo.replace(/(?:me\s+)?respond(?:a|e)\s+(?:com\s+|em\s+)?(?:um\s+)?[áa]udio|no\s+fone|fala\s+comigo|preceptor\s+socr[áa]tico|sabatina|manda\s+[áa]udio/gi, "").trim();
        var contextoCache = CacheService.getScriptCache();
        var contextoKey = "ctx_" + chatId;
        if (!casoAudio || casoAudio.length < 5) {
          casoAudio = contextoCache.get(contextoKey) || tLimpo;
        } else {
          safePutCache(contextoCache, contextoKey, casoAudio, 900);
        }
        return responderPreceptorVozComIA(chatId, casoAudio);
      }

      // Roteia a transcrição para o processador semântico de linguagem natural
      return processarMensagemTexto({chat: {id: chatId}, text: tLimpo});
    }

    // 2. Fallback multimodal direto caso a transcrição simples retorne vazia
    var promptSistema =
      "Você é o Copiloto Clínico Sênior e Assistente Pessoal Inteligente do Dr. Wagner (FMRP-USP).\n" +
      "Você recebeu este áudio gravado diretamente no celular pelo médico nos corredores do hospital ou em trânsito.\n\n" +
      "DIRETRIZES DE PROCESSAMENTO:\n" +
      "1. Se for RELATO CLÍNICO (caso de paciente, anamnese, exame físico, receita, conduta ou passagem de plantão):\n" +
      "   • EXTRAIA minuciosamente os dados clínicos e GERE UM DOCUMENTO ESTRUTURADO em formato SOAP, Receita Ambulatorial ou Passagem SBAR com rigor semiológico.\n" +
      "   • Organize os dados com terminologia clínica clara e padronizada.\n\n" +
      "2. Se for AGENDAMENTO DE COMPROMISSO (ex: 'marcar plantão amanhã às 7h no HC'):\n" +
      "   • Destaque no topo: [CALENDAR] com Título, Data, Horário de Início e Término.\n\n" +
      "3. Se for RELATO DE HÁBITO CUMPRIDO (ex: 'treinei na academia', 'estudei medquest'):\n" +
      "   • Destaque o cumprimento do hábito.\n\n" +
      "4. Se for TAREFA RÁPIDA: Estruture a ação com clareza para registro.\n\n" +
      "NUNCA use formatação LaTeX ($). Retorne a resposta em Markdown limpo e legível.";

    var caption = message.caption ? "Contexto adicional do usuário: " + message.caption : "";

    var resultadoAudio = chamarGeminiPoolMultimodal(midia.data, midia.mime, promptSistema, caption);
    if (resultadoAudio) {
      // 1. Marca hábitos proativamente se citados no áudio
      marcarHabitoProativoHoje(resultadoAudio);

      // 2. Se o áudio for de agendamento do Calendar, tenta criar automaticamente
      if (resultadoAudio.indexOf("[CALENDAR]") !== -1 || resultadoAudio.toLowerCase().indexOf("marcar") !== -1 || resultadoAudio.toLowerCase().indexOf("agendar") !== -1) {
        var evDados = extrairDadosEventoCalendario(resultadoAudio);
        if (evDados && evDados.titulo && evDados.dataInicio) {
          var evCriado = criarEventoAgendaGoogle(evDados.titulo, evDados.dataInicio, evDados.dataFim, evDados.local, evDados.descricao);
          if (evCriado && evCriado.sucesso) {
            return enviarMensagemParaChat(chatId, evCriado.mensagem);
          }
        }
      }

      // Unificar com o wrapper de IA (mesmos botões de SOAP/RX/Copiar texto)
      return processarEEntregarIA(chatId, function(dados) { return dados; }, resultadoAudio, "audio");
    } else {
      enviarMensagemParaChat(chatId, "⚠️ Falha ao processar áudio com IA.");
    }
  } catch (err) {
    Logger.log("Erro no processamento de voz: " + err.message);
    enviarMensagemParaChat(chatId, "⚠️ Erro ao processar áudio.");
  }
}

function processarMensagemFoto(message) {
  var chatId = (message.chat && message.chat.id) ? message.chat.id : ConfigService.get("TELEGRAM_CHAT_ID");
  enviarChatAction(chatId, "upload_photo");
  enviarMensagemParaChat(chatId, "📸 *Analisando imagem médica...*");
  try {
    var photos = message.photo;
    var midia = baixarMidiaTelegram(photos[photos.length - 1]);
    var promptSistema = "Você é um Preceptor de Clínica Médica, Cardiologia e Radiologia da FMRP-USP. Analise detalhadamente a imagem clínica fornecida (ECG, Raio-X, Exames Laboratoriais, Lesão de pele). Forneça um laudo estruturado: 1. Descrição dos achados, 2. Hipóteses Diagnósticas, 3. Condutas sugeridas baseadas em diretrizes.";
    var caption = message.caption ? "Contexto do usuário: " + message.caption : "";

    var resultadoImagem = chamarGeminiPoolMultimodal(midia.data, midia.mime, promptSistema, caption);
    if (resultadoImagem) {
      var cacheKey = Utilities.getUuid().replace(/-/g, "");
      safePutCache(CacheService.getScriptCache(), cacheKey, resultadoImagem, 21600);
      safePutCache(CacheService.getScriptCache(), "ctx_" + chatId, resultadoImagem, 900);
      var tecladoSalvar = { "inline_keyboard": [[{"text": "📁 Salvar Laudo no Notion", "callback_data": "salvarNotion_imagem_" + cacheKey}]] };
      enviarMensagemComTecladoParaChat(chatId, resultadoImagem, tecladoSalvar);
    } else {
      enviarMensagemParaChat(chatId, "⚠️ Erro ao analisar imagem.");
    }
  } catch (err) {
    Logger.log("Erro no processamento de foto: " + err.message);
    enviarMensagemParaChat(chatId, "⚠️ Erro ao processar imagem.");
  }
}

function baixarMidiaTelegram(arquivoBase) {
  var token = ConfigService.get("TELEGRAM_BOT_TOKEN");
  var res = UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/getFile?file_id=" + arquivoBase.file_id, { "muteHttpExceptions": true });
  var json = JSON.parse(res.getContentText());
  var path = json.result.file_path;
  var blob = UrlFetchApp.fetch("https://api.telegram.org/file/bot" + token + "/" + path).getBlob();

  var mime = blob.getContentType();
  if (!mime || mime === "application/octet-stream") {
    var p = path.toLowerCase();
    if (p.endsWith(".jpg") || p.endsWith(".jpeg")) mime = "image/jpeg";
    else if (p.endsWith(".png")) mime = "image/png";
    else if (p.endsWith(".oga") || p.endsWith(".ogg")) mime = "audio/ogg";
    else if (p.endsWith(".mp3")) mime = "audio/mp3";
    else if (p.endsWith(".mp4")) mime = "video/mp4";
    else if (p.endsWith(".pdf")) mime = "application/pdf";
    else mime = "image/jpeg";
  }

  return { data: Utilities.base64Encode(blob.getBytes()), mime: mime };
}

function ehApenasNomeCalculadora(texto) {
  var s = (texto || "").trim().toLowerCase();
  var nomesConhecidos = [
    "curb", "curb65", "curb-65", "crb65", "crb-65",
    "ckd", "ckd-epi", "ckdepi", "cockcroft", "clearence", "tfg",
    "wells", "tep", "tvp",
    "sofa", "qsofa",
    "cha2ds2", "chads", "chadvasc", "cha2ds2-vasc",
    "hasbled", "has-bled",
    "heart", "timi", "heart-timi",
    "grace",
    "meld", "child", "child-pugh", "childpugh",
    "glasgow", "glasgow-p",
    "nihss", "nih", "avc",
    "ranson", "bisap",
    "framingham",
    "frax",
    "apache", "apache2", "apache ii", "apache-2",
    "agua", "deficit agua", "deficit", "hipernatremia",
    "ldl", "martin", "hopkins", "martin-hopkins"
  ];
  return nomesConhecidos.indexOf(s) !== -1;
}

function ehCalculadoraReconhecida(texto) {
  if (!texto || typeof texto !== "string") return false;
  var t = texto.toLowerCase();
  return /\b(?:meld|clearance|cockcroft|tfg|creatinina|cha2?ds2|vasc|curb|curb-?65|glasgow|kdigo|sri|intuba[çc][ãa]o|nora|noradrenalina|vaso|vasopressina|dobuta|dobutamina)\b/i.test(t);
}

function tentarCalcularDeterministico(texto) {
  if (!texto || typeof CalculadorasClinicas === "undefined") return null;
  var t = texto.toLowerCase();

  // 1. MELD / MELD-Na (Prioritário para evitar colisão com "cr" de clearance)
  if (/\bmeld\b/i.test(t) && CalculadorasClinicas.meld) {
    var mBili = t.match(/bili(?:rrubina)?\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mInr = t.match(/inr\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mCrM = t.match(/cr(?:eatinina)?\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mNa = t.match(/(?:s[oó]dio|na)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);

    // Diálise: Negação rigorosa antes de qualquer positivo
    var dial = false;
    var temNaoDial = /(?:sem|n[aã]o\s+faz|n[aã]o\s+realiza|n[aã]o\s+est[aá]\s+em|n[aã]o|nunca)\s+(?:hemo)?di[aá]lise|n[aã]o\s+dial[ií]tico/i.test(t);
    if (temNaoDial) {
      dial = false;
    } else if (/(?:com|em|faz|realiza)\s+(?:hemo)?di[aá]lise|dial[ií]tico|\bhemodi[aá]lise\b/i.test(t)) {
      dial = true;
    }

    if (!mBili || !mInr || !mCrM) {
      var faltasMeld = [];
      if (!mBili) faltasMeld.push("Bilirrubina total (mg/dL)");
      if (!mCrM) faltasMeld.push("Creatinina sérica (mg/dL)");
      if (!mInr) faltasMeld.push("INR");
      return "⚠️ *Calculadora MELD / MELD-Na Incompleta*\n\n" +
             "Para calcular o escore com segurança clínica, informe os parâmetros obrigatórios:\n" +
             "• " + faltasMeld.join("\n• ") + "\n\n" +
             "💡 *Exemplo:* `/calc MELD bili 2.0, cr 1.5, inr 1.2, sódio 135` (e diálise na última semana se houver).";
    }

    var bili = parseFloat(mBili[1].replace(",", "."));
    var inr = parseFloat(mInr[1].replace(",", "."));
    var crm = parseFloat(mCrM[1].replace(",", "."));
    var na = (mNa && mNa[1]) ? parseFloat(mNa[1].replace(",", ".")) : null;
    var rm = CalculadorasClinicas.meld(bili, crm, inr, na, dial);
    if (rm && rm.ok) {
      return "🧮 *" + rm.nome + "*\n\n• *Score:* `" + rm.principal + "`\n• *Alerta:* " + (rm.rotulo || "Padrão");
    } else {
      var erroMsg = (rm && rm.erro) ? rm.erro : "Valores laboratoriais inválidos ou fora da faixa plausível.";
      return "⚠️ *Calculadora MELD: Parâmetros Inválidos*\n\n" + erroMsg + "\n\n💡 *Faixas válidas:* Bilirrubina ≥ 1,0 mg/dL, Creatinina ≥ 1,0 mg/dL (máx 4,0), INR ≥ 1,0.";
    }
  }

  // 2. Clearance de Creatinina (Cockcroft-Gault)
  if (!/\bmeld\b/i.test(t) && (/clearance|cockcroft|tfg/i.test(t) || (/cr(?:eatinina)?\b/i.test(t) && /peso/i.test(t)))) {
    var mCr = t.match(/(?:cr(?:eatinina)?|cre)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mPeso = t.match(/(?:peso\s*[:=]?\s*)?(\d+(?:[.,]\d+)?)\s*kg\b/i) || t.match(/peso\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mIdade = t.match(/idade\s*[:=]?\s*(\d+)/i) || t.match(/(\d+)\s*a(?:nos)?\b/i);

    var temFem = /fem(?:inino)?|mulher|\bf\b/i.test(t);
    var temMasc = /masc(?:ulino)?|homem|\bm\b/i.test(t);
    if (!temFem && !temMasc) {
      return "⚠️ *Clearance de Creatinina (Cockcroft-Gault)*\n\nPor favor, informe o sexo biológico do paciente (masculino ou feminino). O cálculo exige essa distinção para precisão clínica (fator de correção de 0,85 para mulheres).";
    }
    var ehMulher = temFem && !temMasc;

    if (!mCr || !mPeso || !mIdade) {
      var faltasCg = [];
      if (!mCr) faltasCg.push("Creatinina sérica (mg/dL)");
      if (!mPeso) faltasCg.push("Peso corporal (kg)");
      if (!mIdade) faltasCg.push("Idade (anos)");
      return "⚠️ *Clearance de Creatinina Incompleto*\n\n" +
             "Para estimar a taxa de filtração por Cockcroft-Gault, informe:\n" +
             "• " + faltasCg.join("\n• ") + "\n\n" +
             "💡 *Exemplo:* `/calc clearance Cr 1.2, peso 70 kg, 65 anos, masculino`";
    }

    if (CalculadorasClinicas.cockcroftGault) {
      var cr = parseFloat(mCr[1].replace(",", "."));
      var peso = parseFloat(mPeso[1].replace(",", "."));
      var idade = parseInt(mIdade[1], 10);
      var r = CalculadorasClinicas.cockcroftGault(cr, peso, idade, ehMulher);
      if (r && r.ok) {
        var str = "🧮 *" + (r.nome || "CLEARANCE DE CREATININA (COCKCROFT-GAULT)") + "*\n\n";
        str += "• *Resultado:* `" + r.principal + "`\n";
        if (r.rotulo) str += "• *Alerta:* " + r.rotulo + "\n";
        if (r.secoes) {
          for (var s = 0; s < r.secoes.length; s++) {
            var sec = r.secoes[s];
            str += "\n*" + sec[0] + ":*\n";
            var itens = Array.isArray(sec[1]) ? sec[1] : [sec[1]];
            for (var it = 0; it < itens.length; it++) {
              str += "  • " + itens[it] + "\n";
            }
          }
        }
        return str;
      } else {
        var erroCg = (r && r.erro) ? r.erro : "Valores laboratoriais ou antropométricos fora dos limites biológicos plausíveis.";
        return "⚠️ *Calculadora Clearance: Parâmetros Inválidos*\n\n" + erroCg + "\n\n💡 *Faixas válidas:* Creatinina ≥ 0,1 mg/dL, Peso ≥ 20 kg, Idade ≥ 18 anos.";
      }
    }
  }

  // 3. CHA2DS2-VASc Determinístico
  if (/cha2?ds2|vasc/i.test(t) && CalculadorasClinicas.cha2ds2vasc) {
    var temFemC = /\b(?:mulher|fem(?:inino)?|f)\b/i.test(t);
    var temMascC = /\b(?:homem|masc(?:ulino)?|m)\b/i.test(t);
    var mIdadeC = t.match(/(\d+)\s*a(?:nos)?\b/) || t.match(/idade\s*[:=]?\s*(\d+)/i);
    var idadeC = mIdadeC ? parseInt(mIdadeC[1], 10) : null;

    // Se não há dados mínimos (idade ou sexo ausentes), exige parâmetros obrigatórios
    if (idadeC === null || (!temFemC && !temMascC)) {
      return "⚠️ *Calculadora CHA₂DS₂-VASc (Risco Tromboembólico na FA)*\n\n" +
             "Para calcular o escore com segurança clínica, informe no mínimo:\n" +
             "• *Idade* do paciente (anos)\n" +
             "• *Sexo biológico* (homem ou mulher)\n" +
             "• *Fatores de risco* presentes ou ausentes (IC, HAS, DM, AVC/AIT prévio, Doença Vascular).\n\n" +
             "💡 *Exemplo:* `/calc CHA2DS2-VASc mulher, 68 anos, hipertensa, diabética, sem IC, sem AVC`";
    }

    // Detecção de histórico/antecedentes/comorbidades desconhecidos (V01)
    var temFatoresDesconhecidos = /(?:antecedentes?|fatores?|comorbidades?|hist[oó]rico|doen[çc]as?)\s+(?:desconhecid[ao]s?|n[aã]o\s+informad[ao]s?|incert[ao]s?|d[uú]vidos[ao]s?|ignorad[ao]s?)|n[aã]o\s+sabe\s+(?:antecedentes|comorbidades|hist[oó]rico|fatores)|hist[oó]rico\s+desconhecido|sem\s+informa[çc][ãa]o\s+de\s+(?:antecedentes|comorbidades|fatores)|\bdesconhecid[ao]s?\b/i.test(t);
    if (temFatoresDesconhecidos) {
      return "⚠️ *Calculadora CHA₂DS₂-VASc: Antecedentes Desconhecidos*\n\n" +
             "Não é seguro calcular o escore com comorbidades desconhecidas. Subestimar o risco tromboembólico pode privar o paciente de anticoagulação indicada para prevenção de AVC.\n\n" +
             "Para calcular o escore com segurança clínica, informe a presença ou ausência dos fatores de risco:\n" +
             "• *IC:* Insuficiência Cardíaca Congestiva / Disfunção de VE\n" +
             "• *HAS:* Hipertensão Arterial Sistêmica\n" +
             "• *DM:* Diabetes Mellitus\n" +
             "• *AVC/AIT:* Tromboembolismo ou AVC prévio\n" +
             "• *Doença Vascular:* IAM prévio, DAOP ou placa aórtica\n\n" +
             "💡 *Exemplo:* `/calc CHA2DS2-VASc homem, 60 anos, sem HAS, sem DM, sem AVC, sem IC, sem doença vascular` (ou informe se for previamente hígido/sem comorbidades).";
    }

    // Se nenhum fator foi mencionado (positivo ou negativamente), exige confirmação dos fatores
    var temMencaoFatores = /(?:ic|insufici[êe]ncia|has|hipertens|dm|diab[eé]t|avc|ait|stroke|trombo|vascular|iam|infarto|daop|coronario|comorbidade|fator|antecedente|h[íi]gid[ao]|doen[çc]a)/i.test(t);
    if (!temMencaoFatores) {
      return "⚠️ *Calculadora CHA₂DS₂-VASc (Risco Tromboembólico na FA)*\n\n" +
             "Para calcular o escore com segurança clínica, informe a presença ou ausência dos fatores de risco:\n" +
             "• *IC:* Insuficiência Cardíaca Congestiva / Disfunção de VE\n" +
             "• *HAS:* Hipertensão Arterial Sistêmica\n" +
             "• *DM:* Diabetes Mellitus\n" +
             "• *AVC/AIT:* Tromboembolismo ou AVC prévio\n" +
             "• *Doença Vascular:* IAM prévio, DAOP ou placa aórtica\n\n" +
             "💡 *Exemplo:* `/calc CHA2DS2-VASc homem, 60 anos, sem HAS, sem DM, sem AVC, sem IC, sem doença vascular` (ou informe se for previamente hígido/sem comorbidades).";
    }

    var ehMulherC = temFemC && !temMascC;
    var i75C = (idadeC >= 75);
    var i65C = (idadeC >= 65 && idadeC < 75);

    // Extrai trechos sob negação delimitados (para antes de conectivos adversativos/afirmativos: "mas", "porém", etc.)
    var trechosNegativos = [];
    var regexNegLista = /(?:sem|n[aã]o\s+tem|n[aã]o\s+apresenta|n[aã]o|nega|aus[êe]ncia\s+de)\s+([^.;\n]+?)(?=\b(?:mas|por[eé]m|contudo|todavia|entretanto|no\s+entanto|exceto|salvo|com|apresenta|tem|possui)\b|[.;\n]|$)/gi;
    var matchNeg;
    while ((matchNeg = regexNegLista.exec(t)) !== null) {
      trechosNegativos.push(matchNeg[1]);
    }
    var textoNegativo = trechosNegativos.join(" ; ");
    var semComorbidadesGeral = /\b(?:sem\s+comorbidades?|sem\s+fatores?|sem\s+antecedentes?|h[íi]gid[ao]|previamente\s+h[íi]gid[ao])\b/i.test(t);

    // Cláusulas afirmativas pós-adversativas (ex: "mas HAS", "porém diabético")
    var trechosAdversativos = [];
    var regexAdv = /\b(?:mas|por[eé]m|contudo|todavia|entretanto|no\s+entanto|exceto|salvo)\s+([^.;\n]+)/gi;
    var matchAdv;
    while ((matchAdv = regexAdv.exec(t)) !== null) {
      trechosAdversativos.push(matchAdv[1]);
    }
    var textoAdversativo = trechosAdversativos.join(" ; ");

    // HAS
    var hasPos = /\b(?:has|hipertens[aã]o|hipertenso|hipertensa|press[aã]o\s+alta|pa\s*(?:elevada|>))\b/i.test(t);
    var hasAdv = /\b(?:has|hipertens[aã]o|hipertenso|hipertensa|press[aã]o\s+alta)\b/i.test(textoAdversativo);
    var hasNeg = !hasAdv && (semComorbidadesGeral || /(?:sem|n[aã]o|nega)\s+(?:has|hipertens[aã]o|hipertenso|hipertensa|press[aã]o\s+alta)|\bnormotens[ao]\b/i.test(t) || /\b(?:has|hipertens[aã]o|hipertenso|hipertensa|press[aã]o\s+alta)\b/i.test(textoNegativo));
    var hasC = hasAdv || (hasPos && !hasNeg);

    // IC (atenção ao \b para não casar dentro de 'diabético')
    var icPos = /\b(?:ic|insufici[êe]ncia\s+card[íi]aca|disfun[çc][ãa]o\s+ve)\b/i.test(t);
    var icAdv = /\b(?:ic|insufici[êe]ncia\s+card[íi]aca|disfun[çc][ãa]o\s+ve)\b/i.test(textoAdversativo);
    var icNeg = !icAdv && (semComorbidadesGeral || /(?:sem|n[aã]o|nega)\s+(?:ic|insufici[êe]ncia\s+card[íi]aca|disfun[çc][ãa]o\s+ve)/i.test(t) || /\b(?:ic|insufici[êe]ncia\s+card[íi]aca|disfun[çc][ãa]o\s+ve)\b/i.test(textoNegativo));
    var icC = icAdv || (icPos && !icNeg);

    // DM
    var dmPos = /\b(?:dm|diabetes|diab[eé]tic[ao]|glicemia\s+alta)\b/i.test(t);
    var dmAdv = /\b(?:dm|diabetes|diab[eé]tic[ao])\b/i.test(textoAdversativo);
    var dmNeg = !dmAdv && (semComorbidadesGeral || /(?:sem|n[aã]o|nega)\s+(?:dm|diabetes|diab[eé]tic[ao])/i.test(t) || /\b(?:dm|diabetes|diab[eé]tic[ao])\b/i.test(textoNegativo));
    var dmC = dmAdv || (dmPos && !dmNeg);

    // AVC
    var avcPos = /\b(?:avc|ait|stroke|tromboembolismo|embolia|isquemia\s+cerebral)\b/i.test(t);
    var avcAdv = /\b(?:avc|ait|stroke|tromboembolismo|embolia)\b/i.test(textoAdversativo);
    var avcNeg = !avcAdv && (semComorbidadesGeral || /(?:sem|n[aã]o|nega)\s+(?:avc|ait|stroke|tromboembolismo|embolia|isquemia)/i.test(t) || /\b(?:avc|ait|stroke|tromboembolismo|embolia)\b/i.test(textoNegativo));
    var avcC = avcAdv || (avcPos && !avcNeg);

    // Doença Vascular
    var vascPos = /\b(?:vascular|doen[çc]a\s+vascular|iam|infarto|daop|placa\s+a[oó]rtica|coronariopatia)\b/i.test(t);
    var vascAdv = /\b(?:vascular|doen[çc]a\s+vascular|iam|infarto|daop|coronariopatia)\b/i.test(textoAdversativo);
    var vascNeg = !vascAdv && (semComorbidadesGeral || /(?:sem|n[aã]o|nega)\s+(?:vascular|doen[çc]a\s+vascular|iam|infarto|daop|coronariopatia)/i.test(t) || /\b(?:vascular|doen[çc]a\s+vascular|iam|infarto|daop|coronariopatia)\b/i.test(textoNegativo));
    var vascC = vascAdv || (vascPos && !vascNeg);

    var rCha = CalculadorasClinicas.cha2ds2vasc(icC, hasC, i75C, dmC, avcC, vascC, i65C, ehMulherC);
    if (rCha && rCha.ok) {
      var strCha = "🧮 *" + rCha.nome + "*\n\n";
      strCha += "• *Pontuação:* `" + rCha.principal + "`\n";
      strCha += "• *Classificação:* " + (rCha.rotulo || rCha.estado || "Calculado") + "\n\n";
      strCha += "📋 *Recomendação:* " + (rCha.recomendacao || rCha.rotulo || rCha.estado) + "\n";
      if (rCha.secoes) {
        for (var sc = 0; sc < rCha.secoes.length; sc++) {
          var secC = rCha.secoes[sc];
          strCha += "\n*" + secC[0] + ":*\n";
          var itensC = Array.isArray(secC[1]) ? secC[1] : [secC[1]];
          for (var itc = 0; itc < itensC.length; itc++) strCha += "  • " + itensC[itc] + "\n";
        }
      }
      return strCha;
    }
  }

  return null;
}

function obterInstrucoesCalculadora(tipo) {
  var t = (tipo || "").toUpperCase();

  if (t.indexOf("CURB") !== -1) {
    return "📐 *CALCULADORA: CURB-65 (Gravidade na PAC)*\n\n" +
      "Envie os seguintes dados do paciente:\n" +
      "• *C (Confusão mental):* Desorientação aguda? (Sim/Não)\n" +
      "• *U (Ureia):* Ureia sérica (mg/dL) ou BUN (mg/dL)\n" +
      "• *R (Respiração):* Frequência Respiratória (irpm)\n" +
      "• *B (Blood Pressure):* Pressão Arterial (PAS < 90 ou PAD ≤ 60 mmHg)\n" +
      "• *65:* Idade do paciente (anos)\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`71 anos, lúcido, PA 100/60, FR 32, Ureia 68`";
  }

  if (t.indexOf("CKD") !== -1 || t.indexOf("COCKCROFT") !== -1) {
    return "📐 *CALCULADORA: FUNÇÃO RENAL (CKD-EPI / Cockcroft-Gault)*\n\n" +
      "Envie os seguintes dados para estimar a TFG / Clearance:\n" +
      "• *Idade:* (em anos)\n" +
      "• *Sexo biológico:* (Masculino / Feminino)\n" +
      "• *Creatinina sérica:* (em mg/dL)\n" +
      "• *Peso atual:* (em kg - fundamental para Cockcroft)\n" +
      "• *Altura:* (em cm - opcional)\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`Homem, 68 anos, 74 kg, Creatinina 1.9 mg/dL`";
  }

  if (t.indexOf("WELLS") !== -1) {
    return "📐 *CALCULADORA: ESCORE DE WELLS (TEP ou TVP)*\n\n" +
      "Especifique se a suspeita é de *TEP* ou *TVP* e informe:\n" +
      "• Sinais/sintomas clínicos de TVP (edema assimétrico, dor à palpação)?\n" +
      "• Frequência Cardíaca (bpm) — FC > 100?\n" +
      "• Imobilização ≥ 3 dias ou cirurgia nas últimas 4 semanas?\n" +
      "• Episódio prévio documentado de TVP ou TEP?\n" +
      "• Presença de hemoptise?\n" +
      "• Câncer ativo (tratamento nos últimos 6 meses ou paliativo)?\n" +
      "• Diagnóstico de TEP é o mais provável ou tão provável quanto outro?\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`Suspeita TEP, FC 108, cirurgia de fêmur há 15 dias, sem hemoptise, TEP é hipótese principal`";
  }

  if (t.indexOf("SOFA") !== -1) {
    return "📐 *CALCULADORA: qSOFA & SOFA (Sepse)*\n\n" +
      "Para *qSOFA* (beira do leito), envie:\n" +
      "• *Glasgow:* (< 15 ou rebaixamento agudo?)\n" +
      "• *Pressão Sistólica:* (PAS ≤ 100 mmHg?)\n" +
      "• *Frequência Respiratória:* (FR ≥ 22 irpm?)\n\n" +
      "Para *SOFA Completo* (UTI), informe também:\n" +
      "• PaO2/FiO2, Plaquetas, Bilirrubinas, PAM/Noradrenalina, Creatinina/Diurese.\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`Confuso (Glasgow 13), PA 85/50, FR 24 irpm, febre e tosse produtiva`";
  }

  if (t.indexOf("CHA2") !== -1 || t.indexOf("VAS") !== -1) {
    return "📐 *CALCULADORA: CHA2DS2-VASc (Risco Tromboembólico na FA)*\n\n" +
      "Envie o perfil clínico do paciente:\n" +
      "• *Idade:* (em anos)\n" +
      "• *Sexo:* (Masculino / Feminino)\n" +
      "• *IC:* Insuficiência Cardíaca congestiva? (Sim/Não)\n" +
      "• *HAS:* Hipertensão arterial sistêmica? (Sim/Não)\n" +
      "• *DM:* Diabetes Mellitus? (Sim/Não)\n" +
      "• *AVC/AIT:* AVC, AIT ou embolia prévia? (Sim/Não)\n" +
      "• *Doença Vascular:* IAM prévio, DAOP ou placa aórtica? (Sim/Não)\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`Mulher, 74 anos, hipertensa, diabética, sem histórico de AVC ou IC`";
  }

  if (t.indexOf("BLED") !== -1) {
    return "📐 *CALCULADORA: HAS-BLED (Risco de Sangramento na Anticoagulação)*\n\n" +
      "Envie os fatores de risco presentes:\n" +
      "• *H (Hipertensão):* PAS não controlada > 160 mmHg?\n" +
      "• *A (Renal/Hepático):* Diálise, Cr > 2.26 ou Cirrose/Bilirrubina > 2x?\n" +
      "• *S (AVC):* Histórico de AVC prévio?\n" +
      "• *B (Bleeding):* Histórico de sangramento maior ou anemia grave?\n" +
      "• *L (Lábil):* RNI lábil se usa Varfarina?\n" +
      "• *E (Elderly):* Idade > 65 anos?\n" +
      "• *D (Drogas/Álcool):* Usa AAS/AINEs ou ingere álcool ≥ 8 doses/semana?\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`70 anos, HAS controlada, sem sangramento prévio, Cr 1.1, usa AAS e faz uso social de álcool`";
  }

  if (t.indexOf("HEART") !== -1 || t.indexOf("TIMI") !== -1) {
    return "📐 *CALCULADORA: HEART SCORE & TIMI (Dor Torácica / SCA)*\n\n" +
      "Envie os dados de estratificação no pronto-socorro:\n" +
      "• *História clínica:* (Altamente suspeita / Moderadamente suspeita / Pouco suspeita)\n" +
      "• *ECG:* (Normal / Repolarização inespecífica / Isquemia aguda/onda T)\n" +
      "• *Idade:* (em anos)\n" +
      "• *Fatores de risco:* (HAS, Diabetes, Tabagismo, DLP, Obesidade, Histórico familiar precoce)\n" +
      "• *Troponina:* (Valor sérico e referência ou Positiva/Negativa)\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`Dor opressiva retroesternal típica há 2h com irradiação MSE, 58 anos, hipertenso e fumante, ECG com T invertida V4-V6, Troponina positiva`";
  }

  if (t.indexOf("GRACE") !== -1) {
    return "📐 *CALCULADORA: GRACE SCORE (SCA com ou sem Supra de ST)*\n\n" +
      "Envie os parâmetros clínicos da admissão:\n" +
      "• Idade (anos), FC (bpm), PAS (mmHg), Creatinina (mg/dL)\n" +
      "• Classe Killip (I a IV)\n" +
      "• PCR na admissão? Desvio de ST no ECG? Troponina elevada?\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`65 anos, FC 88, PA 115/70, Cr 1.2, Killip I, sem PCR, infra de ST 1.5mm, Troponina positiva`";
  }

  if (t.indexOf("MELD") !== -1 || t.indexOf("CHILD") !== -1) {
    return "📐 *CALCULADORA: CHILD-PUGH & MELD (Hepatopatia Crônica)*\n\n" +
      "Envie os parâmetros laboratoriais e clínicos:\n" +
      "• Bilirrubina total (mg/dL), Albumina (g/dL), RNI\n" +
      "• Ascite (Ausente/Leve/Refratária), Encefalopatia (Ausente/Grau 1-2/Grau 3-4)\n" +
      "• Creatinina (mg/dL) e Sódio sérico (mEq/L)\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`Bilirrubina 2.7, Albumina 3.0, RNI 1.8, Creatinina 1.3, Sódio 134, ascite leve, sem encefalopatia`";
  }

  if (t.indexOf("GLASGOW") !== -1) {
    return "📐 *CALCULADORA: ESCALA DE COMA DE GLASGOW COM PUPILAS (Glasgow-P)*\n\n" +
      "Envie as respostas avaliadas:\n" +
      "• *Abertura Ocular (1–4):* Espontânea (4), Ao chamado (3), À pressão (2), Nenhuma (1)\n" +
      "• *Resposta Verbal (1–5):* Orientada (5), Confusa (4), Inapropriada (3), Sons ininteligíveis (2), Nenhuma (1)\n" +
      "• *Resposta Motora (1–6):* Obedece comandos (6), Localiza dor (5), Flexão normal (4), Flexão anormal (3), Extensão (2), Nenhuma (1)\n" +
      "• *Pupilas:* Ambas fotorreagentes (0), Apenas uma reage (-1), Nenhuma reage (-2)\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`Abertura ao chamado (3), palavras desconexas (3), localiza dor (5), pupilas reagentes (0)`";
  }

  if (t.indexOf("NIHSS") !== -1) {
    return "📐 *CALCULADORA: NIHSS (Escala de AVC Isquêmico)*\n\n" +
      "Envie os achados neurológicos observados:\n" +
      "• Nível de consciência, olhar conjugado, campo visual, paresia facial, força motora (MSD, MSE, MID, MIE), ataxia, sensibilidade, linguagem/disartria, extinção.\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`Alerta, desvio de rima à D, paresia braquiocrural D grau 3, disartria moderada, sem afasia`";
  }

  if (t.indexOf("RANSON") !== -1 || t.indexOf("BISAP") !== -1) {
    return "📐 *CALCULADORA: BISAP & RANSON (Pancreatite Aguda)*\n\n" +
      "Envie as variáveis clínicas das primeiras 24h:\n" +
      "• Ureia > 50 mg/dL, Idade > 60 anos, SIRS presente, Glasgow < 15, Derrame pleural no RX.\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`64 anos, lúcido, FC 102, FR 22, Tax 38.2, Ureia 58, RX com derrame pleural à esquerda`";
  }

  if (t.indexOf("FRAMINGHAM") !== -1) {
    return "📐 *CALCULADORA: RISCO CARDIOVASCULAR (Framingham / SBC)*\n\n" +
      "Envie os parâmetros:\n" +
      "• Idade, Sexo, Colesterol Total, HDL, PAS, uso de anti-hipertensivo, tabagismo, diabetes.\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`Homem, 54 anos, CT 225, HDL 38, PA 145/90 com Losartana, fumante, não diabético`";
  }

  if (t.indexOf("AGUA") !== -1 || t.indexOf("DEFICIT") !== -1) {
    return "📐 *CALCULADORA: DÉFICIT DE ÁGUA LIVRE (Hipernatremia)*\n\n" +
      "Envie os parâmetros para reposição:\n" +
      "• Sódio sérico atual (mEq/L), Sódio alvo (ex: 140 mEq/L), Peso (kg), Perfil (Homem idoso, Mulher adulta, etc.).\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`Homem idoso, 65 kg, Sódio atual 162 mEq/L, alvo 145 mEq/L`";
  }

  return "📐 *" + tipo + "*\n\n" +
    "Por favor, envie os dados clínicos e laboratoriais do paciente para este cálculo.\n" +
    "💡 *Exemplo:* Idade, sexo, sinais vitais e valores laboratoriais relevantes.";
}

function enviarMenuCategoriasCalculadoras(chatId, messageId) {
  var token = ConfigService.get("TELEGRAM_BOT_TOKEN");
  var teclado = {
    "inline_keyboard": [
      [{"text": "🫀 Cardio & Vascular", "callback_data": "calc_cat_cardio"}],
      [{"text": "🧪 Nefro, Metabólico & Geral", "callback_data": "calc_cat_renal"}],
      [{"text": "🧠 Neuro & Terapia Intensiva", "callback_data": "calc_cat_neuro"}]
    ]
  };
  var texto = "📐 *CALCULADORAS CLÍNICAS DETERMINÍSTICAS*\n\nEscolha uma categoria ou envie diretamente no chat:\n💡 *Ex:* `/calc curb65 71a confuso PA 100/60 FR 32 Ureia 68`";

  if (messageId && token) {
    executarPostTelegram("https://api.telegram.org/bot" + token + "/editMessageText", {
      "chat_id": chatId, "message_id": messageId, "text": texto, "parse_mode": "Markdown", "reply_markup": teclado
    });
  } else {
    enviarMensagemComTecladoParaChat(chatId, texto, teclado);
  }
}

function enviarSubmenuCalculadoras(chatId, messageId, categoria) {
  var token = ConfigService.get("TELEGRAM_BOT_TOKEN");
  var teclado = [];
  var tituloCat = "";

  if (categoria === "calc_cat_cardio") {
    tituloCat = "🫀 *Calculadoras Cardiovasculares:*";
    teclado = [
      [{"text": "CHA2DS2-VASc", "callback_data": "calc_CHA2DS2-VASc"}, {"text": "HAS-BLED", "callback_data": "calc_HAS-BLED"}],
      [{"text": "Wells (TEP/TVP)", "callback_data": "calc_Wells"}, {"text": "HEART / TIMI", "callback_data": "calc_HEART-TIMI"}],
      [{"text": "GRACE Score", "callback_data": "calc_GRACE"}, {"text": "Framingham", "callback_data": "calc_Framingham"}],
      [{"text": "⬅️ Voltar ao Menu", "callback_data": "calc_menu_principal"}]
    ];
  } else if (categoria === "calc_cat_renal") {
    tituloCat = "🧪 *Calculadoras Nefro, Metabólicas & Gerais:*";
    teclado = [
      [{"text": "CKD-EPI / Cockcroft", "callback_data": "calc_CKD-EPI"}, {"text": "CURB-65", "callback_data": "calc_CURB-65"}],
      [{"text": "Déficit de Água", "callback_data": "calc_Agua"}, {"text": "LDL Martin-Hopkins", "callback_data": "calc_LDL-Martin-Hopkins"}],
      [{"text": "FRAX (Fratura)", "callback_data": "calc_FRAX"}],
      [{"text": "⬅️ Voltar ao Menu", "callback_data": "calc_menu_principal"}]
    ];
  } else if (categoria === "calc_cat_neuro") {
    tituloCat = "🧠 *Calculadoras Neuro & Terapia Intensiva:*";
    teclado = [
      [{"text": "Glasgow-P", "callback_data": "calc_Glasgow"}, {"text": "NIHSS (AVC)", "callback_data": "calc_NIHSS"}],
      [{"text": "qSOFA / SOFA", "callback_data": "calc_SOFA"}, {"text": "Child-Pugh / MELD", "callback_data": "calc_MELD"}],
      [{"text": "Ranson / BISAP", "callback_data": "calc_Ranson"}, {"text": "APACHE II", "callback_data": "calc_APACHE"}],
      [{"text": "⬅️ Voltar ao Menu", "callback_data": "calc_menu_principal"}]
    ];
  }

  if (messageId && token) {
    executarPostTelegram("https://api.telegram.org/bot" + token + "/editMessageText", {
      "chat_id": chatId, "message_id": messageId, "text": "📐 " + tituloCat + "\n\nSelecione a ferramenta desejada:", "parse_mode": "Markdown", "reply_markup": { "inline_keyboard": teclado }
    });
  }
}

function enviarManual(chatId) {
  var manual =
    "📖 *GUIA DEFINITIVO DE OPERAÇÃO DO COPILOTO CLÍNICO 4.0*\n\n" +
    "Seu assistente médico de emergência, enfermaria e rotina hospitalar 24/7 na nuvem. Aprenda a utilizar 100% das ferramentas do bot:\n\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "📱 *1. COMO NAVEGAR NO BOT (3 MODOS)*\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "1️⃣ *Teclado Rápido no Rodapé:* 6 botões sempre na base da tela para acesso com 1 toque do polegar (`🩺 Novo SOAP`, `💊 Prescrever`, `🏥 Enfermaria`, `📐 Calculadoras`, `📅 Minha rotina`, `🚨 Sala Vermelha`). Se o teclado sumir, envie `/teclado` para reativar.\n" +
    "2️⃣ *Central de Comandos (`/menu`):* Abre um painel interativo com botões organizados por especialidade clínica. Todos os menus possuem botão de retorno `« Menu principal`.\n" +
    "3️⃣ *Voz e Linguagem Natural:* Você não precisa decorar comandos! Pode falar por áudio gravado no corredor ou escrever naturalmente (ex.: _\"paciente 70kg em choque septico, calcula nora\"_ ou _\"prescrever amoxicilina 500mg para sinusite\"_). A IA classifica e executa automaticamente.\n\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "🧠 *2. MEMÓRIA & GERENCIAMENTO DE CASOS*\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "• *Memória de 15 minutos:* Ao iniciar um caso clínico (`/soap`, `/leito`, etc.), o bot retém os dados do paciente. Você pode enviar novas frases apenas com atualizações (ex.: _\"chegou o potássio de 3.2\"_ ou _\"ficou hipotenso\"_) sem ter que reenviar tudo.\n" +
    "• `/novo` ou `🩺 Novo SOAP`: *Limpar memória.* Use SEMPRE ao trocar de paciente para garantir que os dados não se misturem.\n" +
    "• `/cancelar`: Encerra o modo ativo (edição de leito, cálculo de droga ou modo de voz) a qualquer momento.\n" +
    "• `/fila`: Mostra os pedidos e entregas assíncronas sendo geradas em segundo plano.\n\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "🚨 *3. SALA VERMELHA & EMERGÊNCIA (RESPOSTA IMEDIATA)*\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "💉 *Drogas Vasoativas em mL/h (`/dva`):*\n" +
    "• `/dva nora 70` → Noradrenalina (solução padrão 64 mcg/mL) calculada em mL/h e mcg/kg/min.\n" +
    "• `/dva nora 80 concentrada` → Solução concentrada (128 mcg/mL).\n" +
    "• `/dva dobuta 65` → Dobutamina (1 mg/mL) em mL/h para 65 kg.\n" +
    "• `/dva vaso` → Vasopressina em dose fixa de 0,03 UI/min (vazão de 9 mL/h).\n" +
    "• `/dva nipride 75` ou `/dva tridil` → Nitroprussiato e Nitroglicerina com titulação.\n\n" +
    "🫁 *Sequência Rápida de Intubação (`/sri`):*\n" +
    "• `/sri 70` → Doses e volumes exatos em mL de Etomidato, Quetamina, Succinilcolina, Rocurônio e Fentanil.\n" +
    "• `/sri 70 choque` → Ajuste hemodinâmico de indução para choque circulatório.\n" +
    "• `/sri 80 asma` → Indução ajustada para broncoespasmo grave.\n\n" +
    "🩸 *Gasometria Arterial Completa (`/gaso`):*\n" +
    "• `/gaso pH 7.22, pCO2 28, HCO3 11, Na 140, Cl 102, Alb 3.0`\n" +
    "• Calcula: Distúrbio primário, resposta compensatória (Winter), Ânion Gap corrigido pela albumina, Delta-Delta para distúrbios mistos/triplos e relação PaO2/FiO2.\n\n" +
    "⚡ *Condutas de Ataque em Emergências (`/conduta`):*\n" +
    "• Doses prontas em ampolas e mL imediatos: `/conduta PCR chocavel`, `/conduta EAP hipertensivo`, `/conduta anafilaxia`, `/conduta crise convulsiva`, `/conduta hipercalemia`, `/conduta cetoacidose`.\n\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "🏥 *4. ENFERMARIA VIRTUAL & LEITOS*\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "• `/enfermaria`: Quadro geral de todos os leitos com censo de gravidade (🟢 Estável, 🟡 Vigilância, 🔴 Instável) e botões de ação.\n" +
    "• `/leito <num> <evolução>`: Cadastra ou atualiza o paciente do leito. Ex.: `/leito 4 72a, PAC grave, Ceftriaxona D3, estável, aguarda vaga UTI`.\n" +
    "• `/passagem`: Gera a passagem de plantão consolidada da equipe no padrão SBAR (Situação, Background, Avaliação, Recomendação) com 1 toque.\n" +
    "• `/alta <num>`: Desocupa o leito e registra a alta hospitalar.\n\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "💊 *5. PRESCRIÇÃO, AMBULATÓRIO & ROUND*\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "• `/rx <pedido ou diagnóstico>`: Busca na REMUME municipal (Ribeirão Preto), estrutura a posologia padrão e gera botão para emissão de PDF A4 timbrado oficial no Google Drive e botão nativo de cópia para prontuário.\n" +
    "• `/soap <caso>`: Síntese estruturada completa (Subjetivo, Objetivo, Avaliação, Plano) pronta para o prontuário eletrônico.\n" +
    "• `/round <caso>`: Pitch oral de 60 segundos para apresentar o paciente no round da enfermaria/UTI + 3 perguntas socráticas antecipadas.\n" +
    "• `/voz <caso>`: Sabatina médica cirúrgica enviada como mensagem de áudio de voz para você ouvir e responder no fone de ouvido enquanto caminha.\n" +
    "• `/interacao <drogas>`: Checagem cruzada de interações medicamentosas graves e nomes comerciais.\n\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "🧮 *6. CALCULADORAS CLÍNICAS DETERMINÍSTICAS (`/calc`)*\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "Digite `/calc` para abrir o menu visual ou envie os dados diretamente por texto:\n" +
    "• *Clearance de Creatinina (Cockcroft-Gault):* `/calc clearance Cr 1.2, peso 70, idade 65, masculino`\n" +
    "• *CHA2DS2-VASc:* `/calc cha2ds2vasc` (estratificação de risco de AVC em FA)\n" +
    "• *KDIGO:* `/calc kdigo` (estadiamento rigoroso de Injúria Renal Aguda)\n" +
    "• *Glasgow-P:* `/calc glasgow` (escore de coma com reatividade pupilar)\n" +
    "• *MELD e MELD-Na 2016:* `/calc meld` (estratificação de gravidade em hepatopatia crônica)\n\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "📅 *7. LIFESTYLE, AGENDAS & PRODUTIVIDADE*\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "• `/agenda [hoje/amanha]`: Consulta seus compromissos no Google Calendar.\n" +
    "• `/task <texto>`: Salva uma pendência imediata no Inbox do Notion Tasks (ex.: `/task Ligar para a regulação do leito 3`).\n" +
    "• `/tasks`: Lista suas pendências e tarefas de hoje no Notion.\n" +
    "• `/duvida <tema>`: Arquiva uma dúvida clínica para o bloco de estudo noturno no MedQuest.\n" +
    "• `/plantao_fim`: Checklist de encerramento do plantão, leitos pendentes e passagem executiva.\n\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "🎙️ *8. MULTIMODALIDADE (FOTOS E ÁUDIOS)*\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "• *Áudio de voz:* Pressione o microfone e grave seu raciocínio clínico enquanto anda pelo hospital. O bot transcreve e estrutura automaticamente.\n" +
    "• *Fotos e Imagens:* Envie fotos de ECGs de 12 derivações, radiografias, laudos de tomografia ou lesões dermatológicas para suporte diagnóstico rápido e interativo.";

  enviarMensagemParaChat(chatId, manual);
}


// ==============================================================================
// ARQUIVO FONTE: 08_main.js
// ==============================================================================

/**
 * ==============================================================================
 * MÓDULO 08: MAIN, WEBHOOK ROUTER (doGet / doPost) E INSTALAÇÃO
 * ==============================================================================
 * Executa 100% na nuvem do Google Apps Script (24/7), gratuito e resiliente.
 * ==============================================================================
 */

function doGet(e) {
  var info={service:"Ultra Rotina",version:"2026.10.04-ux2"};
  if(e && e.parameter && e.parameter.secret && e.parameter.secret===ConfigService.get("WEBHOOK_SECRET")) {
    if(e.parameter.action==="clean") {
      PersistenciaBot.chaves("inbox_").forEach(function(k){
        var j=PersistenciaBot.ler(k);
        if (!j) return;
        var idade = Date.now() - j.created;
        if ((j.status==="done" && idade > 86400000) ||
            ((j.status==="uncertain" || j.status==="failed") && idade > 86400000) ||
            (j.status==="pending" && idade > 86400000)) {
          PersistenciaBot.remover(k);
        }
      });
      PersistenciaBot.chaves("outbox_").forEach(function(k){
        var j=PersistenciaBot.ler(k);
        if (!j) return;
        var idade = Date.now() - j.created;
        if ((j.status==="done" && idade > 3600000) ||
            (j.status==="failed" && idade > 7200000) ||
            (j.status==="pending" && idade > 86400000)) {
          PersistenciaBot.remover(k);
        }
      });
    }
    info.configured=["TELEGRAM_BOT_TOKEN","TELEGRAM_CHAT_ID","WEB_APP_URL","WEBHOOK_SECRET","NOTION_TOKEN","NOTION_TASKS_DB_ID","NOTION_HABIT_LOG_DB_ID","SPREADSHEET_ID_REMUME","SPREADSHEET_ID_INTERACOES"].filter(function(k){return !!ConfigService.get(k);});
    info.worker=ScriptApp.getProjectTriggers().some(function(t){return t.getHandlerFunction()==="processarFilaTelegram";});
    info.queue=PersistenciaBot.chaves("inbox_").length;
    info.outbox=PersistenciaBot.chaves("outbox_").map(function(k){var j=PersistenciaBot.ler(k);return {id:k,status:j ? j.status : "unknown"};});
  }
  return ContentService.createTextOutput(JSON.stringify(info)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var secret=ConfigService.get("WEBHOOK_SECRET"), allowed=ConfigService.get("TELEGRAM_CHAT_ID");
  if (!secret || !allowed || !e || !e.parameter || e.parameter.secret !== secret) return HtmlService.createHtmlOutput("Unauthorized");
  if(e.parameter.action==="configure") {
    configurarWebhookTelegram();configurarMenuTelegram();
    return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
  }
  var u;
  try { u=JSON.parse(e.postData.contents); } catch(err) { return HtmlService.createHtmlOutput("Bad Request"); }
  if (!u || !Number.isSafeInteger(u.update_id) || u.update_id<0) return HtmlService.createHtmlOutput("Bad Request");
  var msg=u.message || (u.callback_query && u.callback_query.message);
  if (!msg || !msg.chat || String(msg.chat.id)!==String(allowed)) return HtmlService.createHtmlOutput("Forbidden");
  enfileirarUpdate(u);
  if (ConfigService.get("TELEGRAM_ASYNC_WORKER") !== "true") {
    processarFilaTelegram();
  }
  return HtmlService.createHtmlOutput("OK");
}

// ==============================================================================
// UTILITÁRIOS DE INSTALAÇÃO, PROVISIONAMENTO E CONFIGURAÇÃO
// ==============================================================================

/**
 * Executar uma única vez no editor do Apps Script para provisionar
 * todas as chaves em ScriptProperties de forma segura e limpa.
 */
function setupScriptProperties() {
  var props = PropertiesService.getScriptProperties();
  var defaults = ConfigService.getDefaults();
  for (var k in defaults) {
    if (!props.getProperty(k)) {
      props.setProperty(k, defaults[k]);
    }
  }
  Logger.log("✅ Propriedades do Script provisionadas com sucesso em ScriptProperties!");
}

function configurarWebhookTelegram() {
  var token=ConfigService.exigir("TELEGRAM_BOT_TOKEN");
  var url=ConfigService.exigir("WEB_APP_URL");
  var secret=ConfigService.exigir("WEBHOOK_SECRET");
  var response=UrlFetchApp.fetch("https://api.telegram.org/bot"+token+"/setWebhook", {
    method:"post",contentType:"application/json",muteHttpExceptions:true,
    payload:JSON.stringify({url:url.split("?")[0]+"?secret="+encodeURIComponent(secret),secret_token:secret,drop_pending_updates:false,max_connections:1,allowed_updates:["message","callback_query"]})
  });
  if(response.getResponseCode()!==200 || !JSON.parse(response.getContentText()).ok) throw new Error("Falha ao registrar webhook.");
  if(!ScriptApp.getProjectTriggers().some(function(t){return t.getHandlerFunction()==="processarFilaTelegram";})) ScriptApp.newTrigger("processarFilaTelegram").timeBased().everyMinutes(1).create();
  return {ok:true};
}

// Catálogo de referência dos comandos aceitos pelo bot no chat
var COMANDOS_CLINICOS_CATALOGO = [
  "gaso", "conduta", "task", "tasks", "duvida", "dva", "sri", "agenda", "plantao_fim", "teclado",
  "soap", "rx", "enfermaria", "leito", "passagem", "alta", "round", "calc", "manual"
];

function configurarMenuTelegram() {
  var token = ConfigService.get("TELEGRAM_BOT_TOKEN");
  var url = "https://api.telegram.org/bot" + token + "/setMyCommands";
  var comandos = [
    { command: "menu", description: "Central de comandos e especialidades" },
    { command: "novo", description: "Limpar memória e iniciar novo caso" },
    { command: "cancelar", description: "Encerrar modo ativo ou ação atual" },
    { command: "teclado", description: "Ativar botões rápidos no rodapé" },
    { command: "fila", description: "Ver pedidos e entregas pendentes" },
    { command: "ajuda", description: "Manual completo de instruções" }
  ];

  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify({ "commands": comandos }),
    "muteHttpExceptions": true
  };
  UrlFetchApp.fetch(url, options);

  var optionsPriv = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify({ "commands": comandos, "scope": { "type": "all_private_chats" } }),
    "muteHttpExceptions": true
  };
  var res = UrlFetchApp.fetch(url, optionsPriv);
  Logger.log("Menu configurado: " + res.getContentText());
}

function instalarTodosOsAcionadores() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    var fn = triggers[i].getHandlerFunction();
    if (fn === "executarCicloRotina5Min" || fn === "aquecerCachePlanilhas") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // 1. Aquecimento de cache a cada 5 horas (TTL de 6h)
  ScriptApp.newTrigger("aquecerCachePlanilhas").timeBased().everyHours(4).create();

  // 2. Ciclo contínuo de rotina e sentinela a cada 5 minutos
  ScriptApp.newTrigger("executarCicloRotina5Min").timeBased().everyMinutes(5).create();

  var chatId = ConfigService.get("TELEGRAM_CHAT_ID");
  enviarMensagemComTecladoFixo(chatId, "⚡ *ASSISTENTE ULTRA ROTINA 3.0 ATIVADO!*\nAutomação em nuvem, copiloto clínico determinístico e sentinela instalados.");
}


// ==============================================================================
// ARQUIVO FONTE: 09_enfermaria.js
// ==============================================================================

/** Leitos persistidos individualmente. Legado preservado; texto nunca é truncado. */
var EnfermariaService=(function(){
  var PREFIX='LEITO_V2_';
  function props(){return PropertiesService.getScriptProperties();}
  function key(id){return PREFIX+encodeURIComponent(id);}
  function carregar(){
    var p=props(),old=p.getProperty('ENFERMARIA_LEITOS_JSON'),all=old?JSON.parse(old):{};
    if(!all||Array.isArray(all)||typeof all!=='object')throw new Error('Dados de leitos inválidos.');
    var values=p.getProperties();
    Object.keys(values).filter(function(k){return k.indexOf(PREFIX)===0;}).forEach(function(k){var v=JSON.parse(values[k]);if(v.arquivado)delete all[v.numero];else all[v.numero]=v;});
    return all;
  }
  function bytesUtf8(str) {
    if (!str) return 0;
    if (typeof Buffer !== 'undefined' && typeof Buffer.byteLength === 'function') {
      return Buffer.byteLength(str, 'utf8');
    }
    if (typeof Utilities !== 'undefined' && typeof Utilities.newBlob === 'function') {
      try { return Utilities.newBlob(str).getBytes().length; } catch (e) {}
    }
    var b = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) b += 1;
      else if (c < 0x800) b += 2;
      else if (c >= 0xD800 && c <= 0xDBFF) { b += 4; i++; }
      else b += 3;
    }
    return b;
  }
  function totalBytesPersistencia() {
    var all = props().getProperties();
    var b = 0;
    for (var k in all) {
      if (all.hasOwnProperty(k)) b += bytesUtf8(k) + bytesUtf8(all[k]);
    }
    return b;
  }
  function gravar(id,obj){
    var texto=JSON.stringify(obj);
    var bTexto = bytesUtf8(texto);
    if(bTexto>8000)throw new Error('Evolução excede 8 KB. Nenhum dado foi alterado; divida o conteúdo.');
    var bTotal = totalBytesPersistencia();
    if (bTotal + bTexto > 350000) {
      podarHistorico(props());
      bTotal = totalBytesPersistencia();
    }
    if (bTotal + bTexto > 400000) {
      throw new Error('Orçamento global de armazenamento excedido (cota 500 KB do GAS). Contrapressão ativada na enfermaria.');
    }
    props().setProperty(key(id),texto);
  }
  function erro(e){return {sucesso:false,erro:e.message,mensagem:'⚠️ '+e.message};}
  function ids(all){return Object.keys(all).sort(function(a,b){return a.localeCompare(b,undefined,{numeric:true});});}
  var _seqHist = 0;
  function gerarChaveHist(id) {
    _seqHist = (_seqHist + 1) % 10000000;
    var tNow = Date.now();
    var sTs = String(tNow).padStart(15, '0');
    var sSeq = String(_seqHist).padStart(8, '0');
    return 'LEITO_HIST_' + id + '_' + sTs + '_' + sSeq + '_' + Utilities.getUuid();
  }
  function obterTimestampRegistro(chave, payloadStr) {
    var partes = chave.split('_');
    // Partes: ['LEITO', 'HIST', leitoId, sTs, sSeq, uuid]
    if (partes.length >= 5 && /^\d+$/.test(partes[3])) {
      var ts = parseInt(partes[3], 10);
      var seqNum = partes[4] && /^\d+$/.test(partes[4]) ? parseInt(partes[4], 10) : 0;
      return ts * 10000000 + seqNum;
    }
    if (payloadStr) {
      try {
        var obj = JSON.parse(payloadStr);
        if (obj.timestamp) return obj.timestamp;
      } catch(e) {}
    }
    return 0; // Chaves legadas sem timestamp numérico são consideradas mais antigas
  }
  function podarHistorico(p, leitoId) {
    try {
      var allProps = p.getProperties();
      if (leitoId) {
        var prefixLeito = 'LEITO_HIST_' + leitoId + '_';
        var histKeysLeito = Object.keys(allProps).filter(function(k){ return k.indexOf(prefixLeito) === 0; });
        histKeysLeito.sort(function(k1, k2) {
          var t1 = obterTimestampRegistro(k1, allProps[k1]);
          var t2 = obterTimestampRegistro(k2, allProps[k2]);
          if (t1 !== t2) return t1 - t2;
          return k1.localeCompare(k2);
        });
        if (histKeysLeito.length >= 10) {
          histKeysLeito.slice(0, histKeysLeito.length - 9).forEach(function(k){ p.deleteProperty(k); });
        }
      } else {
        var allHistKeys = Object.keys(allProps).filter(function(k){ return k.indexOf('LEITO_HIST_') === 0; });
        allHistKeys.sort(function(k1, k2) {
          var t1 = obterTimestampRegistro(k1, allProps[k1]);
          var t2 = obterTimestampRegistro(k2, allProps[k2]);
          if (t1 !== t2) return t1 - t2;
          return k1.localeCompare(k2);
        });
        if (allHistKeys.length >= 50) {
          allHistKeys.slice(0, allHistKeys.length - 49).forEach(function(k){ p.deleteProperty(k); });
        }
      }
      var totalBytes = Object.keys(allProps).reduce(function(sum, k){
        return sum + bytesUtf8(k) + bytesUtf8(allProps[k]);
      }, 0);
      if (totalBytes > 250000) {
        var globalHist = Object.keys(allProps).filter(function(k){ return k.indexOf('LEITO_HIST_') === 0; });
        globalHist.sort(function(k1, k2) {
          var t1 = obterTimestampRegistro(k1, allProps[k1]);
          var t2 = obterTimestampRegistro(k2, allProps[k2]);
          if (t1 !== t2) return t1 - t2;
          return k1.localeCompare(k2);
        });
        globalHist.slice(0, Math.ceil(globalHist.length / 2)).forEach(function(k){ p.deleteProperty(k); });
      }
    } catch(e) {}
  }
  function statusExplicito(texto, anterior){
    var m=texto.match(/(?:^|\n)status:\s*(est[aá]vel|inst[aá]vel|vigil[aâ]ncia|alta programada)\s*(?:\n|$)/i);
    if(!m)return anterior||'⚪ Não confirmado';
    var s=m[1].toLowerCase();return s.indexOf('inst')===0?'🚨 Instável / Crítico':s.indexOf('est')===0?'⚪ Estável':s.indexOf('alta')===0?'🟢 Alta Programada':'🟡 Em Vigilância';
  }
  return {
    obterTodos:carregar,
    obterLeito:function(id){return carregar()[String(id).trim()]||null;},
    atualizarLeito:function(num,texto){
      try{
        var id=String(num).trim();if(!/^[\w-]{1,24}$/.test(id))throw new Error('Use até 24 letras, números ou hífen para identificar o leito.');
        texto=String(texto||'').trim();if(!texto)throw new Error('Informe a evolução.');
        var all=carregar(),prior=all[id],tz=ConfigService.get('TIMEZONE','America/Sao_Paulo'),now=new Date();
        var obj={numero:id,dados:texto,status:statusExplicito(texto,prior&&prior.status),atualizadoEm:Utilities.formatDate(now,tz,'HH:mm'),dataISO:Utilities.formatDate(now,tz,'yyyy-MM-dd'),version:Utilities.getUuid()};
        if(unescape(encodeURIComponent(JSON.stringify(obj))).length>8000)throw new Error('Evolução excede 8 KB. Nenhum dado foi alterado; divida o conteúdo.');
        if(prior){
          podarHistorico(props(), id);
          props().setProperty(gerarChaveHist(id),JSON.stringify(prior));
        }
        gravar(id,obj);
        return {sucesso:true,leito:obj,mensagem:'🛏️ *Leito '+id+' atualizado*\n'+obj.dataISO+' · '+obj.atualizadoEm+'\nStatus: '+obj.status+'\n\n'+texto};
      }catch(e){return erro(e);}
    },
    atualizarStatusLeito:function(num,novoStatus,versaoEsperada){
      try{
        var id=String(num).trim(),all=carregar(),l=all[id];
        if(!l)return {sucesso:false,mensagem:'Leito '+id+' não está registrado.'};
        if(versaoEsperada && l.version && versaoEsperada !== l.version.slice(0, 8) && versaoEsperada !== l.version) {
          return {sucesso:false,mensagem:'O leito mudou de paciente ou foi atualizado. Abra-o novamente.'};
        }
        var statusFormatado=novoStatus;
        if(novoStatus==='estavel')statusFormatado='⚪ Estável';
        else if(novoStatus==='vigilancia')statusFormatado='🟡 Em Vigilância';
        else if(novoStatus==='instavel')statusFormatado='🚨 Instável / Crítico';
        else if(novoStatus==='alta')statusFormatado='🟢 Alta Programada';
        var tz=ConfigService.get('TIMEZONE','America/Sao_Paulo'),now=new Date();
        var obj={numero:id,dados:l.dados,status:statusFormatado,atualizadoEm:Utilities.formatDate(now,tz,'HH:mm'),dataISO:Utilities.formatDate(now,tz,'yyyy-MM-dd'),version:Utilities.getUuid()};
        podarHistorico(props(), id);
        props().setProperty(gerarChaveHist(id),JSON.stringify(l));
        gravar(id,obj);
        return {sucesso:true,leito:obj,mensagem:'🛏️ Status do Leito '+id+' alterado para '+statusFormatado};
      }catch(e){return erro(e);}
    },
    desocuparLeito:function(num,versao){
      try{var id=String(num).trim(),l=carregar()[id];if(!l)return {sucesso:false,mensagem:'Leito '+id+' não estava registrado como ocupado.'};
        if(versao && versao!==(l.version||l.dataISO+' '+l.atualizadoEm))throw new Error('O leito mudou. Abra-o novamente antes de confirmar a alta.');
        podarHistorico(props(), id);
        props().setProperty(gerarChaveHist(id),JSON.stringify(l));
        gravar(id,{numero:id,arquivado:true,dataAlta:new Date().toISOString()});
        return {sucesso:true,mensagem:'🟢 Alta registrada · leito '+id+'. Histórico preservado.'};
      }catch(e){return erro(e);}
    },
    limparTudo:function(){
      try{var all=carregar(),self=this;for(var id of Object.keys(all)){var r=self.desocuparLeito(id);if(!r.sucesso)return r;}return {sucesso:true,mensagem:'Enfermaria encerrada. Histórico preservado.'};}catch(e){return erro(e);}
    },
    formatarPainelBordo:function(){
      var all=carregar(),keys=ids(all);if(!keys.length)return '🏥 *ENFERMARIA · NENHUM LEITO REGISTRADO*\n\nUse /leito 4 seguido da evolução.';
      var estaveis=0,vigilancias=0,instaveis=0,naoConfirmados=0;
      keys.forEach(function(id){
        var st=(all[id].status||'').toLowerCase();
        if(st.indexOf('inst')!==-1)instaveis++;
        else if(st.indexOf('vigil')!==-1)vigilancias++;
        else if(st.indexOf('est')!==-1)estaveis++;
        else naoConfirmados++;
      });
      var censo='('+keys.length+' leitos: 🟢 '+estaveis+' estáveis | 🟡 '+vigilancias+' vigilância | 🔴 '+instaveis+' críticos'+(naoConfirmados ? ' | ⚪ '+naoConfirmados+' a avaliar' : '')+')';
      return '🏥 *Enfermaria* · '+censo+'\n\n'+keys.map(function(id){var l=all[id];return '*LEITO '+id+'* · '+l.status+'\n'+l.dataISO+' '+l.atualizadoEm+'\n'+l.dados;}).join('\n\n');
    },
    obterTextoConsolidadoParaPassagem:function(){var all=carregar(),keys=ids(all);return keys.length?keys.map(function(id){var l=all[id];return 'LEITO '+id+' · '+l.status+' · '+l.dataISO+' '+l.atualizadoEm+'\n'+l.dados;}).join('\n\n'):null;}
  };
})();


// ==============================================================================
// ARQUIVO FONTE: 10_pdf_receita.js
// ==============================================================================

/**
 * ==============================================================================
 * MÓDULO 10: GERADOR DE RECEITUÁRIO A4 EM PDF (Google Drive & Telegram)
 * ==============================================================================
 * Converte prescrições em PDF oficial A4 pronto para impressão com carimbo/assinatura,
 * salva em pasta dedicada no Google Drive e envia o arquivo via Telegram.
 * ==============================================================================
 */

var ReceitaPdfService = (function() {
  var NOME_PASTA_DRIVE = "Receitas Médicas - Ultra Rotina";

  function escHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function extrairNomePaciente(textoPrescricao) {
    var str = textoPrescricao || "";
    var m = str.match(/paciente\s*[:=]?\s*([^\n,\(\)]+)/i);
    if (m && m[1]) {
      var limpo = m[1].replace(/[*_#]/g, "").trim();
      if (limpo && limpo.toLowerCase() !== "não informado" && limpo.toLowerCase() !== "nao informado") {
        return escHtml(limpo);
      }
    }
    return "Ao Portador";
  }

  /**
   * Parser inteligente que extrai EXCLUSIVAMENTE os medicamentos, quantidades e modo de tomar,
   * descartando notas de prontuário, memórias de cálculo, justificativas e avisos de IA.
   */
  function extrairItensReceitaLimpos(textoPrescricao) {
    var texto = String(textoPrescricao || "");
    var ehRascunho = /rascunho/i.test(texto);

    // 1. Se contiver a seção de notas clínicas ou prontuário, corta o texto para ignorar completamente
    var marcadoresCorte = [
      "NOTAS CLÍNICAS", "NOTAS CLINICAS", "MEMÓRIA DE CÁLCULO", "MEMORIA DE CALCULO",
      "PARA CONFERÊNCIA", "PARA CONFERENCIA", "PRONTUÁRIO", "PRONTUARIO",
      "JUSTIFICATIVA", "INDICAÇÃO CLÍNICA", "INDICACAO CLINICA", "ATENÇÃO:", "ATENCAO:"
    ];

    var indiceCorte = texto.length;
    for (var i = 0; i < marcadoresCorte.length; i++) {
      var pos = texto.toUpperCase().indexOf(marcadoresCorte[i]);
      if (pos !== -1 && pos > 80 && pos < indiceCorte) {
        indiceCorte = pos;
      }
    }
    var textoUtil = texto.substring(0, indiceCorte);

    var linhas = textoUtil.split("\n");
    var itens = [];
    var orientacoes = [];
    var viaAtual = "";
    var emOrientacoes = false;
    var itemAtual = null;

    var regexVia = /\[?(USO\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s\/]+)\]?/i;
    var regexIgnorar = /^(📋|⚖️|⚠️|💡|🔬|•\s*memória|•\s*indicação|•\s*dados|•\s*alergia|•\s*estoque|indicação|dados do paciente|peso:|atenção|raciocínio)/i;

    for (var j = 0; j < linhas.length; j++) {
      var l = linhas[j].trim();
      if (!l || l === "━━━━━━━━━━━━━━━━━━━━━━━━━" || l === "-------------------------") continue;

      var lSemMd = l.replace(/[*_#`]/g, "").trim();

      // Checa início da seção de orientações ao paciente
      if (lSemMd.match(/orientaç(ão|ões)\s+ao\s+paciente/i) || lSemMd.match(/^orientaç(ão|ões):/i)) {
        emOrientacoes = true;
        continue;
      }

      if (emOrientacoes) {
        if (lSemMd.length > 5 && !regexIgnorar.test(lSemMd)) {
          orientacoes.push(escHtml(lSemMd.replace(/^[-•*]\s*/, "")));
        }
        continue;
      }

      // Detecção de Via de Administração (ex: USO ORAL, USO TÓPICO)
      var matchVia = lSemMd.match(regexVia);
      if (matchVia && matchVia[1] && matchVia[1].length < 35 && matchVia[1].indexOf(":") === -1) {
        viaAtual = matchVia[1].toUpperCase().replace(/[\[\]]/g, "").trim();
        continue;
      }

      // Ignora linhas que sejam puramente cabeçalhos do chat ou dados técnicos
      if (regexIgnorar.test(lSemMd)) continue;
      if (lSemMd.indexOf("PRESCRIÇÃO AMBULATORIAL") !== -1 || lSemMd.indexOf("RECEITUÁRIO") !== -1) {
        continue;
      }

      // Início de novo medicamento (ex: "1. Amoxicilina...", "1) Dipirona...", "• Salbutamol...")
      var matchNovoItem = lSemMd.match(/^(\d+[\)\.]|\•|\-)\s+(.+)$/);
      if (matchNovoItem) {
        var conteudoLinha = matchNovoItem[2].trim();

        // Se for linha de posologia indentada ("Posologia: Tomar 1 cp...")
        if (conteudoLinha.match(/^posologia\s*[:=]?/i) || conteudoLinha.match(/^(tomar|aplicar|ingerir|inalar|instilar|usar)/i)) {
          if (itemAtual) {
            var pSeg = escHtml(conteudoLinha.replace(/^posologia\s*[:=]?\s*/i, "").trim());
            itemAtual.posologia = itemAtual.posologia ? itemAtual.posologia + "<br>" + pSeg : pSeg;
          }
          continue;
        }

        // Se for quantidade a dispensar ("Quantidade: 1 caixa...")
        if (conteudoLinha.match(/^(quantidade|qtd|total)\s*[:=]?/i)) {
          if (itemAtual) {
            itemAtual.quantidade = escHtml(conteudoLinha.replace(/^(quantidade|qtd|total)\s*[:=]?\s*/i, "").trim());
          }
          continue;
        }

        // Novo medicamento
        if (itemAtual) {
          itens.push(itemAtual);
        }

        var nomeMedicamento = conteudoLinha;
        var qtdMedicamento = "";
        var partesDivisao = conteudoLinha.split(/\s+[-—–➔>]+\s+/);
        if (partesDivisao.length > 1) {
          nomeMedicamento = partesDivisao[0].trim();
          qtdMedicamento = partesDivisao.slice(1).join(" - ").trim();
        }

        itemAtual = {
          via: viaAtual,
          nome: escHtml(nomeMedicamento),
          quantidade: escHtml(qtdMedicamento),
          posologia: ""
        };
        continue;
      }

      // Linhas seguintes que complementam o medicamento atual
      if (itemAtual) {
        if (lSemMd.match(/^posologia\s*[:=]?/i) || lSemMd.match(/^(tomar|aplicar|ingerir|inalar|instilar|usar)/i)) {
          var pLinha = escHtml(lSemMd.replace(/^posologia\s*[:=]?\s*/i, "").trim());
          itemAtual.posologia = itemAtual.posologia ? itemAtual.posologia + "<br>" + pLinha : pLinha;
        } else if (lSemMd.match(/^(quantidade|qtd|total)\s*[:=]?/i)) {
          itemAtual.quantidade = escHtml(lSemMd.replace(/^(quantidade|qtd|total)\s*[:=]?\s*/i, "").trim());
        } else if (lSemMd.length > 5 && !regexIgnorar.test(lSemMd)) {
          var pExtra = escHtml(lSemMd);
          itemAtual.posologia = itemAtual.posologia ? itemAtual.posologia + "<br>" + pExtra : pExtra;
        }
      }
    }

    if (itemAtual) {
      itens.push(itemAtual);
    }

    // Fallback se nenhum item estruturado foi encontrado
    if (itens.length === 0) {
      var linhasPuras = textoUtil.split("\n");
      var blocoLimpo = [];
      for (var k = 0; k < linhasPuras.length; k++) {
        var lp = linhasPuras[k].replace(/[*_#`]/g, "").trim();
        if (lp && !regexIgnorar.test(lp) && lp.indexOf("PRESCRIÇÃO") === -1 && lp.indexOf("RECEITUÁRIO") === -1) {
          blocoLimpo.push(escHtml(lp));
        }
      }
      if (blocoLimpo.length > 0) {
        itens.push({
          via: viaAtual,
          nome: blocoLimpo[0],
          quantidade: "",
          posologia: blocoLimpo.slice(1).join("<br>")
        });
      }
    }

    return {
      itens: itens,
      orientacoes: orientacoes,
      ehRascunho: ehRascunho
    };
  }

  function gerarHtmlReceituario(textoPrescricao, dataFormatada, nomePaciente) {
    var dados = extrairItensReceitaLimpos(textoPrescricao);

    // Agrupa itens por via de administração
    var viasMap = {};
    for (var i = 0; i < dados.itens.length; i++) {
      var item = dados.itens[i];
      var v = item.via || "";
      if (!viasMap[v]) viasMap[v] = [];
      viasMap[v].push(item);
    }

    var htmlCorpo = "";
    var contadorGeral = 1;

    for (var nomeVia in viasMap) {
      if (nomeVia) {
        htmlCorpo += "<div style='margin-top: 14px; margin-bottom: 6px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 2px;'>";
        htmlCorpo += escHtml(nomeVia);
        htmlCorpo += "</div>";
      }
      htmlCorpo += "<table width='100%' cellpadding='0' cellspacing='0' style='width: 100%; margin-bottom: 10px;'>";

      var lista = viasMap[nomeVia];
      for (var j = 0; j < lista.length; j++) {
        var m = lista[j];
        htmlCorpo += "<tr>";
        htmlCorpo += "  <td align='left' style='font-weight: bold; padding-top: 6px; padding-bottom: 3px; vertical-align: top;'>";
        htmlCorpo += "    " + contadorGeral + ". " + m.nome;
        htmlCorpo += "  </td>";
        htmlCorpo += "  <td align='right' style='font-weight: normal; white-space: nowrap; padding-top: 6px; vertical-align: top;'>";
        if (m.quantidade) {
          htmlCorpo += "    ----------------- " + m.quantidade;
        }
        htmlCorpo += "  </td>";
        htmlCorpo += "</tr>";
        if (m.posologia) {
          htmlCorpo += "<tr>";
          htmlCorpo += "  <td colspan='2' align='left' style='padding-left: 20px; line-height: 1.45; padding-bottom: 8px;'>";
          htmlCorpo += "    " + m.posologia;
          htmlCorpo += "  </td>";
          htmlCorpo += "</tr>";
        }
        contadorGeral++;
      }
      htmlCorpo += "</table>";
    }

    var htmlOrientacoes = "";
    if (dados.orientacoes && dados.orientacoes.length > 0) {
      htmlOrientacoes = "<div style='margin-top: 18px; border-top: 1px solid #000000; padding-top: 8px;'>" +
        "<div style='font-weight: bold; text-transform: uppercase; margin-bottom: 4px;'>Orientações:</div>" +
        "<div style='line-height: 1.4; padding-left: 8px;'>" +
        dados.orientacoes.map(function(o) { return "• " + o + "<br>"; }).join("") +
        "</div>" +
        "</div>";
    }

    return "<!DOCTYPE html>" +
      "<html><head><meta charset='utf-8'>" +
      "<style>" +
      "  @page { size: A4 portrait; margin: 18mm 20mm 15mm 20mm; }" +
      "  * { box-sizing: border-box; font-family: Arial, sans-serif; font-size: 11pt; color: #000000; }" +
      "  body { font-family: Arial, sans-serif; color: #000000; margin: 0; padding: 0; font-size: 11pt; line-height: 1.4; }" +
      "</style></head><body>" +
      "  <div style='text-align: center; border-bottom: 1px solid #000000; padding-bottom: 8px; margin-bottom: 16px;'>" +
      "    <div style='font-weight: bold; letter-spacing: 2px; text-transform: uppercase;'>RECEITUÁRIO MÉDICO</div>" +
      "    <div style='color: #c00000; font-weight: bold; font-size: 10pt; margin-top: 4px;'>⚠️ DOCUMENTO EM CARÁTER DE RASCUNHO · CONFERÊNCIA MÉDICA OBRIGATÓRIA</div>" +
      "  </div>" +
      "  <table width='100%' cellpadding='0' cellspacing='0' style='width: 100%; border-bottom: 1px solid #000000; margin-bottom: 14px;'>" +
      "    <tr>" +
      "      <td width='70%' align='left' style='padding-bottom: 6px;'>" +
      "        Paciente: <strong>" + nomePaciente + "</strong>" +
      "      </td>" +
      "      <td width='30%' align='right' style='padding-bottom: 6px;'>" +
      "        Data: <strong>" + dataFormatada + "</strong>" +
      "      </td>" +
      "    </tr>" +
      "  </table>" +
      "  <div style='margin-bottom: 18px;'>" +
      htmlCorpo +
      htmlOrientacoes +
      "  </div>" +
      "  <table align='center' width='280' cellpadding='0' cellspacing='0' style='margin: 60px auto 0 auto; text-align: center;'>" +
      "    <tr>" +
      "      <td align='center' style='border-top: 1px solid #000000; padding-top: 6px;'>" +
      "        Assinatura do(a) Médico(a) / CRM" +
      "      </td>" +
      "    </tr>" +
      "  </table>" +
      "</body></html>";
  }

  function obterOuCriarPastaDrive() {
    if(typeof DriveApp==="undefined")return null;
    var props=PropertiesService.getScriptProperties();
    var id=props.getProperty("RECEITAS_PASTA_PRIVADA_ID");
    var folder=id?DriveApp.getFolderById(id):DriveApp.createFolder("Receitas privadas - Ultra Rotina");
    if(!id){folder.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);props.setProperty("RECEITAS_PASTA_PRIVADA_ID",folder.getId());}
    if(folder.getSharingAccess()!==DriveApp.Access.PRIVATE || folder.getEditors().length || folder.getViewers().length)throw new Error("A pasta de receitas precisa ter acesso restrito ao proprietário.");
    return folder;
  }

  return {
    gerarHtml: function(textoPrescricao, dataStr, pacienteStr) {
      return gerarHtmlReceituario(textoPrescricao, dataStr || "03/10/2026", pacienteStr || "Paciente");
    },

    processarEEnviarPdf: function(chatId, textoPrescricao) {
      var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
      var agora = new Date();
      var dataFormatada = Utilities.formatDate(agora, tz, "dd/MM/yyyy");
      var stampArquivo = Utilities.formatDate(agora, tz, "yyyyMMdd_HHmm");
      var nomePaciente = extrairNomePaciente(textoPrescricao);

      var html = gerarHtmlReceituario(textoPrescricao, dataFormatada, nomePaciente);
      var nomeBase = "Receita_" + stampArquivo + "_" + nomePaciente.replace(/\s+/g, "_");

      var blobHtml = Utilities.newBlob(html, "text/html", nomeBase + ".html");
      var blobPdf = blobHtml.getAs("application/pdf");
      blobPdf.setName(nomeBase + ".pdf");

      var linkDrive = "";
      try {
        var pasta = obterOuCriarPastaDrive();
        if (pasta) {
          var arquivo = pasta.createFile(blobPdf);
          // Arquivo mantido restrito ao proprietário da conta Google (sem compartilhamento público)
          linkDrive = arquivo.getUrl();
        }
      } catch (errDrive) {
        Logger.log("Aviso ao salvar no Drive: " + errDrive.message);
      }

      var legenda = "📄 *RECEITUÁRIO MÉDICO (PDF)*\n" +
        "• *Paciente:* " + nomePaciente + "\n" +
        "• *Data:* " + dataFormatada + "\n" +
        (linkDrive ? "🔗 [Abrir no Google Drive](" + linkDrive + ")\n" : "") +
        "✅ Pronto para impressão A4 ou envio direto.";

      var enviado = enviarDocumentoTelegram(chatId, blobPdf, legenda);
      if (!enviado && linkDrive) {
        enviarMensagemParaChat(chatId, "📄 *Receita gerada em PDF no Google Drive:*\n🔗 " + linkDrive);
      }

      var sucessoEfetivo = !!(enviado || (linkDrive && linkDrive.length > 0));
      return {
        sucesso: sucessoEfetivo,
        nomeArquivo: nomeBase + ".pdf",
        linkDrive: linkDrive,
        enviadoTelegram: enviado
      };
    }
  };
})();


// ==============================================================================
// ARQUIVO FONTE: 11_entrega_confiavel.js
// ==============================================================================

/** Entrada persistente e caixa de saída. Não repete automaticamente efeitos incertos. */
var EXECUCAO_ATUAL = null;
var PersistenciaBot = (function() {
  function props() { return PropertiesService.getScriptProperties(); }
  function ler(k) {
    var p = props();
    for (var tent = 0; tent < 2; tent++) {
      var manifest = p.getProperty(k);
      if (!manifest) return null;
      var m = JSON.parse(manifest), texto = '', falhou = false;
      for (var i = 0; i < m.n; i++) {
        var parte = p.getProperty(k + ':' + m.v + ':' + i);
        if (parte === null) {
          falhou = true;
          break;
        }
        texto += parte;
      }
      if (!falhou) {
        return JSON.parse(texto);
      }
    }
    throw new Error('Dados persistidos incompletos.');
  }
  function apagarPartes(k, m) { if (m) for (var i=0;i<m.n;i++) props().deleteProperty(k+':'+m.v+':'+i); }
  function bytesUtf8(str) {
    if (!str) return 0;
    if (typeof Buffer !== 'undefined' && typeof Buffer.byteLength === 'function') {
      return Buffer.byteLength(str, 'utf8');
    }
    if (typeof Utilities !== 'undefined' && typeof Utilities.newBlob === 'function') {
      try { return Utilities.newBlob(str).getBytes().length; } catch (e) {}
    }
    var b = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) b += 1;
      else if (c < 0x800) b += 2;
      else if (c >= 0xD800 && c <= 0xDBFF) { b += 4; i++; }
      else b += 3;
    }
    return b;
  }
  function totalBytes() {
    var all = props().getProperties();
    var b = 0;
    for (var k in all) {
      if (all.hasOwnProperty(k)) b += bytesUtf8(k) + bytesUtf8(all[k]);
    }
    return b;
  }
  function podarPersistenciaAntiga() {
    var keysDone = chaves('inbox_').filter(function(k){
      var j = ler(k);
      return j && j.status === 'done' && (Date.now() - (j.created || 0) > 86400000);
    });
    keysDone.slice(0, 20).forEach(function(k){ remover(k); });
  }
  function salvar(k, valor) {
    var p=props(), s=JSON.stringify(valor), anterior=p.getProperty(k);
    var sBytes = bytesUtf8(s);
    if (sBytes > 25000) throw new Error('Conteúdo muito grande para armazenamento. Divida o pedido.');
    var bAtual = totalBytes();
    if (bAtual + sBytes > 350000) {
      podarPersistenciaAntiga();
      bAtual = totalBytes();
    }
    if (bAtual + sBytes > 400000) {
      throw new Error('Orçamento global de armazenamento excedido (cota 500 KB do GAS). Contrapressão ativada.');
    }
    var m={v:Utilities.getUuid().replace(/-/g,''),n:Math.ceil(s.length/1500)};
    try {
      for (var i=0;i<m.n;i++) p.setProperty(k+':'+m.v+':'+i,s.slice(i*1500,(i+1)*1500));
      p.setProperty(k,JSON.stringify(m));
    } catch(e) { apagarPartes(k,m); throw e; }
    if(anterior) apagarPartes(k,JSON.parse(anterior));
  }
  function remover(k) { var m=props().getProperty(k); props().deleteProperty(k); if(m)apagarPartes(k,JSON.parse(m)); }
  function chaves(prefixo) { return Object.keys(props().getProperties()).filter(function(k){return k.indexOf(prefixo)===0 && k.indexOf(':')===-1;}).sort(); }
  return {ler:ler,salvar:salvar,remover:remover,chaves:chaves};
})();

function enfileirarUpdate(update) {
  var lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var key='inbox_'+update.update_id;
    if(PersistenciaBot.ler(key)) return;
    var todasChaves = PersistenciaBot.chaves('inbox_');
    var ativos = 0;
    for (var ci = 0; ci < todasChaves.length; ci++) {
      var jobI = PersistenciaBot.ler(todasChaves[ci]);
      if (jobI && (jobI.status === 'pending' || jobI.status === 'running')) {
        ativos++;
      }
    }
    if(ativos >= 50) throw new Error('Fila cheia. Tente novamente mais tarde.');
    PersistenciaBot.salvar(key,{update:update,status:'pending',created:Date.now()});
  } finally {lock.releaseLock();}
}

function rotearUpdate(update) {
  if(update.callback_query) return processarCallbackBotao(update.callback_query);
  var m=update.message;
  if(m.voice||m.audio) return processarMensagemVoz(m);
  if(m.photo) return processarMensagemFoto(m);
  if(m.text) return processarMensagemTexto(m);
}

function processarFilaTelegram() {
  // Lock diferente do ingresso: uma IA lenta nunca impede persistir a próxima mensagem.
  var worker=LockService.getUserLock();
  if(!worker.tryLock(1)) return;
  var inicio=Date.now();
  try {
    var keys=PersistenciaBot.chaves('inbox_').sort(function(a,b){return Number(a.slice(6))-Number(b.slice(6));});
    for(var i=0;i<keys.length && Date.now()-inicio<180000;i++) {
      var job=PersistenciaBot.ler(keys[i]);
      if(!job)continue;
      if(job.status==='running') {
        var tempoExec = Date.now() - (job.startedAt || job.created || 0);
        if (tempoExec < 120000) {
          // Execução ativa em andamento por outro worker recente; não interromper
          continue;
        }
        // Uma execução interrompida pode ter concluído uma escrita externa. Não a duplicar.
        job.status='uncertain'; PersistenciaBot.salvar(keys[i],job);
      }
      if(job.status!=='pending') {
        if((job.status==='done' || job.status==='uncertain' || job.status==='failed') && Date.now()-job.created>86400000) {
          PersistenciaBot.remover(keys[i]);
        }
        continue;
      }
      job.status='running'; job.startedAt=Date.now(); PersistenciaBot.salvar(keys[i],job);
      EXECUCAO_ATUAL={id:job.update.update_id,seq:0};
      try {
        var resRoteamento = rotearUpdate(job.update);
        if (resRoteamento === false || (resRoteamento && resRoteamento.sucesso === false)) {
          job.status = 'failed';
        } else {
          job.status = 'done';
          job.update = { update_id: job.update.update_id };
        }
      } catch(e) {
        job.status = 'failed';
        enviarMensagemParaChat(ConfigService.get('TELEGRAM_CHAT_ID'), '⚠️ Não concluí o pedido ' + job.update.update_id + '. Ele foi preservado. Consulte /fila antes de repetir.');
        Logger.log('Falha no pedido ' + job.update.update_id);
      } finally { EXECUCAO_ATUAL = null; }
      PersistenciaBot.salvar(keys[i], job);
    }
    processarCaixaSaida();
  } finally {worker.releaseLock();}
}

function entregarTelegramPersistente(metodo,payload) {
  var key='outbox_'+(EXECUCAO_ATUAL ? EXECUCAO_ATUAL.id+'_'+(++EXECUCAO_ATUAL.seq) : Utilities.getUuid().replace(/-/g,''));
  var item=PersistenciaBot.ler(key);
  if(!item) {item={method:metodo,payload:payload,status:'pending',created:Date.now(),next:0,attempts:0};PersistenciaBot.salvar(key,item);}
  if(item.status==='done') return true;
  var anterior=PersistenciaBot.chaves('outbox_').some(function(k){var j=PersistenciaBot.ler(k);return k!==key && j.status==='pending' && j.created<=item.created;});
  if(anterior)return true;
  return tentarEntregaTelegram(key,item);
}

function tentarEntregaTelegram(key,item) {
  var lock=LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var atual = PersistenciaBot.ler(key);
    if (!atual || atual.status !== 'pending' || atual.next > Date.now()) return true;
    atual.status = 'sending';
    atual.startedAt = Date.now();
    atual.attempts++;
    PersistenciaBot.salvar(key, atual);
    item = atual;
  } finally {
    lock.releaseLock();
  }

  try {
    var options={method:'post',contentType:'application/json',payload:JSON.stringify(item.payload),muteHttpExceptions:true};
    var res=UrlFetchApp.fetch('https://api.telegram.org/bot'+ConfigService.exigir('TELEGRAM_BOT_TOKEN')+'/'+item.method,options);
    var code=res.getResponseCode(),body={};
    try{body=JSON.parse(res.getContentText());}catch(ignore){}
    if(code===200&&body.ok!==false){item.status='done';delete item.payload;}
    else if(code===429){item.status='pending';item.next=Date.now()+Math.max(1,Number(body.parameters&&body.parameters.retry_after)||60)*1000;}
    else if(code===400 && item.payload && item.payload.parse_mode && /can't parse|entities/i.test(body.description||'')) {
      delete item.payload.parse_mode;item.status='pending';item.next=Date.now()+1000;
    } else if(code===400 && /message is not modified/i.test(body.description||'')) {item.status='done';delete item.payload;}
    else {item.status=code>=500?'uncertain':'failed';}
  } catch(e) {item.status='uncertain';}
  PersistenciaBot.salvar(key,item);
  return item.status==='done'||item.status==='pending';
}

function processarCaixaSaida() {
  var interromper=false;
  PersistenciaBot.chaves('outbox_').sort(function(a,b){return PersistenciaBot.ler(a).created-PersistenciaBot.ler(b).created;}).forEach(function(key){
    var item=PersistenciaBot.ler(key);if(!item)return;
    if(item.status==='sending'){
      var tempoVoo = Date.now() - (item.startedAt || item.created || 0);
      if (tempoVoo > 120000) {
        item.status='uncertain';
        PersistenciaBot.salvar(key,item);
      }
    }
    if(item.status==='pending'&&!interromper){tentarEntregaTelegram(key,item);if(PersistenciaBot.ler(key).status==='pending')interromper=true;}
    if(item.status==='done'&&Date.now()-item.created>1800000)PersistenciaBot.remover(key);
  });
}

function mostrarFilaTelegram(chatId) {
  var linhas=[];
  ['inbox_','outbox_'].forEach(function(prefix){PersistenciaBot.chaves(prefix).forEach(function(key){var j=PersistenciaBot.ler(key);if(j.status!=='done')linhas.push(key+': '+j.status);});});
  return enviarMensagemParaChat(chatId,linhas.length?'📬 *Pedidos e entregas*\n\n'+linhas.join('\n')+'\n\nPendentes serão retomados automaticamente. Para recuperar o texto de um pedido, use /pedido seguido do número. Em falhas ou resultado incerto, confira o chat e o destino antes de repetir.':'📬 Nenhuma pendência registrada.');
}


// ==============================================================================
// ARQUIVO FONTE: 12_experiencia_bot.js
// ==============================================================================

/**
 * ==============================================================================
 * src/12_experiencia_bot.js · v2.0
 * ==============================================================================
 * Modos explícitos, menus compactos, botões ergonômicos e exportação para prontuário.
 * Compatível com Google Apps Script V8.
 *
 * Dependências externas (assinaturas conforme a v1):
 *   executarPostTelegram(url, payload), enviarMensagemComTecladoParaChat(chat, texto, kb),
 *   enviarMensagemParaChat(chat, texto), enviarMensagemComTecladoFixo(chat, texto),
 *   responderCallbackTelegram(id, texto), processarMensagemTexto({chat:{id}, text}),
 *   safePutCache(cache, chave, valor, ttl), limparMarkdownTelegram(texto),
 *   sanitizarEValidarPesoKg(valor), ConfigService, EnfermariaService,
 *   PersistenciaBot, ReceitaPdfService, mostrarFilaTelegram(chat).
 * ==============================================================================
 */

var UX_TTL_SEG = 900;
var UX_MAX_CALLBACK_BYTES = 64;
var UX_MAX_COPY_TEXT = 256;
var UX_MAX_EDIT_CHARS = 3800;
var UX_MAX_CASO_CHARS = 6000;
var UX_CB_PASSAGEM_SBAR = 'enfermaria_passagem'; // Callback original da Passagem SBAR

var UX_NOMES_MODO = {
  soap: 'SOAP (Caso Clínico)',
  rx: 'Prescrição Ambulatorial (REMUME)',
  gaso: 'Gasometria Arterial',
  voz: 'Preceptor Socrático',
  calc: 'Calculadoras Clínicas',
  dva: 'Drogas Vasoativas',
  leito: 'Evolução do Leito'
};
var UX_MODOS_TEXTO = ['soap', 'rx', 'gaso', 'voz', 'calc', 'plantao', 'round', 'interacao', 'conduta'];
var UX_DROGAS = { nora: 'Noradrenalina', dobuta: 'Dobutamina', nipride: 'Nitroprussiato' };
var UX_DROGAS_FIXAS = { vaso: 'Vasopressina', tridil: 'Nitroglicerina' };
var UX_DILUICOES = { padrao: 'Padrão', concentrada: 'Concentrada' };
var UX_PESOS_RAPIDOS = [60, 70, 80, 90];
var UX_STATUS_LEITO = ['estavel', 'vigilancia', 'instavel'];
var UX_CONDUTAS = {
  pcr: 'PCR Parada Cardiorrespiratória em ritmo chocável e não chocável',
  eap: 'EAP hipertensivo PA 220x120',
  anafilaxia: 'Anafilaxia em adulto com estridor e hipotensão',
  convulsao: 'Crise convulsiva em curso há mais de 5 minutos',
  hipercalemia: 'Hipercalemia com alterações eletrocardiográficas onda T apiculada',
  cad: 'Cetoacidose diabética glicemia 450 acidose metabólica'
};

/* ========== Utilitários ========== */

function uxCache() { return CacheService.getScriptCache(); }

function uxBytesUtf8(s) {
  s = String(s);
  var n = 0;
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xD800 && c <= 0xDBFF) { n += 4; i++; }
    else n += 3;
  }
  return n;
}

function uxLimparMd(s) { return String(s || '').replace(/[*_`\[\]]/g, ' ').replace(/\s+/g, ' ').trim(); }

function uxTextoDeResposta(r) {
  try {
    if (r === null || r === undefined) return '';
    if (typeof r === 'string') return r;
    if (typeof r.getContentText === 'function') return r.getContentText();
    return JSON.stringify(r);
  } catch (e) { return ''; }
}

function uxDividirTexto(texto, max) {
  var partes = [], resto = String(texto || "");
  while (resto.length > max) {
    var corte = resto.lastIndexOf('\n', max);
    if (corte <= 0 || corte < max / 3) {
      corte = resto.lastIndexOf(' ', max);
    }
    if (corte <= 0) corte = max;
    if (corte > 0 && /[\uD800-\uDBFF]/.test(resto.charAt(corte - 1))) {
      corte--;
    }
    partes.push(resto.slice(0, corte));
    resto = resto.slice(corte).replace(/^[\n ]+/, '');
  }
  if (resto.length) partes.push(resto);
  return partes;
}

/* ========== Teclados e telas ========== */

/**
 * Aceita [texto, callback] ou objeto nativo do Telegram (ex.: {text, copy_text:{text}}).
 * Nunca emite callback_data > 64 bytes: substitui por 'ux:invalido' (falha segura, sem ação indevida).
 */
function botoesBot(rows) {
  return {
    inline_keyboard: rows.map(function (row) {
      return row.map(function (b) {
        if (!Array.isArray(b)) {
          if (b && typeof b === 'object' && b.callback_data) {
            var cbObj = String(b.callback_data);
            if (uxBytesUtf8(cbObj) > UX_MAX_CALLBACK_BYTES) {
              console.error('callback_data > 64 bytes em objeto: ' + cbObj);
              var bClone = {};
              for (var k in b) { bClone[k] = b[k]; }
              bClone.callback_data = 'ux:invalido';
              return bClone;
            }
          }
          return b;
        }
        var cb = String(b[1]);
        if (uxBytesUtf8(cb) > UX_MAX_CALLBACK_BYTES) {
          console.error('callback_data > 64 bytes: ' + cb);
          cb = 'ux:invalido';
        }
        return { text: b[0], callback_data: cb };
      });
    })
  };
}

/** Edita a tela in-place; trata "message is not modified" e mensagens não editáveis com fallback. */
function enviarTelaBot(chat, texto, kb, messageId) {
  if (messageId && String(texto).length < UX_MAX_EDIT_CHARS) {
    var url = 'https://api.telegram.org/bot' + ConfigService.get('TELEGRAM_BOT_TOKEN') + '/editMessageText';
    var payload = {
      chat_id: chat,
      message_id: messageId,
      text: limparMarkdownTelegram(texto),
      parse_mode: 'Markdown',
      reply_markup: kb
    };
    var okEdit = false;
    try {
      okEdit = executarPostTelegram(url, payload);
    } catch (e) {
      okEdit = false;
    }
    if (okEdit) return okEdit;
    return enviarMensagemComTecladoParaChat(chat, texto, kb);
  }
  return enviarMensagemComTecladoParaChat(chat, texto, kb);
}

/* ========== Estado (CacheService, TTL 15 min) ========== */

function modoBot(chat) {
  var raw = uxCache().get('modo_' + chat);
  if (!raw) return null;
  try {
    var s = JSON.parse(raw);
    if (s.expires && s.expires < Date.now()) { uxCache().remove('modo_' + chat); return null; }
    return s;
  } catch (e) { uxCache().remove('modo_' + chat); return null; }
}

function salvarModoBot(chat, state) {
  state.expires = Date.now() + UX_TTL_SEG * 1000;
  safePutCache(uxCache(), 'modo_' + chat, JSON.stringify(state), UX_TTL_SEG);
  return state;
}

function definirModoBot(chat, mode, dados) {
  var c = uxCache();
  ['ctx_' + chat, 'pending_' + chat, 'dvaw_' + chat, 'leito_' + chat].forEach(function (k) {
    c.remove(k);
  });
  return salvarModoBot(chat, { version: 2, mode: mode, data: dados || '' });
}

function limparEstadoBot(chat) {
  var c = uxCache();
  ['modo_' + chat, 'ctx_' + chat, 'pending_' + chat, 'dvaw_' + chat, 'leito_' + chat].forEach(function (k) {
    c.remove(k);
  });
}

/* Estados auxiliares que NÃO sobrescrevem o caso clínico em andamento */
function aguardarPesoDva(chat, droga) { safePutCache(uxCache(), 'dvaw_' + chat, String(droga), 300); }
function aguardarEvolucaoLeito(chat, leito) { safePutCache(uxCache(), 'leito_' + chat, String(leito), 600); }

/* ========== Modos e decisão "Usar este caso" vs "Novo caso" ========== */

function uxMostrarDecisaoCaso(chat, mode, messageId) {
  var atual = modoBot(chat), legacy = uxCache().get('ctx_' + chat);
  var bruto = (atual && atual.data) ? atual.data : String(legacy || '');
  var resumo = uxLimparMd(bruto).slice(0, 140);
  var nomeAtual = atual && UX_NOMES_MODO[atual.mode] ? ' (' + UX_NOMES_MODO[atual.mode] + ')' : '';
  var texto = '*' + UX_NOMES_MODO[mode] + '*\n\n' +
    'Há um caso em andamento' + nomeAtual + ':\n' +
    (resumo ? '“' + resumo + (bruto.length > 140 ? '…' : '') + '”\n\n' : '\n') +
    '*Novo caso* descarta esses dados.';
  return enviarTelaBot(chat, texto, botoesBot([
    [['✅ Usar este caso', 'ux:usar:' + mode], ['🆕 Novo caso', 'ux:novo:' + mode]],
    [['Manter e fechar', 'ux:manter']]
  ]), messageId);
}

function iniciarModoBot(chat, mode, novo, messageId) {
  if (!UX_NOMES_MODO[mode]) return enviarMensagemParaChat(chat, 'Modo desconhecido. Use o teclado rápido.');
  var atual = modoBot(chat), legacy = uxCache().get('ctx_' + chat);
  if (!novo && ((atual && atual.data) || legacy)) {
    safePutCache(uxCache(), 'pending_' + chat, mode, UX_TTL_SEG);
    return uxMostrarDecisaoCaso(chat, mode, messageId);
  }
  definirModoBot(chat, mode);
  var orientacao = mode === 'gaso'
    ? 'Envie pH, pCO2 e HCO3, com as unidades disponíveis.'
    : 'Grave um áudio narrando o caso ou envie os dados por texto.';
  return enviarTelaBot(chat,
    '*' + UX_NOMES_MODO[mode] + ' · Novo Caso*\n\n' + orientacao + '\n\n💡 /cancelar encerra este modo a qualquer momento.',
    botoesBot([[['Encerrar', 'ux:cancelar']]]), messageId);
}

/* ========== Sala Vermelha, DVA, SRI e condutas ========== */

function enviarMenuSalaVermelha(chat, messageId) {
  return enviarTelaBot(chat, '🚨 *SALA VERMELHA*\nEscolha uma ação.', botoesBot([
    [['🫀 Parada (ACLS)', 'ux:conduta:pcr']],
    [['🫁 Intubação (SRI)', 'ux:srimenu']],
    [['💉 Noradrenalina', 'ux:droga:nora'], ['💉 Dobutamina', 'ux:droga:dobuta']],
    [['💉 Outras DVA', 'ux:dvamenu'], ['🩸 Gasometria', 'ux:iniciar:gaso']],
    [['⚡ Outras emergências', 'ux:condutamenu']],
    [['← Menu principal', 'ux:menu']]
  ]), messageId);
}

function enviarMenuDva(chat, messageId) {
  return enviarTelaBot(chat, '💉 *Drogas vasoativas*\nQual medicamento?', botoesBot([
    [['Noradrenalina', 'ux:droga:nora'], ['Dobutamina', 'ux:droga:dobuta']],
    [['Nitroprussiato', 'ux:droga:nipride'], ['Vasopressina', 'ux:fixa:vaso']],
    [['Nitroglicerina', 'ux:fixa:tridil']],
    [['← Sala vermelha', 'ux:sala']]
  ]), messageId);
}

function enviarTelaPesoDva(chat, droga, messageId) {
  var r = [], linha = [];
  UX_PESOS_RAPIDOS.forEach(function (p) {
    linha.push([p + ' kg', 'ux:peso:' + droga + ':' + p]);
    if (linha.length === 2) { r.push(linha); linha = []; }
  });
  if (linha.length) r.push(linha);
  r.push([['← Trocar medicamento', 'ux:dvamenu']]);
  r.push([['Encerrar cálculo', 'ux:cancelar']]);
  return enviarTelaBot(chat,
    '💉 *' + UX_DROGAS[droga].toUpperCase() + '*\nPeso do paciente\n\n' +
    'Toque em um peso ou envie o valor em kg (ex.: 73,5). Os botões são aproximações: use o peso real quando souber.',
    botoesBot(r), messageId);
}

function enviarTelaDiluicaoDva(chat, droga, peso, messageId) {
  var p = String(peso).replace(',', '.');
  return enviarTelaBot(chat,
    '💉 *' + UX_DROGAS[droga].toUpperCase() + ' · ' + String(peso).replace('.', ',') + ' kg*\nSelecione a diluição.',
    botoesBot([
      [['Padrão', 'ux:diluicao:' + droga + ':' + p + ':padrao'], ['Concentrada', 'ux:diluicao:' + droga + ':' + p + ':concentrada']],
      [['✏️ Alterar peso', 'ux:droga:' + droga]],
      [['← Trocar medicamento', 'ux:dvamenu']]
    ]), messageId);
}

function enviarMenuSri(chat, messageId) {
  return enviarTelaBot(chat,
    '🫁 *Intubação (SRI)*\nSelecione o peso ou cenário.\nOutro peso: envie `/sri 85`.',
    botoesBot([
      [['60 kg', 'ux:sri:60'], ['70 kg', 'ux:sri:70']],
      [['80 kg', 'ux:sri:80'], ['90 kg', 'ux:sri:90']],
      [['Choque 70 kg', 'ux:sri:70 choque'], ['Asma 70 kg', 'ux:sri:70 asma']],
      [['← Sala vermelha', 'ux:sala']]
    ]), messageId);
}

function enviarMenuCondutas(chat, messageId) {
  return enviarTelaBot(chat, '⚡ *Outras emergências*\nSelecione:', botoesBot([
    [['🚨 EAP hipertensivo', 'ux:conduta:eap'], ['⚡ Anafilaxia', 'ux:conduta:anafilaxia']],
    [['🧠 Crise convulsiva', 'ux:conduta:convulsao'], ['🧪 Hipercalemia', 'ux:conduta:hipercalemia']],
    [['🩸 Cetoacidose (CAD)', 'ux:conduta:cad']],
    [['← Sala vermelha', 'ux:sala']]
  ]), messageId);
}

function enviarHubPrincipal(chat, messageId) {
  var texto = '⚡ *Ultra Rotina · Central de Comandos*\n\n' +
    'Selecione uma área de atendimento ou use o teclado rápido no rodapé:\n\n' +
    '🚨 *Emergência:* DVA em mL/h, SRI, Gasometria e Condutas\n' +
    '🏥 *Enfermaria:* Quadro de Leitos e Passagem SBAR\n' +
    '💊 *Prescrição:* REMUME Ribeirão Preto com emissão de PDF\n' +
    '🩺 *Ambulatório:* Síntese SOAP e Preceptor de Voz\n' +
    '📐 *Calculadoras:* Escores clínicos e clearance determinísticos\n' +
    '📅 *Minha Rotina:* Calendar, Tarefas Notion e MedQuest';

  var botoes = [
    [['🚨 Sala Vermelha', 'ux:hub:sala'], ['🏥 Enfermaria', 'ux:hub:enf']],
    [['💊 Prescrever (REMUME)', 'ux:hub:rx'], ['📐 Calculadoras', 'ux:hub:calc']],
    [['🩺 Novo SOAP', 'ux:hub:soap'], ['📋 Passagem SBAR', 'ux:hub:sbar']],
    [['📅 Minha Rotina', 'ux:hub:rotina'], ['❔ Manual Completo', 'ux:hub:manual']]
  ];

  return enviarTelaBot(chat, texto, botoesBot(botoes), messageId);
}

function enviarMenuUXCalculadoras(chat, messageId) {
  return enviarTelaBot(chat, '📐 *Calculadoras*\nEscolha o que precisa.', botoesBot([
    [['Drogas vasoativas', 'ux:dvamenu'], ['Gasometria', 'ux:iniciar:gaso']],
    [['Outras calculadoras', 'calc_menu_principal'], ['Sala vermelha', 'ux:sala']],
    [['← Menu principal', 'ux:menu']]
  ]), messageId);
}

function enviarRotinaBot(chat, messageId) {
  return enviarTelaBot(chat, '*📅 Central de Rotina & Lifestyle*\nSelecione uma ação rápida:', botoesBot([
    [['📆 Agenda de Hoje', 'ux:rotina:agenda'], ['📆 Agenda de Amanhã', 'ux:rotina:agenda_amanha']],
    [['📋 Minhas Tarefas', 'ux:rotina:tasks'], ['🌙 Check-in Noturno', 'ux:rotina:checkin']],
    [['🏁 Fim de Plantão', 'ux:rotina:plantao_fim'], ['🧠 Dúvida MedQuest', 'ux:rotina:duvida']],
    [['← Menu principal', 'ux:menu']]
  ]), messageId);
}

/* ========== Enfermaria ========== */

function enviarPainelEnfermaria(chat, pagina, msgId) {
  var all = EnfermariaService.obterTodos();
  var keys = Object.keys(all).sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true }); });
  pagina = Math.max(0, Math.min(Number(pagina) || 0, Math.max(0, Math.ceil(keys.length / 5) - 1)));
  var slice = keys.slice(pagina * 5, pagina * 5 + 5), rows = [];
  var estaveis = 0, vigilancias = 0, instaveis = 0;
  keys.forEach(function (k) {
    var st = String(all[k].status || '').toLowerCase();
    if (st.indexOf('inst') !== -1) instaveis++;
    else if (st.indexOf('vigil') !== -1) vigilancias++;
    else estaveis++;
  });
  var censo = keys.length ? ' · (' + keys.length + ' leitos: 🟢 ' + estaveis + ' | 🟡 ' + vigilancias + ' | 🔴 ' + instaveis + ')' : '';
  var texto = '🏥 *Enfermaria' + censo + '*\n\n';
  if (!keys.length) texto += 'Nenhum leito registrado. Use /leito 4 seguido da evolução.';
  slice.forEach(function (id) {
    var l = all[id];
    texto += '*Leito ' + id + '* · ' + l.status + '\n' + l.dataISO + ' ' + l.atualizadoEm + '\n\n';
    rows.push([['Abrir leito ' + id, 'ux:leito:' + id]]);
  });
  var nav = [];
  if (pagina > 0) nav.push(['← Anterior', 'ux:painel:' + (pagina - 1)]);
  if ((pagina + 1) * 5 < keys.length) nav.push(['Próxima →', 'ux:painel:' + (pagina + 1)]);
  if (nav.length) rows.push(nav);
  rows.push([['🔄 Atualizar', 'ux:painel:' + pagina], ['Passagem SBAR', UX_CB_PASSAGEM_SBAR]]);
  return enviarTelaBot(chat, texto, botoesBot(rows), msgId);
}

function uxTelaLeito(chat, id, msgId, aviso) {
  var l = EnfermariaService.obterLeito(id);
  if (!l) return enviarMensagemParaChat(chat, 'Leito não encontrado.');
  var texto = (aviso ? '✅ ' + aviso + '\n\n' : '') +
    '🛏️ *Leito ' + id + '* · ' + l.status + '\n📅 ' + l.dataISO + ' às ' + l.atualizadoEm + '\n\n' + l.dados;
  var ver = (l.version ? l.version.slice(0, 8) : '');
  return enviarTelaBot(chat, texto, botoesBot([
    [['🟢 Estável', 'ux:status:' + id + ':estavel' + (ver ? ':' + ver : '')], ['🟡 Vigilância', 'ux:status:' + id + ':vigilancia' + (ver ? ':' + ver : '')]],
    [['🔴 Instável', 'ux:status:' + id + ':instavel' + (ver ? ':' + ver : '')]],
    [['✏️ Evoluir leito', 'ux:evoluir:' + id], ['Dar alta', 'ux:confirmar:' + id]],
    [['← Enfermaria', 'ux:painel:0']]
  ]), msgId);
}

function confirmarAltaBot(chat, id) {
  var l = EnfermariaService.obterLeito(id);
  if (!l) return enviarMensagemParaChat(chat, 'Leito não encontrado.');
  var code = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  safePutCache(uxCache(), 'alta_' + code, JSON.stringify({
    id: id, chat: String(chat), version: l.version || (l.dataISO + ' ' + l.atualizadoEm)
  }), 300);
  return enviarMensagemComTecladoParaChat(chat,
    'Confirmar alta do leito ' + id + '? O histórico será preservado.',
    botoesBot([[['Confirmar alta', 'ux:alta:' + code], ['Cancelar', 'ux:leito:' + id]]]));
}

/* ========== Exportação para prontuário ========== */

/** Texto plano, sem Markdown, emojis ou ruído de navegação. */
function uxTextoProntuario(raw) {
  return String(raw || '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/`+/g, '')
    .replace(/\*+/g, '')
    .replace(/(^|\s)_+|_+(?=\s|$)/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Linha de botões de exportação para anexar a resultados (uso por outros módulos).
 * Texto limpo de 1–256 caracteres => botão nativo copy_text; caso contrário => envio em texto plano.
 */
function uxLinhaCopiar(chaveCache, resultado) {
  var limpo = uxTextoProntuario(resultado);
  if (limpo.length >= 1 && limpo.length <= UX_MAX_COPY_TEXT) {
    return [{ text: '📋 Copiar texto', copy_text: { text: limpo } }];
  }
  return [['📄 Texto p/ prontuário', 'ux:copiar:' + chaveCache]];
}

/* ========== Entrada de texto ========== */

function tratarEntradaUX(message) {
  var chat = message.chat.id, text = (message.text || '').trim(), cache = uxCache();

  if (text === '/fila') { mostrarFilaTelegram(chat); return true; }
  if (/^\/pedido \d+$/.test(text)) {
    var job = PersistenciaBot.ler('inbox_' + text.split(' ')[1]);
    var original = job && job.update && (job.update.message || {}).text;
    enviarMensagemParaChat(chat, original ? '*Pedido preservado*\n\n' + original : 'Pedido sem texto disponível; confira o áudio ou a imagem original no chat.');
    return true;
  }

  var menus = { '🩺 Novo SOAP': 'soap', '💊 Prescrever': 'rx', '🩸 Gaso': 'gaso', '🎧 Preceptor Voz': 'voz' };
  if (menus[text]) { iniciarModoBot(chat, menus[text], text === '🩺 Novo SOAP'); return true; }

  if (text === '/novo' || text === '/cancelar') {
    limparEstadoBot(chat);
    enviarMensagemComTecladoFixo(chat, 'Conversa encerrada. Escolha uma ação para começar outro caso.');
    return true;
  }
  if (text === '📅 Minha rotina' || text === '📅 Minha Rotina') { enviarRotinaBot(chat); return true; }
  if (text === '🚨 Sala Vermelha' || text === '/sala') { enviarMenuSalaVermelha(chat); return true; }
  if (text === '📐 Calculadoras') { enviarMenuUXCalculadoras(chat); return true; }
  if (['❔ Ajuda', '⚙️ Menu / Ajuda', '/start', '/menu', '/ajuda', '/help', '/teclado'].indexOf(text) !== -1) {
    if (text === '/menu' || text === '/start') {
      enviarHubPrincipal(chat);
      return true;
    }
    enviarMensagemComTecladoFixo(chat, '*Ultra Rotina · Copiloto Clínico*\n\nEscolha uma ação no teclado rápido ou envie qualquer caso clínico por texto ou áudio.\n\n/menu · Central de comandos e atalhos\n/novo · Iniciar outro caso\n/cancelar · Sair do modo atual\n/manual · Todos os comandos\n/fila · Pedidos e entregas pendentes');
    return true;
  }
  if (text === '🏥 Enfermaria' || text === '/enfermaria') { enviarPainelEnfermaria(chat, 0); return true; }
  if (text === '/limpar_enfermaria') {
    enviarMensagemParaChat(chat, 'Para preservar os dados, confirme a alta de cada leito no painel /enfermaria.');
    return true;
  }
  if (/^\/alta\s+/.test(text)) { confirmarAltaBot(chat, text.replace(/^\/alta\s+/, '')); return true; }

  if (text.charAt(0) === '/') {
    ['modo_' + chat, 'dvaw_' + chat, 'leito_' + chat].forEach(function (k) {
      cache.remove(k);
    });
    return false;
  }

  var pendente = cache.get('pending_' + chat);
  if (pendente && UX_NOMES_MODO[pendente]) {
    uxMostrarDecisaoCaso(chat, pendente);
    return true;
  }

  var drogaAguardando = cache.get('dvaw_' + chat);
  if (drogaAguardando && UX_DROGAS[drogaAguardando]) {
    var p = sanitizarEValidarPesoKg(text);
    if (p === null) {
      enviarMensagemParaChat(chat, 'Informe apenas o peso em kg, por exemplo 70,5. /cancelar encerra.');
      return true;
    }
    cache.remove('dvaw_' + chat);
    enviarTelaDiluicaoDva(chat, drogaAguardando, p);
    return true;
  }

  var leitoAguardando = cache.get('leito_' + chat);
  if (leitoAguardando) {
    cache.remove('leito_' + chat);
    message.text = '/leito ' + leitoAguardando + ' ' + text;
    return false;
  }

  var state = modoBot(chat);
  if (state && UX_MODOS_TEXTO.indexOf(state.mode) !== -1) {
    var dados = state.data ? state.data + '\nAtualização: ' + text : text;
    if (dados.length > UX_MAX_CASO_CHARS) {
      enviarMensagemParaChat(chat, 'O caso ultrapassou 6.000 caracteres. Nenhum dado foi cortado. Use /novo para outro caso.');
      return true;
    }
    definirModoBot(chat, state.mode, dados);
    message.text = '/' + state.mode + ' ' + dados;
    return false;
  }

  cache.remove('ctx_' + chat);
  return false;
}

/* ========== Callbacks ========== */

function tratarCallbackUX(cb) {
  var data = String(cb.data || '');
  if (data.indexOf('ux:') !== 0) return false;
  var chat = cb.message.chat.id, msgId = cb.message.message_id, cache = uxCache();
  try { responderCallbackTelegram(cb.id, ''); } catch (e) { console.error('answerCallbackQuery: ' + e); }

  var p = data.split(':'), op = p[1], v = p.slice(2).join(':');
  var texto = function (t) { return processarMensagemTexto({ chat: { id: chat }, text: t }); };

  try {
    if (op === 'invalido') {
      enviarMensagemParaChat(chat, 'Botão indisponível. Reabra o menu e tente novamente.');
    } else if (op === 'menu' || (op === 'hub' && v === 'inicio')) {
      enviarHubPrincipal(chat, msgId);
    } else if (op === 'hub') {
      if (v === 'sala') {
        enviarMenuSalaVermelha(chat, msgId);
      } else if (v === 'enf') {
        enviarPainelEnfermaria(chat, 0, msgId);
      } else if (v === 'rx') {
        iniciarModoBot(chat, 'rx', false, msgId);
      } else if (v === 'calc') {
        enviarMenuUXCalculadoras(chat, msgId);
      } else if (v === 'soap') {
        iniciarModoBot(chat, 'soap', true, msgId);
      } else if (v === 'sbar') {
        texto('/passagem');
      } else if (v === 'rotina') {
        enviarRotinaBot(chat, msgId);
      } else if (v === 'manual') {
        texto('/manual');
      }
    } else if (op === 'novo') {
      iniciarModoBot(chat, v, true, msgId);
    } else if (op === 'iniciar') {
      iniciarModoBot(chat, v, false, msgId);
    } else if (op === 'usar') {
      if (!UX_NOMES_MODO[v]) { enviarMensagemParaChat(chat, 'Modo desconhecido.'); return true; }
      var anterior = modoBot(chat), legacy = cache.get('ctx_' + chat);
      var dados = (anterior && anterior.data) ? anterior.data : String(legacy || '');
      definirModoBot(chat, v, dados);
      enviarTelaBot(chat, '*' + UX_NOMES_MODO[v] + '*\n\nDados do caso atual mantidos. Envie a próxima informação.',
        botoesBot([[['Encerrar', 'ux:cancelar']]]), msgId);
    } else if (op === 'manter') {
      cache.remove('pending_' + chat);
      enviarTelaBot(chat, 'Caso atual mantido.', botoesBot([]), msgId);
    } else if (op === 'cancelar') {
      texto('/cancelar');
    } else if (op === 'rotina') {
      if (v === 'duvida') enviarMensagemParaChat(chat, '🧠 *Dúvida MedQuest*\n\nEnvie: `/duvida seu tema`');
      else if (v === 'agenda_amanha') texto('/agenda amanha');
      else texto('/' + v);
    } else if (op === 'sala') {
      enviarMenuSalaVermelha(chat, msgId);
    } else if (op === 'dvamenu') {
      enviarMenuDva(chat, msgId);
    } else if (op === 'fixa') {
      if (!UX_DROGAS_FIXAS[v]) enviarMensagemParaChat(chat, 'Medicamento desconhecido.');
      else texto('/dva ' + v);
    } else if (op === 'droga') {
      if (!UX_DROGAS[v]) { enviarMensagemParaChat(chat, 'Medicamento desconhecido.'); return true; }
      aguardarPesoDva(chat, v);
      enviarTelaPesoDva(chat, v, msgId);
    } else if (op === 'peso') {
      var pp = v.split(':'), drogaP = pp[0], pesoP = sanitizarEValidarPesoKg(pp[1]);
      if (!UX_DROGAS[drogaP] || pesoP === null) { enviarMensagemParaChat(chat, 'Peso inválido. Informe o peso em kg.'); return true; }
      cache.remove('dvaw_' + chat);
      enviarTelaDiluicaoDva(chat, drogaP, pesoP, msgId);
    } else if (op === 'diluicao') {
      var pd = v.split(':');
      if (pd.length < 3) { enviarMensagemParaChat(chat, 'Botão antigo. Reabra a droga em Sala Vermelha.'); return true; }
      var pesoD = sanitizarEValidarPesoKg(pd[1]);
      if (!UX_DROGAS[pd[0]] || pesoD === null || !UX_DILUICOES[pd[2]]) { enviarMensagemParaChat(chat, 'Dados do cálculo inválidos. Reabra a droga.'); return true; }
      texto('/dva ' + pd[0] + ' ' + pesoD + ' ' + pd[2]);
    } else if (op === 'srimenu') {
      enviarMenuSri(chat, msgId);
    } else if (op === 'sri') {
      texto('/sri ' + v);
    } else if (op === 'condutamenu') {
      enviarMenuCondutas(chat, msgId);
    } else if (op === 'conduta') {
      texto('/conduta ' + (UX_CONDUTAS[v] || v));
    } else if (op === 'painel') {
      enviarPainelEnfermaria(chat, v, msgId);
    } else if (op === 'leito') {
      uxTelaLeito(chat, v, msgId);
    } else if (op === 'status') {
      var ps = v.split(':'), numL = ps[0], tipo = ps[1], versaoEsp = ps[2];
      if (UX_STATUS_LEITO.indexOf(tipo) === -1) { enviarMensagemParaChat(chat, 'Status inválido.'); return true; }
      if (!versaoEsp) {
        enviarMensagemParaChat(chat, 'Este botão de status pertence a uma mensagem anterior ou a outro paciente. Abra o leito novamente.');
        return true;
      }
      var rSt = EnfermariaService.atualizarStatusLeito(numL, tipo, versaoEsp);
      if (rSt.sucesso) uxTelaLeito(chat, numL, msgId, rSt.mensagem);
      else enviarMensagemParaChat(chat, rSt.erro || rSt.mensagem);
    } else if (op === 'evoluir') {
      aguardarEvolucaoLeito(chat, v);
      enviarMensagemParaChat(chat, 'Envie a nova evolução do leito ' + v + ' por texto ou áudio. A versão anterior ficará registrada no histórico.');
    } else if (op === 'confirmar') {
      confirmarAltaBot(chat, v);
    } else if (op === 'alta') {
      var rawAlta = cache.get('alta_' + v);
      if (!rawAlta) { enviarMensagemParaChat(chat, 'Confirmação expirada. Abra o leito novamente.'); return true; }
      var a = JSON.parse(rawAlta);
      if (a.chat !== String(chat)) { enviarMensagemParaChat(chat, 'Confirmação inválida para este chat.'); return true; }
      var result = EnfermariaService.desocuparLeito(a.id, a.version);
      cache.remove('alta_' + v);
      enviarMensagemParaChat(chat, result.mensagem);
    } else if (op === 'detalhes' || op === 'copiar' || op === 'pdf') {
      var raw = cache.get(v);
      if (!raw) { enviarMensagemParaChat(chat, 'Resultado expirado. Gere novamente com os dados do caso.'); return true; }
      if (op === 'pdf') ReceitaPdfService.processarEEnviarPdf(chat, raw);
      else if (op === 'copiar') uxDividirTexto(uxTextoProntuario(raw), 3800).forEach(function (parte) { enviarMensagemParaChat(chat, parte); });
      else enviarMensagemParaChat(chat, raw);
    } else {
      enviarMensagemParaChat(chat, 'Ação não reconhecida. Reabra o menu.');
    }
  } catch (e) {
    console.error('tratarCallbackUX [' + data + ']: ' + ((e && e.stack) || e));
    try { enviarMensagemParaChat(chat, 'Não consegui concluir essa ação. Tente novamente ou use /cancelar.'); } catch (e2) {}
  }
  return true;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    botoesBot: botoesBot,
    enviarTelaBot: enviarTelaBot,
    modoBot: modoBot,
    definirModoBot: definirModoBot,
    limparEstadoBot: limparEstadoBot,
    iniciarModoBot: iniciarModoBot,
    enviarMenuSalaVermelha: enviarMenuSalaVermelha,
    enviarMenuDva: enviarMenuDva,
    enviarTelaPesoDva: enviarTelaPesoDva,
    enviarTelaDiluicaoDva: enviarTelaDiluicaoDva,
    enviarMenuSri: enviarMenuSri,
    enviarMenuCondutas: enviarMenuCondutas,
    enviarMenuUXCalculadoras: enviarMenuUXCalculadoras,
    enviarRotinaBot: enviarRotinaBot,
    enviarPainelEnfermaria: enviarPainelEnfermaria,
    confirmarAltaBot: confirmarAltaBot,
    uxTextoProntuario: uxTextoProntuario,
    uxLinhaCopiar: uxLinhaCopiar,
    tratarEntradaUX: tratarEntradaUX,
    tratarCallbackUX: tratarCallbackUX
  };
}
