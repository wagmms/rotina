/**
 * ==============================================================================
 * MÓDULO 02-E: GINECOLOGIA AMBULATORIAL DE CONSULTÓRIO (SAÚDE DA MULHER)
 * ==============================================================================
 * Motor determinístico de alta fidelidade clínica e farmacológica para:
 *  - Rastreamento do Câncer de Colo Uterino (Diretrizes Brasileiras INCA/MS 2016+):
 *    faixa etária, periodicidade, laudos citopatológicos (ASC-US, LSIL, ASC-H,
 *    HSIL, AGC, Carcinoma), condutas na Atenção Básica e Colposcopia ("Ver e Tratar").
 *  - Sangramento Uterino Anormal (SUA - Classificação FIGO / PALM-COEIN):
 *    exclusão mandatória de gestação, estratificação de choque, hemostasia de
 *    urgência (Ácido Tranexâmico, ACO em doses altas, Progestagênios) e manejo crônico.
 *  - Critérios Médicos de Elegibilidade para Uso de Métodos Anticoncepcionais (OMS/MS):
 *    Categorias 1 a 4 com filtro rápido por comorbidades críticas (enxaqueca com aura,
 *    trombose prévia/ativa, HAS não controlada, tabagismo >=35a, pós-parto e lactação,
 *    câncer de mama, LES e diabetes com vasculopatia).
 *  - Síndromes Infecciosas Vulvovaginais (Leucorreias):
 *    Diagnóstico sindrômico e etiológico de Candidíase, Vaginose Bacteriana e
 *    Tricomoníase, critérios de Amsel, tratamentos de 1ª linha REMUME, alertas
 *    críticos na gestação (bloqueio de Fluconazol oral) e efeito dissulfiram.
 *
 * REFERÊNCIAS:
 *  - Diretrizes Brasileiras para o Rastreamento do Câncer do Colo do Útero (INCA/MS 2016).
 *  - FEBRASGO: Manual de Trato Genital Inferior; Manual de Anticoncepção; Tratado de Ginecologia.
 *  - Organização Mundial da Saúde (OMS): Medical Eligibility Criteria for Contraceptive Use (5th ed).
 *  - Federação Internacional de Ginecologia e Obstetrícia (FIGO): Classificação PALM-COEIN para SUA.
 *  - Ministério da Saúde: Protocolo Clínico e Diretrizes Terapêuticas (PCDT) para ISTs.
 * ==============================================================================
 */

var GinecologiaAmbulatorialService = (function() {
  'use strict';

  // ───────────────────────────────────────────────────────────────────────────
  // 1. RASTREAMENTO DO CÂNCER DO COLO UTERINO (INCA / MINISTÉRIO DA SAÚDE)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avalia a indicação de rastreio e conduta frente ao laudo citopatológico
   * de acordo com as Diretrizes Brasileiras para o Rastreamento do Câncer do Colo do Útero (INCA/MS).
   *
   * @param {Object} dados
   * @param {number} dados.idade
   * @param {string} dados.resultadoCitologia (ex: 'negativo', 'asc_us', 'lsil', 'asc_h', 'hsil', 'agc', 'carcinoma', 'insatisfatorio', 'rotina')
   * @param {number} [dados.examesAnterioresNegativos]
   * @param {boolean} [dados.imunossuprimida] (HIV+, imunossupressores, transplantadas)
   * @param {boolean} [dados.histerectomizadaTotal] (colo uterino totalmente ressecado por patologia benigna)
   * @param {boolean} [dados.gestante]
   * @param {boolean} [dados.ascUsOuLsilPrevio] (histórico de ASC-US ou LSIL persistente)
   */
  function avaliarRastreioColoUterino(dados) {
    dados = dados || {};
    var idade = Number(dados.idade);
    if (isNaN(idade) || idade < 0) idade = 30; // Idade padrão fértil se omitida

    var resultadoRaw = String(dados.resultadoCitologia || 'rotina').toLowerCase().trim();
    var examesNegativos = Number(dados.examesAnterioresNegativos || 0);
    var imunossuprimida = Boolean(dados.imunossuprimida);
    var histerectomizadaTotal = Boolean(dados.histerectomizadaTotal);
    var gestante = Boolean(dados.gestante);
    var lesaoPrevia = Boolean(dados.ascUsOuLsilPrevio);

    // Normalização do laudo citopatológico
    var citologia = 'ROTINA';
    if (resultadoRaw.indexOf('asc-h') >= 0 || resultadoRaw.indexOf('asch') >= 0 || resultadoRaw.indexOf('asc_h') >= 0) {
      citologia = 'ASC_H';
    } else if (resultadoRaw.indexOf('asc-us') >= 0 || resultadoRaw.indexOf('ascus') >= 0 || resultadoRaw.indexOf('asc_us') >= 0) {
      citologia = 'ASC_US';
    } else if (resultadoRaw.indexOf('hsil') >= 0 || resultadoRaw.indexOf('alto grau') >= 0 || resultadoRaw.indexOf('nic 2') >= 0 || resultadoRaw.indexOf('nic 3') >= 0) {
      citologia = 'HSIL';
    } else if (resultadoRaw.indexOf('lsil') >= 0 || resultadoRaw.indexOf('baixo grau') >= 0 || resultadoRaw.indexOf('nic 1') >= 0) {
      citologia = 'LSIL';
    } else if (resultadoRaw.indexOf('agc') >= 0 || resultadoRaw.indexOf('agus') >= 0 || resultadoRaw.indexOf('glandular') >= 0) {
      citologia = 'AGC';
    } else if (resultadoRaw.indexOf('carcinoma') >= 0 || resultadoRaw.indexOf('malign') >= 0 || resultadoRaw.indexOf('invasor') >= 0) {
      citologia = 'CARCINOMA_INVASOR';
    } else if (resultadoRaw.indexOf('insatisfat') >= 0 || resultadoRaw.indexOf('inadequada') >= 0) {
      citologia = 'INSATISFATORIO';
    } else if (resultadoRaw.indexOf('negat') >= 0 || resultadoRaw.indexOf('normal') >= 0 || resultadoRaw.indexOf('sem atipia') >= 0) {
      citologia = 'NEGATIVO';
    }

    var condutas = [];
    var alertas = [];
    var localAtendimento = 'ATENCAO_BASICA'; // 'ATENCAO_BASICA' ou 'COLPOSCOPIA_ESPECIALIZADA'
    var prazoRecomendado = '';
    var periodicidadeFutura = '';

    // CENÁRIO ESPECIAL: Histerectomizada Total por lesão benigna
    if (histerectomizadaTotal) {
      return {
        elegivelRastreio: false,
        idade: idade,
        citologia: citologia,
        classificacao: 'DISPENSADA_DO_RASTREAMENTO',
        localAtendimento: 'ATENCAO_BASICA',
        resumoConduta: 'Dispensada de rastreamento citopatológico de rotina.',
        condutas: [
          'Mulheres com histerectomia total (colo e corpo uterinos retirados) por patologias benignas e sem histórico prévio de lesão de alto grau (NIC II/III) não se beneficiam de rastreamento citopatológico de cúpula vaginal.',
          'Interromper a coleta de preventivo vaginal, salvo se queixa de sangramento ou histórico de NIC II, NIC III ou câncer ginecológico.'
        ],
        alertas: ['Se histerectomia subtotal (colo uterino preservado), o rastreamento deve seguir a rotina normal.'],
        diretrizReferencia: 'Diretrizes Brasileiras para o Rastreamento do Câncer do Colo do Útero (INCA/MS 2016)'
      };
    }

    // CENÁRIO ESPECIAL: Imunossuprimidas (HIV+, transplantadas, corticoterapia crônica)
    if (imunossuprimida) {
      alertas.push('⚠️ PROTOCOLO ESPECIAL DE IMUNOSSUPRESSÃO: Mulheres imunossuprimidas têm progressão acelerada e maior persistência de infecções oncogênicas por HPV.');
      if (citologia === 'NEGATIVO' || citologia === 'ROTINA') {
        localAtendimento = 'ATENCAO_BASICA';
        prazoRecomendado = 'Semestral no 1º ano; anual se negativos.';
        condutas.push('Iniciar rastreamento citopatológico logo após a sexarca (independentemente de ter 25 anos).');
        condutas.push('Periodicidade: Realizar exames a cada 6 meses no primeiro ano de acompanhamento.');
        condutas.push('Se ambos os exames semestrais forem normais, manter seguimento ANUAL enquanto durar a imunossupressão.');
        condutas.push('Se contagem de Linfócitos T CD4 < 200 céls/mm³, manter rastreamento semestral contínuo.');
      } else if (citologia === 'INSATISFATORIO') {
        prazoRecomendado = 'Repetir em 6 a 12 semanas.';
        condutas.push('Repetir a coleta citológica na Atenção Básica em 6 a 12 semanas.');
      } else {
        // Qualquer alteração citopatológica em imunossuprimida exige colposcopia imediata!
        localAtendimento = 'COLPOSCOPIA_ESPECIALIZADA';
        prazoRecomendado = 'Imediato (Colposcopia especializada)';
        condutas.push('Encaminhar IMEDIATAMENTE para Colposcopia especializada.');
        condutas.push('Em pacientes imunossuprimidas, qualquer atipia citológica (inclusive ASC-US ou LSIL) justifica colposcopia direta pelo alto risco de lesão precursora oculta.');
      }

      return {
        elegivelRastreio: true,
        idade: idade,
        imunossuprimida: true,
        citologia: citologia,
        classificacao: localAtendimento === 'COLPOSCOPIA_ESPECIALIZADA' ? 'COLPOSCOPIA_IMEDIATA_IMUNOSSUPRESSAO' : 'RASTREAMENTO_IMUNOSSUPRIMIDA',
        localAtendimento: localAtendimento,
        prazoRecomendado: prazoRecomendado,
        resumoConduta: localAtendimento === 'COLPOSCOPIA_ESPECIALIZADA' ? 'Encaminhar diretamente para Colposcopia por imunossupressão.' : 'Seguimento semestral/anual rigoroso.',
        condutas: condutas,
        alertas: alertas,
        diretrizReferencia: 'Diretrizes Brasileiras para o Rastreamento do Câncer do Colo do Útero (INCA/MS 2016)'
      };
    }

    // AVALIAÇÃO DETERMINÍSTICA POR FAIXA ETÁRIA (População Geral Não Imunossuprimida)
    if (idade < 25) {
      if (citologia === 'ROTINA' || citologia === 'NEGATIVO') {
        return {
          elegivelRastreio: false,
          idade: idade,
          citologia: citologia,
          classificacao: 'NAO_INDICADO_MENOR_25_ANOS',
          localAtendimento: 'ATENCAO_BASICA',
          resumoConduta: 'Rastreamento citopatológico NÃO é recomendado antes dos 25 anos.',
          condutas: [
            'As Diretrizes Brasileiras (INCA/MS) contraindicam o rastreamento citopatológico de rotina em mulheres com menos de 25 anos, mesmo com vida sexual ativa.',
            'Justificativa Clínica: Altíssima prevalência de infecção transitória por HPV nessa faixa etária, com resolução espontânea em mais de 90% dos casos e incidência de câncer invasor extremamente rara.',
            'Risco de Sobrerastreamento: Procedimentos excisionais desnecessários no colo uterino podem induzir estenose cervical, incompetência istmo-cervical e risco de parto prematuro futuro.',
            'Focar conduta em: Vacinação contra o HPV (esquema SUS dose única 9 a 14 anos), aconselhamento sobre sexo protegido (preservativos para prevenção de ISTs) e métodos contraceptivos.'
          ],
          alertas: ['Orientar a iniciar o rastreamento citológico formal de rotina ao completar 25 anos de idade.'],
          diretrizReferencia: 'Diretrizes Brasileiras para o Rastreamento do Câncer do Colo do Útero (INCA/MS 2016)'
        };
      } else if (citologia === 'ASC_US' || citologia === 'LSIL') {
        return {
          elegivelRastreio: true,
          idade: idade,
          citologia: citologia,
          classificacao: 'CONDUTA_EXPECTANTE_MENOR_25',
          localAtendimento: 'ATENCAO_BASICA',
          prazoRecomendado: 'Repetir aos 25 anos (ou em 3 anos)',
          resumoConduta: 'Conduta expectante e não intervencionista em menores de 25 anos.',
          condutas: [
            'Em mulheres com menos de 25 anos que apresentam ASC-US ou LSIL, a conduta recomendada pelo INCA/MS é EXPECTANTE.',
            'Não encaminhar para colposcopia imediata nem realizar biópsias excisionais precoces.',
            'Repetir a citologia oncótica aos 25 anos de idade (ou em intervalo de até 3 anos se idade muito próxima).'
          ],
          alertas: ['A taxa de clareamento viral espontâneo e regressão de LSIL/ASC-US supera 90% em adultas jovens.'],
          diretrizReferencia: 'Diretrizes Brasileiras para o Rastreamento do Câncer do Colo do Útero (INCA/MS 2016)'
        };
      }
      // Se for ASC-H, HSIL ou AGC em < 25 anos, segue para colposcopia abaixo.
    } else if (idade > 64) {
      if (examesNegativos >= 2 && citologia === 'ROTINA') {
        return {
          elegivelRastreio: false,
          idade: idade,
          citologia: citologia,
          classificacao: 'ENCERRAMENTO_RASTREAMENTO',
          localAtendimento: 'ATENCAO_BASICA',
          resumoConduta: 'Rastreamento pode ser encerrado (>= 65 anos com exames prévios normais).',
          condutas: [
            'Mulheres a partir de 65 anos que possuem histórico documentado de pelo menos 2 exames citopatológicos negativos consecutivos nos últimos 5 anos podem ter o rastreamento encerrado.',
            'A probabilidade de desenvolvimento de novas neoplasias cervicais de novo nessa faixa etária na ausência de lesões pregressas é clinicamente insignificante.'
          ],
          alertas: ['Se a mulher nunca realizou preventivo na vida ou não possui histórico, realizar 2 exames citológicos com intervalo de 1 ano; se ambos forem negativos, encerrar o rastreamento.'],
          diretrizReferencia: 'Diretrizes Brasileiras para o Rastreamento do Câncer do Colo do Útero (INCA/MS 2016)'
        };
      }
    }

    // CONDUTAS ESPECÍFICAS POR RESULTADO CITOPATOLÓGICO (>= 25 anos)
    switch (citologia) {
      case 'NEGATIVO':
      case 'ROTINA':
        localAtendimento = 'ATENCAO_BASICA';
        if (examesNegativos >= 2) {
          prazoRecomendado = 'Em 3 anos (Rastreamento Trienal)';
          periodicidadeFutura = 'A cada 3 anos até os 64 anos.';
          condutas.push('Seguimento de rotina trienal: Repetir a citologia em 3 anos na Atenção Básica.');
          condutas.push('Paciente possui >= 2 exames anuais consecutivos negativos, o que confere elevada segurança para intervalo trienal (Diretrizes INCA/MS).');
        } else {
          prazoRecomendado = 'Em 1 ano (Segundo exame consecutivo)';
          periodicidadeFutura = 'Após 2 exames anuais negativos consecutivos, o intervalo passa a ser a cada 3 anos.';
          condutas.push('Repetir citologia oncótica em 1 ano na Atenção Básica.');
          condutas.push('Conforme o protocolo do Ministério da Saúde, os 2 primeiros exames devem ser anuais consecutivos. Se ambos forem negativos, o intervalo passa a ser trienal.');
        }
        break;

      case 'ASC_US':
        // Células escamosas atípicas de significado indeterminado possivelmente não neoplásicas
        if (lesaoPrevia) {
          localAtendimento = 'COLPOSCOPIA_ESPECIALIZADA';
          prazoRecomendado = 'Colposcopia Imediata (ASC-US persistente)';
          condutas.push('Encaminhar para COLPOSCOPIA na Unidade Secundária / Especializada.');
          condutas.push('Indicação: Persistência de ASC-US em dois exames citopatológicos consecutivos.');
          alertas.push('Persistência de atipias celulares exige inspeção colposcópica com ácido acético e Teste de Schiller.');
        } else if (idade < 30) { // 25 a 29 anos
          localAtendimento = 'ATENCAO_BASICA';
          prazoRecomendado = 'Repetir citologia em 12 meses na UBS';
          condutas.push('Repetir o exame citopatológico em 12 MESES na Unidade Básica de Saúde.');
          condutas.push('Em mulheres de 25 a 29 anos com ASC-US, a taxa de regressão espontânea é alta, recomendando-se repetição em 1 ano.');
          condutas.push('Se o exame de repetição persistir com ASC-US ou pior (LSIL/HSIL/ASC-H), encaminhar imediatamente para colposcopia.');
        } else { // >= 30 anos
          localAtendimento = 'ATENCAO_BASICA';
          prazoRecomendado = 'Repetir citologia em 6 meses na UBS';
          condutas.push('Repetir o exame citopatológico em 6 MESES na Unidade Básica de Saúde.');
          condutas.push('Em mulheres com 30 anos ou mais com ASC-US, a probabilidade de infecção persistente por HPV é maior, justificando intervalo mais curto de repetição.');
          condutas.push('Se o exame de repetição persistir com ASC-US ou pior, encaminhar imediatamente para Colposcopia.');
        }
        break;

      case 'LSIL':
        // Lesão intraepitelial escamosa de baixo grau (NIC I / efeito citopático do HPV)
        if (lesaoPrevia) {
          localAtendimento = 'COLPOSCOPIA_ESPECIALIZADA';
          prazoRecomendado = 'Colposcopia Imediata (LSIL persistente)';
          condutas.push('Encaminhar para COLPOSCOPIA especializada.');
          condutas.push('Indicação: Persistência de lesão de baixo grau (LSIL) em 2 exames consecutivos.');
        } else {
          localAtendimento = 'ATENCAO_BASICA';
          prazoRecomendado = 'Repetir citologia em 6 meses na UBS';
          condutas.push('Repetir o exame citopatológico em 6 MESES na Unidade Básica de Saúde.');
          condutas.push('Em mulheres com 25 anos ou mais, a conduta inicial para LSIL é repetir a citologia em 6 meses na Atenção Primária.');
          condutas.push('Se o segundo exame for negativo: repetir novo exame em 6 meses. Se negativo novamente, paciente retorna à rotina trienal.');
          condutas.push('Se o segundo exame persistir com LSIL ou apresentar lesão mais grave, encaminhar obrigatoriamente para Colposcopia.');
        }
        break;

      case 'ASC_H':
        // Células escamosas atípicas não sendo possível afastar lesão de alto grau
        localAtendimento = 'COLPOSCOPIA_ESPECIALIZADA';
        prazoRecomendado = 'Colposcopia IMEDIATA';
        condutas.push('Encaminhar IMEDIATAMENTE para COLPOSCOPIA na Atenção Especializada.');
        condutas.push('Conduta formal: ASC-H possui alto valor preditivo para NIC II ou NIC III subjacente, não devendo aguardar repetição citológica.');
        alertas.push('🚨 ASC-H exige avaliação colposcópica minuciosa do canal endocervical e biópsia dirigida de áreas acetobrancas.');
        break;

      case 'HSIL':
        // Lesão intraepitelial escamosa de alto grau (NIC II, NIC III, Carcinoma in situ)
        localAtendimento = 'COLPOSCOPIA_ESPECIALIZADA';
        prazoRecomendado = 'Colposcopia IMEDIATA (Elegível para Ver e Tratar)';
        condutas.push('Encaminhar IMEDIATAMENTE para COLPOSCOPIA especializada com prioridade.');
        condutas.push('Estratégia "Ver e Tratar" (EZT / CAF / LEEP): Mulheres com 25 anos ou mais com laudo de HSIL cuja colposcopia confirme lesão de alto grau e apresente Zona de Transformação (ZT) tipos 1 ou 2 totalmente visíveis são elegíveis para Excisão Tipo 1 ou 2 no mesmo ato ambulatorial.');
        condutas.push('Se suspeita de microinvasão, ZT tipo 3 (não totalmente visível) ou discordância colpo-citológica: Realizar biópsia dirigida prévia ou conização clássica.');
        alertas.push('🚨 Alto risco de malignização se não conduzido oportunamente. Monitorar comparecimento à consulta de patologia cervical.');
        break;

      case 'AGC':
        // Células glandulares atípicas (antigo AGUS)
        localAtendimento = 'COLPOSCOPIA_ESPECIALIZADA';
        prazoRecomendado = 'Colposcopia IMEDIATA + Avaliação Endocervical e Endometrial';
        condutas.push('Encaminhar IMEDIATAMENTE para COLPOSCOPIA com avaliação mandatória do canal endocervical (escovado endocervical ou curetagem endocervical).');
        if (idade >= 35 || dados.sangramentoUterinoAnormal) {
          condutas.push('Investigação Endometrial Mandatória: Devido à idade >= 35 anos ou presença de SUA, solicitar Ultrassonografia Transvaginal e Biópsia Endometrial (Pipelle de Cornier ou Histeroscopia com biópsia) para investigar adenocarcinoma de endométrio.');
        } else {
          condutas.push('Se persistência ou fatores de risco adicionais, adicionar avaliação endometrial.');
        }
        alertas.push('⚠️ AGC associa-se a lesões glandulares de canal e endométrio que não são visualizadas facilmente na ectocérvice.');
        break;

      case 'CARCINOMA_INVASOR':
        localAtendimento = 'COLPOSCOPIA_ESPECIALIZADA';
        prazoRecomendado = 'Urgência Oncológica Imediata';
        condutas.push('Encaminhamento imediato com prioridade oncológica máxima para centro de referência de ginecologia oncológica.');
        condutas.push('Biópsia com estadiamento clínico e imagem pélvica de estadiamento.');
        alertas.push('⛔ URGÊNCIA ONCOLÓGICA: Notificar coordenação de regulação (SISREG / CROSS) sob código de suspeita de neoplasia maligna.');
        break;

      case 'INSATISFATORIO':
        localAtendimento = 'ATENCAO_BASICA';
        prazoRecomendado = 'Repetir em 6 a 12 semanas na UBS';
        condutas.push('Repetir a coleta citológica na Unidade Básica de Saúde no prazo de 6 a 12 semanas.');
        condutas.push('Orientações prévias à nova coleta: Abstinência sexual por 48 horas, não usar duchas vaginais ou cremes ginecológicos nas 48h anteriores, e coletar fora do período menstrual.');
        condutas.push('Garantir representação adequada tanto do componente ectocervical (espátula de Ayre) quanto endocervical (escova de canal).');
        break;

      default:
        localAtendimento = 'ATENCAO_BASICA';
        condutas.push('Avaliar histórico citológico prévio e manter rastreamento de rotina na UBS.');
        break;
    }

    if (gestante) {
      alertas.push('🤰 GESTAÇÃO: O rastreamento citopatológico pode ser realizado com segurança na gestante até o final do 3º trimestre (usar espátula de Ayre normalmente; evitar introdução profunda da escova endocervical no orifício interno). Procedimentos excisionais (LEEP/CAF) são contraindicados durante a gestação exceto suspeita de câncer invasor.');
    }

    return {
      elegivelRastreio: true,
      idade: idade,
      citologia: citologia,
      classificacao: 'CONDUTA_' + citologia,
      localAtendimento: localAtendimento,
      prazoRecomendado: prazoRecomendado,
      periodicidadeFutura: periodicidadeFutura,
      resumoConduta: condutas[0] || 'Seguimento ginecológico.',
      condutas: condutas,
      alertas: alertas,
      diretrizReferencia: 'Diretrizes Brasileiras para o Rastreamento do Câncer do Colo do Útero (INCA/MS 2016)'
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. SANGRAMENTO UTERINO ANORMAL (SUA - FIGO / PALM-COEIN)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avaliação diagnóstica e terapêutica determinística para Sangramento Uterino Anormal.
   * Classificação PALM-COEIN da FIGO e condutas hemostáticas de urgência vs ambulatorial.
   *
   * @param {Object} dados
   * @param {number} dados.idade
   * @param {string} [dados.betaHcg] ('positivo', 'negativo', 'nao_realizado')
   * @param {number} [dados.pas]
   * @param {number} [dados.fc]
   * @param {number} [dados.duracaoDias]
   * @param {string} [dados.intensidade] ('leve', 'moderada', 'grave_aguda')
   * @param {boolean} [dados.posMenopausa]
   * @param {number} [dados.espessuraEndometrioMm]
   * @param {boolean} [dados.contraindicacaoEstrogenio]
   * @param {Array<string>} [dados.etiologiasSuspeitas] (ex: ['polipo', 'mioma', 'adenomiose', 'coagulopatia', 'ovulatoria', 'endometrial', 'iatrogenica'])
   */
  function avaliarSangramentoUterinoAnormal(dados) {
    dados = dados || {};
    var idade = Number(dados.idade);
    if (isNaN(idade) || idade < 0) idade = 32;

    var betaHcg = String(dados.betaHcg || 'nao_realizado').toLowerCase().trim();
    var pas = Number(dados.pas || 120);
    var fc = Number(dados.fc || 78);
    var duracaoDias = Number(dados.duracaoDias || 5);
    var intensidade = String(dados.intensidade || 'moderada').toLowerCase();
    var posMenopausa = Boolean(dados.posMenopausa || idade >= 55);
    var espessuraEndometrio = dados.espessuraEndometrioMm !== undefined ? Number(dados.espessuraEndometrioMm) : null;
    var contraindicacaoEstrogenio = Boolean(dados.contraindicacaoEstrogenio);

    var etiologias = Array.isArray(dados.etiologiasSuspeitas) ? dados.etiologiasSuspeitas : [];
    var etiologiasStr = etiologias.join(' ').toLowerCase();

    var alertas = [];
    var condutasEmergencia = [];
    var condutasAmbulatoriais = [];
    var prescricoesSugeridas = [];
    var mnemocinoPalmCoein = [];

    // 1. Verificação de Choque Hemodinâmico
    var indiceChoque = pas > 0 ? (fc / pas) : 0;
    var choqueInstavel = pas < 90 || fc > 120 || indiceChoque >= 1.0;

    if (choqueInstavel) {
      alertas.push('🚨 INSTABILIDADE HEMODINÂMICA / CHOQUE HIPOVOLÊMICO (Índice de Choque = ' + indiceChoque.toFixed(2) + '): Encaminhar imediatamente para sala de emergência / centro cirúrgico!');
      condutasEmergencia.push('Obter 2 acessos venosos periféricos calibrosos (abocath 14G ou 16G).');
      condutasEmergencia.push('Ressuscitação volêmica imediata com Ringer Lactato ou SF 0,9% 1000 mL aquecido em bolus.');
      condutasEmergencia.push('Tipagem sanguínea, Prova Cruzada e reserva de concentrado de hemácias (acionar protocolo de transfusão maciça se refratário).');
      condutasEmergencia.push('Tamponamento uterino mecânico de urgência: Inserção intrauterina de sonda Foley nº 18 a 24 insuflada com 30 a 50 mL de solução fisiológica.');
      condutasEmergencia.push('Avaliação cirúrgica imediata para curetagem uterina hemostática de urgência ou histerectomia se sangramento incoercível.');
    }

    // 2. Exclusão Mandatória de Gestação em Mulheres em Idade Fértil
    var gravidezDetectada = false;
    if (idade >= 10 && idade <= 55 && !posMenopausa) {
      if (betaHcg === 'positivo') {
        gravidezDetectada = true;
        alertas.push('🤰 TESTE DE GRAVIDEZ POSITIVO: Sangramento na vigência de gestação NÃO é classificado como SUA ginecológico! Investigar ameaça de abortamento, gravidez ectópica ou mola hidatiforme.');
        return {
          gravidez: true,
          classificacao: 'SANGRAMENTO_PRIMEIRO_TRIMESTRE_OBSTETRICO',
          resumo: 'Gravidez confirmada. Redirecionar imediatamente para investigação obstétrica.',
          condutasEmergencia: [
            'Solicitar Ultrassonografia Transvaginal urgente para avaliar localização do saco gestacional e viabilidade fetal.',
            'Afastar Gravidez Ectópica (dor anexial, abdome agudo hemorrágico) e Ameaça de Abortamento.',
            'Se sangramento intenso ou dor pélvica aguda, encaminhar ao Pronto Atendimento Obstétrico.'
          ],
          alertas: alertas
        };
      } else if (betaHcg === 'nao_realizado') {
        alertas.push('⚠️ MANDATÓRIO: Realizar teste imunológico de gravidez (Beta-hCG) em toda mulher em idade fértil com queixa de SUA antes de qualquer conduta hormonal.');
        condutasEmergencia.push('Solicitar Beta-hCG quantitativo ou Teste Rápido de Gravidez na urina imediatamente.');
      }
    }

    // 3. Avaliação de Risco na Pós-Menopausa (Câncer de Endométrio)
    if (posMenopausa) {
      alertas.push('🚨 SANGRAMENTO NA PÓS-MENOPAUSA: Investigação obrigatória para afastar Carcinoma Endometrial (Câncer de Endométrio).');
      condutasAmbulatoriais.push('Solicitar Ultrassonografia Transvaginal com doppler para mensurar espessura da linha endometrial.');
      if (espessuraEndometrio !== null) {
        if (espessuraEndometrio > 4.0) {
          alertas.push('⛔ ENDOMÉTRIO ESPESSADO (> 4 mm na pós-menopausa sem TH): Indicação formal de biópsia endometrial!');
          condutasAmbulatoriais.push('Realizar Biópsia Endometrial ambulatorial (Cureta de Pipelle de Cornier) ou Histeroscopia com biópsia dirigida.');
        } else {
          condutasAmbulatoriais.push('Espessura endometrial <= 4 mm: Baixa probabilidade de câncer; etiologia mais provável é Atrofia Endometrial. Avaliar estrogênio tópico vaginal se atrofia urogenital associada.');
        }
      } else {
        condutasAmbulatoriais.push('Ponto de corte de segurança: Se eco endometrial > 4 mm (sem terapia hormonal) ou > 8 mm (em uso de terapia hormonal), indicar biópsia endometrial mandatória.');
      }
    }

    // 4. Mnemônico PALM-COEIN (FIGO 2011/2018)
    // Causas Estruturais (PALM)
    mnemocinoPalmCoein.push({ sigla: 'P', nome: 'Pólipo', presente: etiologiasStr.indexOf('polip') >= 0, tipo: 'Estrutural (Imagem/Histologia)' });
    mnemocinoPalmCoein.push({ sigla: 'A', nome: 'Adenomiose', presente: etiologiasStr.indexOf('adenom') >= 0, tipo: 'Estrutural (Imagem/Histologia)' });
    mnemocinoPalmCoein.push({ sigla: 'L', nome: 'Leiomioma', presente: etiologiasStr.indexOf('miom') >= 0, tipo: 'Estrutural (L-SM submucoso vs L-O outros)' });
    mnemocinoPalmCoein.push({ sigla: 'M', nome: 'Malignidade/Hiperplasia', presente: posMenopausa || etiologiasStr.indexOf('malign') >= 0 || etiologiasStr.indexOf('hiperplas') >= 0, tipo: 'Estrutural (Biópsia)' });
    // Causas Não Estruturais (COEIN)
    mnemocinoPalmCoein.push({ sigla: 'C', nome: 'Coagulopatia', presente: etiologiasStr.indexOf('coagul') >= 0 || etiologiasStr.indexOf('vwd') >= 0, tipo: 'Não Estrutural (Laboratório)' });
    mnemocinoPalmCoein.push({ sigla: 'O', nome: 'Disfunção Ovulatória', presente: etiologiasStr.indexOf('ovulat') >= 0 || etiologiasStr.indexOf('sop') >= 0, tipo: 'Não Estrutural (Ciclos irregulares)' });
    mnemocinoPalmCoein.push({ sigla: 'E', nome: 'Endometrial', presente: etiologiasStr.indexOf('endometr') >= 0 && etiologiasStr.indexOf('adenom') < 0, tipo: 'Não Estrutural (Inflamação/Hemostasia)' });
    mnemocinoPalmCoein.push({ sigla: 'I', nome: 'Iatrogênica', presente: etiologiasStr.indexOf('iatrog') >= 0 || etiologiasStr.indexOf('diu') >= 0 || etiologiasStr.indexOf('anticoag') >= 0, tipo: 'Não Estrutural (Fármacos/DIU)' });
    mnemocinoPalmCoein.push({ sigla: 'N', nome: 'Não classificada', presente: false, tipo: 'Não Estrutural (Malformação AV, etc.)' });

    // 5. Farmacoterapia Hemostática de Urgência (SUA Agudo Intenso / Hemorragia)
    var ehAgudoIntenso = intensidade === 'grave_aguda' || intensidade === 'intenso' || duracaoDias > 10;
    if (ehAgudoIntenso && !posMenopausa) {
      // 1ª Linha Não Hormonal: Ácido Tranexâmico
      prescricoesSugeridas.push({
        farmaco: 'Ácido Tranexâmico 500 mg',
        posologia: 'Tomar 2 comprimidos (1000 mg) por via oral de 8 em 8 horas durante o sangramento ativo intenso (por até 4 a 5 dias).',
        justificativa: 'Antifibrinolítico potente. Inibe o plasminogênio e estabiliza a fibrina endometrial, reduzindo a perda sanguínea em 40% a 50% sem risco hormonal.',
        linha: '1ª Linha Hemostática Não Hormonal'
      });

      // 2ª Linha Hormonal de Urgência: Conforme elegibilidade
      if (!contraindicacaoEstrogenio) {
        prescricoesSugeridas.push({
          farmaco: 'Anticoncepcional Oral Combinado Monofásico (Etinilestradiol 30mcg + Levonorgestrel 0,15mg)',
          posologia: 'Regime regressivo rápido: 1 comprimido VO a cada 8 horas por 3 a 4 dias (até hemostasia); em seguida, 1 cp a cada 12 horas por 3 dias; em seguida, 1 cp ao dia completando 21 dias.',
          justificativa: 'Promove hemostasia endometrial acelerada induzindo decidualização rápida e proliferação do estroma endometrial.',
          linha: 'Hemostasia Hormonal Combinada de Ataque'
        });
      } else {
        prescricoesSugeridas.push({
          farmaco: 'Acetato de Medroxiprogesterona 10 mg',
          posologia: 'Tomar 1 a 2 comprimidos (10 a 20 mg) por via oral de 8 em 8 horas até cessar o sangramento; após a hemostasia, reduzir para 10 mg ao dia por 14 a 21 dias.',
          justificativa: 'Esquema de progestagênio isolado para pacientes com contraindicação a estrogênios (trombofilia, tabagismo >35a, HAS grave).',
          linha: 'Hemostasia Hormonal com Progestagênio Isolado'
        });
      }
    }

    // 6. Terapia de Manutenção a Longo Prazo / SUA Crônico
    if (!posMenopausa) {
      condutasAmbulatoriais.push('1ª Linha Terapêutica de Manutenção: DIU liberador de Levonorgestrel (Mirena/Kyleena) — reduz o volume menstrual em mais de 85% a 90% em 3 meses.');
      condutasAmbulatoriais.push('Alternativas de 2ª Linha: Progestagênio contínuo (Desogestrel 75mcg/dia ou Medroxiprogesterona injetável trimestral) ou ACO de uso contínuo.');
      condutasAmbulatoriais.push('Anti-inflamatórios Não Esteroidais (AINEs): Ibuprofeno 600mg VO 8/8h ou Ácido Mefenâmico 500mg VO 8/8h durante os dias de menstruação (reduzem as prostaglandinas endometriais e o fluxo em até 30%).');
      condutasAmbulatoriais.push('Suplementação de Ferro: Se hemoglobina < 12 g/dL ou ferritina < 30 ng/mL, prescrever Sulfato Ferroso 200mg (40mg de Fe elementar) VO 1 a 2x ao dia com vitamina C longe das refeições.');
    }

    // Exames complementares de rastreio
    condutasAmbulatoriais.push('Exames Laboratoriais Essenciais: Hemograma completo com plaquetas, Ferritina sérica, TSH (afastar hipotireoidismo), Coagulograma (TP/TTPA), e Ultrassonografia Pélvica/Transvaginal.');

    return {
      idade: idade,
      posMenopausa: posMenopausa,
      intensidade: intensidade,
      choqueInstavel: choqueInstavel,
      indiceChoque: Number(indiceChoque.toFixed(2)),
      mnemonicoPalmCoein: mnemocinoPalmCoein,
      prescricoesSugeridas: prescricoesSugeridas,
      condutasEmergencia: condutasEmergencia,
      condutasAmbulatoriais: condutasAmbulatoriais,
      alertas: alertas,
      diretrizReferencia: 'Classificação FIGO (PALM-COEIN 2018) & Manuais FEBRASGO de Sangramento Uterino Anormal'
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. CRITÉRIOS DE ELEGIBILIDADE DE ANTICONCEPÇÃO DA OMS (CATEGORIAS 1 A 4)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avalia determinística e rigorosamente a segurança de cada método contraceptivo
   * segundo os Critérios Médicos de Elegibilidade da Organização Mundial da Saúde (OMS / CDC / FEBRASGO).
   *
   * @param {Object} dados
   * @param {number} dados.idade
   * @param {boolean} [dados.tabagismo]
   * @param {number} [dados.cigarrosDia]
   * @param {string} [dados.enxaqueca] ('nenhuma', 'sem_aura', 'com_aura')
   * @param {string} [dados.has] ('normotensa', 'controlada', 'grave_descontrolada') ou pas/pad
   * @param {number} [dados.pas]
   * @param {number} [dados.pad]
   * @param {boolean} [dados.historicoTev] (TVP ou TEP prévia ou atual)
   * @param {boolean} [dados.trombofilia] (mutação Fator V Leiden, SAF, etc.)
   * @param {string} [dados.cancerMama] ('nenhum', 'passado_5anos', 'atual')
   * @param {boolean} [dados.lactacao]
   * @param {number} [dados.semanasPosParto]
   * @param {string} [dados.diabetes] ('nao', 'sem_vasculopatia', 'com_vasculopatia_ou_mais_20anos')
   * @param {string} [dados.lupusSaf] ('nao', 'positivo', 'desconhecido')
   */
  function avaliarCriteriosElegibilidadeContracepcao(dados) {
    dados = dados || {};
    var idade = Number(dados.idade);
    if (isNaN(idade) || idade < 0) idade = 28;

    var tabagismo = Boolean(dados.tabagismo);
    var cigarrosDia = Number(dados.cigarrosDia || 0);
    if (cigarrosDia > 0) tabagismo = true;

    var enxaqueca = String(dados.enxaqueca || 'nenhuma').toLowerCase().trim();
    var hasStatus = String(dados.has || 'normotensa').toLowerCase().trim();
    var pas = Number(dados.pas || 120);
    var pad = Number(dados.pad || 80);
    if (pas >= 160 || pad >= 100) hasStatus = 'grave_descontrolada';
    else if (pas >= 140 || pad >= 90) hasStatus = 'controlada';

    var tev = Boolean(dados.historicoTev);
    var trombofilia = Boolean(dados.trombofilia);
    var cancerMama = String(dados.cancerMama || 'nenhum').toLowerCase().trim();
    var lactacao = Boolean(dados.lactacao);
    var semanasPosParto = dados.semanasPosParto !== undefined ? Number(dados.semanasPosParto) : (lactacao ? 4 : 52);
    var diabetes = String(dados.diabetes || 'nao').toLowerCase().trim();
    var lupus = String(dados.lupusSaf || 'nao').toLowerCase().trim();

    // Métodos a avaliar:
    // AHC: Anticoncepcionais Hormonais Combinados (pílula, injetável mensal, adesivo, anel)
    // POP: Progestagênios Orais Isolados (Desogestrel, Levonorgestrel minipílula)
    // AMPD: Injetável Trimestral (Acetato de Medroxiprogesterona de depósito)
    // IMPLANTE: Implante Subdérmico de Etonogestrel
    // DIU_CU: DIU de Cobre
    // DIU_LNG: DIU Liberador de Levonorgestrel (Mirena/Kyleena)

    var metodos = {
      AHC: { nome: 'Hormonais Combinados (Pílula, Adesivo, Anel, Injetável Mensal)', cat: 1, motivos: [] },
      POP: { nome: 'Progestagênio Oral Isolado (Minipílula / Desogestrel)', cat: 1, motivos: [] },
      AMPD: { nome: 'Injetável Trimestral (Acetato de Medroxiprogesterona)', cat: 1, motivos: [] },
      IMPLANTE: { nome: 'Implante Subdérmico de Etonogestrel', cat: 1, motivos: [] },
      DIU_CU: { nome: 'DIU de Cobre (Não hormonal)', cat: 1, motivos: [] },
      DIU_LNG: { nome: 'DIU de Levonorgestrel (Mirena / Kyleena)', cat: 1, motivos: [] }
    };

    function atualizarCat(metodoId, novaCat, motivo) {
      if (novaCat > metodos[metodoId].cat) {
        metodos[metodoId].cat = novaCat;
      }
      metodos[metodoId].motivos.push({ cat: novaCat, motivo: motivo });
    }

    // 1. Enxaqueca
    if (enxaqueca.indexOf('com_aura') >= 0 || enxaqueca.indexOf('aura') >= 0) {
      atualizarCat('AHC', 4, '⛔ ENXAQUECA COM AURA: Categoria 4 (Contraindicação absoluta). Risco altamente elevado de Acidente Vascular Cerebral Isquêmico (AVC).');
      atualizarCat('POP', 2, 'Enxaqueca com aura: Categoria 2 (Vantagens superam riscos teóricos).');
      atualizarCat('AMPD', 2, 'Enxaqueca com aura: Categoria 2.');
      atualizarCat('IMPLANTE', 2, 'Enxaqueca com aura: Categoria 2.');
      atualizarCat('DIU_LNG', 2, 'Enxaqueca com aura: Categoria 2.');
      atualizarCat('DIU_CU', 1, 'DIU de Cobre: Categoria 1 (Uso irrestrito, método não hormonal).');
    } else if (enxaqueca.indexOf('sem_aura') >= 0) {
      if (idade >= 35) {
        atualizarCat('AHC', 3, 'Enxaqueca sem aura em mulher >= 35 anos: Categoria 3 (Riscos superam benefícios).');
      } else {
        atualizarCat('AHC', 2, 'Enxaqueca sem aura em mulher < 35 anos: Categoria 2.');
      }
    }

    // 2. Trombose Venosa Profunda / TEP ou Trombofilia Conhecida
    if (tev || trombofilia) {
      var motivoTev = tev ? 'Histórico pessoal de TVP/TEP' : 'Trombofilia trombogênica conhecida';
      atualizarCat('AHC', 4, '⛔ ' + motivoTev + ': Categoria 4 (Contraindicação absoluta). O componente estrogênico eleva a síntese hepática de fatores de coagulação e risco de recorrência fatal.');
      atualizarCat('AMPD', 2, motivoTev + ': Categoria 2.');
      atualizarCat('POP', 2, motivoTev + ': Categoria 2.');
      atualizarCat('IMPLANTE', 2, motivoTev + ': Categoria 2.');
      atualizarCat('DIU_LNG', 2, motivoTev + ': Categoria 2.');
      atualizarCat('DIU_CU', 1, motivoTev + ': Categoria 1 (Uso irrestrito, método não hormonal).');
    }

    // 3. Hipertensão Arterial Sistêmica
    if (hasStatus === 'grave_descontrolada' || pas >= 160 || pad >= 100) {
      atualizarCat('AHC', 4, '⛔ HAS GRAVE / DESCONTROLADA (PA >= 160x100 mmHg): Categoria 4. Elevado risco sinérgico de AVC, IAM e dissecção.');
      atualizarCat('AMPD', 3, 'HAS Grave: Categoria 3 (Risco supera benefícios teóricos para injetável trimestral).');
      atualizarCat('POP', 2, 'HAS Grave: Categoria 2 (Progestagênio oral tem mínimo impacto pressórico).');
      atualizarCat('IMPLANTE', 2, 'HAS Grave: Categoria 2.');
      atualizarCat('DIU_LNG', 2, 'HAS Grave: Categoria 2.');
      atualizarCat('DIU_CU', 1, 'HAS Grave: Categoria 1 (Uso irrestrito).');
    } else if (hasStatus === 'controlada' || pas >= 140 || pad >= 90) {
      atualizarCat('AHC', 3, 'HAS Controlada (140-159 / 90-99 mmHg): Categoria 3 (Riscos geralmente superam benefícios para contraceptivos com estrogênio).');
      atualizarCat('AMPD', 2, 'HAS Controlada: Categoria 2.');
      atualizarCat('POP', 1, 'HAS Controlada: Categoria 1.');
      atualizarCat('IMPLANTE', 1, 'HAS Controlada: Categoria 1.');
      atualizarCat('DIU_LNG', 1, 'HAS Controlada: Categoria 1.');
      atualizarCat('DIU_CU', 1, 'HAS Controlada: Categoria 1.');
    }

    // 4. Tabagismo e Idade >= 35 anos
    if (tabagismo && idade >= 35) {
      if (cigarrosDia >= 15) {
        atualizarCat('AHC', 4, '⛔ TABAGISMO >= 15 CIGARROS/DIA COM IDADE >= 35 ANOS: Categoria 4 (Contraindicação absoluta). Risco maciço de Infarto Agudo do Miocárdio e trombose arterial.');
      } else {
        atualizarCat('AHC', 3, 'Tabagismo < 15 cigarros/dia com idade >= 35 anos: Categoria 3 (Riscos superam benefícios).');
      }
      atualizarCat('POP', 1, 'Tabagismo >= 35a: Categoria 1 (Livre de estrogênio, totalmente seguro).');
      atualizarCat('AMPD', 1, 'Tabagismo >= 35a: Categoria 1.');
      atualizarCat('IMPLANTE', 1, 'Tabagismo >= 35a: Categoria 1.');
      atualizarCat('DIU_CU', 1, 'Tabagismo >= 35a: Categoria 1.');
      atualizarCat('DIU_LNG', 1, 'Tabagismo >= 35a: Categoria 1.');
    } else if (tabagismo && idade < 35) {
      atualizarCat('AHC', 2, 'Tabagismo em mulher < 35 anos: Categoria 2.');
    }

    // 5. Pós-Parto e Aleitamento Materno (Lactação)
    if (lactacao) {
      if (semanasPosParto < 6) {
        atualizarCat('AHC', 4, '⛔ PÓS-PARTO < 6 SEMANAS EM AMAMENTAÇÃO: Categoria 4. O estrogênio passa para o leite materno, diminui o volume da lactação e eleva o risco de TEV puerperal.');
        atualizarCat('POP', 2, 'Pós-parto < 6 semanas com amamentação: Categoria 2 (Pode iniciar se alto risco de nova gestação, sem prejuízo à lactação).');
        atualizarCat('IMPLANTE', 2, 'Pós-parto < 6 semanas: Categoria 2.');
        atualizarCat('AMPD', 2, 'Pós-parto < 6 semanas: Categoria 2.');
        atualizarCat('DIU_LNG', 2, 'Pós-parto < 6 semanas: Categoria 2 (Inserção recomendada pós-parto imediato em até 48h ou após 4 semanas).');
        atualizarCat('DIU_CU', 1, 'DIU de Cobre no pós-parto: Categoria 1 (Não hormonal, seguro; inserir em até 48h ou após 4 semanas pós-parto).');
      } else if (semanasPosParto < 24) { // 6 semanas a 6 meses
        atualizarCat('AHC', 3, 'Pós-parto 6 semanas a 6 meses amamentando: Categoria 3.');
        atualizarCat('POP', 1, 'Pós-parto >= 6 semanas: Categoria 1.');
        atualizarCat('IMPLANTE', 1, 'Pós-parto >= 6 semanas: Categoria 1.');
        atualizarCat('AMPD', 1, 'Pós-parto >= 6 semanas: Categoria 1.');
        atualizarCat('DIU_LNG', 1, 'Pós-parto >= 6 semanas: Categoria 1.');
        atualizarCat('DIU_CU', 1, 'Pós-parto >= 6 semanas: Categoria 1.');
      }
    }

    // 6. Câncer de Mama Atual ou Prévio
    if (cancerMama === 'atual') {
      var motivoMama = '⛔ CÂNCER DE MAMA ATUAL: Categoria 4 para TODOS os métodos hormonais (tumores frequentemente dependentes de receptor de estrogênio/progesterona).';
      atualizarCat('AHC', 4, motivoMama);
      atualizarCat('POP', 4, motivoMama);
      atualizarCat('AMPD', 4, motivoMama);
      atualizarCat('IMPLANTE', 4, motivoMama);
      atualizarCat('DIU_LNG', 4, motivoMama);
      atualizarCat('DIU_CU', 1, 'DIU de Cobre: Categoria 1 (MÉTODO DE ESCOLHA ABSOLUTO! Sem hormônios, seguro no câncer de mama).');
    } else if (cancerMama === 'passado_5anos') {
      atualizarCat('AHC', 3, 'Histórico de câncer de mama > 5 anos sem evidência de doença: Categoria 3.');
      atualizarCat('POP', 3, 'Histórico de câncer de mama > 5 anos: Categoria 3.');
      atualizarCat('AMPD', 3, 'Histórico de câncer de mama > 5 anos: Categoria 3.');
      atualizarCat('IMPLANTE', 3, 'Histórico de câncer de mama > 5 anos: Categoria 3.');
      atualizarCat('DIU_LNG', 3, 'Histórico de câncer de mama > 5 anos: Categoria 3.');
      atualizarCat('DIU_CU', 1, 'DIU de Cobre: Categoria 1.');
    }

    // 7. Diabetes Mellitus com Vasculopatia ou > 20 anos de doença
    if (diabetes.indexOf('vasculopatia') >= 0 || diabetes.indexOf('20') >= 0) {
      atualizarCat('AHC', 4, '⛔ DIABETES COM VASCULOPATIA / NEFROPATIA / RETINOPATIA OU > 20 ANOS: Categoria 4 (Risco de eventos cardiovasculares isquêmicos).');
      atualizarCat('AMPD', 3, 'Diabetes com vasculopatia: Categoria 3.');
      atualizarCat('POP', 2, 'Diabetes com vasculopatia: Categoria 2.');
      atualizarCat('IMPLANTE', 2, 'Diabetes com vasculopatia: Categoria 2.');
      atualizarCat('DIU_LNG', 2, 'Diabetes com vasculopatia: Categoria 2.');
      atualizarCat('DIU_CU', 1, 'DIU de Cobre: Categoria 1.');
    }

    // 8. Lúpus Eritematoso Sistêmico (LES) com Anticorpos Antifosfolípide Positivos
    if (lupus === 'positivo') {
      atualizarCat('AHC', 4, '⛔ LES COM ANTICORPOS ANTIFOSFOLÍPIDE POSITIVOS: Categoria 4 (Risco altíssimo de trombose arterial e venosa).');
      atualizarCat('POP', 3, 'LES com anticorpos antifosfolípide: Categoria 3.');
      atualizarCat('AMPD', 3, 'LES com anticorpos antifosfolípide: Categoria 3.');
      atualizarCat('IMPLANTE', 3, 'LES com anticorpos antifosfolípide: Categoria 3.');
      atualizarCat('DIU_LNG', 3, 'LES com anticorpos antifosfolípide: Categoria 3.');
      atualizarCat('DIU_CU', 1, 'DIU de Cobre: Categoria 1 (Salvo se trombocitopenia grave associada).');
    }

    // Estruturação do Resultado e Classificação
    var metodosElegiveisCat1 = [];
    var metodosAceitaveisCat2 = [];
    var metodosEvitarCat3 = [];
    var metodosBloqueadosCat4 = [];

    var chaves = Object.keys(metodos);
    for (var i = 0; i < chaves.length; i++) {
      var id = chaves[i];
      var m = metodos[id];
      var item = {
        id: id,
        nome: m.nome,
        categoria: m.cat,
        justificativas: m.motivos.length > 0 ? m.motivos : [{ cat: m.cat, motivo: 'Sem restrições para esta condição clínica.' }]
      };

      if (m.cat === 1) metodosElegiveisCat1.push(item);
      else if (m.cat === 2) metodosAceitaveisCat2.push(item);
      else if (m.cat === 3) metodosEvitarCat3.push(item);
      else if (m.cat === 4) metodosBloqueadosCat4.push(item);
    }

    var resumoIndicacao = '';
    if (metodosElegiveisCat1.length > 0) {
      resumoIndicacao = 'Métodos de 1ª Escolha (Categoria 1 OMS): ' + metodosElegiveisCat1.map(function(x) { return x.nome; }).join('; ');
    } else if (metodosAceitaveisCat2.length > 0) {
      resumoIndicacao = 'Métodos Recomendados com Benefício Superior (Categoria 2 OMS): ' + metodosAceitaveisCat2.map(function(x) { return x.nome; }).join('; ');
    } else {
      resumoIndicacao = 'Avaliar indicação cirúrgica (Laqueadura) ou métodos de barreira estritos.';
    }

    return {
      idade: idade,
      resumoIndicacao: resumoIndicacao,
      metodosElegiveisCat1: metodosElegiveisCat1,
      metodosAceitaveisCat2: metodosAceitaveisCat2,
      metodosEvitarCat3: metodosEvitarCat3,
      metodosBloqueadosCat4: metodosBloqueadosCat4,
      detalhesPorMetodo: metodos,
      diretrizReferencia: 'Critérios Médicos de Elegibilidade para Uso de Métodos Anticoncepcionais (OMS 5ª ed. / FEBRASGO)'
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. SÍNDROMES INFECCIOSAS VULVOVAGINAIS (LEUCORREIAS / CORRIMENTOS)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avaliação determinística clínica, laboratorial (Amsel) e farmacológica
   * para Candidíase, Vaginose Bacteriana e Tricomoníase.
   *
   * @param {Object} dados
   * @param {string} [dados.sintomaPredominante] ('prurido', 'odor_fetido', 'ardencia', 'nenhum')
   * @param {string} [dados.aspectoCorrimento] ('grumoso_branco', 'branco_acinzentado_fino', 'amarelo_esverdeado_bolhoso')
   * @param {number} [dados.phVaginal] (ex: 4.0, 4.2, 5.0, 5.5, 6.0)
   * @param {string} [dados.whiffTest] ('positivo', 'negativo', 'nao_realizado')
   * @param {string} [dados.microscopia] ('clue_cells', 'hifas_esporos', 'protozoarios_moveis', 'normal')
   * @param {boolean} [dados.gestante]
   * @param {number} [dados.trimestreGestacao]
   * @param {boolean} [dados.recorrente] (>= 4 episódios no ano para candidíase)
   * @param {boolean} [dados.alergiaMetronidazol]
   */
  function avaliarInfeccaoVulvovaginal(dados) {
    dados = dados || {};
    var sintoma = String(dados.sintomaPredominante || '').toLowerCase();
    var aspecto = String(dados.aspectoCorrimento || '').toLowerCase();
    var ph = dados.phVaginal !== undefined && dados.phVaginal !== null ? Number(dados.phVaginal) : null;
    var whiff = String(dados.whiffTest || 'nao_realizado').toLowerCase();
    var microscopia = String(dados.microscopia || 'nao_realizado').toLowerCase();
    var gestante = Boolean(dados.gestante);
    var trimestre = Number(dados.trimestreGestacao || (gestante ? 2 : 0));
    var recorrente = Boolean(dados.recorrente);
    var alergiaMetronidazol = Boolean(dados.alergiaMetronidazol);

    // Pontuação diagnóstica determinística para cada síndrome
    var scoreCandidiase = 0;
    var scoreVaginose = 0;
    var scoreTricomoniase = 0;

    // Prurido vulvar intenso aponta para candidíase
    if (sintoma.indexOf('prur') >= 0) scoreCandidiase += 3;
    if (sintoma.indexOf('odor') >= 0 || sintoma.indexOf('fétid') >= 0 || sintoma.indexOf('fetid') >= 0 || sintoma.indexOf('peixe') >= 0) {
      scoreVaginose += 3;
      scoreTricomoniase += 2;
    }

    // Aspecto do corrimento
    if (aspecto.indexOf('grum') >= 0 || aspecto.indexOf('leite coalhado') >= 0 || aspecto.indexOf('branco_aderido') >= 0) {
      scoreCandidiase += 4;
    }
    if (aspecto.indexOf('acinzentad') >= 0 || aspecto.indexOf('fino') >= 0 || aspecto.indexOf('homogeneo') >= 0) {
      scoreVaginose += 4;
    }
    if (aspecto.indexOf('esverde') >= 0 || aspecto.indexOf('amarel') >= 0 || aspecto.indexOf('bolh') >= 0) {
      scoreTricomoniase += 4;
    }

    // pH Vaginal: normal em candidíase (<= 4.5), elevado em vaginose e tricomoníase (> 4.5)
    if (ph !== null) {
      if (ph <= 4.5) {
        scoreCandidiase += 3;
        scoreVaginose -= 2;
        scoreTricomoniase -= 2;
      } else if (ph > 4.5 && ph <= 5.5) {
        scoreVaginose += 3;
        scoreTricomoniase += 1;
      } else if (ph > 5.5) {
        scoreTricomoniase += 3;
        scoreVaginose += 2;
      }
    }

    // Whiff Test (Teste das Aminas com KOH 10%)
    if (whiff === 'positivo') {
      scoreVaginose += 4;
      scoreTricomoniase += 2;
      scoreCandidiase -= 3;
    } else if (whiff === 'negativo') {
      scoreCandidiase += 2;
      scoreVaginose -= 2;
    }

    // Microscopia a fresco (padrão ouro confirmatório beira-leito)
    if (microscopia.indexOf('hifa') >= 0 || microscopia.indexOf('esporo') >= 0 || microscopia.indexOf('levedur') >= 0) {
      scoreCandidiase += 10;
    }
    if (microscopia.indexOf('clue') >= 0 || microscopia.indexOf('guia') >= 0 || microscopia.indexOf('indicador') >= 0) {
      scoreVaginose += 10;
    }
    if (microscopia.indexOf('protozo') >= 0 || microscopia.indexOf('tricomon') >= 0 || microscopia.indexOf('flagel') >= 0) {
      scoreTricomoniase += 10;
    }

    // Diagnóstico Principal
    var diagnostico = 'INDEFINIDO';
    var diagnosticoDescricao = '';
    var prescricoes = [];
    var condutas = [];
    var alertas = [];

    if (scoreCandidiase >= scoreVaginose && scoreCandidiase >= scoreTricomoniase && scoreCandidiase >= 3) {
      diagnostico = 'CANDIDIASE_VULVOVAGINAL';
      diagnosticoDescricao = 'Candidíase Vulvovaginal (Candida albicans / espécies não-albicans)';

      condutas.push('Quadro caracterizado por prurido vulvar intenso, hiperemia de vulva, pH ácido (<= 4.5) e corrimento em grumos brancos ("leite coalhado").');

      // CONDUTA FARMACOLÓGICA CANDIDÍASE
      if (gestante) {
        alertas.push('⛔ CONTRAINDICAÇÃO ABSOLUTA: Fluconazol oral é CONTRAINDICADO durante a gestação (risco aumentado de anomalias craniofaciais, cardíacas e abortamento).');
        prescricoes.push({
          farmaco: 'Miconazol nitrato creme vaginal 2% (20 mg/g)',
          posologia: 'Aplicar 1 aplicador cheio (aprox. 5g) via intravaginal profunda, à noite ao deitar, durante 7 noites consecutivas.',
          justificativa: 'Tratamento tópico de escolha absoluto na gestante (categoria B na gestação; mínima absorção sistêmica).',
          tipo: 'Tópico Gestacional Obrigatório'
        });
        prescricoes.push({
          farmaco: 'Alternativa Tópica: Nistatina creme vaginal 100.000 UI/g',
          posologia: 'Aplicar 1 aplicador cheio via intravaginal à noite ao deitar por 14 noites consecutivas.',
          justificativa: 'Opção padrão do SUS/REMUME.',
          tipo: 'Alternativa Tópica'
        });
      } else if (recorrente) {
        condutas.push('Protocolo de Candidíase Recorrente (>= 4 episódios no ano):');
        prescricoes.push({
          farmaco: 'Fluconazol 150 mg (Fase de Indução)',
          posologia: 'Tomar 1 cápsula por via oral a cada 72 horas por 3 doses (D1, D4 e D7).',
          justificativa: 'Erradicação fúngica profunda na fase de indução de remissão.',
          tipo: 'Fase de Indução'
        });
        prescricoes.push({
          farmaco: 'Fluconazol 150 mg (Fase de Manutenção)',
          posologia: 'Tomar 1 cápsula por via oral uma vez por semana durante 6 meses.',
          justificativa: 'Manutenção supressiva para prevenir recidivas sintomáticas.',
          tipo: 'Fase de Manutenção (6 meses)'
        });
        condutas.push('Investigar comorbidades: Solicitar Hemoglobina Glicada (afastar Diabetes Mellitus descompensado) e sorologia para HIV.');
      } else {
        // Não gestante / Não recorrente
        prescricoes.push({
          farmaco: 'Fluconazol 150 mg VO',
          posologia: 'Tomar 1 cápsula por via oral em dose única.',
          justificativa: 'Tratamento oral cômodo de 1ª linha com alta taxa de cura clínica (>90%).',
          tipo: 'Oral 1ª Linha'
        });
        prescricoes.push({
          farmaco: 'Opção Tópica: Miconazol nitrato creme vaginal 2%',
          posologia: 'Aplicar 1 aplicador cheio à noite ao deitar por 7 noites consecutivas.',
          justificativa: 'Para pacientes que preferem via tópica ou com intolerância gástrica ao fluconazol.',
          tipo: 'Tópico 1ª Linha'
        });
      }

      condutas.push('Orientações de Higiene: Evitar sabonetes perfumados, preferir calcinhas de algodão, evitar roupas sintéticas e justas e secar bem a região vulvar após o banho.');
      condutas.push('Parceiro sexual: NÃO tratar parceiro assintomático de rotina (Candidíase não é considerada uma IST). Tratar apenas se parceiro apresentar balanite/balanopostite com prurido ou eritema.');

    } else if (scoreVaginose >= scoreTricomoniase && scoreVaginose >= 3) {
      diagnostico = 'VAGINOSE_BACTERIANA';
      diagnosticoDescricao = 'Vaginose Bacteriana (Gardnerella vaginalis, Atopobium vaginae, anaeróbios)';

      condutas.push('Critérios de Amsel (>= 3 de 4): Corrimento fino homogêneo acinzentado, pH vaginal > 4.5, Whiff test positivo (odor de aminas com KOH 10%) e presença de Clue Cells na microscopia.');

      // Alerta Dissulfiram
      alertas.push('⚠️ ALERTA FARMACOLÓGICO: Abstinência total de bebidas alcoólicas durante o uso de Metronidazol e até 24 a 48 horas após a última dose devido ao risco de Efeito Dissulfiram / Antabuse (náuseas intensas, vômitos, palpitações e rubor).');

      if (!alergiaMetronidazol) {
        prescricoes.push({
          farmaco: 'Metronidazol 250 mg VO',
          posologia: 'Tomar 2 comprimidos (500 mg) por via oral de 12 em 12 horas por 7 dias (ingerir junto às refeições).',
          justificativa: 'Tratamento de 1ª linha recomendado pelo Ministério da Saúde e CDC. Cura em 85-90% dos casos.',
          tipo: 'Oral 1ª Linha REMUME'
        });
        prescricoes.push({
          farmaco: 'Alternativa Tópica: Metronidazol gel vaginal 0,75%',
          posologia: 'Aplicar 1 aplicador cheio (5g) intravaginal ao deitar por 5 a 7 dias.',
          justificativa: 'Excelente alternativa para pacientes com intolerância gastrointestinal ao metronidazol oral.',
          tipo: 'Tópico 1ª Linha'
        });
        prescricoes.push({
          farmaco: 'Alternativa Oral Dose Única: Secnidazol 2 g VO',
          posologia: 'Tomar 2 comprimidos de 1000 mg (2 g) em dose única com refeição.',
          justificativa: 'Opção para casos com dificuldade previsível de adesão ao tratamento de 7 dias.',
          tipo: 'Dose Única'
        });
      } else {
        prescricoes.push({
          farmaco: 'Clindamicina creme vaginal 2%',
          posologia: 'Aplicar 1 aplicador cheio (5g) intravaginal ao deitar por 7 noites consecutivas.',
          justificativa: 'Opção de escolha para pacientes com alergia comprovada ao Metronidazol.',
          tipo: 'Alternativa Alergia a Nitroimidazólicos'
        });
      }

      if (gestante) {
        condutas.push('Gestantes sintomáticas devem ser tratadas: Metronidazol 250 mg 2 cp VO 12/12h por 7 dias é seguro no 2º e 3º trimestres conforme Diretrizes do Ministério da Saúde. O tratamento reduz o risco de corioamnionite e parto prematuro.');
      }

      condutas.push('Parceiro sexual: NÃO tratar parceiro assintomático de rotina (evidências científicas demonstram que tratar o parceiro não reduz a taxa de recorrência da vaginose bacteriana).');

    } else if (scoreTricomoniase >= 3) {
      diagnostico = 'TRICOMONIASE';
      diagnosticoDescricao = 'Tricomoníase (Trichomonas vaginalis - Infecção Sexualmente Transmissível)';

      condutas.push('Quadro clínico clássico: Corrimento abundante, bolhoso, amarelo-esverdeado ou acinzentado, fétido, prurido vulvar, disúria e aspecto colposcópico de "colo em framboesa" (colpite focal).');

      alertas.push('🚨 INFECÇÃO SEXUALMENTE TRANSMISSÍVEL (IST): O tratamento simultâneo do(s) parceiro(s) sexual(is) é MANDATÓRIO, mesmo que assintomático(s).');
      alertas.push('⚠️ ALERTA FARMACOLÓGICO: Abstinência alcoólica estrita durante o tratamento com Metronidazol e até 48 horas após pelo risco de efeito dissulfiram.');

      prescricoes.push({
        farmaco: 'Metronidazol 2 g VO (4 comprimidos de 500 mg ou 8 comprimidos de 250 mg)',
        posologia: 'Tomar 2 g por via oral em dose única junto a uma refeição.',
        justificativa: 'Esquema de 1ª linha em dose única (REMUME/MS) com alto índice de cura e excelente adesão.',
        tipo: '1ª Linha Dose Única'
      });
      prescricoes.push({
        farmaco: 'Esquema Alternativo: Metronidazol 500 mg VO',
        posologia: 'Tomar 1 comprimido de 500 mg de 12 em 12 horas por 7 dias.',
        justificativa: 'Indicado se intolerância gástrica à dose única ou falha terapêutica prévia.',
        tipo: 'Alternativa de 7 Dias'
      });

      condutas.push('TRATAR O PARCEIRO: Prescrever Metronidazol 2 g VO em dose única para o parceiro sexual.');
      condutas.push('Abstinência sexual: Manter abstenção de relações sexuais até que ambos os parceiros tenham concluído o tratamento e estejam assintomáticos.');
      condutas.push('Rastreamento de ISTs: Solicitar testes rápidos ou sorologias para Sífilis (VDRL), HIV, Hepatite B (HBsAg) e Hepatite C (Anti-HCV).');

    } else {
      // Abordagem Sindrômica / Indeterminada
      diagnostico = 'SINDROMICO_INDETERMINADO';
      diagnosticoDescricao = 'Manejo Sindrômico do Corrimento Vaginal (Atenção Básica sem microscopia)';
      condutas.push('Na ausência de critérios laboratoriais específicos de certeza, priorizar a avaliação clínica e pH vaginal:');
      condutas.push('1. Se predomínio de prurido intenso com placas brancas e sem odor: Tratar para Candidíase com Miconazol creme vaginal 2% por 7 noites ou Fluconazol 150mg VO dose única.');
      condutas.push('2. Se predomínio de odor fétido e corrimento fluido: Tratar para Vaginose Bacteriana com Metronidazol 500mg 12/12h por 7 dias.');
      condutas.push('3. Se corrimento amarelo-esverdeado bolhoso com colpite: Tratar para Tricomoníase (Metronidazol 2g VO dose única e tratar parceiro).');
    }

    return {
      diagnostico: diagnostico,
      diagnosticoDescricao: diagnosticoDescricao,
      escores: { candidiase: scoreCandidiase, vaginose: scoreVaginose, tricomoniase: scoreTricomoniase },
      gestante: gestante,
      prescricoes: prescricoes,
      condutas: condutas,
      alertas: alertas,
      diretrizReferencia: 'Protocolo Clínico e Diretrizes Terapêuticas (PCDT) para ISTs (Ministério da Saúde) & FEBRASGO'
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. RELATÓRIO CLÍNICO ESTRUTURADO UNIFICADO DE GINECOLOGIA AMBULATORIAL
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Consolida um resumo clínico completo estruturado em texto limpo
   * para exportação rápida no Prontuário Eletrônico (PEP) ou Telegram.
   *
   * @param {Object} cenario
   */
  function gerarResumoGinecologia(cenario) {
    cenario = cenario || {};
    var linhas = [];
    linhas.push('════════════════════════════════════════════════════════════════');
    linhas.push('🌸 AVALIAÇÃO DE GINECOLOGIA AMBULATORIAL — CONSULTÓRIO & APS');
    linhas.push('════════════════════════════════════════════════════════════════');
    linhas.push('TRIAGEM UBS: confirmar possibilidade de gestação, estabilidade hemodinâmica, febre/dor pélvica, sangramento e risco de IST antes da conduta.');
    linhas.push('EXAME: registrar consentimento; especular e toque apenas quando indicados, com achados observados, sem presumir exame normal.');

    // 1. Rastreamento de Colo Uterino
    if (cenario.coloUterino) {
      var cu = avaliarRastreioColoUterino(cenario.coloUterino);
      linhas.push('');
      linhas.push('🔬 [1. RASTREIO DE CÂNCER DO COLO UTERINO (INCA/MS)]');
      linhas.push('• Idade: ' + cu.idade + ' anos | Laudo: ' + cu.citologia);
      linhas.push('• Classificação: ' + cu.classificacao + ' (' + cu.localAtendimento + ')');
      if (cu.prazoRecomendado) linhas.push('• Prazo Recomendado: ' + cu.prazoRecomendado);
      linhas.push('• Condutas:');
      for (var i = 0; i < cu.condutas.length; i++) {
        linhas.push('  - ' + cu.condutas[i]);
      }
      if (cu.alertas && cu.alertas.length > 0) {
        for (var a = 0; a < cu.alertas.length; a++) {
          linhas.push('  ' + cu.alertas[a]);
        }
      }
    }

    // 2. Sangramento Uterino Anormal (SUA)
    if (cenario.sua) {
      var sua = avaliarSangramentoUterinoAnormal(cenario.sua);
      linhas.push('');
      linhas.push('🩸 [2. SANGRAMENTO UTERINO ANORMAL (FIGO / PALM-COEIN)]');
      linhas.push('• Idade: ' + sua.idade + ' anos | Intensidade: ' + sua.intensidade.toUpperCase());
      if (sua.choqueInstavel) {
        linhas.push('• 🚨 ESTADO: INSTABILIDADE HEMODINÂMICA (Índice de Choque: ' + sua.indiceChoque + ')');
      } else {
        linhas.push('• Estabilidade: Hemodinamicamente estável (Índice de Choque: ' + sua.indiceChoque + ')');
      }
      if (sua.alertas && sua.alertas.length > 0) {
        for (var s = 0; s < sua.alertas.length; s++) {
          linhas.push('  ' + sua.alertas[s]);
        }
      }
      if (sua.prescricoesSugeridas && sua.prescricoesSugeridas.length > 0) {
        linhas.push('• Conduta Farmacológica Hemostática Imediata:');
        for (var p = 0; p < sua.prescricoesSugeridas.length; p++) {
          var rx = sua.prescricoesSugeridas[p];
          linhas.push('  💊 ' + rx.farmaco + ' — ' + rx.linha);
          linhas.push('     Posologia: ' + rx.posologia);
        }
      }
      if (sua.condutasAmbulatoriais && sua.condutasAmbulatoriais.length > 0) {
        linhas.push('• Planejamento Ambulatorial & Investigação:');
        for (var ca = 0; ca < sua.condutasAmbulatoriais.length; ca++) {
          linhas.push('  - ' + sua.condutasAmbulatoriais[ca]);
        }
      }
    }

    // 3. Anticoncepção OMS
    if (cenario.anticoncepcao) {
      var ac = avaliarCriteriosElegibilidadeContracepcao(cenario.anticoncepcao);
      linhas.push('');
      linhas.push('🛡️ [3. CRITÉRIOS DE ELEGIBILIDADE DE ANTICONCEPÇÃO (OMS)]');
      linhas.push('• ' + ac.resumoIndicacao);
      if (ac.metodosBloqueadosCat4 && ac.metodosBloqueadosCat4.length > 0) {
        linhas.push('• ⛔ Métodos CONTRAINDICADOS (Categoria 4 OMS - Risco Inaceitável):');
        for (var b = 0; b < ac.metodosBloqueadosCat4.length; b++) {
          var bloq = ac.metodosBloqueadosCat4[b];
          linhas.push('  - ' + bloq.nome);
          for (var j = 0; j < bloq.justificativas.length; j++) {
            linhas.push('    ' + bloq.justificativas[j].motivo);
          }
        }
      }
      if (ac.metodosEvitarCat3 && ac.metodosEvitarCat3.length > 0) {
        linhas.push('• ⚠️ Métodos Não Recomendados (Categoria 3 OMS - Riscos superam benefícios):');
        for (var e = 0; e < ac.metodosEvitarCat3.length; e++) {
          linhas.push('  - ' + ac.metodosEvitarCat3[e].nome);
        }
      }
    }

    // 4. Infecções Vulvovaginais (Leucorreias)
    if (cenario.infeccao) {
      var inf = avaliarInfeccaoVulvovaginal(cenario.infeccao);
      linhas.push('');
      linhas.push('🦠 [4. SÍNDROMES INFECCIOSAS VULVOVAGINAIS (LEUCORREIAS)]');
      linhas.push('• Diagnóstico: ' + inf.diagnosticoDescricao);
      if (inf.alertas && inf.alertas.length > 0) {
        for (var ia = 0; ia < inf.alertas.length; ia++) {
          linhas.push('  ' + inf.alertas[ia]);
        }
      }
      if (inf.prescricoes && inf.prescricoes.length > 0) {
        linhas.push('• Prescrição Farmacológica de Escolha (REMUME/MS):');
        for (var ip = 0; ip < inf.prescricoes.length; ip++) {
          var irx = inf.prescricoes[ip];
          linhas.push('  💊 ' + irx.farmaco + ' (' + irx.tipo + ')');
          linhas.push('     Posologia: ' + irx.posologia);
        }
      }
      if (inf.condutas && inf.condutas.length > 0) {
        linhas.push('• Orientações & Seguimento Clínico:');
        for (var ic = 0; ic < inf.condutas.length; ic++) {
          linhas.push('  - ' + inf.condutas[ic]);
        }
      }
    }

    linhas.push('');
    linhas.push('════════════════════════════════════════════════════════════════');
    linhas.push('Diretrizes de Referência: INCA/MS, OMS, FIGO, FEBRASGO & PCDT/MS');
    linhas.push('════════════════════════════════════════════════════════════════');

    return linhas.join('\n');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. ATENDIMENTO INTEGRAL À VÍTIMA DE VIOLÊNCIA SEXUAL (PCDT MS / FEBRASGO)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Gera a prescrição completa e imediata de profilaxias (Contracepção de Emergência,
   * ISTs Virais/HIV/HepB e ISTs Não Virais) e o checklist médico-legal para atendimento
   * de urgência à vítima de violência sexual.
   */
  function protocoloViolenciaSexual(dados) {
    dados = dados || {};
    var horasAposExposicao = Number(dados.horasAposExposicao || 12);
    var pesoKg = Number(dados.pesoKg || 60);
    var gestante = Boolean(dados.gestante);
    var vacinadaHepatiteB = Boolean(dados.vacinadaHepatiteBCompleta);

    var dentroJanela72h = horasAposExposicao <= 72;
    var dentroJanela120h = horasAposExposicao <= 120;

    var prescricoes = [];

    // 1. Contracepção de Emergência (Até 5 dias / 120h, ideal < 72h)
    if (!gestante && dentroJanela120h) {
      prescricoes.push({
        finalidade: '1. Anticoncepção de Emergência (Prevenção de Gravidez Decorrente de Estupro)',
        farmaco: 'Levonorgestrel 1,5 mg VO (1 comprimido de 1,5 mg ou 2 comprimidos de 0,75 mg)',
        posologia: 'Tomar 1,5 mg por via oral em DOSE ÚNICA imediatamente (eficácia máxima em até 72h; indicado até 5 dias / 120h da violência).'
      });
    }

    // 2. Profilaxia de ISTs Não Virais (Sífilis, Gonorreia, Clamídia e Tricomoníase)
    prescricoes.push({
      finalidade: '2. Profilaxia de Sífilis',
      farmaco: 'Penicilina G Benzatina 2.400.000 UI IM',
      posologia: 'Aplicar 1.200.000 UI IM profunda em cada glúteo em DOSE ÚNICA.'
    });

    prescricoes.push({
      finalidade: '3. Profilaxia de Gonorreia e Clamídia / Cancro Mole',
      farmaco: 'Ceftriaxona 500 mg IM + Azitromicina 1 g VO',
      posologia: 'Aplicar Ceftriaxona 500 mg IM em dose única + Tomar Azitromicina 1 g (2 comprimidos de 500 mg) VO em dose única.'
    });

    prescricoes.push({
      finalidade: '4. Profilaxia de Tricomoníase',
      farmaco: 'Metronidazol 2 g VO (4 comprimidos de 500 mg)',
      posologia: 'Tomar 2 g VO em dose única. DICA PRÁTICA DE PLANTÃO: Pode ser postergado para o 3º ou 5º dia para evitar náuseas/vômitos sinérgicos com o Levonorgestrel e os antirretrovirais no D1!'
    });

    // 3. PEP para HIV (Estritamente se <= 72 horas da exposição)
    if (dentroJanela72h) {
      prescricoes.push({
        finalidade: '5. Profilaxia Pós-Exposição ao HIV (PEP — Iniciar idealmente em 2h, máximo 72h)',
        farmaco: 'Tenofovir (TDF) 300 mg + Lamivudina (3TC) 300 mg + Dolutegravir (DTG) 50 mg',
        posologia: 'Tomar 1 comprimido coformulado de TDF/3TC (300/300 mg) + 1 comprimido de Dolutegravir 50 mg por via oral, 1 vez ao dia, durante 28 DIAS ININTERRUPTOS.'
      });
    }

    // 4. Imunoprofilaxia de Hepatite B
    if (!vacinadaHepatiteB) {
      prescricoes.push({
        finalidade: '6. Imunoprofilaxia de Hepatite B (Paciente Não Vacinada ou Esquema Incompleto)',
        farmaco: 'Vacina Hepatite B + Imunoglobulina Humana Anti-Hepatite B (IGHAHB)',
        posologia: 'Aplicar 1ª dose da Vacina Hepatite B IM no deltoide + IGHAHB 0,06 mL/kg IM em grupo muscular diferente (até no máximo 14 dias após a exposição).'
      });
    }

    return {
      protocolo: 'Atendimento Integral à Vítima de Violência Sexual (PCDT MS / FEBRASGO)',
      horasAposExposicao: horasAposExposicao,
      elegivelPepHiv: dentroJanela72h,
      elegivelContracepcaoEmergencia: !gestante && dentroJanela120h,
      examesBasaisAdmissao: [
        'Testes Rápidos basais na admissão: HIV, Sífilis, Hepatite B (HBsAg) e Hepatite C (Anti-HCV).',
        'Beta-hCG / Teste Rápido de Gravidez (para documentar ausência de gestação prévia).',
        'Hemograma, TGO/TGP e Creatinina (basal para acompanhamento da PEP).'
      ],
      prescricoes: prescricoes,
      aspectosEticosLegais: [
        'O atendimento médico é uma EMERGÊNCIA e NÃO depende da apresentação de Boletim de Ocorrência (B.O.) ou laudo do IML.',
        'Realizar Notificação Compulsória no SINAN (Ficha de Violência Interpessoal/Autoprovocada) em até 24 horas.',
        'Acionar Serviço Social e Psicologia para acolhimento humanizado e agendar retorno em 2 semanas, 30 dias, 90 dias e 6 meses.'
      ]
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 7. URGÊNCIAS DE MAMA E VULVA: MASTITE PUERPERAL & ABSCESSO DE BARTHOLIN
  // ───────────────────────────────────────────────────────────────────────────

  function manejarUrgenciaMamaVulva(dados) {
    dados = dados || {};
    var tipo = String(dados.condicao || 'mastite').toLowerCase();

    if (tipo.indexOf('bartholin') >= 0) {
      return {
        condicao: 'Bartolinite Aguda / Abscesso de Glândula de Bartholin',
        quadroClinico: 'Abaulamento doloroso, quente, hiperemiado e flutuante no terço posteroinferior do grande lábio (posição 4h ou 8h do introito vaginal).',
        condutaImediata: [
          '1. ABSCESSO FLUTUANTE FORMADO: O tratamento definitivo é CIRÚRGICO/MECÂNICO (Antibiótico isolado sem drenagem tem altíssimo índice de falha).',
          '   • Opção A (Preferencial em urgência/recorrência): MARSUPIALIZAÇÃO sob anestesia local/bloqueio pudendo (incisão vertical de 1,5 a 2 cm na face mucosa interna do vestíbulo, logo fora do anel himenal, lavagem com SF 0,9% e sutura da cápsula do cisto à mucosa vestibular com fio absorvível 3-0).',
          '   • Opção B: Inserção de Cateter de Word (insuflado com 2 a 3 mL de SF 0,9% por 4 semanas para epitelização do trajeto).',
          '   • Opção C (Alívio rápido no PS): Incisão e drenagem simples com lâmina 11 na face mucosa vestibular (orientar que há risco de recidiva).',
          '2. ANTIBIOTICOTERAPIA ASSOCIADA (Indicada se celulite perineal adjacente, febre, sinais sistêmicos, gestação ou suspeita de N. gonorrhoeae / C. trachomatis):',
          '   • Ceftriaxona 500 mg IM dose única + Doxiciclina 100 mg VO 12/12h por 7 a 10 dias + Metronidazol 500 mg VO 12/12h por 7 dias (ou Amoxicilina-Clavulanato 875/125 mg VO 12/12h por 7 dias).',
          '3. Analgesia, AINEs e banhos de assento mornos 3 a 4x ao dia.'
        ],
        alertaOncologico: '⚠️ Em mulheres > 40 anos ou na pós-menopausa com massa na topografia da glândula de Bartholin: realizar BIÓPSIA excisional para afastar Carcinoma de Glândula de Bartholin!'
      };
    }

    return {
      condicao: 'Mastite Puerperal Aguda (Lactacional)',
      quadroClinico: 'Dor mamária unilateral, eritema cuneiforme (em cunha), calor local, ingurgitamento, febre alta (> 38,5 ºC), calafrios e mialgia. Agente principal: Staphylococcus aureus.',
      condutaImediata: [
        '1. MEDIDA MAIS IMPORTANTE: NÃO SUSPENDER A AMAMENTAÇÃO! O esvaziamento frequente e completo da mama afetada (amamentação em livre demanda iniciando pela mama sadia ou ordenha manual/elétrica) é fundamental para a cura e não oferece risco ao RN a termo.',
        '2. Corrigir a pega e posicionamento do lactente (causa base da fissura mamilar e estase láctea). Compressas frias após as mamadas para reduzir edema e dor.',
        '3. ANTIBIOTICOTERAPIA EMPÍRICA DE 1ª LINHA (Segura na Amamentação — por 10 a 14 dias):',
        '   • Cefalexina 500 mg VO de 6/6 horas por 10 a 14 dias.',
        '   • OU Amoxicilina + Clavulanato 500/125 mg VO 8/8h (ou 875/125 mg 12/12h) por 10 a 14 dias.',
        '   • Se alérgica a betalactâmicos ou suspeita de MRSA comunitário: Clindamicina 300 a 600 mg VO de 6/6h ou 8/8h.',
        '4. Sintomáticos: Ibuprofeno 400 a 600 mg VO 8/8h + Paracetamol 500 a 750 mg VO 6/6h.'
      ],
      alertaAbscesso: '🚨 CRITÉRIO DE ULTRASSONOGRAFIA / DRENAGEM: Se presença de área de flutuação à palpação OU ausência de melhora clínica/febre após 48 a 72 horas de antibiótico adequado, solicitar USG de Mamas urgente para investigar ABSCESSO MAMÁRIO (tratar com punção aspirativa por agulha grossa guiada por USG ou drenagem cirúrgica, mantendo amamentação).'
    };
  }

  // Exportação Pública
  return {
    avaliarRastreioColoUterino: avaliarRastreioColoUterino,
    avaliarSangramentoUterinoAnormal: avaliarSangramentoUterinoAnormal,
    avaliarCriteriosElegibilidadeContracepcao: avaliarCriteriosElegibilidadeContracepcao,
    avaliarInfeccaoVulvovaginal: avaliarInfeccaoVulvovaginal,
    gerarResumoGinecologia: gerarResumoGinecologia,
    protocoloViolenciaSexual: protocoloViolenciaSexual,
    manejarUrgenciaMamaVulva: manejarUrgenciaMamaVulva
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GinecologiaAmbulatorialService;
}
