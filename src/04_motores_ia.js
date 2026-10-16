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
  ORCAMENTO_MS: 16000,
  FOLGA_TOKENS: 384,
  TOKENS_TETO: 5000,
  GROQ: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"],
  OPENROUTER: ["openrouter/free"],
  ZAI: ["glm-4.7-flash", "glm-4.5-flash"],
  GEMINI_CLINICO: ["gemini-3.5-flash", "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3.5-flash-lite"],
  GEMINI_RAPIDO: ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"],
  GEMINI: ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-flash-latest"],
  GEMINI_GROUNDING: ["gemini-3.5-flash", "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3.5-flash-lite"],
  LOCAL: ["llama3.1:latest", "llama3.2:latest", "mistral:latest", "llama3:8b", "mistral:7b"]
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
  "- Adote a postura de uma preceptoria experiente de hospital universitário: firme, técnica, instigante, densa e acolhedora.",
  "- Você NÃO é médico, NÃO assina prescrições e NÃO substitui a supervisão do preceptor ou da equipe assistente. Não afirme vínculo ou certificação institucional.",
  "- Português do Brasil. Técnico em medicina, simples em assuntos pessoais. Sem bajulação, sarcasmo, bronca ou infantilização.",
  "- Comece pela resposta, prioridade ou decisão. Nunca abra com saudação, elogio ou explicação sobre você.",
  "- Separe dado informado, interpretação e dado pendente. Nunca transforme ausência de informação em achado normal. Nunca invente dados do paciente.",
  "- Não use 'validado', 'seguro' ou 'confirmado' sem suporte verificável nos dados recebidos.",
  "- Não encerre com ofertas genéricas de ajuda. Pergunte apenas quando a resposta mudar a conduta ou sustentar a atividade pedagógica.",
  "- Brevidade nunca autoriza omitir condição de segurança.",
  "- Nas respostas assistenciais, não inclua bibliografia, URLs ou seção de fontes automaticamente. Preserve o embasamento e as condições clínicas; apresente referências apenas quando solicitadas.",
  "- DIRETRIZ MANDATÓRIA DE SÍNTESE E CONDENSAÇÃO (MENOS TEXTO, MAIS RACIOCÍNIO):",
  "  • Gaste capacidade e tokens com RACIOCÍNIO CLÍNICO DECISIVO (cálculo de doses miligramadas precisas mg/kg, regras de bloqueio, segurança farmacológica, diagnósticos diferenciais chave e conduta imediata).",
  "  • Seja cirúrgico, telegráfico e sintético. Elimine qualquer excesso textual, introduções e rodeios.",
  "  • NUNCA forneça conselhos de bom senso óbvios ou de estilo de vida genéricos (ex: 'ingerir líquidos', 'manter repouso', 'alimentos leves') a menos que sejam uma contraindicação clínica estrita da doença.",
  "  • Cada linha deve conter informação técnica decisória de alto valor, formatada para visualização ágil em smartphone."
].join("\n");

var IA_VISUAL = [
  "CONTRATO VISUAL (TELEGRAM, Markdown) & HIERARQUIA BEIRA-LEITO (ESCANEÁVEL EM 3 SEGUNDOS):",
  "- Título curto: um emoji funcional + nome do modo, em negrito com um asterisco: *título*. Nunca use ** nem # nem tabelas nem arte ASCII.",
  "- HIERARQUIA VISUAL BEIRA-LEITO OBRIGATÓRIA:",
  "  🔴 *AÇÃO IMEDIATA / CONDUTA / DOSE DE ATAQUE:* Sempre no topo em negrito, com valores destacados para decisão em 3 segundos.",
  "  🟡 *DILUIÇÃO, VELOCIDADE DE INFUSÃO & MANUTENÇÃO:* Posologia discriminada de forma prática (ex: mL/h na bomba ou gotas/min).",
  "  ⚠️ *ALERTAS DE SEGURANÇA & BLOQUEIOS:* Tetos máximos, contraindicações absolutas e monitorização clínica indispensável.",
  "  ℹ️ *JUSTIFICATIVA CLÍNICA & REFERÊNCIAS:* Seção compacta e recolhida ao final, sem poluir a tomada de decisão rápida.",
  "- SÍNTESE VISUAL: Bullets planos com hífen (-), sem listas aninhadas nem parágrafos longos. Numere apenas quando a ordem importar.",
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
  "- Sepse (adulto): Surviving Sepsis Campaign 2021 e atualizações subsequentes; a triagem NÃO deve usar qSOFA isolado. Hora 1: lactato, hemoculturas antes do antimicrobiano, antimicrobiano de amplo espectro, cristaloide 30 mL/kg se hipotensão ou lactato elevado (em cardiopatas graves ou DRC estágio 5, titular alíquotas com avaliação de tolerância volêmica/POCUS para prevenir EAP), vasopressor (noradrenalina de primeira linha) para PAM alvo >= 65 mmHg.",
  "- Ventilação Mecânica Protetora e SRI: Em pacientes com sobrepeso ou obesidade, o volume corrente (6 mL/kg) e parâmetros ventilatórios devem ser guiados pelo PESO PREDITO PELA ALTURA (Fórmula de Devine: Homens 50 + 0.91*(alt-152.4); Mulheres 45.5 + 0.91*(alt-152.4)), NUNCA pelo peso real, prevenindo barotrauma e volutrauma.",
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
  var obsoletos = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
  lista = lista.filter(function (m) { return obsoletos.indexOf(m) === -1; });
  return lista.length ? lista : padrao.slice();
}

function _iaNovoCtx(limiteMs) {
  var teto = limiteMs || Number(_iaCfg("IA_ORCAMENTO_MS", IA_PADROES.ORCAMENTO_MS)) || IA_PADROES.ORCAMENTO_MS;
  return {
    id: Utilities.getUuid().substring(0, 8),
    inicio: new Date().getTime(),
    limite: teto
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

function _iaDesbloquear(chave) {
  try { CacheService.getScriptCache().remove("iabl_" + chave); } catch (e) { /* sem cache */ }
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
      var partes = (t.match(new RegExp("\\" + ch, "g")) || []).length;
      if (partes % 2 === 1) {
        var lastIdx = t.lastIndexOf(ch);
        if (lastIdx !== -1) {
          t = t.substring(0, lastIdx) + t.substring(lastIdx + 1);
        }
      }
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
  var t = String(texto)
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_#`>~\[\]]/g, "")
    .replace(/^\s*[-\u2022]\s+/gm, "");

  // Pressão arterial e intervalos
  t = t.replace(/(\d{2,3})\s*[xX\/]\s*(\d{2,3})\s*mmHg/gi, "$1 por $2 milímetros de mercúrio");
  t = t.replace(/\b(6|8|12|24)\s*\/\s*\1\s*h\b/gi, "de $1 em $1 horas");

  // Unidades de infusão e exames (ordem decrescente de especificidade)
  t = t.replace(/\bmcg\/kg\/min\b/gi, "microgramas por quilo por minuto");
  t = t.replace(/\bmcg\/min\b/gi, "microgramas por minuto");
  t = t.replace(/\bmg\/kg\/dia\b/gi, "miligramas por quilo por dia");
  t = t.replace(/\bmg\/kg\b/gi, "miligramas por quilo");
  t = t.replace(/\bml\/h\b/gi, "mililitros por hora");
  t = t.replace(/\bmeq\/l\b/gi, "miliequivalentes por litro");
  t = t.replace(/\bmg\/dl\b/gi, "miligramas por decilitro");
  t = t.replace(/\bmmHg\b/gi, "milímetros de mercúrio");
  t = t.replace(/\bbpm\b/gi, "batimentos por minuto");
  t = t.replace(/\birpm\b/gi, "incursões por minuto");

  // Siglas de plantão e gases
  t = t.replace(/\b(?:PaCO2|pCO2)\b/gi, "pê cê ó dois");
  t = t.replace(/\b(?:SpO2|SatO2)\b/gi, "saturação de oxigênio");
  t = t.replace(/\bHCO3\b/gi, "bicarbonato");
  t = t.replace(/\bFiO2\b/gi, "fração inspirada de oxigênio");
  t = t.replace(/\bNa\s*\+/g, "sódio");
  t = t.replace(/\bK\s*\+/g, "potássio");
  t = t.replace(/\b(?:IOT|iot)\b/g, "intubação orotraqueal");
  t = t.replace(/\b(?:SRI|sri)\b/g, "sequência rápida de intubação");
  t = t.replace(/\b(?:DVA|dva)\b/g, "droga vasoativa");
  t = t.replace(/\b(?:EAP|eap)\b/g, "edema agudo de pulmão");
  t = t.replace(/\b(?:BAVT|bavt)\b/g, "bloqueio atrioventricular total");

  return t.replace(/\s+/g, " ").trim();
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
      var timeoutMsCfg = Number(_iaCfg("IA_TIMEOUT_MS", 7000)) || 7000;
      var timeoutMsFetch = cfg.timeoutMs || timeoutMsCfg;
      var res = UrlFetchApp.fetch(cfg.url, {
        method: "post", headers: headers, payload: JSON.stringify(payload), muteHttpExceptions: true,
        timeoutMs: timeoutMsFetch
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

function _iaNormalizarUrlLocal(urlBruta) {
  var url = String(urlBruta || "").trim();
  if (!url) return "http://127.0.0.1:11434/v1/chat/completions";
  url = url.replace(/\/+$/, "");
  if (url.indexOf("/v1/chat/completions") !== -1 || url.indexOf("/api/chat") !== -1) {
    return url;
  }
  if (/\/v1$/i.test(url)) {
    return url + "/chat/completions";
  }
  return url + "/v1/chat/completions";
}

/**
 * Chamada direta à API nativa do Ollama (/api/chat)
 * Permite execução ultrarrápida em nós locais sem depender de proxies intermediários.
 * Suporta polimorfismo de argumentos:
 *   _iaChamarOllamaNativo(url, modelo, sistema, prompt, tokens, opcoes) OU
 *   _iaChamarOllamaNativo(sistema, prompt, tokens, ctx, opcoes)
 */
function _iaChamarOllamaNativo(arg1, arg2, arg3, arg4, arg5, arg6) {
  var url, modelo, sistema, prompt, tokens, ctx, opcoes;

  if (typeof arg1 === "string" && /^https?:\/\//i.test(arg1)) {
    url = arg1;
    modelo = arg2;
    sistema = arg3;
    prompt = arg4;
    tokens = arg5;
    opcoes = arg6 || {};
    ctx = opcoes.ctx || _iaNovoCtx();
  } else {
    sistema = arg1;
    prompt = arg2;
    tokens = arg3;
    ctx = arg4 || _iaNovoCtx();
    opcoes = arg5 || {};
    var urlBase = _iaCfg("LOCAL_LLM_URL", "http://127.0.0.1:11434/api/chat");
    url = String(urlBase || "").trim();
    modelo = opcoes.modeloForcado || opcoes.modelo || (Array.isArray(opcoes.modelos) ? opcoes.modelos[0] : null);
  }

  opcoes = opcoes || {};
  if (url.indexOf("/api/chat") === -1) {
    if (url.indexOf("/v1/chat/completions") !== -1) {
      url = url.replace("/v1/chat/completions", "/api/chat");
    } else if (url.indexOf("/v1") !== -1) {
      url = url.replace(/\/v1\/?$/, "/api/chat");
    } else {
      url = url.replace(/\/+$/, "") + "/api/chat";
    }
  }

  var apiKey = _iaCfg("LOCAL_LLM_API_KEY", "ollama");
  var timeoutMs = Number(opcoes.timeoutMs || _iaCfg("LOCAL_LLM_TIMEOUT_MS", 15000)) || 15000;

  var modelos = modelo ? [modelo] : opcoes.modelos;
  if (!modelos || !modelos.length) {
    modelos = _iaLista("IA_MODELOS_LOCAL", IA_PADROES.LOCAL);
  }

  for (var i = 0; i < modelos.length; i++) {
    if (_iaOrcamentoEsgotado(ctx)) {
      _iaLog(ctx, "OLLAMA_NATIVO: orçamento de tempo esgotado");
      return null;
    }
    var mod = modelos[i];
    if (_iaBloqueado("LOCAL_" + mod)) continue;

    var headers = { "Content-Type": "application/json" };
    if (apiKey && apiKey !== "none" && apiKey !== "sem_chave" && apiKey !== "sem-chave" && apiKey !== "ollama") {
      headers["Authorization"] = "Bearer " + apiKey;
    }

    var payload = {
      model: mod,
      messages: [
        { role: "system", content: (sistema || "") + IA_DIRETIVA_SEM_LATEX },
        { role: "user", content: prompt }
      ],
      stream: false,
      options: {
        temperature: opcoes.temperature !== undefined ? opcoes.temperature : 0.2,
        num_predict: _iaTokensEfetivos(tokens)
      }
    };

    try {
      var res = UrlFetchApp.fetch(url, {
        method: "post",
        headers: headers,
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
        timeoutMs: timeoutMs
      });
      var code = res.getResponseCode();

      if (code === 200) {
        var json = JSON.parse(res.getContentText());
        var texto = (json.message && json.message.content) ? json.message.content : (json.response || "");
        var truncado = !!(json.done === false || json.done_reason === "length");

        if (texto && String(texto).trim()) {
          return {
            texto: String(texto),
            truncado: truncado,
            modelo: "ollama/" + mod,
            offline_disponivel: true,
            origem: "ollama_nativo"
          };
        }
        if (truncado) return { texto: "", truncado: true, modelo: "ollama/" + mod, origem: "ollama_nativo" };
        _iaLog(ctx, "OLLAMA_NATIVO " + mod + ": resposta vazia");
      } else if (code === 404) {
        _iaBloquear("LOCAL_" + mod, 600);
        _iaLog(ctx, "OLLAMA_NATIVO " + mod + ": 404 (modelo não encontrado no Ollama)");
      } else if (code === 503 || code === 502 || code === 504) {
        _iaBloquear("LOCAL_" + mod, 60);
        _iaLog(ctx, "OLLAMA_NATIVO " + mod + ": HTTP " + code + " (servidor Ollama indisponível)");
      } else {
        _iaLog(ctx, "OLLAMA_NATIVO " + mod + ": HTTP " + code);
      }
    } catch (e) {
      _iaBloquear("LOCAL_" + mod, 60);
      _iaLog(ctx, "OLLAMA_NATIVO " + mod + " falha de conexão: " + e.message);
    }
  }
  return null;
}

function _iaProvLocal(sistema, prompt, tokens, ctx, opcoes) {
  opcoes = opcoes || {};
  var urlBase = _iaCfg("LOCAL_LLM_URL", "http://127.0.0.1:11434/v1/chat/completions");
  var url = _iaNormalizarUrlLocal(urlBase);
  var apiKey = _iaCfg("LOCAL_LLM_API_KEY", "ollama");
  var timeoutMs = Number(_iaCfg("LOCAL_LLM_TIMEOUT_MS", 30000)) || 30000;

  var modelos = opcoes.modelos;
  if (!modelos || !modelos.length) {
    if (opcoes.modeloForcado) {
      modelos = [opcoes.modeloForcado];
    } else {
      modelos = _iaLista("IA_MODELOS_LOCAL", IA_PADROES.LOCAL);
    }
  }

  var ehOllamaNativo = url.indexOf("/api/chat") !== -1 || !!opcoes.nativo || !!opcoes.ollama;
  if (ehOllamaNativo) {
    return _iaChamarOllamaNativo(sistema, prompt, tokens, ctx, opcoes);
  }

  for (var i = 0; i < modelos.length; i++) {
    if (_iaOrcamentoEsgotado(ctx)) { _iaLog(ctx, "LOCAL: orçamento de tempo esgotado"); return null; }
    var modelo = modelos[i];
    if (_iaBloqueado("LOCAL_" + modelo)) continue;

    var headers = { "Content-Type": "application/json" };
    if (apiKey && apiKey !== "none" && apiKey !== "sem_chave" && apiKey !== "sem-chave") {
      headers["Authorization"] = "Bearer " + apiKey;
    }

    var payload = {
      model: modelo,
      messages: [
        { role: "system", content: sistema + IA_DIRETIVA_SEM_LATEX },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: _iaTokensEfetivos(tokens)
    };

    try {
      var res = UrlFetchApp.fetch(url, {
        method: "post",
        headers: headers,
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
        timeoutMs: timeoutMs
      });
      var code = res.getResponseCode();

      if (code === 200) {
        var json = JSON.parse(res.getContentText());
        var escolha = json.choices && json.choices[0];
        var texto = escolha && escolha.message ? _iaTextoDeConteudo(escolha.message.content) : "";
        var truncado = !!(escolha && escolha.finish_reason === "length");

        if (texto && String(texto).trim()) {
          return {
            texto: String(texto),
            truncado: truncado,
            modelo: "local/" + modelo,
            offline_disponivel: true
          };
        }
        if (truncado) return { texto: "", truncado: true, modelo: "local/" + modelo };
        _iaLog(ctx, "LOCAL " + modelo + ": resposta vazia");
      } else if (code === 404) {
        // Fallback defensivo: se endpoint OpenAI /v1 não existir, tenta o endpoint nativo do Ollama (/api/chat)
        var fallbackOllama = _iaChamarOllamaNativo(sistema, prompt, tokens, ctx, { modeloForcado: modelo });
        if (fallbackOllama) return fallbackOllama;
        _iaBloquear("LOCAL_" + modelo, 600);
        _iaLog(ctx, "LOCAL " + modelo + ": 404 (modelo não encontrado localmente)");
      } else if (code === 503 || code === 502 || code === 504) {
        _iaBloquear("LOCAL_" + modelo, 60);
        _iaLog(ctx, "LOCAL " + modelo + ": HTTP " + code + " (servidor local indisponível)");
      } else {
        _iaLog(ctx, "LOCAL " + modelo + ": HTTP " + code);
      }
    } catch (e) {
      _iaBloquear("LOCAL_" + modelo, 60);
      _iaLog(ctx, "LOCAL " + modelo + " falha de conexão: " + e.message);
    }
  }
  return null;
}

var IA_DIRETIVA_SEM_LATEX = "\n\nCRÍTICO: NUNCA use formatação matemática LaTeX (como $...$ ou $$...$$). Escreva números, dosagens e unidades (ex: 200 mg, 90 mmHg) como texto limpo e simples.";

function _iaHashChave(k) {
  if (!k) return "none";
  var s = String(k).trim();
  if (s.length <= 16) return s;
  return s.slice(0, 6) + "_" + s.slice(-6);
}

/**
 * ==============================================================================
 * MOTOR PRIMÁRIO TIER-0: GOOGLE CLOUD VERTEX AI (GEMINI-4-ARGON)
 * ==============================================================================
 * Consome os créditos ativos da Google Cloud Vertex AI via Service Account OAuth2 (RS256).
 * Suporta Raciocínio Clínico Avançado, Áudio Multimodal e Imagens Médicas (ECG, RX, TC, Exames).
 */
function chamarVertexAIGemini(parts, systemPrompt, opcoes) {
  if (typeof VertexAuthService === "undefined" || !VertexAuthService || !VertexAuthService.isConfigured()) {
    return null;
  }

  opcoes = opcoes || {};
  var auth = null;
  try {
    auth = VertexAuthService.getAuthInfo();
  } catch (eAuth) {
    if (typeof Logger !== "undefined" && Logger.log) {
      Logger.log("[VertexAI] Falha ao obter token OAuth2: " + (eAuth.message || eAuth));
    }
    return null;
  }
  if (!auth || !auth.accessToken) return null;

  var projectId = auth.projectId || VertexAuthService.getProjectId();
  var primaryLoc = opcoes.location || ConfigService.get("VERTEX_LOCATION", VertexAuthService.getLocation() || "global");
  var primaryModel = opcoes.model || ConfigService.get("VERTEX_MODEL", VertexAuthService.getModel() || "gemini-4-argon");

  // Lista de tentativas na Vertex AI (Prioridade 1: gemini-4-argon em global)
  var rotasVertex = [
    { model: primaryModel, location: primaryLoc }
  ];
  if (primaryLoc !== "global") {
    rotasVertex.push({ model: primaryModel, location: "global" });
  }

  // Normaliza parts
  var userParts = Array.isArray(parts) ? parts : [{ text: String(parts || "") }];
  var payloadObj = {
    contents: [
      {
        role: "user",
        parts: userParts
      }
    ],
    generationConfig: {
      temperature: opcoes.temperature !== undefined ? opcoes.temperature : 0.15,
      maxOutputTokens: opcoes.maxOutputTokens || 4096
    }
  };

  // Suporte a Thinking Level / Thinking Budget no Gemini 4 Argon (Vertex AI)
  var thinking = opcoes.thinkingLevel || opcoes.thinking;
  if (!thinking) {
    if (opcoes.semThinking || opcoes.rapido || opcoes.extrativo) {
      thinking = "low";
    } else if (opcoes.clinico || opcoes.multimodal) {
      thinking = "high";
    }
  }

  if (thinking && String(thinking).toLowerCase() !== "off") {
    var tLow = String(thinking).toLowerCase();
    var levelMap = {
      high: "HIGH",
      medium: "MEDIUM",
      low: "LOW",
      minimal: "MINIMAL"
    };
    payloadObj.generationConfig.thinkingConfig = {
      thinkingLevel: levelMap[tLow] || "HIGH"
    };
    if (opcoes.thinkingBudget) {
      payloadObj.generationConfig.thinkingConfig.thinkingBudget = Number(opcoes.thinkingBudget);
    }
  }

  if (systemPrompt && String(systemPrompt).trim()) {
    payloadObj.systemInstruction = {
      role: "system",
      parts: [{ text: String(systemPrompt).trim() }]
    };
  }

  if (opcoes.responseMimeType) {
    payloadObj.generationConfig.responseMimeType = opcoes.responseMimeType;
  }

  var payloadStr = JSON.stringify(payloadObj);

  for (var i = 0; i < rotasVertex.length; i++) {
    var rota = rotasVertex[i];
    var host = (rota.location === "global")
      ? "https://aiplatform.googleapis.com"
      : "https://" + rota.location + "-aiplatform.googleapis.com";

    var url = host + "/v1/projects/" + projectId +
              "/locations/" + rota.location +
              "/publishers/google/models/" + rota.model + ":generateContent";

    try {
      var res = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        headers: {
          "Authorization": "Bearer " + auth.accessToken
        },
        payload: payloadStr,
        muteHttpExceptions: true,
        timeoutMs: opcoes.timeoutMs || 35000
      });

      var code = res ? res.getResponseCode() : 0;
      if (code === 200) {
        var json = JSON.parse(res.getContentText());
        if (json && json.candidates && json.candidates[0] &&
            json.candidates[0].content && json.candidates[0].content.parts) {
          var textoExtraido = json.candidates[0].content.parts
            .map(function(p) { return p.text || ""; })
            .join("")
            .trim();
          if (textoExtraido) {
            return textoExtraido;
          }
        }
      } else {
        if (typeof Logger !== "undefined" && Logger.log) {
          Logger.log("[VertexAI] Aviso em " + rota.model + " (" + rota.location + ") HTTP " + code + ": " +
                     (res ? res.getContentText().slice(0, 220) : "sem resposta"));
        }
      }
    } catch (errV) {
      if (typeof Logger !== "undefined" && Logger.log) {
        Logger.log("[VertexAI] Exceção em " + rota.model + " (" + rota.location + "): " + (errV.message || errV));
      }
    }
  }

  return null;
}

function _iaProvGemini(sistema, prompt, tokens, ctx, opcoes) {
  opcoes = opcoes || {};

  // 0. Prioridade Tier-0: Google Cloud Vertex AI (gemini-4-argon)
  if (typeof VertexAuthService !== "undefined" && VertexAuthService && VertexAuthService.isConfigured()) {
    try {
      var partesUser = opcoes.partesUsuario || [{ text: prompt }];
      var instrucaoVertex = (opcoes.instrucaoSistema || sistema) + IA_DIRETIVA_SEM_LATEX;
      var optsVertex = Object.assign({}, opcoes, {
        maxOutputTokens: _iaTokensEfetivos(tokens)
      });
      var resVertex = chamarVertexAIGemini(partesUser, instrucaoVertex, optsVertex);
      if (resVertex && String(resVertex).trim()) {
        return { texto: String(resVertex).trim(), truncado: false, modelo: "gemini-4-argon", groundingMetadata: null };
      }
    } catch (eVx) {
      _iaLog(ctx, "VERTEX AI falha, recorrendo ao pool de fallback: " + (eVx.message || eVx));
    }
  }

  if (_iaBloqueado("GEMINI_NET_FAIL")) {
    _iaLog(ctx, "GEMINI: indisponibilidade transitória de rede ativa (Fast-Ack / cooldown), pulando para motor local.");
    return null;
  }
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
      // Salvaguarda clínica: restrito a modelos com alta capacidade de raciocínio clínico; lite apenas como fallback de cota
      modelos = _iaLista("IA_MODELOS_CLINICOS_GEMINI", IA_PADROES.GEMINI_CLINICO);
    } else if (opcoes.semThinking || opcoes.extrativo) {
      // Modelos ultra-rápidos para roteamento e extração sintática de baixa latência
      modelos = _iaLista("IA_MODELOS_RAPIDOS_GEMINI", IA_PADROES.GEMINI_RAPIDO);
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
    if (typeof IaCircuitBreaker !== "undefined" && IaCircuitBreaker && !IaCircuitBreaker.podeExecutar("GEMINI")) {
      _iaLog(ctx, "[CircuitBreaker GEMINI] ABERTO durante cascata de modelos, interrompendo Gemini (Fast-Ack).");
      break;
    }
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
          var tBudget = Number(_iaCfg("IA_THINKING_BUDGET_CLINICO", 384));
          payload.generationConfig.thinkingConfig = { thinkingBudget: tBudget };
        }
      }
      if (opcoes.grounding) payload.tools = [{ googleSearch: {} }];

      try {
        var timeoutMsConfig = Number(_iaCfg("GEMINI_TIMEOUT_MS", 7000)) || 7000;
        var timeoutMsFetch = (opcoes && opcoes.timeoutMs) || (opcoes && (opcoes.multimodal || opcoes.partesUsuario) ? Math.max(12000, timeoutMsConfig) : timeoutMsConfig);
        var res = UrlFetchApp.fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" + modelo + ":generateContent",
          {
            method: "post", contentType: "application/json",
            headers: { "x-goog-api-key": chaves[idx] },
            payload: JSON.stringify(payload), muteHttpExceptions: true,
            timeoutMs: timeoutMsFetch
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
        } else if (code === 504) {
          todas429 = false;
          _iaBloquear("GEMINI_" + modelo, 60);
          _iaLog(ctx, "GEMINI " + modelo + ": HTTP 504 Timeout na chave #" + idx + ", pulando para próximo modelo.");
          break;
        } else if (code === 503) {
          todas429 = false;
          _iaBloquear("GEMINI_" + modelo, 60);
          _iaLog(ctx, "GEMINI " + modelo + ": HTTP 503 Alta Demanda/Indisponível no Google, pulando para próximo modelo.");
          break;
        } else if (code === 500 || code === 502) {
          todas429 = false;
          _iaBloquear("GEMINI_K_" + hashChave + "_" + modelo, 30);
          _iaLog(ctx, "GEMINI " + modelo + ": " + code + " na chave #" + idx + ", tentando próxima chave.");
          continue;
        } else if (code === 404) {
          todas429 = false;
          _iaBloquear("GEMINI_" + modelo, 3600);
          _iaLog(ctx, "GEMINI " + modelo + ": 404 (bloqueado por 1h)");
          break;
        } else if (code === 402) {
          todas429 = false;
          _iaBloquear("GEMINI_" + modelo, 3600);
          _iaBloquear("GEMINI_K_" + hashChave + "_" + modelo, 3600);
          _iaLog(ctx, "GEMINI " + modelo + ": 402 Pré-pagamento esgotado na chave #" + idx + " (bloqueado por 1h)");
          continue;
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
        var msgErro = String(e && (e.message || e)).toLowerCase();
        var ehTimeout = msgErro.indexOf("timeout") !== -1 || msgErro.indexOf("timed out") !== -1 || msgErro.indexOf("timed-out") !== -1 || msgErro.indexOf("etimedout") !== -1 || msgErro.indexOf("esockettimedout") !== -1;
        if (typeof IaCircuitBreaker !== "undefined" && IaCircuitBreaker) {
          IaCircuitBreaker.registrarFalha("GEMINI", e.message || "Exceção em Gemini");
        }
        _iaBloquear("GEMINI_K_" + hashChave + "_" + modelo, 60);
        _iaLog(ctx, "GEMINI " + modelo + " exceção: " + e.message);
        if (ehTimeout) {
          _iaLog(ctx, "GEMINI " + modelo + " detectou timeout de rede. Fast-Ack ativado para preservar orçamento para o motor local.");
          _iaBloquear("GEMINI_NET_FAIL", 30);
          _iaBloquear("GEMINI_" + modelo, 60);
          break;
        }
        continue;
      }
    }
    if (_iaBloqueado("GEMINI_NET_FAIL")) {
      break;
    }
    if (todas429 && chaves.length > 0) _iaBloquear("GEMINI_" + modelo, 60);
  }
  return null;
}

function _iaResolverTruncamento(chamar, tokens, r, ctx, json) {
  if (!r?.truncado) return r;

  if (!_iaOrcamentoEsgotado(ctx)) {
    const tokensExpandidos = Math.min(Math.ceil((Number(tokens) || 2000) * 1.6), IA_PADROES.TOKENS_TETO);
    _iaLog(ctx, "Truncamento detectado, repetindo com " + tokensExpandidos + " tokens");
    const r2 = chamar(tokensExpandidos);
    if (r2?.texto) r = r2;
  }

  if (r.truncado && r.texto && !json) {
    r.texto = _iaCortarNaFrase(r.texto) +
      "\n\n\u26A0\uFE0F Resposta interrompida por limite de tamanho. Não use como conduta completa; peça a continuação.";
  }
  return r;
}

function _iaOrdemProvedores() {
  const padrao = String(_iaCfg("PROVEDOR_TEXTO_PADRAO", "GEMINI")).toUpperCase();
  const ativoLocal = String(_iaCfg("LOCAL_LLM_ATIVO", "auto")).toLowerCase();
  const temUrlLocal = Boolean(_iaCfg("LOCAL_LLM_URL", ""));

  // Fast-Path: Gemini é o provedor canônico prioritário do ecossistema
  const lista = [padrao || "GEMINI"];
  if (!lista.includes("GEMINI")) lista.push("GEMINI");

  // Provedores secundários adicionados exclusivamente se credenciais ativas estiverem presentes
  if ((_iaCfg("OPENROUTER_API_KEY", "") || padrao === "OPENROUTER") && !lista.includes("OPENROUTER")) {
    lista.push("OPENROUTER");
  }
  if ((_iaCfg("ZAI_API_KEY", "") || padrao === "ZAI") && !lista.includes("ZAI")) {
    lista.push("ZAI");
  }
  if ((_iaCfg("GROQ_API_KEY", "") || padrao === "GROQ") && !lista.includes("GROQ")) {
    lista.push("GROQ");
  }

  // Provedor local (incluído se configurado explicitamente, com URL ativa ou em modo auto)
  if (ativoLocal !== "false" && (temUrlLocal || ativoLocal === "true" || padrao === "LOCAL" || ativoLocal === "auto")) {
    if (!lista.includes("LOCAL")) lista.push("LOCAL");
  }

  return [...new Set(lista)];
}

const DISPATCH_PROVEDORES_IA = {
  GROQ: (sistema, prompt, tokens, ctx) => _iaProvGroq(sistema, prompt, tokens, ctx),
  OPENROUTER: (sistema, prompt, tokens, ctx) => _iaProvOpenRouter(sistema, prompt, tokens, ctx),
  ZAI: (sistema, prompt, tokens, ctx) => _iaProvZai(sistema, prompt, tokens, ctx),
  GEMINI: (sistema, prompt, tokens, ctx, opcoes) => _iaProvGemini(sistema, prompt, tokens, ctx, opcoes),
  OLLAMA: (sistema, prompt, tokens, ctx, opcoes) => _iaChamarOllamaNativo(sistema, prompt, tokens, ctx, opcoes),
  LOCAL: (sistema, prompt, tokens, ctx, opcoes) => _iaProvLocal(sistema, prompt, tokens, ctx, opcoes)
};

function _iaChamarProvedor(nome, sistema, prompt, tokens, ctx, opcoes) {
  if (typeof IaCircuitBreaker !== "undefined" && IaCircuitBreaker && !IaCircuitBreaker.podeExecutar(nome)) {
    _iaLog(ctx, "[CircuitBreaker " + nome + "] ABERTO (cooldown ativo), pulando provedor.");
    return null;
  }
  const handler = DISPATCH_PROVEDORES_IA[nome];
  return handler ? handler(sistema, prompt, tokens, ctx, opcoes) : null;
}

function _iaAcionarFallbackOffline(sistema, promptUsuario, opcoes, ctx) {
  if (typeof IaLocalFallbackService === "undefined" || !IaLocalFallbackService) {
    return null;
  }
  if (typeof IaLocalFallbackService.executarFallbackLocalOffline === "function") {
    _iaLog(ctx, "Acionando executarFallbackLocalOffline unificado");
    return IaLocalFallbackService.executarFallbackLocalOffline(sistema, promptUsuario, opcoes);
  }
  if (opcoes?.json) {
    _iaLog(ctx, "Acionando fallback determinístico offline estruturado (JSON)");
    return IaLocalFallbackService.estruturarJsonOffline(sistema, promptUsuario);
  }
  _iaLog(ctx, "Acionando fallback determinístico offline clínico");
  return IaLocalFallbackService.gerarRespostaOfflineClinica(sistema, promptUsuario, opcoes);
}

function _iaRegistrarFalhaCircuito(nome, razao, ctx) {
  if (typeof IaCircuitBreaker !== "undefined" && IaCircuitBreaker) {
    IaCircuitBreaker.registrarFalha(nome, razao);
  }
  if (ctx) {
    _iaLog(ctx, nome + " falhou: " + razao);
  }
}

function _iaRegistrarSucessoCircuito(nome, modelo, deltaMs, ctx) {
  if (typeof IaCircuitBreaker !== "undefined" && IaCircuitBreaker) {
    IaCircuitBreaker.registrarSucesso(nome);
  }
  _iaLog(ctx, "OK via " + nome + " (" + (modelo || "desconhecido") + ") em " + deltaMs + " ms");
}

function _iaFormatarResultadoProvedor(resposta, opcoes) {
  if (!resposta?.texto) return "";
  return (opcoes?.json) ? resposta.texto : _iaRemoverLatex(resposta.texto);
}

function executarTentativaProvedor(nome, sistema, promptUsuario, tokens, ctx, opcoes) {
  // Guard Clause: Circuit Breaker aberto para este provedor
  if (typeof IaCircuitBreaker !== "undefined" && IaCircuitBreaker && !IaCircuitBreaker.podeExecutar(nome)) {
    _iaLog(ctx, "[CircuitBreaker " + nome + "] ABERTO (cooldown ativo), pulando provedor.");
    return { sucesso: false, abortar: false, resultado: null };
  }

  const chamar = (t) => _iaChamarProvedor(nome, sistema, promptUsuario, t, ctx, opcoes);

  try {
    let r = chamar(tokens);
    r = _iaResolverTruncamento(chamar, tokens, r, ctx, Boolean(opcoes?.json));

    // Guard Clause 1: Truncamento com exigência de resposta completa
    if (r?.truncado && opcoes?.exigirRespostaCompleta) {
      _iaLog(ctx, "Resposta incompleta; revisão não concluída");
      return { sucesso: false, abortar: true, resultado: null };
    }

    // Guard Clause 2: Validação de corpo de texto não-vazio
    const textoValido = r?.texto && String(r.texto).trim();
    if (!textoValido) {
      _iaRegistrarFalhaCircuito(nome, "Resposta vazia", ctx);
      return { sucesso: false, abortar: false, resultado: null };
    }

    // Sucesso da tentativa
    const inicioMs = ctx?.inicio || Date.now();
    const deltaMs = Date.now() - inicioMs;
    _iaRegistrarSucessoCircuito(nome, r.modelo, deltaMs, ctx);

    const resultadoFinal = _iaFormatarResultadoProvedor(r, opcoes);
    return { sucesso: true, abortar: false, resultado: resultadoFinal };
  } catch (e) {
    const msgErro = e?.message || String(e);
    _iaRegistrarFalhaCircuito(nome, msgErro, ctx);
    return { sucesso: false, abortar: false, resultado: null, erro: e };
  }
}

function chamarMotorIaComFallback(sistema, promptUsuario, maxTokens, opcoes = {}) {
  if (!promptUsuario && !sistema) {
    return null;
  }

  const tokens = Number(maxTokens) || 2000;
  const ctx = _iaNovoCtx();
  const ordem = _iaOrdemProvedores();

  for (const nome of ordem) {
    if (_iaOrcamentoEsgotado(ctx)) {
      _iaLog(ctx, "Orçamento esgotado antes de " + nome);
      break;
    }

    const tentativa = executarTentativaProvedor(nome, sistema, promptUsuario, tokens, ctx, opcoes);
    if (tentativa.abortar) {
      return null;
    }
    if (tentativa.sucesso) {
      return tentativa.resultado;
    }
  }

  _iaLog(ctx, "TODOS OS PROVEDORES FALHARAM");
  return _iaAcionarFallbackOffline(sistema, promptUsuario, opcoes, ctx);
}

function _iaExecutar(sistema, promptUsuario, maxTokens, opcoes) {
  return chamarMotorIaComFallback(sistema, promptUsuario, maxTokens, opcoes);
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
  opcoes = opcoes || {};
  var tokens = Number(maxTokens) || tokensPadrao;
  var limiteCtx = (opcoes && opcoes.orcamentoMs) || (opcoes && opcoes.multimodal ? 15000 : null);
  var ctx = _iaNovoCtx(limiteCtx);
  var chamar = function (t) { return chamarInterno(t, ctx); };
  var r = _iaResolverTruncamento(chamar, tokens, chamar(tokens), ctx, false);
  if (!r || !r.texto) return null;
  if (opcoes && opcoes.grounding && typeof EXECUCAO_ATUAL !== 'undefined' && EXECUCAO_ATUAL) {
    if (!EXECUCAO_ATUAL.fontesClinicas) EXECUCAO_ATUAL.fontesClinicas = [];
    EXECUCAO_ATUAL.fontesClinicas.push({ chamada: ctx.id, modelo: r.modelo, textoGerado: r.texto, groundingMetadata: r.groundingMetadata || null });
  }
  var texto = (opcoes && opcoes.grounding && opcoes.exibirFontes === true) ? _iaAcrescentarFontesBusca(r.texto, r.groundingMetadata) : r.texto;
  return _iaRemoverLatex(texto);
}

// ==============================================================================
// FUNÇÕES EXPORTADAS - MOTORES
// ==============================================================================

function executarRaciocinioClinico(sistema, promptUsuario, maxTokens, opcoes) {
  var opts = Object.assign({ clinico: true }, opcoes || {});
  return _iaExecutar(sistema, promptUsuario, maxTokens, opts);
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

function chamarLocalLlmAPI(sistema, promptUsuario, maxTokens, modelo) {
  return _iaPublico(function (t, ctx) {
    return _iaProvLocal(sistema, promptUsuario, t, ctx, { modeloForcado: modelo });
  }, 2000, maxTokens);
}

function chamarOllamaNativoAPI(sistema, promptUsuario, maxTokens, modelo) {
  return _iaPublico(function (t, ctx) {
    return _iaChamarOllamaNativo(sistema, promptUsuario, t, ctx, { modeloForcado: modelo });
  }, 2000, maxTokens);
}

function executarFallbackLocalOffline(arg1, arg2, arg3, arg4) {
  if (typeof IaLocalFallbackService !== "undefined" && IaLocalFallbackService && typeof IaLocalFallbackService.executarFallbackLocalOffline === "function") {
    return IaLocalFallbackService.executarFallbackLocalOffline(arg1, arg2, arg3, arg4);
  }
  return null;
}

function verificarSaudeLocalLlm() {
  var urlBase = _iaCfg("LOCAL_LLM_URL", "http://127.0.0.1:11434/v1/chat/completions");
  var apiKey = _iaCfg("LOCAL_LLM_API_KEY", "ollama");
  var modelosConfigurados = _iaLista("IA_MODELOS_LOCAL", IA_PADROES.LOCAL);
  var t0 = new Date().getTime();

  var urlChecagem = urlBase;
  if (urlChecagem.indexOf("/v1/chat/completions") !== -1) {
    urlChecagem = urlChecagem.replace("/v1/chat/completions", "/v1/models");
  } else if (urlChecagem.indexOf("/api/chat") !== -1) {
    urlChecagem = urlChecagem.replace("/api/chat", "/api/tags");
  } else {
    urlChecagem = urlChecagem.replace(/\/+$/, "") + "/v1/models";
  }

  var headers = {};
  if (apiKey && apiKey !== "none" && apiKey !== "sem_chave" && apiKey !== "sem-chave") {
    headers["Authorization"] = "Bearer " + apiKey;
  }

  try {
    var res = UrlFetchApp.fetch(urlChecagem, {
      method: "get",
      headers: headers,
      muteHttpExceptions: true,
      timeoutMs: 5000
    });
    var code = res.getResponseCode();
    var latencia = new Date().getTime() - t0;

    if (code === 200) {
      var json = JSON.parse(res.getContentText());
      var modelosDisponiveis = [];
      if (Array.isArray(json.data)) {
        modelosDisponiveis = json.data.map(function(m) { return m.id || m.name; }).filter(Boolean);
      } else if (Array.isArray(json.models)) {
        modelosDisponiveis = json.models.map(function(m) { return m.name || m.model; }).filter(Boolean);
      }

      return {
        ok: true,
        status: "ONLINE",
        url: urlBase,
        urlChecagem: urlChecagem,
        latenciaMs: latencia,
        modelosConfigurados: modelosConfigurados,
        modelosDisponiveis: modelosDisponiveis,
        mensagem: "Servidor de IA local online e pronto para contingência offline."
      };
    }

    return {
      ok: false,
      status: "ERRO_HTTP_" + code,
      url: urlBase,
      urlChecagem: urlChecagem,
      latenciaMs: latencia,
      modelosConfigurados: modelosConfigurados,
      modelosDisponiveis: [],
      mensagem: "Endpoint retornou status HTTP " + code
    };
  } catch (e) {
    var latenciaFalha = new Date().getTime() - t0;
    return {
      ok: false,
      status: "OFFLINE",
      url: urlBase,
      urlChecagem: urlChecagem,
      latenciaMs: latenciaFalha,
      modelosConfigurados: modelosConfigurados,
      modelosDisponiveis: [],
      erro: e.message,
      mensagem: "Não foi possível conectar ao motor local (servidor desligado ou porta inacessível)."
    };
  }
}

function cockpitLocalLlm(session, opcoes) {
  opcoes = opcoes || {};
  var acao = String(opcoes.acao || "status").toLowerCase();

  if (acao === "status") {
    var saude = verificarSaudeLocalLlm();
    saude.fallbackOfflinePronto = true;
    saude.protocolosOffline = (typeof IaLocalFallbackService !== "undefined" && IaLocalFallbackService.PROTOCOLOS_OFFLINE)
      ? Object.keys(IaLocalFallbackService.PROTOCOLOS_OFFLINE)
      : [];
    return saude;
  }

  if (acao === "fallback_offline" || acao === "contingencia") {
    var caso = opcoes.prompt || opcoes.caso || "Parada cardiorrespiratória em paciente adulto";
    var sistema = opcoes.sistema || (IA_PERSONA + "\n\n" + IA_SEGURANCA_MEDICAMENTOSA);
    var t0 = new Date().getTime();
    var respostaOffline = (typeof IaLocalFallbackService !== "undefined" && IaLocalFallbackService.gerarRespostaOfflineClinica)
      ? IaLocalFallbackService.gerarRespostaOfflineClinica(sistema, caso, opcoes)
      : "Fallback determinístico offline indisponível.";
    return {
      sucesso: true,
      acao: "fallback_offline",
      resposta: respostaOffline,
      tempoRespostaMs: new Date().getTime() - t0,
      modoOffline: true
    };
  }

  if (acao === "inferencia" || acao === "testar") {
    var promptTeste = opcoes.prompt || "Apresente sucintamente a conduta de emergência na anafilaxia grave.";
    var sistema = opcoes.sistema || (IA_PERSONA + "\n\n" + IA_SEGURANCA_MEDICAMENTOSA);
    var modelo = opcoes.modelo || null;
    var t0 = new Date().getTime();
    var resposta = chamarLocalLlmAPI(sistema, promptTeste, opcoes.maxTokens || 600, modelo);
    var elapsed = new Date().getTime() - t0;

    return {
      sucesso: !!(resposta && String(resposta).trim()),
      acao: "inferencia",
      resposta: resposta,
      tempoRespostaMs: elapsed,
      modeloUsado: modelo || "padrao_local"
    };
  }

  if (acao === "ollama_nativo") {
    var promptOllama = opcoes.prompt || "Apresente sucintamente a conduta de emergência na anafilaxia grave.";
    var sistemaOllama = opcoes.sistema || (IA_PERSONA + "\n\n" + IA_SEGURANCA_MEDICAMENTOSA);
    var modeloOllama = opcoes.modelo || null;
    var t0Ollama = new Date().getTime();
    var respostaOllama = chamarOllamaNativoAPI(sistemaOllama, promptOllama, opcoes.maxTokens || 600, modeloOllama);
    var elapsedOllama = new Date().getTime() - t0Ollama;

    return {
      sucesso: !!(respostaOllama && String(respostaOllama).trim()),
      acao: "ollama_nativo",
      resposta: respostaOllama,
      tempoRespostaMs: elapsedOllama,
      modeloUsado: modeloOllama || "padrao_ollama"
    };
  }

  if (acao === "fallback_local_offline" || acao === "executar_fallback") {
    var casoFb = opcoes.prompt || opcoes.caso || "Parada cardiorrespiratória em paciente adulto";
    var sistemaFb = opcoes.sistema || (IA_PERSONA + "\n\n" + IA_SEGURANCA_MEDICAMENTOSA);
    var t0Fb = new Date().getTime();
    var respostaFb = executarFallbackLocalOffline(sistemaFb, casoFb, opcoes);
    var txtFb = (typeof respostaFb === "object" && respostaFb !== null && respostaFb.resposta)
      ? respostaFb.resposta
      : (typeof respostaFb === "string" ? respostaFb : JSON.stringify(respostaFb || ""));
    var elapsedFb = new Date().getTime() - t0Fb;

    return {
      sucesso: !!(txtFb && String(txtFb).trim()),
      acao: "fallback_local_offline",
      resposta: txtFb,
      tempoRespostaMs: elapsedFb,
      modoOffline: true
    };
  }

  if (acao === "config") {
    return {
      ativo: _iaCfg("LOCAL_LLM_ATIVO", "auto"),
      url: _iaCfg("LOCAL_LLM_URL", "http://127.0.0.1:11434/v1/chat/completions"),
      provedorPadrao: _iaCfg("PROVEDOR_TEXTO_PADRAO", "GEMINI"),
      modelosConfigurados: _iaLista("IA_MODELOS_LOCAL", IA_PADROES.LOCAL),
      timeoutMs: Number(_iaCfg("LOCAL_LLM_TIMEOUT_MS", 30000))
    };
  }

  return { erro: "Ação não reconhecida: " + acao };
}

/**
 * Gemini com Google Search Grounding. Embasamento em diretrizes oficiais.
 */
function chamarGeminiPoolComGrounding(sistema, promptUsuario, maxTokens, opcoes) {
  opcoes = opcoes || {};
  var instrucao = sistema + "\n\nDIRETRIZ DE EMBASAMENTO CIENTÍFICO:\n" +
    "1. PRIORIDADE: diretrizes brasileiras oficiais (SBC, SBPT, SBD, ILAS, AMIB, CFM, AMB, Conitec/PCDT Ministério da Saúde).\n" +
    "2. DIVERGÊNCIAS: aponte discrepâncias com diretrizes internacionais (AHA/ACC, ESC, SSC, GOLD, GINA, IDSA) apenas se mudarem a conduta prática.\n" +
    (opcoes.exibirFontes === true ? "3. CITAÇÃO: cite somente referências verificadas na busca.\n" : "3. APRESENTAÇÃO: use as fontes consultadas para fundamentar a resposta, sem exibir citações, URLs ou bibliografia. Não omita incertezas ou limitações clínicas.\n") +
    "4. NUNCA use LaTeX ($). Retorne Markdown simples do Telegram.";
  var modelos = _iaLista("IA_MODELOS_GEMINI_GROUNDING", IA_PADROES.GEMINI_GROUNDING);
  return _iaPublico(function (t, ctx) {
    return _iaProvGemini(sistema, promptUsuario, t, ctx, { grounding: true, modelos: modelos, instrucaoSistema: instrucao });
  }, 2500, maxTokens, { grounding: true, exibirFontes: opcoes.exibirFontes === true });
}

function _iaNormalizarBase64(dados) {
  if (!dados) return "";
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(dados)) {
    return dados.toString("base64");
  }
  if (dados instanceof Uint8Array || (typeof dados === "object" && dados !== null && (ArrayBuffer.isView(dados) || (dados.constructor && dados.constructor.name === "Uint8Array")))) {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(dados.buffer, dados.byteOffset, dados.byteLength).toString("base64");
    }
  }
  if (typeof dados === "object" && dados !== null && Array.isArray(dados.data)) {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(dados.data).toString("base64");
    }
  }
  if (typeof dados === "string") {
    var idxVirgula = dados.indexOf(",");
    if (dados.slice(0, 5) === "data:" && idxVirgula !== -1) {
      return dados.substring(idxVirgula + 1).trim();
    }
    return dados.trim();
  }
  return String(dados);
}

function chamarGeminiPoolMultimodal(base64Data, mimeType, sistema, promptUsuario, opcoes) {
  // Suporte polimórfico a chamada com objeto de opções: { dadosMidia: {...}, prompt: '...', sistema: '...' }
  if (base64Data && typeof base64Data === "object" && (typeof Buffer === "undefined" || !Buffer.isBuffer(base64Data)) && !(base64Data instanceof Uint8Array) && !Array.isArray(base64Data.data)) {
    var objConfig = base64Data;
    var midiaConfig = objConfig.dadosMidia || objConfig.midia || {};
    base64Data = objConfig.base64Data || objConfig.data || midiaConfig.data || midiaConfig.base64Data || "";
    mimeType = objConfig.mimeType || objConfig.mime || midiaConfig.mimeType || midiaConfig.mime || "audio/wav";
    sistema = objConfig.sistema || objConfig.systemInstruction || sistema || "";
    promptUsuario = objConfig.promptUsuario || objConfig.prompt || promptUsuario || "";
    opcoes = objConfig.opcoes || objConfig;
  }
  opcoes = opcoes || {};
  base64Data = _iaNormalizarBase64(base64Data);

  var msg = promptUsuario ? promptUsuario : "Por favor, analise a mídia anexada em detalhes.";
  var mimeNormalizado = String(mimeType || "").toLowerCase().trim();
  if (mimeNormalizado === "audio/oga" || mimeNormalizado === "audio/opus" || mimeNormalizado.indexOf("audio/ogg") !== -1) {
    mimeNormalizado = "audio/ogg";
  } else if (mimeNormalizado.indexOf("audio/wav") !== -1 || mimeNormalizado.indexOf("audio/x-wav") !== -1 || mimeNormalizado.indexOf("audio/wave") !== -1) {
    mimeNormalizado = "audio/wav";
  } else if (mimeNormalizado.indexOf("audio/webm") !== -1) {
    mimeNormalizado = "audio/webm";
  } else if (mimeNormalizado.indexOf("audio/mp4") !== -1 || mimeNormalizado.indexOf("audio/m4a") !== -1 || mimeNormalizado.indexOf("audio/aac") !== -1) {
    mimeNormalizado = "audio/mp4";
  } else if (mimeNormalizado.indexOf("audio/mpeg") !== -1 || mimeNormalizado.indexOf("audio/mp3") !== -1) {
    mimeNormalizado = "audio/mp3";
  } else if (mimeNormalizado.indexOf("audio/pcm") !== -1) {
    mimeNormalizado = "audio/wav";
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

  // 1. Verificação do Circuit Breaker Multimodal (Fast-fail em 0ms)
  if (typeof IaCircuitBreaker !== "undefined" && IaCircuitBreaker && !IaCircuitBreaker.podeExecutar("MULTIMODAL")) {
    if (typeof Logger !== "undefined" && Logger.log) {
      Logger.log("[IA Multimodal] Circuit Breaker ABERTO (cooldown ativo). Acionando fallback determinístico local.");
    }
    if (opcoes.fallbackOffline !== false && typeof IaLocalFallbackService !== "undefined" && IaLocalFallbackService && typeof IaLocalFallbackService.gerarFallbackMultimodal === "function") {
      return IaLocalFallbackService.gerarFallbackMultimodal(msg, sistema, mimeNormalizado, opcoes);
    }
    return null;
  }

  var timeoutMultimodal = Number(_iaCfg("IA_MULTIMODAL_TIMEOUT_MS", 15000)) || 15000;
  var optsMultimodal = Object.assign({
    clinico: true,
    multimodal: true,
    timeoutMs: timeoutMultimodal,
    orcamentoMs: timeoutMultimodal
  }, opcoes, { partesUsuario: partes });

  var res = null;
  var erroOcorrido = null;
  try {
    res = _iaPublico(function (t, ctx) {
      return _iaProvGemini(sistema, msg, t, ctx, optsMultimodal);
    }, 2500, 2500, optsMultimodal);

    if (!res) {
      // Fallback resiliente multimodal: se o pool clínico prioritário sofrer saturação/429,
      // aciona imediatamente os modelos leves com cota separada e alta disponibilidade
      var modelosLeves = ["gemini-flash-lite-latest", "gemini-3.5-flash-lite"];
      var optsFallback = Object.assign({}, optsMultimodal, { modelos: modelosLeves });
      res = _iaPublico(function (t, ctx) {
        return _iaProvGemini(sistema, msg, t, ctx, optsFallback);
      }, 2500, 2500, optsFallback);
    }

    if (res && String(res).trim()) {
      if (typeof IaCircuitBreaker !== "undefined" && IaCircuitBreaker) {
        IaCircuitBreaker.registrarSucesso("MULTIMODAL");
      }
      return res;
    } else {
      erroOcorrido = "Provedor multimodal retornou resposta vazia";
      if (typeof IaCircuitBreaker !== "undefined" && IaCircuitBreaker) {
        IaCircuitBreaker.registrarFalha("MULTIMODAL", erroOcorrido);
      }
    }
  } catch (errMulti) {
    erroOcorrido = errMulti.message || String(errMulti);
    if (typeof IaCircuitBreaker !== "undefined" && IaCircuitBreaker) {
      IaCircuitBreaker.registrarFalha("MULTIMODAL", erroOcorrido);
    }
    if (typeof Logger !== "undefined" && Logger.log) {
      Logger.log("[IA Multimodal] Exceção na inferência: " + erroOcorrido);
    }
  }

  // Fallback determinístico local quando o provedor externo falhar
  if (opcoes.fallbackOffline !== false && typeof IaLocalFallbackService !== "undefined" && IaLocalFallbackService && typeof IaLocalFallbackService.gerarFallbackMultimodal === "function") {
    if (typeof Logger !== "undefined" && Logger.log) {
      Logger.log("[IA Multimodal] Acionando fallback determinístico offline local");
    }
    return IaLocalFallbackService.gerarFallbackMultimodal(msg, sistema, mimeNormalizado, opcoes);
  }

  return null;
}

/**
 * ==============================================================================
 * ÁUDIO CLÍNICO EM TEMPO ÚNICO MULTIMODAL (FMRP-USP / ZERO LATÊNCIA DE TRANSCRIÇÃO)
 * ==============================================================================
 * Processa o áudio em uma única inferência multimodal:
 * Extrai a transcrição literal fiel E estrutura a Fase 1 do SOAP se for relato clínico.
 */
function processarAudioClinicoMultimodal(base64Data, mimeType, opcoes) {
  if (base64Data && typeof base64Data === "object" && (typeof Buffer === "undefined" || !Buffer.isBuffer(base64Data)) && !(base64Data instanceof Uint8Array)) {
    var objA = base64Data;
    var midiaA = objA.dadosMidia || objA.midia || {};
    base64Data = objA.base64Data || objA.data || midiaA.data || midiaA.base64Data || "";
    mimeType = objA.mimeType || objA.mime || midiaA.mimeType || midiaA.mime || mimeType || "audio/wav";
    opcoes = objA.opcoes || objA;
  }
  opcoes = opcoes || {};
  base64Data = _iaNormalizarBase64(base64Data);

  var mimeNormalizado = String(mimeType || "audio/ogg").split(";")[0].trim().toLowerCase();
  if (mimeNormalizado === "audio/oga" || mimeNormalizado === "audio/opus" || mimeNormalizado.indexOf("audio/ogg") !== -1) {
    mimeNormalizado = "audio/ogg";
  } else if (mimeNormalizado.indexOf("audio/webm") !== -1) {
    mimeNormalizado = "audio/webm";
  } else if (mimeNormalizado.indexOf("audio/mp3") !== -1 || mimeNormalizado.indexOf("audio/mpeg") !== -1) {
    mimeNormalizado = "audio/mp3";
  } else if (mimeNormalizado.indexOf("audio/wav") !== -1 || mimeNormalizado.indexOf("audio/x-wav") !== -1) {
    mimeNormalizado = "audio/wav";
  } else if (mimeNormalizado.indexOf("audio/mp4") !== -1 || mimeNormalizado.indexOf("audio/m4a") !== -1) {
    mimeNormalizado = "audio/mp4";
  }
  mimeType = mimeNormalizado;

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
    "      - Perguntas de Anamnese com Racional Didático: faça apenas as perguntas investigativas que mudem a conduta, sem limite numérico, CADA UMA COM SUA JUSTIFICATIVA CLÍNICA OU HIPÓTESE A DESCARTAR ENTRE PARÊNTESES. Se houver dados suficientes, retorne lista vazia.",
    "      - Exame Dirigido: Sinais vitais essenciais e manobras físicas direcionadas à queixa que não foram informadas.",
    "      - REGRA ABSOLUTA DE SEGURANÇA: NÃO inclua hipóteses diagnósticas (Avaliação) e NÃO inclua prescrição ou condutas (Plano) nesta fase.",
    "3. SE NÃO FOR RELATO CLÍNICO (ex: agendamento de calendário, hábito pessoal, tarefa do Notion ou conversa geral): defina 'eh_clinico' como false.",
    "",
    "Contrato JSON estrito:",
    '{"transcricao":"transcrição literal fiel","eh_clinico":true,"tipo_relato":"leito|soap|outro","numero_leito":"4|null","status_sugerido":"estavel|vigilancia|instavel|null","evolucao_texto":"texto formal para prontuário|null","pendencias":[],"subjetivo":"Anamnese organizada (QP, HDA, antecedentes)|null","objetivo":"Exame físico com os 5 sistemas clássicos|null","perguntas_anamnese":[],"exame_dirigido":[]}'
  ].join("\n");

  var promptInstrucao = "Por favor, ouça o áudio com atenção aos termos médicos e retorne o JSON estruturado.";
  var raw = null;
  try {
    raw = chamarGeminiPoolMultimodal(base64Data, mimeType, sistema, promptInstrucao, opcoes);
  } catch (eChamarMulti) {
    Logger.log("Aviso em chamarGeminiPoolMultimodal de áudio: " + (eChamarMulti.message || eChamarMulti));
    raw = null;
  }
  if (!raw) {
    if (opcoes.fallbackOffline !== false && typeof IaLocalFallbackService !== "undefined" && IaLocalFallbackService && typeof IaLocalFallbackService.processarAudioClinicoOffline === "function") {
      return IaLocalFallbackService.processarAudioClinicoOffline(base64Data, mimeType, opcoes);
    }
    return null;
  }

  var obj = _iaExtrairJSON(raw);
  if (!obj || typeof obj !== "object") {
    if (String(raw).indexOf("MODO OFFLINE DE CONTINGÊNCIA") !== -1 || String(raw).indexOf("CONTINGÊNCIA") !== -1) {
      if (opcoes.fallbackOffline !== false && typeof IaLocalFallbackService !== "undefined" && IaLocalFallbackService && typeof IaLocalFallbackService.processarAudioClinicoOffline === "function") {
        return IaLocalFallbackService.processarAudioClinicoOffline(base64Data, mimeType, Object.assign({}, opcoes, { textoFallback: raw }));
      }
    }
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
      ? sanitizarObjetivoComRelato(obj.objetivo, transcricao)
      : String(obj.objetivo).trim();
    if (typeof verificarEExpandirExameFisicoObjetivo === "function") {
      oSanitizado = verificarEExpandirExameFisicoObjetivo(oSanitizado, transcricao);
    }
    if (typeof formatarExameFisicoSistemas === "function") {
      oSanitizado = formatarExameFisicoSistemas(oSanitizado);
    }
    var gateAudio = typeof avaliarSuficienciaAnamnese === 'function' ? avaliarSuficienciaAnamnese(transcricao, {}) : null;
    var perguntas = gateAudio && gateAudio.anamneseSuficiente ? [] : (obj.perguntas_anamnese || obj.perguntas || []);
    var exameDirigido = obj.exame_dirigido || [];
    var temEfAudio = /totalmente\s+normal|exame\s+f[ií]sico\s+geral\s+e\s+segmentar\s+completo|\bbom\s+estado\s+geral,\s+l[uú]cido|\bsem\s+edema\s+de\s+membros\s+inferiores\b|\bpulsos?\s+radiai[s]\b/i.test(transcricao);

    var blocosRasc = [
      "🩺 *SÍNTESE SOAP · ATENDIMENTO CLÍNICO*",
      "👤 *S - Subjetivo (Anamnese Estruturada)*\n" + sanitizarNegativasSOAP(obj.subjetivo, transcricao),
      "🔍 *O - Objetivo (Exame Físico)*\n" + (oSanitizado || "Exame físico em estruturação; conferir sinais vitais e achados.")
    ];
    if (perguntas && perguntas.length > 0) {
      blocosRasc.push("❓ *Perguntas para Completar a Anamnese (Investigação Ativa do Subjetivo)*\n" + formatarListaTopicos(perguntas, "Informar início detalhado, fatores de melhora/piora, antecedentes e alergias."));
    }
    if (gateAudio && gateAudio.anamneseSuficiente) blocosRasc.push('✅ Anamnese suficiente para tomada de decisão. Pode gerar o plano.');
    if (!temEfAudio && exameDirigido && exameDirigido.length > 0) {
      blocosRasc.push("🎯 *Cobrança Ativa do Exame Físico Dirigido*\n" + formatarListaTopicos(exameDirigido, "Aferir sinais vitais completos e exame direcionado ao foco da queixa."));
    }

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
    "🛡️ TRAVAS DE SEGURANÇA PROPEDÊUTICA E LGPD (OBRIGATÓRIO):",
    "- PRIVACIDADE (LGPD/HIPAA): Ignore e JAMAIS transcreva no laudo nomes de pacientes, números de prontuário, RG, CPF, hospital ou datas de nascimento visíveis no cabeçalho ou marcação da imagem.",
    "- CONTROLE DE QUALIDADE TÉCNICA: Antes de laudar, avalie a qualidade da imagem. Se houver artefatos severos, rotação acentuada, corte de derivações ou calibração fora do padrão no ECG (25mm/s, 10mm/mV), declare explicitamente a limitação técnica no topo da seção 1.",
    "- ANTI-VIÉS DE ANCORAGEM CLÍNICA: Analise os achados visuais da imagem de forma semiologicamente agnóstica e estritamente objetiva ANTES de correlacionar com a legenda ou hipótese sugerida pelo médico, prevenindo viés de confirmação.",
    "",
    "ROTEIROS METÓDICOS POR MODALIDADE (PADRÃO OURO INTERNACIONAL):",
    "1. SE FOR ELETROCARDIOGRAMA (ECG DE 12 DERIVAÇÕES):",
    "   - Realize a leitura sistemática obrigatória em 6 passos:",
    "     * 1.1 Ritmo e Frequência Cardíaca: Ritmo sinusal (onda P positiva em D1, D2, aVF, negativa em aVR, seguida de QRS) vs ritmos não sinusais (FA, flutter, juncional, escape). FC exata em bpm (método 1500/quadradinhos ou 300/quadrados grandes).",
    "     * 1.2 Eixo Elétrico no Plano Frontal: Normal (-30° a +90°), desvio para esquerda (< -30°) ou para a direita (> +90°), determinando o quadrante e graus exatos por D1 e aVF.",
    "     * 1.3 Intervalos e Condução AV: Intervalo PR (normal 120-200 ms; pesquisar BAVs, pré-excitação/WPW com onda delta); Duração do QRS (< 120 ms; bloqueios de ramo BRE/BRD, BDAS/BDPI); Intervalo QT e QTc corrigido por Bazett (normal até 450 ms homem, 460 ms mulher; risco de Torsades se > 500 ms).",
    "     * 1.4 Sobrecargas de Câmaras: Sobrecarga atrial (P pulmonale em D2 ou índice de Morris em V1); Sobrecarga ventricular esquerda (Sokolow-Lyon S em V1 + R em V5/V6 >= 35 mm, Cornell R em aVL + S em V3 > 28 mm H / > 20 mm M, critério de Peguero-Lo Presti) e sobrecarga de VD.",
    "     * 1.5 Isquemia, Lesão e Necrose (Segmento ST e Onda T por paredes contíguas): Analisar parede anterior/septal (V1-V4), lateral alta (D1, aVL), lateral baixa (V5, V6), inferior (D2, D3, aVF), posterior/dorsal (espelho em V1-V3) e VD (V3R/V4R se IAM inferior).",
    "     * 1.6 Critérios de Sgarbossa Modificados por Smith (em BRE ou Marca-passo): Supra concordante >= 1mm; Infra concordante em V1-V3 >= 1mm; Supra discordante excessivo com razão ST/S <= -0.25.",
    "     * 1.7 Equivalentes a Supra de ST (OMIs): Síndrome de Wellens (Tipo A bifásica ou Tipo B invertida simétrica em V2-V3); Padrão de de Winter (infra em rampa com onda T hiperaguda); Padrão de Aslanger; Supra de aVR >= 1mm com infra difuso em 6 derivações (tronco de coronária esquerda ou DA proximal).",
    "     * 1.8 Diagnósticos Diferenciais de Supra: Pericardite Aguda (supra difuso com concavidade para cima, infra de PR em D2 e sinal de Spodick com depressão do segmento TP) vs Repolarização Precoce (onda J) vs Brugada Tipo 1 (coved-type >= 2mm em V1-V2).",
    "",
    "2. SE FOR RADIOGRAFIA (TÓRAX OU OSSO):",
    "   - 2.1 Identificação e Técnica: Incidência (PA, AP, Perfil); qualidade técnica (Penetração, Rotação e Grau de inspiração com contagem obrigatória de arcos costais posteriores 8-10).",
    "   - 2.2 Sinal da Silhueta de Felson: Localização anatômica de densidades (apagamento do contorno cardíaco direito = lobo médio; contorno esquerdo = língula; hemidiafragma = lobo inferior).",
    "   - 2.3 Arcabouço Ósseo e Partes Moles: Fraturas, lesões líticas/blásticas, enfisema subcutâneo.",
    "   - 2.4 Mediastino e Silhueta Cardíaca: Índice Cardiotorácico (ICT normal <= 0,50 no PA), alargamento de mediastino, contornos aórtico e hilar.",
    "   - 2.5 Campos Pleuropulmonares e Estadiamento de Congestão Pulmonar:",
    "     * Padrão alveolar com broncograma aéreo vs intersticial reticular.",
    "     * Grau 1: Cefalização/redistribuição vascular para os ápices.",
    "     * Grau 2: Edema intersticial com Linhas B de Kerley nas bases e manguito peribrônquico.",
    "     * Grau 3: Edema alveolar com infiltrado bilateral confluente em asa de borboleta (bat-wing).",
    "   - 2.6 Pleura e Diafragma: Seios Costofrênicos livres vs velamento por derrame pleural (Curva de Damoiseau); linha de pneumotórax (pesquisar sinal do sulco profundo no decúbito); ar livre subdiafragmático (pneumoperitônio).",
    "",
    "3. SE FOREM EXAMES LABORATORIAIS / OCR DE LAUDOS E FITAS DE GASOMETRIA:",
    "   - 3.1 Gasometria Arterial (Método Sistemático em 6 Passos):",
    "     * Passo 1: Acidemia (pH < 7.35) vs Alcalemia (pH > 7.45).",
    "     * Passo 2: Distúrbio Primário (pCO2 respiratório vs HCO3 metabólico).",
    "     * Passo 3: Compensação esperada pela Fórmula de Winter: pCO2 = (1.5 x HCO3) + 8 (+/- 2) na acidose metabólica; pCO2 = HCO3 + 15 (+/- 2) na alcalose metabólica.",
    "     * Passo 4: Ânion-Gap Sérico (Na - [Cl + HCO3]) com correção obrigatória pela albumina: AG corrigido = AG + 2.5 x (4.0 - Albumina).",
    "     * Passo 5: Delta-Gap: (AG - 12) / (24 - HCO3). Se > 2 = Alcalose Metabólica associada; se < 0.8 = Acidose Hiperclorêmica associada.",
    "     * Passo 6: Oxigenação: PaO2 e Relação PaO2/FiO2 (Critérios de Berlim para SDRA).",
    "   - 3.2 Exames Bioquímicos e Hematológicos:",
    "     * Transcrição fiel com unidades de medida e valores de referência informados.",
    "     * Realce imediato de valores alterados (críticos, limítrofes, altos ou baixos).",
    "     * Hemograma com desvio escalonado à esquerda e cinética do ferro; Função renal (estadiamento KDIGO) e eletrólitos.",
    "",
    "4. SE FOR LESÃO DERMATOLÓGICA (PELE):",
    "   - 4.1 Lesão elementar primária e secundária (mácula, pápula, placa, vesícula, bolha, pústula, úlcera, crosta, descamação).",
    "   - 4.2 Topografia, arranjo e distribuição corporal (zosteriforme, simétrica, flexural, extensora).",
    "   - 4.3 Se lesão pigmentada/suspeita, aplicar Regra ABCDE (Assimetria, Bordas, Cores, Diâmetro > 6mm, Evolução).",
    "",
    "5. SE FOR TOMOGRAFIA COMPUTADORIZADA (TC E ANGIOTC POR TOPOGRAFIA):",
    "   - 5.1 TC DE CRÂNIO (MÉTODO B-C-B-V-B E SCORE ASPECTS):",
    "     * B (Blood): Sangramento agudo hiperdenso (+50 a +80 HU): extradural biconvexo, subdural crescente, subaracnóidea (Fisher 1-4) ou intraparenquimatoso.",
    "     * C (Cisterns): Cisternas da base e perimesencefálicas (pérvias ou apagadas).",
    "     * B (Brain): Parênquima, diferenciação substância branca/cinzenta, desvio de linha média (> 5mm), edema cerebral e Score ASPECTS no AVC isquêmico (perda da fita insular, núcleo lenticular e sulcos corticais).",
    "     * V (Ventricles): Ventrículos laterais, 3º e 4º ventrículos (simetria, apagamento, hidrocefalia).",
    "     * B (Bone): Fraturas da calvária, base do crânio, seios paranasais e pneumoencéfalo.",
    "   - 5.2 TC DE TÓRAX & ANGIOTOMOGRAFIA:",
    "     * Janela de Parênquima: Vidro fosco, consolidações alveolares, broncograma aéreo, pavimentação em mosaico (crazy-paving), faveolamento (honeycombing), bronquiectasias, enfisema, árvore em brotamento (tree-in-bud), nódulos e massas escavadas.",
    "     * Janela de Mediastino/Pleura: Linfonodomegalias (> 10mm), massas mediastinais, derrame pleural/pericárdico.",
    "     * AngioTC (TEP e Aorta): Falhas de enchimento pulmonares (TEP em sela/ramos lobares), cor pulmonale agudo (relação VD/VE > 1); Dissecção aórtica aguda (Stanford A vs B, flap intimal, falsa luz, rotura).",
    "   - 5.3 TC DE ABDOME E PELVE (ABDOME AGUDO):",
    "     * Fases de Contraste: Sem contraste, arterial (blush hemorrágico), portal (parênquimas e vasos mesentéricos) e excretora.",
    "     * Órgãos Sólidos: Lacerações traumáticas (fígado/baço AAST), pancreatite aguda (Balthazar/necrose), colecistite (parede > 3mm).",
    "     * Trato Gastrointestinal: Apendicite aguda (apêndice > 6mm, apendicolito e borramento adiposo), diverticulite (Hinchey), obstrução intestinal com ponto de transição e pneumoperitônio (ar livre subdiafragmático/mesentérico); isquemia de alça (pneumatose intestinal, gás na veia porta).",
    "     * Rins e Vasos: Nefrolitíase, hidronefrose, pielonefrite em cunha, hematoma retroperitoneal e aneurisma de aorta abdominal (> 5,5cm).",
    "   - 5.4 TC DE COLUNA (TRAUMA E ESTABILIDADE):",
    "     * Alinhamento e Critérios de Denis de 3 colunas (anterior, média e posterior; risco de instabilidade na coluna média).",
    "     * Canal Medular: Retropulsão de fragmentos ósseos e estenose traumática de canal.",
    "",
    "6. SE FOR ULTRASSONOGRAFIA BEIRA-LEITO (POCUS):",
    "   - 6.1 Protocolo eFAST (Trauma): Janela pericárdica/subxifoide, espaço hepatorrenal (Morrison), espaço esplenorrenal, pelve (retovesical/Douglas) e ápices pleurais (lung sliding e ponto de pulmão para pneumotórax).",
    "   - 6.2 Protocolo BLUE (Dispneia Aguda): Perfil A (linhas A normais), Perfil B (linhas B > 3 coalescentes em cometa = edema agudo), Perfil C (consolidação subpleural) e Perfil PLAPS (derrame pleural posterior).",
    "   - 6.3 Ecocardiograma Focado & Volemia: Fração de ejeção subjetiva no olho, dilatação de VD (sinal de McConnell), calibre e colababilidade de veia cava inferior (VCI).",
    "",
    "7. SE FOR RESSONÂNCIA MAGNÉTICA (RM ENCEFÁLICA):",
    "   - 7.1 Ponderações: T1, T2, FLAIR (edema/gliose), SWI/T2* (sangramento/calcificação).",
    "   - 7.2 Difusão (DWI) e Mapa ADC: Restrição citotóxica verdadeira (hiper no DWI e hipo no ADC = AVC isquêmico hiperagudo ou abscesso piogênico central).",
    "   - 7.3 Parênquima: Efeito de massa, herniações e padrão de realce pós-gadolínio.",
    "",
    "8. SE FOR OFTALMOLOGIA / FUNDOSCOPIA & RETINOGRAFIA (FUNDO DE OLHO):",
    "   - 8.1 Disco Óptico e Escavação: Relação escavação/disco (normal <= 0,3 a 0,5; assimetria > 0,2 = suspeita de glaucoma), nitidez de bordas vs borramento/edema (Papiledema por hipertensão intracraniana, neurite óptica) e palidez (atrofia óptica).",
    "   - 8.2 Vasos e Retinopatia Hipertensiva (Keith-Wagener-Barker): Grau 1 (estreitamento arteriolar difuso), Grau 2 (cruzamentos AV patológicos - sinal de Salus e Gunn), Grau 3 (hemorragias em chama de vela e exsudatos duros/algodonosos), Grau 4 (papiledema bilateral associado - emergência hipertensiva).",
    "   - 8.3 Retinopatia Diabética: Não proliferativa (microaneurismas, hemorragias em ponto e borra, exsudatos duros) vs Proliferativa (neovasos de retina/disco, hemorragia vítrea, descolamento tracional).",
    "   - 8.4 Oclusões Vasculares Agudas: OACR (oclusão de artéria central: palidez retiniana difusa com mancha vermelho-cereja na mácula - emergência oftalmológica aguda); OVCR (oclusão de veia central: padrão em 'tempestade de sangue' com hemorragias difusas nos 4 quadrantes e ingurgitamento venoso).",
    "   - 8.5 Manchas de Roth: Hemorragias retinianas com centro pálido esbranquiçado (estigma de Endocardite Infecciosa ou leucemia).",
    "",
    "9. SE FOR OTOSCOPIA & OROSCOPIA / VIAS AÉREAS SUPERIORES (ADULTO E PEDIATRIA):",
    "   - 9.1 Otoscopia: Membrana timpânica íntegra normal (translúcida, perolada, triângulo luminoso e cabo do martelo visíveis); Otite Média Aguda - OMA (hiperemia acentuada, abaulamento timpânico com perda dos marcos anatômicos, nível hidroaéreo ou perfuração com otorreia purulenta); Otite Externa (edema difuso do conduto auditivo com debris e dor intensa à tração do pavilhão/trago); Otite Média Secretora/Efusão (MT retraída, âmbar ou com bolhas).",
    "   - 9.2 Oroscopia e Faringe: Faringoamigdalite Bacteriana por Estreptococo (hiperemia, amígdalas hipertrofiadas com exsudato purulento confluente, petéquias em palato mole - escore de Centor/McIsaac); Mononucleose Infecciosa (exsudato espesso membranoso, adenomegalia cervical posterior simétrica, esplenomegalia); Abscesso Periamigdaliano (abaulamento unilateral de pilar anterior, desvio contralateral da úvula e trismo - indicação de punção/drenagem).",
    "",
    "10. SE FOR CARDIOTOCOGRAFIA (CTG) E MEDICINA FETAL / OBSTETRÍCIA:",
    "   - 10.1 FCF Basal: Normal (110 a 160 bpm), Taquicardia fetal (> 160 bpm por > 10 min - febre materna, corioamnionite), Bradicardia fetal (< 110 bpm - sofrimento fetal agudo, DPP).",
    "   - 10.2 Variabilidade da FCF: Ausente (linha reta - acidose fetal grave), Mínima (<= 5 bpm), Moderada normal (6 a 25 bpm - boa oxigenação), Saltatória (> 25 bpm), Padrão Sinusoidal (onda regular e suave de 3 a 5 ciclos/min por > 20 min = anemia fetal grave / descolamento prematuro - cesárea de emergência).",
    "   - 10.3 Acelerações Transitórias: Elevação >= 15 bpm por >= 15 segundos (feto reativo).",
    "   - 10.4 Desacelerações: DIP I ou Precoce (espelho da contração por compressão cefálica - reflexo vagal fisiológico); DIP II ou Tardia (nadir após o pico da contração uterina = insuficiência placentária e hipóxia fetal aguda - alarme crítico); DIP III ou Variável (formato em V ou U por compressão de cordão).",
    "   - 10.5 Categorização FIGO/ACOG: Categoria I (Normal / fisiológica); Categoria II (Indeterminada / ressuscitação intrauterina e vigilância contínua); Categoria III (Anormal: variabilidade ausente com desacelerações tardias/variáveis ou bradicardia ou sinusoidal - interrupção imediata da gestação).",
    "",
    "11. SE FOR ENDOSCOPIA DIGESTIVA ALTA (EDA) E HEMORRAGIA DIGESTIVA:",
    "   - 11.1 Classificação de Forrest (Úlcera Péptica Sangrante e Risco de Ressangramento):",
    "     * Forrest Ia: Sangramento arterial ativo em jato (ressangramento ~90% - endoterapia combinada de emergência).",
    "     * Forrest Ib: Sangramento ativo em porejamento / babando (ressangramento ~20-30% - hemostasia combinada).",
    "     * Forrest IIa: Vaso visível não sangrante na base da úlcera (ressangramento ~50% - endoterapia combinada).",
    "     * Forrest IIb: Coágulo aderido resistente à lavagem (ressangramento ~25-30% - remoção com alça e hemostasia seletiva).",
    "     * Forrest IIc: Base hematínica com manchas escuras (ressangramento < 10% - IBP sem necessidade de endoterapia).",
    "     * Forrest III: Base limpa de fibrina branca (ressangramento < 5% - alta precoce com IBP oral).",
    "   - 11.2 Varizes Esofágicas e Gástricas: Calibre (finas < 3mm, médias 3-5mm, grossas > 5mm); Sinais da cor vermelha (red spots / manchas vermelho-cereja = iminência de ruptura - ligadura elástica profilática ou terapêutica).",
    "   - 11.3 Esofagite de Refluxo (Classificação de Los Angeles Graus A a D).",
    "",
    "12. SE FOREM FRATURAS, LUXAÇÕES E ORTOPEDIA (RX E TC MUSCULOESQUELÉTICO):",
    "   - 12.1 Classificação de Salter-Harris (Fises Pediátricas): Tipo I (separação fisária pura), Tipo II (fratura fisária com fragmento metafisário / sinal de Thurston-Holland - a mais comum), Tipo III (fratura fisária estendendo-se à epífise articular), Tipo IV (transfixante de metáfise, fise e epífise), Tipo V (compressão/esmagamento fisário).",
    "   - 12.2 Fraturas Expostas (Classificação de Gustilo-Anderson): Grau I (ferimento puntiforme < 1cm limpo), Grau II (ferida 1 a 10cm sem lesão extensa), Grau IIIa (ferimento > 10cm com cobertura óssea adequada), Grau IIIb (ampla perda de partes moles e periósteo exposto), Grau IIIc (fratura com lesão vascular associada exigindo reparo - risco de perda do membro).",
    "   - 12.3 Fraturas Ocultas e Luxações: Sinal do Coxim Gorduroso (Fat Pad Sign / Vela de Barco) no cotovelo (deslocamento dos coxins anterior/posterior indicando hemartrose por fratura oculta de cabeça de rádio ou supracondiliana); Luxações articulares (glenoumeral anterior vs posterior com sinal da lâmpada, luxação coxofemoral).",
    "",
    "13. SE FOREM FERIDAS CRÔNICAS, QUEIMADURAS E LESÕES POR PRESSÃO:",
    "   - 13.1 Estadiamento de Lesões por Pressão (NPUAP/EPUAP): Estágio 1 (eritema não branqueável em pele íntegra sobre proeminência óssea); Estágio 2 (perda parcial da espessura dérmica, úlcera rasa com leito avermelhado sem esfacelo ou flictena intacta/rompida); Estágio 3 (perda total da espessura cutânea com tecido adiposo visível, sem atingir músculo/osso); Estágio 4 (perda total com exposição de fáscia, músculo, tendão ou osso visível/palpável); Não Classificável (leito coberto por esfacelo ou necrose/escara); Lesão Tissular Profunda (área localizada de cor púrpura/marrom intacta ou bolha hemática).",
    "   - 13.2 Avaliação do Leito da Ferida (TIME): Tecido (percentual de granulação vermelho vivo, esfacelo úmido amarelado, necrose seca preta); Infecção (eritema perilesional, calor, odor fétido, exsudato purulento); Umidade (exsudato seroso, hemorrágico, purulento); Bordas (maceradas, descoladas, enroladas).",
    "   - 13.3 Queimaduras: Profundidade (1º grau eritematoso; 2º grau superficial com flictenas e base rósea muito dolorosa; 2º grau profundo com base branca e hipoestésica; 3º grau aspecto coriáceo/nacarado indolor); Cálculo da Área Queimada pela Regra dos Nove de Wallace e hidratação guiada pela Fórmula de Parkland (2-4 mL x Peso x %SCQ nas primeiras 24h, metade nas primeiras 8 horas).",
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
    thinkingBudget: 2048,
    clinico: true,
    multimodal: true,
    timeoutMs: Number(_iaCfg("IA_MULTIMODAL_TIMEOUT_MS", 25000)) || 25000,
    orcamentoMs: Number(_iaCfg("IA_MULTIMODAL_TIMEOUT_MS", 25000)) || 25000
  }, opcoes);

  var resLaudo = chamarGeminiPoolMultimodal(base64Data, mimeType, sistema, promptInstrucao, opts);
  if (!resLaudo && opcoes.fallbackOffline !== false && typeof IaLocalFallbackService !== "undefined" && IaLocalFallbackService && typeof IaLocalFallbackService.analisarImagemOffline === "function") {
    return IaLocalFallbackService.analisarImagemOffline(contextoTexto, mimeType, opcoes);
  }
  return resLaudo;
}

// ==============================================================================
// AUDITORIA DE SEGURANÇA MEDICAMENTOSA (segunda passada, opcional)
// ==============================================================================

function auditoriaClinicaPendente(texto) {
  return /auditoria autom[aá]tica (?:indispon[ií]vel|incompleta)|alertas da auditoria autom[aá]tica/i.test(String(texto || ""));
}

/**
 * Auditor Aritmético Pós-IA de Conversão Posológica (mg -> mL / gotas).
 * Detecta discrepâncias matemáticas > 12% entre a dose indicada em mg e o volume informado em mL ou gotas.
 */
function _iaAuditarMatematicaPosologica(textoGerado) {
  if (!textoGerado || typeof textoGerado !== "string") return null;

  var linhas = textoGerado.split(/\n+/);
  var errosDetectados = [];

  for (var i = 0; i < linhas.length; i++) {
    var l = linhas[i].trim();
    if (!l || l.length < 10) continue;

    // 1. Extrai concentração (ex: 250mg/5mL, 125mg/5mL, 500mg/mL, 200 mg em 5 ml)
    var mConcDupla = l.match(/(\d+(?:[.,]\d+)?)\s*mg\s*(?:\/|\s+em\s+)\s*(\d+(?:[.,]\d+)?)\s*m[Ll]/i);
    var mConcSimples = !mConcDupla ? l.match(/(\d+(?:[.,]\d+)?)\s*mg\s*\/\s*m[Ll]/i) : null;

    var concMgPorMl = null;
    var concDesc = "";
    if (mConcDupla) {
      var mgC = parseFloat(mConcDupla[1].replace(",", "."));
      var mlC = parseFloat(mConcDupla[2].replace(",", "."));
      if (mgC > 0 && mlC > 0) {
        concMgPorMl = mgC / mlC;
        concDesc = mConcDupla[1] + "mg/" + mConcDupla[2] + "mL";
      }
    } else if (mConcSimples) {
      var mgS = parseFloat(mConcSimples[1].replace(",", "."));
      if (mgS > 0) {
        concMgPorMl = mgS;
        concDesc = mConcSimples[1] + "mg/mL";
      }
    }

    if (!concMgPorMl) continue;

    // 2. Extrai dose indicada em mg (ex: "dose de 250 mg", "250 mg", "dose: 500mg")
    var mDose = l.match(/(?:dose(?:\s+de|\s*[:=])?\s*)(\d+(?:[.,]\d+)?)\s*mg\b/i) ||
      l.match(/\((\s*\d+(?:[.,]\d+)?\s*mg\s*)\)/i) ||
      l.match(/\b(\d+(?:[.,]\d+)?)\s*mg\b/i);

    var doseMg = null;
    if (mDose) {
      doseMg = parseFloat(mDose[1].replace(",", "."));
      var mDoseExpl = l.match(/(?:dose(?:\s+de|\s*[:=])?\s*|\()(\d+(?:[.,]\d+)?)\s*mg/i);
      if (mDoseExpl) {
        doseMg = parseFloat(mDoseExpl[1].replace(",", "."));
      }
    }

    if (!doseMg || doseMg <= 0) continue;

    // 3. Extrai volume a administrar em mL ou gotas
    var mVolMl = l.match(/(?:tomar|administrar|dar|prescrever|ingerir|posologia[:\s]*)\s*(\d+(?:[.,]\d+)?)\s*m[Ll]\b/i) ||
      l.match(/(\d+(?:[.,]\d+)?)\s*m[Ll]\s*(?:por\s+via|vo|via\s+oral|de\s+\d+\/\d+h|a\s+cada|\d+x|x\s+ao\s+dia|de\s+hor[aá]rio)/i) ||
      l.match(/:\s*(\d+(?:[.,]\d+)?)\s*m[Ll]\b/i);

    var mGotas = l.match(/(\d+)\s*gotas\b/i);

    var volInformadoMl = null;
    if (mVolMl) {
      volInformadoMl = parseFloat(mVolMl[1].replace(",", "."));
    } else if (mGotas) {
      var numGotas = parseInt(mGotas[1], 10);
      volInformadoMl = numGotas / 20; // 20 gotas = 1 mL
    }

    if (!volInformadoMl || volInformadoMl <= 0) continue;

    var volEsperadoMl = doseMg / concMgPorMl;
    var erroRelativo = Math.abs(volEsperadoMl - volInformadoMl) / volEsperadoMl;

    if (erroRelativo > 0.12) {
      var volFormatado = (Math.round(volEsperadoMl * 10) / 10).toString().replace(".", ",");
      var volInfFormatado = volInformadoMl.toString().replace(".", ",");
      var tipoErro = volInformadoMl > volEsperadoMl ? "superdosagem" : "subdosagem";
      errosDetectados.push("ERRO ARITMÉTICO NA PRESCRIÇÃO (" + concDesc + "): Dose indicada: " + doseMg + " mg ➔ Volume correto: " + volFormatado + " mL (prescrito: " + volInfFormatado + " mL). Risco grave de " + tipoErro + "!");
    }
  }

  return errosDetectados.length > 0 ? errosDetectados.join("\n") : null;
}

function _iaAnexarCrossCheckSeguranca(rascunho, dadosCaso) {
  if (!rascunho) return rascunho;
  var alertasSentinela = [];

  if (typeof executarCrossCheckSegurancaClinica === "function") {
    try {
      var check = executarCrossCheckSegurancaClinica(rascunho + "\n" + (dadosCaso || ""), dadosCaso);
      if (check && check.temAlertasCriticos) {
        if (check.interacoes) {
          check.interacoes.filter(function(it) {
            return it.grauNormalizado === "CONTRAINDICADO" || it.grauNormalizado === "GRAVE";
          }).forEach(function(it) {
            alertasSentinela.push("• 🛑 *Interação " + it.grau + ":* " + it.drogaA + " + " + it.drogaB + " (" + (it.recomendacao || it.efeito) + ")");
          });
        }
        if (check.compatibilidadeY) {
          check.compatibilidadeY.filter(function(p) {
            return p.status === "INCOMPATIVEL" || p.alertaCritico;
          }).forEach(function(p) {
            alertasSentinela.push("• 🛑 *Incompatibilidade em Y:* " + p.drogaA.toUpperCase() + " ⚡ " + p.drogaB.toUpperCase() + " (" + p.conduta + ")");
          });
        }
        if (check.alergias && check.alergias.length > 0) {
          check.alergias.forEach(function(al) {
            var iconeAl = al.tipo === "CONTRAINDICADO" ? "🛑" : "⚠️";
            alertasSentinela.push("• " + iconeAl + " *Alergia/Risco Cruzado (" + al.tipo + "):* `" + al.farmaco.toUpperCase() + "` — " + al.motivo);
          });
        }
        if (check.gestacao && check.gestacao.length > 0) {
          check.gestacao.forEach(function(gt) {
            alertasSentinela.push("• 🛑 *Contraindicado na Gestação (Cat " + gt.categoriaFda + "):* `" + gt.farmaco.toUpperCase() + "` — " + gt.risco);
          });
        }
      }
    } catch (eCheck) {
      Logger.log("Aviso no cross-check de segurança: " + eCheck.message);
    }
  }

  // Validador aritmético pós-IA
  try {
    var alertaMatematica = _iaAuditarMatematicaPosologica(rascunho);
    if (alertaMatematica) {
      alertasSentinela.push("• 🚨 *" + alertaMatematica + "*");
    }
  } catch (eMat) {
    Logger.log("Aviso na auditoria matemática: " + eMat.message);
  }

  if (alertasSentinela.length > 0) {
    return rascunho + "\n\n⚠️ *ALERTAS CRÍTICOS DE SEGURANÇA FARMACOLÓGICA:*\n" + alertasSentinela.join("\n");
  }

  return rascunho;
}

function _iaAuditarRascunho(rascunho, dadosCaso, titulo, baseMedicamentos) {
  if (!rascunho) return rascunho;

  // 1. Cross-Check determinístico imediato em RAM (0ms) contra bases locais (interações, HSL e REMUME)
  var rascunhoComCrossCheck = _iaAnexarCrossCheckSeguranca(rascunho, dadosCaso);

  // Se a segunda passada de LLM estiver desativada (padrão de latência zero),
  // retorna imediatamente com a validação determinística de RAM
  if (!_iaCfgBool("IA_AUDITORIA_LLM_SEGUNDA_PASSADA", false)) {
    return rascunhoComCrossCheck;
  }

  var sistema = [
    "Você é um auditor de segurança medicamentosa e de conformidade com diretrizes clínicas.",
    "Receba o CASO e o RASCUNHO e liste SOMENTE problemas reais e críticos de segurança do paciente:",
    "- dose tóxica acima do teto ou subdose ineficaz; ausência de ajuste renal obrigatório; contraindicação absoluta ou interação grave;",
    "- ausência de peso para cálculo pediátrico obrigatório ou erro aritmético de dosagem;",
    "- conduta em desacordo com AHA 2025 (PCR), Surviving Sepsis Campaign (sepse) ou diretrizes brasileiras vigentes.",
    "DIRETRIZ DE CONCISÃO:",
    "1. Se a conduta e posologia estiverem clinicamente seguras e aceitáveis, responda ESTRITAMENTE: SEM ALERTAS.",
    "2. NÃO aponte variações cosméticas, arredondamentos práticos de volume ou detalhes triviais.",
    "3. Se houver erro crítico real, liste apenas os problemas em tópicos diretos iniciados por '- ' (máximo 1 linha por alerta).",
    "Não use LaTeX. Não reescreva o rascunho."
  ].join("\n");
  var contexto = "CASO:\n" + dadosCaso + "\n\nRASCUNHO:\n" + rascunho;
  if (typeof baseMedicamentos === "string") contexto += "\n\nBASE MEDICAMENTOSA FORNECIDA AO GERADOR (REMUME E HSL; padronização não comprova indicação ou estoque):\n" + baseMedicamentos;
  var r = null;
  try { r = _iaExecutar(sistema, contexto, 600, { clinico: true, exigirRespostaCompleta: true }); }
  catch (e) { Logger.log("Auditoria automática indisponível."); }
  var limpo = String(r || "").trim();
  if (!limpo) return rascunhoComCrossCheck + "\n\n⚠️ *Auditoria automática indisponível — revisão pendente*\nNão foi possível concluir a segunda revisão. Este rascunho não foi liberado pela auditoria; confira-o antes de qualquer uso.";
  if (/^SEM ALERTAS\.?$/i.test(limpo)) return rascunhoComCrossCheck;
  if (!/^-\s+/m.test(limpo) || /resposta interrompida por limite/i.test(limpo)) {
    return rascunhoComCrossCheck + "\n\n⚠️ *Auditoria automática incompleta — revisão pendente*\nA revisão não produziu uma conclusão completa. Retorno recebido:\n" + _iaFinalizarTexto(limpo);
  }
  return rascunhoComCrossCheck + "\n\n🛑 *Alertas da auditoria automática (" + titulo + ") — revisão pendente*\n" + _iaFinalizarTexto(limpo);
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
  var itens = Array.isArray(v) ? v.filter(function(x) { return typeof x === "string" && x.trim(); }) : [];
  return itens.length ? itens.map(function(x) { return "• " + x; }).join("\n") : fallback;
}

// Mesma barreira factual para SOAP escrito, consolidado e extraído de áudio.
// Verifica medidas; não pretende validar semanticamente todo o exame físico.
function sanitizarObjetivoComRelato(objetivo, casoClinico) {
  var fonte = String(casoClinico || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  var texto = Array.isArray(objetivo) ? objetivo.join("\n") : String(objetivo || "");
  var regras = [
    { re: /\b(?:pa\s*[:=]?\s*)?(\d{2,3})\s*[x/]\s*(\d{2,3})\b/gi, tipo: "pa" },
    { re: /\b(?:fc|frequencia cardiaca)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:bpm)?\b/gi, tipo: "fc" },
    { re: /\b(\d+(?:[.,]\d+)?)\s*bpm\b/gi, tipo: "fc" },
    { re: /\b(?:fr|frequencia respiratoria)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:irpm|rpm)?\b/gi, tipo: "fr" },
    { re: /\b(\d+(?:[.,]\d+)?)\s*(?:irpm|rpm)\b/gi, tipo: "fr" },
    { re: /\b(?:spo2|sp[oO]₂|sato2|sat|saturacao)\s*[:=]?\s*(\d+(?:[.,]\d+)?)%?/gi, tipo: "spo2" },
    { re: /\b(?:tax|temperatura|temp)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:°?c)?\b/gi, tipo: "temperatura" },
    { re: /\b(\d+(?:[.,]\d+)?)\s*°c\b/gi, tipo: "temperatura" },
    { re: /\b(\d+(?:[.,]\d+)?)\s*mmhg\b/gi, tipo: "pressao" }
  ];
  function chave(regra, match) {
    return regra.tipo + ':' + match.slice(1).map(function(v) { return Number(String(v).replace(',', '.')); }).join('/');
  }
  var confirmadas = {};
  regras.forEach(function(regra) {
    Array.from(fonte.matchAll(regra.re)).forEach(function(m) { confirmadas[chave(regra, Array.from(m))] = true; });
  });
  // Usa índices do texto normalizado (acentos portugueses não alteram o tamanho).
  var normalizado = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  var pendentes = [], intervalosConfirmados = [];
  regras.forEach(function(regra) {
    Array.from(normalizado.matchAll(regra.re)).forEach(function(m) {
      var intervalo = { inicio: m.index, fim: m.index + m[0].length };
      if (!confirmadas[chave(regra, Array.from(m))]) pendentes.push(intervalo);
      else intervalosConfirmados.push(intervalo);
    });
  });
  // Ex.: PA 120/80 mmHg é a mesma medida de PA 120x80; a captura
  // secundária de "80 mmHg" não invalida uma PA já confirmada.
  pendentes = pendentes.filter(function(p) {
    return !intervalosConfirmados.some(function(ok) { return p.inicio >= ok.inicio && p.inicio < ok.fim; });
  });
  // Une capturas sobrepostas (ex.: FC 80 bpm e 80 bpm).
  pendentes.sort(function(a,b) { return a.inicio - b.inicio; });
  var unidas = [];
  pendentes.forEach(function(p) {
    var ultima = unidas[unidas.length - 1];
    if (ultima && p.inicio <= ultima.fim) ultima.fim = Math.max(ultima.fim, p.fim);
    else unidas.push(p);
  });
  unidas.reverse().forEach(function(p) {
    texto = texto.slice(0, p.inicio) + '[medida não confirmada no relato]' + texto.slice(p.fim);
  });
  return texto.trim();
}

function sanitizarSubjetivoSemExameFisico(texto) {
  var t = String(texto || '').trim();
  var matchEf = t.search(/(?:\n|^)\s*(?:sinais\s+vitais\s*:|exame\s+f[ií]sico(?:\s+geral)?\s*:|geral\s*:\s*(?:bom\s+estado|beg|regular|l[uú]cido)|acv\s*:|ar\s*:|abdome\s*:|extremidades\s*:)/i);
  if (matchEf > 0) {
    var parteSub = t.slice(0, matchEf).trim();
    if (parteSub) return parteSub;
  }
  return t;
}

function sanitizarNegativasSOAP(texto, casoClinico) {
  var fonte = String(casoClinico || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  var t = String(texto || '');
  if (!/\b(?:nega|sem)\s+alergias?\b|alergias?\s*:\s*(?:nega|nenhuma)/.test(fonte)) {
    t = t.replace(/(?:nega|sem)\s+alergias?(?:\s+medicamentosas?)?(?:\s+conhecidas?)?/gi, 'Alergias: informação não confirmada; conferir relato');
  }
  if (!/\b(?:nega|sem)\s+(?:uso\s+de\s+)?medica(?:coes|mentos)\b|nao\s+(?:usa|toma)\s+medica(?:coes|mentos)/.test(fonte)) {
    t = t.replace(/nega\s+(?:uso\s+de\s+)?medica(?:ções|mentos)(?:\s+cont[ií]nu[oa]s?)?/gi, 'Medicações de uso contínuo: não informado');
  }
  return sanitizarSubjetivoSemExameFisico(t);
}

function verificarEExpandirExameFisicoObjetivo(objetivoTexto, casoClinico) {
  var fonte = String(casoClinico || "").toLowerCase();
  var temEfNormalNoCaso = /totalmente\s+normal|exame\s+f[ií]sico\s+geral\s+e\s+segmentar\s+completo|\[exame\s+f[ií]sico\s+normal\]|\bmodelo\s+(?:de\s+)?ef\s+normal\b|\bbom\s+estado\s+geral,\s+l[uú]cido|\bsem\s+edema\s+de\s+membros\s+inferiores\b|\bpulsos?\s+radiai[s]\b/i.test(fonte);
  if (!temEfNormalNoCaso) return objetivoTexto;

  var objStr = String(objetivoTexto || "").trim();
  // Se a resposta for resumida ou omitir sistemas essenciais (ACV, AR, Abdome, Extremidades)
  var ehResumido = objStr.length < 160 ||
    !/(?:acv|cardiovascular)/i.test(objStr) ||
    !/(?:ar|respirat[oó]rio)/i.test(objStr) ||
    !/(?:abdome|abdominal)/i.test(objStr) ||
    !/(?:extremidades|membros\s+inferiores)/i.test(objStr);

  if (ehResumido) {
    var modeloCompleto = (typeof obterModeloExameFisicoCompleto === "function")
      ? obterModeloExameFisicoCompleto(casoClinico)
      : (typeof SoapAmbulatorialService !== "undefined" && SoapAmbulatorialService.MODELOS_EXAME_FISICO ? SoapAmbulatorialService.MODELOS_EXAME_FISICO.padrao_completo.texto : objStr);
    if (typeof formatarExameFisicoSistemas === "function") {
      modeloCompleto = formatarExameFisicoSistemas(modeloCompleto);
    }
    return modeloCompleto;
  }
  if (typeof formatarExameFisicoSistemas === "function") {
    objStr = formatarExameFisicoSistemas(objStr);
  }
  return objStr;
}

function gerarSOAPComIA(casoClinico, opcoes) {
  opcoes = opcoes || {};
  var fecharPlano = !!(opcoes.fecharPlano || verificarPedidoExplicitoPlano(casoClinico) || opcoes.ambulatorialAgil);
  var ambulatorialAgil = !!(opcoes.ambulatorialAgil || /ambulatori[oa]|consulta\s+rapida|atencao\s+primaria|posto\s+de\s+saude|ubs/i.test(casoClinico));
  var dadosCaso = String(casoClinico || "").trim();

  if (fecharPlano) {
    // =========================================================================
    // FASE 2: SOAP COMPLETO CONSOLIDADO (AVALIAÇÃO E PLANO)
    // =========================================================================
    var baseSoap;
    try { baseSoap = obterContextoMedicamentosParaIA(dadosCaso).texto; }
    catch (eBaseSoap) { baseSoap = 'Base medicamentosa indisponível. Não finalize doses ou prescrições sem conferir a referência e os dados necessários.'; }
    var promptSistemaConsolidado = [
      IA_PERSONA, IA_SEGURANCA_MEDICAMENTOSA, baseSoap,
      "MODO: DOCUMENTAÇÃO CLÍNICA SOAP - FASE 2: CONSOLIDAÇÃO COMPLETA (AVALIAÇÃO E PLANO).",
      "Você é o Copiloto Clínico Sênior (FMRP-USP). Estruture o caso em prontuário SOAP definitivo, sintético e pronto para o PEP.",
      "",
      "DIRETRIZES TÉCNICAS E SÍNTESE OBRIGATÓRIA:",
      "1. SUBJETIVO (S): QP e HDA estruturadas, limpas e telegráficas. Antecedentes/Medicações/Alergias em 1 linha compacta ('Não informado' se ausentes). NUNCA crie parágrafos prolixos.",
      "2. OBJETIVO (O): Sinais vitais e achados informados organizados por sistemas. Cada sistema DEVE estar em uma linha diferente separada por quebra de linha (\\n): Sinais Vitais / Geral / ACV / AR / Abdome / Extremidades. Para sinais vitais não informados, reserve o espaço [   ] com a unidade (PA: [   ] mmHg | FC: [   ] bpm | FR: [   ] irpm | SpO2: [   ]% em ar ambiente | T: [   ]°C). Incorpore exame especial se presente.",
      "   - DIRETRIZ MANDATÓRIA DE EXAME FÍSICO NORMAL: Se o caso contiver exame físico normal completo ou indicação de 'totalmente normal', TRANSCREVA NA ÍNTEGRA no 'objetivo' todos os sistemas examinados estruturados (Sinais Vitais, Geral, ACV, AR, Abdome e Extremidades), cada um em sua própria linha separada. NUNCA sintetize em apenas 'EF normal' ou 'exame físico sem alterações' e NUNCA junte na mesma linha.",
      "3. AVALIAÇÃO (A):",
      "   - Diagnóstico principal ou problema sindrômico com CID-10 e CIAP-2 OBRIGATÓRIOS (ex: Hipertensão Arterial Sistêmica - CID-10 I10, CIAP-2 K86).",
      "   - Estratificação de risco/estágio clínico e diagnósticos diferenciais pertinentes em ordem de probabilidade/gravidade. Sem teorizações prolixas.",
      "4. PLANO (P): divida em Prescrição Pronta Copy-Paste (UBS/REMUME ou Urgência/Enfermaria conforme cenário), Exames que mudam conduta imediata e Orientações/Sinais de Alarme.",
      "   - Prescrição: estruture claramente por via de administração:",
      "     * [VIA ORAL]: Fármaco, apresentação, dose, intervalo e duração do tratamento.",
      "     * [PARENTERAL/EMERGÊNCIA]: Fármaco, dose, diluente (ex: SF 0,9% 100ml), tempo ou velocidade de infusão e via (EV/IM/SC).",
      "     * Somente quando segurança e referência permitirem. Se faltarem dados imprescindíveis (alergias, gestação, peso, função renal), aponte a lacuna e NÃO invente dose.",
      "   - Exames: apenas os que alteram conduta no cenário.",
      "   - Orientações e Sinais de Alarme (RED FLAGS OBRIGATÓRIOS EM LINGUAGEM LEIGA): Redija os sinais de alarme de retorno imediato ao PS em linguagem direta e acessível ao paciente/familiar (ex: 'dificuldade para falar frases completas sem pausar para respirar', 'febre que não baixa após 48h de antibiótico', 'dor na barriga forte e contínua', 'sonolência excessiva com dificuldade para acordar', 'lábios arroxeados'). NUNCA use jargões indecifráveis como 'dispneia' ou 'sinais de choque'.",
      ambulatorialAgil ? "   - Foco APS: Prescrição REMUME, sinais de alarme para PS e meta de reavaliação." : "",
      "5. PENDÊNCIAS CRÍTICAS: Liste apenas dados que condicionem a segurança antes de prescrever; omita se não houver.",
      "",
      "Contrato JSON estrito:",
      '{"subjetivo":"QP, HDA e antecedentes confirmados","objetivo":"achados e sinais vitais informados","avaliacao":["hipótese principal com CID-10 e diferenciais pertinentes"],"plano":{"prescricao":["prescrição pronta com via ou lacuna de segurança"],"exames":["exame que muda conduta imediata"],"orientacoes":["orientações e sinais de alarme em linguagem leiga"]},"pendencias_opcionais":["dado crítico ausente"]}'
    ].join("\n");

    var rawCons = executarRaciocinioClinico(promptSistemaConsolidado, "CASO CLÍNICO:\n" + dadosCaso, 3500, { json: true });
    var objCons = _iaExtrairJSON(rawCons);
    if (!objCons || typeof objCons !== 'object') {
      if (typeof rawCons === 'string' && (rawCons.indexOf('MODO OFFLINE') !== -1 || rawCons.indexOf('CONTINGÊNCIA') !== -1 || rawCons.indexOf('PARADA') !== -1 || rawCons.indexOf('PCR') !== -1)) {
        objCons = {
          subjetivo: dadosCaso,
          objetivo: 'Monitorização multiparamétrica e suporte vital avançado.',
          avaliacao: ['Emergência clínica aguda / Protocolo de contingência'],
          plano: [rawCons],
          contingencia_offline: true
        };
      } else {
        objCons = {};
      }
    }

    var sTexto = (typeof objCons.subjetivo === "string" && objCons.subjetivo.trim())
      ? sanitizarNegativasSOAP(objCons.subjetivo.trim(), dadosCaso)
      : sanitizarSubjetivoSemExameFisico(dadosCaso.replace(/Atualização:\s*/gi, "").trim());
    var oTexto = sanitizarObjetivoComRelato(objCons.objetivo, dadosCaso) || "Exame físico não informado; pendente de avaliação.";
    oTexto = verificarEExpandirExameFisicoObjetivo(oTexto, dadosCaso);
    if (typeof formatarExameFisicoSistemas === "function") {
      oTexto = formatarExameFisicoSistemas(oTexto);
    }
    var pendencias = Array.isArray(objCons.pendencias_opcionais) ? objCons.pendencias_opcionais.filter(Boolean) : [];

    var planoCons = objCons.plano || {};
    var planoTexto = Array.isArray(planoCons)
      ? "Prescrição Pronta Copy-Paste (UBS/REMUME ou Urgência/Enfermaria)\n" + formatarListaTopicos(planoCons, "Conduta a definir após conferir dados de segurança.")
      : "Prescrição Pronta Copy-Paste (UBS/REMUME ou Urgência/Enfermaria)\n" + formatarListaTopicos(planoCons.prescricao, "Prescrição condicionada à conferência de dados clínicos e segurança.") +
        "\nExames que mudam conduta imediata\n" + formatarListaTopicos(planoCons.exames, "Nenhum exame imediato indicado pelos dados informados.") +
        "\nOrientações/Sinais de Alarme\n" + formatarListaTopicos(planoCons.orientacoes, "Reavaliar conforme evolução e orientar retorno diante de piora.");
    if (pendencias.length) planoTexto += "\nDados pendentes — conferir antes de concluir\n" + formatarListaTopicos(pendencias, "");

    // Bloco Limpo para Prontuário Eletrônico (PEP) - Cópia em 1 Toque
    var sPep = sTexto.replace(/\*/g, '').trim();
    var oPep = oTexto.replace(/\*/g, '').trim();
    var aPep = (Array.isArray(objCons.avaliacao) ? objCons.avaliacao : [objCons.avaliacao || '']).filter(Boolean).map(function(item) { return String(item).replace(/\*/g, '').trim(); }).join('; ');
    var pPep = "";
    if (Array.isArray(planoCons)) {
      pPep = planoCons.map(function(item) { return String(item).replace(/\*/g, '').trim(); }).join('\n');
    } else {
      var partesP = [];
      if (planoCons.prescricao && planoCons.prescricao.length) {
        partesP.push("PRESCRIÇÃO:\n" + planoCons.prescricao.map(function(x) { return "• " + String(x).replace(/\*/g, '').trim(); }).join('\n'));
      }
      if (planoCons.exames && planoCons.exames.length) {
        partesP.push("EXAMES:\n" + planoCons.exames.map(function(x) { return "• " + String(x).replace(/\*/g, '').trim(); }).join('\n'));
      }
      if (planoCons.orientacoes && planoCons.orientacoes.length) {
        partesP.push("ORIENTAÇÕES:\n" + planoCons.orientacoes.map(function(x) { return "• " + String(x).replace(/\*/g, '').trim(); }).join('\n'));
      }
      pPep = partesP.join('\n\n');
    }

    var blocoPep = "```text\n" +
      "[REGISTRO SOAP - PRONTUÁRIO ELETRÔNICO]\n\n" +
      "S: " + sPep + "\n\n" +
      "O:\n" + oPep + "\n\n" +
      "A: " + aPep + "\n\n" +
      "P:\n" + pPep + "\n" +
      "```";

    var blocosCons = [
      "🩺 *SÍNTESE SOAP · REGISTRO CONSOLIDADO*",
      "👤 *S - Subjetivo*\n" + sTexto,
      "🔍 *O - Objetivo*\n" + oTexto,
      "🧠 *A - Avaliação*\n" + formatarListaTopicos(objCons.avaliacao, "Avaliação diagnóstica a definir pelo médico assistente."),
      "📋 *P - Plano*\n" + planoTexto,
      "📋 *CÓPIA DIRETA PARA O PEP (1 TOQUE)*\n" + blocoPep
    ];

    if (objCons.contingencia_offline) {
      blocosCons.unshift("⚠️ *MODO OFFLINE DE CONTINGÊNCIA (PROVEDOR EM NUVEM EM TIMEOUT)*\nProcessado pelo Motor Determinístico Offline.");
    }

    var consolidado = _iaFinalizarTexto(blocosCons.join("\n\n"));
    if (_iaCfgBool("IA_AUDITORIA_PRESCRICAO", true)) {
      consolidado = _iaAuditarRascunho(consolidado, dadosCaso, "plano SOAP", baseSoap);
    }
    return consolidado;
  }

  // =========================================================================
  // FASE 1: RASCUNHO CLÍNICO INTERATIVO (ANAMNESE + EXAME FÍSICO INTELIGENTE)
  // REGRA: NÃO INCLUIR AVALIAÇÃO NEM PLANO NESTA FASE
  // =========================================================================
  var promptSistemaRascunho = [
    IA_PERSONA,
    "MODO: DOCUMENTAÇÃO CLÍNICA SOAP - FASE 1: ANAMNESE E EXAME FÍSICO.",
    "Você é o Copiloto Clínico Sênior (FMRP-USP). Estruture o relato do médico de forma concisa, técnica, sem enrolação e sem parágrafos prolixos.",
    "",
    "DIRETRIZES SEMIOLÓGICAS E SÍNTESE OBRIGATÓRIA:",
    "1. SUBJETIVO (S) - SÍNTESE ESTRUTURADA:",
    "   - QP e HDA com cronologia e caracterização semiológica direta.",
    "   - Antecedentes/Medicações/Alergias: registre se informados; se não informados, declare 'Não informado' de forma compacta em 1 linha.",
    "2. EXAME FÍSICO (O):",
    "   - Cada sistema DEVE estar em uma linha diferente separada por quebra de linha (\\n): Sinais Vitais / Geral / ACV / AR / Abdome / Extremidades. NUNCA junte sistemas na mesma linha.",
    "   - Sinais Vitais: registre os relatados. Para sinais vitais não informados, reserve o espaço [   ] com a unidade (PA: [   ] mmHg | FC: [   ] bpm | FR: [   ] irpm | SpO2: [   ]% em ar ambiente | T: [   ]°C).",
    "   - Sistemas examinados relatados. Se EF não informado, declare 'Exame físico pendente de avaliação beira-leito'.",
    "   - NUNCA assuma como normais os sistemas que são o FOCO ou suspeita central da queixa a menos que o médico tenha dito expressamente 'normal'. Para sistemas não informados e não examinados, declare explicitamente como pendentes à beira-leito.",
    "   - Integre exame especial se contido no caso.",
    "   - DIRETRIZ MANDATÓRIA DE EXAME FÍSICO NORMAL: Se o caso contiver exame físico normal completo ou indicação de 'totalmente normal', TRANSCREVA NA ÍNTEGRA no 'objetivo' todos os sistemas examinados estruturados (Sinais Vitais, Geral, ACV, AR, Abdome e Extremidades), cada um em sua própria linha separada. NUNCA junte na mesma linha e NUNCA sintetize em apenas 'EF normal'.",
    "3. INVESTIGAÇÃO ATIVA DA ANAMNESE COM JUSTIFICATIVA DIDÁTICA (FMRP-USP):",
    "   - Formule apenas perguntas que mudem a conduta, sem limite numérico, para lacunas críticas de QP/tempo, sinais de alarme pertinentes, alergias/comorbidades/medicações, G_P_A_/DUM/IG em queixa gineco-obstétrica e dado objetivo indispensável. Negativas explícitas já cobrem o eixo. Evite perguntas repetidas ou acadêmicas sem impacto na decisão.",
    "   - Se os pilares decisórios estiverem cobertos, retorne perguntas_anamnese=[] e a mensagem: ✅ Anamnese suficiente. Pode gerar o plano. Após respostas complementares, pergunte novamente somente sobre lacunas clínicas relevantes ainda não investigadas; registre dados indisponíveis como pendências de segurança.",
    "   - RIGOR DIDÁTICO OBRIGATÓRIO: Cada pergunta DEVE OBRIGATORIAMENTE conter sua justificativa clínica ou hipótese a descartar entre parênteses ao final. Exemplo: 'Investigar se a dor epigástrica irradia para o dorso (descartar pancreatite aguda ou dissecção de aorta abdominal)'.",
    "4. EXAME FÍSICO DIRIGIDO (SUGESTÃO COMPLEMENTAR):",
    "   - 1 a 2 tópicos com sinais vitais críticos (PA, FC, FR, SpO2, Tax) e manobras/auscultas essenciais para o caso que ainda não foram informados.",
    "5. REGRA ABSOLUTA DE SEGURANÇA: NÃO gere Avaliação nem Plano nesta fase.",
    "",
    "Contrato JSON estrito:",
    '{"subjetivo":"Texto limpo organizado com QP, HDA, Antecedentes, Medicações e Alergias","objetivo":"Texto estruturado do O por sistemas","perguntas_anamnese":["Pergunta clínica direta 1? (justificativa semiológica/hipótese a afastar)","Pergunta clínica direta 2? (racional clínico)"],"exame_dirigido":["sinal vital ou manobra física imprescindível"]}'
  ].join("\n");


  var rawRasc = executarRaciocinioClinico(promptSistemaRascunho, "CASO CLÍNICO:\n" + dadosCaso, 3000, { json: true, thinkingBudget: 0 });
  if (typeof rawRasc === "string" && rawRasc.indexOf("🩺") !== -1 && rawRasc.indexOf("S -") !== -1 && rawRasc.indexOf("MODO OFFLINE") === -1 && rawRasc.indexOf("CONTINGÊNCIA") === -1) {
    return "⚠️ Estruturação SOAP incompleta. Revise o relato original antes de registrar.\n\nRelato recebido:\n" + dadosCaso;
  }
  var objRasc = _iaExtrairJSON(rawRasc);
  if (!objRasc || typeof objRasc !== 'object') {
    if (typeof rawRasc === 'string' && (rawRasc.indexOf('MODO OFFLINE') !== -1 || rawRasc.indexOf('CONTINGÊNCIA') !== -1 || rawRasc.indexOf('PARADA') !== -1 || rawRasc.indexOf('PCR') !== -1)) {
      objRasc = {
        subjetivo: dadosCaso,
        objetivo: 'Monitorização multiparamétrica e suporte vital avançado.',
        plano: [rawRasc],
        contingencia_offline: true,
        perguntas_anamnese: ['Monitorar ritmo e pulso após cada ciclo de reanimação.'],
        exame_dirigido: ['Checagem de ritmo e pulso central a cada 2 minutos.']
      };
    } else {
      objRasc = {};
    }
  }

  var sRasc = (typeof objRasc.subjetivo === "string" && objRasc.subjetivo.trim())
    ? sanitizarNegativasSOAP(objRasc.subjetivo.trim(), dadosCaso)
    : sanitizarSubjetivoSemExameFisico(dadosCaso.replace(/Atualização:\s*/gi, "").trim());
  var oRasc = sanitizarObjetivoComRelato(objRasc.objetivo, dadosCaso);
  oRasc = verificarEExpandirExameFisicoObjetivo(oRasc, dadosCaso);
  if (typeof formatarExameFisicoSistemas === "function") {
    oRasc = formatarExameFisicoSistemas(oRasc);
  }
  if (!oRasc) oRasc = "Exame físico em estruturação; conferir sinais vitais e achados.";

  var historicoSoap = opcoes.historicoSessao || {};
  var suficiencia = typeof avaliarSuficienciaAnamnese === 'function'
    ? avaliarSuficienciaAnamnese(dadosCaso, historicoSoap)
    : { anamneseSuficiente: false, eixos: {} };
  var chavePergunta = function(p) { return String(p).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s*\([^)]*\)\s*$/, '').trim(); };
  var jaFeitas = (historicoSoap.perguntasFeitas || []).map(chavePergunta);
  var perguntas = (Array.isArray(objRasc.perguntas_anamnese) ? objRasc.perguntas_anamnese : (Array.isArray(objRasc.perguntas) ? objRasc.perguntas : [])).filter(function(p) {
    if (typeof p !== 'string' || !p.trim()) return false;
    var chave = chavePergunta(p);
    if (jaFeitas.indexOf(chave) !== -1) return false;
    if (/(alerg|comorb|medicac|medicamento|remedio|antecedente)/.test(chave) && suficiencia.eixos.seguranca) return false;
    if (/(dum|idade gestacional|\big\b|gesta|paridade)/.test(chave) && suficiencia.eixos.gineco) return false;
    if (/(sinais vitais|\bpa\b|saturac|\bspo2\b|\bfc\b|\bfr\b|temperatura)/.test(chave) && suficiencia.eixos.objetivo) return false;
    if (/(febre|dispneia|sangramento|sincope|sudorese|irradi|alarme)/.test(chave) && suficiencia.eixos.alarmes) return false;
    jaFeitas.push(chave);
    return true;
  });
  if (suficiencia.anamneseSuficiente) perguntas = [];
  if (!suficiencia.anamneseSuficiente && !perguntas.length) {
    if (!suficiencia.eixos.historia) perguntas.push('Qual a queixa principal e há quanto tempo começou? (definir síndrome e cronologia)');
    if (!suficiencia.eixos.alarmes) perguntas.push('Há sinais de alarme pertinentes, como dispneia, síncope, febre ou sangramento? (estratificar gravidade)');
    if (!suficiencia.eixos.seguranca) perguntas.push('Há alergias, comorbidades e medicações em uso? (segurança de prescrição)');
    if (!suficiencia.eixos.gineco) perguntas.push('Informe G_P_A_, DUM e IG ou possibilidade de gestação. (segurança obstétrica)');
    if (!suficiencia.eixos.objetivo) perguntas.push('Quais sinais vitais e achados objetivos estão disponíveis? (estratificar risco)');
    perguntas = perguntas.filter(function(p) {
      var chave = chavePergunta(p);
      if (jaFeitas.indexOf(chave) !== -1) return false;
      jaFeitas.push(chave);
      return true;
    });
  }
  var exameDirigido = objRasc.exame_dirigido;
  var temEfCompleto = /totalmente\s+normal|exame\s+f[ií]sico\s+geral\s+e\s+segmentar\s+completo|\bbom\s+estado\s+geral,\s+l[uú]cido|\bsem\s+edema\s+de\s+membros\s+inferiores\b|\bpulsos?\s+radiai[s]\b/i.test(dadosCaso);

  var blocosRasc = [
    "🩺 *SÍNTESE SOAP · ATENDIMENTO CLÍNICO*",
    "👤 *S - Subjetivo (Anamnese Estruturada)*\n" + sRasc,
    "🔍 *O - Objetivo (Exame Físico)*\n" + oRasc
  ];

  if (perguntas && perguntas.length > 0) {
    blocosRasc.push("❓ *Perguntas para Completar a Anamnese (Investigação Ativa do Subjetivo)*\n" + formatarListaTopicos(perguntas, "Informar início detalhado, fatores de melhora/piora, antecedentes e alergias."));
  }
  if (suficiencia.anamneseSuficiente) blocosRasc.push('✅ Anamnese suficiente para tomada de decisão. Pode gerar o plano.');
  else if (!perguntas.length && suficiencia.faltantes && suficiencia.faltantes.length) {
    var nomesPendencias = { historia: 'história e cronologia', alarmes: 'sinais de alarme', seguranca: 'alergias, comorbidades e medicações', gineco: 'dados obstétricos', objetivo: 'sinais vitais e exame objetivo' };
    blocosRasc.push('⚠️ *Pendências de segurança:* ' + suficiencia.faltantes.map(function(eixo) { return nomesPendencias[eixo] || eixo; }).join('; ') + '. Confirmar antes da decisão clínica.');
  }

  if (objRasc.contingencia_offline) {
    blocosRasc.unshift("⚠️ *MODO OFFLINE DE CONTINGÊNCIA (PROVEDOR EM NUVEM EM TIMEOUT)*\nProcessado pelo Motor Determinístico Offline.");
    if (objRasc.plano && objRasc.plano.length > 0) {
      blocosRasc.push("🚨 *CONDUTA IMEDIATA DE CONTINGÊNCIA (EMERGÊNCIA)*\n" + formatarListaTopicos(objRasc.plano, ""));
    }
  }

  if (!temEfCompleto && exameDirigido && exameDirigido.length > 0) {
    blocosRasc.push("🎯 *Cobrança Ativa do Exame Físico Dirigido*\n" + formatarListaTopicos(exameDirigido, "Aferir sinais vitais completos e exame direcionado ao foco da queixa."));
  }

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
    "• Reflexos: Reflexos tendinosos profundos normoativos (2+/4+) e simétricos (bicipital, tricipital, patelar e aquileu). Reflexo cutâneo-plantar em flexão bilateral (Babinski ausente) [CONFERIR SE TESTADO].\n" +
    "• Coordenação & Marcha: Coordenação apendicular preservada (índex-nariz e diadococinesia sem dismetria). Sinal de Romberg negativo. Marcha típica, estável e coordenada, inclusive em tandem.\n" +
    "• Sinais Meníngeos & Radiculares: Rigidez de nuca ausente. Sinais de Kernig, Brudzinski e Lasègue negativos bilateralmente.\n" +
    "```";
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
    "• Risco: Nega ativamente ideação de morte, planos suicidas ou heteroagressividade [CONFERIR: Checar ativamente ideação suicida antes de registrar].\n" +
    "```";
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
    "```";
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
    "```";
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
    "```";
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
    "```";
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
    "```";
}

function obterRoteiroPadraoProcto() {
  return "🩺 *EXAME UROLÓGICO E PROCTOLÓGICO (MODELO NORMAL PRONTO)*\n\n" +
    "📋 *Modelo para Prontuário:*\n" +
    "```\n" +
    "[EXAME UROLÓGICO E PROCTOLÓGICO]\n" +
    "• Genitália Masculina: Pênis de características típicas sem lesões ulceradas ou verrucosas, meato uretral tópico e pérvio sem secreção. Testículos tópicos na bolsa escrotal, móveis e indolores à palpação. Regiões inguinais sem hérnias ou linfonodomegalias palpáveis às manobras de esforço.\n" +
    "• Inspeção Perianal: Região perianal sem fissuras, fístulas, orifícios drenantes, plicomas dolorosos ou sinais de trombose hemorroidária. Ausência de prolapso anal à manobra de Valsalva.\n" +
    "• Toque Retal: Tônus esfincteriano anal preservado em repouso e sob contração voluntária. Ampola retal vazia e sem massas luminais palpáveis. Próstata de consistência fibroelástica, limites bem definidos, sulco mediano preservado, simétrica, indolor, sem nódulos pétreos. Luva de exame com resíduo fecal fisiológico, sem sangue vivo ou melena.\n" +
    "```";
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
    "```";
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
    "```";
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
    "```";
}

function obterCatalogoTodosExamesEspeciais() {
  return "🩺 *CATÁLOGO DE EXAMES FÍSICOS ESPECIAIS (COPILOTO CLÍNICO)*\n\n" +
    "Selecione uma especialidade pelos botões abaixo para ver o modelo de exame físico pronto para o prontuário e as notas clínicas beira-leito:\n\n" +
    "• *Neurológico:* Glasgow, pares cranianos, força MRC, reflexos, marcha e cerebelo\n" +
    "• *Psiquiátrico:* Funções psíquicas, risco de suicídio, humor e insight\n" +
    "• *Oftalmológico:* Acuidade visual, olho vermelho superficial vs ciliar e pupilas\n" +
    "• *Ortopédico / Reumato:* Coluna, ombro, joelho e punho com manobras especiais\n" +
    "• *Otorrinolaringológico:* Otoscopia, rinoscopia, oroscopia e cadeias cervicais\n" +
    "• *Dermatológico:* Ectoscopia, lesões elementares, regra ABCDE e fâneros\n" +
    "• *Gineco-Obstétrico:* Mamas, exame especular, toque bimanual e BCF\n" +
    "• *Urológico & Toque Retal:* Genitália, inspeção anal, próstata e esfíncter\n" +
    "• *Pediátrico:* Fontanelas, desenvolvimento DNPM, ausculta e manobras\n" +
    "• *Geriátrico / AGA:* Katz, Lawton, marcha, ortostase e sarcopenia\n" +
    "• *Vascular Periférico:* Pulsos simétricos, sinais de TVP (Homans/Moses) e perfusão\n\n" +
    "💡 *Dica:* Ao abrir qualquer guia, você pode tocar em *[➕ Incorporar ao SOAP]* para injetar o modelo normal diretamente no registro!";
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

function obterContextoMedicamentosParaIA(dados) {
  var base = obterPlanilha("remume", ConfigService.get("SPREADSHEET_ID_REMUME"), false);
  var remume = typeof filtrarMedicamentosRelevantes === 'function' ? filtrarMedicamentosRelevantes(base, dados) : String(base || '');
  var hsl = typeof filtrarContextoPosologiasHSL === 'function' ? filtrarContextoPosologiasHSL(dados) : '';
  var pedb = typeof filtrarContextoPediatricoPedB === 'function' ? filtrarContextoPediatricoPedB(dados) : '';
  
  var texto = 'LISTA MUNICIPAL (PADRONIZAÇÃO):\n' + remume +
    '\n\nFICHAS POSOLÓGICAS E CONDIÇÕES DE SEGURANÇA (GUIA HSL):\n' + (hsl || 'Nenhuma ficha HSL recuperada para este pedido; não atribua doses não consultadas ao HSL.');
  if (pedb) {
    texto += '\n\nDOSES & APRESENTAÇÕES PEDIÁTRICAS OFICIAIS (PEDBOOK pedb.com.br):\n' + pedb;
  }
  return { remume: remume, hsl: hsl, pedb: pedb, texto: texto };
}

function gerarPrescricaoComIA(dadosPrescricao) {
  var baseClinica;
  try { baseClinica = obterContextoMedicamentosParaIA(dadosPrescricao); }
  catch (erro) { return "❌ " + erro.message; }
  var listaMedicamentos = baseClinica.remume;
  var contextoPosologiaHSL = baseClinica.hsl;
  var contextoPedB = baseClinica.pedb;

  var calculoFixoPed = (typeof CalculadorasClinicas !== "undefined" && typeof CalculadorasClinicas.calcularPosologiaPorTextoLivre === "function")
    ? CalculadorasClinicas.calcularPosologiaPorTextoLivre(dadosPrescricao)
    : null;

  var travaDeterministica = "";
  if (calculoFixoPed) {
    travaDeterministica = [
      "",
      "=======================================================================",
      "CÁLCULO AUXILIAR PARA CONFERÊNCIA (não determina indicação nem substitui a base clínica):",
      "• Fármaco Eleito: " + calculoFixoPed.farmaco,
      "• Apresentação Padronizada: " + calculoFixoPed.apresentacao,
      "• Posologia no Receituário: " + calculoFixoPed.instrucaoPosologica,
      "• Quantidade a Dispensar: " + calculoFixoPed.quantidadeDispensar,
      "• Memória de Cálculo Auditada: " + calculoFixoPed.memoriaCalculo,
      "• Orientações: " + calculoFixoPed.orientacoes,
      "Verifique indicação, faixa etária, contraindicações, apresentação e duração antes de aproveitar este cálculo. Se houver conflito com o caso ou a base, declare a pendência e não copie a dose.",
      "Dose calculada para a apresentação acima (" + (calculoFixoPed.tipo === 'gotas' ? (calculoFixoPed.gotasPorTomada + " gotas") : (calculoFixoPed.volumePorTomadaMl + " mL")) + "); confira também intervalo e quantidade total.",
      "======================================================================="
    ].join("\n");
  }

  var promptSistema = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO: PRESCRIÇÃO AMBULATORIAL (RASCUNHO PARA REVISÃO). Gere prescrições precisas a partir da doença informada ou do medicamento solicitado.",
    "",
    "REGRA DE OURO (REMUME SUS + GUIA FARMACÊUTICO HSL + PEDBOOK PEDIÁTRICO):",
    "1. MEDICAMENTOS DA REMUME SÃO SEMPRE PRIMEIRA OPÇÃO: Prescreva preferencialmente fármacos e apresentações padronizadas na rede municipal (REMUME Ribeirão Preto).",
    "2. SE NÃO HOUVER ALTERNATIVA NA REMUME: Apenas se a condição clínica não puder ser tratada com itens da rede municipal, utilize a alternativa do Guia HSL/PedBook declarando: '⚠️ Medicamento fora da REMUME municipal (componente especializado/compra)'.",
    "3. POSOLOGIA OFICIAL DO HOSPITAL SÍRIO-LIBANÊS (HSL): Siga as doses adultas, pediátricas por kg/dia, intervalos e ajustes para insuficiência renal (ClCr/TFG) oficiais da base HSL.",
    "4. POSOLOGIA E APRESENTAÇÕES PEDIÁTRICAS (PEDBOOK pedb.com.br): Para pacientes pediátricos (lactentes, crianças, adolescentes), utilize as doses por kg/dia, volumes em mL/gotas de suspensão e faixas mínimas do guia pediátrico oficial PedBook.",
    travaDeterministica,
    "",
    "=== BASE OFICIAL DE POSOLOGIAS & APRESENTAÇÕES (GUIA HSL + PEDBOOK + REMUME) ===",
    baseClinica.texto,
    "=======================================================================",
    "",
    "DIRETRIZES DE SEGURANÇA FARMACOLÓGICA E DIDÁTICA (FMRP-USP):",
    "1. PEDIATRIA E MEMÓRIA DE CÁLCULO DIDÁTICA TRANSPARENTE (SÓ PEÇA PESO SE REALMENTE PRECISAR):",
    "   - Sem peso informado: NUNCA presuma peso de criança para fármacos dependentes de peso (antimicrobianos, analgésicos gotas, corticoides). Declare imediatamente em Status: 'Dados pendentes (Peso em kg obrigatório para cálculo pediátrico seguro de [medicamento])' e cobre o peso sem calcular dosagem arbitrária em mL.",
    "   - Com peso informado: Exiba no receituário a posologia clara e no campo de conferência a MEMÓRIA DE CÁLCULO COMPLETA E DIDÁTICA baseada na dose de referência do Guia HSL (mg/kg/dia ➔ mg/dose ➔ mL/dose na lista ➔ frascos).",
    "   - FÁRMACOS COM DOSE POR FAIXA ETÁRIA OU DOSE FIXA PEDIÁTRICA (ANTI-HISTAMÍNICOS E ANTI-HELMÍNTICOS):",
    "     • Exemplos: anti-histamínicos (Loratadina, Dexclorfeniramina, Cetirizina, Desloratadina), anti-helmínticos (Albendazol, Mebendazol), tópicos e nasais.",
    "     • Solicite peso quando a dose depender de peso ou faixa de peso, inclusive loratadina entre 2 e 12 anos. Não exija peso para esquema exclusivamente etário com idade confirmada.",
    "     • É TERMINANTEMENTE PROIBIDO inventar taxas em 'mg/kg/dia' para anti-histamínicos (erro grave de '1 mg/kg/dia').",
    "     • As faixas abaixo exigem confirmação da idade, apresentação, indicação e condições de segurança:",
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
    "ESTRUTURA SINTÉTICA E EFICIENTE (FOCO NO RECEITUÁRIO):",
    "\uD83D\uDC8A *PRESCRIÇÃO AMBULATORIAL - RASCUNHO (REMUME & GUIA HSL)*",
    "*Status:* [Completa para revisão / Dados pendentes: listar em 1 linha]",
    "",
    "\uD83D\uDCDD *Receituário*",
    "*[USO ORAL / TÓPICO / INALATÓRIO / OFTÁLMICO / INJETÁVEL]*",
    "1. *Nome genérico (DCI)* - [concentração da lista] - [quantidade total calculada a dispensar]",
    "- *Posologia:* [instrução clara com via, dose, intervalo com horários sugeridos de tomada e duração]",
    "",
    "💡 *Orientações ao paciente*",
    "- [Orientações farmacológicas indispensáveis: ex. jejum, horário de tomada, agitar suspensão ou ingerir com alimentos. NUNCA coloque conselhos óbvios como beber água ou repousar]",
    "- *Sinais de Alarme para Retorno ao PS (em linguagem do paciente):* [Listar 2 a 3 sinais objetivos claros para procurar a emergência imediatamente]",
    "",
    "📋 *Conferência médica*",
    "- *Indicação clínica:* [...]",
    "- *Memória de cálculo (se pediátrico):* [se por peso: dose HSL ➔ mg/kg/dia ➔ mg/dose ➔ mL/dose na lista ➔ frascos; se por idade: dose fixa oficial]",
    "- *Ajustes de segurança (renal, hepático, idade/Beers, gestação):* [conferido ou pendência em 1 linha]",
    "- *Alergias e interações:* [conferido com relato do caso]",
    "- *Disponibilidade na Rede:* [Item da REMUME Ribeirão Preto / Opção HSL]",
    "- Não acrescente seção de fontes ou bibliografia à resposta assistencial."
  ].join("\n");

  var dados = "DADOS DO PACIENTE / PEDIDO:\n" + dadosPrescricao;
  var resposta = _iaFinalizarTexto(executarRaciocinioClinico(promptSistema, dados, 1800));
  if (resposta && _iaCfgBool("IA_AUDITORIA_PRESCRICAO", true)) {
    resposta = _iaAuditarRascunho(resposta, dadosPrescricao, "prescricao", baseClinica.texto);
  }
  return resposta;
}

/**
 * Prescrição Hospitalar Completa (Enfermaria, Semi-Intensiva e CTI).
 * Segue a ordem canônica hospitalar: Dieta, Hidratação, ATB, Contínuos, Profilaxias, SOS, Cuidados.
 */
function gerarPrescricaoHospitalarComIA(dadosCaso) {
  var baseClinica;
  try { baseClinica = obterContextoMedicamentosParaIA(dadosCaso); }
  catch (erro) { baseClinica = { remume: "", hsl: "", texto: "Base hospitalar HSL de segurança." }; }

  var promptSistemaHospitalar = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO: PRESCRIÇÃO HOSPITALAR COMPLETA (ORDEM CANÔNICA DE ENFERMARIA / UTI - FMRP-USP).",
    "Você é o Médico Assistente e Preceptor Hospitalar. Estruture a prescrição hospitalar completa, direta e pronta para checagem de enfermagem. Seja telegráfico.",
    "",
    "ORDEM CANÔNICA OBRIGATÓRIA DA PRESCRIÇÃO HOSPITALAR (SINTÉTICA):",
    "1. DIETA: Via, consistência e restrições (ex: Geral, Diabética, Zero).",
    "2. HIDRATAÇÃO VENOSA & ELETRÓLITOS: Solução base, eletrólitos, vazão em mL/h em BIC ou macrogotas/min. Se euvolêmico/ICC: 'Salinizar acesso periférico'.",
    "3. ANTIMICROBIANOS (COM DIA D_ E AJUSTE RENAL): Dose precisa EV, diluente, tempo de infusão e intervalo de tomada.",
    "4. MEDICAÇÕES DE USO CONTÍNUO: Manter, suspender ou substituir com justificativa concisa.",
    "5. PROFILAXIAS HOSPITALARES OBRIGATÓRIAS: TEV (química/mecânica) e Úlcera de estresse (se critérios formais).",
    "6. MEDICAMENTOS SINTOMÁTICOS & SOS: Dipirona EV, Ondansetrona EV, com intervalo mínimo e gatilhos numéricos.",
    "7. CUIDADOS DE ENFERMAGEM & MONITORIZAÇÃO: Sinais vitais a cada 6h, cabeceira 30°-45°, balanço hídrico e parâmetros de alarme.",
    "",
    IA_SEGURANCA_MEDICAMENTOSA,
    "",
    "ESTRUTURA DE RESPOSTA (DIRETA E SEM ENROLAÇÃO):",
    "🏥 *PRESCRIÇÃO HOSPITALAR DE INTERNAÇÃO (ORDEM CANÔNICA)*",
    "*Paciente / Leito:* [Dados informados] | *Status:* [Completa / Dados pendentes em 1 linha]",
    "",
    "1. *DIETA:* [Descrição concisa]",
    "2. *HIDRATAÇÃO VENOSA:* [Solução, vazão ou 'Salinizar acesso']",
    "3. *ANTIMICROBIANOS:* [Lista com diluição, tempo, dia D_ e ajuste renal]",
    "4. *MEDICAÇÕES DE USO CONTÍNUO:* [Conciliação concisa]",
    "5. *PROFILAXIAS DE LEITO:* [TEV e mucosa gástrica]",
    "6. *SINTOMÁTICOS & SOS:* [Dipirona, antiemético, com gatilhos]",
    "7. *CUIDADOS DE ENFERMAGEM:* [Sinais vitais, decúbito, cabeceira e metas de alerta]",
    "",
    "⚠️ *NOTAS MÉDICAS & PENDÊNCIAS:*",
    "- [Pendências críticas imediatas em tópicos de 1 linha]"
  ].join("\n");

  var dados = "CASO CLÍNICO / DADOS DA INTERNAÇÃO:\n" + String(dadosCaso || "").trim();
  var res = _iaFinalizarTexto(executarRaciocinioClinico(promptSistemaHospitalar, dados, 2800));
  if (res && _iaCfgBool("IA_AUDITORIA_PRESCRICAO", true)) {
    res = _iaAuditarRascunho(res, dadosCaso, "prescricao_hospitalar", baseClinica.texto);
  }
  return res;
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

  var contextoMedicamentos = "";
  var farmacosEmerg = (typeof extrairFarmacosDoTexto === "function") ? extrairFarmacosDoTexto(dadosEmergencia) : [];
  if (((farmacosEmerg && farmacosEmerg.length > 0) || protocoloLocal) && typeof obterContextoMedicamentosParaIA === "function") {
    try {
      var baseMedEmerg = obterContextoMedicamentosParaIA(dadosEmergencia);
      if (baseMedEmerg && baseMedEmerg.texto) {
        contextoMedicamentos = "\n\nBASES FARMACOLÓGICAS LOCAIS (HSL / PEDBOOK / REMUME):\n" + baseMedEmerg.texto + "\n\n";
      }
    } catch (eMedEmerg) {
      Logger.log("Aviso ao obter contexto de medicamentos na emergência: " + eMedEmerg.message);
    }
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
    "ESTRUTURA ESCANEÁVEL EM 3 SEGUNDOS (HIERARQUIA BEIRA-LEITO):",
    "\uD83D\uDEA8 *EMERGÊNCIA - [síndrome]*",
    "",
    "🔴 *AÇÃO IMEDIATA / CONDUTA / DOSE DE ATAQUE:*",
    "- [ação prioritária, droga e dose de ataque nos primeiros 3 segundos]",
    "- [passos 1, 2 e 3 imediatos]",
    "",
    "🟡 *DILUIÇÃO, VELOCIDADE DE INFUSÃO & MANUTENÇÃO:*",
    "- *[Fármaco] [dose + unidade]* [via], [intervalo]. Preparo: [diluente, concentração final]. Infusão: [velocidade/tempo].",
    "- [manutenção e próximos passos se refratário]",
    "",
    "⚠️ *ALERTAS DE SEGURANÇA & BLOQUEIOS:*",
    "- [teto máximo de dose, contraindicações absolutas, monitorização estrita, gatilhos de IOT/UTI]",
    "",
    "ℹ️ *JUSTIFICATIVA CLÍNICA & REFERÊNCIAS:*",
    "- [motivo da conduta, diretriz brasileira de referência e parâmetros de reavaliação]",
    "",
    "Não acrescente seção de fontes ou bibliografia à resposta assistencial.",
    "_Sugestão gerada por IA. Conferir dose, diluição e diretriz; a responsabilidade da prescrição é do prescritor._"
  ].join("\n");

  var promptUsuario = contextoProtocolo + contextoMedicamentos + "EMERGÊNCIA APRESENTADA:\n" + dadosEmergencia;
  var resposta = null;

  if (_iaCfgBool("IA_GROUNDING_EMERGENCIA", false)) {
    resposta = chamarGeminiPoolComGrounding(promptSistema, promptUsuario, 2500);
  }
  if (!resposta) resposta = executarRaciocinioClinico(promptSistema, promptUsuario, 2500);
  resposta = _iaFinalizarTexto(resposta);

  if (resposta && _iaCfgBool("IA_AUDITORIA_EMERGENCIA", false)) {
    resposta = _iaAuditarRascunho(resposta, dadosEmergencia, "emergencia");
  }
  resposta = _iaAnexarCrossCheckSeguranca(resposta, dadosEmergencia);
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
  if (/(?:me\s+)?respond(?:a|e)\s+(?:com\s+|em\s+)?(?:um\s+)?[aá]udio|no\s+fone|fala\s+comigo|preceptor\s+socr[aá]tico|\bsabatina\b|manda\s+[aá]udio|^(?:preceptor|áudio|audio|no\s+fone)\b|chama(?:r)?\s+(?:o\s+)?preceptor|falar?\s+com\s+(?:o\s+)?preceptor/i.test(t)) {
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

  // 3) Classificador léxico-estrutural determinístico O(1) / O(K) (Zero LLM em runtime)
  var tokens = tn.split(/[^a-z0-9+]+/).filter(Boolean);
  var ehEstudoTeorico = /\b(?:explica|explique|o\s+que\s+[eé]|fisiopatologia|resumo|diferen[çc]a\s+entre|quest[aã]o|prova|acad[eê]mic)\b/.test(tn);
  if (!ehEstudoTeorico) {
    var TOKENS_EMERGENCIA = {
      pcr: true, parada: true, parou: true, assistolia: true, aesp: true, desfibrilacao: true, rcp: true,
      iot: true, sri: true, intubar: true, intubacao: true, anafilaxia: true, choque: true, chocando: true,
      chocado: true, noradrenalina: true, dobutamina: true, vasopressina: true, adrenalina: true,
      convulsao: true, convulsionando: true, status: true, iam: true, infarto: true,
      suprast: true, avc: true, trombolise: true, alteplase: true, tep: true, pneumotorax: true,
      tamponamento: true, bavt: true, torsades: true, hematemese: true, cetoacidose: true, eap: true
    };
    for (var i = 0; i < tokens.length; i++) {
      if (TOKENS_EMERGENCIA[tokens[i]]) {
        return { intencao: "CLINICO_EMERGENCIA", confianca: 0.95, resumo: "token crítico: " + tokens[i] };
      }
    }
  }

  // 4) Fallback direto determinístico em 0ms (Zero chamadas de rede/LLM)
  return { intencao: "CONVERSA", confianca: 0.85, resumo: "roteamento determinístico O(K)" };
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

  var contextoMedicamentos = "";
  var farmacosConv = (typeof extrairFarmacosDoTexto === "function") ? extrairFarmacosDoTexto(textoMensagem) : [];
  if (((farmacosConv && farmacosConv.length > 0) || protocoloLocal) && typeof obterContextoMedicamentosParaIA === "function") {
    try {
      var baseMedConv = obterContextoMedicamentosParaIA(textoMensagem);
      if (baseMedConv && baseMedConv.texto) {
        contextoMedicamentos = "\n\nBASES FARMACOLÓGICAS LOCAIS (HSL / PEDBOOK / REMUME):\n" + baseMedConv.texto + "\n\n";
      }
    } catch (eMedConv) {
      Logger.log("Aviso ao obter contexto de medicamentos na conversa: " + eMedConv.message);
    }
  }

  var promptSistema = [
    IA_PERSONA, "", IA_VISUAL, "",
    "MODO ADAPTATIVO - escolha o modo conforme a mensagem:",
    "1. EMERGÊNCIA: se descrever paciente instável ou risco de vida, aplique o modo emergência (ação prioritária na primeira linha, medicação com dose, via, preparo e velocidade, reavaliação, sem perguntas didáticas) e siga a checagem de segurança abaixo.",
    "2. DISCUSSÃO CLÍNICA: hipótese principal, achados que a sustentam, o que não pode ser perdido, próxima decisão e o dado pendente que mudaria a conduta. Tom de preceptor: firme, técnico, acolhedor.",
    "3. PRECEPTORIA: se Wagner pedir para discutir um caso ou sabatina, avalie o caso real apresentado por ele: o que está correto, o que precisa de ajuste e por que, aplicando ao caso. NUNCA INVENTE DADOS DE PACIENTES aleatoriamente do nada. Se Wagner apenas chamou o preceptor ou não forneceu os dados do paciente, pergunte qual paciente ou caso ele quer discutir. Se faltarem dados (sinais vitais, exames), pergunte ativamente o dado faltante. Somente crie um caso simulado fictício se Wagner pedir expressamente por uma simulação de treino (ex: 'simule um caso', 'crie um caso de treino').",
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

  var promptUsuario = contextoProtocolo + contextoMedicamentos + textoMensagem;
  if (contextoAnterior) {
    promptUsuario = "HISTÓRICO RECENTE DA CONVERSA:\n" + contextoAnterior + "\n\nNOVA MENSAGEM DE WAGNER:\n" + contextoProtocolo + contextoMedicamentos + textoMensagem;
  }
  var respostaConv = _iaFinalizarTexto(executarRaciocinioClinico(promptSistema, promptUsuario, 1800));
  return _iaAnexarCrossCheckSeguranca(respostaConv, textoMensagem);
}

/**
 * Fala curta para áudio (TTS). Retorna texto limpo, sem markdown.
 */
function gerarProvocacaoPreceptorAudio(casoOuDuvida) {
  var textoCaso = String(casoOuDuvida || "").trim();
  var protocoloLocal = (typeof obterProtocoloClinico === "function") ? obterProtocoloClinico(textoCaso) : null;
  var contextoGrounding = "";
  if (protocoloLocal) {
    contextoGrounding += "\n\nPROTOCOLO CLÍNICO DETERMINÍSTICO (DIRETRIZ BRASILEIRA):\n" +
      "Patologia: " + (protocoloLocal.titulo || "") + "\n" +
      "Diretriz Brasileira: " + (protocoloLocal.diretriz_brasileira || "") + "\n" +
      "Conduta Padronizada: " + (protocoloLocal.conduta_imediata || "") + "\n" +
      "Divergência/Segurança: " + (protocoloLocal.divergencia || "");
  }
  var farmacos = (typeof extrairFarmacosDoTexto === "function") ? extrairFarmacosDoTexto(textoCaso) : [];
  if (((farmacos && farmacos.length > 0) || protocoloLocal) && typeof obterContextoMedicamentosParaIA === "function") {
    try {
      var baseMedAudio = obterContextoMedicamentosParaIA(textoCaso);
      if (baseMedAudio && baseMedAudio.texto) {
        var txtMedAudio = baseMedAudio.texto;
        if (txtMedAudio.length > 2500) txtMedAudio = txtMedAudio.substring(0, 2500) + "...";
        contextoGrounding += "\n\nBASES FARMACOLÓGICAS LOCAIS (HSL / PEDBOOK / REMUME):\n" + txtMedAudio;
      }
    } catch (eAudioMed) {
      Logger.log("Aviso ao obter medicamentos áudio: " + eAudioMed.message);
    }
  } else if (farmacos && farmacos.length > 0 && typeof filtrarContextoPosologiasHSL === "function") {
    var hsl = filtrarContextoPosologiasHSL(textoCaso);
    if (hsl) {
      if (hsl.length > 2500) hsl = hsl.substring(0, 2500) + "...";
      contextoGrounding += "\n\nGUIA FARMACÊUTICO HSL (DOSES, DILUIÇÕES E SEGURANÇA):\n" + hsl;
    }
  }

  var promptSistema = [
    "Você é um preceptor experiente de clínica médica e emergência falando no fone de ouvido de Wagner durante o plantão.",
    "Gere uma fala concisa, firme e instigante, de 30 a 50 palavras, para ser lida em voz alta.",
    "REGRAS:",
    "1. Texto corrido, SEM tópicos, SEM markdown, SEM asteriscos, SEM emojis, SEM URLs.",
    "2. Emergência (ex: pneumotórax, choque, PCR): diga PRIMEIRO a ação prioritária imediata; só depois, uma pergunta curta de checagem.",
    "3. Caso clínico: aponte o achado semiológico discriminante ou o critério de gravidade mais crítico e termine com UMA pergunta de raciocínio.",
    "4. Valide e cobre doses, diluições e metas hemodinâmicas exatas das diretrizes brasileiras (SBC, ILAS, AMIB, SBD, Guia HSL) quando aplicável.",
    "5. NUNCA INVENTE DADOS DO PACIENTE, idades, valores laboratoriais ou sinais vitais fictícios. Baseie-se estritamente no que Wagner informou. Se faltarem informações críticas (sinais vitais, exames ou histórico), PERGUNTE ATIVAMENTE o dado faltante para Wagner antes de propor condutas definitivas. Somente formule caso fictício se Wagner pedir expressamente uma simulação (ex: 'simule um caso'). Não use LaTeX. Termine sempre com frase completa.",
    "6. Você não é o médico responsável: em risco de vida, reforce acionar a equipe/preceptor."
  ].join("\n");

  if (contextoGrounding) {
    promptSistema += "\n\nGROUNDING CLÍNICO DETERMINÍSTICO (DIRETRIZES BRASILEIRAS & GUIA HSL):\n" +
      "Use as referências a seguir para cobrar e validar doses, diluições e metas hemodinâmicas exatas:" +
      contextoGrounding;
  }

  var r = executarRaciocinioClinico(promptSistema, textoCaso, 250, { thinkingBudget: 0, semThinking: true });
  return r ? _iaTextoFalado(r) : r;
}

/**
 * Diálogo socrático contínuo com o Preceptor: avalia a resposta de Wagner à pergunta anterior
 * e propõe o próximo desafio ou conduta clínica. Retorna texto limpo para áudio/TTS.
 */
function gerarDialogoPreceptorSocratico(casoBase, perguntaAnterior, respostaWagner, historicoAnterior) {
  var textoConsulta = [casoBase, perguntaAnterior, respostaWagner].filter(Boolean).join(" ");
  var protocoloLocal = (typeof obterProtocoloClinico === "function") ? obterProtocoloClinico(textoConsulta) : null;
  var contextoGrounding = "";
  if (protocoloLocal) {
    contextoGrounding += "\n\nPROTOCOLO CLÍNICO DETERMINÍSTICO (DIRETRIZ BRASILEIRA):\n" +
      "Patologia: " + (protocoloLocal.titulo || "") + "\n" +
      "Diretriz Brasileira: " + (protocoloLocal.diretriz_brasileira || "") + "\n" +
      "Conduta Padronizada: " + (protocoloLocal.conduta_imediata || "") + "\n" +
      "Divergência/Segurança: " + (protocoloLocal.divergencia || "");
  }
  var farmacos = (typeof extrairFarmacosDoTexto === "function") ? extrairFarmacosDoTexto(textoConsulta) : [];
  if (((farmacos && farmacos.length > 0) || protocoloLocal) && typeof obterContextoMedicamentosParaIA === "function") {
    try {
      var baseMedSocr = obterContextoMedicamentosParaIA(textoConsulta);
      if (baseMedSocr && baseMedSocr.texto) {
        var txtMedSocr = baseMedSocr.texto;
        if (txtMedSocr.length > 2500) txtMedSocr = txtMedSocr.substring(0, 2500) + "...";
        contextoGrounding += "\n\nBASES FARMACOLÓGICAS LOCAIS (HSL / PEDBOOK / REMUME):\n" + txtMedSocr;
      }
    } catch (eSocrMed) {
      Logger.log("Aviso ao obter medicamentos socrático: " + eSocrMed.message);
    }
  } else if (farmacos && farmacos.length > 0 && typeof filtrarContextoPosologiasHSL === "function") {
    var hsl = filtrarContextoPosologiasHSL(textoConsulta);
    if (hsl) {
      if (hsl.length > 2500) hsl = hsl.substring(0, 2500) + "...";
      contextoGrounding += "\n\nGUIA FARMACÊUTICO HSL (DOSES, DILUIÇÕES E SEGURANÇA):\n" + hsl;
    }
  }

  var promptSistema = [
    "Você é um preceptor experiente de clínica médica e emergência falando no fone de ouvido de Wagner durante o plantão.",
    "Wagner acabou de responder a uma pergunta ou provocação que você fez a ele durante a discussão do caso.",
    "",
    "ESTRUTURA OBRIGATÓRIA DA FALA EM 3 MOVIMENTOS CURTOS E INCISIVOS (40 A 70 PALAVRAS):",
    "1. Veredito direto sobre a resposta de Wagner (validação clara do acerto ou correção firme de segurança);",
    "2. Pérola clínica decisional com parâmetro numérico, dose ou meta hemodinâmica exata das diretrizes brasileiras (SBC, ILAS, AMIB, SBD, Guia HSL);",
    "3. Próxima pergunta socrática clinicamente discriminante para tomada de decisão imediata.",
    "",
    "REGRAS E FORMATO PARA FALA / ÁUDIO:",
    "- Texto corrido, natural para leitura em voz alta no fone de ouvido, de 40 a 70 palavras.",
    "- SEM tópicos, SEM markdown, SEM asteriscos, SEM emojis, SEM URLs, SEM introduções vazias.",
    "- Termine com frase completa e UMA pergunta direta.",
    "- Diretrizes brasileiras vigentes como base (SBC, ILAS, AMIB, SBD, Guia HSL).",
    "- NUNCA invente dados do paciente. Se a resposta de Wagner estiver incompleta ou faltarem dados fundamentais para o desfecho clínico, pergunte diretamente o dado que falta em vez de presumir valores laboratoriais ou sinais vitais."
  ].join("\n");

  if (contextoGrounding) {
    promptSistema += "\n\nGROUNDING CLÍNICO DETERMINÍSTICO (DIRETRIZES BRASILEIRAS & GUIA HSL):\n" +
      "Use as referências a seguir para cobrar e validar doses, diluições e metas hemodinâmicas exatas:" +
      contextoGrounding;
  }

  var partesUsuario = [];
  if (casoBase) partesUsuario.push("CASO CLÍNICO DE BASE:\n" + casoBase);
  if (historicoAnterior && historicoAnterior.length) {
    partesUsuario.push("HISTÓRICO RECENTE DA DISCUSSÃO:\n" + historicoAnterior);
  }
  if (perguntaAnterior) partesUsuario.push("SUA ÚLTIMA PERGUNTA A WAGNER:\n" + perguntaAnterior);
  partesUsuario.push("RESPOSTA DE WAGNER:\n" + respostaWagner);

  var r = executarRaciocinioClinico(promptSistema, partesUsuario.join("\n\n"), 350, { thinkingBudget: 0, semThinking: true });
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
    "3. Não invente dados do paciente. Não assuma valores numéricos ou achados não mencionados. Se o caso estiver omisso em dados críticos, pergunte o dado que falta. Não use LaTeX nem markdown. Português do Brasil natural.",
    "4. Se o caso descrever instabilidade, a pergunta deve focar a prioridade imediata de segurança."
  ].join("\n");
  var res = executarRaciocinioClinico(promptSistema, "CASO CLÍNICO:\n" + casoOuLeitoTexto, 400, { thinkingBudget: 0, semThinking: true });
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
  var textoPronto = opcoes.textoPronto ? String(opcoes.textoPronto).trim() : "";
  var textoCaso = String(casoOuDuvida || "").trim();
  if (!textoCaso && !textoPronto) return null;

  var textoProvocacao = textoPronto ? _iaTextoFalado(textoPronto) : gerarProvocacaoPreceptorAudio(textoCaso);
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
    chamarMotorIaComFallback: chamarMotorIaComFallback,
    executarTentativaProvedor: executarTentativaProvedor,
    _iaExecutar: _iaExecutar,
    _iaChamarProvedor: _iaChamarProvedor,
    _iaAcionarFallbackOffline: _iaAcionarFallbackOffline,
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
    analisarImagemMedicaComIA: analisarImagemMedicaComIA,
    chamarLocalLlmAPI: chamarLocalLlmAPI,
    _iaChamarOllamaNativo: _iaChamarOllamaNativo,
    chamarOllamaNativoAPI: chamarOllamaNativoAPI,
    executarFallbackLocalOffline: executarFallbackLocalOffline,
    verificarSaudeLocalLlm: verificarSaudeLocalLlm,
    cockpitLocalLlm: cockpitLocalLlm,
    _iaNormalizarBase64: _iaNormalizarBase64,
    _iaBloquear: _iaBloquear,
    _iaDesbloquear: _iaDesbloquear,
    IaCircuitBreaker: (typeof IaCircuitBreaker !== 'undefined' ? IaCircuitBreaker : null)
  };
}
