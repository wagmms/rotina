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
  GROQ: ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.3-70b-versatile"],
  OPENROUTER: ["openrouter/free"],
  ZAI: ["glm-4.7-flash", "glm-4.5-flash"],
  GEMINI: ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-flash-latest"],
  GEMINI_GROUNDING: ["gemini-3.8-flash", "gemini-3.5-flash"]
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
    return padrao;
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
  var t = String(texto).replace(/\r\n/g, "\n");
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
        _iaLog(ctx, cfg.rotulo + ": credencial recusada (" + code + ")");
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

function _iaProvGemini(sistema, prompt, tokens, ctx, opcoes) {
  opcoes = opcoes || {};
  var chaves = ConfigService.getArray("GEMINI_API_KEYS");
  chaves = (chaves || []).map(function (c) { return String(c).trim(); }).filter(function (c) { return c; });
  if (chaves.length === 0) return null;

  var modelos = opcoes.modelos || _iaLista("IA_MODELOS_GEMINI", IA_PADROES.GEMINI);
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
      var payload = {
        systemInstruction: { parts: [{ text: instrucao }] },
        contents: [{ role: "user", parts: partesUsuario }],
        generationConfig: { temperature: 0.2, maxOutputTokens: _iaTokensEfetivos(tokens) }
      };
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
            return { texto: texto, truncado: truncado, modelo: modelo };
          }
          if (truncado) return { texto: "", truncado: true, modelo: modelo };
          _iaLog(ctx, "GEMINI " + modelo + ": sem texto (finishReason=" + (cand ? cand.finishReason : "n/d") + ")");
          break;
        } else if (code === 429) {
          _iaLog(ctx, "GEMINI " + modelo + ": 429 na chave #" + idx + ", rotacionando");
          continue;
        } else if (code === 500 || code === 502 || code === 503 || code === 504) {
          todas429 = false;
          if (!tentou5xx) {
            tentou5xx = true;
            _iaLog(ctx, "GEMINI " + modelo + ": " + code + ", repetindo uma vez");
            _iaEsperar(res, 1500, 700);
            j--;
            continue;
          }
          break;
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
  var padrao = String(_iaCfg("PROVEDOR_TEXTO_PADRAO", "GROQ")).toUpperCase();
  var canonica = ["GROQ", "OPENROUTER", "ZAI", "GEMINI"];
  var ordem = canonica.indexOf(padrao) >= 0 ? [padrao] : [];
  canonica.forEach(function (p) { if (ordem.indexOf(p) < 0) ordem.push(p); });
  return ordem;
}

function _iaChamarProvedor(nome, sistema, prompt, tokens, ctx) {
  if (nome === "GROQ") return _iaProvGroq(sistema, prompt, tokens, ctx);
  if (nome === "OPENROUTER") return _iaProvOpenRouter(sistema, prompt, tokens, ctx);
  if (nome === "ZAI") return _iaProvZai(sistema, prompt, tokens, ctx);
  if (nome === "GEMINI") return _iaProvGemini(sistema, prompt, tokens, ctx);
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
    var chamar = function (t) { return _iaChamarProvedor(nome, sistema, promptUsuario, t, ctx); };
    var r;
    try {
      r = chamar(tokens);
      r = _iaResolverTruncamento(chamar, tokens, r, ctx, opcoes.json);
    } catch (e) {
      _iaLog(ctx, nome + " falhou: " + e.message);
      continue;
    }
    if (r && r.texto && String(r.texto).trim()) {
      _iaLog(ctx, "OK via " + nome + " (" + r.modelo + ") em " + (new Date().getTime() - ctx.inicio) + " ms");
      return opcoes.json ? r.texto : _iaRemoverLatex(r.texto);
    }
  }
  _iaLog(ctx, "TODOS OS PROVEDORES FALHARAM");
  return null;
}

function _iaPublico(chamarInterno, tokensPadrao, maxTokens) {
  var tokens = Number(maxTokens) || tokensPadrao;
  var ctx = _iaNovoCtx();
  var chamar = function (t) { return chamarInterno(t, ctx); };
  var r = _iaResolverTruncamento(chamar, tokens, chamar(tokens), ctx, false);
  return (r && r.texto) ? _iaRemoverLatex(r.texto) : null;
}

// ==============================================================================
// FUNÇÕES EXPORTADAS - MOTORES
// ==============================================================================

function executarRaciocinioClinico(sistema, promptUsuario, maxTokens) {
  return _iaExecutar(sistema, promptUsuario, maxTokens, {});
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
  }, 2500, maxTokens);
}

function chamarGeminiPoolMultimodal(base64Data, mimeType, sistema, promptUsuario) {
  var msg = promptUsuario ? promptUsuario : "Por favor, analise a mídia anexada em detalhes.";
  var partes = [{ inlineData: { mimeType: mimeType, data: base64Data } }, { text: msg }];
  return _iaPublico(function (t, ctx) {
    return _iaProvGemini(sistema, msg, t, ctx, { partesUsuario: partes });
  }, 2500, 2500);
}

// ==============================================================================
// AUDITORIA DE SEGURANÇA MEDICAMENTOSA (segunda passada, opcional)
// ==============================================================================

function _iaAuditarRascunho(rascunho, dadosCaso, titulo) {
  if (!rascunho) return rascunho;
  var sistema = [
    "Você é um auditor de segurança medicamentosa e de conformidade com diretrizes. Receba o CASO e o RASCUNHO e liste SOMENTE problemas reais:",
    "- dose acima do máximo ou abaixo do terapêutico; falta de ajuste renal/hepático/peso/idade; alergia ou interação ignorada;",
    "- diluente, velocidade de infusão ou acesso incorretos; erro aritmético (refaça a conta); medicamento fora da lista informada;",
    "- conduta em desacordo com AHA 2025 (PCR), Surviving Sepsis Campaign (sepse) ou diretrizes brasileiras vigentes.",
    "Se não houver problema, responda exatamente: SEM ALERTAS. Caso contrário, até 5 linhas iniciadas por '- ' (sem introdução).",
    "Não use LaTeX. Não reescreva o rascunho."
  ].join("\n");
  var r = _iaExecutar(sistema, "CASO:\n" + dadosCaso + "\n\nRASCUNHO:\n" + rascunho, 600, {});
  if (!r) return rascunho;
  var limpo = String(r).trim();
  if (/^SEM ALERTAS/i.test(limpo)) return rascunho;
  return rascunho + "\n\n\uD83D\uDED1 *Alertas da auditoria automática (" + titulo + ")*\n" + _iaFinalizarTexto(limpo);
}

// ==============================================================================
// PROMPTS MÉDICOS ESPECIALIZADOS
// ==============================================================================

function gerarSOAPComIA(casoClinico) {
  var promptSistema = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO: DOCUMENTAÇÃO CLÍNICA & COPILOTO SEMIOLÓGICO. Você auxilia o médico/interno a redigir o registro SOAP para o prontuário eletrônico (e-SUS / PEP), unindo agilidade de digitação (modelo de Exame Físico padrão limpo e pronto para copiar e colar) com vigilância clínica ativa (perguntas dirigidas no Subjetivo, cobrança de itens essenciais do EF e guias de exames especiais).",
    "",
    "DIRETRIZES FUNDAMENTAIS:",
    "1. Inicie IMEDIATAMENTE pelo título '🩺 *SÍNTESE SOAP - REGISTRO CLÍNICO*'. Sem saudações nem preâmbulos.",
    "2. Estilo técnico, formal, direto e pronto para inserção em prontuário.",
    "3. INVESTIGAÇÃO ATIVA NO SUBJETIVO (S):",
    "   • Identifique as lacunas semiológicas da queixa apresentada e formule ativamente perguntas prioritárias para fechar o caso com o paciente (caracterização de sintomas, fatores de piora/melhora, sintomas associados, sinais de alarme na anamnese, dosagens de medicações, alergias e antecedentes familiares).",
    "4. ESTRATÉGIA NO EXAME FÍSICO (O):",
    "   • Modelo para Copiar e Colar: Forneça um bloco padrão de exame físico completo (Ectoscopia, Sinais Vitais, ACV, AR, Abdome, Extremidades).",
    "   • REGRA DE OURO DO MODELO COPIÁVEL: NUNCA inclua textos explicativos, sugestões ou anotações entre colchetes (como colchetes de instrução, checagem ou similares). O bloco de código deve conter texto clínico puro, limpo e direto, 100% pronto para copiar e colar no prontuário eletrônico. Se o médico descreveu algum achado patológico no caso (ex.: 'estertores crepitantes em base D', 'dor à palpação em FID', 'PA 160x100'), insira o achado real diretamente na frase; se não descreveu achados anormais, mantenha o padrão normal completo e fluído.",
    "   • Cobrança Ativa do EF Dirigido: Aponte as manobras e sinais vitais cardinais específicos daquela queixa que NÃO foram descritos e que são essenciais para tomada de decisão (ex: sinais peritoneais, estase jugular, SpO2).",
    "   • Guia de Exame Físico Especial: Se o caso envolver sintomas que exijam exame especializado (Neurológico, Psiquiátrico, Oftalmológico, Ortopédico, Otorrino, etc.), forneça o roteiro guiado focado com os passos indispensáveis.",
    "5. Na Avaliação (A): Hipótese principal com CID-10 e CIAP-2 sugestivos, diferenciais hierarquizados e sinais de alarme.",
    "6. No Plano (P): Seja prescritivo e numere as condutas (Prescrição RENAME/REMUME, Exames subsidiários, Orientações não farmacológicas, Atestados/Encaminhamentos, Retorno e critérios de emergência).",
    "",
    "ESTRUTURA OBRIGATÓRIA:",
    "🩺 *SÍNTESE SOAP - REGISTRO CLÍNICO*",
    "",
    "👤 *S - Subjetivo*",
    "- *Queixa Principal:* [Duração e sintoma guia]",
    "- *HDA:* [Cronológica, objetiva e com os dados informados]",
    "- *Histórico & Comorbidades:* [Antecedentes, cirurgias, hábitos, histórico familiar - ou 'Não informado']",
    "- *Medicamentos em Uso & Alergias:* [Doses habituais e alergias explícitas ou 'Não informado - checar obrigatoriamente']",
    "",
    "❓ *Investigação Ativa do Subjetivo (Perguntas para Fechar a Anamnese):*",
    "• [Pergunta 1 direcionada à caracterização semiológica da queixa]",
    "• [Pergunta 2 para afastar Red Flags / sinais de alarme da síndrome]",
    "• [Pergunta 3 sobre antecedentes, medicações em uso ou fatores de risco pertinentes]",
    "💡 *Dica:* Responda a qualquer uma dessas perguntas para atualizar este SOAP automaticamente.",
    "",
    "🔍 *O - Objetivo*",
    "- *Sinais Vitais & Achados Informados:* [Registrar parâmetros citados pelo médico ou indicar 'Não informados: PA __ | FC __ | FR __ | SpO2 __ | Tax __']",
    "",
    "📋 *Modelo de Exame Físico para Copiar e Colar (Prontuário / e-SUS):*",
    "```",
    "Ectoscopia: BEG, LOTE, acianótico, anictérico, afebril, eupneico em ar ambiente, hidratado, corado.",
    "Sinais Vitais: PA 120x80 mmHg | FC 76 bpm | FR 16 irpm | SpO2 98% em AA | Tax 36.5 °C.",
    "ACV: RCR em 2T, BNF, sem sopros audíveis.",
    "AR: Murmúrio vesicular universalmente audível, sem ruídos adventícios.",
    "Abdome: Plano, flácido, RHA presentes, indolor à palpação superficial e profunda, sem visceromegalias ou sinais de irritação peritoneal.",
    "Extremidades: Aquecidas, bem perfundidas (TEC < 2s), pulsos distais simétricos e amplos, sem edema ou empastamento de panturrilhas.",
    "```",
    "",
    "🎯 *Cobrança Ativa do Exame Físico Dirigido (Faltantes Críticos do Caso):*",
    "• [Manobra ou sinal semiológico essencial 1 ausente para a queixa]",
    "• [Manobra ou sinal semiológico essencial 2 ausente para a queixa]",
    "",
    "🧠 *Guia de Exame Físico Especial (Sob Medida para o Caso):*",
    "[Se queixa envolver exames especiais, inserir checklist guiado. Se não envolver, orientar: 'Para roteiros especiais detalhados, use os botões abaixo ou envie /ef.']",
    "",
    "🧠 *A - Avaliação*",
    "- *Problema Principal / Hipótese:* [...] (CID-10: [X] | CIAP-2: [Y] - sugestões)",
    "- *Diagnósticos Diferenciais:* [Do mais provável ao que não pode ser negligenciado]",
    "- *Estratificação & Comorbidades:* [...]",
    "- *⚠️ Sinais de Alarme:* [...]",
    "",
    "📋 *P - Plano*",
    "1. *Prescrição:* [Genérico/RENAME, dose, posologia, via, duração - com checagem de segurança]",
    "2. *Exames Complementares:* [Justificativa clínica]",
    "3. *Medidas Não Farmacológicas / Orientações:* [...]",
    "4. *Atestados / Encaminhamentos:* [...]",
    "5. *Seguimento & Alarme:* [Quando reavaliar e sinais para procurar emergência]",
    "",
    "🗣️ *Pitch para Passagem de Caso (30 segundos):*",
    "[2 a 3 linhas concisas com: Idade/Sexo + Queixa/Tempo + Achado principal + Hipótese e conduta]",
    "",
    IA_SEGURANCA_MEDICAMENTOSA
  ].join("\n");
  return _iaFinalizarTexto(executarRaciocinioClinico(promptSistema, "CASO CLÍNICO:\n" + casoClinico, 3000));
}

/**
 * ==============================================================================
 * BIBLIOTECA DE EXAMES FÍSICOS ESPECIAIS (ROTEIROS DETERMINÍSTICOS E COPIÁVEIS)
 * ==============================================================================
 */

function obterRoteiroPadraoNeuro() {
  return "🧠 *GUIA SEMIOLÓGICO: EXAME NEUROLÓGICO DIRIGIDO*\n\n" +
    "📌 *Checklist de Execução na Beira do Leito:*\n" +
    "1. *Consciência & Linguagem:* ECG (AO 1-4, RV 1-5, RM 1-6), pupilas (GCS-P), orientação temporoespacial, fluência e compreensão verbal.\n" +
    "2. *Pares Cranianos Cardinais:*\n" +
    "   • *II:* Acuidade visual grosseira, campos por confrontação, reflexo fotomotor.\n" +
    "   • *III, IV, VI:* Motilidade ocular extrínseca (MOE), ptose palpebral, nistagmo.\n" +
    "   • *V:* Sensibilidade da face (oftálmico, maxilar, mandibular), reflexo córneo-palpebral.\n" +
    "   • *VII:* Mímica facial (Central: poupa fronte; Periférica: acomete hemiface completa).\n" +
    "   • *VIII:* Acuidade auditiva e equilíbrio.\n" +
    "   • *IX, X:* Elevação simétrica do palato, reflexo do vômito e deglutição.\n" +
    "   • *XI:* Elevação dos ombros (trapézio) e rotação cefálica (ECM).\n" +
    "   • *XII:* Protrusão da língua (desvio aponta para o lado da lesão).\n" +
    "3. *Força Muscular & Tônus (Escala MRC 0 a 5):*\n" +
    "   • Manobras deficitárias: Mingazzini, Barré e braços estendidos (queda pronadora).\n" +
    "4. *Sensibilidade:* Tátil, térmica, dolorosa e proprioceptiva bilateralmente.\n" +
    "5. *Reflexos Profundos & Cutâneos:* Bicipital, tricipital, patelar, aquileu (2+/4+); cutâneo-plantar (Babinski ausente).\n" +
    "6. *Coordenação & Marcha:* Índex-nariz, diadococinesia, Romberg, marcha usual e em tandem.\n" +
    "7. *Sinais Meníngeos / Radiculares:* Rigidez de nuca, Kernig, Brudzinski, Lasègue.\n\n" +
    "📋 *Modelo para Copiar e Colar no Prontuário:*\n" +
    "```\n" +
    "[EXAME NEUROLÓGICO]\n" +
    "Consciência: Vigil, LOTE, ECG 15 (AO 4, RV 5, RM 6), fala fluente e compreensiva.\n" +
    "Pupilas: Isocóricas e fotorreagentes direta e consensualmente.\n" +
    "Pares Cranianos: Pares II a XII sem déficits. Mímica facial simétrica. MOE preservada sem nistagmo ou diplopia. Deglutição normal.\n" +
    "Motor: Eutrófico e eutônico. Força muscular grau 5/5 simétrica nos 4 membros. Manobras deficitárias (Mingazzini e Barré) negativas.\n" +
    "Sensibilidade: Tátil e dolorosa preservadas e simétricas nos 4 membros.\n" +
    "Reflexos: Reflexos profundos normoativos (2+/4+) e simétricos. Cutâneo-plantar em flexão bilateral (Babinski ausente).\n" +
    "Coordenação / Marcha: Índex-nariz e diadococinesia preservadas. Romberg negativo. Marcha típica, estável em tandem.\n" +
    "Sinais Meníngeos: Rigidez de nuca ausente, Kernig e Brudzinski negativos.\n" +
    "```";
}

function obterRoteiroPadraoPqu() {
  return "🧠 *GUIA SEMIOLÓGICO: EXAME DO ESTADO MENTAL (PQU)*\n\n" +
    "📌 *Checklist das 10 Funções Psíquicas Cardinais:*\n" +
    "1. *Aparência e Atitude:* Higiene, vestimentas, postura perante o examinador (colaborativo, esquivo, hostil, vigil).\n" +
    "2. *Consciência:* Vigil, alerta, sem rebaixamento, sonolência ou flutuação.\n" +
    "3. *Orientação:* Autopsíquica (identidade) e Alopsíquica (tempo, espaço, situação).\n" +
    "4. *Atenção & Memória:* Tenacidade, vigilância; memória imediata, recente e remota.\n" +
    "5. *Sensopercepção:* Presença ou ausência de ilusões ou alucinações (auditivas, visuais, táteis).\n" +
    "6. *Pensamento:*\n" +
    "   • Curso: Velocidade preservada (sem taquipsiquismo ou lentificação).\n" +
    "   • Forma: Lógica, com nexo causal, sem fuga de ideias ou afrouxamento.\n" +
    "   • Conteúdo: Sem ideação delirante (persecutória, ruína, grandeza) ou obsessiva.\n" +
    "7. *Humor & Afeto:* Humor relatado (eutímico, deprimido, ansioso); Afeto observado (modulado, congruente ao discurso).\n" +
    "8. *Ideação Suicida / Heteroagressividade (PESQUISA ATIVA OBRIGATÓRIA):* Pesquisar expressamente ideação de morte, planos ou impulsividade.\n" +
    "9. *Psicomotricidade:* Sem agitação psicomotora, catatonia, acatisia ou lentificação.\n" +
    "10. *Insight & Juízo Crítico:* Juízo de realidade mantido, consciência de morbidade presente, pragmatismo preservado.\n\n" +
    "📋 *Modelo para Copiar e Colar no Prontuário:*\n" +
    "```\n" +
    "[EXAME DO ESTADO MENTAL / PSICOPATOLÓGICO]\n" +
    "Aparência/Atitude: Higiene e vestimentas adequadas. Atitude colaborativa, contato visual estabelecido e mantido.\n" +
    "Consciência: Vigil, sem rebaixamento do nível de consciência.\n" +
    "Orientação: Orientado no tempo e no espaço, orientação autopsíquica preservada.\n" +
    "Atenção/Memória: Atenção concentrada preservada. Memórias de fixação e evocação preservadas.\n" +
    "Sensopercepção: Sem alterações perceptivas, ilusões ou alucinações no momento.\n" +
    "Pensamento: Curso com velocidade preservada, forma lógica, coerente e com nexo causal. Conteúdo sem delírios ou ruminações mórbidas.\n" +
    "Humor/Afeto: Humor eutímico, afeto congruente ao relato e com adequada modulação emocional.\n" +
    "Risco: Nega ativamente ideação de morte, planos suicidas ou heteroagressividade.\n" +
    "Psicomotricidade: Eucinético, sem agitação psicomotora, lentificação ou tiques.\n" +
    "Insight/Juízo Crítico: Juízo de realidade íntegro, insight presente e conduta pragmática mantida.\n" +
    "```";
}

function obterRoteiroPadraoOftalmo() {
  return "👁️ *GUIA SEMIOLÓGICO: EXAME OFTALMOLÓGICO AMBULATORIAL*\n\n" +
    "📌 *Checklist de Execução na Beira do Leito:*\n" +
    "1. *Acuidade Visual (O 6º Sinal Vital):* Avaliar olho direito (OD) e olho esquerdo (OE) separadamente, com correção habitual se houver. Sem tabela: contar dedos a 6m / 3m ou percepção luminosa.\n" +
    "2. *Ectoscopia & Anexos:* Pálpebras (ptose, edema, eritema), bordas ciliares (blefarite), aparelho lacrimal pérvio.\n" +
    "3. *Conjuntiva & Esclera (Diagnóstico Diferencial do Olho Vermelho):*\n" +
    "   • Hiperemia conjuntival (periférica, vasos móveis, secreção): conjuntivite superficial.\n" +
    "   • Hiperemia ciliar/pericerática (perilimbar, profunda, violácea, dor e fotofobia): ceratite, uveíte ou glaucoma agudo.\n" +
    "4. *Córnea & Câmara Anterior:*\n" +
    "   • Transparência corneana e teste com fluoresceína (pesquisa de úlcera dendrítica/traumática).\n" +
    "   • Profundidade da câmara anterior (iluminação tangencial - van Herick para risco de ângulo estreito).\n" +
    "   • Presença de hifema (sangue) ou hipópio (pus).\n" +
    "5. *Pupilas & Reflexos:* Tamanho, isocoria, reflexo fotomotor direto e consensual. Teste da lanterna oscilante para Defeito Pupilar Aferente Relativo (DPAR / Marcus Gunn).\n" +
    "6. *Motilidade Ocular Extrínseca (MOE):* Movimentos nas 6 direções cardinais; pesquisar diplopia, dor à movimentação e nistagmo.\n" +
    "7. *Palpação do Tônus & Fundoscopia:*\n" +
    "   • Palpação bidigital comparativa sobre pálpebras fechadas (olho em pedra no glaucoma agudo).\n" +
    "   • Fundoscopia: papila óptica delimitada, escavação fisiológica (≤ 0,4), calibre vascular e mácula límpida.\n\n" +
    "📋 *Modelo para Copiar e Colar no Prontuário:*\n" +
    "```\n" +
    "[EXAME OFTALMOLÓGICO]\n" +
    "Acuidade Visual: OD 20/20 | OE 20/20 (com correção habitual).\n" +
    "Ectoscopia/Anexos: Pálpebras sem ptose ou lesões inflamatórias, aparelho lacrimal pérvio.\n" +
    "Conjuntiva/Esclera: Conjuntiva clara, sem hiperemia ciliar perilimbar ou secreção purulenta.\n" +
    "Córnea/Câmara Anterior: Córnea transparente com brilho preservado, câmara anterior límpida e profunda, sem hipópio ou hifema.\n" +
    "Pupilas/Reflexos: Isocóricas e fotorreagentes direta e consensualmente. DPAR negativo.\n" +
    "Motilidade Ocular (MOE): Movimentação ocular preservada e simétrica em todas as direções, sem diplopia ou nistagmo.\n" +
    "Fundoscopia: Disco óptico nítido e róseo, escavação fisiológica preservada, emergência e trajeto vascular típicos, mácula sem lesões aparentes.\n" +
    "```";
}

function obterRoteiroPadraoOrtopo() {
  return "🦴 *GUIA SEMIOLÓGICO: EXAME MÚSCULO-ESQUELÉTICO / ORTOPÉDICO*\n\n" +
    "📌 *Checklist de Execução por Segmento Articular:*\n" +
    "1. *Coluna Vertebral:*\n" +
    "   • Inspeção (eixos fisiológicos, curvaturas) e palpação de processos espinhosos e paravertebrais.\n" +
    "   • *Lasègue / EPE:* Elevação da perna estendida a 30-70° (positivo se dor irradiada abaixo do joelho no trajeto ciático L4-S1).\n" +
    "   • *Spurling:* Compressão axial cervical com rotação (positivo se dor radicular em MMSS).\n" +
    "2. *Ombro (Manguito Rotador e Impacto):*\n" +
    "   • *Neer & Hawkins-Kennedy:* Impacto subacromial.\n" +
    "   • *Jobe:* Supraespinal (abdução 90° e pronação contra resistência).\n" +
    "   • *Patte & Gerber:* Infraespinal e subescapular.\n" +
    "   • *Speed & Yergason:* Tendíneo longo do bíceps.\n" +
    "3. *Joelho (Ligamentos & Meniscos):*\n" +
    "   • *Lachman & Gaveta Anterior/Posterior:* Ligamentos cruzados (LCA / LCP).\n" +
    "   • *Estresse em Varo/Valgo:* Ligamentos colaterais (LCL / LCM).\n" +
    "   • *McMurray & Apley:* Meniscos medial e lateral.\n" +
    "   • *Teste da Tecla / Ordenha:* Derrame articular.\n" +
    "4. *Punho e Mão:*\n" +
    "   • *Phalen & Tinel:* Síndrome do túnel do carpo (nervo mediano).\n" +
    "   • *Finkelstein:* Tenossinovite estenosante de De Quervain.\n" +
    "5. *Quadril & Sacroilíaca:*\n" +
    "   • *Patrick / FABERE:* Flexão, abdução e rotação externa (patologia de quadril vs sacroilíaca).\n" +
    "   • *Trendelenburg:* Fraqueza do glúteo médio.\n\n" +
    "📋 *Modelo para Copiar e Colar no Prontuário:*\n" +
    "```\n" +
    "[EXAME MÚSCULO-ESQUELÉTICO / ORTOPÉDICO]\n" +
    "Ectoscopia: Marcha típica sem claudicação, alinhamento articular preservado, sem atrofias, deformidades ou edema visível.\n" +
    "Coluna: Mobilidade preservada nos eixos de flexo-extensão e rotação. Indolor à palpação de processos espinhosos e paravertebrais. Lasègue negativo bilateralmente.\n" +
    "Ombros: Arcos de movimento completos (abdução, adução, rotação interna e externa). Testes de Neer, Hawkins e Jobe negativos bilateralmente.\n" +
    "Joelhos: Sem derrame articular (teste da tecla negativo). Estabilidade ligamentar preservada (Lachman e gavetas negativos). Meniscos indolores (McMurray e Apley negativos).\n" +
    "Punhos/Mãos: Força de preensão preservada, sem sinovite. Testes de Phalen e Tinel negativos bilateralmente.\n" +
    "```";
}

function obterRoteiroPadraoOrl() {
  return "👂 *GUIA SEMIOLÓGICO: EXAME OTORRINOLARINGOLÓGICO (ORL)*\n\n" +
    "📌 *Checklist de Execução na Beira do Leito:*\n" +
    "1. *Otoscopia Bilateral:*\n" +
    "   • Tracionar pavilhão póstero-superiormente no adulto (póstero-inferiormente na criança).\n" +
    "   • Conduto auditivo externo (CAE): pele, cerúmen, secreção, edema ou corpos estranhos.\n" +
    "   • Membrana timpânica (MT): integridade, translucidez, cor perlácea, triângulo luminoso e cabo do martelo.\n" +
    "2. *Rinoscopia Anterior:*\n" +
    "   • Mucosa nasal (corada vs pálida/arroxeada da rinite), hidratação.\n" +
    "   • Cornetos inferiores (trofismo, hipertrofia), septo nasal (desvio obstrutivo, perfuração, esporão), secreções.\n" +
    "3. *Oroscopia / Faringoscopia:*\n" +
    "   • Lábios, gengivas, dentes, soalho da boca e língua.\n" +
    "   • Palato mole e úvula centrada à fonação.\n" +
    "   • Amígdalas palatinas (grau de Brodsky I a IV, hiperemia, exsudato purulento, placas ou caseum).\n" +
    "   • Parede posterior da faringe (grânulos linfoides, secreção mucopurulenta descendente).\n" +
    "4. *Palpação Cervical & Linfonodos:*\n" +
    "   • Cadeias submandibulares, submentonianas, jugulocarotídeas, posteriores e supraclaviculares.\n" +
    "   • Glândula tireoide (volume, consistência fibroelástica, mobilidade à deglutição, nódulos).\n\n" +
    "📋 *Modelo para Copiar e Colar no Prontuário:*\n" +
    "```\n" +
    "[EXAME OTORRINOLARINGOLÓGICO / CABEÇA E PESCOÇO]\n" +
    "Otoscopia: Condutos auditivos externos pérvios e sem secreções. Membranas timpânicas íntegras, translúcidas e de coloração perlácea bilateralmente, com reflexo luminoso presente, sem abaulamentos.\n" +
    "Rinoscopia: Mucosa nasal corada, cornetos inferiores normotróficos, sem hipertrofia ou rinorreia purulenta, septo nasal centrado sem desvio obstrutivo.\n" +
    "Oroscopia: Mucosa jugal íntegra, língua sem lesões, úvula centrada. Faringe e amígdalas normotróficas, sem hiperemia, exsudato purulento ou ulcerações.\n" +
    "Pescoço: Sem linfonodomegalias palpáveis em cadeias cervicais ou supraclaviculares. Tireoide tópica, fibroelástica de volume normal, indolor e sem nódulos.\n" +
    "```";
}

function obterRoteiroPadraoDermato() {
  return "🔬 *GUIA SEMIOLÓGICO: EXAME DERMATOLÓGICO DIRIGIDO*\n\n" +
    "📌 *Checklist de Execução na Beira do Leito:*\n" +
    "1. *Ectoscopia Cutânea Geral:*\n" +
    "   • Fototipo de Fitzpatrick (I a VI), turgor e elasticidade (pesquisa de desidratação), hidratação, textura e temperatura.\n" +
    "2. *Caracterização das Lesões Elementares:*\n" +
    "   • Manchas/Máculas: eritematosas, purpúricas (petéquias, equimoses - não desaparecem à digitopressão), hipo ou hipercrômicas.\n" +
    "   • Sólidas: pápula (<1cm), placa (>1cm), nódulo (>1-2cm), tubérculo, vegetação.\n" +
    "   • Líquidas: vesícula (<1cm), bolha (>1cm), pústula (conteúdo purulento), abscesso.\n" +
    "   • Soluções de continuidade: erosão, escoriação, fissura, úlcera.\n" +
    "   • Caducas: crosta, escama, escara.\n" +
    "   • Sequelas: atrofia, cicatriz, liquenificação.\n" +
    "3. *Regra ABCDE para Lesões Pigmentadas:*\n" +
    "   • *A:* Assimetria de eixos.\n" +
    "   • *B:* Bordas irregulares ou denteadas.\n" +
    "   • *C:* Cor heterogênea (2 ou mais tons de castanho, preto, azul, branco ou vermelho).\n" +
    "   • *D:* Diâmetro maior que 6 mm.\n" +
    "   • *E:* Evolução (mudança rápida de tamanho, forma, cor, sangramento ou prurido).\n" +
    "4. *Fâneros:*\n" +
    "   • Cabelos e couro cabeludo (implantação, tração suave, áreas de alopecia localizada vs difusa).\n" +
    "   • Unhas (onicólise, estrias, baqueteamento digital, hemorragias em estilha).\n\n" +
    "📋 *Modelo para Copiar e Colar no Prontuário:*\n" +
    "```\n" +
    "[EXAME DERMATOLÓGICO]\n" +
    "Pele Geral: Ectoscopia cutânea com turgor e elasticidade preservados, textura habitual, hidratada, sem icterícia, palidez ou cianose.\n" +
    "Lesões Elementares: Ausência de lesões elementares primárias ou secundárias suspeitas (sem máculas patológicas, pápulas, placas, vesículas, pústulas ou ulcerações).\n" +
    "Lesões Pigmentadas: Nevos melanocíticos sem atipias clínicas pela regra ABCDE (simétricos, bordas regulares, tonalidade homogênea, diâmetro < 6mm).\n" +
    "Fâneros: Couro cabeludo íntegro, cabelos com implantação e distribuição típicas sem áreas de alopecia. Unhas translúcidas, lisas, sem estrias, onicólise ou baqueteamento digital.\n" +
    "```";
}

function obterRoteiroPadraoGineco() {
  return "🌸 *GUIA SEMIOLÓGICO: EXAME GINECOLÓGICO E OBSTÉTRICO*\n\n" +
    "📌 *Checklist de Execução na Beira do Leito:*\n" +
    "1. *Exame das Mamas:*\n" +
    "   • Inspeção Estática e Dinâmica: simetria, abaulamentos, retrações cutâneas, pele em casca de laranja (peau d'orange), inversão mamilar recente.\n" +
    "   • Palpação: técnica espiral ou por quadrantes com polpas digitais, prolongamento axilar; expressão papilar delicada (descarga espontânea/induzida).\n" +
    "   • Linfonodos: axilares (centrais, peitorais, subescapulares) e fossas supraclaviculares.\n" +
    "2. *Genitália Externa:*\n" +
    "   • Monte de Vênus, grandes e pequenos lábios, clitóris, óstio uretral e fúrcula vaginal (úlceras, condilomas, cistos de Bartholin, distopias).\n" +
    "3. *Exame Especular:*\n" +
    "   • Paredes vaginais (coloração, trofismo, rugosidades).\n" +
    "   • Conteúdo vaginal: aspecto, cor, odor e grumos.\n" +
    "   • Colo uterino: orifício externo, zona de transformação, ectopias, lesões polipoides, sangramentos ou secreções mucopurulentas cervicais.\n" +
    "4. *Toque Vaginal Bimanual:*\n" +
    "   • Colo: consistência (elástica), mobilidade e ausência de dor à lateralização (sinal de Chandelier/Frenkel ausente na DIP).\n" +
    "   • Útero: posição (AVF/RVF), tamanho, consistência, contornos e mobilidade.\n" +
    "   • Anexos: palpação bimanual em fossas ilíacas (dor ou massas anexiais).\n" +
    "5. *Exame Obstétrico (se gestante):*\n" +
    "   • Altura Uterina (AU), manobras de Leopold (situação, apresentação, dorso), Batimentos Cardiofetais (BCF com sonar Doppler) e Dinâmica Uterina.\n\n" +
    "📋 *Modelo para Copiar e Colar no Prontuário:*\n" +
    "```\n" +
    "[EXAME GINECOLÓGICO]\n" +
    "Mamas: Mamas simétricas, sem retrações cutâneas ou abaulamentos na inspeção estática e dinâmica. Palpação mamária e de prolongamentos axilares sem nódulos palpáveis bilateralmente. Expressão papilar negativa para descarga patológica. Linfonodos axilares e supraclaviculares impalpáveis.\n" +
    "Genitália Externa: Trofismo vulvar preservado, sem lesões elementares, úlceras, verrugas ou distopias genitais aparentes.\n" +
    "Exame Especular: Conteúdo vaginal fisiológico de aspecto habitual, sem odor. Paredes vaginais íntegras e coradas. Colo uterino epitelizado, orifício externo pérvio/fechado, sem ectopias, lesões vegetantes ou sangramentos.\n" +
    "Toque Bimanual: Colo indolor à lateralização e mobilização. Útero em anteversoflexão (AVF), consistência e tamanho fisiológicos, móvel e indolor. Regiões anexiais livres e indolores.\n" +
    "```";
}

function obterRoteiroPadraoProcto() {
  return "🩺 *GUIA SEMIOLÓGICO: EXAME UROLÓGICO E PROCTOLÓGICO*\n\n" +
    "📌 *Checklist de Execução na Beira do Leito:*\n" +
    "1. *Genitália Masculina:*\n" +
    "   • Pênis: inspeção do prepúcio, glande e meato uretral (úlceras, verrugas, secreção uretral).\n" +
    "   • Bolsa Escrotal: testículos tópicos, tamanho, consistência, mobilidade e dor; epidídimo; transiluminação se hidrocele.\n" +
    "   • Regiões Inguinais: anel inguinal superficial, pesquisa de hérnias diretas/indiretas com manobra de Valsalva em ortostase.\n" +
    "2. *Inspeção Perianal:*\n" +
    "   • Posicionamento: decúbito lateral esquerdo com flexão de quadris (Sims) ou genupeitoral.\n" +
    "   • Afastamento de nádegas: fissuras anais, fístulas, plicomas sentinela, hemorroidas externas trombosadas, condilomas, secreção.\n" +
    "3. *Toque Retal:*\n" +
    "   • Lubrificação abundante, apoio do indicador na borda anal e introdução suave com relaxamento do paciente.\n" +
    "   • Tônus esfincteriano: tônus basal em repouso e tônus voluntário (solicitar contração anal).\n" +
    "   • Ampola retal: fezes pastosas, massas endoluminais parietais, pólipos ou estenoses.\n" +
    "   • Próstata (parede anterior retal): consistência fibroelástica (cartilaginosa), volume estimado, limites laterais e cranial nítidos, sulco mediano preservado, simetria dos lobos, indolor à palpação, ausência de nódulos pétreos endurecidos.\n" +
    "   • Retirada do dedo: inspeção da luva (fezes normais, sangue vivo, melena ou muco purulento).\n\n" +
    "📋 *Modelo para Copiar e Colar no Prontuário:*\n" +
    "```\n" +
    "[EXAME UROLÓGICO E PROCTOLÓGICO]\n" +
    "Genitália Masculina: Pênis sem lesões ulceradas, meato uretral tópico e pérvio sem secreção. Testículos tópicos na bolsa escrotal, móveis e indolores à palpação. Regiões inguinais sem hérnias palpáveis.\n" +
    "Inspeção Perianal: Região perianal sem fissuras, fístulas, orifícios drenantes, plicomas dolorosos ou sinais de trombose hemorroidária.\n" +
    "Toque Retal: Tônus esfincteriano anal preservado em repouso e sob contração. Ampola retal vazia e sem massas luminais palpáveis. Próstata de consistência fibroelástica, limites bem definidos, sulco mediano preservado, simétrica, indolor, sem nódulos pétreos. Luva de exame com resíduo fecal fisiológico, sem sangue vivo ou melena.\n" +
    "```";
}

function obterRoteiroPadraoPed() {
  return "👶 *GUIA SEMIOLÓGICO: EXAME FÍSICO PEDIÁTRICO*\n\n" +
    "📌 *Checklist de Execução da Criança e Lactente:*\n" +
    "1. *Ectoscopia Pediátrica:*\n" +
    "   • Estado geral, nível de alerta, consolabilidade, choro, padrão respiratório e interação com os pais.\n" +
    "2. *Crânio e Fácies:*\n" +
    "   • Fontanela anterior (plana e normotensa; fontanela deprimida = desidratação; abaulada = hipertensão intracraniana), fontanela posterior, perímetro cefálico (PC).\n" +
    "3. *Oroscopia e Otoscopia:*\n" +
    "   • Realizar preferencialmente ao final do exame para manter colaboração da criança.\n" +
    "   • Dentição, mucosa jugal (sem monilíase oral / sapinho), amígdalas; MTs perláceas sem abaulamento.\n" +
    "4. *Aparelhos Respiratório & Cardiovascular:*\n" +
    "   • Frequência respiratória contada em 1 minuto completo com abdome descoberto.\n" +
    "   • Sinais de esforço respiratório: batimento de asa de nariz, tiragem subcostal/intercostal, retração de fúrcula, gemência.\n" +
    "   • Ausculta cardíaca e palpação obrigatória de pulsos femorais (afastar coarctação de aorta).\n" +
    "5. *Abdome & Quadris:*\n" +
    "   • Palpação suave com pernas fletidas; fígado a 1-2 cm do RCD é fisiológico no lactente.\n" +
    "   • Manobras de Ortolani (abdução com redução) e Barlow (adução com luxação) no primeiro ano de vida.\n" +
    "6. *Desenvolvimento Neuropsicomotor (DNPM):*\n" +
    "   • Sustentação cefálica (3m), sentar sem apoio (6m), pinça digital (9m), marcha independente (12-15m).\n\n" +
    "📋 *Modelo para Copiar e Colar no Prontuário:*\n" +
    "```\n" +
    "[EXAME FÍSICO PEDIÁTRICO]\n" +
    "Ectoscopia: Bom estado geral, corado, hidratado, acianótico, anictérico, ativo e reativo, choro forte e consolável, boa interação com a mãe.\n" +
    "Crânio: Fontanela anterior normotensa e plana, perímetro cefálico compatível com a idade, sem bossas ou assimetrias.\n" +
    "Oroscopia / Otoscopia: Oroscopia sem hiperemia ou placas esbranquiçadas em mucosa jugal; otoscopia bilateral com MTs íntegras e brilhantes.\n" +
    "Aparelho Respiratório: Eupneico em ar ambiente, sem tiragem subcostal, retração de fúrcula ou batimento de asa de nariz. Murmúrio vesicular presente bilateralmente, sem ruídos adventícios.\n" +
    "Aparelho Cardiovascular: Ritmo cardíaco regular em 2 tempos, bulhas normofonéticas sem sopros audíveis. Pulsos femorais e radiais cheios e simétricos.\n" +
    "Abdome: Semi-globoso, flácido, indolor à palpação, RHA presentes, sem visceromegalias patológicas ou hérnias dolorosas.\n" +
    "Membros / Quadris: Tônus muscular adequado para a idade. Manobras de Ortolani e Barlow negativas. Extremidades bem aquecidas e perfundidas (TEC < 2s).\n" +
    "```";
}

function obterRoteiroPadraoGeriatria() {
  return "👵 *GUIA SEMIOLÓGICO: AVALIAÇÃO GERIÁTRICA AMPLA (AGA)*\n\n" +
    "📌 *Checklist Multidimensional do Paciente Idoso:*\n" +
    "1. *Cognição e Humor:*\n" +
    "   • Mini-Exame do Estado Mental (MEEM) ou Teste 10-CS para rastreio cognitivo.\n" +
    "   • Escala de Depressão Geriátrica (GDS-15) para sintomas depressivos.\n" +
    "2. *Funcionalidade e Autonomia:*\n" +
    "   • Índice de Katz: Atividades Básicas de Vida Diária (banho, vestir, higiene pessoal, transferências, continência e alimentação - escore 0 a 6).\n" +
    "   • Escala de Lawton & Brody: Atividades Instrumentais de Vida Diária (telefone, compras, preparo de refeições, tarefas domésticas, medicação e finanças).\n" +
    "3. *Mobilidade, Equilíbrio & Risco de Quedas:*\n" +
    "   • *Timed Up and Go (TUG):* Levantar da cadeira, caminhar 3 metros, girar, retornar e sentar (< 10s independente; 10-20s frágil; > 20s alto risco de queda).\n" +
    "4. *Sinais Vitais Geriátricos Especiais:*\n" +
    "   • Pesquisa de hipotensão ortostática: PA e FC em decúbito dorsal e após 1 e 3 minutos em ortostase (queda de PAS ≥ 20 mmHg ou PAD ≥ 10 mmHg).\n" +
    "5. *Nutrição e Rastreio de Sarcopenia:*\n" +
    "   • Circunferência da panturrilha (< 31 cm indica perda de massa muscular).\n" +
    "   • Força de preensão palmar ou teste de sentar e levantar da cadeira 5 vezes.\n\n" +
    "📋 *Modelo para Copiar e Colar no Prontuário:*\n" +
    "```\n" +
    "[AVALIAÇÃO GERIÁTRICA AMPLA / EXAME FÍSICO DO IDOSO]\n" +
    "Estado Geral: LOTE, lúcido e orientado, sem déficit sensorial grave não corrigido, com marcha estável.\n" +
    "Cognição e Humor: MEEM com pontuação dentro da normalidade para a escolaridade; rastreio de sintomas depressivos (GDS) negativo.\n" +
    "Funcionalidade: Independente para todas as Atividades Básicas de Vida Diária (Katz 6/6) e autônomo para Atividades Instrumentais (Lawton 27/27).\n" +
    "Mobilidade e Equilíbrio: Teste Timed Up and Go (TUG) realizado em < 10 segundos, com transferências posturais seguras e sem instabilidade. Romberg negativo.\n" +
    "Hipotensão Ortostática: Pesquisa de hipotensão ortostática negativa (PA deitado e em ortostase sem queda significativa de PAS/PAD ou sintomas de tontura).\n" +
    "Nutrição e Sarcopenia: Sem perda ponderal involuntária, panturrilhas com trofismo preservado (> 31 cm), força de preensão manual preservada.\n" +
    "```";
}

function obterRoteiroPadraoVascular() {
  return "🩸 *GUIA SEMIOLÓGICO: EXAME VASCULAR PERIFÉRICO*\n\n" +
    "📌 *Checklist de Execução na Beira do Leito:*\n" +
    "1. *Inspeção de Membros Inferiores:*\n" +
    "   • Trofismo cutâneo: pele lisa, brilhante e sem pelos (isquemia crônica) vs dermatite ocre e hiperpigmentação (insuficiência venosa).\n" +
    "   • Edema: simetria e graduação do sinal do cacifo / Godet (1+ a 4+).\n" +
    "   • Varizes: trajetos venosos dilatados, cordões varicosos ou telangiectasias.\n" +
    "2. *Palpação de Pulsos Arteriais (0 a 4+ bilateral):*\n" +
    "   • Carotídeos, braquiais, radiais, femorais, poplíteos, tibiais posteriores e pediosos dorsais.\n" +
    "3. *Perfusão & Temperatura:*\n" +
    "   • Temperatura comparativa dos membros (palpação com o dorso das mãos).\n" +
    "   • Tempo de Enchimento Capilar (TEC < 2s).\n" +
    "4. *Sinais de Trombose Venosa Profunda (TVP):*\n" +
    "   • *Sinal de Homans:* Dor na panturrilha à dorsiflexão súbita e passiva do pé.\n" +
    "   • *Sinal de Bancroft / Moses:* Dor à compressão ântero-posterior da panturrilha contra a tíbia.\n" +
    "   • Empastamento muscular de panturrilhas (perda da mobilidade muscular lateral).\n" +
    "   • Medição da circunferência de panturrilhas (assimetria > 3 cm a 10 cm abaixo da tuberosidade da tíbia).\n\n" +
    "📋 *Modelo para Copiar e Colar no Prontuário:*\n" +
    "```\n" +
    "[EXAME VASCULAR PERIFÉRICO]\n" +
    "Inspeção MMII: Pele com trofismo e coloração preservados bilateralmente, sem palidez, cianose, lesões tróficas ulceradas ou dermatite ocre. Ausência de cordões varicosos tensos ou tromboflebite superficial.\n" +
    "Pulsos Periféricos: Pulsos femorais, poplíteos, tibiais posteriores e pediosos presentes, amplos (2+/2+) e simétricos bilateralmente.\n" +
    "Perfusão e Temperatura: Extremidades aquecidas sem gradiente térmico distal. Tempo de enchimento capilar (TEC) < 2 segundos em pododáctilos.\n" +
    "Sistema Venoso / TVP: Ausência de edema de membros inferiores (sinal do cacifo negativo). Panturrilhas livres, simétricas à biometria, sem empastamento muscular. Sinais de Homans e Bancroft negativos bilateralmente.\n" +
    "```";
}

function obterCatalogoTodosExamesEspeciais() {
  return "🩺 *CATÁLOGO DE EXAMES FÍSICOS ESPECIAIS (COPILOTO CLÍNICO)*\n\n" +
    "Selecione uma especialidade ou digite o comando correspondente para ver o checklist guiado e o modelo pronto para copiar no prontuário:\n\n" +
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
    "💡 *Dica:* Se você já tiver enviado um caso clínico no chat, os guias acima adaptam-se automaticamente aos sintomas do seu paciente!";
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
    return padrao;
  }

  try {
    var promptEspecial = [
      IA_PERSONA, "",
      "MODO: GUIA DE EXAME FÍSICO ESPECIAL DIRIGIDO AO CASO (" + nomeGuia.toUpperCase() + ").",
      "O médico está atendendo um paciente e solicitou o guia especializado para aprofundar o exame físico.",
      "1. Destaque os testes e manobras cruciais que NÃO podem faltar para este caso específico.",
      "2. Forneça o checklist semiológico guiado passo a passo.",
      "3. Forneça o MODELO PRONTO PARA COPIAR E COLAR NO PRONTUÁRIO. NUNCA use colchetes meta-instrucionais como '[ou achado descrito]'. Se houver achado no caso, coloque direto no texto; se não, mantenha o padrão normal limpo.",
      "4. Linguagem técnica, assertiva e formatada para leitura ágil na tela do Telegram.",
      "",
      "REFERÊNCIA PADRÃO:",
      padrao
    ].join("\n");

    var resIA = executarRaciocinioClinico(promptEspecial, "CASO CLÍNICO DO PACIENTE:\n" + contexto, 2500);
    if (resIA && resIA.length > 100) {
      return _iaFinalizarTexto(resIA);
    }
  } catch (e) {
    Logger.log("Erro ao adaptar guia especial com IA: " + e.message);
  }

  return padrao;
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
    : String(baseCompleta || "").substring(0, 12000);

  var promptSistema = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO: PRESCRIÇÃO AMBULATORIAL (RASCUNHO PARA REVISÃO). Gere prescrições precisas a partir da doença informada ou do medicamento solicitado.",
    "",
    "REGRA DE OURO (REMUME LOCAL): SÓ PRESCREVA MEDICAMENTOS E APRESENTAÇÕES QUE CONSTAM EXATAMENTE NA LISTA ABAIXO.",
    "=== LISTA DE MEDICAMENTOS DISPONÍVEIS NO MUNICÍPIO ===",
    listaMedicamentos,
    "=====================================================",
    "",
    "DIRETRIZES:",
    "1. Escolha a melhor opção clínica DENTRO da lista. Se nenhum item da lista atende com segurança, diga 'Sem alternativa adequada na REMUME' e indique a classe/fármaco ideal fora da lista como sugestão ao prescritor, sem montá-lo como receita.",
    "2. Pediatria: sem peso informado, NÃO calcule; peça o peso. Com peso, mostre sempre: dose em mg/kg/dia / número de tomadas = mg por dose = conversão exata em mL da apresentação da lista; verifique a dose máxima.",
    "3. Indique a quantidade total a dispensar, coerente com posologia e duração.",
    "4. CHECAGEM CRUZADA OBRIGATÓRIA de alergias (penicilina, sulfas, AINEs etc.), medicamentos de uso contínuo, gestação e função renal/hepática. Descarte fármacos com risco e justifique no rodapé. Dado ausente = 'Não informado', nunca 'sem alergias'.",
    "5. Formato copiável para o e-SUS.",
    "6. Não escreva que o medicamento está 'validado' ou 'em estoque': escreva apenas que o item consta na lista fornecida (conferir disponibilidade no estoque).",
    "",
    IA_SEGURANCA_MEDICAMENTOSA,
    "",
    "ESTRUTURA:",
    "\uD83D\uDC8A *PRESCRIÇÃO AMBULATORIAL - RASCUNHO (REMUME)*",
    "*Status:* [Completa para revisão / Dados pendentes: listar]",
    "",
    "\uD83D\uDCDD *Receituário*",
    "*[USO ORAL / TÓPICO / INALATÓRIO]*",
    "1. *Nome genérico (DCI)* - [concentração da lista] - [quantidade a dispensar]",
    "- *Posologia:* tomar [dose] por [via] de [X] em [X] horas por [Y] dias.",
    "",
    "\uD83D\uDCA1 *Orientações ao paciente*",
    "- [uso com/sem alimento, sinais de alerta, quando retornar]",
    "",
    "\uD83D\uDCCB *Conferência médica*",
    "- *Indicação:* [...]",
    "- *Cálculo (se pediátrico):* [mg/kg/dia / tomadas = mL por dose]",
    "- *Alergias e interações:* [conferido / pendente]",
    "- *Ajustes (renal, hepático, idade, gestação):* [...]",
    "- *REMUME:* item presente na lista fornecida (conferir disponibilidade no estoque)."
  ].join("\n");

  var dados = "DADOS DO PACIENTE / PEDIDO:\n" + dadosPrescricao;
  var resposta = _iaFinalizarTexto(executarRaciocinioClinico(promptSistema, dados, 1800));
  if (resposta && _iaCfgBool("IA_AUDITORIA_PRESCRICAO", true)) {
    resposta = _iaAuditarRascunho(resposta, dadosPrescricao, "prescricao");
  }
  return resposta;
}

function gerarPassagemPlantaoSBAR(dadosCaso) {
  var promptSistema = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO: PASSAGEM DE PLANTÃO (SBAR) para enfermaria, pronto para rounds, com checklist de pendências críticas.",
    "REGRAS:",
    "1. Telegráfico e direto; será lido durante o plantão.",
    "2. Dado não fornecido = 'Não informado'. NUNCA escreva 'Sem alergias conhecidas' ou 'estável' se o usuário não disse isso.",
    "3. Status atual (Estável / Em vigilância / Instável / Paliativo) apenas se houver base nos dados; senão 'Não informado'.",
    "4. Gatilhos de intercorrência são SUGESTÕES derivadas dos dados do caso, rotuladas como tal. Não invente dados.",
    "",
    "ESTRUTURA:",
    "\uD83C\uDFE5 *SBAR - PASSAGEM DE PLANTÃO*",
    "*Status:* [...] | *Risco do próximo plantão:* [...]",
    "",
    "\uD83D\uDCCD *S - Situação*",
    "- *Leito / paciente:* [leito, iniciais, idade, sexo]",
    "- *DIH:* [...]",
    "- *Diagnóstico principal:* [...]",
    "- *Status atual:* [...]",
    "",
    "\uD83D\uDCDC *B - Contexto*",
    "- *Admissão e evolução:* [2 linhas]",
    "- *Comorbidades:* [...]",
    "- *Alergias:* [relatadas ou 'Não informado']",
    "- *Dispositivos:* [CVC/CVP, SVD, SNE, TOT etc.]",
    "- *Limitação de suporte / isolamento:* [se informado]",
    "",
    "\uD83E\uDE7A *A - Avaliação por sistemas*",
    "- *Neuro:* [LOTE, Glasgow, delirium, sedação]",
    "- *Cardio / hemodinâmica:* [PA, FC, ritmo, vasopressor/inotrópico]",
    "- *Resp:* [FR, SpO2, suporte de O2]",
    "- *Gastro / nutrição:* [...]",
    "- *Renal / balanço:* [diurese, BH 24h, função renal]",
    "- *Infeccioso:* [foco, ATB e dia de tratamento, febre]",
    "- *Profilaxias:* [TVP e úlcera de estresse - prescritas?]",
    "- *Exames relevantes:* [...]",
    "",
    "\uD83D\uDEA8 *R - Recomendações e pendências*",
    "- *Pendências:* [exames, culturas, pareceres]",
    "- *Gatilhos (sugestão):* [se febre..., se queda de PA...]",
    "- *Planejamento:* [desmame, dieta, alta]"
  ].join("\n");
  return _iaFinalizarTexto(executarRaciocinioClinico(promptSistema, "DADOS DO CASO:\n" + dadosCaso, 2200));
}

function gerarPitchERoundComIA(dadosCaso) {
  var promptSistema = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO: PRECEPTORIA SOCRÁTICA PARA O ROUND. Objetivo: treinar raciocínio diagnóstico ativo, não entregar respostas prontas.",
    "REGRAS:",
    "- O pitch usa SOMENTE fatos informados; lacunas aparecem como 'Não informado'.",
    "- As perguntas testam decisão e raciocínio (hipótese, achado discriminante, limiar de intervenção), nunca pegadinhas ou humilhação.",
    "- NÃO forneça gabarito agora. Encerre pedindo que Wagner responda; o feedback vem depois, comparando a resposta com a evidência.",
    "- Se houver instabilidade no caso, a primeira linha é a prioridade de segurança e a sabatina fica em segundo plano.",
    "",
    "ESTRUTURA:",
    "\uD83C\uDFA4 *ROUND - PITCH E SABATINA*",
    "",
    "*1. Pitch sugerido (5 a 7 linhas, falado):*",
    "[problema principal, evolução nas últimas 24h, achados relevantes, plano de hoje]",
    "",
    "\uD83D\uDD0D *2. Ponto a conferir:*",
    "- [UMA lacuna laboratorial, semiológica ou medicamentosa pertinente, sem presumir que foi negligenciada]",
    "",
    "\uD83C\uDFAF *3. Defenda sua conduta:*",
    "1) [Pergunta de fisiopatologia/semiologia: qual achado discrimina a hipótese principal?]",
    "2) [Pergunta de farmacologia/decisão: por que esta escolha, dose e monitorização?]",
    "3) [Pergunta de alta/intercorrência: qual critério mudaria sua conduta?]",
    "",
    "Responda por mensagem; depois dou o feedback do raciocínio e, se pedir, o gabarito."
  ].join("\n");
  return _iaFinalizarTexto(executarRaciocinioClinico(promptSistema, "DADOS DO CASO:\n" + dadosCaso, 2500));
}

function processarCalculadoraClinicaComIA(dadosCalc) {
  var promptSistema = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO: CALCULADORA E ESTRATIFICAÇÃO DE RISCO. Interprete escores e cálculos do internato com concisão.",
    "REGRAS:",
    "1. Se o texto trouxer um resultado já calculado pelo motor do sistema, PRESERVE-o integralmente; apenas interprete.",
    "2. Se precisar calcular, mostre a soma item a item em texto simples. Se faltar variável, diga qual falta e NÃO estime.",
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
    for (var j = 0; j < linhas.length; j++) {
      var linhaNorm = (typeof normalizarTexto === "function") ? normalizarTexto(linhas[j]) : linhas[j].toLowerCase();
      var matchCount = 0;
      for (var k = 0; k < termos.length; k++) {
        if (linhaNorm.indexOf(termos[k]) !== -1) matchCount++;
      }
      if (matchCount > 0) registrosEncontrados.push(linhas[j]);
    }
  }

  var instrucaoBase = "";
  if (erroPlanilha) {
    instrucaoBase = "AVISO TÉCNICO: a planilha de interações retornou erro de acesso (" + erroPlanilha + "). Avalie pelo conhecimento clínico e escreva no campo Fonte: 'Conhecimento Geral (planilha local inacessível)'.";
  } else if (!baseInteracoes || String(baseInteracoes).trim().length === 0) {
    instrucaoBase = "AVISO TÉCNICO: a planilha de interações está vazia. Avalie pelo conhecimento clínico e escreva no campo Fonte: 'Conhecimento Geral (planilha local sem registros)'.";
  } else if (registrosEncontrados.length > 0) {
    instrucaoBase = "=== REGISTROS DA BASE LOCAL DE INTERAÇÕES (PLANILHA) ===\n" +
      registrosEncontrados.slice(0, 40).join("\n") + "\n=======================================================\n\n" +
      "REGRA: os termos foram localizados na base local. Use-a como referência primária e indique no campo Fonte: 'Base Local (Planilha Google Drive)'. " +
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
    "- *Fonte:* [Base Local (Planilha Google Drive) OU Conhecimento Geral (medicamento não cadastrado na Base Local)]",
    "",
    "ESTRUTURA (1 droga):",
    "\uD83D\uDD2C *PRINCIPAIS INTERAÇÕES: [DROGA]*",
    "\u26D4 *Contraindicadas / graves:*",
    "- [Droga X]: [mecanismo resumido]",
    "\u26A0\uFE0F *Moderadas:*",
    "- [Droga Y]: [mecanismo resumido]",
    "- *Fonte:* [Base Local (Planilha Google Drive) OU Conhecimento Geral (medicamento não cadastrado na Base Local)]"
  ].join("\n");
  return _iaFinalizarTexto(executarRaciocinioClinico(promptSistema, "Drogas informadas: " + drogas, 1500));
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
  var hco3 = num(/\bhco3\s*[:=]?\s*(\d+[.,]?\d*)/i) || num(/bicarb[^\d]*(\d+[.,]?\d*)/i);
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

  var analiseIA = _iaFinalizarTexto(executarRaciocinioClinico(promptSistema, dadosMatematicos + "DADOS INFORMADOS PELO USUÁRIO:\n" + textoAmostra, 1500));

  // Valida e higieniza a análise da IA garantindo autoridade estrita dos dados determinísticos da amostra
  if (analiseIA) {
    var linhasAnalise = analiseIA.split("\n");
    for (var idx = 0; idx < linhasAnalise.length; idx++) {
      var linha = linhasAnalise[idx];

      // 1. pH da amostra NUNCA pode ser contradito (mesmo em linhas com termos de conduta ou metas)
      linha = linha.replace(/\b(?:o\s+)?ph\s*(?:[eé]|est[aá]|foi|de|=|:)?\s*([67][.,]\d+)\b/gi, function(match, val) {
        var valNum = parseFloat(val.replace(",", "."));
        var phNum = parseFloat(String(ph).replace(",", "."));
        if (Math.abs(valNum - phNum) > 0.001) {
          return "pH da amostra (" + ph + ")";
        }
        return match;
      });

      // 2. Ânion Gap espúrio da IA é sempre neutralizado
      linha = linha.replace(/(?:[aâ]nion\s+gap|\bag\b|gap)\s*(?:[eé]|est[aá]|foi|de|=|:)?\s*\d+(?:[.,]\d+)?/gi, function() {
        var agTxt = (resCalc && resCalc.anionGap !== null && resCalc.anionGap !== undefined)
          ? "Ânion gap (" + resCalc.anionGap + " mEq/L)"
          : "Ânion gap conforme cálculo determinístico";
        return agTxt;
      });

      // 3. HCO3 da amostra NUNCA pode ser contradito
      linha = linha.replace(/(?:hco3|bicarbonato)\s*(?:[eé]|est[aá]|foi|de|=|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:meq\/l)?\b/gi, function(match, val) {
        var valNum = parseFloat(val.replace(",", "."));
        var hco3Num = parseFloat(String(hco3).replace(",", "."));
        if (Math.abs(valNum - hco3Num) > 0.1) {
          return "HCO3 da amostra (" + hco3 + " mEq/L)";
        }
        return match;
      });

      // 4. pCO2: Higieniza medições contraditórias da amostra, preservando metas ventilatórias explícitas (ex: "Alvo ventilatório: pCO2 35 mmHg")
      var ehAlvoEspecificoPco2 = /(?:alvo|meta|objetivo|manter|titular|visar)\s*(?:ventilat[oó]ri[ao])?\s*[:=]?\s*(?:de\s+)?p?a?co2/i.test(linha);
      if (!ehAlvoEspecificoPco2) {
        linha = linha.replace(/\b(?:o\s+)?p?a?co2\s*(?:[eé]|est[aá]|foi|de|=|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:mmhg)?\b/gi, function(match, val) {
          var valNum = parseFloat(val.replace(",", "."));
          var pco2Num = parseFloat(String(pco2).replace(",", "."));
          if (Math.abs(valNum - pco2Num) > 0.1) {
            return "pCO2 da amostra (" + pco2 + " mmHg)";
          }
          return match;
        });
      }

      linhasAnalise[idx] = linha;
    }
    analiseIA = linhasAnalise.join("\n");
  }

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
  "dor\\s+(tor[áa]cica|precordial|no\\s+peito|retroesternal)|\\bchoque\\b|\\bsepse\\b|\\bsepsis\\b|septic|rebaixamento|rebaixad|" +
  "glasgow\\s*(de\\s*)?[3-8]\\b|\\bconvuls|crise\\s+convulsiva|status\\s+epilep|anafila|\\biam\\b|infarto|supra\\s*(de\\s*)?st|" +
  "\\bavc\\b|acidente\\s+vascular|edema\\s+agudo|\\btep\\b|embolia\\s+pulmonar|pneumot[óo]rax|tamponamento|hipotens|\\bdva\\b|" +
  "vasopressor|noradrenalina|adrenalina|dobutamina|vasopressina|\\bsri\\b|intubacao|intubar|\\biot\\b|" +
  "parada\\s+(cardio|respirat)|ressuscit|\\brcp\\b|desfibril|assistolia|fibrilacao\\s+ventricular|taquicardia\\s+ventricular|" +
  "sangramento\\s+(maci|ativo|volumoso)|hemorragia|hematemese|intoxicacao|overdose|hipoglicemia\\s+grave|cetoacidose|" +
  "dessatur|sat(uracao)?\\s*(de|em)?\\s*[<=]?\\s*[5-8]\\d\\s*%?|spo2\\s*[<=]?\\s*[5-8]\\d|\\bpa\\s*(de\\s*)?[<]?\\s*[5-8]\\d\\s*[x\\/]"
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

  // 1) Solicitação explícita de áudio ou preceptor socrático
  if (/(?:me\s+)?respond(?:a|e)\s+(?:com\s+|em\s+)?(?:um\s+)?[aá]udio|no\s+fone|fala\s+comigo|preceptor\s+socr[aá]tico|sabatina|manda\s+[aá]udio/i.test(t)) {
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
  if (/(?:prescrev|passar\s+receita|medicamento\s+para|rem[eé]dio\s+para)/.test(tn) || (/\breceita\b/.test(tn) && !culinaria)) {
    return { intencao: "CLINICO_RX", confianca: 0.9 };
  }
  if (t.indexOf("ph") !== -1 && (t.indexOf("pco2") !== -1 || t.indexOf("hco3") !== -1)) {
    return { intencao: "CLINICO_GASO", confianca: 0.95 };
  }
  if (t.indexOf("dúvida") !== -1 || t.indexOf("duvida") !== -1 && t.indexOf("medquest") !== -1) {
    return { intencao: "NOTION_DUVIDA", confianca: 0.85 };
  }
  if (/(?:evid[êe]ncia|pubmed|artigos?\s+(?:sobre|de)|estudos?\s+(?:sobre|de)|meta-an[áa]lise|ensaios?\s+cl[íi]nicos?)/i.test(t)) {
    return { intencao: "EVIDENCIA_MEDICA", confianca: 0.95 };
  }
  if (t.indexOf("leito") !== -1 && (t.indexOf("enfermaria") !== -1 || t.indexOf("evolu") !== -1)) {
    return { intencao: "ENFERMARIA", confianca: 0.85 };
  }
  if (/(?:paciente\s+\d+|paciente\s+com|anos,\s+(?:masculino|feminino|queixa)|chega\s+ao\s+pronto)/i.test(t)) {
    return { intencao: "CLINICO_SOAP", confianca: 0.85 };
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

  var resposta = _iaExecutar(promptSistema, texto, 250, { json: true });
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

  var resposta = _iaExecutar(promptSistema, "PEDIDO:\n" + textoMensagem, 600, { json: true });
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
    extrairDadosEventoCalendario: extrairDadosEventoCalendario,
    gerarCriticaSocraticaPreceptor: gerarCriticaSocraticaPreceptor,
    gerarGuiaExameFisicoEspecial: gerarGuiaExameFisicoEspecial
  };
}
