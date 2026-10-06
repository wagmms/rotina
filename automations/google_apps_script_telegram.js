/**
 * ==============================================================================
 * ULTRA ROTINA · NOTIFICADOR TELEGRAM AUTOMÁTICO (GOOGLE APPS SCRIPT)
 * ==============================================================================
 * Executa 100% na nuvem do Google (24/7), sem depender de computador ligado.
 * Monitora o Google Agenda e envia notificações automáticas no seu Telegram.
 * ==============================================================================
 */

// 1. CONFIGURE SUAS CREDENCIAIS DO TELEGRAM AQUI:
var TELEGRAM_BOT_TOKEN = "SEU_TELEGRAM_BOT_TOKEN_AQUI"; // Obtido no @BotFather
var TELEGRAM_CHAT_ID = "SEU_TELEGRAM_CHAT_ID_AQUI";     // Obtido no @userinfobot

/**
 * Função de Teste Rápido:
 * Selecione 'testarEnvioTelegram' e clique em 'Executar' para testar a conexão!
 */
function testarEnvioTelegram() {
  var mensagem = "⚡ *Teste de Conexão: Ultra Rotina*\n\nSeu robô do Google Apps Script está ativo e pronto para enviar seus avisos diários no Telegram!";
  enviarMensagemTelegram(mensagem);
}

/**
 * Função Principal (Executada automaticamente a cada minuto ou a cada 5 minutos pelo Trigger):
 * Busca eventos que começam nos próximos 5 minutos e avisa no Telegram.
 */
function verificarAgendaENotificar() {
  if (TELEGRAM_BOT_TOKEN === "SEU_TELEGRAM_BOT_TOKEN_AQUI" || !TELEGRAM_BOT_TOKEN) {
    Logger.log("Atenção: Configure o TELEGRAM_BOT_TOKEN antes de executar.");
    return;
  }

  var agora = new Date();
  var cincoMinutosFrente = new Date(agora.getTime() + (5 * 60 * 1000));
  
  var calendario = CalendarApp.getDefaultCalendar();
  // Busca eventos que começam entre agora e daqui a 5 minutos
  var eventos = calendario.getEvents(agora, cincoMinutosFrente);
  
  var props = PropertiesService.getScriptProperties();
  
  for (var i = 0; i < eventos.length; i++) {
    var ev = eventos[i];
    var id = ev.getId();
    var inicio = ev.getStartTime();
    
    // Verifica se o evento começa na janela de disparo (próximos 5 minutos)
    var diffMinutos = Math.round((inicio.getTime() - agora.getTime()) / (60 * 1000));
    
    // Evita enviar notificação duplicada para o mesmo evento
    var chaveCache = "notificado_" + id + "_" + inicio.getTime();
    if (props.getProperty(chaveCache)) {
      continue;
    }
    
    var titulo = ev.getTitle();
    var horaFormatada = Utilities.formatDate(inicio, "America/Sao_Paulo", "HH:mm");
    
    // Personaliza a mensagem baseada no tipo de evento
    var textoAviso = construirMensagemPersonalizada(titulo, horaFormatada, diffMinutos);
    
    var sucesso = enviarMensagemTelegram(textoAviso);
    if (sucesso) {
      props.setProperty(chaveCache, "true");
      Logger.log("Notificação enviada: " + titulo);
    }
  }
}

/**
 * Monta o texto com formatação especial e conselhos da Ultra Rotina
 */
function construirMensagemPersonalizada(titulo, horaFormatada, minutosRestantes) {
  var avisoTempo = minutosRestantes <= 1 ? "Começando agora" : "Em " + minutosRestantes + " minutos";
  var msg = "🔔 *" + avisoTempo + " (" + horaFormatada + ")*\n\n📌 *" + titulo + "*\n";
  
  var tLower = titulo.toLowerCase();
  
  if (tLower.indexOf("medquest") !== -1 || tLower.indexOf("estudo") !== -1) {
    msg += "\n🧠 *Foco Total:* Modo ativo! Questões comentadas + Anki. Zero distrações.";
  } else if (tLower.indexOf("academia") !== -1 || tLower.indexOf("musculação") !== -1) {
    msg += "\n🏋️ *Treino de Força:* Beba água, aqueça bem e foco nas séries válidas!";
  } else if (tLower.indexOf("inglês") !== -1) {
    msg += "\n📚 *Inglês Ativo:* Foco em pronúncia, vocabulário e listening sem interrupção.";
  } else if (tLower.indexOf("violão") !== -1) {
    msg += "\n🎸 *Violão:* Prática fluida e relaxante. Aproveite a evolução musical!";
  } else if (tLower.indexOf("cochilo") !== -1 || tLower.indexOf("almoço") !== -1) {
    msg += "\n💤 *Power Nap:* Alarme em 25 min para resetar o córtex pré-frontal.";
  } else if (tLower.indexOf("namorada") !== -1 || tLower.indexOf("date") !== -1) {
    msg += "\n❤️ *Tempo de Qualidade:* Presença plena e zero pensamentos de trabalho.";
  }
  
  return msg;
}

/**
 * Dispara requisição HTTP POST para a API do Telegram
 */
function enviarMensagemTelegram(texto) {
  var url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage";
  var payload = {
    "chat_id": TELEGRAM_CHAT_ID,
    "text": texto,
    "parse_mode": "Markdown"
  };
  
  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var resCode = response.getResponseCode();
    if (resCode === 200) {
      return true;
    } else {
      Logger.log("Erro Telegram (" + resCode + "): " + response.getContentText());
      return false;
    }
  } catch (e) {
    Logger.log("Exceção ao enviar para Telegram: " + e.message);
    return false;
  }
}
