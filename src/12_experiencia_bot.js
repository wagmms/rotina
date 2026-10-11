/**
 * ==============================================================================
 * src/12_experiencia_bot.js · v2.0
 * ==============================================================================
 * Modos explícitos, menus compactos, botões ergonômicos e exportação para prontuário.
 * Compatível com Google Apps Script V8.
 *
 * Dependências externas (assinaturas conforme a v1):
 *   executarPostTelegram(url, payload), enviarMensagemComTecladoParaChat(chat, texto, kb),
 *   enviarMensagemParaChat(chat, texto), enviarMensagemComTecladoFixo(chat, texto),
 *   responderCallbackTelegram(id, texto), processarMensagemTexto({chat:{id}, text}),
 *   safePutCache(cache, chave, valor, ttl), limparMarkdownTelegram(texto),
 *   sanitizarEValidarPesoKg(valor), ConfigService, EnfermariaService,
 *   PersistenciaBot, ReceitaPdfService, mostrarFilaTelegram(chat).
 * ==============================================================================
 */

var UX_TTL_SEG = 900;
var UX_MAX_CALLBACK_BYTES = 64;
var UX_MAX_COPY_TEXT = 256;
var UX_MAX_EDIT_CHARS = 3800;
var UX_MAX_CASO_CHARS = 6000;
var UX_CB_PASSAGEM_SBAR = 'enfermaria_passagem'; // Callback original da Passagem SBAR

var UX_NOMES_MODO = {
  soap: 'SOAP (Caso Clínico)',
  rx: 'Prescrição & Posologias (REMUME & Guia HSL)',
  gaso: 'Gasometria Arterial',
  voz: 'Preceptor Socrático',
  calc: 'Calculadoras Clínicas',
  dva: 'Drogas Vasoativas',
  leito: 'Evolução do Leito'
};
var UX_MODOS_TEXTO = ['soap', 'rx', 'gaso', 'voz', 'calc', 'plantao', 'round', 'interacao', 'conduta'];
var UX_DROGAS = { nora: 'Noradrenalina', dobuta: 'Dobutamina', nipride: 'Nitroprussiato', adrena: 'Adrenalina' };
var UX_DROGAS_FIXAS = { vaso: 'Vasopressina', tridil: 'Nitroglicerina' };
var UX_DILUICOES = { padrao: 'Padrão', concentrada: 'Concentrada' };
var UX_PESOS_RAPIDOS = [60, 70, 80, 90];
var UX_STATUS_LEITO = ['estavel', 'vigilancia', 'instavel'];
var UX_CONDUTAS = {
  pcr: 'PCR Parada Cardiorrespiratória em ritmo chocável e não chocável',
  eap: 'EAP hipertensivo PA 220x120',
  anafilaxia: 'Anafilaxia em adulto com estridor e hipotensão',
  convulsao: 'Crise convulsiva em curso há mais de 5 minutos',
  hipercalemia: 'Hipercalemia com alterações eletrocardiográficas onda T apiculada',
  cad: 'Cetoacidose diabética glicemia 450 acidose metabólica'
};

/* ========== Utilitários ========== */

function uxCache() { return CacheService.getScriptCache(); }

function uxBytesUtf8(s) {
  s = String(s);
  var n = 0;
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xD800 && c <= 0xDBFF) { n += 4; i++; }
    else n += 3;
  }
  return n;
}

function uxLimparMd(s) { return String(s || '').replace(/[*_`\[\]]/g, ' ').replace(/\s+/g, ' ').trim(); }

function uxTextoDeResposta(r) {
  try {
    if (r === null || r === undefined) return '';
    if (typeof r === 'string') return r;
    if (typeof r.getContentText === 'function') return r.getContentText();
    return JSON.stringify(r);
  } catch (e) { return ''; }
}

function uxDividirTexto(texto, max) {
  var partes = [], resto = String(texto || "");
  while (resto.length > max) {
    var corte = resto.lastIndexOf('\n', max);
    if (corte <= 0 || corte < max / 3) {
      corte = resto.lastIndexOf(' ', max);
    }
    if (corte <= 0) corte = max;
    if (corte > 0 && /[\uD800-\uDBFF]/.test(resto.charAt(corte - 1))) {
      corte--;
    }
    partes.push(resto.slice(0, corte));
    resto = resto.slice(corte).replace(/^[\n ]+/, '');
  }
  if (resto.length) partes.push(resto);
  return partes;
}

/* ========== Teclados e telas ========== */

/**
 * Aceita [texto, callback] ou objeto nativo do Telegram (ex.: {text, copy_text:{text}}).
 * Nunca emite callback_data > 64 bytes: substitui por 'ux:invalido' (falha segura, sem ação indevida).
 */
function botoesBot(rows) {
  return {
    inline_keyboard: rows.map(function (row) {
      return row.map(function (b) {
        if (!Array.isArray(b)) {
          if (b && typeof b === 'object' && b.callback_data) {
            var cbObj = String(b.callback_data);
            if (uxBytesUtf8(cbObj) > UX_MAX_CALLBACK_BYTES) {
              console.error('callback_data > 64 bytes em objeto: ' + cbObj);
              var bClone = {};
              for (var k in b) { bClone[k] = b[k]; }
              bClone.callback_data = 'ux:invalido';
              return bClone;
            }
          }
          return b;
        }
        var cb = String(b[1]);
        if (uxBytesUtf8(cb) > UX_MAX_CALLBACK_BYTES) {
          console.error('callback_data > 64 bytes: ' + cb);
          cb = 'ux:invalido';
        }
        return { text: b[0], callback_data: cb };
      });
    })
  };
}

/** Edita a tela in-place; trata "message is not modified" e mensagens não editáveis com fallback. */
function enviarTelaBot(chat, texto, kb, messageId) {
  if (messageId && String(texto).length < UX_MAX_EDIT_CHARS) {
    var contemHtml = /<\/?(?:b|i|u|s|code|pre|a)\b/i.test(texto);
    var parseMode = contemHtml ? 'HTML' : 'Markdown';
    var textoEnvio = contemHtml
      ? (typeof sanitizarHtmlTelegram === 'function' ? sanitizarHtmlTelegram(texto) : texto)
      : limparMarkdownTelegram(texto);
    var url = 'https://api.telegram.org/bot' + ConfigService.get('TELEGRAM_BOT_TOKEN') + '/editMessageText';
    var payload = {
      chat_id: chat,
      message_id: messageId,
      text: textoEnvio,
      parse_mode: parseMode,
      reply_markup: kb
    };
    var okEdit = false;
    try {
      okEdit = executarPostTelegram(url, payload);
    } catch (e) {
      okEdit = false;
    }
    if (okEdit) return okEdit;
    return enviarMensagemComTecladoParaChat(chat, texto, kb);
  }
  return enviarMensagemComTecladoParaChat(chat, texto, kb);
}

/* ========== Atendimento persistente; cache somente para compatibilidade ========== */

function modoBot(chat) {
  // A fonte persistente é autoritativa, inclusive após falha de atualização do cache.
  var salvo = PersistenciaBot.ler('atendimento_' + chat);
  if (salvo) return salvo.closed ? null : salvo;
  var raw = uxCache().get('modo_' + chat);
  if (!raw) return null;
  var legado;
  try { legado = JSON.parse(raw); } catch (e) { return null; }
  if (legado.expires && legado.expires < Date.now()) {
    uxCache().remove('modo_' + chat);
    uxCache().remove('ctx_' + chat);
    return null;
  }
  // Migra apenas estado legado ainda válido, sem ressuscitar cache expirado.
  return salvarModoBot(chat, legado);
}

function salvarModoBot(chat, state) {
  var registro = {
    version: 3, caseId: state.caseId || Utilities.getUuid().replace(/-/g, ''),
    revision: Utilities.getUuid().replace(/-/g, ''),
    mode: state.mode || '', data: state.data || '', updatedAt: Date.now()
  };
  PersistenciaBot.salvar('atendimento_' + chat, registro);
  safePutCache(uxCache(), 'modo_' + chat, JSON.stringify(registro), UX_TTL_SEG);
  return registro;
}

function obterContextoClinicoBot(chat) {
  var estado = modoBot(chat);
  if (estado) return estado.data || '';
  // Um encerramento persistido prevalece sobre qualquer cache antigo.
  if (PersistenciaBot.ler('atendimento_' + chat)) return '';
  return uxCache().get('ctx_' + chat) || '';
}

function definirModoBot(chat, mode, dados, novo) {
  var anterior = modoBot(chat), conteudo = dados || '';
  var estado = !novo && anterior && anterior.mode === mode && anterior.data === conteudo
    ? anterior : salvarModoBot(chat, { caseId: !novo && anterior ? anterior.caseId : null, mode: mode, data: conteudo });
  // Só limpa os auxiliares depois que os dados foram gravados com sucesso.
  var c = uxCache();
  ['ctx_' + chat, 'pending_' + chat, 'dvaw_' + chat, 'leito_' + chat, 'efconfirm_' + chat].forEach(function (k) {
    c.remove(k);
  });
  return estado;
}

function limparEstadoBot(chat) {
  // Tombstone impede recuperar dados obsoletos se a remoção do cache falhar.
  PersistenciaBot.salvar('atendimento_' + chat, {version: 3, closed: true, updatedAt: Date.now()});
  var c = uxCache();
  ['modo_' + chat, 'ctx_' + chat, 'pending_' + chat, 'dvaw_' + chat, 'leito_' + chat, 'efconfirm_' + chat, 'preceptor_' + chat].forEach(function (k) {
    c.remove(k);
  });
  if (typeof limparDialogoPreceptor === 'function') {
    try { limparDialogoPreceptor(chat); } catch (eP) {}
  }
}

/* Estados auxiliares que NÃO sobrescrevem o caso clínico em andamento */
function aguardarPesoDva(chat, droga) { safePutCache(uxCache(), 'dvaw_' + chat, String(droga), 300); }
function aguardarEvolucaoLeito(chat, leito) { safePutCache(uxCache(), 'leito_' + chat, String(leito), 600); }

/* ========== Modos e decisão "Usar este caso" vs "Novo caso" ========== */

function uxMostrarDecisaoCaso(chat, mode, messageId) {
  var atual = modoBot(chat), legacy = uxCache().get('ctx_' + chat);
  var bruto = (atual && atual.data) ? atual.data : String(legacy || '');
  var resumo = uxLimparMd(bruto).slice(0, 140);
  var nomeAtual = atual && UX_NOMES_MODO[atual.mode] ? ' (' + UX_NOMES_MODO[atual.mode] + ')' : '';
  var texto = '*' + UX_NOMES_MODO[mode] + '*\n\n' +
    'Há um caso em andamento' + nomeAtual + ':\n' +
    (resumo ? '“' + resumo + (bruto.length > 140 ? '…' : '') + '”\n\n' : '\n') +
    '*Novo caso* descarta esses dados.';
  return enviarTelaBot(chat, texto, botoesBot([
    [['✅ Usar este caso', 'ux:usar:' + mode], ['🆕 Novo caso', 'ux:novo:' + mode]],
    [['Manter e fechar', 'ux:manter']]
  ]), messageId);
}

function iniciarModoBot(chat, mode, novo, messageId) {
  if (!UX_NOMES_MODO[mode]) return enviarMensagemParaChat(chat, 'Modo desconhecido. Use o teclado rápido.');
  var atual = modoBot(chat), legacy = uxCache().get('ctx_' + chat);
  if (!novo && ((atual && atual.data) || legacy)) {
    safePutCache(uxCache(), 'pending_' + chat, mode, UX_TTL_SEG);
    return uxMostrarDecisaoCaso(chat, mode, messageId);
  }
  definirModoBot(chat, mode, '', true);
  var orientacao = mode === 'gaso'
    ? 'Envie pH, pCO2 e HCO3 (ex: `7.20 23 10` ou `pH 7.20, pCO2 23, HCO3 10, Na 140, Cl 105`) ou toque em um caso predefinido abaixo:'
    : 'Grave um áudio narrando o caso ou envie os dados por texto.';

  var botoesModo = (mode === 'gaso' && typeof GasometriaAcidoBaseService !== 'undefined' && typeof GasometriaAcidoBaseService.obterTecladoInlineGasometria === 'function')
    ? GasometriaAcidoBaseService.obterTecladoInlineGasometria('inicial')
    : botoesBot([[['Encerrar', 'ux:cancelar']]]);

  return enviarTelaBot(chat,
    '*' + UX_NOMES_MODO[mode] + ' · Novo Caso*\n\n' + orientacao,
    botoesModo, messageId);
}

function enviarMenuGinecologiaObstetricia(chat, messageId) {
  return enviarTelaBot(chat, '🌸🤰 *Hub Unificado de Ginecologia & Obstetrícia (Internato até 29/11)*\n\nEscolha o módulo de atendimento rápido:', botoesBot([
    [['🤰 Pré-Natal & DPP', 'go_prenatal'], ['🏥 Parto & Partograma', 'go_parto']],
    [['🩸 HPP (4 Ts)', 'go_hpp'], ['⚡ Pré-Eclâmpsia & MgSO4', 'go_mgso4']],
    [['👶 Prematuridade & RPMO', 'go_prematuridade'], ['🔬 Toxo & Sorologias', 'go_toxo']],
    [['🌸 Vulvovaginites', 'go_corrimento'], ['🩺 Preventivo (INCA)', 'go_preventivo']],
    [['💊 Anticoncepção OMS', 'go_anticoncepcao'], ['🩹 DIP & Infecção Pélvica', 'go_dip']],
    [['🔙 Voltar ao Menu', 'ux:menu'], ['🏠 Início', 'ux:hub:inicio']]
  ]), messageId);
}

/* ========== Cenário 1: 🚨 Emergência & Sala Vermelha ========== */

function enviarMenuSalaVermelha(chat, messageId) {
  return enviarTelaBot(chat, '🚨 *EMERGÊNCIA & SALA VERMELHA*\n\nCondutas imediatas e suporte intensivo:', botoesBot([
    [['🫀 PCR (ACLS)', 'ux:conduta:pcr'], ['⚡ Arritmias Cardíacas', 'ux:emerg:arritmia']],
    [['🫁 SRI / IOT', 'ux:srimenu'], ['🩸 Gasometria', 'ux:iniciar:gaso']],
    [['💉 Drogas Vasoativas (DVA)', 'ux:dvamenu'], ['⚡ Choque & Hipotensão', 'ux:emerg:choque']],
    [['❤️ Crise HAS', 'ux:emerg:crisehas'], ['🧠 Escala de Glasgow', 'ux:emerg:glasgow']],
    [['🦟 Dengue C/D', 'ux:emerg:dengue'], ['🤕 Cefaleia / HSA', 'ux:emerg:cefaleia']],
    [['⚡ Outras Condutas', 'ux:condutamenu']],
    [['🔙 Sala Vermelha', 'ux:sala'], ['🏠 Início', 'ux:hub:inicio']]
  ]), messageId);
}

function enviarMenuDva(chat, messageId) {
  return enviarTelaBot(chat, '💉 *CALCULADORA DE DROGAS VASOATIVAS (DVA)*\n\nQual medicamento deseja calcular?', botoesBot([
    [['Noradrenalina', 'ux:droga:nora'], ['Dobutamina', 'ux:droga:dobuta']],
    [['Vasopressina', 'ux:fixa:vaso'], ['Adrenalina (Infusão)', 'ux:droga:adrena']],
    [['Nitroprussiato', 'ux:droga:nipride'], ['Nitroglicerina', 'ux:fixa:tridil']],
    [['🔙 Sala Vermelha', 'ux:sala'], ['🏠 Início', 'ux:hub:inicio']]
  ]), messageId);
}

function enviarTelaPesoDva(chat, droga, messageId) {
  var r = [], linha = [];
  UX_PESOS_RAPIDOS.forEach(function (p) {
    linha.push([p + ' kg', 'ux:peso:' + droga + ':' + p]);
    if (linha.length === 2) { r.push(linha); linha = []; }
  });
  if (linha.length) r.push(linha);
  r.push([['← Trocar medicamento', 'ux:dvamenu']]);
  r.push([['🔙 Sala Vermelha', 'ux:sala'], ['🏠 Início', 'ux:hub:inicio']]);
  return enviarTelaBot(chat,
    '💉 *' + UX_DROGAS[droga].toUpperCase() + '*\nPeso do paciente\n\n' +
    'Toque em um peso ou envie o valor em kg (ex.: 73,5). Os botões são aproximações: use o peso real quando souber.',
    botoesBot(r), messageId);
}

function enviarTelaDiluicaoDva(chat, droga, peso, messageId) {
  var p = String(peso).replace(',', '.');
  return enviarTelaBot(chat,
    '💉 *' + UX_DROGAS[droga].toUpperCase() + ' · ' + String(peso).replace('.', ',') + ' kg*\nSelecione a diluição.',
    botoesBot([
      [['Padrão', 'ux:diluicao:' + droga + ':' + p + ':padrao'], ['Concentrada', 'ux:diluicao:' + droga + ':' + p + ':concentrada']],
      [['✏️ Alterar peso', 'ux:droga:' + droga]],
      [['🔙 Sala Vermelha', 'ux:sala'], ['🏠 Início', 'ux:hub:inicio']]
    ]), messageId);
}

function enviarMenuSri(chat, messageId) {
  return enviarTelaBot(chat,
    '🫁 *SEQUÊNCIA RÁPIDA DE INTUBAÇÃO (SRI / IOT)*\n\nSelecione o peso ou cenário.\nOutro peso: envie `/sri 85`.',
    botoesBot([
      [['60 kg', 'ux:sri:60'], ['70 kg', 'ux:sri:70']],
      [['80 kg', 'ux:sri:80'], ['90 kg', 'ux:sri:90']],
      [['Choque 70 kg', 'ux:sri:70 choque'], ['Asma 70 kg', 'ux:sri:70 asma']],
      [['🔙 Sala Vermelha', 'ux:sala'], ['🏠 Início', 'ux:hub:inicio']]
    ]), messageId);
}

function enviarMenuCondutas(chat, messageId) {
  return enviarTelaBot(chat, '⚡ *Outras Emergências*\nSelecione a conduta beira-leito:', botoesBot([
    [['🚨 EAP hipertensivo', 'ux:conduta:eap'], ['⚡ Anafilaxia', 'ux:conduta:anafilaxia']],
    [['🧠 Crise convulsiva', 'ux:conduta:convulsao'], ['🧪 Hipercalemia', 'ux:conduta:hipercalemia']],
    [['🩸 Cetoacidose (CAD)', 'ux:conduta:cad']],
    [['🔙 Sala Vermelha', 'ux:sala'], ['🏠 Início', 'ux:hub:inicio']]
  ]), messageId);
}

function obterTextoCondutaEmergencia(tipo) {
  var k = String(tipo || '').toLowerCase().trim();
  if (k === 'eap') {
    return "🚨 *EMERGÊNCIA: EDEMA AGUDO DE PULMÃO (EAP HIPERTENSIVO)*\n\n" +
      "🔴 *AÇÃO IMEDIATA / CONDUTA BEIRA-LEITO:*\n" +
      "• *Posição:* Cabeceira elevada a 90° com pernas pendentes.\n" +
      "• *VNI Precoce:* Iniciar CPAP (8-10 cmH2O) ou BiPAP imediatamente. Reduz intubação orotraqueal e mortalidade.\n" +
      "• *Morfina:* NÃO recomendada de rotina (aumenta intubação e mortalidade segundo SBC/ESC).\n\n" +
      "🟡 *VASODILATADOR DE AÇÃO RÁPIDA (REDUÇÃO DE PÓS-CARGA):*\n" +
      "• *Nitroglicerina (Tridil):* Iniciar a 10 a 20 mcg/min (3 a 6 mL/h na BIC com 50 mg em 250 mL SG 5%) e titular a cada 5 min conforme PA.\n" +
      "• *Nitroprussiato de Sódio (Nipride):* 0,3 a 0,5 mcg/kg/min (50 mg em 250 mL SG 5%) se emergência hipertensiva grave ou refratária a Nitroglicerina.\n\n" +
      "💧 *DIURÉTICO DE ALÇA VENOSO:*\n" +
      "• *Furosemida:* 20 a 40 mg EV em bolus lento (1 a 2 ampolas de 20 mg/2 mL). Se uso prévio crônico: 1 a 2x a dose oral habitual EV.\n\n" +
      "⚠️ *SEGURANÇA BEIRA-LEITO:*\n" +
      "• Meta: Redução de 20-25% da PA na 1ª hora (evitar hipotensão PAS < 100 mmHg).\n" +
      "• Se PAS < 90 mmHg (choque cardiogênico): Suspender vasodilatadores e iniciar Noradrenalina.";
  }
  if (k === 'anafilaxia') {
    return "⚡ *EMERGÊNCIA: ANAFILAXIA EM ADULTO (PROTOCOLO IMEDIATO)*\n\n" +
      "🔴 *1ª LINHA MANDATÓRIA (AÇÃO IMEDIATA):*\n" +
      "• *Adrenalina IM 0.5mg:* Administrar Adrenalina (Epinefrina) 1:1.000 (1 mg/mL) na dose de *0,5 mg IM* (0,5 mL) IMEDIATAMENTE no músculo vasto lateral da coxa (face anterolateral).\n" +
      "• Repetir a dose a cada 5 a 15 minutos se resposta clínica insuficiente.\n" +
      "• ⚠️ *NÃO ATRASAR A ADRENALINA!* Antialérgicos e corticoides nunca devem atrasar a administração da adrenalina intramuscular.\n\n" +
      "🟡 *SUPORTE HEMODINÂMICO & POSICIONAMENTO:*\n" +
      "• *Posicionamento:* Decúbito dorsal com membros inferiores elevados. NUNCA levantar ou sentar o paciente abruptamente (risco de colapso de retorno venoso).\n" +
      "• *Expansão Volêmica Rápida:* SF 0,9% 1000 a 2000 mL em bolus rápido IV em acesso calibroso.\n" +
      "• *Oxigenação:* O₂ a 10-15 L/min sob máscara com reservatório. Preparar SRI/IOT imediata se estridor ou edema de via aérea.\n\n" +
      "🔵 *TERAPIA ADJUVANTE (SEGUNDA LINHA):*\n" +
      "• *Anti-histamínico:* Difenidramina 50 mg EV lento.\n" +
      "• *Corticoide:* Hidrocortisona 200 a 500 mg EV ou Metilprednisolona 1-2 mg/kg EV (prevenção de resposta bifásica).";
  }
  if (k === 'convulsao') {
    return "🧠 *EMERGÊNCIA: CRISE CONVULSIVA & ESTADO DE MAL EPILÉPTICO (EME)*\n\n" +
      "🔴 *1ª LINHA — BENZODIAZEPÍNICOS (CRISE > 5 MINUTOS):*\n" +
      "• *Diazepam:* 10 mg EV puro lento (velocidade 2 a 5 mg/min). Se a crise persistir após 5 min, repetir 10 mg EV (dose máxima: 20 a 30 mg).\n" +
      "• *OU Midazolam:* 10 mg IM (face anterolateral da coxa) se sem acesso venoso imediato, OU 5 a 10 mg EV lento.\n\n" +
      "🟡 *2ª LINHA — CRISE REFRATÁRIA > 10 MINUTOS (STATUS EPILÉPTICO):*\n" +
      "• *Fenitoína (Hidantal):* 20 mg/kg EV (máximo 1500 mg). Diluir em SF 0,9% (concentração máxima 10 mg/mL; NUNCA diluir em glicose pelo risco de precipitação).\n" +
      "• Velocidade de infusão da Fenitoína: máximo de 50 mg/min sob monitorização contínua de ECG e PA.\n" +
      "• Alternativas de 2ª linha: Levetiracetam 60 mg/kg EV (máx 4500 mg) ou Valproato de Sódio 40 mg/kg EV.\n\n" +
      "⚠️ *CUIDADOS IMEDIATOS BEIRA-LEITO:*\n" +
      "• Proteção de via aérea e aspiração de vias aéreas; não colocar objetos na boca do paciente.\n" +
      "• Decúbito lateral após término da fase clônica.\n" +
      "• Checagem imediata de HGT: se hipoglicemia (< 70 mg/dL), infundir 4 ampolas de Glicose 50% (40 mL) EV.";
  }
  if (k === 'hipercalemia') {
    return "🧪 *EMERGÊNCIA: HIPERCALEMIA GRAVE COM ALTERAÇÕES NO ECG*\n\n" +
      "🔴 *PASSO 1: ESTABILIZAÇÃO DE MEMBRANA MIOCÁRDICA:*\n" +
      "• Indicação: Onda T apiculada, alargamento de QRS, perda de onda P ou K⁺ > 6,5 mEq/L.\n" +
      "• *Gluconato de Cálcio 10%:* 10 a 20 mL (1 a 2 ampolas de 10 mL) EV lento em 2 a 5 minutos.\n" +
      "• Início de ação em 1 a 3 minutos; duração de 30 a 60 min. Repetir dose em 5 a 10 min se alterações no ECG persistirem.\n" +
      "• ⚠️ O Cálcio protege o miocárdio contra arritmias ventriculares e PCR, mas NÃO reduz os níveis séricos de potássio.\n\n" +
      "🟡 *PASSO 2: SHIFT CELULAR (REDUÇÃO RÁPIDA DE K⁺ SÉRICO):*\n" +
      "• *Glicoinsulina:* Glicose 50% (50 mL) + Insulina Regular 10 UI EV em infusão de 20 a 30 minutos.\n" +
      "• Reduz K⁺ em 0,5 a 1,2 mEq/L em 15-30 min. Checar HGT em 30, 60 e 120 minutos.\n" +
      "• *Nebulização com Beta-2 Agonista:* Salbutamol 5 mg ou Fenoterol 10 a 20 gotas nebulizado com 5 mL SF 0,9%.\n" +
      "• *Bicarbonato de Sódio 8,4%:* 50 a 100 mL EV se acidose metabólica concomitante (pH < 7,20).\n\n" +
      "🔵 *PASSO 3: ELIMINAÇÃO CORPORAL DE POTÁSSIO:*\n" +
      "• *Furosemida:* 40 a 80 mg EV se paciente não anúrico.\n" +
      "• *Resina de troca:* Poliestirenossulfonato de cálcio (Sorcal) 30g VO.\n" +
      "• *Hemodiálise de Emergência:* Indicação mandatória se anúria, refratariedade ou K⁺ > 7,5 mEq/L.";
  }
  if (k === 'cad') {
    return "🩸 *EMERGÊNCIA: CETOACIDOSE DIABÉTICA (CAD) & HIPEROSMOLARIDADE*\n\n" +
      "🔴 *PASSO 1: EXPANSÃO VOLÊMICA AGRESSIVA (1ª HORA):*\n" +
      "• *Hidratação 1000mL:* SF 0,9% 1000 a 1500 mL EV na primeira hora (15 a 20 mL/kg/h) para rápida restauração da perfusão tecidual.\n" +
      "• Após 1ª hora: avaliar sódio corrigido. Se Na corrigido normal ou alto: NaCl 0,45% 250 a 500 mL/h; se Na baixo: SF 0,9% 250 a 500 mL/h.\n\n" +
      "⚠️ *PASSO 2: CHECAGEM MANDATÓRIA DE POTÁSSIO (K⁺) ANTES DA INSULINA:*\n" +
      "• *Se K⁺ < 3,5 mEq/L:* NÃO INICIAR INSULINA! A insulina transporta potássio para o intracelular gerando hipocalemia grave e risco de arritmia fatal / PCR. Repor KCl 20 a 30 mEq/h até K⁺ > 3,5 mEq/L.\n" +
      "• *Se K⁺ entre 3,5 e 5,2 mEq/L:* Iniciar insulina E repor KCl 20 a 30 mEq por litro de soro de hidratação (manter K⁺ 4,0 a 5,0).\n" +
      "• *Se K⁺ > 5,2 mEq/L:* Iniciar insulina sem reposição de K⁺. Monitorar K⁺ a cada 2 horas.\n\n" +
      "🟡 *PASSO 3: INSULINOTERAPIA VENOSA (QUANDO K⁺ ≥ 3,5 mEq/L):*\n" +
      "• *Insulina Regular IV Contínua:* 0,1 U/kg/h na BIC (ou bólus de 0,1 U/kg seguido de 0,1 U/kg/h). Preparo: 100 UI de Insulina Regular em 100 mL SF 0,9% (1 UI/mL).\n" +
      "• *Meta Glicêmica:* Queda de 50 a 70 mg/dL por hora.\n" +
      "• Quando glicemia atingir *200 mg/dL*: associar Soro Glicosado 5% (SG 5%) e reduzir a insulina para 0,02 a 0,05 U/kg/h para evitar hipoglicemia e edema cerebral enquanto fecha o ânion gap.\n\n" +
      "ℹ️ *CRITÉRIOS DE RESOLUÇÃO:*\n" +
      "• Glicemia < 200 mg/dL + dois dos seguintes: Bicarbonato ≥ 15 mEq/L, pH venoso > 7,30 e Ânion Gap normal (≤ 12).";
  }
  return null;
}

function enviarTelaCondutaEmergencia(chat, condutaKey, messageId) {
  var textoCond = obterTextoCondutaEmergencia(condutaKey);
  if (!textoCond) {
    return enviarMenuCondutas(chat, messageId);
  }
  var cache = uxCache();
  var ck = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ck, textoCond, 21600);
  var botoes = botoesBot([
    [['📋 Copiar para Prontuário', 'ux:copiar:' + ck]],
    [['🔙 Sala Vermelha', 'ux:sala'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, textoCond, botoes, messageId);
}

/* ========== Cenário 2: 🛏️ Enfermaria & Prescrição Rápida ========== */

function enviarMenuEnfermaria(chat, messageId) {
  var texto = '🛏️ *ENFERMARIA & PRESCRIÇÃO*\nSelecione a ferramenta ou envie o caso diretamente:';
  var botoes = botoesBot([
    [['🏥 Painel de Leitos', 'ux:painel:0'], ['📋 Passagem SBAR', 'ux:enf:sbar']],
    [['🧪 Clearance (Cockcroft)', 'ux:enf:clcr'], ['💊 Ajuste Renal ATB', 'ux:enf:ajuste']],
    [['💧 Hidratação / Holliday', 'ux:enf:hidratacao'], ['📋 Prescrição Hospitalar', 'ux:enf:rxh']],
    [['💊 Sintomáticos / SOS', 'ux:enf:sintomaticos']],
    [['🔙 Voltar ao Menu', 'ux:menu'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function enviarTelaEnfClearance(chat, messageId) {
  var texto = '🧪 *CALCULADORA DE CLEARANCE E AUDITORIA RENAL*\n\n' +
    'Envie a idade, peso, creatinina, sexo e medicamentos para auditar:\n\n' +
    '💡 *Exemplos rápidos beira-leito:*\n' +
    '• `/crcl 65 anos, 70kg, cr 1.8, masculino`\n' +
    '• `/crcl 80 anos, 55kg, cr 2.1, fem, medicações: vancomicina`\n' +
    '• `/clearance 45a, 80kg, cr 3.5, mulher, enoxaparina`';
  var botoes = botoesBot([
    [['🧪 Cockcroft 70kg Cr 1.2 M', 'calc_Cockcroft'], ['📊 CKD-EPI (TFG)', 'calc_CKD']],
    [['🔙 Enfermaria', 'ux:hub:enf'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function enviarTelaEnfAjusteATB(chat, messageId) {
  var texto = '💉 *AJUSTE RENAL DE ANTIMICROBIANOS (GUIA HSL / IDSA)*\n\n' +
    'Envie o antimicrobiano e o clearance ou toque em um atalho abaixo:\n\n' +
    '💡 *Exemplos rápidos beira-leito:*\n' +
    '• `/atb meropenem clcr 25`\n' +
    '• `/atb vanco 40`\n' +
    '• `/atb pip-tazo clcr 30`\n' +
    '• `/atb cefepime hd`\n' +
    '• `/atb polimixina b 10`';
  var botoes = botoesBot([
    [['💊 Meropenem ClCr 25', 'ux:atb:mero25'], ['💊 Pip-Tazo ClCr 30', 'ux:atb:tazo30']],
    [['💊 Cefepime HD', 'ux:atb:cefepimehd'], ['💊 Vanco ClCr 40', 'ux:atb:vanco40']],
    [['🔙 Enfermaria', 'ux:hub:enf'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function enviarTelaEnfHidratacao(chat, messageId) {
  var texto = '💧 *HIDRATAÇÃO VENOSA & SUPORTE (HOLLIDAY-SEGAR)*\n\n' +
    'Envie o peso e a condição clínica ou toque em um exemplo beira-leito:\n\n' +
    '💡 *Exemplos:*\n' +
    '• `/holliday 8kg` (Manutenção, vazão em bomba, eletrólitos SBP e TIG)\n' +
    '• `/holliday 11kg bronquiolite` (Restrição a 70% p/ prevenir sobrecarga)\n' +
    '• `/nutriped 6kg 3 meses partida` (Avaliação nutricional completa)';
  var botoes = botoesBot([
    [['💧 Holliday 8kg', 'ux:hol:8kg'], ['💧 Holliday 11kg Bronquiolite', 'ux:hol:11kg_bva']],
    [['🔙 Enfermaria', 'ux:hub:enf'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function enviarTelaEnfPrescricaoHosp(chat, messageId) {
  var texto = '📝 *PRESCRIÇÃO HOSPITALAR DE INTERNAÇÃO*\n\n' +
    'Gere uma prescrição de internação padronizada (10 itens) com auditoria de segurança:\n\n' +
    '💡 *Envie os dados do caso por texto ou áudio:*\n' +
    '`/rxh Paciente 68a, 70kg, Cr 1.8, internado por PAC grave em enfermaria, HAS e DM2`';
  var botoes = botoesBot([
    [['📋 Gerar Exemplo (PAC Grave)', 'ux:rxh:exemplo_pac']],
    [['🔙 Enfermaria', 'ux:hub:enf'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function enviarTelaEnfSBAR(chat, messageId) {
  var textoConsolidado = (typeof EnfermariaService !== 'undefined' && EnfermariaService.obterTextoConsolidadoParaPassagem)
    ? EnfermariaService.obterTextoConsolidadoParaPassagem()
    : null;
  if (!textoConsolidado) {
    var texto = '📋 *PASSAGEM DE PLANTÃO SBAR*\n\n' +
      '🏥 Nenhum leito registrado na enfermaria para passar plantão.\n\n' +
      '💡 Registre os leitos usando `/leito <num> <evolução>` antes de gerar a passagem.';
    var botoes = botoesBot([
      [['🏥 Painel de Leitos', 'ux:painel:0']],
      [['🔙 Enfermaria', 'ux:hub:enf'], ['🏠 Início', 'ux:hub:inicio']]
    ]);
    return enviarTelaBot(chat, texto, botoes, messageId);
  }
  return processarMensagemTexto({ chat: { id: chat }, text: '/passagem' });
}

/* ========== Cenário 3: 🩺 Ambulatório & Atenção Primária (UBS) ========== */

function enviarMenuAmbulatorio(chat, messageId) {
  var texto = '🩺 *AMBULATÓRIO & ATENÇÃO PRIMÁRIA (UBS)*\nSelecione a ação ou envie o caso diretamente:';
  var botoes = botoesBot([
    [['📝 Gerador SOAP Ágil', 'ux:amb:soap'], ['💊 Prescrição REMUME', 'ux:amb:remume']],
    [['🏷️ CID-10 & CIAP-2', 'ux:amb:cid'], ['📄 Atestado CFM', 'ux:amb:atestado']],
    [['🤰 Hub G&O', 'ux:rotina:go'], ['🌸 Preventivo', 'ux:rotina:preventivo']],
    [['🔙 Voltar ao Menu', 'ux:menu'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

/* ========== Cenário 4: 💊 Consultas Rápidas de Bolso ========== */

function enviarMenuConsultasBolso(chat, messageId) {
  var texto = '💊 *CONSULTAS RÁPIDAS DE BOLSO*\nSelecione o guia de referência:';
  var botoes = botoesBot([
    [['🦠 Antibióticos por Foco', 'ux:bolso:atb'], ['👶 Doses Pediátricas (kg)', 'ux:bolso:ped']],
    [['🤰 Gestação & Lactação', 'ux:bolso:gestacao'], ['⚠️ Interações Graves', 'ux:bolso:interacao']],
    [['💉 Diluição & Preparo HSL', 'ux:bolso:hsl'], ['📐 Calculadoras Clínicas', 'ux:hub:calc']],
    [['🔙 Voltar ao Menu', 'ux:menu'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

/* ========== Hub Principal (4 Cenários Clínicos Imediatos) ========== */

function enviarHubPrincipal(chat, messageId) {
  var texto = '⚡ *Ultra Rotina · Central de Comandos Beira-Leito*\nSelecione o cenário clínico ou envie o caso diretamente:';

  var urlApp = obterUrlCockpit(chat);
  var linha3 = (typeof ehUsuarioTitular === 'function' && ehUsuarioTitular(chat))
    ? [['📐 Calculadoras', 'ux:hub:calc'], ['📅 Rotina & Estudo', 'ux:hub:rotina']]
    : [['📐 Calculadoras', 'ux:hub:calc'], ['🩸 Gasometria', 'ux:iniciar:gaso']];

  var botoes = [
    [['🚨 Sala Vermelha', 'ux:hub:sala'], ['🛏️ Enfermaria', 'ux:hub:enf']],
    [['🩺 Ambulatório', 'ux:hub:amb'], ['💊 Consultas Bolso', 'ux:hub:bolso']],
    linha3,
    [{ text: '📱 Cockpit Mini App', web_app: { url: urlApp } }, ['🧹 Novo Paciente', 'ux:novo:soap']]
  ];

  return enviarTelaBot(chat, texto, botoesBot(botoes), messageId);
}

function enviarMenuUXCalculadoras(chat, messageId) {
  return enviarTelaBot(chat, '📐 *Calculadoras Clínicas*\nEscolha a ferramenta necessária:', botoesBot([
    [['Drogas vasoativas', 'ux:dvamenu'], ['Gasometria', 'ux:iniciar:gaso']],
    [['Outras calculadoras', 'calc_menu_principal'], ['Sala vermelha', 'ux:sala']],
    [['🔙 Voltar ao Menu', 'ux:menu'], ['🏠 Início', 'ux:hub:inicio']]
  ]), messageId);
}

function enviarRotinaBot(chat, messageId) {
  if (typeof ehUsuarioTitular === 'function' && !ehUsuarioTitular(chat)) {
    return enviarTelaBot(chat, "🔒 *Recurso Restrito ao Titular*\n\nA central de rotina, lifestyle e agenda do Notion é exclusiva do administrador da conta.\n\nUse o botão abaixo para voltar ao menu clínico.", botoesBot([
      [['← Menu principal', 'ux:menu']]
    ]), messageId);
  }
  var hoje = new Date();
  var blocos = (typeof RotinaService !== "undefined" && RotinaService.obterBlocosDoDia) ? RotinaService.obterBlocosDoDia(hoje) : [];
  var timeline = (typeof RotinaService !== "undefined" && RotinaService.formatarTimelineMarkdown) ? RotinaService.formatarTimelineMarkdown(blocos, hoje) : "";

  var texto = "*📅 Central de Rotina & Lifestyle Adaptativo*\n\n" +
              (timeline ? timeline + "\n\n" : "") +
              "Selecione uma ação rápida ou envie áudio/texto para ajustar seus blocos:";

  var botoes = botoesBot([
    [['✏️ Ajustar Rotina', 'rotina:ajustar'], ['💤 Modo Descanso', 'rotina:descanso']],
    [['🔄 Restaurar Padrão', 'rotina:reset'], ['📆 Sincronizar Agenda', 'rotina:cal_sync']],
    [['📆 Agenda de Hoje', 'ux:rotina:agenda'], ['📆 Agenda de Amanhã', 'ux:rotina:agenda_amanha']],
    [['📋 Minhas Tarefas', 'ux:rotina:tasks'], ['🌙 Check-in Noturno', 'ux:rotina:checkin']],
    [['🏁 Fim de Plantão', 'ux:rotina:plantao_fim'], ['🧠 Dúvida MedQuest', 'ux:rotina:duvida']],
    [['← Menu principal', 'ux:menu']]
  ]);

  return enviarTelaBot(chat, texto, botoes, messageId);
}

/* ========== Enfermaria ========== */

function enviarPainelEnfermaria(chat, pagina, msgId) {
  var all = EnfermariaService.obterTodos();
  var keys = Object.keys(all).sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true }); });
  pagina = Math.max(0, Math.min(Number(pagina) || 0, Math.max(0, Math.ceil(keys.length / 5) - 1)));
  var slice = keys.slice(pagina * 5, pagina * 5 + 5), rows = [];
  var estaveis = 0, vigilancias = 0, instaveis = 0;
  keys.forEach(function (k) {
    var st = String(all[k].status || '').toLowerCase();
    if (st.indexOf('inst') !== -1) instaveis++;
    else if (st.indexOf('vigil') !== -1) vigilancias++;
    else estaveis++;
  });
  var censo = keys.length ? ' · (' + keys.length + ' leitos: 🟢 ' + estaveis + ' | 🟡 ' + vigilancias + ' | 🔴 ' + instaveis + ')' : '';
  var texto = '🏥 *Enfermaria' + censo + '*\n\n';
  if (!keys.length) texto += 'Nenhum leito registrado. Use /leito 4 seguido da evolução.';
  slice.forEach(function (id) {
    var l = all[id];
    texto += '*Leito ' + id + '* · ' + l.status + '\n' + l.dataISO + ' ' + l.atualizadoEm + '\n\n';
    rows.push([['Abrir leito ' + id, 'ux:leito:' + id]]);
  });
  var nav = [];
  if (pagina > 0) nav.push(['← Anterior', 'ux:painel:' + (pagina - 1)]);
  if ((pagina + 1) * 5 < keys.length) nav.push(['Próxima →', 'ux:painel:' + (pagina + 1)]);
  if (nav.length) rows.push(nav);
  rows.push([['🔄 Atualizar', 'ux:painel:' + pagina], ['Passagem SBAR', UX_CB_PASSAGEM_SBAR]]);
  rows.push([['🔙 Enfermaria', 'ux:hub:enf'], ['🏠 Início', 'ux:hub:inicio']]);
  return enviarTelaBot(chat, texto, botoesBot(rows), msgId);
}

function uxTelaLeito(chat, id, msgId, aviso) {
  var l = EnfermariaService.obterLeito(id);
  if (!l) return enviarMensagemParaChat(chat, 'Leito não encontrado.');
  var texto = (aviso ? '✅ ' + aviso + '\n\n' : '') +
    '🛏️ *Leito ' + id + '* · ' + l.status + '\n📅 ' + l.dataISO + ' às ' + l.atualizadoEm + '\n\n' + l.dados;
  var ver = (l.version ? l.version.slice(0, 8) : '');
  return enviarTelaBot(chat, texto, botoesBot([
    [['🟢 Estável', 'ux:status:' + id + ':estavel' + (ver ? ':' + ver : '')], ['🟡 Vigilância', 'ux:status:' + id + ':vigilancia' + (ver ? ':' + ver : '')]],
    [['🔴 Instável', 'ux:status:' + id + ':instavel' + (ver ? ':' + ver : '')]],
    [['✏️ Evoluir leito', 'ux:evoluir:' + id], ['Dar alta', 'ux:confirmar:' + id]],
    [['← Leitos', 'ux:painel:0'], ['🔙 Enfermaria', 'ux:hub:enf']]
  ]), msgId);
}

function confirmarAltaBot(chat, id) {
  var l = EnfermariaService.obterLeito(id);
  if (!l) return enviarMensagemParaChat(chat, 'Leito não encontrado.');
  var code = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  safePutCache(uxCache(), 'alta_' + code, JSON.stringify({
    id: id, chat: String(chat), version: l.version || (l.dataISO + ' ' + l.atualizadoEm)
  }), 300);
  return enviarMensagemComTecladoParaChat(chat,
    'Confirmar alta do leito ' + id + '? O histórico será preservado.',
    botoesBot([[['Confirmar alta', 'ux:alta:' + code], ['Cancelar', 'ux:leito:' + id]]]));
}

/* ========== Exportação para prontuário ========== */

/** Texto plano, sem Markdown, emojis ou ruído de navegação. */
function uxTextoProntuario(raw) {
  return String(raw || '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/`+/g, '')
    .replace(/\*+/g, '')
    .replace(/(^|\s)_+|_+(?=\s|$)/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Linha de botões de exportação para anexar a resultados (uso por outros módulos).
 * Texto limpo de 1–256 caracteres => botão nativo copy_text; caso contrário => envio em texto plano.
 */
function uxLinhaCopiar(chaveCache, resultado) {
  var limpo = uxTextoProntuario(resultado);
  if (limpo.length >= 1 && limpo.length <= UX_MAX_COPY_TEXT) {
    return [{ text: '📋 Copiar texto', copy_text: { text: limpo } }];
  }
  return [['📄 Texto p/ prontuário', 'ux:copiar:' + chaveCache]];
}

/* ========== Entrada de texto ========== */

function tratarEntradaUX(message) {
  var chat = message.chat.id, text = (message.text || '').trim(), cache = uxCache();

  if (/^\/entrega\s+outbox_[\w-]+$/.test(text)) {
    var registro = recuperarRegistroBot(text.split(/\s+/)[1]);
    enviarMensagemParaChat(chat, registro && registro.payload ? '*Consulta de entrega preservada — não é reenvio da operação*\n\n'+String(registro.payload.text || JSON.stringify(registro.payload)) : 'Entrega não encontrada.');
    return true;
  }

  // ── Botões dos Teclados Adaptativos Contextuais ───────────────────────────
  // Conclusão e Saída Limpa (1 toque)
  if (text === '🧹 Novo Paciente' || text === '🧹 Novo' || text === '🧹 Limpar Paciente' || text === '❌ Concluir Caso' || text === '❌ Concluir / Próximo' || text === '❌ Concluir / Próximo Caso' || text === '/novo' || text === '/cancelar') {
    limparEstadoBot(chat);
    enviarMensagemComTecladoFixo(chat, '🧹 *Memória limpa.* Pronto para o próximo paciente!');
    return true;
  }
  if (text === '❌ Sair da Enfermaria' || text === '❌ Sair Leito') {
    limparEstadoBot(chat);
    enviarMensagemComTecladoFixo(chat, '🏥 *Enfermaria fechada.* Teclado de espera restaurado.');
    return true;
  }
  if (text === '❌ Sair da Sala Vermelha') {
    limparEstadoBot(chat);
    enviarMensagemComTecladoFixo(chat, '🚨 *Sala Vermelha finalizada.* Teclado de espera restaurado.');
    return true;
  }

  // Atalhos Rápidos do Teclado Principal (1-Toque)
  if (text === '🚨 Sala Vermelha' || text === '🚨 Emergência') {
    if (typeof enviarMenuSalaVermelha === "function") {
      enviarMenuSalaVermelha(chat);
    }
    return true;
  }
  if (text === '🛏️ Enfermaria' || text === '🏥 Enfermaria') {
    if (typeof enviarMenuEnfermaria === "function") {
      enviarMenuEnfermaria(chat);
    }
    return true;
  }
  if (text === '🩺 Ambulatório' || text === '🩺 SOAP Ambulatorial') {
    if (typeof enviarMenuAmbulatorio === "function") {
      enviarMenuAmbulatorio(chat);
    }
    return true;
  }
  if (text === '💊 Consultas de Bolso' || text === '💊 REMUME Rápida' || text === '💊 Prescrever') {
    if (typeof enviarMenuConsultasBolso === "function") {
      enviarMenuConsultasBolso(chat);
    }
    return true;
  }
  if (text === '⚙️ Central / Menu' || text === '⚙️ Menu / Ajuda') {
    if (typeof enviarHubPrincipal === "function") {
      enviarHubPrincipal(chat);
    }
    return true;
  }
  if (text === '🤰 Ginecologia & Obstetrícia') {
    if (typeof enviarMenuGinecologiaObstetricia === "function") {
      enviarMenuGinecologiaObstetricia(chat);
    }
    return true;
  }

  // Ações do Teclado Modo SOAP
  if (text === '📋 Fechar Plano') {
    return tratarCallbackUX({ data: 'ux:soap:plano', message: { chat: { id: chat }, message_id: 0 }, id: 'ux_btn' });
  }
  if (text === '🩺 EF 100% Normal') {
    return tratarCallbackUX({ data: 'ux:soap:ef_normal', message: { chat: { id: chat }, message_id: 0 }, id: 'ux_btn' });
  }
  if (text === '💊 Prescrever REMUME') {
    iniciarModoBot(chat, 'rx', false);
    return true;
  }

  // Ações do Teclado Modo Enfermaria
  if (text === '📋 Passagem SBAR') {
    processarMensagemTexto({ chat: { id: chat }, text: '/passagem' });
    return true;
  }
  if (text === '🟢 Estável' || text === '🟡 Vigilância' || text === '🔴 Instável') {
    var tipoSt = text === '🟢 Estável' ? 'estavel' : text === '🟡 Vigilância' ? 'vigilancia' : 'instavel';
    var leitoAtivo = cache.get('leito_' + chat);
    if (leitoAtivo) {
      cache.remove('leito_' + chat);
      var rSt = EnfermariaService.atualizarStatusLeito(leitoAtivo, tipoSt);
      enviarMensagemParaChat(chat, rSt.mensagem || rSt.erro);
      return true;
    }
    enviarMensagemParaChat(chat, 'Para mudar o status para *' + text + '*, informe o leito (ex: `/leito 4 ' + tipoSt + '`).');
    return true;
  }

  // Ações do Teclado Modo Sala Vermelha
  if (text === '💉 Noradrenalina') {
    aguardarPesoDva(chat, 'nora');
    enviarTelaPesoDva(chat, 'nora');
    return true;
  }
  if (text === '💉 Dobutamina') {
    aguardarPesoDva(chat, 'dobuta');
    enviarTelaPesoDva(chat, 'dobuta');
    return true;
  }
  if (text === '🫁 Sequência Rápida (SRI)') {
    enviarMenuSri(chat);
    return true;
  }
  if (text === '🩸 Gasometria') {
    iniciarModoBot(chat, 'gaso', false);
    return true;
  }

  // ── Botões do teclado compacto de 3 teclas (Standby) ────────────────────────
  if (text === '🚨 Emergência') { enviarMenuSalaVermelha(chat); return true; }
  if (text === '🏥 Plantão') { enviarPainelEnfermaria(chat, 0); return true; }
  // 📱 Cockpit é um web_app — não gera mensagem de texto; não precisa de handler.

  // ── Aliases legados mantidos para retrocompatibilidade ────────────────────
  var menus = { '🩺 Novo SOAP': 'soap', '💊 Prescrever': 'rx', '🩸 Gaso': 'gaso' };
  if (menus[text]) { iniciarModoBot(chat, menus[text], text === '🩺 Novo SOAP'); return true; }
  if (text === '🎧 Preceptor Voz') { iniciarModoBot(chat, 'voz', false); return true; }

  if (text === '📅 Minha rotina' || text === '📅 Minha Rotina') { enviarRotinaBot(chat); return true; }
  if (text === '🚨 Sala Vermelha' || text === '/sala') { enviarMenuSalaVermelha(chat); return true; }
  if (text === '📐 Calculadoras') { enviarMenuUXCalculadoras(chat); return true; }
  if (text === '/menu' || text === '/start' || text === '/teclado' || text === '⚙️ Menu / Ajuda') {
    enviarHubPrincipal(chat);
    return true;
  }
  if (text === '/ajuda' || text === '/help' || text === '❔ Ajuda') {
    if (typeof enviarManualCompletoComandos === 'function') {
      enviarManualCompletoComandos(chat, '');
      return true;
    }
    return false;
  }
  if (text === '🏥 Enfermaria' || text === '/enfermaria') {
    if (typeof construirTecladoHubEnfermaria === 'function') {
      enviarMensagemComTecladoParaChat(chat, EnfermariaService.formatarPainelBordo(), construirTecladoHubEnfermaria());
      return true;
    }
    enviarPainelEnfermaria(chat, 0);
    return true;
  }
  if (text === '/limpar_enfermaria') {
    enviarMensagemParaChat(chat, 'Para preservar os dados, confirme a alta de cada leito no painel /enfermaria.');
    return true;
  }
  if (/^\/alta\s+/.test(text)) { confirmarAltaBot(chat, text.replace(/^\/alta\s+/, '')); return true; }

  // Abrir um guia é navegação do caso atual, não uma troca de paciente/modo.
  if (/^\/(?:ef(?:_(?:neuro|pqu|oftalmo|ortopo|orl|dermato|gineco|procto|ped|geriatria|vascular))?|exames_especiais|neuro|pqu|psiq|oftalmo|ortopo|trauma|otorrino|orl|dermato|pele|gineco|go|procto|uro|ped|pedia|geriatria|aga|vascular|tvp)(?:\s|$)/i.test(text)) return false;

  if (text.charAt(0) === '/') {
    // Outros comandos suspendem a captura livre sem apagar os dados do atendimento.
    if (!/^\/(?:soap|rx|receita|gaso|voz|sabatina|calc|plantao|sbar|round|pitch|interacao|conduta|sos)(?:\s|$)/i.test(text)) {
      var emCurso = modoBot(chat);
      if (emCurso && emCurso.mode) salvarModoBot(chat, {caseId: emCurso.caseId, mode: '', data: emCurso.data});
    }
    ['modo_' + chat, 'dvaw_' + chat, 'leito_' + chat, 'efconfirm_' + chat].forEach(function (k) {
      cache.remove(k);
    });
    return false;
  }

  var pendente = cache.get('pending_' + chat);
  if (pendente && UX_NOMES_MODO[pendente]) {
    uxMostrarDecisaoCaso(chat, pendente);
    return true;
  }

  var recalcPendente = cache.get('recalc_ck_' + chat);
  if (recalcPendente) {
    var pRecalc = sanitizarEValidarPesoKg(text);
    if (pRecalc !== null) {
      cache.remove('recalc_ck_' + chat);
      var casoOrigLivre = cache.get(recalcPendente) || obterContextoClinicoBot(chat);
      if (!casoOrigLivre) {
        enviarMensagemParaChat(chat, '⚠️ Caso original expirado do cache. Envie novamente os dados com o novo peso.');
        return true;
      }
      var textoComNovoPesoLivre;
      if (/\b\d+(?:[.,]\d+)?\s*kg\b/i.test(casoOrigLivre)) {
        textoComNovoPesoLivre = casoOrigLivre.replace(/\b\d+(?:[.,]\d+)?\s*kg\b/i, pRecalc + ' kg');
      } else {
        textoComNovoPesoLivre = 'Paciente ' + pRecalc + ' kg. ' + casoOrigLivre;
      }
      enviarMensagemParaChat(chat, '🔄 *Recalculando conduta e doses para paciente de ' + pRecalc + ' kg...*');
      processarMensagemTexto({ chat: { id: chat }, text: textoComNovoPesoLivre });
      return true;
    }
  }

  var drogaAguardando = cache.get('dvaw_' + chat);
  if (drogaAguardando && UX_DROGAS[drogaAguardando]) {
    var p = sanitizarEValidarPesoKg(text);
    if (p === null) {
      enviarMensagemParaChat(chat, 'Informe apenas o peso em kg, por exemplo 70,5. /cancelar encerra.');
      return true;
    }
    cache.remove('dvaw_' + chat);
    enviarTelaDiluicaoDva(chat, drogaAguardando, p);
    return true;
  }

  var leitoAguardando = cache.get('leito_' + chat);
  if (leitoAguardando) {
    cache.remove('leito_' + chat);
    message.text = '/leito ' + leitoAguardando + ' ' + text;
    return false;
  }

  var state = modoBot(chat);
  var dialogoAtivo = (typeof obterDialogoPreceptor === "function") ? obterDialogoPreceptor(chat) : null;
  if (dialogoAtivo && dialogoAtivo.em_andamento) {
    // Diálogo socrático ativo: não redireciona nem adiciona prefixo /soap à resposta de Wagner
    return false;
  }

  if (state && UX_MODOS_TEXTO.indexOf(state.mode) !== -1) {
    var dados = state.data ? state.data + '\n\n' + text : text;
    if (dados.length > UX_MAX_CASO_CHARS) {
      enviarMensagemParaChat(chat, 'O caso ultrapassou 6.000 caracteres. Nenhum dado foi cortado. Use /novo para outro caso.');
      return true;
    }
    definirModoBot(chat, state.mode, dados);
    message.text = '/' + state.mode + ' ' + dados;
    return false;
  }

  cache.remove('ctx_' + chat);
  return false;
}

/* ========== Extração de Receita do SOAP ========== */

function extrairPlanoDeTextoSoap(textoSoap) {
  if (!textoSoap || typeof textoSoap !== "string") return null;
  var texto = textoSoap.trim();

  // 1. Procurar cabeçalho da seção de Plano / Conduta / Prescrição
  var regexPlano = /(?:(?:📋\s*)?\[?\*?P\s*[-–—:]\s*(?:Plano|Conduta|Prescri[çc][ãa]o)\*?\]?[^\n]*|\b(?:4\.\s*)?PLANO(?:\s+TERAP[ÊE]UTICO)?\s*[:\n]|\bPRESCRI[ÇC][ÃA]O(?:\s+FARMACOL[ÓO]GICA)?\s*[:\n])([\s\S]+)/i;
  var match = texto.match(regexPlano);
  var secaoPlano = match ? match[1] : null;

  if (secaoPlano) {
    // Cortar seções subsequentes de pendências, alertas, notas ou separadores de fechamento
    var corte = secaoPlano.search(/\n(?:\s*(?:⚠️|🚨|📌|={3,}|_{3,}|\*{1,2}(?:Dados adicionais|Pend[êe]ncias|Observa[çc][õo]es)|(?:👤|🔍|🧠)\s*\*?[SOA]\s*[-–—:]|\[[SOA]\s*[-–—:]))/i);
    if (corte !== -1) {
      secaoPlano = secaoPlano.substring(0, corte);
    }
    secaoPlano = secaoPlano.trim();
  }

  // Se encontrou seção do plano não vazia
  if (secaoPlano && secaoPlano.length >= 5) {
    if (/conduta\s+e\s+prescri[çc][ãa]o\s+a\s+definir/i.test(secaoPlano)) {
      return null;
    }
    return secaoPlano;
  }

  // Se o próprio texto contiver fármacos detectáveis pela base clínica
  if (typeof extrairFarmacosDoTexto === "function") {
    var farmacos = extrairFarmacosDoTexto(texto);
    if (farmacos && farmacos.length > 0) {
      return texto;
    }
  }

  return null;
}

function montarDadosPlanoParaPrescricao(textoSoap, planoExtraido) {
  if (!planoExtraido) return "";
  var texto = String(textoSoap || "");
  var infoPaciente = [];

  // Extrair Idade, Peso e Alergias do Subjetivo se presente
  var matchSubj = texto.match(/(?:👤\s*\*?S\s*[-–—:]\s*Subjetivo\*?|\[S\s*[-–—:]\s*SUBJETIVO\]|\bSUBJETIVO\s*:?)([\s\S]*?)(?=\n\s*(?:🔍|🧠|📋|\[?[OAP]\s*[-–—:]|$))/i);
  if (matchSubj && matchSubj[1]) {
    var txtS = matchSubj[1].replace(/[*_#`]/g, " ").trim();
    var pPeso = txtS.match(/\b\d+(?:[.,]\d+)?\s*kg\b/i);
    var pIdade = txtS.match(/\b\d+\s*(?:anos?|meses?|m|a|dias?)\b/i);
    var pAlergia = txtS.match(/\b(?:alergia|al[eé]rgic[ao])[^\n.,;]*/i);
    if (pIdade) infoPaciente.push(pIdade[0]);
    if (pPeso) infoPaciente.push(pPeso[0]);
    if (pAlergia) infoPaciente.push(pAlergia[0]);
  }

  // Extrair Diagnóstico da Avaliação se presente
  var matchAval = texto.match(/(?:🧠\s*\*?A\s*[-–—:]\s*Avalia[çc][ãa]o\*?|\[A\s*[-–—:]\s*AVALIA[ÇC][ÃA]O\]|\bAVALIA[ÇC][ÃA]O\s*:?)([\s\S]*?)(?=\n\s*(?:📋|\[?P\s*[-–—:]|$))/i);
  var diag = "";
  if (matchAval && matchAval[1]) {
    var txtA = matchAval[1].replace(/[*_#`]/g, " ").trim().split("\n")[0];
    if (txtA && !/a definir/i.test(txtA)) {
      diag = txtA.replace(/^[-•*]\s*/, "").trim();
    }
  }

  var cabecalho = "";
  if (infoPaciente.length > 0 || diag) {
    var partes = [];
    if (infoPaciente.length > 0) partes.push("Paciente: " + infoPaciente.join(", "));
    if (diag) partes.push("Diagnóstico: " + diag);
    cabecalho = partes.join(" | ") + "\n\nPrescrição indicada no plano clínico:\n";
  }

  return cabecalho + planoExtraido;
}

function executarExtracaoReceitaSoap(chatId, cacheKey, messageId) {
  var cache = (typeof CacheService !== "undefined" && CacheService.getScriptCache)
    ? CacheService.getScriptCache()
    : (typeof uxCache === "function" ? uxCache() : null);

  var textoSoap = null;
  if (cache && cacheKey) {
    try { textoSoap = cache.get(cacheKey); } catch (e) {}
  }

  if (!textoSoap && typeof modoBot === "function") {
    var est = modoBot(chatId);
    if (est && est.data) textoSoap = est.data;
  }

  if (!textoSoap && cache) {
    try { textoSoap = cache.get("ctx_" + chatId); } catch (e) {}
  }

  if (!textoSoap && typeof PersistenciaBot !== "undefined" && typeof PersistenciaBot.ler === "function") {
    try {
      var rawView = PersistenciaBot.ler("soapview_" + chatId);
      if (rawView) {
        var objView = typeof rawView === "string" ? JSON.parse(rawView) : rawView;
        if (objView && objView.texto) textoSoap = objView.texto;
      }
    } catch (e) {}
  }

  if (!textoSoap || !textoSoap.trim()) {
    enviarMensagemParaChat(chatId, "⚠️ Nenhum plano terapêutico disponível para extrair receita.");
    return true;
  }

  var planoExtraido = extrairPlanoDeTextoSoap(textoSoap);
  if (!planoExtraido || !planoExtraido.trim()) {
    enviarMensagemParaChat(chatId, "⚠️ Nenhum plano terapêutico disponível para extrair receita.");
    return true;
  }

  var dadosPlano = montarDadosPlanoParaPrescricao(textoSoap, planoExtraido);
  var fnGeradora = (typeof gerarPrescricaoComIA === "function") ? gerarPrescricaoComIA : function(d) { return d; };
  return processarEEntregarIA(chatId, fnGeradora, dadosPlano, "rx");
}

/* ========== Callbacks ========== */

function tratarCallbackUX(cb) {
  var data = String(cb.data || '');
  if (data.indexOf('ux:') !== 0) return false;
  var chat = cb.message.chat.id, msgId = cb.message.message_id, cache = uxCache();
  try { responderCallbackTelegram(cb.id, ''); } catch (e) { console.error('answerCallbackQuery: ' + e); }

  var acaoSoap = data.match(/^ux:soap:(plano|ef_normal|atualizar)(?::([^:]+))?$/);
  if (acaoSoap) {
    var atualSoap = modoBot(chat);
    if (!atualSoap || !acaoSoap[2] || acaoSoap[2] !== atualSoap.revision) {
      enviarMensagemParaChat(chat, 'Este botão pertence a uma versão anterior ou indisponível do atendimento. Envie os dados pelo modo SOAP atual para obter uma resposta atualizada.');
      return true;
    }
    data = 'ux:soap:' + acaoSoap[1];
  }
  var p = data.split(':'), op = p[1], v = p.slice(2).join(':');
  var texto = function (t) { return processarMensagemTexto({ chat: { id: chat }, text: t }); };

  try {
    if (op === 'invalido') {
      enviarMensagemParaChat(chat, 'Botão indisponível. Reabra o menu e tente novamente.');
    } else if (op === 'menu' || (op === 'hub' && v === 'inicio')) {
      enviarHubPrincipal(chat, msgId);
    } else if (op === 'hub') {
      if (v === 'sala') {
        enviarMenuSalaVermelha(chat, msgId);
      } else if (v === 'enf') {
        enviarMenuEnfermaria(chat, msgId);
      } else if (v === 'amb') {
        enviarMenuAmbulatorio(chat, msgId);
      } else if (v === 'bolso') {
        enviarMenuConsultasBolso(chat, msgId);
      } else if (v === 'rx') {
        iniciarModoBot(chat, 'rx', false, msgId);
      } else if (v === 'calc') {
        enviarMenuUXCalculadoras(chat, msgId);
      } else if (v === 'soap') {
        iniciarModoBot(chat, 'soap', true, msgId);
      } else if (v === 'sbar') {
        texto('/passagem');
      } else if (v === 'rotina') {
        enviarRotinaBot(chat, msgId);
      } else if (v === 'manual') {
        texto('/manual');
      }
    } else if (op === 'enf') {
      if (v === 'clcr') return enviarTelaEnfClearance(chat, msgId);
      else if (v === 'ajuste') return enviarTelaEnfAjusteATB(chat, msgId);
      else if (v === 'hidratacao') return enviarTelaEnfHidratacao(chat, msgId);
      else if (v === 'rxh') return enviarTelaEnfPrescricaoHosp(chat, msgId);
      else if (v === 'sbar') return enviarTelaEnfSBAR(chat, msgId);
      else if (v === 'sintomaticos') {
        var msgSint = "💊 *SINTOMÁTICOS HOSPITALARES / SOS (ENFERMARIA)*\n\n" +
          "Prescrição rápida padronizada para intercorrências comuns:\n\n" +
          "1. *Dipirona 1g EV* em 100 mL SF 0,9% correr em 20 min de 6/6h se dor ou febre (Tax ≥ 37,8°C)\n" +
          "2. *Ondansetrona 8mg EV* diluída em 20 mL SF 0,9% até de 8/8h se náuseas ou vômitos\n" +
          "3. *Metoclopramida 10mg EV* lento em 2 min (alternativa; evitar se distúrbio extrapiramidal ou Parkinson)\n" +
          "4. *Omeprazol 40mg EV 1x/dia* pela manhã (apenas se critérios formais de profilaxia de úlcera de estresse)\n" +
          "5. *Simeticona 75mg (30 gotas) VO* até de 8/8h se distensão abdominal ou gases\n\n" +
          "⚠️ *Segurança Beira-Leito:*\n" +
          "• Conferir alergia prévia a dipirona/pirazolonas.\n" +
          "• Em ClCr < 30 mL/min, reavaliar dose ou intervalo de analgésicos e antieméticos.";
        var ckSint = Utilities.getUuid().replace(/-/g, "");
        safePutCache(cache, ckSint, msgSint, 21600);
        return enviarTelaBot(chat, msgSint, botoesBot([
          [['📋 Copiar para Prontuário', 'ux:copiar:' + ckSint]],
          [['🔙 Enfermaria', 'ux:hub:enf'], ['🏠 Início', 'ux:hub:inicio']]
        ]), msgId);
      }
      else return enviarMenuEnfermaria(chat, msgId);
    } else if (op === 'atb') {
      if (v === 'mero25') texto('/atb meropenem clcr 25');
      else if (v === 'tazo30') texto('/atb pip-tazo clcr 30');
      else if (v === 'cefepimehd') texto('/atb cefepime hd');
      else if (v === 'vanco40') texto('/atb vanco 40');
      else texto('/atb ' + v);
    } else if (op === 'hol') {
      if (v === '8kg') texto('/holliday 8kg');
      else if (v === '11kg_bva') texto('/holliday 11kg bronquiolite');
      else texto('/holliday ' + v);
    } else if (op === 'rxh') {
      if (v === 'exemplo_pac') texto('/rxh Paciente 68a, 70kg, Cr 1.8, internado por PAC grave em enfermaria, HAS e DM2');
      else texto('/rxh ' + v);
    } else if (op === 'amb') {
      if (v === 'soap') iniciarModoBot(chat, 'soap', true, msgId);
      else if (v === 'remume') texto('/rx');
      else if (v === 'cid') texto('/cid');
      else if (v === 'atestado') texto('/atestado');
      else enviarMenuAmbulatorio(chat, msgId);
    } else if (op === 'bolso') {
      if (v === 'atb') texto('/atb');
      else if (v === 'ped') texto('/ped');
      else if (v === 'gestacao') texto('/prenatal');
      else if (v === 'interacao') texto('/interacao');
      else if (v === 'hsl') {
        var msgHsl = "💉 *DILUIÇÃO & PREPARO RÁPIDO (GUIA HSL)*\n\n" +
          "Para consultar a diluição, tempo de infusão, via e estabilidade de qualquer fármaco injetável:\n\n" +
          "💡 *Envie por texto:* `como diluir ceftriaxona` ou `preparo noradrenalina` ou `/dose ceftriaxona`";
        if (typeof enviarMensagemComTecladoParaChat === "function" && typeof obterBotoesNavegacaoPadrao === "function") {
          enviarMensagemComTecladoParaChat(chat, msgHsl, obterBotoesNavegacaoPadrao());
        } else {
          enviarMensagemParaChat(chat, msgHsl);
        }
      } else enviarMenuConsultasBolso(chat, msgId);
    } else if (op === 'emerg') {
      if (v === 'choque') texto('/choque');
      else if (v === 'glasgow') texto('/glasgow');
      else if (v === 'crisehas') texto('/crisehipertensiva');
      else if (v === 'dengue') texto('/dengue');
      else if (v === 'cefaleia') texto('/cefaleia');
      else if (v === 'arritmia') texto('/arritmia');
      else enviarMenuSalaVermelha(chat, msgId);
    } else if (op === 'gaso') {
      if (v.indexOf('pre:') === 0) {
        var idCasoG = v.replace('pre:', '');
        if (typeof GasometriaAcidoBaseService !== 'undefined' && typeof GasometriaAcidoBaseService.obterExemploGasometriaPredefinido === 'function') {
          var casoGaso = GasometriaAcidoBaseService.obterExemploGasometriaPredefinido(idCasoG);
          if (casoGaso) {
            texto('/gaso ' + casoGaso.texto);
            return true;
          }
        }
        texto('/gaso');
        return true;
      } else if (v === 'winter') {
        texto('/winter');
        return true;
      } else if (v.indexOf('winter:calc:') === 0) {
        var hco3W = v.replace('winter:calc:', '');
        texto('/winter ' + hco3W);
        return true;
      } else {
        texto('/gaso');
        return true;
      }
    } else if (op === 'novo') {
      iniciarModoBot(chat, v, true, msgId);
    } else if (op === 'iniciar') {
      iniciarModoBot(chat, v, false, msgId);
    } else if (op === 'usar') {
      if (!UX_NOMES_MODO[v]) { enviarMensagemParaChat(chat, 'Modo desconhecido.'); return true; }
      var anterior = modoBot(chat), legacy = cache.get('ctx_' + chat);
      var dados = (anterior && anterior.data) ? anterior.data : String(legacy || '');
      definirModoBot(chat, v, dados);
      enviarTelaBot(chat, '*' + UX_NOMES_MODO[v] + '*\n\nDados do caso atual mantidos. Envie a próxima informação.',
        botoesBot([[['Encerrar', 'ux:cancelar']]]), msgId);
    } else if (op === 'manter') {
      cache.remove('pending_' + chat);
      enviarTelaBot(chat, 'Caso atual mantido.', botoesBot([]), msgId);
    } else if (op === 'cancelar') {
      texto('/cancelar');
    } else if (op === 'soap') {
      if (v === 'plano') {
        var estadoAtual = modoBot(chat), legSoap = cache.get('ctx_' + chat);
        var dadosSoap = (estadoAtual && estadoAtual.data) ? estadoAtual.data : String(legSoap || '');
        if (!dadosSoap || dadosSoap.trim().length < 5) {
          enviarMensagemParaChat(chat, '🩺 Nenhum caso ativo para gerar Avaliação e Plano. Envie os dados do caso primeiro.');
          return true;
        }
        enviarMensagemParaChat(chat, '📋 *Consolidando anamnese, exame físico e gerando Avaliação e Plano...*');
        return processarEEntregarIA(chat, function(d) { return gerarSOAPComIA(d, { fecharPlano: true }); }, dadosSoap, "soap", msgId);
      } else if (v === 'ef_normal' || v.indexOf('ef_confirmar:') === 0 || v.indexOf('ef_cancelar:') === 0) {
        var estNorm = modoBot(chat);
        var dadosNorm = (estNorm && estNorm.data) ? estNorm.data : String(cache.get('ctx_' + chat) || '');
        if (v === 'ef_normal') {
          if (!dadosNorm.trim()) {
            enviarMensagemParaChat(chat, 'Nenhum caso ativo. Envie os dados antes de registrar o exame físico.');
            return true;
          }
          var idConfirmacao = Utilities.getUuid().replace(/-/g, '');
          var confirmacao = { id: idConfirmacao, dados: dadosNorm, estado: JSON.stringify(estNorm), expires: Date.now() + 300000 };
          safePutCache(cache, 'efconfirm_' + chat, JSON.stringify(confirmacao), 300);
          return enviarMensagemComTecladoParaChat(chat,
            '*Confirmar exame físico normal*\n\nVocê confirma que realizou o exame físico geral e segmentar completo e que ele estava sem alterações? Essa informação será acrescentada ao caso atual.',
            botoesBot([
              [['Confirmar registro', 'ux:soap:ef_confirmar:' + idConfirmacao]],
              [['Cancelar', 'ux:soap:ef_cancelar:' + idConfirmacao]]
            ]));
        }
        var pendenteEf = cache.get('efconfirm_' + chat);
        var confirmEf = pendenteEf ? JSON.parse(pendenteEf) : null;
        var idEf = v.split(':')[1];
        if (!confirmEf || confirmEf.id !== idEf) {
          enviarMensagemParaChat(chat, 'Confirmação indisponível. Reabra a ação no SOAP atual.');
          return true;
        }
        cache.remove('efconfirm_' + chat);
        if (v.indexOf('ef_cancelar:') === 0) {
          return enviarTelaBot(chat, 'Registro cancelado. O caso foi mantido.', botoesBot([]), msgId);
        }
        if (confirmEf.expires < Date.now() || confirmEf.dados !== dadosNorm || confirmEf.estado !== JSON.stringify(estNorm)) {
          enviarMensagemParaChat(chat, 'O caso mudou ou a confirmação expirou. Confira o SOAP atual antes de registrar o exame.');
          return true;
        }
        var modeloEfTexto = (typeof obterModeloExameFisicoCompleto === 'function')
          ? obterModeloExameFisicoCompleto(dadosNorm)
          : (typeof SoapAmbulatorialService !== 'undefined' && SoapAmbulatorialService.MODELOS_EXAME_FISICO ? SoapAmbulatorialService.MODELOS_EXAME_FISICO.padrao_completo.texto : 'Sinais Vitais: PA: [   ] mmHg | FC: [   ] bpm | FR: [   ] irpm | SpO2: [   ]% em ar ambiente | T: [   ]°C.\nBom estado geral, lúcido e orientado no tempo e espaço, corado, hidratado, anictérico, acianótico, afebril ao toque, eupneico em ar ambiente.\n  ACV: Ritmo cardíaco regular em 2 tempos, bulhas normofonéticas, sem sopros. Pulsos radiais amplos, cheios e simétricos bilateralmente.\n  AR: Murmúrio vesicular globalmente presente, sem ruídos adventícios. Expansibilidade torácica preservada bilateralmente. Eupneico em ar ambiente.\n  Abdome: Plano, flácido, indolor à palpação superficial e profunda. RHA normoativos. Sem massas ou visceromegalias.\n Extremidades: Sem edema de membros inferiores. Panturrilhas livres sem empastamento. TEC < 3 segundos.');
        dadosNorm += '\n\n' + modeloEfTexto;
        definirModoBot(chat, 'soap', dadosNorm);
        safePutCache(cache, 'ctx_' + chat, dadosNorm, UX_TTL_SEG);
        return processarEEntregarIA(chat, function(d) { return gerarSOAPComIA(d, { fecharPlano: false }); }, dadosNorm, "soap", msgId);
      } else if (v === 'atualizar') {
        enviarMensagemParaChat(chat, '🩺 *Modo SOAP Ativo*\nEnvie novos dados ou atualizações (por áudio ou texto) ou clique em [📋 Gerar Avaliação & Plano].');
        return true;
      } else if (v.indexOf('extrair_rx') === 0) {
        var ckRx = v.indexOf('extrair_rx:') === 0 ? v.replace(/^extrair_rx:/, '').trim() : '';
        return executarExtracaoReceitaSoap(chat, ckRx, msgId);
      }
    } else if (op === 'ef_inc') {
      var estInc = modoBot(chat), legInc = cache.get('ctx_' + chat);
      var dadosInc = (estInc && estInc.data) ? estInc.data : String(legInc || '');
      if (!dadosInc || dadosInc.trim().length < 5) {
        enviarMensagemParaChat(chat, '🩺 Nenhum caso SOAP ativo para incorporar o exame. Inicie um caso primeiro.');
        return true;
      }
      var guiaTexto = typeof gerarGuiaExameFisicoEspecial === 'function' ? gerarGuiaExameFisicoEspecial(v, '') : '';
      var blocoMatch = String(guiaTexto).match(/```(?:text)?\n([\s\S]*?)```/);
      var modeloLimpo = blocoMatch ? blocoMatch[1].trim() : guiaTexto.replace(/[*_`#]/g, '').trim();
      dadosInc += '\n\n' + modeloLimpo;
      definirModoBot(chat, 'soap', dadosInc);
      safePutCache(cache, 'ctx_' + chat, dadosInc, UX_TTL_SEG);
      enviarMensagemParaChat(chat, '🩺 *Exame especial (' + v.toUpperCase() + ') incorporado ao SOAP.* Atualizando rascunho...');
      return processarEEntregarIA(chat, function(d) { return gerarSOAPComIA(d, { fecharPlano: false }); }, dadosInc, "soap");
    } else if (op === 'img_inc') {
      var laudoTextoUx = cache.get(v);
      if (!laudoTextoUx) {
        enviarMensagemParaChat(chat, '⚠️ Laudo expirado do cache.');
        return true;
      }
      var estImg = modoBot(chat), legImg = cache.get('ctx_' + chat);
      var dadosImg = (estImg && estImg.data) ? estImg.data : String(legImg || '');
      var novoCasoImg = '';
      if (dadosImg && dadosImg.trim().length > 5 && dadosImg.indexOf(laudoTextoUx.trim()) === -1) {
        novoCasoImg = dadosImg.trim() + '\n\n📸 *EXAME COMPLEMENTAR INCORPORADO (LAUDO):*\n' + laudoTextoUx.trim();
        enviarMensagemParaChat(chat, '🩺 *Laudo incorporado ao caso clínico ativo.* Atualizando prontuário...');
      } else {
        novoCasoImg = 'Paciente com exame complementar anexado.\n\n📸 *ACHADOS DO EXAME (LAUDO):*\n' + laudoTextoUx.trim();
        enviarMensagemParaChat(chat, '🩺 *Novo caso SOAP iniciado a partir da imagem.* Estruturando anamnese e exame...');
      }
      definirModoBot(chat, 'soap', novoCasoImg);
      safePutCache(cache, 'ctx_' + chat, novoCasoImg, UX_TTL_SEG);
      return processarEEntregarIA(chat, function(d) { return gerarSOAPComIA(d, { fecharPlano: false }); }, novoCasoImg, "soap");
    } else if (op === 'rotina') {
      if (v === 'go') {
        enviarMenuGinecologiaObstetricia(chat, msgId);
      } else if (v === 'preventivo') {
        texto('/preventivo');
      } else {
        if (typeof ehUsuarioTitular === 'function' && !ehUsuarioTitular(chat)) {
          enviarMensagemParaChat(chat, '🔒 *Recurso Restrito ao Titular*\n\nEste recurso (Notion, Agenda e Rotina pessoal) é exclusivo do administrador da conta.\n\n💡 Use o /menu para acessar calculadoras, condutas e guias clínicos.');
          return true;
        }
        if (v === 'duvida') {
          enviarMensagemParaChat(chat, '🧠 *Dúvida MedQuest*\n\nEnvie: `/duvida seu tema`');
        } else if (v === 'agenda_amanha') {
          texto('/agenda amanha');
        } else {
          texto('/' + v);
        }
      }
    } else if (op === 'sala') {
      enviarMenuSalaVermelha(chat, msgId);
    } else if (op === 'dvamenu') {
      enviarMenuDva(chat, msgId);
    } else if (op === 'fixa') {
      if (!UX_DROGAS_FIXAS[v]) enviarMensagemParaChat(chat, 'Medicamento desconhecido.');
      else texto('/dva ' + v);
    } else if (op === 'droga') {
      if (!UX_DROGAS[v]) { enviarMensagemParaChat(chat, 'Medicamento desconhecido.'); return true; }
      aguardarPesoDva(chat, v);
      enviarTelaPesoDva(chat, v, msgId);
    } else if (op === 'peso') {
      var pp = v.split(':'), drogaP = pp[0], pesoP = sanitizarEValidarPesoKg(pp[1]);
      if (!UX_DROGAS[drogaP] || pesoP === null) { enviarMensagemParaChat(chat, 'Peso inválido. Informe o peso em kg.'); return true; }
      cache.remove('dvaw_' + chat);
      enviarTelaDiluicaoDva(chat, drogaP, pesoP, msgId);
    } else if (op === 'diluicao') {
      var pd = v.split(':');
      if (pd.length < 3) { enviarMensagemParaChat(chat, 'Botão antigo. Reabra a droga em Sala Vermelha.'); return true; }
      var pesoD = sanitizarEValidarPesoKg(pd[1]);
      if (!UX_DROGAS[pd[0]] || pesoD === null || !UX_DILUICOES[pd[2]]) { enviarMensagemParaChat(chat, 'Dados do cálculo inválidos. Reabra a droga.'); return true; }
      texto('/dva ' + pd[0] + ' ' + pesoD + ' ' + pd[2]);
    } else if (op === 'srimenu') {
      enviarMenuSri(chat, msgId);
    } else if (op === 'sri') {
      texto('/sri ' + v);
    } else if (op === 'condutamenu') {
      enviarMenuCondutas(chat, msgId);
    } else if (op === 'conduta') {
      if (v === 'pcr') {
        if (typeof tratarComandoPcr === 'function') return tratarComandoPcr(chat, '');
      }
      var telaDet = (typeof enviarTelaCondutaEmergencia === 'function') ? enviarTelaCondutaEmergencia(chat, v, msgId) : null;
      if (telaDet) return telaDet;
      texto('/conduta ' + (UX_CONDUTAS[v] || v));
    } else if (op === 'painel') {
      enviarPainelEnfermaria(chat, v, msgId);
    } else if (op === 'leito') {
      uxTelaLeito(chat, v, msgId);
    } else if (op === 'status') {
      var ps = v.split(':'), numL = ps[0], tipo = ps[1], versaoEsp = ps[2];
      if (UX_STATUS_LEITO.indexOf(tipo) === -1) { enviarMensagemParaChat(chat, 'Status inválido.'); return true; }
      if (!versaoEsp) {
        enviarMensagemParaChat(chat, 'Este botão de status pertence a uma mensagem anterior ou a outro paciente. Abra o leito novamente.');
        return true;
      }
      var rSt = EnfermariaService.atualizarStatusLeito(numL, tipo, versaoEsp);
      if (rSt.sucesso) uxTelaLeito(chat, numL, msgId, rSt.mensagem);
      else enviarMensagemParaChat(chat, rSt.erro || rSt.mensagem);
    } else if (op === 'evoluir') {
      aguardarEvolucaoLeito(chat, v);
      enviarMensagemParaChat(chat, 'Envie a nova evolução do leito ' + v + ' por texto ou áudio. A versão anterior ficará registrada no histórico.');
    } else if (op === 'confirmar') {
      confirmarAltaBot(chat, v);
    } else if (op === 'alta') {
      var rawAlta = cache.get('alta_' + v);
      if (!rawAlta) { enviarMensagemParaChat(chat, 'Confirmação expirada. Abra o leito novamente.'); return true; }
      var a = JSON.parse(rawAlta);
      if (a.chat !== String(chat)) { enviarMensagemParaChat(chat, 'Confirmação inválida para este chat.'); return true; }
      var result = EnfermariaService.desocuparLeito(a.id, a.version);
      cache.remove('alta_' + v);
      enviarMensagemParaChat(chat, result.mensagem);
    } else if (op === 'recalc') {
      var partesRecalc = v.split(':');
      var tipoRecalc = partesRecalc[0];
      var chaveCasoRecalc = partesRecalc.slice(1).join(':');
      if (tipoRecalc === 'peso') {
        safePutCache(cache, 'recalc_ck_' + chat, chaveCasoRecalc, 600);
        var txtRecalc = '⚖️ *RECALCULAR POR PESO DO PACIENTE*\n\n' +
          'Selecione um peso de referência rápida ou envie o peso exato em kg (ex: `68` ou `73,5`):\n\n' +
          '_O cálculo posológico e as diluições serão atualizados imediatamente._';
        var rPesos = [
          [['50 kg', 'ux:recalc_val:50:' + chaveCasoRecalc], ['60 kg', 'ux:recalc_val:60:' + chaveCasoRecalc]],
          [['70 kg', 'ux:recalc_val:70:' + chaveCasoRecalc], ['80 kg', 'ux:recalc_val:80:' + chaveCasoRecalc]],
          [['90 kg', 'ux:recalc_val:90:' + chaveCasoRecalc], ['100 kg', 'ux:recalc_val:100:' + chaveCasoRecalc]],
          [['🔙 Voltar ao Menu', 'ux:menu'], ['🏠 Início', 'ux:hub:inicio']]
        ];
        return enviarTelaBot(chat, txtRecalc, botoesBot(rPesos), msgId);
      }
    } else if (op === 'recalc_val') {
      var partesVal = v.split(':');
      var novoPesoStr = partesVal[0];
      var chaveOrig = partesVal.slice(1).join(':');
      var nPeso = sanitizarEValidarPesoKg(novoPesoStr);
      if (nPeso === null) {
        enviarMensagemParaChat(chat, 'Peso inválido para recálculo.');
        return true;
      }
      cache.remove('recalc_ck_' + chat);
      var casoOrig = cache.get(chaveOrig) || obterContextoClinicoBot(chat);
      if (!casoOrig) {
        enviarMensagemParaChat(chat, '⚠️ Caso original expirado do cache. Envie novamente os dados do paciente com o novo peso.');
        return true;
      }
      var textoComNovoPeso;
      if (/\b\d+(?:[.,]\d+)?\s*kg\b/i.test(casoOrig)) {
        textoComNovoPeso = casoOrig.replace(/\b\d+(?:[.,]\d+)?\s*kg\b/i, nPeso + ' kg');
      } else {
        textoComNovoPeso = 'Paciente ' + nPeso + ' kg. ' + casoOrig;
      }
      enviarMensagemParaChat(chat, '🔄 *Recalculando conduta e doses para paciente de ' + nPeso + ' kg...*');
      return processarMensagemTexto({ chat: { id: chat }, text: textoComNovoPeso });
    } else if (op === 'interacao') {
      var chaveInteracao = v.replace(/^caso:/, '');
      var textoInteracao = cache.get(chaveInteracao) || obterContextoClinicoBot(chat);
      if (!textoInteracao) {
        enviarMensagemParaChat(chat, '⚠️ Caso não encontrado ou expirado para checagem de interações.');
        return true;
      }
      enviarMensagemParaChat(chat, '⚠️ *Analisando potenciais interações farmacológicas e segurança clínica...*');
      return processarMensagemTexto({ chat: { id: chat }, text: '/interacao ' + textoInteracao });
    } else if (op === 'detalhes' || op === 'copiar' || op === 'pdf') {
      var raw = cache.get(v);
      if (!raw) { enviarMensagemParaChat(chat, 'Resultado expirado. Gere novamente com os dados do caso.'); return true; }
      if (op === 'pdf') ReceitaPdfService.processarEEnviarPdf(chat, raw);
      else if (op === 'copiar') uxDividirTexto(uxTextoProntuario(raw), 3800).forEach(function (parte) { enviarMensagemParaChat(chat, parte); });
      else enviarMensagemParaChat(chat, raw);
    } else {
      enviarMensagemParaChat(chat, 'Ação não reconhecida. Reabra o menu.');
    }
  } catch (e) {
    console.error('tratarCallbackUX [' + data + ']: ' + ((e && e.stack) || e));
    try { enviarMensagemParaChat(chat, 'Não consegui concluir essa ação. Tente novamente ou use /cancelar.'); } catch (e2) {}
  }
  return true;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    botoesBot: botoesBot,
    enviarTelaBot: enviarTelaBot,
    modoBot: modoBot,
    definirModoBot: definirModoBot,
    limparEstadoBot: limparEstadoBot,
    iniciarModoBot: iniciarModoBot,
    enviarMenuSalaVermelha: enviarMenuSalaVermelha,
    enviarMenuDva: enviarMenuDva,
    enviarTelaPesoDva: enviarTelaPesoDva,
    enviarTelaDiluicaoDva: enviarTelaDiluicaoDva,
    enviarMenuSri: enviarMenuSri,
    enviarMenuCondutas: enviarMenuCondutas,
    obterTextoCondutaEmergencia: obterTextoCondutaEmergencia,
    enviarTelaCondutaEmergencia: enviarTelaCondutaEmergencia,
    enviarMenuUXCalculadoras: enviarMenuUXCalculadoras,
    enviarRotinaBot: enviarRotinaBot,
    enviarPainelEnfermaria: enviarPainelEnfermaria,
    confirmarAltaBot: confirmarAltaBot,
    uxTextoProntuario: uxTextoProntuario,
    enviarHubPrincipal: enviarHubPrincipal,
    enviarMenuAmbulatorio: enviarMenuAmbulatorio,
    enviarMenuConsultasBolso: enviarMenuConsultasBolso,
    enviarMenuEnfermaria: enviarMenuEnfermaria,
    enviarMenuGinecologiaObstetricia: enviarMenuGinecologiaObstetricia,
    tratarEntradaUX: tratarEntradaUX,
    tratarCallbackUX: tratarCallbackUX,
    extrairPlanoDeTextoSoap: extrairPlanoDeTextoSoap,
    executarExtracaoReceitaSoap: executarExtracaoReceitaSoap
  };
}
