/**
 * ==============================================================================
 * MÓDULO 02: NEUROLOGIA DE EMERGÊNCIA E MANEJO DE AVC ISQUÊMICO AGUDO
 * ==============================================================================
 * Diretrizes Clínicas Oficiais:
 *  - AHA/ASA Guidelines for the Early Management of Patients With Acute Ischemic Stroke (2019/2023 Update)
 *  - Diretrizes Brasileiras para Tratamento da Fase Aguda do AVC Isquêmico (SBDCV / ABN / Ministério da Saúde)
 *  - Protocolo Clínico de Trombólise e Trombectomia Mecânica (CONITEC)
 *  - Neurocritical Care Society Guidelines for the Management of Cerebral Edema & Elevated ICP
 *
 * PILARES CLÍNICOS DETERMINÍSTICOS:
 *  1. Checklist Inteligente de Elegibilidade e Contraindicações para Trombólise IV:
 *     - Janela terapêutica estrita até 4.5 horas (critérios NINDS < 3h e critérios estendidos ECASS III 3-4.5h).
 *     - Exclusão obrigatória de mímicos: Glicemia capilar imediata (bloqueio se < 50 mg/dL).
 *     - Contraindicações absolutas: Hemorragia intracraniana prévia, TCE grave ou cirurgia de SNC < 3 meses,
 *       AVC prévio < 3 meses, sangramento ativo, neoplasia intra-axial, coagulopatia (plaquetas < 100k, INR > 1.7,
 *       TTPa alargado, DOACs < 48h) e PA refratária >= 185/110 mmHg.
 *     - Cálculo determinístico de Alteplase (0.9 mg/kg, máx 90 mg; 10% bolus em 1 min, 90% infusão em 60 min).
 *     - Cálculo alternativo de Tenecteplase (0.25 mg/kg bolus único IV, máx 25 mg).
 *  2. Protocolo Restritivo de Controle Pressórico (Pré e Pós-trombólise):
 *     - Pré-trombólise: Alvo PAS < 185 mmHg e PAD < 110 mmHg antes de iniciar infusão.
 *     - Pós-trombólise (primeiras 24h): Alvo PAS < 180 mmHg e PAD < 105 mmHg com monitorização intensiva
 *       (a cada 15 min nas primeiras 2h; 30 min das 2-8h; 60 min das 8-24h).
 *     - Linhas terapêuticas: Labetalol, Nitroprussiato de Sódio, Metoprolol, Hidralazina.
 *     - Pacientes não trombolisados: Hipertensão permissiva (manter PA até 220/120 mmHg; redução máx de 15% em 24h).
 *  3. Hipertensão Intracraniana (HIC) e Edema Cerebral Maligno:
 *     - Osmoterapia determinística: Manitol 20% (0.5 a 1.0 g/kg = 2.5 a 5.0 mL/kg) com teto osmolar < 320 mOsm/L.
 *     - Salina Hipertônica 3% (bolus 250 a 500 mL ou 2 a 5 mL/kg; contínua 0.5-1.5 mL/kg/h) com teto Na < 155-160 mEq/L.
 *     - Salina Hipertônica 20% (bolus de resgate 50 a 100 mL ou ~1 mL/kg em herniação iminente).
 *     - Fórmula prática de preparo da Salina 3% beira-leito.
 *     - Cálculo de osmolaridade sérica calculada quando fornecidos Na+, Glicemia e Ureia.
 *     - Neuroproteção intensiva: cabeceira 30º, normotermia, normoglicemia, contraindicação formal de SG 5% e
 *       gatilho de Craniectomia Descompressiva precoce (< 48h) em infarto maligno de ACM.
 * ==============================================================================
 */

var NeurologiaAvcService = (function() {
  'use strict';

  /**
   * Avalia a elegibilidade para trombólise intravenosa e estratifica riscos.
   * @param {Object} params
   */
  function avaliarTrombolise(params) {
    params = params || {};
    var idade = params.idade;
    var tempoSintomasHoras = params.tempoSintomasHoras !== undefined ? Number(params.tempoSintomasHoras) : undefined;
    var pesoKg = params.pesoKg !== undefined ? Number(params.pesoKg) : undefined;
    var pas = params.pas !== undefined ? Number(params.pas) : undefined;
    var pad = params.pad !== undefined ? Number(params.pad) : undefined;
    var glicemia = params.glicemia !== undefined ? Number(params.glicemia) : undefined;
    var plaquetas = params.plaquetas !== undefined ? Number(params.plaquetas) : undefined;
    var inr = params.inr !== undefined ? Number(params.inr) : undefined;
    var ttpa = params.ttpa !== undefined ? Number(params.ttpa) : undefined;
    var nihss = params.nihss !== undefined ? Number(params.nihss) : undefined;

    if (idade === undefined || tempoSintomasHoras === undefined) {
      throw new Error("Idade e tempo de início dos sintomas (horas) são obrigatórios.");
    }

    var contraAbsolutas = Array.isArray(params.contraAbsolutas) ? params.contraAbsolutas.slice() : [];
    var contraRelativas = Array.isArray(params.contraRelativas) ? params.contraRelativas.slice() : [];
    var alertasClinicos = [];

    // 1. Verificação de Glicemia (Mímico de AVC)
    if (glicemia !== undefined) {
      if (glicemia < 50) {
        contraAbsolutas.push("Hipoglicemia (< 50 mg/dL): mímico frequente de déficit neurológico focal (Stroke Mimic). Administrar 40 mL de Glicose 50% IV imediata e reavaliar persistência do déficit.");
      } else if (glicemia > 400) {
        contraRelativas.push("Hiperglicemia acentuada (> 400 mg/dL): risco aumentado de lesão de reperfusão; iniciar controle glicêmico com insulina venosa.");
      }
    }

    // 2. Verificação de Coagulograma e Laboratório
    if (plaquetas !== undefined && plaquetas < 100000) {
      contraAbsolutas.push("Plaquetopenia grave (< 100.000/mm³)");
    }
    if (inr !== undefined && inr > 1.7) {
      contraAbsolutas.push("Coagulopatia com INR > 1.7");
    }
    if (ttpa !== undefined && ttpa > 40) {
      contraAbsolutas.push("TTPa alargado (> 40s) / uso recente de heparina");
    }
    if (params.usoDoacUltimas48h || params.usoAnticoagulanteOral) {
      contraAbsolutas.push("Uso recente de Anticoagulante Oral de Ação Direta (DOAC) nas últimas 48h (exceto se Dabigatrana com reversão prévia por Idarucizumabe)");
    }
    if (params.hemorragiaIntracranianaPrevia) {
      contraAbsolutas.push("Histórico prévio de hemorragia intracraniana (qualquer época)");
    }
    if (params.avcIsquemicoUltimos3Meses) {
      contraAbsolutas.push("AVC isquêmico recente nos últimos 3 meses");
    }
    if (params.tceGraveUltimos3Meses) {
      contraAbsolutas.push("Traumatismo cranioencefálico grave ou cirurgia de SNC nos últimos 3 meses");
    }
    if (params.sangramentoAtivo) {
      contraAbsolutas.push("Hemorragia interna ativa ou sangramento gastrointestinal recente (< 21 dias)");
    }
    if (params.neoplasiaIntracranianaOuMav) {
      contraAbsolutas.push("Neoplasia intracraniana intra-axial, MAV ou aneurisma não tratado");
    }
    if (params.suspeitaDisseccaoAorta) {
      contraAbsolutas.push("Suspeita clínica ou diagnóstica de Dissecção Aguda de Aorta");
    }
    if (params.endocarditeInfecciosa) {
      contraAbsolutas.push("Endocardite infecciosa ativa");
    }

    // 3. Verificação de Pressão Arterial
    var paDescontrolada = false;
    if (pas !== undefined && pad !== undefined) {
      if (pas >= 185 || pad >= 110) {
        paDescontrolada = true;
        alertasClinicos.push(`⚠️ Pressão arterial elevada (${pas}/${pad} mmHg): Obrigatório controle rigoroso para PAS < 185 e PAD < 110 mmHg ANTES de iniciar o trombolítico.`);
      }
    }

    // Alerta de idade extrema (nonagenários >= 90 anos)
    if (idade >= 90) {
      alertasClinicos.push("⚠️ Paciente longevo/nonagenário (≥ 90 anos): Idade avançada per se NÃO é contraindicação absoluta para trombólise na janela < 3h (guidelines AHA/ASA), mas associa-se a maior fragilidade microvascular e risco hemorrágico; ponderar status funcional prévio (mRS) e diretivas antecipadas.");
    }

    // 4. Verificação de Janela de Tempo e Elegibilidade
    var elegivel = false;
    var mensagem = "";
    var posologiaAlteplase = null;
    var posologiaTenecteplase = null;
    var janela = "";

    if (tempoSintomasHoras > 4.5) {
      janela = "fora_da_janela";
      mensagem = "Trombólise IV contraindicada (Janela terapêutica > 4.5 horas). Avaliar Trombectomia Mecânica se oclusão de grande vaso e janela até 24h (DAWN/DEFUSE-3).";
      if (tempoSintomasHoras <= 9.0 || params.wakeUpStroke) {
        alertasClinicos.push("💡 Janela Estendida / Wake-up Stroke (4.5 a 9h): Considerar trombólise orientada por neuroimagem avançada (mismatch DWI-FLAIR na RM ou perfusão por TC/RM conforme trials WAKE-UP e EXTEND).");
      }
    } else if (contraAbsolutas.length > 0) {
      janela = tempoSintomasHoras <= 3.0 ? "0_a_3h" : "3_a_4.5h";
      mensagem = "Trombólise IV contraindicada devido a contraindicações absolutas: " + contraAbsolutas.join(", ");
    } else {
      if (tempoSintomasHoras > 3.0 && tempoSintomasHoras <= 4.5) {
        janela = "3_a_4.5h";
        // Critérios adicionais para 3 a 4.5h (ECASS III)
        var criteriosExclusao45 = [];
        if (idade > 80) criteriosExclusao45.push("Idade > 80 anos");
        if (params.usoAnticoagulanteOral) criteriosExclusao45.push("Uso de anticoagulante oral (qualquer RNI)");
        if (nihss !== undefined && nihss > 25) criteriosExclusao45.push("AVC grave (NIHSS > 25)");
        if (params.historicoAvcEDiabetes) criteriosExclusao45.push("Histórico prévio de AVC e Diabetes");

        if (criteriosExclusao45.length > 0) {
          mensagem = "Trombólise IV contraindicada na janela de 3-4.5h devido a: " + criteriosExclusao45.join(", ");
        } else {
          elegivel = true;
        }
      } else {
        janela = "0_a_3h";
        elegivel = true;
      }
    }

    // Contraindicações relativas adicionais
    if (params.cirurgiaGrandePorteUltimos14Dias) {
      contraRelativas.push("Cirurgia de grande porte ou trauma grave nos últimos 14 dias");
    }
    if (params.puncaoArterialNaoCompressivelUltimos7Dias) {
      contraRelativas.push("Punção arterial em sítio não compressível nos últimos 7 dias");
    }
    if (params.criseConvulsivaNoIctus) {
      contraRelativas.push("Crise convulsiva no ictus (avaliar paralisia pós-ictal de Todd)");
    }
    if (params.gestante) {
      contraRelativas.push("Gestação em curso (avaliar risco materno-fetal individualizado)");
    }

    if (elegivel) {
      mensagem = "Paciente ELEGÍVEL para Trombólise IV (Alteplase) na janela de até 4.5h.";
      if (contraRelativas.length > 0) {
        mensagem += " ATENÇÃO: Avaliar risco/benefício devido a contraindicações relativas: " + contraRelativas.join(", ");
      }

      if (pesoKg && pesoKg > 0) {
        if (pesoKg > 150) {
          alertasClinicos.push(`⚠️ Obesidade extrema (${pesoKg} kg): Fármacos trombolíticos possuem teto absoluto (Alteplase máx 90 mg; Tenecteplase máx 25 mg), limitando a dose para o peso de 100 kg para prevenir hemorragia fatal.`);
        } else if (pesoKg < 40) {
          alertasClinicos.push(`⚠️ Baixo peso corporal (${pesoKg} kg): Dosagem estritamente ajustada por peso real para evitar sobredose relativa.`);
        }

        // Cálculo Alteplase (Actilyse): 0.9 mg/kg, máx 90 mg
        var maxPesoAlteplase = Math.min(pesoKg, 100);
        var doseTotalAlteplase = (maxPesoAlteplase * 0.9).toFixed(1);
        var bolusAlteplase = (doseTotalAlteplase * 0.1).toFixed(1);
        var infusaoAlteplase = (doseTotalAlteplase * 0.9).toFixed(1);
        posologiaAlteplase = `Alteplase (0,9 mg/kg, máx 90 mg). Dose Total: ${doseTotalAlteplase} mg. Bolus IV (10%): ${bolusAlteplase} mg em 1 minuto. Infusão IV (90%): ${infusaoAlteplase} mg em 60 minutos.`;

        // Cálculo Tenecteplase (Metalyse / TNK): 0.25 mg/kg em bolus único, máx 25 mg
        var maxPesoTnk = Math.min(pesoKg, 100);
        var doseTotalTnk = Math.min(maxPesoTnk * 0.25, 25.0).toFixed(1);
        posologiaTenecteplase = `Tenecteplase (0,25 mg/kg, máx 25 mg). Dose Única: ${doseTotalTnk} mg em bolus IV direto durante 5 a 10 segundos.`;
      }
    }

    // Protocolo de Controle Pressórico Específico
    var pa = {
      alvoPreTrombolise: "PA < 185/110 mmHg antes de iniciar Alteplase.",
      alvoPosTrombolise: "PA < 180/105 mmHg nas primeiras 24 horas pós-trombólise.",
      manejo: "Se PA elevada, usar Labetalol 10-20 mg IV (1 a 2 min), repetido 1x se necessário. Como alternativa ou se refratário: Nitroprussiato de Sódio IV (0.5 a 10 mcg/kg/min). Evitar nifedipina sublingual.",
      semTrombolise: "Se NÃO for trombolisar, tolerar PA até 220/120 mmHg nas primeiras 24-48h (hipertensão permissiva). Reduzir apenas 15% nas primeiras 24h.",
      monitorizacaoPosTrombolise: [
        "A cada 15 minutos nas primeiras 2 horas;",
        "A cada 30 minutos das 2h às 8h;",
        "A cada 60 minutos das 8h às 24h pós-trombólise."
      ],
      drogasAntiHipertensivas: [
        {
          medicamento: "Labetalol",
          posologia: "10 a 20 mg IV em 1-2 minutos; pode repetir 1x em 10-20 minutos (dose máx cumulativa 300 mg) ou iniciar infusão 2-8 mg/min."
        },
        {
          medicamento: "Nitroprussiato de Sódio (Nipride)",
          posologia: "0,5 a 10 mcg/kg/min IV contínuo em bomba de infusão, titulado a cada 5 minutos com monitorização invasiva de PA (PAM)."
        },
        {
          medicamento: "Metoprolol",
          posologia: "5 mg IV em 2 minutos, pode repetir a cada 5-10 minutos até 15-20 mg se FC > 60 bpm (alternativa frequente no Brasil se Labetalol indisponível)."
        },
        {
          medicamento: "Hidralazina",
          posologia: "10 a 20 mg IV lenta a cada 4 a 6 horas (se contraindicação a betabloqueadores e nitroprussiato)."
        }
      ],
      alertaConversaoHemorragica: "⛔ Se surgirem cefaleia súbita grave, náuseas/vômitos, hipertensão aguda refratária ou piora neurológica (aumento >= 4 pontos no NIHSS): SUSPENDER IMEDIATAMENTE a infusão de trombolítico, solicitar TC de crânio urgente e colher coagulograma."
    };

    return {
      elegibilidade: {
        elegivel: elegivel,
        janela: janela,
        tempoSintomasHoras: tempoSintomasHoras,
        mensagem: mensagem,
        posologiaAlteplase: posologiaAlteplase,
        posologiaTenecteplase: posologiaTenecteplase,
        contraindicacoesAbsolutas: contraAbsolutas,
        contraindicacoesRelativas: contraRelativas,
        paDescontrolada: paDescontrolada,
        alertasClinicos: alertasClinicos
      },
      controlePressao: pa
    };
  }

  /**
   * Calcula parâmetros e posologias determinísticas para Hipertensão Intracraniana (HIC)
   * e edema cerebral maligno no AVC isquêmico agudo.
   * @param {Object} params
   */
  function calcularHic(params) {
    params = params || {};
    var peso = params.pesoKg !== undefined ? Number(params.pesoKg) : undefined;
    if (!peso || peso <= 0) {
      throw new Error("Peso (kg) obrigatório para cálculos de HIC.");
    }

    var alertasGeraisHic = [];
    if (peso > 150) {
      alertasGeraisHic.push(`⚠️ Obesidade extrema (${peso} kg): O cálculo de osmoterápicos por peso real pode induzir sobrecarga volêmica aguda e edema pulmonar. Considere dosagem baseada no peso predito/ideal e monitore sinais de congestão.`);
    } else if (peso < 10) {
      alertasGeraisHic.push(`⚠️ Lactente/Pediatria (${peso} kg): Infusão de soluções hiperosmolares exige bomba de seringa e monitorização em UTI pediátrica com gasometrias frequentes para evitar flutuações osmolares deletérias.`);
    }

    var sodio = params.sodio !== undefined ? Number(params.sodio) : undefined;
    var glicemia = params.glicemia !== undefined ? Number(params.glicemia) : undefined;
    var ureia = params.ureia !== undefined ? Number(params.ureia) : undefined;
    var osmolaridadeMedida = params.osmolaridadeMedida !== undefined ? Number(params.osmolaridadeMedida) : undefined;

    // 1. Manitol 20% - 0.5 a 1.0 g/kg (Solução a 20% = 0.2 g/mL)
    var doseManitolG = (peso * 0.5).toFixed(1) + " a " + (peso * 1.0).toFixed(1);
    var volumeManitolMl = (peso * (0.5 / 0.2)).toFixed(0) + " a " + (peso * (1.0 / 0.2)).toFixed(0);

    // Manutenção Manitol: 0.25 a 0.5 g/kg a cada 4 a 6 horas
    var volManutencaoManitol = (peso * (0.25 / 0.2)).toFixed(0) + " a " + (peso * (0.5 / 0.2)).toFixed(0);

    // 2. Salina Hipertônica 3% (3 a 5 mL/kg em bolus ou infusão 0.5-1.5 mL/kg/h)
    var doseSalina3Ml = (peso * 3).toFixed(0);
    var faixaSalina3Ml = (peso * 2).toFixed(0) + " a " + (peso * 5).toFixed(0) + " mL";
    var infusaoContinuaSalina3 = (peso * 0.5).toFixed(1) + " a " + (peso * 1.5).toFixed(1) + " mL/h";

    // 3. Salina Hipertônica 20% (1 mL/kg bolus em emergência extrema/herniação iminente)
    var doseSalina20Ml = peso.toFixed(0);

    // 4. Osmolaridade Sérica Estimada
    var osmolaridadeCalculada = null;
    var alertaOsmolaridade = [];
    if (sodio !== undefined) {
      var termoGli = glicemia !== undefined ? (glicemia / 18) : 5.5; // ~100 mg/dL basal
      var termoUr = ureia !== undefined ? (ureia / 6) : 6.6; // ~40 mg/dL basal
      osmolaridadeCalculada = Number((2 * sodio + termoGli + termoUr).toFixed(1));

      if (osmolaridadeCalculada >= 320) {
        alertaOsmolaridade.push(`⛔ TETO OSMOLAR ATINGIDO: Osmolaridade calculada (${osmolaridadeCalculada} mOsm/L) >= 320 mOsm/L. Suspender Manitol para evitar lesão renal aguda e efeito rebote; preferir Salina Hipertônica se sódio permitir.`);
      }
      if (sodio >= 155) {
        alertaOsmolaridade.push(`⛔ TETO DE SÓDIO ATINGIDO: Sódio sérico (${sodio} mEq/L) >= 155 mEq/L. Suspender ou reduzir infusão de Salina Hipertônica.`);
      }
    }

    if (osmolaridadeMedida && osmolaridadeCalculada) {
      var osmGap = Number((osmolaridadeMedida - osmolaridadeCalculada).toFixed(1));
      if (osmGap > 20) {
        alertaOsmolaridade.push(`⚠️ Osmolar Gap elevado (${osmGap} mOsm/kg): acúmulo osmolar significativo de manitol; pausar doses.`);
      }
    }

    // 5. Receita de Preparo Beira-Leito de Salina 3%
    var receitaPreparoSalina3 = {
      frasco500: "Para preparar 500 mL de Salina 3%: Misturar 445 mL de SF 0,9% + 55 mL de NaCl 20%.",
      frasco1000: "Para preparar 1000 mL de Salina 3%: Misturar 890 mL de SF 0,9% + 110 mL de NaCl 20%."
    };

    var alertasNeuroprotecao = [
      "Manter cabeceira elevada a 30 graus e cabeça alinhada em posição neutra para otimizar drenagem venosa jugular.",
      "Evitar compressão de veias jugulares (colar cervical frouxo, evitar rotação do pescoço).",
      "CONTRAINDICAÇÃO FORMAL de soluções hipotônicas (ex: Soro Glicosado 5% ou Salina 0,45%), pois agravam criticamente o edema cerebral citotóxico e vasogênico.",
      "Controle térmico estrito: manter normotermia (< 37,5°C) com antipiréticos e medidas físicas; cada aumento de 1°C eleva o metabolismo e consumo cerebral de O2.",
      "Alvo glicêmico: 140 a 180 mg/dL. Evitar hipoglicemia e hiperglicemia acentuada.",
      "Ventilação protetora: alvo de PaCO2 entre 35 e 40 mmHg (normocarbia). Hiperventilação temporária (PaCO2 30-35 mmHg) permitida apenas como medida de ponte de resgate imediato em sinais de herniação uncal iminente.",
      "Alerta de Craniectomia Descompressiva: Em AVC isquêmico maligno de artéria cerebral média (> 50% do território com deterioração neurológica em < 48h, especialmente idade < 60 anos), acionar Neurocirurgia precocemente."
    ];

    return {
      pesoKg: peso,
      manitol20: {
        doseGramas: doseManitolG + " g",
        volumeMl: volumeManitolMl + " mL",
        posologia: `Ataque: ${volumeManitolMl} mL IV em 20 a 30 minutos. Manutenção: ${volManutencaoManitol} mL IV 4/4h a 6/6h.`,
        alerta: "Infundir em 20-30 min. Contraindicado em instabilidade hemodinâmica, edema pulmonar ou anúria. Monitorar osmolaridade sérica (alvo < 320 mOsm/L)."
      },
      salinaHipertonica3: {
        volumeMl: doseSalina3Ml + " mL",
        faixaBolus: faixaSalina3Ml,
        infusaoContinua: infusaoContinuaSalina3,
        posologia: "IV em 20-30 min",
        preparo: receitaPreparoSalina3,
        alerta: "Indicado para pacientes com HIC, preferível ao manitol se choque associado. Monitorar Na+ sérico de 6/6h (teto de segurança <= 155-160 mEq/L)."
      },
      salinaHipertonica20: {
        volumeMl: doseSalina20Ml + " mL",
        posologia: "IV em bolus (central preferencial)",
        alerta: "Terapia de resgate para HIC severa (herniação iminente)."
      },
      osmolaridadeCalculada: osmolaridadeCalculada,
      alertasOsmolares: alertaOsmolaridade.concat(alertasGeraisHic),
      alertasPeso: alertasGeraisHic,
      alertaGeral: "Manter cabeceira elevada a 30 graus, colar cervical frouxo, normocarbia (pCO2 35-40), e evitar hipertermia/hiponatremia.",
      medidasNeuroprotecao: alertasNeuroprotecao
    };
  }

  /**
   * Gera laudo / resumo formatado em Markdown para Telegram e Cockpit.
   * @param {Object} resultado
   */
  function formatarResumoAvc(resultado) {
    if (!resultado) return "⚠️ Sem dados para exibição do protocolo de AVC.";
    var t = [];

    if (resultado.elegibilidade) {
      var e = resultado.elegibilidade;
      t.push("🧠 *MANEJO DE AVC ISQUÊMICO AGUDO & TROMBÓLISE*");
      t.push("════════════════════════════════════════════");
      t.push(`• Status: *${e.elegivel ? "✅ ELEGÍVEL PARA TROMBÓLISE" : "⛔ CONTRAINDICADO PARA TROMBÓLISE IV"}*`);
      t.push(`• Janela Informada: *${e.tempoSintomasHoras}h* (Janela: ${e.janela})`);
      t.push(`• Conclusão: ${e.mensagem}`);
      t.push("");

      if (e.posologiaAlteplase) {
        t.push("💉 *POSOLOGIA DE ALTEPLASE (rtPA):*");
        t.push(`👉 ${e.posologiaAlteplase}`);
        t.push("");
      }

      if (e.posologiaTenecteplase) {
        t.push("💉 *ALTERNATIVA: TENECTEPLASE (TNK):*");
        t.push(`👉 ${e.posologiaTenecteplase}`);
        t.push("");
      }

      if (e.contraindicacoesAbsolutas && e.contraindicacoesAbsolutas.length > 0) {
        t.push("🚫 *Contraindicações Absolutas:*");
        e.contraindicacoesAbsolutas.forEach(function(c) {
          t.push(` • ${c}`);
        });
        t.push("");
      }

      if (e.contraindicacoesRelativas && e.contraindicacoesRelativas.length > 0) {
        t.push("⚠️ *Contraindicações Relativas / Cautelas:*");
        e.contraindicacoesRelativas.forEach(function(c) {
          t.push(` • ${c}`);
        });
        t.push("");
      }
    }

    if (resultado.controlePressao) {
      var cp = resultado.controlePressao;
      t.push("🩸 *CONTROLE DA PRESSÃO ARTERIAL:*");
      t.push(`• *Pré-trombólise:* ${cp.alvoPreTrombolise}`);
      t.push(`• *Pós-trombólise (24h):* ${cp.alvoPosTrombolise}`);
      t.push(`• *Não-trombolisados:* ${cp.semTrombolise}`);
      t.push(`• *Conduta Farmacológica:* ${cp.manejo}`);
      t.push("");
      t.push("⏱️ *Monitorização Intensiva de PA Pós-trombólise:*");
      cp.monitorizacaoPosTrombolise.forEach(function(m) {
        t.push(` • ${m}`);
      });
      t.push("");
      t.push(`💡 _${cp.alertaConversaoHemorragica}_`);
      t.push("");
    }

    if (resultado.manitol20 && resultado.salinaHipertonica3) {
      t.push("💧 *MANEJO DE HIPERTENSÃO INTRACRANIANA (HIC):*");
      t.push("════════════════════════════════════════════");
      t.push(`• *Manitol 20%:* ${resultado.manitol20.volumeMl} (${resultado.manitol20.doseGramas}) em 20-30 min`);
      t.push(`  ↳ _${resultado.manitol20.alerta}_`);
      t.push(`• *Salina 3%:* Bolus de ${resultado.salinaHipertonica3.volumeMl} (faixa: ${resultado.salinaHipertonica3.faixaBolus}) ou contínua ${resultado.salinaHipertonica3.infusaoContinua}`);
      t.push(`  ↳ _${resultado.salinaHipertonica3.alerta}_`);
      t.push(`• *Salina 20% (Resgate de Herniação):* ${resultado.salinaHipertonica20.volumeMl} em bolus rápido IV`);
      t.push("");

      if (resultado.salinaHipertonica3.preparo) {
        t.push("🧪 *Preparo de Salina 3% Beira-Leito:*");
        t.push(` • ${resultado.salinaHipertonica3.preparo.frasco500}`);
        t.push(` • ${resultado.salinaHipertonica3.preparo.frasco1000}`);
        t.push("");
      }

      if (resultado.osmolaridadeCalculada) {
        t.push(`🔬 *Osmolaridade Sérica Estimada:* ${resultado.osmolaridadeCalculada} mOsm/L (alvo seguro < 320 mOsm/L)`);
      }

      if (resultado.alertasOsmolares && resultado.alertasOsmolares.length > 0) {
        resultado.alertasOsmolares.forEach(function(a) {
          t.push(` ${a}`);
        });
        t.push("");
      }

      t.push("🛡️ *Neuroproteção Sistêmica:*");
      t.push(` • ${resultado.alertaGeral}`);
    }

    return t.join("\n");
  }

  return {
    avaliarTrombolise: avaliarTrombolise,
    calcularHic: calcularHic,
    formatarResumoAvc: formatarResumoAvc
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = NeurologiaAvcService;
  module.exports.NeurologiaAvcService = NeurologiaAvcService;
}
