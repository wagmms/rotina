/**
 * ==============================================================================
 * MÓDULO 07i: CENTRAL DE ROTINA, TIME-BLOCKING E PRODUTIVIDADE NO TELEGRAM
 * ==============================================================================
 * Centraliza e desacopla todas as interações de rotina do médico no Telegram:
 * - Hub de Navegação e Teclados de Rotina & Lifestyle Adaptativo
 * - Despacho de Comandos de Agenda, Tarefas Notion, Dúvidas MedQuest e Ciclos Diários
 * - Execução e Edição In-Place da Timeline de Time-Blocking Adaptativo
 * - Callbacks inline de conclusão, adiamento e sincronização com Google Calendar
 * ==============================================================================
 */

var TABELA_COMANDOS_ROTINA_PRODUTIVIDADE_ = {
  "/agenda": true,
  "/task": true,
  "/tarefa": true,
  "/tasks": true,
  "/duvida": true,
  "/duvidas": true,
  "/semana": true,
  "/relatorio": true,
  "/habitos": true,
  "/checkin": true,
  "/briefing": true,
  "/rotina": true,
  "/sniper": true,
  "/vagas": true,
  "/piso": true
};

/**
 * Verifica se um comando pertence à Central de Rotina e Produtividade
 */
function ehComandoRotinaOuProdutividade(comando) {
  return !!TABELA_COMANDOS_ROTINA_PRODUTIVIDADE_[comando];
}

/**
 * Constrói o teclado inline para o Hub de Rotina e Produtividade
 */
function construirTecladoHubRotina() {
  return {
    "inline_keyboard": [
      [
        {"text": "📅 Agenda Hoje", "callback_data": "rotina_agenda"},
        {"text": "⏱️ Time-Blocking Hoje", "callback_data": "rotina_timeline"}
      ],
      [
        {"text": "☀️ Briefing Matinal", "callback_data": "rotina_briefing"},
        {"text": "🌙 Check-in Noturno", "callback_data": "rotina_checkin"}
      ],
      [
        {"text": "📊 Relatório Semanal", "callback_data": "rotina_semana"},
        {"text": "📊 Aderência Semanal", "callback_data": "rotina:aderencia"}
      ],
      [
        {"text": "🎯 Sniper de Plantões (WhatsApp)", "callback_data": "sniper:painel"}
      ],
      [
        {"text": "🏠 Início", "callback_data": "ux:hub:inicio"}
      ]
    ]
  };
}

/**
 * Despachador modular de comandos de Rotina, Agenda, Notion e Ciclos Diários
 */
function despacharComandosRotinaEProdutividade(comando, texto, chatId, message) {
  if (!TABELA_COMANDOS_ROTINA_PRODUTIVIDADE_[comando]) {
    return { tratado: false };
  }

  // Validação estrita de autorização do titular
  if (typeof ehUsuarioTitular === "function" && !ehUsuarioTitular(chatId)) {
    return {
      tratado: true,
      resultado: enviarMensagemParaChat(chatId, "🔒 *Recurso Restrito ao Titular*\n\nEste recurso (Notion, Agenda e Rotina pessoal) é exclusivo do administrador da conta.\n\n💡 Use o /menu para acessar calculadoras, condutas, guias de diluição HSL e consultas clínicas.")
    };
  }

  var res = null;

  if (comando === "/agenda") {
    var paramAgenda = (texto || "").replace(/^\/agenda\s*/i, "").trim();
    res = (typeof consultarEventosAgenda === "function") ? consultarEventosAgenda(paramAgenda, chatId) : false;
  } else if (comando === "/sniper" || comando === "/vagas" || comando === "/piso") {
    var argSniper = (comando === "/piso")
      ? ("piso " + (texto || "").replace(/^\/piso\s*/i, "").trim())
      : (texto || "").replace(/^\/(sniper|vagas)\s*/i, "").trim();
    res = (typeof tratarComandoSniperPlantoes === "function") ? tratarComandoSniperPlantoes(chatId, argSniper) : false;
  } else if (comando === "/task" || comando === "/tarefa") {
    var tarefaTexto = (texto || "").replace(/^\/(task|tarefa)\s*/i, "").trim();
    if (!tarefaTexto) {
      res = enviarMensagemParaChat(chatId, "📋 Digite a tarefa a salvar no Inbox do Notion. Ex: `/task Revisar hemograma do leito 14`");
    } else {
      var okTask = (typeof criarTarefaNotion === "function") ? criarTarefaNotion(tarefaTexto, "Personal", "2 · Important", "Captura rápida via Telegram") : false;
      if (okTask) {
        res = enviarMensagemParaChat(chatId, "✅ *Tarefa salva no Inbox do Notion Tasks!*");
      } else {
        enviarMensagemParaChat(chatId, "❌ Falha ao salvar no Notion. O pedido foi preservado na fila local ou verifique o token.");
        res = false;
      }
    }
  } else if (comando === "/tasks") {
    res = (typeof listarTarefasHojeNotion === "function") ? listarTarefasHojeNotion(chatId) : false;
  } else if (comando === "/duvidas") {
    res = (typeof listarDuvidasMedQuest === "function") ? listarDuvidasMedQuest(chatId) : false;
  } else if (comando === "/duvida") {
    var duvidaTexto = (texto || "").replace(/^\/duvida\s*/i, "").trim();
    if (!duvidaTexto || duvidaTexto.toLowerCase() === "listar") {
      res = (typeof listarDuvidasMedQuest === "function") ? listarDuvidasMedQuest(chatId) : false;
    } else {
      var okDuvida = (typeof salvarDuvidaEstudoNotion === "function") ? salvarDuvidaEstudoNotion(duvidaTexto) : false;
      if (okDuvida) {
        var kbDuv = {
          inline_keyboard: [
            [{ text: "📋 Ver Dúvidas Salvas", callback_data: "ux:rotina:duvidas_lista" }],
            [{ text: "🔙 Central de Rotina", callback_data: "ux:hub:rotina" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
          ]
        };
        res = enviarMensagemComTecladoParaChat(chatId, "🧠 *DÚVIDA CLÍNICA ARQUIVADA COM SUCESSO!*\n\n📌 _\"" + duvidaTexto + "\"_\n\n✅ Salva no banco local para o seu bloco noturno de estudo ativo no MedQuest.\n💡 Digite `/duvidas` a qualquer momento para revisar.", kbDuv);
      } else {
        res = enviarMensagemParaChat(chatId, "❌ Falha ao arquivar dúvida.");
      }
    }
  } else if (comando === "/semana" || comando === "/relatorio" || comando === "/habitos") {
    res = (typeof enviarRelatorioSemanalHabitos === "function") ? enviarRelatorioSemanalHabitos(chatId) : false;
  } else if (comando === "/checkin") {
    res = (typeof enviarCheckinNoturno === "function") ? enviarCheckinNoturno(chatId) : false;
  } else if (comando === "/briefing") {
    res = (typeof enviarBriefingMatinal === "function") ? enviarBriefingMatinal(chatId, true) : false;
  } else if (comando === "/rotina") {
    var argRotina = (texto || "").replace(/^\/rotina\s*/i, "").trim();
    res = tratarComandoRotina(chatId, argRotina);
  }

  return { tratado: true, resultado: res };
}

function gerarBarraProgressoTexto(pct) {
  var total = 8;
  var cheios = Math.round(((pct || 0) / 100) * total);
  if (cheios > total) cheios = total;
  if (cheios < 0) cheios = 0;
  var str = "";
  for (var i = 0; i < total; i++) {
    str += (i < cheios) ? "▰" : "▱";
  }
  return str;
}

function formatarPlacarAderenciaTelegram(ad) {
  var p = (ad && ad.periodo) || {};
  var txt = "📊 *PAINEL DE ADERÊNCIA SEMANAL (ÚLTIMOS 7 DIAS)*\n" +
    "🗓️ _" + (p.inicio || "") + " a " + (p.fim || "") + "_\n\n" +
    "🎯 *Consistência Global:* `" + (ad ? ad.taxaGlobal : 0) + "%` " + gerarBarraProgressoTexto(ad ? ad.taxaGlobal : 0) + "\n" +
    "📈 *Status Geral:* " + ((ad && ad.statusVisual) || "Neutro") + "\n" +
    "✅ *Blocos:* " + ((ad && ad.totalConcluidos) || 0) + " de " + ((ad && ad.totalPlanejados) || 0) + " concluídos\n\n" +
    "─── *DESEMPENHO POR EIXO* ───\n";

  var e = (ad && ad.eixos) || {};
  var ordem = [
    { key: "plantao", icon: "🚨", nome: "Internato / Plantão" },
    { key: "estudo", icon: "🧠", nome: "Estudo / MedQuest" },
    { key: "treino", icon: "🏋️", nome: "Treino / Academia" },
    { key: "habitos", icon: "🌱", nome: "Rotina / Hábitos" }
  ];

  for (var i = 0; i < ordem.length; i++) {
    var o = ordem[i];
    var eixo = e[o.key] || { taxa: 0, concluidos: 0, planejados: 0, horasConcluidas: 0, horasPlanejadas: 0 };
    txt += "\n" + o.icon + " *" + o.nome + ":* `" + eixo.taxa + "%` " + gerarBarraProgressoTexto(eixo.taxa) + "\n" +
      "   • Cumprimento: " + eixo.concluidos + "/" + eixo.planejados + " blocos\n" +
      "   • Volume: " + (eixo.horasConcluidas ? eixo.horasConcluidas.toFixed(1) : "0.0") + "h de " + (eixo.horasPlanejadas ? eixo.horasPlanejadas.toFixed(1) : "0.0") + "h planejadas\n";
  }

  txt += "\n💡 _Dica: Marque os blocos conforme conclui ou use os botões rápidos de adiamento quando imprevistos surgirem._";
  return txt;
}

/**
 * Trata o comando /rotina e suas variações
 */
function tratarComandoRotina(chatId, argRotina) {
  var hoje = new Date();
  var tz = (typeof ConfigService !== "undefined" && ConfigService.get) ? ConfigService.get("TIMEZONE", "America/Sao_Paulo") : "America/Sao_Paulo";
  var arg = (argRotina || "").trim().toLowerCase();

  if (!arg) {
    var txtHubRotina = "🧭 *HUB DE ROTINA & PRODUTIVIDADE*\n\n" +
      "Selecione uma das opções abaixo para gerenciar seu dia, agenda e estudos, ou use comandos diretos:";
    return enviarMensagemComTecladoParaChat(chatId, txtHubRotina, construirTecladoHubRotina());
  }

  if (arg === "aderencia" || arg === "aderência" || arg === "placar" || arg === "stats") {
    var dadosAderencia = (typeof RotinaService !== "undefined" && RotinaService.calcularAderenciaSemanal)
      ? RotinaService.calcularAderenciaSemanal(hoje)
      : null;
    var txtAd = dadosAderencia ? formatarPlacarAderenciaTelegram(dadosAderencia) : "⚠️ Painel de aderência indisponível.";
    var kbAd = {
      inline_keyboard: [
        [{ text: "⏱️ Ver Timeline Hoje", callback_data: "rotina_timeline" }],
        [{ text: "🔙 Central de Rotina", callback_data: "ux:hub:rotina" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    };
    return enviarMensagemComTecladoParaChat(chatId, txtAd, kbAd);
  }

  if (arg === "hoje") {
    var blocosHoje = RotinaService.obterBlocosDoDia(hoje);
    var txtHoje = "☀️ *ROTINA DO DIA (TIME-BLOCKING ADAPTATIVO)*\n\n" +
      RotinaService.formatarTimelineMarkdown(blocosHoje, hoje) +
      "\n\n📅 _Sincronizado automaticamente com o seu Google Calendar._";
    var kbHoje = RotinaService.construirTecladoTimeline(hoje, blocosHoje);
    return enviarMensagemComTecladoParaChat(chatId, txtHoje, kbHoje);
  }

  if (arg === "amanha" || arg === "amanhã") {
    var amanha = new Date(hoje.getTime() + 86400000);
    var blocosAmanha = RotinaService.obterBlocosDoDia(amanha);
    var txtAmanha = "📆 *ROTINA DE AMANHÃ (PLANEJAMENTO ADAPTATIVO)*\n\n" +
      RotinaService.formatarTimelineMarkdown(blocosAmanha, amanha) +
      "\n\n📅 _Sincronizado automaticamente com o seu Google Calendar._";
    var kbAmanha = RotinaService.construirTecladoTimeline(amanha, blocosAmanha);
    return enviarMensagemComTecladoParaChat(chatId, txtAmanha, kbAmanha);
  }

  if (arg === "semana" || arg === "grade") {
    var resumoSemanal = RotinaService.obterResumoSemanal();
    var kbSemana = {
      inline_keyboard: [
        [{ text: "🔙 Central de Rotina", callback_data: "ux:hub:rotina" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    };
    return enviarMensagemComTecladoParaChat(chatId, resumoSemanal, kbSemana);
  }

  if (arg === "reset" || arg === "restaurar" || arg === "padrao" || arg === "padrão") {
    var resReset = RotinaService.aplicarInstrucao(hoje, "reset");
    var txtReset = resReset.mensagem + "\n\n" +
      RotinaService.formatarTimelineMarkdown(resReset.blocos, hoje);
    var kbReset = RotinaService.construirTecladoTimeline(hoje, resReset.blocos);
    return enviarMensagemComTecladoParaChat(chatId, txtReset, kbReset);
  }

  if (arg === "descanso") {
    var resDesc = RotinaService.aplicarInstrucao(hoje, "modo descanso");
    var txtDesc = resDesc.mensagem + "\n\n" +
      RotinaService.formatarTimelineMarkdown(resDesc.blocos, hoje);
    var kbDesc = RotinaService.construirTecladoTimeline(hoje, resDesc.blocos);
    return enviarMensagemComTecladoParaChat(chatId, txtDesc, kbDesc);
  }

  var instrucao = argRotina.replace(/^alterar\s+/i, "").trim();
  var dataAlvo = hoje;
  if (/^amanh[aã]\s+/i.test(instrucao)) {
    dataAlvo = new Date(hoje.getTime() + 86400000);
    instrucao = instrucao.replace(/^amanh[aã]\s+/i, "").trim();
  }

  var resAjuste = RotinaService.aplicarInstrucao(dataAlvo, instrucao);
  var txtAjuste = resAjuste.mensagem + "\n\n" +
    RotinaService.formatarTimelineMarkdown(resAjuste.blocos, dataAlvo);
  var kbAjuste = RotinaService.construirTecladoTimeline(dataAlvo, resAjuste.blocos);
  return enviarMensagemComTecladoParaChat(chatId, txtAjuste, kbAjuste);
}

/**
 * Trata callbacks da rotina inline
 */
function tratarCallbackRotina(cb) {
  var data = cb.data || "";
  var chatId = (cb.message && cb.message.chat && cb.message.chat.id) ? cb.message.chat.id : cb.from.id;
  var msgId = cb.message ? cb.message.message_id : null;
  var token = (typeof ConfigService !== "undefined" && ConfigService.get) ? ConfigService.get("TELEGRAM_BOT_TOKEN") : "";
  var hoje = new Date();

  var partes = data.split(":");
  var subAcao = partes[1]; // check, skip, reset, descanso, cal_sync, ajustar, ver_amanha, ver_hoje
  var param = partes[2];

  if (subAcao === "check") {
    RotinaService.marcarStatusBloco(hoje, param, "concluido", "Concluído via Telegram");
    responderCallbackTelegram(cb.id, "✅ Bloco marcado como concluído!");
  } else if (subAcao === "skip") {
    RotinaService.marcarStatusBloco(hoje, param, "pulado", "Pular bloco");
    responderCallbackTelegram(cb.id, "⏭️ Bloco pulado hoje.");
  } else if (subAcao === "adiar") {
    var deltaMin = parseInt(param, 10) || 30;
    var catOuId = partes[3] || null;
    var resAdiar = RotinaService.adiarProximoBloco(hoje, deltaMin, catOuId);
    responderCallbackTelegram(cb.id, resAdiar.mensagem.replace(/\*/g, ""));
  } else if (subAcao === "aderencia") {
    responderCallbackTelegram(cb.id, "📊 Carregando aderência semanal...");
    var dadosAderencia = (typeof RotinaService !== "undefined" && RotinaService.calcularAderenciaSemanal)
      ? RotinaService.calcularAderenciaSemanal(hoje)
      : null;
    var txtAd = dadosAderencia ? formatarPlacarAderenciaTelegram(dadosAderencia) : "⚠️ Painel de aderência indisponível.";
    var kbAd = {
      inline_keyboard: [
        [{ text: "⏱️ Voltar para Timeline", callback_data: "rotina:ver_hoje" }],
        [{ text: "🔙 Central de Rotina", callback_data: "ux:hub:rotina" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    };
    if (msgId && token) {
      executarPostTelegram("https://api.telegram.org/bot" + token + "/editMessageText", {
        chat_id: chatId,
        message_id: msgId,
        text: txtAd,
        parse_mode: "Markdown",
        reply_markup: kbAd
      });
      return;
    }
    return enviarMensagemComTecladoParaChat(chatId, txtAd, kbAd);
  } else if (subAcao === "reset") {
    RotinaService.resetarBlocosDoDia(hoje);
    responderCallbackTelegram(cb.id, "🔄 Rotina restaurada para o padrão!");
  } else if (subAcao === "descanso") {
    RotinaService.aplicarInstrucao(hoje, "modo descanso");
    responderCallbackTelegram(cb.id, "💤 Modo descanso ativado hoje!");
  } else if (subAcao === "cal_sync") {
    if (typeof GoogleCalendarService !== "undefined" && GoogleCalendarService.limparCache) {
      GoogleCalendarService.limparCache();
    }
    var stGcal = (typeof GoogleCalendarService !== "undefined" && GoogleCalendarService.obterStatus)
      ? GoogleCalendarService.obterStatus()
      : null;

    var blocosFrescos = RotinaService.importarEventosGoogleCalendar(hoje);
    if (blocosFrescos && blocosFrescos.length > 0) {
      var salvosAtuais = RotinaService.obterBlocosSalvos(hoje);
      if (Array.isArray(salvosAtuais) && salvosAtuais.length > 0) {
        for (var idxB = 0; idxB < blocosFrescos.length; idxB++) {
          var bF = blocosFrescos[idxB];
          for (var idxS = 0; idxS < salvosAtuais.length; idxS++) {
            if (salvosAtuais[idxS].id === bF.id || salvosAtuais[idxS].titulo === bF.titulo) {
              if (salvosAtuais[idxS].status && salvosAtuais[idxS].status !== "pendente") {
                bF.status = salvosAtuais[idxS].status;
                if (salvosAtuais[idxS].nota) bF.nota = salvosAtuais[idxS].nota;
              }
              break;
            }
          }
        }
      }
      RotinaService.salvarBlocosDoDia(hoje, blocosFrescos);
      responderCallbackTelegram(cb.id, "📆 " + blocosFrescos.length + " blocos sincronizados da Agenda Google!");
    } else if (stGcal && (!stGcal.conectado || !stGcal.tokenValido)) {
      responderCallbackTelegram(cb.id, "⚠️ Google Calendar desconectado. Renove as credenciais.");
    } else {
      RotinaService.salvarBlocosDoDia(hoje, []);
      responderCallbackTelegram(cb.id, "📆 Agenda verificada: nenhum evento registrado hoje.");
    }
  } else if (subAcao === "ajustar") {
    responderCallbackTelegram(cb.id, "📅 Ajustes pelo Google Calendar");
    var msgDica = "📅 *AJUSTES DE ROTINA NO GOOGLE CALENDAR*\n\n" +
      "Seus ajustes de horários e rotina são feitos diretamente no seu *Google Calendar* e sincronizados automaticamente aqui em tempo real!\n\n" +
      "• Crie, altere ou remova eventos na sua agenda do Google\n" +
      "• A timeline reflete as alterações automaticamente sem necessidade de comandos adicionais.";
    var kbDica = {
      inline_keyboard: [
        [{ text: "🔙 Central de Rotina", callback_data: "ux:hub:rotina" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    };
    if (msgId && token) {
      executarPostTelegram("https://api.telegram.org/bot" + token + "/editMessageText", {
        chat_id: chatId,
        message_id: msgId,
        text: msgDica,
        parse_mode: "Markdown",
        reply_markup: kbDica
      });
      return;
    }
    return enviarMensagemComTecladoParaChat(chatId, msgDica, kbDica);
  } else if (subAcao === "ver_amanha") {
    responderCallbackTelegram(cb.id, "📆 Carregando amanhã...");
    var amanha = new Date(hoje.getTime() + 86400000);
    var blocosAmanha = RotinaService.obterBlocosDoDia(amanha);
    var txtAmanha = "📆 *ROTINA DE AMANHÃ (PLANEJAMENTO ADAPTATIVO)*\n\n" +
      RotinaService.formatarTimelineMarkdown(blocosAmanha, amanha) +
      "\n\n📅 _Sincronizado automaticamente com o seu Google Calendar._";
    var kbAmanha = {
      inline_keyboard: [
        [{ text: "📅 Voltar para Hoje", callback_data: "rotina:ver_hoje" }],
        [{ text: "🔙 Central de Rotina", callback_data: "ux:hub:rotina" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    };
    if (msgId && token) {
      executarPostTelegram("https://api.telegram.org/bot" + token + "/editMessageText", {
        chat_id: chatId,
        message_id: msgId,
        text: txtAmanha,
        parse_mode: "Markdown",
        reply_markup: kbAmanha
      });
    } else {
      enviarMensagemComTecladoParaChat(chatId, txtAmanha, kbAmanha);
    }
    return;
  } else if (subAcao === "ver_hoje") {
    responderCallbackTelegram(cb.id, "📅 Carregando hoje...");
  }

  var blocosAtualizados = RotinaService.obterBlocosDoDia(hoje);
  var textoAtualizado = "☀️ *ROTINA DO DIA (TIME-BLOCKING ADAPTATIVO)*\n\n" +
    RotinaService.formatarTimelineMarkdown(blocosAtualizados, hoje) +
    "\n\n📅 _Sincronizado automaticamente com o seu Google Calendar._";
  var tecladoAtualizado = RotinaService.construirTecladoTimeline(hoje, blocosAtualizados);

  if (msgId && token) {
    executarPostTelegram("https://api.telegram.org/bot" + token + "/editMessageText", {
      chat_id: chatId,
      message_id: msgId,
      text: textoAtualizado,
      parse_mode: "Markdown",
      reply_markup: tecladoAtualizado
    });
    try {
      var dKey = (typeof RotinaService !== "undefined" && RotinaService.normalizarDataISO) ? RotinaService.normalizarDataISO(hoje) : new Date().toISOString().slice(0, 10);
      PropertiesService.getScriptProperties().setProperty("ROTINA_ACTIVE_MSG_" + chatId, JSON.stringify({
        message_id: msgId,
        chat_id: chatId,
        dateKey: dKey,
        hash: ""
      }));
    } catch (_) {}
  } else {
    var resEnvio = enviarMensagemComTecladoParaChat(chatId, textoAtualizado, tecladoAtualizado);
    try {
      var envMsgId = (typeof resEnvio === "object" && resEnvio && resEnvio.result && resEnvio.result.message_id) ? resEnvio.result.message_id : null;
      if (envMsgId) {
        var dKey = (typeof RotinaService !== "undefined" && RotinaService.normalizarDataISO) ? RotinaService.normalizarDataISO(hoje) : new Date().toISOString().slice(0, 10);
        PropertiesService.getScriptProperties().setProperty("ROTINA_ACTIVE_MSG_" + chatId, JSON.stringify({
          message_id: envMsgId,
          chat_id: chatId,
          dateKey: dKey,
          hash: ""
        }));
      }
    } catch (_) {}
  }
}
