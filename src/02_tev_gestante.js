/**
 * ==============================================================================
 * MÓDULO 02: TROMBOEMBOLISMO VENOSO (TEV) NA GESTAÇÃO E PUERPÉRIO
 * ==============================================================================
 * Motor determinístico de estratificação de risco trombótico, tromboprofilaxia
 * com HBPM (Enoxaparina) ponderada pelo peso corporal, alertas farmacológicos
 * críticos (embriopatia varfarínica e DOACs) e intervalos de segurança estritos
 * para analgesia de parto e anestesia neuroaxial (raqui / peridural).
 *
 * REFERÊNCIAS:
 * - RCOG Green-top Guideline No. 37a: Reducing the Risk of Thrombosis and Embolism
 *   during Pregnancy and the Puerperium (Royal College of Obstetricians and Gynaecologists).
 * - FEBRASGO: Manual de Tromboembolismo Venoso na Gravidez e Puerpério.
 * - Consenso Brasileiro de Hematologia e Obstetrícia no Manejo de Trombofilias.
 * - SOAP / ASA Guidelines on Neuraxial Anesthesia and Anticoagulation.
 * ==============================================================================
 */

var TevGestanteService = (function() {
  'use strict';

  // ───────────────────────────────────────────────────────────────────────────
  // 1. CÁLCULO DA DOSE PONDERADA DE ENOXAPARINA (HBPM)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Calcula determinísticamente a posologia profilática de Enoxaparina ajustada
   * por peso materno (tabela ponderada RCOG/FEBRASGO) e função renal.
   *
   * @param {number} pesoKg - Peso da gestante/puérpera em kg
   * @param {number} [clearanceCreatinina=100] - Clearance de creatinina estimado (mL/min)
   * @param {string} [regime="PROFILATICO"] - "PROFILATICO" ou "TERAPEUTICO"
   * @returns {Object} Detalhes da dose, volume e orientações
   */
  function calcularDoseEnoxaparina(pesoKg, clearanceCreatinina, regime) {
    var peso = Number(pesoKg) || 60;
    var clCr = clearanceCreatinina !== undefined && clearanceCreatinina !== null ? Number(clearanceCreatinina) : 100;
    var modo = String(regime || 'PROFILATICO').toUpperCase().trim();

    var doseMg = 40;
    var frequencia = '24/24h (1x ao dia via Subcutânea - SC)';
    var faixaPeso = '50 a 90 kg (Dose Padrão)';
    var volumeMl = 0.4;
    var seringaApresentacao = 'Enoxaparina 40 mg / 0,4 mL seringa preenchida';
    var monitorarAntiXa = false;
    var alertaRenal = null;

    if (modo === 'TERAPEUTICO') {
      // Regime Terapêutico para TEV Agudo Confirmado: 1 mg/kg SC 12/12h ou 1.5 mg/kg SC 1x/dia
      doseMg = Math.round(peso * 1.0);
      volumeMl = Number((doseMg / 100).toFixed(2));
      frequencia = '12/12h via Subcutânea (SC) [Dose Plena / Terapêutica: 1 mg/kg 12/12h]';
      faixaPeso = 'Ajustada por peso real (1 mg/kg a cada 12 horas)';
      seringaApresentacao = 'Enoxaparina ' + doseMg + ' mg SC 12/12h';
      monitorarAntiXa = true;
    } else {
      // Regime Profilático Ponderado por Faixas de Peso RCOG / FEBRASGO
      if (peso < 50) {
        doseMg = 20;
        volumeMl = 0.2;
        faixaPeso = '< 50 kg (Baixo Peso)';
        seringaApresentacao = 'Enoxaparina 20 mg / 0,2 mL seringa preenchida';
      } else if (peso <= 90) {
        doseMg = 40;
        volumeMl = 0.4;
        faixaPeso = '50 a 90 kg (Peso Habitual)';
        seringaApresentacao = 'Enoxaparina 40 mg / 0,4 mL seringa preenchida';
      } else if (peso <= 130) {
        doseMg = 60;
        volumeMl = 0.6;
        faixaPeso = '91 a 130 kg (Sobrepeso / Obesidade Moderada)';
        seringaApresentacao = 'Enoxaparina 60 mg / 0,6 mL seringa preenchida';
      } else if (peso <= 170) {
        doseMg = 80;
        volumeMl = 0.8;
        faixaPeso = '131 a 170 kg (Obesidade Grave)';
        seringaApresentacao = 'Enoxaparina 80 mg / 0,8 mL seringa preenchida (ou 40 mg SC 12/12h)';
      } else {
        // Peso > 170 kg
        doseMg = Math.round(peso * 0.6);
        volumeMl = Number((doseMg / 100).toFixed(2));
        faixaPeso = '> 170 kg (Superobesidade: cálculo de 0,6 mg/kg/dia dividido)';
        seringaApresentacao = 'Enoxaparina ' + doseMg + ' mg/dia SC dividida em 2 doses';
        monitorarAntiXa = true;
      }
    }

    // Checagem de Insuficiência Renal (ClCr < 30 mL/min)
    var ajusteRenalAplicado = false;
    if (clCr < 30) {
      ajusteRenalAplicado = true;
      if (modo === 'PROFILATICO') {
        doseMg = 20;
        volumeMl = 0.2;
        seringaApresentacao = 'Enoxaparina 20 mg / 0,2 mL SC 1x/dia (dose ajustada para ClCr < 30 mL/min)';
      }
      alertaRenal = '⚠️ INSUFICIÊNCIA RENAL SEVERA (ClCr ' + clCr + ' mL/min < 30 mL/min): A Enoxaparina tem depuração renal e sofre acúmulo com risco hemorrágico severo. Reduzir dose para 20 mg SC 1x/dia OU considerar transição para Heparina Não Fracionada (HNF 5.000 UI SC 12/12h a 8/8h), que possui depuração reticuloendotelial e monitoramento seguro pelo TTPA.';
      monitorarAntiXa = true;
    }

    var orientacoes = [
      'Administração exclusivamente por via Subcutânea (SC) na face anterolateral ou posterolateral do abdome ou na face anterolateral da coxa.',
      'NÃO massagear nem esfregar o local da injeção após a aplicação para prevenir hematomas locais.',
      'Alternar os sítios de injeção a cada dose diária.',
      'HBPM não requer monitorização de TTPA de rotina.'
    ];

    if (monitorarAntiXa) {
      orientacoes.push('Monitorização de atividade Anti-fator Xa indicada (alvo profilático: 0,2 a 0,4 UI/mL; alvo terapêutico: 0,6 a 1,0 UI/mL medidos 4 horas após a dose SC).');
    }

    return {
      pesoKg: peso,
      clearanceCreatinina: clCr,
      regime: modo,
      doseMg: doseMg,
      volumeMl: volumeMl,
      frequencia: frequencia,
      faixaPeso: faixaPeso,
      seringaApresentacao: seringaApresentacao,
      ajusteRenalAplicado: ajusteRenalAplicado,
      alertaRenal: alertaRenal,
      monitorarAntiXa: monitorarAntiXa,
      orientacoesAdministracao: orientacoes
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. ALERTAS DE SEGURANÇA FARMACOLÓGICA (VARFARINA E DOACs)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avalia a prescrição de anticoagulantes orais na gestação e puerpério.
   *
   * @param {Object} params
   * @param {number} [params.trimestre=1] - Trimestre gestacional (1, 2 ou 3)
   * @param {boolean} [params.amamentando=false] - Se paciente está no puerpério amamentando
   * @param {boolean} [params.emUsoVarfarina=false] - Se paciente usa Varfarina
   * @param {boolean} [params.emUsoDoac=false] - Se paciente usa DOACs (Rivaroxabana, Apixabana, etc.)
   * @returns {Object} Alertas de contraindicação e orientações de substituição
   */
  function verificarAlertasAnticoagulantes(params) {
    params = params || {};
    var tri = Number(params.trimestre) || 1;
    var lactacao = Boolean(params.amamentando);
    var varfarina = Boolean(params.emUsoVarfarina);
    var doac = Boolean(params.emUsoDoac);

    var alertas = [];

    // Verificação de Varfarina
    if (varfarina) {
      if (!lactacao) {
        // Gestante
        if (tri === 1) {
          alertas.push({
            farmaco: 'Varfarina',
            nivel: 'BLOQUEIO_CRITICO',
            categoriaFda: 'X',
            titulo: '⛔ CONTRAINDICAÇÃO ABSOLUTA NO 1º TRIMESTRE: EMBRIOPATIA VARFARÍNICA',
            descricao: 'A Varfarina atravessa livremente a barreira placentária. A exposição entre a 6ª e a 12ª semanas gestacionais causa a Síndrome Varfarínica Fetal (hipoplasia nasal com depressão da ponte nasal, condrodisplasia pontilhada/epífises pontilhadas, encurtamento das falanges, microcefalia, atrofia óptica e retardo de desenvolvimento neuropsicomotor) em até 30% dos fetos expostos, além de risco de abortamento espontâneo.',
            condutaImediata: 'SUSPENDER A VARFARINA IMEDIATAMENTE e substituir por Heparina de Baixo Peso Molecular (Enoxaparina) em dose profilática ou terapêutica ponderada. (Única exceção de diretriz restrita: pacientes portadoras de prótese valvar mecânica de alto risco sob protocolo estrito de cardiologia especializada).'
          });
        } else if (tri === 3) {
          alertas.push({
            farmaco: 'Varfarina',
            nivel: 'BLOQUEIO_CRITICO',
            categoriaFda: 'D/X',
            titulo: '⛔ CONTRAINDICAÇÃO NO 3º TRIMESTRE E TERMO: RISCO DE HEMORRAGIA FETAL',
            descricao: 'O feto possui fígado imaturo com síntese deficiente de fatores dependentes de vitamina K. O uso de varfarina próximo ao parto causa grave coagulopatia fetal e risco extremo de hemorragia intracraniana neonatal e hematoma retroplacentário maciço durante o trabalho de parto.',
            condutaImediata: 'Suspender a Varfarina e transicionar para HBPM (Enoxaparina) ou HNF antes de 36 semanas ou no início do 3º trimestre.'
          });
        } else {
          // 2º trimestre
          alertas.push({
            farmaco: 'Varfarina',
            nivel: 'ALERTA_GRAVE',
            categoriaFda: 'D',
            titulo: '⚠️ RISCO FETAL NO 2º TRIMESTRE (ANOMALIAS DO SNC E SANGRAMENTO)',
            descricao: 'Embora fora da janela de condrodisplasia, o uso no 2º trimestre mantém risco de anomalias oculares, hidrocefalia, microcefalia e sangramento fetal oculto.',
            condutaImediata: 'Recomenda-se manter HBPM (Enoxaparina) durante toda a gestação.'
          });
        }
      } else {
        // Puérpera / Amamentando
        alertas.push({
          farmaco: 'Varfarina',
          nivel: 'PERMITIDO_COM_MONITORAMENTO',
          categoriaFda: 'Lactação Segura',
          titulo: '✅ VARFARINA COMPATÍVEL COM AMAMENTAÇÃO NO PUERPÉRIO',
          descricao: 'A Varfarina liga-se fortemente a proteínas plasmáticas maternas (>99%) e é minimamente excretada no leite humano, não induzindo coagulopatia no lactente.',
          condutaImediata: 'Permitido iniciar Varfarina no puerpério com ponte de HBPM até obtenção de INR na faixa terapêutica (2.0 a 3.0) em dois dias consecutivos. Monitorar INR materno rigorosamente.'
        });
      }
    }

    // Verificação de DOACs (Rivaroxabana, Apixabana, Dabigatrana, Edoxabana)
    if (doac) {
      if (!lactacao) {
        alertas.push({
          farmaco: 'DOACs (Rivaroxabana / Apixabana / Dabigatrana / Edoxabana)',
          nivel: 'BLOQUEIO_CRITICO',
          categoriaFda: 'Contraindicado',
          titulo: '⛔ DOACs CONTRAINDICADOS FORMALMENTE NA GESTAÇÃO',
          descricao: 'Os inibidores diretos do Fator Xa e da Trombina atravessam ativamente a placenta humana. Há evidências de toxicidade embriofetal, risco de abortamento e ausência de dados clínicos de segurança.',
          condutaImediata: 'INTERROMPER DOAC IMEDIATAMENTE e converter para Enoxaparina em dose ajustada ao peso.'
        });
      } else {
        alertas.push({
          farmaco: 'DOACs (Rivaroxabana / Apixabana / Dabigatrana / Edoxabana)',
          nivel: 'BLOQUEIO_CRITICO',
          categoriaFda: 'Contraindicado na Lactação',
          titulo: '⛔ DOACs CONTRAINDICADOS DURANTE A LACTAÇÃO / AMAMENTAÇÃO',
          descricao: 'Os DOACs são excretados no leite materno humano com risco potencial de sangramento e coagulopatia no recém-nascido.',
          condutaImediata: 'Não utilizar DOACs durante o aleitamento materno. Utilizar Enoxaparina ou Varfarina (com controle de INR).'
        });
      }
    }

    return {
      alertas: alertas,
      possuiBloqueioCritico: alertas.some(function(a) { return a.nivel === 'BLOQUEIO_CRITICO'; })
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. INTERVALO DE SEGURANÇA PARA ANALGESIA DE PARTO E BLOQUEIO NEUROAXIAL
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avalia determinísticamente o intervalo de segurança entre a última dose de
   * Enoxaparina e a execução de punção neuroaxial (raquianestesia / peridural)
   * ou retirada do cateter peridural, prevenindo hematoma epidural compressivo.
   *
   * @param {number} ultimaDoseHorasAtras - Tempo decorrido em horas desde a última dose de HBPM
   * @param {string} [tipoDose="PROFILATICA"] - "PROFILATICA" (<=40mg/dia) ou "TERAPEUTICA" (>40mg/dia ou 1mg/kg 12/12h)
   * @returns {Object} Parecer de segurança anestésica
   */
  function verificarSegurancaNeuroaxial(ultimaDoseHorasAtras, tipoDose) {
    var horas = Number(ultimaDoseHorasAtras);
    if (isNaN(horas) || horas < 0) horas = 0;
    var doseTipo = String(tipoDose || 'PROFILATICA').toUpperCase().trim();
    var eTerapeutica = doseTipo === 'TERAPEUTICA' || doseTipo === 'ALTA' || doseTipo === 'INTERMEDIARIA';

    var janelaMinimaHoras = eTerapeutica ? 24 : 12;
    var liberado = horas >= janelaMinimaHoras;
    var horasRestantes = liberado ? 0 : Number((janelaMinimaHoras - horas).toFixed(1));

    var status = liberado ? 'LIBERADO' : 'BLOQUEADO_JANELA_INSUFICIENTE';
    var parecer = liberado
      ? '✅ BLOQUEIO NEUROAXIAL LIBERADO: Já decorreram ' + horas + ' horas da última dose (janela mínima de ' + janelaMinimaHoras + ' horas atingida).'
      : '⛔ BLOQUEIO NEUROAXIAL CONTRAINDICADO NESTE MOMENTO: Decorreram apenas ' + horas + ' horas da última dose de Enoxaparina. Faltam ' + horasRestantes + ' horas para completar o intervalo mínimo de segurança de ' + janelaMinimaHoras + ' horas.';

    var alertaHematoma = 'ALERTA CRÍTICO: A realização de punção raquidiana ou peridural antes do intervalo mínimo de segurança acarreta alto risco de HEMATOMA EPIDURAL / ESPINHAL com compressão medular rápida e sequela neurológica irreversível (paraplegia).';

    var condutas = [
      'Janela mínima obrigatória para dose profilática (ex: 20 a 40 mg/dia): 12 HORAS.',
      'Janela mínima obrigatória para dose terapêutica ou intermediária (> 40 mg/dia): 24 HORAS.',
      'Retirada do cateter peridural: deve seguir a mesma janela de segurança (mínimo de 12h após profilática ou 24h após terapêutica).',
      'Reinício da Enoxaparina após a punção ou retirada do cateter: AGUARDAR NO MÍNIMO 4 HORAS após o procedimento e garantir hemostasia adequada.',
      'Se cesariana de urgência imediata sem cumprimento da janela de segurança: NÃO realizar raqui ou peridural. Optar por ANESTESIA GERAL com IOT em sequência rápida (RSI).'
    ];

    return {
      liberado: liberado,
      status: status,
      horasDecorridas: horas,
      janelaMinimaHoras: janelaMinimaHoras,
      horasRestantes: horasRestantes,
      tipoDoseAvaliada: doseTipo,
      parecer: parecer,
      alertaHematomaEpidural: alertaHematoma,
      recomendacoesConduta: condutas
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. ESTRATIFICAÇÃO DE RISCO ANTENATAL (DURANTE A GESTAÇÃO)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avalia o risco trombótico antenatal com pontuação cumulativa RCOG/FEBRASGO
   * e indica o momento exato de introdução da tromboprofilaxia.
   *
   * @param {Object} params - Fatores clínicos da gestante
   * @returns {Object} Classificação, escore, posologia e recomendações
   */
  function avaliarRiscoAntenatal(params) {
    params = params || {};
    var escore = 0;
    var fatores = [];

    // 1. Fatores Pré-existentes de Alto Risco
    var tevPrevio = Boolean(params.tevPrevio);
    var tevPrevioTipo = String(params.tevPrevioTipo || 'nao_provocado').toLowerCase();
    if (tevPrevio) {
      if (tevPrevioTipo === 'provocado_cirurgia_maior') {
        escore += 3;
        fatores.push({ fator: 'TEV prévio provocado por cirurgia de grande porte', pontos: 3 });
      } else {
        // Não provocado ou associado a estrogênio/gravidez
        escore += 4;
        fatores.push({ fator: 'TEV prévio não provocado ou associado a estrogênio/gestação', pontos: 4 });
      }
    }

    var trombofilia = String(params.trombofilia || 'nenhuma').toLowerCase();
    if (trombofilia === 'alto_risco') {
      escore += 3;
      fatores.push({ fator: 'Trombofilia de alto risco (Deficiência de Antitrombina, SAF, FVL homozigoto ou Protrombina homozigoto)', pontos: 3 });
    } else if (trombofilia === 'baixo_risco') {
      escore += 1;
      fatores.push({ fator: 'Trombofilia de baixo risco (FVL heterozigoto ou Protrombina heterozigoto sem TEV prévio)', pontos: 1 });
    }

    if (params.comorbidades) {
      escore += 3;
      fatores.push({ fator: 'Comorbidade médica de alto risco (Câncer ativo, LES, Nefropatia com proteinúria > 0,5g/dia, Insuficiência Cardíaca, DM1 com nefropatia)', pontos: 3 });
    }

    if (params.cirurgiaGravidez) {
      escore += 3;
      fatores.push({ fator: 'Cirurgia de grande porte na gestação atual (ex: laparotomia, cerclagem)', pontos: 3 });
    }

    if (params.sindromeHiperestimulacao) {
      escore += 4;
      fatores.push({ fator: 'Síndrome de Hiperestimulação Ovariana (OHSS) no 1º trimestre', pontos: 4 });
    }

    // 2. Fatores Obstétricos e Transitórios
    if (params.historiaFamiliarTev) {
      escore += 1;
      fatores.push({ fator: 'História familiar de TEV em parente de 1º grau (< 50 anos ou não provocado)', pontos: 1 });
    }

    var idade = Number(params.idade) || 0;
    if (idade > 35) {
      escore += 1;
      fatores.push({ fator: 'Idade materna > 35 anos', pontos: 1 });
    }

    // IMC
    var imc = Number(params.imc) || 0;
    if (params.pesoKg && params.alturaMetros && !params.imc) {
      imc = Number(params.pesoKg) / (Number(params.alturaMetros) * Number(params.alturaMetros));
    }
    if (imc >= 40) {
      escore += 2;
      fatores.push({ fator: 'Obesidade Grau III / Gravíssima (IMC >= 40 kg/m²)', pontos: 2 });
    } else if (imc >= 30) {
      escore += 1;
      fatores.push({ fator: 'Obesidade (IMC 30 a 39,9 kg/m²)', pontos: 1 });
    }

    var paridade = Number(params.paridade) || 0;
    if (paridade >= 3) {
      escore += 1;
      fatores.push({ fator: 'Multiparidade (paridade >= 3)', pontos: 1 });
    }

    if (params.tabagismo) {
      escore += 1;
      fatores.push({ fator: 'Tabagismo ativo', pontos: 1 });
    }

    if (params.varizesGrossas) {
      escore += 1;
      fatores.push({ fator: 'Varizes volumosas ou sintomáticas', pontos: 1 });
    }

    if (params.preEclampsia) {
      escore += 1;
      fatores.push({ fator: 'Pré-eclâmpsia na gestação atual', pontos: 1 });
    }

    if (params.gestacaoMultipla) {
      escore += 1;
      fatores.push({ fator: 'Gestação múltipla (gemelar ou trigelar)', pontos: 1 });
    }

    if (params.reproducaoAssistida) {
      escore += 1;
      fatores.push({ fator: 'Gravidez por Reprodução Assistida / FIV', pontos: 1 });
    }

    if (params.hiperemeseDesidratacao) {
      escore += 1;
      fatores.push({ fator: 'Hiperêmese gravídica com desidratação', pontos: 1 });
    }

    if (params.infeccaoSistemica) {
      escore += 1;
      fatores.push({ fator: 'Infecção sistêmica aguda atual', pontos: 1 });
    }

    if (params.imobilidade) {
      escore += 1;
      fatores.push({ fator: 'Imobilidade ou repouso no leito > 3 dias', pontos: 1 });
    }

    // 3. Classificação e Momento de Início
    var classificacaoRisco = 'BAIXO';
    var indicada = false;
    var momentoInicio = 'Não indicada profilaxia farmacológica de rotina ambulatorial.';
    var duracao = 'Não aplicável.';
    var justificativa = '';

    if (escore >= 4) {
      classificacaoRisco = 'ALTO';
      indicada = true;
      momentoInicio = 'DESDE O 1º TRIMESTRE (ou assim que identificado o escore >= 4)';
      duracao = 'Durante toda a gestação até o trabalho de parto + 6 semanas no puerpério';
      justificativa = 'Pontuação cumulativa antenatal >= 4 indica risco trombótico muito elevado. A tromboprofilaxia farmacológica deve ser iniciada imediatamente no primeiro trimestre.';
    } else if (escore === 3) {
      classificacaoRisco = 'INTERMEDIARIO';
      indicada = true;
      momentoInicio = 'A PARTIR DE 28 SEMANAS DE GESTAÇÃO';
      duracao = 'De 28 semanas até o parto + pelo menos 10 dias a 6 semanas no puerpério';
      justificativa = 'Pontuação cumulativa antenatal = 3 indica benefício de tromboprofilaxia a partir do 3º trimestre (28 semanas), quando o risco fisiológico pró-trombótico aumenta substancialmente.';
    } else {
      classificacaoRisco = 'BAIXO';
      indicada = Boolean(params.internada);
      if (params.internada) {
        momentoInicio = 'Durante a internação hospitalar';
        duracao = 'Enquanto durar a hospitalização / restrição ao leito';
        justificativa = 'Gestantes internadas por intercorrências clínicas com restrição ao leito têm benefício de tromboprofilaxia farmacológica hospitalar profilática.';
      } else {
        justificativa = 'Escore < 3 pontos no ambulatório: baixo risco. Estimular hidratação oral e deambulação frequente. Prescrição de Enoxaparina de rotina não indicada.';
      }
    }

    // 4. Cálculo da Dose Ponderada
    var posologia = calcularDoseEnoxaparina(params.pesoKg, params.clearanceCreatinina, 'PROFILATICO');

    // 5. Alertas de Varfarina e DOACs
    var checagemAnticoagulantes = verificarAlertasAnticoagulantes({
      trimestre: params.idadeGestacionalSemanas ? (params.idadeGestacionalSemanas < 14 ? 1 : (params.idadeGestacionalSemanas < 28 ? 2 : 3)) : 1,
      amamentando: false,
      emUsoVarfarina: Boolean(params.emUsoVarfarina),
      emUsoDoac: Boolean(params.emUsoDoac)
    });

    // 6. Janela Neuroaxial
    var protocoloNeuroaxial = verificarSegurancaNeuroaxial(
      params.ultimaDoseHbpmHorasAtras !== undefined ? params.ultimaDoseHbpmHorasAtras : 99,
      'PROFILATICA'
    );

    return {
      periodo: 'ANTENATAL',
      escoreTotal: escore,
      classificacaoRisco: classificacaoRisco,
      tromboprofilaxiaIndicada: indicada,
      momentoInicio: momentoInicio,
      duracaoRecomendada: duracao,
      justificativaClinica: justificativa,
      fatoresIdentificados: fatores,
      posologiaEnoxaparina: posologia,
      alertasFarmacologicos: checagemAnticoagulantes.alertas,
      protocoloNeuroaxial: protocoloNeuroaxial,
      avisoReferencia: '⚠️ *MÓDULO DE REFERÊNCIA AVANÇADA* — A conduta definitiva requer especialista. O generalista deve reconhecer, estabilizar e encaminhar.',
      banner: '⚠️ *MÓDULO DE REFERÊNCIA AVANÇADA* — A conduta definitiva requer especialista. O generalista deve reconhecer, estabilizar e encaminhar.'
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. ESTRATIFICAÇÃO DE RISCO PÓS-PARTO (PUERPÉRIO)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avalia o risco trombótico puerperal (pós-parto) com pontuação cumulativa
   * RCOG/FEBRASGO e determina a duração ideal da profilaxia com Enoxaparina.
   *
   * @param {Object} params - Fatores clínicos no puerpério
   * @returns {Object} Classificação, escore, duração de HBPM e posologia
   */
  function avaliarRiscoPosParto(params) {
    params = params || {};
    var escore = 0;
    var fatores = [];

    // Fatores de Muito Alto Risco (4 pontos)
    if (params.tevPrevio) {
      escore += 4;
      fatores.push({ fator: 'Histórico pessoal de TEV prévio', pontos: 4 });
    }

    // Trombofilias
    var trombofilia = String(params.trombofilia || 'nenhuma').toLowerCase();
    if (trombofilia === 'alto_risco') {
      escore += 3;
      fatores.push({ fator: 'Trombofilia de alto risco (Deficiência de Antitrombina, SAF, etc.)', pontos: 3 });
    } else if (trombofilia === 'baixo_risco') {
      escore += 1;
      fatores.push({ fator: 'Trombofilia de baixo risco (FVL heterozigoto ou Protrombina heterozigoto)', pontos: 1 });
    }

    if (params.comorbidades) {
      escore += 3;
      fatores.push({ fator: 'Comorbidade médica prévia (LES, Nefropatia, Cardiopatia, etc.)', pontos: 3 });
    }

    // Tipo de Parto
    var tipoParto = String(params.tipoParto || 'vaginal').toLowerCase();
    if (tipoParto === 'cesariana_urgencia' || params.cesarianaUrgencia) {
      escore += 2;
      fatores.push({ fator: 'Cesariana de urgência / emergência durante o trabalho de parto', pontos: 2 });
    } else if (tipoParto === 'cesariana_eletiva' || params.cesarianaEletiva) {
      escore += 1;
      fatores.push({ fator: 'Cesariana eletiva', pontos: 1 });
    }

    // Intercorrências Periparto
    if (params.hppGrave) {
      escore += 1;
      fatores.push({ fator: 'Hemorragia pós-parto (HPP > 1000 mL ou hemotransfusão)', pontos: 1 });
    }

    if (params.infeccaoPuerperal) {
      escore += 1;
      fatores.push({ fator: 'Infecção puerperal sistêmica / endometrite', pontos: 1 });
    }

    if (params.preEclampsia) {
      escore += 1;
      fatores.push({ fator: 'Pré-eclâmpsia / Síndrome Hipertensiva na gestação', pontos: 1 });
    }

    if (params.partoPreTermo) {
      escore += 1;
      fatores.push({ fator: 'Parto pré-termo (< 37 semanas)', pontos: 1 });
    }

    if (params.trabalhoPartoProlongado) {
      escore += 1;
      fatores.push({ fator: 'Trabalho de parto prolongado (> 24 horas) ou parto vaginal instrumental', pontos: 1 });
    }

    if (params.morteFetal) {
      escore += 1;
      fatores.push({ fator: 'Morte fetal intrauterina', pontos: 1 });
    }

    // Fatores Gerais
    var idade = Number(params.idade) || 0;
    if (idade > 35) {
      escore += 1;
      fatores.push({ fator: 'Idade materna > 35 anos', pontos: 1 });
    }

    var imc = Number(params.imc) || 0;
    if (params.pesoKg && params.alturaMetros && !params.imc) {
      imc = Number(params.pesoKg) / (Number(params.alturaMetros) * Number(params.alturaMetros));
    }
    if (imc >= 40) {
      escore += 2;
      fatores.push({ fator: 'Obesidade Grau III (IMC >= 40 kg/m²)', pontos: 2 });
    } else if (imc >= 30) {
      escore += 1;
      fatores.push({ fator: 'Obesidade (IMC 30 a 39,9 kg/m²)', pontos: 1 });
    }

    if (params.tabagismo) {
      escore += 1;
      fatores.push({ fator: 'Tabagismo ativo', pontos: 1 });
    }

    var paridade = Number(params.paridade) || 0;
    if (paridade >= 3) {
      escore += 1;
      fatores.push({ fator: 'Multiparidade (>= 3 partos)', pontos: 1 });
    }

    if (params.imobilidade) {
      escore += 1;
      fatores.push({ fator: 'Imobilidade pós-parto / repouso prolongado', pontos: 1 });
    }

    if (params.historiaFamiliarTev) {
      escore += 1;
      fatores.push({ fator: 'História familiar de TEV em 1º grau', pontos: 1 });
    }

    // Classificação Pós-parto e Duração
    var classificacaoRisco = 'BAIXO';
    var indicada = false;
    var duracao = 'Sem indicação ambulatorial.';
    var conduta = '';

    if (params.tevPrevio || trombofilia === 'alto_risco') {
      classificacaoRisco = 'MUITO_ALTO';
      indicada = true;
      duracao = '6 SEMANAS PÓS-PARTO';
      conduta = 'Profilaxia com HBPM mandatória por 6 semanas completas pós-parto devido ao risco extremo de trombose puerperal tardia.';
    } else if (escore >= 3) {
      classificacaoRisco = 'ALTO';
      indicada = true;
      duracao = 'PELO MENOS 10 DIAS PÓS-PARTO (estender até 6 semanas se fatores persistentes)';
      conduta = 'Escore pós-parto >= 3: Prescrever Enoxaparina profilática por pelo menos 10 dias. Se houver persistência de múltiplos fatores ou imobilidade, considerar estender por até 6 semanas.';
    } else if (escore === 2) {
      classificacaoRisco = 'MODERADO';
      indicada = true;
      duracao = 'PELO MENOS 10 DIAS PÓS-PARTO';
      conduta = 'Escore pós-parto = 2: Prescrever Enoxaparina profilática por pelo menos 10 dias (especialmente em cesarianas com fatores adicionais).';
    } else {
      classificacaoRisco = 'BAIXO';
      indicada = false;
      duracao = 'Apenas durante a internação hospitalar (se cesariana) ou mobilização precoce';
      conduta = 'Escore pós-parto <= 1: Baixo risco trombótico. Deambulação precoce e hidratação. HBPM ambulatorial não indicada de rotina.';
    }

    // Cálculo da dose
    var posologia = calcularDoseEnoxaparina(params.pesoKg, params.clearanceCreatinina, 'PROFILATICO');

    // Alertas de anticoagulantes no puerpério / lactação
    var checagemAnticoagulantes = verificarAlertasAnticoagulantes({
      trimestre: 3,
      amamentando: true,
      emUsoVarfarina: Boolean(params.emUsoVarfarina),
      emUsoDoac: Boolean(params.emUsoDoac)
    });

    // Janela neuroaxial se informada hora da dose
    var protocoloNeuroaxial = verificarSegurancaNeuroaxial(
      params.ultimaDoseHbpmHorasAtras !== undefined ? params.ultimaDoseHbpmHorasAtras : 99,
      'PROFILATICA'
    );

    return {
      periodo: 'POS_PARTO',
      escoreTotal: escore,
      classificacaoRisco: classificacaoRisco,
      tromboprofilaxiaIndicada: indicada,
      duracaoRecomendada: duracao,
      condutaClinica: conduta,
      fatoresIdentificados: fatores,
      posologiaEnoxaparina: posologia,
      alertasFarmacologicos: checagemAnticoagulantes.alertas,
      protocoloNeuroaxial: protocoloNeuroaxial,
      avisoReferencia: '⚠️ *MÓDULO DE REFERÊNCIA AVANÇADA* — A conduta definitiva requer especialista. O generalista deve reconhecer, estabilizar e encaminhar.',
      banner: '⚠️ *MÓDULO DE REFERÊNCIA AVANÇADA* — A conduta definitiva requer especialista. O generalista deve reconhecer, estabilizar e encaminhar.'
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. MOTOR UNIFICADO E FORMATADOR DE PARECER MÉDICO
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avaliação unificada de TEV na gestação e puerpério.
   *
   * @param {Object} params
   * @returns {Object} Parecer médico completo
   */
  function avaliarTevCompleto(params) {
    params = params || {};
    var periodo = String(params.periodo || 'antenatal').toLowerCase().trim();
    var res;
    if (periodo === 'pos_parto' || periodo === 'puerperio' || params.posParto || params.tipoParto) {
      res = avaliarRiscoPosParto(params);
    } else {
      res = avaliarRiscoAntenatal(params);
    }
    if (res && typeof res === 'object') {
      res.avisoReferencia = '⚠️ *MÓDULO DE REFERÊNCIA AVANÇADA* — A conduta definitiva requer especialista. O generalista deve reconhecer, estabilizar e encaminhar.';
      res.banner = '⚠️ *MÓDULO DE REFERÊNCIA AVANÇADA* — A conduta definitiva requer especialista. O generalista deve reconhecer, estabilizar e encaminhar.';
    }
    return res;
  }

  return {
    calcularDoseEnoxaparina: calcularDoseEnoxaparina,
    verificarAlertasAnticoagulantes: verificarAlertasAnticoagulantes,
    verificarSegurancaNeuroaxial: verificarSegurancaNeuroaxial,
    avaliarRiscoAntenatal: avaliarRiscoAntenatal,
    avaliarRiscoPosParto: avaliarRiscoPosParto,
    avaliarTevCompleto: avaliarTevCompleto
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TevGestanteService: TevGestanteService };
}
