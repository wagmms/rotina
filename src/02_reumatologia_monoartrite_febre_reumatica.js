/**
 * @file 02_reumatologia_monoartrite_febre_reumatica.js
 * @description Módulo de Reumatologia e Medicina de Emergência: Diagnóstico Diferencial de Monoartrite Aguda
 * (Análise do Líquido Sinovial, Artrite Séptica vs Gota/Cristais) e Manejo da Febre Reumática Aguda com
 * Critérios de Jones Revisados (AHA 2015 / SBP / SBC) e Profilaxia Secundária com Penicilina Benzatina.
 */

var ReumatologiaMonoartriteFebreReumaticaService = (function() {
    'use strict';

    /**
     * Análise do Líquido Sinovial e Diagnóstico Diferencial de Monoartrite Aguda
     * @param {Object} p Parâmetros clínicos e laboratoriais da artrocentese
     * @returns {Object} Diagnóstico, classificação do líquido, alertas e condutas terapêuticas
     */
    function analisarMonoartrite(p) {
        p = p || {};
        var res = {
            classificacao_liquido: "Indeterminada",
            categoria_efusao: "",
            diagnostico_provavel: [],
            artrite_septica_provavel: false,
            gota_confirmada: false,
            pseudogota_confirmada: false,
            coexistencia_alerta: false,
            conduta_artrocentese_drenagem: [],
            antimicrobianos_empiricos: [],
            manejo_gota_aguda: [],
            alertas_seguranca: [],
            bloqueios_iatrogenia: [],
            detalhes_laboratoriais: {}
        };

        var leucocitos = parseInt(p.leucocitos, 10);
        var pmn = parseFloat(p.neutrofilos_pct || p.pmn || p.pmn_pct);
        var glicoseSinovial = parseFloat(p.glicose_sinovial);
        var glicemiaSerica = parseFloat(p.glicemia_serica);
        var aspecto = String(p.aspecto || "").toLowerCase().trim();
        var gram = String(p.gram || "").toLowerCase().trim();
        var cristais = String(p.cristais || "").toLowerCase().trim();
        var idade = parseInt(p.idade, 10);
        var peso = parseFloat(p.peso);
        var clcr = parseFloat(p.clcr);
        var febre = !!(p.febre || p.temperatura >= 37.8);
        var articulacao = String(p.articulacao || "joelho").toLowerCase().trim();

        var gramPositivo = gram.indexOf("positivo") !== -1 || gram.indexOf("coco") !== -1 || gram.indexOf("bacilo") !== -1 || gram.indexOf("diplococo") !== -1;
        var temCocoseGramPositivos = gram.indexOf("coco") !== -1 && gram.indexOf("positivo") !== -1;
        var temDiplococosGramNegativos = (gram.indexOf("diplococo") !== -1 || gram.indexOf("neisseria") !== -1) && gram.indexOf("negativo") !== -1;
        var temBacilosGramNegativos = gram.indexOf("bacilo") !== -1 && gram.indexOf("negativo") !== -1;

        // Análise de cristais
        var cristaisUrato = cristais.indexOf("urato") !== -1 || 
                            cristais.indexOf("monossodico") !== -1 || 
                            cristais.indexOf("agulha") !== -1 || 
                            cristais.indexOf("birrefringencia negativa") !== -1 || 
                            cristais.indexOf("birrefringência negativa") !== -1 ||
                            cristais.indexOf("gota") !== -1;

        var cristaisPirofosfato = cristais.indexOf("pirofosfato") !== -1 || 
                                  cristais.indexOf("cppd") !== -1 || 
                                  cristais.indexOf("romboide") !== -1 || 
                                  cristais.indexOf("rombóide") !== -1 || 
                                  cristais.indexOf("pseudogota") !== -1 ||
                                  cristais.indexOf("birrefringencia positiva") !== -1 ||
                                  cristais.indexOf("birrefringência positiva") !== -1;

        if (cristaisUrato) res.gota_confirmada = true;
        if (cristaisPirofosfato) res.pseudogota_confirmada = true;

        // Classificação do Líquido Sinovial
        var purulento = aspecto.indexOf("purulento") !== -1 || aspecto.indexOf("pus") !== -1 || aspecto.indexOf("arroz") !== -1 || aspecto.indexOf("leitoso") !== -1;
        var hemorragico = aspecto.indexOf("hemorragico") !== -1 || aspecto.indexOf("hemorrágico") !== -1 || aspecto.indexOf("sangue") !== -1 || aspecto.indexOf("xantocromico") !== -1 || aspecto.indexOf("xantocrômico") !== -1;
        var turvo = aspecto.indexOf("turvo") !== -1 || aspecto.indexOf("opalescente") !== -1;
        var transparente = aspecto.indexOf("transparente") !== -1 || aspecto.indexOf("claro") !== -1 || aspecto.indexOf("amarelo citrino") !== -1;

        var razaoGlicoseBaixa = false;
        if (!isNaN(glicoseSinovial) && !isNaN(glicemiaSerica) && glicemiaSerica > 0) {
            var razaoGlicose = glicoseSinovial / glicemiaSerica;
            res.detalhes_laboratoriais.razao_glicose_sinovial_serica = (razaoGlicose * 100).toFixed(1) + "%";
            if (razaoGlicose < 0.50) {
                razaoGlicoseBaixa = true;
            }
        }

        if (hemorragico) {
            res.classificacao_liquido = "Hemorrágico (Grupo IV)";
            res.categoria_efusao = "Hemorrágica";
            res.diagnostico_provavel.push("Hemartrose traumática (fratura intra-articular, lesão ligamentar ou meniscal)");
            res.diagnostico_provavel.push("Coagulopatia / uso de anticoagulantes / hemofilia");
            res.diagnostico_provavel.push("Sinovite vilonodular pigmentada / tumor sinovial");
        } else if ((!isNaN(leucocitos) && leucocitos > 50000) || purulento || gramPositivo) {
            res.classificacao_liquido = "Séptico / Infeccioso (Grupo III)";
            res.categoria_efusao = "Séptica";
            res.artrite_septica_provavel = true;
            res.diagnostico_provavel.push("Artrite Séptica Bacteriana (EMERGÊNCIA MÉDICA ORTOPÉDICA)");
        } else if ((!isNaN(leucocitos) && leucocitos >= 2000) || turvo || (!isNaN(pmn) && pmn > 50) || res.gota_confirmada || res.pseudogota_confirmada) {
            res.classificacao_liquido = "Inflamatório (Grupo II)";
            res.categoria_efusao = "Inflamatória";
            if (res.gota_confirmada) {
                res.diagnostico_provavel.push("Artrite Gotosa Aguda (Gota por Cristais de Urato Monossódico)");
            } else if (res.pseudogota_confirmada) {
                res.diagnostico_provavel.push("Pseudogota / Artropatia por Pirofosfato de Cálcio (CPPD)");
            } else {
                res.diagnostico_provavel.push("Artrite Inflamatória / Microcristalina provável");
                res.diagnostico_provavel.push("Espondiloartropatia ou Artrite Reumatoide em manifestação monoarticular");
            }
            if (razaoGlicoseBaixa || febre || (!isNaN(leucocitos) && leucocitos >= 35000)) {
                res.diagnostico_provavel.push("Atenção: Não afasta Artrite Séptica inicial ou gonocócica (celularidade pode ser < 50.000 em gonococo ou imunossuprimidos)");
            }
        } else if ((!isNaN(leucocitos) && leucocitos >= 200) || transparente) {
            res.classificacao_liquido = "Não-inflamatório / Mecânico (Grupo I)";
            res.categoria_efusao = "Mecânica";
            res.diagnostico_provavel.push("Osteoartrite / Osteoartrose com derrame articular mecânico");
            res.diagnostico_provavel.push("Trauma articular leve / meniscopatia mecânica");
            res.diagnostico_provavel.push("Osteonecrose asséptica");
        } else {
            res.classificacao_liquido = "Normal (< 200 leucócitos/mm³, límpido, viscoso)";
            res.categoria_efusao = "Normal";
            res.diagnostico_provavel.push("Líquido sinovial dentro dos padrões da normalidade");
        }

        // Alerta Sentinela de Coexistência: Gota + Artrite Séptica
        if ((res.gota_confirmada || res.pseudogota_confirmada) && (res.artrite_septica_provavel || (!isNaN(leucocitos) && leucocitos >= 50000) || febre || gramPositivo)) {
            res.coexistencia_alerta = true;
            res.alertas_seguranca.push("🚨 ALERTA CRÍTICO DE COEXISTÊNCIA: A identificação de cristais de urato/pirofosfato NÃO exclui Artrite Séptica bacteriana sobreposta! Leucocitose muito elevada, febre ou Gram positivo exigem tratamento como infecção articular ativa até resultado definitivo de culturas.");
        }

        // Condutas de Drenagem e Abordagem Articular
        if (res.artrite_septica_provavel || res.coexistencia_alerta) {
            res.conduta_artrocentese_drenagem.push("🚨 EMERGÊNCIA MÉDICA: Risco iminente de lise condrocítica e destruição articular permanente em 24-48 horas se não descomprimida.");
            res.conduta_artrocentese_drenagem.push("1. Artrocentese evacuadora completa imediata (enviar amostra para bacterioscopia Gram, cultura quantitativa para aeróbios e anaeróbios e antibiograma antes do início do ATB, a menos que haja sepse/choque).");
            
            if (articulacao.indexOf("quadril") !== -1 || articulacao.indexOf("ombro") !== -1 || articulacao.indexOf("axial") !== -1 || p.protese_articular) {
                res.conduta_artrocentese_drenagem.push("2. Avaliação Ortopédica URGENTE para drenagem cirúrgica (artroscopia ou artrotomia aberta). Em articulações profundas (quadril/ombro) ou presença de prótese articular, a drenagem cirúrgica aberta/artroscópica é mandatória.");
            } else {
                res.conduta_artrocentese_drenagem.push("2. Em grandes articulações periféricas facilmente acessíveis (joelho): realizar artrocentese evacuadora diária por agulha enquanto persistir derrame tenso. Se houver loculação, líquido espesso irremovível ou ausência de resposta em 48-72h, indicar artroscopia/artrotomia cirúrgica imediata.");
            }
            res.conduta_artrocentese_drenagem.push("3. Imobilização articular temporária em posição funcional nos primeiros 2 a 3 dias para analgesia; iniciar mobilização passiva suave precoce logo após controle da dor para evitar anquilose.");
        }

        // Esquemas Antimicrobianos Empíricos Escalonados
        if (res.artrite_septica_provavel || res.coexistencia_alerta || temCocoseGramPositivos || temDiplococosGramNegativos) {
            var sexualmenteAtivo = !!(p.sexualmente_ativo || p.jovem || (!isNaN(idade) && idade >= 15 && idade <= 40));
            var riscoMrsa = !!(p.risco_mrsa || p.hemodialise || p.drogas_iv || p.hospitalizacao_recente || p.lesao_pele_supurativa);
            var riscoBgn = !!(p.idoso || (!isNaN(idade) && idade >= 65) || p.imunossuprimido || p.diabetes || p.manipulacao_urinaria);

            if (temDiplococosGramNegativos || (sexualmenteAtivo && !riscoMrsa && !temCocoseGramPositivos)) {
                res.antimicrobianos_empiricos.push({
                    esquema: "Ceftriaxona 1g a 2g IV a cada 24 horas + Azitromicina 1g VO dose única",
                    indicacao: "Suspeita de Artrite Gonocócica Disseminada (Neisseria gonorrhoeae em adulto jovem sexualmente ativo) e cobertura de Chlamydia concomitante.",
                    duracao: "Ceftriaxona por 7 a 14 dias (pelo menos 24-48h pós-melhora clínica expressiva antes de descalonar)."
                });
            }

            if (riscoMrsa) {
                var doseVanco = "Vancomicina 15 a 20 mg/kg IV a cada 12 horas (dose de ataque de 25-30 mg/kg em casos graves com sepse; monitorar nível de vale sérico alvo 15-20 mcg/mL ou AUC/MIC 400-600)";
                if (!isNaN(peso) && peso > 0) {
                    var calcVanco = Math.round(peso * 15);
                    doseVanco += " [Para " + peso + " kg: aproximadamente " + calcVanco + " mg IV 12/12h]";
                }
                res.antimicrobianos_empiricos.push({
                    esquema: doseVanco + " (ou Daptomicina 6 a 8 mg/kg IV 1x/dia)",
                    indicacao: "Cobertura de Staphylococcus aureus resistente à meticilina (MRSA) em paciente de alto risco.",
                    duracao: "Mínimo de 3 a 4 semanas de antibioticoterapia guiada por resposta clínica e queda de provas inflamatórias."
                });
            } else if (!temDiplococosGramNegativos) {
                res.antimicrobianos_empiricos.push({
                    esquema: "Oxacilina 2g IV a cada 4 horas (ou Cefazolina 2g IV a cada 8 horas)",
                    indicacao: "Adulto padrão sem fatores de risco para MRSA: cobertura de Staphylococcus aureus sensível (MSSA) e Streptococcus spp.",
                    duracao: "3 a 4 semanas (mínimo de 14 dias intravenosos antes de avaliar conversão para VO sob antibiograma)."
                });
            }

            if (riscoBgn) {
                res.antimicrobianos_empiricos.push({
                    esquema: "Associar Ceftriaxona 2g IV 1x/dia (ou Cefepime 2g IV 8/8h se risco de Pseudomonas aeruginosa / imunodepressão grave)",
                    indicacao: "Cobertura ampliada para Bacilos Gram-Negativos (BGN entéricos / Pseudomonas) em idosos, diabéticos e imunossuprimidos.",
                    duracao: "3 a 4 semanas ajustado conforme culturas."
                });
            }
        }

        // Manejo de Crise Aguda de Gota
        if (res.gota_confirmada || (res.categoria_efusao === "Inflamatória" && !res.artrite_septica_provavel)) {
            var temInsuficienciaRenal = (!isNaN(clcr) && clcr < 30) || p.insuficiencia_renal;
            var temContraindicacaoAine = temInsuficienciaRenal || p.ulcera_peptica || p.sangramento_ativo || p.insuficiencia_cardiaca_grave || (!isNaN(idade) && idade >= 75);

            if (!temContraindicacaoAine) {
                res.manejo_gota_aguda.push({
                    linha: "1ª Linha (Se função renal e gástrica preservadas)",
                    medicamento: "AINE Potente em dose plena precoce:",
                    medicacao: "AINE Potente em dose plena precoce:",
                    posologia: "• Naproxeno 500 mg VO 12/12h (ou Cetoprofeno 100 mg VO 12/12h ou Indometacina 50 mg VO 8/8h) por 5 a 7 dias, descontinuando após alívio completo da dor."
                });
            } else {
                res.bloqueios_iatrogenia.push("🛑 AINE CONTRAINDICADO: Presença de disfunção renal (ClCr < 30-60 mL/min), risco hemorrágico gástrico ou idade avançada. Preferir corticoterapia sistêmica.");
            }

            // Colchicina (regime de baixa dose do guideline ACR / FDA)
            if (!temInsuficienciaRenal) {
                res.manejo_gota_aguda.push({
                    linha: "1ª Linha Alternativa / Preferencial Precoce (até 24-36h do início)",
                    medicamento: "Colchicina em Baixa Dose (Regime Rápido ACR):",
                    medicacao: "Colchicina em Baixa Dose (Regime Rápido ACR):",
                    posologia: "• 1,0 mg VO (2 comprimidos de 0,5 mg) de ataque imediato, seguido de 0,5 mg VO após 1 hora (dose total de 1,5 mg no 1º dia).\n• A partir do 2º dia: 0,5 mg VO 1 a 2x/dia até a resolução do quadro agudo."
                });
            } else {
                res.bloqueios_iatrogenia.push("⚠️ COLCHICINA EM DOSE REDUZIDA / CUIDADO: Em ClCr < 30 mL/min, usar no máximo 0,5 mg em dose única e não repetir antes de 14 dias pelo risco de toxicidade neuromuscular grave. Evitar associação com inibidores fortes de CYP3A4 ou P-gp.");
            }

            // Corticoterapia Sistêmica (Droga de escolha em idosos / renais)
            res.manejo_gota_aguda.push({
                linha: "Droga de Escolha em Renais / Idosos / Contraindicações a AINEs",
                medicamento: "Prednisona Oral (ou Metilprednisolona):",
                medicacao: "Prednisona Oral (ou Metilprednisolona):",
                posologia: "• Prednisona 30 a 40 mg/dia VO em dose única matinal por 5 dias, seguido de desmame rápido em mais 5 dias (ou cessação direta se crise controlada)."
            });

            // Regra de Ouro do Alopurinol
            res.bloqueios_iatrogenia.push("⚖️ REGRA DE OURO DO ALOPURINOL / REDUTORES DE URATO:\n• NÃO suspender o Alopurinol se o paciente já estiver em uso crônico diário prévio à crise!\n• NÃO iniciar Alopurinol durante a crise aguda de gota (variações bruscas da uricemia perpetuam e agravam a inflamação sinovial). Aguardar 2 a 4 semanas após o término da crise para introduzir o fármaco com profilaxia de colchicina 0,5 mg/dia.");
        }

        return res;
    }

    /**
     * Avaliação Diagnóstica e Conduta na Febre Reumática Aguda (Critérios de Jones Revisados AHA 2015 / SBP / SBC)
     * e Manejo da Profilaxia Secundária com Penicilina G Benzatina
     * @param {Object} p Dados clínicos, laboratoriais e antecedentes
     * @returns {Object} Diagnóstico formal, critérios preenchidos, posologia de erradicação, anti-inflamatório e profilaxia secundária
     */
    function avaliarFebreReumatica(p) {
        p = p || {};
        var res = {
            diagnostico_confirmado: false,
            categoria_risco: "Alto Risco (Endêmico Brasil / América Latina)",
            criterios_maiores_preenchidos: [],
            criterios_menores_preenchidos: [],
            infeccao_estreptococica_evidenciada: false,
            tipo_caso: "Primeiro Episódio",
            esquema_erradicacao_gas: {},
            manejo_antiinflamatorio_fase_aguda: {},
            profilaxia_secundaria: {},
            alertas_clinicos: [],
            bloqueios_seguranca: []
        };

        var populacaoAltoRisco = p.populacao_risco !== "baixo"; // Padrão Brasil/América Latina é alto risco epidemiológico
        res.categoria_risco = populacaoAltoRisco ? "População de Moderado/Alto Risco (Padrão Brasil)" : "População de Baixo Risco";

        var peso = parseFloat(p.peso) || 0;
        var idade = parseInt(p.idade, 10);
        var alergiaPenicilina = !!(p.alergia_penicilina || p.alergico_penicilina);
        var recidiva = !!(p.recidiva || p.episodio_previo || p.historia_fr);
        res.tipo_caso = recidiva ? "Recidiva em Paciente com Febre Reumática Prévia" : "Primeiro Episódio Suspeito";

        // 1. Evidência de Infecção Estreptocócica Prévia (Streptococcus pyogenes do Grupo A - GAS)
        var asloElevada = !!(p.aslo_elevada || p.aslo_alta || (parseFloat(p.aslo) > 200));
        var culturaOrofaringePositiva = !!(p.cultura_positiva || p.cultura_orofaringe);
        var testeRapidoPositivo = !!(p.teste_rapido_positivo || p.strep_test_positivo);
        var escarlatinaRecente = !!(p.escarlatina || p.escarlatina_recente);

        if (asloElevada || culturaOrofaringePositiva || testeRapidoPositivo || escarlatinaRecente || p.infeccao_estreptococica_previa) {
            res.infeccao_estreptococica_evidenciada = true;
        }

        // 2. Critérios Maiores
        // a. Cardite (clínica ou subclínica ao ecocardiograma com valvulite mitral/aórtica)
        if (p.cardite || p.valvulite || p.sopro_cardiaco_novo || p.eco_valvulite) {
            res.criterios_maiores_preenchidos.push("Cardite (clínica ou subclínica ao ecocardiograma Doppler)");
        }

        // b. Artrite
        // Em populações de alto risco: poliartrite migratória, monoartrite ou poliartralgia contam como critério maior
        var temArtrite = false;
        var artriteTipo = String(p.artrite || "").toLowerCase();
        if (artriteTipo.indexOf("migratoria") !== -1 || artriteTipo.indexOf("migratória") !== -1 || artriteTipo.indexOf("poliartrite") !== -1 || p.poliartrite) {
            temArtrite = true;
            res.criterios_maiores_preenchidos.push("Artrite (Poliartrite migratória de grandes articulações)");
        } else if (populacaoAltoRisco && (artriteTipo.indexOf("monoartrite") !== -1 || p.monoartrite)) {
            temArtrite = true;
            res.criterios_maiores_preenchidos.push("Artrite (Monoartrite - critério maior aceito em populações de alto risco)");
        } else if (populacaoAltoRisco && (artriteTipo.indexOf("poliartralgia") !== -1 || p.poliartralgia)) {
            temArtrite = true;
            res.criterios_maiores_preenchidos.push("Artrite / Poliartralgia (critério maior em população de alto risco)");
        }

        // c. Coreia de Sydenham (manifestação tardia isolada com diagnóstico presuntivo)
        if (p.coreia || p.coreia_sydenham || p.movimentos_involuntarios) {
            res.criterios_maiores_preenchidos.push("Coreia de Sydenham (movimentos coreiformes involuntários)");
        }

        // d. Eritema Marginado
        if (p.eritema_marginado || p.eritema_marginatum) {
            res.criterios_maiores_preenchidos.push("Eritema marginado (lesões eritematosas circulares com bordas nítidas e centro claro)");
        }

        // e. Nódulos Subcutâneos
        if (p.nodulos_subcutaneos || p.nodulos) {
            res.criterios_maiores_preenchidos.push("Nódulos subcutâneos (firmes, indolores, sobre superfícies extensoras e proeminências ósseas)");
        }

        // 3. Critérios Menores
        // a. Artralgia (não pode ser contada se artrite já foi usada como critério maior)
        if (!temArtrite && (p.artralgia || p.monoartralgia || (populacaoAltoRisco && p.monoartralgia))) {
            res.criterios_menores_preenchidos.push("Artralgia (Monoartralgia em alto risco ou Poliartralgia em baixo risco)");
        }

        // b. Febre
        var temp = parseFloat(p.temperatura);
        var temFebre = p.febre || (!isNaN(temp) && ((populacaoAltoRisco && temp >= 38.0) || (!populacaoAltoRisco && temp >= 38.5)));
        if (temFebre) {
            res.criterios_menores_preenchidos.push("Febre (" + (populacaoAltoRisco ? "≥ 38,0 °C em alto risco" : "≥ 38,5 °C em baixo risco") + ")");
        }

        // c. Marcadores Inflamatórios de Fase Aguda
        var vhs = parseFloat(p.vhs);
        var pcr = parseFloat(p.pcr);
        var pcrUnidade = String(p.pcr_unidade || "mg_dl").toLowerCase();
        var pcrElevado = false;
        if (!isNaN(pcr)) {
            if (pcrUnidade.indexOf("l") !== -1 || pcr > 15) { // mg/L
                pcrElevado = pcr >= 30;
            } else { // mg/dL
                pcrElevado = pcr >= 3.0;
            }
        }
        var vhsElevado = !isNaN(vhs) && vhs >= 30; // limiar 30 mm/h em alto risco
        if (vhsElevado || pcrElevado || p.reagentes_fase_aguda_elevados) {
            res.criterios_menores_preenchidos.push("Provas inflamatórias elevadas (VHS ≥ 30 mm/h ou PCR ≥ 3,0 mg/dL / ≥ 30 mg/L)");
        }

        // d. Intervalo PR Prolongado no ECG (se cardite não foi usada como critério maior)
        var temCardite = res.criterios_maiores_preenchidos.some(function(c) { return c.indexOf("Cardite") !== -1; });
        if (!temCardite && (p.pr_prolongado || p.bloqueio_av_1_grau)) {
            res.criterios_menores_preenchidos.push("Intervalo PR prolongado no ECG para a idade (apenas se cardite não for critério maior)");
        }

        // 4. Regra de Confirmação Diagnóstica (AHA 2015)
        var nMaiores = res.criterios_maiores_preenchidos.length;
        var nMenores = res.criterios_menores_preenchidos.length;
        var temCoreiaIsolada = res.criterios_maiores_preenchidos.some(function(c) { return c.indexOf("Coreia") !== -1; });

        if (temCoreiaIsolada) {
            // Coreia de Sydenham isolada pode diagnosticar Febre Reumática mesmo sem evidência laboratorial de GAS
            res.diagnostico_confirmado = true;
            res.alertas_clinicos.push("💡 Coreia de Sydenham isolada autoriza o diagnóstico presuntivo de Febre Reumática, visto que ocorre semanas a meses após a faringoamigdalite quando os títulos de ASLO já podem ter retornado ao basal.");
        } else if (res.infeccao_estreptococica_evidenciada) {
            if (!recidiva) {
                // 1º Episódio: 2 Maiores OU 1 Maior + 2 Menores
                if (nMaiores >= 2 || (nMaiores >= 1 && nMenores >= 2)) {
                    res.diagnostico_confirmado = true;
                }
            } else {
                // Recidiva: 2 Maiores OU 1 Maior + 2 Menores OU 3 Menores
                if (nMaiores >= 2 || (nMaiores >= 1 && nMenores >= 2) || nMenores >= 3) {
                    res.diagnostico_confirmado = true;
                }
            }
        }

        if (!res.diagnostico_confirmado) {
            if (!res.infeccao_estreptococica_evidenciada) {
                res.alertas_clinicos.push("⚠️ AUSÊNCIA DE PROVA DE INFECÇÃO ESTREPTOCÓCICA PRÉVIA: Critérios de Jones exigem comprovação de estreptococcia recente (ASLO elevada, cultura ou teste rápido positivo). Solicitar recoleta de ASLO em 14 dias para avaliar curva ascendente.");
            } else {
                res.alertas_clinicos.push("ℹ️ Critérios clínicos e laboratoriais insuficientes para confirmação formal no momento (Necessário: 2 Maiores OU 1 Maior + 2 Menores). Manter vigilância e ecocardiograma.");
            }
        }

        // 5. Esquema de Erradicação do GAS (Fase Aguda)
        var doseBenzatina = (peso > 0 && peso < 27) ? "600.000 UI" : "1.200.000 UI";
        if (alergiaPenicilina) {
            res.esquema_erradicacao_gas = {
                medicamento: "Eritromicina (Estearato ou Etilsuccinato) ou Azitromicina",
                posologia: (peso > 0 && peso < 27) 
                    ? "• Eritromicina 40 mg/kg/dia VO fracionada de 6/6h por 10 dias (ou Azitromicina 12 mg/kg/dia VO 1x/dia por 5 dias)."
                    : "• Eritromicina 250 a 500 mg VO de 6/6h por 10 dias (ou Azitromicina 500 mg VO 1x/dia por 5 dias).",
                observacao: "Alternativa formal em caso de anafilaxia ou hipersensibilidade documentada à penicilina."
            };
        } else {
            res.esquema_erradicacao_gas = {
                medicamento: "Penicilina G Benzatina IM profunda dose única",
                posologia: "• " + doseBenzatina + " IM profunda em glúteo (600.000 UI se < 27 kg; 1.200.000 UI se ≥ 27 kg).",
                observacao: "Obrigatória em todos os pacientes confirmados ou sob forte suspeita, mesmo que assintomáticos da orofaringe."
            };
        }

        // 6. Manejo Anti-inflamatório da Fase Aguda
        if (temCardite) {
            var dosePrednisona = "Prednisona 1 a 2 mg/kg/dia VO (máximo 60 a 80 mg/dia) em dose única matinal";
            if (peso > 0) {
                var calcPred = Math.min(Math.round(peso * 1.5), 80);
                dosePrednisona += " [Para " + peso + " kg: cerca de " + calcPred + " mg/dia]";
            }
            res.manejo_antiinflamatorio_fase_aguda = {
                indicacao: "Cardite Reumática Moderada a Severa:",
                medicamento: "Corticoterapia Sistêmica (Prednisona):",
                posologia: dosePrednisona + " por 2 a 3 semanas. Iniciar redução gradual de 20-25% a cada semana ao longo de 2 a 4 semanas até suspensão total.",
                alerta: "Associar repouso no leito; em casos graves com insuficiência cardíaca refratária, internar em UTI pediátrica/adulta e avaliar pulsoterapia com Metilprednisolona."
            };
        } else if (temArtrite) {
            var doseAas = "AAS (Ácido Acetilsalicílico) 80 a 100 mg/kg/dia fracionado a cada 6 horas (máximo 4.000 a 6.000 mg/dia)";
            if (peso > 0) {
                var calcAas = Math.min(Math.round(peso * 80), 4000);
                doseAas += " [Para " + peso + " kg: cerca de " + calcAas + " mg/dia dividido de 6/6h]";
            }
            res.manejo_antiinflamatorio_fase_aguda = {
                indicacao: "Artrite Reumática Isolada (Sem Cardite):",
                medicamento: "AAS em Dose Anti-inflamatória Plena:",
                posologia: doseAas + " por 1 a 2 semanas. Após resposta clínica dramática e normalização térmica, reduzir para 60 mg/kg/dia por mais 2 a 4 semanas.",
                alerta: "A resposta articular ao AAS é tipicamente dramática em 24-48 horas. Ausência de resposta ao AAS em 72h deve levantar dúvida sobre o diagnóstico de febre reumática."
            };
        } else {
            res.manejo_antiinflamatorio_fase_aguda = {
                indicacao: "Forma sem artrite evidente e sem cardite (ex: Coreia isolada):",
                posologia: "Tratamento de suporte e repouso; se coreia incapacitante, usar Haloperidol (0,5 a 2 mg/dia) ou Ácido Valproico (15 a 30 mg/kg/dia)."
            };
        }

        // 7. Profilaxia Secundária e Duração Estratificada
        var valvulopatiaResidual = !!(p.valvulopatia_residual || p.lesao_valvar_cronica || p.cirurgia_valvar);
        var duracaoProfilaxia = "";
        var justificativaDuracao = "";

        if (valvulopatiaResidual) {
            duracaoProfilaxia = "Até os 40 anos de idade OU por toda a vida (vitalícia)";
            justificativaDuracao = "Presença de cardiopatia reumática crônica residual documentada ou prótese valvar. Manter profilaxia contínua vitalícia em pacientes com exposição de alto risco (profissionais de saúde, professores de creche, aglomerados urbanos).";
        } else if (temCardite || p.cardite_previa_curada) {
            duracaoProfilaxia = "Até os 25 anos de idade OU por 10 anos após o último surto (o que for mais longo)";
            justificativaDuracao = "História de cardite na fase aguda, mas sem sequela valvar residual ao ecocardiograma pós-recuperação.";
        } else {
            duracaoProfilaxia = "Até os 21 anos de idade OU por 5 anos após o último surto (o que for mais longo)";
            justificativaDuracao = "Febre Reumática sem cardite (artrite isolada ou coreia sem acometimento valvar).";
        }

        var posologiaProfilaxia = "";
        if (alergiaPenicilina) {
            posologiaProfilaxia = (peso > 0 && peso < 27) 
                ? "Sulfadiazina 500 mg VO 1x/dia (ou Eritromicina 250 mg VO 12/12h)"
                : "Sulfadiazina 1.000 mg (1g) VO 1x/dia (ou Eritromicina 250 mg VO 12/12h)";
        } else {
            posologiaProfilaxia = "Penicilina G Benzatina " + doseBenzatina + " IM profunda a cada 21 dias (intervalo de ouro no Brasil / áreas de alta prevalência).";
        }

        res.profilaxia_secundaria = {
            medicamento_escolha: alergiaPenicilina ? "Sulfadiazina VO diária" : "Penicilina G Benzatina IM profunda",
            intervalo: alergiaPenicilina ? "Dose diária contínua" : "A cada 21 dias (ou no máximo 4 semanas; 21 dias é o padrão-ouro SBC/SBP)",
            posologia: posologiaProfilaxia,
            duracao_recomendada: duracaoProfilaxia,
            justificativa: justificativaDuracao
        };

        return res;
    }

    /**
     * Formata saída para visualização no Telegram - Monoartrite Aguda
     */
    function formatarMonoartriteTelegram(r) {
        var t = "🦴 *DIAGNÓSTICO DIFERENCIAL DE MONOARTRITE AGUDA*\n";
        t += "───────────────────────────────\n";
        t += "🧪 *Padrão do Líquido Sinovial:* " + r.classificacao_liquido + "\n";
        
        if (r.diagnostico_provavel && r.diagnostico_provavel.length > 0) {
            t += "\n📋 *Hipóteses Diagnósticas:* \n";
            r.diagnostico_provavel.forEach(function(d) {
                t += "• " + d + "\n";
            });
        }

        if (r.alertas_seguranca && r.alertas_seguranca.length > 0) {
            t += "\n" + r.alertas_seguranca.join("\n\n") + "\n";
        }

        if (r.conduta_artrocentese_drenagem && r.conduta_artrocentese_drenagem.length > 0) {
            t += "\n🎯 *Conduta Articular e Drenagem:*\n";
            t += r.conduta_artrocentese_drenagem.join("\n") + "\n";
        }

        if (r.antimicrobianos_empiricos && r.antimicrobianos_empiricos.length > 0) {
            t += "\n💊 *Antibioticoterapia Empírica IV:*\n";
            r.antimicrobianos_empiricos.forEach(function(a) {
                t += "• *" + a.indicacao + "*\n";
                t += "  " + a.esquema + "\n";
                t += "  _Duração:_ " + a.duracao + "\n\n";
            });
        }

        if (r.manejo_gota_aguda && r.manejo_gota_aguda.length > 0) {
            t += "🦶 *Manejo Beira-Leito da Crise de Gota:*\n";
            r.manejo_gota_aguda.forEach(function(m) {
                t += "• *" + m.linha + "*\n";
                t += "  " + m.posologia + "\n\n";
            });
        }

        if (r.bloqueios_iatrogenia && r.bloqueios_iatrogenia.length > 0) {
            t += "🛑 *Bloqueios de Iatrogenia e Cuidados:*\n";
            t += r.bloqueios_iatrogenia.join("\n\n") + "\n";
        }

        return t.trim();
    }

    /**
     * Formata saída para visualização no Telegram - Febre Reumática
     */
    function formatarFebreReumaticaTelegram(r) {
        var t = "❤️‍🩹 *FEBRE REUMÁTICA AGUDA & CRITÉRIOS DE JONES (AHA/SBP)*\n";
        t += "───────────────────────────────\n";
        t += "📌 *Status Diagnóstico:* " + (r.diagnostico_confirmado ? "✅ CONFIRMADO" : "⚠️ NÃO CONFIRMADO") + "\n";
        t += "🌐 *Estratificação:* " + r.categoria_risco + " (" + r.tipo_caso + ")\n";
        t += "🔬 *Infecção Estreptocócica:* " + (r.infeccao_estreptococica_evidenciada ? "Comprovada (GAS+ / ASLO+)" : "Pendente/Não evidenciada") + "\n\n";

        t += "⭐ *Critérios Maiores Preenchidos (" + r.criterios_maiores_preenchidos.length + "):*\n";
        if (r.criterios_maiores_preenchidos.length > 0) {
            r.criterios_maiores_preenchidos.forEach(function(c) { t += "  • " + c + "\n"; });
        } else {
            t += "  _Nenhum critério maior identificado._\n";
        }

        t += "\n🔹 *Critérios Menores Preenchidos (" + r.criterios_menores_preenchidos.length + "):*\n";
        if (r.criterios_menores_preenchidos.length > 0) {
            r.criterios_menores_preenchidos.forEach(function(c) { t += "  • " + c + "\n"; });
        } else {
            t += "  _Nenhum critério menor identificado._\n";
        }

        if (r.alertas_clinicos && r.alertas_clinicos.length > 0) {
            t += "\n📢 *Alertas Clínicos:*\n" + r.alertas_clinicos.join("\n") + "\n";
        }

        t += "\n🦠 *1. Erradicação de Orofaringe (Streptococcus pyogenes):*\n";
        t += "• " + r.esquema_erradicacao_gas.medicamento + "\n";
        t += "  " + r.esquema_erradicacao_gas.posologia + "\n";

        if (r.manejo_antiinflamatorio_fase_aguda && r.manejo_antiinflamatorio_fase_aguda.posologia) {
            t += "\n🔥 *2. Controle Anti-inflamatório da Fase Aguda:*\n";
            t += "• *" + r.manejo_antiinflamatorio_fase_aguda.indicacao + "*\n";
            t += "  " + r.manejo_antiinflamatorio_fase_aguda.posologia + "\n";
            if (r.manejo_antiinflamatorio_fase_aguda.alerta) {
                t += "  _" + r.manejo_antiinflamatorio_fase_aguda.alerta + "_\n";
            }
        }

        t += "\n🛡️ *3. Profilaxia Secundária Obrigatória (Prevenção de Recidivas):*\n";
        t += "• *Medicamento:* " + r.profilaxia_secundaria.medicamento_escolha + "\n";
        t += "• *Posologia:* " + r.profilaxia_secundaria.posologia + "\n";
        t += "• *Frequência:* " + r.profilaxia_secundaria.intervalo + "\n";
        t += "• *Duração Recomendada:* *" + r.profilaxia_secundaria.duracao_recomendada + "*\n";
        t += "• *Fundamento:* " + r.profilaxia_secundaria.justificativa + "\n";

        return t.trim();
    }

    return {
        analisarMonoartrite: analisarMonoartrite,
        avaliarFebreReumatica: avaliarFebreReumatica,
        formatarMonoartriteTelegram: formatarMonoartriteTelegram,
        formatarFebreReumaticaTelegram: formatarFebreReumaticaTelegram
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReumatologiaMonoartriteFebreReumaticaService;
}
