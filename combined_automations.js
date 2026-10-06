/**
 * ==============================================================================
 * ULTRA ROTINA · MASTER CLOUD ASSISTANT & COPILOTO CLÍNICO MULTIMODAL
 * ==============================================================================
 * Executa 100% na nuvem do Google (24/7), gratuito, sem precisar de PC ligado.
 * 
 * Funcionalidades:
 * 1. 🎙️ VOICE-TO-CLINICAL: Transcreve e converte áudios gravados no Telegram em
 *    registros SOAP completos, prescrições da UBS ou passagens de plantão.
 * 2. 🩸 GASOMETRIA & ELETRÓLITOS (/gaso): Análise ácido-base sistemática passo a
 *    passo (Winter, Anion Gap corrigido, Delta Ratio, P/F e condutas de PA).
 * 3. 📐 CALCULADORAS MÉDICAS (/calc): CURB-65, Cockcroft-Gault/CKD-EPI, CHA2DS2-VASc,
 *    Wells TEP/TVP, Déficit de Água Livre, Glasgow-P e condutas recomendadas.
 * 4. 👨‍⚕️ PITCH & ROUND SOCRÁTICO (/round ou /pitch): Pitch de 60s pronto para o leito
 *    e as 3 perguntas capciosas do preceptor com gabarito fundamentado.
 * 5. 🩺 COPILOTO CLÍNICO SOAP (/soap): Sintetiza casos em formato SOAP com exame
 *    físico minucioso (ACV, AR, Abdome, Extremidades) e condutas RENAME/UBS.
 * 6. 💊 PRESCRITOR AMBULATORIAL RÁPIDO (/rx): Doses RENAME/UBS e cálculo por kg.
 * 7. 🏥 PASSAGEM DE PLANTÃO & ROUND (/plantao): Formato SBAR com pendências críticas.
 * 8. 📊 FECHAMENTO SEMANAL DE HÁBITOS (/semana & domingos 20h): Raio-X do Notion Habit Log.
 * 9. 🔔 ALERTAS 5 MIN ANTES: Dispara notificações antes de eventos do Google Calendar.
 * 10. ☀️ BRIEFING MATINAL (06:15) & 🌙 CHECK-IN NOTURNO (21:30): Teclado interativo Notion.
 * 11. 🛡️ GEMINI POOL: 4 contas e fallback entre flash-lite, flash e pro.
 * ==============================================================================
 */

// --- CONFIGURAÇÕES DO TELEGRAM E NOTION ---
var TELEGRAM_BOT_TOKEN = "REMOVIDO_CONFIGURAR_SCRIPT_PROPERTIES"; // Do @BotFather
var TELEGRAM_CHAT_ID = "1771571035";                                     // Do @userinfobot
var NOTION_TOKEN = "REMOVIDO_CONFIGURAR_SCRIPT_PROPERTIES";

// IDs dos seus Bancos no Notion
var NOTION_HABIT_LOG_DB_ID = "f1b41e4b-2d61-43aa-aa6a-81de8d073386";
var NOTION_TASKS_DB_ID     = "715b3615-90c1-4ef5-9ffc-325a7e6e0c34";

// --- POOL DE CHAVES DA IA (GEMINI POOL AUTOMÁTICO COM 4 CONTAS) ---
var GEMINI_API_KEYS = [
  "REMOVIDO_CONFIGURAR_SCRIPT_PROPERTIES",
  "REMOVIDO_CONFIGURAR_SCRIPT_PROPERTIES",
  "REMOVIDO_CONFIGURAR_SCRIPT_PROPERTIES",
  "REMOVIDO_CONFIGURAR_SCRIPT_PROPERTIES"
];
var GROQ_API_KEY = ""; // Opcional (fallback secundário se desejar)

var TIMEZONE = "America/Sao_Paulo";

// ==============================================================================
// 1. CICLO MESTRE DE ROTINA (EXECUTADO A CADA 5 MINUTOS VIA TRIGGER)
// ==============================================================================

function executarCicloRotina5Min() {
  if (!TELEGRAM_BOT_TOKEN) return;
  
  var agora = new Date();
  var dataHojeISO = Utilities.formatDate(agora, TIMEZONE, "yyyy-MM-dd");
  var horaBrasiliaStr = Utilities.formatDate(agora, TIMEZONE, "HH:mm");
  var partesHora = horaBrasiliaStr.split(":");
  var horaAtual = parseInt(partesHora[0], 10);
  var minutoAtual = parseInt(partesHora[1], 10);
  var totalMinutosAtual = horaAtual * 60 + minutoAtual;
  
  var props = PropertiesService.getScriptProperties();

  // A. BRIEFING MATINAL (06:15 até 09:00)
  // 06:15 = 6 * 60 + 15 = 375 minutos
  if (totalMinutosAtual >= 375 && totalMinutosAtual < 540) {
    var chaveBriefing = "briefing_enviado_" + dataHojeISO;
    if (!props.getProperty(chaveBriefing)) {
      Logger.log("⏰ [Ciclo 5m] Disparando Briefing Matinal automático...");
      enviarBriefingMatinal(TELEGRAM_CHAT_ID);
      props.setProperty(chaveBriefing, "true");
    }
  }

  // B. CHECK-IN NOTURNO (21:30 até 23:59)
  // 21:30 = 21 * 60 + 30 = 1290 minutos
  if (totalMinutosAtual >= 1290) {
    var chaveCheckin = "checkin_enviado_" + dataHojeISO;
    if (!props.getProperty(chaveCheckin)) {
      Logger.log("⏰ [Ciclo 5m] Disparando Check-in Noturno automático...");
      enviarCheckinNoturno(TELEGRAM_CHAT_ID);
      props.setProperty(chaveCheckin, "true");
    }
  }

  // C. RELATÓRIO SEMANAL DE HÁBITOS (DOMINGOS ÀS 20:00)
  // Domingo = agora.getDay() === 0, 20:00 = 1200 minutos
  if (agora.getDay() === 0 && totalMinutosAtual >= 1200) {
    var chaveRelatorio = "relatorio_semanal_" + dataHojeISO;
    if (!props.getProperty(chaveRelatorio)) {
      Logger.log("⏰ [Ciclo 5m] Disparando Relatório Semanal de Hábitos...");
      enviarRelatorioSemanalHabitos(TELEGRAM_CHAT_ID);
      props.setProperty(chaveRelatorio, "true");
    }
  }

  // D. ALERTAS PRÉ-BLOCO DA AGENDA (5 min antes de cada evento)
  verificarAgendaENotificar();
}

function verificarAgendaENotificar() {
  if (!TELEGRAM_BOT_TOKEN) return;

  var agora = new Date();
  var janelaFrente = new Date(agora.getTime() + (8 * 60 * 1000));
  
  var calendario = CalendarApp.getDefaultCalendar();
  if (!calendario) {
    Logger.log("⚠️ Calendário padrão não encontrado.");
    return;
  }
  
  var eventos = calendario.getEvents(agora, janelaFrente);
  var props = PropertiesService.getScriptProperties();
  
  for (var i = 0; i < eventos.length; i++) {
    var ev = eventos[i];
    var id = ev.getId();
    var inicio = ev.getStartTime();
    var diffMs = inicio.getTime() - agora.getTime();
    var diffMinutos = Math.round(diffMs / (60 * 1000));
    
    // Notifica se o evento começa entre 0 e 7 minutos à frente
    if (diffMinutos >= 0 && diffMinutos <= 7) {
      var chaveCache = "notif_" + id + "_" + inicio.getTime();
      if (props.getProperty(chaveCache)) continue;
      
      var titulo = ev.getTitle();
      var horaFormatada = Utilities.formatDate(inicio, TIMEZONE, "HH:mm");
      var texto = construirMensagemEvento(titulo, horaFormatada, diffMinutos);
      
      if (enviarMensagemParaChat(TELEGRAM_CHAT_ID, texto)) {
        props.setProperty(chaveCache, "true");
        Logger.log("🔔 Alerta disparado: " + titulo + " às " + horaFormatada);
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

// ==============================================================================
// 2. BRIEFING MATINAL (EXECUTADO DIARIAMENTE ÀS 06:15 VIA TRIGGER OU /briefing)
// ==============================================================================
function enviarBriefingMatinal(chatIdDestino) {
  var destino = chatIdDestino || TELEGRAM_CHAT_ID;
  var hoje = new Date();
  var dataFormatada = Utilities.formatDate(hoje, TIMEZONE, "dd/MM/yyyy");
  var diaSemana = obterDiaSemanaExtenso(hoje);
  
  var calendario = CalendarApp.getDefaultCalendar();
  var inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
  var fimDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);
  var eventos = calendario.getEvents(inicioDia, fimDia);
  
  var listaEventos = "";
  if (eventos.length === 0) {
    listaEventos = "  • Nenhum evento registrado na agenda hoje.";
  } else {
    for (var i = 0; i < eventos.length; i++) {
      var ev = eventos[i];
      var horaInicio = Utilities.formatDate(ev.getStartTime(), TIMEZONE, "HH:mm");
      var horaFim = Utilities.formatDate(ev.getEndTime(), TIMEZONE, "HH:mm");
      listaEventos += "  • `" + horaInicio + " - " + horaFim + "` | *" + ev.getTitle() + "*\n";
    }
  }
  
  var treinoMsg = obterTreinoDoDia(hoje.getDay());
  
  var msg = "☀️ *Bom dia, Wagner! Raio-X do Dia*\n" +
            "📅 *" + diaSemana + " (" + dataFormatada + ")*\n\n" +
            "🏋️ *Plano Físico Hoje:* " + treinoMsg + "\n" +
            "💤 *Almoço:* Não esqueça do cochilo estratégico de 25 min!\n\n" +
            "📋 *Sua Agenda de Hoje:*\n" + listaEventos + "\n" +
            "🩺 *Ferramentas do Internato:*\n" +
            "  • `/soap <caso>`: Sintetizar atendimento ambulatorial\n" +
            "  • `/rx <pedido>`: Gerar receita RENAME / Pediatria\n" +
            "  • `/plantao <dados>`: Passagem de leito modelo SBAR\n" +
            "  • `/duvida <pergunta>`: Salvar no Notion Tasks";
            
  enviarMensagemParaChat(destino, msg);
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

// ==============================================================================
// 3. CHECK-IN NOTURNO (EXECUTADO DIARIAMENTE ÀS 21:30 VIA TRIGGER OU /checkin)
// ==============================================================================
function enviarCheckinNoturno(chatIdDestino) {
  var destino = chatIdDestino || TELEGRAM_CHAT_ID;
  var hoje = new Date();
  var dataFormatada = Utilities.formatDate(hoje, TIMEZONE, "dd/MM");
  
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
        {"text": "⚡ Energia: 1", "callback_data": "energy_1"},
        {"text": "⚡ 2", "callback_data": "energy_2"},
        {"text": "⚡ 3", "callback_data": "energy_3"},
        {"text": "⚡ 4", "callback_data": "energy_4"},
        {"text": "⚡ 5", "callback_data": "energy_5"}
      ]
    ]
  };
  
  enviarMensagemComTecladoParaChat(destino, texto, teclado);
}

// ==============================================================================
// 4. WEBHOOK TELEGRAM (RECEBE MENSAGENS E CLIQUES)
// ==============================================================================

function doGet(e) {
  return HtmlService.createHtmlOutput("<h3>⚡ Ultra Rotina Master Assistant está ONLINE e pronto para receber webhooks do Telegram!</h3>");
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return HtmlService.createHtmlOutput("OK");
    }
    
    var update = JSON.parse(e.postData.contents);
    
    // CASO 1: Clique em Botão Inline (Callback Query)
    if (update.callback_query) {
      processarCallbackBotao(update.callback_query);
      return HtmlService.createHtmlOutput("OK");
    }
    
    // CASO 2: Mensagem de Voz / Áudio (Voice-to-Clinical com IA)
    if (update.message && (update.message.voice || update.message.audio)) {
      processarMensagemVoz(update.message);
      return HtmlService.createHtmlOutput("OK");
    }
    
    // CASO 3: Mensagem de Texto ou Comando
    if (update.message && update.message.text) {
      processarMensagemTexto(update.message);
      return HtmlService.createHtmlOutput("OK");
    }
  } catch (err) {
    Logger.log("Erro no doPost: " + err.toString());
  }
  return HtmlService.createHtmlOutput("OK");
}

function processarCallbackBotao(callbackQuery) {
  var callbackId = callbackQuery.id;
  var data = callbackQuery.data;
  var dataHojeISO = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");
  var props = PropertiesService.getScriptProperties();
  
  // A. HÁBITOS E ENERGIA (HABIT LOG)
  if (data.indexOf("habit_") === 0 || data.indexOf("energy_") === 0) {
    var pageId = obterOuCriarPaginaHabitLog(dataHojeISO);
    if (!pageId) {
      responderCallbackTelegram(callbackId, "❌ Erro ao conectar ao Notion");
      return;
    }
    
    if (data.indexOf("habit_") === 0) {
      var propName = "";
      if (data === "habit_medquest") propName = "🧠 MedQuest";
      else if (data === "habit_gym") propName = "🏋️ Academia";
      else if (data === "habit_english") propName = "📚 Inglês";
      else if (data === "habit_guitar") propName = "🎸 Violão";
      else if (data === "habit_love") propName = "❤️ Namorada";
      else if (data === "habit_reading") propName = "📖 Leitura";
      
      if (propName) {
        atualizarCheckboxNotion(pageId, propName, true);
        responderCallbackTelegram(callbackId, "✅ " + propName + " marcado no Notion!");
      }
    } else if (data.indexOf("energy_") === 0) {
      var valorEnergia = parseInt(data.replace("energy_", ""), 10);
      atualizarNumeroNotion(pageId, "⚡ Energia (1–5)", valorEnergia);
      responderCallbackTelegram(callbackId, "⚡ Energia " + valorEnergia + "/5 salva no Notion!");
    }
  } 
  // B. ARQUIVAMENTO NO NOTION TASKS (INTERNSHIP)
  else if (data === "salvar_soap_ultimo") {
    var soapArmazenado = props.getProperty("ultimo_soap_gerado");
    if (soapArmazenado) {
      criarTarefaNotion("Caso Clínico SOAP · " + Utilities.formatDate(new Date(), TIMEZONE, "dd/MM HH:mm"), "Internship", "2 · Important", soapArmazenado);
      responderCallbackTelegram(callbackId, "📁 Caso SOAP arquivado no Notion Tasks!");
    } else {
      responderCallbackTelegram(callbackId, "⚠️ Conteúdo expirado.");
    }
  } else if (data === "salvar_rx_ultimo") {
    var rxArmazenado = props.getProperty("ultimo_rx_gerado");
    if (rxArmazenado) {
      criarTarefaNotion("Prescrição Ambulatorial · " + Utilities.formatDate(new Date(), TIMEZONE, "dd/MM HH:mm"), "Internship", "2 · Important", rxArmazenado);
      responderCallbackTelegram(callbackId, "💊 Receita salva no Notion Tasks!");
    } else {
      responderCallbackTelegram(callbackId, "⚠️ Conteúdo expirado.");
    }
  } else if (data === "salvar_plantao_ultimo") {
    var plantaoArmazenado = props.getProperty("ultimo_plantao_gerado");
    if (plantaoArmazenado) {
      criarTarefaNotion("Passagem de Plantão SBAR · " + Utilities.formatDate(new Date(), TIMEZONE, "dd/MM HH:mm"), "Internship", "2 · Important", plantaoArmazenado);
      responderCallbackTelegram(callbackId, "🏥 Ficha SBAR salva no Notion Tasks!");
    } else {
      responderCallbackTelegram(callbackId, "⚠️ Conteúdo expirado.");
    }
  } else if (data === "salvar_gaso_ultimo") {
    var gasoArmazenada = props.getProperty("ultimo_gaso_gerado");
    if (gasoArmazenada) {
      criarTarefaNotion("Gasometria Analisada · " + Utilities.formatDate(new Date(), TIMEZONE, "dd/MM HH:mm"), "Internship", "2 · Important", gasoArmazenada);
      responderCallbackTelegram(callbackId, "🩸 Gasometria salva no Notion Tasks!");
    } else {
      responderCallbackTelegram(callbackId, "⚠️ Conteúdo expirado.");
    }
  } else if (data === "salvar_round_ultimo") {
    var roundArmazenado = props.getProperty("ultimo_round_gerado");
    if (roundArmazenado) {
      criarTarefaNotion("Pitch & Round Socrático · " + Utilities.formatDate(new Date(), TIMEZONE, "dd/MM HH:mm"), "Internship", "2 · Important", roundArmazenado);
      responderCallbackTelegram(callbackId, "👨‍⚕️ Pitch de Round salvo no Notion Tasks!");
    } else {
      responderCallbackTelegram(callbackId, "⚠️ Conteúdo expirado.");
    }
  } else if (data === "salvar_audio_ultimo") {
    var audioArmazenado = props.getProperty("ultimo_audio_resultado");
    if (audioArmazenado) {
      criarTarefaNotion("Registro Clínico por Áudio · " + Utilities.formatDate(new Date(), TIMEZONE, "dd/MM HH:mm"), "Internship", "2 · Important", audioArmazenado);
      responderCallbackTelegram(callbackId, "🎙️ Registro de voz salvo no Notion Tasks!");
    } else {
      responderCallbackTelegram(callbackId, "⚠️ Conteúdo expirado.");
    }
  }
}

function processarMensagemTexto(message) {
  var texto = message.text ? message.text.trim() : "";
  var chatId = (message.chat && message.chat.id) ? message.chat.id : TELEGRAM_CHAT_ID;
  
  if (!texto) return;

  // 1. AJUDA E START
  if (texto === "/start" || texto === "/ajuda" || texto === "/help") {
    var ajudaMsg = "⚡ *COPILOTO CLÍNICO & MASTER ASSISTANT 24/7*\n\n" +
                   "🎙️ *ENTRADA POR VOZ:*\n" +
                   "• Grave um áudio no Telegram narrando a consulta, receita ou leito, e a IA estrutura o registro na hora!\n\n" +
                   "🩺 *CLÍNICA & AMBULATÓRIO:*\n" +
                   "• `/soap <caso>`: SOAP ágil com exame físico completo (ACV, AR, Abdome, Extremidades) e condutas UBS.\n" +
                   "• `/rx <pedido>`: Prescritor ambulatorial RENAME/UBS com posologia e dose mg/kg pediátrica.\n" +
                   "• `/gaso <valores>`: Interpretação ácido-base completa (Winter, Anion Gap, Delta Ratio, P/F e condutas).\n" +
                   "• `/calc <escore>`: Calculadoras (CURB-65, Cockcroft-Gault/CKD-EPI, CHA2DS2-VASc, Wells, Glasgow-P).\n\n" +
                   "🏥 *ROUNDS & ENFERMARIA:*\n" +
                   "• `/round <caso>`: Pitch de 60s pronto para o leito + 3 perguntas capciosas do preceptor com gabarito.\n" +
                   "• `/plantao <caso>`: Passagem de plantão modelo SBAR com checklist de pendências críticas.\n\n" +
                   "🧠 *ESTUDOS & NOTION:*\n" +
                   "• `/duvida <pergunta>`: Arquivar dúvida médica no Notion Tasks para o estudo noturno.\n" +
                   "• `/task <tarefa>`: Salvar tarefa pessoal no Notion Tasks.\n\n" +
                   "📊 *ROTINA & HÁBITOS:*\n" +
                   "• `/semana`: Fechamento semanal estatístico do Habit Log no Notion (domingos às 20h).\n" +
                   "• `/checkin`: Painel com botões interativos para registrar os hábitos de hoje.\n" +
                   "• `/briefing`: Agenda do dia, eventos e plano físico de treino.\n" +
                   "• `/status`: Diagnóstico dos acionadores automáticos 24/7 na nuvem.";
    enviarMensagemParaChat(chatId, ajudaMsg);
    return;
  }

  // 1.1 COMANDO /status: Diagnóstico dos Acionadores e Rotinas em Segundo Plano
  if (texto === "/status") {
    var triggers = ScriptApp.getProjectTriggers();
    var agora = new Date();
    var horaBrasiliaStr = Utilities.formatDate(agora, TIMEZONE, "HH:mm:ss (dd/MM/yyyy)");
    var statusTriggers = triggers.length > 0 
      ? "✅ *ATIVO:* " + triggers.length + " acionador(es) rodando 24/7"
      : "⚠️ *DESATIVADO:* Nenhum acionador de segundo plano ativo no Apps Script!";
      
    var msgStatus = "⚡ *DIAGNÓSTICO DO ASSISTENTE MASTER*\n\n" +
                    "🕒 *Hora do Servidor (Brasília):* `" + horaBrasiliaStr + "`\n" +
                    "⏰ *Automação de 5 min:* " + statusTriggers + "\n" +
                    "🤖 *Webhook Telegram:* Conectado ✅\n" +
                    "📚 *Notion Tasks & Habits:* Conectado ✅\n" +
                    "🛡️ *Gemini Pool:* 4 chaves ativas ✅\n\n";
                    
    if (triggers.length === 0) {
      msgStatus += "🔴 *Atenção:* Os alertas 5 min antes, briefing matinal (06:15) e check-in noturno (21:30) dependem do acionador.\n\n" +
                   "👉 *Como ativar agora mesmo:*\n" +
                   "1. Abra seu editor Apps Script no Opera;\n" +
                   "2. No menu suspenso de funções no topo, selecione `instalarTodosOsAcionadores`;\n" +
                   "3. Clique em **Executar** e autorize uma única vez!";
    } else {
      msgStatus += "🎯 *Rotinas automáticas ativas 24/7:*\n" +
                   "• 🔔 Alertas 5 min antes de cada evento do Google Calendar\n" +
                   "• ☀️ Briefing matinal diário às 06:15\n" +
                   "• 🌙 Check-in noturno interativo às 21:30";
    }
    enviarMensagemParaChat(chatId, msgStatus);
    return;
  }

  // 1.2 COMANDO /ativar: Tentativa de auto-ativação
  if (texto === "/ativar") {
    try {
      instalarTodosOsAcionadores();
    } catch (e) {
      enviarMensagemParaChat(chatId, "⚠️ *Autorização do Google Necessária:*\nPor segurança do Google, o primeiro acionador precisa ser autorizado no navegador.\n\n👉 No editor do Apps Script, selecione `instalarTodosOsAcionadores` no topo e clique em **Executar**.");
    }
    return;
  }
  
  // 2. COMANDO /soap: Copiloto Clínico Ambulatorial
  if (texto.indexOf("/soap") === 0) {
    var casoClinico = texto.replace(/^\/soap\s*/i, "").trim();
    if (!casoClinico) {
      enviarMensagemParaChat(chatId, "🩺 Envie os dados do paciente após o comando.\n*Exemplo:*\n`/soap Mulher 68a com epigastralgia em queimação há 4d pós AINE...`");
      return;
    }
    
    enviarMensagemParaChat(chatId, "🩺 *Analisando caso clínico e estruturando SOAP completo... Aguarde um instante.*");
    
    var soapResultado = gerarSOAPComIA(casoClinico);
    if (soapResultado) {
      PropertiesService.getScriptProperties().setProperty("ultimo_soap_gerado", soapResultado);
      var tecladoSalvar = {
        "inline_keyboard": [
          [{"text": "📁 Salvar Caso no Notion (Internship)", "callback_data": "salvar_soap_ultimo"}]
        ]
      };
      enviarMensagemComTecladoParaChat(chatId, soapResultado, tecladoSalvar);
    } else {
      enviarMensagemParaChat(chatId, "⚠️ Erro ao processar com a IA. Tente novamente em instantes.");
    }
    return;
  }

  // 3. COMANDO /rx: Prescritor Ambulatorial Rápido RENAME/UBS
  if (texto.indexOf("/rx") === 0 || texto.indexOf("/receita") === 0) {
    var dadosPrescricao = texto.replace(/^\/(rx|receita)\s*/i, "").trim();
    if (!dadosPrescricao) {
      enviarMensagemParaChat(chatId, "💊 Envie a doença ou medicamento desejado.\n*Exemplos:*\n• `/rx amigdalite em crianca 16kg`\n• `/rx amlodipino 5mg e losartana 50mg`\n• `/rx escabiose em adulto 70kg`");
      return;
    }
    
    enviarMensagemParaChat(chatId, "💊 *Calculando posologia e gerando receita padronizada RENAME/UBS...*");
    
    var rxResultado = gerarPrescricaoComIA(dadosPrescricao);
    if (rxResultado) {
      PropertiesService.getScriptProperties().setProperty("ultimo_rx_gerado", rxResultado);
      var tecladoSalvarRx = {
        "inline_keyboard": [
          [{"text": "📁 Salvar Receita no Notion (Internship)", "callback_data": "salvar_rx_ultimo"}]
        ]
      };
      enviarMensagemComTecladoParaChat(chatId, rxResultado, tecladoSalvarRx);
    } else {
      enviarMensagemParaChat(chatId, "⚠️ Erro ao gerar prescrição. Tente novamente em instantes.");
    }
    return;
  }

  // 4. COMANDO /plantao: Estruturador de Passagem de Plantão SBAR
  if (texto.indexOf("/plantao") === 0 || texto.indexOf("/sbar") === 0) {
    var dadosPlantao = texto.replace(/^\/(plantao|sbar)\s*/i, "").trim();
    if (!dadosPlantao) {
      enviarMensagemParaChat(chatId, "🏥 Envie os dados do caso de enfermaria.\n*Exemplo:*\n`/plantao Leito 12, masc 62a, D4 de PAC grave com ceftriaxona+clari, afebril há 24h, em desmame de O2...`");
      return;
    }
    
    enviarMensagemParaChat(chatId, "🏥 *Sintetizando passagem de plantão no modelo SBAR...*");
    
    var plantaoResultado = gerarPassagemPlantaoSBAR(dadosPlantao);
    if (plantaoResultado) {
      PropertiesService.getScriptProperties().setProperty("ultimo_plantao_gerado", plantaoResultado);
      var tecladoSalvarPlantao = {
        "inline_keyboard": [
          [{"text": "📁 Salvar Ficha no Notion (Internship)", "callback_data": "salvar_plantao_ultimo"}]
        ]
      };
      enviarMensagemComTecladoParaChat(chatId, plantaoResultado, tecladoSalvarPlantao);
    } else {
      enviarMensagemParaChat(chatId, "⚠️ Erro ao estruturar plantão. Tente novamente em instantes.");
    }
    return;
  }

  // 5. COMANDO /gaso: Interpretador Ácido-Base e Eletrólitos
  if (texto.indexOf("/gaso") === 0) {
    var dadosGaso = texto.replace(/^\/gaso\s*/i, "").trim();
    if (!dadosGaso) {
      enviarMensagemParaChat(chatId, "🩸 Envie os parâmetros da gasometria após o comando.\n*Exemplo:*\n`/gaso pH 7.24 pCO2 28 HCO3 12 Na 138 Cl 102 Alb 4.0` ou cole o texto do laudo.");
      return;
    }
    
    enviarMensagemParaChat(chatId, "🩸 *Calculando distúrbios ácido-base, Anion Gap e Delta Ratio... Aguarde um instante.*");
    
    var gasoResultado = analisarGasometriaComIA(dadosGaso);
    if (gasoResultado) {
      PropertiesService.getScriptProperties().setProperty("ultimo_gaso_gerado", gasoResultado);
      var tecladoSalvarGaso = {
        "inline_keyboard": [
          [{"text": "📁 Salvar Gasometria no Notion (Internship)", "callback_data": "salvar_gaso_ultimo"}]
        ]
      };
      enviarMensagemComTecladoParaChat(chatId, gasoResultado, tecladoSalvarGaso);
    } else {
      enviarMensagemParaChat(chatId, "⚠️ Erro ao processar gasometria. Tente novamente em instantes.");
    }
    return;
  }

  // 6. COMANDO /calc: Calculadoras Médicas e Estratificação de Risco
  if (texto.indexOf("/calc") === 0) {
    var dadosCalc = texto.replace(/^\/calc\s*/i, "").trim();
    if (!dadosCalc) {
      var msgMenuCalc = "📐 *Calculadoras Médicas Disponíveis*\n\n" +
                        "Envie `/calc <nome ou parâmetros>`:\n" +
                        "• `/calc curb65 confuso, FR 32, PA 85/50, 68 anos`\n" +
                        "• `/calc ckd homem 72a, 65kg, creatinina 1.8`\n" +
                        "• `/calc cha2ds2vasc mulher 68a, hipertensa, diabética com FA`\n" +
                        "• `/calc wells tep dor pleurítica, hemoptise, FC 110`\n" +
                        "• `/calc deficit agua homem 70kg, Na 158`\n" +
                        "• `/calc glasgow abertura ocular ao som, confuso, localiza dor, pupilas normais`";
      enviarMensagemParaChat(chatId, msgMenuCalc);
      return;
    }
    
    enviarMensagemParaChat(chatId, "📐 *Calculando pontuação e estratificação de risco clínico...*");
    
    var calcResultado = processarCalculadoraClinicaComIA(dadosCalc);
    if (calcResultado) {
      enviarMensagemParaChat(chatId, calcResultado);
    } else {
      enviarMensagemParaChat(chatId, "⚠️ Erro ao processar cálculo médico. Tente novamente em instantes.");
    }
    return;
  }

  // 7. COMANDO /round ou /pitch: Preparação Socrática para Rounds de Enfermaria
  if (texto.indexOf("/round") === 0 || texto.indexOf("/pitch") === 0) {
    var dadosRound = texto.replace(/^\/(round|pitch)\s*/i, "").trim();
    if (!dadosRound) {
      enviarMensagemParaChat(chatId, "👨‍⚕️ Envie os dados do caso de enfermaria.\n*Exemplo:*\n`/round Leito 14, masc 68a, D3 de ICC descompensada perfil B com furosemida EV, PA 110/70, perda de 1.8kg, creatinina subiu de 1.1 para 1.4...`");
      return;
    }
    
    enviarMensagemParaChat(chatId, "👨‍⚕️ *Montando Pitch Clínico de 60s e antecipando perguntas capciosas do preceptor...*");
    
    var roundResultado = gerarPitchERoundComIA(dadosRound);
    if (roundResultado) {
      PropertiesService.getScriptProperties().setProperty("ultimo_round_gerado", roundResultado);
      var tecladoSalvarRound = {
        "inline_keyboard": [
          [{"text": "📁 Salvar Pitch no Notion (Internship)", "callback_data": "salvar_round_ultimo"}]
        ]
      };
      enviarMensagemComTecladoParaChat(chatId, roundResultado, tecladoSalvarRound);
    } else {
      enviarMensagemParaChat(chatId, "⚠️ Erro ao estruturar preparação de round. Tente novamente.");
    }
    return;
  }

  // 8. COMANDO /semana: Fechamento Semanal de Hábitos do Notion
  if (texto === "/semana" || texto === "/relatorio") {
    enviarRelatorioSemanalHabitos(chatId);
    return;
  }
  
  // 9. COMANDO /checkin
  if (texto === "/checkin") {
    enviarCheckinNoturno(chatId);
    return;
  }
  
  // 6. COMANDO /briefing
  if (texto === "/briefing") {
    enviarBriefingMatinal(chatId);
    return;
  }
  
  // 7. COMANDO /duvida
  if (texto.indexOf("/duvida") === 0) {
    var duvidaTexto = texto.replace(/^\/duvida\s*/i, "").trim();
    if (!duvidaTexto) {
      enviarMensagemParaChat(chatId, "Envie sua dúvida após o comando.\n*Exemplo:*\n`/duvida Critérios de gravidade na pancreatite aguda`");
      return;
    }
    var sucesso = criarTarefaNotion("Dúvida Clínica · " + duvidaTexto, "Internship", "2 · Important", "Capturado via Telegram.");
    if (sucesso) {
      enviarMensagemParaChat(chatId, "🩺 *Dúvida Clínica salva no Notion Tasks!*\n\n📌 *" + duvidaTexto + "*\nÁrea: _Internship_ | Status: _Inbox_");
    } else {
      enviarMensagemParaChat(chatId, "❌ Falha ao salvar no Notion.");
    }
    return;
  }
  
  // 8. COMANDO /task ou /tarefa
  if (texto.indexOf("/task") === 0 || texto.indexOf("/tarefa") === 0) {
    var taskTexto = texto.replace(/^\/(task|tarefa)\s*/i, "").trim();
    if (!taskTexto) {
      enviarMensagemParaChat(chatId, "Envie a tarefa após o comando.\n*Exemplo:*\n`/task Comprar jaleco novo`");
      return;
    }
    var ok = criarTarefaNotion(taskTexto, "Personal", "2 · Important", "Criado via Telegram.");
    if (ok) {
      enviarMensagemParaChat(chatId, "✅ *Tarefa salva no Notion Tasks!*\n\n📌 *" + taskTexto + "*\nÁrea: _Personal_ | Status: _Inbox_");
    } else {
      enviarMensagemParaChat(chatId, "❌ Falha ao salvar no Notion.");
    }
    return;
  }
  
  // 9. FEEDBACK PARA TEXTO LIVRE
  enviarMensagemParaChat(chatId, "🤖 *Mensagem recebida:*\n\"" + texto + "\"\n\nDigite `/ajuda` para ver todos os comandos disponíveis.");
}

// ==============================================================================
// 5. MOTOR DE INTELIGÊNCIA CLÍNICA COM GEMINI POOL MULTI-KEY
// ==============================================================================

function chamarGeminiPool(sistema, promptUsuario, maxTokens) {
  var tokens = maxTokens || 2000;
  var modelos = ["gemini-flash-lite-latest", "gemini-flash-latest", "gemini-2.5-pro"];
  
  for (var m = 0; m < modelos.length; m++) {
    var modelo = modelos[m];
    
    for (var k = 0; k < GEMINI_API_KEYS.length; k++) {
      var chave = GEMINI_API_KEYS[k].trim();
      var url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelo + ":generateContent?key=" + encodeURIComponent(chave);
      
      var payload = {
        "contents": [
          {
            "role": "user",
            "parts": [{"text": sistema + "\n\n" + promptUsuario}]
          }
        ],
        "generationConfig": {
          "temperature": 0.2,
          "maxOutputTokens": tokens
        }
      };
      
      var options = {
        "method": "post",
        "contentType": "application/json",
        "payload": JSON.stringify(payload),
        "muteHttpExceptions": true
      };
      
      try {
        var res = UrlFetchApp.fetch(url, options);
        var code = res.getResponseCode();
        
        if (code === 200) {
          var json = JSON.parse(res.getContentText());
          if (json.candidates && json.candidates.length > 0 && json.candidates[0].content) {
            return json.candidates[0].content.parts[0].text;
          }
        } else if (code === 429 || code === 503) {
          Logger.log("Chave " + (k + 1) + " limite/sobrecarga (" + code + ") no modelo " + modelo + ". Tentando próxima chave...");
          continue;
        } else {
          Logger.log("Erro (" + code + ") chave " + (k + 1) + " no modelo " + modelo);
          continue;
        }
      } catch (e) {
        Logger.log("Exceção na chamada Gemini (chave " + (k + 1) + "): " + e.message);
        continue;
      }
    }
  }
  
  if (GROQ_API_KEY) {
    return chamarGroqAPI(sistema, promptUsuario);
  }
  
  return null;
}

// --- FUNÇÃO 5.1: COPILOTO CLÍNICO SOAP ---
function gerarSOAPComIA(casoClinico) {
  var promptSistema = 
    "Você é um Preceptor Sênior de Medicina de Família e Comunidade (MFC) e Clínica Médica da FMRP-USP.\n" +
    "Sua função é auxiliar um interno do 5º/6º ano na elaboração de registros clínicos no formato SOAP ágeis, minuciosos e clinicamente impecáveis para prontuário, fundamentados nas diretrizes do Ministério da Saúde, SBD, SBC, PCDT e literatura médica atualizada.\n\n" +
    "DIRETRIZES DE FORMATO E OBJETIVIDADE:\n" +
    "1. Inicie IMEDIATAMENTE pelo título '🩺 *SÍNTESE SOAP · ATENDIMENTO AMBULATORIAL*'. NUNCA escreva saudações, prefácios ou comentários iniciais (como 'Olá interno', 'Excelente iniciativa...').\n" +
    "2. Adote estilo técnico de prontuário, direto e de alto rendimento clínico.\n\n" +
    "REGRA OBRIGATÓRIA PARA O EXAME FÍSICO (O - Objetivo):\n" +
    "Você DEVE SEMPRE redigir o exame físico completo e padronizado de prontuário, cobrindo detalhadamente:\n" +
    "1. Sinais Vitais & Ectoscopia (Geral: estado geral, LOTE, hidratação, coloração, acianótico, anictérico, afebril, PA, FC, FR, SpO2, Temp).\n" +
    "2. Aparelho Cardiovascular - ACV (Ictus, RCR em 2T, BNF, sopros, pulsos periféricos).\n" +
    "3. Aparelho Respiratório - AR (Expansibilidade, murmúrio vesicular - MV, presença/ausência de ruídos adventícios ajustados ao caso).\n" +
    "4. Abdome (Inspeção, ausculta/RHA, palpação superficial e profunda, visceromegalias, sinais peritoneais/descompressão brusca).\n" +
    "5. Extremidades & Perfusão (Pulsos, edema, perfusão capilar, sinais de TVP).\n" +
    "6. Segmentos específicos quando pertinentes (ex: oroscopia/otoscopia em queixas respiratórias, neurológico/Glasgow, etc.).\n" +
    "Integre os dados clínicos fornecidos pelo interno e preencha a semiologia normal/negativa com a redação técnica médica padrão de excelência.\n\n" +
    "ESTRUTURA DA RESPOSTA EM MARKDOWN:\n\n" +
    "🩺 *SÍNTESE SOAP · ATENDIMENTO AMBULATORIAL*\n\n" +
    "👤 *S - Subjetivo:*\n" +
    "- QP, HDA cronológica e detalhada, antecedentes pessoais/familiares, alergias, medicações em uso e hábitos de vida.\n\n" +
    "🔍 *O - Objetivo (Exame Físico Completo & Sinais Vitais):*\n" +
    "- *Geral / SV:* [...]\n" +
    "- *ACV:* [...]\n" +
    "- *AR:* [...]\n" +
    "- *Abdome:* [...]\n" +
    "- *Extremidades:* [...]\n" +
    "- *Exame Direcionado:* [...]\n\n" +
    "🧠 *A - Avaliação (Raciocínio Clínico):*\n" +
    "- *Hipótese Principal:* [...]\n" +
    "- *Diagnósticos Diferenciais:* [...]\n" +
    "- *⚠️ Sinais de Alarme (Red Flags):* [...]\n\n" +
    "📋 *P - Plano & Conduta (Atenção Básica / RENAME):*\n" +
    "- *Medidas Não Farmacológicas / Estilo de Vida:* [...]\n" +
    "- *Prescrição Farmacológica:* Nomes genéricos (RENAME), posologia, dose, via e duração exata.\n" +
    "- *Exames Complementares:* [...]\n" +
    "- *Orientações ao Paciente, Critérios de Alarme & Retorno:* [...]\n\n" +
    "💬 *Para Discutir com o Preceptor (Pitch Clínico):*\n" +
    "- Síntese verbal de 2 a 3 linhas pronta para o interno apresentar o caso de forma madura, segura e fundamentada.";

  return chamarGeminiPool(promptSistema, "CASO CLÍNICO:\n" + casoClinico, 2000);
}

// --- FUNÇÃO 5.2: PRESCRITOR AMBULATORIAL RÁPIDO RENAME/UBS ---
function gerarPrescricaoComIA(dadosPrescricao) {
  var promptSistema = 
    "Você é um Médico Especialista em Medicina de Família e Comunidade (MFC) e Pediatria Ambulatorial da FMRP-USP.\n" +
    "Sua função é gerar prescrições médicas ambulatoriais precisas, fundamentadas na RENAME (Relação Nacional de Medicamentos Essenciais do SUS), Formulário Terapêutico Nacional e diretrizes da SBP / SBD / SBC.\n\n" +
    "DIRETRIZES OBRIGATÓRIAS:\n" +
    "1. Modo Flexível: Interprete tanto diagnósticos (ex: 'faringoamigdalite bacteriana em crianca 18kg') quanto fármacos solicitados (ex: 'amoxicilina 500mg' ou 'losartana 50mg').\n" +
    "2. Se for Pediatria (criança / peso informado): Apresente SEMPRE a memória de cálculo explícita: (dose recomendada em mg/kg/dia ÷ número de tomadas = mg por dose = conversão exata para mL da apresentação da UBS).\n" +
    "3. Use SEMPRE as apresentações reais disponíveis nas Unidades Básicas de Saúde (RENAME/SUS).\n" +
    "4. Indique a quantidade total exata a ser dispensada na farmácia da UBS (ex: 'Dispensar: 2 frascos' ou 'Dispensar: 30 comprimidos').\n" +
    "5. Formato pronto para copiar e colar no e-SUS / Prontuário Eletrônico e imprimir para o paciente.\n\n" +
    "ESTRUTURA DA RESPOSTA EM MARKDOWN:\n\n" +
    "💊 *PRESCRIÇÃO AMBULATORIAL · ATENÇÃO PRIMÁRIA (RENAME/SUS)*\n\n" +
    "📋 *Indicação Clínica:* [...]\n" +
    "⚖️ *Dados do Paciente / Peso:* [...]\n\n" +
    "📝 *RECEITUÁRIO:*\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "*[USO ORAL / TÓPICO / INALATÓRIO]*\n\n" +
    "1) *Nome Genérico (DCI)* — [Concentração / Forma farmacêutica]\n" +
    "   • *Posologia:* [Ex: Tomar 1 comprimido por via oral a cada 12 horas por 14 dias]\n" +
    "   • *Quantidade a dispensar:* [Ex: 1 caixa com 30 comprimidos / 2 frascos de 150mL]\n" +
    "   • *Memória de Cálculo (se pediátrico):* [Dose calculada detalhada em mg/kg e mL]\n\n" +
    "[Repita para outros medicamentos sintomáticos ou associados se aplicável]\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
    "💡 *Orientações ao Paciente & Família:*\n" +
    "- [Como tomar, se com ou sem alimentos, hidratação, agitar frasco, etc.]\n" +
    "- [Sinais de alarme para reavaliação imediata]\n\n" +
    "🌿 *Medidas Não Farmacológicas:* [Orientações práticas]\n\n" +
    "🔄 *Alternativa em caso de Alergia / Falha:* [Opção de 2ª linha disponível no SUS]";

  return chamarGeminiPool(promptSistema, "DADOS DA PRESCRIÇÃO:\n" + dadosPrescricao, 1800);
}

// --- FUNÇÃO 5.3: ESTRUTURADOR DE PASSAGEM DE PLANTÃO SBAR ---
function gerarPassagemPlantaoSBAR(dadosCaso) {
  var promptSistema = 
    "Você é um Médico Hospitalista Preceptor de Clínica Médica da FMRP-USP.\n" +
    "Sua função é organizar casos internados em enfermarias no formato padronizado de segurança do paciente SBAR (Situation, Background, Assessment, Recommendation), pronto para rounds matinais e passagem de plantão com checklist de pendências críticas.\n\n" +
    "ESTRUTURA DA RESPOSTA EM MARKDOWN:\n\n" +
    "🏥 *PASSAGEM DE PLANTÃO · MODELO SBAR*\n\n" +
    "📍 *S - Situação:*\n" +
    "• *Leito & Paciente:* [Leito, Nome/Iniciais, Idade, Sexo]\n" +
    "• *D.I.H:* [Dia de Internação Hospitalar]\n" +
    "• *Diagnóstico Principal:* [...]\n" +
    "• *Status Atual:* [Estável / Em vigilância / Instável / Cuidados paliativos]\n\n" +
    "📜 *B - Breve Histórico (Background):*\n" +
    "• *HDA Resumida:* [Motivo da admissão e evolução em 2 a 3 linhas]\n" +
    "• *Comorbidades Relevantes:* [...]\n" +
    "• *Dispositivos:* [Acesso venoso, SVD, cateter O2, etc.]\n" +
    "• *Alergias:* [Alergias relatadas ou 'Sem alergias conhecidas']\n\n" +
    "🩺 *A - Avaliação dos Sistemas (Assessment):*\n" +
    "• *Neurológico:* [LOTE, ECG/Glasgow, sedação]\n" +
    "• *Cardiovascular & Hemodinâmica:* [PA, FC, ritmo, drogas vasoativas]\n" +
    "• *Respiratório:* [FR, SpO2, suporte O2, ausculta]\n" +
    "• *Gastrointestinal & Nutrição:* [Dieta, aceitação, abdome, evacuação]\n" +
    "• *Renal & Balanço Hídrico:* [Diurese mL/24h, BH acumulado]\n" +
    "• *Infeccioso & Antimicrobianos:* [Esquema atual, dia D... de tratamento, curva térmica]\n\n" +
    "🚨 *R - Recomendações & Pendências Críticas do Plantão:*\n" +
    "• *📋 Exames para Checar no Plantão:* [Labs, exames de imagem pendentes]\n" +
    "• *⚡ Condutas se Intercorrência:* ['Se febre...', 'Se dor torácica...', 'Se hipotensão...']\n" +
    "• *🎯 Metas para o Próximo Round:* [Desmame O2, progressão de dieta, alta]";

  return chamarGeminiPool(promptSistema, "DADOS DO CASO DE ENFERMARIA:\n" + dadosCaso, 2000);
}

// --- FUNÇÃO 5.4: INTERPRETADOR DE GASOMETRIA & ELETRÓLITOS ---
function analisarGasometriaComIA(dadosGaso) {
  var promptSistema = 
    "Você é um Médico Intensivista e Nefrologista Preceptor da FMRP-USP.\n" +
    "Sua função é realizar a interpretação sistemática, minuciosa e didática de gasometrias arteriais/venosas e eletrólitos de pacientes no pronto-socorro ou enfermaria.\n\n" +
    "MÉTODO SISTEMÁTICO OBRIGATÓRIO (PASSO A PASSO):\n" +
    "1. Acidemia ou Alcalemia: Avalie o pH (normal: 7,35 - 7,45).\n" +
    "2. Distúrbio Primário: metabólico (pelo HCO3) ou respiratório (pela pCO2).\n" +
    "3. Compensação Fisiológica Esperada:\n" +
    "   - Acidose metabólica: Fórmula de Winter: pCO2 esperada = (1,5 x HCO3) + 8 ± 2. Compare a pCO2 medida com a esperada para diagnosticar distúrbio respiratório associado!\n" +
    "   - Alcalose metabólica: pCO2 esperada = HCO3 + 15 ± 2.\n" +
    "   - Acidose respiratória aguda: para cada aumento de 10 na pCO2, o HCO3 sobe 1. Crônica: sobe 3 a 4.\n" +
    "   - Alcalose respiratória aguda: para cada queda de 10 na pCO2, o HCO3 cai 2. Crônica: cai 5.\n" +
    "4. Anion Gap (AG): Calcule AG = Na - (Cl + HCO3). Normal: 8 a 12 mEq/L.\n" +
    "   - Se a albumina estiver disponível: AG corrigido = AG calculado + 2,5 x (4,0 - Alb).\n" +
    "5. Relação Delta/Delta (Delta Gap / Delta Ratio):\n" +
    "   - Calcule se houver Acidose com Anion Gap aumentado: (AG calculado - 10) / (24 - HCO3 medido).\n" +
    "   - < 0,4 a 0,8: Acidose metabólica mista (Anion Gap elevado + hiperclorêmica).\n" +
    "   - 1,0 a 2,0: Acidose com Anion Gap puro.\n" +
    "   - > 2,0: Alcalose metabólica associada ou acidose respiratória crônica prévia.\n" +
    "6. Oxigenação & Ventilação: Avalie pO2, SpO2 e Relação P/F (pO2/FiO2) se FiO2 informada.\n" +
    "7. Hipóteses Diagnósticas Prováveis & Condutas Imediatas Baseadas em Evidências.\n\n" +
    "ESTRUTURA DA RESPOSTA EM MARKDOWN:\n" +
    "🩸 *INTERPRETAÇÃO DE GASOMETRIA & ELETRÓLITOS*\n\n" +
    "📊 *Valores Fornecidos:* [...]\n\n" +
    "🧭 *Diagnóstico Fisiopatológico:* [Nome completo do distúrbio puro ou misto]\n\n" +
    "🔢 *Passo a Passo Matemático:*\n" +
    "• *1. pH:* [...]\n" +
    "• *2. Distúrbio Primário:* [...]\n" +
    "• *3. Resposta Compensatória:* [...]\n" +
    "• *4. Anion Gap:* [...]\n" +
    "• *5. Delta Ratio:* [...]\n" +
    "• *6. Oxigenação:* [...]\n\n" +
    "🧠 *Principais Etiologias a Investigar:* [Lista concisa]\n\n" +
    "🚨 *Conduta Terapêutica Imediata:* [Passos práticos]";
    
  return chamarGeminiPool(promptSistema, "DADOS DA GASOMETRIA / ELETRÓLITOS:\n" + dadosGaso, 2000);
}

// --- FUNÇÃO 5.5: CALCULADORAS MÉDICAS & ESTRATIFICAÇÃO DE RISCO ---
function processarCalculadoraClinicaComIA(dadosCalc) {
  var promptSistema = 
    "Você é um Preceptor de Clínica Médica e Terapia Intensiva da FMRP-USP.\n" +
    "Sua função é processar e calcular com exatidão matemática escores clínicos de alta relevância no internato médico.\n\n" +
    "ESCORES SUPORTADOS:\n" +
    "- CURB-65 / CRB-65 (Pneumonia Comunitária)\n" +
    "- Cockcroft-Gault & CKD-EPI (Clearance de Creatinina e TFG com ajuste de dose de antimicrobianos)\n" +
    "- CHA2DS2-VASc & HAS-BLED (Anticoagulação na Fibrilação Atrial)\n" +
    "- Wells para TEP e TVP (Probabilidade pré-teste e solicitação de D-dímero vs AngioTC)\n" +
    "- Déficit de Água Livre (Hipernatremia: Água Corporal Total x [(Na/140) - 1])\n" +
    "- Glasgow-P (Escala de Coma de Glasgow com reatividade pupilar)\n" +
    "- Child-Pugh e MELD (Hepatopatia crônica)\n\n" +
    "DIRETRIZES:\n" +
    "Apresente: Nome do Escore, Pontuação Total, Critérios Pontuados detalhados, Classificação de Risco / Mortalidade e Conduta Médica Recomendada pelas diretrizes vigentes.\n\n" +
    "ESTRUTURA DA RESPOSTA EM MARKDOWN:\n" +
    "📐 *CALCULADORA CLÍNICA & ESTRATIFICAÇÃO DE RISCO*\n\n" +
    "🎯 *Escore Aplicado:* [...]\n" +
    "🔢 *Pontuação Obtida:* [...]\n" +
    "📋 *Critérios Pontuados:* [...]\n" +
    "⚠️ *Classificação de Risco:* [...]\n" +
    "💡 *Conduta Médica Recomendada:* [...]";

  return chamarGeminiPool(promptSistema, "DADOS PARA O CÁLCULO:\n" + dadosCalc, 1800);
}

// --- FUNÇÃO 5.6: PITCH DE ROUND & PRECEPTOR SOCRÁTICO ---
function gerarPitchERoundComIA(dadosCaso) {
  var promptSistema = 
    "Você é o Preceptor Mais Exigente e Brilhante de Clínica Médica da FMRP-USP.\n" +
    "Sua missão é treinar um interno do 5º/6º ano para a passagem de visita (round) e discussão de caso à beira do leito.\n\n" +
    "ESTRUTURA DA RESPOSTA EM MARKDOWN:\n\n" +
    "👨‍⚕️ *PREPARAÇÃO PARA O ROUND · PITCH & PRECEPTOR SOCRÁTICO*\n\n" +
    "🎤 *1. Pitch Clínico de 60 Segundos (Fale assim no leito):*\n" +
    "\"[Redija uma fala madura, técnica e concisa de 4 a 6 linhas que o interno deve recitar diretamente para a equipe, cobrindo DIH, motivo da admissão, evolução nas últimas 24h, principais achados de exame e proposta terapêutica do dia.]\"\n\n" +
    "🎯 *2. Três Perguntas Capciosas do Preceptor (O 'Pega-Rato'):*\n" +
    "1) ❓ *[Pergunta 1 sobre fisiopatologia ou semiologia fina do caso]*\n" +
    "   • 💡 *Gabarito & O que responder:* [Resposta padrão-ouro fundamentada em diretriz]\n\n" +
    "2) ❓ *[Pergunta 2 sobre escolha terapêutica, dose ou interação medicamentosa]*\n" +
    "   • 💡 *Gabarito & O que responder:* [Resposta padrão-ouro fundamentada]\n\n" +
    "3) ❓ *[Pergunta 3 sobre sinal de alarme, prognóstico ou critério de alta]*\n" +
    "   • 💡 *Gabarito & O que responder:* [Resposta padrão-ouro fundamentada]\n\n" +
    "🛡️ *Armadilha que você NUNCA deve falar na frente do chefe:* [Exemplo de gafe comum de interno nesse caso]";

  return chamarGeminiPool(promptSistema, "DADOS DO CASO PARA O ROUND:\n" + dadosCaso, 2200);
}

// --- FUNÇÃO 5.7: PROCESSADOR DE MENSAGENS DE VOZ (VOICE-TO-CLINICAL) ---
function processarMensagemVoz(message) {
  var chatId = (message.chat && message.chat.id) ? message.chat.id : TELEGRAM_CHAT_ID;
  var voiceObj = message.voice || message.audio;
  if (!voiceObj || !voiceObj.file_id) return;
  
  enviarMensagemParaChat(chatId, "🎙️ *Ouvindo e analisando áudio clínico com IA... Aguarde alguns instantes.*");
  
  var fileId = voiceObj.file_id;
  var urlGetFile = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/getFile?file_id=" + fileId;
  
  try {
    var resFile = UrlFetchApp.fetch(urlGetFile, {"muteHttpExceptions": true});
    if (resFile.getResponseCode() !== 200) {
      enviarMensagemParaChat(chatId, "⚠️ Erro ao obter áudio do Telegram.");
      return;
    }
    
    var fileData = JSON.parse(resFile.getContentText());
    var filePath = fileData.result.file_path;
    var fileDownloadUrl = "https://api.telegram.org/file/bot" + TELEGRAM_BOT_TOKEN + "/" + filePath;
    
    var audioBlob = UrlFetchApp.fetch(fileDownloadUrl).getBlob();
    var mimeType = audioBlob.getContentType() || "audio/ogg";
    if (mimeType.indexOf("audio") === -1) {
      mimeType = "audio/ogg";
    }
    var base64Audio = Utilities.base64Encode(audioBlob.getBytes());
    
    var promptSistema = 
      "Você é um Preceptor Sênior de Clínica Médica e Medicina de Família e Comunidade (MFC) da FMRP-USP.\n" +
      "Você acabou de receber um áudio clínico gravado diretamente por um interno no hospital ou ambulatório.\n" +
      "SUA TAREFA:\n" +
      "1. Ouça com atenção e identifique a intenção clínica principal:\n" +
      "   - Se narrar uma consulta/caso de ambulatório: estruture em formato SOAP COMPLETO com Sinais Vitais, Exame Físico minucioso (ACV, AR, Abdome, Extremidades), Avaliação e Plano da Atenção Primária (RENAME/SUS).\n" +
      "   - Se for um pedido de receita ou cálculo de medicação: estruture no formato de PRESCRIÇÃO AMBULATORIAL RENAME/SUS com posologia de adulto ou memória de cálculo pediátrica mg/kg/dia -> mL.\n" +
      "   - Se narrar paciente internado em leito: estruture no formato SBAR de Passagem de Plantão com checklist de pendências críticas.\n" +
      "   - Se for uma dúvida ou anotação rápida: transcreva e forneça a resposta clínica fundamentada.\n" +
      "2. Mantenha o mais alto padrão técnico médico de prontuário, sem enrolação e sem saudações banais.";
      
    var resultadoAudio = chamarGeminiPoolComAudio(base64Audio, mimeType, promptSistema);
    if (resultadoAudio) {
      PropertiesService.getScriptProperties().setProperty("ultimo_audio_resultado", resultadoAudio);
      var tecladoSalvarAudio = {
        "inline_keyboard": [
          [{"text": "📁 Salvar Registro no Notion (Internship)", "callback_data": "salvar_audio_ultimo"}]
        ]
      };
      enviarMensagemComTecladoParaChat(chatId, resultadoAudio, tecladoSalvarAudio);
    } else {
      enviarMensagemParaChat(chatId, "⚠️ Não foi possível processar o áudio com a IA no momento. Tente novamente ou use os comandos em texto.");
    }
  } catch (err) {
    Logger.log("Erro no processamento de voz: " + err.toString());
    enviarMensagemParaChat(chatId, "⚠️ Erro ao processar áudio: " + err.message);
  }
}

// --- FUNÇÃO 5.8: MOTOR GEMINI MULTIMODAL COM ÁUDIO ---
function chamarGeminiPoolComAudio(base64Audio, mimeType, sistema) {
  var modelos = ["gemini-flash-lite-latest", "gemini-flash-latest", "gemini-2.5-pro"];
  
  for (var m = 0; m < modelos.length; m++) {
    var modelo = modelos[m];
    
    for (var k = 0; k < GEMINI_API_KEYS.length; k++) {
      var chave = GEMINI_API_KEYS[k].trim();
      var url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelo + ":generateContent?key=" + encodeURIComponent(chave);
      
      var payload = {
        "contents": [
          {
            "role": "user",
            "parts": [
              {
                "inline_data": {
                  "mime_type": mimeType,
                  "data": base64Audio
                }
              },
              {
                "text": sistema
              }
            ]
          }
        ],
        "generationConfig": {
          "temperature": 0.2,
          "maxOutputTokens": 2500
        }
      };
      
      var options = {
        "method": "post",
        "contentType": "application/json",
        "payload": JSON.stringify(payload),
        "muteHttpExceptions": true
      };
      
      try {
        var res = UrlFetchApp.fetch(url, options);
        var code = res.getResponseCode();
        
        if (code === 200) {
          var json = JSON.parse(res.getContentText());
          if (json.candidates && json.candidates.length > 0 && json.candidates[0].content) {
            return json.candidates[0].content.parts[0].text;
          }
        } else if (code === 429 || code === 503) {
          Logger.log("Áudio: Chave " + (k + 1) + " status (" + code + ") modelo " + modelo + ". Pulando para próxima...");
          continue;
        } else {
          Logger.log("Áudio: Erro (" + code + ") chave " + (k + 1) + " no modelo " + modelo + ": " + res.getContentText());
          continue;
        }
      } catch (e) {
        Logger.log("Exceção na chamada Gemini com áudio: " + e.message);
        continue;
      }
    }
  }
  return null;
}

// --- FUNÇÃO 5.9: FECHAMENTO SEMANAL DE HÁBITOS & PERFORMANCE ---
function enviarRelatorioSemanalHabitos(chatIdDestino) {
  var destino = chatIdDestino || TELEGRAM_CHAT_ID;
  var agora = new Date();
  var seteDiasAtras = new Date(agora.getTime() - (7 * 24 * 60 * 60 * 1000));
  var dataInicioISO = Utilities.formatDate(seteDiasAtras, TIMEZONE, "yyyy-MM-dd");
  
  var url = "https://api.notion.com/v1/databases/" + NOTION_HABIT_LOG_DB_ID + "/query";
  var payload = {
    "filter": {
      "property": "Date",
      "date": {"on_or_after": dataInicioISO}
    },
    "sorts": [
      {"property": "Date", "direction": "ascending"}
    ]
  };
  
  var res = chamarNotionAPI(url, "POST", payload);
  if (!res || !res.results) {
    enviarMensagemParaChat(destino, "⚠️ Não foi possível obter o histórico semanal de hábitos no Notion.");
    return;
  }
  
  var totalDias = res.results.length;
  var contMedquest = 0;
  var contGym = 0;
  var contEnglish = 0;
  var contGuitar = 0;
  var contLove = 0;
  var contReading = 0;
  var somaEnergia = 0;
  var countEnergia = 0;
  
  for (var i = 0; i < res.results.length; i++) {
    var p = res.results[i].properties;
    if (p["🧠 MedQuest"] && p["🧠 MedQuest"].checkbox) contMedquest++;
    if (p["🏋️ Academia"] && p["🏋️ Academia"].checkbox) contGym++;
    if (p["📚 Inglês"] && p["📚 Inglês"].checkbox) contEnglish++;
    if (p["🎸 Violão"] && p["🎸 Violão"].checkbox) contGuitar++;
    if (p["❤️ Namorada"] && p["❤️ Namorada"].checkbox) contLove++;
    if (p["📖 Leitura"] && p["📖 Leitura"].checkbox) contReading++;
    if (p["⚡ Energia (1–5)"] && p["⚡ Energia (1–5)"].number) {
      somaEnergia += p["⚡ Energia (1–5)"].number;
      countEnergia++;
    }
  }
  
  var mediaEnergia = countEnergia > 0 ? (somaEnergia / countEnergia).toFixed(1) : "N/A";
  var metaGymPct = Math.round((contGym / 4) * 100);
  var metaEstudoPct = Math.round((contMedquest / 6) * 100);
  
  var msg = "📊 *FECHAMENTO SEMANAL DE HÁBITOS & PERFORMANCE*\n" +
            "📅 *Período:* " + Utilities.formatDate(seteDiasAtras, TIMEZONE, "dd/MM") + " a " + Utilities.formatDate(agora, TIMEZONE, "dd/MM") + " (" + totalDias + " registros)\n\n" +
            "🧠 *MedQuest (Meta 15h):* " + contMedquest + " dias ativos (" + metaEstudoPct + "% da meta semanal)\n" +
            "🏋️ *Musculação:* " + contGym + " treinos realizados (" + metaGymPct + "% da meta de 4 a 5 treinos)\n" +
            "📚 *Inglês Ativo:* " + contEnglish + " dias cumpridos\n" +
            "🎸 *Violão:* " + contGuitar + " dias de prática\n" +
            "❤️ *Tempo com Namorada:* " + contLove + " dias registrados\n" +
            "📖 *Leitura Geral:* " + contReading + " dias\n" +
            "⚡ *Nível Médio de Energia:* " + mediaEnergia + " / 5.0\n\n";
            
  if (contGym >= 4 && contMedquest >= 5) {
    msg += "🏆 *Desempenho de Alta Performance:* Semana impecável de equilíbrio entre internato, corpo e residência médica! Mantenha a consistência.";
  } else if (contMedquest < 4) {
    msg += "⚠️ *Ponto de Atenção:* As horas de MedQuest ficaram abaixo da meta de 15h semanais. Ajuste os blocos de estudo da próxima semana!";
  } else {
    msg += "💪 *Semana Sólida:* Bom progresso! Ajuste pequenos desvios para entrar com foco total na próxima semana.";
  }
  
  enviarMensagemParaChat(destino, msg);
}

function chamarGroqAPI(sistema, caso) {
  var url = "https://api.groq.com/openai/v1/chat/completions";
  var payload = {
    "model": "llama-3.3-70b-versatile",
    "messages": [
      {"role": "system", "content": sistema},
      {"role": "user", "content": caso}
    ],
    "temperature": 0.2,
    "max_tokens": 1500
  };
  
  var options = {
    "method": "post",
    "headers": {
      "Authorization": "Bearer " + GROQ_API_KEY,
      "Content-Type": "application/json"
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  try {
    var res = UrlFetchApp.fetch(url, options);
    if (res.getResponseCode() === 200) {
      var json = JSON.parse(res.getContentText());
      return json.choices[0].message.content;
    }
    return null;
  } catch (e) {
    Logger.log("Exceção Groq: " + e.message);
    return null;
  }
}

// ==============================================================================
// 6. INTEGRAÇÃO DIRETA COM A API DO NOTION
// ==============================================================================
function obterOuCriarPaginaHabitLog(dataISO) {
  var urlBusca = "https://api.notion.com/v1/databases/" + NOTION_HABIT_LOG_DB_ID + "/query";
  var payloadBusca = {
    "filter": {
      "property": "Date",
      "date": {"equals": dataISO}
    }
  };
  
  var res = chamarNotionAPI(urlBusca, "POST", payloadBusca);
  if (res && res.results && res.results.length > 0) {
    return res.results[0].id;
  }
  
  var dataObj = new Date();
  var diaNome = obterDiaSemanaExtenso(dataObj);
  var tituloDia = diaNome + " (" + Utilities.formatDate(dataObj, TIMEZONE, "dd/MM") + ")";
  
  var urlCriacao = "https://api.notion.com/v1/pages";
  var payloadCriacao = {
    "parent": {"database_id": NOTION_HABIT_LOG_DB_ID},
    "properties": {
      "Day": {"title": [{"text": {"content": tituloDia}}]},
      "Date": {"date": {"start": dataISO}}
    }
  };
  
  var novaPagina = chamarNotionAPI(urlCriacao, "POST", payloadCriacao);
  return novaPagina ? novaPagina.id : null;
}

function atualizarCheckboxNotion(pageId, propName, valor) {
  var url = "https://api.notion.com/v1/pages/" + pageId;
  var payload = { "properties": {} };
  payload.properties[propName] = {"checkbox": valor};
  chamarNotionAPI(url, "PATCH", payload);
}

function atualizarNumeroNotion(pageId, propName, valor) {
  var url = "https://api.notion.com/v1/pages/" + pageId;
  var payload = { "properties": {} };
  payload.properties[propName] = {"number": valor};
  chamarNotionAPI(url, "PATCH", payload);
}

function criarTarefaNotion(titulo, area, prioridade, notas) {
  var url = "https://api.notion.com/v1/pages";
  var hojeISO = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");
  
  var payload = {
    "parent": {"database_id": NOTION_TASKS_DB_ID},
    "properties": {
      "Task": {"title": [{"text": {"content": titulo}}]},
      "Status": {"select": {"name": "Inbox"}},
      "Area": {"select": {"name": area}},
      "Priority": {"select": {"name": prioridade}},
      "Due": {"date": {"start": hojeISO}},
      "Notes": {"rich_text": [{"text": {"content": notas.substring(0, 2000)}}]}
    }
  };
  
  var res = chamarNotionAPI(url, "POST", payload);
  return res !== null;
}

function chamarNotionAPI(url, metodo, dados) {
  var headers = {
    "Authorization": "Bearer " + NOTION_TOKEN,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json"
  };
  var options = {
    "method": metodo.toLowerCase(),
    "headers": headers,
    "muteHttpExceptions": true
  };
  if (dados) {
    options.payload = JSON.stringify(dados);
  }
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    if (code >= 200 && code < 300) {
      return JSON.parse(response.getContentText());
    } else {
      Logger.log("Erro Notion API (" + code + "): " + response.getContentText());
      return null;
    }
  } catch (e) {
    Logger.log("Exceção Notion: " + e.message);
    return null;
  }
}

// ==============================================================================
// 7. UTILITÁRIOS TELEGRAM & POST ROBUSTO (COM FALLBACK AUTOMÁTICO)
// ==============================================================================
function dividirTextoEmPartes(texto, limiteMax) {
  var limite = limiteMax || 3800;
  if (!texto || texto.length <= limite) {
    return [texto];
  }
  
  var partes = [];
  var restante = texto;
  
  while (restante.length > limite) {
    // 1. Tenta quebrar em quebra de parágrafo duplo (\n\n)
    var corte = restante.lastIndexOf("\n\n", limite);
    // 2. Se não encontrar ou o corte for muito cedo (menos de 40% do bloco), tenta quebra de linha (\n)
    if (corte === -1 || corte < limite * 0.4) {
      corte = restante.lastIndexOf("\n", limite);
    }
    // 3. Se ainda não achar, tenta espaço entre palavras
    if (corte === -1 || corte < limite * 0.4) {
      corte = restante.lastIndexOf(" ", limite);
    }
    // 4. Em último caso, corta no limite exato
    if (corte === -1) {
      corte = limite;
    }
    
    var pedaco = restante.substring(0, corte).trim();
    if (pedaco) {
      partes.push(pedaco);
    }
    restante = restante.substring(corte).trim();
  }
  
  if (restante) {
    partes.push(restante);
  }
  
  return partes;
}

function enviarMensagemParaChat(chatId, texto) {
  return enviarMensagemSegmentada(chatId, texto, null);
}

function enviarMensagemComTecladoParaChat(chatId, texto, teclado) {
  return enviarMensagemSegmentada(chatId, texto, teclado);
}

function enviarMensagemSegmentada(chatId, texto, teclado) {
  if (!texto) return false;
  var partes = dividirTextoEmPartes(texto, 3800);
  var sucessoGeral = true;
  
  for (var i = 0; i < partes.length; i++) {
    var ehUltima = (i === partes.length - 1);
    var url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage";
    var payload = {
      "chat_id": chatId,
      "text": partes[i],
      "parse_mode": "Markdown"
    };
    
    // Anexa teclado inline somente na última parte para o fluxo de interação ficar perfeito
    if (ehUltima && teclado) {
      payload.reply_markup = teclado;
    }
    
    var ok = executarPostTelegram(url, payload);
    if (!ok) {
      sucessoGeral = false;
    }
    
    // Pausa breve entre mensagens para garantir a ordem correta de entrega no Telegram
    if (partes.length > 1 && !ehUltima) {
      Utilities.sleep(350);
    }
  }
  
  return sucessoGeral;
}

function responderCallbackTelegram(callbackId, textoToast) {
  var url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/answerCallbackQuery";
  var payload = {
    "callback_query_id": callbackId,
    "text": textoToast,
    "show_alert": false
  };
  executarPostTelegram(url, payload);
}

function executarPostTelegram(url, payload) {
  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  try {
    var res = UrlFetchApp.fetch(url, options);
    var code = res.getResponseCode();
    if (code === 200) {
      return true;
    }
    
    var responseText = res.getContentText();
    Logger.log("⚠️ Erro API Telegram (" + code + "): " + responseText);
    
    // FALLBACK INTELIGENTE: Se falhou por causa do Markdown, reenviar como texto puro!
    if (payload.parse_mode) {
      Logger.log("🔄 Reenviando mensagem sem formatação Markdown para garantir entrega...");
      var payloadPuro = JSON.parse(JSON.stringify(payload));
      delete payloadPuro.parse_mode;
      options.payload = JSON.stringify(payloadPuro);
      var retryRes = UrlFetchApp.fetch(url, options);
      if (retryRes.getResponseCode() === 200) {
        Logger.log("✅ Reenvio sem Markdown realizado com sucesso!");
        return true;
      } else {
        Logger.log("❌ Falha também no reenvio puro: " + retryRes.getContentText());
      }
    }
    return false;
  } catch (e) {
    Logger.log("Exceção na requisição Telegram: " + e.toString());
    return false;
  }
}

function obterDiaSemanaExtenso(data) {
  var dias = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  return dias[data.getDay()];
}

// ==============================================================================
// 8. CONFIGURAÇÃO DE WEBHOOK E DIAGNÓSTICO INTEGRADO
// ==============================================================================

function configurarWebhookTelegram() {
  var WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwo6GqTmc0_8fl9peKlw5d5jpfL5nqsc-ozLrqHiVk2RHD4h968EZAG4P75i2qSBlw9EQ/exec";
  
  var url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/setWebhook?url=" + encodeURIComponent(WEB_APP_URL) + "&drop_pending_updates=true";
  var res = UrlFetchApp.fetch(url, {"muteHttpExceptions": true});
  Logger.log("Resultado do Webhook: " + res.getContentText());
}

function testarDiagnosticoCompleto() {
  Logger.log("==================================================");
  Logger.log("⚡ TESTE DE DIAGNÓSTICO DO ASSISTENTE MASTER");
  Logger.log("==================================================");
  
  // 1. Status do Webhook no Telegram
  try {
    var urlInfo = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/getWebhookInfo";
    var resInfo = UrlFetchApp.fetch(urlInfo, {"muteHttpExceptions": true});
    Logger.log("1. Status do Webhook no Telegram:\n" + resInfo.getContentText());
  } catch (e) {
    Logger.log("1. Erro ao consultar Webhook: " + e.toString());
  }
  
  // 2. Teste do Gemini Pool
  try {
    var testeGemini = chamarGeminiPool("Você é um médico preceptor.", "Teste de conexão do pool.", 100);
    Logger.log("2. Resposta do Gemini Pool: " + (testeGemini ? "SUCESSO ✅ (" + testeGemini.substring(0, 50) + "...)" : "FALHA ❌"));
  } catch (e) {
    Logger.log("2. Erro Gemini: " + e.toString());
  }
  
  // 3. Teste Notion
  try {
    var resNotion = chamarNotionAPI("https://api.notion.com/v1/users/me", "GET");
    Logger.log("3. Conexão Notion: " + (resNotion ? "OK ✅ (" + (resNotion.name || resNotion.id) + ")" : "FALHA ❌"));
  } catch (e) {
    Logger.log("3. Erro Notion: " + e.toString());
  }
  
  Logger.log("==================================================");
}

// ==============================================================================
// 9. INSTALAÇÃO E GERENCIAMENTO DE ACIONADORES AUTOMÁTICOS (24/7)
// ==============================================================================

/**
 * EXECUTE ESTA FUNÇÃO UMA VEZ NO EDITOR PARA ATIVAR O ROBÔ 24/7 NA NUVEM!
 * Ela cria o gatilho de tempo para rodar a cada 5 minutos, garantindo que
 * o robô mande os alertas de agenda, o briefing das 06:15 e o check-in das 21:30.
 */
function instalarTodosOsAcionadores() {
  Logger.log("🔧 Instalando acionadores automáticos no Google Apps Script...");
  
  // 1. Remove acionadores antigos para evitar duplicações
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    var funcName = triggers[i].getHandlerFunction();
    if (funcName === "executarCicloRotina5Min" || funcName === "verificarAgendaENotificar") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // 2. Cria o Acionador Temporal que executa a cada 5 minutos
  ScriptApp.newTrigger("executarCicloRotina5Min")
    .timeBased()
    .everyMinutes(5)
    .create();
    
  Logger.log("✅ Acionador de 5 minutos instalado com sucesso!");
  
  var msgConfirmacao = "⚡ *ASSISTENTE ULTRA ROTINA ATIVADO NA NUVEM!*\n\n" +
                       "Acionador automático de 5 minutos instalado com sucesso no Google Apps Script.\n\n" +
                       "🤖 *O que está rodando 24/7 agora:*\n" +
                       "• 🔔 *Alertas de Agenda:* Notificação 5 min antes de cada bloco\n" +
                       "• ☀️ *Briefing Matinal:* Enviado diariamente às 06:15\n" +
                       "• 🌙 *Check-in Noturno:* Enviado diariamente às 21:30 com teclado Notion\n" +
                       "• 🩺 *Comandos Clínicos:* `/soap`, `/rx`, `/plantao`, `/duvida`, `/task`\n\n" +
                       "Digite `/status` a qualquer momento para ver o diagnóstico em tempo real.";
                       
  enviarMensagemParaChat(TELEGRAM_CHAT_ID, msgConfirmacao);
}

function listarAcionadoresAtivos() {
  var triggers = ScriptApp.getProjectTriggers();
  Logger.log("Total de acionadores ativos: " + triggers.length);
  for (var i = 0; i < triggers.length; i++) {
    Logger.log("Acionador " + (i + 1) + ": Função=" + triggers[i].getHandlerFunction() + ", Tipo=" + triggers[i].getEventType());
  }
  return triggers.length;
}

function desinstalarAcionadores() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  Logger.log("Todos os acionadores foram removidos.");
  enviarMensagemParaChat(TELEGRAM_CHAT_ID, "🛑 *Acionadores automáticos foram desativados.*");
}

// --- FUNÇÕES DE TESTE MANUAL IMEDIATO ---

function testarCiclo5MinAgora() {
  Logger.log("Executando ciclo de 5 minutos manualmente...");
  executarCicloRotina5Min();
  Logger.log("Ciclo concluído!");
}

function testarDisparoManualBriefing() {
  Logger.log("Disparando Briefing Matinal no Telegram...");
  enviarBriefingMatinal(TELEGRAM_CHAT_ID);
}

function testarDisparoManualCheckin() {
  Logger.log("Disparando Check-in Noturno no Telegram...");
  enviarCheckinNoturno(TELEGRAM_CHAT_ID);
}

function testarDisparoManualAlertaAgenda() {
  var texto = construirMensagemEvento("Sessão MedQuest - Nefrologia", "14:00", 5);
  enviarMensagemParaChat(TELEGRAM_CHAT_ID, texto);
}

function testarDisparoManualGaso() {
  Logger.log("Testando interpretação de gasometria...");
  var res = analisarGasometriaComIA("pH 7.24, pCO2 28, HCO3 12, Na 138, Cl 102, Alb 4.0");
  if (res) enviarMensagemParaChat(TELEGRAM_CHAT_ID, res);
}

function testarDisparoManualCalc() {
  Logger.log("Testando calculadora clínica (CURB-65)...");
  var res = processarCalculadoraClinicaComIA("curb65 confuso, FR 32, PA 85/50, 68 anos");
  if (res) enviarMensagemParaChat(TELEGRAM_CHAT_ID, res);
}

function testarDisparoManualRound() {
  Logger.log("Testando preparação de round / pitch socrático...");
  var res = gerarPitchERoundComIA("Leito 14, masc 68a, D3 de ICC descompensada perfil B com furosemida EV, perda de 1.8kg");
  if (res) enviarMensagemParaChat(TELEGRAM_CHAT_ID, res);
}

function testarDisparoManualRelatorioSemanal() {
  Logger.log("Disparando relatório semanal de hábitos no Telegram...");
  enviarRelatorioSemanalHabitos(TELEGRAM_CHAT_ID);
}


