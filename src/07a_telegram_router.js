/**
 * ==============================================================================
 * MÓDULO 07A: TELEGRAM ROUTER & COMANDOS DE TEXTO
 * ==============================================================================
 * Roteamento coloquial de plantão beira-leito, teclados de hubs clínicos e
 * processamento central de mensagens de texto (/comandos e linguagem natural).
 * ==============================================================================
 */

/**
 * ==============================================================================
 * MÓDULO 07: HANDLERS DE MENSAGENS, MÍDIA E CALLBACKS DO TELEGRAM
 * ==============================================================================
 */

/**
 * Roteamento Inteligente de Entrada Rápida, Termos Coloquiais do Plantão e Siglas Clínicas.
 * Permite que o interno e médico generalista acessem decisões clínicas imediatas sem barra (/).
 */
function tentarRoteamentoColoquialPlantao(texto, chatId) {
  var tLimpo = (texto || "").trim();
  var tLow = tLimpo.toLowerCase();
  if (!tLow) return false;

  var kbNav = typeof obterBotoesNavegacaoPadrao === "function" ? obterBotoesNavegacaoPadrao() : null;

  // 1. Termos Farmacológicos Coloquiais Beira-Leito

  // A. Amoxicilina / Amoxi (com ou sem peso/criança)
  if (/^amoxi(?:cilina)?(?:\s+.*)?$/i.test(tLow)) {
    var matchPesoAmoxi = tLow.match(/(?:peso\s*[:=]?\s*)?(\d+(?:[.,]\d+)?)\s*kg\b/i) || tLow.match(/crian[çc]a\s+(\d+(?:[.,]\d+)?)/i);
    if (matchPesoAmoxi) {
      var pesoAmoxi = parseFloat(matchPesoAmoxi[1].replace(",", "."));
      var dose50Calculada = Math.round(pesoAmoxi * 50);
      var dose90Calculada = Math.round(pesoAmoxi * 90);
      var dose50 = Math.min(1500, dose50Calculada);
      var dose90 = Math.min(2000, dose90Calculada);
      var travouTeto = (dose50Calculada > 1500) || (dose90Calculada > 2000);
      var doseToma50 = Math.round(dose50 / 3);
      var mlToma50 = (doseToma50 / 50).toFixed(1); // suspensão 250mg/5mL = 50mg/mL
      var doseToma90 = Math.round(dose90 / 2);
      var mlToma90 = ((dose90 / 2) / 80).toFixed(1); // suspensão 400mg/5mL = 80mg/mL
      var alertaTeto = travouTeto ? "\n\n⚠️ [Dose travada no teto máximo diário de adulto/pediátrico]" : "";
      var txtAmoxiPed = "💊 *AMOXICILINA PEDIÁTRICA (" + pesoAmoxi + " kg)*\n\n" +
        "🔴 *Dose Padrão (50 mg/kg/dia):* " + dose50 + " mg/dia dividido 8/8h\n" +
        "• *Por tomada:* ~" + doseToma50 + " mg (ou *" + mlToma50 + " mL* da suspensão 250mg/5mL 8/8h por 7 a 10 dias)\n\n" +
        "🟡 *Dose OMA Alto Risco / PAC (90 mg/kg/dia):* " + dose90 + " mg/dia dividido 12/12h\n" +
        "• *Por tomada:* ~" + doseToma90 + " mg (ou *" + mlToma90 + " mL* da suspensão 400mg/5mL 12/12h)\n\n" +
        "⚠️ *Segurança:* Teto pediátrico máximo: 1.500 mg a 2.000 mg/dia. Alergia prévia a beta-lactâmicos contraindica." + alertaTeto;
      if (kbNav && typeof enviarMensagemComTecladoParaChat === "function") {
        enviarMensagemComTecladoParaChat(chatId, txtAmoxiPed, kbNav);
      } else {
        enviarMensagemParaChat(chatId, txtAmoxiPed);
      }
      return true;
    } else {
      var txtAmoxi = "💊 *AMOXICILINA (REMUME / GUIA RÁPIDO)*\n\n" +
        "🔴 *Adulto (Faringite / Sinusite / ITU em gestante):*\n" +
        "• *Posologia 1ª Linha:* 500 mg VO de 8/8h por 7 a 10 dias\n" +
        "• *Esquema Alternativo:* 875 mg VO de 12/12h por 7 a 10 dias\n\n" +
        "🟡 *Pediatria:* 50 mg/kg/dia divididos de 8/8h (ou 90 mg/kg/dia em OMA/pneumonia grave).\n" +
        "💡 *Exemplo com cálculo:* `amoxi 15kg` ou `amoxi crianca 20kg`\n\n" +
        "⚠️ *Ajuste Renal:* ClCr 10-30 mL/min: estender para 12/12h; ClCr < 10: 24/24h.";
      if (kbNav && typeof enviarMensagemComTecladoParaChat === "function") {
        enviarMensagemComTecladoParaChat(chatId, txtAmoxi, kbNav);
      } else {
        enviarMensagemParaChat(chatId, txtAmoxi);
      }
      return true;
    }
  }

  // B. Noradrenalina / Nora
  if (/^(?:noradrena(?:lina)?|nora)(?:\s+.*)?$/i.test(tLow)) {
    var matchPesoNora = tLow.match(/(?:peso\s*[:=]?\s*)(\d+(?:[.,]\d+)?)/i) ||
                        tLow.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i) ||
                        tLow.match(/\b(\d+(?:[.,]\d+)?)\b(?!\s*(?:anos?|a\b|meses|m\b))/i);
    if (!matchPesoNora || !matchPesoNora[1] || isNaN(parseFloat(matchPesoNora[1].replace(",", "."))) || parseFloat(matchPesoNora[1].replace(",", ".")) < 10) {
      if (typeof enviarTelaPesoDva === "function") {
        enviarTelaPesoDva(chatId, "nora");
        return true;
      }
      enviarMensagemParaChat(chatId, "💉 *NORADRENALINA*\n\nInforme o peso do paciente para cálculo imediato de vazão:\n💡 *Exemplo:* `nora 70` ou `/dva nora 70`");
      return true;
    }
    var pesoNora = parseFloat(matchPesoNora[1].replace(",", "."));
    var solNora = /concentrad[ao]|dobrad[ao]|2x/i.test(tLow) ? "concentrada" : "padrao";
    try {
      var resNora = CalculadorasClinicas.drogasVasoativas("noradrenalina", pesoNora, solNora);
      if (resNora && resNora.textoFormatado) {
        var kbNora = resNora.botoes ? (resNora.botoes.inline_keyboard ? resNora.botoes : { inline_keyboard: resNora.botoes }) : kbNav;
        if (kbNora && typeof enviarMensagemComTecladoParaChat === "function") {
          enviarMensagemComTecladoParaChat(chatId, resNora.textoFormatado, kbNora);
        } else {
          enviarMensagemParaChat(chatId, resNora.textoFormatado);
        }
        return true;
      }
    } catch (eNora) {}
  }

  // C. Dobutamina / Dobuta / Dobu
  if (/^(?:dobu(?:ta(?:mina)?)?)(?:\s+.*)?$/i.test(tLow)) {
    var matchPesoDobuta = tLow.match(/(?:peso\s*[:=]?\s*)(\d+(?:[.,]\d+)?)/i) ||
                          tLow.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i) ||
                          tLow.match(/\b(\d+(?:[.,]\d+)?)\b(?!\s*(?:anos?|a\b|meses|m\b))/i);
    if (!matchPesoDobuta || !matchPesoDobuta[1] || isNaN(parseFloat(matchPesoDobuta[1].replace(",", "."))) || parseFloat(matchPesoDobuta[1].replace(",", ".")) < 10) {
      if (typeof enviarTelaPesoDva === "function") {
        enviarTelaPesoDva(chatId, "dobuta");
        return true;
      }
      enviarMensagemParaChat(chatId, "💉 *DOBUTAMINA*\n\nInforme o peso para o cálculo de vazão:\n💡 *Exemplo:* `dobuta 70` ou `/dva dobuta 70`");
      return true;
    }
    var pesoDobuta = parseFloat(matchPesoDobuta[1].replace(",", "."));
    try {
      var resDobuta = CalculadorasClinicas.drogasVasoativas("dobutamina", pesoDobuta, "padrao");
      if (resDobuta && resDobuta.textoFormatado) {
        var kbDobuta = resDobuta.botoes ? (resDobuta.botoes.inline_keyboard ? resDobuta.botoes : { inline_keyboard: resDobuta.botoes }) : kbNav;
        if (kbDobuta && typeof enviarMensagemComTecladoParaChat === "function") {
          enviarMensagemComTecladoParaChat(chatId, resDobuta.textoFormatado, kbDobuta);
        } else {
          enviarMensagemParaChat(chatId, resDobuta.textoFormatado);
        }
        return true;
      }
    } catch (eDob) {}
  }

  // D. Vasopressina / Vaso
  if (/^(?:vasopressina|vaso)$/i.test(tLow)) {
    try {
      var resVaso = CalculadorasClinicas.drogasVasoativas("vasopressina", null, "padrao");
      if (resVaso && resVaso.textoFormatado) {
        if (kbNav && typeof enviarMensagemComTecladoParaChat === "function") {
          enviarMensagemComTecladoParaChat(chatId, resVaso.textoFormatado, kbNav);
        } else {
          enviarMensagemParaChat(chatId, resVaso.textoFormatado);
        }
        return true;
      }
    } catch (eVaso) {}
  }

  // E. Dipirona (peso, gotas ou adulto)
  if (/^dipirona(?:\s+.*)?$/i.test(tLow)) {
    var matchPesoDip = tLow.match(/(?:peso\s*[:=]?\s*)?(\d+(?:[.,]\d+)?)\s*(?:kg)?\b/i);
    if (matchPesoDip && matchPesoDip[1]) {
      var pesoDip = parseFloat(matchPesoDip[1].replace(",", "."));
      var gotasDip = Math.min(40, Math.round(pesoDip * 1));
      var mgDip = Math.min(1000, Math.round(pesoDip * 20));
      var txtDipPed = "💊 *DIPIRONA PEDIÁTRICA (" + pesoDip + " kg)*\n\n" +
        "🔴 *Dose por tomada (20-25 mg/kg/dose):* ~" + mgDip + " mg até 6/6h (se febre/dor)\n" +
        "• *Gotas (500 mg/mL):* *" + gotasDip + " gotas* VO até 6/6h (1 gota/kg, máx 40 gotas)\n" +
        "• *Solução Oral (50 mg/mL):* *" + (mgDip / 50).toFixed(1) + " mL* VO até 6/6h\n\n" +
        "⚠️ *Segurança:* Intervalo mínimo de 6 horas. Teto máximo por tomada: 1.000 mg (40 gotas).";
      if (kbNav && typeof enviarMensagemComTecladoParaChat === "function") {
        enviarMensagemComTecladoParaChat(chatId, txtDipPed, kbNav);
      } else {
        enviarMensagemParaChat(chatId, txtDipPed);
      }
      return true;
    } else {
      var txtDip = "💊 *DIPIRONA SÓDICA (REMUME)*\n\n" +
        "🔴 *Adulto:* 500 mg a 1.000 mg (1g) VO ou IV lento até 6/6h se dor ou febre (teto 4g/dia)\n" +
        "🟡 *Pediatria:* 20 a 25 mg/kg/dose até 6/6h (Gotas 500 mg/mL: 1 gota por kg de peso, máximo 40 gotas)\n\n" +
        "💡 *Cálculo por peso:* Envie `dipirona 16kg` ou `dipirona peso 12`";
      if (kbNav && typeof enviarMensagemComTecladoParaChat === "function") {
        enviarMensagemComTecladoParaChat(chatId, txtDip, kbNav);
      } else {
        enviarMensagemParaChat(chatId, txtDip);
      }
      return true;
    }
  }

  // 2. Siglas e Escores Clínicos

  // F. Clearance de Creatinina / ClCr / CrCl
  if (/^(?:clcr|crcl|clearance)(?:\s+.*)?$/i.test(tLow)) {
    var paramsCrCl = tLimpo.replace(/^(?:clcr|crcl|clearance)\s*/i, "").trim();
    if (paramsCrCl && /\d+/.test(paramsCrCl)) {
      return processarMensagemTexto({ chat: { id: chatId }, text: "/crcl " + paramsCrCl });
    }
    var msgGuiaCrCl = "🧪 *CLEARANCE DE CREATININA (COCKCROFT-GAULT)*\n\n" +
      "Envie os parâmetros para cálculo determinístico imediato:\n\n" +
      "💡 *Formato:* `clcr <idade> <pesoKg> <creatinina> [fem]`\n" +
      "• *Exemplo Masculino:* `clcr 68 72 1.4`\n" +
      "• *Exemplo Feminino:* `clcr 74 62 1.8 fem`";
    if (kbNav && typeof enviarMensagemComTecladoParaChat === "function") {
      enviarMensagemComTecladoParaChat(chatId, msgGuiaCrCl, kbNav);
    } else {
      enviarMensagemParaChat(chatId, msgGuiaCrCl);
    }
    return true;
  }

  // G. SOFA & qSOFA (Triagem e Bundle de Sepse)
  if (/^(?:sofa|qsofa|sepse\s+triagem)$/i.test(tLow)) {
    var txtSofa = "⚡ *ESTRATIFICAÇÃO DE SEPSE: qSOFA & SOFA*\n\n" +
      "🔴 *qSOFA (Beira-Leito — ≥ 2 pontos = Alto Risco de Mortalidade):*\n" +
      "• Frequência Respiratória ≥ 22 irpm (1 ponto)\n" +
      "• Pressão Arterial Sistólica ≤ 100 mmHg (1 ponto)\n" +
      "• Alteração do Nível de Consciência / Glasgow < 15 (1 ponto)\n\n" +
      "⏱️ *BUNDLE DE 1 HORA DA SEPSE (SURVIVING SEPSIS 2026):*\n" +
      "1. Coletar Lactato sérico (repetir se > 2 mmol/L)\n" +
      "2. Hemoculturas antes do antimicrobiano (não atrasar > 45 min)\n" +
      "3. Iniciar Antibiótico de amplo espectro na 1ª hora\n" +
      "4. Ressuscitação com Cristaloide 30 mL/kg se hipotenso ou lactato ≥ 4\n" +
      "5. Noradrenalina precoce se PAM < 65 mmHg pós-expansão inicial";
    if (kbNav && typeof enviarMensagemComTecladoParaChat === "function") {
      enviarMensagemComTecladoParaChat(chatId, txtSofa, kbNav);
    } else {
      enviarMensagemParaChat(chatId, txtSofa);
    }
    return true;
  }

  // H. HAS Descompensada / Crise Hipertensiva
  if (/^(?:has\s+descompensada|crise\s+hipertensiva|urgencia\s+hipertensiva|emergencia\s+hipertensiva)$/i.test(tLow)) {
    var txtHas = "🚨 *MANEJO BEIRA-LEITO: CRISE HIPERTENSIVA (PA ≥ 180×120 mmHg)*\n\n" +
      "🟡 *1. Urgência Hipertensiva (SEM Lesão Aguda de Órgão-Alvo):*\n" +
      "• *Alvo:* Redução lenta e gradual em 24 a 48h. NÃO baixar abruptamente!\n" +
      "• *Conduta:* Repouso 30 min + Captopril 25 mg VO (ou Clonidina 0.100 mg VO).\n" +
      "• *Destino:* Observação ambulatorial, alta com ajuste de anti-hipertensivos orais.\n\n" +
      "🔴 *2. Emergência Hipertensiva (COM Lesão Aguda de Órgão-Alvo):*\n" +
      "• *Alvo:* Reduzir PA em 20-25% na 1ª hora na Sala Vermelha / UTI.\n" +
      "• *Conduta Parenteral Contínua:* Nitroprussiato de Sódio ou Nitroglicerina IV em bomba.\n" +
      "• *Exceções Críticas:* Dissecção de Aorta (PAS < 120 e FC < 60 em 20 min com Esmolol/Nitroprussiato); AVC Isquêmico (só tratar se PA > 220x120 ou > 185x110 para trombólise).";
    if (kbNav && typeof enviarMensagemComTecladoParaChat === "function") {
      enviarMensagemComTecladoParaChat(chatId, txtHas, kbNav);
    } else {
      enviarMensagemParaChat(chatId, txtHas);
    }
    return true;
  }

  // I. DPP / DUM
  if (/^(?:dpp|dum)(?:\s+.*)?$/i.test(tLow)) {
    var matchData = tLimpo.match(/\b(\d{1,2}[\/\.]\d{1,2}(?:[\/\.]\d{2,4})?)\b/);
    if (matchData && matchData[1]) {
      return processarMensagemTexto({ chat: { id: chatId }, text: "/prenatal DUM " + matchData[1] });
    }
    var msgGuiaDpp = "🤰 *DATA PROVÁVEL DO PARTO (DPP) & IDADE GESTACIONAL*\n\n" +
      "Envie a Data da Última Menstruação (DUM):\n\n" +
      "💡 *Exemplo:* `dpp 15/05/2026` ou `dum 10/02/2026` ou `/prenatal DUM 15/05/2026`";
    if (kbNav && typeof enviarMensagemComTecladoParaChat === "function") {
      enviarMensagemComTecladoParaChat(chatId, msgGuiaDpp, kbNav);
    } else {
      enviarMensagemParaChat(chatId, msgGuiaDpp);
    }
    return true;
  }

  // J. Escala de Coma de Glasgow
  if (/^\/?(?:glasgow|gcs)(?:\s+.*)?$/i.test(tLow)) {
    var numsCompGcs = tLow.match(/\b([1-4])\s+([1-5])\s+([1-6])(?:\s+([0-2]))?\b/) ||
                      tLow.match(/(?:ocular|\bo\b)\s*[:=]?\s*\d/i);
    if (numsCompGcs && typeof tentarCalcularDeterministico === "function") {
      var resGcsComp = tentarCalcularDeterministico(texto);
      if (resGcsComp) {
        var ckGcsDet = Utilities.getUuid().replace(/-/g, "");
        safePutCache(CacheService.getScriptCache(), ckGcsDet, resGcsComp, 21600);
        var kbGcsDet = {
          inline_keyboard: [
            [{ text: "📋 Copiar Cálculo", callback_data: "ux:copiar:" + ckGcsDet }],
            [{ text: "🔙 Calculadoras", callback_data: "ux:hub:calc" }, { text: "🔙 Sala Vermelha", callback_data: "ux:sala" }],
            [{ text: "🏠 Início", callback_data: "ux:hub:inicio" }]
          ]
        };
        return enviarMensagemComTecladoParaChat(chatId, resGcsComp, kbGcsDet);
      }
    }
    var matchNumGcs = tLow.match(/\b([3-9]|1[0-5])\b/);
    if (matchNumGcs) {
      var scoreGcs = parseInt(matchNumGcs[1], 10);
      var estrGcs = scoreGcs <= 8 ? "🔴 *TCE GRAVE (Glasgow ≤ 8):* Perda de reflexos protetores de via aérea. Indicação formal de Sequência Rápida de Intubação (SRI / IOT) imediata!" : (scoreGcs <= 12 ? "🟡 *TCE Moderado (Glasgow 9-12):* Vigilância neurológica estrita e TC de crânio." : "🟢 *TCE Leve (Glasgow 13-15):* Observação clínica.");
      var txtGcsNum = "🧠 *ESCALA DE GLASGOW: " + scoreGcs + " PONTOS*\n\n" + estrGcs;
      var ckGcsNum = Utilities.getUuid().replace(/-/g, "");
      safePutCache(CacheService.getScriptCache(), ckGcsNum, txtGcsNum, 21600);
      var kbGcs = (typeof botoesBot === "function") ? botoesBot([
        [['📋 Copiar para Prontuário', 'ux:copiar:' + ckGcsNum]],
        [['🔙 Calculadoras', 'ux:hub:calc'], ['🔙 Sala Vermelha', 'ux:sala']],
        [['🏠 Início', 'ux:hub:inicio']]
      ]) : kbNav;
      if (kbGcs && typeof enviarMensagemComTecladoParaChat === "function") {
        enviarMensagemComTecladoParaChat(chatId, txtGcsNum, kbGcs);
      } else {
        enviarMensagemParaChat(chatId, txtGcsNum);
      }
      return true;
    } else {
      if (typeof enviarMenuEmergGlasgow === "function") {
        return enviarMenuEmergGlasgow(chatId);
      }
      var txtGuiaGcs = "🧠 *ESCALA DE COMA DE GLASGOW (GUIA RÁPIDO)*\n\n" +
        "👁️ *Abertura Ocular (1 a 4):*\n" +
        "• 4: Espontânea | 3: Ao som | 2: À pressão | 1: Ausente\n\n" +
        "🗣️ *Resposta Verbal (1 a 5):*\n" +
        "• 5: Orientada | 4: Confusa | 3: Palavras | 2: Sons | 1: Ausente\n\n" +
        "💪 *Resposta Motora (1 a 6):*\n" +
        "• 6: À ordem | 5: Localiza | 4: Flexão normal | 3: Decorticação | 2: Descerebração | 1: Ausente\n\n" +
        "💡 *Avaliação rápida com pontuação:* Envie `glasgow 7` ou `glasgow 14`\n\n" +
        "🚨 *Alerta Sentinela:* Glasgow ≤ 8 = Proteção de via aérea obrigatória (IOT / SRI imediata).";
      var kbGuiaGcs = (typeof botoesBot === "function") ? botoesBot([
        [['🔙 Sala Vermelha', 'ux:sala'], ['🏠 Início', 'ux:hub:inicio']]
      ]) : kbNav;
      if (kbGuiaGcs && typeof enviarMensagemComTecladoParaChat === "function") {
        enviarMensagemComTecladoParaChat(chatId, txtGuiaGcs, kbGuiaGcs);
      } else {
        enviarMensagemParaChat(chatId, txtGuiaGcs);
      }
      return true;
    }
  }

  // K. Choque & Hipotensão
  if (/^choque(?:\s+.*)?$/i.test(tLow)) {
    if (/(?:choque\s+s[eé]ptico(?:\s+refrat[aá]rio)?|\bcirci\b)/i.test(tLow)) {
      var restoSeptico = tLimpo.replace(/^choque\s+s[eé]ptico(?:\s+refrat[aá]rio)?\s*/i, "").trim();
      return processarMensagemTexto({ chat: { id: chatId }, text: "/choqueseptico" + (restoSeptico ? " " + restoSeptico : "") });
    }
    var restoChoque = tLimpo.replace(/^choque\s*/i, "").trim();
    return processarMensagemTexto({ chat: { id: chatId }, text: "/choque" + (restoChoque ? " " + restoChoque : "") });
  }

  // L. Crise Hipertensiva / HAS Descompensada
  if (/^\/?(?:crisehas|crise\s*has|has\s*crise)(?:\s+.*)?$/i.test(tLow)) {
    var restoHas = tLimpo.replace(/^\/?(?:crisehas|crise\s*has|has\s*crise)\s*/i, "").trim();
    return processarMensagemTexto({ chat: { id: chatId }, text: "/crisehipertensiva" + (restoHas ? " " + restoHas : "") });
  }

  // M. PCR / ACLS
  if (/^\/?(?:pcr|acls|parada\s+cardiorrespirat[oó]ria)(?:\s+.*)?$/i.test(tLow)) {
    var dadosPcrAtalho = tLow.replace(/^\/?(?:pcr|acls|parada\s+cardiorrespirat[oó]ria)\s*/i, "").trim();
    if (typeof tratarComandoPcr === "function") {
      return tratarComandoPcr(chatId, dadosPcrAtalho);
    }
    return processarMensagemTexto({ chat: { id: chatId }, text: "/conduta PCR" });
  }

  // N. Arritmias Cardíacas (ACLS)
  if (/^(?:arritmia|arritmias|taquiarritmia|taquiarritmias|taquicardia|taquicardias|bradiarritmia|bradiarritmias|bradicardia|bradicardias|tsv)(?:\s+.*)?$/i.test(tLow)) {
    var matchCmdArr = tLow.match(/^(?:arritmia|arritmias|taquiarritmia|taquiarritmias|taquicardia|taquicardias|bradiarritmia|bradiarritmias|bradicardia|bradicardias|tsv)/i);
    var cmdArr = matchCmdArr ? matchCmdArr[0].toLowerCase() : "arritmia";
    var dadosArrAtalho = tLow.replace(/^(?:arritmia|arritmias|taquiarritmia|taquiarritmias|taquicardia|taquicardias|bradiarritmia|bradiarritmias|bradicardia|bradicardias|tsv)\s*/i, "").trim();
    if (/^bradi/i.test(cmdArr) && !dadosArrAtalho) {
      dadosArrAtalho = "bradi";
    } else if (/^tsv/i.test(cmdArr)) {
      dadosArrAtalho = "tsv " + dadosArrAtalho;
    }
    if (typeof tratarComandoArritmia === "function") {
      return tratarComandoArritmia(chatId, dadosArrAtalho);
    }
    return processarMensagemTexto({ chat: { id: chatId }, text: "/arritmia" + (dadosArrAtalho ? " " + dadosArrAtalho : "") });
  }

  return false;
}

function construirTecladoHubEnfermaria() {
  return {
    "inline_keyboard": [
      [
        {"text": "➕ Adicionar Leito", "callback_data": "enfermaria_add"},
        {"text": "📤 Dar Alta", "callback_data": "enfermaria_alta"}
      ],
      [
        {"text": "📋 Passagem SBAR", "callback_data": "ux:enf:sbar"},
        {"text": "🎙️ Pitch de Round", "callback_data": "enfermaria_round"}
      ],
      [
        {"text": "🟢 Iniciar Plantão", "callback_data": "enfermaria_plantao_iniciar"},
        {"text": "🔄 Atualizar Censo", "callback_data": "enfermaria_atualizar"}
      ],
      [
        {"text": "🗑️ Limpar Todos", "callback_data": "enfermaria_limpar_confirma"}
      ]
    ]
  };
}

function construirTecladoHubDiabetes() {
  return {
    "inline_keyboard": [
      [
        {"text": "🔥 CAD / EHH", "callback_data": "dm_cad_ehh"},
        {"text": "📊 Mapa Glicêmico", "callback_data": "dm_glicemia"}
      ],
      [
        {"text": "💉 Insulina Basal-Bolus", "callback_data": "dm_insulina"},
        {"text": "💊 Antidiabéticos REMUME", "callback_data": "dm_remume"}
      ]
    ]
  };
}

function construirTecladoHubAnemia() {
  return {
    "inline_keyboard": [
      [
        {"text": "🔬 Investigação Etiológica", "callback_data": "anemia_etiologia"},
        {"text": "💉 Ferro IV (Ganzoni)", "callback_data": "anemia_ganzoni"}
      ]
    ]
  };
}

function construirTecladoHubGO() {
  return {
    "inline_keyboard": [
      [
        {"text": "🤰 Pré-Natal & DPP", "callback_data": "go_prenatal"},
        {"text": "🏥 Parto & Partograma", "callback_data": "go_parto"}
      ],
      [
        {"text": "🩸 HPP (4 Ts)", "callback_data": "go_hpp"},
        {"text": "⚡ Pré-Eclâmpsia & MgSO4", "callback_data": "go_mgso4"}
      ],
      [
        {"text": "👶 Prematuridade & RPMO", "callback_data": "go_prematuridade"},
        {"text": "🔬 Toxo & Sorologias", "callback_data": "go_toxo"}
      ],
      [
        {"text": "🌸 Corrimento / Vulvovaginites", "callback_data": "go_corrimento"},
        {"text": "🩺 Preventivo / Citopatológico", "callback_data": "go_preventivo"}
      ],
      [
        {"text": "💊 Anticoncepção OMS", "callback_data": "go_anticoncepcao"},
        {"text": "🩹 DIP & Infecção Pélvica", "callback_data": "go_dip"}
      ],
      [
        {"text": "🔙 Hub G&O", "callback_data": "ux:rotina:go"},
        {"text": "🏠 Início", "callback_data": "ux:hub:inicio"}
      ]
    ]
  };
}

/**
 * Trata consultas explícitas sobre últimas mudanças, commits e status de deploy no Telegram.
 * Consolida dados locais com segurança total (zero falha se arquivo faltar).
 */
function tratarComandoUltimasMudancas(chatId, modoDeploy) {
  var fs = null;
  try { fs = require("fs"); } catch (eFs) {}
  var path = null;
  try { path = require("path"); } catch (eP) {}

  var proc = (typeof process !== "undefined") ? process : ((typeof globalThis !== "undefined" && globalThis.process) ? globalThis.process : null);
  var baseDir = (proc && typeof proc.cwd === "function") ? proc.cwd() : ".";
  var ultimasMudancasPath = path ? path.join(baseDir, "data", "ultimas_mudancas.json") : "data/ultimas_mudancas.json";
  var ultimoDeployPath = path ? path.join(baseDir, "data", "ultimo_relatorio_deploy.md") : "data/ultimo_relatorio_deploy.md";
  var deployStatePath = path ? path.join(baseDir, "data", ".autoloop_deploy_state.json") : "data/.autoloop_deploy_state.json";
  var progressPath = path ? path.join(baseDir, "PROGRESS.md") : "PROGRESS.md";

  var infoJson = null;
  if (fs && fs.existsSync(ultimasMudancasPath)) {
    try {
      infoJson = JSON.parse(fs.readFileSync(ultimasMudancasPath, "utf8"));
    } catch (eJ) {}
  }

  var deployState = null;
  if (fs && fs.existsSync(deployStatePath)) {
    try {
      deployState = JSON.parse(fs.readFileSync(deployStatePath, "utf8"));
    } catch (eD) {}
  }

  var linhasProgress = [];
  var proximaTarefa = "";
  if (fs && fs.existsSync(progressPath)) {
    try {
      var txtProg = fs.readFileSync(progressPath, "utf8");
      var matchProx = txtProg.match(/(?:Próxima Tarefa em Andamento|Próxima Tarefa|Next Task)[^\n]*\n+[\s\t]*[-*]?\s*\[ \]\s*([^\n]+)/i);
      if (matchProx) proximaTarefa = matchProx[1].trim();
      var matchUltima = txtProg.match(/(?:Última Tarefa Concluída|Últimas Tarefas Concluídas)[^\n]*\n+[\s\t]*[-*]?\s*\[x\]\s*([^\n]+)/i);
      if (matchUltima) linhasProgress.push(matchUltima[1].trim());
    } catch (ePr) {}
  }

  // Tenta obter commits recentes via git de forma síncrona com timeout estrito
  var commitsGit = [];
  try {
    var cp = require("child_process");
    var saidaGit = cp.execSync('git log -n 3 --pretty=format:"%h|%s"', { timeout: 3000, encoding: "utf8" });
    if (saidaGit) {
      saidaGit.trim().split("\n").forEach(function(l) {
        var partes = l.split("|");
        if (partes.length >= 2) {
          commitsGit.push("• `" + partes[0] + "` " + partes.slice(1).join("|"));
        }
      });
    }
  } catch (eGit) {}

  var linhas = [];
  linhas.push("🚀 *ULTRA ROTINA · STATUS DE MUDANÇAS & DEPLOY*");
  linhas.push("");

  // Detalhes do último deploy
  var dataDeploy = (deployState && (deployState.last_pushed_at || deployState.last_attempt_at)) || (infoJson && infoJson.timestamp) || "Recente";
  var shaDeploy = (deployState && deployState.last_pushed_sha) || (infoJson && infoJson.commit_head) || "";
  linhas.push("🌐 *Último Deploy no Render:*");
  linhas.push("• *Data/Hora:* " + dataDeploy);
  if (shaDeploy) linhas.push("• *Commit HEAD:* `" + String(shaDeploy).substring(0, 7) + "`");
  linhas.push("• *Status:* ✅ Confirmado (Render / GitHub)");

  // Telemetria de Consumo e Cache do Ciclo
  if (infoJson && infoJson.telemetria) {
    var tel = infoJson.telemetria;
    if (tel.input_tokens || tel.output_tokens || tel.avg_seconds) {
      var fmtTok = function(n) {
        if (!n || n <= 0) return "0";
        if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
        if (n >= 1000) {
          var k = n / 1000;
          return k >= 10 ? Math.round(k) + "k" : k.toFixed(1).replace(/\.0$/, "") + "k";
        }
        return String(n);
      };
      var fmtDur = function(s) {
        if (!s || s <= 0) return "0s";
        var seg = Math.round(s);
        if (seg >= 3600) {
          var h = Math.floor(seg / 3600);
          var mRest = Math.floor((seg % 3600) / 60);
          return h + "h" + (mRest < 10 ? "0" : "") + mRest + "m";
        }
        if (seg >= 60) {
          var m = Math.floor(seg / 60);
          var resto = seg % 60;
          return m + "m" + (resto < 10 ? "0" : "") + resto + "s";
        }
        return seg + "s";
      };
      var partesTel = [];
      if (tel.input_tokens || tel.output_tokens) {
        var hitStr = (tel.cache_hit_pct != null) ? "(" + tel.cache_hit_pct + "% cache hit)" : "(0% cache hit)";
        partesTel.push(fmtTok(tel.input_tokens) + " in");
        partesTel.push(fmtTok(tel.output_tokens) + " out " + hitStr);
      }
      if (tel.avg_seconds) {
        partesTel.push("Tempo médio: " + fmtDur(tel.avg_seconds));
      }
      if (partesTel.length > 0) {
        linhas.push("• *Telemetria:* " + partesTel.join(" · "));
      }
    }
  }

  // Tarefas Concluídas
  var concluidas = (infoJson && infoJson.tarefas_concluidas && infoJson.tarefas_concluidas.length) ? infoJson.tarefas_concluidas : linhasProgress;
  if (concluidas && concluidas.length) {
    linhas.push("");
    linhas.push("✅ *Últimas Tarefas Concluídas:*");
    concluidas.slice(0, 3).forEach(function(t) {
      linhas.push("• " + t.replace(/^[-\s*\[\]xX]+/, ""));
    });
  }

  // Próxima Tarefa
  var prox = (infoJson && infoJson.proxima_tarefa) ? infoJson.proxima_tarefa : proximaTarefa;
  if (prox) {
    linhas.push("");
    linhas.push("🎯 *Próxima Tarefa em Foco:*");
    linhas.push("• " + prox.replace(/^[-\s*\[\]]+/, ""));
  }

  // Commits Recentes
  if (commitsGit.length) {
    linhas.push("");
    linhas.push("📋 *Commits Recentes:*");
    linhas = linhas.concat(commitsGit);
  } else if (infoJson && infoJson.commits_recentes && infoJson.commits_recentes.length) {
    linhas.push("");
    linhas.push("📋 *Commits Recentes:*");
    infoJson.commits_recentes.slice(0, 3).forEach(function(c) {
      linhas.push("• `" + (c.hash || "") + "` " + (c.subject || ""));
    });
  }

  linhas.push("");
  linhas.push("⏰ *Agendador de Deploy:*");
  linhas.push("• Ciclo automático a cada *6 horas* no Render.");
  linhas.push("💡 _Notificações automáticas ocorrem a cada deploy de 6h ou quando você perguntar._");

  var msgFinal = linhas.join("\n");
  var kbRetorno = (typeof botoesBot === "function") ? botoesBot([
    [['🔄 Atualizar Mudanças', '/mudancas'], ['🏠 Início', 'ux:hub:inicio']]
  ]) : null;

  if (kbRetorno && typeof enviarMensagemComTecladoParaChat === "function") {
    return enviarMensagemComTecladoParaChat(chatId, msgFinal, kbRetorno);
  }
  return enviarMensagemParaChat(chatId, msgFinal);
}

/**
 * Ponto de entrada modular alternativo do roteador do Telegram.
 */
function rotearMensagemTelegram(message) {
  return processarMensagemTexto(message);
}

/**
 * Ponto de entrada para despacho direto de comandos de texto.
 */
function rotearComandoTexto(comando, texto, chatId, message) {
  var msgObj = message || { chat: { id: chatId }, text: texto };
  return processarMensagemTexto(msgObj);
}

/**
 * Despacho O(1) de status do sistema e fontes de dados.
 */
function tratarComandoStatus(chatId) {
  var stRemume = checarStatusFonteDrive(ConfigService.get("SPREADSHEET_ID_REMUME"), false);
  var stInteracoes = checarStatusFonteDrive(ConfigService.get("SPREADSHEET_ID_INTERACOES"), true);
  var msgStatus = "⚡ *STATUS DO SISTEMA*\n\n" +
    "• *Modo:* Servidor Oficial Node.js 20+ / Docker (Render 24/7)\n" +
    "• *REMUME Ribeirão Preto:* " + stRemume + "\n" +
    "• *Base de Interações:* " + stInteracoes + "\n" +
    "• *Notion & Calendar:* ✅ Operacionais\n\n" +
    "💡 Digite /menu para voltar ao início ou toque abaixo:";
  var kbStatus = {
    inline_keyboard: [
      [{ text: "🔄 Atualizar Status", callback_data: "ux:status:refresh" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
    ]
  };
  return enviarMensagemComTecladoParaChat(chatId, msgStatus, kbStatus);
}

/**
 * Despacho do executor local de tarefas (PC).
 */
function tratarComandoPc(chatId, texto) {
  var partesPc = texto.split(/\s+/);
  var tarefaPc = partesPc[1] ? partesPc[1].toLowerCase() : "";
  var argsPc = partesPc.slice(2);

  if (!tarefaPc || tarefaPc === "ajuda" || tarefaPc === "help") {
    var msgAjudaPc = "🖥️ *PONTE DE EXECUÇÃO LOCAL (PC)*\n\n" +
      "Envie uma ordem para o seu computador executar em segundo plano:\n\n" +
      "• `/pc sync` — Sincronização de agenda e estudos\n" +
      "• `/pc audit` — Auditoria de sobreposições no calendário\n" +
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

/**
 * Handlers modulares desacoplados para comandos clínicos e de sistema.
 */
function tratarComandoRx(chatId, texto) {
  var dadosPrescricao = texto.replace(/^\/(?:rx|receita)\s*/i, "").trim();
  if (!dadosPrescricao) {
    var ctxAtivo = (typeof obterContextoClinicoBot === "function") ? obterContextoClinicoBot(chatId) : "";
    var planoAtivo = (typeof extrairPlanoDeTextoSoap === "function") ? extrairPlanoDeTextoSoap(ctxAtivo) : null;
    var botoesRx = [];
    if (planoAtivo && planoAtivo.trim().length >= 5) {
      botoesRx.push([{ text: "💊 Extrair Receita SOAP", callback_data: "ux:soap:extrair_rx:" }]);
    }
    botoesRx.push([
      { text: "💊 Antibióticos & Infecções", callback_data: "ux:amb:remume:atb" },
      { text: "🫀 Cardiovascular", callback_data: "ux:amb:remume:cardio" }
    ]);
    botoesRx.push([
      { text: "🩹 Analgesia & Sintomáticos", callback_data: "ux:amb:remume:dor" },
      { text: "🫁 Respiratório & Asma", callback_data: "ux:amb:remume:asma" }
    ]);
    botoesRx.push([
      { text: "🔙 Ambulatório", callback_data: "ux:hub:amb" },
      { text: "🏠 Início", callback_data: "ux:hub:inicio" }
    ]);

    return enviarMensagemComTecladoParaChat(chatId,
      "💊 *PRESCRIÇÃO AMBULATORIAL (REMUME SUS)*\n\n" +
      (planoAtivo ? "💡 *Caso SOAP ativo detectado:* Toque em [💊 Extrair Receita do SOAP Ativo] ou informe os medicamentos abaixo:\n\n" : "") +
      "💡 *Como prescrever:*\n" +
      "Envie `/rx` seguido da hipótese diagnóstica, medicamentos desejados, peso/idade (se criança ou idoso) e alergias conhecidas para gerar a receita médica estruturada com posologias, orientações de uso e verificação de segurança.",
      { inline_keyboard: botoesRx }
    );
  }
  return processarEEntregarIA(chatId, gerarPrescricaoComIA, dadosPrescricao, "rx");
}

function tratarComandoRxh(chatId, texto) {
  var dadosRxh = texto.replace(/^\/(?:rxh|prescricao_hospitalar)\s*/i, "").trim();
  if (!dadosRxh) {
    return enviarMensagemComTecladoParaChat(chatId,
      "🏥 *PRESCRIÇÃO HOSPITALAR DE INTERNAÇÃO*\n\n" +
      "💡 *Como prescrever no hospital:*\n" +
      "Envie `/rxh` seguido de idade, peso, diagnóstico principal, creatinina/função renal, comorbidades e alergias do paciente internado.\n\n" +
      "• O sistema estrutura a prescrição completa em 10 itens padronizados: dieta, hidratação venosa, medicações contínuas com ajuste renal, terapia específica, sintomáticos SOS e profilaxias essenciais (TEV com Enoxaparina e proteção gástrica se indicada).",
      {
        inline_keyboard: [
          [{ text: "🔙 Enfermaria", callback_data: "ux:hub:enf" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
        ]
      }
    );
  }
  return processarEEntregarIA(chatId, gerarPrescricaoHospitalarComIA, dadosRxh, "rxh");
}

function tratarComandoPlantao(chatId, texto) {
  var dadosPlantao = texto.replace(/^\/(?:plantao|sbar)\s*/i, "").trim();
  if (!dadosPlantao) {
    if (typeof tratarCallbackEnfSBAR === "function") {
      return tratarCallbackEnfSBAR(chatId);
    }
    return enviarMensagemComTecladoParaChat(chatId, "🏥 *PASSAGEM DE PLANTÃO SBAR*\n\nEnvie os dados do caso ou paciente. Exemplo: `/sbar Leito 12 PAC grave, Ceftriaxona D3, aguarda vaga CTI`", {
      inline_keyboard: [
        [{ text: "🏥 Painel de Leitos", callback_data: "ux:painel:0" }],
        [{ text: "🔙 Enfermaria", callback_data: "ux:hub:enf" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    });
  }
  return processarEEntregarIA(chatId, gerarPassagemPlantaoSBAR, dadosPlantao, "plantao");
}

function tratarComandoCalc(chatId, texto, contextoKey) {
  var dadosCalc = texto.replace(/^\/calc\s*/i, "").trim();
  if (!dadosCalc) {
    return enviarMenuCategoriasCalculadoras(chatId);
  }

  if (ehApenasNomeCalculadora(dadosCalc)) {
    var ctxKey = contextoKey || ("ctx_" + chatId);
    safePutCache(CacheService.getScriptCache(), ctxKey, "/calc Calculadora selecionada: " + dadosCalc + "\nDados do paciente: ", 900);
    var guias = obterInstrucoesCalculadora(dadosCalc);
    return enviarMensagemParaChat(chatId, guias);
  }

  var resDet = tentarCalcularDeterministico(dadosCalc);
  if (resDet) {
    var ckCalc = Utilities.getUuid().replace(/-/g, "");
    safePutCache(CacheService.getScriptCache(), ckCalc, resDet, 21600);
    var tecladoDet = {
      inline_keyboard: [
        [{ text: "📋 Copiar Cálculo", callback_data: "ux:copiar:" + ckCalc }],
        [{ text: "🔙 Calculadoras", callback_data: "ux:hub:calc" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    };
    return enviarMensagemComTecladoParaChat(chatId, resDet, tecladoDet);
  }

  // Se o usuário invocou uma calculadora reconhecida deterministicamente mas resDet não retornou resultado, NUNCA cai na IA!
  if (typeof ehCalculadoraDeterministica === "function" && ehCalculadoraDeterministica(dadosCalc)) {
    var instrucoes = obterInstrucoesCalculadora(dadosCalc);
    var tecladoInstr = {
      inline_keyboard: [
        [{ text: "🔙 Calculadoras", callback_data: "ux:hub:calc" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    };
    return enviarMensagemComTecladoParaChat(chatId, "⚠️ *Calculadora Clínica: Parâmetros Insuficientes ou Inválidos*\n\n" + instrucoes, tecladoInstr);
  }

  return processarEEntregarIA(chatId, processarCalculadoraClinicaComIA, dadosCalc, "calc");
}

/**
 * Tabela de despacho O(1) para comandos de sistema e navegação básica.
 */
function rotearComandoSistema(comando, texto, chatId) {
  var cmdHandlers = {
    "/manual": function() {
      var filtroManual = texto.replace(/^\/manual\s*/i, "").trim() || "todas";
      return enviarManualCompletoComandos(chatId, filtroManual);
    },
    "/start": function() {
      if (typeof ehUsuarioTitular === "function" && ehUsuarioTitular(chatId)) {
        if (typeof enviarHubPrincipal === "function") {
          enviarMensagemComTecladoFixo(chatId, "👋 *Olá, Dr. Wagner!* Use os botões ou envie seu caso por texto/áudio.");
          return enviarHubPrincipal(chatId);
        }
        return enviarMensagemComTecladoFixo(chatId, "Use /menu para a Central de Comandos.");
      }

      // Experiência Acolhedora e Didática para Convidado (Dr. Vinicius)
      var nomeConvidado = (typeof obterNomeTratamentoUsuario === "function") ? obterNomeTratamentoUsuario(chatId) : "Dr. Vinicius";
      var msgBoasVindas = "👋 *Olá, " + nomeConvidado + "! Seja muito bem-vindo ao Ultra Rotina.*\n\n" +
        "Este bot é o seu copiloto médico beira-leito para plantão, enfermaria e ambulatório. Você pode utilizá-lo de 3 maneiras super simples:\n\n" +
        "📱 *1. Navegação Rápida por Botões:*\n" +
        "Toque nos botões fixos no rodapé ou nos menus da tela para acessar na hora condutas de *Sala Vermelha*, *Enfermaria*, *Ambulatório* e *Calculadoras*.\n\n" +
        "🎙️ *2. Fale ou Escreva Como Quiser (Texto ou Áudio):*\n" +
        "Você NÃO precisa memorizar comandos com barra! Pode ditar um áudio ou escrever o caso clínico com suas próprias palavras (ex: _\"paciente 68 anos dor torácica típica há 1h\"_ ou _\"dose de vancomicina clearance 35\"_).\n\n" +
        "⚡ *3. Calculadoras & Protocolos Instantâneos:*\n" +
        "Atalhos diretos para cálculos em segundos (ex: `/gaso`, `/dva`, `/sri`, `/curb65`).\n\n" +
        "💡 *Como começar:* Toque em um dos botões abaixo para ver o guia rápido, conferir exemplos práticos ou abrir a central de cenários clínicos:";

      var tecladoBoasVindas = {
        inline_keyboard: [
          [
            { text: "🚀 Como Usar em 3 Passos", callback_data: "ux:ajuda:passos" },
            { text: "💡 Exemplos Práticos", callback_data: "ux:ajuda:exemplos" }
          ],
          [
            { text: "⚡ Abrir Central de Cenários", callback_data: "ux:hub:inicio" },
            { text: "📖 Manual de Comandos", callback_data: "ux:ajuda:todos" }
          ]
        ]
      };

      enviarMensagemComTecladoFixo(chatId, "👋 Bem-vindo, " + nomeConvidado + "! Teclado de navegação ativado no rodapé.");
      if (typeof enviarMensagemComTecladoParaChat === "function") {
        return enviarMensagemComTecladoParaChat(chatId, msgBoasVindas, tecladoBoasVindas);
      }
      return enviarMensagemParaChat(chatId, msgBoasVindas);
    },
    "/ajuda": function() {
      var filtroAjuda = texto.replace(/^\/(?:ajuda|help)\s*/i, "").trim();
      return enviarManualCompletoComandos(chatId, filtroAjuda);
    },
    "/help": function() {
      var filtroHelp = texto.replace(/^\/(?:ajuda|help)\s*/i, "").trim();
      return enviarManualCompletoComandos(chatId, filtroHelp);
    },
    "/status": function() {
      return tratarComandoStatus(chatId);
    },
    "/fontes": function() {
      return tratarComandoStatus(chatId);
    },
    "/mudancas": function() {
      return tratarComandoUltimasMudancas(chatId, false);
    },
    "/mudanças": function() {
      return tratarComandoUltimasMudancas(chatId, false);
    },
    "/ultimas_mudancas": function() {
      return tratarComandoUltimasMudancas(chatId, false);
    },
    "/ultimasmudancas": function() {
      return tratarComandoUltimasMudancas(chatId, false);
    },
    "/deploy": function() {
      return tratarComandoUltimasMudancas(chatId, true);
    },
    "/enfermaria": function() {
      if (typeof mostrarPainelLeitos === "function") return mostrarPainelLeitos(chatId, 0);
      return enviarMensagemComTecladoParaChat(chatId, EnfermariaService.formatarPainelBordo(), construirTecladoHubEnfermaria());
    },
    "/leitos": function() {
      if (typeof mostrarPainelLeitos === "function") return mostrarPainelLeitos(chatId, 0);
      return enviarMensagemComTecladoParaChat(chatId, EnfermariaService.formatarPainelBordo(), construirTecladoHubEnfermaria());
    },
    "/censo": function() {
      if (typeof mostrarPainelLeitos === "function") return mostrarPainelLeitos(chatId, 0);
      return enviarMensagemComTecladoParaChat(chatId, EnfermariaService.formatarPainelBordo(), construirTecladoHubEnfermaria());
    },
    "/pc": function() {
      return tratarComandoPc(chatId, texto);
    },
    "/rx": function() {
      return tratarComandoRx(chatId, texto);
    },
    "/receita": function() {
      return tratarComandoRx(chatId, texto);
    },
    "/rxh": function() {
      return tratarComandoRxh(chatId, texto);
    },
    "/prescricao_hospitalar": function() {
      return tratarComandoRxh(chatId, texto);
    },
    "/plantao": function() {
      return tratarComandoPlantao(chatId, texto);
    },
    "/sbar": function() {
      return tratarComandoPlantao(chatId, texto);
    },
    "/calc": function() {
      return tratarComandoCalc(chatId, texto, "ctx_" + chatId);
    }
  };

  if (cmdHandlers[comando]) {
    return { executado: true, resultado: cmdHandlers[comando]() };
  }
  return { executado: false };
}

/**
 * Tabela de despacho para atalhos do teclado fixo persistente (1-toque).
 */
function rotearAtalhoTecladoFixo(texto, comando, chatId) {
  // 1. Cockpit Móvel
  if (texto === "📱 Cockpit" || texto === "📱 Cockpit Móvel" || comando === "/cockpit" || comando === "/app") {
    var urlPainel = obterUrlCockpit(chatId);
    var ehTitular = (typeof ehUsuarioTitular === "function") ? ehUsuarioTitular(chatId) : true;
    var msgCockpit = "";
    if (ehTitular) {
      msgCockpit = "📱 *COCKPIT MÓVEL (TELEGRAM MINI APP)*\n\n" +
        "Seu assistente unificado com 6 abas de alta performance:\n\n" +
        "• 🧬 *Corpo:* Composição, peso e protocolo\n" +
        "• 🏥 *Leitos:* Painel da enfermaria e SBAR\n" +
        "• 💊 *REMUME:* Busca rápida de doses\n" +
        "• 🧮 *Cálculos:* DVA, SRI, CrCl e Gasometria\n" +
        "• 📅 *Rotina:* Agenda Google e Time-Blocking\n" +
        "• ✨ *SOAP:* Preceptor socrático e PEP\n\n" +
        "Toque no botão abaixo para abrir diretamente na tela do Telegram:";
    } else {
      msgCockpit = "📱 *COCKPIT MÓVEL (TELEGRAM MINI APP)*\n\n" +
        "Seu assistente clínico de plantão com acesso rápido e offline-first:\n\n" +
        "• ✨ *SOAP:* Assistente de conduta clínica e evolução\n" +
        "• 🏥 *Leitos:* Painel da enfermaria e metodologia SBAR\n" +
        "• 💊 *REMUME:* Bulário municipal e doses de antibióticos\n" +
        "• 🧮 *Calculadoras:* DVA, SRI, Clearance, CURB-65, Glasgow e Gasometria\n" +
        "• 🎓 *Aulas:* Diretrizes clínicas e resumos práticos\n\n" +
        "Toque no botão abaixo para abrir diretamente na tela do Telegram:";
    }
    var kbCockpit = {
      inline_keyboard: [
        [
          { text: "🚀 Abrir Cockpit em Tela Cheia", web_app: { url: urlPainel } }
        ]
      ]
    };
    var resEnvio;
    if (typeof enviarMensagemComTecladoParaChat === "function") {
      resEnvio = enviarMensagemComTecladoParaChat(chatId, msgCockpit, kbCockpit);
    } else if (typeof enviarMensagemComBotoes === "function") {
      resEnvio = enviarMensagemComBotoes(chatId, msgCockpit, kbCockpit);
    } else {
      resEnvio = enviarMensagemParaChat(chatId, msgCockpit);
    }
    return { executado: true, resultado: resEnvio };
  }

  // 2. Sala Vermelha
  if (texto === "🚨 Sala Vermelha" || texto === "🚨 Emergência" || comando === "/sala" || comando === "/emergencia" || comando === "/salavermelha" || comando === "/urgencia") {
    if (typeof enviarMenuSalaVermelha === "function") {
      return { executado: true, resultado: enviarMenuSalaVermelha(chatId) };
    }
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
    return { executado: true, resultado: enviarMensagemParaChat(chatId, txtSR) };
  }

  // 3. Enfermaria
  if (texto === "🛏️ Enfermaria" || texto === "🏥 Enfermaria") {
    if (typeof enviarMenuEnfermaria === "function") {
      return { executado: true, resultado: enviarMenuEnfermaria(chatId) };
    }
    return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, EnfermariaService.formatarPainelBordo(), construirTecladoHubEnfermaria()) };
  }

  // 4. Ambulatório
  if (texto === "🩺 Ambulatório" || texto === "🩺 SOAP Ambulatorial") {
    if (typeof enviarMenuAmbulatorio === "function") {
      return { executado: true, resultado: enviarMenuAmbulatorio(chatId) };
    }
    return { executado: true, resultado: processarMensagemTexto({ chat: { id: chatId }, text: "/ambulatorio" }) };
  }

  // 5. Prescrever
  if (texto === "💊 Prescrever") {
    if (typeof iniciarModoBot === "function") {
      return { executado: true, resultado: iniciarModoBot(chatId, "rx", false) };
    }
    return { executado: true, resultado: null };
  }

  // 6. Consultas de Bolso / REMUME Rápida
  if (texto === "💊 Consultas de Bolso" || texto === "💊 REMUME Rápida") {
    if (typeof enviarMenuConsultasBolso === "function") {
      return { executado: true, resultado: enviarMenuConsultasBolso(chatId) };
    }
    return { executado: true, resultado: enviarMensagemParaChat(chatId, "💊 *PRESCRIÇÃO AMBULATORIAL (REMUME)*\n\nEnvie o pedido ou diagnóstico:\n💡 *Ex:* `/rx amigdalite bacteriana criança 18kg, alérgica a penicilina` ou apenas descreva o caso.") };
  }

  // 7. Agenda
  if (texto === "📅 Agenda") {
    return { executado: true, resultado: consultarEventosAgenda("hoje", chatId) };
  }

  // 8. Minhas Tarefas
  if (texto === "📋 Minhas Tarefas") {
    return { executado: true, resultado: listarTarefasHojeNotion(chatId) };
  }

  // 9. Gasometria
  if (texto === "🩸 Gaso") {
    return { executado: true, resultado: enviarMensagemParaChat(chatId, "🩸 *GASOMETRIA ARTERIAL*\n\nEnvie os parâmetros:\n💡 *Ex:* `/gaso pH 7.24, pCO2 26, HCO3 11, Na 140, Cl 104, Alb 3.2`") };
  }

  // 10. Fim de Plantão
  if (texto === "🏁 Fim de Plantão") {
    return { executado: true, resultado: gerarResumoFimPlantao(chatId) };
  }

  // 11. Preceptor Voz
  if (texto === "🎧 Preceptor Voz") {
    if (typeof iniciarOuConvidarDiscussaoPreceptor === "function") {
      return { executado: true, resultado: iniciarOuConvidarDiscussaoPreceptor(chatId, { ehAudio: false }) };
    }
    if (typeof iniciarModoBot === "function") return { executado: true, resultado: iniciarModoBot(chatId, "voz", false) };
    return { executado: true, resultado: enviarMensagemParaChat(chatId, "🎧 Grave ou envie um caso clínico para o Preceptor Socrático.") };
  }

  // 12. Dúvida MedQuest
  if (texto === "🧠 Dúvida MedQuest") {
    return { executado: true, resultado: enviarMensagemParaChat(chatId, "🧠 *DÚVIDA MÉDICA (MEDQUEST)*\n\nDigite sua dúvida para arquivar no bloco de estudo noturno:\n💡 *Ex:* `/duvida Indicações de drenagem torácica no empiema`") };
  }

  // 13. Central / Menu / Hub
  if (texto === "⚙️ Central / Menu" || texto === "⚙️ Menu / Ajuda" || comando === "/teclado" || comando === "/menu" || comando === "/hub") {
    if (typeof registrarComandosNativosTelegram === "function") {
      try { registrarComandosNativosTelegram(); } catch (eCmd) {}
    }
    if (typeof enviarHubPrincipal === "function") {
      return { executado: true, resultado: enviarHubPrincipal(chatId) };
    }
    var msgTeclado = "⌨️ *Teclado de Acesso Rápido Ativado!*\n\nUse os botões na base do chat para navegação imediata de 1 toque no hospital e na rotina.";
    return { executado: true, resultado: enviarMensagemComTecladoFixo(chatId, msgTeclado) };
  }

  return { executado: false };
}

/**
 * Protocolo de Choque Séptico Refratário & CIRCI.
 */
function tratarComandoChoqueSeptico(chatId, texto) {
  var dadosChoque = texto.replace(/^\/\w+\s*/, "").trim();
  if (typeof EmergenciaChoqueSepticoService === "undefined") {
    return enviarMensagemParaChat(chatId, "⚠️ Módulo EmergenciaChoqueSepticoService indisponível temporariamente.");
  }
  if (dadosChoque.indexOf("-") !== -1 || /-\d/.test(dadosChoque)) {
    var msgNegSeptico = "⚠️ *Atenção — Parâmetros Inválidos:* O peso e a dose de noradrenalina devem ser números estritamente positivos (> 0).\n\n💡 *Exemplo:* `/choqueseptico 70 0.3`";
    var kbNegSeptico = (typeof botoesBot === "function") ? botoesBot([
      [['🔙 Sala Vermelha', 'ux:hub:sala'], ['🏠 Início', 'ux:hub:inicio']]
    ]) : null;
    if (kbNegSeptico && typeof enviarMensagemComTecladoParaChat === "function") {
      return enviarMensagemComTecladoParaChat(chatId, msgNegSeptico, kbNegSeptico);
    }
    return enviarMensagemParaChat(chatId, msgNegSeptico);
  }

  var nums = dadosChoque.match(/\d+(?:[.,]\d+)?/g);
  if (!nums || nums.length < 2) {
    var msgAjudaSeptico = "🩸 *EMERGÊNCIA — CHOQUE SÉPTICO REFRATÁRIO & CIRCI*\n\n" +
      "Uso: `/choqueseptico <pesoKg> <dose_nora_mcg/kg/min>`\n\n" +
      "💡 *Exemplo:* `/choqueseptico 70 0.3` (Detecta refratariedade >= 0.25 mcg/kg/min, prescreve Hidrocortisona e Vasopressina).\n" +
      "Nota: Azul de Metileno expurgado (conduta terciária/UTI).";
    var kbAjudaSeptico = (typeof botoesBot === "function") ? botoesBot([
      [['🩸 Choque Séptico (70kg 0.3)', 'ux:choque:septico:70:0.3']],
      [['🔙 Sala Vermelha', 'ux:hub:sala'], ['🏠 Início', 'ux:hub:inicio']]
    ]) : null;
    if (kbAjudaSeptico && typeof enviarMensagemComTecladoParaChat === "function") {
      return enviarMensagemComTecladoParaChat(chatId, msgAjudaSeptico, kbAjudaSeptico);
    }
    return enviarMensagemParaChat(chatId, msgAjudaSeptico);
  }
  var val1 = parseFloat(nums[0].replace(",", "."));
  var val2 = parseFloat(nums[1].replace(",", "."));
  var pesoChoque = (val1 >= 20 && val2 < 20) ? val1 : ((val2 >= 20 && val1 < 20) ? val2 : val1);
  var doseNora = (pesoChoque === val1) ? val2 : val1;
  pesoChoque = sanitizarEValidarPesoKg(pesoChoque);

  if (pesoChoque === null || isNaN(doseNora) || doseNora <= 0 || doseNora > 10) {
    var msgInvSeptico = "⚠️ *Atenção — Parâmetros Inválidos:* Digite um peso positivo (> 0 kg) e dose de noradrenalina válida (> 0 mcg/kg/min).\n\n💡 *Exemplo:* `/choqueseptico 70 0.3`";
    var kbInvSeptico = (typeof botoesBot === "function") ? botoesBot([
      [['🔙 Sala Vermelha', 'ux:hub:sala'], ['🏠 Início', 'ux:hub:inicio']]
    ]) : null;
    if (kbInvSeptico && typeof enviarMensagemComTecladoParaChat === "function") {
      return enviarMensagemComTecladoParaChat(chatId, msgInvSeptico, kbInvSeptico);
    }
    return enviarMensagemParaChat(chatId, msgInvSeptico);
  }
  var resChoque = EmergenciaChoqueSepticoService.avaliarCirciEVasopressina(pesoChoque, doseNora);
  if (resChoque.erro) return enviarMensagemParaChat(chatId, "⚠️ " + resChoque.erro);

  var txtOutSeptico = "🩸 *PROTOCOLO DE CHOQUE SÉPTICO REFRATÁRIO (ALERTA CLÍNICO)*\n\n" + resChoque.textoSOAP;
  var cacheSeptico = (typeof uxCache === "function") ? uxCache() : CacheService.getScriptCache();
  var ckSeptico = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cacheSeptico, ckSeptico, txtOutSeptico, 21600);
  var kbResSeptico = (typeof botoesBot === "function") ? botoesBot([
    [['📋 Copiar para Prontuário', 'ux:copiar:' + ckSeptico]],
    [['🔙 Sala Vermelha', 'ux:hub:sala'], ['🏠 Início', 'ux:hub:inicio']]
  ]) : null;
  if (kbResSeptico && typeof enviarMensagemComTecladoParaChat === "function") {
    return enviarMensagemComTecladoParaChat(chatId, txtOutSeptico, kbResSeptico);
  }
  return enviarMensagemParaChat(chatId, txtOutSeptico);
}

/**
 * Protocolo de Sequência Rápida de Intubação (SRI / IOT).
 */
function tratarComandoSri(chatId, texto) {
  var dadosSri = texto.replace(/^\/(sri|iot)\s*/i, "").trim();
  var tecladoSriRetorno = {
    inline_keyboard: [
      [
        { text: "🫁 60 kg", callback_data: "ux:sri:60" },
        { text: "🫁 70 kg", callback_data: "ux:sri:70" },
        { text: "🫁 80 kg", callback_data: "ux:sri:80" }
      ],
      [
        { text: "🔙 Sala Vermelha", callback_data: "ux:sala" },
        { text: "🏠 Início", callback_data: "ux:hub:inicio" }
      ]
    ]
  };

  if (!dadosSri) {
    if (typeof enviarMenuSri === "function") {
      return enviarMenuSri(chatId);
    }
    return enviarMensagemComTecladoParaChat(chatId, "🫁 *SEQUÊNCIA RÁPIDA DE INTUBAÇÃO (SRI / IOT)*\n\nUso: `/sri <pesoKg> [contexto]`\n💡 *Exemplos:*\n• `/sri 70`\n• `/sri 80 choque`\n• `/sri 65 asma`\n• `/sri 75 tce`", tecladoSriRetorno);
  }
  var partesSri = dadosSri.split(/\s+/);
  var pesoSri = sanitizarEValidarPesoKg(partesSri[0]);
  if (pesoSri === null) {
    return enviarMensagemComTecladoParaChat(chatId, "⚠️ *Peso obrigatório e inválido para SRI/IOT:*\nInforme um peso numérico positivo em kg (ex: de 30 a 300 kg).\n\n💡 *Exemplo:* `/sri 70` ou `/sri 72,5 choque`\nOu selecione um peso rápido abaixo:", tecladoSriRetorno);
  }
  var contextoSri = partesSri.slice(1).join(" ") || "padrao";
  try {
    var resSri = CalculadorasClinicas.sequenciaRapidaIntubacao(pesoSri, contextoSri);
    if (resSri && resSri.erro) {
      return enviarMensagemComTecladoParaChat(chatId, "⚠️ " + resSri.erro + "\n\n💡 Informe um peso entre 30 e 300 kg ou escolha uma opção:", tecladoSriRetorno);
    }
    if (resSri && resSri.textoFormatado) {
      var cacheSri = (typeof uxCache === "function") ? uxCache() : CacheService.getScriptCache();
      var ckSri = Utilities.getUuid().replace(/-/g, '');
      safePutCache(cacheSri, ckSri, resSri.textoFormatado, 21600);
      var tecladoSri = resSri.botoes ? (resSri.botoes.inline_keyboard ? resSri.botoes : { inline_keyboard: resSri.botoes }) : null;
      if (!tecladoSri && typeof botoesBot === "function") {
        tecladoSri = botoesBot([
          [['📋 Copiar para Prontuário', 'ux:copiar:' + ckSri]],
          [['🔙 Sala Vermelha', 'ux:sala'], ['🏠 Início', 'ux:hub:inicio']]
        ]);
      } else if (tecladoSri && tecladoSri.inline_keyboard) {
        var jaTemCopiarSri = tecladoSri.inline_keyboard.some(function(row) {
          return row.some(function(btn) { return btn.text && btn.text.indexOf("Copiar") !== -1; });
        });
        if (!jaTemCopiarSri) {
          tecladoSri.inline_keyboard.unshift([
            { text: "📋 Copiar para Prontuário", callback_data: "ux:copiar:" + ckSri }
          ]);
        }
      }
      if (tecladoSri) {
        return enviarMensagemComTecladoParaChat(chatId, resSri.textoFormatado, tecladoSri);
      } else {
        return enviarMensagemComTecladoParaChat(chatId, resSri.textoFormatado, tecladoSriRetorno);
      }
    }
    return enviarMensagemComTecladoParaChat(chatId, "⚠️ Erro ao calcular SRI. Selecione uma opção:", tecladoSriRetorno);
  } catch (eSri) {
    Logger.log("Erro /sri: " + eSri.message);
    return enviarMensagemComTecladoParaChat(chatId, "⚠️ Erro ao calcular SRI. Tente novamente ou selecione uma opção:", tecladoSriRetorno);
  }
}


// ============================================================================
// DESPACHADORES MODULARES POR DOMÍNIO CLÍNICO (DECOUPLING FASE 1)
// ============================================================================

function despacharComandosEmergenciaSalaVermelha_(comando, texto, chatId, message) {
  // 1. Choque Séptico Refratário & CIRCI
  if (comando === "/choqueseptico" || comando === "/septico" || comando === "/circi" || comando === "/vasopressina") {
    return { executado: true, resultado: tratarComandoChoqueSeptico(chatId, texto) };
  }

  // 2. Calculadora de Drogas Vasoativas (DVA) & Compatibilidade em Y
  if (comando === "/dva" || comando === "/compatibilidade" || comando === "/compatibilidade_y") {
    var dadosDva = texto.replace(/^\/(?:dva|compatibilidade|compatibilidade_y)\s*/i, "").trim();
    if (!dadosDva) {
      if (comando === "/dva" && typeof enviarMenuDva === "function") {
        return { executado: true, resultado: enviarMenuDva(chatId) };
      }
      return { executado: true, resultado: enviarMensagemParaChat(chatId, "💉 *CALCULADORA DE DROGAS VASOATIVAS (DVA)*\n\nUso: `/dva <droga> <pesoKg> [solução]`\n💡 *Exemplos:*\n• `/dva nora 70` (Noradrenalina padrão)\n• `/dva nora 80 concentrada` (Solução 2x)\n• `/dva dobuta 65`\n• `/dva vaso`\n• `/dva nipride 75`\n• `/dva tridil`\n\n🔬 *Compatibilidade em Y (Prescrição Combinada / BIC):*\n• `/dva y nora dobuta` (Checar se podem correr no mesmo lúmen)\n• `/dva y nora furosemida` (Alerta de precipitação físico-química)") };
    }
    var partesDva = dadosDva.split(/\s+/);

    var tecladoDvaPadrao = {
      inline_keyboard: [
        [{ text: "🔙 Sala Vermelha", callback_data: "ux:hub:sala" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    };

    // Detecção de consulta direta de compatibilidade em Y (/dva y droga1 droga2 ou /compatibilidade d1 d2)
    var ehConsultaY = (partesDva[0].toLowerCase() === "y" || partesDva[0].toLowerCase() === "compatibilidade" || partesDva[0].toLowerCase() === "crosscheck" || comando === "/compatibilidade" || comando === "/compatibilidade_y");
    if (ehConsultaY) {
      var d1Y = (partesDva[0].toLowerCase() === "y" || partesDva[0].toLowerCase() === "compatibilidade" || partesDva[0].toLowerCase() === "crosscheck") ? partesDva[1] : partesDva[0];
      var d2Y = (partesDva[0].toLowerCase() === "y" || partesDva[0].toLowerCase() === "compatibilidade" || partesDva[0].toLowerCase() === "crosscheck") ? partesDva[2] : partesDva[1];
      if (d1Y && d2Y && typeof CompatibilidadeYDvaService !== "undefined") {
        var parecerY = CompatibilidadeYDvaService.formatarParecerCompatibilidadeY(d1Y, d2Y);
        return { executado: true, resultado: enviarMensagemParaChat(chatId, parecerY) };
      }
    }

    // Detecção inteligente de 2 drogas sem peso (ex: /dva nora dobuta ou /dva nora furosemida)
    if (partesDva.length === 2 && !/^\d/.test(partesDva[1]) && isNaN(Number(partesDva[1].replace(",", "."))) && typeof CompatibilidadeYDvaService !== "undefined") {
      var d1Norm = CompatibilidadeYDvaService.normalizarNomeDroga(partesDva[0]);
      var d2Norm = CompatibilidadeYDvaService.normalizarNomeDroga(partesDva[1]);
      var d1Existe = Boolean(CompatibilidadeYDvaService.FICHAS_DILUICAO_DVA[d1Norm] || (CompatibilidadeYDvaService.TABELA_COMPATIBILIDADE_Y && CompatibilidadeYDvaService.TABELA_COMPATIBILIDADE_Y[d1Norm]));
      var d2Existe = Boolean(CompatibilidadeYDvaService.FICHAS_DILUICAO_DVA[d2Norm] || (CompatibilidadeYDvaService.TABELA_COMPATIBILIDADE_Y && CompatibilidadeYDvaService.TABELA_COMPATIBILIDADE_Y[d2Norm]));
      if (d1Existe && d2Existe) {
        var parecerAutoY = CompatibilidadeYDvaService.formatarParecerCompatibilidadeY(partesDva[0], partesDva[1]);
        return { executado: true, resultado: enviarMensagemParaChat(chatId, parecerAutoY) };
      }
    }

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
        return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, "⚠️ *Peso obrigatório:* Para " + partesDva[0] + ", informe o peso do paciente em kg.\n\n💡 *Exemplo:* `/dva " + partesDva[0] + " 70` ou `/dva " + partesDva[0] + " 70,5`", tecladoDvaPadrao) };
      }
      pesoDva = sanitizarEValidarPesoKg(partesDva[1]);
      if (pesoDva === null) {
        return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, "⚠️ *Peso inválido:* \"" + partesDva[1] + "\" não é um peso válido em kg. Digite um valor numérico positivo (ex: `/dva " + partesDva[0] + " 70` ou `/dva " + partesDva[0] + " 70,5`).", tecladoDvaPadrao) };
      }
      solucaoDva = partesDva.slice(2).join(" ") || "padrao";
    }

    try {
      var resDva = CalculadorasClinicas.drogasVasoativas(nomeDroga, pesoDva, solucaoDva);
      if (resDva && resDva.erro) {
        return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, "⚠️ " + resDva.erro, tecladoDvaPadrao) };
      }
      if (resDva && resDva.textoFormatado) {
        var cacheDva = (typeof uxCache === "function") ? uxCache() : CacheService.getScriptCache();
        var ckDva = Utilities.getUuid().replace(/-/g, '');
        safePutCache(cacheDva, ckDva, resDva.textoFormatado, 21600);
        var tecladoDva = resDva.botoes ? (resDva.botoes.inline_keyboard ? resDva.botoes : { inline_keyboard: resDva.botoes }) : null;
        if (!tecladoDva && typeof botoesBot === "function") {
          tecladoDva = botoesBot([
            [['📋 Copiar para Prontuário', 'ux:copiar:' + ckDva]],
            [['🔙 Sala Vermelha', 'ux:hub:sala'], ['🏠 Início', 'ux:hub:inicio']]
          ]);
        } else if (tecladoDva && tecladoDva.inline_keyboard) {
          var jaTemCopiarDva = tecladoDva.inline_keyboard.some(function(row) {
            return row.some(function(btn) { return btn.text && btn.text.indexOf("Copiar") !== -1; });
          });
          if (!jaTemCopiarDva) {
            tecladoDva.inline_keyboard.unshift([
              { text: "📋 Copiar para Prontuário", callback_data: "ux:copiar:" + ckDva }
            ]);
          }
        }
        if (tecladoDva) {
          return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, resDva.textoFormatado, tecladoDva) };
        } else {
          return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, resDva.textoFormatado, tecladoDvaPadrao) };
        }
      }
      return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, "⚠️ Droga não reconhecida. Opções: `nora`, `dobuta`, `dobu`, `vaso`, `nipride`, `tridil`.", tecladoDvaPadrao) };
    } catch (eDva) {
      Logger.log("Erro /dva: " + eDva.message);
      return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, "⚠️ Erro ao calcular DVA. Tente novamente.", tecladoDvaPadrao) };
    }
  }

  // 3. Sequência Rápida de Intubação (SRI / IOT)
  if (comando === "/sri" || comando === "/iot") {
    return { executado: true, resultado: tratarComandoSri(chatId, texto) };
  }

  // 4. PROTOCOLO DE PCR / ACLS BEIRA-LEITO (SALA VERMELHA)
  if (comando === "/pcr" || comando === "/acls") {
    var dadosPcrCmd = texto.replace(/^\/(?:pcr|acls)\s*/i, "").trim();
    return { executado: true, resultado: tratarComandoPcr(chatId, dadosPcrCmd) };
  }

  // 5. PROTOCOLO DE ARRITMIAS CARDÍACAS (ACLS)
  if (comando === "/arritmia" || comando === "/taquiarritmia" || comando === "/taquicardia" || comando === "/bradiarritmia" || comando === "/bradicardia") {
    var dadosArrCmd = texto.replace(/^\/(?:arritmia|taquiarritmia|taquicardia|bradiarritmia|bradicardia)\s*/i, "").trim();
    return { executado: true, resultado: tratarComandoArritmia(chatId, comando, dadosArrCmd) };
  }

  return { executado: false };
}

function despacharComandosAmbulatorioESoap_(comando, texto, chatId, contextoCache, contextoKey) {
  if (comando === "/soap") {
    var casoClinico = texto.replace(/^\/soap\s*/i, "").trim();
    if (!casoClinico) {
      if (typeof iniciarModoBot === "function") {
        return { executado: true, resultado: iniciarModoBot(chatId, "soap", true) };
      }
      return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId,
        "🩺 *MODO SOAP · ANAMNESE & EXAME CLÍNICO*\n\n" +
        "Envie o caso clínico narrado ou em tópicos para estruturação em prontuário PEP.\n\n" +
        "💡 *Exemplo:* `/soap Mulher 68a, dor epigástrica em queimação há 3 semanas, sem vômitos, PA 130/80`",
        {
          inline_keyboard: [
            [
              { text: "📝 Iniciar SOAP", callback_data: "ux:iniciar:soap" }
            ],
            [
              { text: "🔙 Ambulatório", callback_data: "ux:hub:amb" },
              { text: "🏠 Início", callback_data: "ux:hub:inicio" }
            ]
          ]
        }
      ) };
    }
    safePutCache(contextoCache, contextoKey, casoClinico, 900);
    if (typeof definirModoBot !== "undefined") definirModoBot(chatId, "soap", casoClinico);
    if (typeof processarEntradaSoap === "function") {
      return { executado: true, resultado: processarEntradaSoap(chatId, casoClinico) };
    }
    return { executado: true, resultado: processarEEntregarIA(chatId, gerarSOAPComIA, casoClinico, "soap") };
  }

  if (comando === "/soap_ambulatorial" || comando === "/ambulatorio" || comando === "/soap_aps") {
    var casoAmb = texto.replace(/^\/(soap_ambulatorial|ambulatorio|soap_aps)\s*/i, "").trim();
    if (!casoAmb) {
      var msgGuiaAmb = "📋 *AMBULATÓRIO · MÓDULO SOAP AMBULATORIAL ÁGIL (ATENÇÃO PRIMÁRIA & UBS)*\n\n" +
        "Envie o caso clínico com queixa, sinais vitais e histórico. O sistema gera prontuário SOAP estruturado com estratificação de risco (SBC/SBD), autocompleção CID-10/CIAP-2 e conduta REMUME.\n\n" +
        "💡 *Exemplos:*\n" +
        "• `/ambulatorio Homem 54a, hipertenso e diabético, traz PA 150/94, glicemia jejum 164, em uso de Losartana 50mg e Metformina 850mg`\n" +
        "• `/ambulatorio Mulher 32a, tosse produtiva e coriza há 4 dias, afebril, PA 118/76, sem dispneia`\n" +
        "• `/ambulatorio Paciente 45a, dor lombar mecânica há 1 semana após esforço, Lasègue negativo bilateral`\n\n" +
        "📜 *Para gerar Atestado Médico CFM:* use `/atestado [dias] [motivo]`";
      var tecladoAmb = {
        inline_keyboard: [
          [
            { text: "📝 Iniciar SOAP Ágil", callback_data: "ux:amb:soap" },
            { text: "💊 Prescrição REMUME", callback_data: "ux:amb:remume" }
          ],
          [
            { text: "🏷️ CID-10 & CIAP-2", callback_data: "ux:amb:cid" },
            { text: "📄 Atestado CFM", callback_data: "ux:amb:atestado" }
          ],
          [
            { text: "🔙 Ambulatório", callback_data: "ux:hub:amb" },
            { text: "🏠 Início", callback_data: "ux:hub:inicio" }
          ]
        ]
      };
      return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, msgGuiaAmb, tecladoAmb) };
    }
    safePutCache(contextoCache, contextoKey, casoAmb, 900);
    if (typeof definirModoBot !== "undefined") definirModoBot(chatId, "soap", casoAmb);
    return { executado: true, resultado: processarEEntregarIA(chatId, function(c) {
      return gerarSOAPComIA(c, { ambulatorialAgil: true, fecharPlano: true });
    }, casoAmb, "soap") };
  }

  if (comando === "/atestado") {
    var dadosAt = texto.replace(/^\/atestado\s*/i, "").trim();
    if (!dadosAt) {
      if (typeof enviarTelaAmbAtestado === "function") {
        return { executado: true, resultado: enviarTelaAmbAtestado(chatId) };
      }
      var msgAjudaAt = "📜 *GERADOR DE ATESTADO MÉDICO LEGAL (RESOLUÇÃO CFM 1.658/2002)*\n\n" +
        "Envie a quantidade de dias e o motivo ou paciente:\n\n" +
        "💡 *Exemplos:*\n" +
        "• `/atestado 3 dias repouso por lombalgia, paciente Carlos Silva`\n" +
        "• `/atestado 5 dias, faringite aguda, com CID, paciente Ana Santos`\n" +
        "• `/atestado 1 dia repouso`\n\n" +
        "_Nota médica: O CID-10 só é incluído mediante autorização expressa do paciente._";
      var tecladoAjudaAt = {
        inline_keyboard: [
          [
            { text: "📄 1 Dia (Consulta)", callback_data: "ux:amb:atest:1d" },
            { text: "📄 3 Dias (IVAS)", callback_data: "ux:amb:atest:3d" }
          ],
          [
            { text: "📄 5 Dias (Afastamento)", callback_data: "ux:amb:atest:5d" },
            { text: "📄 7 Dias (Lombalgia)", callback_data: "ux:amb:atest:7d" }
          ],
          [
            { text: "🔙 Ambulatório", callback_data: "ux:hub:amb" },
            { text: "🏠 Início", callback_data: "ux:hub:inicio" }
          ]
        ]
      };
      return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, msgAjudaAt, tecladoAjudaAt) };
    }
    var mDias = dadosAt.match(/(\d+)\s*dias?/i);
    var qtdDias = mDias ? parseInt(mDias[1], 10) : 1;
    var mComCid = /com\s+cid/i.test(dadosAt);
    var mNome = dadosAt.match(/paciente\s*[:=]?\s*([^,;\n]+)/i);
    var nomePac = mNome ? mNome[1].trim() : 'Ao Portador';

    var cidEncontrado = null;
    if (typeof SoapAmbulatorialService !== "undefined") {
      var termosPossiveis = dadosAt.replace(/paciente\s*[:=]?\s*([^,;\n]+)/i, '').replace(/\d+\s*dias?/i, '').replace(/com\s+cid/i, '').trim();
      var matchesDiag = SoapAmbulatorialService.buscarDiagnostico(termosPossiveis);
      if (matchesDiag && matchesDiag.length) {
        cidEncontrado = matchesDiag[0];
      }
    }

    var textoAtestado = (typeof SoapAmbulatorialService !== "undefined")
      ? SoapAmbulatorialService.exportarAtestadoTexto({
          pacienteNome: nomePac,
          dias: qtdDias,
          incluirCid: mComCid,
          cid: cidEncontrado ? cidEncontrado.cid10 : (mComCid ? 'A definir pelo assistente' : null),
          cidDescricao: cidEncontrado ? cidEncontrado.diagnostico : null
        })
      : "Atestado médico indisponível.";

    var cacheKeyAt = Utilities.getUuid().replace(/-/g, "");
    safePutCache(CacheService.getScriptCache(), cacheKeyAt, textoAtestado, 21600);
    var limpoAt = typeof uxTextoProntuario === "function" ? uxTextoProntuario(textoAtestado) : textoAtestado.trim();
    var btnCopiarAt;
    if (limpoAt.length >= 1 && limpoAt.length <= 256) {
      btnCopiarAt = { "text": "📋 Copiar para Prontuário", "copy_text": { "text": limpoAt } };
    } else {
      btnCopiarAt = { "text": "📋 Copiar para Prontuário", "callback_data": "ux:copiar:" + cacheKeyAt };
    }
    var tecladoAtestado = {
      inline_keyboard: [
        [btnCopiarAt],
        [
          { text: "🔙 Ambulatório", callback_data: "ux:hub:amb" },
          { text: "🏠 Início", callback_data: "ux:hub:inicio" }
        ]
      ]
    };
    var msgAtestado = "📜 *ATESTADO MÉDICO PRONTO PARA O PRONTUÁRIO / PEP:*\n\n```\n" + textoAtestado + "\n```\n\n_Toque no botão abaixo para copiar direto para o prontuário eletrônico (PEP)._";
    return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, msgAtestado, tecladoAtestado) };
  }

  if (comando === "/cid" || comando === "/ciap") {
    var termoCid = texto.replace(/^\/(cid|ciap)\s*/i, "").trim();
    if (!termoCid) {
      if (typeof enviarTelaAmbCid === "function") {
        return { executado: true, resultado: enviarTelaAmbCid(chatId) };
      }
      return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId,
        "🏷️ *BUSCA DE CID-10 & CIAP-2 (ATENÇÃO PRIMÁRIA / UBS)*\n\nEnvie o diagnóstico desejado (ex: `/cid lombalgia`, `/cid has`, `/cid diabetes`).",
        {
          inline_keyboard: [
            [{ text: "🏷️ Ver Tabela Completa", callback_data: "ux:amb:cid" }],
            [{ text: "🔙 Ambulatório", callback_data: "ux:hub:amb" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
          ]
        }
      ) };
    }
    var matchesCid = (typeof SoapAmbulatorialService !== "undefined")
      ? SoapAmbulatorialService.buscarDiagnostico(termoCid)
      : [];

    if (matchesCid && matchesCid.length) {
      var linhasRes = ["🏷️ *BUSCA DE CID-10 & CIAP-2 (ATENÇÃO PRIMÁRIA / UBS)*\n"];
      linhasRes.push("Resultados encontrados para: _" + termoCid + "_\n");
      matchesCid.forEach(function(m, idx) {
        linhasRes.push("*" + (idx + 1) + ". " + m.diagnostico + "*");
        linhasRes.push("• Código CID-10: `" + m.cid10 + "` | CIAP-2: `" + m.ciap2 + "`");
        linhasRes.push("• Categoria: " + m.categoria);
        if (m.alarmes && m.alarmes.length) {
          linhasRes.push("• Sinais de Alarme: " + m.alarmes.slice(0, 2).join("; "));
        }
        linhasRes.push("");
      });
      var textoResCid = linhasRes.join("\n");
      var ckCidB = Utilities.getUuid().replace(/-/g, "");
      safePutCache(CacheService.getScriptCache(), ckCidB, textoResCid, 21600);
      var limpoCidB = typeof uxTextoProntuario === "function" ? uxTextoProntuario(textoResCid) : textoResCid.trim();
      var btnCopiarCid;
      if (limpoCidB.length >= 1 && limpoCidB.length <= 256) {
        btnCopiarCid = { "text": "📋 Copiar Resultados", "copy_text": { "text": limpoCidB } };
      } else {
        btnCopiarCid = { "text": "📋 Copiar Resultados", "callback_data": "ux:copiar:" + ckCidB };
      }
      var tecladoResCid = {
        inline_keyboard: [
          [btnCopiarCid],
          [
            { text: "🏷️ Tabela Completa", callback_data: "ux:amb:cid" },
            { text: "🔙 Ambulatório", callback_data: "ux:hub:amb" },
            { text: "🏠 Início", callback_data: "ux:hub:inicio" }
          ]
        ]
      };
      return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, textoResCid, tecladoResCid) };
    } else {
      var msgNaoEnc = "🏷️ *BUSCA DE CID-10 & CIAP-2*\n\nNenhum código direto encontrado no catálogo básico para: _" + termoCid + "_\n\n" +
        "💡 *Dica:* Tente pesquisar por termo amplo (ex: `/cid has`, `/cid diabetes`, `/cid dor de cabeca`, `/cid asma`).";
      var tecladoNaoEnc = {
        inline_keyboard: [
          [
            { text: "🏷️ Ver Tabela Completa", callback_data: "ux:amb:cid" },
            { text: "🔙 Ambulatório", callback_data: "ux:hub:amb" },
            { text: "🏠 Início", callback_data: "ux:hub:inicio" }
          ]
        ]
      };
      return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, msgNaoEnc, tecladoNaoEnc) };
    }
  }

  if (comando === "/remume") {
    if (typeof enviarTelaAmbRemume === "function") {
      return { executado: true, resultado: enviarTelaAmbRemume(chatId) };
    }
  }

  return { executado: false };
}

function despacharComandosGinecologiaObstetricia_(comando, texto, chatId) {
  if (comando === "/prenatal" || comando === "/dpp") {
    var dadosPn = texto.replace(/^\/(prenatal|dpp)\s*/i, "").trim();
    if (!dadosPn) {
      var msgAjudaPn = "🤰 *CALCULADORA E PAINEL DE PRÉ-NATAL (OBSTETRÍCIA AMBULATORIAL)*\n\n" +
        "Envie dados de DUM, 1º Ultrassom, medidas maternas ou medicações em uso:\n\n" +
        "💡 *Exemplos de Uso:*\n" +
        "• `/dpp 15/05/2026` *(cálculo direto Naegele e DPP)*\n" +
        "• `/prenatal DUM 10/02/2026 peso 65 alt 1.62` *(IG, DPP e ganho de peso IOM)*\n" +
        "• `/prenatal DUM 15/01/2026 USG 10/03/2026 8s2d` *(concordância FEBRASGO/ACOG)*\n" +
        "• `/prenatal med Enalapril, Sinvastatina, Paracetamol` *(validador farmacológico)*\n\n" +
        "_Todas as condutas e rastreios seguem rigorosamente as diretrizes FEBRASGO e MS._";
      return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, msgAjudaPn, {
        inline_keyboard: [
          [
            { text: "🤰 Caso DUM 10/02/2026", callback_data: "ux:go:prenatal:dum" },
            { text: "💊 Auditoria Fármacos", callback_data: "ux:go:prenatal:med" }
          ],
          [
            { text: "🔙 Hub G&O", callback_data: "ux:rotina:go" },
            { text: "🏠 Início", callback_data: "ux:hub:inicio" }
          ]
        ]
      }) };
    }

    if (typeof ObstetriciaPrenatalService === "undefined") {
      return { executado: true, resultado: enviarMensagemParaChat(chatId, "⚠️ Módulo ObstetriciaPrenatalService indisponível temporariamente.") };
    }

    // Se for consulta de med/farmaco
    var mMed = dadosPn.match(/(?:med|farmaco|medicamentos?)\s*[:=]?\s*(.+)/i);
    if (mMed) {
      var audit = ObstetriciaPrenatalService.auditarPrescricaoGestante(mMed[1]);
      if (audit && audit.sucesso) {
        var textoAudit = "💊 *AUDITORIA DE SEGURANÇA FARMACOLÓGICA NA GESTAÇÃO*\n" +
          "*Parecer Geral:* `" + audit.parecerGeral + "`\n\n";
        if (audit.contraindicados.length > 0) {
          textoAudit += "⛔ *CONTRAINDICADOS NA GESTAÇÃO:*\n";
          audit.contraindicados.forEach(function(c) {
            textoAudit += "• *" + c.medicamento + "* (" + c.classe + " · Cat. " + c.categoriaFda + ")\n  ⚠️ " + c.alertas[0] + "\n  🔄 Alternativas: _" + c.alternativasRecomendadas.join("; ") + "_\n\n";
          });
        }
        if (audit.cautela.length > 0) {
          textoAudit += "⚠️ *USO SOB CAUTELA CLÍNICA:*\n";
          audit.cautela.forEach(function(ct) {
            textoAudit += "• *" + ct.medicamento + "*: " + ct.alertas[0] + "\n\n";
          });
        }
        if (audit.seguros.length > 0) {
          textoAudit += "✅ *Opções Seguras Avaliadas:* " + audit.seguros.map(function(s){ return s.medicamento; }).join(", ") + "\n";
        }
        var ckAudit = (typeof Utilities !== "undefined" && Utilities.getUuid) ? Utilities.getUuid().replace(/-/g, "") : String(Date.now());
        var cacheAudit = (typeof uxCache === "function") ? uxCache() : null;
        if (cacheAudit && typeof safePutCache === "function") safePutCache(cacheAudit, ckAudit, textoAudit, 21600);
        return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, textoAudit, {
          inline_keyboard: [
            [{ text: "📋 Copiar Conduta", callback_data: "ux:copiar:" + ckAudit }],
            [
              { text: "🔙 Hub G&O", callback_data: "ux:rotina:go" },
              { text: "🏠 Início", callback_data: "ux:hub:inicio" }
            ]
          ]
        }) };
      }
    }

    // Se for interpretação de sorologias e exames laboratoriais do pré-natal
    var ehExameSorologia = /(?:sorologia|vdrl|glicemia|toxo|anti-?hiv|hbsag|hepatite|urocultura|hemoglobina|coombs|avidez)/i.test(dadosPn);
    var semDumOuUsg = !/(?:dum|\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})/i.test(dadosPn);
    if (ehExameSorologia && semDumOuUsg) {
      var paramsSoro = {};
      var mGj = dadosPn.match(/glic(?:emia)?(?:\s*de\s*jejum)?\s*[:=]?\s*(\d+)/i);
      if (mGj) paramsSoro.glicemiaJejum = parseInt(mGj[1], 10);

      var mToxG = dadosPn.match(/toxo(?:plasmose)?\s*igg\s*[:=]?\s*([a-záéíóú\+\-]+)/i);
      if (mToxG) paramsSoro.toxoIgg = mToxG[1];

      var mToxM = dadosPn.match(/toxo(?:plasmose)?\s*igm\s*[:=]?\s*([a-záéíóú\+\-]+)/i);
      if (mToxM) paramsSoro.toxoIgm = mToxM[1];

      var mAvid = dadosPn.match(/avidez\s*[:=]?\s*(\d+|[a-záéíóú]+)/i);
      if (mAvid) paramsSoro.toxoAvidez = mAvid[1];

      var mVdrl = dadosPn.match(/vdrl\s*[:=]?\s*([^\n,;]+)/i);
      if (mVdrl) paramsSoro.vdrl = mVdrl[1].trim();

      var mHiv = dadosPn.match(/(?:anti-?)?hiv\s*[:=]?\s*([a-záéíóú\+\-]+)/i);
      if (mHiv) paramsSoro.hiv = mHiv[1];

      var mHbs = dadosPn.match(/hbsag\s*[:=]?\s*([a-záéíóú\+\-]+)/i);
      if (mHbs) paramsSoro.hbsag = mHbs[1];

      var mUro = dadosPn.match(/urocultura\s*[:=]?\s*([^\n,;]+)/i);
      if (mUro) paramsSoro.urocultura = mUro[1].trim();

      var mHb = dadosPn.match(/h(?:b|emoglobina)\s*[:=]?\s*(\d+(?:[\.,]\d+)?)/i);
      if (mHb) paramsSoro.hb = parseFloat(mHb[1].replace(',', '.'));

      var mRh = dadosPn.match(/rh\s*[:=]?\s*([a-záéíóú\+\-]+)/i);
      if (mRh) paramsSoro.rh = mRh[1];

      var mCoombs = dadosPn.match(/coombs\s*[:=]?\s*([^\n,;]+)/i);
      if (mCoombs) paramsSoro.coombs = mCoombs[1].trim();

      var mSem = dadosPn.match(/(\d+)\s*s(?:emanas?)?/i);
      if (mSem) paramsSoro.semanasGestacao = parseInt(mSem[1], 10);

      var laudoSoro = ObstetriciaPrenatalService.interpretarSorologiasLaboratorioPrenatal(paramsSoro);
      if (laudoSoro && laudoSoro.sucesso && laudoSoro.totalAvaliados > 0) {
        var ckSoro = (typeof Utilities !== "undefined" && Utilities.getUuid) ? Utilities.getUuid().replace(/-/g, "") : String(Date.now());
        var cacheSoro = (typeof uxCache === "function") ? uxCache() : null;
        if (cacheSoro && typeof safePutCache === "function") safePutCache(cacheSoro, ckSoro, laudoSoro.textoFormatado, 21600);
        return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, "📋 *INTERPRETAÇÃO DE EXAMES E CONDUTA NO PRÉ-NATAL:*\n\n```\n" + laudoSoro.textoFormatado + "\n```", {
          inline_keyboard: [
            [{ text: "📋 Copiar Conduta", callback_data: "ux:copiar:" + ckSoro }],
            [
              { text: "🔙 Hub G&O", callback_data: "ux:rotina:go" },
              { text: "🏠 Início", callback_data: "ux:hub:inicio" }
            ]
          ]
        }) };
      }
    }

    // Parse de dados obstétricos
    var paramsPn = {};
    var mDum = dadosPn.match(/(?:dum\s*[:=]?\s*)?(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})/i);
    if (mDum) paramsPn.dum = mDum[1];

    var mUsg = dadosPn.match(/usg\s*[:=]?\s*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})/i);
    if (mUsg) paramsPn.dataUsg = mUsg[1];

    var mIgUsg = dadosPn.match(/(\d{1,2})\s*s(?:emanas?)?(?:\s*(?:e\s*)?(\d{1,2})\s*d(?:ias?)?)?/i);
    if (mIgUsg && paramsPn.dataUsg) {
      paramsPn.semanasUsg = parseInt(mIgUsg[1], 10);
      paramsPn.diasUsg = mIgUsg[2] ? parseInt(mIgUsg[2], 10) : 0;
    }

    var mCcn = dadosPn.match(/(\d{1,2})\s*mm/i);
    if (mCcn) paramsPn.ccnMm = parseFloat(mCcn[1]);

    var mPeso = dadosPn.match(/peso\s*[:=]?\s*(\d+(?:[\.,]\d+)?)/i);
    if (mPeso) paramsPn.pesoPreGestacional = parseFloat(mPeso[1].replace(',', '.'));

    var mAlt = dadosPn.match(/alt(?:ura)?\s*[:=]?\s*(\d+(?:[\.,]\d+)?)/i);
    if (mAlt) paramsPn.altura = parseFloat(mAlt[1].replace(',', '.'));

    var mPesoAtual = dadosPn.match(/peso\s*atual\s*[:=]?\s*(\d+(?:[\.,]\d+)?)/i);
    if (mPesoAtual) paramsPn.pesoAtual = parseFloat(mPesoAtual[1].replace(',', '.'));

    var resumo = ObstetriciaPrenatalService.gerarResumoConsultaPrenatal(paramsPn);
    if (!resumo.sucesso) {
      return { executado: true, resultado: enviarMensagemParaChat(chatId, "⚠️ " + (resumo.erro || "Não foi possível calcular o pré-natal com os dados informados.")) };
    }

    var ckPn = (typeof Utilities !== "undefined" && Utilities.getUuid) ? Utilities.getUuid().replace(/-/g, "") : String(Date.now());
    var cachePn = (typeof uxCache === "function") ? uxCache() : null;
    if (cachePn && typeof safePutCache === "function") safePutCache(cachePn, ckPn, resumo.textoFormatado, 21600);

    return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, "🤰 *AVALIAÇÃO DE PRÉ-NATAL E CRONOLOGIA OBSTÉTRICA:*\n\n```\n" + resumo.textoFormatado + "\n```", {
      inline_keyboard: [
        [{ text: "📋 Copiar Conduta", callback_data: "ux:copiar:" + ckPn }],
        [
          { text: "🔙 Hub G&O", callback_data: "ux:rotina:go" },
          { text: "🏠 Início", callback_data: "ux:hub:inicio" }
        ]
      ]
    }) };
  }

  // Comandos de Centro Obstétrico e Emergências (Pré-parto & Sala de Parto)
  if (comando === "/parto" || comando === "/co" || comando === "/hpp" || comando === "/mgso4" || comando === "/preeclampsia" || comando === "/gbs" || comando === "/prematuridade") {
    var dadosCo = texto.replace(/^\/(parto|co|hpp|mgso4|preeclampsia|gbs|prematuridade)\s*/i, "").trim();

    if (!dadosCo) {
      if (typeof enviarTelaGOParto === "function" && (comando === "/parto" || comando === "/co")) {
        return { executado: true, resultado: enviarTelaGOParto(chatId) };
      }
      if (typeof enviarTelaGOHpp === "function" && comando === "/hpp") {
        return { executado: true, resultado: enviarTelaGOHpp(chatId) };
      }
      if (typeof enviarTelaGOMgso4 === "function" && (comando === "/mgso4" || comando === "/preeclampsia")) {
        return { executado: true, resultado: enviarTelaGOMgso4(chatId) };
      }
      if (typeof enviarTelaGOPrematuridade === "function" && (comando === "/prematuridade" || comando === "/gbs")) {
        return { executado: true, resultado: enviarTelaGOPrematuridade(chatId) };
      }
      var msgAjudaCo = "🏥 *CENTRO OBSTÉTRICO & SALA DE PARTO (PROTOCOLOS DE EMERGÊNCIA)*\n\n" +
        "Envie os achados clínicos ou parâmetros do caso:\n\n" +
        "💡 *Exemplos Práticos:*\n" +
        "• `/parto dil 5cm 3/10 40s lee 0 bcf 140 bolsa integra` *(fase ativa, De Lee, BCF)*\n" +
        "• `/hpp perda 1000ml fc 120 pas 80 has` *(regra dos 4 Ts, Índice de Choque, uterotônicos)*\n" +
        "• `/mgso4 zuspan pa 170x110 cefaleia fr 14 diurese 30` *(Zuspan, hidralazina e vigilância)*\n" +
        "• `/gbs ig 35s bolsa rota 20h sem cultura` *(profilaxia para Streptococcus agalactiae)*\n" +
        "• `/prematuridade ig 29s ameaca parto rpm` *(betametasona, neuroproteção <32s, tocólise e latência)*\n\n" +
        "_Algoritmos estritamente alinhados às diretrizes da FEBRASGO, Ministério da Saúde e ACOG._";
      return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, msgAjudaCo, {
        inline_keyboard: [
          [
            { text: "🏥 Fase Ativa de Parto", callback_data: "ux:go:parto:ativa" },
            { text: "🩸 Protocolo HPP (4 Ts)", callback_data: "ux:go:hpp:atonia" }
          ],
          [
            { text: "⚡ Pré-Eclâmpsia & MgSO4", callback_data: "ux:go:mgso4:zuspan" },
            { text: "👶 Prematuridade & RPMO", callback_data: "ux:go:prematuridade:tpp" }
          ],
          [
            { text: "🔙 Hub G&O", callback_data: "ux:rotina:go" },
            { text: "🏠 Início", callback_data: "ux:hub:inicio" }
          ]
        ]
      }) };
    }

    if (typeof CentroObstetricoService === "undefined") {
      return { executado: true, resultado: enviarMensagemParaChat(chatId, "⚠️ Módulo CentroObstetricoService indisponível temporariamente.") };
    }

    var cenario = {};

    // 1. Parser para Trabalho de Parto (/parto)
    if (comando === "/parto" || comando === "/co" || dadosCo.match(/dil|lee|contrac|bcf/i)) {
      var p = {};
      var mDil = dadosCo.match(/dil(?:atacao)?\s*[:=]?\s*(\d+)/i);
      if (mDil) p.dilatacaoCm = parseInt(mDil[1], 10);

      var mContr = dadosCo.match(/(\d+)\s*\/\s*10/i);
      if (mContr) p.contracoes10min = parseInt(mContr[1], 10);

      var mDur = dadosCo.match(/(\d+)\s*(?:s|seg|segundos)/i);
      if (mDur) p.duracaoContracaoSeg = parseInt(mDur[1], 10);

      var mLee = dadosCo.match(/lee\s*[:=]?\s*([+-]?\d+)/i);
      if (mLee) p.planoDeLee = parseInt(mLee[1], 10);

      var mBcf = dadosCo.match(/bcf\s*[:=]?\s*(\d+)/i);
      if (mBcf) p.bcf = parseInt(mBcf[1], 10);

      if (dadosCo.match(/bolsa\s*rota/i)) p.bolsa = 'rota';
      if (dadosCo.match(/mecon/i)) p.liquidoAmniotico = 'meconio_fluido';

      cenario.parto = p;
    }

    // 2. Parser para HPP (/hpp)
    if (comando === "/hpp" || dadosCo.match(/hpp|hemorrag|perda|sangra/i)) {
      var h = {};
      var mPerda = dadosCo.match(/perda\s*[:=]?\s*(\d+)/i) || dadosCo.match(/(\d+)\s*ml/i);
      if (mPerda) h.perdaEstimadaMl = parseInt(mPerda[1], 10);
      else h.perdaEstimadaMl = 800;

      var mFc = dadosCo.match(/fc\s*[:=]?\s*(\d+)/i);
      if (mFc) h.fc = parseInt(mFc[1], 10);

      var mPas = dadosCo.match(/pas?\s*[:=]?\s*(\d+)/i);
      if (mPas) h.pas = parseInt(mPas[1], 10);

      if (dadosCo.match(/has|hipert|preeclamp|pre-eclamp/i)) h.temHipertensao = true;
      if (dadosCo.match(/cesar/i)) h.tipoParto = 'cesariana';

      cenario.hpp = h;
    }

    // 3. Parser para Hipertensão & MgSO4 (/mgso4 ou /preeclampsia)
    if (comando === "/mgso4" || comando === "/preeclampsia" || dadosCo.match(/pa\s*\d+|zuspan|pritchard|eclamp/i)) {
      var has = {};
      var mPa = dadosCo.match(/pa\s*[:=]?\s*(\d+)\s*[xX\/]\s*(\d+)/i);
      if (mPa) {
        has.pas = parseInt(mPa[1], 10);
        has.pad = parseInt(mPa[2], 10);
      } else {
        has.pas = 160;
        has.pad = 110;
      }

      var mgParams = {};
      if (dadosCo.match(/pritchard/i)) mgParams.esquema = 'Pritchard';
      else mgParams.esquema = 'Zuspan';

      var mFr = dadosCo.match(/fr\s*[:=]?\s*(\d+)/i);
      if (mFr) mgParams.frequenciaRespiratoria = parseInt(mFr[1], 10);

      var mDiur = dadosCo.match(/diur(?:ese)?\s*[:=]?\s*(\d+)/i);
      if (mDiur) mgParams.diureseMlHora = parseInt(mDiur[1], 10);

      if (dadosCo.match(/reflexo\s*ausente|sem\s*reflexo|arreflex/i)) mgParams.reflexoPatelar = false;
      else mgParams.reflexoPatelar = true;

      has.prescreverMgso4 = true;
      has.mgso4Params = mgParams;
      cenario.has = has;
    }

    // 4. Parser para GBS (/gbs)
    if (comando === "/gbs" || dadosCo.match(/gbs|strepto/i)) {
      var g = {};
      if (dadosCo.match(/positi/i)) g.culturaGbs = 'positiva';
      else if (dadosCo.match(/negati/i)) g.culturaGbs = 'negativa';
      else g.culturaGbs = 'desconhecida';

      var mIg = dadosCo.match(/(\d{1,2})\s*s(?:em(?:anas)?)?/i);
      if (mIg) g.igSemanas = parseInt(mIg[1], 10);

      var mRota = dadosCo.match(/bolsa\s*rota\s*(\d+)\s*h/i) || dadosCo.match(/(\d+)\s*h\s*rota/i);
      if (mRota) g.bolsaRotaHoras = parseInt(mRota[1], 10);

      if (dadosCo.match(/alerg(?:ia)?\s*penicil/i)) {
        g.alergiaPenicilina = true;
        if (dadosCo.match(/grave|anafil/i)) g.tipoAlergiaPenicilina = 'anafilaxia';
      }
      cenario.gbs = g;
    }

    // 5. Parser para Prematuridade (/prematuridade)
    if (comando === "/prematuridade" || dadosCo.match(/prematur|rpm|cortico|neuroprot/i)) {
      var prem = {};
      var mIgP = dadosCo.match(/(\d{1,2})\s*s(?:em(?:anas)?)?/i);
      if (mIgP) prem.igSemanas = parseInt(mIgP[1], 10);
      else prem.igSemanas = 30;

      prem.ameacaPartoIminente = true;
      if (dadosCo.match(/rpm/i)) prem.rpmConfirmada = true;
      if (dadosCo.match(/corio|febre|infecc/i)) prem.sinaisCorioamnionite = true;

      cenario.prematuridade = prem;
    }

    var resumo = CentroObstetricoService.gerarResumoCentroObstetrico(cenario);
    var ckCo = (typeof Utilities !== "undefined" && Utilities.getUuid) ? Utilities.getUuid().replace(/-/g, "") : String(Date.now());
    var cacheCo = (typeof uxCache === "function") ? uxCache() : null;
    if (cacheCo && typeof safePutCache === "function") safePutCache(cacheCo, ckCo, resumo.textoFormatado, 21600);

    return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, "🏥 *CONDUTA DE CENTRO OBSTÉTRICO (PRE-PARTO & SALA DE PARTO):*\n\n```\n" + resumo.textoFormatado + "\n```", {
      inline_keyboard: [
        [{ text: "📋 Copiar Conduta", callback_data: "ux:copiar:" + ckCo }],
        [
          { text: "🔙 Hub G&O", callback_data: "ux:rotina:go" },
          { text: "🏠 Início", callback_data: "ux:hub:inicio" }
        ]
      ]
    }) };
  }

  // 3. Ginecologia Ambulatorial (/go, /obstetricia, /ginecologia, /preventivo, /sua, /anticoncepcao, /leucorreia, /corrimento)
  if (comando === "/go" || comando === "/obstetricia" || comando === "/ginecologia" || comando === "/preventivo" || comando === "/sua" || comando === "/anticoncepcao" || comando === "/leucorreia" || comando === "/corrimento") {
    var dadosGin = texto.replace(/^\/\w+\s*/, "").trim();
    if (!dadosGin || comando === "/go" || (comando === "/obstetricia" && !dadosGin)) {
      if (typeof enviarTelaGOPreventivo === "function" && comando === "/preventivo") {
        return { executado: true, resultado: enviarTelaGOPreventivo(chatId) };
      }
      if (typeof enviarTelaGOAnticoncepcao === "function" && comando === "/anticoncepcao") {
        return { executado: true, resultado: enviarTelaGOAnticoncepcao(chatId) };
      }
      if (typeof enviarTelaGOCorrimento === "function" && (comando === "/corrimento" || comando === "/leucorreia")) {
        return { executado: true, resultado: enviarTelaGOCorrimento(chatId) };
      }
      var msgAjudaGin = "🌸🤰 *HUB DE GINECOLOGIA & OBSTETRÍCIA (INTERNATO)*\n" +
        "📅 *Estágio Ativo até 29/11* — Guia Rápido Beira-Leito\n\n" +
        "Selecione uma conduta imediata nos botões abaixo ou envie o caso:\n\n" +
        "• 🤰 *Pré-Natal & DPP:* `/prenatal 12/03/2026` (IG, DUM e exames)\n" +
        "• 🏥 *Parto & Centro Obstétrico:* `/parto 6cm, plano 0, cefalico`\n" +
        "• 🩸 *HPP (4 Ts):* `/hpp perda 1200ml atonia`\n" +
        "• ⚡ *Pré-Eclâmpsia & MgSO4:* `/mgso4 zuspan`\n" +
        "• 👶 *Prematuridade & RPMO:* `/prematuridade 30 semanas`\n" +
        "• 🔬 *Toxoplasmose:* `/toxo igg reagente igm reagente avidez alta`\n" +
        "• 🌸 *Corrimento / Vulvovaginites:* `/corrimento branco grumoso prurido`\n" +
        "• 🩺 *Preventivo / Citopatológico:* `/preventivo lsil 28 anos`\n" +
        "• 💊 *Anticoncepção OMS:* `/anticoncepcao 35 anos enxaqueca com aura`\n" +
        "• 🩹 *DIP & Infecção Pélvica:* `/dip febre dor anexial corrimento purulento`";
      return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, msgAjudaGin, construirTecladoHubGO()) };
    }

    if (typeof GinecologiaAmbulatorialService === "undefined") {
      return { executado: true, resultado: enviarMensagemParaChat(chatId, "⚠️ Módulo GinecologiaAmbulatorialService indisponível temporariamente.") };
    }

    var cenario = {};
    var mIdade = dadosGin.match(/(\d{1,2})\s*a(?:nos)?/i);
    var idadeInformada = mIdade ? parseInt(mIdade[1], 10) : 30;

    // 1. Rastreio de Colo Uterino (/preventivo)
    if (comando === "/preventivo" || comando === "/ginecologia" || dadosGin.match(/preventiv|citolog|laudo|colo|asc|lsil|hsil|agc|biops/i)) {
      var cu = { idade: idadeInformada };
      if (dadosGin.match(/asc-h|asch|asc_h/i)) cu.resultadoCitologia = 'asc_h';
      else if (dadosGin.match(/asc-us|ascus|asc_us/i)) cu.resultadoCitologia = 'asc_us';
      else if (dadosGin.match(/hsil|alto\s*grau|nic\s*2|nic\s*3/i)) cu.resultadoCitologia = 'hsil';
      else if (dadosGin.match(/lsil|baixo\s*grau|nic\s*1/i)) cu.resultadoCitologia = 'lsil';
      else if (dadosGin.match(/agc|agus|glandular/i)) cu.resultadoCitologia = 'agc';
      else if (dadosGin.match(/carcinom|malign/i)) cu.resultadoCitologia = 'carcinoma';
      else if (dadosGin.match(/insatisfat/i)) cu.resultadoCitologia = 'insatisfatorio';
      else if (dadosGin.match(/negat|normal/i)) cu.resultadoCitologia = 'negativo';
      
      if (dadosGin.match(/imuno|hiv/i)) cu.imunossuprimida = true;
      if (dadosGin.match(/histerect/i)) cu.histerectomizadaTotal = true;
      if (dadosGin.match(/gestant/i)) cu.gestante = true;
      if (dadosGin.match(/persist|reincid|2\s*exames/i)) cu.ascUsOuLsilPrevio = true;
      var mNeg = dadosGin.match(/(\d+)\s*negat/i);
      if (mNeg) cu.examesAnterioresNegativos = parseInt(mNeg[1], 10);

      cenario.coloUterino = cu;
    }

    // 2. Sangramento Uterino Anormal (/sua)
    if (comando === "/sua" || dadosGin.match(/sua|sangra|hemorrag|endometr|miom|polip|coagul/i)) {
      var s = { idade: idadeInformada };
      if (dadosGin.match(/gravid|bhcg\s*positi|beta\s*positi/i)) s.betaHcg = 'positivo';
      else if (dadosGin.match(/bhcg\s*negati|beta\s*negati/i)) s.betaHcg = 'negativo';

      if (dadosGin.match(/intens|agud|grave|abundant/i)) s.intensidade = 'grave_aguda';
      else if (dadosGin.match(/leve/i)) s.intensidade = 'leve';
      else s.intensidade = 'moderada';

      if (dadosGin.match(/menopaus/i) || idadeInformada >= 55) s.posMenopausa = true;

      var mEndo = dadosGin.match(/endometrio\s*(\d+(?:[.,]\d+)?)\s*mm/i);
      if (mEndo) s.espessuraEndometrioMm = parseFloat(mEndo[1].replace(',', '.'));

      var et = [];
      if (dadosGin.match(/polip/i)) et.push('polipo');
      if (dadosGin.match(/adenom/i)) et.push('adenomiose');
      if (dadosGin.match(/miom/i)) et.push('mioma');
      if (dadosGin.match(/coagul|vwd/i)) et.push('coagulopatia');
      if (dadosGin.match(/ovulat|sop/i)) et.push('ovulatoria');
      if (dadosGin.match(/diu|iatrog/i)) et.push('iatrogenica');
      s.etiologiasSuspeitas = et;

      cenario.sua = s;
    }

    // 3. Anticoncepção OMS (/anticoncepcao)
    if (comando === "/anticoncepcao" || dadosGin.match(/anticoncep|contracep|diu|pilula|implanon|depoprovera|metodo/i)) {
      var ac = { idade: idadeInformada };
      if (dadosGin.match(/aura/i)) ac.enxaqueca = 'com_aura';
      else if (dadosGin.match(/enxaqueca/i)) ac.enxaqueca = 'sem_aura';

      if (dadosGin.match(/has\s*grave|pa\s*160|descontrol/i)) ac.has = 'grave_descontrolada';
      else if (dadosGin.match(/has|hipertens/i)) ac.has = 'controlada';

      if (dadosGin.match(/fuma|tabag/i)) {
        ac.tabagismo = true;
        var mCig = dadosGin.match(/(\d+)\s*cig/i);
        if (mCig) ac.cigarrosDia = parseInt(mCig[1], 10);
      }

      if (dadosGin.match(/trombos|tvp|tep/i)) ac.historicoTev = true;
      if (dadosGin.match(/trombofil/i)) ac.trombofilia = true;
      if (dadosGin.match(/mama|ca\s*mama/i)) ac.cancerMama = 'atual';
      if (dadosGin.match(/amament|lactac/i)) ac.lactacao = true;
      if (dadosGin.match(/diabet/i)) ac.diabetes = dadosGin.match(/vascul/i) ? 'com_vasculopatia_ou_mais_20anos' : 'sem_vasculopatia';

      cenario.anticoncepcao = ac;
    }

    // 4. Infecções Vulvovaginais (/leucorreia, /corrimento)
    if (comando === "/leucorreia" || comando === "/corrimento" || dadosGin.match(/leucorr|corriment|prurid|grumos|odor|amsel|clue|tricomon|candida|vaginose/i)) {
      var inf = {};
      if (dadosGin.match(/prurid/i)) inf.sintomaPredominante = 'prurido';
      else if (dadosGin.match(/odor|fetid|peixe/i)) inf.sintomaPredominante = 'odor_fetido';

      if (dadosGin.match(/grumo|leite\s*coalhad|branco/i)) inf.aspectoCorrimento = 'grumoso_branco';
      else if (dadosGin.match(/acinzent|fino|homogen/i)) inf.aspectoCorrimento = 'branco_acinzentado_fino';
      else if (dadosGin.match(/amarel|esverde|bolh/i)) inf.aspectoCorrimento = 'amarelo_esverdeado_bolhoso';

      var mPh = dadosGin.match(/ph\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
      if (mPh) inf.phVaginal = parseFloat(mPh[1].replace(',', '.'));

      if (dadosGin.match(/whiff\s*positi|aminas\s*positi/i)) inf.whiffTest = 'positivo';
      else if (dadosGin.match(/whiff\s*negati|aminas\s*negati/i)) inf.whiffTest = 'negativo';

      if (dadosGin.match(/clue|guia/i)) inf.microscopia = 'clue_cells';
      else if (dadosGin.match(/hifa|esporo|levedur/i)) inf.microscopia = 'hifas_esporos';
      else if (dadosGin.match(/protozo|tricomon|flagel/i)) inf.microscopia = 'protozoarios_moveis';

      if (dadosGin.match(/gestant/i)) inf.gestante = true;
      if (dadosGin.match(/recorrent/i)) inf.recorrente = true;
      if (dadosGin.match(/alerg(?:ia)?\s*metro/i)) inf.alergiaMetronidazol = true;

      cenario.infeccao = inf;
    }

    var textoResumo = GinecologiaAmbulatorialService.gerarResumoGinecologia(cenario);
    var ckGin = (typeof Utilities !== "undefined" && Utilities.getUuid) ? Utilities.getUuid().replace(/-/g, "") : String(Date.now());
    var cacheGin = (typeof uxCache === "function") ? uxCache() : null;
    if (cacheGin && typeof safePutCache === "function") safePutCache(cacheGin, ckGin, textoResumo, 21600);

    return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, "🌸 *CONDUTA DE GINECOLOGIA AMBULATORIAL:*\n\n```\n" + textoResumo + "\n```", {
      inline_keyboard: [
        [{ text: "📋 Copiar Conduta", callback_data: "ux:copiar:" + ckGin }],
        [
          { text: "🔙 Hub G&O", callback_data: "ux:rotina:go" },
          { text: "🏠 Início", callback_data: "ux:hub:inicio" }
        ]
      ]
    }) };
  }

  // 4. Doença Inflamatória Pélvica (/dip, /pelvica)
  if (comando === "/dip" || comando === "/pelvica") {
    var dadosDip = texto.replace(/^\/(dip|pelvica)\s*/i, "").trim();
    if (!dadosDip) {
      if (typeof enviarTelaGODip === "function") {
        return { executado: true, resultado: enviarTelaGODip(chatId) };
      }
      var msgAjudaDip = "🩹 *DOENÇA INFLAMATÓRIA PÉLVICA (DIP) & ATO*\n\n" +
        "Envie os achados clínicos ou parâmetros do caso:\n\n" +
        "💡 *Exemplos Práticos:*\n" +
        "• `/dip dor hipogastrio febre 38.5 mobilizacao colo positiva` *(Monif I ambulatorial)*\n" +
        "• `/dip dor anexial peritonite abscesso 6cm diu presente` *(Monif II-III hospitalar)*\n" +
        "• `/dip parceiro sexual gonococo clamidia` *(protocolo de contatos)*\n\n" +
        "_Algoritmos estritamente alinhados ao Ministério da Saúde (PCDT ISTs) e CDC._";
      return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, msgAjudaDip, {
        inline_keyboard: [
          [
            { text: "🩹 DIP Ambulatorial", callback_data: "ux:go:dip:monif1" },
            { text: "🏥 DIP Hospitalar", callback_data: "ux:go:dip:hospitalar" }
          ],
          [
            { text: "🔙 Hub G&O", callback_data: "ux:rotina:go" },
            { text: "🏠 Início", callback_data: "ux:hub:inicio" }
          ]
        ]
      }) };
    }

    if (typeof DipAbscessoTuboOvarianoService === "undefined") {
      return { executado: true, resultado: enviarMensagemParaChat(chatId, "⚠️ Módulo DipAbscessoTuboOvarianoService indisponível temporariamente.") };
    }

    var paramsDip = {
      dorHipogastrio: true,
      dorPalpacaoAnexial: true,
      dorMobilizacaoColo: true,
      febre: dadosDip.match(/febre|38/i) ? true : false,
      leucocitose: dadosDip.match(/leucocit|hemograma/i) ? true : false,
      peritonitePelvica: dadosDip.match(/periton|blumberg|descompress/i) ? true : false,
      abscessoTuboOvariano: dadosDip.match(/abscess|ato|massa/i) ? true : false,
      diuPresente: dadosDip.match(/diu/i) ? true : false
    };
    var avaliacaoDip = DipAbscessoTuboOvarianoService.avaliarDipCompleto(paramsDip);
    var textoResumoDip = DipAbscessoTuboOvarianoService.gerarResumoDip(avaliacaoDip);
    var ckDip = (typeof Utilities !== "undefined" && Utilities.getUuid) ? Utilities.getUuid().replace(/-/g, "") : String(Date.now());
    var cacheDip = (typeof uxCache === "function") ? uxCache() : null;
    if (cacheDip && typeof safePutCache === "function") safePutCache(cacheDip, ckDip, textoResumoDip, 21600);

    return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, "🩹 *CONDUTA DE DOENÇA INFLAMATÓRIA PÉLVICA (DIP):*\n\n```\n" + textoResumoDip + "\n```", {
      inline_keyboard: [
        [{ text: "📋 Copiar Conduta", callback_data: "ux:copiar:" + ckDip }],
        [
          { text: "🔙 Hub G&O", callback_data: "ux:rotina:go" },
          { text: "🏠 Início", callback_data: "ux:hub:inicio" }
        ]
      ]
    }) };
  }

  // 5. RCF / Doppler Fetal (/rcf, /ciur, /rciu, /doppler, /crescimentofetal)
  if (comando === "/rcf" || comando === "/ciur" || comando === "/rciu" || comando === "/doppler" || comando === "/crescimentofetal") {
    var dadosRcf = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof ObstetriciaRcfDopplerService === "undefined") {
      return { executado: true, resultado: enviarMensagemParaChat(chatId, "⚠️ Módulo ObstetriciaRcfDopplerService indisponível temporariamente.") };
    }

    var paramsRcf = dadosRcf ? ObstetriciaRcfDopplerService.extrairParametrosTexto(dadosRcf) : {};
    if (!dadosRcf || paramsRcf.ig_semanas === undefined) {
      return { executado: true, resultado: enviarMensagemParaChat(chatId, "🤰 *OBSTETRÍCIA & MEDICINA FETAL — RCF / DOPPLER*\n\n" +
        "Envie a *idade gestacional* (obrigatória) e os percentis do laudo:\n" +
        "• *IG:* `30s4d`, `30+4` ou `ig 30`\n" +
        "• *Biometria:* `pfe p2` (peso fetal), `ca p4` (circunferência abdominal), `1450g`, `queda de percentil`\n" +
        "• *Artéria umbilical:* `au p97`, `diastole zero`, `diastole reversa`\n" +
        "• *ACM / RCP / Uterinas:* `acm p3`, `rcp p2` (ou `ip au 1.3 ip acm 1.1`), `uterinas p97`\n" +
        "• *Ducto venoso:* `dv p97`, `onda a reversa` / `onda a ausente`; *Istmo:* `istmo reverso`\n" +
        "• *cCTG:* `vcp 2.8`, `desaceleracoes`; *Outros:* `ila 4`, `pre-eclampsia`, `gemelar`\n\n" +
        "*Exemplos:*\n" +
        "• `/rcf 35+2 pfe p6 rcp p3` *(RCF tardia — Estágio I)*\n" +
        "• `/rcf 31s pfe p2 diastole zero` *(Estágio II)*\n" +
        "• `/doppler 27s3d pfe p1 diastole reversa onda a reversa vcp 2.4` *(Estágio IV)*") };
    }

    try {
      var analiseRcf = ObstetriciaRcfDopplerService.avaliarRcf(paramsRcf);
      return { executado: true, resultado: enviarMensagemParaChat(chatId, ObstetriciaRcfDopplerService.formatarTextoTelegram(analiseRcf)) };
    } catch (eRcf) {
      return { executado: true, resultado: enviarMensagemParaChat(chatId, "⚠️ Erro ao avaliar RCF/Doppler: " + eRcf.message) };
    }
  }

  // 6. Colestase Gestacional (CIG) e EHAG / Swansea (/colestase, /cig, /icp, /swansea, /ehag, /aflp)
  if (comando === "/colestase" || comando === "/cig" || comando === "/icp" || comando === "/swansea" || comando === "/ehag" || comando === "/aflp") {
    var dadosCig = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof HepatologiaColestaseGestacionalService === "undefined") {
      return { executado: true, resultado: enviarMensagemParaChat(chatId, "⚠️ Módulo HepatologiaColestaseGestacionalService indisponível temporariamente.") };
    }

    var paramsCig = dadosCig ? HepatologiaColestaseGestacionalService.extrairParametrosTexto(dadosCig) : {};

    if ((comando === "/swansea" || comando === "/ehag" || comando === "/aflp") && (!dadosCig || Object.keys(paramsCig).length === 0)) {
      return { executado: true, resultado: enviarMensagemParaChat(chatId, "🟡 *ESTEATOSE HEPÁTICA AGUDA DA GESTAÇÃO (EHAG / SWANSEA)*\n\n" +
        "Envie os achados clínicos e laboratoriais (mínimo 6 critérios para confirmação):\n" +
        "• *Clínicos:* `vomitos`, `dor abdominal`, `polidipsia/poliuria`, `encefalopatia`\n" +
        "• *Laboratório:* `hipoglicemia` (<72), `bilirrubina` (>0.8), `acido urico` (>5.7), `leucocitose` (>11k), `tgo/tgp` (>42), `amonia` (>47), `insuficiencia renal` (cr >1.7), `coagulopatia` (TP>14s ou TTPa>34s)\n" +
        "• *Imagem/Biópsia:* `ascite/usg brilhante`, `esteatose biopsia`\n\n" +
        "*Exemplo:* `/swansea vomitos dor abdominal hipoglicemia coagulopatia tgo 250 bilirrubina 3.5 creatinina 1.9`") };
    }

    if (!dadosCig || (paramsCig.acidos_biliares === undefined && (!paramsCig.swansea || paramsCig.modo !== 'EHAG'))) {
      return { executado: true, resultado: enviarMensagemParaChat(chatId, "🤰 *HEPATOLOGIA OBSTÉTRICA — COLESTASE (CIG) & EHAG*\n\n" +
        "Envie a dosagem de *Ácidos Biliares Totais (ABT)*, idade gestacional e peso:\n" +
        "• *ABT séricos (mcmol/L):* `abt 45` ou `acidos biliares 120`\n" +
        "• *Idade Gestacional:* `34s`, `36+2` ou `ig 36`\n" +
        "• *Peso materno:* `68kg` ou `peso 70` (para cálculo exato de UDCA 10-15 mg/kg)\n" +
        "• *Outros:* `prurido`, `tgo 120`, `tgp 95`, `bilirrubina 1.8`, `gemelar`, `antecedente cig`\n\n" +
        "*Exemplos:*\n" +
        "• `/cig abt 25 34s peso 65` *(CIG leve — parto 38-39s)*\n" +
        "• `/colestase abt 110 ig 35s peso 72` *(CIG grave — risco óbito fetal, parto 36s)*\n" +
        "• `/swansea vomitos dor hipoglicemia coagulopatia tgo 300 encefalopatia` *(EHAG)*") };
    }

    try {
      var analiseCig = HepatologiaColestaseGestacionalService.avaliar(paramsCig);
      return { executado: true, resultado: enviarMensagemParaChat(chatId, HepatologiaColestaseGestacionalService.formatarTextoTelegram(analiseCig)) };
    } catch (eCig) {
      return { executado: true, resultado: enviarMensagemParaChat(chatId, "⚠️ Erro ao avaliar Colestase/EHAG: " + eCig.message) };
    }
  }

  // 7. Toxoplasmose Gestacional (/toxo, /toxoplasmose, /avidez)
  if (comando === "/toxo" || comando === "/toxoplasmose" || comando === "/avidez") {
    var dadosToxo = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof ObstetriciaToxoplasmoseService === "undefined") {
      return { executado: true, resultado: enviarMensagemParaChat(chatId, "⚠️ Módulo ObstetriciaToxoplasmoseService indisponível temporariamente.") };
    }

    var paramsToxo = dadosToxo ? ObstetriciaToxoplasmoseService.extrairParametrosTexto(dadosToxo) : {};
    
    if (!dadosToxo || (paramsToxo.igg === null && paramsToxo.igm === null && paramsToxo.pcr_amniotico === null)) {
      if (typeof enviarTelaGOToxo === "function") {
        return { executado: true, resultado: enviarTelaGOToxo(chatId) };
      }
      return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, "🦠 *INFECTOLOGIA OBSTÉTRICA — TOXOPLASMOSE*\n\n" +
        "Envie os resultados da sorologia e a idade gestacional atual:\n" +
        "• *Sorologia:* `igg positivo`, `igm positivo`\n" +
        "• *Teste de Avidez:* `avidez alta`, `avidez baixa`, `avidez pendente`\n" +
        "• *IG Atual:* `12s`, `ig 12`\n" +
        "• *IG da Coleta:* `coleta 8s` (importante se diferir da atual)\n" +
        "• *Diagnóstico Fetal:* `pcr positivo`, `usg alterado`\n\n" +
        "*Exemplos:*\n" +
        "• `/toxo igg positivo igm positivo avidez alta coleta 10s` *(Infecção prévia)*\n" +
        "• `/toxo 16s igg positivo igm positivo avidez baixa` *(Infecção aguda, baixa avidez)*\n" +
        "• `/toxo 20s igg positivo igm positivo pcr la positivo` *(Infecção fetal confirmada)*", {
        inline_keyboard: [
          [
            { text: "🔬 1º Tri Avidez Baixa (Aguda)", callback_data: "ux:go:toxo:aguda" },
            { text: "✅ 1º Tri Avidez Alta (Prévia)", callback_data: "ux:go:toxo:previa" }
          ],
          [
            { text: "💊 PCR+ (Esquema Tríplice)", callback_data: "ux:go:toxo:fetal" }
          ],
          [
            { text: "🔙 Hub G&O", callback_data: "ux:rotina:go" },
            { text: "🏠 Início", callback_data: "ux:hub:inicio" }
          ]
        ]
      }) };
    }

    try {
      var analiseToxo = ObstetriciaToxoplasmoseService.avaliar(paramsToxo);
      var textoResumoToxo = ObstetriciaToxoplasmoseService.formatarTextoTelegram(analiseToxo);
      var ckToxo = (typeof Utilities !== "undefined" && Utilities.getUuid) ? Utilities.getUuid().replace(/-/g, "") : String(Date.now());
      var cacheToxo = (typeof uxCache === "function") ? uxCache() : null;
      if (cacheToxo && typeof safePutCache === "function") safePutCache(cacheToxo, ckToxo, textoResumoToxo, 21600);

      return { executado: true, resultado: enviarMensagemComTecladoParaChat(chatId, "🔬 *AVALIAÇÃO DE TOXOPLASMOSE GESTACIONAL:*\n\n```\n" + textoResumoToxo + "\n```", {
        inline_keyboard: [
          [{ text: "📋 Copiar Conduta", callback_data: "ux:copiar:" + ckToxo }],
          [
            { text: "🔙 Hub G&O", callback_data: "ux:rotina:go" },
            { text: "🏠 Início", callback_data: "ux:hub:inicio" }
          ]
        ]
      }) };
    } catch (eToxo) {
      return { executado: true, resultado: enviarMensagemParaChat(chatId, "⚠️ Erro ao avaliar Toxoplasmose: " + eToxo.message) };
    }
  }

  return { executado: false };
}


var TABELA_COMANDOS_ESPECIALIDADES_ = {
  "/aciclovir": true, "/aga": true, "/agitacao": true, "/anemia": true, "/antifosfolipidio": true,
  "/arbovirose": true, "/artriteseptica": true, "/artriteséptica": true, "/artrocentese": true, "/aslo": true,
  "/asma": true, "/beers": true, "/biett": true, "/bipap": true, "/broncoespasmo": true,
  "/bronquiolite": true, "/bronquioliteviral": true, "/bva": true, "/calculorenal": true, "/cancro": true,
  "/cefaleia": true, "/cfs": true, "/chascore": true, "/chikungunya": true, "/cistite": true,
  "/cnaf": true, "/colica": true, "/colicanefretica": true, "/crb65": true, "/criseasma": true, "/crisehas": true,
  "/crisehipertensiva": true, "/curb": true, "/curb65": true, "/declaracaoobito": true, "/dengue": true, "/dermato": true, "/diabetes": true,
  "/dienogeste": true, "/diluicao": true, "/do": true, "/donovanose": true, "/dorcabeca": true,
  "/dorpelvica": true, "/dpoc": true, "/ef": true, "/ef_neuro": true, "/ehh": true,
  "/emergenciahipertensiva": true, "/endometriose": true, "/enoxaparina": true, "/enxaqueca": true, "/epistaxe": true,
  "/exames": true, "/exames_especiais": true, "/fa": true, "/febrereumatica": true, "/ferimento": true,
  "/ferro": true, "/fibrilacaoatrial": true, "/formulainfantil": true, "/fr": true, "/framingham": true,
  "/frax": true, "/frids": true, "/ganzoni": true, "/glaucoma": true, "/glicemia": true,
  "/gota": true, "/hasbled": true, "/hemograma": true, "/herpes": true, "/hints": true,
  "/hipercapnia": true, "/holliday": true, "/icc": true, "/idoso": true, "/infeccaourinaria": true,
  "/insuficienciacardiaca": true, "/insulina": true, "/itu": true, "/jones": true, "/lesao": true,
  "/lesoes": true, "/lgv": true, "/litiase": true, "/mentzer": true, "/minicog": true,
  "/monkeypox": true, "/monoartrite": true, "/mordedura": true, "/mpox": true, "/neuro": true,
  "/noripurum": true, "/notificacao": true, "/nutriped": true, "/obito": true, "/oftalmo": true,
  "/osteoporose": true, "/ottawa": true, "/pac": true, "/pals": true, "/pediatria_pcr": true,
  "/pedranorim": true, "/pele": true, "/phq9": true, "/pielonefrite": true, "/pneumonia": true,
  "/polifarmacia": true, "/pseudocrise": true, "/psiq": true, "/quarteto": true, "/quedas": true,
  "/queimaduraocular": true, "/raiva": true, "/roseola": true, "/saf": true, "/safgestante": true,
  "/salbutamol": true, "/sangramentonasal": true, "/sifilis": true, "/sinan": true, "/suicidio": true,
  "/sutura": true, "/tamponamento": true, "/tetano": true, "/tontura": true, "/traumaocular": true,
  "/trombofilia": true, "/trombofiliagestante": true, "/tug": true, "/ulceragenital": true, "/valaciclovir": true,
  "/vertigem": true, "/vni": true, "/vppb": true, "/zika": true, "/zoster": true
};

function despacharComandosEspecialidadesClinicas_(comando, texto, chatId) {
  if (!TABELA_COMANDOS_ESPECIALIDADES_[comando] && !comando.startsWith("/ef_")) {
    return { executado: false };
  }
  var res = executarComandoEspecialidadesInterno_(comando, texto, chatId);
  return { executado: true, resultado: res };
}

function executarComandoEspecialidadesInterno_(comando, texto, chatId) {
  if (comando === "/ef" || comando === "/exames" || comando === "/exames_especiais") {
    return enviarMenuExamesEspeciais(chatId);
  }
  if (comando === "/ef_neuro" || comando === "/neuro") {
    return responderComGuiaExameFisico(chatId, "neuro");
  }
  if (comando.startsWith("/ef_")) {
    var subTipoEf = comando.replace(/^\/ef_/, "").trim();
    if (subTipoEf) {
      return responderComGuiaExameFisico(chatId, subTipoEf);
    }
    return enviarMenuExamesEspeciais(chatId);
  }
  // ───────────────────────────────────────────────────────────────────────────
  // SAÚDE DO IDOSO E AVALIAÇÃO GERIÁTRICA AMPLA (AGA)
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/idoso" || comando === "/aga" || comando === "/beers" || comando === "/cfs") {
    var dadosIdoso = texto.replace(/^\/\w+\s*/, "").trim();
    if (!dadosIdoso) {
      return enviarMensagemParaChat(chatId, "👴 *MÓDULO DE SAÚDE DO IDOSO & AGA*\n\n" +
        "Envie os achados para avaliação estruturada:\n" +
        "• `/cfs 6` *(Triagem de Fragilidade CFS)*\n" +
        "• `/beers omeprazol clonazepam amitriptilina metformina aas` *(Polifarmácia)*\n" +
        "• `/frax mulher 68 anos, 58kg, 155cm, fratura previa, corticoide, tscore -2.6` *(Calculadora FRAX)*\n" +
        "• `/osteoporose 72 anos, tscore -2.8, clcr 28, sem fratura` *(Manejo de Osteoporose)*\n" +
        "• `/quedas 82 anos, 3 quedas, usa clonazepam, doxazosina` *(Profilaxia de Quedas)*\n" +
        "• `/aga cfs 5, usa zolpidem, ibuprofeno, losartana, aas, atenolol` *(AGA Completa)*");
    }

    if (typeof SaudeIdosoService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo SaudeIdosoService indisponível temporariamente.");
    }

    var cenario = {};

    // CFS
    if (comando === "/cfs" || dadosIdoso.match(/cfs\s*(\d)/i)) {
      var mCfs = dadosIdoso.match(/cfs\s*(\d)/i) || texto.match(/\/cfs\s+(\d)/);
      if (mCfs) cenario.cfs = { score: parseInt(mCfs[1], 10) };
    }
    // Mini-Cog
    if (comando === "/minicog" || dadosIdoso.match(/minicog|mini-cog/i)) {
      var mPalavras = dadosIdoso.match(/(\d)\s*palavra/i);
      var mRelogioNormal = dadosIdoso.match(/relogio\s*normal/i);
      var mRelogioAlt = dadosIdoso.match(/relogio\s*(alterado|anormal|errado)/i);
      var palavras = mPalavras ? parseInt(mPalavras[1], 10) : 3;
      var relogioNormal = true;
      if (mRelogioAlt) relogioNormal = false;
      cenario.miniCog = { palavras: palavras, relogioNormal: relogioNormal };
    }
    // TUG
    if (comando === "/tug" || dadosIdoso.match(/tug/i)) {
      var mTug = dadosIdoso.match(/tug\s*(\d+)/i) || texto.match(/\/tug\s+(\d+)/);
      if (mTug) cenario.tug = { tempo: parseInt(mTug[1], 10) };
    }
    // Beers / Polifarmacia
    if (comando === "/beers" || dadosIdoso.match(/beers|polifarm/i)) {
      var pLista = dadosIdoso.replace(/beers|polifarmacia|aga|cfs\s*\d|minicog.*|tug\s*\d+/gi, "").split(/[,;e]/).map(function(s){return s.trim();}).filter(function(s){return s.length > 2;});
      if (pLista.length > 0) cenario.farmacos = { lista: pLista };
    }

    // Se nenhum regex extraiu, assume modo completo (fallback)
    if (Object.keys(cenario).length === 0) {
      if (comando === "/beers") {
        var bs = dadosIdoso.split(/[,;e]/).map(function(s){return s.trim();}).filter(function(s){return s.length > 2;});
        if (bs.length > 0) cenario.farmacos = { lista: bs };
      }
    }

    if (Object.keys(cenario).length > 0) {
      var resumoIdoso = SaudeIdosoService.gerarResumoAga(cenario);
      var arrStr = [];
      if (resumoIdoso.fragilidade) {
        arrStr.push("👴 *FRAGILIDADE (CFS):* " + resumoIdoso.fragilidade.escore + " - " + resumoIdoso.fragilidade.classificacao + "\n" + (resumoIdoso.fragilidade.alerta_fragilidade ? "🚨 " : "✅ ") + resumoIdoso.fragilidade.interpretacao);
      }
      if (resumoIdoso.cognicao) {
        arrStr.push("🧠 *COGNITIVO (Mini-Cog):* Escore " + resumoIdoso.cognicao.escore_total + "\n" + (resumoIdoso.cognicao.rastreio_positivo ? "🚨 " : "✅ ") + resumoIdoso.cognicao.interpretacao);
      }
      if (resumoIdoso.risco_quedas) {
        arrStr.push("🚶 *RISCO DE QUEDAS (TUG):* " + resumoIdoso.risco_quedas.tempo_segundos + "s - " + resumoIdoso.risco_quedas.classificacao + "\n" + (resumoIdoso.risco_quedas.risco_alto ? "🚨 " : "✅ ") + resumoIdoso.risco_quedas.conduta);
      }
      if (resumoIdoso.farmacologia) {
        var strFarm = "💊 *POLIFARMÁCIA E BEERS:*\n" +
                      "Total de fármacos: " + resumoIdoso.farmacologia.quantidade_medicamentos + "\n" +
                      "Polifarmácia: " + (resumoIdoso.farmacologia.polifarmacia ? "Sim" : "Não");
        if (resumoIdoso.farmacologia.alertas_beers) {
          strFarm += "\n🚨 *ALERTA (PIMs)*:\n" + resumoIdoso.farmacologia.medicamentos_inadequados.map(function(m){return "• " + m.medicamento + ": " + m.alerta;}).join("\n");
        }
        strFarm += "\nConduta: " + resumoIdoso.farmacologia.conduta;
        arrStr.push(strFarm);
      }

      return enviarMensagemParaChat(chatId, "📊 *RESUMO DA AVALIAÇÃO GERIÁTRICA AMPLA (AGA)*\n\n" + arrStr.join("\n\n"));
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CALCULADORA FRAX (BRASIL / ABRASSO / NOGG)
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/frax") {
    var dadosFrax = texto.replace(/^\/\w+\s*/, "").trim();
    if (!dadosFrax) {
      return enviarMensagemParaChat(chatId, "🦴 *CALCULADORA FRAX (BRASIL / ABRASSO / NOGG)*\n\n" +
        "Estima a probabilidade de fratura por fragilidade em 10 anos.\n\n" +
        "Envie os achados clínicos:\n" +
        "• `/frax mulher 68 anos, 58kg, 155cm, fratura previa, corticoide, t-score -2.6`\n" +
        "• `/frax homem 75 anos, 70kg, 172cm, tabagismo, sem fratura`\n" +
        "• `/frax mulher 62 anos, 52kg, 160cm, pais com fratura de quadril, etilismo`");
    }
    if (typeof SaudeIdosoService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo SaudeIdosoService indisponível temporariamente.");
    }
    var resFrax = SaudeIdosoService.interpretarTextoLivreFrax(dadosFrax);
    var emojiRisco = resFrax.categoria_risco.includes("MUITO ALTO") ? "🚨" : (resFrax.categoria_risco.includes("ALTO") ? "⚠️" : (resFrax.categoria_risco.includes("INTERMEDIÁRIO") ? "🟡" : "✅"));
    var msgFrax = "🦴 *CALCULADORA FRAX (BRASIL / ABRASSO)*\n\n" +
      "👤 *Perfil:* " + resFrax.sexo + ", " + resFrax.idade + " anos | IMC: " + resFrax.imc + " kg/m²" + (resFrax.tem_dmo ? " | T-Score Colo: " + resFrax.t_score_colo_femur : " | Sem DMO") + "\n\n" +
      "📊 *PROBABILIDADE DE FRATURA EM 10 ANOS:*\n" +
      "• *Fratura Osteoporótica Maior (MOF):* " + resFrax.risco_fratura_maior_pct + "%\n" +
      "• *Fratura de Quadril:* " + resFrax.risco_fratura_quadril_pct + "%\n" +
      "• *Estratificação:* " + emojiRisco + " *" + resFrax.categoria_risco + "*\n\n" +
      "💊 *Conduta Farmacológica:* " + (resFrax.indicacao_tratamento_farmacologico ? "INDICADA" : (resFrax.necessidade_dmo ? "Solicitar DMO para reclassificação" : "Não indicada no momento")) + "\n" +
      "• " + resFrax.conduta;
    if (resFrax.alertas && resFrax.alertas.length > 0) {
      msgFrax += "\n\n⚠️ *Alertas:*\n" + resFrax.alertas.join("\n");
    }
    msgFrax += "\n\n🏥 *CONDUTA BEIRA-LEITO / UBS:*\n" + resFrax.conduta_beira_leito.map(function(c){return "• " + c;}).join("\n");
    msgFrax += "\n\n📋 *CRITÉRIOS DE ENCAMINHAMENTO AO ESPECIALISTA:*\n" + resFrax.criterios_encaminhamento_especialista.map(function(c){return "• " + c;}).join("\n");
    return enviarMensagemParaChat(chatId, msgFrax);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MANEJO DE OSTEOPOROSE & ANTIRREABSORTIVOS
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/osteoporose") {
    var dadosOsteo = texto.replace(/^\/\w+\s*/, "").trim();
    if (!dadosOsteo) {
      return enviarMensagemParaChat(chatId, "🦴 *PROTOCOLO DE OSTEOPOROSE & ANTIRREABSORTIVOS*\n\n" +
        "Envie os achados clínicos e laboratoriais:\n" +
        "• `/osteoporose 72 anos, tscore -2.8, clcr 28, sem fratura`\n" +
        "• `/osteoporose 68 anos, tscore -3.1, calcio 7.8, vit D 14`\n" +
        "• `/osteoporose 75 anos, fratura de fragilidade, esofagite grave`\n" +
        "• `/osteoporose 80 anos, tscore -2.7, 5 anos de alendronato`");
    }
    if (typeof SaudeIdosoService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo SaudeIdosoService indisponível temporariamente.");
    }
    var resOsteo = SaudeIdosoService.interpretarTextoLivreOsteoporose(dadosOsteo);
    var msgO = "🦴 *MANEJO DE OSTEOPOROSE & ANTIRREABSORTIVOS*\n\n" +
      "📋 *Diagnóstico Densitométrico:* *" + resOsteo.classificacao_diagnostica + "*\n" +
      "💊 *Tratamento Farmacológico:* " + (resOsteo.indicacao_tratamento ? "INDICADO" : "NÃO INDICADO") + "\n\n" +
      "🎯 *Esquema Recomendado:*\n" + resOsteo.esquema_recomendado;
    if (resOsteo.alternativas && resOsteo.alternativas.length > 0) {
      msgO += "\n\n🔄 *Alternativas / Detalhes:*\n" + resOsteo.alternativas.map(function(a){return "• " + a;}).join("\n");
    }
    if (resOsteo.bloqueios_seguranca && resOsteo.bloqueios_seguranca.length > 0) {
      msgO += "\n\n🚨 *BLOQUEIOS DE SEGURANÇA MANDATÓRIOS:*\n" + resOsteo.bloqueios_seguranca.join("\n\n");
    }
    if (resOsteo.alertas && resOsteo.alertas.length > 0) {
      msgO += "\n\n⚠️ *Alertas Clínicos:*\n" + resOsteo.alertas.join("\n");
    }
    msgO += "\n\n🥛 *Cálcio e Vitamina D:*\n" +
      "• " + resOsteo.protocolo_vitamina_d + "\n" +
      resOsteo.protocolo_calcio.map(function(c){return "• " + c;}).join("\n");
    msgO += "\n\n📝 *Orientações de Tomada do Alendronato:*\n" + resOsteo.orientacoes_ingestao_alendronato.map(function(o){return "• " + o;}).join("\n");
    msgO += "\n\n📋 *Critérios de Encaminhamento ao Especialista:*\n" + resOsteo.criterios_encaminhamento_especialista.map(function(e){return "• " + e;}).join("\n");
    return enviarMensagemParaChat(chatId, msgO);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PROFILAXIA DE QUEDAS & REVISÃO DE POLIFARMÁCIA (FRIDs)
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/quedas" || comando === "/polifarmacia" || comando === "/frids") {
    var dadosQuedas = texto.replace(/^\/\w+\s*/, "").trim();
    if (!dadosQuedas) {
      return enviarMensagemParaChat(chatId, "🚶 *PROFILAXIA DE QUEDAS & REVISÃO DE POLIFARMÁCIA (FRIDs)*\n\n" +
        "Envie os achados para avaliação de risco:\n" +
        "• `/quedas 82 anos, 3 quedas, tug 18s, usa clonazepam, doxazosina, furosemida, citalopram`\n" +
        "• `/polifarmacia zolpidem, amitriptilina, losartana, hidroclorotiazida, omeprazol`\n" +
        "• `/quedas 76 anos, cfs 5, tontura ao levantar, usa pregabalina, quetiapina`");
    }
    if (typeof SaudeIdosoService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo SaudeIdosoService indisponível temporariamente.");
    }
    if (comando === "/polifarmacia" || comando === "/frids") {
      var listaMeds = dadosQuedas.split(/[,;e\n]/).map(function(s){return s.trim();}).filter(function(s){return s.length > 2;});
      var resPolifarm = SaudeIdosoService.revisarPolifarmaciaQuedas(listaMeds);
      var msgP = "💊 *REVISÃO DE POLIFARMÁCIA & DROGAS DE RISCO DE QUEDAS (FRIDs)*\n\n" +
        "Total analisado: " + resPolifarm.total_medicamentos_analisados + " fármacos\n" +
        "Carga de Risco: " + (resPolifarm.alerta_critico ? "🚨 " : "⚠️ ") + "*" + resPolifarm.carga_risco_quedas + "*\n\n";
      if (resPolifarm.drogas_hipotensao_ortostatica.length > 0) {
        msgP += "📉 *Drogas com Risco de Hipotensão Ortostática:*\n" + resPolifarm.drogas_hipotensao_ortostatica.map(function(d){return "• " + d.medicamento + " (" + d.classe + ")";}).join("\n") + "\n\n";
      }
      if (resPolifarm.drogas_prolongamento_qt.length > 0) {
        msgP += "⚡ *Drogas com Risco de Prolongamento de QT:*\n" + resPolifarm.drogas_prolongamento_qt.map(function(d){return "• " + d.medicamento + " (" + d.classe + ")";}).join("\n") + "\n\n";
      }
      if (resPolifarm.drogas_sedativas_ataxia.length > 0) {
        msgP += "💤 *Sedativos, Relaxantes Musculares e Depressores do SNC:*\n" + resPolifarm.drogas_sedativas_ataxia.map(function(d){return "• " + d.medicamento + " (" + d.classe + ")";}).join("\n") + "\n\n";
      }
      msgP += "💡 *Recomendações Práticas de Desprescrição:*\n" + resPolifarm.recomendacoes_desprescricao.map(function(r){return "• " + r;}).join("\n");
      return enviarMensagemParaChat(chatId, msgP);
    }

    var resQuedas = SaudeIdosoService.interpretarTextoLivreQuedas(dadosQuedas);
    var emojiQ = resQuedas.nivel_risco.includes("ALTO") ? "🚨" : (resQuedas.nivel_risco.includes("Moderado") ? "⚠️" : "✅");
    var msgQ = "🚶 *PROFILAXIA DE QUEDAS & AVALIAÇÃO DE MOBILIDADE*\n\n" +
      "Estratificação: " + emojiQ + " *" + resQuedas.nivel_risco + "*\n" +
      (resQuedas.justificativas.length > 0 ? "Fatores: " + resQuedas.justificativas.join("; ") + "\n\n" : "\n") +
      "💊 *Auditoria Farmacológica (FRIDs):* " + resQuedas.analise_medicamentosa.carga_risco_quedas + " (" + resQuedas.analise_medicamentosa.total_frids_detectados + " drogas detectadas)\n\n" +
      "🏥 *AÇÕES BEIRA-LEITO / UBS:*\n" + resQuedas.acoes_beira_leito.map(function(a){return "• " + a;}).join("\n") + "\n\n" +
      "📋 *CRITÉRIOS DE ENCAMINHAMENTO AO ESPECIALISTA:*\n" + resQuedas.criterios_encaminhamento_especialista.map(function(e){return "• " + e;}).join("\n");
    return enviarMensagemParaChat(chatId, msgQ);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PSIQUIATRIA DE URGÊNCIA & SAÚDE MENTAL (ABP / MS / APA / NICE)
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/psiq" || comando === "/agitacao" || comando === "/suicidio" || comando === "/phq9") {
    var dadosPsiq = texto.replace(/^\/\w+\s*/, "").trim();
    if (!dadosPsiq) {
      return enviarMensagemParaChat(chatId, "🧠 *MÓDULO DE PSIQUIATRIA DE URGÊNCIA & SAÚDE MENTAL*\n\n" +
        "Envie os achados para avaliação clínica estruturada:\n" +
        "• `/agitacao grave, agressivo, recusa VO, psicose` *(Contenção Farmacológica)*\n" +
        "• `/suicidio ideacao ativa, plano estruturado, tentativa previa` *(Estratificação C-SSRS)*\n" +
        "• `/phq9 3,3,2,3,2,3,2,2,2 cardiopata` *(Rastreio Depressão e Fármaco Dirigido)*\n" +
        "• `/psiq idoso 78a, delirium, agitado, dor cronica` *(Avaliação Integrada)*");
    }

    if (typeof PsiquiatriaUrgenciaService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo PsiquiatriaUrgenciaService indisponível temporariamente.");
    }

    var cenarioPsiq = {
      textoOriginal: dadosPsiq
    };

    var tLower = dadosPsiq.toLowerCase();

    // Extração de parâmetros
    if (tLower.includes("grave") || tLower.includes("extrema") || tLower.includes("agress")) cenarioPsiq.gravidade = "grave";
    else if (tLower.includes("modera")) cenarioPsiq.gravidade = "moderada";
    else if (tLower.includes("leve")) cenarioPsiq.gravidade = "leve";

    if (tLower.includes("recusa vo") || tLower.includes("recusa oral") || tLower.includes("nao aceita vo") || tLower.includes("im")) {
      cenarioPsiq.aceitaViaOral = false;
      cenarioPsiq.viaPreferencial = "im";
    } else if (tLower.includes("aceita vo") || tLower.includes("via oral")) {
      cenarioPsiq.aceitaViaOral = true;
      cenarioPsiq.viaPreferencial = "oral";
    }

    if (tLower.includes("abstin") || tLower.includes("alcool") || tLower.includes("etil")) cenarioPsiq.etiologia = "abstinencia_alcoolica";
    else if (tLower.includes("estimulante") || tLower.includes("cocaina") || tLower.includes("crack")) cenarioPsiq.etiologia = "intoxicacao_estimulantes";
    else if (tLower.includes("delirium")) cenarioPsiq.etiologia = "delirium_organico";
    else if (tLower.includes("demencia") || tLower.includes("alzheimer")) cenarioPsiq.etiologia = "demencia_idoso";
    else if (tLower.includes("mania") || tLower.includes("bipolar")) cenarioPsiq.etiologia = "mania_bipolar";
    else if (tLower.includes("psicose") || tLower.includes("esquizof")) cenarioPsiq.etiologia = "psicose";

    // Idade
    var mIdade = tLower.match(/(\d{1,3})\s*a(?:nos)?/);
    if (mIdade) cenarioPsiq.idade = parseInt(mIdade[1], 10);
    if (tLower.includes("idoso") || tLower.includes("idosa")) cenarioPsiq.idoso = true;
    if (tLower.includes("gestan") || tLower.includes("gravid")) cenarioPsiq.gestante = true;

    // Comorbidades
    var comorbs = [];
    if (tLower.includes("parkinson") || tLower.includes("lewy")) comorbs.push("parkinson");
    if (tLower.includes("qtc") || tLower.includes("arritm")) comorbs.push("qtc_longo");
    if (tLower.includes("cardio") || tLower.includes("iam") || tLower.includes("coronar")) comorbs.push("cardiopatia");
    if (tLower.includes("dor") || tLower.includes("fibromialg")) comorbs.push("dor_cronica");
    if (tLower.includes("insonia") || tLower.includes("peso") || tLower.includes("caquex")) comorbs.push("insonia_perda_peso");
    if (tLower.includes("tabag")) comorbs.push("tabagismo");
    if (tLower.includes("epilep") || tLower.includes("convuls")) comorbs.push("epilepsia");
    if (tLower.includes("bulimia") || tLower.includes("anorex")) comorbs.push("transtorno_alimentar");
    cenarioPsiq.comorbidades = comorbs;

    // Risco de Suicídio
    if (comando === "/suicidio" || tLower.includes("suicid") || tLower.includes("morte")) {
      if (tLower.includes("plano") || tLower.includes("estruturad")) cenarioPsiq.planoEstruturado = true;
      if (tLower.includes("intencao")) cenarioPsiq.intencaoSuicida = true;
      if (tLower.includes("meios") || tLower.includes("arma") || tLower.includes("veneno")) cenarioPsiq.acessoMeiosLetais = true;
      if (tLower.includes("tentativa previa") || tLower.includes("tentativa anterior")) cenarioPsiq.tentativaPrevia = true;
      if (tLower.includes("tentativa recente") || tLower.includes("tentou hoje") || tLower.includes("tentativa atual")) cenarioPsiq.tentativaRecente = true;
      if (tLower.includes("desesperanc")) cenarioPsiq.desesperanca = true;
      cenarioPsiq.ideacaoAtiva = true;
    }

    // PHQ-9
    if (comando === "/phq9" || tLower.includes("phq")) {
      var nums = dadosPsiq.match(/\b([0-3])\b/g);
      if (nums && nums.length >= 5) {
        cenarioPsiq.respostas = nums.slice(0, 9).map(function(n) { return parseInt(n, 10); });
      }
    }

    var resultadoPsiq = PsiquiatriaUrgenciaService.avaliarPsiquiatriaCompleto(cenarioPsiq);
    return enviarMensagemParaChat(chatId, resultadoPsiq.resumoFormatado);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ENDOCRINOLOGIA E DIABETES MELLITUS AVANÇADO (SBD / ADA)
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/diabetes" || comando === "/insulina" || comando === "/ehh" || comando === "/glicemia") {
    var dadosDm = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof EndocrinologiaDiabetesService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo EndocrinologiaDiabetesService indisponível temporariamente.");
    }

    if (!dadosDm && (comando === "/diabetes" || comando === "/insulina")) {
      return enviarMensagemComTecladoParaChat(chatId, "🩸 *MÓDULO DE ENDOCRINOLOGIA E DIABETES (SBD / ADA)*\n\n" +
        "💡 *Como calcular e prescrever:*\n" +
        "• *Insulinoterapia:* Envie `/insulina` com peso (kg), tipo de diabetes, glicemia capilar e função renal (ClCr) para dose total, divisão basal-bolus e sensibilidade.\n" +
        "• *CAD / EHH:* Envie `/ehh` ou `/cad` com peso, glicemia, potássio (K+), sódio (Na+) e pH/gaso para reposição volêmica, BIC de insulina e eletrólitos.\n" +
        "• *Escala Hospitalar:* Envie `/glicemia` com o valor atual para esquema de correção escalonada SC.", construirTecladoHubDiabetes());
    }

    var tLowerDm = dadosDm.toLowerCase();

    // 1. Rota de Emergência: CAD ou EHH
    if (comando === "/ehh" || tLowerDm.includes("cetoacidose") || tLowerDm.includes("hiperosmolar") || tLowerDm.includes("cad") || tLowerDm.includes("ehh")) {
      var paramsCad = {
        tipo: (comando === "/ehh" || tLowerDm.includes("ehh") || tLowerDm.includes("hiperosmolar")) ? "EHH" : "CAD"
      };

      var mPesoCad = dadosDm.match(/(\d{2,3}(?:[.,]\d+)?)\s*(?:kg|quilos)/i) || dadosDm.match(/peso\s*[:=]?\s*(\d{2,3}(?:[.,]\d+)?)/i);
      paramsCad.peso = mPesoCad ? parseFloat(mPesoCad[1].replace(',', '.')) : 70;

      var mGliCad = dadosDm.match(/glicemia\s*[:=]?\s*(\d{2,4})/i) || dadosDm.match(/(\d{3,4})\s*(?:mg\/dl)?/i);
      if (mGliCad) paramsCad.glicemia = parseInt(mGliCad[1], 10);

      var mKCad = dadosDm.match(/\bk\+?\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i) || dadosDm.match(/potassio\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
      if (mKCad) paramsCad.potassio = parseFloat(mKCad[1].replace(',', '.'));

      var mNaCad = dadosDm.match(/na\+?\s*[:=]?\s*(\d{2,3})/i) || dadosDm.match(/sodio\s*[:=]?\s*(\d{2,3})/i);
      if (mNaCad) paramsCad.sodio = parseInt(mNaCad[1], 10);

      var mPhCad = dadosDm.match(/ph\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
      if (mPhCad) paramsCad.ph = parseFloat(mPhCad[1].replace(',', '.'));

      var mBicCad = dadosDm.match(/(?:hco3|bic|bicarbonato)\s*[:=]?\s*(\d{1,2}(?:[.,]\d+)?)/i);
      if (mBicCad) paramsCad.bicarbonato = parseFloat(mBicCad[1].replace(',', '.'));

      var mClCad = dadosDm.match(/cl\s*[:=]?\s*(\d{2,3})/i) || dadosDm.match(/cloreto\s*[:=]?\s*(\d{2,3})/i);
      if (mClCad) paramsCad.cloreto = parseInt(mClCad[1], 10);

      var resCrise = EndocrinologiaDiabetesService.manejoCriseHiperglicemica(paramsCad);
      return enviarMensagemParaChat(chatId, EndocrinologiaDiabetesService.formatarResumoDiabetes(resCrise));
    }

    // 2. Rota de Correção de Glicemia Hospitalar
    if (comando === "/glicemia" || tLowerDm.includes("correcao") || tLowerDm.includes("hospital")) {
      var mGlic = dadosDm.match(/(\d{2,4})\s*(?:mg\/dl)?/i);
      var glicVal = mGlic ? parseInt(mGlic[1], 10) : 200;
      var perfilSens = "padrao";
      if (tLowerDm.includes("sensivel") || tLowerDm.includes("idoso") || tLowerDm.includes("renal")) perfilSens = "sensivel";
      else if (tLowerDm.includes("resisten") || tLowerDm.includes("obeso") || tLowerDm.includes("cortico")) perfilSens = "resistente";

      var resCorrecao = EndocrinologiaDiabetesService.protocoloCorrecaoHospitalar({ glicemia: glicVal, perfil: perfilSens });
      var msgCorr = "💉 *CORREÇÃO DE HIPERGLICEMIA HOSPITALAR (SBD / ADA)*\n" +
        "════════════════════════════════════════════\n" +
        "• Glicemia Aferida: *" + resCorrecao.glicemiaMedida + " mg/dL*\n" +
        "• Perfil de Sensibilidade: *" + resCorrecao.perfilSensibilidade.toUpperCase() + "*\n" +
        "• Alvo Hospitalar Recomendado: 140 a 180 mg/dL\n\n" +
        "📋 *CONDUTA IMEDIATA:*\n" +
        "👉 *" + resCorrecao.condutaPrescricao + "*\n\n" +
        (resCorrecao.alertaCritico ? (resCorrecao.alertaCritico + "\n\n") : "") +
        "💡 _" + resCorrecao.advertenciaSlidingScale + "_";
      return enviarMensagemParaChat(chatId, msgCorr);
    }

    // 3. Rota Ambulatorial: Basal-Bolus e Titulação
    var paramsAmb = {};
    var mPesoAmb = dadosDm.match(/(\d{2,3}(?:[.,]\d+)?)\s*(?:kg|quilos)/i) || dadosDm.match(/peso\s*[:=]?\s*(\d{2,3}(?:[.,]\d+)?)/i);
    paramsAmb.peso = mPesoAmb ? parseFloat(mPesoAmb[1].replace(',', '.')) : 70;

    if (tLowerDm.includes("dm1") || tLowerDm.includes("tipo 1") || tLowerDm.includes("tipo1")) paramsAmb.tipoDm = 1;
    else paramsAmb.tipoDm = 2;

    if (tLowerDm.includes("descompensad") || tLowerDm.includes("hba1c alta") || tLowerDm.includes("catabol")) paramsAmb.descompensado = true;
    if (tLowerDm.includes("isglt2") || tLowerDm.includes("dapa") || tLowerDm.includes("empa")) paramsAmb.emUsoIsglt2 = true;
    if (tLowerDm.includes("idoso") || tLowerDm.includes("idosa")) paramsAmb.ehIdoso = true;

    var mTfg = dadosDm.match(/(?:tfg|clcr)\s*[:=]?\s*(\d{1,3})/i);
    if (mTfg) paramsAmb.tfg = parseInt(mTfg[1], 10);

    var resAmb = EndocrinologiaDiabetesService.calcularInsulinaAmbulatorial(paramsAmb);
    return enviarMensagemParaChat(chatId, EndocrinologiaDiabetesService.formatarResumoDiabetes(resAmb));
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PALS - SUPORTE AVANÇADO DE VIDA PEDIÁTRICO (AHA)
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/pals" || comando === "/pediatria_pcr") {
    var dadosPals = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof PalsPediatriaService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo PalsPediatriaService indisponível temporariamente.");
    }

    if (!dadosPals) {
      return enviarMensagemParaChat(chatId, "👶 *PALS — SUPORTE AVANÇADO DE VIDA PEDIÁTRICO (AHA)*\n\n" +
        "Envie o peso, idade ou cor da fita de Broselow:\n" +
        "• `/pals 14kg` *(Doses de Adrenalina, Amiodarona, Choque e Tubo)*\n" +
        "• `/pals 3 anos` *(Peso estimado por fórmula APLS)*\n" +
        "• `/pals rosa` *(Estimativa por fita de Broselow)*");
    }

    var paramsPals = {};
    var mPesoPals = dadosPals.match(/(\d{1,2}(?:[.,]\d+)?)\s*(?:kg|quilos)/i);
    if (mPesoPals) paramsPals.pesoKg = parseFloat(mPesoPals[1].replace(',', '.'));

    var mIdadePals = dadosPals.match(/(\d{1,2})\s*(?:anos|a\b)/i);
    if (mIdadePals) paramsPals.idadeAnos = parseInt(mIdadePals[1], 10);

    var mBroselow = dadosPals.match(/\b(cinza|rosa|vermelho|roxo|amarelo|branco|azul|laranja|verde)\b/i);
    if (mBroselow) paramsPals.corBroselow = mBroselow[1];

    if (!paramsPals.pesoKg && !paramsPals.idadeAnos && !paramsPals.corBroselow) {
      var mNumP = dadosPals.match(/(\d{1,2})/);
      if (mNumP) paramsPals.pesoKg = parseInt(mNumP[1], 10);
      else paramsPals.corBroselow = dadosPals.trim();
    }

    try {
      var resPals = PalsPediatriaService.avaliarPals(paramsPals);
      var desfibSubseq = resPals.eletricidade.desfibrilacaoChoquesSubsequentes || resPals.eletricidade.desfibrilacaoSegundoChoque || "4 J/kg";
      var cardioSync = resPals.eletricidade.cardioversaoSincronizadaInicial || resPals.eletricidade.cardioversaoPrimeiroChoque || "0.5 a 1 J/kg";

      var msgPals = "👶 *PALS — REANIMAÇÃO PEDIÁTRICA DETERMINÍSTICA (AHA)*\n" +
        "════════════════════════════════════════════\n" +
        "• Peso Considerado: *" + resPals.pesoConsideradoKg + " kg*" + (resPals.idadeConsideradaAnos ? (" (" + resPals.idadeConsideradaAnos + " anos)") : "") + "\n\n" +
        "⚡ *ELETRICIDADE & DESFIBRILAÇÃO:*\n" +
        "• 1º Choque (2 J/kg): *" + resPals.eletricidade.desfibrilacaoPrimeiroChoque + "*\n" +
        "• 2º Choque em diante (4 J/kg): *" + desfibSubseq + "*\n" +
        "• Cardioversão Sincronizada: *" + cardioSync + "* (Inicial: 0.5-1 J/kg)\n\n" +
        "💉 *MEDICAÇÕES DE PCR:*\n" +
        resPals.medicacoes.map(function(m) {
          return "• *" + m.farmaco + ":* " + m.doseMg + " (" + m.volumeMl + ") — _" + m.via + "_";
        }).join("\n") + "\n\n" +
        "🫁 *VIA AÉREA & INTUBAÇÃO:*\n" +
        "• Tubo com Cuff: *" + resPals.viaAerea.tuboComCuff + "* | Sem Cuff: *" + resPals.viaAerea.tuboSemCuff + "*\n" +
        "• Lâmina: *" + resPals.viaAerea.laminaLaringoscopio + "* | Fixação: *" + resPals.viaAerea.fixacao + "*\n\n" +
        "💡 _" + resPals.alertas.join("\n_💡 _") + "_";

      var botoesPals = {
        inline_keyboard: [
          [{ text: "🔙 Sala Vermelha", callback_data: "ux:hub:sala" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
        ]
      };
      return enviarMensagemComTecladoParaChat(chatId, msgPals, botoesPals);
    } catch (ePals) {
      var botoesPalsErr = {
        inline_keyboard: [
          [{ text: "🔙 Sala Vermelha", callback_data: "ux:hub:sala" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
        ]
      };
      return enviarMensagemComTecladoParaChat(chatId, "⚠️ " + ePals.message + "\n\n💡 *Uso correto:* Envie o peso (ex: `/pals 14kg`), idade (ex: `/pals 3 anos`) ou cor Broselow (ex: `/pals rosa`).", botoesPalsErr);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SUPORTE NUTRICIONAL EM PEDIATRIA (HOLLIDAY-SEGAR & FÓRMULAS INFANTIS)
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/nutriped" || comando === "/holliday" || comando === "/formulainfantil" || comando === "/diluicao") {
    var dadosNutriPed = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof SuporteNutricionalPediatricoService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo SuporteNutricionalPediatricoService indisponível temporariamente.");
    }

    if (!dadosNutriPed) {
      return enviarMensagemComTecladoParaChat(chatId, "👶 *SUPORTE NUTRICIONAL & HIDRATAÇÃO PEDIÁTRICA*\n\n" +
        "Envie os parâmetros clínicos do lactente/criança:\n" +
        "• *Peso* (ex: `7.5kg`, `12kg`)\n" +
        "• *Idade* (ex: `3 meses`, `8m`, `2 anos`)\n" +
        "• *Condição clínica* (`bronquiolite`, `febre 39C`, `cardiopatia`, `catch-up`)\n" +
        "• *Fórmula* (`partida`, `seguimento`, `prematuro`, `ar`, `sl`, `ehf`, `aminoacidos`)\n" +
        "• *Volume da mamada* (ex: `90ml`, `120ml`)\n\n" +
        "💡 *Exemplos rápidos beira-leito:*\n" +
        "• `/holliday 8kg` *(Volume de manutenção, vazão em bomba, eletrólitos SBP e TIG)*\n" +
        "• `/holliday 11kg bronquiolite` *(Restrição a 70% para prevenção de sobrecarga)*",
        {
          inline_keyboard: [
            [{ text: "💧 Holliday 8kg", callback_data: "ux:hol:8kg" }, { text: "💧 Holliday 11kg Bronquiolite", callback_data: "ux:hol:11kg_bva" }],
            [{ text: "🔙 Enfermaria", callback_data: "ux:hub:enf" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
          ]
        }
      );
    }

    var paramsNP = {};
    var mPesoNP = dadosNutriPed.match(/(\d{1,2}(?:[.,]\d+)?)\s*(?:kg|quilos)/i);
    if (mPesoNP) paramsNP.pesoKg = parseFloat(mPesoNP[1].replace(',', '.'));

    var mIdadeMesesNP = dadosNutriPed.match(/(\d{1,2})\s*(?:meses|m\b)/i);
    if (mIdadeMesesNP) {
      paramsNP.idadeMeses = parseInt(mIdadeMesesNP[1], 10);
    } else {
      var mIdadeAnosNP = dadosNutriPed.match(/(\d{1,2})\s*(?:anos|a\b)/i);
      if (mIdadeAnosNP) paramsNP.idadeMeses = parseInt(mIdadeAnosNP[1], 10) * 12;
    }

    var mVolMamadaNP = dadosNutriPed.match(/(\d{2,3})\s*(?:ml|mls)/i);
    if (mVolMamadaNP) paramsNP.volumeMamadaMl = parseInt(mVolMamadaNP[1], 10);

    var dLower = dadosNutriPed.toLowerCase();
    if (dLower.includes("bronquio") || dLower.includes("bva")) paramsNP.condicaoClinica = "restricao_bronquiolite";
    else if (dLower.includes("cardio") || dLower.includes("edema") || dLower.includes("ic")) paramsNP.condicaoClinica = "restricao_ic";
    else if (dLower.includes("siadh") || dLower.includes("oligur")) paramsNP.condicaoClinica = "siadh";
    else if (dLower.includes("desnutri") || dLower.includes("catch")) paramsNP.condicaoClinica = "catch_up";
    else if (dLower.includes("desidrat")) paramsNP.condicaoClinica = "desidratacao_leve";
    else if (dLower.includes("febre")) paramsNP.condicaoClinica = "febre";

    var mTempNP = dadosNutriPed.match(/(\d{2}(?:[.,]\d+)?)\s*°?c/i);
    if (mTempNP) {
      paramsNP.temperaturaC = parseFloat(mTempNP[1].replace(',', '.'));
      paramsNP.condicaoClinica = "febre";
    }

    if (dLower.includes("prematur") || dLower.includes("pre-nan") || dLower.includes("pig")) paramsNP.tipoFormula = "prematuro";
    else if (dLower.includes("seguimento") || dLower.includes("fase 2")) paramsNP.tipoFormula = "seguimento";
    else if (dLower.includes(" anti") || dLower.includes("regurgit") || dLower.includes(" ar ") || dLower.endsWith(" ar")) paramsNP.tipoFormula = "anti_regurgitacao";
    else if (dLower.includes("sem lactose") || dLower.includes(" sl ") || dLower.endsWith(" sl")) paramsNP.tipoFormula = "sem_lactose";
    else if (dLower.includes("ehf") || dLower.includes("hidrolis") || dLower.includes("pepti") || dLower.includes("pregomin")) paramsNP.tipoFormula = "hidrolisada_extensa";
    else if (dLower.includes("aaf") || dLower.includes("aminoacid") || dLower.includes("neocate") || dLower.includes("alfamino")) paramsNP.tipoFormula = "aminoacidos";
    else if (dLower.includes("soja")) paramsNP.tipoFormula = "soja";
    else if (dLower.includes("partida") || dLower.includes("fase 1")) paramsNP.tipoFormula = "partida";

    // Se o usuário digitou número isolado inicial e ainda não tem peso ou volume
    if (!paramsNP.pesoKg && !paramsNP.volumeMamadaMl) {
      var mNumSolto = dadosNutriPed.match(/^(\d{1,2}(?:[.,]\d+)?)/);
      if (mNumSolto) {
        var valNum = parseFloat(mNumSolto[1].replace(',', '.'));
        if (comando === "/diluicao" || comando === "/formulainfantil") {
          if (valNum >= 30) paramsNP.volumeMamadaMl = valNum;
          else paramsNP.pesoKg = valNum;
        } else {
          paramsNP.pesoKg = valNum;
        }
      }
    }

    try {
      var avaliacaoNutri = SuporteNutricionalPediatricoService.avaliarSuporteNutricionalPediatricoCompleto(paramsNP);
      return enviarMensagemParaChat(chatId, avaliacaoNutri.textoFormatado);
    } catch (eNutriPed) {
      return enviarMensagemParaChat(chatId, "⚠️ Erro ao calcular suporte nutricional pediátrico: " + eNutriPed.message);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // HEMATOLOGIA CLÍNICA & MANEJO DE ANEMIAS (HEMOGRAMA / GANZONI / MENTZER)
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/anemia" || comando === "/hemograma" || comando === "/ganzoni" || comando === "/noripurum" || comando === "/ferro") {
    var dadosAnemia = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof HematologiaAnemiasService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo HematologiaAnemiasService indisponível temporariamente.");
    }

    if (!dadosAnemia) {
      return enviarMensagemComTecladoParaChat(chatId, "🩸 *HEMATOLOGIA CLÍNICA — MANEJO E INVESTIGAÇÃO DE ANEMIAS*\n\n" +
        "Selecione uma opção ou envie os parâmetros do hemograma e cinética de ferro:\n" +
        "• *Hb*, *Ht*, *VCM*, *HCM*, *RDW*, *Hemácias* (milhões)\n" +
        "• *Reticulócitos* (%) e *Hematócrito* (para IPR)\n" +
        "• *Ferritina*, *Ferro sérico*, *TIBC*, *IST* (%)\n" +
        "• *Peso* (kg) e perfil (`gestante`, `homem`, `mulher`, `criança`)\n\n" +
        "💡 *Exemplos beira-leito:*\n" +
        "• `/anemia hb 8.5 vcm 68 rdw 18 ferritina 12 peso 60kg` *(Anemia Ferropriva)*\n" +
        "• `/ganzoni 65kg hb 8.0` *(Cálculo de déficit de ferro e ampolas de Noripurum EV)*\n" +
        "• `/ferro 50kg gestante 2 trimestre hb 9.2` *(Prescrição de ferro na gestação)*\n" +
        "• `/hemograma hb 7.0 vcm 112 b12 140` *(Anemia Megaloblástica)*", construirTecladoHubAnemia());
    }

    function extrairNumAnemia(re) {
      var m = dadosAnemia.match(re);
      return m ? parseFloat(String(m[1]).replace(",", ".")) : null;
    }

    var paramsAnemia = {};
    paramsAnemia.hb = extrairNumAnemia(/(?:hb|hemoglobina)\s*[:=]?\s*(\d+[.,]?\d*)/i);
    paramsAnemia.vcm = extrairNumAnemia(/\bvcm\s*[:=]?\s*(\d+[.,]?\d*)/i);
    paramsAnemia.hcm = extrairNumAnemia(/\bhcm\s*[:=]?\s*(\d+[.,]?\d*)/i);
    paramsAnemia.chcm = extrairNumAnemia(/\bchcm\s*[:=]?\s*(\d+[.,]?\d*)/i);
    paramsAnemia.rdw = extrairNumAnemia(/\brdw\s*[:=]?\s*(\d+[.,]?\d*)/i);
    paramsAnemia.hemacias = extrairNumAnemia(/(?:hem[aá]cias?|he|hem)\s*[:=]?\s*(\d+[.,]?\d*)/i);
    paramsAnemia.reticulocitos = extrairNumAnemia(/(?:retic\w*|ret)\s*[:=]?\s*(\d+[.,]?\d*)/i);
    paramsAnemia.ht = extrairNumAnemia(/(?:ht|hemat[oó]crito)\s*[:=]?\s*(\d+[.,]?\d*)/i);
    paramsAnemia.ferritina = extrairNumAnemia(/ferritina\s*[:=]?\s*(\d+[.,]?\d*)/i);
    paramsAnemia.ferroSerico = extrairNumAnemia(/ferro(?:\s*s[eé]rico)?\s*[:=]?\s*(\d+[.,]?\d*)/i);
    paramsAnemia.tibc = extrairNumAnemia(/tibc\s*[:=]?\s*(\d+[.,]?\d*)/i);
    paramsAnemia.ist = extrairNumAnemia(/ist\s*[:=]?\s*(\d+[.,]?\d*)/i);
    paramsAnemia.pesoKg = extrairNumAnemia(/(\d{1,3}(?:[.,]\d+)?)\s*(?:kg|quilos)/i) || extrairNumAnemia(/peso\s*[:=]?\s*(\d+[.,]?\d*)/i);
    paramsAnemia.vitaminaB12 = extrairNumAnemia(/(?:b12|vit\w*\s*b12)\s*[:=]?\s*(\d+[.,]?\d*)/i);
    paramsAnemia.acidoFolico = extrairNumAnemia(/(?:folato|[aá]cido\s*f[oó]lico)\s*[:=]?\s*(\d+[.,]?\d*)/i);

    var dLowerAnemia = dadosAnemia.toLowerCase();
    if (dLowerAnemia.includes("gestant") || dLowerAnemia.includes("gravid") || dLowerAnemia.includes("grávid")) {
      paramsAnemia.gestante = true;
      paramsAnemia.perfil = "gestante";
      if (dLowerAnemia.includes("1") && dLowerAnemia.includes("trimest")) paramsAnemia.trimestre = 1;
      else if (dLowerAnemia.includes("2") && dLowerAnemia.includes("trimest")) paramsAnemia.trimestre = 2;
      else if (dLowerAnemia.includes("3") && dLowerAnemia.includes("trimest")) paramsAnemia.trimestre = 3;
    } else if (dLowerAnemia.includes("pediat") || dLowerAnemia.includes("crian") || dLowerAnemia.includes("lactent")) {
      paramsAnemia.perfil = "pediatria";
    } else if (dLowerAnemia.includes("homem") || dLowerAnemia.includes("masc")) {
      paramsAnemia.sexo = "M";
      paramsAnemia.perfil = "adulto_homem";
    } else if (dLowerAnemia.includes("mulher") || dLowerAnemia.includes("fem")) {
      paramsAnemia.sexo = "F";
      paramsAnemia.perfil = "adulto_mulher";
    }

    if (dLowerAnemia.includes("esquizocit") || dLowerAnemia.includes("esquizócit")) paramsAnemia.esquizocitos = true;
    if (dLowerAnemia.includes("coombs") && (dLowerAnemia.includes("pos") || dLowerAnemia.includes("reag"))) paramsAnemia.coombsDireto = true;
    if (dLowerAnemia.includes("inflam") || dLowerAnemia.includes("pcr") || dLowerAnemia.includes("infecc")) paramsAnemia.inflamacao = true;
    if (dLowerAnemia.includes("celiaca") || dLowerAnemia.includes("celíaca") || dLowerAnemia.includes("dii") || dLowerAnemia.includes("bariat") || dLowerAnemia.includes("bariát")) paramsAnemia.maAbsorcao = true;
    if (dLowerAnemia.includes("intoler") || dLowerAnemia.includes("falha")) paramsAnemia.intoleranciaOral = true;
    if (dLowerAnemia.includes("drc") || dLowerAnemia.includes("renal") || dLowerAnemia.includes("uremi")) paramsAnemia.drc = true;
    if (dLowerAnemia.includes("icfer") || dLowerAnemia.includes("insuficiencia cardiaca") || dLowerAnemia.includes("cardiopatia")) paramsAnemia.insuficienciaCardiaca = true;

    if (comando === "/mentzer" && !paramsAnemia.hb) {
      var numsMentzer = dadosAnemia.match(/(\d{1,3}(?:[.,]\d+)?)/g);
      if (numsMentzer && numsMentzer.length >= 2) {
        var vcmM = parseFloat(numsMentzer[0].replace(",", "."));
        var heM = parseFloat(numsMentzer[1].replace(",", "."));
        var resM = HematologiaAnemiasService.calcularIndiceMentzer(vcmM, heM);
        if (resM) {
          var msgMentzer = "🔬 *ÍNDICE DE MENTZER (DIAGNÓSTICO DIFERENCIAL BEIRA-LEITO)*\n\n" +
            "• VCM: *" + vcmM + " fL* | Hemácias: *" + heM + " milhões/mcL*\n" +
            "• Índice de Mentzer: *" + resM.valor + "*\n" +
            "• Sugestão: *" + resM.sugestao + "*\n" +
            "• Probabilidade: *" + resM.probabilidade + "*\n\n" +
            "💡 *Interpretação e Conduta:*\n" + resM.explicacao;
          return enviarMensagemParaChat(chatId, msgMentzer);
        }
      }
    }

    if (!paramsAnemia.hb) {
      var mNumSoltoHb = dadosAnemia.match(/^(\d{1,2}(?:[.,]\d+)?)/);
      if (mNumSoltoHb) {
        paramsAnemia.hb = parseFloat(mNumSoltoHb[1].replace(",", "."));
      }
    }

    if (!paramsAnemia.hb) {
      return enviarMensagemParaChat(chatId, "⚠️ *Parâmetro obrigatório ausente:* Informe pelo menos o valor da Hemoglobina (ex: `/anemia hb 8.5` ou `/ganzoni 70kg hb 8.0`).");
    }

    try {
      var analiseAnemia = HematologiaAnemiasService.analisarCasoCompleto(paramsAnemia);
      return enviarMensagemParaChat(chatId, analiseAnemia.textoFormatado);
    } catch (eAnemia) {
      return enviarMensagemParaChat(chatId, "⚠️ Erro ao analisar anemia: " + eAnemia.message);
    }
  }


  // ───────────────────────────────────────────────────────────────────────────
  // PNEUMOLOGIA & EMERGÊNCIA: MANEJO DA CRISE ASMÁTICA E ESTADO DE MAL ASMÁTICO
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/asma" || comando === "/criseasma" || comando === "/broncoespasmo" || comando === "/salbutamol") {
    var dadosAsma = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof PneumologiaCriseAsmaticaService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo PneumologiaCriseAsmaticaService indisponível temporariamente.");
    }

    if (!dadosAsma) {
      return enviarMensagemParaChat(chatId, "🫁 *PNEUMOLOGIA & EMERGÊNCIA — MANEJO DA CRISE ASMÁTICA*\n\n" +
        "Envie os parâmetros do paciente para estratificação GINA/SBPT e conduta:\n" +
        "• *SpO2*, *FC*, *FR*, *Pico de Fluxo Expiratório (PFE)*\n" +
        "• *Fala* (`frases`, `palavras`, `incapaz`), *Posição* (`tripé`, `sentado`)\n" +
        "• *Musculatura acessória* (`tiragem`, `acentuada`), *Ausculta* (`sibilos`, `tórax silencioso`)\n" +
        "• *Gasometria* (`pH`, `pCO2`), *Sensório* (`sonolento`, `agitado`, `confuso`)\n" +
        "• *Perfil / Peso:* `peso 70kg`, `pediatria 18kg`, `gestante`\n\n" +
        "💡 *Exemplos beira-leito:*\n" +
        "• `/asma spo2 88 fc 130 fr 34 tripe palavras acessoria acentuada` *(Crise Grave)*\n" +
        "• `/asma torax silencioso sonolento paco2 48 ph 7.22` *(Parada Iminente / Estado de Mal)*\n" +
        "• `/asma pfe 45% spo2 91 refratario 1h` *(Crise refratária com indicação de Sulfato de Magnésio)*\n" +
        "• `/salbutamol 4a 16kg pediatria spo2 92 tiragem` *(Crise pediátrica com MDI e espaçador)*");
    }

    function extrairNumAsma(re) {
      var m = dadosAsma.match(re);
      return m ? parseFloat(String(m[1]).replace(",", ".")) : null;
    }

    var paramsAsma = {};
    paramsAsma.spo2 = extrairNumAsma(/(?:spo2|sat(?:uracao|ura[çc][aã]o)?)\s*[:=]?\s*(\d+[.,]?\d*)/i);
    paramsAsma.fc = extrairNumAsma(/\bfc\s*[:=]?\s*(\d+[.,]?\d*)/i);
    paramsAsma.fr = extrairNumAsma(/\bfr\s*[:=]?\s*(\d+[.,]?\d*)/i);
    paramsAsma.pfe = extrairNumAsma(/(?:pfe|peak\s*flow)\s*[:=]?\s*(\d+[.,]?\d*)/i);
    paramsAsma.pfe_previsto = extrairNumAsma(/(?:pfe_?previsto|pfe_?prev)\s*[:=]?\s*(\d+[.,]?\d*)/i);
    paramsAsma.pfe_porcentagem = extrairNumAsma(/(\d{1,3})\s*%\s*(?:do\s*pfe|pfe)?/i) || extrairNumAsma(/(?:pfe|peak\s*flow)\s*[:=]?\s*(\d{1,3})\s*%/i);
    paramsAsma.pesoKg = extrairNumAsma(/(\d{1,3}(?:[.,]\d+)?)\s*(?:kg|quilos)/i) || extrairNumAsma(/peso\s*[:=]?\s*(\d+[.,]?\d*)/i);
    paramsAsma.idade = extrairNumAsma(/(\d{1,2})\s*(?:anos|a\b)/i) || extrairNumAsma(/idade\s*[:=]?\s*(\d+[.,]?\d*)/i);

    var dLowerAsma = dadosAsma.toLowerCase();

    // Ausculta
    if (dLowerAsma.includes("silencio") || dLowerAsma.includes("silêncio") || dLowerAsma.includes("silencioso")) {
      paramsAsma.ausculta = "torax_silencioso";
    } else if (dLowerAsma.includes("sibilos difusos") || dLowerAsma.includes("sibilos graves")) {
      paramsAsma.ausculta = "sibilos_difusos";
    } else if (dLowerAsma.includes("sibilo")) {
      paramsAsma.ausculta = "sibilos_expiratorios";
    }

    // Sensório / Estado Mental
    if (dLowerAsma.includes("sonolent") || dLowerAsma.includes("confus") || dLowerAsma.includes("coma") || dLowerAsma.includes("rebaixad") || dLowerAsma.includes("letarg")) {
      paramsAsma.estado_mental = "sonolento";
    } else if (dLowerAsma.includes("agitad") || dLowerAsma.includes("ansios")) {
      paramsAsma.estado_mental = "agitado";
    }

    // Posição
    if (dLowerAsma.includes("tripe") || dLowerAsma.includes("tripé") || dLowerAsma.includes("inclinad")) {
      paramsAsma.posicao = "tripe";
    }

    // Fala
    if (dLowerAsma.includes("incapaz de falar") || dLowerAsma.includes("sem falar") || dLowerAsma.includes("afasico")) {
      paramsAsma.fala = "incapaz";
    } else if (dLowerAsma.includes("palavras") || dLowerAsma.includes("monossilab")) {
      paramsAsma.fala = "palavras_isoladas";
    } else if (dLowerAsma.includes("frases curtas")) {
      paramsAsma.fala = "frases_curtas";
    }

    // Musculatura acessória
    if (dLowerAsma.includes("acentuada") || dLowerAsma.includes("tiragem") || dLowerAsma.includes("furcula") || dLowerAsma.includes("fúrcula") || dLowerAsma.includes("asa de nariz")) {
      paramsAsma.musculatura_acessoria = "acentuada";
    }

    // Respiração paradoxal
    if (dLowerAsma.includes("paradoxal") || dLowerAsma.includes("fadiga")) {
      paramsAsma.respiracao_paradoxal = true;
    }

    // Refratariedade pós 1 hora
    if (dLowerAsma.includes("refratari") || dLowerAsma.includes("refratári") || dLowerAsma.includes("pos 1h") || dLowerAsma.includes("pós 1h") || dLowerAsma.includes("1 hora")) {
      paramsAsma.refratario_1h = true;
    }

    // Perfil
    if (dLowerAsma.includes("gestant") || dLowerAsma.includes("gravid") || dLowerAsma.includes("grávid")) {
      paramsAsma.gestante = true;
    }
    if (dLowerAsma.includes("pediat") || dLowerAsma.includes("crian") || dLowerAsma.includes("lactent") || (paramsAsma.idade && paramsAsma.idade < 12)) {
      paramsAsma.faixa_etaria = "pediatrico";
    }

    // Gasometria
    var phGaso = extrairNumAsma(/\bph\s*[:=]?\s*(\d+[.,]?\d*)/i);
    var paco2Gaso = extrairNumAsma(/(?:paco2|pco2)\s*[:=]?\s*(\d+[.,]?\d*)/i);
    var pao2Gaso = extrairNumAsma(/(?:pao2|po2)\s*[:=]?\s*(\d+[.,]?\d*)/i);
    if (phGaso !== null || paco2Gaso !== null) {
      paramsAsma.gasometria = { ph: phGaso, paco2: paco2Gaso, pao2: pao2Gaso };
    }

    try {
      var analiseAsma = PneumologiaCriseAsmaticaService.avaliarCriseAsmatica(paramsAsma);
      var msgAsma = PneumologiaCriseAsmaticaService.formatarTextoTelegram(analiseAsma);
      return enviarMensagemParaChat(chatId, msgAsma);
    } catch (eAsma) {
      return enviarMensagemParaChat(chatId, "⚠️ Erro ao avaliar crise asmática: " + eAsma.message);
    }
  }


  // ───────────────────────────────────────────────────────────────────────────
  // PNEUMOLOGIA & TERAPIA INTENSIVA: MANEJO DA CRISE HIPERCÁPNICA E VNI NA DPOC
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/dpoc" || comando === "/vni" || comando === "/bipap" || comando === "/hipercapnia") {
    var dadosVni = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof PneumologiaDpocVniService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo PneumologiaDpocVniService indisponível temporariamente.");
    }

    if (!dadosVni) {
      return enviarMensagemParaChat(chatId, 
        "🫁 *Avaliação de VNI na DPOC (GOLD/SBPT)*\n\n" +
        "Digite o comando seguido dos parâmetros clínicos e gasométricos.\n\n" +
        "📌 *Parâmetros recomendados:*\n" +
        "• Gasometria: `ph 7.28 pco2 65 po2 55`\n" +
        "• Clínica: `fr 28`, `glasgow 14`\n" +
        "• Modificadores críticos: `pcr`, `choque`, `trauma de face`, `secrecao abundante`, `hda`, `nao colabora`\n\n" +
        "💡 *Exemplos beira-leito:*\n" +
        "• `/dpoc ph 7.28 pco2 60 fr 32 uso de musculatura acessoria` *(Crise hipercápnica clássica)*\n" +
        "• `/vni ph 7.15 pco2 80 glasgow 12` *(Acidemia severa com risco de IOT)*\n" +
        "• `/bipap choque secrecao abundante ph 7.20` *(Contraindicação absoluta)*");
    }

    function extrairVni(re) {
      var m = dadosVni.match(re);
      return m ? parseFloat(m[1].replace(",", ".")) : NaN;
    }
    
    var paramsVni = {
      ph: extrairVni(/(?:ph)\s*[:=]?\s*(\d+[\.,]\d+)/i),
      pco2: extrairVni(/(?:pco2|paco2)\s*[:=]?\s*(\d+(?:[\.,]\d+)?)/i),
      po2: extrairVni(/(?:po2|pao2)\s*[:=]?\s*(\d+(?:[\.,]\d+)?)/i),
      fr: extrairVni(/(?:fr|resp)\s*[:=]?\s*(\d+)/i),
      glasgow: extrairVni(/(?:glasgow|ecg|gcs)\s*[:=]?\s*(\d+)/i) || 15,
      parada_cardiorespiratoria: /(?:pcr|parada|assistolia|fv)/i.test(dadosVni),
      instabilidade_hemodinamica: /(?:choque|instabilidade hemodinamica|hipotensao grave)/i.test(dadosVni),
      incapacidade_proteger_via_aerea: /(?:incapacidade de proteger|nao protege via aerea)/i.test(dadosVni),
      secrecao_abundante: /(?:secrecao abundante|secrecao incontrolavel)/i.test(dadosVni),
      trauma_face_cirurgia_recente: /(?:trauma de face|queimadura facial|cirurgia facial)/i.test(dadosVni),
      obstrucao_fixa_via_aerea: /(?:obstrucao fixa)/i.test(dadosVni),
      vometos_incoerciveis: /(?:vometos|hda|hemorragia digestiva)/i.test(dadosVni),
      nao_colaboracao: /(?:nao colabora|agitacao extrema|delirium)/i.test(dadosVni),
      uso_musculatura_acessoria: /(?:musculatura acessoria|tiragem|esforco)/i.test(dadosVni),
      respiracao_paradoxal: /(?:paradoxal)/i.test(dadosVni)
    };

    try {
      var analiseVni = PneumologiaDpocVniService.avaliarVni(paramsVni);
      var textVni = PneumologiaDpocVniService.formatarTextoTelegram(analiseVni);
      return enviarMensagemParaChat(chatId, textVni);
    } catch (eVni) {
      return enviarMensagemParaChat(chatId, "❌ Erro ao avaliar VNI: " + eVni.message);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // REUMATOLOGIA & EMERGÊNCIA: MONOARTRITE AGUDA E ANÁLISE DO LÍQUIDO SINOVIAL
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/monoartrite" || comando === "/artriteseptica" || comando === "/artriteséptica" || comando === "/gota" || comando === "/artrocentese") {
    var dadosMono = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof ReumatologiaMonoartriteFebreReumaticaService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo ReumatologiaMonoartriteFebreReumaticaService indisponível temporariamente.");
    }

    if (!dadosMono) {
      return enviarMensagemParaChat(chatId,
        "🦴 *Monoartrite Aguda & Análise do Líquido Sinovial (ACR/SBR)*\n\n" +
        "Digite o comando seguido dos achados da artrocentese e clínica.\n\n" +
        "📌 *Parâmetros aceitos:*\n" +
        "• Celularidade: `leucocitos 85000`, `pmn 90%`\n" +
        "• Aspecto: `purulento`, `turvo`, `hemorragico`, `transparente`\n" +
        "• Microscopia/Gram: `gram cocos positivos`, `diplococos gram negativos`, `cristais urato / agulha / pirofosfato`\n" +
        "• Glicose: `glicose 20 glicemia 100`\n" +
        "• Modificadores: `joelho/quadril`, `febre`, `idade 65`, `peso 70`, `clcr 28`, `risco mrsa`, `sexualmente ativo`\n\n" +
        "💡 *Exemplos beira-leito:*\n" +
        "• `/monoartrite leucocitos 85000 pmn 92% aspecto purulento gram cocos positivos febre joelho`\n" +
        "• `/gota cristais urato agulha leucocitos 18000 pmn 70% clcr 28 podagra`\n" +
        "• `/artriteseptica jovem sexualmente ativo leucocitos 60000 joelho`");
    }

    function extrairMono(re) {
      var m = dadosMono.match(re);
      return m ? parseFloat(m[1].replace(",", ".")) : NaN;
    }

    var paramsMono = {
      leucocitos: extrairMono(/(?:leucocitos|leuco|celulas|gb)\s*[:=]?\s*(\d+)/i),
      neutrofilos_pct: extrairMono(/(?:pmn|neutrofilos|polimorfo)\s*[:=]?\s*(\d+(?:[\.,]\d+)?)/i),
      glicose_sinovial: extrairMono(/(?:glicose sinovial|glicose)\s*[:=]?\s*(\d+)/i),
      glicemia_serica: extrairMono(/(?:glicemia serica|glicemia)\s*[:=]?\s*(\d+)/i),
      idade: extrairMono(/(?:idade|anos)\s*[:=]?\s*(\d+)/i),
      peso: extrairMono(/(?:peso|kg)\s*[:=]?\s*(\d+(?:[\.,]\d+)?)/i),
      clcr: extrairMono(/(?:clcr|clearance|tfg)\s*[:=]?\s*(\d+(?:[\.,]\d+)?)/i),
      temperatura: extrairMono(/(?:temp|tax|temperatura)\s*[:=]?\s*(\d+(?:[\.,]\d+)?)/i),
      febre: /(?:febre|febril|toxemico)/i.test(dadosMono),
      aspecto: dadosMono,
      gram: dadosMono,
      cristais: dadosMono,
      articulacao: dadosMono,
      sexualmente_ativo: /(?:sexualmente ativo|jovem|dst|uretrite|gonococo)/i.test(dadosMono),
      risco_mrsa: /(?:mrsa|drogas iv|hemodialise|colonizacao|hospitalizacao|ulcera de pele)/i.test(dadosMono),
      idoso: /(?:idoso|nonagenario|octogenario)/i.test(dadosMono),
      imunossuprimido: /(?:imunossuprimido|neoplasia|quimioterapia|transplante)/i.test(dadosMono),
      diabetes: /(?:diabetes|dm|diabetico)/i.test(dadosMono),
      protese_articular: /(?:protese|artroplastia)/i.test(dadosMono)
    };

    try {
      var analiseMono = ReumatologiaMonoartriteFebreReumaticaService.analisarMonoartrite(paramsMono);
      var textMono = ReumatologiaMonoartriteFebreReumaticaService.formatarMonoartriteTelegram(analiseMono);
      return enviarMensagemParaChat(chatId, textMono);
    } catch (eMono) {
      return enviarMensagemParaChat(chatId, "❌ Erro ao analisar monoartrite: " + eMono.message);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // REUMATOLOGIA & PEDIATRIA: FEBRE REUMÁTICA AGUDA E CRITÉRIOS DE JONES
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/febrereumatica" || comando === "/fr" || comando === "/jones" || comando === "/aslo") {
    var dadosFr = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof ReumatologiaMonoartriteFebreReumaticaService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo ReumatologiaMonoartriteFebreReumaticaService indisponível temporariamente.");
    }

    if (!dadosFr) {
      return enviarMensagemParaChat(chatId,
        "❤️‍🩹 *Febre Reumática Aguda & Critérios de Jones (AHA/SBP)*\n\n" +
        "Digite o comando seguido dos critérios clínicos e laboratoriais.\n\n" +
        "📌 *Achados avaliados:*\n" +
        "• Infecção GAS: `aslo 650` / `aslo positiva`, `cultura strepto+`, `escarlatina`\n" +
        "• Critérios Maiores: `cardite` / `sopro`, `poliartrite migratoria`, `monoartrite`, `coreia`, `eritema marginado`, `nodulos`\n" +
        "• Critérios Menores: `febre 38.8`, `vhs 55`, `pcr 4.2`, `pr prolongado` / `bloqueio av 1`\n" +
        "• Dados do Paciente: `peso 25`, `idade 9`, `alergia a penicilina`, `recidiva`, `valvulopatia residual`\n\n" +
        "💡 *Exemplos beira-leito:*\n" +
        "• `/febrereumatica aslo 650 poliartrite migratoria febre 38.6 vhs 45 peso 25 idade 9`\n" +
        "• `/jones cardite sopro novo febre 38.8 pcr 5.2 aslo alta peso 42 idade 12`\n" +
        "• `/fr coreia de sydenham peso 30 idade 10`");
    }

    function extrairFr(re) {
      var m = dadosFr.match(re);
      return m ? parseFloat(m[1].replace(",", ".")) : NaN;
    }

    var paramsFr = {
      peso: extrairFr(/(?:peso|kg)\s*[:=]?\s*(\d+(?:[\.,]\d+)?)/i),
      idade: extrairFr(/(?:idade|anos)\s*[:=]?\s*(\d+)/i),
      aslo: extrairFr(/(?:aslo|aeso)\s*[:=]?\s*(\d+)/i),
      temperatura: extrairFr(/(?:temp|tax|temperatura)\s*[:=]?\s*(\d+(?:[\.,]\d+)?)/i),
      vhs: extrairFr(/(?:vhs)\s*[:=]?\s*(\d+)/i),
      pcr: extrairFr(/(?:pcr)\s*[:=]?\s*(\d+(?:[\.,]\d+)?)/i),
      aslo_elevada: /(?:aslo elevada|aslo alta|aslo positiva|aeso alta)/i.test(dadosFr),
      cultura_positiva: /(?:cultura positiva|orofaringe positiva|strep test positivo|teste rapido positivo)/i.test(dadosFr),
      escarlatina: /(?:escarlatina)/i.test(dadosFr),
      cardite: /(?:cardite|valvulite|sopro novo|sopro cardiaco|insuficiencia mitral)/i.test(dadosFr),
      artrite: dadosFr,
      poliartrite: /(?:poliartrite|migratoria|migratória)/i.test(dadosFr),
      monoartrite: /(?:monoartrite)/i.test(dadosFr),
      poliartralgia: /(?:poliartralgia)/i.test(dadosFr),
      artralgia: /(?:artralgia|monoartralgia)/i.test(dadosFr),
      coreia: /(?:coreia|sydenham|movimentos involuntarios)/i.test(dadosFr),
      eritema_marginado: /(?:eritema marginado|eritema marginatum)/i.test(dadosFr),
      nodulos_subcutaneos: /(?:nodulos subcutaneos|nódulos subcutâneos|nodulos)/i.test(dadosFr),
      febre: /(?:febre|febril)/i.test(dadosFr),
      pr_prolongado: /(?:pr prolongado|bloqueio av|bav 1|bav1)/i.test(dadosFr),
      alergia_penicilina: /(?:alergia a penicilina|alergico a penicilina|anafilaxia a penicilina)/i.test(dadosFr),
      recidiva: /(?:recidiva|surto previo|episodio previo|fr previa)/i.test(dadosFr),
      valvulopatia_residual: /(?:valvulopatia residual|cardiopatia cronica|sequela valvar|protese valvar)/i.test(dadosFr),
      cardite_previa_curada: /(?:cardite curada|sem sequela)/i.test(dadosFr)
    };

    try {
      var analiseFr = ReumatologiaMonoartriteFebreReumaticaService.avaliarFebreReumatica(paramsFr);
      var textFr = ReumatologiaMonoartriteFebreReumaticaService.formatarFebreReumaticaTelegram(analiseFr);
      return enviarMensagemParaChat(chatId, textFr);
    } catch (eFr) {
      return enviarMensagemParaChat(chatId, "❌ Erro ao avaliar febre reumática: " + eFr.message);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DERMATOLOGIA & INFECTOLOGIA: LESÕES ELEMENTARES & ISTs CUTÂNEAS
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/dermato" || comando === "/lesao" || comando === "/lesoes" || comando === "/pele") {
    var dadosDerm = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof DermatologiaLesoesIstsService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo DermatologiaLesoesIstsService indisponível temporariamente.");
    }
    if (!dadosDerm) {
      return enviarMensagemParaChat(chatId,
        "🔬 *Dermatologia Clínica — Lesões Elementares da Pele*\n\n" +
        "Descreva os achados dermatológicos da lesão.\n\n" +
        "📌 *Parâmetros aceitos:*\n" +
        "• Morfologia: `macula`, `papula`, `placa`, `nodulo`, `vesicula`, `bolha`, `pustula`, `crosta`, `purpura`, `ulcera`\n" +
        "• Localização: `palmas e plantas`, `dermátomo / torax`, `face`, `genital`, `tronco`\n" +
        "• Sinais Críticos: `sinal de hutchinson` (nariz), `nikolsky positivo`, `nao some a digitopressao`\n" +
        "• Clínica: `febre`, `dor em queimação`, `prurido`, `idade 65`\n\n" +
        "💡 *Exemplos beira-leito:*\n" +
        "• `/dermato vesiculas em dermatomo toracico dor em queimação idade 68`\n" +
        "• `/dermato papulas descamativas em palmas e plantas colarete de biett`\n" +
        "• `/lesao purpura petequias nao some a digitopressao febre 38.5`\n" +
        "• `/dermato vesiculas na ponta do nariz sinal de hutchinson`");
    }
    try {
      var analiseDerm = DermatologiaLesoesIstsService.diferenciarLesaoElementar({ texto: dadosDerm });
      var textDerm = DermatologiaLesoesIstsService.formatarDermatologiaTelegram(analiseDerm);
      return enviarMensagemParaChat(chatId, textDerm);
    } catch (eDerm) {
      return enviarMensagemParaChat(chatId, "❌ Erro ao analisar lesão dermatológica: " + eDerm.message);
    }
  }

  if (comando === "/herpes" || comando === "/zoster" || comando === "/aciclovir" || comando === "/valaciclovir") {
    var dadosHerpes = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof DermatologiaLesoesIstsService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo DermatologiaLesoesIstsService indisponível temporariamente.");
    }
    if (!dadosHerpes) {
      return enviarMensagemParaChat(chatId,
        "🛡️ *Protocolo Antiviral: Herpes Zoster & Herpes Simples*\n\n" +
        "Digite os dados clínicos do paciente para prescrição com ajuste renal.\n\n" +
        "📌 *Parâmetros aceitos:*\n" +
        "• Tipo: `zoster`, `zoster oftálmico`, `simples genital`, `primoinfecção`, `recorrência`, `supressão`\n" +
        "• Função Renal: `clcr 35`, `clcr 18`, `clcr 8`, `hemodiálise`\n" +
        "• Dados: `peso 75`, `idade 70`, `imunossuprimido`, `gestante`, `hutchinson`\n\n" +
        "💡 *Exemplos beira-leito:*\n" +
        "• `/zoster clcr 38 peso 70 idade 68`\n" +
        "• `/zoster hutchinson oftálmico clcr 85`\n" +
        "• `/herpes simples genital primoinfeccao clcr 80`\n" +
        "• `/aciclovir zoster hemodialise peso 65`");
    }

    function extrairHerpes(re) {
      var m = dadosHerpes.match(re);
      return m ? parseFloat(m[1].replace(",", ".")) : NaN;
    }

    var paramsHerpes = {
      tipo: dadosHerpes,
      clcr: extrairHerpes(/(?:clcr|clearance|tfg)\s*[:=]?\s*(\d+(?:[\.,]\d+)?)/i),
      peso: extrairHerpes(/(?:peso|kg)\s*[:=]?\s*(\d+(?:[\.,]\d+)?)/i),
      idade: extrairHerpes(/(?:idade|anos)\s*[:=]?\s*(\d+)/i),
      hemodialise: /(?:hemodialise|hemodiálise|dialise|diálise|drc terminal)/i.test(dadosHerpes),
      hutchinson: /(?:hutchinson|oftalm|nariz)/i.test(dadosHerpes),
      imunossuprimido: /(?:imunossup|hiv|transplante|quimio)/i.test(dadosHerpes),
      gestante: /(?:gestante|gravida|grávida|gestacao)/i.test(dadosHerpes)
    };

    try {
      var analiseHerpes = DermatologiaLesoesIstsService.calcularPosologiaAntiviralHerpes(paramsHerpes);
      var textHerpes = DermatologiaLesoesIstsService.formatarHerpesAntiviralTelegram(analiseHerpes);
      return enviarMensagemParaChat(chatId, textHerpes);
    } catch (eHerpes) {
      return enviarMensagemParaChat(chatId, "❌ Erro ao calcular posologia antiviral: " + eHerpes.message);
    }
  }

  if (comando === "/ulceragenital" || comando === "/cancro" || comando === "/donovanose" || comando === "/lgv") {
    var dadosUlc = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof DermatologiaLesoesIstsService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo DermatologiaLesoesIstsService indisponível temporariamente.");
    }
    if (!dadosUlc) {
      return enviarMensagemParaChat(chatId,
        "🩹 *Abordagem Sindrômica de Úlceras Genitais (PCDT MS 2026)*\n\n" +
        "Digite os achados clínicos da úlcera genital.\n\n" +
        "📌 *Parâmetros aceitos:*\n" +
        "• Tempo: `tempo 2 semanas`, `tempo 10 dias`, `tempo 5 semanas`\n" +
        "• Lesões: `vesiculas`, `ulcera unica`, `multiplas ulceras`, `fundo limpo`, `fundo purulento`\n" +
        "• Sintomas: `indolor`, `muito dolorosa`, `bubao inguinal`, `fistula`\n" +
        "• Especiais: `gestante`, `alergia a penicilina`\n\n" +
        "💡 *Exemplos beira-leito:*\n" +
        "• `/ulceragenital tempo 10 dias ulcera unica indolor bordas endurecidas`\n" +
        "• `/ulceragenital vesiculas agrupadas dolorosas tempo 3 dias`\n" +
        "• `/ulceragenital tempo 5 semanas ulcera vegetante indolor sangra facil`\n" +
        "• `/cancro tempo 2 semanas dolorosa fundo purulento gestante`");
    }

    function extrairUlc(re) {
      var m = dadosUlc.match(re);
      return m ? parseFloat(m[1].replace(",", ".")) : NaN;
    }

    var paramsUlc = {
      texto: dadosUlc,
      tempo_semanas: extrairUlc(/(?:tempo|duracao|evolucao)\s*[:=]?\s*(\d+(?:[\.,]\d+)?)\s*sem/i),
      tempo_dias: extrairUlc(/(?:tempo|duracao|evolucao)\s*[:=]?\s*(\d+(?:[\.,]\d+)?)\s*dia/i),
      vesiculas: /(?:ves[ií]cula|pequenas bolhas)/i.test(dadosUlc),
      dor: dadosUlc,
      gestante: /(?:gestante|gravida|grávida)/i.test(dadosUlc),
      alergia_penicilina: /(?:alergia a penicilina|al[eé]rgico|anafilaxia)/i.test(dadosUlc)
    };

    try {
      var analiseUlc = DermatologiaLesoesIstsService.avaliarUlceraGenitalIst(paramsUlc);
      var textUlc = DermatologiaLesoesIstsService.formatarUlcerasGenitaisTelegram(analiseUlc);
      return enviarMensagemParaChat(chatId, textUlc);
    } catch (eUlc) {
      return enviarMensagemParaChat(chatId, "❌ Erro ao avaliar úlcera genital: " + eUlc.message);
    }
  }

  if (comando === "/sifilis" || comando === "/biett" || comando === "/roseola") {
    var dadosSif = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof DermatologiaLesoesIstsService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo DermatologiaLesoesIstsService indisponível temporariamente.");
    }
    if (!dadosSif) {
      return enviarMensagemParaChat(chatId,
        "🩸 *Manejo e Estadiamento da Sífilis (PCDT MS 2026)*\n\n" +
        "Informe o estágio ou achados clínicos e sorológicos.\n\n" +
        "📌 *Parâmetros aceitos:*\n" +
        "• Estágio: `primaria`, `secundaria`, `latente recente`, `latente tardia`, `indeterminada`, `terciaria`\n" +
        "• Achados: `roseola`, `biett`, `palmo-plantar`, `condiloma lata`, `cancro duro`\n" +
        "• Sorologia: `vdrl 1:32`, `vdrl 1:8`, `teste rapido reagente`\n" +
        "• Especiais: `gestante`, `alergia a penicilina`\n\n" +
        "💡 *Exemplos beira-leito:*\n" +
        "• `/sifilis secundaria lesoes palmoplantares colarete de biett vdrl 1:64`\n" +
        "• `/sifilis primaria cancro duro vdrl 1:16`\n" +
        "• `/sifilis latente tardia sem sintomas vdrl 1:8 gestante`\n" +
        "• `/sifilis secundaria alergia a penicilina`");
    }

    var paramsSif = {
      texto: dadosSif,
      estagio: dadosSif,
      vdrl: dadosSif,
      gestante: /(?:gestante|gravida|grávida)/i.test(dadosSif),
      alergia_penicilina: /(?:alergia a penicilina|al[eé]rgico|anafilaxia)/i.test(dadosSif)
    };

    try {
      var analiseSif = DermatologiaLesoesIstsService.avaliarSifilisManejo(paramsSif);
      var textSif = DermatologiaLesoesIstsService.formatarSifilisTelegram(analiseSif);
      return enviarMensagemParaChat(chatId, textSif);
    } catch (eSif) {
      return enviarMensagemParaChat(chatId, "❌ Erro ao avaliar sífilis: " + eSif.message);
    }
  }

  if (comando === "/mpox" || comando === "/monkeypox") {
    var dadosMpox = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof DermatologiaLesoesIstsService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo DermatologiaLesoesIstsService indisponível temporariamente.");
    }
    if (!dadosMpox) {
      return enviarMensagemParaChat(chatId,
        "🐵 *Mpox (Monkeypox) — Manejo Clínico & Biossegurança*\n\n" +
        "Descreva a suspeita clínica de Mpox.\n\n" +
        "📌 *Achados avaliados:*\n" +
        "• Lesões: `vesiculas umbilicadas`, `pustulas`, `crostas`, `genital`, `face`, `perianal`\n" +
        "• Sintomas: `febre`, `linfonodomegalia dolorosa`, `proctite / dor ao evacuar`\n" +
        "• Modificadores: `hiv / imunossuprimido`, `dias de evolucao`\n\n" +
        "💡 *Exemplos beira-leito:*\n" +
        "• `/mpox febre linfonodomegalia dolorosa vesiculas umbilicadas perianal`\n" +
        "• `/mpox proctite intensa dor retal pustulas umbilicadas hiv`");
    }

    var paramsMpox = {
      texto: dadosMpox,
      febre: /(?:febre|febril)/i.test(dadosMpox),
      linfonodomegalia: /(?:linfonodo|adenomegalia|ganglio|inguinal|cervical)/i.test(dadosMpox),
      vesiculas_umbilicadas: /(?:umbilicad|centro deprimido|pustula)/i.test(dadosMpox),
      proctite: /(?:proctite|retal|anus|[aâ]nus|dor ao evacuar)/i.test(dadosMpox),
      imunossuprimido: /(?:imunossup|hiv|cd4)/i.test(dadosMpox)
    };

    try {
      var analiseMpox = DermatologiaLesoesIstsService.avaliarMpox(paramsMpox);
      var textMpox = DermatologiaLesoesIstsService.formatarMpoxTelegram(analiseMpox);
      return enviarMensagemParaChat(chatId, textMpox);
    } catch (eMpox) {
      return enviarMensagemParaChat(chatId, "❌ Erro ao avaliar Mpox: " + eMpox.message);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // EPIDEMIOLOGIA & INFECTOLOGIA: ARBOVIROSES (DENGUE MS 2024, CHIKUNGUNYA & ZIKA)
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/dengue" || comando === "/arbovirose" || comando === "/chikungunya" || comando === "/zika") {
    var dadosDengue = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof ArbovirosesDengueService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo ArbovirosesDengueService indisponível temporariamente.");
    }
    if (!dadosDengue) {
      if (typeof enviarMenuEmergDengue === "function") {
        return enviarMenuEmergDengue(chatId);
      }
      var msgAjudaDengue = "🦟 *Manejo Clínico de Dengue & Arboviroses (MS 2024)*\n\n" +
        "Digite o comando seguido do peso e achados clínicos (sinais de alarme/choque).\n\n" +
        "📌 *Exemplos beira-leito:*\n" +
        "• `/dengue 70kg sem alarme` (Grupo A — Hidratação oral 60 mL/kg/dia)\n" +
        "• `/dengue 65kg gestante dm has` (Grupo B — Observação e hemograma)\n" +
        "• `/dengue 80kg dor abdominal intensa vomitos persistentes` (Grupo C — SF 10 mL/kg/h)\n" +
        "• `/dengue 75kg choque hipotensao pulso fino` (Grupo D — SF 20 mL/kg em 20 min bolus)";
      var kbAjudaDengue = (typeof botoesBot === "function") ? botoesBot([
        [['🔙 Sala Vermelha', 'ux:sala'], ['🏠 Início', 'ux:hub:inicio']]
      ]) : null;
      if (kbAjudaDengue && typeof enviarMensagemComTecladoParaChat === "function") {
        return enviarMensagemComTecladoParaChat(chatId, msgAjudaDengue, kbAjudaDengue);
      }
      return enviarMensagemParaChat(chatId, msgAjudaDengue);
    }
    try {
      var paramsDengue = ArbovirosesDengueService.extrairParametrosTexto(dadosDengue);
      var estagioDengue = ArbovirosesDengueService.estadiarDengue(paramsDengue);
      var txtDengue = ArbovirosesDengueService.formatarTextoTelegram(estagioDengue);
      var cacheD = (typeof uxCache === "function") ? uxCache() : CacheService.getScriptCache();
      var ckD = Utilities.getUuid().replace(/-/g, '');
      safePutCache(cacheD, ckD, txtDengue, 21600);
      var kbD = (typeof botoesBot === "function") ? botoesBot([
        [['📋 Copiar para Prontuário', 'ux:copiar:' + ckD]],
        [['🔙 Sala Vermelha', 'ux:sala'], ['🏠 Início', 'ux:hub:inicio']]
      ]) : (typeof obterBotoesNavegacaoPadrao === "function" ? obterBotoesNavegacaoPadrao() : null);
      if (kbD && typeof enviarMensagemComTecladoParaChat === "function") {
        return enviarMensagemComTecladoParaChat(chatId, txtDengue, kbD);
      }
      return enviarMensagemParaChat(chatId, txtDengue);
    } catch (eDengue) {
      return enviarMensagemParaChat(chatId, "❌ Erro ao estadiar dengue: " + eDengue.message);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PNEUMOLOGIA & EMERGÊNCIA: PNEUMONIA ADQUIRIDA NA COMUNIDADE (PAC & CURB-65)
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/pac" || comando === "/pneumonia" || comando === "/curb" || comando === "/curb65" || comando === "/crb65") {
    var dadosPac = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof PneumologiaPacService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo PneumologiaPacService indisponível temporariamente.");
    }
    if (!dadosPac) {
      return enviarMensagemParaChat(chatId,
        "🫁 *Pneumonia Adquirida na Comunidade (PAC & CURB-65)*\n\n" +
        "Digite o comando com as variáveis do CURB-65 (Confusão, Ureia > 50, FR ≥ 30, PA < 90/60, Idade ≥ 65).\n\n" +
        "📌 *Exemplos beira-leito:*\n" +
        "• `/pac 45 anos pa 120x80 fr 18 sem confusao` (CURB-65 0 — Ambulatório)\n" +
        "• `/pac 70 anos pa 110x70 fr 24 ureia 35` (CURB-65 1 — Ambulatório)\n" +
        "• `/pac 72 anos pa 85x55 fr 32 confusao ureia 65` (CURB-65 5 — Internação/UTI)");
    }
    try {
      var paramsPac = PneumologiaPacService.extrairParametrosTexto(dadosPac);
      var calcPac = PneumologiaPacService.calcularCurb65(paramsPac);
      var txtPac = PneumologiaPacService.formatarTextoTelegram(calcPac);
      return enviarMensagemParaChat(chatId, txtPac);
    } catch (ePac) {
      return enviarMensagemParaChat(chatId, "❌ Erro ao calcular PAC/CURB-65: " + ePac.message);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // INFECTOLOGIA & UROLOGIA: INFECÇÃO DO TRATO URINÁRIO (ITU, CISTITE, PIELO)
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/itu" || comando === "/cistite" || comando === "/pielonefrite" || comando === "/infeccaourinaria") {
    var dadosItu = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof InfectologiaItuService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo InfectologiaItuService indisponível temporariamente.");
    }
    if (!dadosItu) {
      return enviarMensagemParaChat(chatId,
        "🦠 *Infecção do Trato Urinário (ITU, Cistite & Pielonefrite)*\n\n" +
        "Informe os sintomas e o perfil do paciente (mulher, gestante, homem, pielonefrite).\n\n" +
        "📌 *Exemplos beira-leito:*\n" +
        "• `/itu disuria polaciuria mulher` (Cistite não complicada — Fosfomicina 3g DU ou Nitrofurantoína)\n" +
        "• `/itu gestante 28 semanas bacteriuria disuria` (Cistite na gestação — Fosfomicina ou Cefalexina)\n" +
        "• `/pielonefrite febre dor lombar giordano positivo sem sepse` (Pielonefrite ambulatorial — Ceftriaxona + Cipro)\n" +
        "• `/itu homem 62 anos disuria jato fraco` (ITU masculina — Cipro 14 dias)");
    }
    try {
      var paramsItu = InfectologiaItuService.extrairParametrosTexto(dadosItu);
      var condutaItu = InfectologiaItuService.conduzirItu(paramsItu);
      var txtItu = InfectologiaItuService.formatarTextoTelegram(condutaItu);
      return enviarMensagemParaChat(chatId, txtItu);
    } catch (eItu) {
      return enviarMensagemParaChat(chatId, "❌ Erro ao orientar ITU: " + eItu.message);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CARDIOLOGIA & EMERGÊNCIA: CRISE HIPERTENSIVA & PSEUDOCRISE (SBC 2024)
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/crisehipertensiva" || comando === "/pseudocrise" || comando === "/emergenciahipertensiva" || comando === "/crisehas") {
    var dadosHas = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof EmergenciaCriseHipertensivaService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo EmergenciaCriseHipertensivaService indisponível temporariamente.");
    }
    if (!dadosHas) {
      if (typeof enviarMenuEmergCriseHas === "function") {
        return enviarMenuEmergCriseHas(chatId);
      }
      var msgAjudaHas = "❤️ *Crise Hipertensiva vs Pseudocrise (SBC / AHA)*\n\n" +
        "Informe a PA aferida e presença de sintomas ou lesão de órgão-alvo.\n\n" +
        "📌 *Exemplos beira-leito:*\n" +
        "• `/crisehipertensiva 190x110 cefaleia tensional ansiedade dor` (Pseudocrise — Repouso e analgesia)\n" +
        "• `/crisehipertensiva 200x120 assintomatico sem lesao de orgao` (Urgência — Captopril/Clonidina VO)\n" +
        "• `/crisehipertensiva 220x130 eap dispneia crepitacoes` (Emergência — Nitroglicerina/Nitroprussiato + VNI)\n" +
        "• `/crisehipertensiva 210x120 disseccao dor rasgando torax` (Dissecção — Esmolol + Nitroprussiato PAS < 120 em 20 min)";
      var kbAjudaHas = (typeof botoesBot === "function") ? botoesBot([
        [['🔙 Sala Vermelha', 'ux:sala'], ['🏠 Início', 'ux:hub:inicio']]
      ]) : null;
      if (kbAjudaHas && typeof enviarMensagemComTecladoParaChat === "function") {
        return enviarMensagemComTecladoParaChat(chatId, msgAjudaHas, kbAjudaHas);
      }
      return enviarMensagemParaChat(chatId, msgAjudaHas);
    }
    try {
      var paramsHas = EmergenciaCriseHipertensivaService.extrairParametrosTexto(dadosHas);
      var classifHas = EmergenciaCriseHipertensivaService.classificarCrise(paramsHas);
      var txtHas = EmergenciaCriseHipertensivaService.formatarTextoTelegram(classifHas);
      var cacheHas = (typeof uxCache === "function") ? uxCache() : CacheService.getScriptCache();
      var ckHas = Utilities.getUuid().replace(/-/g, '');
      safePutCache(cacheHas, ckHas, txtHas, 21600);
      var kbHas = (typeof botoesBot === "function") ? botoesBot([
        [['📋 Copiar para Prontuário', 'ux:copiar:' + ckHas]],
        [['🔙 Sala Vermelha', 'ux:sala'], ['🏠 Início', 'ux:hub:inicio']]
      ]) : (typeof obterBotoesNavegacaoPadrao === "function" ? obterBotoesNavegacaoPadrao() : null);
      if (kbHas && typeof enviarMensagemComTecladoParaChat === "function") {
        return enviarMensagemComTecladoParaChat(chatId, txtHas, kbHas);
      }
      return enviarMensagemParaChat(chatId, txtHas);
    } catch (eHas) {
      return enviarMensagemParaChat(chatId, "❌ Erro ao classificar crise hipertensiva: " + eHas.message);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // NEUROLOGIA & EMERGÊNCIA: CEFALEIAS AGUDAS & BANDEIRAS VERMELHAS SNOOP
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/cefaleia" || comando === "/dorcabeca" || comando === "/enxaqueca") {
    var dadosCef = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof NeurologiaCefaleiasService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo NeurologiaCefaleiasService indisponível temporariamente.");
    }
    if (!dadosCef) {
      if (typeof enviarMenuEmergCefaleia === "function") {
        return enviarMenuEmergCefaleia(chatId);
      }
      var msgAjudaCef = "🤕 *Cefaleia Aguda no Pronto Socorro & Protocolo SNOOP*\n\n" +
        "Descreva as características da dor de cabeça e sinais associados.\n\n" +
        "📌 *Exemplos beira-leito:*\n" +
        "• `/cefaleia hemicraniana pulsatil nausea fotofobia habitual` (Primária — Dipirona + Plasil + Dexa)\n" +
        "• `/cefaleia thunderclap trovoada inicio subito pior dor da vida` (HSA — TC sem contraste imediata)\n" +
        "• `/cefaleia febre rigidez de nuca vomitos` (Meningite — TC + Punção lombar + Ceftriaxona)\n" +
        "• `/cefaleia 68 anos inicio recente dor temporal` (Arterite Temporal — VHS/PCR + Corticoide)";
      var kbAjudaCef = (typeof botoesBot === "function") ? botoesBot([
        [['🔙 Sala Vermelha', 'ux:sala'], ['🏠 Início', 'ux:hub:inicio']]
      ]) : null;
      if (kbAjudaCef && typeof enviarMensagemComTecladoParaChat === "function") {
        return enviarMensagemComTecladoParaChat(chatId, msgAjudaCef, kbAjudaCef);
      }
      return enviarMensagemParaChat(chatId, msgAjudaCef);
    }
    try {
      var paramsCef = NeurologiaCefaleiasService.extrairParametrosTexto(dadosCef);
      var avalCef = NeurologiaCefaleiasService.avaliarBandeirasVermelhas(paramsCef);
      var txtCef = NeurologiaCefaleiasService.formatarTextoTelegram(avalCef);
      var cacheCef = (typeof uxCache === "function") ? uxCache() : CacheService.getScriptCache();
      var ckCef = Utilities.getUuid().replace(/-/g, '');
      safePutCache(cacheCef, ckCef, txtCef, 21600);
      var kbCef = (typeof botoesBot === "function") ? botoesBot([
        [['📋 Copiar para Prontuário', 'ux:copiar:' + ckCef]],
        [['🔙 Sala Vermelha', 'ux:sala'], ['🏠 Início', 'ux:hub:inicio']]
      ]) : (typeof obterBotoesNavegacaoPadrao === "function" ? obterBotoesNavegacaoPadrao() : null);
      if (kbCef && typeof enviarMensagemComTecladoParaChat === "function") {
        return enviarMensagemComTecladoParaChat(chatId, txtCef, kbCef);
      }
      return enviarMensagemParaChat(chatId, txtCef);
    } catch (eCef) {
      return enviarMensagemParaChat(chatId, "❌ Erro ao avaliar cefaleia: " + eCef.message);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CIRURGIA & TRAUMA: PEQUENAS URGÊNCIAS, OTTAWA, ANESTESIA & PROFILAXIAS
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/sutura" || comando === "/ottawa" || comando === "/tetano" || comando === "/raiva" || comando === "/mordedura" || comando === "/ferimento") {
    var dadosTrauma = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof PequenasUrgenciasTraumaService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo PequenasUrgenciasTraumaService indisponível temporariamente.");
    }
    if (!dadosTrauma) {
      return enviarMensagemParaChat(chatId,
        "🩹 *Pequenas Urgências, Suturas & Profilaxias de Trauma*\n\n" +
        "Informe os achados do trauma, peso ou histórico vacinal.\n\n" +
        "📌 *Exemplos beira-leito:*\n" +
        "• `/ottawa entorse tornozelo dor maleolo lateral incapacidade 4 passos` (Indicação de Rx)\n" +
        "• `/sutura 70kg ferimento face anestesia` (Dose máxima de lidocaína e fio 5-0/6-0)\n" +
        "• `/tetano ferimento sujo terra 1 dose ha 8 anos` (Vacina dT + SAT/IGHAT)\n" +
        "• `/raiva mordedura morcego na mao` (Risco máximo — Soro SAR + Vacina 4 doses)\n" +
        "• `/mordedura mordedura de cao na perna` (Não suturar + Amoxicilina/Clavulanato)");
    }
    try {
      var paramsTrauma = PequenasUrgenciasTraumaService.extrairParametrosTexto(dadosTrauma);
      var txtTrauma = PequenasUrgenciasTraumaService.formatarTextoTelegram(paramsTrauma);
      return enviarMensagemParaChat(chatId, txtTrauma);
    } catch (eTrauma) {
      return enviarMensagemParaChat(chatId, "❌ Erro em pequenas urgências: " + eTrauma.message);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MEDICINA LEGAL & EPIDEMIOLOGIA: DECLARAÇÃO DE ÓBITO & NOTIFICAÇÃO COMPULSÓRIA
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/obito" || comando === "/declaracaoobito" || comando === "/do" || comando === "/notificacao" || comando === "/sinan") {
    var dadosObito = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof MedicinaLegalObitoService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo MedicinaLegalObitoService indisponível temporariamente.");
    }
    if (!dadosObito) {
      return enviarMensagemParaChat(chatId,
        "📄 *Declaração de Óbito & Notificação Compulsória (CFM 1.779/2005 & SINAN)*\n\n" +
        "Informe o tipo de óbito ou circunstância clínica.\n\n" +
        "📌 *Exemplos beira-leito:*\n" +
        "• `/obito natural internado choque septico pneumonia` (DO pelo assistente/plantonista)\n" +
        "• `/obito violenta acidente de transito queda trauma` (IML obrigatório — Proibido DO hospitalar)\n" +
        "• `/obito sem assistencia morte subita em domicilio sem diagnostico` (SVO)\n" +
        "• `/notificacao dengue grave meningite raiva mpox` (Lista de notificação imediata 24h)");
    }
    try {
      var paramsObito = MedicinaLegalObitoService.extrairParametrosTexto(dadosObito);
      var txtObito = MedicinaLegalObitoService.formatarTextoTelegram(paramsObito);
      return enviarMensagemParaChat(chatId, txtObito);
    } catch (eObito) {
      return enviarMensagemParaChat(chatId, "❌ Erro ao orientar óbito/notificação: " + eObito.message);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CARDIOLOGIA & EMERGÊNCIA: FIBRILAÇÃO ATRIAL E ANTICOAGULAÇÃO
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/fa" || comando === "/fibrilacaoatrial" || comando === "/chascore" || comando === "/hasbled") {
    var dadosFa = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof CardiologiaFaAnticoagulacaoService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo CardiologiaFaAnticoagulacaoService indisponível temporariamente.");
    }

    if (!dadosFa) {
      return enviarMensagemParaChat(chatId, "🫀 *CARDIOLOGIA & EMERGÊNCIA — FIBRILAÇÃO ATRIAL*\n\n" +
        "Envie os dados clínicos do paciente para avaliação de CHA2DS2-VASc, HAS-BLED e conduta:\n" +
        "• *Idade e Sexo:* `68 anos`, `mulher`\n" +
        "• *Comorbidades:* `HAS`, `DM`, `IC`, `AVC prévio`, `IAM`\n" +
        "• *Risco Hemorrágico:* `insuficiência renal`, `cirrose`, `uso de AINE`, `sangramento prévio`\n" +
        "• *Estabilidade e Duração:* `choque`, `pam < 60`, `< 48h`, `> 48h`\n" +
        "• *Valvopatia:* `prótese metálica`, `estenose mitral`\n\n" +
        "*Exemplos:*\n" +
        "• `/fa 72 anos m has dm ic <48h` *(Acesso rápido conduta <48h)*\n" +
        "• `/fa 68 anos f has avc prévio pam < 60 prótese metálica` *(Choque e Valvar)*\n" +
        "• `/fa 55 anos m has insuficiência renal >48h` *(Risco hemorrágico e >48h)*");
    }

    try {
      var paramsFa = CardiologiaFaAnticoagulacaoService.extrairParametrosTexto(dadosFa);
      var analiseFa = CardiologiaFaAnticoagulacaoService.avaliar(paramsFa);
      return enviarMensagemParaChat(chatId, CardiologiaFaAnticoagulacaoService.formatarTextoTelegram(analiseFa));
    } catch (eFa) {
      return enviarMensagemParaChat(chatId, "⚠️ Erro ao avaliar Fibrilação Atrial: " + eFa.message);
    }
  }

  // CARDIOLOGIA: INSUFICIÊNCIA CARDÍACA CRÔNICA (SBC/ESC/AHA)
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/icc" || comando === "/insuficienciacardiaca" || comando === "/framingham" || comando === "/quarteto") {
    var dadosIcc = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof CardiologiaIcCronicaService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo CardiologiaIcCronicaService indisponível temporariamente.");
    }

    if (!dadosIcc) {
      return enviarMensagemParaChat(chatId, "🫀 *CARDIOLOGIA — INSUFICIÊNCIA CARDÍACA CRÔNICA*\n\n" +
        "Envie os dados clínicos para diagnóstico (Framingham), estratificação (FEVE/NYHA) e prescrição do Quarteto Fantástico:\n" +
        "• *Critérios Framingham:* `dpn`, `ortopneia`, `tjp`, `estertores`, `b3`, `edema mmii`, `cardiomegalia`\n" +
        "• *Ecocardiograma:* `feve 35%`, `feve 55%`\n" +
        "• *Exames e Parâmetros:* `k 4.5`, `clcr 50`, `pas 110`, `fc 72`\n" +
        "• *Fármacos em uso:* `em uso de enalapril`, `washout 36h`, `angioedema previo`\n\n" +
        "*Exemplos:*\n" +
        "• `/icc feve 32% nyha 3 dpn tjp estertores k 4.3 clcr 60 pas 120` *(Quarteto Fantástico completo)*\n" +
        "• `/icc feve 30% enalapril sem washout k 4.6` *(Bloqueio de ARNI por washout < 36h)*\n" +
        "• `/icc feve 28% k 5.3 clcr 25` *(Bloqueios de Espironolactona por hipercalemia/renal)*");
    }

    try {
      var paramsIcc = CardiologiaIcCronicaService.extrairParametrosTexto(dadosIcc);
      var analiseIcc = CardiologiaIcCronicaService.avaliar(paramsIcc);
      return enviarMensagemParaChat(chatId, CardiologiaIcCronicaService.formatarTextoTelegram(analiseIcc));
    } catch (eIcc) {
      return enviarMensagemParaChat(chatId, "⚠️ Erro ao avaliar Insuficiência Cardíaca: " + eIcc.message);
    }
  }

  // OFTALMOLOGIA DE EMERGÊNCIA: TRAUMA OCULAR, GLAUCOMA AGUDO E QUEIMADURAS
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/oftalmo" || comando === "/glaucoma" || comando === "/queimaduraocular" || comando === "/traumaocular") {
    var dadosOftalmo = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof OftalmologiaEmergenciaService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo OftalmologiaEmergenciaService indisponível temporariamente.");
    }

    if (!dadosOftalmo) {
      return enviarMensagemParaChat(chatId, "👁️ *OFTALMOLOGIA DE EMERGÊNCIA — PRONTO ATENDIMENTO*\n\n" +
        "Envie os dados clínicos para avaliação de Queimaduras Químicas, Glaucoma Agudo ou Trauma Ocular:\n" +
        "• *Queimadura Química:* `queimadura por soda caustica`, `cal nos olhos`, `cimento`, `acido de bateria`, `pH 9.5`\n" +
        "• *Glaucoma Agudo:* `dor ocular intensa`, `olho vermelho`, `halos coloridos`, `PIO 55`, `nauseas e vomitos`\n" +
        "• *Trauma Ocular:* `pupila em gota`, `seidel positivo`, `hifema`, `perfuracao ocular`, `blowout`, `fratura de orbita`\n\n" +
        "*Exemplos:*\n" +
        "• `/oftalmo queimadura por soda caustica cal nos olhos pH 10` *(Irrigação profusa imediata com RL/SF)*\n" +
        "• `/oftalmo dor ocular severa olho vermelho midriase fixa PIO 50` *(Glaucoma Agudo: Acetazolamida + Manitol + Regra da Pilocarpina)*\n" +
        "• `/oftalmo trauma com estilhaco pupila em gota seidel positivo` *(Globo aberto: Shield rígido, NPO e proibir compressão)*");
    }

    try {
      var paramsOftalmo = OftalmologiaEmergenciaService.extrairParametrosTexto(dadosOftalmo);
      var analiseOftalmo = OftalmologiaEmergenciaService.avaliar(paramsOftalmo);
      return enviarMensagemParaChat(chatId, OftalmologiaEmergenciaService.formatarTextoTelegram(analiseOftalmo));
    } catch (eOftalmo) {
      return enviarMensagemParaChat(chatId, "⚠️ Erro ao avaliar Emergência Oftalmológica: " + eOftalmo.message);
    }
  }

  // OTORRINOLARINGOLOGIA DE EMERGÊNCIA: VERTIGEM (PROTOCOLO HINTS) E EPISTAXE
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/vertigem" || comando === "/hints" || comando === "/tontura" || comando === "/vppb") {
    var dadosVertigem = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof OtorrinoEpistaxeVertigemService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo OtorrinoEpistaxeVertigemService indisponível temporariamente.");
    }

    if (!dadosVertigem) {
      return enviarMensagemParaChat(chatId, "🌀 *OTORRINOLARINGOLOGIA — VERTIGEM & PROTOCOLO HINTS*\n\n" +
        "Envie os achados clínicos para avaliação de Síndrome Vestibular Aguda (AVC vs Neurite) ou VPPB:\n" +
        "• *Head Impulse (Halmagyi):* `impulso normal`, `impulso anormal`, `sacada presente`\n" +
        "• *Nistagmo:* `unidirecional horizontal`, `bidirecional`, `vertical downbeat`, `gaze-evoked`\n" +
        "• *Test of Skew:* `skew presente`, `desvio vertical`, `sem skew`\n" +
        "• *Audição (HINTS-Plus):* `surdez subita`, `perda auditiva aguda unilateral`\n" +
        "• *Posicional:* `dix-hallpike positivo`, `duracao 30 segundos`, `ao virar na cama`\n\n" +
        "*Exemplos beira-leito:*\n" +
        "• `/vertigem vertigem continua impulso normal nistagmo bidirecional` *(Alto risco de AVC de Fossa Posterior)*\n" +
        "• `/vertigem vertigem continua impulso anormal com sacada nistagmo horizontal unidirecional sem skew` *(Neurite Vestibular Benigna)*\n" +
        "• `/vertigem tontura episodica dura segundos ao virar na cama dix-hallpike positivo` *(VPPB / Manobra de Epley)*");
    }

    try {
      var analiseVertigem = OtorrinoEpistaxeVertigemService.avaliarVertigemHints({ texto: dadosVertigem });
      return enviarMensagemParaChat(chatId, OtorrinoEpistaxeVertigemService.formatarVertigemHintsTelegram(analiseVertigem));
    } catch (eVert) {
      return enviarMensagemParaChat(chatId, "⚠️ Erro ao avaliar Vertigem: " + eVert.message);
    }
  }

  if (comando === "/epistaxe" || comando === "/sangramentonasal" || comando === "/tamponamento") {
    var dadosEpistaxe = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof OtorrinoEpistaxeVertigemService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo OtorrinoEpistaxeVertigemService indisponível temporariamente.");
    }

    if (!dadosEpistaxe) {
      return enviarMensagemParaChat(chatId, "🩸 *OTORRINOLARINGOLOGIA — MANEJO ESCALONADO DE EPISTAXE*\n\n" +
        "Envie os dados clínicos para protocolo escalonado beira-leito:\n" +
        "• *Localização:* `anterior`, `posterior`, `escorre na garganta`\n" +
        "• *Gravidade:* `sangramento profuso`, `choque`, `falha de compressao`, `falha do tampao anterior`\n" +
        "• *Pressão Arterial:* `PA 190x100`, `PAS 200`\n" +
        "• *Medicações:* `varfarina RNI 4.2`, `rivaroxabana`, `aas`, `clopidogrel`\n\n" +
        "*Exemplos beira-leito:*\n" +
        "• `/epistaxe sangramento septo anterior PA 140x80` *(Compressão + Vasoconstritor + Cauterização unilateral)*\n" +
        "• `/epistaxe posterior volumoso escorre pela garganta falha de tamponamento anterior` *(Tamponamento posterior com Sonda de Foley + Água Destilada)*\n" +
        "• `/epistaxe anterior varfarina RNI 4.8 PA 180x100` *(Conduta hemostática, vitamina K1 e analgesia)*");
    }

    try {
      var pasMatch = dadosEpistaxe.match(/(?:pa|pas)\s*[:=]?\s*(\d{2,3})(?:\s*[xX/]\s*(\d{2,3}))?/i);
      var pasVal = pasMatch ? parseFloat(pasMatch[1]) : 0;
      var padVal = pasMatch && pasMatch[2] ? parseFloat(pasMatch[2]) : 0;
      var rniMatch = dadosEpistaxe.match(/rni\s*[:=]?\s*(\d+(?:[\.,]\d+)?)/i);
      var rniVal = rniMatch ? parseFloat(rniMatch[1].replace(",", ".")) : 0;

      var paramsEpistaxe = {
        texto: dadosEpistaxe,
        paSistolica: pasVal,
        paDiastolica: padVal,
        rni: rniVal
      };

      var analiseEpistaxe = OtorrinoEpistaxeVertigemService.avaliarEpistaxe(paramsEpistaxe);
      return enviarMensagemParaChat(chatId, OtorrinoEpistaxeVertigemService.formatarEpistaxeTelegram(analiseEpistaxe));
    } catch (eEpist) {
      return enviarMensagemParaChat(chatId, "⚠️ Erro ao avaliar Epistaxe: " + eEpist.message);
    }
  }

  // PEDIATRIA: BRONQUIOLITE VIRAL AGUDA
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/bronquiolite" || comando === "/bva" || comando === "/bronquioliteviral" || comando === "/cnaf") {
    var dadosBronq = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof PediatriaBronquioliteService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo PediatriaBronquioliteService indisponível temporariamente.");
    }

    if (!dadosBronq) {
      return enviarMensagemParaChat(chatId, "👶 *PEDIATRIA — BRONQUIOLITE VIRAL AGUDA*\n\n" +
        "Envie os dados clínicos para avaliação de gravidade, suporte respiratório e venoso:\n" +
        "• *Idade e Peso:* `6 meses`, `8 kg`\n" +
        "• *Sinais Vitais:* `FR 65`, `SpO2 88`\n" +
        "• *Exame Físico:* `tiragem moderada`, `gemência`, `exaustão`, `sibilos difusos`\n\n" +
        "*Exemplos:*\n" +
        "• `/bronquiolite 6 meses 8kg FR 45 SpO2 96 tiragem leve sibilos` *(Leve)*\n" +
        "• `/bronquiolite 2 meses 5kg FR 70 SpO2 89 exaustao` *(Grave/UTI/NPO)*");
    }

    try {
      var paramsBronq = PediatriaBronquioliteService.extrairParametrosTexto(dadosBronq);
      var analiseBronq = PediatriaBronquioliteService.avaliar(paramsBronq);
      return enviarMensagemParaChat(chatId, PediatriaBronquioliteService.formatarTextoTelegram(analiseBronq));
    } catch (eBronq) {
      return enviarMensagemParaChat(chatId, "⚠️ Erro ao avaliar Bronquiolite: " + eBronq.message);
    }
  }

  
  // GINECOLOGIA ENDÓCRINA & CIRÚRGICA: ENDOMETRIOSE E DOR PÉLVICA CRÔNICA
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/endometriose" || comando === "/dienogeste" || comando === "/dorpelvica") {
    var dadosEndo = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof GinecologiaEndometrioseService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo GinecologiaEndometrioseService indisponível temporariamente.");
    }

    if (!dadosEndo) {
      return enviarMensagemParaChat(chatId, "🎗️ *GINECOLOGIA — ENDOMETRIOSE E DOR PÉLVICA CRÔNICA*\n\n" +
        "Envie os dados clínicos para avaliação sindrômica (6 Ds), conduta de 1ª/2ª linha e decisão cirúrgica vs FIV:\n" +
        "• *Sintomas:* `dismenorreia`, `dispareunia de profundidade`, `disquezia`, `disúria`, `dor pélvica crônica`\n" +
        "• *Desejo Reprodutivo:* `tentando engravidar`, `infertilidade`, `AMH 0.8`\n" +
        "• *Imagem / Achados:* `endometrioma 5cm`, `hidronefrose`, `nódulo retal`, `trompas obstruídas`\n" +
        "• *Outros:* `contraindicação a estrogênio`, `enxaqueca com aura`\n\n" +
        "*Exemplos:*\n" +
        "• `/endometriose dismenorreia severa dispareunia EVA 8 sem desejo gestacional` *(1ª linha Dienogeste)*\n" +
        "• `/endometriose 36 anos tentando engravidar endometrioma 4cm bilateral AMH 0.7` *(Indicação FIV)*\n" +
        "• `/endometriose nodulo retal hidronefrose ureteral` *(Cirurgia especializada urgente)*");
    }

    try {
      var paramsEndo = GinecologiaEndometrioseService.extrairParametrosTexto(dadosEndo);
      var analiseEndo = GinecologiaEndometrioseService.avaliar(paramsEndo);
      return enviarMensagemParaChat(chatId, GinecologiaEndometrioseService.formatarTextoTelegram(analiseEndo));
    } catch (eEndo) {
      return enviarMensagemParaChat(chatId, "⚠️ Erro ao avaliar Endometriose: " + eEndo.message);
    }
  }

  // OBSTETRÍCIA & REUMATOLOGIA: SAF E TROMBOFILIAS NA GESTAÇÃO
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/saf" || comando === "/antifosfolipidio" || comando === "/safgestante" || comando === "/trombofiliagestante" || comando === "/trombofilia" || comando === "/enoxaparina") {
    var dadosSaf = texto.replace(/^\/\w+\s*/, "").trim();
    var serviceSaf = typeof ObstetriciaSafTrombofiliasService !== "undefined"
      ? ObstetriciaSafTrombofiliasService
      : (typeof ObstetriciaSafService !== "undefined" ? ObstetriciaSafService : null);
    if (!serviceSaf) {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo ObstetriciaSafTrombofiliasService indisponível temporariamente.");
    }

    if (!dadosSaf) {
      return enviarMensagemParaChat(chatId, "🩸 *OBSTETRÍCIA & REUMATOLOGIA — SAF & TROMBOFILIAS NA GESTAÇÃO*\n\n" +
        "Envie os dados clínicos para avaliação de critérios de Sydney/ACR-EULAR 2023, protocolo de Enoxaparina + AAS e janelas periparto:\n" +
        "• *Histórico Obstétrico:* `3 abortos precoces`, `obito fetal 24 semanas`, `prematuro 31 semanas pre-eclampsia`\n" +
        "• *Histórico Trombótico:* `TVP previa`, `TEP`, `AVC isquemico`\n" +
        "• *Anticorpos aPL:* `anticoagulante lupico positivo`, `anticardiolipina IgG`, `anti-beta-2-glicoproteina`\n" +
        "• *Trombofilias:* `deficiencia de antitrombina III`, `fator V Leiden homozigoto`, `protrombina`\n" +
        "• *Dados Maternos:* `peso 70kg`, `uso de varfarina`, `refrataria`\n\n" +
        "*Exemplos:*\n" +
        "• `/saf 3 abortos precoces anticoagulante lupico positivo peso 65kg` *(SAF Obstétrica Pura)*\n" +
        "• `/saf TVP previa anticardiolipina e anticoagulante lupico peso 80kg` *(SAF Trombótica - Dose Terapêutica)*\n" +
        "• `/saf perda gestacional em uso de AAS e enoxaparina profilatica` *(SAF Refratária + HCQ)*");
    }

    try {
      var paramsSaf = serviceSaf.extrairParametrosTexto(dadosSaf);
      var analiseSaf = serviceSaf.avaliar(paramsSaf);
      return enviarMensagemParaChat(chatId, serviceSaf.formatarTextoTelegram(analiseSaf));
    } catch (eSaf) {
      return enviarMensagemParaChat(chatId, "⚠️ Erro ao avaliar SAF e Trombofilias: " + eSaf.message);
    }
  }

  // UROLOGIA & NEFROLOGIA: CÓLICA NEFRÉTICA E LITÍASE URINÁRIA
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/colica" || comando === "/colicanefretica" || comando === "/litiase" || comando === "/pedranorim" || comando === "/calculorenal") {
    var dadosColica = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof UrologiaColicaNefreticaService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo UrologiaColicaNefreticaService indisponível temporariamente.");
    }

    if (!dadosColica) {
      return enviarMensagemParaChat(chatId, "🪨 *UROLOGIA & NEFROLOGIA — CÓLICA NEFRÉTICA*\n\n" +
        "Envie os dados clínicos para analgesia escalonada, Terapia Expulsiva (MET) e critérios de descompressão cirúrgica:\n" +
        "• *Cálculo:* `7mm`, `distal`, `proximal`\n" +
        "• *Gravidade:* `rim único`, `anúria`, `sepse`, `febre`, `dor refratária`\n" +
        "• *Paciente:* `clcr 25`, `gestante`\n\n" +
        "*Exemplos:*\n" +
        "• `/colica 6mm distal` *(Terapia Expulsiva e Analgesia)*\n" +
        "• `/colica 12mm anuria rim unico clcr 15` *(Emergência cirúrgica e bloqueio de AINEs)*\n" +
        "• `/colica gestante dor refrataria` *(Alerta gestante e gravidade)*");
    }

    try {
      var paramsColica = UrologiaColicaNefreticaService.extrairParametrosTexto(dadosColica);
      var analiseColica = UrologiaColicaNefreticaService.avaliar(paramsColica);
      return enviarMensagemParaChat(chatId, UrologiaColicaNefreticaService.formatarTextoTelegram(analiseColica));
    } catch (eColica) {
      return enviarMensagemParaChat(chatId, "⚠️ Erro ao avaliar Cólica Nefrética: " + eColica.message);
    }
  }
}


var TABELA_COMANDOS_ENFERMARIA_PLANTAO_RECEITAS_ = {
  "/rx": true, "/receita": true, "/rxh": true, "/prescricao_hospitalar": true,
  "/atb": true, "/ajuste": true, "/ajuste_renal": true, "/dose": true, "/posologia": true, "/hsl": true,
  "/ped": true, "/dose_ped": true, "/pediatria": true, "/conduta_ped": true,
  "/plantao": true, "/sbar": true, "/enfermaria": true, "/leitos": true, "/censo": true,
  "/leito": true, "/alta": true, "/limpar_enfermaria": true, "/passagem": true, "/plantao_fim": true
};

function despacharComandosEnfermariaPlantaoEReceitas_(comando, texto, chatId) {
  if (!TABELA_COMANDOS_ENFERMARIA_PLANTAO_RECEITAS_[comando]) {
    return { executado: false };
  }
  var res = executarComandoEnfermariaPlantaoEReceitasInterno_(comando, texto, chatId);
  return { executado: true, resultado: res };
}

function executarComandoEnfermariaPlantaoEReceitasInterno_(comando, texto, chatId) {
  if (comando === "/rx" || comando === "/receita") {
    return tratarComandoRx(chatId, texto);
  }

  if (comando === "/rxh" || comando === "/prescricao_hospitalar") {
    return tratarComandoRxh(chatId, texto);
  }

  if (comando === "/atb" || comando === "/ajuste" || comando === "/ajuste_renal") {
    var dadosAtb = texto.replace(/^\/(atb|ajuste|ajuste_renal)\s*/i, "").trim();
    if (!dadosAtb) {
      return enviarMensagemComTecladoParaChat(
        chatId,
        "💉 *AJUSTE RENAL DE ANTIMICROBIANOS (GUIA HSL / IDSA)*\n\n" +
        "Envie o antimicrobiano e o clearance de creatinina ou se o paciente está em hemodiálise:\n\n" +
        "💡 *Exemplos:*\n" +
        "• `/atb meropenem clcr 25`\n" +
        "• `/atb vanco 40`\n" +
        "• `/atb pip-tazo clcr 30`\n" +
        "• `/atb cefepime hd`\n" +
        "• `/atb polimixina b 10`",
        {
          inline_keyboard: [
            [{ text: "💊 Meropenem ClCr 25", callback_data: "ux:atb:mero25" }, { text: "💊 Pip-Tazo ClCr 30", callback_data: "ux:atb:tazo30" }],
            [{ text: "💊 Cefepime HD", callback_data: "ux:atb:cefepimehd" }, { text: "💊 Vanco ClCr 40", callback_data: "ux:atb:vanco40" }],
            [{ text: "🔙 Enfermaria", callback_data: "ux:hub:enf" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
          ]
        }
      );
    }
    if (typeof CalculadorasClinicas !== "undefined" && typeof CalculadorasClinicas.calcularAjusteRenalPorTextoLivre === "function") {
      var calcDetAtb = CalculadorasClinicas.calcularAjusteRenalPorTextoLivre(dadosAtb);
      if (calcDetAtb && calcDetAtb.ok && calcDetAtb.dados) {
        var dAtb = calcDetAtb.dados;
        var msgAtb = "💉 *AJUSTE RENAL DE ANTIMICROBIANOS (GUIA HSL / IDSA)*\n\n" +
          "• *Fármaco:* " + dAtb.nomeExibicao + "\n" +
          "• *Dose Padrão:* " + dAtb.dosePadrao + "\n" +
          "• *Dose Ajustada:* `" + dAtb.doseAjustada + "`\n" +
          "• *Condições:* " + (dAtb.hemodialise ? "Em Hemodiálise" : ("ClCr " + (dAtb.clcrInformado !== null ? dAtb.clcrInformado + " mL/min" : "não informado"))) + "\n\n" +
          "💡 *Cuidados Farmacológicos:*\n" + dAtb.cuidados + "\n\n" +
          "🛡️ *Monitorização:*\n" + dAtb.monitorizacao;
        var kbAtb = {
          inline_keyboard: [
            [{ text: "🔙 Ajuste Renal (ATB)", callback_data: "calc_cat_nefro" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
          ]
        };
        return enviarMensagemComTecladoParaChat(chatId, msgAtb, kbAtb);
      }
    }
    return responderConsultaPosologiaHSL(chatId, dadosAtb);
  }

  if (comando === "/dose" || comando === "/posologia" || comando === "/hsl") {
    var termoDose = texto.replace(/^\/(dose|posologia|hsl)\s*/i, "").trim();
    if (!termoDose) {
      return enviarMensagemParaChat(
        chatId,
        "💊 *CONSULTA DE POSOLOGIA OFICIAL (GUIA FARMACÊUTICO HSL & PEDBOOK)*\n\n" +
        "Envie o nome do medicamento para consultar as doses adultas, pediátricas, ajuste renal e disponibilidade na REMUME.\n\n" +
        "💡 *Exemplos:*\n" +
        "• `/dose amoxicilina`\n" +
        "• `/dose dipirona`\n" +
        "• `/dose ceftriaxona`\n" +
        "• `/ped azitromicina` (doses pediátricas dedicadas)\n" +
        "• `/dose amoxicilina 16kg`"
      );
    }
    return responderConsultaPosologiaHSL(chatId, termoDose);
  }

  if (comando === "/ped" || comando === "/dose_ped" || comando === "/pediatria") {
    var termoPed = texto.replace(/^\/(ped|dose_ped|pediatria)\s*/i, "").trim();
    if (!termoPed) {
      return enviarMensagemParaChat(
        chatId,
        "👶 *CONSULTA DE DOSES PEDIÁTRICAS (PEDBOOK pedb.com.br)*\n\n" +
        "Envie o nome do medicamento ou conduta para consultar doses por kg/idade, apresentações líquidas e alertas de segurança.\n\n" +
        "💡 *Exemplos:*\n" +
        "• `/ped amoxicilina`\n" +
        "• `/ped dipirona`\n" +
        "• `/ped azitromicina`\n" +
        "• `/ped cefalexina`\n" +
        "• `/ped bronquiolite`"
      );
    }
    return responderConsultaPediatricaPedB(chatId, termoPed);
  }

  if (comando === "/conduta_ped") {
    var termoCond = texto.replace(/^\/conduta_ped\s*/i, "").trim();
    if (!termoCond) {
      return enviarMensagemParaChat(chatId, "🩺 Envie o tema da conduta pediátrica. Ex: `/conduta_ped bronquiolite` ou `/conduta_ped crup`");
    }
    return responderConsultaCondutaPedB(chatId, termoCond);
  }

  if (comando === "/plantao" || comando === "/sbar") {
    return tratarComandoPlantao(chatId, texto);
  }

  // ENFERMARIA VIRTUAL MULTI-LEITOS
  if (comando === "/enfermaria" || comando === "/leitos" || comando === "/censo") {
    if (typeof mostrarPainelLeitos === "function") {
      return mostrarPainelLeitos(chatId, 0);
    }
    return enviarMensagemComTecladoParaChat(chatId, EnfermariaService.formatarPainelBordo(), construirTecladoHubEnfermaria());
  }

  if (comando === "/leito") {
    var dadosLeito = texto.replace(/^\/leito\s*/i, "").trim();
    if (!dadosLeito) {
      return enviarMensagemComTecladoParaChat(chatId, "🛏️ *ENFERMARIA VIRTUAL · GESTÃO DE LEITOS*\n\n" +
        "• Para ver ou atualizar: `/leito <número> <dados>`\n" +
        "💡 *Exemplo:* `/leito 4 72a, PAC grave, Ceftriaxona D3, aguarda vaga CTI`\n" +
        "• Para ver o leito: `/leito 4`\n" +
        "• Para ver todos: `/censo` ou `/leitos`\n" +
        "• Para desocupar leito: `/alta 4`\n" +
        "• Para passagem geral: `/sbar` ou `/passagem`", {
          inline_keyboard: [
            [{ text: "🏥 Painel de Leitos", callback_data: "ux:painel:0" }, { text: "📋 Passagem SBAR", callback_data: "ux:enf:sbar" }],
            [{ text: "🔙 Enfermaria", callback_data: "ux:hub:enf" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
          ]
        });
    }

    var matchLeito = dadosLeito.match(/^([a-zA-Z0-9_-]{1,24})(?:\s+([\s\S]+))?$/);
    if (matchLeito) {
      var numLeito = matchLeito[1];
      var infoLeito = matchLeito[2];

      if (!infoLeito) {
        var leitoAtual = EnfermariaService.obterLeito(numLeito);
        if (leitoAtual) {
          var textoPepLeito = "LEITO " + numLeito + " · " + leitoAtual.status + " (" + leitoAtual.dataISO + " às " + leitoAtual.atualizadoEm + ")\n\n" + leitoAtual.dados;
          var ckL = Utilities.getUuid().replace(/-/g, "");
          safePutCache(CacheService.getScriptCache(), ckL, textoPepLeito, 21600);
          return enviarMensagemComTecladoParaChat(chatId, "🛏️ *LEITO " + numLeito + "* [" + leitoAtual.status + "]\n" +
            "⏱️ *Atualizado às:* " + leitoAtual.atualizadoEm + "\n" +
            "📝 " + leitoAtual.dados + "\n\n" +
            "💡 Para atualizar: `/leito " + numLeito + " novos dados`\n" +
            "🟢 Para dar alta: `/alta " + numLeito + "`", {
              inline_keyboard: [
                [{ text: "📋 Copiar para Prontuário", callback_data: "ux:copiar:" + ckL }],
                [{ text: "✏️ Evoluir Leito", callback_data: "ux:evoluir:" + numLeito }, { text: "Dar Alta", callback_data: "ux:confirmar:" + numLeito }],
                [{ text: "← Leitos", callback_data: "ux:painel:0" }, { text: "🔙 Enfermaria", callback_data: "ux:hub:enf" }],
                [{ text: "🏠 Início", callback_data: "ux:hub:inicio" }]
              ]
            });
        } else {
          return enviarMensagemComTecladoParaChat(chatId, "⚪ *Leito " + numLeito + " está vago.* Para ocupar, envie `/leito " + numLeito + " dados do paciente`.", {
            inline_keyboard: [
              [{ text: "🏥 Painel de Leitos", callback_data: "ux:painel:0" }],
              [{ text: "🔙 Enfermaria", callback_data: "ux:hub:enf" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
            ]
          });
        }
      }

      var resAtualizacao = EnfermariaService.atualizarLeito(numLeito, infoLeito);
      if (!resAtualizacao || !resAtualizacao.sucesso) {
        return enviarMensagemParaChat(chatId, (resAtualizacao && (resAtualizacao.erro || resAtualizacao.mensagem)) || "Falha ao atualizar leito.");
      }
      var ckAt = Utilities.getUuid().replace(/-/g, "");
      var txtGravado = resAtualizacao.leito ? ("LEITO " + numLeito + " · " + resAtualizacao.leito.status + "\n\n" + resAtualizacao.leito.dados) : (resAtualizacao.mensagem || "");
      safePutCache(CacheService.getScriptCache(), ckAt, txtGravado, 21600);
      return enviarMensagemComTecladoParaChat(chatId, resAtualizacao.mensagem || resAtualizacao.erro, {
        inline_keyboard: [
          [{ text: "📋 Copiar para Prontuário", callback_data: "ux:copiar:" + ckAt }],
          [{ text: "🛏️ Abrir Leito " + numLeito, callback_data: "ux:leito:" + numLeito }, { text: "🏥 Painel de Leitos", callback_data: "ux:painel:0" }],
          [{ text: "🔙 Enfermaria", callback_data: "ux:hub:enf" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
        ]
      });
    }
  }

  if (comando === "/alta") {
    var numAlta = texto.replace(/^\/alta\s*/i, "").trim();
    if (!numAlta) {
      return enviarMensagemComTecladoParaChat(chatId, "🟢 Digite o número do leito a desocupar. Ex: `/alta 4`", {
        inline_keyboard: [
          [{ text: "🏥 Painel de Leitos", callback_data: "ux:painel:0" }],
          [{ text: "🔙 Enfermaria", callback_data: "ux:hub:enf" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
        ]
      });
    }
    var resAlta = EnfermariaService.desocuparLeito(numAlta);
    return enviarMensagemComTecladoParaChat(chatId, resAlta.mensagem, {
      inline_keyboard: [
        [{ text: "🏥 Painel de Leitos", callback_data: "ux:painel:0" }, { text: "📋 Passagem SBAR", callback_data: "ux:enf:sbar" }],
        [{ text: "🔙 Enfermaria", callback_data: "ux:hub:enf" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    });
  }

  if (comando === "/limpar_enfermaria") {
    var resLimpeza = EnfermariaService.limparTudo();
    return enviarMensagemComTecladoParaChat(chatId, resLimpeza.mensagem, {
      inline_keyboard: [
        [{ text: "🏥 Painel de Leitos", callback_data: "ux:painel:0" }],
        [{ text: "🔙 Enfermaria", callback_data: "ux:hub:enf" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    });
  }

  if (comando === "/passagem") {
    if (typeof tratarCallbackEnfSBAR === "function") {
      return tratarCallbackEnfSBAR(chatId);
    }
    var textoConsolidado = EnfermariaService.obterTextoConsolidadoParaPassagem();
    if (!textoConsolidado) {
      return enviarMensagemComTecladoParaChat(chatId,
        "🏥 *Nenhum leito registrado na enfermaria para passar.* Registre os leitos usando `/leito <num> <dados>` antes de gerar a passagem.",
        {
          inline_keyboard: [
            [{ text: "🏥 Painel de Leitos", callback_data: "ux:painel:0" }],
            [{ text: "🔙 Enfermaria", callback_data: "ux:hub:enf" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
          ]
        }
      );
    }
    return processarEEntregarIA(chatId, gerarPassagemPlantaoSBAR, "PASSAGEM GERAL DE PLANTÃO DA ENFERMARIA (TODOS OS LEITOS ATIVOS):\n\n" + textoConsolidado, "plantao");
  }

  if (comando === "/plantao_fim") {
    return gerarResumoFimPlantao(chatId);
  }
}


// ============================================================================
// DESPACHO MODULAR DE CALCULADORAS CLÍNICAS, UTI & EMERGÊNCIA INTENSIVA
// ============================================================================
var TABELA_COMANDOS_CALCULADORAS_UTI_ = {
  "/crcl": true,
  "/clcr": true,
  "/clearance": true,
  "/dhe": true,
  "/eletrolitos": true,
  "/pancreatite": true,
  "/bisap": true,
  "/sca": true,
  "/iam": true,
  "/heart": true,
  "/dapt": true,
  "/intox": true,
  "/toxicologia": true,
  "/avc": true,
  "/trombolise": true,
  "/hic": true,
  "/winter": true,
  "/choque": true,
  "/forrester": true,
  "/ic": true,
  "/gaso": true,
  "/gasometria": true,
  "/aniongap": true,
  "/conduta": true,
  "/sos": true,
  "/calc": true,
  "/interacao": true,
  "/seguranca": true,
  "/crosscheck": true
};

function despacharComandosCalculadorasUTIEEmergenciaIntensiva_(comando, texto, chatId, contextoKey) {
  if (!TABELA_COMANDOS_CALCULADORAS_UTI_[comando]) {
    return { executado: false };
  }
  return {
    executado: true,
    resultado: executarComandoCalculadorasUTIInterno_(comando, texto, chatId, contextoKey)
  };
}

function executarComandoCalculadorasUTIInterno_(comando, texto, chatId, contextoKey) {
  if (!contextoKey) {
    contextoKey = "ctx_" + chatId;
  }
  // NEFROLOGIA: CLEARANCE DE CREATININA (COCKCROFT-GAULT)
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/crcl" || comando === "/clcr" || comando === "/clearance") {
    var dadosCrcl = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof NefrologiaClearanceService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo NefrologiaClearanceService indisponível temporariamente.");
    }

    if (!dadosCrcl) {
      var txtGuiaCrcl = "🧪 *CALCULADORA DE CLEARANCE E AUDITORIA RENAL*\n\n" +
        "Envie a idade, peso, creatinina, sexo e medicamentos para auditar.\n\n" +
        "Exemplos:\n" +
        "▶️ `/crcl 65 anos, 70kg, cr 1.8, masculino`\n" +
        "▶️ `/crcl 80 anos, 55kg, cr 2.1, fem, medicações: vancomicina, cefepime`\n" +
        "▶️ `/clearance 45a, 80kg, cr 3.5, mulher, enoxaparina e metformina`";
      var kbCrcl = {
        inline_keyboard: [
          [
            { text: "🧪 Cockcroft 70kg Cr 1.2 M", callback_data: "calc_Cockcroft" },
            { text: "📊 CKD-EPI (TFG)", callback_data: "calc_CKD" }
          ],
          [
            { text: "🔙 Enfermaria", callback_data: "ux:hub:enf" },
            { text: "🏠 Início", callback_data: "ux:hub:inicio" }
          ]
        ]
      };
      return enviarMensagemComTecladoParaChat(chatId, txtGuiaCrcl, kbCrcl);
    }

    var mIdade = dadosCrcl.match(/(\d+)\s*(?:a|anos?|ano)\b/i) || dadosCrcl.match(/idade\s*[:=]?\s*(\d+)/i) || dadosCrcl.match(/^(\d+)[,\s]/);
    var mPeso = dadosCrcl.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilos?)\b/i) || dadosCrcl.match(/peso\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mCr = dadosCrcl.match(/cr(?:eatinina)?\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mSexo = dadosCrcl.match(/\b(masculino|feminino|mulher|homem|masc|fem|m|f)\b/i);

    var idadeCrcl = mIdade ? parseInt(mIdade[1], 10) : null;
    var pesoCrcl = mPeso ? parseFloat(mPeso[1].replace(',', '.')) : null;
    var cr = mCr ? parseFloat(mCr[1].replace(',', '.')) : null;
    var sexoInformado = !!mSexo;
    var sexoCrcl = (mSexo && (mSexo[1].toLowerCase().startsWith('f') || mSexo[1].toLowerCase() === 'mulher')) ? 'F' : 'M';

    // Suporte posicional rápido: ex: 68 70 1.4 ou 68 70 1.4 fem
    if (idadeCrcl === null || pesoCrcl === null || cr === null) {
      var numsCrcl = dadosCrcl.match(/\d+(?:[.,]\d+)?/g);
      if (numsCrcl && numsCrcl.length >= 3) {
        idadeCrcl = parseInt(numsCrcl[0], 10);
        pesoCrcl = parseFloat(numsCrcl[1].replace(',', '.'));
        cr = parseFloat(numsCrcl[2].replace(',', '.'));
      }
    }

    var kbCrclRetorno = {
      inline_keyboard: [
        [
          { text: "💊 Meropenem ClCr", callback_data: "calc_Mero" },
          { text: "💊 Vancomicina ClCr", callback_data: "calc_Vanco" }
        ],
        [
          { text: "🔙 Enfermaria", callback_data: "ux:hub:enf" },
          { text: "🏠 Início", callback_data: "ux:hub:inicio" }
        ]
      ]
    };

    if (idadeCrcl === null || pesoCrcl === null || cr === null || isNaN(idadeCrcl) || isNaN(pesoCrcl) || isNaN(cr)) {
      return enviarMensagemComTecladoParaChat(chatId, "❌ Falta informação! Preciso de *Idade*, *Peso* e *Creatinina*.\n\n💡 *Exemplo:* `/crcl 68 70 1.4` ou `/crcl 60 anos, 70 kg, cr 1.2, M`", kbCrclRetorno);
    }

    if (idadeCrcl <= 0 || pesoCrcl <= 0 || cr <= 0 || idadeCrcl > 130 || pesoCrcl > 350 || cr > 30) {
      return enviarMensagemComTecladoParaChat(chatId, "⚠️ *Atenção — Parâmetros Inválidos no ClCr:*\n\n" +
        "• Idade deve ser um número positivo (> 0 anos).\n" +
        "• Peso deve ser um número positivo (> 0 kg).\n" +
        "• Creatinina deve ser um valor positivo (> 0 mg/dL).\n\n" +
        "💡 *Exemplo correto:* `/crcl 65 70 1.2` ou `/crcl 72 anos, 60kg, cr 2.1, fem`", kbCrclRetorno);
    }
    
    // Extrai medicamentos se houver "medicações:" ou "medicamentos:" ou "meds:"
    var medText = dadosCrcl.split(/(?:medicamentos|medicações|meds|rx|prescrição)[:=]?\s*/i);
    var medsArray = [];
    if (medText.length > 1) {
      medsArray = medText[1].split(/[,e+;]/).map(function(s) { return s.trim(); }).filter(Boolean);
    }

    var reqCrcl = {
      idade: idadeCrcl,
      peso: pesoCrcl,
      creatinina: cr,
      sexo: sexoCrcl,
      medicamentos: medsArray
    };

    if (sexoInformado) {
      var resCrcl = cockpitNefrologiaClearance('bot', { acao: 'completo', paciente: reqCrcl });
      return enviarMensagemComTecladoParaChat(chatId, resCrcl.textoFormatado, kbCrclRetorno);
    }

    // Se sexo não informado: NÃO assume M silenciosamente. Calcula ambos lado a lado!
    var reqCrclM = Object.assign({}, reqCrcl, { sexo: 'M' });
    var reqCrclF = Object.assign({}, reqCrcl, { sexo: 'F' });
    var resCrclM = cockpitNefrologiaClearance('bot', { acao: 'completo', paciente: reqCrclM });
    var resCrclF = cockpitNefrologiaClearance('bot', { acao: 'completo', paciente: reqCrclF });

    var clM = (resCrclM.resultado && resCrclM.resultado.clearance) || Math.round(((140 - idadeCrcl) * pesoCrcl / (72 * cr)) * 10) / 10;
    var clF = (resCrclF.resultado && resCrclF.resultado.clearance) || Math.round((clM * 0.85) * 10) / 10;

    var cabecalhoComparativo = "⚠️ *[SEXO BIOLÓGICO NÃO INFORMADO — ESTIMATIVAS LADO A LADO]*\n" +
      "🚹 *Masculino:* `" + clM + " mL/min` | 🚺 *Feminino (x0,85):* `" + clF + " mL/min`\n";

    var estM = (resCrclM.resultado && resCrclM.resultado.estagio) || "";
    var estF = (resCrclF.resultado && resCrclF.resultado.estagio) || "";
    if (estM && estF && estM !== estF) {
      cabecalhoComparativo += "⚠️ *Alerta Clínico:* A diferença de sexo altera a faixa/estágio renal (" + estM + " vs " + estF + "). Confirme o sexo biológico para ajuste posológico exato!\n";
    }
    cabecalhoComparativo += "─────────────────────────────────────────\n\n";

    return enviarMensagemComTecladoParaChat(chatId, cabecalhoComparativo + resCrclM.textoFormatado, kbCrclRetorno);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // NEFROLOGIA: DISTÚRBIOS HIDROELETROLÍTICOS (DHE - SÓDIO & POTÁSSIO)
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/dhe" || comando === "/eletrolitos") {
    var dadosDheCmd = texto.replace(/^\/(?:dhe|eletrolitos)\s*/i, "").trim();
    return tratarComandoDhe(chatId, dadosDheCmd);
  }

function extrairParametrosPancreatite(texto) {
  var tLimpo = String(texto || "").trim();
  var tNorm = tLimpo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 1. Idade > 60
  var idadeMaior60 = false;
  var mIdade = tNorm.match(/(?:idade\s*[:=]?\s*(\d+)|\b(\d+)\s*(?:a|anos|y|yo)\b)/i);
  if (mIdade) {
    var vIdade = parseInt(mIdade[1] || mIdade[2], 10);
    if (vIdade > 60) idadeMaior60 = true;
  } else if (/\b(?:idade\s*(?:>|maior(?:\s*que)?)\s*60|idoso|idosa|>60\s*anos)\b/i.test(tNorm)) {
    idadeMaior60 = true;
  }

  // 2. BUN > 25 ou Ureia > 50
  var bunMaior25 = false;
  var mBun = tNorm.match(/\bbun\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
  var mUreia = tNorm.match(/(?:ureia|urea)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
  if (mBun && parseFloat(mBun[1].replace(",", ".")) > 25) {
    bunMaior25 = true;
  } else if (mUreia && parseFloat(mUreia[1].replace(",", ".")) > 50) {
    bunMaior25 = true;
  } else if (/\b(?:bun\s*(?:>|maior)\s*25|ureia\s*(?:>|maior)\s*50|bun\s*elevad[ao]|ureia\s*elevad[ao]|azotemia)\b/i.test(tNorm)) {
    bunMaior25 = true;
  }

  // 3. Estado Mental Alterado (Glasgow < 15, confuso, rebaixado, sonolento)
  var mentalAlterado = false;
  var mGcs = tNorm.match(/(?:glasgow|ecg|gcs)\s*[:=]?\s*(\d+)/i);
  if (mGcs && parseInt(mGcs[1], 10) < 15) {
    mentalAlterado = true;
  } else if (/\b(?:confus[ao]|sonolent[ao]|rebaixad[ao]|desorientad[ao]|torpor(?:os[ao])?|coma|mental\s*alterad[ao]|glasgow\s*<\s*15)\b/i.test(tNorm)) {
    if (!/\b(?:sem\s+confus|nao\s+confus|sem\s+rebaixamento|lucid[ao]|orientad[ao])\b/i.test(tNorm)) {
      mentalAlterado = true;
    }
  }

  // 4. SIRS presente
  var sirs = false;
  var critsSirs = 0;
  var mFc = tNorm.match(/\bfc\s*[:=]?\s*(\d+)/i);
  if (mFc && parseInt(mFc[1], 10) > 90) critsSirs++;
  var mFr = tNorm.match(/\bfr\s*[:=]?\s*(\d+)/i);
  if (mFr && parseInt(mFr[1], 10) > 20) critsSirs++;
  var mTemp = tNorm.match(/(?:tax|temp(?:eratura)?)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
  if (mTemp) {
    var vT = parseFloat(mTemp[1].replace(",", "."));
    if (vT > 38 || vT < 36) critsSirs++;
  } else if (/\b(?:febre|febril|hipotermia)\b/i.test(tNorm)) {
    critsSirs++;
  }
  var mLeuco = tNorm.match(/leuco(?:citos)?\s*[:=]?\s*(\d+)/i);
  if (mLeuco) {
    var vL = parseInt(mLeuco[1], 10);
    if (vL > 12000 || (vL > 12 && vL < 100) || vL < 4000) critsSirs++;
  } else if (/\b(?:leucocitose|leucopenia)\b/i.test(tNorm)) {
    critsSirs++;
  }

  if (critsSirs >= 2) {
    sirs = true;
  } else if (/\bsirs\b/i.test(tNorm) && !/\b(?:sem\s+sirs|sirs\s*[-:]?\s*nao)\b/i.test(tNorm)) {
    sirs = true;
  }

  // 5. Derrame Pleural
  var derramePleural = false;
  if (/\b(?:derrame(?:\s+pleural)?|\bep\b)\b/i.test(tNorm)) {
    if (!/\b(?:sem\s+derrame|derrame\s*(?:ausente|negativo|nao))\b/i.test(tNorm)) {
      derramePleural = true;
    }
  }

  // Hidratação
  var doencaCardioRenal = /\b(?:ic|icc|insuficiencia\s+cardiaca|drc|ira|cardiopata|nefropata|renal)\b/i.test(tNorm) &&
    !/\b(?:sem\s+(?:ic|icc|drc|ira|doenca)|nao\s+cardiopata)\b/i.test(tNorm);
  var mHt = tNorm.match(/(?:ht|hematocrito)\s*[:=]?\s*(\d+)/i);
  var htElevado = (mHt && parseInt(mHt[1], 10) > 44) || /\b(?:hematocrito\s*elevad[ao]|ht\s*elevad[ao]|hemoconcentracao)\b/i.test(tNorm);
  var bunElevado = bunMaior25 || /\b(?:bun\s*elevad[ao]|ureia\s*elevad[ao])\b/i.test(tNorm);

  // Nutrição
  var dorControlada = /\b(?:dor\s+(?:controlada|aliviada|ausente|melhor|cedeu)|sem\s+dor)\b/i.test(tNorm);
  var nauseaVomitoAusentes = /\b(?:sem\s+(?:vomito|nausea|emese)|tolerando|vomitos?\s+ausente|nauseas?\s+ausente)\b/i.test(tNorm);
  var mNpo = tNorm.match(/(?:npo|jejum)\s*[:=]?\s*(\d+)\s*(?:h|horas)?/i);
  var tempoNPO = mNpo ? parseInt(mNpo[1], 10) : 0;

  return {
    bisap: {
      bunMaior25: bunMaior25,
      mentalAlterado: mentalAlterado,
      sirs: sirs,
      idadeMaior60: idadeMaior60,
      derramePleural: derramePleural
    },
    hidratacao: {
      doencaCardiovascularOuRenal: doencaCardioRenal,
      hematocritoElevado: htElevado,
      bunElevado: bunElevado
    },
    nutricao: {
      dorAbdominalControlada: dorControlada,
      nauseaVomitoAusentes: nauseaVomitoAusentes,
      tempoNPO: tempoNPO
    }
  };
}

  if (comando === "/pancreatite" || comando === "/bisap") {
    if (typeof GastroenterologiaPancreatiteService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo GastroenterologiaPancreatiteService indisponível.");
    }
    var dadosPancreatite = texto.replace(/^\/(?:pancreatite|bisap)\s*/i, "").trim();
    if (!dadosPancreatite) {
      var msgAjudaPancreatite = "🩸 *COCKPIT DE PANCREATITE AGUDA & ESCORE BISAP*\n\n" +
        "Avalie a gravidade nas primeiras 24h, estratifique mortalidade e oriente hidratação/nutrição.\n\n" +
        "📌 *Como Usar:*\n" +
        "`/pancreatite [idade] [ureia/bun] [estado mental] [sirs/sinais vitais] [derrame]`\n\n" +
        "💡 *Exemplos Práticos:*\n" +
        "• `/pancreatite 68a ureia 65 confuso sirs derrame pleural`\n" +
        "• `/bisap idade 72 bun 30 glasgow 14 fc 105 fr 22 derrame`\n" +
        "• `/pancreatite 45a ureia 28 lúcido sem sirs sem derrame dor controlada sem vomito`\n\n" +
        "⚙️ *Critérios do Escore BISAP (1 ponto cada):*\n" +
        "• **B**UN > 25 mg/dL (ou Ureia > 50 mg/dL)\n" +
        "• **I**mpaired mental status (Glasgow < 15, confuso, sonolento)\n" +
        "• **S**IRS presente (2+ de: FC>90, FR>20, Tax>38°C ou <36°C, Leuco>12k ou <4k)\n" +
        "• **A**ge > 60 anos\n" +
        "• **P**leural effusion (Derrame pleural no Rx/TC)";
      return enviarMensagemParaChat(chatId, msgAjudaPancreatite);
    }

    var paramsPancreatite = extrairParametrosPancreatite(dadosPancreatite);
    var resPancreatite = cockpitGastroenterologiaPancreatite('bot', paramsPancreatite);
    return enviarMensagemParaChat(chatId, resPancreatite.textoFormatado);
  }

  if (comando === "/sca" || comando === "/iam" || comando === "/heart" || comando === "/dapt") {
    if (typeof CardiologiaEmergenciaService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo CardiologiaEmergenciaService indisponível.");
    }
    
    var dadosCardio = texto.replace(/^\/\w+\s*/, "").trim();
    if (!dadosCardio) {
      return enviarMensagemParaChat(chatId, "🫀 *CARDIOLOGIA DE EMERGÊNCIA — DOR TORÁCICA & IAM*\n\n" +
        "Envie os dados do paciente para cálculo do Escore HEART, TIMI e Bloqueios DAPT:\n\n" +
        "📌 *Exemplo Alto Risco:* `/iam idade 68, dor tipica, supra, trop+, has, dm, peso 72`\n" +
        "📌 *Exemplo com AVC prévio:* `/dapt avc previo, idade 65, icp planejada, peso 70`\n" +
        "📌 *Exemplo IAM Trombólise:* `/iam idade 78, supra, trombolise, pas 110, fc 85`\n" +
        "📌 *Exemplo Nitrato VD / IPDE-5:* `/iam dor retroesternal, iam vd, sildenafil recente`\n\n" +
        "Ou execute `/heart padrao` para ver um relatório modelo.");
    }

    var tLower = dadosCardio.toLowerCase();
    
    // Extração de Idade
    var mIdade = tLower.match(/(?:idade|anos)[:=]?\s*(\d+)/) || tLower.match(/\b(\d{2})\s*anos\b/);
    var idadeCardio = mIdade ? parseInt(mIdade[1], 10) : 62;

    // Extração de Peso
    var mPeso = tLower.match(/(?:peso|kg)[:=]?\s*(\d+)/) || tLower.match(/\b(\d{2,3})\s*kg\b/);
    var pesoCardio = mPeso ? parseInt(mPeso[1], 10) : 70;

    // Extração de Pressão e FC
    var mPas = tLower.match(/(?:pas|pa)[:=]?\s*(\d{2,3})/);
    var pasCardio = mPas ? parseInt(mPas[1], 10) : 130;
    var mFc = tLower.match(/(?:fc|bpm)[:=]?\s*(\d{2,3})/);
    var fcCardio = mFc ? parseInt(mFc[1], 10) : 78;

    // Flags clínicas
    var supra = /supra|stemi|iamcsst/i.test(tLower);
    var tropPos = /trop\+|troponina\s*alta|trop\s*alta|troponina\s*positiva/i.test(tLower);
    var dorTipica = /tipica|retroesternal|aperto|sudorese|diaforese/i.test(tLower);
    var avc = /avc|ait/i.test(tLower);
    var trombolise = /trombol|fibrinol/i.test(tLower);
    var infartoVd = /vd|ventriculo direito/i.test(tLower);
    var ipde5 = /sildenafil|tadalafil|viagra|cialis/i.test(tLower);
    var omeprazol = /omeprazol/i.test(tLower);
    var icp = /icp|cateterismo|angioplastia/i.test(tLower) || !trombolise;
    var dm = /dm|diabetes|diabetico/i.test(tLower);
    var has = /has|hipertensao|hipertenso/i.test(tLower);
    var tabagismo = /tabag|fumo|fumante/i.test(tLower);

    var reqCardio = {
      idade: idadeCardio,
      peso: pesoCardio,
      pas: pasCardio,
      fc: fcCardio,
      historia: dorTipica ? 'altamente_suspeita' : 'moderadamente_suspeita',
      ecg: supra ? 'isquemia_significativa' : (/infradesnivel|infra/i.test(tLower) ? 'isquemia_significativa' : 'alteracao_inespecifica'),
      troponina: tropPos ? 'elevada_3x' : 'normal',
      diabetes: dm,
      has: has,
      tabagismo: tabagismo,
      supraST: supra,
      iamcsst: supra,
      avcPrevio: avc,
      trombolise: trombolise,
      icpPlanejada: icp,
      infartoVD: infartoVd,
      usoSildenafilUltimas24h: ipde5,
      usoOmeprazol: omeprazol
    };

    var resSca = cockpitCardiologiaEmergencia('bot', reqCardio);
    return enviarMensagemParaChat(chatId, resSca.textoFormatado);
  }


  // ───────────────────────────────────────────────────────────────────────────
  // TOXICOLOGIA DE EMERGÊNCIA (Paracetamol, Tricíclicos, BB/BCC, Opioides)
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/intox" || comando === "/toxicologia") {
    var dadosTox = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof ToxicologiaEmergenciaService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo ToxicologiaEmergenciaService indisponível temporariamente.");
    }

    if (!dadosTox) {
      return enviarMensagemParaChat(chatId, "☣️ *PAINEL INTELIGENTE DE TOXICOLOGIA DE EMERGÊNCIA*\n\n" +
        "Escolha o tipo de intoxicação ou envie os dados diretamente:\n\n" +
        "💊 *Paracetamol:* `/intox paracetamol, 70kg, 10g ingeridos, tempo 6h, nivel 180`\n" +
        "⚡ *Tricíclicos (TCA):* `/intox triciclico, 60kg, qrs 120, hipotensao`\n" +
        "🫀 *Cardiotóxicos (BB/BCC):* `/intox bcc, 80kg, choque`\n" +
        "💉 *Opioides:* `/intox opioide, apneia` (ou depressao/normal)");
    }

    var tLower = dadosTox.toLowerCase();
    var msgOut = "";

    // 1. Paracetamol
    if (tLower.includes("paracetamol") || tLower.includes("acetaminofeno") || tLower.includes("tylenol")) {
      var paramsPara = {};
      var mPeso = dadosTox.match(/(\d{2,3}(?:[.,]\d+)?)\s*(?:kg|quilos)/i) || dadosTox.match(/peso\s*[:=]?\s*(\d{2,3}(?:[.,]\d+)?)/i);
      paramsPara.pesoKg = mPeso ? parseFloat(mPeso[1].replace(',', '.')) : undefined;

      var mDoseMg = dadosTox.match(/(\d+)\s*(?:mg)/i);
      var mDoseG = dadosTox.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gramas)/i);
      if (mDoseMg) paramsPara.doseIngeridaMg = parseInt(mDoseMg[1], 10);
      else if (mDoseG) paramsPara.doseIngeridaMg = parseFloat(mDoseG[1].replace(',', '.')) * 1000;

      var mTempo = dadosTox.match(/(\d+(?:[.,]\d+)?)\s*(?:h|horas|hr)\b/i) || dadosTox.match(/tempo\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
      if (mTempo) paramsPara.tempoIngestaoHoras = parseFloat(mTempo[1].replace(',', '.'));

      var mNivel = dadosTox.match(/nivel\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i) || dadosTox.match(/(\d+(?:[.,]\d+)?)\s*mcg/i);
      if (mNivel) paramsPara.nivelSericoMcgMl = parseFloat(mNivel[1].replace(',', '.'));

      if (tLower.includes(" vo") || tLower.includes(" via oral")) paramsPara.viaPreferencia = 'VO';

      var resPara = ToxicologiaEmergenciaService.avaliarParacetamol(paramsPara);
      if (resPara.erro) return enviarMensagemParaChat(chatId, "❌ Erro: " + resPara.erro);

      msgOut += "💊 *Intoxicação por Paracetamol*\n\n";
      msgOut += "⚠️ *Dose Tóxica:* " + (resPara.provavelDoseToxica ? "SIM" : "NÃO / INDETERMINADO") + "\n";
      if (resPara.linhaTratamentoNomograma) msgOut += "📉 *Limiar no Nomograma:* " + resPara.linhaTratamentoNomograma + " mcg/mL\n";
      msgOut += "✅ *Indicação de NAC:* " + (resPara.indicacaoNac ? "SIM" : "NÃO") + "\n\n";
      msgOut += "📝 *Motivos:*\n- " + resPara.motivos.join("\n- ") + "\n\n";

      if (resPara.prescricaoNac) {
        msgOut += "💉 *Prescrição de NAC (" + resPara.prescricaoNac.esquema + "):*\n";
        if (resPara.prescricaoNac.doseAtaque) {
          msgOut += "• *Ataque:* " + resPara.prescricaoNac.doseAtaque.descricao + " (" + resPara.prescricaoNac.doseAtaque.doseMg + " mg)\n";
          msgOut += "• *Manutenção:* " + resPara.prescricaoNac.doseManutencao.descricao + " (" + resPara.prescricaoNac.doseManutencao.doseMg + " mg/dose)\n";
        } else {
          msgOut += "• *Etapa 1:* " + resPara.prescricaoNac.etapa1.descricao + " (" + resPara.prescricaoNac.etapa1.doseMg + " mg). " + resPara.prescricaoNac.etapa1.diluicao + ". " + resPara.prescricaoNac.etapa1.alerta + "\n";
          msgOut += "• *Etapa 2:* " + resPara.prescricaoNac.etapa2.descricao + " (" + resPara.prescricaoNac.etapa2.doseMg + " mg). " + resPara.prescricaoNac.etapa2.diluicao + "\n";
          msgOut += "• *Etapa 3:* " + resPara.prescricaoNac.etapa3.descricao + " (" + resPara.prescricaoNac.etapa3.doseMg + " mg). " + resPara.prescricaoNac.etapa3.diluicao + "\n";
          msgOut += "\n🏁 *Fim:* " + resPara.prescricaoNac.criteriosFim + "\n";
        }
      }
      return enviarMensagemParaChat(chatId, msgOut);
    }

    // 2. Triciclicos
    if (tLower.includes("triciclico") || tLower.includes("amitriptilina") || tLower.includes("nortriptilina") || tLower.includes("imipramina")) {
      var paramsTca = {};
      var mPesoT = dadosTox.match(/(\d{2,3}(?:[.,]\d+)?)\s*(?:kg|quilos)/i) || dadosTox.match(/peso\s*[:=]?\s*(\d{2,3}(?:[.,]\d+)?)/i);
      if (mPesoT) paramsTca.pesoKg = parseFloat(mPesoT[1].replace(',', '.'));

      var mQrs = dadosTox.match(/qrs\s*[:=]?\s*(\d+)/i);
      if (mQrs) paramsTca.qrsMs = parseInt(mQrs[1], 10);

      if (tLower.includes("convulsa") || tLower.includes("crise")) paramsTca.convulsao = true;
      if (tLower.includes("hipoten") || tLower.includes("choque")) paramsTca.hipotensao = true;
      if (tLower.includes("arritm") || tLower.includes("tv")) paramsTca.arritmia = true;

      var resTca = ToxicologiaEmergenciaService.avaliarTriciclicos(paramsTca);
      msgOut += "⚡ *Intoxicação por Antidepressivos Tricíclicos (TCA)*\n\n";
      msgOut += "⚠️ *Risco de Convulsão (QRS >= 100ms):* " + (resTca.riscoConvulsao ? "ALTO" : "BAIXO") + "\n";
      msgOut += "⚠️ *Risco de Arritmia (QRS >= 160ms):* " + (resTca.riscoArritmiaVentricular ? "ALTO" : "BAIXO") + "\n";
      msgOut += "✅ *Indicação de Bicarbonato:* " + (resTca.indicacaoBicarbonato ? "SIM" : "NÃO") + "\n\n";
      
      if (resTca.prescricaoBicarbonato) {
        msgOut += "🧪 *Prescrição Bicarbonato de Sódio 8,4%: *\n";
        if (resTca.prescricaoBicarbonato.volumeBolus) {
          msgOut += "• *Bolus:* " + resTca.prescricaoBicarbonato.descricaoBolus + "\n";
          msgOut += "• *Alvo:* " + resTca.prescricaoBicarbonato.alvoDose + "\n";
        } else {
          msgOut += "• *Alvo:* " + resTca.prescricaoBicarbonato.alvoDose + "\n";
        }
        msgOut += "• *Manutenção:* " + resTca.prescricaoBicarbonato.manutencao + "\n";
        if (resTca.prescricaoBicarbonato.repetirBolus) msgOut += "• *Reavaliação:* " + resTca.prescricaoBicarbonato.repetirBolus + "\n";
        msgOut += "\n";
      }

      msgOut += "📝 *Condutas Gerais:*\n- " + resTca.condutasGerais.join("\n- ") + "\n";
      return enviarMensagemParaChat(chatId, msgOut);
    }

    // 3. Cardiotoxicos (BB/BCC)
    if (tLower.includes("bcc") || tLower.includes("bloqueador de canal") || tLower.includes("anlodipino") || tLower.includes("verapamil") || tLower.includes("diltiazem") || 
        tLower.includes("bb") || tLower.includes("betabloqueador") || tLower.includes("propranolol") || tLower.includes("atenolol") || tLower.includes("metoprolol")) {
      
      var paramsCardio = {};
      var mPesoC = dadosTox.match(/(\d{2,3}(?:[.,]\d+)?)\s*(?:kg|quilos)/i) || dadosTox.match(/peso\s*[:=]?\s*(\d{2,3}(?:[.,]\d+)?)/i);
      if (mPesoC) paramsCardio.pesoKg = parseFloat(mPesoC[1].replace(',', '.'));

      if (tLower.includes("bcc") || tLower.includes("anlodipino") || tLower.includes("verapamil") || tLower.includes("diltiazem")) paramsCardio.toxina = 'BCC';
      else if (tLower.includes("mista")) paramsCardio.toxina = 'MISTA';
      else paramsCardio.toxina = 'BB';

      if (tLower.includes("choque") || tLower.includes("refratari") || tLower.includes("hipoten")) paramsCardio.estadoChoque = true;

      var resCardio = ToxicologiaEmergenciaService.avaliarCardiotoxicos(paramsCardio);
      if (resCardio.erro) return enviarMensagemParaChat(chatId, "❌ Erro: " + resCardio.erro);

      msgOut += "🫀 *Intoxicação Cardiotóxica (" + resCardio.toxina + ")*\n\n";
      msgOut += "📝 *Condutas Iniciais:*\n- " + resCardio.condutasGerais.join("\n- ") + "\n\n";
      
      msgOut += "💊 *Farmacoterapia:*\n";
      if (resCardio.farmacoterapia.calcio) {
        msgOut += "🦴 *Cálcio:* " + resCardio.farmacoterapia.calcio.descricao + " " + resCardio.farmacoterapia.calcio.manutencao + "\n";
      }
      if (resCardio.farmacoterapia.glucagon) {
        msgOut += "🔋 *Glucagon:* " + resCardio.farmacoterapia.glucagon.descricao + " " + resCardio.farmacoterapia.glucagon.observacao + "\n";
      }
      if (resCardio.farmacoterapia.hiet) {
        msgOut += "🩸 *Terapia HIET:*\n  • Bolus: " + resCardio.farmacoterapia.hiet.bolus + "\n  • Infusão: " + resCardio.farmacoterapia.hiet.infusao + "\n  • Monitorização: " + resCardio.farmacoterapia.hiet.monitorizacao + "\n";
      }
      return enviarMensagemParaChat(chatId, msgOut);
    }

    // 4. Opioides
    if (tLower.includes("opioide") || tLower.includes("morfina") || tLower.includes("fentanil") || tLower.includes("tramadol") || tLower.includes("metadona")) {
      var paramsOp = {};
      if (tLower.includes("apneia") || tLower.includes("parada respi")) paramsOp.ventilacao = 'APNEIA';
      else if (tLower.includes("normal") || tLower.includes("eupneico")) paramsOp.ventilacao = 'NORMAL';
      else paramsOp.ventilacao = 'DEPRIMIDA';

      var resOp = ToxicologiaEmergenciaService.avaliarOpioides(paramsOp);
      
      msgOut += "💉 *Intoxicação por Opioides*\n\n";
      msgOut += "🌬️ *Status Ventilatório:* " + resOp.condicaoVentilatoria + "\n";
      msgOut += "✅ *Indicação de Naloxona:* " + (resOp.indicacaoNaloxona ? "SIM" : "NÃO") + "\n\n";

      if (resOp.prescricaoNaloxona) {
        msgOut += "🧪 *Prescrição Naloxona:*\n";
        msgOut += "• *Dose:* " + resOp.prescricaoNaloxona.doseInicial + "\n";
        msgOut += "• *Preparo:* " + resOp.prescricaoNaloxona.preparo + "\n";
        msgOut += "• *Titulação:* " + resOp.prescricaoNaloxona.titulacao + "\n\n";
      }

      msgOut += "📝 *Condutas:*\n- " + resOp.condutasGerais.join("\n- ") + "\n";
      return enviarMensagemParaChat(chatId, msgOut);
    }

    return enviarMensagemParaChat(chatId, "⚠️ Toxina não reconhecida. Tente '/intox paracetamol', '/intox triciclico', '/intox bb', '/intox bcc', ou '/intox opioide'.");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // NEUROLOGIA DE EMERGÊNCIA E MANEJO DE AVC ISQUÊMICO (AHA / SBDCV)
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/avc" || comando === "/trombolise" || comando === "/hic") {
    var dadosAvc = texto.replace(/^\/\w+\s*/, "").trim();
    if (typeof NeurologiaAvcService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo NeurologiaAvcService indisponível temporariamente.");
    }

    if (!dadosAvc && (comando === "/avc" || comando === "/trombolise")) {
      return enviarMensagemParaChat(chatId, "🧠 *MÓDULO DE NEUROLOGIA DE EMERGÊNCIA & AVC ISQUÊMICO (AHA / SBDCV)*\n\n" +
        "Envie os parâmetros para avaliação de trombólise ou hipertensão intracraniana:\n" +
        "• `/avc 65 anos, 2h de sintomas, 75kg, pa 170x100, gli 130` *(Checklist de Trombólise e Dose Alteplase/TNK)*\n" +
        "• `/avc 82 anos, 4h, nihss 18, sem anticoagulante` *(Janela Estendida 3 a 4.5h ECASS III)*\n" +
        "• `/hic 70kg, sodio 145, gli 180, ureia 50` *(Osmoterapia: Manitol 20%, Salina 3%/20% e Tetos Osmolares)*\n" +
        "• `/trombolise 55a, 1.5h, 80kg, pa 200x110` *(Alerta Pressórico e Protocolo Restritivo)*");
    }

    var kbHicRetorno = (typeof botoesBot === "function") ? botoesBot([
      [['🔙 Sala Vermelha', 'ux:sala'], ['🏠 Início', 'ux:hub:inicio']]
    ]) : { inline_keyboard: [[{ text: "🔙 Sala Vermelha", callback_data: "ux:sala" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]] };

    if (!dadosAvc && comando === "/hic") {
      var msgAjudaHic = "💧 *MANEJO DE HIPERTENSÃO INTRACRANIANA (HIC)*\n\n" +
        "Envie o peso e exames laboratoriais do paciente:\n" +
        "👉 `/hic 70kg, sodio 145, gli 180, ureia 50`\n" +
        "👉 `/hic 80kg` *(Cálculos determinísticos de Manitol 20% e Salina Hipertônica 3% e 20%)*";
      if (typeof enviarMensagemComTecladoParaChat === "function") {
        return enviarMensagemComTecladoParaChat(chatId, msgAjudaHic, kbHicRetorno);
      }
      return enviarMensagemParaChat(chatId, msgAjudaHic);
    }

    var tLowerAvc = dadosAvc.toLowerCase();

    // Rota 1: Comando específico /hic ou foco estrito em HIC
    if (comando === "/hic" || (tLowerAvc.includes("hic") && !tLowerAvc.includes("trombo") && !tLowerAvc.includes("avc"))) {
      var paramsHic = {};
      var mPesoHic = dadosAvc.match(/(\d{2,3}(?:[.,]\d+)?)\s*(?:kg|quilos)/i) || dadosAvc.match(/peso\s*[:=]?\s*(\d{2,3}(?:[.,]\d+)?)/i);
      paramsHic.pesoKg = mPesoHic ? parseFloat(mPesoHic[1].replace(',', '.')) : 70;

      var mNaHic = dadosAvc.match(/s[oó]dio\s*[:=]?\s*(\d{2,3})/i) || dadosAvc.match(/na\+?\s*[:=]?\s*(\d{2,3})/i);
      if (mNaHic) paramsHic.sodio = parseInt(mNaHic[1], 10);

      var mGliHic = dadosAvc.match(/gli(?:cemia)?\s*[:=]?\s*(\d{2,4})/i);
      if (mGliHic) paramsHic.glicemia = parseInt(mGliHic[1], 10);

      var mUrHic = dadosAvc.match(/ur(?:eia)?\s*[:=]?\s*(\d{1,3})/i);
      if (mUrHic) paramsHic.ureia = parseInt(mUrHic[1], 10);

      var resHic = NeurologiaAvcService.calcularHic(paramsHic);
      var txtHic = NeurologiaAvcService.formatarResumoAvc(resHic);
      if (!mPesoHic) {
        txtHic = "⚠️ *[ATENÇÃO: Peso não informado — doses osmoterapêuticas estimadas para adulto padrão (70 kg). Confirme o peso real antes da infusão!]*\n\n" + txtHic;
      }
      if (typeof enviarMensagemComTecladoParaChat === "function") {
        return enviarMensagemComTecladoParaChat(chatId, txtHic, kbHicRetorno);
      }
      return enviarMensagemParaChat(chatId, txtHic);
    }

    // Rota 2: Avaliação de AVC / Trombólise
    var paramsAvc = {};
    var mIdadeAvc = dadosAvc.match(/(\d{1,3})\s*(?:anos|a\b)/i) || dadosAvc.match(/idade\s*[:=]?\s*(\d{1,3})/i);
    paramsAvc.idade = mIdadeAvc ? parseInt(mIdadeAvc[1], 10) : 65;

    // Tempo de sintomas
    var mTempoHoras = dadosAvc.match(/(\d+(?:[.,]\d+)?)\s*(?:h|horas|hr)\b/i) || dadosAvc.match(/tempo\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mTempoMin = dadosAvc.match(/(\d+)\s*(?:min|minutos)\b/i);
    if (mTempoHoras) {
      paramsAvc.tempoSintomasHoras = parseFloat(mTempoHoras[1].replace(',', '.'));
    } else if (mTempoMin) {
      paramsAvc.tempoSintomasHoras = parseFloat((parseInt(mTempoMin[1], 10) / 60).toFixed(2));
    } else {
      paramsAvc.tempoSintomasHoras = 2.0; // Padrão se não informado
    }

    var mPesoAvc = dadosAvc.match(/(\d{2,3}(?:[.,]\d+)?)\s*(?:kg|quilos)/i) || dadosAvc.match(/peso\s*[:=]?\s*(\d{2,3}(?:[.,]\d+)?)/i);
    if (mPesoAvc) paramsAvc.pesoKg = parseFloat(mPesoAvc[1].replace(',', '.'));

    // Pressão Arterial
    var mPaAvc = dadosAvc.match(/pa\s*[:=]?\s*(\d{2,3})\s*(?:[xX/])\s*(\d{2,3})/i) || dadosAvc.match(/(\d{2,3})\s*(?:[xX/])\s*(\d{2,3})\s*(?:mmhg)?/i);
    if (mPaAvc) {
      paramsAvc.pas = parseInt(mPaAvc[1], 10);
      paramsAvc.pad = parseInt(mPaAvc[2], 10);
      if (paramsAvc.pas < 30) paramsAvc.pas *= 10;
      if (paramsAvc.pad < 30) paramsAvc.pad *= 10;
    }

    // Glicemia
    var mGliAvc = dadosAvc.match(/gli(?:cemia)?\s*[:=]?\s*(\d{2,4})/i);
    if (mGliAvc) paramsAvc.glicemia = parseInt(mGliAvc[1], 10);

    // NIHSS
    var mNihss = dadosAvc.match(/nihss\s*[:=]?\s*(\d{1,2})/i);
    if (mNihss) paramsAvc.nihss = parseInt(mNihss[1], 10);

    // Plaquetas
    var mPlaq = dadosAvc.match(/plaq(?:uetas)?\s*[:=]?\s*(\d+)/i);
    if (mPlaq) paramsAvc.plaquetas = parseInt(mPlaq[1], 10);

    // INR / RNI
    var mInr = dadosAvc.match(/(?:inr|rni)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    if (mInr) paramsAvc.inr = parseFloat(mInr[1].replace(',', '.'));

    // DOAC / Anticoagulante
    if (tLowerAvc.includes("doac") || tLowerAvc.includes("eliquis") || tLowerAvc.includes("xarelto") || tLowerAvc.includes("pradaxa") || tLowerAvc.includes("rivaroxabana") || tLowerAvc.includes("apixabana") || tLowerAvc.includes("dabigatrana")) {
      paramsAvc.usoDoacUltimas48h = true;
    }
    if (tLowerAvc.includes("anticoagulante") || tLowerAvc.includes("varfarina") || tLowerAvc.includes("marevan")) {
      paramsAvc.usoAnticoagulanteOral = true;
    }

    // Contraindicações Clínicas no Texto
    if (tLowerAvc.includes("hemorragia") || tLowerAvc.includes("hic previa") || tLowerAvc.includes("sangramento snc")) paramsAvc.hemorragiaIntracranianaPrevia = true;
    if (tLowerAvc.includes("avc recente") || tLowerAvc.includes("avc 3 meses") || tLowerAvc.includes("avc previo")) paramsAvc.avcIsquemicoUltimos3Meses = true;
    if (tLowerAvc.includes("tce") || tLowerAvc.includes("cirurgia snc") || tLowerAvc.includes("trauma cranio")) paramsAvc.tceGraveUltimos3Meses = true;
    if (tLowerAvc.includes("sangramento ativo") || tLowerAvc.includes("hda") || tLowerAvc.includes("melena")) paramsAvc.sangramentoAtivo = true;
    if (tLowerAvc.includes("disseccao") || tLowerAvc.includes("dissecção")) paramsAvc.suspeitaDisseccaoAorta = true;
    if (tLowerAvc.includes("endocardite")) paramsAvc.endocarditeInfecciosa = true;
    if (tLowerAvc.includes("gestante") || tLowerAvc.includes("gravida")) paramsAvc.gestante = true;
    if (tLowerAvc.includes("diabetes") && (tLowerAvc.includes("avc previo") || tLowerAvc.includes("historico avc"))) paramsAvc.historicoAvcEDiabetes = true;

    var resTrombo = NeurologiaAvcService.avaliarTrombolise(paramsAvc);
    var resultadoFinal = Object.assign({}, resTrombo);

    if (paramsAvc.pesoKg) {
      var resHicComp = NeurologiaAvcService.calcularHic({
        pesoKg: paramsAvc.pesoKg,
        glicemia: paramsAvc.glicemia
      });
      resultadoFinal.manitol20 = resHicComp.manitol20;
      resultadoFinal.salinaHipertonica3 = resHicComp.salinaHipertonica3;
      resultadoFinal.salinaHipertonica20 = resHicComp.salinaHipertonica20;
      resultadoFinal.alertaGeral = resHicComp.alertaGeral;
    }

    return enviarMensagemParaChat(chatId, NeurologiaAvcService.formatarResumoAvc(resultadoFinal));
  }

    if (comando === "/winter") {
    var paramWinter = texto.replace(/^\/winter\s*/i, "").trim();
    if (!paramWinter) {
      var kbWinter = (typeof GasometriaAcidoBaseService !== "undefined" && typeof GasometriaAcidoBaseService.obterTecladoInlineGasometria === "function")
        ? GasometriaAcidoBaseService.obterTecladoInlineGasometria("winter")
        : null;
      return enviarMensagemComTecladoParaChat(chatId,
        "📐 *FÓRMULA DE WINTER (ACIDOSE METABÓLICA)*\n\n" +
        "Calcula a compensação respiratória esperada: `PaCO₂ = 1,5 × HCO₃⁻ + 8 (±2)`\n\n" +
        "💡 *Como usar:* `/winter 12` ou toque em um valor de HCO₃⁻ abaixo para calcular imediatamente:",
        kbWinter
      );
    }
    var mBic = paramWinter.match(/(\d+[.,]?\d*)/);
    if (!mBic) {
      return enviarMensagemParaChat(chatId, "⚠️ Informe o valor numérico do HCO₃⁻ (ex: `/winter 12`).");
    }
    var hco3Val = parseFloat(mBic[1].replace(",", "."));
    if (typeof GasometriaAcidoBaseService !== "undefined") {
      try {
        var w = GasometriaAcidoBaseService.calcularWinter(hco3Val);
        var msgWinter = "📐 *FÓRMULA DE WINTER — ACIDOSE METABÓLICA*\n\n" +
          "• *HCO₃⁻ informado:* " + hco3Val + " mEq/L\n" +
          "• *PaCO₂ esperada:* " + w.pco2Esperada + " mmHg\n" +
          "• *Faixa de compensação esperada:* " + w.minimo + " a " + w.maximo + " mmHg\n\n" +
          "📌 *Interpretação Beira-Leito:*\n" +
          "• PaCO₂ medida > " + w.maximo + " mmHg → *Acidose Respiratória associada* (fadiga ventilatória, hipoventilação alveolar).\n" +
          "• PaCO₂ medida < " + w.minimo + " mmHg → *Alcalose Respiratória associada* (hiperventilação excessiva, sepse precoce, dor, febre).\n" +
          "• PaCO₂ dentro da faixa (" + w.minimo + "–" + w.maximo + " mmHg) → *Compensação respiratória adequada*.";
        var kbWRes = {
          inline_keyboard: [
            [
              { text: "🩸 Gasometria Completa", callback_data: "ux:iniciar:gaso" },
              { text: "🔄 Outro HCO₃⁻", callback_data: "ux:gaso:winter" }
            ],
            [
              { text: "🔙 Voltar ao Menu", callback_data: "ux:menu" }
            ]
          ]
        };
        return enviarMensagemComTecladoParaChat(chatId, msgWinter, kbWRes);
      } catch (errWinter) {
        return enviarMensagemParaChat(chatId, "⚠️ Erro ao calcular Winter: " + errWinter.message);
      }
    }
  }

  


  if (comando === "/choque" || comando === "/forrester" || comando === "/ic") {
    var dadosIC = texto.replace(/^\/(?:choque|forrester|ic)\s*/i, "").trim();
    if (!dadosIC) {
      if (typeof enviarMenuEmergChoque === "function") {
        return enviarMenuEmergChoque(chatId);
      }
      var msgAjudaIC = "🫀 *IC DESCOMPENSADA / CHOQUE (FORRESTER & STEVENSON)*\n\n" +
        "Envie os sinais clínicos de congestão e perfusão.\n" +
        "💡 *Exemplos:*\n" +
        "• `/ic congestao sim, perfusao baixa, pas 80` (Perfil C, choque franco)\n" +
        "• `/ic estertores, sem hipoperfusao, pas 120` (Perfil B)\n" +
        "• `/ic sem congestao, perfusao ruim, pas 90` (Perfil L)";
      var kbAjudaIC = (typeof botoesBot === "function") ? botoesBot([
        [['🔙 Sala Vermelha', 'ux:hub:sala'], ['🏠 Início', 'ux:hub:inicio']]
      ]) : null;
      if (kbAjudaIC && typeof enviarMensagemComTecladoParaChat === "function") {
        return enviarMensagemComTecladoParaChat(chatId, msgAjudaIC, kbAjudaIC);
      }
      return enviarMensagemParaChat(chatId, msgAjudaIC);
    }
    
    // Parse básico via regex
    var paramsIC = {
      congestao: /congest(?:ão|ao)|estertore?s?|tjp|edema|ortopneia/i.test(dadosIC) && !/(?:sem|nao|não) congest(?:ão|ao)/i.test(dadosIC),
      baixa_perfusao: /perfus(?:ão|ao) (?:ruim|baixa)|hipoperfus(?:ão|ao)|choque|oliguria|fria/i.test(dadosIC) && !/(?:sem|nao|não) (?:hipoperfus(?:ão|ao)|perfus(?:ão|ao) (?:ruim|baixa))/i.test(dadosIC),
      pas: 100, // default
      pam: 75,
      uso_betabloqueador: /beta.?bloq/i.test(dadosIC) || /carvedilol|metoprolol|bisoprolol/i.test(dadosIC)
    };
    
    var pasMatch = dadosIC.match(/pas\s*[:=]?\s*(\d+)/i);
    if (pasMatch) paramsIC.pas = parseInt(pasMatch[1], 10);
    
    var pamMatch = dadosIC.match(/pam\s*[:=]?\s*(\d+)/i);
    if (pamMatch) paramsIC.pam = parseInt(pamMatch[1], 10);
    
    if (pasMatch && !pamMatch) paramsIC.pam = (paramsIC.pas * 2 + 60) / 3; // Estimativa chula, geralmente PAD = PAS-40

    if (typeof CardiologiaIntensivaService !== "undefined") {
      try {
        var avaliacao = CardiologiaIntensivaService.avaliarPacienteICDescompensada(paramsIC);
        var perf = avaliacao.perfil_clinico;
        var farmaco = avaliacao.plano_farmacologico;
        var txtIC = "🫀 *CARDIOLOGIA INTENSIVA — CHOQUE CARDIOGÊNICO E IC DESCOMPENSADA*\n\n" +
          "*Classificação de Forrester & Stevenson:* Perfil " + perf.perfil + "\n" +
          "*Descrição:* " + perf.descricao + "\n" +
          "*Hemodinâmica:* " + perf.diagnostico_hemodinamico + " / " + perf.perfusao + "\n\n" +
          "*Conduta Geral:* " + perf.conduta_geral + "\n\n";

        if (farmaco.bloqueios_seguranca && farmaco.bloqueios_seguranca.length > 0) {
          txtIC += "⚠️ *BLOQUEIOS DE SEGURANÇA:*\n";
          for (var b = 0; b < farmaco.bloqueios_seguranca.length; b++) {
            txtIC += "• " + farmaco.bloqueios_seguranca[b] + "\n";
          }
          txtIC += "\n";
        }
        if (farmaco.vasopressor && farmaco.vasopressor.length > 0) {
          txtIC += "💉 *VASOPRESSORES:*\n" + farmaco.vasopressor.join("\n") + "\n\n";
        }
        if (farmaco.inotropico && farmaco.inotropico.length > 0) {
          txtIC += "⚡ *INOTRÓPICOS:*\n" + farmaco.inotropico.join("\n") + "\n\n";
        }
        if (farmaco.diuretico && farmaco.diuretico.length > 0) {
          txtIC += "💧 *DIURÉTICOS:*\n" + farmaco.diuretico.join("\n") + "\n\n";
        }
        if (farmaco.vasodilatador && farmaco.vasodilatador.length > 0) {
          txtIC += "🩺 *VASODILATADORES:*\n" + farmaco.vasodilatador.join("\n") + "\n\n";
        }

        var cacheIC = (typeof uxCache === "function") ? uxCache() : CacheService.getScriptCache();
        var ckIC = Utilities.getUuid().replace(/-/g, '');
        safePutCache(cacheIC, ckIC, txtIC, 21600);
        var kbIC = (typeof botoesBot === "function") ? botoesBot([
          [['📋 Copiar para Prontuário', 'ux:copiar:' + ckIC]],
          [['🔙 Sala Vermelha', 'ux:hub:sala'], ['🏠 Início', 'ux:hub:inicio']]
        ]) : (typeof obterBotoesNavegacaoPadrao === "function" ? obterBotoesNavegacaoPadrao() : null);
        if (kbIC && typeof enviarMensagemComTecladoParaChat === "function") {
          return enviarMensagemComTecladoParaChat(chatId, txtIC, kbIC);
        }
        return enviarMensagemParaChat(chatId, txtIC);
      } catch (err) {
        return enviarMensagemParaChat(chatId, "⚠️ Erro: " + err.message);
      }
    }
  }

  if (comando === "/gaso" || comando === "/gasometria" || comando === "/aniongap") {
    var dadosGaso = texto.replace(/^\/(?:gaso|gasometria|aniongap)\s*/i, "").trim();
    if (!dadosGaso) {
      var msgAjudaGaso = "🩸 *GASOMETRIA ARTERIAL — REGRA DOS 5 PASSOS*\n\n" +
        "Envie os parâmetros gasométricos e laboratoriais beira-leito:\n" +
        "• *pH*, *pCO2*, *HCO3* (obrigatórios)\n" +
        "• *Na*, *Cl*, *Albumina* (para Ânion Gap corrigido e Razão Delta)\n" +
        "• *PaO2*, *FiO2*, *Idade* (para Relação P/F e Gradiente Alvéolo-Arterial)\n" +
        "• *Lactato*, *K* (para alertas de choque e segurança eletrolítica)\n\n" +
        "💡 *Exemplos rápidos:*\n" +
        "• `/gaso 7.20 23 10 140 105 4.0` (posicional sem rótulos)\n" +
        "• `/gaso pH 7.20, pCO2 23, HCO3 10, Na 140, Cl 105, Alb 4.0`\n" +
        "• `/gaso pH 7.32, pCO2 62, HCO3 31, PaO2 55, FiO2 24%`\n" +
        "• `/winter 12` (Fórmula de Winter isolada)\n\n" +
        "👇 *Toque em um caso clínico para testar com 1 toque:*";
      var kbGasoInicial = (typeof GasometriaAcidoBaseService !== "undefined" && typeof GasometriaAcidoBaseService.obterTecladoInlineGasometria === "function")
        ? GasometriaAcidoBaseService.obterTecladoInlineGasometria("inicial")
        : null;
      return enviarMensagemComTecladoParaChat(chatId, msgAjudaGaso, kbGasoInicial);
    }

    if (typeof GasometriaAcidoBaseService !== "undefined") {
      try {
        var parseGaso = GasometriaAcidoBaseService.extrairParametrosGasometria(dadosGaso);

        if (parseGaso.incompleto) {
          var msgIncomp = "⚠️ *Gasometria Incompleta:*\n\n" +
            "Para a Regra dos 5 Passos, informe pelo menos *pH*, *pCO2* e *HCO3* da mesma amostra.\n\n" +
            "• *Identificados:* " + (parseGaso.informados.length ? parseGaso.informados.join(", ") : "Nenhum") + "\n" +
            "• *Faltando:* " + parseGaso.ausentes.join(", ") + "\n\n" +
            "💡 *Exemplo de envio completo:* `/gaso pH 7.20, pCO2 23, HCO3 10, Na 140, Cl 105`\n" +
            "Ou digite sequencialmente: `/gaso 7.20 23 10`";
          var kbIncomp = GasometriaAcidoBaseService.obterTecladoInlineGasometria("incompleto");
          return enviarMensagemComTecladoParaChat(chatId, msgIncomp, kbIncomp);
        }

        if (!parseGaso.valido && parseGaso.erro) {
          return enviarMensagemParaChat(chatId, "⚠️ *Parâmetros Fisiologicamente Incompatíveis:*\n" + parseGaso.erro);
        }

        if (parseGaso.valido && parseGaso.parametros) {
          var resGaso = (typeof cockpitGasometriaAcidoBase === "function")
            ? cockpitGasometriaAcidoBase("bot", parseGaso.parametros)
            : {
                sucesso: true,
                resultado: GasometriaAcidoBaseService.analisarGasometria(parseGaso.parametros),
                textoFormatado: GasometriaAcidoBaseService.formatarTextoTelegram(GasometriaAcidoBaseService.analisarGasometria(parseGaso.parametros))
              };

          var textoFinalGaso = resGaso.textoFormatado;
          if (parseGaso.inversaoSuspeita && parseGaso.mensagemInversao) {
            textoFinalGaso = "⚠️ *" + parseGaso.mensagemInversao + "*\n\n" + textoFinalGaso;
          }

          var cacheKeyGaso = Utilities.getUuid().replace(/-/g, "");
          if (typeof safePutCache === "function") {
            var contextoCacheG = (typeof CacheService !== "undefined" && CacheService.getScriptCache) ? CacheService.getScriptCache() : null;
            var textoLimpoPep = typeof sanitizarHtmlTelegram === "function" ? textoFinalGaso.replace(/<[^>]*>/g, "") : textoFinalGaso;
            if (contextoCacheG) safePutCache(contextoCacheG, cacheKeyGaso, textoLimpoPep, 21600);
          }

          var temAcMet = resGaso.resultado && resGaso.resultado.disturbio && resGaso.resultado.disturbio.indexOf("Metabólica") !== -1;
          var kbResGaso = GasometriaAcidoBaseService.obterTecladoInlineGasometria("resultado", {
            cacheKey: cacheKeyGaso,
            temAcidoseMetabolica: temAcMet
          });

          return enviarMensagemComTecladoParaChat(chatId, textoFinalGaso, kbResGaso);
        }
      } catch (eGasoDet) {
        // Fallback defensivo
      }
    }

    return processarEEntregarIA(chatId, gerarAnaliseGasometriaComIA, dadosGaso, "gaso");
  }

  if (comando === "/conduta" || comando === "/sos") {
    var dadosEmergencia = texto.replace(/^\/(conduta|sos)\s*/i, "").trim();
    if (!dadosEmergencia) {
      if (typeof enviarMenuCondutas === "function") {
        return enviarMenuCondutas(chatId);
      }
      return enviarMensagemParaChat(chatId, "🚨 *CONDUTAS DE EMERGÊNCIA (SALA VERMELHA)*\n\n" +
        "Informe a intercorrência para receber conduta imediata em ampolas e mL:\n\n" +
        "💡 *Exemplos:*\n" +
        "• `/conduta EAP hipertensivo PA 220x120`\n" +
        "• `/conduta Anafilaxia em adulto`\n" +
        "• `/conduta Hipercalemia K 7.4 com onda T apiculada`\n" +
        "• `/conduta Crise convulsiva em curso há 6 minutos`\n" +
        "• `/conduta Cetoacidose diabética glicemia 480`");
    }
    var dLowCond = dadosEmergencia.toLowerCase();
    var chaveCondDet = null;
    if (dLowCond.indexOf("eap") !== -1 || dLowCond.indexOf("edema agudo") !== -1) chaveCondDet = "eap";
    else if (dLowCond.indexOf("anafil") !== -1) chaveCondDet = "anafilaxia";
    else if (dLowCond.indexOf("convuls") !== -1 || dLowCond.indexOf("epilep") !== -1) chaveCondDet = "convulsao";
    else if (dLowCond.indexOf("hipercal") !== -1 || dLowCond.indexOf("k 7") !== -1 || dLowCond.indexOf("k >") !== -1) chaveCondDet = "hipercalemia";
    else if (dLowCond.indexOf("cad") !== -1 || dLowCond.indexOf("cetoacid") !== -1) chaveCondDet = "cad";
    else if (dLowCond === "pcr" || dLowCond.indexOf("parada") !== -1) {
      if (typeof tratarComandoPcr === "function") return tratarComandoPcr(chatId, dadosEmergencia);
    }
    if (chaveCondDet && typeof enviarTelaCondutaEmergencia === "function") {
      return enviarTelaCondutaEmergencia(chatId, chaveCondDet);
    }
    return processarEEntregarIA(chatId, gerarCondutaEmergenciaComIA, dadosEmergencia, "conduta");
  }

  if (comando === "/calc") {
    return tratarComandoCalc(chatId, texto, contextoKey);
  }


  if (comando === "/interacao" || comando === "/seguranca" || comando === "/crosscheck") {
    var drogas = texto.replace(/^\/(interacao|seguranca|crosscheck)\s*/i, "").trim();
    if (!drogas) return enviarMensagemParaChat(chatId, "🛡️ *Checagem Farmacológica & Segurança*\n\nInforme 2 ou mais medicamentos ou cole a prescrição.\n\n💡 *Exemplo:* `/interacao amiodarona fluconazol` ou `/seguranca enoxaparina 40mg, clcr 25`");
    
    // 1. Checagem imediata em RAM (0ms)
    var check = (typeof executarCrossCheckSegurancaClinica === "function") ? executarCrossCheckSegurancaClinica(drogas) : null;
    if (check && (check.interacoes.length > 0 || check.ajustesRenais.length > 0 || check.tetosDose.length > 0)) {
      var kbInteracao = {
        inline_keyboard: [
          [{ text: "🔙 Prescrição & Farmaco", callback_data: "ux:farmaco:menu" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
        ]
      };
      return enviarMensagemComTecladoParaChat(chatId, check.textoFormatado, kbInteracao);
    }
    return processarEEntregarIA(chatId, verificarInteracaoComIA, drogas, "interacao");
  }

  return null;
}

// ============================================================================
// DESPACHO MODULAR DE AGENDA, ROTINA, ÁUDIO & PRECEPTOR
// ============================================================================
var TABELA_COMANDOS_AGENDA_ROTINA_AUDIO_ = {
  "/round": true,
  "/pitch": true,
  "/preceptor": true,
  "/voz": true,
  "/sabatina": true,
  "/v": true,
  "/audio": true,
  "/a": true,
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
  "/protocolo": true
};

function despacharComandosAgendaRotinaEAudio_(comando, texto, chatId, message) {
  if (!TABELA_COMANDOS_AGENDA_ROTINA_AUDIO_[comando]) {
    return { executado: false };
  }
  return {
    executado: true,
    resultado: executarComandoAgendaRotinaAudioInterno_(comando, texto, chatId, message)
  };
}

function executarComandoAgendaRotinaAudioInterno_(comando, texto, chatId, message) {
  if (comando === "/round" || comando === "/pitch") {
    var dadosRound = texto.replace(/^\/(round|pitch)\s*/i, "").trim();
    if (!dadosRound) return enviarMensagemParaChat(chatId, "👨‍⚕️ Envie os dados do paciente.");
    return processarEEntregarIA(chatId, gerarPitchERoundComIA, dadosRound, "round");
  }

  if (comando === "/preceptor") {
    var dadosPreceptor = texto.replace(/^\/preceptor\s*/i, "").trim();
    if (!dadosPreceptor) {
      if (typeof iniciarOuConvidarDiscussaoPreceptor === "function") {
        return iniciarOuConvidarDiscussaoPreceptor(chatId, { ehAudio: false });
      }
      return responderPreceptorVozComIA(chatId, "");
    }
    return responderPreceptorVozComIA(chatId, dadosPreceptor);
  }

  if (comando === "/voz" || comando === "/sabatina" || comando === "/v" || comando === "/audio" || comando === "/a") {
    var dadosVoz = texto.replace(/^\/(voz|sabatina|v|audio|a)\s*/i, "").trim();
    if (!dadosVoz) {
      if (typeof iniciarOuConvidarDiscussaoPreceptor === "function") {
        return iniciarOuConvidarDiscussaoPreceptor(chatId, { ehAudio: false });
      }
      return responderPreceptorVozComIA(chatId, "");
    }
    return responderPreceptorVozComIA(chatId, dadosVoz);
  }


  // 4. AGENDA, ROTINA, TAREFAS E CICLOS DIÁRIOS (DELEGADO AO MÓDULO 07i)
  if (typeof despacharComandosRotinaEProdutividade === "function") {
    var resRotina = despacharComandosRotinaEProdutividade(comando, texto, chatId, message);
    if (resRotina && resRotina.tratado) {
      return resRotina.resultado;
    }
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

  return null;
}

function processarMensagemTexto(message) {
  if (typeof tratarEntradaUX!=="undefined" && tratarEntradaUX(message)) return;
  var texto = message.text ? message.text.trim() : "";
  var textoLow = texto.toLowerCase();
  var chatId = (message.chat && message.chat.id) ? message.chat.id : ConfigService.get("TELEGRAM_CHAT_ID");
  if (!texto) {
    if (chatId) {
      var kbVazio = {
        inline_keyboard: [
          [{ text: "🚨 Sala Vermelha", callback_data: "ux:hub:sala" }, { text: "🛏️ Enfermaria", callback_data: "ux:hub:enf" }],
          [{ text: "📅 Central de Rotina", callback_data: "ux:hub:rotina" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
        ]
      };
      return enviarMensagemComTecladoParaChat(chatId, "👋 Olá! Envie um comando clínico (ex: `/pcr`, `/dva`, `/gaso`) ou escolha uma opção:", kbVazio);
    }
    return;
  }

  // Interceptação imediata: Consulta explícita de últimas mudanças / o que mudou / deploy
  if (/(?:(?:quais\s+(?:as\s+)?)?[úu]ltimas?\s+mudan[çc]as?(?:\s+feitas)?|o\s+que\s+mudou|ultimas?\s+altera[çc][õo]es?)/i.test(texto)) {
    return tratarComandoUltimasMudancas(chatId);
  }

  try {
    // 0A. Roteamento Inteligente de Termos Coloquiais e Siglas do Plantão
    if (tentarRoteamentoColoquialPlantao(texto, chatId)) return;

    // 0B. Dicionário de Correção de Erros de Digitação Comuns (Typos)
    var mapaTypos = {
      "clearence": "/crcl", "clerance": "/crcl", "clerence": "/crcl",
      "gasometria": "/gaso", "gasoarterial": "/gaso",
      "intubacao": "/sri", "intubação": "/sri", "entubacao": "/sri", "entubação": "/sri",
      "amoxilina": "amoxi", "amoxil": "amoxi",
      "receita": "/rx", "prescricao": "/rx", "prescrição": "/rx",
      "adrenalina": "/dva", "noradrenalina": "/dva nora", "dobutamina": "/dva dobuta",
      "eap": "/conduta EAP hipertensivo", "parada": "/conduta PCR"
    };
    var primPalavra = textoLow.split(/\s+/)[0].replace(/^\//, "");
    if (mapaTypos[primPalavra]) {
      var cmdCorrigido = mapaTypos[primPalavra];
      if (cmdCorrigido.charAt(0) === "/") {
        var restoTxt = texto.split(/\s+/).slice(1).join(" ");
        return processarMensagemTexto({ chat: message.chat, text: cmdCorrigido + (restoTxt ? " " + restoTxt : "") });
      }
    }

    // 0C. Normalização de Comandos Canônicos digitados sem barra (/)
    if (texto.charAt(0) !== "/") {
      if (/(?:choque\s+s[eé]ptico(?:\s+refrat[aá]rio)?|\bcirci\b)/i.test(texto)) {
        return processarMensagemTexto({ chat: message.chat, text: "/choqueseptico " + texto });
      }
      var comandosSemBarra = [
        "menu", "ajuda", "help", "manual", "start", "novo", "cancelar", "cockpit", "app",
        "soap", "rx", "rxh", "gaso", "winter", "crcl", "clcr", "clearance", "dva", "sri", "iot",
        "pcr", "acls", "conduta", "atb", "ped", "pals", "passagem", "sbar", "plantao", "leito", "enfermaria",
        "prenatal", "parto", "ginecologia", "go", "obstetricia", "oftalmo", "vertigem", "epistaxe", "colica",
        "asma", "dpoc", "icc", "fa", "frax", "quedas", "dermato", "toxo", "rcf", "saf",
        "swansea", "colestase", "monoartrite", "febrereumatica", "pancreatite",
        "diabetes", "anemia", "intox", "sca",
        "avc", "hic", "kdigo", "dhe", "eletrolitos", "acidobase", "interacao", "cid", "atestado", "hub", "emergencia",
        "dengue", "arbovirose", "chikungunya", "zika", "pac", "pneumonia", "curb", "curb65", "crb65", "itu", "cistite", "pielonefrite",
        "infeccaourinaria", "crisehipertensiva", "pseudocrise", "emergenciahipertensiva", "crisehas", "has", "cefaleia", "dorcabeca",
        "enxaqueca", "sutura", "ottawa", "tetano", "raiva", "mordedura", "ferimento", "obito", "declaracaoobito", "sinan",
        "glasgow", "choque", "eap", "anafilaxia", "convulsao", "hipercalemia", "hipoglicemia",
        "mudancas", "deploy"
      ];
      if (comandosSemBarra.indexOf(primPalavra) !== -1) {
        var ehEvolucaoLeitoNatural = (primPalavra === "leito" || primPalavra === "quarto") &&
          /^(?:leito|quarto)\s*[:#]?\s*[a-zA-Z0-9_-]{1,24}\s*[:,-]\s+/i.test(texto);
        if (!ehEvolucaoLeitoNatural) {
          texto = "/" + texto;
          textoLow = texto.toLowerCase();
        }
      }
    }

    var comando = textoLow.split(/\s/)[0];
    var contextoCache = CacheService.getScriptCache();
    var contextoKey = "ctx_" + chatId;

    // Gerenciamento de Memória (Contexto Clínico)
    if (comando === "/cancelar" || comando === "/novo" || texto === "🩺 Novo SOAP" || texto === "🧹 Novo Paciente" || texto === "🧹 Novo" || texto === "🧹 Limpar Paciente" || texto === "🧹 Limpar Memória") {
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

    // 1. Despacho O(1) de Atalhos do Teclado Fixo Persistente
    var resAtalho = rotearAtalhoTecladoFixo(texto, comando, chatId);
    if (resAtalho.executado) {
      return resAtalho.resultado;
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

  var clinicos = ["/preceptor", "/voz", "/sabatina", "/soap", "/soap_ambulatorial", "/ambulatorio", "/atestado", "/go", "/obstetricia", "/prenatal", "/dpp", "/parto", "/co", "/hpp", "/mgso4", "/preeclampsia", "/gbs", "/prematuridade", "/toxo", "/toxoplasmose", "/avidez", "/ginecologia", "/preventivo", "/sua", "/anticoncepcao", "/leucorreia", "/corrimento", "/dip", "/pelvica", "/idoso", "/aga", "/beers", "/cfs", "/frax", "/osteoporose", "/quedas", "/polifarmacia", "/frids", "/psiq", "/agitacao", "/suicidio", "/phq9", "/rx", "/rxh", "/prescricao_hospitalar", "/receita", "/plantao", "/sbar", "/calc", "/round", "/pitch", "/interacao", "/gaso", "/gasometria", "/winter", "/aniongap", "/conduta", "/sos", "/dva", "/compatibilidade", "/compatibilidade_y", "/sri", "/iot", "/pcr", "/acls", "/arritmia", "/taquiarritmia", "/taquicardia", "/bradiarritmia", "/bradicardia", "/crcl", "/clcr", "/clearance", "/dhe", "/eletrolitos", "/atb", "/ajuste", "/dpoc", "/vni", "/bipap", "/hipercapnia", "/asma", "/criseasma", "/broncoespasmo", "/salbutamol", "/monoartrite", "/artriteseptica", "/artriteséptica", "/gota", "/artrocentese", "/febrereumatica", "/fr", "/jones", "/aslo", "/dermato", "/lesao", "/lesoes", "/ulceragenital", "/cancro", "/donovanose", "/lgv", "/mpox", "/monkeypox", "/dengue", "/arbovirose", "/chikungunya", "/zika", "/pac", "/pneumonia", "/curb", "/curb65", "/crb65", "/itu", "/cistite", "/pielonefrite", "/infeccaourinaria", "/crisehas", "/crisehipertensiva", "/pseudocrise", "/emergenciahipertensiva", "/cefaleia", "/dorcabeca", "/enxaqueca", "/sutura", "/ottawa", "/tetano", "/raiva", "/mordedura", "/ferimento", "/obito", "/declaracaoobito", "/do", "/notificacao", "/sinan", "/leitos", "/censo"];

  // Se for comando clínico, salva no contexto de conversação (15 min)
  if (clinicos.indexOf(comando) !== -1) {
    if (comando !== "/voz" && comando !== "/sabatina" && comando !== "/preceptor" && typeof limparDialogoPreceptor === "function") {
      try { limparDialogoPreceptor(chatId); } catch (eLimparP) {}
    }
    if (texto.length > 6000) {
      return enviarMensagemParaChat(chatId, "⚠️ O caso excedeu o limite de caracteres. Use `/novo` e resuma.");
    }
    var ehPreceptorOuVozSemCaso = (comando === "/preceptor" || comando === "/voz" || comando === "/sabatina") && texto.trim() === comando;
    if (!ehPreceptorOuVozSemCaso) {
      safePutCache(contextoCache, contextoKey, texto, 900); // compatibilidade
    }
    if(typeof definirModoBot!=="undefined") {
      var mapaModos={"/preceptor":"voz","/soap":"soap","/soap_ambulatorial":"soap","/ambulatorio":"soap","/atestado":"atestado","/go":"ginecologia","/obstetricia":"ginecologia","/prenatal":"prenatal","/dpp":"prenatal","/parto":"parto","/co":"parto","/hpp":"hpp","/mgso4":"mgso4","/preeclampsia":"preeclampsia","/gbs":"gbs","/prematuridade":"prematuridade","/toxo":"toxo","/toxoplasmose":"toxo","/avidez":"toxo","/ginecologia":"ginecologia","/preventivo":"preventivo","/sua":"sua","/anticoncepcao":"anticoncepcao","/leucorreia":"leucorreia","/corrimento":"leucorreia","/dip":"dip","/pelvica":"dip","/idoso":"idoso","/aga":"idoso","/beers":"idoso","/cfs":"idoso","/frax":"frax","/osteoporose":"osteoporose","/quedas":"quedas","/polifarmacia":"polifarmacia","/frids":"polifarmacia","/psiq":"psiq","/agitacao":"psiq","/suicidio":"psiq","/phq9":"psiq","/rx":"rx","/rxh":"rxh","/prescricao_hospitalar":"rxh","/receita":"rx","/gaso":"gaso","/voz":"voz","/sabatina":"voz","/calc":"calc","/atb":"calc","/ajuste":"calc","/plantao":"plantao","/sbar":"plantao","/round":"round","/pitch":"round","/interacao":"interacao","/conduta":"conduta","/sos":"conduta","/pcr":"conduta","/acls":"conduta","/arritmia":"conduta","/taquiarritmia":"conduta","/taquicardia":"conduta","/bradiarritmia":"conduta","/bradicardia":"conduta","/dhe":"calc","/eletrolitos":"calc","/dpoc":"dpoc","/vni":"dpoc","/bipap":"dpoc","/hipercapnia":"dpoc","/asma":"asma","/criseasma":"asma","/broncoespasmo":"asma","/salbutamol":"asma","/monoartrite":"monoartrite","/artriteseptica":"monoartrite","/artriteséptica":"monoartrite","/gota":"monoartrite","/artrocentese":"monoartrite","/febrereumatica":"febrereumatica","/fr":"febrereumatica","/jones":"febrereumatica","/aslo":"febrereumatica","/dermato":"dermato","/lesao":"dermato","/lesoes":"dermato","/ulceragenital":"ulceragenital","/cancro":"ulceragenital","/donovanose":"ulceragenital","/lgv":"ulceragenital","/mpox":"mpox","/monkeypox":"mpox","/dengue":"dengue","/arbovirose":"dengue","/chikungunya":"dengue","/zika":"dengue","/pac":"pac","/pneumonia":"pac","/curb":"pac","/curb65":"pac","/crb65":"pac","/itu":"itu","/cistite":"itu","/pielonefrite":"itu","/infeccaourinaria":"itu","/crisehas":"crisehipertensiva","/crisehipertensiva":"crisehipertensiva","/pseudocrise":"crisehipertensiva","/emergenciahipertensiva":"crisehipertensiva","/cefaleia":"cefaleia","/dorcabeca":"cefaleia","/enxaqueca":"cefaleia","/sutura":"sutura","/ottawa":"sutura","/tetano":"sutura","/raiva":"sutura","/mordedura":"sutura","/ferimento":"sutura","/obito":"obito","/declaracaoobito":"obito","/do":"obito","/notificacao":"obito","/sinan":"obito","/leitos":"enfermaria","/censo":"enfermaria"};
      if (mapaModos[comando]) {
        var dadosCmd = texto.replace(/^\/\w+\s*/, "").trim();
        if (dadosCmd.length > 0) {
          definirModoBot(chatId, mapaModos[comando], dadosCmd);
        }
      }
    }
  } else if (texto.charAt(0) === "/") {
    contextoCache.remove(contextoKey);
    if (typeof limparDialogoPreceptor === "function") {
      try { limparDialogoPreceptor(chatId); } catch (eLimparP2) {}
    }
  }

    // 2. Despacho O(1) de Comandos de Sistema
    var resSistema = rotearComandoSistema(comando, texto, chatId);
    if (resSistema.executado) {
      return resSistema.resultado;
    }

    // 3. Despacho de Comandos de Emergência e Sala Vermelha
    var resEmergencia = despacharComandosEmergenciaSalaVermelha_(comando, texto, chatId, message);
    if (resEmergencia && resEmergencia.executado) {
      return resEmergencia.resultado;
    }

    // 4. Despacho de Comandos de Ambulatório e SOAP
    var resAmbulatorio = despacharComandosAmbulatorioESoap_(comando, texto, chatId, contextoCache, contextoKey);
    if (resAmbulatorio && resAmbulatorio.executado) {
      return resAmbulatorio.resultado;
    }

    // 5. Despacho de Comandos de Ginecologia e Obstetrícia
    var resGO = despacharComandosGinecologiaObstetricia_(comando, texto, chatId);
    if (resGO && resGO.executado) {
      return resGO.resultado;
    }

    // 6. Despacho de Comandos de Especialidades Clínicas Gerais e Exames
    var resEsp = despacharComandosEspecialidadesClinicas_(comando, texto, chatId);
    if (resEsp && resEsp.executado) {
      return resEsp.resultado;
    }

    // ───────────────────────────────────────────────────────────────────────────    // 5. Despacho de Comandos de Enfermaria, Plantão, Leitos e Prescrições
    var resEnf = despacharComandosEnfermariaPlantaoEReceitas_(comando, texto, chatId);
    if (resEnf && resEnf.executado) {
      return resEnf.resultado;
    }

    // 6. Despacho de Comandos de Calculadoras Clínicas, UTI & Emergência Intensiva
    var resUti = despacharComandosCalculadorasUTIEEmergenciaIntensiva_(comando, texto, chatId, contextoKey);
    if (resUti && resUti.executado) {
      return resUti.resultado;
    }

    // 7. Despacho de Comandos de Agenda, Rotina, Áudio & Preceptor
    var resAgenda = despacharComandosAgendaRotinaEAudio_(comando, texto, chatId, message);
    if (resAgenda && resAgenda.executado) {
      return resAgenda.resultado;
    }

    // 8. Rejeição Imediata O(1) de Comandos com Barra (/) Não Reconhecidos (Proteção Anti-Latência)
    if (comando.startsWith("/") && !comando.startsWith("//")) {
      var kbNaoReconhecido = {
        inline_keyboard: [
          [{ text: "📖 Ver Comandos", callback_data: "ajuda_todas" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
        ]
      };
      return enviarMensagemComTecladoParaChat(chatId, "⚠️ *Comando não reconhecido:* `" + comando + "`.\n\n💡 Digite /menu para opções rápidas ou /ajuda para o manual completo.", kbNaoReconhecido);
    }

  // 5. ROTEADOR DE INTENÇÃO AUTÔNOMO (SEM NECESSIDADE DE COMANDO COM BARRA /)
  // Roteamento de Rotina em Linguagem Natural
  var textoTrim = texto.trim();
  
  // Roteamento Clínico Inteligente sem comando '/'
  if (!comando.startsWith("/")) {
    // Obstetrícia
    if (/(?:DUM|DPP)\s*\d{1,2}[\/\.]\d{1,2}|G\d+P\d+A\d+|semanas\s+de\s+gesta[çc][ãa]o/i.test(textoTrim)) {
      message.text = "/prenatal " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:trabalho\s+de\s+parto|partograma|dilata[çc][ãa]o\s+\d+|altura\s+de\s+lee)/i.test(textoTrim)) {
      message.text = "/parto " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:hemorragia\s+p[oó]s[- ]parto|\bhpp\b|atonia\s+uterina|[ií]ndice\s+de\s+choque\s+obst[eé]trico|bal[ãa]o\s+de\s+bakri)/i.test(textoTrim)) {
      message.text = "/hpp " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:sulfato\s+de\s+magn[eé]sio|\bmgso4\b|pr[eé][- ]ecl[aâ]mpsia\s+grave|esquema\s+(?:zuspan|pritchard))/i.test(textoTrim)) {
      message.text = "/mgso4 " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:profilaxia\s+gbs|\bgbs\b\s+(?:parto|gestante|swab)|swab\s+vaginal\s+positivo|estreptococo\s+do\s+grupo\s+b)/i.test(textoTrim)) {
      message.text = "/gbs " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:amea[çc]a\s+de\s+parto\s+prematuro|parto\s+prematuro|tocolise|corticoide\s+para\s+matura[çc][ãa]o)/i.test(textoTrim)) {
      message.text = "/prematuridade " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:colestase\s+intra[- ]hep[aá]tica|\bcig\b\s+gesta[çc][ãa]o|[aá]cidos\s+biliares\s+gestante|[aá]cido\s+ursodesoxic[oó]lico)/i.test(textoTrim)) {
      message.text = "/colestase " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:esteatose\s+hep[aá]tica\s+aguda\s+da\s+gesta[çc][ãa]o|\behag\b|crit[eé]rios\s+de\s+swansea)/i.test(textoTrim)) {
      message.text = "/swansea " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:toxoplasmose\s+gesta[çc][ãa]o|toxoplasmose\s+gestante|avidez\s+de\s+igg\s+toxo|espiramicina\s+toxo)/i.test(textoTrim)) {
      message.text = "/toxo " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:restri[çc][ãa]o\s+de\s+crescimento\s+fetal|\brcf\b|\bciur\b|doppler\s+art[eé]ria\s+umbilical)/i.test(textoTrim)) {
      message.text = "/rcf " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:s[ií]ndrome\s+antifosfolip[ií]dio\s+gestante|\bsaf\b\s+gestante|trombofilia\s+na\s+gesta[çc][ãa]o|enoxaparina\s+gestante)/i.test(textoTrim)) {
      message.text = "/saf " + textoTrim;
      return processarMensagemTexto(message);
    }

    // Ginecologia
    if (/(?:citologia|preventivo|papanicolau).*?(?:ASC-US|LSIL|HSIL|AGC)/i.test(textoTrim) || /^preventivo/i.test(textoTrim)) {
      message.text = "/preventivo " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:SUA\s+aguda|sangramento\s+uterino|menstrua[çc][ãa]o\s+intensa)/i.test(textoTrim)) {
      message.text = "/sua " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:trocar\s+anticoncepcional|iniciar\s+anticoncepcional|p[íi]lula\s+anticoncepcional|DIU\s+de\s+(?:cobre|prata|hormonal))/i.test(textoTrim)) {
      message.text = "/anticoncepcao " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:corrimento\s+vaginal|vaginose\s+bacteriana|candid[ií]ase\s+vaginal|tricomon[ií]ase|\bleucorreia\b|cervicite)/i.test(textoTrim)) {
      message.text = "/corrimento " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:endometriose|dor\s+p[eé]lvica\s+cr[oô]nica|dienogeste)/i.test(textoTrim)) {
      message.text = "/endometriose " + textoTrim;
      return processarMensagemTexto(message);
    }

    // Geriatria
    if (/(?:clinical\s+frailty\s+scale|escala\s+de\s+fragilidade\s+cfs|\bcfs\b\s+\d)/i.test(textoTrim)) {
      message.text = "/cfs " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:mini[- ]cog|teste\s+do\s+rel[oó]gio\s+e\s+3\s+palavras)/i.test(textoTrim)) {
      message.text = "/minicog " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:timed\s+up\s+and\s+go|teste\s+tug\b)/i.test(textoTrim)) {
      message.text = "/tug " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:crit[eé]rios\s+de\s+beers|stopp\s+start|medicamentos\s+inapropriados\s+para\s+idosos)/i.test(textoTrim)) {
      message.text = "/beers " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:calculadora\s+frax|frax\s+brasil|risco\s+de\s+fratura\s+osteopor[oó]tica)/i.test(textoTrim)) {
      message.text = "/frax " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:osteoporose\s+tratamento|alendronato|zoledronato|t[- ]score\s+osteoporose)/i.test(textoTrim)) {
      message.text = "/osteoporose " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:quedas\s+no\s+idoso|risco\s+de\s+quedas\s+geriatria)/i.test(textoTrim)) {
      message.text = "/quedas " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:desprescri[çc][ãa]o|polifarm[aá]cia|\bfrids\b)/i.test(textoTrim)) {
      message.text = "/polifarmacia " + textoTrim;
      return processarMensagemTexto(message);
    }

    // Cardiopneumo
    if (/(?:fibrila[çc][ãa]o\s+atrial|\bfa\b\s+(?:aguda|de\s+alta\s+resposta)|chascore|hasbled)/i.test(textoTrim)) {
      message.text = "/fa " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:ic\s+descompensada|insufici[êe]ncia\s+card[íi]aca\s+fra[çc][ãa]o\s+reduzida|quarteto\s+fant[aá]stico)/i.test(textoTrim)) {
      message.text = "/icc " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:crise\s+asm[aá]tica|asma\s+grave|broncoespasmo\s+grave)/i.test(textoTrim)) {
      message.text = "/asma " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:dpoc\s+exacerbada|dpoc\s+descompensad[ao]|vni\s+no\s+dpoc|crit[eé]rios\s+de\s+anthonisen)/i.test(textoTrim)) {
      message.text = "/dpoc " + textoTrim;
      return processarMensagemTexto(message);
    }

    // Metabologia, Sangue & Nutrição
    if (/(?:[ií]ndice\s+de\s+mentzer|mentzer\s+vcm)/i.test(textoTrim)) {
      message.text = "/mentzer " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:f[oó]rmula\s+de\s+ganzoni|ganzoni\s+ferro|noripurum\s+dose)/i.test(textoTrim)) {
      message.text = "/ganzoni " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:cetoacidose\s+diab[eé]tica|protocolo\s+cad)/i.test(textoTrim)) {
      message.text = "/cad " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:estado\s+hiperosmolar\s+hiperglic[eé]mico|protocolo\s+ehh)/i.test(textoTrim)) {
      message.text = "/ehh " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:s[ií]ndrome\s+de\s+realimenta[çc][ãa]o|refeeding\s+syndrome)/i.test(textoTrim)) {
      message.text = "/refeeding " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:nutri[çc][ãa]o\s+parenteral\s+total|prescri[çc][ãa]o\s+npt)/i.test(textoTrim)) {
      message.text = "/npt " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:triagem\s+nrs[- ]?2002|escore\s+nrs)/i.test(textoTrim)) {
      message.text = "/nrs " + textoTrim;
      return processarMensagemTexto(message);
    }

    // Especialidades & Dermato
    if (/(?:monoartrite|artrite\s+s[eé]ptica|artrocentese|cristais\s+de\s+urato|pseudogota)/i.test(textoTrim)) {
      message.text = "/monoartrite " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:febre\s+reum[aá]tica|crit[eé]rios\s+de\s+jones|cardite\s+reum[aá]tica|cor[eé]ia\s+de\s+sydenham)/i.test(textoTrim)) {
      message.text = "/febrereumatica " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:queimadura\s+(?:qu[íi]mica\s+)?ocular|glaucoma\s+agudo|corpo\s+estranho\s+ocular)/i.test(textoTrim)) {
      message.text = "/oftalmo " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:herpes\s+zoster|zoster|herpes\s+simples|aciclovir\s+zoster|valaciclovir\s+zoster)/i.test(textoTrim)) {
      message.text = "/herpes " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:[uú]lcera\s+genital|[uú]lceras\s+genitais|cancro\s+duro|cancro\s+mole|donovanose|linfogranuloma\s+ven[eé]reo)/i.test(textoTrim)) {
      message.text = "/ulceragenital " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:s[ií]filis|colarete\s+de\s+biett|ros[eé]ola\s+sifil[ií]tica|penicilina\s+benzatina\s+s[ií]filis)/i.test(textoTrim)) {
      message.text = "/sifilis " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:mpox|monkeypox|var[ií]ola\s+dos\s+macacos)/i.test(textoTrim)) {
      message.text = "/mpox " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:les[aã]o\s+elementar|les[oõ]es\s+elementares|m[aá]cula\s+p[aá]pula|sinal\s+de\s+nikolsky|sinal\s+de\s+hutchinson)/i.test(textoTrim)) {
      message.text = "/dermato " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:protocolo\s+hints|s[ií]ndrome\s+vestibular|neurite\s+vestibular|vertigem\s+rotat[oó]ria|vppb|manobra\s+de\s+epley|dix-hallpike)/i.test(textoTrim)) {
      message.text = "/vertigem " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:epistaxe|sangramento\s+nasal|tamponamento\s+nasal|tamponamento\s+posterior|plexo\s+de\s+kiesselbach|sonda\s+de\s+foley\s+nasal)/i.test(textoTrim)) {
      message.text = "/epistaxe " + textoTrim;
      return processarMensagemTexto(message);
    }

    // Emergências
    if (/(?:choque\s+s[eé]ptico(?:\s+refrat[aá]rio)?|\bcirci\b|vasopressina\s+no\s+choque|hidrocortisona\s+no\s+choque)/i.test(textoTrim)) {
      message.text = "/choqueseptico " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:s[ií]ndrome\s+coronariana\s+aguda|escore\s+heart|dapt\s+no\s+iam|dupla\s+antiagrega[çc][ãa]o)/i.test(textoTrim)) {
      message.text = "/sca " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:avc\s+isqu[eê]mico\s+agudo|tromb[oó]lise\s+avc|alteplase\s+dose|tenecteplase\s+avc)/i.test(textoTrim)) {
      message.text = "/avc " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:hipertens[ãa]o\s+intracraniana|salina\s+hipert[oô]nica\s+3%|manitol\s+hic)/i.test(textoTrim)) {
      message.text = "/hic " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:intoxica[çc][ãa]o\s+ex[oó]gena|ant[ií]doto\s+para|tox[íi]ndrome|flumazenil|naloxona|atropiniza[çc][ãa]o)/i.test(textoTrim)) {
      message.text = "/intox " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:pancreatite\s+aguda\s+bisap|escore\s+bisap)/i.test(textoTrim)) {
      message.text = "/pancreatite " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:c[oó]lica\s+nefr[eé]tica|c[aá]lculo\s+ureteral|terapia\s+expulsiva\s+tansulosina)/i.test(textoTrim)) {
      message.text = "/colica " + textoTrim;
      return processarMensagemTexto(message);
    }

    // Pediatria
    if (/(?:bronquiolite\s+viral\s+aguda|\bbva\b\s+lactente|cnaf\s+bronquiolite)/i.test(textoTrim)) {
      message.text = "/bronquiolite " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:pals\s+pediatria|ressuscita[çc][ãa]o\s+pedi[aá]trica|pcr\s+pedi[aá]trico)/i.test(textoTrim)) {
      message.text = "/pals " + textoTrim;
      return processarMensagemTexto(message);
    }
    if (/(?:holliday[- ]segar|hidrata[çc][ãa]o\s+venosa\s+pediatria)/i.test(textoTrim)) {
      message.text = "/nutriped " + textoTrim;
      return processarMensagemTexto(message);
    }

    // Prescrição ambulatorial / receita
    if (/(?:prescri[çc][ãa]o|receita|prescrever)\s+(?:de\s+)?(?:amoxicilina|azitromicina|cefalexina|dipirona|paracetamol|ibuprofeno)/i.test(textoTrim) || /^quero\s+uma\s+receita\s+de/i.test(textoTrim)) {
      message.text = "/rx " + textoTrim;
      return processarMensagemTexto(message);
    }
  }

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

  // ⚡ FAST-PATH DETERMINÍSTICO (0ms a 15ms em RAM)
  // Cálculos puros (CURB-65, Glasgow, Parkland, DVA, Clearance, Diluição, Ajuste Renal)
  // NUNCA envie essas tarefas para o modelo de linguagem se a matemática/tabela está no código Node.js!
  var ehRelatoCaso = /\b(?:paciente|pcte)\b/i.test(texto);
  var ehConsultaDeterministica = !ehRelatoCaso && (
    /\b(?:curb|crcl|clcr|cockcroft|ckd|glasgow|parkland|queimadur|dva|nora|dobuta|vaso|nitroprussiato|nitroglicerina|dilui[çc][ãa]o|como\s+diluir|preparo|ajuste\s+renal)\b/i.test(texto) ||
    (typeof ehCalculadoraDeterministica === "function" && ehCalculadoraDeterministica(texto)) ||
    (typeof ehCalculadoraReconhecida === "function" && ehCalculadoraReconhecida(texto))
  );

  if (ehConsultaDeterministica && typeof tentarCalcularDeterministico === "function") {
    var resFastDet = tentarCalcularDeterministico(texto);
    if (resFastDet) {
      var ckFastCalc = Utilities.getUuid().replace(/-/g, "");
      safePutCache(CacheService.getScriptCache(), ckFastCalc, resFastDet, 21600);
      var tecladoFast = {
        inline_keyboard: [
          [{ text: "📋 Copiar Cálculo", callback_data: "ux:copiar:" + ckFastCalc }],
          [{ text: "🔙 Calculadoras", callback_data: "ux:hub:calc" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
        ]
      };
      return enviarMensagemComTecladoParaChat(chatId, resFastDet, tecladoFast);
    }
    if (typeof ehCalculadoraDeterministica === "function" && ehCalculadoraDeterministica(texto)) {
      var instrucoesDet = obterInstrucoesCalculadora(texto);
      if (instrucoesDet) {
        var tecladoFastInstr = {
          inline_keyboard: [
            [{ text: "🔙 Calculadoras", callback_data: "ux:hub:calc" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
          ]
        };
        return enviarMensagemComTecladoParaChat(chatId, instrucoesDet, tecladoFastInstr);
      }
    }
  }

  // Se for consulta de preparo/diluição de fármaco do Guia HSL, responde na hora sem chamar IA
  var matchDiluicao = texto.match(/(?:como\s+diluir|dilui[çc][ãa]o\s+d[eo]?|preparo\s+d[eo]?|tempo\s+de\s+infus[ãa]o\s+d[eo]?|estabilidade\s+d[eo]?)\s+([a-zA-Z0-9\s+]+)/i);
  if (matchDiluicao && matchDiluicao[1]) {
    var termoDroga = matchDiluicao[1].trim().replace(/[?!.]+$/, "");
    if (termoDroga.length >= 3 && typeof buscarMedicamentoNoHSL === "function") {
      var medHsl = buscarMedicamentoNoHSL(termoDroga);
      if (medHsl && (medHsl.preparo_diluicao || medHsl.administracao)) {
        var respDiluicao = formatarDiluicaoPreparoHSL(medHsl);
        if (respDiluicao) return enviarMensagemParaChat(chatId, respDiluicao);
      }
    }
  }

  // ⚡ FAST-PATH FARMACOLÓGICO DETERMINÍSTICO EM RAM (0ms a 15ms - SEM CHAMAR LLM)
  // Atende buscas diretas curtas sem barra (1 a 4 palavras)
  var palavrasFast = textoTrim.split(/\s+/).filter(Boolean);
  if (textoTrim.charAt(0) !== "/" && palavrasFast.length >= 1 && palavrasFast.length <= 4) {
    // A. Antimicrobianos com ajuste renal (ClCr/TFG/HD)
    if (/\b(?:clcr|crcl|tfg|clearance|hd|hemodialise|dialise)\b/i.test(textoTrim) && typeof consultarCatalogoAjusteRenal === "function") {
      var respAjusteRenalFast = consultarCatalogoAjusteRenal(textoTrim);
      if (respAjusteRenalFast) {
        return enviarMensagemParaChat(chatId, respAjusteRenalFast);
      }
    }

    // B. Apenas nome de fármaco (+ opcionalmente peso em kg / criança)
    var temPediatrico = /(\bkg\b|\bquilo|crian[çc]a|lactente|pediat|\bmes(?:es)?\b)/i.test(textoTrim);
    var termoApenasFarmaco = textoTrim
      .replace(/(?:peso\s*[:=]?\s*)?\d+(?:[.,]\d+)?\s*kg\b/gi, "")
      .replace(/crian[çc]a\s*(?:de\s*)?\d+(?:[.,]\d+)?(?:\s*kg)?/gi, "")
      .replace(/\bcrian[çc]a\b/gi, "")
      .replace(/\blactente\b/gi, "")
      .trim();

    if (termoApenasFarmaco && termoApenasFarmaco.length >= 3) {
      var medHslExiste = (typeof buscarMedicamentoNoHSL === "function") ? buscarMedicamentoNoHSL(termoApenasFarmaco) : null;
      var medPedExiste = (typeof buscarMedicamentoPediatricoPedB === "function") ? buscarMedicamentoPediatricoPedB(termoApenasFarmaco) : null;
      var ehFarmacoConhecido = !!(medHslExiste || medPedExiste);

      if (!ehFarmacoConhecido && typeof CATALOGO_AJUSTE_RENAL_ANTIMICROBIANOS !== "undefined") {
        var tNorm = termoApenasFarmaco.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (CATALOGO_AJUSTE_RENAL_ANTIMICROBIANOS[tNorm]) {
          ehFarmacoConhecido = true;
        }
      }

      if (ehFarmacoConhecido) {
        if (temPediatrico && typeof responderConsultaPediatricaPedB === "function") {
          return responderConsultaPediatricaPedB(chatId, textoTrim);
        }
        if (typeof responderConsultaPosologiaHSL === "function") {
          return responderConsultaPosologiaHSL(chatId, textoTrim);
        }
      }
    }
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
    var ehApenasChamado = !casoAudio || casoAudio.length < 5 || /^(?:ia|socr[áa]tico|bot|ajuda|online|plant[ãa]o|ouvir|fone|discutir|caso|um\s+caso)$/i.test(casoAudio);
    if (ehApenasChamado) {
      if (typeof iniciarOuConvidarDiscussaoPreceptor === "function") {
        return iniciarOuConvidarDiscussaoPreceptor(chatId, { ehAudio: false });
      }
      return enviarMensagemParaChat(chatId, "Opa Wagner! Qual paciente ou caso você quer discutir agora? Pode ditar a história, sinais vitais ou a dúvida que estou ouvindo.");
    }
    safePutCache(contextoCache, contextoKey, casoAudio, 900);
    return responderPreceptorVozComIA(chatId, casoAudio);
  }

  // CÁLCULOS DETERMINÍSTICOS DIRETOS EM RAM (0ms a 15ms)
  if (decisao.intencao === "CLINICO_EMERGENCIA") {
    var tEmerg = textoLow;
    var matchPesoGeral = texto.match(/(?:peso\s*[:=]?\s*)(\d+(?:[.,]\d+)?)/i) ||
                         texto.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i);

    // A. Drogas Vasoativas Puras
    if (matchPesoGeral && (tEmerg.indexOf("nora") !== -1 || tEmerg.indexOf("dobuta") !== -1 || tEmerg.indexOf("vaso") !== -1 || tEmerg.indexOf("dva") !== -1)) {
      var pDva = parseFloat(matchPesoGeral[1].replace(",", "."));
      if (typeof ValidadorFisiologico !== "undefined") {
        var vFisio = ValidadorFisiologico.validarParametro("peso", pDva);
        if (!vFisio.valido) return enviarMensagemParaChat(chatId, vFisio.alerta);
      }
      var drogaEleita = "noradrenalina";
      if (tEmerg.indexOf("dobuta") !== -1) drogaEleita = "dobutamina";
      else if (tEmerg.indexOf("vaso") !== -1) drogaEleita = "vasopressina";
      var solDva = /concentrad[ao]|dobrad[ao]|4x/i.test(texto) ? "concentrada" : "padrao";
      var resDva = CalculadorasClinicas.drogasVasoativas(drogaEleita, pDva, solDva);
      if (resDva) return enviarMensagemParaChat(chatId, resDva.textoFormatado || resDva.texto);
    }

    // B. Sequência Rápida de Intubação (SRI / IOT)
    if (matchPesoGeral && (/\b(?:sri|iot|intuba[çc][ãa]o)\b/i.test(texto))) {
      var pSri = parseFloat(matchPesoGeral[1].replace(",", "."));
      var cenarioSri = "padrao";
      if (/choque|hipotens[ãa]o|sepse/i.test(texto)) cenarioSri = "choque";
      else if (/asma|broncoespasmo|dpoc/i.test(texto)) cenarioSri = "asma";
      var resSri = CalculadorasClinicas.sequenciaRapidaIntubacao(pSri, cenarioSri);
      if (resSri) return enviarMensagemParaChat(chatId, resSri.textoFormatado || resSri.texto);
    }

    // C. Parkland em Queimaduras
    var matchParkland = texto.match(/(?:parkland|queimadur[as]?)\b.*?(?:(\d+(?:[.,]\d+)?)\s*kg).*?(\d+(?:[.,]\d+)?)\s*%/i) ||
                        texto.match(/(?:parkland|queimadur[as]?)\b.*?(\d+(?:[.,]\d+)?)\s*%.*?(?:(\d+(?:[.,]\d+)?)\s*kg)/i);
    if (matchParkland) {
      var pPark = parseFloat((matchParkland[1] || matchParkland[2]).replace(",", "."));
      var scqPark = parseFloat((matchParkland[2] || matchParkland[1]).replace(",", "."));
      var resPark = CalculadorasClinicas.parkland(pPark, scqPark);
      if (resPark) return enviarMensagemParaChat(chatId, resPark.textoFormatado || resPark.texto);
    }

    return processarEEntregarIA(chatId, gerarCondutaEmergenciaComIA, texto, "conduta");
  }

  if (decisao.intencao === "NOTION_TASK") {
    if (!ehUsuarioTitular(chatId)) return enviarMensagemParaChat(chatId, "🔒 O banco do Notion é exclusivo do titular. Use o /menu para consultar calculadoras e condutas médicas.");
    var okNovaTask = criarTarefaNotion(texto, "Personal", "2 · Important", "Captura autônoma via Telegram");
    if (okNovaTask) return enviarMensagemParaChat(chatId, "✅ *Tarefa salva no Inbox do Notion Tasks!*");
    enviarMensagemParaChat(chatId, "❌ Falha ao salvar no Notion. O pedido foi preservado na fila local ou verifique a configuração.");
    return false;
  }

  if (decisao.intencao === "NOTION_DUVIDA") {
    if (!ehUsuarioTitular(chatId)) return enviarMensagemParaChat(chatId, "🔒 O banco do Notion é exclusivo do titular. Use o /menu para consultar calculadoras e condutas médicas.");
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
    if (!ehUsuarioTitular(chatId)) return enviarMensagemParaChat(chatId, "🔒 O Second Brain do Notion é exclusivo do titular.");
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
    var linhaConversa = [
      {"text": "🎧 Ouvir no Fone", "callback_data": "ouvirPreceptor_" + cacheKeyConversa}
    ];
    if (ehUsuarioTitular(chatId)) {
      linhaConversa.push({"text": "📁 Salvar no Notion", "callback_data": "salvarNotion_conversa_" + cacheKeyConversa});
    }
    var botoesConversa = {
      "inline_keyboard": [linhaConversa]
    };
    return enviarMensagemComTecladoParaChat(chatId, respostaConversa, botoesConversa);
  }

    // Fallback conversacional
    enviarMensagemComTecladoFixo(chatId, "Como posso ajudar? Envie um caso clínico por texto ou áudio, ou use /menu.");
  } catch (errGlobal) {
    if (typeof console !== "undefined" && console.error) {
      console.error("[Telegram Handler Error]", errGlobal);
    }
    try {
      var erroMsg = (errGlobal && errGlobal.message) ? errGlobal.message : "Erro interno não especificado.";
      enviarMensagemParaChat(chatId, "⚠️ *Desculpe, ocorreu um erro ao processar seu comando.*\n\n" +
        "• *Detalhe:* `" + erroMsg + "`\n\n" +
        "💡 _Dica: Digite /menu ou verifique a sintaxe dos parâmetros informados._");
    } catch (eEnvio) {}
  }
}
