/**
 * ==============================================================================
 * MÓDULO 02-D: CENTRO OBSTÉTRICO E EMERGÊNCIAS (PRÉ-PARTO & SALA DE PARTO)
 * ==============================================================================
 * Motor determinístico de alta fidelidade clínica e farmacológica para:
 *  - Diagnóstico e Monitoramento de Trabalho de Parto (fases, De Lee, Bishop, BCF).
 *  - Manejo de Pré-Eclâmpsia com Sinais de Gravidade e Eclâmpsia (Zuspan/Pritchard,
 *    vigilância de intoxicação por MgSO4, Gluconato de Cálcio e Crise Hipertensiva).
 *  - Protocolo de Hemorragia Pós-Parto (HPP - Regra dos 4 Ts, Índice de Choque,
 *    sequenciamento uterotônico estrito Ocitocina -> Metilergometrina -> Misoprostol
 *    -> Ácido Tranexâmico em até 3h).
 *  - Profilaxia para Sepse Neonatal por GBS (Streptococcus agalactiae) intraparto.
 *  - Prematuridade e RPMO (Corticoterapia pulmonar, Neuroproteção <32s, Tocólise
 *    e Regime de Latência).
 *
 * REFERÊNCIAS: FEBRASGO (Tratado de Obstetrícia 2024 / Manuais de Urgências e
 *   Emergências Obstétricas); Ministério da Saúde (Diretrizes Nacionais de
 *   Assistência ao Parto Normal); ACOG Practice Bulletins; OMS (Recomendações
 *   para Prevenção e Tratamento da HPP); Estudo WOMAN (Lancet 2017).
 * ==============================================================================
 */

var CentroObstetricoService = (function() {
  'use strict';

  // ───────────────────────────────────────────────────────────────────────────
  // 1. DIAGNÓSTICO E MONITORAMENTO DE TRABALHO DE PARTO
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avalia dinamicamente o trabalho de parto, fase clínica, altura da apresentação
   * e calcula o Índice de Bishop para maturidade cervical.
   */
  function avaliarTrabalhoParto(dados) {
    dados = dados || {};
    var dilatacao = Number(dados.dilatacaoCm);
    if (isNaN(dilatacao) || dilatacao < 0) dilatacao = 0;
    if (dilatacao > 10) dilatacao = 10;

    var contracoes10m = Number(dados.contracoes10min);
    if (isNaN(contracoes10m) || contracoes10m < 0) contracoes10m = 0;

    var duracaoSeg = Number(dados.duracaoContracaoSeg);
    if (isNaN(duracaoSeg) || duracaoSeg < 0) duracaoSeg = 0;

    var planoDeLee = Number(dados.planoDeLee);
    if (isNaN(planoDeLee)) planoDeLee = -3;
    if (planoDeLee < -5) planoDeLee = -5;
    if (planoDeLee > 5) planoDeLee = 5;

    var bcf = Number(dados.bcf);
    var apagamento = dados.apagamentoPct !== undefined ? Number(dados.apagamentoPct) : null;
    var posicaoColo = String(dados.posicaoColo || 'posterior').toLowerCase();
    var consistenciaColo = String(dados.consistenciaColo || 'medio').toLowerCase();
    var bolsa = String(dados.bolsa || 'integra').toLowerCase();
    var liquido = String(dados.liquidoAmniotico || 'claro').toLowerCase();

    // 1. Classificação da Fase Clínica
    var fase = 'FORA_DE_TRABALHO_DE_PARTO';
    var faseDescricao = 'Fora de trabalho de parto ativo';
    var condutaFase = [];

    if (dilatacao === 10) {
      fase = 'PERIODO_EXPULSIVO';
      faseDescricao = 'Período Expulsivo (Dilatação total: 10 cm)';
      condutaFase.push('Encaminhar imediatamente para assistência ao parto ou sala de parto.');
      condutaFase.push('Posição materna de escolha e conforto (preferir posições verticalizadas).');
      condutaFase.push('Incentivar puxos espontâneos sincronizados com as contrações; evitar puxos dirigidos exaustivos (Manobra de Valsalva prolongada).');
      condutaFase.push('Vigilância fetal contínua ou BCF a cada 5 minutos após cada contração.');
      condutaFase.push('Não realizar episiotomia de rotina (uso restrito a indicações obstétricas estritas).');
      condutaFase.push('Clampeamento oportuno do cordão umbilical (1 a 3 minutos ou cessação da pulsação em RN a termo vigoroso).');
      condutaFase.push('Contato pele a pele precoce e estímulo à amamentação na 1ª hora de vida.');
    } else if (dilatacao >= 4 && contracoes10m >= 2 && duracaoSeg >= 30) {
      fase = 'FASE_ATIVA';
      faseDescricao = 'Fase Ativa de Trabalho de Parto (Dilatação >= 4 cm + Contrações Regulares)';
      condutaFase.push('Internação imediata em Centro Obstétrico / Pré-parto.');
      condutaFase.push('Abertura de Partograma para acompanhamento gráfico da dilatação e descida.');
      condutaFase.push('Ausculta intermitente de BCF a cada 15 a 30 minutos (antes, durante e por 30s após a contração).');
      condutaFase.push('Estímulo a métodos não farmacológicos de alívio da dor (chuveiro morno, bola de parto, massagem lombar, deambulação).');
      condutaFase.push('Dieta líquida leve permitida em gestantes de baixo risco; acesso venoso calibroso se alto risco.');
      condutaFase.push('Toque vaginal parcimonioso (ideal a cada 2 a 4 horas ou se mudança de padrão clínico).');
    } else if (contracoes10m >= 1 || (dilatacao > 0 && dilatacao < 4)) {
      fase = 'FASE_LATENTE';
      faseDescricao = 'Fase Latente (Colo em esvaecimento ou dilatação < 4 cm / contrações irregulares)';
      condutaFase.push('Orientações e suporte clínico; encorajar deambulação e repouso em casa ou enfermaria.');
      condutaFase.push('Evitar internação precoce desnecessária (reduz intervenções iatrogênicas e cesarianas).');
      condutaFase.push('Orientar retorno imediato se contrações regulares (2 a 3 a cada 10 min com mais de 40s), perda de líquido amniótico ou sangramento vaginal.');
    } else {
      condutaFase.push('Gestante fora de trabalho de parto.');
      condutaFase.push('Avaliar vitalidade fetal ambulatorial e manter pré-natal de rotina.');
    }

    // 2. Análise da Altura de Apresentação (Planos de De Lee)
    var deLeeInfo = '';
    var deLeeInsinuado = planoDeLee >= 0;
    if (planoDeLee < 0) {
      deLeeInfo = 'Plano ' + planoDeLee + ' de De Lee: Apresentação alta e móvel (acima das espinhas isquiáticas).';
    } else if (planoDeLee === 0) {
      deLeeInfo = 'Plano 0 de De Lee: Feto INSINUADO (ponto de maior diâmetro no nível das espinhas isquiáticas).';
    } else if (planoDeLee >= 1 && planoDeLee <= 3) {
      deLeeInfo = 'Plano +' + planoDeLee + ' de De Lee: Feto em descida profunda no canal de parto (assoalho pélvico).';
    } else {
      deLeeInfo = 'Plano +' + planoDeLee + ' de De Lee: Coroamento e desprendimento fetal iminente no introito vulvar.';
    }

    // 3. Avaliação de BCF
    var bcfStatus = 'NAO_INFORMADO';
    var bcfAlerta = null;
    if (!isNaN(bcf) && bcf > 0) {
      if (bcf >= 110 && bcf <= 160) {
        bcfStatus = 'NORMAL';
      } else if (bcf > 160) {
        bcfStatus = 'TAQUICARDIA_FETAL';
        bcfAlerta = '🚨 TAQUICARDIA FETAL (BCF > 160 bpm): Investigar febre materna, corioamnionite, uso de tocolíticos beta-2 agonistas ou hipóxia fetal precoce. Medir temperatura axilar materna e manter cardiotocografia.';
      } else {
        bcfStatus = 'BRADICARDIA_FETAL';
        bcfAlerta = '⛔ BRADICARDIA FETAL SEVERA (BCF < 110 bpm): Suspeita de sofrimento fetal agudo! Medidas de ressuscitação intrauterina: decúbito lateral esquerdo, oxigenoterapia se hipoxemia materna, suspender ocitocina, hidratação IV e preparar sala cirúrgica se não recuperação rápida.';
      }
    }

    // 4. Avaliação do Líquido Amniótico e Membranas
    var bolsaAlerta = null;
    if (bolsa === 'rota') {
      if (liquido.includes('meconio') || liquido.includes('verde') || liquido.includes('espesso')) {
        bolsaAlerta = '⚠️ LÍQUIDO MECONIAL: Risco de síndrome de aspiração meconial e hipóxia fetal. Vigilância rigorosa de BCF e acionar equipe de neonatologia para a sala de parto.';
      } else if (liquido.includes('fetido') || liquido.includes('infecc')) {
        bolsaAlerta = '🚨 LÍQUIDO AMNIÓTICO FÉTIDO: Diagnóstico clínico de CORIOAMNIONITE! Iniciar antibióticos IV imediatos (Ampicilina + Gentamicina) e agilizar a resolução do parto.';
      } else if (liquido.includes('sang') || liquido.includes('hematico')) {
        bolsaAlerta = '🚨 LÍQUIDO SANGUINOLENTO: Investigar descolamento prematuro de placenta (DPP), rotura de vasa prévia ou rotura uterina!';
      }
    }

    // 5. Cálculo do Índice de Bishop (Maturidade Cervical)
    var bishop = calcularIndiceBishopInternal({
      dilatacaoCm: dilatacao,
      apagamentoPct: apagamento,
      planoDeLee: planoDeLee,
      consistencia: consistenciaColo,
      posicao: posicaoColo
    });

    return {
      fase: fase,
      faseDescricao: faseDescricao,
      dilatacaoCm: dilatacao,
      contracoes10min: contracoes10m,
      duracaoContracaoSeg: duracaoSeg,
      planoDeLee: planoDeLee,
      deLeeInfo: deLeeInfo,
      insinuado: deLeeInsinuado,
      bcf: !isNaN(bcf) && bcf > 0 ? bcf : null,
      bcfStatus: bcfStatus,
      bcfAlerta: bcfAlerta,
      bolsa: bolsa,
      liquidoAmniotico: liquido,
      bolsaAlerta: bolsaAlerta,
      bishop: bishop,
      condutaFase: condutaFase
    };
  }

  function calcularIndiceBishopInternal(params) {
    var d = Number(params.dilatacaoCm) || 0;
    var ap = params.apagamentoPct;
    var lee = Number(params.planoDeLee);
    if (isNaN(lee)) lee = -3;
    var cons = String(params.consistencia || '').toLowerCase();
    var pos = String(params.posicao || '').toLowerCase();

    var scoreDilatacao = 0;
    if (d >= 5) scoreDilatacao = 3;
    else if (d >= 3) scoreDilatacao = 2;
    else if (d >= 1) scoreDilatacao = 1;

    var scoreApagamento = 0;
    if (ap !== null && !isNaN(ap)) {
      if (ap >= 80) scoreApagamento = 3;
      else if (ap >= 60) scoreApagamento = 2;
      else if (ap >= 40) scoreApagamento = 1;
    } else {
      if (cons.includes('fino')) scoreApagamento = 3;
      else if (cons.includes('medio')) scoreApagamento = 1;
    }

    var scoreDeLee = 0;
    if (lee >= 1) scoreDeLee = 3;
    else if (lee >= -1) scoreDeLee = 2;
    else if (lee === -2) scoreDeLee = 1;

    var scoreConsistencia = 0;
    if (cons.includes('amolec')) scoreConsistencia = 2;
    else if (cons.includes('medio')) scoreConsistencia = 1;
    // rigido = 0

    var scorePosicao = 0;
    if (pos.includes('anter')) scorePosicao = 2;
    else if (pos.includes('intermed') || pos.includes('medio')) scorePosicao = 1;
    // posterior = 0

    var total = scoreDilatacao + scoreApagamento + scoreDeLee + scoreConsistencia + scorePosicao;
    var interpretacao = '';
    var favoravel = false;
    var condutaInducao = '';

    if (total >= 9) {
      favoravel = true;
      interpretacao = 'Colo uterino FAVORÁVEL (Índice de Bishop >= 9): Alta probabilidade de sucesso em indução ou trabalho de parto espontâneo.';
      condutaInducao = 'Se indicação de indução: Ocitocina IV em bomba de infusão contínua em doses escalonadas (iniciar com 2 a 4 mUI/min e titular a cada 30 min) e/ou amniotomia se apresentação cefálica encaixada.';
    } else if (total >= 6) {
      favoravel = true;
      interpretacao = 'Colo uterino INTERMEDIÁRIO (Índice de Bishop 6 a 8): Razoável probabilidade de indução.';
      condutaInducao = 'Avaliar métodos de amadurecimento cervical ou infusão cautelosa de ocitocina.';
    } else {
      favoravel = false;
      interpretacao = 'Colo uterino DESFAVORÁVEL / IMATURO (Índice de Bishop <= 5): Baixa chance de sucesso com ocitocina isolada.';
      condutaInducao = 'Requer PREPARO/AMADURECIMENTO CERVICAL prévio: Misoprostol 25 mcg via vaginal a cada 6 horas (máx 4-6 doses) OU Método Mecânico com Cateter de Foley intracervical (30-50 mL de SF) se contraindicação a prostaglandinas (ex: cesariana prévia / cicatriz uterina).';
    }

    return {
      pontos: total,
      favoravel: favoravel,
      interpretacao: interpretacao,
      condutaInducao: condutaInducao,
      detalhes: {
        dilatacao: scoreDilatacao,
        apagamento: scoreApagamento,
        alturaApresentacao: scoreDeLee,
        consistencia: scoreConsistencia,
        posicao: scorePosicao
      }
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. PRÉ-ECLÂMPSIA COM SINAIS DE GRAVIDADE (PE-SG) E SULFATO DE MAGNÉSIO
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Prescrição determinística do Sulfato de Magnésio (MgSO4) por Zuspan ou Pritchard,
   * checagem obrigatória de toxicidade clínica e antídoto Gluconato de Cálcio.
   */
  function prescreverSulfatoMagnesio(params) {
    params = params || {};
    var esquema = String(params.esquema || 'Zuspan').trim();
    var reflexoPatelar = params.reflexoPatelar; // boolean
    var fr = Number(params.frequenciaRespiratoria);
    var diureseMlH = Number(params.diureseMlHora);
    var creatinina = Number(params.creatinina);

    // Avaliação de Sinais de Intoxicação / Toxicidade por Magnésio
    var alertasIntoxicacao = [];
    var intoxicacaoDetectada = false;

    if (reflexoPatelar === false) {
      intoxicacaoDetectada = true;
      alertasIntoxicacao.push('🚨 REFLEXO PATELAR ABOLIDO: Primeiro sinal clínico de hipermagnesemia tóxica (níveis séricos aproximados de 8 a 10 mEq/L).');
    }

    if (!isNaN(fr) && fr > 0 && fr < 16) {
      intoxicacaoDetectada = true;
      if (fr < 12) {
        alertasIntoxicacao.push('🚨 DEPRESSÃO RESPIRATÓRIA (FR < 12 rpm): Risco iminente de parada respiratória por bloqueio neuromuscular!');
      } else {
        alertasIntoxicacao.push('🚨 DEPRESSÃO RESPIRATÓRIA (FR < 16 rpm): Sinal sentinela de hipermagnesemia tóxica (> 10 mEq/L). Suspender infusão imediatamente!');
      }
    }

    if (!isNaN(diureseMlH) && diureseMlH >= 0 && diureseMlH < 25) {
      intoxicacaoDetectada = true;
      alertasIntoxicacao.push('🚨 OLIGÚRIA SEVERA (Diurese < 25 mL/h ou < 100 mL em 4h): Excreção de magnésio é estritamente renal. Risco crítico de acúmulo e intoxicação letal!');
    }

    var condutaIntoxicacao = null;
    if (intoxicacaoDetectada) {
      condutaIntoxicacao = {
        acaoImediata: 'SUSPENDER IMEDIATAMENTE A INFUSÃO DE SULFATO DE MAGNÉSIO!',
        antidoto: 'GLUCONATO DE CÁLCIO 10%: Administrar 1 ampola (10 mL = 1g) IV em bolus lento de 3 a 5 minutos.',
        repeticaoAntidoto: 'Se bradipneia ou instabilidade persistir em 5 a 10 minutos: repetir 1 ampola (10 mL = 1g) IV de Gluconato de Cálcio 10%.',
        suporte: 'Ofertar O2 sob máscara a 8-10 L/min, solicitar vaga em UTI, dosar magnésio sérico urgente e preparar intubação se parada respiratória iminente.'
      };
    }

    // Montagem da Prescrição Conforme o Esquema
    var prescricao = {};
    if (esquema.toLowerCase().includes('pritchard')) {
      prescricao = {
        nome: 'Esquema de Pritchard (Alternativa sem Bomba de Infusão ou em Transporte)',
        via: 'Combinada (IV + IM)',
        ataque: [
          'Ataque IV Concomitante: MgSO4 50% 8 mL (4g) + SG 5% ou AD 12 mL = 20 mL IV administrados em bolus lento em 15 a 20 minutos (preferencialmente 20 min).',
          'ASSOCIADO A (Ataque IM Concomitante): MgSO4 50% 20 mL (10g) via IM profundo — aplicar 5g (10 mL) em cada glúteo profundamente, com 1 mL de lidocaína a 2% sem vasoconstritor em cada nádega para analgesia local.'
        ],
        manutencao: [
          'Manutenção IM: MgSO4 50% 10 mL (5g) via IM profundo a cada 4 horas no glúteo contralateral alternado (adicionar 1 mL de lidocaína 2% sem vasoconstritor).',
          'SÓ APLICAR A DOSE SE: reflexo patelar presente, FR >= 16 rpm e diurese >= 25 mL/h nas últimas 4 horas.',
          'Dose de Reforço se Nova Convulsão: MgSO4 50% 4 mL (2g) + AD 6 mL = 10 mL IV lento em 10 minutos se recorrência.',
          'Manter por 24 horas após o parto ou após a última crise convulsiva.'
        ],
        doseReforcoConvulsao: 'MgSO4 50% 4 mL (2g) + AD 6 mL IV em 10 minutos se nova convulsão.'
      };
    } else if (esquema.toLowerCase().includes('neuroprote')) {
      prescricao = {
        nome: 'Esquema de Neuroproteção Fetal (< 32 semanas)',
        via: 'Intravenosa (IV)',
        ataque: [
          'Dose de Ataque: MgSO4 50% 8 mL (4g) + SG 5% ou SF 0,9% 12 mL = 20 mL IV lento em 20 a 30 minutos em bomba de infusão.'
        ],
        manutencao: [
          'Dose de Manutenção: MgSO4 50% 20 mL (10g) + SF 0,9% 480 mL = 500 mL IV contínua em Bomba de Infusão a 50 mL/h (1g/hora).',
          'Manter até o nascimento ou por no máximo 24 horas se o parto prematuro não ocorrer.'
        ],
        doseReforcoConvulsao: 'Não aplicável para indicação exclusiva de neuroproteção prematura.'
      };
    } else {
      // Zuspan padrão
      prescricao = {
        nome: 'Esquema de Zuspan (Padrão Ouro — Infusão Contínua em Bomba)',
        via: 'Intravenosa (IV)',
        ataque: [
          'Dose de Ataque: MgSO4 50% 8 mL (4g) + SG 5% ou SF 0,9% 12 mL = 20 mL IV em bomba de infusão lenta em 15 a 20 minutos (preferencialmente 20 min).'
        ],
        manutencao: [
          'Dose de Manutenção: MgSO4 50% 20 mL (10g) + SF 0,9% ou SG 5% 480 mL = 500 mL IV em Bomba de Infusão Contínua a 50 mL/h (fornece 1g de MgSO4 por hora).',
          'Alternativa Concentrada (Restrição volêmica): MgSO4 50% 10 mL (5g) + SF 0,9% 240 mL = 250 mL a 50 mL/h em BIC (1g/h).',
          'Dose de Reforço se Nova Convulsão: MgSO4 50% 4 mL (2g) + AD 6 mL = 10 mL IV em 10 a 15 min; considerar aumentar manutenção para 1,5 a 2 g/h em BIC.',
          'Ajuste se Creatinina >= 1.2 mg/dL ou Oligúria: Reduzir velocidade para 25 mL/h (0,5g/hora) com dosagem seriada de magnesemia a cada 6h (faixa terapêutica: 4,8 a 8,4 mg/dL ou 4 a 7 mEq/L).',
          'Manter por 24 horas pós-parto ou 24 horas após a última crise de eclâmpsia.'
        ],
        doseReforcoConvulsao: 'MgSO4 50% 4 mL (2g) + AD 6 mL = 10 mL IV em 10 a 15 min + elevar manutenção para 1,5-2 g/h em BIC se nova convulsão.'
      };
    }

    var rotinaVigilancia = [
      'Reflexo patelar a cada 1 hora (deve estar PRESENTE antes de cada aplicação/infusão contínua; arreflexia indica hipermagnesemia ~8-10 mEq/L).',
      'Frequência respiratória horária (deve estar >= 16 rpm; suspender se < 16 rpm; risco de parada se < 12 rpm).',
      'Diurese horária em sonda vesical de demora fechada com uripen/balanço (deve ser >= 25 mL/h).',
      'Manter 1 ampola de Gluconato de Cálcio 10% (10 mL) obrigatoriamente beira-leito pronta para uso imediato.'
    ];

    var checklistVigilancia = {
      reflexoPatelar: {
        parametro: 'Reflexo Patelar',
        alvo: 'Presente (avaliação horária contínua no Zuspan ou pré-dose no Pritchard)',
        alarme: 'Abolido / Hiporreflexia (sinal precoce de hipermagnesemia sérica ~8-10 mEq/L)',
        conduta: 'Suspender MgSO4 imediatamente e avaliar Gluconato de Cálcio 10%'
      },
      frequenciaRespiratoria: {
        parametro: 'Frequência Respiratória',
        alvo: '>= 16 irpm (ou rpm)',
        alarme: '< 16 irpm (suspender MgSO4); < 12 irpm (risco iminente de parada por bloqueio neuromuscular)',
        conduta: 'Suspender MgSO4 + Gluconato de Cálcio 10% 10 mL IV em 3 a 5 min'
      },
      diurese: {
        parametro: 'Débito Urinário Horário (SVD)',
        alvo: '>= 25 mL/h ou >= 100 mL em 4 horas (sonda vesical de demora com sistema fechado)',
        alarme: '< 25 mL/h (oligúria severa com risco crítico de acúmulo tóxico por via renal)',
        conduta: 'Reduzir manutenção pela metade (0,5 g/h) ou suspender e dosar magnesemia'
      },
      antidoto: {
        droga: 'Gluconato de Cálcio 10%',
        dose: '10 mL (= 1g) IV em bolus lento de 3 a 5 minutos beira-leito',
        indicacao: 'Toxicidade clínica por magnésio (arreflexia, bradipneia FR < 16 ou PCR)'
      }
    };

    var prescricaoPepTexto = [
      'PRESCRIÇÃO BEIRA-LEITO (PEP) — SULFATO DE MAGNÉSIO (' + prescricao.nome + '):',
      '1. ATAQUE: ' + prescricao.ataque.join(' '),
      '2. MANUTENÇÃO: ' + prescricao.manutencao[0],
      '3. VIGILÂNCIA HORÁRIA MANDATÓRIA (SVD): Checar Reflexo Patelar (presente), FR (>= 16 irpm) e Diurese (>= 25 mL/h).',
      '4. ANTÍDOTO BEIRA-LEITO (SOS): Gluconato de Cálcio 10% 10 mL (= 1g) IV lento de 3 a 5 min se sinais de intoxicação (arreflexia ou FR < 16 irpm).'
    ].join('\n');

    return {
      sucesso: true,
      esquema: esquema,
      prescricao: prescricao,
      intoxicacaoDetectada: intoxicacaoDetectada,
      alertasIntoxicacao: alertasIntoxicacao,
      condutaIntoxicacao: condutaIntoxicacao,
      rotinaVigilancia: rotinaVigilancia,
      checklistVigilancia: checklistVigilancia,
      antidoto: checklistVigilancia.antidoto,
      prescricaoPep: prescricaoPepTexto
    };
  }

  /**
   * Manejo sequencial da crise hipertensiva aguda na gestante (PAS >= 160 ou PAD >= 110).
   */
  function manejarCriseHipertensiva(dados) {
    dados = dados || {};
    var pas = Number(dados.pas);
    var pad = Number(dados.pad);
    var viaPreferencial = String(dados.viaPreferencial || 'IV').toUpperCase();
    var sintomasGravidade = Array.isArray(dados.sintomasGravidade) ? dados.sintomasGravidade : [];

    var ehCrise = (!isNaN(pas) && pas >= 160) || (!isNaN(pad) && pad >= 110);
    var ehHipertensao = (!isNaN(pas) && pas >= 140) || (!isNaN(pad) && pad >= 90);

    var classificacao = 'NORMOTENSA';
    if (ehCrise) {
      classificacao = 'EMERGENCIA_HIPERTENSIVA_OBSTETRICA';
    } else if (ehHipertensao) {
      classificacao = 'HIPERTENSAO_MODERADA';
    }

    var condutas = [];
    var medicacoes = [];

    if (ehCrise) {
      condutas.push('🚨 CRISE HIPERTENSIVA OBSTÉTRICA (PAS >= 160 ou PAD >= 110 mmHg): Risco iminente de AVC hemorrágico materno, eclâmpsia e descolamento prematuro de placenta (DPP).');
      condutas.push('Meta Pressórica: Reduzir para PAS 140-150 mmHg e PAD 90-100 mmHg. EVITAR hipotensão súbita (PAS < 130 ou PAD < 80) para proteger o fluxo sanguíneo útero-placentário.');
      condutas.push('Iniciar IMEDIATAMENTE SULFATO DE MAGNÉSIO para profilaxia de eclâmpsia e estabilização endotelial.');

      // 1ª Linha IV: Hidralazina
      medicacoes.push({
        farmaco: 'Hidralazina IV (1ª Linha Endovenosa — Padrão SUS/REMUME)',
        posologia: 'Diluir 1 ampola (20 mg/mL) em 19 mL de SF 0,9% (concentração 1 mg/mL). Administrar 5 mg (5 mL) IV em bolus lento de 2 a 3 minutos.',
        reavaliacao: 'Medir PA a cada 20 minutos. Se PAS >= 160 ou PAD >= 110 persistir, repetir 5 a 10 mg a cada 20-30 minutos. Dose máxima acumulada: 20 a 30 mg. Se refratária, associar Nifedipino ou Labetalol.'
      });

      // 1ª Linha VO: Nifedipino
      medicacoes.push({
        farmaco: 'Nifedipino VO Comprimido/Cápsula de Liberação Imediata (1ª Linha Oral)',
        posologia: '10 a 20 mg via oral (deglutir inteiro com um pouco de água). NUNCA usar sublingual (risco de queda pressórica abrupta incontrolável e bradicardia fetal).',
        reavaliacao: 'Reavaliar PA em 20 a 30 minutos. Se persistir descontrolada, administrar nova dose de 10 a 20 mg VO. Dose máxima no episódio: 60 a 80 mg/dia.'
      });

      // Alternativa: Labetalol IV
      medicacoes.push({
        farmaco: 'Labetalol IV (Alternativa de 1ª linha em centros com disponibilidade)',
        posologia: '20 mg IV em bolus lento de 2 minutos. Se refratário após 10 minutos: 40 mg IV; se necessário mais 10 min: 80 mg IV a cada 10 min (dose máxima: 220 a 300 mg). Contraindicado em gestantes asmáticas ou com insuficiência cardíaca.'
      });
    } else if (ehHipertensao) {
      condutas.push('Hipertensão arterial moderada sem crise aguda imediata. Manter anti-hipertensivo oral contínuo.');
      medicacoes.push({
        farmaco: 'Metildopa VO (Fármaco de escolha crônica na gestação)',
        posologia: '250 mg a 500 mg VO a cada 8 a 12 horas (dose máxima 2 g/dia).'
      });
      medicacoes.push({
        farmaco: 'Nifedipino Retard VO (2ª escolha crônica)',
        posologia: '20 mg a 40 mg VO a cada 12 horas.'
      });
    }

    var contraindicacoesAbsolutas = [
      '❌ IECAs (Enalapril, Captopril) e BRAs (Losartana, Valsartana): TERMINANTEMENTE PROIBIDOS na gravidez (fetopatia grave, oligoidrâmnio, disgenesia renal fetal e óbito perinatal).',
      '❌ Nitroprussiato de Sódio: Restrito exclusivamente a emergências extremas refratárias em UTI com risco de morte materna por edema agudo de pulmão (risco de acúmulo de cianeto e morte fetal).',
      '❌ Nifedipino Sublingual: Proibido devido ao risco de hipotensão abrupta e sofrimento fetal agudo.'
    ];

    return {
      ehCrise: ehCrise,
      classificacao: classificacao,
      pas: pas,
      pad: pad,
      condutas: condutas,
      medicacoes: medicacoes,
      contraindicacoesAbsolutas: contraindicacoesAbsolutas
    };
  }

  /**
   * Manejo integral de Pré-Eclâmpsia com Sinais de Gravidade, Iminência de Eclâmpsia
   * e Eclâmpsia (FEBRASGO 2024 / MS / ACOG).
   * Consolida Sulfato de Magnésio (Zuspan/Pritchard), Crise Hipertensiva, Exames da Síndrome HELLP,
   * Vigilância beira-leito (Patelar, FR >= 16 irpm, Diurese >= 25 mL/h) e Prescrição PEP.
   */
  function manejarPreEclampsiaGrave(dados) {
    dados = dados || {};
    var pas = Number(dados.pas) || 160;
    var pad = Number(dados.pad) || 110;
    var esquema = String(dados.esquema || 'Zuspan');
    var igSemanas = Number(dados.igSemanas) || 0;
    var sintomas = Array.isArray(dados.sintomasGravidade) ? dados.sintomasGravidade.slice() : [];
    if (dados.sintomas && typeof dados.sintomas === 'string') {
      sintomas.push(dados.sintomas);
    }

    var mgParams = {
      esquema: esquema,
      reflexoPatelar: dados.reflexoPatelar !== undefined ? dados.reflexoPatelar : true,
      frequenciaRespiratoria: dados.frequenciaRespiratoria !== undefined ? Number(dados.frequenciaRespiratoria) : 16,
      diureseMlHora: dados.diureseMlHora !== undefined ? Number(dados.diureseMlHora) : 35,
      creatinina: dados.creatinina
    };

    // Gera ambos os esquemas para pronta referência e comparação beira-leito
    var paramsZuspan = Object.assign({}, mgParams, { esquema: 'Zuspan' });
    var paramsPritchard = Object.assign({}, mgParams, { esquema: 'Pritchard' });
    var mgZuspan = prescreverSulfatoMagnesio(paramsZuspan);
    var mgPritchard = prescreverSulfatoMagnesio(paramsPritchard);

    var ehPritchard = esquema.toLowerCase().includes('pritchard');
    var mg = ehPritchard ? mgPritchard : mgZuspan;
    var crise = manejarCriseHipertensiva({ pas: pas, pad: pad });

    var ehIminencia = sintomas.some(function(s) {
      return /cefale|escotoma|turva|epigastr|hipocondr|reflex|clonus/i.test(s);
    }) || Boolean(dados.iminenciaEclampsia);

    var ehEclampsia = Boolean(dados.eclampsia || dados.convulsao);

    var classificacao = 'PRÉ-ECLÂMPSIA COM SINAIS DE GRAVIDADE';
    if (ehEclampsia) {
      classificacao = 'ECLÂMPSIA CONVULSIVA (EMERGÊNCIA OBSTÉTRICA MÁXIMA)';
    } else if (ehIminencia) {
      classificacao = 'IMINÊNCIA DE ECLÂMPSIA (SINAIS PREMONITÓRIOS NEUROLÓGICOS/VISUAIS)';
    }

    var condutas = [];
    condutas.push('1. ESTABILIZAÇÃO MATERNA IMEDIATA: Decúbito lateral esquerdo (DULE), O2 sob cateter se SpO2 < 95%, 2 acessos venosos periféricos calibrosos (16G ou 18G).');
    condutas.push('2. SULFATO DE MAGNÉSIO IMEDIATO (Prevenção e Tratamento de Convulsões — FEBRASGO 2024 / MS): Iniciar imediatamente. Não aguardar resultados laboratoriais!');
    condutas.push('   • ESQUEMA DE ZUSPAN (Padrão Ouro — Infusão IV em Bomba de Infusão Contínua):');
    condutas.push('     - Ataque: 4g IV de MgSO4 50% (8 mL) + 12 mL de SG 5%, SF 0,9% ou AD = 20 mL IV administrados em 20 minutos (preferencialmente em BIC).');
    condutas.push('     - Manutenção: 1g/h em BIC contínua (MgSO4 50% 20 mL [10g] + SF 0,9% ou SG 5% 480 mL = 500 mL a 50 mL/h) por 24h pós-parto ou após a última crise.');
    condutas.push('   • ESQUEMA DE PRITCHARD (Alternativa sem Bomba de Infusão / Durante Transporte):');
    condutas.push('     - Ataque: 4g IV (MgSO4 50% 8 mL + 12 mL AD em 20 min) + 10g IM concomitante (5g / 10 mL de MgSO4 50% em cada nádega profundamente, com 1 mL lidocaína 2% em cada seringa).');
    condutas.push('     - Manutenção: 5g IM (10 mL de MgSO4 50% + 1 mL lidocaína 2%) a cada 4 horas no glúteo contralateral alternado.');
    condutas.push('   • CHECKLIST DE VIGILÂNCIA HORÁRIA (Tríade de Segurança):');
    condutas.push('     - Reflexo Patelar: deve estar PRESENTE a cada 1h (suspender se abolido — sinal precoce de hipermagnesemia ~8-10 mEq/L).');
    condutas.push('     - Frequência Respiratória: deve ser >= 16 irpm (suspender se < 16 irpm; parada respiratória iminente se < 12 irpm).');
    condutas.push('     - Diurese Horária: deve ser >= 25 mL/h (ou >= 100 mL em 4h) em sonda vesical de demora fechada (excreção estritamente renal).');
    condutas.push('   • ANTÍDOTO BEIRA-LEITO MANDATÓRIO:');
    condutas.push('     - Gluconato de Cálcio 10%: 10 mL (= 1g) IV em bolus lento de 3 a 5 minutos se intoxicação clínica (arreflexia, FR < 16 irpm ou parada).');

    if (crise.ehCrise) {
      condutas.push('3. CONTROLE AGUDO DA CRISE HIPERTENSIVA (PA ' + pas + 'x' + pad + ' mmHg): Hidralazina 5 mg IV lento q20min (máx 20 mg) ou Nifedipino 10-20 mg VO deglutido. Meta: PAS 140-150 / PAD 90-100 mmHg. Evitar quedas abruptas (risco de hipofluxo útero-placentário).');
    } else {
      condutas.push('3. MONITORIZAÇÃO PRESSÓRICA RIGOROSA: PA a cada 15-30 minutos. Se PAS >= 160 ou PAD >= 110 mmHg, intervir com anti-hipertensivo de ação rápida.');
    }

    condutas.push('4. SONDAGEM VESICAL DE DEMORA COM SISTEMA FECHADO: Balanço hídrico rigoroso e controle de débito urinário horário (meta: >= 25 mL/h).');
    condutas.push('5. EXAMES LABORATORIAIS DE URGÊNCIA (Rastreio de Síndrome HELLP): Hemograma completo c/ plaquetas, DHL, Bilirrubinas totais e frações, TGO/AST, TGP/ALT, Creatinina, Ácido Úrico e Proteinúria.');

    if (igSemanas >= 24 && igSemanas < 34) {
      condutas.push('6. CORTICOTERAPIA PULMONAR (< 34 semanas): Betametasona 12 mg IM a cada 24h (2 doses) se viável antes do parto.');
    }

    condutas.push('7. RESOLUÇÃO DA GESTAÇÃO: Tratamento definitivo da doença. Proceder o parto após estabilização clínica e hemodinâmica materna.');

    var prescricaoPepTexto = [
      'PRESCRIÇÃO BEIRA-LEITO (PEP) — PRÉ-ECLÂMPSIA GRAVE / SULFATO DE MAGNÉSIO:',
      '----------------------------------------------------------------------',
      'OPÇÃO 1 — ESQUEMA DE ZUSPAN (Padrão Ouro IV em Bomba de Infusão):',
      '1. ATAQUE: MgSO4 50% 8 mL (4g) + SG 5% ou AD 12 mL = 20 mL IV em 20 minutos.',
      '2. MANUTENÇÃO: MgSO4 50% 20 mL (10g) + SF 0,9% 480 mL = 500 mL IV em BIC a 50 mL/h (fornece 1g/h). Manter por 24h pós-parto.',
      '',
      'OPÇÃO 2 — ESQUEMA DE PRITCHARD (Sem Bomba / Transporte / Ambulância):',
      '1. ATAQUE: MgSO4 50% 8 mL (4g) + AD 12 mL = 20 mL IV em 20 min CONCOMITANTE A MgSO4 50% 20 mL (10g) IM profundo (5g / 10 mL em cada glúteo com 1 mL lidocaína 2%).',
      '2. MANUTENÇÃO: MgSO4 50% 10 mL (5g) + 1 mL lidocaína 2% IM profundo 4/4h no glúteo contralateral alternado.',
      '----------------------------------------------------------------------',
      'VIGILÂNCIA HORÁRIA MANDATÓRIA (SVD):',
      '• Reflexo patelar presente a cada 1h (suspender se ausente).',
      '• FR >= 16 irpm horária (suspender se < 16 irpm).',
      '• Diurese >= 25 mL/h em sonda vesical de demora.',
      '----------------------------------------------------------------------',
      'ANTÍDOTO BEIRA-LEITO (SOS):',
      '• Gluconato de Cálcio 10% 1 ampola (10 mL = 1g) IV em bolus lento de 3 a 5 min se arreflexia, FR < 16 irpm ou parada respiratória.'
    ].join('\n');

    return {
      sucesso: true,
      classificacao: classificacao,
      ehIminencia: ehIminencia,
      ehEclampsia: ehEclampsia,
      pas: pas,
      pad: pad,
      esquemaSelecionado: mg.esquema,
      sulfatoMagnesio: mg,
      esquemaZuspan: mgZuspan.prescricao,
      esquemaPritchard: mgPritchard.prescricao,
      esquemas: {
        zuspan: mgZuspan,
        pritchard: mgPritchard
      },
      criseHipertensiva: crise,
      condutas: condutas,
      prescricaoPep: prescricaoPepTexto,
      checklistVigilancia: {
        patelar: 'Reflexo patelar presente a cada 1 hora (suspender se ausente)',
        frequenciaRespiratoria: 'FR >= 16 irpm (suspender se < 16 irpm)',
        diurese: 'Diurese >= 25 mL/h em sonda vesical de demora fechada',
        antidoto: 'Gluconato de Cálcio 10% 10 mL IV em bolus lento de 3 a 5 minutos'
      },
      antidoto: {
        droga: 'Gluconato de Cálcio 10%',
        dose: '10 mL (= 1g) IV em bolus lento de 3 a 5 minutos beira-leito',
        indicacao: 'Sinais clínicos de intoxicação por MgSO4 (arreflexia patelar, FR < 16 irpm ou parada respiratória)'
      },
      rotinaVigilancia: mg.rotinaVigilancia
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. PROTOCOLO DE HEMORRAGIA PÓS-PARTO (HPP - REGRA DOS 4 Ts)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avalia sangramento puerperal, calcula Índice de Choque (FC/PAS) e emite
   * sequenciamento escalonado de uterotônicos com bloqueio estrito de Ergotrate na HAS.
   */
  function gerenciarHemorragiaPosParto(dados) {
    dados = dados || {};
    var perdaMl = Number(dados.perdaEstimadaMl) || 0;
    var tipoParto = String(dados.tipoParto || 'vaginal').toLowerCase();
    var fc = Number(dados.fc);
    var pas = Number(dados.pas);
    var tempoDesdePartoMin = Number(dados.tempoDesdePartoMin) || 0;
    var temHas = Boolean(dados.temHipertensao || dados.preeclampsia);

    // 1. Diagnóstico de HPP
    var corteHpp = tipoParto === 'cesariana' ? 1000 : 500;
    var ehHpp = perdaMl >= corteHpp;

    // 2. Índice de Choque (Shock Index = FC / PAS)
    var indiceChoque = null;
    var gravidadeChoque = 'NORMAL';
    var alertaChoque = null;

    if (!isNaN(fc) && fc > 0 && !isNaN(pas) && pas > 0) {
      indiceChoque = Math.round((fc / pas) * 100) / 100;
      if (indiceChoque >= 1.4) {
        gravidadeChoque = 'CHOQUE_GRAVE';
        alertaChoque = '⛔ ÍNDICE DE CHOQUE >= 1.4 (CHOQUE GRAVE / RISCO IMINENTE DE MORTE): Ativar protocolo de transfusão maciça (concentrado de hemácias, plasma e plaquetas 1:1:1), acionar UTI, anestesia e sala cirúrgica imediatamente!';
      } else if (indiceChoque >= 0.9) {
        gravidadeChoque = 'CHOQUE_MODERADO';
        alertaChoque = '🚨 ÍNDICE DE CHOQUE >= 0.9 (CHOQUE COMPENSADO / ALERTA HEMORRÁGICO): Perda volêmica expressiva superior a 20-30% da volemia. Iniciar infusão rápida de cristaloides aquecidos, solicitar tipagem, provas cruzadas e hemograma urgente.';
      } else {
        gravidadeChoque = 'ESTAVEL';
      }
    }

    // 3. Regra dos 4 Ts (Etiologia)
    var quatroTs = [
      {
        letra: 'TÔNUS (70% das causas)',
        causa: 'Atonia Uterina',
        sinais: 'Útero amolecido, hipotônico e palpável acima da cicatriz umbilical após a saída da placenta.',
        condutaPrimaria: 'Massagem uterina bimanual de Hamilton contínua + Sequenciamento uterotônico rápido.'
      },
      {
        letra: 'TRAUMA (20% das causas)',
        causa: 'Lacerações de Canal de Parto, Hematomas ou Rotura Uterina',
        sinais: 'Útero bem contraído com sangramento vermelho vivo contínuo e profuso. Revisão de trajeto com valvas.',
        condutaPrimaria: 'Sutura imediata de lacerações de colo/vagina/períneo sob boa iluminação; laparotomia se suspeita de rotura uterina.'
      },
      {
        letra: 'TECIDO (10% das causas)',
        causa: 'Retenção Placentária ou Acretismo Placentário',
        sinais: 'Placenta incompleta à inspeção pós-parto, cotilédones retidos ou ausência de dequitação em > 30 minutos.',
        condutaPrimaria: 'Curetagem uterina suave ou aspiração manual intrauterina (AMIU); preparo cirúrgico se acretismo.'
      },
      {
        letra: 'TROMBINA (1% das causas)',
        causa: 'Coagulopatia Congênita ou Adquirida (CIVD pós-DPP, Sepse ou Síndrome HELLP)',
        sinais: 'Sangue incoagulável nos acessos, hematúria, sangramento gengival e petéquias.',
        condutaPrimaria: 'Reposição de fatores de coagulação (Plasma Fresco Congelado, Crioprecipitado se fibrinogênio < 150-200 mg/dL, Concentrado de Complexo Protrombínico) e Ácido Tranexâmico.'
      }
    ];

    // 4. Sequenciamento Farmacológico Uterotônico Escalonado (Algoritmo FEBRASGO / OMS)
    var sequenciaUterotonica = [];

    // Passo 1: Ocitocina
    sequenciaUterotonica.push({
      etapa: 1,
      farmaco: 'Ocitocina IV (1ª Linha Obrigatória)',
      dose: '20 a 40 UI em 500 mL de SF 0,9% ou Ringer Lactato a 250 mL/h IV contínua (infusão rápida).',
      nota: '⚠️ NUNCA aplicar ocitocina pura em bolus IV rápido (risco de vasodilatação súbita, hipotensão letal e colapso circulatório).'
    });

    // TXA é adjuvante da resposta inicial; não aguardar falha dos uterotônicos.
    var oportunoTransamin = tempoDesdePartoMin <= 180;
    sequenciaUterotonica.push({
      etapa: 4,
      farmaco: 'Ácido Tranexâmico 1g IV (adjuvante precoce)',
      dose: oportunoTransamin ? '1 g IV em 10 minutos, iniciar em até 3 horas do parto; repetir 1 g se persistir após 30 minutos ou recidivar em 24 horas.' : 'Não iniciar rotineiramente após 3 horas do parto: benefício não demonstrado.',
      nota: oportunoTransamin ? 'Administrar em até 3 horas do parto, junto da resposta inicial à HPP.' : 'Após 3 horas do parto, benefício não demonstrado.',
      bloqueado: !oportunoTransamin
    });

    // Passo 3: Metilergometrina (Ergotrate)
    if (temHas) {
      sequenciaUterotonica.push({
        etapa: 2,
        farmaco: 'Metilergometrina (Ergotrate) — BLOQUEADO / CONTRAINDICADO',
        bloqueado: true,
        motivoBloqueio: '⛔ CONTRAINDICAÇÃO ABSOLUTA: Paciente hipertensa (Pré-eclâmpsia, HAS ou Cardiopatia). A ergotamina causa vasoconstritor potente, crise hipertensiva severa e AVC. PULAR IMEDIATAMENTE PARA O MISOPROSTOL.',
        dose: 'CONTRAINDICADO'
      });
    } else {
      sequenciaUterotonica.push({
        etapa: 2,
        farmaco: 'Metilergometrina 0,2 mg IM (2ª Linha)',
        dose: '0,2 mg via Intramuscular profunda (1 ampola). Pode repetir após 20 minutos se necessário (máx 5 doses no puerpério).',
        nota: 'Contraindicado absolutamente se houver qualquer histórico de hipertensão ou pré-eclâmpsia.'
      });
    }

    // Passo 4: Misoprostol
    sequenciaUterotonica.push({
      etapa: 3,
      farmaco: 'Misoprostol 800 mcg (3ª Linha)',
      dose: '800 mcg (4 comprimidos de 200 mcg) via Retal ou Sublingual.',
      nota: 'Absorção rápida e potente tônus miometrial mantido por várias horas.'
    });

    // 5. Medidas Não Farmacológicas e Cirúrgicas de Resgate
    var medidasResgate = [
      'Manobra de Hamilton (Massagem uterina bimanual contínua): uma mão no fundo uterino via abdominal e a outra fechada no fundo de saco anterior comprimindo o miométrio.',
      'Sondagem vesical de demora para alívio imediato (a bexiga cheia impede mecanicamente a contração uterina fisiológica).',
      'Traje Antichoque Não Pneumático (TANP): reduz o fluxo sanguíneo pélvico e redireciona até 30% da volemia para circulação central durante transporte/estabilização.',
      'Balão de Tamponamento Intrauterino (Balão de Bakri ou artesanal tipo sonda de Foley + preservativo insuflado com 300 a 500 mL de soro morno): tamponamento hidrostático por até 24 horas.',
      'Suturas compressivas uterinas de hemostasia (Sutura de B-Lynch, Hayman ou Cho).',
      'Histerectomia Puerperal de Resgate: medida definitiva salvadora de vida se falha de todas as intervenções anteriores.'
    ];

    return {
      ehHpp: ehHpp,
      perdaEstimadaMl: perdaMl,
      tipoParto: tipoParto,
      indiceChoque: indiceChoque,
      gravidadeChoque: gravidadeChoque,
      alertaChoque: alertaChoque,
      quatroTs: quatroTs,
      sequenciaUterotonica: sequenciaUterotonica,
      primeiraHoraPep: [
        'HPP — PRIMEIRA HORA: chamar equipe, quantificar perda, 2 acessos calibrosos, cristaloide aquecido, hemograma/coagulograma e reserva de hemocomponentes; massagear útero e revisar 4Ts.',
        'Ocitocina 20 a 40 UI em 500 mL de SF 0,9%/Ringer lactato IV em infusão; não fazer bolus IV rápido.',
        oportunoTransamin ? 'Administrar Ácido Tranexâmico 1 g IV em 10 minutos, até 3 horas do parto; repetir 1 g se persistir após 30 minutos ou recidivar em 24 horas.' : 'Ácido Tranexâmico: após 3 horas do parto, não iniciar rotineiramente; benefício não demonstrado.',
        temHas ? 'Metilergometrina CONTRAINDICADA em hipertensão/pré-eclâmpsia.' : 'Metilergometrina 0,2 mg IM se atonia persistente e sem hipertensão.',
        'Misoprostol 800 mcg por via retal ou sublingual se atonia persistente; escalar tamponamento/cirurgia sem atraso.'
      ].join('\n'),
      medidasResgate: medidasResgate
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. PROFILAXIA INTRAPARTO PARA SEPSE NEONATAL POR GBS (STREPTOCOCCUS AGALACTIAE)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avalia a indicação estrita e seleciona o regime antibiótico profilático adequado
   * para sepse neonatal precoce por Streptococcus agalactiae (GBS).
   */
  function avaliarProfilaxiaGbs(dados) {
    dados = dados || {};
    var cultura = String(dados.culturaGbs || 'desconhecida').toLowerCase();
    var bacteriuria = Boolean(dados.bacteriuriaGbs);
    var filhoPrevio = Boolean(dados.filhoPrevioDoencaInvasiva);
    var igSemanas = Number(dados.igSemanas);
    var bolsaRotaHoras = Number(dados.bolsaRotaHoras) || 0;
    var taxMaterna = Number(dados.taxaMaterna);
    var cesarianaEletivaSemTrabalho = Boolean(dados.cesarianaEletivaSemTrabalhoPartoBolsaIntegra);
    var alergiaPenicilina = Boolean(dados.alergiaPenicilina);
    var tipoAlergia = String(dados.tipoAlergiaPenicilina || 'leve').toLowerCase(); // 'leve' ou 'anafilaxia'/'grave'
    var sensivelClinda = dados.sensibilidadeClindamicina; // boolean ou null

    // 1. Regra de Exclusão: Cesariana eletiva antes do trabalho de parto e bolsa íntegra
    if (cesarianaEletivaSemTrabalho) {
      return {
        indicada: false,
        motivo: 'NÃO INDICADA PROFILAXIA: Cesariana eletiva agendada antes do início do trabalho de parto com membranas ovulares íntegras (risco de transmissão vertical é insignificante, mesmo que a cultura para GBS seja positiva).',
        esquemaRecomendado: null
      };
    }

    // 2. Avaliação de Indicações Formais
    var indicada = false;
    var motivosIndicacao = [];

    if (cultura.includes('positi')) {
      indicada = true;
      motivosIndicacao.push('Cultura de rastreio anovaginal POSITIVA para Streptococcus agalactiae (GBS) coletada entre 35 e 37 semanas.');
    }

    if (bacteriuria) {
      indicada = true;
      motivosIndicacao.push('Bacteriúria por GBS na gestação atual (indica alta colonização materna, independentemente do tratamento já realizado na infecção urinária).');
    }

    if (filhoPrevio) {
      indicada = true;
      motivosIndicacao.push('História de recém-nascido anterior com doença invasiva por GBS (sepse neonatal, pneumonia ou meningite).');
    }

    // Critérios de Risco se Cultura Desconhecida / Não Realizada
    if (!cultura.includes('positi') && !cultura.includes('negati')) {
      if (!isNaN(igSemanas) && igSemanas < 37) {
        indicada = true;
        motivosIndicacao.push('Trabalho de parto prematuro (< 37 semanas) com status de GBS desconhecido.');
      }
      if (bolsaRotaHoras >= 18) {
        indicada = true;
        motivosIndicacao.push('Ruptura prematura de membranas ovulares (bolsa rota) >= 18 horas com status de GBS desconhecido.');
      }
      if (!isNaN(taxMaterna) && taxMaterna >= 38.0) {
        indicada = true;
        motivosIndicacao.push('Febre materna intraparto (Temperatura axilar >= 38,0 ºC) — suspeita de corioamnionite materna.');
      }
    }

    // Se cultura comprovadamente negativa nas últimas 5 semanas e sem febre
    if (cultura.includes('negati') && (!taxMaterna || taxMaterna < 38.0) && !filhoPrevio && !bacteriuria) {
      return {
        indicada: false,
        motivo: 'NÃO INDICADA: Cultura de rastreio anovaginal para GBS realizada nas últimas 5 semanas NEGATIVA, sem critérios de febre intraparto.',
        esquemaRecomendado: null
      };
    }

    if (!indicada) {
      return {
        indicada: false,
        motivo: 'NÃO INDICADA: Ausência de fatores de risco formais para sepse neonatal precoce por GBS.',
        esquemaRecomendado: null
      };
    }

    // 3. Seleção do Esquema Antibiótico Profilático
    var esquema = {};

    if (!alergiaPenicilina) {
      // 1ª Linha: Penicilina Cristalina
      esquema = {
        opcaoPrincipal: {
          farmaco: 'Penicilina G Cristalina IV (1ª Escolha — Padrão Ouro CDC/FEBRASGO)',
          doseAtaque: '5.000.000 UI IV em infusão lenta.',
          doseManutencao: '2.500.000 UI IV a cada 4 horas até o clampeamento do cordão / parto.',
          criterioEficacia: 'A profilaxia é considerada COMPLETA e altamente eficaz quando iniciada pelo menos 4 HORAS ANTES do nascimento.'
        },
        opcaoAlternativa: {
          farmaco: 'Ampicilina IV (Alternativa aceita de 1ª linha)',
          doseAtaque: '2 g IV em bolus lento.',
          doseManutencao: '1 g IV a cada 4 horas até o nascimento.'
        }
      };
    } else {
      // Paciente Alérgica à Penicilina
      var ehAnafilaxia = tipoAlergia.includes('anafil') || tipoAlergia.includes('grave') || tipoAlergia.includes('choque') || tipoAlergia.includes('angioedema');

      if (!ehAnafilaxia) {
        // Baixo risco de anafilaxia (apenas exantema máculo-papular não urticariforme)
        esquema = {
          opcaoPrincipal: {
            farmaco: 'Cefazolina IV (Alérgica à penicilina sem histórico de anafilaxia)',
            doseAtaque: '2 g IV em dose única de ataque.',
            doseManutencao: '1 g IV a cada 8 horas até o parto.'
          }
        };
      } else {
        // Alto risco de anafilaxia (urticária precoce, broncoespasmo, anafilaxia)
        if (sensivelClinda === true) {
          esquema = {
            opcaoPrincipal: {
              farmaco: 'Clindamicina IV (Alérgica grave com GBS sensível à clindamicina em antibiograma)',
              doseAtaque: '900 mg IV.',
              doseManutencao: '900 mg IV a cada 8 horas até o nascimento.'
            }
          };
        } else {
          esquema = {
            opcaoPrincipal: {
              farmaco: 'Vancomicina IV (Alérgica grave à penicilina com resistência à clindamicina ou antibiograma desconhecido)',
              doseAtaque: '20 mg/kg IV (máximo 2 g por infusão).',
              doseManutencao: '20 mg/kg IV a cada 8 horas até o nascimento (infundir em pelo menos 1 a 2 horas para evitar Síndrome do Homem Vermelho).'
            }
          };
        }
      }
    }

    return {
      indicada: true,
      motivosIndicacao: motivosIndicacao,
      alergiaPenicilina: alergiaPenicilina,
      tipoAlergiaPenicilina: tipoAlergia,
      esquemaRecomendado: esquema
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. PREMATURIDADE, RPMO, CORTICOTERAPIA E NEUROPROTEÇÃO FETAL
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avalia ameaça de parto prematuro, ruptura prematura de membranas (RPMO),
   * indica esquema de maturação pulmonar, neuroproteção e latência antimicrobiana.
   */
  function protocoloPrematuridadeRpmo(dados) {
    dados = dados || {};
    var igSemanas = Number(dados.igSemanas) || 0;
    var igDias = Number(dados.igDias) || 0;
    var ameacaParto = Boolean(dados.ameacaPartoIminente);
    var rpm = Boolean(dados.rpmConfirmada);
    var sinaisInfeccao = Boolean(dados.sinaisCorioamnionite); // febre, taquicardia fetal, útero doloroso, líquido fétido

    var condutas = [];
    var corticoterapia = null;
    var neuroprotecao = null;
    var tocolise = null;
    var latenciaRpmo = null;

    // 1. Alerta Crítico: Corioamnionite
    if (sinaisInfeccao) {
      return {
        corioamnioniteDetectada: true,
        alertaCritico: '🚨 DIAGNÓSTICO DE CORIOAMNIONITE (Infecção Intra-amniótica): Interromper imediatamente qualquer tentativa de tocólise! A infecção intrauterina é indicação de INTERRUPÇÃO IMEDIATA DA GESTAÇÃO.',
        antibioticoterapiaTerapeutica: [
          'Ampicilina 2 g IV a cada 6 horas + Gentamicina 5 mg/kg IV uma vez ao dia (ou 1,5 mg/kg a cada 8h).',
          'Associar Clindamicina 900 mg IV 8/8h ou Metronidazol 500 mg IV 8/8h se parto por cesariana para cobertura de anaeróbios.'
        ],
        resolucaoParto: 'Agilizar o nascimento independentemente da idade gestacional. Preferir parto vaginal se condições obstétricas favoráveis e BCF tranquilizador; caso contrário, cesariana de urgência.'
      };
    }

    // 2. Corticoterapia Antenatal para Maturação Pulmonar Fetal
    // Indicada formalmente entre 24s0d e 33s6d (e em casos selecionados até 36s6d se sem ciclo prévio)
    if (igSemanas >= 24 && igSemanas < 34) {
      corticoterapia = {
        indicada: true,
        objetivo: 'Reduz a Síndrome do Desconforto Respiratório do RN (doença da membrana hialina), hemorragia intraventricular grave e enterocolite necrosante neonatal.',
        esquemaPrimeiraLinha: {
          farmaco: 'Betametasona IM (1ª Linha Padrão Ouro)',
          dose: '12 mg via Intramuscular a cada 24 horas — total de 2 doses.'
        },
        esquemaAlternativo: {
          farmaco: 'Dexametasona IM (Alternativa)',
          dose: '6 mg via Intramuscular a cada 12 horas — total de 4 doses.'
        },
        beneficioMaximo: 'O maior benefício ocorre entre 24 horas e 7 dias após a primeira dose.'
      };
      condutas.push('Iniciar Corticoterapia Antenatal imediatamente.');
    }

    // 3. Neuroproteção Fetal com Sulfato de Magnésio
    // Indicada formalmente se IG < 32 semanas (24s0d a 31s6d) e parto iminente nas próximas 24h
    if (igSemanas >= 24 && igSemanas < 32 && ameacaParto) {
      neuroprotecao = {
        indicada: true,
        objetivo: 'Reduz significativamente o risco de Paralisia Cerebral e déficits motores graves na infância em prematuros extremos.',
        esquema: prescreverSulfatoMagnesio({ esquema: 'Neuroprotecao' }).prescricao
      };
      condutas.push('Iniciar Sulfato de Magnésio para Neuroproteção Fetal (IG < 32 semanas).');
    }

    // 4. Tocólise (Inibição do Trabalho de Parto Prematuro)
    // Objetivo de adiar o parto por 48h para permitir a ação completa da corticoterapia e transferência para centro com UTI Neo
    if (igSemanas >= 24 && igSemanas < 34 && ameacaParto && !rpm) {
      tocolise = {
        indicada: true,
        objetivo: 'Postergar o parto em até 48 horas para completar o ciclo da betametasona e transporte seguro.',
        contraindicacoes: 'Morte fetal intrauterina, anomalia fetal letal, sofrimento fetal agudo, descolamento prematuro de placenta, pré-eclâmpsia com sinais de gravidade/eclâmpsia, instabilidade hemodinâmica materna.',
        primeiraEscolha: {
          farmaco: 'Nifedipino VO (Bloqueador de Canal de Cálcio)',
          ataque: '20 mg via oral deglutido inteiro. Se mantiver contrações após 20 minutos, repetir 10 a 20 mg a cada 20 min até dose máxima de 40 mg na 1ª hora.',
          manutencao: '10 a 20 mg VO a cada 4 a 6 horas por no máximo 48 horas.'
        },
        alternativa: {
          farmaco: 'Atosiban IV (Antagonista do Receptor de Ocitocina)',
          posologia: 'Bolus IV de 6,75 mg em 1 minuto; seguido de infusão contínua de 300 mcg/min por 3 horas, depois 100 mcg/min por até 45 horas.'
        }
      };
      condutas.push('Iniciar Tocólise por até 48 horas (Nifedipino de escolha).');
    }

    // 5. RPMO < 34 semanas — Protocolo de Latência Antimicrobiana (ACOG / Mercer)
    if (rpm && igSemanas >= 24 && igSemanas < 34) {
      latenciaRpmo = {
        indicada: true,
        objetivo: 'Prolonga o período de latência até o parto, reduz corioamnionite materna e diminui morbidade neonatal infecciosa.',
        fase1_primeiras48h: [
          'Ampicilina 2 g IV a cada 6 horas por 48 horas.',
          'Azitromicina 1 g VO em dose única na admissão (ou Eritromicina 250 mg IV 6/6h).'
        ],
        fase2_proximos5dias: [
          'Amoxicilina 500 mg VO a cada 8 horas por mais 5 dias (completando 7 dias de terapia).'
        ],
        nota: 'NÃO utilizar Amoxicilina + Clavulanato na RPMO (associado a aumento de risco de enterocolite necrosante neonatal).'
      };
      condutas.push('Iniciar Protocolo de Latência Antimicrobiana para RPMO.');
    }

    if (ameacaParto || rpm) {
      condutas.push('Checar cultura anovaginal/GBS. Se parto prematuro com GBS desconhecido ou positivo, indicar profilaxia intraparto (penicilina G cristalina conforme protocolo de GBS); antibiótico de latência da RPMO não dispensa reavaliação intraparto.');
    }

    return {
      corioamnioniteDetectada: false,
      igSemanas: igSemanas,
      igDias: igDias,
      corticoterapia: corticoterapia,
      neuroprotecao: neuroprotecao,
      tocolise: tocolise,
      latenciaRpmo: latenciaRpmo,
      condutasGerais: condutas
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. RESUMO CLÍNICO UNIFICADO DO CENTRO OBSTÉTRICO
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Consolida todos os achados em um relatório estruturado e conduta médica
   * imediata para visualização no Cockpit PWA ou envio no Bot Telegram.
   */
  function gerarResumoCentroObstetrico(cenario) {
    cenario = cenario || {};
    var linhas = [];
    linhas.push('⚠️ *MÓDULO DE REFERÊNCIA AVANÇADA* — A conduta definitiva requer especialista. O generalista deve reconhecer, estabilizar e encaminhar.');
    linhas.push('');
    linhas.push('======================================================================');
    linhas.push('🏥 CONDUTA DE CENTRO OBSTÉTRICO & SALA DE PARTO · ULTRA ROTINA');
    linhas.push('======================================================================');

    // 1. Trabalho de Parto
    var parto = avaliarTrabalhoParto(cenario.parto);
    linhas.push('📌 DIAGNÓSTICO DO TRABALHO DE PARTO:');
    linhas.push('  • Fase Clínica: ' + parto.faseDescricao);
    linhas.push('  • Dilatação: ' + parto.dilatacaoCm + ' cm | Contrações: ' + parto.contracoes10min + '/10 min (' + parto.duracaoContracaoSeg + 's)');
    linhas.push('  • Altura de De Lee: ' + parto.deLeeInfo);
    if (parto.bcf) {
      linhas.push('  • Frequência Cardíaca Fetal: ' + parto.bcf + ' bpm (' + parto.bcfStatus + ')');
    }
    if (parto.bcfAlerta) {
      linhas.push('  ' + parto.bcfAlerta);
    }
    if (parto.bolsaAlerta) {
      linhas.push('  ' + parto.bolsaAlerta);
    }
    linhas.push('  • Índice de Bishop: ' + parto.bishop.pontos + ' pontos (' + (parto.bishop.favoravel ? 'Favorável' : 'Desfavorável/Imaturo') + ')');
    linhas.push('    -> ' + parto.bishop.condutaInducao);

    // 2. Pressão Arterial & Pré-Eclâmpsia
    if (cenario.has) {
      linhas.push('----------------------------------------------------------------------');
      linhas.push('🩺 PRESSÃO ARTERIAL & PRÉ-ECLÂMPSIA:');
      var hasRes = manejarCriseHipertensiva(cenario.has);
      if (hasRes.ehCrise) {
        linhas.push('  🚨 ' + hasRes.classificacao + ' (PA: ' + hasRes.pas + 'x' + hasRes.pad + ' mmHg)');
        for (var c = 0; c < hasRes.condutas.length; c++) {
          linhas.push('  • ' + hasRes.condutas[c]);
        }
        linhas.push('  💊 FARMACOTERAPIA DE RESGATE:');
        for (var m = 0; m < hasRes.medicacoes.length; m++) {
          linhas.push('  - ' + hasRes.medicacoes[m].farmaco + ': ' + hasRes.medicacoes[m].posologia);
        }
      } else {
        linhas.push('  • Status Pressórico: PA ' + hasRes.pas + 'x' + hasRes.pad + ' mmHg (' + hasRes.classificacao + ')');
      }

      // Sulfato de Magnésio
      if (cenario.has.prescreverMgso4 || hasRes.ehCrise) {
        var mg = prescreverSulfatoMagnesio(cenario.has.mgso4Params);
        linhas.push('  💉 PROTOCOLO DE SULFATO DE MAGNÉSIO (' + mg.esquema + '):');
        linhas.push('  - Ataque: ' + mg.prescricao.ataque[0]);
        if (mg.prescricao.ataque[1]) {
          linhas.push('    ' + mg.prescricao.ataque[1]);
        }
        linhas.push('  - Manutenção: ' + mg.prescricao.manutencao[0]);
        linhas.push('  - Checklist de Vigilância: Patelar +, FR >= 16 irpm, Diurese >= 25 mL/h.');
        linhas.push('  - Antídoto Beira-Leito: Gluconato de Cálcio 10% 10 mL IV lento se toxicidade.');
        if (mg.intoxicacaoDetectada) {
          linhas.push('  ⛔ ALERTA DE INTOXICAÇÃO DETECTADA:');
          for (var ai = 0; ai < mg.alertasIntoxicacao.length; ai++) {
            linhas.push('    ' + mg.alertasIntoxicacao[ai]);
          }
          linhas.push('    -> ' + mg.condutaIntoxicacao.antidoto);
        }
      }
    }

    // 3. Hemorragia Pós-Parto
    if (cenario.hpp) {
      linhas.push('----------------------------------------------------------------------');
      linhas.push('🩸 PROTOCOLO DE HEMORRAGIA PÓS-PARTO (HPP):');
      var hppRes = gerenciarHemorragiaPosParto(cenario.hpp);
      linhas.push('  • Perda Estimada: ' + hppRes.perdaEstimadaMl + ' mL (' + hppRes.tipoParto + ')');
      if (hppRes.indiceChoque) {
        linhas.push('  • Índice de Choque (FC/PAS): ' + hppRes.indiceChoque + ' (' + hppRes.gravidadeChoque + ')');
      }
      if (hppRes.alertaChoque) {
        linhas.push('  ' + hppRes.alertaChoque);
      }
      linhas.push(hppRes.primeiraHoraPep);
      linhas.push('  💊 SEQUENCIAMENTO UTEROTÔNICO ESCALONADO:');
      for (var u = 0; u < hppRes.sequenciaUterotonica.length; u++) {
        var ut = hppRes.sequenciaUterotonica[u];
        if (ut.bloqueado) {
          linhas.push('  - Etapa ' + ut.etapa + ': ' + ut.farmaco + ' -> ' + ut.motivoBloqueio);
        } else {
          linhas.push('  - Etapa ' + ut.etapa + ': ' + ut.farmaco + ' (' + ut.dose + ')');
        }
      }
    }

    // 4. Profilaxia GBS
    if (cenario.gbs) {
      linhas.push('----------------------------------------------------------------------');
      linhas.push('🔬 PROFILAXIA PARA SEPSE POR GBS:');
      var gbsRes = avaliarProfilaxiaGbs(cenario.gbs);
      if (gbsRes.indicada) {
        linhas.push('  ✅ PROFILAXIA INDICADA:');
        for (var g = 0; g < gbsRes.motivosIndicacao.length; g++) {
          linhas.push('  • ' + gbsRes.motivosIndicacao[g]);
        }
        if (gbsRes.esquemaRecomendado && gbsRes.esquemaRecomendado.opcaoPrincipal) {
          linhas.push('  💊 ESQUEMA: ' + gbsRes.esquemaRecomendado.opcaoPrincipal.farmaco);
          linhas.push('    - Ataque: ' + gbsRes.esquemaRecomendado.opcaoPrincipal.doseAtaque);
          linhas.push('    - Manutenção: ' + gbsRes.esquemaRecomendado.opcaoPrincipal.doseManutencao);
        }
      } else {
        linhas.push('  ❌ ' + gbsRes.motivo);
      }
    }

    // 5. Prematuridade & RPMO
    if (cenario.prematuridade) {
      linhas.push('----------------------------------------------------------------------');
      linhas.push('👶 PREMATURIDADE & RPMO:');
      var premRes = protocoloPrematuridadeRpmo(cenario.prematuridade);
      if (premRes.corioamnioniteDetectada) {
        linhas.push('  ' + premRes.alertaCritico);
      } else {
        linhas.push('  • IG: ' + premRes.igSemanas + ' semanas e ' + premRes.igDias + ' dias');
        if (premRes.corticoterapia && premRes.corticoterapia.indicada) {
          linhas.push('  💉 Corticoterapia Pulmonar: ' + premRes.corticoterapia.esquemaPrimeiraLinha.farmaco + ' (' + premRes.corticoterapia.esquemaPrimeiraLinha.dose + ')');
        }
        if (premRes.neuroprotecao && premRes.neuroprotecao.indicada) {
          linhas.push('  🧠 Neuroproteção Fetal com MgSO4: INDICADA (< 32 semanas)');
        }
        if (premRes.tocolise && premRes.tocolise.indicada) {
          linhas.push('  🛑 Tocólise Aguda por 48h: ' + premRes.tocolise.primeiraEscolha.farmaco + ' (' + premRes.tocolise.primeiraEscolha.ataque + ')');
        }
        if (premRes.latenciaRpmo && premRes.latenciaRpmo.indicada) {
          linhas.push('  🛡️ Latência RPMO: ' + premRes.latenciaRpmo.fase1_primeiras48h[0] + ' + ' + premRes.latenciaRpmo.fase1_primeiras48h[1]);
        }
        premRes.condutasGerais.filter(function (item) { return item.indexOf('GBS') !== -1; }).forEach(function (item) { linhas.push('  🔬 ' + item); });
      }
    }

    linhas.push('======================================================================');

    return {
      sucesso: true,
      textoFormatado: linhas.join('\n'),
      parto: parto
    };
  }

  return {
    avaliarTrabalhoParto: avaliarTrabalhoParto,
    calcularIndiceBishop: calcularIndiceBishopInternal,
    prescreverSulfatoMagnesio: prescreverSulfatoMagnesio,
    manejarCriseHipertensiva: manejarCriseHipertensiva,
    manejarPreEclampsiaGrave: manejarPreEclampsiaGrave,
    gerenciarHemorragiaPosParto: gerenciarHemorragiaPosParto,
    avaliarProfilaxiaGbs: avaliarProfilaxiaGbs,
    protocoloPrematuridadeRpmo: protocoloPrematuridadeRpmo,
    gerarResumoCentroObstetrico: gerarResumoCentroObstetrico
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CentroObstetricoService;
}
