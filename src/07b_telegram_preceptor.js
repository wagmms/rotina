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
  if (dialogo && dialogo.historico && dialogo.historico.length > 0) {
    historicoStr = dialogo.historico.slice(-6).map(function(h) {
      return (h.papel === "preceptor" ? "Preceptor: " : "Wagner: ") + h.texto;
    }).join("\n");
  }

  var replicaPreceptor = null;
  if (typeof gerarDialogoPreceptorSocratico === "function") {
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

  // Se opcoes.apenasNarrar === true, pula a geração de texto e vai direto para TTS
  // (usado pelo callback "Ouvir no Fone" para narrar texto já existente)
  if (opcoes.apenasNarrar && casoOuDuvida) {
    enviarChatAction(chatId, "record_voice", true);
    var blobNarrado = sintetizarVozPreceptor(casoOuDuvida);
    if (blobNarrado) {
      var legendaNarrada = "🎧 *Preceptor Socrático:*\n" + casoOuDuvida;
      var enviadoNarrado = enviarAudioVozTelegram(chatId, blobNarrado, legendaNarrada, kbAcoes);
      if (enviadoNarrado) return true;
    }
    // Se TTS falhar, entrega como texto
    var cacheKeyN = Utilities.getUuid().replace(/-/g, "");
    safePutCache(CacheService.getScriptCache(), cacheKeyN, casoOuDuvida, 21600);
    var kbTextoN = {
      "inline_keyboard": [
        [
          {"text": "🎧 Ouvir no Fone", "callback_data": "ouvirPreceptor_" + cacheKeyN},
          {"text": "📋 Gerar SOAP", "callback_data": "preceptor_gerar_soap"}
        ],
        [
          {"text": "🛑 Encerrar", "callback_data": "preceptor_encerrar"}
        ]
      ]
    };
    return enviarMensagemComTecladoParaChat(chatId, "🎧 *Preceptor Socrático:*\n\n" + casoOuDuvida, kbTextoN);
  }

  // Variável que preserva texto entre modo direto e fallback,
  // evitando chamar o LLM de novo se apenas o TTS falhou
  var textoGeradoDireto = null;

  // 1. MODO RÁPIDO: Geração direta de áudio em tempo único (Single-Pass Audio)
  if (typeof gerarAudioPreceptorDireto === "function") {
    try {
      var resDireto = gerarAudioPreceptorDireto(casoOuDuvida);
      if (resDireto && resDireto.audioBlob) {
        if (typeof renovarChatActionSeNecessario === "function") {
          renovarChatActionSeNecessario(chatId, "record_voice");
        }
        var legendaDireta = "🎧 *Preceptor Socrático:*\n" + resDireto.texto;
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
