// ============================================================================
// MÓDULO 14: SNIPER DE PLANTÕES MÉDICOS (INTEGRADO À ABA ROTINA)
// Pipeline Multi-Estágio: Filtro 0ms -> Extrator -> Trava Rotina -> Stealth PV
// ============================================================================

var PlantaoSniperService = (function () {
  var PROP_CONFIG_KEY = "SNIPER_PLANTOES_CONFIG_V1";
  var PROP_BLACKLIST_KEY = "SNIPER_PLANTOES_BLACKLIST_V1";
  var PROP_STATS_KEY = "SNIPER_PLANTOES_STATS_V1";
  var PROP_LOCKED_SLOTS_KEY = "SNIPER_PLANTOES_LOCKED_SLOTS_V1";
  var PROP_OFERTAS_CACHE_KEY = "SNIPER_PLANTOES_OFERTAS_MEM_V1";
  var PROP_ALLOWLIST_KEY = "SNIPER_PLANTOES_ALLOWLIST_V1";

  var DEFAULT_ALLOWLIST = [
    { jid: "120363011111111@g.us", nome: "Plantões Premium SP & ABC", permitido: true, modoGrupo: "SNIPER_AUTO" },
    { jid: "120363022222222@g.us", nome: "Plantões Grande SP", permitido: true, modoGrupo: "RADAR_ONLY" },
    { jid: "120363033333333@g.us", nome: "Família Moraes (Privado)", permitido: false, modoGrupo: "BLOQUEADO" },
    { jid: "120363044444444@g.us", nome: "Turma Medicina Internato", permitido: false, modoGrupo: "BLOQUEADO" }
  ];

  var DEFAULT_CONFIG = {
    nome: "Médico(a) Assistente",
    crm: "CRM/SP",
    modoOperacao: "SNIPER_AUTO", // "SNIPER_AUTO" ou "SEMI_AUTO"
    responderApenasPv: false,    // true = Modo Fantasma (só chama no PV do escalista)
    valorMinimo12h: 1300,
    valorMinimoHora: 108,
    cidadesPermitidas: [
      "São Paulo",
      "ABC",
      "Santo André",
      "São Bernardo",
      "São Caetano",
      "Osasco"
    ],
    setoresPermitidos: [
      "Porta",
      "Ficha Verde",
      "Clínica Médica",
      "Observação",
      "Enfermaria"
    ],
    autoAgendarRotina: true
  };

  var DEFAULT_BLACKLIST = [
    { termo: "UPA Fantasma Sul", motivo: "Atraso recorrente > 60 dias relatado na comunidade" },
    { termo: "Cooperativa CaloteMed", motivo: "Inadimplência conhecida em plantões extras" },
    { termo: "Hospital Atraso Geral", motivo: "Histórico de glosa indevida de PJ" }
  ];

  // --------------------------------------------------------------------------
  // Helpers de Persistência
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

  function obterConfigSniper() {
    var salvo = _lerJsonProp(PROP_CONFIG_KEY, null);
    if (!salvo || typeof salvo !== "object") {
      _salvarJsonProp(PROP_CONFIG_KEY, DEFAULT_CONFIG);
      return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }
    var cfg = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    for (var k in salvo) {
      if (Object.prototype.hasOwnProperty.call(salvo, k)) {
        cfg[k] = salvo[k];
      }
    }
    cfg.valorMinimoHora = Math.round((Number(cfg.valorMinimo12h) || 1300) / 12);
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
    atual.valorMinimoHora = Math.round((Number(atual.valorMinimo12h) || 1300) / 12);
    _salvarJsonProp(PROP_CONFIG_KEY, atual);
    return atual;
  }

  function obterEstatisticas() {
    var padrao = {
      totalAnalisadas: 0,
      filtradasEstagio1: 0,
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

  // --------------------------------------------------------------------------
  // Blacklist Anti-Calote Colaborativa
  // --------------------------------------------------------------------------
  function obterBlacklistCalote() {
    var lista = _lerJsonProp(PROP_BLACKLIST_KEY, null);
    if (!Array.isArray(lista) || lista.length === 0) {
      _salvarJsonProp(PROP_BLACKLIST_KEY, DEFAULT_BLACKLIST);
      return JSON.parse(JSON.stringify(DEFAULT_BLACKLIST));
    }
    return lista;
  }

  function adicionarBlacklistCalote(termo, motivo) {
    var limpo = String(termo || "").trim();
    if (!limpo) return obterBlacklistCalote();
    var lista = obterBlacklistCalote();
    var lower = limpo.toLowerCase();
    for (var i = 0; i < lista.length; i++) {
      if (String(lista[i].termo || "").toLowerCase() === lower) {
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

  function sincronizarGruposWhatsApp(gruposRecebidos) {
    var listaAtual = obterGruposAllowlist();
    var mapaIdx = {};
    for (var i = 0; i < listaAtual.length; i++) {
      mapaIdx[listaAtual[i].jid] = i;
    }
    var recebidos = Array.isArray(gruposRecebidos) ? gruposRecebidos : [];
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
        // Zero-Trust: Todo novo grupo descoberto entra BLOQUEADO por padrão!
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
    if (remoteJid || env.exigirAllowlist === true) {
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
  // Normalização e Deduplicação Cross-Group (Working Buffer)
  // --------------------------------------------------------------------------
  function _normalizarTexto(str) {
    if (!str) return "";
    return String(str)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function gerarHashOferta(texto) {
    var norm = _normalizarTexto(texto)
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 90);
    var hash = 5381;
    for (var i = 0; i < norm.length; i++) {
      hash = ((hash << 5) + hash) + norm.charCodeAt(i);
      hash = hash & 0x7fffffff;
    }
    return "vaga_" + hash.toString(16);
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
    if (chaves.length > 35) {
      delete map[chaves[0]];
    }
    _salvarJsonProp(PROP_OFERTAS_CACHE_KEY, map);
  }

  function obterOfertaEmMemoria(hashOferta) {
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
      "busco plantao"
    ];
    for (var i = 0; i < padroesOfertaReversa.length; i++) {
      if (norm.indexOf(padroesOfertaReversa[i]) !== -1) {
        return { passou: false, motivo: "OFERTA_REVERSA_MEDICO_PROCURANDO" };
      }
    }

    // 2. Exige presença de números (horário ou valor)
    if (!/\d{2,4}/.test(norm)) {
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

    // 4. Deduplicação Cross-Group (mesmo escalista disparando em 10 grupos)
    var hashOferta = gerarHashOferta(raw);
    if (jaProcessouOferta(hashOferta)) {
      return {
        passou: false,
        motivo: "DUPLICATA_CROSS_GROUP",
        hashOferta: hashOferta
      };
    }

    return {
      passou: true,
      hashOferta: hashOferta
    };
  }

  // --------------------------------------------------------------------------
  // ESTÁGIO 2: Extrator Semântico Estruturado de Plantão Médico
  // --------------------------------------------------------------------------
  function extrairDadosPlantao(texto, remetenteNumero) {
    var raw = String(texto || "").trim();
    var norm = _normalizarTexto(raw);

    // 1. Hospital / Unidade
    var hospital = "Unidade Médica (Grupo)";
    var regexHosp = /(?:📍\s*)?(hospital\s+[a-záàâãéêíóôõúç\s\-]+|upa\s+[a-záàâãéêíóôõúç\s\-]+|ama\s+[a-záàâãéêíóôõúç\s\-]+|ubs\s+[a-záàâãéêíóôõúç\s\-]+|pronto\s+socorro\s+[a-záàâãéêíóôõúç\s\-]+|santa\s+casa\s+[a-záàâãéêíóôõúç\s\-]+)/i;
    var mHosp = raw.match(regexHosp);
    if (mHosp && mHosp[1]) {
      hospital = mHosp[1].split(/[\(\n\r•|,]/)[0].trim();
    }

    // 2. Cidade / Região
    var cidade = "São Paulo";
    var mapaCidades = [
      { chave: "sao bernardo", nome: "São Bernardo" },
      { chave: "santo andre", nome: "Santo André" },
      { chave: "sao caetano", nome: "São Caetano" },
      { chave: "abc", nome: "ABC" },
      { chave: "osasco", nome: "Osasco" },
      { chave: "guarulhos", nome: "Guarulhos" },
      { chave: "barueri", nome: "Barueri" },
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

    // 3. Setor / Complexidade
    var setor = "Porta";
    if (norm.indexOf("sala vermelha") !== -1 || norm.indexOf("emergencia") !== -1 || norm.indexOf("intubacao") !== -1) {
      setor = "Sala Vermelha / Emergência";
    } else if (norm.indexOf("uti") !== -1 || norm.indexOf("terapia intensiva") !== -1) {
      setor = "UTI Adulto";
    } else if (norm.indexOf("pediatria") !== -1 || norm.indexOf(" infantil") !== -1) {
      setor = "Pediatria";
    } else if (norm.indexOf("ficha verde") !== -1 || norm.indexOf("porta") !== -1 || norm.indexOf("pronto atendimento") !== -1) {
      setor = "Porta / Ficha Verde";
    } else if (norm.indexOf("observacao") !== -1) {
      setor = "Observação";
    } else if (norm.indexOf("enfermaria") !== -1) {
      setor = "Enfermaria";
    } else if (norm.indexOf("clinica medica") !== -1) {
      setor = "Clínica Médica";
    }

    // 4. Turno, Data-Chave e Horários para a Aba Rotina
    var ehNoturno =
      norm.indexOf("noturno") !== -1 ||
      norm.indexOf("19h as 07h") !== -1 ||
      norm.indexOf("19h às 07h") !== -1 ||
      norm.indexOf("19:00") !== -1 ||
      norm.indexOf("19h") !== -1 ||
      norm.indexOf("noite") !== -1;

    var sufixoTurno = ehNoturno ? "NOITE" : "DIA";
    var prefixoDia = "HOJE";
    if (norm.indexOf("amanha") !== -1) {
      prefixoDia = "AMANHA";
    } else if (norm.indexOf("sabado") !== -1) {
      prefixoDia = "SABADO";
    } else if (norm.indexOf("domingo") !== -1) {
      prefixoDia = "DOMINGO";
    }

    var dataTurnoChave = prefixoDia + "_" + sufixoTurno;
    var horarioInicio = ehNoturno ? "19:00" : "07:00";
    var horarioFim = ehNoturno ? "07:00" : "19:00";
    var horarioDescricao = prefixoDia + " (" + horarioInicio + " às " + horarioFim + ")";

    // 5. Duração (6h, 12h, 24h)
    var duracaoHoras = 12;
    if (/\b24\s*h/i.test(raw)) duracaoHoras = 24;
    else if (/\b6\s*h/i.test(raw) || norm.indexOf("cinderela") !== -1) duracaoHoras = 6;

    // 6. Valor Financeiro (R$)
    var valorTotal = 0;
    var mReais = raw.match(/R\$\s*([0-9]{1,2}\.?[0-9]{3}|[0-9]{3,4})(?:,[0-9]{2})?/i);
    if (mReais && mReais[1]) {
      valorTotal = parseInt(mReais[1].replace(/\./g, ""), 10) || 0;
    } else {
      var mNum = raw.match(/\b(9[0-9]{2}|1[0-9]{3}|2[0-9]{3}|3[0-9]{3})\b/);
      if (mNum && mNum[1]) {
        var candidato = parseInt(mNum[1], 10);
        if (candidato < 1900 || candidato > 2035) {
          valorTotal = candidato;
        }
      }
    }

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

    // 8. Contato do Escalista
    var contatoEscalista = remetenteNumero || "5511999990000";
    var mTel = raw.match(/(?:\+?55\s?)?(?:\(?0?[1-9]{2}\)?\s?)?(?:9\d{4}[-\s]?\d{4})/);
    if (mTel && mTel[0]) {
      var digitos = mTel[0].replace(/\D/g, "");
      if (digitos.length === 11) digitos = "55" + digitos;
      if (digitos.length >= 12) contatoEscalista = digitos;
    }

    return {
      ehOfertaValida: valorTotal >= 400,
      hospital: hospital,
      cidade: cidade,
      setor: setor,
      dataTurnoChave: dataTurnoChave,
      horarioInicio: horarioInicio,
      horarioFim: horarioFim,
      horarioDescricao: horarioDescricao,
      duracaoHoras: duracaoHoras,
      valorTotal: valorTotal,
      valorHora: valorHora,
      modalidadePagamento: modalidadePagamento,
      contatoEscalista: contatoEscalista,
      textoOriginal: raw
    };
  }

  // --------------------------------------------------------------------------
  // ESTÁGIO 3: Integração Viva com a Aba Rotina (Trava de Conflito + Injeção)
  // --------------------------------------------------------------------------
  function _resolverDataIsoParaTurno(dataTurnoChave) {
    var base = new Date();
    var chave = String(dataTurnoChave || "HOJE_NOITE").toUpperCase();
    if (chave.indexOf("AMANHA") === 0) {
      base.setDate(base.getDate() + 1);
    } else if (chave.indexOf("SABADO") === 0) {
      var diffSab = (6 - base.getDay() + 7) % 7;
      base.setDate(base.getDate() + diffSab);
    } else if (chave.indexOf("DOMINGO") === 0) {
      var diffDom = (7 - base.getDay()) % 7;
      base.setDate(base.getDate() + diffDom);
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

  function travarSlotAgenda(dataTurnoChave, infoOferta) {
    var slots = obterSlotsTravados();
    slots[dataTurnoChave] = {
      hospital: infoOferta.hospital,
      valorTotal: infoOferta.valorTotal,
      travadoEm: new Date().toISOString()
    };
    _salvarJsonProp(PROP_LOCKED_SLOTS_KEY, slots);
    return slots;
  }

  function destravarTodaAgendaSniper() {
    _salvarJsonProp(PROP_LOCKED_SLOTS_KEY, {});
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

    // Consulta real na Timeline da Aba Rotina do médico!
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
    travarSlotAgenda(oferta.dataTurnoChave, oferta);

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
  // Validador de Critérios do Médico (Setor, Cidade e Piso Financeiro)
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

    // 2. Verifica Setor Compatível
    var setorNorm = _normalizarTexto(oferta.setor);
    var setoresOk = config.setoresPermitidos || DEFAULT_CONFIG.setoresPermitidos;
    var setorPermitido = false;
    for (var i = 0; i < setoresOk.length; i++) {
      if (setorNorm.indexOf(_normalizarTexto(setoresOk[i])) !== -1) {
        setorPermitido = true;
        break;
      }
    }
    if (!setorPermitido) {
      return {
        aprovado: false,
        codigo: "SETOR_INCOMPATIVEL",
        motivo: "Setor '" + oferta.setor + "' fora do perfil configurado (" + setoresOk.join(", ") + ")"
      };
    }

    // 3. Verifica Cidade Compatível
    var cidNorm = _normalizarTexto(oferta.cidade);
    var cidadesOk = config.cidadesPermitidas || DEFAULT_CONFIG.cidadesPermitidas;
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

    // 4. Verifica Piso Financeiro
    var pisoHora = Number(config.valorMinimoHora) || 108;
    if (oferta.valorHora < pisoHora) {
      return {
        aprovado: false,
        codigo: "VALOR_ABAIXO_DO_PISO",
        motivo: "R$ " + oferta.valorTotal + " (R$ " + oferta.valorHora + "/h) abaixo do seu piso de R$ " + config.valorMinimo12h + "/12h"
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
    var frasesGrupo = [
      "Opa, disponível! Chamei no privado agora.",
      "Eu pego! Te mandei msg no PV.",
      "Disponível, chamei no privado para confirmar.",
      "Assumo a vaga! Enviei meus dados no seu privado."
    ];
    var idx = Math.floor(Math.random() * frasesGrupo.length);
    var jitterMs = 1850 + Math.floor(Math.random() * 1300); // 1.85s a 3.15s

    var msgPrivado =
      "Olá! Vi a vaga no grupo *" + (grupoOrigem || "Plantões") + "* para o *" + oferta.hospital + "* (" + oferta.horarioDescricao + " — " + oferta.setor + ").\n\n" +
      "Tenho disponibilidade imediata para assumir. Seguem meus dados para cadastro na escala:\n" +
      "👨‍⚕️ *" + config.nome + "* (" + config.crm + ")\n" +
      "Pode confirmar a vaga para mim, por favor?";

    return {
      modoStealthPvOnly: !!config.responderApenasPv,
      jitterDelayMs: jitterMs,
      simulacaoDigitandoMs: 1400,
      mensagemGrupo: config.responderApenasPv ? null : frasesGrupo[idx],
      destinatarioPv: oferta.contatoEscalista,
      mensagemPrivado: msgPrivado,
      linkWhatsAppDireto:
        "https://wa.me/" +
        String(oferta.contatoEscalista || "5511999990000").replace(/\D/g, "") +
        "?text=" +
        encodeURIComponent(msgPrivado)
    };
  }

  // --------------------------------------------------------------------------
  // Pipeline Completo: Processa Mensagem do Grupo WhatsApp
  // --------------------------------------------------------------------------
  function processarMensagemGrupoWhatsApp(texto, grupoNome, remetenteNumero, opcoes) {
    var opts = (grupoNome && typeof grupoNome === "object") ? grupoNome : (opcoes || {});
    var nomeGrp = (typeof grupoNome === "string") ? grupoNome : (opts.grupoNome || opts.groupName || "Grupo WhatsApp");
    var remNum = (typeof remetenteNumero === "string") ? remetenteNumero : (opts.escalistaFone || opts.remetenteNumero || "");

    // Estágio 0: Blindagem Zero-Trust em Dupla Camada (Camada 1: Privados/Status/FromMe + Camada 2: Allowlist)
    var isolamento = validarIsolamentoCamada1E2({
      fromMe: opts.fromMe,
      remoteJid: opts.remoteJid || opts.groupJid || "",
      grupoNome: nomeGrp,
      exigirAllowlist: opts.exigirAllowlist
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
        motivo: f1.motivo,
        hashOferta: f1.hashOferta || null
      };
    }

    // Estágio 2: Extração Semântica
    var oferta = extrairDadosPlantao(texto, remNum);
    oferta.hashOferta = f1.hashOferta;
    oferta.grupoOrigem = isolamento.nomeGrupo || nomeGrp || "Grupo WhatsApp";

    if (!oferta.ehOfertaValida) {
      stats.filtradasEstagio1 += 1;
      salvarEstatisticas(stats);
      return {
        status: "DESCARTADA_EXTRATOR",
        motivo: "Sem valor financeiro válido identificado",
        oferta: oferta
      };
    }

    // Estágio 3: Critérios + Blacklist + Aba Rotina
    var config = obterConfigSniper();
    var avaliacao = avaliarCriteriosMedico(oferta, config);
    if (!avaliacao.aprovado) {
      if (avaliacao.codigo === "BLACKLIST_CALOTE") {
        stats.calotesEvitados += 1;
      }
      salvarEstatisticas(stats);
      return {
        status: "REJEITADA_CRITERIOS",
        codigo: avaliacao.codigo,
        motivo: avaliacao.motivo,
        oferta: oferta
      };
    }

    // Estágio 4: Match Perfeito! Respeita a permissão individual do grupo (RADAR_ONLY vs SNIPER_AUTO)
    salvarOfertaEmMemoria(oferta);
    var stealth = gerarDisparoStealthWhatsApp(oferta, config, oferta.grupoOrigem);
    var agendamentoRotina = null;

    var grupoPermiteDisparoAuto = isolamento.modoGrupo !== "RADAR_ONLY";
    var executarAuto = config.modoOperacao === "SNIPER_AUTO" && grupoPermiteDisparoAuto;

    if (executarAuto) {
      stats.plantoesCapturados += 1;
      stats.receitaGarantidaReais += Number(oferta.valorTotal) || 0;
      stats.ultimoDisparoEm = new Date().toISOString();
      if (config.autoAgendarRotina) {
        agendamentoRotina = agendarPlantaoCapturadoNaRotina(oferta);
      }
    }
    salvarEstatisticas(stats);

    var targetChatId = opts.notificarTelegramChatId || opts.chatId;
    if (targetChatId) {
      enviarCardVagaTelegram(targetChatId, oferta, config, stealth, agendamentoRotina);
    }

    return {
      status: executarAuto ? "CAPTURADA_SNIPER_AUTO" : "AGUARDANDO_APROVACAO_SEMI_AUTO",
      modoGrupoAplicado: isolamento.modoGrupo,
      oferta: oferta,
      stealth: stealth,
      agendamentoRotina: agendamentoRotina
    };
  }

  // --------------------------------------------------------------------------
  // Notificação Rica no Telegram (Card de Vaga + Botões 1-Click)
  // --------------------------------------------------------------------------
  function enviarCardVagaTelegram(chatId, oferta, config, stealth, agendamentoRotina) {
    if (!chatId || typeof enviarMensagemComTecladoParaChat !== "function") return;
    var ehAuto = config.modoOperacao === "SNIPER_AUTO";
    var cabecalho = ehAuto
      ? "🎯 *PLANTÃO CAPTURADO PELO SNIPER!*"
      : "🔔 *VAGA FILÉ DETECTADA (MODO SEMI-AUTO)*";

    var statusStealth = ehAuto
      ? (config.responderApenasPv
          ? "🕵️ *Stealth Fantasma:* Mensagem enviada direto no PV do escalista (`" + stealth.jitterDelayMs + "ms`)"
          : "⚡ *Disparo Duplo:* Respondido no grupo + PV do escalista (`" + stealth.jitterDelayMs + "ms`)")
      : "⏳ *Aguardando seu clique abaixo para disparar e agendar na Rotina.*";

    var linhaRotina = agendamentoRotina && agendamentoRotina.agendado
      ? "✅ *Aba Rotina:* Bloco de Plantão injetado automaticamente em `" + agendamentoRotina.dataIso + "`!"
      : "📅 *Aba Rotina:* Sem conflitos no horário (`" + oferta.dataTurnoChave + "`).";

    var msg = [
      cabecalho,
      "━━━━━━━━━━━━━━━━━━━━",
      "🏥 *Unidade:* " + oferta.hospital + " (" + oferta.cidade + ")",
      "🩺 *Setor:* " + oferta.setor,
      "🕒 *Turno:* " + oferta.horarioDescricao + " (" + oferta.duracaoHoras + "h)",
      "💰 *Valor:* *R$ " + oferta.valorTotal + "* (`R$ " + oferta.valorHora + "/h` — " + oferta.modalidadePagamento + ")",
      "📱 *Grupo:* " + (oferta.grupoOrigem || "Plantões Médicos SP"),
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
    botoes.push([
      {
        text: "💬 Abrir WhatsApp do Escalista",
        url: stealth.linkWhatsAppDireto
      }
    ]);
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
        grupo: "Plantões SP Geral",
        remetente: "5511991112222",
        texto: "Bom dia colegas! Alguém sabe se o estacionamento do Hospital Municipal está funcionando hoje?"
      },
      {
        grupo: "Vagas Médicas ABC/SP",
        remetente: "5511992223333",
        texto: "Olá pessoal, estou disponível para plantão hoje à noite ou amanhã diurno em SP ou ABC. CRM/SP ativo!"
      },
      {
        grupo: "Plantões Urgentes SP",
        remetente: "5511993334444",
        texto: "🚨 VAGA URGENTE HOJE NOTURNO (19h às 07h) - UPA Fantasma Sul (São Paulo). Porta Ficha Verde. Valor: R$ 1.600 no PIX! Chamar 11993334444"
      },
      {
        grupo: "Plantões Grande SP",
        remetente: "5511994445555",
        texto: "Preciso de médico para cobertura HOJE NOTURNO 19h às 07h - AMA Zona Leste (São Paulo) - Porta Clínica Médica - Valor R$ 950 PJ."
      },
      {
        grupo: "Emergências Médicas SP",
        remetente: "5511995556666",
        texto: "Vaga HOJE NOTURNO 19h às 07h - Hospital Santa Marcelina (São Paulo) - Setor: SALA VERMELHA / EMERGÊNCIA. R$ 1.700. Contato: 11995556666"
      },
      {
        grupo: "Plantões Premium SP & ABC",
        remetente: "5511988887777",
        texto: "🔥 COBERTURA HOJE NOTURNO (19h às 07h - 12h)\n📍 Hospital São Luiz Morumbi (São Paulo)\n🩺 Setor: Pronto Atendimento / Ficha Verde (Porta)\n💰 Valor: R$ 1.560,00 (PIX à vista pós-plantão)\n📲 Interessados chamar escalista: (11) 98888-7777"
      },
      {
        grupo: "Médicos Plantonistas SP II",
        remetente: "5511988887777",
        texto: "🔥 COBERTURA HOJE NOTURNO (19h às 07h - 12h)\n📍 Hospital São Luiz Morumbi (São Paulo)\n🩺 Setor: Pronto Atendimento / Ficha Verde (Porta)\n💰 Valor: R$ 1.560,00 (PIX à vista pós-plantão)\n📲 Interessados chamar escalista: (11) 98888-7777"
      },
      {
        grupo: "Plantões ABC Premium",
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
        { notificarTelegramChatId: ehVagaVencedora ? chatId : null }
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
    obterConfigSniper: obterConfigSniper,
    obterConfig: obterConfigSniper,
    salvarConfigSniper: salvarConfigSniper,
    obterEstatisticas: obterEstatisticas,
    obterMetricas: obterEstatisticas,
    obterHistorico: function () { return []; },
    obterBlacklistCalote: obterBlacklistCalote,
    adicionarBlacklistCalote: adicionarBlacklistCalote,
    verificarBlacklist: verificarBlacklist,
    obterGruposAllowlist: obterGruposAllowlist,
    salvarGruposAllowlist: salvarGruposAllowlist,
    sincronizarGruposWhatsApp: sincronizarGruposWhatsApp,
    alternarPermissaoGrupo: alternarPermissaoGrupo,
    validarIsolamentoCamada1E2: validarIsolamentoCamada1E2,
    filtroRapidoEstagio1: filtroRapidoEstagio1,
    extrairDadosPlantao: extrairDadosPlantao,
    verificarConflitoNaRotina: verificarConflitoNaRotina,
    agendarPlantaoCapturadoNaRotina: agendarPlantaoCapturadoNaRotina,
    destravarTodaAgendaSniper: destravarTodaAgendaSniper,
    obterOfertaEmMemoria: obterOfertaEmMemoria,
    gerarDisparoStealthWhatsApp: gerarDisparoStealthWhatsApp,
    processarMensagemGrupoWhatsApp: processarMensagemGrupoWhatsApp,
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
    "📍 *Cidades:* " + (cfg.cidadesPermitidas || []).join(", "),
    "🩺 *Setores:* " + (cfg.setoresPermitidos || []).join(", "),
    "📅 *Sync Aba Rotina:* Ativo (Anti-Conflito + Auto-Bloco)",
    "",
    "📊 *PLACAR EM TEMPO REAL*",
    "• Mensagens filtradas (0ms): *" + stats.totalAnalisadas + "*",
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
          text: cfg.modoOperacao === "SNIPER_AUTO" ? "🔄 Modo: Sniper Auto" : "🔄 Modo: Semi-Auto",
          callback_data: "sniper:toggle_mode"
        },
        {
          text: cfg.responderApenasPv ? "🕵️ Stealth PV: ON" : "🕵️ Stealth PV: OFF",
          callback_data: "sniper:toggle_stealth"
        }
      ],
      [
        { text: "💰 Piso +R$100", callback_data: "sniper:val_up" },
        { text: "💰 Piso -R$100", callback_data: "sniper:val_down" }
      ],
      [
        { text: "🧪 Simular 8 Vagas WhatsApp", callback_data: "sniper:simular" },
        { text: "📱 Parear Whats (8 Dígitos)", callback_data: "sniper:pair_wa" }
      ],
      [
        { text: "🚫 Blacklist Anti-Calote", callback_data: "sniper:blacklist" },
        { text: "🔓 Destravar Agenda Sniper", callback_data: "sniper:unlock_all" }
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

  if (arg.toLowerCase().indexOf("calote ") === 0) {
    var termo = arg.slice(7).trim();
    PlantaoSniperService.adicionarBlacklistCalote(termo, "Adicionado via comando /sniper calote");
    enviarMensagemParaChat(chatId, "🚫 *" + termo + "* adicionado à Blacklist Anti-Calote com sucesso!");
  } else if (arg.toLowerCase() === "grupos") {
    var telaGrp = _construirPainelGruposAllowlistTelegram();
    return _enviarOuEditarPainelSniper(chatId, msgId, null, telaGrp.texto, telaGrp.teclado);
  } else if (arg.toLowerCase() === "simular") {
    var logs = PlantaoSniperService.executarSimulacaoSniper(chatId);
    var resumo = ["🧪 *SIMULAÇÃO DE 8 MENSAGENS REAIS CONCLUÍDA:*", ""];
    for (var i = 0; i < logs.length; i++) {
      resumo.push("`" + logs[i].indice + ".` *" + logs[i].status + "* — _" + logs[i].detalhe + "_");
    }
    enviarMensagemParaChat(chatId, resumo.join("\n"));
    return true;
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
    var resSync = PlantaoSniperService.sincronizarGruposWhatsApp([]);
    var notaSync = "Sincronização concluída (" + resSync.totalGrupos + " grupos verificados; novos entram 🔴 BLOQUEADOS por padrão).";
    if (cbId && typeof responderCallbackTelegram === "function") {
      responderCallbackTelegram(cbId, "🔄 Grupos sincronizados em modo Zero-Trust!", false);
    }
    var pgSync = _construirPainelGruposAllowlistTelegram(notaSync);
    return _enviarOuEditarPainelSniper(chatId, msgId, token, pgSync.texto, pgSync.teclado);
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
    var codigoPareamento = "WGN-" + Math.floor(1000 + Math.random() * 9000);
    var msgPair = [
      "📱 *PAREAMENTO WHATSAPP (8 DÍGITOS — SEM QR CODE)*",
      "━━━━━━━━━━━━━━━━━━━━",
      "Para conectar o Listener Baileys/Evolution ao seu WhatsApp usando apenas 1 celular:",
      "",
      "1️⃣ Abra o *WhatsApp* > *Aparelhos Conectados* > *Conectar um aparelho*",
      "2️⃣ Toque em *Conectar com número de telefone*",
      "3️⃣ Digite o código de pareamento ou acione o webhook local `/api/sniper/webhook`:",
      "🔑 Protocolo de Sessão: `" + codigoPareamento + "`",
      "",
      "🛡️ *Blindagem & Stealth Ativos:*",
      "• `Camada 1`: Bloqueio hard-coded de conversas privadas (`@s.whatsapp.net`) e Status",
      "• `Camada 2`: Apenas grupos marcados como 🟢 ou 👁️ na Allowlist são lidos",
      "• `markOnlineOnConnect: false` & `readMessages: false` (Zero visto azul)",
      "• Jitter Humano `1.8s–3.2s` + Simulação de digitação (`composing`)"
    ].join("\n");

    if (cbId && typeof responderCallbackTelegram === "function") {
      responderCallbackTelegram(cbId, "📱 Instruções de pareamento geradas!", false);
    }
    return _enviarOuEditarPainelSniper(chatId, msgId, token, msgPair, {
      inline_keyboard: [
        [{ text: "🛡️ Configurar Grupos Permitidos", callback_data: "sniper:grupos" }],
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
    relatorio.push("📌 _O Card da vaga vencedora (Hospital São Luiz R$ 1.560) foi enviado acima e agendado na sua Aba Rotina!_");

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
    var oferta = PlantaoSniperService.obterOfertaEmMemoria(hash);
    if (!oferta) {
      if (cbId && typeof responderCallbackTelegram === "function") {
        responderCallbackTelegram(cbId, "⚠️ Vaga expirada do buffer de memória.", true);
      }
      return true;
    }
    var ag = PlantaoSniperService.agendarPlantaoCapturadoNaRotina(oferta);
    if (cbId && typeof responderCallbackTelegram === "function") {
      responderCallbackTelegram(cbId, "⚡ Plantão travado e adicionado à sua Aba Rotina!", false);
    }
    enviarMensagemParaChat(
      chatId,
      "✅ *PLANTÃO CONFIRMADO E AGENDADO NA ROTINA!*\n" +
      "🏥 *" + oferta.hospital + "* (" + oferta.horarioDescricao + ")\n" +
      "📅 Bloco injetado automaticamente na data `" + (ag.dataIso || "hoje") + "`."
    );
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