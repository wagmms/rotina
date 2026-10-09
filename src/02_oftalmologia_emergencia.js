/**
 * ==============================================================================
 * ULTRA ROTINA - MÓDULO DE OFTALMOLOGIA DE EMERGÊNCIA
 * ==============================================================================
 * Rastreio e Conduta Inicial no Trauma Ocular, Queimaduras Químicas e Glaucoma Agudo
 * Diretrizes: CBO (Conselho Brasileiro de Oftalmologia), AAO (American Academy
 * of Ophthalmology PPP), Wills Eye Manual e ATLS/BETT
 * 
 * PILARES CLÍNICOS DETERMINÍSTICOS:
 * 1. Queimadura Química Ocular (Álcalis vs Ácidos):
 *    - REGRA DE OURO INMEDIATA: Irrigação profusa IMEDIATA com Ringer Lactato ou SF 0,9%
 *      (1 a 2 Litros contínuos por 15-30 minutos) ANTES de qualquer exame ou anamnese detalhada.
 *    - Checagem de pH conjuntival com fita neutra (alvo: 7,0 a 7,2).
 *    - Eversão de pálpebras e varredura de fundo de saco para remoção de partículas sólidas (cal, cimento).
 *    - Álcalis são mais graves (necrose por liquefação e penetração profunda) vs Ácidos (coagulação).
 * 
 * 2. Glaucoma Agudo de Ângulo Fechado (GAAF):
 *    - Tríade clínica: Dor ocular severa/hemicrania, olho vermelho com injeção ciliar,
 *      visão turva com halos coloridos, náuseas/vômitos e pupila em médio-midríase arreativa com PIO > 40-70 mmHg.
 *    - Protocolo escalonado:
 *      * Passo 1: Acetazolamida 500 mg VO/IV + Timolol 0,5% tópico + Brimonidina 0,15-0,2% tópico
 *      * Passo 2: Manitol 20% IV (1-2 g/kg em 30-45 min) se PIO > 40-50 mmHg ou vômitos refratários
 *      * Passo 3: REGRA DE OURO DA PILOCARPINA: NÃO instilar Pilocarpina se PIO > 40-50 mmHg
 *        (isquemia do esfíncter pupilar torna o fármaco ineficaz/paradoxal). Administrar Pilocarpina 1-2%
 *        SOMENTE APÓS a redução da PIO (< 40 mmHg) para tracionar a íris e abrir o ângulo trabecular.
 *      * Passo 4: Corticoide tópico (Prednisolona 1%) e Iridotomia a Laser profilática bilateral.
 * 
 * 3. Trauma Ocular e Triagem Visual no Pronto Atendimento:
 *    - Triagem Visual de Snellen: Testar acuidade visual monocular (olho são primeiro);
 *      escalonar em Conta Dedos (CD), Movimento de Mãos (MM) e Percepção Luminosa (PL/SPL).
 *    - Suspeita de Globo Ocular Aberto / Perfuração:
 *      * Pupila em gota/lágrima apontando para a ferida, teste de Seidel positivo, hipotonia ocular, câmara rasa.
 *      * REGRAS DE OURO: NUNCA pressionar o olho! NUNCA pomadas! Proteger IMEDIATAMENTE com
 *        protetor rígido acrílico (shield) sem gaze compressiva, NPO, antiemético IV, profilaxia antitetânica
 *        e antibiótico IV para endoftalmite.
 *    - Hifema Traumático: Repouso com cabeceira elevada a 30-45º. BLOQUEIO FORMAL de AAS e AINEs
 *      (risco crítico de ressangramento).
 *    - Fratura de Órbita ("Blowout"): Proibição absoluta de assoar o nariz (prevenção de enfisema hipertensivo).
 * ==============================================================================
 */

var OftalmologiaEmergenciaService = (function () {
  'use strict';

  // ───────────────────────────────────────────────────────────────────────────
  // 1. DIRETRIZES E CATÁLOGO DE INTERVENÇÕES FARMACOLÓGICAS
  // ───────────────────────────────────────────────────────────────────────────

  var CATALOGO_CONDUTAS = {
    QUEIMADURA_QUIMICA: {
      regraDeOuro: "IRRIGAÇÃO PROFUSA IMEDIATA ANTES DE QUALQUER EXAME DETALHADO",
      solucao: "Ringer Lactato ou Soro Fisiológico 0,9% estéril (1 a 2 Litros contínuos por pelo menos 15 a 30 minutos)",
      alvoPh: "7,0 a 7,2 (medir com fita de tornassol no fórnice 5 minutos após suspensão da irrigação)",
      alcaliVsAcido: {
        alcali: "Álcalis (soda cáustica, cal, cimento, amônia): Necrose por liquefação. Penetra profundamente nas câmaras e destrói células-tronco do limbo. EXTREMAMENTE GRAVE.",
        acido: "Ácidos (ácido de bateria, sulfúrico, muriático): Necrose por coagulação de proteínas. Forma barreira limitante, mas pode causar opacidade corneana grave."
      }
    },
    GLAUCOMA_AGUDO: {
      triade: "Dor ocular unilateral intensa, injeção ciliar pericerática, pupila em médio-midríase fixa, edema de córnea e PIO > 40-70 mmHg",
      passo1_sistemico_topico: [
        "Acetazolamida 500 mg VO (ou IV) dose de ataque imediata, seguida de 250 mg VO 6/6h",
        "Colírio de Timolol 0,5%: 1 gota no olho afetado (checar contraindicação em asma/DPOC ou BAV)",
        "Colírio de Brimonidina 0,15-0,2% (ou Apraclonidina 1%): 1 gota no olho afetado"
      ],
      passo2_hiperosmotico: "Manitol 20% IV: 1 a 2 g/kg (5 a 10 mL/kg) em infusão rápida de 30 a 45 minutos (desidrata o vítreo e recua a íris)",
      passo3_regraPilocarpina: "BLOQUEIO / REGRA DE OURO: NÃO instilar Pilocarpina se PIO > 40-50 mmHg (o esfíncter pupilar isquêmico não responde). Iniciar Pilocarpina 1-2% (1 gota a cada 15 min por 1h) SOMENTE APÓS a PIO baixar (< 40 mmHg).",
      passo4_antiinflamatorio: "Colírio de Acetato de Prednisolona 1%: 1 gota a cada 1-2 horas para conter uveíte hipertensiva",
      definitivo: "Iridotomia periférica a Laser (YAG Laser) em AMBOS os olhos (risco de 50% de crise no olho contralateral)"
    },
    TRAUMA_GLOBO_ABERTO: {
      regraDeOuro: "PROIBIDO PRESSÃO OU MANIPULAÇÃO DO GLOBO OCULAR. PROTEGER COM SHIELD RÍGIDO.",
      conduta: [
        "Protetor ocular rígido acrílico (shield) ou copo descartável fixado nas bordas ósseas orbitárias",
        "NUNCA ocluir com gaze compressiva (risco de extrusão de conteúdo intraocular)",
        "NUNCA instilar pomadas oftálmicas (risco de penetração intraocular e endoftalmite)",
        "Jejum absoluto (NPO) para abordagem cirúrgica urgente",
        "Antiemético IV (Ondansetrona 8 mg) e analgesia para prevenir vômitos e Valsalva",
        "Profilaxia antitetânica conforme cartão vacinal",
        "Antibioticoterapia profilática sistêmica: Ceftriaxona 2g IV + Vancomicina 1g IV"
      ]
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 2. MOTOR DE AVALIAÇÃO DE QUEIMADURAS QUÍMICAS OCULARES
  // ───────────────────────────────────────────────────────────────────────────

  function avaliarQueimaduraQuimica(dados) {
    dados = dados || {};

    var agente = String(dados.agente || dados.substancia || '').toLowerCase();
    var tempoMinutos = parseInt(dados.tempoMinutos || dados.tempoExposicaoMinutos, 10) || 0;
    var phAtual = dados.ph !== undefined ? parseFloat(dados.ph) : null;
    var isquemiaLimbica = Boolean(dados.isquemiaLimbica || dados.olhoBranco || dados.branqueamentoLimbico);
    var particulasSolidas = Boolean(dados.particulasSolidas || dados.cimento || dados.cal || dados.po);

    var ehAlcali = /alcali|álcali|soda|caustica|cáustica|cal|cimento|alvejante|amonia|amônia|limpa forno/i.test(agente);
    var ehAcido = /acido|ácido|bateria|muriatico|muriático|sulfurico|sulfúrico|cloridrico|clorídrico/i.test(agente);

    var classificacaoAgente = ehAlcali ? "ÁLCALI (EXTREMA GRAVIDADE / RISCO DE LIQUEFAÇÃO)" : (ehAcido ? "ÁCIDO (RISCO DE COAGULAÇÃO PROTEICA)" : "SUBSTÂNCIA QUÍMICA NÃO ESPECIFICADA");

    var prioridade = "EMERGÊNCIA MÉDICA ABSOLUTA";
    var condutaImediata = [];
    var alertasCriticos = [];

    // Regra número 1
    condutaImediata.push("REGRA DE OURO: INICIAR IRRIGAÇÃO PROFUSA IMEDIATA sem esperar acuidade visual ou anamnese detalhada.");
    condutaImediata.push("Solução: Ringer Lactato ou SF 0,9% estéril, mantendo irrigação contínua de 1 a 2 Litros por olho afetado durante 15 a 30 minutos.");

    if (particulasSolidas || /cal|cimento/i.test(agente)) {
      alertasCriticos.push("PARTÍCULAS SÓLIDAS RETIDAS (Cal/Cimento): Fazer eversão da pálpebra superior e inferior com cotonete embebido em anestésico tópico e varredura exaustiva dos fórnices conjuntivais para remoção mecânica imediata.");
    }

    if (phAtual !== null) {
      if (phAtual < 7.0 || phAtual > 7.3) {
        alertasCriticos.push("pH CONJUNTIVAL ANORMAL (" + phAtual + "): Não atingiu neutralidade. Continuar irrigação contínua de mais 1 a 2 Litros de SF/RL até atingir pH entre 7.0 e 7.2.");
      } else {
        condutaImediata.push("pH conjuntival normalizado (" + phAtual + "). Suspender irrigação e reavaliar pH após 10 minutos.");
      }
    } else {
      condutaImediata.push("Testar pH conjuntival com fita de tornassol após os primeiros 1-2 litros de infusão (alvo estrito: 7,0 a 7,2).");
    }

    if (ehAlcali || isquemiaLimbica) {
      alertasCriticos.push("RISCO ELEVADO DE ISQUEMIA LÍMBICA E FALÊNCIA LIMBAR: Álcalis destroem as células-tronco do limbo, levando a conjuntivalização e opacidade permanente da córnea. Encaminhar com urgência máxima à Oftalmologia.");
    }

    // Prescrição adjuvante pós-irrigação
    var prescricaoAdjuvante = [
      "Colírio Cicloplégico (Ciclopentolato 1% ou Tropicamida 1%): 1 gota 8/8h para alívio do espasmo ciliar e dor",
      "Colírio Antibiótico profilático (Moxifloxacino 0,5% ou Tobramicina 0,3%): 1 gota 6/6h para prevenir infecção sobre úlcera epitelial",
      "Lágrima artificial sem conservantes: 1 gota de 1/1h ou 2/2h para reepitelização",
      "Vitamina C sistêmica (Ácido Ascórbico 1g a 2g/dia VO) para suporte à síntese de colágeno estromal"
    ];

    return {
      tipo: "QUEIMADURA_QUIMICA",
      agente: classificacaoAgente,
      prioridade: prioridade,
      condutaImediata: condutaImediata,
      prescricaoAdjuvante: prescricaoAdjuvante,
      alertasCriticos: alertasCriticos
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. MOTOR DE AVALIAÇÃO DE GLAUCOMA AGUDO DE ÂNGULO FECHADO
  // ───────────────────────────────────────────────────────────────────────────

  function avaliarGlaucomaAgudo(dados) {
    dados = dados || {};

    var pio = parseFloat(dados.pio || dados.pressaoIntraocular) || 0;
    var dorIntensa = Boolean(dados.dorIntensa || dados.dorOcularSevera || dados.hemicrania);
    var olhoVermelho = Boolean(dados.olhoVermelho || dados.injecaoCiliar || dados.olhoHiperemiado);
    var edemaCornea = Boolean(dados.edemaCornea || dados.corneaFume || dados.visaoTurva || dados.halosColoridos);
    var pupilaMidriaseFixa = Boolean(dados.pupilaMidriaseFixa || dados.medioMidriase || dados.pupilaArreativa);
    var nauseasOuVomitos = Boolean(dados.nauseasOuVomitos || dados.vomitos);
    var asmaOuDpoc = Boolean(dados.asma || dados.dpoc || dados.broncoespasmo || dados.asmaOuDpoc);
    var bloqueioAv = Boolean(dados.bav || dados.bradicardia || dados.bloqueioAv);

    var suspeitaForte = (dorIntensa && olhoVermelho && (edemaCornea || pupilaMidriaseFixa)) || (pio >= 30);
    var pioExtrema = (pio >= 40) || (pio === 0 && suspeitaForte); // se pio não mensurada mas quadro clássico, assume alta

    var prescricoes = [];
    var bloqueios = [];
    var condutas = [];
    var alertas = [];

    condutas.push("REDUÇÃO IMEDIATA DA PRESSÃO INTRAOCULAR (ALVO: PIO < 20 mmHg para prevenir atrofia irreversível do nervo óptico).");

    // 1. Acetazolamida
    prescricoes.push({
      medicamento: "Acetazolamida 500 mg (VO ou IV)",
      posologia: "500 mg em dose de ataque imediata; manutenção 250 mg VO 6/6h",
      indicacao: "Inibição potente da anidrase carbônica ciliar, reduzindo a produção de humor aquoso em até 50%."
    });

    // 2. Betabloqueador Tópico (Timolol)
    if (asmaOuDpoc || bloqueioAv) {
      bloqueios.push("CONTRAINDICAÇÃO DE TIMOLOL TÓPICO: Paciente com asma, DPOC ou BAV (risco de broncoespasmo grave e bradiarritmia sistêmica por absorção pela mucosa nasolacrimal). Usar Brimonidina isolada.");
    } else {
      prescricoes.push({
        medicamento: "Colírio de Maleato de Timolol 0,5%",
        posologia: "Instilar 1 gota no olho afetado imediatamente (comprimir canto interno por 1 min para reduzir absorção sistêmica)",
        indicacao: "Redução da secreção de humor aquoso por bloqueio beta-adrenérgico."
      });
    }

    // 3. Alfa-2 Agonista (Brimonidina)
    prescricoes.push({
      medicamento: "Colírio de Tartarato de Brimonidina 0,15% ou 0,2%",
      posologia: "Instilar 1 gota no olho afetado imediatamente",
      indicacao: "Dupla ação: diminui a produção de humor aquoso e aumenta a drenagem uveoescleral."
    });

    // 4. Agente Hiperosmótico (Manitol 20%)
    if (pioExtrema || nauseasOuVomitos) {
      prescricoes.push({
        medicamento: "Manitol 20% IV",
        posologia: "1 a 2 g/kg (5 a 10 mL/kg) em infusão endovenosa rápida em 30 a 45 minutos",
        indicacao: "Desidratação osmótica maciça do corpo vítreo com retração do diafragma iridocristaliniano e descompressão de emergência."
      });
    }

    // 5. REGRA DE OURO DA PILOCARPINA
    if (pioExtrema) {
      bloqueios.push("REGRA DE OURO / BLOQUEIO DA PILOCARPINA: NÃO instilar Pilocarpina imediatamente enquanto a PIO estiver > 40-50 mmHg! Com pressão extrema, há isquemia do esfíncter da íris e a pilocarpina é ineficaz e pode provocar espasmo paradoxal. Iniciar Pilocarpina 1-2% SOMENTE APÓS a PIO baixar (< 40 mmHg) por ação da Acetazolamida/Manitol.");
      prescricoes.push({
        medicamento: "Colírio de Cloridrato de Pilocarpina 1% ou 2% (EM ESPERA)",
        posologia: "Instilar 1 gota a cada 15 minutos (por até 4 doses), e depois 6/6h — INICIAR APENAS APÓS PIO < 40 mmHg",
        indicacao: "Mióse terapêutica para tracionar a periferia da íris para longe do trabeculado, desobstruindo o ângulo iridocorneano."
      });
    } else {
      prescricoes.push({
        medicamento: "Colírio de Cloridrato de Pilocarpina 1% ou 2%",
        posologia: "1 gota a cada 15 minutos (por até 4 doses), depois 6/6h",
        indicacao: "Mióse terapêutica para abertura do ângulo trabecular."
      });
    }

    // 6. Corticoide tópico adjuvante
    prescricoes.push({
      medicamento: "Colírio de Acetato de Prednisolona 1%",
      posologia: "1 gota no olho afetado a cada 1 a 2 horas",
      indicacao: "Controle da reação inflamatória da câmara anterior e prevenção de sinéquias anteriores periféricas."
    });

    // Tratamento definitivo
    alertas.push("CONDUTA DEFINITIVA OBRIGATÓRIA: Iridotomia periférica a laser (YAG Laser) em AMBOS os olhos assim que a córnea clarear (o olho contralateral tem risco de 50% de crise aguda nos próximos anos).");

    return {
      tipo: "GLAUCOMA_AGUDO_ANGULO_FECHADO",
      suspeitaForte: suspeitaForte,
      pio: pio,
      pioExtrema: pioExtrema,
      condutas: condutas,
      prescricoes: prescricoes,
      bloqueios: bloqueios,
      alertas: alertas
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. MOTOR DE AVALIAÇÃO DE TRAUMA OCULAR E TRIAGEM VISUAL
  // ───────────────────────────────────────────────────────────────────────────

  function avaliarTraumaOcular(dados) {
    dados = dados || {};

    var mecanismo = String(dados.mecanismo || dados.trauma || '').toLowerCase();
    var acuidadeVisual = String(dados.acuidadeVisual || dados.visao || '').toLowerCase();
    var pupilaDeformada = Boolean(dados.pupilaDeformada || dados.pupilaEmGota || dados.pupilaLagrima);
    var seidelPositivo = Boolean(dados.seidelPositivo || dados.testeDeSeidel || dados.seidel);
    var extrusaoConteudo = Boolean(dados.extrusaoConteudo || dados.uveaExposta || dados.irisExposta || dados.vitreoExposto);
    var hipotonico = Boolean(dados.hipotoniaOcular || dados.olhoMurcho);
    var camaraRasa = Boolean(dados.camaraRasa || dados.camaraAnteriorColabada);
    var hifema = Boolean(dados.hifema || dados.sangueCamaraAnterior);
    var enfisemaSubcutaneo = Boolean(dados.enfisema || dados.enfisemaSubcutaneo || dados.crepitacaoOrbitaria);
    var diplopiaOlharCima = Boolean(dados.diplopia || dados.diplopiaOlharCima || dados.restricaoMotilidade);

    var suspeitaGloboAberto = pupilaDeformada || seidelPositivo || extrusaoConteudo || hipotonico || camaraRasa || /perfur|penetr|estilhad/i.test(mecanismo);

    var condutas = [];
    var bloqueios = [];
    var alertas = [];

    // Triagem visual de Snellen
    var triagemVisual = {
      olhoAfetado: acuidadeVisual || "Não informada (testar monocular com correção óptica)",
      escalonamento: "Snellen -> Conta Dedos (CD) -> Movimento de Mãos (MM) -> Percepção Luminosa (PL/SPL)"
    };

    if (suspeitaGloboAberto) {
      alertas.push("🚨 ALERTA CRÍTICO: SUSPEITA DE GLOBO OCULAR ABERTO / PERFURAÇÃO OCULAR (Emergência Cirúrgica Imediata).");
      
      bloqueios.push("NUNCA PRESSIONAR O OLHO! Proibida palpação ocular, tonometria ou eversão palpebral forçada.");
      bloqueios.push("NUNCA INSTILAR POMADAS OFTÁLMICAS (podem penetrar na câmara anterior e causar toxicidade/endoftalmite).");
      bloqueios.push("NUNCA APLICAR CURATIVO COMPRESSIVO OU GAZE PRESSIONADA.");

      condutas.push("PROTEGER O OLHO IMEDIATAMENTE COM PROTETOR OCULAR RÍGIDO (SHIELD ACRÍLICO) OU COPO DESCARTÁVEL fixado nas margens ósseas orbitárias.");
      condutas.push("Jejum absoluto (NPO) imediato para exploração cirúrgica sob anestesia geral.");
      condutas.push("Antiemético potente (Ondansetrona 8 mg IV) e analgesia para prevenir vômitos e Valsalva.");
      condutas.push("Profilaxia antitetânica conforme status vacinal.");
      condutas.push("Antibioticoterapia profilática sistêmica para endoftalmite traumática: Ceftriaxona 2g IV + Vancomicina 1g IV.");
    } else if (hifema) {
      alertas.push("🩸 HIFEMA TRAUMÁTICO CONFIRMADO (Sangue na câmara anterior). Risco máximo de ressangramento entre o 3º e 5º dia.");
      bloqueios.push("CONTRAINDICAÇÃO FORMAL DE AAS E AINEs: Anti-inflamatórios e aspirina aumentam drasticamente o risco de ressangramento e glaucoma secundário.");
      condutas.push("Repouso no leito com cabeceira elevada a 30-45º (facilita sedimentação inferior do sangue e desobstrui o trabeculado).");
      condutas.push("Protetor ocular rígido protetor para evitar traumas acidentais.");
      condutas.push("Colírio cicloplégico (Ciclopentolato 1%) e corticoide tópico (Prednisolona 1%) para repouso uveal.");
    }

    if (enfisemaSubcutaneo || diplopiaOlharCima || /blowout|fratura/i.test(mecanismo)) {
      alertas.push("FRATURA DE ASSOALHO/PAREDE MEDIAL DE ÓRBITA ('BLOWOUT'): Encarceramento de músculo reto inferior e enfisema periorbitário.");
      bloqueios.push("PROIBIDO ASSOAR O NARIZ: Assoar o nariz força ar do seio maxilar/etmoidal para dentro da órbita, podendo causar síndrome compartimental orbitária compressiva e cegueira.");
      condutas.push("Solicitar Tomografia Computadorizada (TC) de crânio e órbitas com cortes finos axiais e coronais.");
      condutas.push("Antibioticoterapia profilática contra patógenos sinusais (Amoxicilina-Clavulanato).");
    }

    return {
      tipo: "TRAUMA_OCULAR",
      suspeitaGloboAberto: suspeitaGloboAberto,
      hifema: hifema,
      triagemVisual: triagemVisual,
      condutas: condutas,
      bloqueios: bloqueios,
      alertas: alertas
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. AVALIADOR CLÍNICO GERAL
  // ───────────────────────────────────────────────────────────────────────────

  function avaliar(params) {
    var dados = params || {};

    var tipoCaso = "INDETERMINADO";
    var resultadoSubmodulo = null;

    var textoGeral = String(dados.texto || dados.descricao || '').toLowerCase();
    var ehQueimadura = Boolean(dados.queimadura || dados.quimico || dados.alcali || dados.acido || /queimadura|soda|cal|cimento|quimic|ácido|alcali/i.test(textoGeral));
    var ehGlaucoma = Boolean(dados.glaucoma || dados.anguloFechado || dados.pio || /glaucoma|pio|halos|medio-midriase|midriase fixa/i.test(textoGeral));
    var ehTrauma = Boolean(dados.trauma || dados.perfuracao || dados.hifema || dados.blowout || /trauma|perfur|seidel|hifema|soco|estilhaco|corpo estranho/i.test(textoGeral));

    if (ehQueimadura) {
      tipoCaso = "QUEIMADURA_QUIMICA";
      resultadoSubmodulo = avaliarQueimaduraQuimica(dados);
    } else if (ehGlaucoma) {
      tipoCaso = "GLAUCOMA_AGUDO_ANGULO_FECHADO";
      resultadoSubmodulo = avaliarGlaucomaAgudo(dados);
    } else if (ehTrauma) {
      tipoCaso = "TRAUMA_OCULAR";
      resultadoSubmodulo = avaliarTraumaOcular(dados);
    } else {
      // Default inteligente baseado nos parâmetros
      if (dados.ph !== undefined || dados.agente) {
        tipoCaso = "QUEIMADURA_QUIMICA";
        resultadoSubmodulo = avaliarQueimaduraQuimica(dados);
      } else if (dados.pio !== undefined) {
        tipoCaso = "GLAUCOMA_AGUDO_ANGULO_FECHADO";
        resultadoSubmodulo = avaliarGlaucomaAgudo(dados);
      } else {
        tipoCaso = "TRAUMA_OCULAR";
        resultadoSubmodulo = avaliarTraumaOcular(dados);
      }
    }

    return {
      sucesso: true,
      tipoCaso: tipoCaso,
      detalhes: resultadoSubmodulo,
      catalogoGeral: CATALOGO_CONDUTAS
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. PARSER ROBUSTO DE TEXTO LIVRE
  // ───────────────────────────────────────────────────────────────────────────

  function extrairParametrosTexto(texto) {
    var raw = String(texto || '').toLowerCase();

    var params = {
      texto: texto,
      // Queimadura
      queimadura: false,
      agente: "",
      ph: null,
      particulasSolidas: false,
      // Glaucoma
      glaucoma: false,
      pio: null,
      dorIntensa: false,
      olhoVermelho: false,
      edemaCornea: false,
      pupilaMidriaseFixa: false,
      nauseasOuVomitos: false,
      asmaOuDpoc: false,
      // Trauma
      trauma: false,
      pupilaDeformada: false,
      seidelPositivo: false,
      extrusaoConteudo: false,
      hifema: false,
      enfisemaSubcutaneo: false,
      acuidadeVisual: ""
    };

    // Detecção de Queimadura
    if (raw.includes('queimadura') || raw.includes('soda') || raw.includes('cal') || raw.includes('cimento') ||
        raw.includes('ácido') || raw.includes('acido') || raw.includes('alcali') || raw.includes('álcali') || raw.includes('quimic')) {
      params.queimadura = true;
      if (raw.includes('soda') || raw.includes('cal') || raw.includes('cimento') || raw.includes('alcali')) params.agente = "alcali";
      else if (raw.includes('acido') || raw.includes('ácido') || raw.includes('bateria')) params.agente = "acido";
    }
    var matchPh = raw.match(/ph[:\s]*(\d+[.,]?\d*)/);
    if (matchPh) {
      params.ph = parseFloat(matchPh[1].replace(',', '.'));
    }
    if (raw.includes('cimento') || raw.includes('cal') || raw.includes('po') || raw.includes('pó')) {
      params.particulasSolidas = true;
    }

    // Detecção de Glaucoma Agudo
    if (raw.includes('glaucoma') || raw.includes('angulo fechado') || raw.includes('ângulo fechado') || raw.includes('pio') || raw.includes('halos')) {
      params.glaucoma = true;
    }
    var matchPio = raw.match(/pio[:\s]*(\d{1,3})/);
    if (matchPio) {
      params.pio = parseFloat(matchPio[1]);
      params.glaucoma = true;
    }
    if (raw.includes('dor intensa') || raw.includes('dor severa') || raw.includes('dor ocular')) params.dorIntensa = true;
    if (raw.includes('olho vermelho') || raw.includes('hiperemia') || raw.includes('injecao ciliar') || raw.includes('injeção ciliar')) params.olhoVermelho = true;
    if (raw.includes('edema de cornea') || raw.includes('córnea fume') || raw.includes('halos') || raw.includes('turva')) params.edemaCornea = true;
    if (raw.includes('midriase') || raw.includes('pupila arreativa') || raw.includes('medio midriase')) params.pupilaMidriaseFixa = true;
    if (raw.includes('nausea') || raw.includes('náusea') || raw.includes('vomito') || raw.includes('vômito')) params.nauseasOuVomitos = true;
    if (raw.includes('asma') || raw.includes('dpoc') || raw.includes('broncoespasmo')) params.asmaOuDpoc = true;

    // Detecção de Trauma
    if (raw.includes('trauma') || raw.includes('perfur') || raw.includes('penetr') || raw.includes('soco') || raw.includes('hifema') || raw.includes('seidel')) {
      params.trauma = true;
    }
    if (raw.includes('pupila em gota') || raw.includes('pupila deformada') || raw.includes('pupila em lágrima')) params.pupilaDeformada = true;
    if (raw.includes('seidel') || raw.includes('seidel positivo')) params.seidelPositivo = true;
    if (raw.includes('extrusao') || raw.includes('extrusão') || raw.includes('uvea exposta') || raw.includes('íris exposta')) params.extrusaoConteudo = true;
    if (raw.includes('hifema') || raw.includes('sangue na camara anterior')) params.hifema = true;
    if (raw.includes('enfisema') || raw.includes('blowout') || raw.includes('fratura de orbita')) params.enfisemaSubcutaneo = true;

    // Acuidade visual
    var matchVisao = raw.match(/(?:visao|acuidade visual|av)[:\s]*([0-9\/]+|conta dedos|movimento de maos|pl|spl)/i);
    if (matchVisao) {
      params.acuidadeVisual = matchVisao[1];
    }

    return params;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 7. FORMATADOR DE TEXTO PARA TELEGRAM E COCKPIT
  // ───────────────────────────────────────────────────────────────────────────

  function formatarTextoTelegram(resultado) {
    if (!resultado || !resultado.sucesso) {
      return "⚠️ Falha ao processar avaliação oftalmológica de emergência.";
    }

    var tipo = resultado.tipoCaso;
    var d = resultado.detalhes;

    var texto = "👁️ *OFTALMOLOGIA DE EMERGÊNCIA & PRONTO ATENDIMENTO*\n";
    texto += "═══════════════════════════════════════════\n\n";

    if (tipo === "QUEIMADURA_QUIMICA") {
      texto += "🚨 *QUEIMADURA QUÍMICA OCULAR (" + d.agente + ")*\n";
      texto += "• *Prioridade:* `" + d.prioridade + "`\n\n";

      texto += "⚡ *CONDUTA IMEDIATA DE EMERGÊNCIA:*\n";
      for (var i = 0; i < d.condutaImediata.length; i++) {
        texto += "• " + d.condutaImediata[i] + "\n";
      }

      if (d.alertasCriticos.length > 0) {
        texto += "\n⚠️ *ALERTAS CRÍTICOS:*\n";
        for (var a = 0; a < d.alertasCriticos.length; a++) {
          texto += "• " + d.alertasCriticos[a] + "\n";
        }
      }

      texto += "\n💊 *PRESCRIÇÃO ADJUVANTE PÓS-IRRIGAÇÃO:*\n";
      for (var p = 0; p < d.prescricaoAdjuvante.length; p++) {
        texto += "• " + d.prescricaoAdjuvante[p] + "\n";
      }
      texto += "\n🚨 *CRITÉRIOS DE ENCAMINHAMENTO URGENTE AO OFTALMOLOGISTA:*\n";
      texto += "• Encaminhar com urgência SOMENTE APÓS concluir a irrigação contínua exaustiva (15-30 min) com confirmação de pH neutro (7,0 a 7,2). Jamais atrasar a irrigação para transferir o paciente.\n";
    } else if (tipo === "GLAUCOMA_AGUDO_ANGULO_FECHADO") {
      texto += "🔥 *CRISE AGUDA DE GLAUCOMA DE ÂNGULO FECHADO (GAAF)*\n";
      texto += "• *Pressão Intraocular (PIO):* " + (d.pio > 0 ? d.pio + " mmHg" : "Elevada (> 40 mmHg presumida)") + "\n\n";

      texto += "🎯 *OBJETIVO:* " + d.condutas[0] + "\n\n";

      texto += "💊 *PROTOCOLO MEDICAMENTOSO ESCALONADO:*\n";
      for (var m = 0; m < d.prescricoes.length; m++) {
        var presc = d.prescricoes[m];
        texto += "• *" + presc.medicamento + "*\n";
        texto += "  ↳ Posologia: `" + presc.posologia + "`\n";
        texto += "  ↳ Ação: " + presc.indicacao + "\n";
      }

      if (d.bloqueios.length > 0) {
        texto += "\n🚫 *BLOQUEIOS DE SEGURANÇA MANDATÓRIOS:*\n";
        for (var b = 0; b < d.bloqueios.length; b++) {
          texto += "• " + d.bloqueios[b] + "\n";
        }
      }

      if (d.alertas.length > 0) {
        texto += "\n⚠️ *TRATAMENTO DEFINITIVO:*\n";
        for (var al = 0; al < d.alertas.length; al++) {
          texto += "• " + d.alertas[al] + "\n";
        }
      }

      texto += "\n🚨 *CRITÉRIOS DE ENCAMINHAMENTO URGENTE AO OFTALMOLOGISTA:*\n";
      texto += "• Encaminhamento IMEDIATO após administração das doses de resgate (Acetazolamida, Manitol e colírios) para realização de iridotomia periférica bilateral a laser.\n";
    } else {
      texto += "🛡️ *TRAUMA OCULAR E TRIAGEM VISUAL*\n";
      if (d.suspeitaGloboAberto) {
        texto += "• *Classificação:* `GLOBO OCULAR ABERTO / PERFURAÇÃO OCULAR SUSPEITA`\n\n";
      } else if (d.hifema) {
        texto += "• *Classificação:* `HIFEMA TRAUMÁTICO (SANGRAMENTO EM CÂMARA ANTERIOR)`\n\n";
      } else {
        texto += "• *Classificação:* `TRAUMA OCULAR FECHADO / CONTUSÃO`\n\n";
      }

      texto += "👁️ *TRIAGEM VISUAL (SNELLEN):* " + d.triagemVisual.olhoAfetado + "\n";
      texto += "↳ Escalonamento padrão: " + d.triagemVisual.escalonamento + "\n\n";

      if (d.alertas.length > 0) {
        texto += "⚠️ *ALERTAS CRÍTICOS:*\n";
        for (var at = 0; at < d.alertas.length; at++) {
          texto += "• " + d.alertas[at] + "\n";
        }
        texto += "\n";
      }

      if (d.bloqueios.length > 0) {
        texto += "🚫 *BLOQUEIOS MANDATÓRIOS (O QUE NUNCA FAZER):*\n";
        for (var bl = 0; bl < d.bloqueios.length; bl++) {
          texto += "• " + d.bloqueios[bl] + "\n";
        }
        texto += "\n";
      }

      texto += "📋 *CONDUTAS DE EMERGÊNCIA:*\n";
      for (var c = 0; c < d.condutas.length; c++) {
        texto += "• " + d.condutas[c] + "\n";
      }

      texto += "\n🚨 *CRITÉRIOS DE ENCAMINHAMENTO URGENTE AO OFTALMOLOGISTA:*\n";
      texto += "• Suspeita de perfuração / globo aberto (manter proteção mecânica com protetor rígido sem compressão e paciente em jejum/NPO).\n";
      texto += "• Hifema (sangue em câmara anterior), limitação da motilidade ocular extrínseca / enoftalmo pós-trauma ou queda abrupta da acuidade visual.\n";
    }

    texto += "\n📚 *Ultra Rotina 2026 • Urgências Oftalmológicas (CBO / AAO / Wills Eye)*";
    return texto;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // INTERFACE PÚBLICA
  // ───────────────────────────────────────────────────────────────────────────
  return {
    avaliar: avaliar,
    avaliarQueimaduraQuimica: avaliarQueimaduraQuimica,
    avaliarGlaucomaAgudo: avaliarGlaucomaAgudo,
    avaliarTraumaOcular: avaliarTraumaOcular,
    extrairParametrosTexto: extrairParametrosTexto,
    formatarTextoTelegram: formatarTextoTelegram,
    CATALOGO_CONDUTAS: CATALOGO_CONDUTAS
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = OftalmologiaEmergenciaService;
}
