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

