/**
 * ==============================================================================
 * MÓDULO 02: PSIQUIATRIA DE URGÊNCIA & SAÚDE MENTAL CLÍNICA (ABP / MS / APA / NICE)
 * ==============================================================================
 * Motor determinístico de alta fidelidade clínica e farmacológica para o manejo de:
 *  1. Agitação Psicomotora e Protocolos de Contenção Química/Mecânica na Emergência.
 *  2. Avaliação Estratificada de Risco de Suicídio (Protocolo C-SSRS / SAD PERSONS).
 *  3. Rastreamento e Manejo do Transtorno Depressivo Maior (TDM) via Escala PHQ-9.
 *  4. Algoritmo Personalizado de Seleção e Titulação de Antidepressivos.
 *  5. Reversão de Distonia Aguda Extrapiramidal.
 *  6. Síndrome Neuroléptica Maligna (SNM) e Síndrome Serotoninérgica (Critérios de Hunter).
 *
 * FUNDAMENTAÇÃO TEÓRICA E DIRETRIZES OFICIAIS:
 *  - Associação Brasileira de Psiquiatria (ABP) - Diretrizes para o Manejo de Emergências
 *    Psiquiátricas e Agitação Psicomotora (2022/2024).
 *  - Ministério da Saúde do Brasil - Linha de Cuidado em Saúde Mental e Prevenção do Suicídio
 *    (Cadernos de Atenção Básica nº 34 e Portarias de Consolidação).
 *  - American Psychiatric Association (APA) - Practice Guideline for the Treatment of Patients
 *    With Major Depressive Disorder (MDD) & The Assessment of Suicidal Behavior.
 *  - Project BETA (Best Practices in the Evaluation and Treatment of Agitation) - Emergency Psychiatry.
 *  - NICE Guidelines (CG113) - Rapid tranquillisation & psychosis and schizophrenia management.
 *  - Hunter Serotonin Toxicity Criteria (Dunkley et al., QJM 2003).
 *  - Resolução CFM nº 2.057/2013 e Lei Federal nº 10.216/2001 (Critérios ético-legais de internação).
 * ==============================================================================
 */

var PsiquiatriaUrgenciaService = (function() {
  'use strict';

  // ───────────────────────────────────────────────────────────────────────────
  // 1. CATÁLOGO FARMACOLÓGICO DETERMINÍSTICO DE PSIQUIATRIA
  // ───────────────────────────────────────────────────────────────────────────

  var CATALOGO_FARMACOLOGICO = {
    ANTIPSICOTICOS_TIPICOS: {
      haloperidol: {
        medicamento: 'Haloperidol',
        classe: 'Antipsicótico Típico de Alta Potência (Butirofenona)',
        vias: {
          im: {
            doseApresentacao: 'Ampola 5 mg/mL (1 mL)',
            dosePadraoAdulto: '5 mg IM profundo',
            doseIdosoDebilitado: '0.5 a 1 mg IM profundo',
            tempoRepeticaoMin: 30,
            doseMaximaDiariaAdulto: '15 a 20 mg/dia',
            doseMaximaDiariaIdoso: '5 mg/dia'
          },
          vo: {
            apresentacoes: 'Comprimidos de 1 mg e 5 mg; Gotas 2 mg/mL (1 gota = 0.1 mg)',
            doseInicialAdulto: '2.5 a 5 mg VO',
            doseInicialIdoso: '0.5 a 1 mg VO'
          }
        },
        indicacoes: 'Agitação psicomotora aguda, delírios, alucinações, mania, psicose esquizofrênica',
        efeitosAdversosCriticos: ['Distonia aguda', 'Parkinsonismo medicamentoso', 'Acatisia', 'Prolongamento do intervalo QTc', 'Redução do limiar convulsivo'],
        alertas: [
          'Evitar uso isolado na Síndrome de Abstinência Alcoólica (abaixa limiar para crises convulsivas).',
          'Risco aumentado de prolongamento de QTc e arritmias ventriculares (Torsades de Pointes). Se QTc > 500 ms, contraindicado.',
          'Em idosos com demência/delirium, utilizar doses fracionadas mínimas (0.5 a 1 mg).'
        ]
      },
      clorpromazina: {
        medicamento: 'Clorpromazina',
        classe: 'Antipsicótico Típico de Baixa Potência (Fenotiazina)',
        vias: {
          im: {
            doseApresentacao: 'Ampola 25 mg/5 mL (5 mg/mL) ou 25 mg/2 mL',
            dosePadrao: '25 a 50 mg IM profundo',
            doseMaximaDiaria: '100 a 200 mg/dia'
          },
          vo: {
            apresentacoes: 'Comprimidos de 25 mg e 100 mg; Gotas 40 mg/mL (1 gota = 1 mg)',
            doseInicial: '25 a 50 mg VO'
          }
        },
        alertas: [
          'Potente bloqueio alfa-1 adrenérgico: risco acentuado de HIPOTENSÃO ORTOSTÁTICA e taquicardia reflexa.',
          'Sedação profunda e efeito anticolinérgico marcante (boca seca, retenção urinária, constipação).'
        ]
      }
    },

    ANTIHISTAMINICOS_ANTICOLINERGICOS: {
      prometazina: {
        medicamento: 'Prometazina',
        classe: 'Anti-histamínico H1 com Efeito Sedativo e Anticolinérgico',
        vias: {
          im: {
            doseApresentacao: 'Ampola 50 mg/2 mL (25 mg/mL)',
            dosePadrao: '25 a 50 mg IM profundo',
            tempoRepeticaoMin: 60,
            doseMaximaDiaria: '100 mg/dia'
          },
          vo: {
            apresentacoes: 'Comprimidos de 25 mg',
            dosePadrao: '25 a 50 mg VO'
          }
        },
        indicacoes: 'Sedação coadjuvante na agitação grave e profilaxia/tratamento precoce de distonia aguda induzida por antipsicóticos típicos',
        sinergiaHaloperidol: 'Padrão ouro de segurança no Brasil (Haloperidol 5mg IM + Prometazina 50mg IM na mesma seringa ou em seringas separadas). A Prometazina acelera a indução sedativa e previne impregnação extrapiramidal.',
        alertas: ['Pode causar sedação residual prolongada, hipotensão leve e efeitos anticolinérgicos.']
      },
      biperideno: {
        medicamento: 'Biperideno',
        classe: 'Anticolinérgico Central (Antagonista Muscarínico)',
        vias: {
          im_iv: {
            doseApresentacao: 'Ampola 5 mg/mL (1 mL)',
            doseAtaque: '5 mg IM ou IV lento (em 2 a 3 minutos)',
            repeticao: 'Pode repetir 5 mg após 30 minutos se sintomas refratários',
            doseMaximaDiaria: '20 mg/dia'
          },
          vo: {
            apresentacoes: 'Comprimidos de 2 mg e 4 mg (liberação prolongada)',
            doseManutencao: '2 mg VO a cada 8 ou 12 horas por 48 a 72 horas para prevenir recorrência da distonia'
          }
        },
        indicacoes: 'ANTÍDOTO DE ESCOLHA PARA DISTONIA AGUDA EXTRAPIRAMIDAL (espasmo cervical, crise oculógira, trismo, opistótono) e parkinsonismo medicamentoso.',
        alertas: ['Contraindicado em glaucoma de ângulo fechado agudo e estenose mecânica gastrointestinal.']
      }
    },

    BENZODIAZEPINICOS_EMERGENCIA: {
      midazolam: {
        medicamento: 'Midazolam',
        classe: 'Benzodiazepínico de Ação Curta / Início Rápido',
        vias: {
          im: {
            doseApresentacao: 'Ampola 15 mg/3 mL (5 mg/mL) ou 5 mg/5 mL (1 mg/mL)',
            dosePadrao: '5 a 10 mg IM',
            doseIdoso: '2.5 a 5 mg IM',
            inicioAcaoMin: '5 a 15 minutos'
          },
          iv: {
            dosePadrao: '2.5 a 5 mg IV lento titulado',
            inicioAcaoMin: '1 a 3 minutos'
          }
        },
        indicacoes: 'Agitação psicomotora intensa associada a pânico/ansiedade, intoxicação por estimulantes (cocaína, crack, anfetaminas) e alternativa parenteral de absorção rápida e confiável.',
        vantagemIM: 'Absorção intramuscular rápida, completa e previsível (muito superior ao Diazepam IM).',
        alertas: [
          'Risco de depressão respiratória: monitorização obrigatória com oximetria de pulso e frequência respiratória.',
          'Ter flumazenil disponível em caso de depressão respiratória grave.'
        ]
      },
      diazepam: {
        medicamento: 'Diazepam',
        classe: 'Benzodiazepínico de Ação Longa',
        vias: {
          vo: {
            apresentacoes: 'Comprimidos de 5 mg e 10 mg',
            dosePadrao: '5 a 10 mg VO'
          },
          iv: {
            doseApresentacao: 'Ampola 10 mg/2 mL (5 mg/mL)',
            dosePadrao: '5 a 10 mg IV puro LENTO (velocidade máxima 2 mg/min, injetar em pelo menos 2 a 5 minutos)',
            indicacaoPreferencia: 'Síndrome de Abstinência Alcoólica (SAA), Delirium Tremens, crises convulsivas'
          }
        },
        alertaCriticoIM: 'VIA INTRAMUSCULAR CONTRAINDICADA / DESACONSELHADA: Absorção intramuscular errática, lenta, imprevisível e dolorosa devido à lipossolubilidade e precipitação tecidual. Sempre preferir VO, IV lento ou Midazolam IM.',
        alertas: ['Contraindicado em miastenia gravis e insuficiência respiratória descompensada.']
      },
      lorazepam: {
        medicamento: 'Lorazepam',
        classe: 'Benzodiazepínico de Ação Intermediária (Sem Metabólitos Ativos)',
        vias: {
          vo: {
            apresentacoes: 'Comprimidos de 1 mg e 2 mg',
            dosePadrao: '1 a 2 mg VO'
          },
          im_iv: {
            dosePadrao: '1 a 2 mg IM ou IV lento'
          }
        },
        indicacoes: 'Droga de escolha em idosos e pacientes com insuficiência hepática (metabolismo direto por glicuronidação, sem sobrecarga citocromo P450).'
      }
    },

    ANTIPSICOTICOS_ATIPICOS_SEGUNDA_GERACAO: {
      olanzapina: {
        medicamento: 'Olanzapina',
        classe: 'Antipsicótico Atípico (Antagonista 5-HT2A / D2)',
        vias: {
          vo: {
            apresentacoes: 'Comprimidos comuns e orodispersíveis (Zydis) de 2.5 mg, 5 mg e 10 mg',
            dosePadrao: '5 a 10 mg VO'
          },
          im: {
            doseApresentacao: 'Frasco-ampola 10 mg pó liofilizado para reconstituição IM',
            dosePadrao: '10 mg IM (5 mg em idosos)',
            doseMaximaDiaria: '20 mg/dia IM (máx 30 mg/dia combinado)'
          }
        },
        indicacoes: 'Agitação psicomotora em esquizofrenia, mania bipolar e quadros psicóticos colaborativos ou agressivos.',
        contraindicacaoAbsolutaInteracao: 'PROIBIÇÃO DE COADMINISTRAÇÃO PARENTERAL: NUNCA associar Olanzapina IM com Benzodiazepínico IM ou IV na janela de 2 a 4 horas pelo risco documentado de hipotensão severa, bradicardia acentuada, colapso cardiorrespiratório e morte súbita.'
      },
      risperidona: {
        medicamento: 'Risperidona',
        classe: 'Antipsicótico Atípico',
        vias: {
          vo: {
            apresentacoes: 'Comprimidos de 1 mg, 2 mg e 3 mg; Solução oral 1 mg/mL',
            dosePadrao: '1 a 2 mg VO (0.25 a 0.5 mg em idosos)',
            doseMaximaDiaria: '6 mg/dia'
          }
        },
        indicacoes: 'Agitação leve a moderada em paciente colaborativo para via oral; delírios e alucinações agudas; demência com sintomas comportamentais refratários.'
      },
      quetiapina: {
        medicamento: 'Quetiapina',
        classe: 'Antipsicótico Atípico com Baixo Risco Extrapiramidal',
        vias: {
          vo: {
            apresentacoes: 'Comprimidos de 25 mg, 100 mg e 200 mg',
            dosePadrao: '25 a 100 mg VO',
            doseIdosoParkinson: '12.5 a 25 mg VO'
          }
        },
        indicacoes: 'Agitação em pacientes idosos, pacientes com Doença de Parkinson ou Demência por Corpos de Lewy (onde outros antipsicóticos são absolutamente contraindicados pelo risco de catalepsia grave e morte).'
      }
    },

    ANTIDEPRESSIVOS_ESSENCIAIS: {
      sertralina: {
        medicamento: 'Sertralina',
        classe: 'ISRS (Inibidor Seletivo da Recaptação de Serotonina)',
        doseInicial: '25 a 50 mg/dia VO (tomar pela manhã ou após refeição)',
        faixaTerapeutica: '50 a 200 mg/dia VO',
        indicacoesPreferencias: [
          'Primeira escolha em pacientes cardiopatas, coronariopatas ou com histórico de infarto agudo do miocárdio (estudo SADHART comprovou segurança cardiovascular superior).',
          'Primeira escolha na gestação e lactação (menor taxa de excreção no leite materno entre os ISRS).',
          'Depressão unipolar com ou sem transtorno de pânico/ansiedade generalizada associada.'
        ],
        perfilInteracoes: 'Baixo potencial inibitório em enzimas do citocromo P450 em comparação a outros ISRS.'
      },
      escitalopram: {
        medicamento: 'Escitalopram',
        classe: 'ISRS de Mais Alta Seletividade Serotoninérgica',
        doseInicial: '5 a 10 mg/dia VO',
        faixaTerapeutica: '10 a 20 mg/dia VO',
        indicacoesPreferencias: [
          'Excelente tolerabilidade e rápida titulação.',
          'Mínimo impacto em receptores histamínicos, colinérgicos e adrenérgicos.',
          'Ótima opção para polifarmácia devido a raras interações medicamentosas.'
        ],
        alertaDose: 'Doses superiores a 20 mg/dia (ou > 10 mg/dia em idosos > 65 anos) não são recomendadas pelo risco de prolongamento do intervalo QTc.'
      },
      fluoxetina: {
        medicamento: 'Fluoxetina',
        classe: 'ISRS Ativador com Meia-Vida Longa',
        doseInicial: '20 mg/dia VO pela manhã',
        faixaTerapeutica: '20 a 60 mg/dia VO',
        indicacoesPreferencias: [
          'Depressão com lentificação psicomotora, apatia e hipersonia.',
          'Excelente adesão em pacientes com histórico de esquecimento frequente de doses (meia-vida prolongada de 4 a 6 dias de seu metabólito norfluoxetina protege contra síndrome de descontinuação abrupta).'
        ],
        alertas: ['Potente inibidor de CYP2D6 (interage com tamoxifeno, betabloqueadores e antiarrítmicos).']
      },
      duloxetina: {
        medicamento: 'Duloxetina',
        classe: 'IRSN (Inibidor da Recaptação de Serotonina e Noradrenalina - Dual)',
        doseInicial: '30 mg/dia VO por 7 dias, progredindo para 60 mg/dia',
        faixaTerapeutica: '60 a 120 mg/dia VO',
        indicacoesPreferencias: [
          'Primeira linha absoluta em Depressão associada a Dor Crônica, Fibromialgia, Lombalgia crônica ou Neuropatia Diabética Periférica dolorosa.',
          'Incontinência urinária de esforço concomitante.'
        ],
        alertas: ['Aferir função hepática; evitar em hepatopatia avançada e consumo pesado de álcool.']
      },
      venlafaxina: {
        medicamento: 'Venlafaxina (formulações de liberação prolongada XR)',
        classe: 'IRSN Dual',
        doseInicial: '37.5 a 75 mg/dia VO com alimentos',
        faixaTerapeutica: '75 a 225 mg/dia VO (máx 375 mg/dia em ambiente hospitalar)',
        indicacoesPreferencias: [
          'Depressão refratária a ISRS, depressão grave melancólica e transtornos de ansiedade refratários.'
        ],
        alertas: [
          'Efeito noradrenérgico dependente de dose: em doses > 150 mg/dia, monitorar pressão arterial e frequência cardíaca.',
          'Síndrome de descontinuação intensa se interrupção abrupta (exige desmame lento gradual).'
        ]
      },
      mirtazapina: {
        medicamento: 'Mirtazapina',
        classe: 'NaSSA (Antidepressivo Noradrenérgico e Específico Serotoninérgico)',
        doseInicial: '15 mg VO ao deitar',
        faixaTerapeutica: '15 a 45 mg/dia VO ao deitar',
        indicacoesPreferencias: [
          'Primeira escolha em Depressão acompanhada de INSÔNIA SEVERA e PERDA PONDERAL ACENTUADA / HIPOREXIA (idosos debilitados, caquexia ou depressão ansiosa).',
          'Nenhum efeito colateral de disfunção sexual (poupa receptores 5-HT2).'
        ],
        alertas: ['Causa sonolência marcante no início e aumento substancial do apetite/ganho de peso.']
      },
      bupropiona: {
        medicamento: 'Bupropiona (formulações XL ou SR)',
        classe: 'IRND (Inibidor da Recaptação de Noradrenalina e Dopamina)',
        doseInicial: '150 mg/dia VO pela manhã',
        faixaTerapeutica: '150 a 300 mg/dia VO (máx 450 mg/dia)',
        indicacoesPreferencias: [
          'Depressão com anedonia marcante, fadiga crônica, lentificação e hipoatividade.',
          'Desejo concomitante de CESSAÇÃO DO TABAGISMO.',
          'Prevenção ou reversão de disfunção sexual induzida por ISRS (não afeta serotonina).',
          'Pacientes preocupados com ganho de peso (fármaco neutro ou redutor de peso).'
        ],
        contraindicacoesAbsolutas: [
          'HISTÓRICO DE EPILEPSIA OU CRISES CONVULSIVAS PRÉVIAS (diminui significativamente o limiar convulsivo).',
          'DIAGNÓSTICO ATUAL OU PRÉVIO DE BULIMIA NERVOSA OU ANOREXIA NERVOSA (risco catastrófico de convulsões por distúrbios hidroeletrolíticos associados).',
          'Descontinuação abrupta de álcool ou benzodiazepínicos.'
        ]
      }
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 2. AVALIAÇÃO DE AGITAÇÃO PSICOMOTORA & CONTENÇÃO QUÍMICA
  // ───────────────────────────────────────────────────────────────────────────

  function avaliarAgitacaoPsicomotora(params) {
    params = params || {};

    var gravidade = (params.gravidade || params.nivelAgitacao || '').toString().toLowerCase().trim();
    var bars = Number(params.escalaBars || params.bars || 0);
    var rass = Number(params.escalaRass || params.rass || 0);
    var aceitaViaOral = params.aceitaViaOral === true || params.aceitaVo === true;
    var viaPreferencial = (params.viaPreferencial || '').toLowerCase();
    var etiologia = (params.etiologia || params.etiologiaSuspeita || 'psicose').toLowerCase();
    var idade = Number(params.idade || 35);
    var ehIdoso = idade >= 65 || params.idoso === true;
    var ehGestante = params.gestante === true || params.gravida === true;
    var comorbidades = Array.isArray(params.comorbidades) ? params.comorbidades.map(function(c) { return String(c).toLowerCase(); }) : [];
    if (params.cardiopata || params.cardiopatia) comorbidades.push('cardiopatia');
    if (params.qtcLongo || params.qtc_longo) comorbidades.push('qtc_longo');
    if (params.parkinson) comorbidades.push('parkinson');
    if (params.epilepsia) comorbidades.push('epilepsia');

    // Normalização da gravidade clínica
    var nivelEstratificado = 'MODERADA';
    if (bars >= 6 || rass >= 3 || gravidade.includes('extrema') || gravidade.includes('violenta') || gravidade.includes('agress')) {
      nivelEstratificado = 'GRAVE_EXTREMA';
    } else if (bars === 5 || rass === 2 || gravidade.includes('grave')) {
      nivelEstratificado = 'GRAVE';
    } else if (bars === 4 || rass === 1 || gravidade.includes('moderada')) {
      nivelEstratificado = 'MODERADA';
    } else if (bars <= 3 || rass <= 0 || gravidade.includes('leve')) {
      nivelEstratificado = 'LEVE';
    }

    var decisaoVia = 'ORAL';
    if (!aceitaViaOral || viaPreferencial === 'im' || viaPreferencial === 'parenteral' || nivelEstratificado === 'GRAVE_EXTREMA') {
      decisaoVia = 'INTRAMUSCULAR';
    }

    var escalonamento = [
      '1. Desescalonamento Verbal e Manejo Ambiental: Espaço privativo e seguro, manter distância de segurança (mínimo 2 passos), postura corporal aberta, voz calma e modulada, chamar pelo nome, ouvir atentamente, evitar confrontações ou discussões lógicas, oferecer água/alimento e pactuar alívio voluntário do sofrimento.',
      '2. Contenção Farmacológica Rápida: Administrar farmacoterapia dirigida conforme colaboração do paciente e perfil de segurança individual.',
      '3. Contenção Mecânica no Leito: MEDIDA DE EXCEÇÃO E ÚLTIMO RECURSO, reservada unicamente para falha de desescalonamento com risco iminente de autoagressão, heteroagressão física ou destruição grave do ambiente hospitalar.'
    ];

    var prescricoes = [];
    var alternativas = [];
    var alertasSeguranca = [];

    // Checagem de Alertas Críticos de Comorbidades
    var temParkinson = comorbidades.some(function(c) { return c.includes('parkinson') || c.includes('lewy'); });
    var temQtcLongo = comorbidades.some(function(c) { return c.includes('qtc') || c.includes('arritm'); });

    if (temParkinson) {
      alertasSeguranca.push('ALERTA PARKINSON / CORPOS DE LEWY: CONTRAINDICAÇÃO FORMAL DE HALOPERIDOL E ANTIPSICÓTICOS TÍPICOS. Risco de parkinsonismo irreversível, rigidez catastrófica e colapso autonômico. Utilizar exclusivamente Quetiapina 12.5-25 mg VO.');
    }
    if (temQtcLongo) {
      alertasSeguranca.push('ALERTA PROLONGAMENTO DE QTc: Haloperidol e Ziprasidona possuem risco aumentado de arritmias ventriculares potencialmente letais (Torsades de Pointes). Se QTc > 500ms, contraindicados. Preferir Benzodiazepínico (Midazolam/Lorazepam) ou Olanzapina com monitorização cardíaca.');
    }
    if (ehGestante) {
      alertasSeguranca.push('ALERTA GESTAÇÃO: Evitar benzodiazepínicos especialmente no 1º trimestre e próximo ao parto (risco de síndrome do bebê hipotônico/floppy infant syndrome e apneia). Se antipsicótico indispensável, Haloperidol em menor dose eficaz é a opção com maior tempo de segurança registrado na literatura obstétrica.');
    }

    // Regras Específicas por Etiologia e Via
    if (etiologia.includes('abstin') || etiologia.includes('alcool') || etiologia.includes('delirium_tremens')) {
      // Síndrome de Abstinência Alcoólica
      alertasSeguranca.push('SÍNDROME DE ABSTINÊNCIA ALCOÓLICA: A primeira linha é estritamente com BENZODIAZEPÍNICOS. Antipsicóticos típicos isolados (Haloperidol) reduzem o limiar convulsivo e NÃO tratam o mecanismo GABAérgico da abstinência. Administrar TIAMINA 300 mg IV/IM antes de qualquer infusão de glicose para prevenir Encefalopatia de Wernicke.');
      if (decisaoVia === 'ORAL') {
        prescricoes.push('Diazepam 10 a 20 mg VO agora (pode repetir a cada 1-2h conforme escala CIWA-Ar)');
        prescricoes.push('Tiamina 300 mg VO ou IM uma vez ao dia');
        alternativas.push('Lorazepam 1 a 2 mg VO se hepatopatia avançada/icterícia');
      } else {
        prescricoes.push('Diazepam 10 mg IV puro LENTO (velocidade de 2 mg/min, injetar em 5 minutos) sob oximetria contínua OU Midazolam 5 mg IM/IV lento');
        prescricoes.push('Tiamina 300 mg IV diluída em SF 0.9% 100 mL correr em 30 minutos');
        alternativas.push('Midazolam 5 a 10 mg IM se acesso venoso inacessível no momento da agitação');
      }
    } else if (etiologia.includes('estimulante') || etiologia.includes('cocaina') || etiologia.includes('crack') || etiologia.includes('anfetam')) {
      // Intoxicação por Estimulantes
      alertasSeguranca.push('INTOXICAÇÃO POR ESTIMULANTES (COCAÍNA/CRACK/K9): Hiperestimulação simpática severa. Benzodiazepínicos são a 1ª escolha para controle autonômico e prevenção de IAM e convulsões. EVITAR betabloqueadores isolados pelo risco de vasoconstrição coronariana alfa desoposta paradoxal.');
      if (decisaoVia === 'ORAL') {
        prescricoes.push('Diazepam 10 mg VO agora');
      } else {
        prescricoes.push('Midazolam 5 a 10 mg IM ou 2.5 a 5 mg IV lento');
        alternativas.push('Diazepam 5 a 10 mg IV lento');
      }
    } else if (ehIdoso || etiologia.includes('demencia') || etiologia.includes('delirium')) {
      // Idoso / Delirium em Idoso
      alertasSeguranca.push('IDOSO / DELIRIUM: Evitar benzodiazepínicos na ausência de abstinência etílica (alto risco de efeito paradoxal, desinibição motora, piora cognitiva e quedas). Utilizar doses reduzidas (1/3 a 1/2 da dose habitual do adulto).');
      if (decisaoVia === 'ORAL') {
        if (temParkinson) {
          prescricoes.push('Quetiapina 12.5 a 25 mg VO agora');
        } else {
          prescricoes.push('Haloperidol 0.5 a 1 mg VO (5 a 10 gotas de 2 mg/mL) OU Risperidona 0.25 a 0.5 mg VO');
          alternativas.push('Quetiapina 25 mg VO');
        }
      } else {
        if (temParkinson) {
          prescricoes.push('Acalmar ambiente; se estritamente necessário, Quetiapina 25 mg por sonda ou via oral assistida. Parenteral deve ser evitado.');
        } else {
          prescricoes.push('Haloperidol 0.5 a 1 mg IM profundo');
          alternativas.push('Olanzapina 2.5 a 5 mg IM (sem benzodiazepínico concomitante)');
        }
      }
    } else if (temParkinson) {
      // Paciente com Doença de Parkinson ou Demência por Corpos de Lewy (independente da idade)
      if (decisaoVia === 'ORAL') {
        prescricoes.push('Quetiapina 12.5 a 25 mg VO agora (fármaco de escolha estrita no Parkinson por poupar receptores D2 estriatais)');
        alternativas.push('Clozapina 12.5 mg VO se paciente já em uso prévio');
      } else {
        prescricoes.push('Ambiente calmo e desescalonamento. Antipsicóticos típicos parenterais são formalmente contraindicados. Se sedação imperativa: Midazolam 2.5 a 5 mg IM/IV lento com suporte respiratório.');
      }
    } else {
      // Adulto Clínico / Psiquiátrico Geral (Psicose, Mania Bipolar, Transtorno de Personalidade)
      if (decisaoVia === 'ORAL') {
        prescricoes.push('Risperidona 1 a 2 mg VO OU Olanzapina 5 a 10 mg VO (comprimido orodispersível de ação rápida)');
        prescricoes.push('Pode associar Diazepam 5 a 10 mg VO ou Clonazepam 1 a 2 mg VO se componente importante de ansiedade e pânico');
        alternativas.push('Haloperidol 2.5 a 5 mg VO associado a Prometazina 25 mg VO');
        alternativas.push('Quetiapina 50 a 100 mg VO');
      } else {
        // Via Intramuscular Adulto
        prescricoes.push('Haloperidol 5 mg IM (1 ampola) + Prometazina 50 mg IM (1 ampola) aplicados em injeção intramuscular profunda (mesma seringa ou separadas)');
        alternativas.push('Midazolam 5 a 10 mg IM se componente intenso de pânico ou intoxicação simpática');
        alternativas.push('Olanzapina 10 mg IM pó reconstituído (ATENÇÃO: NUNCA associar com Benzodiazepínico IM/IV)');
        alertasSeguranca.push('PROIBIÇÃO FORMAL: NUNCA aplicar Olanzapina IM conjuntamente com Benzodiazepínico parenteral (Midazolam/Diazepam) nas primeiras 2 a 4 horas. Risco documentado de colapso respiratório e parada cardiorrespiratória.');
        alertasSeguranca.push('EVITAR DIAZEPAM IM: Absorção intramuscular errática e cristalização. Se for utilizar Benzodiazepínico IM, o fármaco de escolha é o MIDAZOLAM 5 a 10 mg.');
      }
    }

    // Protocolo de Contenção Mecânica
    var orientacoesEticasCfm = [
      'A contenção mecânica é ato médico emergencial de exceção. Jamais deve ser aplicada como punição, castigo ou por carência de equipe.',
      'Mínimo de 4 a 5 profissionais treinados para abordagem coordenada, evitando trauma físico.',
      'Imobilização obrigatória em 4 ou 5 pontos (ambos os punhos, ambos os tornozelos e tórax/cintura com faixas largas acolchoadas de algodão ou couro; NUNCA amarras improvisadas, ataduras de gaze fina ou algemas metálicas).',
      'PROIBIÇÃO ABSOLUTA de decúbito ventral (risco de asfixia postural e PCR súbita). Manter paciente em decúbito dorsal com cabeceira elevada a 30 graus para prevenir broncoaspiração de vômitos.',
      'Prescrição médica obrigatória com motivo detalhado, horário de início e término previsto.',
      'Checagem da enfermagem e médico a cada 15 a 30 minutos: oximetria de pulso, frequência respiratória, perfusão periférica das extremidades, pulsos e integridade cutânea.',
      'Tempo máximo recomendado de contenção contínua: 2 a 4 horas. Desescalonar e retirar as faixas progressivamente assim que a medicação fizer efeito sedativo.'
    ];

    var protocoloContencaoMecanica = {
      indicado: nivelEstratificado === 'GRAVE_EXTREMA' || nivelEstratificado === 'GRAVE' || !aceitaViaOral,
      indicada: nivelEstratificado === 'GRAVE_EXTREMA' || nivelEstratificado === 'GRAVE' || !aceitaViaOral,
      orientacoesEticas: orientacoesEticasCfm,
      regrasSegurancaCFM: orientacoesEticasCfm
    };

    // Protocolo de Reversão de Distonia Aguda
    var protocoloDistoniaAguda = {
      definicao: 'Contração espasmódica involuntária e dolorosa de grupos musculares (torcicolo espasmódico, crise oculógira com desvio superior dos olhos, trismo mandibular, protusão de língua ou opistótono) ocorrendo tipicamente horas ou poucos dias após uso de antipsicóticos típicos.',
      farmacoPrimeiraLinha: 'Biperideno 5 mg (1 ampola) IM ou IV lento (injetar em 2 a 3 minutos). Melhora dramática dos sintomas ocorre tipicamente em 5 a 15 minutos.',
      repeticao: 'Se alívio incompleto após 30 minutos, pode repetir Biperideno 5 mg IM ou IV lento (máximo 20 mg/dia).',
      alternativa: 'Prometazina 25 a 50 mg IM profundo (caso Biperideno não esteja disponível no setor).',
      manutencaoPreventiva: 'Após a reversão da crise aguda, prescrever Biperideno 2 mg VO de 12/12h por 48 a 72 horas para prevenir recorrência do espasmo.'
    };

    // Alerta de Síndrome Neuroléptica Maligna
    var alertaSindromeNeurolepticaMaligna = {
      tetradeClinica: ['Hipertermia severa (> 38°C a 40°C)', 'Rigidez muscular generalizada em tubo de chumbo', 'Instabilidade autonômica (taquicardia, PA lábil, diaforese profusa)', 'Alteração do nível de consciência (confusão, torpor, coma)'],
      laboratorioMarcador: 'Elevação expressiva de Creatinofosfoquinase (CPK > 1000 a 10.000 U/L), leucocitose neutrofílica e mioglobinúria.',
      condutaEmergencia: 'SUSPENSÃO IMEDIATA de todos os antipsicóticos; transferência urgente para UTI; resfriamento físico corporal ativo; hidratação volêmica agressiva para prevenir necrose tubular aguda e insuficiência renal por rabdomiólise; antídotos específicos em UTI (Dantroleno 1 a 2.5 mg/kg IV e/ou Bromocriptina 2.5 a 5 mg VO/SNG 8/8h).'
    };

    var nivelGravidade = (nivelEstratificado === 'GRAVE_EXTREMA' ? 'GRAVE' : nivelEstratificado);

    return {
      sucesso: true,
      nivelGravidade: nivelGravidade,
      nivelEstratificado: nivelEstratificado,
      bars: bars,
      rass: rass,
      decisaoVia: decisaoVia,
      etiologia: etiologia,
      ehIdoso: ehIdoso,
      ehGestante: ehGestante,
      escalonamento: escalonamento,
      prescricoes: prescricoes,
      alternativas: alternativas,
      alertasSeguranca: alertasSeguranca,
      protocoloContencaoMecanica: protocoloContencaoMecanica,
      protocoloDistoniaAguda: protocoloDistoniaAguda,
      alertaSindromeNeurolepticaMaligna: alertaSindromeNeurolepticaMaligna,
      contencaoQuimica: {
        viaRecomendada: decisaoVia === 'INTRAMUSCULAR' ? 'IM' : 'VO',
        medicamentosRecomendados: prescricoes.map(function(p) {
          var farmaco = p.includes('Haloperidol') && p.includes('Prometazina') ? 'Haloperidol + Prometazina IM' :
                        (p.includes('Midazolam') ? 'Midazolam' :
                        (p.includes('Diazepam') ? 'Diazepam' :
                        (p.includes('Tiamina') ? 'Tiamina (Vitamina B1)' :
                        (p.includes('Risperidona') ? 'Risperidona + Clonazepam' :
                        (p.includes('Haloperidol') ? 'Haloperidol' : p.split(' ')[0])))));
          return { farmaco: farmaco, posologia: p, dose: p };
        }),
        alertasCriticos: alertasSeguranca
      }
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. AVALIAÇÃO DETERMINÍSTICA DE RISCO DE SUICÍDIO (C-SSRS / SAD PERSONS)
  // ───────────────────────────────────────────────────────────────────────────

  function avaliarRiscoSuicidio(params) {
    params = params || {};

    var ideacaoPassiva = params.ideacaoPassiva === true || params.desejoMorte === true;
    var ideacaoAtiva = params.ideacaoAtiva === true || params.ideacaoSuicidaAtiva === true;
    var planoEstruturado = params.planoEstruturado === true || params.planejamento === true;
    var intencaoSuicida = params.intencaoSuicida === true || params.intencao === true;
    var acessoMeiosLetais = params.acessoMeiosLetais === true || params.meiosLetais === true;
    var tentativaPrevia = params.tentativaPrevia === true || params.historicoTentativa === true;
    var tentativaRecente = params.tentativaRecente === true || params.tentativaAtual === true;
    var desesperanca = params.desesperanca === true;
    var psicoseOuDelirio = params.psicoseOuDelirio === true || params.alucinacaoComando === true;
    var abusoSubstancias = params.abusoSubstancias === true || params.usoDrogasAlcool === true;
    var semSuporteSocial = params.semSuporteSocial === true || params.isolamento === true;
    var sexoMasculino = params.sexoMasculino === true || (params.sexo && String(params.sexo).toLowerCase().startsWith('m'));
    var fatoresProtecao = Array.isArray(params.fatoresProtecao) ? params.fatoresProtecao : [];

    // Cálculo do Escore de Gravidade e Classificação
    var pontuacaoRisco = 0;
    if (ideacaoPassiva) pontuacaoRisco += 1;
    if (ideacaoAtiva) pontuacaoRisco += 2;
    if (planoEstruturado) pontuacaoRisco += 3;
    if (intencaoSuicida) pontuacaoRisco += 4;
    if (acessoMeiosLetais) pontuacaoRisco += 3;
    if (tentativaPrevia) pontuacaoRisco += 3;
    if (tentativaRecente) pontuacaoRisco += 5;
    if (desesperanca) pontuacaoRisco += 2;
    if (psicoseOuDelirio) pontuacaoRisco += 4;
    if (abusoSubstancias) pontuacaoRisco += 2;
    if (semSuporteSocial) pontuacaoRisco += 2;
    if (sexoMasculino) pontuacaoRisco += 1;

    // Atenuação por fatores de proteção
    if (fatoresProtecao.length > 0) {
      pontuacaoRisco = Math.max(0, pontuacaoRisco - Math.min(3, fatoresProtecao.length));
    }

    var nivelRisco = 'BAIXO';
    var indicacaoInternacao = 'DESNECESSARIA';
    var condutaImediata = [];
    var acoesSeguranca = [];

    if (tentativaRecente || (ideacaoAtiva && planoEstruturado && intencaoSuicida) || psicoseOuDelirio || (planoEstruturado && acessoMeiosLetais)) {
      nivelRisco = 'IMINENTE';
      indicacaoInternacao = 'INTERNACAO_HOSPITALAR_OBRIGATORIA';
      condutaImediata.push('VIGILÂNCIA 1:1 CONTÍNUA E ININTERRUPTA BEIRA-LEITO: O paciente JAMAIS pode ser deixado desacompanhado nem por um único segundo (inclusive para ir ao banheiro ou higiene pessoal).');
      condutaImediata.push('REVISTA DE PERTENCES IMEDIATA: Remoção completa de cadarços de tênis, cintos, gravatas, sacolas plásticas, fios, vidros, talheres, medicamentos e qualquer objeto perfurocortante.');
      condutaImediata.push('INTERNAÇÃO HOSPITALAR MANDATÓRIA EM LEITO SEGURO: Avaliar internação psiquiátrica voluntária; se houver recusa com risco iminente de autoagressão, está indicada legalmente a INTERNAÇÃO INVOLUNTÁRIA (com comunicação obrigatória ao Ministério Público em até 72 horas úteis, conforme Lei Federal 10.216/2001).');
      condutaImediata.push('CONTENÇÃO E SEDAÇÃO SE AGITAÇÃO: Se o paciente tentar ativamente evasão ou lesão, prescrever medicação sedativa rápida e considerar contenção física protetora.');
    } else if (ideacaoAtiva && (planoEstruturado || tentativaPrevia || desesperanca)) {
      nivelRisco = 'ALTO';
      indicacaoInternacao = 'AVALIACAO_INTERNACAO_PSIQ_OU_CAPS_III';
      condutaImediata.push('Manter o paciente em observação rigorosa no Pronto Atendimento com acompanhante de confiança presente em tempo integral.');
      condutaImediata.push('Revista e retenção de pertences perigosos ou medicamentos estocados.');
      condutaImediata.push('Avaliação psiquiátrica de urgência nas próximas horas para definição de internação hospitalar ou acolhimento noturno em CAPS III.');
      condutaImediata.push('NÃO liberar o paciente para domicílio sem rede de apoio estruturada e pactuação médica.');
    } else if (ideacaoAtiva || (ideacaoPassiva && tentativaPrevia)) {
      nivelRisco = 'MODERADO';
      indicacaoInternacao = 'AMBULATORIAL_INTENSIVO_CAPS_OU_CONSULTA_RAPIDA';
      condutaImediata.push('Avaliação com médico psiquiatra ou equipe de Saúde Mental em até 24 a 48 horas.');
      condutaImediata.push('Supervisão familiar ininterrupta 24 horas no domicílio; entrega e administração de qualquer medicamento estritamente supervisionada por familiar de confiança.');
      condutaImediata.push('Remoção completa de armas de fogo, venenos agrícolas e estoque de comprimidos da residência.');
      condutaImediata.push('Pactuação formal do Plano de Segurança de 5 passos e entrega do contato do Centro de Valorização da Vida (CVV - 188) e SAMU (192).');
    } else {
      nivelRisco = 'BAIXO';
      indicacaoInternacao = 'AMBULATORIAL_APS_UBS';
      condutaImediata.push('Encaminhamento para acompanhamento longitudinal na Atenção Primária à Saúde (UBS/ESF) ou CAPS em até 7 dias.');
      condutaImediata.push('Psicoeducação ao paciente e familiares sobre sinais de alerta de descompensação emocional.');
      condutaImediata.push('Prescrição de tratamento para transtorno de base (ex: depressão/ansiedade) com entrega fracionada semanal das medicações pelo familiar para evitar estocagem de doses tóxicas.');
      condutaImediata.push('Fornecer canal de apoio de emergência (CVV 188 e SAMU 192).');
    }

    var planoSeguranca5Passos = [
      'Passo 1: Reconhecer os sinais de alerta precoces que precedem a crise (pensamentos negativos intrusivos, isolamento súbito, insônia, aperto no peito).',
      'Passo 2: Praticar estratégias internas de enfrentamento que aliviem a tensão sem precisar falar com ninguém (técnicas de respiração diafragmática 4-7-8, caminhada, banho morno, ouvir música calma).',
      'Passo 3: Fazer contato com pessoas e ambientes que proporcionem distração e acolhimento saudável (amigos, familiares de confiança, grupos comunitários).',
      'Passo 4: Pedir ajuda explicitamente a familiares ou amigos de suporte ("Estou tendo pensamentos difíceis e preciso de companhia agora").',
      'Passo 5: Acionar profissionais e canais de emergência: Ligar 188 (CVV - 24 horas, gratuito), 192 (SAMU) ou procurar a UPA/Pronto-Socorro ou CAPS mais próximo.'
    ];

    return {
      sucesso: true,
      nivelRisco: nivelRisco,
      pontuacaoRisco: pontuacaoRisco,
      indicacaoInternacao: indicacaoInternacao,
      condutaImediata: condutaImediata,
      acoesSeguranca: acoesSeguranca,
      planoSeguranca5Passos: planoSeguranca5Passos,
      telefonesEmergencia: {
        cvv: '188 (Centro de Valorização da Vida - Ligação Gratuita Nacional 24h)',
        samu: '192 (SAMU - Urgência e Emergência)',
        bombeiros: '193 (Resgate)'
      }
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. PROTOCOLO DE DEPRESSÃO MAIOR & ESCALA PHQ-9 COM CONDUTA DIRIGIDA
  // ───────────────────────────────────────────────────────────────────────────

  function avaliarDepressaoPhq9(params) {
    params = params || {};

    var respostas = [];
    if (Array.isArray(params.respostas)) {
      respostas = params.respostas.map(function(r) { return Math.max(0, Math.min(3, Number(r) || 0)); });
    } else if (params.q1 !== undefined || params.p1 !== undefined) {
      for (var i = 1; i <= 9; i++) {
        var val = params['q' + i] !== undefined ? params['q' + i] : params['p' + i];
        respostas.push(Math.max(0, Math.min(3, Number(val) || 0)));
      }
    } else {
      var respostaQ9 = Number(params.pergunta9 || params.q9 || 0);
      respostas = [0, 0, 0, 0, 0, 0, 0, 0, Math.min(3, Math.max(0, respostaQ9))];
    }

    while (respostas.length < 9) {
      respostas.push(0);
    }

    var pontuacaoTotal = respostas.reduce(function(acc, cur) { return acc + cur; }, 0);
    if (params.pontuacaoTotal && Number(params.pontuacaoTotal) > pontuacaoTotal) {
      pontuacaoTotal = Number(params.pontuacaoTotal);
    }

    var valorQ9 = respostas[8];
    var alertaIdeacaoSuicida = valorQ9 > 0 || params.alertaSuicidio === true;

    // Estratificação de Gravidade do PHQ-9
    var gravidade = 'MINIMA';
    var descricaoGravidade = 'Sintomas Mínimos ou Ausência de Depressão';
    var recomendacaoGeral = '';

    if (pontuacaoTotal >= 20) {
      gravidade = 'GRAVE';
      descricaoGravidade = 'Depressão Maior Grave (Escore 20 a 27)';
      recomendacaoGeral = 'Tratamento farmacológico imediato obrigatório associado a encaminhamento psiquiátrico de urgência e psicoterapia intensiva. Rastrear risco de suicídio rigorosamente.';
    } else if (pontuacaoTotal >= 15) {
      gravidade = 'MODERADAMENTE_GRAVE';
      descricaoGravidade = 'Depressão Maior Moderadamente Grave (Escore 15 a 19)';
      recomendacaoGeral = 'Tratamento farmacológico imediato combinado com psicoterapia estruturada (Terapia Cognitivo-Comportamental). Avaliação de fatores psicossociais e rede de apoio.';
    } else if (pontuacaoTotal >= 10) {
      gravidade = 'MODERADA';
      descricaoGravidade = 'Depressão Maior Moderada (Escore 10 a 14)';
      recomendacaoGeral = 'Plano de tratamento ativo: farmacoterapia (ISRS de 1ª linha) ou psicoterapia estruturada baseada em evidências, ou combinação de ambas.';
    } else if (pontuacaoTotal >= 5) {
      gravidade = 'LEVE';
      descricaoGravidade = 'Sintomas Depressivos Leves (Escore 5 a 9)';
      recomendacaoGeral = 'Conduta expectante vigilante e suporte: psicoeducação sobre higiene do sono e atividade física regular, suporte psicológico breve. Reavaliar pontuação em 4 a 6 semanas.';
    } else {
      gravidade = 'MINIMA';
      descricaoGravidade = 'Sintomas Mínimos / Ausência de Depressão (Escore 0 a 4)';
      recomendacaoGeral = 'Não necessita de intervenção farmacológica específica. Orientar hábitos saudáveis e reavaliar se novos estressores.';
    }

    // Seleção de Antidepressivo por Comorbidades
    var selecaoAntidepressivo = selecionarAntidepressivo(params);

    var orientacoesSegurancaAdesao = [
      'Janela de Latência Terapêutica: O efeito antidepressivo pleno requer entre 2 a 4 semanas de uso diário ininterrupto para se manifestar. Orientar enfaticamente o paciente para não interromper precocemente.',
      'Efeitos Transitórios Iniciais: Nas primeiras 1 a 2 semanas, podem ocorrer náuseas leves, cefaleia e discreta piora transitória de ansiedade, que costumam remitir espontaneamente.',
      'Black Box Warning (< 25 anos): Monitorar com visitas frequentes nas primeiras 2 a 4 semanas pacientes com menos de 25 anos pelo risco paradoxal inicial de exacerbação transitória de ideação suicida.',
      'Duração Mínima do Tratamento: Manter a farmacoterapia por pelo menos 6 a 12 meses após a remissão clínica completa do 1º episódio para prevenir recaída.',
      'Descontinuação Gradual: NUNCA suspender abruptamente o medicamento; o desmame deve ser lento e gradual ao longo de várias semanas para evitar a Síndrome de Descontinuação de Antidepressivos.'
    ];

    return {
      sucesso: true,
      pontuacaoTotal: pontuacaoTotal,
      valorPergunta9: valorQ9,
      alertaIdeacaoSuicida: alertaIdeacaoSuicida,
      gravidade: gravidade,
      descricaoGravidade: descricaoGravidade,
      recomendacaoGeral: recomendacaoGeral,
      antidepressivoRecomendado: selecaoAntidepressivo.antidepressivoRecomendado,
      justificativaFarmacologica: selecaoAntidepressivo.justificativaFarmacologica,
      posologiaRecomendada: selecaoAntidepressivo.posologiaRecomendada,
      alternativas: selecaoAntidepressivo.alternativas,
      contraindicacoes: selecaoAntidepressivo.contraindicacoes,
      orientacoesSegurancaAdesao: orientacoesSegurancaAdesao
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. SELEÇÃO PERSONALIZADA DE ANTIDEPRESSIVO (ALGORITMO CLÍNICO)
  // ───────────────────────────────────────────────────────────────────────────

  function selecionarAntidepressivo(params) {
    params = params || {};

    var comorbidades = Array.isArray(params.comorbidades) ? params.comorbidades.map(function(c) { return String(c).toLowerCase(); }) : [];
    if (params.cardiopatia || params.posIam) comorbidades.push('cardiopatia');
    if (params.dorCronica || params.fibromialgia) comorbidades.push('dor_cronica');
    if (params.insonia || params.perdaPeso) comorbidades.push('insonia_perda_peso');
    if (params.tabagismo || params.cessacaoTabagismo) comorbidades.push('tabagismo');
    if (params.disfuncaoSexual) comorbidades.push('disfuncao_sexual');
    if (params.ansiedade || params.panico) comorbidades.push('ansiedade_panico');
    if (params.epilepsia || params.convulsao) comorbidades.push('epilepsia');
    if (params.transtornoAlimentar || params.bulimia || params.anorexia) comorbidades.push('transtorno_alimentar');
    if (params.gestante) comorbidades.push('gestante');
    if (params.idoso || Number(params.idade) >= 65) comorbidades.push('idoso');

    var antidepressivoRecomendado = null;
    var justificativaFarmacologica = '';
    var posologiaRecomendada = '';
    var alternativas = [];
    var contraindicacoes = [];

    // Checagem de Contraindicações Absolutas
    var temEpilepsia = comorbidades.some(function(c) { return c.includes('epilep') || c.includes('convuls'); });
    var temTranstornoAlimentar = comorbidades.some(function(c) { return c.includes('bulimia') || c.includes('anorex') || c.includes('alimentar'); });
    var ehCardiopata = comorbidades.some(function(c) { return c.includes('cardio') || c.includes('coronar') || c.includes('iam'); });
    var temDorCronica = comorbidades.some(function(c) { return c.includes('dor') || c.includes('fibromialgia') || c.includes('neuropat'); });
    var temInsoniaGravePerdaPeso = comorbidades.some(function(c) { return c.includes('insonia') || c.includes('peso') || c.includes('caquex'); });
    var temTabagismoOuDisfuncao = comorbidades.some(function(c) { return c.includes('tabag') || c.includes('sexual') || c.includes('ganho_peso'); });
    var ehGestante = comorbidades.some(function(c) { return c.includes('gestan') || c.includes('gravid'); });
    var ehIdoso = comorbidades.some(function(c) { return c.includes('idoso'); });

    if (temEpilepsia || temTranstornoAlimentar) {
      contraindicacoes.push('CONTRAINDICAÇÃO ABSOLUTA DE BUPROPIONA: Pacientes com histórico de crises convulsivas, epilepsia, bulimia ou anorexia nervosa possuem risco altíssimo de convulsões epileptiformes induzidas pela Bupropiona por queda abrupta do limiar convulsivo.');
    }
    if (ehGestante) {
      contraindicacoes.push('CONTRAINDICAÇÃO DE PAROXETINA: A Paroxetina é associada a risco aumentado de malformações congênitas cardiovasculares (defeitos de septo ventricular/atrial) no 1º trimestre (Categoria D do FDA).');
    }
    if (ehCardiopata) {
      contraindicacoes.push('EVITAR ANTIDEPRESSIVOS TRICÍCLICOS (Amitriptilina, Nortriptilina) em cardiopatas: Risco de arritmias ventriculares, bloqueios de condução atrioventricular (efeito quinidina-like) e hipotensão ortostática.');
    }

    // Algoritmo de Decisão Farmacológica
    if (ehCardiopata) {
      antidepressivoRecomendado = CATALOGO_FARMACOLOGICO.ANTIDEPRESSIVOS_ESSENCIAIS.sertralina;
      justificativaFarmacologica = 'Sertralina é o padrão ouro indiscutível em pacientes cardiopatas ou pós-IAM, respaldado pelo ensaio clínico randomizado SADHART (demonstrou ausência de eventos adversos na fração de ejeção, condução cardíaca ou arritmias ventriculares).';
      posologiaRecomendada = 'Sertralina 25 a 50 mg/dia VO pela manhã; titular para 50 a 100 mg/dia após 1 a 2 semanas se boa tolerância.';
      alternativas.push('Escitalopram 10 mg/dia (dose máxima restrita a 10-20 mg para não prolongar QTc)');
    } else if (temDorCronica) {
      antidepressivoRecomendado = CATALOGO_FARMACOLOGICO.ANTIDEPRESSIVOS_ESSENCIAIS.duloxetina;
      justificativaFarmacologica = 'Duloxetina (IRSN Dual) é a primeira linha para pacientes com comorbidade de dor crônica, fibromialgia ou neuropatia diabética, agindo sobre as vias descendentes inibitórias da dor na medula espinhal via noradrenalina.';
      posologiaRecomendada = 'Duloxetina 30 mg/dia VO por 7 dias; progredir para 60 mg/dia VO pela manhã.';
      alternativas.push('Venlafaxina XR 75 a 150 mg/dia VO');
    } else if (temInsoniaGravePerdaPeso) {
      antidepressivoRecomendado = CATALOGO_FARMACOLOGICO.ANTIDEPRESSIVOS_ESSENCIAIS.mirtazapina;
      justificativaFarmacologica = 'Mirtazapina (NaSSA) possui potente bloqueio anti-histamínico H1 e modulação serotoninérgica 5-HT2/5-HT3, gerando alívio imediato da insônia, aumento do apetite e recuperação de peso sem induzir disfunção sexual.';
      posologiaRecomendada = 'Mirtazapina 15 mg VO ao deitar; pode ser titulada até 30 a 45 mg VO se persistência dos sintomas depressivos.';
      alternativas.push('Trazodona 50 a 100 mg VO ao deitar em associação com ISRS');
    } else if (temTabagismoOuDisfuncao && !temEpilepsia && !temTranstornoAlimentar) {
      antidepressivoRecomendado = CATALOGO_FARMACOLOGICO.ANTIDEPRESSIVOS_ESSENCIAIS.bupropiona;
      justificativaFarmacologica = 'Bupropiona (IRND) atua exclusivamente na recaptação de dopamina e noradrenalina, tratando os sintomas de fadiga e anedonia, auxiliando na cessação tabágica e com ausência total de ganho ponderal ou disfunção erétil/anorgasmia.';
      posologiaRecomendada = 'Bupropiona XL 150 mg VO pela manhã por 7 a 14 dias; pode aumentar para 300 mg VO pela manhã.';
      alternativas.push('Vortioxetina ou Escitalopram');
    } else if (ehGestante) {
      antidepressivoRecomendado = CATALOGO_FARMACOLOGICO.ANTIDEPRESSIVOS_ESSENCIAIS.sertralina;
      justificativaFarmacologica = 'Sertralina possui perfil de segurança superior comprovado na gravidez e baixíssima passagem para o leite materno durante a lactação.';
      posologiaRecomendada = 'Sertralina 25 a 50 mg/dia VO; titular conforme evolução clínica.';
      alternativas.push('Fluoxetina 20 mg/dia VO');
    } else if (ehIdoso) {
      antidepressivoRecomendado = CATALOGO_FARMACOLOGICO.ANTIDEPRESSIVOS_ESSENCIAIS.escitalopram;
      justificativaFarmacologica = 'Escitalopram oferece máxima seletividade serotoninérgica, ausência de efeitos anticolinérgicos e baixíssimo risco de interações no citocromo P450 em idosos polimedicados.';
      posologiaRecomendada = 'Escitalopram 5 mg/dia VO por 7 dias; progredir para 10 mg/dia VO pela manhã (teto seguro em idosos).';
      alternativas.push('Sertralina 25 a 50 mg/dia VO');
    } else {
      antidepressivoRecomendado = CATALOGO_FARMACOLOGICO.ANTIDEPRESSIVOS_ESSENCIAIS.escitalopram;
      justificativaFarmacologica = 'Escitalopram ou Sertralina são as opções de 1ª linha com maior eficácia e melhor índice de aceitação e adesão no tratamento inicial do Transtorno Depressivo Maior.';
      posologiaRecomendada = 'Escitalopram 10 mg/dia VO pela manhã (ou Sertralina 50 mg/dia VO após refeição).';
      alternativas.push('Sertralina 50 mg/dia VO');
      alternativas.push('Fluoxetina 20 mg/dia VO');
    }

    return {
      sucesso: true,
      antidepressivoRecomendado: antidepressivoRecomendado,
      justificativaFarmacologica: justificativaFarmacologica,
      posologiaRecomendada: posologiaRecomendada,
      alternativas: alternativas,
      contraindicacoes: contraindicacoes
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. MANEJO DE INTERCORRÊNCIAS: DISTONIA, SNM E SÍNDROME SEROTONINÉRGICA
  // ───────────────────────────────────────────────────────────────────────────

  function manejarDistoniaAguda(params) {
    params = params || {};
    var viaDisponivel = (params.via || 'im').toLowerCase();
    var biperidenoDisponivel = params.biperidenoDisponivel !== false;

    var conduta = {
      diagnostico: 'Distonia Aguda Induzida por Antipsicótico (Reação Extrapiramidal Aguda)',
      farmacoPrincipal: '',
      posologia: '',
      tempoResposta: '5 a 15 minutos para alívio clínico expressivo',
      segundaDose: 'Repetir a mesma dose em 30 minutos se espasmo persistente',
      manutencaoVO: 'Biperideno 2 mg VO de 12/12h ou 8/8h por 48 a 72 horas para prevenir rebote',
      orientacoes: [
        'Acalmar o paciente e acompanhantes: o quadro é extremamente angustiante mas prontamente reversível com o antídoto anticolinérgico.',
        'Revisar a dose do antipsicótico e considerar redução de dose ou troca por antipsicótico atípico (segunda geração).'
      ]
    };

    if (biperidenoDisponivel) {
      conduta.farmacoPrincipal = 'Biperideno 5 mg (1 ampola)';
      conduta.posologia = viaDisponivel === 'iv'
        ? '5 mg IV LENTO (injetar diluído ou puro em 2 a 3 minutos)'
        : '5 mg IM profundo';
    } else {
      conduta.farmacoPrincipal = 'Prometazina 25 a 50 mg (1 ampola de 50 mg)';
      conduta.posologia = '25 a 50 mg IM profundo';
    }

    return {
      sucesso: true,
      conduta: conduta
    };
  }

  function avaliarSindromeNeurolepticaMaligna(params) {
    params = params || {};
    var febreAlta = params.febreAlta === true || Number(params.temperatura || 0) >= 38.0;
    var rigidezTuboChumbo = params.rigidezMuscular === true || params.rigidezTuboChumbo === true;
    var instabilidadeAutonomica = params.instabilidadeAutonomica === true || params.taquicardia === true || params.hipertensaoLabil === true;
    var alteracaoConsciencia = params.alteracaoConsciencia === true || params.confusao === true || params.torpor === true;
    var cpkElevado = params.cpkElevado === true || Number(params.cpk || 0) > 1000;

    var criteriosPresentes = 0;
    if (febreAlta) criteriosPresentes++;
    if (rigidezTuboChumbo) criteriosPresentes++;
    if (instabilidadeAutonomica) criteriosPresentes++;
    if (alteracaoConsciencia) criteriosPresentes++;
    if (cpkElevado) criteriosPresentes++;

    var suspeitaClinica = criteriosPresentes >= 3;
    var condutaUrgente = [];

    if (suspeitaClinica) {
      condutaUrgente.push('SUSPENDER IMEDIATAMENTE TODOS OS ANTIPSICÓTICOS E FÁRMACOS DOPAMINÉRGICOS.');
      condutaUrgente.push('TRANSFERÊNCIA IMEDIATA PARA LEITO DE TERAPIA INTENSIVA (UTI).');
      condutaUrgente.push('Resfriamento corporal ativo: compressas frias, cobertores térmicos, infusão de cristaloides resfriados se hipertermia extrema.');
      condutaUrgente.push('Hidratação venosa vigorosa (SF 0.9% ou Ringer Lactato 2.5 a 3 L/24h) com monitorização de diurese (alvo >= 1.5 a 2 mL/kg/h) para prevenir necrose tubular aguda e falência renal por mioglobinúria/rabdomiólise.');
      condutaUrgente.push('Antídotos específicos em UTI: Dantroleno 1 a 2.5 mg/kg IV em bolus a cada 6h (relaxante muscular periférico) e/ou Bromocriptina 2.5 a 5 mg VO/SNG 8/8h (agonista dopaminérgico central).');
    }

    return {
      sucesso: true,
      suspeitaClinicaSNM: suspeitaClinica,
      criteriosPresentes: criteriosPresentes,
      criteriosAvaliacao: {
        febreAlta: febreAlta,
        rigidezTuboChumbo: rigidezTuboChumbo,
        instabilidadeAutonomica: instabilidadeAutonomica,
        alteracaoConsciencia: alteracaoConsciencia,
        cpkElevado: cpkElevado
      },
      condutaUrgente: condutaUrgente
    };
  }

  function avaliarSindromeSerotoninergica(params) {
    params = params || {};

    var usaSerotoninergico = params.usaSerotoninergico !== false; // Se avaliando suspeita, assume exposição
    var clonusEspontaneo = params.clonusEspontaneo === true;
    var clonusInduzivel = params.clonusInduzivel === true;
    var clonusOcular = params.clonusOcular === true;
    var agitacao = params.agitacao === true || params.diaforese === true;
    var tremor = params.tremor === true;
    var hiperreflexia = params.hiperreflexia === true;
    var hipertonia = params.hipertonia === true || params.rigidez === true;
    var temperaturaElevada = params.hipertermia === true || Number(params.temperatura || 0) >= 38.0;

    // Critérios de Hunter (Dunkley et al., 2003):
    // Na presença de agente serotoninérgico, 1 das 5 regras:
    var atendeRegra1 = clonusEspontaneo;
    var atendeRegra2 = clonusInduzivel && agitacao;
    var atendeRegra3 = clonusOcular && agitacao;
    var atendeRegra4 = tremor && hiperreflexia;
    var atendeRegra5 = hipertonia && temperaturaElevada && (clonusOcular || clonusInduzivel);

    var atendeCriteriosHunter = usaSerotoninergico && (atendeRegra1 || atendeRegra2 || atendeRegra3 || atendeRegra4 || atendeRegra5);

    var gravidade = 'NAO_CARACTERIZADA';
    if (atendeCriteriosHunter) {
      if (temperaturaElevada || hipertonia || clonusEspontaneo) {
        gravidade = 'GRAVE_RISCO_VIDA';
      } else if (clonusInduzivel || tremor || hiperreflexia) {
        gravidade = 'MODERADA';
      } else {
        gravidade = 'LEVE';
      }
    }

    var conduta = [];
    if (atendeCriteriosHunter) {
      conduta.push('SUSPENDER IMEDIATAMENTE TODOS OS FÁRMACOS SEROTONINÉRGICOS (ISRS, IRSN, Tramadol, Linazolida, Triptanos, IMAO, Lítio).');
      conduta.push('SEDAÇÃO PRECOCE COM BENZODIAZEPÍNICOS: Diazepam 10 mg IV lento ou Midazolam 5 mg IV/IM para controle da agitação motora, redução da hiperatividade muscular e supressão adrenérgica.');
      conduta.push('RESFRIAMENTO CORPORAL ATIVO: Compressas frias e hidratação venosa se temperatura > 38.5°C.');
      conduta.push('ANTÍDOTO ESPECÍFICO (Antagonista 5-HT2A): Ciproeptadina 12 mg VO dose inicial de ataque, seguida de 2 mg a cada 2 horas se persistência dos sintomas (ou 8 mg a cada 6 horas).');
      if (gravidade === 'GRAVE_RISCO_VIDA') {
        conduta.push('TRANSFERÊNCIA IMEDIATA PARA UTI: Se hipertermia > 39-40°C ou hipertonia acentuada, indicar intubação orotraqueal e bloqueio neuromuscular (com Vecurônio/Rocurônio; NUNCA Succinilcolina por risco de hipercalemia e rabdomiólise).');
      }
    }

    var diferenciacaoSNM = [
      'Síndrome Serotoninérgica: Instalação rápida (horas), CLÔNUS espontâneo ou induzível (achado patognomônico), HIPERREFLEXIA, diarreia, pupila midriática.',
      'Síndrome Neuroléptica Maligna: Instalação insidiosa (dias), RIGIDEZ muscular em tubo de chumbo, HIPORREFLEXIA, CPK extremamente elevado (> 1000 a 10.000 U/L).'
    ];

    return {
      sucesso: true,
      atendeCriteriosHunter: atendeCriteriosHunter,
      gravidade: gravidade,
      regrasHunter: {
        regra1_clonusEspontaneo: atendeRegra1,
        regra2_clonusInduzivelAgitacao: atendeRegra2,
        regra3_clonusOcularAgitacao: atendeRegra3,
        regra4_tremorHiperreflexia: atendeRegra4,
        regra5_hipertoniaHipertermiaClonus: atendeRegra5
      },
      condutaEmergencia: conduta,
      diferenciacaoSNM: diferenciacaoSNM
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 7. AVALIAÇÃO INTEGRADA & GERADOR DE RESUMO FORMATADO (PEP / TELEGRAM / COCKPIT)
  // ───────────────────────────────────────────────────────────────────────────

  function avaliarPsiquiatriaCompleta(params) {
    params = params || {};

    var resAgitacao = params.avaliarAgitacao !== false ? avaliarAgitacaoPsicomotora(params) : null;
    var resSuicidio = params.avaliarSuicidio !== false ? avaliarRiscoSuicidio(params) : null;
    var resPhq9 = params.avaliarPhq9 !== false ? avaliarDepressaoPhq9(params) : null;
    var resSnm = params.avaliarSnm === true ? avaliarSindromeNeurolepticaMaligna(params) : null;
    var resSerotonina = params.avaliarSerotonina === true ? avaliarSindromeSerotoninergica(params) : null;

    var resumoTexto = gerarResumoPsiquiatria({
      agitacao: resAgitacao,
      suicidio: resSuicidio,
      phq9: resPhq9,
      snm: resSnm,
      serotonina: resSerotonina,
      paciente: params.paciente || {}
    });

    return {
      sucesso: true,
      timestamp: new Date().toISOString(),
      agitacao: resAgitacao,
      suicidio: resSuicidio,
      phq9: resPhq9,
      snm: resSnm,
      serotonina: resSerotonina,
      resumoFormatado: resumoTexto
    };
  }

  function gerarResumoPsiquiatria(dados) {
    dados = dados || {};
    var l = [];

    l.push('════════════════════════════════════════════════════════════════');
    l.push('🧠 ULTRA ROTINA · CONDUTA INTEGRADA EM PSIQUIATRIA & SAÚDE MENTAL');
    l.push('════════════════════════════════════════════════════════════════');
    l.push('');

    // Seção de Agitação Psicomotora
    if (dados.agitacao && dados.agitacao.sucesso) {
      var ag = dados.agitacao;
      l.push('► AGITAÇÃO PSICOMOTORA & CONTENÇÃO FARMACOLÓGICA:');
      l.push('  • Gravidade Estratificada: ' + ag.nivelEstratificado + ' (Via Indicada: ' + ag.decisaoVia + ')');
      l.push('  • Etiologia Base: ' + ag.etiologia.toUpperCase());
      l.push('  • Prescrição Imediata Recomendada:');
      for (var p = 0; p < ag.prescricoes.length; p++) {
        l.push('    💊 ' + ag.prescricoes[p]);
      }
      if (ag.alternativas.length > 0) {
        l.push('  • Alternativas de 2ª Linha:');
        for (var a = 0; a < ag.alternativas.length; a++) {
          l.push('    ↳ ' + ag.alternativas[a]);
        }
      }
      if (ag.alertasSeguranca.length > 0) {
        l.push('');
        l.push('  ⚠️ ALERTAS DE SEGURANÇA FARMACOLÓGICA:');
        for (var al = 0; al < ag.alertasSeguranca.length; al++) {
          l.push('    ! ' + ag.alertasSeguranca[al]);
        }
      }
      l.push('');
    }

    // Seção de Risco de Suicídio
    if (dados.suicidio && dados.suicidio.sucesso) {
      var sc = dados.suicidio;
      l.push('► AVALIAÇÃO DE RISCO DE SUICÍDIO (C-SSRS / SAD PERSONS):');
      l.push('  • Estratificação de Risco: ' + sc.nivelRisco + ' (Score: ' + sc.pontuacaoRisco + ' pts)');
      l.push('  • Indicação de Internação: ' + sc.indicacaoInternacao);
      l.push('  • Conduta Imediata de Proteção:');
      for (var c = 0; c < sc.condutaImediata.length; c++) {
        l.push('    🛡️ ' + sc.condutaImediata[c]);
      }
      l.push('');
    }

    // Seção de Depressão e PHQ-9
    if (dados.phq9 && dados.phq9.sucesso) {
      var pq = dados.phq9;
      l.push('► RASTREAMENTO DE DEPRESSÃO (ESCALA PHQ-9):');
      l.push('  • Escore Total: ' + pq.pontuacaoTotal + ' / 27 pontos (' + pq.descricaoGravidade + ')');
      if (pq.alertaIdeacaoSuicida) {
        l.push('  🚨 ALERTA CRÍTICO: Pergunta 9 positiva (' + pq.valorPergunta9 + ' pts) - Ideação de morte presente!');
      }
      if (pq.antidepressivoRecomendado) {
        l.push('  • Fármaco Recomendado: ' + pq.antidepressivoRecomendado.medicamento + ' (' + pq.antidepressivoRecomendado.classe + ')');
        l.push('  • Posologia e Titulação: ' + pq.posologiaRecomendada);
        l.push('  • Racional Clínico: ' + pq.justificativaFarmacologica);
      }
      if (pq.contraindicacoes && pq.contraindicacoes.length > 0) {
        l.push('');
        l.push('  🚫 CONTRAINDICAÇÕES FARMACOLÓGICAS IDENTIFICADAS:');
        for (var ct = 0; ct < pq.contraindicacoes.length; ct++) {
          l.push('    ✕ ' + pq.contraindicacoes[ct]);
        }
      }
      l.push('');
    }

    // Suporte Telefônico e Rede de Apoio
    l.push('► REDE DE APOIO & TELEFONES DE URGÊNCIA:');
    l.push('  • CVV (Centro de Valorização da Vida): 188 (Ligação gratuita, 24 horas)');
    l.push('  • SAMU: 192 | Bombeiros / Resgate: 193');
    l.push('════════════════════════════════════════════════════════════════');

    return l.join('\n');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // EXPORTAÇÃO PÚBLICA & ALIASES RPC
  // ───────────────────────────────────────────────────────────────────────────

  return {
    CATALOGO_FARMACOLOGICO: CATALOGO_FARMACOLOGICO,
    avaliarAgitacaoPsicomotora: avaliarAgitacaoPsicomotora,
    avaliarRiscoSuicidio: avaliarRiscoSuicidio,
    estratificarRiscoSuicidio: avaliarRiscoSuicidio, // Alias
    avaliarDepressaoPhq9: avaliarDepressaoPhq9,
    selecionarAntidepressivo: selecionarAntidepressivo,
    manejarDistoniaAguda: manejarDistoniaAguda,
    avaliarDistoniaAguda: manejarDistoniaAguda, // Alias
    avaliarSindromeNeurolepticaMaligna: avaliarSindromeNeurolepticaMaligna,
    avaliarSindromeSerotoninergica: avaliarSindromeSerotoninergica,
    avaliarPsiquiatriaCompleta: avaliarPsiquiatriaCompleta,
    avaliarPsiquiatriaCompleto: avaliarPsiquiatriaCompleta, // Alias
    gerarResumoPsiquiatria: gerarResumoPsiquiatria
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PsiquiatriaUrgenciaService: PsiquiatriaUrgenciaService };
}
