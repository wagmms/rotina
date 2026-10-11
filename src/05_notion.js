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
  var destino = chatIdDestino || ((typeof ConfigService.getPrimary === "function") ? ConfigService.getPrimary("TELEGRAM_CHAT_ID") : String(ConfigService.get("TELEGRAM_CHAT_ID") || "").split(",")[0].trim());
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
  var destino = chatIdDestino || ((typeof ConfigService.getPrimary === "function") ? ConfigService.getPrimary("TELEGRAM_CHAT_ID") : String(ConfigService.get("TELEGRAM_CHAT_ID") || "").split(",")[0].trim());
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


