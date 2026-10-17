/**
 * ==============================================================================
 * MÓDULO 07B: TELEGRAM PRECEPTOR SOCRÁTICO
 * ==============================================================================
 * Gerenciamento de diálogo pedagógico socrático beira-leito, persistência de
 * sessões de preceptoria e respostas de voz/áudio com IA para treinamento clínico.
 * ==============================================================================
 */

/**
 * ==============================================================================
 * GERENCIAMENTO DE ESTADO E DIÁLOGO DO PRECEPTOR SOCRÁTICO
 * ==============================================================================
 */

function obterDialogoPreceptor(chatId) {
  var cache = CacheService.getScriptCache();
  var raw = (typeof safeGetCache === "function") ? safeGetCache(cache, "preceptor_" + chatId) : cache.get("preceptor_" + chatId);
  if (!raw) return null;
  try {
    var obj = JSON.parse(raw);
    if (obj && obj.updatedAt && (new Date().getTime() - obj.updatedAt > 1800 * 1000)) {
      limparDialogoPreceptor(chatId);
      return null;
    }
    return obj;
  } catch (e) {
    return null;
  }
}

function salvarDialogoPreceptor(chatId, dados) {
  var cache = CacheService.getScriptCache();
  if (!dados) return;
  dados.updatedAt = new Date().getTime();
  var str = JSON.stringify(dados);
  if (typeof safePutCache === "function") {
    safePutCache(cache, "preceptor_" + chatId, str, 1800);
  } else {
    cache.put("preceptor_" + chatId, str, 1800);
  }
}

function limparDialogoPreceptor(chatId) {
  var cache = CacheService.getScriptCache();
  try {
    cache.remove("preceptor_" + chatId);
  } catch (e) {}
}

function processarRespostaPreceptorSocratico(chatId, textoResposta, ehAudio) {
  var dialogo = obterDialogoPreceptor(chatId);
  var respostaLimpa = (textoResposta || "").trim();

  // 1. Transição explícita para SOAP ou prontuário
  var querSoap = /^(?:\/soap\b|gerar\s+soap|gerar\s+o\s+soap|ver\s+soap|s[íi]ntese\s+soap|prontu[áa]rio|fechar\s+plano)/i.test(respostaLimpa);
  if (querSoap) {
    limparDialogoPreceptor(chatId);
    var casoParaSoap = (dialogo && dialogo.caso_base) ? dialogo.caso_base : respostaLimpa;
    if (dialogo && dialogo.historico && dialogo.historico.length > 0) {
      var histFormatado = dialogo.historico.map(function(h) {
        return (h.papel === "preceptor" ? "Preceptor: " : "Médico: ") + h.texto;
      }).join("\n");
      casoParaSoap += "\n\n[Discussão Socrática e Raciocínio Clínico]:\n" + histFormatado;
    }
    if (typeof definirModoBot !== "undefined") {
      definirModoBot(chatId, "soap", casoParaSoap);
    }
    return processarEEntregarIA(chatId, gerarSOAPComIA, casoParaSoap, "soap");
  }

  // 2. Encerramento explícito da discussão
  var querEncerrar = /^(?:\/cancelar|\/novo|encerrar|parar|sair|fim|cancelar)\b/i.test(respostaLimpa);
  if (querEncerrar) {
    limparDialogoPreceptor(chatId);
    if (typeof limparEstadoBot === "function") {
      try { limparEstadoBot(chatId); } catch (e) {}
    }
    return enviarMensagemComTecladoFixo(chatId, "🛑 *Discussão socrática encerrada.* Teclado principal restaurado.");
  }

  // 3. Feedback visual no chat
  if (ehAudio) {
    enviarChatAction(chatId, "record_voice", true);
  } else {
    enviarChatAction(chatId, "typing", true);
  }

  var casoBase = dialogo ? (dialogo.caso_base || "") : "";
  var perguntaAnterior = dialogo ? (dialogo.ultima_pergunta || "") : "";
  var historicoStr = "";
  var nomeMedicoHist = (typeof obterNomeTratamentoUsuario === "function") ? obterNomeTratamentoUsuario(chatId) : "Médico(a)";
  if (dialogo && dialogo.historico && dialogo.historico.length > 0) {
    historicoStr = dialogo.historico.slice(-6).map(function(h) {
      return (h.papel === "preceptor" ? "Preceptor: " : (nomeMedicoHist + ": ")) + h.texto;
    }).join("\n");
  }

  var replicaPreceptor = null;

  // Se o preceptor estava aguardando o médico relatar o caso clínico:
  if (dialogo && dialogo.aguardando_caso) {
    casoBase = respostaLimpa;
    if (typeof gerarProvocacaoPreceptorAudio === "function") {
      try {
        replicaPreceptor = gerarProvocacaoPreceptorAudio(casoBase);
      } catch (eProv) {
        Logger.log("Erro em gerarProvocacaoPreceptorAudio: " + (eProv.message || eProv));
      }
    }
    if (!replicaPreceptor) {
      replicaPreceptor = "Compreendido o quadro clínico. Qual é a principal hipótese diagnóstica e a conduta imediata para descartar gravidade?";
    }
  } else if (typeof gerarDialogoPreceptorSocratico === "function") {
    try {
      replicaPreceptor = gerarDialogoPreceptorSocratico(casoBase, perguntaAnterior, respostaLimpa, historicoStr);
    } catch (eDiag) {
      Logger.log("Erro em gerarDialogoPreceptorSocratico: " + (eDiag.message || eDiag));
    }
  }

  if (!replicaPreceptor) {
    replicaPreceptor = "Compreendido o seu raciocínio. Considerando este achado, qual é o próximo passo propedêutico ou terapêutico imediato?";
  }

  // Atualiza histórico do diálogo
  var novoHist = (dialogo && dialogo.historico) ? dialogo.historico.slice() : [];
  novoHist.push({ papel: "wagner", texto: respostaLimpa });
  novoHist.push({ papel: "preceptor", texto: replicaPreceptor });

  salvarDialogoPreceptor(chatId, {
    em_andamento: true,
    aguardando_caso: false,
    caso_base: casoBase,
    ultima_pergunta: replicaPreceptor,
    historico: novoHist
  });
  if (typeof definirModoBot !== "undefined") {
    definirModoBot(chatId, "voz", casoBase);
  }

  var kbAcoes = {
    "inline_keyboard": [
      [
        {"text": "📋 Gerar SOAP", "callback_data": "preceptor_gerar_soap"},
        {"text": "🛑 Encerrar", "callback_data": "preceptor_encerrar"}
      ]
    ]
  };

  // 4. Se a resposta veio por áudio, prioriza responder com voz neural do preceptor
  if (ehAudio) {
    enviarChatAction(chatId, "record_voice", true);
    if (typeof renovarChatActionSeNecessario === "function") {
      renovarChatActionSeNecessario(chatId, "record_voice");
    }
    var blobVoz = sintetizarVozPreceptor(replicaPreceptor);
    if (blobVoz) {
      var legendaVoz = "🎧 *Preceptor Socrático:*\n" + replicaPreceptor;
      var okVoz = enviarAudioVozTelegram(chatId, blobVoz, legendaVoz, kbAcoes);
      if (okVoz) return true;
    }
  }

  // 5. Se a resposta veio por texto (ou se a síntese de voz falhou), envia texto com botão para ouvir no fone
  var cacheKey = Utilities.getUuid().replace(/-/g, "");
  safePutCache(CacheService.getScriptCache(), cacheKey, replicaPreceptor, 21600);
  var kbTexto = {
    "inline_keyboard": [
      [
        {"text": "🎧 Ouvir no Fone", "callback_data": "ouvirPreceptor_" + cacheKey},
        {"text": "📋 Gerar SOAP", "callback_data": "preceptor_gerar_soap"}
      ],
      [
        {"text": "🛑 Encerrar", "callback_data": "preceptor_encerrar"}
      ]
    ]
  };

  return enviarMensagemComTecladoParaChat(chatId, "🎧 *Preceptor Socrático:*\n\n" + replicaPreceptor, kbTexto);
}

/**
 * Responde diretamente com Áudio de Voz Neural do Preceptor Socrático
 */
function responderPreceptorVozComIA(chatId, casoOuDuvida, opcoes) {
  opcoes = opcoes || {};
  enviarChatAction(chatId, "record_voice", true);

  var kbAcoes = {
    "inline_keyboard": [
      [
        {"text": "📋 Gerar SOAP", "callback_data": "preceptor_gerar_soap"},
        {"text": "🛑 Encerrar", "callback_data": "preceptor_encerrar"}
      ]
    ]
  };

function extrairTextoLocucaoSoap_(texto) {
  if (!texto) return "";
  var t = String(texto).trim();
  var matchAvaliacao = t.match(/(?:🧠\s*\*?AVALIA[ÇC][ÃA]O|Hipótese|Conduta)[\s\S]*/i);
  if (matchAvaliacao && matchAvaliacao[0].length >= 30) {
    return matchAvaliacao[0].trim();
  }
  return t;
}

  // Se opcoes.apenasNarrar === true ou se opcoes.textoPronto foi fornecido, pula a geração de texto e vai direto para TTS
  // (usado pelo callback "Ouvir no Fone" para narrar texto já existente)
  var textoBaseNarrar = (opcoes && opcoes.textoPronto) || (opcoes && opcoes.apenasNarrar && casoOuDuvida);
  if (textoBaseNarrar) {
    enviarChatAction(chatId, "record_voice", true);
    var textoLocucao = extrairTextoLocucaoSoap_(textoBaseNarrar);
    var resDireto = (typeof gerarAudioPreceptorDireto === "function")
      ? gerarAudioPreceptorDireto(null, { textoPronto: textoLocucao })
      : null;
    var blobNarrado = (resDireto && resDireto.audioBlob) || sintetizarVozPreceptor(typeof _iaTextoFalado === "function" ? _iaTextoFalado(textoLocucao) : textoLocucao);
    if (blobNarrado) {
      var resumoLegenda = String(textoLocucao).trim();
      if (resumoLegenda.length > 750) {
        var corteLeg = resumoLegenda.substring(0, 746);
        var ultimoPonto = Math.max(corteLeg.lastIndexOf("."), corteLeg.lastIndexOf("\n"), corteLeg.lastIndexOf(" "));
        resumoLegenda = (ultimoPonto > 400 ? corteLeg.substring(0, ultimoPonto) : corteLeg) + "...";
      }
      var numAst = (resumoLegenda.match(/\*/g) || []).length;
      if (numAst % 2 !== 0) resumoLegenda += "*";
      var numCrases = (resumoLegenda.match(/`/g) || []).length;
      if (numCrases % 2 !== 0) resumoLegenda += "`";
      var legendaNarrada = "🎧 *Áudio Clínico - Preceptor:*\n" + resumoLegenda;
      var enviadoNarrado = enviarAudioVozTelegram(chatId, blobNarrado, legendaNarrada, kbAcoes);
      if (enviadoNarrado) return true;
    }
    // Se a síntese ou envio falhar, emite aviso claro sem poluir o chat com duplicação de texto
    return enviarMensagemParaChat(
      chatId,
      "⚠️ *Transmissão de Áudio:* Não foi possível processar a locução de voz no momento devido a indisponibilidade temporária. O caso clínico e as condutas permanecem disponíveis acima."
    );
  }

  // Variável que preserva texto entre modo direto e fallback,
  // evitando chamar o LLM de novo se apenas o TTS falhou
  var textoGeradoDireto = null;

  // 1. MODO RÁPIDO: Geração direta de áudio em tempo único (Single-Pass Audio)
  if (typeof gerarAudioPreceptorDireto === "function") {
    try {
      var resDireto = gerarAudioPreceptorDireto(casoOuDuvida, opcoes);
      if (resDireto && resDireto.audioBlob) {
        enviarChatAction(chatId, "record_voice", true);
        if (typeof renovarChatActionSeNecessario === "function") {
          renovarChatActionSeNecessario(chatId, "record_voice");
        }
        var txtDir = String(resDireto.texto || "");
        var numAstDir = (txtDir.match(/\*/g) || []).length;
        if (numAstDir % 2 !== 0) txtDir += "*";
        var numCrDir = (txtDir.match(/`/g) || []).length;
        if (numCrDir % 2 !== 0) txtDir += "`";
        var legendaDireta = "🎧 *Preceptor Socrático:*\n" + txtDir;
        salvarDialogoPreceptor(chatId, {
          em_andamento: true,
          caso_base: casoOuDuvida,
          ultima_pergunta: resDireto.texto,
          historico: [{ papel: "preceptor", texto: resDireto.texto }]
        });
        if (typeof definirModoBot !== "undefined") {
          definirModoBot(chatId, "voz", casoOuDuvida);
        }
        var enviadoDireto = enviarAudioVozTelegram(chatId, resDireto.audioBlob, legendaDireta, kbAcoes);
        if (enviadoDireto) return true;
      }
      // Se o modo direto gerou texto mas o envio/TTS falhou,
      // preserva o texto para o fallback não precisar chamar o LLM de novo
      if (resDireto && resDireto.texto) {
        textoGeradoDireto = resDireto.texto;
      }
    } catch (eDireto) {
      Logger.log("Geração direta de áudio falhou; recorrendo ao modo em dois tempos: " + eDireto.message);
    }
  }

  // 2. FALLBACK RESILIENTE EM DOIS TEMPOS (Texto -> TTS)
  // CORREÇÃO: reutiliza textoGeradoDireto se disponível, evitando chamada LLM redundante
  enviarChatAction(chatId, "record_voice", true);
  if (typeof renovarChatActionSeNecessario === "function") {
    renovarChatActionSeNecessario(chatId, "record_voice");
  }
  var provocacao = textoGeradoDireto || gerarProvocacaoPreceptorAudio(casoOuDuvida);
  if (!provocacao) {
    provocacao = "Diante deste quadro clínico, qual é a principal hipótese diagnóstica e a conduta imediata para descartar gravidade?";
  }
  salvarDialogoPreceptor(chatId, {
    em_andamento: true,
    caso_base: casoOuDuvida,
    ultima_pergunta: provocacao,
    historico: [{ papel: "preceptor", texto: provocacao }]
  });
  if (typeof definirModoBot !== "undefined") {
    definirModoBot(chatId, "voz", casoOuDuvida);
  }

  enviarChatAction(chatId, "record_voice", true);
  if (typeof renovarChatActionSeNecessario === "function") {
    renovarChatActionSeNecessario(chatId, "record_voice");
  }
  var audioBlob = sintetizarVozPreceptor(provocacao);
  if (audioBlob) {
    var legenda = "🎧 *Preceptor Socrático:*\n" + provocacao;
    var enviado = enviarAudioVozTelegram(chatId, audioBlob, legenda, kbAcoes);
    if (enviado) return true;
  }

  // 3. FALLBACK FINAL EM TEXTO COM BOTÃO INLINE
  var cacheKey = Utilities.getUuid().replace(/-/g, "");
  safePutCache(CacheService.getScriptCache(), cacheKey, provocacao, 21600);
  var kbTexto = {
    "inline_keyboard": [
      [
        {"text": "🎧 Ouvir no Fone", "callback_data": "ouvirPreceptor_" + cacheKey},
        {"text": "📋 Gerar SOAP", "callback_data": "preceptor_gerar_soap"}
      ],
      [
        {"text": "🛑 Encerrar", "callback_data": "preceptor_encerrar"}
      ]
    ]
  };
  return enviarMensagemComTecladoParaChat(chatId, "🎧 *Preceptor Socrático:*\n\n" + provocacao, kbTexto);
}

/**
 * Inicia ou convida para uma discussão clínica com o Preceptor Socrático.
 * Se houver um caso recente (últimos 15 min), oferece opções de retomar ou iniciar novo caso.
 * Se não houver caso, pergunta diretamente o que o médico quer discutir, sem inventar dados aleatórios.
 */
function iniciarOuConvidarDiscussaoPreceptor(chatId, opcoes) {
  opcoes = opcoes || {};
  var ehAudio = !!opcoes.ehAudio;
  var contextoCache = CacheService.getScriptCache();
  var contextoKey = "ctx_" + chatId;

  // 1. Verifica se há caso recente nos últimos 15 min
  var casoRecente = "";
  if (typeof obterContextoClinicoBot === "function") {
    casoRecente = obterContextoClinicoBot(chatId) || "";
  }
  if (!casoRecente) {
    casoRecente = contextoCache.get(contextoKey) || "";
  }
  if (!casoRecente && typeof modoBot === "function") {
    var estBot = modoBot(chatId);
    if (estBot && estBot.data && estBot.data.length >= 10) {
      casoRecente = estBot.data;
    }
  }

  var nomeDoutor = (typeof obterNomeTratamentoUsuario === "function") ? obterNomeTratamentoUsuario(chatId) : "Doutor(a)";
  var textoConvite = "Olá, " + nomeDoutor + "! Qual paciente ou caso você quer discutir agora? Pode ditar a história, sinais vitais ou a dúvida que estou ouvindo.";

  // 2. Prepara estado do preceptor aguardando relato do caso
  salvarDialogoPreceptor(chatId, {
    em_andamento: true,
    aguardando_caso: true,
    caso_base: "",
    ultima_pergunta: textoConvite,
    historico: [{
      papel: "preceptor",
      texto: textoConvite
    }]
  });

  if (typeof definirModoBot !== "undefined") {
    definirModoBot(chatId, "voz", "");
  }

  // 3. Se houver caso recente substantivo (>= 15 caracteres), oferece botões para continuar ou novo caso
  if (casoRecente && casoRecente.trim().length >= 15) {
    var resumoCaso = casoRecente.trim();
    if (resumoCaso.length > 80) {
      resumoCaso = resumoCaso.substring(0, 77) + "...";
    }

    var cacheKeyRecente = Utilities.getUuid().replace(/-/g, "");
    safePutCache(contextoCache, "prec_rec_" + cacheKeyRecente, casoRecente, 900);

    var textoComRecente = "🎧 *Preceptor Socrático:*\n\n" + textoConvite + "\n\n" +
      "📌 *Último caso na memória:* _\"" + resumoCaso.replace(/[*_`]/g, "") + "\"_";

    var kbBotoes = {
      "inline_keyboard": [
        [
          {"text": "🔄 Continuar caso anterior", "callback_data": "preceptor_retomar_" + cacheKeyRecente},
          {"text": "🆕 Novo caso", "callback_data": "preceptor_novo_caso"}
        ],
        [
          {"text": "🛑 Encerrar", "callback_data": "preceptor_encerrar"}
        ]
      ]
    };

    if (ehAudio) {
      enviarChatAction(chatId, "record_voice", true);
      var blobVozRecente = sintetizarVozPreceptor(textoConvite);
      if (blobVozRecente) {
        var enviadoVozRec = enviarAudioVozTelegram(chatId, blobVozRecente, textoComRecente, kbBotoes);
        if (enviadoVozRec) return true;
      }
    }

    return enviarMensagemComTecladoParaChat(chatId, textoComRecente, kbBotoes);
  }

  // 4. Sem caso recente: envio direto e limpo
  var cacheKeyAudio = Utilities.getUuid().replace(/-/g, "");
  safePutCache(contextoCache, cacheKeyAudio, textoConvite, 21600);

  var kbSimples = {
    "inline_keyboard": [
      [
        {"text": "🎧 Ouvir no Fone", "callback_data": "ouvirPreceptor_" + cacheKeyAudio},
        {"text": "🛑 Encerrar", "callback_data": "preceptor_encerrar"}
      ]
    ]
  };

  if (ehAudio) {
    enviarChatAction(chatId, "record_voice", true);
    var blobVozSimples = sintetizarVozPreceptor(textoConvite);
    if (blobVozSimples) {
      var legendaVoz = "🎧 *Preceptor Socrático:*\n\n" + textoConvite;
      var okVoz = enviarAudioVozTelegram(chatId, blobVozSimples, legendaVoz, kbSimples);
      if (okVoz) return true;
    }
  }

  return enviarMensagemComTecladoParaChat(chatId, "🎧 *Preceptor Socrático:*\n\n" + textoConvite, kbSimples);
}

