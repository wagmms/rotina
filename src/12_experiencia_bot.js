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

function _resolverDominio(nome) {
  if (typeof require !== 'function') return null;
  try { return require('./domain/' + nome); } catch (_) {}
  try { return require('../src/domain/' + nome); } catch (_) {}
  try { return require('./src/domain/' + nome); } catch (_) {}
  return null;
}

var DiluicaoInjetaveisDomain = _resolverDominio('diluicao_injetaveis_domain');
var PacotesSindromicosDomain = _resolverDominio('pacotes_sindromicos_domain');
var ChecklistClinicoDomain = _resolverDominio('checklist_clinico_domain');
var TimeBlockingOptimizerDomain = _resolverDominio('time_blocking_optimizer_domain');

var _instDiluicaoDomain = null;
function obterDiluicaoDomain() {
  if (!_instDiluicaoDomain && DiluicaoInjetaveisDomain) _instDiluicaoDomain = new DiluicaoInjetaveisDomain();
  return _instDiluicaoDomain;
}

var _instPacotesDomain = null;
function obterPacotesDomain() {
  if (!_instPacotesDomain && PacotesSindromicosDomain) _instPacotesDomain = new PacotesSindromicosDomain();
  return _instPacotesDomain;
}

var _instChecklistDomain = null;
function obterChecklistDomain() {
  if (!_instChecklistDomain && ChecklistClinicoDomain) _instChecklistDomain = new ChecklistClinicoDomain();
  return _instChecklistDomain;
}

var _instTimeBlockingDomain = null;
function obterTimeBlockingDomain() {
  if (!_instTimeBlockingDomain && TimeBlockingOptimizerDomain) _instTimeBlockingDomain = new TimeBlockingOptimizerDomain();
  return _instTimeBlockingDomain;
}

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

/** Edita a tela in-place; trata "message is not modified" e mensagens não editáveis com fallback seguro anti-flood. */
var _ultimoEnvioTelaTimestamp = {};

function enviarTelaBot(chat, texto, kb, messageId) {
  if (messageId && String(texto).length < UX_MAX_EDIT_CHARS) {
    var agora = Date.now();
    var chaveThrottle = String(chat) + '_' + String(messageId);
    var deltaEnvio = agora - (_ultimoEnvioTelaTimestamp[chaveThrottle] || 0);

    // Cooldown defensivo anti-429: se duas edições quase simultâneas (< 40ms) ocorrerem, protege o limite da API
    if (deltaEnvio < 40 && typeof Utilities !== 'undefined' && typeof Utilities.sleep === 'function') {
      try { Utilities.sleep(40); } catch (_) {}
    }
    _ultimoEnvioTelaTimestamp[chaveThrottle] = Date.now();

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

/* ========== Fábrica Modular de Teclados (UX Keyboard Builder) ========== */

var UX_BOTAO_INICIO = ['🏠 Início', 'ux:hub:inicio'];

var UX_DESTINOS_RODAPE = {
  menu: [['🔙 Voltar ao Menu', 'ux:menu'], UX_BOTAO_INICIO],
  sala: [['🔙 Sala Vermelha', 'ux:hub:sala'], UX_BOTAO_INICIO],
  enf: [['🔙 Enfermaria', 'ux:hub:enf'], UX_BOTAO_INICIO],
  amb: [['🔙 Ambulatório', 'ux:hub:amb'], UX_BOTAO_INICIO],
  calc: [['🔙 Calculadoras', 'ux:hub:calc'], UX_BOTAO_INICIO],
  bolso: [['🔙 Consultas de Bolso', 'ux:hub:bolso'], UX_BOTAO_INICIO],
  leitos: [['🔙 Painel de Leitos', 'ux:painel:0'], UX_BOTAO_INICIO],
  go: [['🔙 Hub G&O', 'ux:rotina:go'], UX_BOTAO_INICIO],
  dva: [['← Trocar medicamento', 'ux:dvamenu'], ['🔙 Sala Vermelha', 'ux:hub:sala']]
};

function uxLinhaNavegacao(destino) {
  if (!destino) return null;
  if (typeof destino === 'string' && UX_DESTINOS_RODAPE[destino]) {
    return UX_DESTINOS_RODAPE[destino];
  }
  if (Array.isArray(destino)) {
    if (destino.length > 0 && Array.isArray(destino[0])) {
      return destino;
    }
    return [destino, UX_BOTAO_INICIO];
  }
  return null;
}

function uxCriarTeclado(linhas, destinoNavegacao) {
  var matriz = Array.isArray(linhas) ? linhas.slice() : [];
  var rodape = uxLinhaNavegacao(destinoNavegacao);
  if (rodape) {
    matriz.push(rodape);
  }
  return botoesBot(matriz);
}

function uxCriarTecladoGrade(itens, colunas, destinoNavegacao) {
  var cols = colunas || 2;
  var matriz = [];
  var linhaAtual = [];
  var lista = Array.isArray(itens) ? itens : [];

  for (var i = 0; i < lista.length; i++) {
    linhaAtual.push(lista[i]);
    if (linhaAtual.length === cols) {
      matriz.push(linhaAtual);
      linhaAtual = [];
    }
  }
  if (linhaAtual.length > 0) {
    matriz.push(linhaAtual);
  }
  return uxCriarTeclado(matriz, destinoNavegacao);
}

function enviarTelaBotComNavegacao(chat, texto, linhas, destinoNavegacao, messageId) {
  var kb = uxCriarTeclado(linhas, destinoNavegacao);
  return enviarTelaBot(chat, texto, kb, messageId);
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
    mode: state.mode || '', data: state.data || '', updatedAt: Date.now(),
    soapAnamnese: state.soapAnamnese || null
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
    ? anterior : salvarModoBot(chat, { caseId: !novo && anterior ? anterior.caseId : null, mode: mode, data: conteudo,
      soapAnamnese: !novo && anterior && anterior.mode === 'soap' && mode === 'soap' ? anterior.soapAnamnese : null });
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
  var orientacao;
  if (mode === 'gaso') {
    orientacao = 'Envie pH, pCO2 e HCO3 (ex: `7.20 23 10` ou `pH 7.20, pCO2 23, HCO3 10, Na 140, Cl 105`) ou toque em um caso predefinido abaixo:';
  } else if (mode === 'soap') {
    orientacao = '🎙️ *Envie o áudio narrando o caso ou digite os dados* (queixa principal, tempo de evolução, sinais vitais e exame físico).\n\nO sistema estruturará o prontuário SOAP, estratificação de risco e prescrição REMUME imediatamente.';
  } else {
    orientacao = 'Grave um áudio narrando o caso ou envie os dados por texto.';
  }

  var botoesModo;
  if (mode === 'gaso' && typeof GasometriaAcidoBaseService !== 'undefined' && typeof GasometriaAcidoBaseService.obterTecladoInlineGasometria === 'function') {
    botoesModo = GasometriaAcidoBaseService.obterTecladoInlineGasometria('inicial');
  } else if (mode === 'soap') {
    botoesModo = botoesBot([
      [['🩺 Exemplo HAS', 'ux:amb:soap:has'], ['🩸 Exemplo DM2', 'ux:amb:soap:dm2']],
      [['🔙 Ambulatório', 'ux:hub:amb'], ['🏠 Início', 'ux:hub:inicio']]
    ]);
  } else {
    botoesModo = botoesBot([[['Encerrar', 'ux:cancelar']]]);
  }

  return enviarTelaBot(chat,
    '*' + UX_NOMES_MODO[mode] + ' · Novo Caso*\n\n' + orientacao,
    botoesModo, messageId);
}

function enviarMenuUXGinecoObstetricia(chat, messageId) {
  var texto = '🌸🤰 *Hub Unificado de Ginecologia & Obstetrícia (Internato até 29/11)*\n\n' +
    'Condutas imediatas, calculadoras obstétricas e guias ambulatoriais em 0ms:\n' +
    'Selecione o submódulo de atendimento rápido:';
  var linhas = [
    [['🤰 Pré-Natal & DPP', 'go_prenatal'], ['🏥 Parto & Partograma', 'go_parto']],
    [['🩸 HPP (4 Ts)', 'go_hpp'], ['⚡ Pré-Eclâmpsia & MgSO4', 'go_mgso4']],
    [['👶 Prematuridade & RPMO', 'go_prematuridade'], ['🔬 Toxo & Sorologias', 'go_toxo']],
    [['🌸 Vulvovaginites', 'go_corrimento'], ['🩺 Preventivo (INCA)', 'go_preventivo']],
    [['💊 Anticoncepção OMS', 'go_anticoncepcao'], ['🩹 DIP & Infecção Pélvica', 'go_dip']],
    [['🤱 Lactação: Fármacos a Evitar', 'go_lactacao']]
  ];
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'menu', messageId);
}
var enviarMenuGinecologiaObstetricia = enviarMenuUXGinecoObstetricia;


/* ========== Cenário 1: 🚨 Emergência & Sala Vermelha ========== */

function enviarMenuSalaVermelha(chat, messageId) {
  var texto = '🚨 *EMERGÊNCIA & SALA VERMELHA*\n\nCondutas imediatas e suporte intensivo:';
  var linhas = [
    [['🫀 PCR (ACLS)', 'ux:conduta:pcr'], ['⚡ Arritmias Cardíacas', 'ux:emerg:arritmia']],
    [['🫁 SRI / IOT', 'ux:srimenu'], ['🩸 Gasometria', 'ux:iniciar:gaso']],
    [['💉 Drogas Vasoativas (DVA)', 'ux:dvamenu'], ['⚡ Choque & Hipotensão', 'ux:emerg:choque']],
    [['❤️ Crise HAS', 'ux:emerg:crisehas'], ['🧠 Escala de Glasgow', 'ux:emerg:glasgow']],
    [['🦟 Dengue C/D', 'ux:emerg:dengue'], ['🤕 Cefaleia / HSA', 'ux:emerg:cefaleia']],
    [['📦 Pacotes Sindrômicos', 'ux:kit:menu'], ['🧪 Diluição & Compat. Y', 'ux:dil:menu']],
    [['⚡ Outras Condutas', 'ux:condutamenu']]
  ];
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'menu', messageId);
}

function enviarMenuDva(chat, messageId) {
  var texto = '💉 *CALCULADORA DE DROGAS VASOATIVAS (DVA)*\n\nQual medicamento deseja calcular?';
  var linhas = [
    [['Noradrenalina', 'ux:droga:nora'], ['Dobutamina', 'ux:droga:dobuta']],
    [['Vasopressina', 'ux:fixa:vaso'], ['Adrenalina (Infusão)', 'ux:droga:adrena']],
    [['Nitroprussiato', 'ux:droga:nipride'], ['Nitroglicerina', 'ux:fixa:tridil']],
    [['🔙 Calculadoras', 'ux:hub:calc'], ['🔙 Sala Vermelha', 'ux:hub:sala']],
    [UX_BOTAO_INICIO]
  ];
  return enviarTelaBot(chat, texto, botoesBot(linhas), messageId);
}

function enviarTelaPesoDva(chat, droga, messageId) {
  var itens = UX_PESOS_RAPIDOS.map(function (p) {
    return [p + ' kg', 'ux:peso:' + droga + ':' + p];
  });
  var kb = uxCriarTecladoGrade(itens, 2);
  kb.inline_keyboard.push(botoesBot([[['← Trocar medicamento', 'ux:dvamenu']]]).inline_keyboard[0]);
  kb.inline_keyboard.push(botoesBot([UX_DESTINOS_RODAPE.sala]).inline_keyboard[0]);
  return enviarTelaBot(chat,
    '💉 *' + UX_DROGAS[droga].toUpperCase() + '*\nPeso do paciente\n\n' +
    'Toque em um peso ou envie o valor em kg (ex.: 73,5). Os botões são aproximações: use o peso real quando souber.',
    kb, messageId);
}

function enviarTelaDiluicaoDva(chat, droga, peso, messageId) {
  var p = String(peso).replace(',', '.');
  var texto = '💉 *' + UX_DROGAS[droga].toUpperCase() + ' · ' + String(peso).replace('.', ',') + ' kg*\nSelecione a diluição.';
  var linhas = [
    [['Padrão', 'ux:diluicao:' + droga + ':' + p + ':padrao'], ['Concentrada', 'ux:diluicao:' + droga + ':' + p + ':concentrada']],
    [['✏️ Alterar peso', 'ux:droga:' + droga]]
  ];
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'sala', messageId);
}

function enviarMenuSri(chat, messageId) {
  var texto = '🫁 *SEQUÊNCIA RÁPIDA DE INTUBAÇÃO (SRI / IOT)*\n\nSelecione o peso ou cenário.\nOutro peso: envie `/sri 85`.';
  var linhas = [
    [['60 kg', 'ux:sri:60'], ['70 kg', 'ux:sri:70']],
    [['80 kg', 'ux:sri:80'], ['90 kg', 'ux:sri:90']],
    [['Choque 70 kg', 'ux:sri:70 choque'], ['Asma 70 kg', 'ux:sri:70 asma']]
  ];
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'sala', messageId);
}

function enviarMenuCondutas(chat, messageId) {
  var texto = '⚡ *Outras Emergências*\nSelecione a conduta beira-leito:';
  var linhas = [
    [['🚨 EAP hipertensivo', 'ux:conduta:eap'], ['⚡ Anafilaxia', 'ux:conduta:anafilaxia']],
    [['🧠 Crise convulsiva', 'ux:conduta:convulsao'], ['🧪 Hipercalemia', 'ux:conduta:hipercalemia']],
    [['🩸 Cetoacidose (CAD)', 'ux:conduta:cad']]
  ];
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'sala', messageId);
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
  var linhas = [
    [['🦟 Grupo C (10 mL/kg/h)', 'ux:conduta:dengue_c'], ['🚨 Grupo D Choque (20 mL/kg)', 'ux:conduta:dengue_d']],
    [['📋 Grupos A e B (Oral)', 'ux:conduta:dengue_ab']]
  ];
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'sala', messageId);
}

function enviarMenuEmergCriseHas(chat, messageId) {
  var texto = '❤️ *CRISE HIPERTENSIVA (SBC 2020 / AHA)*\n\n' +
    'Selecione a apresentação clínica beira-leito:\n\n' +
    '• *Emergência:* LOA aguda (EAP, Dissecção, SCA, AVC) — drogas venosas em BIC\n' +
    '• *Urgência:* PA elevada sem LOA — controle oral em 24-48h (Captopril VO)\n' +
    '• *Pseudocrise:* Reativa a dor/ansiedade — repouso e analgesia simples';
  var linhas = [
    [['🚨 Emergência (EAP/Dissecção)', 'ux:conduta:crisehas_emerg'], ['⚡ Urgência Hipertensiva', 'ux:conduta:crisehas_urg']],
    [['🟢 Pseudocrise Hipertensiva', 'ux:conduta:crisehas_pseudo']]
  ];
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'sala', messageId);
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
  var linhas = [
    [['🔴 Glasgow ≤ 8 (SRI / IOT)', 'ux:conduta:gcs_8'], ['🟡 Glasgow 9-12 (TC / Vigia)', 'ux:conduta:gcs_10']],
    [['🟢 Glasgow 13-15 (Observação)', 'ux:conduta:gcs_14'], ['📐 Calculadora Glasgow-P', 'calc_Glasgow']]
  ];
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'sala', messageId);
}

function enviarMenuEmergChoque(chat, messageId) {
  var texto = '🫀 *IC DESCOMPENSADA & CHOQUE (STEVENSON / FORRESTER)*\n\n' +
    'Selecione o perfil clínico-hemodinâmico beira-leito:\n\n' +
    '• *Perfil C (Frio & Úmido):* Choque cardiogênico franco — Nora + Dobuta\n' +
    '• *Perfil B (Quente & Úmido):* Congestão/EAP — Nitroglicerina + Furosemida\n' +
    '• *Perfil L (Frio & Seco):* Hipovolemia/Superdiurese — Prova de volume\n' +
    '• *Choque Séptico:* Nora + Vasopressina + Hidrocortisona (CIRCI)';
  var linhas = [
    [['🔴 Perfil C: Frio & Úmido', 'ux:conduta:choque_c'], ['🟡 Perfil B: Quente & Úmido', 'ux:conduta:choque_b']],
    [['🔵 Perfil L: Frio & Seco', 'ux:conduta:choque_l'], ['💉 Choque Séptico (CIRCI)', 'ux:conduta:choque_septico']]
  ];
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'sala', messageId);
}

function enviarMenuEmergCefaleia(chat, messageId) {
  var texto = '🤕 *CEFALEIAS AGUDAS NO PRONTO SOCORRO (SNOOP)*\n\n' +
    'Selecione a suspeita clínica ou bandeira vermelha:\n\n' +
    '• *Trovoada / HSA:* Início súbito < 1 min — TC sem contraste imediata + PL se normal\n' +
    '• *Meningite:* Febre + rigidez de nuca — Líquor e Ceftriaxona 2g + Dexa 10mg\n' +
    '• *Primária / Enxaqueca:* Resgate multimodal com Dipirona + Plasil + Dexa\n' +
    '• *Arterite Temporal:* Paciente > 50 anos com dor temporal — VHS + Prednisona urgente';
  var linhas = [
    [['🚨 Trovoada / HSA (TC+PL)', 'ux:conduta:cef_hsa'], ['⚠️ Meningite / Febre (Punção)', 'ux:conduta:cef_mening']],
    [['💊 Cefaleia Primária (PS)', 'ux:conduta:cef_primaria'], ['👵 Arterite Temporal', 'ux:conduta:cef_arterite']]
  ];
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'sala', messageId);
}

function enviarTelaCondutaEmergencia(chat, condutaKey, messageId) {
  var textoCond = obterTextoCondutaEmergencia(condutaKey);
  if (!textoCond) {
    return enviarMenuCondutas(chat, messageId);
  }
  var cache = uxCache();
  var ck = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ck, textoCond, 21600);
  safePutCache(cache, 'sala:' + ck, textoCond, 21600);
  var linhas = [[['📋 Copiar para Prontuário', 'ux:copiar:sala:' + ck]]];

  var k = String(condutaKey || '').toLowerCase();
  if (k === 'cad') {
    linhas.unshift([['🩸 Calcular Gaso / Winter', 'ux:iniciar:gaso']]);
  } else if (k === 'hipercalemia') {
    linhas.unshift([['🩸 Gasometria & Ânion Gap', 'ux:iniciar:gaso'], ['🧪 Diluição & Compat. Y', 'ux:dil:menu']]);
  } else if (k === 'eap') {
    linhas.unshift([['💉 Titular Nora / Tridil', 'ux:dvamenu']]);
  } else if (k === 'gcs_8') {
    linhas.unshift([['🫁 Doses de SRI / IOT', 'ux:srimenu']]);
  } else if (k === 'choque_c' || k === 'choque_septico') {
    linhas.unshift([['💉 Titular DVA (Nora / Vaso)', 'ux:dvamenu']]);
  }

  return enviarTelaBotComNavegacao(chat, textoCond, linhas, 'sala', messageId);
}

/* ========== Cenário 2: 🛏️ Enfermaria & Prescrição Rápida ========== */

function enviarMenuEnfermaria(chat, messageId) {
  var texto = '🛏️ *ENFERMARIA & PRESCRIÇÃO*\nSelecione a ferramenta ou envie o caso diretamente:';
  var linhas = [
    [['🏥 Painel de Leitos', 'ux:painel:0'], ['📋 Passagem SBAR', 'ux:enf:sbar']],
    [['🧪 Clearance (Cockcroft)', 'ux:enf:clcr'], ['💊 Ajuste Renal ATB', 'ux:enf:ajuste']],
    [['💧 Hidratação / Holliday', 'ux:enf:hidratacao'], ['📋 Prescrição Hospitalar', 'ux:enf:rxh']],
    [['💊 Sintomáticos / SOS', 'ux:enf:sintomaticos'], ['✅ Checklist FAST HUG', 'ux:chk:menu']],
    [['🏁 Fim de Plantão', 'ux:enf:plantao_fim']]
  ];
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'menu', messageId);
}

function enviarTelaEnfClearance(chat, messageId) {
  var texto = '🧪 *CALCULADORA DE CLEARANCE E AUDITORIA RENAL*\n\n' +
    'Envie a idade, peso, creatinina, sexo e medicamentos para auditar:\n\n' +
    '💡 *Exemplos rápidos beira-leito:*\n' +
    '• `/crcl 65 anos, 70kg, cr 1.8, masculino`\n' +
    '• `/crcl 80 anos, 55kg, cr 2.1, fem, medicações: vancomicina`\n' +
    '• `/clearance 45a, 80kg, cr 3.5, mulher, enoxaparina`';
  var linhas = [
    [['🧪 Cockcroft 70kg Cr 1.2 M', 'calc_Cockcroft'], ['📊 CKD-EPI (TFG)', 'calc_CKD']]
  ];
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'enf', messageId);
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
  var linhas = [
    [['💊 Meropenem ClCr 25', 'ux:atb:mero25'], ['💊 Pip-Tazo ClCr 30', 'ux:atb:tazo30']],
    [['💊 Cefepime HD', 'ux:atb:cefepimehd'], ['💊 Vanco ClCr 40', 'ux:atb:vanco40']]
  ];
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'enf', messageId);
}

function enviarTelaEnfHidratacao(chat, messageId) {
  var texto = '💧 *HIDRATAÇÃO VENOSA & SUPORTE (HOLLIDAY-SEGAR)*\n\n' +
    'Envie o peso e a condição clínica ou toque em um exemplo beira-leito:\n\n' +
    '💡 *Exemplos:*\n' +
    '• `/holliday 8kg` (Manutenção, vazão em bomba, eletrólitos SBP e TIG)\n' +
    '• `/holliday 11kg bronquiolite` (Restrição a 70% p/ prevenir sobrecarga)\n' +
    '• `/nutriped 6kg 3 meses partida` (Avaliação nutricional completa)';
  var linhas = [
    [['💧 Holliday 8kg', 'ux:hol:8kg'], ['💧 Holliday 11kg Bronquiolite', 'ux:hol:11kg_bva']]
  ];
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'enf', messageId);
}

function enviarTelaEnfPrescricaoHosp(chat, messageId) {
  var texto = '📝 *PRESCRIÇÃO HOSPITALAR DE INTERNAÇÃO*\n\n' +
    'Gere uma prescrição de internação estruturada em 10 itens com verificação de profilaxias e ajuste renal:\n\n' +
    '💡 *Como prescrever (por texto ou áudio):*\n' +
    'Envie `/rxh` informando idade, peso, diagnóstico principal, creatinina/função renal, comorbidades e alergias.\n\n' +
    '• O sistema calcula hidratação venosa, ajuste de medicamentos à função renal, analgésicos e profilaxia de TEV.';
  var linhas = [];
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'enf', messageId);
}

function tratarCallbackEnfSBAR(chat, messageId) {
  var sbarTexto = (typeof EnfermariaService !== 'undefined' && EnfermariaService.gerarPassagemSBARConsolidada)
    ? EnfermariaService.gerarPassagemSBARConsolidada()
    : ((typeof EnfermariaService !== 'undefined' && EnfermariaService.obterTextoConsolidadoParaPassagem)
        ? EnfermariaService.obterTextoConsolidadoParaPassagem()
        : null);

  if (!sbarTexto) {
    var textoVazio = '📋 *PASSAGEM DE PLANTÃO SBAR · ENFERMARIA*\n\n' +
      '🏥 Nenhum leito registrado na enfermaria para passar plantão.\n\n' +
      '💡 Registre os leitos usando `/leito <num> <evolução>` antes de gerar a passagem.\n' +
      'Exemplo: `/leito 4 72a, PAC grave, Ceftriaxona D3, aguarda vaga CTI`';
    return enviarTelaBotComNavegacao(chat, textoVazio, [[['🏥 Painel de Leitos', 'ux:painel:0']]], 'enf', messageId);
  }

  // 100% DETERMINÍSTICO EM 0ms BEIRA-LEITO
  var cache = uxCache();
  var ckSbar = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ckSbar, sbarTexto, 21600);

  var textoLimpoPep = typeof uxTextoProntuario === 'function' ? uxTextoProntuario(sbarTexto) : sbarTexto;
  var btnCopiar;
  if (textoLimpoPep.length >= 1 && textoLimpoPep.length <= UX_MAX_COPY_TEXT) {
    btnCopiar = [{ text: '📋 Copiar para Prontuário', copy_text: { text: textoLimpoPep } }];
  } else {
    btnCopiar = [{ text: '📋 Copiar para Prontuário', callback_data: 'ux:copiar:' + ckSbar }];
  }

  var linhasSbar = [
    [btnCopiar[0]],
    [['🏥 Painel de Leitos', 'ux:painel:0'], ['🔄 Atualizar SBAR', 'ux:enf:sbar']]
  ];

  return enviarTelaBotComNavegacao(chat, sbarTexto, linhasSbar, 'enf', messageId);
}
var enviarTelaEnfSBAR = tratarCallbackEnfSBAR;

/* ========== Cenário 3: 🩺 Ambulatório & Atenção Primária (UBS) ========== */

function enviarMenuAmbulatorio(chat, messageId) {
  var texto = '🩺 *AMBULATÓRIO & ATENÇÃO PRIMÁRIA (UBS)*\n\n' +
    'Prontuário estruturado, referências de Atenção Básica e condutas em 0ms:\n' +
    'Selecione a ferramenta ambulatorial desejada:';
  var linhas = [
    [['📝 SOAP Ambulatorial', 'ux:amb:soap'], ['💊 Prescrição REMUME', 'ux:amb:remume']],
    [['📋 Exame Físico Padrão', 'ux:amb:ef']]
  ];
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'menu', messageId);
}

function enviarTelaAmbSoap(chat, messageId) {
  return iniciarModoBot(chat, 'soap', false, messageId);
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
    [['📋 Copiar SOAP para PEP', 'ux:copiar:' + ckSoap]],
    [['📝 Novo SOAP', 'ux:iniciar:soap']],
    [['🔙 Ambulatório', 'ux:hub:amb'], ['🏠 Início', 'ux:hub:inicio']]
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
    [['📋 Copiar Receita', 'ux:copiar:' + ckR]],
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
    [['📄 7 Dias (Lombalgia)', 'ux:amb:atest:7d'], ['🕒 Declaração Comparecimento', 'ux:amb:atest:comp']],
    [['📋 Copiar Modelo de Atestado', 'ux:copiar:' + ckAt]],
    [['🔙 Ambulatório', 'ux:hub:amb'], ['🏠 Início', 'ux:hub:inicio']]
  ]);

  return enviarTelaBot(chat, texto, botoes, messageId);
}

function tratarCallbackAmbAtestado(chat, valor, messageId) {
  var textoAtestado = "";
  if (valor === 'comp') {
    var ctxAmb = (typeof ConfigService !== "undefined" && typeof ConfigService.getContextoClinico === "function")
      ? ConfigService.getContextoClinico(chat)
      : { municipio: "Local", uf: "BR", nome_completo_carimbo: "Médico(a) Assistente", crm: "CRM" };
    var locData = (ctxAmb.municipio ? (ctxAmb.municipio + (ctxAmb.uf ? " - " + ctxAmb.uf : "")) : "Local") + ", " + new Date().toLocaleDateString('pt-BR') + ".";
    var linhaAss = (ctxAmb.papel === "INTERNO_ACADEMICO")
      ? "Médico(a) Responsável (Carimbo e CRM)"
      : ((ctxAmb.nome_completo_carimbo || "Médico(a) Assistente") + " · " + (ctxAmb.crm || "CRM"));
    textoAtestado = "======================================================================\n" +
      "                    DECLARAÇÃO DE COMPARECIMENTO MÉDICO               \n" +
      "======================================================================\n\n" +
      "Declaro para os devidos fins de comprovação e justificativa que o(a) paciente:\n" +
      "Nome: Ao Portador\n" +
      "Documento: [RG / CPF / Documento]\n\n" +
      "Compareceu a esta unidade de saúde nesta data, permanecendo em atendimento\n" +
      "médico ambulatorial sob meus cuidados profissionais no período das [   ]h às [   ]h.\n\n" +
      "Local e Data: " + locData + "\n\n" +
      "__________________________________________________________\n" +
      linhaAss + "\n" +
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
    [['📋 Copiar Atestado', 'ux:copiar:' + ckA]],
    [['📄 1 Dia', 'ux:amb:atest:1d'], ['📄 3 Dias', 'ux:amb:atest:3d'], ['📄 5 Dias', 'ux:amb:atest:5d']],
    [['🔙 Atestados CFM', 'ux:amb:atestado'], ['🔙 Ambulatório', 'ux:hub:amb']],
    [['🏠 Início', 'ux:hub:inicio']]
  ]);

  return enviarTelaBot(chat, msgRetorno, botoes, messageId);
}

var ALIASES_MOLDES_EF_AMB_ = {
  'padrao': 'padrao_completo',
  'adulto': 'padrao_completo',
  'pediatrico': 'pediatrico_completo',
  'ped': 'pediatrico_completo',
  'geriatrico': 'geriatrico_aga',
  'aga': 'geriatrico_aga',
  'obstetrico': 'obstetrico_prenatal',
  'prenatal': 'obstetrico_prenatal',
  'has': 'has_rotina',
  'cardio': 'has_rotina',
  'cardiovascular': 'has_rotina',
  'dm': 'dm_rotina',
  'respiratorio': 'respiratorio_ivas',
  'ivas': 'respiratorio_ivas',
  'pneumo': 'respiratorio_ivas',
  'gastro': 'dispepsia_gastro',
  'abdome': 'dispepsia_gastro',
  'neuro': 'cefaleia_neuro',
  'neurologico': 'cefaleia_neuro',
  'coluna': 'lombalgia_postural',
  'lombalgia': 'lombalgia_postural',
  'ortopedico': 'lombalgia_postural',
  'vascular': 'vascular_periferico',
  'mental': 'saude_mental',
  'psiquico': 'saude_mental',
  'pqu': 'saude_mental'
};

function enviarTelaAmbExameFisico(chat, messageId, tipoModelo) {
  var chave = String(tipoModelo || 'padrao_completo').trim();
  if (ALIASES_MOLDES_EF_AMB_[chave]) {
    chave = ALIASES_MOLDES_EF_AMB_[chave];
  }

  var modelos = (typeof SoapAmbulatorialService !== "undefined" && SoapAmbulatorialService.MODELOS_EXAME_FISICO)
    ? SoapAmbulatorialService.MODELOS_EXAME_FISICO
    : null;

  if (!modelos || !modelos[chave]) {
    chave = 'padrao_completo';
  }

  var item = modelos ? modelos[chave] : null;
  var textoEf = item ? item.texto : (
    (typeof SoapAmbulatorialService !== "undefined" && typeof SoapAmbulatorialService.obterModeloExameFisicoCompleto === "function")
      ? SoapAmbulatorialService.obterModeloExameFisicoCompleto()
      : "Sinais Vitais: PA: 120/80 mmHg | FC: 72 bpm | FR: 16 irpm | SpO2: 98% em ar ambiente | T: 36.5°C.\n" +
        "Bom estado geral, lúcido e orientado no tempo e espaço, corado, hidratado, anictérico, acianótico, afebril ao toque, eupneico em ar ambiente.\n" +
        "  ACV: Ritmo cardíaco regular em 2 tempos, bulhas normofonéticas, sem sopros. Pulsos radiais amplos, cheios e simétricos bilateralmente.\n" +
        "  AR: Murmúrio vesicular globalmente presente, sem ruídos adventícios. Expansibilidade torácica preservada bilateralmente. Eupneico em ar ambiente.\n" +
        "  Abdome: Plano, flácido, indolor à palpação superficial e profunda. RHA normoativos. Sem massas ou visceromegalias.\n" +
        " Extremidades: Sem edema de membros inferiores. Panturrilhas livres sem empastamento. TEC < 3 segundos."
  );

  var titulo = item ? item.titulo : "Adulto Geral Completo (Segmentar Padrão Ouro)";
  var tituloCabecalho = (chave === 'padrao_completo')
    ? "📋 *MODELO CANÔNICO DE EXAME FÍSICO NORMAL (SEGMENTAR PADRÃO-OURO)*"
    : "📋 *MOLDE DE EXAME FÍSICO: " + titulo.toUpperCase() + "*";

  var texto = tituloCabecalho + "\n\n" +
    "Exame físico descritivo pronto para o Prontuário Eletrônico (toque em copiar ou selecione outro molde abaixo):\n\n```\n" +
    textoEf + "\n```";

  var cache = uxCache();
  var ckEf = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ckEf, textoEf, 21600);

  var rotuloCopiar = (chave === 'padrao_completo')
    ? '📋 Copiar Exame Físico'
    : ('📋 Copiar ' + (titulo.split('(')[0].trim()));
  if (rotuloCopiar.length > 34) rotuloCopiar = '📋 Copiar Exame Físico';

  var linhas = [
    [[rotuloCopiar, 'ux:copiar:' + ckEf]]
  ];

  var estSoap = (typeof modoBot === "function") ? modoBot(chat) : null;
  if (estSoap && estSoap.mode === 'soap' && estSoap.data && estSoap.data.trim().length > 5) {
    linhas.push([['➕ Incorporar ao SOAP', 'ux:ef_inc:' + chave]]);
  }

  var listaMoldes = [
    { k: 'padrao_completo', nome: '🧍 Padrão Ouro' },
    { k: 'pediatrico_completo', nome: '👶 Pediátrico' },
    { k: 'geriatrico_aga', nome: '🧓 Geriátrico (AGA)' },
    { k: 'obstetrico_prenatal', nome: '🤰 Pré-Natal' },
    { k: 'has_rotina', nome: '🫀 Cardio & HAS' },
    { k: 'dm_rotina', nome: '🩸 DM & Pés' },
    { k: 'respiratorio_ivas', nome: '🫁 Respiratório' },
    { k: 'dispepsia_gastro', nome: '🍽️ Gastro/Abdome' },
    { k: 'cefaleia_neuro', nome: '🧠 Neurológico' },
    { k: 'lombalgia_postural', nome: '🦴 Coluna/Lombar' },
    { k: 'vascular_periferico', nome: '🦵 Vascular' },
    { k: 'saude_mental', nome: '🗣️ Saúde Mental' }
  ];

  var linhasMoldes = [];
  var par = [];
  for (var i = 0; i < listaMoldes.length; i++) {
    var m = listaMoldes[i];
    var rotulo = (m.k === chave) ? ('✅ ' + m.nome) : m.nome;
    par.push([rotulo, 'ux:amb:ef:' + m.k]);
    if (par.length === 2) {
      linhasMoldes.push(par);
      par = [];
    }
  }
  if (par.length > 0) linhasMoldes.push(par);

  linhas = linhas.concat(linhasMoldes);
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'amb', messageId);
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

  var linhas = [[['📋 Copiar Guia SISREG', 'ux:copiar:' + ckSis]]];
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'amb', messageId);
}

/* ========== Cenário 4: 💊 Consultas Rápidas de Bolso ========== */

function enviarMenuConsultasBolso(chat, messageId) {
  var texto = '💊 *CONSULTAS RÁPIDAS DE BOLSO*\n\n' +
    'Guias de referência imediata beira-leito (0ms determinístico):\n' +
    'Selecione o guia clínico desejado:';
  var linhas = [
    [['🦠 Antibióticos por Foco', 'ux:bolso:atb'], ['👶 Doses Pediátricas (kg)', 'ux:bolso:ped']],
    [['🤰 Gestação & Lactação', 'ux:bolso:gestacao'], ['⚠️ Interações Graves', 'ux:bolso:interacao']],
    [['💉 Diluição & Preparo HSL', 'ux:bolso:hsl'], ['📐 Calculadoras Clínicas', 'ux:hub:calc']]
  ];
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'menu', messageId);
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
  var ctx = (typeof ConfigService !== 'undefined' && typeof ConfigService.getContextoClinico === 'function')
    ? ConfigService.getContextoClinico(chat)
    : null;
  var modulos = (ctx && Array.isArray(ctx.modulos_ativos) && ctx.modulos_ativos.length > 0) ? ctx.modulos_ativos : null;
  function modAtivo(id) {
    if (!modulos) return true;
    return modulos.indexOf(id) !== -1;
  }

  var nomeSaudacao = (typeof obterNomeTratamentoUsuario === 'function') ? obterNomeTratamentoUsuario(chat) : 'Doutor(a)';
  var temMunicipio = ctx && ctx.municipio && !/^(brasil|rename|nacional)/i.test(String(ctx.municipio).trim());
  var seloLoc = temMunicipio ? (' · 📍 ' + ctx.municipio + (ctx.uf && ctx.uf !== 'BR' ? '/' + ctx.uf : '')) : '';
  var texto = '⚡ *Ultra Rotina · Central de Comandos Beira-Leito*\n' +
    '👨‍⚕️ *' + nomeSaudacao + '*' + seloLoc + '\n' +
    'Selecione o cenário clínico ou envie o caso diretamente:';

  var urlApp = obterUrlCockpit(chat);
  var pares = [];
  if (modAtivo('SALA_VERMELHA') || modAtivo('INTOXICACOES')) pares.push(['🚨 Sala Vermelha', 'ux:hub:sala']);
  if (modAtivo('ENFERMARIA_LEITOS')) pares.push(['🛏️ Enfermaria', 'ux:hub:enf']);
  if (modAtivo('SOAP_PEP') || modAtivo('RECEITUARIO_ATESTADOS')) pares.push(['🩺 Ambulatório', 'ux:hub:amb']);
  if (modAtivo('GO_OBSTETRICIA')) pares.push(['🤰 Hub G&O', 'ux:rotina:go']);
  if (modAtivo('FARMACIA_REMUME') || modAtivo('PRECEPTOR_EBM')) pares.push(['💊 Consultas Bolso', 'ux:hub:bolso']);
  if (typeof ehUsuarioTitular === 'function' && ehUsuarioTitular(chat)) {
    pares.push(['📅 Rotina & Estudo', 'ux:hub:rotina']);
  } else if (modAtivo('CALCULADORAS_ESCORES')) {
    pares.push(['🩸 Gasometria', 'ux:iniciar:gaso']);
  }

  var botoes = [];
  for (var i = 0; i < pares.length; i += 2) {
    if (pares[i + 1]) {
      botoes.push([pares[i], pares[i + 1]]);
    } else {
      botoes.push([pares[i]]);
    }
  }
  botoes.push([['📐 Calculadoras', 'ux:hub:calc'], { text: '📱 Cockpit Mini App', web_app: { url: urlApp } }]);
  botoes.push([['⚙️ Perfil & Cidade', 'ux:perfil:menu'], ['🧹 Novo Paciente', 'ux:novo:soap']]);

  return enviarTelaBot(chat, texto, botoesBot(botoes), messageId);
}

function enviarMenuUXCalculadoras(chat, messageId) {
  var texto = '📐 *CALCULADORAS CLÍNICAS & ESCORES DETERMINÍSTICOS*\n\n' +
    'Selecione a ferramenta beira-leito desejada para cálculo instantâneo em 0ms:\n\n' +
    '• 🩸 *Gasometria:* Ácido-base, Winter, ânion gap e oxigenação\n' +
    '• 💉 *Drogas Vasoativas:* Nora, dobuta, vaso, adrenalina e compatibilidade Y\n' +
    '• 🧪 *Cockcroft vs CKD-EPI:* TFG/ClCr com estadiamento KDIGO\n' +
    '• 💧 *Holliday-Segar:* Hidratação venosa e eletrólitos pediátricos\n' +
    '• 🧠 *Glasgow-P:* Escala de coma com reatividade pupilar e indicação de IOT\n' +
    '• 🔥 *Parkland:* Ressuscitação volêmica em queimados (RL 4 mL/kg/%)';

  var linhas = [
    [['🩸 Gasometria Arterial', 'ux:calc:gaso'], ['💉 Drogas Vasoativas', 'ux:calc:dva']],
    [['🧪 Cockcroft vs CKD-EPI', 'ux:calc:crcl'], ['💧 Holliday-Segar', 'ux:calc:holliday']],
    [['🧠 Glasgow-P (TCE)', 'ux:calc:glasgow'], ['🔥 Parkland (Queimados)', 'ux:calc:parkland']],
    [['📊 Todos os Escores & Índices', 'calc_menu_principal'], ['🚨 Sala Vermelha', 'ux:sala']]
  ];
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'menu', messageId);
}

function enviarTelaCalcGaso(chat, messageId) {
  var texto = '🩸 *CALCULADORA DE GASOMETRIA ARTERIAL COMPLETA*\n\n' +
    'Avaliação ácido-base automatizada em 0ms:\n' +
    '• Distúrbio primário e misto (pH, PaCO₂, HCO₃⁻)\n' +
    '• Resposta compensatória (Winter / Aguda-Crônica)\n' +
    '• Ânion Gap sérico corrigido por albumina\n' +
    '• Razão Delta (Delta-Delta) e oxigenação (PaO₂/FiO₂)\n\n' +
    '💡 *Envie os dados no chat ou toque em um caso clínico para cálculo instantâneo:*\n' +
    '• Exemplo de comando: `/gaso pH 7.24 pCO2 22 HCO3 9 Na 138 Cl 101`';

  var linhas = [
    [['🧪 Cetoacidose (pH 7.18)', 'ux:calc:gaso_cad'], ['🫁 DPOC Descompensado (pH 7.30)', 'ux:calc:gaso_dpoc']],
    [['💧 Alcalose Vômitos (pH 7.52)', 'ux:calc:gaso_vomitos'], ['🌬️ Ansiedade / Alcalose Resp', 'ux:calc:gaso_ansiedade']]
  ];
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'calc', messageId);
}

function enviarTelaCalcRenal(chat, messageId) {
  var texto = '🧪 *ESTIMATIVA DA FUNÇÃO RENAL (COCKCROFT-GAULT vs CKD-EPI 2021)*\n\n' +
    '• *Cockcroft-Gault:* `ClCr = [(140 - Idade) × Peso] / (72 × Cr)` (× 0,85 se mulher)\n' +
    '• *CKD-EPI 2021 (KDIGO):* Padrão-ouro race-free para estadiamento de DRC (G1 a G5)\n\n' +
    '💡 *Envie os dados no chat ou toque em um caso clínico para cálculo instantâneo:*\n' +
    '• Exemplo de comando: `/calc ckd Cr 1.4 idade 68 mulher peso 62`';

  var linhas = [
    [['👴 Homem 68a, 70kg, Cr 1.8', 'ux:calc:renal_ex1'], ['👵 Mulher 74a, 56kg, Cr 1.3', 'ux:calc:renal_ex2']],
    [['🧑 Jovem 28a, 78kg, Cr 0.9', 'ux:calc:renal_ex3'], ['🚨 DRC Grave Cr 3.2 (65a, M)', 'ux:calc:renal_ex4']]
  ];
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'calc', messageId);
}

function enviarTelaCalcHolliday(chat, messageId) {
  var texto = '💧 *HIDRATAÇÃO VENOSA PEDIÁTRICA (HOLLIDAY-SEGAR)*\n\n' +
    '• *Regra 100-50-20:* ≤ 10 kg (100 mL/kg) | 11–20 kg (1000 + 50 mL/kg) | > 20 kg (1500 + 20 mL/kg)\n' +
    '• *Regra 4-2-1 na BIC:* ≤ 10 kg (4 mL/kg/h) | 11–20 kg (40 + 2 mL/kg/h) | > 20 kg (60 + 1 mL/kg/h)\n' +
    '• *Eletrólitos:* NaCl 20% (2,5 mEq/100mL) + KCl 10% (2,0 mEq/100mL — após diurese confirmada)\n\n' +
    '💡 *Envie o peso no chat ou selecione um perfil pediátrico:*\n' +
    '• Exemplo de comando: `/holliday 14kg`';

  var linhas = [
    [['👶 Lactente 8 kg (Manutenção)', 'ux:calc:hol_ex1'], ['🧒 Pré-escolar 14 kg', 'ux:calc:hol_ex2']],
    [['👦 Escolar 22 kg (Manutenção)', 'ux:calc:hol_ex3'], ['🫁 Restrição Bronquiolite 11 kg', 'ux:calc:hol_ex4']]
  ];
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'calc', messageId);
}

function enviarTelaCalcGlasgow(chat, messageId) {
  var texto = '🧠 *ESCALA DE COMA DE GLASGOW-P (GCS-P)*\n\n' +
    '• *Ocular (1–4):* 4 Espontânea | 3 À voz | 2 À dor | 1 Ausente\n' +
    '• *Verbal (1–5):* 5 Orientado | 4 Confuso | 3 Inapropriadas | 2 Sons | 1 Ausente\n' +
    '• *Motor (1–6):* 6 Obedece | 5 Localiza | 4 Flexão | 3 Decorticação | 2 Descerebração | 1 Ausente\n' +
    '• *Pupilas (P 0–2):* 0 Ambas reagem | 1 Apenas uma reage | 2 Nenhuma reage\n\n' +
    '🚨 *Salvaguarda:* GCS ≤ 8 indica intubação orotraqueal e via aérea definitiva imediata!\n\n' +
    '💡 *Envie no chat ou toque em uma estratificação rápida:*\n' +
    '• Exemplo de comando: `/calc glasgow O3 V4 M5 P0`';

  var linhas = [
    [['🟢 Alerta GCS 15 (O4 V5 M6 P0)', 'ux:calc:gcs_ex1'], ['🟡 TCE Moderado (GCS 11)', 'ux:calc:gcs_ex2']],
    [['🔴 TCE Grave (GCS 7 - IOT)', 'ux:calc:gcs_ex3'], ['🚨 Midríase Bilateral GCS 4-P2', 'ux:calc:gcs_ex4']]
  ];
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'calc', messageId);
}

function enviarTelaCalcParkland(chat, messageId) {
  var texto = '🔥 *FÓRMULA DE PARKLAND (RESSUSCITAÇÃO EM GRANDES QUEIMADOS)*\n\n' +
    '• *Fórmula ATLS / SBA:* `Volume Total 24h = 4 mL × Peso (kg) × % SCQ` em Ringer Lactato\n' +
    '• *1ª Etapa (50% do total):* Primeiras 8h a contar do ACIDENTE (não da admissão hospitalar)\n' +
    '• *2ª Etapa (50% do total):* Próximas 16h em infusão contínua em BIC\n' +
    '• *Meta Diurese Horária:* Adultos 0,5 a 1,0 mL/kg/h | Crianças 1,0 mL/kg/h\n\n' +
    '💡 *Envie peso e SCQ no chat ou toque em um caso clínico para cálculo instantâneo:*\n' +
    '• Exemplo de comando: `/calc parkland 70kg 25%`';

  var linhas = [
    [['🔥 Adulto 70 kg · 20% SCQ', 'ux:calc:park_ex1'], ['🔥 Adulto 80 kg · 35% SCQ', 'ux:calc:park_ex2']],
    [['🔥 Adulto 65 kg · 15% SCQ', 'ux:calc:park_ex3'], ['🔥 Grande Queimado 75 kg · 45%', 'ux:calc:park_ex4']]
  ];
  return enviarTelaBotComNavegacao(chat, texto, linhas, 'calc', messageId);
}

function tratarCallbackUXCalc(chat, v, msgId) {
  var cache = CacheService.getScriptCache();
  if (v === 'gaso') return enviarTelaCalcGaso(chat, msgId);
  if (v === 'renal' || v === 'crcl') return enviarTelaCalcRenal(chat, msgId);
  if (v === 'holliday') return enviarTelaCalcHolliday(chat, msgId);
  if (v === 'glasgow') return enviarTelaCalcGlasgow(chat, msgId);
  if (v === 'parkland') return enviarTelaCalcParkland(chat, msgId);
  if (v === 'dva') {
    if (typeof enviarMenuDva === 'function') return enviarMenuDva(chat, msgId);
    texto('/dva');
    return true;
  }

  var txtResultado = '';

  // Presets Gasometria
  if (v === 'gaso_cad' || v === 'gaso:met') {
    txtResultado = "🩸 *GASOMETRIA ARTERIAL: CETOACIDOSE DIABÉTICA (CAD)*\n\n" +
      "• *Parâmetros:* pH 7.18 | PaCO₂ 20 mmHg | HCO₃⁻ 8 mEq/L | Na⁺ 135 | Cl⁻ 98\n\n" +
      "🔴 *DIAGNÓSTICO ÁCIDO-BASE DETERMINÍSTICO:*\n" +
      "• Distúrbio Primário: Acidose Metabólica Severa (pH 7,18 e HCO₃⁻ 8 mEq/L)\n" +
      "• Compensação (Winter): PaCO₂ esperada = 1,5 × 8 + 8 = 20 mmHg (±2: 18 a 22 mmHg) → *Compensação respiratória adequada*\n" +
      "• Ânion Gap Sérico: Na - (Cl + HCO₃) = 135 - 106 = `29 mEq/L` (Elevado > 12: Cetoacidose)\n" +
      "• Razão Delta: ΔAG / ΔHCO₃ = (29 - 12) / (24 - 8) = 17 / 16 = `1,06` → *Acidose de Ânion Gap elevado pura*\n\n" +
      "🟡 *CONDUTA BEIRA-LEITO (DIRETRIZ SBD / ADA):*\n" +
      "1. Hidratação vigorosa: SF 0,9% 1000 a 1500 mL na 1ª hora.\n" +
      "2. Checar K⁺ sérico antes da insulina: Se K < 3,3 mEq/L, adiar insulina e repor K⁺ primeiro.\n" +
      "3. Insulina regular: 0,1 U/kg em bolus IV + 0,1 U/kg/h em BIC.\n" +
      "4. Bicarbonato de sódio: Apenas se pH < 6,90 (100 mEq em 400 mL água destilada em 2h).";
  } else if (v === 'gaso_dpoc') {
    txtResultado = "🫁 *GASOMETRIA ARTERIAL: DPOC EXACERBADO COM RETENÇÃO*\n\n" +
      "• *Parâmetros:* pH 7.30 | PaCO₂ 62 mmHg | HCO₃⁻ 30 mEq/L | Na⁺ 140 | Cl⁻ 98\n\n" +
      "🔴 *DIAGNÓSTICO ÁCIDO-BASE DETERMINÍSTICO:*\n" +
      "• Distúrbio Primário: Acidose Respiratória Descompensada (pH 7,30 e PaCO₂ 62 mmHg)\n" +
      "• Resposta Metabólica: HCO₃⁻ elevado (30 mEq/L), compatível com retenção crônica agudizada\n" +
      "• Ânion Gap Sérico: 140 - (98 + 30) = `12 mEq/L` (Normal)\n" +
      "• Alerta Ventilatório: Hipercapnia severa com acidose respiratória aguda.\n\n" +
      "🟡 *CONDUTA BEIRA-LEITO (GOLD / SBPT):*\n" +
      "1. Oxigenoterapia estritamente controlada: Alvo SpO₂ 88 a 92% (Venturi 24-28% ou cateter 1-2 L/min).\n" +
      "2. *Indicação mandatória de VNI (BiPAP):* Acidose respiratória (pH < 7,35 e PaCO₂ > 45 mmHg).\n" +
      "3. Broncodilatação: SABA (Salbutamol) + SAMA (Ipratrópio) na 1ª hora.\n" +
      "4. Corticoide sistêmico: Prednisona 40 mg VO 1x/dia por 5 dias.\n" +
      "5. Antibioticoterapia se critérios de Anthonisen (aumento de escarro, purulência, dispneia).";
  } else if (v === 'gaso_vomitos') {
    txtResultado = "💧 *GASOMETRIA ARTERIAL: ALCALOSE METABÓLICA POR PERDAS GÁSTRICAS*\n\n" +
      "• *Parâmetros:* pH 7.52 | PaCO₂ 48 mmHg | HCO₃⁻ 38 mEq/L | Na⁺ 138 | Cl⁻ 88\n\n" +
      "🔴 *DIAGNÓSTICO ÁCIDO-BASE DETERMINÍSTICO:*\n" +
      "• Distúrbio Primário: Alcalose Metabólica Severa (pH 7,52 e HCO₃⁻ 38 mEq/L)\n" +
      "• Compensação Respiratória: PaCO₂ esperada = 40 + 0,7 × (38 - 24) = 49,8 mmHg (±2: 48 a 52) → *Compensação respiratória adequada*\n" +
      "• Ânion Gap: 138 - (88 + 38) = `12 mEq/L` (Normal, hipocloremia marcante)\n\n" +
      "🟡 *CONDUTA BEIRA-LEITO:*\n" +
      "1. Hidratação venosa com SF 0,9% (solução rica em cloreto - 'alcalose salina-responsiva').\n" +
      "2. Reposição vigorosa de K⁺: Alcalose induz hipocalemia grave e perda urinária de K⁺.\n" +
      "3. Antieméticos: Ondansetrona 8 mg IV de 8/8h.";
  } else if (v === 'gaso_ansiedade') {
    txtResultado = "🌬️ *GASOMETRIA ARTERIAL: ALCALOSE RESPIRATÓRIA AGUDA (HIPERVENTILAÇÃO)*\n\n" +
      "• *Parâmetros:* pH 7.50 | PaCO₂ 26 mmHg | HCO₃⁻ 20 mEq/L | SpO₂ 99%\n\n" +
      "🔴 *DIAGNÓSTICO ÁCIDO-BASE DETERMINÍSTICO:*\n" +
      "• Distúrbio Primário: Alcalose Respiratória Aguda (pH 7,50 e PaCO₂ 26 mmHg)\n" +
      "• Compensação: HCO₃⁻ esperado (aguda) = 24 - 0,2 × (40 - 26) = 21,2 mEq/L → *Queda de bicarbonato adequada*\n\n" +
      "🟡 *CONDUTA BEIRA-LEITO:*\n" +
      "1. Tranquilização e suporte verbal em ambiente calmo (técnicas de respiração lenta).\n" +
      "2. Descartar causas orgânicas graves: Tromboembolismo Pulmonar (TEP), sepse inicial, intoxicação por salicilatos e dor intensa.\n" +
      "3. Evitar respirar em saco de papel se hipoxemia ou suspeita de TEP.";
  }
  // Presets Renal
  else if (v === 'renal_ex1' || v === 'crcl:70kg') {
    var r1Cg = CalculadorasClinicas.cockcroftGault(1.8, 70, 68, false);
    var r1Ckd = CalculadorasClinicas.ckdEpi2021(1.8, 68, false);
    txtResultado = "🧪 *CLEARANCE DE CREATININA & FUNÇÃO RENAL: HOMEM 68 ANOS · 70 KG · Cr 1.8 mg/dL*\n\n" +
      "🔴 *RESULTADOS DETERMINÍSTICOS:*\n" +
      "• *Cockcroft-Gault (ClCr):* `" + r1Cg.principal + "`\n" +
      "• *CKD-EPI 2021 (TFG):* `" + r1Ckd.principal + "`\n" +
      "• *Classificação KDIGO:* " + r1Ckd.rotulo + "\n\n" +
      "🟡 *AJUSTES FARMACOLÓGICOS BEIRA-LEITO:*\n" +
      "• ClCr entre 30 e 50 mL/min: Reduzir dose ou ampliar intervalo de antimicrobianos (Meropenem 1g 12/12h, Pip-Tazo 3,375g 6/6h ou 4,5g 8/8h, Cefepime 2g 12/12h).\n" +
      "• Enoxaparina profilática: 20-40 mg SC 1x/dia (dose terapêutica: monitorar anti-Xa ou HNF).\n" +
      "• Bloqueio preventivo de AINEs e contraste iodado.";
  } else if (v === 'renal_ex2') {
    var r2Cg = CalculadorasClinicas.cockcroftGault(1.3, 56, 74, true);
    var r2Ckd = CalculadorasClinicas.ckdEpi2021(1.3, 74, true);
    txtResultado = "🧪 *FUNÇÃO RENAL: MULHER 74 ANOS · 56 KG · Cr 1.3 mg/dL*\n\n" +
      "🔴 *RESULTADOS DETERMINÍSTICOS:*\n" +
      "• *Cockcroft-Gault (ClCr):* `" + r2Cg.principal + "` (com fator feminino ×0,85)\n" +
      "• *CKD-EPI 2021 (TFG):* `" + r2Ckd.principal + "`\n" +
      "• *Classificação KDIGO:* " + r2Ckd.rotulo + "\n\n" +
      "🟡 *ALERTA BEIRA-LEITO (IDOSA SARCOPÊNICA):*\n" +
      "• Atenção: Apesar da Creatinina parecer 'pouco alterada' (1,3 mg/dL), o ClCr real é `" + r2Cg.principal + "` devido à baixa massa muscular e idade avançada!\n" +
      "• Ajustar obrigatoriamente antibióticos e anticoagulantes (NOACs/DOACs: Apixabana 2,5mg 12/12h se critérios, Rivaroxabana 15mg/dia).";
  } else if (v === 'renal_ex3') {
    var r3Cg = CalculadorasClinicas.cockcroftGault(0.9, 78, 28, false);
    var r3Ckd = CalculadorasClinicas.ckdEpi2021(0.9, 28, false);
    txtResultado = "🧪 *FUNÇÃO RENAL: JOVEM 28 ANOS · 78 KG · Cr 0.9 mg/dL*\n\n" +
      "🔴 *RESULTADOS DETERMINÍSTICOS:*\n" +
      "• *Cockcroft-Gault (ClCr):* `" + r3Cg.principal + "`\n" +
      "• *CKD-EPI 2021 (TFG):* `" + r3Ckd.principal + "`\n" +
      "• *Classificação KDIGO:* " + r3Ckd.rotulo + " (G1 - Normal)\n\n" +
      "🟡 *CONDUTA FARMACOLÓGICA:*\n" +
      "• Função renal plena / hiperfiltração fisiológica. Doses plenas habituais recomendadas.";
  } else if (v === 'renal_ex4') {
    var r4Cg = CalculadorasClinicas.cockcroftGault(3.2, 72, 65, false);
    var r4Ckd = CalculadorasClinicas.ckdEpi2021(3.2, 65, false);
    txtResultado = "🧪 *FUNÇÃO RENAL: PACIENTE COM DRC AVANÇADA / AGUDIZADA (Cr 3.2 mg/dL)*\n\n" +
      "🔴 *RESULTADOS DETERMINÍSTICOS:*\n" +
      "• *Cockcroft-Gault (ClCr):* `" + r4Cg.principal + "`\n" +
      "• *CKD-EPI 2021 (TFG):* `" + r4Ckd.principal + "`\n" +
      "• *Classificação KDIGO:* " + r4Ckd.rotulo + " (G4/G5 - Falência Severa)\n\n" +
      "🚨 *BLOQUEIOS SENTINELA & CONTRAINDICAÇÕES:*\n" +
      "• CONTRAINDICAÇÃO FORMAL: Metformina (risco crítico de acidose lática letal).\n" +
      "• CONTRAINDICAÇÃO: Enoxaparina dose plena terapêutica (preferir HNF com TTPa ou ajuste para 1 mg/kg 1x/dia).\n" +
      "• CONTRAINDICAÇÃO: Espironolactona e AINEs.\n" +
      "• Vigiar indicações de diálise de urgência (AEIOU: Acidose, Eletrólitos/K⁺, Intoxicação, Sobrecarga/Overload, Uremia).";
  }
  // Presets Holliday
  else if (v === 'hol_ex1') {
    var vol1 = 8 * 100;
    var vaz1 = (vol1 / 24).toFixed(1);
    var na1 = ((vol1 / 100) * 2.5).toFixed(1);
    var k1 = ((vol1 / 100) * 2.0).toFixed(1);
    txtResultado = "💧 *HIDRATAÇÃO HOLLIDAY-SEGAR: LACTENTE 8 KG*\n\n" +
      "🔴 *PRESCRIÇÃO VENOSA PEDIÁTRICA (24 HORAS):*\n" +
      "• *Volume Total 24h:* `800 mL/dia` (100 mL/kg para os primeiros 10 kg)\n" +
      "• *Vazão Contínua na BIC:* `" + vaz1 + " mL/h` (Regra 4-2-1: 4 mL/kg/h = 32 mL/h)\n\n" +
      "🟡 *COMPOSIÇÃO ELETROLÍTICA & GLICOSE (SBP):*\n" +
      "• SG 5%: 800 mL (prevenção de hipoglicemia e cetose de jejum)\n" +
      "• NaCl 20%: " + na1 + " mEq de Na⁺ (2,5 mEq/100 mL)\n" +
      "• KCl 10%: " + k1 + " mEq de K⁺ (2,0 mEq/100 mL)\n" +
      "• TIG Estimada: ~5,5 mg/kg/min (Alvo fisiológico: 4 a 6 mg/kg/min)\n\n" +
      "⚠️ *Salvaguarda:* Adicionar KCl à solução APENAS após comprovação de diurese ativa.";
  } else if (v === 'holliday:15kg') {
    var vol15 = 1250;
    var vaz15 = (vol15 / 24).toFixed(1);
    var na15 = ((vol15 / 100) * 2.5).toFixed(1);
    var k15 = ((vol15 / 100) * 2.0).toFixed(1);
    txtResultado = "💧 *HOLLIDAY-SEGAR: HIDRATAÇÃO PEDIÁTRICA 15 KG*\n\n" +
      "🔴 *PRESCRIÇÃO VENOSA PEDIÁTRICA (24 HORAS):*\n" +
      "• *Volume Total 24h:* `1.250 mL/dia` (1250 mL — 1000 mL + 50 mL/kg para peso entre 11 e 20 kg)\n" +
      "• *Vazão Contínua na BIC:* `" + vaz15 + " mL/h` (Regra 4-2-1: 40 + 2×5 = 50 mL/h | 1250/24h = 52.1 mL/h)\n\n" +
      "🟡 *COMPOSIÇÃO ELETROLÍTICA & GLICOSE (SBP):*\n" +
      "• SG 5%: 1.250 mL (1250 mL)\n" +
      "• NaCl 20%: " + na15 + " mEq de Na⁺ (2,5 mEq/100 mL)\n" +
      "• KCl 10%: " + k15 + " mEq de K⁺ (2,0 mEq/100 mL)\n" +
      "• TIG Estimada: ~4,6 mg/kg/min\n\n" +
      "⚠️ Usar soluções isotônicas ou balanceadas para prevenir hiponatremia hospitalar por excesso de ADH.";
  } else if (v === 'hol_ex2') {
    var vol2 = 1000 + (14 - 10) * 50;
    var vaz2 = (vol2 / 24).toFixed(1);
    var na2 = ((vol2 / 100) * 2.5).toFixed(1);
    var k2 = ((vol2 / 100) * 2.0).toFixed(1);
    txtResultado = "💧 *HIDRATAÇÃO HOLLIDAY-SEGAR: PRÉ-ESCOLAR 14 KG*\n\n" +
      "🔴 *PRESCRIÇÃO VENOSA PEDIÁTRICA (24 HORAS):*\n" +
      "• *Volume Total 24h:* `1.200 mL/dia` (1000 mL + 50 mL/kg para peso entre 11 e 20 kg)\n" +
      "• *Vazão Contínua na BIC:* `" + vaz2 + " mL/h` (Regra 4-2-1: 40 + 2×4 = 48 mL/h)\n\n" +
      "🟡 *COMPOSIÇÃO ELETROLÍTICA & GLICOSE (SBP):*\n" +
      "• SG 5%: 1.200 mL\n" +
      "• NaCl 20%: " + na2 + " mEq de Na⁺ (2,5 mEq/100 mL)\n" +
      "• KCl 10%: " + k2 + " mEq de K⁺ (2,0 mEq/100 mL)\n" +
      "• TIG Estimada: ~4,8 mg/kg/min\n\n" +
      "⚠️ Usar soluções isotônicas ou balanceadas para prevenir hiponatremia hospitalar por excesso de ADH.";
  } else if (v === 'hol_ex3') {
    var vol3 = 1500 + (22 - 20) * 20;
    var vaz3 = (vol3 / 24).toFixed(1);
    var na3 = ((vol3 / 100) * 2.5).toFixed(1);
    var k3 = ((vol3 / 100) * 2.0).toFixed(1);
    txtResultado = "💧 *HIDRATAÇÃO HOLLIDAY-SEGAR: ESCOLAR 22 KG*\n\n" +
      "🔴 *PRESCRIÇÃO VENOSA PEDIÁTRICA (24 HORAS):*\n" +
      "• *Volume Total 24h:* `1.540 mL/dia` (1500 mL + 20 mL/kg acima de 20 kg)\n" +
      "• *Vazão Contínua na BIC:* `" + vaz3 + " mL/h` (Regra 4-2-1: 60 + 2×1 = 62 mL/h)\n\n" +
      "🟡 *COMPOSIÇÃO ELETROLÍTICA (SBP):*\n" +
      "• SG 5%: 1.540 mL\n" +
      "• NaCl 20%: " + na3 + " mEq de Na⁺\n" +
      "• KCl 10%: " + k3 + " mEq de K⁺ (apenas pós-diurese confirmada)\n" +
      "• TIG Estimada: ~4,3 mg/kg/min.";
  } else if (v === 'hol_ex4') {
    var vol4Basal = 1000 + (11 - 10) * 50; // 1050
    var vol4Restr = Math.round(vol4Basal * 0.7); // 735 mL
    var vaz4 = (vol4Restr / 24).toFixed(1);
    txtResultado = "🫁 *HIDRATAÇÃO RESTRITA: BRONQUIOLITE VIRAL AGUDA (BVA) 11 KG*\n\n" +
      "🔴 *RESTRIÇÃO VOLÊMICA (70% DE HOLLIDAY-SEGAR):*\n" +
      "• *Justificativa:* Crianças com bronquiolite e desconforto respiratório retêm água livre por secreção inadequada de ADH. A hidratação plena a 100% precipita edema pulmonar e piora da hipoxemia.\n" +
      "• *Volume 24h Ajustado:* `735 mL/dia` (em vez de 1.050 mL)\n" +
      "• *Vazão Contínua na BIC:* `" + vaz4 + " mL/h`\n\n" +
      "🟡 *ALERTAS BEIRA-LEITO:*\n" +
      "• Monitorar Na⁺ sérico para excluir hiponatremia dilucional aguda.\n" +
      "• Preferir via enteral em pequenos volumes fracionados se tolerado sem taquipneia extrema.";
  }
  // Presets Glasgow
  else if (v === 'gcs_ex1') {
    var rG1 = CalculadorasClinicas.glasgowP(4, 5, 6, 0);
    txtResultado = "🧠 *ESCALA DE COMA DE GLASGOW-P: PACIENTE ALERTA (GCS 15)*\n\n" +
      "• *Componentes:* Ocular 4/4 (Espontânea) | Verbal 5/5 (Orientado) | Motor 6/6 (Obedece) | Pupilas 0/2 (Reagentes)\n" +
      "• *Escore GCS:* `15/15` | *GCS-P:* `15/15`\n" +
      "• *Classificação:* TCE Leve / Normalidade neurológica\n\n" +
      "🟡 *CONDUTA BEIRA-LEITO:*\n" +
      "• Avaliar indicação de TC de crânio pelos critérios de New Orleans ou Canadian CT Head Rule (idade ≥ 65, vômitos ≥ 2 episódios, perda de consciência > 5 min, amnésia retrógrada > 30 min, mecanismo de alta energia ou uso de anticoagulantes/antiplaquetários).";
  } else if (v === 'gcs_ex2') {
    var rG2 = CalculadorasClinicas.glasgowP(3, 3, 5, 0);
    txtResultado = "🧠 *ESCALA DE COMA DE GLASGOW-P: TCE MODERADO (GCS 11)*\n\n" +
      "• *Componentes:* Ocular 3/4 (À voz) | Verbal 3/4 (Palavras inapropriadas) | Motor 5/6 (Localiza estímulo) | Pupilas 0/2 (Fotorreagentes)\n" +
      "• *Escore GCS:* `11/15` | *GCS-P:* `11/15`\n" +
      "• *Classificação:* TCE MODERADO (GCS 9 a 12)\n\n" +
      "🟡 *CONDUTA MANDATÓRIA (ATLS 10ª ED / BRAIN TRAUMA FOUNDATION):*\n" +
      "1. *Tomografia Computadorizada de Crânio IMEDIATA: Indicação absoluta.*\n" +
      "2. Monitorização neurológica seriada a cada 30 a 60 minutos.\n" +
      "3. Avaliação neurocirúrgica precoce.\n" +
      "4. Manter cabeceira elevada a 30°, alinhamento cervical e normotermia.\n" +
      "5. Preparar material de IOT: Qualquer queda de ≥ 2 pontos ou GCS ≤ 8 exige via aérea definitiva imediata!";
  } else if (v === 'gcs_ex3' || v === 'glasgow:grave') {
    var rG3 = CalculadorasClinicas.glasgowP(1, 2, 4, 1);
    txtResultado = "🚨 *GLASGOW-P: TCE GRAVE (GCS 7 / GCS-P 6) — INDICAÇÃO DE INTUBAÇÃO IMEDIATA*\n\n" +
      "• *Componentes:* Ocular 1/4 (Ausente) | Verbal 2/5 (Sons) | Motor 4/6 (Flexão) | Pupilas 1/2 (Reação unilateral)\n" +
      "• *Escore GCS:* `7/15` (GCS 7) | *GCS-P:* `6/15` (GCS-P 6)\n" +
      "• *Classificação:* 🔴 TCE GRAVE / REBAIXAMENTO SEVERO (GCS ≤ 8)\n\n" +
      "🚨 *CONDUTA IMEDIATA EM SALA VERMELHA:*\n" +
      "1. *VIA AÉREA DEFINITIVA MANDATÓRIA (Intubação Orotraqueal):* Paciente incapaz de proteger via aérea. Risco crítico de broncoaspiração e hipóxia secundária.\n" +
      "2. *Sequência Rápida de Intubação com Neuroproteção (SRI TCE):*\n" +
      "   • Fentanil 2-3 mcg/kg 3 min antes da laringoscopia (atenuação simpática)\n" +
      "   • Etomidato 0,3 mg/kg (indutor de escolha: estabilidade hemodinâmica e reduz PIC)\n" +
      "   • Rocurônio 1,2 mg/kg ou Succinilcolina 1,5 mg/kg\n" +
      "3. Evitar rigorosamente hipotensão (PAS < 100-110 mmHg) e hipóxia (SpO₂ < 90% dobra a mortalidade no TCE).\n" +
      "4. TC de crânio urgente após estabilização da via aérea e leito de UTI.";
  } else if (v === 'gcs_ex4') {
    var rG4 = CalculadorasClinicas.glasgowP(1, 1, 2, 2);
    txtResultado = "🚨 *GLASGOW-P: MIDRÍASE PARALÍTICA BILATERAL (GCS 4 - P2 = GCS-P 2)*\n\n" +
      "• *Componentes:* Ocular 1/4 | Verbal 1/5 | Motor 2/6 (Descerebração) | Pupilas 2/2 (Ambas não reagem)\n" +
      "• *Escore GCS:* `4/15` | *GCS-P:* `2/15` (GCS 4 − Pupilas 2)\n" +
      "• *Classificação:* ⛔ REBAIXAMENTO CRÍTICO / SÍNDROME DE HERNIAÇÃO CEREBRAL\n\n" +
      "🚨 *EMERGÊNCIA ZERO — MEDIDAS DE RESGATE PARA HIPERTENSÃO INTRACRANIANA (HIC):*\n" +
      "1. *Intubação Imediata* com ventilação protetora (manter PaCO₂ 35-38 mmHg; hiperventilação de resgate temporária 30-35 mmHg apenas se sinais de herniação ativa).\n" +
      "2. *Terapia Osmolar de Urgência:* Salina Hipertônica 3% (250 mL IV em 15 min) ou Manitol 20% (1 g/kg IV rápido).\n" +
      "3. Cabeceira 30° centrada, afrouxar colar cervical que comprima jugulares.\n" +
      "4. Neurocirurgia de emergência para descompressão / craniectomia.";
  }
  // Presets Parkland
  else if (v === 'park_ex1' || v === 'parkland:70kg20p') {
    var rP1 = CalculadorasClinicas.parkland(70, 20);
    txtResultado = "🔥 *PARKLAND: ADULTO 70 KG · 20% SUPERFÍCIE CORPÓREA QUEIMADA (SCQ)*\n\n" +
      "🔴 *RESSUSCITAÇÃO VOLÊMICA ATLS 10ª ED / SBA (24 HORAS):*\n" +
      "• *Fórmula:* 4 mL × 70 kg × 20% SCQ = `5.600 mL (5600 mL) de Ringer Lactato` em 24h\n\n" +
      "⏱️ *CRONOGRAMA DE INFUSÃO EM BIC:*\n" +
      "1️⃣ *Primeiras 8h a contar do ACIDENTE:* `2.800 mL` → **350 mL/h na BIC**\n" +
      "2️⃣ *Próximas 16 horas:* `2.800 mL` → **175 mL/h na BIC**\n\n" +
      "🎯 *META DE DÉBITO URINÁRIO (SVD HORÁRIA):*\n" +
      "• Adulto: 0,5 a 1,0 mL/kg/h (**35 a 70 mL/h**)\n" +
      "• Titular a vazão de RL hora a hora conforme a diurese medida para prevenir choque hipovolêmico ou síndrome compartimental abdominal.";
  } else if (v === 'park_ex2') {
    var rP2 = CalculadorasClinicas.parkland(80, 35);
    txtResultado = "🔥 *PARKLAND: ADULTO 80 KG · 35% SUPERFÍCIE CORPÓREA QUEIMADA (SCQ)*\n\n" +
      "🔴 *RESSUSCITAÇÃO VOLÊMICA ATLS 10ª ED / SBA (24 HORAS):*\n" +
      "• *Fórmula:* 4 mL × 80 kg × 35% SCQ = `11.200 mL de Ringer Lactato` em 24h\n\n" +
      "⏱️ *CRONOGRAMA DE INFUSÃO EM BIC:*\n" +
      "1️⃣ *Primeiras 8h a contar do ACIDENTE:* `5.600 mL` → **700 mL/h na BIC**\n" +
      "2️⃣ *Próximas 16 horas:* `5.600 mL` → **350 mL/h na BIC**\n\n" +
      "🎯 *META DE DÉBITO URINÁRIO (SVD HORÁRIA):*\n" +
      "• Alvo: 0,5 a 1,0 mL/kg/h (**40 a 80 mL/h**)\n" +
      "• Descontar da 1ª etapa qualquer volume já infundido pelo SAMU/resgate pré-hospitalar.\n" +
      "• Vigiar Pressão Intra-Abdominal (PIA): Volumes maciços aumentam risco de Síndrome Compartimental Abdominal.";
  } else if (v === 'park_ex3') {
    var rP3 = CalculadorasClinicas.parkland(65, 15);
    txtResultado = "🔥 *PARKLAND: ADULTO 65 KG · 15% SCQ*\n\n" +
      "🔴 *RESSUSCITAÇÃO VOLÊMICA ATLS (24 HORAS):*\n" +
      "• *Fórmula:* 4 mL × 65 kg × 15% SCQ = `3.900 mL de Ringer Lactato`\n" +
      "• 1ª Etapa (Primeiras 8h): 1.950 mL (**244 mL/h na BIC**)\n" +
      "• 2ª Etapa (Próximas 16h): 1.950 mL (**122 mL/h na BIC**)\n" +
      "• Diurese Alvo: 32 a 65 mL/h (SVD horária).";
  } else if (v === 'park_ex4') {
    var rP4 = CalculadorasClinicas.parkland(75, 45);
    txtResultado = "🚨 *PARKLAND: GRANDE QUEIMADO CRÍTICO (75 KG · 45% SCQ)*\n\n" +
      "🔴 *RESSUSCITAÇÃO VOLÊMICA DE GRANDE QUEIMADO:*\n" +
      "• *Fórmula:* 4 mL × 75 kg × 45% SCQ = `13.500 mL de Ringer Lactato` em 24h\n" +
      "• 1ª Etapa (Primeiras 8h): 6.750 mL (**844 mL/h na BIC**)\n" +
      "• 2ª Etapa (Próximas 16h): 6.750 mL (**422 mL/h na BIC**)\n\n" +
      "⚠️ *CUIDADOS CRÍTICOS BEIRA-LEITO:*\n" +
      "• Transferência urgente para Centro de Tratamento de Queimados (CTQ).\n" +
      "• Monitorização invasiva de PAM, SVD horária e medidas seriadas de PIA.\n" +
      "• Avaliar lesão de via aérea por inalação (queimadura em face, vibrissas nasais chamuscadas, escarro carbonáceo, rouquidão): Indicação precoce de IOT antes do edema obstrutivo!";
  } else if (v === 'dva:nora70') {
    if (typeof CalculadorasClinicas !== "undefined" && typeof CalculadorasClinicas.drogasVasoativas === "function") {
      var rDvaAuto = CalculadorasClinicas.drogasVasoativas('noradrenalina', 70, 'padrao');
      txtResultado = rDvaAuto && rDvaAuto.textoFormatado ? rDvaAuto.textoFormatado : "💉 *NORADRENALINA 70 KG (SOLUÇÃO PADRÃO 64 mcg/mL)*\n\n• Concentração: 4 amp (16 mg) em 250 mL SG 5% = 64 mcg/mL\n• Dose inicial (0,05 mcg/kg/min): 3,3 mL/h\n• Dose habitual (0,20 mcg/kg/min): 13,1 mL/h\n• Titulação estrita por PAM alvo >= 65 mmHg.";
    } else {
      txtResultado = "💉 *NORADRENALINA 70 KG (SOLUÇÃO PADRÃO 64 mcg/mL)*\n\n• Concentração: 4 amp (16 mg) em 250 mL SG 5% = 64 mcg/mL\n• Dose inicial (0,05 mcg/kg/min): 3,3 mL/h\n• Dose habitual (0,20 mcg/kg/min): 13,1 mL/h\n• Titulação estrita por PAM alvo >= 65 mmHg.";
    }
  } else {
    return enviarMenuUXCalculadoras(chat, msgId);
  }

  var ck = Utilities.getUuid().replace(/-/g, "");
  safePutCache(cache, ck, txtResultado, 21600);
  return enviarTelaBot(chat, txtResultado, botoesBot([
    [['📋 Copiar Cálculo', 'ux:copiar:' + ck]],
    [['🔙 Calculadoras', 'ux:hub:calc'], ['🏠 Início', 'ux:hub:inicio']]
  ]), msgId);
}

function enviarRotinaBot(chat, messageId) {
  if (typeof ehUsuarioTitular === 'function' && !ehUsuarioTitular(chat)) {
    return enviarTelaBot(chat, "🔒 *Recurso Restrito ao Titular*\n\nA central de rotina, lifestyle e agenda do Notion é exclusiva do administrador da conta.\n\nUse o botão abaixo para voltar ao início.", botoesBot([
      [['🏠 Início', 'ux:hub:inicio']]
    ]), messageId);
  }
  var hoje = new Date();
  var blocos = (typeof RotinaService !== "undefined" && RotinaService.obterBlocosDoDia) ? RotinaService.obterBlocosDoDia(hoje) : [];
  var timeline = (typeof RotinaService !== "undefined" && RotinaService.formatarTimelineMarkdown) ? RotinaService.formatarTimelineMarkdown(blocos, hoje) : "";

  var texto = "*📅 Central de Rotina & Lifestyle Adaptativo*\n\n" +
              (timeline ? timeline + "\n\n" : "") +
              "Selecione uma opção rápida:";

  var botoes = botoesBot([
    [['🎯 Sniper de Plantões', 'sniper:painel'], ['🔄 Restaurar Padrão', 'rotina:reset']],
    [['📆 Agenda de Hoje', 'ux:rotina:agenda'], ['📆 Agenda de Amanhã', 'ux:rotina:agenda_amanha']],
    [['☀️ Briefing Matinal', 'ux:rotina:briefing'], ['🌙 Check-in Noturno', 'ux:rotina:checkin']],
    [['🏠 Início', 'ux:hub:inicio']]
  ]);

  return enviarTelaBot(chat, texto, botoes, messageId);
}

/* ========== Enfermaria ========== */

function mostrarPainelLeitos(chat, pagina, msgId) {
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
  if (!keys.length) {
    texto += 'Nenhum leito registrado no momento.\n\n' +
      '💡 *Como admitir ou evoluir:*\n' +
      '• Digite `/leito <num> <evolução>` (ex: `/leito 4 72a, PAC grave, Ceftriaxona D3, aguarda vaga CTI`)\n' +
      '• Ou envie um áudio ditando a evolução do leito no corredor.';
  } else {
    slice.forEach(function (id) {
      var l = all[id];
      texto += '*Leito ' + id + '* · ' + l.status + '\n' + l.dataISO + ' às ' + l.atualizadoEm + '\n\n';
      rows.push([['Abrir leito ' + id, 'ux:leito:' + id]]);
    });
    var nav = [];
    if (pagina > 0) nav.push(['← Anterior', 'ux:painel:' + (pagina - 1)]);
    if ((pagina + 1) * 5 < keys.length) nav.push(['Próxima →', 'ux:painel:' + (pagina + 1)]);
    if (nav.length) rows.push(nav);

    var ckCenso = Utilities.getUuid().replace(/-/g, '');
    safePutCache(uxCache(), ckCenso, EnfermariaService.formatarPainelBordo(), 21600);
    rows.push([['📋 Copiar Censo para Prontuário', 'ux:copiar:' + ckCenso]]);
  }
  rows.push([['🔄 Atualizar', 'ux:painel:' + pagina], ['Passagem SBAR', UX_CB_PASSAGEM_SBAR]]);
  rows.push([['🔙 Enfermaria', 'ux:hub:enf'], ['🏠 Início', 'ux:hub:inicio']]);
  return enviarTelaBot(chat, texto, botoesBot(rows), msgId);
}
var enviarPainelEnfermaria = mostrarPainelLeitos;

function uxTelaLeito(chat, id, msgId, aviso) {
  var l = EnfermariaService.obterLeito(id);
  if (!l) {
    return enviarMensagemComTecladoParaChat(chat, 'Leito não encontrado.', botoesBot([
      [['🏥 Painel de Leitos', 'ux:painel:0']],
      [['🔙 Enfermaria', 'ux:hub:enf'], ['🏠 Início', 'ux:hub:inicio']]
    ]));
  }
  var texto = (aviso ? '✅ ' + aviso + '\n\n' : '') +
    '🛏️ *Leito ' + id + '* · ' + l.status + '\n📅 ' + l.dataISO + ' às ' + l.atualizadoEm + '\n\n' + l.dados;
  var ver = (l.version ? l.version.slice(0, 8) : '');

  var textoPep = "LEITO " + id + " · " + l.status + " (" + l.dataISO + " às " + l.atualizadoEm + ")\n\n" + l.dados;
  var cache = uxCache();
  var ckLeito = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ckLeito, textoPep, 21600);

  var limpoPep = typeof uxTextoProntuario === 'function' ? uxTextoProntuario(textoPep) : textoPep;
  var btnCopiar;
  if (limpoPep.length >= 1 && limpoPep.length <= UX_MAX_COPY_TEXT) {
    btnCopiar = [{ text: '📋 Copiar para Prontuário', copy_text: { text: limpoPep } }];
  } else {
    btnCopiar = [{ text: '📋 Copiar para Prontuário', callback_data: 'ux:copiar:' + ckLeito }];
  }

  return enviarTelaBot(chat, texto, botoesBot([
    [btnCopiar[0]],
    [['🟢 Estável', 'ux:status:' + id + ':estavel' + (ver ? ':' + ver : '')], ['🟡 Vigilância', 'ux:status:' + id + ':vigilancia' + (ver ? ':' + ver : '')]],
    [['🔴 Instável', 'ux:status:' + id + ':instavel' + (ver ? ':' + ver : '')]],
    [['✏️ Evoluir leito', 'ux:evoluir:' + id], ['Dar alta', 'ux:confirmar:' + id]],
    [['← Leitos', 'ux:painel:0'], ['🔙 Enfermaria', 'ux:hub:enf']],
    [['🏠 Início', 'ux:hub:inicio']]
  ]), msgId);
}

function confirmarAltaBot(chat, id) {
  var l = EnfermariaService.obterLeito(id);
  if (!l) {
    return enviarMensagemComTecladoParaChat(chat, 'Leito não encontrado.', botoesBot([
      [['🏥 Painel de Leitos', 'ux:painel:0']],
      [['🔙 Enfermaria', 'ux:hub:enf'], ['🏠 Início', 'ux:hub:inicio']]
    ]));
  }
  var code = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  safePutCache(uxCache(), 'alta_' + code, JSON.stringify({
    id: id, chat: String(chat), version: l.version || (l.dataISO + ' ' + l.atualizadoEm)
  }), 300);
  return enviarMensagemComTecladoParaChat(chat,
    'Confirmar alta do leito ' + id + '? O histórico será preservado com segurança.',
    botoesBot([
      [['Confirmar alta', 'ux:alta:' + code], ['Cancelar', 'ux:leito:' + id]],
      [['🔙 Enfermaria', 'ux:hub:enf'], ['🏠 Início', 'ux:hub:inicio']]
    ]));
}

function processarAcaoLeito(chat, op, v, msgId) {
  var cache = uxCache();
  if (op === 'painel') {
    return mostrarPainelLeitos(chat, v, msgId);
  }
  if (op === 'leito' || op === 'abrir') {
    return uxTelaLeito(chat, v, msgId);
  }
  if (op === 'status') {
    var ps = v.split(':'), numL = ps[0], tipo = ps[1], versaoEsp = ps[2];
    if (UX_STATUS_LEITO.indexOf(tipo) === -1) {
      return enviarMensagemComTecladoParaChat(chat, 'Status inválido.', botoesBot([
        [['🔙 Enfermaria', 'ux:hub:enf'], ['🏠 Início', 'ux:hub:inicio']]
      ]));
    }
    if (!versaoEsp) {
      return enviarMensagemComTecladoParaChat(chat, 'Este botão de status pertence a uma mensagem anterior ou a outro paciente. Abra o leito novamente.', botoesBot([
        [['🛏️ Abrir Leito ' + numL, 'ux:leito:' + numL]],
        [['🔙 Enfermaria', 'ux:hub:enf'], ['🏠 Início', 'ux:hub:inicio']]
      ]));
    }
    var rSt = EnfermariaService.atualizarStatusLeito(numL, tipo, versaoEsp);
    if (rSt.sucesso) return uxTelaLeito(chat, numL, msgId, rSt.mensagem);
    return enviarMensagemComTecladoParaChat(chat, rSt.erro || rSt.mensagem, botoesBot([
      [['🛏️ Abrir Leito ' + numL, 'ux:leito:' + numL]],
      [['🔙 Enfermaria', 'ux:hub:enf'], ['🏠 Início', 'ux:hub:inicio']]
    ]));
  }
  if (op === 'evoluir') {
    aguardarEvolucaoLeito(chat, v);
    var txtEvoluir = '📝 *EVOLUÇÃO DO LEITO ' + v + '*\n\n' +
      'Envie a nova evolução do leito por texto ou mensagem de voz.\n' +
      'A versão anterior ficará registrada no histórico com segurança.\n\n' +
      '💡 *Exemplo:* `72a, PAC grave, SpO2 94% em cateter 2L/min, Ceftriaxona D4. Pendências: gasometria controle`';
    return enviarMensagemComTecladoParaChat(chat, txtEvoluir, botoesBot([
      [['🔙 Cancelar / Leito ' + v, 'ux:leito:' + v]],
      [['🔙 Enfermaria', 'ux:hub:enf'], ['🏠 Início', 'ux:hub:inicio']]
    ]));
  }
  if (op === 'confirmar') {
    return confirmarAltaBot(chat, v);
  }
  if (op === 'alta') {
    var rawAlta = cache.get('alta_' + v);
    if (!rawAlta) {
      return enviarMensagemComTecladoParaChat(chat, 'Confirmação expirada. Abra o leito novamente.', botoesBot([
        [['🏥 Painel de Leitos', 'ux:painel:0']],
        [['🔙 Enfermaria', 'ux:hub:enf'], ['🏠 Início', 'ux:hub:inicio']]
      ]));
    }
    var a = JSON.parse(rawAlta);
    if (a.chat !== String(chat)) {
      return enviarMensagemComTecladoParaChat(chat, 'Confirmação inválida para este chat.', botoesBot([
        [['🔙 Enfermaria', 'ux:hub:enf'], ['🏠 Início', 'ux:hub:inicio']]
      ]));
    }
    var result = EnfermariaService.desocuparLeito(a.id, a.version);
    cache.remove('alta_' + v);
    return enviarMensagemComTecladoParaChat(chat, result.mensagem, botoesBot([
      [['🏥 Painel de Leitos', 'ux:painel:0'], ['📋 Passagem SBAR', 'ux:enf:sbar']],
      [['🔙 Enfermaria', 'ux:hub:enf'], ['🏠 Início', 'ux:hub:inicio']]
    ]));
  }
  return false;
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

/* ========== Cenário GO: 🌸🤰 Ginecologia & Obstetrícia (Internato até 29/11) ========== */

// 1. Pré-Natal & DPP
function enviarTelaGOPrenatal(chat, messageId) {
  var texto = "🤰 *CÁLCULO DE IG & ROTINA DE PRÉ-NATAL (MS & FEBRASGO)*\n\n" +
    "• *Cronologia Obstétrica:* Cálculo de IG e DPP pela regra de Naegele e 1º USG precoce.\n" +
    "• *Concordância FEBRASGO:* Margem de erro de 5 dias no 1º tri (CCN ≤ 8s6d) vs redatação por USG.\n" +
    "• *Ganho de Peso IOM/MS:* Metas ponderais individualizadas pelo IMC pré-gestacional.\n" +
    "• *Rastreio Trimestral:* Sorologias, GJ (corte 92), TOTG 75g (24-28s) e Swab GBS (35-37s).\n" +
    "• *Segurança Farmacológica:* Validação imediata de medicamentos na gestação.\n\n" +
    "💡 *Toque em um caso rápido abaixo para cálculo em 0ms ou envie `/prenatal [dados]`*:";

  var guiaTexto = "ROTINA DE PRÉ-NATAL DE BAIXO RISCO (MINISTÉRIO DA SAÚDE / FEBRASGO)\n" +
    "- 1º Trimestre: Tipagem ABO/Rh + Coombs indireto se Rh negativo, Hemograma, Glicemia de jejum, VDRL, Anti-HIV, HBsAg, Sorologia Toxoplasmose (IgG/IgM), EAS e Urocultura.\n" +
    "- 2º Trimestre (24 a 28s): TOTG 75g (Cortes: Jejum ≥ 92 | 1h ≥ 180 | 2h ≥ 153 mg/dL). Coombs se Rh neg.\n" +
    "- 3º Trimestre (28 a 36s): Repetição VDRL, Anti-HIV, HBsAg, Hemograma e Urocultura. Swab GBS entre 35-37s.\n" +
    "- Suplementação: Ácido Fólico 400 mcg/dia pré-concepção até 12s + Sulfato Ferroso 40mg ferro elementar/dia a partir da 20ª semana.";

  var cache = uxCache();
  var ckGuia = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ckGuia, guiaTexto, 21600);

  var botoes = botoesBot([
    [['🤰 Caso DUM 10/02/2026', 'ux:go:prenatal:dum'], ['💊 Auditoria Fármacos', 'ux:go:prenatal:med']],
    [['🔬 Sorologias 1º Tri', 'ux:go:prenatal:soro']],
    [['📋 Copiar Guia Pré-Natal', 'ux:copiar:' + ckGuia]],
    [['🔙 Hub G&O', 'ux:rotina:go'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function tratarCallbackGOPrenatal(chat, v, messageId) {
  var textoRes = "";
  if (v === 'dum') {
    if (typeof ObstetriciaPrenatalService !== "undefined" && typeof ObstetriciaPrenatalService.gerarResumoConsultaPrenatal === "function") {
      var r = ObstetriciaPrenatalService.gerarResumoConsultaPrenatal({ dum: '10/02/2026', pesoPreGestacional: 65, altura: 1.62 });
      textoRes = r.sucesso ? r.textoFormatado : "Não foi possível calcular o pré-natal.";
    } else {
      textoRes = "CRONOLOGIA OBSTÉTRICA:\n• DUM: 10/02/2026\n• DPP (Naegele): 17/11/2026\n• Meta Ganho Ponderal IOM: 11.5 a 16.0 kg (Eutrofia).";
    }
  } else if (v === 'med') {
    if (typeof ObstetriciaPrenatalService !== "undefined" && typeof ObstetriciaPrenatalService.auditarPrescricaoGestante === "function") {
      var a = ObstetriciaPrenatalService.auditarPrescricaoGestante("Enalapril, Sinvastatina, Metildopa, Paracetamol");
      textoRes = "AUDITORIA DE SEGURANÇA FARMACOLÓGICA NA GESTAÇÃO:\nParecer: " + a.parecerGeral + "\n";
      if (a.contraindicados && a.contraindicados.length > 0) {
        textoRes += "\n⛔ CONTRAINDICADOS:\n" + a.contraindicados.map(function(c) { return "• " + c.medicamento + " (" + c.classe + ") - " + c.alertas[0] + " [Alternativas: " + c.alternativasRecomendadas.join(", ") + "]"; }).join("\n");
      }
      if (a.seguros && a.seguros.length > 0) {
        textoRes += "\n\n✅ SEGUROS:\n" + a.seguros.map(function(s) { return "• " + s.medicamento + " (" + s.categoriaFda + ")"; }).join("\n");
      }
    } else {
      textoRes = "AUDITORIA FARMACOLÓGICA GESTANTE:\n⛔ Enalapril: Categoria D - Risco de disgenesia renal fetal e oligoidrâmnio.\n⛔ Sinvastatina: Categoria X - Contraindicação absoluta.\n✅ Metildopa e Paracetamol: Seguros na gestação.";
    }
  } else if (v === 'soro') {
    if (typeof ObstetriciaPrenatalService !== "undefined" && typeof ObstetriciaPrenatalService.interpretarSorologiasLaboratorioPrenatal === "function") {
      var s = ObstetriciaPrenatalService.interpretarSorologiasLaboratorioPrenatal({ glicemiaJejum: 94, vdrl: "não reagente", toxoIgg: "não reagente", toxoIgm: "não reagente", semanasGestacao: 12 });
      textoRes = s.sucesso ? s.textoFormatado : "Não foi possível interpretar sorologias.";
    } else {
      textoRes = "INTERPRETAÇÃO DE EXAMES PRÉ-NATAL:\n• Glicemia Jejum: 94 mg/dL -> Alerta: DMG (Glicemia de jejum ≥ 92 mg/dL no 1º trimestre).\n• VDRL: Não reagente.\n• Toxoplasmose: IgG- / IgM- (Suscetível - orientar prevenção primária e sorologia trimestral).";
    }
  }

  var cache = uxCache();
  var ck = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ck, textoRes, 21600);

  var msgCorpo = "🤰 *CONDUTA DETERMINÍSTICA DE PRÉ-NATAL:*\n\n```text\n" + textoRes + "\n```";
  var botoes = botoesBot([
    [['📋 Copiar Conduta', 'ux:copiar:' + ck]],
    [['🔙 Hub G&O', 'ux:rotina:go'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, msgCorpo, botoes, messageId);
}

// 2. Parto & Partograma
function enviarTelaGOParto(chat, messageId) {
  var texto = "🏥 *ASSISTÊNCIA AO PARTO & CENTRO OBSTÉTRICO (MS & FEBRASGO)*\n\n" +
    "• *Fase Ativa de Parto:* Dilatação cervical ≥ 4 cm + contrações regulares (≥ 2/10 min com ≥ 30s).\n" +
    "• *Planos de De Lee:* Altura da apresentação (-3 a +3; plano 0 = feto insinuado nas espinhas isquiáticas).\n" +
    "• *Índice de Bishop:* Score > 6 (colo favorável à ocitocina); ≤ 6 (colo desfavorável -> misoprostol/Foley).\n" +
    "• *Boas Práticas:* Liberdade de movimentação, analgesia de parto, ausculta intermitente de BCF e episiotomia NÃO rotineira.\n\n" +
    "💡 *Toque em um caso rápido abaixo para conduta em 0ms ou envie `/parto [dados]`*:";

  var guiaTexto = "DIRETRIZES DE ASSISTÊNCIA AO PARTO NORMAL (MS / FEBRASGO)\n" +
    "- Fase Ativa: Abertura de Partograma. Ausculta de BCF a cada 15-30 min. Toque vaginal a cada 2-4h.\n" +
    "- Período Expulsivo: Puxos espontâneos, liberdade de posição materna, ausculta de BCF a cada 5 min.\n" +
    "- 3º Período (Dequitadura): Ocitocina 10 UI IM após desprendimento do ombro anterior (prevenção padrão de HPP). Clampeamento oportuno do cordão (1 a 3 min).\n" +
    "- 4º Período (Greenberg): Vigilância estrita de tônus uterino e sangramento nos primeiros 60 min.";

  var cache = uxCache();
  var ckGuia = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ckGuia, guiaTexto, 21600);

  var botoes = botoesBot([
    [['🏥 Fase Ativa (6cm Lee 0)', 'ux:go:parto:ativa'], ['📐 Bishop Desfavorável (3 pts)', 'ux:go:parto:bishop']],
    [['👶 Período Expulsivo (10cm)', 'ux:go:parto:expulsivo']],
    [['📋 Copiar Guia Parto', 'ux:copiar:' + ckGuia]],
    [['🔙 Hub G&O', 'ux:rotina:go'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function tratarCallbackGOParto(chat, v, messageId) {
  var textoRes = "";
  if (v === 'ativa') {
    if (typeof CentroObstetricoService !== "undefined" && typeof CentroObstetricoService.avaliarTrabalhoParto === "function") {
      var r = CentroObstetricoService.avaliarTrabalhoParto({ dilatacaoCm: 6, contracoes10min: 3, duracaoContracaoSeg: 45, planoDeLee: 0, bcf: 140, bolsa: 'integra', liquidoAmniotico: 'claro' });
      var conds = (r.condutaFase || r.condutasFase || []).map(function(c){ return "• " + c; }).join("\n");
      textoRes = "FASE CLÍNICA: " + r.faseDescricao + "\nALTURA APRESENTAÇÃO: " + (r.deLeeInfo || ("Plano " + r.planoDeLee)) + "\nESTADO DAS MEMBRANAS: Bolsa " + (r.bolsa || "íntegra") + (r.liquidoAmniotico ? " (" + r.liquidoAmniotico + ")" : "") + "\n\nCONDUTAS RECOMENDADAS:\n" + conds;
    } else {
      textoRes = "FASE ATIVA DE PARTO:\n• Dilatação: 6 cm | Apresentação: Plano 0 de De Lee (Insinuado) | BCF: 140 bpm.\n• Abertura imediata de partograma.\n• Ausculta intermitente de BCF a cada 15 a 30 minutos.\n• Estímulo a métodos não farmacológicos de alívio da dor.";
    }
  } else if (v === 'bishop') {
    if (typeof CentroObstetricoService !== "undefined" && typeof CentroObstetricoService.calcularIndiceBishop === "function") {
      var b = CentroObstetricoService.calcularIndiceBishop({ dilatacaoCm: 2, apagamentoPct: 40, consistenciaColo: 'firme', posicaoColo: 'posterior', planoDeLee: -2 });
      var pts = (b.pontos !== undefined) ? b.pontos : (b.scoreTotal !== undefined ? b.scoreTotal : 3);
      var interp = b.interpretacao || b.classificacao || (b.favoravel ? "Favorável" : "Desfavorável");
      var cond = b.condutaInducao || b.recomendacaoInducao || "";
      textoRes = "ÍNDICE DE BISHOP: " + pts + " pontos\n" + interp + "\n\nCONDUTA E PREPARO CERVICAL:\n" + cond;
    } else {
      textoRes = "ÍNDICE DE BISHOP: 3 pontos (Colo Desfavorável - Score ≤ 6)\n• Conduta: Preparo cervical com Misoprostol 25 mcg vaginal a cada 4-6h ou método mecânico com Sonda de Foley (Krauss) antes da infusão de ocitocina.";
    }
  } else if (v === 'expulsivo') {
    if (typeof CentroObstetricoService !== "undefined" && typeof CentroObstetricoService.avaliarTrabalhoParto === "function") {
      var exp = CentroObstetricoService.avaliarTrabalhoParto({ dilatacaoCm: 10, contracoes10min: 5, duracaoContracaoSeg: 55, planoDeLee: 3, bcf: 136 });
      var condsExp = (exp.condutaFase || exp.condutasFase || []).map(function(c){ return "• " + c; }).join("\n");
      textoRes = "PERÍODO EXPULSIVO DE PARTO (Fase Clínica: " + exp.faseDescricao + "):\nALTURA APRESENTAÇÃO: " + (exp.deLeeInfo || ("Plano " + exp.planoDeLee)) + "\n\nCONDUTAS IMEDIATAS:\n" + condsExp;
    } else {
      textoRes = "PERÍODO EXPULSIVO DE PARTO (Dilatação 10 cm, Plano +3 de De Lee):\n• Posicionamento materno livre e confortável.\n• Puxos espontâneos sincronizados com contrações.\n• Não realizar episiotomia de rotina.\n• Ocitocina 10 UI IM profilática imediatamente após desprendimento do ombro anterior.\n• Clampeamento oportuno do cordão umbilical (1 a 3 min) e contato pele a pele.";
    }
  }

  var cache = uxCache();
  var ck = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ck, textoRes, 21600);

  var msgCorpo = "🏥 *CONDUTA DE TRABALHO DE PARTO & CO:*\n\n```text\n" + textoRes + "\n```";
  var botoes = botoesBot([
    [['📋 Copiar Conduta', 'ux:copiar:' + ck]],
    [['🔙 Hub G&O', 'ux:rotina:go'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, msgCorpo, botoes, messageId);
}

// 3. Hemorragia Pós-Parto (4 Ts)
function enviarTelaGOHpp(chat, messageId) {
  var texto = "🩸 *HEMORRAGIA PÓS-PARTO (HPP) — PROTOCOLO 4 Ts (MS, FEBRASGO & WOMAN)*\n\n" +
    "• *Definição:* Perda > 500 mL (vaginal) ou > 1000 mL (cesárea) ou perda associada a choque.\n" +
    "• *Índice de Choque (FC / PAS):* ≥ 0.9 = alerta crítico; ≥ 1.0 = choque instalado / hemotransfusão.\n" +
    "• *Mapeamento dos 4 Ts:*\n" +
    "  1. *Tônus (70%):* Atonia uterina -> massagem bimanual + uterotônicos sequenciais.\n" +
    "  2. *Trauma (20%):* Lacerações de trajeto, colo, hematomas e rotura uterina.\n" +
    "  3. *Tecido (10%):* Restos placentários / acretismo.\n" +
    "  4. *Trombina (1%):* Coagulopatias maternas e consumo de fatores.\n" +
    "• *Sequenciamento Uterotônico:* Ocitocina -> Metilergometrina (se normotensa) -> Misoprostol 800 mcg retal -> Ácido Tranexâmico 1g IV em 10 min (janela ≤ 3h).\n\n" +
    "💡 *Toque em um caso rápido abaixo para conduta em 0ms ou envie `/hpp [dados]`*:";

  var guiaTexto = "PROTOCOLO DE ATENDIMENTO À HEMORRAGIA PÓS-PARTO (HPP)\n" +
    "1. Massagem uterina bimanual contínua (Manobra de Hamilton).\n" +
    "2. Uterotônicos imediatos:\n" +
    "   - Ocitocina 5 UI IV lento + 20 a 40 UI em 500 mL SF 0,9% a 250 mL/h.\n" +
    "   - Metilergometrina 0.2 mg IM (CONTRAINDICADA se HAS ou pré-eclâmpsia).\n" +
    "   - Misoprostol 800 mcg retal (4 comprimidos de 200 mcg).\n" +
    "3. Ácido Tranexâmico 1g IV em 100 mL SF 0,9% em 10 min (em até 3 horas do parto).\n" +
    "4. Se refratário: Balão de tamponamento intrauterino (Bakri) e suturas de B-Lynch.";

  var cache = uxCache();
  var ckGuia = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ckGuia, guiaTexto, 21600);

  var botoes = botoesBot([
    [['🩸 Atonia Grave (Choque IC 1.5)', 'ux:go:hpp:atonia'], ['🩹 Trauma de Canal / Laceração', 'ux:go:hpp:trauma']],
    [['🧩 Retenção Placentária', 'ux:go:hpp:tecido']],
    [['📋 Copiar Protocolo 4 Ts', 'ux:copiar:' + ckGuia]],
    [['🔙 Hub G&O', 'ux:rotina:go'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function tratarCallbackGOHpp(chat, v, messageId) {
  var textoRes = "";
  if (v === 'atonia') {
    if (typeof CentroObstetricoService !== "undefined" && typeof CentroObstetricoService.gerenciarHemorragiaPosParto === "function") {
      var h = CentroObstetricoService.gerenciarHemorragiaPosParto({ perdaEstimadaMl: 1200, fc: 120, pas: 80, etiologiaSuspeita: 'tonus_atonia', tempoDecorridoMin: 45, temHipertensao: false });
      var seq = (h.sequenciaUterotonica || []).map(function(u){ return "• Etapa " + u.etapa + ": " + u.farmaco + " (" + (u.bloqueado ? u.motivoBloqueio : u.dose) + ")"; }).join("\n");
      var resgates = (h.medidasResgate || h.procedimentosHemostaticos || []).map(function(p){ return "• " + p; }).join("\n");
      textoRes = "ETIOLOGIA: TÔNUS (ATONIA UTERINA)\nPERDA ESTIMADA: " + h.perdaEstimadaMl + " mL\nÍNDICE DE CHOQUE: " + h.indiceChoque + " (" + h.gravidadeChoque + ")\n" + (h.alertaChoque || "") + "\n\nSEQUENCIAMENTO UTEROTÔNICO ESCALONADO:\n" +
        seq + "\n\nCONDUTAS HEMOSTÁTICAS E CIRÚRGICAS:\n" + resgates;
    } else {
      textoRes = "HEMORRAGIA PÓS-PARTO - ATONIA UTERINA GRAVE:\n• Índice de Choque: 1.5 (Choque Instalado).\n• Massagem bimanual de Hamilton imediata.\n• Ocitocina 5 UI IV lento + 20 UI em 500 mL SF.\n• Metilergonovina 0.2 mg IM + Misoprostol 800 mcg retal.\n• Ácido Tranexâmico 1g IV em 10 min.\n• Acionar protocolo de hemotransfusão maciça e balão de Bakri.";
    }
  } else if (v === 'trauma') {
    if (typeof CentroObstetricoService !== "undefined" && typeof CentroObstetricoService.gerenciarHemorragiaPosParto === "function") {
      var tr = CentroObstetricoService.gerenciarHemorragiaPosParto({ perdaEstimadaMl: 650, fc: 96, pas: 110, etiologiaSuspeita: 'trauma_laceracao', tempoDecorridoMin: 20 });
      var resgTr = (tr.medidasResgate || tr.procedimentosHemostaticos || []).map(function(p){ return "• " + p; }).join("\n");
      textoRes = "ETIOLOGIA: TRAUMA DE CANAL DE PARTO (LACERAÇÃO)\nÍNDICE DE CHOQUE: " + tr.indiceChoque + " (" + tr.gravidadeChoque + ")\n\nCONDUTAS:\n" + resgTr;
    } else {
      textoRes = "HPP POR TRAUMA DE TRAJETO DE PARTO:\n• Revisão minuciosa sob valvas de parede vaginal, fórnices e colo uterino.\n• Sutura por planos de lacerações sob anestesia adequada.\n• Drenagem de hematomas expansivos se presentes.\n• Monitorização de estabilidade hemodinâmica.";
    }
  } else if (v === 'tecido') {
    if (typeof CentroObstetricoService !== "undefined" && typeof CentroObstetricoService.gerenciarHemorragiaPosParto === "function") {
      var te = CentroObstetricoService.gerenciarHemorragiaPosParto({ perdaEstimadaMl: 800, fc: 105, pas: 95, etiologiaSuspeita: 'tecido_restos', tempoDecorridoMin: 35 });
      var resgTe = (te.medidasResgate || te.procedimentosHemostaticos || []).map(function(p){ return "• " + p; }).join("\n");
      textoRes = "ETIOLOGIA: RETENÇÃO TECIDUAL (RESTOS PLACENTÁRIOS)\nÍNDICE DE CHOQUE: " + te.indiceChoque + " (" + te.gravidadeChoque + ")\n\nCONDUTAS:\n" + resgTe;
    } else {
      textoRes = "HPP POR RETENÇÃO PLACENTÁRIA:\n• Curagem ou curetagem uterina sob sedação/anestesia.\n• Manutenção de infusão contínua de ocitocina.\n• Profilaxia antimicrobiana.\n• Vigilância de sangramento e hemograma de controle.";
    }
  }

  var cache = uxCache();
  var ck = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ck, textoRes, 21600);

  var msgCorpo = "🩸 *CONDUTA DE HEMORRAGIA PÓS-PARTO (HPP):*\n\n```text\n" + textoRes + "\n```";
  var botoes = botoesBot([
    [['📋 Copiar Conduta', 'ux:copiar:' + ck]],
    [['🔙 Hub G&O', 'ux:rotina:go'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, msgCorpo, botoes, messageId);
}

// 4. Pré-Eclâmpsia & MgSO4
function enviarTelaGOMgso4(chat, messageId) {
  var texto = "⚡ *PRÉ-ECLÂMPSIA GRAVE & SULFATO DE MAGNÉSIO (ZUSPAN & PRITCHARD)*\n\n" +
    "• *Critérios de Gravidade:* PA ≥ 160/110 mmHg ou PA ≥ 140/90 com plaquetas < 100k, Cr > 1.1, transaminases elevadas 2x, edema pulmonar ou cefaleia/escotomas refratários.\n" +
    "• *Esquema de Zuspan (Preferencial IV):*\n" +
    "  - *Ataque:* 4g IV (8 mL MgSO4 50% + 12 mL AD) infundidos em 20 minutos.\n" +
    "  - *Manutenção:* 1 a 2 g/h em BIC contínua por 24 horas pós-parto.\n" +
    "• *Tríade de Vigilância:* Reflexo patelar presente, FR ≥ 16 irpm e Diurese ≥ 25 mL/h.\n" +
    "• *Antídoto Imediato:* Gluconato de Cálcio 10% 10 mL IV em 3 a 5 minutos.\n" +
    "• *Crise Hipertensiva (PA ≥ 160/110):* Hidralazina 5 mg IV lento q20min (max 20mg) ou Nifedipino 10-20 mg VO. Alvo: PAD 90-100 mmHg.\n\n" +
    "💡 *Toque em um caso rápido abaixo para conduta em 0ms ou envie `/mgso4 [dados]`*:";

  var guiaTexto = "MANEJO DE PRÉ-ECLÂMPSIA GRAVE E CRISE HIPERTENSIVA OBSTÉTRICA\n" +
    "1. Prevenção de Convulsões (Sulfato de Magnésio - Zuspan):\n" +
    "   - Ataque: 4g IV em 20 min (8 mL MgSO4 50% + 12 mL AD).\n" +
    "   - Manutenção: 1g/h em BIC contínua (MgSO4 50% 10 mL + SG 5% 490 mL a 100 mL/h).\n" +
    "2. Monitorização horária:\n" +
    "   - Reflexo patelar presente.\n" +
    "   - Frequência respiratória ≥ 16 irpm.\n" +
    "   - Diurese em sonda vesical ≥ 25 mL/h.\n" +
    "3. Antídoto: Gluconato de Cálcio 10% 10 mL IV lento se hiporreflexia ou FR < 16.\n" +
    "4. Anti-hipertensivo na crise: Hidralazina 5 mg IV a cada 20 min até PA < 160/110 mmHg.";

  var cache = uxCache();
  var ckGuia = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ckGuia, guiaTexto, 21600);

  var botoes = botoesBot([
    [['⚡ Esquema Zuspan (4g + 1g/h)', 'ux:go:mgso4:zuspan'], ['💉 Esquema Pritchard (IV+IM)', 'ux:go:mgso4:pritchard']],
    [['🚨 Crise HAS (PA 170x110)', 'ux:go:mgso4:crise'], ['⚠️ Intoxicação por MgSO4', 'ux:go:mgso4:intox']],
    [['📋 Copiar Protocolo MgSO4', 'ux:copiar:' + ckGuia]],
    [['🔙 Hub G&O', 'ux:rotina:go'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function tratarCallbackGOMgso4(chat, v, messageId) {
  var textoRes = "";
  if (v === 'zuspan') {
    if (typeof CentroObstetricoService !== "undefined" && typeof CentroObstetricoService.prescreverSulfatoMagnesio === "function") {
      var z = CentroObstetricoService.prescreverSulfatoMagnesio({ esquema: 'Zuspan', frequenciaRespiratoria: 18, diureseMlHora: 35, reflexoPatelar: true });
      var atq = (z.prescricao && z.prescricao.ataque) ? z.prescricao.ataque.join("\n") : (z.doseAtaque ? z.doseAtaque.dose : "MgSO4 50% 8 mL + AD 12 mL IV em 20 min");
      var man = (z.prescricao && z.prescricao.manutencao) ? z.prescricao.manutencao.join("\n") : (z.doseManutencao ? z.doseManutencao.dose : "1 a 2 g/h em BIC contínua");
      var vig = (z.rotinaVigilancia || z.vigilanciaClinica || []).map(function(vg){ return "• " + vg; }).join("\n");
      textoRes = "ESQUEMA: " + z.esquema + " (Sulfato de Magnésio — Padrão Ouro IV em BIC)\n" +
        "• " + atq + "\n" +
        "• " + man + "\n" +
        "\nCRITÉRIOS DE SEGURANÇA E VIGILÂNCIA:\n" + vig +
        "\n\nANTÍDOTO DE EMERGÊNCIA BEIRA-LEITO:\n• Gluconato de Cálcio 10% 10 mL IV em 3 a 5 minutos se sinais de toxicidade (arreflexia patelar ou FR < 16 irpm).";
    } else {
      textoRes = "PRESCRIÇÃO SULFATO DE MAGNÉSIO (ZUSPAN):\n• Ataque: MgSO4 50% 8 mL + AD 12 mL IV em 20 min.\n• Manutenção: MgSO4 50% 10 mL + SG 5% 490 mL a 100 mL/h (1 g/h) em BIC.\n• Vigilância: FR ≥ 16, Reflexo patelar +, Diurese ≥ 25 mL/h.\n• Antídoto: Gluconato de cálcio 10% 10 mL IV em 3-5 min.";
    }
  } else if (v === 'pritchard') {
    if (typeof CentroObstetricoService !== "undefined" && typeof CentroObstetricoService.prescreverSulfatoMagnesio === "function") {
      var p = CentroObstetricoService.prescreverSulfatoMagnesio({ esquema: 'Pritchard', frequenciaRespiratoria: 18, diureseMlHora: 35, reflexoPatelar: true });
      var atqP = (p.prescricao && p.prescricao.ataque) ? p.prescricao.ataque.join("\n• ") : "Ataque: 4g IV (8 mL MgSO4 50% + 12 mL AD) em 20 min + 10g IM (5g em cada glúteo com 1 mL lidocaína 2%)";
      var manP = (p.prescricao && p.prescricao.manutencao) ? p.prescricao.manutencao.join("\n• ") : "Manutenção: 5g IM 4/4h no glúteo contralateral alternado";
      var vigP = (p.rotinaVigilancia || p.vigilanciaClinica || []).map(function(vg){ return "• " + vg; }).join("\n");
      textoRes = "ESQUEMA: " + p.esquema + " (Sulfato de Magnésio — Alternativa sem Bomba / Transporte)\n" +
        "• " + atqP + "\n" +
        "• " + manP + "\n" +
        "\nCRITÉRIOS DE SEGURANÇA E VIGILÂNCIA:\n" + vigP +
        "\n\nANTÍDOTO DE EMERGÊNCIA BEIRA-LEITO:\n• Gluconato de Cálcio 10% 10 mL IV em 3 a 5 minutos se sinais de toxicidade (arreflexia patelar ou FR < 16 irpm).";
    } else {
      textoRes = "PRESCRIÇÃO SULFATO DE MAGNÉSIO (PRITCHARD):\n• Ataque: 4g IV (MgSO4 50% 8 mL + AD 12 mL) em 20 min + 10g IM (5g em cada glúteo com 1 mL lidocaína 2%).\n• Manutenção: 5g IM profundo 4/4h em glúteo contralateral alternado.\n• Vigilância: FR ≥ 16, Reflexo patelar +, Diurese ≥ 25 mL/h.\n• Antídoto: Gluconato de Cálcio 10% 10 mL IV em 3-5 min.";
    }
  } else if (v === 'crise') {
    if (typeof CentroObstetricoService !== "undefined" && typeof CentroObstetricoService.manejarCriseHipertensiva === "function") {
      var cr = CentroObstetricoService.manejarCriseHipertensiva({ pas: 175, pad: 115, frequenciaCardiaca: 88, medicacaoPrimeiraLinha: 'hidralazina' });
      var condsCr = (cr.condutas || []).join("\n");
      var medsCr = (cr.medicacoes || []).map(function(m){ return "• " + m.farmaco + ": " + (m.posologia || m.dose); }).join("\n");
      textoRes = "CRISE HIPERTENSIVA OBSTÉTRICA (PA " + cr.pas + "/" + cr.pad + " mmHg):\n" +
        condsCr + "\n\nMEDICAÇÕES ANTI-HIPERTENSIVAS:\n" + medsCr;
    } else {
      textoRes = "CRISE HIPERTENSIVA NA GESTAÇÃO:\n• PA: 175/115 mmHg.\n• 1ª Linha: Hidralazina 5 mg IV lento (repetir a cada 20 min até max 20 mg).\n• Alternativa: Nifedipino 10 a 20 mg VO (repetir em 20-30 min).\n• Alvo: PAS 140-150 e PAD 90-100 mmHg. Evitar quedas bruscas pelo risco de sofrimento fetal.";
    }
  } else if (v === 'intox') {
    if (typeof CentroObstetricoService !== "undefined" && typeof CentroObstetricoService.prescreverSulfatoMagnesio === "function") {
      var it = CentroObstetricoService.prescreverSulfatoMagnesio({ esquema: 'Zuspan', frequenciaRespiratoria: 11, diureseMlHora: 15, reflexoPatelar: false });
      var alertasIt = (it.alertasIntoxicacao || []).join("\n");
      var condIt = it.condutaIntoxicacao ? ("Suspender infusão de Sulfato de Magnésio imediatamente:\n• " + it.condutaIntoxicacao.acaoImediata + "\n• " + it.condutaIntoxicacao.antidoto + "\n• " + it.condutaIntoxicacao.suporte) : "Suspender infusão e infundir Gluconato de Cálcio 10% 10 mL IV";
      textoRes = "⚠️ ALERTA VERMELHO: INTOXICAÇÃO POR SULFATO DE MAGNÉSIO!\n" +
        alertasIt + "\n\nCONDUTA IMEDIATA:\n• " + condIt;
    } else {
      textoRes = "INTOXICAÇÃO POR MAGNÉSIO:\n• Suspender MgSO4 imediatamente.\n• Administrar Gluconato de Cálcio 10% 10 mL IV em 3 a 5 min.\n• Suporte ventilatório e O2.";
    }
  }

  var cache = uxCache();
  var ck = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ck, textoRes, 21600);

  var msgCorpo = "⚡ *CONDUTA DE PRÉ-ECLÂMPSIA & MgSO4:*\n\n```text\n" + textoRes + "\n```";
  var botoes = botoesBot([
    [['📋 Copiar Conduta', 'ux:copiar:' + ck]],
    [['🔙 Hub G&O', 'ux:rotina:go'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, msgCorpo, botoes, messageId);
}

// 5. Prematuridade & RPMO
function enviarTelaGOPrematuridade(chat, messageId) {
  var texto = "👶 *TRABALHO DE PARTO PREMATURO & RPMO (FEBRASGO & ACOG)*\n\n" +
    "• *Corticoterapia Pulmonar (24 a 34 semanas):* Betametasona 12 mg IM q24h (2 doses) ou Dexametasona 6 mg IM q12h (4 doses).\n" +
    "• *Neuroproteção (< 32 semanas se parto iminente):* Sulfato de Magnésio 4g IV ataque em 20 min + 1g/h até o parto (max 24h). Previne paralisia cerebral.\n" +
    "• *Tocólise Aguda por 48h (24 a 34 semanas):* Nifedipino 20 mg VO ataque + 10-20 mg a cada 4-6h ou Atosibana. Contraindicada se corioamnionite.\n" +
    "• *Latência na RPMO (< 34 semanas sem corioamnionite):* Ampicilina 2g IV 6/6h por 48h + Azitromicina 1g VO, seguida de Amoxicilina 500 mg 8/8h por 5 dias.\n\n" +
    "💡 *Toque em um caso rápido abaixo para conduta em 0ms ou envie `/prematuridade [dados]`*:";

  var guiaTexto = "PROTOCOLO DE PREMATURIDADE E RPMO (FEBRASGO / ACOG)\n" +
    "1. Corticoterapia (24 a 34 semanas): Betametasona 12 mg IM a cada 24 horas (total de 2 doses).\n" +
    "2. Neuroproteção (< 32 semanas com parto em < 24h): MgSO4 4g IV em 20-30 min + 1g/h contínuo.\n" +
    "3. Tocólise (para viabilizar as 48h de corticoide): Nifedipino VO. Contraindicada se sangramento com DPP, infecção ou sofrimento fetal.\n" +
    "4. RPMO de Latência: Ampicilina 2g IV 6/6h 48h + Azitromicina 1g VO, depois Amoxicilina 500mg 8/8h 5 dias.\n" +
    "5. Corioamnionite: Interrupção imediata da gestação independente da IG + Ampicilina e Gentamicina.";

  var cache = uxCache();
  var ckGuia = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ckGuia, guiaTexto, 21600);

  var botoes = botoesBot([
    [['👶 TPP 30s (Corticoide + Neuro)', 'ux:go:prematuridade:tpp'], ['💧 RPMO 31s (Regime Latência)', 'ux:go:prematuridade:rpmo']],
    [['🔥 Corioamnionite (Interrupção)', 'ux:go:prematuridade:corio']],
    [['📋 Copiar Guia Prematuridade', 'ux:copiar:' + ckGuia]],
    [['🔙 Hub G&O', 'ux:rotina:go'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function tratarCallbackGOPrematuridade(chat, v, messageId) {
  var textoRes = "";
  if (v === 'tpp') {
    if (typeof CentroObstetricoService !== "undefined" && typeof CentroObstetricoService.protocoloPrematuridadeRpmo === "function") {
      var tp = CentroObstetricoService.protocoloPrematuridadeRpmo({ igSemanas: 30, ameacaPartoIminente: true, rpmConfirmada: false, sinaisCorioamnionite: false });
      var cort = (tp.corticoterapia && tp.corticoterapia.esquemaPrimeiraLinha) ? (tp.corticoterapia.esquemaPrimeiraLinha.farmaco + " - " + tp.corticoterapia.esquemaPrimeiraLinha.dose) : "Betametasona 12 mg IM q24h (2 doses)";
      var tocol = (tp.tocolise && tp.tocolise.primeiraEscolha) ? (tp.tocolise.primeiraEscolha.farmaco + " (Ataque: " + tp.tocolise.primeiraEscolha.ataque + " | Manutenção: " + tp.tocolise.primeiraEscolha.manutencao + ")") : "Nifedipino 20 mg VO ataque + 10 mg manutenção";
      textoRes = "TRABALHO DE PARTO PREMATURO (IG: " + tp.igSemanas + " semanas):\n" +
        "• Corticoterapia: " + cort + "\n" +
        "• Neuroproteção Fetal (< 32s): " + ((tp.neuroprotecao && tp.neuroprotecao.indicada) ? "INDICADA (MgSO4 4g ataque + 1g/h)" : "Não indicada") + "\n" +
        "• Tocólise Aguda (48h): " + tocol;
    } else {
      textoRes = "TPP 30 SEMANAS:\n• Betametasona 12 mg IM q24h (2 doses).\n• MgSO4 4g IV + 1g/h até o parto (Neuroproteção < 32s).\n• Nifedipino 20 mg VO ataque + 10 mg 6/6h por 48h.";
    }
  } else if (v === 'rpmo') {
    if (typeof CentroObstetricoService !== "undefined" && typeof CentroObstetricoService.protocoloPrematuridadeRpmo === "function") {
      var rp = CentroObstetricoService.protocoloPrematuridadeRpmo({ igSemanas: 31, ameacaPartoIminente: false, rpmConfirmada: true, sinaisCorioamnionite: false });
      var fase1 = (rp.latenciaRpmo && rp.latenciaRpmo.fase1_primeiras48h) ? rp.latenciaRpmo.fase1_primeiras48h.join(" + ") : "Ampicilina 2g IV 6/6h + Azitromicina 1g VO";
      var fase2 = (rp.latenciaRpmo && rp.latenciaRpmo.fase2_proximos5dias) ? rp.latenciaRpmo.fase2_proximos5dias.join(" + ") : "Amoxicilina 500mg VO 8/8h 5 dias";
      textoRes = "ROTURA PREMATURA DE MEMBRANAS (RPMO " + rp.igSemanas + " semanas):\n" +
        "• Conduta: Latência Conservadora (Sem sinais de infecção intra-amniótica).\n" +
        "• Corticoterapia: Betametasona 12 mg IM q24h (2 doses).\n" +
        "• Esquema Antibiótico de Latência:\n  - Primeiras 48h: " + fase1 + "\n  - Próximos 5 dias: " + fase2;
    } else {
      textoRes = "RPMO 31 SEMANAS (LATÊNCIA):\n• Ampicilina 2g IV 6/6h 48h + Azitromicina 1g VO dose única.\n• Amoxicilina 500 mg VO 8/8h por 5 dias subsequentes.\n• Corticoterapia pulmonar e vigilância clínica e laboratorial diária.";
    }
  } else if (v === 'corio') {
    if (typeof CentroObstetricoService !== "undefined" && typeof CentroObstetricoService.protocoloPrematuridadeRpmo === "function") {
      var co = CentroObstetricoService.protocoloPrematuridadeRpmo({ igSemanas: 32, ameacaPartoIminente: true, rpmConfirmada: true, sinaisCorioamnionite: true });
      var atbCo = (co.antibioticoterapiaTerapeutica || []).join("\n• ");
      textoRes = (co.alertaCritico || "CORIOAMNIONITE AGUDA DETECTADA") + "\n\nCONDUTA:\n" +
        "• " + (co.resolucaoParto || "Interrupção imediata da gestação.") + "\n" +
        "• Antibioticoterapia: " + atbCo + "\n" +
        "• Tocólise CONTRAINDICADA de forma absoluta.";
    } else {
      textoRes = "CORIOAMNIONITE AGUDA:\n• Contraindicação absoluta à tocólise.\n• Parto imediato indicado.\n• Ampicilina 2g IV 6/6h + Gentamicina 5 mg/kg IV 1x/dia.";
    }
  }

  var cache = uxCache();
  var ck = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ck, textoRes, 21600);

  var msgCorpo = "👶 *CONDUTA DE PREMATURIDADE & RPMO:*\n\n```text\n" + textoRes + "\n```";
  var botoes = botoesBot([
    [['📋 Copiar Conduta', 'ux:copiar:' + ck]],
    [['🔙 Hub G&O', 'ux:rotina:go'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, msgCorpo, botoes, messageId);
}

// 6. Toxoplasmose & Sorologias
function enviarTelaGOToxo(chat, messageId) {
  var texto = "🔬 *TOXOPLASMOSE GESTACIONAL & AVIDEZ (MS & FEBRASGO)*\n\n" +
    "• *Interpretação Sorológica Inicial:*\n" +
    "  - *IgG- / IgM-:* Suscetível -> Prevenção primária e controle trimestral.\n" +
    "  - *IgG+ / IgM-:* Imunidade pregressa -> Alta de rastreio de toxoplasmose.\n" +
    "  - *IgG- / IgM+:* Infecção recente ou IgM falso-positivo -> Iniciar Espiramicina 1g 8/8h e repetir em 2-3 semanas.\n" +
    "  - *IgG+ / IgM+:*\n" +
    "    • < 16 semanas: Teste de Avidez de IgG urgente. Avidez alta (≥ 60%) afasta infecção gestacional. Avidez baixa (< 50%) confirma infecção aguda.\n" +
    "    • ≥ 16 semanas: Considerar infecção aguda provável (avidez perde confiabilidade).\n" +
    "• *Condutas Farmacológicas:*\n" +
    "  - *Profilaxia de transmissão vertical:* Espiramicina 1g VO 8/8h.\n" +
    "  - *Feto infectado (PCR positivo em líquido amniótico ou USG com lesão):* Esquema Tríplice (Sulfadiazina 3g/dia + Pirimetamina 50mg/dia + Ácido Folínico 15mg/dia). Amniocentese a partir de 18 semanas.\n\n" +
    "💡 *Toque em um caso rápido abaixo para conduta em 0ms ou envie `/toxo [dados]`*:";

  var guiaTexto = "CONDUTA NA TOXOPLASMOSE GESTACIONAL (MINISTÉRIO DA SAÚDE)\n" +
    "1. Iniciar Espiramicina 1g (3 MUI) VO de 8/8h imediatamente ao suspeitar de infecção aguda.\n" +
    "2. Teste de avidez no 1º trimestre (< 16 semanas):\n" +
    "   - Avidez Alta (≥ 60%): Infecção adquirida há mais de 4 meses (antes da gestação). Suspender Espiramicina.\n" +
    "   - Avidez Baixa (< 50%): Infecção aguda confirmada. Manter Espiramicina e programar amniocentese após 18 semanas.\n" +
    "3. Amniocentese com PCR positivo em LA:\n" +
    "   - Trocar Espiramicina por Esquema Tríplice: Sulfadiazina 1.5g 12/12h + Pirimetamina 25mg 12/12h + Ácido Folínico 15mg/dia.\n" +
    "   - Controle hematológico semanal (risco de mielotoxicidade).";

  var cache = uxCache();
  var ckGuia = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ckGuia, guiaTexto, 21600);

  var botoes = botoesBot([
    [['🔬 1º Tri Avidez Baixa (Aguda)', 'ux:go:toxo:aguda'], ['✅ 1º Tri Avidez Alta (Prévia)', 'ux:go:toxo:previa']],
    [['💊 PCR+ (Esquema Tríplice)', 'ux:go:toxo:fetal']],
    [['📋 Copiar Guia Toxoplasmose', 'ux:copiar:' + ckGuia]],
    [['🔙 Hub G&O', 'ux:rotina:go'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function tratarCallbackGOToxo(chat, v, messageId) {
  var textoRes = "";
  if (v === 'aguda') {
    if (typeof ObstetriciaToxoplasmoseService !== "undefined" && typeof ObstetriciaToxoplasmoseService.avaliar === "function") {
      var ta = ObstetriciaToxoplasmoseService.avaliar({ ig: 11, igg: 'reagente', igm: 'reagente', avidez_igg: 'baixa' });
      textoRes = ObstetriciaToxoplasmoseService.formatarTextoTelegram(ta);
    } else {
      textoRes = "TOXOPLASMOSE GESTACIONAL AGUDA CONFIRMADA (1º Trimestre - Avidez Baixa):\n• Conduta: Iniciar Espiramicina 1g VO 8/8h imediatamente.\n• Encaminhar para Pré-Natal de Alto Risco.\n• Programar Amniocentese para PCR em líquido amniótico a partir de 18 semanas.";
    }
  } else if (v === 'previa') {
    if (typeof ObstetriciaToxoplasmoseService !== "undefined" && typeof ObstetriciaToxoplasmoseService.avaliar === "function") {
      var tp = ObstetriciaToxoplasmoseService.avaliar({ ig: 10, igg: 'reagente', igm: 'reagente', avidez_igg: 'alta' });
      textoRes = ObstetriciaToxoplasmoseService.formatarTextoTelegram(tp);
    } else {
      textoRes = "TOXOPLASMOSE: INFECÇÃO PREGRESSA (1º Trimestre - Avidez Alta):\n• Avidez alta (≥ 60%) colhida com 10 semanas afasta infecção gestacional recente.\n• Conduta: Suspender Espiramicina se em uso e manter pré-natal habitual.";
    }
  } else if (v === 'fetal') {
    if (typeof ObstetriciaToxoplasmoseService !== "undefined" && typeof ObstetriciaToxoplasmoseService.avaliar === "function") {
      var tf = ObstetriciaToxoplasmoseService.avaliar({ ig: 22, igg: 'reagente', igm: 'reagente', pcr_amniotico: 'positivo' });
      textoRes = ObstetriciaToxoplasmoseService.formatarTextoTelegram(tf);
    } else {
      textoRes = "INFECÇÃO FETAL POR TOXOPLASMOSE CONFIRMADA (PCR Positivo em LA):\n• Substituir Espiramicina imediatamente por Esquema Tríplice:\n  - Sulfadiazina 3g/dia (1.5g VO 12/12h)\n  - Pirimetamina 50mg/dia (25mg VO 12/12h)\n  - Ácido Folínico 15mg VO 1x/dia pela manhã\n• Hemograma semanal de controle.";
    }
  }

  var cache = uxCache();
  var ck = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ck, textoRes, 21600);

  var msgCorpo = "🔬 *CONDUTA DE TOXOPLASMOSE GESTACIONAL:*\n\n```text\n" + textoRes + "\n```";
  var botoes = botoesBot([
    [['📋 Copiar Conduta', 'ux:copiar:' + ck]],
    [['🔙 Hub G&O', 'ux:rotina:go'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, msgCorpo, botoes, messageId);
}

// 7. Vulvovaginites & Corrimento
function enviarTelaGOCorrimento(chat, messageId) {
  var texto = "🌸 *VULVOVAGINITES & CORRIMENTOS (REMUME / MS / PCDT ISTs)*\n\n" +
    "• *Diagnóstico Diferencial Clínico:*\n" +
    "  1. *Candidíase Vulvovaginal:* Prurido vulvar intenso, disúria externa, corrimento branco grumoso (leite coalhado), pH vaginal < 4.5, hifas e esporos à microscopia a fresco.\n" +
    "  2. *Vaginose Bacteriana (Critérios de Amsel ≥ 3/4):* Corrimento branco-acinzentado fluido homogêneo, odor de peixe podre (Whiff/teste das aminas com KOH 10% positivo), pH > 4.5 e clue cells > 20%.\n" +
    "  3. *Tricomoníase (IST):* Corrimento amarelo-esverdeado bolhoso e abundante, colpite em framboesa, teste de Schiller tigróide, pH > 4.5 e protozoários móveis flagelados.\n" +
    "• *Tratamentos Padronizados:*\n" +
    "  - *Candidíase:* Fluconazol 150 mg VO dose única (não gestante) ou Miconazol creme vaginal 2% à noite por 7 dias (gestante).\n" +
    "  - *Vaginose:* Metronidazol 500 mg VO 12/12h por 7 dias ou gel vaginal por 5 dias. Alerta Dissulfiram (não ingerir álcool).\n" +
    "  - *Tricomoníase:* Metronidazol 2g VO dose única (ou 500 mg 12/12h por 7 dias) + Tratamento obrigatório do parceiro sexual.\n\n" +
    "💡 *Toque em um caso rápido abaixo para conduta em 0ms ou envie `/corrimento [dados]`*:";

  var guiaTexto = "TRATAMENTO DAS VULVOVAGINITES (REMUME / MINISTÉRIO DA SAÚDE)\n" +
    "1. CANDIDÍASE VULVOVAGINAL:\n" +
    "   - Não gestante: Fluconazol 150 mg VO dose única.\n" +
    "   - Gestante: Miconazol creme vaginal 2% 1 aplicador à noite por 7 dias (Fluconazol oral é contraindicado na gestação).\n" +
    "   - Recorrente (≥ 4 episódios/ano): Fluconazol 150 mg VO D1, D4 e D7 (indução) + 150 mg 1x/semana por 6 meses (manutenção).\n" +
    "2. VAGINOSE BACTERIANA:\n" +
    "   - Metronidazol 500 mg VO de 12/12h por 7 dias (ou Metronidazol gel 0.75% 1 aplicador à noite por 5 dias).\n" +
    "   - Parceiro: Não se trata parceiro de rotina.\n" +
    "3. TRICOMONÍASE:\n" +
    "   - Metronidazol 2g (4 comp de 500 mg) VO em dose única ou 500 mg VO 12/12h por 7 dias.\n" +
    "   - Tratar parceiro sexual obrigatoriamente.";

  var cache = uxCache();
  var ckGuia = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ckGuia, guiaTexto, 21600);

  var botoes = botoesBot([
    [['🌸 Candidíase Vaginal', 'ux:go:corrimento:candida'], ['🐟 Vaginose (Amsel)', 'ux:go:corrimento:vaginose']],
    [['🍓 Tricomoníase Vaginal', 'ux:go:corrimento:tricomoniase']],
    [['📋 Copiar Guia Vulvovaginites', 'ux:copiar:' + ckGuia]],
    [['🔙 Hub G&O', 'ux:rotina:go'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function tratarCallbackGOCorrimento(chat, v, messageId) {
  var textoRes = "";
  if (v === 'candida') {
    if (typeof GinecologiaAmbulatorialService !== "undefined" && typeof GinecologiaAmbulatorialService.avaliarInfeccaoVulvovaginal === "function") {
      var c = GinecologiaAmbulatorialService.avaliarInfeccaoVulvovaginal({ sintomaPredominante: 'prurido', aspectoCorrimento: 'grumoso_branco', phVaginal: 4.2, whiffTest: 'negativo', microscopia: 'hifas_esporos', gestante: false });
      var prescC = (c.prescricoes || c.tratamento || []).map(function(t){ return "• " + t.farmaco + " - " + t.posologia; }).join("\n");
      var condC = (c.condutas || c.orientacoes || []).join("\n• ");
      textoRes = "DIAGNÓSTICO: " + (c.diagnosticoDescricao || c.diagnostico) + "\n\nTRATAMENTO RECOMENDADO:\n" +
        prescC + "\n\nORIENTAÇÕES CLÍNICAS:\n• " + condC;
    } else {
      textoRes = "CANDIDÍASE VULVOVAGINAL:\n• Prescrição: Fluconazol 150 mg comprimido - Tomar 1 comprimido VO em dose única.\n• Alternativa tópica: Miconazol creme vaginal 2% - Aplicar 1 aplicador à noite por 7 dias.";
    }
  } else if (v === 'vaginose') {
    if (typeof GinecologiaAmbulatorialService !== "undefined" && typeof GinecologiaAmbulatorialService.avaliarInfeccaoVulvovaginal === "function") {
      var vg = GinecologiaAmbulatorialService.avaliarInfeccaoVulvovaginal({ sintomaPredominante: 'odor_fetido', aspectoCorrimento: 'branco_acinzentado_fino', phVaginal: 5.0, whiffTest: 'positivo', microscopia: 'clue_cells' });
      var prescVg = (vg.prescricoes || vg.tratamento || []).map(function(t){ return "• " + t.farmaco + " - " + t.posologia; }).join("\n");
      var condVg = (vg.condutas || vg.orientacoes || []).join("\n• ");
      textoRes = "DIAGNÓSTICO: " + (vg.diagnosticoDescricao || vg.diagnostico) + "\n\nTRATAMENTO RECOMENDADO:\n" +
        prescVg + "\n\nORIENTAÇÕES CLÍNICAS:\n• " + condVg;
    } else {
      textoRes = "VAGINOSE BACTERIANA (Amsel Positivo):\n• Prescrição: Metronidazol 500 mg comprimido - Tomar 1 comprimido VO de 12/12h por 7 dias.\n• Alerta: Abstinência alcoólica estrita durante o tratamento e por 24h após (efeito dissulfiram).\n• Parceiro sexual: Não se recomenda tratamento de rotina.";
    }
  } else if (v === 'tricomoniase') {
    if (typeof GinecologiaAmbulatorialService !== "undefined" && typeof GinecologiaAmbulatorialService.avaliarInfeccaoVulvovaginal === "function") {
      var tr = GinecologiaAmbulatorialService.avaliarInfeccaoVulvovaginal({ sintomaPredominante: 'odor_fetido', aspectoCorrimento: 'amarelo_esverdeado_bolhoso', phVaginal: 5.5, whiffTest: 'positivo', microscopia: 'protozoarios_moveis' });
      var prescTr = (tr.prescricoes || tr.tratamento || []).map(function(t){ return "• " + t.farmaco + " - " + t.posologia; }).join("\n");
      var condTr = (tr.condutas || tr.orientacoes || []).join("\n• ");
      textoRes = "DIAGNÓSTICO: " + (tr.diagnosticoDescricao || tr.diagnostico) + "\n\nTRATAMENTO RECOMENDADO:\n" +
        prescTr + "\n\nORIENTAÇÕES CLÍNICAS:\n• " + condTr;
    } else {
      textoRes = "TRICOMONÍASE VAGINAL (IST):\n• Prescrição Paciente: Metronidazol 2g (4 comp de 500 mg) VO em dose única OU 500 mg VO 12/12h por 7 dias.\n• Prescrição Parceiro: Metronidazol 2g VO em dose única.\n• Abstinência sexual até o término do tratamento e desaparecimento dos sintomas.";
    }
  }

  var cache = uxCache();
  var ck = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ck, textoRes, 21600);

  var msgCorpo = "🌸 *CONDUTA DE VULVOVAGINITES:*\n\n```text\n" + textoRes + "\n```";
  var botoes = botoesBot([
    [['📋 Copiar Conduta', 'ux:copiar:' + ck]],
    [['🔙 Hub G&O', 'ux:rotina:go'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, msgCorpo, botoes, messageId);
}

// 8. Preventivo / Citopatológico INCA
function enviarTelaGOPreventivo(chat, messageId) {
  var texto = "🩺 *CONDUTA CITOPATOLÓGICA DE COLO DE ÚTERO (DIRETRIZES INCA / MS)*\n\n" +
    "• *População-Alvo:* Mulheres de 25 a 64 anos com atividade sexual prévia.\n" +
    "• *Periodicidade:* Anual; após 2 exames normais consecutivos, a cada 3 anos.\n" +
    "• *Condutas Estratificadas por Laudo e Idade:*\n" +
    "  - *ASC-US:*\n" +
    "    • < 25 anos: Repetir citologia em 3 anos.\n" +
    "    • 25 a 29 anos: Repetir citologia em 12 meses.\n" +
    "    • ≥ 30 anos: Repetir citologia em 6 meses.\n" +
    "    • Se 2 exames alterados consecutivos -> Colposcopia imediata.\n" +
    "  - *LSIL (Lesão de Baixo Grau):*\n" +
    "    • < 25 anos: Repetir em 3 anos.\n" +
    "    • ≥ 25 anos: Repetir citologia em 6 meses. Se persistência -> Colposcopia.\n" +
    "  - *ASC-H / HSIL / AGC / Carcinoma:* Colposcopia IMEDIATA independente da faixa etária.\n\n" +
    "💡 *Toque em um caso rápido abaixo para conduta em 0ms ou envie `/preventivo [dados]`*:";

  var guiaTexto = "DIRETRIZES BRASILEIRAS PARA O RASTREAMENTO DO CÂNCER DO COLO DO ÚTERO (INCA)\n" +
    "1. ASC-US (Atipias de significado indeterminado possivelmente não neoplásicas):\n" +
    "   - < 25 anos: Repetir em 3 anos.\n" +
    "   - 25 a 29 anos: Repetir em 12 meses.\n" +
    "   - ≥ 30 anos: Repetir em 6 meses.\n" +
    "2. LSIL (Lesão intraepitelial de baixo grau):\n" +
    "   - < 25 anos: Repetir em 3 anos.\n" +
    "   - ≥ 25 anos: Repetir em 6 meses.\n" +
    "3. ALTO GRAU (ASC-H, HSIL, AGC):\n" +
    "   - Encaminhar imediatamente para Colposcopia especializada.\n" +
    "   - AGC: Avaliação de canal endocervical e biópsia endometrial se ≥ 35 anos.";

  var cache = uxCache();
  var ckGuia = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ckGuia, guiaTexto, 21600);

  var botoes = botoesBot([
    [['🩺 ASC-US (25-29 vs ≥30 anos)', 'ux:go:preventivo:ascus'], ['🔬 LSIL (Baixo Grau ≥25a)', 'ux:go:preventivo:lsil']],
    [['🚨 HSIL / ASC-H (Colposcopia)', 'ux:go:preventivo:hsil']],
    [['📋 Copiar Guia Preventivo', 'ux:copiar:' + ckGuia]],
    [['🔙 Hub G&O', 'ux:rotina:go'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function tratarCallbackGOPreventivo(chat, v, messageId) {
  var textoRes = "";
  if (v === 'ascus') {
    if (typeof GinecologiaAmbulatorialService !== "undefined" && typeof GinecologiaAmbulatorialService.avaliarRastreioColoUterino === "function") {
      var r28 = GinecologiaAmbulatorialService.avaliarRastreioColoUterino({ idade: 28, resultadoCitologia: 'asc_us' });
      var r35 = GinecologiaAmbulatorialService.avaliarRastreioColoUterino({ idade: 35, resultadoCitologia: 'asc_us' });
      textoRes = "CONDUTA CITOPATOLÓGICA - ASC-US:\n" +
        "• Mulher 28 anos (25 a 29 anos): " + (r28.resumoConduta || r28.prazoRecomendado || r28.conduta) + "\n\n" +
        "• Mulher 35 anos (≥ 30 anos): " + (r35.resumoConduta || r35.prazoRecomendado || r35.conduta);
    } else {
      textoRes = "ASC-US (INCA/MS):\n• 25 a 29 anos: Repetir citopatológico em 12 meses na UBS.\n• ≥ 30 anos: Repetir citopatológico em 6 meses na UBS.\n• Se 2 exames consecutivos alterados -> Colposcopia.";
    }
  } else if (v === 'lsil') {
    if (typeof GinecologiaAmbulatorialService !== "undefined" && typeof GinecologiaAmbulatorialService.avaliarRastreioColoUterino === "function") {
      var l = GinecologiaAmbulatorialService.avaliarRastreioColoUterino({ idade: 32, resultadoCitologia: 'lsil' });
      textoRes = "CONDUTA CITOPATOLÓGICA - LSIL (32 anos):\n" +
        "• Conduta: " + (l.resumoConduta || l.prazoRecomendado || l.conduta) + "\n" +
        (l.condutas ? "• Detalhes: " + l.condutas.join("\n• ") : "");
    } else {
      textoRes = "LSIL (Lesão de Baixo Grau) em mulher ≥ 25 anos:\n• Repetir citopatológico em 6 meses na Atenção Primária.\n• Se persistência de LSIL ou atipia de maior grau -> Colposcopia.";
    }
  } else if (v === 'hsil') {
    if (typeof GinecologiaAmbulatorialService !== "undefined" && typeof GinecologiaAmbulatorialService.avaliarRastreioColoUterino === "function") {
      var h = GinecologiaAmbulatorialService.avaliarRastreioColoUterino({ idade: 40, resultadoCitologia: 'hsil' });
      textoRes = "CONDUTA CITOPATOLÓGICA - HSIL / ALTO GRAU (40 anos):\n" +
        "• Conduta: " + (h.resumoConduta || h.prazoRecomendado || h.conduta) + "\n" +
        (h.condutas ? "• Detalhes: " + h.condutas.join("\n• ") : "");
    } else {
      textoRes = "HSIL (Lesão Intraepitelial de Alto Grau) / ASC-H:\n• Encaminhamento IMEDIATO para Colposcopia especializada.\n• Avaliação de método Ver e Tratar (EZT/CAF) se lesão de alto grau típica totalmente visível na ectocérvice.";
    }
  }

  var cache = uxCache();
  var ck = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ck, textoRes, 21600);

  var msgCorpo = "🩺 *CONDUTA CITOPATOLÓGICA DE COLO (INCA):*\n\n```text\n" + textoRes + "\n```";
  var botoes = botoesBot([
    [['📋 Copiar Conduta', 'ux:copiar:' + ck]],
    [['🔙 Hub G&O', 'ux:rotina:go'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, msgCorpo, botoes, messageId);
}

// 9. Anticoncepção OMS
function enviarTelaGOAnticoncepcao(chat, messageId) {
  var texto = "💊 *CRITÉRIOS DE ELEGIBILIDADE DA CONTRACEPÇÃO (OMS MEC 1 a 4)*\n\n" +
    "• *Classificação OMS:*\n" +
    "  - *Cat 1:* Sem restrição ao uso (método seguro de 1ª linha).\n" +
    "  - *Cat 2:* Vantagens superam riscos comprovados.\n" +
    "  - *Cat 3:* Riscos superam vantagens (evitar; usar somente se sem alternativas).\n" +
    "  - *Cat 4:* Contraindicação absoluta (risco de saúde inaceitável).\n" +
    "• *Contraindicações Absolutas a Estrogênios (Cat 4):*\n" +
    "  - Enxaqueca com aura em qualquer idade (risco aumentado de AVC isquêmico).\n" +
    "  - HAS grave descontrolada (PAS ≥ 160 ou PAD ≥ 100 mmHg).\n" +
    "  - Tabagista ≥ 35 anos com consumo ≥ 15 cigarros/dia.\n" +
    "  - Histórico de TEV / TVP / TEP ou trombofilia hereditária/adquirida (SAF).\n" +
    "  - Câncer de mama atual.\n" +
    "  - Pós-parto < 6 semanas com amamentação exclusiva.\n" +
    "• *Métodos Seguros de Escolha (Cat 1):* DIU de Cobre, DIU de Levonorgestrel e Progestagênio isolado (Desogestrel 75 mcg ou Implante).\n\n" +
    "💡 *Toque em um caso rápido abaixo para conduta em 0ms ou envie `/anticoncepcao [dados]`*:";

  var guiaTexto = "CRITÉRIOS MÉDICOS DE ELEGIBILIDADE PARA ANTICONCEPÇÃO (OMS / FEBRASGO)\n" +
    "1. ENXAQUECA COM AURA:\n" +
    "   - Anticoncepcionais combinados (pílula, adesivo, anel, injetável mensal): CATEGORIA 4 (PROIBIDOS).\n" +
    "   - Opções seguras: DIU de Cobre (Cat 1), DIU LNG (Cat 2), Desogestrel 75 mcg (Cat 2), Implante (Cat 2).\n" +
    "2. TABAGISTA ≥ 35 ANOS (≥ 15 cigarros/dia):\n" +
    "   - Anticoncepcionais combinados: CATEGORIA 4 (PROIBIDOS).\n" +
    "   - Opções seguras: DIU Cobre (Cat 1), DIU LNG (Cat 1), Progestagênios isolados (Cat 1).\n" +
    "3. PUÉRPERA EM ALEITAMENTO (< 6 semanas):\n" +
    "   - Estrogênios: CATEGORIA 4.\n" +
    "   - DIU de Cobre pode ser inserido até 48h pós-parto ou após 4 semanas (Cat 1).";

  var cache = uxCache();
  var ckGuia = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ckGuia, guiaTexto, 21600);

  var botoes = botoesBot([
    [['🧠 Enxaqueca com Aura (Cat 4)', 'ux:go:anticoncepcao:enxaqueca'], ['🚬 Tabagista ≥35a (≥15 cig)', 'ux:go:anticoncepcao:tabagista']],
    [['🤱 Puérpera em Aleitamento', 'ux:go:anticoncepcao:puerpera']],
    [['📋 Copiar Guia Anticoncepção', 'ux:copiar:' + ckGuia]],
    [['🔙 Hub G&O', 'ux:rotina:go'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function tratarCallbackGOAnticoncepcao(chat, v, messageId) {
  function obterMotivoBloqueio(c, fallback) {
    if (c.justificativas && c.justificativas.length > 0) {
      var j0 = c.justificativas[0];
      if (typeof j0 === "object" && j0 !== null) {
        return j0.motivo || j0.criterio || fallback;
      }
      return String(j0);
    }
    return c.motivo || fallback;
  }

  var textoRes = "";
  if (v === 'enxaqueca') {
    if (typeof GinecologiaAmbulatorialService !== "undefined" && typeof GinecologiaAmbulatorialService.avaliarCriteriosElegibilidadeContracepcao === "function") {
      var enx = GinecologiaAmbulatorialService.avaliarCriteriosElegibilidadeContracepcao({ idade: 31, enxaqueca: 'com_aura' });
      var bloqEnx = (enx.metodosBloqueadosCat4 || enx.contraindicados || []).map(function(c){ return "• " + (c.nome || c.metodo) + " (Cat " + (c.categoria || 4) + ") - " + obterMotivoBloqueio(c, "Contraindicação absoluta"); }).join("\n");
      var libEnx = (enx.metodosElegiveisCat1 || enx.recomendados || []).concat(enx.metodosAceitaveisCat2 || []).map(function(r){ return "• " + (r.nome || r.metodo) + " (Cat " + (r.categoria || 1) + ")"; }).join("\n");
      textoRes = "ELEGIBILIDADE CONTRACEPTIVA: ENXAQUECA COM AURA (31 anos)\n\n" +
        "⛔ CONTRAINDICADOS (Cat 4):\n" + bloqEnx +
        "\n\n✅ MÉTODOS SEGUROS E LIBERADOS:\n" + libEnx;
    } else {
      textoRes = "ENXAQUECA COM AURA:\n⛔ Estrogênios Combinados (Pílula/Anel/Adesivo/Injetável): CATEGORIA 4 (Contraindicação Absoluta pelo risco de AVC).\n✅ Permitidos: DIU de Cobre (Cat 1), DIU LNG (Cat 2), Desogestrel (Cat 2), Implante (Cat 2).";
    }
  } else if (v === 'tabagista') {
    if (typeof GinecologiaAmbulatorialService !== "undefined" && typeof GinecologiaAmbulatorialService.avaliarCriteriosElegibilidadeContracepcao === "function") {
      var tab = GinecologiaAmbulatorialService.avaliarCriteriosElegibilidadeContracepcao({ idade: 38, tabagismo: true, cigarrosDia: 20 });
      var bloqTab = (tab.metodosBloqueadosCat4 || tab.contraindicados || []).map(function(c){ return "• " + (c.nome || c.metodo) + " (Cat " + (c.categoria || 4) + ") - " + obterMotivoBloqueio(c, "Risco cardiovascular elevado"); }).join("\n");
      var libTab = (tab.metodosElegiveisCat1 || tab.recomendados || []).concat(tab.metodosAceitaveisCat2 || []).map(function(r){ return "• " + (r.nome || r.metodo) + " (Cat " + (r.categoria || 1) + ")"; }).join("\n");
      textoRes = "ELEGIBILIDADE: TABAGISTA ≥ 35 ANOS (38 anos, 20 cigarros/dia)\n\n" +
        "⛔ CONTRAINDICADOS (Cat 4):\n" + bloqTab +
        "\n\n✅ MÉTODOS SEGUROS E LIBERADOS:\n" + libTab;
    } else {
      textoRes = "TABAGISTA ≥ 35 ANOS (≥ 15 cigarros/dia):\n⛔ Métodos Combinados com Estrogênio: CATEGORIA 4 (Risco de IAM e TEV).\n✅ Métodos Seguros: DIU de Cobre (Cat 1), DIU LNG (Cat 1), Minipílula/Desogestrel (Cat 1).";
    }
  } else if (v === 'puerpera') {
    if (typeof GinecologiaAmbulatorialService !== "undefined" && typeof GinecologiaAmbulatorialService.avaliarCriteriosElegibilidadeContracepcao === "function") {
      var pue = GinecologiaAmbulatorialService.avaliarCriteriosElegibilidadeContracepcao({ idade: 26, lactacao: true });
      var bloqPue = (pue.metodosBloqueadosCat4 || pue.contraindicados || []).map(function(c){ return "• " + (c.nome || c.metodo) + " (Cat " + (c.categoria || 4) + ") - " + obterMotivoBloqueio(c, "Risco de TEV e inibição de lactação"); }).join("\n");
      var libPue = (pue.metodosElegiveisCat1 || pue.recomendados || []).concat(pue.metodosAceitaveisCat2 || []).map(function(r){ return "• " + (r.nome || r.metodo) + " (Cat " + (r.categoria || 1) + ")"; }).join("\n");
      textoRes = "ELEGIBILIDADE: PUÉRPERA EM ALEITAMENTO EXCLUSIVO\n\n" +
        "⛔ CONTRAINDICADOS (Cat 4):\n" + bloqPue +
        "\n\n✅ MÉTODOS SEGUROS:\n" + libPue;
    } else {
      textoRes = "PUÉRPERA EM LACTAÇÃO (< 6 semanas):\n⛔ Estrogênios: CATEGORIA 4 (Inibe lactogênese e aumenta risco de TEV).\n✅ Métodos Seguros: DIU de Cobre (Cat 1), Progestagênios isolados a partir de 6 semanas.";
    }
  }

  var cache = uxCache();
  var ck = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ck, textoRes, 21600);

  var msgCorpo = "💊 *CONDUTA DE ANTICONCEPÇÃO OMS:*\n\n```text\n" + textoRes + "\n```";
  var botoes = botoesBot([
    [['📋 Copiar Conduta', 'ux:copiar:' + ck]],
    [['🔙 Hub G&O', 'ux:rotina:go'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, msgCorpo, botoes, messageId);
}

// 10. DIP & Infecção Pélvica
function enviarTelaGODip(chat, messageId) {
  var texto = "🩹 *DOENÇA INFLAMATÓRIA PÉLVICA (DIP) & ATO (MS, CDC & FEBRASGO)*\n\n" +
    "• *Critérios Diagnósticos (Critérios de Hager / MS):*\n" +
    "  - *3 Critérios Maiores (Obrigatórios):* Dor no hipogástrio + Dor à palpação anexial bilateral + Dor à mobilização do colo uterino.\n" +
    "  - *≥ 1 Critério Menor:* Febre (Tax > 38.3°C), leucocitose, secreção endocervical anormal purulenta, VHS/PCR aumentados ou teste positivo para N. gonorrhoeae / C. trachomatis.\n" +
    "• *Estadiamento de Monif:*\n" +
    "  - *Monif I (Leve):* Salpingite/Endometrite sem peritonite -> Tratamento Ambulatorial.\n" +
    "  - *Monif II (Moderada):* Salpingite com peritonite pélvica -> Internação hospitalar.\n" +
    "  - *Monif III (Grave):* Abscesso Tubo-Ovariano (ATO) íntegro -> Internação hospitalar + ATB venoso.\n" +
    "  - *Monif IV (Gravíssimo):* ATO roto ou sepse -> Laparotomia / cirurgia de urgência.\n" +
    "• *Tratamentos Antimicrobianos (PCDT MS):*\n" +
    "  - *Ambulatorial (Monif I):* Ceftriaxona 500 mg IM dose única + Doxiciclina 100 mg VO 12/12h por 14d + Metronidazol 500 mg VO 12/12h por 14d. Reavaliação clínica obrigatória em 48-72h.\n" +
    "  - *Hospitalar (Monif II-IV):* Ceftriaxona 1g IV 1x/dia + Doxiciclina 100 mg VO/IV 12/12h OU Clindamicina 900 mg IV 8/8h + Gentamicina 2 mg/kg ataque e 1.5 mg/kg 8/8h.\n\n" +
    "💡 *Toque em um caso rápido abaixo para conduta em 0ms ou envie `/dip [dados]`*:";

  var guiaTexto = "PROTOCOLO DE MANEJO DE DIP E ATO (MINISTÉRIO DA SAÚDE)\n" +
    "1. TRATAMENTO AMBULATORIAL (Monif I):\n" +
    "   - Ceftriaxona 500 mg IM dose única\n" +
    "   - Doxiciclina 100 mg VO de 12/12h por 14 dias\n" +
    "   - Metronidazol 500 mg VO de 12/12h por 14 dias\n" +
    "   - Retorno obrigatório em 48 a 72 horas para checar melhora clínica.\n" +
    "2. CONDUTA SOBRE DIU:\n" +
    "   - Não retirar o DIU no 1º atendimento de rotina. Iniciar ATB e reavaliar em 48-72h. Retirar somente se falha terapêutica.\n" +
    "3. PARCEIROS:\n" +
    "   - Tratar parceiros dos últimos 60 dias para Gonococo e Clamídia: Ceftriaxona 500 mg IM + Azitromicina 1g VO dose única.";

  var cache = uxCache();
  var ckGuia = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ckGuia, guiaTexto, 21600);

  var botoes = botoesBot([
    [['🩹 DIP Ambulatorial (Monif I)', 'ux:go:dip:monif1'], ['🏥 DIP Hospitalar / ATO', 'ux:go:dip:hospitalar']],
    [['🚻 Parceiros Sexuais (Rastreio)', 'ux:go:dip:parceiro']],
    [['📋 Copiar Guia DIP', 'ux:copiar:' + ckGuia]],
    [['🔙 Hub G&O', 'ux:rotina:go'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function tratarCallbackGODip(chat, v, messageId) {
  var textoRes = "";
  if (v === 'monif1') {
    if (typeof DipAbscessoTuboOvarianoService !== "undefined" && typeof DipAbscessoTuboOvarianoService.avaliarDipCompleto === "function") {
      var d1 = DipAbscessoTuboOvarianoService.avaliarDipCompleto({ dorHipogastrio: true, dorPalpacaoAnexial: true, dorMobilizacaoColo: true, febre: true, temperaturaC: 38.4, leucocitose: false, peritonitePelvica: false, abscessoTuboOvariano: false, sepse: false, diuPresente: false });
      textoRes = (typeof DipAbscessoTuboOvarianoService.gerarResumoDip === "function") ? DipAbscessoTuboOvarianoService.gerarResumoDip(d1) : "DIP AMBULATORIAL (Monif I):\nCeftriaxona 500mg IM + Doxiciclina 100mg 12/12h 14d + Metronidazol 500mg 12/12h 14d.";
    } else {
      textoRes = "DIP AMBULATORIAL (MONIF I - LEVE):\n• Ceftriaxona 500 mg IM dose única\n• Doxiciclina 100 mg VO 12/12h por 14 dias\n• Metronidazol 500 mg VO 12/12h por 14 dias\n• Reavaliação clínica obrigatória em 48 a 72 horas.";
    }
  } else if (v === 'hospitalar') {
    if (typeof DipAbscessoTuboOvarianoService !== "undefined" && typeof DipAbscessoTuboOvarianoService.avaliarDipCompleto === "function") {
      var dh = DipAbscessoTuboOvarianoService.avaliarDipCompleto({ dorHipogastrio: true, dorPalpacaoAnexial: true, dorMobilizacaoColo: true, febre: true, temperaturaC: 38.9, leucocitose: true, peritonitePelvica: true, abscessoTuboOvariano: true, diametroAtoCm: 6, diuPresente: true });
      textoRes = (typeof DipAbscessoTuboOvarianoService.gerarResumoDip === "function") ? DipAbscessoTuboOvarianoService.gerarResumoDip(dh) : "DIP HOSPITALAR / ATO (Monif III):\nInternação hospitalar imediata + Ceftriaxona 1g IV + Doxiciclina 100mg VO/IV ou Clindamicina + Gentamicina.";
    } else {
      textoRes = "DIP HOSPITALAR COM ABSCESSO TUBO-OVARIANO (MONIF III):\n• Internação imediata em enfermaria de Ginecologia.\n• Esquema 1: Ceftriaxona 1g IV 1x/dia + Doxiciclina 100 mg VO/IV 12/12h + Metronidazol 500 mg IV 12/12h.\n• Esquema 2: Clindamicina 900 mg IV 8/8h + Gentamicina 2 mg/kg ataque e 1.5 mg/kg 8/8h IV.\n• Vigilância ultrassonográfica seriada do abscesso.";
    }
  } else if (v === 'parceiro') {
    textoRes = "MANEJO DE PARCEIROS SEXUAIS EM DIP (PCDT ISTs / MS):\n" +
      "• Todos os parceiros sexuais dos últimos 60 dias devem ser examinados e tratados empiricamente.\n" +
      "• Tratamento Empírico para Gonococo e Clamídia:\n" +
      "  - Ceftriaxona 500 mg IM em dose única\n" +
      "  - Azitromicina 1g (2 comprimidos de 500 mg) VO em dose única\n" +
      "• Rastreio completo de ISTs (HIV, Sífilis/VDRL, Hepatite B e C).\n" +
      "• Abstinência sexual até que o tratamento de ambos esteja concluído e assintomáticos.";
  }

  var cache = uxCache();
  var ck = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ck, textoRes, 21600);

  var msgCorpo = "🩹 *CONDUTA DE DOENÇA INFLAMATÓRIA PÉLVICA (DIP):*\n\n```text\n" + textoRes + "\n```";
  var botoes = botoesBot([
    [['📋 Copiar Conduta', 'ux:copiar:' + ck]],
    [['🔙 Hub G&O', 'ux:rotina:go'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, msgCorpo, botoes, messageId);
}

// 11. Lactação & Segurança Farmacológica
function enviarTelaGOLactacao(chat, messageId) {
  var texto = "🤱 *SEGURANÇA DE MEDICAMENTOS NA LACTAÇÃO (HALE / MS)*\n\n" +
    "Classificação farmacológica oficial (Ministério da Saúde & Thomas Hale L1-L5):\n" +
    "• 🔴 *Contraindicados:* Amiodarona, Lítio, Ergotamina, Codeína/Tramadol, Quimioterápicos.\n" +
    "• 🟡 *Uso Criterioso:* Ciprofloxacino, Bactrim (evitar < 2 meses), Descongestionantes orais.\n" +
    "• 🟢 *1ª Escolha Segura:* Paracetamol, Ibuprofeno, Dipirona, Enalapril, Sertralina.\n\n" +
    "💡 *Toque em um grupo rápido abaixo ou digite `/lactacao [fármaco]`*:";

  var guiaTexto = "DIRETRIZES DE SEGURANÇA DE MEDICAMENTOS NA LACTAÇÃO (HALE / MS)\n" +
    "- Contraindicados Absolutos (Vermelho MS / Hale L4-L5): Amiodarona, Lítio, Metotrexato, Ciclofosfamida, Ergotamina, Cabergolina, Isotretinoína, Fenindiona, Codeína e Tramadol.\n" +
    "- Cautela / Monitorar (Amarelo MS / Hale L3): Ciprofloxacino, Bactrim (evitar < 2 meses), Descongestionantes orais (Pseudoefedrina), Diazepam/Clonazepam, Fluoxetina.\n" +
    "- 1ª Escolha Segura (Verde MS / Hale L1-L2): Paracetamol, Ibuprofeno, Dipirona, Enalapril, Nifedipino, Metoprolol, Sertralina, Cefalexina, Amoxicilina, Ceftriaxona, Enoxaparina, Varfarina.";

  var cache = uxCache();
  var ckGuia = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ckGuia, guiaTexto, 21600);

  var botoes = botoesBot([
    [['🔴 Fármacos Contraindicados', 'go_lactacao:red'], ['🟡 Cautela / Monitorar', 'go_lactacao:yel']],
    [['🟢 Guia Rápido 1ª Escolha', 'go_lactacao:grn'], ['💊 Puerpério: HAS / Dor / Depressão', 'go_lactacao:puerp']],
    [['📋 Copiar Guia Lactação', 'ux:copiar:' + ckGuia]],
    [['🔙 Hub G&O', 'ux:rotina:go'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function tratarCallbackGOLactacao(chat, v, messageId) {
  var domainLact = (typeof LactacaoSegurancaService !== 'undefined' && LactacaoSegurancaService)
    || (typeof LactacaoSegurancaDomain !== 'undefined' && LactacaoSegurancaDomain)
    || ((typeof require !== 'undefined') ? (function() {
        try { return require('./02_lactacao_seguranca.js'); } catch (e) {
          try { return require('./domain/lactacao_seguranca_domain.js'); } catch (e2) {
            try { return require('../src/02_lactacao_seguranca.js'); } catch (e3) { return null; }
          }
        }
      })() : null);
  var textoRes = "";

  if (v === 'red') {
    if (domainLact && typeof domainLact.listarPorCategoriaMS === 'function') {
      var contra = domainLact.listarPorCategoriaMS('VERMELHO');
      var linhas = ["🔴 FÁRMACOS CONTRAINDICADOS NA AMAMENTAÇÃO (VERMELHO MS / HALE L4-L5):", ""];
      contra.slice(0, 10).forEach(function(item) {
        linhas.push("• " + item.nomeGenerico + " (" + item.hale + "): " + item.mecanismoRisco);
        if (item.alternativasSeguras && item.alternativasSeguras.length) {
          linhas.push("  -> Substituir por: " + item.alternativasSeguras.slice(0, 2).join(', '));
        }
      });
      textoRes = linhas.join("\n");
    } else {
      textoRes = "🔴 FÁRMACOS CONTRAINDICADOS NA LACTAÇÃO:\n• Amiodarona (L5): hipotireoidismo e bradicardia no lactente.\n• Lítio (L4): toxicidade tireoidiana e hipotonia no RN.\n• Ergotamina (L4): ergotismo e inibição da prolactina (seca o leite).\n• Codeína / Tramadol (L4): depressão respiratória fatal via CYP2D6.\n• Quimioterápicos e Imunossupressores: imunossupressão severa.";
    }
  } else if (v === 'yel') {
    if (domainLact && typeof domainLact.listarPorCategoriaMS === 'function') {
      var cautela = domainLact.listarPorCategoriaMS('AMARELO');
      var linhasYel = ["🟡 FÁRMACOS DE USO CRITERIOSO NA LACTAÇÃO (AMARELO MS / HALE L3):", ""];
      cautela.slice(0, 8).forEach(function(item) {
        linhasYel.push("• " + item.nomeGenerico + " (" + item.hale + "): " + (item.condutaClinica || item.mecanismoRisco));
      });
      textoRes = linhasYel.join("\n");
    } else {
      textoRes = "🟡 FÁRMACOS DE USO CRITERIOSO NA LACTAÇÃO:\n• Ciprofloxacino: risco teórico de artropatia; preferir beta-lactâmicos.\n• Bactrim: contraindicado em RN < 2 meses ou G6PD (risco de kernicterus).\n• Descongestionantes orais (Pseudoefedrina): reduzem a produção de leite em 24%.\n• Diazepam / Clonazepam: sedação neonatal e acúmulo por meia-vida longa.";
    }
  } else if (v === 'grn' || v === 'puerp') {
    if (domainLact && typeof domainLact.obterGuiaRapidoClasses === 'function') {
      textoRes = domainLact.obterGuiaRapidoClasses();
    } else {
      textoRes = "🟢 PRESCRIÇÃO SEGURA NA LACTAÇÃO (1ª ESCOLHA):\n• Dor/Febre: Paracetamol (L1), Ibuprofeno (L1), Dipirona (Verde MS).\n• HAS Puerperal: Enalapril (L2), Nifedipino (L2), Metoprolol (L2).\n• Depressão: Sertralina (L2 - padrão-ouro no puerpério).\n• Infecção: Cefalexina (L1), Amoxicilina (L1), Ceftriaxona (L2).\n• Anticoagulação: Enoxaparina (L1), Varfarina (L2).";
    }
  }

  var cache = uxCache();
  var ck = Utilities.getUuid().replace(/-/g, '');
  safePutCache(cache, ck, textoRes, 21600);

  var msgCorpo = "🤱 *SEGURANÇA NA LACTAÇÃO (HALE / LACMED / MS):*\n\n```text\n" + textoRes + "\n```";
  var botoes = botoesBot([
    [['📋 Copiar Guia', 'ux:copiar:' + ck]],
    [['🔴 Contraindicados', 'go_lactacao:red'], ['🟡 Cautela', 'go_lactacao:yel']],
    [['🟢 1ª Escolha', 'go_lactacao:grn'], ['🔙 Hub G&O', 'ux:rotina:go']]
  ]);
  return enviarTelaBot(chat, msgCorpo, botoes, messageId);
}

// Despachante Unificado de Ginecologia & Obstetrícia
function tratarCallbackUXGO(chat, v, messageId) {
  v = String(v || '').replace(/^go_/, '');
  if (v === 'prenatal') return enviarTelaGOPrenatal(chat, messageId);
  if (v.indexOf('prenatal:') === 0) return tratarCallbackGOPrenatal(chat, v.replace('prenatal:', ''), messageId);

  if (v === 'parto') return enviarTelaGOParto(chat, messageId);
  if (v.indexOf('parto:') === 0) return tratarCallbackGOParto(chat, v.replace('parto:', ''), messageId);

  if (v === 'hpp') return enviarTelaGOHpp(chat, messageId);
  if (v.indexOf('hpp:') === 0) return tratarCallbackGOHpp(chat, v.replace('hpp:', ''), messageId);

  if (v === 'mgso4') return enviarTelaGOMgso4(chat, messageId);
  if (v.indexOf('mgso4:') === 0) return tratarCallbackGOMgso4(chat, v.replace('mgso4:', ''), messageId);

  if (v === 'prematuridade') return enviarTelaGOPrematuridade(chat, messageId);
  if (v.indexOf('prematuridade:') === 0) return tratarCallbackGOPrematuridade(chat, v.replace('prematuridade:', ''), messageId);

  if (v === 'toxo') return enviarTelaGOToxo(chat, messageId);
  if (v.indexOf('toxo:') === 0) return tratarCallbackGOToxo(chat, v.replace('toxo:', ''), messageId);

  if (v === 'corrimento') return enviarTelaGOCorrimento(chat, messageId);
  if (v.indexOf('corrimento:') === 0) return tratarCallbackGOCorrimento(chat, v.replace('corrimento:', ''), messageId);

  if (v === 'preventivo') return enviarTelaGOPreventivo(chat, messageId);
  if (v.indexOf('preventivo:') === 0) return tratarCallbackGOPreventivo(chat, v.replace('preventivo:', ''), messageId);

  if (v === 'anticoncepcao') return enviarTelaGOAnticoncepcao(chat, messageId);
  if (v.indexOf('anticoncepcao:') === 0) return tratarCallbackGOAnticoncepcao(chat, v.replace('anticoncepcao:', ''), messageId);

  if (v === 'dip') return enviarTelaGODip(chat, messageId);
  if (v.indexOf('dip:') === 0) return tratarCallbackGODip(chat, v.replace('dip:', ''), messageId);

  if (v === 'lactacao') return enviarTelaGOLactacao(chat, messageId);
  if (v.indexOf('lactacao:') === 0) return tratarCallbackGOLactacao(chat, v.replace('lactacao:', ''), messageId);

  return enviarMenuUXGinecoObstetricia(chat, messageId);
}
var tratarCallbackGinecoObstetricia = tratarCallbackUXGO;

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
    var ehCmdPreservado = /^\/(?:soap|rx|receita|gaso|voz|sabatina|calc|plantao|sbar|round|pitch|interacao|conduta|sos)(?:\s|$)/i.test(text);
    if (!ehCmdPreservado) {
      var emCurso = modoBot(chat);
      if (emCurso && emCurso.mode) salvarModoBot(chat, {caseId: emCurso.caseId, mode: '', data: emCurso.data});
      cache.remove('modo_' + chat);
    }
    ['dvaw_' + chat, 'leito_' + chat, 'efconfirm_' + chat].forEach(function (k) {
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
    } else if (!/^[\d.,\s]+(?:kg|quilos?|kilos?)?$/i.test(text)) {
      // Auto-escape: mensagem clínica livre não deve ficar retida na recalculadora
      cache.remove('recalc_ck_' + chat);
    }
  }

  var drogaAguardando = cache.get('dvaw_' + chat);
  if (drogaAguardando && UX_DROGAS[drogaAguardando]) {
    var p = sanitizarEValidarPesoKg(text);
    if (p !== null) {
      cache.remove('dvaw_' + chat);
      enviarTelaDiluicaoDva(chat, drogaAguardando, p);
      return true;
    }
    // Se o texto parece uma tentativa numérica de informar peso (fora da faixa 1-300 kg)
    if (/^[\d.,\s]+(?:kg|quilos?|kilos?)?$/i.test(text)) {
      enviarMensagemParaChat(chat, 'Informe apenas o peso em kg, por exemplo 70,5. /cancelar encerra.');
      return true;
    }
    // Auto-escape: se enviou texto clínico livre, libera o lock modal e processa normalmente
    cache.remove('dvaw_' + chat);
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
    // Diálogo socrático ativo: não redireciona nem adiciona prefixo /soap à resposta do médico
    return false;
  }

  if (state && UX_MODOS_TEXTO.indexOf(state.mode) !== -1) {
    if (state.mode === 'soap') {
      return processarEntradaSoap(chat, text);
    }
    var ehNovaCalc = state.mode === 'calc' && (
      (typeof ehCalculadoraDeterministica === 'function' && ehCalculadoraDeterministica(text)) ||
      (typeof ehCalculadoraReconhecida === 'function' && ehCalculadoraReconhecida(text)) ||
      /\b(?:glasgow|parkland|curb|crcl|clcr|cockcroft|ckd|holliday|dva|nora|dobuta)\b/i.test(text)
    );
    var dados = (state.data && !ehNovaCalc) ? state.data + '\n\n' + text : text;
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

/* ========== Modo SOAP & Prescrição Ambulatorial Ágil ========== */

/**
 * Processamento unificado de entrada do modo SOAP (Fase 1 e Fase 2).
 * Preserva o contexto clínico sem perda de anamnese/exame físico e consolida sob demanda.
 */
function processarEntradaSoap(chatId, textoEntrada, opcoes) {
  opcoes = opcoes || {};
  var chat = Number(chatId);
  var texto = String(textoEntrada || '').trim();
  var cache = (typeof uxCache === 'function') ? uxCache() : ((typeof CacheService !== 'undefined' && CacheService.getScriptCache) ? CacheService.getScriptCache() : null);

  var estadoAtual = (typeof modoBot === 'function') ? modoBot(chat) : null;
  var legSoap = cache ? cache.get('ctx_' + chat) : null;
  var dadosPrevios = (estadoAtual && estadoAtual.data) ? estadoAtual.data : String(legSoap || '');

  var ehNovo = !!(opcoes.novo || !dadosPrevios.trim());
  var historicoSoap = !ehNovo && estadoAtual && estadoAtual.soapAnamnese
    ? { perguntasFeitas: (estadoAtual.soapAnamnese.perguntasFeitas || []).slice(), respostasComplementares: estadoAtual.soapAnamnese.respostasComplementares || 0 }
    : { perguntasFeitas: [], respostasComplementares: 0 };
  var casoAcumulado = '';

  if (ehNovo) {
    casoAcumulado = texto;
  } else if (texto) {
    if (dadosPrevios.indexOf(texto) === -1) {
      casoAcumulado = dadosPrevios + '\n\n' + texto;
    } else {
      casoAcumulado = dadosPrevios;
    }
  } else {
    casoAcumulado = dadosPrevios;
  }
  if (!ehNovo && texto && casoAcumulado !== dadosPrevios) historicoSoap.respostasComplementares++;

  if (!casoAcumulado.trim()) {
    if (typeof iniciarModoBot === 'function') {
      return iniciarModoBot(chat, 'soap', true, opcoes.messageId);
    }
    return enviarMensagemParaChat(chat, '🩺 Envie os dados do caso clínico para estruturação no SOAP.');
  }

  if (casoAcumulado.length > UX_MAX_CASO_CHARS) {
    enviarMensagemParaChat(chat, 'O caso ultrapassou ' + UX_MAX_CASO_CHARS + ' caracteres. Nenhum dado foi cortado. Use /novo para outro caso.');
  }

  if (typeof definirModoBot === 'function') {
    definirModoBot(chat, 'soap', casoAcumulado);
  }
  if (cache) {
    safePutCache(cache, 'ctx_' + chat, casoAcumulado, UX_TTL_SEG);
  }

  var fecharPlano = !!(opcoes.fecharPlano ||
    (typeof verificarPedidoExplicitoPlano === 'function' && verificarPedidoExplicitoPlano(casoAcumulado)) ||
    /fechar\s+plano|gerar\s+plano|avalia[çc][ãa]o\s+e\s+plano|conduta\s+definitiva/i.test(texto));

  var fnGeradora = function(d) {
    var resultado;
    if (typeof gerarSOAPComIA === 'function') {
      resultado = gerarSOAPComIA(d, { fecharPlano: fecharPlano, ambulatorialAgil: !!opcoes.ambulatorialAgil, historicoSessao: historicoSoap });
    } else if (typeof formatarRascunhoSoapTelegram === 'function') {
      resultado = formatarRascunhoSoapTelegram(d, { fecharPlano: fecharPlano });
    } else {
      resultado = String(d);
    }
    var blocoPerguntas = String(resultado).match(/Perguntas para Completar a Anamnese[^\n]*\n([\s\S]*?)(?:\n\n|$)/i);
    if (blocoPerguntas) {
      blocoPerguntas[1].split('\n').forEach(function(linha) {
        var pergunta = linha.replace(/^\s*[•\-*\d.]+\s*/, '').trim();
        if (pergunta && historicoSoap.perguntasFeitas.indexOf(pergunta) === -1) historicoSoap.perguntasFeitas.push(pergunta);
      });
    }
    historicoSoap.anamneseSuficiente = fecharPlano || (typeof avaliarSuficienciaAnamnese === 'function' && avaliarSuficienciaAnamnese(d, historicoSoap).anamneseSuficiente);
    historicoSoap.perguntasPendentes = historicoSoap.anamneseSuficiente || !blocoPerguntas ? [] : blocoPerguntas[1].split('\n').map(function(linha) {
      return linha.replace(/^\s*[•\-*\d.]+\s*/, '').trim();
    }).filter(Boolean);
    var estadoPersistido = modoBot(chat);
    if (estadoPersistido && estadoPersistido.mode === 'soap' && estadoPersistido.data === d) {
      estadoPersistido.soapAnamnese = historicoSoap;
      PersistenciaBot.salvar('atendimento_' + chat, estadoPersistido);
      safePutCache(uxCache(), 'modo_' + chat, JSON.stringify(estadoPersistido), UX_TTL_SEG);
    }
    return resultado;
  };

  return processarEEntregarIA(chat, fnGeradora, casoAcumulado, 'soap', opcoes.messageId);
}

/* ========== Extração de Receita do SOAP ========== */

function extrairPlanoDeTextoSoap(textoSoap) {
  if (!textoSoap || typeof textoSoap !== "string") return null;
  var texto = textoSoap.trim();

  // 1. Procurar cabeçalho da seção de Plano / Conduta / Prescrição
  var regexPlano = /(?:(?:📋\s*)?\[?\*?P\s*[-–—:]\s*(?:Plano|Conduta|Prescri[çc][ãa]o)\*?\]?\s*(?::|[-–—])?\s*|\b(?:4\.\s*)?PLANO(?:\s+TERAP[ÊE]UTICO)?\s*[:\n]\s*|\bPRESCRI[ÇC][ÃA]O(?:\s+FARMACOL[ÓO]GICA)?\s*[:\n]\s*)([\s\S]+)/i;
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

/* ========== Funções de Apresentação dos Novos Domínios Puros (Argon) ========== */

function enviarMenuDiluicao(chat, messageId) {
  var domain = obterDiluicaoDomain();
  if (!domain) return enviarMensagemParaChat(chat, 'Módulo de diluição indisponível.');
  var catalogo = domain.listarCatalogo();
  var botoesFarmacos = catalogo.map(function (f) {
    var icone = f.id === 'noradrenalina' ? '⚡' : (f.id === 'amiodarona' ? '❤️' : (f.id === 'fentanil' ? '💉' : '🧪'));
    return [icone + ' ' + f.nomeGenerico.split(' ')[0], 'ux:dil:f:' + f.id];
  });
  var matriz = [];
  for (var i = 0; i < botoesFarmacos.length; i += 2) {
    matriz.push(botoesFarmacos.slice(i, i + 2));
  }
  matriz.push([['🔄 Checar Compatibilidade em Y', 'ux:dil:y_menu']]);
  matriz.push([['🔙 Sala Vermelha', 'ux:hub:sala'], ['🏠 Início', 'ux:hub:inicio']]);

  var texto = "🧪 *GUIA DE DILUIÇÃO E INFUSÃO HOSPITALAR (TRISSEL'S & SSC)*\n\n" +
    "Selecione um fármaco crítico de emergência/UTI para consultar preparo, diluição padrão/concentrada, " +
    "titulação minuto a minuto, pH e estabilidade físico-química em 0ms:";
  return enviarTelaBot(chat, texto, botoesBot(matriz), messageId);
}

function tratarCallbackDiluicao(chat, v, messageId) {
  var domain = obterDiluicaoDomain();
  if (!domain) return false;
  if (!v || v === 'menu') return enviarMenuDiluicao(chat, messageId);

  if (v === 'y_menu') {
    var matrizY = [
      [['Noradrenalina + Amiodarona', 'ux:dil:y:noradrenalina:amiodarona']],
      [['Fenitoína + Fentanil', 'ux:dil:y:fenitoina:fentanil']],
      [['Sulfato Mg + Noradrenalina', 'ux:dil:y:sulfato_mg:noradrenalina']],
      [['🔙 Diluições', 'ux:dil:menu'], ['🏠 Início', 'ux:hub:inicio']]
    ];
    var textoY = "🔬 *MATRIZ DE COMPATIBILIDADE EM Y (TRISSEL'S HANDBOOK)*\n\n" +
      "Selecione uma combinação rápida ou envie `/compat y <farmacoA> <farmacoB>`:";
    return enviarTelaBot(chat, textoY, botoesBot(matrizY), messageId);
  }

  if (v.indexOf('y:') === 0) {
    var partesY = v.substring(2).split(':');
    var fA = partesY[0], fB = partesY[1];
    var resultadoY = domain.checarCompatibilidadeY(fA, fB);
    var kbResY = botoesBot([
      [['🔄 Checar Outra', 'ux:dil:y_menu'], ['🔙 Diluições', 'ux:dil:menu']]
    ]);
    return enviarTelaBot(chat, resultadoY.textoFormatado, kbResY, messageId);
  }

  if (v.indexOf('f:') === 0) {
    var farmacoId = v.substring(2);
    var info = domain.consultarFarmaco(farmacoId, 70);
    var cache = uxCache();
    var ckDil = Utilities.getUuid().replace(/-/g, '');
    safePutCache(cache, ckDil, info.textoFormatado, 21600);

    var kbFarmaco = botoesBot([
      [['📋 Copiar Guia', 'ux:copiar:' + ckDil]],
      [['🔙 Diluições', 'ux:dil:menu'], ['🏠 Início', 'ux:hub:inicio']]
    ]);
    return enviarTelaBot(chat, info.textoFormatado, kbFarmaco, messageId);
  }
  return false;
}

function enviarMenuPacotesSindromicos(chat, messageId) {
  var domain = obterPacotesDomain();
  if (!domain) return enviarMensagemParaChat(chat, 'Módulo de pacotes sindrômicos indisponível.');
  var kits = domain.listarKits();
  var botoesKits = kits.map(function (k) {
    return [(k.icone || '📦') + ' ' + k.titulo.split('/')[0].trim(), 'ux:kit:ver:' + k.id];
  });
  var matriz = [];
  for (var i = 0; i < botoesKits.length; i += 2) {
    matriz.push(botoesKits.slice(i, i + 2));
  }
  matriz.push([['🔙 Sala Vermelha', 'ux:hub:sala'], ['🏠 Início', 'ux:hub:inicio']]);

  var texto = "📦 *PACOTES SINDRÔMICOS DE EMERGÊNCIA (ORDER SETS)*\n\n" +
    "Condutas imediatas, prescrição hospitalar e de alta, alertas de gravidade e texto limpo para o PEP em 1-toque:";
  return enviarTelaBot(chat, texto, botoesBot(matriz), messageId);
}

function tratarCallbackPacotes(chat, v, messageId) {
  var domain = obterPacotesDomain();
  if (!domain) return false;
  if (!v || v === 'menu') return enviarMenuPacotesSindromicos(chat, messageId);

  if (v.indexOf('ver:') === 0) {
    var kitId = v.substring(4);
    var kit = domain.obterKit(kitId, { pesoKg: 70 });
    var cache = uxCache();
    var ckPep = Utilities.getUuid().replace(/-/g, '');
    safePutCache(cache, ckPep, kit.textoCopiaPEP, 21600);

    var kbKit = botoesBot([
      [['📋 Copiar PEP Completo', 'ux:copiar:' + ckPep]],
      [['🔙 Pacotes Sindrômicos', 'ux:kit:menu'], ['🏠 Início', 'ux:hub:inicio']]
    ]);
    var textoResumo = domain.gerarTextoFormatadoTelegram(kitId);
    return enviarTelaBot(chat, textoResumo, kbKit, messageId);
  }
  return false;
}

function enviarMenuChecklistClinico(chat, chkId, mascaraAtual, messageId) {
  var domain = obterChecklistDomain();
  if (!domain) return enviarMensagemParaChat(chat, 'Módulo de checklists indisponível.');
  var id = chkId || 'fast_hug_sb';
  var mask = typeof mascaraAtual === 'number' ? mascaraAtual : 0;
  var chk = domain.obterChecklist(id);
  var textoFormatado = domain.gerarTextoFormatadoTelegram(id, mask);

  var botoesItens = chk.itens.map(function (item, idx) {
    var marcado = Boolean(mask & (1 << idx));
    var statusIcon = marcado ? '✅' : '⬜';
    var rotuloCurto = item.label.split('-')[0].trim();
    return [statusIcon + ' ' + rotuloCurto, 'ux:chk:' + id + ':' + mask + ':' + idx];
  });

  var matriz = [];
  for (var i = 0; i < botoesItens.length; i += 3) {
    matriz.push(botoesItens.slice(i, i + 3));
  }
  matriz.push([
    ['🔄 Alternar Checklist', 'ux:chk:trocar'],
    ['📋 Gerar Relatório PEP', 'ux:chk:pep:' + id + ':' + mask]
  ]);
  matriz.push([['🔙 Enfermaria', 'ux:hub:enf'], ['🏠 Início', 'ux:hub:inicio']]);

  return enviarTelaBot(chat, textoFormatado, botoesBot(matriz), messageId);
}

function tratarCallbackChecklist(chat, v, messageId) {
  var domain = obterChecklistDomain();
  if (!domain) return false;
  if (!v || v === 'menu') return enviarMenuChecklistClinico(chat, 'fast_hug_sb', 0, messageId);

  if (v === 'trocar') {
    var listas = domain.listarChecklists();
    var botoesListas = listas.map(function (c) {
      return [(c.icone || '📋') + ' ' + c.titulo.split('(')[0].trim(), 'ux:chk:' + c.id + ':0'];
    });
    var matriz = [];
    for (var i = 0; i < botoesListas.length; i += 2) {
      matriz.push(botoesListas.slice(i, i + 2));
    }
    matriz.push([['🔙 Checklists', 'ux:chk:menu'], ['🏠 Início', 'ux:hub:inicio']]);
    return enviarTelaBot(chat, "📋 *SELECIONE O CHECKLIST DE SEGURANÇA:*", botoesBot(matriz), messageId);
  }

  var partes = v.split(':');
  if (partes[0] === 'pep') {
    var pId = partes[1], pMask = Number(partes[2]) || 0;
    var chkObj = domain.obterChecklist(pId);
    var relatorio = domain.avaliar(pId, pMask);
    var textoPEP = "==================================================\n" +
      "RELATÓRIO DE CONFORMIDADE E CHECKLIST CLÍNICO\n" +
      "Protocolo: " + chkObj.titulo + "\n" +
      "Conformidade: " + relatorio.percentual + "% (" + relatorio.completados + "/" + relatorio.total + " itens)\n" +
      "Status: " + relatorio.status.toUpperCase() + "\n" +
      "Parecer: " + relatorio.parecerClinico + "\n" +
      "==================================================";
    var cache = uxCache();
    var ckChk = Utilities.getUuid().replace(/-/g, '');
    safePutCache(cache, ckChk, textoPEP, 21600);
    var kbPep = botoesBot([
      [['📋 Copiar Texto', 'ux:copiar:' + ckChk]],
      [['🔙 Voltar ao Checklist', 'ux:chk:' + pId + ':' + pMask]]
    ]);
    return enviarTelaBot(chat, "📋 *RELATÓRIO CLÍNICO GERADO PARA PRONTUÁRIO:*", kbPep, messageId);
  }

  var chkId = partes[0];
  var mask = Number(partes[1]) || 0;
  if (partes.length >= 3) {
    var toggleBit = Number(partes[2]);
    mask = domain.alternarBit(mask, toggleBit);
  }
  return enviarMenuChecklistClinico(chat, chkId, mask, messageId);
}

function enviarMenuTimeBlocking(chat, atrasoMinutos, messageId) {
  var domain = obterTimeBlockingDomain();
  if (!domain) return enviarMensagemParaChat(chat, 'Módulo de time-blocking indisponível.');
  var atraso = Number(atrasoMinutos) || 0;
  var d = new Date();
  var horaStr = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  var opt = domain.otimizarGrade({ horaAtual: horaStr, atrasoMinutos: atraso });
  var textoTimeline = domain.gerarTimelineFormatada(opt);

  var matriz = [
    [['⏱️ +30 min Atraso', 'ux:tb:atraso:' + (atraso + 30)], ['⏱️ +60 min Atraso', 'ux:tb:atraso:' + (atraso + 60)]],
    [['🚨 Simular Plantão Extra (+90m)', 'ux:tb:sim:90'], ['🔄 Reset Horário', 'ux:tb:atraso:0']],
    [['🔙 Rotina Médica', 'ux:rotina:inicio'], ['🏠 Início', 'ux:hub:inicio']]
  ];
  return enviarTelaBot(chat, textoTimeline, botoesBot(matriz), messageId);
}

function tratarCallbackTimeBlocking(chat, v, messageId) {
  var domain = obterTimeBlockingDomain();
  if (!domain) return false;
  if (!v || v === 'menu') return enviarMenuTimeBlocking(chat, 0, messageId);

  var partes = v.split(':');
  if (partes[0] === 'atraso') {
    var atraso = Number(partes[1]) || 0;
    return enviarMenuTimeBlocking(chat, atraso, messageId);
  }
  if (partes[0] === 'sim') {
    var extra = Number(partes[1]) || 90;
    var d = new Date();
    var horaStr = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    var sim = domain.simularCenarios(horaStr, extra);
    var textoSim = "🚨 *SIMULAÇÃO DE PLANTÃO ESTENDIDO (+" + extra + " min)*\n\n" +
      "• *Perda de Estudo:* " + sim.impactoLiquido.perdaMinutosEstudo + " minutos\n" +
      "• *Modo:* " + sim.cenarioEstendido.modoDegradacao + "\n" +
      "• *Retenção:* " + sim.cenarioEstendido.taxaPreservacaoPercentual + "%\n\n" +
      sim.cenarioEstendido.timelineFormatada;
    var kbSim = botoesBot([
      [['🔄 Voltar à Grade Normal', 'ux:tb:atraso:0']],
      [['🔙 Menu Rotina', 'ux:rotina:inicio']]
    ]);
    return enviarTelaBot(chat, textoSim, kbSim, messageId);
  }
  return false;
}

/* ========== Callbacks ========== */

function tratarCallbackUX(cb) {
  var data = String(cb.data || '');
  if (data.indexOf('go_') === 0) {
    data = 'ux:go:' + data.substring(3);
  }
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
      if (v === 'sala' || v === 'emerg') {
        enviarMenuSalaVermelha(chat, msgId);
      } else if (v === 'enf') {
        enviarMenuEnfermaria(chat, msgId);
      } else if (v === 'amb') {
        enviarMenuAmbulatorio(chat, msgId);
      } else if (v === 'bolso') {
        enviarMenuConsultasBolso(chat, msgId);
      } else if (v === 'go') {
        enviarMenuUXGinecoObstetricia(chat, msgId);
      } else if (v === 'rx') {
        iniciarModoBot(chat, 'rx', false, msgId);
      } else if (v === 'calc') {
        enviarMenuUXCalculadoras(chat, msgId);
      } else if (v === 'soap') {
        iniciarModoBot(chat, 'soap', true, msgId);
      } else if (v === 'sbar') {
        return tratarCallbackEnfSBAR(chat, msgId);
      } else if (v === 'rotina') {
        enviarRotinaBot(chat, msgId);
      } else if (v === 'manual') {
        texto('/manual');
      } else if (v === 'ajuda') {
        if (typeof enviarMenuAjudaInterativo === 'function') return enviarMenuAjudaInterativo(chat, msgId);
        texto('/ajuda');
      }
    } else if (op === 'ajuda') {
      if (v === 'passos') {
        if (typeof enviarGuiaRapidoPassos === 'function') return enviarGuiaRapidoPassos(chat, msgId);
      } else if (v === 'exemplos') {
        if (typeof enviarExemplosPraticosBeiraLeito === 'function') return enviarExemplosPraticosBeiraLeito(chat, msgId);
      } else if (v === 'categorias') {
        if (typeof enviarMenuCategoriasAjuda === 'function') return enviarMenuCategoriasAjuda(chat, msgId);
      } else if (v === 'todos' || v === 'todas') {
        if (typeof enviarManualCompletoComandos === 'function') return enviarManualCompletoComandos(chat, 'todas', msgId);
      } else {
        if (typeof enviarMenuAjudaInterativo === 'function') return enviarMenuAjudaInterativo(chat, msgId);
      }
    } else if (op === 'enf') {
      if (v === 'clcr') return enviarTelaEnfClearance(chat, msgId);
      else if (v === 'ajuste') return enviarTelaEnfAjusteATB(chat, msgId);
      else if (v === 'hidratacao') return enviarTelaEnfHidratacao(chat, msgId);
      else if (v === 'rxh') return enviarTelaEnfPrescricaoHosp(chat, msgId);
      else if (v === 'sbar') return enviarTelaEnfSBAR(chat, msgId);
      else if (v === 'plantao_fim') return gerarResumoFimPlantao(chat, msgId);
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
      if (v === 'exemplo_pac') return enviarTelaEnfPrescricaoHosp(chat, msgId);
      else texto('/rxh ' + v);
    } else if (op === 'amb') {
      if (v === 'soap') return enviarTelaAmbSoap(chat, msgId);
      else if (v === 'remume') return enviarTelaAmbRemume(chat, msgId);
      else if (v === 'cid') return enviarTelaAmbCid(chat, msgId);
      else if (v === 'atestado') return enviarTelaAmbAtestado(chat, msgId);
      else if (v === 'ef') return enviarTelaAmbExameFisico(chat, msgId, 'padrao_completo');
      else if (v.indexOf('ef:') === 0) return enviarTelaAmbExameFisico(chat, msgId, v.substring(3));
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
    } else if (op === 'calc') {
      return tratarCallbackUXCalc(chat, v, msgId);
    } else if (op === 'go') {
      return tratarCallbackUXGO(chat, v, msgId);
    } else if (op === 'emerg') {
      if (v === 'choque') return enviarMenuEmergChoque(chat, msgId);
      else if (v === 'glasgow') return enviarMenuEmergGlasgow(chat, msgId);
      else if (v === 'crisehas') return enviarMenuEmergCriseHas(chat, msgId);
      else if (v === 'dengue') return enviarMenuEmergDengue(chat, msgId);
      else if (v === 'cefaleia') return enviarMenuEmergCefaleia(chat, msgId);
      else if (v === 'arritmia') {
        if (typeof tratarComandoArritmia === 'function') return tratarComandoArritmia(chat, '', '', msgId);
        return texto('/arritmia');
      }
      else return enviarMenuSalaVermelha(chat, msgId);
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
      if (v === 'soap') {
        if (dados && dados.trim().length >= 5) {
          return processarEntradaSoap(chat, '', { messageId: msgId });
        } else {
          return iniciarModoBot(chat, 'soap', true, msgId);
        }
      }
      enviarTelaBot(chat, '*' + UX_NOMES_MODO[v] + '*\n\nCaso ativo iniciado com os dados atuais.',
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
          if (typeof PersistenciaBot !== "undefined" && typeof PersistenciaBot.ler === "function") {
            try {
              var rawV = PersistenciaBot.ler('soapview_' + chat);
              if (rawV) {
                var objV = typeof rawV === 'string' ? JSON.parse(rawV) : rawV;
                if (objV && objV.texto) dadosSoap = objV.texto;
              }
            } catch (eV) {}
          }
        }
        if (!dadosSoap || dadosSoap.trim().length < 5) {
          return enviarTelaBot(chat, '🩺 *Nenhum caso ativo para gerar Avaliação e Plano.*\n\nEnvie os dados do caso clínico por áudio ou texto:', botoesBot([
            [['📝 Iniciar SOAP', 'ux:iniciar:soap']],
            [['🔙 Ambulatório', 'ux:hub:amb'], ['🏠 Início', 'ux:hub:inicio']]
          ]), msgId);
        }
        enviarMensagemParaChat(chat, '📋 *Consolidando anamnese, exame físico e gerando Avaliação e Plano...*');
        return processarEEntregarIA(chat, function(d) { return gerarSOAPComIA(d, { fecharPlano: true }); }, dadosSoap, "soap", msgId);
      } else if (v === 'ef_normal' || v.indexOf('ef_confirmar:') === 0 || v.indexOf('ef_cancelar:') === 0) {
        var estNorm = modoBot(chat);
        var dadosNorm = (estNorm && estNorm.data) ? estNorm.data : String(cache.get('ctx_' + chat) || '');
        if (v === 'ef_normal') {
          if (!dadosNorm.trim()) {
            return enviarTelaBot(chat, '🩺 *Nenhum caso clínico ativo.*\n\nEnvie os dados do caso antes de registrar o exame físico:', botoesBot([
              [['📝 Iniciar SOAP', 'ux:iniciar:soap'], ['🔙 Ambulatório', 'ux:hub:amb']],
              [['🏠 Início', 'ux:hub:inicio']]
            ]), msgId);
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
          return enviarTelaBot(chat, '⚠️ Confirmação indisponível ou expirada. Reabra a ação no caso SOAP atual:', botoesBot([
            [['📋 Fechar Plano', 'ux:soap:plano'], ['🔙 Ambulatório', 'ux:hub:amb']],
            [['🏠 Início', 'ux:hub:inicio']]
          ]), msgId);
        }
        cache.remove('efconfirm_' + chat);
        var revCanc = (estNorm && estNorm.revision) ? (':' + estNorm.revision) : '';
        if (v.indexOf('ef_cancelar:') === 0) {
          return enviarTelaBot(chat, 'Registro do exame físico normal cancelado. O caso clínico foi mantido.', botoesBot([
            [['📋 Fechar Plano', 'ux:soap:plano' + revCanc], ['🩺 EF Normal', 'ux:soap:ef_normal' + revCanc]],
            [['🔙 Ambulatório', 'ux:hub:amb'], ['🏠 Início', 'ux:hub:inicio']]
          ]), msgId);
        }
        if (confirmEf.expires < Date.now() || confirmEf.dados !== dadosNorm || confirmEf.estado !== JSON.stringify(estNorm)) {
          return enviarTelaBot(chat, '⚠️ O caso mudou ou a confirmação expirou. Confira o SOAP atual antes de registrar o exame:', botoesBot([
            [['📋 Fechar Plano', 'ux:soap:plano' + revCanc], ['🔙 Ambulatório', 'ux:hub:amb']],
            [['🏠 Início', 'ux:hub:inicio']]
          ]), msgId);
        }
        var modeloEfTexto = (typeof obterModeloExameFisicoCompleto === 'function')
          ? obterModeloExameFisicoCompleto(dadosNorm)
          : (typeof SoapAmbulatorialService !== 'undefined' && SoapAmbulatorialService.MODELOS_EXAME_FISICO
            ? SoapAmbulatorialService.MODELOS_EXAME_FISICO.padrao_completo.texto
            : [
                'Sinais Vitais: PA: [   ] mmHg | FC: [   ] bpm | FR: [   ] irpm | SpO2: [   ]% em ar ambiente | T: [   ]°C.',
                'Geral: Bom estado geral, lúcido e orientado no tempo e espaço, corado, hidratado, anictérico, acianótico, afebril ao toque, eupneico em ar ambiente.',
                'ACV: Ritmo cardíaco regular em 2 tempos, bulhas normofonéticas, sem sopros. Pulsos radiais amplos, cheios e simétricos bilateralmente.',
                'AR: Murmúrio vesicular globalmente presente, sem ruídos adventícios. Expansibilidade torácica preservada bilateralmente.',
                'Abdome: Plano, flácido, indolor à palpação superficial e profunda. RHA normoativos. Sem massas ou visceromegalias.',
                'Extremidades: Sem edema de membros inferiores. Panturrilhas livres sem empastamento. TEC < 3 segundos.'
              ].join('\n'));
        if (typeof formatarExameFisicoSistemas === 'function') {
          modeloEfTexto = formatarExameFisicoSistemas(modeloEfTexto);
        }
        dadosNorm += '\n\n' + modeloEfTexto;
        definirModoBot(chat, 'soap', dadosNorm);
        safePutCache(cache, 'ctx_' + chat, dadosNorm, UX_TTL_SEG);
        return processarEEntregarIA(chat, function(d) { return gerarSOAPComIA(d, { fecharPlano: false, historicoSessao: (modoBot(chat) || {}).soapAnamnese }); }, dadosNorm, "soap", msgId);
      } else if (v === 'atualizar') {
        var estAtu = modoBot(chat);
        var revAtu = (estAtu && estAtu.revision) ? (':' + estAtu.revision) : '';
        var msgAtu = '🩺 *Modo SOAP Ativo*\n\nEnvie novos dados ou atualizações (por áudio ou texto) para complementar o atendimento, ou utilize as ações rápidas abaixo:';
        return enviarTelaBot(chat, msgAtu, botoesBot([
          [['📋 Fechar Plano', 'ux:soap:plano' + revAtu], ['🩺 EF Normal', 'ux:soap:ef_normal' + revAtu]],
          [['🔙 Ambulatório', 'ux:hub:amb'], ['🏠 Início', 'ux:hub:inicio']]
        ]), msgId);
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
      return processarEEntregarIA(chat, function(d) { return gerarSOAPComIA(d, { fecharPlano: false, historicoSessao: (modoBot(chat) || {}).soapAnamnese }); }, dadosInc, "soap");
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
          var kbRestrito = botoesBot([[['🏠 Início', 'ux:hub:inicio']]]);
          return enviarTelaBot(chat, '🔒 *Recurso Restrito ao Titular*\n\nEste recurso (Notion, Agenda e Rotina pessoal) é exclusivo do administrador da conta.\n\n💡 Use o início para acessar calculadoras, condutas e guias clínicos.', kbRestrito, msgId);
        }
        if (v === 'agenda') {
          return consultarEventosAgenda('', chat, msgId);
        } else if (v === 'agenda_amanha') {
          return consultarEventosAgenda('amanha', chat, msgId);
        } else if (v === 'tasks') {
          return listarTarefasHojeNotion(chat, msgId);
        } else if (v === 'briefing') {
          return enviarBriefingMatinal(chat, true, msgId);
        } else if (v === 'checkin') {
          return enviarCheckinNoturno(chat, msgId);
        } else if (v === 'plantao_fim') {
          return gerarResumoFimPlantao(chat, msgId);
        } else if (v === 'duvida' || v === 'duvidas_lista') {
          if (typeof listarDuvidasMedQuest === 'function') {
            return listarDuvidasMedQuest(chat, msgId);
          }
          var msgDuvida = '🧠 *MEDQUEST / DÚVIDAS MÉDICAS*\n\n' +
            'Envie sua dúvida médica a qualquer momento digitando:\n' +
            '`/duvida <sua dúvida>`\n\n' +
            '💡 *Exemplo:* `/duvida Critérios de Light para derrame pleural`\n\n' +
            'Sua dúvida é salva localmente e de forma resiliente para o bloco noturno de estudo ativo no MedQuest.';
          var kbDuvida = botoesBot([
            [['🔙 Central de Rotina', 'ux:hub:rotina'], ['🏠 Início', 'ux:hub:inicio']]
          ]);
          return enviarTelaBot(chat, msgDuvida, kbDuvida, msgId);
        } else {
          texto('/' + v);
        }
      }
    } else if (op === 'sala') {
      enviarMenuSalaVermelha(chat, msgId);
    } else if (op === 'choque') {
      if (v.indexOf('septico:') === 0) {
        var partesCh = v.split(':');
        var pChoque = parseFloat(partesCh[1]) || 70;
        var dNora = parseFloat(partesCh[2]) || 0.3;
        if (typeof EmergenciaChoqueSepticoService !== 'undefined') {
          var resCh = EmergenciaChoqueSepticoService.avaliarCirciEVasopressina(pChoque, dNora);
          var txtCh = "🩸 *PROTOCOLO DE CHOQUE SÉPTICO REFRATÁRIO*\n\n" + (resCh.textoSOAP || resCh.erro);
          var ckCh = Utilities.getUuid().replace(/-/g, '');
          safePutCache(cache, ckCh, txtCh, 21600);
          return enviarTelaBot(chat, txtCh, botoesBot([
            [['📋 Copiar para Prontuário', 'ux:copiar:' + ckCh]],
            [['🔙 Sala Vermelha', 'ux:hub:sala'], ['🏠 Início', 'ux:hub:inicio']]
          ]), msgId);
        }
      }
      return enviarMenuEmergChoque(chat, msgId);
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
        if (typeof tratarComandoPcr === 'function') return tratarComandoPcr(chat, '', msgId);
      }
      var telaDet = (typeof enviarTelaCondutaEmergencia === 'function') ? enviarTelaCondutaEmergencia(chat, v, msgId) : null;
      if (telaDet) return telaDet;
      texto('/conduta ' + (UX_CONDUTAS[v] || v));
    } else if (op === 'choquesep') {
      var partesSep = v.split(':');
      var pSep = parseFloat(partesSep[0]) || 70;
      var nSep = parseFloat(partesSep[1]) || 0.3;
      if (typeof EmergenciaChoqueSepticoService !== 'undefined') {
        var resSep = EmergenciaChoqueSepticoService.avaliarCirciEVasopressina(pSep, nSep);
        if (resSep && resSep.textoSOAP) {
          var txtSep = "🩸 *PROTOCOLO DE CHOQUE SÉPTICO REFRATÁRIO & CIRCI*\n\n" + resSep.textoSOAP;
          var ckSep = Utilities.getUuid().replace(/-/g, '');
          safePutCache(cache, ckSep, txtSep, 21600);
          var kbSep = botoesBot([
            [['📋 Copiar para Prontuário', 'ux:copiar:' + ckSep]],
            [['💉 Simular 70kg Nora 0.3', 'ux:choque:septico:70:0.3'], ['💉 Simular 80kg Nora 0.3', 'ux:choque:septico:80:0.3']],
            [['🔙 Sala Vermelha', 'ux:sala'], ['🏠 Início', 'ux:hub:inicio']]
          ]);
          return enviarTelaBot(chat, txtSep, kbSep, msgId);
        }
      }
      return enviarMenuEmergChoque(chat, msgId);
    } else if (op === 'painel' || op === 'leito' || op === 'status' || op === 'evoluir' || op === 'confirmar' || op === 'alta') {
      return processarAcaoLeito(chat, op, v, msgId);
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
      var partesCopiar = String(v || '').split(':');
      var chaveCache = v;
      var origemRetorno = 'menu';
      if (partesCopiar.length >= 2) {
        origemRetorno = partesCopiar[0];
        chaveCache = partesCopiar.slice(1).join(':');
      }
      var raw = cache.get(chaveCache) || cache.get(v);
      var mapaRetorno = {
        'sala': { label: '🔙 Sala Vermelha', cb: 'ux:hub:sala' },
        'amb': { label: '🔙 Ambulatório', cb: 'ux:hub:amb' },
        'enf': { label: '🔙 Enfermaria', cb: 'ux:hub:enf' },
        'calc': { label: '🔙 Calculadoras', cb: 'ux:hub:calc' },
        'bolso': { label: '🔙 Consultas Bolso', cb: 'ux:hub:bolso' },
        'go': { label: '🔙 Hub G&O', cb: 'ux:rotina:go' },
        'rotina': { label: '🔙 Central Rotina', cb: 'ux:hub:rotina' }
      };
      var infoRetorno = mapaRetorno[origemRetorno] || { label: '🔙 Menu Anterior', cb: 'ux:menu' };
      var kbRetornoCopiar = botoesBot([
        [[infoRetorno.label, infoRetorno.cb], ['🏠 Início', 'ux:hub:inicio']]
      ]);
      if (!raw) {
        enviarMensagemComTecladoParaChat(chat, '⚠️ Resultado expirado do cache. Gere novamente com os dados do caso.', kbRetornoCopiar);
        return true;
      }
      if (op === 'pdf') {
        ReceitaPdfService.processarEEnviarPdf(chat, raw);
      } else if (op === 'copiar') {
        var textoLimpo = uxTextoProntuario(raw);
        var fatias = uxDividirTexto(textoLimpo, 3500);
        fatias.forEach(function (fatia, idx) {
          var blocoFatia = "📋 *PRONTO PARA O PRONTUÁRIO (1-TOQUE PARA COPIAR" + (fatias.length > 1 ? " · PARTE " + (idx + 1) + "/" + fatias.length : "") + "):*\n\n```text\n" + fatia + "\n```\n\n💡 Retorne ao menu ou início abaixo:";
          enviarMensagemComTecladoParaChat(chat, blocoFatia, kbRetornoCopiar);
        });
      } else {
        enviarMensagemComTecladoParaChat(chat, raw, kbRetornoCopiar);
      }
    } else if (op === 'dil') {
      return tratarCallbackDiluicao(chat, v, msgId);
    } else if (op === 'kit') {
      return tratarCallbackPacotes(chat, v, msgId);
    } else if (op === 'chk') {
      return tratarCallbackChecklist(chat, v, msgId);
    } else if (op === 'tb') {
      return tratarCallbackTimeBlocking(chat, v, msgId);
    } else if (op === 'perfil') {
      return tratarCallbackPerfilClinico(chat, v, msgId);
    } else if (op === 'cenario') {
      return tratarCallbackCenarioModulos(chat, v, msgId);
    } else if (op === 'cidade') {
      return tratarCallbackCidadeRemume(chat, v, msgId);
    } else if (op === 'remume') {
      return tratarCallbackSolicitarOuImportarRemume(chat, v, msgId);
    } else {
      enviarMensagemParaChat(chat, 'Ação não reconhecida. Reabra o menu.');
    }
  } catch (e) {
    console.error('tratarCallbackUX [' + data + ']: ' + ((e && e.stack) || e));
    try { enviarMensagemParaChat(chat, 'Não consegui concluir essa ação. Tente novamente ou use /cancelar.'); } catch (e2) {}
  }
  return true;
}

// ============================================================================
// CENTRAL DE PERFIL, NOME, CIDADE, CENÁRIO (CHECKBOXES) E AUTOATENDIMENTO REMUME
// ============================================================================

function enviarTelaOnboardingNome(chat, messageId) {
  var ctx = (typeof ConfigService !== 'undefined' && typeof ConfigService.getContextoClinico === 'function')
    ? ConfigService.getContextoClinico(chat)
    : { prefixo_tratamento: 'Dr.', nome_chamada: 'Médico(a)' };
  var prefAtual = ctx.prefixo_tratamento || 'Dr.';
  var nomeAtual = (ctx.nome_chamada && ctx.nome_chamada !== 'Médico(a)') ? (prefAtual + ' ' + ctx.nome_chamada) : 'Não definido';

  var texto = '👨‍⚕️👩‍⚕️ *IDENTIFICAÇÃO E SAUDAÇÃO PERSONALIZADA*\n\n' +
    'Como você prefere que eu te chame durante os plantões e atendimentos?\n' +
    '• *Atual:* `' + nomeAtual + '`\n\n' +
    '1️⃣ Escolha seu prefixo abaixo (`Dr.` ou `Dra.`):\n' +
    '2️⃣ Digite ou envie: `/nome SeuNome` (ex: `/nome Matheus` ou `/nome Dra. Carolina`)\n\n' +
    '💡 *Para carimbo de receitas (Médico/Residente):*\n' +
    'Envie `/carimbo Nome Completo | CRM/UF 123456`';

  var botoes = botoesBot([
    [
      [(prefAtual === 'Dr.' ? '✅ ' : '') + '👨‍⚕️ Dr.', 'ux:perfil:pref:Dr.'],
      [(prefAtual === 'Dra.' ? '✅ ' : '') + '👩‍⚕️ Dra.', 'ux:perfil:pref:Dra.']
    ],
    [['⚙️ Voltar ao Perfil', 'ux:perfil:menu'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function enviarMenuPerfilClinico(chat, messageId) {
  var ctx = (typeof ConfigService !== 'undefined' && typeof ConfigService.getContextoClinico === 'function')
    ? ConfigService.getContextoClinico(chat)
    : {};
  var saudacao = ((ctx.prefixo_tratamento || 'Dr.') + ' ' + (ctx.nome_chamada || 'Médico(a)')).trim();
  var mapaPapel = {
    'MEDICO_CRM': '👨‍⚕️ Médico(a) com CRM',
    'RESIDENTE': '🏥 Médico(a) Residente',
    'INTERNO_ACADEMICO': '🎓 Interno(a) / Acadêmico(a) (Receita sem CRM impresso)'
  };
  var mapaCenario = {
    'APS_UBS': '🩺 UBS / Saúde da Família (APS)',
    'URGENCIA_UPA_24H': '🚑 UPA 24h / Pronto Atendimento',
    'SALA_VERMELHA': '🚨 Sala Vermelha / Emergência & UTI',
    'ENFERMARIA': '🛏️ Enfermaria / Clínica Médica',
    'MATERNIDADE_GO': '🤰 Maternidade / Centro Obstétrico (G&O)',
    'PEDIATRIA': '👶 Pronto-Socorro / Ala Pediátrica'
  };
  var papelTxt = mapaPapel[ctx.papel] || ctx.papel || 'Médico(a) com CRM';
  var cenTxt = mapaCenario[ctx.cenario_assistencial] || ctx.cenario_assistencial || 'UPA 24h';
  var cidTxt = ctx.municipio ? (ctx.municipio + (ctx.uf ? '/' + ctx.uf : '')) : 'Nacional (RENAME SUS)';
  var totalMod = Array.isArray(ctx.modulos_ativos) ? ctx.modulos_ativos.length : 10;

  var texto = '⚙️ *CONFIGURAÇÃO DE PERFIL & REALIDADE LOCAL*\n\n' +
    '• *Saudação no Chat:* `' + saudacao + '`\n' +
    '• *Atuação / Receituário:* ' + papelTxt + '\n' +
    '• *Carimbo PDF:* `' + (ctx.papel === 'INTERNO_ACADEMICO' ? 'Em branco para preceptor assinar' : ((ctx.nome_completo_carimbo || '-') + ' · ' + (ctx.crm || 'Sem CRM'))) + '`\n' +
    '• *Cidade / REMUME:* 📍 `' + cidTxt + '` (`' + (ctx.remume_slug || 'rename_nacional') + '`)\n' +
    '• *Unidade / Serviço:* 🏥 `' + (ctx.unidade_saude || 'Unidade de Saúde') + '`\n' +
    '• *Cenário Assistencial:* ' + cenTxt + ' (`' + totalMod + '/10 módulos visíveis`)\n\n' +
    'Selecione abaixo o que deseja personalizar em 1 toque:';

  var ehTitular = (typeof ehUsuarioTitular === 'function' && ehUsuarioTitular(chat));
  var linhaRemume = ehTitular
    ? [['📬 Solicitações REMUME', 'ux:remume:fila'], ['🏥 Unidade Hospitalar', 'ux:perfil:unidade']]
    : [['📥 Solicitar Nova REMUME', 'ux:cidade:menu'], ['🏥 Unidade Hospitalar', 'ux:perfil:unidade']];

  var botoes = botoesBot([
    [['👨‍⚕️ Nome & Saudação (/nome)', 'ux:perfil:nome'], ['🎓 Papel: Médico / Interno', 'ux:perfil:papel']],
    [['📍 Escolher Cidade / REMUME', 'ux:cidade:menu'], ['🏥 Cenários & Módulos', 'ux:cenario:menu']],
    linhaRemume,
    [['🏠 Voltar ao Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function enviarMenuPapelProfissional(chat, messageId) {
  var ctx = (typeof ConfigService !== 'undefined' && typeof ConfigService.getContextoClinico === 'function')
    ? ConfigService.getContextoClinico(chat)
    : {};
  var p = ctx.papel || 'MEDICO_CRM';
  var texto = '🎓 *PAPEL PROFISSIONAL & REGRA DE RECEITUÁRIO PDF*\n\n' +
    'Escolha seu perfil de atuação atual:\n\n' +
    '• *Médico(a) com CRM / Residente:* O Receituário PDF (100% preto `#000000`) sai com seu Nome Completo e CRM impressos na linha de assinatura.\n' +
    '• *Interno(a) / Acadêmico(a):* O Receituário PDF é emitido *sem nome de médico e sem CRM impressos*, deixando a linha limpa para o médico preceptor carimbar e assinar.';

  var botoes = botoesBot([
    [[(p === 'MEDICO_CRM' ? '✅ ' : '') + '👨‍⚕️ Médico(a) com CRM', 'ux:perfil:setpapel:MEDICO_CRM']],
    [[(p === 'RESIDENTE' ? '✅ ' : '') + '🏥 Médico(a) Residente', 'ux:perfil:setpapel:RESIDENTE']],
    [[(p === 'INTERNO_ACADEMICO' ? '✅ ' : '') + '🎓 Interno(a) / Acadêmico(a)', 'ux:perfil:setpapel:INTERNO_ACADEMICO']],
    [['🔙 Voltar ao Perfil', 'ux:perfil:menu'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function enviarMenuCenarioECheckboxes(chat, messageId) {
  var ctx = (typeof ConfigService !== 'undefined' && typeof ConfigService.getContextoClinico === 'function')
    ? ConfigService.getContextoClinico(chat)
    : {};
  var cen = ctx.cenario_assistencial || 'URGENCIA_UPA_24H';
  var ativos = Array.isArray(ctx.modulos_ativos) ? ctx.modulos_ativos : [];
  var catalogo = (typeof ConfigService !== 'undefined' && Array.isArray(ConfigService.CATALOGO_MODULOS_CLINICOS))
    ? ConfigService.CATALOGO_MODULOS_CLINICOS
    : [];

  var texto = '🏥 *CENÁRIO ASSISTENCIAL & VISIBILIDADE DE MÓDULOS*\n\n' +
    '1️⃣ *Escolha seu cenário principal* para pré-marcar os módulos recomendados:\n' +
    '2️⃣ *Ou marque/desmarque livremente (`✅` / `⬜`)* quais módulos você quer exibir nos seus menus e no Cockpit.\n\n' +
    '🛡️ _Nota de Segurança:_ Módulos desmarcados (`⬜`) ficam ocultos apenas nos menus visuais para deixar sua tela mais limpa, mas continuam 100% acessíveis se você digitar o comando direto numa emergência.';

  var linhas = [
    [
      [(cen === 'APS_UBS' ? '🎯 ' : '') + '🩺 UBS / APS', 'ux:cenario:preset:APS_UBS'],
      [(cen === 'URGENCIA_UPA_24H' ? '🎯 ' : '') + '🚑 UPA 24h', 'ux:cenario:preset:URGENCIA_UPA_24H']
    ],
    [
      [(cen === 'SALA_VERMELHA' ? '🎯 ' : '') + '🚨 Sala Vermelha', 'ux:cenario:preset:SALA_VERMELHA'],
      [(cen === 'ENFERMARIA' ? '🎯 ' : '') + '🛏️ Enfermaria', 'ux:cenario:preset:ENFERMARIA']
    ],
    [
      [(cen === 'MATERNIDADE_GO' ? '🎯 ' : '') + '🤰 Maternidade G&O', 'ux:cenario:preset:MATERNIDADE_GO'],
      [(cen === 'PEDIATRIA' ? '🎯 ' : '') + '👶 Pediatria', 'ux:cenario:preset:PEDIATRIA']
    ]
  ];

  // Checkboxes dos 10 módulos clínicos em 2 colunas
  for (var i = 0; i < catalogo.length; i += 2) {
    var m1 = catalogo[i];
    var chk1 = (ativos.indexOf(m1.id) !== -1) ? '✅ ' : '⬜ ';
    var row = [[chk1 + m1.nome, 'ux:cenario:toggle:' + m1.id]];
    if (catalogo[i + 1]) {
      var m2 = catalogo[i + 1];
      var chk2 = (ativos.indexOf(m2.id) !== -1) ? '✅ ' : '⬜ ';
      row.push([chk2 + m2.nome, 'ux:cenario:toggle:' + m2.id]);
    }
    linhas.push(row);
  }

  linhas.push([['☑️ Marcar Todos (10/10)', 'ux:cenario:todos'], ['✔️ Aceitar & Salvar', 'ux:cenario:confirmar']]);
  linhas.push([['🔙 Voltar ao Perfil', 'ux:perfil:menu'], ['🏠 Início', 'ux:hub:inicio']]);

  return enviarTelaBot(chat, texto, botoesBot(linhas), messageId);
}

function enviarMenuCidadeERemume(chat, messageId) {
  var ctx = (typeof ConfigService !== 'undefined' && typeof ConfigService.getContextoClinico === 'function')
    ? ConfigService.getContextoClinico(chat)
    : {};
  var presets = (typeof CatalogoRemumeService !== 'undefined' && typeof CatalogoRemumeService.listarPresets === 'function')
    ? CatalogoRemumeService.listarPresets()
    : [];
  var slugAtual = ctx.remume_slug || 'rename_nacional';

  var texto = '📍 *ESCOLHER CIDADE & CATÁLOGO REMUME (SUS)*\n\n' +
    '• *Catálogo Ativo:* `' + (ctx.municipio ? (ctx.municipio + '/' + (ctx.uf || '')) : 'RENAME Nacional (SUS)') + '` (`' + slugAtual + '`)\n\n' +
    'Toque em uma das cidades com preset imediato abaixo, ou digite:\n' +
    '👉 `/cidade Nome da Cidade - UF` (ex: `/cidade Campinas - SP` ou `/cidade Garrafão do Norte - PA`)\n\n' +
    '🛡️ _Caso sua cidade ainda não esteja na lista de presets oficiais, o sistema ativa imediatamente seu perfil utilizando a RENAME Nacional (SUS) como linha de base segura e permite solicitar a inclusão da REMUME municipal com 1 toque!_';

  var linhas = [
    [[(slugAtual === 'rename_nacional' ? '✅ ' : '') + '🇧🇷 RENAME Nacional (Padrão SUS)', 'ux:cidade:set:rename_nacional']]
  ];

  for (var i = 0; i < presets.length; i += 2) {
    var p1 = presets[i];
    var lbl1 = (slugAtual === p1.slug ? '✅ ' : '📍 ') + p1.municipio + ' (' + p1.uf + ')';
    var row = [[lbl1, 'ux:cidade:set:' + p1.slug]];
    if (presets[i + 1]) {
      var p2 = presets[i + 1];
      var lbl2 = (slugAtual === p2.slug ? '✅ ' : '📍 ') + p2.municipio + ' (' + p2.uf + ')';
      row.push([lbl2, 'ux:cidade:set:' + p2.slug]);
    }
    linhas.push(row);
  }

  linhas.push([['🔙 Voltar ao Perfil', 'ux:perfil:menu'], ['🏠 Início', 'ux:hub:inicio']]);

  return enviarTelaBot(chat, texto, botoesBot(linhas), messageId);
}

function enviarTelaUnidadeSaude(chat, messageId) {
  var ctx = (typeof ConfigService !== 'undefined' && typeof ConfigService.getContextoClinico === 'function')
    ? ConfigService.getContextoClinico(chat)
    : {};
  var unid = ctx.unidade_saude || 'Unidade de Saúde';

  var texto = '🏥 *UNIDADE DE SAÚDE & LOCAL DE ATUAÇÃO*\n\n' +
    'O nome da sua Unidade ou Hospital é exibido no cabeçalho das receitas, atestados e relatórios emitidos.\n\n' +
    '• *Unidade atual:* `' + unid + '`\n\n' +
    '✍️ *Para alterar, envie o comando com o novo nome:*\n' +
    '`/unidade Nome do Hospital ou Posto`\n\n' +
    '💡 *Exemplos rápidos:*\n' +
    '• `/unidade UPA 24h Central`\n' +
    '• `/unidade Hospital das Clínicas`\n' +
    '• `/unidade UBS Jardim América`';

  var botoes = botoesBot([
    [['🔙 Voltar ao Perfil', 'ux:perfil:menu'], ['🏠 Início', 'ux:hub:inicio']]
  ]);
  return enviarTelaBot(chat, texto, botoes, messageId);
}

function tratarCallbackPerfilClinico(chat, v, messageId) {
  if (!v || v === 'menu') return enviarMenuPerfilClinico(chat, messageId);
  if (v === 'nome') return enviarTelaOnboardingNome(chat, messageId);
  if (v === 'papel') return enviarMenuPapelProfissional(chat, messageId);
  if (v === 'unidade' || v === 'equipe') return enviarTelaUnidadeSaude(chat, messageId);
  if (v.indexOf('pref:') === 0) {
    var novoPref = v.replace('pref:', '').trim();
    if (typeof ConfigService !== 'undefined' && typeof ConfigService.salvarContextoClinico === 'function') {
      ConfigService.salvarContextoClinico(chat, { prefixo_tratamento: novoPref });
    }
    return enviarTelaOnboardingNome(chat, messageId);
  }
  if (v.indexOf('setpapel:') === 0) {
    var novoPapel = v.replace('setpapel:', '').trim();
    if (typeof ConfigService !== 'undefined' && typeof ConfigService.salvarContextoClinico === 'function') {
      ConfigService.salvarContextoClinico(chat, { papel: novoPapel });
    }
    return enviarMenuPapelProfissional(chat, messageId);
  }
  return enviarMenuPerfilClinico(chat, messageId);
}

function tratarCallbackCenarioModulos(chat, v, messageId) {
  if (!v || v === 'menu') return enviarMenuCenarioECheckboxes(chat, messageId);
  if (v.indexOf('preset:') === 0) {
    var cenarioId = v.replace('preset:', '').trim();
    if (typeof ConfigService !== 'undefined' && typeof ConfigService.aplicarCenarioAssistencial === 'function') {
      ConfigService.aplicarCenarioAssistencial(chat, cenarioId);
    }
    return enviarMenuCenarioECheckboxes(chat, messageId);
  }
  if (v.indexOf('toggle:') === 0) {
    var modId = v.replace('toggle:', '').trim();
    if (typeof ConfigService !== 'undefined' && typeof ConfigService.alternarModuloCenario === 'function') {
      ConfigService.alternarModuloCenario(chat, modId);
    }
    return enviarMenuCenarioECheckboxes(chat, messageId);
  }
  if (v === 'todos') {
    if (typeof ConfigService !== 'undefined' && typeof ConfigService.salvarContextoClinico === 'function') {
      var todosIds = (ConfigService.CATALOGO_MODULOS_CLINICOS || []).map(function(m) { return m.id; });
      ConfigService.salvarContextoClinico(chat, { modulos_ativos: todosIds });
    }
    return enviarMenuCenarioECheckboxes(chat, messageId);
  }
  if (v === 'confirmar') {
    var nomeMed = (typeof obterNomeTratamentoUsuario === 'function') ? obterNomeTratamentoUsuario(chat) : 'Doutor(a)';
    enviarMensagemComTecladoFixo(chat, '✅ *Cenário e módulos atualizados, ' + nomeMed + '!* Teclado rápido ajustado.');
    return enviarHubPrincipal(chat, messageId);
  }
  return enviarMenuCenarioECheckboxes(chat, messageId);
}

function enviarPainelAdminRemume(chat, messageId) {
  var lista = (typeof ConfigService !== 'undefined' && typeof ConfigService.listarSolicitacoesRemume === 'function')
    ? ConfigService.listarSolicitacoesRemume()
    : [];

  var pendentes = lista.filter(function(item) { return item && item.status === 'PENDENTE'; });
  var aprovadas = lista.filter(function(item) { return item && item.status === 'APROVADA'; });
  var arquivadas = lista.filter(function(item) { return item && item.status === 'ARQUIVADA'; });

  var texto = '📬 *CENTRAL DE SOLICITAÇÕES DE REMUME (PAINEL DO DESENVOLVEDOR)*\n\n' +
    '📍 *Armazenamento:* `data/remume_requests.json` + `PersistenciaBot` + `ScriptProperties`\n' +
    '• *Pendentes na fila:* `' + pendentes.length + '`\n' +
    '• *Já homologadas:* `' + aprovadas.length + '`\n' +
    '• *Arquivadas:* `' + arquivadas.length + '`\n\n';

  var linhas = [];

  if (pendentes.length === 0) {
    texto += '✅ *Nenhuma solicitação de REMUME pendente no momento!*';
  } else {
    texto += '📋 *CIDADES PENDENTES SOLICITADAS:*\n\n';
    pendentes.slice(0, 8).forEach(function(req, idx) {
      var qtd = Array.isArray(req.solicitantes) ? req.solicitantes.length : 1;
      var idsTxt = Array.isArray(req.solicitantes) ? req.solicitantes.join(', ') : '';
      texto += (idx + 1) + '. 📍 *' + req.municipio + ' - ' + req.uf + '* (`' + req.slug + '`)\n' +
        '   👥 Solicitantes: `' + qtd + '` (Chat IDs: `' + idsTxt + '`)\n';

      var slugCurto = String(req.slug || '').slice(0, 32);
      linhas.push([
        ['✅ Homologar ' + req.municipio.slice(0, 14), 'ux:remume:prep:' + slugCurto],
        ['🗑️ Arquivar', 'ux:remume:arq:' + slugCurto]
      ]);
    });
    texto += '\n💡 *Para homologar e notificar automaticamente os médicos:*\n' +
      'Envie: `/aprovar_remume Cidade - UF` na 1ª linha e cole os medicamentos nas linhas abaixo.';
  }

  linhas.push([['📍 Ver Presets Ativos', 'ux:cidade:menu'], ['⚙️ Perfil', 'ux:perfil:menu']]);
  linhas.push([['🏠 Início', 'ux:hub:inicio']]);

  return enviarTelaBot(chat, texto, botoesBot(linhas), messageId);
}

function tratarCallbackCidadeRemume(chat, v, messageId) {
  if (!v || v === 'menu') return enviarMenuCidadeERemume(chat, messageId);
  if (v.indexOf('set:') === 0) {
    var slug = v.replace('set:', '').trim();
    if (slug === 'rename_nacional') {
      if (typeof ConfigService !== 'undefined' && typeof ConfigService.salvarContextoClinico === 'function') {
        ConfigService.salvarContextoClinico(chat, {
          municipio: '',
          uf: 'BR',
          remume_slug: 'rename_nacional'
        });
      }
    } else if (typeof CatalogoRemumeService !== 'undefined') {
      var cat = typeof CatalogoRemumeService.obterCatalogoAtivo === 'function'
        ? CatalogoRemumeService.obterCatalogoAtivo(slug)
        : (typeof CatalogoRemumeService.carregarPresetPorSlug === 'function' ? CatalogoRemumeService.carregarPresetPorSlug(slug) : null);

      if (cat && typeof ConfigService !== 'undefined' && typeof ConfigService.salvarContextoClinico === 'function') {
        ConfigService.salvarContextoClinico(chat, {
          municipio: cat.municipio || '',
          uf: cat.uf || 'BR',
          remume_slug: slug
        });
      }
    }
    if (typeof invalidarCacheRemumeRP === 'function') {
      try { invalidarCacheRemumeRP(); } catch (_) {}
    }
    return enviarMenuCidadeERemume(chat, messageId);
  }
  return enviarMenuCidadeERemume(chat, messageId);
}

function tratarCallbackSolicitarOuImportarRemume(chat, v, messageId) {
  if (v === 'instrucoes') {
    return enviarMenuCidadeERemume(chat, messageId);
  }
  if (v === 'fila') {
    return enviarPainelAdminRemume(chat, messageId);
  }
  if (v && v.indexOf('arq:') === 0) {
    var slugArq = v.replace('arq:', '').trim();
    if (typeof ConfigService !== 'undefined' && typeof ConfigService.rejeitarSolicitacaoRemume === 'function') {
      ConfigService.rejeitarSolicitacaoRemume(slugArq);
    }
    return enviarPainelAdminRemume(chat, messageId);
  }
  if (v && v.indexOf('prep:') === 0) {
    var slugPrep = v.replace('prep:', '').trim();
    var listaReqs = (typeof ConfigService !== 'undefined' && typeof ConfigService.listarSolicitacoesRemume === 'function')
      ? ConfigService.listarSolicitacoesRemume()
      : [];
    var reqAlvo = null;
    for (var i = 0; i < listaReqs.length; i++) {
      if (listaReqs[i].slug === slugPrep) {
        reqAlvo = listaReqs[i];
        break;
      }
    }
    var munNome = reqAlvo ? reqAlvo.municipio : slugPrep;
    var ufNome = reqAlvo ? reqAlvo.uf : 'BR';
    var txtGuia = '🛠️ *HOMOLOGAÇÃO DE REMUME MUNICIPAL*\n\n' +
      '• *Município:* `' + munNome + ' - ' + ufNome + '`\n' +
      '• *Slug do Catálogo:* `' + slugPrep + '`\n\n' +
      '📋 *Instruções de homologação em 1 passo:*\n' +
      'Envie uma mensagem no chat iniciando exatamente com:\n\n' +
      '`/aprovar_remume ' + munNome + ' - ' + ufNome + '`\n' +
      'Dipirona Sódica 500mg\n' +
      'Amoxicilina 500mg\n' +
      'Losartana 50mg\n' +
      '...\n\n' +
      '_O bot cadastrará o preset oficial no sistema e notificará automaticamente todos os solicitantes da cidade!_';
    var kbGuia = botoesBot([
      [['🔙 Voltar à Fila', 'ux:remume:fila'], ['🏠 Início', 'ux:hub:inicio']]
    ]);
    return enviarTelaBot(chat, txtGuia, kbGuia, messageId);
  }
  if (v && v.indexOf('solicitar:') === 0) {
    var resto = v.replace('solicitar:', '');
    var partes = resto.split(':');
    var mun = partes[0] || 'Município';
    var uf = partes[1] || 'BR';
    var registro = (typeof ConfigService !== 'undefined' && typeof ConfigService.registrarSolicitacaoRemume === 'function')
      ? ConfigService.registrarSolicitacaoRemume(mun, uf, chat)
      : { municipio: mun, uf: uf, solicitantes: [String(chat)] };

    // Notifica o desenvolvedor (titular) no Telegram - sem trava de self-messaging
    var adminChat = (typeof ConfigService !== 'undefined' && typeof ConfigService.getPrimary === 'function')
      ? ConfigService.getPrimary('TELEGRAM_CHAT_ID')
      : '';
    if (adminChat) {
      try {
        enviarMensagemParaChat(adminChat,
          '📩 *NOVA SOLICITAÇÃO DE REMUME MUNICIPAL*\n\n' +
          '• *Cidade:* `' + registro.municipio + ' - ' + registro.uf + '`\n' +
          '• *Solicitante Chat ID:* `' + chat + '`\n' +
          '• *Total de Pedidos desta Cidade:* ' + (registro.solicitantes ? registro.solicitantes.length : 1) + '\n\n' +
          '💡 Para aprovar e liberar nos presets globais, envie:\n' +
          '`/aprovar_remume ' + registro.municipio + ' - ' + registro.uf + '` seguido da lista de medicamentos.\n\n' +
          'Ou consulte `/solicitacoes_remume` para gerenciar a fila.'
        );
      } catch (_) {}
    }

    var msgOk = '✅ *Solicitação enviada ao desenvolvedor com sucesso!*\n\n' +
      '• *Município solicitado:* `' + registro.municipio + (registro.uf ? ' - ' + registro.uf : '') + '`\n' +
      '• *Status:* Em fila de curadoria prioritária.\n\n' +
      '🔔 Assim que a REMUME oficial de *' + registro.municipio + '* for homologada, você receberá um aviso automático aqui no chat e seu perfil será atualizado!\n\n' +
      '🛡️ _Enquanto isso, suas prescrições e condutas estão protegidas pela RENAME Nacional (SUS)._';
    var kbOk = botoesBot([
      [['🔙 Escolher Cidade', 'ux:cidade:menu'], ['🏠 Início', 'ux:hub:inicio']]
    ]);
    return enviarTelaBot(chat, msgOk, kbOk, messageId);
  }
  return enviarMenuCidadeERemume(chat, messageId);
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
    enviarTelaCalcGaso: enviarTelaCalcGaso,
    enviarTelaCalcRenal: enviarTelaCalcRenal,
    enviarTelaCalcHolliday: enviarTelaCalcHolliday,
    enviarTelaCalcGlasgow: enviarTelaCalcGlasgow,
    enviarTelaCalcParkland: enviarTelaCalcParkland,
    tratarCallbackUXCalc: tratarCallbackUXCalc,
    enviarRotinaBot: enviarRotinaBot,
    mostrarPainelLeitos: mostrarPainelLeitos,
    enviarPainelEnfermaria: enviarPainelEnfermaria,
    processarAcaoLeito: processarAcaoLeito,
    tratarCallbackEnfSBAR: tratarCallbackEnfSBAR,
    enviarTelaEnfSBAR: enviarTelaEnfSBAR,
    uxTelaLeito: uxTelaLeito,
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
    enviarMenuUXGinecoObstetricia: enviarMenuUXGinecoObstetricia,
    tratarCallbackUXGO: tratarCallbackUXGO,
    tratarCallbackGinecoObstetricia: tratarCallbackGinecoObstetricia,
    enviarTelaGOPrenatal: enviarTelaGOPrenatal,
    tratarCallbackGOPrenatal: tratarCallbackGOPrenatal,
    enviarTelaGOParto: enviarTelaGOParto,
    tratarCallbackGOParto: tratarCallbackGOParto,
    enviarTelaGOHpp: enviarTelaGOHpp,
    tratarCallbackGOHpp: tratarCallbackGOHpp,
    enviarTelaGOMgso4: enviarTelaGOMgso4,
    tratarCallbackGOMgso4: tratarCallbackGOMgso4,
    enviarTelaGOPrematuridade: enviarTelaGOPrematuridade,
    tratarCallbackGOPrematuridade: tratarCallbackGOPrematuridade,
    enviarTelaGOToxo: enviarTelaGOToxo,
    tratarCallbackGOToxo: tratarCallbackGOToxo,
    enviarTelaGOCorrimento: enviarTelaGOCorrimento,
    tratarCallbackGOCorrimento: tratarCallbackGOCorrimento,
    enviarTelaGOPreventivo: enviarTelaGOPreventivo,
    tratarCallbackGOPreventivo: tratarCallbackGOPreventivo,
    enviarTelaGOAnticoncepcao: enviarTelaGOAnticoncepcao,
    tratarCallbackGOAnticoncepcao: tratarCallbackGOAnticoncepcao,
    enviarTelaGODip: enviarTelaGODip,
    tratarCallbackGODip: tratarCallbackGODip,
    enviarMenuEmergDengue: enviarMenuEmergDengue,
    enviarMenuEmergCriseHas: enviarMenuEmergCriseHas,
    enviarMenuEmergGlasgow: enviarMenuEmergGlasgow,
    enviarMenuEmergChoque: enviarMenuEmergChoque,
    enviarMenuEmergCefaleia: enviarMenuEmergCefaleia,
    tratarEntradaUX: tratarEntradaUX,
    tratarCallbackUX: tratarCallbackUX,
    enviarMenuDiluicao: enviarMenuDiluicao,
    tratarCallbackDiluicao: tratarCallbackDiluicao,
    enviarMenuPacotesSindromicos: enviarMenuPacotesSindromicos,
    tratarCallbackPacotes: tratarCallbackPacotes,
    enviarMenuChecklistClinico: enviarMenuChecklistClinico,
    tratarCallbackChecklist: tratarCallbackChecklist,
    enviarMenuTimeBlocking: enviarMenuTimeBlocking,
    tratarCallbackTimeBlocking: tratarCallbackTimeBlocking,
    enviarTelaOnboardingNome: enviarTelaOnboardingNome,
    enviarMenuPerfilClinico: enviarMenuPerfilClinico,
    enviarMenuPapelProfissional: enviarMenuPapelProfissional,
    enviarMenuCenarioECheckboxes: enviarMenuCenarioECheckboxes,
    enviarMenuCidadeERemume: enviarMenuCidadeERemume,
    enviarPainelAdminRemume: enviarPainelAdminRemume,
    enviarTelaUnidadeSaude: enviarTelaUnidadeSaude,
    tratarCallbackPerfilClinico: tratarCallbackPerfilClinico,
    tratarCallbackCenarioModulos: tratarCallbackCenarioModulos,
    tratarCallbackCidadeRemume: tratarCallbackCidadeRemume,
    tratarCallbackSolicitarOuImportarRemume: tratarCallbackSolicitarOuImportarRemume,
    processarEntradaSoap: typeof processarEntradaSoap === 'function' ? processarEntradaSoap : (typeof SoapAmbulatorialService !== 'undefined' && SoapAmbulatorialService.processarEntradaSoap ? SoapAmbulatorialService.processarEntradaSoap : null),
    formatarRascunhoSoapTelegram: typeof formatarRascunhoSoapTelegram === 'function' ? formatarRascunhoSoapTelegram : (typeof SoapAmbulatorialService !== 'undefined' && SoapAmbulatorialService.formatarRascunhoSoapTelegram ? SoapAmbulatorialService.formatarRascunhoSoapTelegram : null),
    extrairPlanoDeTextoSoap: extrairPlanoDeTextoSoap,
    executarExtracaoReceitaSoap: executarExtracaoReceitaSoap
  };
}
