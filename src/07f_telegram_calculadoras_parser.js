/**
 * ==============================================================================
 * MÓDULO 07F: TELEGRAM PARSER DE CALCULADORAS CLÍNICAS
 * ==============================================================================
 * Identificação determinística de scores clínicos beira-leito, instruções de
 * preenchimento e navegação hierárquica por submenus de calculadoras.
 * ==============================================================================
 */

var CATALOGO_CALCULADORAS = {
  curb: {
    id: "curb65",
    nome: "CURB-65",
    aliases: ["curb", "curb65", "curb-65", "crb65", "crb-65"]
  },
  parkland: {
    id: "parkland",
    nome: "Parkland (Queimaduras)",
    aliases: ["parkland", "queimados", "queimadura", "queimaduras"]
  },
  ckd: {
    id: "ckd",
    nome: "CKD-EPI 2021",
    aliases: ["ckd", "ckd-epi", "ckdepi", "tfg"]
  },
  cockcroft: {
    id: "cockcroft", nome: "Cockcroft-Gault",
    aliases: ["cockcroft", "cockcroft-gault", "clearance", "clearence"]
  },
  cha2ds2: {
    id: "cha2ds2vasc",
    nome: "CHA2DS2-VASc",
    aliases: ["cha2ds2", "cha2ds2-vasc", "cha2ds2vasc", "cha2ds2va", "cha2ds2-va", "chads", "chadvacs", "chadvasc", "vasc"]
  },
  hasbled: {
    id: "hasbled",
    nome: "HAS-BLED",
    aliases: ["hasbled", "has-bled", "has bled"]
  },
  wells: {
    id: "wells",
    nome: "Escore de Wells (TEP/TVP)",
    aliases: ["wells", "wellstep", "wellstvp", "wells-tep", "wells-tvp", "tep", "tvp"]
  },
  heart_timi: {
    id: "heart",
    nome: "HEART Score / TIMI",
    aliases: ["heart", "timi", "heart-timi", "heart score"]
  },
  grace: {
    id: "grace",
    nome: "GRACE Score",
    aliases: ["grace", "grace score"]
  },
  meld: {
    id: "meld",
    nome: "MELD / MELD-Na",
    aliases: ["meld", "meld-na", "meldna"]
  },
  child: {
    id: "child",
    nome: "Child-Pugh",
    aliases: ["child", "child-pugh", "childpugh"]
  },
  glasgow: {
    id: "glasgow",
    nome: "Glasgow-P",
    aliases: ["glasgow", "glasgow-p", "glasgowp", "gcs", "gcs-p", "gcsp"]
  },
  nihss: {
    id: "nihss",
    nome: "NIHSS",
    aliases: ["nihss", "nih"]
  },
  ranson_bisap: {
    id: "ranson",
    nome: "Ranson / BISAP",
    aliases: ["ranson", "bisap"]
  },
  framingham: {
    id: "framingham",
    nome: "Framingham",
    aliases: ["framingham"]
  },
  frax: {
    id: "frax",
    nome: "FRAX",
    aliases: ["frax"]
  },
  apache: {
    id: "apache",
    nome: "APACHE II",
    aliases: ["apache", "apache2", "apache ii", "apache-2"]
  },
  sofa: {
    id: "sofa",
    nome: "SOFA / qSOFA",
    aliases: ["sofa", "qsofa"]
  },
  kdigo: {
    id: "kdigo",
    nome: "KDIGO (Injúria Renal)",
    aliases: ["kdigo", "injuria renal", "ira"]
  },
  agua: {
    id: "agua",
    nome: "Déficit de Água Livre",
    aliases: ["agua", "deficit agua", "deficit de agua", "deficit de agua livre", "hipernatremia", "deficit"]
  },
  calcio: {
    id: "calcio",
    nome: "Cálcio Corrigido",
    aliases: ["calcio", "calcio corrigido", "calcemia"]
  },
  gap_osmolar: {
    id: "gap_osmolar",
    nome: "Gap Osmolar",
    aliases: ["gap osmolar", "osmolaridade", "gap osmolal"]
  },
  gaso: {
    id: "gasometria",
    nome: "Gasometria Arterial",
    aliases: ["gaso", "gasometria"]
  },
  dva: {
    id: "dva",
    nome: "Drogas Vasoativas",
    aliases: ["dva", "nora", "noradrenalina", "vaso", "vasopressina", "dobuta", "dobutamina"]
  },
  sri: {
    id: "sri",
    nome: "Sequência Rápida de Intubação",
    aliases: ["sri", "intubacao", "intubação", "sequencia rapida", "sequência rápida"]
  },
  ldl: {
    id: "ldl",
    nome: "LDL Martin-Hopkins",
    aliases: ["ldl", "martin", "hopkins", "martin-hopkins"]
  }
};

var LISTA_CALCULADORAS_DETERMINISTICAS = [
  "curb65", "ckd", "cockcroft", "cha2ds2vasc", "hasbled", "wells",
  "glasgow", "calcio", "gap_osmolar", "agua", "kdigo", "ldl", "meld",
  "parkland", "dva", "gasometria", "gaso"
];

function ehCalculadoraDeterministica(texto) {
  var id = identificarCalculadora(texto);
  return id ? LISTA_CALCULADORAS_DETERMINISTICAS.indexOf(id) !== -1 : false;
}

function ehApenasNomeCalculadora(texto) {
  var s = (texto || "").trim().toLowerCase();
  for (var k in CATALOGO_CALCULADORAS) {
    var c = CATALOGO_CALCULADORAS[k];
    if (c.aliases.indexOf(s) !== -1) return true;
  }
  return false;
}

function ehCalculadoraReconhecida(texto) {
  if (!texto || typeof texto !== "string") return false;
  var t = texto.toLowerCase();
  for (var k in CATALOGO_CALCULADORAS) {
    var c = CATALOGO_CALCULADORAS[k];
    for (var i = 0; i < c.aliases.length; i++) {
      var alias = c.aliases[i];
      var escAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      var re = new RegExp("(?:^|[^a-z0-9à-ÿ])" + escAlias + "(?:$|[^a-z0-9à-ÿ])", "i");
      if (re.test(t)) {
        return true;
      }
    }
  }
  return false;
}

// O primeiro identificador explícito prevalece sobre palavras dos dados clínicos.
function identificarCalculadora(texto) {
  var encontrados = [];
  Object.keys(CATALOGO_CALCULADORAS).forEach(function(k) {
    var c = CATALOGO_CALCULADORAS[k];
    c.aliases.forEach(function(alias) {
      var re = new RegExp("(^|[^a-z0-9à-ÿ])" + alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?=$|[^a-z0-9à-ÿ])", "i");
      var m = String(texto).match(re);
      if (m) encontrados.push({id:c.id, pos:m.index, tamanho:alias.length});
    });
  });
  encontrados.sort(function(a,b) {return a.pos-b.pos || b.tamanho-a.tamanho;});
  return encontrados.length ? encontrados[0].id : null;
}

function tentarCalcularDeterministico(texto) {
  if (!texto || typeof CalculadorasClinicas === "undefined") return null;
  var t = texto.toLowerCase();
  var identidade = identificarCalculadora(texto);

  // 0.0. Gasometria Arterial e Distúrbios Ácido-Base (Regra dos 5 Passos em RAM)
  if (identidade === "gasometria" || identidade === "gaso" ||
      /\b(?:gaso|gasometria)\b/i.test(t) ||
      (/\bph\b/i.test(t) && /\b(?:pco2|hco3|bicarb|bic)\b/i.test(t))) {
    if (typeof GasometriaAcidoBaseService !== "undefined" && typeof GasometriaAcidoBaseService.extrairParametrosGasometria === "function") {
      var parseDetGaso = GasometriaAcidoBaseService.extrairParametrosGasometria(texto);
      if (parseDetGaso && parseDetGaso.valido && parseDetGaso.parametros) {
        var analiseDet = GasometriaAcidoBaseService.analisarGasometria(parseDetGaso.parametros);
        var txtDetGaso = GasometriaAcidoBaseService.formatarTextoTelegram(analiseDet);
        if (parseDetGaso.inversaoSuspeita && parseDetGaso.mensagemInversao) {
          txtDetGaso = "⚠️ *" + parseDetGaso.mensagemInversao + "*\n\n" + txtDetGaso;
        }
        return txtDetGaso;
      }
    }
  }

  // 0. Preparo & Diluição de Fármacos em RAM (Guia Farmacêutico HSL)
  var matchDilDet = texto.match(/(?:como\s+diluir|dilui[çc][ãa]o\s+d[eo]?|preparo\s+d[eo]?|tempo\s+de\s+infus[ãa]o\s+d[eo]?|estabilidade\s+d[eo]?)\s+([a-zA-Z0-9\s+]+)/i);
  if (matchDilDet && matchDilDet[1]) {
    var termoDrogaDet = matchDilDet[1].trim().replace(/[?!.]+$/, "");
    if (termoDrogaDet.length >= 3 && typeof buscarMedicamentoNoHSL === "function") {
      var medHslDet = buscarMedicamentoNoHSL(termoDrogaDet);
      if (medHslDet && (medHslDet.preparo_diluicao || medHslDet.administracao)) {
        var respDilDet = formatarDiluicaoPreparoHSL(medHslDet);
        if (respDilDet) return respDilDet;
      }
    }
  }

  // 0.1. Parkland (Ressuscitação em Queimados)
  if (identidade === "parkland" || /(?:parkland|queimadur[as]?)\b/i.test(t)) {
    if (typeof CalculadorasClinicas.calcularParklandPorTextoLivre === "function") {
      var resParkLivre = CalculadorasClinicas.calcularParklandPorTextoLivre(texto);
      if (resParkLivre && resParkLivre.ok) return resParkLivre.textoFormatado;
    }
    var mPark1 = t.match(/(?:parkland|queimadur[as]?)\b.*?(?:(\d+(?:[.,]\d+)?)\s*kg).*?(\d+(?:[.,]\d+)?)\s*%/i) ||
                 t.match(/(?:parkland|queimadur[as]?)\b.*?(\d+(?:[.,]\d+)?)\s*%.*?(?:(\d+(?:[.,]\d+)?)\s*kg)/i);
    if (mPark1) {
      var pPark1 = parseFloat((mPark1[1] || mPark1[2]).replace(",", "."));
      var sPark1 = parseFloat((mPark1[2] || mPark1[1]).replace(",", "."));
      var rP1 = CalculadorasClinicas.parkland(pPark1, sPark1);
      if (rP1 && rP1.ok) return rP1.textoFormatado;
    }
    var mPesoPark = t.match(/(?:peso\s*[:=]?\s*)?(\d+(?:[.,]\d+)?)\s*kg\b/i);
    var mScqPark = t.match(/(?:scq|queimadura)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*%?/i) || t.match(/(\d+(?:[.,]\d+)?)\s*%/i);
    if (mPesoPark && mScqPark) {
      var rP2 = CalculadorasClinicas.parkland(parseFloat(mPesoPark[1].replace(",", ".")), parseFloat(mScqPark[1].replace(",", ".")));
      if (rP2 && rP2.ok) return rP2.textoFormatado;
    }
    return "⚠️ *Calculadora Parkland: Parâmetros Insuficientes*\n\n" + obterInstrucoesCalculadora("parkland");
  }

  // 0.2. Drogas Vasoativas (DVA em mcg/kg/min ou mcg/min)
  if (identidade === "dva" || /\b(?:dva|noradrenalina|nora|dobutamina|dobuta|vasopressina|vaso|nitroprussiato|nitroglicerina)\b/i.test(t)) {
    var matchPesoDva = t.match(/(?:peso\s*[:=]?\s*)?(\d+(?:[.,]\d+)?)\s*kg\b/i);
    var drogaEleitaDva = null;
    if (/\b(?:nora|noradrenalina)\b/i.test(t)) drogaEleitaDva = "noradrenalina";
    else if (/\b(?:dobuta|dobutamina)\b/i.test(t)) drogaEleitaDva = "dobutamina";
    else if (/\b(?:vaso|vasopressina)\b/i.test(t)) drogaEleitaDva = "vasopressina";
    else if (/\b(?:nitroprussiato|nipride)\b/i.test(t)) drogaEleitaDva = "nitroprussiato";
    else if (/\b(?:nitroglicerina|tridil)\b/i.test(t)) drogaEleitaDva = "nitroglicerina";
    else if (identidade === "dva") drogaEleitaDva = "noradrenalina";

    if (drogaEleitaDva) {
      var solDvaDet = /concentrad[ao]|dobrad[ao]|4x|2x/i.test(t) ? "concentrada" : "padrao";
      if (matchPesoDva || drogaEleitaDva === "vasopressina" || drogaEleitaDva === "nitroglicerina") {
        var pDvaVal = matchPesoDva ? parseFloat(matchPesoDva[1].replace(",", ".")) : 70;
        var rDva = CalculadorasClinicas.drogasVasoativas(drogaEleitaDva, pDvaVal, solDvaDet);
        if (rDva && rDva.ok) {
          var strDva = "💉 *" + (rDva.nome || "INFUSÃO DE DROGAS VASOATIVAS").toUpperCase() + "*\n\n";
          strDva += "• *Concentração:* `" + rDva.principal + "`\n";
          if (rDva.secoes) {
            for (var sd = 0; sd < rDva.secoes.length; sd++) {
              var secD = rDva.secoes[sd];
              strDva += "\n*" + secD[0] + ":*\n";
              var itensD = Array.isArray(secD[1]) ? secD[1] : [secD[1]];
              for (var itd = 0; itd < itensD.length; itd++) strDva += "  • " + itensD[itd] + "\n";
            }
          }
          return strDva;
        }
      }
      return "⚠️ *Calculadora DVA: Parâmetros Insuficientes*\n\n" + obterInstrucoesCalculadora("dva");
    }
  }

  // Ajuste Renal de Antimicrobianos
  if (/\b(?:atb|antimicrobiano|vanco|vancomicina|meropenem|mero|pip-?tazo|piperacilina|cefepime?|ceftriaxona?|cipro|ciprofloxacino|polimixina|fluconazol)\b/i.test(t) &&
      /\b(?:ajuste|renal|clcr|crcl|tfg|hd|hemodialise|dialise|clearance|\d+\s*ml\/min)\b/i.test(t)) {
    if (typeof CalculadorasClinicas.calcularAjusteRenalPorTextoLivre === "function") {
      var resAtbDet = CalculadorasClinicas.calcularAjusteRenalPorTextoLivre(texto);
      if (resAtbDet && resAtbDet.ok && resAtbDet.dados) {
        var dDet = resAtbDet.dados;
        return "💉 *AJUSTE RENAL DE ANTIMICROBIANOS (GUIA HSL / IDSA)*\n\n" +
          "• *Fármaco:* " + dDet.nomeExibicao + "\n" +
          "• *Dose Padrão:* " + dDet.dosePadrao + "\n" +
          "• *Dose Ajustada:* `" + dDet.doseAjustada + "`\n" +
          "• *Condições:* " + (dDet.hemodialise ? "Em Hemodiálise" : ("ClCr " + (dDet.clcrInformado !== null ? dDet.clcrInformado + " mL/min" : "não informado"))) + "\n\n" +
          "💡 *Cuidados Farmacológicos:*\n" + dDet.cuidados + "\n\n" +
          "🛡️ *Monitorização:*\n" + dDet.monitorizacao;
      }
    }
  }

  // 1. CKD-EPI 2021
  if (identidade === "ckd") {
    var crCkd = t.match(/\b(?:cr|creatinina)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var idadeCkd = t.match(/\bidade\s*[:=]?\s*(\d+)/i) || t.match(/\b(\d+)\s*anos?\b/i);
    var femCkd = /\b(?:mulher|feminino|fem|f)\b/i.test(t), mascCkd = /\b(?:homem|masculino|masc|m)\b/i.test(t);
    if (!crCkd || !idadeCkd || femCkd === mascCkd) {
      return "⚠️ *Calculadora CKD-EPI 2021: Parâmetros Insuficientes*\n\n" + obterInstrucoesCalculadora("ckd");
    }
    var rCkd = CalculadorasClinicas.ckdEpi2021(Number(crCkd[1].replace(",", ".")), Number(idadeCkd[1]), femCkd);
    return rCkd.ok ? rCkd.textoFormatado : "⚠️ CKD-EPI: " + rCkd.erro;
  }

  // 2. CURB-65
  if (identidade === "curb65") {
    var mIdadeCurb = t.match(/\bidade\s*[:=]?\s*(\d+)/i) || t.match(/\b(\d+)\s*anos?\b/i) || t.match(/\b(\d+)a\b/i);
    var mConfMatch = t.match(/confus[ãa]o(?:\s*mental)?\s*[:=]?\s*(sim|n[aã]o|s|n|1|0|presente|ausente)/i);
    var confCurb = null;
    if (mConfMatch) {
      confCurb = /sim|s|1|presente/i.test(mConfMatch[1]);
    } else {
      var ehConfuso = /\b(?:confus[ao]|desorientad[ao]|rebaixad[ao])\b/i.test(t) && !/\b(?:sem\s+confus[ãa]o|n[aã]o\s+confus[ao]|l[úu]cid[ao]|orientad[ao])\b/i.test(t);
      var ehLucido = /\b(?:l[úu]cid[ao]|orientad[ao]|vigil|sem\s+confus[ãa]o|n[aã]o\s+confus[ao])\b/i.test(t);
      if (ehConfuso) confCurb = true;
      else if (ehLucido) confCurb = false;
    }
    var mUreia = t.match(/\b(?:ureia|ur[eé]ia)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i) || t.match(/\bbun\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mFr = t.match(/\b(?:fr|frequ[êe]ncia\s+respirat[oó]ria|respira[çc][ãa]o)\s*[:=]?\s*(\d+)/i) || t.match(/\b(\d+)\s*(?:irpm|mrpm|rpm)\b/i);
    var mPa = t.match(/\b(?:pa|press[ãa]o(?:\s+arterial)?)\s*[:=]?\s*(\d{2,3})\s*[/xX]\s*(\d{2,3})/i) || t.match(/\b(\d{2,3})\s*[/xX]\s*(\d{2,3})\b/i);
    var mPas = t.match(/\bpas\s*[:=]?\s*(\d{2,3})/i);
    var mPad = t.match(/\bpad\s*[:=]?\s*(\d{2,3})/i);
    var pasVal = null, padVal = null;
    if (mPa) { pasVal = Number(mPa[1]); padVal = Number(mPa[2]); }
    else if (mPas && mPad) { pasVal = Number(mPas[1]); padVal = Number(mPad[1]); }
    if (pasVal && padVal && pasVal <= 30 && padVal <= 20) { pasVal *= 10; padVal *= 10; }

    if (!mIdadeCurb || confCurb === null || !mUreia || !mFr || pasVal === null || padVal === null) {
      return "⚠️ *Calculadora CURB-65: Parâmetros Insuficientes*\n\n" + obterInstrucoesCalculadora("curb65");
    }

    var rCurb = CalculadorasClinicas.curb65(confCurb, Number(mUreia[1].replace(",", ".")), Number(mFr[1]), pasVal, padVal, Number(mIdadeCurb[1]));
    return rCurb.ok ? rCurb.textoFormatado : "⚠️ CURB-65: " + rCurb.erro;
  }

  // 3. Cálcio Corrigido
  if (identidade === "calcio") {
    var mCa = t.match(/(?:c[aá]lcio(?:\s+total)?|ca)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mAlb = t.match(/(?:albumina|alb)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    if (!mCa || !mAlb) {
      return "⚠️ *Calculadora Cálcio Corrigido: Parâmetros Insuficientes*\n\n" + obterInstrucoesCalculadora("calcio");
    }
    var rCa = CalculadorasClinicas.calcioCorrigido(Number(mCa[1].replace(",", ".")), Number(mAlb[1].replace(",", ".")));
    return rCa.ok ? rCa.textoFormatado : "⚠️ Cálcio Corrigido: " + rCa.erro;
  }

  // 4. Gap Osmolar
  if (identidade === "gap_osmolar") {
    var mOsm = t.match(/(?:osmolaridade(?:\s+medida)?|osm(?:\s+medida)?)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mNaOsm = t.match(/(?:s[oó]dio|na)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mGliOsm = t.match(/(?:glicose|glicemia|gli)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mUrOsm = t.match(/(?:ureia|ur[eé]ia)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    if (!mOsm || !mNaOsm || !mGliOsm || !mUrOsm) {
      return "⚠️ *Calculadora Gap Osmolar: Parâmetros Insuficientes*\n\n" + obterInstrucoesCalculadora("gap_osmolar");
    }
    var rGap = CalculadorasClinicas.gapOsmolar(
      Number(mOsm[1].replace(",", ".")),
      Number(mNaOsm[1].replace(",", ".")),
      Number(mGliOsm[1].replace(",", ".")),
      Number(mUrOsm[1].replace(",", "."))
    );
    return rGap.ok ? rGap.textoFormatado : "⚠️ Gap Osmolar: " + rGap.erro;
  }

  // 5. Déficit de Água Livre
  if (identidade === "agua") {
    var mNaAtual = t.match(/(?:s[oó]dio(?:\s+atual)?|na(?:\s+atual)?)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mNaAlvo = t.match(/(?:s[oó]dio\s+alvo|na\s+alvo|alvo)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mPesoAgua = t.match(/(?:peso\s*[:=]?\s*)?(\d+(?:[.,]\d+)?)\s*kg\b/i) || t.match(/peso\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var perfilAgua = "Homem adulto";
    if (/homem\s+idoso|idoso/i.test(t)) perfilAgua = "Homem idoso";
    else if (/mulher\s+idosa|idosa/i.test(t)) perfilAgua = "Mulher idosa";
    else if (/mulher|feminino/i.test(t)) perfilAgua = "Mulher adulta";
    else if (/homem|masculino/i.test(t)) perfilAgua = "Homem adulto";
    else if (/crian[çc]a/i.test(t)) perfilAgua = "Criança";

    if (!mNaAtual || !mPesoAgua) {
      return "⚠️ *Calculadora Déficit de Água Livre: Parâmetros Insuficientes*\n\n" + obterInstrucoesCalculadora("agua");
    }
    var naAt = Number(mNaAtual[1].replace(",", "."));
    var naAl = mNaAlvo ? Number(mNaAlvo[1].replace(",", ".")) : 140;
    var pesoAg = Number(mPesoAgua[1].replace(",", "."));
    var rAgua = CalculadorasClinicas.deficitAguaLivre(naAt, naAl, pesoAg, perfilAgua);
    return rAgua.ok ? rAgua.textoFormatado : "⚠️ Déficit de Água Livre: " + rAgua.erro;
  }

  // 6. Glasgow-P
  if (identidade === "glasgow") {
    var mO = t.match(/(?:abertura\s*ocular|ocular|\bo\b)\s*[:=]?\s*(\d)/i);
    var mV = t.match(/(?:resposta\s*verbal|verbal|\bv\b)\s*[:=]?\s*(\d)/i);
    var mM = t.match(/(?:resposta\s*motora|motora|\bm\b)\s*[:=]?\s*(\d)/i);
    var mP = t.match(/(?:pupilas?(?:\s+n[aã]o\s+reagentes?)?|pupilar?|\bp\b)\s*[:=]?\s*(\d)/i);
    var pupVal = 0;
    if (mP) {
      pupVal = Number(mP[1]);
    } else if (/nenhuma\s+reage|2\s+pupilas/i.test(t)) {
      pupVal = 2;
    } else if (/uma\s+reage|1\s+pupila/i.test(t)) {
      pupVal = 1;
    } else if (/ambas\s+reagem|reagentes|fotorreagentes/i.test(t)) {
      pupVal = 0;
    }

    if (!mO || !mV || !mM) {
      return "⚠️ *Calculadora Glasgow-P: Parâmetros Insuficientes*\n\n" + obterInstrucoesCalculadora("glasgow");
    }
    var rGcs = CalculadorasClinicas.glasgowP(Number(mO[1]), Number(mV[1]), Number(mM[1]), pupVal);
    return rGcs.ok ? rGcs.textoFormatado : "⚠️ Glasgow-P: " + rGcs.erro;
  }

  // 7. KDIGO IRA
  if (identidade === "kdigo") {
    var mCrAt = t.match(/(?:cr(?:eatinina)?\s*atual|cr\s*atual|cr|creatinina)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mCrBs = t.match(/(?:cr(?:eatinina)?\s*basal|basal)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mDu = t.match(/(?:d[eé]bito(?:\s+urin[aá]rio)?|du)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mTempo = t.match(/(?:tempo|horas?|h)\s*[:=]?\s*(\d+)/i);
    if (!mCrAt) {
      return "⚠️ *Calculadora KDIGO: Parâmetros Insuficientes*\n\n" + obterInstrucoesCalculadora("kdigo");
    }
    var crAtVal = Number(mCrAt[1].replace(",", "."));
    var crBsVal = mCrBs ? Number(mCrBs[1].replace(",", ".")) : null;
    var duVal = mDu ? Number(mDu[1].replace(",", ".")) : null;
    var tempoVal = mTempo ? Number(mTempo[1]) : null;
    var rKdigo = CalculadorasClinicas.estadiamentoKDIGO(crAtVal, crBsVal, duVal, tempoVal);
    return rKdigo.ok ? rKdigo.textoFormatado : "⚠️ KDIGO: " + rKdigo.erro;
  }

  // 8. Wells (TEP)
  if (identidade === "wells") {
    var temCriterioWells = /(?:tvp|edema|panturrilha|mais\s+prov[aá]vel|alternativo|fc\s*[:=]?\s*\d+|fc\s*>\s*100|taquicardia|cirurgia|imobiliza|hemoptise|c[aâ]ncer|neoplasia)/i.test(t);
    if (!temCriterioWells) return null;

    function extrairBoolWells(rePos, reNeg) {
      if (reNeg && reNeg.test(t)) return false;
      if (rePos && rePos.test(t)) {
        var m = t.match(rePos);
        if (m) {
          var antes = t.substring(Math.max(0, m.index - 30), m.index);
          if (/\b(?:sem|n[aã]o|nega|aus[êe]ncia)\b/i.test(antes)) return false;
          return true;
        }
      }
      return null;
    }

    var sinaisTvp = extrairBoolWells(/\b(?:sinais|sinais\s+cl[ií]nicos|tvp\s+cl[ií]nica|dor\s+panturrilha|edema\s+assim[eé]trico)\b/i, /\bsem\s+tvp|sem\s+sinais\b/i);
    var diagMaisProv = extrairBoolWells(/\b(?:mais\s+prov[aá]vel|hip[oó]tese\s+principal|diagn[oó]stico\s+principal)\b/i, /\bdiagn[oó]stico\s+alternativo|outro\s+diagn[oó]stico|improv[aá]vel\b/i);
    var mFcWells = t.match(/\bfc\s*[:=]?\s*(\d+)/i) || t.match(/(\d+)\s*bpm/i);
    var fcMaior100 = mFcWells ? (Number(mFcWells[1]) > 100) : extrairBoolWells(/\bfc\s*>\s*100|taquicardia\b/i, /\bfc\s*<\s*100|normoc[aá]rdico\b/i);
    var imobCirurg = extrairBoolWells(/\b(?:imobiliza|acamado|cirurgia(?:\s+recente)?|p[oó]s[- ]op)\b/i, /\bsem\s+cirurgia|sem\s+imobiliza|deambulando\b/i);
    var tepPrevio = extrairBoolWells(/\b(?:tep\s+pr[eé]vio|tvp\s+pr[eé]vi[ao]|hist[oó]rico\s+de\s+tep|hist[oó]rico\s+de\s+tvp)\b/i, /\bsem\s+tep\s+pr[eé]vio|sem\s+tvp\s+pr[eé]via\b/i);
    var hemoptise = extrairBoolWells(/\bhemoptise\b/i, /\bsem\s+hemoptise|nega\s+hemoptise\b/i);
    var cancer = extrairBoolWells(/\b(?:c[aâ]ncer|neoplasia|maligna)\b/i, /\bsem\s+c[aâ]ncer|sem\s+neoplasia\b/i);

    if (sinaisTvp !== null && diagMaisProv !== null && fcMaior100 !== null) {
      var rW = CalculadorasClinicas.wellsTEP(
        !!sinaisTvp,
        !!diagMaisProv,
        !!fcMaior100,
        !!imobCirurg,
        !!tepPrevio,
        !!hemoptise,
        !!cancer
      );
      if (rW && rW.ok) return rW.textoFormatado;
    }
    return "⚠️ *Calculadora Wells (TEP): Parâmetros Insuficientes*\n\n" + obterInstrucoesCalculadora("wells");
  }

  // Não deixar parâmetros de outra calculadora não determinística acionarem heurísticas soltas de clearance.
  if (identidade && LISTA_CALCULADORAS_DETERMINISTICAS.indexOf(identidade) === -1) return null;

  // 9. MELD / MELD-Na (Prioritário para evitar colisão com "cr" de clearance)
  if (/\bmeld\b/i.test(t) && CalculadorasClinicas.meld) {
    var mBili = t.match(/bili(?:rrubina)?\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mInr = t.match(/inr\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mCrM = t.match(/cr(?:eatinina)?\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mNa = t.match(/(?:s[oó]dio|na)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);

    // Diálise: Negação rigorosa antes de qualquer positivo
    var dial = false;
    var temNaoDial = /(?:sem|n[aã]o\s+faz|n[aã]o\s+realiza|n[aã]o\s+est[aá]\s+em|n[aã]o|nunca)\s+(?:hemo)?di[aá]lise|n[aã]o\s+dial[ií]tico/i.test(t);
    if (temNaoDial) {
      dial = false;
    } else if (/(?:com|em|faz|realiza)\s+(?:hemo)?di[aá]lise|dial[ií]tico|\bhemodi[aá]lise\b/i.test(t)) {
      dial = true;
    }

    if (!mBili || !mInr || !mCrM) {
      var faltasMeld = [];
      if (!mBili) faltasMeld.push("Bilirrubina total (mg/dL)");
      if (!mCrM) faltasMeld.push("Creatinina sérica (mg/dL)");
      if (!mInr) faltasMeld.push("INR");
      return "⚠️ *Calculadora MELD / MELD-Na Incompleta*\n\n" +
             "Informe os parâmetros obrigatórios:\n• " + faltasMeld.join("\n• ") + "\n\n" +
             obterInstrucoesCalculadora("meld");
    }

    var bili = parseFloat(mBili[1].replace(",", "."));
    var inr = parseFloat(mInr[1].replace(",", "."));
    var crm = parseFloat(mCrM[1].replace(",", "."));
    var na = (mNa && mNa[1]) ? parseFloat(mNa[1].replace(",", ".")) : null;
    var rm = CalculadorasClinicas.meld(bili, crm, inr, na, dial);
    if (rm && rm.ok) {
      return "🧮 *" + rm.nome + "*\n\n• *Score:* `" + rm.principal + "`\n• *Alerta:* " + (rm.rotulo || "Padrão");
    } else {
      var erroMsg = (rm && rm.erro) ? rm.erro : "Valores laboratoriais inválidos ou fora da faixa plausível.";
      return "⚠️ *Calculadora MELD: Parâmetros Inválidos*\n\n" + erroMsg + "\n\n💡 *Faixas válidas:* Bilirrubina ≥ 1,0 mg/dL, Creatinina ≥ 1,0 mg/dL (máx 4,0), INR ≥ 1,0.";
    }
  }

  // 10. Clearance de Creatinina (Cockcroft-Gault)
  if (identidade === "cockcroft" || (!identidade && /cr(?:eatinina)?\b/i.test(t) && /peso/i.test(t))) {
    var mCr = t.match(/(?:cr(?:eatinina)?|cre)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mPeso = t.match(/(?:peso\s*[:=]?\s*)?(\d+(?:[.,]\d+)?)\s*kg\b/i) || t.match(/peso\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    var mIdade = t.match(/idade\s*[:=]?\s*(\d+)/i) || t.match(/(\d+)\s*a(?:nos)?\b/i);

    var temFem = /fem(?:inino)?|mulher|\bf\b/i.test(t);
    var temMasc = /masc(?:ulino)?|homem|\bm\b/i.test(t);
    if (!temFem && !temMasc) {
      return "⚠️ *Clearance de Creatinina (Cockcroft-Gault)*\n\n" + obterInstrucoesCalculadora("cockcroft");
    }
    var ehMulher = temFem && !temMasc;

    if (!mCr || !mPeso || !mIdade) {
      return "⚠️ *Clearance de Creatinina Incompleto*\n\n" + obterInstrucoesCalculadora("cockcroft");
    }

    if (CalculadorasClinicas.cockcroftGault) {
      var cr = parseFloat(mCr[1].replace(",", "."));
      var peso = parseFloat(mPeso[1].replace(",", "."));
      var idade = parseInt(mIdade[1], 10);
      var r = CalculadorasClinicas.cockcroftGault(cr, peso, idade, ehMulher);
      if (r && r.ok) {
        var str = "🧮 *" + (r.nome || "CLEARANCE DE CREATININA (COCKCROFT-GAULT)") + "*\n\n";
        str += "• *Resultado:* `" + r.principal + "`\n";
        if (r.rotulo) str += "• *Alerta:* " + r.rotulo + "\n";
        if (r.secoes) {
          for (var s = 0; s < r.secoes.length; s++) {
            var sec = r.secoes[s];
            str += "\n*" + sec[0] + ":*\n";
            var itens = Array.isArray(sec[1]) ? sec[1] : [sec[1]];
            for (var it = 0; it < itens.length; it++) {
              str += "  • " + itens[it] + "\n";
            }
          }
        }
        return str;
      } else {
        var erroCg = (r && r.erro) ? r.erro : "Valores laboratoriais ou antropométricos fora dos limites biológicos plausíveis.";
        return "⚠️ *Calculadora Clearance: Parâmetros Inválidos*\n\n" + erroCg + "\n\n💡 *Faixas válidas:* Creatinina ≥ 0,1 mg/dL, Peso ≥ 20 kg, Idade ≥ 18 anos.";
      }
    }
  }

  // 11. HAS-BLED Determinístico
  if (/\bhas-?bled\b/i.test(t) && CalculadorasClinicas.hasbled) {
    var semFatoresBled = /\b(?:sem\s+comorbidades?|sem\s+fatores?|sem\s+antecedentes?|h[íi]gid[ao]|previamente\s+h[íi]gid[ao])\b/i.test(t);

    var mIdadeB = t.match(/(\d+)\s*a(?:nos)?\b/) || t.match(/idade\s*[:=]?\s*(\d+)/i);
    var idadeB = mIdadeB ? parseInt(mIdadeB[1], 10) : null;
    var eBled = idadeB !== null ? (idadeB > 65) : (/\b(?:idos[ao]|> ?65)\b/i.test(t) ? true : (semFatoresBled ? false : null));

    function extrairFatorBled(rePos, reNeg) {
      if (reNeg && reNeg.test(t)) return false;
      if (rePos && rePos.test(t)) {
        var m = t.match(rePos);
        if (m) {
          var antes = t.substring(Math.max(0, m.index - 30), m.index);
          if (/\b(?:sem|n[aã]o|nega|aus[êe]ncia\s+de)\b/i.test(antes)) return false;
          return true;
        }
      }
      return semFatoresBled ? false : null;
    }

    var hBled = extrairFatorBled(/\b(?:has|hipertens[aã]o|pas\s*>|press[aã]o\s+alta)\b/i, /\bnormotens[ao]|has\s+controlada\b/i);
    var aRenalBled = extrairFatorBled(/\b(?:renal|di[aá]lise|transplante\s+renal|cr\s*>\s*2[.,]2|creatinina\s*>\s*2[.,]2)\b/i, /\bsem\s+doen[çc]a\s+renal|cr\s+(?:normal|1[.,]\d|0[.,]\d)\b/i);
    var aHepaticoBled = extrairFatorBled(/\b(?:hep[aá]tic[ao]|cirrose|bilirrubina\s*>\s*2|ast\s*>\s*3|alt\s*>\s*3)\b/i, /\bsem\s+(?:doen[çc]a\s+)?hep[aá]tica\b/i);
    var sBled = extrairFatorBled(/\b(?:avc|ait|stroke)\b/i, /\bsem\s+avc\b/i);
    var bBled = extrairFatorBled(/\b(?:sangramento|hemorragia|anemia\s+grave)\b/i, /\bsem\s+sangramento\b/i);
    var lBled = extrairFatorBled(/\b(?:inr\s+l[aá]bil|rni\s+l[aá]bil)\b/i, /\bsem\s+inr\s+l[aá]bil|inr\s+est[aá]vel\b/i);
    var dDrogasBled = extrairFatorBled(/\b(?:aas|aspirina|clopidogrel|aine|antiplaquet[aá]rio)\b/i, /\bsem\s+(?:aas|aine|antiplaquet[aá]rio)\b/i);
    var dAlcoolBled = extrairFatorBled(/\b(?:[aá]lcool|etilismo|bebida\s+alco[oó]lica)\b/i, /\bsem\s+[aá]lcool|n[aã]o\s+bebe|abstemio|social\b/i);

    if (hBled !== null && aRenalBled !== null && aHepaticoBled !== null && sBled !== null &&
        bBled !== null && lBled !== null && eBled !== null && dDrogasBled !== null && dAlcoolBled !== null) {
      var rBled = CalculadorasClinicas.hasbled(hBled, aRenalBled, aHepaticoBled, sBled, bBled, lBled, eBled, dDrogasBled, dAlcoolBled);
      if (rBled && rBled.ok) {
        var strBled = "🧮 *" + rBled.nome + "*\n\n";
        strBled += "• *Pontuação:* `" + rBled.principal + "`\n";
        strBled += "• *Classificação:* " + (rBled.rotulo || rBled.estado || "Calculado") + "\n\n";
        if (rBled.secoes) {
          for (var scB = 0; scB < rBled.secoes.length; scB++) {
            var secB = rBled.secoes[scB];
            strBled += "\n*" + secB[0] + ":*\n";
            var itensB = Array.isArray(secB[1]) ? secB[1] : [secB[1]];
            for (var itB = 0; itB < itensB.length; itB++) strBled += "  • " + itensB[itB] + "\n";
          }
        }
        return strBled;
      }
    }

    var instrucoesHasbled = obterInstrucoesCalculadora("HAS-BLED");
    return "⚠️ *Calculadora HAS-BLED: Parâmetros Insuficientes ou Inválidos*\n\n" + instrucoesHasbled;
  }

  // 12. CHA2DS2-VASc Determinístico
  if (/cha2?ds2|vasc/i.test(t) && CalculadorasClinicas.cha2ds2vasc) {
    var temFemC = /\b(?:mulher|fem(?:inino)?|f)\b/i.test(t);
    var temMascC = /\b(?:homem|masc(?:ulino)?|m)\b/i.test(t);
    var mIdadeC = t.match(/(\d+)\s*a(?:nos)?\b/) || t.match(/idade\s*[:=]?\s*(\d+)/i);
    var idadeC = mIdadeC ? parseInt(mIdadeC[1], 10) : null;

    if (idadeC === null || (!temFemC && !temMascC)) {
      return "⚠️ *Calculadora CHA₂DS₂-VASc (Risco Tromboembólico na FA)*\n\n" + obterInstrucoesCalculadora("cha2ds2vasc");
    }

    var temFatoresDesconhecidos = /(?:antecedentes?|fatores?|comorbidades?|hist[oó]rico|doen[çc]as?)\s+(?:desconhecid[ao]s?|n[aã]o\s+informad[ao]s?|incert[ao]s?|d[uú]vidos[ao]s?|ignorad[ao]s?)|n[aã]o\s+sabe\s+(?:antecedentes|comorbidades|hist[oó]rico|fatores)|hist[oó]rico\s+desconhecido|sem\s+informa[çc][ãa]o\s+de\s+(?:antecedentes|comorbidades|fatores)|\bdesconhecid[ao]s?\b/i.test(t);
    if (temFatoresDesconhecidos) {
      return "⚠️ *Calculadora CHA₂DS₂-VASc: Antecedentes Desconhecidos*\n\n" +
             "Não é seguro calcular o escore com comorbidades desconhecidas para prevenção de AVC.\n\n" +
             obterInstrucoesCalculadora("cha2ds2vasc");
    }

    var temMencaoFatores = /(?:ic|insufici[êe]ncia|has|hipertens|dm|diab[eé]t|avc|ait|stroke|trombo|vascular|iam|infarto|daop|coronario|comorbidade|fator|antecedente|h[íi]gid[ao]|doen[çc]a)/i.test(t);
    if (!temMencaoFatores) {
      return "⚠️ *Calculadora CHA₂DS₂-VASc (Risco Tromboembólico na FA)*\n\n" + obterInstrucoesCalculadora("cha2ds2vasc");
    }

    var ehMulherC = temFemC && !temMascC;
    var i75C = (idadeC >= 75);
    var i65C = (idadeC >= 65 && idadeC < 75);

    var semComorbidadesGeral = /\b(?:sem\s+(?:outras\s+)?comorbidades?|sem\s+(?:outros\s+)?fatores?|sem\s+(?:outros\s+)?antecedentes?|h[íi]gid[ao]|previamente\s+h[íi]gid[ao]|nega\s+comorbidades?|sem\s+doen[çc]as?)\b/i.test(t);

    var defFatores = {
      has: {
        re: /\b(?:has|hipertens[aã]o|hipertenso|hipertensa|press[aã]o\s+alta|pa\s*(?:elevada|>))\b/i,
        reAutoNeg: /\bnormotens[ao]\b/i,
        nome: "HAS (Hipertensão)"
      },
      ic: {
        re: /\b(?:ic|icc|insufici[êe]ncia\s+card[íi]aca|disfun[çc][ãa]o\s+(?:de\s+)?ve)\b/i,
        nome: "IC (Insuficiência Cardíaca)"
      },
      dm: {
        re: /\b(?:dm|dm[12]|diabetes|diab[eé]tic[ao]|glicemia\s+alta)\b/i,
        nome: "DM (Diabetes Mellitus)"
      },
      avc: {
        re: /\b(?:avc|ait|stroke|tromboembolismo|embolia|isquemia\s+cerebral|ave)\b/i,
        nome: "AVC/AIT prévio"
      },
      vasc: {
        re: /\b(?:vascular|doen[çc]a\s+vascular|iam|infarto|daop|placa\s+a[oó]rtica|coronariopatia|doen[çc]a\s+coronariana|dac)\b/i,
        nome: "Doença Vascular (IAM, DAOP)"
      }
    };

    var estados = {
      has: semComorbidadesGeral ? "ausente" : "desconhecido",
      ic: semComorbidadesGeral ? "ausente" : "desconhecido",
      dm: semComorbidadesGeral ? "ausente" : "desconhecido",
      avc: semComorbidadesGeral ? "ausente" : "desconhecido",
      vasc: semComorbidadesGeral ? "ausente" : "desconhecido"
    };

    for (var fKey in defFatores) {
      var fDef = defFatores[fKey];
      if (fDef.reAutoNeg && fDef.reAutoNeg.test(t)) {
        estados[fKey] = "ausente";
        continue;
      }

      var regexBusca = new RegExp(fDef.re.source, "gi");
      var match;
      while ((match = regexBusca.exec(t)) !== null) {
        var pos = match.index;
        var trechoAntes = t.substring(0, pos).split(/[.;\n]/).pop();
        var operadores = /\b(?:n[aã]o\s+(?:tem|apresenta|possui)|sem|n[aã]o|nega|aus[êe]ncia\s+de|livre\s+de|tem|apresenta|possui|com|portador[ae]?\s+de|mas|por[eé]m|contudo|todavia|entretanto|exceto|salvo)\b/gi;
        var op, negado = false;
        while ((op = operadores.exec(trechoAntes)) !== null) {
          negado = /^(?:sem|n[aã]o|nega|aus[êe]ncia|livre)/i.test(op[0]);
        }
        estados[fKey] = negado ? "ausente" : "presente";
      }
    }

    var hasC = (estados.has === "presente");
    var icC = (estados.ic === "presente");
    var dmC = (estados.dm === "presente");
    var avcC = (estados.avc === "presente");
    var vascC = (estados.vasc === "presente");

    var rCha = CalculadorasClinicas.cha2ds2vasc(icC, hasC, i75C, dmC, avcC, vascC, i65C, ehMulherC);

    var faltantes = [];
    for (var kF in defFatores) {
      if (estados[kF] === "desconhecido") {
        faltantes.push(defFatores[kF].nome);
      }
    }

    if (faltantes.length > 0) {
      return "⚠️ *Calculadora CHA₂DS₂-VASc: Fatores Incompletos*\n\n" +
             "Informe a presença ou ausência dos fatores não declarados:\n" +
             "• " + faltantes.join("\n• ") + "\n\n" +
             obterInstrucoesCalculadora("cha2ds2vasc");
    }

    if (rCha && rCha.ok) {
      var strCha = "🧮 *" + rCha.nome + "*\n\n";
      strCha += "• *Pontuação:* `" + rCha.principal + "`\n";
      strCha += "• *Classificação:* " + (rCha.rotulo || rCha.estado || "Calculado") + "\n\n";
      strCha += "📋 *Recomendação:* " + (rCha.recomendacao || rCha.rotulo || rCha.estado) + "\n";
      if (rCha.secoes) {
        for (var sc = 0; sc < rCha.secoes.length; sc++) {
          var secC = rCha.secoes[sc];
          strCha += "\n*" + secC[0] + ":*\n";
          var itensC = Array.isArray(secC[1]) ? secC[1] : [secC[1]];
          for (var itc = 0; itc < itensC.length; itc++) strCha += "  • " + itensC[itc] + "\n";
        }
      }
      return strCha;
    }
  }

  return null;
}

function obterInstrucoesCalculadora(tipo) {
  var t = (tipo || "").toUpperCase().replace(/[\-_]/g, " ");

  if (t.indexOf("CURB") !== -1) {
    return "📐 *CALCULADORA: CURB-65 (Gravidade na PAC)*\n\n" +
      "Dados estritamente necessários para o cálculo:\n" +
      "• Confusão mental aguda (sim/não)\n" +
      "• Ureia sérica (mg/dL) ou BUN\n" +
      "• Frequência respiratória (irpm)\n" +
      "• Pressão arterial (PAS e PAD em mmHg)\n" +
      "• Idade (anos)\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc curb65\n" +
      "Idade: [ ] anos\n" +
      "Confusão mental: [sim/não]\n" +
      "Ureia: [ ] mg/dL\n" +
      "FR: [ ] irpm\n" +
      "PA: [ ]x[ ] mmHg\n" +
      "```\n" +
      "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
  }

  if (t.indexOf("COCKCROFT") !== -1 || t.indexOf("CLEARANCE") !== -1 || t.indexOf("CLCR") !== -1) {
    return "📐 *CALCULADORA: Cockcroft-Gault (Clearance de Creatinina)*\n\n" +
      "Dados estritamente necessários para o cálculo:\n" +
      "• Idade (anos)\n" +
      "• Sexo biológico (Masculino / Feminino)\n" +
      "• Creatinina sérica (mg/dL)\n" +
      "• Peso corporal (kg)\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc cockcroft\n" +
      "Idade: [ ] anos\n" +
      "Sexo biológico: [M/F]\n" +
      "Creatinina: [ ] mg/dL\n" +
      "Peso: [ ] kg\n" +
      "```\n" +
      "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
  }

  if (t.indexOf("CKD") !== -1 && t.indexOf("COCKCROFT") === -1 && t.indexOf("CLEARANCE") === -1) {
    return "📐 *CALCULADORA: CKD-EPI 2021 (Taxa de Filtração Glomerular)*\n\n" +
      "Dados estritamente necessários para o cálculo (sem raça e sem peso):\n" +
      "• Idade (anos)\n" +
      "• Sexo biológico (Masculino / Feminino)\n" +
      "• Creatinina sérica (mg/dL)\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc ckd\n" +
      "Idade: [ ] anos\n" +
      "Sexo biológico: [M/F]\n" +
      "Creatinina: [ ] mg/dL\n" +
      "```\n" +
      "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
  }

  // Caso seja seleção mista do menu legado (CKD-EPI / Cockcroft)
  if (t.indexOf("CKD") !== -1 || t.indexOf("RENAL") !== -1 || t.indexOf("TFG") !== -1) {
    return "📐 *CALCULADORA: FUNÇÃO RENAL (CKD-EPI & Cockcroft-Gault)*\n\n" +
      "Escolha a equação desejada e copie a caixa correspondente:\n\n" +
      "🔹 *1. CKD-EPI 2021 (TFG - Estadiamento de DRC)*\n" +
      "```\n" +
      "/calc ckd\n" +
      "Idade: [ ] anos\n" +
      "Sexo biológico: [M/F]\n" +
      "Creatinina: [ ] mg/dL\n" +
      "```\n\n" +
      "🔹 *2. Cockcroft-Gault (ClCr - Ajuste Posológico)*\n" +
      "```\n" +
      "/calc cockcroft\n" +
      "Idade: [ ] anos\n" +
      "Sexo biológico: [M/F]\n" +
      "Creatinina: [ ] mg/dL\n" +
      "Peso: [ ] kg\n" +
      "```\n" +
      "*(Toque na caixa desejada para copiar, preencha os valores e envie)*";
  }

  if (t.indexOf("PARKLAND") !== -1 || t.indexOf("QUEIMAD") !== -1) {
    return "📐 *CALCULADORA: FÓRMULA DE PARKLAND (QUEIMADURAS)*\n\n" +
      "Dados estritamente necessários para o cálculo:\n" +
      "• Peso corporal (kg)\n" +
      "• Superfície Corpórea Queimada - SCQ (% de 2º e 3º graus)\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc parkland\n" +
      "Peso: [ ] kg\n" +
      "SCQ: [ ] %\n" +
      "```\n" +
      "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
  }

  if (t.indexOf("DVA") !== -1 || t.indexOf("VASOATIV") !== -1 || t.indexOf("NORA") !== -1 || t.indexOf("DOBUTA") !== -1 || t.indexOf("VASO") !== -1) {
    return "📐 *CALCULADORA: DROGAS VASOATIVAS (INFUSÃO NA BIC)*\n\n" +
      "Dados estritamente necessários para o cálculo:\n" +
      "• Fármaco (noradrenalina, dobutamina, vasopressina, nitroprussiato, nitroglicerina)\n" +
      "• Peso corporal (kg)\n" +
      "• Solução (padrao ou concentrada - opcional)\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc dva\n" +
      "Droga: [nora/dobuta/vaso]\n" +
      "Peso: [ ] kg\n" +
      "Solução: [padrao/concentrada]\n" +
      "```\n" +
      "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
  }

  if (t.indexOf("WELLS") !== -1 || t.indexOf("TEP") !== -1 || t.indexOf("TVP") !== -1) {
    var ehTvp = t.indexOf("TVP") !== -1 && t.indexOf("TEP") === -1;
    if (ehTvp) {
      return "📐 *CALCULADORA: ESCORE DE WELLS PARA TVP*\n\n" +
        "Dados estritamente necessários para o cálculo:\n" +
        "• Fatores clínicos e de exame físico do membro inferior.\n\n" +
        "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
        "```\n" +
        "/calc wellstvp\n" +
        "Câncer ativo: [sim/não]\n" +
        "Paralisia ou gesso recente: [sim/não]\n" +
        "Acamado ≥ 3 dias ou cirurgia recente: [sim/não]\n" +
        "Dor trajeto venoso profundo: [sim/não]\n" +
        "Edema de toda a perna: [sim/não]\n" +
        "Panturrilha assimétrica (> 3 cm): [sim/não]\n" +
        "Edema com cacifo unilateral: [sim/não]\n" +
        "Veias colaterais visíveis: [sim/não]\n" +
        "TVP prévia documentada: [sim/não]\n" +
        "Diagnóstico alternativo tão provável: [sim/não]\n" +
        "```\n" +
        "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
    }
    return "📐 *CALCULADORA: ESCORE DE WELLS PARA TEP*\n\n" +
      "Dados estritamente necessários para o cálculo:\n" +
      "• Avaliação clínica direta de risco tromboembólico pulmonar.\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc wellstep\n" +
      "Sinais clínicos de TVP: [sim/não]\n" +
      "TEP hipótese mais provável: [sim/não]\n" +
      "FC > 100 bpm: [sim/não]\n" +
      "Imobilização ≥ 3d ou cirurgia recente: [sim/não]\n" +
      "Histórico prévio de TVP ou TEP: [sim/não]\n" +
      "Hemoptise: [sim/não]\n" +
      "Câncer ativo: [sim/não]\n" +
      "```\n" +
      "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
  }

  if (t.indexOf("CHA2") !== -1 || t.indexOf("VAS") !== -1) {
    return "📐 *CALCULADORA: CHA₂DS₂-VASc (Risco Tromboembólico na FA)*\n\n" +
      "Dados estritamente necessários para o cálculo:\n" +
      "• Idade (anos)\n" +
      "• Sexo biológico (Masculino / Feminino)\n" +
      "• Fatores de risco tromboembólico (IC, HAS, DM, AVC, Vascular)\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc cha2ds2vasc\n" +
      "Idade: [ ] anos\n" +
      "Sexo biológico: [M/F]\n" +
      "Insuficiência Cardíaca (IC): [sim/não]\n" +
      "Hipertensão (HAS): [sim/não]\n" +
      "Diabetes (DM): [sim/não]\n" +
      "AVC ou AIT prévio: [sim/não]\n" +
      "Doença Vascular (IAM/DAOP): [sim/não]\n" +
      "```\n" +
      "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
  }

  if (t.indexOf("BLED") !== -1) {
    return "📐 *CALCULADORA: HAS-BLED (Risco de Sangramento na Anticoagulação)*\n\n" +
      "Dados estritamente necessários para o cálculo:\n" +
      "• Idade (anos)\n" +
      "• Presença ou ausência dos fatores de sangramento\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc hasbled\n" +
      "Idade: [ ] anos\n" +
      "Hipertensão não controlada (PAS > 160): [sim/não]\n" +
      "Doença Renal grave (diálise ou Cr > 2.26): [sim/não]\n" +
      "Doença Hepática crônica (cirrose ou Bilirrubina > 2x): [sim/não]\n" +
      "Histórico de AVC: [sim/não]\n" +
      "Histórico de sangramento maior: [sim/não]\n" +
      "INR lábil (se usa varfarina): [sim/não]\n" +
      "Uso de AAS, clopidogrel ou AINE: [sim/não]\n" +
      "Consumo excessivo de álcool: [sim/não]\n" +
      "```\n" +
      "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
  }

  if (t.indexOf("MELD") !== -1) {
    return "📐 *CALCULADORA: MELD & MELD-Na (Gravidade na Hepatopatia)*\n\n" +
      "Dados estritamente necessários para o cálculo:\n" +
      "• Bilirrubina total (mg/dL)\n" +
      "• Creatinina sérica (mg/dL)\n" +
      "• INR\n" +
      "• Sódio sérico (mEq/L - para MELD-Na)\n" +
      "• Diálise na última semana (sim/não)\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc meld\n" +
      "Bilirrubina total: [ ] mg/dL\n" +
      "Creatinina: [ ] mg/dL\n" +
      "INR: [ ]\n" +
      "Sódio: [ ] mEq/L\n" +
      "Diálise na última semana: [sim/não]\n" +
      "```\n" +
      "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
  }

  if (t.indexOf("CHILD") !== -1) {
    return "📐 *CALCULADORA: Escore de Child-Pugh (Cirrose Hepática)*\n\n" +
      "Dados estritamente necessários para o cálculo:\n" +
      "• Bilirrubina total (mg/dL)\n" +
      "• Albumina sérica (g/dL)\n" +
      "• INR\n" +
      "• Ascite (ausente / leve / moderada)\n" +
      "• Encefalopatia (ausente / grau 1-2 / grau 3-4)\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc child\n" +
      "Bilirrubina total: [ ] mg/dL\n" +
      "Albumina: [ ] g/dL\n" +
      "INR: [ ]\n" +
      "Ascite: [ausente / leve / moderada]\n" +
      "Encefalopatia: [ausente / grau 1-2 / grau 3-4]\n" +
      "```\n" +
      "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
  }

  if (t.indexOf("GLASGOW") !== -1 || t.indexOf("GCS") !== -1) {
    return "📐 *CALCULADORA: Escala de Coma de Glasgow com Pupilas (Glasgow-P)*\n\n" +
      "Dados estritamente necessários para o cálculo:\n" +
      "• Abertura ocular (1 a 4)\n" +
      "• Resposta verbal (1 a 5)\n" +
      "• Resposta motora (1 a 6)\n" +
      "• Reatividade pupilar (0, 1 ou 2 pupilas não reagentes)\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc glasgow\n" +
      "Abertura ocular (1-4): [ ]\n" +
      "Resposta verbal (1-5): [ ]\n" +
      "Resposta motora (1-6): [ ]\n" +
      "Pupilas não reagentes (0, 1 ou 2): [ ]\n" +
      "```\n" +
      "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
  }

  if (t.indexOf("CALCIO") !== -1) {
    return "📐 *CALCULADORA: Cálcio Corrigido pela Albumina*\n\n" +
      "Dados estritamente necessários para o cálculo:\n" +
      "• Cálcio total sérico (mg/dL)\n" +
      "• Albumina sérica (g/dL)\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc calcio\n" +
      "Cálcio total: [ ] mg/dL\n" +
      "Albumina: [ ] g/dL\n" +
      "```\n" +
      "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
  }

  if (t.indexOf("GAP") !== -1 || t.indexOf("OSMOLAR") !== -1 || t.indexOf("OSMOLAL") !== -1) {
    return "📐 *CALCULADORA: Gap Osmolar Plasmático*\n\n" +
      "Dados estritamente necessários para o cálculo:\n" +
      "• Osmolaridade sérica medida (mOsm/kg)\n" +
      "• Sódio sérico (mEq/L)\n" +
      "• Glicose sérica (mg/dL)\n" +
      "• Ureia sérica (mg/dL)\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc gap osmolar\n" +
      "Osmolaridade medida: [ ] mOsm/kg\n" +
      "Sódio: [ ] mEq/L\n" +
      "Glicose: [ ] mg/dL\n" +
      "Ureia: [ ] mg/dL\n" +
      "```\n" +
      "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
  }

  if (t.indexOf("AGUA") !== -1 || t.indexOf("DEFICIT") !== -1 || t.indexOf("HIPERNATREMIA") !== -1) {
    return "📐 *CALCULADORA: Déficit de Água Livre (Hipernatremia)*\n\n" +
      "Dados estritamente necessários para o cálculo:\n" +
      "• Sódio sérico atual (mEq/L)\n" +
      "• Sódio alvo (mEq/L - padrão 140)\n" +
      "• Peso corporal (kg)\n" +
      "• Perfil do paciente (homem jovem / homem idoso / mulher jovem / mulher idosa)\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc deficit agua\n" +
      "Sódio atual: [ ] mEq/L\n" +
      "Sódio alvo: [ 140 ] mEq/L\n" +
      "Peso: [ ] kg\n" +
      "Perfil: [homem jovem / homem idoso / mulher jovem / mulher idosa]\n" +
      "```\n" +
      "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
  }

  if (t.indexOf("KDIGO") !== -1 || t.indexOf("IRA") !== -1) {
    return "📐 *CALCULADORA: KDIGO (Estadiamento de Injúria Renal Aguda)*\n\n" +
      "Dados estritamente necessários para o cálculo:\n" +
      "• Creatinina sérica atual (mg/dL)\n" +
      "• Creatinina sérica basal (mg/dL)\n" +
      "• Débito urinário em mL/kg/h (opcional)\n" +
      "• Duração da oligúria em horas (opcional)\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc kdigo\n" +
      "Creatinina atual: [ ] mg/dL\n" +
      "Creatinina basal: [ ] mg/dL\n" +
      "Débito urinário (opcional): [ ] mL/kg/h\n" +
      "Tempo em horas (opcional): [ ] h\n" +
      "```\n" +
      "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
  }

  if (t.indexOf("LDL") !== -1 || t.indexOf("MARTIN") !== -1 || t.indexOf("HOPKINS") !== -1) {
    return "📐 *CALCULADORA: LDL Martin-Hopkins / Friedewald*\n\n" +
      "Dados estritamente necessários para o cálculo:\n" +
      "• Colesterol Total (mg/dL)\n" +
      "• HDL-colesterol (mg/dL)\n" +
      "• Triglicerídeos (mg/dL)\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc ldl\n" +
      "Colesterol total: [ ] mg/dL\n" +
      "HDL: [ ] mg/dL\n" +
      "Triglicerídeos: [ ] mg/dL\n" +
      "```\n" +
      "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
  }

  if (t.indexOf("SOFA") !== -1) {
    return "📐 *CALCULADORA: qSOFA (Rastreio de Sepse à Beira do Leito)*\n\n" +
      "Dados estritamente necessários para o cálculo:\n" +
      "• Glasgow < 15 (sim/não)\n" +
      "• Pressão Arterial Sistólica ≤ 100 mmHg (sim/não)\n" +
      "• Frequência Respiratória ≥ 22 irpm (sim/não)\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc qsofa\n" +
      "Glasgow < 15: [sim/não]\n" +
      "PAS ≤ 100 mmHg: [sim/não]\n" +
      "FR ≥ 22 irpm: [sim/não]\n" +
      "```\n" +
      "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
  }

  if (t.indexOf("HEART") !== -1 || t.indexOf("TIMI") !== -1) {
    return "📐 *CALCULADORA: HEART SCORE (Dor Torácica / SCA)*\n\n" +
      "Dados estritamente necessários para o cálculo:\n" +
      "• História (pouco suspeita / moderada / altamente suspeita)\n" +
      "• ECG (normal / inespecífico / desvio de ST significativo)\n" +
      "• Idade (anos)\n" +
      "• Fatores de risco (HAS, DM, fumo, DLP, IMC>30, HF precoce) - informar quantidade\n" +
      "• Troponina (normal / 1-3x limite / >3x limite)\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc heart\n" +
      "História: [pouco suspeita / moderada / altamente suspeita]\n" +
      "ECG: [normal / inespecífico / desvio de ST significativo]\n" +
      "Idade: [ ] anos\n" +
      "Fatores de risco: [ ] fatores\n" +
      "Troponina: [normal / 1 a 3x limite / > 3x limite]\n" +
      "```\n" +
      "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
  }

  if (t.indexOf("GRACE") !== -1) {
    return "📐 *CALCULADORA: GRACE SCORE (Síndrome Coronariana Aguda)*\n\n" +
      "Dados estritamente necessários para o cálculo:\n" +
      "• Idade (anos), FC (bpm), PAS (mmHg), Creatinina (mg/dL)\n" +
      "• Classe Killip (I, II, III, IV)\n" +
      "• PCR na admissão? Desvio de ST? Marcadores miocárdicos elevados?\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc grace\n" +
      "Idade: [ ] anos\n" +
      "FC: [ ] bpm\n" +
      "PAS: [ ] mmHg\n" +
      "Creatinina: [ ] mg/dL\n" +
      "Killip (I, II, III, IV): [ ]\n" +
      "Parada cardíaca na admissão: [sim/não]\n" +
      "Desvio de ST: [sim/não]\n" +
      "Marcadores miocárdicos elevados: [sim/não]\n" +
      "```\n" +
      "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
  }

  if (t.indexOf("NIHSS") !== -1) {
    return "📐 *CALCULADORA: NIHSS (Escala de AVC Isquêmico)*\n\n" +
      "Dados estritamente necessários para o cálculo:\n" +
      "• Nível de consciência, paresia facial, força em 4 membros, linguagem, disartria.\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc nihss\n" +
      "Nível de consciência: [alerta / sonolento / torporoso / coma]\n" +
      "Paresia facial: [normal / leve / evidente / total]\n" +
      "Força MSD: [normal / queda leve / esforço contra gravidade / sem movimento]\n" +
      "Força MSE: [normal / queda leve / esforço contra gravidade / sem movimento]\n" +
      "Força MID: [normal / queda leve / esforço contra gravidade / sem movimento]\n" +
      "Força MIE: [normal / queda leve / esforço contra gravidade / sem movimento]\n" +
      "Linguagem / afasia: [normal / leve / grave / mutismo]\n" +
      "Disartria: [normal / leve / grave]\n" +
      "```\n" +
      "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
  }

  if (t.indexOf("RANSON") !== -1 || t.indexOf("BISAP") !== -1) {
    return "📐 *CALCULADORA: BISAP (Gravidade na Pancreatite Aguda)*\n\n" +
      "Dados estritamente necessários para o cálculo:\n" +
      "• Ureia > 50 mg/dL (ou BUN > 25) (sim/não)\n" +
      "• Glasgow < 15 (alteração mental) (sim/não)\n" +
      "• SIRS presente (≥ 2 critérios vitais) (sim/não)\n" +
      "• Idade > 60 anos (sim/não)\n" +
      "• Derrame pleural (sim/não)\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc bisap\n" +
      "Ureia > 50 mg/dL: [sim/não]\n" +
      "Glasgow < 15: [sim/não]\n" +
      "SIRS (≥ 2 critérios vitais): [sim/não]\n" +
      "Idade > 60 anos: [sim/não]\n" +
      "Derrame pleural: [sim/não]\n" +
      "```\n" +
      "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
  }

  if (t.indexOf("FRAMINGHAM") !== -1) {
    return "📐 *CALCULADORA: RISCO CARDIOVASCULAR DE FRAMINGHAM*\n\n" +
      "Dados estritamente necessários para o cálculo:\n" +
      "• Idade (anos), Sexo biológico (M/F)\n" +
      "• Colesterol Total (mg/dL), HDL (mg/dL), PAS (mmHg)\n" +
      "• Tratamento de HAS (sim/não), Tabagismo (sim/não), Diabetes (sim/não)\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc framingham\n" +
      "Idade: [ ] anos\n" +
      "Sexo biológico: [M/F]\n" +
      "Colesterol total: [ ] mg/dL\n" +
      "HDL: [ ] mg/dL\n" +
      "PAS: [ ] mmHg\n" +
      "Tratamento para HAS: [sim/não]\n" +
      "Tabagismo atual: [sim/não]\n" +
      "Diabetes: [sim/não]\n" +
      "```\n" +
      "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
  }

  if (t.indexOf("FRAX") !== -1) {
    return "📐 *CALCULADORA: FRAX (Risco de Fratura Osteoporótica)*\n\n" +
      "Dados estritamente necessários para o cálculo:\n" +
      "• Idade (anos), Sexo (M/F), Peso (kg), Altura (cm)\n" +
      "• Fratura prévia, fratura pais, fumo, corticoide, artrite, osteoporose 2ª, álcool, DMO colo\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc frax\n" +
      "Idade: [ ] anos\n" +
      "Sexo biológico: [M/F]\n" +
      "Peso: [ ] kg\n" +
      "Altura: [ ] cm\n" +
      "Fratura prévia: [sim/não]\n" +
      "Pais com fratura de quadril: [sim/não]\n" +
      "Tabagismo atual: [sim/não]\n" +
      "Uso de corticoide: [sim/não]\n" +
      "Artrite reumatoide: [sim/não]\n" +
      "Osteoporose secundária: [sim/não]\n" +
      "Álcool ≥ 3 doses/dia: [sim/não]\n" +
      "T-score colo fêmur (opcional): [ ]\n" +
      "```\n" +
      "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
  }

  if (t.indexOf("APACHE") !== -1) {
    return "📐 *CALCULADORA: APACHE II (Terapia Intensiva)*\n\n" +
      "Dados estritamente necessários para o cálculo:\n" +
      "• Idade, Temperatura, PAM, FC, FR, PaO2/AaDO2, pH, Na, K, Cr, Ht, Leucócitos, Glasgow, insuficiência crônica, admissão.\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc apache\n" +
      "Idade: [ ] anos\n" +
      "Temperatura: [ ] °C\n" +
      "PAM: [ ] mmHg\n" +
      "FC: [ ] bpm\n" +
      "FR: [ ] irpm\n" +
      "PaO2: [ ] mmHg\n" +
      "pH: [ ]\n" +
      "Sódio: [ ] mEq/L\n" +
      "Potássio: [ ] mEq/L\n" +
      "Creatinina: [ ] mg/dL\n" +
      "Hematócrito: [ ] %\n" +
      "Leucócitos: [ ] /mm³\n" +
      "Glasgow: [ ]\n" +
      "Insuficiência orgânica crônica: [sim/não]\n" +
      "Tipo de admissão: [clínica / urgência / eletiva]\n" +
      "```\n" +
      "*(Toque na caixa acima para copiar, preencha os valores entre colchetes e envie)*";
  }

  // Fallback geral sem dados genéricos:
  return "📐 *CALCULADORA CLÍNICA: " + tipo.toUpperCase() + "*\n\n" +
    "Informe estritamente as variáveis necessárias para este cálculo.\n\n" +
    "📋 *Copie a caixa abaixo, preencha os parâmetros e envie:*\n" +
    "```\n" +
    "/calc " + tipo + "\n" +
    "[Parâmetros e valores necessários]: [ ]\n" +
    "```\n" +
    "*(Toque na caixa acima para copiar, complete apenas os dados necessários e envie)*";
}

function enviarMenuCategoriasCalculadoras(chatId, messageId) {
  var token = ConfigService.get("TELEGRAM_BOT_TOKEN");
  var teclado = {
    "inline_keyboard": [
      [{"text": "🫀 Cardio & Vascular", "callback_data": "calc_cat_cardio"}],
      [{"text": "🧪 Nefro, Metabólico & Geral", "callback_data": "calc_cat_renal"}],
      [{"text": "🧠 Neuro & Terapia Intensiva", "callback_data": "calc_cat_neuro"}]
    ]
  };
  var texto = "📐 *CALCULADORAS CLÍNICAS DETERMINÍSTICAS*\n\nEscolha uma categoria ou envie diretamente no chat:\n💡 *Ex:* `/calc curb65 71a confuso PA 100/60 FR 32 Ureia 68`";

  if (messageId && token) {
    executarPostTelegram("https://api.telegram.org/bot" + token + "/editMessageText", {
      "chat_id": chatId, "message_id": messageId, "text": texto, "parse_mode": "Markdown", "reply_markup": teclado
    });
  } else {
    enviarMensagemComTecladoParaChat(chatId, texto, teclado);
  }
}

function enviarSubmenuCalculadoras(chatId, messageId, categoria) {
  var token = ConfigService.get("TELEGRAM_BOT_TOKEN");
  var teclado = [];
  var tituloCat = "";

  if (categoria === "calc_cat_cardio") {
    tituloCat = "🫀 *Calculadoras Cardiovasculares:*";
    teclado = [
      [{"text": "CHA2DS2-VASc", "callback_data": "calc_CHA2DS2-VASc"}, {"text": "HAS-BLED", "callback_data": "calc_HAS-BLED"}],
      [{"text": "Wells (TEP/TVP)", "callback_data": "calc_Wells"}, {"text": "HEART / TIMI", "callback_data": "calc_HEART-TIMI"}],
      [{"text": "GRACE Score", "callback_data": "calc_GRACE"}, {"text": "Framingham", "callback_data": "calc_Framingham"}],
      [{"text": "⬅️ Voltar ao Menu", "callback_data": "calc_menu_principal"}]
    ];
  } else if (categoria === "calc_cat_renal") {
    tituloCat = "🧪 *Calculadoras Nefro, Metabólicas & Gerais:*";
    teclado = [
      [{"text": "CKD-EPI (TFG)", "callback_data": "calc_CKD"}, {"text": "Cockcroft (ClCr)", "callback_data": "calc_Cockcroft"}],
      [{"text": "CURB-65", "callback_data": "calc_CURB-65"}, {"text": "Déficit de Água", "callback_data": "calc_Agua"}],
      [{"text": "Cálcio Corrigido", "callback_data": "calc_Calcio"}, {"text": "Gap Osmolar", "callback_data": "calc_Gap_Osmolar"}],
      [{"text": "KDIGO (IRA)", "callback_data": "calc_KDIGO"}, {"text": "LDL Martin-Hopkins", "callback_data": "calc_LDL-Martin-Hopkins"}],
      [{"text": "FRAX (Fratura)", "callback_data": "calc_FRAX"}],
      [{"text": "⬅️ Voltar ao Menu", "callback_data": "calc_menu_principal"}]
    ];
  } else if (categoria === "calc_cat_neuro") {
    tituloCat = "🧠 *Calculadoras Neuro & Terapia Intensiva:*";
    teclado = [
      [{"text": "Glasgow-P", "callback_data": "calc_Glasgow"}, {"text": "NIHSS (AVC)", "callback_data": "calc_NIHSS"}],
      [{"text": "qSOFA (Sepse)", "callback_data": "calc_SOFA"}, {"text": "MELD / MELD-Na", "callback_data": "calc_MELD"}],
      [{"text": "Child-Pugh", "callback_data": "calc_Child"}, {"text": "BISAP (Pancreatite)", "callback_data": "calc_Ranson"}],
      [{"text": "APACHE II", "callback_data": "calc_APACHE"}],
      [{"text": "⬅️ Voltar ao Menu", "callback_data": "calc_menu_principal"}]
    ];
  }

  if (messageId && token) {
    executarPostTelegram("https://api.telegram.org/bot" + token + "/editMessageText", {
      "chat_id": chatId, "message_id": messageId, "text": "📐 " + tituloCat + "\n\nSelecione a ferramenta desejada:", "parse_mode": "Markdown", "reply_markup": { "inline_keyboard": teclado }
    });
  }
}
