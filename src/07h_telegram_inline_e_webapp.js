/**
 * ==============================================================================
 * ULTRA ROTINA · TELEGRAM MINI APP (WEBAPP) & INLINE MODE
 * ==============================================================================
 * 1. Resposta instantânea (<50ms) a consultas em linha (@UltraRotinaBot [busca])
 *    em qualquer chat, grupo de plantão ou mensagem privada do Telegram.
 * 2. Integração bidirecional com Telegram Mini App (Cockpit PWA):
 *    - Configuração de Chat Menu Button com WebApp em tela cheia.
 *    - Processamento de web_app_data enviados pelo Cockpit para o chat.
 * ==============================================================================
 */

/**
 * Envia o resultado estruturado da busca inline para a API do Telegram.
 * @param {string} inlineQueryId - ID único da consulta inline recebida.
 * @param {Array<Object>} results - Vetor de InlineQueryResultArticle.
 * @param {number} [cacheTime=30] - Tempo de cache em segundos no cliente Telegram.
 * @returns {boolean} Sucesso da chamada HTTP.
 */
function responderInlineQueryTelegram(inlineQueryId, results, cacheTime) {
  if (!inlineQueryId || !Array.isArray(results)) return false;
  var token = (typeof ConfigService !== "undefined" && ConfigService.get)
    ? ConfigService.get("TELEGRAM_BOT_TOKEN")
    : null;
  if (!token) return false;

  var payload = {
    inline_query_id: String(inlineQueryId),
    results: results.slice(0, 20), // Telegram limita a 50 itens por resposta
    cache_time: typeof cacheTime === "number" ? cacheTime : 30,
    is_personal: true
  };

  var url = "https://api.telegram.org/bot" + token + "/answerInlineQuery";
  if (typeof executarPostTelegram === "function") {
    return executarPostTelegram(url, payload);
  }

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  try {
    var res = UrlFetchApp.fetch(url, options);
    return res.getResponseCode() === 200;
  } catch (err) {
    Logger.log("Erro ao responder inline query: " + err.message);
    return false;
  }
}

/**
 * Configura o botão fixo de menu do chat do Telegram (ao lado do teclado)
 * para abrir diretamente o Cockpit PWA em tela cheia (Mini App).
 * @param {string|number} [chatId] - Chat ID específico ou todos os chats se omitido.
 * @returns {boolean} Sucesso da chamada.
 */
function configurarMenuButtonTelegram(chatId) {
  var token = (typeof ConfigService !== "undefined" && ConfigService.get)
    ? ConfigService.get("TELEGRAM_BOT_TOKEN")
    : null;
  if (!token) return false;

  var urlCockpit = (typeof obterUrlCockpit === "function")
    ? obterUrlCockpit(chatId)
    : "https://wagmms.github.io/cockpit/";

  var payload = {
    menu_button: {
      type: "web_app",
      text: "🩺 Cockpit",
      web_app: {
        url: urlCockpit
      }
    }
  };
  if (chatId) {
    payload.chat_id = chatId;
  }

  var url = "https://api.telegram.org/bot" + token + "/setChatMenuButton";
  if (typeof executarPostTelegram === "function") {
    return executarPostTelegram(url, payload);
  }

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  try {
    var res = UrlFetchApp.fetch(url, options);
    return res.getResponseCode() === 200;
  } catch (err) {
    return false;
  }
}

/**
 * Cria a estrutura padronizada de um artigo InlineQueryResultArticle.
 * @param {string} id - Identificador único do card.
 * @param {string} titulo - Título em destaque do card.
 * @param {string} descricao - Subtítulo / resumo rápido beira-leito.
 * @param {string} mensagemHtml - Mensagem médica completa enviada no chat ao tocar no card.
 * @param {string} [urlApp] - URL opcional do Mini App para botão de ação.
 * @returns {Object} Objeto do tipo InlineQueryResultArticle.
 */
function criarArtigoInline_(id, titulo, descricao, mensagemHtml, urlApp) {
  var urlCockpit = urlApp || ((typeof obterUrlCockpit === "function") ? obterUrlCockpit() : "https://wagmms.github.io/cockpit/");
  var artigo = {
    type: "article",
    id: String(id),
    title: titulo,
    description: descricao,
    input_message_content: {
      message_text: mensagemHtml,
      parse_mode: "HTML"
    },
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📱 Abrir no Cockpit", web_app: { url: urlCockpit } }
        ]
      ]
    }
  };
  return artigo;
}

/**
 * Construtores de Artigos Clínicos Especializados para Busca Inline
 */

function _inlineCardNora(pesoInformado) {
  var peso = (typeof pesoInformado === "number" && pesoInformado > 0) ? pesoInformado : 70;
  // Diluição padrão: 4 amp (16mg = 16.000 mcg) em 234 mL SG5% = 64 mcg/mL
  // mL/h = (mcg/kg/min * peso * 60) / 64
  var v005 = ((0.05 * peso * 60) / 64).toFixed(1);
  var v01 = ((0.1 * peso * 60) / 64).toFixed(1);
  var v02 = ((0.2 * peso * 60) / 64).toFixed(1);
  var v05 = ((0.5 * peso * 60) / 64).toFixed(1);
  var v10 = ((1.0 * peso * 60) / 64).toFixed(1);

  var html = "💉 <b>NORADRENALINA (HEMITARTARATO) — GUIA RÁPIDO DVA</b>\n" +
    "───────────────────────────\n" +
    "⚖️ <b>Peso de Referência:</b> " + peso + " kg\n" +
    "🎯 <b>Alvo Terapêutico:</b> PAM ≥ 65 mmHg (Choque Séptico / Vasoplégico)\n\n" +
    "🧪 <b>Solução Padrão (64 mcg/mL):</b>\n" +
    "• 4 ampolas (16 mg = 16 mL) + 234 mL SG 5% (Vol. Final 250 mL)\n\n" +
    "📊 <b>Guia de Vazão em BIC (mL/h):</b>\n" +
    "• 0,05 mcg/kg/min (inicial): <b>" + v005 + " mL/h</b>\n" +
    "• 0,10 mcg/kg/min (usual): <b>" + v01 + " mL/h</b>\n" +
    "• 0,20 mcg/kg/min (moderada): <b>" + v02 + " mL/h</b>\n" +
    "• 0,50 mcg/kg/min (elevada): <b>" + v05 + " mL/h</b>\n" +
    "• 1,00 mcg/kg/min (refratária): <b>" + v10 + " mL/h</b>\n\n" +
    "⚠️ <b>Salvaguardas de Segurança:</b>\n" +
    "• Acesso venoso central exclusivo (CVC) sempre que viável.\n" +
    "• Se periférico transitório: veia calibrosa antecubital, vigiar extravasamento (antídoto: Fentolamina).\n" +
    "• Em doses > 0,25 mcg/kg/min: associar Vasopressina 0,03 UI/min.";

  return criarArtigoInline_(
    "dva_nora_" + peso,
    "💉 Noradrenalina (DVA) — " + peso + " kg",
    "0,05 a 2 mcg/kg/min. Padrão 4 amp/234 mL SG5% (64 mcg/mL). PAM ≥ 65 mmHg.",
    html
  );
}

function _inlineCardVaso() {
  var html = "💉 <b>VASOPRESSINA — GUIA RÁPIDO DVA</b>\n" +
    "───────────────────────────\n" +
    "🎯 <b>Indicação:</b> Choque séptico refratário a doses moderadas de Noradrenalina (poupador de catecolamina)\n\n" +
    "🧪 <b>Preparo Padrão (0,2 UI/mL):</b>\n" +
    "• 1 ampola (20 UI = 1 mL) + 99 mL SG 5% ou SF 0,9% (Vol. Final 100 mL)\n\n" +
    "📊 <b>Dose Fixa Recomendada:</b>\n" +
    "• <b>0,03 UI/min</b> em BIC contínua (infusão fixa de <b>9,0 mL/h</b>)\n" +
    "• Faixa permitida: 0,01 a 0,04 UI/min (3 a 12 mL/h)\n\n" +
    "⚠️ <b>Regras de Ouro:</b>\n" +
    "• NÃO titular como a Noradrenalina; manter infusão fixa em BIC.\n" +
    "• Desmame: iniciar o desmame da Vasopressina apenas após o desmame completo ou avançado da Noradrenalina.";

  return criarArtigoInline_(
    "dva_vaso",
    "💉 Vasopressina — 0,01 a 0,04 UI/min",
    "Dose fixa em BIC (usual 0,03 UI/min = 9 mL/h). 1 amp/99 mL SG5% (0,2 UI/mL).",
    html
  );
}

function _inlineCardDobuta(pesoInformado) {
  var peso = (typeof pesoInformado === "number" && pesoInformado > 0) ? pesoInformado : 70;
  // Diluição padrão: 1 amp (250 mg = 250.000 mcg) em 230 mL SG5% = 1.000 mcg/mL
  // mL/h = (mcg/kg/min * peso * 60) / 1000
  var v25 = ((2.5 * peso * 60) / 1000).toFixed(1);
  var v5 = ((5.0 * peso * 60) / 1000).toFixed(1);
  var v10 = ((10.0 * peso * 60) / 1000).toFixed(1);
  var v15 = ((15.0 * peso * 60) / 1000).toFixed(1);
  var v20 = ((20.0 * peso * 60) / 1000).toFixed(1);

  var html = "💉 <b>DOBUTAMINA — GUIA INOTRÓPICO</b>\n" +
    "───────────────────────────\n" +
    "⚖️ <b>Peso de Referência:</b> " + peso + " kg\n" +
    "🎯 <b>Indicação:</b> Choque cardiogênico ou disfunção miocárdica com má perfusão periférica (ScvO2 &lt; 70%)\n\n" +
    "🧪 <b>Preparo Padrão (1.000 mcg/mL):</b>\n" +
    "• 1 ampola (250 mg = 20 mL) + 230 mL SG 5% (Vol. Final 250 mL)\n\n" +
    "📊 <b>Vazão em BIC (mL/h):</b>\n" +
    "• 2,5 mcg/kg/min (início suave): <b>" + v25 + " mL/h</b>\n" +
    "• 5,0 mcg/kg/min (dose usual): <b>" + v5 + " mL/h</b>\n" +
    "• 10,0 mcg/kg/min (inotrópico pleno): <b>" + v10 + " mL/h</b>\n" +
    "• 15,0 mcg/kg/min (elevada): <b>" + v15 + " mL/h</b>\n" +
    "• 20,0 mcg/kg/min (dose máxima): <b>" + v20 + " mL/h</b>\n\n" +
    "⚠️ <b>Vigilância:</b> Pode provocar taquiarritmias e vasodilatação periférica (queda de PAM).";

  return criarArtigoInline_(
    "dva_dobuta_" + peso,
    "💉 Dobutamina (Inotrópico) — " + peso + " kg",
    "2 a 20 mcg/kg/min. Padrão 1 amp/230 mL SG5% (1.000 mcg/mL). ScvO2 e perfusão.",
    html
  );
}

function _inlineCardSri(pesoInformado) {
  var peso = (typeof pesoInformado === "number" && pesoInformado > 0) ? pesoInformado : 70;
  // Doses SRI
  var etoMg = (0.3 * peso).toFixed(0);
  var etoMl = (0.3 * peso / 2).toFixed(1); // 2 mg/mL
  var quetMg = (1.5 * peso).toFixed(0);
  var quetMl = (1.5 * peso / 50).toFixed(1); // 50 mg/mL
  var succMg = (1.0 * peso).toFixed(0);
  var rocurMg = (1.2 * peso).toFixed(0);
  var rocurMl = (1.2 * peso / 10).toFixed(1); // 10 mg/mL
  var fentMcg = (2.0 * peso).toFixed(0);
  var fentMl = (2.0 * peso / 50).toFixed(1); // 50 mcg/mL

  var html = "🫁 <b>SEQUÊNCIA RÁPIDA DE INTUBAÇÃO (SRI / IOT)</b>\n" +
    "───────────────────────────\n" +
    "⚖️ <b>Peso:</b> " + peso + " kg\n\n" +
    "1️⃣ <b>Pré-Tratamento / Analgesia:</b>\n" +
    "• Fentanil (50 mcg/mL): <b>" + fentMcg + " mcg (" + fentMl + " mL)</b> IV lento (se cardiopatia/AVE)\n\n" +
    "2️⃣ <b>Indução / Hipnótico (Escolher 1):</b>\n" +
    "• <b>Etomidato (2 mg/mL):</b> 0,3 mg/kg = <b>" + etoMg + " mg (" + etoMl + " mL)</b> — <i>Estabilidade hemodinâmica</i>\n" +
    "• <b>Quetamina (50 mg/mL):</b> 1,5 mg/kg = <b>" + quetMg + " mg (" + quetMl + " mL)</b> — <i>Broncoespasmo / Choque</i>\n\n" +
    "3️⃣ <b>Bloqueio Neuromuscular (Escolher 1):</b>\n" +
    "• <b>Succinilcolina (pó 100mg):</b> 1,0 mg/kg = <b>" + succMg + " mg</b> IV (Contraindicado em K+ elevado, queimados &gt;72h)\n" +
    "• <b>Rocurônio (10 mg/mL):</b> 1,2 mg/kg = <b>" + rocurMg + " mg (" + rocurMl + " mL)</b> IV — <i>Paralisia em 60s</i>\n\n" +
    "📏 <b>Tubo Traqueal (TOT):</b>\n" +
    "• Homem: 7,5 a 8,5 mm (Fixação: ~22-23 cm na rima labial)\n" +
    "• Mulher: 7,0 a 7,5 mm (Fixação: ~21-22 cm na rima labial)";

  return criarArtigoInline_(
    "sri_" + peso,
    "🫁 Intubação em Sequência Rápida (SRI) — " + peso + " kg",
    "Etomidato (" + etoMl + " mL), Quetamina (" + quetMl + " mL), Rocurônio (" + rocurMl + " mL), Succinilcolina.",
    html
  );
}

function _inlineCardCurb65() {
  var html = "🫁 <b>ESCORE CURB-65 — PNEUMONIA ADQUIRIDA NA COMUNIDADE</b>\n" +
    "───────────────────────────\n" +
    "📋 <b>Critérios de Pontuação (1 ponto cada):</b>\n" +
    "• <b>C (Confusão mental):</b> Desorientação no tempo/espaço/pessoa\n" +
    "• <b>U (Ureia &gt; 50 mg/dL):</b> Ou BUN &gt; 19 mg/dL\n" +
    "• <b>R (Frequência Respiratória):</b> ≥ 30 irpm\n" +
    "• <b>B (Pressão Arterial):</b> PAS &lt; 90 mmHg ou PAD ≤ 60 mmHg\n" +
    "• <b>65 (Idade):</b> ≥ 65 anos\n\n" +
    "📊 <b>Estratificação & Conduta:</b>\n" +
    "• <b>0 a 1 ponto:</b> Baixo risco (mortalidade &lt; 1,5%). Tratamento <b>Ambulatorial</b> (Amoxicilina + Clavulanato ou Macrolídeo).\n" +
    "• <b>2 pontos:</b> Risco intermediário (mortalidade ~9%). Considerar <b>Internação em Enfermaria</b>.\n" +
    "• <b>≥ 3 pontos:</b> Alto risco (mortalidade &gt; 20%). Internação hospitalar mandatória; avaliar <b>UTI se ≥ 4 pontos</b>.";

  return criarArtigoInline_(
    "calc_curb65",
    "🫁 CURB-65 — Gravidade da Pneumonia (PAC)",
    "Confusão, Ureia > 50, FR ≥ 30, PA < 90/60, Idade ≥ 65. Conduta: Ambulatório vs Enfermaria vs UTI.",
    html
  );
}

function _inlineCardWellsTep() {
  var html = "🫀 <b>ESCORE DE WELLS — TROMBOEMBOLISMO PULMONAR (TEP)</b>\n" +
    "───────────────────────────\n" +
    "📋 <b>Critérios e Pontuação:</b>\n" +
    "• Sinais/sintomas clínicos de TVP: <b>+3,0</b>\n" +
    "• Diagnóstico alternativo menos provável que TEP: <b>+3,0</b>\n" +
    "• FC &gt; 100 bpm: <b>+1,5</b>\n" +
    "• Imobilização ≥ 3 dias ou cirurgia recente (&lt; 4 semanas): <b>+1,5</b>\n" +
    "• TEP ou TVP prévio: <b>+1,5</b>\n" +
    "• Hemoptise: <b>+1,0</b>\n" +
    "• Câncer ativo (tratamento em 6 meses ou paliativo): <b>+1,0</b>\n\n" +
    "🎯 <b>Conduta Baseada na Probabilidade:</b>\n" +
    "• <b>Improvável (≤ 4 pontos):</b> Dosar <b>D-Dímero</b> (alta sensibilidade). Se normal, afasta TEP sem TC.\n" +
    "• <b>Provável (&gt; 4 pontos):</b> Solicitar <b>Angio-TC de Tórax</b> direta (dispensa D-Dímero inicial).";

  return criarArtigoInline_(
    "calc_wells_tep",
    "🫀 Wells TEP — Probabilidade de Tromboembolismo",
    "Escore de Wells (ESC/SBPT). ≤4: D-dímero; >4: Angio-TC de tórax imediata.",
    html
  );
}

function _inlineCardGaso() {
  var html = "🧪 <b>GASOMETRIA ARTERIAL — ROTEIRO DE ANÁLISE EM 4 PASSOS</b>\n" +
    "───────────────────────────\n" +
    "1️⃣ <b>Valores de Referência Canônicos:</b>\n" +
    "• pH: 7,35 a 7,45 | pCO2: 35 a 45 mmHg | HCO3: 22 a 26 mEq/L | BE: -2 a +2\n\n" +
    "2️⃣ <b>Distúrbio Primário:</b>\n" +
    "• pH &lt; 7,35: Acidose (se HCO3 &lt; 22 = Metabólica; se pCO2 &gt; 45 = Respiratória)\n" +
    "• pH &gt; 7,45: Alcalose (se HCO3 &gt; 26 = Metabólica; se pCO2 &lt; 35 = Respiratória)\n\n" +
    "3️⃣ <b>Compensação Respiratória (Fórmula de Winter):</b>\n" +
    "• <i>Na Acidose Metabólica:</i> <b>pCO2 esperado = (1,5 × HCO3) + 8 ± 2</b>\n" +
    "• Se pCO2 medido &gt; esperado: Acidose Respiratória concomitante associada!\n" +
    "• Se pCO2 medido &lt; esperado: Alcalose Respiratória concomitante associada!\n\n" +
    "4️⃣ <b>Anion Gap (AG) e Relação Delta/Delta:</b>\n" +
    "• <b>AG = Na - (Cl + HCO3)</b> (Normal: 8 a 12 mEq/L)\n" +
    "• Na acidose metabólica com AG elevado: calcular Delta AG / Delta HCO3 (0,8 a 1,2).";

  return criarArtigoInline_(
    "calc_gaso",
    "🧪 Gasometria Arterial — Análise Ácido-Base em 4 Passos",
    "pH, pCO2, HCO3, Fórmula de Winter (pCO2 = 1.5xHCO3 + 8 ± 2) e Anion Gap.",
    html
  );
}

function _inlineCardGlasgow() {
  var html = "🧠 <b>ESCALA DE COMA DE GLASGOW COM REATIVIDADE PUPILAR (GCS-P)</b>\n" +
    "───────────────────────────\n" +
    "👁️ <b>Abertura Ocular (1-4):</b>\n" +
    "• 4: Espontânea | 3: Ao som | 2: À pressão | 1: Ausente\n\n" +
    "🗣️ <b>Resposta Verbal (1-5):</b>\n" +
    "• 5: Orientada | 4: Confusa | 3: Palavras inapropriadas | 2: Sons ininteligíveis | 1: Ausente\n\n" +
    "💪 <b>Resposta Motora (1-6):</b>\n" +
    "• 6: À ordem | 5: Localiza dor | 4: Flexão normal | 3: Decorticação | 2: Descerebração | 1: Ausente\n\n" +
    "🔦 <b>Avaliação Pupilar (GCS-P = Pontuação - Pupilas não-reativas):</b>\n" +
    "• 2 pupilas reativas: -0 ponto\n" +
    "• 1 pupila não-reativa: -1 ponto\n" +
    "• Nenhuma pupila reativa: -2 pontos\n\n" +
    "⚠️ <b>Alerta de IOT:</b> Glasgow ≤ 8 ou perda de reflexos de via aérea indica intubação imediata.";

  return criarArtigoInline_(
    "calc_glasgow",
    "🧠 Glasgow-P (GCS-P) — Avaliação Neurológica",
    "Abertura Ocular (1-4), Verbal (1-5), Motora (1-6) e Pupilas (-0 a -2). Alerta IOT ≤ 8.",
    html
  );
}

function _inlineCardCockpitApp(chatId) {
  var urlApp = (typeof obterUrlCockpit === "function") ? obterUrlCockpit(chatId) : "https://wagmms.github.io/cockpit/";
  var html = "📱 <b>COCKPIT CLÍNICO ULTRA ROTINA (MINI APP PWA)</b>\n" +
    "───────────────────────────\n" +
    "Painel integrado de alta performance com 6 módulos essenciais:\n\n" +
    "• 🚨 <b>Sala Vermelha & DVA:</b> Doses em tempo real e compatibilidade em Y\n" +
    "• 🛏️ <b>Enfermaria & Leitos:</b> Gestão de censo e passagem de plantão SBAR\n" +
    "• 💊 <b>Guia Farmacêutico & REMUME:</b> Catálogo posológico completo\n" +
    "• 🧮 <b>Calculadoras Clínicas:</b> CrCl, Gasometria, SRI, Parkland e DHE\n" +
    "• 📋 <b>Evolução SOAP:</b> Preceptor socrático e nota de prontuário em 1 toque\n\n" +
    "<i>Toque no botão abaixo para abrir a ferramenta em tela cheia no Telegram.</i>";

  return criarArtigoInline_(
    "app_cockpit_mini",
    "📱 Abrir Cockpit Clínico em Tela Cheia (Telegram Mini App)",
    "6 abas: Sala Vermelha, DVA, Leitos SBAR, REMUME, Cálculos e SOAP.",
    html,
    urlApp
  );
}

/**
 * Monta os artigos de resposta da query inline de forma determinística e ultrarrápida (<5ms).
 * @param {string} queryTexto - Texto pesquisado pelo usuário.
 * @param {string|number} [chatId] - Chat ID para montagem de links autenticados.
 * @returns {Array<Object>} Lista de artigos para o Telegram.
 */
function montarResultadosInlineClinicos(queryTexto, chatId) {
  var termo = String(queryTexto || "").trim().toLowerCase();
  var resultados = [];

  // 1. Extração de peso opcional (ex: "nora 80", "sri 65", "dobuta 75")
  var matchPeso = termo.match(/(\d+(?:[.,]\d+)?)\s*k?g?/);
  var pesoNum = matchPeso ? parseFloat(matchPeso[1].replace(",", ".")) : null;
  if (pesoNum && (pesoNum < 1 || pesoNum > 300)) pesoNum = null;

  // 2. Roteamento por termo específico
  if (/^(?:nora|noradrenalina)/i.test(termo)) {
    resultados.push(_inlineCardNora(pesoNum || 70));
    resultados.push(_inlineCardVaso());
    resultados.push(_inlineCardDobuta(pesoNum || 70));
    resultados.push(_inlineCardSri(pesoNum || 70));
  } else if (/^(?:vaso|vasopressina)/i.test(termo)) {
    resultados.push(_inlineCardVaso());
    resultados.push(_inlineCardNora(pesoNum || 70));
  } else if (/^(?:dobuta|dobutamina)/i.test(termo)) {
    resultados.push(_inlineCardDobuta(pesoNum || 70));
    resultados.push(_inlineCardNora(pesoNum || 70));
  } else if (/^(?:sri|iot|intuba)/i.test(termo)) {
    resultados.push(_inlineCardSri(pesoNum || 70));
    resultados.push(_inlineCardNora(pesoNum || 70));
    resultados.push(_inlineCardGlasgow());
  } else if (/^(?:curb|curb65|curb-65|pac)/i.test(termo)) {
    resultados.push(_inlineCardCurb65());
    resultados.push(_inlineCardGaso());
  } else if (/^(?:wells|tep|tvp)/i.test(termo)) {
    resultados.push(_inlineCardWellsTep());
  } else if (/^(?:gaso|gasometria|winter|acido)/i.test(termo)) {
    resultados.push(_inlineCardGaso());
  } else if (/^(?:glasgow|gcs)/i.test(termo)) {
    resultados.push(_inlineCardGlasgow());
    resultados.push(_inlineCardSri(pesoNum || 70));
  } else if (/^(?:app|cockpit|painel|menu)/i.test(termo)) {
    resultados.push(_inlineCardCockpitApp(chatId));
  } else if (termo.length >= 3) {
    // 3. Busca de Medicamentos no Guia Farmacêutico Local (HSL)
    try {
      if (typeof buscarMedicamentoNoHSL === "function") {
        var med = buscarMedicamentoNoHSL(termo);
        if (med) {
          var nomeMed = med.nome_comum || med.nome_normalizado || termo.toUpperCase();
          var descMed = (med.indicacoes || med.via || "Guia Farmacêutico").slice(0, 100);
          var htmlMed = "💊 <b>" + (med.nome_comum || nomeMed).toUpperCase() + "</b>\n" +
            "───────────────────────────\n" +
            "• <b>Princípio Ativo:</b> " + (med.principio_ativo || nomeMed) + "\n" +
            "• <b>Via de Administração:</b> " + (med.via || "Ver prescrição") + "\n" +
            "• <b>Posologia Adulto:</b> " + (med.dose_adulto || "Conforme protocolo clínico") + "\n" +
            (med.ajuste_renal ? ("• <b>Ajuste Renal:</b> " + med.ajuste_renal + "\n") : "") +
            (med.alertas ? ("⚠️ <b>Alertas:</b> " + med.alertas + "\n") : "");

          resultados.push(criarArtigoInline_("med_" + encodeURIComponent(nomeMed), "💊 " + nomeMed, descMed, htmlMed));
        }
      }
    } catch (_) {}
  }

  // 4. Se a query estiver vazia ou com poucos resultados, compõe a grade clínica canônica padrão
  if (resultados.length === 0) {
    resultados.push(_inlineCardNora(pesoNum || 70));
    resultados.push(_inlineCardVaso());
    resultados.push(_inlineCardDobuta(pesoNum || 70));
    resultados.push(_inlineCardSri(pesoNum || 70));
    resultados.push(_inlineCardCurb65());
    resultados.push(_inlineCardWellsTep());
    resultados.push(_inlineCardGaso());
    resultados.push(_inlineCardGlasgow());
    resultados.push(_inlineCardCockpitApp(chatId));
  } else {
    // Garante que o atalho do Cockpit esteja sempre acessível ao final
    resultados.push(_inlineCardCockpitApp(chatId));
  }

  return resultados;
}

/**
 * Ponto de entrada oficial para processamento de Inline Query do Telegram.
 * @param {Object} inlineQuery - Objeto inline_query recebido no update.
 * @returns {boolean}
 */
function processarInlineQuery(inlineQuery) {
  if (!inlineQuery || !inlineQuery.id) return false;
  var queryTexto = inlineQuery.query || "";
  var fromId = inlineQuery.from ? inlineQuery.from.id : null;
  var resultados = montarResultadosInlineClinicos(queryTexto, fromId);
  return responderInlineQueryTelegram(inlineQuery.id, resultados, 30);
}

/**
 * Ponto de entrada oficial para processamento de mensagens com web_app_data
 * originadas do Cockpit PWA (quando o médico clica em 'Enviar para o Chat').
 * @param {Object} message - Objeto message do Telegram com propriedade web_app_data.
 * @returns {boolean}
 */
function processarWebAppData(message) {
  if (!message || !message.web_app_data || !message.chat) return false;
  var rawData = message.web_app_data.data || "{}";
  var chatId = message.chat.id;

  var payload;
  try {
    payload = JSON.parse(rawData);
  } catch (err) {
    var txtSimples = "📱 <b>DADOS DO COCKPIT RECEBIDOS</b>\n\n" + String(rawData).slice(0, 1000);
    return (typeof enviarMensagemParaChat === "function") ? enviarMensagemParaChat(chatId, txtSimples) : false;
  }

  var tipo = payload.tipo || payload.acao || "registro";
  var titulo = payload.titulo || "Sincronização Cockpit PWA";
  var conteudo = payload.conteudo || payload.texto || payload.dados || "";

  var msgFormatada = "📱 <b>" + String(titulo).toUpperCase() + "</b>\n" +
    "───────────────────────────\n" +
    "Origem: <i>Cockpit Mini App</i>\n\n" +
    (typeof conteudo === "string" ? conteudo : JSON.stringify(conteudo, null, 2)) + "\n\n" +
    "✅ <i>Dados integrados com sucesso à sua sessão clínica.</i>";

  var kb = {
    inline_keyboard: [
      [
        { text: "📋 Copiar para Prontuário", callback_data: "ux:soap:copiar" },
        { text: "📱 Reabrir Cockpit", web_app: { url: (typeof obterUrlCockpit === "function") ? obterUrlCockpit(chatId) : "" } }
      ]
    ]
  };

  if (typeof enviarMensagemComTecladoParaChat === "function") {
    return enviarMensagemComTecladoParaChat(chatId, msgFormatada, kb);
  }
  if (typeof enviarMensagemParaChat === "function") {
    return enviarMensagemParaChat(chatId, msgFormatada);
  }
  return false;
}
