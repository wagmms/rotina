/**
 * ==============================================================================
 * ULTRA ROTINA - MÓDULO DE CARDIOLOGIA & EMERGÊNCIA
 * ==============================================================================
 * Manejo de Fibrilação Atrial Aguda e Anticoagulação
 * Diretrizes SBC 2024, ESC 2020/2024, AHA/ACC/HRS 2023.
 * 
 * Escopo:
 * - Escore determinístico CHA2DS2-VASc
 * - Avaliação de Risco Hemorrágico com escore HAS-BLED
 * - Fluxograma de Controle de Frequência vs Ritmo e Anticoagulação
 * ==============================================================================
 */

var CardiologiaFaAnticoagulacaoService = (function () {
  'use strict';

  /**
   * Escore CHA2DS2-VA unissex (Diretrizes ESC 2024 / SBC 2025):
   * O sexo feminino ("Sc") foi descontinuado como pontuação somatória isolada.
   * - 0 ponto: Baixo risco tromboembólico. ACO NÃO recomendada (Classe III).
   * - 1 ponto: Risco intermediário. Considerar ACO individualizada (Classe IIa). DOACs preferenciais.
   * - >= 2 pontos: Alto risco tromboembólico. ACO formalmente recomendada e indicada (Classe I). DOACs preferenciais.
   */
  function calcularCHA2DS2VA(dados) {
    dados = dados || {};
    var pontos = 0;

    if (dados.idade >= 75) pontos += 2;
    else if (dados.idade >= 65) pontos += 1;

    if (dados.insuficienciaCardiaca) pontos += 1;
    if (dados.hipertensao) pontos += 1;
    if (dados.avcOuAitPrevio) pontos += 2;
    if (dados.doencaVascular) pontos += 1;
    if (dados.diabetes) pontos += 1;

    var recomendacao = "";
    var classe = "";
    if (pontos === 0) {
      classe = "Classe III";
      recomendacao = "Baixo risco tromboembólico (Score = 0). Anticoagulação oral (ACO) não é recomendada (Classe III).";
    } else if (pontos === 1) {
      classe = "Classe IIa";
      recomendacao = "Risco intermediário (Score = 1). Considerar ACO individualizada com base no risco/benefício (Classe IIa). DOACs preferíveis à Varfarina na FA não valvar.";
    } else {
      classe = "Classe I";
      recomendacao = "Alto risco tromboembólico (Score ≥ 2). Anticoagulação oral recomendada e indicada (Classe I). DOACs preferíveis à Varfarina na FA não valvar.";
    }

    return {
      escore: pontos,
      escoreVA: pontos,
      diretriz: "ESC 2024 / SBC 2025",
      classe: classe,
      recomendacao: recomendacao,
      doacPreferivel: true
    };
  }

  function calcularCHA2DS2VASc(dados) {
    dados = dados || {};
    var va = calcularCHA2DS2VA(dados);
    var pontos = va.escore;
    if (dados.sexo === 'F' || dados.sexo === 'feminino') pontos += 1;

    var recomendacao = "";
    if (pontos === 0 || (pontos === 1 && (dados.sexo === 'F' || dados.sexo === 'feminino'))) {
      recomendacao = "Baixo risco. Anticoagulação oral (ACO) não é recomendada.";
    } else if (pontos === 1 && (dados.sexo === 'M' || dados.sexo === 'masculino')) {
      recomendacao = "Risco intermediário. Considerar ACO individualizada com base no risco/benefício (DOACs preferíveis à Varfarina).";
    } else {
      recomendacao = "Alto risco. Anticoagulação oral indicada e recomendada (DOACs são preferíveis à Varfarina na FA não valvar).";
    }

    return {
      escore: pontos,
      recomendacao: recomendacao,
      cha2ds2va: va,
      escoreVA: va.escore,
      recomendacaoVA: va.recomendacao
    };
  }

  function calcularHASBLED(dados) {
    var pontos = 0;
    
    if (dados.hipertensaoNaoControlada) pontos += 1;
    if (dados.funcaoRenalAnormal) pontos += 1;
    if (dados.funcaoHepaticaAnormal) pontos += 1;
    if (dados.avcPrevio) pontos += 1;
    if (dados.sangramentoPrevioOuPredisposicao) pontos += 1;
    if (dados.inrLabil) pontos += 1;
    if (dados.idadeMaior65 || dados.idade > 65) pontos += 1;
    if (dados.usoDrogas) pontos += 1;
    if (dados.usoAlcool) pontos += 1;

    var interpretacao = pontos >= 3 ? 
        "ALTO RISCO DE SANGRAMENTO (≥ 3). NÃO contraindica a anticoagulação, mas exige correção de fatores de risco modificáveis (ex: controle rigoroso da PA, descontinuação de AINEs/álcool) e seguimento clínico mais frequente." : 
        "RISCO BAIXO a MODERADO de sangramento. Os benefícios da anticoagulação geralmente superam os riscos.";

    return { escore: pontos, interpretacao: interpretacao };
  }

  function avaliarCondutaAgudaFA(dados) {
    var relatorio = [];
    
    if (dados.instabilidadeHemodinamica) {
        relatorio.push("🚨 **PACIENTE INSTÁVEL**");
        relatorio.push("- Critérios de instabilidade: Choque, hipotensão sustentada, isquemia miocárdica em curso, edema agudo de pulmão (EAP) ou rebaixamento do nível de consciência agudo.");
        relatorio.push("- **CONDUTA IMEDIATA:** Cardioversão Elétrica (CVE) Sincronizada.");
        relatorio.push("- Realizar sedação e analgesia prévia se tolerável.");
        relatorio.push("- Iniciar anticoagulação IV/SC pleno o mais rápido possível (preferencialmente pré-choque).");
    } else {
        relatorio.push("✅ **PACIENTE ESTÁVEL**");
        
        relatorio.push("\n**1. CONTROLE DE FREQUÊNCIA (Alvo: FC < 110 bpm em repouso):**");
        relatorio.push("- **Beta-bloqueadores IV:** Metoprolol 5mg IV lento, repetível a cada 5-15 min até máximo de 15mg.");
        relatorio.push("- **BCC Não-Diidropiridínicos:** Diltiazem 0.25 mg/kg IV em 2 min.");
        relatorio.push("- **Atenção (FE reduzida):** Se insuficiência cardíaca associada com FE < 40%, EVITAR Diltiazem. Preferir Amiodarona IV (300mg em 1h) ou Digoxina (0.5mg IV).");
        
        relatorio.push("\n**2. CONTROLE DE RITMO (Cardioversão):**");
        if (dados.tempoSintomas === '<48h') {
            relatorio.push("- **Duração < 48 horas:** Cardioversão química (Amiodarona 150mg IV em 10 min seguido de infusão 1mg/min por 6h) ou elétrica eletiva É SEGURA.");
            relatorio.push("- Iniciar anticoagulação peri-procedimento com HNF, HBPM ou DOAC o mais precocemente possível.");
        } else {
            relatorio.push("- **Duração > 48 horas ou desconhecida:** ALTO RISCO TROMBOEMBÓLICO.");
            relatorio.push("- A cardioversão imediata é **CONTRAINDICADA** sem precaução prévia.");
            relatorio.push("- **Estratégia A:** Anticoagulação plena por 3 semanas consecutivas ANTES da cardioversão, E por 4 semanas após.");
            relatorio.push("- **Estratégia B:** Realizar Ecocardiograma Transesofágico (ECO-TE) para excluir trombo em apêndice atrial esquerdo. Se sem trombo, cardioverter sob uso de heparina e manter ACO por pelo menos 4 semanas após.");
        }
    }

    if (dados.proteseMetalica || dados.estenoseMitral) {
        relatorio.push("\n⚠️ **ANTICOAGULAÇÃO (FA VALVAR):**");
        relatorio.push("- Presença de prótese valvar mecânica ou estenose mitral reumática moderada a grave.");
        relatorio.push("- **DOACs SÃO CONTRAINDICADOS.** Terapia mandatória com Antagonista da Vitamina K (Varfarina) com alvo de INR apropriado (geralmente 2.0 - 3.0 ou maior em certas próteses).");
    } else {
        relatorio.push("\n💊 **ANTICOAGULAÇÃO (FA NÃO VALVAR):**");
        relatorio.push("- Terapia deve ser guiada pelo escore CHA2DS2-VASc.");
        relatorio.push("- Quando indicada, **DOACs** (Apixabana, Rivaroxabana, Dabigatrana, Edoxabana) são a 1ª linha recomendada sobre a Varfarina.");
        relatorio.push("- Lembrete: Avaliar sempre Clearance de Creatinina (ClCr) antes da prescrição de DOACs para ajuste de dose ou contraindicação (ClCr < 15-30 mL/min a depender do agente).");
    }

    return relatorio.join('\n');
  }

  function avaliar(parametros) {
    var idade = typeof parametros.idade === 'number' ? parametros.idade : 60;
    var sexo = (parametros.sexo || '').toLowerCase() === 'f' || (parametros.sexo || '').toLowerCase() === 'feminino' ? 'F' : 'M';
    
    var ic = !!parametros.insuficienciaCardiaca;
    var has = !!parametros.hipertensao;
    var avc = !!parametros.avcOuAitPrevio;
    var dvasc = !!parametros.doencaVascular;
    var dm = !!parametros.diabetes;

    var has_renal = !!parametros.funcaoRenalAnormal;
    var has_hepatica = !!parametros.funcaoHepaticaAnormal;
    var has_sangramento = !!parametros.sangramentoPrevioOuPredisposicao;
    var has_drogas = !!parametros.usoDrogas;
    var has_alcool = !!parametros.usoAlcool;

    var instavel = !!parametros.instabilidadeHemodinamica;
    var tempo = parametros.tempoSintomas === '<48h' ? '<48h' : '>48h';
    var protese = !!parametros.proteseMetalica;
    var estenose = !!parametros.estenoseMitral;

    var chascore = calcularCHA2DS2VASc({
        idade: idade, sexo: sexo, insuficienciaCardiaca: ic, hipertensao: has, avcOuAitPrevio: avc, doencaVascular: dvasc, diabetes: dm
    });

    var hasbled = calcularHASBLED({
        hipertensaoNaoControlada: has,
        funcaoRenalAnormal: has_renal,
        funcaoHepaticaAnormal: has_hepatica,
        avcPrevio: avc,
        sangramentoPrevioOuPredisposicao: has_sangramento,
        inrLabil: false,
        idadeMaior65: idade > 65,
        usoDrogas: has_drogas,
        usoAlcool: has_alcool
    });

    var conduta = avaliarCondutaAgudaFA({
        instabilidadeHemodinamica: instavel, 
        tempoSintomas: tempo, 
        proteseMetalica: protese, 
        estenoseMitral: estenose
    });

    return {
      paciente: { idade: idade, sexo: sexo },
      cha2ds2vasc: chascore,
      hasbled: hasbled,
      conduta: conduta
    };
  }

  function formatarTextoTelegram(resultado) {
    var txt = "🫀 *CARDIOLOGIA & EMERGÊNCIA — FIBRILAÇÃO ATRIAL*\n\n";
    txt += "👤 *Paciente:* " + resultado.paciente.idade + " anos, Sexo " + resultado.paciente.sexo + "\n\n";
    
    txt += "🧮 *Escore CHA2DS2-VASc: " + resultado.cha2ds2vasc.escore + " pontos*\n";
    txt += "🔹 " + resultado.cha2ds2vasc.recomendacao + "\n\n";
    
    txt += "🩸 *Escore HAS-BLED: " + resultado.hasbled.escore + " pontos*\n";
    txt += "🔹 " + resultado.hasbled.interpretacao + "\n\n";
    
    txt += "🏥 *CONDUTA CLÍNICA (Algoritmo SBC/ESC)*\n";
    txt += resultado.conduta + "\n";

    return txt;
  }

  function extrairParametrosTexto(texto) {
    var limpo = texto.toLowerCase();
    
    var p = {};
    
    var idadeMatch = limpo.match(/(\d+)\s*(anos|a\b)/);
    p.idade = idadeMatch ? parseInt(idadeMatch[1], 10) : 60;
    
    var sexoF = /(sexo\s*f|feminino|mulher|paciente fem|paciente f\b|gestante)/i.test(limpo);
    p.sexo = sexoF ? 'F' : 'M';

    p.insuficienciaCardiaca = /(ic\b|insuficiencia cardiaca|insuficiência cardíaca|fraçao de ejeçao|fracao de ejecao|feve reduzida|dispneia|nyha)/i.test(limpo);
    p.hipertensao = /(has\b|hipertensao|hipertensão|pressão alta|pressao alta|hipertenso)/i.test(limpo);
    p.avcOuAitPrevio = /(avc|ait\b|derrame|isquemia cerebral)/i.test(limpo);
    p.doencaVascular = /(iam\b|infarto|dac\b|doença arterial|dap\b|placa aortica|placa aórtica)/i.test(limpo);
    p.diabetes = /(dm\b|diabetes|diabetico|diabético)/i.test(limpo);

    p.funcaoRenalAnormal = /(insuficiencia renal|drc\b|creatinina|clcr|dialise|falencia renal)/i.test(limpo);
    p.funcaoHepaticaAnormal = /(cirrose|insuficiencia hepatica|hepatopatia|tgo|tgp)/i.test(limpo);
    p.sangramentoPrevioOuPredisposicao = /(sangramento|hemorragia|ulcera sangrante|melena|hematemese)/i.test(limpo);
    p.usoDrogas = /(aine|ibuprofeno|cetoprofeno|diclofenaco|aas\b|clopidogrel|antiplaquetario|antiplaquetário)/i.test(limpo);
    p.usoAlcool = /(alcoolismo|etilismo|etilista|alcool\b|álcool\b)/i.test(limpo);

    p.instabilidadeHemodinamica = /(choque|hipotensao|hipotensão|pam<|pam <|pas <|pas<|eap\b|edema agudo|angina|isquemia|rebaixamento|instavel|instável)/i.test(limpo);
    p.tempoSintomas = /(menos de 48|<48|< 48|aguda\b|agudo|inicio recente|início recente)/i.test(limpo) ? '<48h' : '>48h';
    p.proteseMetalica = /(protese metalica|prótese metálica|válvula metálica|valvula metalica|valvula mecanica|protese mecanica)/i.test(limpo);
    p.estenoseMitral = /(estenose mitral|valvopatia mitral)/i.test(limpo);

    return p;
  }

  return {
    calcularCHA2DS2VA: calcularCHA2DS2VA,
    calcularCHA2DS2VASc: calcularCHA2DS2VASc,
    calcularHASBLED: calcularHASBLED,
    avaliarCondutaAgudaFA: avaliarCondutaAgudaFA,
    avaliar: avaliar,
    formatarTextoTelegram: formatarTextoTelegram,
    extrairParametrosTexto: extrairParametrosTexto
  };
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = CardiologiaFaAnticoagulacaoService;
}
