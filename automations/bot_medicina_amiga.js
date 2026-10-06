/**
 * ==============================================================================
 * ULTRA ROTINA · MASTER CLOUD ASSISTANT & COPILOTO CLÍNICO MULTIMODAL
 * ==============================================================================
 * Executa 100% na nuvem do Google (24/7), gratuito, sem precisar de PC ligado.
 * ==============================================================================
 */

// --- CONFIGURAÇÕES DO TELEGRAM ---
var TELEGRAM_BOT_TOKEN = "REMOVIDO_CONFIGURAR_SCRIPT_PROPERTIES";
var ALLOWED_CHAT_IDS = ["1771571035", "967290436"];
var TELEGRAM_CHAT_ID = "1771571035";


// --- CONFIGURAÇÃO MULTI-ENGINE DE IA (GROQ 120B + OPENROUTER + Z.AI + GEMINI POOL) ---
// Provedor padrão para raciocínio clínico e texto: "GROQ", "OPENROUTER", "ZAI" ou "GEMINI"
var PROVEDOR_TEXTO_PADRAO = "GROQ";

// 1. GROQ CLOUD (Ultra-rápido ~1.8s com modelo gigante openai/gpt-oss-120b)
var GROQ_API_KEY = "REMOVIDO_CONFIGURAR_SCRIPT_PROPERTIES";

// 2. OPENROUTER (Meta-modelo inteligente openrouter/free com seleção automática)
var OPENROUTER_API_KEY = "REMOVIDO_CONFIGURAR_SCRIPT_PROPERTIES";

// 3. Z.AI (Zhipu AI - Cota ilimitada gratuita com modelo oficial glm-4.5-flash)
var ZAI_API_KEY = "REMOVIDO_CONFIGURAR_SCRIPT_PROPERTIES";

// 4. GOOGLE AI STUDIO (Gemini Pool de 4 chaves para visão multimodal, áudios e segurança final)
var GEMINI_API_KEYS = [
  "REMOVIDO_CONFIGURAR_SCRIPT_PROPERTIES",
  "REMOVIDO_CONFIGURAR_SCRIPT_PROPERTIES",
  "REMOVIDO_CONFIGURAR_SCRIPT_PROPERTIES",
  "REMOVIDO_CONFIGURAR_SCRIPT_PROPERTIES"
];

var TIMEZONE = "America/Sao_Paulo";

// ==============================================================================
// 1. CICLO MESTRE DE ROTINA (EXECUTADO A CADA 5 MINUTOS VIA TRIGGER)
// ==============================================================================

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return HtmlService.createHtmlOutput("OK");
    var update = JSON.parse(e.postData.contents);
    
    var chatId = "";
    if (update.message && update.message.chat) chatId = String(update.message.chat.id);
    else if (update.callback_query && update.callback_query.message) chatId = String(update.callback_query.message.chat.id);
    
    if (chatId && ALLOWED_CHAT_IDS.indexOf(chatId) === -1) return HtmlService.createHtmlOutput("OK");

    var cache = CacheService.getScriptCache();
    var updateId = update.update_id;
    if (updateId && cache.get("upd_" + updateId)) return HtmlService.createHtmlOutput("OK");
    if (updateId) cache.put("upd_" + updateId, "1", 21600);
    
    if (update.callback_query) {
      processarCallbackBotao(update.callback_query);
    } else if (update.message && (update.message.voice || update.message.audio)) {
      processarMensagemVoz(update.message);
    } else if (update.message && update.message.photo) {
      processarMensagemFoto(update.message);
    } else if (update.message && update.message.text) {
      processarMensagemTexto(update.message);
    }
  } catch (err) {
    Logger.log("Erro no doPost: " + err.toString());
  }
  return HtmlService.createHtmlOutput("OK");
}

function processarCallbackBotao(cb) {
  var data = cb.data || "";
  if (data.startsWith("calc_")) {
    var tipoCalc = data.replace("calc_", "");
    var chatId = cb.from.id;
    var contextoCache = CacheService.getScriptCache();
    var contextoKey = "ctx_" + chatId;
    contextoCache.put(contextoKey, "/calc Calculadora selecionada: " + tipoCalc + "\nDados do paciente: ", 900);
    responderCallbackTelegram(cb.id, "Calculadora " + tipoCalc + " selecionada");
    var instrucoes = obterInstrucoesCalculadora(tipoCalc);
    enviarMensagemParaChat(chatId, instrucoes);
  }
}

function processarMensagemTexto(message) {

  var texto = message.text ? message.text.trim() : "";
  var textoLow = texto.toLowerCase();
  var chatId = (message.chat && message.chat.id) ? message.chat.id : TELEGRAM_CHAT_ID;
  if (!texto) return;

  var comando = textoLow.split(/\s/)[0];
  var contextoCache = CacheService.getScriptCache();
  var contextoKey = "ctx_" + chatId;

  // Gerenciamento de Memória (Contexto Clínico)
  if (comando === "/cancelar" || comando === "/novo") {
    contextoCache.remove(contextoKey);
    return enviarMensagemParaChat(chatId, "🧹 *Contexto limpo.* Envie um novo caso clínico.");
  }
  
  if (comando === "/manual") {
    return enviarManual(chatId);
  }

  // Se não for um comando direto (/), verifica se tem contexto salvo para complementar
  if (texto.charAt(0) !== "/") {
    var contextoAnterior = contextoCache.get(contextoKey);
    if (contextoAnterior) {
      texto = contextoAnterior + "\n[Nova Informação do Usuário]: " + texto;
      // Re-analisa qual era o comando original guardado no contexto
      comando = contextoAnterior.split(/\s/)[0].toLowerCase();
    }
  }

  var clinicos = ["/soap", "/rx", "/receita", "/plantao", "/sbar", "/calc", "/round", "/pitch", "/interacao"];
  
  // Se for um comando clínico (novo ou via contexto), salva o texto inteiro no cache por 15 min
  if (clinicos.indexOf(comando) !== -1) {
    if (texto.length > 5000) return enviarMensagemParaChat(chatId, "⚠️ O caso excedeu o tamanho. Use `/novo` e resuma.");
    contextoCache.put(contextoKey, texto, 900); // Salva por 15 min
  } else if (texto.charAt(0) === "/") {
    contextoCache.remove(contextoKey); // Se for comando admin, limpa contexto
  }

  // 1. AJUDA E START
  if (comando === "/start" || comando === "/ajuda" || comando === "/help") {
    var ajudaMsg = "⚡ *COPILOTO CLÍNICO & MASTER ASSISTANT 24/7*\n\n" +
                   "🧠 *Modo Conversa:* O bot lembra do paciente por 15 min! Mande `/soap Caso X` e depois só digite as atualizações! (Use `/novo` para limpar).\n\n" +
                   "🎙️ *ÁUDIO E FOTO:*\n" +
                   "• Mande áudio narrando caso, ou foto de exames/ECG para análise automática.\n\n" +
                   "🩺 *AMBULATÓRIO E ENFERMARIA:*\n" +
                   "• `/soap <caso>`: Sintetizar evolução SOAP\n" +
                   "• `/rx <pedido>`: Receita baseada na REMUME Ribeirão Preto\n" +
                   "• `/plantao <dados>`: Passagem SBAR\n" +
                   "• `/calc <escore>`: CURB65, CKD, Wells, etc.\n" +
                   "• `/interacao <drogas>`: Checa interações.\n" +
                   "• `/round <caso>`: Pitch de 60s para preceptor.";
    return enviarMensagemParaChat(chatId, ajudaMsg);
  }
  
function enviarManual(chatId) {
  var manual = 
    "📖 *MANUAL DE INSTRUÇÕES DA PRECEPTORIA*\n\n" +
    "Bem-vinda ao seu assistente clínico inteligente. Aqui estão os detalhes de uso:\n\n" +
    "🔹 */plantao*\n" +
    "Use para gerar uma evolução médica (SOAP) e sumário de plantão. Exemplo: `/plantao Paciente de 45 anos com dor torácica irradiada...`\n\n" +
    "🔹 */rx*\n" +
    "Gera uma prescrição médica estruturada baseada na RENAME e na REMUME de Ribeirão Preto. Exemplo: `/rx Paciente precisa de tratamento empírico para cistite`.\n\n" +
    "🔹 */calc*\n" +
    "Abre o menu interativo com calculadoras clínicas (CURB-65, CKD-EPI, Wells, etc) ou uso direto. Exemplo: `/calc CURB65 paciente confuso com ureia alta`.\n\n" +
    "🔹 */round*\n" +
    "Gera uma apresentação rápida de 60s estilo 'Pitch' do caso para discussão com preceptor, junto com 3 perguntas de raciocínio.\n\n" +
    "🔹 */interacao*\n" +
    "Checa interações medicamentosas na base local validada e na base internacional da IA. Pode incluir múltiplos fármacos (Ex: `/interacao omeprazol, clopidogrel, AAS`) ou um só para consultar todas as interações perigosas dele.\n\n" +
    "🔹 */novo*\n" +
    "Zera a memória recente do bot. Como o bot 'lembra' do último paciente por 15 minutos (para permitir continuidade de conversa), é *obrigatório* usar este comando ao mudar de paciente para não misturar laudos!\n\n" +
    "🎙️ *Áudio e Imagem (Multimodalidade):*\n" +
    "• Grave um áudio (como no corredor do hospital) narrando o caso que o bot converterá na mesma hora em evolução estruturada!\n" +
    "• Envie fotos de ECGs, Raio-X, tomografias ou lesões de pele para receber um laudo detalhado e condutas. 💡 *Dica de Ouro:* Escrever uma legenda na foto informando a suspeita clínica ou história (Ex: 'Murphy presente' ou 'dor pleurítica') aumenta brutalmente a precisão diagnóstica da IA!";
  
  enviarMensagemParaChat(chatId, manual);
}

  if (comando === "/status" || comando === "/fontes") {
    var motorPadrao = PROVEDOR_TEXTO_PADRAO || "GROQ";
    var stRemume = checarStatusFonteDrive("1xJQDRS13l8JNsVS-oJU6RhzTeEiPHoPNQ6z8J5Wo258", false);
    var stInteracoes = checarStatusFonteDrive("1K4Umpzfx1Qs7s7Ysy3idFBgclTFzXfpyh2Uq9c2YNds", true);
    
    var msgStatus = "⚡ *STATUS DO ASSISTENTE MÉDICO*\n\n" +
      "• *Modo:* Nuvem 24/7 (Google Apps Script Webhook)\n" +
      "• *Memória Clínica:* Ativa (Contexto de 15 min)\n" +
      "• *Motor de Raciocínio Ativo:* *" + motorPadrao + "*\n" +
      "• *Cascata de IA:* Groq (120B) ➔ OpenRouter ➔ Z.ai ➔ Gemini Pool\n\n" +
      "📂 *FONTES DE DADOS DO GOOGLE DRIVE:*\n" +
      "• *REMUME Ribeirão Preto:* " + stRemume + "\n" +
      "• *Base de Interações:* " + stInteracoes + "\n\n" +
      "✅ Assistente 100% operacional.";
    return enviarMensagemParaChat(chatId, msgStatus);
  }

  // 2. COMANDOS CLÍNICOS (Utilizam a variável 'texto' que pode já conter histórico do contexto)
  
  if (comando === "/soap") {
    var casoClinico = texto.replace(/^\/soap\s*/i, "").trim();
    if (!casoClinico) return enviarMensagemParaChat(chatId, "🩺 Envie os dados. Ex: `/soap Mulher 68a epigastralgia...`");
    return processarEEntregarIA(chatId, gerarSOAPComIA, casoClinico, "soap");
  }

  if (comando === "/rx" || comando === "/receita") {
    var dadosPrescricao = texto.replace(/^\/(rx|receita)\s*/i, "").trim();
    if (!dadosPrescricao) return enviarMensagemParaChat(chatId, "💊 Envie o pedido. Ex: `/rx amigdalite 16kg`");
    return processarEEntregarIA(chatId, gerarPrescricaoComIA, dadosPrescricao, "rx");
  }

  if (comando === "/plantao" || comando === "/sbar") {
    var dadosPlantao = texto.replace(/^\/(plantao|sbar)\s*/i, "").trim();
    if (!dadosPlantao) return enviarMensagemParaChat(chatId, "🏥 Envie os dados. Ex: `/plantao Leito 12 PAC grave...`");
    return processarEEntregarIA(chatId, gerarPassagemPlantaoSBAR, dadosPlantao, "plantao");
  }

  if (comando === "/calc") {
    var dadosCalc = texto.replace(/^\/calc\s*/i, "").trim();
    if (!dadosCalc) {
      var tecladoCalc = {
        "inline_keyboard": [
          [
            {"text": "CURB-65", "callback_data": "calc_CURB-65"},
            {"text": "CKD-EPI/Cockcroft", "callback_data": "calc_CKD-EPI"}
          ],
          [
            {"text": "Wells (TEP/TVP)", "callback_data": "calc_Wells"},
            {"text": "qSOFA / SOFA", "callback_data": "calc_SOFA"}
          ],
          [
            {"text": "CHA2DS2-VASc", "callback_data": "calc_CHA2DS2-VASc"},
            {"text": "HAS-BLED", "callback_data": "calc_HAS-BLED"}
          ],
          [
            {"text": "HEART / TIMI", "callback_data": "calc_HEART-TIMI"},
            {"text": "GRACE Score", "callback_data": "calc_GRACE"}
          ],
          [
            {"text": "Child-Pugh / MELD", "callback_data": "calc_MELD"},
            {"text": "Glasgow-P", "callback_data": "calc_Glasgow"}
          ],
          [
            {"text": "NIHSS (AVC)", "callback_data": "calc_NIHSS"},
            {"text": "Ranson / BISAP", "callback_data": "calc_Ranson"}
          ],
          [
            {"text": "Framingham", "callback_data": "calc_Framingham"},
            {"text": "FRAX (Fratura)", "callback_data": "calc_FRAX"}
          ],
          [
            {"text": "APACHE II", "callback_data": "calc_APACHE"},
            {"text": "Déficit Água", "callback_data": "calc_Agua"}
          ],
          [
            {"text": "LDL Martin-Hopkins", "callback_data": "calc_LDL-Martin-Hopkins"}
          ]
        ]
      };
      return enviarMensagemComTecladoParaChat(chatId, "📐 *Escolha a Calculadora Clínica:*\nOu digite os dados diretamente Ex: `/calc CURB65 paciente 70 anos...`", tecladoCalc);
    }
    
    // Se o usuário digitou apenas o nome da calculadora (sem dados clínicos)
    if (ehApenasNomeCalculadora(dadosCalc)) {
      var contextoKey = "ctx_" + chatId;
      CacheService.getScriptCache().put(contextoKey, "/calc Calculadora selecionada: " + dadosCalc + "\nDados do paciente: ", 900);
      var guias = obterInstrucoesCalculadora(dadosCalc);
      return enviarMensagemParaChat(chatId, guias);
    }
    
    return processarEEntregarIA(chatId, processarCalculadoraClinicaComIA, dadosCalc, "calc");
  }

  if (comando === "/round" || comando === "/pitch") {
    var dadosRound = texto.replace(/^\/(round|pitch)\s*/i, "").trim();
    if (!dadosRound) return enviarMensagemParaChat(chatId, "👨⚕️ Envie os dados do paciente.");
    return processarEEntregarIA(chatId, gerarPitchERoundComIA, dadosRound, "round");
  }

  if (comando === "/interacao") {
    var drogas = texto.replace(/^\/interacao\s*/i, "").trim();
    if (!drogas) return enviarMensagemParaChat(chatId, "💊 Informe os medicamentos para cruzar.");
    return processarEEntregarIA(chatId, verificarInteracaoComIA, drogas, "interacao");
  }

  // Feedback fallback
  enviarMensagemParaChat(chatId, "🤖 *Mensagem recebida.* Se isso for continuação de um caso clínico, eu já anexei ao contexto. Digite `/novo` para limpar a memória ou `/ajuda` para comandos.");
}

function processarEEntregarIA(chatId, funcaoGeradora, dados, tipoCache) {
  enviarChatAction(chatId, "typing");
  var resultado = funcaoGeradora(dados);
  if (resultado) {
    var cacheKey = Utilities.getUuid().replace(/-/g, "");
    CacheService.getScriptCache().put(cacheKey, resultado, 21600);
    enviarMensagemParaChat(chatId, resultado);
  } else {
    enviarMensagemParaChat(chatId, "⚠️ Erro ao processar com a IA.");
  }
}

// ==============================================================================
// 4.1 GUIAS ESPECÍFICOS DE CALCULADORAS CLÍNICAS E DIAGNÓSTICO DE FONTES
// ==============================================================================

function ehApenasNomeCalculadora(texto) {
  var s = (texto || "").trim().toLowerCase();
  var nomesConhecidos = [
    "curb", "curb65", "curb-65", "crb65", "crb-65",
    "ckd", "ckd-epi", "ckdepi", "cockcroft", "clearence", "tfg",
    "wells", "tep", "tvp",
    "sofa", "qsofa",
    "cha2ds2", "chads", "chadvasc", "cha2ds2-vasc",
    "hasbled", "has-bled",
    "heart", "timi", "heart-timi",
    "grace",
    "meld", "child", "child-pugh", "childpugh",
    "glasgow", "glasgow-p",
    "nihss", "nih", "avc",
    "ranson", "bisap",
    "framingham",
    "frax",
    "apache", "apache2", "apache ii", "apache-2",
    "agua", "deficit agua", "deficit", "hipernatremia",
    "ldl", "martin", "hopkins", "martin-hopkins"
  ];
  return nomesConhecidos.indexOf(s) !== -1;
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
      "• Idade (anos)\n" +
      "• Frequência Cardíaca (bpm)\n" +
      "• Pressão Arterial Sistólica (mmHg)\n" +
      "• Creatinina sérica (mg/dL)\n" +
      "• Classe Killip (I = sem estertores, II = estertores < 50%, III = EAP, IV = Choque)\n" +
      "• Parada cardiorrespiratória na admissão? (Sim/Não)\n" +
      "• Desvio do segmento ST no ECG? (Sim/Não)\n" +
      "• Marcadores de necrose miocárdica (Troponina) elevados? (Sim/Não)\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`65 anos, FC 88, PA 115/70, Cr 1.2, Killip I, sem PCR, infra de ST 1.5mm em parede inferior, Troponina positiva`";
  }
  
  if (t.indexOf("MELD") !== -1 || t.indexOf("CHILD") !== -1) {
    return "📐 *CALCULADORA: CHILD-PUGH & MELD (Hepatopatia Crônica)*\n\n" +
      "Envie os parâmetros laboratoriais e clínicos:\n" +
      "• *Bilirrubina total:* (mg/dL)\n" +
      "• *Albumina sérica:* (g/dL)\n" +
      "• *RNI:* (Tempo de Protrombina)\n" +
      "• *Ascite:* (Ausente / Leve a moderada / Refratária)\n" +
      "• *Encefalopatia hepática:* (Ausente / Grau 1-2 / Grau 3-4)\n" +
      "• *Creatinina sérica:* (mg/dL - para o MELD)\n" +
      "• *Sódio sérico:* (mEq/L - para MELD-Na)\n" +
      "• Realizou hemodiálise na última semana? (Sim/Não)\n\n" +
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
      "`Abertura ao chamado (3), palavras desconexas (3), localiza dor (5), ambas as pupilas fotorreagentes (0)`";
  }
  
  if (t.indexOf("NIHSS") !== -1) {
    return "📐 *CALCULADORA: NIHSS (Escala de AVC Isquêmico)*\n\n" +
      "Envie os achados neurológicos observados:\n" +
      "• *Consciência:* Alerta, sonolento ou torporoso? Responde mês/idade? Obedece comandos?\n" +
      "• *Olhar conjugado e Campo Visual:* Desvio de olhar? Hemianopsia?\n" +
      "• *Paresia Facial:* Simétrica, leve ou paralisia completa?\n" +
      "• *Força Motora:* MSD, MSE, MID, MIE (queda antes de 10s, sem esforço antigravitário ou sem movimento?)\n" +
      "• *Sensibilidade e Ataxia:* Hemi-hipoestesia? Dismetria dedo-nariz?\n" +
      "• *Linguagem e Fala:* Afasia de expressão/compreensão? Disartria?\n" +
      "• *Extinção/Negligência:* Presente ou ausente?\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`Alerta, desvio de rima à D, paresia braquiocrural D grau 3, disartria moderada, sem hemianopsia ou afasia`";
  }
  
  if (t.indexOf("RANSON") !== -1 || t.indexOf("BISAP") !== -1) {
    return "📐 *CALCULADORA: BISAP & RANSON (Pancreatite Aguda)*\n\n" +
      "Envie as variáveis clínicas das primeiras 24h:\n" +
      "• *Para BISAP:*\n" +
      "  - Ureia > 50 mg/dL (ou BUN > 25 mg/dL)?\n" +
      "  - Idade > 60 anos?\n" +
      "  - SIRS? (FC > 90, FR > 20, Tax > 38 ou < 36, Leucos > 12k ou < 4k)\n" +
      "  - Rebaixamento mental (Glasgow < 15)?\n" +
      "  - Derrame pleural documentado no RX?\n" +
      "• *Para Ranson (Admissão):*\n" +
      "  - Idade, Leucócitos, Glicemia, DHL e AST.\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`64 anos, Pancreatite aguda, lúcido, FC 102, FR 22, Tax 38.2, Ureia 58, RX com derrame pleural à esquerda`";
  }
  
  if (t.indexOf("FRAMINGHAM") !== -1) {
    return "📐 *CALCULADORA: RISCO CARDIOVASCULAR (Framingham / SBC)*\n\n" +
      "Envie os fatores de risco cardiovascular:\n" +
      "• *Idade:* (em anos)\n" +
      "• *Sexo:* (Masculino / Feminino)\n" +
      "• *Colesterol Total:* (mg/dL)\n" +
      "• *HDL-colesterol:* (mg/dL)\n" +
      "• *Pressão Arterial Sistólica:* (mmHg)\n" +
      "• Em uso de anti-hipertensivo? (Sim/Não)\n" +
      "• Tabagista ativo? (Sim/Não)\n" +
      "• Diabético? (Sim/Não)\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`Homem, 54 anos, CT 225 mg/dL, HDL 38 mg/dL, PA 145/90 em uso de Losartana, fumante, não diabético`";
  }
  
  if (t.indexOf("FRAX") !== -1) {
    return "📐 *CALCULADORA: FRAX (Risco de Fratura Osteoporótica)*\n\n" +
      "Envie os dados clínicos do paciente:\n" +
      "• Idade (40–90 anos), Sexo, Peso (kg) e Altura (cm)\n" +
      "• Fratura prévia por fragilidade após os 50 anos? (Sim/Não)\n" +
      "• Pai ou mãe com fratura de quadril? (Sim/Não)\n" +
      "• Tabagismo ativo? (Sim/Não)\n" +
      "• Uso de corticoide (≥ 5mg prednisona por ≥ 3 meses)? (Sim/Não)\n" +
      "• Artrite Reumatoide? (Sim/Não)\n" +
      "• Osteoporose secundária? (Sim/Não)\n" +
      "• Consumo de álcool (≥ 3 doses/dia)? (Sim/Não)\n" +
      "• T-score do colo femoral (DMO) se disponível\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`Mulher, 66 anos, 58 kg, 160 cm, fratura de rádio prévia, mãe com fratura de fêmur, não fuma, T-score colo -2.3`";
  }
  
  if (t.indexOf("APACHE") !== -1) {
    return "📐 *CALCULADORA: APACHE II (Prognóstico e Gravidade UTI)*\n\n" +
      "Envie os piores parâmetros das primeiras 24h:\n" +
      "• Idade e Comorbidades graves prévias (insuficiência crônica de órgão / imunossupressão)\n" +
      "• Admissão cirúrgica de urgência ou clínica?\n" +
      "• Temperatura retal (°C), PAM (mmHg), FC (bpm), FR (irpm)\n" +
      "• Oxigenação (PaO2 ou gradiente A-aDO2) e pH arterial\n" +
      "• Sódio, Potássio, Creatinina (indicar se IRA), Hematócrito, Leucócitos\n" +
      "• Pontuação na Escala de Glasgow (15 menos a pontuação real)\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`72 anos, choque séptico pulmonar, Tax 38.9, PAM 65 com noradrenalina, FC 125, FR 28 em VM, pH 7.28, Cr 2.2, Htc 30%, Leucos 22000, Glasgow 10`";
  }
  
  if (t.indexOf("AGUA") !== -1 || t.indexOf("DEFICIT") !== -1) {
    return "📐 *CALCULADORA: DÉFICIT DE ÁGUA LIVRE (Hipernatremia)*\n\n" +
      "Envie os parâmetros para reposição de água livre:\n" +
      "• *Sódio sérico atual (Na):* (em mEq/L)\n" +
      "• *Sódio sérico alvo desejado:* (ex: 140 ou 145 mEq/L)\n" +
      "• *Peso atual do paciente:* (em kg)\n" +
      "• *Perfil biológico:* (Homem adulto / Homem idoso / Mulher adulta / Mulher idosa / Criança)\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`Homem idoso, 65 kg, Sódio atual 162 mEq/L, alvo 145 mEq/L`";
  }
  
  if (t.indexOf("LDL") !== -1 || t.indexOf("HOPKINS") !== -1) {
    return "📐 *CALCULADORA: LDL MARTIN-HOPKINS*\n\n" +
      "Envie os dados do lipidograma:\n" +
      "• *Colesterol Total (CT):* (em mg/dL)\n" +
      "• *HDL-colesterol:* (em mg/dL)\n" +
      "• *Triglicérides (TG):* (em mg/dL)\n\n" +
      "💡 *Exemplo de envio:*\n" +
      "`CT 230 mg/dL, HDL 42 mg/dL, Triglicérides 240 mg/dL`";
  }
  
  return "📐 *" + tipo + "*\n\n" +
    "Por favor, envie os dados clínicos e laboratoriais do paciente para este cálculo.\n" +
    "💡 *Exemplo:* Idade, sexo, sinais vitais e valores laboratoriais relevantes.";
}

function checarStatusFonteDrive(idPlanilha, isInteracao) {
  try {
    var ss = SpreadsheetApp.openById(idPlanilha);
    var sheets = ss.getSheets();
    if (!sheets || sheets.length === 0) return "❌ Sem abas na planilha";
    var sheet = sheets[0];
    var totalLinhas = sheet.getLastRow();
    if (totalLinhas <= 1) return "⚠️ Conectada, mas sem linhas de dados (apenas cabeçalho)";
    return "Conectada ✅ (" + (totalLinhas - 1) + " registros)";
  } catch (e) {
    return "❌ Erro ao acessar: " + e.message;
  }
}

// ==============================================================================
// 5. ARQUITETURA MULTI-ENGINE DE INTELIGÊNCIA CLÍNICA (4 CAMADAS GRATUITAS)
// ==============================================================================

/**
 * Orquestrador Clínico Mestre:
 * Gerencia a cascata inteligente priorizando provedores ultrarrápidos e gratuitos.
 * Ordem padrão: GROQ (120B) -> OPENROUTER (Auto-Free) -> Z.AI (GLM-4.5-Flash) -> GEMINI POOL
 */
function executarRaciocinioClinico(sistema, promptUsuario, maxTokens) {
  var tokens = maxTokens || 2000;
  var provedor = (PROVEDOR_TEXTO_PADRAO || "GROQ").toUpperCase();
  
  // 1. TENTA O MOTOR SELECIONADO COMO PRINCIPAL
  if (provedor === "GROQ" && GROQ_API_KEY) {
    var rGroq = chamarGroqAPI(sistema, promptUsuario, tokens);
    if (rGroq) return rGroq;
    Logger.log("⚠️ Groq indisponível ou esgotado. Iniciando cascata de contingência...");
  } else if (provedor === "OPENROUTER" && OPENROUTER_API_KEY) {
    var rOR = chamarOpenRouterAPI(sistema, promptUsuario, tokens);
    if (rOR) return rOR;
    Logger.log("⚠️ OpenRouter indisponível. Iniciando cascata de contingência...");
  } else if (provedor === "ZAI" && ZAI_API_KEY) {
    var rZai = chamarZaiAPI(sistema, promptUsuario, tokens);
    if (rZai) return rZai;
    Logger.log("⚠️ Z.ai indisponível. Iniciando cascata de contingência...");
  } else if (provedor === "GEMINI") {
    var rGem = chamarGeminiPool(sistema, promptUsuario, tokens);
    if (rGem) return rGem;
    Logger.log("⚠️ Gemini indisponível. Iniciando cascata de contingência...");
  }
  
  // 2. CASCATA INTELIGENTE DE CONTINGÊNCIA (Fallback sequencial)
  // Passo A: Tenta Groq se não foi o primeiro
  if (provedor !== "GROQ" && GROQ_API_KEY) {
    var resA = chamarGroqAPI(sistema, promptUsuario, tokens);
    if (resA) return resA;
  }
  
  // Passo B: Tenta OpenRouter se não foi o primeiro
  if (provedor !== "OPENROUTER" && OPENROUTER_API_KEY) {
    var resB = chamarOpenRouterAPI(sistema, promptUsuario, tokens);
    if (resB) return resB;
  }
  
  // Passo C: Tenta Z.ai se não foi o primeiro
  if (provedor !== "ZAI" && ZAI_API_KEY) {
    var resC = chamarZaiAPI(sistema, promptUsuario, tokens);
    if (resC) return resC;
  }
  
  // Passo D: REDE DE SEGURANÇA FINAL (Google AI Studio - Gemini Pool com 4 chaves)
  if (provedor !== "GEMINI") {
    Logger.log("🛡️ Todos os provedores externos esgotados. Recorrendo ao Gemini Pool...");
    return chamarGeminiPool(sistema, promptUsuario, tokens);
  }
  
  return null;
}

// --- PROVEDOR 1: GROQ CLOUD (Ultra-rápido ~1.8s com 120 Bilhões de parâmetros) ---
function chamarGroqAPI(sistema, promptUsuario, maxTokens) {
  if (!GROQ_API_KEY) return null;
  var tokens = maxTokens || 2000;
  var url = "https://api.groq.com/openai/v1/chat/completions";
  var modelos = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b"];
  
  for (var i = 0; i < modelos.length; i++) {
    var modelo = modelos[i];
    var payload = {
      "model": modelo,
      "messages": [
        {"role": "system", "content": sistema},
        {"role": "user", "content": promptUsuario}
      ],
      "temperature": 0.2,
      "max_tokens": tokens
    };
    var options = {
      "method": "post",
      "headers": {
        "Authorization": "Bearer " + GROQ_API_KEY,
        "Content-Type": "application/json"
      },
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };
    try {
      var res = UrlFetchApp.fetch(url, options);
      var code = res.getResponseCode();
      if (code === 200) {
        var json = JSON.parse(res.getContentText());
        if (json.choices && json.choices.length > 0 && json.choices[0].message) {
          return json.choices[0].message.content;
        }
      } else {
        Logger.log("Groq (" + modelo + ") erro HTTP " + code);
      }
    } catch (e) {
      Logger.log("Exceção na chamada Groq (" + modelo + "): " + e.message);
    }
  }
  return null;
}

// --- PROVEDOR 2: OPENROUTER (Meta-roteador openrouter/free com auto-seleção de saúde) ---
function chamarOpenRouterAPI(sistema, promptUsuario, maxTokens) {
  if (!OPENROUTER_API_KEY) return null;
  var tokens = maxTokens || 2000;
  var url = "https://openrouter.ai/api/v1/chat/completions";
  var payload = {
    "model": "openrouter/free",
    "messages": [
      {"role": "system", "content": sistema},
      {"role": "user", "content": promptUsuario}
    ],
    "temperature": 0.2,
    "max_tokens": tokens
  };
  var options = {
    "method": "post",
    "headers": {
      "Authorization": "Bearer " + OPENROUTER_API_KEY,
      "HTTP-Referer": "https://t.me/wagmoraes",
      "X-Title": "Telegram Clinical Assistant",
      "Content-Type": "application/json"
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  try {
    var res = UrlFetchApp.fetch(url, options);
    var code = res.getResponseCode();
    if (code === 200) {
      var json = JSON.parse(res.getContentText());
      if (json.choices && json.choices.length > 0 && json.choices[0].message) {
        return json.choices[0].message.content;
      }
    } else {
      Logger.log("OpenRouter erro HTTP " + code);
    }
  } catch (e) {
    Logger.log("Exceção OpenRouter: " + e.message);
  }
  return null;
}

// --- PROVEDOR 3: Z.AI (Zhipu AI - Cota ilimitada gratuita com GLM-4.5-Flash) ---
function chamarZaiAPI(sistema, promptUsuario, maxTokens) {
  if (!ZAI_API_KEY) return null;
  var tokens = maxTokens || 2000;
  var url = "https://api.z.ai/api/paas/v4/chat/completions";
  var modelos = ["glm-4.5-flash", "glm-4.7-flash"];
  
  for (var i = 0; i < modelos.length; i++) {
    var modelo = modelos[i];
    var payload = {
      "model": modelo,
      "messages": [
        {"role": "system", "content": sistema},
        {"role": "user", "content": promptUsuario}
      ],
      "temperature": 0.2,
      "max_tokens": tokens
    };
    var options = {
      "method": "post",
      "headers": {
        "Authorization": "Bearer " + ZAI_API_KEY,
        "Content-Type": "application/json"
      },
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };
    try {
      var res = UrlFetchApp.fetch(url, options);
      var code = res.getResponseCode();
      if (code === 200) {
        var json = JSON.parse(res.getContentText());
        if (json.choices && json.choices.length > 0 && json.choices[0].message) {
          return json.choices[0].message.content;
        }
      } else {
        Logger.log("Z.ai (" + modelo + ") erro HTTP " + code);
      }
    } catch (e) {
      Logger.log("Exceção Z.ai (" + modelo + "): " + e.message);
    }
  }
  return null;
}

// --- PROVEDOR 4: GOOGLE AI STUDIO (Gemini Pool com rotação de 4 chaves) ---
function chamarGeminiPool(sistema, promptUsuario, maxTokens) {
  var tokens = maxTokens || 2000;
  var modelos = ["gemini-flash-latest", "gemini-2.5-pro", "gemini-flash-lite-latest"]; 
  
  for (var m = 0; m < modelos.length; m++) {
    for (var k = 0; k < GEMINI_API_KEYS.length; k++) {
      var url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelos[m] + ":generateContent?key=" + encodeURIComponent(GEMINI_API_KEYS[k].trim());
      var instrucaoLimpa = sistema + "\n\nCRÍTICO: NUNCA use formatação matemática LaTeX (como $...$ ou $$...$$). Escreva números, dosagens e unidades (ex: 200 mg, 90 mmHg) como texto limpo e simples.";
      var payload = {
        "systemInstruction": { "parts": [ { "text": instrucaoLimpa } ] },
        "contents": [{"role": "user", "parts": [{"text": promptUsuario}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": tokens}
      };
      
      try {
        var res = UrlFetchApp.fetch(url, { "method": "post", "contentType": "application/json", "payload": JSON.stringify(payload), "muteHttpExceptions": true });
        if (res.getResponseCode() === 200) return JSON.parse(res.getContentText()).candidates[0].content.parts[0].text;
      } catch (e) { continue; }
    }
  }
  return null;
}

// ==============================================================================
// Prompts Médicos
// ==============================================================================

function gerarSOAPComIA(casoClinico) {
  var promptSistema = 
    "Você é um Preceptor Sênior de Medicina de Família e Comunidade (MFC) e Clínica Médica da FMRP-USP, auxiliando a Carol.\n" +
    "Sua função é auxiliar um interno na elaboração de registros clínicos no formato SOAP ágeis, minuciosos e clinicamente impecáveis para o prontuário eletrônico (e-SUS), fundamentados nas diretrizes atualizadas (MS, SBD, SBC, PCDT).\n\n" +
    "DIRETRIZES DE FORMATO E OBJETIVIDADE:\n" +
    "1. Inicie IMEDIATAMENTE pelo título '🩺 *SÍNTESE SOAP · ATENDIMENTO AMBULATORIAL*'. NUNCA escreva saudações ou prefácios.\n" +
    "2. Adote estilo técnico de prontuário, direto e de alto rendimento.\n" +
    "3. No Plano (P), seja prescritivo e separe as condutas por números.\n\n" +
    "REGRA OBRIGATÓRIA PARA O EXAME FÍSICO (O - Objetivo):\n" +
    "Preencha a semiologia normal/negativa com a redação técnica médica padrão de excelência para os sistemas não descritos como alterados pelo usuário:\n" +
    "1. Sinais Vitais & Ectoscopia (estado geral, LOTE, hidratação, cor, afebril, PA, FC, FR, SpO2).\n" +
    "2. ACV (Ictus, RCR em 2T, BNF, sopros).\n" +
    "3. AR (Expansibilidade, MV, ruídos adventícios).\n" +
    "4. Abdome (Inspeção, RHA, palpação, visceromegalias, sinais peritoneais).\n" +
    "5. Extremidades (Pulsos, edema, perfusão).\n\n" +
    "ESTRUTURA DA RESPOSTA EM MARKDOWN:\n\n" +
    "🩺 *SÍNTESE SOAP · ATENDIMENTO AMBULATORIAL*\n\n" +
    "👤 *S - Subjetivo:*\n" +
    "- *Motivo da Consulta (QP):* [...]\n" +
    "- *HDA:* [Cronológica e detalhada]\n" +
    "- *Histórico:* [Antecedentes, alergias, uso contínuo]\n" +
    "- *Hábitos & Contexto Social:* [...]\n\n" +
    "🔍 *O - Objetivo (Exame Físico & SV):*\n" +
    "- *Geral / SV:* [...]\n" +
    "- *ACV:* [...]\n" +
    "- *AR:* [...]\n" +
    "- *Abdome:* [...]\n" +
    "- *Extremidades:* [...]\n" +
    "- *Exame Direcionado:* [...]\n\n" +
    "🧠 *A - Avaliação (Raciocínio Clínico):*\n" +
    "- *Problema Ativo Principal:* [...] *(CID-10: [X] | CIAP-2: [Y])*\n" +
    "- *Comorbidades / Problemas Passivos:* [...]\n" +
    "- *Diagnósticos Diferenciais:* [...]\n" +
    "- *⚠️ Sinais de Alarme (Red Flags):* [...]\n\n" +
    "📋 *P - Plano & Conduta:*\n" +
    "- *1. Prescrição Farmacológica:* [Nomes genéricos - RENAME, dose, via, duração]\n" +
    "- *2. Exames Complementares:* [...]\n" +
    "- *3. Medidas Não Farmacológicas / Estilo de Vida:* [...]\n" +
    "- *4. Atestados / Encaminhamentos:* [...]\n" +
    "- *5. Seguimento & Retorno:* [Quando voltar e sinais para buscar o PS]\n\n" +
    "💬 *Pitch para o Preceptor:*\n" +
    "- [Síntese verbal Socrática de 2 linhas para o interno apresentar o caso de forma madura.]";
  return executarRaciocinioClinico(promptSistema, "CASO CLÍNICO:\n" + casoClinico, 2500);
}


function obterPlanilha(cachePrefix, idPlanilha, isInteracao) {
  var cache = CacheService.getScriptCache();
  var numChunks = cache.get(cachePrefix + "_chunks");
  var conteudo = "";
  
  if (numChunks) {
    for (var i = 0; i < parseInt(numChunks); i++) {
      var chunk = cache.get(cachePrefix + "_" + i);
      if (chunk) conteudo += chunk;
    }
    if (conteudo.length > 0) return conteudo;
  }
  
  try {
    var sheet = SpreadsheetApp.openById(idPlanilha).getSheets()[0];
    var lastRow = sheet.getLastRow();
    var lastCol = isInteracao ? sheet.getLastColumn() : 1;
    if (lastRow > 1 && lastCol > 0) {
      var valores = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      if (isInteracao) {
        conteudo = valores.map(function(linha) { return linha.join(" | "); }).join("\n");
      } else {
        conteudo = valores.map(function(linha) { return linha[0]; }).join("\n");
      }
      
      var partes = [];
      for (var p = 0; p < conteudo.length; p += 40000) {
        partes.push(conteudo.substring(p, p + 40000));
      }
      try {
        cache.put(cachePrefix + "_chunks", partes.length.toString(), 21600);
        for (var k = 0; k < partes.length; k++) {
          cache.put(cachePrefix + "_" + k, partes[k], 21600);
        }
      } catch (cacheErr) {
        Logger.log("Aviso: Falha ao gravar cache de " + cachePrefix + " (" + cacheErr.message + "). Retornando leitura direta.");
      }
    }
  } catch (e) {
    throw new Error("Erro ao acessar a planilha " + cachePrefix + ". Verifique o ID.");
  }
  return conteudo;
}

function aquecerCachePlanilhas() {
  obterPlanilha("remume", "1xJQDRS13l8JNsVS-oJU6RhzTeEiPHoPNQ6z8J5Wo258", false);
  obterPlanilha("interacoes", "1K4Umpzfx1Qs7s7Ysy3idFBgclTFzXfpyh2Uq9c2YNds", true);
}

function gerarPrescricaoComIA(dadosPrescricao) {
  var listaMedicamentos = "";
  try {
    listaMedicamentos = obterPlanilha("remume", "1xJQDRS13l8JNsVS-oJU6RhzTeEiPHoPNQ6z8J5Wo258", false);
  } catch (erro) {
    return "❌ " + erro.message;
  }

  var promptSistema = 
    "Você é um Médico Especialista em Medicina de Família e Comunidade (MFC) e Pediatria Ambulatorial da FMRP-USP.\n" +
    "Sua função é gerar prescrições médicas ambulatoriais precisas, raciocinando a partir da doença informada ou do medicamento solicitado.\n\n" +
    "⚠️ REGRA DE OURO (REMUME LOCAL): SÓ PRESCREVA MEDICAMENTOS E APRESENTAÇÕES QUE CONSTAM EXATAMENTE NESTA LISTA ABAIXO:\n" +
    "=== LISTA DE MEDICAMENTOS DISPONÍVEIS NO MUNICÍPIO ===\n" +
    listaMedicamentos + "\n" +
    "========================================================\n\n" +
    "DIRETRIZES OBRIGATÓRIAS:\n" +
    "1. Interprete diagnósticos e escolha a melhor opção clínica DE DENTRO DA LISTA ACIMA.\n" +
    "2. Se for Pediatria (criança / peso informado): Apresente SEMPRE a memória de cálculo explícita: (dose recomendada em mg/kg/dia ÷ número de tomadas = mg por dose = conversão exata para mL da apresentação disponível na lista).\n" +
    "3. Indique a quantidade total exata a ser dispensada.\n" +
    "4. Formato pronto para copiar e colar no prontuário eletrônico (e-SUS).\n\n" +
    "ESTRUTURA DA RESPOSTA EM MARKDOWN:\n\n" +
    "💊 *PRESCRIÇÃO AMBULATORIAL · REMUME RIBEIRÃO PRETO*\n\n" +
    "📋 *Indicação Clínica:* [...]\n" +
    "⚖️ *Dados do Paciente / Peso:* [...]\n\n" +
    "📝 *RECEITUÁRIO:*\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "*[USO ORAL / TÓPICO / INALATÓRIO]*\n\n" +
    "1) *Nome Genérico (DCI)* — [Concentração exata que estava na lista da REMUME]\n" +
    "   • *Posologia:* [Ex: Tomar 1 comprimido VO a cada 12h por 14 dias]\n" +
    "   • *Quantidade a dispensar:* [...]\n" +
    "   • *Memória de Cálculo (se pediátrico):* [...]\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
    "💡 *Orientações ao Paciente & Família:*\n" +
    "- [Como tomar, com ou sem alimentos, sinais de alarme, etc.]\n\n" +
    "⚠️ *ATENÇÃO:* As opções foram validadas por IA com base no estoque municipal da REMUME de Ribeirão Preto. O médico prescritor deve conferir a dose e indicação antes da assinatura.";

  return executarRaciocinioClinico(promptSistema, "DADOS DO PACIENTE / PEDIDO:\n" + dadosPrescricao, 1800);
}

function gerarPassagemPlantaoSBAR(dadosCaso) {
  var promptSistema = 
    "Você é um Médico Hospitalista Preceptor de Clínica Médica da FMRP-USP, auxiliando a Carol.\n" +
    "Sua função é organizar casos internados em enfermarias no formato padronizado de segurança do paciente SBAR (Situation, Background, Assessment, Recommendation), pronto para rounds matinais e passagem de plantão com checklist de pendências críticas.\n\n" +
    "DIRETRIZES DE ESTILO:\n" +
    "1. Seja extremamente conciso, telegráfico e direto. O texto será lido durante a correria de um plantão.\n" +
    "2. Se algum dado não foi fornecido pelo usuário, use 'Não informado' em vez de inventar, para garantir a segurança da informação.\n\n" +
    "ESTRUTURA DA RESPOSTA EM MARKDOWN:\n\n" +
    "🏥 *PASSAGEM DE PLANTÃO · MODELO SBAR*\n\n" +
    "📍 *S - Situação (Situation):*\n" +
    "• *Leito & Paciente:* [Leito, Nome/Iniciais, Idade, Sexo]\n" +
    "• *D.I.H:* [Dias de Internação Hospitalar]\n" +
    "• *Diagnóstico Principal:* [...]\n" +
    "• *Status Atual:* [Estável / Em vigilância / Instável / Cuidados paliativos]\n\n" +
    "📜 *B - Histórico (Background):*\n" +
    "• *Resumo da Admissão:* [Motivo da internação e evolução até o momento em 2 linhas]\n" +
    "• *Comorbidades:* [...]\n" +
    "• *Alergias:* [Alergias relatadas ou 'Sem alergias conhecidas']\n" +
    "• *Dispositivos Inv.:* [Acesso venoso (CVC/CVP), SVD, SNE, TOT, etc.]\n\n" +
    "🩺 *A - Avaliação Sistêmica (Assessment):*\n" +
    "• *Neuro:* [LOTE, ECG/Glasgow, delirium, sedação]\n" +
    "• *Cardio & Hemodinâmica:* [PA, FC, ritmo, suporte vasopressor/inotrópico]\n" +
    "• *Resp:* [FR, SpO2, suporte de O2, padrão respiratório]\n" +
    "• *Gastro & Nutrição:* [Dieta, aceitação, RHA, evacuação]\n" +
    "• *Renal & Balanço Hídrico:* [Diurese, BH acumulado das 24h, função renal]\n" +
    "• *Infeccioso & D.A.T:* [Foco infeccioso, esquema atual de ATB e Dia de Tratamento (Ex: Ceftriaxone D3/D7), febre]\n" +
    "• *Profilaxias:* [TVP e Úlcera de Estresse - prescritas?]\n" +
    "• *Laboratório / Imagem:* [Últimos exames alterados relevantes]\n\n" +
    "🚨 *R - Recomendações & Pendências (Recommendation):*\n" +
    "• *📋 Pendências do Plantão:* [Exames para checar, culturas pendentes, pareceres a cobrar]\n" +
    "• *⚡ Gatilhos (Se intercorrência):* ['Se febre, fazer X', 'Se dor torácica, fazer Y', 'Se PA cair...']\n" +
    "• *🎯 Planejamento da Equipe:* [Desmame O2, progressão de dieta, programação cirúrgica, alta]";
  return executarRaciocinioClinico(promptSistema, "DADOS DO CASO:\n" + dadosCaso, 2200);
}


function processarCalculadoraClinicaComIA(dadosCalc) {
  var promptSistema = 
    "Você é um Preceptor de Clínica Médica e Terapia Intensiva da FMRP-USP, orientando a Carol.\n" +
    "Sua função é processar e calcular com exatidão matemática escores clínicos de alta relevância no internato médico.\n\n" +
    "ESCORES SUPORTADOS:\n" +
    "- CURB-65 / CRB-65 (Pneumonia Comunitária)\n" +
    "- Cockcroft-Gault & CKD-EPI (Clearance de Creatinina e TFG com ajuste de dose de antimicrobianos)\n" +
    "- CHA2DS2-VASc & HAS-BLED (Anticoagulação na Fibrilação Atrial)\n" +
    "- Wells para TEP e TVP (Probabilidade pré-teste e solicitação de D-dímero vs AngioTC)\n" +
    "- qSOFA e SOFA (Sepse)\n" +
    "- HEART Score e TIMI Score (SCA / Dor Torácica)\n" +
    "- GRACE Score (SCA)\n" +
    "- Glasgow-P (Escala de Coma de Glasgow)\n" +
    "- Child-Pugh e MELD (Hepatopatia crônica)\n" +
    "- NIHSS (AVC Isquêmico)\n" +
    "- Ranson e BISAP (Pancreatite Aguda)\n" +
    "- Framingham (Risco Cardiovascular)\n" +
    "- FRAX (Risco de Fratura)\n" +
    "- APACHE II (Prognóstico UTI)\n" +
    "- Déficit de Água Livre (Hipernatremia)\n" +
    "- LDL Martin-Hopkins (Cálculo preciso de LDL baseado em CT, HDL e TG)\n\n" +
    "DIRETRIZES OBRIGATÓRIAS:\n" +
    "1. SEJA EXTREMAMENTE CONCISO. Evite digressões teóricas ou explicações genéricas longas. Seja direto.\n" +
    "2. NUNCA USE formatação LaTeX (como $, \\frac, etc). O sistema não renderiza isso. Se precisar mostrar cálculo, use matemática simples em texto ex: (165 - 35) / 5.\n" +
    "3. Use APENAS hifens (-) para tópicos, não use asteriscos para bullet points.\n" +
    "Apresente: Nome do Escore, Pontuação Total, Critérios Pontuados, Classificação de Risco e Conduta Médica (bullet points diretos).\n\n" +
    "ESTRUTURA DA RESPOSTA EM MARKDOWN:\n" +
    "📐 *CALCULADORA CLÍNICA & ESTRATIFICAÇÃO DE RISCO*\n\n" +
    "🎯 *Escore Aplicado:* [...]\n" +
    "🔢 *Pontuação Obtida:* [...]\n" +
    "📋 *Critérios Pontuados:* [...]\n" +
    "⚠️ *Classificação de Risco:* [...]\n" +
    "💡 *Conduta Médica Recomendada:* [...]";
  return executarRaciocinioClinico(promptSistema, "DADOS CÁLCULO:\n" + dadosCalc, 1800);
}

function gerarPitchERoundComIA(dadosCaso) {
  var promptSistema = 
    "Você é o Preceptor Mais Exigente e Brilhante de Clínica Médica da FMRP-USP. A médica residente que você orienta se chama Carol.\n" +
    "Sua missão é treinar um interno de medicina para a passagem de visita (round) e discussão de caso à beira do leito de alto nível.\n\n" +
    "ESTRUTURA DA RESPOSTA EM MARKDOWN:\n\n" +
    "👨⚕️ *PREPARAÇÃO PARA O ROUND · PITCH & PRECEPTOR SOCRÁTICO*\n\n" +
    "🎤 *1. Pitch Clínico Brilhante (Fale assim no leito):*\n" +
    "\"[Redija um monólogo maduro, fluido e técnico que o interno deve recitar diretamente para a equipe (ex: 'Paciente de 60 anos, no D3 de internação por... Nas últimas 24h... Ao exame destaco... Meu plano hoje é...'). Máximo de 5 a 7 linhas, sem gaguejar, indo direto ao ponto.]\"\n\n" +
    "🔍 *2. O Ponto Cego do Caso (Blind Spot):*\n" +
    "- *O que você pode estar esquecendo:* [Aponte 1 detalhe laboratorial, de exame físico ou interação medicamentosa que internos costumam esquecer de olhar neste cenário específico.]\n\n" +
    "🎯 *3. Sabatina do Preceptor (O 'Pega-Rato'):*\n" +
    "1) ❓ *[Pergunta 1: Fisiopatologia ou Semiologia fina do caso]*\n" +
    "   • 💡 *Gabarito:* [Resposta padrão-ouro baseada em literatura]\n\n" +
    "2) ❓ *[Pergunta 2: Farmacologia, Escolha de Dose ou Efeito Adverso]*\n" +
    "   • 💡 *Gabarito:* [Resposta padrão-ouro]\n\n" +
    "3) ❓ *[Pergunta 3: Critério de Alta ou Manejo de Intercorrência]*\n" +
    "   • 💡 *Gabarito:* [Resposta padrão-ouro]\n\n" +
    "🚫 *O que NUNCA dizer (Mico no Round):*\n" +
    "- *Gafe comum:* [Exemplo de conduta ou frase absurda que um interno desavisado falaria neste caso e levaria bronca do chefe.]";
  return executarRaciocinioClinico(promptSistema, "DADOS DO CASO:\n" + dadosCaso, 2500);
}

function verificarInteracaoComIA(drogas) {
  var baseInteracoes = "";
  var erroPlanilha = null;
  try {
    baseInteracoes = obterPlanilha("interacoes", "1K4Umpzfx1Qs7s7Ysy3idFBgclTFzXfpyh2Uq9c2YNds", true);
  } catch (erro) {
    erroPlanilha = erro.message;
  }

  // Análise de termos para checagem de presença na base local
  var termos = drogas.toLowerCase().split(/[\s,\+\/e;]+/i).filter(function(t) { return t.length >= 3; });
  var registrosEncontrados = [];
  
  if (baseInteracoes) {
    var linhas = baseInteracoes.split("\n");
    for (var i = 0; i < linhas.length; i++) {
      var linhaLower = linhas[i].toLowerCase();
      var matchCount = 0;
      for (var j = 0; j < termos.length; j++) {
        if (linhaLower.indexOf(termos[j]) !== -1) matchCount++;
      }
      if (matchCount > 0) {
        registrosEncontrados.push(linhas[i]);
      }
    }
  }

  var instrucaoBase = "";
  if (erroPlanilha) {
    instrucaoBase = "⚠️ AVISO TÉCNICO: A planilha de interações do Google Drive retornou erro de acesso (" + erroPlanilha + "). Avalie o caso inteiramente pelo seu conhecimento clínico e defina expressamente no campo Fonte: 'Conhecimento Geral (Planilha local inacessível)'.";
  } else if (!baseInteracoes || baseInteracoes.trim().length === 0) {
    instrucaoBase = "⚠️ AVISO TÉCNICO: A planilha de interações do Google Drive está vazia ou sem linhas preenchidas. Avalie pelo seu conhecimento clínico e defina no campo Fonte: 'Conhecimento Geral (Planilha local sem registros)'.";
  } else if (registrosEncontrados.length > 0) {
    instrucaoBase = "=== REGISTROS LOCALIZADOS NA BASE DE INTERAÇÕES LOCAL (PLANILHA GOOGLE DRIVE) ===\n" +
      registrosEncontrados.slice(0, 40).join("\n") + "\n" +
      "=================================================================================\n\n" +
      "REGRA OBRIGATÓRIA: Os medicamentos solicitados FORAM LOCALIZADOS na base local da planilha acima!\n" +
      "Você DEVE OBRIGATORIAMENTE indicar:\n" +
      "🛡️ *Fonte:* Base Local (Planilha Google Drive)\n" +
      "Use as informações de risco e mecanismo descritas na base local como referência primária.";
  } else {
    instrucaoBase = "=== BASE DE INTERAÇÕES LOCAL (PLANILHA GOOGLE DRIVE) ===\n" +
      "[Nenhum registro específico para os termos '" + drogas + "' foi localizado nas linhas da planilha local]\n" +
      "========================================================\n\n" +
      "REGRA OBRIGATÓRIA: Como os medicamentos solicitados NÃO constam na planilha local do Google Drive, realize a avaliação fundamentada em seu conhecimento clínico e indique expressamente no campo Fonte:\n" +
      "🛡️ *Fonte:* Conhecimento Geral (Medicamento não cadastrado na Base Local)";
  }

  var promptSistema = 
    "Você é um Farmacologista Clínico e Médico Preceptor da FMRP-USP, orientando a médica Carol.\n" +
    "Sua função é avaliar interações medicamentosas com alto rigor científico.\n\n" +
    instrucaoBase + "\n\n" +
    "LÓGICA DE ATENDIMENTO:\n" +
    "- Se o usuário informar MAIS DE UM medicamento (ex: 'A e B'): Avalie a interação APENAS entre eles.\n" +
    "- Se o usuário informar APENAS UM medicamento (ex: 'A'): Liste as PRINCIPAIS interações que este medicamento possui, focando nas graves/contraindicadas.\n\n" +
    "ESTRUTURA DA RESPOSTA (Para 2 ou mais drogas):\n" +
    "🔬 *ANÁLISE DE INTERAÇÃO MEDICAMENTOSA*\n\n" +
    "⚠️ *Grau de Risco:* [Nenhum / Menor / Moderado / Grave / Contraindicado]\n" +
    "⚙️ *Mecanismo:* [...]\n" +
    "💡 *Conduta Clínica:* [...]\n" +
    "🛡️ *Fonte:* [Base Local (Planilha Google Drive) OU Conhecimento Geral (Medicamento não cadastrado na Base Local)]\n\n" +
    "ESTRUTURA DA RESPOSTA (Para apenas 1 droga solicitada):\n" +
    "🔬 *PRINCIPAIS INTERAÇÕES: [NOME DA DROGA]*\n\n" +
    "⛔ *Contraindicadas / Graves:*\n- [Droga X]: [Mecanismo resumido]\n" +
    "⚠️ *Moderadas (Exigem atenção):*\n- [Droga Y]: [Mecanismo resumido]\n" +
    "🛡️ *Fonte:* [Base Local (Planilha Google Drive) OU Conhecimento Geral (Medicamento não cadastrado na Base Local)]";

  return executarRaciocinioClinico(promptSistema, "DADOS DAS DROGAS INFORMADAS:\n" + drogas, 1500);
}

// ==============================================================================
// PROCESSAMENTO MULTIMODAL (VOZ E IMAGENS) OTIMIZADO
// ==============================================================================

function processarMensagemVoz(message) {
  var chatId = (message.chat && message.chat.id) ? message.chat.id : TELEGRAM_CHAT_ID;
  enviarChatAction(chatId, "record_voice"); 
  try {
    var midia = baixarMidiaTelegram(message.voice || message.audio);
    var promptSistema = "Você é um Preceptor Sênior da FMRP-USP orientando a Carol. Recebi este áudio clínico. EXTRAIA os dados clínicos e GERE UM DOCUMENTO ESTRUTURADO em formato SOAP, Receita ou Passagem de Plantão. NÃO faça apenas uma transcrição literal do áudio. Estruture as informações clinicamente com jargão médico adequado.";
    var caption = message.caption ? "Contexto adicional do usuário: " + message.caption : "";
    var resultadoAudio = chamarGeminiPoolMultimodal(midia.data, midia.mime, promptSistema, caption);
    if (resultadoAudio) {
      var cacheKey = Utilities.getUuid().replace(/-/g, "");
      CacheService.getScriptCache().put(cacheKey, resultadoAudio, 21600);
      CacheService.getScriptCache().put("ctx_" + chatId, resultadoAudio, 900); // Salva no contexto
      enviarMensagemParaChat(chatId, resultadoAudio);
    } else { enviarMensagemParaChat(chatId, "⚠️ Falha ao transcrever com IA."); }
  } catch (err) { enviarMensagemParaChat(chatId, "⚠️ Erro ao processar áudio."); }
}

function processarMensagemFoto(message) {
  var chatId = (message.chat && message.chat.id) ? message.chat.id : TELEGRAM_CHAT_ID;
  enviarChatAction(chatId, "upload_photo");
  enviarMensagemParaChat(chatId, "📸 *Analisando imagem médica...*");
  try {
    var photos = message.photo;
    var midia = baixarMidiaTelegram(photos[photos.length - 1]);
    var promptSistema = "Você é um Preceptor de Clínica Médica, Cardiologia e Radiologia da FMRP-USP, auxiliando a Carol. Analise detalhadamente a imagem clínica fornecida (ECG, Raio-X, Exames Laboratoriais, Lesão de pele). Forneça um laudo estruturado: 1. Descrição dos achados, 2. Hipóteses Diagnósticas, 3. Condutas sugeridas baseadas em diretrizes.";
    var caption = message.caption ? "Contexto do usuário: " + message.caption : "";
    var resultadoImagem = chamarGeminiPoolMultimodal(midia.data, midia.mime, promptSistema, caption);
    if (resultadoImagem) {
      var cacheKey = Utilities.getUuid().replace(/-/g, "");
      CacheService.getScriptCache().put(cacheKey, resultadoImagem, 21600);
      CacheService.getScriptCache().put("ctx_" + chatId, resultadoImagem, 900); // Salva no contexto
      enviarMensagemParaChat(chatId, resultadoImagem);
    } else { enviarMensagemParaChat(chatId, "⚠️ Erro ao analisar imagem."); }
  } catch (err) { enviarMensagemParaChat(chatId, "⚠️ Erro na imagem."); }
}

function baixarMidiaTelegram(arquivoBase) {
  var res = UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/getFile?file_id=" + arquivoBase.file_id, {"muteHttpExceptions": true});
  var json = JSON.parse(res.getContentText());
  var caminhoArquivo = json.result.file_path;
  var blob = UrlFetchApp.fetch("https://api.telegram.org/file/bot" + TELEGRAM_BOT_TOKEN + "/" + caminhoArquivo).getBlob();
  
  var mime = blob.getContentType();
  
  // Se o Telegram não mandar o formato, nós forçamos pela extensão do arquivo!
  if (!mime || mime === "application/octet-stream") {
    var ext = caminhoArquivo.split('.').pop().toLowerCase();
    if (ext === "oga" || ext === "ogg") mime = "audio/ogg";
    else if (ext === "mp3") mime = "audio/mp3";
    else if (ext === "jpg" || ext === "jpeg") mime = "image/jpeg";
    else if (ext === "png") mime = "image/png";
    else mime = "image/jpeg"; // Fallback mais seguro
  }
  
  return { 
    data: Utilities.base64Encode(blob.getBytes()), 
    mime: mime 
  };
}

function chamarGeminiPoolMultimodal(base64Data, mimeType, sistema, promptUsuario) {
  var modelos = ["gemini-flash-latest", "gemini-2.5-pro", "gemini-flash-lite-latest"]; 
  for (var m = 0; m < modelos.length; m++) {
    for (var k = 0; k < GEMINI_API_KEYS.length; k++) {
      var url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelos[m] + ":generateContent?key=" + encodeURIComponent(GEMINI_API_KEYS[k].trim());
      var instrucaoLimpa = sistema + "\n\nCRÍTICO: NUNCA use formatação matemática LaTeX (como $...$ ou $$...$$). Escreva números, dosagens e unidades (ex: 200 mg, 90 mmHg) como texto limpo e simples.";
      var msgUsuario = promptUsuario ? promptUsuario : "Por favor, analise a mídia anexada em detalhes.";
      var payload = {
        "systemInstruction": { "parts": [ { "text": instrucaoLimpa } ] },
        "contents": [{ "role": "user", "parts": [ { "inlineData": { "mimeType": mimeType, "data": base64Data } }, { "text": msgUsuario } ] }],
        "generationConfig": { "temperature": 0.2, "maxOutputTokens": 2500 }
      };
      try {
        var res = UrlFetchApp.fetch(url, { "method": "post", "contentType": "application/json", "payload": JSON.stringify(payload), "muteHttpExceptions": true });
        if (res.getResponseCode() === 200) return JSON.parse(res.getContentText()).candidates[0].content.parts[0].text;
      } catch (e) { continue; }
    }
  }
  return null;
}

// ==============================================================================
// 7. UTILITÁRIOS

function fragmentarTexto(texto, limite) {
  var limit = limite || 3800;
  if (!texto || texto.length <= limit) return [texto];
  var partes = [], restante = texto;
  while (restante.length > limit) {
    var corte = restante.lastIndexOf("\n\n", limit);
    if (corte === -1 || corte < limit * 0.4) corte = restante.lastIndexOf("\n", limit);
    if (corte === -1 || corte < limit * 0.4) corte = restante.lastIndexOf(" ", limit);
    if (corte === -1) corte = limit;
    var pedaco = restante.substring(0, corte).trim();
    if (pedaco) partes.push(pedaco);
    restante = restante.substring(corte).trim();
  }
  if (restante) partes.push(restante);
  return partes;
}



// ==============================================================================

function enviarChatAction(chatId, acao) {
  executarPostTelegram("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendChatAction", { "chat_id": chatId, "action": acao });
}

function enviarMensagemParaChat(chatId, texto) {
  return enviarMensagemSegmentada(chatId, texto, null);
}

function enviarMensagemComTecladoParaChat(chatId, texto, teclado) {
  return enviarMensagemSegmentada(chatId, texto, teclado);
}

function limparMarkdownTelegram(texto) {
  var limpo = texto.replace(/\*\*/g, "*").replace(/\\\*/g, "*");
  var countAsterisk = (limpo.match(/\*/g) || []).length;
  if (countAsterisk % 2 !== 0) {
    var lastIdx = limpo.lastIndexOf("*");
    if (lastIdx !== -1) limpo = limpo.substring(0, lastIdx) + limpo.substring(lastIdx + 1);
  }
  var countUnderscore = (limpo.match(/_/g) || []).length;
  if (countUnderscore % 2 !== 0) {
    var lastIdxU = limpo.lastIndexOf("_");
    if (lastIdxU !== -1) limpo = limpo.substring(0, lastIdxU) + limpo.substring(lastIdxU + 1);
  }
  return limpo;
}

function enviarMensagemSegmentada(chatId, texto, teclado) {
  if (!texto) return false;
  var partes = fragmentarTexto(texto, 3800);
  var sucessoGeral = true;
  for (var i = 0; i < partes.length; i++) {
    var ehUltima = (i === partes.length - 1);
    var textoLimpo = limparMarkdownTelegram(partes[i]);
    var payload = { "chat_id": chatId, "text": textoLimpo, "parse_mode": "Markdown" };
    if (ehUltima && teclado) payload.reply_markup = teclado;
    
    if (!executarPostTelegram("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage", payload)) sucessoGeral = false;
    if (partes.length > 1 && !ehUltima) Utilities.sleep(600);
  }
  return sucessoGeral;
}

function responderCallbackTelegram(callbackId, textoToast) {
  executarPostTelegram("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/answerCallbackQuery", { "callback_query_id": callbackId, "text": textoToast, "show_alert": false });
}

function executarPostTelegram(url, payload) {
  var options = { "method": "post", "contentType": "application/json", "payload": JSON.stringify(payload), "muteHttpExceptions": true };
  try {
    var res = UrlFetchApp.fetch(url, options);
    if (res.getResponseCode() === 200) return true;
    
    if (payload.parse_mode) {
      delete payload.parse_mode;
      options.payload = JSON.stringify(payload);
      return UrlFetchApp.fetch(url, options).getResponseCode() === 200;
    }
    return false;
  } catch (e) { return false; }
}

function obterDiaSemanaExtenso(data) {
  return ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"][data.getDay()];
}

// ==============================================================================
// 8. E 9. INSTALAÇÃO 
// ==============================================================================

function configurarWebhookTelegram() {
  var WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyv6R-YLbucH7CDxrUuH1gWG7qLpR8nAIYf5pwAAu6mVB10wArVvan_VcpXU_j3PGg_/exec";
  var url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/setWebhook?url=" + encodeURIComponent(WEB_APP_URL);
  var res = UrlFetchApp.fetch(url, {"muteHttpExceptions": true});
  Logger.log("Webhook atualizado: " + res.getContentText());
}

function configurarMenuTelegram() {
  var url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/setMyCommands";
  var comandos = [
    {"command": "novo", "description": "Limpar memória e iniciar novo caso"},
    {"command": "rx", "description": "Receita REMUME Ribeirão Preto"},
    {"command": "interacao", "description": "Checa interações medicamentosas"},
    {"command": "calc", "description": "Calculadoras Clínicas"},
    {"command": "soap", "description": "Sintetizar evolução SOAP"},
    {"command": "plantao", "description": "Passagem de plantão SBAR"},
    {"command": "round", "description": "Pitch de 60s para preceptor"},
    {"command": "manual", "description": "Manual completo de instruções"},
    {"command": "ajuda", "description": "Mostrar menu de ajuda"}
  ];
  
  var payload = { "commands": comandos };
  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  UrlFetchApp.fetch(url, options);
}

function instalarAcionadorCache() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "aquecerCachePlanilhas") ScriptApp.deleteTrigger(triggers[i]);
  }
  ScriptApp.newTrigger("aquecerCachePlanilhas").timeBased().everyHours(5).create();
  Logger.log("Acionador de cache instalado!");
}
