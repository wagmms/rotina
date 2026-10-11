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

  var botoesModo;
  if (mode === 'gaso' && typeof GasometriaAcidoBaseService !== 'undefined' && typeof GasometriaAcidoBaseService.obterTecladoInlineGasometria === 'function') {
    botoesModo = GasometriaAcidoBaseService.obterTecladoInlineGasometria('inicial');
  } else if (mode === 'soap') {
    botoesModo = botoesBot([
      [['🩺 Exemplo HAS', 'ux:amb:soap:has'], ['🩸 Exemplo DM2', 'ux:amb:soap:dm2']],
      [['🔙 Ambulatório', 'ux:hub:amb'], ['🏠 Início', 'ux:hub:inicio']],
      [['Encerrar', 'ux:cancelar']]
    ]);
  } else {
    botoesModo = botoesBot([[['Encerrar', 'ux:cancelar']]]);
  }

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
  if (k === 'dengue_c') {
    return "🦟 *EMERGÊNCIA: DENGUE COM SINAIS DE ALARME (GRUPO C — MS 2024)*\n\n" +
      "🔴 *INDICAÇÃO & VIGILÂNCIA:*\n" +
      "• Sinais de alarme: dor abdominal intensa, vômitos persistentes, lipotimia, acúmulo de líquidos, hepatomegalia > 2cm, hemoconcentração.\n" +
      "• Leito de observação / internação hospitalar imediato.\n\n" +
      "💧 *RESSUSCITAÇÃO VOLÊMICA VENOSA (ETAPA 1 — 2 HORAS):*\n" +
      "• *SF 0,9% ou Ringer Lactato:* *10 mL/kg/h EV* nas primeiras 2 horas (ex: 700 mL/h para paciente de 70 kg; total em 2h = 1.400 mL).\n" +
      "• Reavaliar hematócrito e sinais vitais ao término das 2 horas.\n\n" +
      "🟡 *FASE DE MANUTENÇÃO (ETAPA 2 — 6 HORAS):*\n" +
      "• Se melhora clínica e hematócrito estável: reduzir para 25 mL/kg em 6 horas (~290 mL/h para 70 kg).\n" +
      "• Etapa 3 (se mantida estabilidade): 25 mL/kg em 8 horas (~220 mL/h para 70 kg).\n\n" +
      "⛔ *CONTRAINDICAÇÃO ABSOLUTA:* AINEs e AAS (risco de hemorragia grave e óbito).\n" +
      "💊 *Sintomáticos:* Dipirona 1g EV ou Paracetamol 750mg VO até de 6/6h.";
  }
  if (k === 'dengue_d') {
    return "🚨 *EMERGÊNCIA CRÍTICA: DENGUE GRAVE / CHOQUE HIPOVOLÊMICO (GRUPO D — MS 2024)*\n\n" +
      "🔴 *SINAIS DE CHOQUE / SALA VERMELHA IMEDIATA:*\n" +
      "• Hipotensão (PAS < 90 ou PAM < 65), pressão de pulso convergente (≤ 20 mmHg), pulso fino, TEC > 2s, extremidades frias, oligúria.\n\n" +
      "⚡ *EXPANSÃO RÁPIDA EM BOLUS (ETAPA 1 — 20 MINUTOS):*\n" +
      "• *SF 0,9% ou Ringer Lactato:* *20 mL/kg EV aberto em 20 minutos* (ex: 1.400 mL em 20 min para 70 kg).\n" +
      "• Se choque persistir após 20 min: *repetir bolus de 20 mL/kg em 20 min* (até 3 vezes — máx 60 mL/kg).\n" +
      "• Se refratário a 60 mL/kg: investigar sangramento oculto (hemoterapia/concentrado de hemácias) ou iniciar Noradrenalina IV.\n\n" +
      "⚠️ *SEGURANÇA BEIRA-LEITO:*\n" +
      "• Ausculta pulmonar contínua para prevenir sobrecarga hídrica após restauração hemodinâmica.\n" +
      "• Coleta imediata de hemograma, coagulograma, tipagem sanguínea, transaminases e gasometria.";
  }
  if (k === 'dengue_ab') {
    return "🦟 *MANEJO: DENGUE SEM SINAIS DE ALARME (GRUPOS A E B — MS 2024)*\n\n" +
      "🟢 *GRUPO A (Ambulatorial Puro — Sem comorbidades/risco):*\n" +
      "• *Hidratação Oral Abundante:* 60 mL/kg/dia (1/3 com SRO — Soro de Reidratação Oral e 2/3 com líquidos caseiros/água/sucos).\n" +
      "• Para paciente de 70 kg: ~4.200 mL/dia (1.400 mL de SRO + 2.800 mL de água/líquidos).\n" +
      "• Sintomáticos: Dipirona 500mg a 1g VO até 6/6h ou Paracetamol 500mg a 750mg VO até 6/6h.\n\n" +
      "🟡 *GRUPO B (Condições especiais: gestantes, idosos > 65a, DM, HAS, DRC ou lactentes):*\n" +
      "• Hidratação oral supervisionada na UPA/UBS até resultado de hemograma completo.\n" +
      "• Se hematócrito normal e sem alarme: alta com hidratação 60 mL/kg/dia e reavaliação clínica diária obrigatória.\n\n" +
      "⛔ *CONTRAINDICAÇÃO FORMAL:* AINEs (Ibuprofeno, Cetoprofeno, Nimesulida, Diclofenaco) e AAS.";
  }
  if (k === 'crisehas_emerg') {
    return "🚨 *EMERGÊNCIA HIPERTENSIVA (SALA VERMELHA — SBC / AHA)*\n\n" +
      "🔴 *DEFINIÇÃO:* PA muito elevada (PAS ≥ 180 e/ou PAD ≥ 120 mmHg) com lesão aguda de órgão-alvo (LOA: EAP, Dissecção de Aorta, SCA, AVC, Encefalopatia ou Eclâmpsia).\n\n" +
      "🟡 *METAS PRESSÓRICAS & FÁRMACOS DE 1ª LINHA:*\n" +
      "• *EAP Hipertensivo:* Nitroglicerina IV em BIC (10-20 mcg/min) + Furosemida 20-40 mg IV + VNI precoce (meta: reduzir 20-25% da PAM em 1h).\n" +
      "• *Dissecção Aguda de Aorta:* PAS < 120 mmHg e FC < 60 bpm em 20 min! 1º Betabloqueador IV (Esmolol ou Metoprolol 5mg IV) seguido de Nitroprussiato de Sódio IV.\n" +
      "• *SCA / IAM:* Nitroglicerina IV + Betabloqueador VO precoce + protocolo de SCA.\n" +
      "• *AVC Isquêmico:* Não reduzir PA a menos que PAS > 220 ou PAD > 120 mmHg (ou se elegível para trombólise, meta < 185/110 mmHg com Nitroprussiato ou Labetalol).\n\n" +
      "⛔ *ALERTA DE SEGURANÇA:* NUNCA usar Nifedipino sublingual/ação rápida (risco de AVC e IAM por queda brusca não controlada).";
  }
  if (k === 'crisehas_urg') {
    return "⚡ *URGÊNCIA HIPERTENSIVA (SALA DE OBSERVAÇÃO — SBC / AHA)*\n\n" +
      "🟡 *DEFINIÇÃO:* PA substancialmente elevada (PAS ≥ 180 e/ou PAD ≥ 120 mmHg) SEM lesão aguda de órgão-alvo e sem risco iminente de morte.\n\n" +
      "💊 *CONDUTA FARMACOLÓGICA POR VIA ORAL:*\n" +
      "• *Meta:* Redução gradual e segura da PA ao longo de 24 a 48 horas (meta de PAS 140-160 mmHg e PAD 90-100 mmHg). Evitar quedas abruptas.\n" +
      "• *1ª Linha:* Captopril 25 mg VO (início de ação em 15-30 min; pode repetir em 60 min se necessário).\n" +
      "• *Alternativa:* Clonidina 0,100 mg a 0,200 mg VO (indicada se taquicardia ou componente adrenérgico).\n" +
      "• *Período de Observação:* 2 a 4 horas. Após estabilização e sem sintomas, liberar com encaminhamento para UBS para otimização da terapia anti-hipertensiva crônica.\n\n" +
      "⛔ *PROIBIDO:* Vasodilatadores parenterais e Nifedipino de ação curta.";
  }
  if (k === 'crisehas_pseudo') {
    return "🟢 *PSEUDOCRISE HIPERTENSIVA (REATIVA A DOR, ANSIEDADE OU PÂNICO)*\n\n" +
      "🟢 *DEFINIÇÃO:* Elevação tensional reativa causada por dor aguda, cefaleia tensional, estresse emocional, labirintopatia ou síndrome do pânico, sem lesão de órgão-alvo.\n\n" +
      "🧘 *CONDUTA BEIRA-LEITO (TRATAR O GATILHO):*\n" +
      "• *Repouso:* Deixar o paciente em repouso em sala tranquila e com pouca luz por 30 a 60 minutos.\n" +
      "• *Analgesia se Dor:* Dipirona 1g VO ou IV.\n" +
      "• *Suporte se Ansiedade:* Acalmar o paciente, técnicas de respiração; considerar Diazepam 5-10 mg VO se crise de pânico intensa.\n" +
      "• *Reavaliação:* Reaferir a PA após 40-60 min. Na grande maioria dos casos a pressão normaliza ou cai expressivamente sem qualquer anti-hipertensivo.\n\n" +
      "💡 Se a PA persistir muito elevada após analgesia e repouso: administrar Captopril 25 mg VO.";
  }
  if (k === 'gcs_8') {
    return "🔴 *ESCALA DE GLASGOW ≤ 8: TRAUMA CRANIOENCEFÁLICO GRAVE*\n\n" +
      "🚨 *AÇÃO IMEDIATA BEIRA-LEITO:*\n" +
      "• *Indicação Formal de Via Aérea Definitiva:* Perda de reflexos protetores de via aérea. Preparar Sequência Rápida de Intubação (SRI / IOT) imediatamente!\n" +
      "• *Estabilização de Coluna Cervical:* Manter prancha rígida e colar cervical até exclusão de lesão raquimedular.\n\n" +
      "🧠 *PREVENÇÃO DE LESÃO CEREBRAL SECUNDÁRIA (REGRAS DE OURO):*\n" +
      "• *Evitar Hipóxia:* Manter SpO₂ ≥ 94% e PaO₂ > 80 mmHg.\n" +
      "• *Evitar Hipotensão:* Manter PAS ≥ 100 mmHg (se 50-69 anos) ou ≥ 110 mmHg (se 15-49 anos ou ≥ 70 anos) com cristaloide (SF 0,9%) e Noradrenalina se necessário.\n" +
      "• *Ventilação Protetora:* Normocapnia (PaCO₂ alvo 35-40 mmHg). NUNCA hiperventilar de rotina (risco de isquemia cerebral).\n" +
      "• *Manejo de HIC (se anisocoria ou postura patológica):* Salina Hipertônica 3% (150-250 mL EV em 10-20 min) ou Manitol 20% (0,5 a 1 g/kg EV).\n" +
      "• *Exame Diagnóstico:* TC de crânio sem contraste de emergência após estabilização.";
  }
  if (k === 'gcs_10') {
    return "🟡 *ESCALA DE GLASGOW 9 A 12: TRAUMA CRANIOENCEFÁLICO MODERADO*\n\n" +
      "🟡 *CONDUTA E MONITORIZAÇÃO:*\n" +
      "• *Vigilância Neurológica Estrita:* Escala de Glasgow e reatividade pupilar checadas a cada 30 a 60 minutos.\n" +
      "• *Neuroimagem:* Tomografia Computadorizada (TC) de crânio sem contraste mandatória.\n" +
      "• *Acesso Venoso & Monitorização:* Monitor multiparâmetro contínuo, cabeceira elevada a 30° e jejum.\n" +
      "• *Alerta de Queda de Glasgow:* Queda de ≥ 2 pontos no Glasgow indica deterioração neurológica aguda (hematoma extradural/subdural expansivo): acionar Neurocirurgia e preparar SRI/IOT imediata.\n" +
      "• *Exames Laboratoriais:* Hemograma, coagulograma, sódio, potássio, glicemia e tipagem sanguínea.";
  }
  if (k === 'gcs_14') {
    return "🟢 *ESCALA DE GLASGOW 13 A 15: TRAUMA CRANIOENCEFÁLICO LEVE*\n\n" +
      "🟢 *AVALIAÇÃO & CRITÉRIOS DE TC DE CRÂNIO (CANADIAN CT HEAD RULE):*\n" +
      "• TC de crânio recomendada se qualquer um dos seguintes critérios de alto risco:\n" +
      "  1. Glasgow < 15 após 2 horas do trauma.\n" +
      "  2. Suspeita de fratura de crânio aberta ou com afundamento.\n" +
      "  3. Sinais de fratura de base de crânio (olhos de guaxinim, sinal de Battle, rinorreia/otorreia liquórica, hemotímpano).\n" +
      "  4. Idade ≥ 65 anos.\n" +
      "  5. ≥ 2 episódios de vômitos.\n" +
      "  6. Uso de anticoagulantes ou antiagregantes plaquetários.\n" +
      "• Se sem critérios de risco e Glasgow 15: observação clínica de 4 a 6 horas com orientações escritas de alarme para alta com acompanhante responsável.";
  }
  if (k === 'choque_c') {
    return "🔴 *CHOQUE CARDIOGÊNICO / PERFIL C (FRIO & ÚMIDO — STEVENSON / FORRESTER)*\n\n" +
      "🔴 *DIAGNÓSTICO:* Baixa perfusão periférica (frio, TEC prolongado, oligúria, lactato alto) + Congestão pulmonar e sistêmica (úmido, crepitações, B3, turgência jugular).\n\n" +
      "💉 *CONDUTA FARMACOLÓGICA IMEDIATA:*\n" +
      "• *Se PAS < 85-90 mmHg (Choque Franco):* Iniciar *Noradrenalina IV* em BIC imediatamente (0,1 a 0,5 mcg/kg/min) para restaurar PAM ≥ 65 mmHg e perfusão coronariana.\n" +
      "• *Inotrópico:* Associar *Dobutamina IV* (2,5 a 10 mcg/kg/min) para melhora do débito cardíaco após PAM restaurada.\n" +
      "• *Diurético (Furosemida):* Administrar em baixas doses com extrema cautela somente após garantir PAM ≥ 65 mmHg com vasoativas.\n" +
      "• *VNI:* CPAP com cautela se desconforto respiratório (monitorar queda de débito cardíaco por aumento de pressão intratorácica).\n\n" +
      "⛔ *CONTRAINDICAÇÃO:* Vasodilatadores puros (Tridil/Nipride) enquanto PAS < 90 mmHg. Betabloqueadores contraindicados na fase aguda.";
  }
  if (k === 'choque_b') {
    return "🟡 *IC DESCOMPENSADA PERFIL B (QUENTE & ÚMIDO — STEVENSON / FORRESTER)*\n\n" +
      "🟡 *DIAGNÓSTICO:* Boa perfusão periférica (quente, pulsos cheios, TEC < 2s) + Congestão pulmonar/sistêmica proeminente (úmido, EAP, edema, estertores).\n\n" +
      "💧 *PILAR DO TRATAMENTO (VASODILATAÇÃO + DIURESE):*\n" +
      "• *Vasodilatador Precoce (se PAS ≥ 110 mmHg):* *Nitroglicerina (Tridil) IV* em BIC (iniciar a 10 a 20 mcg/min, titulando a cada 5 min). Reduz pré e pós-carga rapidamente.\n" +
      "• *Diurético de Alça:* *Furosemida 40 a 80 mg IV* em bolus lento (1 a 2x a dose oral de uso habitual).\n" +
      "• *Suporte Respiratório:* CPAP (8-10 cmH2O) ou BiPAP precoce se desconforto respiratório importante.\n" +
      "• *Posicionamento:* Cabeceira elevada a 90° e pernas pendentes.\n\n" +
      "💡 Perfil de melhor prognóstico se tratado rapidamente com vasodilatador venoso e VNI.";
  }
  if (k === 'choque_l') {
    return "🔵 *IC DESCOMPENSADA PERFIL L (FRIO & SECO — HIPOVOLEMIA / SUPERDIURESE)*\n\n" +
      "🔵 *DIAGNÓSTICO:* Baixa perfusão periférica (frio, pulsos finos, oligúria) SEM congestão (seco, sem estertores, sem edema, PVC baixa).\n\n" +
      "💧 *CONDUTA BEIRA-LEITO:*\n" +
      "• *Causa Comum:* Superdiurese com furosemida, desidratação, vômitos/diarreia intercorrentes.\n" +
      "• *Prova de Volume Cautelosa:* SF 0,9% ou Ringer Lactato 250 a 500 mL IV em 30 a 60 minutos sob ausculta pulmonar contínua.\n" +
      "• Se PAS e perfusão melhorarem: suspender diuréticos temporariamente.\n" +
      "• Se persistir hipoperfusão após restauração volêmica: avaliar choque cardiogênico verdadeiro e iniciar Dobutamina ou Noradrenalina.";
  }
  if (k === 'choque_septico') {
    return "💉 *CHOQUE SÉPTICO & PROTOCOLO CIRCI (SURVIVING SEPSIS CAMPAIGN 2021)*\n\n" +
      "🔴 *DEFINIÇÃO:* Sepse com hipotensão persistente necessitando de vasopressor para PAM ≥ 65 mmHg E lactato > 2 mmol/L apesar de ressuscitação volêmica adequada (30 mL/kg).\n\n" +
      "💉 *MANEJO VASOPRESSOR ESCALONADO:*\n" +
      "• *1ª Linha:* *Noradrenalina IV* contínua na BIC (titular para PAM alvo 65 mmHg).\n" +
      "• *2ª Linha (Choque Refratário a Nora ≥ 0,25 mcg/kg/min):* Associar *Vasopressina* na dose fixa de *0,03 UI/min* (20 UI em 100 mL SF a 9 mL/h). Não titular!\n" +
      "• *3ª Linha (CIRCI — Insuficiência Adrenal Relativa):* *Hidrocortisona 200 mg/dia EV* (50 mg EV de 6/6h ou 200 mg em infusão contínua 24h).\n\n" +
      "🔬 *MEDIDAS DO BUNDLE DE 1 HORA:*\n" +
      "• Coletar 2 pares de hemoculturas antes do antibiótico (não atrasar ATB além de 1h se choque).\n" +
      "• Antibioticoterapia de amplo espectro venosa na 1ª hora.\n" +
      "• Dosagem e redosagem seriada de Lactato a cada 2-4h.";
  }
  if (k === 'cef_hsa') {
    return "🚨 *CEFALEIA EM TROVOADA / SUSPEITA DE HEMORRAGIA SUBARACNÓIDEA (HSA)*\n\n" +
      "🔴 *CRITÉRIOS SNOOP (ONSET SÚBITO / THUNDERCLAP):*\n" +
      "• Dor de cabeça que atinge intensidade máxima (10/10) em menos de 1 minuto (\"pior dor de cabeça da vida\").\n\n" +
      "⚡ *PROTOCOLO DIAGNÓSTICO EMERGENCIAL:*\n" +
      "1. *TC de Crânio sem contraste IMEDIATA:* Sensibilidade de ~98% nas primeiras 6 horas; cai significativamente após 24-48 horas.\n" +
      "2. *Punção Lombar (PL) Mandatória:* SE a TC de crânio for NORMAL e o quadro tiver menos de 2 semanas de evolução. Pesquisar xantocromia e contagem de hemácias nos 4 tubos (teste dos 3 tubos).\n\n" +
      "💊 *MANEJO BEIRA-LEITO:*\n" +
      "• Controle pressórico estrito (PAS < 140-160 mmHg com Labetalol ou Nitroprussiato se PAS muito elevada).\n" +
      "• Nimodipino 60 mg VO de 4/4h (prevenção de vasoespasmo e isquemia secundária se HSA confirmada).\n" +
      "• Analgesia venosa e acionamento urgente de Neurocirurgia / Neurorradiologia Intervencionista.";
  }
  if (k === 'cef_mening') {
    return "⚠️ *SUSPEITA DE MENINGITE BACTERIANA AGUDA*\n\n" +
      "🔴 *TRÍADE / SINAIS DE ALARME:* Febre + Cefaleia holocraniana + Rigidez de nuca (sinais de Kernig e Brudzinski).\n\n" +
      "⚡ *AÇÃO IMEDIATA (NÃO ATRASAR ANTIBIÓTICO!):*\n" +
      "• Se NÃO houver sinais de HIC/déficit focal: realizar Punção Lombar (Líquor) imediatamente e iniciar ATB venoso.\n" +
      "• Se houver déficit focal, convulsão recente, papiledema ou imunossupressão: coletar Hemoculturas, iniciar ATB imediatamente e realizar TC de crânio antes da PL.\n\n" +
      "💊 *TERAPIA ANTIMICROBIANA EMPÍRICA (ADULTO PS):*\n" +
      "• *Ceftriaxona:* 2g EV de 12/12h.\n" +
      "• *Dexametasona:* 10 mg EV administrada 15 a 20 minutos ANTES ou junto com a primeira dose de Ceftriaxona (reduz perda auditiva e mortalidade na meningite por pneumococo; manter 10 mg 6/6h por 4 dias se S. pneumoniae confirmado).\n" +
      "• *Se Idade ≥ 50 anos ou imunossuprimido:* Adicionar *Ampicilina 2g EV de 4/4h* para cobertura de Listeria monocytogenes.";
  }
  if (k === 'cef_primaria') {
    return "💊 *PROTOCOLO DE RESGATE: CEFALEIA PRIMÁRIA / ENXAQUECA NO PS*\n\n" +
      "🟢 *ELEGIBILIDADE:* Cefaleia pulsátil/hemicraniana habitual, fotofobia/fonofobia, SEM febre, SEM déficit focal, SEM início em trovoada (SNOOP negativo).\n\n" +
      "💊 *ESQUEMA MULTIMODAL DE RESGATE NO PRONTO SOCORRO:*\n" +
      "1. *Dipirona:* 1g a 2g EV em 100 mL SF 0,9% correr em 15-20 minutos.\n" +
      "2. *Metoclopramida (Plasil):* 10 mg EV lento em 2 minutos (alivia náusea e potencializa analgesia pela ação antidopaminérgica).\n" +
      "3. *Dexametasona:* 10 mg EV lento (reduz taxa de recorrência da cefaleia nas 72 horas seguintes).\n" +
      "4. *Hidratação:* SF 0,9% 500 a 1000 mL EV.\n" +
      "5. *Alternativa / Adjuvante:* Cetoprofeno 100 mg EV ou Clorpromazina 12,5 a 25 mg EV lento se crise refratária.\n\n" +
      "🧘 Ambiente silencioso, escuro e repouso de 60 minutos.";
  }
  if (k === 'cef_arterite') {
    return "👵 *ARTERITE DE CÉLULAS GIGANTES / ARTERITE TEMPORAL*\n\n" +
      "🔴 *INDICAÇÃO:* Paciente ≥ 50 anos com cefaleia de início recente, dor na região temporal, claudicação de mandíbula ao mastigar e/ou alteração visual (amaurose fugaz).\n\n" +
      "⚡ *AÇÃO IMEDIATA (RISCO CRÍTICO DE CEGUEIRA IRREVERSÍVEL):*\n" +
      "• *Dosagem Urgente:* VHS (> 50 mm/h) e PCR sérico.\n" +
      "• *CORTICOTERAPIA IMEDIATA:* Iniciar *Prednisona 1 mg/kg/dia VO (40 a 60 mg/dia)* IMEDIATAMENTE! Não aguardar biópsia de artéria temporal se forte suspeita clínica.\n" +
      "• Se sintomas visuais agudos: considerar pulsoterapia com *Metilprednisolona 1g EV/dia por 3 dias*.\n" +
      "• Encaminhar para biópsia da artéria temporal (permanece positiva até 1-2 semanas após início do corticoide).";
  }
  return null;
}

function enviarMenuEmergDengue(chat, messageId) {
  var texto = '🦟 *MANEJO DE DENGUE & ARBOVIROSES (MS 2024)*\n\n' +
    'Classificação e condutas de hidratação rápida por peso:\n\n' +
    '• *Grupo C:* Dengue com sinais de alarme (hidratação venosa imediata 10 mL/kg/h)\n' +
    '• *Grupo D:* Choque hipovolêmico (expansão rápida em bolus 20 mL/kg em 20 min)\n' +
    '• *Grupos A e B:* Hidratação oral supervisionada (60 mL/kg/dia)';
  var botoes = botoesBot([
    [['🦟 Grupo C (10 mL/kg/h)', 'ux:conduta:dengue_c'], ['🚨 Grupo D Choque (20 mL/kg)', 'ux:conduta:dengue_d']],
    [['📋 Grupos A e B (Oral)', 'ux:conduta:dengue_ab']],
    [['🔙 Sala Vermelha', 'ux:sala'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function enviarMenuEmergCriseHas(chat, messageId) {
  var texto = '❤️ *CRISE HIPERTENSIVA (SBC 2020 / AHA)*\n\n' +
    'Selecione a apresentação clínica beira-leito:\n\n' +
    '• *Emergência:* LOA aguda (EAP, Dissecção, SCA, AVC) — drogas venosas em BIC\n' +
    '• *Urgência:* PA elevada sem LOA — controle oral em 24-48h (Captopril VO)\n' +
    '• *Pseudocrise:* Reativa a dor/ansiedade — repouso e analgesia simples';
  var botoes = botoesBot([
    [['🚨 Emergência (EAP / Dissecção)', 'ux:conduta:crisehas_emerg'], ['⚡ Urgência (Captopril/Clonidina)', 'ux:conduta:crisehas_urg']],
    [['🟢 Pseudocrise (Repouso/Analgesia)', 'ux:conduta:crisehas_pseudo']],
    [['🔙 Sala Vermelha', 'ux:sala'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function enviarMenuEmergGlasgow(chat, messageId) {
  var texto = '🧠 *ESCALA DE COMA DE GLASGOW (GUIA RÁPIDO)*\n\n' +
    '👁️ *Abertura Ocular (1 a 4):*\n' +
    '• 4: Espontânea | 3: Ao som | 2: À pressão | 1: Ausente\n\n' +
    '🗣️ *Resposta Verbal (1 a 5):*\n' +
    '• 5: Orientada | 4: Confusa | 3: Palavras | 2: Sons | 1: Ausente\n\n' +
    '💪 *Resposta Motora (1 a 6):*\n' +
    '• 6: À ordem | 5: Localiza | 4: Flexão normal | 3: Decorticação | 2: Descerebração | 1: Ausente\n\n' +
    '💡 *Envie a pontuação:* `glasgow 7` ou `glasgow 14`\n' +
    '🚨 *Alerta Sentinela:* Glasgow ≤ 8 = Proteção de via aérea obrigatória (SRI / IOT).\n\n' +
    'Selecione a gravidade clínica pela pontuação:';
  var botoes = botoesBot([
    [['🔴 Glasgow ≤ 8 (SRI / IOT)', 'ux:conduta:gcs_8'], ['🟡 Glasgow 9-12 (TC / Vigia)', 'ux:conduta:gcs_10']],
    [['🟢 Glasgow 13-15 (Observação)', 'ux:conduta:gcs_14'], ['📐 Calculadora Glasgow-P', 'calc_Glasgow']],
    [['🔙 Sala Vermelha', 'ux:sala'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function enviarMenuEmergChoque(chat, messageId) {
  var texto = '🫀 *IC DESCOMPENSADA & CHOQUE (STEVENSON / FORRESTER)*\n\n' +
    'Selecione o perfil clínico-hemodinâmico beira-leito:\n\n' +
    '• *Perfil C (Frio & Úmido):* Choque cardiogênico franco — Nora + Dobuta\n' +
    '• *Perfil B (Quente & Úmido):* Congestão/EAP — Nitroglicerina + Furosemida\n' +
    '• *Perfil L (Frio & Seco):* Hipovolemia/Superdiurese — Prova de volume\n' +
    '• *Choque Séptico:* Nora + Vasopressina + Hidrocortisona (CIRCI)';
  var botoes = botoesBot([
    [['🔴 Perfil C: Frio & Úmido (Choque)', 'ux:conduta:choque_c'], ['🟡 Perfil B: Quente & Úmido (EAP)', 'ux:conduta:choque_b']],
    [['🔵 Perfil L: Frio & Seco (Hipovolemia)', 'ux:conduta:choque_l'], ['💉 Choque Séptico (CIRCI/Nora)', 'ux:conduta:choque_septico']],
    [['🔙 Sala Vermelha', 'ux:sala'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function enviarMenuEmergCefaleia(chat, messageId) {
  var texto = '🤕 *CEFALEIAS AGUDAS NO PRONTO SOCORRO (SNOOP)*\n\n' +
    'Selecione a suspeita clínica ou bandeira vermelha:\n\n' +
    '• *Trovoada / HSA:* Início súbito < 1 min — TC sem contraste imediata + PL se normal\n' +
    '• *Meningite:* Febre + rigidez de nuca — Líquor e Ceftriaxona 2g + Dexa 10mg\n' +
    '• *Primária / Enxaqueca:* Resgate multimodal com Dipirona + Plasil + Dexa\n' +
    '• *Arterite Temporal:* Paciente > 50 anos com dor temporal — VHS + Prednisona urgente';
  var botoes = botoesBot([
    [['🚨 Trovoada / HSA (TC+PL)', 'ux:conduta:cef_hsa'], ['⚠️ Meningite / Febre (Punção)', 'ux:conduta:cef_mening']],
    [['💊 Cefaleia Primária (Resgate PS)', 'ux:conduta:cef_primaria'], ['👵 Arterite Temporal (Corticoide)', 'ux:conduta:cef_arterite']],
    [['🔙 Sala Vermelha', 'ux:sala'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
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
  var texto = '🩺 *AMBULATÓRIO & ATENÇÃO PRIMÁRIA (UBS)*\n\n' +
    'Prontuário estruturado, referências de Atenção Básica e condutas em 0ms:\n' +
    'Selecione a ferramenta ambulatorial desejada:';
  var botoes = botoesBot([
    [['📝 SOAP Ambulatorial', 'ux:amb:soap'], ['💊 Prescrição REMUME', 'ux:amb:remume']],
    [['🏷️ CID-10 & CIAP-2', 'ux:amb:cid'], ['📄 Atestado CFM', 'ux:amb:atestado']],
    [['📋 Modelo Exame Físico', 'ux:amb:ef'], ['🩺 Guia SISREG / Parecer', 'ux:amb:sisreg']],
    [['🤰 Hub G&O', 'ux:rotina:go'], ['🌸 Preventivo', 'ux:rotina:preventivo']],
    [['🔙 Voltar ao Menu', 'ux:menu'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function enviarTelaAmbSoap(chat, messageId) {
  var texto = "📝 *SOAP AMBULATORIAL ÁGIL (ATENÇÃO PRIMÁRIA & UBS)*\n\n" +
    "Registro clínico canônico estruturado em 4 tempos:\n\n" +
    "• *S (Subjetivo):* Queixa principal, tempo de evolução, HDA, medicações contínuas e alergias.\n" +
    "• *O (Objetivo):* Sinais vitais (PA, FC, FR, SpO2, Tax, IMC) e exame físico segmentar dirigido.\n" +
    "• *A (Avaliação):* Hipótese diagnóstica codificada (CID-10 / CIAP-2) e estratificação de risco (SBC/SBD).\n" +
    "• *P (Plano):* Prescrição REMUME, exames complementares, MEV (estilo de vida), alarmes e retorno.\n\n" +
    "💡 *Exame Físico Padrão Normal:* Toque no botão abaixo para copiar o modelo completo direto para o PEP.\n\n" +
    "👉 *Toque em um caso clínico predefinido abaixo para testar em 1 toque ou digite `/ambulatorio [dados]`*:";

  var efTexto = (typeof SoapAmbulatorialService !== "undefined" && typeof SoapAmbulatorialService.obterModeloExameFisicoCompleto === "function")
    ? SoapAmbulatorialService.obterModeloExameFisicoCompleto()
    : "Sinais Vitais: PA: 120/80 mmHg | FC: 72 bpm | FR: 16 irpm | SpO2: 98% em ar ambiente | T: 36.5°C.\n" +
      "Bom estado geral, lúcido e orientado no tempo e espaço, corado, hidratado, anictérico, acianótico, afebril ao toque, eupneico em ar ambiente.\n" +
      "  ACV: Ritmo cardíaco regular em 2 tempos, bulhas normofonéticas, sem sopros. Pulsos radiais amplos, cheios e simétricos bilateralmente.\n" +
      "  AR: Murmúrio vesicular globalmente presente, sem ruídos adventícios. Expansibilidade torácica preservada bilateralmente. Eupneico em ar ambiente.\n" +
      "  Abdome: Plano, flácido, indolor à palpação superficial e profunda. RHA normoativos. Sem massas ou visceromegalias.\n" +
      " Extremidades: Sem edema de membros inferiores. Panturrilhas livres sem empastamento. TEC < 3 segundos.";

  var cache = uxCache();
  var ckEf = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ckEf, efTexto, 21600);

  var botoes = botoesBot([
    [['📋 Copiar Exame Físico Padrão', 'ux:copiar:' + ckEf]],
    [['🩺 Caso HAS Descompensada', 'ux:amb:soap:has'], ['🩸 Caso DM2 Descompensado', 'ux:amb:soap:dm2']],
    [['🫁 Caso IVAS / Resfriado', 'ux:amb:soap:ivas'], ['🦴 Caso Lombalgia Aguda', 'ux:amb:soap:lombalgia']],
    [['📝 Iniciar Novo SOAP Livre', 'ux:iniciar:soap']],
    [['🔙 Ambulatório', 'ux:hub:amb'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function tratarCallbackAmbSoap(chat, valor, messageId) {
  var dadosCaso = null;
  if (valor === 'has') {
    dadosCaso = {
      pacienteNome: 'João da Silva',
      idade: 56,
      sexo: 'm',
      queixaPrincipal: 'Acompanhamento de pressão alta e dor de cabeça occipital',
      tempoEvolucao: '3 semanas',
      hda: 'Paciente hipertenso de longa data em uso irregular de medicação, relata níveis pressóricos elevados na aferição da UBS (160/96 mmHg) e cefaleia occipital vespertina leve. Nega precordialgia, dispneia ou déficit focal.',
      medicacoesUso: 'Losartana 50mg/dia (irregular)',
      alergias: 'Nega alergias',
      antecedentes: 'HAS há 8 anos, dislipidemia. Pai com IAM aos 62 anos.',
      habitos: 'Sedentário, nega tabagismo, etilismo eventual',
      sinaisVitais: { pa: '154/96', fc: 74, fr: 16, spo2: 97, tax: 36.4, imc: 27.8 },
      modeloExameFisico: 'has_rotina',
      diagnosticos: ['Hipertensão Arterial Sistêmica Estágio 2 (CID-10: I10 / CIAP-2: K86)', 'Sobrepeso (CID-10: E66.9)'],
      estratificacaoRisco: (typeof SoapAmbulatorialService !== 'undefined') ? SoapAmbulatorialService.estratificarRiscoCardiovascular({ idade: 56, sexo: 'm', pas: 154, dm: false, tabagismo: false }) : null,
      prescricaoMedicamentosa: [
        { nome: 'Losartana Potássica', apresentacao: '50mg comprimido', quantidade: '60 comprimidos', posologia: '1 comprimido VO de 12/12h', horarios: '08h e 20h' },
        { nome: 'Hidroclorotiazida', apresentacao: '25mg comprimido', quantidade: '30 comprimidos', posologia: '1 comprimido VO 1x/dia pela manhã', horarios: '08h' },
        { nome: 'Anlodipino', apresentacao: '5mg comprimido', quantidade: '30 comprimidos', posologia: '1 comprimido VO 1x/dia à noite se PA persistir > 140/90', horarios: '20h' }
      ],
      examesSolicitados: ['Creatinina sérica, Ureia, Potássio', 'EAS / Urina 1 e Relação Albuminúria/Creatinúria (RAC)', 'Glicemia de jejum e HbA1c', 'Perfil lipídico completo (CT, HDL, LDL, Triglicerídeos)', 'Eletrocardiograma de repouso (ECG)'],
      mev: ['Dieta DASH com restrição de sal (< 2g sódio/dia ou 5g sal de cozinha).', 'Prática de atividade física aeróbica 150 min/semana.', 'Manutenção do Mapa de Pressão Arterial (MRPA residencial 2x/dia por 5 dias).'],
      sinaisAlarme: ['Procurar UPA/PS se: dor torácica em aperto, falta de ar súbita, perda de força ou fala enrolada, PAS ≥ 180 ou PAD ≥ 110 com sintomas visuais.'],
      retornoDias: 30
    };
  } else if (valor === 'dm2') {
    dadosCaso = {
      pacienteNome: 'Maria Aparecida Santos',
      idade: 61,
      sexo: 'f',
      queixaPrincipal: 'Revisão de Diabetes e cansaço',
      tempoEvolucao: '2 meses',
      hda: 'Paciente com DM2 há 5 anos, queixa-se de poliúria discreta e astenia. Glicemia de jejum recente de 184 mg/dL e HbA1c de 8.8%. Nega hipoglicemias recentes.',
      medicacoesUso: 'Metformina 850mg 2x/dia',
      alergias: 'Nega alergias',
      antecedentes: 'DM2, HAS, esteatose hepática',
      habitos: 'Nega tabagismo e etilismo',
      sinaisVitais: { pa: '132/84', fc: 78, fr: 18, spo2: 98, tax: 36.6, glicemia: 178, imc: 29.4 },
      modeloExameFisico: 'dm_rotina',
      diagnosticos: ['Diabetes Mellitus Tipo 2 com controle subótimo (CID-10: E11.9 / CIAP-2: T90)', 'Hipertensão Arterial Sistêmica controlada (CID-10: I10)'],
      estratificacaoRisco: (typeof SoapAmbulatorialService !== 'undefined') ? SoapAmbulatorialService.estratificarRiscoCardiovascular({ idade: 61, sexo: 'f', pas: 132, dm: true }) : null,
      prescricaoMedicamentosa: [
        { nome: 'Metformina', apresentacao: '850mg comprimido', quantidade: '90 comprimidos', posologia: '1 comprimido VO 3x/dia após as principais refeições', horarios: 'café, almoço e jantar' },
        { nome: 'Gliclazida MR', apresentacao: '30mg comprimido de liberação modificada', quantidade: '60 comprimidos', posologia: '2 comprimidos (60mg) VO 1x/dia no desjejum', horarios: '08h' }
      ],
      examesSolicitados: ['Hemoglobina Glicada (HbA1c)', 'Creatinina sérica e taxa de filtração glomerular estimada', 'Relação Albuminúria/Creatinúria em amostra isolada', 'Fundo de olho anual'],
      mev: ['Orientação nutricional para redução de carboidratos simples e ultraprocessados.', 'Exame diário dos pés, secagem interdigital e uso de calçados confortáveis sem costuras.', 'Automonitorização da glicemia capilar em jejum.'],
      sinaisAlarme: ['Sintomas de hipoglicemia (sudorese fria, tremor, confusão: ingerir 15g de carboidrato rápido).', 'Procurar UPA se lesão ulcerada ou bolhosa em pés, febre ou vômitos com glicemia > 300.'],
      retornoDias: 45
    };
  } else if (valor === 'ivas') {
    dadosCaso = {
      pacienteNome: 'Carlos Eduardo Lima',
      idade: 28,
      sexo: 'm',
      queixaPrincipal: 'Coriza, espirros, dor de garganta leve e tosse seca',
      tempoEvolucao: '4 dias',
      hda: 'Quadro iniciado há 4 dias com rinorreia clara, espirros frequentes e odinofagia leve. Sensação de febrícula no 1º dia (não aferida). Nega dispneia, dor ventilatório-dependente ou secreção purulenta.',
      medicacoesUso: 'Nenhuma medicação contínua',
      alergias: 'Nega alergias',
      antecedentes: 'Hígido, nega asma ou rinite crônica',
      habitos: 'Não fumante',
      sinaisVitais: { pa: '118/74', fc: 72, fr: 14, spo2: 99, tax: 36.7 },
      modeloExameFisico: 'respiratorio_ivas',
      diagnosticos: ['Rinofaringite Aguda / Resfriado Comum (CID-10: J00 / CIAP-2: R74)'],
      prescricaoMedicamentosa: [
        { nome: 'Dipirona Monoidratada', apresentacao: '500mg comprimido', quantidade: '20 comprimidos', posologia: '1 a 2 comprimidos VO até de 6/6h se dor ou febre', horarios: 'SOS dor/febre' },
        { nome: 'Cloreto de Sódio 0,9%', apresentacao: 'Solução Nasal Frasco 30 mL', quantidade: '2 frascos', posologia: 'Aplicar 2 a 3 jatos em cada narina várias vezes ao dia', horarios: 'Livre demanda' }
      ],
      examesSolicitados: ['Sem indicação de exames complementares ou radiografia no momento (quadro viral autolimitado).'],
      mev: ['Hidratação oral vigorosa (2 a 3 litros de água por dia).', 'Repouso domiciliar, alimentação leve e lavagem nasal frequente.', 'Evitar antibióticos (infecção viral autolimitada).'],
      sinaisAlarme: ['Procurar atendimento imediato se: febre persistente > 3 dias (≥ 37,8°C), falta de ar ou dor torácica, expectoração purulenta abundante com piora do estado geral.'],
      retornoDias: 7
    };
  } else {
    dadosCaso = {
      pacienteNome: 'Ana Paula Ferreira',
      idade: 42,
      sexo: 'f',
      queixaPrincipal: 'Dor na coluna lombar após carregar peso',
      tempoEvolucao: '5 dias',
      hda: 'Paciente relata dor lombar baixa de início súbito após esforço físico doméstico. Dor mecânica que piora à movimentação e melhora com repouso. Nega irradiação para membros inferiores, parestesias, febre ou perda de força. Nega incontinência esfincteriana.',
      medicacoesUso: 'Nenhuma medicação contínua',
      alergias: 'Nega alergias',
      antecedentes: 'Sem antecedentes de neoplasia ou trauma maior',
      habitos: 'Trabalho administrativo sedentário',
      sinaisVitais: { pa: '122/78', fc: 76, fr: 15, spo2: 98, tax: 36.5 },
      modeloExameFisico: 'lombalgia_postural',
      diagnosticos: ['Lombalgia Mecânico-Postural Aguda (CID-10: M54.5 / CIAP-2: L03)'],
      prescricaoMedicamentosa: [
        { nome: 'Dipirona Monoidratada', apresentacao: '1g comprimido', quantidade: '15 comprimidos', posologia: '1 comprimido VO de 6/6h nos primeiros 3 dias, depois se dor', horarios: '06h, 12h, 18h, 24h' },
        { nome: 'Ciclobenzaprina', apresentacao: '5mg comprimido', quantidade: '10 comprimidos', posologia: '1 comprimido VO à noite ao deitar por 5 dias', horarios: '22h' }
      ],
      examesSolicitados: ['Radiografia de coluna lombo-sacra NÃO indicada neste momento (ausência de "red flags" / sinais de alerta).'],
      mev: ['Compressas mornas locais por 20 minutos 3x/dia.', 'Evitar repouso absoluto no leito (manter movimentação leve conforme tolerância).', 'Higiene postural e evitar erguer cargas pesadas.'],
      sinaisAlarme: ['Procurar atendimento de emergência se: dormência no períneo ("anestesia em sela"), retenção urinária ou perda involuntária de fezes/urina (suspeita de Síndrome da Cauda Equina), fraqueza nas pernas ("pé caído") ou febre.'],
      retornoDias: 14
    };
  }

  var resSoap = (typeof SoapAmbulatorialService !== 'undefined')
    ? SoapAmbulatorialService.estruturarSoapAmbulatorial(dadosCaso)
    : { textoProntuario: 'SOAP Ambulatorial gerado com sucesso.' };

  var textoRetorno = '📋 *PRONTUÁRIO CLÍNICO AMBULATORIAL (SOAP ÁGIL)*\n\n```\n' +
    resSoap.textoProntuario + '\n```\n\n' +
    '_Toque no botão abaixo para copiar o prontuário completo para o PEP._';

  var cache = uxCache();
  var ckSoap = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ckSoap, resSoap.textoProntuario, 21600);

  var botoes = botoesBot([
    [['📋 Copiar Prontuário SOAP', 'ux:copiar:' + ckSoap]],
    [['🩺 Outro Caso (HAS)', 'ux:amb:soap:has'], ['🩸 Caso DM2', 'ux:amb:soap:dm2']],
    [['🔙 SOAP Ambulatorial', 'ux:amb:soap'], ['🔙 Ambulatório', 'ux:hub:amb']],
    [['🏠 Início', 'ux:hub:inicio']]
  ]);

  return enviarTelaBot(chat, textoRetorno, botoes, messageId);
}

function enviarTelaAmbRemume(chat, messageId) {
  var texto = "💊 *PRESCRIÇÃO AMBULATORIAL REMUME SUS (ATENÇÃO BÁSICA / FARMÁCIA POPULAR)*\n\n" +
    "Principais esquemas terapêuticos de 1ª linha da Relação Municipal de Medicamentos:\n\n" +
    "• *Hipertensão Arterial (HAS):*\n" +
    "  👉 Losartana 50mg VO 12/12h + Hidroclorotiazida 25mg VO 1x/dia pela manhã\n" +
    "  _(Alt/Associação: Anlodipino 5mg a 10mg VO 1x/dia)_\n\n" +
    "• *Diabetes Mellitus Tipo 2 (DM2):*\n" +
    "  👉 Metformina 850mg VO 2x a 3x/dia após refeições (máx 2.550mg/dia)\n" +
    "  _(Associação: Gliclazida MR 30mg a 60mg VO 1x/dia no café da manhã)_\n\n" +
    "• *Dislipidemia / Prevenção CV:*\n" +
    "  👉 Sinvastatina 20mg a 40mg VO à noite (alvo LDL conforme risco)\n\n" +
    "• *Analgesia & Febre (Sintomáticos):*\n" +
    "  👉 Dipirona 500mg/1g VO 6/6h SOS ou Paracetamol 500mg/750mg até 6/6h (máx 3g/dia)\n" +
    "  👉 Ibuprofeno 600mg VO 8/8h por 3-5 dias (usar com cautela em idosos/HAS/DRC)\n\n" +
    "• *Asma & Doença Respiratória:*\n" +
    "  👉 Salbutamol 100mcg/jato (resgate: 2 jatos inalatórios se falta de ar)\n" +
    "  👉 Beclometasona 250mcg/jato (manutenção: 1 a 2 jatos inalatórios 12/12h)\n\n" +
    "Toque abaixo para gerar e copiar receitas completas com via, posologia e MEV:";

  var cache = uxCache();
  var ckRemume = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ckRemume, texto, 21600);

  var botoes = botoesBot([
    [['💊 Receita HAS (Hipertensão)', 'ux:amb:remume:has'], ['🩸 Receita DM2 (Diabetes)', 'ux:amb:remume:dm']],
    [['🩹 Receita Dor & Sintomáticos', 'ux:amb:remume:dor'], ['🫁 Receita Asma / DPOC', 'ux:amb:remume:asma']],
    [['📋 Copiar Guia REMUME Completo', 'ux:copiar:' + ckRemume]],
    [['🔙 Ambulatório', 'ux:hub:amb'], ['🏠 Início', 'ux:hub:inicio']]
  ]);

  return enviarTelaBot(chat, texto, botoes, messageId);
}

function tratarCallbackAmbRemume(chat, valor, messageId) {
  var dadosReceita = null;
  if (valor === 'has') {
    dadosReceita = {
      pacienteNome: 'Ao Portador',
      itens: [
        { nome: 'Losartana Potássica', apresentacao: '50 mg comprimido', quantidade: '60 comprimidos', via: 'USO ORAL', posologia: '1 comprimido de 12 em 12 horas.', horarios: '08h e 20h' },
        { nome: 'Hidroclorotiazida', apresentacao: '25 mg comprimido', quantidade: '30 comprimidos', via: 'USO ORAL', posologia: '1 comprimido pela manhã em jejum.', horarios: '08h' },
        { nome: 'Besilato de Anlodipino', apresentacao: '5 mg comprimido', quantidade: '30 comprimidos', via: 'USO ORAL', posologia: '1 comprimido uma vez ao dia.', horarios: '20h' }
      ],
      orientacoes: [
        'Reduzir ingestão de sal de cozinha e evitar alimentos ultraprocessados e embutidos.',
        'Praticar atividade física aeróbica regular (caminhada 30 a 45 min, 5x por semana).',
        'Aferir e anotar a pressão arterial 2 vezes por semana para controle ambulatorial.'
      ]
    };
  } else if (valor === 'dm') {
    dadosReceita = {
      pacienteNome: 'Ao Portador',
      itens: [
        { nome: 'Cloridrato de Metformina', apresentacao: '850 mg comprimido', quantidade: '90 comprimidos', via: 'USO ORAL', posologia: '1 comprimido após o café, almoço e jantar.', horarios: 'Após as refeições' },
        { nome: 'Gliclazida MR', apresentacao: '30 mg comprimido liberação modificada', quantidade: '60 comprimidos', via: 'USO ORAL', posologia: '2 comprimidos (60 mg) no café da manhã.', horarios: '08h' }
      ],
      orientacoes: [
        'Seguir plano alimentar com redução drástica de açúcares simples, doces e refrigerantes.',
        'Inspecionar os pés diariamente em busca de calos, fissuras, bolhas ou feridas.',
        'Se apresentar tremores, sudorese fria ou tontura (hipoglicemia), ingerir 1 copo de água com açúcar e procurar atendimento.'
      ]
    };
  } else if (valor === 'dor') {
    dadosReceita = {
      pacienteNome: 'Ao Portador',
      itens: [
        { nome: 'Dipirona Monoidratada', apresentacao: '500 mg comprimido', quantidade: '20 comprimidos', via: 'USO ORAL', posologia: '1 a 2 comprimidos até de 6 em 6 horas se dor ou febre.', horarios: 'SOS dor ou febre' },
        { nome: 'Paracetamol', apresentacao: '500 mg comprimido', quantidade: '20 comprimidos', via: 'USO ORAL', posologia: '1 comprimido de 6 em 6 horas se dor leve.', duracao: '3 a 5 dias' },
        { nome: 'Ibuprofeno', apresentacao: '600 mg comprimido', quantidade: '15 comprimidos', via: 'USO ORAL', posologia: '1 comprimido de 8 em 8 horas após refeições por no máximo 5 dias.', duracao: '5 dias' }
      ],
      orientacoes: [
        'Não ultrapassar a dose máxima de Paracetamol (3g/dia) pelo risco de toxicidade hepática.',
        'Suspender o Ibuprofeno se dor de estômago, fezes escuras ou piora da pressão arterial.'
      ]
    };
  } else {
    dadosReceita = {
      pacienteNome: 'Ao Portador',
      itens: [
        { nome: 'Sulfato de Salbutamol Aerossol', apresentacao: '100 mcg/dose frasco com 200 doses', quantidade: '1 frasco', via: 'USO INALATÓRIO', posologia: 'Inalar 2 jatos espaçados com espaçador se falta de ar ou chiado no peito (resgate).', horarios: 'SOS falta de ar' },
        { nome: 'Dipropionato de Beclometasona Aerossol', apresentacao: '250 mcg/dose frasco com 200 doses', quantidade: '1 frasco', via: 'USO INALATÓRIO', posologia: 'Inalar 1 a 2 jatos de 12 em 12 horas de uso diário e contínuo.', horarios: '08h e 20h' }
      ],
      orientacoes: [
        'Utilizar espaçador para garantir correta deposição pulmonar do medicamento.',
        'Enxaguar a boca com água e cuspir após o uso da Beclometasona para prevenir candidíase oral.',
        'Se necessitar do Salbutamol mais de 3 vezes por semana, retornar para reavaliação de controle da asma.'
      ]
    };
  }

  var textoRec = (typeof SoapAmbulatorialService !== 'undefined')
    ? SoapAmbulatorialService.exportarReceitaTexto(dadosReceita)
    : 'Receita médica gerada com sucesso.';

  var msgRetorno = '💊 *RECEITUÁRIO AMBULATORIAL PRONTO PARA O PEP:*\n\n```\n' +
    textoRec + '\n```\n\n' +
    '_Toque no botão abaixo para copiar a receita completa para a área de transferência._';

  var cache = uxCache();
  var ckR = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ckR, textoRec, 21600);

  var botoes = botoesBot([
    [['📋 Copiar Receita para Prontuário', 'ux:copiar:' + ckR]],
    [['💊 Receita HAS', 'ux:amb:remume:has'], ['🩸 Receita DM2', 'ux:amb:remume:dm']],
    [['🔙 Prescrição REMUME', 'ux:amb:remume'], ['🔙 Ambulatório', 'ux:hub:amb']],
    [['🏠 Início', 'ux:hub:inicio']]
  ]);

  return enviarTelaBot(chat, msgRetorno, botoes, messageId);
}

function enviarTelaAmbCid(chat, messageId) {
  var texto = "🏷️ *CATÁLOGO DE CID-10 & CIAP-2 (ATENÇÃO PRIMÁRIA / UBS)*\n\n" +
    "Códigos canônicos mais utilizados no atendimento ambulatorial em 0ms:\n\n" +
    "• *Cardiovascular:*\n" +
    "  • Hipertensão Arterial Essencial: CID-10 `I10` | CIAP-2 `K86`\n" +
    "  • Insuficiência Cardíaca: CID-10 `I50.9` | CIAP-2 `K77`\n\n" +
    "• *Metabólico & Endócrino:*\n" +
    "  • Diabetes Mellitus Tipo 2: CID-10 `E11.9` | CIAP-2 `T90`\n" +
    "  • Diabetes Mellitus Tipo 1: CID-10 `E10.9` | CIAP-2 `T89`\n" +
    "  • Dislipidemia Mista: CID-10 `E78.0` | CIAP-2 `T93`\n" +
    "  • Hipotireoidismo Primário: CID-10 `E03.9` | CIAP-2 `T86`\n" +
    "  • Obesidade: CID-10 `E66.9` | CIAP-2 `T82`\n\n" +
    "• *Respiratório:*\n" +
    "  • IVAS / Resfriado Comum: CID-10 `J00` | CIAP-2 `R74`\n" +
    "  • Faringoamigdalite Aguda: CID-10 `J02.9` | CIAP-2 `R74`\n" +
    "  • Asma Brônquica: CID-10 `J45.9` | CIAP-2 `R96`\n" +
    "  • Rinite Alérgica: CID-10 `J30.4` | CIAP-2 `R97`\n" +
    "  • DPOC: CID-10 `J44.9` | CIAP-2 `R95`\n\n" +
    "• *Gastrointestinal:*\n" +
    "  • Dispepsia / Gastrite: CID-10 `K30` | CIAP-2 `D87`\n" +
    "  • DRGE / Refluxo: CID-10 `K21.9` | CIAP-2 `D84`\n\n" +
    "• *Musculoesquelético & Reumatologia:*\n" +
    "  • Lombalgia Mecânico-Postural: CID-10 `M54.5` | CIAP-2 `L03`\n" +
    "  • Gonartrose / Osteoartrite: CID-10 `M17.9` | CIAP-2 `L90`\n\n" +
    "• *Saúde Mental:*\n" +
    "  • Ansiedade Generalizada (TAG): CID-10 `F41.1` | CIAP-2 `P74`\n" +
    "  • Episódio Depressivo: CID-10 `F32.1` | CIAP-2 `P76`\n\n" +
    "• *Urológico:*\n" +
    "  • Cistite Aguda / ITU Baixa: CID-10 `N30.0` | CIAP-2 `U71`\n\n" +
    "💡 *Busca Rápida de Qualquer Termo:* Envie `/cid [termo]` (ex: `/cid lombalgia`).";

  var cache = uxCache();
  var ckCid = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ckCid, texto, 21600);

  var botoes = botoesBot([
    [['❤️ HAS (I10)', 'ux:amb:cid:has'], ['🩸 DM2 (E11.9)', 'ux:amb:cid:dm2']],
    [['🫁 IVAS (J00)', 'ux:amb:cid:ivas'], ['🦴 Lombalgia (M54.5)', 'ux:amb:cid:lombalgia']],
    [['🧠 Ansiedade (F41.1)', 'ux:amb:cid:tag'], ['🚽 Cistite (N30.0)', 'ux:amb:cid:itu']],
    [['📋 Copiar Tabela CID/CIAP', 'ux:copiar:' + ckCid]],
    [['🔙 Ambulatório', 'ux:hub:amb'], ['🏠 Início', 'ux:hub:inicio']]
  ]);

  return enviarTelaBot(chat, texto, botoes, messageId);
}

function tratarCallbackAmbCid(chat, valor, messageId) {
  var termoBusca = valor;
  if (valor === 'has') termoBusca = 'hipertensao';
  else if (valor === 'dm2') termoBusca = 'diabetes_tipo_2';
  else if (valor === 'ivas') termoBusca = 'resfriado_comum';
  else if (valor === 'lombalgia') termoBusca = 'lombalgia';
  else if (valor === 'tag') termoBusca = 'ansiedade_tag';
  else if (valor === 'itu') termoBusca = 'cistite_itu';

  var matches = (typeof SoapAmbulatorialService !== 'undefined')
    ? SoapAmbulatorialService.buscarDiagnostico(termoBusca)
    : [];

  var item = matches.length ? matches[0] : null;
  if (!item) {
    return enviarTelaAmbCid(chat, messageId);
  }

  var textoFicha = "🏷️ *FICHA CLÍNICA DE DIAGNÓSTICO (CID-10 & CIAP-2)*\n\n" +
    "• *Diagnóstico Canônico:* " + item.diagnostico + "\n" +
    "• *Código CID-10:* `" + item.cid10 + "`\n" +
    "• *Código CIAP-2 (APS):* `" + item.ciap2 + "`\n" +
    "• *Categoria:* " + item.categoria + "\n\n";

  if (item.alarmes && item.alarmes.length) {
    textoFicha += "🚨 *Sinais de Alarme Sentinela (Avaliar PS / Especialista):*\n";
    item.alarmes.forEach(function(al) {
      textoFicha += "• " + al + "\n";
    });
    textoFicha += "\n";
  }

  textoFicha += "💡 _Dica de PEP: Utilize o botão de cópia abaixo para transferir o código formatado diretamente para a evolução do prontuário._";

  var blocoCopia = item.diagnostico + ' (CID-10: ' + item.cid10 + ' | CIAP-2: ' + item.ciap2 + ')';
  var cache = uxCache();
  var ckF = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ckF, blocoCopia, 21600);

  var botoes = botoesBot([
    [['📋 Copiar CID-10 & Diagnóstico', 'ux:copiar:' + ckF]],
    [['🔙 Tabela CID-10', 'ux:amb:cid'], ['🔙 Ambulatório', 'ux:hub:amb']],
    [['🏠 Início', 'ux:hub:inicio']]
  ]);

  return enviarTelaBot(chat, textoFicha, botoes, messageId);
}

function enviarTelaAmbAtestado(chat, messageId) {
  var texto = "📄 *EMISSOR DE ATESTADO MÉDICO CFM (RESOLUÇÃO 1.658/2002)*\n\n" +
    "Regras éticas e legais obrigatórias para emissão de atestados médicos:\n\n" +
    "• *Direito do Paciente:* O atestado é parte integrante da consulta e não pode ser cobrado à parte.\n" +
    "• *Prazo por Extenso:* A quantidade de dias deve ser expressa em algarismos e por extenso.\n" +
    "• *Sigilo Médico (Art. 5º da Res. CFM 1.658/2002):* O código CID-10 só pode ser incluído com autorização expressa do paciente. Por padrão ético, deve ser emitido sem diagnóstico.\n" +
    "• *Limite na Atenção Primária:* Afastamentos superiores a 15 dias consecutivos pelo mesmo agravo competem à perícia médica previdenciária (INSS).\n\n" +
    "Selecione a quantidade de dias para gerar o atestado padronizado em 1 toque ou digite `/atestado [dias] [motivo]`:";

  var atModelo = (typeof SoapAmbulatorialService !== "undefined")
    ? SoapAmbulatorialService.exportarAtestadoTexto({ dias: 3 })
    : "Atestado médico padronizado CFM.";

  var cache = uxCache();
  var ckAt = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ckAt, atModelo, 21600);

  var botoes = botoesBot([
    [['📄 1 Dia (Consulta)', 'ux:amb:atest:1d'], ['📄 2 Dias (Repouso)', 'ux:amb:atest:2d']],
    [['📄 3 Dias (IVAS / Sintomático)', 'ux:amb:atest:3d'], ['📄 5 Dias (Afastamento)', 'ux:amb:atest:5d']],
    [['📄 7 Dias (Lombalgia / Convalescença)', 'ux:amb:atest:7d'], ['🕒 Declaração de Comparecimento', 'ux:amb:atest:comp']],
    [['📋 Copiar Modelo de Atestado', 'ux:copiar:' + ckAt]],
    [['🔙 Ambulatório', 'ux:hub:amb'], ['🏠 Início', 'ux:hub:inicio']]
  ]);

  return enviarTelaBot(chat, texto, botoes, messageId);
}

function tratarCallbackAmbAtestado(chat, valor, messageId) {
  var textoAtestado = "";
  if (valor === 'comp') {
    textoAtestado = "======================================================================\n" +
      "                    DECLARAÇÃO DE COMPARECIMENTO MÉDICO               \n" +
      "======================================================================\n\n" +
      "Declaro para os devidos fins de comprovação e justificativa que o(a) paciente:\n" +
      "Nome: Ao Portador\n" +
      "Documento: [RG / CPF / Documento]\n\n" +
      "Compareceu a esta unidade de saúde nesta data, permanecendo em atendimento\n" +
      "médico ambulatorial sob meus cuidados profissionais no período das [   ]h às [   ]h.\n\n" +
      "Local e Data: Ribeirão Preto - SP, " + new Date().toLocaleDateString('pt-BR') + ".\n\n" +
      "__________________________________________________________\n" +
      "Dr. Wagner Moraes · CRM/SP\n" +
      "======================================================================";
  } else {
    var diasNum = parseInt(valor.replace('d', ''), 10) || 1;
    textoAtestado = (typeof SoapAmbulatorialService !== "undefined")
      ? SoapAmbulatorialService.exportarAtestadoTexto({
          pacienteNome: 'Ao Portador',
          dias: diasNum,
          incluirCid: false
        })
      : "Atestado médico de " + diasNum + " dia(s).";
  }

  var msgRetorno = "📜 *ATESTADO MÉDICO CFM PRONTO PARA O PRONTUÁRIO / PEP:*\n\n```\n" +
    textoAtestado + "\n```\n\n" +
    "_Toque no botão abaixo para copiar o atestado médico completo para o PEP._";

  var cache = uxCache();
  var ckA = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ckA, textoAtestado, 21600);

  var botoes = botoesBot([
    [['📋 Copiar Atestado para Prontuário', 'ux:copiar:' + ckA]],
    [['📄 1 Dia', 'ux:amb:atest:1d'], ['📄 3 Dias', 'ux:amb:atest:3d'], ['📄 5 Dias', 'ux:amb:atest:5d']],
    [['🔙 Atestados CFM', 'ux:amb:atestado'], ['🔙 Ambulatório', 'ux:hub:amb']],
    [['🏠 Início', 'ux:hub:inicio']]
  ]);

  return enviarTelaBot(chat, msgRetorno, botoes, messageId);
}

function enviarTelaAmbExameFisico(chat, messageId) {
  var textoEf = (typeof SoapAmbulatorialService !== "undefined" && typeof SoapAmbulatorialService.obterModeloExameFisicoCompleto === "function")
    ? SoapAmbulatorialService.obterModeloExameFisicoCompleto()
    : "Sinais Vitais: PA: 120/80 mmHg | FC: 72 bpm | FR: 16 irpm | SpO2: 98% em ar ambiente | T: 36.5°C.\n" +
      "Bom estado geral, lúcido e orientado no tempo e espaço, corado, hidratado, anictérico, acianótico, afebril ao toque, eupneico em ar ambiente.\n" +
      "  ACV: Ritmo cardíaco regular em 2 tempos, bulhas normofonéticas, sem sopros. Pulsos radiais amplos, cheios e simétricos bilateralmente.\n" +
      "  AR: Murmúrio vesicular globalmente presente, sem ruídos adventícios. Expansibilidade torácica preservada bilateralmente. Eupneico em ar ambiente.\n" +
      "  Abdome: Plano, flácido, indolor à palpação superficial e profunda. RHA normoativos. Sem massas ou visceromegalias.\n" +
      " Extremidades: Sem edema de membros inferiores. Panturrilhas livres sem empastamento. TEC < 3 segundos.";

  var texto = "📋 *MODELO CANÔNICO DE EXAME FÍSICO NORMAL (SEGMENTAR PADRÃO-OURO)*\n\n" +
    "Exame físico descritivo completo e objetivo para o Prontuário Eletrônico (sem termos vagos):\n\n```\n" +
    textoEf + "\n```";

  var cache = uxCache();
  var ckEf = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ckEf, textoEf, 21600);

  var botoes = botoesBot([
    [['📋 Copiar Exame Físico', 'ux:copiar:' + ckEf]],
    [['🔙 Ambulatório', 'ux:hub:amb'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function enviarTelaAmbSisreg(chat, messageId) {
  var textoSisreg = (typeof SoapAmbulatorialService !== "undefined" && typeof SoapAmbulatorialService.exportarEncaminhamentoTexto === "function")
    ? SoapAmbulatorialService.exportarEncaminhamentoTexto({
        pacienteNome: 'Ao Portador',
        especialidade: 'Cardiologia Ambulatorial',
        motivo: 'Hipertensão Arterial Sistêmica de difícil controle (uso de 3 classes em dose plena) para investigação de causa secundária e estratificação de lesão de órgão-alvo.',
        cid: 'I10 - Hipertensão Essencial Primária',
        prioridade: 'Eletiva / Prioritária'
      })
    : "GUIA DE ENCAMINHAMENTO SISREG:\nPaciente: [Nome] | Especialidade: [Destino]\nMotivo: Avaliação especializada e conduta compartilhada.";

  var texto = "🩺 *GUIA DE ENCAMINHAMENTO / REGULAÇÃO AMBULATORIAL (SISREG / CROSS)*\n\n" +
    "Modelo oficial de contrarreferência com critérios objetivos para regulação médica:\n\n```\n" +
    textoSisreg + "\n```";

  var cache = uxCache();
  var ckSis = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ckSis, textoSisreg, 21600);

  var botoes = botoesBot([
    [['📋 Copiar Guia SISREG', 'ux:copiar:' + ckSis]],
    [['🔙 Ambulatório', 'ux:hub:amb'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

/* ========== Cenário 4: 💊 Consultas Rápidas de Bolso ========== */

function enviarMenuConsultasBolso(chat, messageId) {
  var texto = '💊 *CONSULTAS RÁPIDAS DE BOLSO*\n\n' +
    'Guias de referência imediata beira-leito (0ms determinístico):\n' +
    'Selecione o guia clínico desejado:';
  var botoes = botoesBot([
    [['🦠 Antibióticos por Foco', 'ux:bolso:atb'], ['👶 Doses Pediátricas (kg)', 'ux:bolso:ped']],
    [['🤰 Gestação & Lactação', 'ux:bolso:gestacao'], ['⚠️ Interações Graves', 'ux:bolso:interacao']],
    [['💉 Diluição & Preparo HSL', 'ux:bolso:hsl'], ['📐 Calculadoras Clínicas', 'ux:hub:calc']],
    [['🔙 Voltar ao Menu', 'ux:menu'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function enviarTelaBolsoATB(chat, messageId) {
  var texto = "🦠 *ANTIBIÓTICOS POR FOCO & AJUSTE ANTIMICROBIANO (GUIA HSL / IDSA)*\n\n" +
    "Principais esquemas empíricos de 1ª linha do adulto:\n\n" +
    "• *Pulmão (PAC Enfermaria):*\n" +
    "  👉 Ceftriaxona 1g a 2g EV 1x/dia + Azitromicina 500mg EV/VO 1x/dia\n" +
    "  _(Alt: Levofloxacino 750mg EV/VO 1x/dia)_\n\n" +
    "• *Urinário (Pielonefrite / ITU Complicada):*\n" +
    "  👉 Ceftriaxona 1g EV 1x/dia ou Ciprofloxacino 500mg VO 12/12h\n\n" +
    "• *Foco Abdominal (Peritonite / Diverticulite):*\n" +
    "  👉 Ceftriaxona 1g-2g EV 1x/dia + Metronidazol 500mg EV 8/8h\n" +
    "  _(Alt: Piperacilina-Tazobactam 4,5g EV 6/6h)_\n\n" +
    "• *Pele / Partes Moles (Erisipela / Celulite):*\n" +
    "  👉 Cefazolina 1g-2g EV 8/8h ou Oxacilina 2g EV 4/4h\n\n" +
    "• *Sepse Hospitalar / CTI:*\n" +
    "  👉 Meropenem 1g EV 8/8h ± Vancomicina 15-20 mg/kg 12/12h\n\n" +
    "💡 *Ajuste Renal:* Envie `/atb meropenem clcr 25` ou toque abaixo:";

  var cache = uxCache();
  var ck = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ck, texto, 21600);

  var botoes = botoesBot([
    [['🫁 PAC (Pulmão)', 'ux:bolso:atb:pac'], ['🚽 ITU / Pielo', 'ux:bolso:atb:itu']],
    [['💊 Meropenem ClCr 25', 'ux:atb:mero25'], ['💊 Pip-Tazo ClCr 30', 'ux:atb:tazo30']],
    [['💊 Cefepime HD', 'ux:atb:cefepimehd'], ['💊 Vanco ClCr 40', 'ux:atb:vanco40']],
    [['📋 Copiar Guia Antimicrobiano', 'ux:copiar:' + ck]],
    [['🔙 Consultas de Bolso', 'ux:hub:bolso'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function enviarTelaBolsoAtbPAC(chat, messageId) {
  var texto = "🫁 *ANTIBIÓTICOTERAPIA: PNEUMONIA ADQUIRIDA NA COMUNIDADE (PAC)*\n\n" +
    "📋 *Classificação & Esquemas Recomendados (SBPT / IDSA):*\n\n" +
    "1. *Ambulatorial sem Comorbidades (CURB-65 0-1):*\n" +
    "   • Amoxicilina 500mg VO 8/8h (ou 1g 8/8h) por 5 a 7 dias\n" +
    "   • Alt: Azitromicina 500mg VO 1x/dia por 5 dias\n\n" +
    "2. *Ambulatorial com Comorbidades ou Uso Recente de ATB:*\n" +
    "   • Amoxicilina-Clavulanato 875/125mg VO 12/12h + Azitromicina 500mg VO 1x/dia\n" +
    "   • Alt: Levofloxacino 750mg VO 1x/dia por 5 dias ou Moxifloxacino 400mg 1x/dia\n\n" +
    "3. *Enfermaria (CURB-65 ≥ 2):*\n" +
    "   • Ceftriaxona 1g a 2g EV 1x/dia + Azitromicina 500mg EV/VO 1x/dia\n" +
    "   • Alt: Ampicilina-Sulbactam 1,5g-3g EV 6/6h + Claritromicina 500mg 12/12h\n\n" +
    "4. *UTI / Sala Vermelha (PAC Grave):*\n" +
    "   • Ceftriaxona 2g EV 1x/dia + Levofloxacino 750mg EV 1x/dia (ou Azitro 500mg EV)\n" +
    "   • Se risco de Pseudomonas: Pip-Tazo 4,5g EV 6/6h ou Cefepime 2g EV 8/8h + Levofloxacino\n" +
    "   • Se risco de MRSA: Associar Vancomicina 15-20 mg/kg 12/12h\n\n" +
    "⚠️ *Critérios de Estabilidade para Transição VO:* Afebril > 48h, FC < 100, FR < 24, SatO2 ≥ 92%, tolerando dieta VO.";
  var cache = uxCache();
  var ck = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ck, texto, 21600);
  var botoes = botoesBot([
    [['📋 Copiar Prescrição PAC', 'ux:copiar:' + ck]],
    [['🔙 Consultas de Bolso', 'ux:hub:bolso'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function enviarTelaBolsoAtbITU(chat, messageId) {
  var texto = "🚽 *ANTIBIÓTICOTERAPIA: INFECÇÃO DO TRATO URINÁRIO (ITU)*\n\n" +
    "📋 *Conduta por Apresentação Clínica (SBU / IDSA):*\n\n" +
    "1. *Cistite Não-Complicada (Mulher Jovem):*\n" +
    "   • Fosfomicina Trometamol 3g VO dose única (à noite após esvaziar bexiga)\n" +
    "   • Nitrofurantoína 100mg VO de 6/6h por 5 dias (ou formulação liberação lenta 100mg 12/12h) [Evitar se ClCr < 30]\n" +
    "   • Alt: Sulfametoxazol-Trimetoprima 800/160mg VO 12/12h por 3 dias (apenas se resistência local < 20%)\n\n" +
    "2. *Cistite em Gestante (Tratar Bacteriúria Assintomática e Sintomática):*\n" +
    "   • Cefalexina 500mg VO 6/6h por 7 dias\n" +
    "   • Fosfomicina 3g VO dose única\n" +
    "   • Amoxicilina-Clavulanato 500/125mg VO 8/8h por 7 dias\n" +
    "   • ⛔ Evitar Nitrofurantoína no 1º trimestre e a termo (risco de hemólise fetal)\n\n" +
    "3. *Pielonefrite Aguda / ITU Complicada:*\n" +
    "   • Ceftriaxona 1g EV 1x/dia por 7 a 10 dias\n" +
    "   • Ciprofloxacino 500mg VO 12/12h por 7 dias ou 400mg EV 12/12h (se sensibilidade documentada)\n" +
    "   • Se risco de germe multirresistente / ESBL: Ertapenem 1g EV 1x/dia ou Meropenem 1g EV 8/8h.";
  var cache = uxCache();
  var ck = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ck, texto, 21600);
  var botoes = botoesBot([
    [['📋 Copiar Prescrição ITU', 'ux:copiar:' + ck]],
    [['🔙 Consultas de Bolso', 'ux:hub:bolso'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function enviarTelaBolsoPed(chat, messageId) {
  var texto = "👶 *DOSES PEDIÁTRICAS POR PESO (GUIA PEDBOOK / SBP)*\n\n" +
    "Regras práticas de cálculo e posologia beira-leito:\n\n" +
    "• *Dipirona Solução Oral (500 mg/mL):*\n" +
    "  👉 *1 gota por kg de peso* (dose: ~10 a 15 mg/kg), até 4x/dia (6/6h ou 8/8h se febre/dor)\n" +
    "  _(Teto máximo por dose: 40 gotas = 2 mL = 1g)_\n\n" +
    "• *Paracetamol Gotas (200 mg/mL):*\n" +
    "  👉 *1 gota por kg de peso* (dose: ~10 a 15 mg/kg) de 6/6h\n" +
    "  _(Teto máximo por dose: 35 a 40 gotas | Máximo 4 doses/dia)_\n\n" +
    "• *Amoxicilina Suspensão (250 mg/5 mL):*\n" +
    "  👉 Dose padrão: 50 mg/kg/dia dividida de 8/8h\n" +
    "  👉 OMA / PAC de alto risco: 80-90 mg/kg/dia dividida de 12/12h (Amoxi 400mg/5mL)\n\n" +
    "• *Azitromicina Suspensão (200 mg/5 mL = 40 mg/mL):*\n" +
    "  👉 10 mg/kg/dia 1x/dia por 3 a 5 dias (0,25 mL/kg/dia)\n\n" +
    "• *Prednisolona Solução Oral (3 mg/mL):*\n" +
    "  👉 1 a 2 mg/kg/dia em dose única pela manhã por 3 a 5 dias\n\n" +
    "💡 *Cálculo Livre:* Digite ex: `amoxi 15kg` ou `dipirona 12kg` ou toque nos atalhos:";

  var cache = uxCache();
  var ck = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ck, texto, 21600);

  var botoes = botoesBot([
    [['👶 Dipirona 12kg', 'ux:bolso:ped:dipi12'], ['👶 Amoxi 15kg', 'ux:bolso:ped:amoxi15']],
    [['👶 Prednisolona 10kg', 'ux:bolso:ped:pred10'], ['👶 Azitro 12kg', 'ux:bolso:ped:azitro12']],
    [['📋 Copiar Guia Pediátrico', 'ux:copiar:' + ck]],
    [['🔙 Consultas de Bolso', 'ux:hub:bolso'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function tratarCallbackBolsoPed(chat, acao, messageId) {
  var texto = "";
  if (acao === 'dipi12') {
    texto = "👶 *PRESCRIÇÃO PEDIÁTRICA: DIPIRONA (12 KG)*\n\n" +
      "📋 *Receituário / Conduta:* \n" +
      "1. *Dipirona gotas 500 mg/mL* ------------ 1 frasco\n" +
      "   👉 Dar *12 gotas* por via oral de 6/6 horas se temperatura axilar ≥ 37,8°C ou dor moderada/forte.\n\n" +
      "🧮 *Memória de Cálculo:*\n" +
      "• Dose alvo: 12,5 mg/kg = 150 mg\n" +
      "• Concentração: 500 mg/mL (1 mL = 20 gotas = 25 mg/gota)\n" +
      "• 150 mg ÷ 25 mg/gota = 12 gotas (1 gota/kg)\n" +
      "• Teto de segurança: 40 gotas (1.000 mg) por tomada.";
  } else if (acao === 'amoxi15') {
    texto = "👶 *PRESCRIÇÃO PEDIÁTRICA: AMOXICILINA (15 KG)*\n\n" +
      "📋 *Receituário / Conduta:* \n" +
      "1. *Amoxicilina suspensão oral 250 mg/5 mL* ------------ 2 frascos\n" +
      "   👉 Dar *5,0 mL* por via oral de 8/8 horas por 7 a 10 dias.\n" +
      "   _(Para OMA ou PAC de alto risco a 90 mg/kg/dia: utilizar suspensão 400 mg/5 mL, 8,5 mL de 12/12h)_\n\n" +
      "🧮 *Memória de Cálculo (Dose Padrão 50 mg/kg/dia):*\n" +
      "• Dose total diária: 15 kg × 50 mg/kg/dia = 750 mg/dia\n" +
      "• Dividida em 3 tomadas (8/8h): 250 mg por dose\n" +
      "• Apresentação 250 mg/5 mL (50 mg/mL): 250 ÷ 50 = 5,0 mL por tomada.";
  } else if (acao === 'pred10') {
    texto = "👶 *PRESCRIÇÃO PEDIÁTRICA: PREDNISOLONA (10 KG)*\n\n" +
      "📋 *Receituário / Conduta:* \n" +
      "1. *Prednisolona solução oral 3 mg/mL* ------------ 1 frasco\n" +
      "   👉 Dar *3,3 mL* (10 mg) por via oral 1 vez ao dia, pela manhã, por 3 a 5 dias.\n\n" +
      "🧮 *Memória de Cálculo (1 mg/kg/dia):*\n" +
      "• Dose diária: 10 kg × 1 mg/kg = 10 mg\n" +
      "• Apresentação 3 mg/mL: 10 mg ÷ 3 mg/mL = 3,33 mL/dia\n" +
      "• Não necessita desmame se curso < 7 a 14 dias.";
  } else if (acao === 'azitro12') {
    texto = "👶 *PRESCRIÇÃO PEDIÁTRICA: AZITROMICINA (12 KG)*\n\n" +
      "📋 *Receituário / Conduta:* \n" +
      "1. *Azitromicina suspensão oral 200 mg/5 mL (40 mg/mL)* ------------ 1 frasco\n" +
      "   👉 Dar *3,0 mL* (120 mg) por via oral 1 vez ao dia durante 3 dias consecutivos (ou 5 dias).\n\n" +
      "🧮 *Memória de Cálculo (10 mg/kg/dia):*\n" +
      "• Dose diária: 12 kg × 10 mg/kg = 120 mg/dia\n" +
      "• Apresentação 40 mg/mL: 120 mg ÷ 40 mg/mL = 3,0 mL/dia\n" +
      "• Teto máximo pediátrico: 500 mg/dia.";
  } else {
    return enviarTelaBolsoPed(chat, messageId);
  }

  var cache = uxCache();
  var ck = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ck, texto, 21600);

  var botoes = botoesBot([
    [['📋 Copiar Prescrição Pediátrica', 'ux:copiar:' + ck]],
    [['🔙 Consultas de Bolso', 'ux:hub:bolso'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function enviarTelaBolsoGestacao(chat, messageId) {
  var texto = "🤰 *GESTAÇÃO & LACTAÇÃO · SEGURANÇA FARMACOLÓGICA*\n\n" +
    "Classificação de risco beira-leito (FEBRASGO / FDA / MS):\n\n" +
    "• *Analgésicos & Antitérmicos:*\n" +
    "  ✅ *Paracetamol:* 1ª escolha em qualquer trimestre (500mg-750mg até 6/6h).\n" +
    "  ⚠️ *Dipirona:* Usar apenas se estritamente necessário; evitar uso contínuo no 3º trimestre.\n" +
    "  ⛔ *AINEs (Ibuprofeno, Cetoprofeno, Diclofenaco):* CONTRAINDICADOS no 3º trimestre (fechamento prematuro do canal arterial e oligoidrâmnio).\n\n" +
    "• *Anti-hipertensivos na Gestação:*\n" +
    "  ✅ *Metildopa:* 250mg a 500mg VO 8/8h ou 12/12h (1ª linha crônica).\n" +
    "  ✅ *Nifedipino retard:* 20mg a 40mg VO 12/12h.\n" +
    "  ✅ *Hidralazina:* 5mg EV lento em crises hipertensivas.\n" +
    "  ⛔ *IECA e BRA:* ABSOLUTAMENTE CONTRAINDICADOS (teratogênicos, anúria neonatal, hipoplasia pulmonar).\n\n" +
    "• *Antibióticos Seguros:*\n" +
    "  ✅ Penicilinas (Amoxicilina), Cefalosporinas (Cefalexina, Ceftriaxona), Macrolídeos (Azitromicina).\n" +
    "  ⛔ Quinolonas, Tetraciclinas, Sulfas no termo.\n\n" +
    "• *Antieméticos Seguros:*\n" +
    "  ✅ Dimenidrinato + Piridoxina (Vitamina B6), Metoclopramida, Ondansetrona.\n\n" +
    "💡 *Auditoria Livre:* Envie `/prenatal med Enalapril, Sinvastatina` ou selecione:";

  var cache = uxCache();
  var ck = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ck, texto, 21600);

  var botoes = botoesBot([
    [['💊 Analgesia na Gestante', 'ux:bolso:gest:analgesia'], ['💊 Anti-hipertensivos', 'ux:bolso:gest:has']],
    [['🦠 ATB na Gestante', 'ux:bolso:gest:atb'], ['🤮 Antieméticos', 'ux:bolso:gest:antiem']],
    [['📋 Copiar Guia Gestação', 'ux:copiar:' + ck]],
    [['🔙 Consultas de Bolso', 'ux:hub:bolso'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function tratarCallbackBolsoGestacao(chat, acao, messageId) {
  var texto = "";
  if (acao === 'analgesia') {
    texto = "🤰 *ANALGESIA & CONTROLE DA DOR NA GESTANTE (FEBRASGO)*\n\n" +
      "1. *Primeira Linha (Seguro em todos os trimestres):*\n" +
      "   • *Paracetamol 500mg a 750mg VO* de 6/6h se dor ou febre (dose máx: 3g/dia).\n\n" +
      "2. *Segunda Linha (Dor Moderada/Forte com Cautela):*\n" +
      "   • *Dipirona 500mg a 1g VO/EV* de 6/6h se dor refratária (evitar uso prolongado no 3º tri).\n\n" +
      "3. *Dor Intensa / Emergência Obstétrica:*\n" +
      "   • *Morfina 2mg a 4mg EV* ou *Meperidina* sob monitorização materno-fetal.\n\n" +
      "⛔ *CONTRAINDICAÇÃO FORMAL:* \n" +
      "• AINEs (Ibuprofeno, Cetoprofeno, Nimesulida, Diclofenaco) no 3º trimestre (> 28-30 semanas) causam fechamento precoce do canal arterial, hipertensão pulmonar persistente neonatal e oligoidrâmnio.";
  } else if (acao === 'has') {
    texto = "🤰 *ANTI-HIPERTENSIVOS NA GESTAÇÃO (FEBRASGO / ACOG)*\n\n" +
      "1. *Controle Crônico / Manutenção Ambulatorial:*\n" +
      "   • *Metildopa 250mg a 500mg VO* de 8/8h ou 12/12h (dose máx: 2g/dia) - 1ª linha consagrada.\n" +
      "   • *Nifedipino retard 20mg a 40mg VO* de 12/12h (dose máx: 80mg/dia).\n\n" +
      "2. *Crise Hipertensiva na Gestante (PA ≥ 160x110 mmHg):*\n" +
      "   • *Hidralazina 5mg EV* lento em 2 min; repetir 5-10mg a cada 20 min se necessário (máx: 20mg).\n" +
      "   • Alt: *Nifedipino 10-20mg VO* (nunca sublingual).\n\n" +
      "3. *Prevenção de Eclâmpsia:*\n" +
      "   • *Sulfato de Magnésio (Pritchard ou Zuspan)* se sinais premonitórios de pré-eclâmpsia grave.\n\n" +
      "⛔ *CONTRAINDICAÇÃO ABSOLUTA:* IECA (Enalapril, Captopril) e BRA (Losartana) - teratogênicos e nefrotóxicos fetais.";
  } else if (acao === 'atb') {
    texto = "🤰 *ANTIBIÓTICOS SEGUROS NA GESTAÇÃO (FEBRASGO / CDC)*\n\n" +
      "✅ *CLASSES SEGURAS (Categoria B):*\n" +
      "• *Penicilinas:* Amoxicilina 500mg 8/8h, Ampicilina 1-2g EV 6/6h, Benzetacil 2,4M UI IM.\n" +
      "• *Cefalosporinas:* Cefalexina 500mg 6/6h, Cefazolina 1-2g EV 8/8h, Ceftriaxona 1-2g EV 1x/dia.\n" +
      "• *Macrolídeos:* Azitromicina 500mg 1x/dia, Eritromicina.\n" +
      "• *Outros:* Fosfomicina 3g dose única (excelente p/ ITU), Clindamicina 300-600mg EV/VO.\n\n" +
      "⛔ *CONTRAINDICADOS NA GESTAÇÃO:*\n" +
      "• *Quinolonas (Cipro/Levo):* Toxicidade articular e lesão cartilaginosa fetal.\n" +
      "• *Tetraciclinas (Doxiciclina):* Manchas ósseas e dentárias permanentes.\n" +
      "• *Sulfas (Bactrim):* Evitar no 1º tri (antagonista fólico) e no 3º tri (kernicterus).\n" +
      "• *Aminoglicosídeos (Genta/Amica):* Ototoxicidade e nefrotoxicidade fetal (usar só com risco de vida).";
  } else if (acao === 'antiem') {
    texto = "🤰 *ANTIEMÉTICOS & HIPERÊMESE GRAVÍDICA (FEBRASGO)*\n\n" +
      "1. *Primeira Linha (Náuseas Leves a Moderadas):*\n" +
      "   • *Piridoxina (Vitamina B6) 10mg a 25mg VO* de 8/8h.\n" +
      "   • *Dimenidrinato 50mg + Piridoxina 10mg (Dramin B6) VO* de 8/8h ou 6/6h.\n\n" +
      "2. *Segunda Linha (Persistência dos Sintomas):*\n" +
      "   • *Metoclopramida 10mg VO ou EV* de 8/8h (atenção a sintomas extrapiramidais).\n\n" +
      "3. *Terceira Linha / Vômitos Refratários / Internação:*\n" +
      "   • *Ondansetrona 4mg a 8mg EV ou VO* até de 8/8h (preferir após o 1º trimestre).\n" +
      "   • Hidratação venosa com SG 5% + SF 0,9% + Tiamina 100mg EV (prevenir Encefalopatia de Wernicke).";
  } else {
    return enviarTelaBolsoGestacao(chat, messageId);
  }

  var cache = uxCache();
  var ck = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ck, texto, 21600);

  var botoes = botoesBot([
    [['📋 Copiar Conduta Gestação', 'ux:copiar:' + ck]],
    [['🔙 Consultas de Bolso', 'ux:hub:bolso'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function enviarTelaBolsoInteracao(chat, messageId) {
  var texto = "⚠️ *INTERAÇÕES MEDICAMENTOSAS GRAVES & CROSSCHECK FARMACÊUTICO*\n\n" +
    "Alertas sentinela de combinações de altíssimo risco no plantão:\n\n" +
    "1. *Prolongamento de Intervalo QT & Torsades de Pointes:*\n" +
    "   • Amiodarona + Azitromicina / Ciprofloxacino / Fluconazol / Haloperidol\n" +
    "   👉 *Conduta:* Monitorar ECG contínuo, dosar K+ e Mg2+; preferir Ceftriaxona ou Amoxicilina se foco respiratório.\n\n" +
    "2. *Hemorragia Digestiva & Sangramento Maior:*\n" +
    "   • Varfarina / DOAC (Apixabana, Rivaroxabana) + AINEs ou AAS duplo ou Fluconazol\n" +
    "   👉 *Conduta:* Contraindicar AINEs em pacientes anticoagulados. Para dor, prescrever Dipirona ou Paracetamol.\n\n" +
    "3. *Hipercalemia Grave / Arritmia Ventricular Fatal:*\n" +
    "   • Espironolactona + IECA (Enalapril) / BRA (Losartana) + Suplemento de K+\n" +
    "   👉 *Conduta:* Monitorar K+ sérico e função renal em 48-72h. Não associar cloreto de potássio empírico.\n\n" +
    "4. *Síndrome Serotoninérgica (Rigidez, Clonus, Hipertermia):*\n" +
    "   • Tramadol / Fentanil + ISRS (Fluoxetina, Sertralina) ou Linezolida\n\n" +
    "5. *Hipotensão Refratária & Choque Grave:*\n" +
    "   • Nitratos (Monocordil, Isossorbida, Tridil) + Inibidores da 5-PDE (Sildenafila, Tadalafila)\n" +
    "   👉 *Conduta:* CONTRAINDICAÇÃO ABSOLUTA nas últimas 24h (Sildenafila) a 48h (Tadalafila).\n\n" +
    "💡 *Checagem Personalizada:* Envie `/interacao amiodarona fluconazol` ou toque nos botões:";

  var cache = uxCache();
  var ck = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ck, texto, 21600);

  var botoes = botoesBot([
    [['⚠️ Amiodarona + Fluconazol', 'ux:bolso:inte:amio_fluco'], ['⚠️ Varfarina + AINE', 'ux:bolso:inte:varf_aine']],
    [['⚠️ IECA + Espironolactona', 'ux:bolso:inte:ieca_espiro'], ['⚠️ Nitrato + Sildenafila', 'ux:bolso:inte:nitrato_sild']],
    [['📋 Copiar Guia Interações', 'ux:copiar:' + ck]],
    [['🔙 Consultas de Bolso', 'ux:hub:bolso'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function tratarCallbackBolsoInteracao(chat, acao, messageId) {
  var texto = "";
  if (acao === 'amio_fluco') {
    texto = "⚠️ *INTERAÇÃO GRAVE: AMIODARONA + FLUCONAZOL*\n\n" +
      "🔴 *Nível de Risco:* Gravidade Extrema / Crítica\n" +
      "⚡ *Mecanismo Farmacológico:*\n" +
      "• Efeito aditivo de prolongamento do intervalo QT no miocárdio ventricular.\n" +
      "• Potente inibição enzimática do CYP2C9 e CYP3A4 pelo fluconazol, elevando acentuadamente as concentrações séricas de amiodarona.\n\n" +
      "💥 *Risco Clínico:* Torsades de Pointes, Taquicardia Ventricular Polimórfica e PCR em Fibrilação Ventricular.\n\n" +
      "🛡️ *Conduta Beira-Leito:*\n" +
      "1. Evitar associação sempre que possível (trocar antifúngico se viável).\n" +
      "2. Monitorização eletrocardiográfica contínua com cálculo de QTc.\n" +
      "3. Manter Potássio sérico ≥ 4,5 mEq/L e Magnésio ≥ 2,0 mg/dL.\n" +
      "4. Se QTc > 500 ms: Suspender imediatamente.";
  } else if (acao === 'varf_aine') {
    texto = "⚠️ *INTERAÇÃO GRAVE: ANTICOAGULANTE + AINE*\n\n" +
      "🔴 *Nível de Risco:* Alto Risco de Hemorragia com Risco de Vida\n" +
      "⚡ *Mecanismo Farmacológico:*\n" +
      "• AINEs causam lesão e erosão direta da mucosa gastrointestinal por inibição de prostaglandinas protetoras (COX-1).\n" +
      "• Inibição funcional da agregação plaquetária somada à inibição dos fatores de coagulação pela Varfarina ou DOACs.\n\n" +
      "💥 *Risco Clínico:* Hemorragia digestiva alta/baixa grave, hematomas espontâneos e AVC hemorrágico.\n\n" +
      "🛡️ *Conduta Beira-Leito:*\n" +
      "1. CONTRAINDICAR AINEs em pacientes em uso de anticoagulação plena.\n" +
      "2. Para analgesia, prescrever Dipirona ou Paracetamol.\n" +
      "3. Se dor neuropática/osteomuscular refratária: associar analgésicos de ação central ou opioides fracos sob cautela.\n" +
      "4. Se uso de AINE for estritamente mandatório: associar IBP (Omeprazol 40mg/dia) e limitar ao menor período possível.";
  } else if (acao === 'ieca_espiro') {
    texto = "⚠️ *INTERAÇÃO GRAVE: IECA/BRA + ESPIRONOLACTONA*\n\n" +
      "🔴 *Nível de Risco:* Moderado a Grave (Hipercalemia Potencialmente Fatal)\n" +
      "⚡ *Mecanismo Farmacológico:*\n" +
      "• Duplo bloqueio do eixo renina-angiotensina-aldosterona: redução da secreção tubular distal de potássio.\n\n" +
      "💥 *Risco Clínico:* Hipercalemia grave (K+ > 6,0 mEq/L), BAV total, arritmias ventriculares complexas e parada cardíaca em assistolia.\n\n" +
      "🛡️ *Conduta Beira-Leito:*\n" +
      "1. Dosar K+ sérico e Creatinina/TFG antes do início e em 7 a 14 dias.\n" +
      "2. CONTRAINDICAR associação se K+ basal > 5,0 mEq/L ou ClCr < 30 mL/min.\n" +
      "3. NUNCA prescrever suplementação empírica de Cloreto de Potássio (Slow-K).\n" +
      "4. Alertar o paciente quanto a sintomas de fraqueza muscular ascendente, parestesias e palpitações.";
  } else if (acao === 'nitrato_sild') {
    texto = "⚠️ *INTERAÇÃO FATAL: NITRATO + INIBIDOR DA 5-FOSFODIESTERASE*\n\n" +
      "⛔ *Nível de Risco:* CONTRAINDICAÇÃO ABSOLUTA (Risco de Óbito Imediato)\n" +
      "⚡ *Mecanismo Farmacológico:*\n" +
      "• Nitratos promovem síntese de óxido nítrico e ativação da Guanilato Ciclase (GMPc).\n" +
      "• Inibidores da 5-PDE (Sildenafila, Tadalafila) bloqueiam a degradação de GMPc.\n" +
      "• Acúmulo maciço e descontrolado de GMPc nas células musculares lisas vasculares.\n\n" +
      "💥 *Risco Clínico:* Vasodilatação sistêmica severa, colapso hemodinâmico, choque distributivo refratário e isquemia miocárdica fatal.\n\n" +
      "🛡️ *Conduta Beira-Leito:*\n" +
      "1. Jamais administrar Nitratos (Isossorbida, Monocordil, Nitroglicerina, Nitroprussiato) se uso de Sildenafila nas últimas 24 horas ou Tadalafila nas últimas 48 horas.\n" +
      "2. Em SCA com uso recente de 5-PDE: analgesia com Morfina, Betabloqueador, Estatina, AAS e Heparina; evitar nitratos.";
  } else {
    return enviarTelaBolsoInteracao(chat, messageId);
  }

  var cache = uxCache();
  var ck = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ck, texto, 21600);

  var botoes = botoesBot([
    [['📋 Copiar Alerta de Interação', 'ux:copiar:' + ck]],
    [['🔙 Consultas de Bolso', 'ux:hub:bolso'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function enviarTelaBolsoHSL(chat, messageId) {
  var texto = "💉 *DILUIÇÃO & PREPARO RÁPIDO DE INJETÁVEIS (GUIA HSL)*\n\n" +
    "Soluções padrão, vias e tempos de infusão segura beira-leito:\n\n" +
    "• *Ceftriaxona 1g a 2g EV:*\n" +
    "  👉 Diluição: Reconstituir em 10 mL AD; diluir em 100 mL SF 0,9% ou SG 5%.\n" +
    "  👉 Tempo de infusão: Correr em 30 a 60 minutos.\n" +
    "  ⛔ *ALERTA:* NUNCA diluir em soluções com Cálcio (Ringer Lactato) - risco de precipitação fatal pulmonar/renal.\n\n" +
    "• *Vancomicina 1g EV:*\n" +
    "  👉 Diluição: Reconstituir frasco em 10 mL AD; diluir em 200 a 250 mL SF 0,9% (conc. ≤ 5 mg/mL).\n" +
    "  👉 Tempo de infusão: No mínimo 60 a 120 minutos em bomba de infusão.\n" +
    "  ⚠️ *ALERTA:* Infusão rápida causa Síndrome do Homem Vermelho e hipotensão.\n\n" +
    "• *Meropenem 1g EV:*\n" +
    "  👉 Diluição: Reconstituir em 20 mL AD; diluir em 100 mL SF 0,9%.\n" +
    "  👉 Tempo: 30 minutos (ou infusão estendida em 3h para sepse grave/CTI).\n\n" +
    "• *Noradrenalina (Solução Concentrada Adulto):*\n" +
    "  👉 Preparo: 4 ampolas (16 mg = 16 mL) + 234 mL SG 5% (Total: 250 mL; conc: 64 mcg/mL).\n" +
    "  👉 Infusão: Bomba de infusão contínua, preferencialmente Acesso Venoso Central (CVC).\n\n" +
    "• *Dipirona 1g (2 mL) EV:*\n" +
    "  👉 Diluição: Diluir em 100 mL SF 0,9% correr em 15 a 20 minutos (evita vasodilatação abrupta).\n\n" +
    "💡 *Consulta de qualquer fármaco:* Digite `/dose ceftriaxona` ou toque nos botões:";

  var cache = uxCache();
  var ck = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ck, texto, 21600);

  var botoes = botoesBot([
    [['💉 Ceftriaxona EV', 'ux:bolso:hsl:ceftri'], ['💉 Vancomicina EV', 'ux:bolso:hsl:vanco']],
    [['💉 Meropenem EV', 'ux:bolso:hsl:mero'], ['💉 Noradrenalina', 'ux:bolso:hsl:nora']],
    [['📋 Copiar Guia Diluição', 'ux:copiar:' + ck]],
    [['🔙 Consultas de Bolso', 'ux:hub:bolso'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function tratarCallbackBolsoHSL(chat, acao, messageId) {
  var texto = "";
  if (acao === 'ceftri') {
    texto = "💉 *DILUIÇÃO HSL: CEFTRIAXONA EV (1G A 2G)*\n\n" +
      "📦 *Apresentação:* Frasco-ampola com pó liofilizado de 1g.\n" +
      "🧪 *Reconstituição:* Adicionar 10 mL de Água Destilada (AD). Homogeneizar até dissolução completa.\n" +
      "💧 *Diluição:* Diluir a dose (1g ou 2g) em 100 mL de SF 0,9% ou SG 5%.\n" +
      "⏱️ *Tempo de Infusão:* Correr em 30 a 60 minutos por via endovenosa.\n" +
      "🧊 *Estabilidade:* 24 horas em temperatura ambiente (15-30°C) ou 7 dias sob refrigeração (2-8°C).\n\n" +
      "⛔ *CONTRAINDICAÇÃO SENTINELA:* NUNCA diluir ou infundir simultaneamente em soluções contendo Cálcio (ex: Ringer Lactato). Risco de precipitação de cristais de ceftriaxona-cálcio em pulmões e rins com desfecho fatal.";
  } else if (acao === 'vanco') {
    texto = "💉 *DILUIÇÃO HSL: VANCOMICINA EV (500MG A 1G)*\n\n" +
      "📦 *Apresentação:* Frasco-ampola de 500mg ou 1g.\n" +
      "🧪 *Reconstituição:* Adicionar 10 mL de Água Destilada para frasco de 500mg (ou 20 mL p/ 1g).\n" +
      "💧 *Diluição:* \n" +
      "• 500 mg: diluir em no mínimo 100 mL de SF 0,9% ou SG 5%.\n" +
      "• 1.000 mg (1g): diluir em no mínimo 200 a 250 mL de SF 0,9% ou SG 5%.\n" +
      "• Concentração máxima recomendada: 5 mg/mL (em restrição hídrica severa via CVC, máx 10 mg/mL).\n\n" +
      "⏱️ *Tempo de Infusão:* No mínimo 60 minutos para cada 500mg a 1g (dose de 1g = infusão em 60 a 120 minutos).\n" +
      "⚠️ *ALERTA BEIRA-LEITO:* Infusão rápida (< 60 min) desencadeia Síndrome do Homem Vermelho (eritema, prurido, hipotensão e broncoespasmo por histamina). Se ocorrer, pausar infusão, aplicar anti-histamínico e reiniciar com taxa reduzida pela metade.";
  } else if (acao === 'mero') {
    texto = "💉 *DILUIÇÃO HSL: MEROPENEM EV (500MG A 1G)*\n\n" +
      "📦 *Apresentação:* Frasco-ampola com 500mg ou 1.000mg.\n" +
      "🧪 *Reconstituição:* Adicionar 10 mL de AD para 500mg (ou 20 mL de AD para 1g).\n" +
      "💧 *Diluição:* Diluir a dose reconstituída em 100 mL de SF 0,9% ou SG 5%.\n" +
      "⏱️ *Tempo de Infusão:* \n" +
      "• Infusão intermitente padrão: 30 minutos.\n" +
      "• Infusão estendida (sepse grave, CTI, germes com MIC elevado): 3 horas em bomba de infusão para maximizar o tempo acima da MIC (T > MIC).\n" +
      "🧊 *Estabilidade:* Em SF 0,9%: até 3 horas em temperatura ambiente ou 24 horas refrigerado. Em SG 5%: estabilidade reduzida (infundir imediatamente).";
  } else if (acao === 'nora') {
    texto = "💉 *PREPARO & INFUSÃO: NORADRENALINA (BITARTARATO)*\n\n" +
      "📦 *Apresentação:* Ampola de 4 mL (conc: 2 mg/mL de bitartarato de norepinefrina = 1 mg/mL de base).\n" +
      "🧪 *Preparo Padronizado Adulto (Solução Concentrada 64 mcg/mL):*\n" +
      "• 4 ampolas (16 mL = 16 mg) + 234 mL de SG 5% (Volume total = 250 mL).\n" +
      "💧 *Diluente de Escolha:* SG 5% (a glicose protege a noradrenalina da oxidação e perda de potência; SF 0,9% não é recomendado pelo HSL como 1ª escolha).\n" +
      "⏱️ *Administração:* Exclusivamente em Bomba de Infusão Contínua (BIC).\n" +
      "🛡️ *Acesso Venoso:* Preferencialmente via Acesso Venoso Central (CVC). Em emergência, usar veia periférica calibrosa de antebraço por no máximo 2-4h até obtenção de CVC.\n" +
      "💡 *Cálculo de Vazão:* Use o comando `/dva nora 70` para calcular taxa de infusão exata em mL/h por peso.";
  } else {
    return enviarTelaBolsoHSL(chat, messageId);
  }

  var cache = uxCache();
  var ck = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ck, texto, 21600);

  var botoes = botoesBot([
    [['📋 Copiar Guia de Diluição', 'ux:copiar:' + ck]],
    [['🔙 Consultas de Bolso', 'ux:hub:bolso'], ['🏠 Início', 'ux:hub:inicio']]
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

  if (text === '/fila') {
    mostrarFilaTelegram(chat);
    return true;
  }
  if (/^\/pedido\s+(?:inbox_)?\d+$/.test(text)) {
    var numPedido = text.split(/\s+/)[1].replace(/^inbox_/, '');
    var job = recuperarRegistroBot('inbox_' + numPedido);
    var original = job && job.update && (job.update.message || {}).text;
    enviarMensagemParaChat(chat, original ? '*Pedido preservado*\n\n' + original : (job ? 'Pedido sem texto disponível; confira o áudio ou a imagem original no chat.' : 'Pedido não encontrado.'));
    return true;
  }

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
  if (text === '💊 Consultas de Bolso' || text === '💊 REMUME Rápida') {
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
      if (v === 'soap') return enviarTelaAmbSoap(chat, msgId);
      else if (v === 'remume') return enviarTelaAmbRemume(chat, msgId);
      else if (v === 'cid') return enviarTelaAmbCid(chat, msgId);
      else if (v === 'atestado') return enviarTelaAmbAtestado(chat, msgId);
      else if (v === 'ef') return enviarTelaAmbExameFisico(chat, msgId);
      else if (v === 'sisreg') return enviarTelaAmbSisreg(chat, msgId);
      else if (v.indexOf('cid:') === 0) return tratarCallbackAmbCid(chat, v.replace('cid:', ''), msgId);
      else if (v.indexOf('atest:') === 0) return tratarCallbackAmbAtestado(chat, v.replace('atest:', ''), msgId);
      else if (v.indexOf('atestado:') === 0) return tratarCallbackAmbAtestado(chat, v.replace('atestado:', ''), msgId);
      else if (v.indexOf('remume:') === 0) return tratarCallbackAmbRemume(chat, v.replace('remume:', ''), msgId);
      else if (v.indexOf('soap:') === 0) return tratarCallbackAmbSoap(chat, v.replace('soap:', ''), msgId);
      else return enviarMenuAmbulatorio(chat, msgId);
    } else if (op === 'bolso') {
      if (v === 'atb') return enviarTelaBolsoATB(chat, msgId);
      else if (v === 'ped') return enviarTelaBolsoPed(chat, msgId);
      else if (v === 'gestacao') return enviarTelaBolsoGestacao(chat, msgId);
      else if (v === 'interacao') return enviarTelaBolsoInteracao(chat, msgId);
      else if (v === 'hsl') return enviarTelaBolsoHSL(chat, msgId);
      else if (v === 'atb:pac') return enviarTelaBolsoAtbPAC(chat, msgId);
      else if (v === 'atb:itu') return enviarTelaBolsoAtbITU(chat, msgId);
      else if (v.indexOf('ped:') === 0) return tratarCallbackBolsoPed(chat, v.replace('ped:', ''), msgId);
      else if (v.indexOf('gest:') === 0) return tratarCallbackBolsoGestacao(chat, v.replace('gest:', ''), msgId);
      else if (v.indexOf('inte:') === 0) return tratarCallbackBolsoInteracao(chat, v.replace('inte:', ''), msgId);
      else if (v.indexOf('hsl:') === 0) return tratarCallbackBolsoHSL(chat, v.replace('hsl:', ''), msgId);
      else return enviarMenuConsultasBolso(chat, msgId);
    } else if (op === 'emerg') {
      if (v === 'choque') return enviarMenuEmergChoque(chat, msgId);
      else if (v === 'glasgow') return enviarMenuEmergGlasgow(chat, msgId);
      else if (v === 'crisehas') return enviarMenuEmergCriseHas(chat, msgId);
      else if (v === 'dengue') return enviarMenuEmergDengue(chat, msgId);
      else if (v === 'cefaleia') return enviarMenuEmergCefaleia(chat, msgId);
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
    enviarTelaAmbSoap: enviarTelaAmbSoap,
    tratarCallbackAmbSoap: tratarCallbackAmbSoap,
    enviarTelaAmbRemume: enviarTelaAmbRemume,
    tratarCallbackAmbRemume: tratarCallbackAmbRemume,
    enviarTelaAmbCid: enviarTelaAmbCid,
    tratarCallbackAmbCid: tratarCallbackAmbCid,
    enviarTelaAmbAtestado: enviarTelaAmbAtestado,
    tratarCallbackAmbAtestado: tratarCallbackAmbAtestado,
    enviarTelaAmbExameFisico: enviarTelaAmbExameFisico,
    enviarTelaAmbSisreg: enviarTelaAmbSisreg,
    enviarMenuConsultasBolso: enviarMenuConsultasBolso,
    enviarTelaBolsoATB: enviarTelaBolsoATB,
    enviarTelaBolsoAtbPAC: enviarTelaBolsoAtbPAC,
    enviarTelaBolsoAtbITU: enviarTelaBolsoAtbITU,
    enviarTelaBolsoPed: enviarTelaBolsoPed,
    tratarCallbackBolsoPed: tratarCallbackBolsoPed,
    enviarTelaBolsoGestacao: enviarTelaBolsoGestacao,
    tratarCallbackBolsoGestacao: tratarCallbackBolsoGestacao,
    enviarTelaBolsoInteracao: enviarTelaBolsoInteracao,
    tratarCallbackBolsoInteracao: tratarCallbackBolsoInteracao,
    enviarTelaBolsoHSL: enviarTelaBolsoHSL,
    tratarCallbackBolsoHSL: tratarCallbackBolsoHSL,
    enviarMenuEnfermaria: enviarMenuEnfermaria,
    enviarMenuGinecologiaObstetricia: enviarMenuGinecologiaObstetricia,
    enviarMenuEmergDengue: enviarMenuEmergDengue,
    enviarMenuEmergCriseHas: enviarMenuEmergCriseHas,
    enviarMenuEmergGlasgow: enviarMenuEmergGlasgow,
    enviarMenuEmergChoque: enviarMenuEmergChoque,
    enviarMenuEmergCefaleia: enviarMenuEmergCefaleia,
    tratarEntradaUX: tratarEntradaUX,
    tratarCallbackUX: tratarCallbackUX,
    extrairPlanoDeTextoSoap: extrairPlanoDeTextoSoap,
    executarExtracaoReceitaSoap: executarExtracaoReceitaSoap
  };
}
