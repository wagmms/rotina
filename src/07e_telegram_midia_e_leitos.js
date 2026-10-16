/**
 * ==============================================================================
 * MÓDULO 07E: TELEGRAM MÍDIA & GESTÃO DE LEITOS
 * ==============================================================================
 * Processamento de mensagens de voz/áudio, imagens/fotos, download de mídia
 * e ditado clínico de evolução de leitos de enfermaria com extração de pendências.
 * ==============================================================================
 */

/**
 * ==============================================================================
 * DITADO DE CORREDOR: EVOLUÇÃO DE LEITO HOSPITALAR EM TEMPO ÚNICO
 * ==============================================================================
 */

function inferirStatusClinicoLeito(texto) {
  var t = String(texto || "").toLowerCase();
  if (/(?:choque|parada|pcr|rebaixou|iot|intubad[oa]|inst[aá]vel|dva|noradrenalina|vasopressor|grave|sedad[oa])/i.test(t)) {
    return "instavel";
  }
  if (/(?:febre|febril|pico febril|vigil[aâ]ncia|queda de satura|dessatur|ajuste|desmame|aguarda vaga|piora|alerta)/i.test(t)) {
    return "vigilancia";
  }
  if (/(?:alta\s+hospitalar|programo\s+alta|alta\s+amanh[aã]|alta\s+programada)/i.test(t)) {
    return "alta";
  }
  return "estavel";
}

function extrairPendenciasTexto(texto) {
  var t = String(texto || "");
  var pendencias = [];
  var mPend = t.match(/(?:pend[êe]ncia[s]?|checar|solicito|programo|aguardando|aguarda|colher|repetir)\s*[:=]?\s*([^.,;\n]+)/gi);
  if (mPend) {
    mPend.forEach(function(p) {
      var limpo = p.replace(/^(?:pend[êe]ncia[s]?|checar|solicito|programo|aguardando|aguarda|colher|repetir)\s*[:=]?\s*/i, "").trim();
      if (limpo.length >= 3 && pendencias.indexOf(limpo) === -1) {
        pendencias.push(limpo);
      }
    });
  }
  return pendencias;
}

function processarDitadoEvolucaoLeito(chatId, dadosLeitoAudio) {
  var numLeito = String(dadosLeitoAudio.numero_leito || "").replace(/^(?:leito|quarto)\s*/i, "").trim();
  var evolucao = String(dadosLeitoAudio.evolucao_texto || dadosLeitoAudio.transcricao || "").trim();
  var statusSugerido = String(dadosLeitoAudio.status_sugerido || "estavel").toLowerCase();
  var pendencias = Array.isArray(dadosLeitoAudio.pendencias) ? dadosLeitoAudio.pendencias : [];

  if (!numLeito || !evolucao) {
    return enviarMensagemParaChat(chatId, "⚠️ Não foi possível identificar o leito ou a evolução no relato.");
  }

  // Prepara texto para salvar com status explícito se não houver
  var textoParaGravar = evolucao;
  if (!/(?:^|\n)status:\s*/i.test(textoParaGravar)) {
    var mapaStTxt = { instavel: "instável", vigilancia: "vigilância", alta: "alta programada", estavel: "estável" };
    textoParaGravar += "\nStatus: " + (mapaStTxt[statusSugerido] || "estável");
  }

  // 1. Atualiza o leito na Enfermaria
  var resAtualizacao = EnfermariaService.atualizarLeito(numLeito, textoParaGravar);
  if (!resAtualizacao || !resAtualizacao.sucesso) {
    return enviarMensagemParaChat(chatId, "⚠️ Falha ao atualizar leito: " + ((resAtualizacao && (resAtualizacao.erro || resAtualizacao.mensagem)) || "erro desconhecido"));
  }

  var leitoRecente = EnfermariaService.obterLeito(numLeito) || resAtualizacao.leito;
  var statusFormatado = (leitoRecente && leitoRecente.status) ? leitoRecente.status : "⚪ Estável";
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
  var now = new Date();
  var horaAtual = Utilities.formatDate(now, tz, "HH:mm");
  var dataAtual = Utilities.formatDate(now, tz, "dd/MM/yyyy");

  // 2. Monta o texto limpo para o Prontuário Eletrônico (PEP)
  var textoPep = "LEITO " + numLeito + " · EVOLUÇÃO (" + dataAtual + " " + horaAtual + ")\n" +
    "Status: " + statusFormatado + "\n\n" +
    evolucao;
  if (pendencias.length > 0) {
    textoPep += "\n\nPendências: " + pendencias.join("; ");
  }

  // 3. Salva no cache para botão de cópia
  var cacheKeyPep = Utilities.getUuid().replace(/-/g, "");
  safePutCache(CacheService.getScriptCache(), cacheKeyPep, textoPep, 21600);

  // 4. Monta a mensagem no Telegram
  var msgTelegram = "🛏️ *LEITO " + numLeito + " · ATUALIZADO VIA VOZ*\n" +
    "⏱️ " + horaAtual + " · Status: *" + statusFormatado + "*\n\n" +
    "📝 *Evolução:*\n" + evolucao;

  if (pendencias.length > 0) {
    msgTelegram += "\n\n⏰ *Pendências do Plantão:*\n• " + pendencias.join("\n• ");
  }

  // 5. Botões ergonômicos de 1 toque
  var versaoLeito = (leitoRecente && leitoRecente.version) ? leitoRecente.version.slice(0, 8) : "";
  var limpoPep = typeof uxTextoProntuario === "function" ? uxTextoProntuario(textoPep) : textoPep;
  var btnCopiar;
  if (limpoPep.length >= 1 && limpoPep.length <= 256) {
    btnCopiar = { text: "📋 Copiar para Prontuário", copy_text: { text: limpoPep } };
  } else {
    btnCopiar = { text: "📋 Copiar para Prontuário", callback_data: "ux:copiar:" + cacheKeyPep };
  }

  var botoes = [
    [btnCopiar],
    [
      { text: "🟢 Estável", callback_data: "ux:status:" + numLeito + ":estavel" + (versaoLeito ? ":" + versaoLeito : "") },
      { text: "🟡 Vigilância", callback_data: "ux:status:" + numLeito + ":vigilancia" + (versaoLeito ? ":" + versaoLeito : "") },
      { text: "🔴 Instável", callback_data: "ux:status:" + numLeito + ":instavel" + (versaoLeito ? ":" + versaoLeito : "") }
    ],
    [
      { text: "🛏️ Abrir Leito " + numLeito, callback_data: "ux:leito:" + numLeito },
      { text: "🏥 Ver Enfermaria", callback_data: "ux:painel:0" }
    ],
    [
      { text: "🔙 Enfermaria", callback_data: "ux:hub:enf" },
      { text: "🏠 Início", callback_data: "ux:hub:inicio" }
    ]
  ];

  return enviarMensagemComBotoes(chatId, msgTelegram, { inline_keyboard: botoes });
}

function processarAudioMensagemTelegram(message) {
  return processarMensagemVoz(message);
}

function processarMensagemVoz(message) {
  var chatId = (message.chat && message.chat.id) ? message.chat.id : ConfigService.get("TELEGRAM_CHAT_ID");
  // Feedback imediato: transcrição + IA
  enviarChatAction(chatId, "typing");
  var midia = null;
  try {
    midia = medirEtapaBot('download_midia', function() { return baixarMidiaTelegram(message.voice || message.audio); });
    if (!midia || !midia.data) {
      return enviarMensagemParaChat(chatId, "⚠️ Não foi possível baixar o áudio do Telegram.");
    }

    var mimeAudio = String(midia.mime || "audio/ogg").split(";")[0].trim().toLowerCase();
    if (mimeAudio === "audio/oga" || mimeAudio === "audio/opus" || mimeAudio.indexOf("audio/ogg") !== -1) {
      mimeAudio = "audio/ogg";
    }

    var opcoesAudio = {
      caption: message.caption || "",
      chatId: chatId,
      fallbackOffline: true
    };

    // 1. Processamento Multimodal em Tempo Único (Single-Pass Audio-to-SOAP)
    var resAudio = null;
    if (typeof processarAudioClinicoMultimodal === "function") {
      try {
        resAudio = medirEtapaBot('processamento_audio', function() {
          return processarAudioClinicoMultimodal(midia.data, mimeAudio, opcoesAudio);
        });
      } catch (eAudio) {
        Logger.log("Aviso em processarAudioClinicoMultimodal: " + (eAudio.message || eAudio));
        resAudio = null;
      }
    }

    var transcricao = (resAudio && resAudio.transcricao) ? resAudio.transcricao : "";

    // Fallback defensivo para transcrição clássica (se o processador multimodal falhar ou em mocks simples)
    if (!transcricao) {
      try {
        var promptTrans = "Transcreva fielmente o áudio em português do Brasil com pontuação correta. Não acrescente introdução ou inferência. Retorne somente a transcrição literal.";
        var tFallback = chamarGeminiPoolMultimodal(midia.data, mimeAudio, promptTrans, "");
        if (tFallback && tFallback.trim()) {
          transcricao = tFallback.trim();
        }
      } catch (eTrans) {
        Logger.log("Aviso em transcrição clássica Gemini: " + (eTrans.message || eTrans));
      }
    }

    // Se ainda assim não houver transcrição nem relato clínico, recorrer ao Fallback Offline Local
    if (!transcricao && (!resAudio || !resAudio.eh_clinico)) {
      if (typeof IaLocalFallbackService !== "undefined" && IaLocalFallbackService && typeof IaLocalFallbackService.processarAudioClinicoOffline === "function") {
        try {
          var fbAudio = IaLocalFallbackService.processarAudioClinicoOffline(midia.data, mimeAudio, opcoesAudio);
          if (fbAudio && (fbAudio.transcricao || fbAudio.soapTexto || fbAudio.dadosObj)) {
            resAudio = fbAudio;
            transcricao = fbAudio.transcricao || "";
          }
        } catch (eFbAudio) {
          Logger.log("Aviso em fallback offline local de áudio: " + (eFbAudio.message || eFbAudio));
        }
      }
    }

    if (transcricao && transcricao.trim()) {
      var tLimpo = transcricao.trim();

      // Interceptação imediata: diálogo socrático ativo do Preceptor
      var diagVoz = (typeof obterDialogoPreceptor === "function") ? obterDialogoPreceptor(chatId) : null;
      if (diagVoz && diagVoz.em_andamento) {
        return processarRespostaPreceptorSocratico(chatId, tLimpo, true);
      }

      var modoAtual = typeof modoBot === "function" ? modoBot(chatId) : null;
      var estaNoModoVoz = modoAtual && modoAtual.mode === "voz";
      var querVoz = estaNoModoVoz || /(?:me\s+)?respond(?:a|e)\s+(?:com\s+|em\s+)?(?:um\s+)?[áa]udio|no\s+fone|fala\s+comigo|preceptor\s+socr[áa]tico|\bsabatina\b|manda\s+[áa]udio|^(?:preceptor|áudio|audio|no\s+fone)\b/i.test(tLimpo);

      if (querVoz) {
        var casoAudio = tLimpo.replace(/(?:me\s+)?respond(?:a|e)\s+(?:com\s+|em\s+)?(?:um\s+)?[áa]udio|no\s+fone|fala\s+comigo|preceptor\s+socr[áa]tico|\bsabatina\b|manda\s+[áa]udio|^(?:preceptor|áudio|audio|no\s+fone)\s*[:,-]?\s*/gi, "").trim();
        var contextoCache = CacheService.getScriptCache();
        var contextoKey = "ctx_" + chatId;
        var ehApenasChamadoVoz = !casoAudio || casoAudio.length < 5 || /^(?:ia|socr[áa]tico|bot|ajuda|online|plant[ãa]o|ouvir|fone|discutir|caso|um\s+caso)$/i.test(casoAudio);
        if (ehApenasChamadoVoz) {
          casoAudio = (typeof obterContextoClinicoBot === "function" ? obterContextoClinicoBot(chatId) : "") || contextoCache.get(contextoKey);
          if (!casoAudio) return enviarMensagemParaChat(chatId, "Envie o caso clínico antes de solicitar a resposta em áudio.");
        } else {
          safePutCache(contextoCache, contextoKey, casoAudio, 900);
        }
        return responderPreceptorVozComIA(chatId, casoAudio);
      }

      // 1. DITADO DE CORREDOR: Se for evolução de leito em tempo único:
      if (resAudio && resAudio.eh_clinico && (resAudio.tipo_relato === "leito" || (resAudio.dadosObj && resAudio.dadosObj.numero_leito))) {
        return processarDitadoEvolucaoLeito(chatId, resAudio.dadosObj || resAudio);
      }

      // 2. Se o motor multimodal de tempo único já estruturou o SOAP completo:
      if (resAudio && resAudio.eh_clinico && resAudio.soapTexto) {
        if (typeof definirModoBot !== "undefined") definirModoBot(chatId, "soap", tLimpo);
        var contextoCache = CacheService.getScriptCache();
        var contextoKey = "ctx_" + chatId;
        safePutCache(contextoCache, contextoKey, tLimpo, 900);
        enviarChatAction(chatId, "typing");
        return processarEEntregarIA(chatId, function() { return resAudio.soapTexto; }, tLimpo, "soap");
      }

      // 3. Roteamento direto de alta performance para ditados clínicos (Bypass de LLM intermediário):
      // 3.1. Emergência clínica (Sala Vermelha / PCR / Choque / Sepse)
      var ehEmerg = (typeof _iaEhEmergencia === "function")
        ? _iaEhEmergencia(tLimpo)
        : /(?:pcr|parada|parou|choque|chocand|sepse|infarto|\biam\b|anafila|intub|iot|tubo|rebaix|glasgow\s*[3-8]|sala\s+vermelha|c[oó]digo\s+azul)/i.test(tLimpo);
      if (ehEmerg) {
        enviarChatAction(chatId, "typing");
        return processarEEntregarIA(chatId, gerarCondutaEmergenciaComIA, tLimpo, "emergencia");
      }

      // 3.2. Prescrição médica ambulatorial / Receita
      var tnVoz = (typeof _iaNormalizarParaRegex === "function") ? _iaNormalizarParaRegex(tLimpo) : tLimpo.toLowerCase();
      var ehRx =
        // Termos explícitos e verbos médicos de prescrição
        /prescrev|receit|\brx\b|medicamento|rem[eé]dio/i.test(tLimpo) ||
        /(?:passa|passar|inicia|iniciar)\b.*(?:\d+\s*(?:mg|mcg|g|ml|gotas|ui)|comprimido|ampola|xarope|gotas|pomada|cp\b)/i.test(tLimpo) ||
        /(?:dose|posologia)\s+(?:para|pra|de|d[aeo])/i.test(tLimpo) ||
        // Padrão farmacológico puro: dose + frequência posológica de tomada
        /(?:\d+\s*(?:mg|mcg|g|ml|gotas|ui))\b.*(?:de\s*\d+\s*em\s*\d+\s*(?:horas?|h)?|[0-9]+\s*[\/x]\s*[0-9]+\s*h?|\d+\s*x(?:\s*ao)?\s*dia|uma\s+vez\s+ao\s+dia|se\s+dor|se\s+febre|se\s+necess[aá]rio|\bsn\b|\bem\s+jejum\b)/i.test(tLimpo) ||
        /(?:prescrev|passar\s+receita|medicamento\s+pr?[ao]|rem[eé]dio\s+pr?[ao]|dose\s+d[aeo]|posologia\s+d[aeo]|como\s+prescrever|\breceita\b)/.test(tnVoz);
      if (ehRx) {
        if (typeof definirModoBot !== "undefined") definirModoBot(chatId, "rx", tLimpo);
        enviarChatAction(chatId, "typing");
        return processarEEntregarIA(chatId, gerarPrescricaoComIA, tLimpo, "rx");
      }

      // 3.3. Gasometria arterial / Avaliação ácido-base
      var ehGaso = /\b(?:gaso|gasometria)\b/i.test(tLimpo) ||
        (/ph\s*[:=]?\s*[\d,.]+/i.test(tLimpo) && /(pco2|hco3|bicarbonato|\bbic\b|\bco2\b)/i.test(tLimpo)) ||
        (tLimpo.toLowerCase().indexOf("ph") !== -1 && (tLimpo.toLowerCase().indexOf("pco2") !== -1 || tLimpo.toLowerCase().indexOf("hco3") !== -1 || tLimpo.toLowerCase().indexOf("bicarb") !== -1));
      if (ehGaso) {
        enviarChatAction(chatId, "typing");
        return processarEEntregarIA(chatId, gerarAnaliseGasometriaComIA, tLimpo, "gaso");
      }

      // Feedback contínuo de digitação e roteamento para o processador semântico
      enviarChatAction(chatId, "typing");
      return processarMensagemTexto({chat: {id: chatId}, text: tLimpo});
    }

    // 2. Fallback multimodal direto caso a transcrição simples retorne vazia
    var promptSistema =
      "Você é o Copiloto Clínico Sênior e Assistente Pessoal Inteligente do Dr. Wagner (FMRP-USP).\n" +
      "Você recebeu este áudio gravado diretamente no celular pelo médico nos corredores do hospital ou em trânsito.\n\n" +
      "DIRETRIZES DE PROCESSAMENTO:\n" +
      "1. Se for RELATO CLÍNICO (caso de paciente, anamnese, exame físico, receita, conduta ou passagem de plantão):\n" +
      "   • EXTRAIA minuciosamente os dados clínicos e GERE UM DOCUMENTO ESTRUTURADO em formato SOAP, Receita Ambulatorial ou Passagem SBAR com rigor semiológico.\n" +
      "   • Organize os dados com terminologia clínica clara e padronizada.\n\n" +
      "2. Se for AGENDAMENTO DE COMPROMISSO (ex: 'marcar plantão amanhã às 7h no HC'):\n" +
      "   • Destaque no topo: [CALENDAR] com Título, Data, Horário de Início e Término.\n\n" +
      "3. Se for RELATO DE HÁBITO CUMPRIDO (ex: 'treinei na academia', 'estudei medquest'):\n" +
      "   • Destaque o cumprimento do hábito.\n\n" +
      "4. Se for TAREFA RÁPIDA: Estruture a ação com clareza para registro.\n\n" +
      "NUNCA use formatação LaTeX ($). Retorne a resposta em Markdown limpo e legível.";

    var caption = message.caption ? "Contexto adicional do usuário: " + message.caption : "";

    var resultadoAudio = null;
    try {
      resultadoAudio = chamarGeminiPoolMultimodal(midia.data, mimeAudio, promptSistema, caption);
    } catch (eChamarMulti) {
      Logger.log("Aviso em fallback multimodal direto: " + (eChamarMulti.message || eChamarMulti));
      resultadoAudio = null;
    }

    if (!resultadoAudio && typeof IaLocalFallbackService !== "undefined" && IaLocalFallbackService && typeof IaLocalFallbackService.processarAudioClinicoOffline === "function") {
      try {
        var fbFinal = IaLocalFallbackService.processarAudioClinicoOffline(midia.data, mimeAudio, opcoesAudio);
        if (fbFinal) {
          resultadoAudio = fbFinal.soapTexto || fbFinal.transcricao || "Áudio clínico registrado em contingência offline.";
        }
      } catch (eFbF) {
        Logger.log("Aviso em fallback final offline: " + (eFbF.message || eFbF));
      }
    }

    if (resultadoAudio) {
      // 1. Marca hábitos proativamente se citados no áudio
      marcarHabitoProativoHoje(resultadoAudio);

      // 2. Se o áudio for de agendamento do Calendar, tenta criar automaticamente
      if (resultadoAudio.indexOf("[CALENDAR]") !== -1 || resultadoAudio.toLowerCase().indexOf("marcar") !== -1 || resultadoAudio.toLowerCase().indexOf("agendar") !== -1) {
        var evDados = extrairDadosEventoCalendario(resultadoAudio);
        if (evDados && evDados.titulo && evDados.dataInicio) {
          var evCriado = criarEventoAgendaGoogle(evDados.titulo, evDados.dataInicio, evDados.dataFim, evDados.local, evDados.descricao);
          if (evCriado && evCriado.sucesso) {
            return enviarMensagemParaChat(chatId, evCriado.mensagem);
          }
        }
      }

      // Unificar com o wrapper de IA (mesmos botões de SOAP/RX/Copiar texto)
      return processarEEntregarIA(chatId, function(dados) { return dados; }, resultadoAudio, "audio");
    } else {
      enviarMensagemParaChat(chatId, "⚠️ Falha ao processar áudio com IA.");
    }
  } catch (err) {
    var msgErrVoz = (err && (err.message || err)) || "Erro desconhecido";
    Logger.log("Erro no processamento de voz: " + (err && err.stack ? err.stack : msgErrVoz));
    if (midia && midia.data && typeof IaLocalFallbackService !== "undefined" && IaLocalFallbackService && typeof IaLocalFallbackService.processarAudioClinicoOffline === "function") {
      try {
        var fbEmerg = IaLocalFallbackService.processarAudioClinicoOffline(midia.data, (midia.mime || "audio/ogg"), { caption: message.caption || "", chatId: chatId });
        if (fbEmerg && (fbEmerg.soapTexto || fbEmerg.transcricao)) {
          return processarEEntregarIA(chatId, function() { return fbEmerg.soapTexto || fbEmerg.transcricao; }, fbEmerg.transcricao || "", "audio");
        }
      } catch (eIgnore) {}
    }
    enviarMensagemParaChat(chatId, "⚠️ Erro ao processar áudio: " + msgErrVoz);
  }
}

function processarMensagemFoto(message) {
  var chatId = (message.chat && message.chat.id) ? message.chat.id : ConfigService.get("TELEGRAM_CHAT_ID");
  enviarChatAction(chatId, "typing");

  // Feedback visual instantâneo (< 300ms) para eliminar sensação de travamento no plantão
  var msgStatusId = null;
  try {
    var resStatus = enviarMensagemParaChat(chatId, "🩺 _Analisando imagem médica com IA (Vertex AI)..._");
    if (resStatus && resStatus.result && resStatus.result.message_id) {
      msgStatusId = resStatus.result.message_id;
    } else if (typeof resStatus === "number" || typeof resStatus === "string") {
      msgStatusId = resStatus;
    }
  } catch (eSt) {}

  try {
    var photos = message.photo;
    var fotoAlvo = null;
    if (photos && photos.length > 0) {
      // Alta resolução diagnóstica: seleciona a máxima fidelidade clínica útil.
      // Se a última foto for excessivamente gigantesca (>2560px) e houver alternativa >= 1000px, usa a ideal (~1280px).
      // Se photos tiver dimensões padrão do Telegram (onde a última é ~1280px ou 800px), seleciona sempre a maior disponível.
      var ult = photos[photos.length - 1];
      if (photos.length >= 2 && ult && ult.width && ult.width > 2560) {
        fotoAlvo = photos[photos.length - 2];
      } else {
        fotoAlvo = ult;
      }
    } else if (message.document) {
      fotoAlvo = message.document;
    }

    if (!fotoAlvo) {
      if (msgStatusId && typeof deletarMensagemTelegram === "function") deletarMensagemTelegram(chatId, msgStatusId);
      return enviarMensagemParaChat(chatId, "⚠️ Nenhuma imagem identificada na mensagem.");
    }

    var midia = medirEtapaBot('download_midia', function() { return baixarMidiaTelegram(fotoAlvo); });
    if (!midia || !midia.data) {
      if (msgStatusId && typeof deletarMensagemTelegram === "function") deletarMensagemTelegram(chatId, msgStatusId);
      return enviarMensagemParaChat(chatId, "⚠️ Falha ao baixar imagem do Telegram.");
    }

    enviarChatAction(chatId, "typing");
    var caption = message.caption ? message.caption.trim() : "";
    var resultadoImagem = (typeof analisarImagemMedicaComIA === "function")
      ? analisarImagemMedicaComIA(midia.data, midia.mime, caption)
      : chamarGeminiPoolMultimodal(
          midia.data,
          midia.mime,
          "Você é um Preceptor Sênior de Clínica Médica, Emergência e Radiologia da FMRP-USP. Analise a imagem detalhadamente com laudo estruturado e conduta prática imediata.",
          caption
        );

    // Remove a mensagem temporária de "Analisando..."
    if (msgStatusId && typeof deletarMensagemTelegram === "function") {
      try { deletarMensagemTelegram(chatId, msgStatusId); } catch (eDel) {}
    }

    if (resultadoImagem) {
      var cacheKey = Utilities.getUuid().replace(/-/g, "");
      safePutCache(CacheService.getScriptCache(), cacheKey, resultadoImagem, 21600);
      safePutCache(CacheService.getScriptCache(), "ctx_" + chatId, resultadoImagem, 900);

      var tecladoSalvar = {
        "inline_keyboard": [
          [
            { "text": "📋 Copiar Laudo", "callback_data": "ux:copiar:" + cacheKey },
            { "text": "➕ Incorporar ao SOAP", "callback_data": "incorporarSoap_" + cacheKey }
          ],
          [
            { "text": "🎧 Ouvir no Fone", "callback_data": "ouvirPreceptor_" + cacheKey },
            { "text": "📁 Salvar no Notion", "callback_data": "salvarNotion_imagem_" + cacheKey }
          ]
        ]
      };
      return enviarMensagemComTecladoParaChat(chatId, resultadoImagem, tecladoSalvar);
    } else {
      return enviarMensagemParaChat(chatId, "⚠️ Erro ao analisar imagem médica (IA não retornou resposta).");
    }
  } catch (err) {
    if (msgStatusId && typeof deletarMensagemTelegram === "function") {
      try { deletarMensagemTelegram(chatId, msgStatusId); } catch (eDelErr) {}
    }
    var msgErrFoto = (err && (err.message || err)) || "Erro desconhecido";
    Logger.log("Erro no processamento de foto: " + (err && err.stack ? err.stack : msgErrFoto));
    return enviarMensagemParaChat(chatId, "⚠️ Erro ao processar imagem: " + msgErrFoto);
  }
}

function baixarMidiaTelegram(arquivoBase) {
  if (!arquivoBase || !arquivoBase.file_id) return null;
  var token = ConfigService.get("TELEGRAM_BOT_TOKEN");
  if (!token) return null;
  try {
    var res = UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/getFile?file_id=" + arquivoBase.file_id, { "muteHttpExceptions": true });
    if (!res || res.getResponseCode() !== 200) {
      Logger.log("Falha ao obter metadados do arquivo Telegram: " + (res ? res.getResponseCode() : "sem resposta"));
      return null;
    }
    var json = null;
    try { json = JSON.parse(res.getContentText()); } catch (eJson) { return null; }
    if (!json || !json.ok || !json.result || !json.result.file_path) {
      Logger.log("Resposta inválida do Telegram getFile: " + res.getContentText());
      return null;
    }
    var path = json.result.file_path;
    var resArquivo = UrlFetchApp.fetch("https://api.telegram.org/file/bot" + token + "/" + path, { "muteHttpExceptions": true });
    if (!resArquivo || resArquivo.getResponseCode() !== 200) {
      Logger.log("Falha ao baixar binário da mídia do Telegram [" + path + "]: HTTP " + (resArquivo ? resArquivo.getResponseCode() : "sem resposta"));
      return null;
    }
    var blob = resArquivo.getBlob();

    var mime = (blob.getContentType() || "").toLowerCase();
    var p = path.toLowerCase();
    if (!mime || mime === "application/octet-stream" || mime === "audio/oga" || mime === "audio/opus") {
      if (p.endsWith(".jpg") || p.endsWith(".jpeg")) mime = "image/jpeg";
      else if (p.endsWith(".png")) mime = "image/png";
      else if (p.endsWith(".webp")) mime = "image/webp";
      else if (p.endsWith(".oga") || p.endsWith(".ogg")) mime = "audio/ogg";
      else if (p.endsWith(".mp3")) mime = "audio/mp3";
      else if (p.endsWith(".wav")) mime = "audio/wav";
      else if (p.endsWith(".m4a") || p.endsWith(".mp4")) mime = "audio/mp4";
      else if (p.endsWith(".pdf")) mime = "application/pdf";
      else if (arquivoBase.mime_type) mime = String(arquivoBase.mime_type).toLowerCase();
      else mime = "image/jpeg";
    }

    // Normalização estrita para os tipos aceitos pela API do Gemini
    if (mime === "audio/oga" || mime === "audio/opus" || mime.indexOf("audio/ogg") !== -1) {
      mime = "audio/ogg";
    } else if (mime.indexOf("image/jpeg") !== -1 || mime.indexOf("image/jpg") !== -1) {
      mime = "image/jpeg";
    } else if (mime.indexOf("image/png") !== -1) {
      mime = "image/png";
    } else if (mime.indexOf("image/webp") !== -1) {
      mime = "image/webp";
    }

    return { data: Utilities.base64Encode(blob.getBytes()), mime: mime };
  } catch (errMidia) {
    Logger.log("Erro inesperado em baixarMidiaTelegram: " + (errMidia.stack || errMidia.message || errMidia));
    return null;
  }
}
