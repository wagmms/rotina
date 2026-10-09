/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MÓDULO 02: HEMATOLOGIA CLÍNICA — MANEJO E INVESTIGAÇÃO DE ANEMIAS
 * ═══════════════════════════════════════════════════════════════════════════════
 * Motor Determinístico Beira-Leito para Diagnóstico e Manejo de Anemias:
 *  1. Análise Automatizada do Hemograma (Critérios OMS / MS / ABHH)
 *  2. Classificação Morfológica por Índices Hematimétricos (VCM, HCM, CHCM, RDW)
 *  3. Diagnóstico Diferencial de Microcitose (Índice de Mentzer e Green & King)
 *  4. Avaliação Cinética e Resposta Medular (Índice de Produção Reticulocitária - IPR)
 *  5. Integração com Marcadores Bioquímicos (Ferritina, SatTransferrina, B12, Folato, Hemólise)
 *  6. Calculadora de Reposição de Ferro Oral (VO) com Tetos Seguros de Hepcidina e Tolerância
 *  7. Critérios Formais e Fórmula de Ganzoni para Ferro Endovenoso (Noripurum IV / Venofer)
 *  8. Gatilhos Transfusionais Restritivos Beira-Leito e Bloqueios de Segurança
 *
 * REFERÊNCIAS CLÍNICAS OFICIAIS:
 *  - Organização Mundial da Saúde (OMS) - Haemoglobin concentrations for the diagnosis of anaemia (2024-2026)
 *  - Associação Brasileira de Hematologia, Hemoterapia e Terapia Celular (ABHH) - Diretrizes de Anemia Ferropriva
 *  - Sociedade Brasileira de Pediatria (SBP) - Departamento de Hematologia e Nutrologia (2021-2026)
 *  - Ministério da Saúde do Brasil - PCDT da Anemia por Deficiência de Ferro
 *  - American Society of Hematology (ASH) / British Society of Gastroenterology (BSG) Iron Deficiency Guidelines
 *  - Ganzoni AM. "Intravenous iron-dextran: therapeutic and experimental aspects." (Schweiz Med Wochenschr 1970)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

var HematologiaAnemiasService = (function () {
  'use strict';

  var EPS = 1e-9;

  // ───────────────────────────────────────────────────────────────────────────
  // 1. LIMITES DE HEMOGLOBINA E CONSTANTES (OMS / MS / ABHH)
  // ───────────────────────────────────────────────────────────────────────────
  var LIMITES_HB = {
    ADULTO_MASCULINO: 13.0,
    ADULTO_FEMININO: 12.0,
    GESTANTE_GERAL: 11.0,
    GESTANTE_2TRI: 10.5,
    PEDIATRICO_6M_59M: 11.0,
    PEDIATRICO_5A_11A: 11.5,
    PEDIATRICO_12A_14A: 12.0,
    LACTENTE_2M_6M: 9.5
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 2. FUNÇÕES AUXILIARES DE DETERMINAÇÃO DE PERFIL
  // ───────────────────────────────────────────────────────────────────────────
  function inferirLimiteHb(params) {
    params = params || {};
    var idadeAnos = typeof params.idadeAnos === 'number' ? params.idadeAnos : null;
    var idadeMeses = typeof params.idadeMeses === 'number' ? params.idadeMeses : null;
    if (idadeAnos === null && idadeMeses !== null) {
      idadeAnos = idadeMeses / 12;
    }

    var sexo = String(params.sexo || '').toUpperCase();
    var ehGestante = Boolean(params.gestante || params.gestacao || params.ehGestante);
    var trimestre = parseInt(params.trimestre || params.trimestreGestacional, 10);

    // Gestante
    if (ehGestante) {
      if (trimestre === 2) {
        return { perfil: 'Gestante (2º Trimestre)', limiteMinimoHb: LIMITES_HB.GESTANTE_2TRI, alvoHbGanzoni: 14.0 };
      }
      return { perfil: 'Gestante (1º ou 3º Trimestre)', limiteMinimoHb: LIMITES_HB.GESTANTE_GERAL, alvoHbGanzoni: 14.0 };
    }

    // Pediátrico por idade
    if (idadeAnos !== null) {
      if (idadeAnos < 0.5) {
        return { perfil: 'Lactente jovem (2 a 6 meses)', limiteMinimoHb: LIMITES_HB.LACTENTE_2M_6M, alvoHbGanzoni: 12.0 };
      }
      if (idadeAnos >= 0.5 && idadeAnos < 5) {
        return { perfil: 'Criança (6 meses a 4 anos e 11 meses)', limiteMinimoHb: LIMITES_HB.PEDIATRICO_6M_59M, alvoHbGanzoni: 12.0 };
      }
      if (idadeAnos >= 5 && idadeAnos < 12) {
        return { perfil: 'Criança (5 a 11 anos)', limiteMinimoHb: LIMITES_HB.PEDIATRICO_5A_11A, alvoHbGanzoni: 13.0 };
      }
      if (idadeAnos >= 12 && idadeAnos < 15) {
        return { perfil: 'Adolescente (12 a 14 anos)', limiteMinimoHb: LIMITES_HB.PEDIATRICO_12A_14A, alvoHbGanzoni: 13.5 };
      }
    }

    // Adulto por sexo
    if (sexo === 'F' || sexo === 'FEM' || sexo === 'FEMININO' || sexo === 'MULHER') {
      return { perfil: 'Mulher Adulta não-gestante', limiteMinimoHb: LIMITES_HB.ADULTO_FEMININO, alvoHbGanzoni: 14.0 };
    }

    // Padrão masculino / adulto geral
    return { perfil: 'Homem Adulto', limiteMinimoHb: LIMITES_HB.ADULTO_MASCULINO, alvoHbGanzoni: 15.0 };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. ANÁLISE MORFOLÓGICA E CINÉTICA DO HEMOGRAMA
  // ───────────────────────────────────────────────────────────────────────────
  function interpretarHemogramaAnemia(params) {
    params = params || {};
    var hb = parseFloat(params.hb || params.hemoglobina);
    if (isNaN(hb) || hb <= 0) {
      throw new Error('Hemoglobina (Hb) válida é obrigatória para interpretação.');
    }

    var ht = parseFloat(params.ht || params.hematocrito);
    var htEstimado = false;
    if (isNaN(ht) || ht <= 0) {
      ht = Math.round(hb * 3 * 10) / 10;
      htEstimado = true;
    }

    var vcm = parseFloat(params.vcm);
    var hcm = parseFloat(params.hcm);
    var chcm = parseFloat(params.chcm);
    var rdw = parseFloat(params.rdw);
    var hemacias = parseFloat(params.hemacias || params.rbc || params.eritrocitos); // em milhões/mcL
    var reticulocitosPct = parseFloat(params.reticulocitos || params.reticulocitosPct);

    var infoPerfil = inferirLimiteHb(params);
    var limiteMinimoHb = infoPerfil.limiteMinimoHb;
    var temAnemia = hb < limiteMinimoHb;

    // Severidade da Anemia
    var severidade = 'NORMAL';
    var descricaoSeveridade = 'Hemoglobina dentro dos parâmetros de normalidade para a faixa etária/perfil.';
    if (temAnemia) {
      if (hb <= 6.5) {
        severidade = 'CRITICA';
        descricaoSeveridade = 'Anemia Crítica / Severa Acentuada com risco de hipóxia tecidual e descompensação hemodinâmica.';
      } else if (hb < 8.0) {
        severidade = 'GRAVE';
        descricaoSeveridade = 'Anemia Grave (Hb < 8.0 g/dL). Avaliar estabilidade hemodinâmica e gatilhos transfusionais.';
      } else if (hb < 10.0) {
        severidade = 'MODERADA';
        descricaoSeveridade = 'Anemia Moderada (Hb entre 8.0 e 9.9 g/dL). Necessita investigação etiológica e tratamento imediato.';
      } else {
        severidade = 'LEVE';
        descricaoSeveridade = 'Anemia Leve (Hb entre 10.0 g/dL e o limite inferior do perfil).';
      }
    }

    // Classificação Morfológica (VCM)
    var classificacaoVcm = 'INDEFINIDA';
    var descVcm = 'VCM não informado.';
    if (!isNaN(vcm)) {
      if (vcm < 80) {
        classificacaoVcm = 'MICROCITICA';
        descVcm = 'Microcitose (VCM < 80 fL): redução no volume dos eritrócitos.';
      } else if (vcm > 100) {
        classificacaoVcm = 'MACROCITICA';
        descVcm = 'Macrocitose (VCM > 100 fL): hemácias aumentadas de tamanho.';
      } else {
        classificacaoVcm = 'NORMOCITICA';
        descVcm = 'Normocitose (VCM entre 80 e 100 fL): volume eritrocitário preservado.';
      }
    }

    // Classificação de Cromia (HCM / CHCM)
    var classificacaoCromia = 'INDEFINIDA';
    var descCromia = 'Índices de cromia (HCM/CHCM) não informados.';
    if (!isNaN(hcm) || !isNaN(chcm)) {
      var ehHipo = (!isNaN(hcm) && hcm < 27) || (!isNaN(chcm) && chcm < 32);
      var ehHiper = (!isNaN(chcm) && chcm > 36) || (!isNaN(hcm) && hcm > 33);
      if (ehHipo) {
        classificacaoCromia = 'HIPOCROMICA';
        descCromia = 'Hipocromia (HCM < 27 pg ou CHCM < 32 g/dL): eritrócitos com menor conteúdo hemoglobínico.';
      } else if (ehHiper) {
        classificacaoCromia = 'HIPERCROMICA';
        descCromia = 'Hipercromia (CHCM > 36 g/dL): sugere esferocitose hereditária ou presença de crioaglutininas.';
      } else {
        classificacaoCromia = 'NORMOCROMICA';
        descCromia = 'Normocromia (HCM 27-33 pg e CHCM 32-36 g/dL): coloração eritrocitária fisiológica.';
      }
    }

    // Análise de Anisocitose (RDW)
    var classificacaoRdw = 'INDEFINIDA';
    var descRdw = 'RDW não informado.';
    if (!isNaN(rdw)) {
      if (rdw > 14.5) {
        classificacaoRdw = 'HETEROGENEA';
        descRdw = 'Anisocitose acentuada (RDW > 14.5%): alta variabilidade no tamanho das hemácias (típico de carência nutricional ou resposta medular).';
      } else {
        classificacaoRdw = 'HOMOGENEA';
        descRdw = 'População eritrocitária homogênea (RDW <= 14.5%): tamanho uniforme das hemácias.';
      }
    }

    // Índices de Diagnóstico Diferencial na Microcitose (Mentzer e Green & King)
    var mentzer = null;
    var interpretacaoMentzer = null;
    if (!isNaN(vcm) && !isNaN(hemacias) && hemacias > 0) {
      var valMentzer = Math.round((vcm / hemacias) * 10) / 10;
      mentzer = valMentzer;
      if (valMentzer < 13) {
        interpretacaoMentzer = {
          indice: valMentzer,
          padrao: 'SUGESTAO_TALASSEMIA_MENOR',
          texto: 'Índice de Mentzer < 13 (' + valMentzer + '): Sugere fortemente Traço Talassêmico (Talassemia Menor). Produção de muitas hemácias pequenas com contagem elevada para o grau de anemia.'
        };
      } else {
        interpretacaoMentzer = {
          indice: valMentzer,
          padrao: 'SUGESTAO_ANEMIA_FERROPRIVA',
          texto: 'Índice de Mentzer >= 13 (' + valMentzer + '): Sugere fortemente Anemia Ferropriva. A deficiência de substrato limita a contagem de hemácias proporcionalmente ao seu tamanho.'
        };
      }
    }

    var greenKing = null;
    var interpretacaoGreenKing = null;
    if (!isNaN(vcm) && !isNaN(rdw) && !isNaN(hb) && hb > 0) {
      var valGk = Math.round(((vcm * vcm * rdw) / (100 * hb)) * 10) / 10;
      greenKing = valGk;
      if (valGk < 65) {
        interpretacaoGreenKing = {
          indice: valGk,
          padrao: 'SUGESTAO_TALASSEMIA_MENOR',
          texto: 'Índice de Green & King < 65 (' + valGk + '): Favorece Traço Talassêmico.'
        };
      } else if (valGk > 72) {
        interpretacaoGreenKing = {
          indice: valGk,
          padrao: 'SUGESTAO_ANEMIA_FERROPRIVA',
          texto: 'Índice de Green & King > 72 (' + valGk + '): Favorece Anemia Ferropriva.'
        };
      } else {
        interpretacaoGreenKing = {
          indice: valGk,
          padrao: 'INDETERMINADO',
          texto: 'Índice de Green & King na faixa intermediária 65-72 (' + valGk + '): Zona cinzenta, correlacionar com ferritina e cinética de ferro.'
        };
      }
    }

    // Cinética Medular: Reticulócitos e IPR (Índice de Produção Reticulocitária)
    var analiseReticulocitaria = null;
    if (!isNaN(reticulocitosPct)) {
      var htNormal = 45;
      var reticCorrigidos = Math.round((reticulocitosPct * (ht / htNormal)) * 100) / 100;
      var shiftFactor = 1.0;
      if (ht < 15) shiftFactor = 2.5;
      else if (ht < 25) shiftFactor = 2.0;
      else if (ht < 35) shiftFactor = 1.5;

      var ipr = Math.round((reticCorrigidos / shiftFactor) * 100) / 100;
      var ehRegenerativa = ipr > 2.0;

      analiseReticulocitaria = {
        reticulocitosPct: reticulocitosPct,
        reticulocitosCorrigidosPct: reticCorrigidos,
        shiftFactor: shiftFactor,
        ipr: ipr,
        tipoResposta: ehRegenerativa ? 'REGENERATIVA_HIPERPROLIFERATIVA' : 'HIPOPROLIFERATIVA_ARREGENERATIVA',
        conclusao: ehRegenerativa
          ? 'Anemia Regenerativa / Hiperproliferativa (IPR > 2.0 = ' + ipr + '). Medula óssea íntegra com resposta eritropoietica acelerada: investigar Sangramento Agudo Recente ou Hemólise.'
          : 'Anemia Hipoproliferativa / Arregenerativa (IPR <= 2.0 = ' + ipr + '). Resposta medular inadequada ou deficiência de substratos: sugere carência de Ferro/B12/Folato, Anemia de Doença Crônica, Insuficiência Renal ou falência medular.'
      };
    }

    // Hipóteses Diagnósticas Principais e Raciocínio Clínico Integrado
    var hipoteses = [];
    var investigacaoRecomendada = [];
    var alertasClinicos = [];

    if (!temAnemia) {
      hipoteses.push({
        diagnostico: 'Hemograma sem anemia evidente',
        probabilidade: 'Alta',
        detalhe: 'Hb (' + hb + ' g/dL) acima do corte do perfil (' + limiteMinimoHb + ' g/dL).'
      });
      if (classificacaoVcm === 'MICROCITICA') {
        hipoteses.push({
          diagnostico: 'Microcitose isolada sem anemia',
          probabilidade: 'Moderada',
          detalhe: 'Possível depleção inicial de ferro (estágio pré-anêmico) ou traço talassêmico assintomático.'
        });
        investigacaoRecomendada.push('Dosar Ferritina Sérica para descartar ferropenia latente.');
      }
    } else {
      // Cenários de Anemia
      if (classificacaoVcm === 'MICROCITICA') {
        if (classificacaoRdw === 'HETEROGENEA' || (mentzer && mentzer >= 13)) {
          hipoteses.push({
            diagnostico: 'Anemia Ferropriva (Deficiência de Ferro)',
            probabilidade: 'Alta',
            detalhe: 'Microcítica e hipocrômica com anisocitose/Mentzer >= 13. Causa mais prevalente no mundo.'
          });
        }
        if (classificacaoRdw === 'HOMOGENEA' || (mentzer && mentzer < 13)) {
          hipoteses.push({
            diagnostico: 'Talassemia Menor (Traço Talassêmico Alfa ou Beta)',
            probabilidade: 'Alta',
            detalhe: 'Microcitose com RDW homogêneo e Mentzer < 13. Investigar com Eletroforese de Hemoglobina.'
          });
        }
        hipoteses.push({
          diagnostico: 'Anemia de Doença Crônica / Inflamatória (fase avançada)',
          probabilidade: 'Moderada',
          detalhe: 'Pode se apresentar microcítica e hipocrômica por bloqueio da ferroportina via hepcidina elevada.'
        });
        investigacaoRecomendada.push('Cinética de Ferro completa: Ferritina sérica, Ferro sérico, Saturação de Transferrina e TIBC.');
        investigacaoRecomendada.push('Eletroforese de Hemoglobina em pH alcalino (quantificação de HbA2 e HbF).');
      } else if (classificacaoVcm === 'MACROCITICA') {
        hipoteses.push({
          diagnostico: 'Anemia Megaloblástica (Deficiência de Vitamina B12 ou Folato)',
          probabilidade: 'Alta',
          detalhe: 'Macrocitose acentuada. Avaliar neutrófilos hipersegmentados, gastrite atrófica, metformina, IBP ou etilismo.'
        });
        hipoteses.push({
          diagnostico: 'Anemia Não-Megaloblástica (Hepatopatia crônica, Etilismo, Hipotireoidismo, Mielodisplasia)',
          probabilidade: 'Moderada',
          detalhe: 'VCM aumentado secundário à alteração de membrana eritrocitária ou mielotoxicidade.'
        });
        if (analiseReticulocitaria && analiseReticulocitaria.tipoResposta === 'REGENERATIVA_HIPERPROLIFERATIVA') {
          hipoteses.push({
            diagnostico: 'Reticulocitose Marcada (pseudo-macrocitose)',
            probabilidade: 'Alta',
            detalhe: 'Reticulócitos jovens são maiores que hemácias maduras e elevam o VCM mensurado.'
          });
        }
        investigacaoRecomendada.push('Dosagem sérica de Vitamina B12 e Ácido Fólico.');
        investigacaoRecomendada.push('Avaliação de função tireoidiana (TSH, T4 livre) e função hepática (TGO, TGP, Gama-GT).');
        investigacaoRecomendada.push('Hematoscopia de sangue periférico para busca de neutrófilos hipersegmentados.');
      } else {
        // NORMOCÍTICA
        hipoteses.push({
          diagnostico: 'Anemia de Doença Crônica / Inflamação Sistêmica',
          probabilidade: 'Alta',
          detalhe: 'Padrão clássico normocítico/normocrômico associado a infecções, neoplasias ou doenças autoimunes.'
        });
        hipoteses.push({
          diagnostico: 'Anemia da Doença Renal Crônica (Déficit de Eritropoietina)',
          probabilidade: 'Moderada',
          detalhe: 'Avaliar Creatinina, Taxa de Filtração Glomerular (ClCr) e clearance renal.'
        });
        hipoteses.push({
          diagnostico: 'Hemorragia Aguda Recente (Perda Sanguínea Oculta ou Digestiva)',
          probabilidade: 'Moderada',
          detalhe: 'Normocítica e normocrômica com reticulocitose compensatória nas primeiras 48-72h.'
        });
        hipoteses.push({
          diagnostico: 'Anemia Hemolítica (Autoimune ou Microangiopática)',
          probabilidade: analiseReticulocitaria && analiseReticulocitaria.tipoResposta === 'REGENERATIVA_HIPERPROLIFERATIVA' ? 'Alta' : 'Moderada',
          detalhe: 'Acompanhada de elevação de LDH, bilirrubina indireta e queda de haptoglobina.'
        });
        hipoteses.push({
          diagnostico: 'Anemia Mista (Carência combinada de Ferro e B12/Folato)',
          probabilidade: 'Moderada',
          detalhe: 'A microcitose do ferro e a macrocitose da B12 se anulam no VCM médio, gerando RDW muito aumentado.'
        });
        investigacaoRecomendada.push('Proteína C Reativa (PCR), VHS, Creatinina e Ureia.');
        investigacaoRecomendada.push('Painel de Hemólise: Bilirrubinas total e frações, DHL/LDH, Haptoglobina e Teste de Coombs Direto.');
      }
    }

    // Integração com Exames Bioquímicos caso fornecidos
    var achadosBioquimicos = [];
    var ferritina = parseFloat(params.ferritina);
    var satTransf = parseFloat(params.saturacaoTransferrina || params.satTransferrina);
    var vitB12 = parseFloat(params.vitaminaB12 || params.b12);
    var folato = parseFloat(params.acidoFolico || params.folato);

    if (!isNaN(ferritina)) {
      if (ferritina < 30) {
        achadosBioquimicos.push('Ferritina Baixa (< 30 ng/mL = ' + ferritina + ' ng/mL): Confirma depleção absoluta de reservas corporais de ferro (Anemia Ferropriva).');
      } else if (ferritina >= 30 && ferritina < 100) {
        achadosBioquimicos.push('Ferritina limítrofe (' + ferritina + ' ng/mL): Em estados inflamatórios, valores até 100 ng/mL ainda podem representar deficiência real de ferro.');
      } else {
        achadosBioquimicos.push('Ferritina elevada (> 100 ng/mL = ' + ferritina + ' ng/mL): Reservas de ferro aparentemente preservadas ou proteína de fase aguda elevada por inflamação sistêmica.');
      }
    }

    if (!isNaN(satTransf)) {
      if (satTransf < 20) {
        achadosBioquimicos.push('Saturação de Transferrina Baixa (< 20% = ' + satTransf + '%): Indica aporte insuficiente de ferro circulante para a eritropoiese.');
      } else {
        achadosBioquimicos.push('Saturação de Transferrina Adequada (>= 20% = ' + satTransf + '%).');
      }
    }

    if (!isNaN(vitB12)) {
      if (vitB12 < 200) {
        achadosBioquimicos.push('Vitamina B12 Baixa (< 200 pg/mL = ' + vitB12 + ' pg/mL): Confirma deficiência grave de cobalamina. Risco de dano neurológico irreversível.');
      } else if (vitB12 >= 200 && vitB12 <= 350) {
        achadosBioquimicos.push('Vitamina B12 Limítrofe (200-350 pg/mL = ' + vitB12 + ' pg/mL): Sugere-se dosagem de Ácido Metilmalônico e Homocisteína séricos.');
      }
    }

    if (!isNaN(folato) && folato < 4.0) {
      achadosBioquimicos.push('Ácido Fólico Baixo (< 4.0 ng/mL = ' + folato + ' ng/mL): Deficiência de folato confirmada.');
    }

    // Gatilhos Transfusionais
    var gatilhoTransfusional = {
      indicado: false,
      alvoHb: '7.0 a 9.0 g/dL',
      orientacao: 'Paciente clinicamente estável: manter estratégia transfusional restritiva. Tratar causa de base.'
    };

    if (hb < 7.0) {
      gatilhoTransfusional.indicado = true;
      gatilhoTransfusional.orientacao = 'GATILHO ATINGIDO (Hb < 7.0 g/dL): Indicação de Concentrado de Hemácias (CHAD) para a maioria dos pacientes hospitalizados estáveis em enfermaria ou UTI (Estratégia Restritiva Padrão-Ouro). 1 bolsa de CHAD eleva Hb em ~1 g/dL e Ht em ~3%.';
      alertasClinicos.push('Hb < 7.0 g/dL: Gatilho para transfusão de concentrado de hemácias ativado.');
    } else if (hb < 8.0 && (params.cardiopatiaIsquemica || params.sca || params.infarto || params.posOperatorioCardiovascular)) {
      gatilhoTransfusional.indicado = true;
      gatilhoTransfusional.alvoHb = '8.0 a 10.0 g/dL';
      gatilhoTransfusional.orientacao = 'GATILHO ATINGIDO PARA CARDIOPATA (Hb < 8.0 g/dL): Paciente com Síndrome Coronariana Aguda ou pós-operatório cardiovascular tem alvo restritivo estendido para manter Hb >= 8.0 g/dL para prevenir isquemia miocárdica.';
      alertasClinicos.push('Paciente com cardiopatia isquêmica e Hb < 8.0 g/dL: Indicação de CHAD.');
    }

    if (hb < 6.0) {
      alertasClinicos.push('ALERTA VERMELHO: Hb crítica (< 6.0 g/dL). Risco iminente de isquemia de órgãos nobres, acidose lática e colapso circulatório. Transfusão prioritária e monitorização contínua.');
    }

    return {
      sucesso: true,
      perfil: infoPerfil.perfil,
      limiteMinimoHb: limiteMinimoHb,
      hb: hb,
      ht: ht,
      htEstimado: htEstimado,
      temAnemia: temAnemia,
      severidade: severidade,
      descricaoSeveridade: descricaoSeveridade,
      morfologia: {
        vcm: vcm,
        classificacaoVcm: classificacaoVcm,
        descVcm: descVcm,
        hcm: hcm,
        chcm: chcm,
        classificacaoCromia: classificacaoCromia,
        descCromia: descCromia,
        rdw: rdw,
        classificacaoRdw: classificacaoRdw,
        descRdw: descRdw
      },
      indicesEspeciais: {
        mentzer: mentzer,
        interpretacaoMentzer: interpretacaoMentzer,
        greenKing: greenKing,
        interpretacaoGreenKing: interpretacaoGreenKing
      },
      cineticaReticulocitaria: analiseReticulocitaria,
      achadosBioquimicos: achadosBioquimicos,
      hipotesesDiagnosticas: hipoteses,
      investigacaoRecomendada: investigacaoRecomendada,
      gatilhoTransfusional: gatilhoTransfusional,
      alertasClinicos: alertasClinicos
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. CALCULADORA DE REPOSIÇÃO DE FERRO ORAL E INTRAVENOSO (FÓRMULA DE GANZONI)
  // ───────────────────────────────────────────────────────────────────────────
  function calcularReposicaoFerro(params) {
    params = params || {};
    var pesoKg = parseFloat(params.pesoKg || params.peso);
    if (isNaN(pesoKg) || pesoKg <= 0) {
      throw new Error('Peso corporal (kg) é obrigatório para cálculo posológico de ferro.');
    }

    var hbAtual = parseFloat(params.hbAtual || params.hb || params.hemoglobina);
    if (isNaN(hbAtual) || hbAtual <= 0) {
      throw new Error('Hemoglobina atual (g/dL) é obrigatória.');
    }

    var infoPerfil = inferirLimiteHb(params);
    var hbAlvo = parseFloat(params.hbAlvo);
    if (isNaN(hbAlvo) || hbAlvo <= 0) {
      hbAlvo = infoPerfil.alvoHbGanzoni;
    }

    var idadeAnos = typeof params.idadeAnos === 'number' ? params.idadeAnos : null;
    var ehPediatrico = (idadeAnos !== null && idadeAnos < 12) || pesoKg < 35;
    var ehGestante = Boolean(params.gestante || params.gestacao || params.ehGestante);

    // ─────────────────────────────────────────────────────────
    // 4.1. CÁLCULO DA FÓRMULA DE GANZONI (FERRO ENDOVENOSO)
    // ─────────────────────────────────────────────────────────
    // Déficit Total (mg) = [Peso (kg) × (Hb Alvo - Hb Atual) × 2.4] + Reserva de Ferro (mg)
    var deltaHb = Math.max(0, hbAlvo - hbAtual);
    var reservaFerroMg = 500; // Padrão adulto >= 35 kg
    if (pesoKg < 35 || ehPediatrico) {
      reservaFerroMg = Math.round(15 * pesoKg); // 15 mg/kg em crianças e < 35 kg
    }

    // Fator 2.4 = 0.08 (vol sangue L/kg) * 0.34 (ferro na Hb %) * 100 (conversão de unidades)
    var deficitHbMg = Math.round(pesoKg * deltaHb * 2.4);
    var deficitTotalGanzoniMg = deficitHbMg + reservaFerroMg;

    // Noripurum IV / Sacarato de Hidróxido de Ferro III: 100 mg por ampola de 5 mL (20 mg/mL)
    var ampolas100mgTotal = Math.ceil(deficitTotalGanzoniMg / 100);
    // Dose máxima por aplicação: 200 mg (2 ampolas) infundidas em SF 0.9% 100-200 mL em 30-60 min
    var maxDoseSessaoMg = 200;
    if (pesoKg < 35) {
      maxDoseSessaoMg = Math.min(200, Math.round(7 * pesoKg)); // máx ~7 mg/kg por infusão em pediatria
    }
    var sessoesNecessarias = Math.ceil(deficitTotalGanzoniMg / maxDoseSessaoMg);

    // ─────────────────────────────────────────────────────────
    // 4.2. CRITÉRIOS DE INDICAÇÃO PARA FERRO INTRAVENOSO (IV)
    // ─────────────────────────────────────────────────────────
    var criteriosIv = [];
    var indicacaoIvForte = false;

    var motivoIv = String(params.motivoIv || '').toLowerCase();
    var comorbidades = Array.isArray(params.comorbidades) ? params.comorbidades.map(function(c){ return String(c).toLowerCase(); }) : [];

    if (motivoIv.includes('intoleran') || comorbidades.includes('intolerancia_vo')) {
      criteriosIv.push('Intolerância gastrointestinal grave ou refratária ao ferro oral (náuseas, vômitos incoercíveis, dor epigástrica incapacitante).');
      indicacaoIvForte = true;
    }
    if (motivoIv.includes('bariat') || comorbidades.includes('bariatrica') || comorbidades.includes('pos_bariatrica')) {
      criteriosIv.push('Pós-operatório de Cirurgia Bariátrica disabsortiva (bypass gástrico em Y-de-Roux ou duodenal switch com perda de duodeno/jejuno proximal para absorção).');
      indicacaoIvForte = true;
    }
    if (motivoIv.includes('dii') || motivoIv.includes('crohn') || motivoIv.includes('retocolite') || comorbidades.includes('dii')) {
      criteriosIv.push('Doença Inflamatória Intestinal ativa (DII - Doença de Crohn ou RCUI) onde ferro oral causa toxicidade mucosa e tem absorção bloqueada.');
      indicacaoIvForte = true;
    }
    if (motivoIv.includes('celiac') || comorbidades.includes('doenca_celiaca')) {
      criteriosIv.push('Doença Celíaca com atrofia vilosa duodenal severa e má absorção comprovada.');
      indicacaoIvForte = true;
    }
    if (ehGestante && (hbAtual < 9.0 || params.trimestreGestacional >= 2 || motivoIv.includes('gestan'))) {
      criteriosIv.push('Gestante no 2º ou 3º trimestre com anemia moderada a severa (necessidade de rápida repleção antes do parto com janela de tempo curta).');
      indicacaoIvForte = true;
    }
    if (comorbidades.includes('drc') || comorbidades.includes('hemodialise') || motivoIv.includes('renal')) {
      criteriosIv.push('Doença Renal Crônica em estágio IV-V ou em Hemodiálise com uso de Agentes Estimuladores da Eritropoiese (EPO).');
      indicacaoIvForte = true;
    }
    if (comorbidades.includes('icc') || comorbidades.includes('icfer') || motivoIv.includes('insuficiencia_cardiaca')) {
      criteriosIv.push('Insuficiência Cardíaca com Fração de Ejeção Reduzida (ICFEr / NYHA II-IV) e deficiência de ferro (estudos FAIR-HF / CONFIRM-HF demonstrando melhora de sobrevida e capacidade funcional).');
      indicacaoIvForte = true;
    }
    if (motivoIv.includes('sangramento_ativo') || motivoIv.includes('perda_cronica')) {
      criteriosIv.push('Sangramento contínuo que excede a capacidade de absorção fisiológica da mucosa intestinal (ex: angiodisplasia, Rendu-Osler-Weber).');
      indicacaoIvForte = true;
    }

    if (criteriosIv.length === 0) {
      criteriosIv.push('Sem contraindicação expressa ao ferro oral; tentar 1ª linha com via oral antes da indicação venosa, salvo piora sintomática ou má absorção documentada.');
    }

    // ─────────────────────────────────────────────────────────
    // 4.3. POSOLOGIA DO FERRO ORAL (VO)
    // ─────────────────────────────────────────────────────────
    var esquemaVo = {};
    if (ehPediatrico) {
      // 3 a 5 mg/kg/dia de ferro elementar
      var dosePediatricaMgDia = Math.round(3 * pesoKg);
      var dosePediatricaSeveraMgDia = Math.round(5 * pesoKg);
      // Teto máximo pediátrico: 60 mg/dia
      var doseFinalPediatrica = Math.min(60, dosePediatricaMgDia);
      var doseFinalSevera = Math.min(60, dosePediatricaSeveraMgDia);

      // Sulfato ferroso gotas (25 mg Fe/mL ~ 20 gotas = ~1.25 mg Fe/gota)
      var gotasSulfato = Math.round(doseFinalPediatrica / 1.25);
      // Noripurum gotas (50 mg Fe/mL ~ 20 gotas = 2.5 mg Fe/gota)
      var gotasNoripurum = Math.round(doseFinalPediatrica / 2.5);

      esquemaVo = {
        populacao: 'Pediátrica (SBP / MS)',
        doseRecomendadaMgKgDia: '3 a 5 mg/kg/dia de Ferro Elementar',
        doseCalculadaMgDia: doseFinalPediatrica,
        doseSeveraMgDia: doseFinalSevera,
        tetoSegurancaMgDia: 60,
        fracionamento: '1 a 2 vezes ao dia, preferencialmente 1h antes das refeições ou com suco de fruta cítrica (vitamina C).',
        opcoesPrescricao: [
          'Sulfato Ferroso gotas (25 mg Fe/mL): prescrever ' + gotasSulfato + ' gotas via oral 1 vez ao dia (ou fracionado em 2 tomadas).',
          'Ferropolimaltose / Noripurum gotas (50 mg Fe/mL): prescrever ' + gotasNoripurum + ' gotas via oral 1 vez ao dia (pode ser administrado junto ou após as refeições).'
        ],
        duracaoTratamento: 'Manter por 3 a 6 meses após a normalização da hemoglobina para reconstituir os estoques de ferritina.'
      };
    } else {
      // Adulto / Gestante: Evidência moderna preconiza 60 a 100 mg de Fe elementar/dia ou em dias alternados
      esquemaVo = {
        populacao: ehGestante ? 'Gestante' : 'Adulto Geral',
        doseRecomendadaMgDia: '60 a 100 mg de Ferro Elementar ao dia (ou 100 a 200 mg em dias alternados)',
        tetoSegurancaMgDia: 200,
        racionalCientifico: 'Doses elevadas (> 200 mg/dia) causam pico imediato de Hepcidina sérica que bloqueia a ferroportina e anula a absorção intestinal nas 24-48h seguintes, além de maximizar eventos gastrointestinais (dor epigástrica, náuseas, constipação). A administração em dose única matinal ou em dias alternados maximiza a absorção fracionada com excelente tolerabilidade.',
        opcoesPrescricao: [
          'Sulfato Ferroso 300 mg drágeas (~60 mg de Fe elementar): Tomar 1 drágea ao dia pela manhã em jejum com água ou suco de laranja/limão.',
          'Sulfato Ferroso 200 mg comprimidos (~40 mg de Fe elementar): Tomar 1 a 2 comprimidos ao dia pela manhã.',
          'Ferropolimaltose (Noripurum VO) 100 mg comprimidos mastigáveis: Tomar 1 comprimido ao dia durante a refeição principal (excelente tolerância gastrointestinal).'
        ],
        orientacoesPaciente: [
          'Tomar com água ou suco cítrico rico em vitamina C (aumenta absorção intestinal).',
          'NÃO ingerir junto com leite, queijo, iogurte, antiácidos, cálcio, café ou chá preto (quelam o ferro e impedem absorção). Manter intervalo mínimo de 2 horas.',
          'Alerte o paciente de que as fezes ficarão escurecidas (efeito inócuo esperado do ferro não absorvido).'
        ],
        duracaoTratamento: 'Continuar o tratamento por no mínimo 3 a 6 meses após a normalização da Hb, até atingir Ferritina sérica > 50-100 ng/mL.'
      };
    }

    // ─────────────────────────────────────────────────────────
    // 4.4. PRESCRIÇÃO E PROTOCOLO DO FERRO INTRAVENOSO (NORIPURUM IV)
    // ─────────────────────────────────────────────────────────
    var esquemaIv = {
      droga: 'Sacarato de Óxido de Ferro III (Noripurum IV / Venofer)',
      apresentacao: 'Ampola de 5 mL contendo 100 mg de Ferro Elementar (20 mg/mL)',
      deficitTotalGanzoniMg: deficitTotalGanzoniMg,
      reservaEstoqueMg: reservaFerroMg,
      deficitPorHbMg: deficitHbMg,
      deltaHb: Math.round(deltaHb * 10) / 10,
      hbAlvoGanzoni: hbAlvo,
      hbAtual: hbAtual,
      totalAmpolasNecessarias: ampolas100mgTotal,
      dosePorSessaoMg: maxDoseSessaoMg,
      ampolasPorSessao: Math.round(maxDoseSessaoMg / 100),
      totalSessoes: sessoesNecessarias,
      diluicaoRecomendada: maxDoseSessaoMg + ' mg (' + Math.round(maxDoseSessaoMg / 100) + ' ampolas de 5 mL) diluídos em 100 mL a 200 mL de Soro Fisiológico 0.9% (NUNCA usar Soro Glicosado 5% pela instabilidade físico-química da solução coloidal).',
      tempoInfusao: 'Infundir por via intravenosa estrita em no mínimo 30 a 60 minutos, com vazão controlada em bomba de infusão.',
      frequencia: 'Administrar 2 a 3 vezes por semana (em dias alternados, ex: Seg-Qua-Sex) até atingir a dose cumulativa total de ' + deficitTotalGanzoniMg + ' mg.',
      bloqueiosESeguranca: [
        'CONTRAINDICAÇÃO FORMAL NO 1º TRIMESTRE DE GESTAÇÃO (seguro no 2º e 3º trimestres).',
        'SUSPENDER FERRO ORAL durante todo o tratamento com ferro intravenoso (evitar saturação reticuloendotelial desnecessária).',
        'CUIDADO RIGOROSO COM EXTRAVASAMENTO: o ferro fora da veia causa hiperpigmentação dérmica marrom permanente ("tatuagem") e necrose tecidual inflamatória local. Testar patência do acesso venoso com SF 0.9% antes da infusão.',
        'MONITORIZAÇÃO DE HIPERSENSIBILIDADE: monitorar sinais vitais nos primeiros 15 minutos de infusão (risco de hipotensão, rubor facial e broncoespasmo).'
      ]
    };

    return {
      sucesso: true,
      pesoKg: pesoKg,
      hbAtual: hbAtual,
      hbAlvo: hbAlvo,
      indicacaoIvForte: indicacaoIvForte,
      criteriosIv: criteriosIv,
      esquemaVo: esquemaVo,
      esquemaIv: esquemaIv
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. RESUMO CLÍNICO UNIFICADO (BEIRA-LEITO & TELEGRAM)
  // ───────────────────────────────────────────────────────────────────────────
  function gerarRelatorioCompleto(params) {
    params = params || {};
    var analiseHemograma = interpretarHemogramaAnemia(params);
    var reposicao = null;

    if (params.pesoKg || params.peso) {
      try {
        reposicao = calcularReposicaoFerro(params);
      } catch (e) {
        reposicao = null;
      }
    }

    var linhas = [];
    linhas.push('🩸 *MÓDULO DE HEMATOLOGIA: INVESTIGAÇÃO & MANEJO DE ANEMIAS*');
    linhas.push('────────────────────────────────────────');
    linhas.push('👤 *Perfil:* ' + analiseHemograma.perfil);
    linhas.push('🔬 *Hemoglobina (Hb):* ' + analiseHemograma.hb + ' g/dL | *Hematócrito (Ht):* ' + analiseHemograma.ht + '%' + (analiseHemograma.htEstimado ? ' _(estimado)_' : ''));
    linhas.push('📊 *Status:* *' + (analiseHemograma.temAnemia ? 'ANEMIA DETECTADA (' + analiseHemograma.severidade + ')' : 'SEM ANEMIA') + '*');
    linhas.push('ℹ️ _' + analiseHemograma.descricaoSeveridade + '_');
    linhas.push('');

    // Morfologia
    linhas.push('📐 *ÍNDICES ERITROCITÁRIOS & MORFOLOGIA:*');
    linhas.push('• *VCM:* ' + (isNaN(analiseHemograma.morfologia.vcm) ? 'Não informado' : analiseHemograma.morfologia.vcm + ' fL (' + analiseHemograma.morfologia.classificacaoVcm + ')'));
    if (!isNaN(analiseHemograma.morfologia.hcm)) {
      linhas.push('• *HCM:* ' + analiseHemograma.morfologia.hcm + ' pg | *CHCM:* ' + (isNaN(analiseHemograma.morfologia.chcm) ? '-' : analiseHemograma.morfologia.chcm + ' g/dL') + ' (' + analiseHemograma.morfologia.classificacaoCromia + ')');
    }
    if (!isNaN(analiseHemograma.morfologia.rdw)) {
      linhas.push('• *RDW:* ' + analiseHemograma.morfologia.rdw + '% (' + analiseHemograma.morfologia.classificacaoRdw + ')');
    }

    // Mentzer e Green-King
    if (analiseHemograma.indicesEspeciais.interpretacaoMentzer) {
      linhas.push('• *Índice de Mentzer:* ' + analiseHemograma.indicesEspeciais.mentzer + ' → _' + analiseHemograma.indicesEspeciais.interpretacaoMentzer.texto + '_');
    }
    if (analiseHemograma.indicesEspeciais.interpretacaoGreenKing) {
      linhas.push('• *Índice Green & King:* ' + analiseHemograma.indicesEspeciais.greenKing + ' → _' + analiseHemograma.indicesEspeciais.interpretacaoGreenKing.texto + '_');
    }
    linhas.push('');

    // Cinética Reticulocitária
    if (analiseHemograma.cineticaReticulocitaria) {
      linhas.push('⚡ *CINÉTICA & RESPOSTA MEDULAR (RETICULÓCITOS):*');
      linhas.push('• *Reticulócitos:* ' + analiseHemograma.cineticaReticulocitaria.reticulocitosPct + '% | *Retic. Corrigidos:* ' + analiseHemograma.cineticaReticulocitaria.reticulocitosCorrigidosPct + '%');
      linhas.push('• *IPR (Índice Produção Reticulocitária):* ' + analiseHemograma.cineticaReticulocitaria.ipr + ' (*' + analiseHemograma.cineticaReticulocitaria.tipoResposta + '*)');
      linhas.push('• _' + analiseHemograma.cineticaReticulocitaria.conclusao + '_');
      linhas.push('');
    }

    // Hipóteses Diagnósticas
    linhas.push('🎯 *HIPÓTESES DIAGNÓSTICAS PRINCIPAIS:*');
    for (var i = 0; i < analiseHemograma.hipotesesDiagnosticas.length; i++) {
      var h = analiseHemograma.hipotesesDiagnosticas[i];
      linhas.push('• *' + h.diagnostico + '* (' + h.probabilidade + '): ' + h.detalhe);
    }
    linhas.push('');

    // Gatilho Transfusional
    if (analiseHemograma.gatilhoTransfusional.indicado) {
      linhas.push('🚨 *GATILHO TRANSFUSIONAL (CHAD):*');
      linhas.push('⚠️ ' + analiseHemograma.gatilhoTransfusional.orientacao);
      linhas.push('');
    }

    // Reposição de Ferro se calculada
    if (reposicao && reposicao.sucesso) {
      linhas.push('💊 *TERAPIA COM FERRO & FÓRMULA DE GANZONI:*');
      linhas.push('• *Peso:* ' + reposicao.pesoKg + ' kg | *Hb Alvo:* ' + reposicao.hbAlvo + ' g/dL');
      linhas.push('• *Déficit Total de Ferro (Ganzoni):* *' + reposicao.esquemaIv.deficitTotalGanzoniMg + ' mg* (Hb: ' + reposicao.esquemaIv.deficitPorHbMg + ' mg + Estoque: ' + reposicao.esquemaIv.reservaEstoqueMg + ' mg)');
      linhas.push('• *Total de Ampolas Noripurum IV (100mg/5mL):* *' + reposicao.esquemaIv.totalAmpolasNecessarias + ' ampolas*');
      linhas.push('• *Cronograma IV:* ' + reposicao.esquemaIv.totalSessoes + ' sessões de ' + reposicao.esquemaIv.dosePorSessaoMg + ' mg (' + reposicao.esquemaIv.ampolasPorSessao + ' ampolas) em 100-200 mL SF 0.9% 2-3x/semana.');
      linhas.push('');
      linhas.push('🌿 *Esquema Oral de 1ª Linha:* ' + reposicao.esquemaVo.opcoesPrescricao[0]);
      linhas.push('🛡️ _Teto seguro diário de Fe elementar: ' + reposicao.esquemaVo.tetoSegurancaMgDia + ' mg/dia (prevenção de bloqueio por hepcidina e intolerância gastrointestinal)._');
      linhas.push('');
    }

    // Alertas
    if (analiseHemograma.alertasClinicos.length > 0) {
      linhas.push('⚠️ *ALERTAS DE SEGURANÇA BEIRA-LEITO:*');
      for (var a = 0; a < analiseHemograma.alertasClinicos.length; a++) {
        linhas.push('• ' + analiseHemograma.alertasClinicos[a]);
      }
    }

    var textoFormatado = linhas.join('\n');

    return {
      sucesso: true,
      analiseHemograma: analiseHemograma,
      reposicaoFerro: reposicao,
      textoFormatado: textoFormatado
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. FORMATADOR PARA TELEGRAM
  // ───────────────────────────────────────────────────────────────────────────
  function formatarTextoTelegram(resultado) {
    if (!resultado || !resultado.sucesso) {
      return '❌ Erro ao processar avaliação de anemia.';
    }
    return resultado.textoFormatado;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 7. MÉTODOS UTILITÁRIOS DETERMINÍSTICOS BEIRA-LEITO
  // ───────────────────────────────────────────────────────────────────────────

  function classificarGravidadeAnemia(hb, perfilOpcoes) {
    var opts = perfilOpcoes || {};
    var info = inferirLimiteHb(opts);
    var limiteMinimo = info.limiteMinimoHb;
    var valorHb = parseFloat(hb);
    var temAnemia = valorHb < limiteMinimo;
    var gravidade = 'Sem Anemia';
    var riscoCritico = false;

    if (temAnemia) {
      if (valorHb < 6.0) {
        gravidade = 'Muito Grave / Crítica';
        riscoCritico = true;
      } else if (valorHb < 8.0) {
        gravidade = 'Grave / Severa';
        riscoCritico = true;
      } else if (valorHb < 10.0) {
        gravidade = 'Moderada';
      } else {
        gravidade = 'Leve';
      }
    }

    return {
      temAnemia: temAnemia,
      hb: valorHb,
      limiarNormal: limiteMinimo,
      deficitHb: temAnemia ? Math.round((limiteMinimo - valorHb) * 10) / 10 : 0,
      grupoDescricao: info.perfil,
      gravidade: gravidade,
      riscoCritico: riscoCritico
    };
  }

  function classificarMorfologia(vcm, hcm, chcm, rdw) {
    var v = parseFloat(vcm);
    var h = parseFloat(hcm);
    var c = parseFloat(chcm);
    var r = parseFloat(rdw);

    var tamanho = 'Normocítica';
    if (!isNaN(v)) {
      if (v < 80) tamanho = 'Microcítica';
      else if (v > 100) tamanho = 'Macrocítica';
    }

    var cor = 'Normocrômica';
    if ((!isNaN(h) && h < 27) || (!isNaN(c) && c < 32)) {
      cor = 'Hipocrômica';
    } else if (!isNaN(c) && c > 36) {
      cor = 'Hipercrômica';
    }

    var anisocitose = (!isNaN(r) && r > 14.5);
    var classificacaoCombinada = tamanho + ' ' + cor + (anisocitose ? ' com anisocitose (RDW elevado)' : ' homogênea (RDW normal)');

    var achados = [];
    if (!isNaN(v) && v > 115) {
      achados.push('Macrocitose acentuada (VCM > 115 fL): forte correlação com causa megaloblástica (B12/Folato) ou Síndrome Mielodisplásica.');
    }
    if (anisocitose) {
      achados.push('Anisocitose acentuada (RDW > 14.5%): alta variabilidade no volume eritrocitário.');
    }

    return {
      tamanho: tamanho,
      cor: cor,
      anisocitose: anisocitose,
      classificacaoCombinada: classificacaoCombinada,
      achados: achados
    };
  }

  function calcularIndiceMentzer(vcm, hemacias) {
    var v = parseFloat(vcm);
    var he = parseFloat(hemacias);
    if (isNaN(v) || isNaN(he) || he <= 0) return null;
    var valor = Math.round((v / he) * 10) / 10;
    var ehTalassemia = valor < 13;
    return {
      valor: valor,
      sugestao: ehTalassemia ? 'Traço Talassêmico (Talassemia Minor)' : 'Anemia Ferropriva',
      probabilidade: 'Elevada',
      explicacao: ehTalassemia
        ? 'Índice de Mentzer < 13 reflete microcitose com alta contagem eritrocitária ("muitas hemácias pequenas"), característico de traço talassêmico. Solicitar Eletroforese de Hemoglobina.'
        : 'Índice de Mentzer >= 13 reflete carência de substrato (ferro) que limita tanto o tamanho quanto o número de hemácias. Solicitar Ferritina e Cinética de Ferro.'
    };
  }

  function calcularGreenKing(vcm, rdw, hb) {
    var v = parseFloat(vcm);
    var r = parseFloat(rdw);
    var h = parseFloat(hb);
    if (isNaN(v) || isNaN(r) || isNaN(h) || h <= 0) return null;
    var valor = Math.round(((v * v * r) / (100 * h)) * 10) / 10;
    var padrao = valor < 72 ? 'Talassemia Minor' : 'Anemia Ferropriva';
    return {
      valor: valor,
      sugestao: padrao,
      explicacao: valor < 72
        ? 'Índice Green & King < 72 favorece fortemente Traço Talassêmico.'
        : 'Índice Green & King >= 72 favorece fortemente Anemia Ferropriva.'
    };
  }

  function calcularIPR(reticulocitosPct, ht) {
    var retic = parseFloat(reticulocitosPct);
    var htc = parseFloat(ht);
    if (isNaN(retic) || isNaN(htc) || htc <= 0) return null;
    var reticCorr = Math.round((retic * (htc / 45)) * 100) / 100;
    var factor = 1.0;
    if (htc < 15) factor = 2.5;
    else if (htc < 25) factor = 2.0;
    else if (htc < 35) factor = 1.5;
    var ipr = Math.round((reticCorr / factor) * 100) / 100;
    var regenerativa = ipr >= 2.0;
    return {
      reticulocitosPerc: retic,
      reticulocitosPct: retic,
      reticulocitosCorrigidos: reticCorr,
      fatorShift: factor,
      shiftFactor: factor,
      ipr: ipr,
      tipo: regenerativa ? 'REGENERATIVA' : 'HIPOPROLIFERATIVA',
      regenerativa: regenerativa,
      classificacao: regenerativa ? 'Hiperproliferativa / Regenerativa (IPR ≥ 2,0)' : 'Hipoproliferativa / Arregenerativa (IPR < 2,0)',
      conclusao: regenerativa
        ? 'IPR >= 2.0: Resposta medular hiperproliferativa / regenerativa adequada (Hemólise ou Sangramento Agudo recente).'
        : 'IPR < 2.0: Resposta medular hipoproliferativa / arregenerativa inadequada (Carência de Ferro/B12/Folato, Anemia de Doença Crônica ou Insuficiência Renal).'
    };
  }
  var calcularIpr = calcularIPR;

  function avaliarCineticaFerro(ferritina, ferroSerico, tibc, istInformado, contextoInflamatorio) {
    var ferr = parseFloat(ferritina);
    var fe = parseFloat(ferroSerico);
    var cap = parseFloat(tibc);
    var ist = !isNaN(parseFloat(istInformado)) ? parseFloat(istInformado) : (!isNaN(fe) && !isNaN(cap) && cap > 0 ? Math.round((fe / cap) * 1000) / 10 : null);

    var padrao = 'Indeterminado';
    var detalhes = [];

    if (!isNaN(ferr)) {
      if (ferr < 30) {
        padrao = 'Deficiência Absoluta de Ferro (Ferropenia Estrita)';
        detalhes.push('Ferritina < 30 ng/mL confirma depleção de estoques.');
      } else if (ferr > 500 || (ist !== null && ist > 50)) {
        padrao = 'Sobrecarga de Ferro / Hiperferritinemia';
        detalhes.push('Sobrecarga de ferro ou síndrome de ativação macrofágica.');
      } else if (contextoInflamatorio || ferr > 100) {
        padrao = 'Anemia de Doença Crônica / Inflamatória';
        detalhes.push('Ferritina preservada ou elevada com bloqueio reticuloendotelial.');
      }
    }

    return {
      padrao: padrao,
      ferritina: !isNaN(ferr) ? ferr : null,
      ferroSerico: !isNaN(fe) ? fe : null,
      tibc: !isNaN(cap) ? cap : null,
      ist: ist,
      detalhes: detalhes
    };
  }

  function calcularDoseFerroOral(params) {
    var p = params || {};
    var pesoKg = parseFloat(p.pesoKg || 70);
    var perfil = String(p.perfil || 'adulto').toLowerCase();
    var ehPediatrico = perfil === 'pediatria' || (p.idadeMeses !== undefined && p.idadeMeses < 144) || pesoKg < 35;

    if (ehPediatrico) {
      var doseCalc = Math.round(4 * pesoKg);
      var doseFinal = Math.min(60, doseCalc);
      return {
        doseFeElementarMgDia: doseFinal,
        gotasSulfatoPediátrico: doseFinal,
        esquemaPosologico: doseFinal + ' mg/dia de ferro elementar (' + doseFinal + ' gotas de Sulfato Ferroso)',
        orientacoes: ['Tomar 1h antes das refeições ou com suco rico em vitamina C.'],
        alertasToxicos: ['⚠️ SEGURANÇA DOMÉSTICA: Manter fora do alcance de crianças pelo risco de intoxicação acidental aguda fatal por ferro.']
      };
    }

    return {
      doseFeElementarMgDia: 80,
      esquemaPosologico: '60 a 100 mg de Ferro Elementar em DIAS ALTERNADOS (ou 60 a 120 mg/dia diário).',
      orientacoes: ['Tomar pela manhã em jejum com água ou suco rico em vitamina C.'],
      alertasToxicos: ['TETO DE TOLERÂNCIA ORAL: Doses diárias > 200 mg/dia não aumentam a absorção e geram bloqueio por hepcidina e intolerância gastrointestinal.']
    };
  }

  function calcularProfilaxiaPediatricaSBP(pesoNascimentoGramas, idadeMeses, emUsoFormulaInfantil) {
    var pesoNasc = Number(pesoNascimentoGramas);
    var idade = Number(idadeMeses || 6);

    var dose = 1.0;
    var faixa = '';
    var inicio = '';

    if (pesoNasc < 1000) {
      faixa = 'Extremo Baixo Peso (< 1.000g)';
      dose = idade < 12 ? 4.0 : 1.0;
      inicio = 'Aos 30 dias de vida';
    } else if (pesoNasc < 1500) {
      faixa = 'Muito Baixo Peso (1.000g a 1.499g)';
      dose = idade < 12 ? 3.0 : 1.0;
      inicio = 'Aos 30 dias de vida';
    } else if (pesoNasc < 2500) {
      faixa = 'Baixo Peso ao Nascer (1.500g a 2.499g)';
      dose = idade < 12 ? 2.0 : 1.0;
      inicio = 'Aos 30 dias de vida';
    } else {
      faixa = 'A Termo e Peso Adequado (≥ 2.500g)';
      dose = 1.0;
      inicio = 'Aos 6 meses de vida';
    }

    return {
      pesoNascimentoGramas: pesoNasc,
      idadeMeses: idade,
      doseRecomendadaMgKgDia: dose,
      faixaNascimento: faixa,
      momentoInicio: inicio,
      duracao: 'Até os 2 anos de idade',
      orientacao: dose + ' mg/kg/dia até ' + (idade < 12 ? '1 ano e depois 1 mg/kg/dia até 2 anos' : '2 anos.')
    };
  }

  function calcularGanzoni(pesoKgOrParams, hbAtual, hbAlvo, depositoMg) {
    var p = typeof pesoKgOrParams === 'object' && pesoKgOrParams !== null ? pesoKgOrParams : {
      pesoKg: pesoKgOrParams,
      hbAtual: hbAtual,
      hbAlvo: hbAlvo,
      depositoMg: depositoMg
    };

    var peso = parseFloat(p.pesoKg || p.peso);
    var atual = parseFloat(p.hbAtual || p.hb);
    var alvo = parseFloat(p.hbAlvo);
    if (isNaN(alvo) || alvo <= 0) alvo = (p.gestante || p.sexo === 'F') ? 14.0 : 15.0;

    var deltaHb = Math.max(0, alvo - atual);
    var dep = typeof p.depositoMg === 'number' ? p.depositoMg : (peso < 35 ? Math.round(15 * peso) : 500);
    var deficitHbMg = Math.round(peso * deltaHb * 2.4);
    var deficitTotal = deficitHbMg + dep;

    var ampolasNoripurum = Math.ceil(deficitTotal / 100);
    var maxDoseNoripurum = 200;
    var sessoesNoripurum = Math.ceil(deficitTotal / maxDoseNoripurum);

    var frascosFerinject = Math.ceil(deficitTotal / 500);
    var sessoesFerinject = Math.ceil(deficitTotal / 1000);

    var aptoParaFerroEv = true;
    var bloqueios = [];

    if (p.gestante && (p.trimestre === 1 || p.primeiroTrimestre)) {
      aptoParaFerroEv = false;
      bloqueios.push('Primeiro trimestre de gestação: contraindicação formal a ferro IV.');
    }
    if (p.infeccaoAtiva || p.bacteriemia) {
      aptoParaFerroEv = false;
      bloqueios.push('Infecção bacteriana sistêmica ativa: suspender ferro IV até controle infeccioso.');
    }
    if (p.sobrecargaFerro) {
      aptoParaFerroEv = false;
      bloqueios.push('Sobrecarga de ferro sérica ou tecidual: contraindicação absoluta.');
    }

    return {
      pesoKg: peso,
      hbAtual: atual,
      hbAlvo: alvo,
      depositoMg: dep,
      deficitTotalFerroMg: deficitTotal,
      formulaGanzoniTexto: '[' + peso + ' kg × (' + alvo + ' - ' + atual + ') × 2.4] + ' + dep + ' mg',
      noripurum: {
        ampolasTotal: ampolasNoripurum,
        dosePorSessaoMg: maxDoseNoripurum,
        sessoesNecessarias: sessoesNoripurum
      },
      ferinject: {
        frascosTotal: frascosFerinject,
        dosePorSessaoMg: Math.min(deficitTotal, 1000),
        sessoesNecessarias: sessoesFerinject
      },
      aptoParaFerroEv: aptoParaFerroEv,
      bloqueiosSeguranca: bloqueios
    };
  }

  function analisarCasoCompleto(params) {
    var p = params || {};
    var hb = parseFloat(p.hb || p.hemoglobina);
    var vcm = parseFloat(p.vcm);
    var hcm = parseFloat(p.hcm);
    var chcm = parseFloat(p.chcm);
    var rdw = parseFloat(p.rdw);
    var hemacias = parseFloat(p.hemacias || p.he);
    var ht = parseFloat(p.ht || (hb ? Math.round(hb * 3 * 10) / 10 : 0));
    var retic = parseFloat(p.reticulocitos || p.retic);

    var est = classificarGravidadeAnemia(hb, p);
    var mor = classificarMorfologia(vcm, hcm, chcm, rdw);
    var ment = calcularIndiceMentzer(vcm, hemacias);
    var gk = calcularGreenKing(vcm, rdw, hb);
    var ipr = calcularIPR(retic, ht);
    var cin = avaliarCineticaFerro(p.ferritina, p.ferroSerico, p.tibc, p.ist, p.inflamacao);
    var oral = calcularDoseFerroOral(p);
    var ganz = calcularGanzoni(p);

    var hemolise = {
      alertaEmergencia: Boolean(p.esquizocitos),
      diagnostico: Boolean(p.esquizocitos) ? 'Microangiopatia Trombótica (MAT / PTT / SHU)' : (p.coombsDireto ? 'Anemia Hemolítica Autoimune (AHAI)' : 'Sem hemólise evidente'),
      achados: []
    };

    var hipotesePrincipal = 'Anemia a esclarecer';
    if (!est.temAnemia) {
      hipotesePrincipal = 'Sem anemia';
    } else if (p.esquizocitos) {
      hipotesePrincipal = 'Microangiopatia Trombótica (MAT / PTT / SHU)';
    } else if (vcm && vcm < 80) {
      if (ment && ment.valor < 13 && (!rdw || rdw <= 14.5)) {
        hipotesePrincipal = 'Traço Talassêmico (Talassemia Menor)';
      } else {
        hipotesePrincipal = 'Anemia Ferropriva';
      }
    } else if (vcm && vcm > 100) {
      hipotesePrincipal = 'Anemia Megaloblástica vs Macrocítica';
    } else {
      hipotesePrincipal = 'Anemia Normocítica e Normocrômica';
    }

    var baseRelatorio = gerarRelatorioCompleto(p);

    return {
      sucesso: true,
      hb: hb,
      vcm: vcm,
      hcm: hcm,
      chcm: chcm,
      rdw: rdw,
      hemacias: hemacias,
      ht: ht,
      estratificacao: est,
      morfologia: mor,
      mentzer: ment,
      greenKing: gk,
      ipr: ipr,
      cinetica: cin,
      hemolise: hemolise,
      doseOral: oral,
      ganzoni: ganz,
      hipotesePrincipal: hipotesePrincipal,
      textoFormatado: baseRelatorio.textoFormatado,
      analiseHemograma: baseRelatorio.analiseHemograma,
      reposicaoFerro: baseRelatorio.reposicaoFerro
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // EXPORTAÇÃO PÚBLICA
  // ───────────────────────────────────────────────────────────────────────────
  return {
    LIMITES_HB: LIMITES_HB,
    inferirLimiteHb: inferirLimiteHb,
    interpretarHemogramaAnemia: interpretarHemogramaAnemia,
    calcularReposicaoFerro: calcularReposicaoFerro,
    gerarRelatorioCompleto: gerarRelatorioCompleto,
    analisarCasoCompleto: analisarCasoCompleto,
    classificarGravidadeAnemia: classificarGravidadeAnemia,
    classificarMorfologia: classificarMorfologia,
    calcularIndiceMentzer: calcularIndiceMentzer,
    calcularGreenKing: calcularGreenKing,
    calcularIPR: calcularIPR,
    calcularIpr: calcularIpr,
    avaliarCineticaFerro: avaliarCineticaFerro,
    calcularDoseFerroOral: calcularDoseFerroOral,
    calcularProfilaxiaPediatricaSBP: calcularProfilaxiaPediatricaSBP,
    calcularGanzoni: calcularGanzoni,
    formatarTextoTelegram: formatarTextoTelegram
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HematologiaAnemiasService;
}

