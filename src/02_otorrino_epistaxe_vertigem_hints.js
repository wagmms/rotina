/**
 * ==============================================================================
 * ULTRA ROTINA - MÓDULO DE OTORRINOLARINGOLOGIA E URGÊNCIAS BEIRA-LEITO
 * ==============================================================================
 * Diagnóstico e Manejo da Síndrome Vestibular Aguda (Protocolo HINTS / HINTS-Plus),
 * Vertigem Posicional Paroxística Benigna (VPPB) e Epistaxe Aguda Escalonada
 * (Anterior vs Posterior com Sonda de Foley e Bloqueios de Iatrogenia).
 * 
 * Diretrizes: Bárány Society, American Academy of Otolaryngology - Head and Neck
 * Surgery (AAO-HNS), American Heart Association / Stroke Council e ABORL-CCF.
 * ==============================================================================
 */

var OtorrinoEpistaxeVertigemService = (function () {
  'use strict';

  // ───────────────────────────────────────────────────────────────────────────
  // 1. SÍNDROME VESTIBULAR AGUDA (SVA) E PROTOCOLO HINTS / HINTS-PLUS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avalia a vertigem no pronto-socorro aplicando o protocolo HINTS (Head Impulse, Nystagmus, Test of Skew)
   * e diferenciação entre AVC de Fossa Posterior (PICA/AICA/Tronco) vs Neurite Vestibular vs VPPB.
   * 
   * @param {Object} p Parâmetros clínicos estruturados ou texto livre
   * @returns {Object} Estratificação, achados HINTS, hipótese diagnóstica e condutas imediatas
   */
  function avaliarVertigemHints(p) {
    p = p || {};
    var texto = (String(p.texto || "") + " " + String(p.descricao || "") + " " + String(p.achados || "")).toLowerCase();

    // 1. Definição do tipo de síndrome vestibular
    var ehEpisodica = p.episodica === true || /(?:epis[oó]dica|segundos|parox[ií]stica|ao virar na cama|posicional|mudan[cç]a de posi[cç][aã]o|vppb)/i.test(texto);
    var ehContinua = p.continua === true || /(?:cont[ií]nua|constante|horas|dias|sva|aguda cont[ií]nua|ininterrupta)/i.test(texto);
    if (!ehEpisodica && !ehContinua) {
      ehContinua = true; // Por padrão no PS, paciente vertiginoso admitido em crise aguda
    }

    // 2. Componente H: Head Impulse Test (Impulso Cefálico / Halmagyi)
    // NORMAL = Perigo ("Normal is dangerous" -> reflexo vestíbulo-ocular intacto, lesão central)
    // ANORMAL = Sacada corretiva presente (falha do RVO periférico -> neurite vestibular)
    var headImpulse = p.headImpulse || p.hit || "";
    if (!headImpulse) {
      if (/(?:impulso normal|hit normal|sem sacada|sem sacadas|halmagyi normal)/i.test(texto)) {
        headImpulse = "normal";
      } else if (/(?:impulso anormal|impulso alterado|sacada presente|com sacada|sacadas corretivas|halmagyi alterado|halmagyi anormal)/i.test(texto)) {
        headImpulse = "anormal";
      } else {
        headImpulse = "nao_testado";
      }
    }

    // 3. Componente N: Nystagmus (Nistagmo)
    // UNIDIRECIONAL = Periférico (fase rápida bate sempre para o mesmo lado, inibido por fixação visual)
    // BIDIRECIONAL / VERTICAL / ROTATÓRIO = Central (muda com direção do olhar gaze-evoked, downbeat, upbeat)
    var nistagmo = p.nistagmo || p.nystagmus || "";
    if (!nistagmo) {
      if (/(?:bidirecional|muda de dire[cç][aã]o|gaze-evoked|troca de dire[cç][aã]o|vertical|downbeat|upbeat|rotat[oó]rio puro|torsional puro)/i.test(texto)) {
        nistagmo = "bidirecional_ou_vertical";
      } else if (/(?:unidirecional|horizontal puro|bate para|fase r[aá]pida [aà] (?:direita|esquerda)|mesmo lado)/i.test(texto)) {
        nistagmo = "unidirecional_horizontal";
      } else if (/(?:sem nistagmo|nistagmo ausente|aus[eê]ncia de nistagmo)/i.test(texto)) {
        nistagmo = "ausente";
      } else {
        nistagmo = "nao_especificado";
      }
    }

    // 4. Componente TS: Test of Skew (Teste de Desalinhamento Ocular Vertical / Skew Deviation)
    // NORMAL = Sem desvio vertical
    // ALTERADO = Skew deviation presente (um olho sobe e outro desce ao desocluir no cross-cover test)
    var testOfSkew = p.testOfSkew || p.skew || "";
    if (!testOfSkew) {
      if (/(?:skew presente|skew positivo|desvio vertical|desalinhamento vertical|olho sobe|skew alterado)/i.test(texto)) {
        testOfSkew = "alterado";
      } else if (/(?:sem skew|skew negativo|sem desvio vertical|alinhamento ocular normal)/i.test(texto)) {
        testOfSkew = "normal";
      } else {
        testOfSkew = "nao_testado";
      }
    }

    // 5. Componente "Plus": Perda Auditiva Súbita Aguda (Novo déficit unilateral)
    // Perda auditiva associada a vertigem sugere AVC de artéria cerebelar ântero-inferior (AICA)
    var perdaAuditivaAguda = !!(p.perdaAuditivaAguda || p.hearingLoss || /(?:surdez s[uú]bita|perda auditiva aguda|perda da audi[cç][aã]o unilateral|hipoacusia s[uú]bita)/i.test(texto));

    // 6. Outros sinais neurológicos focais (Dismetria, ataxia grave, disartria, disfagia, diplopia)
    var sinaisTroncoCerebelo = !!(p.sinaisTroncoCerebelo || /(?:dismetria|ataxia|disartria|disfagia|diplopia|queda da rima|fraqueza|hemiparesia|s[ií]ndrome de horner)/i.test(texto));

    // Avaliação VPPB (Dix-Hallpike)
    var dixHallpikePositivo = !!(p.dixHallpikePositivo || /(?:dix-hallpike positivo|nistagmo posicional|nistagmo torcional geotrópico|lat[eê]ncia de 2 a 5|fatig[aá]vel)/i.test(texto));

    // Determinação do Padrão
    var achadosCentrais = [];
    var achadosPerifericos = [];

    if (headImpulse === "normal") {
      achadosCentrais.push("Impulso Cefálico Normal ('Normal is dangerous' - reflexo vestíbulo-ocular preservado com lesão em SNC)");
    } else if (headImpulse === "anormal") {
      achadosPerifericos.push("Impulso Cefálico com Sacada Corretiva (disfunção do RVO periférico do VIII par)");
    }

    if (nistagmo === "bidirecional_ou_vertical") {
      achadosCentrais.push("Nistagmo Bidirecional (troca de direção com o olhar / gaze-evoked) ou Vertical/Rotatório puro");
    } else if (nistagmo === "unidirecional_horizontal") {
      achadosPerifericos.push("Nistagmo Unidirecional Horizontal-Torcional (bate para o mesmo lado, inibido por fixação)");
    }

    if (testOfSkew === "alterado") {
      achadosCentrais.push("Skew Deviation Positivo (desalinhamento vertical no teste de oclusão alternada / cover test)");
    } else if (testOfSkew === "normal") {
      achadosPerifericos.push("Alinhamento Vertical Preservado (ausência de Skew Deviation)");
    }

    if (perdaAuditivaAguda) {
      achadosCentrais.push("HINTS-Plus Positivo: Perda auditiva súbita nova (alerta crítico para AVC de AICA / infarto labiríntico-troncular)");
    }

    if (sinaisTroncoCerebelo) {
      achadosCentrais.push("Déficits neurológicos de tronco ou cerebelo associados (ataxia severa, dismetria, disartria ou diplopia)");
    }

    var classificacaoFinal = "";
    var diagnosticoPrincipal = "";
    var riscoAvc = "Baixo";
    var condutas = [];
    var redFlags = [];
    var bloqueiosIatrogenia = [];

    if (ehEpisodica && (dixHallpikePositivo || /(?:vppb|posicional|segundos)/i.test(texto))) {
      classificacaoFinal = "VPPB (Vertigem Posicional Paroxística Benigna)";
      diagnosticoPrincipal = "Litíase Canalicular (Canal semicircular posterior em 85-90% dos casos)";
      riscoAvc = "Muito Baixo";

      condutas.push("1. CONFIRMAÇÃO DIAGNÓSTICA COM MANOBRA DE DIX-HALLPIKE:");
      condutas.push("   - Observar latência (2 a 5 segundos), nistagmo torcional/geotrópico durando < 60 segundos e fatigabilidade.");
      condutas.push("");
      condutas.push("2. TRATAMENTO BEIRA-LEITO: MANOBRA DE REPOSICIONAMENTO DE EPLEY:");
      condutas.push("   - Eficácia de cura de 80 a 90% na primeira sessão no próprio consultório/PS.");
      condutas.push("   - Rotação sequencial da cabeça em 4 posições (45° ipsilateral -> 45° contralateral -> decúbito lateral 90° -> sentar). Manter 30 a 60 segundos em cada estágio.");
      condutas.push("");
      condutas.push("3. ORIENTAÇÕES PÓS-MANOBRA:");
      condutas.push("   - Evitar deitar completamente reto ou movimentos bruscos de cabeça nas primeiras 24 horas.");

      bloqueiosIatrogenia.push("🛑 BLOQUEIO FORMAL: NÃO prescrever labirintolíticos contínuos (Dimenidrinato, Cinarizina, Flunarizina) para VPPB! Fármacos não reposicionam otólitos e causam sonolência e risco de quedas.");
    } else if (achadosCentrais.length > 0) {
      classificacaoFinal = "SÍNDROME VESTIBULAR AGUDA CENTRAL - ALTO RISCO DE AVC";
      diagnosticoPrincipal = "Acidente Vascular Cerebral Isquêmico de Fossa Posterior (Infarto de PICA, AICA ou Tronco Cerebral)";
      riscoAvc = "Crítico / Elevado (HINTS INFARCT Positivo)";

      redFlags.push("🚨 ALERTA CRÍTICO: Suspeita máxima de AVC de Fossa Posterior! Qualquer critério central no HINTS (Impulso normal, Nistagmo alternante/vertical, Skew positivo ou Surdez aguda) tem sensibilidade > 99% para AVC.");
      redFlags.push("⚠️ ALERTA DE NEUROIMAGEM: A Tomografia de Crânio (TC) normal NÃO descarta AVC de fossa posterior (sensibilidade de apenas 16 a 26% nas primeiras 48h!). O HINTS é MAIS sensível que a Ressonância nas primeiras 24h.");

      condutas.push("1. ADMISSÃO IMEDIATA EM SALA VERMELHA / UNIDADE DE AVC:");
      condutas.push("   - Monitorização contínua de sinais vitais, Glasgow e oximetria.");
      condutas.push("   - Acesso venoso calibroso, jejum (risco iminente de broncoaspiração por vômitos e disfagia).");
      condutas.push("");
      condutas.push("2. NEUROIMAGEM DE URGÊNCIA:");
      condutas.push("   - Ressonância Magnética (RM) de encéfalo com protocolo de difusão (DWI) e Angio-RM arterial de vasos intracranianos e cervicais.");
      condutas.push("   - Se RM indisponível: TC crânio + Angio-TC para afastar hemorragia ou oclusão de artéria basilar/vertebral.");
      condutas.push("");
      condutas.push("3. VIGILÂNCIA DE EDEMA CEREBELAR:");
      condutas.push("   - Risco de deterioração aguda no 2º ao 4º dia por efeito de massa em fossa posterior, compressão de 4º ventrículo com hidrocefalia obstrutiva aguda e herniação amigdaliana (risco cirúrgico de craniectomia descompressiva).");
      condutas.push("");
      condutas.push("4. MANEJO CLÍNICO INICIAL:");
      condutas.push("   - Antieméticos parenterais (Ondansetrona 8 mg IV de 8/8h).");
      condutas.push("   - Controle pressórico permissivo (reduzir somente se PAS > 220 ou PAD > 120 mmHg, salvo indicação de trombólise).");
      condutas.push("   - Avaliação imediata de elegibilidade para trombólise venosa ou trombectomia mecânica se dentro da janela terapêutica.");

      bloqueiosIatrogenia.push("🛑 NUNCA liberar o paciente para casa com diagnóstico de 'labirintite' baseado em TC de crânio sem contraste normal quando o HINTS apresentar achados centrais!");
    } else if (achadosPerifericos.length >= 2) {
      classificacaoFinal = "SÍNDROME VESTIBULAR AGUDA PERIFÉRICA - BAIXO RISCO DE AVC";
      diagnosticoPrincipal = "Neurite Vestibular Aguda (Vestibulopatia Periférica Inflamatória Aguda)";
      riscoAvc = "Baixo (Padrão HINTS 100% Periférico)";

      condutas.push("1. REPOUSO E SUPORTE NA FASE AGUDA (PRIMEIRAS 24 A 48 HORAS):");
      condutas.push("   - Tranquilização do paciente e acomodação em ambiente com baixa luminosidade.");
      condutas.push("   - Hidratação venosa isotônica se êmese incoercível.");
      condutas.push("");
      condutas.push("2. SINTOMÁTICOS E SEDATIVOS VESTIBULARES (USO CURTO RESTRITO):");
      condutas.push("   - Dimenidrinato 50 mg IV ou VO de 6/6h a 8/8h (ou Prometazina 25 mg IM/VO).");
      condutas.push("   - Ondansetrona 8 mg IV ou VO de 8/8h para náuseas intensas.");
      condutas.push("");
      condutas.push("3. CORTICOTERAPIA PRECOCE (OPCIONAL / FASE INICIAL < 72H):");
      condutas.push("   - Prednisona 1 mg/kg/dia VO (máximo 60 mg/dia) por 5 dias, seguido de desmame rápido (reduzir 10-20 mg a cada 2 dias).");
      condutas.push("   - Acelera a recuperação do reflexo vestíbulo-ocular em pacientes sem contraindicações formais (DM descompensado, úlcera péptica ativa).");
      condutas.push("");
      condutas.push("4. DEAMBULAÇÃO E REABILITAÇÃO VESTIBULAR PRECOCE:");
      condutas.push("   - Estimular movimentos oculares e cefálicos suaves e marcha assistida assim que a êmese cessar (estimula a neuroplasticidade compensatória do tronco cerebral).");

      bloqueiosIatrogenia.push("🛑 REGRA DE OURO / BLOQUEIO DE IATROGENIA: PROIBIDO manter sedativos vestibulares (Dimenidrinato, Cinarizina, Flunarizina, Diazepam) por mais de 3 a 5 dias consecutivos!");
      bloqueiosIatrogenia.push("   - O uso crônico de labirintolíticos BLOQUEIA a compensação vestibular central fisiológica, cronificando a instabilidade e prolongando a tontura por meses!");
    } else {
      classificacaoFinal = "SÍNDROME VESTIBULAR AGUDA INDETERMINADA / INCOMPLETA";
      diagnosticoPrincipal = "Necessidade de Exame HINTS Completo Beira-Leito";
      riscoAvc = "Indeterminado - Manter vigilância neurológica";

      condutas.push("1. Realizar os 3 passos do exame HINTS à beira do leito:");
      condutas.push("   - Head Impulse (procurar sacada corretiva de refixação)");
      condutas.push("   - Nystagmus (observar se unidirecional ou se troca de lado com o olhar)");
      condutas.push("   - Test of Skew (desoclusão alternada para afastar desalinhamento vertical)");
      condutas.push("2. Avaliar simetria auditiva ao sussurro/esfregar de dedos (HINTS-Plus).");
      condutas.push("3. Na dúvida ou se paciente com fatores de risco cardiovascular múltiplos: priorizar investigação para AVC.");
    }

    return {
      sucesso: true,
      tipo_sindrome: ehEpisodica ? "Episódica (Sugere VPPB)" : "Aguda Contínua (SVA - Neurite vs AVC)",
      classificacao_final: classificacaoFinal,
      diagnostico_provavel: diagnosticoPrincipal,
      risco_avc: riscoAvc,
      componentes_hints: {
        head_impulse: headImpulse,
        nistagmo: nistagmo,
        test_of_skew: testOfSkew,
        perda_auditiva_plus: perdaAuditivaAguda
      },
      achados_centrais: achadosCentrais,
      achadosCentrais: achadosCentrais,
      achados_perifericos: achadosPerifericos,
      achadosPerifericos: achadosPerifericos,
      condutas_beira_leito: condutas,
      condutas: condutas,
      red_flags: redFlags,
      redFlags: redFlags,
      bloqueios_iatrogenia: bloqueiosIatrogenia,
      bloqueiosIatrogenia: bloqueiosIatrogenia
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. EPISTAXE AGUDA NO PRONTO-SOCORRO (ALGORITMO ESCALONADO)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avalia a epistaxe aguda e determina o protocolo escalonado beira-leito:
   * Anterior (Plexo de Kiesselbach) vs Posterior (Plexo de Woodruff / Artéria Esfenopalatina)
   * Cauterização com nitrato de prata, tamponamento anterior e sonda de Foley com água destilada.
   * 
   * @param {Object} p Parâmetros clínicos de sangramento nasal
   * @returns {Object} Classificação anatômica, passos imediatos, técnica de tamponamento e bloqueios
   */
  function avaliarEpistaxe(p) {
    p = p || {};
    var texto = (String(p.texto || "") + " " + String(p.descricao || "") + " " + String(p.condicoes || "")).toLowerCase();

    var localizacao = p.localizacao || "";
    if (!localizacao) {
      if (/(?:posterior|orofaringe|escorre pela garganta|engolindo sangue|coanas|woodruff|sangramento profuso posterior)/i.test(texto)) {
        localizacao = "posterior";
      } else if (/(?:anterior|kiesselbach|narina|septo anterior|área de little|area de little)/i.test(texto)) {
        localizacao = "anterior";
      } else {
        localizacao = "indeterminada"; // 90% são anteriores
      }
    }

    var paSistolica = parseFloat(p.paSistolica || p.pas || 0);
    var paDiastolica = parseFloat(p.paDiastolica || p.pad || 0);
    var usoAnticoagulante = String(p.anticoagulante || p.anticoagulacao || "").toLowerCase();
    if (!usoAnticoagulante) {
      if (/(?:varfarina|marevan|coumadin)/i.test(texto)) usoAnticoagulante = "varfarina";
      else if (/(?:rivaroxabana|xarelto|apixabana|eliquis|dabigatrana|pradaxa|edoxabana|lixiana|doac)/i.test(texto)) usoAnticoagulante = "doac";
      else if (/(?:aas|aspirina|clopidogrel|plavix|ticagrelor|brilinta)/i.test(texto)) usoAnticoagulante = "antiagregante";
    }

    var rni = parseFloat(p.rni || 0);
    var choque = !!(p.choque || /(?:choque|hipotens[aã]o|sudorese fria|rebaixamento|pas < 90|taquicardia severa)/i.test(texto));
    var tempoMinutos = parseInt(p.tempoMinutos || 0, 10);
    var falhaCompressao = !!(p.falhaCompressao || /(?:falha de compress[aã]o|n[aã]o para com compress[aã]o|persistente ap[oó]s 15 min)/i.test(texto));
    var falhaTamponamentoAnterior = !!(p.falhaTamponamentoAnterior || /(?:falha do tamponamento anterior|sangrando mesmo com merocel|sangramento posterior ativo com tamp[aã]o anterior)/i.test(texto));

    if (falhaTamponamentoAnterior) {
      localizacao = "posterior";
    }

    var classificacaoAnatomica = localizacao === "posterior" ? "Epistaxe Posterior (5 a 10% dos casos)" : "Epistaxe Anterior (90 a 95% dos casos)";
    var topografiaProvavel = localizacao === "posterior" ? "Plexo de Woodruff / Ramos da Artéria Esfenopalatina" : "Plexo de Kiesselbach (Área de Little no septo anterior)";

    var condutas = [];
    var tecnicaTamponamento = [];
    var alertasSeguranca = [];
    var bloqueiosIatrogenia = [];

    // Passo 0: Estabilização Hemodinâmica
    if (choque || (paSistolica > 0 && paSistolica < 90)) {
      alertasSeguranca.push("🚨 ALERTA CRÍTICO: Paciente em choque hipovolêmico ou instabilidade hemodinâmica por sangramento profuso!");
      condutas.push("0. RESSUSCITAÇÃO HEMODINÂMICA IMEDIATA:");
      condutas.push("   - 2 acessos venosos periféricos calibrosos (14G ou 16G).");
      condutas.push("   - Expansão rápida com Ringer Lactato ou SF 0,9% aquecido.");
      condutas.push("   - Tipagem sanguínea, hemograma completo, coagulograma (TP/TTPa/RNI e plaquetas).");
      condutas.push("   - Acionar reserva de concentrado de hemácias se sangramento incoercível.");
    }

    // Passo 1: Posição Correta do Paciente
    condutas.push("1. POSICIONAMENTO IMEDIATO E LIMPEZA:");
    condutas.push("   - Sentar o paciente com a cabeça e tronco LEVEMENTE INCLINADOS PARA A FRENTE.");
    condutas.push("   - Instruir a respirar pela boca e cuspir qualquer sangue na cuba rim.");
    condutas.push("   - Solicitar que assoe o nariz SUAVEMENTE uma única vez para expelir coágulos volumosos que mantêm fibrinólise local.");

    bloqueiosIatrogenia.push("🛑 REGRA DE OURO MANDATÓRIA: NUNCA reclinar a cabeça do paciente para trás ou deitá-lo em decúbito dorsal! A inclinação posterior desvia o fluxo para a faringe, causando deglutição maciça de sangue (náuseas/êmese hematêmese) e risco crítico de broncoaspiração!");

    // Passo 2: Compressão Bidigital
    condutas.push("");
    condutas.push("2. COMPRESSÃO BIDIGITAL DIRETA:");
    condutas.push("   - Comprimir firmemente as ASAS NASAIS (porção cartilaginosa flexível e anterior, NÃO sobre o osso nasal rígido).");
    condutas.push("   - Manter compressão contínua por 10 a 15 MINUTOS ININTERRUPTOS cronometrados no relógio (sem soltar antes para checar).");
    condutas.push("   - Colocar compressa fria ou gelo sobre a fronte e dorso do nariz (vasoconstrição reflexa).");

    // Passo 3: Vasoconstritor Tópico
    condutas.push("");
    condutas.push("3. VASOCONSTRITOR E ANESTÉSICO TÓPICO:");
    condutas.push("   - Se o sangramento persistir após 15 minutos de compressão:");
    condutas.push("   - Introduzir mecha de algodão embebida em Oximetazolina 0,05% ou Adrenalina 1:1000 diluída (1 mL de adrenalina + 9 mL de SF 0,9% ou Lidocaína 2% sem vaso).");
    condutas.push("   - Comprimir novamente por mais 5 a 10 minutos.");

    // Passo 4: Cauterização Química Anterior
    if (localizacao === "anterior" || localizacao === "indeterminada") {
      condutas.push("");
      condutas.push("4. CAUTERIZAÇÃO QUÍMICA ANTERIOR COM NITRATO DE PRATA 75%:");
      condutas.push("   - Indicada se vaso sangrante puntiforme anterior for claramente visualizado após aspiração/limpeza da mecha.");
      condutas.push("   - Aplicar bastonete de Nitrato de Prata por 3 a 5 segundos em círculos concêntricos de fora para o centro do ponto sangrante.");
      condutas.push("   - Limpar excesso de resíduo químico imediatamente para evitar escorrimento.");

      bloqueiosIatrogenia.push("🛑 BLOQUEIO DE SEGURANÇA MÁXIMO: NUNCA cauterizar os dois lados do septo nasal na mesma sessão! A cauterização septal bilateral provoca isquemia da cartilagem quadrangular e necrose com PERFURAÇÃO PERMANENTE DO SEPTO NASAL!");
    }

    // Passo 5: Tamponamento Anterior
    if (localizacao === "anterior" || falhaCompressao || localizacao === "indeterminada") {
      condutas.push("");
      condutas.push("5. TAMPONAMENTO NASAL ANTERIOR (SE FALHA DE CAUTERIZAÇÃO):");
      condutas.push("   - Esponja expansível de álcool polivinílico (Merocel / PVA) lubrificada com pomada antibiótica e hidratada com 5 a 10 mL de SF 0,9% ou Ácido Tranexâmico; OU");
      condutas.push("   - Gaze vaselinada embebida em pomada antibiótica inserida em acordeão (pregueamento de baixo para cima ao longo do assoalho da fossa nasal).");
      condutas.push("   - Tempo de permanência: 24 a 48 horas (máximo 72h).");
      condutas.push("   - Antibioticoprofilaxia (Cefalexina 500 mg 6/6h ou Amoxicilina-Clavulanato 875/125 mg 12/12h VO) recomendada se tamponamento mantido > 48h para prevenção de Síndrome do Choque Tóxico (Staphylococcus aureus) e rinossinusite bacteriana.");
    }

    // Passo 6: Epistaxe Posterior e Sonda de Foley
    if (localizacao === "posterior" || falhaTamponamentoAnterior) {
      alertasSeguranca.push("⚠️ EPISTAXE POSTERIOR DETECTADA: Sangramento volumoso escorrendo profusamente pela orofaringe posterior mesmo com narinas comprimidas. Indicação mandatória de Tamponamento Posterior.");

      condutas.push("");
      condutas.push("6. TAMPONAMENTO POSTERIOR COM SONDA DE FOLEY (BEIRA-LEITO):");
      tecnicaTamponamento.push("• ESCOLHA DA SONDA: Sonda vesical de Foley de 12 Fr a 16 Fr com balonete de 30 mL.");
      tecnicaTamponamento.push("• TESTE PRÉVIO: Testar o balonete antes da introdução.");
      tecnicaTamponamento.push("• INTRODUÇÃO: Lubrificar generosamente com gel de lidocaína 2% ou vaselina. Introduzir a sonda rente ao assoalho nasal até a ponta ser visível no palato mole/orofaringe.");
      tecnicaTamponamento.push("• INSUFLAÇÃO: Insuflar o balonete com 5 a 10 mL de ÁGUA DESTILADA ESTÉRIL.");
      tecnicaTamponamento.push("• TRACIONAMENTO E ANCORAGEM: Tracionar suavemente a sonda para a frente até o balão travar firmemente na coana posterior.");
      tecnicaTamponamento.push("• COMPLEMENTAÇÃO ANTERIOR OBRIGATÓRIA: Realizar SEMPRE tamponamento anterior ipsilateral para fechar o espaço e fixar a ancoragem.");
      tecnicaTamponamento.push("• FIXAÇÃO EXTERNA: Fixar a sonda na abertura da narina com gaze acolchoada e presilha umbilical/clamp SEM comprimir a asa nasal ou a columela.");

      bloqueiosIatrogenia.push("🛑 REGRA TÉCNICA CRÍTICA DA SONDA DE FOLEY: Insuflar o balonete EXCLUSIVAMENTE com ÁGUA DESTILADA estéril! NUNCA usar Soro Fisiológico (o cloreto de sódio cristaliza e trava a válvula impedindo a desinsuflação) e NUNCA usar Ar (o balão perde volume prematuramente e escorrega para a orofaringe com risco de asfixia!).");
      bloqueiosIatrogenia.push("🛑 PREVENÇÃO DE NECROSE ALAR: NUNCA prender a presilha diretamente contra a cartilagem da asa ou columela nasal! A compressão isquêmica prolongada causa necrose avascular desfigurante e irreversível da narina.");
      bloqueiosIatrogenia.push("⚠️ ALERTA DO REFLEXO NASOPULMONAR: O tamponamento posterior estimula mecanicamente o nervo trigêmeo, podendo deflagrar bradiarritmias severas, broncoespasmo e hipóxia profunda! INTERNAÇÃO HOSPITALAR MANDATÓRIA com oximetria contínua e avaliação urgente da Otorrinolaringologia.");
    }

    // Manejo de Hipertensão Concomitante
    if (paSistolica >= 180 || paDiastolica >= 110) {
      alertasSeguranca.push("ℹ️ Hipertensão Arterial Severa associada (PA " + paSistolica + "x" + paDiastolica + " mmHg): Muito frequente por dor, ansiedade e estresse agudo.");
      bloqueiosIatrogenia.push("🛑 BLOQUEIO CLÍNICO: NUNCA baixar a pressão arterial abruptamente no PS com doses maciças de anti-hipertensivos! Quedas rápidas da PA em idosos hipertensos precipitam infarto do miocárdio e AVC isquêmico por hipoperfusão cerebral! Tratar primeiro o sangramento e a dor. Se PAS persistir > 180-200 mmHg após controle da dor e sangramento, titular medicação oral suave (Captopril 25 mg VO ou Clonidina 0,100 mg VO).");
    }

    // Manejo de Anticoagulantes e Antiagregantes
    if (usoAnticoagulante === "varfarina") {
      alertasSeguranca.push("💊 Paciente em uso de Varfarina:");
      if (rni > 3.5 || falhaTamponamentoAnterior || choque) {
        condutas.push("• CONDUTA HEMOSTÁTICA EM VARFARINA:");
        condutas.push("  - Suspender Varfarina.");
        condutas.push("  - Administrar Fitomenadiona (Vitamina K1) 10 mg IV lenta diluída em 100 mL de SF 0,9% em 30 min.");
        condutas.push("  - Se sangramento com risco à vida ou RNI muito elevado: Complexo Protrombínico (PCC 4 fatores) 25 a 50 UI/kg IV.");
      } else {
        condutas.push("• Varfarina com sangramento leve/controlado: Checar RNI atual, ajustar dose e evitar suspensões desnecessárias sem avaliação do risco trombótico.");
      }
    } else if (usoAnticoagulante === "doac") {
      alertasSeguranca.push("💊 Paciente em uso de DOAC (Anticoagulante Oral Direto):");
      condutas.push("• Suspender a próxima dose do anticoagulante.");
      condutas.push("• Priorizar hemostasia mecânica imediata (tamponamento anterior/posterior).");
      condutas.push("• Considerar Ácido Tranexâmico (Transamin) 1g IV em 10 minutos (ou tópico na mecha de algodão).");
    } else if (usoAnticoagulante === "antiagregante") {
      alertasSeguranca.push("💊 Paciente em uso de Antiagregante Plaquetário (AAS / Clopidogrel):");
      condutas.push("• Manter o antiagregante se paciente com stent coronariano recente (< 6-12 meses), salvo sangramento com choque ou risco de morte.");
      condutas.push("• Foco no controle mecânico local rigoroso (tamponamento e ácido tranexâmico tópico).");
    }

    return {
      sucesso: true,
      classificacao_anatomica: classificacaoAnatomica,
      topografia_provavel: topografiaProvavel,
      conduta_urgencia: localizacao === "posterior" ? "Tamponamento Posterior + Internação" : "Compressão / Cauterização / Tamponamento Anterior",
      passos_escalonados: condutas,
      passosEscalonados: condutas,
      tecnica_tamponamento_posterior: tecnicaTamponamento,
      tecnicaTamponamentoPosterior: tecnicaTamponamento,
      alertas_seguranca: alertasSeguranca,
      alertasSeguranca: alertasSeguranca,
      bloqueios_iatrogenia: bloqueiosIatrogenia,
      bloqueiosIatrogenia: bloqueiosIatrogenia,
      dados_paciente: {
        localizacao: localizacao,
        pa_sistolica: paSistolica,
        pa_diastolica: paDiastolica,
        anticoagulante: usoAnticoagulante,
        rni: rni,
        choque: choque
      }
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. FORMATADORES TELEGRAM
  // ───────────────────────────────────────────────────────────────────────────

  function formatarVertigemHintsTelegram(r) {
    var t = "🌀 *AVALIAÇÃO DE VERTIGEM & PROTOCOLO HINTS (BÁRÁNY/AHA)*\n";
    t += "───────────────────────────────\n";
    t += "📌 *Classificação:* *" + r.classificacao_final + "*\n";
    t += "🔍 *Diagnóstico Mais Provável:* " + r.diagnostico_provavel + "\n";
    t += "⚡ *Risco de AVC de Fossa Posterior:* *" + r.risco_avc + "*\n\n";

    t += "📋 *Achados do Exame HINTS:*\n";
    t += "• Head Impulse: " + (r.componentes_hints.head_impulse === "normal" ? "⚠️ NORMAL ('Normal is dangerous' -> SNC)" : r.componentes_hints.head_impulse === "anormal" ? "✅ Anormal (sacada corretiva -> Periférico)" : "Não informado") + "\n";
    t += "• Nistagmo: " + (r.componentes_hints.nistagmo === "bidirecional_ou_vertical" ? "⚠️ Bidirecional/Vertical/Rotatório (SNC)" : r.componentes_hints.nistagmo === "unidirecional_horizontal" ? "✅ Unidirecional horizontal (Periférico)" : "Não informado") + "\n";
    t += "• Test of Skew: " + (r.componentes_hints.test_of_skew === "alterado" ? "⚠️ Desvio Vertical presente (SNC)" : r.componentes_hints.test_of_skew === "normal" ? "✅ Sem desvio vertical" : "Não informado") + "\n";
    t += "• Audição Súbita (HINTS-Plus): " + (r.componentes_hints.perda_auditiva_plus ? "🚨 PERDA AUDITIVA SÚBITA NOVA (AICA)" : "Preservada / Sem queixas") + "\n\n";

    if (r.red_flags && r.red_flags.length > 0) {
      t += "🚨 *Alertas Críticos & Neuroimagem:*\n";
      r.red_flags.forEach(function (rf) { t += rf + "\n"; });
      t += "\n";
    }

    t += "🩺 *Conduta Beira-Leito (PS / UBS):*\n";
    r.condutas_beira_leito.forEach(function (c) { t += c + "\n"; });
    t += "\n";

    if (r.bloqueios_iatrogenia && r.bloqueios_iatrogenia.length > 0) {
      t += "🛑 *Bloqueios de Iatrogenia:*\n";
      r.bloqueios_iatrogenia.forEach(function (b) { t += b + "\n"; });
    }

    return t.trim();
  }

  function formatarEpistaxeTelegram(r) {
    var t = "🩸 *MANEJO ESCALONADO DE EPISTAXE AGUDA NO PS*\n";
    t += "───────────────────────────────\n";
    t += "📌 *Classificação:* *" + r.classificacao_anatomica + "*\n";
    t += "📍 *Topografia:* " + r.topografia_provavel + "\n";
    t += "🎯 *Conduta de Urgência:* *" + r.conduta_urgencia + "*\n\n";

    t += "🪜 *Passos Escalonados Beira-Leito:*\n";
    r.passos_escalonados.forEach(function (p) { t += p + "\n"; });
    t += "\n";

    if (r.tecnica_tamponamento_posterior && r.tecnica_tamponamento_posterior.length > 0) {
      t += "🎈 *Técnica da Sonda de Foley (Epistaxe Posterior):*\n";
      r.tecnica_tamponamento_posterior.forEach(function (tp) { t += tp + "\n"; });
      t += "\n";
    }

    if (r.alertas_seguranca && r.alertas_seguranca.length > 0) {
      t += "⚠️ *Alertas Clínicos & Comorbidades:*\n";
      r.alertas_seguranca.forEach(function (a) { t += a + "\n"; });
      t += "\n";
    }

    if (r.bloqueios_iatrogenia && r.bloqueios_iatrogenia.length > 0) {
      t += "🛑 *Bloqueios de Iatrogenia & Regras de Ouro:*\n";
      r.bloqueios_iatrogenia.forEach(function (b) { t += b + "\n"; });
    }

    return t.trim();
  }

  return {
    avaliarVertigemHints: avaliarVertigemHints,
    avaliarEpistaxe: avaliarEpistaxe,
    formatarVertigemHintsTelegram: formatarVertigemHintsTelegram,
    formatarEpistaxeTelegram: formatarEpistaxeTelegram
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = OtorrinoEpistaxeVertigemService;
}
