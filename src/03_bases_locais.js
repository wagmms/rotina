/**
 * ==============================================================================
 * MÓDULO 03: BASES LOCAIS, RAG OTIMIZADO E MAPEAMENTO FARMACOLÓGICO (REMUME)
 * ==============================================================================
 * Otimiza a ingestão de planilhas do Google Drive, reduzindo em até 80% o uso
 * de tokens e acelerando a resposta de prescrições e checagem de interações.
 * ==============================================================================
 */

// Dicionário de sinônimos comerciais e equivalências para Denominação Comum Brasileira (DCB)
var DICIONARIO_FARMACO = {
  "glifage": "metformina",
  "novalgina": "dipirona",
  "tylenol": "paracetamol",
  "rocefin": "ceftriaxona",
  "clexane": "enoxaparina",
  "plasil": "metoclopramida",
  "buscopan": "escopolamina",
  "aerolin": "salbutamol",
  "clavulin": "amoxicilina + clavulanato",
  "claven": "amoxicilina + clavulanato",
  "cataflam": "diclofenaco",
  "voltaren": "diclofenaco",
  "polaramine": "dexclorfeniramina",
  "lasix": "furosemida",
  "aldactone": "espironolactona",
  "selozok": "metoprolol",
  "aradois": "losartana",
  "norvasc": "anlodipino",
  "daonil": "glibenclamida",
  "prozac": "fluoxetina",
  "zoloft": "sertralina",
  "cipro": "ciprofloxacino",
  "bactrim": "sulfametoxazol + trimetoprima",
  "amplictil": "clorpromazina",
  "haldol": "haloperidol",
  "tegretol": "carbamazepina",
  "depakene": "acido valproico",
  "omeprazol": "omeprazol",
  "pantoprazol": "pantoprazol",
  "claritin": "loratadina",
  "allegra": "fexofenadina",
  "desalex": "desloratadina",
  "hixizine": "hidroxizina",
  "hixizina": "hidroxizina",
  "zyrtec": "cetirizina",
  "polaramine": "dexclorfeniramina",
  "ebastel": "ebastina",
  "celestamine": "betametasona + dexclorfeniramina",
  "zentel": "albendazol",
  "pantelmin": "mebendazol",
  "annita": "nitazoxanida",
  "anita": "nitazoxanida",
  "alivium": "ibuprofeno",
  "advil": "ibuprofeno",
  "toragesic": "trometamol cetorolaco",
  "nisulid": "nimesulida",
  "scafit": "nimesulida",
  "proflam": "aceclofenaco",
  "flanax": "naproxeno",
  "prelone": "prednisolona",
  "predsim": "prednisolona",
  "decadron": "dexametasona",
  "busonid": "budesonida",
  "beclosol": "beclometasona",
  "clenil": "beclometasona",
  "atrovent": "ipratropio",
  "berotec": "fenoterol",
  "novocilin": "amoxicilina",
  "keflex": "cefalexina",
  "zitromax": "azitromicina",
  "astro": "azitromicina",
  "tavanic": "levofloxacino",
  "losec": "omeprazol",
  "pantozol": "pantoprazol",
  "nexium": "esomeprazol",
  "vonau": "ondansetrona",
  "luftal": "simeticona",
  "dramin": "dimenidrinato",
  "cozaar": "losartana",
  "renitec": "enalapril",
  "capoten": "captopril",
  "ancoron": "amiodarona",
  "lexapro": "escitalopram",
  "rivotril": "clonazepam",
  "frontin": "alprazolam",
  "valium": "diazepam",
  "stilnox": "zolpidem",
  "risperdal": "risperidona",
  "seroquel": "quetiapina"
};

// Mapeamento de condições clínicas frequentes na APS para classes prioritárias
var MAPA_SINDROMES_APS = {
  "cistite": ["nitrofurantoina", "fosfomicina", "sulfametoxazol", "cefalexina", "ciprofloxacino", "escopolamina"],
  "itu": ["nitrofurantoina", "fosfomicina", "sulfametoxazol", "cefalexina", "ciprofloxacino"],
  "amigdalite": ["amoxicilina", "penicilina", "azitromicina", "ibuprofeno", "dipirona", "paracetamol"],
  "faringite": ["amoxicilina", "penicilina", "azitromicina", "ibuprofeno", "dipirona"],
  "otite": ["amoxicilina", "clavulanato", "ibuprofeno", "dipirona", "paracetamol"],
  "sinusite": ["amoxicilina", "clavulanato", "soro fisiologico", "budesonida"],
  "pneumonia": ["amoxicilina", "clavulanato", "azitromicina", "claritromicina", "ceftriaxona"],
  "pac": ["amoxicilina", "clavulanato", "azitromicina", "ceftriaxona"],
  "hipertensao": ["losartana", "enalapril", "hidroclorotiazida", "anlodipino", "atenolol", "espironolactona"],
  "has": ["losartana", "enalapril", "hidroclorotiazida", "anlodipino", "espironolactona"],
  "diabetes": ["metformina", "glibenclamida", "insulina", "gliclazida"],
  "dm": ["metformina", "glibenclamida", "insulina"],
  "asma": ["salbutamol", "beclometasona", "budesonida", "prednisona", "prednisolona", "ipratropio"],
  "dpoc": ["salbutamol", "ipratropio", "beclometasona", "prednisona", "azitromicina"],
  "broncoespasmo": ["salbutamol", "ipratropio", "prednisolona"],
  "laringite": ["prednisolona", "dexametasona", "adrenalina"],
  "rinite": ["loratadina", "dexclorfeniramina", "budesonida", "soro fisiologico"],
  "alergia": ["loratadina", "dexclorfeniramina", "hidroxizina", "prednisolona"],
  "urticaria": ["loratadina", "dexclorfeniramina", "hidroxizina", "prednisolona"],
  "prurido": ["loratadina", "dexclorfeniramina", "hidroxizina"],
  "parasitose": ["albendazol", "mebendazol", "nitazoxanida"],
  "verminose": ["albendazol", "mebendazol", "nitazoxanida"],
  "vermes": ["albendazol", "mebendazol", "nitazoxanida"],
  "oxiuríase": ["albendazol", "mebendazol"],
  "ascaridíase": ["albendazol", "mebendazol"],
  "diarreia": ["soro de reidratacao", "zinco", "ondansetrona", "dipirona"],
  "lombalgia": ["dipirona", "paracetamol", "ibuprofeno", "ciclobenzaprina", "tramadol"],
  "dor": ["dipirona", "paracetamol", "ibuprofeno", "tramadol"],
  "depressao": ["fluoxetina", "sertralina", "amitriptilina", "nortriptilina", "escitalopram"],
  "ansiedade": ["fluoxetina", "sertralina", "clonazepam", "diazepam"],
  "gastrite": ["omeprazol", "ranitidina", "hidroxido de aluminio", "metoclopramida"],
  "geca": ["soro de reidratacao", "ondansetrona", "metoclopramida", "zinco", "dipirona"]
};

function normalizarTexto(texto) {
  if (!texto) return "";
  return texto.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s\+]/g, " ")
    .trim();
}

// Cache integral por execução. A identidade da fonte impede reutilizar outra planilha.
var _cachePlanilhasExecucao = {};
var _fontesPlanilhasExecucao = {};

function identidadeFontePlanilha(idPlanilha, isInteracao) {
  return JSON.stringify([String(idPlanilha || ""), !!isInteracao]);
}

// Somente leitura de cache: usado também na validação, sem abrir Sheets novamente.
// null significa indisponível; string vazia significa base confirmadamente vazia.
function lerPlanilhaEmCache(cachePrefix, idPlanilha, isInteracao) {
  var fonte = identidadeFontePlanilha(idPlanilha, isInteracao);
  if (_fontesPlanilhasExecucao[cachePrefix] === fonte &&
      Object.prototype.hasOwnProperty.call(_cachePlanilhasExecucao, cachePrefix)) {
    return _cachePlanilhasExecucao[cachePrefix];
  }
  try {
    var cache = CacheService.getScriptCache();
    var bruto = cache.get(cachePrefix + "_chunks");
    if (bruto === null || bruto === undefined) return null;
    var manifesto, prefixo = cachePrefix + "_";
    // Leitura transitória do formato antigo; novas escritas são sempre versionadas.
    if (/^\d+$/.test(bruto)) {
      manifesto = {n: Number(bruto)};
    } else {
      manifesto = JSON.parse(bruto);
      if (!manifesto || manifesto.formato !== 2 || manifesto.fonte !== fonte ||
          !/^[a-zA-Z0-9-]+$/.test(manifesto.geracao || "") ||
          !Number.isSafeInteger(manifesto.tamanho) || manifesto.tamanho < 0) return null;
      prefixo += manifesto.geracao + "_";
    }
    if (!Number.isSafeInteger(manifesto.n) || manifesto.n < 0 || manifesto.n > 100) return null;
    var chaves = [];
    for (var i = 0; i < manifesto.n; i++) chaves.push(prefixo + i);
    var mapa = {};
    if (chaves.length && typeof cache.getAll === "function") mapa = cache.getAll(chaves) || {};
    else chaves.forEach(function(k) { mapa[k] = cache.get(k); });
    var partes = [];
    for (var j = 0; j < chaves.length; j++) {
      if (typeof mapa[chaves[j]] !== "string") return null;
      partes.push(mapa[chaves[j]]);
    }
    var conteudo = partes.join("");
    if (manifesto.formato === 2 && conteudo.length !== manifesto.tamanho) return null;
    _cachePlanilhasExecucao[cachePrefix] = conteudo;
    _fontesPlanilhasExecucao[cachePrefix] = fonte;
    return conteudo;
  } catch (e) {
    Logger.log("Cache de base indisponível: " + cachePrefix);
    return null;
  }
}

function publicarCachePlanilha(cachePrefix, fonte, conteudo) {
  var cache = CacheService.getScriptCache();
  var geracao = Utilities.getUuid().replace(/[^a-zA-Z0-9-]/g, "");
  // Até 48 KB UTF-8 por parte, inclusive para texto com acentos e emojis.
  var partes = [], limite = 16000;
  for (var p = 0; p < conteudo.length;) {
    var fim = Math.min(p + limite, conteudo.length);
    var c = conteudo.charCodeAt(fim - 1);
    if (fim < conteudo.length && c >= 0xD800 && c <= 0xDBFF) fim--;
    partes.push(conteudo.slice(p, fim));
    p = fim;
  }
  if (partes.length > 100) throw new Error("Base excede a capacidade do cache; mantida integral na memória.");
  var lote = {};
  partes.forEach(function(parte, i) { lote[cachePrefix + "_" + geracao + "_" + i] = parte; });
  // Não publica o manifesto se qualquer escrita falhar. A versão anterior expira normalmente.
  if (partes.length) {
    if (typeof cache.putAll === "function") cache.putAll(lote, 21600);
    else Object.keys(lote).forEach(function(k) { cache.put(k, lote[k], 21600); });
  }
  cache.put(cachePrefix + "_chunks", JSON.stringify({
    formato: 2, geracao: geracao, fonte: fonte, n: partes.length,
    tamanho: conteudo.length, atualizadoEm: Date.now()
  }), 21600);
}

/** Cache integral L1/L2; atualização forçada lê a fonte antes de publicar outra versão. */
function obterPlanilha(cachePrefix, idPlanilha, isInteracao, forcarAtualizacao) {
  if (!forcarAtualizacao) {
    var salvo = lerPlanilhaEmCache(cachePrefix, idPlanilha, isInteracao);
    if (salvo !== null) return salvo;
  }
  var conteudo = "";
  try {
    var ss = SpreadsheetApp.openById(idPlanilha, isInteracao);
    var sheet = ss.getSheets()[0];
    var lastRow = sheet.getLastRow();
    var lastCol = isInteracao ? sheet.getLastColumn() : 1;
    if (lastRow > 1 && lastCol > 0) {
      var valores = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      conteudo = valores.map(function(linha) {
        return isInteracao ? linha.join(" | ") : linha[0];
      }).join("\n");
    }
  } catch (e) {
    Logger.log("Erro ao acessar a planilha " + cachePrefix);
    throw new Error("Erro ao acessar a base de dados (" + cachePrefix + "). Verifique permissões do Drive.");
  }
  var fonte = identidadeFontePlanilha(idPlanilha, isInteracao);
  _cachePlanilhasExecucao[cachePrefix] = conteudo;
  _fontesPlanilhasExecucao[cachePrefix] = fonte;
  try { publicarCachePlanilha(cachePrefix, fonte, conteudo); }
  catch (eCache) {
    Logger.log("Cache não atualizado: " + cachePrefix + ". Base integral disponível nesta execução.");
    if (forcarAtualizacao) throw new Error("Falha ao publicar cache da base " + cachePrefix);
  }
  return conteudo;
}

function aquecerCachePlanilhas() {
  var falhas = [];
  [["remume", "SPREADSHEET_ID_REMUME", false], ["interacoes", "SPREADSHEET_ID_INTERACOES", true]].forEach(function(base) {
    var id = ConfigService.get(base[1]);
    if (!id) return;
    try { obterPlanilha(base[0], id, base[2], true); }
    catch (e) { falhas.push(base[0]); }
  });
  if (falhas.length) throw new Error("Falha ao atualizar bases: " + falhas.join(", "));
  Logger.log("Atualização das bases de dados concluída.");
}

/**
 * Filtro RAG Inteligente da REMUME:
 * Extrai apenas as linhas pertinentes à consulta do usuário em vez de injetar a planilha inteira.
 */
function filtrarMedicamentosRelevantes(baseCompleta, pedidoUsuario) {
  if (!baseCompleta) return "";
  var linhas = baseCompleta.split("\n");
  if (linhas.length <= 35) return baseCompleta; // Se a base for pequena, envia inteira

  var pedidoNorm = normalizarTexto(pedidoUsuario);
  var termosBusca = pedidoNorm.split(/\s+/).filter(function(t) { return t.length >= 3; });

  // 1. Expande termos com sinônimos de marcas (sem expansão autorreferente infinita)
  var originais = termosBusca.slice();
  var termosSet = {};
  originais.forEach(function(t) { termosSet[t] = true; });
  originais.forEach(function(termo) {
    var sin = DICIONARIO_FARMACO[termo];
    if (sin && !termosSet[sin]) {
      termosSet[sin] = true;
      termosBusca.push(sin);
    }
  });

  // 2. Expande por síndromes clínicas mapeadas
  for (var sindrome in MAPA_SINDROMES_APS) {
    if (pedidoNorm.indexOf(sindrome) !== -1) {
      MAPA_SINDROMES_APS[sindrome].forEach(function(item) {
        if (!termosSet[item]) {
          termosSet[item] = true;
          termosBusca.push(item);
        }
      });
    }
  }

  // 3. Filtra linhas que contenham ao menos um dos termos
  var linhasRelevantes = [];
  var setAdicionados = {};

  for (var j = 0; j < linhas.length; j++) {
    var linha = linhas[j].trim();
    if (!linha) continue;
    var linhaNorm = normalizarTexto(linha);

    for (var k = 0; k < termosBusca.length; k++) {
      if (linhaNorm.indexOf(termosBusca[k]) !== -1) {
        if (!setAdicionados[linha]) {
          linhasRelevantes.push(linha);
          setAdicionados[linha] = true;
        }
        break;
      }
    }
    // Não interromper: medicamentos explícitos e apresentações podem estar no fim da base.
  }

  // Se o filtro encontrou itens relevantes, retorna o subconjunto enxuto preservando qualquer match
  if (linhasRelevantes.length > 0) {
    return linhasRelevantes.join("\n");
  }

  // Sem correspondência confiável, preserve toda a base; nunca um prefixo arbitrário.
  return baseCompleta;
}

function checarStatusFonteDrive(idPlanilha, isInteracao) {
  try {
    var ss = SpreadsheetApp.openById(idPlanilha, isInteracao);
    var sheets = ss.getSheets();
    if (!sheets || sheets.length === 0) return "❌ Sem abas na planilha";
    var sheet = sheets[0];
    var totalLinhas = sheet.getLastRow();
    if (totalLinhas <= 1) return "⚠️ Conectada, mas sem linhas de dados (apenas cabeçalho)";
    return "Conectada ✅ (" + (totalLinhas - 1) + " registros)";
  } catch (e) {
    return "❌ Erro ao acessar: " + e.message;
  }
}

// ==============================================================================
// BASE CANÔNICA DA REMUME (RIBEIRÃO PRETO - SP)
// ==============================================================================

var _cacheItensRemumeRP = null;
var REGEX_SAIS_FARMACO = /\b(cloridrato|s[oó]dica?|pot[aá]ssica?|maleato|besilato|hemi[- ]?hidratad[oa]|sulfato|succinato|tartarato|fosfato|acetato|dipropionato|valerato|fumarato|bromidrato|citrato)\b/gi;

/**
 * Normaliza princípio ativo removendo acentuação, pontuação e sais farmacêuticos
 * para permitir matching determinístico entre a consulta do médico e o catálogo municipal.
 */
function normalizarPrincipioAtivo(txt) {
  if (!txt) return "";
  var semAcento = normalizarTexto(txt);
  return semAcento
    .replace(REGEX_SAIS_FARMACO, " ")
    .replace(/[^\w\s\+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Carrega a lista em memória de apresentações padronizadas de REMUME_RP.csv.
 */
function obterItensRemumeRP() {
  if (_cacheItensRemumeRP && _cacheItensRemumeRP.length > 0) return _cacheItensRemumeRP;
  var conteudo = "";
  try {
    var idRemume = (typeof ConfigService !== "undefined" && typeof ConfigService.get === "function")
      ? (ConfigService.get("SPREADSHEET_ID_REMUME") || "remume_local")
      : "remume_local";
    if (typeof lerPlanilhaEmCache === "function") {
      conteudo = lerPlanilhaEmCache("remume", idRemume, false);
    }
    if (!conteudo && typeof obterPlanilha === "function") {
      conteudo = obterPlanilha("remume", idRemume, false);
    }
  } catch (_) {}

  if (!conteudo && typeof require !== "undefined") {
    try {
      var fs = require("fs");
      var path = require("path");
      var caminhos = [
        path.resolve(process.cwd(), "REMUME_RP.csv"),
        path.resolve(__dirname, "..", "REMUME_RP.csv"),
        path.resolve(__dirname, "REMUME_RP.csv")
      ];
      for (var i = 0; i < caminhos.length; i++) {
        if (fs.existsSync(caminhos[i])) {
          conteudo = fs.readFileSync(caminhos[i], "utf8");
          break;
        }
      }
    } catch (_) {}
  }

  if (!conteudo) return [];
  var linhas = String(conteudo).split(/\r?\n/)
    .map(function(l) { return l.replace(/^"|"$/g, "").trim(); })
    .filter(function(l) { return l.length > 0 && l.toLowerCase() !== "medicamento"; });

  _cacheItensRemumeRP = linhas;
  return _cacheItensRemumeRP;
}

/**
 * Consulta determinística da REMUME de Ribeirão Preto.
 * Mapeia sinônimos comerciais, remove sais e separa monoterapia de associações.
 */
function consultarRemumeRP(termo, medHslFallback) {
  if (!termo || typeof termo !== "string") {
    return { presente: false, farmaco: "", apresentacoes: [], selo: "⚪ [NÃO-REMUME]" };
  }

  var termoLimpo = termo.trim().toLowerCase();
  var termoNorm = normalizarPrincipioAtivo(termoLimpo);

  // Expansão por dicionário de marcas e sinônimos comerciais
  var sin = (typeof DICIONARIO_FARMACO !== "undefined" && DICIONARIO_FARMACO[termoLimpo])
    ? DICIONARIO_FARMACO[termoLimpo]
    : termoNorm;
  var termoAlvo = normalizarPrincipioAtivo(sin);
  if (!termoAlvo) {
    termoAlvo = termoNorm;
  }

  var ehBuscaAssociacao = termoAlvo.indexOf("+") !== -1 || /clavulan/i.test(termoAlvo);
  var itens = obterItensRemumeRP();
  var isolados = [];
  var associados = [];

  for (var i = 0; i < itens.length; i++) {
    var linhaOriginal = itens[i];
    var linhaNorm = normalizarPrincipioAtivo(linhaOriginal);

    // Regex de palavra inteira ou início de termo para evitar falsos positivos
    var regexPalavra = new RegExp("(?:^|\\s)" + termoAlvo.replace("+", "\\+") + "(?:\\s|$|[0-9])", "i");
    if (regexPalavra.test(linhaNorm) || linhaNorm.indexOf(termoAlvo) !== -1) {
      if (linhaOriginal.indexOf("+") !== -1) {
        if (associados.indexOf(linhaOriginal) === -1) associados.push(linhaOriginal);
      } else {
        if (isolados.indexOf(linhaOriginal) === -1) isolados.push(linhaOriginal);
      }
    }
  }

  var apresentacoes = ehBuscaAssociacao ? associados.concat(isolados) : isolados.concat(associados);

  // Fallback transparente se o mock de teste não carregou a lista do CSV mas o HSL traz flags estáticas
  if (apresentacoes.length === 0 && medHslFallback && medHslFallback.na_remume) {
    var aprsFallback = Array.isArray(medHslFallback.apresentacoes_remume) ? medHslFallback.apresentacoes_remume : [];
    return {
      presente: true,
      farmaco: termo,
      apresentacoes: aprsFallback,
      selo: "🟢 [REMUME-RP]"
    };
  }

  var presente = apresentacoes.length > 0;
  return {
    presente: presente,
    farmaco: termo,
    apresentacoes: apresentacoes,
    selo: presente ? "🟢 [REMUME-RP]" : "⚪ [NÃO-REMUME]"
  };
}

// ==============================================================================
// BASE OFICIAL DE POSOLOGIAS: GUIA FARMACÊUTICO HOSPITAL SÍRIO-LIBANÊS (HSL)
// ==============================================================================

var _cacheGuiaHSL = null;

/**
 * Obtém a coleção de medicamentos do Guia HSL da memória RAM ou arquivo local.
 */
function normalizarSecoesGuiaHSL(meds) {
  return meds.map(function(med) {
    var secoes = separarSecoesPosologicas(med.posologia_completa);
    if (!secoes.reconhecidas) return med;
    return Object.assign({}, med, {
      dose_adulto: secoes.adulto,
      dose_pediatria: secoes.pediatria,
      dose_maxima: secoes.dose_maxima,
      ajuste_dose: secoes.ajuste_dose,
      posologia_geral: secoes.geral
    });
  });
}

function obterGuiaFarmaceuticoHSL() {
  if (_cacheGuiaHSL && _cacheGuiaHSL.length > 0) return _cacheGuiaHSL;

  // 1. Injetado no contexto global do runtime Node.js
  if (typeof __BASE_GUIA_HSL__ !== "undefined" && __BASE_GUIA_HSL__ && Array.isArray(__BASE_GUIA_HSL__.medicamentos)) {
    _cacheGuiaHSL = normalizarSecoesGuiaHSL(__BASE_GUIA_HSL__.medicamentos);
    return _cacheGuiaHSL;
  }

  // 2. Função helper injetada pelo runtime
  if (typeof obterBaseGuiaHSL === "function") {
    var raw = obterBaseGuiaHSL();
    if (raw && Array.isArray(raw.medicamentos)) {
      _cacheGuiaHSL = normalizarSecoesGuiaHSL(raw.medicamentos);
      return _cacheGuiaHSL;
    }
  }

  // 3. Fallback lendo arquivo json em src/data ou data/
  try {
    if (typeof require !== "undefined") {
      var fs = require("fs");
      var path = require("path");
      var caminhos = [
        path.resolve(__dirname, "data", "guia_farmaceutico_hsl.json"),
        path.resolve(__dirname, "..", "data", "guia_farmaceutico_hsl.json"),
        path.resolve(process.cwd(), "src", "data", "guia_farmaceutico_hsl.json"),
        path.resolve(process.cwd(), "data", "guia_farmaceutico_hsl.json")
      ];
      for (var i = 0; i < caminhos.length; i++) {
        if (fs.existsSync(caminhos[i])) {
          var payload = JSON.parse(fs.readFileSync(caminhos[i], "utf8"));
          if (payload && Array.isArray(payload.medicamentos)) {
            _cacheGuiaHSL = normalizarSecoesGuiaHSL(payload.medicamentos);
            return _cacheGuiaHSL;
          }
        }
      }
    }
  } catch (e) {
    Logger.log("Aviso ao carregar Guia HSL via arquivo: " + e.message);
  }

  return [];
}

/**
 * Normaliza termo para busca fonética e semântica de medicamentos.
 */
function normalizarTermoMedicamento(txt) {
  return String(txt || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\([A-Z]\)/g, "")
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Busca um medicamento específico na base do HSL por nome DCI, sinônimo ou marca comercial.
 */
function buscarMedicamentoNoHSL(termo) {
  if (!termo) return null;
  var meds = obterGuiaFarmaceuticoHSL();
  if (!meds || meds.length === 0) return null;

  var termoLimpo = termo.trim().toLowerCase();
  var termoNorm = normalizarTermoMedicamento(termo);

  // Expansão por dicionário de sinônimos/marcas
  var sin = DICIONARIO_FARMACO[termoLimpo];
  var sinNorm = sin ? normalizarTermoMedicamento(sin) : null;

  // 1. Correspondência exata no nome normalizado
  for (var i = 0; i < meds.length; i++) {
    var m = meds[i];
    if (m.nome_normalizado === termoNorm || (sinNorm && m.nome_normalizado === sinNorm)) {
      return m;
    }
  }

  // 2. Prefixo exato (ex: "AMOXICILINA" casa com "AMOXICILINA + CLAVULANATO")
  for (var j = 0; j < meds.length; j++) {
    var med = meds[j];
    if (med.nome_normalizado.indexOf(termoNorm) === 0 || (sinNorm && med.nome_normalizado.indexOf(sinNorm) === 0)) {
      return med;
    }
  }

  // 3. Contém substring
  for (var k = 0; k < meds.length; k++) {
    var item = meds[k];
    if (item.nome_normalizado.indexOf(termoNorm) !== -1 || (sinNorm && item.nome_normalizado.indexOf(sinNorm) !== -1)) {
      return item;
    }
  }

  // 4. Busca nas apresentações comerciais
  for (var x = 0; x < meds.length; x++) {
    var cand = meds[x];
    if (cand.apresentacoes_hsl && cand.apresentacoes_hsl.length > 0) {
      for (var a = 0; a < cand.apresentacoes_hsl.length; a++) {
        var aprNorm = normalizarTermoMedicamento(cand.apresentacoes_hsl[a]);
        if (aprNorm.indexOf(termoNorm) !== -1) {
          return cand;
        }
      }
    }
  }

  return null;
}

/**
 * Formata a ficha posológica oficial completa do medicamento para exibição imediata no Telegram.
 */
function formatarFichaPosologicaHSL(med) {
  if (!med) return "❌ Medicamento não encontrado no Guia Farmacêutico HSL.";

  var linhas = [];
  linhas.push("💊 *GUIA FARMACÊUTICO HSL — POSOLOGIA OFICIAL*");
  linhas.push("📋 *Fármaco (DCI):* *" + med.farnaco + "*");
  
  var remumeInfo = (typeof consultarRemumeRP === "function")
    ? consultarRemumeRP(med.farnaco, med)
    : { presente: !!med.na_remume, apresentacoes: med.apresentacoes_remume || [] };

  if (remumeInfo.presente) {
    linhas.push("🏛️ *Status SUS:* 🟢 [REMUME-RP] *PADRONIZADO NA REDE MUNICIPAL (Ribeirão Preto)*");
    if (remumeInfo.apresentacoes && remumeInfo.apresentacoes.length > 0) {
      linhas.push("📦 *Apresentações na Rede Municipal:*");
      remumeInfo.apresentacoes.forEach(function(apr) {
        linhas.push("  • `" + apr + "`");
      });
    }
  } else {
    linhas.push("🏛️ *Status SUS:* ⚪ [NÃO-REMUME] *NÃO CONSTA NA REDE MUNICIPAL*");
    linhas.push("_(Uso hospitalar, componente especializado ou compra pelo paciente)_");
  }

  if (med.dose_adulto) {
    linhas.push("\n👤 *DOSE ADULTO:*");
    linhas.push(med.dose_adulto);
  }
  if (med.posologia_geral) linhas.push("\n*Observações posológicas:*\n" + med.posologia_geral);

  linhas.push("\n👶 *DOSE PEDIÁTRICA:*");
  if (med.dose_pediatria && med.dose_pediatria.trim()) {
    linhas.push(med.dose_pediatria);
  } else {
    linhas.push("⚠️ *Informação pediátrica não localizada na extração.* Não concluir contraindicação ou ausência de padronização a partir deste campo vazio; conferir a ficha original.");
  }

  if (med.dose_maxima) {
    linhas.push("\n⚖️ *DOSE MÁXIMA:*");
    linhas.push(med.dose_maxima);
  }

  if (med.ajuste_dose) {
    linhas.push("\n⚠️ *AJUSTE DE DOSE (RENAL / HEPÁTICO):*");
    linhas.push(med.ajuste_dose);
  }

  if (med.administracao) {
    linhas.push("\n🍽️ *ADMINISTRAÇÃO & RECOMENDAÇÕES:*");
    linhas.push(med.administracao);
  }

  if (med.preparo_diluicao) {
    linhas.push("\n💧 *PREPARO & DILUIÇÃO:*");
    linhas.push(med.preparo_diluicao);
  }

  if (med.gestacao_lactacao) {
    linhas.push("\n🤰 *GESTAÇÃO & LACTAÇÃO:*");
    linhas.push(med.gestacao_lactacao);
  }

  if (med.cuidados_especificos) {
    linhas.push("\n🔍 *MONITORAMENTO & CUIDADOS:*");
    linhas.push(med.cuidados_especificos);
  }

  if (med.contraindicacoes) {
    linhas.push("\n🛑 *CONTRAINDICAÇÕES:*");
    linhas.push(med.contraindicacoes);
  }

  linhas.push("\n📚 *Fonte Oficial:* Guia Farmacêutico Hospital Sírio-Libanês (https://guiafarmaceutico.hsl.org.br)");
  return linhas.join("\n");
}

/**
 * Filtra e compacta medicamentos do HSL relevantes para o caso clínico / prescrição.
 * Respeita a regra de ouro: MEDICAMENTOS DA REMUME VÊM SEMPRE PRIMEIRO.
 */
function filtrarContextoPosologiasHSL(pedidoUsuario) {
  var meds = obterGuiaFarmaceuticoHSL();
  if (!meds || meds.length === 0) return "";

  var STOP_WORDS_MEDICAS_HSL = {
    "ANOS": true, "ANO": true, "MES": true, "MESES": true, "DIA": true, "DIAS": true,
    "PESO": true, "QUILOS": true, "QUILO": true, "KGS": true, "KG": true, "CRIANCA": true,
    "CRIANCAS": true, "ADULTO": true, "ADULTOS": true, "PACIENTE": true, "PACIENTES": true,
    "RECEITA": true, "PRESCREVER": true, "TOMAR": true, "FAZER": true, "USO": true,
    "VIA": true, "ORAL": true, "COMP": true, "COMPRIMIDO": true, "COMPRIMIDOS": true,
    "XAROPE": true, "GOTAS": true, "DOSE": true, "DOSES": true, "PARA": true, "COM": true,
    "SEM": true, "HORA": true, "HORAS": true, "FEBRE": true, "DOR": true, "TOSSE": true,
    "QUADRO": true, "CASO": true, "PRESCRICAO": true, "SOLUCAO": true, "SUSPENSAO": true
  };

  function termoCasaMedicamentoHSL(mNorm, t) {
    if (!mNorm || !t) return false;
    var palavras = mNorm.split(/[\s\+\/\(\)]+/).filter(Boolean);
    for (var pIdx = 0; pIdx < palavras.length; pIdx++) {
      var p = palavras[pIdx];
      if (p === t) return true;
      if (t.length >= 4 && p.indexOf(t) === 0) return true;
      if (t.length >= 5 && p.length >= 5 && p.indexOf(t) !== -1) return true;
    }
    return false;
  }

  var pedidoLower = (typeof normalizarTexto === "function") ? normalizarTexto(pedidoUsuario) : String(pedidoUsuario || "").toLowerCase();
  var pedidoUpper = normalizarTermoMedicamento(pedidoUsuario);
  var termos = pedidoUpper.split(/\s+/).filter(function(t) { return t.length >= 3 && !STOP_WORDS_MEDICAS_HSL[t]; });

  // Expansão por sinônimos
  var termosSet = {};
  termos.forEach(function(t) { termosSet[t] = true; });
  termos.slice().forEach(function(termo) {
    var sin = DICIONARIO_FARMACO[termo.toLowerCase()];
    if (sin) {
      var sn = normalizarTermoMedicamento(sin);
      if (!termosSet[sn]) {
        termosSet[sn] = true;
        termos.push(sn);
      }
    }
  });

  // Expansão por síndromes clínicas mapeadas (amigdalite, pneumonia, rinite, etc.)
  for (var sindrome in MAPA_SINDROMES_APS) {
    if (pedidoLower.indexOf(sindrome.toLowerCase()) !== -1) {
      MAPA_SINDROMES_APS[sindrome].forEach(function(item) {
        var itemNorm = normalizarTermoMedicamento(item);
        if (!termosSet[itemNorm]) {
          termosSet[itemNorm] = true;
          termos.push(itemNorm);
        }
      });
    }
  }

  // Localiza matches com proteção contra falso positivo
  var selecionados = [];
  var vistos = {};

  for (var i = 0; i < meds.length; i++) {
    var m = meds[i];
    var mNorm = m.nome_normalizado;

    for (var k = 0; k < termos.length; k++) {
      var t = termos[k];
      if (termoCasaMedicamentoHSL(mNorm, t)) {
        if (!vistos[m.farnaco]) {
          vistos[m.farnaco] = true;
          selecionados.push(m);
        }
        break;
      }
    }
  }

  if (selecionados.length === 0) return "";

  function pedidoExplicito(med) {
    var nome = normalizarTermoMedicamento(med.farnaco).replace(/\s*\([^)]*\)/g, '').trim();
    return nome && (' ' + pedidoUpper + ' ').indexOf(' ' + nome + ' ') >= 0;
  }
  // Nome solicitado precede expansão sindrômica e disponibilidade municipal.
  selecionados.sort(function(a, b) {
    if (pedidoExplicito(a) !== pedidoExplicito(b)) return pedidoExplicito(a) ? -1 : 1;
    if (a.na_remume && !b.na_remume) return -1;
    if (!a.na_remume && b.na_remume) return 1;
    return a.farnaco.localeCompare(b.farnaco);
  });

  // Nunca exclui fármacos explicitamente mencionados para cumprir o limite.
  selecionados = selecionados.filter(function(m, i) { return i < 8 || pedidoExplicito(m); });

  var blocos = [];
  for (var s = 0; s < selecionados.length; s++) {
    var item = selecionados[s];
    var tagRemume = item.na_remume
      ? "PADRONIZADO NA REMUME (não comprova estoque; adequação clínica tem prioridade)"
      : "⚠️ FORA DA REMUME (USAR SÓ SE NÃO HOUVER ALTERNATIVA NA REDE MUNICIPAL)";

    var bloco = [
      "• MEDICAMENTO: " + item.farnaco + " [" + tagRemume + "]",
      item.apresentacoes_remume && item.apresentacoes_remume.length > 0
        ? "  Apresentações REMUME: " + item.apresentacoes_remume.join(" | ")
        : "",
      item.dose_adulto ? "  Dose Adulto Oficial HSL (uso adulto): " + item.dose_adulto.replace(/\n/g, " ") : "",
      item.dose_pediatria && item.dose_pediatria.trim()
        ? "  Dose Pediátrica Oficial HSL: " + item.dose_pediatria.replace(/\n/g, " ")
        : "  ⚠️ DOSE PEDIÁTRICA NÃO PADRONIZADA NO GUIA HSL (uso adulto / conferir ficha original e especialista; não inventar dose em mg/kg)",
      item.ajuste_dose ? "  Ajuste Renal/Hepático HSL: " + item.ajuste_dose.replace(/\n/g, " ") : "",
      item.administracao ? "  Administração & Orientações: " + item.administracao.replace(/\n/g, " ") : "",
      item.dose_maxima ? "  Dose máxima: " + item.dose_maxima : "",
      item.contraindicacoes ? "  Contraindicações: " + item.contraindicacoes : "",
      item.gestacao_lactacao ? "  Gestação/lactação: " + item.gestacao_lactacao : "",
      item.preparo_diluicao ? "  Preparo/diluição: " + item.preparo_diluicao : "",
      item.cuidados_especificos ? "  Cuidados e monitorização: " + item.cuidados_especificos : "",
      item.posologia_geral ? "  Observações: " + item.posologia_geral : "",
      "  Rastreabilidade interna: HSL, ficha " + item.id + "; conferir condições da indicação."
    ].filter(Boolean).join("\n");

    blocos.push(bloco);
  }

  return blocos.join("\n\n");
}

// ==============================================================================
// BASE DE PROTOCOLOS DETERMINÍSTICOS E DIRETRIZES BRASILEIRAS (FMRP-USP / SBC / ILAS)
// ==============================================================================

var PROTOCOLOS_CLINICOS_EMERGENCIA = {
  "sepse": {
    "titulo": "Sepse e Choque Séptico",
    "diretriz_brasileira": "ILAS (Instituto Latino-Americano de Sepse) 2023 / CFM",
    "diretriz_internacional": "Surviving Sepsis Campaign (SSC) 2021",
    "conduta_imediata": "1. Reconhecimento precoce (qSOFA ≥ 2 ou alteração de disfunção orgânica: Glasgow, PA, FR).\n" +
      "2. Pacote de 1ª hora (ILAS / SSC):\n" +
      "   • Coleta de lactato arterial ou venoso imediato.\n" +
      "   • 2 pares de hemoculturas antes do antimicrobiano (sem atrasar início > 45 min).\n" +
      "   • Antibioticoterapia de amplo espectro na 1ª hora.\n" +
      "   • Ressuscitação volêmica: Cristaloide balanceado (Ringer Lactato preferível a SF 0,9%) 30 mL/kg nas primeiras 3h se hipotensão (PAS < 90 ou PAM < 65) ou Lactato ≥ 4 mmol/L (36 mg/dL).\n" +
      "   • Droga vasoativa de 1ª escolha: Noradrenalina precoce (iniciar se PAM < 65 mesmo durante infusão de cristaloide). Alvo PAM ≥ 65 mmHg.",
    "divergencia": "🇧🇷 ILAS vs 🌐 SSC: O ILAS reforça que em hospitais brasileiros sem leito imediato de UTI, a noradrenalina em veia periférica calibrosa bem puncionada é fortemente encorajada nas primeiras horas para não atrasar reversão de choque enquanto se providencia CVC. A SSC sugere corticoide (Hidrocortisona 200 mg/dia) se noradrenalina > 0,25 mcg/kg/min por mais de 4h."
  },
  "iam": {
    "titulo": "Síndrome Coronariana Aguda (IAM com e sem supra de ST)",
    "diretriz_brasileira": "Diretrizes SBC (Sociedade Brasileira de Cardiologia) 2021/2023",
    "diretriz_internacional": "AHA/ACC 2023 / ESC 2023",
    "conduta_imediata": "1. ECG de 12 derivações em até 10 minutos da admissão.\n" +
      "2. Terapia Antiplaquetária Dupla Imediata (DAPT):\n" +
      "   • AAS 200-300 mg mastigável (manutenção 81-100 mg/dia).\n" +
      "   • Inibidor P2Y12: Ticagrelor 180 mg VO de ataque (manutenção 90 mg 12/12h) OU Clopidogrel 300 mg (600 mg se ICP primária ou 300 mg se trombólise ≤ 75 anos).\n" +
      "3. Anticoagulação: Enoxaparina 30 mg IV bolus + 1 mg/kg SC 12/12h (se < 75 anos e ClCr > 30) ou HNF.\n" +
      "4. Alívio de Sintomas e Isquemia:\n" +
      "   • Nitrato sublingual (Isordil 5 mg) se dor persistente (CONTRAINDICADO se PAS < 90, infarto de VD ou uso de inibidor de PDE5 nas últimas 24-48h).\n" +
      "   • Morfina 2 a 4 mg IV apenas se dor refratária (evitar de rotina por retardar absorção de P2Y12).\n" +
      "5. Reperfusão no IAM com Supra:\n" +
      "   • ICP Primária: tempo porta-balão ≤ 90 min (ou ≤ 120 min se transferido).\n" +
      "   • Trombólise (Tenecteplase/Alteplase): tempo porta-agulha ≤ 30 min se ICP não disponível em 120 min.",
    "divergencia": "🇧🇷 SBC vs 🌐 ESC/AHA: No Brasil, o Clopidogrel permanece como opção prioritária no SUS pela indisponibilidade frequente de Ticagrelor/Prasugrel na rede pública. Se trombolisado com Tenecteplase, a SBC e o Ministério da Saúde recomendam dose ajustada por peso exato; se idade ≥ 75 anos, meia dose de TNK sem bolus de enoxaparina."
  },
  "eap": {
    "titulo": "Edema Agudo de Pulmão (EAP Hipertensivo) e IC Descompensada",
    "diretriz_brasileira": "Diretrizes SBC de Insuficiência Cardíaca 2021/2023",
    "diretriz_internacional": "ESC Heart Failure 2023 / AHA 2022",
    "conduta_imediata": "1. Oxigenoterapia e VNI Imediata: CPAP (8-10 cmH2O) ou BIPAP (IPAP 12-14, EPAP 6-8) reduzem intubação e mortalidade na primeira hora.\n" +
      "2. Vasodilatador Venoso de Ação Rápida (EAP Hipertensivo com PAS > 140):\n" +
      "   • Nitroglicerina (Tridil) IV: iniciar a 10-20 mcg/min e titular a cada 5 min OU Nitroprussiato de Sódio (Nipride) 0,3-0,5 mcg/kg/min se emergência hipertensiva grave.\n" +
      "3. Diurético de Alça Venoso: Furosemida 20 a 40 mg IV (ou 1 a 2x a dose oral prévia do paciente).\n" +
      "4. Posição: Cabeceira elevada a 90 graus com pernas pendentes.\n" +
      "5. Morfina NÃO é recomendada de rotina (aumenta intubação e UTI pela ESC/SBC).",
    "divergencia": "A SBC e ESC desaconselham formalmente morfina de rotina no EAP. O foco imediato no EAP hipertensivo é a vasodilatação rápida (redução de pós-carga) antes de grandes volumes de diurético."
  },
  "cad": {
    "titulo": "Cetoacidose Diabética (CAD) e Estado Hiperosmolar Hiperglicêmico (EHH)",
    "diretriz_brasileira": "Diretrizes SBD (Sociedade Brasileira de Diabetes) 2023/2024",
    "diretriz_internacional": "ADA (American Diabetes Association) Standards of Care 2024",
    "conduta_imediata": "1. Hidratação Venosa (Etapa 1):\n" +
      "   • SF 0,9% 1000 a 1500 mL na 1ª hora (15-20 mL/kg/h).\n" +
      "   • Após 1ª hora: avaliar Na corrigido. Se Na normal/alto: trocar para NaCl 0,45% 250-500 mL/h.\n" +
      "2. Avaliação Mandatória do Potássio ANTES da Insulina (ADA 2024):\n" +
      "   • Se K < 3,5 mEq/L: NÃO INICIAR INSULINA! Repor KCl 20 a 30 mEq/h até K > 3,5 mEq/L.\n" +
      "   • Se K 3,5 a 5,2 mEq/L: Iniciar insulina E repor KCl 20-30 mEq por litro de soro de manutenção (Atenção ISMP Brasil: KCl 19,1% [1 mL = 2,56 mEq -> 10 mL = ~25,6 mEq] OU KCl 10% [1 mL = 1,34 mEq -> 10 mL = ~13,4 mEq]. NUNCA administrar KCl puro em bolus venoso!).\n" +
      "   • Se K > 5,2 mEq/L: Iniciar insulina e NÃO repor potássio (monitorar a cada 2h).\n" +
      "3. Insulinoterapia:\n" +
      "   • Insulina Regular IV contínua: 0,1 U/kg/h (ou bolus 0,1 U/kg + 0,1 U/kg/h).\n" +
      "   • Meta de queda glicêmica: 50 a 70 mg/dL por hora.\n" +
      "   • Quando glicemia atingir 200 mg/dL: associar Soro Glicosado a 5% (SG 5%) e reduzir insulina para 0,02-0,05 U/kg/h para evitar hipoglicemia e edema cerebral enquanto fecha o ânion gap.\n" +
      "4. Bicarbonato: reservado APENAS se pH < 6,9.",
    "divergencia": "Tanto SBD quanto ADA condenam o uso de bicarbonato se pH ≥ 6,9 (risco de hipocalemia severa, hipóxia tecidual e acidose liquórica paradoxal). Critério de resolução: glicemia < 200 + 2 de: HCO3 ≥ 15, pH venoso > 7,30 e Anion Gap normal (≤ 12)."
  },
  "tep": {
    "titulo": "Tromboembolismo Pulmonar (TEP)",
    "diretriz_brasileira": "Diretriz SBC / SBACV de Embolia Pulmonar",
    "diretriz_internacional": "ESC Pulmonary Embolism Guidelines / CHEST",
    "conduta_imediata": "1. Estratificação de Risco Imediata:\n" +
      "   • Alto Risco (Instabilidade Hemodinâmica / Choque / PAS < 90):\n" +
      "     - Suporte ventilatório e hemodinâmico (evitar sobrecarga volêmica, vasopressor precoce: Noradrenalina).\n" +
      "     - Reperfusão de emergência imediata: Trombólise sistêmica com Alteplase (rtPA 100 mg IV em 2h ou 0,6 mg/kg em 15 min na PCR iminente).\n" +
      "     - Anticoagulação imediata com HNF venosa em bolus (80 UI/kg) e infusão (18 UI/kg/h).\n" +
      "   • Risco Intermediário / Baixo (Estável):\n" +
      "     - Anticoagulação plena com Enoxaparina 1 mg/kg SC 12/12h ou NOACs (Rivaroxabana 15 mg 12/12h 21 dias ou Apixabana 10 mg 12/12h 7 dias).\n" +
      "     - Escore sPESI para decisão de internação vs alta precoce.",
    "divergencia": "No SUS/Brasil, Enoxaparina e Varfarina ainda são as mais disponíveis na internação e alta, enquanto no cenário privado e internacional os NOACs (DOACs) são primeira linha isolada."
  },
  "dpoc": {
    "titulo": "DPOC Exacerbada",
    "diretriz_brasileira": "Diretrizes SBPT (Sociedade Brasileira de Pneumologia e Tisiologia) 2023",
    "diretriz_internacional": "GOLD 2024",
    "conduta_imediata": "1. Broncodilatadores de Ação Rápida:\n" +
      "   • Salbutamol 4 a 8 jatos com espaçador a cada 20 min na 1ª hora (ou nebulização 2,5-5 mg).\n" +
      "   • Brometo de Ipratrópio associado a cada 20 min na 1ª hora.\n" +
      "2. Corticoterapia Sistêmica Precoce:\n" +
      "   • Prednisona 40 mg VO 1x/dia por 5 dias (GOLD/SBPT) OU Hidrocortisona 100 mg IV se via oral inviável.\n" +
      "3. Oxigenoterapia Controlada:\n" +
      "   • Alvo SpO2: 88% a 92% (evitar hiperóxia que induz efeito Haldane e narcose por CO2).\n" +
      "4. Ventilação Não Invasiva (VNI):\n" +
      "   • Primeira linha se acidose respiratória aguda (pH < 7,35 e PaCO2 > 45 mmHg) ou fadiga muscular.\n" +
      "5. Antibioticoterapia (Critérios de Anthonisen: escarro purulento, aumento de volume, piora da dispneia):\n" +
      "   • Amoxicilina + Clavulanato 875/125 mg 12/12h por 5-7 dias OU Azitromicina 500 mg/dia por 5 dias.",
    "divergencia": "A SBPT e o GOLD 2024 reforçam tempo de corticoide curto de apenas 5 dias, eliminando desmames desnecessários."
  },
  "asma": {
    "titulo": "Crise de Asma Grave no Adulto",
    "diretriz_brasileira": "Diretrizes SBPT para Manejo da Asma",
    "diretriz_internacional": "GINA 2024/2026 Strategy Report",
    "conduta_imediata": "1. Broncodilatadores de Ação Rápida:\n" +
      "   • Salbutamol spray 4 a 10 jatos com espaçador a cada 20 min na 1ª hora (ou nebulização 2,5 a 5 mg).\n" +
      "   • Brometo de Ipratrópio (0,5 mg nebulizado ou 4 a 8 jatos) associado na 1ª hora em crise moderada a grave.\n" +
      "2. Corticoterapia Sistêmica Precoce (início na 1ª hora):\n" +
      "   • Prednisona 40 a 50 mg VO por 5 a 7 dias OU Hidrocortisona 200 mg IV se via oral impraticável.\n" +
      "3. Oxigenoterapia Titulada (Alvo GINA):\n" +
      "   • Alvo SpO₂: 93% a 95% em adultos (em gestantes ≥ 95%). Evitar hipoxemia e evitar hiperóxia excessiva.\n" +
      "4. Sulfato de Magnésio EV (se má resposta inicial ou crise grave):\n" +
      "   • Sulfato de Magnésio 2 g IV em 20 minutos (Atenção ISMP Brasil: MgSO4 50% [500 mg/mL -> 2g = 4 mL] OU MgSO4 10% [100 mg/mL -> 2g = 20 mL] diluídos em 100 mL de SF 0,9% ou SG 5%).\n" +
      "5. Critérios de Alarme (Via Aérea / UTI):\n" +
      "   • Silêncio respiratório, exaustão, confusão mental ou PaCO₂ normal/elevada (indica falência muscular iminente).",
    "divergencia": "Diferente da DPOC (alvo 88–92% pelo risco de retenção de CO₂), na Asma o alvo mandatório é SpO₂ 93–95% (GINA 2026)."
  },
  "anafilaxia": {
    "titulo": "Anafilaxia e Choque Anafilático",
    "diretriz_brasileira": "ASBAI (Associação Brasileira de Alergia e Imunologia) / CFM",
    "diretriz_internacional": "WAO (World Allergy Organization) 2020 / EAACI",
    "conduta_imediata": "1. Droga de 1ª Linha Mandatória (Imediata / Intramuscular):\n" +
      "   • Adrenalina (Epinefrina) 1:1000 (1 mg/mL) IM no vasto lateral da coxa (face anterolateral). Dose adulto: 0,5 mg (0,5 mL) IM; dose pediátrica: 0,01 mg/kg (máx 0,3 mg) IM. Repetir a cada 5-15 min se refratário. Atenção ISMP: NUNCA usar Adrenalina 1:10.000 (0,1 mg/mL - solução de PCR) para aplicação IM em anafilaxia! Se necessária infusão contínua em choque refratário: 1 ampola 1:1000 (1 mg/1 mL) em 249 mL SG 5% (4 mcg/mL).\n" +
      "2. Posicionamento e Manejo Hemodinâmico:\n" +
      "   • Decúbito dorsal com membros inferiores elevados (Trendelenburg/elevação de pernas). NUNCA colocar o paciente sentado ou em pé subitamente (risco de síndrome da veia cava vazia e parada cardíaca).\n" +
      "   • Oxigenoterapia sob máscara com reservatório (alvo SpO₂ > 95%).\n" +
      "   • Expansão volêmica rápida: SF 0,9% ou Ringer Lactato 20 mL/kg em bolus rápido (adulto: 1.000 a 2.000 mL se hipotensão).\n" +
      "3. Adjuvantes de 2ª Linha (NÃO substituem adrenalina e NÃO devem atrasá-la):\n" +
      "   • Anti-histamínicos: Difenidramina 25-50 mg IV ou Prometazina 25 mg IM/IV (alívio de prurido/urticária).\n" +
      "   • Corticoterapia: Hidrocortisona 200-500 mg IV ou Metilprednisolona 1-2 mg/kg IV (prevenção de reação bifásica tardia).\n" +
      "   • Broncodilatador inalatório (Salbutamol 4-8 jatos) se broncoespasmo associado.",
    "divergencia": "🇧🇷 ASBAI vs 🌐 WAO: A via intramuscular no vasto lateral da coxa é a única via de eleição na anafilaxia inicial (pico sérico em ~8 min vs ~34 min no deltoide/SC). O uso isolado de corticoides ou anti-histamínicos sem adrenalina é falha grave e não previne óbito por asfixia ou colapso circulatório."
  },
  "convulsao": {
    "titulo": "Crise Convulsiva e Estado de Mal Epiléptico (EME)",
    "diretriz_brasileira": "Academia Brasileira de Neurologia (ABN) / Ministério da Saúde",
    "diretriz_internacional": "AES (American Epilepsy Society) Guideline / Neurocritical Care Society",
    "conduta_imediata": "1. Estabilização Imediata (Minutos 0 a 5):\n" +
      "   • Proteção de via aérea (decúbito lateral para prevenir aspiração, oxigênio sob máscara), glicemia capilar imediata (se < 70 mg/dL: 4 ampolas de Glicose 50% IV + Tiamina 100 mg se etilista).\n" +
      "2. 1ª Linha — Benzodiazepínicos (Minutos 5 a 10 se crise > 5 min):\n" +
      "   • Diazepam 10 mg IV lento (0,2 a 0,3 mg/kg, velocidade máx 2-5 mg/min) puro; pode repetir 1x após 5 minutos se mantiver atividade convulsiva.\n" +
      "   • Sem acesso venoso imediato: Midazolam 10 mg IM (0,2 mg/kg, máx 10 mg) no deltoide/vasto lateral.\n" +
      "3. 2ª Linha — Anticonvulsivantes Venosos Não-Sedativos (Minutos 10 a 20):\n" +
      "   • Fenitoína (Hidantal): Dose de ataque 20 mg/kg IV diluída EXCLUSIVAMENTE em Soro Fisiológico 0,9% (precipita em solução glicosada!) na velocidade máxima de 50 mg/min (risco de hipotensão e arritmias ventriculares graves; monitorização com ECG contínuo).\n" +
      "   • Alternativas: Levetiracetam 60 mg/kg IV (máx 4.500 mg) ou Valproato de Sódio 40 mg/kg IV.\n" +
      "4. 3ª Linha — Estado de Mal Refratário (Minutos 20 a 60):\n" +
      "   • Intubação orotraqueal imediata (IOT) + infusão contínua em bomba de Midazolam (0,2 mg/kg bolus + 0,05-2 mg/kg/h) ou Propofol (1-2 mg/kg bolus + 1-5 mg/kg/h) e transferência para UTI.",
    "divergencia": "🇧🇷 ABN/SUS vs 🌐 AES: No SUS, a Fenitoína é a droga de 2ª linha universalmente disponível, exigindo diluição estrita apenas em SF 0,9% e infusão em no máx 50 mg/min. No exterior, Levetiracetam IV e Fosfenitoína são mais utilizados pela comodidade."
  },
  "hda": {
    "titulo": "Hemorragia Digestiva Alta (HDA Varicosa e Não Varicosa)",
    "diretriz_brasileira": "Fisiopatologia e Condutas FMRP-USP / FBG (Federação Brasileira de Gastroenterologia)",
    "diretriz_internacional": "Baveno VII / ACG Upper GI Bleeding Guidelines 2021",
    "conduta_imediata": "1. Estabilização e Estratégia Transfusional Restritiva:\n" +
      "   • 2 acessos venosos calibrosos (14G ou 16G), reposição com Ringer Lactato ou SF 0,9% criteriosa para evitar hipervolemia e agravamento do sangramento varicoso.\n" +
      "   • Transfusão restritiva de Concentrado de Hemácias: indicar apenas se Hb < 7 g/dL (alvo Hb 7 a 8 g/dL). Em coronariopatas graves sintomáticos, alvo Hb > 8 g/dL.\n" +
      "2. Supressão Ácida em Alta Dose (Não Varicosa e Indiferenciada):\n" +
      "   • Omeprazol 80 mg IV em bolus, seguido de infusão contínua 8 mg/h por 72 horas (ou 40 mg IV 12/12h).\n" +
      "3. Terapia Vasoativa Precoce na Suspeita de HDA Varicosa (Cirrose / Hipertensão Portal):\n" +
      "   • Terlipressina 2 mg IV bolus 4/4h (ou Octreotide 50 mcg bolus + 50 mcg/h) iniciada imediatamente antes da EDA.\n" +
      "   • Antibioticoprofilaxia mandatória em cirróticos: Ceftriaxona 1 g IV 1x/dia por 7 dias (reduz infecções bacterianas, ressangramento e mortalidade).\n" +
      "4. Endoscopia Digestiva Alta (EDA) Precoce:\n" +
      "   • Realizar EDA diagnóstica e terapêutica em até 12 horas (no máximo 24h) da admissão após estabilização hemodinâmica.",
    "divergencia": "🇧🇷 FBG/SUS vs 🌐 Baveno VII: No Brasil, Ceftriaxona 1 g/dia é a profilaxia de 1ª linha em cirróticos com HDA devido à alta prevalência de resistência a quinolonas no país. A Terlipressina é o vasoconstritor esplâncnico de escolha na hepatologia brasileira e Baveno VII."
  }
};

/**
 * Consulta protocolo clínico estruturado determinístico
 */
function obterProtocoloClinico(termo) {
  if (!termo) return null;
  var texto = String(termo).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  var aliases = {
    sepse: /\b(?:sepse|sepsis|choque septico|infeccao grave)\b/g,
    iam: /\b(?:iam|infarto|sindrome coronariana(?: aguda)?)\b/g,
    eap: /\b(?:eap|edema agudo (?:de )?pulmao|insuficiencia cardiaca descompensada)\b/g,
    cad: /\b(?:cad|cetoacidose(?: diabetica)?)\b/g,
    tep: /\b(?:tep|tromboembolismo pulmonar|embolia pulmonar)\b/g,
    dpoc: /\bdpoc\b/g,
    asma: /\b(?:asma|crise asmatica)\b/g,
    anafilaxia: /\b(?:anafilaxia|choque anafilatico|reacao anafilatica|anafilat\w*)\b/g,
    convulsao: /\b(?:convulsao|crise convulsiva|estado de mal epiletico|epilepsia|status epilepticus)\b/g,
    hda: /\b(?:hda|hemorragia digestiva alta|sangramento digestivo alto|varizes esofagicas sangrantes)\b/g
  };
  // Um protocolo único não representa choques de etiologias diferentes (exceto anafilaxia).
  if (/\b(?:choque (?:hemorragico|cardiogenico|hipovolemico|obstrutivo))\b/.test(texto) && !/\b(?:anafil\w*)\b/.test(texto)) return null;
  var candidatos = [];
  Object.keys(aliases).forEach(function(chave) {
    var matches = Array.from(texto.matchAll(aliases[chave]));
    if (matches.some(function(m) {
      var antes = texto.slice(0, m.index).split(/[.,;!?:\n]|\bmas\b/).pop();
      // Negação, antecedentes e hipótese a excluir não confirmam o cenário.
      return !/\b(?:sem|nega|negou|nao|ausencia|descartar|afastar|suspeita|possivel|hipotese|historico|antecedente)\b/.test(antes);
    })) candidatos.push(chave);
  });
  return candidatos.length === 1 ? PROTOCOLOS_CLINICOS_EMERGENCIA[candidatos[0]] : null;
}

// ==============================================================================
// PADRONIZAÇÃO DE AMPOLAS DUPLAS E SEGURANÇA HOSPITALAR (ISMP BRASIL)
// ==============================================================================

var PADRONIZACAO_AMPOLAS_DUPLAS_ISMP = {
  "kcl": {
    "farmaco": "Cloreto de Potássio (KCl)",
    "alertaSeguranca": "🚨 ALTO RISCO (ISMP Brasil): NUNCA administrar KCl em bolus venoso direto (risco fatal de PCR em assistolia). Diluição obrigatória!",
    "ampolas": [
      { "apresentacao": "KCl 19,1%", "concentracao": "191 mg/mL", "meq_por_ml": 2.56, "equivalencia": "1 ampola (10 mL) = 1.910 mg KCl = ~25,6 mEq de K+" },
      { "apresentacao": "KCl 10%", "concentracao": "100 mg/mL", "meq_por_ml": 1.34, "equivalencia": "1 ampola (10 mL) = 1.000 mg KCl = ~13,4 mEq de K+" }
    ],
    "regras": "Velocidade máxima de infusão periférica: 10 mEq/h (máx 40 mEq/L de solução). Acesso venoso central com monitorização contínua: 20 a 40 mEq/h em hipocalemia grave."
  },
  "mgso4": {
    "farmaco": "Sulfato de Magnésio (MgSO4)",
    "alertaSeguranca": "🚨 ALTO RISCO (ISMP Brasil): Confusão frequente entre as ampolas de 50% e 10% (risco de superdosagem de 5x com PCR/bloqueio neuromuscular ou subdose ineficaz).",
    "ampolas": [
      { "apresentacao": "MgSO4 50%", "concentracao": "500 mg/mL (0,5 g/mL)", "gramas_por_ml": 0.5, "equivalencia": "1 ampola (10 mL) = 5 g (2 g = 4 mL; 4 g = 8 mL; 1 g = 2 mL)" },
      { "apresentacao": "MgSO4 10%", "concentracao": "100 mg/mL (0,1 g/mL)", "gramas_por_ml": 0.1, "equivalencia": "1 ampola (10 mL) = 1 g (2 g = 20 mL; 4 g = 40 mL; 1 g = 10 mL)" }
    ],
    "regras": "Pré-eclâmpsia grave/Eclâmpsia: Ataque 4g IV (8 mL a 50% em 100 mL SG 5% em 20 min). Asma grave: 2g IV (4 mL a 50% em 100 mL SF em 20 min). Monitorar FR > 16, reflexo patelar presente e diurese > 25 mL/h."
  },
  "adrenalina": {
    "farmaco": "Adrenalina (Epinefrina)",
    "alertaSeguranca": "🚨 ALTO RISCO (ISMP Brasil): NUNCA aplicar Adrenalina 1:10.000 IM em anafilaxia (subdose fatal por diluição 10x menor) e NUNCA aplicar 1:1.000 IV direta em bólus (risco de arritmia maligna/isquemia cerebral).",
    "ampolas": [
      { "apresentacao": "Adrenalina 1:1.000 (1 mg/mL)", "indicacao": "Anafilaxia Intramuscular (IM) no vasto lateral da coxa ou preparo de infusão contínua", "dose": "Adulto: 0,5 mg (0,5 mL) IM puro. Criança: 0,01 mg/kg (máx 0,3 mL) IM puro." },
      { "apresentacao": "Adrenalina 1:10.000 (0,1 mg/mL)", "indicacao": "PCR Adulto/Pediátrico IV/IO ou preparo para choque refratário", "dose": "1 mg IV (10 mL a 1:10.000) a cada 3-5 min em PCR. Preparo: 1 ampola 1:1.000 (1 mL) + 9 mL SF 0,9% = 10 mL a 1:10.000." }
    ],
    "regras": "Anafilaxia: 1ª linha SEMPRE IM no vasto lateral da coxa com 1:1.000. PCR: 1 mg IV (solução 1:10.000). Choque anafilático refratário: infusão contínua em BIC (1 ampola 1:1.000 em 249 mL SG 5% = 4 mcg/mL)."
  }
};

function formatarGuiaAmpolasDuplasISMP(chave) {
  var k = String(chave || "").toLowerCase().trim();
  var item = null;
  if (/kcl|potassio|cloreto de potassio/.test(k)) item = PADRONIZACAO_AMPOLAS_DUPLAS_ISMP.kcl;
  else if (/mgso4|magnesio|sulfato de magnesio/.test(k)) item = PADRONIZACAO_AMPOLAS_DUPLAS_ISMP.mgso4;
  else if (/adrenalina|epinefrina/.test(k)) item = PADRONIZACAO_AMPOLAS_DUPLAS_ISMP.adrenalina;
  if (!item) return null;

  var out = [];
  out.push("💉 *" + item.farmaco.toUpperCase() + " — PADRONIZAÇÃO DE AMPOLAS DUPLAS (ISMP BRASIL)*");
  out.push(item.alertaSeguranca);
  out.push("\n📋 *Apresentações Hospitalares:*");
  item.ampolas.forEach(function(amp) {
    out.push("• *" + amp.apresentacao + "*: " + (amp.equivalencia || amp.indicacao + " — " + amp.dose));
  });
  out.push("\n⚖️ *Regras de Segurança:* " + item.regras);
  return out.join("\n");
}

// ==============================================================================
// CONSULTA EM BASES CIENTÍFICAS ABERTAS E GRATUITAS (EUROPE PMC & NCBI PUBMED)
// ==============================================================================

/**
 * Consulta a API aberta e gratuita do Europe PMC (EBI)
 * Retorna metadados de artigos científicos, revisões sistemáticas e ensaios clínicos.
 */
function consultarEuropePMC(query, maxArtigos) {
  var limite = maxArtigos || 3;
  var qTerm = encodeURIComponent(query + " AND (review OR clinical trial OR guideline OR meta-analysis)");
  var url = "https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=" + qTerm + "&format=json&pageSize=" + limite + "&resultType=lite&sort_date=y";
  
  try {
    var res = UrlFetchApp.fetch(url, { "muteHttpExceptions": true });
    if (res.getResponseCode() === 200) {
      var json = JSON.parse(res.getContentText());
      var resultados = [];
      if (json.resultList && json.resultList.result) {
        var lista = json.resultList.result;
        for (var i = 0; i < lista.length; i++) {
          var item = lista[i];
          resultados.push({
            "titulo": item.title || "Sem título",
            "autores": item.authorString ? item.authorString.split(",")[0] + " et al." : "Vários autores",
            "revista": item.journalTitle || "Periódico Internacional",
            "ano": item.pubYear || "",
            "pmid": item.pmid || "",
            "doi": item.doi || "",
            "link": item.pmid ? "https://pubmed.ncbi.nlm.nih.gov/" + item.pmid + "/" : (item.doi ? "https://doi.org/" + item.doi : "")
          });
        }
      }
      return resultados;
    }
  } catch (e) {
    Logger.log("Erro na consulta ao Europe PMC: " + e.message);
  }
  return [];
}

/**
 * Consulta direta à API pública do PubMed (NCBI Entrez E-utilities)
 */
function consultarPubMed(query, maxArtigos) {
  var limite = maxArtigos || 3;
  var qTerm = encodeURIComponent(query + " AND (guideline[pt] OR practice guideline[pt] OR systematic review[pt] OR randomized controlled trial[pt])");
  var urlBusca = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=" + qTerm + "&retmode=json&retmax=" + limite + "&sort=pub_date";

  try {
    var resBusca = UrlFetchApp.fetch(urlBusca, { "muteHttpExceptions": true });
    if (resBusca.getResponseCode() === 200) {
      var jsonBusca = JSON.parse(resBusca.getContentText());
      var idList = jsonBusca.esearchresult && jsonBusca.esearchresult.idlist ? jsonBusca.esearchresult.idlist : [];
      if (idList.length === 0) return [];

      var urlResumo = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=" + idList.join(",") + "&retmode=json";
      var resResumo = UrlFetchApp.fetch(urlResumo, { "muteHttpExceptions": true });
      if (resResumo.getResponseCode() === 200) {
        var jsonResumo = JSON.parse(resResumo.getContentText());
        var resultados = [];
        for (var i = 0; i < idList.length; i++) {
          var id = idList[i];
          var art = jsonResumo.result ? jsonResumo.result[id] : null;
          if (art) {
            resultados.push({
              "titulo": art.title || "Sem título",
              "autores": art.authors && art.authors.length > 0 ? art.authors[0].name + " et al." : "",
              "revista": art.source || "PubMed",
              "ano": art.pubdate ? art.pubdate.substring(0, 4) : "",
              "pmid": id,
              "link": "https://pubmed.ncbi.nlm.nih.gov/" + id + "/"
            });
          }
        }
        return resultados;
      }
    }
  } catch (e) {
    Logger.log("Erro na consulta ao PubMed: " + e.message);
  }
  return [];
}

/**
 * Busca científica unificada: consulta Europe PMC e PubMed e formata relatório com evidências reais
 */
function buscarEvidenciaMedica(tema) {
  if (!tema) return "Informe o tema médico para pesquisa científica (ex: /evidencia corticoide choque septico).";
  var artigos = consultarEuropePMC(tema, 3);
  if (!artigos || artigos.length === 0) {
    artigos = consultarPubMed(tema, 3);
  }

  var texto = "🔬 *EVIDÊNCIA CIENTÍFICA & LITERATURA MÉDICA (PUBMED / EUROPE PMC)*\n\n" +
    "📌 *Tema Pesquisado:* " + tema + "\n\n";

  if (!artigos || artigos.length === 0) {
    texto += "⚠️ Nenhum ensaio clínico ou diretriz indexada diretamente para este termo em texto livre. Tente termos em inglês ou palavras-chave específicas.";
    return texto;
  }

  for (var i = 0; i < artigos.length; i++) {
    var a = artigos[i];
    texto += "*" + (i + 1) + ". " + a.titulo + "*\n";
    texto += "👤 _" + a.autores + "_ · 📚 *" + a.revista + "* (" + a.ano + ")\n";
    if (a.pmid) texto += "🔗 PMID: `" + a.pmid + "` — [Abrir no PubMed](" + a.link + ")\n\n";
  }

  texto += "💡 *Dica:* Utilize os PMIDs para acessar os artigos originais e meta-análises completas.";
  return texto;
}

// ==============================================================================
// GUIA PEDIÁTRICO OFICIAL DO PEDBOOK (pedb.com.br) & CONDUTAS PEDIÁTRICAS
// ==============================================================================

var _cacheGuiaPedB = null;
var _cacheCondutasPedB = null;

/**
 * Obtém a base oficial de medicamentos pediátricos do PedBook em RAM.
 */
function obterGuiaPediatricoPedB() {
  if (_cacheGuiaPedB && Array.isArray(_cacheGuiaPedB) && _cacheGuiaPedB.length > 0) {
    return _cacheGuiaPedB;
  }
  if (typeof __BASE_GUIA_PEDB__ !== "undefined" && __BASE_GUIA_PEDB__ && Array.isArray(__BASE_GUIA_PEDB__.medicamentos)) {
    _cacheGuiaPedB = __BASE_GUIA_PEDB__.medicamentos;
    return _cacheGuiaPedB;
  }
  if (typeof obterBaseGuiaPedB === "function") {
    try {
      var base = obterBaseGuiaPedB();
      if (base && Array.isArray(base.medicamentos)) {
        _cacheGuiaPedB = base.medicamentos;
        return _cacheGuiaPedB;
      }
    } catch (e) {}
  }
  try {
    if (typeof require !== "undefined") {
      var fs = require("fs");
      var path = require("path");
      var caminhos = [
        path.resolve(__dirname, "data", "guia_pediatrico_pedb.json"),
        path.resolve(__dirname, "..", "data", "guia_pediatrico_pedb.json"),
        path.resolve(process.cwd(), "src", "data", "guia_pediatrico_pedb.json"),
        path.resolve(process.cwd(), "data", "guia_pediatrico_pedb.json")
      ];
      for (var i = 0; i < caminhos.length; i++) {
        if (fs.existsSync(caminhos[i])) {
          var payload = JSON.parse(fs.readFileSync(caminhos[i], "utf8"));
          if (payload && Array.isArray(payload.medicamentos)) {
            _cacheGuiaPedB = payload.medicamentos;
            return _cacheGuiaPedB;
          }
        }
      }
    }
  } catch (e) {
    Logger.log("Aviso ao carregar Guia PedBook via arquivo: " + e.message);
  }
  return [];
}

/**
 * Busca um medicamento pediátrico no PedBook por nome genérico, comercial, sinônimo ou indicação.
 */
function buscarMedicamentoPediatricoPedB(termo) {
  if (!termo) return null;
  var meds = obterGuiaPediatricoPedB();
  if (!meds || meds.length === 0) return null;

  var termoLimpo = termo.trim().toLowerCase();
  var termoNorm = normalizarTermoMedicamento(termo);

  var sin = DICIONARIO_FARMACO[termoLimpo];
  var sinNorm = sin ? normalizarTermoMedicamento(sin) : null;

  // 1. Correspondência exata no nome normalizado ou slug
  for (var i = 0; i < meds.length; i++) {
    var m = meds[i];
    var mNorm = m.nome_normalizado || normalizarTermoMedicamento(m.nome);
    if (mNorm === termoNorm || (sinNorm && mNorm === sinNorm)) {
      return m;
    }
    if (m.slug && (m.slug === termoLimpo || (sin && m.slug === sin))) {
      return m;
    }
  }

  // 2. Correspondência exata em marca comercial ou marcas texto
  for (var k = 0; k < meds.length; k++) {
    var medK = meds[k];
    if (medK.marcas_texto) {
      var marcasNorm = normalizarTermoMedicamento(medK.marcas_texto);
      var palavrasMarcas = marcasNorm.split(/\s+/);
      for (var pm = 0; pm < palavrasMarcas.length; pm++) {
        if (palavrasMarcas[pm] === termoNorm || (sinNorm && palavrasMarcas[pm] === sinNorm)) {
          return medK;
        }
      }
    }
  }

  // 3. Prefixo exato (ex: "AMOXICILINA" casa com "AMOXICILINA + CLAVULANATO")
  for (var j = 0; j < meds.length; j++) {
    var med = meds[j];
    var mNomeNorm = med.nome_normalizado || normalizarTermoMedicamento(med.nome);
    if (mNomeNorm.indexOf(termoNorm) === 0 || (sinNorm && mNomeNorm.indexOf(sinNorm) === 0)) {
      return med;
    }
  }

  // 4. Substring no nome (comprimento >= 4)
  if (termoNorm.length >= 4) {
    for (var l = 0; l < meds.length; l++) {
      var medL = meds[l];
      var mNN = medL.nome_normalizado || normalizarTermoMedicamento(medL.nome);
      if (mNN.indexOf(termoNorm) !== -1 || (sinNorm && mNN.indexOf(sinNorm) !== -1)) {
        return medL;
      }
    }
  }

  // 5. Palavras-chave
  for (var p = 0; p < meds.length; p++) {
    var medP = meds[p];
    if (Array.isArray(medP.palavras_chave)) {
      for (var pk = 0; pk < medP.palavras_chave.length; pk++) {
        var kwNorm = normalizarTermoMedicamento(medP.palavras_chave[pk]);
        if (kwNorm === termoNorm || (sinNorm && kwNorm === sinNorm)) {
          return medP;
        }
      }
    }
  }

  return null;
}

/**
 * Formata a ficha pediátrica oficial do PedBook para exibição em markdown/Telegram.
 */
function formatarFichaPediatricaPedB(med) {
  if (!med) return "Ficha pediátrica não encontrada.";

  var linhas = [];
  linhas.push("👶 *GUIA PEDIÁTRICO OFICIAL (PEDBOOK)*");
  linhas.push("═══════════════════════════════════════");
  linhas.push("🏷️ *" + med.nome.toUpperCase() + "*");
  if (med.categoria) {
    linhas.push("📂 *Classe:* " + med.categoria);
  }

  // Status REMUME / SUS
  var remumeInfo = (typeof consultarRemumeRP === "function")
    ? consultarRemumeRP(med.nome, med)
    : { presente: !!med.na_remume, apresentacoes: med.apresentacoes_remume || [] };

  if (remumeInfo.presente) {
    linhas.push("🏛️ *SUS / REMUME:* 🟢 [REMUME-RP] *PADRONIZADO NA REDE MUNICIPAL (Ribeirão Preto)*");
    if (remumeInfo.apresentacoes && remumeInfo.apresentacoes.length > 0) {
      linhas.push("   _Apresentações SUS:_ " + remumeInfo.apresentacoes.slice(0, 3).map(function(a) { return "`" + a + "`"; }).join(", "));
    }
  } else {
    linhas.push("🏛️ *SUS / REMUME:* ⚪ [NÃO-REMUME] *NÃO CONSTA NA REDE MUNICIPAL*");
  }

  if (med.marcas) {
    linhas.push("🏭 *Marcas / Comerciais:* " + med.marcas.replace(/®/g, ''));
  }

  // Apresentações pediátricas
  if (med.apresentacoes && med.apresentacoes.length > 0) {
    linhas.push("\n💊 *APRESENTAÇÕES PEDIÁTRICAS:*");
    var maxPres = Math.min(med.apresentacoes.length, 6);
    for (var i = 0; i < maxPres; i++) {
      var ap = med.apresentacoes[i];
      var linhaAp = "• *" + ap.forma + "*";
      if (ap.concentracao && ap.forma.indexOf(ap.concentracao) === -1) {
        linhaAp += " (" + ap.concentracao + ")";
      }
      if (ap.idade_minima_meses) {
        linhaAp += " [≥ " + ap.idade_minima_meses + "m]";
      }
      if (ap.peso_minimo_kg) {
        linhaAp += " [≥ " + ap.peso_minimo_kg + " kg]";
      }
      linhas.push(linhaAp);
      if (ap.notas_administracao) {
        linhas.push("  ↳ _Nota:_ " + ap.notas_administracao);
      }
    }
    if (med.apresentacoes.length > maxPres) {
      linhas.push("• _(+ " + (med.apresentacoes.length - maxPres) + " apresentações no catálogo)_");
    }
  }

  // Esquemas posológicos pediátricos
  if (med.posologias && med.posologias.length > 0) {
    linhas.push("\n⚖️ *DOSES & ESQUEMAS POSOLÓGICOS (POR KG / IDADE):*");
    var maxPos = Math.min(med.posologias.length, 4);
    for (var j = 0; j < maxPos; j++) {
      var pos = med.posologias[j];
      linhas.push("📌 *" + (pos.caso_de_uso || pos.nome) + "* (" + (pos.via || 'VO') + "):");
      if (pos.resumo) {
        var resumoLimpo = pos.resumo
          .replace(/^-\s+/gm, '  • ')
          .replace(/\*\*/g, '*');
        linhas.push(resumoLimpo);
      } else if (pos.template) {
        linhas.push("  • " + pos.template.replace(/\(\([^)]+\)\)/g, 'X'));
      }
      if (pos.alerta) {
        linhas.push("  ⚠️ _Alerta:_ " + pos.alerta);
      }
    }
    if (med.posologias.length > maxPos) {
      linhas.push("• _(+ " + (med.posologias.length - maxPos) + " esquemas no PedBook)_");
    }
  }

  // Contraindicações e Alertas
  if (med.contraindicacoes) {
    linhas.push("\n🚫 *CONTRAINDICAÇÕES & CUIDADOS:*");
    var contraCurta = med.contraindicacoes.length > 280
      ? med.contraindicacoes.substring(0, 280) + "..."
      : med.contraindicacoes;
    linhas.push(contraCurta);
  }

  var slugLink = med.slug ? "https://pedb.com.br/medicamentos/" + med.slug : "https://pedb.com.br/";
  linhas.push("\n📚 *Fonte Oficial:* PedBook (" + slugLink + ")");
  return linhas.join("\n");
}

/**
 * Filtra contexto de posologias pediátricas do PedBook para injeção na IA (RAG).
 */
function filtrarContextoPediatricoPedB(pedidoUsuario) {
  var meds = obterGuiaPediatricoPedB();
  if (!meds || meds.length === 0) return "";

  var pedidoUpper = normalizarTermoMedicamento(pedidoUsuario);
  var pedidoLower = String(pedidoUsuario || "").toLowerCase();

  var STOP_WORDS = {
    "ANOS": true, "ANO": true, "MES": true, "MESES": true, "DIA": true, "DIAS": true,
    "PESO": true, "QUILOS": true, "QUILO": true, "KGS": true, "KG": true, "CRIANCA": true,
    "CRIANCAS": true, "ADULTO": true, "ADULTOS": true, "PACIENTE": true, "PACIENTES": true,
    "RECEITA": true, "PRESCREVER": true, "TOMAR": true, "FAZER": true, "USO": true,
    "VIA": true, "ORAL": true, "COMP": true, "COMPRIMIDO": true, "COMPRIMIDOS": true,
    "XAROPE": true, "GOTAS": true, "DOSE": true, "DOSES": true, "PARA": true, "COM": true,
    "SEM": true, "HORA": true, "HORAS": true, "FEBRE": true, "DOR": true, "TOSSE": true,
    "QUADRO": true, "CASO": true, "PRESCRICAO": true, "SOLUCAO": true, "SUSPENSAO": true
  };

  var termos = pedidoUpper.split(/\s+/).filter(function(t) { return t.length >= 3 && !STOP_WORDS[t]; });
  var termosSet = {};
  termos.forEach(function(t) { termosSet[t] = true; });

  termos.slice().forEach(function(termo) {
    var sin = DICIONARIO_FARMACO[termo.toLowerCase()];
    if (sin) {
      var sn = normalizarTermoMedicamento(sin);
      if (!termosSet[sn]) {
        termosSet[sn] = true;
        termos.push(sn);
      }
    }
  });

  for (var sindrome in MAPA_SINDROMES_APS) {
    if (pedidoLower.indexOf(sindrome.toLowerCase()) !== -1) {
      MAPA_SINDROMES_APS[sindrome].forEach(function(item) {
        var itemNorm = normalizarTermoMedicamento(item);
        if (!termosSet[itemNorm]) {
          termosSet[itemNorm] = true;
          termos.push(itemNorm);
        }
      });
    }
  }

  var selecionados = [];
  var vistos = {};

  for (var i = 0; i < meds.length; i++) {
    var m = meds[i];
    var mNorm = m.nome_normalizado || normalizarTermoMedicamento(m.nome);
    for (var k = 0; k < termos.length; k++) {
      var t = termos[k];
      if (mNorm === t || mNorm.indexOf(t) === 0 || (t.length >= 4 && mNorm.indexOf(t) !== -1)) {
        if (!vistos[m.id]) {
          vistos[m.id] = true;
          selecionados.push(m);
        }
        break;
      }
    }
  }

  if (selecionados.length === 0) return "";

  selecionados.sort(function(a, b) {
    var aExp = (' ' + pedidoUpper + ' ').indexOf(' ' + (a.nome_normalizado || '') + ' ') >= 0;
    var bExp = (' ' + pedidoUpper + ' ').indexOf(' ' + (b.nome_normalizado || '') + ' ') >= 0;
    if (aExp !== bExp) return aExp ? -1 : 1;
    if (a.na_remume && !b.na_remume) return -1;
    if (!a.na_remume && b.na_remume) return 1;
    return a.nome.localeCompare(b.nome);
  });

  selecionados = selecionados.slice(0, 5);

  var blocos = [];
  for (var s = 0; s < selecionados.length; s++) {
    var item = selecionados[s];
    var b = [
      "-----------------------------------------------------------------------",
      "MEDICAMENTO PEDIÁTRICO (PEDBOOK): " + item.nome.toUpperCase(),
      "CATEGORIA: " + item.categoria,
      "STATUS REMUME SUS: " + (item.na_remume ? "PADRONIZADO NA REMUME" : "FORA DA REMUME MUNICIPAL"),
      "MARCAS: " + (item.marcas || "Não informadas")
    ];

    if (item.apresentacoes && item.apresentacoes.length > 0) {
      b.push("APRESENTAÇÕES PEDIÁTRICAS DISPONÍVEIS:");
      item.apresentacoes.slice(0, 4).forEach(function(ap) {
        b.push("  • " + ap.forma + (ap.concentracao ? " (" + ap.concentracao + ")" : "") +
          (ap.idade_minima_meses ? " [≥ " + ap.idade_minima_meses + " meses]" : "") +
          (ap.peso_minimo_kg ? " [≥ " + ap.peso_minimo_kg + " kg]" : ""));
      });
    }

    if (item.posologias && item.posologias.length > 0) {
      b.push("DOSES PEDIÁTRICAS OFICIAIS (PEDBOOK):");
      item.posologias.slice(0, 3).forEach(function(p) {
        b.push("  • [" + (p.caso_de_uso || p.nome) + "] " + (p.resumo ? p.resumo.replace(/\n/g, ' ') : p.template));
        if (p.alerta) b.push("    ALERTA: " + p.alerta);
      });
    }

    if (item.contraindicacoes) {
      b.push("CONTRAINDICAÇÕES PEDIÁTRICAS: " + item.contraindicacoes.replace(/\n/g, ' ').substring(0, 250));
    }

    b.push("FONTE: PedBook (pedb.com.br/medicamentos/" + (item.slug || "") + ")");
    blocos.push(b.join("\n"));
  }

  return blocos.join("\n\n");
}

/**
 * Obtém a base oficial de condutas e manejos pediátricos do PedBook.
 */
function obterCondutasPediatricasPedB() {
  if (_cacheCondutasPedB && Array.isArray(_cacheCondutasPedB) && _cacheCondutasPedB.length > 0) {
    return _cacheCondutasPedB;
  }
  if (typeof __BASE_CONDUTAS_PEDB__ !== "undefined" && __BASE_CONDUTAS_PEDB__ && Array.isArray(__BASE_CONDUTAS_PEDB__.condutas)) {
    _cacheCondutasPedB = __BASE_CONDUTAS_PEDB__.condutas;
    return _cacheCondutasPedB;
  }
  if (typeof obterBaseCondutasPedB === "function") {
    try {
      var base = obterBaseCondutasPedB();
      if (base && Array.isArray(base.condutas)) {
        _cacheCondutasPedB = base.condutas;
        return _cacheCondutasPedB;
      }
    } catch (e) {}
  }
  try {
    if (typeof require !== "undefined") {
      var fs = require("fs");
      var path = require("path");
      var caminhos = [
        path.resolve(__dirname, "data", "condutas_pediatricas_pedb.json"),
        path.resolve(__dirname, "..", "data", "condutas_pediatricas_pedb.json"),
        path.resolve(process.cwd(), "src", "data", "condutas_pediatricas_pedb.json"),
        path.resolve(process.cwd(), "data", "condutas_pediatricas_pedb.json")
      ];
      for (var i = 0; i < caminhos.length; i++) {
        if (fs.existsSync(caminhos[i])) {
          var payload = JSON.parse(fs.readFileSync(caminhos[i], "utf8"));
          if (payload && Array.isArray(payload.condutas)) {
            _cacheCondutasPedB = payload.condutas;
            return _cacheCondutasPedB;
          }
        }
      }
    }
  } catch (e) {
    Logger.log("Aviso ao carregar Condutas PedBook via arquivo: " + e.message);
  }
  return [];
}

/**
 * Busca protocolo clínico ou conduta pediátrica no PedBook.
 */
function buscarCondutaPediatricaPedB(termo) {
  if (!termo) return null;
  var conds = obterCondutasPediatricasPedB();
  if (!conds || conds.length === 0) return null;

  var termoNorm = normalizarTermoMedicamento(termo);
  var termoLower = termo.trim().toLowerCase();

  // Sinônimos clínicos comuns de emergência pediátrica
  var sinonimosCondutas = {
    'laringite': 'LARINGOTRAQUEITE',
    'crupe viral': 'LARINGOTRAQUEITE',
    'crupe': 'LARINGOTRAQUEITE',
    'bva': 'BRONQUIOLITE',
    'oma': 'OTITE MEDIA AGUDA',
    'itu': 'INFECCAO DO TRATO URINARIO',
    'drge': 'REFLUXO GASTROESOFAGICO',
    'geca': 'GASTROENTERITE'
  };
  var chaveSin = termoNorm.toLowerCase();
  if (sinonimosCondutas[chaveSin]) {
    termoNorm = sinonimosCondutas[chaveSin];
  }

  for (var i = 0; i < conds.length; i++) {
    var c = conds[i];
    if (c.titulo_normalizado === termoNorm || c.slug === termoLower) {
      return c;
    }
  }

  for (var j = 0; j < conds.length; j++) {
    var cond = conds[j];
    if (cond.titulo_normalizado.indexOf(termoNorm) !== -1) {
      return cond;
    }
  }

  for (var k = 0; k < conds.length; k++) {
    var cTag = conds[k];
    if (Array.isArray(cTag.tags)) {
      for (var t = 0; t < cTag.tags.length; t++) {
        if (normalizarTermoMedicamento(cTag.tags[t]) === termoNorm) {
          return cTag;
        }
      }
    }
  }

  return null;
}

/**
 * Formata conduta pediátrica do PedBook em markdown legível.
 */
function formatarResumoCondutaPedB(conduta) {
  if (!conduta) return "Conduta pediátrica não encontrada.";
  var linhas = [];
  linhas.push("📋 *CONDUTA PEDIÁTRICA OFICIAL (PEDBOOK)*");
  linhas.push("═══════════════════════════════════════");
  linhas.push("🩺 *" + conduta.titulo.toUpperCase() + "*");

  if (conduta.resumo_rapido) {
    linhas.push("\n⚡ *RESUMO RÁPIDO & PONTOS-CHAVE:*");
    linhas.push(conduta.resumo_rapido.replace(/\*\*/g, '*'));
  }

  if (conduta.conteudo_tratamento) {
    linhas.push("\n💊 *TRATAMENTO & CONDUTA FARMACOLÓGICA:*");
    linhas.push(conduta.conteudo_tratamento.replace(/\*\*/g, '*'));
  }

  var link = conduta.slug ? "https://pedb.com.br/condutas-e-manejos/" + conduta.slug : "https://pedb.com.br/condutas-e-manejos";
  linhas.push("\n📚 *Fonte:* PedBook (" + link + ")");
  return linhas.join("\n");
}

/**
 * ==============================================================================
 * MOTOR DE SEGURANÇA FARMACOLÓGICA & CROSS-CHECK DETERMINÍSTICO (RAM LOCAL)
 * ==============================================================================
 * Realiza checagem cruzada imediata (< 5ms) de segurança medicamentosa:
 * 1. Interações medicamentosas da tabela local (interacoes.json - 219 regras)
 * 2. Ajustes de dose para função renal (Guia HSL - 447 medicamentos)
 * 3. Tetos de dose máxima e limites terapêuticos (Guia HSL e PedBook)
 * 4. Disponibilidade na REMUME Ribeirão Preto (256 itens)
 * 5. Catálogo de ajuste renal estrito de antimicrobianos (ClCr >50, 30-50, 10-29 e <10/HD)
 * ==============================================================================
 */

// ==============================================================================
// CATÁLOGO CANÔNICO DE ANTIMICROBIANOS — AJUSTE RENAL E DILUIÇÕES (IDSA / SANFORD / HSL)
// ==============================================================================
var CATALOGO_AJUSTE_RENAL_ANTIMICROBIANOS = {
  meropenem: {
    nome: "Meropenem",
    aliases: ["meropenem", "mero", "meronem"],
    classe: "Carbapenêmico (Bactericida tempo-dependente)",
    apresentacao: "Frasco-ampola com 500 mg ou 1 g (pó liofilizado)",
    diluicao: "Reconstituir 1 g em 20 mL de AD. Diluir em 100 mL de SF 0,9% ou SG 5% (conc. 10 mg/mL). Infusão estendida em 3 a 4 horas em choque séptico/UTI para otimização PK/PD (T > MIC). Em enfermaria: infusão mínima de 30 minutos.",
    dosePadrao: "1 g EV a cada 8h (2 g EV a cada 8h em meningite, infecção por Pseudomonas aeruginosa ou neutropenia febril)",
    faixasClCr: {
      clcr_maior_50: {
        faixa: "ClCr > 50 mL/min",
        dose: "1g EV a cada 8h (recomenda-se infusão estendida em 3 horas para otimização PK/PD).",
        orientacao: "Dose plena (100%). Infusão estendida de 3-4h recomendada em sepse/UTI."
      },
      clcr_30_50: {
        faixa: "ClCr 30-50 mL/min",
        dose: "1g EV a cada 12h (infusão estendida em 3 horas).",
        orientacao: "Espaçamento do intervalo com infusão estendida em 3 horas."
      },
      clcr_10_29: {
        faixa: "ClCr 10-29 mL/min",
        dose: "500 mg EV a cada 12h.",
        orientacao: "Redução da dose unitária mantendo o intervalo de 12 horas."
      },
      clcr_menor_10_hd: {
        faixa: "ClCr < 10 mL/min / Hemodiálise",
        dose: "500 mg EV a cada 24h, administrado imediatamente APÓS a hemodiálise nos dias de sessão.",
        orientacao: "Administrar a dose de 500 mg imediatamente APÓS a sessão de hemodiálise nos dias de diálise (o meropenem é dialisável; remoção de 30-50% por sessão)."
      }
    },
    alertaSentinela: "⚠️ VIGILÂNCIA DE CONVULSÕES & INTERAÇÃO VALPROATO: Em pacientes com disfunção renal e doses não ajustadas, há risco aumentado de crises convulsivas. CONTRAINDICAÇÃO PRÁTICA: O meropenem reduz os níveis séricos de Ácido Valproico em 60-100% por aumento da glicuronidação e inibição da hidrólise do valproato glicuronídeo, causando perda rápida do controle de crises e risco de estado de mal epiléptico.",
    monitorizacao: "Creatinina sérica, ureia, hemograma e vigilância clínica neurológica diária."
  },

  vancomicina: {
    nome: "Vancomicina",
    aliases: ["vancomicina", "vanco", "vancocina"],
    classe: "Glicopeptídeo (Bactericida AUC/MIC-dependente)",
    apresentacao: "Frasco-ampola com 500 mg ou 1 g (pó liofilizado)",
    diluicao: "Reconstituir 500 mg em 10 mL de AD (ou 1 g em 20 mL de AD). Diluir em 100 a 250 mL de SF 0,9% ou SG 5% (concentração máxima recomendada: 5 mg/mL). Infundir lentamente em pelo menos 60 a 120 minutos (velocidade máxima ≤ 10 mg/min, ex: 1 g em no mínimo 60-120 min) para prevenir a Síndrome do Homem Vermelho (reação anafilactoide por liberação de histamina).",
    dosePadrao: "Ataque: 25-30 mg/kg (máx 2g). Manutenção: 15-20 mg/kg a cada 8-12h.",
    faixasClCr: {
      clcr_maior_50: {
        faixa: "ClCr > 50 mL/min",
        dose: "15-20 mg/kg EV a cada 8-12h (em infusão lenta de pelo menos 1-2h).",
        orientacao: "Dose plena com infusão lenta controlada (≤ 10 mg/min)."
      },
      clcr_30_50: {
        faixa: "ClCr 30-50 mL/min",
        dose: "15-20 mg/kg EV a cada 24h.",
        orientacao: "Espaçamento do intervalo para 24 horas."
      },
      clcr_10_29: {
        faixa: "ClCr 10-29 mL/min",
        dose: "15 mg/kg EV a cada 24 a 48h (ou redoses a cada 48h guiadas por nível sérico).",
        orientacao: "Redoses guiadas obrigatoriamente por dosagem de nível sérico (vale)."
      },
      clcr_menor_10_hd: {
        faixa: "ClCr < 10 mL/min / Hemodiálise",
        dose: "Ataque 25-30 mg/kg; redoses subsequentes (500-1000 mg) pós-hemodiálise guiadas por nível sérico.",
        orientacao: "Administrar dose pós-sessão de hemodiálise, guiada estritamente pelo nível sérico pré-diálise."
      }
    },
    alertaSentinela: "⚠️ VALE SÉRICO OBRIGATÓRIO DE 15 A 20 MCG/ML: Em infecções graves (bacteremia, endocardite, osteomielite, meningite, pneumonia hospitalar/PAV) ou meta AUC/MIC 400-600, o nível de vale (trough) sérico deve ser mantido estritamente entre 15 e 20 mcg/mL. Coletar o vale 30 minutos antes da 4ª dose (estado de equilíbrio). Risco acentuado de nefrotoxicidade sinérgica em associação com Piperacilina-Tazobactam ou Aminoglicosídeos.",
    monitorizacao: "Vancocinemia (vale pré-4ª dose, alvo 15-20 mcg/mL para infecções graves); dosagem de creatinina sérica e ureia a cada 48h (ou diária se UTI/risco de IRA)."
  },

  ceftriaxona: {
    nome: "Ceftriaxona",
    aliases: ["ceftriaxona", "rocefin", "ceftriaxone", "ceftriaxon"],
    classe: "Cefalosporina de 3ª geração",
    apresentacao: "Frasco-ampola com 1 g pó liofilizado",
    diluicao: "Reconstituir 1 g em 10 mL de AD. Diluir em 100 mL de SF 0,9% ou SG 5%. Infundir em 30 minutos por via intravenosa.",
    dosePadrao: "1g a 2g EV a cada 24h (2g 12/12h em meningite bacteriana).",
    faixasClCr: {
      clcr_maior_50: {
        faixa: "ClCr > 50 mL/min",
        dose: "NÃO REQUER AJUSTE RENAL. Manter 1g a 2g EV a cada 24h (eliminação mista renal 60% e biliar 40%).",
        orientacao: "Dose plena habitual (eliminação mista: 60% renal e 40% biliar)."
      },
      clcr_30_50: {
        faixa: "ClCr 30-50 mL/min",
        dose: "NÃO REQUER AJUSTE RENAL. Manter 1g a 2g EV a cada 24h.",
        orientacao: "Manter dose plena habitual."
      },
      clcr_10_29: {
        faixa: "ClCr 10-29 mL/min",
        dose: "NÃO REQUER AJUSTE RENAL. Manter 1g a 2g EV a cada 24h.",
        orientacao: "Manter dose plena habitual."
      },
      clcr_menor_10_hd: {
        faixa: "ClCr < 10 mL/min / Hemodiálise",
        dose: "NÃO REQUER AJUSTE RENAL. Manter 1g a 2g EV a cada 24h (máx 2 g/dia).",
        orientacao: "Não dialisável significativamente; não necessita de dose de reforço pós-hemodiálise. Reduzir para máx 1-2 g/dia apenas em insuficiência combinada hepática E renal graves (falência hepatorrenal)."
      }
    },
    alertaSentinela: "⚠️ CONTRAINDICAÇÃO CRÍTICA COM CÁLCIO: Contraindicada a administração concomitante na mesma via ou em Y com soluções contendo Cálcio (Ringer Lactato, Gluconato de Cálcio, NPT), pelo risco grave de precipitação de ceftriaxona-cálcio insolúvel em pulmões e rins (potencialmente fatal em neonatos e com risco embólico em adultos).",
    monitorizacao: "Enzimas hepáticas (TGO/TGP) e bilirrubinas se uso prolongado (risco de lama/pseudolitíase biliar reversível)."
  },

  ciprofloxacino: {
    nome: "Ciprofloxacino",
    aliases: ["ciprofloxacino", "cipro", "ciprofloxacina", "ciprofloxacine"],
    classe: "Fluoroquinolona (Bactericida concentração-dependente)",
    apresentacao: "Bolsa para infusão IV com solução pronta 400 mg/200 mL (ou 200 mg/100 mL) | Comprimidos VO de 500 mg",
    diluicao: "Solução IV pronta para infusão (400 mg em 200 mL). Infundir em no mínimo 60 minutos em veia calibrosa (infusão rápida causa dor local intensa, queimação e flebite química).",
    dosePadrao: "400 mg EV a cada 12h ou 500-750 mg VO a cada 12h.",
    faixasClCr: {
      clcr_maior_50: {
        faixa: "ClCr > 50 mL/min",
        dose: "400 mg EV 12/12h ou 500 mg VO 12/12h.",
        orientacao: "Dose plena (100% da dose recomendada)."
      },
      clcr_30_50: {
        faixa: "ClCr 30-50 mL/min",
        dose: "400 mg EV 12/12h ou 500 mg VO 12/12h (monitorar se terapia prolongada).",
        orientacao: "Monitorar tolerância e função renal em uso prolongado."
      },
      clcr_10_29: {
        faixa: "ClCr 10-29 mL/min",
        dose: "400 mg EV a cada 24h ou 500 mg VO a cada 24h (ou 200 mg EV 12/12h).",
        orientacao: "Redução de cerca de 50% na dose diária total acumulada."
      },
      clcr_menor_10_hd: {
        faixa: "ClCr < 10 mL/min / Hemodiálise",
        dose: "400 mg EV a cada 24h ou 500 mg VO a cada 24h (administrar após diálise).",
        orientacao: "Pouco dialisável (~10%). Administrar a dose diária preferencialmente APÓS a sessão de hemodiálise."
      }
    },
    alertaSentinela: "⚠️ RISCO DE PROLONGAMENTO DE QT & TENDINOPATIA: Monitorar ECG pelo risco de arritmias ventriculares graves (Torsades de Pointes), especialmente se combinado com outros depressores de repolarização. Alerta para tendinite e rotura de tendão de Aquiles (maior risco em idosos e uso concomitante de corticoides). Interação oral: quelantes com cátions bivalentes/trivalentes (ferro, cálcio, antiácidos) reduzem absorção em até 90% (espaçar 2h antes ou 4h após).",
    monitorizacao: "ECG (intervalo QTc), função renal seriada e vigilância de dores tendinosas / articulares."
  },

  cefepime: {
    nome: "Cefepime",
    aliases: ["cefepime", "cefepima", "maxcef"],
    classe: "Cefalosporina de 4ª geração (Antipseudomonas)",
    apresentacao: "Frasco-ampola com 1 g ou 2 g (pó liofilizado)",
    diluicao: "Reconstituir 1 g ou 2 g com 10 mL de AD. Diluir em 100 mL de SF 0,9% ou SG 5%. Infundir em 30 minutos ou em infusão estendida de 3 a 4 horas em choque séptico/UTI para otimização PK/PD (T > MIC).",
    dosePadrao: "2g EV a cada 8h (infusão em 30 min ou estendida em 3h).",
    faixasClCr: {
      clcr_maior_50: {
        faixa: "ClCr > 50 mL/min",
        dose: "2g EV a cada 8h.",
        orientacao: "Dose plena habitual (2 g 8/8h em neutropenia febril ou sepse grave)."
      },
      clcr_30_50: {
        faixa: "ClCr 30-50 mL/min",
        dose: "2g EV a cada 12h.",
        orientacao: "Espaçamento do intervalo com vigilância neurológica ativa."
      },
      clcr_10_29: {
        faixa: "ClCr 10-29 mL/min",
        dose: "2g EV a cada 24h.",
        orientacao: "Ajuste posológico obrigatório para prevenir acúmulo liquórico e neurotoxicidade."
      },
      clcr_menor_10_hd: {
        faixa: "ClCr < 10 mL/min / Hemodiálise",
        dose: "1g EV a cada 24h (administrar dose após a hemodiálise nos dias de sessão).",
        orientacao: "Dialisável (~68% depurado em sessão de 3h de HD). Administrar dose suplementar (1 g ou dose habitual) imediatamente APÓS o término de cada sessão de hemodiálise."
      }
    },
    alertaSentinela: "⚠️ ALERTA SENTINELA CRÍTICO: NEUROTOXICIDADE E ENCEFALOPATIA POR CEFEPIME (CIN - Cefepime-Induced Neurotoxicity). O cefepime atravessa rapidamente a barreira hematoencefálica e antagoniza os receptores GABAA cerebrais. Em pacientes com insuficiência renal (especialmente ClCr < 50 mL/min) sem o ajuste estrito de dose, ocorre toxicidade grave manifestada por: confusão mental aguda, letargia, encefalopatia metabólica, mioclonias, convulsões e Estado de Mal Epiléptico Não-Convulsivo (NCSE). Ajuste por ClCr é mandatório e vigilância neurológica diária.",
    monitorizacao: "Exame neurológico diário (escala de Glasgow, reflexos, pesquisa de mioclonias); creatinina sérica e ureia diárias; EEG imediato em caso de alteração inexplicada do nível de consciência."
  },

  piperacilina_tazobactam: {
    nome: "Piperacilina + Tazobactam (Pip-Tazo)",
    aliases: ["piperacilina_tazobactam", "pip-tazo", "piptazo", "tazocin"],
    classe: "Penicilina antipseudomonas + Inibidor de beta-lactamase",
    apresentacao: "Frasco-ampola com 4,5 g (4 g piperacilina + 0,5 g tazobactam)",
    diluicao: "Reconstituir 4,5 g com 20 mL de SF 0,9% ou AD. Diluir em 100 mL de SF 0,9% ou SG 5%. Infusão estendida de 3 a 4 horas recomendada para maximizar farmacodinâmica.",
    dosePadrao: "4,5g EV a cada 6h (infusão de 3-4h) ou 4,5g a cada 8h (infusão de 4h).",
    faixasClCr: {
      clcr_maior_50: {
        faixa: "ClCr > 50 mL/min",
        dose: "4,5g EV a cada 6h (ou 4,5g 8/8h em infusão estendida de 3-4h).",
        orientacao: "Dose plena."
      },
      clcr_30_50: {
        faixa: "ClCr 30-50 mL/min",
        dose: "2,25g EV a cada 6h (ou 3,375g EV a cada 8h).",
        orientacao: "Ajuste intermediário."
      },
      clcr_10_29: {
        faixa: "ClCr 10-29 mL/min",
        dose: "2,25g EV a cada 8h.",
        orientacao: "Redução de dose com manutenção do intervalo de 8 horas."
      },
      clcr_menor_10_hd: {
        faixa: "ClCr < 10 mL/min / Hemodiálise",
        dose: "2,25g EV a cada 8h + dose de reforço de 0,75g após cada sessão de hemodiálise.",
        orientacao: "Administrar dose suplementar de 0,75g após a sessão de hemodiálise."
      }
    },
    alertaSentinela: "⚠️ Risco aumentado de nefrotoxicidade / lesão renal aguda sinérgica em associação prolongada com Vancomicina (evitar além de 48-72h se houver alternativa).",
    monitorizacao: "Creatinina sérica diária e eletrólitos (contém 2,79 mEq de sódio por grama de piperacilina)."
  },

  polimixina_b: {
    nome: "Polimixina B",
    aliases: ["polimixina_b", "polimixina", "polimixina b"],
    classe: "Polipeptídeo (Bactericida de membrana)",
    apresentacao: "Frasco-ampola com 500.000 UI pó liofilizado",
    diluicao: "Reconstituir em 2 mL de AD. Diluir em 300 a 500 mL de SG 5% ou SF 0,9%. Infundir em 60 a 120 minutos.",
    dosePadrao: "Ataque: 20.000 a 25.000 UI/kg (baseado no peso magro). Manutenção: 15.000 a 25.000 UI/kg/dia divididos em 2 doses (12/12h).",
    faixasClCr: {
      clcr_maior_50: {
        faixa: "ClCr > 50 mL/min",
        dose: "NÃO REDUZIR DOSE NA INSUFICIÊNCIA RENAL. Manutenção: 15.000 a 25.000 UI/kg/dia divididos 12/12h.",
        orientacao: "Dose plena baseada no peso magro."
      },
      clcr_30_50: {
        faixa: "ClCr 30-50 mL/min",
        dose: "NÃO REDUZIR DOSE NA INSUFICIÊNCIA RENAL. A depuração da Polimixina B é predominantemente não-renal. Reduções causam subdosagem e falha terapêutica grave.",
        orientacao: "Depuração predominantemente não-renal; não reduzir dose."
      },
      clcr_10_29: {
        faixa: "ClCr 10-29 mL/min",
        dose: "NÃO REDUZIR DOSE NA INSUFICIÊNCIA RENAL. A depuração da Polimixina B é predominantemente não-renal. Reduções causam subdosagem e falha terapêutica grave.",
        orientacao: "Reduções causam subdosagem e falha terapêutica grave."
      },
      clcr_menor_10_hd: {
        faixa: "ClCr < 10 mL/min / Hemodiálise",
        dose: "NÃO REDUZIR DOSE NA INSUFICIÊNCIA RENAL. Manter dose plena calculada por peso magro (não dialisável).",
        orientacao: "Não dialisável; não necessita de reforço pós-HD. Manter dose plena com suporte clínico."
      }
    },
    alertaSentinela: "⚠️ NÃO REDUZIR DOSE NA INSUFICIÊNCIA RENAL. A Polimixina B possui clearance não-renal; reduções empíricas causam falha terapêutica grave. Diferente da Colistina (CMS), que exige redução renal drástica.",
    monitorizacao: "Creatinina sérica a cada 24-48h; bloqueio neuromuscular / parestesias."
  },

  fluconazol: {
    nome: "Fluconazol",
    aliases: ["fluconazol", "zoltec"],
    classe: "Antifúngico triazólico",
    apresentacao: "Frasco para infusão IV de 200 mg/100 mL ou cápsulas VO de 150 mg",
    diluicao: "Solução IV pronta para infusão. Infundir a taxa máxima de 200 mg/hora (infundir frasco de 200 mg em pelo menos 60 minutos).",
    dosePadrao: "Ataque: 400-800 mg dose única. Manutenção: 200-400 mg EV/VO a cada 24h.",
    faixasClCr: {
      clcr_maior_50: {
        faixa: "ClCr > 50 mL/min",
        dose: "Manter 100% da dose recomendada (200-400 mg a cada 24h).",
        orientacao: "Dose plena habitual."
      },
      clcr_30_50: {
        faixa: "ClCr 30-50 mL/min",
        dose: "Dose de ataque plena no D1; a partir de então, REDUZIR PARA 50% DA DOSE (100-200 mg a cada 24h).",
        orientacao: "Após dose de ataque plena no D1, reduzir manutenção em 50%."
      },
      clcr_10_29: {
        faixa: "ClCr 10-29 mL/min",
        dose: "Dose de ataque plena no D1; a partir de então, REDUZIR PARA 50% DA DOSE (100-200 mg a cada 24h).",
        orientacao: "Após dose de ataque plena no D1, reduzir manutenção em 50%."
      },
      clcr_menor_10_hd: {
        faixa: "ClCr < 10 mL/min / Hemodiálise",
        dose: "100% da dose recomendada administrada imediatamente APÓS cada sessão de hemodiálise.",
        orientacao: "Dialisável; administrar a dose de 200-400 mg imediatamente após cada sessão de HD."
      }
    },
    alertaSentinela: "⚠️ Potente inibidor de CYP3A4; verificar interações com imunossupressores e anticoagulantes orais.",
    monitorizacao: "Enzimas hepáticas (TGO/TGP) e eletrólitos."
  }
};

/**
 * Normaliza o termo de busca para a chave canônica do catálogo de antimicrobianos.
 */
function normalizarChaveAntimicrobiano(termo) {
  if (!termo) return null;
  var t = String(termo).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
  for (var chave in CATALOGO_AJUSTE_RENAL_ANTIMICROBIANOS) {
    if (chave === t) return chave;
    var item = CATALOGO_AJUSTE_RENAL_ANTIMICROBIANOS[chave];
    if (Array.isArray(item.aliases)) {
      for (var a = 0; a < item.aliases.length; a++) {
        var alNorm = item.aliases[a].toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "");
        if (alNorm === t || (t.length >= 4 && alNorm.indexOf(t) === 0) || (alNorm.length >= 4 && t.indexOf(alNorm) === 0)) {
          return chave;
        }
      }
    }
  }
  return null;
}

/**
 * Obtém a recomendação determinística estruturada de ajuste renal para um antimicrobiano.
 */
function obterAjusteRenalAntimicrobiano(drogaOuTermo, clcr, ehHD) {
  var chave = normalizarChaveAntimicrobiano(drogaOuTermo);
  if (!chave || !CATALOGO_AJUSTE_RENAL_ANTIMICROBIANOS[chave]) {
    return { ok: false, mensagem: "Antimicrobiano não encontrado no catálogo de ajuste renal." };
  }
  var atb = CATALOGO_AJUSTE_RENAL_ANTIMICROBIANOS[chave];
  var crClVal = (clcr !== undefined && clcr !== null && !isNaN(Number(clcr))) ? Number(clcr) : null;
  var dialise = !!ehHD;

  var faixaId = null;
  if (dialise) {
    faixaId = "clcr_menor_10_hd";
  } else if (crClVal !== null) {
    if (crClVal > 50) faixaId = "clcr_maior_50";
    else if (crClVal >= 30) faixaId = "clcr_30_50";
    else if (crClVal >= 10) faixaId = "clcr_10_29";
    else faixaId = "clcr_menor_10_hd";
  }

  var faixaObj = faixaId ? atb.faixasClCr[faixaId] : null;

  return {
    ok: true,
    chave: chave,
    antimicrobiano: atb.nome,
    nomeExibicao: atb.nome,
    classe: atb.classe,
    apresentacao: atb.apresentacao,
    diluicao: atb.diluicao,
    dosePadrao: atb.dosePadrao,
    clcrInformado: crClVal,
    hemodialise: dialise,
    faixaId: faixaId,
    faixaAplicada: faixaObj ? faixaObj.faixa : null,
    doseAjustada: faixaObj ? faixaObj.dose : atb.dosePadrao,
    orientacaoFaixa: faixaObj ? faixaObj.orientacao : null,
    todasFaixas: atb.faixasClCr,
    alertaSentinela: atb.alertaSentinela,
    cuidados: atb.diluicao + " " + atb.alertaSentinela,
    monitorizacao: atb.monitorizacao
  };
}

/**
 * Formata ficha clínica de ajuste renal do antimicrobiano pronta para PEP e Telegram.
 */
function formatarAjusteRenalAntimicrobiano(drogaOuTermo, clcr, ehHD) {
  var res = obterAjusteRenalAntimicrobiano(drogaOuTermo, clcr, ehHD);
  if (!res.ok) return "❌ " + res.mensagem;

  var linhas = [];
  linhas.push("💉 *AJUSTE RENAL DE ANTIMICROBIANOS (CATÁLOGO CLÍNICO & GUIA HSL / IDSA)*");
  linhas.push("══════════════════════════════════════════════════════════════════");
  linhas.push("💊 *Fármaco:* *" + res.antimicrobiano + "* (" + res.classe + ")");
  linhas.push("📦 *Apresentação:* " + res.apresentacao);
  linhas.push("💧 *Reconstituição & Diluição:* " + res.diluicao);
  linhas.push("⚖️ *Dose Padrão (Função Renal Normal):* " + res.dosePadrao);

  if (res.faixaId) {
    linhas.push("\n🎯 *CONDUTA PARA O PACIENTE (" + (res.hemodialise ? "Hemodiálise" : ("ClCr " + res.clcrInformado + " mL/min")) + "):*");
    linhas.push("📌 *Faixa Aplicada:* *" + res.faixaAplicada + "*");
    linhas.push("📋 *Prescrição Ajustada:* `" + res.doseAjustada + "`");
    if (res.orientacaoFaixa) {
      linhas.push("↳ _" + res.orientacaoFaixa + "_");
    }
  }

  linhas.push("\n📊 *TABELA DE AJUSTE RENAL POR CLEARANCE (TODAS AS FAIXAS):*");
  linhas.push("• *ClCr > 50 mL/min:* " + res.todasFaixas.clcr_maior_50.dose + " — _" + res.todasFaixas.clcr_maior_50.orientacao + "_");
  linhas.push("• *ClCr 30-50 mL/min:* " + res.todasFaixas.clcr_30_50.dose + " — _" + res.todasFaixas.clcr_30_50.orientacao + "_");
  linhas.push("• *ClCr 10-29 mL/min:* " + res.todasFaixas.clcr_10_29.dose + " — _" + res.todasFaixas.clcr_10_29.orientacao + "_");
  linhas.push("• *ClCr < 10 / Hemodiálise:* " + res.todasFaixas.clcr_menor_10_hd.dose + " — _" + res.todasFaixas.clcr_menor_10_hd.orientacao + "_");

  if (res.alertaSentinela) {
    linhas.push("\n🚨 *ALERTA SENTINELA & TOXICIDADE:*");
    linhas.push(res.alertaSentinela);
  }

  linhas.push("\n🛡️ *MONITORIZAÇÃO CLÍNICA & LABORATORIAL:*");
  linhas.push(res.monitorizacao);

  linhas.push("\n📚 *Referências:* IDSA Guidelines / Sanford Guide to Antimicrobial Therapy / Guia Farmacêutico Hospital Sírio-Libanês.");
  return linhas.join("\n");
}

/**
 * Consulta determinística a partir de texto livre com parsing de fármaco, clearance e hemodiálise.
 */
function consultarCatalogoAjusteRenal(texto) {
  if (!texto || typeof texto !== "string") return null;
  var dStr = String(texto).toLowerCase();
  var ehHD = /\b(?:hd|hemodialise|dialise)\b/i.test(dStr);
  var clcrVal = null;
  var clcrMatch = dStr.match(/\b(?:clcr|crcl|tfg|clearance)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\b/i);
  if (clcrMatch && clcrMatch[1]) {
    clcrVal = Number(clcrMatch[1].replace(",", "."));
  } else {
    var nums = dStr.match(/\b(\d{1,3})\b/g);
    if (nums && nums.length > 0) {
      clcrVal = Number(nums[0]);
    }
  }

  for (var k in CATALOGO_AJUSTE_RENAL_ANTIMICROBIANOS) {
    var item = CATALOGO_AJUSTE_RENAL_ANTIMICROBIANOS[k];
    if (dStr.indexOf(k) !== -1) {
      return formatarAjusteRenalAntimicrobiano(k, clcrVal, ehHD);
    }
    for (var a = 0; a < item.aliases.length; a++) {
      if (dStr.indexOf(item.aliases[a]) !== -1) {
        return formatarAjusteRenalAntimicrobiano(k, clcrVal, ehHD);
      }
    }
  }
  return null;
}

var _cacheRegrasInteracoesNorm = null;
var _cacheNomesHslNorm = null;

function _obterRegrasInteracoesNorm() {
  if (_cacheRegrasInteracoesNorm && _cacheRegrasInteracoesNorm.length > 0) {
    return _cacheRegrasInteracoesNorm;
  }
  var regras = [];
  var termos = [];
  var vistosTermos = {};
  try {
    var ss = (typeof SpreadsheetApp !== "undefined") ? SpreadsheetApp.openById("interacoes") : null;
    if (ss) {
      var linhas = ss.getSheets()[0].getRange(2, 1, 219, 6).getValues();
      for (var k = 0; k < linhas.length; k++) {
        var r = linhas[k];
        var colANorm = String(r[1] || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        var colBNorm = String(r[2] || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        var grauRaw = String(r[3] || "Moderado").trim();
        var grauNorm = "MODERADO";
        if (/contraindic/i.test(grauRaw)) grauNorm = "CONTRAINDICADO";
        else if (/grave/i.test(grauRaw)) grauNorm = "GRAVE";
        else if (/leve|menor/i.test(grauRaw)) grauNorm = "LEVE";

        regras.push({
          colA: colANorm,
          colB: colBNorm,
          drogaA: String(r[1] || "").trim(),
          drogaB: String(r[2] || "").trim(),
          grau: grauRaw,
          grauNormalizado: grauNorm,
          efeito: String(r[4] || "").trim(),
          recomendacao: String(r[5] || "").trim()
        });

        var partes = colANorm.split(/[\s,+/]+/);
        for (var p = 0; p < partes.length; p++) {
          var t = partes[p].trim();
          if (t.length >= 4 && !vistosTermos[t]) {
            vistosTermos[t] = true;
            termos.push(t);
          }
        }
      }
    }
  } catch (e) {}
  regras.termos = termos;
  _cacheRegrasInteracoesNorm = regras;
  return _cacheRegrasInteracoesNorm;
}

function _obterNomesHslNorm() {
  if (_cacheNomesHslNorm && _cacheNomesHslNorm.length > 0) {
    return _cacheNomesHslNorm;
  }
  var termos = [];
  var vistos = {};
  try {
    var medsHsl = (typeof obterGuiaFarmaceuticoHSL === "function") ? obterGuiaFarmaceuticoHSL() : [];
    for (var k = 0; k < medsHsl.length; k++) {
      var farnacoStr = String(medsHsl[k].farnaco || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      var primeiroTermo = farnacoStr.split(/[\s,()]+/)[0].trim();
      if (primeiroTermo.length >= 4 && !vistos[primeiroTermo]) {
        vistos[primeiroTermo] = true;
        termos.push(primeiroTermo);
      }
    }
  } catch (eHsl) {}
  _cacheNomesHslNorm = termos;
  return _cacheNomesHslNorm;
}

var FARMACOS_SEGURANCA_ESSENCIAIS = [
  // Beta-lactâmicos & Penicilinas
  "amoxicilina", "ampicilina", "piperacilina", "benzilpenicilina", "oxacilina", "penicilina", "clavulanato", "tazobactam",
  // Cefalosporinas
  "cefalexina", "cefazolina", "ceftriaxona", "cefepima", "cefotaxima", "ceftazidima", "cefuroxima",
  // Quinolonas
  "ciprofloxacino", "levofloxacino", "norfloxacino", "moxifloxacino",
  // Outros antimicrobianos
  "azitromicina", "claritromicina", "clindamicina", "metronidazol", "sulfametoxazol", "trimetoprima", "vancomicina", "meropenem", "gentamicina", "amicacina", "doxiciclina", "tetraciclina", "nitrofurantoina", "fosfomicina",
  // AINEs & Analgésicos
  "ibuprofeno", "cetoprofeno", "diclofenaco", "cetorolaco", "naproxeno", "nimesulida", "tenoxicam", "piroxicam", "meloxicam", "indometacina", "aspirina", "aas", "dipirona", "metamizol", "paracetamol", "morfina", "tramadol", "fentanil", "codeina",
  // Cardiovascular & Hipertensão
  "losartana", "valsartana", "candesartana", "enalapril", "captopril", "ramipril", "anlodipino", "nifedipino", "hidralazina", "metildopa", "hidroclorotiazida", "furosemida", "espironolactona", "atenolol", "metoprolol", "carvedilol", "sinvastatina", "atorvastatina", "rosuvastatina", "varfarina", "heparina", "enoxaparina", "clopidogrel", "amiodarona", "digoxina",
  // SNC & Psiquiatria
  "fenitoina", "valproato", "carbamazepina", "haloperidol", "quetiapina", "diazepam", "midazolam", "propofol", "clonazepam", "fluoxetina", "sertralina", "litio",
  // Imunossupressores, Gastro & Outros
  "metotrexato", "omeprazol", "pantoprazol", "metformina", "insulina", "prednisona", "prednisolona", "dexametasona", "hidrocortisona"
];

function extrairFarmacosDoTexto(texto) {
  if (!texto) return [];
  if (Array.isArray(texto)) {
    var itensPlanos = [];
    texto.forEach(function(item) {
      if (typeof item === "string") {
        var sub = extrairFarmacosDoTexto(item);
        sub.forEach(function(s) { if (itensPlanos.indexOf(s) === -1) itensPlanos.push(s); });
      }
    });
    return itensPlanos;
  }

  var textoNorm = " " + String(texto).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s+]/g, " ") + " ";

  var tokens = textoNorm.split(/\s+/).filter(function(t) { return t.length >= 3; });
  var encontrados = [];

  var STOPWORDS_FARMACOS = {
    "agua": 1, "sodica": 1, "potassica": 1, "cloreto": 1, "sodio": 1, "potassio": 1,
    "soro": 1, "fisiologico": 1, "glicosado": 1, "glicose": 1, "xarope": 1, "gotas": 1,
    "comprimido": 1, "comprimidos": 1, "capsula": 1, "capsulas": 1, "pomada": 1, "creme": 1,
    "gel": 1, "spray": 1, "solucao": 1, "injetavel": 1, "frasco": 1, "frascos": 1,
    "ampola": 1, "ampolas": 1, "diluente": 1, "veiculo": 1, "suspensao": 1, "suspensa": 1,
    "oral": 1, "topico": 1, "oftalmico": 1, "nasal": 1, "retal": 1, "inalatorio": 1,
    "aerosol": 1, "dose": 1, "doses": 1, "posologia": 1, "cada": 1, "horas": 1, "hora": 1,
    "dias": 1, "dia": 1, "meses": 1, "ano": 1, "anos": 1, "minutos": 1, "minuto": 1,
    "caixa": 1, "caixas": 1, "unidades": 1, "miligramas": 1, "gramas": 1, "microgramas": 1,
    "litro": 1, "drageas": 1, "flaconete": 1, "adesivo": 1, "colirio": 1, "tabela": 1,
    "paciente": 1, "inicio": 1, "manha": 1, "noite": 1, "tarde": 1, "tomar": 1, "usar": 1,
    "aplicar": 1, "ingerir": 1, "administrar": 1, "iniciar": 1, "manter": 1, "ajuste": 1
  };

  function adicionar(farmaco) {
    var f = String(farmaco || "").toLowerCase().trim();
    if (f && f.length >= 3 && !STOPWORDS_FARMACOS[f] && encontrados.indexOf(f) === -1) {
      encontrados.push(f);
    }
  }

  // 1. Dicionário de marcas e sinônimos comerciais
  if (typeof DICIONARIO_FARMACO !== "undefined") {
    for (var i = 0; i < tokens.length; i++) {
      var sin = DICIONARIO_FARMACO[tokens[i]];
      if (sin) {
        if (sin.indexOf(" + ") !== -1) {
          sin.split(" + ").forEach(adicionar);
        } else {
          adicionar(sin);
        }
      }
    }
  }

  // 2. Termos presentes nas regras de interações em RAM (pré-indexados)
  var regrasInter = _obterRegrasInteracoesNorm();
  var termosInter = (regrasInter && regrasInter.termos) ? regrasInter.termos : [];
  for (var j = 0; j < termosInter.length; j++) {
    var termoP = termosInter[j];
    if (!STOPWORDS_FARMACOS[termoP] && textoNorm.indexOf(" " + termoP + " ") !== -1) {
      adicionar(termoP);
    }
  }

  // 3. Fármacos oficiais do Guia HSL (pré-indexados)
  var termosHsl = _obterNomesHslNorm();
  for (var k = 0; k < termosHsl.length; k++) {
    var termoHsl = termosHsl[k];
    if (!STOPWORDS_FARMACOS[termoHsl] && textoNorm.indexOf(" " + termoHsl + " ") !== -1) {
      adicionar(termoHsl);
    }
  }

  // 4. Antimicrobianos do Catálogo de Ajuste Renal
  if (typeof CATALOGO_AJUSTE_RENAL_ANTIMICROBIANOS !== "undefined") {
    for (var kAtb in CATALOGO_AJUSTE_RENAL_ANTIMICROBIANOS) {
      var itemAtb = CATALOGO_AJUSTE_RENAL_ANTIMICROBIANOS[kAtb];
      if (textoNorm.indexOf(" " + kAtb + " ") !== -1) {
        adicionar(kAtb);
      } else if (Array.isArray(itemAtb.aliases)) {
        for (var al = 0; al < itemAtb.aliases.length; al++) {
          var alL = itemAtb.aliases[al].toLowerCase();
          if (textoNorm.indexOf(" " + alL + " ") !== -1) {
            adicionar(kAtb);
            break;
          }
        }
      }
    }
  }

  // 5. Drogas vasoativas, eletrólitos e sedativos de UTI (Compatibilidade Y)
  if (typeof CompatibilidadeYDvaService !== "undefined" && CompatibilidadeYDvaService.FICHAS_DILUICAO_DVA) {
    for (var kDva in CompatibilidadeYDvaService.FICHAS_DILUICAO_DVA) {
      var kDvaNorm = kDva.replace(/_/g, " ");
      if (textoNorm.indexOf(" " + kDvaNorm + " ") !== -1 || textoNorm.indexOf(" " + kDva + " ") !== -1) {
        adicionar(kDva);
      } else {
        var primTermo = kDva.split("_")[0];
        if (primTermo.length >= 5 && !STOPWORDS_FARMACOS[primTermo] && textoNorm.indexOf(" " + primTermo + " ") !== -1) {
          adicionar(kDva);
        }
      }
    }
  }

  // 6. Fármacos essenciais de segurança (garantia em testes / offline)
  for (var ef = 0; ef < FARMACOS_SEGURANCA_ESSENCIAIS.length; ef++) {
    var farmacoEssencial = FARMACOS_SEGURANCA_ESSENCIAIS[ef];
    if (textoNorm.indexOf(" " + farmacoEssencial + " ") !== -1) {
      adicionar(farmacoEssencial);
    }
  }

  // 7. Catálogo gestacional obstétrico
  if (typeof ObstetriciaPrenatalService !== "undefined" && ObstetriciaPrenatalService.BANCO_FARMACOS_GESTACAO) {
    for (var kGest in ObstetriciaPrenatalService.BANCO_FARMACOS_GESTACAO) {
      var kGestNorm = kGest.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (kGestNorm.length >= 3 && !STOPWORDS_FARMACOS[kGestNorm] && textoNorm.indexOf(" " + kGestNorm + " ") !== -1) {
        adicionar(kGestNorm);
      }
    }
  }

  return encontrados;
}

function extrairContextoRenalDoTexto(texto) {
  var str = String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  var res = {
    temDisfuncao: false,
    creatinina: null,
    clcr: null,
    dialise: false,
    detalhes: []
  };

  // 1. Detecção de creatinina sérica (ex: creatinina 2.1, cr: 1.8, cr 3,0 mg/dl)
  var mCr = str.match(/\b(?:creatinina|creat|cr)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:mg\/dl)?\b/);
  if (mCr && mCr[1]) {
    res.creatinina = parseFloat(mCr[1].replace(",", "."));
    res.temDisfuncao = res.creatinina >= 1.3;
    res.detalhes.push("Creatinina: " + res.creatinina + " mg/dL");
  }

  // 2. Detecção de ClCr ou TFG (ex: clcr 35, tfg < 30, clcr: 25 ml/min)
  var mClcr = str.match(/\b(?:clcr|tfg|clearence|clearance)\s*[:=]?\s*([<>]?\s*\d+(?:[.,]\d+)?)\s*(?:ml\/min)?\b/);
  if (mClcr && mClcr[1]) {
    var valLimpo = mClcr[1].replace(/\s+/g, "").replace(",", ".");
    var numClcr = parseFloat(valLimpo.replace(/^[<>]/, ""));
    res.clcr = numClcr;
    res.temDisfuncao = true;
    res.detalhes.push("ClCr/TFG: " + valLimpo + " mL/min");
  }

  // 3. Detecção de diálise ou DRC
  if (/\b(?:dialise|hemodialise|hd|drc|insuficiencia renal|ira|injuria renal)\b/.test(str)) {
    res.temDisfuncao = true;
    if (/\b(?:dialise|hemodialise|hd)\b/.test(str)) res.dialise = true;
    res.detalhes.push("Histórico/condição renal: " + (res.dialise ? "Hemodiálise / Terapia Renal Substitutiva" : "Disfunção Renal / DRC / IRA"));
  }

  return res;
}

/**
 * Auditor determinístico em RAM (0ms) de alergias medicamentosas, reatividade cruzada e contraindicações na gestação.
 */
function auditarAlergiasEGestacaoDeterministico(farmacosDetectados, textoContexto) {
  var resultado = {
    temCritico: false,
    alergias: [],
    gestacao: []
  };

  if (!farmacosDetectados || farmacosDetectados.length === 0) return resultado;

  var ctxNorm = " " + String(textoContexto || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s+]/g, " ") + " ";

  // 1. AUDITORIA DE ALERGIAS MEDICAMENTOSAS E REATIVIDADE CRUZADA
  var temAlergiaPenicilina = /\b(?:alergia|alergico|alergica|choque|anafilaxia)\b.*?\b(?:penicilina|amoxicilina|ampicilina|beta[\s-]?lactamico|betalactamico)\b/i.test(ctxNorm) ||
    /\b(?:alergia|alergico|alergica)\s+(?:a|ao|aos|as)?\s*(?:penicilina|amoxicilina|ampicilina|beta[\s-]?lactamicos?|betalactamicos?)\b/i.test(ctxNorm);

  var temAlergiaAine = /\b(?:alergia|alergico|alergica)\s+(?:a|ao|aos|as)?\s*(?:aine|aines|anti[\s-]?inflamatorio|antiinflamatorio|ibuprofeno|diclofenaco|cetoprofeno|aas|aspirina)\b/i.test(ctxNorm) ||
    /\b(?:triade\s+de\s+widal|drea|asma\s+induzida\s+por\s+aspirina)\b/i.test(ctxNorm);

  var temAlergiaSulfa = /\b(?:alergia|alergico|alergica)\s+(?:a|ao|aos|as)?\s*(?:sulfa|sulfas|sulfonamida|sulfonamidas|bactrim)\b/i.test(ctxNorm);

  var temAlergiaDipirona = /\b(?:alergia|alergico|alergica)\s+(?:a|ao|aos|as)?\s*(?:dipirona|metamizol|novalgina)\b/i.test(ctxNorm);

  var PENICILINAS_MAP = {
    "amoxicilina": 1, "ampicilina": 1, "piperacilina": 1, "benzilpenicilina": 1,
    "oxacilina": 1, "penicilina": 1, "penicilina_g": 1, "amoxil": 1, "tazocin": 1,
    "clavulanato": 1, "tazobactam": 1
  };
  var CEFALOSPORINAS_1A_GER = {
    "cefalexina": 1, "cefazolina": 1, "cefradina": 1, "cefadroxil": 1
  };
  var AINES_MAP = {
    "ibuprofeno": 1, "cetoprofeno": 1, "diclofenaco": 1, "cetorolaco": 1,
    "naproxeno": 1, "nimesulida": 1, "tenoxicam": 1, "piroxicam": 1,
    "meloxicam": 1, "indometacina": 1, "aspirina": 1, "aas": 1, "flurbiprofeno": 1
  };
  var SULFAS_MAP = {
    "sulfametoxazol": 1, "sulfadiazina": 1, "dapsona": 1, "sulfassalazina": 1
  };

  farmacosDetectados.forEach(function(fBruto) {
    var f = String(fBruto || "").toLowerCase().trim();

    // Checagem de Penicilinas / Beta-lactâmicos
    if (temAlergiaPenicilina) {
      if (PENICILINAS_MAP[f]) {
        resultado.alergias.push({
          tipo: "CONTRAINDICADO",
          farmaco: f,
          motivo: "Paciente alérgico a Penicilinas/Beta-lactâmicos. Risco de anafilaxia grave com " + f.toUpperCase() + ".",
          alternativa: "Macrolídeos (Azitromicina), Quinolonas, Clindamicina ou Vancomicina conforme indicação clínica."
        });
        resultado.temCritico = true;
      } else if (CEFALOSPORINAS_1A_GER[f]) {
        resultado.alergias.push({
          tipo: "ALERTA CRUZADO",
          farmaco: f,
          motivo: "Risco de reatividade cruzada (~1-3% nas cefalosporinas de 1ª geração em alérgicos a penicilinas).",
          alternativa: "Avaliar histórico de anafilaxia prévia. Considerar Cefalosporinas de 3ª/4ª geração ou outra classe não beta-lactâmica."
        });
        resultado.temCritico = true;
      }
    }

    // Checagem de AINEs
    if (temAlergiaAine && AINES_MAP[f]) {
      resultado.alergias.push({
        tipo: "CONTRAINDICADO",
        farmaco: f,
        motivo: "Histórico de alergia/hipersensibilidade a AINEs. Risco de broncoespasmo grave (Tríade de Widal/DREA) ou anafilaxia.",
        alternativa: "Paracetamol ou Dipirona (se tolerados) ou analgésicos opioides (Tramadol/Codeína)."
      });
      resultado.temCritico = true;
    }

    // Checagem de Sulfas
    if (temAlergiaSulfa && SULFAS_MAP[f]) {
      resultado.alergias.push({
        tipo: "CONTRAINDICADO",
        farmaco: f,
        motivo: "Histórico de alergia a Sulfas/Sulfonamidas. Risco de Síndrome de Stevens-Johnson (SSJ), NET ou anafilaxia.",
        alternativa: "Ceftriaxona, Ciprofloxacino, Fosfomicina ou Nitrofurantoína conforme foco infeccioso."
      });
      resultado.temCritico = true;
    }

    // Checagem de Dipirona
    if (temAlergiaDipirona && (f === "dipirona" || f === "metamizol")) {
      resultado.alergias.push({
        tipo: "CONTRAINDICADO",
        farmaco: f,
        motivo: "Alergia documentada à Dipirona/Metamizol.",
        alternativa: "Paracetamol (se tolerado) ou analgésicos opioides fracos."
      });
      resultado.temCritico = true;
    }
  });

  // 2. AUDITORIA DE TERATOGENICIDADE & GESTAÇÃO
  var ehGestante = /\b(?:gestante|gravida|gravidez|gestacao|puerpera|lactante)\b/i.test(ctxNorm) ||
    /\b(?:ig|dpp|dum)\s*[:=]?\s*\d+/i.test(ctxNorm) ||
    /\b\d+\s*sem(?:anas?)?\s*(?:de\s+gestacao)?\b/i.test(ctxNorm) ||
    /\b(?:1[oº]|2[oº]|3[oº]|primeiro|segundo|terceiro)\s+trimestre\b/i.test(ctxNorm);

  if (ehGestante) {
    var DROGAS_CONTRAINDICADAS_GESTAO = {
      "losartana": { fda: "D", risco: "Disgenesia renal, anúria neonatal, oligoidrâmnio grave e hipoplasia pulmonar (BRA).", alt: "Metildopa, Nifedipino ou Hidralazina." },
      "valsartana": { fda: "D", risco: "Toxicidade feto-renal grave (BRA).", alt: "Metildopa ou Nifedipino." },
      "candesartana": { fda: "D", risco: "Toxicidade feto-renal grave (BRA).", alt: "Metildopa ou Nifedipino." },
      "enalapril": { fda: "D", risco: "Fetotoxicidade feto-renal grave, oligoidrâmnio e anúria neonatal (IECA).", alt: "Metildopa, Nifedipino ou Hidralazina." },
      "captopril": { fda: "D", risco: "Fetotoxicidade feto-renal grave (IECA).", alt: "Metildopa ou Nifedipino." },
      "ramipril": { fda: "D", risco: "Fetotoxicidade feto-renal grave (IECA).", alt: "Metildopa ou Nifedipino." },
      "sinvastatina": { fda: "X", risco: "Teratogênico na embriogênese e síntese de colesterol fetal.", alt: "Suspender estatina durante a gestação." },
      "atorvastatina": { fda: "X", risco: "Teratogênico na síntese de colesterol e membranas fetais.", alt: "Suspender estatina durante a gestação." },
      "rosuvastatina": { fda: "X", risco: "Contraindicado absoluto na gestação.", alt: "Suspender estatina durante a gestação." },
      "varfarina": { fda: "D/X", risco: "Síndrome da embriopatia varfarínica (hipoplasia nasal, condrodisplasia pontilhada) e hemorragia fetal.", alt: "Enoxaparina (HBPM) ou Heparina Não Fracionada." },
      "ciprofloxacino": { fda: "C", risco: "Toxicidade cartilaginosa e artropatias em articulações de suporte fetal (Quinolona).", alt: "Ceftriaxona, Cefuroxima, Amoxicilina ou Fosfomicina." },
      "levofloxacino": { fda: "C", risco: "Toxicidade cartilaginosa articular fetal (Quinolona).", alt: "Ceftriaxona ou Amoxicilina+Clavulanato." },
      "norfloxacino": { fda: "C", risco: "Toxicidade cartilaginosa articular fetal (Quinolona).", alt: "Fosfomicina ou Cefalexina." },
      "moxifloxacino": { fda: "C", risco: "Toxicidade cartilaginosa articular fetal (Quinolona).", alt: "Ceftriaxona ou Azitromicina." },
      "doxiciclina": { fda: "D", risco: "Descoloração dental permanente e alteração no crescimento ósseo fetal (Tetraciclina).", alt: "Azitromicina ou Amoxicilina." },
      "tetraciclina": { fda: "D", risco: "Hipoplasia do esmalte dentário e retardo no crescimento ósseo fetal.", alt: "Amoxicilina ou Azitromicina." },
      "valproato": { fda: "X", risco: "Defeitos graves do tubo neural (espinha bífida), fenda palatina e déficit cognitivo grave.", alt: "Lamotrigina ou Levetiracetam com ácido fólico 5mg/dia." },
      "acido valproico": { fda: "X", risco: "Defeitos do tubo neural (espinha bífida) e malformações congênitas múltiplas.", alt: "Lamotrigina ou Levetiracetam." },
      "metotrexato": { fda: "X", risco: "Teratogênese grave, abortamento e malformações craniofaciais e esqueléticas.", alt: "Contraindicação absoluta na gestação." },
      "ibuprofeno": { fda: "D", risco: "Fechamento prematuro do canal arterial (ductus arteriosus), hipertensão pulmonar persistente neonatal e oligoidrâmnio (AINE).", alt: "Paracetamol (analgésico de 1ª linha na gestação)." },
      "cetoprofeno": { fda: "D", risco: "Fechamento prematuro do ducto arterioso e oligoidrâmnio (AINE).", alt: "Paracetamol." },
      "diclofenaco": { fda: "D", risco: "Fechamento prematuro do canal arterial e disfunção renal fetal (AINE).", alt: "Paracetamol." },
      "cetorolaco": { fda: "D", risco: "Fechamento prematuro do canal arterial e risco hemorrágico (AINE).", alt: "Paracetamol." },
      "naproxeno": { fda: "D", risco: "Fechamento prematuro do canal arterial (AINE).", alt: "Paracetamol." },
      "nimesulida": { fda: "D", risco: "Fechamento prematuro do canal arterial e insuficiência renal fetal (AINE).", alt: "Paracetamol." }
    };

    farmacosDetectados.forEach(function(fBruto) {
      var f = String(fBruto || "").toLowerCase().trim();
      var infoTerato = DROGAS_CONTRAINDICADAS_GESTAO[f];
      if (infoTerato) {
        resultado.gestacao.push({
          farmaco: f,
          categoriaFda: infoTerato.fda,
          risco: infoTerato.risco,
          alternativa: infoTerato.alt
        });
        resultado.temCritico = true;
      }
    });
  }

  return resultado;
}

function executarCrossCheckSegurancaClinica(drogasOuTexto, dadosContexto) {
  var t0 = Date.now();
  var farmacos = [];

  if (Array.isArray(drogasOuTexto)) {
    drogasOuTexto.forEach(function(d) {
      if (typeof d === "string") {
        var sub = extrairFarmacosDoTexto(d);
        if (sub.length > 0) {
          sub.forEach(function(s) { if (farmacos.indexOf(s) === -1) farmacos.push(s); });
        } else if (d.trim().length >= 3) {
          farmacos.push(d.trim().toLowerCase());
        }
      }
    });
  } else {
    farmacos = extrairFarmacosDoTexto(drogasOuTexto);
  }

  var contextoTexto = (typeof dadosContexto === "string") ? dadosContexto : (dadosContexto ? JSON.stringify(dadosContexto) : "");
  var ctxRenal = extrairContextoRenalDoTexto((typeof drogasOuTexto === "string" ? drogasOuTexto + " " : "") + contextoTexto);

  var interacoesAchadas = [];
  try {
    if (farmacos.length >= 2) {
      var regras = _obterRegrasInteracoesNorm();
      for (var i = 0; i < farmacos.length; i++) {
        for (var j = i + 1; j < farmacos.length; j++) {
          var d1 = farmacos[i];
          var d2 = farmacos[j];
          for (var k = 0; k < regras.length; k++) {
            var r = regras[k];
            if ((r.colA.indexOf(d1) !== -1 && r.colB.indexOf(d2) !== -1) || (r.colA.indexOf(d2) !== -1 && r.colB.indexOf(d1) !== -1)) {
              interacoesAchadas.push({
                drogaA: r.drogaA,
                drogaB: r.drogaB,
                grau: r.grau,
                grauNormalizado: r.grauNormalizado,
                efeito: r.efeito,
                recomendacao: r.recomendacao
              });
            }
          }
        }
      }
    }
  } catch (eInt) {}

  // 2. Ajustes Renais (Catálogo de Antimicrobianos & Guia HSL)
  var ajustesRenais = [];
  var tetosDose = [];

  for (var f = 0; f < farmacos.length; f++) {
    var ajAtb = (typeof obterAjusteRenalAntimicrobiano === "function")
      ? obterAjusteRenalAntimicrobiano(farmacos[f], ctxRenal.clcr, ctxRenal.dialise)
      : null;

    if (ajAtb && ajAtb.ok) {
      ajustesRenais.push({
        farmaco: farmacos[f].toUpperCase(),
        nomeOficial: ajAtb.antimicrobiano,
        ajuste: ajAtb.doseAjustada + (ajAtb.orientacaoFaixa ? " (" + ajAtb.orientacaoFaixa + ")" : ""),
        faixaClCr: ajAtb.faixaAplicada,
        diluicao: ajAtb.diluicao,
        alertaSentinela: ajAtb.alertaSentinela,
        monitorizacao: ajAtb.monitorizacao,
        naRemume: false,
        dadosEstruturadosAtb: ajAtb
      });
    } else {
      var medHsl = (typeof buscarMedicamentoNoHSL === "function") ? buscarMedicamentoNoHSL(farmacos[f]) : null;
      if (medHsl) {
        var temAjuste = medHsl.ajuste_dose && !/n[aã]o h[aá] ajuste|sem ajuste/i.test(medHsl.ajuste_dose) && medHsl.ajuste_dose.trim().length > 5;
        if (temAjuste) {
          ajustesRenais.push({
            farmaco: farmacos[f].toUpperCase(),
            nomeOficial: medHsl.farnaco,
            ajuste: medHsl.ajuste_dose.trim(),
            naRemume: !!medHsl.na_remume
          });
        }
      }
    }

    var medHslTeto = (typeof buscarMedicamentoNoHSL === "function") ? buscarMedicamentoNoHSL(farmacos[f]) : null;
    if (medHslTeto && medHslTeto.dose_maxima && medHslTeto.dose_maxima.trim().length > 3) {
      tetosDose.push({
        farmaco: farmacos[f].toUpperCase(),
        nomeOficial: medHslTeto.farnaco,
        doseMaxima: medHslTeto.dose_maxima.trim()
      });
    }
  }

  // 3. Compatibilidade em Y de Vasopressores e Inotrópicos (D1 / BIC)
  var auditoriaY = null;
  if (typeof CompatibilidadeYDvaService !== "undefined") {
    auditoriaY = CompatibilidadeYDvaService.auditarPrescricaoCombinada(farmacos);
  }

  // Ordenação de interações por gravidade clínica: Contraindicado > Grave > Moderado > Leve
  var pesoGrau = { "CONTRAINDICADO": 4, "GRAVE": 3, "MODERADO": 2, "LEVE": 1 };
  interacoesAchadas.sort(function(a, b) {
    return (pesoGrau[b.grauNormalizado] || 0) - (pesoGrau[a.grauNormalizado] || 0);
  });

  var temContraindicado = interacoesAchadas.some(function(it) { return it.grauNormalizado === "CONTRAINDICADO"; });
  var temGrave = interacoesAchadas.some(function(it) { return it.grauNormalizado === "GRAVE"; });
  var temIncompativelY = auditoriaY ? (auditoriaY.temIncompativel || auditoriaY.temAlertasCriticos) : false;

  // 4. Auditoria Determinística de Alergias Cruzadas e Gestação em RAM (0ms)
  var auditoriaAlergiasGestacao = auditarAlergiasEGestacaoDeterministico(farmacos, (typeof drogasOuTexto === "string" ? drogasOuTexto + " " : "") + contextoTexto);

  var temAlertasCriticos = temContraindicado || temGrave || temIncompativelY || (ctxRenal.temDisfuncao && ajustesRenais.length > 0) || auditoriaAlergiasGestacao.temCritico;

  // Formatação clínica para Telegram, Cockpit e Auditoria
  var linhasTexto = [];
  linhasTexto.push("🛡️ *CROSS-CHECK DE SEGURANÇA FARMACOLÓGICA*");
  linhasTexto.push("🔍 *Fármacos rastreados:* " + (farmacos.length > 0 ? farmacos.map(function(s){return "`" + s.toUpperCase() + "`";}).join(", ") : "Nenhum fármaco identificado"));

  // Alergias medicamentosas e reatividade cruzada
  if (auditoriaAlergiasGestacao.alergias.length > 0) {
    linhasTexto.push("\n🚫 *ALERTA DE ALERGIA MEDICAMENTOSA / REAÇÃO CRUZADA:*");
    auditoriaAlergiasGestacao.alergias.forEach(function(al) {
      var iconeAl = al.tipo === "CONTRAINDICADO" ? "🛑" : "⚠️";
      linhasTexto.push(iconeAl + " *" + al.tipo + ":* `" + al.farmaco.toUpperCase() + "`");
      linhasTexto.push("   • *Motivo:* " + al.motivo);
      if (al.alternativa) linhasTexto.push("   • *Alternativa sugerida:* " + al.alternativa);
    });
  }

  // Segurança gestacional e teratogenicidade
  if (auditoriaAlergiasGestacao.gestacao.length > 0) {
    linhasTexto.push("\n🤰 *SEGURANÇA NA GESTAÇÃO & LACTAÇÃO:*");
    auditoriaAlergiasGestacao.gestacao.forEach(function(gt) {
      linhasTexto.push("🛑 *CONTRAINDICADO NA GESTAÇÃO (Cat " + gt.categoriaFda + "):* `" + gt.farmaco.toUpperCase() + "`");
      linhasTexto.push("   • *Risco:* " + gt.risco);
      if (gt.alternativa) linhasTexto.push("   • *Alternativa segura:* " + gt.alternativa);
    });
  }

  if (interacoesAchadas.length > 0) {
    linhasTexto.push("\n⚠️ *INTERAÇÕES MEDICAMENTOSAS IDENTIFICADAS:*");
    interacoesAchadas.forEach(function(inter) {
      var icone = inter.grauNormalizado === "CONTRAINDICADO" ? "🛑" : inter.grauNormalizado === "GRAVE" ? "🔴" : "🟡";
      linhasTexto.push(icone + " *" + inter.grau.toUpperCase() + ":* `" + inter.drogaA + "` ⚡ `" + inter.drogaB + "`");
      linhasTexto.push("   • *Efeito clínico:* " + inter.efeito);
      if (inter.recomendacao) linhasTexto.push("   • *Conduta recomendada:* " + inter.recomendacao);
    });
  } else if (farmacos.length >= 2) {
    linhasTexto.push("\n✅ *Interações Medicamentosas:* Nenhuma interação grave cadastrada entre as drogas listadas.");
  }

  // Bloco dedicado de Compatibilidade em Y (BIC / Terapia Intensiva)
  // Relevante exclusivamente quando houver drogas de infusão / DVA / UTI
  if (auditoriaY && auditoriaY.pares && auditoriaY.pares.length > 0) {
    var paresUti = auditoriaY.pares.filter(function(par) {
      return (typeof CompatibilidadeYDvaService !== "undefined" &&
              (CompatibilidadeYDvaService.FICHAS_DILUICAO_DVA[par.drogaA] ||
               CompatibilidadeYDvaService.FICHAS_DILUICAO_DVA[par.drogaB] ||
               par.status === "INCOMPATIVEL" || par.alertaCritico));
    });

    if (paresUti.length > 0) {
      var incompPares = paresUti.filter(function(p) { return p.status === "INCOMPATIVEL" || p.alertaCritico; });
      if (incompPares.length > 0) {
        linhasTexto.push("\n🔬 *COMPATIBILIDADE EM Y (INFUSÕES EM BIC / SALA VERMELHA & UTI):*");
        incompPares.forEach(function(par) {
          linhasTexto.push("🛑 *INCOMPATÍVEL:* `" + par.drogaA.toUpperCase() + "` ⚡ `" + par.drogaB.toUpperCase() + "`");
          linhasTexto.push("   • *Mecanismo:* " + par.mecanismo);
          linhasTexto.push("   • *Conduta beira-leito:* " + par.conduta);
        });
      }
    }
  }

  // Fichas de Diluente Oficial D1 para drogas vasoativas identificadas
  if (typeof CompatibilidadeYDvaService !== "undefined" && farmacos.length > 0) {
    var fichasD1 = [];
    farmacos.forEach(function(f) {
      var fd = CompatibilidadeYDvaService.obterFichaDiluicao(f);
      if (fd && fichasD1.indexOf(fd) === -1) fichasD1.push(fd);
    });
    if (fichasD1.length > 0) {
      linhasTexto.push("\n💧 *DILUENTES PADRÃO & VIAS DE INFUSÃO (D1 / UTI):*");
      fichasD1.forEach(function(f) {
        linhasTexto.push("• *" + f.nome + ":* Diluente D1: `" + f.diluenteD1 + "` | Acesso: " + f.acessoVenoso);
      });
    }
  }

  if (ajustesRenais.length > 0) {
    if (ctxRenal.temDisfuncao) {
      linhasTexto.push("\n🫘 *AJUSTES DE FUNÇÃO RENAL (ANTIMICROBIANOS & GUIA HSL):*");
      linhasTexto.push("⚠️ *ATENÇÃO:* Paciente com parâmetros renais alterados (" + ctxRenal.detalhes.join(" | ") + "). Adequar as doses abaixo:");
      ajustesRenais.forEach(function(aj) {
        linhasTexto.push("• *" + aj.nomeOficial + "* (" + (aj.naRemume ? "SUS/REMUME" : "Uso Hospitalar") + "): " + aj.ajuste.replace(/\n+/g, " "));
        if (aj.diluicao) {
          linhasTexto.push("   ↳ 💧 *Diluição:* " + aj.diluicao);
        }
        if (aj.alertaSentinela) {
          linhasTexto.push("   ↳ " + aj.alertaSentinela);
        }
      });
    } else {
      linhasTexto.push("\n🫘 *Ajuste Renal:* Parâmetros normais / sem disfunção declarada.");
    }
  }

  if (tetosDose.length > 0) {
    linhasTexto.push("\n⚖️ *TETO DE DOSE MÁXIMA & LIMITES TERAPÊUTICOS:*");
    tetosDose.forEach(function(td) {
      linhasTexto.push("• *" + td.nomeOficial + ":* `" + td.doseMaxima.replace(/\n/g, " ") + "`");
    });
  }

  var elapsed = Date.now() - t0;

  return {
    ok: true,
    benchmark_ms: elapsed,
    temAlertasCriticos: temAlertasCriticos,
    farmacosDetectados: farmacos,
    interacoes: interacoesAchadas,
    compatibilidadeY: auditoriaY ? auditoriaY.pares : [],
    ajustesRenais: ajustesRenais,
    tetosDose: tetosDose,
    alergias: auditoriaAlergiasGestacao.alergias,
    gestacao: auditoriaAlergiasGestacao.gestacao,
    contextoRenalDetectado: ctxRenal,
    textoFormatado: linhasTexto.join("\n")
  };
}

/**
 * Formata a ficha de diluição, preparo e administração hospitalar do Guia HSL em 0ms.
 */
function formatarDiluicaoPreparoHSL(med) {
  if (!med) return null;
  var linhas = [];
  linhas.push("💧 *GUIA FARMACÊUTICO HSL — DILUIÇÃO & ADMINISTRAÇÃO*");
  linhas.push("═════════════════════════════════════════════════");
  linhas.push("💊 *Fármaco (DCI):* *" + med.farnaco + "*");
  if (med.na_remume) {
    linhas.push("🏛️ *Padronização:* ✅ Presente na REMUME de Ribeirão Preto");
  } else {
    linhas.push("🏛️ *Padronização:* ⚠️ Fora da REMUME municipal (Uso Hospitalar / Compra)");
  }

  if (med.preparo_diluicao) {
    linhas.push("\n🧪 *Reconstituição & Diluição:*");
    linhas.push(med.preparo_diluicao);
  }
  if (med.administracao) {
    linhas.push("\n⏱️ *Tempo & Dispositivo de Infusão:*");
    linhas.push(med.administracao);
  }
  if (med.estabilidade_conservacao) {
    linhas.push("\n❄️ *Estabilidade & Conservação:*");
    linhas.push(med.estabilidade_conservacao);
  }
  var ajAtb = (typeof obterAjusteRenalAntimicrobiano === "function") ? obterAjusteRenalAntimicrobiano(med.farnaco || med.nome_normalizado) : null;
  if (ajAtb && ajAtb.ok) {
    linhas.push("\n🫘 *Ajuste de Dose Renal por Clearance (ClCr / TFG):*");
    linhas.push("  • *ClCr > 50 mL/min:* " + ajAtb.todasFaixas.clcr_maior_50.dose + " — _" + ajAtb.todasFaixas.clcr_maior_50.orientacao + "_");
    linhas.push("  • *ClCr 30-50 mL/min:* " + ajAtb.todasFaixas.clcr_30_50.dose + " — _" + ajAtb.todasFaixas.clcr_30_50.orientacao + "_");
    linhas.push("  • *ClCr 10-29 mL/min:* " + ajAtb.todasFaixas.clcr_10_29.dose + " — _" + ajAtb.todasFaixas.clcr_10_29.orientacao + "_");
    linhas.push("  • *ClCr < 10 / Hemodiálise:* " + ajAtb.todasFaixas.clcr_menor_10_hd.dose + " — _" + ajAtb.todasFaixas.clcr_menor_10_hd.orientacao + "_");
    if (ajAtb.alertaSentinela) {
      linhas.push("\n" + ajAtb.alertaSentinela);
    }
  } else if (med.ajuste_dose && !/n[aã]o h[aá] ajuste|sem ajuste/i.test(med.ajuste_dose)) {
    linhas.push("\n🫘 *Ajuste de Dose Renal (ClCr / TFG):*");
    linhas.push(med.ajuste_dose);
  }
  if (med.dose_maxima) {
    linhas.push("\n⚖️ *Dose Máxima:* " + med.dose_maxima);
  }
  linhas.push("\n📚 *Fonte:* Guia Farmacêutico Hospital Sírio-Libanês (https://guiafarmaceutico.hsl.org.br)");
  return linhas.join("\n");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = Object.assign(module.exports || {}, {
    CATALOGO_AJUSTE_RENAL_ANTIMICROBIANOS: CATALOGO_AJUSTE_RENAL_ANTIMICROBIANOS,
    obterAjusteRenalAntimicrobiano: obterAjusteRenalAntimicrobiano,
    formatarAjusteRenalAntimicrobiano: formatarAjusteRenalAntimicrobiano,
    consultarCatalogoAjusteRenal: consultarCatalogoAjusteRenal,
    obterItensRemumeRP: obterItensRemumeRP,
    consultarRemumeRP: consultarRemumeRP,
    _cacheRegrasInteracoesNorm: _cacheRegrasInteracoesNorm,
    _cacheNomesHslNorm: _cacheNomesHslNorm,
    _obterRegrasInteracoesNorm: _obterRegrasInteracoesNorm,
    _obterNomesHslNorm: _obterNomesHslNorm
  });
}


