/**
 * ==============================================================================
 * MÓDULO 08: MAIN, WEBHOOK ROUTER (doGet / doPost) E INSTALAÇÃO
 * ==============================================================================
 * Executa 100% na nuvem do Google Apps Script (24/7), gratuito e resiliente.
 * ==============================================================================
 */

function doGet(e) {
  var info={service:"Ultra Rotina",version:"2026.10.05-cockpit1"};
  if(e && e.parameter && e.parameter.secret && e.parameter.secret===ConfigService.get("WEBHOOK_SECRET")) {
    if(e.parameter.action==="clean") {
      // Mesma política do worker: nunca descarta pedidos pendentes ou falhas sem arquivo.
      manterPersistenciaBot();
    }
    if(e.parameter.action==="poll_pc_tasks") {
      var tasks = (typeof obterTarefasPcPendentes === "function") ? obterTarefasPcPendentes() : [];
      return ContentService.createTextOutput(JSON.stringify({ok: true, tasks: tasks})).setMimeType(ContentService.MimeType.JSON);
    }
    if(e.parameter.action==="complete_pc_task") {
      var tid = e.parameter.task_id;
      var st = e.parameter.status || "done";
      var res = e.parameter.resultado || "";
      if (typeof concluirTarefaPc === "function") {
        concluirTarefaPc(tid, st, res);
      }
      return ContentService.createTextOutput(JSON.stringify({ok: true, task_id: tid, status: st})).setMimeType(ContentService.MimeType.JSON);
    }
    info.configured=["TELEGRAM_BOT_TOKEN","TELEGRAM_CHAT_ID","WEB_APP_URL","WEBHOOK_SECRET","NOTION_TOKEN","NOTION_TASKS_DB_ID","NOTION_HABIT_LOG_DB_ID","SPREADSHEET_ID_REMUME","SPREADSHEET_ID_INTERACOES"].filter(function(k){return !!ConfigService.get(k);});
    info.gemini_keys_count=ConfigService.getArray("GEMINI_API_KEYS").length;
    info.worker=ScriptApp.getProjectTriggers().some(function(t){return t.getHandlerFunction()==="processarFilaTelegram";});
    var filaAll=PersistenciaBot.snapshot();
    info.queue=PersistenciaBot.chaves("inbox_",filaAll).length;
    info.outbox=PersistenciaBot.listar("outbox_",filaAll).map(function(r){return {id:r.key,status:r.valor.status||"unknown"};});
    return ContentService.createTextOutput(JSON.stringify(info)).setMimeType(ContentService.MimeType.JSON);
  }

  // Acesso direto via navegador ou Telegram Mini App: serve o Cockpit Móvel Unificado (ou Composição Corporal)
  if (typeof HtmlService !== "undefined") {
    if (typeof HtmlService.createHtmlOutputFromFile === "function") {
      try {
        var arquivoHtml = (e && e.parameter && e.parameter.view === "bio") ? "ComposicaoCorporal" : "CockpitApp";
        try {
          return HtmlService.createHtmlOutputFromFile(arquivoHtml)
            .setTitle("Cockpit Móvel — Wagner Moraes")
            .addMetaTag("viewport", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover")
            .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
        } catch (eFile) {
          return HtmlService.createHtmlOutputFromFile("ComposicaoCorporal")
            .setTitle("Cockpit Móvel — Wagner Moraes")
            .addMetaTag("viewport", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover")
            .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
        }
      } catch (errHtml) {}
    }
    if (typeof HtmlService.createHtmlOutput === "function") {
      return HtmlService.createHtmlOutput("<h1>Cockpit Móvel</h1><p>Painel em carregamento...</p>");
    }
  }

  return ContentService.createTextOutput(JSON.stringify(info)).setMimeType(ContentService.MimeType.JSON);
}


function doPost(e) {
  var secret=ConfigService.get("WEBHOOK_SECRET"), allowed=ConfigService.get("TELEGRAM_CHAT_ID");
  if (!secret || !allowed || !e || !e.parameter || e.parameter.secret !== secret) return HtmlService.createHtmlOutput("Unauthorized");
  if(e.parameter.action==="configure") {
    if (e.postData && e.postData.contents) {
      try {
        var cfg = JSON.parse(e.postData.contents);
        var props = PropertiesService.getScriptProperties();
        var chavesPermitidas = ["GEMINI_API_KEYS", "PROVEDOR_TEXTO_PADRAO", "SPREADSHEET_ID_REMUME", "SPREADSHEET_ID_INTERACOES"];
        chavesPermitidas.forEach(function(k) {
          if (cfg[k] !== undefined && cfg[k] !== null && cfg[k] !== "") {
            props.setProperty(k, typeof cfg[k] === "string" ? cfg[k] : JSON.stringify(cfg[k]));
          }
        });
        ConfigService.invalidar();
      } catch (errCfg) {}
    }
    configurarWebhookTelegram();
    configurarMenuTelegram();
    var qtdChaves = ConfigService.getArray("GEMINI_API_KEYS").length;
    return ContentService.createTextOutput(JSON.stringify({ok: true, gemini_keys_count: qtdChaves})).setMimeType(ContentService.MimeType.JSON);
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

  // 1. Atualização das bases em cache a cada 4 horas (TTL de 6h)
  ScriptApp.newTrigger("aquecerCachePlanilhas").timeBased().everyHours(4).create();

  // 2. Ciclo contínuo de rotina e sentinela a cada 5 minutos
  ScriptApp.newTrigger("executarCicloRotina5Min").timeBased().everyMinutes(5).create();

  var chatId = ConfigService.get("TELEGRAM_CHAT_ID");
  enviarMensagemComTecladoFixo(chatId, "⚡ *ASSISTENTE ULTRA ROTINA 3.0 ATIVADO!*\nAutomação em nuvem, copiloto clínico determinístico e sentinela instalados.");
}

