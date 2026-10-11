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

// Protege URLs literais contra a limpeza de Markdown (por exemplo, '_' em um link).
function transformarPreservandoUrls(texto, transformar) {
  var urls = [], prefixo = "URLPRESERVADABOT";
  while (texto.indexOf(prefixo) >= 0) prefixo += "X";
  var protegido = texto.replace(/https?:\/\/[^\s<>]+/g, function(url) {
    var marcador = prefixo + urls.length + "FIM";
    urls.push(url);
    return marcador;
  });
  var resultado = transformar(protegido);
  urls.forEach(function(url, i) { resultado = resultado.split(prefixo + i + "FIM").join(url); });
  return resultado;
}

/**
 * Sanitizador Universal de Markdown para o Telegram Bot API.
 * Remove fragmentos LaTeX, fecha marcações ímpares (* e _) e trata caracteres sensíveis.
 */
function limparMarkdownTelegram(texto) {
  if (!texto) return "";
  return transformarPreservandoUrls(String(texto), function(str) {

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

  // 5. Balanceamento de blocos triplos de código (```)
  var countTriple = (str.match(/```/g) || []).length;
  if (countTriple % 2 !== 0) {
    str += "\n```";
  }

  // 6. Balanceamento de crases simples (`)
  var strSemTriplos = str.replace(/```[\s\S]*?```/g, "");
  var countBacktick = (strSemTriplos.match(/`/g) || []).length;
  if (countBacktick % 2 !== 0) {
    var lastIdxB = str.lastIndexOf("`");
    if (lastIdxB !== -1) {
      str = str.substring(0, lastIdxB) + str.substring(lastIdxB + 1);
    }
  }

  // 7. Balanceamento de colchetes soltos [ que causam parse error no Markdown v1
  var countOpenBracket = (str.match(/(?:^|[^\\])\[/g) || []).length;
  var countCloseBracket = (str.match(/(?:^|[^\\])\]/g) || []).length;
  if (countOpenBracket > countCloseBracket) {
    str = str.replace(/\[(?=[^\]]*$)/g, "\\[");
  }

  return str;
  });
}

/**
 * Sanitiza texto HTML para a API do Telegram preservando tags suportadas
 * e escapando caracteres reservados (<, >, &) isolados para evitar erro HTTP 400.
 */
function sanitizarHtmlTelegram(texto) {
  if (!texto) return "";
  var str = String(texto);
  var tagsValidas = [];
  var tagRegex = /<\/?(?:b|strong|i|em|u|ins|s|strike|del|code|pre|blockquote|tg-spoiler)(?:\s+[^<>]*)?>|<a\s+href="[^"]*">(?:[\s\S]*?)<\/a>/gi;
  var prefixo = "HTMLTAGPRESERVADAX";
  while (str.indexOf(prefixo) >= 0) prefixo += "Y";

  var protegido = str.replace(tagRegex, function(match) {
    var marcador = prefixo + tagsValidas.length + "FIM";
    tagsValidas.push(match);
    return marcador;
  });

  protegido = protegido.replace(/&/g, "&amp;")
                       .replace(/</g, "&lt;")
                       .replace(/>/g, "&gt;");

  tagsValidas.forEach(function(tag, i) {
    protegido = protegido.split(prefixo + i + "FIM").join(tag);
  });

  return protegido;
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

var _ultimoChatActionTimestamp = {};

function enviarChatAction(chatId, acao, forcar) {
  var token = ConfigService.get("TELEGRAM_BOT_TOKEN");
  if (!token || !chatId) return false;
  acao = acao || "typing";
  var agora = new Date().getTime();
  var k = String(chatId) + "_" + acao;

  // Throttling inteligente: se já enviou a mesma ação há menos de 3.500 ms e não é forçado, evita chamada de rede redundante
  if (!forcar && _ultimoChatActionTimestamp[k] && (agora - _ultimoChatActionTimestamp[k]) < 3500) {
    return false;
  }
  _ultimoChatActionTimestamp[k] = agora;

  return executarPostTelegram("https://api.telegram.org/bot" + token + "/sendChatAction", {
    "chat_id": chatId,
    "action": acao
  });
}

function renovarChatActionSeNecessario(chatId, acao) {
  return enviarChatAction(chatId, acao || "typing", false);
}

function enviarMensagemParaChat(chatId, texto) {
  return enviarMensagemSegmentada(chatId, texto, null);
}

function enviarMensagemComTecladoParaChat(chatId, texto, teclado) {
  return enviarMensagemSegmentada(chatId, texto, teclado);
}
var enviarMensagemComBotoes = enviarMensagemComTecladoParaChat;

function enviarMensagemSegmentada(chatId, texto, teclado, messageIdParaEditar) {
  if (!texto) return false;
  var token = ConfigService.get("TELEGRAM_BOT_TOKEN");
  if (!token) return false;

  var partes = fragmentarTexto(texto, 3700);
  var sucessoGeral = true;
  var totalPartes = partes.length;

  for (var i = 0; i < totalPartes; i++) {
    var ehPrimeira = (i === 0);
    var ehUltima = (i === totalPartes - 1);
    var parteConteudo = partes[i];

    // Se houver múltiplas partes, adiciona sinalização visual de continuidade para evitar perda de conduta beira-leito
    if (totalPartes > 1) {
      var cabecalhoParte = !ehPrimeira ? "📄 _[Parte " + (i + 1) + "/" + totalPartes + " · Continuação]_\n\n" : "";
      var rodapeParte = !ehUltima ? "\n\n📄 _[Parte " + (i + 1) + "/" + totalPartes + " · Continua abaixo ⬇️]_" : "";
      parteConteudo = cabecalhoParte + parteConteudo + rodapeParte;
    }

    var contemHtml = /<\/?(?:b|i|u|s|code|pre|a)\b/i.test(parteConteudo);
    var textoEnvio;
    if (contemHtml) {
      textoEnvio = typeof sanitizarHtmlTelegram === "function" ? sanitizarHtmlTelegram(parteConteudo) : parteConteudo;
    } else {
      textoEnvio = limparMarkdownTelegram(parteConteudo);
    }

    var payload = {
      "chat_id": chatId,
      "text": textoEnvio,
      "parse_mode": contemHtml ? "HTML" : "Markdown"
    };
    if (ehUltima && teclado) {
      payload.reply_markup = teclado;
    }

    var enviado = false;

    // Se for a primeira parte e houver messageIdParaEditar (Fast-Ack), tenta editar in-place a mensagem temporária
    if (ehPrimeira && messageIdParaEditar) {
      var urlEdit = "https://api.telegram.org/bot" + token + "/editMessageText";
      var payloadEdit = {
        "chat_id": String(chatId),
        "message_id": Number(messageIdParaEditar),
        "text": textoEnvio,
        "parse_mode": payload.parse_mode
      };
      if (ehUltima && teclado) {
        payloadEdit.reply_markup = teclado;
      }
      try {
        enviado = executarPostTelegram(urlEdit, payloadEdit);
      } catch (eEdit) {
        enviado = false;
      }
    }

    // Se não editou in-place (ou não era a 1ª parte ou a edição falhou), envia via sendMessage
    if (!enviado) {
      enviado = executarPostTelegram("https://api.telegram.org/bot" + token + "/sendMessage", payload);
    }

    // Se falhou o envio formatado, tenta fallback em texto plano limpo
    if (!enviado) {
      var textoPuro = parteConteudo.replace(/<[^>]+>/g, "").replace(/[*_`#]/g, "");
      var payloadFallback = {
        "chat_id": chatId,
        "text": textoPuro
      };
      if (ehUltima && teclado) {
        payloadFallback.reply_markup = teclado;
      }
      enviado = executarPostTelegram("https://api.telegram.org/bot" + token + "/sendMessage", payloadFallback);
      if (!enviado) {
        sucessoGeral = false;
      }
    }

    if (totalPartes > 1 && !ehUltima) {
      if (typeof Utilities !== "undefined" && Utilities.sleep) {
        Utilities.sleep(400);
      }
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

    // Se houve erro de parse no Markdown/HTML do Telegram (HTTP 400), tenta reenviar texto plano
    if (code === 400 && (payload.parse_mode || /can't parse|entities|unsupported/i.test(res.getContentText ? res.getContentText() : ""))) {
      var corpo400 = res.getContentText ? res.getContentText() : "";
      if (corpo400.indexOf("can't parse") !== -1 || corpo400.indexOf("entity") !== -1 || corpo400.indexOf("unsupported") !== -1 || !corpo400) {
        delete payload.parse_mode;
        if (payload.text) {
          payload.text = payload.text.replace(/<[^>]+>/g, "").replace(/[*_`#]/g, "");
        }
        options.payload = JSON.stringify(payload);
        var retryRes = UrlFetchApp.fetch(url, options);
        return retryRes.getResponseCode() === 200;
      }
    }
    return false;
  } catch (e) {
    Logger.log("Exceção ao postar no Telegram: " + e.message);
    // Em caso de exceção de rede transitória (timeout/socket), tenta 1 retentativa rápida com backoff
    try {
      if (typeof Utilities !== "undefined" && Utilities.sleep) {
        Utilities.sleep(300);
      }
      var resRetryNet = UrlFetchApp.fetch(url, options);
      if (resRetryNet && resRetryNet.getResponseCode() === 200) return true;
    } catch (eRetry) {
      Logger.log("Falha persistente na retentativa de rede: " + eRetry.message);
    }
    return false;
  }
}

function obterUrlCockpit(chatId) {
  var urlCustom = (typeof ConfigService !== "undefined") ? ConfigService.get("COCKPIT_WEB_URL") : null;
  var base = urlCustom ? urlCustom.split("?")[0] : "https://wagmms.github.io/cockpit/";
  var id = chatId ? String(chatId) : ((typeof ConfigService !== "undefined" && ConfigService.getPrimary) ? ConfigService.getPrimary("TELEGRAM_CHAT_ID") : ((typeof ConfigService !== "undefined" && ConfigService.get) ? String(ConfigService.get("TELEGRAM_CHAT_ID") || "").split(",")[0].trim() : ""));
  var sessao = "";
  if (id && typeof criarSessaoCockpit_ === "function") {
    if (chatId) {
      sessao = criarSessaoCockpit_(id);
    } else {
      try {
        sessao = criarSessaoCockpit_(id);
      } catch (_) {}
    }
  }
  var v = (typeof ConfigService !== "undefined" && ConfigService.get && ConfigService.get("COCKPIT_VERSION")) ? ConfigService.get("COCKPIT_VERSION") : "2.5";
  return sessao ? base + "?session=" + sessao + "&v=" + v : base + "?v=" + v;
}

/**
 * Retorna a estrutura do teclado fixo principal (ReplyKeyboardMarkup)
 * Projetado para navegação rápida de 1 toque no celular em ambiente hospitalar e rotina.
 * Configurado com is_persistent: false para ergonomia mobile perfeita.
 */
function obterTecladoFixoPrincipal(chatId) {
  var urlApp = obterUrlCockpit(chatId);
  return {
    keyboard: [
      [
        { text: '🚨 Sala Vermelha' },
        { text: '🛏️ Enfermaria' }
      ],
      [
        { text: '🩺 Ambulatório' },
        { text: '💊 Consultas de Bolso' }
      ],
      [
        { text: '📱 Cockpit Mini App', web_app: { url: urlApp } },
        { text: '⚙️ Central / Menu' }
      ]
    ],
    resize_keyboard: true,
    is_persistent: false
  };
}

/**
 * Retorna botões inline de navegação padronizados ("Voltar ao Menu" e "Início")
 * para evitar que o médico fique preso em telas secundárias.
 */
function obterBotoesNavegacaoPadrao() {
  return {
    inline_keyboard: [
      [
        { text: "🔙 Voltar ao Menu", callback_data: "ux:menu" },
        { text: "🏠 Início", callback_data: "ux:hub:inicio" }
      ]
    ]
  };
}

/**
 * Teclado Fixo Universal Padronizado:
 * O rodapé permanece estável sem roubar o teclado QWERTY do smartphone.
 * Todas as ações de casos clínicos específicos residem nos botões inline do próprio balão.
 */
function obterTecladoModoSoap(chatId) {
  return obterTecladoFixoPrincipal(chatId);
}

function obterTecladoModoEnfermaria(chatId) {
  return obterTecladoFixoPrincipal(chatId);
}

function obterTecladoModoSalaVermelha(chatId) {
  return obterTecladoFixoPrincipal(chatId);
}

function obterTecladoContextual(modo, chatId) {
  return obterTecladoFixoPrincipal(chatId);
}

function enviarMensagemComTecladoContextual(chatId, texto, modo) {
  return enviarMensagemSegmentada(chatId, texto, obterTecladoFixoPrincipal(chatId));
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
    { command: "ajuda", description: "Manual completo de instruções" }
  ];
  executarPostTelegram(url, { commands: comandos });
  return executarPostTelegram(url, { commands: comandos, scope: { type: "all_private_chats" } });
}

function enviarMensagemComTecladoFixo(chatId, texto) {
  return enviarMensagemSegmentada(chatId, texto, obterTecladoFixoPrincipal(chatId));
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

/**
 * Garante que o áudio retornado possua cabeçalho RIFF WAV padrão de 44 bytes (24kHz, 16-bit, Mono)
 * quando gerado por modelos TTS que retornam PCM Linear (audio/L16).
 */
function adicionarCabecalhoWavSeNecessario(bytes, mime) {
  if (!bytes || bytes.length === 0) return bytes;
  var b0 = (typeof bytes[0] === "number") ? bytes[0] : (bytes[0] || 0);
  var b1 = (typeof bytes[1] === "number") ? bytes[1] : (bytes[1] || 0);
  var b2 = (typeof bytes[2] === "number") ? bytes[2] : (bytes[2] || 0);
  var b3 = (typeof bytes[3] === "number") ? bytes[3] : (bytes[3] || 0);
  if (b0 === 0x52 && b1 === 0x49 && b2 === 0x46 && b3 === 0x46) {
    return bytes;
  }
  var taxaAmostragem = 24000;
  if (mime && mime.indexOf("rate=") !== -1) {
    var matchRate = mime.match(/rate=(\d+)/);
    if (matchRate) taxaAmostragem = parseInt(matchRate[1], 10) || 24000;
  }
  var canais = 1;
  var bitsPorAmostra = 16;
  var byteRate = (taxaAmostragem * canais * bitsPorAmostra) / 8;
  var blockAlign = (canais * bitsPorAmostra) / 8;
  var tamanhoDados = bytes.length;
  var tamanhoTotal = 36 + tamanhoDados;
  var cabecalho = [
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    tamanhoTotal & 0xff, (tamanhoTotal >> 8) & 0xff, (tamanhoTotal >> 16) & 0xff, (tamanhoTotal >> 24) & 0xff,
    0x57, 0x41, 0x56, 0x45, // "WAVE"
    0x66, 0x6d, 0x74, 0x20, // "fmt "
    16, 0, 0, 0,            // Subchunk1Size
    1, 0,                   // AudioFormat (1 = PCM)
    canais, 0,              // NumChannels (1 = Mono)
    taxaAmostragem & 0xff, (taxaAmostragem >> 8) & 0xff, (taxaAmostragem >> 16) & 0xff, (taxaAmostragem >> 24) & 0xff,
    byteRate & 0xff, (byteRate >> 8) & 0xff, (byteRate >> 16) & 0xff, (byteRate >> 24) & 0xff,
    blockAlign, 0,          // BlockAlign
    bitsPorAmostra, 0,      // BitsPerSample
    0x64, 0x61, 0x74, 0x61, // "data"
    tamanhoDados & 0xff, (tamanhoDados >> 8) & 0xff, (tamanhoDados >> 16) & 0xff, (tamanhoDados >> 24) & 0xff
  ];
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(bytes)) {
    return Buffer.concat([Buffer.from(cabecalho), bytes]);
  }
  if (typeof Uint8Array !== "undefined" && bytes instanceof Uint8Array) {
    var resUint8 = new Uint8Array(44 + bytes.length);
    resUint8.set(cabecalho, 0);
    resUint8.set(bytes, 44);
    return resUint8;
  }
  if (Array.isArray(bytes)) {
    var cabSigned = cabecalho.map(function(b) { return b > 127 ? b - 256 : b; });
    return cabSigned.concat(bytes);
  }
  return bytes;
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
  chaves = (chaves || []).map(function (c) { return String(c).trim(); }).filter(function (c) { return c; });
  if (chaves.length === 0) {
    var kSingular = ConfigService.get("GEMINI_API_KEY");
    if (kSingular) chaves = [String(kSingular).trim()];
  }
  if (chaves.length === 0) return null;

  var voz = ConfigService.get("IA_VOZ_PRECEPTOR", "Fenrir");
  var inicio = 0;
  try {
    inicio = parseInt(CacheService.getScriptCache().get("ia_gem_tts_idx") || "0", 10) || 0;
  } catch (e0) { inicio = 0; }

  var modelosTts = ConfigService.getArray("IA_MODELOS_TTS_GEMINI");
  if (!modelosTts || modelosTts.length === 0) {
    modelosTts = ["gemini-2.5-flash-preview-tts", "gemini-2.0-flash", "gemini-2.0-flash-exp", "gemini-3.8-flash-tts"];
  }

  var payload = {
    "contents": [{ "parts": [{ "text": limpo }] }],
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "speechConfig": {
        "voiceConfig": {
          "prebuiltVoiceConfig": {
            "voiceName": voz
          }
        }
      }
    }
  };

  var ttsInicio = new Date().getTime();
  var MAX_TENTATIVAS_CHAVE_POR_MODELO = Math.min(chaves.length, 3);

  for (var m = 0; m < modelosTts.length; m++) {
    // Se já gastamos mais de 15 segundos tentando áudio neural, cai para o fallback rápido
    if (new Date().getTime() - ttsInicio >= 15000) {
      Logger.log("Tempo limite para TTS neural esgotado; acionando contingência de voz.");
      break;
    }

    var modeloAtual = modelosTts[m];
    var url = "https://generativelanguage.googleapis.com/v1beta/models/" + modeloAtual + ":generateContent";

    for (var k = 0; k < MAX_TENTATIVAS_CHAVE_POR_MODELO; k++) {
      if (new Date().getTime() - ttsInicio >= 15000) break;

      var idx = (inicio + k) % chaves.length;
      var chave = chaves[idx];

      try {
        var res = UrlFetchApp.fetch(url, {
          "method": "post",
          "contentType": "application/json",
          "headers": { "x-goog-api-key": chave },
          "payload": JSON.stringify(payload),
          "muteHttpExceptions": true,
          "timeoutMs": 10000
        });
        var code = res.getResponseCode();
        if (code === 200) {
          try {
            CacheService.getScriptCache().put("ia_gem_tts_idx", String((idx + 1) % chaves.length), 3600);
          } catch (eIdx) {}
          var json = JSON.parse(res.getContentText());
          if (json.candidates && json.candidates[0].content && json.candidates[0].content.parts) {
            var part = json.candidates[0].content.parts[0];
            if (part.inlineData && part.inlineData.data) {
              var bytes = Utilities.base64Decode(part.inlineData.data);
              var mime = part.inlineData.mimeType || "audio/wav";
              var ext = (mime.indexOf("mp3") !== -1) ? "mp3" : "wav";
              bytes = adicionarCabecalhoWavSeNecessario(bytes, mime);
              var blob = Utilities.newBlob(bytes, mime.indexOf("mp3") !== -1 ? "audio/mpeg" : "audio/wav", "preceptor_voz." + ext);
              return blob;
            }
          }
        } else if (code === 429 || code === 504 || code >= 500) {
          continue;
        }
      } catch (e) {
        continue;
      }
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
function enviarAudioVozTelegram(chatId, blobAudio, legenda, replyMarkup) {
  var token = ConfigService.get("TELEGRAM_BOT_TOKEN");
  if (!token || !blobAudio) return false;

  var url = "https://api.telegram.org/bot" + token + "/sendVoice";
  var payload = {
    "chat_id": String(chatId),
    "voice": blobAudio,
    "caption": legenda ? limparMarkdownTelegram(legenda) : "",
    "parse_mode": "Markdown"
  };
  if (replyMarkup) {
    payload.reply_markup = typeof replyMarkup === "string" ? replyMarkup : JSON.stringify(replyMarkup);
  }

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

/**
 * ==============================================================================
 * VALIDADOR DE LIMITES FISIOLÓGICOS & SANITIZAÇÃO DE ENTRADA CLÍNICA
 * ==============================================================================
 * Protege contra erros de digitação (zeros extras, vírgulas deslocadas, valores
 * biologicamente implausíveis ou incompatíveis com a vida).
 * ==============================================================================
 */

var ValidadorFisiologico = (function() {
  var FAIXAS = {
    peso: { min: 0.4, max: 350.0, unidade: "kg", nome: "Peso corporal" },
    idade: { min: 0, max: 125, unidade: "anos", nome: "Idade" },
    pas: { min: 30, max: 280, unidade: "mmHg", nome: "Pressão Arterial Sistólica (PAS)" },
    pad: { min: 15, max: 160, unidade: "mmHg", nome: "Pressão Arterial Diastólica (PAD)" },
    pam: { min: 20, max: 200, unidade: "mmHg", nome: "Pressão Arterial Média (PAM)" },
    fc: { min: 20, max: 300, unidade: "bpm", nome: "Frequência Cardíaca (FC)" },
    fr: { min: 4, max: 80, unidade: "irpm", nome: "Frequência Respiratória (FR)" },
    spo2: { min: 30, max: 100, unidade: "%", nome: "Saturação de O₂ (SpO₂)" },
    temperatura: { min: 25.0, max: 44.0, unidade: "°C", nome: "Temperatura Corporal" },
    glicemia: { min: 10, max: 1500, unidade: "mg/dL", nome: "Glicemia capilar/sérica" },
    creatinina: { min: 0.1, max: 30.0, unidade: "mg/dL", nome: "Creatinina sérica" },
    altura: { min: 30, max: 250, unidade: "cm", nome: "Altura corporal" },
    ureia: { min: 5, max: 500, unidade: "mg/dL", nome: "Ureia sérica" },
    potassio: { min: 1.0, max: 10.0, unidade: "mEq/L", nome: "Potássio sérico (K⁺)" },
    k: { min: 1.0, max: 10.0, unidade: "mEq/L", nome: "Potássio sérico (K⁺)" },
    sodio: { min: 90, max: 180, unidade: "mEq/L", nome: "Sódio sérico (Na⁺)" },
    na: { min: 90, max: 180, unidade: "mEq/L", nome: "Sódio sérico (Na⁺)" },
    cl: { min: 60, max: 160, unidade: "mEq/L", nome: "Cloro sérico (Cl⁻)" },
    cloro: { min: 60, max: 160, unidade: "mEq/L", nome: "Cloro sérico (Cl⁻)" },
    alb: { min: 0.5, max: 7.0, unidade: "g/dL", nome: "Albumina sérica" },
    albumina: { min: 0.5, max: 7.0, unidade: "g/dL", nome: "Albumina sérica" },
    ph: { min: 6.70, max: 7.80, unidade: "", nome: "pH sanguíneo" },
    pco2: { min: 10, max: 150, unidade: "mmHg", nome: "pCO₂ arterial" },
    paco2: { min: 10, max: 150, unidade: "mmHg", nome: "pCO₂ arterial" },
    po2: { min: 15, max: 600, unidade: "mmHg", nome: "pO₂ arterial" },
    pao2: { min: 15, max: 600, unidade: "mmHg", nome: "PaO₂ arterial" },
    fio2: { min: 0.21, max: 100, unidade: "%", nome: "FiO₂ (0.21 a 1.0 ou %)" },
    hco3: { min: 2, max: 60, unidade: "mEq/L", nome: "Bicarbonato (HCO₃⁻)" },
    clcr: { min: 0, max: 250, unidade: "mL/min", nome: "Clearance de Creatinina" },
    pfe: { min: 0, max: 1000, unidade: "L/min", nome: "Pico de Fluxo Expiratório (PFE)" },
    lactato: { min: 0.2, max: 30.0, unidade: "mmol/L", nome: "Lactato arterial" }
  };

  function normalizarNumero(val) {
    if (val === undefined || val === null) return NaN;
    if (typeof val === "number") return isFinite(val) ? val : NaN;
    var s = String(val).trim().replace(",", ".");
    return Number(s);
  }

  return {
    obterFaixas: function() { return FAIXAS; },

    validarParametro: function(parametro, valor) {
      var p = String(parametro || "").toLowerCase().trim();
      var config = FAIXAS[p];
      if (!config) {
        return { valido: true, valor: normalizarNumero(valor), alerta: null };
      }

      var num = normalizarNumero(valor);
      if (isNaN(num)) {
        return {
          valido: false,
          valor: null,
          alerta: "Valor inválido ou não numérico para " + config.nome + "."
        };
      }

      if (p === "altura" && num > 0 && num < 3.0) {
        num = Math.round(num * 100 * 10) / 10;
      }

      if (num < config.min || num > config.max) {
        return {
          valido: false,
          valor: num,
          alerta: "⚠️ " + config.nome + " de " + num + (config.unidade ? " " + config.unidade : "") +
            " está fora da faixa biológica esperada (" + config.min + " a " + config.max + (config.unidade ? " " + config.unidade : "") +
            "). Confirme se houve erro de digitação antes de utilizar nos cálculos."
        };
      }

      return { valido: true, valor: num, alerta: null };
    },

    sanitizarEntradaCalculo: function(tipo, entrada) {
      if (!entrada || typeof entrada !== "object") {
        return { valido: false, erro: "Parâmetros não informados ou formato inválido." };
      }

      var erros = [];

      // Checagem de Peso Universal
      if (entrada.peso !== undefined && entrada.peso !== null && entrada.peso !== "") {
        var vPeso = this.validarParametro("peso", entrada.peso);
        if (!vPeso.valido) erros.push(vPeso.alerta);
      }

      // Checagem por tipo de cálculo
      if (tipo === "crcl") {
        if (entrada.creatinina !== undefined && entrada.creatinina !== null && entrada.creatinina !== "") {
          var vCr = this.validarParametro("creatinina", entrada.creatinina);
          if (!vCr.valido) erros.push(vCr.alerta);
        }
        if (entrada.idade !== undefined && entrada.idade !== null && entrada.idade !== "") {
          var vIdade = this.validarParametro("idade", entrada.idade);
          if (!vIdade.valido) erros.push(vIdade.alerta);
        }
        var rawAlt = entrada.altura !== undefined ? entrada.altura : entrada.alturaCm;
        if (rawAlt !== undefined && rawAlt !== null && rawAlt !== "") {
          var vAlt = this.validarParametro("altura", rawAlt);
          if (!vAlt.valido) erros.push(vAlt.alerta);
        }
      }

      if (tipo === "dhe" || tipo === "eletrolitos" || tipo === "hidroeletrolitico") {
        if (entrada.idade !== undefined && entrada.idade !== null && entrada.idade !== "") {
          var vIdadeDhe = this.validarParametro("idade", entrada.idade);
          if (!vIdadeDhe.valido) erros.push(vIdadeDhe.alerta);
        }
        var kVal = entrada.kAtual !== undefined ? entrada.kAtual : (entrada.potassio !== undefined ? entrada.potassio : entrada.k);
        if (kVal !== undefined && kVal !== null && kVal !== "") {
          var vK = this.validarParametro("potassio", kVal);
          if (!vK.valido) erros.push(vK.alerta);
        }
        var naVal = entrada.naAtual !== undefined ? entrada.naAtual : (entrada.sodio !== undefined ? entrada.sodio : entrada.na);
        if (naVal !== undefined && naVal !== null && naVal !== "") {
          var vNaDhe = this.validarParametro("sodio", naVal);
          if (!vNaDhe.valido) erros.push(vNaDhe.alerta);
        }
      }

      if (tipo === "ajuste_atb" || tipo === "atb") {
        if (entrada.clcr !== undefined && entrada.clcr !== null && entrada.clcr !== "") {
          var vClcr = this.validarParametro("clcr", entrada.clcr);
          if (!vClcr.valido) erros.push(vClcr.alerta);
        }
      }

      if (tipo === "gaso") {
        if (entrada.ph !== undefined && entrada.ph !== null && entrada.ph !== "") {
          var vPh = this.validarParametro("ph", entrada.ph);
          if (!vPh.valido) erros.push(vPh.alerta);
        }
        if (entrada.pco2 !== undefined && entrada.pco2 !== null && entrada.pco2 !== "") {
          var vPco2 = this.validarParametro("pco2", entrada.pco2);
          if (!vPco2.valido) erros.push(vPco2.alerta);
        }
        if (entrada.hco3 !== undefined && entrada.hco3 !== null && entrada.hco3 !== "") {
          var vHco3 = this.validarParametro("hco3", entrada.hco3);
          if (!vHco3.valido) erros.push(vHco3.alerta);
        }
        if (entrada.na !== undefined && entrada.na !== null && entrada.na !== "") {
          var vNa = this.validarParametro("sodio", entrada.na);
          if (!vNa.valido) erros.push(vNa.alerta);
        }
        if (entrada.cl !== undefined && entrada.cl !== null && entrada.cl !== "") {
          var vCl = this.validarParametro("cl", entrada.cl);
          if (!vCl.valido) erros.push(vCl.alerta);
        }
        if (entrada.alb !== undefined && entrada.alb !== null && entrada.alb !== "") {
          var vAlb = this.validarParametro("alb", entrada.alb);
          if (!vAlb.valido) erros.push(vAlb.alerta);
        }
        if (entrada.pao2 !== undefined && entrada.pao2 !== null && entrada.pao2 !== "") {
          var vPao2 = this.validarParametro("pao2", entrada.pao2);
          if (!vPao2.valido) erros.push(vPao2.alerta);
        }
      }

      if (tipo === "asma" || tipo === "crise_asmatica" || tipo === "broncoespasmo") {
        if (entrada.peso !== undefined && entrada.peso !== null && entrada.peso !== "") {
          var vPesoAsma = this.validarParametro("peso", entrada.peso);
          if (!vPesoAsma.valido) erros.push(vPesoAsma.alerta);
        }
        if (entrada.idade !== undefined && entrada.idade !== null && entrada.idade !== "") {
          var vIdadeAsma = this.validarParametro("idade", entrada.idade);
          if (!vIdadeAsma.valido) erros.push(vIdadeAsma.alerta);
        }
        if (entrada.spo2 !== undefined && entrada.spo2 !== null && entrada.spo2 !== "") {
          var vSpo2 = this.validarParametro("spo2", entrada.spo2);
          if (!vSpo2.valido) erros.push(vSpo2.alerta);
        }
        if (entrada.fr !== undefined && entrada.fr !== null && entrada.fr !== "") {
          var vFr = this.validarParametro("fr", entrada.fr);
          if (!vFr.valido) erros.push(vFr.alerta);
        }
        if (entrada.fc !== undefined && entrada.fc !== null && entrada.fc !== "") {
          var vFc = this.validarParametro("fc", entrada.fc);
          if (!vFc.valido) erros.push(vFc.alerta);
        }
        if (entrada.pfe !== undefined && entrada.pfe !== null && entrada.pfe !== "") {
          var vPfe = this.validarParametro("pfe", entrada.pfe);
          if (!vPfe.valido) erros.push(vPfe.alerta);
        }
        var pco2Asma = entrada.paco2 !== undefined ? entrada.paco2 : entrada.pco2;
        if (pco2Asma !== undefined && pco2Asma !== null && pco2Asma !== "") {
          var vPco2Asma = this.validarParametro("pco2", pco2Asma);
          if (!vPco2Asma.valido) erros.push(vPco2Asma.alerta);
        }
      }

      return {
        valido: erros.length === 0,
        erros: erros,
        erro: erros.join("\n")
      };
    },

    escanearAnomaliasEmTexto: function(texto) {
      if (!texto) return [];
      var str = String(texto).toLowerCase();
      var anomalias = [];

      // 1. SpO2 > 100% ou < 30%
      var mSpo2 = str.match(/\b(?:spo2|sp[oO]₂|sat|saturacao)\s*[:=]?\s*(\d+)\s*%/i);
      if (mSpo2) {
        var vSat = parseInt(mSpo2[1], 10);
        if (vSat > 100 || vSat < 30) {
          anomalias.push("SpO₂ de " + vSat + "% fora da faixa fisiológica (30 a 100%).");
        }
      }

      // 2. PA com PAS > 280 ou < 30, ou PAD > 160
      var mPa = str.match(/\b(?:pa\s*[:=]?\s*)?(\d{2,3})\s*[x/]\s*(\d{2,3})\b/i);
      if (mPa) {
        var pas = parseInt(mPa[1], 10);
        var pad = parseInt(mPa[2], 10);
        if (pas > 280 || pas < 30 || pad > 160 || pad < 15 || pas <= pad) {
          anomalias.push("Pressão Arterial de " + pas + "/" + pad + " mmHg biologicamente implausível.");
        }
      }

      // 3. FC > 300 ou < 20
      var mFc = str.match(/\b(?:fc|frequencia cardiaca)\s*[:=]?\s*(\d+)\s*(?:bpm)?\b/i);
      if (mFc) {
        var fc = parseInt(mFc[1], 10);
        if (fc > 300 || fc < 20) {
          anomalias.push("Frequência Cardíaca de " + fc + " bpm fora dos limites vitais plausíveis (20 a 300 bpm).");
        }
      }

      // 4. Temperatura > 44 ou < 25
      var mTax = str.match(/\b(?:tax|temp|temperatura)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*°?c\b/i);
      if (mTax) {
        var temp = parseFloat(mTax[1].replace(",", "."));
        if (temp > 44 || temp < 25) {
          anomalias.push("Temperatura de " + temp + " °C fora da faixa biológica humana (25 a 44 °C).");
        }
      }

      return anomalias;
    }
  };
})();

/**
 * ==============================================================================
 * PADRONIZAÇÃO VISUAL ESCANEÁVEL BEIRA-LEITO (RESPOSTA EM 3 SEGUNDOS)
 * ==============================================================================
 * 🔴 Ação Imediata / Conduta / Dose de Ataque (Sempre no topo em negrito)
 * 🟡 Diluição, Velocidade de Infusão e Manutenção (mL/h ou gotas/min)
 * ⚠️ Alertas de Segurança & Bloqueios (Tetos máximos, contraindicações)
 * ℹ️ Justificativa Clínica e Referências (Seção compacta ao final)
 * ==============================================================================
 */

function formatarHierarquiaEscaneavel(config) {
  if (!config || typeof config !== "object") return "";
  var blocos = [];

  if (config.titulo) {
    blocos.push(String(config.titulo).trim());
  }

  function formatarItens(itens) {
    if (!itens) return "";
    if (Array.isArray(itens)) {
      return itens.filter(Boolean).map(function(item) {
        var str = String(item).trim();
        return str.startsWith("• ") || str.startsWith("- ") ? str : "• " + str;
      }).join("\n");
    }
    return String(itens).trim();
  }

  // 1. 🔴 Ação Imediata / Conduta / Dose de Ataque
  if (config.acaoImediata) {
    var txtAcao = formatarItens(config.acaoImediata);
    if (txtAcao) {
      blocos.push("🔴 *AÇÃO IMEDIATA / CONDUTA / DOSE DE ATAQUE:*\n" + txtAcao);
    }
  }

  // 2. 🟡 Diluição, Velocidade de Infusão e Manutenção
  if (config.manutencaoDiluicao) {
    var txtManut = formatarItens(config.manutencaoDiluicao);
    if (txtManut) {
      blocos.push("🟡 *DILUIÇÃO, VELOCIDADE DE INFUSÃO E MANUTENÇÃO:*\n" + txtManut);
    }
  }

  // 3. ⚠️ Alertas de Segurança & Bloqueios
  if (config.alertasSeguranca) {
    var txtAlertas = formatarItens(config.alertasSeguranca);
    if (txtAlertas) {
      blocos.push("⚠️ *ALERTAS DE SEGURANÇA E BLOQUEIOS:*\n" + txtAlertas);
    }
  }

  // 4. ℹ️ Justificativa Clínica e Referências
  if (config.justificativa) {
    var txtJust = formatarItens(config.justificativa);
    if (txtJust) {
      blocos.push("ℹ️ *JUSTIFICATIVA CLÍNICA E REFERÊNCIAS:*\n" + txtJust);
    }
  }

  if (config.rodape) {
    blocos.push(String(config.rodape).trim());
  }

  return blocos.join("\n\n");
}

function padronizarHierarquiaVisual(texto) {
  if (!texto) return "";
  return String(texto);
}
