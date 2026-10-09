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
  
  if (med.na_remume) {
    linhas.push("🏛️ *Status SUS:* ✅ *PADRONIZADO NA REMUME (Ribeirão Preto)*");
    if (med.apresentacoes_remume && med.apresentacoes_remume.length > 0) {
      linhas.push("📦 *Apresentações na Rede Municipal:*");
      med.apresentacoes_remume.forEach(function(apr) {
        linhas.push("  • `" + apr + "`");
      });
    }
  } else {
    linhas.push("🏛️ *Status SUS:* ⚠️ *NÃO CONSTA NA REMUME MUNICIPAL*");
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
      "   • Se K 3,5 a 5,2 mEq/L: Iniciar insulina E repor KCl 20-30 mEq por litro de soro de manutenção.\n" +
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
      "   • Sulfato de magnésio 2 g IV em 20 minutos.\n" +
      "5. Critérios de Alarme (Via Aérea / UTI):\n" +
      "   • Silêncio respiratório, exaustão, confusão mental ou PaCO₂ normal/elevada (indica falência muscular iminente).",
    "divergencia": "Diferente da DPOC (alvo 88–92% pelo risco de retenção de CO₂), na Asma o alvo mandatório é SpO₂ 93–95% (GINA 2026)."
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
    asma: /\b(?:asma|crise asmatica)\b/g
  };
  // Um protocolo único não representa choques de etiologias diferentes.
  if (/\b(?:anafil\w*|choque (?:hemorragico|cardiogenico|hipovolemico|obstrutivo))\b/.test(texto)) return null;
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
  if (med.na_remume) {
    linhas.push("🏛️ *SUS / REMUME:* ✅ PADRONIZADO NA REDE MUNICIPAL");
    if (med.apresentacoes_remume && med.apresentacoes_remume.length > 0) {
      linhas.push("   _Apresentações SUS:_ " + med.apresentacoes_remume.slice(0, 3).join(", "));
    }
  } else {
    linhas.push("🏛️ *SUS / REMUME:* ⚠️ NÃO CONSTA NA REMUME MUNICIPAL");
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

