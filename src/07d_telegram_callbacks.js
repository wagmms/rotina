/**
 * ==============================================================================
 * MÓDULO 07D: TELEGRAM CALLBACKS & BOTÕES INLINE
 * ==============================================================================
 * Processamento modular de eventos de toque em botões inline (menus, confirmações,
 * calculadoras, condutas, checklist de plantão e navegação).
 * Refatorado com tabela de despacho O(1) e decomposição em handlers atômicos.
 * ==============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE EXTRAÇÃO DE CONTEXTO DO CALLBACK
// ─────────────────────────────────────────────────────────────────────────────

function extrairChatIdCallback_(cb) {
  if (cb && cb.message && cb.message.chat && cb.message.chat.id) return cb.message.chat.id;
  if (cb && cb.from && cb.from.id) return cb.from.id;
  if (typeof ConfigService !== "undefined" && typeof ConfigService.get === "function") {
    return ConfigService.get("TELEGRAM_CHAT_ID");
  }
  return null;
}

function extrairMsgIdCallback_(cb) {
  return (cb && cb.message) ? cb.message.message_id : null;
}

function obterContextoCallback_(cb) {
  var tz = (typeof ConfigService !== "undefined" && typeof ConfigService.get === "function")
    ? ConfigService.get("TIMEZONE", "America/Sao_Paulo")
    : "America/Sao_Paulo";
  var dataRef = (cb && cb.message && cb.message.date) ? new Date(cb.message.date * 1000) : new Date();
  var dataAlvoISO = (typeof Utilities !== "undefined" && typeof Utilities.formatDate === "function")
    ? Utilities.formatDate(dataRef, tz, "yyyy-MM-dd")
    : dataRef.toISOString().split("T")[0];

  return {
    chatId: extrairChatIdCallback_(cb),
    msgId: extrairMsgIdCallback_(cb),
    tz: tz,
    dataAlvoISO: dataAlvoISO
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLERS MODULARES POR FAMÍLIA DE CALLBACK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A. HÁBITOS E ENERGIA (Notion Habit Log)
 */
function tratarCallbackHabitoEEnergia_(cb, data, ctx) {
  var chatCbHabit = ctx.chatId;
  if (typeof ehUsuarioTitular === "function" && !ehUsuarioTitular(chatCbHabit)) {
    responderCallbackTelegram(cb.id, "🔒 O Habit Tracker do Notion é exclusivo do titular.", true);
    return true;
  }
  responderCallbackTelegram(cb.id, "Salvando no Notion...");

  var pageId = (typeof obterOuCriarPaginaHabitLog === "function") ? obterOuCriarPaginaHabitLog(ctx.dataAlvoISO) : null;
  if (!pageId) {
    responderCallbackTelegram(cb.id, "⚠️ Falha ao acessar o Habit Log do Notion.");
    return true;
  }

  var kb = cb.message && cb.message.reply_markup ? cb.message.reply_markup.inline_keyboard : null;
  var valorStatus = true;

  if (kb) {
    for (var i = 0; i < kb.length; i++) {
      for (var j = 0; j < kb[i].length; j++) {
        var btn = kb[i][j];
        if (btn.callback_data === data && data.startsWith("habit_")) {
          valorStatus = (btn.text.indexOf("✅") === -1);
        }
      }
    }
  }

  var gravouComSucesso = false;
  if (data.startsWith("habit_")) {
    var mapaHabitos = {
      "habit_medquest": "🧠 MedQuest",
      "habit_gym": "🏋️ Academia",
      "habit_english": "📚 Inglês",
      "habit_guitar": "🎸 Violão",
      "habit_love": "❤️ Namorada",
      "habit_reading": "📖 Leitura"
    };
    var propName = mapaHabitos[data] || "";
    if (propName && typeof atualizarCheckboxNotion === "function") {
      gravouComSucesso = atualizarCheckboxNotion(pageId, propName, valorStatus);
    }
  } else if (data.startsWith("energy_")) {
    var valorEnergia = parseInt(data.replace("energy_", ""), 10);
    if (typeof atualizarNumeroNotion === "function") {
      gravouComSucesso = atualizarNumeroNotion(pageId, "⚡ Energia (1–5)", valorEnergia);
    }
  }

  if (gravouComSucesso && kb && cb.message && cb.message.chat) {
    for (var ki = 0; ki < kb.length; ki++) {
      for (var kj = 0; kj < kb[ki].length; kj++) {
        var kbtn = kb[ki][kj];
        if (kbtn.callback_data === data) {
          if (data.startsWith("habit_")) {
            kbtn.text = valorStatus ? ("✅ " + kbtn.text.replace("✅ ", "")) : kbtn.text.replace("✅ ", "");
          } else if (data.startsWith("energy_")) {
            kbtn.text = "✅ " + kbtn.text.replace("✅ ", "");
          }
        } else if (data.startsWith("energy_") && kbtn.callback_data.startsWith("energy_")) {
          kbtn.text = kbtn.text.replace("✅ ", "");
        }
      }
    }
    var token = ConfigService.get("TELEGRAM_BOT_TOKEN");
    executarPostTelegram("https://api.telegram.org/bot" + token + "/editMessageReplyMarkup", {
      "chat_id": cb.message.chat.id,
      "message_id": cb.message.message_id,
      "reply_markup": { "inline_keyboard": kb }
    });
    responderCallbackTelegram(cb.id, "✅ Registrado no Notion!");
  } else if (!gravouComSucesso) {
    responderCallbackTelegram(cb.id, "⚠️ Erro ao salvar registro no Notion.");
  }
  return true;
}

/**
 * A2 & ROTINA: TIMELINE E PRODUTIVIDADE
 */
function tratarCallbackRotinaProdutividade_(cb, data, ctx) {
  if (typeof ehUsuarioTitular === "function" && !ehUsuarioTitular(ctx.chatId)) {
    responderCallbackTelegram(cb.id, "🔒 Recurso exclusivo do titular.", true);
    return true;
  }

  if (data === "rotina_agenda") {
    responderCallbackTelegram(cb.id, "Consultando agenda...");
    return consultarEventosAgenda("", ctx.chatId, ctx.msgId);
  }
  if (data === "rotina_tasks") {
    responderCallbackTelegram(cb.id, "Carregando tarefas...");
    return listarTarefasHojeNotion(ctx.chatId, ctx.msgId);
  }
  if (data === "rotina_briefing") {
    responderCallbackTelegram(cb.id, "Gerando briefing matinal...");
    return enviarBriefingMatinal(ctx.chatId, true, ctx.msgId);
  }
  if (data === "rotina_checkin") {
    responderCallbackTelegram(cb.id, "Iniciando check-in...");
    return enviarCheckinNoturno(ctx.chatId, ctx.msgId);
  }
  if (data === "rotina_semana") {
    responderCallbackTelegram(cb.id, "Gerando relatório semanal...");
    return enviarRelatorioSemanalHabitos(ctx.chatId);
  }
  if (data === "rotina_plantao_fim") {
    responderCallbackTelegram(cb.id, "Fechamento de plantão...");
    return gerarResumoFimPlantao(ctx.chatId, ctx.msgId);
  }
  if (data === "rotina_duvida") {
    responderCallbackTelegram(cb.id, "MedQuest / Dúvidas");
    var msgDuvidaLegacy = "🧠 *MEDQUEST / DÚVIDAS MÉDICAS*\n\nEnvie sua dúvida médica digitando:\n`/duvida <sua dúvida>`\n💡 *Exemplo:* `/duvida Critérios de Light para derrame pleural`\n\nSua dúvida será salva no Notion para o bloco noturno de estudo ativo.";
    var kbDuvidaLegacy = {
      inline_keyboard: [
        [{ text: "🔙 Central de Rotina", callback_data: "ux:hub:rotina" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    };
    if (typeof enviarTelaBot === "function") {
      return enviarTelaBot(ctx.chatId, msgDuvidaLegacy, kbDuvidaLegacy, ctx.msgId);
    }
    return enviarMensagemComTecladoParaChat(ctx.chatId, msgDuvidaLegacy, kbDuvidaLegacy);
  }
  if (data === "rotina_timeline") {
    responderCallbackTelegram(cb.id, "Time-blocking de hoje...");
    return tratarComandoRotina(ctx.chatId, "hoje");
  }
  return false;
}

/**
 * A3. AJUDA E MANUAL DE COMANDOS SLASH
 */
function tratarCallbackAjuda_(cb, data, ctx) {
  var catAlvo = (data === "ajuda_todas") ? "todas" : data.replace(/^ajuda_cat_/, "");
  responderCallbackTelegram(cb.id, "Carregando comandos...");
  return enviarManualCompletoComandos(ctx.chatId, catAlvo);
}

/**
 * B. GERAR ROUND DIRETO DO PLANTÃO SBAR
 */
function tratarCallbackGerarRound_(cb, data, ctx) {
  var cacheKeyRound = data.replace("gerarRound_", "");
  var conteudoPlantao = CacheService.getScriptCache().get(cacheKeyRound);
  if (conteudoPlantao) {
    responderCallbackTelegram(cb.id, "Gerando Pitch do Round...");
    processarEEntregarIA(ctx.chatId, gerarPitchERoundComIA, conteudoPlantao, "round");
  } else {
    responderCallbackTelegram(cb.id, "⚠️ Dados do plantão expirados.");
  }
  return true;
}

/**
 * B2. INCORPORAR LAUDO DE IMAGEM/EXAME AO CASO SOAP
 */
function tratarCallbackIncorporarLaudoSoap_(cb, data, ctx) {
  var ckLaudo = data.replace(/^incorporar(?:Laudo)?Soap_/, "");
  var cache = CacheService.getScriptCache();
  var laudoTexto = cache.get(ckLaudo);
  if (!laudoTexto) {
    responderCallbackTelegram(cb.id, "⚠️ Laudo expirado do cache.");
    return true;
  }
  responderCallbackTelegram(cb.id, "Incorporando ao caso SOAP...");
  var chatIdSoap = ctx.chatId;
  var estadoAtual = typeof modoBot === "function" ? modoBot(chatIdSoap) : null;
  var casoExistente = (estadoAtual && estadoAtual.data) ? estadoAtual.data : String(cache.get("ctx_" + chatIdSoap) || "");

  var novoCaso = "";
  if (casoExistente && casoExistente.trim().length > 5 && casoExistente.indexOf(laudoTexto.trim()) === -1) {
    novoCaso = casoExistente.trim() + "\n\n📸 *EXAME COMPLEMENTAR INCORPORADO (LAUDO):*\n" + laudoTexto.trim();
    enviarMensagemParaChat(chatIdSoap, "🩺 *Laudo incorporado ao caso clínico ativo.* Atualizando prontuário...");
  } else {
    novoCaso = "Paciente com exame complementar anexado.\n\n📸 *ACHADOS DO EXAME (LAUDO):*\n" + laudoTexto.trim();
    enviarMensagemParaChat(chatIdSoap, "🩺 *Novo caso SOAP iniciado a partir da imagem.* Estruturando anamnese e exame...");
  }

  if (typeof definirModoBot === "function") definirModoBot(chatIdSoap, "soap", novoCaso);
  safePutCache(cache, "ctx_" + chatIdSoap, novoCaso, 900);

  return processarEEntregarIA(chatIdSoap, function(d) {
    return gerarSOAPComIA(d, { fecharPlano: false });
  }, novoCaso, "soap");
}

/**
 * C & D. CALCULADORAS CLÍNICAS (v3.0 E LEGADO)
 */
function tratarCallbackCalculadoras_(cb, data, ctx) {
  if (data === "calc_menu_principal") {
    responderCallbackTelegram(cb.id, "");
    return enviarMenuCategoriasCalculadoras(ctx.chatId, ctx.msgId);
  }
  if (data.startsWith("calc_cat_")) {
    responderCallbackTelegram(cb.id, "");
    return enviarSubmenuCalculadoras(ctx.chatId, ctx.msgId, data);
  }
  if (data.startsWith("calc:")) {
    responderCallbackTelegram(cb.id, "");
    var segs = data.split(":");
    if (segs.length < 3) {
      enviarMensagemParaChat(ctx.chatId, "⚠️ Callback de calculadora inválido.");
      return true;
    }
    var calcId = segs[1];
    var calcAcao = segs[2];
    var calcArgs = segs.slice(3);
    try {
      if (typeof CalculadorasClinicas !== "undefined" && typeof CalculadorasClinicas.processarAcao === "function") {
        var resAcao = CalculadorasClinicas.processarAcao(ctx.chatId, calcId, calcAcao, calcArgs);
        if (resAcao && resAcao.textoFormatado) {
          if (resAcao.botoes) {
            if (typeof enviarTelaBot === "function") {
              enviarTelaBot(ctx.chatId, resAcao.textoFormatado, { inline_keyboard: resAcao.botoes }, ctx.msgId);
            } else {
              enviarMensagemComTecladoParaChat(ctx.chatId, resAcao.textoFormatado, { inline_keyboard: resAcao.botoes });
            }
          } else {
            enviarMensagemParaChat(ctx.chatId, resAcao.textoFormatado);
          }
        }
      } else {
        enviarMensagemParaChat(ctx.chatId, "⚠️ Módulo de calculadoras indisponível.");
      }
    } catch (eCalcCb) {
      Logger.log("Erro callback calc:: " + eCalcCb.message);
      enviarMensagemParaChat(ctx.chatId, "⚠️ Erro ao processar ação da calculadora.");
    }
    return true;
  }
  if (data.startsWith("calc_")) {
    var tipoCalc = data.replace("calc_", "");
    var contextoCache = CacheService.getScriptCache();
    var contextoKey = "ctx_" + ctx.chatId;
    safePutCache(contextoCache, contextoKey, "/calc Calculadora selecionada: " + tipoCalc + "\nDados do paciente: ", 900);

    if (typeof definirModoBot !== "undefined") {
      definirModoBot(ctx.chatId, "calc", "Calculadora selecionada: " + tipoCalc + "\nDados do paciente: ");
    }
    responderCallbackTelegram(cb.id, "Calculadora " + tipoCalc + " selecionada");
    var instrucoes = obterInstrucoesCalculadora(tipoCalc);
    var tecladoCalc = {
      inline_keyboard: [
        [{"text": "🔙 Calculadoras", "callback_data": "ux:hub:calc"}, {"text": "🏠 Início", "callback_data": "ux:hub:inicio"}]
      ]
    };
    if (ctx.msgId && typeof enviarTelaBot === "function") {
      enviarTelaBot(ctx.chatId, instrucoes, tecladoCalc, ctx.msgId);
    } else {
      enviarMensagemComTecladoParaChat(ctx.chatId, instrucoes, tecladoCalc);
    }
    return true;
  }
  return false;
}

/**
 * E. ARQUIVAMENTO NO NOTION TASKS
 */
function tratarCallbackNotionTasks_(cb, data, ctx) {
  if (typeof ehUsuarioTitular === "function" && !ehUsuarioTitular(ctx.chatId)) {
    responderCallbackTelegram(cb.id, "🔒 O banco do Notion é exclusivo do titular.", true);
    return true;
  }
  var partes = data.split("_");
  var tipo = partes[1];
  var cacheKey = partes.slice(2).join("_");

  var cache = CacheService.getScriptCache();
  var conteudo = cache.get(cacheKey);

  if (cache.get("saved_" + cacheKey)) {
    responderCallbackTelegram(cb.id, "Já salvo no Notion.");
    return true;
  }
  if (conteudo) {
    responderCallbackTelegram(cb.id, "Arquivando no Notion...");
    var mapaTitulos = {
      "soap": "Caso Clínico SOAP",
      "rx": "Prescrição Ambulatorial",
      "plantao": "Passagem de Plantão SBAR",
      "round": "Pitch & Round Socrático",
      "gaso": "Gasometria Arterial",
      "conduta": "Conduta de Emergência",
      "audio": "Registro Clínico por Áudio",
      "imagem": "Análise de Imagem/ECG",
      "calc": "Calculadora Clínica",
      "interacao": "Análise de Interação Medicamentosa"
    };
    var tituloNotion = mapaTitulos[tipo] || "Anotação Clínica";
    tituloNotion += " · " + Utilities.formatDate(new Date(), ctx.tz, "dd/MM HH:mm");

    var sucesso = (typeof criarTarefaNotion === "function")
      ? criarTarefaNotion(tituloNotion, "Internship", "2 · Important", conteudo)
      : false;

    if (sucesso) {
      enviarMensagemParaChat(ctx.chatId, "📁 Arquivado no Notion Tasks com sucesso!");
      var kbRestante = cb.message && cb.message.reply_markup && cb.message.reply_markup.inline_keyboard;
      if (kbRestante) {
        kbRestante = kbRestante.map(function(row) {
          return row.filter(function(b) { return b.callback_data !== data; });
        }).filter(function(row) { return row.length; });
        executarPostTelegram("https://api.telegram.org/bot" + ConfigService.get("TELEGRAM_BOT_TOKEN") + "/editMessageReplyMarkup", {
          chat_id: ctx.chatId,
          message_id: ctx.msgId,
          reply_markup: { inline_keyboard: kbRestante }
        });
      }
      safePutCache(cache, "saved_" + cacheKey, "1", 21600);
    } else {
      enviarMensagemParaChat(ctx.chatId, "❌ Falha ao salvar no Notion. Tente novamente.");
    }
  } else {
    responderCallbackTelegram(cb.id, "⚠️ Conteúdo expirado.");
    if (typeof removerBotaoInline === "function") removerBotaoInline(cb);
  }
  return true;
}

/**
 * F. PRESCRIÇÕES, CONSULTAS E PDF
 */
function tratarCallbackPrescricaoEFarmaco_(cb, data, ctx) {
  if (data.startsWith("gerarPdfRx_")) {
    var cacheKeyPdf = data.replace("gerarPdfRx_", "");
    var conteudoPrescricao = CacheService.getScriptCache().get(cacheKeyPdf);
    if (conteudoPrescricao) {
      responderCallbackTelegram(cb.id, "Gerando receituário A4 em PDF...");
      var resPdf = ReceitaPdfService.processarEEnviarPdf(ctx.chatId, conteudoPrescricao);
      return (resPdf && resPdf.sucesso === false) ? false : true;
    }
    responderCallbackTelegram(cb.id, "⚠️ Prescrição expirada do cache.");
    return false;
  }
  if (data.startsWith("rx_med:")) {
    var medNome = data.replace("rx_med:", "").trim();
    responderCallbackTelegram(cb.id, "Gerando prescrição de " + medNome + "...");
    return processarEEntregarIA(ctx.chatId, gerarPrescricaoComIA, medNome, "rx");
  }
  if (data.startsWith("ped_med:")) {
    var medPedNome = data.replace("ped_med:", "").trim();
    responderCallbackTelegram(cb.id, "Abrindo guia pediátrico de " + medPedNome + "...");
    return responderConsultaPediatricaPedB(ctx.chatId, medPedNome);
  }
  if (data.startsWith("hsl_med:")) {
    var medHslNome = data.replace("hsl_med:", "").trim();
    responderCallbackTelegram(cb.id, "Abrindo guia adulto HSL de " + medHslNome + "...");
    return responderConsultaPosologiaHSL(ctx.chatId, medHslNome);
  }
  return false;
}

/**
 * G. PRECEPTOR SOCRÁTICO (VOZ, SOAP, ENCERRAMENTO)
 */
function tratarCallbackPreceptorSocratico_(cb, data, ctx) {
  if (data.startsWith("ouvirPreceptor_")) {
    var cacheKeyVoz = data.replace("ouvirPreceptor_", "");
    var conteudoCaso = (typeof safeGetCache === "function")
      ? safeGetCache(CacheService.getScriptCache(), cacheKeyVoz)
      : CacheService.getScriptCache().get(cacheKeyVoz);
    if (!conteudoCaso) {
      conteudoCaso = CacheService.getScriptCache().get(cacheKeyVoz);
    }
    if (conteudoCaso) {
      responderCallbackTelegram(cb.id, "Transmitindo áudio para o fone...");
      return responderPreceptorVozComIA(ctx.chatId, conteudoCaso, { apenasNarrar: true });
    }
    responderCallbackTelegram(cb.id, "⚠️ Caso expirado do cache.");
    return true;
  }
  if (data === "preceptor_gerar_soap") {
    responderCallbackTelegram(cb.id, "Consolidando discussão e gerando SOAP...");
    var dialogoSoap = obterDialogoPreceptor(ctx.chatId);
    limparDialogoPreceptor(ctx.chatId);
    var casoParaSoap = (dialogoSoap && dialogoSoap.caso_base) ? dialogoSoap.caso_base : "";
    if (dialogoSoap && dialogoSoap.historico && dialogoSoap.historico.length > 0) {
      var histFormatado = dialogoSoap.historico.map(function(h) {
        return (h.papel === "preceptor" ? "Preceptor: " : "Médico: ") + h.texto;
      }).join("\n");
      casoParaSoap += "\n\n[Discussão Socrática e Raciocínio Clínico]:\n" + histFormatado;
    }
    if (!casoParaSoap) {
      return enviarMensagemParaChat(ctx.chatId, "⚠️ Nenhum caso ativo encontrado para gerar SOAP.");
    }
    if (typeof definirModoBot !== "undefined") {
      definirModoBot(ctx.chatId, "soap", casoParaSoap);
    }
    return processarEEntregarIA(ctx.chatId, gerarSOAPComIA, casoParaSoap, "soap");
  }
  if (data === "preceptor_encerrar") {
    responderCallbackTelegram(cb.id, "Discussão encerrada.");
    limparDialogoPreceptor(ctx.chatId);
    if (typeof limparEstadoBot === "function") {
      try { limparEstadoBot(ctx.chatId); } catch (e) {}
    }
    return enviarMensagemComTecladoFixo(ctx.chatId, "🛑 *Discussão socrática encerrada.* Teclado principal restaurado.");
  }
  return false;
}

/**
 * H. ENFERMARIA E PAINEL DE LEITOS
 */
function tratarCallbackEnfermaria_(cb, data, ctx) {
  if (data === "enfermaria_passagem") {
    responderCallbackTelegram(cb.id, "Consolidando passagem SBAR...");
    if (typeof tratarCallbackEnfSBAR === "function") {
      return tratarCallbackEnfSBAR(ctx.chatId, ctx.msgId);
    }
    var textoLeitos = EnfermariaService.obterTextoConsolidadoParaPassagem();
    if (!textoLeitos) {
      return enviarMensagemComTecladoParaChat(ctx.chatId, "🏥 *Nenhum leito registrado na enfermaria para passar.* Registre os leitos usando `/leito <num> <dados>` antes de gerar a passagem.", {
        inline_keyboard: [
          [{ text: "🏥 Painel de Leitos", callback_data: "ux:painel:0" }],
          [{ text: "🔙 Enfermaria", callback_data: "ux:hub:enf" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
        ]
      });
    }
    return processarEEntregarIA(ctx.chatId, gerarPassagemPlantaoSBAR, textoLeitos, "plantao");
  }
  if (data === "enfermaria_atualizar") {
    responderCallbackTelegram(cb.id, "Quadro atualizado.");
    return enviarMensagemComTecladoParaChat(ctx.chatId, EnfermariaService.formatarPainelBordo(), construirTecladoHubEnfermaria());
  }
  if (data === "enfermaria_add") {
    responderCallbackTelegram(cb.id, "Adicionar leito");
    return enviarMensagemComTecladoParaChat(ctx.chatId, "➕ *ADICIONAR OU EVOLUIR LEITO*\n\nDigite: `/leito <número> <dados do paciente>`\n💡 *Exemplo:* `/leito 4 72a, PAC grave, Ceftriaxona D3, aguarda vaga CTI`\n\n• Para consultar apenas o leito: `/leito 4`", {
      inline_keyboard: [
        [{ text: "🏥 Painel de Leitos", callback_data: "ux:painel:0" }],
        [{ text: "🔙 Enfermaria", callback_data: "ux:hub:enf" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    });
  }
  if (data === "enfermaria_alta") {
    responderCallbackTelegram(cb.id, "Dar alta a leito");
    return enviarMensagemComTecladoParaChat(ctx.chatId, "📤 *DAR ALTA A LEITO*\n\nDigite: `/alta <número do leito>`\n💡 *Exemplo:* `/alta 4`\n\nO leito será desocupado e o censo atualizado.", {
      inline_keyboard: [
        [{ text: "🏥 Painel de Leitos", callback_data: "ux:painel:0" }],
        [{ text: "🔙 Enfermaria", callback_data: "ux:hub:enf" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    });
  }
  if (data === "enfermaria_round") {
    responderCallbackTelegram(cb.id, "Pitch de Round");
    return enviarMensagemComTecladoParaChat(ctx.chatId, "🎙️ *PITCH DE ROUND BEIRA-LEITO*\n\nDigite: `/round <dados do paciente>`\n💡 *Exemplo:* `/round Leito 4: 72a, DPOC exacerbado, em VNI, melhorando acidose, aguarda gaso de controle`", {
      inline_keyboard: [
        [{ text: "🏥 Painel de Leitos", callback_data: "ux:painel:0" }],
        [{ text: "🔙 Enfermaria", callback_data: "ux:hub:enf" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    });
  }
  if (data === "enfermaria_plantao_iniciar") {
    responderCallbackTelegram(cb.id, "Iniciando plantão");
    return enviarMensagemComTecladoParaChat(ctx.chatId, "🟢 *INÍCIO DE PLANTÃO NA ENFERMARIA*\n\n• Para evoluir/adicionar leito: `/leito <nº> <caso>`\n• Para registrar passagem SBAR: `/sbar`\n• Para censo completo: `/censo` ou `/leitos`\n• Para checklist de encerramento: `/plantao_fim`", {
      inline_keyboard: [
        [{ text: "🏥 Painel de Leitos", callback_data: "ux:painel:0" }, { text: "📋 Passagem SBAR", callback_data: "ux:enf:sbar" }],
        [{ text: "🔙 Enfermaria", callback_data: "ux:hub:enf" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    });
  }
  if (data === "enfermaria_limpar_confirma") {
    responderCallbackTelegram(cb.id, "Confirmação de limpeza");
    var kbConfirmaLimpar = {
      "inline_keyboard": [
        [
          {"text": "⚠️ Sim, desocupar todos", "callback_data": "enfermaria_limpar_executa"},
          {"text": "❌ Cancelar", "callback_data": "enfermaria_atualizar"}
        ],
        [
          {"text": "🔙 Enfermaria", "callback_data": "ux:hub:enf"},
          {"text": "🏠 Início", "callback_data": "ux:hub:inicio"}
        ]
      ]
    };
    return enviarMensagemComTecladoParaChat(ctx.chatId, "⚠️ *CONFIRMAÇÃO DE LIMPEZA DA ENFERMARIA*\n\nTem certeza de que deseja remover e desocupar *todos os leitos* cadastrados?", kbConfirmaLimpar);
  }
  if (data === "enfermaria_limpar_executa") {
    responderCallbackTelegram(cb.id, "Leitos desocupados.");
    var resLimpeza = EnfermariaService.limparTudo();
    return enviarMensagemComTecladoParaChat(ctx.chatId, resLimpeza.mensagem + "\n\n" + EnfermariaService.formatarPainelBordo(), construirTecladoHubEnfermaria());
  }
  return false;
}

/**
 * DIABETES, METABOLISMO, ANEMIA E DHE
 */
function tratarCallbackDiabetesMetabolismo_(cb, data, ctx) {
  if (data === "dm_cad_ehh") {
    responderCallbackTelegram(cb.id, "CAD / EHH");
    return enviarMensagemParaChat(ctx.chatId, "🔥 *MANEJO DE CAD & EHH (SBD/ADA)*\n\nEnvie os parâmetros do paciente:\n💡 *Exemplo:* `/ehh 78kg, glicemia 750, k 4.6, na 142`\nou `/cad 70kg, glicemia 420, ph 7.18, hco3 11, k 4.8`\n\nO sistema calcula reposição volêmica, insulina em BIC, reposição de K+ e bicarbonato.");
  }
  if (data === "dm_glicemia") {
    responderCallbackTelegram(cb.id, "Mapa glicêmico");
    return enviarMensagemParaChat(ctx.chatId, "📊 *MAPA GLICÊMICO & ESCALA HOSPITALAR*\n\nEnvie a glicemia atual e o perfil do paciente:\n💡 *Exemplo:* `/glicemia 240 padrao`\n• `/glicemia 310 sensivel` (idoso, DRC ou baixo peso)\n• `/glicemia 280 resistente` (obeso ou corticoterapia)");
  }
  if (data === "dm_insulina") {
    responderCallbackTelegram(cb.id, "Insulina Basal-Bolus");
    return enviarMensagemParaChat(ctx.chatId, "💉 *PRESCRIÇÃO DE INSULINOTERAPIA BASAL-BOLUS*\n\nEnvie peso e parâmetros clínicos:\n💡 *Exemplo:* `/insulina 70kg dm1`\n• `/insulina 85kg dm2 descompensado clcr 35`\n\nCalcula dose diária total, divisão Basal (NPH/Glargina) e Bolus (Regular/Lispro) com Fator de Sensibilidade.");
  }
  if (data === "dm_remume") {
    responderCallbackTelegram(cb.id, "Antidiabéticos REMUME");
    return enviarMensagemParaChat(ctx.chatId, "💊 *ANTIDIABÉTICOS DISPONÍVEIS NA REMUME / SUS*\n\n" +
      "• *Metformina 500mg / 850mg:* 1ª linha DM2 (ajustar dose se ClCr < 45, suspender se ClCr < 30 mL/min)\n" +
      "• *Gliclazida MR 30mg / 60mg:* Sulfonilureia preferencial (menor risco de hipoglicemia)\n" +
      "• *Glibenclamida 5mg:* Alternativa clássica (evitar em idosos/DRC)\n" +
      "• *Insulina NPH 100 UI/mL:* Basal do SUS (frascos e canetas para DM1/DM2)\n" +
      "• *Insulina Regular 100 UI/mL:* Prandial e correção rápida do SUS\n\n" +
      "💡 *Para consultar interações:* `/interacao metformina <droga>`");
  }
  return false;
}

function tratarCallbackAnemiaGanzoni_(cb, data, ctx) {
  if (data === "anemia_etiologia") {
    responderCallbackTelegram(cb.id, "Investigação de Anemias");
    return enviarMensagemParaChat(ctx.chatId, "🔬 *INVESTIGAÇÃO ETIOLÓGICA DE ANEMIAS*\n\nEnvie os índices hematimétricos:\n💡 *Exemplo:* `/anemia hb 8.5 vcm 68 rdw 18 ferritina 12 peso 60kg`\n\n• *Microcíticas:* Ferropriva vs Traço Talassêmico (Mentzer) vs Doença Crônica\n• *Macrocíticas:* Megaloblástica (B12 / Folato) vs Hemolítica vs Hepatopatia");
  }
  if (data === "anemia_ganzoni") {
    responderCallbackTelegram(cb.id, "Fórmula de Ganzoni");
    return enviarMensagemParaChat(ctx.chatId, "💉 *CÁLCULO DE DÉFICIT DE FERRO (GANZONI)*\n\nEnvie o peso e a hemoglobina do paciente:\n💡 *Exemplo:* `/ganzoni 65kg hb 8.0`\nou `/ganzoni 70kg hb 7.2 alvo 12`\n\nCalcula o déficit de ferro elementar em mg e o total de ampolas de Noripurum EV.");
  }
  return false;
}

function tratarCallbackDhe_(cb, data, ctx) {
  if (data === "dhe_hipo") {
    responderCallbackTelegram(cb.id, "Hiponatremia (Adrogué-Madias)");
    return enviarMensagemParaChat(ctx.chatId, "💧 *CORREÇÃO DE HIPONATREMIA (ADROGUÉ-MADIAS)*\n\nEnvie os dados com sódio, peso e sexo:\n💡 *Exemplo:* `/dhe na 118 peso 60 f 72`\nou `/dhe na 122 peso 70 m nacl 3%`\n\nCalcula a elevação de Na+ por litro de NaCl 3%, teto seguro em 24h (máx 8 mEq/L) e taxa na BIC em mL/h.");
  }
  if (data === "dhe_hiper") {
    responderCallbackTelegram(cb.id, "Hipernatremia (Água Livre)");
    return enviarMensagemParaChat(ctx.chatId, "🌵 *HIPERNATREMIA — DÉFICIT DE ÁGUA LIVRE*\n\nEnvie o sódio atual, peso e perfil:\n💡 *Exemplo:* `/dhe na 164 peso 70 m`\nou `/dhe na 158 peso 55 f 80 anos`\n\nCalcula o déficit de água livre em Litros e prescreve o volume seguro de SG 5% em 24h.");
  }
  if (data === "dhe_k") {
    responderCallbackTelegram(cb.id, "Hipercalemia & ECG");
    return enviarMensagemParaChat(ctx.chatId, "⚡ *HIPERCALEMIA & CARDIOPROTEÇÃO (SBC/KDIGO)*\n\nEnvie o valor do potássio e alterações no ECG:\n💡 *Exemplo:* `/dhe k 7.2 ecg alterado`\nou `/dhe k 8.4`\n\nEstratifica gravidade, indica Gluconato de Cálcio 10% IV imediato, glicoinsulina, beta-2 e hemodiálise de urgência se K > 8.0 mEq/L.");
  }
  return false;
}

/**
 * GINECOLOGIA E OBSTETRÍCIA (HUB G&O)
 */
function tratarCallbackGinecologiaObstetricia_(cb, data, ctx) {
  var mapaTelasGo = {
    "go_prenatal": { tela: enviarTelaGOPrenatal, titulo: "Pré-Natal & DPP", fallbackTxt: "🤰 *CÁLCULO DE IG & ROTINA DE PRÉ-NATAL (MS)*\n\nEnvie a DUM ou dados de USG precoce:\n💡 *Exemplo:* `/prenatal DUM 15/02/2026`\nou `/prenatal USG 01/03/2026 8s3d`\n\nCalcula IG atual, DPP pela regra de Naegele e exames do trimestre." },
    "go_parto": { tela: enviarTelaGOParto, titulo: "Parto & Centro Obstétrico", fallbackTxt: "🏥 *CONDUÇÃO DO TRABALHO DE PARTO & BISHOP*\n\nEnvie os dados do exame obstétrico:\n💡 *Exemplo:* `/parto 6cm apagamento 80% plano 0 feto cefalico`\nou `/co bishop dilatacao 3cm apagamento 50% consistencia media posicao intermediaria altura -2`\n\nCalcula índice de Bishop, fase do parto e orienta analgesia/indução." },
    "go_hpp": { tela: enviarTelaGOHpp, titulo: "Hemorragia Pós-Parto (4 Ts)", fallbackTxt: "🩸 *HEMORRAGIA PÓS-PARTO (HPP) — PROTOCOLO 4 Ts*\n\nEnvie os parâmetros clínicos e perda estimada:\n💡 *Exemplo:* `/hpp perda 1200ml atonia uterina pas 85 fc 125`\n\nCalcula Índice de Choque (FC/PAS), orienta Ocitocina (5 UI IV lento + 20 UI em 500 mL), Metilergonovina, Misoprostol (800 mcg retal) e Ácido Tranexâmico (1g IV em 10 min até 3h do parto)." },
    "go_mgso4": { tela: enviarTelaGOMgso4, titulo: "Pré-Eclâmpsia & MgSO4", fallbackTxt: "⚡ *PRÉ-ECLÂMPSIA GRAVE & ESQUEMA DE ZUSPAN*\n\nEnvie o comando para orientações imediatas:\n💡 *Exemplo:* `/mgso4 zuspan`\n\n• *Ataque:* Sulfato de Magnésio 50% 4g (8 mL de MgSO4 50% + 12 mL de AD) IV em 20 min.\n• *Manutenção:* 1 a 2 g/h em BIC contínua.\n• *Vigilância:* Reflexo patelar presente, FR > 16 irpm, Diurese > 25 mL/h.\n• *Antídoto imediato:* Gluconato de Cálcio 10% 10 mL IV em 3-5 min." },
    "go_prematuridade": { tela: enviarTelaGOPrematuridade, titulo: "Prematuridade & RPMO", fallbackTxt: "👶 *TRABALHO DE PARTO PREMATURO & RPMO*\n\nEnvie a idade gestacional:\n💡 *Exemplo:* `/prematuridade 30 semanas dinamica uterina presente bolsa integra`\n\n• *Maturação Pulmonar (24 a 34 sem):* Betametasona 12 mg IM q24h (2 doses).\n• *Neuroproteção (< 32 sem):* MgSO4 4g ataque + 1g/h até o parto.\n• *Tocólise (24 a 34 sem):* Nifedipino ou Atosibana." },
    "go_toxo": { tela: enviarTelaGOToxo, titulo: "Toxoplasmose Gestacional", fallbackTxt: "🔬 *TOXOPLASMOSE GESTACIONAL & AVIDEZ*\n\nEnvie sorologias e idade gestacional:\n💡 *Exemplo:* `/toxo igg 250 igm 3.2 avidez alta 10 semanas`\nou `/toxo igg positivo igm positivo 18 semanas sem avidez`\n\nInterpreta soroconversão, orienta Espiramicina 1g 8/8h e esquema tríplice se infecção fetal confirmada." },
    "go_corrimento": { tela: enviarTelaGOCorrimento, titulo: "Vulvovaginites", fallbackTxt: "🌸 *VULVOVAGINITES & CORRIMENTOS (REMUME/MS)*\n\nEnvie os achados clínicos:\n💡 *Exemplo:* `/corrimento branco grumoso prurido intenso`\n• `/corrimento bolhoso amarelo esverdeado odor fetido colo em framboesa`\n• `/corrimento acinzentado odor peixe podre whiff positivo`\n\nOrienta conduta de Candidíase (Fluconazol/Miconazol), Vaginose (Metronidazol) e Tricomoníase (Metronidazol + tratar parceiro)." },
    "go_preventivo": { tela: enviarTelaGOPreventivo, titulo: "Preventivo / Citopatológico", fallbackTxt: "🩺 *CONDUTA CITOPATOLÓGICA DE COLO DE ÚTERO (INCA)*\n\nEnvie o laudo e idade da paciente:\n💡 *Exemplo:* `/preventivo 28 anos asc-us`\n• `/preventivo 35 anos lsil`\n• `/preventivo 42 anos hsil`\n• `/preventivo 30 anos agc`\n\nOrienta repetição em 6 ou 12 meses vs encaminhamento imediato para Colposcopia." },
    "go_anticoncepcao": { tela: enviarTelaGOAnticoncepcao, titulo: "Anticoncepção OMS", fallbackTxt: "💊 *CRITÉRIOS DE ELEGIBILIDADE DA CONTRACEPÇÃO (OMS MEC 1 a 4)*\n\nEnvie idade e comorbidades da paciente:\n💡 *Exemplo:* `/anticoncepcao 32 anos enxaqueca com aura`\n• `/anticoncepcao 38 anos tabagista 15 cigarros/dia`\n• `/anticoncepcao puerpera 3 semanas em aleitamento materno exclusivo`\n\nClassifica métodos seguros (MEC 1 e 2) vs contraindicados (MEC 3 e 4)." },
    "go_dip": { tela: enviarTelaGODip, titulo: "DIP & ATO", fallbackTxt: "🩹 *DOENÇA INFLAMATÓRIA PÉLVICA (DIP) & ATO*\n\nEnvie o quadro clínico:\n💡 *Exemplo:* `/dip dor hipogastrica descompressao brusca positiva dor mobilizacao colo febre 38.5`\n\n• *Critérios Diagnósticos (MS/CDC):* Maiores, Menores e Elaborados.\n• *Ambulatorial (Monif I):* Ceftriaxona 500 mg IM dose única + Doxiciclina 100 mg 12/12h VO 14d + Metronidazol 500 mg 12/12h VO 14d.\n• *Hospitalar (Monif II-IV):* Ceftriaxona 1g IV + Doxiciclina ou Clindamicina + Gentamicina." }
  };

  var conf = mapaTelasGo[data];
  if (!conf) return false;

  responderCallbackTelegram(cb.id, conf.titulo);
  if (typeof conf.tela === "function") return conf.tela(ctx.chatId, ctx.msgId);
  return enviarMensagemComTecladoParaChat(ctx.chatId, conf.fallbackTxt, {
    inline_keyboard: [[{ text: "🔙 Hub G&O", callback_data: "ux:rotina:go" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]]
  });
}

/**
 * PROTOCOLOS DE PARADA CARDIORRESPIRATÓRIA (PCR & ACLS)
 */
function tratarCallbackPcrProtocolos_(cb, data, ctx) {
  var chatId = ctx.chatId;
  var msgId = ctx.msgId;
  if (!chatId) return true;

  if (data === "pcr_chocavel") {
    responderCallbackTelegram(cb.id, "Ritmo Chocável (FV/TV)");
    return tratarComandoPcr(chatId, "chocavel", msgId);
  }
  if (data === "pcr_naochocavel") {
    responderCallbackTelegram(cb.id, "Não Chocável (AESP/Assistolia)");
    return tratarComandoPcr(chatId, "nao chocavel", msgId);
  }
  if (data === "pcr_gestante") {
    responderCallbackTelegram(cb.id, "PCR na Gestante");
    return tratarComandoPcr(chatId, "gestante", msgId);
  }
  if (data === "pcr_pals") {
    responderCallbackTelegram(cb.id, "PALS Pediátrico");
    return tratarComandoPcr(chatId, "ped", msgId);
  }
  if (data === "pals_10kg") {
    responderCallbackTelegram(cb.id, "PALS 10 kg");
    return tratarComandoPcr(chatId, "ped 10kg", msgId);
  }
  if (data === "pals_20kg") {
    responderCallbackTelegram(cb.id, "PALS 20 kg");
    return tratarComandoPcr(chatId, "ped 20kg", msgId);
  }
  if (data === "pcr_gest_sulfato") {
    responderCallbackTelegram(cb.id, "Antídoto MgSO4 (Gluconato)");
    return tratarComandoPcr(chatId, "gestante sulfato", msgId);
  }
  if (data === "pcr_gest_cesarea") {
    responderCallbackTelegram(cb.id, "Cesariana Perimortem 4 min");
    return tratarComandoPcr(chatId, "gestante cesarea", msgId);
  }

  var cache = (typeof uxCache === "function") ? uxCache() : CacheService.getScriptCache();

  if (data === "pcr_droga_adrena") {
    responderCallbackTelegram(cb.id, "Adrenalina 1 mg");
    var txtAdrena = "💉 *PCR: ADRENALINA (EPINEFRINA) 1 MG — DIRETRIZES ACLS*\n\n" +
      "🔴 *DOSE & POSOLOGIA:*\n" +
      "• *Dose Adulto:* *1 mg IV/IO* (1 ampola 1 mg/mL pura ou diluída em 9 mL SF 0.9%).\n" +
      "• *Intervalo:* Administrar *a cada 3 a 5 minutos* durante todo o suporte avançado.\n\n" +
      "⏱️ *TIMING DE ADMINISTRAÇÃO:*\n" +
      "• *Ritmo NÃO Chocável (AESP / Assistolia):* Administrar *IMEDIATAMENTE no Ciclo 1* assim que obtido acesso IV/IO!\n" +
      "• *Ritmo Chocável (FV / TVSP):* Administrar *após o 2º Choque* (início do Ciclo 2).\n\n" +
      "💧 *FLUSH & ELEVAÇÃO MANDATÓRIOS:*\n" +
      "• Bólus IV rápido seguido imediatamente de *flush de 20 mL de SF 0.9%*.\n" +
      "• *Elevar o membro por 10 a 20 segundos* para acelerar o retorno venoso central.\n\n" +
      "🫁 *VIA AÉREA AVANÇADA (IOT / MÁSCARA LARÍNGEA):*\n" +
      "• NÃO interromper as compressões torácicas para intubação.\n" +
      "• Com via aérea instalada: 1 ventilação a cada 2 a 3 segundos (10 ventilações/min) e compressões torácicas contínuas (100-120 cpm).";
    var ckAdrena = Utilities.getUuid().replace(/-/g, "");
    safePutCache(cache, ckAdrena, txtAdrena, 21600);
    var kbAdrena = {
      inline_keyboard: [
        [{ text: "📋 Copiar para Prontuário", callback_data: "ux:copiar:" + ckAdrena }],
        [{ text: "⚡ Ritmo Chocável", callback_data: "pcr_chocavel" }, { text: "🫀 Não Chocável", callback_data: "pcr_naochocavel" }],
        [{ text: "💉 Amiodarona 300mg", callback_data: "pcr_droga_amiodarona" }, { text: "⏱️ Ciclo 2 min & RCP", callback_data: "pcr_ciclo_2min" }],
        [{ text: "🔍 5 Hs & 5 Ts", callback_data: "pcr_5hs_5ts" }, { text: "⚡ Cuidados Pós-RCE", callback_data: "pcr_pos_rce" }],
        [{ text: "🔙 Sala Vermelha", callback_data: "ux:sala" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    };
    if (typeof enviarTelaBot === "function") return enviarTelaBot(chatId, txtAdrena, kbAdrena, msgId);
    return enviarMensagemComTecladoParaChat(chatId, txtAdrena, kbAdrena);
  }

  if (data === "pcr_droga_amiodarona") {
    responderCallbackTelegram(cb.id, "Amiodarona 300mg / 150mg");
    var txtAmio = "💉 *PCR: AMIODARONA & ANTIARRÍTMICOS — DIRETRIZES ACLS*\n\n" +
      "⚡ *AMIODARONA (FV / TV SEM PULSO REFRATÁRIA):*\n" +
      "• *1ª Dose (Pós-3º Choque):* *300 mg IV/IO* em bólus rápido (2 ampolas de 150 mg/3 mL) + flush 20 mL SF 0.9%.\n" +
      "• *2ª Dose:* *150 mg IV/IO* em bólus rápido (1 ampola) após mais 1 ou 2 ciclos de RCP (após o 4º ou 5º choque).\n\n" +
      "🧪 *DROGA ALTERNATIVA: Lidocaína 2%*\n" +
      "• Indicada se Amiodarona indisponível ou hipersensibilidade prévia:\n" +
      "• *1ª Dose:* 1,0 a 1,5 mg/kg IV/IO em bólus rápido.\n" +
      "• *2ª Dose:* 0,5 a 0,75 mg/kg IV/IO nos ciclos subsequentes.\n" +
      "• *Dose máxima acumulada:* 3,0 mg/kg.\n\n" +
      "⚡ *SULFATO DE MAGNÉSIO 50% (TORSADES DE POINTES):*\n" +
      "• Indicação: FV/TV associada a QT longo ou suspeita de Torsades de Pointes.\n" +
      "• *Dose:* *2 g IV/IO* (4 mL de MgSO₄ 50%) diluído em 10 mL de SG 5% ou SF 0.9% em 1 a 2 minutos.";
    var ckAmio = Utilities.getUuid().replace(/-/g, "");
    safePutCache(cache, ckAmio, txtAmio, 21600);
    var kbAmio = {
      inline_keyboard: [
        [{ text: "📋 Copiar para Prontuário", callback_data: "ux:copiar:" + ckAmio }],
        [{ text: "⚡ Ritmo Chocável", callback_data: "pcr_chocavel" }, { text: "💉 Adrenalina 1mg", callback_data: "pcr_droga_adrena" }],
        [{ text: "⏱️ Ciclo 2 min & RCP", callback_data: "pcr_ciclo_2min" }, { text: "🔍 5 Hs & 5 Ts", callback_data: "pcr_5hs_5ts" }],
        [{ text: "⚡ Cuidados Pós-RCE", callback_data: "pcr_pos_rce" }],
        [{ text: "🔙 Sala Vermelha", callback_data: "ux:sala" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    };
    if (typeof enviarTelaBot === "function") return enviarTelaBot(chatId, txtAmio, kbAmio, msgId);
    return enviarMensagemComTecladoParaChat(chatId, txtAmio, kbAmio);
  }

  if (data === "pcr_ciclo_2min") {
    responderCallbackTelegram(cb.id, "Ciclo RCP 2 min");
    var txtCiclo = "⏱️ *DIRETRIZES DE RCP DE ALTA QUALIDADE (CICLO DE 2 MINUTOS)*\n\n" +
      "🖐️ *MÉTRICAS DAS COMPRESSÕES TORÁCICAS (AHA / SBC):*\n" +
      "• *Frequência:* 100 a 120 cpm (compressões por minuto).\n" +
      "• *Profundidade:* 5 a 6 cm no terço inferior do esterno (adulto).\n" +
      "• *Retorno Completo do Tórax:* Permitir descompressão total a cada movimento (não apoiar o peso sobre o tórax).\n" +
      "• *Minimizar Interrupções:* Pausas < 10 segundos apenas para checar ritmo e chocar.\n" +
      "• *Revezamento:* Trocar o socorrista das compressões *A CADA 2 MINUTOS* ou antes se exaustão.\n\n" +
      "🌬️ *VENTILAÇÃO & VIA AÉREA:*\n" +
      "• *Sem via aérea avançada:* Relação 30:2 com bolsa-válvula-máscara e O₂ a 15 L/min.\n" +
      "• *Com via aérea avançada (IOT / ML):* Compressões contínuas + 1 ventilação a cada 2 a 3 segundos (10 ventilações/min). NÃO HIPERVENTILAR!\n" +
      "• *Capnografia (EtCO₂):* Se < 10 mmHg indica RCP ineficaz. Elevação abrupta para > 35-40 mmHg indica provável Retorno da Circulação Espontânea (RCE)!\n\n" +
      "📏 *SE ASSISTOLIA — PROTOCOLO DA LINHA RETA MANDATÓRIO:*\n" +
      "1. Checar cabos e conexão dos eletrodos/pás.\n" +
      "2. Aumentar o ganho do monitor ao máximo.\n" +
      "3. Mudar a derivação do monitor (ex: de DII para DI) para descartar FV fina oculta!";
    var ckCiclo = Utilities.getUuid().replace(/-/g, "");
    safePutCache(cache, ckCiclo, txtCiclo, 21600);
    var kbCiclo = {
      inline_keyboard: [
        [{ text: "📋 Copiar para Prontuário", callback_data: "ux:copiar:" + ckCiclo }],
        [{ text: "⚡ Ritmo Chocável", callback_data: "pcr_chocavel" }, { text: "🫀 Não Chocável", callback_data: "pcr_naochocavel" }],
        [{ text: "💉 Adrenalina 1mg", callback_data: "pcr_droga_adrena" }, { text: "🔍 5 Hs & 5 Ts", callback_data: "pcr_5hs_5ts" }],
        [{ text: "⚡ Cuidados Pós-RCE", callback_data: "pcr_pos_rce" }],
        [{ text: "🔙 Sala Vermelha", callback_data: "ux:sala" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    };
    if (typeof enviarTelaBot === "function") return enviarTelaBot(chatId, txtCiclo, kbCiclo, msgId);
    return enviarMensagemComTecladoParaChat(chatId, txtCiclo, kbCiclo);
  }

  if (data === "pcr_5hs_5ts") {
    responderCallbackTelegram(cb.id, "Checklist 5Hs & 5Ts");
    var txt5H5T = "🔍 *CAUSAS REVERSÍVEIS DE PCR: 5 Hs & 5 Ts COM CONDUTA IMEDIATA*\n\n" +
      "🔴 *OS 5 Hs:*\n" +
      "1. *Hipovolemia:* Cristaloide rápido (SF 0.9% / RL 1000-2000 mL) ou hemotransfusão se sangramento agudo.\n" +
      "2. *Hipóxia:* FiO₂ 100%, checar posicionamento, desobstrução e expansibilidade simétrica do tubo endotraqueal.\n" +
      "3. *H⁺ (Acidose Metabólica):* Otimizar ventilação. Bicarbonato de Sódio 8.4% 1 mEq/kg IV se acidose grave preexistente ou hipercalemia.\n" +
      "4. *Hipo / Hipercalemia:*\n" +
      "   • *Hipercalemia:* Gluconato de Cálcio 10% 20-30 mL IV + Glicoinsulina (10 UI regular + 50 mL SG 50%) + NaHCO₃.\n" +
      "   • *Hipocalemia:* Reposição rápida de KCl venoso sob RCP.\n" +
      "5. *Hipotermia:* Aquecimento ativo (mantas térmicas, infusão aquecida a 39-42°C).\n\n" +
      "🔵 *OS 5 Ts:*\n" +
      "1. *Tensão no Tórax (Pneumotórax Hipertensivo):* Toracostomia imediata com agulha (2º EIC linha hemiclavicular ou 4º/5º EIC linha axilar anterior) seguida de dreno de tórax.\n" +
      "2. *Tamponamento Cardíaco:* Pericardiocentese de alívio por punção subxifoide guiada por POCUS/USG.\n" +
      "3. *Toxinas / Intoxicações:* Naloxona 0.4 a 2 mg IV se opioides; Emulsão lipídica 20% se anestésicos locais; Flumazenil se BZD.\n" +
      "4. *Trombose Pulmonar (TEP Maciço):* Trombolítico imediato (Alteplase rtPA 50 mg em bólus IV ou 100 mg em 2h); manter RCP contínua por 60 a 90 minutos.\n" +
      "5. *Trombose Coronariana (IAM):* Ponte para Angioplastia Primária / Cateterismo Cardíaco (CATE) imediato após RCE.";
    var ck5H5T = Utilities.getUuid().replace(/-/g, "");
    safePutCache(cache, ck5H5T, txt5H5T, 21600);
    var kb5H5T = {
      inline_keyboard: [
        [{ text: "📋 Copiar para Prontuário", callback_data: "ux:copiar:" + ck5H5T }],
        [{ text: "⚡ Ritmo Chocável", callback_data: "pcr_chocavel" }, { text: "🫀 Não Chocável", callback_data: "pcr_naochocavel" }],
        [{ text: "💉 Adrenalina 1mg", callback_data: "pcr_droga_adrena" }, { text: "⚡ Cuidados Pós-RCE", callback_data: "pcr_pos_rce" }],
        [{ text: "🔙 Sala Vermelha", callback_data: "ux:sala" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    };
    if (typeof enviarTelaBot === "function") return enviarTelaBot(chatId, txt5H5T, kb5H5T, msgId);
    return enviarMensagemComTecladoParaChat(chatId, txt5H5T, kb5H5T);
  }

  if (data === "pcr_pos_rce") {
    responderCallbackTelegram(cb.id, "Cuidados Pós-RCE");
    var txtPosRce = "⚡ *CUIDADOS PÓS-RESSUSCITAÇÃO IMEDIATA (RCE — RETORNO DA CIRCULAÇÃO)*\n\n" +
      "1️⃣ *OTIMIZAÇÃO HEMODINÂMICA:*\n" +
      "• *Alvo de Pressão:* PAM ≥ 65 mmHg e PAS ≥ 90 mmHg.\n" +
      "• *Suporte Vasoativo:* Iniciar infusão de *Noradrenalina* (0,1 a 1,0 mcg/kg/min) se hipotensão persistente. Considerar Dobutamina se choque cardiogênico pós-parada.\n\n" +
      "2️⃣ *VENTILAÇÃO & OXIGENAÇÃO:*\n" +
      "• *Alvo de SpO2:* 92% a 98% (92-98%, EVITAR hiperóxia FiO₂ 100% desnecessária!).\n" +
      "• *Normocapnia:* PaCO₂ 35 a 45 mmHg (EtCO₂ 35 a 40 mmHg). Evitar hipocapnia (vasoconstrição cerebral).\n\n" +
      "3️⃣ *ESTRATÉGIA CORONARIANA IMEDIATA (ECG 12 DERIVAÇÕES):*\n" +
      "• Realizar ECG de 12 derivações IMEDIATAMENTE.\n" +
      "• Se *Supra de ST* ou suspeita clínica elevada de infarto -> Acionar Cateterismo Cardíaco de Emergência (CATE / Angioplastia Primária imediata).\n\n" +
      "4️⃣ *CONTROLE DIRECIONADO DE TEMPERATURA (CDT):*\n" +
      "• Indicado se paciente permanecer comatoso / não responsivo pós-RCE.\n" +
      "• *Temperatura Alvo:* 32°C a 36°C constante por no mínimo 24 horas.\n" +
      "• Prevenir ativamente febre (> 37,7°C) nas primeiras 72 horas pós-PCR.\n\n" +
      "5️⃣ *AVALIAÇÃO METABÓLICA & NEUROLÓGICA:*\n" +
      "• Glicemia: manter 140 a 180 mg/dL (evitar rigorosamente hipoglicemia < 80).\n" +
      "• Gasometria, lactato, eletrólitos (K+, Mg++, Ca++) e TC de crânio se suspeita de etiologia neurológica.";
    var ckPosRce = Utilities.getUuid().replace(/-/g, "");
    safePutCache(cache, ckPosRce, txtPosRce, 21600);
    var kbPosRce = {
      inline_keyboard: [
        [{ text: "📋 Copiar para Prontuário", callback_data: "ux:copiar:" + ckPosRce }],
        [{ text: "⚡ Ritmo Chocável", callback_data: "pcr_chocavel" }, { text: "🫀 Não Chocável", callback_data: "pcr_naochocavel" }],
        [{ text: "🔍 5 Hs & 5 Ts", callback_data: "pcr_5hs_5ts" }, { text: "💉 Adrenalina 1mg", callback_data: "pcr_droga_adrena" }],
        [{ text: "🔙 Sala Vermelha", callback_data: "ux:sala" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    };
    if (typeof enviarTelaBot === "function") return enviarTelaBot(chatId, txtPosRce, kbPosRce, msgId);
    return enviarMensagemComTecladoParaChat(chatId, txtPosRce, kbPosRce);
  }

  return false;
}

/**
 * PROTOCOLOS DE ARRITMIAS CARDÍACAS (ACLS)
 */
function tratarCallbackArritmiasCardiacas_(cb, data, ctx) {
  var chatId = ctx.chatId;
  var msgId = ctx.msgId;
  if (!chatId) return true;

  var mapaArritmias = {
    "arritmia_menu": { sub: "", titulo: "Central de Arritmias" },
    "arritmia_instavel": { sub: "instavel", titulo: "Arritmia Instável (CVE)" },
    "arritmia_tsv": { sub: "tsv", titulo: "Taquicardia Supra (TSV)" },
    "arritmia_tv": { sub: "tv", titulo: "TV Monomórfica" },
    "arritmia_fa": { sub: "fa", titulo: "FA / Flutter" },
    "arritmia_bradi": { sub: "bradi", titulo: "Bradicardia & BAV" }
  };

  var conf = mapaArritmias[data];
  if (!conf) return false;

  responderCallbackTelegram(cb.id, conf.titulo);
  return tratarComandoArritmia(chatId, "/arritmia", conf.sub, msgId);
}

/**
 * SALA VERMELHA & ATALHOS DE EMERGÊNCIA
 */
function tratarCallbackSalaVermelha_(cb, data, ctx) {
  responderCallbackTelegram(cb.id, "Sala Vermelha");
  if (!ctx.chatId) return true;
  if (typeof enviarMenuSalaVermelha === "function") {
    return enviarMenuSalaVermelha(ctx.chatId, ctx.msgId);
  }
  return true;
}

/**
 * EXAMES FÍSICOS ESPECIAIS (ef_*)
 */
function tratarCallbackExamesFisicos_(cb, data, ctx) {
  if (data === "ef_menu") {
    responderCallbackTelegram(cb.id, "Abrindo catálogo de exames...");
    return enviarMenuExamesEspeciais(ctx.chatId);
  }
  var tipoEf = data.replace("ef_", "");
  responderCallbackTelegram(cb.id, "Abrindo guia de EF " + tipoEf.toUpperCase() + "...");
  return responderComGuiaExameFisico(ctx.chatId, tipoEf);
}

// ─────────────────────────────────────────────────────────────────────────────
// TABELA DE DESPACHO O(1) PARA CALLBACKS EXATOS
// ─────────────────────────────────────────────────────────────────────────────

var MAPA_CALLBACKS_EXATOS_ = {
  // Rotina e Produtividade
  "rotina_agenda": tratarCallbackRotinaProdutividade_,
  "rotina_tasks": tratarCallbackRotinaProdutividade_,
  "rotina_briefing": tratarCallbackRotinaProdutividade_,
  "rotina_checkin": tratarCallbackRotinaProdutividade_,
  "rotina_semana": tratarCallbackRotinaProdutividade_,
  "rotina_plantao_fim": tratarCallbackRotinaProdutividade_,
  "rotina_duvida": tratarCallbackRotinaProdutividade_,
  "rotina_timeline": tratarCallbackRotinaProdutividade_,

  // Ajuda geral
  "ajuda_todas": tratarCallbackAjuda_,

  // Calculadoras menu principal
  "calc_menu_principal": tratarCallbackCalculadoras_,

  // Preceptor socrático
  "preceptor_gerar_soap": tratarCallbackPreceptorSocratico_,
  "preceptor_encerrar": tratarCallbackPreceptorSocratico_,

  // Enfermaria
  "enfermaria_passagem": tratarCallbackEnfermaria_,
  "enfermaria_atualizar": tratarCallbackEnfermaria_,
  "enfermaria_add": tratarCallbackEnfermaria_,
  "enfermaria_alta": tratarCallbackEnfermaria_,
  "enfermaria_round": tratarCallbackEnfermaria_,
  "enfermaria_plantao_iniciar": tratarCallbackEnfermaria_,
  "enfermaria_limpar_confirma": tratarCallbackEnfermaria_,
  "enfermaria_limpar_executa": tratarCallbackEnfermaria_,

  // Diabetes & Metabolismo
  "dm_cad_ehh": tratarCallbackDiabetesMetabolismo_,
  "dm_glicemia": tratarCallbackDiabetesMetabolismo_,
  "dm_insulina": tratarCallbackDiabetesMetabolismo_,
  "dm_remume": tratarCallbackDiabetesMetabolismo_,

  // Anemia
  "anemia_etiologia": tratarCallbackAnemiaGanzoni_,
  "anemia_ganzoni": tratarCallbackAnemiaGanzoni_,

  // DHE
  "dhe_hipo": tratarCallbackDhe_,
  "dhe_hiper": tratarCallbackDhe_,
  "dhe_k": tratarCallbackDhe_,

  // Hub G&O
  "go_prenatal": tratarCallbackGinecologiaObstetricia_,
  "go_parto": tratarCallbackGinecologiaObstetricia_,
  "go_hpp": tratarCallbackGinecologiaObstetricia_,
  "go_mgso4": tratarCallbackGinecologiaObstetricia_,
  "go_prematuridade": tratarCallbackGinecologiaObstetricia_,
  "go_toxo": tratarCallbackGinecologiaObstetricia_,
  "go_corrimento": tratarCallbackGinecologiaObstetricia_,
  "go_preventivo": tratarCallbackGinecologiaObstetricia_,
  "go_anticoncepcao": tratarCallbackGinecologiaObstetricia_,
  "go_dip": tratarCallbackGinecologiaObstetricia_,

  // Protocolos PCR / ACLS
  "pcr_chocavel": tratarCallbackPcrProtocolos_,
  "pcr_naochocavel": tratarCallbackPcrProtocolos_,
  "pcr_gestante": tratarCallbackPcrProtocolos_,
  "pcr_pals": tratarCallbackPcrProtocolos_,
  "pcr_droga_adrena": tratarCallbackPcrProtocolos_,
  "pcr_droga_amiodarona": tratarCallbackPcrProtocolos_,
  "pcr_ciclo_2min": tratarCallbackPcrProtocolos_,
  "pcr_5hs_5ts": tratarCallbackPcrProtocolos_,
  "pcr_pos_rce": tratarCallbackPcrProtocolos_,
  "pals_10kg": tratarCallbackPcrProtocolos_,
  "pals_20kg": tratarCallbackPcrProtocolos_,
  "pcr_gest_sulfato": tratarCallbackPcrProtocolos_,
  "pcr_gest_cesarea": tratarCallbackPcrProtocolos_,

  // Arritmias
  "arritmia_menu": tratarCallbackArritmiasCardiacas_,
  "arritmia_instavel": tratarCallbackArritmiasCardiacas_,
  "arritmia_tsv": tratarCallbackArritmiasCardiacas_,
  "arritmia_tv": tratarCallbackArritmiasCardiacas_,
  "arritmia_fa": tratarCallbackArritmiasCardiacas_,
  "arritmia_bradi": tratarCallbackArritmiasCardiacas_,

  // Sala Vermelha
  "ux:hub:sala": tratarCallbackSalaVermelha_,
  "ux:sala": tratarCallbackSalaVermelha_,
  "ux:hub:emerg": tratarCallbackSalaVermelha_
};

// ─────────────────────────────────────────────────────────────────────────────
// LISTA DE DESPACHO PARA CALLBACKS POR PREFIXO
// ─────────────────────────────────────────────────────────────────────────────

var ROTEADORES_PREFIXO_CALLBACKS_ = [
  { prefix: "habit_", handler: tratarCallbackHabitoEEnergia_ },
  { prefix: "energy_", handler: tratarCallbackHabitoEEnergia_ },
  { prefix: "rotina:", handler: function(cb, data, ctx) {
      if (typeof ehUsuarioTitular === "function" && !ehUsuarioTitular(ctx.chatId)) {
        responderCallbackTelegram(cb.id, "🔒 A rotina e timeline adaptativa são exclusivas do titular.", true);
        return true;
      }
      return (typeof tratarCallbackRotina === "function") ? tratarCallbackRotina(cb) : false;
    }
  },
  { prefix: "ajuda_cat_", handler: tratarCallbackAjuda_ },
  { prefix: "gerarRound_", handler: tratarCallbackGerarRound_ },
  { prefix: "incorporarSoap_", handler: tratarCallbackIncorporarLaudoSoap_ },
  { prefix: "incorporarLaudoSoap_", handler: tratarCallbackIncorporarLaudoSoap_ },
  { prefix: "calc_cat_", handler: tratarCallbackCalculadoras_ },
  { prefix: "calc:", handler: tratarCallbackCalculadoras_ },
  { prefix: "calc_", handler: tratarCallbackCalculadoras_ },
  { prefix: "salvarNotion_", handler: tratarCallbackNotionTasks_ },
  { prefix: "gerarPdfRx_", handler: tratarCallbackPrescricaoEFarmaco_ },
  { prefix: "rx_med:", handler: tratarCallbackPrescricaoEFarmaco_ },
  { prefix: "ped_med:", handler: tratarCallbackPrescricaoEFarmaco_ },
  { prefix: "hsl_med:", handler: tratarCallbackPrescricaoEFarmaco_ },
  { prefix: "ouvirPreceptor_", handler: tratarCallbackPreceptorSocratico_ },
  { prefix: "ef_", handler: tratarCallbackExamesFisicos_ }
];

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL: ROTEAMENTO ELEGANTE & SEGURO
// ─────────────────────────────────────────────────────────────────────────────

function processarCallbackBotao(cb) {
  if (!cb) return;

  try {
    if (typeof tratarCallbackUX !== "undefined" && tratarCallbackUX(cb)) return;

    var data = cb.data || "";

    // Fast-path: extração de receita SOAP
    if (data.indexOf("ux:soap:extrair_rx") === 0) {
      var ckSoap = data.replace(/^ux:soap:extrair_rx:?/, "").trim();
      var chatExtrair = (cb.message && cb.message.chat && cb.message.chat.id) ? cb.message.chat.id : (cb.from ? cb.from.id : null);
      if (typeof executarExtracaoReceitaSoap === "function") {
        return executarExtracaoReceitaSoap(chatExtrair, ckSoap, cb.message ? cb.message.message_id : null);
      }
    }

    var ctx = obterContextoCallback_(cb);

    // 1. Despacho direto O(1) para comandos exatos
    var handlerExato = MAPA_CALLBACKS_EXATOS_[data];
    if (handlerExato) {
      return handlerExato(cb, data, ctx);
    }

    // 2. Despacho por prefixos conhecidos
    for (var i = 0; i < ROTEADORES_PREFIXO_CALLBACKS_.length; i++) {
      var item = ROTEADORES_PREFIXO_CALLBACKS_[i];
      if (data.startsWith(item.prefix)) {
        return item.handler(cb, data, ctx);
      }
    }

    // 3. Catch-all para callbacks não reconhecidos
    responderCallbackTelegram(cb.id, "⚠️ Ação não reconhecida.");

  } catch (errCb) {
    if (typeof console !== "undefined" && console.error) {
      console.error("[Telegram Callback Error]", errCb);
    }
    if (cb && cb.id && typeof responderCallbackTelegram === "function") {
      try {
        responderCallbackTelegram(cb.id, "⚠️ Ocorreu um erro ao processar o botão.");
      } catch (_) {}
    }
  }
}
