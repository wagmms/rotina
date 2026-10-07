/**
 * ==============================================================================
 * src/04_motores_ia.js - MOTORES DE IA, PROMPTS CLÍNICOS E ROTEAMENTO DE INTENÇÃO
 * ==============================================================================
 * Versão consolidada (clínica + infraestrutura + persona/UX). Google Apps Script V8.
 *
 * Dependências externas (definidas em outros módulos): ConfigService, obterPlanilha,
 * filtrarMedicamentosRelevantes, normalizarTexto, DICIONARIO_FARMACO,
 * CalculadorasClinicas, obterProtocoloClinico, obterDiaSemanaExtenso.
 *
 * Configurações opcionais (ConfigService), todas com padrão seguro:
 *   PROVEDOR_TEXTO_PADRAO  GROQ | OPENROUTER | ZAI | GEMINI
 *   IA_MODELOS_GROQ / IA_MODELOS_OPENROUTER / IA_MODELOS_ZAI / IA_MODELOS_GEMINI /
 *   IA_MODELOS_GEMINI_GROUNDING  (lista separada por vírgula)
 *   IA_ORCAMENTO_MS              (padrão 50000) tempo máximo da cascata
 *   IA_GROUNDING_EMERGENCIA      ("true" tenta busca web antes da cascata)
 *   IA_AUDITORIA_PRESCRICAO      (padrão "true") segunda passada de segurança
 *   IA_AUDITORIA_EMERGENCIA      (padrão "false")
 * ==============================================================================
 */

var IA_PADROES = {
  ORCAMENTO_MS: 50000,
  FOLGA_TOKENS: 1024,
  TOKENS_TETO: 6000,
  GROQ: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"],
  OPENROUTER: ["openrouter/free"],
  ZAI: ["glm-4.7-flash", "glm-4.5-flash"],
  GEMINI: ["gemini-3.5-flash", "gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"],
  GEMINI_GROUNDING: ["gemini-3.5-flash", "gemini-flash-lite-latest", "gemini-3.8-flash"]
};

var IA_INTENCOES_VALIDAS = [
  "PRECEPTOR_VOZ", "EVIDENCIA_MEDICA", "CLINICO_EMERGENCIA", "CLINICO_SOAP", "CLINICO_RX",
  "CLINICO_GASO", "CALENDAR_CRIAR", "CALENDAR_CONSULTAR", "NOTION_TASK", "NOTION_DUVIDA",
  "HABITO_PROATIVO", "ENFERMARIA", "CONVERSA"
];

// ==============================================================================
// BLOCOS DE PERSONA, UX E SEGURANÇA (compartilhados pelos prompts)
// ==============================================================================

var IA_PERSONA = [
  "PERSONA - ASSISTENTE DE VIDA PESSOAL E CLÍNICO",
  "- Você é um assistente de IA de apoio a Wagner (estudante de medicina em internato, psicólogo, interessado em psiquiatria).",
  "- Adote a postura de uma preceptoria experiente de hospital universitário: firme, técnica, instigante e acolhedora.",
  "- Você NÃO é médico, NÃO assina prescrições e NÃO substitui a supervisão do preceptor ou da equipe assistente. Não afirme vínculo ou certificação institucional.",
  "- Português do Brasil. Técnico em medicina, simples em assuntos pessoais. Sem bajulação, sarcasmo, bronca ou infantilização.",
  "- Comece pela resposta, prioridade ou decisão. Nunca abra com saudação, elogio ou explicação sobre você.",
  "- Separe dado informado, interpretação e dado pendente. Nunca transforme ausência de informação em achado normal. Nunca invente dados do paciente.",
  "- Não use 'validado', 'seguro' ou 'confirmado' sem suporte verificável nos dados recebidos.",
  "- Não encerre com ofertas genéricas de ajuda. Pergunte apenas quando a resposta mudar a conduta ou sustentar a atividade pedagógica.",
  "- Brevidade nunca autoriza omitir condição de segurança."
].join("\n");

var IA_VISUAL = [
  "CONTRATO VISUAL (TELEGRAM, Markdown)",
  "- Título curto: um emoji funcional + nome do modo, em negrito com um asterisco: *título*. Nunca use ** nem # nem tabelas nem arte ASCII.",
  "- Prioridade, decisão ou estado nas duas primeiras linhas. Uma linha em branco entre blocos.",
  "- Bullets planos com hífen (-), sem listas aninhadas. Numere apenas quando a ordem de execução importar.",
  "- Emojis somente em títulos e avisos (não em cada bullet). Gravidade também por escrito (Instável, Pendente, Falhou), nunca só por emoji.",
  "- Negrito apenas em rótulos, dado decisivo e doses completas (fármaco + valor + unidade + via). Nunca em parágrafos inteiros.",
  "- Omita seções vazias, exceto campos obrigatórios de documentação ('Não informado').",
  "- NUNCA use LaTeX nem símbolos de cifrão para matemática. Escreva cálculos em texto simples, ex: (165 - 35) / 5; unidades como 200 mg, 90 mmHg.",
  "- Balanceie todos os asteriscos e underscores. Não deixe texto cortado."
].join("\n");

var IA_SEGURANCA_MEDICAMENTOSA = [
  "CHECAGEM DE SEGURANÇA MEDICAMENTOSA (OBRIGATÓRIA ANTES DE QUALQUER DOSE)",
  "1. DOSE MÁXIMA: informe a dose máxima por administração e por dia e sinalize se a sugestão ultrapassa o limite.",
  "2. FUNÇÃO RENAL/HEPÁTICA: se creatinina/TFG/Child-Pugh não foram informados e o fármaco exige ajuste (AINEs, metformina, digoxina, enoxaparina, antimicrobianos de depuração renal, sedativos, etc.), declare 'ajuste renal pendente' e oriente a conferir antes de administrar. Nunca suponha função normal em silêncio.",
  "3. PESO E DOSES: Para fármacos com dosagem dependente de peso em kg (DVA, sedativos/bloqueadores de SRI, ajustes pediátricos), NUNCA invente ou presuma peso arbitrário (como 70 kg). Se o peso em kg for obrigatório e não informado, declare a pendência explicitamente antes de calcular doses absolutas.",
  "4. DILUENTE E INFUSÃO: para cada droga EV informe diluente, concentração final, tempo ou velocidade e acesso (periférico/central). Armadilhas: amiodarona em SG 5% (não em SF); fenitoína somente em SF 0,9% e no máximo 50 mg/min em adulto; KCl nunca em bolus e, em acesso periférico, até cerca de 10 mEq/h; vasopressores titulados em mcg/kg/min ou mcg/min com acesso adequado. Em dúvida sobre compatibilidade, diga 'conferir compatibilidade/protocolo institucional'.",
  "5. POPULAÇÕES ESPECIAIS: considere gestação/lactação, idoso (medicamentos potencialmente inapropriados), polifarmácia, alergias e interações antes de concluir.",
  "6. UNIDADES: escreva 'unidades' (nunca 'U'), 'microgramas' ou 'mcg' (nunca 'ug'). Nunca omita a unidade.",
  "7. APRESENTAÇÕES: só cite número de ampolas/mL se a apresentação foi informada na lista/protocolo recebido; caso contrário use 'apresentação habitual (conferir rótulo)'.",
  "8. RODAPÉ OBRIGATÓRIO: 'Sugestão gerada por IA. Conferir dose, diluição e diretriz; a responsabilidade da prescrição é do prescritor.'"
].join("\n");

var IA_DIRETRIZES_EMERGENCIA = [
  "DIRETRIZES DE REFERÊNCIA (VERSÕES)",
  "- PCR/ACLS: American Heart Association 2025 (ILCOR CoSTR vigente). Não cite 'ACLS 2024'.",
  "- Sepse (adulto): Surviving Sepsis Campaign 2021 e atualizações subsequentes; a triagem NÃO deve usar qSOFA isolado. Hora 1: lactato, hemoculturas antes do antimicrobiano, antimicrobiano de amplo espectro, cristaloide 30 mL/kg se hipotensão ou lactato elevado, vasopressor (noradrenalina de primeira linha) para PAM alvo >= 65 mmHg.",
  "- Prioridade a diretrizes brasileiras (SBC, AMIB, ILAS, SBPT, SBN, Ministério da Saúde/Conitec). Cite sociedade e ano apenas quando tiver certeza; se não tiver, escreva 'conferir versão vigente'.",
  "- Se houver PROTOCOLO OFICIAL DE REFERÊNCIA no contexto, use-o como base e sinalize qualquer divergência sua em relação a ele.",
  "- Mencione divergência internacional somente se mudar a conduta prática."
].join("\n");

// ==============================================================================
// UTILITÁRIOS DE INFRAESTRUTURA
// ==============================================================================

function _iaCfg(chave, padrao) {
  try {
    var v = ConfigService.get(chave, padrao);
    return (v === undefined || v === null || v === "") ? padrao : v;
  } catch (e) {
    return "📚 MODELO DE REFERÊNCIA — confirmar os achados antes de registrar.\n\n" + padrao;
  }
}

function _iaCfgBool(chave, padrao) {
  var v = String(_iaCfg(chave, padrao ? "true" : "false")).toLowerCase();
  return v === "true" || v === "1" || v === "sim";
}

function _iaLista(chave, padrao) {
  var bruto = _iaCfg(chave, "");
  var lista = [];
  if (Array.isArray(bruto)) {
    lista = bruto;
  } else if (typeof bruto === "string" && bruto.trim()) {
    lista = bruto.split(",");
  }
  lista = lista.map(function (x) { return String(x).trim(); }).filter(function (x) { return x; });
  // Ignora modelos obsoletos ou descontinuados pela API do Gemini
  var obsoletos = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
  lista = lista.filter(function (m) { return obsoletos.indexOf(m) === -1; });
  return lista.length ? lista : padrao.slice();
}

function _iaNovoCtx() {
  return {
    id: Utilities.getUuid().substring(0, 8),
    inicio: new Date().getTime(),
    limite: Number(_iaCfg("IA_ORCAMENTO_MS", IA_PADROES.ORCAMENTO_MS)) || IA_PADROES.ORCAMENTO_MS
  };
}

function _iaOrcamentoEsgotado(ctx) {
  return (new Date().getTime() - ctx.inicio) > ctx.limite;
}

function _iaLog(ctx, msg) {
  Logger.log("[IA " + ctx.id + "] " + msg);
}

function _iaBloqueado(chave) {
  try { return !!CacheService.getScriptCache().get("iabl_" + chave); } catch (e) { return false; }
}

function _iaBloquear(chave, segundos) {
  try { CacheService.getScriptCache().put("iabl_" + chave, "1", Math.min(segundos, 21600)); } catch (e) { /* sem cache */ }
}

function _iaEsperar(res, maxMs, padraoMs) {
  var ms = padraoMs || 0;
  try {
    var h = (typeof res.getAllHeaders === "function") ? res.getAllHeaders() : res.getHeaders();
    for (var k in h) {
      if (String(k).toLowerCase() === "retry-after") {
        var s = parseFloat(h[k]);
        if (!isNaN(s)) ms = s * 1000;
      }
    }
  } catch (e) { /* ignora */ }
  ms = Math.min(ms, maxMs);
  if (ms > 0) Utilities.sleep(ms);
}

function _iaTokensEfetivos(tokens) {
  var base = Number(tokens) || 2000;
  return Math.min(base + IA_PADROES.FOLGA_TOKENS, 8192);
}

function _iaTextoDeConteudo(conteudo) {
  if (typeof conteudo === "string") return conteudo;
  if (Array.isArray(conteudo)) {
    return conteudo.map(function (p) { return (p && p.text) ? p.text : (typeof p === "string" ? p : ""); }).join("");
  }
  return "";
}

// ==============================================================================
// SANITIZAÇÃO DE SAÍDA (LaTeX, raciocínio vazado, Markdown do Telegram)
// ==============================================================================

function _iaRemoverLatex(texto) {
  if (texto === null || texto === undefined) return texto;
  var t = String(texto);
  t = t.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");

  var mapa = {
    times: "x", cdot: ".", approx: "~", geq: ">=", leq: "<=", neq: "!=", pm: "+/-",
    rightarrow: "->", leftarrow: "<-", uparrow: "aumenta", downarrow: "diminui",
    mu: "micro", Delta: "Delta", delta: "delta", alpha: "alfa", beta: "beta", degree: "graus"
  };

  function limparMatematica(s) {
    var r = s;
    for (var i = 0; i < 3; i++) {
      r = r.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)");
    }
    r = r.replace(/\\(?:text|mathrm|mathbf|textbf|mathit|operatorname)\s*\{([^{}]*)\}/g, "$1");
    r = r.replace(/\\sqrt\s*\{([^{}]*)\}/g, "raiz($1)");
    r = r.replace(/\\([A-Za-z]+)/g, function (m, nome) { return mapa.hasOwnProperty(nome) ? mapa[nome] : ""; });
    r = r.replace(/\\[,;:!]/g, " ").replace(/\\([%&#])/g, "$1");
    r = r.replace(/\^\{([^{}]*)\}/g, "^$1").replace(/_\{([^{}]*)\}/g, "$1").replace(/[{}]/g, "");
    return r;
  }

  t = t.replace(/\$\$([\s\S]*?)\$\$/g, function (m, i) { return limparMatematica(i); });
  t = t.replace(/\\\[([\s\S]*?)\\\]/g, function (m, i) { return limparMatematica(i); });
  t = t.replace(/\\\(([\s\S]*?)\\\)/g, function (m, i) { return limparMatematica(i); });
  t = t.replace(/\$([^$\n]{1,160}?)\$/g, function (m, i) {
    return /[\\^_{}]/.test(i) ? limparMatematica(i) : m;
  });
  t = t.replace(/\\(?:text|mathrm|mathbf|textbf)\s*\{([^{}]*)\}/g, "$1");
  t = t.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)");
  return t;
}

function _iaFinalizarTexto(texto) {
  if (!texto) return texto;
  return transformarPreservandoUrls(String(texto), function(t) {
  t = t.replace(/\r\n/g, "\n");
  t = t.replace(/^\s{0,3}#{1,6}\s*(.+)$/gm, "*$1*");
  t = t.replace(/\*\*([^*\n]+)\*\*/g, "*$1*");
  t = t.replace(/^(\s*)\*\s+/gm, "$1- ");
  ["*", "_", "`"].forEach(function (ch) {
    var partes = t.split(ch).length - 1;
    if (partes % 2 === 1) t = t.split(ch).join("");
  });
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  if (t.indexOf("RASCUNHO") === -1 && t.indexOf("Rascunho") === -1 && t.indexOf("rascunho") === -1) {
    t = "⚠️ *Rascunho para conferência médica*\n\n" + t;
  }
  return t;
  });
}

function _iaCortarNaFrase(texto) {
  var t = String(texto || "");
  var corte = Math.max(t.lastIndexOf("\n"), t.lastIndexOf(". "), t.lastIndexOf("; "), t.lastIndexOf("? "));
  if (corte > t.length * 0.5) return t.substring(0, corte + 1).trim();
  return t.trim();
}

function _iaTextoFalado(texto) {
  if (!texto) return texto;
  return String(texto)
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_#`>~\[\]]/g, "")
    .replace(/^\s*[-\u2022]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function _iaExtrairJSON(texto) {
  if (!texto) return null;
  var limpo = String(texto).replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```json/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(limpo); } catch (e) { /* tenta recorte */ }
  var i = limpo.indexOf("{");
  var j = limpo.lastIndexOf("}");
  if (i >= 0 && j > i) {
    try { return JSON.parse(limpo.substring(i, j + 1)); } catch (e2) { /* falhou */ }
  }
  return null;
}

// ==============================================================================
// PROVEDORES (retornam {texto, truncado} ou null)
// ==============================================================================

function _iaProvOpenAICompat(cfg, sistema, prompt, tokens, ctx) {
  if (_iaBloqueado(cfg.rotulo + "_AUTH")) return null;
  var apiKey = ConfigService.get(cfg.chaveApi);
  if (!apiKey) return null;
  var modelos = cfg.modelos;

  for (var i = 0; i < modelos.length; i++) {
    if (_iaOrcamentoEsgotado(ctx)) { _iaLog(ctx, cfg.rotulo + ": orçamento de tempo esgotado"); return null; }
    var modelo = modelos[i];
    if (_iaBloqueado(cfg.rotulo + "_" + modelo)) continue;

    var payload = {
      model: modelo,
      messages: [{ role: "system", content: sistema }, { role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: _iaTokensEfetivos(tokens)
    };
    if (cfg.raciocinioEfetivo && /gpt-oss/i.test(modelo)) {
      payload.reasoning_effort = tokens <= 600 ? "low" : "medium";
    }
    var headers = { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" };
    for (var h in (cfg.headersExtra || {})) headers[h] = cfg.headersExtra[h];

    try {
      var res = UrlFetchApp.fetch(cfg.url, {
        method: "post", headers: headers, payload: JSON.stringify(payload), muteHttpExceptions: true
      });
      var code = res.getResponseCode();
      if (code === 200) {
        var json = JSON.parse(res.getContentText());
        var escolha = json.choices && json.choices[0];
        var texto = escolha && escolha.message ? _iaTextoDeConteudo(escolha.message.content) : "";
        var truncado = !!(escolha && escolha.finish_reason === "length");
        if (texto && texto.trim()) return { texto: texto, truncado: truncado, modelo: modelo };
        if (truncado) return { texto: "", truncado: true, modelo: modelo };
        _iaLog(ctx, cfg.rotulo + " " + modelo + ": resposta vazia");
      } else if (code === 404) {
        _iaBloquear(cfg.rotulo + "_" + modelo, 3600);
        _iaLog(ctx, cfg.rotulo + " " + modelo + ": 404 (bloqueado por 1h)");
      } else if (code === 429) {
        _iaLog(ctx, cfg.rotulo + " " + modelo + ": 429");
        _iaEsperar(res, 2000, 300);
      } else if (code === 401 || code === 403) {
        _iaBloquear(cfg.rotulo + "_AUTH", 3600);
        _iaLog(ctx, cfg.rotulo + ": credencial recusada (" + code + "), bloqueado por 1h");
        return null;
      } else {
        _iaLog(ctx, cfg.rotulo + " " + modelo + ": HTTP " + code);
      }
    } catch (e) {
      _iaLog(ctx, cfg.rotulo + " " + modelo + " exceção: " + e.message);
    }
  }
  return null;
}

function _iaProvGroq(sistema, prompt, tokens, ctx) {
  return _iaProvOpenAICompat({
    rotulo: "GROQ", chaveApi: "GROQ_API_KEY", url: "https://api.groq.com/openai/v1/chat/completions",
    modelos: _iaLista("IA_MODELOS_GROQ", IA_PADROES.GROQ), raciocinioEfetivo: true
  }, sistema, prompt, tokens, ctx);
}

function _iaProvOpenRouter(sistema, prompt, tokens, ctx) {
  return _iaProvOpenAICompat({
    rotulo: "OPENROUTER", chaveApi: "OPENROUTER_API_KEY", url: "https://openrouter.ai/api/v1/chat/completions",
    modelos: _iaLista("IA_MODELOS_OPENROUTER", IA_PADROES.OPENROUTER),
    headersExtra: { "HTTP-Referer": "https://t.me/wagmoraes", "X-Title": "Clinical Assistant GAS" }
  }, sistema, prompt, tokens, ctx);
}

function _iaProvZai(sistema, prompt, tokens, ctx) {
  return _iaProvOpenAICompat({
    rotulo: "ZAI", chaveApi: "ZAI_API_KEY", url: "https://api.z.ai/api/paas/v4/chat/completions",
    modelos: _iaLista("IA_MODELOS_ZAI", IA_PADROES.ZAI)
  }, sistema, prompt, tokens, ctx);
}

var IA_DIRETIVA_SEM_LATEX = "\n\nCRÍTICO: NUNCA use formatação matemática LaTeX (como $...$ ou $$...$$). Escreva números, dosagens e unidades (ex: 200 mg, 90 mmHg) como texto limpo e simples.";

function _iaHashChave(k) {
  if (!k) return "none";
  var s = String(k).trim();
  if (s.length <= 16) return s;
  return s.slice(0, 6) + "_" + s.slice(-6);
}

function _iaProvGemini(sistema, prompt, tokens, ctx, opcoes) {
  opcoes = opcoes || {};
  var chaves = ConfigService.getArray("GEMINI_API_KEYS");
  chaves = (chaves || []).map(function (c) { return String(c).trim(); }).filter(function (c) { return c; });
  if (chaves.length === 0) {
    var kSingular = ConfigService.get("GEMINI_API_KEY");
    if (kSingular) chaves = [String(kSingular).trim()];
  }
  if (chaves.length === 0) return null;

  var modelos = opcoes.modelos;
  if (!modelos) {
    if (opcoes.clinico) {
      // Salvaguarda clínica: restrito a modelos previamente avaliados e homologados para medicina
      modelos = _iaLista("IA_MODELOS_CLINICOS_GEMINI", IA_PADROES.GEMINI);
    } else if (opcoes.semThinking || opcoes.extrativo) {
      // Modelos ultra-rápidos para roteamento e extração sintática de baixa latência
      modelos = _iaLista("IA_MODELOS_RAPIDOS_GEMINI", ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.5-flash"]);
    } else {
      modelos = _iaLista("IA_MODELOS_GEMINI", IA_PADROES.GEMINI);
    }
  }
  var instrucao = (opcoes.instrucaoSistema || sistema) + IA_DIRETIVA_SEM_LATEX;
  var partesUsuario = opcoes.partesUsuario || [{ text: prompt }];

  var inicio = 0;
  try {
    inicio = parseInt(CacheService.getScriptCache().get("ia_gem_idx") || "0", 10) || 0;
  } catch (e0) { inicio = 0; }

  for (var m = 0; m < modelos.length; m++) {
    var modelo = modelos[m];
    if (_iaBloqueado("GEMINI_" + modelo)) continue;
    var todas429 = true;
    var tentou5xx = false;

    for (var j = 0; j < chaves.length; j++) {
      if (_iaOrcamentoEsgotado(ctx)) { _iaLog(ctx, "GEMINI: orçamento de tempo esgotado"); return null; }
      var idx = (inicio + j) % chaves.length;
      var chaveAtual = chaves[idx];
      var hashChave = _iaHashChave(chaveAtual);

      // Pula chave em cooldown individual para este modelo
      if (_iaBloqueado("GEMINI_K_" + hashChave + "_" + modelo)) {
        continue;
      }

      // Pula chave se o consumer (projeto GCP) associado estiver em cooldown para este modelo
      var consumerConhecido = "";
      try { consumerConhecido = CacheService.getScriptCache().get("iagcons_" + hashChave) || ""; } catch (ec0) {}
      if (consumerConhecido && _iaBloqueado("GEMINI_CONS_" + consumerConhecido + "_" + modelo)) {
        _iaLog(ctx, "GEMINI " + modelo + ": consumer " + consumerConhecido + " em cooldown, pulando chave #" + idx);
        continue;
      }

      var payload = {
        systemInstruction: { parts: [{ text: instrucao }] },
        contents: [{ role: "user", parts: partesUsuario }],
        generationConfig: { temperature: 0.2, maxOutputTokens: _iaTokensEfetivos(tokens) }
      };
      if (modelo.indexOf("2.5") !== -1 || modelo.indexOf("3.") !== -1) {
        if (opcoes.thinkingBudget !== undefined && opcoes.thinkingBudget !== null) {
          payload.generationConfig.thinkingConfig = { thinkingBudget: Number(opcoes.thinkingBudget) };
        } else if (opcoes.semThinking || opcoes.extrativo) {
          payload.generationConfig.thinkingConfig = { thinkingBudget: 0 };
        } else if (opcoes.clinico) {
          var tBudget = Number(_iaCfg("IA_THINKING_BUDGET_CLINICO", 1024));
          payload.generationConfig.thinkingConfig = { thinkingBudget: tBudget };
        }
      }
      if (opcoes.grounding) payload.tools = [{ googleSearch: {} }];

      try {
        var res = UrlFetchApp.fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" + modelo + ":generateContent",
          {
            method: "post", contentType: "application/json",
            headers: { "x-goog-api-key": chaves[idx] },
            payload: JSON.stringify(payload), muteHttpExceptions: true
          }
        );
        var code = res.getResponseCode();

        if (code === 200) {
          todas429 = false;
          var json = JSON.parse(res.getContentText());
          var cand = json.candidates && json.candidates[0];
          var partes = (cand && cand.content && cand.content.parts) ? cand.content.parts : [];
          var texto = partes.filter(function (p) { return p && p.text && !p.thought; })
                            .map(function (p) { return p.text; }).join("");
          var truncado = !!(cand && cand.finishReason === "MAX_TOKENS");
          if (texto.trim()) {
            try { CacheService.getScriptCache().put("ia_gem_idx", String((idx + 1) % chaves.length), 21600); } catch (e1) { /* ok */ }
            return { texto: texto, truncado: truncado, modelo: modelo, groundingMetadata: cand.groundingMetadata || null };
          }
          if (truncado) return { texto: "", truncado: true, modelo: modelo };
          _iaLog(ctx, "GEMINI " + modelo + ": sem texto (finishReason=" + (cand ? cand.finishReason : "n/d") + ")");
          break;
        } else if (code === 429) {
          var corpo429 = res.getContentText ? res.getContentText() : "";
          var json429 = {};
          try { json429 = JSON.parse(corpo429 || "{}"); } catch (e429) {}
          var details429 = (json429.error && json429.error.details) || [];
          var consumer429 = "";
          var retrySec429 = 60;

          for (var d = 0; d < details429.length; d++) {
            var itemD = details429[d];
            if (itemD.metadata && itemD.metadata.consumer) {
              consumer429 = String(itemD.metadata.consumer).trim();
            }
            if (itemD.retryDelay) {
              var parseDelay = parseInt(String(itemD.retryDelay).replace("s", ""), 10);
              if (!isNaN(parseDelay) && parseDelay > 0) retrySec429 = parseDelay;
            }
          }
          if (res.getHeaders) {
            var hdrs = res.getHeaders();
            var hdrRetry = hdrs && (hdrs["Retry-After"] || hdrs["retry-after"]);
            if (hdrRetry) {
              var prHdr = parseInt(hdrRetry, 10);
              if (!isNaN(prHdr) && prHdr > 0) retrySec429 = Math.max(retrySec429, prHdr);
            }
          }

          if (consumer429) {
            try { CacheService.getScriptCache().put("iagcons_" + hashChave, consumer429, 21600); } catch (ec1) {}
            _iaBloquear("GEMINI_CONS_" + consumer429 + "_" + modelo, retrySec429);
            _iaLog(ctx, "GEMINI " + modelo + ": 429 no consumer " + consumer429 + " (chave #" + idx + "). Cooldown: " + retrySec429 + "s");
          } else {
            _iaBloquear("GEMINI_K_" + hashChave + "_" + modelo, retrySec429);
            _iaLog(ctx, "GEMINI " + modelo + ": 429 na chave #" + idx + ". Cooldown: " + retrySec429 + "s");
          }
          continue;
        } else if (code === 500 || code === 502 || code === 503 || code === 504) {
          todas429 = false;
          _iaBloquear("GEMINI_K_" + hashChave + "_" + modelo, 30);
          _iaLog(ctx, "GEMINI " + modelo + ": " + code + " na chave #" + idx + ", tentando próxima chave");
          continue;
        } else if (code === 404) {
          todas429 = false;
          _iaBloquear("GEMINI_" + modelo, 3600);
          _iaLog(ctx, "GEMINI " + modelo + ": 404 (bloqueado por 1h)");
          break;
        } else if (code === 401 || code === 403) {
          _iaLog(ctx, "GEMINI: chave #" + idx + " recusada (" + code + ")");
          continue;
        } else {
          todas429 = false;
          _iaLog(ctx, "GEMINI " + modelo + ": HTTP " + code);
          break;
        }
      } catch (e) {
        todas429 = false;
        _iaLog(ctx, "GEMINI " + modelo + " exceção: " + e.message);
        continue;
      }
    }
    if (todas429 && chaves.length > 0) _iaBloquear("GEMINI_" + modelo, 60);
  }
  return null;
}

function _iaResolverTruncamento(chamar, tokens, r, ctx, json) {
  if (!r || !r.truncado) return r;
  if (!_iaOrcamentoEsgotado(ctx)) {
    var maisTokens = Math.min(Math.ceil((Number(tokens) || 2000) * 1.6), IA_PADROES.TOKENS_TETO);
    _iaLog(ctx, "Truncamento detectado, repetindo com " + maisTokens + " tokens");
    var r2 = chamar(maisTokens);
    if (r2 && r2.texto) r = r2;
  }
  if (r.truncado && r.texto && !json) {
    r.texto = _iaCortarNaFrase(r.texto) +
      "\n\n\u26A0\uFE0F Resposta interrompida por limite de tamanho. Não use como conduta completa; peça a continuação.";
  }
  return r;
}

function _iaOrdemProvedores() {
  var padrao = String(_iaCfg("PROVEDOR_TEXTO_PADRAO", "GEMINI")).toUpperCase();
  var canonica = ["GEMINI", "GROQ", "OPENROUTER", "ZAI"];
  var ordem = canonica.indexOf(padrao) >= 0 ? [padrao] : [];
  canonica.forEach(function (p) { if (ordem.indexOf(p) < 0) ordem.push(p); });
  return ordem;
}

function _iaChamarProvedor(nome, sistema, prompt, tokens, ctx, opcoes) {
  if (nome === "GROQ") return _iaProvGroq(sistema, prompt, tokens, ctx);
  if (nome === "OPENROUTER") return _iaProvOpenRouter(sistema, prompt, tokens, ctx);
  if (nome === "ZAI") return _iaProvZai(sistema, prompt, tokens, ctx);
  if (nome === "GEMINI") return _iaProvGemini(sistema, prompt, tokens, ctx, opcoes);
  return null;
}

function _iaExecutar(sistema, promptUsuario, maxTokens, opcoes) {
  opcoes = opcoes || {};
  var tokens = Number(maxTokens) || 2000;
  var ctx = _iaNovoCtx();
  var ordem = _iaOrdemProvedores();

  for (var i = 0; i < ordem.length; i++) {
    if (_iaOrcamentoEsgotado(ctx)) { _iaLog(ctx, "Orçamento esgotado antes de " + ordem[i]); break; }
    var nome = ordem[i];
    var chamar = function (t) { return _iaChamarProvedor(nome, sistema, promptUsuario, t, ctx, opcoes); };
    var r;
    try {
      r = chamar(tokens);
      r = _iaResolverTruncamento(chamar, tokens, r, ctx, opcoes.json);
    } catch (e) {
      _iaLog(ctx, nome + " falhou: " + e.message);
      continue;
    }
    if (r && r.truncado && opcoes.exigirRespostaCompleta) {
      _iaLog(ctx, "Resposta incompleta; revisão não concluída");
      return null;
    }
    if (r && r.texto && String(r.texto).trim()) {
      _iaLog(ctx, "OK via " + nome + " (" + r.modelo + ") em " + (new Date().getTime() - ctx.inicio) + " ms");
      return opcoes.json ? r.texto : _iaRemoverLatex(r.texto);
    }
  }
  _iaLog(ctx, "TODOS OS PROVEDORES FALHARAM");
  return null;
}

// Usa apenas metadados devolvidos na MESMA resposta; nenhuma consulta adicional.
function _iaAcrescentarFontesBusca(texto, metadata) {
  var chunks = metadata && Array.isArray(metadata.groundingChunks) ? metadata.groundingChunks : [];
  var fontes = [], indices = {}, porUrl = {};
  chunks.forEach(function(chunk, i) {
    var web = chunk && chunk.web;
    if (!web || typeof web.uri !== "string" || !/^https:\/\/[^\s<>"\\]+$/.test(web.uri)) return;
    var id = porUrl[web.uri];
    if (!id) {
      id = fontes.length + 1;
      porUrl[web.uri] = id;
      fontes.push({id: id, url: web.uri, titulo: String(web.title || "Fonte").replace(/[\r\n*_`\[\]]/g, " ")});
    }
    indices[i] = id;
  });
  if (!fontes.length) return texto + "\n\n⚠️ A busca não retornou referências rastreáveis nesta resposta. Confira as fontes e a versão vigente.";
  var insercoes = {};
  var supports = metadata && Array.isArray(metadata.groundingSupports) ? metadata.groundingSupports : [];
  supports.forEach(function(support) {
    var trecho = support && support.segment && support.segment.text;
    if (typeof trecho !== "string" || !trecho.trim() || !Array.isArray(support.groundingChunkIndices)) return;
    var inicio = texto.indexOf(trecho);
    // Não adivinha offsets UTF-8 nem associa um trecho repetido à ocorrência errada.
    if (inicio < 0 || inicio !== texto.lastIndexOf(trecho)) return;
    var fim = inicio + trecho.length, ids = insercoes[fim] || [];
    support.groundingChunkIndices.forEach(function(i) {
      if (Number.isInteger(i) && indices[i] && ids.indexOf(indices[i]) < 0) ids.push(indices[i]);
    });
    if (ids.length) insercoes[fim] = ids;
  });
  Object.keys(insercoes).map(Number).sort(function(a, b) { return b - a; }).forEach(function(fim) {
    texto = texto.slice(0, fim) + " [" + insercoes[fim].sort(function(a,b) {return a-b;}).join(", ") + "]" + texto.slice(fim);
  });
  return texto + "\n\n*Fontes retornadas pela busca*\n" + fontes.map(function(f) {
    return "[" + f.id + "] " + f.titulo + "\n" + f.url;
  }).join("\n") + "\nAs associações de trechos às fontes são fornecidas pelo mecanismo de busca; não equivalem a validação clínica.";
}

function _iaPublico(chamarInterno, tokensPadrao, maxTokens, opcoes) {
  var tokens = Number(maxTokens) || tokensPadrao;
  var ctx = _iaNovoCtx();
  var chamar = function (t) { return chamarInterno(t, ctx); };
  var r = _iaResolverTruncamento(chamar, tokens, chamar(tokens), ctx, false);
  if (!r || !r.texto) return null;
  var texto = (opcoes && opcoes.grounding) ? _iaAcrescentarFontesBusca(r.texto, r.groundingMetadata) : r.texto;
  return _iaRemoverLatex(texto);
}

// ==============================================================================
// FUNÇÕES EXPORTADAS - MOTORES
// ==============================================================================

function executarRaciocinioClinico(sistema, promptUsuario, maxTokens) {
  return _iaExecutar(sistema, promptUsuario, maxTokens, { clinico: true });
}

function chamarGroqAPI(sistema, promptUsuario, maxTokens) {
  return _iaPublico(function (t, ctx) { return _iaProvGroq(sistema, promptUsuario, t, ctx); }, 2000, maxTokens);
}

function chamarOpenRouterAPI(sistema, promptUsuario, maxTokens) {
  return _iaPublico(function (t, ctx) { return _iaProvOpenRouter(sistema, promptUsuario, t, ctx); }, 2000, maxTokens);
}

function chamarZaiAPI(sistema, promptUsuario, maxTokens) {
  return _iaPublico(function (t, ctx) { return _iaProvZai(sistema, promptUsuario, t, ctx); }, 2000, maxTokens);
}

function chamarGeminiPool(sistema, promptUsuario, maxTokens) {
  return _iaPublico(function (t, ctx) { return _iaProvGemini(sistema, promptUsuario, t, ctx); }, 2000, maxTokens);
}

/**
 * Gemini com Google Search Grounding. Embasamento em diretrizes oficiais.
 */
function chamarGeminiPoolComGrounding(sistema, promptUsuario, maxTokens) {
  var instrucao = sistema + "\n\nDIRETRIZ DE EMBASAMENTO CIENTÍFICO:\n" +
    "1. PRIORIDADE: diretrizes brasileiras oficiais (SBC, SBPT, SBD, ILAS, AMIB, CFM, AMB, Conitec/PCDT Ministério da Saúde).\n" +
    "2. DIVERGÊNCIAS: aponte discrepâncias com diretrizes internacionais (AHA/ACC, ESC, SSC, GOLD, GINA, IDSA) apenas se mudarem a conduta prática.\n" +
    "3. CITAÇÃO: indique diretriz, sociedade e ano somente quando verificados na busca; caso contrário diga 'conferir versão vigente'.\n" +
    "4. NUNCA use LaTeX ($). Retorne Markdown simples do Telegram.";
  var modelos = _iaLista("IA_MODELOS_GEMINI_GROUNDING", IA_PADROES.GEMINI_GROUNDING);
  return _iaPublico(function (t, ctx) {
    return _iaProvGemini(sistema, promptUsuario, t, ctx, { grounding: true, modelos: modelos, instrucaoSistema: instrucao });
  }, 2500, maxTokens, { grounding: true });
}

function chamarGeminiPoolMultimodal(base64Data, mimeType, sistema, promptUsuario, opcoes) {
  opcoes = opcoes || {};
  var msg = promptUsuario ? promptUsuario : "Por favor, analise a mídia anexada em detalhes.";
  var mimeNormalizado = String(mimeType || "").toLowerCase().trim();
  if (mimeNormalizado === "audio/oga" || mimeNormalizado === "audio/opus" || mimeNormalizado.indexOf("audio/ogg") !== -1) {
    mimeNormalizado = "audio/ogg";
  } else if (mimeNormalizado.indexOf("image/jpeg") !== -1 || mimeNormalizado.indexOf("image/jpg") !== -1) {
    mimeNormalizado = "image/jpeg";
  } else if (mimeNormalizado.indexOf("image/png") !== -1) {
    mimeNormalizado = "image/png";
  } else if (mimeNormalizado.indexOf("image/webp") !== -1) {
    mimeNormalizado = "image/webp";
  } else if (!mimeNormalizado) {
    mimeNormalizado = "image/jpeg";
  }
  var partes = [{ inlineData: { mimeType: mimeNormalizado, data: base64Data } }, { text: msg }];
  var res = _iaPublico(function (t, ctx) {
    var opts = Object.assign({ clinico: true }, opcoes, { partesUsuario: partes });
    return _iaProvGemini(sistema, msg, t, ctx, opts);
  }, 2500, 2500);

  if (!res) {
    // Fallback resiliente multimodal: se o pool clínico prioritário sofrer saturação/429,
    // aciona imediatamente os modelos leves com cota separada e alta disponibilidade
    var modelosLeves = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest"];
    res = _iaPublico(function (t, ctx) {
      var optsFallback = Object.assign({ clinico: true, modelos: modelosLeves }, opcoes, { partesUsuario: partes });
      return _iaProvGemini(sistema, msg, t, ctx, optsFallback);
    }, 2500, 2500);
  }
  return res;
}

/**
 * ==============================================================================
 * ÁUDIO CLÍNICO EM TEMPO ÚNICO MULTIMODAL (FMRP-USP / ZERO LATÊNCIA DE TRANSCRIÇÃO)
 * ==============================================================================
 * Processa o áudio em uma única inferência multimodal:
 * Extrai a transcrição literal fiel E estrutura a Fase 1 do SOAP se for relato clínico.
 */
function processarAudioClinicoMultimodal(base64Data, mimeType, opcoes) {
  opcoes = opcoes || {};
  var sistema = [
    IA_PERSONA,
    "MODO: RECONHECIMENTO E ESTRUTURAÇÃO CLÍNICA DE ÁUDIO EM TEMPO ÚNICO (FMRP-USP).",
    "Você recebeu um áudio gravado diretamente pelo médico Wagner nos corredores do hospital ou em trânsito.",
    "Realize as tarefas com máximo rigor semiológico:",
    "1. TRANSCRIÇÃO: Transcreva fielmente as palavras ditadas em português do Brasil com pontuação culta e correta.",
    "2. SE FOR RELATO CLÍNICO, CLASSIFIQUE E ESTRUTURE CONFORME A NATUREZA DO RELATO:",
    "   A. EVOLUÇÃO DE LEITO / ENFERMARIA (se citar número de leito ou quarto, ex: 'Leito 4', 'Quarto 12', 'leito 7: paciente fez febre...'):",
    "      - tipo_relato: 'leito'",
    "      - numero_leito: identificador alfanumérico do leito (ex: '4', '12B', 'UTI-1')",
    "      - status_sugerido: 'estavel' (afebril, eupneico, conduta mantida ou programando alta), 'vigilancia' (febre, instabilidade leve, desmame de O2/drogas, ajuste de antibiótico, exames alterados) ou 'instavel' (choque, rebaixamento, dessaturação aguda, IOT/DVA)",
    "      - evolucao_texto: Prosa médica formal culta para prontuário (sem gírias, sem transcrição crua). NUNCA invente sinais vitais não ditados.",
    "      - pendencias: lista de pendências/exames a checar citados no áudio. Se não houver, retorne array vazio.",
    "   B. ATENDIMENTO AMBULATORIAL / CONSULTA NOVA (SOAP Clássico, sem leito hospitalar):",
    "      - tipo_relato: 'soap'",
    "      - Subjetivo: QP com duração e HDA cronológica formal (sem transcrição literal, em prosa médica culta). Antecedentes, comorbidades, medicações e alergias.",
    "      - Objetivo: Exame físico inteligente no modelo meio-termo com os 5 sistemas clássicos (Geral, ACV, AR, Abdome, Extremidades). NUNCA invente sinais vitais não ditados.",
    "      - Perguntas de Anamnese com Racional Didático: 2 a 4 perguntas investigativas diretas, CADA UMA COM SUA JUSTIFICATIVA CLÍNICA OU HIPÓTESE A DESCARTAR ENTRE PARÊNTESES.",
    "      - Exame Dirigido: Sinais vitais essenciais e manobras físicas direcionadas à queixa que não foram informadas.",
    "      - REGRA ABSOLUTA DE SEGURANÇA: NÃO inclua hipóteses diagnósticas (Avaliação) e NÃO inclua prescrição ou condutas (Plano) nesta fase.",
    "3. SE NÃO FOR RELATO CLÍNICO (ex: agendamento de calendário, hábito pessoal, tarefa do Notion ou conversa geral): defina 'eh_clinico' como false.",
    "",
    "Contrato JSON estrito:",
    '{"transcricao":"transcrição literal fiel","eh_clinico":true,"tipo_relato":"leito|soap|outro","numero_leito":"4|null","status_sugerido":"estavel|vigilancia|instavel|null","evolucao_texto":"texto formal para prontuário|null","pendencias":[],"subjetivo":"Anamnese organizada (QP, HDA, antecedentes)|null","objetivo":"Exame físico com os 5 sistemas clássicos|null","perguntas_anamnese":[],"exame_dirigido":[]}'
  ].join("\n");

  var promptInstrucao = "Por favor, ouça o áudio com atenção aos termos médicos e retorne o JSON estruturado.";
  var raw = chamarGeminiPoolMultimodal(base64Data, mimeType, sistema, promptInstrucao, opcoes);
  if (!raw) return null;

  var obj = _iaExtrairJSON(raw);
  if (!obj || typeof obj !== "object") {
    return {
      sucesso: true,
      transcricao: String(raw).trim(),
      eh_clinico: false
    };
  }

  var transcricao = String(obj.transcricao || "").trim();
  var ehClinico = !!(obj.eh_clinico || (obj.subjetivo && obj.objetivo) || (obj.numero_leito && (obj.evolucao_texto || obj.subjetivo)));

  // 1. Rota de Evolução de Leito (Ditado de Corredor em Tempo Único)
  if (ehClinico && (obj.tipo_relato === "leito" || obj.numero_leito) && (obj.evolucao_texto || obj.subjetivo)) {
    var txtEv = String(obj.evolucao_texto || obj.subjetivo).trim();
    var numL = String(obj.numero_leito || "").replace(/^(?:leito|quarto)\s*/i, "").trim();
    if (numL) {
      return {
        sucesso: true,
        transcricao: transcricao || txtEv,
        eh_clinico: true,
        tipo_relato: "leito",
        numero_leito: numL,
        status_sugerido: obj.status_sugerido || "estavel",
        evolucao_texto: txtEv,
        pendencias: Array.isArray(obj.pendencias) ? obj.pendencias : [],
        dadosObj: obj
      };
    }
  }

  // 2. Rota Clássica SOAP Ambulatorial
  if (ehClinico && obj.subjetivo && obj.objetivo) {
    var oSanitizado = (typeof sanitizarObjetivoComRelato === "function")
      ? sanitizarObjetivoComRelato(obj.objetivo, transcricao || obj.subjetivo)
      : String(obj.objetivo).trim();
    var perguntas = obj.perguntas_anamnese || obj.perguntas || [];
    var exameDirigido = obj.exame_dirigido || [];

    var blocosRasc = [
      "🩺 *SÍNTESE SOAP · ATENDIMENTO CLÍNICO*",
      "👤 *S - Subjetivo (Anamnese Estruturada)*\n" + String(obj.subjetivo).trim(),
      "🔍 *O - Objetivo (Exame Físico)*\n" + (oSanitizado || "Exame físico em estruturação; conferir sinais vitais e achados."),
      "❓ *Perguntas para Completar a Anamnese (Investigação Ativa do Subjetivo)*\n" + formatarListaTopicos(perguntas, "Informar início detalhado, fatores de melhora/piora, antecedentes e alergias."),
      "🎯 *Cobrança Ativa do Exame Físico Dirigido*\n" + formatarListaTopicos(exameDirigido, "Aferir sinais vitais completos e exame direcionado ao foco da queixa.") +
      "\n\n_💡 Envie dados adicionais para atualizar ou clique em [📋 Gerar Avaliação & Plano] quando desejar fechar a conduta._"
    ];

    return {
      sucesso: true,
      transcricao: transcricao || String(obj.subjetivo).trim(),
      eh_clinico: true,
      tipo_relato: "soap",
      soapTexto: _iaFinalizarTexto(blocosRasc.join("\n\n")),
      dadosObj: obj
    };
  }

  return {
    sucesso: true,
    transcricao: transcricao || String(raw).trim(),
    eh_clinico: false,
    dadosObj: obj
  };
}

/**
 * ==============================================================================
 * ANÁLISE DE IMAGEM MÉDICA MULTIMODAL (FMRP-USP / SALA VERMELHA & AMBULATÓRIO)
 * ==============================================================================
 * Leitor metódico com raciocínio semiológico em profundidade:
 * - ECG (6 passos: Ritmo, FC, Eixo, Intervalos PR/QRS/QTc, Sobrecargas, ST-T por derivação contígua)
 * - Radiografia (Técnica/Incidência, Arcabouço/Partes moles, Silhueta/ICT, Hilos/Campos, Seios/Cúpulas)
 * - Exames Laboratoriais (OCR fiel, valores de referência, desvios e integração fisiopatológica)
 * - Dermatologia (Lesão elementar primária/secundária, arranjo, distribuição, regra ABCDE se pigmentada)
 * - Alerta mandatório de emergência na PRIMEIRA LINHA se houver achado crítico com risco de morte.
 */
function analisarImagemMedicaComIA(base64Data, mimeType, contextoTexto, opcoes) {
  opcoes = opcoes || {};
  var contextoUsuario = (contextoTexto && String(contextoTexto).trim())
    ? "CONTEXTO CLÍNICO / LEGENDA INFORMADA PELO MÉDICO:\n" + String(contextoTexto).trim()
    : "Nenhum contexto textual adicional fornecido.";

  var sistema = [
    IA_PERSONA,
    "",
    "MODO: LEITOR E LAUDO DE IMAGEM MÉDICA MULTIMODAL (PADRÃO FMRP-USP).",
    "Você é o Preceptor Sênior de Clínica Médica, Cardiologia e Radiologia Hospitalar da FMRP-USP.",
    "Analise meticulosamente a imagem médica anexada (ECG, Radiografia, Exame Laboratorial/OCR, Lesão Dermatológica ou outro exame complementar).",
    "",
    "🚨 PROTOCOLO DE SEGURANÇA MÁXIMA (SALA VERMELHA / ACHADO CRÍTICO):",
    "- Se identificar qualquer condição com risco iminente de morte ou instabilidade grave (ex: IAM com Supra de ST, BAVT, Taquiarritmia ventricular/instável, Pneumotórax hipertensivo, Pneumoperitônio, Derrame pleural maciço com desvio, Hipercalemia severa com alterações no ECG, etc.):",
    "- A PRIMEIRA LINHA DA RESPOSTA DEVE SER OBRIGATORIAMENTE ESTE ALERTA EM MAIÚSCULAS E NEGRITO:",
    "  🚨 *EMERGÊNCIA - ACHADO CRÍTICO:* [Descrição do Achado + Ação Imediata Obrigatória]",
    "",
    "ROTEIROS METÓDICOS POR MODALIDADE:",
    "1. SE FOR ELETROCARDIOGRAMA (ECG DE 12 DERIVAÇÕES):",
    "   - Realize a leitura sistemática obrigatória em 6 passos:",
    "     * 1.1 Ritmo: Ritmo sinusal (onda P positiva em D1, D2, aVF, negativa em aVR, seguida de QRS) vs ritmos não sinusais (FA, flutter, juncional, escape).",
    "     * 1.2 Frequência Cardíaca: Estimar FC em bpm (método dos quadradinhos 1500/mm ou 300/quadrados grandes; ou número de complexos em 30 quadrados grandes x 10 se irregular).",
    "     * 1.3 Eixo Elétrico no Plano Frontal: Normal (-30° a +90°), desvio para esquerda (< -30°) ou para a direita (> +90°), avaliando D1 e aVF.",
    "     * 1.4 Intervalos e Condução: Intervalo PR (normal 120-200 ms; pesquisar BAVs ou pré-excitação/WPW); Duração do QRS (normal < 120 ms; bloqueios de ramo BRE/BRD); Intervalo QT e QTc corrigido por Bazett (normal até 450 ms homem, 460 ms mulher; risco de Torsades se > 500 ms).",
    "     * 1.5 Sobrecargas de Câmaras: Sobrecarga atrial (P pulmonale em D2 ou índice de Morris em V1); Sobrecarga ventricular esquerda (Sokolow-Lyon S em V1 + R em V5/V6 >= 35 mm, Cornell R em aVL + S em V3 > 28 mm homens ou > 20 mm mulheres) e sobrecarga ventricular direita.",
    "     * 1.6 Isquemia, Lesão e Necrose (Segmento ST e Onda T por paredes contíguas): Analisar parede anterior/septal (V1-V4), lateral alta (D1, aVL), lateral baixa (V5, V6), inferior (D2, D3, aVF), posterior/dorsal (espelho em V1-V3) e VD (V3R/V4R se IAM inferior). Identificar supradesnivelamento de ST, infradesnivelamento, ondas T isquêmicas/hiperagudas e ondas Q patológicas.",
    "",
    "2. SE FOR RADIOGRAFIA (TÓRAX OU OSSO):",
    "   - 2.1 Identificação e Técnica: Incidência (PA, AP, Perfil); qualidade técnica (Penetração, Rotação e Grau de inspiração com contagem de arcos costais posteriores 8-10).",
    "   - 2.2 Arcabouço Ósseo e Partes Moles: Fraturas, lesões líticas/blásticas, enfisema subcutâneo.",
    "   - 2.3 Mediastino e Silhueta Cardíaca: Índice Cardiotorácico (ICT normal <= 0,50 no PA), alargamento de mediastino, contornos aórtico e hilar.",
    "   - 2.4 Campos Pleuropulmonares: Consolidação alveolar (com/sem broncograma aéreo), infiltrado intersticial reticular/nodular, atelectasia com perda volumétrica, nódulos ou massas pulmonares.",
    "   - 2.5 Pleura, Seios Costofrênicos e Cúpulas: Seios livres vs velamento por derrame pleural; linha de pneumotórax; ar livre subdiafragmático (pneumoperitônio).",
    "",
    "3. SE FOREM EXAMES LABORATORIAIS / OCR DE LAUDOS:",
    "   - 3.1 Transcrição fiel com unidades de medida e valores de referência informados.",
    "   - 3.2 Realce imediato de valores alterados (críticos, limítrofes, altos ou baixos).",
    "   - 3.3 Interpretação integrada dos desvios (ex: gasometria com distúrbio primário e compensação; hemograma com classificação de anemias e desvio escalonado).",
    "",
    "4. SE FOR LESÃO DERMATOLÓGICA (PELE):",
    "   - 4.1 Lesão elementar primária e secundária (mácula, pápula, placa, vesícula, bolha, pústula, úlcera, crosta, descamação).",
    "   - 4.2 Topografia, arranjo e distribuição corporal (zosteriforme, simétrica, flexural, extensora).",
    "   - 4.3 Se lesão pigmentada/suspeita, aplicar Regra ABCDE (Assimetria, Bordas, Cores, Diâmetro > 6mm, Evolução).",
    "",
    "ESTRUTURA FORMAL DO LAUDO (Markdown do Telegram):",
    "- Título em destaque com emoji funcional e modalidade identificada (ex: *LAUDO CLÍNICO MULTIMODAL · ECG DE 12 DERIVAÇÕES* ou *LAUDO CLÍNICO MULTIMODAL · RADIOGRAFIA DE TÓRAX*).",
    "- *1. 🔍 Descrição Semiológica e Metódica dos Achados*",
    "- *2. 🎯 Hipóteses Diagnósticas Principais & Diferenciais*",
    "- *3. ⚡ Condutas Recomendadas & Recomendações de Diretriz*",
    "- Rodapé: _Sugestão gerada por IA multimodal. Conferir imagem original e correlacionar com a clínica; a responsabilidade do laudo é do médico assistente._"
  ].join("\n");

  var promptInstrucao = [
    contextoUsuario,
    "",
    "Por favor, examine a imagem com atenção a cada detalhe semiológico e retorne o laudo completo conforme o roteiro especializado correspondente."
  ].join("\n");

  var opts = Object.assign({
    thinkingBudget: 1024,
    clinico: true
  }, opcoes);

  return chamarGeminiPoolMultimodal(base64Data, mimeType, sistema, promptInstrucao, opts);
}

// ==============================================================================
// AUDITORIA DE SEGURANÇA MEDICAMENTOSA (segunda passada, opcional)
// ==============================================================================

function auditoriaClinicaPendente(texto) {
  return /auditoria autom[aá]tica (?:indispon[ií]vel|incompleta)|alertas da auditoria autom[aá]tica/i.test(String(texto || ""));
}

function _iaAuditarRascunho(rascunho, dadosCaso, titulo, baseMedicamentos) {
  if (!rascunho) return rascunho;
  var sistema = [
    "Você é um auditor de segurança medicamentosa e de conformidade com diretrizes. Receba o CASO e o RASCUNHO e liste SOMENTE problemas reais:",
    "- dose acima do máximo ou abaixo do terapêutico; falta de ajuste renal/hepático/peso/idade; alergia ou interação ignorada;",
    "- erro de cálculo pediátrico (ex: calcular anti-histamínico por mg/kg em vez da dose fixa por idade/peso do HSL; cobrar peso quando a idade define a dose; horários desnecessários de madrugada);",
    "- diluente, velocidade de infusão ou acesso incorretos; erro aritmético (refaça a conta); medicamento fora da lista informada;",
    "- conduta em desacordo com AHA 2025 (PCR), Surviving Sepsis Campaign (sepse) ou diretrizes brasileiras vigentes.",
    "Se não houver problema, responda exatamente: SEM ALERTAS. Caso contrário, liste todos os problemas identificados em linhas iniciadas por '- ', sem omitir alertas por brevidade.",
    "Não use LaTeX. Não reescreva o rascunho."
  ].join("\n");
  var contexto = "CASO:\n" + dadosCaso + "\n\nRASCUNHO:\n" + rascunho;
  if (typeof baseMedicamentos === "string") contexto += "\n\nLISTA REMUME FORNECIDA AO GERADOR:\n" + baseMedicamentos;
  var r = null;
  try { r = _iaExecutar(sistema, contexto, 600, { exigirRespostaCompleta: true }); }
  catch (e) { Logger.log("Auditoria automática indisponível."); }
  var limpo = String(r || "").trim();
  if (!limpo) return rascunho + "\n\n⚠️ *Auditoria automática indisponível — revisão pendente*\nNão foi possível concluir a segunda revisão. Este rascunho não foi liberado pela auditoria; confira-o antes de qualquer uso.";
  if (/^SEM ALERTAS\.?$/i.test(limpo)) return rascunho;
  if (!/^-\s+/m.test(limpo) || /resposta interrompida por limite/i.test(limpo)) {
    return rascunho + "\n\n⚠️ *Auditoria automática incompleta — revisão pendente*\nA revisão não produziu uma conclusão completa. Retorno recebido:\n" + _iaFinalizarTexto(limpo);
  }
  return rascunho + "\n\n🛑 *Alertas da auditoria automática (" + titulo + ") — revisão pendente*\n" + _iaFinalizarTexto(limpo);
}

// ==============================================================================
// PROMPTS MÉDICOS ESPECIALIZADOS
// ==============================================================================

/**
 * ==============================================================================
 * FLUXO CLÍNICO SOAP EM DOIS TEMPOS (FMRP-USP / AMBULATÓRIO & PRONTO-SOCORRO)
 * ==============================================================================
 * Fase 1: Anamnese organizada (QP, HDA, antecedentes, medicações, alergias) +
 *         Exame Físico inteligente (sistemas normais preenchidos + cobrança dirigida) +
 *         Perguntas ativas. NÃO gera Avaliação nem Plano prematuros.
 * Fase 2: Avaliação e Plano consolidados sob solicitação explícita ou botão.
 * ==============================================================================
 */

function trechosClinicosConfirmados(trechos, fonte) {
  var frases = String(fonte || "").split(/\n|(?<=[.!?])\s+/).map(function(x) { return x.trim(); }).filter(Boolean);
  return (Array.isArray(trechos) ? trechos : []).filter(function(x, i, todos) {
    return typeof x === "string" && frases.indexOf(x.trim()) !== -1 && todos.indexOf(x) === i;
  }).map(function(x) { return x.trim(); });
}

function verificarPedidoExplicitoPlano(texto) {
  if (!texto) return false;
  return /(?:fa[çc]a|fazer|gere|gerar|elabore|elaborar|construa|construir)\s+(?:a\s+)?(?:avalia[çc][ãa]o|conduta|plano)|(?:fechar|concluir|finalizar)\s+(?:o\s+)?soap|avalia[çc][ãa]o\s+e\s+plano/i.test(texto);
}

function formatarListaTopicos(v, fallback) {
  var itens = Array.isArray(v) ? v.filter(function(x) { return typeof x === "string" && x.trim(); }).slice(0, 8) : [];
  return itens.length ? itens.map(function(x) { return "• " + x; }).join("\n") : fallback;
}

function gerarSOAPComIA(casoClinico, opcoes) {
  opcoes = opcoes || {};
  var fecharPlano = !!(opcoes.fecharPlano || verificarPedidoExplicitoPlano(casoClinico));
  var dadosCaso = String(casoClinico || "").trim();

  if (fecharPlano) {
    // =========================================================================
    // FASE 2: SOAP COMPLETO CONSOLIDADO (AVALIAÇÃO E PLANO)
    // =========================================================================
    var promptSistemaConsolidado = [
      IA_PERSONA, IA_SEGURANCA_MEDICAMENTOSA,
      "MODO: DOCUMENTAÇÃO CLÍNICA SOAP - FASE 2: CONSOLIDAÇÃO COMPLETA (AVALIAÇÃO E PLANO).",
      "Você é o Copiloto Clínico Sênior (FMRP-USP). Estruture o caso em prontuário SOAP definitivo pronto para o prontuário eletrônico.",
      "",
      "DIRETRIZES TÉCNICAS OBRIGATÓRIAS:",
      "1. SUBJETIVO (S) - ORGANIZAÇÃO SEMIOLÓGICA ESTRUTURADA:",
      "   - NUNCA resuma toda a história em um parágrafo único, contínuo ou corrido. NUNCA faça transcrição literal grosseira.",
      "   - Estruture o Subjetivo obrigatoriamente com os seguintes tópicos médicos em linhas separadas:",
      "     • Queixa Principal (QP): sintoma-guia e tempo de evolução.",
      "     • História da Doença Atual (HDA): cronologia clara e detalhada, caracterização semiológica rica (tipo, intensidade, irradiação), fatores desencadeantes, de melhora e de piora, sintomas associados cardinais ou negados relevantes.",
      "     • Antecedentes Gineco-Obstétricos / Clínicos: histórico prévio, métodos contraceptivos (ex: DIU, ACO), cirurgias e comorbidades.",
      "     • Medicações de Uso Contínuo: fármacos em uso ou 'Nega uso de medicações contínuas'.",
      "     • Alergias: alergias relatadas ou 'Nega alergias medicamentosas conhecidas'.",
      "     • Hábitos de Vida: álcool, tabaco, outros ou 'Não relatados'.",
      "2. INTEGRAÇÃO INTELIGENTE DE NOVOS DADOS (SEM 'ATUALIZAÇÃO:' SOLTA):",
      "   - Se o relato do médico contiver dados complementares, novas mensagens ou adendos enviados em etapas:",
      "     • NUNCA escreva 'Atualização:', 'Adendo:' ou notas soltas no rodapé.",
      "     • INTEGRE cada informação cirurgicamente na sua respectiva seção médica (ex: se o médico informou alergias ou hábitos depois, insira diretamente em Alergias e Hábitos; se informou exame físico, insira no Objetivo).",
      "     • O prontuário final deve ser coeso, limpo e parecer redigido de forma contínua e definitiva por um médico assistente experiente.",
      "3. OBJETIVO (O) - EXAME FÍSICO E EXAMES COMPLEMENTARES:",
      "   - Sinais Vitais: PA, FC, FR, SpO2, Tax (apenas os relatados; se ausentes, declare 'Sinais vitais pendentes de aferição').",
      "   - Registre os achados por sistemas (Geral/Ectoscopia, ACV, AR, Abdome, Ginecológico, Extremidades e sistemas pertinentes à queixa).",
      "   - NUNCA invente normalidade para sistemas que não foram relatados nem examinados. Para sistemas não informados, aponte 'Pendente de avaliação'.",
      "   - Se o médico declarou 'exame físico normal' ou 'EF normal', registre os 5 sistemas clássicos padrão.",
      "   - INTEGRAÇÃO DE EXAMES ESPECIAIS: Se o caso contiver exame especial anexado/incorporado (ex: [EXAME DO ESTADO MENTAL / PSICOPATOLÓGICO], [EXAME NEUROLÓGICO], ginecológico, etc.) ou se for diretamente relevante à queixa, transcreva a seção completa desse exame no Objetivo (O).",
      "4. AVALIAÇÃO (A):",
      "   - Diagnóstico principal ou problema sindrômico com código CID-10 e CIAP-2.",
      "   - Diagnósticos diferenciais pertinentes em ordem de probabilidade/gravidade.",
      "   - Estratificação de risco/gravidade (escores clínicos pertinentes se aplicável).",
      "5. PLANO (P):",
      "   - Conduta terapêutica e prescrição farmacológica detalhada (fármaco, dose, posologia, via, tempo), de acordo com REMUME/SUS e segurança (ajuste renal/peso se informado).",
      "   - Exames complementares prioritários solicitados.",
      "   - Medidas não farmacológicas e orientações ao paciente.",
      "   - Critérios de alarme e tempo de retorno ambulatorial.",
      "6. DADOS PENDENTES OPCIONAIS:",
      "   - Liste até 3 dados ou medições clínicas ainda ausentes que enriqueceriam a conduta se o médico desejar complementar.",
      "",
      "Contrato JSON estrito:",
      '{"subjetivo":"Texto multi-linhas perfeitamente organizado com QP, HDA, Antecedentes, Medicações, Alergias e Hábitos","objetivo":"Texto estruturado do O por sistemas com achados e exames","avaliacao":["hipótese principal com CID-10 e CIAP-2","diferenciais em ordem de probabilidade/gravidade"],"plano":["item 1 da conduta com prescrição detalhada","exames solicitados","medidas não farmacológicas e orientações","critérios de alarme e retorno"],"pendencias_opcionais":["dado ausente que enriqueceria o caso"]}'
    ].join("\n");

    var rawCons = executarRaciocinioClinico(promptSistemaConsolidado, "CASO CLÍNICO:\n" + dadosCaso, 3500);
    var objCons = _iaExtrairJSON(rawCons) || {};

    var sTexto = (typeof objCons.subjetivo === "string" && objCons.subjetivo.trim())
      ? objCons.subjetivo.trim()
      : dadosCaso.replace(/Atualização:\s*/gi, "").trim();
    var oTexto = (typeof objCons.objetivo === "string" && objCons.objetivo.trim()) ? objCons.objetivo.trim() : "Exame físico conforme relato médico.";
    var pendencias = Array.isArray(objCons.pendencias_opcionais) ? objCons.pendencias_opcionais.filter(Boolean) : [];

    var blocosCons = [
      "🩺 *SÍNTESE SOAP · REGISTRO CONSOLIDADO*",
      "👤 *S - Subjetivo*\n" + sTexto,
      "🔍 *O - Objetivo*\n" + oTexto,
      "🧠 *A - Avaliação*\n" + formatarListaTopicos(objCons.avaliacao, "Avaliação diagnóstica a definir pelo médico assistente."),
      "📋 *P - Plano*\n" + formatarListaTopicos(objCons.plano, "Conduta e prescrição a definir pelo médico assistente.")
    ];

    if (pendencias.length > 0) {
      blocosCons.push(
        "⚠️ *Dados adicionais que enriqueceriam o caso:*\n" +
        formatarListaTopicos(pendencias, "") +
        "\n\n_💡 Se desejar complementar algum dado acima, basta enviar por áudio ou texto que a Avaliação e o Plano serão atualizados._"
      );
    }

    return _iaFinalizarTexto(blocosCons.join("\n\n"));
  }

  // =========================================================================
  // FASE 1: RASCUNHO CLÍNICO INTERATIVO (ANAMNESE + EXAME FÍSICO INTELIGENTE)
  // REGRA: NÃO INCLUIR AVALIAÇÃO NEM PLANO NESTA FASE
  // =========================================================================
  var promptSistemaRascunho = [
    IA_PERSONA,
    "MODO: DOCUMENTAÇÃO CLÍNICA SOAP - FASE 1: ANAMNESE E EXAME FÍSICO.",
    "Você é o Copiloto Clínico Sênior (FMRP-USP). Sua função é estruturar o relato do médico em Anamnese Técnica e Exame Físico Inteligente.",
    "",
    "DIRETRIZES SEMIOLÓGICAS OBRIGATÓRIAS:",
    "1. SUBJETIVO (S) - ORGANIZAÇÃO SEMIOLÓGICA ESTRUTURADA:",
    "   - NUNCA resuma toda a história em um parágrafo único, contínuo ou corrido. NUNCA faça transcrição literal grosseira.",
    "   - Estruture o Subjetivo obrigatoriamente com os seguintes tópicos médicos em linhas separadas:",
    "     • Queixa Principal (QP): sintoma-guia e tempo de evolução.",
    "     • História da Doença Atual (HDA): cronologia clara e detalhada, caracterização semiológica rica (tipo, intensidade, irradiação), fatores desencadeantes, de melhora e de piora, sintomas associados cardinais ou negados relevantes.",
    "     • Antecedentes Gineco-Obstétricos / Clínicos: histórico prévio, métodos contraceptivos (ex: DIU, ACO), cirurgias e comorbidades.",
    "     • Medicações de Uso Contínuo: fármacos em uso ou 'Nega uso de medicações contínuas'.",
    "     • Alergias: alergias relatadas ou 'Nega alergias medicamentosas conhecidas'.",
    "     • Hábitos de Vida: álcool, tabaco, outros ou 'Não relatados'.",
    "2. INTEGRAÇÃO INTELIGENTE DE NOVOS DADOS (SEM 'ATUALIZAÇÃO:' SOLTA):",
    "   - Se o relato do médico contiver dados complementares, novas mensagens ou adendos enviados em etapas:",
    "     • NUNCA escreva 'Atualização:', 'Adendo:' ou notas soltas no rodapé.",
    "     • INTEGRE cada informação cirurgicamente na sua respectiva seção médica (ex: se o médico informou alergias ou hábitos depois, insira diretamente em Alergias e Hábitos; se informou exame físico, insira no Objetivo).",
    "     • O prontuário final deve ser coeso, limpo e parecer redigido de forma contínua e definitiva por um médico assistente experiente.",
    "3. EXAME FÍSICO INTELIGENTE (O):",
    "   - Sinais Vitais: PA, FC, FR, SpO2, Tax (apenas os relatados; se ausentes, declare 'Sinais vitais pendentes de aferição').",
    "   - Registre rigorosamente os achados por sistemas (Geral/Ectoscopia, ACV, AR, Abdome, Extremidades e sistemas pertinentes à queixa).",
    "   - Se o médico declarou 'exame físico normal' ou 'EF normal', registre os 5 sistemas clássicos padrão.",
    "   - NUNCA invente sinais vitais numéricos (PA, FC, FR, SpO2, Tax). Se não constarem no relato, declare 'Sinais vitais pendentes de aferição' e cobre na seção dirigida.",
    "   - NUNCA assuma como normais os sistemas que são o FOCO ou suspeita central da queixa a menos que o médico tenha dito expressamente 'normal'. Para sistemas não informados e não examinados, declare explicitamente como pendentes à beira-leito.",
    "   - INTEGRAÇÃO DE EXAMES ESPECIAIS: Se o caso contiver exame especial anexado/incorporado (ex: [EXAME DO ESTADO MENTAL / PSICOPATOLÓGICO], [EXAME NEUROLÓGICO], ortopédico, etc.) ou se for diretamente relevante à queixa, transcreva a seção completa desse exame no Objetivo (O) após os 5 sistemas clássicos.",
    "   - DENSIDADE SEMIOLÓGICA: Meio termo elegante, sem excesso prolixo e sem ser telegráfico demais.",
    "4. INVESTIGAÇÃO ATIVA DA ANAMNESE COM JUSTIFICATIVA DIDÁTICA (FMRP-USP):",
    "   - Formule de 2 a 4 perguntas diretas e clínicas para completar as lacunas da história (início detalhado, fatores de alívio/piora, antecedentes, alergias, medicações).",
    "   - RIGOR DIDÁTICO OBRIGATÓRIO: Cada pergunta DEVE OBRIGATORIAMENTE conter sua justificativa clínica ou hipótese a descartar entre parênteses ao final. Exemplo: 'Investigar se a dor epigástrica irradia para o dorso (descartar pancreatite aguda ou dissecção de aorta abdominal)'.",
    "5. COBRANÇA ATIVA DO EXAME FÍSICO DIRIGIDO:",
    "   - Liste em tópicos os sinais vitais críticos (PA, FC, FR, SpO2, Tax) e manobras/auscultas essenciais para o caso que ainda não foram informados.",
    "6. REGRA ABSOLUTA DE SEGURANÇA: NÃO gere hipóteses diagnósticas (Avaliação) e NÃO gere prescrições ou condutas (Plano) nesta fase.",
    "",
    "Contrato JSON estrito:",
    '{"subjetivo":"Texto multi-linhas perfeitamente organizado com QP, HDA, Antecedentes, Medicações, Alergias e Hábitos","objetivo":"Texto estruturado do O por sistemas com achados e pendências","perguntas_anamnese":["Pergunta 1? (justificativa semiológica/hipótese a afastar)","Pergunta 2? (racional clínico)"],"exame_dirigido":["sinal vital ou manobra física imprescindível"]}'
  ].join("\n");

function sanitizarObjetivoComRelato(objetivo, casoClinico) {
  var textoCaso = String(casoClinico || "");
  var reMedicao = /\b\d{2,3}\s*[x/]\s*\d{2,3}\b|\b\d+\s*bpm\b|\b\d+\s*mmHg\b|\b\d+[.,]\d+\s*°c\b|\bspo2\s*[:=]?\s*\d{2,3}%?\b|\bsat(?:ura[çc][ãa]o)?\s*[:=]?\s*\d{2,3}%?\b|\bfr\s*[:=]?\s*\d{1,2}\s*(?:irpm)?\b/i;
  function sanitizarLinha(l) {
    if (typeof l !== "string" || !l.trim()) return false;
    if (reMedicao.test(l)) {
      var medidasInventadas = l.match(/\b\d{2,3}\s*[x/]\s*\d{2,3}\b|\b\d+\s*bpm\b|\b\d+\s*mmHg\b|\b\d+[.,]\d+\s*°c\b|\bspo2\s*[:=]?\s*\d{2,3}%?\b|\bsat(?:ura[çc][ãa]o)?\s*[:=]?\s*\d{2,3}%?\b|\bfr\s*[:=]?\s*\d{1,2}\s*(?:irpm)?\b/gi) || [];
      for (var i = 0; i < medidasInventadas.length; i++) {
        if (textoCaso.toLowerCase().indexOf(medidasInventadas[i].toLowerCase().trim()) === -1) {
          return false;
        }
      }
    }
    return true;
  }
  if (Array.isArray(objetivo)) {
    return objetivo.filter(sanitizarLinha).join("\n");
  }
  if (typeof objetivo === "string" && objetivo.trim()) {
    return objetivo.split("\n").filter(sanitizarLinha).join("\n");
  }
  return "";
}

  var rawRasc = executarRaciocinioClinico(promptSistemaRascunho, "CASO CLÍNICO:\n" + dadosCaso, 3000);
  if (typeof rawRasc === "string" && rawRasc.indexOf("🩺") !== -1 && rawRasc.indexOf("S -") !== -1) {
    return _iaFinalizarTexto(rawRasc);
  }
  var objRasc = _iaExtrairJSON(rawRasc) || {};

  var sRasc = (typeof objRasc.subjetivo === "string" && objRasc.subjetivo.trim())
    ? objRasc.subjetivo.trim()
    : dadosCaso.replace(/Atualização:\s*/gi, "").trim();
  var oRasc = sanitizarObjetivoComRelato(objRasc.objetivo, dadosCaso);
  if (!oRasc) oRasc = "Exame físico em estruturação; conferir sinais vitais e achados.";

  var perguntas = objRasc.perguntas_anamnese || objRasc.perguntas;
  var exameDirigido = objRasc.exame_dirigido;

  var blocosRasc = [
    "🩺 *SÍNTESE SOAP · ATENDIMENTO CLÍNICO*",
    "👤 *S - Subjetivo (Anamnese Estruturada)*\n" + sRasc,
    "🔍 *O - Objetivo (Exame Físico)*\n" + oRasc,
    "❓ *Perguntas para Completar a Anamnese (Investigação Ativa do Subjetivo)*\n" + formatarListaTopicos(perguntas, "Informar início detalhado, fatores de melhora/piora, antecedentes e alergias."),
    "🎯 *Cobrança Ativa do Exame Físico Dirigido*\n" + formatarListaTopicos(exameDirigido, "Aferir sinais vitais completos e exame direcionado ao foco da queixa.") +
    "\n\n_💡 Envie dados adicionais para atualizar ou clique em [📋 Gerar Avaliação & Plano] quando desejar fechar a conduta._"
  ];

  return _iaFinalizarTexto(blocosRasc.join("\n\n"));
}

/**
 * ==============================================================================
 * BIBLIOTECA DE EXAMES FÍSICOS ESPECIAIS (ROTEIROS DETERMINÍSTICOS E COPIÁVEIS)
 * ==============================================================================
 */

function obterRoteiroPadraoNeuro() {
  return "🧠 *EXAME NEUROLÓGICO DIRIGIDO (MODELO NORMAL PRONTO)*\n\n" +
    "📋 *Modelo para Prontuário:*\n" +
    "```\n" +
    "[EXAME NEUROLÓGICO]\n" +
    "• Consciência & Cognição: Lúcido, vigil, orientado no tempo e espaço (LOTE). ECG 15 (AO 4, RV 5, RM 6). Fala fluente, articulada e compreensiva.\n" +
    "• Pupilas: Isocóricas e fotorreagentes direta e consensualmente.\n" +
    "• Pares Cranianos: Pares cranianos II a XII sem déficits aparentes. Motilidade ocular extrínseca (MOE) preservada sem nistagmo ou diplopia. Mímica facial simétrica. Deglutição preservada, úvula e palato simétricos à fonação.\n" +
    "• Sistema Motor & Tônus: Eutrófico e eutônico. Força muscular grau 5/5 simétrica nos 4 membros (escala MRC). Manobras deficitárias (Mingazzini, Barré e braços estendidos) negativas.\n" +
    "• Sensibilidade: Sensibilidade tátil, térmica e dolorosa preservadas e simétricas nos 4 membros.\n" +
    "• Reflexos: Reflexos tendinosos profundos normoativos (2+/4+) e simétricos (bicipital, tricipital, patelar e aquileu). Reflexo cutâneo-plantar em flexão bilateral (Babinski ausente).\n" +
    "• Coordenação & Marcha: Coordenação apendicular preservada (índex-nariz e diadococinesia sem dismetria). Sinal de Romberg negativo. Marcha típica, estável e coordenada, inclusive em tandem.\n" +
    "• Sinais Meníngeos & Radiculares: Rigidez de nuca ausente. Sinais de Kernig, Brudzinski e Lasègue negativos bilateralmente.\n" +
    "```\n\n" +
    "📌 *Notas Semiológicas:*\n" +
    "1. Consciência (ECG) e Pares Cranianos (II a XII).\n" +
    "2. Força motora MRC 0 a 5 e manobras de queda (Mingazzini/Barré).\n" +
    "3. Reflexos profundos e cutâneo-plantar.\n" +
    "4. Coordenação, Romberg, marcha e sinais meníngeos.";
}

function obterRoteiroPadraoPqu() {
  return "🧠 *EXAME DO ESTADO MENTAL / PSICOPATOLÓGICO (MODELO NORMAL PRONTO)*\n\n" +
    "📋 *Modelo para Prontuário:*\n" +
    "```\n" +
    "[EXAME DO ESTADO MENTAL / PSICOPATOLÓGICO]\n" +
    "• Aparência e Comportamento: Paciente com higiene adequada e vestes compatíveis com o contexto. Atitude colaborativa, receptiva e com contato visual preservado durante a entrevista.\n" +
    "• Consciência: Lúcido e vigil. Plenamente desperto e responsivo.\n" +
    "• Orientação: Orientado de forma global (auto e alopsiquicamente). Sabe identificar a si mesmo, o tempo e o espaço atual.\n" +
    "• Atenção: Tenacidade e vigilância mantidas. Concentração preservada durante o diálogo.\n" +
    "• Sensopercepção: Sem alterações quantitativas ou qualitativas. Ausência de sinais de alucinações ou ilusões.\n" +
    "• Pensamento: Curso de velocidade normal. Forma lógica, coerente e agregada. Conteúdo sem ideias delirantes, obsessivas ou de cunho persecutório.\n" +
    "• Humor e Afeto: Humor eutímico. Afeto modulado, ressonante e congruente com o conteúdo do pensamento.\n" +
    "• Linguagem e Fala: Fala fluida, clara, articulada e em tom/volume adequados. Boa capacidade de compreensão.\n" +
    "• Memória: Fixação e evocação preservadas para fatos imediatos, recentes e remotos.\n" +
    "• Juízo Crítico e Insight: Capacidade de julgamento da realidade mantida e boa percepção sobre seu estado de saúde geral.\n" +
    "• Risco: Nega ativamente ideação de morte, planos suicidas ou heteroagressividade.\n" +
    "```\n\n" +
    "📌 *Notas Clínicas & 10 Funções Psíquicas Avaliadas:*\n" +
    "1. Consciência, Orientação e Atenção.\n" +
    "2. Sensopercepção (ausência de ilusões ou alucinações).\n" +
    "3. Pensamento (curso, forma e conteúdo).\n" +
    "4. Humor e Afeto (modulação e congruência).\n" +
    "5. Linguagem, Fala e Memória.\n" +
    "6. Juízo Crítico, Insight e Avaliação Ativa de Risco.";
}

function obterRoteiroPadraoOftalmo() {
  return "👁️ *EXAME OFTALMOLÓGICO AMBULATORIAL (MODELO NORMAL PRONTO)*\n\n" +
    "📋 *Modelo para Prontuário:*\n" +
    "```\n" +
    "[EXAME OFTALMOLÓGICO]\n" +
    "• Acuidade Visual: OD 20/20 | OE 20/20 (com correção óptica habitual ou ao orifício estenopeico).\n" +
    "• Ectoscopia & Anexos: Pálpebras e bordas ciliares sem ptose, edema ou lesões inflamatórias. Aparelho lacrimal pérvio.\n" +
    "• Conjuntiva & Esclera: Conjuntiva clara, normocorada, sem hiperemia ciliar perilimbar ou secreção patológica. Escleras anictéricas.\n" +
    "• Córnea & Câmara Anterior: Córnea transparente com brilho preservado, câmara anterior límpida e profunda (van Herick grau IV), sem hipópio ou hifema.\n" +
    "• Pupilas & Reflexos: Isocóricas e fotorreagentes direta e consensualmente. Defeito pupilar aferente relativo ausente (DPAR negativo).\n" +
    "• Motilidade Ocular (MOE): Movimentação ocular preservada, ampla e simétrica nas 6 posições cardinais, sem diplopia ou nistagmo.\n" +
    "• Fundoscopia Direta: Disco óptico nítido e róseo, escavação fisiológica preservada (≤ 0,4), emergência e trajeto vascular típicos, mácula sem lesões aparentes com reflexo foveal mantido.\n" +
    "```\n\n" +
    "📌 *Notas Semiológicas:*\n" +
    "1. Acuidade visual monocular (6º sinal vital).\n" +
    "2. Diagnóstico diferencial: hiperemia conjuntival periférica vs ciliar/profunda.\n" +
    "3. Isocoria, fotomotor direto/consensual e teste de Marcus Gunn (DPAR).\n" +
    "4. Motilidade extrínseca e fundoscopia de emergência.";
}

function obterRoteiroPadraoOrtopo() {
  return "🦴 *EXAME MÚSCULO-ESQUELÉTICO / ORTOPÉDICO (MODELO NORMAL PRONTO)*\n\n" +
    "📋 *Modelo para Prontuário:*\n" +
    "```\n" +
    "[EXAME MÚSCULO-ESQUELÉTICO / ORTOPÉDICO]\n" +
    "• Ectoscopia & Marcha: Marcha típica sem claudicação, alinhamento articular preservado, sem atrofias, deformidades ou edema visível.\n" +
    "• Coluna Vertebral: Mobilidade preservada nos eixos de flexo-extensão, rotação e inclinação lateral. Indolor à palpação de processos espinhosos e paravertebrais. Lasègue negativo bilateralmente (sem dor radicular ciática). Teste de Spurling negativo.\n" +
    "• Ombros: Arcos de movimento completos e indolores (abdução, adução, rotações interna e externa). Testes de Neer, Hawkins-Kennedy e Jobe negativos bilateralmente.\n" +
    "• Joelhos: Sem derrame articular (teste da tecla/ordenha negativo). Estabilidade ligamentar preservada (Lachman e gavetas anterior/posterior negativos; estresse em varo/valgo negativos). Meniscos indolores (McMurray e Apley negativos).\n" +
    "• Punhos & Mãos: Força de preensão preservada, sem sinovite ou calor local. Testes de Phalen e Tinel negativos bilateralmente.\n" +
    "• Quadris & Bacia: Mobilidade articular de quadris livre e indolor. Teste de Patrick/FABERE negativo bilateralmente. Trendelenburg negativo.\n" +
    "```\n\n" +
    "📌 *Notas Semiológicas:*\n" +
    "1. Coluna: eixos anatômicos e manobras radiculares (Lasègue / Spurling).\n" +
    "2. Ombro: testes de impacto subacromial e manguito rotador.\n" +
    "3. Joelho: pesquisa de derrame, testes ligamentares e meniscais.\n" +
    "4. Punho: Phalen/Tinel para túnel do carpo e manobra de Finkelstein.";
}

function obterRoteiroPadraoOrl() {
  return "👂 *EXAME OTORRINOLARINGOLÓGICO / CABEÇA E PESCOÇO (MODELO NORMAL PRONTO)*\n\n" +
    "📋 *Modelo para Prontuário:*\n" +
    "```\n" +
    "[EXAME OTORRINOLARINGOLÓGICO / CABEÇA E PESCOÇO]\n" +
    "• Otoscopia Bilateral: Condutos auditivos externos pérvios, pele íntegra e sem secreções. Membranas timpânicas íntegras, translúcidas e de coloração perlácea bilateralmente, com reflexo luminoso presente e cabo do martelo visível, sem abaulamentos ou retrações.\n" +
    "• Rinoscopia Anterior: Mucosa nasal normocorada e úmida, cornetos inferiores normotróficos, sem hipertrofia, palidez ou rinorreia purulenta. Septo nasal centrado, sem desvio obstrutivo significativo.\n" +
    "• Oroscopia / Faringoscopia: Lábios, soalho da boca e mucosa jugal íntegros. Dentição conservada. Língua sem lesões, palato móvel e úvula centrada à fonação. Amígdalas palatinas normotróficas (grau I), sem hiperemia, exsudato purulento ou ulcerações. Parede posterior da faringe límpida.\n" +
    "• Cervical & Glândulas: Ausência de linfonodomegalias palpáveis em cadeias cervicais e supraclaviculares. Glândula tireoide tópica, consistência fibroelástica de volume normal, indolor, móvel à deglutição e sem nódulos.\n" +
    "```\n\n" +
    "📌 *Notas Semiológicas:*\n" +
    "1. Otoscopia: tracionar pavilhão póstero-superiormente no adulto; avaliar MT perlácea e cone luminoso.\n" +
    "2. Rinoscopia: aspecto da mucosa, trofismo de cornetos e desvio septal.\n" +
    "3. Oroscopia: palato, úvula, amígdalas (escala de Brodsky) e exsudatos.\n" +
    "4. Cervical: palpação sistematizada de cadeias ganglionares e tireoide.";
}

function obterRoteiroPadraoDermato() {
  return "🔬 *EXAME DERMATOLÓGICO DIRIGIDO (MODELO NORMAL PRONTO)*\n\n" +
    "📋 *Modelo para Prontuário:*\n" +
    "```\n" +
    "[EXAME DERMATOLÓGICO]\n" +
    "• Pele Geral: Ectoscopia cutânea com turgor e elasticidade preservados para a idade. Textura suave, pele hidratada e normotérmica. Ausência de palidez, icterícia ou cianose.\n" +
    "• Lesões Elementares: Ausência de lesões elementares patológicas primárias ou secundárias (sem máculas purpúricas, eritematosas, pápulas, placas, vesículas, bolhas, pústulas, crostas ou soluções de continuidade).\n" +
    "• Lesões Pigmentadas: Nevos melanocíticos preservados e sem atipias clínicas avaliados pela regra ABCDE (simétricos, bordas regulares, tonalidade homogênea, diâmetro < 6 mm e evolução estável).\n" +
    "• Fâneros: Couro cabeludo íntegro, cabelos com implantação e distribuição típicas sem áreas de alopecia difusa ou em placas. Unhas translúcidas, lisas, de formato habitual, sem estrias, onicólise ou baqueteamento digital.\n" +
    "```\n\n" +
    "📌 *Notas Semiológicas:*\n" +
    "1. Ectoscopia da pele: turgor, hidratação, temperatura e coloração.\n" +
    "2. Caracterização das lesões elementares primárias e secundárias.\n" +
    "3. Critérios ABCDE para nevos pigmentados e rastreio de melanoma.\n" +
    "4. Avaliação de fâneros: couro cabeludo, folículos e lâminas ungueais.";
}

function obterRoteiroPadraoGineco() {
  return "🌸 *EXAME GINECOLÓGICO E OBSTÉTRICO (MODELO NORMAL PRONTO)*\n\n" +
    "📋 *Modelo para Prontuário:*\n" +
    "```\n" +
    "[EXAME GINECOLÓGICO]\n" +
    "• Mamas & Axilas: Mamas simétricas, sem retrações cutâneas ou abaulamentos na inspeção estática e dinâmica. Palpação mamária e de prolongamentos axilares sem nódulos palpáveis bilateralmente. Expressão papilar negativa para descarga patológica. Linfonodos axilares e supraclaviculares impalpáveis.\n" +
    "• Genitália Externa: Trofismo vulvar preservado, sem lesões elementares, úlceras, condilomas ou distopias genitais aparentes às manobras de esforço.\n" +
    "• Exame Especular: Paredes vaginais íntegras, rugosas e normocoradas. Conteúdo vaginal fisiológico de aspecto habitual, em quantidade moderada, sem odor patológico. Colo uterino epitelizado, orifício externo pérvio/fechado, sem ectopias, lesões vegetantes ou sangramentos.\n" +
    "• Toque Bimanual: Colo uterino indolor à lateralização e mobilização (sinal de Frenkel/Chandelier ausente). Útero em anteversoflexão (AVF), consistência elástica e tamanho fisiológicos, móvel e indolor. Regiões anexiais livres e indolores bilateralmente.\n" +
    "```\n\n" +
    "📌 *Notas Semiológicas:*\n" +
    "1. Mamas: inspeção estática/dinâmica, palpação sistemática por quadrantes e axilas.\n" +
    "2. Exame especular: paredes vaginais, conteúdo vaginal e ectocérvice.\n" +
    "3. Toque bimanual: colo (dor à mobilização), dimensões uterinas e regiões anexiais.\n" +
    "4. Exame obstétrico (se gestante): Altura Uterina (AU), manobras de Leopold, BCF e contrações.";
}

function obterRoteiroPadraoProcto() {
  return "🩺 *EXAME UROLÓGICO E PROCTOLÓGICO (MODELO NORMAL PRONTO)*\n\n" +
    "📋 *Modelo para Prontuário:*\n" +
    "```\n" +
    "[EXAME UROLÓGICO E PROCTOLÓGICO]\n" +
    "• Genitália Masculina: Pênis de características típicas sem lesões ulceradas ou verrucosas, meato uretral tópico e pérvio sem secreção. Testículos tópicos na bolsa escrotal, móveis e indolores à palpação. Regiões inguinais sem hérnias ou linfonodomegalias palpáveis às manobras de esforço.\n" +
    "• Inspeção Perianal: Região perianal sem fissuras, fístulas, orifícios drenantes, plicomas dolorosos ou sinais de trombose hemorroidária. Ausência de prolapso anal à manobra de Valsalva.\n" +
    "• Toque Retal: Tônus esfincteriano anal preservado em repouso e sob contração voluntária. Ampola retal vazia e sem massas luminais palpáveis. Próstata de consistência fibroelástica, limites bem definidos, sulco mediano preservado, simétrica, indolor, sem nódulos pétreos. Luva de exame com resíduo fecal fisiológico, sem sangue vivo ou melena.\n" +
    "```\n\n" +
    "📌 *Notas Semiológicas:*\n" +
    "1. Genitália externa: inspeção peniana, bolsa escrotal e orifícios inguinais.\n" +
    "2. Inspeção anal em decúbito de Sims: fissuras, fístulas e hemorroidas.\n" +
    "3. Toque retal: tônus esfincteriano, ampola e consistência/sulco mediano da próstata.\n" +
    "4. Verificação da luva após o procedimento.";
}

function obterRoteiroPadraoPed() {
  return "👶 *EXAME FÍSICO PEDIÁTRICO (MODELO NORMAL PRONTO)*\n\n" +
    "📋 *Modelo para Prontuário:*\n" +
    "```\n" +
    "[EXAME FÍSICO PEDIÁTRICO]\n" +
    "• Ectoscopia: Bom estado geral, corado, hidratado, acianótico, anictérico, ativo e reativo, choro forte e prontamente consolável, boa interação com a mãe/cuidadores.\n" +
    "• Crânio: Fontanela anterior normotensa e plana, perímetro cefálico compatível com a idade, sem bossas ou assimetrias.\n" +
    "• Oroscopia / Otoscopia: Oroscopia sem hiperemia ou placas esbranquiçadas em mucosa jugal; otoscopia bilateral com MTs íntegras e brilhantes.\n" +
    "• Aparelho Respiratório: Eupneico em ar ambiente, sem tiragem subcostal, retração de fúrcula ou batimento de asa de nariz. Murmúrio vesicular presente bilateralmente, sem ruídos adventícios.\n" +
    "• Aparelho Cardiovascular: Ritmo cardíaco regular em 2 tempos, bulhas normofonéticas sem sopros audíveis. Pulsos femorais e radiais cheios e simétricos.\n" +
    "• Abdome: Semi-globoso, flácido, indolor à palpação, RHA presentes, sem visceromegalias patológicas ou hérnias dolorosas.\n" +
    "• Membros / Quadris: Tônus muscular adequado para a idade. Manobras de Ortolani e Barlow negativas. Extremidades bem aquecidas e perfundidas (TEC < 2s).\n" +
    "```\n\n" +
    "📌 *Notas Semiológicas Pediátricas:*\n" +
    "1. Fontanela anterior (normotensa vs deprimida/abaulada) e perímetro cefálico.\n" +
    "2. Ausculta e pesquisa ativa de esforço respiratório (tiragem, BAN, gemência).\n" +
    "3. Palpação obrigatória de pulsos femorais (afastar coarctação de aorta).\n" +
    "4. Manobras de estabilidade de quadril (Ortolani e Barlow no 1º ano).";
}

function obterRoteiroPadraoGeriatria() {
  return "👵 *AVALIAÇÃO GERIÁTRICA AMPLA (AGA) / EXAME DO IDOSO (MODELO NORMAL PRONTO)*\n\n" +
    "📋 *Modelo para Prontuário:*\n" +
    "```\n" +
    "[AVALIAÇÃO GERIÁTRICA AMPLA / EXAME FÍSICO DO IDOSO]\n" +
    "• Estado Geral: LOTE, lúcido e orientado no tempo e espaço, sem déficit sensorial grave não corrigido, com marcha estável e postura típica.\n" +
    "• Cognição e Humor: MEEM com pontuação dentro da normalidade para a escolaridade; rastreio de sintomas depressivos (GDS-15) negativo.\n" +
    "• Funcionalidade: Independente para todas as Atividades Básicas de Vida Diária (Katz 6/6) e autônomo para Atividades Instrumentais (Lawton & Brody 27/27).\n" +
    "• Mobilidade e Equilíbrio: Teste Timed Up and Go (TUG) realizado em < 10 segundos, com transferências posturais seguras e sem instabilidade. Romberg negativo.\n" +
    "• Hipotensão Ortostática: Pesquisa de hipotensão ortostática negativa (PA deitado e em ortostase sem queda significativa de PAS/PAD ou sintomas de tontura).\n" +
    "• Nutrição e Sarcopenia: Sem perda ponderal involuntária, panturrilhas com trofismo preservado (> 31 cm), força de preensão manual preservada bilateralmente.\n" +
    "```\n\n" +
    "📌 *Notas Semiológicas Geriátricas:*\n" +
    "1. Rastreio cognitivo (MEEM/10-CS) e humor (GDS-15).\n" +
    "2. Escalas funcionais de Katz (básicas) e Lawton & Brody (instrumentais).\n" +
    "3. Teste Timed Up and Go (<10s independente; >20s alto risco de quedas).\n" +
    "4. Pesquisa de hipotensão ortostática e biometria de panturrilha (>31cm).";
}

function obterRoteiroPadraoVascular() {
  return "🩸 *EXAME VASCULAR PERIFÉRICO (MODELO NORMAL PRONTO)*\n\n" +
    "📋 *Modelo para Prontuário:*\n" +
    "```\n" +
    "[EXAME VASCULAR PERIFÉRICO]\n" +
    "• Inspeção MMII: Pele com trofismo e coloração preservados bilateralmente, sem palidez, cianose, lesões tróficas ulceradas ou dermatite ocre. Ausência de cordões varicosos tensos ou tromboflebite superficial.\n" +
    "• Pulsos Periféricos: Pulsos femorais, poplíteos, tibiais posteriores e pediosos presentes, amplos (2+/2+) e simétricos bilateralmente. Ausência de sopros arteriais.\n" +
    "• Perfusão e Temperatura: Extremidades aquecidas sem gradiente térmico distal. Tempo de enchimento capilar (TEC) < 2 segundos em pododáctilos e quirodáctilos.\n" +
    "• Sistema Venoso / TVP: Ausência de edema de membros inferiores (sinal do cacifo negativo). Panturrilhas livres, simétricas à biometria comparativa, sem empastamento muscular. Sinais de Homans e Bancroft negativos bilateralmente.\n" +
    "```\n\n" +
    "📌 *Notas Semiológicas Vasculares:*\n" +
    "1. Inspeção da pele: trofismo, dermatite ocre, palidez e úlceras.\n" +
    "2. Palpação de pulsos arteriais periféricos (0 a 4+ bilateral).\n" +
    "3. Perfusão distal e tempo de enchimento capilar (TEC < 2s).\n" +
    "4. Sinais de TVP: empastamento, Homans, Bancroft/Moses e biometria comparativa.";
}

function obterCatalogoTodosExamesEspeciais() {
  return "🩺 *CATÁLOGO DE EXAMES FÍSICOS ESPECIAIS (COPILOTO CLÍNICO)*\n\n" +
    "Selecione uma especialidade ou digite o comando correspondente para ver o modelo de exame físico normal pronto para prontuário e as notas clínicas:\n\n" +
    "• `/ef_neuro` ➔ *Neurológico* (Glasgow, pares cranianos, força MRC, reflexos, marcha, meníngeos)\n" +
    "• `/ef_pqu` ➔ *Psiquiátrico / Estado Mental* (10 funções psíquicas, risco suicida, humor, insight)\n" +
    "• `/ef_oftalmo` ➔ *Oftalmológico* (Acuidade visual, olho vermelho superficial vs ciliar, MOE, pupilas)\n" +
    "• `/ef_ortopo` ➔ *Ortopédico / Reumato* (Coluna, ombro, joelho, punho com manobras especiais)\n" +
    "• `/ef_orl` ➔ *Otorrinolaringológico* (Otoscopia, rinoscopia, oroscopia e cadeias cervicais)\n" +
    "• `/ef_dermato` ➔ *Dermatológico* (Ectoscopia, lesões elementares, regra ABCDE, fâneros)\n" +
    "• `/ef_gineco` ➔ *Gineco-Obstétrico* (Mamas, especular, toque bimanual, BCF e Leopold)\n" +
    "• `/ef_procto` ➔ *Urológico & Toque Retal* (Genitália, inspeção anal, próstata e esfíncter)\n" +
    "• `/ef_ped` ➔ *Pediátrico* (Fontanelas, desenvolvimento DNPM, ausculta infantil, Ortolani)\n" +
    "• `/ef_geriatria` ➔ *Geriátrico / AGA* (Katz, Lawton, Timed Up and Go, hipotensão ortostática)\n" +
    "• `/ef_vascular` ➔ *Vascular Periférico* (Pulsos periféricos, sinais de TVP - Homans/Moses, TEC)\n\n" +
    "💡 *Dica:* Se você tiver um caso clínico em andamento, você pode clicar em [➕ Incorporar ao SOAP] para injetar o modelo normal diretamente no registro!";
}

function gerarGuiaExameFisicoEspecial(tipo, contexto) {
  var t = String(tipo || "").toLowerCase();
  var padrao = "";
  var nomeGuia = "";

  if (t.indexOf("neuro") !== -1) {
    padrao = obterRoteiroPadraoNeuro();
    nomeGuia = "Neurológico";
  } else if (t.indexOf("pqu") !== -1 || t.indexOf("psiq") !== -1 || t.indexOf("mental") !== -1) {
    padrao = obterRoteiroPadraoPqu();
    nomeGuia = "Psiquiátrico (Exame do Estado Mental)";
  } else if (t.indexOf("oft") !== -1 || t.indexOf("olho") !== -1) {
    padrao = obterRoteiroPadraoOftalmo();
    nomeGuia = "Oftalmológico";
  } else if (t.indexOf("ort") !== -1 || t.indexOf("reum") !== -1 || t.indexOf("trauma") !== -1 || t.indexOf("musculo") !== -1) {
    padrao = obterRoteiroPadraoOrtopo();
    nomeGuia = "Músculo-Esquelético / Ortopédico";
  } else if (t.indexOf("orl") !== -1 || t.indexOf("oto") !== -1 || t.indexOf("ouvido") !== -1 || t.indexOf("faring") !== -1) {
    padrao = obterRoteiroPadraoOrl();
    nomeGuia = "Otorrinolaringológico";
  } else if (t.indexOf("derm") !== -1 || t.indexOf("pele") !== -1) {
    padrao = obterRoteiroPadraoDermato();
    nomeGuia = "Dermatológico";
  } else if (t.indexOf("gin") !== -1 || t.indexOf("obst") !== -1 || t.indexOf("mulher") !== -1) {
    padrao = obterRoteiroPadraoGineco();
    nomeGuia = "Gineco-Obstétrico";
  } else if (t.indexOf("proct") !== -1 || t.indexOf("uro") !== -1 || t.indexOf("retal") !== -1 || t.indexOf("prost") !== -1) {
    padrao = obterRoteiroPadraoProcto();
    nomeGuia = "Urológico e Proctológico";
  } else if (t.indexOf("ped") !== -1 || t.indexOf("infant") !== -1 || t.indexOf("crianc") !== -1) {
    padrao = obterRoteiroPadraoPed();
    nomeGuia = "Pediátrico";
  } else if (t.indexOf("geriat") !== -1 || t.indexOf("aga") !== -1 || t.indexOf("idoso") !== -1) {
    padrao = obterRoteiroPadraoGeriatria();
    nomeGuia = "Avaliação Geriátrica Ampla (AGA)";
  } else if (t.indexOf("vasc") !== -1 || t.indexOf("tvp") !== -1 || t.indexOf("arteri") !== -1) {
    padrao = obterRoteiroPadraoVascular();
    nomeGuia = "Vascular Periférico";
  } else {
    return obterCatalogoTodosExamesEspeciais();
  }

  if (!contexto || String(contexto).trim().length < 15) {
    return "📚 MODELO DE REFERÊNCIA — confirmar os achados antes de registrar.\n\n" + padrao;
  }

  try {
    var promptEspecial = [
      IA_PERSONA, "",
      "MODO: EXAME FÍSICO ESPECIALIZADO (" + nomeGuia.toUpperCase() + ").",
      "O médico está atendendo um paciente e solicitou o modelo do exame físico especializado para documentação clínica.",
      "1. Apresente o modelo de exame físico normal pronto para prontuário, adaptando ou destacando os achados relevantes se o caso fornecer informações específicas sobre este sistema.",
      "2. Destaque manobras cruciais que NÃO podem faltar para este caso específico na beira do leito.",
      "3. Mantenha SEMPRE o bloco de prontuário entre ``` com os achados organizados em tópicos técnicos.",
      "4. Linguagem técnica de alto padrão, assertiva e formatada para leitura ágil no Telegram.",
      "",
      "REFERÊNCIA PADRÃO:",
      padrao
    ].join("\n");

    var resIA = executarRaciocinioClinico(promptEspecial, "CASO CLÍNICO DO PACIENTE:\n" + contexto, 2500);
    var estruturado = _iaExtrairJSON(resIA);
    if (estruturado && (Array.isArray(estruturado.checklist) || Array.isArray(estruturado.achados))) {
      var achados = trechosClinicosConfirmados(estruturado.achados, contexto);
      var checklist = (estruturado.checklist || []).filter(function(x) { return typeof x === "string"; }).slice(0, 12).map(function(x) { return x.replace(/`/g, ""); });
      return "🔎 *Guia dirigido: " + nomeGuia + "*\n\n" + (checklist.length ? checklist.join("\n") + "\n\n" : "") +
        "*Achados relatados — conferir antes de registrar:*\n```\n" +
        (achados.length ? achados.join("\n") : "Achados do exame não informados.") + "\n```";
    }
    if (resIA && resIA.indexOf("```") !== -1) {
      return _iaFinalizarTexto(resIA);
    }
  } catch (e) {
    Logger.log("Erro ao adaptar guia especial com IA: " + e.message);
  }

  return "📚 MODELO DE REFERÊNCIA — confirmar os achados antes de registrar.\n\n" + padrao;
}

function gerarPrescricaoComIA(dadosPrescricao) {
  var idRemume = ConfigService.get("SPREADSHEET_ID_REMUME");
  var baseCompleta = "";
  try {
    baseCompleta = obterPlanilha("remume", idRemume, false);
  } catch (erro) {
    return "\u274C " + erro.message;
  }

  var listaMedicamentos = (typeof filtrarMedicamentosRelevantes === "function")
    ? filtrarMedicamentosRelevantes(baseCompleta, dadosPrescricao)
    : String(baseCompleta || "");

  var contextoPosologiaHSL = (typeof filtrarContextoPosologiasHSL === "function")
    ? filtrarContextoPosologiasHSL(dadosPrescricao)
    : "";

  var calculoFixoPed = (typeof CalculadorasClinicas !== "undefined" && typeof CalculadorasClinicas.calcularPosologiaPorTextoLivre === "function")
    ? CalculadorasClinicas.calcularPosologiaPorTextoLivre(dadosPrescricao)
    : null;

  var travaDeterministica = "";
  if (calculoFixoPed) {
    travaDeterministica = [
      "",
      "=======================================================================",
      "🔒 TRAVA MATEMÁTICA DETERMINÍSTICA OBRIGATÓRIA (FÓRMULA FIXA EM CÓDIGO PURO - ZERO ALUCINAÇÃO):",
      "• Fármaco Eleito: " + calculoFixoPed.farmaco,
      "• Apresentação Padronizada: " + calculoFixoPed.apresentacao,
      "• Posologia no Receituário: " + calculoFixoPed.instrucaoPosologica,
      "• Quantidade a Dispensar: " + calculoFixoPed.quantidadeDispensar,
      "• Memória de Cálculo Auditada: " + calculoFixoPed.memoriaCalculo,
      "• Orientações: " + calculoFixoPed.orientacoes,
      "⚠️ REGRA DE SEGURANÇA MÁXIMA: NÃO RECALCULE NENHUM NÚMERO.",
      "Copie EXATAMENTE a dose (" + (calculoFixoPed.tipo === 'gotas' ? (calculoFixoPed.gotasPorTomada + " gotas") : (calculoFixoPed.volumePorTomadaMl + " mL")) + "), o intervalo e a quantidade de frascos acima calculados.",
      "======================================================================="
    ].join("\n");
  }

  var promptSistema = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO: PRESCRIÇÃO AMBULATORIAL (RASCUNHO PARA REVISÃO). Gere prescrições precisas a partir da doença informada ou do medicamento solicitado.",
    "",
    "REGRA DE OURO (REMUME SUS + GUIA FARMACÊUTICO HSL):",
    "1. MEDICAMENTOS DA REMUME SÃO SEMPRE PRIMEIRA OPÇÃO: Prescreva preferencialmente fármacos e apresentações padronizadas na rede municipal (REMUME Ribeirão Preto).",
    "2. SE NÃO HOUVER ALTERNATIVA NA REMUME: Apenas se a condição clínica não puder ser tratada com itens da rede municipal, utilize a alternativa do Guia HSL declarando: '⚠️ Medicamento fora da REMUME municipal (componente especializado/compra)'.",
    "3. POSOLOGIA OFICIAL DO HOSPITAL SÍRIO-LIBANÊS (HSL): Siga as doses adultas, pediátricas por kg/dia, intervalos e ajustes para insuficiência renal (ClCr/TFG) oficiais da base HSL.",
    travaDeterministica,
    "",
    "=== BASE OFICIAL DE POSOLOGIAS & APRESENTAÇÕES (GUIA HSL + REMUME) ===",
    contextoPosologiaHSL ? contextoPosologiaHSL : ("LISTA MUNICIPAL:\n" + listaMedicamentos),
    "=======================================================================",
    "",
    "DIRETRIZES DE SEGURANÇA FARMACOLÓGICA E DIDÁTICA (FMRP-USP):",
    "1. PEDIATRIA E MEMÓRIA DE CÁLCULO DIDÁTICA TRANSPARENTE (SÓ PEÇA PESO SE REALMENTE PRECISAR):",
    "   - Sem peso informado: NUNCA presuma peso de criança para fármacos dependentes de peso (antimicrobianos, analgésicos gotas, corticoides). Declare imediatamente em Status: 'Dados pendentes (Peso em kg obrigatório para cálculo pediátrico seguro de [medicamento])' e cobre o peso sem calcular dosagem arbitrária em mL.",
    "   - Com peso informado: Exiba no receituário a posologia clara e no campo de conferência a MEMÓRIA DE CÁLCULO COMPLETA E DIDÁTICA baseada na dose de referência do Guia HSL (mg/kg/dia ➔ mg/dose ➔ mL/dose na lista ➔ frascos).",
    "   - FÁRMACOS COM DOSE POR FAIXA ETÁRIA OU DOSE FIXA PEDIÁTRICA (ANTI-HISTAMÍNICOS E ANTI-HELMÍNTICOS):",
    "     • Exemplos: anti-histamínicos (Loratadina, Dexclorfeniramina, Cetirizina, Desloratadina), anti-helmínticos (Albendazol, Mebendazol), tópicos e nasais.",
    "     • REGRA DE OURO CLÍNICA: Se a idade for informada (ex: 'criança de 5 anos'), NUNCA COBRE PESO NEM BLOQUEIE A PRESCRIÇÃO.",
    "     • É TERMINANTEMENTE PROIBIDO inventar taxas em 'mg/kg/dia' para anti-histamínicos (erro grave de '1 mg/kg/dia').",
    "     • Prescreva imediatamente a dose volumétrica da faixa etária conforme o Guia HSL:",
    "       - Loratadina 1 mg/mL: 2 a 12 anos (até 30 kg) = 5 mL (5 mg) VO 1 vez ao dia à noite; > 12 anos (ou > 30 kg) = 10 mL (10 mg) VO 1 vez ao dia.",
    "       - Dexclorfeniramina 2 mg/5 mL: 2 a 6 anos = 1,25 mL (0,5 mg) VO 3 vezes ao dia; 6 a 12 anos = 2,5 mL (1 mg) VO 3 vezes ao dia; > 12 anos = 5 mL (2 mg) VO 3 vezes ao dia.",
    "       - Albendazol 400 mg: > 2 anos e adultos = 400 mg (10 mL ou 1 comp) em DOSE ÚNICA INDEPENDENTE DO PESO (repetir em 14 dias se oxiuríase).",
    "       - Mebendazol 100 mg/5 mL: > 2 anos = 5 mL (100 mg) de 12 em 12 horas por 3 dias consecutivos.",
    "       - Nitazoxanida 20 mg/mL: 1 a 3 anos = 5 mL (100 mg) 12/12h; 4 a 11 anos = 10 mL (200 mg) 12/12h; >= 12 anos = 500 mg 12/12h com alimentos por 3 dias.",
    "     • FÁRMACOS SEM DOSE PEDIÁTRICA NO HSL: Se o fármaco solicitado não possuir posologia pediátrica catalogada no Guia HSL, NUNCA invente dose em mg/kg. Declare em Status: '⚠️ Fármaco sem padronização pediátrica no Guia HSL' e indique a alternativa da REMUME.",
    "2. CRONOFARMACOLOGIA E DISTRIBUIÇÃO EXATA DE HORÁRIOS DE TOMADA (OBRIGATÓRIO):",
    "   - Toda posologia e orientação ao paciente DEVE conter os horários sugeridos de tomada alinhados à farmacocinética e à rotina:",
    "     • Intervalo de 8 em 8 horas: horários práticos que preservam o sono: '07:00 - 15:00 - 23:00' (ou 06:00 - 14:00 - 22:00). NUNCA sugerir despertares de madrugada desnecessários.",
    "     • Intervalo de 12 em 12 horas: '08:00 e 20:00' (ou 07:00 e 19:00).",
    "     • Anti-histamínicos (1x/dia): 'À noite (às 20:00 ou 21:00)' para controle dos sintomas matinais e prevenção de sonolência diurna.",
    "     • Corticoides orais (Prednisona/Prednisolona): 'Pela manhã (às 07:00 às 08:00), logo após o café da manhã' (ritmo do cortisol, evita insônia e supressão adrenal).",
    "     • Inibidores da bomba de prótons (Omeprazol): 'Pela manhã em jejum, 30 a 60 minutos antes do café da manhã'.",
    "     • Estatinas (Sinvastatina): 'À noite (às 21:00 ou ao deitar)' (pico noturno da síntese hepática de colesterol).",
    "     • Diuréticos (Furosemida, Hidroclorotiazida): 'Pela manhã (às 07:00 às 08:00)' para evitar noctúria e quedas noturnas.",
    "     • Metformina: 'Durante ou logo após o almoço e/ou jantar' (reduz intolerância gastrointestinal).",
    "     • AINEs: 'Sempre após as refeições' (proteção gástrica).",
    "     • Analgésicos/Antitérmicos SOS: 'a cada 6 horas se dor ou febre (intervalo mínimo 6h, máx 4 tomadas ao dia)'.",
    "3. QUANTIDADE TOTAL A DISPENSAR MATEMATICAMENTE COERENTE:",
    "   - Calcule e informe sempre a quantidade total a dispensar no receituário (ex: 21 cápsulas, 2 frascos de 100 mL, 1 tubo de 30 g) compatível com a posologia e duração do tratamento para evitar desabastecimento do paciente.",
    "4. AJUSTE RENAL, HEPÁTICO E CRITÉRIOS DE BEERS (SEGURANÇA ATIVA):",
    "   - Medicamentos com depuração renal (ex: antimicrobianos, AINEs, metformina, atenolol, enoxaparina):",
    "     • Aplique o ajuste de dose do Guia HSL conforme a faixa de ClCr informada.",
    "     • Se NÃO foi informada e o paciente for idoso ou de risco: declarar formalmente: '⚠️ Função renal não informada — fármaco de depuração renal; conferir ClCr/TFG antes de administrar (se TFG < 50 mL/min, necessária redução posológica)'.",
    "   - Idosos (>= 65 anos): verificar Critérios de Beers / STOPP-START. Alertar se a classe for potencialmente inapropriada e sugerir alternativa mais segura.",
    "   - Alergias e Interações: CHECAGEM CRUZADA OBRIGATÓRIA de alergias (penicilina, dipirona, sulfas, AINEs) e interações com medicações de uso contínuo relatadas.",
    "5. Formato copiável para o prontuário eletrônico / e-SUS.",
    "",
    IA_SEGURANCA_MEDICAMENTOSA,
    "",
    "ESTRUTURA:",
    "\uD83D\uDC8A *PRESCRIÇÃO AMBULATORIAL - RASCUNHO (REMUME & GUIA HSL)*",
    "*Status:* [Completa para revisão / Dados pendentes: listar]",
    "",
    "\uD83D\uDCDD *Receituário*",
    "*[USO ORAL / TÓPICO / INALATÓRIO / OFTÁLMICO / INJETÁVEL]*",
    "1. *Nome genérico (DCI)* - [concentração da lista] - [quantidade total calculada a dispensar]",
    "- *Posologia:* [instrução clara com via, dose, intervalo, horários sugeridos de tomada e duração]",
    "",
    "\uD83D\uDCA1 *Orientações ao paciente*",
    "- [horários práticos de tomada, relação com refeições, conservação, sinais de alerta e retorno]",
    "",
    "\uD83D\uDCCB *Conferência médica*",
    "- *Indicação clínica:* [...]",
    "- *Memória de cálculo (se pediátrico):* [se por peso: dose HSL ➔ mg/kg/dia ➔ mg/dose ➔ mL/dose na lista ➔ frascos; se por idade (ex: Loratadina/Dexclorfeniramina): dose fixa oficial HSL por idade/peso ➔ mL/dose ➔ frascos, sem inventar mg/kg]",
    "- *Ajustes de segurança (renal, hepático, idade/Beers, gestação):* [faixas de TFG do Guia HSL, alertas ou conformidade]",
    "- *Alergias e interações:* [conferido com dados do caso ou pendências]",
    "- *Disponibilidade na Rede:* [Item da REMUME de Ribeirão Preto / Não consta na REMUME - opção referenciada no Guia HSL].",
    "- *Base Posológica Oficial:* Guia Farmacêutico Hospital Sírio-Libanês (HSL)."
  ].join("\n");

  var dados = "DADOS DO PACIENTE / PEDIDO:\n" + dadosPrescricao;
  var resposta = _iaFinalizarTexto(executarRaciocinioClinico(promptSistema, dados, 1800));
  if (resposta && _iaCfgBool("IA_AUDITORIA_PRESCRICAO", true)) {
    resposta = _iaAuditarRascunho(resposta, dadosPrescricao, "prescricao", listaMedicamentos);
  }
  return resposta;
}

function gerarPassagemPlantaoSBAR(dadosCaso) {
  var promptSistema = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO: PASSAGEM DE PLANTÃO (SBAR) para enfermaria e semi-intensiva, pronto para rounds, com checklist de segurança e pendências críticas.",
    "REGRAS DE OPERAÇÃO:",
    "1. Telegráfico, direto e objetivo: formatado para leitura ágil na beira do leito.",
    "2. Dado não fornecido = 'Não informado'. NUNCA deduza 'estável' ou ausência de alergias se não constar no relato.",
    "3. Status atual (Estável / Em vigilância / Instável / Cuidados Paliativos): apenas se houver respaldo nos dados; senão 'Não informado'.",
    "4. SEGURANÇA DE LEITO & FAST-HUG OBRIGATÓRIOS:",
    "   - Foco infeccioso, antimicrobianos em curso e dia exato de tratamento (D+?).",
    "   - Invasões e dispositivos (CVC, PAI, SVD, SNE, dreno, TOT/traqueo) com tempo de permanência e previsão de desmame/retirada.",
    "   - Profilaxia de TEV (química/mecânica) e profilaxia de úlcera de estresse (indicada? prescrita?).",
    "5. Gatilhos de intercorrência devem ser operacionais: parâmetros numéricos claros que exigem ação médica.",
    "",
    "ESTRUTURA:",
    "\uD83C\uDFE5 *SBAR - PASSAGEM DE PLANTÃO*",
    "*Status:* [Estável / Em vigilância / Instável / Paliativo] | *Risco do plantão:* [baixo / moderado / alto: motivo]",
    "",
    "\uD83D\uDCCD *S - Situação*",
    "- *Leito / paciente:* [leito, iniciais, idade, sexo]",
    "- *DIH:* [dias de internação hospitalar]",
    "- *Diagnóstico principal:* [hipótese/patologia confirmada]",
    "- *Status atual:* [resumo clínico em 1 linha]",
    "",
    "\uD83D\uDCDC *B - Contexto*",
    "- *Admissão e evolução:* [2 linhas com o curso clínico até hoje]",
    "- *Comorbidades:* [...]",
    "- *Alergias:* [relatadas ou 'Não informado']",
    "- *Limitação de suporte / isolamento:* [se informado]",
    "",
    "\uD83E\uDE7A *A - Avaliação por sistemas & Segurança*",
    "- *Neuro:* [LOTE, Glasgow, delirium/CAM-ICU, sedação RASS]",
    "- *Cardio / hemodinâmica:* [PA, FC, ritmo, suporte de vasopressor/inotrópico]",
    "- *Resp:* [FR, SpO2, suporte de O2/VNI/VM]",
    "- *Gastro / nutrição:* [dieta oral/SNE/zero, aceitação, evacuações]",
    "- *Renal / balanço:* [diurese em mL/kg/h, balanço hídrico 24h, função renal/creatinina]",
    "- *Infeccioso & Terapia Antimicrobiana:* [foco, antibiótico prescrito e dia: ex. Ceftriaxona D3/7, febre/Tax]",
    "- *Dispositivos & Invasões:* [CVC D+?, SVD D+?, dreno, previsão de retirada]",
    "- *Profilaxias (FAST-HUG):* [TEV (enoxaparina/HNF) e úlcera de estresse]",
    "- *Exames relevantes:* [laboratório e imagem mais recentes]",
    "",
    "\uD83D\uDEA8 *R - Recomendações e gatilhos*",
    "- *Pendências do próximo plantão:* [exames aguardando resultado, pareceres, ultrassom/TC]",
    "- *Gatilhos de intercorrência:* [se febre > 38°C..., se PAM < 65 mmHg..., se diurese < 0,5 mL/kg/h...]",
    "- *Planejamento terapêutico:* [desmame de O2/invasões, progressão de dieta, alta da enfermaria]"
  ].join("\n");
  return _iaFinalizarTexto(executarRaciocinioClinico(promptSistema, "DADOS DO CASO:\n" + dadosCaso, 2200));
}

function gerarPitchERoundComIA(dadosCaso) {
  var promptSistema = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO: PITCH DO ROUND E PRECEPTORIA SOCRÁTICA (MODELO SNAPPS / FMRP-USP).",
    "Objetivo duplo: 1. Apresentar o paciente em um Pitch Executivo oral de 60 a 90 segundos; 2. Estimular raciocínio diagnóstico e decisão clínica ativa na beira do leito.",
    "REGRAS DE APRESENTAÇÃO:",
    "- O pitch oral deve ser extremamente fluido, profissional e focado no essencial: identificação, motivo de admissão, últimas 24h (estabilidade, balanço hídrico, curva térmica), antimicrobianos em curso e plano do dia.",
    "- Baseado ESTRITAMENTE em fatos informados; lacunas aparecem como 'Não informado'.",
    "- Checklist de leito obrigatório: antimicrobianos (D+?), dispositivos invasivos e profilaxias.",
    "- Sabatina socrática: 3 perguntas discriminantes com objetivo de decisão e fisiopatologia, NUNCA pegadinha.",
    "- NÃO forneça gabarito de imediato. Peça para Wagner responder no fone ou chat; o feedback vem a seguir.",
    "",
    "ESTRUTURA:",
    "\uD83C\uDFA4 *PITCH DO ROUND & SABATINA (60-90s)*",
    "",
    "\uD83D\uDDE3\uFE0F *1. Pitch Executivo Sugerido (para falar na frente da equipe):*",
    "\"[Apresentação verbal formal em 4 a 6 frases corridas: Identificação do paciente, DIH, diagnóstico principal, evolução clínica das últimas 24 horas (hemodinâmica, febre, balanço), antimicrobiano e dia de tratamento, e a proposta de conduta para hoje].\"",
    "",
    "\uD83D\uDEE1\uFE0F *2. Checklist de Segurança do Leito:*",
    "- *Antimicrobiano:* [Fármaco e dia de tratamento D+? ou 'Sem ATB']",
    "- *Dispositivos Invasivos:* [Acessos vasculares, sondas, drenos e previsão de desmame]",
    "- *Profilaxias:* [TEV química/mecânica e úlcera de estresse checadas]",
    "",
    "\uD83D\uDD0D *3. Ponto Crítico a Conferir:*",
    "- [UMA lacuna clínica, laboratorial ou de imagem determinante para a decisão de hoje]",
    "",
    "\uD83C\uDFAF *4. Sabatina Socrática (Defenda sua conduta):*",
    "1) *Fisiopatologia/Diagnóstico:* [Pergunta sobre achado clínico ou laboratorial discriminante da hipótese principal]",
    "2) *Farmacologia/Conduta:* [Pergunta justificando a escolha terapêutica, dose ou plano de desmame]",
    "3) *Critério de Alta/Intercorrência:* [Pergunta sobre limiar clínico para desospitalização segura ou gatilho de escalonamento]",
    "",
    "\uD83D\uDCAC _Responda no chat ou por áudio; em seguida dou o feedback do seu raciocínio e, se solicitar, o gabarito das diretrizes._"
  ].join("\n");
  return _iaFinalizarTexto(executarRaciocinioClinico(promptSistema, "DADOS DO CASO:\n" + dadosCaso, 2500));
}

function processarCalculadoraClinicaComIA(dadosCalc) {
  var promptSistema = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO: CALCULADORA E ESTRATIFICAÇÃO DE RISCO. Interprete escores e cálculos do internato com concisão.",
    "REGRAS:",
    "1. Se o texto trouxer um resultado já calculado pelo motor do sistema, PRESERVE-o integralmente; apenas interprete.",
    "2. Se precisar calcular, mostre a soma item a item em texto simples. Se faltar variável da fórmula, aponte estritamente o parâmetro ausente e forneça uma caixa de texto monospaçada para completar, sem nunca solicitar dados genéricos ou exames não relacionados.",
    "3. Escore não deve substituir julgamento clínico: cite a principal limitação.",
    "4. Use apenas hifens para tópicos.",
    "",
    "ESTRUTURA:",
    "\uD83D\uDCD0 *CALCULADORA CLÍNICA*",
    "*Resultado:* [escore e pontuação total] - [classificação de risco]",
    "",
    "- *Critérios pontuados:* [...]",
    "- *Interpretação:* [...]",
    "- *Conduta sugerida:* [direta, condicionada ao contexto]",
    "- *Limitação / dado pendente:* [...]"
  ].join("\n");
  return _iaFinalizarTexto(executarRaciocinioClinico(promptSistema, "DADOS CÁLCULO:\n" + dadosCalc, 1800));
}

var IA_STOP_INTERACAO = ["com", "uso", "dose", "para", "and", "mais", "entre", "interacao", "interacoes", "the", "que", "por", "mg", "dos", "das", "uma"];

function verificarInteracaoComIA(drogas) {
  var idInteracoes = ConfigService.get("SPREADSHEET_ID_INTERACOES");
  var baseInteracoes = "";
  var erroPlanilha = null;
  try {
    baseInteracoes = obterPlanilha("interacoes", idInteracoes, true);
  } catch (erro) {
    erroPlanilha = erro.message;
  }

  var drogasNorm = (typeof normalizarTexto === "function") ? normalizarTexto(drogas) : String(drogas || "").toLowerCase();
  var termos = drogasNorm.split(/\s+/).filter(function (t) {
    return t.length >= 3 && IA_STOP_INTERACAO.indexOf(t) < 0;
  });

  var originais = termos.length;
  if (typeof DICIONARIO_FARMACO !== "undefined") {
    for (var i = 0; i < originais; i++) {
      var sin = DICIONARIO_FARMACO[termos[i]];
      if (Array.isArray(sin)) { sin.forEach(function (s) { termos.push(s); }); }
      else if (sin) { termos.push(sin); }
    }
  }

  var registrosEncontrados = [];
  if (baseInteracoes) {
    var linhas = String(baseInteracoes).split("\n");
    var registrosComScore = [];
    for (var j = 0; j < linhas.length; j++) {
      var linhaNorm = (typeof normalizarTexto === "function") ? normalizarTexto(linhas[j]) : linhas[j].toLowerCase();
      var matchCount = 0;
      for (var k = 0; k < termos.length; k++) {
        if (linhaNorm.indexOf(termos[k]) !== -1) matchCount++;
      }
      if (matchCount > 0) {
        registrosComScore.push({ linha: linhas[j], score: matchCount });
      }
    }
    registrosComScore.sort(function(a, b) { return b.score - a.score; });
    registrosEncontrados = registrosComScore.map(function(item) { return item.linha; });
  }

  var instrucaoBase = "";
  if (erroPlanilha) {
    instrucaoBase = "AVISO TÉCNICO: a base de interações retornou erro de acesso (" + erroPlanilha + "). Avalie pelo conhecimento clínico e escreva no campo Fonte: 'Conhecimento Geral (base local inacessível)'.";
  } else if (!baseInteracoes || String(baseInteracoes).trim().length === 0) {
    instrucaoBase = "AVISO TÉCNICO: a base de interações está vazia. Avalie pelo conhecimento clínico e escreva no campo Fonte: 'Conhecimento Geral (base local sem registros)'.";
  } else if (registrosEncontrados.length > 0) {
    instrucaoBase = "=== REGISTROS DA BASE LOCAL DE INTERAÇÕES (TABELA FARMACOLÓGICA) ===\n" +
      registrosEncontrados.join("\n") + "\n===================================================================\n\n" +
      "REGRA: os termos foram localizados na base local. Use-a como referência primária e indique no campo Fonte: 'Base Local (Tabela Farmacológica)'. " +
      "Se seu conhecimento clínico indicar risco MAIOR do que o registrado, ou uma interação relevante ausente, sinalize a divergência explicitamente.";
  } else {
    instrucaoBase = "=== BASE LOCAL DE INTERAÇÕES ===\n[Nenhum registro para '" + drogas + "']\n================================\n\n" +
      "REGRA: avalie pelo conhecimento clínico e indique no campo Fonte: 'Conhecimento Geral (medicamento não cadastrado na Base Local)'. " +
      "Ausência na base local NÃO significa ausência de interação.";
  }

  var promptSistema = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO: FARMACOLOGIA CLÍNICA - INTERAÇÕES MEDICAMENTOSAS, com rigor científico. Seja conservador na gravidade; em dúvida entre dois níveis, informe o maior e justifique.",
    "",
    instrucaoBase, "",
    "LÓGICA:",
    "- Mais de um medicamento (A e B): avalie a interação entre eles. Inclua efeito clínico, fatores de risco (renal, idade, QT, serotoninérgico, sangramento) e monitorização.",
    "- Um único medicamento: liste as principais interações, priorizando graves/contraindicadas.",
    "",
    "ESTRUTURA (2 ou mais drogas):",
    "\uD83D\uDD2C *INTERAÇÃO MEDICAMENTOSA*",
    "*Grau de risco:* [Nenhum / Menor / Moderado / Grave / Contraindicado]",
    "- *Mecanismo:* [...]",
    "- *Conduta:* [evitar / ajustar / monitorizar o que e quando]",
    "- *Fonte:* [Base Local (Tabela Farmacológica) OU Conhecimento Geral (medicamento não cadastrado na Base Local)]",
    "",
    "ESTRUTURA (1 droga):",
    "\uD83D\uDD2C *PRINCIPAIS INTERAÇÕES: [DROGA]*",
    "\u26D4 *Contraindicadas / graves:*",
    "- [Droga X]: [mecanismo resumido]",
    "\u26A0\uFE0F *Moderadas:*",
    "- [Droga Y]: [mecanismo resumido]",
    "- *Fonte:* [Base Local (Tabela Farmacológica) OU Conhecimento Geral (medicamento não cadastrado na Base Local)]"
  ].join("\n");
  return _iaFinalizarTexto(executarRaciocinioClinico(promptSistema, "Drogas informadas: " + drogas, 1500));
}

// Contrato separado: o motor puro é o único emissor de medições da amostra.
function renderizarComplementoGasometria(raw) {
  var dados = _iaExtrairJSON(raw);
  // Compatibilidade restrita: uma meta isolada pode ser convertida em campo estruturado.
  // Nunca preserva uma linha mista de medição + meta, nem substitui números em prosa.
  if (!dados) {
    var meta = String(raw || "").trim().match(/^(?:alvo|meta|objetivo)(?:\s+ventilat[oó]ri[ao])?\s*(?:de\s+)?[:=]?\s*(pH|pCO2|HCO3|AG)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(mmHg|mEq\/L)?\.?$/i);
    if (meta) dados = {metas: [{parametro: meta[1], valor: meta[2], unidade: meta[3] || ""}]};
  }
  if (!dados || typeof dados !== "object") return "⚠️ Complemento de IA não estruturado; mantido apenas o laudo determinístico.";
  var linhas = ["⚠️ *Sugestões de IA para revisão — não são medições da amostra*"];
  ["hipoteses", "condutas"].forEach(function(campo) {
    if (!Array.isArray(dados[campo])) return;
    dados[campo].slice(0, 8).forEach(function(txt) {
      if (typeof txt === "string" && !/\b(?:ph|p?a?co[₂2]|hco[₃3]|bicarbonato|gap|ag)\b/i.test(txt)) linhas.push("• " + txt);
    });
  });
  if (Array.isArray(dados.metas)) dados.metas.slice(0, 8).forEach(function(m) {
    if (!m || !/^(?:ph|pco2|hco3|ag)$/i.test(m.parametro || "") || !/^\d+(?:[.,]\d+)?$/.test(String(m.valor))) return;
    var nomes = {ph:"pH", pco2:"pCO2", hco3:"HCO3", ag:"AG"};
    var chave = m.parametro.toLowerCase();
    linhas.push("Meta proposta: " + nomes[chave] + " " + String(m.valor) + (chave === "ph" ? "" : chave === "pco2" ? " mmHg" : " mEq/L"));
  });
  return linhas.join("\n");
}

function gerarAnaliseGasometriaComIA(dadosGaso) {
  var texto = String(dadosGaso || "").trim();
  var partesAmostra = texto.split(/(?:atualiza[çc][ãa]o|nova\s+amostra|amostra\s*\d*):?/i);
  var textoAmostra = (partesAmostra.length > 1 ? partesAmostra[partesAmostra.length - 1] : texto).trim();
  function num(re) {
    var m = textoAmostra.match(re);
    return m ? String(m[1]).replace(",", ".") : null;
  }
  var ph = num(/\bph\s*[:=]?\s*([67][.,]?\d+)/i);
  var pco2 = num(/\bp?a?co2\s*[:=]?\s*(\d+[.,]?\d*)/i);
  var hco3 = num(/\bhco3\s*[:=]?\s*(\d+[.,]?\d*)/i) || num(/bicarb[^\d]*(\d+[.,]?\d*)/i) || num(/\bbic\s*[:=]?\s*(\d+[.,]?\d*)/i);
  var na = num(/\bna\b\s*[:=]?\s*(\d+[.,]?\d*)/i) || num(/s[oó]dio\s*[:=]?\s*(\d+[.,]?\d*)/i);
  var cl = num(/\bcl\b\s*[:=]?\s*(\d+[.,]?\d*)/i) || num(/cloro\s*[:=]?\s*(\d+[.,]?\d*)/i);
  var alb = num(/\balb\b\s*[:=]?\s*(\d+[.,]?\d*)/i) || num(/albumina\s*[:=]?\s*(\d+[.,]?\d*)/i);
  var pao2 = num(/\bpao2\s*[:=]?\s*(\d+[.,]?\d*)/i);
  var fio2 = num(/\bfio2\s*[:=]?\s*(\d+[.,]?\d*)/i);

  if (!ph || !pco2 || !hco3) {
    return "⚠️ *Gasometria Incompleta:* Para análise ácido-base, informe obrigatoriamente pH, pCO2 e HCO3 da mesma amostra (ex.: /gaso pH 7.25, pCO2 28, HCO3 11).";
  }

  var resCalc = null;
  if (typeof CalculadorasClinicas !== "undefined") {
    try {
      resCalc = CalculadorasClinicas.gasometria(ph, pco2, hco3, na, cl, alb, pao2, fio2);
      if (resCalc && !resCalc.ok) {
        return "⚠️ *Gasometria Inconsistente ou Inválida:*\n" + (resCalc.erro || "Valores fisiologicamente incompatíveis.");
      }
    } catch (e) {
      Logger.log("Motor de gasometria falhou: " + e.message);
      return "⚠️ *Falha no Processamento da Gasometria:* Não foi possível validar os parâmetros matemáticos da amostra. Por favor, verifique os valores informados.";
    }
  }

  var dadosMatematicos = "";
  if (resCalc && resCalc.ok) {
    dadosMatematicos =
      "=== RESULTADOS DETERMINÍSTICOS DO MOTOR MATEMÁTICO (NÃO ALTERE ESTES VALORES) ===\n" +
      "- pH: " + resCalc.ph + " | pCO2: " + resCalc.pco2 + " mmHg | HCO3: " + resCalc.hco3 + " mEq/L\n" +
      "- Distúrbio primário: " + resCalc.disturbio + "\n" +
      (resCalc.compensacao ? "- " + resCalc.compensacao + "\n" : "") +
      (resCalc.avaliacaoCompensacao ? "- Avaliação da compensação: " + resCalc.avaliacaoCompensacao + "\n" : "") +
      ((resCalc.anionGap !== null && resCalc.anionGap !== undefined) ? "- Ânion gap sérico: " + resCalc.anionGap + " mEq/L (corrigido pela albumina: " + resCalc.anionGapCorrigido + " mEq/L)\n" : "") +
      (resCalc.interpretacaoAG ? "- Ânion gap e delta-delta: " + resCalc.interpretacaoAG + "\n" : "") +
      ((resCalc.pfRatio !== null && resCalc.pfRatio !== undefined) ? "- Relação PaO2/FiO2: " + resCalc.pfRatio + " (" + resCalc.classificacaoPF + ")\n" : "") +
      "=================================================================================\n\n";
  }

  var promptSistema = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO: TERAPIA INTENSIVA - INTERPRETAÇÃO E CONDUTA GASOMÉTRICA.",
    "REGRAS:",
    "1. PRESERVE estritamente os cálculos determinísticos fornecidos.",
    "2. Não recalcule nem altere valores numéricos de pH, pCO2, HCO3 ou ânion gap.",
    "3. Forneça apenas a análise de hipóteses etiológicas e plano de conduta.",
    "",
    "ESTRUTURA:",
    "🔍 *Hipóteses Etiológicas Prováveis:*",
    "- [3 principais causas clínicas no contexto]",
    "",
    "💡 *Conduta Imediata Sugerida:*",
    "- [ajustes ventilatórios, reposição volêmica, tratamento da causa base]",
    "- *Reavaliação:* [momento e parâmetros a monitorar]"
  ].join("\n");

  promptSistema += '\nResponda somente JSON: {"hipoteses":[],"condutas":[],"metas":[{"parametro":"pH|pCO2|HCO3|AG","valor":"número","unidade":""}]}. Não inclua medições nos campos de texto. Metas são propostas distintas da amostra.';
  var analiseIA = renderizarComplementoGasometria(executarRaciocinioClinico(promptSistema, dadosMatematicos + "DADOS INFORMADOS PELO USUÁRIO:\n" + textoAmostra, 1500));

  var resumoAmostra = "🧪 *Valores brutos da amostra:* pH " + ph + " · pCO2 " + pco2 + " · HCO3 " + hco3;
  var laudoDeterministico = (resCalc && resCalc.textoFormatado) ? (resCalc.textoFormatado + "\n\n" + resumoAmostra) : dadosMatematicos;
  return laudoDeterministico + "\n\n" + analiseIA;
}

function gerarCondutaEmergenciaComIA(dadosEmergencia) {
  var protocoloLocal = (typeof obterProtocoloClinico !== "undefined") ? obterProtocoloClinico(dadosEmergencia) : null;
  var contextoProtocolo = "";
  if (protocoloLocal) {
    contextoProtocolo = "\n\nPROTOCOLO OFICIAL DE REFERÊNCIA (DIRETRIZ BRASILEIRA):\n" +
      "Patologia: " + protocoloLocal.titulo + "\n" +
      "Diretriz Brasileira: " + protocoloLocal.diretriz_brasileira + "\n" +
      "Diretriz Internacional: " + protocoloLocal.diretriz_internacional + "\n" +
      "Conduta Padronizada: " + protocoloLocal.conduta_imediata + "\n" +
      "Divergência Notável: " + protocoloLocal.divergencia + "\n\n";
  }

  var promptSistema = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO: EMERGÊNCIA (SALA VERMELHA). Resposta telegráfica, operacional e ultra-precisa. Sem introdução, sem sabatina, sem perguntas didáticas.",
    "REGRAS:",
    "1. A AÇÃO PRIORITÁRIA é a primeira linha. Em dado crítico ausente (como peso), declare a pendência explicitamente antes de calcular doses absolutas.",
    "2. Sequência cronológica numerada (Passo 1, 2, 3). Cada medicamento em UMA linha com fármaco, dose + unidade, via, preparo (diluente e concentração final) e velocidade/tempo, mais a condição de segurança da própria droga.",
    "3. Inclua gatilhos para via aérea avançada, procedimentos invasivos e escalonamento (UTI, cirurgia, equipe de emergência). Se a decisão exceder a competência de um interno, ordene o acionamento do preceptor/equipe.",
    "4. Diga o que reavaliar, quando e qual resposta esperada.",
    "5. Se houver dúvida sobre a gravidade, trate como grave até prova em contrário.",
    "",
    IA_DIRETRIZES_EMERGENCIA, "",
    IA_SEGURANCA_MEDICAMENTOSA, "",
    "ESTRUTURA:",
    "\uD83D\uDEA8 *EMERGÊNCIA - [síndrome]*",
    "*Prioridade:* [ação imediata + motivo essencial]",
    "",
    "\u26A1 *Agora (minuto 0 a 5)*",
    "1. [ação]",
    "2. [ação]",
    "3. [ação]",
    "",
    "\uD83D\uDC8A *Medicação*",
    "- *[Fármaco] [dose + unidade]* [via], [intervalo]. Preparo: [diluente, concentração final]. Infusão: [velocidade/tempo]. Segurança: [limite, ajuste, contraindicação].",
    "",
    "\uD83C\uDFAF *Se refratário / próximos passos*",
    "- [...]",
    "",
    "\uD83D\uDD04 *Reavaliar*",
    "- [parâmetro + momento + resposta esperada]; se [critério], [escalonar].",
    "",
    "\u26A0\uFE0F [dado crítico pendente ou restrição que condiciona a conduta]",
    "\uD83D\uDCDA *Referência:* [diretriz, sociedade e ano - ou 'conferir versão vigente']",
    "_Sugestão gerada por IA. Conferir dose, diluição e diretriz; a responsabilidade da prescrição é do prescritor._"
  ].join("\n");

  var promptUsuario = contextoProtocolo + "EMERGÊNCIA APRESENTADA:\n" + dadosEmergencia;
  var resposta = null;

  if (_iaCfgBool("IA_GROUNDING_EMERGENCIA", false)) {
    resposta = chamarGeminiPoolComGrounding(promptSistema, promptUsuario, 2500);
  }
  if (!resposta) resposta = executarRaciocinioClinico(promptSistema, promptUsuario, 2500);
  resposta = _iaFinalizarTexto(resposta);

  if (resposta && _iaCfgBool("IA_AUDITORIA_EMERGENCIA", false)) {
    resposta = _iaAuditarRascunho(resposta, dadosEmergencia, "emergencia");
  }
  return resposta;
}

// ==============================================================================
// CLASSIFICADOR DE INTENÇÃO (FAST ROUTER) - sensibilidade máxima para emergência
// ==============================================================================

function _iaNormalizarParaRegex(texto) {
  var t = String(texto || "").toLowerCase();
  try { t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) { /* mantém */ }
  return t;
}

var IA_RE_EMERGENCIA_FORTE = new RegExp(
  "dor\\s+(tor[áa]cica|precordial|no\\s+peito|retroesternal)|\\bchoque\\b|chocand[oa]|chocad[oa]|\\bsepse\\b|\\bsepsis\\b|septic|rebaixament[oa]|rebaixad[oa]|\\brebaixou\\b|" +
  "glasgow\\s*(de\\s*)?[3-8]\\b|\\bconvuls|crise\\s+convulsiva|status\\s+epilep|anafila|\\biam\\b|infarto|supra\\s*(de\\s*)?st|" +
  "\\bavc\\b|acidente\\s+vascular|edema\\s+agudo|\\btep\\b|embolia\\s+pulmonar|pneumot[óo]rax|tamponamento|hipotens|\\bdva\\b|" +
  "vasopressor|noradrenalina|adrenalina|dobutamina|vasopressina|\\bsri\\b|intubacao|intubar|\\biot\\b|passar\\s+tubo|\\bbavt\\b|arritmia\\s+inst[aá]vel|" +
  "parada\\s+(cardio|respirat)|\\bparou\\b|ressuscit|\\brcp\\b|desfibril|assistolia|fibrilacao\\s+ventricular|taquicardia\\s+ventricular|" +
  "sangramento\\s+(maci|ativo|volumoso)|hemorragia|hematemese|intoxicacao|overdose|hipoglicemia\\s+grave|cetoacidose|" +
  "dessatur|sat(uracao)?\\s*(de|em)?\\s*[<=]?\\s*[5-8]\\d\\s*%?|spo2\\s*[<=]?\\s*[5-8]\\d|\\bpa\\s*(de\\s*)?[<]?\\s*[5-8]\\d\\s*[x\\/]|sala\\s+vermelha|c[oó]digo\\s+(?:azul|vermelho)"
);

function _iaEhEmergencia(t) {
  var tn = _iaNormalizarParaRegex(t);
  var estudo = /\b(explica|o\s+que\s+[ée]|fisiopatologia|resumo|revis[ãa]o|diretriz|estudar|flashcard|prova|resid[êe]ncia|quest[ãa]o|quest[õo]es|aula|slides?)\b/.test(tn);
  var buscaEvidencia = /(?:evid[êe]ncia|pubmed|artigos?|estudos?|meta-an[áa]lise|ensaios?\s+cl[íi]nicos?)/i.test(tn);
  var paciente = /\b(paciente|pcte|leito|chegou|chega|plant[ãa]o|na\s+sala|ps\b|uti\b|box)\b|\bpa\s*\d|\bfc\s*\d|\bsat\b/.test(tn);

  if ((estudo || buscaEvidencia) && !paciente) return false;
  if (IA_RE_EMERGENCIA_FORTE.test(tn)) return true;

  if (/\bnora\b/.test(tn) && /(mcg|ml\s*\/?\s*h|dose|dva|desmam|aument|reduz|titul|pam\b|map\b|paciente)/.test(tn)) return true;
  if (/\bpcr\b/.test(tn)) {
    var naoParada = /(prote[ií]na|reativa|dosagem|exame|rt-?pcr|covid|dna|resultado|coletar|solicitar)/.test(tn);
    var parada = /(parada|ritmo|rcp|choque|reanima|adrenalina|desfibril|assistolia|\bfv\b|\btv\b|massagem)/.test(tn);
    if (parada || !naoParada) return true;
  }
  if (/\bdobuta\b/.test(tn)) return true;
  return false;
}

function classificarIntencaoMensagem(textoMensagem) {
  var texto = (textoMensagem || "").trim();
  if (!texto) return { intencao: "CONVERSA", dados: "" };

  var t = texto.toLowerCase();
  var tn = _iaNormalizarParaRegex(texto);

  // 1) Solicitação explícita de áudio ou preceptor socrático (incluindo atalhos rápidos)
  if (/(?:me\s+)?respond(?:a|e)\s+(?:com\s+|em\s+)?(?:um\s+)?[aá]udio|no\s+fone|fala\s+comigo|preceptor\s+socr[aá]tico|\bsabatina\b|manda\s+[aá]udio|^(?:preceptor|áudio|audio|no\s+fone)\b/i.test(t)) {
    return { intencao: "PRECEPTOR_VOZ", confianca: 0.99 };
  }

  // 2) SEGURANÇA PRIMEIRO: bandeiras vermelhas de emergência antes de qualquer outra regra
  if (_iaEhEmergencia(texto)) {
    return { intencao: "CLINICO_EMERGENCIA", confianca: 0.98, resumo: "bandeira vermelha (pré-filtro)" };
  }

  if (t.indexOf("marcar") !== -1 || t.indexOf("agendar") !== -1 || (t.indexOf("compromisso") !== -1 && t.indexOf("agenda") !== -1)) {
    return { intencao: "CALENDAR_CRIAR", confianca: 0.9 };
  }
  if (t.indexOf("o que eu tenho") !== -1 || t.indexOf("minha agenda") !== -1 || t.indexOf("compromissos de") !== -1 || t.indexOf("agenda de hoje") !== -1) {
    return { intencao: "CALENDAR_CONSULTAR", confianca: 0.9 };
  }
  if (t.indexOf("treinei") !== -1 || t.indexOf("academia") !== -1 || (t.indexOf("medquest") !== -1 && t.indexOf("fiz") !== -1)) {
    return { intencao: "HABITO_PROATIVO", confianca: 0.9 };
  }
  var culinaria = /(bolo|culinar|comida|jantar|almo[çc]o|janta|frango|prato|ingrediente|air\s*fryer|marmita|molho|torta|massa\s+de)/.test(tn);
  var ehRxIntencao =
    /(?:prescrev|passar\s+receita|medicamento\s+pr?[ao]|rem[eé]dio\s+pr?[ao]|dose\s+d[aeo]|posologia\s+d[aeo]|como\s+prescrever)/.test(tn) ||
    (/(?:passa|passar|inicia|iniciar)\b.*(?:\d+\s*(?:mg|mcg|g|ml|gotas|ui)|comprimido|ampola|xarope|gotas|pomada|cp\b)/i.test(texto) && !culinaria) ||
    ((/\breceita\b/.test(tn) || /^\s*rx\b/i.test(texto)) && !culinaria) ||
    (/(?:\d+\s*(?:mg|mcg|g|ml|gotas|ui))\b.*(?:de\s*\d+\s*em\s*\d+\s*(?:horas?|h)?|[0-9]+\s*[\/x]\s*[0-9]+\s*h?|\d+\s*x(?:\s*ao)?\s*dia|uma\s+vez\s+ao\s+dia|se\s+dor|se\s+febre|se\s+necess[aá]rio|\bsn\b|\bem\s+jejum\b)/i.test(texto) && !culinaria);
  if (ehRxIntencao) {
    return { intencao: "CLINICO_RX", confianca: 0.9 };
  }
  if (/\b(?:gaso|gasometria)\b/i.test(t) || (t.indexOf("ph") !== -1 && (t.indexOf("pco2") !== -1 || t.indexOf("hco3") !== -1 || t.indexOf("bicarb") !== -1 || /\bbic\b/.test(tn)))) {
    return { intencao: "CLINICO_GASO", confianca: 0.95 };
  }
  if ((t.indexOf("dúvida") !== -1 || t.indexOf("duvida") !== -1) && (t.indexOf("medquest") !== -1 || t.indexOf("notion") !== -1 || t.indexOf("card") !== -1 || t.indexOf("flashcard") !== -1)) {
    return { intencao: "NOTION_DUVIDA", confianca: 0.85 };
  }
  if (/(?:evid[êe]ncia|pubmed|artigos?\s+(?:sobre|de)|estudos?\s+(?:sobre|de)|meta-an[áa]lise|ensaios?\s+cl[íi]nicos?)/i.test(t)) {
    return { intencao: "EVIDENCIA_MEDICA", confianca: 0.95 };
  }
  var matchLeitoDirect = texto.match(/^(?:leito|quarto)\s*[:#]?\s*([a-zA-Z0-9_-]{1,24})\b/i);
  if (matchLeitoDirect) {
    return { intencao: "ENFERMARIA_EVOLUCAO", confianca: 0.98, leito: matchLeitoDirect[1] };
  }
  if (t.indexOf("leito") !== -1 && (t.indexOf("enfermaria") !== -1 || t.indexOf("evolu") !== -1)) {
    return { intencao: "ENFERMARIA", confianca: 0.85 };
  }
  // Relato clínico de paciente (Anamnese / SOAP em linguagem natural falada ou escrita)
  var ehRelatoClinico =
    // Abreviações médicas e introduções formais com ou sem demografia (ex: pcte 45a, paciente masc 60 anos, pcte com dor)
    /(?:pcte|paciente)\b\s*[,]?\s*(?:do\s+sexo\s+)?(?:masculino|feminino|masc|fem|homem|mulher|idos[oa]|jovem|crian[çc]a|adult[oa]|rn|lactente)?\s*[,]?\s*(?:de\s*)?\d+\s*(?:anos?|a|meses?|m)\b/i.test(t) ||
    /(?:pcte|paciente)\b\s+(?:com|refere|relata|apresenta|em|de|que|trazido|encaminhado|admitido|internado|procurou|chega)/i.test(t) ||
    /(?:chega\s+ao\s+pronto|procurou\s+(?:o\s+)?(?:pronto|upa|ps|posto|ambulat[oó]rio)|atendido\s+no\s+(?:pronto|upa|ps)|encaminhado\s+ao)/i.test(t) ||
    // Perfil demográfico clínico: (homem/mulher/idoso/idosa/criança/lactente/rn) associado a idade (ex: 45 anos, 60a, 8 meses)
    /(?:homem|mulher|idos[oa]|crian[çc]a|lactente|rec[eé]m[- ]nascido|rn)\s*(?:de\s*)?\d+\s*(?:anos?|a|meses?|m)\b/i.test(t) ||
    // Início formal semiológico: QP / HDA / Queixa principal / Quadro de / História clínica / Exame físico
    /\b(?:qp|hda|queixa principal|hist[oó]ria da doen[çc]a atual|hist[oó]ria cl[íi]nica|hist[oó]ria de|quadro de|quadro cl[íi]nico de|exame f[íi]sico|hip[oó]tese diagn[oó]stica|hd)\s*[:=]?/i.test(t) ||
    // Sintoma cardinal associado a evolução temporal semiológica (ex: dor há 3 dias, febre desde ontem)
    /(?:dor|febre|tosse|dispneia|falta\s+de\s+ar|cefaleia|diarreia|v[oó]mitos?|tontura|s[ií]ncope|fraqueza|palpita[çc][oõ]es?|n[aá]useas?|edema|icter[ií]cia)\b.*\b(?:h[aá]\s+\d+|desde\s+(?:ontem|anteontem|\d+)|iniciou\s+(?:h[aá]|com|ap[oó]s)|com\s+piora\s+(?:progressiva|h[aá])|associad[ao]\s+a)/i.test(t) ||
    // Sinais vitais combinados ou achados de exame físico clássicos (ex: PA 130x80, FC 90, afebril, Glasgow 15)
    (/(?:\bpa\s*\d{2,3}\s*[x\/]\s*\d{2,3}\b|\bfc\s*\d{2,3}\s*(?:bpm)?\b|\bfr\s*\d{1,2}\s*(?:irpm)?\b|\btax\s*\d{2}(?:[.,]\d)?\s*°?c?\b|\bglasgow\s*\d{1,2}\b)/i.test(t) &&
     /(?:dor|febre|tosse|dispneia|cefaleia|v[oó]mito|diarreia|abdome|murm[uú]rio|rcr|edema|afebril|corado|hidratado|orientado|consciente|leucocitose)/i.test(t));

  if (ehRelatoClinico) {
    return { intencao: "CLINICO_SOAP", confianca: 0.95 };
  }

  // Dúvidas clínicas diretas — perguntas formuladas sobre dose, tratamento, conduta,
  // diagnóstico, fisiopatologia, etc. que hoje caem desnecessariamente no LLM classificador.
  // Cobertura: "qual a dose de X?", "como tratar Y?", "diferença entre X e Y",
  // "o que é síndrome Z?", "quando indicar cirurgia?", "explique a fisiopatologia de..."
  var ehDuvidaClinicaDireta =
    // Perguntas interrogativas diretas com termos médicos
    /^(?:qual|quais|como|quando|por\s*qu[eê]|explique?|defina|resuma|diferencie|compare|cite|liste|descreva|o\s+que\s+[eé])\s/i.test(t) &&
    /(?:dose|posologia|tratamento|conduta|esquema|antibiótico|antibi[oó]tico|diagn[oó]stico|etiologia|fisiopatologia|complica[çc]|progn[oó]stico|indica[çc]|contraindica[çc]|mecanismo|farmacologia|s[ií]ndrome|patologia|semiologia|classifica[çc]|estadiamento|crit[eé]rio|escala|escore|rastreio|profilaxia|vacina|cirurgia|operar|internar|medicar|intubação|dreno|cateter|sonda|tratar|manejar|abordar|investigar|diagnosticar|prevenir|rastrear)/i.test(t) ||
    // "diferença entre X e Y" / "qual a diferença entre" (dúvida acadêmica)
    /\bdiferen[çc]a\s+entre\b/i.test(t) &&
    /(?:choque|sepse|s[ií]ndrome|infec[çc]|les[aã]o|tumor|tipo|classe|grau|est[aá]gio|agudo|cr[oô]nico|viral|bacterian|fúngic)/i.test(t) ||
    // "como tratar/manejar/abordar [doença]?" sem contexto de paciente real
    /^como\s+(?:tratar|manejar|abordar|investigar|diagnosticar|prevenir|rastrear)\s/i.test(t) &&
    !/(?:paciente|pcte|leito|enfermaria)\b/i.test(t) ||
    // Perguntas com "de escolha", "de primeira linha", "padrão-ouro", "gold standard"
    /(?:de\s+escolha|primeira\s+linha|segunda\s+linha|padr[aã]o[- ]ouro|gold\s+standard|mais\s+indicad|mais\s+efica|melhor\s+(?:exame|tratamento|conduta|abordagem))/i.test(t) ||
    // Perguntas farmacológicas diretas: "amoxicilina para otite", "dipirona em gestante"
    /(?:para\s+(?:otite|pneumonia|itu|sinusite|faringite|meningite|sepse|asma|dpoc|hiv|tb|tuberculose|dengue|malária|celulite|erisipela))/i.test(t) &&
    /(?:dose|mg|comprimido|via\s+oral|ev|im|posologia|quanto|como\s+prescr)/i.test(t);

  if (ehDuvidaClinicaDireta) {
    return { intencao: "CONVERSA", confianca: 0.90 };
  }

  // 3) Classificador por LLM
  var promptSistema = [
    "Você é um classificador de intenções ultrarrápido para um assistente médico pessoal.",
    "Retorne EXCLUSIVAMENTE um JSON: {\"intencao\": \"CATEGORIA\", \"confianca\": 0.95, \"resumo\": \"motivo curto\"}",
    "",
    "REGRA DE SEGURANÇA ABSOLUTA: se houver QUALQUER dúvida entre uma categoria de rotina e CLINICO_EMERGENCIA, escolha CLINICO_EMERGENCIA. Falso-positivo é aceitável; falso-negativo é inaceitável.",
    "",
    "Categorias válidas:",
    "- CLINICO_EMERGENCIA: parada, PCR, choque, sepse, dor torácica, SCA/IAM, AVC agudo, rebaixamento de consciência, convulsão, hipotensão, dessaturação, sangramento grave, anafilaxia, intoxicação, intubação/IOT/SRI, DVA/noradrenalina, dose de ataque, sala vermelha, pneumotórax.",
    "- PRECEPTOR_VOZ: pedidos de resposta em áudio, preceptor socrático, fone de ouvido, mensagem falada.",
    "- EVIDENCIA_MEDICA: busca de artigos, evidência, ensaios clínicos, PubMed.",
    "- CLINICO_SOAP: relato de caso, anamnese, história clínica, exame físico (sem instabilidade).",
    "- CLINICO_RX: pedido de prescrição médica, receita médica, remédio para sintomas ou patologia.",
    "- CLINICO_GASO: valores gasométricos (pH, pCO2, HCO3, Na, Cl).",
    "- ENFERMARIA: evolução ou passagem de plantão de paciente internado em leito de enfermaria.",
    "- CALENDAR_CRIAR: marcar compromisso, plantão, consulta na agenda.",
    "- CALENDAR_CONSULTAR: perguntas sobre agenda/compromissos.",
    "- NOTION_TASK: tarefas ou lembretes executivos.",
    "- NOTION_DUVIDA: registrar dúvida de estudo (ex: MedQuest) no Notion.",
    "- HABITO_PROATIVO: hábito cumprido (academia, MedQuest, inglês).",
    "- CONVERSA: dúvidas clínicas gerais, estudo, discussão médica ou conversa natural (sem paciente instável)."
  ].join("\n");

  var resposta = _iaExecutar(promptSistema, texto, 250, { json: true, semThinking: true, extrativo: true });
  var parsed = _iaExtrairJSON(resposta);
  if (parsed && parsed.intencao) {
    var cat = String(parsed.intencao).toUpperCase().trim();
    if (IA_INTENCOES_VALIDAS.indexOf(cat) >= 0) {
      parsed.intencao = cat;
      return parsed;
    }
    Logger.log("Classificador retornou categoria inválida: " + parsed.intencao);
  } else if (resposta) {
    Logger.log("Erro no parsing do classificador de intenção");
  }
  return { intencao: "CONVERSA", confianca: 0.7 };
}

// ==============================================================================
// CONVERSA CLÍNICA, VOZ E CALENDÁRIO
// ==============================================================================

function gerarRespostaConversaClinica(textoMensagem, contextoAnterior) {
  var protocoloLocal = (typeof obterProtocoloClinico !== "undefined") ? obterProtocoloClinico(textoMensagem) : null;
  var contextoProtocolo = "";
  if (protocoloLocal) {
    contextoProtocolo = "\n\nPROTOCOLO OFICIAL DE REFERÊNCIA (DIRETRIZ BRASILEIRA):\n" +
      "Patologia: " + protocoloLocal.titulo + "\n" +
      "Diretriz Brasileira: " + protocoloLocal.diretriz_brasileira + "\n" +
      "Diretriz Internacional: " + protocoloLocal.diretriz_internacional + "\n" +
      "Conduta Padronizada: " + protocoloLocal.conduta_imediata + "\n" +
      "Divergência Notável: " + protocoloLocal.divergencia + "\n\n";
  }

  var promptSistema = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO ADAPTATIVO - escolha o modo conforme a mensagem:",
    "1. EMERGÊNCIA: se descrever paciente instável ou risco de vida, aplique o modo emergência (ação prioritária na primeira linha, medicação com dose, via, preparo e velocidade, reavaliação, sem perguntas didáticas) e siga a checagem de segurança abaixo.",
    "2. DISCUSSÃO CLÍNICA: hipótese principal, achados que a sustentam, o que não pode ser perdido, próxima decisão e o dado pendente que mudaria a conduta. Tom de preceptor: firme, técnico, acolhedor.",
    "3. PRECEPTORIA: se Wagner pedir para treinar, ou se o HISTÓRICO mostrar perguntas de preceptoria aguardando resposta, avalie a resposta dele: o que está correto, o que precisa de ajuste e por que, e aplique ao caso. Só entregue gabarito completo se ele pedir. Uma pergunta por vez.",
    "4. ROTINA / VIDA PESSOAL / ESTUDO: assertivo, executivo e proativo; resultado e próximo passo primeiro. Conversa simples dispensa estrutura.",
    "",
    "EMBASAMENTO:",
    "- Priorize diretrizes brasileiras oficiais (SBC, SBPT, SBD, ILAS, AMIB, Conitec/PCDT, CFM, AMB). Diretrizes internacionais (AHA/ACC, ESC, SSC, GOLD, GINA) só quando mudarem a conduta.",
    "- Cite sociedade e ano apenas quando tiver certeza; senão diga 'conferir versão vigente'. Se não tiver base sólida, diga que não sabe.",
    "- Para ensaios clínicos e artigos, oriente: /evidencia <tema>.",
    "",
    IA_DIRETRIZES_EMERGENCIA, "",
    IA_SEGURANCA_MEDICAMENTOSA
  ].join("\n");

  var promptUsuario = contextoProtocolo + textoMensagem;
  if (contextoAnterior) {
    promptUsuario = "HISTÓRICO RECENTE DA CONVERSA:\n" + contextoAnterior + "\n\nNOVA MENSAGEM DE WAGNER:\n" + contextoProtocolo + textoMensagem;
  }
  return _iaFinalizarTexto(executarRaciocinioClinico(promptSistema, promptUsuario, 1800));
}

/**
 * Fala curta para áudio (TTS). Retorna texto limpo, sem markdown.
 */
function gerarProvocacaoPreceptorAudio(casoOuDuvida) {
  var promptSistema = [
    "Você é um preceptor experiente de clínica médica e emergência falando no fone de ouvido de Wagner durante o plantão.",
    "Gere uma fala concisa, firme e instigante, de 30 a 50 palavras, para ser lida em voz alta.",
    "REGRAS:",
    "1. Texto corrido, SEM tópicos, SEM markdown, SEM asteriscos, SEM emojis, SEM URLs.",
    "2. Emergência (ex: pneumotórax, choque, PCR): diga PRIMEIRO a ação prioritária imediata; só depois, uma pergunta curta de checagem.",
    "3. Caso clínico: aponte o achado semiológico discriminante ou o critério de gravidade mais crítico e termine com UMA pergunta de raciocínio.",
    "4. Nunca invente dados do paciente. Não use LaTeX. Termine sempre com frase completa.",
    "5. Você não é o médico responsável: em risco de vida, reforce acionar a equipe/preceptor."
  ].join("\n");
  var r = executarRaciocinioClinico(promptSistema, casoOuDuvida, 250);
  return r ? _iaTextoFalado(r) : r;
}

/**
 * Diálogo socrático contínuo com o Preceptor: avalia a resposta de Wagner à pergunta anterior
 * e propõe o próximo desafio ou conduta clínica. Retorna texto limpo para áudio/TTS.
 */
function gerarDialogoPreceptorSocratico(casoBase, perguntaAnterior, respostaWagner, historicoAnterior) {
  var promptSistema = [
    "Você é um preceptor experiente de clínica médica e emergência falando no fone de ouvido de Wagner durante o plantão.",
    "Wagner acabou de responder a uma pergunta ou provocação que você fez a ele durante a discussão do caso.",
    "",
    "SUA MISSÃO COMO PRECEPTOR SOCRÁTICO:",
    "1. AVALIE A RESPOSTA DE WAGNER:",
    "   - Valide claramente o que estiver correto com precisão médica (ex: hipótese correta, achado semiológico, escore de gravidade).",
    "   - Se houver equívoco, imprecisão ou risco de segurança, aponte com firmeza didática o porquê e corrija o raciocínio.",
    "2. CONECTE À CONDUTA E FAÇA A PRÓXIMA PERGUNTA:",
    "   - Relacione a resposta à fisiopatologia, ao diagnóstico diferencial ou à conduta prática imediata.",
    "   - Formule UMA ÚNICA nova pergunta socrática clinicamente discriminante (investigação, exame confirmatório, estratificação de risco ou conduta terapêutica).",
    "3. REGRAS E FORMATO PARA FALA / ÁUDIO:",
    "   - Texto corrido, natural para leitura em voz alta, de 40 a 70 palavras.",
    "   - SEM tópicos, SEM markdown, SEM asteriscos, SEM emojis, SEM URLs, SEM introduções vazias.",
    "   - Termine com frase completa e UMA pergunta direta.",
    "   - Diretrizes brasileiras vigentes como base (SBC, SBPT, SBD, AMIB, Conitec).",
    "   - Nunca invente dados do paciente."
  ].join("\n");

  var partesUsuario = [];
  if (casoBase) partesUsuario.push("CASO CLÍNICO DE BASE:\n" + casoBase);
  if (historicoAnterior && historicoAnterior.length) {
    partesUsuario.push("HISTÓRICO RECENTE DA DISCUSSÃO:\n" + historicoAnterior);
  }
  if (perguntaAnterior) partesUsuario.push("SUA ÚLTIMA PERGUNTA A WAGNER:\n" + perguntaAnterior);
  partesUsuario.push("RESPOSTA DE WAGNER:\n" + respostaWagner);

  var r = executarRaciocinioClinico(promptSistema, partesUsuario.join("\n\n"), 350);
  return r ? _iaTextoFalado(r) : r;
}

function extrairDadosEventoCalendario(textoMensagem, agoraDataRef) {
  var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
  var ref = agoraDataRef || new Date();
  var dataRefISO = Utilities.formatDate(ref, tz, "yyyy-MM-dd");
  var horaRefStr = Utilities.formatDate(ref, tz, "HH:mm");
  var diaSemana = obterDiaSemanaExtenso(ref);

  var promptSistema = [
    "Você é um extrator de compromissos para o Google Calendar.",
    "Data e hora de referência: " + dataRefISO + " (" + diaSemana + ") às " + horaRefStr + " (fuso: " + tz + ").",
    "",
    "Retorne EXCLUSIVAMENTE um JSON, sem texto extra:",
    "{",
    "  \"titulo\": \"Nome do Evento\",",
    "  \"dataInicio\": \"YYYY-MM-DDTHH:mm:ss\",",
    "  \"dataFim\": \"YYYY-MM-DDTHH:mm:ss\",",
    "  \"local\": \"Local ou vazio\",",
    "  \"descricao\": \"Observações relevantes\"",
    "}",
    "",
    "Regras:",
    "1. Interprete 'amanhã', 'depois de amanhã', dias da semana e datas explícitas a partir da referência.",
    "2. Sem hora de término, assuma 1 hora após o início.",
    "3. Plantão (ex: 'plantão de 12h das 07h às 19h'): duração exata informada; se terminar no dia seguinte, ajuste a data de fim.",
    "4. Datas em ISO 8601 local, sem sufixo Z.",
    "5. Se não houver data ou hora identificável, use null em dataInicio e dataFim. Nunca invente."
  ].join("\n");

  var resposta = _iaExecutar(promptSistema, "PEDIDO:\n" + textoMensagem, 600, { json: true, semThinking: true, extrativo: true });
  var obj = _iaExtrairJSON(resposta);
  if (!obj) {
    if (resposta) Logger.log("Erro no parsing do extrator de evento");
    return null;
  }
  var reISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
  if (!obj.dataInicio || !reISO.test(String(obj.dataInicio))) {
    Logger.log("Extrator de evento: dataInicio inválida");
    return null;
  }
  if (!obj.dataFim || !reISO.test(String(obj.dataFim))) {
    var d = new Date(String(obj.dataInicio).replace("T", " ").replace(/-/g, "/"));
    d.setHours(d.getHours() + 1);
    obj.dataFim = Utilities.formatDate(d, tz, "yyyy-MM-dd'T'HH:mm:ss");
  }
  return obj;
}

function gerarCriticaSocraticaPreceptor(casoOuLeitoTexto) {
  var promptSistema = [
    "Você é um preceptor experiente de clínica médica fazendo uma sabatina à beira do leito com um interno.",
    "Com base no caso informado, formule UMA ÚNICA pergunta clinicamente discriminante que teste raciocínio diagnóstico ou decisão de conduta em situação de risco. A pergunta deve exigir que o interno justifique a decisão, sem pegadinha e sem depender de detalhe não informado.",
    "REGRAS:",
    "1. Uma ou duas frases completas, terminando em interrogação (?).",
    "2. Sem introdução, saudação, gabarito ou rodeios. Comece direto na pergunta.",
    "3. Não invente dados do paciente. Não use LaTeX nem markdown. Português do Brasil natural.",
    "4. Se o caso descrever instabilidade, a pergunta deve focar a prioridade imediata de segurança."
  ].join("\n");
  var res = executarRaciocinioClinico(promptSistema, "CASO CLÍNICO:\n" + casoOuLeitoTexto, 400);
  if (res) {
    var limpo = _iaTextoFalado(res);
    if (/\?\s*$/.test(limpo)) return limpo;
    Logger.log("Crítica socrática incompleta; usando pergunta padrão");
  }
  return "Wagner, qual o principal risco de descompensação aguda desse paciente nas próximas duas horas e qual a sua conduta imediata?";
}

/**
 * Geração de Áudio Direta em Modo Rápido (Single-Pass Voice Generation)
 * Emite a fala do Preceptor Socrático diretamente em áudio (WAV) em uma única requisição ao Gemini 2.0 Flash.
 * Corta pela metade a latência de geração, eliminando a chamada intermediária de geração de texto.
 */
function gerarAudioPreceptorDireto(casoOuDuvida, opcoes) {
  opcoes = opcoes || {};
  var textoCaso = String(casoOuDuvida || "").trim();
  if (!textoCaso) return null;

  var textoProvocacao = gerarProvocacaoPreceptorAudio(textoCaso);
  if (!textoProvocacao) return null;

  var blobAudio = sintetizarVozPreceptor(textoProvocacao);
  if (!blobAudio) return null;

  return {
    audioBlob: blobAudio,
    texto: textoProvocacao,
    direto: true
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    executarRaciocinioClinico: executarRaciocinioClinico,
    chamarGroqAPI: chamarGroqAPI,
    chamarOpenRouterAPI: chamarOpenRouterAPI,
    chamarZaiAPI: chamarZaiAPI,
    chamarGeminiPool: chamarGeminiPool,
    chamarGeminiPoolComGrounding: chamarGeminiPoolComGrounding,
    chamarGeminiPoolMultimodal: chamarGeminiPoolMultimodal,
    gerarSOAPComIA: gerarSOAPComIA,
    gerarPrescricaoComIA: gerarPrescricaoComIA,
    gerarPassagemPlantaoSBAR: gerarPassagemPlantaoSBAR,
    gerarPitchERoundComIA: gerarPitchERoundComIA,
    processarCalculadoraClinicaComIA: processarCalculadoraClinicaComIA,
    verificarInteracaoComIA: verificarInteracaoComIA,
    gerarAnaliseGasometriaComIA: gerarAnaliseGasometriaComIA,
    gerarCondutaEmergenciaComIA: gerarCondutaEmergenciaComIA,
    classificarIntencaoMensagem: classificarIntencaoMensagem,
    gerarRespostaConversaClinica: gerarRespostaConversaClinica,
    gerarProvocacaoPreceptorAudio: gerarProvocacaoPreceptorAudio,
    gerarDialogoPreceptorSocratico: gerarDialogoPreceptorSocratico,
    extrairDadosEventoCalendario: extrairDadosEventoCalendario,
    gerarCriticaSocraticaPreceptor: gerarCriticaSocraticaPreceptor,
    gerarAudioPreceptorDireto: gerarAudioPreceptorDireto,
    gerarGuiaExameFisicoEspecial: gerarGuiaExameFisicoEspecial,
    processarAudioClinicoMultimodal: processarAudioClinicoMultimodal,
    analisarImagemMedicaComIA: analisarImagemMedicaComIA
  };
}
