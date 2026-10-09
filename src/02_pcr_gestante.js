/**
 * ==============================================================================
 * MÓDULO 02: RESSUSCITAÇÃO CARDIOPULMONAR NA GESTANTE (PCR / ACLS MATERNO)
 * ==============================================================================
 * Algoritmo determinístico de alta fidelidade para Parada Cardiorrespiratória (PCR)
 * materna e Cesariana de Ressuscitação (Perimortem / Resuscitative Hysterotomy).
 *
 * REFERÊNCIAS:
 * - AHA Guidelines for CPR and ECC: Maternal Resuscitation (2020 / 2025).
 * - FEBRASGO: Manual de Urgências e Emergências Obstétricas.
 * - Consenso Brasileiro de Ressuscitação Cardiopulmonar na Gravidez.
 * - SOAP (Society for Obstetric Anesthesia and Perinatology) Consensus Statement.
 * ==============================================================================
 */

var PcrGestanteService = (function() {
  'use strict';

  /**
   * Avalia a PCR na gestante e determina condutas críticas imediatas:
   * DULE, via aérea, acesso venoso, histerotomia de ressuscitação e antídotos.
   *
   * @param {Object} params
   * @param {number} params.idadeGestacionalSemanas - Idade gestacional em semanas
   * @param {number} [params.alturaUterinaCm] - Altura uterina medida em cm
   * @param {boolean} [params.fundoUterinoUmbilical] - Se fundo atinge ou ultrapassa a cicatriz umbilical
   * @param {number} params.tempoPcrMinutos - Tempo decorrido em minutos de PCR contínua
   * @param {string} [params.ritmoPcr] - Ritmo cardíaco ("FV", "TVSP", "TV", "AESP", "Assistolia")
   * @param {boolean} [params.emUsoSulfatoMagnesio] - Se estava em infusão de MgSO4
   * @param {boolean} [params.suspeitaToxicidadeAnestesicoLocal] - Se LAST (toxicidade por bupivacaína/anestésicos)
   * @param {boolean} [params.suspeitaHemorragia] - Suspeita de choque hemorrágico / HPP maciça
   * @param {boolean} [params.suspeitaEmboliaAmniotica] - Suspeita de Embolia de Líquido Amniótico (ELA)
   * @param {boolean} [params.suspeitaSepse] - Suspeita de sepse materna/corioamnionite
   * @param {boolean} [params.suspeitaPreEclampsia] - Pré-eclâmpsia grave ou eclâmpsia
   * @returns {Object} Avaliação completa com alertas, condutas e checklist
   */
  function avaliarPcrGestante(params) {
    params = params || {};
    var ig = Number(params.idadeGestacionalSemanas) || 0;
    var au = Number(params.alturaUterinaCm) || 0;
    var fundoUmbilical = Boolean(params.fundoUterinoUmbilical);
    var tempoPcr = Number(params.tempoPcrMinutos) || 0;
    var ritmo = String(params.ritmoPcr || '').toUpperCase().trim();

    // 1. Avaliação de Compressão Aortocaval e Indicação de DULE
    // A partir de 20 semanas (ou útero palpável no umbigo / AU >= 20 cm), a compressão aortocaval é crítica.
    var compressaoAortocavalPresente = ig >= 20 || au >= 20 || fundoUmbilical;

    var dule = {
      indicado: compressaoAortocavalPresente,
      manobra: compressaoAortocavalPresente
        ? "MANOBRA DULE OBRIGATÓRIA (Deslocamento Uterino para a Esquerda / Left Uterine Displacement)"
        : "NÃO INDICADA (IG < 20 semanas sem compressão aortocaval hemodinâmica significativa)",
      justificativaFisiologica: compressaoAortocavalPresente
        ? "O útero gravídico oclui a veia cava inferior e a aorta descendente em decúbito dorsal, reduzindo o retorno venoso e o débito cardíaco materno em 30% a 40%. As compressões torácicas tornam-se ineficazes se o útero não for deslocado continuamente."
        : "Útero abaixo da cicatriz umbilical não obstrui a veia cava inferior de modo a reduzir a eficácia da RCP convencional.",
      tecnicaManual: compressaoAortocavalPresente
        ? "Executar deslocamento manual contínuo do útero para a esquerda com uma mão (empurrando pelo lado direito da paciente) ou com duas mãos (tracionando pelo lado esquerdo)."
        : null,
      alertaPosicionamento: compressaoAortocavalPresente
        ? "ALERTA CRÍTICO: Manter a paciente em decúbito dorsal HORIZONTAL em prancha rígida. NÃO inclinar a paciente ou a prancha em 30 graus, pois a inclinação lateral reduz drasticamente a profundidade e a qualidade da massagem torácica (Diretrizes AHA 2020/2025)."
        : "Posicionar em decúbito dorsal sobre superfície rígida (prancha de RCP)."
    };

    // 2. Acesso Vascular e Vias de Infusão
    var acessoVascular = {
      localizacaoPrioritaria: "ACIMA DO DIAFRAGMA (Membros Superiores / Jugular Externa ou Interna / Subclávia)",
      alertaCritico: "NÃO administrar fármacos ou infusões rápidas em membros inferiores ou veia femoral. Devido à compressão da veia cava inferior pelo útero gravídico, drogas infundidas abaixo do diafragma sofrem estase e não atingem a circulação central.",
      alternativaEmergencial: "Se acesso venoso periférico difícil: Acesso Intraósseo (IO) imediato em membros superiores (úmero proximal)."
    };

    // 3. Vias Aéreas e Ventilação na Gestante
    var viaAerea = {
      riscosFisiologicos: [
        "Via aérea potencialmente difícil devido a edema de mucosas e ganho ponderal.",
        "Consumo basal de oxigênio aumentado em 20%, levando a hipóxia e dessaturação rápida.",
        "Menor capacidade residual funcional e diminuição do tônus do esfíncter esofágico (alto risco de broncoaspiração)."
      ],
      recomendacoes: [
        "Pré-oxigenação com FiO2 100% imediata (máscara com reservatório).",
        "Intubação Orotraqueal (IOT) precoce realizada pelo socorrista mais experiente.",
        "Utilizar tubo endotraqueal menor: diâmetro interno 6.0 a 7.0 mm com cuff (balonete).",
        "Capnografia Quantitativa contínua em tempo real (EtCO2): meta > 10 a 20 mmHg durante compressões; salto abrupto para > 35-40 mmHg indica Retorno da Circulação Espontânea (RCE / ROSC).",
        "Evitar hiperventilação: 1 ventilação a cada 6 segundos (10 respirações/minuto) após via aérea avançada."
      ]
    };

    // 4. Farmacoterapia e Desfibrilação
    var eRitmoChocavel = ritmo === "FV" || ritmo === "TVSP" || ritmo === "TV";
    var condutaFarmacologica = {
      ritmoIdentificado: ritmo || "NÃO INFORMADO",
      eChocavel: eRitmoChocavel,
      desfibrilacao: eRitmoChocavel
        ? "Desfibrilação imediata: 200 Joules (bifásico) ou 360 Joules (monofásico). Não atrasar o choque! A descarga elétrica não lesa o feto."
        : "Ritmo não chocável (AESP ou Assistolia). Desfibrilação NÃO indicada.",
      alertaSegurancaDesfibrilador: "REMOVER/DESCONECTAR monitores fetais (tocodinamômetro, sonar fetal, cardiotocógrafo) antes de administrar o choque para evitar interferências ou risco de queimaduras.",
      epinefrina: "Adrenalina (Epinefrina) 1 mg IV/IO a cada 3 a 5 minutos. NÃO reduzir a dose por conta da gestação.",
      antiarritmicos: eRitmoChocavel
        ? "Se FV/TVSP refratária ao 2º choque: Amiodarona 300 mg bolus IV/IO (segunda dose 150 mg se refratária) ou Lidocaína 1 a 1,5 mg/kg IV/IO."
        : "Não indicado antiarrítmico em ritmos não chocáveis."
    };

    // 5. Cesariana de Ressuscitação / Perimortem (Regra dos 4 Minutos)
    var histerotomia = {
      indicada: false,
      status: "NÃO_INDICADA",
      mensagem: "",
      tempoPcrMinutos: tempoPcr,
      regraQuatroMinutos: "Iniciar cesariana aos 4 minutos de PCR ininterrupta sem RCE; extração fetal até o 5º minuto.",
      prioridadeClinica: "SALVAR A MÃE. A histerotomia alivia a compressão aortocaval em 100%, restaurando o débito cardíaco materno aprisionado. A sobrevida fetal é benefício secundário.",
      localProcedimento: "NO PRÓPRIO LOCAL DA PCR (Leito, Sala Vermelha, Pronto-Socorro ou UTI). NUNCA transportar a paciente parada para o Centro Cirúrgico!",
      orientacoesCirurgicas: [
        "NUNCA interromper a massagem cardíaca ou a ventilação durante o ato operatório.",
        "Não aguardar paramentação cirúrgica estéril completa ou antissepsia demorada (apenas bisturi e luvas).",
        "Laparotomia mediana infraumbilical rápida, histerotomia ampla e extração fetal imediata com clampeamento rápido do cordão.",
        "Entrega imediata do neonato à equipe de reanimação pediátrica/neonatal."
      ]
    };

    if (!compressaoAortocavalPresente) {
      histerotomia.indicada = false;
      histerotomia.status = "NÃO_APLICÁVEL_IG_MENOR_20";
      histerotomia.mensagem = "Gestação < 20 semanas: Feto não viável e útero pequeno sem compressão aortocaval significativa. Cesariana perimortem não indicada.";
    } else {
      if (tempoPcr >= 4) {
        histerotomia.indicada = true;
        histerotomia.status = "INDICADA_IMEDIATAMENTE";
        histerotomia.mensagem = "🚨 CESARIANA DE RESSUSCITAÇÃO INDICADA IMEDIATAMENTE (REGRA DOS 4 MINUTOS EXCEDIDA OU ATINGIDA). Iniciar histerotomia no próprio leito agora para salvar a mãe e o feto!";
      } else {
        histerotomia.indicada = false;
        histerotomia.status = "PREPARO_IMEDIATO";
        histerotomia.minutosRestantesDecisao = Math.max(0, 4 - tempoPcr);
        histerotomia.mensagem = "⚠️ PREPARAR EQUIPE CIRÚRGICA E BISTURI BEIRA-LEITO: Faltam " + (4 - tempoPcr) + " minuto(s) para a decisão da cesariana de ressuscitação se não houver RCE (Retorno da Circulação Espontânea).";
      }
    }

    // 6. Antídotos e Condutas Farmacológicas Especializadas
    var antidotos = [];

    if (params.emUsoSulfatoMagnesio) {
      antidotos.push({
        condicao: "Intoxicação por Sulfato de Magnésio (MgSO4)",
        acaoImediata: "INTERROMPER IMEDIATAMENTE qualquer infusão de Sulfato de Magnésio.",
        antidoto: "Gluconato de Cálcio a 10%",
        posologia: "10 mL (1 g) IV lento em 2 a 3 minutos.",
        justificativa: "O cálcio antagoniza competitivamente o bloqueio neuromuscular e a toxicidade cardiológica induzida pelo magnésio."
      });
    }

    if (params.suspeitaToxicidadeAnestesicoLocal) {
      antidotos.push({
        condicao: "Toxicidade Sistêmica por Anestésicos Locais (LAST - Local Anesthetic Systemic Toxicity)",
        acaoImediata: "Evitar bloqueadores de canal de cálcio, betabloqueadores e vasopressina.",
        antidoto: "Emulsão Lipídica a 20% (Intralipid)",
        posologia: "Bolus inicial de 1,5 mL/kg IV em 1 minuto, seguido de infusão contínua de 0,25 mL/kg/min (máximo 12 mL/kg).",
        justificativa: "Cria um reservatório intravascular que sequestra o anestésico local lipofílico dos tecidos cardíacos (mecanismo lipid sink)."
      });
    }

    if (params.suspeitaHemorragia) {
      antidotos.push({
        condicao: "Hemorragia Obstétrica Grave / Choque Hipovolêmico",
        acaoImediata: "Ativação do Protocolo de Transfusão Maciça (relação 1:1:1 de Concentrado de Hemácias, Plasma Fresco Congelado e Plaquetas).",
        antidoto: "Ácido Tranexâmico",
        posologia: "1 g IV em 10 minutos (repetir 1 g após 30 minutos se sangramento persistente).",
        justificativa: "Inibição precoce da hiperfibrinólise para contenção de coagulopatia consumptiva (Estudo WOMAN)."
      });
    }

    if (params.suspeitaEmboliaAmniotica) {
      antidotos.push({
        condicao: "Embolia de Líquido Amniótico (ELA / Síndrome Anafilactoide da Gravidez)",
        acaoImediata: "Falência ventricular direita aguda com coagulopatia intravascular disseminada fulminante.",
        antidoto: "Suporte Inotrópico e Hemoderivados Precoces",
        posologia: "Noradrenalina + Dobutamina para choque cardiogênico/vasoplégico; reposição de Crioprecipitado precoce para manter fibrinogênio > 150-200 mg/dL.",
        justificativa: "Manejo direcionado para falência de VD e colapso hemostático."
      });
    }

    // 7. Checklist Diagnóstico de Causas Reversíveis Maternas (Mnemônico A-to-H)
    var checklistCausasReversiveis = [
      { letra: "A", causa: "Anesthesia / Airway", descricao: "Complicações anestésicas (bloqueio raquídeo/peridural total), falha na intubação, hipóxia ou broncoaspiração." },
      { letra: "B", causa: "Bleeding", descricao: "Hemorragia maciça (descolamento prematuro de placenta, placenta prévia, atonia uterina, rotura uterina)." },
      { letra: "C", causa: "Cardiovascular", descricao: "Infarto agudo do miocárdio, dissecção aguda de aorta, cardiomiopatia periparto, arritmias." },
      { letra: "D", causa: "Drugs", descricao: "Toxicidade por Sulfato de Magnésio (antídoto: Gluconato de Cálcio), toxicidade por anestésico local (LAST: Emulsão Lipídica)." },
      { letra: "E", causa: "Embolic", descricao: "Embolia de líquido amniótico (colapso súbito + CIVD), Tromboembolismo pulmonar maciço (TEP)." },
      { letra: "F", causa: "Fever / Sepsis", descricao: "Sepse puerperal, corioamnionite grave, infecção de ferida operatória / endometrite." },
      { letra: "G", causa: "General non-obstetric (5Hs e 5Ts)", descricao: "Hipovolemia, Hipóxia, Acidose (H+), Hipo/Hipercalemia, Hipotermia; Tamponamento cardíaco, Pneumotórax hipertensivo, Trombose coronária, Trombose pulmonar, Toxinas." },
      { letra: "H", causa: "Hypertension", descricao: "Pré-eclâmpsia grave, Síndrome HELLP, Eclâmpsia, Hemorragia intracraniana hipertensiva." }
    ];

    return {
      sucesso: true,
      idadeGestacionalSemanas: ig,
      tempoPcrMinutos: tempoPcr,
      dule: dule,
      acessoVascular: acessoVascular,
      viaAerea: viaAerea,
      condutaFarmacologica: condutaFarmacologica,
      histerotomiaRessuscitacao: histerotomia,
      antidotos: antidotos,
      checklistCausasReversiveis: checklistCausasReversiveis,
      resumoExecutivo: gerarResumoExecutivo({
        ig: ig,
        tempoPcr: tempoPcr,
        compressaoAortocaval: compressaoAortocavalPresente,
        histerotomia: histerotomia,
        antidotos: antidotos
      })
    };
  }

  /**
   * Gera um resumo executivo textual rápido para ser consumido pelo Cockpit ou Telegram
   */
  function gerarResumoExecutivo(dados) {
    var linhas = [];
    linhas.push("🚨 PROTOCOLO DE PCR NA GESTANTE (ACLS MATERNO)");
    linhas.push("• Idade Gestacional: " + dados.ig + " semanas | Tempo de PCR: " + dados.tempoPcr + " min");

    if (dados.compressaoAortocaval) {
      linhas.push("• DULE MANUAL OBRIGATÓRIO: Deslocar útero continuamente para a esquerda com a paciente plana em decúbito dorsal rígido.");
    } else {
      linhas.push("• DULE: Não indicado (IG < 20 semanas).");
    }

    linhas.push("• ACESSO VENOSO: Prioridade estrita ACIMA DO DIAFRAGMA (membros superiores/jugular).");

    if (dados.histerotomia.status === "INDICADA_IMEDIATAMENTE") {
      linhas.push("• ⚠️ CESARIANA PERIMORTEM: INDICADA AGORA (Regra dos 4 minutos)! Realizar no leito sem interrupção da RCP.");
    } else if (dados.histerotomia.status === "PREPARO_IMEDIATO") {
      linhas.push("• ⏳ CESARIANA PERIMORTEM: Preparar equipe e bisturi no leito (faltam " + dados.histerotomia.minutosRestantesDecisao + " min para decisão aos 4 min).");
    }

    if (dados.antidotos && dados.antidotos.length > 0) {
      dados.antidotos.forEach(function(a) {
        linhas.push("• 💊 ANTÍDOTO (" + a.condicao + "): " + a.antidoto + " - " + a.posologia);
      });
    }

    return linhas.join("\n");
  }

  return {
    avaliarPcrGestante: avaliarPcrGestante
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PcrGestanteService: PcrGestanteService };
}
