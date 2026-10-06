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

// --- CONFIGURAÇÃO MULTI-ENGINE DE IA (GROQ 120B + OPENROUTER + Z.AI + GEMINI POOL) ---
// Provedor padrão para raciocínio clínico e texto: "GROQ", "OPENROUTER", "ZAI" ou "GEMINI"
var PROVEDOR_TEXTO_PADRAO = "GROQ";

// 1. GROQ CLOUD (Ultra-rápido ~1.8s com modelo gigante openai/gpt-oss-120b)
var GROQ_API_KEY = "REMOVIDO_CONFIGURAR_SCRIPT_PROPERTIES";

// 2. OPENROUTER (Meta-modelo inteligente openrouter/free com seleção automática)
var OPENROUTER_API_KEY = "REMOVIDO_CONFIGURAR_SCRIPT_PROPERTIES";

// 3. Z.AI (Zhipu AI - Cota ilimitada gratuita com modelo oficial glm-4.5-flash)
var ZAI_API_KEY = "REMOVIDO_CONFIGURAR_SCRIPT_PROPERTIES";

// 4. GOOGLE AI STUDIO (Gemini Pool de 4 chaves para visão multimodal, áudios e segurança final)
var GEMINI_API_KEYS = [
  "REMOVIDO_CONFIGURAR_SCRIPT_PROPERTIES",
  "REMOVIDO_CONFIGURAR_SCRIPT_PROPERTIES",
  "REMOVIDO_CONFIGURAR_SCRIPT_PROPERTIES",
  "REMOVIDO_CONFIGURAR_SCRIPT_PROPERTIES"
];

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
                    "📚 *Notion Tasks & Habits:* Conectado ✅\n\n" +
                    "🧠 *ARQUITETURA DE IA (4 NÍVEIS):*\n" +
                    "• *Motor Ativo:* `" + PROVEDOR_TEXTO_PADRAO + "` 🚀\n" +
                    "• *1. Groq (120B):* " + (GROQ_API_KEY ? "Ativo (~1.8s) ✅" : "Inativo ❌") + "\n" +
                    "• *2. OpenRouter (Auto-Free):* " + (OPENROUTER_API_KEY ? "Ativo ✅" : "Inativo ❌") + "\n" +
                    "• *3. Z.ai (GLM-4.5-Flash):* " + (ZAI_API_KEY ? "Ativo ✅" : "Inativo ❌") + "\n" +
                    "• *4. Gemini Pool:* 4 contas (Visão/Áudio & Fallback Final) ✅\n\n";
                    
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
