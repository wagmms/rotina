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
  "pantoprazol": "pantoprazol"
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

// Cache L1 em memória RAM do processo por execução (0 ms e 0 RPCs em chamadas repetidas)
var _cachePlanilhasExecucao = {};

/**
 * Lê do CacheService ou do Google Drive Sheets com TTL máximo de 21.600s (6h).
 * Utiliza arquitetura em 2 níveis: Cache L1 em RAM + Cache L2 em lote (getAll/putAll).
 */
function obterPlanilha(cachePrefix, idPlanilha, isInteracao) {
  // 1. Cache L1 (Memória RAM da execução atual)
  if (_cachePlanilhasExecucao[cachePrefix]) {
    return _cachePlanilhasExecucao[cachePrefix];
  }

  var cache = CacheService.getScriptCache();
  var numChunks = cache.get(cachePrefix + "_chunks");
  var conteudo = "";

  // 2. Cache L2 (CacheService do Google Apps Script)
  if (numChunks) {
    var totalChunks = parseInt(numChunks, 10);
    var partesCarregadas = [];
    var chaves = [];
    for (var i = 0; i < totalChunks; i++) {
      chaves.push(cachePrefix + "_" + i);
    }

    if (typeof cache.getAll === "function") {
      var mapa = cache.getAll(chaves) || {};
      for (var j = 0; j < totalChunks; j++) {
        var k = chaves[j];
        if (mapa[k] === null || mapa[k] === undefined) {
          partesCarregadas = null;
          break;
        }
        partesCarregadas.push(mapa[k]);
      }
    } else {
      for (var i = 0; i < totalChunks; i++) {
        var chunk = cache.get(chaves[i]);
        if (chunk === null || chunk === undefined) {
          partesCarregadas = null;
          break;
        }
        partesCarregadas.push(chunk);
      }
    }

    if (partesCarregadas && partesCarregadas.length === totalChunks) {
      conteudo = partesCarregadas.join("");
      _cachePlanilhasExecucao[cachePrefix] = conteudo;
      return conteudo;
    }
  }

  // 3. Fallback de Cold-Start: leitura direta do Google Drive Sheets
  try {
    var ss = SpreadsheetApp.openById(idPlanilha);
    var sheet = ss.getSheets()[0];
    var lastRow = sheet.getLastRow();
    var lastCol = isInteracao ? sheet.getLastColumn() : 1;

    if (lastRow > 1 && lastCol > 0) {
      var valores = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      if (isInteracao) {
        conteudo = valores.map(function(linha) { return linha.join(" | "); }).join("\n");
      } else {
        conteudo = valores.map(function(linha) { return linha[0]; }).join("\n");
      }

      var partes = [];
      for (var p = 0; p < conteudo.length; p += 40000) {
        partes.push(conteudo.substring(p, p + 40000));
      }

      safePutCache(cache, cachePrefix + "_chunks", partes.length.toString(), 21600);
      var lote = {};
      for (var k = 0; k < partes.length; k++) {
        lote[cachePrefix + "_" + k] = partes[k];
      }

      if (typeof cache.putAll === "function") {
        try {
          cache.putAll(lote, 21600);
        } catch (ePut) {
          for (var k = 0; k < partes.length; k++) {
            safePutCache(cache, cachePrefix + "_" + k, partes[k], 21600);
          }
        }
      } else {
        for (var k = 0; k < partes.length; k++) {
          safePutCache(cache, cachePrefix + "_" + k, partes[k], 21600);
        }
      }
      _cachePlanilhasExecucao[cachePrefix] = conteudo;
    }
  } catch (e) {
    Logger.log("Erro ao acessar a planilha " + cachePrefix + ": " + e.message);
    throw new Error("Erro ao acessar a base de dados (" + cachePrefix + "). Verifique permissões do Drive.");
  }
  return conteudo;
}

function aquecerCachePlanilhas() {
  var idRemume = ConfigService.get("SPREADSHEET_ID_REMUME");
  var idInteracoes = ConfigService.get("SPREADSHEET_ID_INTERACOES");
  if (idRemume) obterPlanilha("remume", idRemume, false);
  if (idInteracoes) obterPlanilha("interacoes", idInteracoes, true);
  Logger.log("Cache das bases de dados aquecido com sucesso.");
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
    if (linhasRelevantes.length >= 40) break; // Limite de 40 itens para não estourar o prompt
  }

  // Se o filtro encontrou itens relevantes, retorna o subconjunto enxuto preservando qualquer match
  if (linhasRelevantes.length > 0) {
    return linhasRelevantes.join("\n");
  }

  // Fallback: se não deu match direto, retorna primeiras 50 linhas para manter contexto
  return linhas.slice(0, 50).join("\n");
}

function checarStatusFonteDrive(idPlanilha, isInteracao) {
  try {
    var ss = SpreadsheetApp.openById(idPlanilha);
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
  var t = termo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (var chave in PROTOCOLOS_CLINICOS_EMERGENCIA) {
    if (t.indexOf(chave) !== -1) {
      return PROTOCOLOS_CLINICOS_EMERGENCIA[chave];
    }
  }
  // Mapeamentos adicionais
  if (t.indexOf("choque") !== -1 || t.indexOf("infeccao grave") !== -1) return PROTOCOLOS_CLINICOS_EMERGENCIA["sepse"];
  if (t.indexOf("coronaria") !== -1 || t.indexOf("infarto") !== -1 || t.indexOf("dor toracica") !== -1) return PROTOCOLOS_CLINICOS_EMERGENCIA["iam"];
  if (t.indexOf("insuficiencia cardiaca") !== -1 || t.indexOf("congestao") !== -1) return PROTOCOLOS_CLINICOS_EMERGENCIA["eap"];
  if (t.indexOf("cetoacidose") !== -1 || t.indexOf("descompensacao diabetica") !== -1) return PROTOCOLOS_CLINICOS_EMERGENCIA["cad"];
  if (t.indexOf("embolia") !== -1 || t.indexOf("tvp") !== -1) return PROTOCOLOS_CLINICOS_EMERGENCIA["tep"];
  if (t.indexOf("asma") !== -1 || t.indexOf("broncoespasmo") !== -1) return PROTOCOLOS_CLINICOS_EMERGENCIA["asma"];
  if (t.indexOf("dpoc") !== -1) return PROTOCOLOS_CLINICOS_EMERGENCIA["dpoc"];
  return null;
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
