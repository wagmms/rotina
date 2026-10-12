/**
 * ==============================================================================
 * MÓDULO 05: INTEGRAÇÃO NOTION (Habit Log & Tasks DB com Blocos Ricos)
 * ==============================================================================
 */

function normalizarNotionId(idOuUrl) {
  if (!idOuUrl) return "";
  var str = String(idOuUrl).trim();
  var match = str.match(/([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
  if (match) return match[1];
  return str.split("?")[0].replace(/^.*[\/]/, "").trim();
}

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
        var textoErro = "";
        try { textoErro = res.getContentText(); } catch (_) {}
        Logger.log("Notion erro HTTP " + code + (textoErro ? ": " + textoErro.slice(0, 300) : ""));
        return null;
      }
    } catch (e) {
      Logger.log("Falha de comunicação com o Notion: " + (e ? e.message : "resultado incerto"));
      return null;
    }
  }
  return null;
}

function obterOuCriarPaginaHabitLog(dataISO) {
  var dbId = normalizarNotionId(ConfigService.get("NOTION_HABIT_LOG_DB_ID"));
  if (!dbId) {
    Logger.log("Aviso: NOTION_HABIT_LOG_DB_ID não configurado.");
    return null;
  }

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
  var destino = chatIdDestino || ((typeof ConfigService.getPrimary === "function") ? ConfigService.getPrimary("TELEGRAM_CHAT_ID") : String(ConfigService.get("TELEGRAM_CHAT_ID") || "").split(",")[0].trim());
  if (typeof ehUsuarioTitular === "function" && !ehUsuarioTitular(destino)) {
    return false;
  }
  var token = ConfigService.get("NOTION_TOKEN");
  var rawDbId = ConfigService.get("NOTION_HABIT_LOG_DB_ID");
  var dbId = normalizarNotionId(rawDbId);
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");

  if (!token || !dbId) {
    var detalheFalta = !token && !dbId ? "NOTION_TOKEN e NOTION_HABIT_LOG_DB_ID" : (!token ? "NOTION_TOKEN" : "NOTION_HABIT_LOG_DB_ID");
    Logger.log("Aviso: Falha ao consultar Habit Log - " + detalheFalta + " ausente.");
    return enviarMensagemParaChat(destino, "⚠️ O Habit Log não pôde ser consultado: `" + detalheFalta + "` não está configurado no servidor (Render). Configure a variável de ambiente para habilitar.");
  }

  var dataISO = Utilities.formatDate(new Date(new Date().getTime() - 7 * 86400000), tz, "yyyy-MM-dd");
  var payload = {
    "filter": { "property": "Date", "date": { "on_or_after": dataISO } },
    "sorts": [{ "property": "Date", "direction": "ascending" }]
  };

  var res = chamarNotionAPI("https://api.notion.com/v1/databases/" + dbId + "/query", "POST", payload);
  if (!res || !res.results) {
    return enviarMensagemParaChat(destino, "⚠️ Erro ao consultar o Notion Habit Log. Verifique se a integração possui acesso à base e se o ID está correto.");
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

  var kbSemanal = {
    inline_keyboard: [
      [{ text: "🔙 Central de Rotina", callback_data: "ux:hub:rotina" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
    ]
  };
  return enviarMensagemComTecladoParaChat(destino, msg, kbSemanal);
}

/**
 * Criação Avançada no Notion Tasks:
 * Salva as propriedades principais e injeta o texto completo no CORPO da página
 * em blocos de texto/callout, eliminando limitações de tamanho de rich_text.
 */
function criarTarefaNotion(titulo, area, prioridade, notas) {
  var dbId = normalizarNotionId(ConfigService.get("NOTION_TASKS_DB_ID"));
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

function obterDuvidasEstudoLocal() {
  try {
    var props = PropertiesService.getScriptProperties();
    var raw = props.getProperty("duvidas_medquest_lista");
    if (raw) {
      var arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch (_) {}
  return [];
}

function salvarDuvidaEstudoLocal(duvidaTexto) {
  var texto = String(duvidaTexto || "").trim();
  if (!texto) return null;
  var tz = (typeof ConfigService !== "undefined" && ConfigService.get) ? ConfigService.get("TIMEZONE", "America/Sao_Paulo") : "America/Sao_Paulo";
  var agora = new Date();
  var dataISO = Utilities.formatDate(agora, tz, "yyyy-MM-dd");
  var hora = Utilities.formatDate(agora, tz, "HH:mm");
  var id = "duv_" + agora.getTime().toString(36) + "_" + Math.random().toString(36).substring(2, 6);

  var item = {
    id: id,
    dataISO: dataISO,
    hora: hora,
    texto: texto,
    status: "pendente"
  };

  try {
    var props = PropertiesService.getScriptProperties();
    var lista = obterDuvidasEstudoLocal();
    lista.unshift(item);
    if (lista.length > 50) lista = lista.slice(0, 50);
    props.setProperty("duvidas_medquest_lista", JSON.stringify(lista));
  } catch (e) {
    Logger.log("Erro ao salvar duvida local: " + e.message);
  }

  return item;
}

function marcarDuvidaEstudoResolvida(duvidaId) {
  try {
    var props = PropertiesService.getScriptProperties();
    var lista = obterDuvidasEstudoLocal();
    var modificado = false;
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].id === duvidaId) {
        lista[i].status = "resolvida";
        modificado = true;
        break;
      }
    }
    if (modificado) {
      props.setProperty("duvidas_medquest_lista", JSON.stringify(lista));
      return true;
    }
  } catch (_) {}
  return false;
}

function salvarDuvidaEstudoNotion(duvida) {
  var itemLocal = salvarDuvidaEstudoLocal(duvida);
  var titulo = "🧠 Dúvida: " + duvida;
  try {
    criarTarefaNotion(titulo, "Studies", "2 · Important", "Registrado via Telegram para revisão noturna no MedQuest:\n" + duvida);
  } catch (_) {}
  return itemLocal !== null;
}

function listarDuvidasMedQuest(chatIdDestino, messageId) {
  var destino = chatIdDestino || ((typeof ConfigService.getPrimary === "function") ? ConfigService.getPrimary("TELEGRAM_CHAT_ID") : String(ConfigService.get("TELEGRAM_CHAT_ID") || "").split(",")[0].trim());
  var lista = obterDuvidasEstudoLocal().filter(function(d) { return d.status === "pendente"; });

  var msg = "🧠 *MEDQUEST / DÚVIDAS MÉDICAS*\n\n";
  var botoes = [];

  if (lista.length === 0) {
    msg += "✨ Nenhuma dúvida pendente no momento!\n\n" +
      "💡 *Para registrar uma nova dúvida beira-leito:*\n" +
      "Envie: `/duvida <sua dúvida clínica>`\n" +
      "Ex: `/duvida Critérios de Light para derrame pleural exsudato vs transudato`";
  } else {
    msg += "Pendências salvas para seu bloco de estudo ativo:\n\n";
    for (var i = 0; i < lista.length; i++) {
      var d = lista[i];
      msg += (i + 1) + ". *" + d.texto + "*\n" +
             "   📅 `" + d.dataISO + " às " + d.hora + "`\n\n";
      if (i < 5) {
        botoes.push([{ text: "✅ Resolver #" + (i + 1), callback_data: "duvida:check:" + d.id }]);
      }
    }
  }

  botoes.push([
    { text: "🔙 Central de Rotina", callback_data: "ux:hub:rotina" },
    { text: "🏠 Início", callback_data: "ux:hub:inicio" }
  ]);

  var teclado = { inline_keyboard: botoes };
  if (messageId && typeof enviarTelaBot === "function") {
    return enviarTelaBot(destino, msg, teclado, messageId);
  }
  return enviarMensagemComTecladoParaChat(destino, msg, teclado);
}

function listarTarefasHojeNotion(chatIdDestino, messageId) {
  var destino = chatIdDestino || ((typeof ConfigService.getPrimary === "function") ? ConfigService.getPrimary("TELEGRAM_CHAT_ID") : String(ConfigService.get("TELEGRAM_CHAT_ID") || "").split(",")[0].trim());
  var dbId = normalizarNotionId(ConfigService.get("NOTION_TASKS_DB_ID"));
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");

  var kbTarefas = {
    inline_keyboard: [
      [{ text: "🔄 Atualizar Tarefas", callback_data: "ux:rotina:tasks" }],
      [{ text: "🔙 Central de Rotina", callback_data: "ux:hub:rotina" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
    ]
  };

  if (!dbId) {
    var msgSemDb = "⚠️ *Notion Tasks DB não configurado.*\n\nConfigure a variável `NOTION_TASKS_DB_ID` no ambiente para sincronizar suas tarefas.";
    if (messageId && typeof enviarTelaBot === "function") return enviarTelaBot(destino, msgSemDb, kbTarefas, messageId);
    return enviarMensagemComTecladoParaChat(destino, msgSemDb, kbTarefas);
  }

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

  var res = (typeof chamarNotionAPI === "function") ? chamarNotionAPI("https://api.notion.com/v1/databases/" + dbId + "/query", "POST", payload) : null;
  if (!res || !res.results) {
    var msgErro = "⚠️ Erro ao consultar o Notion Tasks. Tente novamente em instantes.";
    if (messageId && typeof enviarTelaBot === "function") return enviarTelaBot(destino, msgErro, kbTarefas, messageId);
    return enviarMensagemParaChat(destino, msgErro);
  }
  if (res.results.length === 0) {
    var msgVazio = "📋 *Tarefas do Notion:* Nenhuma pendência para hoje ou no Inbox! Tudo zerado. 🎉\n\n💡 *Para adicionar nova tarefa:* Digite `/task <descrição>` ou envie por voz.";
    if (messageId && typeof enviarTelaBot === "function") return enviarTelaBot(destino, msgVazio, kbTarefas, messageId);
    return enviarMensagemComTecladoParaChat(destino, msgVazio, kbTarefas);
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
  if (messageId && typeof enviarTelaBot === "function") {
    return enviarTelaBot(destino, msg, kbTarefas, messageId);
  }
  return enviarMensagemComTecladoParaChat(destino, msg, kbTarefas);
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


