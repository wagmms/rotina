/**
 * ==============================================================================
 * MÓDULO 07C: TELEGRAM CONSULTAS RÁPIDAS & INTEGRAÇÃO DE IA
 * ==============================================================================
 * Validação de receitas médicas, guias de exame físico, consultas posológicas
 * de bolso (HSL / PedB) e orquestração de IA generativa clínica beira-leito.
 * ==============================================================================
 */

var _cacheNomesFarmacosParaValidacao = null;
function nomesFarmacosParaValidacao() {
  if (_cacheNomesFarmacosParaValidacao !== null && _cacheNomesFarmacosParaValidacao.length > 0) {
    return _cacheNomesFarmacosParaValidacao;
  }
  var nomes = [];
  function adicionar(x) {
    var n = (typeof normalizarTexto === "function" ? normalizarTexto(String(x || "").split(/\d/)[0]) : String(x || "").split(/\d/)[0].toLowerCase()).replace(/\s+/g, " ").trim();
    if (n.length >= 3 && nomes.indexOf(n) < 0) nomes.push(n);
  }
  if (typeof DICIONARIO_FARMACO !== "undefined") Object.keys(DICIONARIO_FARMACO).forEach(function(k) {
    adicionar(k); adicionar(DICIONARIO_FARMACO[k]);
  });
  if (typeof MAPA_SINDROMES_APS !== "undefined") Object.keys(MAPA_SINDROMES_APS).forEach(function(k) {
    MAPA_SINDROMES_APS[k].forEach(adicionar);
  });
  // Itens canônicos da REMUME Municipal / RENAME SUS ativa (CSV / RAM)
  if (typeof obterItensRemumeRP === "function") {
    try {
      obterItensRemumeRP().forEach(adicionar);
    } catch (_) {}
  }
  // Reutiliza a mesma base integral L1; se necessário, lê L2 em lote sem abrir Sheets.
  if (typeof lerPlanilhaEmCache === "function") {
    try {
      var base = lerPlanilhaEmCache("remume", ConfigService.get("SPREADSHEET_ID_REMUME"), false);
      if (base !== null) base.split("\n").forEach(adicionar);
    } catch (_) {}
  }
  _cacheNomesFarmacosParaValidacao = nomes;
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
 * Normaliza o nome do fármaco para exibição limpa em receitas (sem termos redundantes de sais).
 */
function normalizarNomeFarmacoSimples(nome) {
  if (!nome) return "Medicamento";
  var limpo = String(nome).replace(/\([A-Z]\)/g, "").trim();
  if (limpo.indexOf("+") !== -1) {
    var partes = limpo.split("+").map(function(p) {
      return normalizarNomeFarmacoSimples(p.trim());
    });
    return partes.join(" + ");
  }
  var regexSais = /\b(cloridrato|s[oó]dica?|pot[aá]ssica?|maleato|besilato|hemi[- ]?hidratad[oa]|sulfato|succinato|tartarato|fosfato|acetato|dipropionato|valerato|fumarato|bromidrato|citrato)\b/gi;
  var semSais = limpo.replace(regexSais, "").replace(/\s+/g, " ").trim();
  return semSais.toLowerCase().split(" ").map(function(p) {
    return p.charAt(0).toUpperCase() + p.slice(1);
  }).join(" ").trim() || limpo;
}

/**
 * Gera ou extrai posologia ambulatorial padrão e segura com via e frequência explícitas.
 */
function extrairOuGerarPosologiaPadraoHSL(farmaco, doseAdultoTexto) {
  var fNorm = (typeof normalizarTexto === "function") ? normalizarTexto(farmaco || "") : String(farmaco || "").toLowerCase();
  var MAPA_POSOLOGIA_PADRAO = {
    dipirona: "Tomar 1 comprimido via oral de 6 em 6 horas se dor ou febre.",
    paracetamol: "Tomar 1 comprimido via oral de 6 em 6 horas se dor ou febre.",
    amoxicilina: "Tomar 1 cápsula via oral de 8 em 8 horas por 7 dias.",
    losartana: "Tomar 1 comprimido via oral 1x ao dia pela manhã.",
    metformina: "Tomar 1 comprimido via oral de 12 em 12 horas após as refeições.",
    omeprazol: "Tomar 1 cápsula via oral 1x ao dia em jejum pela manhã.",
    ibuprofeno: "Tomar 1 comprimido via oral de 8 em 8 horas se dor ou inflamação.",
    enalapril: "Tomar 1 comprimido via oral de 12 em 12 horas.",
    anlodipino: "Tomar 1 comprimido via oral 1x ao dia.",
    hidroclorotiazida: "Tomar 1 comprimido via oral 1x ao dia pela manhã.",
    azitromicina: "Tomar 1 comprimido via oral 1x ao dia por 5 dias.",
    cefalexina: "Tomar 1 comprimido via oral de 6 em 6 horas por 7 dias.",
    ciprofloxacino: "Tomar 1 comprimido via oral de 12 em 12 horas por 7 dias.",
    sulfametoxazol: "Tomar 1 comprimido via oral de 12 em 12 horas por 5 dias.",
    prednisona: "Tomar 1 comprimido via oral 1x ao dia pela manhã por 5 dias.",
    prednisolona: "Tomar 1 comprimido via oral 1x ao dia pela manhã por 5 dias.",
    clonazepam: "Tomar 1 comprimido via oral à noite ao deitar.",
    fluoxetina: "Tomar 1 cápsula via oral 1x ao dia pela manhã.",
    sertralina: "Tomar 1 comprimido via oral 1x ao dia pela manhã.",
    sinvastatina: "Tomar 1 comprimido via oral 1x ao dia à noite.",
    furosemida: "Tomar 1 comprimido via oral 1x ao dia pela manhã.",
    atenolol: "Tomar 1 comprimido via oral 1x ao dia pela manhã."
  };

  for (var k in MAPA_POSOLOGIA_PADRAO) {
    if (fNorm.indexOf(k) !== -1) {
      return MAPA_POSOLOGIA_PADRAO[k];
    }
  }

  var txt = String(doseAdultoTexto || "").toLowerCase();
  if (/12\/12|12 em 12/.test(txt)) return "Tomar 1 comprimido via oral de 12 em 12 horas.";
  if (/8\/8|8 em 8/.test(txt)) return "Tomar 1 comprimido via oral de 8 em 8 horas.";
  if (/6\/6|6 em 6/.test(txt)) return "Tomar 1 comprimido via oral de 6 em 6 horas se dor ou febre.";
  if (/24\/24|1x|1 vez|ao dia|diari/.test(txt)) return "Tomar 1 comprimido via oral 1x ao dia.";

  return "Tomar 1 comprimido via oral 1x ao dia conforme prescrição médica.";
}

/**
 * Monta e persiste rascunho de receita oficial e bloco SOAP ambulatorial pronto para copiar no PEP.
 */
function montarRascunhoRxESoapAmbulatorial(params) {
  params = params || {};
  var farmaco = params.farmaco || "Medicamento";
  var apres = params.apresentacao || "Dose padrão";
  var nomeLinhaItem = farmaco;
  if (apres && apres.toLowerCase().indexOf(farmaco.toLowerCase()) === 0) {
    nomeLinhaItem = apres;
  } else if (apres) {
    nomeLinhaItem = farmaco + " " + apres;
  }
  var qtd = params.quantidade || "1 frasco / caixa";
  var posologia = params.posologia || "Tomar 1 comprimido via oral 1x ao dia.";
  var linhaPoso = String(posologia || "").trim();
  if (!/^(?:posologia|modo de usar)\s*:/i.test(linhaPoso)) {
    linhaPoso = "Posologia: " + linhaPoso;
  }
  var orientacoes = params.orientacoes || "Seguir orientações médicas e manter hidratação.";
  var remume = params.remumeInfo || { presente: false, apresentacoes: [] };
  var clinico = params.dadosClinicos || {};

  var tz = (typeof ConfigService !== "undefined" && typeof ConfigService.get === "function")
    ? ConfigService.get("TIMEZONE", "America/Sao_Paulo")
    : "America/Sao_Paulo";
  var dataHoje = (typeof Utilities !== "undefined" && typeof Utilities.formatDate === "function")
    ? Utilities.formatDate(new Date(), tz, "dd/MM/yyyy")
    : new Date().toLocaleDateString("pt-BR");

  // Rascunho formatado para aprovação estrita em validarReceitaTemMedicamentos
  var textoRx = [
    "📋 RECEITUÁRIO MÉDICO AMBULATORIAL",
    "Paciente: Ao Portador",
    "Data: " + dataHoje,
    "",
    "[USO ORAL]",
    "1. " + nomeLinhaItem + " --- " + qtd,
    "   " + linhaPoso,
    "",
    "Orientações:",
    "• " + orientacoes
  ].join("\n");

  var linhasPlano = [
    "💊 Prescrição Medicamentosa (USF):",
    "1) " + nomeLinhaItem + " --- " + qtd,
    "   " + linhaPoso
  ];
  var seloRede = remume.selo || "REMUME";
  var nomeRede = remume.rede || "Rede Municipal / RENAME SUS";
  if (remume.presente) {
    linhasPlano.push("🏛️ Status SUS: 🟢 [" + seloRede + "] Padronizado na Rede (" + nomeRede + ").");
    if (remume.apresentacoes && remume.apresentacoes.length > 1) {
      linhasPlano.push("   (Apresentações padronizadas na rede: " + remume.apresentacoes.slice(0, 3).join(", ") + ")");
    }
  } else {
    linhasPlano.push("🏛️ Status SUS: ⚪ [NÃO-REMUME] Medicamento não padronizado na rede municipal.");
  }
  linhasPlano.push("🥗 Orientações: " + orientacoes);
  linhasPlano.push("🚨 Sinais de Alarme: Retornar à UBS ou procurar Pronto Atendimento se piora clínica ou persistência dos sintomas.");

  var subTexto = "Paciente atendido em consulta ambulatorial da USF para avaliação clínica e conduta com " + farmaco + ".";
  if (clinico.pesoKg) subTexto += " Peso informado: " + clinico.pesoKg + " kg.";
  if (clinico.idadeAnos) subTexto += " Idade informada: " + clinico.idadeAnos + " anos.";

  var textoSoap = [
    "🩺 SÍNTESE SOAP · ATENDIMENTO AMBULATORIAL (USF)",
    "",
    "👤 S - Subjetivo",
    subTexto,
    "",
    "🔍 O - Objetivo",
    "Bom estado geral (BEG), hidratado, corado, acianótico, anictérico, afebril ao toque, eupneico em ar ambiente. Sinais vitais estáveis.",
    "",
    "🧠 A - Avaliação",
    "Conduta terapêutica e prescrição ambulatorial de " + farmaco + " (Atenção Primária à Saúde).",
    "",
    "📋 P - Plano",
    linhasPlano.join("\n")
  ].join("\n");

  var ckRx = (typeof Utilities !== "undefined" && typeof Utilities.getUuid === "function")
    ? Utilities.getUuid().replace(/-/g, "")
    : ("rx" + Math.random().toString(36).substring(2) + Date.now().toString(36)).substring(0, 32);

  var ckSoap = (typeof Utilities !== "undefined" && typeof Utilities.getUuid === "function")
    ? Utilities.getUuid().replace(/-/g, "")
    : ("sp" + Math.random().toString(36).substring(2) + Date.now().toString(36)).substring(0, 32);

  var cache = (typeof CacheService !== "undefined" && typeof CacheService.getScriptCache === "function")
    ? CacheService.getScriptCache()
    : null;

  if (cache) {
    if (typeof safePutCache === "function") {
      safePutCache(cache, ckRx, textoRx, 21600);
      safePutCache(cache, ckSoap, textoSoap, 21600);
    } else if (typeof cache.put === "function") {
      cache.put(ckRx, textoRx, 21600);
      cache.put(ckSoap, textoSoap, 21600);
    }
  }

  return {
    textoRx: textoRx,
    textoSoap: textoSoap,
    ckRx: ckRx,
    ckSoap: ckSoap
  };
}

/**
 * Responde à consulta direta de posologia oficial utilizando o Guia Farmacêutico do HSL
 * com cálculo determinístico de fórmulas fixas para doses pediátricas.
 */
function formatarMensagemCalculoPediatrico_(calcPed) {
  var remumeInfo = (typeof consultarRemumeRP === "function")
    ? consultarRemumeRP(calcPed.chave || calcPed.farmaco)
    : { presente: false, apresentacoes: [] };

  var seloRemume = remumeInfo.presente ? " 🟢 [REMUME-RP]" : "";

  var txtPed = [
    "👶 *CÁLCULO POSOLÓGICO PEDIÁTRICO DETERMINÍSTICO (FÓRMULA FIXA)*",
    "",
    "📋 *Fármaco:* *" + calcPed.farmaco + "*",
    "📦 *Apresentação (REMUME/HSL):* `" + calcPed.apresentacao + "`" + seloRemume,
    "⚖️ *Peso Informado:* " + (calcPed.pesoKg == null ? "Não informado (não utilizado no cálculo)." : "`" + calcPed.pesoKg + " kg`"),
    calcPed.idadeAnos == null ? "" : "*Idade informada:* " + calcPed.idadeAnos + " anos",
    "",
    "💊 *ESQUEMA CALCULADO PARA REVISÃO:*",
    "👉 *" + calcPed.instrucaoPosologica + "*",
    "📦 *Quantidade a Dispensar:* *" + calcPed.quantidadeDispensar + "*",
    "",
    "🧮 *Memória de Cálculo Matemática:*",
    "_" + calcPed.memoriaCalculo + "_",
    "",
    "💡 *Orientações:* " + calcPed.orientacoes,
    "",
    "*Conferência:* Validar indicação, apresentação, dose, duração, alergias e ajustes antes de prescrever. O cálculo não substitui a avaliação clínica."
  ].join("\n");

  var posoFormatada = calcPed.instrucaoPosologica || "";
  if (!/\bvia oral\b/i.test(posoFormatada)) {
    posoFormatada = posoFormatada.replace(/^Tomar\s+/i, "Tomar via oral ");
  }
  posoFormatada = posoFormatada.replace(/a cada (\d+) horas/i, "de $1 em $1 horas");

  var rascunho = montarRascunhoRxESoapAmbulatorial({
    farmaco: calcPed.farmaco,
    apresentacao: calcPed.apresentacao,
    posologia: posoFormatada,
    quantidade: calcPed.quantidadeDispensar,
    orientacoes: calcPed.orientacoes,
    remumeInfo: remumeInfo,
    dadosClinicos: { pesoKg: calcPed.pesoKg, idadeAnos: calcPed.idadeAnos }
  });

  var cbParam = (calcPed.chave + (calcPed.pesoKg == null ? "" : " " + calcPed.pesoKg + "kg") + (calcPed.idadeAnos == null ? "" : " " + calcPed.idadeAnos + " anos")).substring(0, 30);
  var kbPed = {
    "inline_keyboard": [
      [
        { "text": "📄 Gerar PDF da Receita", "callback_data": "gerarPdfRx_" + rascunho.ckRx },
        { "text": "📋 Copiar SOAP p/ PEP", "callback_data": "ux:copiar:" + rascunho.ckSoap }
      ],
      [
        { "text": "📝 Revisar no /rx", "callback_data": "rx_med:" + cbParam }
      ]
    ]
  };
  return { texto: txtPed, teclado: kbPed };
}

function enviarMensagemMedicamentoNaoEncontrado_(chatId, termo) {
  return enviarMensagemParaChat(
    chatId,
    "🔍 *MEDICAMENTO NÃO ENCONTRADO*\n\n" +
    "Não encontramos registro exato para `\"" + termo + "\"` nos guias oficiais (HSL e PedBook).\n\n" +
    "💡 *Dicas:*\n" +
    "• Busque pelo princípio ativo genérico (ex: `/dose amoxicilina`, `/dose dipirona`, `/ped azitromicina`).\n" +
    "• Se for caso infantil, informe o peso: `/dose amoxicilina 16kg` ou consulte `/ped amoxicilina`.\n" +
    "• Ou utilize o gerador de receita `/rx " + termo + "` para avaliação clínica completa."
  );
}

function responderConsultaPosologiaHSL(chatId, termo) {
  // 1. Se informou peso, calcula determinísticamente em código puro (Zero Alucinação)
  var calcPed = (typeof CalculadorasClinicas !== "undefined" && typeof CalculadorasClinicas.calcularPosologiaPorTextoLivre === "function")
    ? CalculadorasClinicas.calcularPosologiaPorTextoLivre(termo)
    : null;

  if (calcPed) {
    var resultadoPed = formatarMensagemCalculoPediatrico_(calcPed);
    return enviarMensagemComTecladoParaChat(chatId, resultadoPed.texto, resultadoPed.teclado);
  }

  // 2. Se a busca tiver indicação explícita pediátrica, consulta primariamente o PedBook
  var ehBuscaPediatrica = /(\bkg\b|\bquilo|\bmeses\b|\bmes\b|\banos\b|\bano\b|crian|pediat|lactente|gotas|suspens)/i.test(termo);
  var medPed = (typeof buscarMedicamentoPediatricoPedB === "function") ? buscarMedicamentoPediatricoPedB(termo) : null;

  if (ehBuscaPediatrica && medPed) {
    return responderConsultaPediatricaPedB(chatId, termo);
  }

  // 3. Consulta da ficha técnica oficial do Guia HSL
  var med = (typeof buscarMedicamentoNoHSL === "function") ? buscarMedicamentoNoHSL(termo) : null;
  if (!med) {
    if (medPed) {
      return responderConsultaPediatricaPedB(chatId, termo);
    }
    return enviarMensagemMedicamentoNaoEncontrado_(chatId, termo);
  }

  var remumeInfo = (typeof consultarRemumeRP === "function")
    ? consultarRemumeRP(med.farnaco, med)
    : { presente: !!med.na_remume, apresentacoes: med.apresentacoes_remume || [] };

  var nomeSimples = normalizarNomeFarmacoSimples(med.farnaco);
  var apresentacaoUso = (remumeInfo.presente && remumeInfo.apresentacoes && remumeInfo.apresentacoes.length > 0)
    ? remumeInfo.apresentacoes[0]
    : ((med.apresentacoes_hsl && med.apresentacoes_hsl.length > 0) ? med.apresentacoes_hsl[0] : "Dose padrão");

  var posologiaPadrao = extrairOuGerarPosologiaPadraoHSL(med.farnaco, med.dose_adulto);

  var rascunho = montarRascunhoRxESoapAmbulatorial({
    farmaco: nomeSimples,
    apresentacao: apresentacaoUso,
    posologia: posologiaPadrao,
    quantidade: "1 caixa / frasco",
    orientacoes: med.administracao ? med.administracao.substring(0, 140) : "Tomar com água conforme prescrito.",
    remumeInfo: remumeInfo
  });

  var respostaTexto = (typeof formatarFichaPosologicaHSL === "function")
    ? formatarFichaPosologicaHSL(med)
    : "Ficha posológica indisponível.";

  var rotuloPrescrever = "💊 Prescrever (" + (med.farnaco.length > 12 ? med.farnaco.substring(0, 12) + "..." : med.farnaco) + ")";
  var botoes = [
    [
      { "text": "📄 Gerar PDF da Receita", "callback_data": "gerarPdfRx_" + rascunho.ckRx },
      { "text": "📋 Copiar SOAP p/ PEP", "callback_data": "ux:copiar:" + rascunho.ckSoap }
    ],
    [{ "text": rotuloPrescrever, "callback_data": "rx_med:" + med.farnaco.substring(0, 30) }]
  ];
  if (medPed) {
    botoes.push([{ "text": "👶 Doses PedBook", "callback_data": "ped_med:" + medPed.nome.substring(0, 30) }]);
  }
  botoes.push([
    { "text": "🔙 Consultas", "callback_data": "ux:hub:bolso" },
    { "text": "🏠 Início", "callback_data": "ux:hub:inicio" }
  ]);

  return enviarMensagemComTecladoParaChat(chatId, respostaTexto, { "inline_keyboard": botoes });
}

/**
 * Responde à consulta de doses pediátricas e apresentações do PedBook (pedb.com.br).
 */
function responderConsultaPediatricaPedB(chatId, termo) {
  var medPed = (typeof buscarMedicamentoPediatricoPedB === "function") ? buscarMedicamentoPediatricoPedB(termo) : null;
  if (!medPed && termo && termo.indexOf(" ") !== -1) {
    var primeiroTermo = termo.split(/\s+/)[0];
    medPed = (typeof buscarMedicamentoPediatricoPedB === "function") ? buscarMedicamentoPediatricoPedB(primeiroTermo) : null;
  }
  if (!medPed) {
    // Se não encontrou medicamento, verifica se é uma conduta clínica pediátrica
    var cond = (typeof buscarCondutaPediatricaPedB === "function") ? buscarCondutaPediatricaPedB(termo) : null;
    if (cond) {
      return responderConsultaCondutaPedB(chatId, termo);
    }
    var kbNaoEnc = {
      inline_keyboard: [
        [
          { text: "💊 REMUME UBS", callback_data: "ux:amb:remume" },
          { text: "🔙 Consultas", callback_data: "ux:hub:bolso" }
        ],
        [
          { text: "🏠 Início", callback_data: "ux:hub:inicio" }
        ]
      ]
    };
    return enviarMensagemComTecladoParaChat(
      chatId,
      "🔍 *MEDICAMENTO PEDIÁTRICO NÃO ENCONTRADO NO PEDBOOK*\n\n" +
      "Não encontramos ficha pediátrica específica para `\"" + termo + "\"` no PedBook.\n\n" +
      "💡 *Dicas:*\n" +
      "• Busque pelo princípio ativo (ex: `/ped amoxicilina`, `/ped dipirona`, `/ped prednisolona`).\n" +
      "• Ou busque condutas: `/conduta_ped bronquiolite` ou `/conduta_ped crup`.\n" +
      "• Para posologia geral ou adulto, utilize `/dose " + termo + "`.",
      kbNaoEnc
    );
  }

  var remumeInfo = (typeof consultarRemumeRP === "function")
    ? consultarRemumeRP(medPed.nome, medPed)
    : { presente: !!medPed.na_remume, apresentacoes: medPed.apresentacoes_remume || [] };

  var apresPed = (medPed.apresentacoes && medPed.apresentacoes.length > 0)
    ? (medPed.apresentacoes[0].forma + (medPed.apresentacoes[0].concentracao ? " " + medPed.apresentacoes[0].concentracao : ""))
    : ((remumeInfo.apresentacoes && remumeInfo.apresentacoes.length > 0) ? remumeInfo.apresentacoes[0] : "Suspensão oral");

  var rascunhoPed = montarRascunhoRxESoapAmbulatorial({
    farmaco: medPed.nome,
    apresentacao: apresPed,
    posologia: "Tomar via oral de 8 em 8 horas conforme posologia pediátrica por peso.",
    quantidade: "1 frasco",
    orientacoes: "Agitar bem antes de usar e manter hidratação oral.",
    remumeInfo: remumeInfo
  });

  var respostaTexto = (typeof formatarFichaPediatricaPedB === "function")
    ? formatarFichaPediatricaPedB(medPed)
    : "Ficha pediátrica indisponível.";

  var botoes = [
    [
      { "text": "📄 Gerar PDF da Receita", "callback_data": "gerarPdfRx_" + rascunhoPed.ckRx },
      { "text": "📋 Copiar SOAP p/ PEP", "callback_data": "ux:copiar:" + rascunhoPed.ckSoap }
    ],
    [{ "text": "💊 Prescrever (" + (medPed.nome.length > 12 ? medPed.nome.substring(0, 12) + "..." : medPed.nome) + ")", "callback_data": "rx_med:" + medPed.nome.substring(0, 30) }]
  ];

  var medHsl = (typeof buscarMedicamentoNoHSL === "function") ? buscarMedicamentoNoHSL(medPed.nome) : null;
  if (medHsl) {
    botoes.push([{ "text": "🏢 Doses Adulto (HSL)", "callback_data": "hsl_med:" + medHsl.farnaco.substring(0, 30) }]);
  }
  botoes.push([
    { "text": "🔙 Consultas", "callback_data": "ux:hub:bolso" },
    { "text": "🏠 Início", "callback_data": "ux:hub:inicio" }
  ]);

  var kb = { "inline_keyboard": botoes };
  return enviarMensagemComTecladoParaChat(chatId, respostaTexto, kb);
}

/**
 * Responde à consulta de condutas e manejos pediátricos oficiais do PedBook.
 */
function responderConsultaCondutaPedB(chatId, termo) {
  var kbRetornoPed = {
    inline_keyboard: [
      [
        { text: "👶 Menu Pediátrico", callback_data: "ux:bolso:ped" },
        { text: "🔙 Consultas", callback_data: "ux:hub:bolso" }
      ],
      [
        { text: "🏠 Início", callback_data: "ux:hub:inicio" }
      ]
    ]
  };
  var cond = (typeof buscarCondutaPediatricaPedB === "function") ? buscarCondutaPediatricaPedB(termo) : null;
  if (!cond) {
    return enviarMensagemComTecladoParaChat(
      chatId,
      "🔍 *CONDUTA PEDIÁTRICA NÃO ENCONTRADA*\n\n" +
      "Não encontramos protocolo específico para `\"" + termo + "\"` no PedBook.\n\n" +
      "💡 *Exemplos de condutas disponíveis:*\n" +
      "• `/conduta_ped bronquiolite`\n" +
      "• `/conduta_ped crup` ou `/conduta_ped laringite`\n" +
      "• `/conduta_ped asma`\n" +
      "• `/conduta_ped convulsao febril`\n" +
      "• `/conduta_ped anafilaxia`",
      kbRetornoPed
    );
  }
  var txt = (typeof formatarResumoCondutaPedB === "function") ? formatarResumoCondutaPedB(cond) : "Conduta indisponível.";
  return enviarMensagemComTecladoParaChat(chatId, txt, kbRetornoPed);
}

function executarFastAckTelegram_(chatId, messageIdParaEditar) {
  if (messageIdParaEditar || typeof UrlFetchApp === "undefined") return messageIdParaEditar;
  try {
    var tokenBot = ConfigService.get("TELEGRAM_BOT_TOKEN");
    if (!tokenBot) return messageIdParaEditar;
    var payloadTemp = { chat_id: String(chatId), text: "⚡ Analisando caso clínico...", parse_mode: "Markdown" };
    var optionsTemp = { method: "post", contentType: "application/json", payload: JSON.stringify(payloadTemp), muteHttpExceptions: true };
    var resTemp = UrlFetchApp.fetch("https://api.telegram.org/bot" + tokenBot + "/sendMessage", optionsTemp);
    if (resTemp.getResponseCode() === 200) {
      var jsonTemp = JSON.parse(resTemp.getContentText());
      if (jsonTemp && jsonTemp.result && jsonTemp.result.message_id) {
        return jsonTemp.result.message_id;
      }
    }
  } catch (e) {
    console.error("Erro no Fast-Ack: " + e.message);
  }
  return messageIdParaEditar;
}

function montarLinhaPrimariaCopiar_(tipoCache, cacheKey, strResultado) {
  var limpo = typeof uxTextoProntuario === "function" ? uxTextoProntuario(strResultado) : strResultado.trim();
  var textoCopiarBtn = (tipoCache === "soap") ? "📋 Copiar SOAP para PEP" : "📋 Copiar para Prontuário";
  if (limpo.length >= 1 && limpo.length <= 256) {
    return [{ "text": textoCopiarBtn, "copy_text": { "text": limpo } }];
  }
  return [{ "text": textoCopiarBtn, "callback_data": "ux:copiar:" + cacheKey }];
}

function montarBotoesSoap_(chatId, cacheKey, strResultado, ehErro, linhaPrimaria) {
  var botoes = [linhaPrimaria];
  if (ehErro) return botoes;

  var ehSoapFechado = /🧠\s*\*A\s*-/i.test(strResultado);
  if (!ehSoapFechado) {
    // FASE 1: Rascunho com Anamnese e Exame Físico (sem botões prematuros de ajuste farmacológico)
    botoes.push([
      { "text": "📋 Fechar Plano", "callback_data": "ux:soap:plano" },
      { "text": "🩺 EF Normal", "callback_data": "ux:soap:ef_normal" }
    ]);
    botoes.push([
      { "text": "🔬 Exames", "callback_data": "ef_menu" },
      { "text": "🧹 Novo Paciente", "callback_data": "ux:novo:soap" }
    ]);
  } else {
    // FASE 2: SOAP Consolidado completo (com plano farmacológico ativo)
    botoes.push([
      { "text": "🔄 Recalcular por Peso", "callback_data": "ux:recalc:peso:" + cacheKey },
      { "text": "⚠️ Ver Interações", "callback_data": "ux:interacao:caso:" + cacheKey }
    ]);
    botoes.push([
      { "text": "💊 Extrair Receita", "callback_data": "ux:soap:extrair_rx:" + cacheKey },
      { "text": "🔄 Refinar Conduta", "callback_data": "ux:soap:atualizar" }
    ]);
    if (ehUsuarioTitular(chatId)) {
      var linhaNotion = [{ "text": "📁 Salvar Caso", "callback_data": "salvarNotion_soap_" + cacheKey }];
      if (/IG:|DUM:|DPP:|obstetrícia/i.test(strResultado)) {
        linhaNotion.unshift({ "text": "🤰 Cartão Gestante", "callback_data": "salvarNotion_prenatal_" + cacheKey });
      }
      botoes.push(linhaNotion);
    }
    botoes.push([
      { "text": "🧹 Novo Paciente", "callback_data": "ux:novo:soap" }
    ]);
  }

  botoes.push([
    { "text": "🔙 Ambulatório", "callback_data": "ux:hub:amb" },
    { "text": "🏠 Início", "callback_data": "ux:hub:inicio" }
  ]);
  return botoes;
}

function montarBotoesNavegacaoGeral_(tipoCache) {
  if (tipoCache === "rxh" || tipoCache === "plantao") {
    return [{ "text": "🔙 Enfermaria", "callback_data": "ux:hub:enf" }, { "text": "🏠 Início", "callback_data": "ux:hub:inicio" }];
  }
  if (tipoCache === "conduta") {
    return [{ "text": "🔙 Sala Vermelha", "callback_data": "ux:sala" }, { "text": "🏠 Início", "callback_data": "ux:hub:inicio" }];
  }
  if (tipoCache === "rx") {
    return [
      { "text": "🔙 Ambulatório", "callback_data": "ux:hub:amb" },
      { "text": "🔙 Voltar ao Menu", "callback_data": "ux:menu" },
      { "text": "🏠 Início", "callback_data": "ux:hub:inicio" }
    ];
  }
  return [{ "text": "🔙 Voltar ao Menu", "callback_data": "ux:menu" }, { "text": "🏠 Início", "callback_data": "ux:hub:inicio" }];
}

function montarBotoesGeraisIA_(chatId, tipoCache, cacheKey, strResultado, ehErro, linhaPrimaria) {
  var botoes = [linhaPrimaria];

  if ((tipoCache === "rx" || tipoCache === "rxh" || tipoCache === "conduta") && !ehErro) {
    botoes.push([
      { "text": "🔄 Recalcular por Peso", "callback_data": "ux:recalc:peso:" + cacheKey },
      { "text": "⚠️ Ver Interações", "callback_data": "ux:interacao:caso:" + cacheKey }
    ]);
  }

  var ehIncompletoOuPendente = /⚠️\s*prescri[çc][ãa]o\s+incompleta|incomplet[ao]|pend[êe]ncia|informe\s+(?:o\s+)?(?:peso|alergia)|faltam?\s+(?:dados|informa)/i.test(strResultado);
  var temItensFarmacologicos = tipoCache === "rx" && validarReceitaTemMedicamentos(strResultado);
  var elegivelPdfRx = (tipoCache === "rx") && !ehErro && !ehIncompletoOuPendente && temItensFarmacologicos;

  var linhaSecundaria = [];
  if (elegivelPdfRx) {
    linhaSecundaria.push({ "text": "📄 Gerar PDF da Receita", "callback_data": "gerarPdfRx_" + cacheKey });
  } else if (tipoCache !== "rx" && !ehErro && ehUsuarioTitular(chatId)) {
    linhaSecundaria.push({ "text": "📁 Salvar no Notion", "callback_data": "salvarNotion_" + tipoCache + "_" + cacheKey });
  }

  if (tipoCache === "plantao" && !ehErro) {
    linhaSecundaria.push({ "text": "👨‍⚕️ Pitch do Round (60s)", "callback_data": "gerarRound_" + cacheKey });
  }
  if (linhaSecundaria.length) botoes.push(linhaSecundaria);

  botoes.push(montarBotoesNavegacaoGeral_(tipoCache));
  return botoes;
}

function aplicarRevisaoSoapBotoes_(botoes, chatId, origemSoap, dados) {
  var revFinal = (origemSoap && origemSoap.revision)
    ? origemSoap.revision
    : (modoBot(chatId) ? modoBot(chatId).revision : (dados ? definirModoBot(chatId, "soap", dados).revision : 'indisponivel'));
  botoes.forEach(function(linha) {
    linha.forEach(function(botao) {
      if (/^ux:soap:(plano|ef_normal|atualizar)$/.test(botao.callback_data || '')) {
        botao.callback_data += ':' + revFinal;
      }
    });
  });
}

function entregarMensagemFinalIA_(chatId, textoFinal, teclado, messageIdParaEditar) {
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
        "reply_markup": teclado
      };
      var editOk = executarPostTelegram(urlEdit, payloadEdit);
      if (editOk) return editOk;
    } catch (eEdit) {}
  }

  if (textoFinal.length <= 3900) {
    return enviarMensagemComTecladoParaChat(chatId, textoFinal, teclado);
  }
  return enviarMensagemSegmentada(chatId, textoFinal, teclado, messageIdParaEditar);
}

function processarEEntregarIA(chatId, funcaoGeradora, dados, tipoCache, messageIdParaEditar) {
  enviarChatAction(chatId, "typing", true);
  messageIdParaEditar = executarFastAckTelegram_(chatId, messageIdParaEditar);

  var origemSoap = tipoCache === "soap" ? modoBot(chatId) : null;
  var resultado = medirEtapaBot('geracao_clinica', function() { return funcaoGeradora(dados); });
  if (typeof renovarChatActionSeNecessario === "function") {
    renovarChatActionSeNecessario(chatId, "typing");
  }

  if (!resultado) {
    enviarMensagemParaChat(chatId, "⚠️ Erro ao processar a resposta com a IA.");
    return false;
  }

  var strResultado = String(resultado);
  if (tipoCache === "soap") salvarSoapCockpit_(chatId, origemSoap, strResultado);

  var cacheKey = Utilities.getUuid().replace(/-/g, "");
  safePutCache(CacheService.getScriptCache(), cacheKey, strResultado, 21600);

  var ehErro = /❌|não foi possível|falha ao|erro ao acessar|erro:/i.test(strResultado);
  var linhaPrimaria = montarLinhaPrimariaCopiar_(tipoCache, cacheKey, strResultado);

  var botoes = (tipoCache === "soap")
    ? montarBotoesSoap_(chatId, cacheKey, strResultado, ehErro, linhaPrimaria)
    : montarBotoesGeraisIA_(chatId, tipoCache, cacheKey, strResultado, ehErro, linhaPrimaria);

  if (tipoCache === "soap") {
    aplicarRevisaoSoapBotoes_(botoes, chatId, origemSoap, dados);
  }

  var teclado = { "inline_keyboard": botoes };
  var textoFinal = (tipoCache === "soap")
    ? strResultado
    : "*" + tipoCache.toUpperCase() + " · Resumo Clínico*\n\n" + strResultado;

  return entregarMensagemFinalIA_(chatId, textoFinal, teclado, messageIdParaEditar);
}

/**
 * Formata o protocolo clínico de emergência com destaque para diretrizes BR/Internacional,
 * pérolas TdC e alertas de segurança medicamentosa (ISMP Brasil).
 * @param {string} termo Termo ou hipótese clínica consultada
 * @return {string} Bloco formatado para Telegram ou string vazia
 */
function formatarBlocoProtocoloEmergenciaTelegram(termo) {
  if (typeof obterProtocoloClinico !== "function") return "";
  var prot = obterProtocoloClinico(termo);
  if (!prot) return "";

  var ancora = typeof obterAncoraSocraticaTdCEmergencia === "function"
    ? obterAncoraSocraticaTdCEmergencia(termo)
    : null;

  var linhas = [
    "🚨 *PROTOCOLO DE EMERGÊNCIA: " + prot.titulo.toUpperCase() + "*",
    "🇧🇷 *Diretriz BR:* " + prot.diretriz_brasileira,
    "🌐 *Diretriz Internacional:* " + prot.diretriz_internacional,
    "",
    "⚡ *Conduta Imediata:*",
    prot.conduta_imediata
  ];

  if (prot.divergencia) {
    linhas.push("");
    linhas.push("⚖️ *Nuances e Divergências (SUS vs Internacional):*");
    linhas.push(prot.divergencia);
  }

  if (ancora && ancora.perguntaSocratica) {
    linhas.push("");
    linhas.push("🧠 *Check-list do Preceptor (TdC):* _" + ancora.perguntaSocratica + "_");
  }

  return linhas.join("\n");
}

