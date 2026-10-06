/**
 * ==============================================================================
 * MÓDULO 07: HANDLERS DE MENSAGENS, MÍDIA E CALLBACKS DO TELEGRAM
 * ==============================================================================
 */

function processarMensagemTexto(message) {
  if (typeof tratarEntradaUX!=="undefined" && tratarEntradaUX(message)) return;
  var texto = message.text ? message.text.trim() : "";
  var textoLow = texto.toLowerCase();
  var chatId = (message.chat && message.chat.id) ? message.chat.id : ConfigService.get("TELEGRAM_CHAT_ID");
  if (!texto) return;

  var comando = textoLow.split(/\s/)[0];
  var contextoCache = CacheService.getScriptCache();
  var contextoKey = "ctx_" + chatId;

  // Gerenciamento de Memória (Contexto Clínico)
  if (comando === "/cancelar" || comando === "/novo" || texto === "🩺 Novo SOAP" || texto === "🧹 Novo Paciente" || texto === "🧹 Novo") {
    if (typeof limparEstadoBot === "function") {
      try { limparEstadoBot(chatId); } catch (eLimp) {}
    } else {
      contextoCache.remove(contextoKey);
      contextoCache.remove("modo_" + chatId);
      contextoCache.remove("leito_" + chatId);
      contextoCache.remove("dvaw_" + chatId);
      contextoCache.remove("pending_" + chatId);
    }
    if (typeof cancelarAcoesPendentes === "function") {
      try { cancelarAcoesPendentes(chatId); } catch (eCanc) {}
    }
    return enviarMensagemComTecladoFixo(chatId, "🧹 *Memória limpa.* Pronto para o próximo paciente!");
  }

  if (comando === "/manual") {
    return enviarManual(chatId);
  }

  // 1. ATALHOS DO TECLADO FIXO PERSISTENTE (1-TOQUE NO SMARTPHONE)
  if (texto === "📱 Cockpit" || texto === "📱 Cockpit Móvel" || comando === "/cockpit" || comando === "/app") {
    var urlPainel = obterUrlCockpit(chatId);
    var msgCockpit = "📱 *COCKPIT MÓVEL (TELEGRAM MINI APP)*\n\n" +
      "Seu assistente unificado com 6 abas de alta performance:\n\n" +
      "• 🧬 *Corpo:* Composição, peso e protocolo\n" +
      "• 🏥 *Leitos:* Painel da enfermaria e SBAR\n" +
      "• 💊 *REMUME:* Busca rápida de doses\n" +
      "• 🧮 *Cálculos:* DVA, SRI, CrCl e Gasometria\n" +
      "• 📅 *Rotina:* Turma J e MedQuest\n" +
      "• ✨ *SOAP:* Preceptor socrático e PEP\n\n" +
      "Toque no botão abaixo para abrir diretamente na tela do Telegram:";
    var kbCockpit = {
      inline_keyboard: [
        [
          { text: "🚀 Abrir Cockpit em Tela Cheia", web_app: { url: urlPainel } }
        ]
      ]
    };
    return enviarMensagemComBotoes(chatId, msgCockpit, kbCockpit);
  }

  if (comando === "/pc") {
    var partesPc = texto.split(/\s+/);
    var tarefaPc = partesPc[1] ? partesPc[1].toLowerCase() : "";
    var argsPc = partesPc.slice(2);

    if (!tarefaPc || tarefaPc === "ajuda" || tarefaPc === "help") {
      var msgAjudaPc = "🖥️ *PONTE DE EXECUÇÃO LOCAL (PC)*\n\n" +
        "Envie uma ordem para o seu computador executar em segundo plano:\n\n" +
        "• `/pc tenda` — Cotação quinzenal de carnes e compras no Tenda\n" +
        "• `/pc sync` — Sincronização avançada de agenda e MedQuest\n" +
        "• `/pc audit` — Auditoria de sobreposições no calendário\n" +
        "• `/pc voos` — Varredura do radar de passagens aéreas\n" +
        "• `/pc status` — Verifica se o daemon do PC está ativo\n\n" +
        "💡 *Funcionamento:* A ordem é enfileirada na nuvem. Se o seu PC estiver ligado, ele executa e devolve o relatório aqui. Se estiver desligado, roda assim que o PC for ligado!";
      return enviarMensagemParaChat(chatId, msgAjudaPc);
    }

    if (typeof enfileirarTarefaPc === "function") {
      var taskId = enfileirarTarefaPc(chatId, tarefaPc, argsPc);
      var msgOk = "⚡ *Ordem enfileirada na nuvem com sucesso!*\n\n" +
        "• *Tarefa:* `" + tarefaPc + "`\n" +
        "• *ID:* `" + taskId + "`\n\n" +
        "🕒 O runner local processará silenciosamente e enviará o relatório completo aqui assim que concluído.";
      return enviarMensagemParaChat(chatId, msgOk);
    } else {
      return enviarMensagemParaChat(chatId, "⚠️ Fila de tarefas locais temporariamente indisponível.");
    }
  }

  if (texto === "🚨 Sala Vermelha") {
    var txtSR = "🚨 *SALA VERMELHA & CTI (EMERGÊNCIAS CLÍNICAS)*\n\n" +
      "Escolha uma ação imediata ou digite o comando:\n\n" +
      "💉 *Drogas Vasoativas (DVA):*\n" +
      "• `/dva nora 70` (Noradrenalina em mL/h para 70kg)\n" +
      "• `/dva nora 80 concentrada` (Solução 2x)\n" +
      "• `/dva dobuta 70` (Dobutamina 1mg/mL)\n" +
      "• `/dva vaso` (Vasopressina dose fixa 12 mL/h)\n" +
      "• `/dva nipride 75` ou `/dva tridil`\n\n" +
      "🫁 *Sequência Rápida de Intubação (SRI / IOT):*\n" +
      "• `/sri 70` (Doses e mL exatos de Etomidato, Quetamina, Succinil, Rocurônio e Fentanil)\n" +
      "• `/sri 70 choque` ou `/sri 70 asma`\n\n" +
      "⚡ *Condutas de Ataque:* `/conduta <intercorrência>` (ex: `/conduta EAP hipertensivo`)";
    return enviarMensagemParaChat(chatId, txtSR);
  }

  if (texto === "💊 Prescrever") {
    return enviarMensagemParaChat(chatId, "💊 *PRESCRIÇÃO AMBULATORIAL (REMUME)*\n\nEnvie o pedido ou diagnóstico:\n💡 *Ex:* `/rx amigdalite bacteriana criança 18kg, alérgica a penicilina` ou apenas descreva o caso.");
  }

  if (texto === "🏥 Enfermaria") {
    var urlPainelEnf = obterUrlCockpit(chatId);
    var kbEnf = {
      "inline_keyboard": [
        [
          {"text": "📱 Abrir Painel Visual", "web_app": {"url": urlPainelEnf}},
          {"text": "📋 Gerar Passagem SBAR", "callback_data": "enfermaria_passagem"}
        ],
        [
          {"text": "🔄 Atualizar", "callback_data": "enfermaria_atualizar"}
        ]
      ]
    };
    return enviarMensagemComTecladoParaChat(chatId, EnfermariaService.formatarPainelBordo(), kbEnf);
  }

  if (texto === "📅 Agenda") {
    return consultarEventosAgenda("hoje", chatId);
  }

  if (texto === "📋 Minhas Tarefas") {
    return listarTarefasHojeNotion(chatId);
  }

  if (texto === "🩸 Gaso") {
    return enviarMensagemParaChat(chatId, "🩸 *GASOMETRIA ARTERIAL*\n\nEnvie os parâmetros:\n💡 *Ex:* `/gaso pH 7.24, pCO2 26, HCO3 11, Na 140, Cl 104, Alb 3.2`");
  }

  if (texto === "🏁 Fim de Plantão") {
    return gerarResumoFimPlantao(chatId);
  }

  if (texto === "🎧 Preceptor Voz") {
    if (typeof iniciarModoBot === "function") return iniciarModoBot(chatId, "voz", false);
    return enviarMensagemParaChat(chatId, "🎧 Grave ou envie um caso clínico para o Preceptor Socrático.");
  }

  if (texto === "🧠 Dúvida MedQuest") {
    return enviarMensagemParaChat(chatId, "🧠 *DÚVIDA MÉDICA (MEDQUEST)*\n\nDigite sua dúvida para arquivar no bloco de estudo noturno:\n💡 *Ex:* `/duvida Indicações de drenagem torácica no empiema`");
  }

  if (texto === "⚙️ Menu / Ajuda" || comando === "/teclado" || comando === "/menu") {
    if (typeof registrarComandosNativosTelegram === "function") {
      try { registrarComandosNativosTelegram(); } catch (eCmd) {}
    }
    if (typeof enviarHubPrincipal === "function") {
      return enviarHubPrincipal(chatId);
    }
    var msgTeclado = "⌨️ *Teclado de Acesso Rápido Ativado!*\n\nUse os botões na base do chat para navegação imediata de 1 toque no hospital e na rotina.";
    return enviarMensagemComTecladoFixo(chatId, msgTeclado);
  }

  // Se houver diálogo socrático ativo do Preceptor e Wagner enviou resposta de texto (não comando):
  var diagAtivo = (typeof obterDialogoPreceptor === "function") ? obterDialogoPreceptor(chatId) : null;
  if (diagAtivo && diagAtivo.em_andamento) {
    if (texto.charAt(0) !== "/" && !/^(?:📱|🚨|💊|🏥|📅|📋|🩸|🏁|🎧|🧠|⚙️)/.test(texto)) {
      return processarRespostaPreceptorSocratico(chatId, texto, false);
    }
  }

  // Se não for um comando com barra (/), verifica se tem contexto salvo para complementar
  if (texto.charAt(0) !== "/") {
    var contextoAnterior = contextoCache.get(contextoKey);
    if (contextoAnterior) {
      texto = contextoAnterior + "\n[Nova Informação do Usuário]: " + texto;
      comando = contextoAnterior.split(/\s/)[0].toLowerCase();
    }
  }

  var clinicos = ["/soap", "/rx", "/receita", "/plantao", "/sbar", "/calc", "/round", "/pitch", "/interacao", "/gaso", "/conduta", "/sos", "/dva", "/sri", "/iot", "/voz", "/sabatina"];

  // Se for comando clínico, salva no contexto de conversação (15 min)
  if (clinicos.indexOf(comando) !== -1) {
    if (comando !== "/voz" && comando !== "/sabatina" && typeof limparDialogoPreceptor === "function") {
      try { limparDialogoPreceptor(chatId); } catch (eLimparP) {}
    }
    if (texto.length > 6000) {
      return enviarMensagemParaChat(chatId, "⚠️ O caso excedeu o limite de caracteres. Use `/novo` e resuma.");
    }
    safePutCache(contextoCache, contextoKey, texto, 900); // compatibilidade
    if(typeof definirModoBot!=="undefined") {
      var mapaModos={"/soap":"soap","/rx":"rx","/receita":"rx","/gaso":"gaso","/voz":"voz","/sabatina":"voz","/calc":"calc","/plantao":"plantao","/sbar":"plantao","/round":"round","/pitch":"round","/interacao":"interacao","/conduta":"conduta","/sos":"conduta"};
      if(mapaModos[comando])definirModoBot(chatId,mapaModos[comando],texto.replace(/^\/\w+\s*/,""));
    }
  } else if (texto.charAt(0) === "/") {
    contextoCache.remove(contextoKey);
    if (typeof limparDialogoPreceptor === "function") {
      try { limparDialogoPreceptor(chatId); } catch (eLimparP2) {}
    }
  }

  // 2. AJUDA E START
  if (comando === "/start" || comando === "/ajuda" || comando === "/help") {
    if (typeof enviarHubPrincipal === "function") {
      if (comando === "/start") {
        enviarMensagemComTecladoFixo(chatId, "👋 *Olá, Dr. Wagner!* Use os botões ou envie seu caso por texto/áudio.");
      }
      return enviarHubPrincipal(chatId);
    }
    return enviarMensagemComTecladoFixo(chatId, "Use /menu para a Central de Comandos.");
  }

  if (comando === "/bio" || comando === "/mounjaro" || comando === "/composicao") {
    var urlCockpit = obterUrlCockpit(chatId);
    var kb = { inline_keyboard: [[{ text: "📱 Abrir Cockpit (Aba Perfil)", web_app: { url: urlCockpit } }]] };
    return enviarMensagemComBotoes(chatId, "📊 *Composição Corporal & Protocolo Mounjaro*\n\nAbra o Cockpit Móvel e navegue até a aba *Perfil* para ver e registrar seus dados.", kb);
  }

  if (comando === "/status" || comando === "/fontes") {
    var stRemume = checarStatusFonteDrive(ConfigService.get("SPREADSHEET_ID_REMUME"), false);
    var stInteracoes = checarStatusFonteDrive(ConfigService.get("SPREADSHEET_ID_INTERACOES"), true);
    var msgStatus = "⚡ *STATUS DO SISTEMA*\n\n" +
      "• *Modo:* Servidor Oficial Node.js 20+ / Docker (Render 24/7)\n" +
      "• *REMUME Ribeirão Preto:* " + stRemume + "\n" +
      "• *Base de Interações:* " + stInteracoes + "\n" +
      "• *Notion & Calendar:* ✅ Operacionais";
    return enviarMensagemParaChat(chatId, msgStatus);
  }

  // 3. COMANDOS CLÍNICOS E SALA VERMELHA
  if (comando === "/dva") {
    var dadosDva = texto.replace(/^\/dva\s*/i, "").trim();
    if (!dadosDva) {
      return enviarMensagemParaChat(chatId, "💉 *CALCULADORA DE DROGAS VASOATIVAS (DVA)*\n\nUso: `/dva <droga> <pesoKg> [solução]`\n💡 *Exemplos:*\n• `/dva nora 70` (Noradrenalina padrão)\n• `/dva nora 80 concentrada` (Solução 2x)\n• `/dva dobuta 65`\n• `/dva vaso`\n• `/dva nipride 75`\n• `/dva tridil`");
    }
    var partesDva = dadosDva.split(/\s+/);
    var nomeDroga = (partesDva[0] || "").toLowerCase();

    // Drogas de dose fixa independentes de peso (Vasopressina, Nitroglicerina/Tridil)
    var ehDoseFixa = (nomeDroga.indexOf("vaso") !== -1 || nomeDroga.indexOf("tridil") !== -1 || nomeDroga.indexOf("nitroglicerina") !== -1);

    var pesoDva = null;
    var solucaoDva = "padrao";

    if (ehDoseFixa) {
      if (partesDva.length > 1) {
        var pesoTest = sanitizarEValidarPesoKg(partesDva[1]);
        if (pesoTest !== null) {
          pesoDva = pesoTest;
          solucaoDva = partesDva.slice(2).join(" ") || "padrao";
        } else {
          solucaoDva = partesDva.slice(1).join(" ") || "padrao";
        }
      }
    } else {
      if (partesDva.length < 2 || !partesDva[1]) {
        return enviarMensagemParaChat(chatId, "⚠️ *Peso obrigatório:* Para " + partesDva[0] + ", informe o peso do paciente em kg.\n\n💡 *Exemplo:* `/dva " + partesDva[0] + " 70` ou `/dva " + partesDva[0] + " 70,5`");
      }
      pesoDva = sanitizarEValidarPesoKg(partesDva[1]);
      if (pesoDva === null) {
        return enviarMensagemParaChat(chatId, "⚠️ *Peso inválido:* \"" + partesDva[1] + "\" não é um peso válido em kg. Digite um valor numérico positivo (ex: `/dva " + partesDva[0] + " 70` ou `/dva " + partesDva[0] + " 70,5`).");
      }
      solucaoDva = partesDva.slice(2).join(" ") || "padrao";
    }

    try {
      var resDva = CalculadorasClinicas.drogasVasoativas(nomeDroga, pesoDva, solucaoDva);
      if (resDva && resDva.erro) {
        return enviarMensagemParaChat(chatId, "⚠️ " + resDva.erro);
      }
      if (resDva && resDva.textoFormatado) {
        var tecladoDva = resDva.botoes ? (resDva.botoes.inline_keyboard ? resDva.botoes : { inline_keyboard: resDva.botoes }) : null;
        if (tecladoDva) {
          return enviarMensagemComTecladoParaChat(chatId, resDva.textoFormatado, tecladoDva);
        } else {
          return enviarMensagemParaChat(chatId, resDva.textoFormatado);
        }
      }
      return enviarMensagemParaChat(chatId, "⚠️ Droga não reconhecida. Opções: `nora`, `dobuta`, `vaso`, `nipride`, `tridil`.");
    } catch (eDva) {
      Logger.log("Erro /dva: " + eDva.message);
      return enviarMensagemParaChat(chatId, "⚠️ Erro ao calcular DVA. Tente novamente.");
    }
  }

  if (comando === "/sri" || comando === "/iot") {
    var dadosSri = texto.replace(/^\/(sri|iot)\s*/i, "").trim();
    if (!dadosSri) {
      return enviarMensagemParaChat(chatId, "🫁 *SEQUÊNCIA RÁPIDA DE INTUBAÇÃO (SRI / IOT)*\n\nUso: `/sri <pesoKg> [contexto]`\n💡 *Exemplos:*\n• `/sri 70`\n• `/sri 80 choque`\n• `/sri 65 asma`\n• `/sri 75 tce`");
    }
    var partesSri = dadosSri.split(/\s+/);
    var pesoSri = sanitizarEValidarPesoKg(partesSri[0]);
    if (pesoSri === null) {
      return enviarMensagemParaChat(chatId, "⚠️ *Peso obrigatório e inválido para SRI/IOT:*\nInforme um peso numérico positivo em kg.\n\n💡 *Exemplo:* `/sri 70` ou `/sri 72,5 choque`");
    }
    var contextoSri = partesSri.slice(1).join(" ") || "padrao";
    try {
      var resSri = CalculadorasClinicas.sequenciaRapidaIntubacao(pesoSri, contextoSri);
      if (resSri && resSri.erro) {
        return enviarMensagemParaChat(chatId, "⚠️ " + resSri.erro);
      }
      if (resSri && resSri.textoFormatado) {
        var tecladoSri = resSri.botoes ? (resSri.botoes.inline_keyboard ? resSri.botoes : { inline_keyboard: resSri.botoes }) : null;
        if (tecladoSri) {
          return enviarMensagemComTecladoParaChat(chatId, resSri.textoFormatado, tecladoSri);
        } else {
          return enviarMensagemParaChat(chatId, resSri.textoFormatado);
        }
      }
      return enviarMensagemParaChat(chatId, "⚠️ Erro ao calcular SRI.");
    } catch (eSri) {
      Logger.log("Erro /sri: " + eSri.message);
      return enviarMensagemParaChat(chatId, "⚠️ Erro ao calcular SRI. Tente novamente.");
    }
  }

  if (comando === "/soap") {
    var casoClinico = texto.replace(/^\/soap\s*/i, "").trim();
    if (!casoClinico) return enviarMensagemParaChat(chatId, "🩺 Envie os dados. Ex: `/soap Mulher 68a epigastralgia...`");
    safePutCache(contextoCache, contextoKey, casoClinico, 900);
    if (typeof definirModoBot !== "undefined") definirModoBot(chatId, "soap", casoClinico);
    return processarEEntregarIA(chatId, gerarSOAPComIA, casoClinico, "soap");
  }

  if (comando === "/ef" || comando === "/exames" || comando === "/exames_especiais") {
    return enviarMenuExamesEspeciais(chatId);
  }
  if (comando === "/ef_neuro" || comando === "/neuro") return responderComGuiaExameFisico(chatId, "neuro");
  if (comando === "/ef_pqu" || comando === "/pqu" || comando === "/psiq") return responderComGuiaExameFisico(chatId, "pqu");
  if (comando === "/ef_oftalmo" || comando === "/oftalmo") return responderComGuiaExameFisico(chatId, "oftalmo");
  if (comando === "/ef_ortopo" || comando === "/ortopo" || comando === "/trauma" || comando === "/reumato") return responderComGuiaExameFisico(chatId, "ortopo");
  if (comando === "/ef_orl" || comando === "/otorrino" || comando === "/orl") return responderComGuiaExameFisico(chatId, "orl");
  if (comando === "/ef_dermato" || comando === "/dermato" || comando === "/pele") return responderComGuiaExameFisico(chatId, "dermato");
  if (comando === "/ef_gineco" || comando === "/gineco" || comando === "/go") return responderComGuiaExameFisico(chatId, "gineco");
  if (comando === "/ef_procto" || comando === "/procto" || comando === "/uro") return responderComGuiaExameFisico(chatId, "procto");
  if (comando === "/ef_ped" || comando === "/ped" || comando === "/pedia") return responderComGuiaExameFisico(chatId, "ped");
  if (comando === "/ef_geriatria" || comando === "/geriatria" || comando === "/aga") return responderComGuiaExameFisico(chatId, "geriatria");
  if (comando === "/ef_vascular" || comando === "/vascular" || comando === "/tvp") return responderComGuiaExameFisico(chatId, "vascular");

  if (comando === "/rx" || comando === "/receita") {
    var dadosPrescricao = texto.replace(/^\/(rx|receita)\s*/i, "").trim();
    if (!dadosPrescricao) return enviarMensagemParaChat(chatId, "💊 Envie o pedido. Ex: `/rx amigdalite 16kg, alergia a penicilina`");
    return processarEEntregarIA(chatId, gerarPrescricaoComIA, dadosPrescricao, "rx");
  }

  if (comando === "/dose" || comando === "/posologia" || comando === "/hsl") {
    var termoDose = texto.replace(/^\/(dose|posologia|hsl)\s*/i, "").trim();
    if (!termoDose) {
      return enviarMensagemParaChat(
        chatId,
        "💊 *CONSULTA DE POSOLOGIA OFICIAL (GUIA FARMACÊUTICO HSL)*\n\n" +
        "Envie o nome do medicamento para consultar as doses adultas, pediátricas, ajuste renal e disponibilidade na REMUME.\n\n" +
        "💡 *Exemplos:*\n" +
        "• `/dose amoxicilina`\n" +
        "• `/dose dipirona`\n" +
        "• `/dose ceftriaxona`\n" +
        "• `/dose losartana`\n" +
        "• `/dose amoxicilina + clavulanato`"
      );
    }
    return responderConsultaPosologiaHSL(chatId, termoDose);
  }

  if (comando === "/plantao" || comando === "/sbar") {
    var dadosPlantao = texto.replace(/^\/(plantao|sbar)\s*/i, "").trim();
    if (!dadosPlantao) return enviarMensagemParaChat(chatId, "🏥 Envie os dados. Ex: `/plantao Leito 12 PAC grave...`");
    return processarEEntregarIA(chatId, gerarPassagemPlantaoSBAR, dadosPlantao, "plantao");
  }

  // ENFERMARIA VIRTUAL MULTI-LEITOS
  if (comando === "/enfermaria") {
    var kbEnfPainel = {
      "inline_keyboard": [
        [
          {"text": "📋 Gerar Passagem SBAR", "callback_data": "enfermaria_passagem"},
          {"text": "🔄 Atualizar", "callback_data": "enfermaria_atualizar"}
        ]
      ]
    };
    return enviarMensagemComTecladoParaChat(chatId, EnfermariaService.formatarPainelBordo(), kbEnfPainel);
  }

  if (comando === "/leito") {
    var dadosLeito = texto.replace(/^\/leito\s*/i, "").trim();
    if (!dadosLeito) {
      return enviarMensagemParaChat(chatId, "🛏️ *ENFERMARIA VIRTUAL*\n\n" +
        "• Para ver ou atualizar: `/leito <número> <dados>`\n" +
        "💡 *Exemplo:* `/leito 4 72a, PAC grave, Ceftriaxona D3, aguarda vaga CTI`\n" +
        "• Para ver o leito: `/leito 4`\n" +
        "• Para ver todos: `/enfermaria`\n" +
        "• Para desocupar leito: `/alta 4`\n" +
        "• Para passagem geral: `/passagem`");
    }

    var matchLeito = dadosLeito.match(/^([a-zA-Z0-9_-]{1,24})(?:\s+([\s\S]+))?$/);
    if (matchLeito) {
      var numLeito = matchLeito[1];
      var infoLeito = matchLeito[2];

      if (!infoLeito) {
        var leitoAtual = EnfermariaService.obterLeito(numLeito);
        if (leitoAtual) {
          return enviarMensagemParaChat(chatId, "🛏️ *LEITO " + numLeito + "* [" + leitoAtual.status + "]\n" +
            "⏱️ *Atualizado às:* " + leitoAtual.atualizadoEm + "\n" +
            "📝 " + leitoAtual.dados + "\n\n" +
            "💡 Para atualizar: `/leito " + numLeito + " novos dados`\n" +
            "🟢 Para dar alta: `/alta " + numLeito + "`");
        } else {
          return enviarMensagemParaChat(chatId, "⚪ *Leito " + numLeito + " está vago.* Para ocupar, envie `/leito " + numLeito + " dados do paciente`.");
        }
      }

      var resAtualizacao = EnfermariaService.atualizarLeito(numLeito, infoLeito);
      return enviarMensagemParaChat(chatId, resAtualizacao.mensagem || resAtualizacao.erro);
    }
  }

  if (comando === "/alta") {
    var numAlta = texto.replace(/^\/alta\s*/i, "").trim();
    if (!numAlta) {
      return enviarMensagemParaChat(chatId, "🟢 Digite o número do leito a desocupar. Ex: `/alta 4`");
    }
    var resAlta = EnfermariaService.desocuparLeito(numAlta);
    return enviarMensagemParaChat(chatId, resAlta.mensagem);
  }

  if (comando === "/limpar_enfermaria") {
    var resLimpeza = EnfermariaService.limparTudo();
    return enviarMensagemParaChat(chatId, resLimpeza.mensagem);
  }

  if (comando === "/passagem") {
    var textoConsolidado = EnfermariaService.obterTextoConsolidadoParaPassagem();
    if (!textoConsolidado) {
      return enviarMensagemParaChat(chatId, "🏥 *Nenhum leito registrado na enfermaria para passar.* Registre os leitos usando `/leito <num> <dados>` antes de gerar a passagem.");
    }
    return processarEEntregarIA(chatId, gerarPassagemPlantaoSBAR, "PASSAGEM GERAL DE PLANTÃO DA ENFERMARIA (TODOS OS LEITOS ATIVOS):\n\n" + textoConsolidado, "plantao");
  }

  if (comando === "/plantao_fim") {
    return gerarResumoFimPlantao(chatId);
  }


  if (comando === "/gaso") {
    var dadosGaso = texto.replace(/^\/gaso\s*/i, "").trim();
    if (!dadosGaso) {
      return enviarMensagemParaChat(chatId, "🩸 *ANÁLISE DE GASOMETRIA ARTERIAL*\n\n" +
        "Envie os parâmetros gasométricos e eletrólitos:\n" +
        "• *pH*, *pCO2*, *HCO3* (obrigatórios)\n" +
        "• *Na*, *Cl*, *Albumina* (para Ânion Gap corrigido e Delta-Delta)\n" +
        "• *PaO2*, *FiO2* (para relação P/F)\n\n" +
        "💡 *Exemplo de envio:*\n" +
        "`/gaso pH 7.22, pCO2 28, HCO3 11, Na 140, Cl 102, Alb 3.0, PaO2 85, FiO2 21%`");
    }
    return processarEEntregarIA(chatId, gerarAnaliseGasometriaComIA, dadosGaso, "gaso");
  }

  if (comando === "/conduta" || comando === "/sos") {
    var dadosEmergencia = texto.replace(/^\/(conduta|sos)\s*/i, "").trim();
    if (!dadosEmergencia) {
      return enviarMensagemParaChat(chatId, "🚨 *CONDUTAS DE EMERGÊNCIA (SALA VERMELHA)*\n\n" +
        "Informe a intercorrência para receber conduta imediata em ampolas e mL:\n\n" +
        "💡 *Exemplos:*\n" +
        "• `/conduta EAP hipertensivo PA 220x120`\n" +
        "• `/conduta Anafilaxia em adulto`\n" +
        "• `/conduta Hipercalemia K 7.4 com onda T apiculada`\n" +
        "• `/conduta Crise convulsiva em curso há 6 minutos`\n" +
        "• `/conduta Cetoacidose diabética glicemia 480`");
    }
    return processarEEntregarIA(chatId, gerarCondutaEmergenciaComIA, dadosEmergencia, "conduta");
  }

  if (comando === "/calc") {
    var dadosCalc = texto.replace(/^\/calc\s*/i, "").trim();
    if (!dadosCalc) {
      return enviarMenuCategoriasCalculadoras(chatId);
    }

    if (ehApenasNomeCalculadora(dadosCalc)) {
      safePutCache(CacheService.getScriptCache(), contextoKey, "/calc Calculadora selecionada: " + dadosCalc + "\nDados do paciente: ", 900);
      var guias = obterInstrucoesCalculadora(dadosCalc);
      return enviarMensagemParaChat(chatId, guias);
    }

    var resDet = tentarCalcularDeterministico(dadosCalc);
    if (resDet) {
      return enviarMensagemParaChat(chatId, resDet);
    }

    // Se o usuário invocou uma calculadora reconhecida deterministicamente mas resDet não retornou resultado, NUNCA cai na IA!
    if (typeof ehCalculadoraReconhecida === "function" && ehCalculadoraReconhecida(dadosCalc)) {
      var instrucoes = obterInstrucoesCalculadora(dadosCalc);
      return enviarMensagemParaChat(chatId, "⚠️ *Calculadora Clínica: Parâmetros Insuficientes ou Inválidos*\n\n" + instrucoes);
    }

    return processarEEntregarIA(chatId, processarCalculadoraClinicaComIA, dadosCalc, "calc");
  }

  if (comando === "/round" || comando === "/pitch") {
    var dadosRound = texto.replace(/^\/(round|pitch)\s*/i, "").trim();
    if (!dadosRound) return enviarMensagemParaChat(chatId, "👨‍⚕️ Envie os dados do paciente.");
    return processarEEntregarIA(chatId, gerarPitchERoundComIA, dadosRound, "round");
  }

  if (comando === "/voz" || comando === "/sabatina" || comando === "/v" || comando === "/audio" || comando === "/a") {
    var dadosVoz = texto.replace(/^\/(voz|sabatina|v|audio|a)\s*/i, "").trim();
    if (!dadosVoz) {
      var casoMemoria = (typeof obterContextoClinicoBot === "function" ? obterContextoClinicoBot(chatId) : "") || contextoCache.get(contextoKey);
      if (casoMemoria && casoMemoria.length >= 5) {
        return responderPreceptorVozComIA(chatId, casoMemoria);
      }
      return enviarMensagemParaChat(chatId, "🎧 *PRECEPTOR SOCRÁTICO NO FONE DE OUVIDO*\n\n" +
        "Envie o caso clínico ou resumo do paciente para receber uma sabatina socrática em áudio de voz:\n" +
        "💡 *Exemplo:* `/v Paciente 68a, DPOC exacerbado, gasometria pH 7.28, pCO2 58, sonolento, iniciado VNI`");
    }
    return responderPreceptorVozComIA(chatId, dadosVoz);
  }

  if (comando === "/interacao") {
    var drogas = texto.replace(/^\/interacao\s*/i, "").trim();
    if (!drogas) return enviarMensagemParaChat(chatId, "💊 Informe os medicamentos para cruzar.");
    return processarEEntregarIA(chatId, verificarInteracaoComIA, drogas, "interacao");
  }

  // 4. AGENDA, TAREFAS E NOTION
  if (comando === "/agenda") {
    var paramAgenda = texto.replace(/^\/agenda\s*/i, "").trim();
    return consultarEventosAgenda(paramAgenda, chatId);
  }

  if (comando === "/task" || comando === "/tarefa") {
    var tarefaTexto = texto.replace(/^\/(task|tarefa)\s*/i, "").trim();
    if (!tarefaTexto) return enviarMensagemParaChat(chatId, "📋 Digite a tarefa a salvar no Inbox do Notion. Ex: `/task Revisar hemograma do leito 14`");
    var okTask = criarTarefaNotion(tarefaTexto, "Personal", "2 · Important", "Captura rápida via Telegram");
    if (okTask) return enviarMensagemParaChat(chatId, "✅ *Tarefa salva no Inbox do Notion Tasks!*");
    enviarMensagemParaChat(chatId, "❌ Falha ao salvar no Notion. O pedido foi preservado na fila.");
    throw new Error("FALHA_NOTION_CRIAR_TAREFA");
  }

  if (comando === "/tasks") {
    return listarTarefasHojeNotion(chatId);
  }

  if (comando === "/duvida") {
    var duvidaTexto = texto.replace(/^\/duvida\s*/i, "").trim();
    if (!duvidaTexto) return enviarMensagemParaChat(chatId, "🧠 Envie sua dúvida médica. Ex: `/duvida Critérios de Light para derrame pleural`");
    var okDuvida = salvarDuvidaEstudoNotion(duvidaTexto);
    if (okDuvida) return enviarMensagemParaChat(chatId, "🧠 *Dúvida arquivada no Notion para a sessão noturna do MedQuest!*");
    return enviarMensagemParaChat(chatId, "❌ Falha ao arquivar dúvida.");
  }

  if (comando === "/semana" || comando === "/relatorio") return enviarRelatorioSemanalHabitos(chatId);
  if (comando === "/checkin") return enviarCheckinNoturno(chatId);
  if (comando === "/briefing") return enviarBriefingMatinal(chatId);
  if (comando === "/rotina") {
    var argRotina = texto.replace(/^\/rotina\s*/i, "").trim();
    return tratarComandoRotina(chatId, argRotina);
  }

  // 4.1. COMANDOS DE EVIDÊNCIA CIENTÍFICA E PROTOCOLOS BRASILEIROS
  if (comando === "/evidencia" || comando === "/pubmed") {
    var termoEvidencia = texto.replace(/^\/(evidencia|pubmed)\s*/i, "").trim();
    if (!termoEvidencia) {
      return enviarMensagemParaChat(chatId, "🔬 *BUSCA DE EVIDÊNCIA CIENTÍFICA (PUBMED / EUROPE PMC)*\n\nUso: `/evidencia <tema ou pergunta clínica>`\n💡 *Exemplo:*\n• `/evidencia corticoide choque septico`\n• `/evidencia vni insuficiencia respiratoria`\n• `/evidencia empagliflozina insuficiencia cardiaca`");
    }
    enviarChatAction(chatId, "typing");
    var resEv = buscarEvidenciaMedica(termoEvidencia);
    return enviarMensagemParaChat(chatId, resEv);
  }

  if (comando === "/protocolo") {
    var termoProto = texto.replace(/^\/protocolo\s*/i, "").trim();
    if (!termoProto) {
      return enviarMensagemParaChat(chatId, "📚 *PROTOCOLOS DE EMERGÊNCIA & DIRETRIZES BRASILEIRAS*\n\nUso: `/protocolo <patologia>`\n💡 *Exemplos:*\n• `/protocolo sepse` (ILAS / SSC)\n• `/protocolo iam` (SBC / AHA)\n• `/protocolo eap` (SBC / ESC)\n• `/protocolo cad` (SBD / ADA)\n• `/protocolo tep` (SBC / ESC)\n• `/protocolo dpoc` (SBPT / GOLD)");
    }
    var proto = obterProtocoloClinico(termoProto);
    if (!proto) {
      return enviarMensagemParaChat(chatId, "⚠️ Protocolo não cadastrado diretamente. Tente: sepse, iam, eap, cad, tep ou dpoc.");
    }
    var msgProto = "📋 *" + proto.titulo.toUpperCase() + "*\n\n" +
      "🇧🇷 *Diretriz Brasileira:* " + proto.diretriz_brasileira + "\n" +
      "🌐 *Diretriz Internacional:* " + proto.diretriz_internacional + "\n\n" +
      "⚡ *Conduta Recomendada:*\n" + proto.conduta_imediata + "\n\n" +
      "⚖️ *Divergência Notável:*\n" + proto.divergencia;
    return enviarMensagemParaChat(chatId, msgProto);
  }

  // 5. ROTEADOR DE INTENÇÃO AUTÔNOMO (SEM NECESSIDADE DE COMANDO COM BARRA /)
  // Roteamento de Rotina em Linguagem Natural
  var textoTrim = texto.trim();
  var ehAjusteRotina = /(?:n[aã]o\s+vou|sem|cancel(?:ar?|e|ado)?|tirar?|pular?)\s+(?:trein(?:ar?|o)|academia|muscula[çc][aã]o|estud(?:ar?|o)|medquest|cochil(?:ar?|o))/i.test(textoTrim) ||
    /(?:treino|academia|muscula[çc][aã]o)[^0-9]*?(?:[aà]s?|para\s+[aà]s?|das?)\s*\d{1,2}/i.test(textoTrim) ||
    /(?:estudo|medquest|anki)[^0-9]*?(?:[aà]s?|para\s+[aà]s?|das?)\s*\d{1,2}/i.test(textoTrim) ||
    /(?:troqu(?:ei|e)|mudei|fazer)\s+(?:o\s+)?treino\s+(?:por|para)/i.test(textoTrim) ||
    /(?:modo\s+)?descanso\s+(?:hoje|total)|dia\s+de\s+descanso/i.test(textoTrim) ||
    /^(?:minha\s+rotina|rotina\s+de\s+hoje|ver\s+rotina)$/i.test(textoTrim);

  if (ehAjusteRotina && typeof RotinaService !== "undefined") {
    if (/^(?:minha\s+rotina|rotina\s+de\s+hoje|ver\s+rotina)$/i.test(textoTrim)) {
      return tratarComandoRotina(chatId, "hoje");
    }
    return tratarComandoRotina(chatId, textoTrim);
  }

  enviarChatAction(chatId, "typing");
  var decisao = classificarIntencaoMensagem(texto);

  if (decisao.intencao === "CALENDAR_CRIAR") {
    var dadosEv = extrairDadosEventoCalendario(texto);
    if (dadosEv && dadosEv.titulo && dadosEv.dataInicio) {
      var resCriacao = criarEventoAgendaGoogle(dadosEv.titulo, dadosEv.dataInicio, dadosEv.dataFim, dadosEv.local, dadosEv.descricao);
      if (resCriacao && resCriacao.sucesso) {
        return enviarMensagemParaChat(chatId, resCriacao.mensagem);
      }
    }
  }

  if (decisao.intencao === "CALENDAR_CONSULTAR") {
    return consultarEventosAgenda(texto, chatId);
  }

  if (decisao.intencao === "HABITO_PROATIVO") {
    var habitosMarcados = marcarHabitoProativoHoje(texto);
    if (habitosMarcados && habitosMarcados.length > 0) {
      return enviarMensagemParaChat(chatId, "⚡ *Hábito registrado proativamente no Notion Habit Log!*\n\n✅ " + habitosMarcados.join("\n✅ ") + "\n\nSeu check-in noturno já estará atualizado! 🚀");
    }
  }

  if (decisao.intencao === "CLINICO_SOAP") {
    safePutCache(contextoCache, contextoKey, texto, 900);
    if(typeof definirModoBot!=="undefined")definirModoBot(chatId,"soap",texto);
    return processarEEntregarIA(chatId, gerarSOAPComIA, texto, "soap");
  }

  if (decisao.intencao === "CLINICO_RX") {
    if(typeof definirModoBot!=="undefined")definirModoBot(chatId,"rx",texto);
    return processarEEntregarIA(chatId, gerarPrescricaoComIA, texto, "rx");
  }

  if (decisao.intencao === "CLINICO_GASO") {
    return processarEEntregarIA(chatId, gerarAnaliseGasometriaComIA, texto, "gaso");
  }

  if (decisao.intencao === "PRECEPTOR_VOZ") {
    var casoAudio = texto.replace(/(?:me\s+)?respond(?:a|e)\s+(?:com\s+|em\s+)?(?:um\s+)?[áa]udio|no\s+fone|fala\s+comigo|preceptor\s+socr[áa]tico|\bsabatina\b|manda\s+[áa]udio|^(?:preceptor|áudio|audio|no\s+fone)\s*[:,-]?\s*/gi, "").trim();
    if (!casoAudio || casoAudio.length < 5) {
      casoAudio = (typeof obterContextoClinicoBot === "function" ? obterContextoClinicoBot(chatId) : "") || contextoCache.get(contextoKey);
      if (!casoAudio) return enviarMensagemParaChat(chatId, "Envie o caso clínico antes de solicitar a resposta em áudio.");
    } else {
      safePutCache(contextoCache, contextoKey, casoAudio, 900);
    }
    return responderPreceptorVozComIA(chatId, casoAudio);
  }

  if (decisao.intencao === "CLINICO_EMERGENCIA") {
    var tEmerg = texto.toLowerCase();
    if (tEmerg.indexOf("nora") !== -1) {
      var pesos = Array.from(texto.matchAll(/(?:peso\s*[:=]?\s*)?(\d+(?:[.,]\d+)?)\s*kg\b/gi));
      if (pesos.length!==1) return enviarMensagemParaChat(chatId,"Informe um único peso explícito em kg. Exemplo: nora, peso 70,5 kg.");
      var pNora = sanitizarEValidarPesoKg(pesos[0][1]);
      if (pNora===null) return enviarMensagemParaChat(chatId,"Peso inválido. Informe o peso em kg.");
      var solNora = /concentrad[ao]|dobrad[ao]|4x/i.test(texto) ? "concentrada" : "padrao";
      var resNora = CalculadorasClinicas.drogasVasoativas("noradrenalina", pNora, solNora);
      if (resNora) return enviarMensagemParaChat(chatId, resNora.textoFormatado || resNora.texto);
    }
    return processarEEntregarIA(chatId, gerarCondutaEmergenciaComIA, texto, "conduta");
  }

  if (decisao.intencao === "NOTION_TASK") {
    var okNovaTask = criarTarefaNotion(texto, "Personal", "2 · Important", "Captura autônoma via Telegram");
    if (okNovaTask) return enviarMensagemParaChat(chatId, "✅ *Tarefa salva no Inbox do Notion Tasks!*");
    enviarMensagemParaChat(chatId, "❌ Falha ao salvar no Notion. O pedido foi preservado na fila.");
    throw new Error("FALHA_NOTION_CRIAR_TAREFA");
  }

  if (decisao.intencao === "NOTION_DUVIDA") {
    var duvTexto = texto.replace(/^(?:minha\s+)?d[úu]vida(?:\s+para\s+o\s+medquest)?\s*[:=]?\s*/i, "").trim();
    var okDuv = salvarDuvidaEstudoNotion(duvTexto || texto);
    if (okDuv) return enviarMensagemParaChat(chatId, "🧠 *Dúvida arquivada no Notion para o MedQuest!*");
  }

  if (decisao.intencao === "EVIDENCIA_MEDICA") {
    enviarChatAction(chatId, "typing");
    var temaEv = texto.replace(/(?:qual\s+a\s+|o\s+que\s+diz\s+a\s+)?evid[êe]ncia\s+(?:para|sobre)?|artigos?\s+(?:sobre|de)?|estudos?\s+(?:sobre|de)?|pesquisar?\s+no\s+pubmed/gi, "").trim();
    var resEv = buscarEvidenciaMedica(temaEv || texto);
    return enviarMensagemParaChat(chatId, resEv);
  }

  if (decisao.intencao === "ENFERMARIA_EVOLUCAO") {
    var matchLeitoIntencao = texto.match(/^(?:leito|quarto)\s*[:#]?\s*([a-zA-Z0-9_-]{1,24})(?:\s*[:,-]?\s+([\s\S]+))?$/i);
    var numLeitoInt = matchLeitoIntencao ? matchLeitoIntencao[1] : (decisao.leito || "");
    var infoLeitoInt = matchLeitoIntencao && matchLeitoIntencao[2] ? matchLeitoIntencao[2] : texto.replace(/^(?:leito|quarto)\s*[:#]?\s*[a-zA-Z0-9_-]{1,24}\s*[:,-]?\s*/i, "");
    if (numLeitoInt && infoLeitoInt && infoLeitoInt.trim()) {
      return processarDitadoEvolucaoLeito(chatId, {
        numero_leito: numLeitoInt,
        evolucao_texto: infoLeitoInt.trim(),
        status_sugerido: inferirStatusClinicoLeito(infoLeitoInt),
        pendencias: extrairPendenciasTexto(infoLeitoInt)
      });
    }
  }

  if (decisao.intencao === "ENFERMARIA") {
    return enviarPainelEnfermaria(chatId, 0);
  }

  if (decisao.intencao === "SEGUNDA_MENTE") {
    var okNota = criarNotaSegundaMenteNotion(texto);
    if (okNota) return enviarMensagemParaChat(chatId, "💡 *Insight arquivado no Notion Second Brain!*");
  }

  // 6. CONVERSAÇÃO NATURAL E DÚVIDAS MÉDICAS EM LINGUAGEM NATURAL (GROQ / OPENROUTER)
  var contextoAnterior = contextoCache.get(contextoKey);
  var respostaConversa = gerarRespostaConversaClinica(texto, contextoAnterior);
  if (respostaConversa) {
    safePutCache(contextoCache, contextoKey, texto, 900);
    var cacheKeyConversa = Utilities.getUuid().replace(/-/g, "");
    safePutCache(CacheService.getScriptCache(), cacheKeyConversa, respostaConversa, 21600);
    var botoesConversa = {
      "inline_keyboard": [
        [
          {"text": "🎧 Ouvir no Fone", "callback_data": "ouvirPreceptor_" + cacheKeyConversa},
          {"text": "📁 Salvar no Notion", "callback_data": "salvarNotion_conversa_" + cacheKeyConversa}
        ]
      ]
    };
    return enviarMensagemComTecladoParaChat(chatId, respostaConversa, botoesConversa);
  }

  // Fallback conversacional
  enviarMensagemComTecladoFixo(chatId, "Como posso ajudar? Envie um caso clínico por texto ou áudio, ou use /menu.");
}

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

function nomesFarmacosParaValidacao() {
  var nomes = [];
  function adicionar(x) {
    var n = normalizarTexto(String(x || "").split(/\d/)[0]).replace(/\s+/g, " ").trim();
    if (n.length >= 3 && nomes.indexOf(n) < 0) nomes.push(n);
  }
  if (typeof DICIONARIO_FARMACO !== "undefined") Object.keys(DICIONARIO_FARMACO).forEach(function(k) {
    adicionar(k); adicionar(DICIONARIO_FARMACO[k]);
  });
  if (typeof MAPA_SINDROMES_APS !== "undefined") Object.keys(MAPA_SINDROMES_APS).forEach(function(k) {
    MAPA_SINDROMES_APS[k].forEach(adicionar);
  });
  // Reutiliza a mesma base integral L1; se necessário, lê L2 em lote sem abrir Sheets.
  var base = lerPlanilhaEmCache("remume", ConfigService.get("SPREADSHEET_ID_REMUME"), false);
  if (base !== null) base.split("\n").forEach(adicionar);
  return nomes;
}

function analisarItensReceita(texto) {
  var nomes = nomesFarmacosParaValidacao(), itens = [], atual = null, viaSecao = "";
  var dose = /\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ml|ui|unidades?|gotas?|cp|comprimidos?|ampolas?|frascos?|caps?|c[aá]psulas?)\b/i;
  String(texto || "").split("\n").forEach(function(raw) {
    var l = raw.replace(/[*_#`]/g, "").trim();
    if (!l) return;
    if (/orienta[çc][oõ]es|confer[êe]ncia m[ée]dica|notas cl[íi]nicas/i.test(l)) { atual = null; return; }
    if (/^(?:\d+[.)]\s*)?(?:revisar|solicitar|pedir|checar|aguardar|colher|avaliar)\s+(?:exames?|laborat[oó]rio|tc|rx|eco|usg|imagem|laudo|parecer)\b/i.test(l) || /^(?:dieta|jejum|cabeceira|monitoriza|fisioterapia)\b/i.test(l)) return;
    if (/^\[?uso\s+(oral|t[oó]pico|inalat[oó]rio|injet[aá]vel)\]?$/i.test(l)) { viaSecao = l; return; }
    var numerado = /^\d+[.)]\s*/.test(l);
    l = l.replace(/^(?:\d+[.)]|[-•])\s*/, "");
    // Posologia e quantidade pertencem ao item anterior, nunca constituem outro fármaco.
    if (/^(?:posologia|modo de usar|quantidade|qtd|total)\s*[:=]|^(?:tomar|usar|aplicar|ingerir|administrar|inalar|pingar|instilar|infundir)\s+\d/i.test(l)) {
      if (atual && !numerado) atual.texto += " " + l;
      else if (numerado || dose.test(l)) { atual = {nome:"", texto:l, identificado:false}; itens.push(atual); }
      return;
    }
    var md = l.match(dose);
    var nome = normalizarTexto((md ? l.slice(0, md.index) : l).replace(/^(?:tomar|usar|aplicar|ingerir|administrar)\s+/i, "")).replace(/\s+/g, " ").trim();
    var identificado = nomes.indexOf(nome) >= 0;
    if (md || numerado || identificado) {
      atual = {nome:nome, texto:l + " " + viaSecao, identificado:identificado}; itens.push(atual);
    } else if (atual && /^(?:via|dose|frequ[êe]ncia|dura[çc][ãa]o)\s*:/i.test(l)) atual.texto += " " + l;
  });
  itens.forEach(function(item) {
    var t = item.texto;
    var via = /\b(?:vo|ev|iv|im|sc|sl|via oral|uso oral|uso t[oó]pico|uso inalat[oó]rio|oral|intravenos[ao]|endovenos[ao]|intramuscular|subcut[aâ]ne[ao]|inalat[oó]ri[ao]|t[oó]pic[ao]|sublingual|nasal|oft[aá]lmic[ao]|retal)\b/i.test(t);
    var frequencia = /\b\d+\s*\/\s*\d+\s*h\b|\bde\s+\d+\s+em\s+\d+\s*(?:h|horas)\b|\b\d+\s*x\s*(?:ao dia|\/dia)|\bao dia\b|\bdiariamente\b|\bdose [uú]nica\b|\bse (?:dor|febre|necess[aá]rio)\b|\b(?:sos|sn)\b|[aà] noite|ao deitar/i.test(t);
    item.completo = item.identificado && dose.test(t) && via && frequencia;
  });
  return itens;
}

function validarReceitaTemMedicamentos(texto) {
  if (!texto || typeof texto !== "string") return false;
  if (typeof auditoriaClinicaPendente === "function" && auditoriaClinicaPendente(texto)) return false;
  var itens = analisarItensReceita(texto);
  return itens.length > 0 && itens.every(function(x) { return x.completo; });
}

function responderComGuiaExameFisico(chatId, tipoEf) {
  var contextoCache = CacheService.getScriptCache();
  var estado = typeof modoBot === "function" ? modoBot(chatId) : null;
  var ctx = typeof obterContextoClinicoBot === "function" ? obterContextoClinicoBot(chatId) : "";
  var txtEf = typeof gerarGuiaExameFisicoEspecial === "function" ? gerarGuiaExameFisicoEspecial(tipoEf, ctx) : "Guia indisponível.";
  var ck = Utilities.getUuid().replace(/-/g, "");
  var blocos = String(txtEf).match(/```(?:text)?\n([\s\S]*?)```/);
  var modelo = blocos ? blocos[1].trim() : "Modelo indisponível. Confira os achados antes de registrar.";
  if (/MODELO DE REFERÊNCIA|Checklist de referência/.test(txtEf)) modelo = "MODELO DE REFERÊNCIA — confirmar achados antes de registrar.\n\n" + modelo;
  safePutCache(contextoCache, ck, modelo, 21600);

  var temCasoAtivo = (estado && estado.mode === "soap" && estado.data && estado.data.trim().length > 5) || (ctx && ctx.trim().length > 10);
  var botoes = [
    [{ "text": "📋 Copiar Modelo " + tipoEf.toUpperCase(), "callback_data": "ux:copiar:" + ck }]
  ];
  if (temCasoAtivo) {
    botoes.push([{ "text": "➕ Incorporar ao SOAP", "callback_data": "ux:ef_inc:" + tipoEf }]);
  }
  botoes.push([
    { "text": "🔬 Mais Exames Especiais", "callback_data": "ef_menu" },
    { "text": "🩺 Voltar ao SOAP", "callback_data": "ux:usar:soap" }
  ]);

  var kb = { "inline_keyboard": botoes };
  return enviarMensagemComTecladoParaChat(chatId, txtEf, kb);
}

function enviarMenuExamesEspeciais(chatId) {
  var txt = typeof obterCatalogoTodosExamesEspeciais === "function" ? obterCatalogoTodosExamesEspeciais() : "🩺 *Catálogo de Exames Físicos Especiais*";
  var kb = {
    "inline_keyboard": [
      [{ "text": "🧠 Neuro", "callback_data": "ef_neuro" }, { "text": "🧠 Psiquiatria (PQU)", "callback_data": "ef_pqu" }, { "text": "👁️ Oftalmo", "callback_data": "ef_oftalmo" }],
      [{ "text": "🦴 Ortopedia", "callback_data": "ef_ortopo" }, { "text": "👂 Otorrino (ORL)", "callback_data": "ef_orl" }, { "text": "🔬 Dermato", "callback_data": "ef_dermato" }],
      [{ "text": "🌸 Gineco/Obst", "callback_data": "ef_gineco" }, { "text": "🩺 Uro/Procto", "callback_data": "ef_procto" }, { "text": "👶 Pediatria", "callback_data": "ef_ped" }],
      [{ "text": "👵 Geriatria (AGA)", "callback_data": "ef_geriatria" }, { "text": "🩸 Vascular", "callback_data": "ef_vascular" }]
    ]
  };
  return enviarMensagemComTecladoParaChat(chatId, txt, kb);
}

/**
 * Responde à consulta direta de posologia oficial utilizando o Guia Farmacêutico do HSL
 * com cálculo determinístico de fórmulas fixas para doses pediátricas.
 */
function responderConsultaPosologiaHSL(chatId, termo) {
  // 1. Se informou peso, calcula determinísticamente em código puro (Zero Alucinação)
  var calcPed = (typeof CalculadorasClinicas !== "undefined" && typeof CalculadorasClinicas.calcularPosologiaPorTextoLivre === "function")
    ? CalculadorasClinicas.calcularPosologiaPorTextoLivre(termo)
    : null;

  if (calcPed) {
    var txtPed = [
      "👶 *CÁLCULO POSOLÓGICO PEDIÁTRICO DETERMINÍSTICO (FÓRMULA FIXA)*",
      "",
      "📋 *Fármaco:* *" + calcPed.farmaco + "*",
      "📦 *Apresentação (REMUME/HSL):* `" + calcPed.apresentacao + "`",
      "⚖️ *Peso Informado:* `" + calcPed.pesoKg + " kg`",
      "",
      "💊 *POSOLOGIA OFICIAL DETERMINÍSTICA:*",
      "👉 *" + calcPed.instrucaoPosologica + "*",
      "📦 *Quantidade a Dispensar:* *" + calcPed.quantidadeDispensar + "*",
      "",
      "🧮 *Memória de Cálculo Matemática:*",
      "_" + calcPed.memoriaCalculo + "_",
      "",
      "💡 *Orientações:* " + calcPed.orientacoes,
      "",
      "🔒 *Segurança:* Cálculo matemático determinístico em código puro (Zero Alucinação de IA)."
    ].join("\n");

    var kbPed = {
      "inline_keyboard": [
        [
          { "text": "📝 Prescrever no /rx com esta dose", "callback_data": "rx_med:" + calcPed.farmaco + " " + calcPed.pesoKg + "kg" }
        ]
      ]
    };
    return enviarMensagemComTecladoParaChat(chatId, txtPed, kbPed);
  }

  // 2. Consulta da ficha técnica oficial do Guia HSL
  var med = (typeof buscarMedicamentoNoHSL === "function") ? buscarMedicamentoNoHSL(termo) : null;
  if (!med) {
    return enviarMensagemParaChat(
      chatId,
      "🔍 *MEDICAMENTO NÃO ENCONTRADO NO GUIA HSL*\n\n" +
      "Não encontramos registro exato para `\"" + termo + "\"` no Guia Farmacêutico do Hospital Sírio-Libanês.\n\n" +
      "💡 *Dicas:*\n" +
      "• Busque pelo princípio ativo genérico (ex: `/dose amoxicilina`, `/dose dipirona`, `/dose ceftriaxona`).\n" +
      "• Se for caso infantil, informe o peso: `/dose amoxicilina 16kg` ou `/dose dipirona 12kg`.\n" +
      "• Ou utilize o gerador de receita `/rx " + termo + "` para avaliação clínica completa."
    );
  }

  var respostaTexto = (typeof formatarFichaPosologicaHSL === "function")
    ? formatarFichaPosologicaHSL(med)
    : "Ficha posológica indisponível.";

  var rotuloPrescrever = "💊 Prescrever no /rx (" + (med.farnaco.length > 15 ? med.farnaco.substring(0, 15) + "..." : med.farnaco) + ")";
  var kb = {
    "inline_keyboard": [
      [
        { "text": rotuloPrescrever, "callback_data": "rx_med:" + med.farnaco.substring(0, 30) }
      ]
    ]
  };

  return enviarMensagemComTecladoParaChat(chatId, respostaTexto, kb);
}

function processarEEntregarIA(chatId, funcaoGeradora, dados, tipoCache, messageIdParaEditar) {
  enviarChatAction(chatId, "typing", true);
  var origemSoap = tipoCache === "soap" ? modoBot(chatId) : null;
  var resultado = medirEtapaBot('geracao_clinica', function() { return funcaoGeradora(dados); });
  if (typeof renovarChatActionSeNecessario === "function") {
    renovarChatActionSeNecessario(chatId, "typing");
  }
  if (resultado) {
    var strResultado = String(resultado);
    if (tipoCache === "soap") salvarSoapCockpit_(chatId, origemSoap, strResultado);
    var cacheKey = Utilities.getUuid().replace(/-/g, "");
    safePutCache(CacheService.getScriptCache(), cacheKey, strResultado, 21600);

    var botoes = [];
    var limpo = typeof uxTextoProntuario === "function" ? uxTextoProntuario(strResultado) : strResultado.trim();

    // Destaque absoluto: Copiar PEP em linha exclusiva de largura total
    var btnCopiar;
    if (limpo.length >= 1 && limpo.length <= 256) {
      btnCopiar = { "text": "📋 Copiar PEP", "copy_text": { "text": limpo } };
    } else {
      btnCopiar = { "text": "📋 Copiar PEP", "callback_data": "ux:copiar:" + cacheKey };
    }
    var linhaPrimaria = [btnCopiar];

    var ehErro = /❌|não foi possível|falha ao|erro ao acessar|erro:/i.test(strResultado);
    var ehIncompletoOuPendente = /⚠️\s*prescri[çc][ãa]o\s+incompleta|incomplet[ao]|pend[êe]ncia|informe\s+(?:o\s+)?(?:peso|alergia)|faltam?\s+(?:dados|informa)/i.test(strResultado);
    var temItensFarmacologicos = tipoCache === "rx" && validarReceitaTemMedicamentos(strResultado);
    var elegivelPdfRx = (tipoCache === "rx") && !ehErro && !ehIncompletoOuPendente && temItensFarmacologicos;

    var ehSoapFechado = (tipoCache === "soap") && /🧠\s*\*A\s*-/i.test(strResultado);

    if (tipoCache === "soap" && !ehErro) {
      botoes.push(linhaPrimaria);
      if (!ehSoapFechado) {
        // FASE 1: Rascunho com Anamnese e Exame Físico
        botoes.push([
          { "text": "📋 Fechar Plano", "callback_data": "ux:soap:plano" },
          { "text": "🩺 EF Normal", "callback_data": "ux:soap:ef_normal" }
        ]);
        botoes.push([
          { "text": "🔬 Exames", "callback_data": "ef_menu" },
          { "text": "🎧 Ouvir no Fone", "callback_data": "ouvirPreceptor_" + cacheKey }
        ]);
      } else {
        // FASE 2: SOAP Consolidado completo
        botoes.push([
          { "text": "💊 Prescrever", "callback_data": "ux:hub:rx" },
          { "text": "🎧 Ouvir no Fone", "callback_data": "ouvirPreceptor_" + cacheKey }
        ]);
        botoes.push([
          { "text": "🔄 Atualizar", "callback_data": "ux:soap:atualizar" },
          { "text": "🧹 Novo Paciente", "callback_data": "ux:novo:soap" }
        ]);
      }
    } else {
      botoes.push(linhaPrimaria);
      var linhaSecundaria = [];
      if (elegivelPdfRx) {
        linhaSecundaria.push({ "text": "📄 Gerar PDF da Receita", "callback_data": "gerarPdfRx_" + cacheKey });
      } else if (tipoCache !== "rx" && !ehErro) {
        linhaSecundaria.push({ "text": "📁 Salvar no Notion", "callback_data": "salvarNotion_" + tipoCache + "_" + cacheKey });
      }
      if (tipoCache === "plantao" && !ehErro) {
        linhaSecundaria.push({ "text": "👨‍⚕️ Pitch do Round (60s)", "callback_data": "gerarRound_" + cacheKey });
      }
      if ((tipoCache === "round" || tipoCache === "plantao") && !ehErro) {
        linhaSecundaria.push({ "text": "🎧 Ouvir no Fone", "callback_data": "ouvirPreceptor_" + cacheKey });
      }
      if (linhaSecundaria.length) botoes.push(linhaSecundaria);
    }

    if (tipoCache === "soap") {
      var revFinal = (origemSoap && origemSoap.revision)
        ? origemSoap.revision
        : (modoBot(chatId) ? modoBot(chatId).revision : (dados ? definirModoBot(chatId, "soap", dados).revision : 'indisponivel'));
      botoes.forEach(function(linha) { linha.forEach(function(botao) {
        if (/^ux:soap:(plano|ef_normal|atualizar)$/.test(botao.callback_data || '')) {
          botao.callback_data += ':' + revFinal;
        }
      }); });
    }
    var tecladoSalvar = { "inline_keyboard": botoes };
    // O SOAP já traz seu título e suas seções; preserve a resposta integral.
    var textoFinal = tipoCache === "soap" ? strResultado
      : "*" + tipoCache.toUpperCase() + " · Resumo Clínico*\n\n" + strResultado;

    // Tentativa de In-Place Edit se messageIdParaEditar fornecido
    if (messageIdParaEditar && textoFinal.length <= 3800) {
      try {
        var tokenBot = ConfigService.get("TELEGRAM_BOT_TOKEN");
        var urlEdit = "https://api.telegram.org/bot" + tokenBot + "/editMessageText";
        var payloadEdit = {
          "chat_id": String(chatId),
          "message_id": Number(messageIdParaEditar),
          "text": limparMarkdownTelegram(textoFinal),
          "parse_mode": "Markdown",
          "reply_markup": tecladoSalvar
        };
        var editOk = executarPostTelegram(urlEdit, payloadEdit);
        if (editOk) return editOk;
      } catch (eEdit) {}
    }

    if (textoFinal.length <= 3900) {
      return enviarMensagemComTecladoParaChat(chatId, textoFinal, tecladoSalvar);
    } else {
      return enviarMensagemSegmentada(chatId, textoFinal, tecladoSalvar);
    }
  } else {
    enviarMensagemParaChat(chatId, "⚠️ Erro ao processar a resposta com a IA.");
    return false;
  }
}

function processarCallbackBotao(cb) {
  if (typeof tratarCallbackUX!=="undefined" && tratarCallbackUX(cb)) return;
  var data = cb.data || "";
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");

  // Vincula o registro à data original da mensagem ou usa a data atual se não informada
  var dataReferencia = (cb.message && cb.message.date) ? new Date(cb.message.date * 1000) : new Date();
  var dataAlvoISO = Utilities.formatDate(dataReferencia, tz, "yyyy-MM-dd");

  // A. HÁBITOS E ENERGIA
  if (data.startsWith("habit_") || data.startsWith("energy_")) {
    responderCallbackTelegram(cb.id, "Salvando no Notion...");

    var pageId = obterOuCriarPaginaHabitLog(dataAlvoISO);
    if (!pageId) {
      responderCallbackTelegram(cb.id, "⚠️ Falha ao acessar o Habit Log do Notion.");
      return;
    }

    var kb = cb.message && cb.message.reply_markup ? cb.message.reply_markup.inline_keyboard : null;
    var valorStatus = true;

    if (kb) {
      for (var i = 0; i < kb.length; i++) {
        for (var j = 0; j < kb[i].length; j++) {
          var btn = kb[i][j];
          if (btn.callback_data === data) {
            if (data.startsWith("habit_")) {
              if (btn.text.indexOf("✅") !== -1) {
                valorStatus = false;
              } else {
                valorStatus = true;
              }
            }
          }
        }
      }
    }

    var gravouComSucesso = false;
    if (data.startsWith("habit_")) {
      var propName = "";
      if (data === "habit_medquest") propName = "🧠 MedQuest";
      else if (data === "habit_gym") propName = "🏋️ Academia";
      else if (data === "habit_english") propName = "📚 Inglês";
      else if (data === "habit_guitar") propName = "🎸 Violão";
      else if (data === "habit_love") propName = "❤️ Namorada";
      else if (data === "habit_reading") propName = "📖 Leitura";

      if (propName) {
        gravouComSucesso = atualizarCheckboxNotion(pageId, propName, valorStatus);
      }
    } else if (data.startsWith("energy_")) {
      var valorEnergia = parseInt(data.replace("energy_", ""), 10);
      gravouComSucesso = atualizarNumeroNotion(pageId, "⚡ Energia (1–5)", valorEnergia);
    }

    // Atualiza a indicação visual no Telegram SOMENTE após o sucesso da escrita no Notion
    if (!!gravouComSucesso && kb && cb.message && cb.message.chat) {
      for (var ki = 0; ki < kb.length; ki++) {
        for (var kj = 0; kj < kb[ki].length; kj++) {
          var kbtn = kb[ki][kj];
          if (kbtn.callback_data === data) {
            if (data.startsWith("habit_")) {
              if (valorStatus) {
                if (kbtn.text.indexOf("✅") === -1) kbtn.text = "✅ " + kbtn.text;
              } else {
                kbtn.text = kbtn.text.replace("✅ ", "");
              }
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
  }
  // A2. ROTINA E TIMELINE ADAPTATIVA
  else if (data.startsWith("rotina:")) {
    return tratarCallbackRotina(cb);
  }
  // B. GERAR ROUND DIRETO DO PLANTÃO SBAR
  else if (data.startsWith("gerarRound_")) {
    var cacheKeyRound = data.replace("gerarRound_", "");
    var conteudoPlantao = CacheService.getScriptCache().get(cacheKeyRound);
    if (conteudoPlantao) {
      responderCallbackTelegram(cb.id, "Gerando Pitch do Round...");
      processarEEntregarIA(cb.message.chat.id, gerarPitchERoundComIA, conteudoPlantao, "round");
    } else {
      responderCallbackTelegram(cb.id, "⚠️ Dados do plantão expirados.");
    }
  }
  // B2. INCORPORAR LAUDO DE IMAGEM/EXAME AO CASO SOAP
  else if (data.startsWith("incorporarSoap_") || data.startsWith("incorporarLaudoSoap_")) {
    var ckLaudo = data.replace(/^incorporar(?:Laudo)?Soap_/, "");
    var cache = CacheService.getScriptCache();
    var laudoTexto = cache.get(ckLaudo);
    if (!laudoTexto) {
      responderCallbackTelegram(cb.id, "⚠️ Laudo expirado do cache.");
      return;
    }
    responderCallbackTelegram(cb.id, "Incorporando ao caso SOAP...");
    var chatIdSoap = (cb.message && cb.message.chat && cb.message.chat.id) ? cb.message.chat.id : cb.from.id;
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
  // C. MENU E CATEGORIAS DE CALCULADORAS
  else if (data === "calc_menu_principal") {
    responderCallbackTelegram(cb.id, "");
    enviarMenuCategoriasCalculadoras(cb.message.chat.id, cb.message.message_id);
  }
  else if (data.startsWith("calc_cat_")) {
    responderCallbackTelegram(cb.id, "");
    enviarSubmenuCalculadoras(cb.message.chat.id, cb.message.message_id, data);
  }
  // D. CALCULADORAS v3.0 — FORMATO calc:<id>:<acao>
  else if (data.startsWith("calc:")) {
    responderCallbackTelegram(cb.id, "");
    var chatIdCb = (cb.message && cb.message.chat && cb.message.chat.id) ? cb.message.chat.id : cb.from.id;
    var segs = data.split(":");
    // segs[0] = "calc", segs[1] = id, segs[2] = acao, segs[3+] = args opcionais
    if (segs.length < 3) {
      enviarMensagemParaChat(chatIdCb, "⚠️ Callback de calculadora inválido.");
      return;
    }
    var calcId = segs[1];
    var calcAcao = segs[2];
    var calcArgs = segs.slice(3);
    try {
      if (typeof CalculadorasClinicas !== "undefined" && typeof CalculadorasClinicas.processarAcao === "function") {
        var resAcao = CalculadorasClinicas.processarAcao(chatIdCb, calcId, calcAcao, calcArgs);
        if (resAcao && resAcao.textoFormatado) {
          if (resAcao.botoes) {
            enviarMensagemComTecladoParaChat(chatIdCb, resAcao.textoFormatado, { inline_keyboard: resAcao.botoes });
          } else {
            enviarMensagemParaChat(chatIdCb, resAcao.textoFormatado);
          }
        }
      } else {
        enviarMensagemParaChat(chatIdCb, "⚠️ Módulo de calculadoras indisponível.");
      }
    } catch (eCalcCb) {
      Logger.log("Erro callback calc:: " + eCalcCb.message);
      enviarMensagemParaChat(chatIdCb, "⚠️ Erro ao processar ação da calculadora.");
    }
    return;
  }
  // D. SELEÇÃO DIRETA DE CALCULADORA (legado calc_)
  else if (data.startsWith("calc_")) {
    var tipoCalc = data.replace("calc_", "");
    var chatId = (cb.message && cb.message.chat && cb.message.chat.id) ? cb.message.chat.id : cb.from.id;

    var contextoCache = CacheService.getScriptCache();
    var contextoKey = "ctx_" + chatId;
    safePutCache(contextoCache, contextoKey, "/calc Calculadora selecionada: " + tipoCalc + "\nDados do paciente: ", 900);

    if(typeof definirModoBot!=="undefined")definirModoBot(chatId,"calc","Calculadora selecionada: "+tipoCalc+"\nDados do paciente: ");
    responderCallbackTelegram(cb.id, "Calculadora " + tipoCalc + " selecionada");
    var instrucoes = obterInstrucoesCalculadora(tipoCalc);
    enviarMensagemParaChat(chatId, instrucoes);
  }
  // E. ARQUIVAMENTO NO NOTION TASKS
  else if (data.startsWith("salvarNotion_")) {
    var partes = data.split("_");
    var tipo = partes[1];
    var cacheKey = partes.slice(2).join("_");

    var cache = CacheService.getScriptCache();
    var conteudo = cache.get(cacheKey);

    if(cache.get("saved_"+cacheKey)) { responderCallbackTelegram(cb.id,"Já salvo no Notion.");return; }
    if (conteudo) {
      responderCallbackTelegram(cb.id, "Arquivando no Notion...");
      var tituloNotion = "";
      if (tipo === "soap") tituloNotion = "Caso Clínico SOAP";
      else if (tipo === "rx") tituloNotion = "Prescrição Ambulatorial";
      else if (tipo === "plantao") tituloNotion = "Passagem de Plantão SBAR";
      else if (tipo === "round") tituloNotion = "Pitch & Round Socrático";
      else if (tipo === "gaso") tituloNotion = "Gasometria Arterial";
      else if (tipo === "conduta") tituloNotion = "Conduta de Emergência";
      else if (tipo === "audio") tituloNotion = "Registro Clínico por Áudio";
      else if (tipo === "imagem") tituloNotion = "Análise de Imagem/ECG";
      else if (tipo === "calc") tituloNotion = "Calculadora Clínica";
      else if (tipo === "interacao") tituloNotion = "Análise de Interação Medicamentosa";
      else tituloNotion = "Anotação Clínica";

      tituloNotion += " · " + Utilities.formatDate(new Date(), tz, "dd/MM HH:mm");

      var sucesso = criarTarefaNotion(tituloNotion, "Internship", "2 · Important", conteudo);
      if (sucesso) {
        enviarMensagemParaChat(cb.message.chat.id, "📁 Arquivado no Notion Tasks com sucesso!");
        var kbRestante=cb.message.reply_markup && cb.message.reply_markup.inline_keyboard;
        if(kbRestante) {
          kbRestante=kbRestante.map(function(row){return row.filter(function(b){return b.callback_data!==data;});}).filter(function(row){return row.length;});
          executarPostTelegram("https://api.telegram.org/bot"+ConfigService.get("TELEGRAM_BOT_TOKEN")+"/editMessageReplyMarkup",{chat_id:cb.message.chat.id,message_id:cb.message.message_id,reply_markup:{inline_keyboard:kbRestante}});
        }
        safePutCache(cache,"saved_"+cacheKey,"1",21600);
      } else {
        enviarMensagemParaChat(cb.message.chat.id, "❌ Falha ao salvar no Notion. Tente novamente.");
      }
    } else {
      responderCallbackTelegram(cb.id, "⚠️ Conteúdo expirado.");
      removerBotaoInline(cb);
    }
  }
  // F. GERAR PDF OFICIAL DA RECEITA NO DRIVE
  else if (data.startsWith("gerarPdfRx_")) {
    var cacheKeyPdf = data.replace("gerarPdfRx_", "");
    var conteudoPrescricao = CacheService.getScriptCache().get(cacheKeyPdf);
    if (conteudoPrescricao) {
      responderCallbackTelegram(cb.id, "Gerando receituário A4 em PDF...");
      var resPdf = ReceitaPdfService.processarEEnviarPdf(cb.message.chat.id, conteudoPrescricao);
      if (resPdf && resPdf.sucesso === false) {
        return false;
      }
      return true;
    } else {
      responderCallbackTelegram(cb.id, "⚠️ Prescrição expirada do cache.");
      return false;
    }
  }
  // F2. PRESCRIÇÃO DIRETA A PARTIR DA CONSULTA DO GUIA HSL
  else if (data.startsWith("rx_med:")) {
    var medNome = data.replace("rx_med:", "").trim();
    responderCallbackTelegram(cb.id, "Gerando prescrição de " + medNome + "...");
    var chatIdRx = (cb.message && cb.message.chat) ? cb.message.chat.id : ConfigService.get("TELEGRAM_CHAT_ID");
    return processarEEntregarIA(chatIdRx, gerarPrescricaoComIA, medNome, "rx");
  }
  // G. OUVIR CRÍTICA SOCRÁTICA DO PRECEPTOR VIA ÁUDIO / TTS
  // CORREÇÃO: passa apenasNarrar=true para ir direto ao TTS sem nova chamada LLM
  else if (data.startsWith("ouvirPreceptor_")) {
    var cacheKeyVoz = data.replace("ouvirPreceptor_", "");
    var conteudoCaso = (typeof safeGetCache === "function")
      ? safeGetCache(CacheService.getScriptCache(), cacheKeyVoz)
      : CacheService.getScriptCache().get(cacheKeyVoz);
    if (!conteudoCaso) {
      conteudoCaso = CacheService.getScriptCache().get(cacheKeyVoz);
    }
    if (conteudoCaso) {
      responderCallbackTelegram(cb.id, "Transmitindo áudio para o fone...");
      return responderPreceptorVozComIA(cb.message.chat.id, conteudoCaso, { apenasNarrar: true });
    } else {
      responderCallbackTelegram(cb.id, "⚠️ Caso expirado do cache.");
    }
  }
  // G.1 GERAR SOAP A PARTIR DO DIÁLOGO DO PRECEPTOR
  else if (data === "preceptor_gerar_soap") {
    var chatCbPreceptor = (cb.message && cb.message.chat && cb.message.chat.id) ? cb.message.chat.id : cb.from.id;
    responderCallbackTelegram(cb.id, "Consolidando discussão e gerando SOAP...");
    var dialogoSoap = obterDialogoPreceptor(chatCbPreceptor);
    limparDialogoPreceptor(chatCbPreceptor);
    var casoParaSoap = (dialogoSoap && dialogoSoap.caso_base) ? dialogoSoap.caso_base : "";
    if (dialogoSoap && dialogoSoap.historico && dialogoSoap.historico.length > 0) {
      var histFormatado = dialogoSoap.historico.map(function(h) {
        return (h.papel === "preceptor" ? "Preceptor: " : "Médico: ") + h.texto;
      }).join("\n");
      casoParaSoap += "\n\n[Discussão Socrática e Raciocínio Clínico]:\n" + histFormatado;
    }
    if (!casoParaSoap) {
      return enviarMensagemParaChat(chatCbPreceptor, "⚠️ Nenhum caso ativo encontrado para gerar SOAP.");
    }
    if (typeof definirModoBot !== "undefined") {
      definirModoBot(chatCbPreceptor, "soap", casoParaSoap);
    }
    return processarEEntregarIA(chatCbPreceptor, gerarSOAPComIA, casoParaSoap, "soap");
  }
  // G.2 ENCERRAR DIÁLOGO SOCRÁTICO
  else if (data === "preceptor_encerrar") {
    var chatCbEnc = (cb.message && cb.message.chat && cb.message.chat.id) ? cb.message.chat.id : cb.from.id;
    responderCallbackTelegram(cb.id, "Discussão encerrada.");
    limparDialogoPreceptor(chatCbEnc);
    if (typeof limparEstadoBot === "function") {
      try { limparEstadoBot(chatCbEnc); } catch (e) {}
    }
    return enviarMensagemComTecladoFixo(chatCbEnc, "🛑 *Discussão socrática encerrada.* Teclado principal restaurado.");
  }
  // H. AÇÕES RÁPIDAS DA ENFERMARIA
  else if (data === "enfermaria_passagem") {
    responderCallbackTelegram(cb.id, "Consolidando passagem SBAR...");
    var textoLeitos = EnfermariaService.obterTextoConsolidadoParaPassagem();
    if (!textoLeitos) {
      return enviarMensagemParaChat(cb.message.chat.id, "🏥 *Nenhum leito registrado na enfermaria para passar.* Registre os leitos usando `/leito <num> <dados>` antes de gerar a passagem.");
    }
    return processarEEntregarIA(cb.message.chat.id, gerarPassagemPlantaoSBAR, textoLeitos, "plantao");
  }
  else if (data === "enfermaria_atualizar") {
    responderCallbackTelegram(cb.id, "Quadro atualizado.");
    var kbAtualizar = {
      "inline_keyboard": [
        [
          {"text": "📋 Gerar Passagem SBAR", "callback_data": "enfermaria_passagem"},
          {"text": "🔄 Atualizar", "callback_data": "enfermaria_atualizar"}
        ]
      ]
    };
    return enviarPainelEnfermaria(cb.message.chat.id,0,cb.message.message_id);
  }
  // I. GUIAS DE EXAMES FÍSICOS ESPECIAIS
  else if (data.startsWith("ef_")) {
    var chatIdCbEf = (cb.message && cb.message.chat && cb.message.chat.id) ? cb.message.chat.id : cb.from.id;
    if (data === "ef_menu") {
      responderCallbackTelegram(cb.id, "Abrindo catálogo de exames...");
      return enviarMenuExamesEspeciais(chatIdCbEf);
    }
    var tipoEf = data.replace("ef_", "");
    responderCallbackTelegram(cb.id, "Abrindo guia de EF " + tipoEf.toUpperCase() + "...");
    return responderComGuiaExameFisico(chatIdCbEf, tipoEf);
  }
  // Z. CATCH-ALL PARA CALLBACKS NÃO RECONHECIDOS
  else {
    responderCallbackTelegram(cb.id, "⚠️ Ação não reconhecida.");
  }
}

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
    btnCopiar = { text: "📋 Copiar PEP", copy_text: { text: limpoPep } };
  } else {
    btnCopiar = { text: "📋 Copiar PEP", callback_data: "ux:copiar:" + cacheKeyPep };
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
    ]
  ];

  return enviarMensagemComBotoes(chatId, msgTelegram, { inline_keyboard: botoes });
}

function processarMensagemVoz(message) {
  var chatId = (message.chat && message.chat.id) ? message.chat.id : ConfigService.get("TELEGRAM_CHAT_ID");
  // Feedback imediato: transcrição + IA
  enviarChatAction(chatId, "typing");
  try {
    var midia = medirEtapaBot('download_midia', function() { return baixarMidiaTelegram(message.voice || message.audio); });
    if (!midia || !midia.data) {
      return enviarMensagemParaChat(chatId, "⚠️ Não foi possível baixar o áudio do Telegram.");
    }

    // 1. Processamento Multimodal em Tempo Único (Single-Pass Audio-to-SOAP)
    var resAudio = null;
    if (typeof processarAudioClinicoMultimodal === "function") {
      try { resAudio = medirEtapaBot('processamento_audio', function() { return processarAudioClinicoMultimodal(midia.data, midia.mime); }); } catch (eAudio) { resAudio = null; }
    }

    var transcricao = (resAudio && resAudio.transcricao) ? resAudio.transcricao : "";

    // Fallback defensivo para transcrição clássica (se o processador multimodal falhar ou em mocks simples)
    if (!transcricao) {
      var promptTrans = "Transcreva fielmente o áudio em português do Brasil com pontuação correta. Não acrescente introdução ou inferência. Retorne somente a transcrição literal.";
      var tFallback = chamarGeminiPoolMultimodal(midia.data, midia.mime, promptTrans, "");
      if (tFallback && tFallback.trim()) {
        transcricao = tFallback.trim();
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
        if (!casoAudio || casoAudio.length < 5) {
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

    var resultadoAudio = chamarGeminiPoolMultimodal(midia.data, midia.mime, promptSistema, caption);
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
    enviarMensagemParaChat(chatId, "⚠️ Erro ao processar áudio: " + msgErrVoz);
  }
}

function processarMensagemFoto(message) {
  var chatId = (message.chat && message.chat.id) ? message.chat.id : ConfigService.get("TELEGRAM_CHAT_ID");
  enviarChatAction(chatId, "upload_photo");
  try {
    var photos = message.photo;
    var fotoAlvo = null;
    if (photos && photos.length > 0) {
      // Download inteligente: seleciona resolução ideal (~1000-1280px) economizando ~60% de I/O
      fotoAlvo = (photos.length >= 2) ? photos[photos.length - 2] : photos[photos.length - 1];
    } else if (message.document) {
      fotoAlvo = message.document;
    }

    if (!fotoAlvo) {
      return enviarMensagemParaChat(chatId, "⚠️ Nenhuma imagem identificada na mensagem.");
    }

    var midia = medirEtapaBot('download_midia', function() { return baixarMidiaTelegram(fotoAlvo); });
    if (!midia || !midia.data) {
      return enviarMensagemParaChat(chatId, "⚠️ Falha ao baixar imagem do Telegram.");
    }

    var caption = message.caption ? message.caption.trim() : "";
    var resultadoImagem = (typeof analisarImagemMedicaComIA === "function")
      ? analisarImagemMedicaComIA(midia.data, midia.mime, caption)
      : chamarGeminiPoolMultimodal(midia.data, midia.mime, "Você é um Preceptor de Clínica Médica, Cardiologia e Radiologia da FMRP-USP. Analise a imagem detalhadamente com laudo estruturado.", caption);

    if (resultadoImagem) {
      var cacheKey = Utilities.getUuid().replace(/-/g, "");
      safePutCache(CacheService.getScriptCache(), cacheKey, resultadoImagem, 21600);
      safePutCache(CacheService.getScriptCache(), "ctx_" + chatId, resultadoImagem, 900);

      var tecladoSalvar = {
        "inline_keyboard": [
          [
            { "text": "➕ Incorporar ao SOAP", "callback_data": "incorporarSoap_" + cacheKey }
          ],
          [
            { "text": "🎧 Ouvir no Fone", "callback_data": "ouvirPreceptor_" + cacheKey },
            { "text": "📁 Salvar no Notion", "callback_data": "salvarNotion_imagem_" + cacheKey }
          ]
        ]
      };
      enviarMensagemComTecladoParaChat(chatId, resultadoImagem, tecladoSalvar);
    } else {
      enviarMensagemParaChat(chatId, "⚠️ Erro ao analisar imagem médica (IA não retornou resposta).");
    }
  } catch (err) {
    var msgErrFoto = (err && (err.message || err)) || "Erro desconhecido";
    Logger.log("Erro no processamento de foto: " + (err && err.stack ? err.stack : msgErrFoto));
    enviarMensagemParaChat(chatId, "⚠️ Erro ao processar imagem: " + msgErrFoto);
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

var CATALOGO_CALCULADORAS = {
  curb: {
    id: "curb65",
    nome: "CURB-65",
    aliases: ["curb", "curb65", "curb-65", "crb65", "crb-65"]
  },
  ckd: {
    id: "ckd",
    nome: "CKD-EPI 2021",
    aliases: ["ckd", "ckd-epi", "ckdepi", "tfg"]
  },
  cockcroft: {
    id: "cockcroft", nome: "Cockcroft-Gault",
    aliases: ["cockcroft", "cockcroft-gault", "clearance", "clearence"]
  },
  cha2ds2: {
    id: "cha2ds2vasc",
    nome: "CHA2DS2-VASc",
    aliases: ["cha2ds2", "cha2ds2-vasc", "cha2ds2vasc", "cha2ds2va", "cha2ds2-va", "chads", "chadvacs", "chadvasc", "vasc"]
  },
  hasbled: {
    id: "hasbled",
    nome: "HAS-BLED",
    aliases: ["hasbled", "has-bled", "has bled"]
  },
  wells: {
    id: "wells",
    nome: "Escore de Wells (TEP/TVP)",
    aliases: ["wells", "wellstep", "wellstvp", "wells-tep", "wells-tvp", "tep", "tvp"]
  },
  heart_timi: {
    id: "heart",
    nome: "HEART Score / TIMI",
    aliases: ["heart", "timi", "heart-timi", "heart score"]
  },
  grace: {
    id: "grace",
    nome: "GRACE Score",
    aliases: ["grace", "grace score"]
  },
  meld: {
    id: "meld",
    nome: "MELD / MELD-Na / Child-Pugh",
    aliases: ["meld", "meld-na", "meldna", "child", "child-pugh", "childpugh"]
  },
  glasgow: {
    id: "glasgow",
    nome: "Glasgow-P",
    aliases: ["glasgow", "glasgow-p", "glasgowp", "gcs", "gcs-p", "gcsp"]
  },
  nihss: {
    id: "nihss",
    nome: "NIHSS",
    aliases: ["nihss", "nih"]
  },
  ranson_bisap: {
    id: "ranson",
    nome: "Ranson / BISAP",
    aliases: ["ranson", "bisap"]
  },
  framingham: {
    id: "framingham",
    nome: "Framingham",
    aliases: ["framingham"]
  },
  frax: {
    id: "frax",
    nome: "FRAX",
    aliases: ["frax"]
  },
  apache: {
    id: "apache",
    nome: "APACHE II",
    aliases: ["apache", "apache2", "apache ii", "apache-2"]
  },
  sofa: {
    id: "sofa",
    nome: "SOFA / qSOFA",
    aliases: ["sofa", "qsofa"]
  },
  kdigo: {
    id: "kdigo",
    nome: "KDIGO (Injúria Renal)",
    aliases: ["kdigo", "injuria renal", "ira"]
  },
  agua: {
    id: "agua",
    nome: "Déficit de Água Livre",
    aliases: ["agua", "deficit agua", "deficit de agua", "deficit de agua livre", "hipernatremia", "deficit"]
  },
  calcio: {
    id: "calcio",
    nome: "Cálcio Corrigido",
    aliases: ["calcio", "calcio corrigido", "calcemia"]
  },
  gap_osmolar: {
    id: "gap_osmolar",
    nome: "Gap Osmolar",
    aliases: ["gap osmolar", "osmolaridade", "gap osmolal"]
  },
  gaso: {
    id: "gasometria",
    nome: "Gasometria Arterial",
    aliases: ["gaso", "gasometria"]
  },
  dva: {
    id: "dva",
    nome: "Drogas Vasoativas",
    aliases: ["dva", "nora", "noradrenalina", "vaso", "vasopressina", "dobuta", "dobutamina"]
  },
  sri: {
    id: "sri",
    nome: "Sequência Rápida de Intubação",
    aliases: ["sri", "intubacao", "intubação", "sequencia rapida", "sequência rápida"]
  },
  ldl: {
    id: "ldl",
    nome: "LDL Martin-Hopkins",
    aliases: ["ldl", "martin", "hopkins", "martin-hopkins"]
  }
};

function ehApenasNomeCalculadora(texto) {
  var s = (texto || "").trim().toLowerCase();
  for (var k in CATALOGO_CALCULADORAS) {
    var c = CATALOGO_CALCULADORAS[k];
    if (c.aliases.indexOf(s) !== -1) return true;
  }
  return false;
}

function ehCalculadoraReconhecida(texto) {
  if (!texto || typeof texto !== "string") return false;
  var t = texto.toLowerCase();
  for (var k in CATALOGO_CALCULADORAS) {
    var c = CATALOGO_CALCULADORAS[k];
    for (var i = 0; i < c.aliases.length; i++) {
      var alias = c.aliases[i];
      var escAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      var re = new RegExp("(?:^|[^a-z0-9à-ÿ])" + escAlias + "(?:$|[^a-z0-9à-ÿ])", "i");
      if (re.test(t)) {
        return true;
      }
    }
  }
  return false;
}

// O primeiro identificador explícito prevalece sobre palavras dos dados clínicos.
function identificarCalculadora(texto) {
  var encontrados = [];
  Object.keys(CATALOGO_CALCULADORAS).forEach(function(k) {
    var c = CATALOGO_CALCULADORAS[k];
    c.aliases.forEach(function(alias) {
      var re = new RegExp("(^|[^a-z0-9à-ÿ])" + alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?=$|[^a-z0-9à-ÿ])", "i");
      var m = String(texto).match(re);
      if (m) encontrados.push({id:c.id, pos:m.index, tamanho:alias.length});
    });
  });
  encontrados.sort(function(a,b) {return a.pos-b.pos || b.tamanho-a.tamanho;});
  return encontrados.length ? encontrados[0].id : null;
}

function tentarCalcularDeterministico(texto) {
  if (!texto || typeof CalculadorasClinicas === "undefined") return null;
  var t = texto.toLowerCase();
  var identidade = identificarCalculadora(texto);
  if (identidade === "ckd") {
    var crCkd = t.match(/\b(?:cr|creatinina)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var idadeCkd = t.match(/\bidade\s*[:=]?\s*(\d+)/i) || t.match(/\b(\d+)\s*anos?\b/i);
    var femCkd = /\b(?:mulher|feminino|fem|f)\b/i.test(t), mascCkd = /\b(?:homem|masculino|masc|m)\b/i.test(t);
    if (!crCkd || !idadeCkd || femCkd === mascCkd) return "⚠️ CKD-EPI: informe creatinina, idade e um único sexo biológico. Peso não altera a fórmula escolhida.";
    var rCkd = CalculadorasClinicas.ckdEpi2021(Number(crCkd[1].replace(",", ".")), Number(idadeCkd[1]), femCkd);
    return rCkd.ok ? rCkd.textoFormatado : "⚠️ CKD-EPI: " + rCkd.erro;
  }
  // Não deixar parâmetros de outra calculadora acionarem uma heurística de clearance.
  if (identidade && ["meld", "cockcroft", "cha2ds2vasc", "hasbled"].indexOf(identidade) === -1) return null;

  // 1. MELD / MELD-Na (Prioritário para evitar colisão com "cr" de clearance)
  if (/\bmeld\b/i.test(t) && CalculadorasClinicas.meld) {
    var mBili = t.match(/bili(?:rrubina)?\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mInr = t.match(/inr\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mCrM = t.match(/cr(?:eatinina)?\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mNa = t.match(/(?:s[oó]dio|na)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);

    // Diálise: Negação rigorosa antes de qualquer positivo
    var dial = false;
    var temNaoDial = /(?:sem|n[aã]o\s+faz|n[aã]o\s+realiza|n[aã]o\s+est[aá]\s+em|n[aã]o|nunca)\s+(?:hemo)?di[aá]lise|n[aã]o\s+dial[ií]tico/i.test(t);
    if (temNaoDial) {
      dial = false;
    } else if (/(?:com|em|faz|realiza)\s+(?:hemo)?di[aá]lise|dial[ií]tico|\bhemodi[aá]lise\b/i.test(t)) {
      dial = true;
    }

    if (!mBili || !mInr || !mCrM) {
      var faltasMeld = [];
      if (!mBili) faltasMeld.push("Bilirrubina total (mg/dL)");
      if (!mCrM) faltasMeld.push("Creatinina sérica (mg/dL)");
      if (!mInr) faltasMeld.push("INR");
      return "⚠️ *Calculadora MELD / MELD-Na Incompleta*\n\n" +
             "Para calcular o escore com segurança clínica, informe os parâmetros obrigatórios:\n" +
             "• " + faltasMeld.join("\n• ") + "\n\n" +
             "💡 *Exemplo:* `/calc MELD bili 2.0, cr 1.5, inr 1.2, sódio 135` (e diálise na última semana se houver).";
    }

    var bili = parseFloat(mBili[1].replace(",", "."));
    var inr = parseFloat(mInr[1].replace(",", "."));
    var crm = parseFloat(mCrM[1].replace(",", "."));
    var na = (mNa && mNa[1]) ? parseFloat(mNa[1].replace(",", ".")) : null;
    var rm = CalculadorasClinicas.meld(bili, crm, inr, na, dial);
    if (rm && rm.ok) {
      return "🧮 *" + rm.nome + "*\n\n• *Score:* `" + rm.principal + "`\n• *Alerta:* " + (rm.rotulo || "Padrão");
    } else {
      var erroMsg = (rm && rm.erro) ? rm.erro : "Valores laboratoriais inválidos ou fora da faixa plausível.";
      return "⚠️ *Calculadora MELD: Parâmetros Inválidos*\n\n" + erroMsg + "\n\n💡 *Faixas válidas:* Bilirrubina ≥ 1,0 mg/dL, Creatinina ≥ 1,0 mg/dL (máx 4,0), INR ≥ 1,0.";
    }
  }

  // 2. Clearance de Creatinina (Cockcroft-Gault)
  if (identidade === "cockcroft" || (!identidade && /cr(?:eatinina)?\b/i.test(t) && /peso/i.test(t))) {
    var mCr = t.match(/(?:cr(?:eatinina)?|cre)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mPeso = t.match(/(?:peso\s*[:=]?\s*)?(\d+(?:[.,]\d+)?)\s*kg\b/i) || t.match(/peso\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mIdade = t.match(/idade\s*[:=]?\s*(\d+)/i) || t.match(/(\d+)\s*a(?:nos)?\b/i);

    var temFem = /fem(?:inino)?|mulher|\bf\b/i.test(t);
    var temMasc = /masc(?:ulino)?|homem|\bm\b/i.test(t);
    if (!temFem && !temMasc) {
      return "⚠️ *Clearance de Creatinina (Cockcroft-Gault)*\n\nPor favor, informe o sexo biológico do paciente (masculino ou feminino). O cálculo exige essa distinção para precisão clínica (fator de correção de 0,85 para mulheres).";
    }
    var ehMulher = temFem && !temMasc;

    if (!mCr || !mPeso || !mIdade) {
      var faltasCg = [];
      if (!mCr) faltasCg.push("Creatinina sérica (mg/dL)");
      if (!mPeso) faltasCg.push("Peso corporal (kg)");
      if (!mIdade) faltasCg.push("Idade (anos)");
      return "⚠️ *Clearance de Creatinina Incompleto*\n\n" +
             "Para estimar a taxa de filtração por Cockcroft-Gault, informe:\n" +
             "• " + faltasCg.join("\n• ") + "\n\n" +
             "💡 *Exemplo:* `/calc clearance Cr 1.2, peso 70 kg, 65 anos, masculino`";
    }

    if (CalculadorasClinicas.cockcroftGault) {
      var cr = parseFloat(mCr[1].replace(",", "."));
      var peso = parseFloat(mPeso[1].replace(",", "."));
      var idade = parseInt(mIdade[1], 10);
      var r = CalculadorasClinicas.cockcroftGault(cr, peso, idade, ehMulher);
      if (r && r.ok) {
        var str = "🧮 *" + (r.nome || "CLEARANCE DE CREATININA (COCKCROFT-GAULT)") + "*\n\n";
        str += "• *Resultado:* `" + r.principal + "`\n";
        if (r.rotulo) str += "• *Alerta:* " + r.rotulo + "\n";
        if (r.secoes) {
          for (var s = 0; s < r.secoes.length; s++) {
            var sec = r.secoes[s];
            str += "\n*" + sec[0] + ":*\n";
            var itens = Array.isArray(sec[1]) ? sec[1] : [sec[1]];
            for (var it = 0; it < itens.length; it++) {
              str += "  • " + itens[it] + "\n";
            }
          }
        }
        return str;
      } else {
        var erroCg = (r && r.erro) ? r.erro : "Valores laboratoriais ou antropométricos fora dos limites biológicos plausíveis.";
        return "⚠️ *Calculadora Clearance: Parâmetros Inválidos*\n\n" + erroCg + "\n\n💡 *Faixas válidas:* Creatinina ≥ 0,1 mg/dL, Peso ≥ 20 kg, Idade ≥ 18 anos.";
      }
    }
  }

  // 3. HAS-BLED Determinístico
  if (/\bhas-?bled\b/i.test(t) && CalculadorasClinicas.hasbled) {
    var semFatoresBled = /\b(?:sem\s+comorbidades?|sem\s+fatores?|sem\s+antecedentes?|h[íi]gid[ao]|previamente\s+h[íi]gid[ao])\b/i.test(t);

    var mIdadeB = t.match(/(\d+)\s*a(?:nos)?\b/) || t.match(/idade\s*[:=]?\s*(\d+)/i);
    var idadeB = mIdadeB ? parseInt(mIdadeB[1], 10) : null;
    var eBled = idadeB !== null ? (idadeB > 65) : (/\b(?:idos[ao]|> ?65)\b/i.test(t) ? true : (semFatoresBled ? false : null));

    function extrairFatorBled(rePos, reNeg) {
      if (reNeg && reNeg.test(t)) return false;
      if (rePos && rePos.test(t)) {
        var m = t.match(rePos);
        if (m) {
          var antes = t.substring(Math.max(0, m.index - 30), m.index);
          if (/\b(?:sem|n[aã]o|nega|aus[êe]ncia\s+de)\b/i.test(antes)) return false;
          return true;
        }
      }
      return semFatoresBled ? false : null;
    }

    var hBled = extrairFatorBled(/\b(?:has|hipertens[aã]o|pas\s*>|press[aã]o\s+alta)\b/i, /\bnormotens[ao]|has\s+controlada\b/i);
    var aRenalBled = extrairFatorBled(/\b(?:renal|di[aá]lise|transplante\s+renal|cr\s*>\s*2[.,]2|creatinina\s*>\s*2[.,]2)\b/i, /\bsem\s+doen[çc]a\s+renal|cr\s+(?:normal|1[.,]\d|0[.,]\d)\b/i);
    var aHepaticoBled = extrairFatorBled(/\b(?:hep[aá]tic[ao]|cirrose|bilirrubina\s*>\s*2|ast\s*>\s*3|alt\s*>\s*3)\b/i, /\bsem\s+(?:doen[çc]a\s+)?hep[aá]tica\b/i);
    var sBled = extrairFatorBled(/\b(?:avc|ait|stroke)\b/i, /\bsem\s+avc\b/i);
    var bBled = extrairFatorBled(/\b(?:sangramento|hemorragia|anemia\s+grave)\b/i, /\bsem\s+sangramento\b/i);
    var lBled = extrairFatorBled(/\b(?:inr\s+l[aá]bil|rni\s+l[aá]bil)\b/i, /\bsem\s+inr\s+l[aá]bil|inr\s+est[aá]vel\b/i);
    var dDrogasBled = extrairFatorBled(/\b(?:aas|aspirina|clopidogrel|aine|antiplaquet[aá]rio)\b/i, /\bsem\s+(?:aas|aine|antiplaquet[aá]rio)\b/i);
    var dAlcoolBled = extrairFatorBled(/\b(?:[aá]lcool|etilismo|bebida\s+alco[oó]lica)\b/i, /\bsem\s+[aá]lcool|n[aã]o\s+bebe|abstemio|social\b/i);

    if (hBled !== null && aRenalBled !== null && aHepaticoBled !== null && sBled !== null &&
        bBled !== null && lBled !== null && eBled !== null && dDrogasBled !== null && dAlcoolBled !== null) {
      var rBled = CalculadorasClinicas.hasbled(hBled, aRenalBled, aHepaticoBled, sBled, bBled, lBled, eBled, dDrogasBled, dAlcoolBled);
      if (rBled && rBled.ok) {
        var strBled = "🧮 *" + rBled.nome + "*\n\n";
        strBled += "• *Pontuação:* `" + rBled.principal + "`\n";
        strBled += "• *Classificação:* " + (rBled.rotulo || rBled.estado || "Calculado") + "\n\n";
        if (rBled.secoes) {
          for (var scB = 0; scB < rBled.secoes.length; scB++) {
            var secB = rBled.secoes[scB];
            strBled += "\n*" + secB[0] + ":*\n";
            var itensB = Array.isArray(secB[1]) ? secB[1] : [secB[1]];
            for (var itB = 0; itB < itensB.length; itB++) strBled += "  • " + itensB[itB] + "\n";
          }
        }
        return strBled;
      }
    }

    var instrucoesHasbled = obterInstrucoesCalculadora("HAS-BLED");
    return "⚠️ *Calculadora HAS-BLED: Parâmetros Insuficientes ou Inválidos*\n\n" + instrucoesHasbled;
  }

  // 4. CHA2DS2-VASc Determinístico
  if (/cha2?ds2|vasc/i.test(t) && CalculadorasClinicas.cha2ds2vasc) {
    var temFemC = /\b(?:mulher|fem(?:inino)?|f)\b/i.test(t);
    var temMascC = /\b(?:homem|masc(?:ulino)?|m)\b/i.test(t);
    var mIdadeC = t.match(/(\d+)\s*a(?:nos)?\b/) || t.match(/idade\s*[:=]?\s*(\d+)/i);
    var idadeC = mIdadeC ? parseInt(mIdadeC[1], 10) : null;

    // Se não há dados mínimos (idade ou sexo ausentes), exige parâmetros obrigatórios
    if (idadeC === null || (!temFemC && !temMascC)) {
      return "⚠️ *Calculadora CHA₂DS₂-VASc (Risco Tromboembólico na FA)*\n\n" +
             "Para calcular o escore com segurança clínica, informe no mínimo:\n" +
             "• *Idade* do paciente (anos)\n" +
             "• *Sexo biológico* (homem ou mulher)\n" +
             "• *Fatores de risco* presentes ou ausentes (IC, HAS, DM, AVC/AIT prévio, Doença Vascular).\n\n" +
             "💡 *Exemplo:* `/calc CHA2DS2-VASc mulher, 68 anos, hipertensa, diabética, sem IC, sem AVC`";
    }

    // Detecção de histórico/antecedentes/comorbidades desconhecidos (V01)
    var temFatoresDesconhecidos = /(?:antecedentes?|fatores?|comorbidades?|hist[oó]rico|doen[çc]as?)\s+(?:desconhecid[ao]s?|n[aã]o\s+informad[ao]s?|incert[ao]s?|d[uú]vidos[ao]s?|ignorad[ao]s?)|n[aã]o\s+sabe\s+(?:antecedentes|comorbidades|hist[oó]rico|fatores)|hist[oó]rico\s+desconhecido|sem\s+informa[çc][ãa]o\s+de\s+(?:antecedentes|comorbidades|fatores)|\bdesconhecid[ao]s?\b/i.test(t);
    if (temFatoresDesconhecidos) {
      return "⚠️ *Calculadora CHA₂DS₂-VASc: Antecedentes Desconhecidos*\n\n" +
             "Não é seguro calcular o escore com comorbidades desconhecidas. Subestimar o risco tromboembólico pode privar o paciente de anticoagulação indicada para prevenção de AVC.\n\n" +
             "Para calcular o escore com segurança clínica, informe a presença ou ausência dos fatores de risco:\n" +
             "• *IC:* Insuficiência Cardíaca Congestiva / Disfunção de VE\n" +
             "• *HAS:* Hipertensão Arterial Sistêmica\n" +
             "• *DM:* Diabetes Mellitus\n" +
             "• *AVC/AIT:* Tromboembolismo ou AVC prévio\n" +
             "• *Doença Vascular:* IAM prévio, DAOP ou placa aórtica\n\n" +
             "💡 *Exemplo:* `/calc CHA2DS2-VASc homem, 60 anos, sem HAS, sem DM, sem AVC, sem IC, sem doença vascular` (ou informe se for previamente hígido/sem comorbidades).";
    }

    // Se nenhum fator foi mencionado (positivo ou negativamente), exige confirmação dos fatores
    var temMencaoFatores = /(?:ic|insufici[êe]ncia|has|hipertens|dm|diab[eé]t|avc|ait|stroke|trombo|vascular|iam|infarto|daop|coronario|comorbidade|fator|antecedente|h[íi]gid[ao]|doen[çc]a)/i.test(t);
    if (!temMencaoFatores) {
      return "⚠️ *Calculadora CHA₂DS₂-VASc (Risco Tromboembólico na FA)*\n\n" +
             "Para calcular o escore com segurança clínica, informe a presença ou ausência dos fatores de risco:\n" +
             "• *IC:* Insuficiência Cardíaca Congestiva / Disfunção de VE\n" +
             "• *HAS:* Hipertensão Arterial Sistêmica\n" +
             "• *DM:* Diabetes Mellitus\n" +
             "• *AVC/AIT:* Tromboembolismo ou AVC prévio\n" +
             "• *Doença Vascular:* IAM prévio, DAOP ou placa aórtica\n\n" +
             "💡 *Exemplo:* `/calc CHA2DS2-VASc homem, 60 anos, sem HAS, sem DM, sem AVC, sem IC, sem doença vascular` (ou informe se for previamente hígido/sem comorbidades).";
    }

    var ehMulherC = temFemC && !temMascC;
    var i75C = (idadeC >= 75);
    var i65C = (idadeC >= 65 && idadeC < 75);

    var semComorbidadesGeral = /\b(?:sem\s+(?:outras\s+)?comorbidades?|sem\s+(?:outros\s+)?fatores?|sem\s+(?:outros\s+)?antecedentes?|h[íi]gid[ao]|previamente\s+h[íi]gid[ao]|nega\s+comorbidades?|sem\s+doen[çc]as?)\b/i.test(t);

    var defFatores = {
      has: {
        re: /\b(?:has|hipertens[aã]o|hipertenso|hipertensa|press[aã]o\s+alta|pa\s*(?:elevada|>))\b/i,
        reAutoNeg: /\bnormotens[ao]\b/i,
        nome: "HAS (Hipertensão)"
      },
      ic: {
        re: /\b(?:ic|icc|insufici[êe]ncia\s+card[íi]aca|disfun[çc][ãa]o\s+(?:de\s+)?ve)\b/i,
        nome: "IC (Insuficiência Cardíaca)"
      },
      dm: {
        re: /\b(?:dm|dm[12]|diabetes|diab[eé]tic[ao]|glicemia\s+alta)\b/i,
        nome: "DM (Diabetes Mellitus)"
      },
      avc: {
        re: /\b(?:avc|ait|stroke|tromboembolismo|embolia|isquemia\s+cerebral|ave)\b/i,
        nome: "AVC/AIT prévio"
      },
      vasc: {
        re: /\b(?:vascular|doen[çc]a\s+vascular|iam|infarto|daop|placa\s+a[oó]rtica|coronariopatia|doen[çc]a\s+coronariana|dac)\b/i,
        nome: "Doença Vascular (IAM, DAOP)"
      }
    };

    var estados = {
      has: semComorbidadesGeral ? "ausente" : "desconhecido",
      ic: semComorbidadesGeral ? "ausente" : "desconhecido",
      dm: semComorbidadesGeral ? "ausente" : "desconhecido",
      avc: semComorbidadesGeral ? "ausente" : "desconhecido",
      vasc: semComorbidadesGeral ? "ausente" : "desconhecido"
    };

    // Extração com resolução léxica estrita de polaridade para cada fator
    for (var fKey in defFatores) {
      var fDef = defFatores[fKey];
      if (fDef.reAutoNeg && fDef.reAutoNeg.test(t)) {
        estados[fKey] = "ausente";
        continue;
      }

      var regexBusca = new RegExp(fDef.re.source, "gi");
      var match;
      while ((match = regexBusca.exec(t)) !== null) {
        var pos = match.index;
        var trechoAntes = t.substring(0, pos).split(/[.;\n]/).pop();
        // O último operador explícito determina o escopo; vírgulas preservam listas coordenadas.
        // "não tem" é uma única negação, enquanto "sem IC, tem HAS" muda para afirmativo.
        var operadores = /\b(?:n[aã]o\s+(?:tem|apresenta|possui)|sem|n[aã]o|nega|aus[êe]ncia\s+de|livre\s+de|tem|apresenta|possui|com|portador[ae]?\s+de|mas|por[eé]m|contudo|todavia|entretanto|exceto|salvo)\b/gi;
        var op, negado = false;
        while ((op = operadores.exec(trechoAntes)) !== null) {
          negado = /^(?:sem|n[aã]o|nega|aus[êe]ncia|livre)/i.test(op[0]);
        }
        estados[fKey] = negado ? "ausente" : "presente";
      }
    }

    var hasC = (estados.has === "presente");
    var icC = (estados.ic === "presente");
    var dmC = (estados.dm === "presente");
    var avcC = (estados.avc === "presente");
    var vascC = (estados.vasc === "presente");

    // Executa a função pura determinística (para compatibilidade e mocks)
    var rCha = CalculadorasClinicas.cha2ds2vasc(icC, hasC, i75C, dmC, avcC, vascC, i65C, ehMulherC);

    // Validação estrita de completude clínica (X01/X02/W01):
    // Se QUALQUER um dos cinco fatores clínicos permanecer desconhecido (e não houver atestado geral de higidez):
    // O escore recusa o fechamento e NUNCA emite pontuação definitiva (0/9, 1/9) nem recomendação de conduta.
    var faltantes = [];
    for (var kF in defFatores) {
      if (estados[kF] === "desconhecido") {
        faltantes.push(defFatores[kF].nome);
      }
    }

    if (faltantes.length > 0) {
      return "⚠️ *Calculadora CHA₂DS₂-VASc: Fatores Incompletos*\n\n" +
             "Para calcular o escore com segurança clínica sem presumir ausência de dados, informe a presença ou ausência dos fatores de risco clínicos não declarados:\n" +
             "• " + faltantes.join("\n• ") + "\n\n" +
             "💡 *Exemplo:* `/calc CHA2DS2-VASc homem, 60 anos, HAS, sem DM, sem AVC, sem IC, sem doença vascular` (ou declare se o paciente for previamente hígido / sem comorbidades).";
    }

    if (rCha && rCha.ok) {
      var strCha = "🧮 *" + rCha.nome + "*\n\n";
      strCha += "• *Pontuação:* `" + rCha.principal + "`\n";
      strCha += "• *Classificação:* " + (rCha.rotulo || rCha.estado || "Calculado") + "\n\n";
      strCha += "📋 *Recomendação:* " + (rCha.recomendacao || rCha.rotulo || rCha.estado) + "\n";
      if (rCha.secoes) {
        for (var sc = 0; sc < rCha.secoes.length; sc++) {
          var secC = rCha.secoes[sc];
          strCha += "\n*" + secC[0] + ":*\n";
          var itensC = Array.isArray(secC[1]) ? secC[1] : [secC[1]];
          for (var itc = 0; itc < itensC.length; itc++) strCha += "  • " + itensC[itc] + "\n";
        }
      }
      return strCha;
    }
  }

  return null;
}

function obterInstrucoesCalculadora(tipo) {
  var t = (tipo || "").toUpperCase();

  if (t.indexOf("CURB") !== -1) {
    return "📐 *CALCULADORA: CURB-65 (Gravidade na PAC)*\n\n" +
      "Envie os seguintes dados do paciente:\n" +
      "• *C (Confusão mental):* Desorientação aguda? (Sim/Não)\n" +
      "• *U (Ureia):* Ureia sérica (mg/dL) ou BUN (mg/dL)\n" +
      "• *R (Respiração):* Frequência Respiratória (irpm)\n" +
      "• *B (Blood Pressure):* Pressão Arterial (PAS < 90 ou PAD ≤ 60 mmHg)\n" +
      "• *65:* Idade do paciente (anos)\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`71 anos, lúcido, PA 100/60, FR 32, Ureia 68`";
  }

  if (t.indexOf("CKD") !== -1 || t.indexOf("COCKCROFT") !== -1) {
    return "📐 *CALCULADORA: FUNÇÃO RENAL (CKD-EPI / Cockcroft-Gault)*\n\n" +
      "Envie os seguintes dados para estimar a TFG / Clearance:\n" +
      "• *Idade:* (em anos)\n" +
      "• *Sexo biológico:* (Masculino / Feminino)\n" +
      "• *Creatinina sérica:* (em mg/dL)\n" +
      "• *Peso atual:* (em kg - fundamental para Cockcroft)\n" +
      "• *Altura:* (em cm - opcional)\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`Homem, 68 anos, 74 kg, Creatinina 1.9 mg/dL`";
  }

  if (t.indexOf("WELLS") !== -1) {
    return "📐 *CALCULADORA: ESCORE DE WELLS (TEP ou TVP)*\n\n" +
      "Especifique se a suspeita é de *TEP* ou *TVP* e informe:\n" +
      "• Sinais/sintomas clínicos de TVP (edema assimétrico, dor à palpação)?\n" +
      "• Frequência Cardíaca (bpm) — FC > 100?\n" +
      "• Imobilização ≥ 3 dias ou cirurgia nas últimas 4 semanas?\n" +
      "• Episódio prévio documentado de TVP ou TEP?\n" +
      "• Presença de hemoptise?\n" +
      "• Câncer ativo (tratamento nos últimos 6 meses ou paliativo)?\n" +
      "• Diagnóstico de TEP é o mais provável ou tão provável quanto outro?\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`Suspeita TEP, FC 108, cirurgia de fêmur há 15 dias, sem hemoptise, TEP é hipótese principal`";
  }

  if (t.indexOf("SOFA") !== -1) {
    return "📐 *CALCULADORA: qSOFA & SOFA (Sepse)*\n\n" +
      "Para *qSOFA* (beira do leito), envie:\n" +
      "• *Glasgow:* (< 15 ou rebaixamento agudo?)\n" +
      "• *Pressão Sistólica:* (PAS ≤ 100 mmHg?)\n" +
      "• *Frequência Respiratória:* (FR ≥ 22 irpm?)\n\n" +
      "Para *SOFA Completo* (UTI), informe também:\n" +
      "• PaO2/FiO2, Plaquetas, Bilirrubinas, PAM/Noradrenalina, Creatinina/Diurese.\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`Confuso (Glasgow 13), PA 85/50, FR 24 irpm, febre e tosse produtiva`";
  }

  if (t.indexOf("CHA2") !== -1 || t.indexOf("VAS") !== -1) {
    return "📐 *CALCULADORA: CHA2DS2-VASc (Risco Tromboembólico na FA)*\n\n" +
      "Envie o perfil clínico do paciente:\n" +
      "• *Idade:* (em anos)\n" +
      "• *Sexo:* (Masculino / Feminino)\n" +
      "• *IC:* Insuficiência Cardíaca congestiva? (Sim/Não)\n" +
      "• *HAS:* Hipertensão arterial sistêmica? (Sim/Não)\n" +
      "• *DM:* Diabetes Mellitus? (Sim/Não)\n" +
      "• *AVC/AIT:* AVC, AIT ou embolia prévia? (Sim/Não)\n" +
      "• *Doença Vascular:* IAM prévio, DAOP ou placa aórtica? (Sim/Não)\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`Mulher, 74 anos, hipertensa, diabética, sem histórico de AVC ou IC`";
  }

  if (t.indexOf("BLED") !== -1) {
    return "📐 *CALCULADORA: HAS-BLED (Risco de Sangramento na Anticoagulação)*\n\n" +
      "Envie os fatores de risco presentes:\n" +
      "• *H (Hipertensão):* PAS não controlada > 160 mmHg?\n" +
      "• *A (Renal/Hepático):* Diálise, Cr > 2.26 ou Cirrose/Bilirrubina > 2x?\n" +
      "• *S (AVC):* Histórico de AVC prévio?\n" +
      "• *B (Bleeding):* Histórico de sangramento maior ou anemia grave?\n" +
      "• *L (Lábil):* RNI lábil se usa Varfarina?\n" +
      "• *E (Elderly):* Idade > 65 anos?\n" +
      "• *D (Drogas/Álcool):* Usa AAS/AINEs ou ingere álcool ≥ 8 doses/semana?\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`70 anos, HAS controlada, sem sangramento prévio, Cr 1.1, usa AAS e faz uso social de álcool`";
  }

  if (t.indexOf("HEART") !== -1 || t.indexOf("TIMI") !== -1) {
    return "📐 *CALCULADORA: HEART SCORE & TIMI (Dor Torácica / SCA)*\n\n" +
      "Envie os dados de estratificação no pronto-socorro:\n" +
      "• *História clínica:* (Altamente suspeita / Moderadamente suspeita / Pouco suspeita)\n" +
      "• *ECG:* (Normal / Repolarização inespecífica / Isquemia aguda/onda T)\n" +
      "• *Idade:* (em anos)\n" +
      "• *Fatores de risco:* (HAS, Diabetes, Tabagismo, DLP, Obesidade, Histórico familiar precoce)\n" +
      "• *Troponina:* (Valor sérico e referência ou Positiva/Negativa)\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`Dor opressiva retroesternal típica há 2h com irradiação MSE, 58 anos, hipertenso e fumante, ECG com T invertida V4-V6, Troponina positiva`";
  }

  if (t.indexOf("GRACE") !== -1) {
    return "📐 *CALCULADORA: GRACE SCORE (SCA com ou sem Supra de ST)*\n\n" +
      "Envie os parâmetros clínicos da admissão:\n" +
      "• Idade (anos), FC (bpm), PAS (mmHg), Creatinina (mg/dL)\n" +
      "• Classe Killip (I a IV)\n" +
      "• PCR na admissão? Desvio de ST no ECG? Troponina elevada?\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`65 anos, FC 88, PA 115/70, Cr 1.2, Killip I, sem PCR, infra de ST 1.5mm, Troponina positiva`";
  }

  if (t.indexOf("MELD") !== -1 || t.indexOf("CHILD") !== -1) {
    return "📐 *CALCULADORA: CHILD-PUGH & MELD (Hepatopatia Crônica)*\n\n" +
      "Envie os parâmetros laboratoriais e clínicos:\n" +
      "• Bilirrubina total (mg/dL), Albumina (g/dL), RNI\n" +
      "• Ascite (Ausente/Leve/Refratária), Encefalopatia (Ausente/Grau 1-2/Grau 3-4)\n" +
      "• Creatinina (mg/dL) e Sódio sérico (mEq/L)\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`Bilirrubina 2.7, Albumina 3.0, RNI 1.8, Creatinina 1.3, Sódio 134, ascite leve, sem encefalopatia`";
  }

  if (t.indexOf("GLASGOW") !== -1) {
    return "📐 *CALCULADORA: ESCALA DE COMA DE GLASGOW COM PUPILAS (Glasgow-P)*\n\n" +
      "Envie as respostas avaliadas:\n" +
      "• *Abertura Ocular (1–4):* Espontânea (4), Ao chamado (3), À pressão (2), Nenhuma (1)\n" +
      "• *Resposta Verbal (1–5):* Orientada (5), Confusa (4), Inapropriada (3), Sons ininteligíveis (2), Nenhuma (1)\n" +
      "• *Resposta Motora (1–6):* Obedece comandos (6), Localiza dor (5), Flexão normal (4), Flexão anormal (3), Extensão (2), Nenhuma (1)\n" +
      "• *Pupilas:* Ambas fotorreagentes (0), Apenas uma reage (-1), Nenhuma reage (-2)\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`Abertura ao chamado (3), palavras desconexas (3), localiza dor (5), pupilas reagentes (0)`";
  }

  if (t.indexOf("NIHSS") !== -1) {
    return "📐 *CALCULADORA: NIHSS (Escala de AVC Isquêmico)*\n\n" +
      "Envie os achados neurológicos observados:\n" +
      "• Nível de consciência, olhar conjugado, campo visual, paresia facial, força motora (MSD, MSE, MID, MIE), ataxia, sensibilidade, linguagem/disartria, extinção.\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`Alerta, desvio de rima à D, paresia braquiocrural D grau 3, disartria moderada, sem afasia`";
  }

  if (t.indexOf("RANSON") !== -1 || t.indexOf("BISAP") !== -1) {
    return "📐 *CALCULADORA: BISAP & RANSON (Pancreatite Aguda)*\n\n" +
      "Envie as variáveis clínicas das primeiras 24h:\n" +
      "• Ureia > 50 mg/dL, Idade > 60 anos, SIRS presente, Glasgow < 15, Derrame pleural no RX.\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`64 anos, lúcido, FC 102, FR 22, Tax 38.2, Ureia 58, RX com derrame pleural à esquerda`";
  }

  if (t.indexOf("FRAMINGHAM") !== -1) {
    return "📐 *CALCULADORA: RISCO CARDIOVASCULAR (Framingham / SBC)*\n\n" +
      "Envie os parâmetros:\n" +
      "• Idade, Sexo, Colesterol Total, HDL, PAS, uso de anti-hipertensivo, tabagismo, diabetes.\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`Homem, 54 anos, CT 225, HDL 38, PA 145/90 com Losartana, fumante, não diabético`";
  }

  if (t.indexOf("AGUA") !== -1 || t.indexOf("DEFICIT") !== -1) {
    return "📐 *CALCULADORA: DÉFICIT DE ÁGUA LIVRE (Hipernatremia)*\n\n" +
      "Envie os parâmetros para reposição:\n" +
      "• Sódio sérico atual (mEq/L), Sódio alvo (ex: 140 mEq/L), Peso (kg), Perfil (Homem idoso, Mulher adulta, etc.).\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`Homem idoso, 65 kg, Sódio atual 162 mEq/L, alvo 145 mEq/L`";
  }

  return "📐 *" + tipo + "*\n\n" +
    "Por favor, envie os dados clínicos e laboratoriais do paciente para este cálculo.\n" +
    "💡 *Exemplo:* Idade, sexo, sinais vitais e valores laboratoriais relevantes.";
}

function enviarMenuCategoriasCalculadoras(chatId, messageId) {
  var token = ConfigService.get("TELEGRAM_BOT_TOKEN");
  var teclado = {
    "inline_keyboard": [
      [{"text": "🫀 Cardio & Vascular", "callback_data": "calc_cat_cardio"}],
      [{"text": "🧪 Nefro, Metabólico & Geral", "callback_data": "calc_cat_renal"}],
      [{"text": "🧠 Neuro & Terapia Intensiva", "callback_data": "calc_cat_neuro"}]
    ]
  };
  var texto = "📐 *CALCULADORAS CLÍNICAS DETERMINÍSTICAS*\n\nEscolha uma categoria ou envie diretamente no chat:\n💡 *Ex:* `/calc curb65 71a confuso PA 100/60 FR 32 Ureia 68`";

  if (messageId && token) {
    executarPostTelegram("https://api.telegram.org/bot" + token + "/editMessageText", {
      "chat_id": chatId, "message_id": messageId, "text": texto, "parse_mode": "Markdown", "reply_markup": teclado
    });
  } else {
    enviarMensagemComTecladoParaChat(chatId, texto, teclado);
  }
}

function enviarSubmenuCalculadoras(chatId, messageId, categoria) {
  var token = ConfigService.get("TELEGRAM_BOT_TOKEN");
  var teclado = [];
  var tituloCat = "";

  if (categoria === "calc_cat_cardio") {
    tituloCat = "🫀 *Calculadoras Cardiovasculares:*";
    teclado = [
      [{"text": "CHA2DS2-VASc", "callback_data": "calc_CHA2DS2-VASc"}, {"text": "HAS-BLED", "callback_data": "calc_HAS-BLED"}],
      [{"text": "Wells (TEP/TVP)", "callback_data": "calc_Wells"}, {"text": "HEART / TIMI", "callback_data": "calc_HEART-TIMI"}],
      [{"text": "GRACE Score", "callback_data": "calc_GRACE"}, {"text": "Framingham", "callback_data": "calc_Framingham"}],
      [{"text": "⬅️ Voltar ao Menu", "callback_data": "calc_menu_principal"}]
    ];
  } else if (categoria === "calc_cat_renal") {
    tituloCat = "🧪 *Calculadoras Nefro, Metabólicas & Gerais:*";
    teclado = [
      [{"text": "CKD-EPI / Cockcroft", "callback_data": "calc_CKD-EPI"}, {"text": "CURB-65", "callback_data": "calc_CURB-65"}],
      [{"text": "Déficit de Água", "callback_data": "calc_Agua"}, {"text": "LDL Martin-Hopkins", "callback_data": "calc_LDL-Martin-Hopkins"}],
      [{"text": "FRAX (Fratura)", "callback_data": "calc_FRAX"}],
      [{"text": "⬅️ Voltar ao Menu", "callback_data": "calc_menu_principal"}]
    ];
  } else if (categoria === "calc_cat_neuro") {
    tituloCat = "🧠 *Calculadoras Neuro & Terapia Intensiva:*";
    teclado = [
      [{"text": "Glasgow-P", "callback_data": "calc_Glasgow"}, {"text": "NIHSS (AVC)", "callback_data": "calc_NIHSS"}],
      [{"text": "qSOFA / SOFA", "callback_data": "calc_SOFA"}, {"text": "Child-Pugh / MELD", "callback_data": "calc_MELD"}],
      [{"text": "Ranson / BISAP", "callback_data": "calc_Ranson"}, {"text": "APACHE II", "callback_data": "calc_APACHE"}],
      [{"text": "⬅️ Voltar ao Menu", "callback_data": "calc_menu_principal"}]
    ];
  }

  if (messageId && token) {
    executarPostTelegram("https://api.telegram.org/bot" + token + "/editMessageText", {
      "chat_id": chatId, "message_id": messageId, "text": "📐 " + tituloCat + "\n\nSelecione a ferramenta desejada:", "parse_mode": "Markdown", "reply_markup": { "inline_keyboard": teclado }
    });
  }
}

function enviarManual(chatId) {
  var manual =
    "📖 *GUIA DEFINITIVO DE OPERAÇÃO DO COPILOTO CLÍNICO 4.0*\n\n" +
    "Seu assistente médico de emergência, enfermaria e rotina hospitalar 24/7 na nuvem. Aprenda a utilizar 100% das ferramentas do bot:\n\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "📱 *1. COMO NAVEGAR NO BOT (3 MODOS)*\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "1️⃣ *Teclado Rápido no Rodapé:* 6 botões sempre na base da tela para acesso com 1 toque do polegar (`🩺 Novo SOAP`, `💊 Prescrever`, `🏥 Enfermaria`, `📐 Calculadoras`, `📅 Minha rotina`, `🚨 Sala Vermelha`). Se o teclado sumir, envie `/teclado` para reativar.\n" +
    "2️⃣ *Central de Comandos (`/menu`):* Abre um painel interativo com botões organizados por especialidade clínica. Todos os menus possuem botão de retorno `« Menu principal`.\n" +
    "3️⃣ *Voz e Linguagem Natural:* Você não precisa decorar comandos! Pode falar por áudio gravado no corredor ou escrever naturalmente (ex.: _\"paciente 70kg em choque septico, calcula nora\"_ ou _\"prescrever amoxicilina 500mg para sinusite\"_). A IA classifica e executa automaticamente.\n\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "🧠 *2. MEMÓRIA & GERENCIAMENTO DE CASOS*\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "• *Memória de 15 minutos:* Ao iniciar um caso clínico (`/soap`, `/leito`, etc.), o bot retém os dados do paciente. Você pode enviar novas frases apenas com atualizações (ex.: _\"chegou o potássio de 3.2\"_ ou _\"ficou hipotenso\"_) sem ter que reenviar tudo.\n" +
    "• `/novo` ou `🩺 Novo SOAP`: *Limpar memória.* Use SEMPRE ao trocar de paciente para garantir que os dados não se misturem.\n" +
    "• `/cancelar`: Encerra o modo ativo (edição de leito, cálculo de droga ou modo de voz) a qualquer momento.\n" +
    "• `/fila`: Mostra os pedidos e entregas assíncronas sendo geradas em segundo plano.\n\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "🚨 *3. SALA VERMELHA & EMERGÊNCIA (RESPOSTA IMEDIATA)*\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "💉 *Drogas Vasoativas em mL/h (`/dva`):*\n" +
    "• `/dva nora 70` → Noradrenalina (solução padrão 64 mcg/mL) calculada em mL/h e mcg/kg/min.\n" +
    "• `/dva nora 80 concentrada` → Solução concentrada (128 mcg/mL).\n" +
    "• `/dva dobuta 65` → Dobutamina (1 mg/mL) em mL/h para 65 kg.\n" +
    "• `/dva vaso` → Vasopressina em dose fixa de 0,03 UI/min (vazão de 9 mL/h).\n" +
    "• `/dva nipride 75` ou `/dva tridil` → Nitroprussiato e Nitroglicerina com titulação.\n\n" +
    "🫁 *Sequência Rápida de Intubação (`/sri`):*\n" +
    "• `/sri 70` → Doses e volumes exatos em mL de Etomidato, Quetamina, Succinilcolina, Rocurônio e Fentanil.\n" +
    "• `/sri 70 choque` → Ajuste hemodinâmico de indução para choque circulatório.\n" +
    "• `/sri 80 asma` → Indução ajustada para broncoespasmo grave.\n\n" +
    "🩸 *Gasometria Arterial Completa (`/gaso`):*\n" +
    "• `/gaso pH 7.22, pCO2 28, HCO3 11, Na 140, Cl 102, Alb 3.0`\n" +
    "• Calcula: Distúrbio primário, resposta compensatória (Winter), Ânion Gap corrigido pela albumina, Delta-Delta para distúrbios mistos/triplos e relação PaO2/FiO2.\n\n" +
    "⚡ *Condutas de Ataque em Emergências (`/conduta`):*\n" +
    "• Doses prontas em ampolas e mL imediatos: `/conduta PCR chocavel`, `/conduta EAP hipertensivo`, `/conduta anafilaxia`, `/conduta crise convulsiva`, `/conduta hipercalemia`, `/conduta cetoacidose`.\n\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "🏥 *4. ENFERMARIA VIRTUAL & LEITOS*\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "• `/enfermaria`: Quadro geral de todos os leitos com censo de gravidade (🟢 Estável, 🟡 Vigilância, 🔴 Instável) e botões de ação.\n" +
    "• `/leito <num> <evolução>`: Cadastra ou atualiza o paciente do leito. Ex.: `/leito 4 72a, PAC grave, Ceftriaxona D3, estável, aguarda vaga UTI`.\n" +
    "• `/passagem`: Gera a passagem de plantão consolidada da equipe no padrão SBAR (Situação, Background, Avaliação, Recomendação) com 1 toque.\n" +
    "• `/alta <num>`: Desocupa o leito e registra a alta hospitalar.\n\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "💊 *5. PRESCRIÇÃO, AMBULATÓRIO & ROUND*\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "• `/rx <pedido ou diagnóstico>`: Busca na REMUME municipal (Ribeirão Preto), estrutura a posologia padrão e gera botão para emissão de PDF A4 timbrado oficial no Google Drive e botão nativo de cópia para prontuário.\n" +
    "• `/soap <caso>`: Síntese estruturada completa (Subjetivo, Objetivo, Avaliação, Plano) pronta para o prontuário eletrônico.\n" +
    "• `/round <caso>`: Pitch oral de 60 segundos para apresentar o paciente no round da enfermaria/UTI + 3 perguntas socráticas antecipadas.\n" +
    "• `/voz <caso>`: Sabatina médica cirúrgica enviada como mensagem de áudio de voz para você ouvir e responder no fone de ouvido enquanto caminha.\n" +
    "• `/interacao <drogas>`: Checagem cruzada de interações medicamentosas graves e nomes comerciais.\n\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "🧮 *6. CALCULADORAS CLÍNICAS DETERMINÍSTICAS (`/calc`)*\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "Digite `/calc` para abrir o menu visual ou envie os dados diretamente por texto:\n" +
    "• *Clearance de Creatinina (Cockcroft-Gault):* `/calc clearance Cr 1.2, peso 70, idade 65, masculino`\n" +
    "• *CHA2DS2-VASc:* `/calc cha2ds2vasc` (estratificação de risco de AVC em FA)\n" +
    "• *KDIGO:* `/calc kdigo` (estadiamento rigoroso de Injúria Renal Aguda)\n" +
    "• *Glasgow-P:* `/calc glasgow` (escore de coma com reatividade pupilar)\n" +
    "• *MELD e MELD-Na 2016:* `/calc meld` (estratificação de gravidade em hepatopatia crônica)\n\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "📅 *7. LIFESTYLE, ROTINA ADAPTATIVA & PRODUTIVIDADE*\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "• `/rotina`: Painel do dia com timeline dinâmica, time-blocking adaptativo e botões de ação imediata.\n" +
    "• `/rotina alterar <ajuste>`: Adapta seus blocos em tempo real (ex.: `/rotina alterar hoje treino às 19h` ou `/rotina alterar não vou treinar`).\n" +
    "• `/rotina [hoje/amanha/semana/reset/descanso]`: Navegação e controle ágil da rotina.\n" +
    "• `/briefing`: Raio-X matinal completo com sua timeline real de hoje.\n" +
    "• `/checkin`: Check-in noturno inteligente dos hábitos ativos no Notion.\n" +
    "• `/agenda [hoje/amanha]`: Consulta seus compromissos no Google Calendar.\n" +
    "• `/task <texto>`: Salva uma pendência imediata no Inbox do Notion Tasks (ex.: `/task Ligar para a regulação do leito 3`).\n" +
    "• `/tasks`: Lista suas pendências e tarefas de hoje no Notion.\n" +
    "• `/duvida <tema>`: Arquiva uma dúvida clínica para o bloco de estudo noturno no MedQuest.\n" +
    "• `/plantao_fim`: Checklist de encerramento do plantão, leitos pendentes e passagem executiva.\n\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "🎙️ *8. MULTIMODALIDADE (FOTOS E ÁUDIOS)*\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "• *Áudio de voz:* Pressione o microfone e grave seu raciocínio clínico ou ajustes de rotina enquanto anda pelo hospital. O bot transcreve e estrutura automaticamente.\n" +
    "• *Fotos e Imagens:* Envie fotos de ECGs de 12 derivações, radiografias, laudos de tomografia ou lesões dermatológicas para suporte diagnóstico rápido e interativo.";

  enviarMensagemParaChat(chatId, manual);
}

/**
 * Trata o comando /rotina e suas variações
 */
function tratarComandoRotina(chatId, argRotina) {
  var hoje = new Date();
  var tz = (typeof ConfigService !== "undefined" && ConfigService.get) ? ConfigService.get("TIMEZONE", "America/Sao_Paulo") : "America/Sao_Paulo";
  var arg = (argRotina || "").trim().toLowerCase();

  if (!arg || arg === "hoje") {
    var blocosHoje = RotinaService.obterBlocosDoDia(hoje);
    var txtHoje = "☀️ *ROTINA DO DIA (TIME-BLOCKING ADAPTATIVO)*\n\n" +
      RotinaService.formatarTimelineMarkdown(blocosHoje, hoje) +
      "\n\n💡 *Para ajustar:* Toque abaixo ou envie: _'Hoje treino às 19h'_ ou áudio gravado!";
    var kbHoje = RotinaService.construirTecladoTimeline(hoje, blocosHoje);
    return enviarMensagemComTecladoParaChat(chatId, txtHoje, kbHoje);
  }

  if (arg === "amanha" || arg === "amanhã") {
    var amanha = new Date(hoje.getTime() + 86400000);
    var blocosAmanha = RotinaService.obterBlocosDoDia(amanha);
    var txtAmanha = "📆 *ROTINA DE AMANHÃ (PLANEJAMENTO ADAPTATIVO)*\n\n" +
      RotinaService.formatarTimelineMarkdown(blocosAmanha, amanha) +
      "\n\n💡 *Para ajustar amanhã:* Envie: _'/rotina alterar amanhã <instrução>'_.";
    var kbAmanha = RotinaService.construirTecladoTimeline(amanha, blocosAmanha);
    return enviarMensagemComTecladoParaChat(chatId, txtAmanha, kbAmanha);
  }

  if (arg === "semana" || arg === "grade") {
    var resumoSemanal = RotinaService.obterResumoSemanal();
    return enviarMensagemParaChat(chatId, resumoSemanal);
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
  } else if (subAcao === "reset") {
    RotinaService.resetarBlocosDoDia(hoje);
    responderCallbackTelegram(cb.id, "🔄 Rotina restaurada para o padrão!");
  } else if (subAcao === "descanso") {
    RotinaService.aplicarInstrucao(hoje, "modo descanso");
    responderCallbackTelegram(cb.id, "💤 Modo descanso ativado hoje!");
  } else if (subAcao === "cal_sync") {
    var resSync = RotinaService.sincronizarComGoogleCalendar(hoje);
    if (resSync && resSync.sucesso) {
      responderCallbackTelegram(cb.id, "📆 " + resSync.criados + " blocos sincronizados na Agenda Google!");
    } else {
      responderCallbackTelegram(cb.id, "⚠️ Erro ao sincronizar com Agenda Google.");
    }
    return;
  } else if (subAcao === "ajustar") {
    responderCallbackTelegram(cb.id, "✏️ Envie sua instrução de ajuste!");
    var msgDica = "✏️ *COMO AJUSTAR SUA ROTINA HOJE:*\n\n" +
      "Basta digitar ou mandar um áudio gravado no chat. Exemplos:\n" +
      "• _'Hoje não vou treinar'_\n" +
      "• _'Mudei o treino para as 19h'_\n" +
      "• _'Hoje vou estudar das 15h às 17h'_\n" +
      "• _'Sem cochilo hoje'_\n" +
      "• _'Troquei musculação por corrida de 40 min'_\n" +
      "• _'Modo descanso'_\n" +
      "• _'Reset' (volta para a grade padrão)_";
    return enviarMensagemParaChat(chatId, msgDica);
  } else if (subAcao === "ver_amanha") {
    responderCallbackTelegram(cb.id, "📆 Carregando amanhã...");
    var amanha = new Date(hoje.getTime() + 86400000);
    var blocosAmanha = RotinaService.obterBlocosDoDia(amanha);
    var txtAmanha = "📆 *ROTINA DE AMANHÃ (PLANEJAMENTO ADAPTATIVO)*\n\n" +
      RotinaService.formatarTimelineMarkdown(blocosAmanha, amanha) +
      "\n\n💡 *Para ajustar amanhã:* Envie: _'/rotina alterar amanhã <instrução>'_.";
    var kbAmanha = {
      inline_keyboard: [
        [{ text: "📅 Voltar para Hoje", callback_data: "rotina:ver_hoje" }],
        [{ text: "📅 Central de Rotina", callback_data: "ux:hub:rotina" }]
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
    "\n\n💡 *Para ajustar:* Toque abaixo ou envie áudio/texto:";
  var tecladoAtualizado = RotinaService.construirTecladoTimeline(hoje, blocosAtualizados);

  if (msgId && token) {
    executarPostTelegram("https://api.telegram.org/bot" + token + "/editMessageText", {
      chat_id: chatId,
      message_id: msgId,
      text: textoAtualizado,
      parse_mode: "Markdown",
      reply_markup: tecladoAtualizado
    });
  } else {
    enviarMensagemComTecladoParaChat(chatId, textoAtualizado, tecladoAtualizado);
  }
}
