/**
 * Módulo de Nefrologia Intensiva e Distúrbios Hidroeletrolíticos (DHE)
 * Motor determinístico para correção de sódio (hipo/hipernatremia) e potássio (hipo/hipercalemia).
 */

var NefrologiaDheService = (function() {
    "use strict";

    function parseNum(val) {
        if (val === undefined || val === null || val === "") return NaN;
        if (typeof val === "number") return val;
        return parseFloat(String(val).trim().replace(",", "."));
    }

    // --- CÁLCULO DE ÁGUA CORPORAL TOTAL (ACT) ---
    // PROIBIDO assumir 70kg silenciosamente! Se peso for inválido, retorna null.
    function calcularACT(peso, sexo, idade) {
        var p = parseNum(peso);
        if (isNaN(p) || p < 0.5 || p > 300) return null;

        var id = (idade !== undefined && idade !== null && idade !== "") ? parseNum(idade) : 40;
        if (isNaN(id) || id < 0 || id > 120) return null;

        var s = sexo ? String(sexo).toLowerCase().trim() : "m";
        var isFem = (s === "f" || s === "feminino" || s === "mulher" || s === "fem");

        var fator = isFem ? (id >= 65 ? 0.45 : 0.5) : (id >= 65 ? 0.5 : 0.6);
        return Math.max(0.1, p * fator);
    }

    // --- HIPONATREMIA ---
    function calcularDeficitSodio(naAtual, naAlvo, peso, sexo, idade) {
        var naAt = parseNum(naAtual);
        var naAl = parseNum(naAlvo);
        if (isNaN(naAt) || isNaN(naAl) || naAt < 90 || naAt > 220 || naAl < 90 || naAl > 220) {
            return { erro: "Valores de sódio fora da faixa biologicamente plausível (90 a 220 mEq/L)." };
        }
        if (naAt >= naAl) return { erro: "Na atual >= Na alvo. Sem déficit de sódio." };

        var act = calcularACT(peso, sexo, idade);
        if (!act) {
            return { erro: "Peso obrigatório ou fora da faixa fisiológica (informe entre 0,5 e 300 kg). Proibido estimar peso padrão para correção de sódio." };
        }

        var deficitSodio = act * (naAl - naAt);
        var alertas = [];
        var pNum = parseNum(peso);
        if (pNum > 150) {
            alertas.push("⚠️ OBESIDADE SEVERA (> 150 kg): O tecido adiposo tem teor reduzido de água. O cálculo com peso real superestima a Água Corporal Total (ACT). Recomenda-se cautela para evitar sobrecarga volêmica.");
        }
        if (pNum < 2.0) {
            alertas.push("⚠️ RECÉM-NASCIDO / LACTENTE (< 2 kg): Água corporal proporcionalmente elevada (~75-80%). Monitoração estrita de sódio a cada 2-4h pelo risco extremo de edema cerebral.");
        }

        return {
            act: Math.round(act * 10) / 10,
            deficitSodioMEq: Math.round(deficitSodio),
            alertas: alertas
        };
    }

    function planejarCorrecaoHiponatremia(naAtual, peso, sexo, idade, salinaSendoUsada) {
        var sUsada = salinaSendoUsada !== undefined ? parseNum(salinaSendoUsada) : 3;
        var concentracaoSalina = sUsada === 3 ? 513 : (sUsada === 0.9 ? 154 : null);
        if (!concentracaoSalina) {
            return { erro: "Concentração de salina inválida (use 3 para NaCl 3% ou 0.9 para NaCl 0.9%)." };
        }

        var na = parseNum(naAtual);
        if (isNaN(na) || na < 90 || na > 220) {
            return { erro: "Valor de sódio atual fora da faixa biologicamente plausível (90 a 220 mEq/L). Confira o exame." };
        }
        if (na >= 135 && sUsada === 3) {
            return { erro: "Sódio atual (" + na + " mEq/L) não configura hiponatremia (< 135 mEq/L) para uso de Salina Hipertônica 3%." };
        }
        if (na >= concentracaoSalina) {
            return { erro: "Sódio atual (" + na + " mEq/L) é maior ou igual à concentração da solução (" + concentracaoSalina + " mEq/L)." };
        }

        var act = calcularACT(peso, sexo, idade);
        if (!act) {
            return { erro: "Peso obrigatório ou inválido (informe o peso real entre 0,5 e 300 kg). O cálculo de Salina 3% bloqueia estimativas automáticas de peso." };
        }

        // Fórmula de Adrogué-Madias: aumento do Na com 1 L da solução
        var variacaoNaPorLitro = (concentracaoSalina - na) / (act + 1);
        if (!isFinite(variacaoNaPorLitro) || variacaoNaPorLitro <= 0) {
            return { erro: "Variação de sódio calculada inválida para esta infusão." };
        }

        // Teto de segurança: máx 8 mEq/L em 24h (prevenção de Mielinólise Pontina / SDO)
        var volumeParaTeto24h = (8 / variacaoNaPorLitro) * 1000; // em mL
        var taxaInfusaoSegura = volumeParaTeto24h / 24; // em mL/h

        var alertas = [
            "🛑 RISCO DE SÍNDROME DE DESMIELINIZAÇÃO OSMÓTICA (Mielinólise Pontina): Não ultrapassar elevação de 8 mEq/L nas primeiras 24h (e 18 mEq/L em 48h).",
            "🧪 PREPARO PRÁTICO DE SALINA 3% (500 mL): 445 mL de Água Destilada (ou SG 5%) + 55 mL de NaCl 20% (OU 425 mL de SF 0,9% + 75 mL de NaCl 20% ≈ 513 mEq/L)."
        ];
        if (na < 120) {
            alertas.unshift("🚨 SE SINTOMAS NEUROLÓGICOS GRAVES (Convulsão, Coma, Rebaixamento): Bolus imediato de 100 a 150 mL de Salina 3% IV em 10 a 20 min (pode repetir até 2x se persistir sintoma grave, visando subir Na+ em 4-5 mEq/L rapidamente).");
        }
        if (na < 105) {
            alertas.unshift("🚨 HIPONATREMIA GRAVÍSSIMA (Na < 105 mEq/L): Risco iminente de herniação cerebral. Dosar Sódio sérico a cada 2h nas primeiras 6h e a cada 4h depois.");
        }
        var pNum = parseNum(peso);
        if (pNum > 150) {
            alertas.push("⚠️ OBESIDADE SEVERA (> 150 kg): Risco de hipervolemia; titular taxa de infusão com cautela e monitorar ausculta pulmonar.");
        }

        return {
            sucesso: true,
            naAtual: na,
            pesoKg: pNum,
            act: Math.round(act * 10) / 10,
            solucao: "NaCl " + sUsada + "%",
            variacaoNaPorLitro: Math.round(variacaoNaPorLitro * 10) / 10,
            tetoElevacao24h: 8,
            tetoElevacao48h: 18,
            volumeTotal24h_ml: Math.round(volumeParaTeto24h),
            taxaInfusaoMaxima24h_ml_h: Math.round(taxaInfusaoSegura * 10) / 10,
            alerta: alertas[0],
            alertas: alertas
        };
    }

    // --- HIPERNATREMIA ---
    function calcularDeficitAguaLivre(naAtual, peso, sexo, idade) {
        var na = parseNum(naAtual);
        if (isNaN(na) || na < 90 || na > 220) {
            return { erro: "Valor de sódio atual fora da faixa biologicamente plausível (90 a 220 mEq/L)." };
        }
        if (na <= 140) return { erro: "Na atual <= 140 mEq/L. Sem déficit de água livre." };

        var act = calcularACT(peso, sexo, idade);
        if (!act) {
            return { erro: "Peso obrigatório ou inválido (informe entre 0,5 e 300 kg)." };
        }

        var deficitAguaLivre = act * ((na / 140) - 1);

        var alertas = ["Metade do déficit deve ser reposto nas primeiras 24h (somado às perdas insensíveis ~1000 mL/dia), e o restante nas 24h a 48h seguintes. Monitorar Na+ a cada 4-6h."];
        if (na > 175) {
            alertas.unshift("🚨 HIPERNATREMIA EXTREMA (Na > 175 mEq/L): Risco altíssimo de desidratação neuronal grave, hemorragia subaracnóidea e edema cerebral iatrogênico se corrigido rápido. Reduzir no máximo 8-10 mEq/L em 24h.");
        }
        var pNum = parseNum(peso);
        if (pNum > 150) {
            alertas.push("⚠️ OBESIDADE SEVERA (> 150 kg): O tecido adiposo tem menor teor de água; o déficit calculado com peso real pode superestimar a água corporal.");
        }
        if (pNum < 2.0) {
            alertas.push("⚠️ RECÉM-NASCIDO / LACTENTE (< 2 kg): Risco crítico de edema cerebral se redução rápida; limitar queda de sódio a 0,5 mEq/L/h.");
        }

        return {
            sucesso: true,
            naAtual: na,
            pesoKg: pNum,
            act: Math.round(act * 10) / 10,
            deficitAguaLivreLitros: Math.round(deficitAguaLivre * 100) / 100,
            deficitAguaLivreMl: Math.round(deficitAguaLivre * 1000),
            vazaoSugeridaPrimeiras24h_ml_h: Math.round(((deficitAguaLivre * 500) + 1000) / 24),
            alerta: alertas[0],
            alertas: alertas
        };
    }

    // --- HIPOCALEMIA (K+ < 3.5 mEq/L) ---
    function avaliarHipocalemia(k, ecg) {
        var condutas = [];
        var prescricoes = [];
        var gravidade = (k < 2.5 || ecg) ? "Hipocalemia Grave / Risco Arritmogênico" : (k < 3.0 ? "Hipocalemia Moderada" : "Hipocalemia Leve");
        var alerta = "";

        if (k >= 3.0 && !ecg) {
            alerta = "⚠️ HIPOCALEMIA LEVE (3,0 a 3,4 mEq/L sem alteração de ECG): Preferir reposição por Via Oral/Enteral. Associar reposição de Magnésio se disponível.";
            condutas.push("1. REPOSIÇÃO ORAL PREFERENCIAL:");
            condutas.push("   - Xarope de KCl 6% (0,8 mEq/mL): 15 a 30 mL VO/SNE de 8/8h após as refeições (36 a 72 mEq/dia).");
            condutas.push("   - Alternativa: KCl drágeas (Slow-K 600mg = 8 mEq): 2 drágeas VO de 8/8h (48 mEq/dia).");
            condutas.push("2. SE IMPOSSIBILIDADE DE VIA ORAL (Jejum/Íleo/Vômitos):");
            condutas.push("   - KCl 19,1% (1 ampola de 10 mL = 25 mEq) + SF 0,9% 500 mL (concentração 50 mEq/L) --- correr EV em 3 a 4 horas (velocidade ~6 a 8 mEq/h).");
            condutas.push("3. COFATOR OBRIGATÓRIO (MAGNÉSIO):");
            condutas.push("   - Checar e corrigir hipomagnesemia (hipomagnesemia impede a retenção tubular renal de potássio, tornando a hipocalemia refratária).");

            prescricoes.push("Xarope de KCl 6% (60mg/mL): 20 mL VO de 8/8h após refeições (ou Slow-K 600mg 2 cp VO 8/8h).");
            prescricoes.push("[Se Jejum/Via Venosa] KCl 19,1% 10 mL (1 ampola = 25 mEq) + SF 0,9% 490 mL --- EV em BIC em 3 horas (~8 mEq/h).");
            prescricoes.push("Dosar Magnésio sérico e repetir K+ após reposição.");
        } else {
            alerta = "🚨 ALERTA CRÍTICO (" + gravidade.toUpperCase() + " — K+ " + k + " mEq/L): Risco de Torsades de Pointes, FV e fraqueza muscular respiratória. Reposição IV obrigatória em SF 0,9% (NUNCA em bolus e NUNCA diluir em SG 5%) + Reposição empírica de Magnésio!";
            condutas.push("1. TRAVAS DE SEGURANÇA DE INFUSÃO VENOSA (KCl 19,1% -> 1 amp 10 mL = 25 mEq):");
            condutas.push("   - 🛑 PROIBIDO FAZER KCl EM BOLUS / PUSH VENOSO (Causa PCR imediata em assistolia).");
            condutas.push("   - 🛑 PROIBIDO DILUIR EM SORO GLICOSADO (SG 5% estimula insulina endógena e reduz ainda mais o K+ sérico inicialmente, precipitando arritmias). Diluir SEMPRE em SF 0,9%.");
            condutas.push("   - ACESSO VENOSO PERIFÉRICO: Concentração padrão 40 a 50 mEq/L (máx absoluto 60 mEq/L). Velocidade máxima: 10 mEq/h (1 ampola de 10 mL em 500 mL de SF 0,9% correr em 2,5 a 3 horas).");
            condutas.push("   - ACESSO VENOSO CENTRAL: Concentração máxima 100 mEq/L (2 ampolas = 50 mEq em 500 mL de SF 0,9%). Velocidade máxima: 20 mEq/h em BIC sob monitorização contínua de ECG.");
            condutas.push("2. CORREÇÃO CONCOMITANTE DE MAGNÉSIO (MANDATÓRIA):");
            condutas.push("   - Sulfato de Magnésio 50% 4 mL (2g = 16 mEq) + SF 0,9% 100 mL IV correr em 30 minutos (se função renal preservada). Sem magnésio, a bomba Na+/K+-ATPase falha e o paciente perde todo o K+ infundido na urina.");
            condutas.push("3. MONITORIZAÇÃO:");
            condutas.push("   - Monitorização eletrocardiográfica contínua (observar onda U, achatamento de T, depressão de ST e QT longo) + Dosar K+ sérico a cada 2-4 horas.");

            prescricoes.push("[OPÇÃO A - ACESSO PERIFÉRICO] KCl 19,1% 10 mL (1 ampola = 25 mEq) + SF 0,9% 490 mL (50 mEq/L) --- EV em BIC a 166 mL/h (correr em 3 horas = 8,3 mEq/h; máx periférico 10 mEq/h).");
            prescricoes.push("[OPÇÃO B - ACESSO CENTRAL + ECG CONTÍNUO] KCl 19,1% 20 mL (2 ampolas = 50 mEq) + SF 0,9% 480 mL (100 mEq/L) --- EV em BIC a 200 mL/h (correr em 2,5 horas = 20 mEq/h).");
            prescricoes.push("Sulfato de Magnésio 50% 4 mL (2g) + SF 0,9% 100 mL --- EV correr em 30 minutos.");
            prescricoes.push("Monitorização contínua em cardioscópio + Dosar K+ e Mg2+ séricos após o término da etapa.");
        }

        var prescricaoPEP = prescricoes.map(function(item, idx) {
            return (idx + 1) + ". " + item;
        }).join("\n");

        return {
            sucesso: true,
            disturbio: "Hipocalemia",
            potassio: k,
            gravidade: gravidade,
            alerta: alerta,
            condutas: condutas,
            prescricaoPEP: prescricaoPEP
        };
    }

    // --- POTÁSSIO (HIPOCALEMIA E HIPERCALEMIA) ---
    function avaliarHipercalemia(kAtual, ecgAlterado) {
        if (typeof kAtual === "object" && kAtual !== null) {
            ecgAlterado = kAtual.ecgAlterado !== undefined ? kAtual.ecgAlterado : (kAtual.ecg !== undefined ? kAtual.ecg : ecgAlterado);
            kAtual = kAtual.kAtual !== undefined ? kAtual.kAtual : (kAtual.potassio !== undefined ? kAtual.potassio : kAtual.k);
        }
        var k = parseNum(kAtual);
        if (isNaN(k) || k < 1.0 || k > 15.0) {
            return { erro: "Valor de potássio fora da faixa biologicamente plausível (1,0 a 15,0 mEq/L). Confira o exame." };
        }

        var ecg = Boolean(ecgAlterado === true || ecgAlterado === "true" || ecgAlterado === "sim" || ecgAlterado === 1 || ecgAlterado === "ecg");

        // Desvio para Hipocalemia se K < 3.5
        if (k < 3.5) {
            return avaliarHipocalemia(k, ecg);
        }

        // Normocalemia (3.5 a 5.0)
        if (k <= 5.0) {
            return {
                sucesso: true,
                disturbio: "Normocalemia",
                potassio: k,
                gravidade: "Normal",
                alerta: "Potássio sérico dentro da faixa de normalidade (3,5 a 5,0 mEq/L).",
                conduta: "Nenhuma ação específica.",
                condutas: ["Nenhuma intervenção aguda necessária para o potássio."],
                prescricaoPEP: "Sem indicação de correção aguda de potássio."
            };
        }

        var condutas = [];
        var prescricoes = [];
        var gravidade = "Hipercalemia Leve";
        var alerta = ecg ? "🚨 ALERTA VERMELHO: Sinais de toxicidade cardíaca presentes no ECG. O Gluconato de Cálcio NÃO reduz o potássio, apenas estabiliza a membrana miocárdica." : "";

        // Tripé Canônico Estruturado (Preceptor Médico / KDIGO / SBC)
        var tripe = {
            estabilizacaoMembrana: null,
            redistribuicaoIntracelular: [],
            eliminacaoCorporal: [],
            hemodialiseEmergencia: null,
            alertaHgtHoraria: "HGT horária por 4-6h devido ao risco severo de hipoglicemia tardia. Se HGT basal >= 250 mg/dL, fazer APENAS Insulina Regular 10 UI IV isolada (sem SG 50%).",
            gluconatoDose: "Gluconato de Cálcio 10% (10-20mL em 100mL SG 5% ou SF 0,9% em 5 min)",
            solucaoPolarizanteDose: "SG 50% 50mL (ou SG 10% 250mL) + 10 UI Insulina Regular IV em 20 min (Omitir glicose se HGT >= 250 mg/dL)",
            eliminacaoSorcalFurosemida: "Sorcal/Furosemida para eliminação corporal"
        };

        // 1. Estabilização de Membrana Cardíaca
        if (k > 8.0) {
            gravidade = "Extrema / Risco Iminente de PCR em Assistolia ou FV";
            alerta = "🚨 ALERTA VERMELHO MÁXIMO (K+ > 8.0 mEq/L): Risco iminente de parada cardiorrespiratória em assistolia/FV. Gluconato de Cálcio 10% IV IMEDIATO para estabilização de membrana miocárdica e acionamento urgente de Nefrologia para Hemodiálise de Emergência!";
            var condutaEstabilizacaoExtrema = "🚨 EMERGÊNCIA ZERO / ESTABILIZAÇÃO DE MEMBRANA: Gluconato de Cálcio 10% (10-20mL em 100mL SG 5% em 5 min) IV imediato (ou 20 mL IV em 3 min se PCR/instabilidade extrema). Repetir em 5-10 min se ritmo não normalizar. Alerta: Cálcio NÃO reduz K+ sérico, apenas protege o miocárdio.";
            condutas.push(condutaEstabilizacaoExtrema);
            tripe.estabilizacaoMembrana = condutaEstabilizacaoExtrema;
            prescricoes.push("Gluconato de Cálcio 10% 20 mL + SG 5% 100 mL IV em 5 min (ou direto em 3 min se colapso). Repetir em 5-10 min se ECG mantiver toxicidade.");

            var condutaDialiseExtrema = "HEMODIÁLISE DE EMERGÊNCIA: Acionar imediatamente nefrologia e terapia intensiva para passagem de cateter de hemodiálise (depuração extracorpórea mandatória para K+ > 8.0 mEq/L ou falência de medidas conservadoras).";
            condutas.push(condutaDialiseExtrema);
            tripe.hemodialiseEmergencia = condutaDialiseExtrema;
        } else if (k >= 6.5 || ecg) {
            gravidade = "Grave / Urgência Médica";
            var condutaEstabilizacao = "ESTABILIZAÇÃO DA MEMBRANA: Gluconato de Cálcio 10% (10-20mL em 100mL SG 5% em 5 min) IV lento. Efeito imediato (1-3 min), duração 30-60 min. Repetir se ECG não melhorar em 5-10 min. (Alerta: Gluconato NÃO reduz potássio sérico).";
            condutas.push(condutaEstabilizacao);
            tripe.estabilizacaoMembrana = condutaEstabilizacao;
            prescricoes.push("Gluconato de Cálcio 10% 10 a 20 mL + SG 5% 100 mL IV em 5 a 10 min. Repetir em 5-10 min se persistirem alterações eletrocardiográficas.");
        } else if (k >= 5.5) {
            gravidade = "Moderada";
        }

        // 2. Redistribuição Intracelular (Shift de K+) -> Acionar se K > 5.5 OU se houver alteração de ECG!
        if (k > 5.5 || ecg) {
            var condutaPolarizante = "REDISTRIBUIÇÃO (SHIFT INTRACELULAR): Glicoinsulina (Solução Polarizante): SG 50% 50mL + 10 UI Insulina Regular IV em 20 min. ⚠️ TRAVA DE HIPERGLICEMIA: Se glicemia capilar (HGT) >= 250 mg/dL, administrar APENAS Insulina Regular 10 UI IV isolada (sem glicose hipertônica, pois a hiperosmolaridade puxa K+ para fora da célula e piora a hipercalemia). Queda esperada de K+: 0,5 a 1,2 mEq/L em 30-60 min. Monitorar HGT de 1/1h por 4-6h.";
            condutas.push(condutaPolarizante);
            tripe.redistribuicaoIntracelular.push(condutaPolarizante);
            prescricoes.push("Solução Polarizante: Insulina Regular 10 UI + Glicose 50% 50 mL IV correr em 20 minutos (ATENÇÃO: Se HGT basal >= 250 mg/dL, fazer APENAS Insulina Regular 10 UI IV sem glicose).");
            prescricoes.push("HGT (Glicemia Capilar) de 1/1 hora por 4 a 6 horas após a solução polarizante (vigilância estrita de hipoglicemia tardia).");

            var condutaBeta2 = "REDISTRIBUIÇÃO (ADADITIVA): Beta-2 Agonista: Salbutamol 10-20 mg (20-40 gotas) em nebulização com 3-5 mL SF 0,9% em 10-15 min (ou Fenoterol 10-20 gotas). Queda esperada: 0,5 a 1,0 mEq/L.";
            condutas.push(condutaBeta2);
            tripe.redistribuicaoIntracelular.push(condutaBeta2);
            prescricoes.push("Salbutamol 5mg/mL: 20 a 40 gotas + SF 0,9% 4 mL em nebulização por 10 a 15 min (evitar se taquiarritmia grave ou SCA).");
        }

        // 3. Eliminação Corporal de Potássio
        if (k > 5.0) {
            var condutaFurosemida = "ELIMINAÇÃO RENAL: Furosemida 40-80 mg IV em bolus lento (caliurese forçada se função renal e volemia permitirem; se hipovolêmico, associar SF 0,9% ou Ringer Lactato se sem anúria).";
            condutas.push(condutaFurosemida);
            tripe.eliminacaoCorporal.push(condutaFurosemida);
            prescricoes.push("Furosemida 20mg/2mL: 2 a 4 ampolas (40 a 80 mg) IV em bolus lento (avaliar débito urinário e volemia).");

            var condutaSorcal = "ELIMINAÇÃO GASTROINTESTINAL: Poliestirenossulfonato de Cálcio (Sorcal) 30g VO diluído em 100 mL de água/manitol 10% de 8/8h (ou Ciclossilicato de Zircônio / Lokelma 10g VO 8/8h se disponível). Contraindicado Sorcal se íleo paralítico ou pós-op abdominal.";
            condutas.push(condutaSorcal);
            tripe.eliminacaoCorporal.push(condutaSorcal);
            prescricoes.push("Poliestirenossulfonato de Cálcio (Sorcal) 30g VO diluído em 100 mL de água potável de 8/8h.");
        }

        prescricoes.push("Monitorização cardíaca contínua + ECG de 12 derivações na Sala Vermelha + Repetir dosagem sérica de K+ em 2 horas.");
        prescricoes.push("Suspensão imediata de fármacos hipercalemiantes: IECAs/BRAs, Espironolactona, suplementação de K+, Bactrim, Heparina e AINEs.");

        var prescricaoPEP = prescricoes.map(function(item, idx) {
            return (idx + 1) + ". " + item;
        }).join("\n");

        return {
            sucesso: true,
            disturbio: "Hipercalemia",
            potassio: k,
            gravidade: gravidade,
            alerta: alerta,
            condutas: condutas,
            tripeCanonico: tripe,
            prescricaoPEP: prescricaoPEP
        };
    }

    function formatarTextoTelegramPotassio(res) {
        if (!res) return "";
        if (res.erro) return "🛑 *ERRO DE SEGURANÇA (POTÁSSIO):*\n" + res.erro;
        var out = "⚡ *MANEJO DE POTÁSSIO (" + (res.disturbio || "DHE").toUpperCase() + ")*\n";
        out += "K+ Sérico: *" + res.potassio + " mEq/L* | Gravidade: *" + res.gravidade + "*\n\n";
        if (res.alerta) out += res.alerta + "\n\n";
        if (res.condutas && res.condutas.length > 0) {
            out += "*CONDUTA CLÍNICA:*\n" + res.condutas.join("\n\n") + "\n\n";
        }
        if (res.prescricaoPEP) {
            out += "*PRESCRIÇÃO PRONTA (PEP):*\n" + res.prescricaoPEP;
        }
        return out;
    }

    function formatarTextoTelegramSodio(res) {
        if (!res) return "";
        if (res.erro) return "🛑 *ERRO DE SEGURANÇA (SÓDIO):*\n" + res.erro;
        if (res.taxaInfusaoMaxima24h_ml_h !== undefined) {
            var out = "🧂 *CORREÇÃO DE HIPONATREMIA (ADROGUÉ-MADIAS)*\n";
            out += "Na+ Atual: *" + res.naAtual + " mEq/L* | Peso: *" + res.pesoKg + " kg* (ACT: " + res.act + " L)\n";
            out += "Solução: *" + res.solucao + "* (Variação: +" + res.variacaoNaPorLitro + " mEq/L por litro)\n\n";
            out += "🎯 *VAZÃO MÁXIMA SEGURA (Teto 8 mEq/24h):*\n";
            out += "👉 *" + res.taxaInfusaoMaxima24h_ml_h + " mL/h* em BIC (Volume 24h: " + res.volumeTotal24h_ml + " mL)\n\n";
            if (res.alertas && res.alertas.length > 0) out += res.alertas.join("\n\n");
            return out;
        }
        if (res.deficitAguaLivreLitros !== undefined) {
            var outH = "💧 *CORREÇÃO DE HIPERNATREMIA (DÉFICIT DE ÁGUA LIVRE)*\n";
            outH += "Na+ Atual: *" + res.naAtual + " mEq/L* | Peso: *" + res.pesoKg + " kg* (ACT: " + res.act + " L)\n";
            outH += "Déficit Total de Água Livre: *" + res.deficitAguaLivreLitros + " L* (" + res.deficitAguaLivreMl + " mL)\n";
            outH += "👉 *Sugestão SG 5% / Água Livre (50% do déficit + 1000mL perdas/24h):* ~*" + res.vazaoSugeridaPrimeiras24h_ml_h + " mL/h*\n\n";
            if (res.alertas && res.alertas.length > 0) outH += res.alertas.join("\n\n");
            return outH;
        }
        return JSON.stringify(res);
    }

    var api = {
        calcularACT: calcularACT,
        calcularDeficitSodio: calcularDeficitSodio,
        planejarCorrecaoHiponatremia: planejarCorrecaoHiponatremia,
        calcularDeficitAguaLivre: calcularDeficitAguaLivre,
        avaliarHipocalemia: avaliarHipocalemia,
        avaliarHipercalemia: avaliarHipercalemia,
        avaliarPotassio: avaliarHipercalemia,
        calcularCorrecaoK: avaliarHipercalemia,
        gerarCondutaPotassio: avaliarHipercalemia,
        formatarTextoTelegramPotassio: formatarTextoTelegramPotassio,
        formatarTextoTelegramSodio: formatarTextoTelegramSodio
    };
    api.NefrologiaDheService = api;
    return api;
})();

if (typeof module !== "undefined" && module.exports) {
    module.exports = NefrologiaDheService;
}
