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
      props.setProperty("ultima_data_briefing", dataHojeISO);
      enviarBriefingMatinal(chatId);
    }
  }

  // B. CHECK-IN NOTURNO (21:30 até 23:59)
  if (minutos >= 1290) {
    if (props.getProperty("ultima_data_checkin") !== dataHojeISO) {
      props.setProperty("ultima_data_checkin", dataHojeISO);
      var stPl = detectarPlantaoStatus(agora);
      if (stPl.ehPlantaoHoje) {
        enviarMensagemParaChat(chatId, "🚨 *EM PLANTÃO NOTURNO:*\nCheck-in de hábitos silenciado para manter o foco nos pacientes. Se precisar de condutas, doses de Sala Vermelha (`/dva`, `/sri`) ou gasometria, estou na retaguarda. Bom plantão!");
      } else {
        enviarCheckinNoturno(chatId);
      }
    }
  }

  // C. RELATÓRIO SEMANAL DE HÁBITOS (DOMINGOS ÀS 20:00)
  if (agora.getDay() === 0 && minutos >= 1200) {
    if (props.getProperty("ultima_data_relatorio") !== dataHojeISO) {
      props.setProperty("ultima_data_relatorio", dataHojeISO);
      enviarRelatorioSemanalHabitos(chatId);
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
        if (new RegExp("(?:^|[^a-záéíóúãõç])" + termosPlantao[t] + "(?:$|[^a-záéíóúãõç])", "i").test(tit)) {
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

/**
 * ==============================================================================
 * ROTINA SERVICE: TIME-BLOCKING ADAPTATIVO & GESTÃO DINÂMICA DE HÁBITOS
 * ==============================================================================
 */
var RotinaService = {
  PREFIXO_PROP: "ROTINA_OVERRIDE_",

  normalizarDataISO: function(dataRef) {
    if (!dataRef) dataRef = new Date();
    if (typeof dataRef === "string") {
      var match = dataRef.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
    }
    var d = dataRef instanceof Date ? dataRef : new Date(dataRef);
    if (isNaN(d.getTime())) d = new Date();
    var tz = (typeof ConfigService !== "undefined" && ConfigService.get) ? ConfigService.get("TIMEZONE", "America/Sao_Paulo") : "America/Sao_Paulo";
    if (typeof Utilities !== "undefined" && Utilities.formatDate) {
      return Utilities.formatDate(d, tz, "yyyy-MM-dd");
    }
    var ano = d.getFullYear();
    var mes = ("0" + (d.getMonth() + 1)).slice(-2);
    var dia = ("0" + d.getDate()).slice(-2);
    return ano + "-" + mes + "-" + dia;
  },

  obterGradeBase: function(diaSemanaNum) {
    var d = typeof diaSemanaNum === "number" ? diaSemanaNum : (new Date()).getDay();
    switch (d) {
      case 1: // Segunda-feira
        return [
          { id: "internato_m", titulo: "Internato: Enfermaria / Ambulatório", inicio: "07:00", fim: "12:00", categoria: "clinico", status: "pendente", essencial: true, nota: "" },
          { id: "cochilo", titulo: "Almoço & Cochilo Estratégico (25 min)", inicio: "12:00", fim: "13:30", categoria: "recuperacao", status: "pendente", essencial: true, nota: "Reset do córtex pré-frontal" },
          { id: "internato_t", titulo: "Internato: Prática / Procedimentos", inicio: "13:30", fim: "17:00", categoria: "clinico", status: "pendente", essencial: true, nota: "" },
          { id: "treino", titulo: "Musculação: Superior A (Peito/Costas/Ombros/Braços)", inicio: "17:30", fim: "19:00", categoria: "treino", status: "pendente", essencial: false, nota: "Séries válidas e descanso cronometrado" },
          { id: "jantar", titulo: "Jantar & Descompressão", inicio: "19:00", fim: "20:00", categoria: "lifestyle", status: "pendente", essencial: false, nota: "" },
          { id: "estudo", titulo: "Imersão MedQuest & Anki (Questões Ativas)", inicio: "20:00", fim: "21:30", categoria: "estudo", status: "pendente", essencial: true, nota: "Foco no R1-USP e flashcards de erro" },
          { id: "sono", titulo: "Higiene do Sono & Repouso Restaurador", inicio: "22:30", fim: "06:00", categoria: "recuperacao", status: "pendente", essencial: true, nota: "Desligar telas às 22:00" }
        ];
      case 2: // Terça-feira
        return [
          { id: "internato_m", titulo: "Internato: Enfermaria / Ambulatório", inicio: "07:00", fim: "12:00", categoria: "clinico", status: "pendente", essencial: true, nota: "" },
          { id: "cochilo", titulo: "Almoço & Cochilo Estratégico (25 min)", inicio: "12:00", fim: "13:30", categoria: "recuperacao", status: "pendente", essencial: true, nota: "Reset cognitivo" },
          { id: "internato_t", titulo: "Internato: Visita Clínica / Prática", inicio: "13:30", fim: "17:00", categoria: "clinico", status: "pendente", essencial: true, nota: "" },
          { id: "treino", titulo: "Musculação: Inferior A (Pernas foco Quadríceps)", inicio: "17:30", fim: "19:00", categoria: "treino", status: "pendente", essencial: false, nota: "Sobrecarga progressiva" },
          { id: "jantar", titulo: "Jantar & Descompressão", inicio: "19:00", fim: "20:00", categoria: "lifestyle", status: "pendente", essencial: false, nota: "" },
          { id: "estudo", titulo: "Imersão MedQuest & Anki (Questões Ativas)", inicio: "20:00", fim: "21:30", categoria: "estudo", status: "pendente", essencial: true, nota: "Revisão espaçada ativa" },
          { id: "sono", titulo: "Higiene do Sono & Repouso Restaurador", inicio: "22:30", fim: "06:00", categoria: "recuperacao", status: "pendente", essencial: true, nota: "" }
        ];
      case 3: // Quarta-feira
        return [
          { id: "internato_m", titulo: "Internato: Enfermaria / Ambulatório", inicio: "07:00", fim: "12:00", categoria: "clinico", status: "pendente", essencial: true, nota: "" },
          { id: "cochilo", titulo: "Almoço & Cochilo Estratégico (25 min)", inicio: "12:00", fim: "13:30", categoria: "recuperacao", status: "pendente", essencial: true, nota: "Pausa restauradora" },
          { id: "internato_t", titulo: "Internato: Especialidades / Prática", inicio: "13:30", fim: "17:00", categoria: "clinico", status: "pendente", essencial: true, nota: "" },
          { id: "treino", titulo: "Descanso da Academia (Recuperação Biológica)", inicio: "17:30", fim: "17:30", categoria: "treino", status: "descanso", essencial: false, nota: "Dia sem musculação" },
          { id: "estudo", titulo: "Imersão MedQuest 2h (Intensivo Grandes Temas)", inicio: "17:30", fim: "19:30", categoria: "estudo", status: "pendente", essencial: true, nota: "Bloco estendido de questões" },
          { id: "jantar", titulo: "Jantar & Hidratação", inicio: "19:30", fim: "20:30", categoria: "lifestyle", status: "pendente", essencial: false, nota: "" },
          { id: "hobby", titulo: "Violão & Inglês Ativo (Descompressão Criativa)", inicio: "20:30", fim: "21:30", categoria: "lifestyle", status: "pendente", essencial: false, nota: "Prática leve e relaxante" },
          { id: "sono", titulo: "Higiene do Sono & Repouso Restaurador", inicio: "22:30", fim: "06:00", categoria: "recuperacao", status: "pendente", essencial: true, nota: "" }
        ];
      case 4: // Quinta-feira
        return [
          { id: "internato_m", titulo: "Internato: Enfermaria / Emergência", inicio: "07:00", fim: "12:00", categoria: "clinico", status: "pendente", essencial: true, nota: "" },
          { id: "cochilo", titulo: "Almoço & Cochilo Estratégico (25 min)", inicio: "12:00", fim: "13:30", categoria: "recuperacao", status: "pendente", essencial: true, nota: "" },
          { id: "internato_t", titulo: "Internato: Prática / Discussão de Casos", inicio: "13:30", fim: "17:00", categoria: "clinico", status: "pendente", essencial: true, nota: "" },
          { id: "treino", titulo: "Musculação: Superior B (Costas/Peito/Braços)", inicio: "17:30", fim: "19:00", categoria: "treino", status: "pendente", essencial: false, nota: "" },
          { id: "jantar", titulo: "Jantar & Descompressão", inicio: "19:00", fim: "20:00", categoria: "lifestyle", status: "pendente", essencial: false, nota: "" },
          { id: "estudo", titulo: "Imersão MedQuest & Anki (Questões Ativas)", inicio: "20:00", fim: "21:30", categoria: "estudo", status: "pendente", essencial: true, nota: "" },
          { id: "sono", titulo: "Higiene do Sono & Repouso Restaurador", inicio: "22:30", fim: "06:00", categoria: "recuperacao", status: "pendente", essencial: true, nota: "" }
        ];
      case 5: // Sexta-feira
        return [
          { id: "internato_m", titulo: "Internato: Enfermaria / Ambulatório", inicio: "07:00", fim: "12:00", categoria: "clinico", status: "pendente", essencial: true, nota: "" },
          { id: "cochilo", titulo: "Almoço & Cochilo Estratégico (25 min)", inicio: "12:00", fim: "13:30", categoria: "recuperacao", status: "pendente", essencial: true, nota: "" },
          { id: "internato_t", titulo: "Internato: Fechamento de Casos da Semana", inicio: "13:30", fim: "17:00", categoria: "clinico", status: "pendente", essencial: true, nota: "" },
          { id: "treino", titulo: "Musculação: Inferior B (Posterior/Glúteos)", inicio: "17:30", fim: "19:00", categoria: "treino", status: "pendente", essencial: false, nota: "" },
          { id: "estudo", titulo: "MedQuest Flash: Revisão de Cards Críticos", inicio: "19:00", fim: "20:00", categoria: "estudo", status: "pendente", essencial: true, nota: "Sessão focada" },
          { id: "pessoal", titulo: "Tempo de Qualidade / Namorada / Lazer", inicio: "20:00", fim: "23:00", categoria: "pessoal", status: "pendente", essencial: false, nota: "Presença plena" },
          { id: "sono", titulo: "Sono Restaurador", inicio: "23:30", fim: "07:30", categoria: "recuperacao", status: "pendente", essencial: true, nota: "" }
        ];
      case 6: // Sábado
        return [
          { id: "estudo", titulo: "Teoria Nobre & Questões de Alta Dificuldade", inicio: "08:00", fim: "12:20", categoria: "estudo", status: "pendente", essencial: true, nota: "Imersão teórica" },
          { id: "almoco", titulo: "Almoço em Família / Descompressão", inicio: "12:30", fim: "14:00", categoria: "lifestyle", status: "pendente", essencial: false, nota: "" },
          { id: "hobby", titulo: "Prática de Violão & Leitura / Inglês", inicio: "14:30", fim: "17:00", categoria: "lifestyle", status: "pendente", essencial: false, nota: "" },
          { id: "treino", titulo: "Treino Livre / Aeróbico Leve", inicio: "17:30", fim: "19:00", categoria: "treino", status: "pendente", essencial: false, nota: "Caminhada ou corrida leve" },
          { id: "pessoal", titulo: "Tempo Livre / Cinema / Lazer", inicio: "19:30", fim: "23:00", categoria: "pessoal", status: "pendente", essencial: false, nota: "" },
          { id: "sono", titulo: "Sono Restaurador", inicio: "23:30", fim: "07:30", categoria: "recuperacao", status: "pendente", essencial: true, nota: "" }
        ];
      case 0: // Domingo
        return [
          { id: "estudo", titulo: "Simulado Semanal R1-USP / Revisão de Erros", inicio: "08:00", fim: "12:20", categoria: "estudo", status: "pendente", essencial: true, nota: "Simulação de prova e erros" },
          { id: "almoco", titulo: "Almoço em Família / Descanso Pleno", inicio: "12:30", fim: "15:00", categoria: "lifestyle", status: "pendente", essencial: false, nota: "" },
          { id: "lazer", titulo: "Descompressão / Natureza / Hobbies", inicio: "16:00", fim: "18:00", categoria: "lifestyle", status: "pendente", essencial: false, nota: "" },
          { id: "planejamento", titulo: "Planejamento Estratégico da Próxima Semana", inicio: "20:00", fim: "20:45", categoria: "lifestyle", status: "pendente", essencial: true, nota: "Escala e metas" },
          { id: "sono_preparo", titulo: "Higiene do Sono & Desaceleração de Telas", inicio: "21:30", fim: "22:30", categoria: "recuperacao", status: "pendente", essencial: true, nota: "" },
          { id: "sono", titulo: "Repouso Restaurador para Segunda-feira", inicio: "22:30", fim: "06:00", categoria: "recuperacao", status: "pendente", essencial: true, nota: "" }
        ];
      default:
        return [];
    }
  },

  obterGradePosPlantao: function(tituloPlantao) {
    var tit = tituloPlantao ? " (" + tituloPlantao + ")" : "";
    return [
      { id: "sono_recuperacao", titulo: "Sono de Recuperação Pós-Plantão (4-6h ininterruptas)" + tit, inicio: "08:00", fim: "14:00", categoria: "recuperacao", status: "pendente", essencial: true, nota: "Protocolo Anti-Burnout: quarto escuro e silencioso" },
      { id: "refeicao_hidratacao", titulo: "Hidratação Abundante & Refeição Nutritiva Leve", inicio: "14:00", fim: "15:30", categoria: "lifestyle", status: "pendente", essencial: true, nota: "Reposição hidroeletrolítica" },
      { id: "repouso_cognitivo", titulo: "Descompressão Neurobiológica (Sem telas ou esforço)", inicio: "15:30", fim: "18:00", categoria: "recuperacao", status: "pendente", essencial: true, nota: "Treino pesado suspenso para proteção física" },
      { id: "revisao_leve", titulo: "Revisão Leve / Dúvidas Clínicas do Plantão (Opcional)", inicio: "18:00", fim: "19:30", categoria: "estudo", status: "pendente", essencial: false, nota: "Opcional se desejar registrar condutas" },
      { id: "sono_noturno", titulo: "Higiene do Sono & Ritmo Circadiano", inicio: "21:30", fim: "06:00", categoria: "recuperacao", status: "pendente", essencial: true, nota: "Sono de consolidação" }
    ];
  },

  obterGradePlantaoHoje: function(diaSemanaNum, statusPlantao) {
    var grade = RotinaService.obterGradeBase(diaSemanaNum);
    var tz = (typeof ConfigService !== "undefined" && ConfigService.get) ? ConfigService.get("TIMEZONE", "America/Sao_Paulo") : "America/Sao_Paulo";
    var hIni = statusPlantao.horarioInicio ? Utilities.formatDate(statusPlantao.horarioInicio, tz, "HH:mm") : "19:00";
    var hFim = statusPlantao.horarioFim ? Utilities.formatDate(statusPlantao.horarioFim, tz, "HH:mm") : "07:00";
    var tit = statusPlantao.tituloPlantao || "Turno de Plantão Hospitalar";

    var filtrados = grade.filter(function(b) {
      if (b.categoria === "treino") return false;
      return true;
    });

    filtrados.push({
      id: "plantao_ativo",
      titulo: "🚨 " + tit,
      inicio: hIni,
      fim: hFim,
      categoria: "clinico",
      status: "pendente",
      essencial: true,
      nota: "Foco nos pacientes e suporte da Sala Vermelha"
    });

    return filtrados;
  },

  obterBlocosSalvos: function(dataRef) {
    var dataISO = RotinaService.normalizarDataISO(dataRef);
    var chave = RotinaService.PREFIXO_PROP + dataISO;
    try {
      if (typeof PropertiesService !== "undefined" && PropertiesService.getScriptProperties) {
        var prop = PropertiesService.getScriptProperties().getProperty(chave);
        if (prop) {
          var parsed = JSON.parse(prop);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch (e) {
      Logger.log("Erro ao ler override de rotina: " + e.message);
    }
    return null;
  },

  salvarBlocosDoDia: function(dataRef, blocos) {
    var dataISO = RotinaService.normalizarDataISO(dataRef);
    var chave = RotinaService.PREFIXO_PROP + dataISO;
    var json = JSON.stringify(blocos);
    try {
      if (typeof PropertiesService !== "undefined" && PropertiesService.getScriptProperties) {
        PropertiesService.getScriptProperties().setProperty(chave, json);
        return true;
      }
    } catch (e) {
      Logger.log("Erro ao salvar override de rotina: " + e.message);
    }
    return false;
  },

  resetarBlocosDoDia: function(dataRef) {
    var dataISO = RotinaService.normalizarDataISO(dataRef);
    var chave = RotinaService.PREFIXO_PROP + dataISO;
    try {
      if (typeof PropertiesService !== "undefined" && PropertiesService.getScriptProperties) {
        PropertiesService.getScriptProperties().deleteProperty(chave);
        return true;
      }
    } catch (e) {
      Logger.log("Erro ao resetar rotina: " + e.message);
    }
    return false;
  },

  obterBlocosDoDia: function(dataRef) {
    var ref = dataRef ? (dataRef instanceof Date ? dataRef : new Date(dataRef)) : new Date();
    if (isNaN(ref.getTime())) ref = new Date();

    var salvos = RotinaService.obterBlocosSalvos(ref);
    if (salvos) return salvos;

    var stPl = typeof detectarPlantaoStatus === "function" ? detectarPlantaoStatus(ref) : { ehPlantaoHoje: false, ehPosPlantao: false };
    if (stPl && stPl.ehPosPlantao) {
      return RotinaService.obterGradePosPlantao(stPl.tituloPlantao);
    }
    if (stPl && stPl.ehPlantaoHoje && stPl.horarioInicio) {
      return RotinaService.obterGradePlantaoHoje(ref.getDay(), stPl);
    }

    return RotinaService.obterGradeBase(ref.getDay());
  },

  marcarStatusBloco: function(dataRef, blocoId, novoStatus, nota) {
    var blocos = RotinaService.obterBlocosDoDia(dataRef);
    var modificado = false;
    for (var i = 0; i < blocos.length; i++) {
      if (blocos[i].id === blocoId || (blocoId && blocos[i].titulo.toLowerCase().indexOf(blocoId.toLowerCase()) !== -1)) {
        blocos[i].status = novoStatus;
        if (nota) blocos[i].nota = nota;
        modificado = true;
        break;
      }
    }
    if (modificado) {
      RotinaService.salvarBlocosDoDia(dataRef, blocos);
    }
    return { sucesso: modificado, blocos: blocos };
  },

  aplicarInstrucao: function(dataRef, textoInstrucao) {
    var instrucao = (textoInstrucao || "").trim();
    if (!instrucao) {
      return { sucesso: false, mensagem: "Instrução de rotina vazia.", blocos: RotinaService.obterBlocosDoDia(dataRef) };
    }

    var instLower = instrucao.toLowerCase();

    // 1. Reset para o padrão
    if (/(?:reset|resetar|restaurar|voltar\s+ao\s+padr[aã]o|grade\s+padr[aã]o|padr[aã]o)/i.test(instLower)) {
      RotinaService.resetarBlocosDoDia(dataRef);
      var blocosPadrao = RotinaService.obterBlocosDoDia(dataRef);
      return {
        sucesso: true,
        acao: "reset",
        mensagem: "🔄 *Rotina restaurada com sucesso para a grade padrão de hoje!*",
        blocos: blocosPadrao
      };
    }

    var blocos = RotinaService.obterBlocosDoDia(dataRef);
    var alterado = false;
    var resumoAcao = "";

    // 2. Ativar descanso geral de treino
    if (/(?:modo\s+)?descanso(?:\s+total|\s+hoje)?|dia\s+de\s+descanso|hoje\s+([eé]|vai\s+ser)\s+descanso/i.test(instLower)) {
      for (var i = 0; i < blocos.length; i++) {
        if (blocos[i].categoria === "treino" || blocos[i].id === "treino") {
          blocos[i].status = "descanso";
          blocos[i].nota = "Descanso total programado pelo Dr. Wagner";
          alterado = true;
        }
      }
      resumoAcao = "💤 *Modo descanso ativado hoje!* Treino suspenso para recuperação fisiológica.";
    }

    // 3. Cancelamento ou pulo de treino
    else if (/(?:n[aã]o\s+vou|sem|cancel(?:ar?|e|ado)?|tirar?|pular?)\s+(?:trein(?:ar?|o)|academia|muscula[çc][aã]o)/i.test(instLower)) {
      for (var it = 0; it < blocos.length; it++) {
        if (blocos[it].categoria === "treino" || blocos[it].id === "treino") {
          blocos[it].status = "pulado";
          blocos[it].nota = "Cancelado pelo Dr. Wagner";
          alterado = true;
          resumoAcao = "🚫 *Treino de hoje cancelado.* Foco nas demais metas do dia.";
          break;
        }
      }
    }

    // 4. Cancelamento ou pulo de estudo / MedQuest
    else if (/(?:n[aã]o\s+vou|sem|cancel(?:ar?|e|ado)?|tirar?|pular?)\s+(?:estud(?:ar?|o)|medquest|anki)/i.test(instLower)) {
      for (var ie = 0; ie < blocos.length; ie++) {
        if (blocos[ie].categoria === "estudo" || blocos[ie].id === "estudo") {
          blocos[ie].status = "pulado";
          blocos[ie].nota = "Cancelado pelo Dr. Wagner";
          alterado = true;
          resumoAcao = "🚫 *Bloco de MedQuest / Estudo pausado hoje.*";
          break;
        }
      }
    }

    // 5. Cancelamento de cochilo
    else if (/(?:sem|n[aã]o\s+vou|cancel(?:ar?|e)?|pular?)\s+(?:cochil(?:ar?|o)|soneca|power\s*nap)/i.test(instLower)) {
      for (var ic = 0; ic < blocos.length; ic++) {
        if (blocos[ic].id === "cochilo") {
          blocos[ic].status = "pulado";
          blocos[ic].nota = "Cochilo dispensado hoje";
          alterado = true;
          resumoAcao = "⚡ *Cochilo dispensado hoje.* Ritmo diurno mantido direto.";
          break;
        }
      }
    }

    // 6. Mudança de horário de treino
    var matchHoraTreino = instLower.match(/(?:trein(?:ar?|o)|academia|muscula[çc][aã]o)[^0-9]*?(?:[aà]s?|para\s+[aà]s?|das?)\s*(\d{1,2})(?:[:h](\d{2}))?/i);
    if (matchHoraTreino) {
      var hTreino = parseInt(matchHoraTreino[1], 10);
      var mTreino = matchHoraTreino[2] ? parseInt(matchHoraTreino[2], 10) : 0;
      if (hTreino >= 0 && hTreino <= 23 && mTreino >= 0 && mTreino <= 59) {
        var strIni = ("0" + hTreino).slice(-2) + ":" + ("0" + mTreino).slice(-2);
        var fimMinTotal = (hTreino * 60 + mTreino + 90) % 1440;
        var strFim = ("0" + Math.floor(fimMinTotal / 60)).slice(-2) + ":" + ("0" + (fimMinTotal % 60)).slice(-2);
        for (var iTr = 0; iTr < blocos.length; iTr++) {
          if (blocos[iTr].categoria === "treino" || blocos[iTr].id === "treino") {
            blocos[iTr].inicio = strIni;
            blocos[iTr].fim = strFim;
            blocos[iTr].status = "pendente";
            blocos[iTr].nota = "Horário reprogramado para " + strIni;
            alterado = true;
            resumoAcao = "⏰ *Treino reprogramado para:* `" + strIni + " - " + strFim + "`";
            break;
          }
        }
      }
    }

    // 7. Mudança de horário de estudo / MedQuest
    var matchHoraEstudo = instLower.match(/(?:estud(?:ar?|o)|medquest|anki)[^0-9]*?(?:[aà]s?|para\s+[aà]s?|das?)\s*(\d{1,2})(?:[:h](\d{2}))?/i);
    if (matchHoraEstudo && !alterado) {
      var hEstudo = parseInt(matchHoraEstudo[1], 10);
      var mEstudo = matchHoraEstudo[2] ? parseInt(matchHoraEstudo[2], 10) : 0;
      if (hEstudo >= 0 && hEstudo <= 23 && mEstudo >= 0 && mEstudo <= 59) {
        var strIniEst = ("0" + hEstudo).slice(-2) + ":" + ("0" + mEstudo).slice(-2);
        var fimEstMin = (hEstudo * 60 + mEstudo + 90) % 1440;
        var strFimEst = ("0" + Math.floor(fimEstMin / 60)).slice(-2) + ":" + ("0" + (fimEstMin % 60)).slice(-2);
        for (var iEs = 0; iEs < blocos.length; iEs++) {
          if (blocos[iEs].categoria === "estudo" || blocos[iEs].id === "estudo") {
            blocos[iEs].inicio = strIniEst;
            blocos[iEs].fim = strFimEst;
            blocos[iEs].status = "pendente";
            blocos[iEs].nota = "Horário reprogramado para " + strIniEst;
            alterado = true;
            resumoAcao = "⏰ *Estudo / MedQuest reprogramado para:* `" + strIniEst + " - " + strFimEst + "`";
            break;
          }
        }
      }
    }

    // 8. Troca do tipo de treino
    var matchTrocaTreino = instLower.match(/(?:troqu(?:ei|e)|mudei|fazer)\s+(?:o\s+)?treino\s+(?:por|para)\s+([^.,;]+)/i);
    if (matchTrocaTreino) {
      var novoTipo = matchTrocaTreino[1].trim();
      for (var iTp = 0; iTp < blocos.length; iTp++) {
        if (blocos[iTp].categoria === "treino" || blocos[iTp].id === "treino") {
          blocos[iTp].titulo = "🏃 " + novoTipo.charAt(0).toUpperCase() + novoTipo.slice(1);
          blocos[iTp].status = "pendente";
          blocos[iTp].nota = "Substituído a pedido do Dr. Wagner";
          alterado = true;
          resumoAcao = "🔄 *Treino modificado:* " + blocos[iTp].titulo;
          break;
        }
      }
    }

    // Fallback com Gemini caso seja texto complexo ou áudio longo
    if (!alterado && typeof chamarModeloComFallback === "function") {
      try {
        var promptAjuste = "Você é o Copiloto de Rotina e Lifestyle Médico do Dr. Wagner. O usuário enviou a seguinte instrução para ajustar a rotina de hoje:\n" +
          "\"" + instrucao + "\"\n\n" +
          "Lista atual de blocos em JSON:\n" + JSON.stringify(blocos, null, 2) + "\n\n" +
          "Retorne EXCLUSIVAMENTE um array JSON válido contendo os blocos atualizados. Não inclua markdown.";
        var respostaIA = chamarModeloComFallback(promptAjuste, { temperatura: 0.1, topP: 0.8 });
        if (respostaIA && respostaIA.texto) {
          var limpo = respostaIA.texto.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
          var blocosIA = JSON.parse(limpo);
          if (Array.isArray(blocosIA) && blocosIA.length > 0) {
            blocos = blocosIA;
            alterado = true;
            resumoAcao = "🧠 *Rotina adaptada via IA com base na sua solicitação!*";
          }
        }
      } catch (eIA) {
        Logger.log("Ajuste de rotina com IA ignorado: " + eIA.message);
      }
    }

    if (alterado) {
      RotinaService.salvarBlocosDoDia(dataRef, blocos);
      return {
        sucesso: true,
        acao: "ajuste",
        mensagem: resumoAcao || "✅ *Rotina de hoje atualizada com sucesso!*",
        blocos: blocos
      };
    } else {
      return {
        sucesso: false,
        mensagem: "⚠️ Não identifiquei alterações claras na sua instrução. Exemplos:\n• _'Hoje não vou treinar'_\n• _'Mudei o treino para 19h'_\n• _'Hoje é dia de descanso'_\n• _'Sem cochilo hoje'_\n• _'Reset' (volta ao padrão)_",
        blocos: blocos
      };
    }
  },

  formatarTimelineMarkdown: function(blocos, dataRef, tituloAdicional) {
    var ref = dataRef ? (dataRef instanceof Date ? dataRef : new Date(dataRef)) : new Date();
    if (isNaN(ref.getTime())) ref = new Date();
    var tz = (typeof ConfigService !== "undefined" && ConfigService.get) ? ConfigService.get("TIMEZONE", "America/Sao_Paulo") : "America/Sao_Paulo";
    var dataFormatada = (typeof Utilities !== "undefined" && Utilities.formatDate) ? Utilities.formatDate(ref, tz, "dd/MM/yyyy") : ref.toISOString().slice(0, 10);
    var diaSemana = typeof obterDiaSemanaExtenso === "function" ? obterDiaSemanaExtenso(ref) : "";

    var texto = "📅 *" + (diaSemana ? diaSemana + " (" + dataFormatada + ")" : dataFormatada) + "*\n";
    if (tituloAdicional) texto += "📌 " + tituloAdicional + "\n";
    texto += "\n⏱️ *TIMELINE DE HOJE:*\n";

    if (!blocos || blocos.length === 0) {
      texto += "✨ Nenhum bloco programado para este dia.\n";
      return texto;
    }

    var concluidos = 0;
    var total = blocos.length;

    for (var i = 0; i < blocos.length; i++) {
      var b = blocos[i];
      var iconeStatus = "⏳";
      var estiloTitulo = b.titulo;

      if (b.status === "concluido") {
        iconeStatus = "✅";
        concluidos++;
      } else if (b.status === "pulado" || b.status === "cancelado") {
        iconeStatus = "⏭️";
        estiloTitulo = "~" + b.titulo + "~";
      } else if (b.status === "descanso") {
        iconeStatus = "💤";
        estiloTitulo = "_" + b.titulo + "_";
      }

      texto += iconeStatus + " `" + b.inicio + " - " + b.fim + "` | *" + estiloTitulo + "*";
      if (b.nota) {
        texto += " _(" + b.nota + ")_";
      }
      texto += "\n";
    }

    var pct = Math.round((concluidos / total) * 100);
    texto += "\n📊 *Progresso do Dia:* " + concluidos + "/" + total + " blocos concluídos (" + pct + "%)";
    return texto;
  },

  construirTecladoTimeline: function(dataRef, blocos) {
    var ref = dataRef ? (dataRef instanceof Date ? dataRef : new Date(dataRef)) : new Date();
    var teclado = [];

    // Linha 1: Botões rápidos para blocos de ação do dia
    var botoesAcao = [];
    for (var i = 0; i < blocos.length; i++) {
      var b = blocos[i];
      if (b.categoria === "treino" && b.status === "pendente") {
        botoesAcao.push({ text: "✅ Treino Feito", callback_data: "rotina:check:treino" });
        botoesAcao.push({ text: "⏭️ Pular Treino", callback_data: "rotina:skip:treino" });
      } else if (b.categoria === "estudo" && b.status === "pendente" && botoesAcao.length < 2) {
        botoesAcao.push({ text: "✅ MedQuest Feito", callback_data: "rotina:check:estudo" });
      }
    }
    if (botoesAcao.length > 0) {
      teclado.push(botoesAcao);
    }

    // Linha 2: Ações de flexibilidade rápida
    teclado.push([
      { text: "✏️ Ajustar / Voz", callback_data: "rotina:ajustar" },
      { text: "💤 Modo Descanso", callback_data: "rotina:descanso" }
    ]);

    // Linha 3: Sincronização e Reset
    teclado.push([
      { text: "🔄 Restaurar Padrão", callback_data: "rotina:reset" },
      { text: "📆 Sincronizar Agenda", callback_data: "rotina:cal_sync" }
    ]);

    // Linha 4: Navegação Hoje / Amanhã
    teclado.push([
      { text: "📆 Ver Amanhã", callback_data: "rotina:ver_amanha" },
      { text: "📅 Central", callback_data: "ux:hub:rotina" }
    ]);

    return { inline_keyboard: teclado };
  },

  obterHabitosAtivosParaCheckin: function(dataRef) {
    var blocos = RotinaService.obterBlocosDoDia(dataRef);
    var habitos = {
      medquest: false,
      treino: false,
      treinoDescanso: false,
      ingles: false,
      violao: false,
      namorada: false,
      leitura: false
    };

    for (var i = 0; i < blocos.length; i++) {
      var b = blocos[i];
      var tit = b.titulo.toLowerCase();
      var id = b.id.toLowerCase();

      if (id === "estudo" || tit.indexOf("medquest") !== -1) {
        if (b.status !== "pulado") habitos.medquest = true;
      }
      if (id === "treino" || b.categoria === "treino") {
        if (b.status === "descanso") {
          habitos.treinoDescanso = true;
        } else if (b.status !== "pulado") {
          habitos.treino = true;
        }
      }
      if (tit.indexOf("inglês") !== -1 || tit.indexOf("ingles") !== -1) {
        habitos.ingles = true;
      }
      if (tit.indexOf("violão") !== -1 || tit.indexOf("violao") !== -1) {
        habitos.violao = true;
      }
      if (tit.indexOf("namorada") !== -1 || tit.indexOf("pessoal") !== -1) {
        habitos.namorada = true;
      }
      if (tit.indexOf("leitura") !== -1) {
        habitos.leitura = true;
      }
    }
    return habitos;
  },

  sincronizarComGoogleCalendar: function(dataRef, blocos) {
    try {
      if (typeof CalendarApp === "undefined" || !CalendarApp.getDefaultCalendar) {
        return { sucesso: false, erro: "CalendarApp indisponível no ambiente." };
      }
      var cal = CalendarApp.getDefaultCalendar();
      if (!cal) return { sucesso: false, erro: "Calendário padrão não encontrado." };

      var ref = dataRef ? (dataRef instanceof Date ? dataRef : new Date(dataRef)) : new Date();
      var ano = ref.getFullYear(), mes = ref.getMonth(), dia = ref.getDate();
      var lista = blocos || RotinaService.obterBlocosDoDia(ref);
      var criados = 0;

      for (var i = 0; i < lista.length; i++) {
        var b = lista[i];
        if (b.status === "pulado" || b.status === "descanso") continue;

        var pIni = b.inicio.split(":");
        var pFim = b.fim.split(":");
        var dInicio = new Date(ano, mes, dia, parseInt(pIni[0], 10), parseInt(pIni[1], 10), 0);
        var dFim = new Date(ano, mes, dia, parseInt(pFim[0], 10), parseInt(pFim[1], 10), 0);

        if (dFim.getTime() <= dInicio.getTime()) {
          dFim = new Date(dInicio.getTime() + (60 * 60 * 1000));
        }

        cal.createEvent("📍 " + b.titulo, dInicio, dFim, {
          description: "Sincronizado automaticamente pelo Ultra Rotina Adaptativo.\nStatus: " + b.status + (b.nota ? "\nNota: " + b.nota : "")
        });
        criados++;
      }
      return { sucesso: true, criados: criados };
    } catch (eCal) {
      Logger.log("Erro na sincronização da agenda: " + eCal.message);
      return { sucesso: false, erro: eCal.message };
    }
  },

  obterResumoSemanal: function() {
    var dias = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    var txt = "📊 *GRADE BASE SEMANAL (TIME-BLOCKING MÉDICO)*\n\n";
    for (var d = 1; d <= 6; d++) {
      txt += "*" + dias[d] + ":*\n";
      var grade = RotinaService.obterGradeBase(d);
      for (var i = 0; i < grade.length; i++) {
        var b = grade[i];
        txt += "  • `" + b.inicio + " - " + b.fim + "` " + b.titulo + "\n";
      }
      txt += "\n";
    }
    txt += "*Domingo:*\n";
    var gradeDom = RotinaService.obterGradeBase(0);
    for (var id = 0; id < gradeDom.length; id++) {
      var bd = gradeDom[id];
      txt += "  • `" + bd.inicio + " - " + bd.fim + "` " + bd.titulo + "\n";
    }
    txt += "\n💡 Para alterar o dia de hoje, envie: _'/rotina alterar <sua instrução>'_ ou envie um áudio!";
    return txt;
  }
};

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

  var blocos = RotinaService.obterBlocosDoDia(hoje);
  var timelineFormatada = RotinaService.formatarTimelineMarkdown(blocos, hoje);
  var treinoMsg = obterTreinoDoDia(hoje.getDay(), hoje);

  var msg = "☀️ *Bom dia, Dr. Wagner! Raio-X & Rotina Adaptativa*\n\n" +
            timelineFormatada + "\n\n" +
            "🏋️ *Foco Físico Hoje:* " + treinoMsg + "\n" +
            "💤 *Almoço:* Não esqueça do cochilo estratégico de 25 min!\n\n" +
            "📋 *Compromissos na Agenda Google:*\n" + (listaEventos || "Nenhum evento.") + "\n\n" +
            "🩺 *Ferramentas Clínicas:* `/soap`, `/rx`, `/plantao`, `/calc`, `/interacao`\n" +
            "💡 *Para ajustar:* Toque abaixo ou envie: _'Hoje treino às 19h'_ ou áudio gravado!";

  var teclado = RotinaService.construirTecladoTimeline(hoje, blocos);
  return enviarMensagemComTecladoParaChat(destino, msg, teclado);
}

function obterTreinoDoDia(diaSemanaNum, dataRef) {
  var ref = dataRef ? (dataRef instanceof Date ? dataRef : new Date(dataRef)) : new Date();
  try {
    if (typeof RotinaService !== "undefined" && RotinaService.obterBlocosDoDia) {
      var blocos = RotinaService.obterBlocosDoDia(ref);
      for (var i = 0; i < blocos.length; i++) {
        if (blocos[i].categoria === "treino" || blocos[i].id === "treino") {
          if (blocos[i].status === "pulado" || blocos[i].status === "cancelado") {
            return "🚫 *Treino de hoje cancelado* (" + (blocos[i].nota || "Descanso programado") + ")";
          }
          if (blocos[i].status === "descanso") {
            return "🌿 *DESCANSO DA ACADEMIA!* (Recuperação biológica)";
          }
          if (blocos[i].status === "concluido") {
            return "✅ *" + blocos[i].titulo + "* (Já concluído hoje!)";
          }
          return "*" + blocos[i].titulo + "*";
        }
      }
    }
  } catch (eTr) {}

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

  var habitosAtivos = RotinaService.obterHabitosAtivosParaCheckin(hoje);

  var texto = "🌙 *Check-in da Noite Adaptativo (" + dataFormatada + ")*\n\n" +
              "Toque nos botões abaixo para marcar os hábitos cumpridos hoje no seu Notion:\n" +
              (habitosAtivos.treinoDescanso ? "💡 _Hoje foi dia de descanso de academia planejado. Seu corpo agradece!_\n" : "");

  var linha1 = [];
  linha1.push({"text": "🧠 MedQuest Feito", "callback_data": "habit_medquest"});
  if (habitosAtivos.treinoDescanso) {
    linha1.push({"text": "💤 Descanso Feito", "callback_data": "habit_gym"});
  } else {
    linha1.push({"text": "🏋️ Treino Feito", "callback_data": "habit_gym"});
  }

  var linha2 = [
    {"text": "📚 Inglês Feito", "callback_data": "habit_english"},
    {"text": "🎸 Violão Feito", "callback_data": "habit_guitar"}
  ];

  var linha3 = [
    {"text": "❤️ Namorada", "callback_data": "habit_love"},
    {"text": "📖 Leitura", "callback_data": "habit_reading"}
  ];

  var linhaEnergia = [
    {"text": "🔋 1", "callback_data": "energy_1"},
    {"text": "🔋 2", "callback_data": "energy_2"},
    {"text": "🔋 3", "callback_data": "energy_3"},
    {"text": "🔋 4", "callback_data": "energy_4"},
    {"text": "🔋 5", "callback_data": "energy_5"}
  ];

  var teclado = {
    "inline_keyboard": [
      linha1,
      linha2,
      linha3,
      linhaEnergia
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

