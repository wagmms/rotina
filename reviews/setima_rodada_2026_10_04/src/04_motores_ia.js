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
    "MODO: DOCUMENTAÇÃO CLÍNICA. Você auxilia um interno a redigir um RASCUNHO de registro SOAP para o prontuário eletrônico (e-SUS), com base nas diretrizes vigentes (MS, SBC, SBD, PCDT).",
    "",
    "REGRAS:",
    "1. Inicie IMEDIATAMENTE pelo título '\uD83E\uDE7A *SÍNTESE SOAP - RASCUNHO AMBULATORIAL*'. Sem saudações.",
    "2. Estilo técnico de prontuário, direto.",
    "3. No Plano (P), seja prescritivo e numere as condutas.",
    "",
    "INTEGRIDADE DOCUMENTAL (REGRA INVIOLÁVEL - RESOLUÇÃO CFM 2.299/2021):",
    "- NUNCA preencha exame físico normal para sistemas que o usuário não descreveu. Isso seria documentar o que não foi examinado (falsidade documental).",
    "- Registre apenas achados e sinais vitais efetivamente informados. Sistemas ausentes: '\u2B1C Não avaliado / não informado'.",
    "- Liste em 'Exame pendente para completar' o checklist semiológico sugerido (ACV, AR, abdome, extremidades, neurológico e demais pertinentes à queixa).",
    "- Hipóteses diagnósticas e CID-10/CIAP-2 são sugestões a confirmar pelo médico responsável.",
    "",
    "ESTRUTURA:",
    "\uD83E\uDE7A *SÍNTESE SOAP - RASCUNHO AMBULATORIAL*",
    "",
    "\uD83D\uDC64 *S - Subjetivo*",
    "- *Queixa principal:* [...]",
    "- *HDA:* [cronológica, apenas dados informados]",
    "- *Histórico:* [antecedentes, alergias, uso contínuo - ou 'Não informado']",
    "- *Hábitos e contexto:* [...]",
    "",
    "\uD83D\uDD0D *O - Objetivo*",
    "- *Sinais vitais / geral:* [informados ou 'Não informado']",
    "- *Achados descritos:* [sistema: achado]",
    "- *Não avaliado:* [sistemas sem informação]",
    "",
    "\uD83E\uDDE0 *A - Avaliação*",
    "- *Problema principal:* [...] (CID-10: [X] | CIAP-2: [Y] - sugestão)",
    "- *Comorbidades:* [...]",
    "- *Diferenciais:* [do mais provável ao que não pode ser perdido]",
    "- *\u26A0\uFE0F Sinais de alarme:* [...]",
    "",
    "\uD83D\uDCCB *P - Plano*",
    "1. *Prescrição:* [genérico/RENAME, dose, via, duração - com a checagem de segurança; se faltar peso/creatinina, declarar pendência]",
    "2. *Exames:* [...]",
    "3. *Medidas não farmacológicas:* [...]",
    "4. *Atestados / encaminhamentos:* [...]",
    "5. *Seguimento e retorno:* [quando voltar e sinais para buscar o PS]",
    "",
    "\uD83D\uDD0E *Exame pendente para completar:* [checklist]",
    "",
    "\uD83D\uDCAC *Pitch para apresentar:* [2 linhas, apenas fatos informados]",
    "",
    IA_SEGURANCA_MEDICAMENTOSA
  ].join("\n");
  return _iaFinalizarTexto(executarRaciocinioClinico(promptSistema, "CASO CLÍNICO:\n" + casoClinico, 2500));
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

  // Valida e higieniza a análise da IA separando interpretação da amostra vs alvos/metas terapêuticas
  if (analiseIA) {
    var linhasAnalise = analiseIA.split("\n");
    for (var idx = 0; idx < linhasAnalise.length; idx++) {
      var linha = linhasAnalise[idx];
      // Distingue conduta/alvo terapêutico (ex: "Alvo ventilatório: pCO2 35 mmHg", "meta de pH > 7.30") de menções descritivas da amostra
      var ehAlvoOuConduta = /\b(?:alvo|meta|objetivo|titular|manter|visar|ajustar\s+para|atingir|desejad[ao]|tolerar|estrat[eé]gia|conduta|ventilat[oó]ri[ao]|par[aâ]metros?\s+a\s+monitorar)\b/i.test(linha);

      // Se a linha for um alvo ou objetivo clínico, preserva integralmente os valores propostos pela IA
      if (!ehAlvoOuConduta) {
        // Higieniza contradições de pH com a amostra medida (inclui formas em prosa: "O pH é 6.00", "pH de 6.00", "pH: 6.00")
        linha = linha.replace(/\b(?:o\s+)?ph\s*(?:[eé]|est[aá]|foi|de|=|:)?\s*([67][.,]\d+)\b/gi, function(match, val) {
          var valNum = parseFloat(val.replace(",", "."));
          var phNum = parseFloat(String(ph).replace(",", "."));
          if (Math.abs(valNum - phNum) > 0.001) {
            return "pH da amostra (" + ph + ")";
          }
          return match;
        });

        // Higieniza contradições de pCO2 da amostra
        linha = linha.replace(/\b(?:o\s+)?p?a?co2\s*(?:[eé]|est[aá]|foi|de|=|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:mmhg)?\b/gi, function(match, val) {
          var valNum = parseFloat(val.replace(",", "."));
          var pco2Num = parseFloat(String(pco2).replace(",", "."));
          if (Math.abs(valNum - pco2Num) > 0.1) {
            return "pCO2 da amostra (" + pco2 + " mmHg)";
          }
          return match;
        });

        // Higieniza contradições de Ânion Gap
        linha = linha.replace(/(?:[aâ]nion\s+gap|\bag\b|gap)\s*(?:[eé]|est[aá]|foi|de|=|:)?\s*\d+(?:[.,]\d+)?/gi, function() {
          var agTxt = (resCalc && resCalc.anionGap !== null && resCalc.anionGap !== undefined)
            ? "Ânion gap (" + resCalc.anionGap + " mEq/L)"
            : "Ânion gap conforme cálculo determinístico";
          return agTxt;
        });

        // Higieniza contradições de HCO3 da amostra
        linha = linha.replace(/(?:hco3|bicarbonato)\s*(?:[eé]|est[aá]|foi|de|=|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:meq\/l)?\b/gi, function(match, val) {
          var valNum = parseFloat(val.replace(",", "."));
          var hco3Num = parseFloat(String(hco3).replace(",", "."));
          if (Math.abs(valNum - hco3Num) > 0.1) {
            return "HCO3 da amostra (" + hco3 + " mEq/L)";
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
    gerarCriticaSocraticaPreceptor: gerarCriticaSocraticaPreceptor
  };
}
