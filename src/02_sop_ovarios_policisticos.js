/**
 * ==============================================================================
 * MÓDULO 02: SÍNDROME DOS OVÁRIOS POLICÍSTICOS (SOP)
 * ==============================================================================
 * Motor determinístico de alta fidelidade clínica e farmacológica para o manejo da
 * Síndrome dos Ovários Policísticos (SOP / PCOS), fundamentado nas seguintes diretrizes:
 *  - Critérios de Consenso Internacional de Roterdã (Rotterdam 2003 / ESHRE / ASRM).
 *  - International Evidence-based Guideline for the Assessment and Management of
 *    Polycystic Ovary Syndrome (ESHRE / ASRM / Monash 2023 & 2018).
 *  - FEBRASGO: Tratado de Ginecologia e Manuais de Endocrinologia Ginecológica.
 *  - Diretrizes da Sociedade Brasileira de Diabetes (SBD) e IDF para Risco Metabólico.
 *
 * PILARES CLÍNICOS DETERMINÍSTICOS:
 * 1. Diagnóstico de Alta Acurácia pelos Critérios de Roterdã (mínimo 2 de 3):
 *    - Hiperandrogenismo (Clínico: Ferriman-Gallwey >= 8, alopecia, acne grave;
 *      e/ou Bioquímico: Testosterona total, Testosterona livre, FAI, DHEA-S).
 *    - Disfunção Ovulatória: Oligomenorreia (> 35 dias ou < 8 ciclos/ano), amenorreia (> 90 dias)
 *      ou anovulação crônica comprovada. Consideração estrita para adolescentes (< 3 anos pós-menarca).
 *    - Morfologia Ovariana Policística (PCOM): USG transvaginal com contagem folicular >= 20 folículos
 *      de 2-9 mm por ovário e/ou volume ovariano aumentado >= 10 cm³; ou AMH elevado em adultas.
 * 2. Fenotipagem Completa de Roterdã (Fenótipos A, B, C e D):
 *    - Fenótipo A (Completo: HA + DO + PCOM) - maior morbidade metabólica.
 *    - Fenótipo B (Clássico anovulatório: HA + DO).
 *    - Fenótipo C (Ovulatório: HA + PCOM).
 *    - Fenótipo D (Não-hiperandrogênico: DO + PCOM) - menor impacto metabólico.
 * 3. Auditoria Mandatória de Exclusões e Diagnósticos Diferenciais:
 *    - Tireoidopatia (TSH).
 *    - Hiperprolactinemia (Prolactina).
 *    - Hiperplasia Adrenal Congênita Não Clássica (17-OH-Progesterona matinal < 2 ng/mL normal,
 *      2-10 ng/mL zona cinzenta com ACTH obrigatório, > 10 ng/mL diagnóstico confirmado).
 *    - Síndrome de Cushing (estigmas clínicos com rastreio de cortisol).
 *    - Tumores secretores de androgênios (virilização rápida, testo > 150-200 ng/dL ou DHEA-S > 700 mcg/dL).
 *    - Gestação (Beta-hCG).
 * 4. Estratificação de Risco Metabólico, Cardiovascular e Endometrial:
 *    - TTGO 75g com 2 horas (padrão-ouro em SOP), Glicemia de jejum, HOMA-IR e HbA1c.
 *    - Síndrome Metabólica pelos critérios ATP III / IDF (>= 3 critérios).
 *    - Rastreio de Esteatose Hepática (MASLD) e dislipidemia aterogênica.
 *    - Risco de hiperplasia e câncer endometrial por anovulação e exposição estrogênica desprovida de oposição.
 * 5. Conduta Terapêutica Dirigida e Farmacologia Personalizada:
 *    - Estilo de Vida (não farmacológico): meta de 5-10% de perda de peso, exercício >= 150 min/sem.
 *    - Paciente com Desejo Reprodutivo: Letrozol de 1ª linha (superior ao Clomifeno), Metformina
 *      adjuvante se IMC >= 25, Ácido Fólico pré-concepcional e BLOQUEIO ABSOLUTO de antiandrogênicos teratogênicos.
 *    - Paciente sem Desejo Reprodutivo: Anticoncepcionais combinados antiandrogênicos (Drospirenona,
 *      Ciproterona, Dienogeste); se contraindicação a estrogênios (OMS MEC 3/4), uso de Progestagênio
 *      cíclico protetor (Didrogesterona) ou SIU-LNG; Espironolactona para hirsutismo resistente
 *      com contracepção obrigatória; e Metformina para resistência insulínica e prevenção de DM2.
 * ==============================================================================
 */

var SopOvariosPolicisticosService = (function() {
  'use strict';

  // ───────────────────────────────────────────────────────────────────────────
  // 1. CONSTANTES E CATÁLOGO FARMACOLÓGICO (ESHRE / ASRM / FEBRASGO)
  // ───────────────────────────────────────────────────────────────────────────

  var CATALOGO_FARMACOLOGICO = {
    // Indutores de Ovulação (Desejo Reprodutivo)
    INDUCAO_OVULACAO: {
      LETROZOL: {
        farmaco: 'Letrozol (Inibidor da Aromatase de 3ª Geração)',
        posologiaPadrao: '2,5 mg VO 1x/dia por 5 dias consecutivos (iniciar do 3º ao 7º dia do ciclo espontâneo ou induzido)',
        titulacao: 'Se anovulação persistente em ultrassonografia seriada ou dosagem de progesterona, titular para 5,0 mg/dia e até 7,5 mg/dia em ciclos subsequentes.',
        linhaGuia: '1ª Linha Internacional Mandatória (ESHRE/ASRM 2023)',
        mecanismo: 'Inibe a conversão de androgênios em estrogênios no SNC e ovário, liberando o eixo hipotálamo-hipofisário para secreção pulsátil de FSH sem bloquear receptores de estrogênio periféricos.',
        vantagensClinicas: 'Superior ao Citrato de Clomifeno em taxas de ovulação cumulativa, gestação única e nascidos vivos, com menor afinidade endometrial e taxa significativamente menor de gestação múltipla.'
      },
      CLOMIFENO: {
        farmaco: 'Citrato de Clomifeno (SERM)',
        posologiaPadrao: '50 mg VO 1x/dia por 5 dias (do 3º ao 7º ou 5º ao 9º dia do ciclo)',
        titulacao: 'Pode ser titulado para 100 mg a 150 mg/dia se falha ovulatória na dose inicial.',
        linhaGuia: '2ª Linha (Alternativa se indisponibilidade ou falha de Letrozol)',
        mecanismo: 'Antagonista competitivo de receptores de estrogênio hipotalâmicos, estimulando liberação de GnRH e FSH.',
        desvantagens: 'Efeito antiestrogênico no endométrio (afinamento endometrial) e no muco cervical; maior risco de gestação múltipla (5-8%).'
      }
    },

    // Anticoncepcionais Hormonais Combinados (Sem Desejo Reprodutivo - Proteção Endometrial)
    AHC_COMBINADOS: {
      DROSPIRENONA_EE: {
        nome: 'Etinilestradiol (20 a 30 mcg) + Drospirenona (3 mg)',
        perfil: 'Excelente perfil metabólico, efeito antimineralocorticoide e antiandrogênico',
        indicacao: '1ª Escolha em pacientes com SOP, retenção hídrica, acne leve a moderada e sobrepeso.',
        posologia: '1 comprimido VO ao dia por 21 ou 24 dias, com intervalo de 7 ou 4 dias.'
      },
      CIPROTERONA_EE: {
        nome: 'Etinilestradiol (35 mcg) + Acetato de Ciproterona (2 mg)',
        perfil: 'Potente ação antiandrogênica periférica (antagonista competitivo de receptor de androgênio)',
        indicacao: 'Hirsutismo moderado a grave e acne vulgar nódulo-cística persistente.',
        alertaSeguranca: 'Maior risco de TEV relativo que outras formulações. Usar pelo menor tempo necessário e trocar para Drospirenona após controle dos sintomas androgênicos cutâneos.',
        posologia: '1 comprimido VO ao dia por 21 dias seguido de 7 dias de intervalo.'
      },
      DIENOGESTE_EE: {
        nome: 'Etinilestradiol (30 mcg) + Dienogeste (2 mg)',
        perfil: 'Progestagênio derivado da 19-nortestosterona com potente atividade antiandrogênica e excelente tolerância endometrial',
        indicacao: 'SOP com irregularidade menstrual e manifestações androgênicas cutâneas.',
        posologia: '1 comprimido VO ao dia por 21 dias seguido de 7 dias de intervalo.'
      }
    },

    // Proteção Endometrial Alternativa (Contraindicação a Estrogênios - MEC 3/4 OMS)
    PROTECAO_PROGESTAGENIO_ISOLADO: {
      DIDROGESTERONA_CICLICA: {
        farmaco: 'Didrogesterona 10 mg',
        posologia: '10 mg a 20 mg VO 1x/dia por 12 a 14 dias por mês (ex: dias 14 a 27 do ciclo menstrual induzido)',
        objetivo: 'Induzir descamação secretora endometrial regular, prevenir hiperplasia e adenocarcinoma endometrial sem suprimir ovulação ou alterar metabolismo glicídico.'
      },
      PROGESTERONA_MICRONIZADA: {
        farmaco: 'Progesterona Micronizada 200 mg',
        posologia: '200 mg VO ao deitar por 12 a 14 dias a cada mês.',
        objetivo: 'Proteção endometrial natural neutra metabolicamente.'
      },
      SIU_LEVONORGESTREL: {
        farmaco: 'Sistema Intrauterino Liberador de Levonorgestrel 52 mg (Mirena)',
        posologia: 'Inserção intrauterina ambulatorial com duração de até 8 anos para contracepção e proteção endometrial.',
        objetivo: 'Potente atrofia endometrial local com absorção sistêmica mínima, prevenindo com máxima eficácia a hiperplasia endometrial em pacientes anovulatórias.'
      }
    },

    // Antiandrogênicos Periféricos (Hirsutismo e Alopecia)
    ANTIANDROGENICOS: {
      ESPIRONOLACTONA: {
        farmaco: 'Espironolactona',
        doseInicial: '50 mg VO 1x/dia (titular para 100 mg a 200 mg/dia divididos em 1 a 2 tomadas)',
        mecanismo: 'Bloqueador competitivo do receptor de androgênio e inibidor discreto da 5-alfa-redutase e síntese ovariana/adrenal de androgênios.',
        alertaCritico: '⚠️ CONTRAINDICAÇÃO ABSOLUTA NA GRAVIDEZ / TENTATIVA DE CONCEPÇÃO: Risco de teratogenicidade e feminização de feto do sexo masculino. EXIGE CONTRACEPÇÃO EFICAZ CONCOMITANTE. Monitorar potássio sérico (risco de hipercalemia se associado a IECA/BRA ou disfunção renal).'
      },
      FINASTERIDA: {
        farmaco: 'Finasterida',
        doseInicial: '2,5 mg a 5,0 mg VO 1x/dia',
        mecanismo: 'Inibidor seletivo da enzima 5-alfa-redutase tipo 2, bloqueando a conversão de testosterona em di-hidrotestosterona (DHT).',
        alertaCritico: '⚠️ RISCO TERATOGÊNICO GRAVE: Contraindicada sem contracepção estrita. Reservada para casos refratários à Espironolactona.'
      }
    },

    // Manejo Metabólico / Resistência à Insulina
    METABOLICO: {
      METFORMINA: {
        farmaco: 'Cloridrato de Metformina (preferencialmente formulação XR - Liberação Prolongada)',
        posologiaInicial: '500 mg VO ao dia imediatamente após o jantar por 7 a 14 dias',
        titulacao: 'Aumentar semanalmente 500 mg até atingir a dose alvo de 1.500 mg a 2.000 mg/dia (ex: 1.000 mg 12/12h ou 2.000 mg no jantar na forma XR) para minimizar efeitos adversos gastrointestinais.',
        indicacoesSop: 'IMC >= 25 kg/m², pré-diabetes (glicemia jejum 100-125 ou TTGO 2h 140-199 mg/dL), resistência insulínica documentada (HOMA-IR > 2.5), síndrome metabólica, ou adjuvante na indução ovulatória.',
        mecanismo: 'Ativa AMPK hepática, inibe gliconeogênese, melhora captação periférica de glicose, reduz hiperinsulinemia compensatória, atenuando a produção de androgênios pelas células da teca e aumentando SHBG circulante.'
      }
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 2. AVALIAÇÃO DOS CRITÉRIOS DE ROTERDÃ (2003 / ESHRE 2023 / ASRM)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avalia os 3 critérios de Roterdã e determina o fenótipo da paciente.
   *
   * @param {Object} dados
   * @param {number} [dados.escoreFerrimanGallwey] (escore mFG, normal < 8)
   * @param {boolean} [dados.hirsutismoClinico]
   * @param {boolean} [dados.alopeciaAndrogenica]
   * @param {boolean} [dados.acneGravePersistente]
   * @param {number} [dados.testosteronaTotal] (ng/dL, ref normal < 50-60 ng/dL)
   * @param {number} [dados.testosteronaLivre] (pg/mL)
   * @param {number} [dados.shbg] (nmol/L)
   * @param {number} [dados.indiceAndrogeniosLivres] (FAI / FTI em %)
   * @param {number} [dados.dheaS] (mcg/dL, ref normal < 350-400 mcg/dL)
   * @param {number} [dados.androstenediona] (ng/mL)
   * @param {boolean} [dados.hiperandrogenismoLaboratorial]
   * @param {number} [dados.intervaloCicloDias] (dias médios entre menstruações, > 35 indica oligomenorreia)
   * @param {number} [dados.ciclosPorAno] (< 8 indica oligomenorreia)
   * @param {boolean} [dados.amenorreia] (ausência de ciclos por > 90 dias)
   * @param {boolean} [dados.oligomenorreia]
   * @param {boolean} [dados.anovulacaoDocumentada] (progesterona de fase lútea < 3 ng/mL)
   * @param {number} [dados.anosPosMenarca] (anos desde a menarca, relevante para adolescentes)
   * @param {number} [dados.idade]
   * @param {number} [dados.contagemFolículosPorOvario] (FNPO, >= 20 folículos de 2-9mm)
   * @param {number} [dados.volumeOvarianoMaximo] (cm³ ou mL, >= 10 cm³)
   * @param {boolean} [dados.morfologiaPolicisticaUsg]
   * @param {number} [dados.amh] (Hormônio Antimülleriano em ng/mL ou pmol/L, alternativa em adultas)
   * @returns {Object} Avaliação detalhada de Roterdã com fenótipo e pontuação
   */
  function avaliarCriteriosRotterda(dados) {
    dados = dados || {};
    var idade = Number(dados.idade || 25);
    var anosPosMenarca = dados.anosPosMenarca !== undefined ? Number(dados.anosPosMenarca) : null;
    var eAdolescente = (idade < 20) || (anosPosMenarca !== null && anosPosMenarca < 3);

    // CRITÉRIO 1: HIPERANDROGENISMO (HA - Clínico ou Laboratorial)
    var achadosHaClinico = [];
    var achadosHaLaboratorial = [];

    // Avaliação Clínica
    var mfg = Number(dados.escoreFerrimanGallwey);
    if (!isNaN(mfg)) {
      if (mfg >= 8) {
        achadosHaClinico.push('Hirsutismo clínico significativo (Escore Ferriman-Gallwey modificado = ' + mfg + ' >= 8)');
      }
    } else if (dados.hirsutismoClinico) {
      achadosHaClinico.push('Hirsutismo clínico evidente em áreas androgênio-dependentes');
    }

    if (dados.alopeciaAndrogenica) {
      achadosHaClinico.push('Alopecia de padrão androgenético feminino (rarefação fronto-parietal)');
    }

    if (dados.acneGravePersistente) {
      achadosHaClinico.push('Acne vulgar moderada a grave persistente ou resistente a tratamentos tópicos');
    }

    // Avaliação Laboratorial / Bioquímica
    var testoTotal = Number(dados.testosteronaTotal);
    if (!isNaN(testoTotal) && testoTotal > 50) {
      achadosHaLaboratorial.push('Testosterona total elevada (' + testoTotal + ' ng/dL > 50 ng/dL)');
    }

    var shbg = Number(dados.shbg);
    var fai = Number(dados.indiceAndrogeniosLivres);
    if (isNaN(fai) && !isNaN(testoTotal) && !isNaN(shbg) && shbg > 0) {
      // FAI = [Testosterona Total (nmol/L) / SHBG (nmol/L)] * 100
      // Conversão ng/dL de testosterona para nmol/L: multiplicar por 0.03467
      fai = ((testoTotal * 0.03467) / shbg) * 100;
    }
    if (!isNaN(fai) && fai > 4.5) {
      achadosHaLaboratorial.push('Índice de Androgênios Livres (FAI) elevado (' + fai.toFixed(1) + '% > 4.5%)');
    }

    var dheaS = Number(dados.dheaS);
    if (!isNaN(dheaS) && dheaS > 350) {
      achadosHaLaboratorial.push('DHEA-S sérico elevado (' + dheaS + ' mcg/dL > 350 mcg/dL)');
    }

    var androst = Number(dados.androstenediona);
    if (!isNaN(androst) && androst > 2.5) {
      achadosHaLaboratorial.push('Androstenediona sérica elevada (' + androst + ' ng/mL > 2.5 ng/mL)');
    }

    if (dados.hiperandrogenismoLaboratorial && achadosHaLaboratorial.length === 0) {
      achadosHaLaboratorial.push('Hiperandrogenismo laboratorial confirmado em dosagens hormonais prévias');
    }

    var temHaClinico = achadosHaClinico.length > 0;
    var temHaLaboratorial = achadosHaLaboratorial.length > 0;
    var temHiperandrogenismo = temHaClinico || temHaLaboratorial;

    // CRITÉRIO 2: DISFUNÇÃO OVULATÓRIA (DO - Oligo/Anovulação)
    var achadosDo = [];
    var intervaloDias = Number(dados.intervaloCicloDias);
    var ciclosAno = Number(dados.ciclosPorAno);

    if (dados.amenorreia) {
      achadosDo.push('Amenorreia secundária (ausência de ciclos menstruais por > 90 dias seguidos)');
    } else if (!isNaN(intervaloDias) && intervaloDias > 35) {
      achadosDo.push('Oligomenorreia com ciclos infrequentes (intervalo de ' + intervaloDias + ' dias > 35 dias)');
    } else if (!isNaN(intervaloDias) && intervaloDias < 21) {
      achadosDo.push('Ciclos polimenorreicos curtos e frequentemente anovulatórios (' + intervaloDias + ' dias < 21 dias)');
    }

    if (!isNaN(ciclosAno) && ciclosAno < 8) {
      achadosDo.push('Menos de 8 ciclos menstruais por ano (' + ciclosAno + ' ciclos/ano)');
    }

    if (dados.oligomenorreia && achadosDo.length === 0) {
      achadosDo.push('Irregularidade menstrual com padrão de oligomenorreia documentado');
    }

    if (dados.anovulacaoDocumentada) {
      achadosDo.push('Anovulação confirmada laboratorialmente por progesterona de fase lútea reduzida');
    }

    var temDisfuncaoOvulatoria = achadosDo.length > 0;

    // Alerta de Ciclos Irregulares Fisiológicos em Adolescentes
    var alertaAdolescente = null;
    if (eAdolescente) {
      alertaAdolescente = '⚠️ PACIENTE ADOLESCENTE (< 3 anos pós-menarca): Ciclos irregulares e anovulatórios são frequentes e fisiológicos pela imaturidade do eixo hipotálamo-hipófise-ovariano. As diretrizes ESHRE/ASRM 2023 determinam que o diagnóstico de SOP em adolescentes exige OBRIGATORIAMENTE tanto Hiperandrogenismo quanto Disfunção Ovulatória persistente por > 1-2 anos, NÃO devendo o critério ultrassonográfico ser utilizado de forma isolada.';
    }

    // CRITÉRIO 3: MORFOLOGIA OVARIANA POLICÍSTICA (PCOM)
    var achadosPcom = [];
    var foliculos = Number(dados.contagemFolículosPorOvario);
    var volumeOvario = Number(dados.volumeOvarianoMaximo);
    var amh = Number(dados.amh);

    if (!isNaN(foliculos) && foliculos >= 20) {
      achadosPcom.push('Contagem de folículos antrais por ovário (FNPO) >= 20 folículos de 2-9 mm (' + foliculos + ' folículos)');
    }

    if (!isNaN(volumeOvario) && volumeOvario >= 10) {
      achadosPcom.push('Volume ovariano aumentado >= 10 cm³ / mL (' + volumeOvario.toFixed(1) + ' cm³)');
    }

    if (dados.morfologiaPolicisticaUsg && achadosPcom.length === 0) {
      achadosPcom.push('Morfologia ovariana policística identificada em ultrassonografia pélvica/transvaginal');
    }

    // Alternativa Bioquímica: AMH elevado em adultas (ESHRE 2023)
    if (!isNaN(amh) && amh >= 4.5 && !eAdolescente) {
      achadosPcom.push('Hormônio Antimülleriano (AMH) elevado (' + amh + ' ng/mL >= 4.5 ng/mL - substituto ultrassonográfico em adultas)');
    }

    var temPcom = achadosPcom.length > 0;

    // Em adolescentes, PCOM isolado não é critério diagnóstico confiável
    if (eAdolescente && temPcom && !temHaLaboratorial && !temHaClinico) {
      achadosPcom.push('(Nota: achado de ovários multifoliculares é fisiológico na adolescência e tem valor limitado)');
    }

    // SOMA DOS CRITÉRIOS ATENDIDOS
    var contagemCriterios = 0;
    if (temHiperandrogenismo) contagemCriterios++;
    if (temDisfuncaoOvulatoria) contagemCriterios++;
    if (temPcom) contagemCriterios++;

    var criteriosAtendidos = contagemCriterios >= 2;
    var fenotipo = 'NENHUM';
    var nomeFenotipo = '';
    var descricaoFenotipo = '';

    if (temHiperandrogenismo && temDisfuncaoOvulatoria && temPcom) {
      fenotipo = 'FENOTIPO_A';
      nomeFenotipo = 'Fenótipo A (Clássico Completo)';
      descricaoFenotipo = 'Presença de Hiperandrogenismo (clínico/laboratorial) + Disfunção Ovulatória + Morfologia Ovariana Policística ao USG. Apresenta o maior risco metabólico, hiperinsulinemia e esteatose hepática.';
    } else if (temHiperandrogenismo && temDisfuncaoOvulatoria && !temPcom) {
      fenotipo = 'FENOTIPO_B';
      nomeFenotipo = 'Fenótipo B (Clássico Anovulatório Não-Policístico)';
      descricaoFenotipo = 'Presença de Hiperandrogenismo + Disfunção Ovulatória, sem critérios ultrassonográficos de ovários policísticos. Risco metabólico substancial equivalente ao Fenótipo A.';
    } else if (temHiperandrogenismo && !temDisfuncaoOvulatoria && temPcom) {
      fenotipo = 'FENOTIPO_C';
      nomeFenotipo = 'Fenótipo C (Ovulatório)';
      descricaoFenotipo = 'Presença de Hiperandrogenismo + Morfologia Ovariana Policística, porém com ciclos menstruais regulares. Perfil metabólico intermediário e fertilidade preservada.';
    } else if (!temHiperandrogenismo && temDisfuncaoOvulatoria && temPcom) {
      fenotipo = 'FENOTIPO_D';
      nomeFenotipo = 'Fenótipo D (Não-Hiperandrogênico)';
      descricaoFenotipo = 'Presença de Disfunção Ovulatória + Morfologia Ovariana Policística, sem hiperandrogenismo clínico ou laboratorial. Representa o fenótipo mais leve, com menor disfunção metabólica.';
    } else {
      fenotipo = 'CRITERIOS_INSUFICIENTES';
      nomeFenotipo = 'Critérios de Roterdã Insuficientes';
      descricaoFenotipo = 'Preenchido apenas ' + contagemCriterios + ' de 3 critérios de Roterdã. O diagnóstico formal de SOP exige no mínimo 2 critérios atendidos após exclusão estrita de outras patologias.';
    }

    return {
      criteriosAtendidos: criteriosAtendidos,
      contagemCriterios: contagemCriterios,
      totalCriteriosAvaliados: 3,
      fenotipo: fenotipo,
      nomeFenotipo: nomeFenotipo,
      descricaoFenotipo: descricaoFenotipo,
      criteriosDetalhados: {
        hiperandrogenismo: {
          presente: temHiperandrogenismo,
          clinico: temHaClinico,
          laboratorial: temHaLaboratorial,
          achadosClinicos: achadosHaClinico,
          achadosLaboratoriais: achadosHaLaboratorial
        },
        disfuncaoOvulatoria: {
          presente: temDisfuncaoOvulatoria,
          achados: achadosDo,
          eAdolescente: eAdolescente,
          alertaAdolescente: alertaAdolescente
        },
        morfologiaPolicistica: {
          presente: temPcom,
          achados: achadosPcom
        }
      }
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. AUDITORIA MANDATÓRIA DE EXCLUSÕES E DIAGNÓSTICOS DIFERENCIAIS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avalia a exclusão sistemática de endocrinopatias que mimetizam a SOP.
   *
   * @param {Object} dados
   * @param {number} [dados.tsh] (mIU/L, ref 0.4 a 4.5)
   * @param {number} [dados.prolactina] (ng/mL, ref < 25)
   * @param {number} [dados.progesterona17Oh] (17-OHP em ng/mL ou ng/dL)
   * @param {string} [dados.unidade17Oh] ('ng/ml' ou 'ng/dl', default 'ng/ml')
   * @param {boolean} [dados.estigmasCushing] (obesidade centrípeta, estrias largas violáceas, fácies cushingoide)
   * @param {number} [dados.cortisolPosDexametasona] (mcg/dL no teste de 1mg overnight)
   * @param {boolean} [dados.virilizacaoRapida] (início súbito de alopecia androgênica severa, clitoromegalia, voz grossa)
   * @param {number} [dados.testosteronaTotal] (ng/dL)
   * @param {number} [dados.dheaS] (mcg/dL)
   * @param {boolean} [dados.betaHcgNegativo]
   * @param {boolean} [dados.possibilidadeGestacao]
   * @returns {Object} Auditoria de diagnósticos diferenciais
   */
  function auditarDiagnosticosDiferenciais(dados) {
    dados = dados || {};
    var exclusoesAuditadas = [];
    var alertasCriticos = [];
    var pendenciasObrigatorias = [];
    var diagnosticoAlternativoProvavel = null;

    // 1. TSH (Tireoidopatias)
    var tsh = Number(dados.tsh);
    if (!isNaN(tsh)) {
      if (tsh > 4.5) {
        alertasCriticos.push('TSH ELEVADO (' + tsh.toFixed(2) + ' mIU/L > 4.5): Suspeita de Hipotireoidismo primário. O hipotireoidismo pode causar oligomenorreia/amenorreia e hiperprolactinemia reativa por aumento de TRH. Tratar disfunção tireoidiana antes de firmar SOP.');
        diagnosticoAlternativoProvavel = diagnosticoAlternativoProvavel || 'HIPOTIREOIDISMO';
      } else if (tsh < 0.4) {
        alertasCriticos.push('TSH SUPRIMIDO (' + tsh.toFixed(2) + ' mIU/L < 0.4): Suspeita de Hipertireoidismo. Investigar T4 livre e anticorpos anti-TSH (TRAB).');
        diagnosticoAlternativoProvavel = diagnosticoAlternativoProvavel || 'HIPERTIREOIDISMO';
      } else {
        exclusoesAuditadas.push('Tireoidopatia excluída com sucesso (TSH normal: ' + tsh.toFixed(2) + ' mIU/L)');
      }
    } else {
      pendenciasObrigatorias.push('TSH não informado: Exame mandatório para descartar disfunção tireoidiana.');
    }

    // 2. Prolactina (Hiperprolactinemia)
    var prolactina = Number(dados.prolactina);
    if (!isNaN(prolactina)) {
      if (prolactina > 25) {
        alertasCriticos.push('PROLACTINA ELEVADA (' + prolactina.toFixed(1) + ' ng/mL > 25): Suspeita de Hiperprolactinemia. Excluir uso de fármacos dopaminérgicos (antipsicóticos, metoclopramida), hipotireoidismo associado ou micro/macroadenoma hipofisário (solicitar RM de sela túrcica se persistente).');
        diagnosticoAlternativoProvavel = diagnosticoAlternativoProvavel || 'HIPERPROLACTINEMIA';
      } else {
        exclusoesAuditadas.push('Hiperprolactinemia descartada (Prolactina normal: ' + prolactina.toFixed(1) + ' ng/mL)');
      }
    } else {
      pendenciasObrigatorias.push('Prolactina não informada: Exame mandatório para descartar hiperprolactinemia.');
    }

    // 3. 17-OH-Progesterona (Hiperplasia Adrenal Congênita Não Clássica - HAC-NC)
    var oh17 = Number(dados.progesterona17Oh);
    var unidadeOh = String(dados.unidade17Oh || 'ng/ml').toLowerCase();
    if (!isNaN(oh17)) {
      // Normalização para ng/mL: se for ng/dL, dividir por 100
      var oh17NgMl = unidadeOh.includes('dl') ? (oh17 / 100) : oh17;

      if (oh17NgMl < 2.0) {
        exclusoesAuditadas.push('HAC Não Clássica (deficiência de 21-hidroxilase) descartada (17-OH-Progesterona = ' + oh17NgMl.toFixed(2) + ' ng/mL < 2.0 ng/mL)');
      } else if (oh17NgMl >= 2.0 && oh17NgMl <= 10.0) {
        alertasCriticos.push('17-OH-PROGESTERONA EM ZONA CINZENTA (' + oh17NgMl.toFixed(2) + ' ng/mL entre 2.0 e 10.0 ng/mL): Resultado inconclusivo. Indicação MANDATÓRIA de Teste de Estímulo com ACTH sintético (Cosintropina 250 mcg) para confirmação ou exclusão de HAC não clássica.');
      } else if (oh17NgMl > 10.0) {
        alertasCriticos.push('17-OH-PROGESTERONA DIAGNÓSTICA PARA HAC NÃO CLÁSSICA (' + oh17NgMl.toFixed(2) + ' ng/mL > 10.0 ng/mL): Confirma o diagnóstico de Hiperplasia Adrenal Congênita Não Clássica por deficiência de 21-hidroxilase. SOP EXCLUÍDA como causa primária. Encaminhar para acompanhamento endocrinológico.');
        diagnosticoAlternativoProvavel = 'HIPERPLASIA_ADRENAL_CONGENITA_NAO_CLASSICA';
      }
    } else {
      pendenciasObrigatorias.push('17-OH-Progesterona matinal não informada: Obrigatória para descartar HAC não clássica por deficiência de 21-hidroxilase.');
    }

    // 4. Síndrome de Cushing (Hipercortisolismo)
    var cortisolDexa = Number(dados.cortisolPosDexametasona);
    if (dados.estigmasCushing) {
      if (!isNaN(cortisolDexa)) {
        if (cortisolDexa >= 1.8) {
          alertasCriticos.push('CORTISOL NÃO SUPRIMIDO APÓS DEXAMETASONA 1MG (' + cortisolDexa.toFixed(1) + ' mcg/dL >= 1.8): Suspeita de Síndrome de Cushing associada aos estigmas clínicos. Prosseguir com cortisol livre urinário de 24h e cortisol salivar noturno.');
          diagnosticoAlternativoProvavel = diagnosticoAlternativoProvavel || 'SINDROME_DE_CUSHING';
        } else {
          exclusoesAuditadas.push('Síndrome de Cushing descartada pelo teste de supressão com 1mg de dexametasona (Cortisol ' + cortisolDexa.toFixed(1) + ' mcg/dL < 1.8)');
        }
      } else {
        pendenciasObrigatorias.push('Estigmas cushingoides presentes sem teste de supressão com dexametasona: Realizar triagem com 1mg de dexametasona overnight.');
      }
    }

    // 5. Neoplasias / Tumores Produtores de Androgênios (Adrenal / Ovariano)
    var testo = Number(dados.testosteronaTotal);
    var dhea = Number(dados.dheaS);
    if (dados.virilizacaoRapida || (!isNaN(testo) && testo > 150) || (!isNaN(dhea) && dhea > 700)) {
      alertasCriticos.push('⚠️ ALERTA VERMELHO ONCOLÓGICO: Sinais de virilização rápida ou níveis extremos de androgênios (Testosterona > 150 ng/dL ou DHEA-S > 700 mcg/dL). É MANDATÓRIO excluir neoplasia produtora de androgênio (tumor de células de Sertoli-Leydig ovariano ou carcinoma/adenoma adrenal). Solicitar USG pélvico com Doppler e TC/RM de adrenais com urgência!');
      diagnosticoAlternativoProvavel = 'TUMOR_PRODUTOR_DE_ANDROGENIOS';
    }

    // 6. Exclusão de Gestação
    if (dados.possibilidadeGestacao && !dados.betaHcgNegativo) {
      alertasCriticos.push('Amenorreia / Atraso menstrual sem exclusão formal de gestação: Realizar Beta-hCG urinário ou sérico imediatamente antes de qualquer prescrição hormonal.');
    }

    var diagnosticoDiferencialDescartado = (alertasCriticos.length === 0) && (pendenciasObrigatorias.length === 0);

    return {
      diagnosticoDiferencialDescartado: diagnosticoDiferencialDescartado,
      exclusoesAuditadas: exclusoesAuditadas,
      alertasCriticos: alertasCriticos,
      pendenciasObrigatorias: pendenciasObrigatorias,
      diagnosticoAlternativoProvavel: diagnosticoAlternativoProvavel
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. ESTRATIFICAÇÃO DE RISCO METABÓLICO, CARDIOVASCULAR E ENDOMETRIAL
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avalia fatores cardiometabólicos e risco de hiperplasia/câncer de endométrio.
   *
   * @param {Object} dados
   * @param {number} [dados.pesoKg]
   * @param {number} [dados.alturaCm]
   * @param {number} [dados.imc]
   * @param {number} [dados.circunferenciaAbdominalCm] (risco se >= 80 cm na América Latina)
   * @param {number} [dados.glicemiaJejum] (mg/dL)
   * @param {number} [dados.glicemia2hTtgo] (mg/dL no TTGO 75g de 2 horas)
   * @param {number} [dados.insulinaJejum] (mcU/mL)
   * @param {number} [dados.hba1c] (%)
   * @param {number} [dados.triglicerideos] (mg/dL)
   * @param {number} [dados.hdl] (mg/dL)
   * @param {number} [dados.pas] (Pressão Sistólica mmHg)
   * @param {number} [dados.pad] (Pressão Diastólica mmHg)
   * @param {boolean} [dados.hipertensaoTratada]
   * @param {boolean} [dados.acanthosisNigricans]
   * @param {boolean} [dados.esteatoseHepatica] (MASLD no USG)
   * @param {number} [dados.tempoAmenorreiaMeses] (meses sem sangramento e sem progestagênio)
   * @param {number} [dados.espessuraEndometrialMm] (espessura ao USG)
   * @returns {Object} Estratificação cardiometabólica e endometrial detalhada
   */
  function estratificarRiscoMetabolico(dados) {
    dados = dados || {};

    // 1. IMC e Perfil Antropométrico
    var imc = Number(dados.imc);
    var peso = Number(dados.pesoKg);
    var altura = Number(dados.alturaCm);
    if (isNaN(imc) && !isNaN(peso) && !isNaN(altura) && altura > 0) {
      var altM = altura / 100;
      imc = peso / (altM * altM);
    }

    var classificacaoImc = 'NÃO_INFORMADO';
    if (!isNaN(imc)) {
      if (imc < 18.5) classificacaoImc = 'BAIXO_PESO';
      else if (imc < 25) classificacaoImc = 'EUTRÓFICA';
      else if (imc < 30) classificacaoImc = 'SOBREPESO';
      else if (imc < 35) classificacaoImc = 'OBESIDADE_GRAU_I';
      else if (imc < 40) classificacaoImc = 'OBESIDADE_GRAU_II';
      else classificacaoImc = 'OBESIDADE_GRAU_III_MÓRBIDA';
    }

    var ca = Number(dados.circunferenciaAbdominalCm);
    var caAumentada = !isNaN(ca) && ca >= 80;

    // 2. Avaliação Glicêmica e TTGO 75g
    var glicemiaJejum = Number(dados.glicemiaJejum);
    var glicemia2h = Number(dados.glicemia2hTtgo);
    var hba1c = Number(dados.hba1c);
    var insulinaJejum = Number(dados.insulinaJejum);

    var statusGlicemico = 'NORMAL';
    var detalhesGlicemia = [];

    if (!isNaN(glicemia2h)) {
      if (glicemia2h >= 200) {
        statusGlicemico = 'DIABETES_MELLITUS';
        detalhesGlicemia.push('TTGO 75g 2h >= 200 mg/dL (' + glicemia2h + ' mg/dL): Critério confirmatório de Diabetes Mellitus');
      } else if (glicemia2h >= 140) {
        statusGlicemico = 'INTOLERANCIA_A_GLICOSE_PRE_DM';
        detalhesGlicemia.push('TTGO 75g 2h entre 140-199 mg/dL (' + glicemia2h + ' mg/dL): Intolerância à Glicose / Pré-Diabetes');
      } else {
        detalhesGlicemia.push('TTGO 75g 2h normal (' + glicemia2h + ' mg/dL < 140)');
      }
    } else {
      detalhesGlicemia.push('⚠️ TTGO 75g (2 horas) não realizado: O TTGO é o exame padrão-ouro recomendado pela ESHRE em mulheres com SOP devido à alta taxa de intolerância à glicose com glicemia de jejum falsamente normal.');
    }

    if (!isNaN(glicemiaJejum)) {
      if (glicemiaJejum >= 126) {
        statusGlicemico = 'DIABETES_MELLITUS';
        detalhesGlicemia.push('Glicemia de jejum >= 126 mg/dL (' + glicemiaJejum + ' mg/dL)');
      } else if (glicemiaJejum >= 100) {
        detalhesGlicemia.push('Glicemia de jejum alterada (' + glicemiaJejum + ' mg/dL: 100-125 mg/dL)');
        if (statusGlicemico === 'NORMAL') {
          statusGlicemico = 'GLICEMIA_JEJUM_ALTERADA_PRE_DM';
        }
      }
    }

    if (!isNaN(hba1c)) {
      if (hba1c >= 6.5) {
        statusGlicemico = 'DIABETES_MELLITUS';
        detalhesGlicemia.push('HbA1c >= 6.5% (' + hba1c.toFixed(1) + '%)');
      } else if (hba1c >= 5.7 && statusGlicemico === 'NORMAL') {
        statusGlicemico = 'PRE_DIABETES';
        detalhesGlicemia.push('HbA1c na faixa de pré-diabetes (' + hba1c.toFixed(1) + '%)');
      }
    }

    // Resistência à Insulina (HOMA-IR)
    var homaIr = null;
    var resistenciaInsulinica = Boolean(dados.acanthosisNigricans);
    if (!isNaN(glicemiaJejum) && !isNaN(insulinaJejum) && glicemiaJejum > 0 && insulinaJejum > 0) {
      homaIr = (glicemiaJejum * insulinaJejum) / 405;
      if (homaIr > 2.5) {
        resistenciaInsulinica = true;
      }
    }

    // 3. Critérios de Síndrome Metabólica (ATP III / IDF)
    var criteriosSmAtendidos = 0;
    var listaCriteriosSm = [];

    // 1. Obesidade Abdominal (CA >= 80cm em mulheres)
    if (caAumentada) {
      criteriosSmAtendidos++;
      listaCriteriosSm.push('Circunferência abdominal aumentada (>= 80 cm: ' + ca + ' cm)');
    }

    // 2. Triglicerídeos (>= 150 mg/dL)
    var tg = Number(dados.triglicerideos);
    if (!isNaN(tg) && tg >= 150) {
      criteriosSmAtendidos++;
      listaCriteriosSm.push('Hipertrigliceridemia (>= 150 mg/dL: ' + tg + ' mg/dL)');
    }

    // 3. HDL Baixo (< 50 mg/dL em mulheres)
    var hdl = Number(dados.hdl);
    if (!isNaN(hdl) && hdl < 50) {
      criteriosSmAtendidos++;
      listaCriteriosSm.push('HDL-colesterol baixo (< 50 mg/dL: ' + hdl + ' mg/dL)');
    }

    // 4. Pressão Arterial (PAS >= 130 ou PAD >= 85 ou anti-hipertensivo)
    var pas = Number(dados.pas);
    var pad = Number(dados.pad);
    var paElevada = (!isNaN(pas) && pas >= 130) || (!isNaN(pad) && pad >= 85) || Boolean(dados.hipertensaoTratada);
    if (paElevada) {
      criteriosSmAtendidos++;
      listaCriteriosSm.push('Pressão arterial limítrofe/elevada (>= 130/85 mmHg ou em tratamento)');
    }

    // 5. Glicemia Alterada (Jejum >= 100 mg/dL ou DM diagnosticado)
    if ((!isNaN(glicemiaJejum) && glicemiaJejum >= 100) || statusGlicemico === 'DIABETES_MELLITUS') {
      criteriosSmAtendidos++;
      listaCriteriosSm.push('Glicemia de jejum >= 100 mg/dL ou Diabetes diagnosticado');
    }

    var temSindromeMetabolica = criteriosSmAtendidos >= 3;

    // 4. Risco de Hiperplasia e Adenocarcinoma de Endométrio
    var amenorreiaMeses = Number(dados.tempoAmenorreiaMeses || 0);
    var espessuraEndometrio = Number(dados.espessuraEndometrialMm || 0);
    var riscoEndometrial = 'BAIXO';
    var alertaEndometrial = null;

    if (amenorreiaMeses >= 3 || espessuraEndometrio >= 7) {
      if (amenorreiaMeses >= 6 || espessuraEndometrio >= 12) {
        riscoEndometrial = 'ELEVADO';
        alertaEndometrial = '⚠️ RISCO ELEVADO DE HIPERPLASIA ENDOMETRIAL: Tempo prolongado de amenorreia (' + amenorreiaMeses + ' meses) e/ou espessamento endometrial acentuado (' + espessuraEndometrialMmComPonto(espessuraEndometrio) + ' mm). A exposição estrogênica contínua sem oposição progestacional quadruplica o risco de adenocarcinoma de endométrio. Conduta: Indução imediata de sangramento de privação com progestagênio (Didrogesterona ou Medroxiprogesterona) seguida de reavaliação ultrassonográfica; se persistir espessamento > 7-10 mm ou sangramento atípico, proceder a biópsia endometrial ambulatorial (Pipelle).';
      } else {
        riscoEndometrial = 'MODERADO';
        alertaEndometrial = 'Atenção ao risco endometrial por anovulação crônica. Recomenda-se garantir ao menos 4 sangramentos de privação ao ano através de terapia com progestagênios cíclicos ou anticoncepcionais combinados.';
      }
    }

    // Classificação Geral de Risco Cardiometabólico
    var nivelRiscoMetabolico = 'BAIXO';
    if (statusGlicemico === 'DIABETES_MELLITUS' || temSindromeMetabolica || (!isNaN(imc) && imc >= 35)) {
      nivelRiscoMetabolico = 'MUITO_ELEVADO';
    } else if (statusGlicemico.includes('PRE_DM') || (!isNaN(imc) && imc >= 30) || caAumentada || dados.esteatoseHepatica) {
      nivelRiscoMetabolico = 'ELEVADO';
    } else if ((!isNaN(imc) && imc >= 25) || resistenciaInsulinica) {
      nivelRiscoMetabolico = 'INTERMEDIARIO';
    }

    return {
      nivelRiscoMetabolico: nivelRiscoMetabolico,
      imc: !isNaN(imc) ? Number(imc.toFixed(1)) : null,
      classificacaoImc: classificacaoImc,
      circunferenciaAbdominalCm: !isNaN(ca) ? ca : null,
      circunferenciaAbdominalAumentada: caAumentada,
      statusGlicemico: statusGlicemico,
      detalhesGlicemia: detalhesGlicemia,
      homaIr: homaIr !== null ? Number(homaIr.toFixed(2)) : null,
      resistenciaInsulinicaDocumentada: resistenciaInsulinica,
      sindromeMetabolica: {
        presente: temSindromeMetabolica,
        criteriosPreenchidos: criteriosSmAtendidos,
        detalhesCriterios: listaCriteriosSm
      },
      esteatoseHepaticaPresente: Boolean(dados.esteatoseHepatica),
      riscoEndometrial: {
        nivel: riscoEndometrial,
        alerta: alertaEndometrial,
        tempoAmenorreiaMeses: amenorreiaMeses,
        espessuraEndometrialMm: espessuraEndometrio > 0 ? espessuraEndometrio : null
      }
    };
  }

  function espessuraEndometrialMmComPonto(val) {
    return Number(val).toFixed(1);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. DETERMINAÇÃO DA CONDUTA TERAPÊUTICA E PRESCRIÇÃO FARMACOLÓGICA
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Constrói plano terapêutico individualizado baseado no objetivo da paciente
   * (desejo reprodutivo vs controle de sintomas) e perfil de risco/contraindicações.
   *
   * @param {Object} dados
   * @param {boolean} dados.desejoReprodutivo
   * @param {Object} [dados.resultadoRotterda]
   * @param {Object} [dados.resultadoMetabolico]
   * @param {Object} [dados.resultadoExclusoes]
   * @param {boolean} [dados.enxaquecaComAura] (MEC 4 OMS para estrogênio)
   * @param {boolean} [dados.tabagismoAcima35Anos] (MEC 4 OMS)
   * @param {boolean} [dados.historicoTev] (MEC 4 OMS)
   * @param {boolean} [dados.hipertensaoGrave] (MEC 4 OMS)
   * @param {boolean} [dados.hirsutismoModeradoGrave]
   * @param {boolean} [dados.acneResistente]
   * @param {number} [dados.imc]
   * @returns {Object} Plano terapêutico farmacológico e não-farmacológico estruturado
   */
  function determinarCondutaTerapeutica(dados) {
    dados = dados || {};
    var desejoReprodutivo = Boolean(dados.desejoReprodutivo);
    var imc = Number(dados.imc || (dados.resultadoMetabolico && dados.resultadoMetabolico.imc) || 24);

    // 1. Pilares Não Farmacológicos (Universais)
    var condutaEstiloVida = {
      titulo: 'Intervenção no Estilo de Vida e Comportamental (1ª Linha Universal)',
      recomendacoes: [
        'Perda Ponderal Alvo: Redução de 5% a 10% do peso corporal para pacientes com sobrepeso ou obesidade. A redução de gordura visceral restaura ovulação espontânea em até 50% das pacientes e reduz androgênios séricos.',
        'Exercício Físico Estruturado: Mínimo de 150 a 250 minutos semanais de atividade física de intensidade moderada (ou 75 min vigorosos), integrando exercícios aeróbicos e treinamento resistido (musculação), otimizando a captação de glicose independente de insulina.',
        'Padrão Dietético: Dieta com baixo índice glicêmico e redução de carboidratos refinados e gorduras saturadas, individualizada por nutricionista.',
        'Saúde Mental e Sono: Rastreio ativo de ansiedade, sintomas depressivos e rastreio de Síndrome da Apneia Obstrutiva do Sono (SAOS) em mulheres obesas.'
      ]
    };

    var planoFarmacologico = {
      objetivoPrincipal: desejoReprodutivo ? 'INDUÇÃO_DE_OVULAÇÃO_E_FERTILIDADE' : 'CONTROLE_DE_SINTOMAS_E_PROTEÇÃO_ENDOMETRIAL',
      prescricaoPrincipal: [],
      prescricoesAdjuvantes: [],
      alertasContraindicacao: [],
      proximosPassosMonitoramento: []
    };

    // ─────────────────────────────────────────────────────────────────────────
    // CENÁRIO A: DESEJO REPRODUTIVO (Infertilidade Anovulatória)
    // ─────────────────────────────────────────────────────────────────────────
    if (desejoReprodutivo) {
      // 1ª Linha Internacional: Letrozol
      planoFarmacologico.prescricaoPrincipal.push({
        categoria: 'Indução de Ovulação (1ª Linha ESHRE/ASRM 2023)',
        medicamento: CATALOGO_FARMACOLOGICO.INDUCAO_OVULACAO.LETROZOL.farmaco,
        posologia: CATALOGO_FARMACOLOGICO.INDUCAO_OVULACAO.LETROZOL.posologiaPadrao,
        titulacao: CATALOGO_FARMACOLOGICO.INDUCAO_OVULACAO.LETROZOL.titulacao,
        evidencia: CATALOGO_FARMACOLOGICO.INDUCAO_OVULACAO.LETROZOL.vantagensClinicas
      });

      // Alternativa de 2ª linha
      planoFarmacologico.prescricaoPrincipal.push({
        categoria: 'Indução de Ovulação (2ª Linha se falha ou indisponibilidade de Letrozol)',
        medicamento: CATALOGO_FARMACOLOGICO.INDUCAO_OVULACAO.CLOMIFENO.farmaco,
        posologia: CATALOGO_FARMACOLOGICO.INDUCAO_OVULACAO.CLOMIFENO.posologiaPadrao,
        observacao: 'Associar monitoramento ultrassonográfico transvaginal seriada a partir do 10º dia do ciclo para confirmar folículo pré-ovulatório e espessura endometrial.'
      });

      // Suplementação Pré-concepcional
      planoFarmacologico.prescricoesAdjuvantes.push({
        categoria: 'Suplementação Pré-concepcional Obrigatória',
        medicamento: 'Ácido Fólico',
        posologia: (imc >= 30 || (dados.resultadoMetabolico && dados.resultadoMetabolico.statusGlicemico === 'DIABETES_MELLITUS'))
          ? '5 mg VO 1x/dia (dose alta por obesidade/risco metabólico)'
          : '0,4 mg a 1,0 mg VO 1x/dia',
        instrucao: 'Iniciar pelo menos 30 a 90 dias antes das tentativas de concepção para prevenção de defeitos do tubo neural (DTN).'
      });

      // Metformina coadjuvante na reprodução se IMC >= 25 ou resistência insulínica
      var temIndicacaoMetformina = imc >= 25 || (dados.resultadoMetabolico && (dados.resultadoMetabolico.resistenciaInsulinicaDocumentada || dados.resultadoMetabolico.statusGlicemico.includes('PRE_DM')));
      if (temIndicacaoMetformina) {
        planoFarmacologico.prescricoesAdjuvantes.push({
          categoria: 'Otimização Metabólica Coadjuvante à Indução',
          medicamento: CATALOGO_FARMACOLOGICO.METABOLICO.METFORMINA.farmaco,
          posologia: CATALOGO_FARMACOLOGICO.METABOLICO.METFORMINA.posologiaInicial,
          titulacao: CATALOGO_FARMACOLOGICO.METABOLICO.METFORMINA.titulacao,
          justificativa: 'Melhora taxas de ovulação cumulativa quando associada ao indutor em pacientes com sobrepeso ou resistência insulínica.'
        });
      }

      // ALERTA DE SEGURANÇA MANDATÓRIO: Bloqueio estrito de antiandrogênicos
      planoFarmacologico.alertasContraindicacao.push(
        '⛔ BLOQUEIO ABSOLUTO DE ANTIANDROGÊNICOS: Espironolactona, Acetato de Ciproterona, Finasterida e Dutasterida são TERMINANTEMENTE CONTRAINDICADOS em pacientes tentando engravidar ou com potencial de gestação. Risco de malformação congênita e feminização de feto masculino. Suspender imediatamente qualquer antiandrogênico antes do início dos indutores de ovulação.'
      );

      planoFarmacologico.proximosPassosMonitoramento.push('Monitoramento folicular por USG transvaginal no 10º-12º dia do ciclo.');
      planoFarmacologico.proximosPassosMonitoramento.push('Dosagem de progesterona sérica no 21º-23º dia do ciclo para confirmação documental de ovulação (> 3 ng/mL).');
      planoFarmacologico.proximosPassosMonitoramento.push('Avaliação de fator masculino (Espermograma) e patência tubária (Histerossalpingografia) antes de múltiplos ciclos de indução.');
    }
    // ─────────────────────────────────────────────────────────────────────────
    // CENÁRIO B: SEM DESEJO REPRODUTIVO (Controle de Sintomas e Proteção)
    // ─────────────────────────────────────────────────────────────────────────
    else {
      // Checagem de Contraindicações Absolutas a Estrogênios Combinados (OMS MEC 4)
      var contraindicacaoEstrogenio = Boolean(
        dados.enxaquecaComAura ||
        dados.tabagismoAcima35Anos ||
        dados.historicoTev ||
        dados.hipertensaoGrave ||
        (imc >= 35 && dados.resultadoMetabolico && dados.resultadoMetabolico.nivelRiscoMetabolico === 'MUITO_ELEVADO')
      );

      if (contraindicacaoEstrogenio) {
        planoFarmacologico.alertasContraindicacao.push(
          '⚠️ CONTRAINDICAÇÃO A ESTROGÊNIOS (Critérios MEC 4 da OMS): Paciente apresenta fator de alto risco vascular/trombótico (ex: enxaqueca com aura, tabagismo >= 35a, histórico de trombose ou HAS grave). ANTICONCEPCIONAIS COMBINADOS COM ESTROGÊNIO SÃO PROIBIDOS.'
        );

        // Opção 1: Progestagênio Cíclico para Proteção Endometrial
        planoFarmacologico.prescricaoPrincipal.push({
          categoria: 'Proteção Endometrial Oral Cíclica (Livre de Estrogênio)',
          medicamento: CATALOGO_FARMACOLOGICO.PROTECAO_PROGESTAGENIO_ISOLADO.DIDROGESTERONA_CICLICA.farmaco,
          posologia: CATALOGO_FARMACOLOGICO.PROTECAO_PROGESTAGENIO_ISOLADO.DIDROGESTERONA_CICLICA.posologia,
          justificativa: CATALOGO_FARMACOLOGICO.PROTECAO_PROGESTAGENIO_ISOLADO.DIDROGESTERONA_CICLICA.objetivo
        });

        // Opção 2: SIU de Levonorgestrel
        planoFarmacologico.prescricaoPrincipal.push({
          categoria: 'Alternativa de Longa Duração (LARC)',
          medicamento: CATALOGO_FARMACOLOGICO.PROTECAO_PROGESTAGENIO_ISOLADO.SIU_LEVONORGESTREL.farmaco,
          posologia: CATALOGO_FARMACOLOGICO.PROTECAO_PROGESTAGENIO_ISOLADO.SIU_LEVONORGESTREL.posologia,
          justificativa: CATALOGO_FARMACOLOGICO.PROTECAO_PROGESTAGENIO_ISOLADO.SIU_LEVONORGESTREL.objetivo
        });
      } else {
        // Anticoncepcionais Combinados de 1ª Escolha
        if (dados.hirsutismoModeradoGrave || dados.acneResistente) {
          planoFarmacologico.prescricaoPrincipal.push({
            categoria: 'AHC Combinado Antiandrogênico Potente (1ª Linha em Hirsutismo/Acne Grave)',
            medicamento: CATALOGO_FARMACOLOGICO.AHC_COMBINADOS.CIPROTERONA_EE.nome,
            posologia: CATALOGO_FARMACOLOGICO.AHC_COMBINADOS.CIPROTERONA_EE.posologia,
            alerta: CATALOGO_FARMACOLOGICO.AHC_COMBINADOS.CIPROTERONA_EE.alertaSeguranca
          });
          planoFarmacologico.prescricaoPrincipal.push({
            categoria: 'AHC Combinado Alternativo de Menor Risco Trombótico',
            medicamento: CATALOGO_FARMACOLOGICO.AHC_COMBINADOS.DROSPIRENONA_EE.nome,
            posologia: CATALOGO_FARMACOLOGICO.AHC_COMBINADOS.DROSPIRENONA_EE.posologia,
            justificativa: CATALOGO_FARMACOLOGICO.AHC_COMBINADOS.DROSPIRENONA_EE.indicacao
          });
        } else {
          planoFarmacologico.prescricaoPrincipal.push({
            categoria: 'AHC Combinado de 1ª Escolha (Perfil Metabólico Favorável)',
            medicamento: CATALOGO_FARMACOLOGICO.AHC_COMBINADOS.DROSPIRENONA_EE.nome,
            posologia: CATALOGO_FARMACOLOGICO.AHC_COMBINADOS.DROSPIRENONA_EE.posologia,
            justificativa: CATALOGO_FARMACOLOGICO.AHC_COMBINADOS.DROSPIRENONA_EE.indicacao
          });
        }
      }

      // Adição de Antiandrogênico Periférico se Hirsutismo Significativo
      if (dados.hirsutismoModeradoGrave || (dados.resultadoRotterda && dados.resultadoRotterda.criteriosDetalhados.hiperandrogenismo.achadosClinicos.length > 0)) {
        planoFarmacologico.prescricoesAdjuvantes.push({
          categoria: 'Antiandrogênico Periférico (Hirsutismo Persistente ou Grave)',
          medicamento: CATALOGO_FARMACOLOGICO.ANTIANDROGENICOS.ESPIRONOLACTONA.farmaco,
          posologia: CATALOGO_FARMACOLOGICO.ANTIANDROGENICOS.ESPIRONOLACTONA.doseInicial,
          mecanismo: CATALOGO_FARMACOLOGICO.ANTIANDROGENICOS.ESPIRONOLACTONA.mecanismo,
          alertaCritico: CATALOGO_FARMACOLOGICO.ANTIANDROGENICOS.ESPIRONOLACTONA.alertaCritico
        });
      }

      // Metformina para Resistência Insulínica / DM / Obesidade
      var indicarMetforminaSintomas = imc >= 25 || (dados.resultadoMetabolico && (dados.resultadoMetabolico.resistenciaInsulinicaDocumentada || dados.resultadoMetabolico.statusGlicemico.includes('PRE_DM') || dados.resultadoMetabolico.statusGlicemico === 'DIABETES_MELLITUS'));
      if (indicarMetforminaSintomas) {
        planoFarmacologico.prescricoesAdjuvantes.push({
          categoria: 'Sensibilizador de Insulina / Manejo Metabólico',
          medicamento: CATALOGO_FARMACOLOGICO.METABOLICO.METFORMINA.farmaco,
          posologia: CATALOGO_FARMACOLOGICO.METABOLICO.METFORMINA.posologiaInicial,
          titulacao: CATALOGO_FARMACOLOGICO.METABOLICO.METFORMINA.titulacao,
          indicacao: CATALOGO_FARMACOLOGICO.METABOLICO.METFORMINA.indicacoesSop
        });
      }

      planoFarmacologico.proximosPassosMonitoramento.push('Reavaliação clínica do hirsutismo e acne em 6 meses (tempo necessário para renovação do ciclo piloso folicular).');
      planoFarmacologico.proximosPassosMonitoramento.push('Rastreio cardiometabólico periódico: Glicemia/TTGO e Perfil lipídico a cada 1 a 2 anos.');
      planoFarmacologico.proximosPassosMonitoramento.push('Medição da pressão arterial em todas as consultas de rotina.');
    }

    return {
      desejoReprodutivo: desejoReprodutivo,
      intervencaoEstiloVida: condutaEstiloVida,
      planoFarmacologico: planoFarmacologico
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. AVALIAÇÃO COMPLETA INTEGRADA DE SOP
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Executa a auditoria diagnóstica, metabólica e terapêutica de ponta a ponta.
   *
   * @param {Object} params
   * @returns {Object} Resultado completo
   */
  function avaliarSopCompleto(params) {
    params = params || {};

    var rotterdam = avaliarCriteriosRotterda(params);
    var exclusoes = auditarDiagnosticosDiferenciais(params);
    var metabolico = estratificarRiscoMetabolico(params);

    var dadosConduta = Object.assign({}, params, {
      resultadoRotterda: rotterdam,
      resultadoExclusoes: exclusoes,
      resultadoMetabolico: metabolico
    });

    var conduta = determinarCondutaTerapeutica(dadosConduta);

    var diagnosticoConfirmado = rotterdam.criteriosAtendidos && exclusoes.diagnosticoDiferencialDescartado;

    return {
      sucesso: true,
      timestamp: new Date().toISOString(),
      diagnosticoConfirmado: diagnosticoConfirmado,
      statusDiagnostico: diagnosticoConfirmado ? 'SOP_CONFIRMADA' : (rotterdam.criteriosAtendidos ? 'SOP_PROVAVEL_PENDENTE_EXCLUSOES' : 'CRITERIOS_INSUFICIENTES'),
      rotterdam: rotterdam,
      exclusoes: exclusoes,
      metabolico: metabolico,
      conduta: conduta
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 7. GERADOR DE RESUMO FORMATADO PARA PRONTUÁRIO / SOAP / COCKPIT
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Gera relatório clínico textual formatado de alta qualidade para inserção
   * no prontuário eletrônico ou cockpit.
   *
   * @param {Object} paramsOuResultado
   * @returns {string} Relatório textual
   */
  function gerarResumoSop(paramsOuResultado) {
    paramsOuResultado = paramsOuResultado || {};
    var r = paramsOuResultado.rotterdam ? paramsOuResultado : avaliarSopCompleto(paramsOuResultado);

    var l = [];
    l.push('⚠️ *MÓDULO DE REFERÊNCIA AVANÇADA* — A conduta definitiva requer especialista. O generalista deve reconhecer, estabilizar e encaminhar.');
    l.push('');
    l.push('════════════════════════════════════════════════════════════════');
    l.push('🔬 PAINEL CLÍNICO: SÍNDROME DOS OVÁRIOS POLICÍSTICOS (SOP)');
    l.push('Referência: Consenso de Roterdã & Diretrizes ESHRE/ASRM 2023 / FEBRASGO');
    l.push('════════════════════════════════════════════════════════════════');
    l.push('');

    // 1. Diagnóstico e Fenótipo
    l.push('📌 [1. DIAGNÓSTICO E FENÓTIPO DE ROTERDÃ]');
    l.push('  • Status: ' + (r.diagnosticoConfirmado ? '✅ SOP CONFIRMADA (Critérios atendidos + exclusões concluídas)' : (r.rotterdam.criteriosAtendidos ? '⚠️ SOP PROVÁVEL (Critérios atendidos, pendente de exclusões estritas)' : '❌ CRITÉRIOS INSUFICIENTES (< 2 critérios de Roterdã)')));
    l.push('  • Critérios Atendidos: ' + r.rotterdam.contagemCriterios + ' de 3 critérios');
    l.push('  • Classificação Fenotípica: ' + r.rotterdam.nomeFenotipo);
    l.push('  • Detalhe Fenotípico: ' + r.rotterdam.descricaoFenotipo);
    l.push('');

    // 2. Critérios de Roterdã Detalhados
    l.push('📋 [2. CRITÉRIOS DE ROTERDÃ AUDITADOS]');
    l.push('  [A] Hiperandrogenismo: ' + (r.rotterdam.criteriosDetalhados.hiperandrogenismo.presente ? 'PRESENTE' : 'AUSENTE'));
    if (r.rotterdam.criteriosDetalhados.hiperandrogenismo.achadosClinicos.length > 0) {
      for (var c = 0; c < r.rotterdam.criteriosDetalhados.hiperandrogenismo.achadosClinicos.length; c++) {
        l.push('      - ' + r.rotterdam.criteriosDetalhados.hiperandrogenismo.achadosClinicos[c]);
      }
    }
    if (r.rotterdam.criteriosDetalhados.hiperandrogenismo.achadosLaboratoriais.length > 0) {
      for (var b = 0; b < r.rotterdam.criteriosDetalhados.hiperandrogenismo.achadosLaboratoriais.length; b++) {
        l.push('      - ' + r.rotterdam.criteriosDetalhados.hiperandrogenismo.achadosLaboratoriais[b]);
      }
    }

    l.push('  [B] Disfunção Ovulatória: ' + (r.rotterdam.criteriosDetalhados.disfuncaoOvulatoria.presente ? 'PRESENTE' : 'AUSENTE'));
    if (r.rotterdam.criteriosDetalhados.disfuncaoOvulatoria.achados.length > 0) {
      for (var d = 0; d < r.rotterdam.criteriosDetalhados.disfuncaoOvulatoria.achados.length; d++) {
        l.push('      - ' + r.rotterdam.criteriosDetalhados.disfuncaoOvulatoria.achados[d]);
      }
    }
    if (r.rotterdam.criteriosDetalhados.disfuncaoOvulatoria.alertaAdolescente) {
      l.push('      ' + r.rotterdam.criteriosDetalhados.disfuncaoOvulatoria.alertaAdolescente);
    }

    l.push('  [C] Morfologia Ovariana Policística (PCOM): ' + (r.rotterdam.criteriosDetalhados.morfologiaPolicistica.presente ? 'PRESENTE' : 'AUSENTE'));
    if (r.rotterdam.criteriosDetalhados.morfologiaPolicistica.achados.length > 0) {
      for (var p = 0; p < r.rotterdam.criteriosDetalhados.morfologiaPolicistica.achados.length; p++) {
        l.push('      - ' + r.rotterdam.criteriosDetalhados.morfologiaPolicistica.achados[p]);
      }
    }
    l.push('');

    // 3. Auditoria de Diagnósticos Diferenciais
    l.push('🛡️ [3. AUDITORIA DE EXCLUSÕES OBRIGATÓRIAS]');
    if (r.exclusoes.alertasCriticos.length > 0) {
      for (var al = 0; al < r.exclusoes.alertasCriticos.length; al++) {
        l.push('  ' + r.exclusoes.alertasCriticos[al]);
      }
    }
    if (r.exclusoes.exclusoesAuditadas.length > 0) {
      for (var ex = 0; ex < r.exclusoes.exclusoesAuditadas.length; ex++) {
        l.push('  ✅ ' + r.exclusoes.exclusoesAuditadas[ex]);
      }
    }
    if (r.exclusoes.pendenciasObrigatorias.length > 0) {
      for (var pd = 0; pd < r.exclusoes.pendenciasObrigatorias.length; pd++) {
        l.push('  ⚠️ ' + r.exclusoes.pendenciasObrigatorias[pd]);
      }
    }
    l.push('');

    // 4. Perfil Cardiometabólico e Risco Endometrial
    l.push('📊 [4. PERFIL METABÓLICO E RISCO ENDOMETRIAL]');
    l.push('  • Risco Metabólico Global: ' + r.metabolico.nivelRiscoMetabolico);
    if (r.metabolico.imc) {
      l.push('  • IMC: ' + r.metabolico.imc + ' kg/m² (' + r.metabolico.classificacaoImc + ')');
    }
    if (r.metabolico.circunferenciaAbdominalCm) {
      l.push('  • Circunferência Abdominal: ' + r.metabolico.circunferenciaAbdominalCm + ' cm ' + (r.metabolico.circunferenciaAbdominalAumentada ? '(Aumentada >= 80cm)' : '(Normal)'));
    }
    l.push('  • Status Glicêmico: ' + r.metabolico.statusGlicemico);
    for (var dg = 0; dg < r.metabolico.detalhesGlicemia.length; dg++) {
      l.push('    - ' + r.metabolico.detalhesGlicemia[dg]);
    }
    if (r.metabolico.homaIr !== null) {
      l.push('  • HOMA-IR: ' + r.metabolico.homaIr + (r.metabolico.resistenciaInsulinicaDocumentada ? ' (> 2.5: Resistência à Insulina)' : ' (Normal)'));
    }
    l.push('  • Síndrome Metabólica: ' + (r.metabolico.sindromeMetabolica.presente ? 'PRESENTE (' + r.metabolico.sindromeMetabolica.criteriosPreenchidos + '/5 critérios)' : 'NÃO CARACTERIZADA (' + r.metabolico.sindromeMetabolica.criteriosPreenchidos + '/5 critérios)'));
    if (r.metabolico.riscoEndometrial.alerta) {
      l.push('  • Alerta Endometrial: ' + r.metabolico.riscoEndometrial.alerta);
    }
    l.push('');

    // 5. Plano Terapêutico Dirigido
    l.push('💊 [5. PLANO TERAPÊUTICO DIRIGIDO]');
    l.push('  🎯 Objetivo: ' + (r.conduta.desejoReprodutivo ? 'Desejo Reprodutivo / Indução de Ovulação' : 'Controle de Sintomas / Proteção Endometrial'));
    l.push('');
    l.push('  🌿 ' + r.conduta.intervencaoEstiloVida.titulo + ':');
    for (var ev = 0; ev < r.conduta.intervencaoEstiloVida.recomendacoes.length; ev++) {
      l.push('    - ' + r.conduta.intervencaoEstiloVida.recomendacoes[ev]);
    }
    l.push('');
    l.push('  Prescrições Principais:');
    for (var pp = 0; pp < r.conduta.planoFarmacologico.prescricaoPrincipal.length; pp++) {
      var itemP = r.conduta.planoFarmacologico.prescricaoPrincipal[pp];
      l.push('    💊 [' + itemP.categoria + '] ' + itemP.medicamento);
      l.push('       Dose: ' + itemP.posologia);
      if (itemP.alerta) l.push('       ' + itemP.alerta);
      if (itemP.justificativa) l.push('       Nota: ' + itemP.justificativa);
    }

    if (r.conduta.planoFarmacologico.prescricoesAdjuvantes.length > 0) {
      l.push('  Prescrições Adjuvantes / Metabólicas:');
      for (var pa = 0; pa < r.conduta.planoFarmacologico.prescricoesAdjuvantes.length; pa++) {
        var itemA = r.conduta.planoFarmacologico.prescricoesAdjuvantes[pa];
        l.push('    💊 [' + itemA.categoria + '] ' + itemA.medicamento);
        l.push('       Dose: ' + itemA.posologia);
        if (itemA.alertaCritico) l.push('       ' + itemA.alertaCritico);
      }
    }

    if (r.conduta.planoFarmacologico.alertasContraindicacao.length > 0) {
      l.push('');
      l.push('  Alertas Críticos de Segurança Farmacológica:');
      for (var ac = 0; ac < r.conduta.planoFarmacologico.alertasContraindicacao.length; ac++) {
        l.push('    ' + r.conduta.planoFarmacologico.alertasContraindicacao[ac]);
      }
    }

    l.push('');
    l.push('════════════════════════════════════════════════════════════════');
    return l.join('\n');
  }

  // Exportação Pública do Serviço
  return {
    CATALOGO_FARMACOLOGICO: CATALOGO_FARMACOLOGICO,
    avaliarCriteriosRotterda: avaliarCriteriosRotterda,
    auditarDiagnosticosDiferenciais: auditarDiagnosticosDiferenciais,
    estratificarRiscoMetabolico: estratificarRiscoMetabolico,
    determinarCondutaTerapeutica: determinarCondutaTerapeutica,
    avaliarSopCompleto: avaliarSopCompleto,
    gerarResumoSop: gerarResumoSop
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SopOvariosPolicisticosService: SopOvariosPolicisticosService };
}
