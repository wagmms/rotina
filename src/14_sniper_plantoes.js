// ============================================================================
// MÓDULO 14: SNIPER DE PLANTÕES MÉDICOS (INTEGRADO À ABA ROTINA)
// Pipeline Multi-Estágio: Zero-Trust -> Filtro 0ms -> Extrator -> Trava Rotina -> Stealth PV
// ============================================================================

var PlantaoSniperService = (function () {
  var PROP_CONFIG_KEY = "SNIPER_PLANTOES_CONFIG_V1";
  var PROP_BLACKLIST_KEY = "SNIPER_PLANTOES_BLACKLIST_V1";
  var PROP_STATS_KEY = "SNIPER_PLANTOES_STATS_V1";
  var PROP_LOCKED_SLOTS_KEY = "SNIPER_PLANTOES_LOCKED_SLOTS_V1";
  var PROP_OFERTAS_CACHE_KEY = "SNIPER_PLANTOES_OFERTAS_MEM_V1";
  var PROP_HISTORICO_KEY = "SNIPER_PLANTOES_HISTORICO_V1";
  var PROP_ALLOWLIST_KEY = "SNIPER_PLANTOES_ALLOWLIST_V1";
  var PROP_PAIRING_STATE_KEY = "SNIPER_PLANTOES_PAIRING_V1";

  var DEFAULT_ALLOWLIST = [
    { jid: "120363011111111@g.us", nome: "Plantões Premium SP & ABC", permitido: true, modoGrupo: "SNIPER_AUTO" },
    { jid: "120363022222222@g.us", nome: "Plantões Grande SP", permitido: true, modoGrupo: "RADAR_ONLY" },
    { jid: "120363033333333@g.us", nome: "Família Moraes (Privado)", permitido: false, modoGrupo: "BLOQUEADO" },
    { jid: "120363044444444@g.us", nome: "Turma Medicina Internato", permitido: false, modoGrupo: "BLOQUEADO" }
  ];

  var DEFAULT_CONFIG = {
    nome: "Médico(a) Assistente",
    crm: "CRM/SP",
    telefoneWhatsApp: "5511999998888",
    modoOperacao: "SNIPER_AUTO", // "SNIPER_AUTO" ou "SEMI_AUTO"
    responderApenasPv: false,    // true = Modo Fantasma (só chama no PV do escalista)
    valorMinimo12h: 1300,
    valorMinimoHora: 108,
    cidadesPermitidas: [],       // Vazio = Sem restrição (definido pelos grupos autorizados na Allowlist)
    filtroCidadesAtivo: false,   // false = 100% das cidades dos grupos permitidos são aceitas
    setoresPermitidos: [
      "Porta",
      "Ficha Verde",
      "Clínica Médica",
      "Observação",
      "Enfermaria"
    ],
    autoAgendarRotina: true,
    exigirAllowlist: true
  };

  var DEFAULT_BLACKLIST = [
    { termo: "UPA Fantasma Sul", motivo: "Atraso recorrente > 60 dias relatado na comunidade" },
    { termo: "Cooperativa CaloteMed", motivo: "Inadimplência conhecida em plantões extras" },
    { termo: "Hospital Atraso Geral", motivo: "Histórico de glosa indevida de PJ" }
  ];

  var CATALOGO_CIDADES_PADRAO = [
    "São Paulo",
    "ABC",
    "Santo André",
    "São Bernardo",
    "São Caetano",
    "Diadema",
    "Mauá",
    "Osasco",
    "Guarulhos",
    "Barueri",
    "Cotia",
    "Taboão da Serra",
    "Mogi das Cruzes",
    "Santos",
    "Campinas",
    "Jundiaí",
    "Sorocaba",
    "Ribeirão Preto",
    "São José dos Campos"
  ];

  var CATALOGO_SETORES_PADRAO = [
    "Porta",
    "Ficha Verde",
    "Clínica Médica",
    "Observação",
    "Enfermaria",
    "Sala Vermelha",
    "UTI Adulto",
    "UTI Pediátrica",
    "Pediatria",
    "Ortopedia",
    "Ginecologia e Obstetrícia",
    "Cirurgia Geral",
    "Psiquiatria",
    "Anestesiologia",
    "Cardiologia"
  ];

  // --------------------------------------------------------------------------
  // Helpers de Persistência e Normalização
  // --------------------------------------------------------------------------
  function _lerJsonProp(chave, fallback) {
    try {
      var raw = PropertiesService.getScriptProperties().getProperty(chave);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed !== null && parsed !== undefined ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function _salvarJsonProp(chave, valor) {
    try {
      PropertiesService.getScriptProperties().setProperty(chave, JSON.stringify(valor));
      return true;
    } catch (e) {
      return false;
    }
  }

  function _normalizarTexto(str) {
    if (!str) return "";
    return String(str)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function _sanitizarTelefoneWhatsApp(rawInput) {
    if (!rawInput) return "";
    var limpo = String(rawInput)
      .split("@")[0]   // Remove @s.whatsapp.net ou @g.us
      .split(":")[0]   // Remove sufixo de device Baileys (:12, :0, etc.)
      .replace(/\D/g, "");

    if (!limpo) return "";

    // Remove prefixo 0 de operadora nacional (ex: 011988887777 -> 11988887777)
    if (limpo.length === 12 && limpo.charAt(0) === "0") {
      limpo = limpo.slice(1);
    }

    // Se tem 10 ou 11 dígitos (DDD + número brasileiro), adiciona DDI 55
    if (limpo.length === 10 || limpo.length === 11) {
      limpo = "55" + limpo;
    }

    // Valida formato brasileiro com DDI 55 (12 ou 13 dígitos)
    if (limpo.length >= 12 && limpo.length <= 13 && limpo.indexOf("55") === 0) {
      var ddd = parseInt(limpo.slice(2, 4), 10);
      if (ddd >= 11 && ddd <= 99) {
        return limpo;
      }
    }

    return "";
  }

  // --------------------------------------------------------------------------
  // Configuração do Sniper
  // --------------------------------------------------------------------------
  function obterConfigSniper() {
    var salvo = _lerJsonProp(PROP_CONFIG_KEY, null);
    if (!salvo || typeof salvo !== "object") {
      var inicial = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      _salvarJsonProp(PROP_CONFIG_KEY, inicial);
      return inicial;
    }
    var cfg = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    for (var k in salvo) {
      if (Object.prototype.hasOwnProperty.call(salvo, k)) {
        cfg[k] = salvo[k];
      }
    }
    if (Array.isArray(cfg.cidadesPermitidas) && cfg.cidadesPermitidas.length === 6 && cfg.cidadesPermitidas[0] === "São Paulo") {
      cfg.cidadesPermitidas = [];
      cfg.filtroCidadesAtivo = false;
      _salvarJsonProp(PROP_CONFIG_KEY, cfg);
    }
    if (!Array.isArray(cfg.setoresPermitidos)) {
      cfg.setoresPermitidos = DEFAULT_CONFIG.setoresPermitidos.slice();
    }
    cfg.valorMinimo12h = Number(cfg.valorMinimo12h) || 1300;
    cfg.valorMinimoHora = Math.round(cfg.valorMinimo12h / 12);
    return cfg;
  }

  function salvarConfigSniper(novaConfig) {
    var atual = obterConfigSniper();
    if (novaConfig && typeof novaConfig === "object") {
      for (var k in novaConfig) {
        if (Object.prototype.hasOwnProperty.call(novaConfig, k)) {
          atual[k] = novaConfig[k];
        }
      }
    }
    atual.valorMinimo12h = Number(atual.valorMinimo12h) || 1300;
    atual.valorMinimoHora = Math.round(atual.valorMinimo12h / 12);
    _salvarJsonProp(PROP_CONFIG_KEY, atual);
    return atual;
  }

  function redefinirConfigPadrao() {
    var padrao = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    _salvarJsonProp(PROP_CONFIG_KEY, padrao);
    return padrao;
  }

  // --------------------------------------------------------------------------
  // Catálogo e Gestão de Cidades e Setores Permitidos
  // --------------------------------------------------------------------------
  function obterCatalogoCidadesDisponiveis() {
    var cfg = obterConfigSniper();
    var ativas = Array.isArray(cfg.cidadesPermitidas) ? cfg.cidadesPermitidas : DEFAULT_CONFIG.cidadesPermitidas;
    var mapa = {};
    var lista = [];
    var i;

    for (i = 0; i < CATALOGO_CIDADES_PADRAO.length; i++) {
      var c = CATALOGO_CIDADES_PADRAO[i];
      var norm = _normalizarTexto(c);
      if (!mapa[norm]) {
        mapa[norm] = true;
        lista.push(c);
      }
    }

    for (i = 0; i < ativas.length; i++) {
      var a = ativas[i];
      var normA = _normalizarTexto(a);
      if (normA && !mapa[normA]) {
        mapa[normA] = true;
        lista.push(a);
      }
    }

    return lista;
  }

  function alternarCidadePermitida(cidadeNome) {
    var cfg = obterConfigSniper();
    var cidades = Array.isArray(cfg.cidadesPermitidas) ? cfg.cidadesPermitidas.slice() : [];
    var nomeTrim = String(cidadeNome || "").trim();
    if (!nomeTrim) return { sucesso: false, ativada: false, cidades: cidades };

    var norm = _normalizarTexto(nomeTrim);
    var idx = -1;
    for (var i = 0; i < cidades.length; i++) {
      if (_normalizarTexto(cidades[i]) === norm) {
        idx = i;
        break;
      }
    }

    var ativada = false;
    if (idx !== -1) {
      cidades.splice(idx, 1);
      ativada = false;
    } else {
      cidades.push(nomeTrim);
      ativada = true;
    }

    salvarConfigSniper({
      cidadesPermitidas: cidades,
      filtroCidadesAtivo: cidades.length > 0
    });
    return { sucesso: true, ativada: ativada, cidade: nomeTrim, cidades: cidades };
  }

  function redefinirCidadesPadrao() {
    var padrao = DEFAULT_CONFIG.cidadesPermitidas.slice();
    salvarConfigSniper({ cidadesPermitidas: padrao, filtroCidadesAtivo: false });
    return padrao;
  }

  function definirTodasCidades(ativarTodas) {
    var novas = [];
    if (ativarTodas) {
      novas = obterCatalogoCidadesDisponiveis().slice();
    }
    salvarConfigSniper({
      cidadesPermitidas: novas,
      filtroCidadesAtivo: false
    });
    return novas;
  }

  function obterCatalogoSetoresDisponiveis() {
    var cfg = obterConfigSniper();
    var ativas = Array.isArray(cfg.setoresPermitidos) ? cfg.setoresPermitidos : DEFAULT_CONFIG.setoresPermitidos;
    var mapa = {};
    var lista = [];
    var i;

    for (i = 0; i < CATALOGO_SETORES_PADRAO.length; i++) {
      var s = CATALOGO_SETORES_PADRAO[i];
      var norm = _normalizarTexto(s);
      if (!mapa[norm]) {
        mapa[norm] = true;
        lista.push(s);
      }
    }

    for (i = 0; i < ativas.length; i++) {
      var sa = ativas[i];
      var normS = _normalizarTexto(sa);
      if (normS && !mapa[normS]) {
        mapa[normS] = true;
        lista.push(sa);
      }
    }

    return lista;
  }

  function alternarSetorPermitido(setorNomeOuIndice) {
    var cfg = obterConfigSniper();
    var catalogo = obterCatalogoSetoresDisponiveis();
    var setores = Array.isArray(cfg.setoresPermitidos) ? cfg.setoresPermitidos.slice() : [];
    var nomeTrim = "";

    if (typeof setorNomeOuIndice === "number" || /^\d+$/.test(String(setorNomeOuIndice))) {
      var idxCat = parseInt(setorNomeOuIndice, 10);
      if (idxCat >= 0 && idxCat < catalogo.length) {
        nomeTrim = catalogo[idxCat];
      }
    } else {
      nomeTrim = String(setorNomeOuIndice || "").trim();
    }

    if (!nomeTrim) return { sucesso: false, ativado: false, setores: setores };

    var norm = _normalizarTexto(nomeTrim);
    var idx = -1;
    for (var i = 0; i < setores.length; i++) {
      if (_normalizarTexto(setores[i]) === norm) {
        idx = i;
        break;
      }
    }

    var ativado = false;
    if (idx !== -1) {
      setores.splice(idx, 1);
      ativado = false;
    } else {
      setores.push(nomeTrim);
      ativado = true;
    }

    salvarConfigSniper({ setoresPermitidos: setores });
    return { sucesso: true, ativado: ativado, setor: nomeTrim, setores: setores };
  }

  function redefinirSetoresPadrao() {
    var padrao = DEFAULT_CONFIG.setoresPermitidos.slice();
    salvarConfigSniper({ setoresPermitidos: padrao });
    return padrao;
  }

  // --------------------------------------------------------------------------
  // Estatísticas / Métricas e Histórico
  // --------------------------------------------------------------------------
  function obterEstatisticas() {
    var padrao = {
      totalAnalisadas: 0,
      filtradasEstagio1: 0,
      rejeitadasCriterios: 0,
      calotesEvitados: 0,
      plantoesCapturados: 0,
      receitaGarantidaReais: 0,
      ultimoDisparoEm: null
    };
    var s = _lerJsonProp(PROP_STATS_KEY, padrao);
    for (var k in padrao) {
      if (typeof s[k] === "undefined") s[k] = padrao[k];
    }
    return s;
  }

  function salvarEstatisticas(stats) {
    _salvarJsonProp(PROP_STATS_KEY, stats);
    return stats;
  }

  function registrarMetrica(chaveOuObjeto, incremento) {
    var stats = obterEstatisticas();
    if (chaveOuObjeto && typeof chaveOuObjeto === "object") {
      for (var k in chaveOuObjeto) {
        if (Object.prototype.hasOwnProperty.call(chaveOuObjeto, k)) {
          if (typeof stats[k] === "number" && typeof chaveOuObjeto[k] === "number") {
            stats[k] += chaveOuObjeto[k];
          } else {
            stats[k] = chaveOuObjeto[k];
          }
        }
      }
    } else if (typeof chaveOuObjeto === "string") {
      var inc = typeof incremento === "number" ? incremento : 1;
      stats[chaveOuObjeto] = (Number(stats[chaveOuObjeto]) || 0) + inc;
    }
    return salvarEstatisticas(stats);
  }

  function obterHistorico(limite) {
    var lista = _lerJsonProp(PROP_HISTORICO_KEY, []);
    if (!Array.isArray(lista)) return [];
    var max = Number(limite) || 50;
    return lista.slice(0, max);
  }

  function _registrarNoHistorico(evento) {
    if (!evento || typeof evento !== "object") return;
    var lista = _lerJsonProp(PROP_HISTORICO_KEY, []);
    if (!Array.isArray(lista)) lista = [];
    evento.registradoEm = evento.registradoEm || new Date().toISOString();
    lista.unshift(evento);
    if (lista.length > 60) {
      lista = lista.slice(0, 60);
    }
    _salvarJsonProp(PROP_HISTORICO_KEY, lista);
  }

  function limparHistorico() {
    _salvarJsonProp(PROP_HISTORICO_KEY, []);
    return [];
  }

  // --------------------------------------------------------------------------
  // Blacklist Anti-Calote Colaborativa
  // --------------------------------------------------------------------------
  function obterBlacklistCalote() {
    var lista = _lerJsonProp(PROP_BLACKLIST_KEY, null);
    if (!Array.isArray(lista)) {
      var inicial = JSON.parse(JSON.stringify(DEFAULT_BLACKLIST));
      _salvarJsonProp(PROP_BLACKLIST_KEY, inicial);
      return inicial;
    }
    return lista;
  }

  function adicionarBlacklistCalote(termo, motivo) {
    var limpo = String(termo || "").trim();
    if (!limpo) return obterBlacklistCalote();
    var lista = obterBlacklistCalote();
    var normAlvo = _normalizarTexto(limpo);
    for (var i = 0; i < lista.length; i++) {
      if (_normalizarTexto(lista[i].termo) === normAlvo) {
        return lista;
      }
    }
    lista.push({
      termo: limpo,
      motivo: motivo || "Denunciado pelo médico via Telegram (1-Click Anti-Calote)",
      adicionadoEm: new Date().toISOString()
    });
    _salvarJsonProp(PROP_BLACKLIST_KEY, lista);
    return lista;
  }

  function removerTermoBlacklist(termoOuIndice) {
    var lista = obterBlacklistCalote();
    if (typeof termoOuIndice === "number" || /^\d+$/.test(String(termoOuIndice))) {
      var idx = parseInt(termoOuIndice, 10);
      if (idx >= 0 && idx < lista.length) {
        lista.splice(idx, 1);
        _salvarJsonProp(PROP_BLACKLIST_KEY, lista);
      }
      return lista;
    }
    var alvo = _normalizarTexto(termoOuIndice);
    var filtrada = [];
    for (var i = 0; i < lista.length; i++) {
      if (_normalizarTexto(lista[i].termo) !== alvo) {
        filtrada.push(lista[i]);
      }
    }
    _salvarJsonProp(PROP_BLACKLIST_KEY, filtrada);
    return filtrada;
  }

  function verificarBlacklist(textoOuHospital) {
    var alvo = _normalizarTexto(textoOuHospital);
    if (!alvo) return { bloqueado: false };
    var lista = obterBlacklistCalote();
    for (var i = 0; i < lista.length; i++) {
      var item = lista[i];
      var termoNorm = _normalizarTexto(item.termo);
      if (termoNorm && alvo.indexOf(termoNorm) !== -1) {
        return {
          bloqueado: true,
          termo: item.termo,
          motivo: item.motivo || "Restrição financeira na Blacklist Anti-Calote"
        };
      }
    }
    return { bloqueado: false };
  }

  // --------------------------------------------------------------------------
  // Allowlist Zero-Trust de Grupos WhatsApp (Isolamento Estrito em 2 Camadas)
  // --------------------------------------------------------------------------
  function obterGruposAllowlist() {
    var lista = _lerJsonProp(PROP_ALLOWLIST_KEY, null);
    if (!Array.isArray(lista) || lista.length === 0) {
      var copia = JSON.parse(JSON.stringify(DEFAULT_ALLOWLIST));
      _salvarJsonProp(PROP_ALLOWLIST_KEY, copia);
      return copia;
    }
    return lista;
  }

  function salvarGruposAllowlist(lista) {
    if (!Array.isArray(lista)) return obterGruposAllowlist();
    var limpa = [];
    for (var i = 0; i < lista.length; i++) {
      var g = lista[i] || {};
      if (!g.jid) continue;
      var modo = String(g.modoGrupo || "BLOQUEADO").toUpperCase();
      if (modo !== "SNIPER_AUTO" && modo !== "RADAR_ONLY" && modo !== "BLOQUEADO") {
        modo = "BLOQUEADO";
      }
      var permitido = (modo === "SNIPER_AUTO" || modo === "RADAR_ONLY") ? Boolean(g.permitido !== false) : false;
      if (!permitido) modo = "BLOQUEADO";
      limpa.push({
        jid: String(g.jid).trim(),
        nome: String(g.nome || g.jid).trim(),
        permitido: permitido,
        modoGrupo: modo
      });
    }
    _salvarJsonProp(PROP_ALLOWLIST_KEY, limpa);
    return limpa;
  }

  function atualizarStatusGrupoAllowlist(jidOuIndice, novoModoOuPermitido, nomeOpcional) {
    var lista = obterGruposAllowlist();
    var alvoIdx = -1;

    if (typeof jidOuIndice === "number" || /^\d+$/.test(String(jidOuIndice))) {
      var idxNum = parseInt(jidOuIndice, 10);
      if (idxNum >= 0 && idxNum < lista.length) {
        alvoIdx = idxNum;
      }
    }

    var jidStr = String(jidOuIndice || "").trim();
    if (alvoIdx === -1 && jidStr) {
      var busca = jidStr.toLowerCase();
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].jid.toLowerCase() === busca || lista[i].nome.toLowerCase() === busca) {
          alvoIdx = i;
          break;
        }
      }
    }

    var modo = "BLOQUEADO";
    if (typeof novoModoOuPermitido === "boolean") {
      modo = novoModoOuPermitido ? "SNIPER_AUTO" : "BLOQUEADO";
    } else if (typeof novoModoOuPermitido === "string") {
      var m = novoModoOuPermitido.toUpperCase().trim();
      if (m === "SNIPER_AUTO" || m === "RADAR_ONLY" || m === "BLOQUEADO") {
        modo = m;
      }
    }

    if (alvoIdx === -1) {
      if (jidStr.indexOf("@g.us") !== -1) {
        lista.push({
          jid: jidStr,
          nome: String(nomeOpcional || jidStr).trim(),
          permitido: modo !== "BLOQUEADO",
          modoGrupo: modo
        });
        alvoIdx = lista.length - 1;
      } else {
        return { sucesso: false, motivo: "GRUPO_NAO_ENCONTRADO", grupos: lista };
      }
    } else {
      lista[alvoIdx].modoGrupo = modo;
      lista[alvoIdx].permitido = modo !== "BLOQUEADO";
      if (nomeOpcional) {
        lista[alvoIdx].nome = String(nomeOpcional).trim();
      }
    }

    var salva = salvarGruposAllowlist(lista);
    return {
      sucesso: true,
      indice: alvoIdx,
      grupo: salva[alvoIdx],
      grupos: salva
    };
  }

  function sincronizarGruposWhatsApp(gruposRecebidos) {
    var listaAtual = obterGruposAllowlist();
    var mapaIdx = {};
    for (var i = 0; i < listaAtual.length; i++) {
      mapaIdx[listaAtual[i].jid] = i;
    }

    var recebidos = gruposRecebidos;
    // Se não recebeu array direto, tenta consultar o Bridge WhatsApp em execução
    if (!Array.isArray(recebidos) && typeof globalThis !== "undefined" && globalThis.WhatsAppBridgeService && typeof globalThis.WhatsAppBridgeService.listarGruposConectados === "function") {
      try {
        recebidos = globalThis.WhatsAppBridgeService.listarGruposConectados() || [];
      } catch (e) {
        recebidos = [];
      }
    }
    if (!Array.isArray(recebidos)) recebidos = [];

    var novosAdicionados = 0;

    for (var j = 0; j < recebidos.length; j++) {
      var grp = recebidos[j] || {};
      var jid = String(grp.jid || grp.id || grp.remoteJid || "").trim();
      var nome = String(grp.nome || grp.subject || grp.name || jid).trim();

      // Filtra estritamente apenas JIDs de grupos (@g.us)
      if (!jid || jid.indexOf("@g.us") === -1 || jid.indexOf("@g.us") !== jid.length - 5) {
        continue;
      }

      if (Object.prototype.hasOwnProperty.call(mapaIdx, jid)) {
        var idxExistente = mapaIdx[jid];
        if (nome && nome !== jid) {
          listaAtual[idxExistente].nome = nome;
        }
      } else {
        // Zero-Trust: Todo novo grupo descoberto entra BLOQUEADO por padrão
        listaAtual.push({
          jid: jid,
          nome: nome || ("Grupo " + jid.substring(0, 8)),
          permitido: false,
          modoGrupo: "BLOQUEADO"
        });
        mapaIdx[jid] = listaAtual.length - 1;
        novosAdicionados++;
      }
    }

    var listaSalva = salvarGruposAllowlist(listaAtual);
    return {
      sucesso: true,
      totalGrupos: listaSalva.length,
      novosAdicionados: novosAdicionados,
      grupos: listaSalva
    };
  }

  function alternarPermissaoGrupo(indiceOuJid) {
    var lista = obterGruposAllowlist();
    var alvoIdx = -1;

    if (typeof indiceOuJid === "number" || /^\d+$/.test(String(indiceOuJid))) {
      var idxNum = parseInt(indiceOuJid, 10);
      if (idxNum >= 0 && idxNum < lista.length) {
        alvoIdx = idxNum;
      }
    }

    if (alvoIdx === -1 && indiceOuJid) {
      var busca = String(indiceOuJid).trim().toLowerCase();
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].jid.toLowerCase() === busca || lista[i].nome.toLowerCase() === busca) {
          alvoIdx = i;
          break;
        }
      }
    }

    if (alvoIdx === -1) {
      return { sucesso: false, motivo: "GRUPO_NAO_ENCONTRADO", grupos: lista };
    }

    var item = lista[alvoIdx];
    var modoAtual = String(item.modoGrupo || "BLOQUEADO").toUpperCase();

    // Ciclo Zero-Trust: BLOQUEADO -> RADAR_ONLY -> SNIPER_AUTO -> BLOQUEADO
    if (modoAtual === "BLOQUEADO" || !item.permitido) {
      item.modoGrupo = "RADAR_ONLY";
      item.permitido = true;
    } else if (modoAtual === "RADAR_ONLY") {
      item.modoGrupo = "SNIPER_AUTO";
      item.permitido = true;
    } else {
      item.modoGrupo = "BLOQUEADO";
      item.permitido = false;
    }

    var listaSalva = salvarGruposAllowlist(lista);
    return {
      sucesso: true,
      indice: alvoIdx,
      grupo: listaSalva[alvoIdx],
      grupos: listaSalva
    };
  }

  function validarIsolamentoCamada1E2(envelope) {
    var env = envelope || {};

    // CAMADA 1: Bloqueio absoluto de mensagens próprias, chats privados (@s.whatsapp.net), status e canais
    if (env.fromMe === true || (env.key && env.key.fromMe === true)) {
      return {
        permitido: false,
        camada: 1,
        codigo: "MENSAGEM_PROPRIA_IGNORADA",
        motivo: "Mensagem enviada pelo próprio titular ignorada na Camada 1",
        modoGrupo: "BLOQUEADO"
      };
    }

    var remoteJid = String(
      env.remoteJid ||
      env.jid ||
      env.groupJid ||
      (env.key && env.key.remoteJid) ||
      ""
    ).trim();

    if (remoteJid) {
      var terminaComGus = remoteJid.length > 5 && remoteJid.indexOf("@g.us") === (remoteJid.length - 5);
      if (
        !terminaComGus ||
        remoteJid.indexOf("@s.whatsapp.net") !== -1 ||
        remoteJid.indexOf("@lid") !== -1 ||
        remoteJid === "status@broadcast" ||
        remoteJid.indexOf("@broadcast") !== -1 ||
        remoteJid.indexOf("@newsletter") !== -1
      ) {
        return {
          permitido: false,
          camada: 1,
          codigo: "CHAT_PRIVADO_OU_STATUS_BLOQUEADO",
          motivo: "Conversa privada ou status bloqueado estritamente na Camada 1 (" + remoteJid + ")",
          remoteJid: remoteJid,
          modoGrupo: "BLOQUEADO"
        };
      }
    }

    // CAMADA 2: Validação Estrita na Allowlist de Grupos Permitidos
    var nomeGrupo = String(env.grupoNome || env.groupName || "").trim();
    var exigirAllowlist = env.exigirAllowlist !== false; // Padrão TRUE (Zero-Trust)

    if (remoteJid || exigirAllowlist) {
      var allowlist = obterGruposAllowlist();
      var grupoEncontrado = null;

      for (var i = 0; i < allowlist.length; i++) {
        if (remoteJid && allowlist[i].jid === remoteJid) {
          grupoEncontrado = allowlist[i];
          break;
        }
        if (!remoteJid && nomeGrupo && _normalizarTexto(allowlist[i].nome) === _normalizarTexto(nomeGrupo)) {
          grupoEncontrado = allowlist[i];
          break;
        }
      }

      if (!grupoEncontrado || grupoEncontrado.permitido !== true || grupoEncontrado.modoGrupo === "BLOQUEADO") {
        return {
          permitido: false,
          camada: 2,
          codigo: "GRUPO_NAO_AUTORIZADO_ALLOWLIST",
          motivo: "Grupo fora da Allowlist ou marcado como BLOQUEADO (" + (nomeGrupo || remoteJid || "desconhecido") + ")",
          remoteJid: remoteJid,
          nomeGrupo: grupoEncontrado ? grupoEncontrado.nome : nomeGrupo,
          modoGrupo: "BLOQUEADO"
        };
      }

      return {
        permitido: true,
        camada: 2,
        codigo: "GRUPO_AUTORIZADO_ALLOWLIST",
        remoteJid: grupoEncontrado.jid,
        nomeGrupo: grupoEncontrado.nome,
        modoGrupo: grupoEncontrado.modoGrupo || "RADAR_ONLY"
      };
    }

    return {
      permitido: true,
      camada: 2,
      codigo: "MODO_SIMULACAO_INTERNA",
      remoteJid: "",
      nomeGrupo: nomeGrupo || "Grupo Simulado",
      modoGrupo: "SNIPER_AUTO"
    };
  }

  // --------------------------------------------------------------------------
  // Pareamento WhatsApp 8 Dígitos (Integração Real + Fallback Estruturado)
  // --------------------------------------------------------------------------
  function gerarCodigoPareamentoWhatsApp(telefoneInput) {
    var foneSanitizado = _sanitizarTelefoneWhatsApp(telefoneInput);
    if (!foneSanitizado) {
      var cfg = obterConfigSniper();
      foneSanitizado = _sanitizarTelefoneWhatsApp(cfg.telefoneWhatsApp);
    }
    if (!foneSanitizado) {
      foneSanitizado = "5511999998888";
    }

    salvarConfigSniper({ telefoneWhatsApp: foneSanitizado });

    // 1. Tenta solicitar ao Bridge Baileys/Evolution se disponível no runtime Node
    if (typeof globalThis !== "undefined" && globalThis.WhatsAppBridgeService && typeof globalThis.WhatsAppBridgeService.solicitarPairingCode === "function") {
      try {
        var resBridge = globalThis.WhatsAppBridgeService.solicitarPairingCode(foneSanitizado);
        if (resBridge && resBridge.codigo) {
          var estadoReal = {
            sucesso: true,
            origem: "WHATSAPP_BRIDGE_LIVE",
            telefone: foneSanitizado,
            codigo: resBridge.codigo,
            geradoEm: new Date().toISOString()
          };
          _salvarJsonProp(PROP_PAIRING_STATE_KEY, estadoReal);
          return estadoReal;
        }
      } catch (e) {}
    }

    // 2. Tenta consultar endpoint local ou webhook configurado nas propriedades
    try {
      var bridgeUrl = PropertiesService.getScriptProperties().getProperty("WHATSAPP_BRIDGE_PAIR_URL");
      if (bridgeUrl && typeof UrlFetchApp !== "undefined") {
        var resp = UrlFetchApp.fetch(bridgeUrl, {
          method: "post",
          contentType: "application/json",
          payload: JSON.stringify({ phone: foneSanitizado }),
          muteHttpExceptions: true
        });
        if (resp && resp.getResponseCode() >= 200 && resp.getResponseCode() < 300) {
          var body = JSON.parse(resp.getContentText() || "{}");
          var codeRemoto = body.code || body.pairingCode || body.codigo;
          if (codeRemoto) {
            var estadoHttp = {
              sucesso: true,
              origem: "WHATSAPP_BRIDGE_HTTP",
              telefone: foneSanitizado,
              codigo: String(codeRemoto).toUpperCase(),
              geradoEm: new Date().toISOString()
            };
            _salvarJsonProp(PROP_PAIRING_STATE_KEY, estadoHttp);
            return estadoHttp;
          }
        }
      }
    } catch (e) {}

    // 3. Gera token de sessão de pareamento determinístico/8-dígitos para o listener local consumir
    var chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    var p1 = "";
    var p2 = "";
    for (var i = 0; i < 4; i++) {
      p1 += chars.charAt(Math.floor(Math.random() * chars.length));
      p2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    var codigo8 = p1 + "-" + p2;
    var estado = {
      sucesso: true,
      origem: "PAIRING_SESSION_QUEUE",
      telefone: foneSanitizado,
      codigo: codigo8,
      geradoEm: new Date().toISOString()
    };
    _salvarJsonProp(PROP_PAIRING_STATE_KEY, estado);
    return estado;
  }

  // --------------------------------------------------------------------------
  // Deduplicação Cross-Group Completa (Sem Truncamento nos Primeiros 90 Chars)
  // --------------------------------------------------------------------------
  function gerarHashOferta(textoOuOferta) {
    var baseStr = "";
    if (textoOuOferta && typeof textoOuOferta === "object") {
      baseStr = [
        _normalizarTexto(textoOuOferta.hospital || ""),
        _normalizarTexto(textoOuOferta.cidade || ""),
        _normalizarTexto(textoOuOferta.setor || ""),
        _normalizarTexto(textoOuOferta.dataTurnoChave || ""),
        String(textoOuOferta.valorTotal || 0),
        _normalizarTexto(textoOuOferta.textoOriginal || "")
      ].join("|");
    } else {
      baseStr = _normalizarTexto(String(textoOuOferta || "")).replace(/[^a-z0-9]/g, "");
    }

    // Algoritmo DJB2 duplo sobre 100% da string para evitar colisão em textos com cabeçalhos iguais
    var h1 = 5381;
    var h2 = 52711;
    for (var i = 0; i < baseStr.length; i++) {
      var ch = baseStr.charCodeAt(i);
      h1 = ((h1 << 5) + h1) ^ ch;
      h2 = ((h2 << 5) + h2) + ch;
    }
    var hex1 = (h1 >>> 0).toString(16);
    var hex2 = (h2 >>> 0).toString(16);
    return "vaga_" + hex1 + "_" + hex2;
  }

  function jaProcessouOferta(hashOferta) {
    if (!hashOferta) return false;
    try {
      var cache = CacheService.getScriptCache();
      var hit = cache.get("SNIPER_DEDUP_" + hashOferta);
      if (hit) return true;
      cache.put("SNIPER_DEDUP_" + hashOferta, "1", 1800); // 30 min TTL
      return false;
    } catch (e) {
      return false;
    }
  }

  function salvarOfertaEmMemoria(oferta) {
    if (!oferta || !oferta.hashOferta) return;
    var map = _lerJsonProp(PROP_OFERTAS_CACHE_KEY, {});
    map[oferta.hashOferta] = oferta;
    var chaves = Object.keys(map);
    if (chaves.length > 40) {
      delete map[chaves[0]];
    }
    _salvarJsonProp(PROP_OFERTAS_CACHE_KEY, map);
  }

  function obterOfertaEmMemoria(hashOferta) {
    if (!hashOferta) return null;
    var map = _lerJsonProp(PROP_OFERTAS_CACHE_KEY, {});
    return map[hashOferta] || null;
  }

  // --------------------------------------------------------------------------
  // ESTÁGIO 1: Filtro Determinístico Ultra-Rápido (< 0.2ms, Custo Zero)
  // --------------------------------------------------------------------------
  function filtroRapidoEstagio1(texto) {
    var raw = String(texto || "").trim();
    if (raw.length < 20) {
      return { passou: false, motivo: "MENSAGEM_CURTA_OU_FIGURINHA" };
    }

    var norm = _normalizarTexto(raw);

    // 1. Filtra ofertas reversas (médico pedindo plantão em vez de oferecer)
    var padroesOfertaReversa = [
      "estou disponivel para plantao",
      "estou disponivel p/ plantao",
      "procuro plantao",
      "preciso de plantao",
      "alguem tem plantao para passar",
      "disponivel para cobrir",
      "busco plantao",
      "pego plantao hoje",
      "disponivel para hoje"
    ];
    for (var i = 0; i < padroesOfertaReversa.length; i++) {
      if (norm.indexOf(padroesOfertaReversa[i]) !== -1) {
        return { passou: false, motivo: "OFERTA_REVERSA_MEDICO_PROCURANDO" };
      }
    }

    // 2. Exige presença de números (horário ou valor)
    if (!/\d{1,4}/.test(norm)) {
      return { passou: false, motivo: "SEM_VALORES_OU_HORARIOS" };
    }

    // 3. Exige pelo menos 1 gatilho semântico de vaga médica
    var gatilhosVaga = [
      "plantao",
      "vaga",
      "cobertura",
      "preciso de medico",
      "ficha verde",
      "porta",
      "clinica medica",
      "enfermaria",
      "observacao",
      "sala vermelha",
      "emergencia",
      "upa",
      "hospital",
      "santa casa",
      "pronto socorro",
      "maternidade",
      "ama",
      "ubs",
      "12h",
      "6h",
      "24h",
      "noturno",
      "diurno",
      "cinderela",
      "r$"
    ];
    var temGatilho = false;
    for (var j = 0; j < gatilhosVaga.length; j++) {
      if (norm.indexOf(gatilhosVaga[j]) !== -1) {
        temGatilho = true;
        break;
      }
    }
    if (!temGatilho) {
      return { passou: false, motivo: "CONVERSA_GERAL_SEM_GATILHO" };
    }

    // 4. Deduplicação Cross-Group pelo texto completo normalizado
    var hashTexto = gerarHashOferta(raw);
    if (jaProcessouOferta(hashTexto)) {
      return {
        passou: false,
        motivo: "DUPLICATA_CROSS_GROUP",
        hashOferta: hashTexto
      };
    }

    return {
      passou: true,
      hashOferta: hashTexto
    };
  }

  // --------------------------------------------------------------------------
  // ESTÁGIO 2: Extrator Semântico Estruturado de Plantão Médico
  // --------------------------------------------------------------------------
  function _extrairSetorEspecialidade(norm) {
    // Mapeamento em ordem de especificidade clínica (evita classificar especialidades restritas como "Porta")
    var regrasSetor = [
      {
        nome: "UTI Pediátrica",
        termos: ["uti pediatrica", "uti ped", "utip", "uti neonatal", "utin", "terapia intensiva pediatrica"]
      },
      {
        nome: "Ginecologia e Obstetrícia",
        termos: ["ginecologia", "obstetricia", "parto", "centro obstetrico", "maternidade", "gestante", "pre-natal", "go "]
      },
      {
        nome: "Ortopedia",
        termos: ["ortopedia", "ortopedista", "trauma ortopedico", "fratura", "gesso"]
      },
      {
        nome: "Psiquiatria",
        termos: ["psiquiatria", "psiquiatra", "saude mental", "caps "]
      },
      {
        nome: "Anestesiologia",
        termos: ["anestesio", "anestesiologia", "anestesista"]
      },
      {
        nome: "Cirurgia Geral",
        termos: ["cirurgia geral", "cirurgiao geral", "centro cirurgico", "cirurgia "]
      },
      {
        nome: "Cardiologia",
        termos: ["cardiologia", "cardiologista", "unidade coronariana", "uco"]
      },
      {
        nome: "Pediatria",
        termos: ["pediatria", "pediatra", "pronto socorro infantil", "ps infantil", "puericultura", "infantil"]
      },
      {
        nome: "UTI Adulto",
        termos: ["uti adulto", "uti geral", "terapia intensiva", "intensivista", "uti "]
      },
      {
        nome: "Sala Vermelha",
        termos: ["sala vermelha", "emergencia", "intubacao", "politrauma", "choque"]
      },
      {
        nome: "Ficha Verde",
        termos: ["ficha verde", "ficha azul", "baixa complexidade", "triagem"]
      },
      {
        nome: "Observação",
        termos: ["observacao", "sala amarela", "leito de observacao"]
      },
      {
        nome: "Enfermaria",
        termos: ["enfermaria", "internacao", "evolucao de enfermaria", "hospitalista"]
      },
      {
        nome: "Clínica Médica",
        termos: ["clinica medica", "clinico geral", "clinica geral", "cm "]
      },
      {
        nome: "Porta",
        termos: ["porta", "pronto atendimento", "pronto socorro", "pa ", "ps ", "atendimento geral"]
      }
    ];

    var textoBusca = " " + norm + " ";
    for (var i = 0; i < regrasSetor.length; i++) {
      var regra = regrasSetor[i];
      for (var j = 0; j < regra.termos.length; j++) {
        if (textoBusca.indexOf(regra.termos[j]) !== -1) {
          return regra.nome;
        }
      }
    }

    // Outras especialidades não permitidas por padrão (evita fallback cego para Porta)
    var outrasEspecialidades = [
      { termo: "neurologia", nome: "Neurologia" },
      { termo: "neurocirurgia", nome: "Neurocirurgia" },
      { termo: "oftalmologia", nome: "Oftalmologia" },
      { termo: "otorrino", nome: "Otorrinolaringologia" },
      { termo: "urologia", nome: "Urologia" },
      { termo: "dermatologia", nome: "Dermatologia" },
      { termo: "endoscopia", nome: "Endoscopia" },
      { termo: "radiologia", nome: "Radiologia" },
      { termo: "ultrassom", nome: "Ultrassonografia" },
      { termo: "medicina do trabalho", nome: "Medicina do Trabalho" }
    ];
    for (var k = 0; k < outrasEspecialidades.length; k++) {
      if (textoBusca.indexOf(outrasEspecialidades[k].termo) !== -1) {
        return outrasEspecialidades[k].nome;
      }
    }

    return "Não Especificado";
  }

  function _extrairValorFinanceiro(raw, norm) {
    // 1. Padrão explícito com R$ (ex: R$ 1.560,00 | R$1500 | R$ 950)
    var mReais = raw.match(/R\$\s*([0-9]{1,2}\.[0-9]{3}|[0-9]{3,4})(?:,[0-9]{2})?/i);
    if (mReais && mReais[1]) {
      var v1 = parseInt(mReais[1].replace(/\./g, ""), 10);
      if (v1 >= 400 && v1 <= 15000) return v1;
    }

    // 2. Padrão precedido por palavras-chave financeiras mesmo sem R$ (ex: "Valor: 1.500", "Paga 1.450,00", "Cache: 1600")
    var mContexto = raw.match(/(?:valor|paga|pagamento|remuneracao|remuneração|cache|cachê|liquido|líquido|pix|pj)[\s:;\-R$]*([0-9]{1,2}\.[0-9]{3}|[0-9]{3,4})(?:,[0-9]{2})?/i);
    if (mContexto && mContexto[1]) {
      var v2 = parseInt(mContexto[1].replace(/\./g, ""), 10);
      if (v2 >= 400 && v2 <= 15000) return v2;
    }

    // 3. Padrão milhar formatado com ponto e/ou centavos (ex: "1.500,00" ou "1.600 no PIX")
    var mMilhar = raw.match(/\b([1-9]\.[0-9]{3})(?:,[0-9]{2})?\b/);
    if (mMilhar && mMilhar[1]) {
      var v3 = parseInt(mMilhar[1].replace(/\./g, ""), 10);
      if (v3 >= 1000 && v3 <= 9999) return v3;
    }

    // 4. Número inteiro de 3 ou 4 dígitos (400 a 6000) que não seja ano ou telefone
    var regexNumeros = /\b([4-9][0-9]{2}|[1-5][0-9]{3})(?:,[0-9]{2})?\b/g;
    var match;
    while ((match = regexNumeros.exec(raw)) !== null) {
      var candidato = parseInt(match[1], 10);
      var pos = match.index;
      var vizinhanca = raw.slice(Math.max(0, pos - 6), Math.min(raw.length, pos + match[0].length + 6)).toLowerCase();
      // Ignora se faz parte de horário (ex: 1900h) ou telefone com traço
      if (vizinhanca.indexOf("-") !== -1 && /\d{4}-\d{4}/.test(vizinhanca)) continue;
      if (candidato >= 1990 && candidato <= 2035 && norm.indexOf("valor") === -1) continue;
      if (candidato >= 400 && candidato <= 6000) {
        return candidato;
      }
    }

    return 0;
  }

  function _extrairDataETurno(raw, norm) {
    var ehNoturno =
      norm.indexOf("noturno") !== -1 ||
      norm.indexOf("19h as 07h") !== -1 ||
      norm.indexOf("19h as 7h") !== -1 ||
      norm.indexOf("19:00") !== -1 ||
      norm.indexOf("19h") !== -1 ||
      norm.indexOf("18h as 06h") !== -1 ||
      norm.indexOf("noite") !== -1;

    var ehCinderela = norm.indexOf("cinderela") !== -1 || norm.indexOf("19h as 01h") !== -1 || norm.indexOf("18h as 00h") !== -1;
    var sufixoTurno = (ehNoturno || ehCinderela) ? "NOITE" : "DIA";

    var prefixoDia = "HOJE";
    var dataExplicitaIso = null;

    // 1. Verifica data explícita DD/MM ou DD/MM/YYYY
    var mDataBarra = raw.match(/\b([0-3]?[0-9])\/([0-1]?[0-9])(?:\/(20[2-9][0-9]|[2-9][0-9]))?\b/);
    if (mDataBarra) {
      var dia = parseInt(mDataBarra[1], 10);
      var mes = parseInt(mDataBarra[2], 10);
      var hoje = new Date();
      var ano = mDataBarra[3]
        ? (mDataBarra[3].length === 2 ? 2000 + parseInt(mDataBarra[3], 10) : parseInt(mDataBarra[3], 10))
        : hoje.getFullYear();

      if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
        var dataCand = new Date(ano, mes - 1, dia);
        // Se a data sem ano já passou há mais de 2 dias, assume próximo ano
        if (!mDataBarra[3] && (hoje.getTime() - dataCand.getTime()) > 2 * 86400000) {
          ano += 1;
        }
        var mm = String(mes).padStart(2, "0");
        var dd = String(dia).padStart(2, "0");
        dataExplicitaIso = ano + "-" + mm + "-" + dd;
        prefixoDia = dd + "/" + mm;
      }
    }

    // 2. Verifica data por extenso (ex: "15 de maio", "22 de agosto")
    // Ignora nomes de hospitais e logradouros (ex: "Hospital 9 de Julho", "Av. 9 de Julho")
    if (!dataExplicitaIso) {
      var normSemLocais = norm.replace(/\b(hospital|hosp|clinica|upa|ubs|av|avenida|rua|alameda)\s+[0-3]?[0-9]\s+de\s+[a-z]+/g, "");
      var mapaMeses = {
        janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
        julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12
      };
      var mExtenso = normSemLocais.match(/\b([0-3]?[0-9])\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/);
      if (mExtenso) {
        var dExt = parseInt(mExtenso[1], 10);
        var mExt = mapaMeses[mExtenso[2]];
        if (dExt >= 1 && dExt <= 31 && mExt) {
          var anoExt = new Date().getFullYear();
          var mmExt = String(mExt).padStart(2, "0");
          var ddExt = String(dExt).padStart(2, "0");
          dataExplicitaIso = anoExt + "-" + mmExt + "-" + ddExt;
          prefixoDia = ddExt + "/" + mmExt;
        }
      }
    }

    // 3. Verifica palavras-chave de dia relativo ou dia da semana
    if (!dataExplicitaIso) {
      if (norm.indexOf("amanha") !== -1) {
        prefixoDia = "AMANHA";
      } else if (norm.indexOf("segunda") !== -1) {
        prefixoDia = "SEGUNDA";
      } else if (norm.indexOf("terca") !== -1) {
        prefixoDia = "TERCA";
      } else if (norm.indexOf("quarta") !== -1) {
        prefixoDia = "QUARTA";
      } else if (norm.indexOf("quinta") !== -1) {
        prefixoDia = "QUINTA";
      } else if (norm.indexOf("sexta") !== -1) {
        prefixoDia = "SEXTA";
      } else if (norm.indexOf("sabado") !== -1) {
        prefixoDia = "SABADO";
      } else if (norm.indexOf("domingo") !== -1) {
        prefixoDia = "DOMINGO";
      }
    }

    var horarioInicio = ehNoturno ? "19:00" : "07:00";
    var horarioFim = ehCinderela ? "01:00" : (ehNoturno ? "07:00" : "19:00");
    var chaveTurno = (dataExplicitaIso || prefixoDia) + "_" + sufixoTurno;

    return {
      prefixoDia: prefixoDia,
      sufixoTurno: sufixoTurno,
      dataExplicitaIso: dataExplicitaIso,
      dataTurnoChave: chaveTurno,
      horarioInicio: horarioInicio,
      horarioFim: horarioFim,
      horarioDescricao: prefixoDia + " (" + horarioInicio + " às " + horarioFim + ")"
    };
  }

  function extrairDadosPlantao(texto, remetenteNumero) {
    var raw = String(texto || "").trim();
    var norm = _normalizarTexto(raw);

    // 1. Hospital / Unidade (Suporta números como "Hospital 9 de Julho", "UPA 24h" e apóstrofos "D'Ávila", sem engolir quebras de linha)
    var hospital = "Unidade Médica (Grupo)";
    var regexHosp = /(?:📍[ \t]*)?((?:hospital|upa|ama|ubs|pronto[ \t]+socorro|pronto[ \t]+atendimento|santa[ \t]+casa|maternidade|instituto|clinica|clínica)[ \t]+[a-zA-Z0-9áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ'’.\-]+(?:[ \t]+[a-zA-Z0-9áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ'’.\-]+){0,6})/i;
    var mHosp = raw.match(regexHosp);
    if (mHosp && mHosp[1]) {
      var hospBruto = mHosp[1].split(/[\(\n\r•|,;:]/)[0].trim();
      // Remove sufixos acidentais de turno/setor caso estejam na mesma linha sem pontuação
      hospBruto = hospBruto.replace(/\s+(?:-\s*)?(?:hoje|amanha|amanhã|noturno|diurno|porta|ficha\s+verde|valor|r\$).*$/i, "").trim();
      if (hospBruto.length >= 4) {
        hospital = hospBruto;
      }
    }

    // 2. Cidade / Região
    var cidade = "São Paulo";
    var mapaCidades = [
      { chave: "sao bernardo", nome: "São Bernardo" },
      { chave: "santo andre", nome: "Santo André" },
      { chave: "sao caetano", nome: "São Caetano" },
      { chave: "diadema", nome: "Diadema" },
      { chave: "maua", nome: "Mauá" },
      { chave: "abc", nome: "ABC" },
      { chave: "osasco", nome: "Osasco" },
      { chave: "guarulhos", nome: "Guarulhos" },
      { chave: "barueri", nome: "Barueri" },
      { chave: "alphaville", nome: "Barueri" },
      { chave: "cotia", nome: "Cotia" },
      { chave: "taboao da serra", nome: "Taboão da Serra" },
      { chave: "taboao", nome: "Taboão da Serra" },
      { chave: "mogi das cruzes", nome: "Mogi das Cruzes" },
      { chave: "mogi", nome: "Mogi das Cruzes" },
      { chave: "santos", nome: "Santos" },
      { chave: "sao vicente", nome: "São Vicente" },
      { chave: "praia grande", nome: "Praia Grande" },
      { chave: "guaruja", nome: "Guarujá" },
      { chave: "campinas", nome: "Campinas" },
      { chave: "jundiai", nome: "Jundiaí" },
      { chave: "sorocaba", nome: "Sorocaba" },
      { chave: "ribeirao preto", nome: "Ribeirão Preto" },
      { chave: "sao jose dos campos", nome: "São José dos Campos" },
      { chave: "sjc", nome: "São José dos Campos" },
      { chave: "morumbi", nome: "São Paulo" },
      { chave: "itaim", nome: "São Paulo" },
      { chave: "paulista", nome: "São Paulo" },
      { chave: "zona sul", nome: "São Paulo" },
      { chave: "zona leste", nome: "São Paulo" },
      { chave: "zona norte", nome: "São Paulo" },
      { chave: "zona oeste", nome: "São Paulo" },
      { chave: "sao paulo", nome: "São Paulo" }
    ];
    for (var c = 0; c < mapaCidades.length; c++) {
      if (norm.indexOf(mapaCidades[c].chave) !== -1) {
        cidade = mapaCidades[c].nome;
        break;
      }
    }
    if (cidade === "São Paulo") {
      var catalogoDinamico = obterCatalogoCidadesDisponiveis();
      for (var cd = 0; cd < catalogoDinamico.length; cd++) {
        var cItem = catalogoDinamico[cd];
        var cItemNorm = _normalizarTexto(cItem);
        if (cItemNorm && cItemNorm !== "sao paulo" && norm.indexOf(cItemNorm) !== -1) {
          cidade = cItem;
          break;
        }
      }
    }

    // 3. Setor / Especialidade (Sem fallback cego para Porta)
    var setor = _extrairSetorEspecialidade(norm);

    // 4. Turno, Data-Chave e Horários para a Aba Rotina
    var infoTurno = _extrairDataETurno(raw, norm);

    // 5. Duração (6h, 12h, 24h) - Evita confundir "UPA 24h" com duração de 24h
    var textoSemUpa24 = raw.replace(/upa\s*24\s*h/gi, "UPA");
    var duracaoHoras = 12;
    if (/\b24\s*h(?:oras)?\b/i.test(textoSemUpa24)) {
      duracaoHoras = 24;
    } else if (/\b6\s*h(?:oras)?\b/i.test(textoSemUpa24) || norm.indexOf("cinderela") !== -1) {
      duracaoHoras = 6;
    }

    // 6. Valor Financeiro (R$)
    var valorTotal = _extrairValorFinanceiro(raw, norm);
    var valorHora = duracaoHoras > 0 && valorTotal > 0
      ? Math.round(valorTotal / duracaoHoras)
      : 0;

    // 7. Modalidade de Pagamento
    var modalidadePagamento = "PJ 30 dias";
    if (norm.indexOf("pix") !== -1 && (norm.indexOf("vista") !== -1 || norm.indexOf("pos plantao") !== -1 || norm.indexOf("pos-plantao") !== -1 || norm.indexOf("saida") !== -1 || norm.indexOf("imediato") !== -1)) {
      modalidadePagamento = "PIX à vista pós-plantão";
    } else if (norm.indexOf("pix") !== -1) {
      modalidadePagamento = "PIX";
    } else if (norm.indexOf("avista") !== -1 || norm.indexOf("a vista") !== -1) {
      modalidadePagamento = "À vista";
    }

    // 8. Contato do Escalista Sanitizado (Sem fallback fake 5511999990000)
    var contatoEscalista = "";
    var mTel = raw.match(/(?:\+?55[ \t\-]?)?(?:\(?0?[1-9]{2}\)?[ \t\-]?)(?:9[0-9]{4}[ \t\-]?[0-9]{4}|[2-9][0-9]{3}[ \t\-]?[0-9]{4})/);
    if (mTel && mTel[0]) {
      contatoEscalista = _sanitizarTelefoneWhatsApp(mTel[0]);
    }
    if (!contatoEscalista && remetenteNumero) {
      contatoEscalista = _sanitizarTelefoneWhatsApp(remetenteNumero);
    }

    var ofertaMontada = {
      ehOfertaValida: valorTotal >= 400,
      hospital: hospital,
      cidade: cidade,
      setor: setor,
      dataTurnoChave: infoTurno.dataTurnoChave,
      dataIsoResolvida: _resolverDataIsoParaTurno(infoTurno.dataTurnoChave),
      horarioInicio: infoTurno.horarioInicio,
      horarioFim: infoTurno.horarioFim,
      horarioDescricao: infoTurno.horarioDescricao,
      duracaoHoras: duracaoHoras,
      valorTotal: valorTotal,
      valorHora: valorHora,
      modalidadePagamento: modalidadePagamento,
      contatoEscalista: contatoEscalista,
      textoOriginal: raw
    };

    ofertaMontada.hashOferta = gerarHashOferta(ofertaMontada);
    return ofertaMontada;
  }

  // --------------------------------------------------------------------------
  // ESTÁGIO 3: Integração Viva com a Aba Rotina (Trava de Conflito + Injeção)
  // --------------------------------------------------------------------------
  function _resolverDataIsoParaTurno(dataTurnoChave) {
    var chave = String(dataTurnoChave || "HOJE_NOITE").toUpperCase();
    var prefixo = chave.split("_")[0];

    // Se já veio como YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(prefixo)) {
      return prefixo;
    }

    var base = new Date();

    // Se veio como DD/MM
    var mCurto = prefixo.match(/^(\d{2})\/(\d{2})$/);
    if (mCurto) {
      var d = parseInt(mCurto[1], 10);
      var m = parseInt(mCurto[2], 10);
      var y = base.getFullYear();
      return y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
    }

    var mapaDiasSemana = {
      DOMINGO: 0,
      SEGUNDA: 1,
      TERCA: 2,
      QUARTA: 3,
      QUINTA: 4,
      SEXTA: 5,
      SABADO: 6
    };

    if (prefixo === "AMANHA") {
      base.setDate(base.getDate() + 1);
    } else if (Object.prototype.hasOwnProperty.call(mapaDiasSemana, prefixo)) {
      var diaAlvo = mapaDiasSemana[prefixo];
      var diff = (diaAlvo - base.getDay() + 7) % 7;
      base.setDate(base.getDate() + diff);
    }

    if (typeof RotinaService !== "undefined" && RotinaService.normalizarDataISO) {
      return RotinaService.normalizarDataISO(base);
    }
    var yyyy = base.getFullYear();
    var mm = String(base.getMonth() + 1).padStart(2, "0");
    var dd = String(base.getDate()).padStart(2, "0");
    return yyyy + "-" + mm + "-" + dd;
  }

  function obterSlotsTravados() {
    return _lerJsonProp(PROP_LOCKED_SLOTS_KEY, {});
  }

  function travarSlotPlantao(dataTurnoChave, infoOferta) {
    var slots = obterSlotsTravados();
    var oferta = infoOferta || {};
    slots[dataTurnoChave] = {
      hospital: oferta.hospital || "Plantão Confirmado",
      valorTotal: oferta.valorTotal || 0,
      dataIso: _resolverDataIsoParaTurno(dataTurnoChave),
      travadoEm: new Date().toISOString()
    };
    _salvarJsonProp(PROP_LOCKED_SLOTS_KEY, slots);
    return slots;
  }

  function liberarSlotPlantao(dataTurnoChave) {
    if (!dataTurnoChave) {
      _salvarJsonProp(PROP_LOCKED_SLOTS_KEY, {});
      return {};
    }
    var slots = obterSlotsTravados();
    if (Object.prototype.hasOwnProperty.call(slots, dataTurnoChave)) {
      delete slots[dataTurnoChave];
      _salvarJsonProp(PROP_LOCKED_SLOTS_KEY, slots);
    }
    return slots;
  }

  function destravarTodaAgendaSniper() {
    _salvarJsonProp(PROP_LOCKED_SLOTS_KEY, {});
    try {
      if (typeof RotinaService !== "undefined" && RotinaService.obterBlocosDoDia && RotinaService.salvarBlocosDoDia) {
        var hojeIso = _resolverDataIsoParaTurno("HOJE_NOITE");
        var blocos = RotinaService.obterBlocosDoDia(hojeIso) || [];
        var limpos = [];
        for (var i = 0; i < blocos.length; i++) {
          if (!blocos[i].id || String(blocos[i].id).indexOf("plantao_sniper_") === -1) {
            limpos.push(blocos[i]);
          }
        }
        RotinaService.salvarBlocosDoDia(hojeIso, limpos);
      }
    } catch (e) {}
    return true;
  }

  function verificarConflitoNaRotina(oferta) {
    var chave = oferta.dataTurnoChave || "HOJE_NOITE";
    var slots = obterSlotsTravados();
    if (slots[chave]) {
      return {
        conflito: true,
        origem: "TRAVA_SNIPER",
        motivo: "Horário já preenchido por " + slots[chave].hospital + " (" + chave + ")"
      };
    }

    // Consulta real na Timeline da Aba Rotina do médico
    try {
      if (typeof RotinaService !== "undefined" && RotinaService.obterBlocosDoDia) {
        var dataIso = _resolverDataIsoParaTurno(chave);
        var blocos = RotinaService.obterBlocosDoDia(dataIso) || [];
        for (var i = 0; i < blocos.length; i++) {
          var b = blocos[i];
          if (b && b.categoria === "plantao" && b.status !== "ignorado") {
            var mesmoTurno =
              b.inicio === oferta.horarioInicio ||
              (chave.indexOf("NOITE") !== -1 && String(b.inicio) >= "18:00") ||
              (chave.indexOf("DIA") !== -1 && String(b.inicio) < "13:00");
            if (mesmoTurno) {
              return {
                conflito: true,
                origem: "ABA_ROTINA",
                motivo: "Conflito na Timeline da Aba Rotina (" + dataIso + "): " + b.titulo
              };
            }
          }
        }
      }
    } catch (e) {}

    return { conflito: false };
  }

  function agendarPlantaoCapturadoNaRotina(oferta) {
    if (!oferta) return { agendado: false };
    var dataIso = _resolverDataIsoParaTurno(oferta.dataTurnoChave);
    travarSlotPlantao(oferta.dataTurnoChave, oferta);

    try {
      if (typeof RotinaService !== "undefined" && RotinaService.obterBlocosDoDia && RotinaService.salvarBlocosDoDia) {
        var blocos = RotinaService.obterBlocosDoDia(dataIso) || [];
        var idBloco = "plantao_sniper_" + (oferta.hashOferta || Date.now());
        var jaExiste = false;
        for (var i = 0; i < blocos.length; i++) {
          if (blocos[i].id === idBloco) {
            jaExiste = true;
            break;
          }
        }
        if (!jaExiste) {
          blocos.push({
            id: idBloco,
            inicio: oferta.horarioInicio || "19:00",
            fim: oferta.horarioFim || "07:00",
            titulo: "🚨 Plantão " + oferta.hospital + " (" + oferta.setor + ")",
            categoria: "plantao",
            status: "pendente",
            nota: "Capturado via Sniper | R$ " + oferta.valorTotal + " (" + oferta.modalidadePagamento + ")"
          });
          RotinaService.salvarBlocosDoDia(dataIso, blocos);
        }
        return { agendado: true, dataIso: dataIso, idBloco: idBloco };
      }
    } catch (e) {}

    return { agendado: true, dataIso: dataIso };
  }

  // --------------------------------------------------------------------------
  // Validador de Critérios do Médico (Setor, Cidade, Piso e Agenda)
  // --------------------------------------------------------------------------
  function avaliarCriteriosMedico(oferta, config) {
    // 1. Verifica Blacklist Anti-Calote
    var checkCalote = verificarBlacklist(oferta.hospital + " " + oferta.textoOriginal);
    if (checkCalote.bloqueado) {
      return {
        aprovado: false,
        codigo: "BLACKLIST_CALOTE",
        motivo: "Bloqueado pelo Filtro Anti-Calote: " + checkCalote.termo + " (" + checkCalote.motivo + ")"
      };
    }

    // 2. Verifica Setor / Especialidade Compatível
    var setorNorm = _normalizarTexto(oferta.setor);
    var setoresOk = Array.isArray(config.setoresPermitidos)
      ? config.setoresPermitidos
      : DEFAULT_CONFIG.setoresPermitidos;

    var setorPermitido = false;
    for (var i = 0; i < setoresOk.length; i++) {
      var sPermNorm = _normalizarTexto(setoresOk[i]);
      if (!sPermNorm) continue;
      if (setorNorm === sPermNorm || setorNorm.indexOf(sPermNorm) !== -1 || sPermNorm.indexOf(setorNorm) !== -1) {
        setorPermitido = true;
        break;
      }
    }

    if (!setorPermitido) {
      return {
        aprovado: false,
        codigo: "SETOR_INCOMPATIVEL",
        motivo: "Setor/Especialidade '" + oferta.setor + "' fora dos setores habilitados (" + setoresOk.join(", ") + ")"
      };
    }

    // 3. Abrangência Geográfica (Opcional se filtroCidadesAtivo estiver ligado)
    if (config.filtroCidadesAtivo && Array.isArray(config.cidadesPermitidas) && config.cidadesPermitidas.length > 0) {
      var cidNorm = _normalizarTexto(oferta.cidade);
      var cidadesOk = config.cidadesPermitidas;
      var cidadePermitida = false;
      for (var j = 0; j < cidadesOk.length; j++) {
        if (cidNorm.indexOf(_normalizarTexto(cidadesOk[j])) !== -1) {
          cidadePermitida = true;
          break;
        }
      }
      if (!cidadePermitida) {
        return {
          aprovado: false,
          codigo: "CIDADE_FORA_DO_RAIO",
          motivo: "Cidade '" + oferta.cidade + "' fora do raio configurado"
        };
      }
    }

    // 4. Verifica Piso Financeiro (Proporcional à duração ou valor/hora)
    var piso12h = Number(config.valorMinimo12h) || 1300;
    var pisoHora = Number(config.valorMinimoHora) || Math.round(piso12h / 12);
    if (oferta.valorHora < pisoHora) {
      return {
        aprovado: false,
        codigo: "VALOR_ABAIXO_DO_PISO",
        motivo: "R$ " + oferta.valorTotal + " (R$ " + oferta.valorHora + "/h) abaixo do seu piso de R$ " + piso12h + "/12h (R$ " + pisoHora + "/h)"
      };
    }

    // 5. Verifica Conflito na Aba Rotina e Trava de Agenda
    var conflito = verificarConflitoNaRotina(oferta);
    if (conflito.conflito) {
      return {
        aprovado: false,
        codigo: "CONFLITO_AGENDA_ROTINA",
        motivo: conflito.motivo
      };
    }

    return { aprovado: true, codigo: "MATCH_PERFEITO" };
  }

  // --------------------------------------------------------------------------
  // ESTÁGIO 4: Executor Stealth Anti-Ban (Jitter Humano + Spintax + PV)
  // --------------------------------------------------------------------------
  function gerarDisparoStealthWhatsApp(oferta, config, grupoOrigem) {
    var cfg = config || obterConfigSniper();
    var frasesGrupo = [
      "Opa, disponível! Chamei no privado agora.",
      "Eu pego! Te mandei msg no PV.",
      "Disponível, chamei no privado para confirmar.",
      "Assumo a vaga! Enviei meus dados no seu privado."
    ];
    var idx = Math.floor(Math.random() * frasesGrupo.length);
    var jitterMs = 1850 + Math.floor(Math.random() * 1300); // 1.85s a 3.15s

    var msgPrivado =
      "Olá! Vi a vaga no grupo *" + (grupoOrigem || oferta.grupoOrigem || "Plantões") + "* para o *" + oferta.hospital + "* (" + oferta.horarioDescricao + " — " + oferta.setor + ").\n\n" +
      "Tenho disponibilidade imediata para assumir. Seguem meus dados para cadastro na escala:\n" +
      "👨‍⚕️ *" + cfg.nome + "* (" + cfg.crm + ")\n" +
      "Pode confirmar a vaga para mim, por favor?";

    var foneLimpo = _sanitizarTelefoneWhatsApp(oferta.contatoEscalista);
    var linkWa = foneLimpo
      ? ("https://wa.me/" + foneLimpo + "?text=" + encodeURIComponent(msgPrivado))
      : null;

    return {
      modoStealthPvOnly: !!cfg.responderApenasPv,
      jitterDelayMs: jitterMs,
      simulacaoDigitandoMs: 1400,
      mensagemGrupo: cfg.responderApenasPv ? null : frasesGrupo[idx],
      destinatarioPv: foneLimpo || null,
      destinatarioJidPv: foneLimpo ? (foneLimpo + "@s.whatsapp.net") : null,
      temContatoValido: !!foneLimpo,
      mensagemPrivado: msgPrivado,
      linkWhatsAppDireto: linkWa
    };
  }

  // --------------------------------------------------------------------------
  // Pipeline Completo: Processa Mensagem do Grupo WhatsApp
  // --------------------------------------------------------------------------
  function processarMensagemGrupoWhatsApp(texto, grupoNome, remetenteNumero, opcoes) {
    var opts = (grupoNome && typeof grupoNome === "object") ? grupoNome : (opcoes || {});
    var nomeGrp = (typeof grupoNome === "string") ? grupoNome : (opts.grupoNome || opts.groupName || "Grupo WhatsApp");
    var remNum = (typeof remetenteNumero === "string") ? remetenteNumero : (opts.escalistaFone || opts.remetenteNumero || opts.participant || "");
    var cfgGlobal = obterConfigSniper();

    // Estágio 0: Blindagem Zero-Trust em Dupla Camada (Camada 1: Privados/Status/FromMe + Camada 2: Allowlist)
    var exigirAllowlist = typeof opts.exigirAllowlist === "boolean"
      ? opts.exigirAllowlist
      : (cfgGlobal.exigirAllowlist !== false);

    var isolamento = validarIsolamentoCamada1E2({
      fromMe: opts.fromMe,
      remoteJid: opts.remoteJid || opts.groupJid || "",
      grupoNome: nomeGrp,
      exigirAllowlist: exigirAllowlist
    });

    if (!isolamento.permitido) {
      return {
        status: "BLOQUEADA_ISOLAMENTO_ZERO_TRUST",
        camada: isolamento.camada,
        codigo: isolamento.codigo,
        motivo: isolamento.motivo,
        remoteJid: isolamento.remoteJid || null
      };
    }

    var stats = obterEstatisticas();
    stats.totalAnalisadas += 1;

    // Estágio 1: Filtro 0ms
    var f1 = filtroRapidoEstagio1(texto);
    if (!f1.passou) {
      stats.filtradasEstagio1 += 1;
      salvarEstatisticas(stats);
      return {
        status: "DESCARTADA_ESTAGIO_1",
        codigo: f1.motivo,
        motivo: f1.motivo,
        hashOferta: f1.hashOferta || null
      };
    }

    // Estágio 2: Extração Semântica
    var oferta = extrairDadosPlantao(texto, remNum);
    oferta.grupoOrigem = isolamento.nomeGrupo || nomeGrp || "Grupo WhatsApp";
    oferta.grupoJid = isolamento.remoteJid || opts.remoteJid || "";

    if (!oferta.ehOfertaValida) {
      stats.filtradasEstagio1 += 1;
      salvarEstatisticas(stats);
      return {
        status: "DESCARTADA_EXTRATOR",
        codigo: "SEM_VALOR_VALIDO",
        motivo: "Sem valor financeiro válido identificado (>= R$ 400)",
        oferta: oferta
      };
    }

    // Estágio 3: Critérios + Blacklist + Aba Rotina
    var avaliacao = avaliarCriteriosMedico(oferta, cfgGlobal);
    if (!avaliacao.aprovado) {
      stats.rejeitadasCriterios = (Number(stats.rejeitadasCriterios) || 0) + 1;
      if (avaliacao.codigo === "BLACKLIST_CALOTE") {
        stats.calotesEvitados += 1;
      }
      salvarEstatisticas(stats);
      _registrarNoHistorico({
        status: "REJEITADA_CRITERIOS",
        codigo: avaliacao.codigo,
        motivo: avaliacao.motivo,
        hospital: oferta.hospital,
        setor: oferta.setor,
        valorTotal: oferta.valorTotal,
        grupo: oferta.grupoOrigem
      });
      return {
        status: "REJEITADA_CRITERIOS",
        codigo: avaliacao.codigo,
        motivo: avaliacao.motivo,
        oferta: oferta
      };
    }

    // Estágio 4: Match Perfeito! Respeita a permissão individual do grupo (RADAR_ONLY vs SNIPER_AUTO)
    salvarOfertaEmMemoria(oferta);
    var stealth = gerarDisparoStealthWhatsApp(oferta, cfgGlobal, oferta.grupoOrigem);
    var agendamentoRotina = null;

    var grupoPermiteDisparoAuto = isolamento.modoGrupo !== "RADAR_ONLY";
    var executarAuto = cfgGlobal.modoOperacao === "SNIPER_AUTO" && grupoPermiteDisparoAuto;

    if (executarAuto) {
      stats.plantoesCapturados += 1;
      stats.receitaGarantidaReais += Number(oferta.valorTotal) || 0;
      stats.ultimoDisparoEm = new Date().toISOString();
      if (cfgGlobal.autoAgendarRotina) {
        agendamentoRotina = agendarPlantaoCapturadoNaRotina(oferta);
      }
    }
    salvarEstatisticas(stats);

    var statusFinal = executarAuto ? "CAPTURADA_SNIPER_AUTO" : "AGUARDANDO_APROVACAO_SEMI_AUTO";
    _registrarNoHistorico({
      status: statusFinal,
      codigo: "MATCH_PERFEITO",
      hashOferta: oferta.hashOferta,
      hospital: oferta.hospital,
      cidade: oferta.cidade,
      setor: oferta.setor,
      valorTotal: oferta.valorTotal,
      grupo: oferta.grupoOrigem
    });

    var targetChatId = opts.notificarTelegramChatId || opts.chatId;
    if (targetChatId) {
      enviarCardVagaTelegram(targetChatId, oferta, cfgGlobal, stealth, agendamentoRotina, executarAuto);
    }

    return {
      status: statusFinal,
      codigo: "MATCH_PERFEITO",
      modoGrupoAplicado: isolamento.modoGrupo,
      oferta: oferta,
      stealth: stealth,
      agendamentoRotina: agendamentoRotina
    };
  }

  // --------------------------------------------------------------------------
  // Confirmação 1-Click (Modo Semi-Auto / Botão Claim no Telegram)
  // --------------------------------------------------------------------------
  function confirmarCapturaSemiAuto(hashOferta) {
    var oferta = obterOfertaEmMemoria(hashOferta);
    if (!oferta) {
      return {
        sucesso: false,
        motivo: "VAGA_EXPIRADA_MEMORIA"
      };
    }

    var cfg = obterConfigSniper();
    var agendamento = agendarPlantaoCapturadoNaRotina(oferta);
    var stealth = gerarDisparoStealthWhatsApp(oferta, cfg, oferta.grupoOrigem);

    var stats = obterEstatisticas();
    stats.plantoesCapturados += 1;
    stats.receitaGarantidaReais += Number(oferta.valorTotal) || 0;
    stats.ultimoDisparoEm = new Date().toISOString();
    salvarEstatisticas(stats);

    // Se o Bridge WhatsApp estiver ativo no runtime, enfileira o disparo real para o escalista
    var disparoBridge = false;
    if (typeof globalThis !== "undefined" && globalThis.WhatsAppBridgeService && typeof globalThis.WhatsAppBridgeService.dispararCapturaSniper === "function") {
      try {
        globalThis.WhatsAppBridgeService.dispararCapturaSniper(oferta, stealth);
        disparoBridge = true;
      } catch (e) {}
    }

    return {
      sucesso: true,
      oferta: oferta,
      agendamentoRotina: agendamento,
      stealth: stealth,
      disparoBridgeExecutado: disparoBridge
    };
  }

  // --------------------------------------------------------------------------
  // Notificação Rica no Telegram (Card de Vaga + Botões 1-Click)
  // --------------------------------------------------------------------------
  function enviarCardVagaTelegram(chatId, oferta, config, stealth, agendamentoRotina, foiExecutadoAuto) {
    if (!chatId || typeof enviarMensagemComTecladoParaChat !== "function") return;
    var ehAuto = typeof foiExecutadoAuto === "boolean"
      ? foiExecutadoAuto
      : (config.modoOperacao === "SNIPER_AUTO");

    var cabecalho = ehAuto
      ? "🎯 *PLANTÃO CAPTURADO PELO SNIPER!*"
      : "🔔 *VAGA FILÉ DETECTADA (MODO 1-CLICK)*";

    var statusStealth = ehAuto
      ? (config.responderApenasPv
          ? "🕵️ *Stealth Fantasma:* Mensagem enviada direto no PV do escalista (`" + stealth.jitterDelayMs + "ms`)"
          : "⚡ *Disparo Duplo:* Respondido no grupo + PV do escalista (`" + stealth.jitterDelayMs + "ms`)")
      : "⏳ *Aguardando seu clique abaixo para disparar e agendar na Rotina.*";

    var linhaRotina = agendamentoRotina && agendamentoRotina.agendado
      ? "✅ *Aba Rotina:* Bloco de Plantão injetado automaticamente em `" + agendamentoRotina.dataIso + "`!"
      : "📅 *Aba Rotina:* Sem conflitos no horário (`" + oferta.dataTurnoChave + "`).";

    var linhaContato = stealth && stealth.temContatoValido
      ? "📞 *Escalista:* `+" + stealth.destinatarioPv + "`"
      : "📞 *Escalista:* _Contato via grupo (sem telefone explícito)_";

    var msg = [
      cabecalho,
      "━━━━━━━━━━━━━━━━━━━━",
      "🏥 *Unidade:* " + oferta.hospital + " (" + oferta.cidade + ")",
      "🩺 *Setor:* " + oferta.setor,
      "🕒 *Turno:* " + oferta.horarioDescricao + " (" + oferta.duracaoHoras + "h)",
      "💰 *Valor:* *R$ " + oferta.valorTotal + "* (`R$ " + oferta.valorHora + "/h` — " + oferta.modalidadePagamento + ")",
      "📱 *Grupo:* " + (oferta.grupoOrigem || "Plantões Médicos SP"),
      linhaContato,
      "",
      statusStealth,
      linhaRotina
    ].join("\n");

    var botoes = [];
    if (!ehAuto) {
      botoes.push([
        {
          text: "⚡ Pegar Vaga + Agendar na Rotina",
          callback_data: "sniper:claim:" + oferta.hashOferta
        }
      ]);
    }
    if (stealth && stealth.linkWhatsAppDireto) {
      botoes.push([
        {
          text: "💬 Abrir WhatsApp do Escalista",
          url: stealth.linkWhatsAppDireto
        }
      ]);
    }
    botoes.push([
      {
        text: "🚫 Denunciar Calote",
        callback_data: "sniper:denunciar:" + String(oferta.hospital).slice(0, 28)
      },
      {
        text: "🎛️ Painel Sniper",
        callback_data: "sniper:painel"
      }
    ]);

    enviarMensagemComTecladoParaChat(chatId, msg, { inline_keyboard: botoes });
  }

  // --------------------------------------------------------------------------
  // Simulador Integrado de 8 Vagas Reais (Teste Ponta a Ponta no Telegram)
  // --------------------------------------------------------------------------
  function executarSimulacaoSniper(chatId) {
    destravarTodaAgendaSniper();

    var bateria = [
      {
        grupo: "Plantões Premium SP & ABC",
        remoteJid: "120363011111111@g.us",
        remetente: "5511991112222",
        texto: "Bom dia colegas! Alguém sabe se o estacionamento do Hospital Municipal está funcionando hoje?"
      },
      {
        grupo: "Plantões Premium SP & ABC",
        remoteJid: "120363011111111@g.us",
        remetente: "5511992223333",
        texto: "Olá pessoal, estou disponível para plantão hoje à noite ou amanhã diurno em SP ou ABC. CRM/SP ativo!"
      },
      {
        grupo: "Plantões Premium SP & ABC",
        remoteJid: "120363011111111@g.us",
        remetente: "5511993334444",
        texto: "🚨 VAGA URGENTE HOJE NOTURNO (19h às 07h) - UPA Fantasma Sul (São Paulo). Porta Ficha Verde. Valor: R$ 1.600 no PIX! Chamar 11993334444"
      },
      {
        grupo: "Plantões Grande SP",
        remoteJid: "120363022222222@g.us",
        remetente: "5511994445555",
        texto: "Preciso de médico para cobertura HOJE NOTURNO 19h às 07h - AMA Zona Leste (São Paulo) - Porta Clínica Médica - Valor R$ 950 PJ."
      },
      {
        grupo: "Plantões Premium SP & ABC",
        remoteJid: "120363011111111@g.us",
        remetente: "5511995556666",
        texto: "Vaga HOJE NOTURNO 19h às 07h - Hospital Santa Marcelina (São Paulo) - Setor: ORTOPEDIA / TRAUMA. Valor: 1.700,00. Contato: 11995556666"
      },
      {
        grupo: "Plantões Premium SP & ABC",
        remoteJid: "120363011111111@g.us",
        remetente: "5511988887777",
        texto: "🔥 COBERTURA HOJE NOTURNO (19h às 07h - 12h)\n📍 Hospital 9 de Julho (São Paulo)\n🩺 Setor: Pronto Atendimento / Ficha Verde (Porta)\n💰 Valor: R$ 1.560,00 (PIX à vista pós-plantão)\n📲 Interessados chamar escalista: (11) 98888-7777"
      },
      {
        grupo: "Plantões Grande SP",
        remoteJid: "120363022222222@g.us",
        remetente: "5511988887777",
        texto: "🔥 COBERTURA HOJE NOTURNO (19h às 07h - 12h)\n📍 Hospital 9 de Julho (São Paulo)\n🩺 Setor: Pronto Atendimento / Ficha Verde (Porta)\n💰 Valor: R$ 1.560,00 (PIX à vista pós-plantão)\n📲 Interessados chamar escalista: (11) 98888-7777"
      },
      {
        grupo: "Plantões Premium SP & ABC",
        remoteJid: "120363011111111@g.us",
        remetente: "5511977776666",
        texto: "Vaga HOJE NOTURNO (19h às 07h) - Hospital Brasil (Santo André - ABC). Setor: Porta Clínica Médica. Valor: R$ 1.500 PIX na saída! Chamar 11977776666"
      }
    ];

    try {
      var cache = CacheService.getScriptCache();
      for (var c = 0; c < bateria.length; c++) {
        var h = gerarHashOferta(bateria[c].texto);
        cache.put("SNIPER_DEDUP_" + h, "", 1);
      }
    } catch (e) {}

    var logs = [];
    for (var i = 0; i < bateria.length; i++) {
      var item = bateria[i];
      var ehVagaVencedora = i === 5;
      var res = processarMensagemGrupoWhatsApp(
        item.texto,
        item.grupo,
        item.remetente,
        {
          remoteJid: item.remoteJid,
          exigirAllowlist: false,
          notificarTelegramChatId: ehVagaVencedora ? chatId : null
        }
      );
      logs.push({
        indice: i + 1,
        grupo: item.grupo,
        status: res.status,
        codigo: res.codigo || res.status,
        detalhe: res.motivo || (res.oferta ? res.oferta.hospital + " (R$ " + res.oferta.valorTotal + ")" : "")
      });
    }

    return logs;
  }

  return {
    // Config
    obterConfigSniper: obterConfigSniper,
    obterConfig: obterConfigSniper,
    salvarConfigSniper: salvarConfigSniper,
    salvarConfig: salvarConfigSniper,
    redefinirConfigPadrao: redefinirConfigPadrao,

    // Métricas e Histórico
    obterEstatisticas: obterEstatisticas,
    obterMetricas: obterEstatisticas,
    salvarEstatisticas: salvarEstatisticas,
    registrarMetrica: registrarMetrica,
    obterHistorico: obterHistorico,
    limparHistorico: limparHistorico,
    obterOfertaEmMemoria: obterOfertaEmMemoria,
    obterOfertaPorId: obterOfertaEmMemoria,

    // Blacklist Anti-Calote
    obterBlacklistCalote: obterBlacklistCalote,
    obterBlacklist: obterBlacklistCalote,
    adicionarBlacklistCalote: adicionarBlacklistCalote,
    adicionarTermoBlacklist: adicionarBlacklistCalote,
    removerTermoBlacklist: removerTermoBlacklist,
    verificarBlacklist: verificarBlacklist,

    // Allowlist Zero-Trust de Grupos
    obterGruposAllowlist: obterGruposAllowlist,
    salvarGruposAllowlist: salvarGruposAllowlist,
    atualizarStatusGrupoAllowlist: atualizarStatusGrupoAllowlist,
    sincronizarGruposWhatsApp: sincronizarGruposWhatsApp,
    alternarPermissaoGrupo: alternarPermissaoGrupo,
    validarIsolamentoCamada1E2: validarIsolamentoCamada1E2,

    // Setores e Cidades
    obterCatalogoSetoresDisponiveis: obterCatalogoSetoresDisponiveis,
    alternarSetorPermitido: alternarSetorPermitido,
    redefinirSetoresPadrao: redefinirSetoresPadrao,
    obterCatalogoCidadesDisponiveis: obterCatalogoCidadesDisponiveis,
    alternarCidadePermitida: alternarCidadePermitida,
    redefinirCidadesPadrao: redefinirCidadesPadrao,
    definirTodasCidades: definirTodasCidades,

    // Agenda e Slots
    obterSlotsTravados: obterSlotsTravados,
    travarSlotPlantao: travarSlotPlantao,
    liberarSlotPlantao: liberarSlotPlantao,
    destravarTodaAgendaSniper: destravarTodaAgendaSniper,
    verificarConflitoNaRotina: verificarConflitoNaRotina,
    agendarPlantaoCapturadoNaRotina: agendarPlantaoCapturadoNaRotina,

    // Pipeline e Extração
    filtroRapidoEstagio1: filtroRapidoEstagio1,
    extrairDadosPlantao: extrairDadosPlantao,
    avaliarCriteriosMedico: avaliarCriteriosMedico,
    gerarDisparoStealthWhatsApp: gerarDisparoStealthWhatsApp,
    processarMensagemGrupoWhatsApp: processarMensagemGrupoWhatsApp,
    confirmarCapturaSemiAuto: confirmarCapturaSemiAuto,
    gerarCodigoPareamentoWhatsApp: gerarCodigoPareamentoWhatsApp,
    executarSimulacaoSniper: executarSimulacaoSniper
  };
})();

// ============================================================================
// UI TELEGRAM: PAINEL DE COMANDO E CALLBACKS DO SNIPER DE PLANTÕES
// ============================================================================

function _construirPainelGruposAllowlistTelegram(notaTopo) {
  var grupos = PlantaoSniperService.obterGruposAllowlist();
  var liberados = 0;
  var linhasGrupos = [];
  var inlineKeyboard = [];

  for (var i = 0; i < grupos.length; i++) {
    var g = grupos[i];
    var icone = "🔴 BLOQUEADO";
    var iconeCurto = "🔴";

    if (g.permitido && g.modoGrupo === "SNIPER_AUTO") {
      icone = "🟢 SNIPER AUTO (Lê + Responde)";
      iconeCurto = "🟢 AUTO";
      liberados++;
    } else if (g.permitido && g.modoGrupo === "RADAR_ONLY") {
      icone = "👁️ SÓ RADAR (Apenas Leitura)";
      iconeCurto = "👁️ RADAR";
      liberados++;
    }

    linhasGrupos.push(
      (i + 1) + ". *" + g.nome + "*\n" +
      "   └ " + icone + " (`" + g.jid + "`)"
    );

    var nomeBotao = g.nome.length > 22 ? g.nome.substring(0, 22) + "..." : g.nome;
    inlineKeyboard.push([
      {
        text: iconeCurto + " | " + nomeBotao,
        callback_data: "sniper:grp_toggle:" + i
      }
    ]);
  }

  inlineKeyboard.push([
    { text: "🔄 Sincronizar Grupos", callback_data: "sniper:grp_sync" },
    { text: "🔙 Voltar ao Sniper", callback_data: "sniper:painel" }
  ]);

  var cabecalho = notaTopo ? "✅ _" + notaTopo + "_\n\n" : "";
  var texto = [
    cabecalho + "🛡️ *ALLOWLIST ZERO-TRUST DE GRUPOS WHATSAPP*",
    "━━━━━━━━━━━━━━━━━━━━",
    "🔒 *Camada 1 (Hard-Coded):* 100% das conversas privadas (`@s.whatsapp.net`), Status e mensagens próprias são descartadas na memória.",
    "🛡️ *Camada 2 (Allowlist):* Somente grupos autorizados abaixo são lidos (*" + liberados + "/" + grupos.length + " liberados*).",
    "📍 *Abrangência:* As cidades são definidas pelos grupos de WhatsApp em que você entrar.",
    "",
    "*Toque em um grupo abaixo para alternar o nível de acesso:*",
    "• 🔴 *BLOQUEADO:* Ignora 100% do grupo.",
    "• 👁️ *SÓ RADAR:* Lê vagas e avisa no Telegram, mas NUNCA digita no grupo.",
    "• 🟢 *SNIPER AUTO:* Lê vagas e responde automaticamente quando bater os critérios.",
    "",
    linhasGrupos.join("\n\n")
  ].join("\n");

  return {
    texto: texto,
    teclado: { inline_keyboard: inlineKeyboard }
  };
}

function _construirPainelSetoresTelegram(notaTopo) {
  var cfg = PlantaoSniperService.obterConfigSniper();
  var catalogo = PlantaoSniperService.obterCatalogoSetoresDisponiveis();
  var ativos = Array.isArray(cfg.setoresPermitidos) ? cfg.setoresPermitidos : [];

  var mapaAtivos = {};
  for (var a = 0; a < ativos.length; a++) {
    mapaAtivos[String(ativos[a]).toLowerCase()] = true;
  }

  var inlineKeyboard = [];
  var linhaAtual = [];

  for (var i = 0; i < catalogo.length; i++) {
    var nomeSetor = catalogo[i];
    var estaAtivo = !!mapaAtivos[String(nomeSetor).toLowerCase()];
    var labelBotao = (estaAtivo ? "✅ " : "⬜ ") + nomeSetor;

    linhaAtual.push({
      text: labelBotao,
      callback_data: "sniper:setor_toggle:" + i
    });

    if (linhaAtual.length === 2) {
      inlineKeyboard.push(linhaAtual);
      linhaAtual = [];
    }
  }
  if (linhaAtual.length > 0) {
    inlineKeyboard.push(linhaAtual);
  }

  inlineKeyboard.push([
    { text: "♻️ Restaurar Padrão", callback_data: "sniper:setor_reset" },
    { text: "🔙 Voltar ao Sniper", callback_data: "sniper:painel" }
  ]);

  var cabecalho = notaTopo ? "✅ _" + notaTopo + "_\n\n" : "";
  var resumoAtivos = ativos.length > 0 ? ativos.join(", ") : "_Nenhum setor selecionado_";

  var texto = [
    cabecalho + "🩺 *SETORES E ESPECIALIDADES PERMITIDAS*",
    "━━━━━━━━━━━━━━━━━━━━",
    "O Sniper aceita exclusivamente ofertas cujo setor esteja marcado com ✅ abaixo.",
    "Vagas de outras especialidades (ex: Ortopedia, GO, Psiquiatria, UTI) são filtradas e rejeitadas no Estágio 3.",
    "",
    "📌 *Ativos agora (" + ativos.length + "):* " + resumoAtivos,
    "",
    "👇 *Toque para ativar ou desativar um setor:*"
  ].join("\n");

  return {
    texto: texto,
    teclado: { inline_keyboard: inlineKeyboard }
  };
}

function _construirPainelSniperTelegram() {
  var cfg = PlantaoSniperService.obterConfigSniper();
  var stats = PlantaoSniperService.obterEstatisticas();
  var blacklist = PlantaoSniperService.obterBlacklistCalote();
  var gruposAllowlist = PlantaoSniperService.obterGruposAllowlist();
  var qtdLiberados = 0;
  for (var gIdx = 0; gIdx < gruposAllowlist.length; gIdx++) {
    if (gruposAllowlist[gIdx].permitido && gruposAllowlist[gIdx].modoGrupo !== "BLOQUEADO") {
      qtdLiberados++;
    }
  }

  var labelModo = cfg.modoOperacao === "SNIPER_AUTO"
    ? "🟢 SNIPER AUTOMÁTICO (Disparo + Rotina)"
    : "🟡 SEMI-AUTOMÁTICO (1-Click no Telegram)";

  var labelStealth = cfg.responderApenasPv
    ? "🕵️ LIGADO (Só chama no PV do escalista)"
    : "📢 PADRÃO (Responde no Grupo + PV)";

  var texto = [
    "🎯 *SNIPER DE PLANTÕES — ULTRA ROTINA*",
    "━━━━━━━━━━━━━━━━━━━━",
    "👨‍⚕️ *Titular:* " + cfg.nome + " (" + cfg.crm + ")",
    "⚙️ *Modo de Operação:* " + labelModo,
    "🛡️ *Modo Fantasma (PV):* " + labelStealth,
    "🔒 *Blindagem WhatsApp:* Zero-Trust Ativo (*" + qtdLiberados + "/" + gruposAllowlist.length + " grupos liberados* | 100% chats privados bloqueados)",
    "💰 *Piso Mínimo (12h):* *R$ " + cfg.valorMinimo12h + "* (`R$ " + cfg.valorMinimoHora + "/h`)",
    "🩺 *Setores (" + (cfg.setoresPermitidos || []).length + "):* " + (cfg.setoresPermitidos || []).join(", "),
    "📅 *Sync Aba Rotina:* Ativo (Anti-Conflito + Auto-Bloco)",
    "",
    "📊 *PLACAR EM TEMPO REAL*",
    "• Mensagens analisadas: *" + stats.totalAnalisadas + "*",
    "• Calotes bloqueados: *🚫 " + stats.calotesEvitados + "* (" + blacklist.length + " na Blacklist)",
    "• Plantões capturados: *⚡ " + stats.plantoesCapturados + "*",
    "• Receita garantida: *💵 R$ " + stats.receitaGarantidaReais + "*"
  ].join("\n");

  var teclado = {
    inline_keyboard: [
      [
        {
          text: "🛡️ Grupos Permitidos (Allowlist: " + qtdLiberados + "/" + gruposAllowlist.length + ")",
          callback_data: "sniper:grupos"
        }
      ],
      [
        {
          text: "🩺 Setores Permitidos (" + (cfg.setoresPermitidos || []).length + ")",
          callback_data: "sniper:setores"
        },
        {
          text: "💰 Definir Piso Mínimo",
          callback_data: "sniper:menu_piso"
        }
      ],
      [
        {
          text: cfg.modoOperacao === "SNIPER_AUTO" ? "🔄 Modo: Sniper Auto" : "🔄 Modo: Semi-Auto",
          callback_data: "sniper:toggle_mode"
        },
        {
          text: cfg.responderApenasPv ? "🕵️ Stealth PV: ON" : "🕵️ Stealth PV: OFF",
          callback_data: "sniper:toggle_stealth"
        }
      ],
      [
        { text: "🚫 Blacklist Anti-Calote", callback_data: "sniper:blacklist" },
        { text: "📱 Parear Whats (8 Dígitos)", callback_data: "sniper:pair_wa" }
      ],
      [
        { text: "🛠️ Diagnóstico & Ferramentas", callback_data: "sniper:diag" }
      ],
      [
        { text: "🔙 Central de Rotina", callback_data: "ux:hub:rotina" },
        { text: "🏠 Início", callback_data: "ux:hub:inicio" }
      ]
    ]
  };

  return { texto: texto, teclado: teclado };
}

function _enviarOuEditarPainelSniper(chatId, msgId, token, texto, teclado) {
  if (msgId && token && typeof executarPostTelegram === "function") {
    try {
      var url = "https://api.telegram.org/bot" + token + "/editMessageText";
      var res = executarPostTelegram(url, {
        chat_id: String(chatId),
        message_id: Number(msgId),
        text: texto,
        parse_mode: "Markdown",
        reply_markup: teclado
      });
      if (res && res.ok) return true;
    } catch (e) {}
  }
  if (typeof enviarMensagemComTecladoParaChat === "function") {
    enviarMensagemComTecladoParaChat(chatId, texto, teclado);
    return true;
  }
  if (typeof enviarMensagemParaChat === "function") {
    enviarMensagemParaChat(chatId, texto);
    return true;
  }
  return false;
}

function tratarComandoSniperPlantoes(chatId, argTexto, msgId) {
  var arg = String(argTexto || "").trim();
  var argLower = arg.toLowerCase();

  if (argLower.indexOf("calote ") === 0) {
    var termo = arg.slice(7).trim();
    PlantaoSniperService.adicionarBlacklistCalote(termo, "Adicionado via comando /sniper calote");
    enviarMensagemParaChat(chatId, "🚫 *" + termo + "* adicionado à Blacklist Anti-Calote com sucesso!");
  } else if (argLower === "grupos") {
    var telaGrp = _construirPainelGruposAllowlistTelegram();
    return _enviarOuEditarPainelSniper(chatId, msgId, null, telaGrp.texto, telaGrp.teclado);
  } else if (argLower === "setores") {
    var telaSet = _construirPainelSetoresTelegram();
    return _enviarOuEditarPainelSniper(chatId, msgId, null, telaSet.texto, telaSet.teclado);
  } else if (argLower.indexOf("parear") === 0) {
    var foneArg = arg.replace(/^parear\s*/i, "").trim();
    var resPair = PlantaoSniperService.gerarCodigoPareamentoWhatsApp(foneArg);
    if (!resPair.sucesso) {
      enviarMensagemParaChat(
        chatId,
        "📱 *Pareamento WhatsApp (8 Dígitos)*\n\n" +
        "⚠️ " + resPair.motivo + "\n" +
        "Envie: `/sniper parear 11988887777`"
      );
      return true;
    }
    enviarMensagemParaChat(
      chatId,
      "📱 *CÓDIGO DE PAREAMENTO GERADO!*\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "📞 *Número:* `+" + resPair.telefone + "`\n" +
      "🔑 *Código 8 Dígitos:* `" + resPair.codigo + "`\n\n" +
      "Abra o *WhatsApp > Aparelhos Conectados > Conectar com número de telefone* e insira o código acima."
    );
    return true;
  } else if (argLower === "simular") {
    var logs = PlantaoSniperService.executarSimulacaoSniper(chatId);
    var resumo = ["🧪 *SIMULAÇÃO DE 8 MENSAGENS REAIS CONCLUÍDA:*", ""];
    for (var i = 0; i < logs.length; i++) {
      resumo.push("`" + logs[i].indice + ".` *" + logs[i].status + "* — _" + logs[i].detalhe + "_");
    }
    enviarMensagemParaChat(chatId, resumo.join("\n"));
    return true;
  } else if (argLower.indexOf("piso") === 0 || /^\d+$/.test(arg)) {
    var valorStr = arg.replace(/^[^\d]*/, "").trim();
    var valorNum = parseInt(valorStr, 10);
    if (valorNum && valorNum >= 500 && valorNum <= 10000) {
      var atualizado = PlantaoSniperService.salvarConfigSniper({ valorMinimo12h: valorNum });
      enviarMensagemParaChat(
        chatId,
        "💰 *Piso Mínimo Atualizado com Sucesso!*\n\n" +
        "Novo piso configurado: *R$ " + atualizado.valorMinimo12h + "/12h* (`R$ " + atualizado.valorMinimoHora + "/h`).\n" +
        "Plantões com remuneração inferior a este piso serão recusados automaticamente."
      );
      return true;
    } else {
      enviarMensagemParaChat(
        chatId,
        "⚠️ *Valor inválido.* Envie um valor entre R$ 500 e R$ 10.000.\nExemplo: `/piso 1500` ou `/sniper piso 1600`"
      );
      return true;
    }
  }

  var painel = _construirPainelSniperTelegram();
  return _enviarOuEditarPainelSniper(chatId, msgId, null, painel.texto, painel.teclado);
}

function tratarCallbackSniperPlantoes(cb, data, ctx) {
  var chatId = (ctx && ctx.chatId) || (cb && cb.message && cb.message.chat && cb.message.chat.id);
  var msgId = (ctx && ctx.msgId) || (cb && cb.message && cb.message.message_id);
  var token = (ctx && ctx.token) || (typeof ConfigService !== "undefined" ? ConfigService.get("TELEGRAM_BOT_TOKEN", "") : "");
  var cbId = cb && cb.id;

  if (!chatId) return false;

  var acao = String(data || "").replace(/^sniper:/, "");

  if (acao === "painel") {
    if (cbId && typeof responderCallbackTelegram === "function") {
      responderCallbackTelegram(cbId, "🎯 Painel Sniper atualizado!", false);
    }
    var p0 = _construirPainelSniperTelegram();
    return _enviarOuEditarPainelSniper(chatId, msgId, token, p0.texto, p0.teclado);
  }

  if (acao === "grupos") {
    if (cbId && typeof responderCallbackTelegram === "function") {
      responderCallbackTelegram(cbId, "🛡️ Allowlist Zero-Trust de grupos carregada!", false);
    }
    var pg = _construirPainelGruposAllowlistTelegram();
    return _enviarOuEditarPainelSniper(chatId, msgId, token, pg.texto, pg.teclado);
  }

  if (acao.indexOf("grp_toggle:") === 0) {
    var idx = parseInt(acao.slice(11), 10);
    var resToggle = PlantaoSniperService.alternarPermissaoGrupo(idx);
    var msgFeedback = resToggle.sucesso && resToggle.grupo
      ? (resToggle.grupo.nome + " -> " + resToggle.grupo.modoGrupo)
      : "Grupo não encontrado";
    if (cbId && typeof responderCallbackTelegram === "function") {
      responderCallbackTelegram(cbId, "🛡️ " + msgFeedback, false);
    }
    var pgToggle = _construirPainelGruposAllowlistTelegram("Permissão atualizada: " + msgFeedback);
    return _enviarOuEditarPainelSniper(chatId, msgId, token, pgToggle.texto, pgToggle.teclado);
  }

  if (acao === "grp_sync") {
    var resSync = PlantaoSniperService.sincronizarGruposWhatsApp();
    var notaSync = "Sincronização concluída (" + resSync.totalGrupos + " grupos verificados; " + resSync.novosAdicionados + " novos em modo 🔴 BLOQUEADO).";
    if (cbId && typeof responderCallbackTelegram === "function") {
      responderCallbackTelegram(cbId, "🔄 Grupos sincronizados em modo Zero-Trust!", false);
    }
    var pgSync = _construirPainelGruposAllowlistTelegram(notaSync);
    return _enviarOuEditarPainelSniper(chatId, msgId, token, pgSync.texto, pgSync.teclado);
  }

  if (acao === "setores") {
    if (cbId && typeof responderCallbackTelegram === "function") {
      responderCallbackTelegram(cbId, "🩺 Catálogo de setores carregado!", false);
    }
    var ps = _construirPainelSetoresTelegram();
    return _enviarOuEditarPainelSniper(chatId, msgId, token, ps.texto, ps.teclado);
  }

  if (acao.indexOf("setor_toggle:") === 0) {
    var idxSetor = parseInt(acao.slice(13), 10);
    var resSet = PlantaoSniperService.alternarSetorPermitido(idxSetor);
    var notaSet = resSet.sucesso
      ? (resSet.setor + (resSet.ativado ? " ativado ✅" : " desativado ⬜"))
      : "Setor não encontrado";
    if (cbId && typeof responderCallbackTelegram === "function") {
      responderCallbackTelegram(cbId, "🩺 " + notaSet, false);
    }
    var psToggle = _construirPainelSetoresTelegram(notaSet);
    return _enviarOuEditarPainelSniper(chatId, msgId, token, psToggle.texto, psToggle.teclado);
  }

  if (acao === "setor_reset") {
    PlantaoSniperService.redefinirSetoresPadrao();
    if (cbId && typeof responderCallbackTelegram === "function") {
      responderCallbackTelegram(cbId, "♻️ Setores padrão restaurados!", false);
    }
    var psReset = _construirPainelSetoresTelegram("Setores padrão restaurados com sucesso!");
    return _enviarOuEditarPainelSniper(chatId, msgId, token, psReset.texto, psReset.teclado);
  }

  if (acao === "toggle_mode") {
    var cfg1 = PlantaoSniperService.obterConfigSniper();
    var novoModo = cfg1.modoOperacao === "SNIPER_AUTO" ? "SEMI_AUTO" : "SNIPER_AUTO";
    PlantaoSniperService.salvarConfigSniper({ modoOperacao: novoModo });
    if (cbId && typeof responderCallbackTelegram === "function") {
      responderCallbackTelegram(
        cbId,
        novoModo === "SNIPER_AUTO"
          ? "🟢 Modo Sniper Automático ativado!"
          : "🟡 Modo Semi-Automático (1-Click) ativado!",
        false
      );
    }
    var p1 = _construirPainelSniperTelegram();
    return _enviarOuEditarPainelSniper(chatId, msgId, token, p1.texto, p1.teclado);
  }

  if (acao === "toggle_stealth") {
    var cfg2 = PlantaoSniperService.obterConfigSniper();
    var novoStealth = !cfg2.responderApenasPv;
    PlantaoSniperService.salvarConfigSniper({ responderApenasPv: novoStealth });
    if (cbId && typeof responderCallbackTelegram === "function") {
      responderCallbackTelegram(
        cbId,
        novoStealth
          ? "🕵️ Modo Fantasma ativado (responde só no PV do escalista)!"
          : "📢 Modo Padrão ativado (responde no Grupo + PV)!",
        false
      );
    }
    var p2 = _construirPainelSniperTelegram();
    return _enviarOuEditarPainelSniper(chatId, msgId, token, p2.texto, p2.teclado);
  }

  if (acao === "val_up" || acao === "val_down") {
    var cfg3 = PlantaoSniperService.obterConfigSniper();
    var delta = acao === "val_up" ? 100 : -100;
    var novoValor = Math.max(600, (Number(cfg3.valorMinimo12h) || 1300) + delta);
    var atualizado = PlantaoSniperService.salvarConfigSniper({ valorMinimo12h: novoValor });
    if (cbId && typeof responderCallbackTelegram === "function") {
      responderCallbackTelegram(
        cbId,
        "💰 Novo piso: R$ " + atualizado.valorMinimo12h + "/12h (R$ " + atualizado.valorMinimoHora + "/h)",
        false
      );
    }
    var p3 = _construirPainelSniperTelegram();
    return _enviarOuEditarPainelSniper(chatId, msgId, token, p3.texto, p3.teclado);
  }

  if (acao === "menu_piso") {
    if (cbId && typeof responderCallbackTelegram === "function") {
      responderCallbackTelegram(cbId, "💰 Selecione ou defina o piso", false);
    }
    var cfgPiso = PlantaoSniperService.obterConfigSniper();
    var msgPiso = [
      "💰 *DEFINIR PISO MÍNIMO DE PLANTÃO (12h)*",
      "━━━━━━━━━━━━━━━━━━━━",
      "Piso atual configurado: *R$ " + cfgPiso.valorMinimo12h + "/12h* (`R$ " + cfgPiso.valorMinimoHora + "/h`)",
      "",
      "Selecione um piso comum abaixo com 1 toque, ou defina qualquer valor digitando `/piso <valor>` no chat (ex: `/piso 1600`):"
    ].join("\n");

    return _enviarOuEditarPainelSniper(chatId, msgId, token, msgPiso, {
      inline_keyboard: [
        [
          { text: "R$ 1.200", callback_data: "sniper:set_piso:1200" },
          { text: "R$ 1.300", callback_data: "sniper:set_piso:1300" },
          { text: "R$ 1.400", callback_data: "sniper:set_piso:1400" }
        ],
        [
          { text: "R$ 1.500", callback_data: "sniper:set_piso:1500" },
          { text: "R$ 1.600", callback_data: "sniper:set_piso:1600" },
          { text: "R$ 1.800", callback_data: "sniper:set_piso:1800" }
        ],
        [
          { text: "R$ 2.000", callback_data: "sniper:set_piso:2000" },
          { text: "R$ 2.200", callback_data: "sniper:set_piso:2200" },
          { text: "R$ 2.500", callback_data: "sniper:set_piso:2500" }
        ],
        [
          { text: "🔙 Voltar ao Painel Sniper", callback_data: "sniper:painel" }
        ]
      ]
    });
  }

  if (acao.indexOf("set_piso:") === 0) {
    var vPiso = parseInt(acao.slice(9), 10);
    if (vPiso && vPiso >= 500) {
      PlantaoSniperService.salvarConfigSniper({ valorMinimo12h: vPiso });
      if (cbId && typeof responderCallbackTelegram === "function") {
        responderCallbackTelegram(cbId, "💰 Piso definido para R$ " + vPiso + "/12h!", false);
      }
    }
    var pAtualizado = _construirPainelSniperTelegram();
    return _enviarOuEditarPainelSniper(chatId, msgId, token, pAtualizado.texto, pAtualizado.teclado);
  }

  if (acao === "unlock_all") {
    PlantaoSniperService.destravarTodaAgendaSniper();
    if (cbId && typeof responderCallbackTelegram === "function") {
      responderCallbackTelegram(cbId, "🔓 Trava de slots do Sniper limpa com sucesso!", false);
    }
    var p4 = _construirPainelSniperTelegram();
    return _enviarOuEditarPainelSniper(chatId, msgId, token, p4.texto, p4.teclado);
  }

  if (acao === "blacklist") {
    var lista = PlantaoSniperService.obterBlacklistCalote();
    var linhas = [
      "🚫 *BLACKLIST ANTI-CALOTE COLABORATIVA*",
      "━━━━━━━━━━━━━━━━━━━━",
      "Unidades e cooperativas bloqueadas automaticamente no Estágio 3:",
      ""
    ];
    for (var i = 0; i < lista.length; i++) {
      linhas.push("• *" + lista[i].termo + "* — _" + (lista[i].motivo || "Restrição financeira") + "_");
    }
    linhas.push("");
    linhas.push("💡 _Para adicionar um novo caloteiro manualmente, envie:_");
    linhas.push("`/sniper calote Nome do Hospital ou Cooperativa`");

    if (cbId && typeof responderCallbackTelegram === "function") {
      responderCallbackTelegram(cbId, "🚫 Blacklist Anti-Calote carregada", false);
    }
    return _enviarOuEditarPainelSniper(chatId, msgId, token, linhas.join("\n"), {
      inline_keyboard: [[{ text: "🔙 Voltar ao Painel Sniper", callback_data: "sniper:painel" }]]
    });
  }

  if (acao === "pair_wa") {
    var cfgWa = PlantaoSniperService.obterConfigSniper();
    var resPairWa = PlantaoSniperService.gerarCodigoPareamentoWhatsApp(cfgWa.telefoneWhatsApp);

    var blocoCodigo = resPairWa.sucesso
      ? (
          "📞 *Telefone Vinculado:* `+" + resPairWa.telefone + "`\n" +
          "🔑 *Código de Pareamento (8 Dígitos):* `" + resPairWa.codigo + "`\n" +
          "🔌 *Canal:* `" + resPairWa.origem + "`"
        )
      : (
          "⚠️ *Nenhum número configurado ainda.*\n" +
          "Para gerar o código de 8 dígitos vinculado ao seu número, envie no chat:\n" +
          "`/sniper parear 11988887777`"
        );

    var msgPair = [
      "📱 *PAREAMENTO WHATSAPP (8 DÍGITOS — SEM QR CODE)*",
      "━━━━━━━━━━━━━━━━━━━━",
      "Para conectar o Listener Baileys/Evolution ao seu WhatsApp usando apenas 1 celular:",
      "",
      "1️⃣ Abra o *WhatsApp* > *Aparelhos Conectados* > *Conectar um aparelho*",
      "2️⃣ Toque em *Conectar com número de telefone*",
      "3️⃣ Use os dados de pareamento abaixo:",
      "",
      blocoCodigo,
      "",
      "🛡️ *Blindagem & Stealth Ativos:*",
      "• `Camada 1`: Bloqueio hard-coded de conversas privadas (`@s.whatsapp.net`) e Status",
      "• `Camada 2`: Apenas grupos marcados como 🟢 ou 👁️ na Allowlist são lidos",
      "• `markOnlineOnConnect: false` & `readMessages: false` (Zero visto azul)",
      "• Jitter Humano `1.8s–3.2s` + Simulação de digitação (`composing`)"
    ].join("\n");

    if (cbId && typeof responderCallbackTelegram === "function") {
      responderCallbackTelegram(cbId, "📱 Painel de pareamento WhatsApp carregado!", false);
    }
    return _enviarOuEditarPainelSniper(chatId, msgId, token, msgPair, {
      inline_keyboard: [
        [{ text: "🔄 Gerar Novo Código", callback_data: "sniper:pair_wa" }],
        [{ text: "🛡️ Configurar Grupos Permitidos", callback_data: "sniper:grupos" }],
        [{ text: "🔙 Voltar ao Painel Sniper", callback_data: "sniper:painel" }]
      ]
    });
  }

  if (acao === "diag") {
    if (cbId && typeof responderCallbackTelegram === "function") {
      responderCallbackTelegram(cbId, "🛠️ Menu de Diagnóstico e Ferramentas", false);
    }
    var msgDiag = [
      "🛠️ *DIAGNÓSTICO & FERRAMENTAS DO SNIPER*",
      "━━━━━━━━━━━━━━━━━━━━",
      "Ferramentas de teste e manutenção técnica:",
      "",
      "🧪 *Simulador de 8 Vagas:* Injeta mensagens sintéticas nos grupos para auditar filtros anti-calote, especialidades, piso salarial e auto-agendamento.",
      "🔓 *Destravar Agenda:* Limpa locks temporários de slots capturados pelo Sniper na sua rotina.",
      "",
      "💡 _Também acessível a qualquer momento via comando:_ `/sniper simular`"
    ].join("\n");

    return _enviarOuEditarPainelSniper(chatId, msgId, token, msgDiag, {
      inline_keyboard: [
        [{ text: "🧪 Simular 8 Vagas WhatsApp", callback_data: "sniper:simular" }],
        [{ text: "🔓 Destravar Agenda Sniper", callback_data: "sniper:unlock_all" }],
        [{ text: "🔙 Voltar ao Painel Sniper", callback_data: "sniper:painel" }]
      ]
    });
  }

  if (acao === "simular") {
    if (cbId && typeof responderCallbackTelegram === "function") {
      responderCallbackTelegram(cbId, "🧪 Rodando bateria de 8 vagas reais...", false);
    }
    var logsSim = PlantaoSniperService.executarSimulacaoSniper(chatId);
    var relatorio = [
      "🧪 *RELATÓRIO DO SIMULADOR SNIPER (8 MENSAGENS)*",
      "━━━━━━━━━━━━━━━━━━━━"
    ];
    for (var j = 0; j < logsSim.length; j++) {
      var l = logsSim[j];
      var icone = l.status.indexOf("CAPTURADA") === 0 || l.status.indexOf("AGUARDANDO") === 0 ? "✅" : "🛡️";
      relatorio.push(icone + " *Msg #" + l.indice + "* (" + l.grupo + "): `" + l.status + "`\n   ↳ _" + l.detalhe + "_");
    }
    relatorio.push("");
    relatorio.push("📌 _O Card da vaga vencedora (Hospital 9 de Julho R$ 1.560) foi enviado acima e agendado na sua Aba Rotina!_");

    return _enviarOuEditarPainelSniper(chatId, msgId, token, relatorio.join("\n"), {
      inline_keyboard: [
        [
          { text: "📅 Ver Minha Rotina Hoje", callback_data: "rotina:refresh" },
          { text: "🎛️ Painel Sniper", callback_data: "sniper:painel" }
        ]
      ]
    });
  }

  if (acao.indexOf("claim:") === 0) {
    var hash = acao.slice(6);
    var resultadoClaim = PlantaoSniperService.confirmarCapturaSemiAuto(hash);
    if (!resultadoClaim.sucesso) {
      if (cbId && typeof responderCallbackTelegram === "function") {
        responderCallbackTelegram(cbId, "⚠️ Vaga expirada do buffer de memória.", true);
      }
      return true;
    }

    var ofertaClaim = resultadoClaim.oferta;
    var ag = resultadoClaim.agendamentoRotina || {};
    var st = resultadoClaim.stealth || {};

    if (cbId && typeof responderCallbackTelegram === "function") {
      responderCallbackTelegram(cbId, "⚡ Plantão capturado, contabilizado e agendado na Rotina!", false);
    }

    var textoConfirmacao = [
      "✅ *PLANTÃO CONFIRMADO E AGENDADO NA ROTINA!*",
      "━━━━━━━━━━━━━━━━━━━━",
      "🏥 *Unidade:* " + ofertaClaim.hospital + " (" + ofertaClaim.setor + ")",
      "🕒 *Turno:* " + ofertaClaim.horarioDescricao,
      "💰 *Valor Contabilizado:* *R$ " + ofertaClaim.valorTotal + "*",
      "📅 *Aba Rotina:* Bloco injetado em `" + (ag.dataIso || "hoje") + "`",
      "",
      resultadoClaim.disparoBridgeExecutado
        ? "⚡ *Bridge WhatsApp:* Mensagem Stealth enviada automaticamente ao escalista!"
        : (st.linkWhatsAppDireto
            ? "👇 *Toque abaixo para abrir a conversa com o escalista com a mensagem já preenchida:*"
            : "ℹ️ _Confirme diretamente no grupo de origem._")
    ].join("\n");

    var botoesClaim = [];
    if (st.linkWhatsAppDireto) {
      botoesClaim.push([{ text: "💬 Enviar Mensagem ao Escalista", url: st.linkWhatsAppDireto }]);
    }
    botoesClaim.push([{ text: "🎛️ Painel Sniper", callback_data: "sniper:painel" }]);

    if (typeof enviarMensagemComTecladoParaChat === "function") {
      enviarMensagemComTecladoParaChat(chatId, textoConfirmacao, { inline_keyboard: botoesClaim });
    } else if (typeof enviarMensagemParaChat === "function") {
      enviarMensagemParaChat(chatId, textoConfirmacao);
    }
    return true;
  }

  if (acao.indexOf("denunciar:") === 0) {
    var hosp = acao.slice(10).trim();
    PlantaoSniperService.adicionarBlacklistCalote(hosp, "Denunciado com 1 clique pelo médico no alerta de vaga");
    if (cbId && typeof responderCallbackTelegram === "function") {
      responderCallbackTelegram(cbId, "🚫 " + hosp + " adicionado à Blacklist Anti-Calote!", true);
    }
    return true;
  }

  return false;
}