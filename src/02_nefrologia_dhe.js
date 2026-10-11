/**
 * Módulo de Nefrologia Intensiva e Distúrbios Hidroeletrolíticos (DHE)
 * Motor determinístico para correção de sódio e manejo de hipercalemia.
 */

var NefrologiaDheService = (function() {
    'use strict';

    // --- CÁLCULO DE ÁGUA CORPORAL TOTAL (ACT) ---
    function calcularACT(peso, sexo, idade) {
        var p = parseFloat(peso);
        if (isNaN(p) || p <= 0) p = 70;
        var id = parseFloat(idade);
        if (isNaN(id) || id < 0) id = 40;
        var s = sexo ? String(sexo).toLowerCase() : 'm';

        var fator = 0.6; // padrão homem adulto
        if (s === 'f' || s === 'feminino') {
            fator = id >= 65 ? 0.45 : 0.5;
        } else {
            fator = id >= 65 ? 0.5 : 0.6;
        }
        return Math.max(0.1, p * fator);
    }

    // --- HIPONATREMIA ---
    function calcularDeficitSodio(naAtual, naAlvo, peso, sexo, idade) {
        var naAt = parseFloat(naAtual);
        var naAl = parseFloat(naAlvo);
        if (isNaN(naAt) || isNaN(naAl)) return { erro: "Valores de sódio inválidos." };
        if (naAt >= naAl) return { erro: "Na atual >= Na alvo. Sem déficit." };

        var act = calcularACT(peso, sexo, idade);
        var deficitSodio = act * (naAl - naAt);
        
        var alertas = [];
        var pNum = parseFloat(peso);
        if (!isNaN(pNum) && pNum > 150) {
            alertas.push("⚠️ OBESIDADE SEVERA (> 150 kg): O tecido adiposo tem teor reduzido de água. O cálculo com peso real superestima a Água Corporal Total (ACT). Recomenda-se cautela para evitar sobrecarga volêmica.");
        }
        if (!isNaN(pNum) && pNum < 2.0) {
            alertas.push("⚠️ RECÉM-NASCIDO / LACTENTE (< 2 kg): Água corporal proporcionalmente elevada (~75-80%). Monitoração estrita de sódio a cada 2-4h pelo risco extremo de edema cerebral.");
        }

        return {
            act: Math.round(act * 10) / 10,
            deficitSodioMEq: Math.round(deficitSodio),
            alertas: alertas
        };
    }

    function planejarCorrecaoHiponatremia(naAtual, peso, sexo, idade, salinaSendoUsada) {
        // salinaSendoUsada = 3 para NaCl 3% (513 mEq/L) ou 0.9 para NaCl 0.9% (154 mEq/L)
        var sUsada = parseFloat(salinaSendoUsada);
        var concentracaoSalina = sUsada === 3 ? 513 : (sUsada === 0.9 ? 154 : null);
        if (!concentracaoSalina) return { erro: "Concentração de salina inválida (use 3 para NaCl 3% ou 0.9 para NaCl 0.9%)" };

        var na = parseFloat(naAtual);
        if (isNaN(na) || na <= 0) return { erro: "Valor de sódio atual inválido." };
        if (na >= concentracaoSalina) {
            return { erro: "Sódio atual (" + na + " mEq/L) é maior ou igual à concentração da solução (" + concentracaoSalina + " mEq/L)." };
        }

        var act = calcularACT(peso, sexo, idade);
        // Fórmula de Adrogué-Madias: aumento do Na com 1 L da solução
        var variacaoNaPorLitro = (concentracaoSalina - na) / (act + 1);
        if (!isFinite(variacaoNaPorLitro) || variacaoNaPorLitro <= 0) {
            return { erro: "Variação de sódio calculada inválida para esta infusão." };
        }

        // Teto de segurança: máx 8 mEq em 24h
        var volumeParaTeto24h = (8 / variacaoNaPorLitro) * 1000; // em mL
        var taxaInfusaoSegura = volumeParaTeto24h / 24; // em mL/h

        var alertas = ["RISCO DE SÍNDROME DE DESMIELINIZAÇÃO OSMÓTICA. Não ultrapassar 8-10 mEq/L nas primeiras 24h."];
        if (na < 105) {
            alertas.unshift("🚨 HIPONATREMIA GRAVÍSSIMA (Na < 105 mEq/L): Risco iminente de herniação cerebral, convulsões e coma. Tratamento imediato com Salina 3% (100-150 mL em 10-20 min) sob monitorização contínua em UTI.");
        }
        var pNum = parseFloat(peso);
        if (!isNaN(pNum) && pNum > 150) {
            alertas.push("⚠️ OBESIDADE SEVERA (> 150 kg): Risco de hipervolemia; titular taxa de infusão com cautela e monitorar ausculta pulmonar.");
        }

        return {
            naAtual: na,
            solucao: "NaCl " + sUsada + "%",
            variacaoNaPorLitro: Math.round(variacaoNaPorLitro * 10) / 10,
            tetoElevacao24h: 8,
            tetoElevacao48h: 18,
            alerta: alertas[0],
            alertas: alertas,
            taxaInfusaoMaxima24h_ml_h: Math.round(taxaInfusaoSegura * 10) / 10
        };
    }

    // --- HIPERNATREMIA ---
    function calcularDeficitAguaLivre(naAtual, peso, sexo, idade) {
        var na = parseFloat(naAtual);
        if (isNaN(na) || na <= 0) return { erro: "Valor de sódio atual inválido." };
        if (na <= 140) return { erro: "Na atual <= 140. Sem déficit de água livre." };

        var act = calcularACT(peso, sexo, idade);
        var deficitAguaLivre = act * ((na / 140) - 1);

        var alertas = ["Metade do déficit deve ser reposto nas primeiras 24h, o restante nas 24h a 48h seguintes. Monitorar Na a cada 4-6h."];
        if (na > 175) {
            alertas.unshift("🚨 HIPERNATREMIA EXTREMA (Na > 175 mEq/L): Risco altíssimo de desidratação neuronal grave, hemorragia subaracnóidea e choque. Correção estritamente lenta (máx 8-10 mEq/L em 24h).");
        }
        var pNum = parseFloat(peso);
        if (!isNaN(pNum) && pNum > 150) {
            alertas.push("⚠️ OBESIDADE SEVERA (> 150 kg): O tecido adiposo tem menor teor de água; o déficit calculado com peso real pode superestimar a água corporal.");
        }
        if (!isNaN(pNum) && pNum < 2.0) {
            alertas.push("⚠️ RECÉM-NASCIDO / LACTENTE (< 2 kg): Risco crítico de edema cerebral se redução rápida; limitar queda de sódio a 0,5 mEq/L/h.");
        }

        return {
            act: Math.round(act * 10) / 10,
            deficitAguaLivreLitros: Math.round(deficitAguaLivre * 100) / 100,
            alerta: alertas[0],
            alertas: alertas
        };
    }

    // --- HIPERCALEMIA ---
    function avaliarHipercalemia(kAtual, ecgAlterado) {
        if (typeof kAtual === 'object' && kAtual !== null) {
            ecgAlterado = kAtual.ecgAlterado !== undefined ? kAtual.ecgAlterado : (kAtual.ecg !== undefined ? kAtual.ecg : ecgAlterado);
            kAtual = kAtual.kAtual !== undefined ? kAtual.kAtual : (kAtual.potassio !== undefined ? kAtual.potassio : kAtual.k);
        }
        var k = typeof kAtual === 'string' ? parseFloat(kAtual.trim().replace(',', '.')) : parseFloat(kAtual);
        if (isNaN(k) || k <= 0) return { erro: "Valor de potássio atual inválido." };
        if (k <= 5.0) return { gravidade: "Normal", conduta: "Nenhuma ação específica." };
        
        var ecg = Boolean(ecgAlterado === true || ecgAlterado === 'true' || ecgAlterado === 'sim' || ecgAlterado === 1 || ecgAlterado === 'ecg');
        var condutas = [];
        var prescricoes = [];
        var gravidade = "Leve";
        var alerta = ecg ? "ALERTA VERMELHO: Sinais de toxicidade cardíaca presentes no ECG. O Gluconato de Cálcio NÃO reduz o potássio, apenas estabiliza a membrana miocárdica." : "";

        // Tripé Canônico Estruturado (Preceptor Médico / KDIGO / SBC)
        var tripe = {
            estabilizacaoMembrana: null,
            redistribuicaoIntracelular: [],
            eliminacaoCorporal: [],
            hemodialiseEmergencia: null,
            alertaHgtHoraria: "HGT horária por 4-6h devido ao risco severo de hipoglicemia tardia",
            gluconatoDose: "Gluconato de Cálcio 10% (10-20mL em 100mL SG 5% em 5 min)",
            solucaoPolarizanteDose: "SG 50% 50mL + 10 UI Regular em 20 min",
            eliminacaoSorcalFurosemida: "Sorcal/Furosemida para eliminação"
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

        // 2. Redistribuição Intracelular (Shift de K+)
        if (k > 5.5) {
            var condutaPolarizante = "REDISTRIBUIÇÃO: Glicoinsulina (Solução Polarizante): SG 50% 50mL + 10 UI Regular em 20 min IV (ou 100 mL SG 50% se glicemia < 250 mg/dL). Queda esperada de K+: 0,5 a 1,2 mEq/L em 30-60 min. ⚠️ MONITORIZAÇÃO: Alerta de HGT horária por 4-6h devido ao risco severo de hipoglicemia tardia.";
            condutas.push(condutaPolarizante);
            tripe.redistribuicaoIntracelular.push(condutaPolarizante);
            prescricoes.push("Solução Polarizante: Insulina Regular 10 UI + Glicose 50% 50 mL IV em infusão de 20 minutos (se glicemia basal < 250 mg/dL).");
            prescricoes.push("HGT (Glicemia Capilar) de 1/1 hora por 4 a 6 horas após a solução polarizante (vigilância estrita de hipoglicemia).");

            var condutaBeta2 = "REDISTRIBUIÇÃO: Beta-2 Agonista: Salbutamol 10-20 mg (20-40 gotas) em nebulização com 3-5 mL SF 0,9% em 10-15 min (ou Fenoterol 10-20 gotas). Queda esperada: 0,5 a 1,0 mEq/L.";
            condutas.push(condutaBeta2);
            tripe.redistribuicaoIntracelular.push(condutaBeta2);
            prescricoes.push("Salbutamol 5mg/mL: 20 a 40 gotas + SF 0,9% 3 a 5 mL em nebulização por 10 a 15 min (se sem taquiarritmia/isquemia).");
        }

        // 3. Eliminação Corporal de Potássio
        if (k > 5.0) {
            var condutaFurosemida = "ELIMINAÇÃO: Furosemida 40-80 mg IV em bolus lento (caliurese forçada se função renal e volemia permitirem; contraindicado em hipovolemia ou anúria).";
            condutas.push(condutaFurosemida);
            tripe.eliminacaoCorporal.push(condutaFurosemida);
            prescricoes.push("Furosemida 20mg/2mL: 2 a 4 ampolas (40 a 80 mg) IV em bolus lento (avaliar débito urinário e volemia).");

            var condutaSorcal = "ELIMINAÇÃO: Resinas de troca de potássio (Poliestirenossulfonato de Cálcio / Sorcal) 15-30g VO (diluído em 100 mL de água/manitol 10%) ou retal (30-50g em enema). Repetir 6-8h. (Início de ação 2-4h; contraindicado em íleo paralítico ou pós-op abdominal).";
            condutas.push(condutaSorcal);
            tripe.eliminacaoCorporal.push(condutaSorcal);
            prescricoes.push("Poliestirenossulfonato de Cálcio (Sorcal) 30g VO diluído em 100 mL de água potável ou via retal 8/8h.");
        }

        prescricoes.push("Monitorização cardíaca contínua em ECG de 12 derivações na Sala Vermelha + Repetir dosagem sérica de K+ em 2 horas.");
        prescricoes.push("Suspensão imediata de fármacos hipercalemiantes: IECAs/BRAs, Espironolactona, suplementação de K+ e AINEs.");

        var prescricoesFormatadas = prescricoes.map(function(item, idx) {
            return (idx + 1) + ". " + item;
        });
        var prescricaoPEP = prescricoesFormatadas.join("\n");

        return {
            potassio: k,
            gravidade: gravidade,
            alerta: alerta,
            condutas: condutas,
            tripeCanonico: tripe,
            prescricaoPEP: prescricaoPEP
        };
    }

    return {
        calcularACT: calcularACT,
        calcularDeficitSodio: calcularDeficitSodio,
        planejarCorrecaoHiponatremia: planejarCorrecaoHiponatremia,
        calcularDeficitAguaLivre: calcularDeficitAguaLivre,
        avaliarHipercalemia: avaliarHipercalemia,
        calcularCorrecaoK: avaliarHipercalemia,
        gerarCondutaPotassio: avaliarHipercalemia
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NefrologiaDheService;
}
