/**
 * ==============================================================================
 * ULTRA ROTINA - MÓDULO DE OBSTETRÍCIA & REUMATOLOGIA
 * ==============================================================================
 * Manejo Clínico da Síndrome do Anticorpo Antifosfolipídio (SAF) e
 * Trombofilias na Gestação
 * Diretrizes: Sydney (Miyakis 2006), ACR/EULAR (2023), RCOG Green-top 37a,
 * ACOG Practice Bulletin 197/132, ASH (2018/2023) e FEBRASGO (2023-2026).
 * 
 * PILARES CLÍNICOS DETERMINÍSTICOS:
 * 1. Critérios Diagnósticos de SAF (Sydney / ACR-EULAR 2023):
 *    - Pelo menos 1 Critério Clínico (Obstétrico ou Trombótico) +
 *    - Pelo menos 1 Critério Laboratorial confirmado em ≥ 2 ocasiões com
 *      intervalo mínimo de 12 semanas (84 dias):
 *      * Anticoagulante Lúpico (LAC) positivo (maior risco trombótico/obstétrico)
 *      * Anticorpo Anticardiolipina (aCL) IgG ou IgM em títulos médios/altos (> 40 GPL/MPL)
 *      * Anticorpo Anti-beta-2-glicoproteína I (anti-β2GPI) IgG ou IgM (> p99)
 *      * Tripla Positividade (LAC + aCL + anti-β2GPI): altíssimo risco trombótico e obstétrico.
 * 2. Estratificação Fenotípica Gestacional:
 *    - SAF Obstétrica Pura (perdas gestacionais ou prematuridade por PE/insuficiência placentária):
 *      AAS 100-150 mg/dia pré-concepção + Enoxaparina profilática SC desde teste positivo + 6 semanas puerpério.
 *    - SAF Trombótica (histórico de TEV arterial/venoso documentado):
 *      HBPM terapêutica (Enoxaparina 1 mg/kg SC 12/12h) + AAS 100-150 mg/dia + 6 semanas puerpério.
 *    - SAF Obstétrica Refratária (perdas gestacionais em vigência de AAS + HBPM):
 *      Escalonamento para dose plena/intermediária + Adição de Hidroxicloroquina (HCQ) 200-400 mg/dia.
 *    - Portadora Assintomática de aPL / Rastreio Incidental:
 *      AAS 100 mg/dia para prevenção de pré-eclâmpsia; profilaxia no puerpério se tripla positividade.
 *    - Trombofilias Hereditárias (Alto Risco: Déficit AT-III, FVL homozigoto, Protrombina homozigoto, Duplo hetero;
 *      Baixo Risco: FVL hetero, Protrombina hetero, Déficit Proteína C/S).
 *    - Desmistificação do MTHFR: NÃO é trombofilia com indicação de HBPM nem de anticoagulação.
 * 3. Protocolo Rígido de Periparto e Intervalos de Anestesia Neuroaxial (SOAP / ASRA):
 *    - HBPM profilática (40 mg/dia): suspender pelo menos 12 HORAS antes da punção ou parto programado.
 *    - HBPM terapêutica (1 mg/kg 12/12h): suspender pelo menos 24 HORAS antes da punção ou parto programado.
 *    - Reinício pós-parto: profilática em 6-12h; terapêutica em ≥ 24h após parto e remoção do cateter.
 *    - Remoção do cateter peridural: ≥ 12h da última dose profilática; próxima dose após ≥ 4h.
 * 4. Bloqueios de Segurança Farmacológica:
 *    - DOACs (rivaroxabana, apixabana, etc.): CONTRAINDICADOS na gestação e lactação.
 *    - Varfarina: CONTRAINDICADA no 1º trimestre (6 a 12 semanas) por embriopatia teratogênica.
 *    - AINEs: CONTRAINDICADOS no 3º trimestre (fechamento prematuro do canal arterial).
 *    - Suplementação de Cálcio e Vitamina D em uso crônico de heparina para prevenção de osteopenia.
 * ==============================================================================
 */

var ObstetriciaSafService = (function () {
  'use strict';

  // ───────────────────────────────────────────────────────────────────────────
  // 1. DIRETRIZES E REFERÊNCIAS CLÍNICAS
  // ───────────────────────────────────────────────────────────────────────────

  var REFERENCIAS = [
    'Miyakis S, et al. International consensus statement on an update of the classification criteria for definite antiphospholipid syndrome (Sydney criteria). J Thromb Haemost 2006;4(2):295-306.',
    'Barbhaiya M, et al. 2023 ACR/EULAR Antiphospholipid Syndrome Classification Criteria. Arthritis Rheumatol 2023;75(10):1687-1702.',
    'Royal College of Obstetricians and Gynaecologists (RCOG). Reducing the Risk of Thrombosis and Embolism during Pregnancy and the Puerperium. Green-top Guideline No. 37a, 2015.',
    'American College of Obstetricians and Gynecologists (ACOG). Practice Bulletin No. 197: Inherited Thrombophilias in Pregnancy (2018, reaff. 2023) and Practice Bulletin No. 132: Antiphospholipid Syndrome (2012, reaff. 2023).',
    'American Society of Hematology (ASH). 2018 Guidelines for Management of Venous Thromboembolism: Pregnancy. Blood Adv 2018;2(22):3317-3359.',
    'FEBRASGO. Manual de Trombofilias na Gestação e Puerpério. Série Orientações FEBRASGO 2023-2026.',
    'Society for Obstetric Anesthesia and Perinatology (SOAP) / American Society of Regional Anesthesia and Pain Medicine (ASRA). Consensus statement on neuraxial anesthesia and anticoagulation.'
  ];

  var FAIXAS_PESO_ENOXAPARINA = {
    MUITO_BAIXO: { limiteKg: 50, doseMg: 20, volumeMl: 0.2, descricao: 'Peso < 50 kg: Enoxaparina 20 mg SC 1x/dia' },
    PADRAO: { limiteMin: 50, limiteMax: 90, doseMg: 40, volumeMl: 0.4, descricao: 'Peso 50 a 90 kg: Enoxaparina 40 mg SC 1x/dia' },
    ELEVADO: { limiteMin: 91, limiteMax: 130, doseMg: 60, volumeMl: 0.6, descricao: 'Peso 91 a 130 kg: Enoxaparina 60 mg SC 1x/dia' },
    OBESIDADE_GRAVE: { limiteMin: 131, doseMg: 80, frequencia: '40 mg SC 12/12h', descricao: 'Peso > 130 kg: Enoxaparina 40 mg SC 12/12h (total 80 mg/dia)' }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 2. MOTORES DETERMINÍSTICOS DE AVALIAÇÃO
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avalia os critérios de Sydney e ACR/EULAR para diagnóstico e estadiamento da SAF
   */
  function avaliarCriteriosSaf(dados) {
    dados = dados || {};
    var abortosPrecoces = Number(dados.abortosPrecoces || dados.abortosMenor10Semanas || dados.abortosPrecocesMenos10Semanas || 0);
    var perdaFetalTardia = Boolean(dados.perdaFetalTardia || dados.perdaMaior10Semanas || dados.obitoFetalInexplicado || dados.perdasFetaisMais10Semanas || dados.obitosFetais);
    var partoPrematuroPE = Boolean(dados.partoPrematuroPrecoce || dados.partoMenor34SemanasPE || dados.insuficienciaPlacentariaGrave || dados.partoPrematuroMenos34Semanas);
    var trombosePrevia = Boolean(dados.trombosePrevia || dados.tev || dados.tvp || dados.tep || dados.tromboseArterial || dados.avc || dados.tipoTrombose);

    var lacPositivo = Boolean(dados.anticoagulanteLupico || dados.lac || dados.drvvtPositivo);
    var aclPositivo = Boolean(dados.anticardiolipina || dados.anticardiolipinaIgG || dados.anticardiolipinaIgM || dados.aclIgG || dados.aclIgM || (Number(dados.tituloAcl || 0) >= 40));
    var antiB2gpiPositivo = Boolean(dados.antiBeta2GlicoproteinaI || dados.antiBeta2GpiIgG || dados.antiBeta2GpiIgM || dados.antiB2gpi || dados.antiBeta2);
    var intervalo12Semanas = dados.intervalo12SemanasConfirmado !== undefined
      ? Boolean(dados.intervalo12SemanasConfirmado)
      : Boolean(dados.intervaloMinimo12Semanas || dados.coletasConfirmadas12Sem || dados.duasColetasConfirmadas);
    var triplaPositividade = (lacPositivo && aclPositivo && antiB2gpiPositivo) || Boolean(dados.triplaPositividade);

    // Critérios Clínicos
    var criterioClinicoObstetrico = (abortosPrecoces >= 3) || perdaFetalTardia || partoPrematuroPE;
    var criterioClinicoTrombotico = trombosePrevia;
    var temCriterioClinico = criterioClinicoObstetrico || criterioClinicoTrombotico;

    // Critérios Laboratoriais
    var temAnticorpoPresente = lacPositivo || aclPositivo || antiB2gpiPositivo;
    var criterioLaboratorialConfirmado = temAnticorpoPresente && intervalo12Semanas;

    // Diagnóstico Formal (Sydney / ACR-EULAR)
    var safConfirmada = temCriterioClinico && criterioLaboratorialConfirmado;
    var safProvavel = temCriterioClinico && temAnticorpoPresente && !intervalo12Semanas;

    return {
      criterioClinicoObstetrico: criterioClinicoObstetrico,
      criterioClinicoTrombotico: criterioClinicoTrombotico,
      temCriterioClinico: temCriterioClinico,
      temAnticorpoPresente: temAnticorpoPresente,
      intervalo12Semanas: intervalo12Semanas,
      criterioLaboratorialConfirmado: criterioLaboratorialConfirmado,
      safConfirmada: safConfirmada,
      safProvavel: safProvavel,
      triplaPositividade: triplaPositividade,
      lacPositivo: lacPositivo,
      aclPositivo: aclPositivo,
      antiB2gpiPositivo: antiB2gpiPositivo,
      detalhesClinicos: {
        abortosPrecoces: abortosPrecoces,
        perdaFetalTardia: perdaFetalTardia,
        partoPrematuroPE: partoPrematuroPE,
        trombosePrevia: trombosePrevia
      }
    };
  }

  /**
   * Avalia trombofilias hereditárias associadas
   */
  function avaliarTrombofiliasHereditarias(dados) {
    var at3 = Boolean(dados.deficienciaAntitrombinaIII || dados.deficitAt3);
    var fvlHomo = Boolean(dados.fatorVLeidenHomozigoto || dados.fvlHomo);
    var protHomo = Boolean(dados.mutacaoProtrombinaHomozigoto || dados.protrombinaHomo);
    var duploHetero = Boolean(dados.duploHeterozigoto || (dados.fatorVLeidenHeterozigoto && dados.mutacaoProtrombinaHeterozigoto));

    var fvlHetero = Boolean(dados.fatorVLeidenHeterozigoto || dados.fvlHetero) && !fvlHomo && !duploHetero;
    var protHetero = Boolean(dados.mutacaoProtrombinaHeterozigoto || dados.protrombinaHetero) && !protHomo && !duploHetero;
    var protC = Boolean(dados.deficienciaProteinaC || dados.deficitProteinaC);
    var protS = Boolean(dados.deficienciaProteinaS || dados.deficitProteinaS);

    var mthfr = Boolean(dados.mthfr || dados.mutacaoMthfr || dados.c677t || dados.a1298c);

    var altoRisco = at3 || fvlHomo || protHomo || duploHetero;
    var baixoRisco = fvlHetero || protHetero || protC || protS;

    var tipos = [];
    if (at3) tipos.push('Deficiência de Antitrombina III (ALTO RISCO - risco de TEV de até 50%)');
    if (fvlHomo) tipos.push('Fator V de Leiden Homozigoto (ALTO RISCO)');
    if (protHomo) tipos.push('Mutação G20210A da Protrombina Homozigota (ALTO RISCO)');
    if (duploHetero) tipos.push('Dupla Heterozigose FVL + Protrombina G20210A (ALTO RISCO)');
    if (fvlHetero) tipos.push('Fator V de Leiden Heterozigoto (BAIXO RISCO)');
    if (protHetero) tipos.push('Mutação G20210A da Protrombina Heterozigota (BAIXO RISCO)');
    if (protC) tipos.push('Deficiência de Proteína C (BAIXO RISCO)');
    if (protS) tipos.push('Deficiência de Proteína S (BAIXO RISCO)');
    if (mthfr && !altoRisco && !baixoRisco) tipos.push('Polimorfismo MTHFR (Variante benigna / NÃO indica anticoagulação)');

    return {
      temTrombofiliaHereditaria: altoRisco || baixoRisco,
      altoRisco: altoRisco,
      baixoRisco: baixoRisco,
      mthfrIsolado: mthfr && !altoRisco && !baixoRisco,
      tipos: tipos
    };
  }

  /**
   * Determina a dose de Enoxaparina com base no peso e função renal
   */
  function calcularDoseEnoxaparina(pesoKg, clCr, regimeTerapeutico) {
    var peso = Number(pesoKg) || 60;
    var clearance = clCr !== undefined && clCr !== null ? Number(clCr) : 100;
    var terapeutico = Boolean(regimeTerapeutico);

    var doseMg = 40;
    var frequencia = '24/24h (1x ao dia via SC)';
    var volumeMl = 0.4;
    var descricao = '';
    var alertaRenal = null;

    if (terapeutico) {
      // Regime Pleno: 1 mg/kg SC 12/12h
      doseMg = Math.round(peso * 1.0);
      volumeMl = Number((doseMg / 100).toFixed(2));
      frequencia = '12/12h via SC [Dose Plena / Terapêutica: 1 mg/kg a cada 12h]';
      descricao = 'Enoxaparina ' + doseMg + ' mg SC de 12/12h (Dose plena calculada para ' + peso + ' kg)';
    } else {
      // Regime Profilático Ponderado
      if (peso < 50) {
        doseMg = 20;
        volumeMl = 0.2;
        descricao = FAIXAS_PESO_ENOXAPARINA.MUITO_BAIXO.descricao;
      } else if (peso <= 90) {
        doseMg = 40;
        volumeMl = 0.4;
        descricao = FAIXAS_PESO_ENOXAPARINA.PADRAO.descricao;
      } else if (peso <= 130) {
        doseMg = 60;
        volumeMl = 0.6;
        descricao = FAIXAS_PESO_ENOXAPARINA.ELEVADO.descricao;
      } else {
        doseMg = 80;
        volumeMl = 0.8;
        frequencia = FAIXAS_PESO_ENOXAPARINA.OBESIDADE_GRAVE.frequencia;
        descricao = FAIXAS_PESO_ENOXAPARINA.OBESIDADE_GRAVE.descricao;
      }
    }

    // Ajuste Renal se ClCr < 30 mL/min
    if (clearance < 30) {
      alertaRenal = 'ALERTA RENAL CRÍTICO: Clearance de Creatinina < 30 mL/min (' + clearance + ' mL/min). Reduzir dose de Enoxaparina em 50% ou preferir Heparina Não Fracionada (HNF) com monitoramento estrito de TTPa e nível de Anti-Xa.';
      if (terapeutico) {
        frequencia = '24/24h via SC (redução renal de 1 mg/kg 12/12h para 1 mg/kg 1x/dia)';
      } else {
        doseMg = 20;
        volumeMl = 0.2;
        frequencia = '24/24h via SC (dose profilática fixa de 20 mg/dia)';
      }
    }

    return {
      doseMg: doseMg,
      volumeMl: volumeMl,
      frequencia: frequencia,
      descricao: descricao,
      alertaRenal: alertaRenal
    };
  }

  /**
   * Avaliação Clínica Global e Prescrição Antitrombótica
   */
  function avaliarSaf(params) {
    var dados = params || {};
    var peso = Number(dados.peso || dados.pesoKg || 65);
    var idadeGestacional = Number(dados.idadeGestacional || dados.ig || dados.semanas || 12);
    var clCr = dados.clCr !== undefined ? Number(dados.clCr) : (dados.clearanceCreatinina !== undefined ? Number(dados.clearanceCreatinina) : 100);

    var refrataria = Boolean(dados.refrataria || dados.safRefrataria || dados.falhaTerapeutica || dados.perdaEmUsoDeAasEEnoxaparina);
    var capsSuspeita = Boolean(dados.caps || dados.suspeitaCaps || dados.safCatastrofica || (dados.orgaosAcometidos && Number(dados.orgaosAcometidos) >= 3));

    var analiseSaf = avaliarCriteriosSaf(dados);
    var analiseTrombofilias = avaliarTrombofiliasHereditarias(dados);

    // Classificação Fenotípica
    var fenotipo = 'INDETERMINADO';
    var prioridade = 'MODERADA';
    var requerHBPM = false;
    var hbpmTerapeutica = false;
    var requerAAS = false;
    var requerHCQ = false;
    var requerPuerperio6Semanas = false;

    var alertas = [];
    var bloqueios = [];
    var prescricoes = [];
    var vigilarMaternoFetal = [];
    var regrasPeriparto = [];

    // Checagem prévia de HIT
    if (dados.hitPrevia || dados.trombocitopeniaInduzidaPorHeparina) {
      bloqueios.push('CONTRAINDICAÇÃO ABSOLUTA A ENOXAPARINA E HNF (HISTÓRICO DE HIT): Proibido uso de qualquer heparina.');
    }
    if (dados.usoVarfarinaPrevio || dados.emUsoVarfarina) {
      alertas.push('ALERTA EMBRIOPATIA VARFARÍNICA: A Varfarina é teratogênica entre a 6ª e 12ª semanas gestacionais. Suspender imediatamente e transicionar para HBPM plena.');
    }

    // 1. ANÁLISE DE FENÓTIPOS
    if (capsSuspeita) {
      fenotipo = 'SÍNDROME ANTIFOSFOLIPÍDIO CATASTRÓFICA (CAPS / ASHERSON)';
      prioridade = 'EMERGÊNCIA_MÉDICA_CRÍTICA';
      requerHBPM = true;
      hbpmTerapeutica = true;
      alertas.push('🚨 ALERTA VERMELHO: SUSPEITA DE SÍNDROME ANTIFOSFOLIPÍDIO CATASTRÓFICA (CAPS). Mortalidade materna de 30-50%.');
      alertas.push('Internação imediata em Centro de Terapia Intensiva (CTI) com suporte multidisciplinar obstétrico e reumatológico.');
      alertas.push('Iniciar TRÍPLICE TERAPIA: Heparina plena IV + Pulsoterapia de Metilprednisolona (1g/dia por 3 dias) + Plasmaférese ou Imunoglobulina Humana Endovenosa (IVIG 2g/kg).');
      prescricoes.push({
        medicamento: 'Heparina Não Fracionada (HNF) IV contínua ou Enoxaparina Plena',
        posologia: 'Anticoagulação plena imediata monitorada com TTPa ou anti-Xa',
        indicacao: 'Anticoagulação de emergência em CAPS'
      });
      prescricoes.push({
        medicamento: 'Pulsoterapia com Metilprednisolona 1.000 mg IV/dia por 3 dias',
        posologia: '1.000 mg IV 1x/dia diluído em SG 5% infundido em 2 a 3 horas',
        indicacao: 'Pulsoterapia anti-inflamatória profunda'
      });
      prescricoes.push({
        medicamento: 'Plasmaférese diária e/ou Imunoglobulina Humana IV (IgIV)',
        posologia: 'Plasmaférese por 3 a 5 dias com reposição de plasma fresco + IgIV 0,4 g/kg/dia por 5 dias',
        indicacao: 'Depuração de anticorpos aPL e mediadores endoteliais tóxicos'
      });
    } else if (analiseSaf.safConfirmada && analiseSaf.criterioClinicoTrombotico) {
      fenotipo = analiseSaf.criterioClinicoObstetrico ? 'SAF MISTA (TROMBÓTICA E OBSTÉTRICA)' : 'SAF TROMBÓTICA CONFIRMADA';
      prioridade = 'MÁXIMA';
      requerHBPM = true;
      hbpmTerapeutica = true;
      requerAAS = true;
      requerPuerperio6Semanas = true;
    } else if (analiseSaf.safConfirmada && analiseSaf.criterioClinicoObstetrico) {
      if (refrataria) {
        fenotipo = 'SAF OBSTÉTRICA REFRATÁRIA';
        prioridade = 'MÁXIMA';
        requerHBPM = true;
        hbpmTerapeutica = true; // ou dose intermediária
        requerAAS = true;
        requerHCQ = true;
        requerPuerperio6Semanas = true;
        alertas.push('⚡ SAF OBSTÉTRICA REFRATÁRIA: Histórico de perda gestacional a despeito da terapia padrão com AAS + HBPM profilática.');
        alertas.push('Indicação formal de escalonamento para Enoxaparina em dose intermediária/terapêutica e adição de Hidroxicloroquina 200 a 400 mg/dia (EULAR/ACR 2023).');
      } else {
        fenotipo = 'SAF OBSTÉTRICA TÍPICA CONFIRMADA';
        prioridade = 'ALTA';
        requerHBPM = true;
        hbpmTerapeutica = false;
        requerAAS = true;
        requerPuerperio6Semanas = true;
      }
    } else if (analiseSaf.safProvavel) {
      fenotipo = 'SAF PROVÁVEL (CRITÉRIO CLÍNICO PRESENTE COM DOSAGEM INICIAL DE aPL POSITIVA)';
      prioridade = 'ALTA';
      requerHBPM = !analiseSaf.criterioClinicoTrombotico ? true : true;
      hbpmTerapeutica = analiseSaf.criterioClinicoTrombotico;
      requerAAS = true;
      requerPuerperio6Semanas = true;
      alertas.push('⚠️ APL PENDENTE DE CONFIRMAÇÃO: Recomenda-se recoleta dos anticorpos antifosfolipídios (LAC, aCL e anti-β2GPI) com intervalo MÍNIMO DE 12 SEMANAS da primeira amostra para diagnóstico definitivo de Sydney.');
      alertas.push('Devido ao alto risco clínico prévio, manter a terapêutica durante a gestação enquanto aguarda a recoleta confirmatória.');
    } else if (analiseSaf.temAnticorpoPresente && !analiseSaf.temCriterioClinico) {
      fenotipo = 'PORTADORA ASSINTOMÁTICA DE ANTICORPOS ANTIFOSFOLIPÍDIOS (aPL POSITIVO)';
      prioridade = 'MODERADA';
      requerAAS = true; // Profilaxia de pré-eclâmpsia
      requerHBPM = analiseSaf.triplaPositividade; // HBPM profilática recomendada se tripla positividade
      requerPuerperio6Semanas = analiseSaf.triplaPositividade || analiseSaf.lacPositivo;
      alertas.push('ℹ️ aPL POSITIVO SEM CRITÉRIOS CLÍNICOS: Rastreio positivo incidental sem eventos prévios.');
      if (analiseSaf.triplaPositividade) {
        alertas.push('🔴 TRIPLA POSITIVIDADE IDENTIFICADA: Confere altíssimo risco trombótico. Indicada tromboprofilaxia estrita antenatal e puerperal com Enoxaparina.');
      } else {
        alertas.push('Indicação de AAS em baixa dose (100 mg/dia) a partir do 1º trimestre para prevenção primária de pré-eclâmpsia e vigilância ativa.');
      }
    } else if (analiseTrombofilias.altoRisco) {
      fenotipo = 'TROMBOFILIA HEREDITÁRIA DE ALTO RISCO';
      prioridade = 'ALTA';
      requerHBPM = true;
      hbpmTerapeutica = dados.trombosePrevia ? true : false;
      requerPuerperio6Semanas = true;
      alertas.push('🧬 Trombofilia hereditária de alto risco identificada (' + analiseTrombofilias.tipos.join('; ') + '). Indicação formal de tromboprofilaxia antenatal e por 6 semanas no puerpério.');
    } else if (analiseTrombofilias.baixoRisco) {
      fenotipo = 'TROMBOFILIA HEREDITÁRIA DE BAIXO RISCO';
      prioridade = 'MODERADA';
      var fatoresAdicionais = Boolean(dados.historiaFamiliarTEV || dados.idadeAvancada || dados.obesidade || dados.cirurgia);
      requerHBPM = fatoresAdicionais;
      requerPuerperio6Semanas = true; // Sempre recomendada profilaxia puerperal de 6 semanas
      alertas.push('🧬 Trombofilia hereditária de baixo risco identificada (' + analiseTrombofilias.tipos.join('; ') + ').');
      if (fatoresAdicionais) {
        alertas.push('Presença de fatores de risco adicionais: Tromboprofilaxia antenatal indicada com Enoxaparina.');
      } else {
        alertas.push('Vigilância clínica antenatal. Indicação mandatória de Enoxaparina profilática por 6 semanas no puerpério.');
      }
    } else if (analiseTrombofilias.mthfrIsolado) {
      fenotipo = 'POLIMORFISMO MTHFR ISOLADO (VARIANTE BENIGNA)';
      prioridade = 'BAIXA';
      requerHBPM = false;
      requerAAS = false;
      bloqueios.push('⛔ NÃO INDICADA ANTICOAGULAÇÃO / HEPARINA: O polimorfismo de MTHFR (C677T ou A1298C) e a hiper-homocisteinemia isolada NÃO são trombofilias causadoras de aborto de repetição ou TEV na gestação (Consensos ACOG/ASH/FEBRASGO). Evitar iatrogenia.');
    } else {
      fenotipo = 'CRITÉRIOS INSUFICIENTES PARA SAF OU TROMBOFILIA';
      prioridade = 'BAIXA';
      alertas.push('A paciente não preenche critérios clínicos ou laboratoriais formais de SAF segundo as diretrizes de Sydney e ACR/EULAR 2023.');
    }

    // 2. CÁLCULO DA DOSE DE ENOXAPARINA
    var dadosEnoxaparina = calcularDoseEnoxaparina(peso, clCr, hbpmTerapeutica);
    if (dadosEnoxaparina.alertaRenal) {
      alertas.push(dadosEnoxaparina.alertaRenal);
    }

    // 3. ESTRUTURAÇÃO DE PRESCRIÇÕES
    if (requerAAS) {
      prescricoes.push({
        medicamento: 'Ácido Acetilsalicílico (AAS Infantil)',
        posologia: '100 a 150 mg VO 1x ao dia, preferencialmente à noite (após o jantar)',
        indicacao: 'Inibição seletiva de COX-1 e agregação plaquetária; prevenção de microtrombose trofoblástica e pré-eclâmpsia.',
        momentoInicio: 'Idealmente pré-concepção ou imediatamente com o teste de gravidez positivo.',
        momentoSuspensao: 'Suspender com 36 semanas completas de gestação (36+0) para prevenir sangramentos menores periparto, ou manter até o parto se alto risco cardiovascular.'
      });
    }

    if (requerHBPM) {
      prescricoes.push({
        medicamento: 'Enoxaparina Sódica (HBPM)',
        posologia: dadosEnoxaparina.descricao + ' | ' + dadosEnoxaparina.frequencia,
        indicacao: hbpmTerapeutica
          ? 'Anticoagulação plena terapêutica (SAF trombótica prévia ou SAF refratária).'
          : 'Tromboprofilaxia primária gestacional antenatal e puerperal ponderada pelo peso.',
        momentoInicio: 'Assim que confirmada gestação intrauterina viável (USG obstétrica inicial ou teste positivo).',
        momentoSuspensao: hbpmTerapeutica
          ? 'SUSPENDER OBRIGATORIAMENTE 24 HORAS ANTES de parto planejado ou anestesia neuroaxial.'
          : 'SUSPENDER OBRIGATORIAMENTE 12 HORAS ANTES de parto planejado ou anestesia neuroaxial.'
      });

      // Suplementação preventiva em uso prolongado de heparina
      prescricoes.push({
        medicamento: 'Carbonato de Cálcio + Colecalciferol (Vitamina D3)',
        posologia: 'Cálcio 1.000 a 1.250 mg/dia VO + Vitamina D3 1.000 a 2.000 UI/dia VO',
        indicacao: 'Profilaxia obrigatória contra osteopenia/osteoporose induzida pelo uso prolongado de heparina durante a gestação.',
        duracao: 'Durante todo o tempo de uso da Enoxaparina.'
      });
    }

    if (requerHCQ) {
      prescricoes.push({
        medicamento: 'Hidroxicloroquina (HCQ)',
        posologia: '200 a 400 mg VO 1x ao dia (dose usual: 400 mg/dia no 1º trimestre, podendo reduzir para 200 mg/dia)',
        indicacao: 'Terapia adjuvante de resgate na SAF Obstétrica Refratária (EULAR 2023 / ACR). Restaura a expressão de anexina A5 trofoblástica e reduz ligação de anticorpos aPL.',
        monitoramento: 'Exame oftalmológico com mapeamento de retina basal.'
      });
      prescricoes.push({
        medicamento: 'Considerar Prednisona (10-20 mg/dia no 1º trimestre) ou Imunoglobulina Humana IV (IgIV)',
        posologia: 'Prednisona 10-20 mg/dia até 12-14 semanas OU IgIV 1 a 2 g/kg/mês em centro especializado',
        indicacao: 'Terapia imunomoduladora adjuvante em casos refratários graves com perda fetal sob HBPM'
      });
    }

    if (analiseTrombofilias.tipos.some(function(t) { return t.includes('Antitrombina'); })) {
      alertas.push('Deficiência de Antitrombina III: Planejar suplementação com Concentrado de Antitrombina III no periparto para manter atividade > 80% e prevenir resistência à heparina.');
    }

    // 4. REGRAS E INTERVALOS DE SEGURANÇA PARA ANESTESIA NEUROAXIAL E PERIPARTO (SOAP/ASRA)
    if (requerHBPM) {
      if (hbpmTerapeutica) {
        regrasPeriparto.push('⚠️ REGRA CRÍTICA DE SUSPENSÃO (HBPM TERAPÊUTICA): Suspender a Enoxaparina pelo menos 24 HORAS antes da indução do parto, cesárea eletiva ou punção neuroaxial (raqui/peridural).');
      } else {
        regrasPeriparto.push('⚠️ REGRA CRÍTICA DE SUSPENSÃO (HBPM PROFILÁTICA): Suspender a Enoxaparina pelo menos 12 HORAS antes da indução do parto, cesárea eletiva ou punção neuroaxial (raqui/peridural).');
      }
      regrasPeriparto.push('🚫 PROIBIDO BLOQUEIO NEUROAXIAL ANTECIPADO: Se a gestante entrar em trabalho de parto espontâneo antes do intervalo seguro, a anestesia neuroaxial é CONTRAINDICADA devido ao risco de hematoma espinhal/epidural compressivo irreversível. Optar por analgesia sistêmica ou anestesia geral se cesárea de emergência.');
      regrasPeriparto.push('💉 RETOMADA PÓS-PARTO: Enoxaparina profilática pode ser reiniciada 6 a 12 horas pós-parto normal ou cesárea (e após pelo menos 4 horas da retirada do cateter peridural). Se dose terapêutica, aguardar no mínimo 24 horas pós-parto e após remoção do cateter.');
      regrasPeriparto.push('⏱️ MANEJO DO CATETER PERIDURAL: Retirar o cateter pelo menos 12 horas após a última dose profilática de HBPM. Não administrar nova dose de heparina nas 4 horas subsequentes à retirada.');
    }

    if (requerPuerperio6Semanas) {
      regrasPeriparto.push('🛡️ PUERPÉRIO SEGURO: Manter Enoxaparina profilática (40 mg SC/dia) por SEIS SEMANAS COMPLETAS (42 dias) no pós-parto. O puerpério concentra mais de 60% dos eventos tromboembólicos graves maternos.');
    }

    // 5. BLOQUEIOS DE SEGURANÇA FARMACOLÓGICA E CONTRAINDICAÇÕES FORMAIS
    bloqueios.push('🚫 CONTRAINDICAÇÃO ABSOLUTA DE DOACs: Rivaroxabana (Xarelto), Apixabana (Eliquis) e Dabigatrana (Pradaxa) atravessam a placenta, causam toxicidade embrionária e NÃO possuem segurança comprovada na gestação/lactação. Estudo TRAPS demonstrou maior taxa de eventos trombóticos em SAF de alto risco tratada com rivaroxabana.');
    bloqueios.push('🚫 CONTRAINDICAÇÃO DE VARFARINA NO 1º TRIMESTRE: A Varfarina ultrapassa a barreira placentária e causa Embriopatia Varfarínica teratogênica (hipoplasia nasal, condrodisplasia puntacta, anomalias de SNC) entre a 6ª e 12ª semanas. Pacientes em uso prévio de Varfarina devem transicionar imediatamente para HBPM assim que confirmado atraso menstrual.');
    bloqueios.push('🚫 CONTRAINDICAÇÃO DE AINEs NO 3º TRIMESTRE: AINEs convencionais são contraindicados a partir de 28 semanas pelo risco de fechamento prematuro do canal arterial fetal e insuficiência renal neonatal com oligoâmnio.');

    // 6. VIGILÂNCIA MATERNO-FETAL
    vigilarMaternoFetal.push('• Rastreio Precoce de Pré-Eclâmpsia: Doppler de artérias uterinas morfológico no 1º trimestre (11-14 semanas).');
    vigilarMaternoFetal.push('• Morfológico de 2º Trimestre (20-24 semanas): Reavaliação de artérias uterinas com busca ativa de persistência de incisura protodiastólica bilateral ou IP médio > percentil 95.');
    vigilarMaternoFetal.push('• Rastreio de Restrição de Crescimento Fetal (RCF): Ultrassonografia obstétrica seriada com Doppler (Artéria Umbilical, Artéria Cerebral Média e Relação Cerebroplacentária) a cada 3 a 4 semanas a partir de 24-28 semanas.');
    vigilarMaternoFetal.push('• Monitoramento Hematológico: Contagem de plaquetas basal e após 7 a 14 dias de início da heparina para rastreio de Trombocitopenia Induzida por Heparina (TIH), embora rara com HBPM (< 0,1%).');
    vigilarMaternoFetal.push('• Programação do Parto: Na SAF bem controlada sem intercorrências, indicar parto entre 38+0 e 39+0 semanas. Não ultrapassar 39+6 semanas. Se houver RCF ou pré-eclâmpsia sobreposta, seguir conduta guiada por vitalidade fetal.');

    var prescricoesFormatadas = prescricoes.map(function(p) {
      return {
        farmaco: p.medicamento,
        posologia: p.posologia,
        objetivo: p.indicacao || p.momentoInicio || '',
        antiXa: p.monitoramento || ''
      };
    });

    var classificacaoDiagnostica = fenotipo;
    if (fenotipo.includes('OBSTÉTRICA TÍPICA')) {
      classificacaoDiagnostica = 'SAF OBSTÉTRICA PURA';
    } else if (fenotipo.includes('TROMBÓTICA')) {
      classificacaoDiagnostica = 'SAF TROMBÓTICA';
    }

    var riscoSorologicoTexto = analiseSaf.triplaPositividade
      ? 'ALTO RISCO SOROLÓGICO: TRIPLA POSITIVIDADE (LAC + aCL + anti-β2GPI)'
      : (analiseSaf.lacPositivo
        ? 'ALTO RISCO SOROLÓGICO: ANTICOAGULANTE LÚPICO POSITIVO'
        : (analiseSaf.temAnticorpoPresente ? 'MÉDIO/BAIXO RISCO SOROLÓGICO' : 'NEGATIVO'));

    return {
      sucesso: true,
      fenotipo: fenotipo,
      prioridade: prioridade,
      dadosEntrada: {
        pesoKg: peso,
        idadeGestacionalSemanas: idadeGestacional,
        clCr: clCr
      },
      diagnosticoSaf: analiseSaf,
      diagnosticoTrombofilias: analiseTrombofilias,
      doseEnoxaparinaCalculada: dadosEnoxaparina,
      prescricoes: prescricoes,
      regrasPeriparto: regrasPeriparto,
      alertas: alertas,
      bloqueios: bloqueios,
      vigilanciaMaternoFetal: vigilarMaternoFetal,
      referencias: REFERENCIAS,

      // Aliases para máxima compatibilidade:
      diagnostico: {
        safConfirmada: analiseSaf.safConfirmada || capsSuspeita,
        classificacao: classificacaoDiagnostica,
        triplaPositividade: analiseSaf.triplaPositividade,
        riscoSorologico: riscoSorologicoTexto,
        trombofiliaHereditariaAltoRisco: analiseTrombofilias.altoRisco,
        criteriosObstetricos: analiseSaf.criterioClinicoObstetrico ? ['Critério obstétrico presente'] : [],
        criteriosTromboticos: analiseSaf.criterioClinicoTrombotico ? ['Critério trombótico presente'] : [],
        criteriosLaboratoriais: analiseSaf.temAnticorpoPresente ? ['Anticorpos aPL presentes'] : []
      },
      posologiaEnoxaparina: {
        pesoKg: peso,
        doseMg: dadosEnoxaparina.doseMg,
        volumeMl: dadosEnoxaparina.volumeMl,
        frequencia: dadosEnoxaparina.frequencia,
        regime: hbpmTerapeutica ? (refrataria ? 'INTERMEDIARIO' : 'TERAPEUTICO') : 'PROFILATICO',
        descricao: dadosEnoxaparina.descricao,
        alertaRenal: dadosEnoxaparina.alertaRenal
      },
      prescricaoFarmacologica: prescricoesFormatadas,
      protocoloPeriparto: {
        janelaSuspensaoHbpm: hbpmTerapeutica ? '24 HORAS antes da anestesia neuroaxial' : '12 HORAS antes da anestesia neuroaxial',
        janelaSuspensaoAas: 'Suspender com 36 semanas de gestação',
        regrasDeOuro: regrasPeriparto
      },
      alertasCriticosSeguranca: alertas.concat(bloqueios),
      condutaGeral: regrasPeriparto.concat(alertas),
      planoVigilancia: vigilarMaternoFetal
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. PARSER ROBUSTO DE TEXTO LIVRE
  // ───────────────────────────────────────────────────────────────────────────

  function extrairParametrosTexto(texto) {
    var raw = String(texto || '').toLowerCase();

    var params = {
      peso: null,
      idadeGestacional: null,
      clCr: null,
      abortosPrecoces: 0,
      perdaFetalTardia: false,
      partoPrematuroPrecoce: false,
      trombosePrevia: false,
      anticoagulanteLupico: false,
      anticardiolipina: false,
      antiBeta2GlicoproteinaI: false,
      intervaloMinimo12Semanas: false,
      triplaPositividade: false,
      refrataria: false,
      caps: false,
      fatorVLeidenHomozigoto: false,
      fatorVLeidenHeterozigoto: false,
      mutacaoProtrombinaHomozigoto: false,
      mutacaoProtrombinaHeterozigoto: false,
      deficienciaAntitrombinaIII: false,
      deficienciaProteinaC: false,
      deficienciaProteinaS: false,
      mthfr: false
    };

    // Extração de peso: "peso 65kg", "70 kg", "peso: 80"
    var matchPeso = raw.match(/(?:peso[:\s]*|)(\d{2,3}(?:[.,]\d+)?)\s*(?:kg|quilos)/) ||
                    raw.match(/peso[:\s]*(\d{2,3}(?:[.,]\d+)?)/);
    if (matchPeso) {
      params.peso = parseFloat(matchPeso[1].replace(',', '.'));
    }

    // Extração de idade gestacional: "12 semanas", "ig 24s", "28s"
    var matchIg = raw.match(/(?:ig|idade gestacional)[:\s]*(\d{1,2}(?:\+\d)?)\s*(?:semanas|sem|s\b)?/) ||
                  raw.match(/(\d{1,2})\s*(?:semanas|sem)\b/);
    if (matchIg) {
      params.idadeGestacional = parseInt(matchIg[1], 10);
    }

    // Extração de Clearance de Creatinina: "clcr 25", "clearance 30"
    var matchClCr = raw.match(/(?:clcr|clearance)[:\s]*(\d{1,3})/);
    if (matchClCr) {
      params.clCr = parseInt(matchClCr[1], 10);
    }

    // Abortos precoces: "3 abortos", "4 abortamentos", "aborto de repeticao"
    var matchAbortos = raw.match(/(\d+)\s*(?:abortos|abortamentos|perdas precoces)/);
    if (matchAbortos) {
      params.abortosPrecoces = parseInt(matchAbortos[1], 10);
    } else if (raw.includes('aborto de repeti') || raw.includes('abortamento habitual') || raw.includes('abortos recorrentes')) {
      params.abortosPrecoces = 3;
    }

    // Perda fetal tardia (> 10 sem): "perda fetal 16 semanas", "obito fetal 20s", "perda com 12 sem", "feto morto"
    if (raw.includes('perda fetal') || raw.includes('óbito fetal') || raw.includes('obito fetal') ||
        raw.includes('perda tardia') || raw.match(/perda.*?(\d{2})\s*(?:sem|semanas)/)) {
      params.perdaFetalTardia = true;
    }

    // Parto prematuro < 34 semanas por pré-eclâmpsia / insuficiência placentária
    if ((raw.includes('pre-eclampsia') || raw.includes('pré-eclâmpsia') || raw.includes('eclamp') || raw.includes('insuficiencia placentaria')) &&
        (raw.includes('prematuro') || raw.includes('parto prematuro') || raw.includes('< 34') || raw.includes('32 sem') || raw.includes('30 sem') || raw.includes('28 sem'))) {
      params.partoPrematuroPrecoce = true;
    }

    // Trombose prévia (TVP, TEP, AVC, arterial)
    if (raw.includes('trombose') || raw.includes('tvp') || raw.includes('tep') || raw.includes('avc') ||
        raw.includes('embolia pulmonar') || raw.includes('trombose venosa') || raw.includes('evento trombotico')) {
      params.trombosePrevia = true;
    }

    // Anticorpos Antifosfolipídios
    if (raw.includes('lac') || raw.includes('lupico') || raw.includes('lúpico') || raw.includes('anticoagulante lupico') || raw.includes('drvvt')) {
      params.anticoagulanteLupico = true;
    }
    if (raw.includes('anticardiolipina') || raw.includes('acl') || raw.includes('cardiolipina')) {
      params.anticardiolipina = true;
    }
    if (raw.includes('anti-beta') || raw.includes('anti-b2gpi') || raw.includes('b2gpi') || raw.includes('beta-2-glicoproteina') || raw.includes('beta 2 glicoproteina')) {
      params.antiBeta2GlicoproteinaI = true;
    }
    if (raw.includes('tripla positividade') || raw.includes('triplo positivo') || (params.anticoagulanteLupico && params.anticardiolipina && params.antiBeta2GlicoproteinaI)) {
      params.triplaPositividade = true;
    }

    // Confirmação com intervalo mínimo de 12 semanas
    if (raw.includes('12 semanas') || raw.includes('intervalo') || raw.includes('duas coletas') || raw.includes('confirmado') || raw.includes('confirmada')) {
      params.intervaloMinimo12Semanas = true;
    }

    // Refratariedade / falha
    if (raw.includes('refratari') || raw.includes('falha') || raw.includes('em uso de aas') || raw.includes('em uso de heparina') || raw.includes('mesmo com enoxaparina')) {
      params.refrataria = true;
    }

    // CAPS / Síndrome Catastrófica
    if (raw.includes('caps') || raw.includes('catastrofica') || raw.includes('asherson') || raw.includes('multiplos orgaos')) {
      params.caps = true;
    }

    // Trombofilias hereditárias
    if (raw.includes('antitrombina')) params.deficienciaAntitrombinaIII = true;
    if (raw.includes('fator v') || raw.includes('leiden')) {
      if (raw.includes('homozigoto') || raw.includes('homo')) params.fatorVLeidenHomozigoto = true;
      else params.fatorVLeidenHeterozigoto = true;
    }
    if (raw.includes('protrombina') || raw.includes('g20210a')) {
      if (raw.includes('homozigoto') || raw.includes('homo')) params.mutacaoProtrombinaHomozigoto = true;
      else params.mutacaoProtrombinaHeterozigoto = true;
    }
    if (raw.includes('proteina c') || raw.includes('proteína c')) params.deficienciaProteinaC = true;
    if (raw.includes('proteina s') || raw.includes('proteína s')) params.deficienciaProteinaS = true;
    if (raw.includes('mthfr') || raw.includes('c677t') || raw.includes('a1298c')) params.mthfr = true;

    // Idade da paciente
    var matchIdade = raw.match(/(?:idade[:\s]*|)(\d{1,2})\s*anos/) || raw.match(/idade[:\s]*(\d{1,2})/);
    if (matchIdade) {
      params.idade = parseInt(matchIdade[1], 10);
    }

    // Uso prévio de Varfarina
    if (raw.includes('varfarina') || raw.includes('marevan') || raw.includes('coumadin')) {
      params.usoVarfarinaPrevio = true;
    }

    // Aliases ergonômicos
    params.pesoKg = params.peso;
    params.abortosPrecocesMenos10Semanas = params.abortosPrecoces;

    return params;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. FORMATADOR DE TEXTO PARA TELEGRAM E COCKPIT
  // ───────────────────────────────────────────────────────────────────────────

  function formatarTextoTelegram(resultado) {
    if (!resultado || !resultado.sucesso) {
      return '⚠️ Falha ao processar avaliação de SAF / Trombofilias.';
    }

    var texto = '⚠️ *MÓDULO DE REFERÊNCIA AVANÇADA* — A conduta definitiva requer especialista. O generalista deve reconhecer, estabilizar e encaminhar.\n\n';
    texto += '🩸 *OBSTETRÍCIA & REUMATOLOGIA — MANEJO DE SAF E TROMBOFILIAS*\n';
    texto += '═══════════════════════════════════════════\n';
    texto += '🏷️ *Fenótipo Clínico:* `' + resultado.fenotipo + '`\n';
    texto += '🎯 *Prioridade Terapêutica:* `' + resultado.prioridade + '`\n';
    texto += '⚖️ *Dados Maternos:* Peso ' + resultado.dadosEntrada.pesoKg + ' kg | IG ' + resultado.dadosEntrada.idadeGestacionalSemanas + ' sem\n\n';

    // Diagnóstico e Critérios
    texto += '📋 *CRITÉRIOS DIAGNÓSTICOS (SYDNEY / ACR-EULAR 2023):*\n';
    var dSaf = resultado.diagnosticoSaf;
    texto += '• Critério Clínico Obstétrico: ' + (dSaf.criterioClinicoObstetrico ? '✅ Presente' : '❌ Ausente') + '\n';
    texto += '• Critério Clínico Trombótico: ' + (dSaf.criterioClinicoTrombotico ? '✅ Presente (Histórico de TEV/Arterial)' : '❌ Ausente') + '\n';
    texto += '• aPL Detectado: ' + (dSaf.temAnticorpoPresente ? '✅ Sim (' + (dSaf.lacPositivo ? 'LAC+ ' : '') + (dSaf.aclPositivo ? 'aCL+ ' : '') + (dSaf.antiB2gpiPositivo ? 'anti-β2GPI+' : '') + ')' : '❌ Não') + '\n';
    texto += '• Intervalo ≥ 12 Semanas (Confirmação): ' + (dSaf.intervalo12Semanas ? '✅ Confirmado' : '⚠️ Pendente recoleta') + '\n';
    if (dSaf.triplaPositividade) {
      texto += '• 🔴 *Tripla Positividade:* SIM (Altíssimo risco trombótico e obstétrico)\n';
    }

    if (resultado.diagnosticoTrombofilias.temTrombofiliaHereditaria) {
      texto += '\n🧬 *TROMBOFILIA HEREDITÁRIA ASSOCIADA:*\n';
      for (var t = 0; t < resultado.diagnosticoTrombofilias.tipos.length; t++) {
        texto += '• ' + resultado.diagnosticoTrombofilias.tipos[t] + '\n';
      }
    }

    // Prescrições Farmacológicas
    if (resultado.prescricoes && resultado.prescricoes.length > 0) {
      texto += '\n💊 *PRESCRIÇÃO ANTITROMBÓTICA ESTRUTURADA:*\n';
      for (var p = 0; p < resultado.prescricoes.length; p++) {
        var presc = resultado.prescricoes[p];
        texto += '*' + (p + 1) + '. ' + presc.medicamento + '*\n';
        texto += '   ↳ Posologia: `' + presc.posologia + '`\n';
        texto += '   ↳ Início: ' + presc.momentoInicio + '\n';
        if (presc.momentoSuspensao) {
          texto += '   ↳ Suspensão: ' + presc.momentoSuspensao + '\n';
        }
      }
    }

    // Regras de Periparto e Anestesia
    if (resultado.regrasPeriparto && resultado.regrasPeriparto.length > 0) {
      texto += '\n🛑 *REGRAS DE PERIPARTO & ANESTESIA NEUROAXIAL (SOAP/ASRA):*\n';
      for (var r = 0; r < resultado.regrasPeriparto.length; r++) {
        texto += resultado.regrasPeriparto[r] + '\n';
      }
    }

    // Alertas Críticos
    if (resultado.alertas && resultado.alertas.length > 0) {
      texto += '\n⚠️ *ALERTAS CLÍNICOS CRÍTICOS:*\n';
      for (var a = 0; a < resultado.alertas.length; a++) {
        texto += '• ' + resultado.alertas[a] + '\n';
      }
    }

    // Bloqueios de Segurança Farmacológica
    if (resultado.bloqueios && resultado.bloqueios.length > 0) {
      texto += '\n🚫 *BLOQUEIOS DE SEGURANÇA FARMACOLÓGICA:*\n';
      for (var b = 0; b < resultado.bloqueios.length; b++) {
        texto += resultado.bloqueios[b] + '\n';
      }
    }

    // Vigilância Materno-Fetal
    if (resultado.vigilanciaMaternoFetal && resultado.vigilanciaMaternoFetal.length > 0) {
      texto += '\n👶 *VIGILÂNCIA MATERNO-FETAL ESTREITA:*\n';
      for (var v = 0; v < resultado.vigilanciaMaternoFetal.length; v++) {
        texto += resultado.vigilanciaMaternoFetal[v] + '\n';
      }
    }

    texto += '\n🩺 *CONDUTA BEIRA-LEITO / UBS (MÉDICO GENERALISTA):*\n';
    texto += '• *Ação Imediata no Teste Positivo:* Em gestante com suspeita de SAF (perdas fetais prévias ou TEV pregresso), iniciar precocemente AAS 100-150 mg/dia VO (preferencialmente antes de 16 semanas para prevenção de pré-eclâmpsia e insuficiência placentária).\n';
    texto += '• *Desmistificação no Beira-Leito:* Mutação da MTHFR NÃO é trombofilia de risco clínico e NÃO justifica indicação de enoxaparina ou anticoagulação. Prescrever ácido fólico ou metilfolato habitual e tranquilizar a paciente.\n';

    texto += '\n🚨 *CRITÉRIOS DE ENCAMINHAMENTO AO PRÉ-NATAL DE ALTO RISCO (PNAR):*\n';
    texto += '• Encaminhamento prioritário ao PNAR e Hematologia/Reumatologia para todas as gestantes com critérios diagnósticos de SAF preenchidos, TEV prévio documentado ou trombofilias hereditárias de alto risco.\n';
    texto += '• Programar Dopplerfluxometria seriada a partir de 24-26 semanas para monitorar vitalidade fetal e rastrear restrição de crescimento fetal (RCF).\n';

    texto += '\n📚 *Diretrizes:* ACR/EULAR (2023), Sydney (2006), RCOG 37a, FEBRASGO 2023-2026, SOAP/ASRA.';

    return texto;
  }

  function processarComandoTelegram(texto) {
    var params = extrairParametrosTexto(texto);
    var resultado = avaliarSaf(params);
    return formatarTextoTelegram(resultado);
  }

  return {
    avaliar: avaliarSaf,
    avaliarSaf: avaliarSaf,
    avaliarCriteriosSaf: avaliarCriteriosSaf,
    avaliarTrombofiliasHereditarias: avaliarTrombofiliasHereditarias,
    calcularDoseEnoxaparina: calcularDoseEnoxaparina,
    extrairParametrosTexto: extrairParametrosTexto,
    formatarTextoTelegram: formatarTextoTelegram,
    processarComandoTelegram: processarComandoTelegram,
    FAIXAS_PESO_ENOXAPARINA: FAIXAS_PESO_ENOXAPARINA,
    REFERENCIAS: REFERENCIAS
  };
})();

var ObstetriciaSafTrombofiliasService = ObstetriciaSafService;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ObstetriciaSafService;
  module.exports.ObstetriciaSafService = ObstetriciaSafService;
  module.exports.ObstetriciaSafTrombofiliasService = ObstetriciaSafTrombofiliasService;
}
