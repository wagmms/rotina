/**
 * ==============================================================================
 * MÓDULO 00: CONFIGURAÇÕES, SEGREDOS, AMBIENTE E CONTEXTO CLÍNICO MULTI-PERFIL
 * ==============================================================================
 * Arquitetura de Gestão de Chaves, Propriedades, Perfis Assistenciais e REMUME:
 * 1. Lê prioritariamente de PropertiesService.getScriptProperties().
 * 2. Gerencia Contexto Clínico por usuário (chatId) com persistência híbrida
 *    (Memória + Disco em data/profiles/<chatId>.json + PropertiesService).
 * 3. Controla a Matriz Oficial dos 10 Módulos Clínicos por Cenário Assistencial.
 * 4. Gerencia Catálogos Farmacêuticos (RENAME Nacional + Presets Municipais),
 *    com Auto-Promoção para Preset Global e Fila de Solicitações ao Desenvolvedor.
 * ==============================================================================
 */

var ConfigService = (function() {
  var propsCache = null;
  var perfisCache = {};
  var catalogosCache = {};
  var manifestCache = null;
  var solicitacoesCache = null;
  var unidadesCompartilhadasCache = {};

  var fs = null;
  var path = null;
  try {
    if (typeof require === "function") {
      fs = require("fs");
      path = require("path");
    }
  } catch (e) {}

  function obterRaizProjeto() {
    try {
      if (typeof process !== "undefined" && process && typeof process.cwd === "function") {
        return process.cwd();
      }
    } catch (e) {}
    return ".";
  }

  function resolverCaminho(caminhoRelativo) {
    if (!path) return caminhoRelativo;
    if (caminhoRelativo && caminhoRelativo.indexOf("data/") === 0 && typeof process !== "undefined" && process && process.env && process.env.BOT_DATA_DIR) {
      return path.resolve(process.env.BOT_DATA_DIR, caminhoRelativo.slice(5));
    }
    return path.resolve(obterRaizProjeto(), caminhoRelativo);
  }

  function garantirDiretorio(caminhoArquivo) {
    if (!fs || !path) return false;
    try {
      var dir = path.dirname(caminhoArquivo);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function lerJsonDisco(caminhoRelativo, valorPadrao) {
    if (!fs) return valorPadrao;
    try {
      var abs = resolverCaminho(caminhoRelativo);
      if (!fs.existsSync(abs)) return valorPadrao;
      var raw = fs.readFileSync(abs, "utf8");
      if (!raw || !String(raw).trim()) return valorPadrao;
      return JSON.parse(raw);
    } catch (e) {
      return valorPadrao;
    }
  }

  function escreverJsonDisco(caminhoRelativo, dados) {
    if (!fs) return false;
    try {
      var abs = resolverCaminho(caminhoRelativo);
      garantirDiretorio(abs);
      fs.writeFileSync(abs, JSON.stringify(dados, null, 2), "utf8");
      return true;
    } catch (e) {
      return false;
    }
  }

  function clonarObjeto(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      return obj;
    }
  }

  // Snapshot único por execução: getProperties() custa 1 operação da cota diária,
  // enquanto getProperty por chave custava uma operação a cada leitura.
  function carregarPropriedades() {
    if (propsCache) return propsCache;
    try {
      if (typeof PropertiesService !== "undefined" && PropertiesService.getScriptProperties) {
        propsCache = PropertiesService.getScriptProperties().getProperties() || {};
        return propsCache;
      }
    } catch (e) {}
    return {}; // Serviço ainda indisponível: não fixa um cache vazio.
  }

  function salvarPropriedadeScript(chave, valorString) {
    try {
      if (typeof PropertiesService !== "undefined" && PropertiesService.getScriptProperties) {
        PropertiesService.getScriptProperties().setProperty(chave, String(valorString));
      }
      if (propsCache) {
        propsCache[chave] = String(valorString);
      }
    } catch (e) {}
  }

  // Valores padrão estruturais não-sensíveis (Zero Hardcode Pessoal ou Regional).
  // Todos os segredos e credenciais devem ser definidos exclusivamente em ScriptProperties.
  var DEFAULTS = {
    PROVEDOR_TEXTO_PADRAO: "GEMINI",
    IA_MODELOS_CLINICOS_GEMINI: "gemini-3.5-flash,gemini-flash-latest,gemini-flash-lite-latest,gemini-3.5-flash-lite",
    IA_MODELOS_RAPIDOS_GEMINI: "gemini-flash-lite-latest,gemini-3.5-flash-lite,gemini-3.1-flash-lite",
    IA_MODELOS_GEMINI: "gemini-flash-lite-latest,gemini-3.5-flash-lite,gemini-3.5-flash,gemini-flash-latest",
    IA_MODELOS_TTS_GEMINI: "gemini-3.8-flash-lite-tts,gemini-3.8-flash-tts",
    IA_MODELOS_LOCAL: "llama3.1:latest,llama3:8b,mistral:latest,llama3:latest,mistral:7b",
    LOCAL_LLM_URL: "http://127.0.0.1:11434/v1/chat/completions",
    LOCAL_LLM_API_KEY: "ollama",
    LOCAL_LLM_TIMEOUT_MS: "30000",
    LOCAL_LLM_ATIVO: "auto",
    IA_VOZ_PRECEPTOR: "Fenrir",
    TIMEZONE: "America/Sao_Paulo",
    SPREADSHEET_ID_REMUME: "",
    SPREADSHEET_ID_INTERACOES: "",
    WEB_APP_URL: "",
    IA_LOCAL_ENDPOINT: "http://127.0.0.1:11434/v1/chat/completions",
    IA_LOCAL_TIMEOUT_MS: "12000",
    IA_FALLBACK_OFFLINE_HABILITADO: "true",
    TELEGRAM_TITULAR_NAME: "Médico(a) Assistente",
    TELEGRAM_GUEST_NAME: "Médico(a) Convidado(a)",
    LOCALIDADE_MUNICIPIO_PADRAO: "Brasil (Padrão Nacional)",
    LOCALIDADE_UF_PADRAO: "BR",
    LOCALIDADE_SLUG_PADRAO: "rename_nacional",
    INSTITUICAO_PADRAO: "Unidade de Saúde / SUS",
    CENARIO_PADRAO: "URGENCIA_UPA_24H",
    SISTEMA_REGULACAO_PADRAO: "SISREG",
    CATALOGO_FARMACEUTICO_PADRAO: "rename_nacional"
  };

  // ============================================================================
  // MATRIZ OFICIAL DOS 10 MÓDULOS CLÍNICOS POR CENÁRIO ASSISTENCIAL
  // ============================================================================
  var CATALOGO_MODULOS_CLINICOS = [
    {
      numero: 1,
      id: "receituario_remume",
      nome: "Receituário & REMUME",
      icone: "💊",
      descricao: "Prescrição ambulatorial, posologia, disponibilidade no SUS e alternativas terapêuticas."
    },
    {
      numero: 2,
      id: "prescricao_hospitalar",
      nome: "Prescrição Hospitalar (Dieta/HV)",
      icone: "🏥",
      descricao: "Prescrição estruturada (Dieta, Hidratação Venosa, Sintomáticos, Profilaxias e Cuidados)."
    },
    {
      numero: 3,
      id: "dva_sedacao_iot",
      nome: "Drogas Vasoativas, Sedação & IOT",
      icone: "💉",
      descricao: "Diluições de DVA em bombas de infusão (mL/h), sequência rápida de IOT e sedoanalgesia."
    },
    {
      numero: 4,
      id: "protocolos_emergencia",
      nome: "Protocolos Sala Vermelha (IAM/AVC/Sepse)",
      icone: "🚨",
      descricao: "Condutas tempo-dependentes para emergências críticas, ACLS, sepse e choque."
    },
    {
      numero: 5,
      id: "calculadoras_escores",
      nome: "Calculadoras & Escores Clínicos",
      icone: "🧮",
      descricao: "Escores de estratificação de risco (CURB-65, Wells, HEART, qSOFA, CHA2DS2-VASc, CKD-EPI)."
    },
    {
      numero: 6,
      id: "pediatria_mg_kg",
      nome: "Doses Pediátricas por Peso (mg/kg)",
      icone: "👶",
      descricao: "Cálculo seguro por peso, conversão para mL/gotas e alertas de dose máxima pediátrica."
    },
    {
      numero: 7,
      id: "obstetricia_prenatal_lactacao",
      nome: "Obstetrícia, Pré-Natal & Lactação",
      icone: "🤰",
      descricao: "Risco teratogênico, segurança na amamentação, pré-natal e emergências obstétricas."
    },
    {
      numero: 8,
      id: "cronicos_rastreio_aps",
      nome: "Manejo de Crônicos & Rastreio APS",
      icone: "🩺",
      descricao: "Metas pressóricas/glicêmicas, ajuste longitudinal de crônicos e rastreamento populacional."
    },
    {
      numero: 9,
      id: "exames_ecg_gaso_imagem",
      nome: "Exames (ECG, Gasometria & Imagem)",
      icone: "📈",
      descricao: "Interpretação estruturada de ECG, distúrbios ácido-básicos, laboratório e radiologia."
    },
    {
      numero: 10,
      id: "evolucao_soap_atestados",
      nome: "Evolução (SOAP/SBAR) & Atestados",
      icone: "📝",
      descricao: "Redação médica formal para prontuário, passagem de plantão SBAR, encaminhamento e documentos."
    }
  ];

  var MODULOS_POR_CENARIO = {
    APS_UBS: {
      receituario_remume: true,
      prescricao_hospitalar: false,
      dva_sedacao_iot: false,
      protocolos_emergencia: false,
      calculadoras_escores: true,
      pediatria_mg_kg: true,
      obstetricia_prenatal_lactacao: true,
      cronicos_rastreio_aps: true,
      exames_ecg_gaso_imagem: true,
      evolucao_soap_atestados: true
    },
    URGENCIA_UPA_24H: {
      receituario_remume: true,
      prescricao_hospitalar: true,
      dva_sedacao_iot: true,
      protocolos_emergencia: true,
      calculadoras_escores: true,
      pediatria_mg_kg: true,
      obstetricia_prenatal_lactacao: false,
      cronicos_rastreio_aps: false,
      exames_ecg_gaso_imagem: true,
      evolucao_soap_atestados: true
    },
    SALA_VERMELHA: {
      receituario_remume: false,
      prescricao_hospitalar: true,
      dva_sedacao_iot: true,
      protocolos_emergencia: true,
      calculadoras_escores: true,
      pediatria_mg_kg: false,
      obstetricia_prenatal_lactacao: false,
      cronicos_rastreio_aps: false,
      exames_ecg_gaso_imagem: true,
      evolucao_soap_atestados: true
    },
    ENFERMARIA: {
      receituario_remume: true,
      prescricao_hospitalar: true,
      dva_sedacao_iot: false,
      protocolos_emergencia: true,
      calculadoras_escores: true,
      pediatria_mg_kg: false,
      obstetricia_prenatal_lactacao: false,
      cronicos_rastreio_aps: true,
      exames_ecg_gaso_imagem: true,
      evolucao_soap_atestados: true
    },
    MATERNIDADE_GO: {
      receituario_remume: true,
      prescricao_hospitalar: true,
      dva_sedacao_iot: false,
      protocolos_emergencia: false,
      calculadoras_escores: true,
      pediatria_mg_kg: false,
      obstetricia_prenatal_lactacao: true,
      cronicos_rastreio_aps: false,
      exames_ecg_gaso_imagem: false,
      evolucao_soap_atestados: true
    },
    PEDIATRIA: {
      receituario_remume: true,
      prescricao_hospitalar: true,
      dva_sedacao_iot: true,
      protocolos_emergencia: true,
      calculadoras_escores: true,
      pediatria_mg_kg: true,
      obstetricia_prenatal_lactacao: false,
      cronicos_rastreio_aps: false,
      exames_ecg_gaso_imagem: true,
      evolucao_soap_atestados: true
    }
  };

  var CENARIOS_ASSISTENCIAIS = {
    APS_UBS: {
      id: "APS_UBS",
      nome: "APS / UBS / Saúde da Família",
      icone: "🏥",
      descricao: "Atenção Primária, longitudinalidade, pré-natal, puericultura, manejo de crônicos e receituário REMUME."
    },
    URGENCIA_UPA_24H: {
      id: "URGENCIA_UPA_24H",
      nome: "UPA 24h / Pronto Atendimento",
      icone: "🚑",
      descricao: "Urgências clínicas e pediátricas, estabilização inicial, prescrição de observação e alta com receita SUS."
    },
    SALA_VERMELHA: {
      id: "SALA_VERMELHA",
      nome: "Sala Vermelha / Emergência / UTI",
      icone: "🚨",
      descricao: "Paciente crítico, drogas vasoativas, intubação orotraqueal, ventilação mecânica e protocolos tempo-dependentes."
    },
    ENFERMARIA: {
      id: "ENFERMARIA",
      nome: "Enfermaria / Internação Clínica",
      icone: "🛏️",
      descricao: "Evolução diária SOAP, prescrição hospitalar, reconciliação medicamentosa, descalonamento e alta segura."
    },
    MATERNIDADE_GO: {
      id: "MATERNIDADE_GO",
      nome: "Maternidade / Ginecologia & Obstetrícia",
      icone: "🤰",
      descricao: "Gestação de alto risco, trabalho de parto, puerpério, lactação e segurança fetal de fármacos."
    },
    PEDIATRIA: {
      id: "PEDIATRIA",
      nome: "Pronto-Socorro / Ala Pediátrica",
      icone: "🧸",
      descricao: "Doses estritas por peso (mg/kg), diluições pediátricas, PALS, bronquiolite, asma e desidratação."
    }
  };

  // ============================================================================
  // NORMALIZAÇÃO E UTILITÁRIOS DE SLUG / IDENTIFICAÇÃO
  // ============================================================================
  function removerAcentos(texto) {
    if (!texto) return "";
    return String(texto)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function sanitizarChatId(chatId) {
    var base = chatId;
    if (base === undefined || base === null || String(base).trim() === "") {
      var p = carregarPropriedades();
      base = p.TELEGRAM_CHAT_ID || "default";
    }
    return String(base).trim().replace(/[^a-zA-Z0-9_-]/g, "_") || "default";
  }

  function gerarSlugMunicipio(municipio, uf) {
    var munRaw = String(municipio || "").trim();
    var ufRaw = String(uf || "").trim().toUpperCase();

    if (
      !munRaw ||
      munRaw.toLowerCase() === "rename_nacional" ||
      munRaw.toLowerCase().indexOf("brasil") !== -1 ||
      munRaw.toLowerCase().indexOf("padrao nacional") !== -1 ||
      munRaw.toLowerCase().indexOf("padrão nacional") !== -1 ||
      ufRaw === "BR"
    ) {
      if (
        !munRaw ||
        munRaw.toLowerCase() === "rename_nacional" ||
        munRaw.toLowerCase().indexOf("brasil") !== -1 ||
        munRaw.toLowerCase().indexOf("nacional") !== -1
      ) {
        return "rename_nacional";
      }
    }

    if (/^[a-z]{2}_[a-z0-9_]+$/.test(munRaw)) {
      return munRaw;
    }

    var munNorm = removerAcentos(munRaw)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    var ufNorm = removerAcentos(ufRaw)
      .toLowerCase()
      .replace(/[^a-z]+/g, "");

    if (!munNorm) return "rename_nacional";
    if (!ufNorm || ufNorm === "br") return munNorm;
    if (munNorm.indexOf(ufNorm + "_") === 0) return munNorm;
    return ufNorm + "_" + munNorm;
  }

  function computarSaudacaoECarimbo(profissional) {
    var prof = profissional || {};
    var prefixo = String(prof.prefixo || "Dr.").trim();
    if (prefixo !== "Dr." && prefixo !== "Dra." && prefixo !== "Acad.") {
      prefixo = "Dr.";
    }
    var nomeChamada = String(prof.nome_chamada || "").trim();
    var nomeCompleto = String(prof.nome_completo_carimbo || nomeChamada || "").trim();

    // Remove prefixo duplicado caso o usuário tenha digitado "Dr. João" no nome
    nomeChamada = nomeChamada.replace(/^(dr\.?|dra\.?|acad\.?)\s+/i, "").trim();
    nomeCompleto = nomeCompleto.replace(/^(dr\.?|dra\.?|acad\.?)\s+/i, "").trim();

    var saudacaoFormal = DEFAULTS.TELEGRAM_TITULAR_NAME;
    if (nomeChamada) {
      saudacaoFormal = prefixo + " " + nomeChamada;
    } else if (prof.saudacao_formal && prof.saudacao_formal !== DEFAULTS.TELEGRAM_TITULAR_NAME) {
      saudacaoFormal = String(prof.saudacao_formal).trim();
    }

    var carimbo = nomeCompleto ? (prefixo + " " + nomeCompleto) : saudacaoFormal;
    return {
      prefixo: prefixo,
      nome_chamada: nomeChamada,
      nome_completo_carimbo: nomeCompleto || nomeChamada,
      saudacao_formal: saudacaoFormal,
      carimbo_formatado: carimbo
    };
  }

  function criarContextoPadrao(chatId) {
    var cid = sanitizarChatId(chatId);
    var p = carregarPropriedades();

    // 1. Suporte a perfil clínico completo injetado em JSON via ambiente ou propriedades
    var jsonRaw = p.BOT_CLINICAL_PROFILE_JSON || p.PERFIL_CLINICO_JSON;
    if (jsonRaw) {
      try {
        var obj = JSON.parse(jsonRaw);
        if (obj && typeof obj === "object") {
          obj.chat_id = String(chatId || cid);
          return obj;
        }
      } catch (_) {}
    }

    var cenarioConfigurado = String(p.BOT_MEDICO_SERVICO || p.BOT_SERVICO || p.BOT_CENARIO || p.CENARIO_ASSISTENCIAL || DEFAULTS.CENARIO_PADRAO).trim().toUpperCase();
    if (!MODULOS_POR_CENARIO[cenarioConfigurado]) {
      cenarioConfigurado = DEFAULTS.CENARIO_PADRAO;
    }
    var modulosPadrao = clonarObjeto(MODULOS_POR_CENARIO[cenarioConfigurado] || MODULOS_POR_CENARIO.URGENCIA_UPA_24H);

    var nomeConfigurado = String(p.BOT_MEDICO_NOME || p.BOT_TITULAR_NAME || p.BOT_NOME || "").trim();
    if (!nomeConfigurado && p.TELEGRAM_TITULAR_NAME && p.TELEGRAM_TITULAR_NAME !== DEFAULTS.TELEGRAM_TITULAR_NAME) {
      nomeConfigurado = String(p.TELEGRAM_TITULAR_NAME).trim();
    }
    var prefixoConfigurado = String(p.BOT_MEDICO_PREFIXO || p.BOT_PREFIXO || "").trim();
    if (/^dra\.?\s+/i.test(nomeConfigurado)) {
      if (!prefixoConfigurado) prefixoConfigurado = "Dra.";
      nomeConfigurado = nomeConfigurado.replace(/^dra\.?\s+/i, "").trim();
    } else if (/^dr\.?\s+/i.test(nomeConfigurado)) {
      if (!prefixoConfigurado) prefixoConfigurado = "Dr.";
      nomeConfigurado = nomeConfigurado.replace(/^dr\.?\s+/i, "").trim();
    } else if (/^acad\.?\s+/i.test(nomeConfigurado)) {
      if (!prefixoConfigurado) prefixoConfigurado = "Acad.";
      nomeConfigurado = nomeConfigurado.replace(/^acad\.?\s+/i, "").trim();
    }
    if (!prefixoConfigurado) prefixoConfigurado = "Dr.";
    var crmConfigurado = String(p.BOT_MEDICO_CRM || p.BOT_CRM || p.TELEGRAM_CRM || "").trim();
    var municipioConfigurado = String(p.BOT_MEDICO_CIDADE || p.BOT_CIDADE || p.TELEGRAM_CIDADE || p.LOCALIDADE_MUNICIPIO || DEFAULTS.LOCALIDADE_MUNICIPIO_PADRAO).trim();
    var ufConfigurada = String(p.BOT_MEDICO_UF || p.BOT_UF || p.TELEGRAM_UF || p.LOCALIDADE_UF || DEFAULTS.LOCALIDADE_UF_PADRAO).trim().toUpperCase();
    var unidadeConfigurada = String(p.BOT_MEDICO_UNIDADE || p.BOT_UNIDADE || p.INSTITUICAO_VINCULO || DEFAULTS.INSTITUICAO_PADRAO).trim();
    var papelConfigurado = String(p.BOT_MEDICO_PAPEL || p.BOT_PAPEL || "MEDICO_CRM").trim();

    var slugMun = gerarSlugMunicipio(municipioConfigurado, ufConfigurada);
    var nomeExibicaoRemume = (municipioConfigurado !== DEFAULTS.LOCALIDADE_MUNICIPIO_PADRAO)
      ? ("REMUME " + municipioConfigurado + " - " + ufConfigurada)
      : "RENAME Nacional (SUS)";

    var onboarding = Boolean(nomeConfigurado && nomeConfigurado !== DEFAULTS.TELEGRAM_TITULAR_NAME);

    return {
      chat_id: String(chatId || cid),
      onboarding_concluido: onboarding,
      atualizado_em: new Date().toISOString(),
      profissional: {
        prefixo: prefixoConfigurado,
        nome_chamada: nomeConfigurado,
        nome_completo_carimbo: nomeConfigurado,
        saudacao_formal: nomeConfigurado ? (prefixoConfigurado + " " + nomeConfigurado) : DEFAULTS.TELEGRAM_TITULAR_NAME,
        papel: papelConfigurado,
        registro_conselho: crmConfigurado,
        uf_conselho: ufConfigurada,
        instituicao_vinculo: unidadeConfigurada,
        modo_preceptoria: "DIRETO_OBJETIVO"
      },
      localidade: {
        uf: ufConfigurada,
        municipio_nome: municipioConfigurado,
        municipio_slug: slugMun
      },
      unidade_assistencial: {
        nome_unidade: unidadeConfigurada,
        cenario_id: cenarioConfigurado,
        nivel_atencao: cenarioConfigurado,
        sistema_regulacao: DEFAULTS.SISTEMA_REGULACAO_PADRAO,
        modulos_visiveis: modulosPadrao
      },
      farmacopeia: {
        remume_id: slugMun,
        remume_nome_exibicao: nomeExibicaoRemume,
        selo_curto: (slugMun === "rename_nacional") ? "🟢 [RENAME/SUS]" : ("📍 [" + municipioConfigurado + "]"),
        fallback_rename_nacional: true
      },
      regras_locais: {
        notas_ccih_fluxos: "",
        codigo_compartilhamento: ""
      }
    };
  }

  function normalizarContextoClinico(ctxBruto, chatId) {
    var base = criarContextoPadrao(chatId);
    if (!ctxBruto || typeof ctxBruto !== "object") return base;

    var ctx = clonarObjeto(base);
    ctx.chat_id = String(ctxBruto.chat_id || chatId || base.chat_id);
    ctx.onboarding_concluido = Boolean(ctxBruto.onboarding_concluido);
    ctx.atualizado_em = ctxBruto.atualizado_em || base.atualizado_em;

    if (ctxBruto.profissional && typeof ctxBruto.profissional === "object") {
      Object.keys(ctxBruto.profissional).forEach(function(k) {
        if (ctxBruto.profissional[k] !== undefined && ctxBruto.profissional[k] !== null) {
          ctx.profissional[k] = ctxBruto.profissional[k];
        }
      });
    }
    var ident = computarSaudacaoECarimbo(ctx.profissional);
    ctx.profissional.prefixo = ident.prefixo;
    ctx.profissional.nome_chamada = ident.nome_chamada;
    ctx.profissional.nome_completo_carimbo = ident.nome_completo_carimbo;
    ctx.profissional.saudacao_formal = ident.saudacao_formal;

    if (ctxBruto.localidade && typeof ctxBruto.localidade === "object") {
      Object.keys(ctxBruto.localidade).forEach(function(k) {
        if (ctxBruto.localidade[k] !== undefined && ctxBruto.localidade[k] !== null) {
          ctx.localidade[k] = ctxBruto.localidade[k];
        }
      });
    }
    if (!ctx.localidade.municipio_slug) {
      ctx.localidade.municipio_slug = gerarSlugMunicipio(ctx.localidade.municipio_nome, ctx.localidade.uf);
    }

    if (ctxBruto.unidade_assistencial && typeof ctxBruto.unidade_assistencial === "object") {
      Object.keys(ctxBruto.unidade_assistencial).forEach(function(k) {
        if (k === "modulos_visiveis") return;
        if (ctxBruto.unidade_assistencial[k] !== undefined && ctxBruto.unidade_assistencial[k] !== null) {
          ctx.unidade_assistencial[k] = ctxBruto.unidade_assistencial[k];
        }
      });
      var cenarioId = String(ctx.unidade_assistencial.cenario_id || DEFAULTS.CENARIO_PADRAO).toUpperCase();
      if (!MODULOS_POR_CENARIO[cenarioId]) {
        cenarioId = DEFAULTS.CENARIO_PADRAO;
      }
      ctx.unidade_assistencial.cenario_id = cenarioId;
      ctx.unidade_assistencial.nivel_atencao = ctx.unidade_assistencial.nivel_atencao || cenarioId;
      ctx.unidade_assistencial.modulos_visiveis = clonarObjeto(MODULOS_POR_CENARIO[cenarioId]);

      if (
        ctxBruto.unidade_assistencial.modulos_visiveis &&
        typeof ctxBruto.unidade_assistencial.modulos_visiveis === "object"
      ) {
        Object.keys(ctx.unidade_assistencial.modulos_visiveis).forEach(function(modKey) {
          if (ctxBruto.unidade_assistencial.modulos_visiveis[modKey] !== undefined) {
            ctx.unidade_assistencial.modulos_visiveis[modKey] = Boolean(
              ctxBruto.unidade_assistencial.modulos_visiveis[modKey]
            );
          }
        });
      }
    }

    if (ctxBruto.farmacopeia && typeof ctxBruto.farmacopeia === "object") {
      Object.keys(ctxBruto.farmacopeia).forEach(function(k) {
        if (ctxBruto.farmacopeia[k] !== undefined && ctxBruto.farmacopeia[k] !== null) {
          ctx.farmacopeia[k] = ctxBruto.farmacopeia[k];
        }
      });
    }

    if (ctxBruto.regras_locais && typeof ctxBruto.regras_locais === "object") {
      Object.keys(ctxBruto.regras_locais).forEach(function(k) {
        if (ctxBruto.regras_locais[k] !== undefined && ctxBruto.regras_locais[k] !== null) {
          ctx.regras_locais[k] = ctxBruto.regras_locais[k];
        }
      });
    }

    // Espelha campos top-level planos para interoperabilidade total (Telegram Router, SOAP, PDF, Cockpit)
    ctx.prefixo_tratamento = ctx.profissional.prefixo || "Dr.";
    ctx.nome_chamada = ctx.profissional.nome_chamada || "Médico(a)";
    ctx.nome_chamada_configurado = Boolean(ctx.profissional.nome_chamada && ctx.profissional.nome_chamada !== "Médico(a)");
    ctx.nome_completo_carimbo = ctx.profissional.nome_completo_carimbo || ctx.profissional.saudacao_formal || "Médico(a) Assistente";
    ctx.papel = ctx.profissional.papel || "MEDICO_CRM";
    ctx.crm = ctx.profissional.registro_conselho || "";
    ctx.municipio = (ctx.localidade.municipio_nome && ctx.localidade.municipio_nome !== DEFAULTS.LOCALIDADE_MUNICIPIO_PADRAO)
      ? ctx.localidade.municipio_nome
      : (ctxBruto.municipio !== undefined ? ctxBruto.municipio : "");
    ctx.uf = ctx.localidade.uf || "BR";
    ctx.unidade_saude = ctx.unidade_assistencial.nome_unidade || DEFAULTS.INSTITUICAO_PADRAO;
    ctx.cenario_assistencial = ctx.unidade_assistencial.cenario_id || DEFAULTS.CENARIO_PADRAO;
    ctx.sistema_regulacao = ctx.unidade_assistencial.sistema_regulacao || DEFAULTS.SISTEMA_REGULACAO_PADRAO;
    ctx.remume_slug = ctx.farmacopeia.remume_id || DEFAULTS.CATALOGO_FARMACEUTICO_PADRAO;
    ctx.notas_ccih = (ctx.regras_locais && ctx.regras_locais.notas_ccih_fluxos) || "";

    var MAPA_CANONICO_PARA_ALIAS = {
      "protocolos_emergencia": "SALA_VERMELHA",
      "prescricao_hospitalar": "ENFERMARIA_LEITOS",
      "evolucao_soap_atestados": "SOAP_PEP",
      "receituario_remume": "RECEITUARIO_ATESTADOS",
      "cronicos_rastreio_aps": "FARMACIA_REMUME",
      "pediatria_mg_kg": "PEDIATRIA_DOSES",
      "obstetricia_prenatal_lactacao": "GO_OBSTETRICIA",
      "calculadoras_escores": "CALCULADORAS_ESCORES",
      "dva_sedacao_iot": "INTOXICACOES",
      "exames_ecg_gaso_imagem": "PRECEPTOR_EBM"
    };

    var listaAtivos = [];
    if (ctx.unidade_assistencial && ctx.unidade_assistencial.modulos_visiveis) {
      Object.keys(ctx.unidade_assistencial.modulos_visiveis).forEach(function(mk) {
        if (ctx.unidade_assistencial.modulos_visiveis[mk]) {
          listaAtivos.push(mk);
          if (MAPA_CANONICO_PARA_ALIAS[mk] && listaAtivos.indexOf(MAPA_CANONICO_PARA_ALIAS[mk]) === -1) {
            listaAtivos.push(MAPA_CANONICO_PARA_ALIAS[mk]);
          }
        }
      });
    }
    ctx.modulos_ativos = listaAtivos;

    return ctx;
  }

  var MAPA_ALIASES_MODULOS = {
    "SALA_VERMELHA": "protocolos_emergencia",
    "ENFERMARIA_LEITOS": "prescricao_hospitalar",
    "SOAP_PEP": "evolucao_soap_atestados",
    "RECEITUARIO_ATESTADOS": "receituario_remume",
    "FARMACIA_REMUME": "cronicos_rastreio_aps",
    "PEDIATRIA_DOSES": "pediatria_mg_kg",
    "GO_OBSTETRICIA": "obstetricia_prenatal_lactacao",
    "CALCULADORAS_ESCORES": "calculadoras_escores",
    "INTOXICACOES": "dva_sedacao_iot",
    "PRECEPTOR_EBM": "exames_ecg_gaso_imagem"
  };

  function resolverModuloKey(moduloKeyOuIndice) {
    if (moduloKeyOuIndice === undefined || moduloKeyOuIndice === null) return null;
    var str = String(moduloKeyOuIndice).trim();
    var upper = str.toUpperCase();
    if (MAPA_ALIASES_MODULOS[upper]) {
      return MAPA_ALIASES_MODULOS[upper];
    }
    var num = parseInt(str, 10);
    if (!isNaN(num) && num >= 1 && num <= CATALOGO_MODULOS_CLINICOS.length) {
      return CATALOGO_MODULOS_CLINICOS[num - 1].id;
    }
    var lower = str.toLowerCase();
    for (var i = 0; i < CATALOGO_MODULOS_CLINICOS.length; i++) {
      if (CATALOGO_MODULOS_CLINICOS[i].id === lower) {
        return CATALOGO_MODULOS_CLINICOS[i].id;
      }
    }
    return null;
  }

  // ============================================================================
  // GESTÃO DE CATÁLOGOS FARMACÊUTICOS (RENAME & PRESETS MUNICIPAIS)
  // ============================================================================
  var FALLBACK_RENAME_NACIONAL = {
    remume_id: "rename_nacional",
    municipio: "Brasil (Padrão Nacional)",
    uf: "BR",
    nome_exibicao: "RENAME Nacional (SUS)",
    selo_curto: "🟢 [RENAME/SUS]",
    versao: "2024.1",
    itens: [
      { principio_ativo: "Amoxicilina", apresentacao: "500mg cápsula / 250mg/5mL suspensão oral", disponivel_sus: true, nivel: "APS/UPA" },
      { principio_ativo: "Amoxicilina + Clavulanato de Potássio", apresentacao: "500mg + 125mg comprimido / 250mg + 62,5mg/5mL suspensão", disponivel_sus: true, nivel: "APS/UPA" },
      { principio_ativo: "Azitromicina", apresentacao: "500mg comprimido / 200mg/5mL suspensão oral", disponivel_sus: true, nivel: "APS/UPA" },
      { principio_ativo: "Cefalexina", apresentacao: "500mg comprimido / 250mg/5mL suspensão oral", disponivel_sus: true, nivel: "APS/UPA" },
      { principio_ativo: "Ceftriaxona", apresentacao: "1g pó para solução injetável IV/IM", disponivel_sus: true, nivel: "UPA/Hospitalar" },
      { principio_ativo: "Ciprofloxacino", apresentacao: "500mg comprimido", disponivel_sus: true, nivel: "APS/UPA" },
      { principio_ativo: "Dipirona Sódica", apresentacao: "500mg comprimido / 500mg/mL solução oral gotas / 500mg/mL injetável", disponivel_sus: true, nivel: "APS/UPA" },
      { principio_ativo: "Paracetamol", apresentacao: "500mg comprimido / 200mg/mL solução oral gotas", disponivel_sus: true, nivel: "APS/UPA" },
      { principio_ativo: "Ibuprofeno", apresentacao: "300mg e 600mg comprimido / 50mg/mL suspensão oral gotas", disponivel_sus: true, nivel: "APS/UPA" },
      { principio_ativo: "Losartana Potássica", apresentacao: "50mg comprimido", disponivel_sus: true, nivel: "APS" },
      { principio_ativo: "Hidroclorotiazida", apresentacao: "25mg comprimido", disponivel_sus: true, nivel: "APS" },
      { principio_ativo: "Anlodipino", apresentacao: "5mg e 10mg comprimido", disponivel_sus: true, nivel: "APS" },
      { principio_ativo: "Enalapril", apresentacao: "10mg e 20mg comprimido", disponivel_sus: true, nivel: "APS" },
      { principio_ativo: "Metformina", apresentacao: "500mg e 850mg comprimido", disponivel_sus: true, nivel: "APS" },
      { principio_ativo: "Sinvastatina", apresentacao: "20mg e 40mg comprimido", disponivel_sus: true, nivel: "APS" },
      { principio_ativo: "Omeprazol", apresentacao: "20mg cápsula / 40mg injetável", disponivel_sus: true, nivel: "APS/UPA" },
      { principio_ativo: "Ondansetrona", apresentacao: "4mg e 8mg comprimido / 2mg/mL injetável", disponivel_sus: true, nivel: "UPA/Hospitalar" },
      { principio_ativo: "Salbutamol", apresentacao: "100mcg/dose aerossol oral", disponivel_sus: true, nivel: "APS/UPA" },
      { principio_ativo: "Prednisona", apresentacao: "5mg e 20mg comprimido", disponivel_sus: true, nivel: "APS/UPA" },
      { principio_ativo: "Prednisolona", apresentacao: "3mg/mL solução oral", disponivel_sus: true, nivel: "APS/UPA" }
    ]
  };

  function carregarManifestPresets() {
    if (manifestCache) return manifestCache;
    var lido = lerJsonDisco("src/data/remumes/presets/manifest.json", null);
    if (lido && Array.isArray(lido.presets)) {
      manifestCache = lido;
      return manifestCache;
    }
    if (Array.isArray(lido)) {
      manifestCache = { versao: "1.0.0", presets: lido };
      return manifestCache;
    }
    manifestCache = {
      versao: "1.0.0",
      presets: [
        {
          remume_id: "rename_nacional",
          slug: "rename_nacional",
          municipio: "Brasil (Padrão Nacional)",
          uf: "BR",
          nome_exibicao: "RENAME Nacional (SUS)",
          selo_curto: "🟢 [RENAME/SUS]",
          arquivo: "src/data/remumes/rename_nacional.json"
        }
      ]
    };
    return manifestCache;
  }

  function normalizarItemRemume(item) {
    if (!item) return null;
    if (typeof item === "string") {
      var texto = item.trim();
      if (!texto) return null;
      return {
        principio_ativo: texto,
        apresentacao: "",
        disponivel_sus: true,
        nivel: "SUS"
      };
    }
    if (typeof item === "object") {
      var nome = String(
        item.principio_ativo ||
        item.medicamento ||
        item.nome ||
        item.farmaco ||
        item.principioAtivo ||
        ""
      ).trim();
      if (!nome) return null;
      return {
        principio_ativo: nome,
        apresentacao: String(item.apresentacao || item.concentracao || item.forma_farmaceutica || "").trim(),
        disponivel_sus: item.disponivel_sus !== undefined ? Boolean(item.disponivel_sus) : true,
        nivel: String(item.nivel || item.local_dispensacao || item.categoria || "SUS").trim(),
        observacoes: String(item.observacoes || item.restricao || "").trim()
      };
    }
    return null;
  }

  return {
    CATALOGO_MODULOS_CLINICOS: CATALOGO_MODULOS_CLINICOS,
    MODULOS_POR_CENARIO: MODULOS_POR_CENARIO,
    CENARIOS_ASSISTENCIAIS: CENARIOS_ASSISTENCIAIS,

    get: function(chave, valorPadrao) {
      var p = carregarPropriedades();
      if (p[chave] !== undefined && p[chave] !== null && p[chave] !== "") {
        return p[chave];
      }
      if (DEFAULTS[chave] !== undefined) {
        return DEFAULTS[chave];
      }
      return valorPadrao;
    },

    getArray: function(chave) {
      var val = this.get(chave, "[]");
      try {
        var parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
      if (typeof val === "string" && val.indexOf(",") !== -1) {
        return val.split(",").map(function(s) { return s.trim(); });
      }
      return val ? [val] : [];
    },

    getPrimary: function(chave, valorPadrao) {
      var arr = this.getArray(chave);
      if (arr && arr.length > 0 && arr[0]) return String(arr[0]).trim();
      return valorPadrao !== undefined ? valorPadrao : "";
    },

    invalidar: function() {
      propsCache = null;
      perfisCache = {};
      catalogosCache = {};
      manifestCache = null;
      solicitacoesCache = null;
    },

    exigir: function(chave) {
      var val = this.get(chave);
      if (!val) {
        throw new Error("Configuração obrigatória ausente em ScriptProperties: " + chave);
      }
      return val;
    },

    getDefaults: function() {
      return DEFAULTS;
    },

    // ==========================================================================
    // API DE MATRIZ DE CENÁRIOS E MÓDULOS CLÍNICOS
    // ==========================================================================
    listarCenariosAssistenciais: function() {
      return Object.keys(CENARIOS_ASSISTENCIAIS).map(function(k) {
        return clonarObjeto(CENARIOS_ASSISTENCIAIS[k]);
      });
    },

    listarCatalogoModulosClinicos: function() {
      return clonarObjeto(CATALOGO_MODULOS_CLINICOS);
    },

    obterModulosPadraoPorCenario: function(cenarioId) {
      var id = String(cenarioId || DEFAULTS.CENARIO_PADRAO).trim().toUpperCase();
      if (!MODULOS_POR_CENARIO[id]) {
        id = DEFAULTS.CENARIO_PADRAO;
      }
      return clonarObjeto(MODULOS_POR_CENARIO[id]);
    },

    // ==========================================================================
    // API MULTI-PERFIL POR CHAT_ID (CONTEXTO CLÍNICO)
    // ==========================================================================
    getContextoClinico: function(chatId) {
      var cid = sanitizarChatId(chatId);
      if (perfisCache[cid]) {
        return clonarObjeto(perfisCache[cid]);
      }

      // 1. Tenta carregar do disco de runtime (data/profiles/<cid>.json)
      var lidoDisco = lerJsonDisco("data/profiles/" + cid + ".json", null);
      if (lidoDisco && typeof lidoDisco === "object") {
        var normDisco = normalizarContextoClinico(lidoDisco, chatId || cid);
        perfisCache[cid] = normDisco;
        return clonarObjeto(normDisco);
      }

      // 2. Tenta carregar de PropertiesService (PERFIL_CLINICO_<cid> ou CONTEXTO_CLINICO_<cid>)
      var p = carregarPropriedades();
      var propKey = "PERFIL_CLINICO_" + cid;
      var propKeyAlt = "CONTEXTO_CLINICO_" + cid;
      var propVal = p[propKey] || p[propKeyAlt];
      if (propVal) {
        try {
          var parsedProp = JSON.parse(propVal);
          var normProp = normalizarContextoClinico(parsedProp, chatId || cid);
          perfisCache[cid] = normProp;
          return clonarObjeto(normProp);
        } catch (e) {}
      }

      // 3. Tenta carregar dos perfis canônicos versionados no repositório (src/data/profiles/<cid>.json)
      var lidoSrc = lerJsonDisco("src/data/profiles/" + cid + ".json", null);
      if (!lidoSrc) {
        var titularChat = (typeof this.getPrimary === "function") ? this.getPrimary("TELEGRAM_CHAT_ID") : "";
        if (cid === titularChat || cid === "default" || !titularChat) {
          lidoSrc = lerJsonDisco("src/data/profiles/default.json", null) ||
                    (titularChat ? lerJsonDisco("src/data/profiles/" + titularChat + ".json", null) : null);
        }
      }
      if (lidoSrc && typeof lidoSrc === "object") {
        var normSrc = normalizarContextoClinico(lidoSrc, chatId || cid);
        perfisCache[cid] = normSrc;
        try { escreverJsonDisco("data/profiles/" + cid + ".json", normSrc); } catch (_) {}
        salvarPropriedadeScript("PERFIL_CLINICO_" + cid, JSON.stringify(normSrc));
        salvarPropriedadeScript("CONTEXTO_CLINICO_" + cid, JSON.stringify(normSrc));
        return clonarObjeto(normSrc);
      }

      // 4. Retorna perfil padrão (enriquecido com variáveis de ambiente/defaults)
      var padrao = normalizarContextoClinico(criarContextoPadrao(chatId || cid), chatId || cid);
      perfisCache[cid] = padrao;
      return clonarObjeto(padrao);
    },

    salvarContextoClinico: function(chatId, patch) {
      var cid = sanitizarChatId(chatId);
      var atual = this.getContextoClinico(chatId || cid);
      var delta = patch && typeof patch === "object" ? patch : {};

      if (delta.onboarding_concluido !== undefined) {
        atual.onboarding_concluido = Boolean(delta.onboarding_concluido);
      }

      // Suporte a campos planos (top-level) enviados pelo Router, SOAP ou Cockpit
      if (delta.prefixo_tratamento !== undefined) atual.profissional.prefixo = delta.prefixo_tratamento;
      if (delta.nome_chamada !== undefined) atual.profissional.nome_chamada = delta.nome_chamada;
      if (delta.nome_completo_carimbo !== undefined) atual.profissional.nome_completo_carimbo = delta.nome_completo_carimbo;
      if (delta.papel !== undefined) atual.profissional.papel = delta.papel;
      if (delta.crm !== undefined) atual.profissional.registro_conselho = delta.crm;

      if (delta.municipio !== undefined) {
        atual.localidade.municipio_nome = delta.municipio || DEFAULTS.LOCALIDADE_MUNICIPIO_PADRAO;
      }
      if (delta.uf !== undefined) {
        atual.localidade.uf = delta.uf || DEFAULTS.LOCALIDADE_UF_PADRAO;
      }
      if (delta.municipio !== undefined || delta.uf !== undefined) {
        atual.localidade.municipio_slug = gerarSlugMunicipio(atual.localidade.municipio_nome, atual.localidade.uf);
      }

      if (delta.unidade_saude !== undefined) {
        atual.unidade_assistencial.nome_unidade = delta.unidade_saude;
      }
      if (delta.cenario_assistencial !== undefined) {
        var cenUp = String(delta.cenario_assistencial).toUpperCase();
        if (MODULOS_POR_CENARIO[cenUp]) {
          atual.unidade_assistencial.cenario_id = cenUp;
          atual.unidade_assistencial.nivel_atencao = cenUp;
          if (!delta.modulos_ativos) {
            atual.unidade_assistencial.modulos_visiveis = clonarObjeto(MODULOS_POR_CENARIO[cenUp]);
          }
        }
      }
      if (delta.sistema_regulacao !== undefined) {
        atual.unidade_assistencial.sistema_regulacao = delta.sistema_regulacao;
      }
      if (Array.isArray(delta.modulos_ativos)) {
        var novoMapaMod = {};
        CATALOGO_MODULOS_CLINICOS.forEach(function(m) { novoMapaMod[m.id] = false; });
        delta.modulos_ativos.forEach(function(item) {
          var rk = resolverModuloKey(item);
          if (rk) novoMapaMod[rk] = true;
        });
        atual.unidade_assistencial.modulos_visiveis = novoMapaMod;
      }
      if (delta.remume_slug !== undefined) {
        atual.farmacopeia.remume_id = delta.remume_slug;
        atual.localidade.municipio_slug = delta.remume_slug;
      }
      if (delta.notas_ccih !== undefined) {
        atual.regras_locais.notas_ccih_fluxos = delta.notas_ccih;
      }

      if (delta.profissional && typeof delta.profissional === "object") {
        Object.keys(delta.profissional).forEach(function(k) {
          if (delta.profissional[k] !== undefined) {
            atual.profissional[k] = delta.profissional[k];
          }
        });
      }

      if (delta.localidade && typeof delta.localidade === "object") {
        Object.keys(delta.localidade).forEach(function(k) {
          if (delta.localidade[k] !== undefined) {
            atual.localidade[k] = delta.localidade[k];
          }
        });
        if (delta.localidade.municipio_nome || delta.localidade.uf) {
          if (!delta.localidade.municipio_slug) {
            atual.localidade.municipio_slug = gerarSlugMunicipio(
              atual.localidade.municipio_nome,
              atual.localidade.uf
            );
          }
        }
      }

      if (delta.unidade_assistencial && typeof delta.unidade_assistencial === "object") {
        var novoCenario = delta.unidade_assistencial.cenario_id;
        Object.keys(delta.unidade_assistencial).forEach(function(k) {
          if (k === "modulos_visiveis") return;
          if (delta.unidade_assistencial[k] !== undefined) {
            atual.unidade_assistencial[k] = delta.unidade_assistencial[k];
          }
        });
        if (novoCenario && MODULOS_POR_CENARIO[String(novoCenario).toUpperCase()]) {
          var cId = String(novoCenario).toUpperCase();
          atual.unidade_assistencial.cenario_id = cId;
          atual.unidade_assistencial.nivel_atencao = delta.unidade_assistencial.nivel_atencao || cId;
          if (!delta.unidade_assistencial.modulos_visiveis) {
            atual.unidade_assistencial.modulos_visiveis = clonarObjeto(MODULOS_POR_CENARIO[cId]);
          }
        }
        if (
          delta.unidade_assistencial.modulos_visiveis &&
          typeof delta.unidade_assistencial.modulos_visiveis === "object"
        ) {
          Object.keys(delta.unidade_assistencial.modulos_visiveis).forEach(function(mk) {
            if (atual.unidade_assistencial.modulos_visiveis[mk] !== undefined) {
              atual.unidade_assistencial.modulos_visiveis[mk] = Boolean(
                delta.unidade_assistencial.modulos_visiveis[mk]
              );
            }
          });
        }
      }

      if (delta.farmacopeia && typeof delta.farmacopeia === "object") {
        Object.keys(delta.farmacopeia).forEach(function(k) {
          if (delta.farmacopeia[k] !== undefined) {
            atual.farmacopeia[k] = delta.farmacopeia[k];
          }
        });
      }

      if (delta.regras_locais && typeof delta.regras_locais === "object") {
        Object.keys(delta.regras_locais).forEach(function(k) {
          if (delta.regras_locais[k] !== undefined) {
            atual.regras_locais[k] = delta.regras_locais[k];
          }
        });
      }

      atual.atualizado_em = new Date().toISOString();
      var normalizado = normalizarContextoClinico(atual, chatId || cid);
      if (delta.municipio !== undefined) {
        normalizado.municipio = delta.municipio;
      }

      perfisCache[cid] = normalizado;
      escreverJsonDisco("data/profiles/" + cid + ".json", normalizado);
      salvarPropriedadeScript("PERFIL_CLINICO_" + cid, JSON.stringify(normalizado));
      salvarPropriedadeScript("CONTEXTO_CLINICO_" + cid, JSON.stringify(normalizado));

      return clonarObjeto(normalizado);
    },

    aplicarCenarioAssistencial: function(chatId, cenarioId) {
      var id = String(cenarioId || DEFAULTS.CENARIO_PADRAO).trim().toUpperCase();
      if (!MODULOS_POR_CENARIO[id]) {
        id = DEFAULTS.CENARIO_PADRAO;
      }
      var modulos = clonarObjeto(MODULOS_POR_CENARIO[id]);
      return this.salvarContextoClinico(chatId, {
        unidade_assistencial: {
          cenario_id: id,
          nivel_atencao: id,
          modulos_visiveis: modulos
        }
      });
    },

    alternarModuloCenario: function(chatId, moduloKeyOuIndice, valorExplicito) {
      var modKey = resolverModuloKey(moduloKeyOuIndice);
      if (!modKey) {
        var ctxFallback = this.getContextoClinico(chatId);
        ctxFallback.sucesso = false;
        return ctxFallback;
      }
      var ctx = this.getContextoClinico(chatId);
      var estadoAtual = Boolean(ctx.unidade_assistencial.modulos_visiveis[modKey]);
      var novoEstado = valorExplicito !== undefined ? Boolean(valorExplicito) : !estadoAtual;

      var patchModulos = {};
      patchModulos[modKey] = novoEstado;

      var atualizado = this.salvarContextoClinico(chatId, {
        unidade_assistencial: {
          modulos_visiveis: patchModulos
        }
      });

      var metaModulo = null;
      for (var i = 0; i < CATALOGO_MODULOS_CLINICOS.length; i++) {
        if (CATALOGO_MODULOS_CLINICOS[i].id === modKey) {
          metaModulo = CATALOGO_MODULOS_CLINICOS[i];
          break;
        }
      }

      atualizado.sucesso = true;
      atualizado.modulo_id = modKey;
      atualizado.modulo_nome = metaModulo ? metaModulo.nome : modKey;
      atualizado.ativo = novoEstado;
      atualizado.contexto = clonarObjeto(atualizado);
      return atualizado;
    },

    obterSaudacaoFormal: function(chatId) {
      var ctx = this.getContextoClinico(chatId);
      return (ctx.profissional && ctx.profissional.saudacao_formal) || DEFAULTS.TELEGRAM_TITULAR_NAME;
    },

    obterCarimboMedico: function(chatId) {
      var ctx = this.getContextoClinico(chatId);
      var ident = computarSaudacaoECarimbo(ctx.profissional);
      var crm = String(ctx.profissional.registro_conselho || "").trim();
      var uf = String(ctx.profissional.uf_conselho || "").trim().toUpperCase();
      if (crm) {
        var sufixoCrm = crm.toUpperCase().indexOf("CRM") === 0 ? crm : ("CRM" + (uf && uf !== "BR" ? "/" + uf : "") + " " + crm);
        return ident.carimbo_formatado + " — " + sufixoCrm;
      }
      return ident.carimbo_formatado;
    },

    // ==========================================================================
    // MOTOR DE CATÁLOGOS REMUME, AUTO-PROMOÇÃO E SOLICITAÇÕES AO DESENVOLVEDOR
    // ==========================================================================
    gerarSlugMunicipio: gerarSlugMunicipio,

    listarPresetsRemume: function() {
      var manifest = carregarManifestPresets();
      return clonarObjeto(manifest.presets || []);
    },

    obterCatalogoRemume: function(slugOuId) {
      var slug = String(slugOuId || DEFAULTS.CATALOGO_FARMACEUTICO_PADRAO).trim().toLowerCase();
      if (!slug) slug = "rename_nacional";

      if (catalogosCache[slug]) {
        return clonarObjeto(catalogosCache[slug]);
      }

      if (slug === "rename_nacional") {
        var renameDisco = lerJsonDisco("src/data/remumes/rename_nacional.json", null);
        var catRename = renameDisco && Array.isArray(renameDisco.itens) ? renameDisco : FALLBACK_RENAME_NACIONAL;
        catalogosCache[slug] = catRename;
        return clonarObjeto(catRename);
      }

      // Busca no diretório de presets municipais
      var presetDisco = lerJsonDisco("src/data/remumes/presets/" + slug + ".json", null);
      if (presetDisco && (Array.isArray(presetDisco.itens) || Array.isArray(presetDisco.medicamentos))) {
        if (!presetDisco.itens && Array.isArray(presetDisco.medicamentos)) {
          presetDisco.itens = presetDisco.medicamentos;
        }
        catalogosCache[slug] = presetDisco;
        return clonarObjeto(presetDisco);
      }

      // Busca em PropertiesService caso tenha sido salvo em ambiente sem FS
      var p = carregarPropriedades();
      var propPreset = p["REMUME_PRESET_" + slug];
      if (propPreset) {
        try {
          var parsed = JSON.parse(propPreset);
          if (parsed && (Array.isArray(parsed.itens) || Array.isArray(parsed.medicamentos))) {
            catalogosCache[slug] = parsed;
            return clonarObjeto(parsed);
          }
        } catch (e) {}
      }

      return null;
    },

    /**
     * REGRA CRÍTICA DE AUTO-PROMOÇÃO PARA PRESET GLOBAL:
     * Aceita tanto objeto `{ municipio, uf, itens }` quanto argumentos `(municipio, uf, conteudoBruto, fonte, chatId)`
     * e delega ao CatalogoRemumeService quando disponível para atualizar `src/data/remumes/presets/<slug>.json` e `manifest.json`.
     */
    promoverRemumeParaPresetGlobal: function(arg1, ufArg, conteudoArg, fonteArg, chatIdArg) {
      if (typeof arg1 === "string") {
        var munStr = arg1;
        var ufStr = ufArg || "BR";
        var cont = conteudoArg;
        var fnt = fonteArg || ("Colaboração (" + munStr + ")");
        if (typeof CatalogoRemumeService !== "undefined" && typeof CatalogoRemumeService.importarEPromoverRemume === "function") {
          var resCat = CatalogoRemumeService.importarEPromoverRemume(munStr, ufStr, cont, fnt);
          if (resCat && resCat.sucesso && chatIdArg) {
            this.salvarContextoClinico(chatIdArg, {
              municipio: munStr,
              uf: ufStr,
              remume_slug: resCat.slug
            });
          }
          if (resCat) {
            resCat.promovido = Boolean(resCat.sucesso);
            resCat.total_itens = resCat.total || 0;
          }
          return resCat;
        }
        var linhas = typeof cont === "string" ? cont.split(/\r?\n/).filter(Boolean) : (Array.isArray(cont) ? cont : []);
        return this.promoverRemumeParaPresetGlobal({
          municipio: munStr,
          uf: ufStr,
          origem: fnt,
          itens: linhas
        });
      }

      var dadosCatalogo = arg1;
      if (!dadosCatalogo || typeof dadosCatalogo !== "object") {
        return { promovido: false, sucesso: false, motivo: "Dados do catálogo ausentes ou inválidos." };
      }

      var municipio = String(dadosCatalogo.municipio || "").trim();
      var uf = String(dadosCatalogo.uf || "").trim().toUpperCase();
      var slug = String(dadosCatalogo.slug || dadosCatalogo.remume_id || "").trim().toLowerCase();
      if (!slug || slug === "rename_nacional") {
        slug = gerarSlugMunicipio(municipio, uf);
      }

      if (!slug || slug === "rename_nacional") {
        return { promovido: false, sucesso: false, motivo: "Município/UF insuficientes para gerar preset municipal." };
      }

      var itensBrutos = Array.isArray(dadosCatalogo.itens) ? dadosCatalogo.itens : (Array.isArray(dadosCatalogo.medicamentos) ? dadosCatalogo.medicamentos : []);
      var itensValidos = [];
      var vistos = {};

      for (var i = 0; i < itensBrutos.length; i++) {
        var norm = normalizarItemRemume(itensBrutos[i]);
        if (norm && norm.principio_ativo) {
          var chaveDedup = (norm.principio_ativo + "|" + norm.apresentacao).toLowerCase();
          if (!vistos[chaveDedup]) {
            vistos[chaveDedup] = true;
            itensValidos.push(norm);
          }
        }
      }

      if (itensValidos.length < 3) {
        return {
          promovido: false,
          sucesso: false,
          motivo: "O catálogo precisa ter pelo menos 3 medicamentos válidos para promoção a preset global (recebidos: " + itensValidos.length + ")."
        };
      }

      var nomeExibicao = String(
        dadosCatalogo.nome_exibicao ||
        ("REMUME " + (municipio || slug) + (uf && uf !== "BR" ? " (" + uf + ")" : ""))
      ).trim();

      var seloCurto = String(
        dadosCatalogo.selo_curto ||
        ("🟢 [REMUME-" + (uf && uf !== "BR" ? uf : "MUN") + "]")
      ).trim();

      var caminhoRelativo = "src/data/remumes/presets/" + slug + ".json";
      var catalogoFinal = {
        remume_id: slug,
        slug: slug,
        municipio: municipio || slug,
        uf: uf || "BR",
        nome_exibicao: nomeExibicao,
        selo: seloCurto,
        selo_curto: seloCurto,
        origem: String(dadosCatalogo.origem || "IMPORTACAO_COLABORATIVA"),
        atualizado_em: new Date().toISOString(),
        total_itens: itensValidos.length,
        itens: itensValidos,
        medicamentos: itensValidos
      };

      catalogosCache[slug] = catalogoFinal;
      escreverJsonDisco(caminhoRelativo, catalogoFinal);
      salvarPropriedadeScript("REMUME_PRESET_" + slug, JSON.stringify(catalogoFinal));

      var manifest = carregarManifestPresets();
      if (!Array.isArray(manifest.presets)) {
        manifest.presets = [];
      }

      var metaPreset = {
        remume_id: slug,
        slug: slug,
        municipio: catalogoFinal.municipio,
        uf: catalogoFinal.uf,
        nome_exibicao: nomeExibicao,
        selo: seloCurto,
        selo_curto: seloCurto,
        total_medicamentos: itensValidos.length,
        total_itens: itensValidos.length,
        atualizado_em: catalogoFinal.atualizado_em,
        arquivo: slug + ".json"
      };

      var encontrado = false;
      for (var j = 0; j < manifest.presets.length; j++) {
        var pExistente = manifest.presets[j];
        if (pExistente && (pExistente.slug === slug || pExistente.remume_id === slug)) {
          manifest.presets[j] = metaPreset;
          encontrado = true;
          break;
        }
      }
      if (!encontrado) {
        manifest.presets.push(metaPreset);
      }

      manifest.atualizado_em = catalogoFinal.atualizado_em;
      manifestCache = manifest;
      escreverJsonDisco("src/data/remumes/presets/manifest.json", manifest);

      return {
        promovido: true,
        sucesso: true,
        slug: slug,
        remume_id: slug,
        nome_exibicao: nomeExibicao,
        selo_curto: seloCurto,
        total: itensValidos.length,
        total_itens: itensValidos.length,
        arquivo: caminhoRelativo,
        catalogo: clonarObjeto(catalogoFinal)
      };
    },

    registrarSolicitacaoRemume: function(arg1, arg2, arg3) {
      // Aceita tanto (municipio, uf, chatId) quanto (chatId, municipio, uf)
      var mun, ufNorm, cid;
      if (arg2 && String(arg2).trim().length === 2 && /^[A-Za-z]{2}$/.test(String(arg2).trim())) {
        mun = String(arg1 || "").trim();
        ufNorm = String(arg2 || "BR").trim().toUpperCase();
        cid = String(arg3 || "default").trim();
      } else {
        cid = String(arg1 || "default").trim();
        mun = String(arg2 || "").trim();
        ufNorm = String(arg3 || "BR").trim().toUpperCase();
      }
      var slug = gerarSlugMunicipio(mun, ufNorm);
      var ctxSolicitante = (typeof this.getContextoClinico === "function") ? this.getContextoClinico(cid) : null;
      var nomeMed = (ctxSolicitante && ctxSolicitante.profissional && ctxSolicitante.profissional.saudacao_formal) || "Médico(a)";

      var lista = this.listarSolicitacoesRemume();
      var existente = null;
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].slug === slug) {
          existente = lista[i];
          break;
        }
      }

      var agora = new Date().toISOString();
      if (existente) {
        if (!Array.isArray(existente.solicitantes)) {
          existente.solicitantes = [];
        }
        if (cid && existente.solicitantes.indexOf(cid) === -1) {
          existente.solicitantes.push(cid);
        }
        if (!Array.isArray(existente.detalhes_solicitantes)) {
          existente.detalhes_solicitantes = [];
        }
        var jaTemDetalhe = existente.detalhes_solicitantes.some(function(d) { return String(d.chat_id) === String(cid); });
        if (!jaTemDetalhe) {
          existente.detalhes_solicitantes.push({ chat_id: cid, nome: nomeMed, data: agora });
        }
        existente.atualizado_em = agora;
        if (existente.status !== "APROVADA") {
          existente.status = "PENDENTE";
        }
      } else {
        existente = {
          slug: slug,
          municipio: mun || slug,
          uf: ufNorm,
          status: "PENDENTE",
          solicitantes: cid ? [cid] : [],
          detalhes_solicitantes: cid ? [{ chat_id: cid, nome: nomeMed, data: agora }] : [],
          criado_em: agora,
          atualizado_em: agora
        };
        lista.push(existente);
      }

      solicitacoesCache = lista;
      escreverJsonDisco("data/remume_requests.json", lista);
      salvarPropriedadeScript("REMUME_REQUESTS_QUEUE", JSON.stringify(lista));
      if (typeof PersistenciaBot !== "undefined" && typeof PersistenciaBot.salvar === "function") {
        try { PersistenciaBot.salvar("remume_requests_queue", lista); } catch (eP) {}
      }

      return clonarObjeto(existente);
    },

    listarSolicitacoesRemume: function() {
      if (solicitacoesCache) return clonarObjeto(solicitacoesCache);
      var lidoDisco = lerJsonDisco("data/remume_requests.json", null);
      if (Array.isArray(lidoDisco) && lidoDisco.length > 0) {
        solicitacoesCache = lidoDisco;
        return clonarObjeto(lidoDisco);
      }
      if (typeof PersistenciaBot !== "undefined" && typeof PersistenciaBot.ler === "function") {
        try {
          var lidoPersist = PersistenciaBot.ler("remume_requests_queue");
          if (Array.isArray(lidoPersist) && lidoPersist.length > 0) {
            solicitacoesCache = lidoPersist;
            return clonarObjeto(lidoPersist);
          }
        } catch (eP) {}
      }
      var p = carregarPropriedades();
      if (p.REMUME_REQUESTS_QUEUE) {
        try {
          var parsed = JSON.parse(p.REMUME_REQUESTS_QUEUE);
          if (Array.isArray(parsed)) {
            solicitacoesCache = parsed;
            return clonarObjeto(parsed);
          }
        } catch (e) {}
      }
      solicitacoesCache = [];
      return [];
    },

    rejeitarSolicitacaoRemume: function(slugOuMunicipio, uf) {
      var slug = uf ? gerarSlugMunicipio(slugOuMunicipio, uf) : String(slugOuMunicipio || "").trim().toLowerCase();
      var lista = this.listarSolicitacoesRemume();
      var encontrado = null;
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].slug === slug || String(lista[i].municipio || "").toLowerCase() === slug) {
          lista[i].status = "ARQUIVADA";
          lista[i].atualizado_em = new Date().toISOString();
          encontrado = lista[i];
          break;
        }
      }
      solicitacoesCache = lista;
      escreverJsonDisco("data/remume_requests.json", lista);
      salvarPropriedadeScript("REMUME_REQUESTS_QUEUE", JSON.stringify(lista));
      if (typeof PersistenciaBot !== "undefined" && typeof PersistenciaBot.salvar === "function") {
        try { PersistenciaBot.salvar("remume_requests_queue", lista); } catch (eP) {}
      }
      return clonarObjeto(encontrado);
    },

    aprovarSolicitacaoRemume: function(municipio, uf, itens, fonte) {
      var mun = String(municipio || "").trim();
      var ufNorm = String(uf || "BR").trim().toUpperCase();
      var slug = gerarSlugMunicipio(mun, ufNorm);

      var promocao = this.promoverRemumeParaPresetGlobal(mun, ufNorm, itens, fonte || "APROVACAO_ADMIN");

      if (!promocao || (!promocao.promovido && !promocao.sucesso)) {
        return {
          aprovado: false,
          sucesso: false,
          motivo: promocao ? promocao.motivo : "Falha na promoção",
          slug: slug,
          solicitantes: [],
          solicitantes_notificar: []
        };
      }

      var lista = this.listarSolicitacoesRemume();
      var solicitantesNotificar = [];
      var agora = new Date().toISOString();

      for (var i = 0; i < lista.length; i++) {
        if (lista[i].slug === slug) {
          lista[i].status = "APROVADA";
          lista[i].aprovado_em = agora;
          lista[i].total_itens = promocao.total_itens || promocao.total;
          if (Array.isArray(lista[i].solicitantes)) {
            solicitantesNotificar = lista[i].solicitantes.slice();
          }
        }
      }

      solicitacoesCache = lista;
      escreverJsonDisco("data/remume_requests.json", lista);
      salvarPropriedadeScript("REMUME_REQUESTS_QUEUE", JSON.stringify(lista));

      for (var s = 0; s < solicitantesNotificar.length; s++) {
        var chatSolicitante = solicitantesNotificar[s];
        this.salvarContextoClinico(chatSolicitante, {
          municipio: mun || slug,
          uf: ufNorm,
          remume_slug: promocao.slug || slug
        });
      }

      return {
        aprovado: true,
        sucesso: true,
        slug: promocao.slug || slug,
        nome_exibicao: promocao.nome_exibicao,
        selo_curto: promocao.selo_curto,
        total: promocao.total || promocao.total_itens,
        total_itens: promocao.total_itens || promocao.total,
        solicitantes: solicitantesNotificar,
        solicitantes_notificar: solicitantesNotificar,
        catalogo: promocao.catalogo
      };
    },

    // ==========================================================================
    // COMPARTILHAMENTO DE PERFIL DE UNIDADE ASSISTENCIAL ENTRE EQUIPES
    // ==========================================================================
    gerarCodigoUnidade: function(chatId) {
      var ctx = this.getContextoClinico(chatId);
      var payload = {
        m: ctx.municipio || "",
        u: ctx.uf || "BR",
        un: ctx.unidade_saude || DEFAULTS.INSTITUICAO_PADRAO,
        c: ctx.cenario_assistencial || DEFAULTS.CENARIO_PADRAO,
        r: ctx.remume_slug || DEFAULTS.CATALOGO_FARMACEUTICO_PADRAO,
        sr: ctx.sistema_regulacao || DEFAULTS.SISTEMA_REGULACAO_PADRAO,
        mod: ctx.modulos_ativos || [],
        ccih: ctx.notas_ccih || ""
      };
      var jsonStr = JSON.stringify(payload);
      var b64 = "";
      if (typeof Buffer !== "undefined") {
        b64 = Buffer.from(jsonStr, "utf8").toString("base64url");
      } else if (typeof Utilities !== "undefined" && Utilities.base64EncodeWebSafe) {
        b64 = Utilities.base64EncodeWebSafe(jsonStr);
      }
      var codigo = "EQP-" + b64;
      unidadesCompartilhadasCache[codigo] = payload;
      return codigo;
    },

    importarCodigoUnidade: function(chatId, codigoBruto) {
      var limpo = String(codigoBruto || "").trim().replace(/^EQP-/i, "");
      if (!limpo) return null;
      try {
        var jsonStr = "";
        if (typeof Buffer !== "undefined") {
          jsonStr = Buffer.from(limpo, "base64url").toString("utf8");
        }
        var p = JSON.parse(jsonStr);
        if (!p || typeof p !== "object") return null;
        return this.salvarContextoClinico(chatId, {
          municipio: p.m || "",
          uf: p.u || "BR",
          unidade_saude: p.un || DEFAULTS.INSTITUICAO_PADRAO,
          cenario_assistencial: p.c || DEFAULTS.CENARIO_PADRAO,
          remume_slug: p.r || DEFAULTS.CATALOGO_FARMACEUTICO_PADRAO,
          sistema_regulacao: p.sr || DEFAULTS.SISTEMA_REGULACAO_PADRAO,
          modulos_ativos: Array.isArray(p.mod) ? p.mod : undefined,
          notas_ccih: p.ccih || ""
        });
      } catch (e) {
        return null;
      }
    }
  };
})();

// Variáveis globais de compatibilidade
var TELEGRAM_BOT_TOKEN = ConfigService.get("TELEGRAM_BOT_TOKEN");
var TELEGRAM_CHAT_ID = ConfigService.get("TELEGRAM_CHAT_ID");
var NOTION_TOKEN = ConfigService.get("NOTION_TOKEN");
var NOTION_HABIT_LOG_DB_ID = ConfigService.get("NOTION_HABIT_LOG_DB_ID");
var NOTION_TASKS_DB_ID = ConfigService.get("NOTION_TASKS_DB_ID");
var PROVEDOR_TEXTO_PADRAO = ConfigService.get("PROVEDOR_TEXTO_PADRAO", "GEMINI");
var GROQ_API_KEY = ConfigService.get("GROQ_API_KEY");
var OPENROUTER_API_KEY = ConfigService.get("OPENROUTER_API_KEY");
var ZAI_API_KEY = ConfigService.get("ZAI_API_KEY");
var GEMINI_API_KEYS = ConfigService.getArray("GEMINI_API_KEYS");
var LOCAL_LLM_URL = ConfigService.get("LOCAL_LLM_URL", "http://127.0.0.1:11434/v1/chat/completions");
var LOCAL_LLM_API_KEY = ConfigService.get("LOCAL_LLM_API_KEY", "ollama");
var IA_MODELOS_LOCAL = ConfigService.getArray("IA_MODELOS_LOCAL");
var TIMEZONE = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
var SPREADSHEET_ID_REMUME = ConfigService.get("SPREADSHEET_ID_REMUME");
var SPREADSHEET_ID_INTERACOES = ConfigService.get("SPREADSHEET_ID_INTERACOES");
var WEB_APP_URL = ConfigService.get("WEB_APP_URL");
var IA_LOCAL_ENDPOINT = ConfigService.get("IA_LOCAL_ENDPOINT");
var IA_MODELOS_LOCAL = ConfigService.get("IA_MODELOS_LOCAL");

if (typeof module !== "undefined" && module.exports) {
  module.exports = ConfigService;
}