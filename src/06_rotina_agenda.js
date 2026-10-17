/**
 * ==============================================================================
 * MÓDULO 06: CICLO DE ROTINA, BRIEFING, CHECK-IN E SENTINELA DE AGENDA
 * ==============================================================================
 */

var _dataUltimoBriefingProcessado = null;
var _dataUltimoCheckinProcessado = null;
var _dataUltimoRelatorioProcessado = null;

function jaEnviouBriefingHoje(dataHojeISO) {
  if (_dataUltimoBriefingProcessado === dataHojeISO) return true;
  try {
    var cache = CacheService.getScriptCache();
    if (cache && cache.get("briefing_enviado_" + dataHojeISO) === "true") return true;
  } catch (_) {}
  try {
    var props = PropertiesService.getScriptProperties();
    if (props && props.getProperty("ultima_data_briefing") === dataHojeISO) return true;
  } catch (_) {}
  return false;
}

function marcarBriefingEnviadoHoje(dataHojeISO) {
  _dataUltimoBriefingProcessado = dataHojeISO;
  try {
    var cache = CacheService.getScriptCache();
    if (cache) cache.put("briefing_enviado_" + dataHojeISO, "true", 86400);
  } catch (_) {}
  try {
    var props = PropertiesService.getScriptProperties();
    if (props) props.setProperty("ultima_data_briefing", dataHojeISO);
  } catch (_) {}
}

function executarCicloRotina5Min() {
  var token = ConfigService.get("TELEGRAM_BOT_TOKEN");
  var chatId = (typeof ConfigService.getPrimary === "function") ? ConfigService.getPrimary("TELEGRAM_CHAT_ID") : String(ConfigService.get("TELEGRAM_CHAT_ID") || "").split(",")[0].trim();
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
    if (!jaEnviouBriefingHoje(dataHojeISO)) {
      marcarBriefingEnviadoHoje(dataHojeISO);
      enviarBriefingMatinal(chatId, false);
    }
  }

  // B. CHECK-IN NOTURNO (21:30 até 23:59)
  if (minutos >= 1290) {
    var jaCheckin = (_dataUltimoCheckinProcessado === dataHojeISO) || (props.getProperty("ultima_data_checkin") === dataHojeISO);
    if (!jaCheckin) {
      _dataUltimoCheckinProcessado = dataHojeISO;
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
    var jaRelatorio = (_dataUltimoRelatorioProcessado === dataHojeISO) || (props.getProperty("ultima_data_relatorio") === dataHojeISO);
    if (!jaRelatorio) {
      _dataUltimoRelatorioProcessado = dataHojeISO;
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
  var chatId = (typeof ConfigService.getPrimary === "function") ? ConfigService.getPrimary("TELEGRAM_CHAT_ID") : String(ConfigService.get("TELEGRAM_CHAT_ID") || "").split(",")[0].trim();
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
  if (!token || !chatId) return;
  if (typeof ehUsuarioTitular === "function" && !ehUsuarioTitular(chatId)) return;

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

  parseDataSegura_: function(dataRef) {
    if (!dataRef) return new Date();
    if (dataRef instanceof Date) return isNaN(dataRef.getTime()) ? new Date() : dataRef;
    if (typeof dataRef === "string") {
      var match = dataRef.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        return new Date(dataRef.indexOf("T") !== -1 ? dataRef : dataRef + "T12:00:00");
      }
    }
    var d = new Date(dataRef);
    return isNaN(d.getTime()) ? new Date() : d;
  },

  normalizarDataISO: function(dataRef) {
    if (!dataRef) dataRef = new Date();
    if (typeof dataRef === "string") {
      var match = dataRef.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
    }
    var d = RotinaService.parseDataSegura_(dataRef);
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
    // Expurgo total de rotina genérica e agendas fixas:
    // Apenas a agenda sincronizada da Agenda Google é utilizada.
    return [];
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
    var tz = (typeof ConfigService !== "undefined" && ConfigService.get) ? ConfigService.get("TIMEZONE", "America/Sao_Paulo") : "America/Sao_Paulo";
    var hIni = statusPlantao.horarioInicio ? Utilities.formatDate(statusPlantao.horarioInicio, tz, "HH:mm") : "19:00";
    var hFim = statusPlantao.horarioFim ? Utilities.formatDate(statusPlantao.horarioFim, tz, "HH:mm") : "07:00";
    var tit = statusPlantao.tituloPlantao || "Turno de Plantão Hospitalar";

    return [{
      id: "plantao_ativo",
      titulo: "🚨 " + tit,
      inicio: hIni,
      fim: hFim,
      categoria: "clinico",
      status: "pendente",
      essencial: true,
      nota: "Foco nos pacientes e suporte da Sala Vermelha"
    }];
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

  importarEventosGoogleCalendar: function(dataRef) {
    var ref = RotinaService.parseDataSegura_(dataRef);
    try {
      if (typeof CalendarApp === "undefined" || !CalendarApp.getDefaultCalendar) return [];
      var cal = CalendarApp.getDefaultCalendar();
      if (!cal) return [];
      var inicioDia = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0);
      var fimDia = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59);
      var eventos = cal.getEvents(inicioDia, fimDia);
      if (!eventos || eventos.length === 0) return [];

      var tz = (typeof ConfigService !== "undefined" && ConfigService.get) ? ConfigService.get("TIMEZONE", "America/Sao_Paulo") : "America/Sao_Paulo";
      var blocos = [];
      for (var i = 0; i < eventos.length; i++) {
        var ev = eventos[i];
        if (ev.isAllDayEvent()) continue;
        var rawId = ev.getId ? String(ev.getId()) : String(i);
        var hIni = Utilities.formatDate(ev.getStartTime(), tz, "HH:mm");
        var hFim = Utilities.formatDate(ev.getEndTime(), tz, "HH:mm");
        var tit = ev.getTitle() || "Compromisso";
        var cat = "clinico";
        var titLower = tit.toLowerCase();
        if (/treino|academia|muscula|corrida|aer[oó]bico/i.test(titLower)) cat = "treino";
        else if (/medquest|anki|estudo|revis[aã]o|aula|quest[oõ]es|teoria|ingl[eê]s|english|mastologia|pediatria|cirurgia|cl[ií]nica|gineco|obstetr/i.test(titLower)) cat = "estudo";
        else if (/sono|descanso|cochilo|recupera/i.test(titLower)) cat = "recuperacao";
        else if (/plant[aã]o|ps|uti|cti|enfermaria|ambulat|internato|usf|hospital|relat[oó]rio|pgr/i.test(titLower)) cat = "clinico";
        else if (/viol[aã]o|m[uú]sica|h[aá]bito/i.test(titLower)) cat = "lifestyle";
        else cat = "lifestyle";

        var loc = (typeof ev.getLocation === "function") ? ev.getLocation() : "";

        blocos.push({
          id: "google_" + rawId,
          googleEventId: rawId,
          titulo: tit,
          inicio: hIni,
          fim: hFim,
          categoria: cat,
          status: "pendente",
          essencial: true,
          nota: loc || "Agenda Google"
        });
      }

      blocos.sort(function(a, b) {
        return (a.inicio || "").localeCompare(b.inicio || "");
      });

      return blocos;
    } catch (e) {
      Logger.log("Erro ao importar eventos do Google Calendar: " + e.message);
      return [];
    }
  },

  obterBlocosDoDia: function(dataRef) {
    var ref = RotinaService.parseDataSegura_(dataRef);

    var salvos = RotinaService.obterBlocosSalvos(ref);
    var blocosAgenda = RotinaService.importarEventosGoogleCalendar(ref);

    // Se temos eventos da agenda Google, mesclamos títulos vivos com status e horários adiados salvos
    if (blocosAgenda && blocosAgenda.length > 0) {
      if (salvos && salvos.length > 0) {
        var idsOuTitulosEncontrados = {};
        for (var i = 0; i < blocosAgenda.length; i++) {
          var b = blocosAgenda[i];
          var gIdPuro = b.googleEventId || (b.id ? b.id.replace(/^(google_|gcal_)/, "") : "");
          for (var s = 0; s < salvos.length; s++) {
            var sv = salvos[s];
            var svGIdPuro = sv.googleEventId || (sv.id ? sv.id.replace(/^(google_|gcal_)/, "") : "");
            var matchGId = gIdPuro && svGIdPuro && gIdPuro === svGIdPuro;
            var matchId = sv.id && b.id && sv.id === b.id;
            var matchTit = sv.titulo && b.titulo && sv.titulo.trim().toLowerCase() === b.titulo.trim().toLowerCase();

            if (matchGId || matchId || matchTit) {
              if (!b.googleEventId && svGIdPuro) b.googleEventId = svGIdPuro;

              // Preserva status de override se existir
              if (sv.status && sv.status !== "pendente") {
                b.status = sv.status;
              }
              // Preserva horários de override caso tenha sido adiado ou alterado localmente
              if (sv.status === "adiado" || (sv.inicio && sv.inicio !== b.inicio)) {
                if (sv.inicio) b.inicio = sv.inicio;
                if (sv.fim) b.fim = sv.fim;
              }
              if (sv.nota && sv.nota.indexOf("[Adiado") !== -1) {
                b.nota = (b.nota && b.nota !== "Agenda Google" ? b.nota + " " : "") + sv.nota;
              } else if (sv.nota && (!b.nota || b.nota === "Agenda Google")) {
                b.nota = sv.nota;
              }
              idsOuTitulosEncontrados[sv.id || sv.titulo] = true;
              break;
            }
          }
        }
        // Incorpora blocos de salvos que não vieram do Google Calendar
        for (var s = 0; s < salvos.length; s++) {
          var sv = salvos[s];
          var chaveSv = sv.id || sv.titulo;
          if (!idsOuTitulosEncontrados[chaveSv]) {
            blocosAgenda.push(sv);
          }
        }
        blocosAgenda.sort(function(a, b) {
          return (a.inicio || "").localeCompare(b.inicio || "");
        });
      }
      return blocosAgenda;
    }

    if (salvos && salvos.length > 0) return salvos;

    var stPl = typeof detectarPlantaoStatus === "function" ? detectarPlantaoStatus(ref) : { ehPlantaoHoje: false, ehPosPlantao: false };
    if (stPl && stPl.ehPosPlantao) {
      return RotinaService.obterGradePosPlantao(stPl.tituloPlantao);
    }
    if (stPl && stPl.ehPlantaoHoje && stPl.horarioInicio) {
      return RotinaService.obterGradePlantaoHoje(ref.getDay(), stPl);
    }

    // Expurgo de rotina genérica: se não há eventos na Agenda Google nem plantão, a timeline é limpa
    return [];
  },

  marcarStatusBloco: function(dataRef, blocoId, novoStatus, nota, extras) {
    var blocos = RotinaService.obterBlocosDoDia(dataRef);
    var modificado = false;
    for (var i = 0; i < blocos.length; i++) {
      if (blocos[i].id === blocoId || (blocoId && blocos[i].categoria === blocoId) || (blocoId && blocos[i].titulo.toLowerCase().indexOf(blocoId.toLowerCase()) !== -1)) {
        blocos[i].status = novoStatus;
        if (nota) blocos[i].nota = nota;
        if (extras && typeof extras.inicio === 'string' && extras.inicio.trim()) {
          blocos[i].inicio = extras.inicio.trim();
        }
        if (extras && typeof extras.fim === 'string' && extras.fim.trim()) {
          blocos[i].fim = extras.fim.trim();
        }
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

    // 1.1. Remoção ou cancelamento explícito de plantão (incluindo plantões de sniper ou testes)
    if (/(?:remover|excluir|apagar|tirar|cancelar|dispensar)\s+(?:o\s+)?(?:plant[aã]o|cobertura|sniper)/i.test(instLower) ||
        /(?:n[aã]o\s+vou|sem)\s+(?:ter\s+)?plant[aã]o/i.test(instLower)) {
      var blocosSemPlantao = [];
      var removidos = 0;
      for (var ip = 0; ip < blocos.length; ip++) {
        var bp = blocos[ip];
        var ehPlantao = bp.categoria === "plantao" ||
          (bp.id && String(bp.id).indexOf("plantao_sniper_") === 0) ||
          (bp.nota && bp.nota.indexOf("Sniper") !== -1) ||
          /plant[aã]o/i.test(bp.titulo || "");
        if (ehPlantao) {
          removidos++;
        } else {
          blocosSemPlantao.push(bp);
        }
      }
      if (removidos > 0) {
        RotinaService.salvarBlocosDoDia(dataRef, blocosSemPlantao);
        return {
          sucesso: true,
          acao: "remover_plantao",
          mensagem: "🗑️ *Plantão removido da rotina de hoje com sucesso!*",
          blocos: blocosSemPlantao
        };
      } else {
        return {
          sucesso: true,
          acao: "remover_plantao",
          mensagem: "ℹ️ *Nenhum plantão ativo encontrado na timeline de hoje.*",
          blocos: blocos
        };
      }
    }

    // 2. Ativar descanso geral de treino
    if (/(?:modo\s+)?descanso(?:\s+total|\s+hoje)?|dia\s+de\s+descanso|hoje\s+([eé]|vai\s+ser)\s+descanso/i.test(instLower)) {
      for (var i = 0; i < blocos.length; i++) {
        if (blocos[i].categoria === "treino" || blocos[i].id === "treino") {
          blocos[i].status = "descanso";
          blocos[i].nota = "Descanso total programado pelo médico(a)";
          alterado = true;
        }
      }
      resumoAcao = "💤 *Modo descanso ativado hoje!* Treino suspenso para recuperação fisiológica.";
    }

    // 3. Cancelamento ou pulo de treino
    else if (/(?:n[aã]o\s+vou|sem|cancel(?:ar?|e|ado)?|tirar?|pular?)\s+(?:trein(?:ar?|o)|academia|muscula[çc][aã]o)/i.test(instLower)) {
      var achouTreino = false;
      for (var it = 0; it < blocos.length; it++) {
        if (blocos[it].categoria === "treino" || blocos[it].id === "treino") {
          blocos[it].status = "pulado";
          blocos[it].nota = "Cancelado pelo médico(a)";
          achouTreino = true;
          break;
        }
      }
      alterado = true;
      resumoAcao = achouTreino
        ? "🚫 *Treino de hoje cancelado.* Foco nas demais metas do dia."
        : "🚫 *Treino de hoje cancelado / sem sessão prevista.* Foco nas demais metas do dia.";
    }

    // 4. Cancelamento ou pulo de estudo / MedQuest
    else if (/(?:n[aã]o\s+vou|sem|cancel(?:ar?|e|ado)?|tirar?|pular?)\s+(?:estud(?:ar?|o)|medquest|anki)/i.test(instLower)) {
      for (var ie = 0; ie < blocos.length; ie++) {
        if (blocos[ie].categoria === "estudo" || blocos[ie].id === "estudo") {
          blocos[ie].status = "pulado";
          blocos[ie].nota = "Cancelado pelo médico(a)";
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
          blocos[iTp].nota = "Substituído a pedido do médico(a)";
          alterado = true;
          resumoAcao = "🔄 *Treino modificado:* " + blocos[iTp].titulo;
          break;
        }
      }
    }

    // Fallback com Gemini caso seja texto complexo ou áudio longo
    if (!alterado && typeof chamarModeloComFallback === "function") {
      try {
        var promptAjuste = "Você é o Copiloto de Rotina e Lifestyle Médico. O usuário enviou a seguinte instrução para ajustar a rotina de hoje:\n" +
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
      texto += "✨ *Nenhum compromisso registrado na Agenda Google hoje.*\n\n" +
        "💡 Seus eventos adicionados no Google Calendar são sincronizados automaticamente aqui.\n";
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
        botoesAcao.push({ text: "✅ Estudo Feito", callback_data: "rotina:check:estudo" });
      }
    }
    if (botoesAcao.length > 0) {
      teclado.push(botoesAcao);
    }

    // Linha 2: Ações de flexibilidade e restauração
    teclado.push([
      { text: "✏️ Ajustar / Voz", callback_data: "rotina:ajustar" },
      { text: "🔄 Restaurar Padrão", callback_data: "rotina:reset" }
    ]);

    // Linha 3: Adiamento Rápido de Blocos
    teclado.push([
      { text: "⏩ Adiar (+30m)", callback_data: "rotina:adiar:30" },
      { text: "⏩ Adiar (+1h)", callback_data: "rotina:adiar:60" }
    ]);

    // Linha 4: Sincronização Google Calendar
    teclado.push([
      { text: "📆 Sincronizar Agenda", callback_data: "rotina:cal_sync" }
    ]);

    // Linha 5: Navegação Hoje / Amanhã / Placar
    teclado.push([
      { text: "📆 Ver Amanhã", callback_data: "rotina:ver_amanha" },
      { text: "📊 Aderência Semanal", callback_data: "rotina:aderencia" }
    ]);

    // Linha 6: Retorno Contextual Padronizado Beira-Leito
    teclado.push([
      { text: "🔙 Central de Rotina", callback_data: "ux:hub:rotina" },
      { text: "🏠 Início", callback_data: "ux:hub:inicio" }
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
    var txt = "📊 *AGENDA SEMANAL SINCRONIZADA (GOOGLE CALENDAR)*\n\n";
    var agora = new Date();
    var inicioSemana = new Date(agora);
    inicioSemana.setDate(agora.getDate() - agora.getDay());
    var totalEventos = 0;

    for (var d = 0; d <= 6; d++) {
      var diaRef = new Date(inicioSemana);
      diaRef.setDate(inicioSemana.getDate() + d);
      txt += "*" + dias[d] + ":*\n";
      var blocos = RotinaService.obterBlocosDoDia(diaRef);
      if (blocos && blocos.length > 0) {
        for (var i = 0; i < blocos.length; i++) {
          var b = blocos[i];
          txt += "  • `" + b.inicio + " - " + b.fim + "` " + b.titulo + "\n";
          totalEventos++;
        }
      } else {
        txt += "  • ✨ Agenda livre / sem compromissos na Agenda Google\n";
      }
      txt += "\n";
    }

    if (totalEventos === 0) {
      txt += "💡 _Seus eventos e compromissos cadastrados no Google Calendar são sincronizados automaticamente aqui._\n";
    } else {
      txt += "💡 Para ajustar o dia de hoje, envie: _'/rotina alterar <sua instrução>'_ ou envie um áudio!";
    }
    return txt;
  },

  calcularDuracaoHorasBloco_: function(inicio, fim) {
    if (!inicio || !fim) return 1.0;
    var pI = String(inicio).split(":");
    var pF = String(fim).split(":");
    var mI = parseInt(pI[0], 10) * 60 + parseInt(pI[1] || 0, 10);
    var mF = parseInt(pF[0], 10) * 60 + parseInt(pF[1] || 0, 10);
    var diff = mF - mI;
    if (diff <= 0) diff += 1440;
    return Math.round((diff / 60) * 10) / 10;
  },

  classificarEixoBloco_: function(bloco) {
    var cat = (bloco && bloco.categoria ? String(bloco.categoria) : "").toLowerCase();
    var tit = (bloco && bloco.titulo ? String(bloco.titulo) : "").toLowerCase();
    if (cat === "estudo" || /medquest|anki|estudo|quest[õo]es|questoes|aula|revis[aã]o|revisao|teoria/i.test(tit)) {
      return "estudo";
    }
    if (cat === "plantao" || cat === "clinico" || /plant[aã]o|plantao|internato|enfermaria|usf|upa|samu|\bue\b|uti|ambulatório|ambulatorio|leito/i.test(tit)) {
      return "plantao";
    }
    if (cat === "treino" || /treino|academia|muscula|cardio|corrida/i.test(tit)) {
      return "treino";
    }
    return "habitos";
  },

  calcularAderenciaSemanal: function(dataRef) {
    var ref = RotinaService.parseDataSegura_(dataRef);

    var eixos = {
      plantao: { rotulo: "Internato / Plantão", planejados: 0, concluidos: 0, horasPlanejadas: 0, horasConcluidas: 0, taxa: 0 },
      estudo: { rotulo: "Estudo / MedQuest", planejados: 0, concluidos: 0, horasPlanejadas: 0, horasConcluidas: 0, taxa: 0 },
      treino: { rotulo: "Treino / Academia", planejados: 0, concluidos: 0, horasPlanejadas: 0, horasConcluidas: 0, taxa: 0 },
      habitos: { rotulo: "Rotina / Hábitos", planejados: 0, concluidos: 0, horasPlanejadas: 0, horasConcluidas: 0, taxa: 0 }
    };

    var dataFimISO = RotinaService.normalizarDataISO(ref);
    var dataInicioISO = "";

    // Itera pelos últimos 7 dias (D-6 até D)
    for (var i = 6; i >= 0; i--) {
      var d = new Date(ref.getTime() - (i * 86400000));
      var dISO = RotinaService.normalizarDataISO(d);
      if (!dataInicioISO) dataInicioISO = dISO;

      var blocos = RotinaService.obterBlocosDoDia(d) || [];
      for (var b = 0; b < blocos.length; b++) {
        var bloco = blocos[b];
        var eixoKey = RotinaService.classificarEixoBloco_(bloco);
        var dur = RotinaService.calcularDuracaoHorasBloco_(bloco.inicio, bloco.fim);

        eixos[eixoKey].planejados++;
        eixos[eixoKey].horasPlanejadas = Math.round((eixos[eixoKey].horasPlanejadas + dur) * 10) / 10;

        if (bloco.status === "concluido") {
          eixos[eixoKey].concluidos++;
          eixos[eixoKey].horasConcluidas = Math.round((eixos[eixoKey].horasConcluidas + dur) * 10) / 10;
        }
      }
    }

    var totalPlanejados = 0;
    var totalConcluidos = 0;
    var keys = ["plantao", "estudo", "treino", "habitos"];

    for (var k = 0; k < keys.length; k++) {
      var kName = keys[k];
      var p = eixos[kName].planejados;
      var c = eixos[kName].concluidos;
      totalPlanejados += p;
      totalConcluidos += c;
      // Previne divisão por zero (0/0 -> 0%)
      eixos[kName].taxa = p > 0 ? Math.round((c / p) * 100) : 0;
    }

    var taxaGlobal = totalPlanejados > 0 ? Math.round((totalConcluidos / totalPlanejados) * 100) : 0;
    var statusVisual = "Excelente / Consistente 🔥";
    if (taxaGlobal < 50) {
      statusVisual = "Crítico / Ajustar Rotina 🚨";
    } else if (taxaGlobal < 70) {
      statusVisual = "Regular / Atenção ⚠️";
    } else if (taxaGlobal < 85) {
      statusVisual = "Bom Desempenho ⚡";
    }

    return {
      taxaGlobal: taxaGlobal,
      totalPlanejados: totalPlanejados,
      totalConcluidos: totalConcluidos,
      horasEstudoConcluidas: eixos.estudo.horasConcluidas,
      horasPlantaoConcluidas: eixos.plantao.horasConcluidas,
      statusVisual: statusVisual,
      eixos: eixos,
      periodo: { inicio: dataInicioISO, fim: dataFimISO }
    };
  },

  somarMinutosHora_: function(horaStr, minutosSoma) {
    var partes = String(horaStr || "00:00").split(":");
    var h = parseInt(partes[0], 10) || 0;
    var m = parseInt(partes[1], 10) || 0;
    var totalMin = h * 60 + m + (parseInt(minutosSoma, 10) || 0);
    // Clamp seguro em 23:59 para nunca gerar horas inválidas (ex: 24:30)
    if (totalMin >= 1440) {
      totalMin = 1439;
    } else if (totalMin < 0) {
      totalMin = 0;
    }
    var nH = Math.floor(totalMin / 60);
    var nM = totalMin % 60;
    return ("0" + nH).slice(-2) + ":" + ("0" + nM).slice(-2);
  },

  adiarProximoBloco: function(dataRef, minutos, categoriaOuId) {
    var ref = RotinaService.parseDataSegura_(dataRef);
    var deltaMin = parseInt(minutos, 10) || 30;

    var blocos = RotinaService.obterBlocosDoDia(ref) || [];
    if (!blocos || blocos.length === 0) {
      return {
        sucesso: true,
        modificado: false,
        mensagem: "Nenhum bloco agendado para o dia de hoje.",
        bloco: null,
        blocos: []
      };
    }

    // Busca o primeiro bloco pendente/ativo ou pelo filtro
    var alvoIdx = -1;
    for (var i = 0; i < blocos.length; i++) {
      var b = blocos[i];
      if (categoriaOuId) {
        if (b.id === categoriaOuId || b.googleEventId === categoriaOuId || (b.id && b.id === "google_" + categoriaOuId) || b.categoria === categoriaOuId || (b.titulo && b.titulo.toLowerCase().indexOf(categoriaOuId.toLowerCase()) !== -1)) {
          if (b.status === "pendente" || b.status === "ativo" || b.status === "adiado") {
            alvoIdx = i;
            break;
          }
        }
      } else {
        if (b.status === "pendente" || b.status === "ativo" || b.status === "adiado") {
          alvoIdx = i;
          break;
        }
      }
    }

    if (alvoIdx === -1) {
      return {
        sucesso: true,
        modificado: false,
        mensagem: "Todos os blocos de hoje já foram concluídos ✅",
        bloco: null,
        blocos: blocos
      };
    }

    var blocoAlvo = blocos[alvoIdx];
    blocoAlvo.inicio = RotinaService.somarMinutosHora_(blocoAlvo.inicio, deltaMin);
    blocoAlvo.fim = RotinaService.somarMinutosHora_(blocoAlvo.fim, deltaMin);
    blocoAlvo.status = "adiado";
    var tagAdiado = "[Adiado +" + deltaMin + "m]";
    if (!blocoAlvo.nota || blocoAlvo.nota.indexOf(tagAdiado) === -1) {
      blocoAlvo.nota = (blocoAlvo.nota ? blocoAlvo.nota + " " : "") + tagAdiado;
    }

    RotinaService.salvarBlocosDoDia(ref, blocos);

    // Sincronização não-bloqueante e resiliente com o Google Calendar
    var sincGoogle = false;
    var rawGoogleId = blocoAlvo.googleEventId || (blocoAlvo.id ? String(blocoAlvo.id).replace(/^(google_|gcal_)/, "") : null);

    if (rawGoogleId && !/^(plantao_ativo|sono_|refeicao_|repouso_|revisao_)/.test(rawGoogleId)) {
      try {
        var dataISO = RotinaService.normalizarDataISO(ref);
        var startPayload = {
          dateTime: dataISO + "T" + blocoAlvo.inicio + ":00-03:00",
          timeZone: "America/Sao_Paulo"
        };
        var endPayload = {
          dateTime: dataISO + "T" + blocoAlvo.fim + ":00-03:00",
          timeZone: "America/Sao_Paulo"
        };
        var alteracoesGCal = {
          start: startPayload,
          end: endPayload,
          description: (blocoAlvo.nota ? blocoAlvo.nota + "\n" : "") + "Reagendado via Ultra Rotina (+" + deltaMin + "m)"
        };

        if (typeof CalendarApp !== "undefined" && CalendarApp.getDefaultCalendar) {
          var cal = CalendarApp.getDefaultCalendar();
          if (typeof cal.updateEvent === "function") {
            var resUp = cal.updateEvent(rawGoogleId, alteracoesGCal);
            if (resUp) sincGoogle = true;
          }
        }
        if (!sincGoogle && typeof GoogleCalendarService !== "undefined" && typeof GoogleCalendarService.atualizarEventoSync === "function") {
          var resGcs = GoogleCalendarService.atualizarEventoSync(rawGoogleId, alteracoesGCal);
          if (resGcs) sincGoogle = true;
        }
      } catch (eGCal) {
        Logger.log("Aviso: Sincronização de adiamento no Google Calendar ignorada: " + eGCal.message);
      }
    }

    var msgFinal = "⏩ Bloco *" + blocoAlvo.titulo + "* adiado em +" + deltaMin + "m (" + blocoAlvo.inicio + " - " + blocoAlvo.fim + ")";
    if (sincGoogle) {
      msgFinal += " 🗓️ _(Sincronizado no Google Calendar)_";
    }

    return {
      sucesso: true,
      modificado: true,
      sincronizadoGoogle: sincGoogle,
      mensagem: msgFinal,
      bloco: blocoAlvo,
      blocos: blocos
    };
  }
};

function enviarBriefingMatinal(chatIdDestino, forcar, messageId) {
  var destino = chatIdDestino || ((typeof ConfigService.getPrimary === "function") ? ConfigService.getPrimary("TELEGRAM_CHAT_ID") : String(ConfigService.get("TELEGRAM_CHAT_ID") || "").split(",")[0].trim());
  if (typeof ehUsuarioTitular === "function" && !ehUsuarioTitular(destino)) {
    if (forcar && typeof enviarTelaBot === "function") {
      return enviarTelaBot(destino, "🔒 *Recurso Restrito ao Titular*\n\nNotificações de agenda e rotina são exclusivas do administrador da conta.", (typeof botoesBot === "function" ? botoesBot([[['🏠 Início', 'ux:hub:inicio']]]) : {}), messageId);
    }
    return false;
  }
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
  var hoje = new Date();
  var dataHojeISO = Utilities.formatDate(hoje, tz, "yyyy-MM-dd");

  if (!forcar && jaEnviouBriefingHoje(dataHojeISO)) {
    Logger.log("[Briefing] Raio-X matinal já enviado hoje (" + dataHojeISO + "). Bloqueio idempotente ativo.");
    return false;
  }

  marcarBriefingEnviadoHoje(dataHojeISO);
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
      "👉 Caso contrário: Bom descanso, " + ((typeof obterNomeTratamentoUsuario === "function") ? obterNomeTratamentoUsuario(destino) : "Doutor(a)") + "! Sua mente descansada salva vidas amanhã.";
    var kbPosPlantao = {
      inline_keyboard: [
        [{ text: "🔙 Central de Rotina", callback_data: "ux:hub:rotina" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    };
    if (messageId && typeof enviarTelaBot === "function") {
      return enviarTelaBot(destino, msgPos, kbPosPlantao, messageId);
    }
    return enviarMensagemComTecladoParaChat(destino, msgPos, kbPosPlantao);
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
  var nomeBomDia = (typeof obterNomeTratamentoUsuario === "function") ? obterNomeTratamentoUsuario(destino) : "Doutor(a)";

  var msg = "☀️ *Bom dia, " + nomeBomDia + "! Raio-X & Rotina Adaptativa*\n\n" +
            timelineFormatada + "\n\n" +
            "🏋️ *Foco Físico Hoje:* " + treinoMsg + "\n\n" +
            "🩺 *Ferramentas Clínicas:* `/soap`, `/rx`, `/plantao`, `/calc`, `/interacao`\n" +
            "💡 *Para ajustar:* Toque abaixo ou envie: _'Hoje treino às 19h'_ ou áudio gravado!";

  var teclado = RotinaService.construirTecladoTimeline(hoje, blocos);
  if (messageId && typeof enviarTelaBot === "function") {
    return enviarTelaBot(destino, msg, teclado, messageId);
  }
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

  return "🧘 *Conforme compromissos da Agenda Google* (Sem treino fixo registrado)";
}

function enviarCheckinNoturno(chatIdDestino, messageId) {
  var destino = chatIdDestino || ((typeof ConfigService.getPrimary === "function") ? ConfigService.getPrimary("TELEGRAM_CHAT_ID") : String(ConfigService.get("TELEGRAM_CHAT_ID") || "").split(",")[0].trim());
  if (typeof ehUsuarioTitular === "function" && !ehUsuarioTitular(destino)) {
    if (typeof enviarTelaBot === "function") {
      return enviarTelaBot(destino, "🔒 *Recurso Restrito ao Titular*\n\nO check-in de hábitos e rotina é exclusivo do administrador da conta.", (typeof botoesBot === "function" ? botoesBot([[['🏠 Início', 'ux:hub:inicio']]]) : {}), messageId);
    }
    return false;
  }
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
  var hoje = new Date();
  var dataFormatada = Utilities.formatDate(hoje, tz, "dd/MM");

  var habitosAtivos = RotinaService.obterHabitosAtivosParaCheckin(hoje);

  var texto = "🌙 *Check-in da Noite Adaptativo (" + dataFormatada + ")*\n\n" +
              "Toque nos botões abaixo para marcar os hábitos cumpridos hoje:\n" +
              (habitosAtivos.treinoDescanso ? "💡 _Hoje foi dia de descanso de academia planejado. Seu corpo agradece!_\n" : "");

  var linha1 = [];
  linha1.push({"text": "🧠 MedQuest Feito", "callback_data": "habit_medquest"});
  if (habitosAtivos.treinoDescanso) {
    linha1.push({"text": "💤 Descanso Feito", "callback_data": "habit_gym"});
  } else {
    linha1.push({"text": "🏋️ Treino Feito", "callback_data": "habit_gym"});
  }

  // Linhas adaptativas: APENAS exibe os hábitos que realmente estavam programados na timeline do dia!
  var linhasHabitosDinamicos = [];
  var linhaDinamicaAtual = [];

  if (habitosAtivos.ingles) {
    linhaDinamicaAtual.push({"text": "📚 Inglês Feito", "callback_data": "habit_english"});
  }
  if (habitosAtivos.violao) {
    linhaDinamicaAtual.push({"text": "🎸 Violão Feito", "callback_data": "habit_guitar"});
    if (linhaDinamicaAtual.length === 2) {
      linhasHabitosDinamicos.push(linhaDinamicaAtual);
      linhaDinamicaAtual = [];
    }
  }
  if (habitosAtivos.namorada) {
    linhaDinamicaAtual.push({"text": "❤️ Namorada", "callback_data": "habit_love"});
    if (linhaDinamicaAtual.length === 2) {
      linhasHabitosDinamicos.push(linhaDinamicaAtual);
      linhaDinamicaAtual = [];
    }
  }
  if (habitosAtivos.leitura) {
    linhaDinamicaAtual.push({"text": "📖 Leitura", "callback_data": "habit_reading"});
    if (linhaDinamicaAtual.length === 2) {
      linhasHabitosDinamicos.push(linhaDinamicaAtual);
      linhaDinamicaAtual = [];
    }
  }
  if (linhaDinamicaAtual.length > 0) {
    linhasHabitosDinamicos.push(linhaDinamicaAtual);
  }

  var linhaEnergia = [
    {"text": "🔋 1", "callback_data": "energy_1"},
    {"text": "🔋 2", "callback_data": "energy_2"},
    {"text": "🔋 3", "callback_data": "energy_3"},
    {"text": "🔋 4", "callback_data": "energy_4"},
    {"text": "🔋 5", "callback_data": "energy_5"}
  ];

  var linhaNav = [
    {"text": "🔙 Central de Rotina", "callback_data": "ux:hub:rotina"},
    {"text": "🏠 Início", "callback_data": "ux:hub:inicio"}
  ];

  var matrixTeclado = [linha1];
  for (var ld = 0; ld < linhasHabitosDinamicos.length; ld++) {
    matrixTeclado.push(linhasHabitosDinamicos[ld]);
  }
  matrixTeclado.push(linhaEnergia);
  matrixTeclado.push(linhaNav);

  var teclado = {
    "inline_keyboard": matrixTeclado
  };

  if (messageId && typeof enviarTelaBot === "function") {
    return enviarTelaBot(destino, texto, teclado, messageId);
  }
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
function consultarEventosAgenda(dataAlvoStr, chatIdDestino, messageId) {
  var destino = chatIdDestino || ((typeof ConfigService.getPrimary === "function") ? ConfigService.getPrimary("TELEGRAM_CHAT_ID") : String(ConfigService.get("TELEGRAM_CHAT_ID") || "").split(",")[0].trim());
  if (typeof ehUsuarioTitular === "function" && !ehUsuarioTitular(destino)) {
    var txtBloqueio = "🔒 *Recurso Restrito ao Titular*\n\nA consulta de eventos da agenda é exclusiva do administrador da conta.";
    if (typeof enviarTelaBot === "function") {
      return enviarTelaBot(destino, txtBloqueio, (typeof botoesBot === "function" ? botoesBot([[['🏠 Início', 'ux:hub:inicio']]]) : {}), messageId);
    }
    return (typeof enviarMensagemParaChat === "function") ? enviarMensagemParaChat(destino, txtBloqueio) : false;
  }
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
  var agora = new Date();

  var ehAmanha = (dataAlvoStr || "").toLowerCase().indexOf("amanh") !== -1;
  var dataAlvo = agora;
  if (ehAmanha) {
    dataAlvo = new Date(agora.getTime() + 86400000);
  }

  var diaFormatado = Utilities.formatDate(dataAlvo, tz, "dd/MM/yyyy");
  var diaSemana = (typeof obterDiaSemanaExtenso === "function") ? obterDiaSemanaExtenso(dataAlvo) : "";

  var kbAgenda = {
    inline_keyboard: [
      ehAmanha
        ? [{ text: "📆 Ver Agenda de Hoje", callback_data: "ux:rotina:agenda" }]
        : [{ text: "📆 Ver Agenda de Amanhã", callback_data: "ux:rotina:agenda_amanha" }],
      [
        { text: "🔙 Central de Rotina", callback_data: "ux:hub:rotina" },
        { text: "🏠 Início", callback_data: "ux:hub:inicio" }
      ]
    ]
  };

  var cal = (typeof CalendarApp !== "undefined" && CalendarApp.getDefaultCalendar) ? CalendarApp.getDefaultCalendar() : null;
  if (!cal) {
    var msgSemCal = "⚠️ *Calendário do Google não acessível no momento.*\n\nVerifique as permissões de acesso à nuvem Google Calendar.";
    if (messageId && typeof enviarTelaBot === "function") return enviarTelaBot(destino, msgSemCal, kbAgenda, messageId);
    return enviarMensagemComTecladoParaChat(destino, msgSemCal, kbAgenda);
  }

  var inicioDia = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate(), 0, 0, 0);
  var fimDia = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate(), 23, 59, 59);
  var eventos = cal.getEvents(inicioDia, fimDia);

  var rotulo = ehAmanha ? "AMANHÃ" : "HOJE";
  var msg = "📆 *AGENDA DE " + rotulo + " (" + diaSemana + ", " + diaFormatado + "):*\n\n";

  if (!eventos || eventos.length === 0) {
    msg += "✨ Nenhum compromisso agendado para este dia! Tempo livre ou escala de estudo flexível.\n\n" +
      "💡 *Para agendar:* Envie por texto ou áudio: _'Marcar plantão amanhã 07:00 às 19:00 no HC'_.";
    if (messageId && typeof enviarTelaBot === "function") return enviarTelaBot(destino, msg, kbAgenda, messageId);
    return enviarMensagemComTecladoParaChat(destino, msg, kbAgenda);
  }

  for (var i = 0; i < eventos.length; i++) {
    var ev = eventos[i];
    if (ev.isAllDayEvent()) {
      msg += "🌟 *Dia Todo:* " + ev.getTitle() + "\n";
      continue;
    }
    var hIni = Utilities.formatDate(ev.getStartTime(), tz, "HH:mm");
    var hFim = Utilities.formatDate(ev.getEndTime(), tz, "HH:mm");
    var loc = (typeof ev.getLocation === "function") ? ev.getLocation() : "";

    msg += (i + 1) + ") `" + hIni + " - " + hFim + "` | *" + ev.getTitle() + "*\n";
    if (loc) msg += "   📍 " + loc + "\n";
  }

  msg += "\n💡 *Para agendar:* Envie por texto ou áudio: _'Marcar plantão amanhã 07:00 às 19:00 no HC'_.";
  if (messageId && typeof enviarTelaBot === "function") {
    return enviarTelaBot(destino, msg, kbAgenda, messageId);
  }
  return enviarMensagemComTecladoParaChat(destino, msg, kbAgenda);
}

/**
 * Fechamento e Passagem de Plantão (/plantao_fim)
 * Determinístico em 0ms com resumo da enfermaria e botão de cópia rápida
 */
function gerarResumoFimPlantao(chatIdDestino, messageId) {
  var destino = chatIdDestino || ((typeof ConfigService.getPrimary === "function") ? ConfigService.getPrimary("TELEGRAM_CHAT_ID") : String(ConfigService.get("TELEGRAM_CHAT_ID") || "").split(",")[0].trim());
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
  var agora = new Date();
  var horaAgora = Utilities.formatDate(agora, tz, "HH:mm");
  var dataFormatada = Utilities.formatDate(agora, tz, "dd/MM/yyyy");

  var resumoCenso = "";
  var leitosObj = (typeof EnfermariaService !== "undefined" && typeof EnfermariaService.obterTodos === "function") ? EnfermariaService.obterTodos() : {};
  var keysLeitos = Object.keys(leitosObj).sort(function(a, b) { return a.localeCompare(b, undefined, { numeric: true }); });

  var estaveis = 0, vigilancias = 0, instaveis = 0;
  var listaResumoLeitos = [];

  keysLeitos.forEach(function(id) {
    var l = leitosObj[id];
    var st = String(l.status || "").toLowerCase();
    if (st.indexOf("inst") !== -1) instaveis++;
    else if (st.indexOf("vigil") !== -1) vigilancias++;
    else estaveis++;

    var diag = l.diagnostico || l.caso || "Sem diagnóstico informado";
    var pend = l.pendencias || "";
    var linha = "• Leito " + id + " [" + (l.status || "Estável") + "]: " + diag + (pend ? " | Pend: " + pend : "");
    listaResumoLeitos.push(linha);
  });

  if (keysLeitos.length > 0) {
    resumoCenso = "🏥 *Censo da Enfermaria (" + keysLeitos.length + " leitos: 🟢 " + estaveis + " | 🟡 " + vigilancias + " | 🔴 " + instaveis + "):*\n" +
      listaResumoLeitos.slice(0, 8).join("\n") + (keysLeitos.length > 8 ? "\n... (+ " + (keysLeitos.length - 8) + " leitos)" : "") + "\n\n";
  } else {
    resumoCenso = "🏥 *Censo da Enfermaria:* Nenhum leito registrado na enfermaria no momento.\n\n";
  }

  var textoCopia = "PASSAGEM DE PLANTÃO / DEBRIEFING (" + dataFormatada + " " + horaAgora + ")\n" +
    "--------------------------------------------------\n" +
    (keysLeitos.length > 0
      ? "CENSO DA ENFERMARIA (" + keysLeitos.length + " leitos | Estáveis: " + estaveis + " | Vigilância: " + vigilancias + " | Instáveis: " + instaveis + "):\n" +
        listaResumoLeitos.join("\n") + "\n\n"
      : "CENSO: Sem leitos ativos na enfermaria.\n\n") +
    "CHECKLIST DE FECHAMENTO BEIRA-LEITO:\n" +
    "[✓] Gasometrias e exames críticos checados com conduta tomada\n" +
    "[✓] Antibióticos do dia prescritos com D.A.T e ajuste renal\n" +
    "[✓] Drogas vasoativas com vazão e metas comunicadas\n" +
    "[✓] Pendências e intercorrências da noite alinhadas\n" +
    "--------------------------------------------------\n" +
    "Passagem concluída com segurança beira-leito.";

  var cacheKey = Utilities.getUuid().replace(/-/g, "");
  try {
    var cache = (typeof uxCache === "function") ? uxCache() : CacheService.getScriptCache();
    if (cache) cache.put(cacheKey, textoCopia, 21600);
  } catch (_) {}

  var msg = "🏁 *DEBRIEFING & FECHAMENTO DE PLANTÃO (" + horaAgora + ")*\n" +
    "📅 *" + dataFormatada + "*\n\n" +
    resumoCenso +
    "📋 *Checklist de Segurança Rápido:*\n" +
    "  ▫️ Todas as gasometrias e exames críticos foram checados e condutas tomadas?\n" +
    "  ▫️ Antibióticos do dia prescritos e aprazados com D.A.T correto?\n" +
    "  ▫️ Drogas vasoativas com vazão estável e alvos de PAM/diurese comunicados?\n" +
    "  ▫️ Pendências de pareceres e exames de imagem da noite listadas?\n\n" +
    "📋 *Resumo Canônico para Passagem de Plantão:*\n" +
    "```text\n" + textoCopia + "\n```";

  var botoes = {
    inline_keyboard: [
      [{ text: "📋 Copiar Resumo do Plantão", callback_data: "ux:copiar:" + cacheKey }],
      [
        { text: "🏥 Enfermaria / SBAR", callback_data: "ux:hub:enf" },
        { text: "📊 Censo de Leitos", callback_data: "ux:painel:0" }
      ],
      [
        { text: "🔙 Central de Rotina", callback_data: "ux:hub:rotina" },
        { text: "🏠 Início", callback_data: "ux:hub:inicio" }
      ]
    ]
  };

  if (messageId && typeof enviarTelaBot === "function") {
    return enviarTelaBot(destino, msg, botoes, messageId);
  }
  return enviarMensagemComTecladoParaChat(destino, msg, botoes);
}

