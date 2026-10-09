/**
 * Módulo de Nefrologia Intensiva e Distúrbios Hidroeletrolíticos (DHE)
 * Motor determinístico para correção de sódio e manejo de hipercalemia.
 */

var NefrologiaDheService = (function() {
    'use strict';

    // --- CÁLCULO DE ÁGUA CORPORAL TOTAL (ACT) ---
    function calcularACT(peso, sexo, idade) {
        var fator = 0.6; // padrão homem adulto
        if (sexo.toLowerCase() === 'f') {
            fator = idade >= 65 ? 0.45 : 0.5;
        } else {
            fator = idade >= 65 ? 0.5 : 0.6;
        }
        return peso * fator;
    }

    // --- HIPONATREMIA ---
    function calcularDeficitSodio(naAtual, naAlvo, peso, sexo, idade) {
        if (naAtual >= naAlvo) return { erro: "Na atual >= Na alvo. Sem déficit." };
        var act = calcularACT(peso, sexo, idade);
        var deficitSodio = act * (naAlvo - naAtual);
        
        return {
            act: Math.round(act * 10) / 10,
            deficitSodioMEq: Math.round(deficitSodio)
        };
    }

    function planejarCorrecaoHiponatremia(naAtual, peso, sexo, idade, salinaSendoUsada) {
        // salinaSendoUsada = 3 para NaCl 3% (513 mEq/L) ou 0.9 para NaCl 0.9% (154 mEq/L)
        var concentracaoSalina = salinaSendoUsada === 3 ? 513 : (salinaSendoUsada === 0.9 ? 154 : null);
        if (!concentracaoSalina) return { erro: "Concentração de salina inválida (use 3 ou 0.9)" };

        var act = calcularACT(peso, sexo, idade);
        // Fórmula de Adrogué-Madias: aumento do Na com 1 L da solução
        var variacaoNaPorLitro = (concentracaoSalina - naAtual) / (act + 1);

        // Teto de segurança: máx 8 mEq em 24h
        var volumeParaTeto24h = (8 / variacaoNaPorLitro) * 1000; // em mL
        var taxaInfusaoSegura = volumeParaTeto24h / 24; // em mL/h

        return {
            naAtual: naAtual,
            solucao: "NaCl " + salinaSendoUsada + "%",
            variacaoNaPorLitro: Math.round(variacaoNaPorLitro * 10) / 10,
            tetoElevacao24h: 8,
            tetoElevacao48h: 18,
            alerta: "RISCO DE SÍNDROME DE DESMIELINIZAÇÃO OSMÓTICA. Não ultrapassar 8-10 mEq/L nas primeiras 24h.",
            taxaInfusaoMaxima24h_ml_h: Math.round(taxaInfusaoSegura * 10) / 10
        };
    }

    // --- HIPERNATREMIA ---
    function calcularDeficitAguaLivre(naAtual, peso, sexo, idade) {
        if (naAtual <= 140) return { erro: "Na atual <= 140. Sem déficit de água livre." };
        var act = calcularACT(peso, sexo, idade);
        var deficitAguaLivre = act * ((naAtual / 140) - 1);

        return {
            act: Math.round(act * 10) / 10,
            deficitAguaLivreLitros: Math.round(deficitAguaLivre * 100) / 100,
            alerta: "Metade do déficit deve ser reposto nas primeiras 24h, o restante nas 24h a 48h seguintes. Monitorar Na a cada 4-6h."
        };
    }

    // --- HIPERCALEMIA ---
    function avaliarHipercalemia(kAtual, ecgAlterado) {
        if (kAtual <= 5.0) return { gravidade: "Normal", conduta: "Nenhuma ação específica." };
        
        var condutas = [];
        var gravidade = "Leve";
        
        if (kAtual >= 6.5 || ecgAlterado) {
            gravidade = "Grave / Urgência Médica";
            condutas.push("ESTABILIZAÇÃO DA MEMBRANA: Gluconato de Cálcio 10% 10 a 20 mL IV lento (em 3-5 min). Efeito imediato, duração 30-60 min. Repetir se ECG não melhorar em 5-10 min.");
        } else if (kAtual >= 5.5) {
            gravidade = "Moderada";
        }

        if (kAtual > 5.5) {
            condutas.push("REDISTRIBUIÇÃO: Glicoinsulina (Solução Polarizante): 10 UI Insulina Regular + 100 mL de SG 50% IV em 20-30 min. Queda esperada: 0.5-1.2 mEq/L em 1-2h.");
            condutas.push("REDISTRIBUIÇÃO: Beta-2 Agonista (Fenoterol 10-20 gotas ou Salbutamol 10-20 mg inalatório).");
        }

        if (kAtual > 5.0) {
            condutas.push("ELIMINAÇÃO: Furosemida (se função renal e volemia permitirem).");
            condutas.push("ELIMINAÇÃO: Resinas de troca de potássio (Poliestirenossulfonato de Cálcio / Sorcal) 15-30g VO ou Retal.");
        }

        return {
            potassio: kAtual,
            gravidade: gravidade,
            alerta: ecgAlterado ? "ALERTA VERMELHO: Sinais de toxicidade cardíaca presentes no ECG. O Gluconato de Cálcio NÃO reduz o potássio, apenas estabiliza a membrana." : "",
            condutas: condutas
        };
    }

    return {
        calcularACT: calcularACT,
        calcularDeficitSodio: calcularDeficitSodio,
        planejarCorrecaoHiponatremia: planejarCorrecaoHiponatremia,
        calcularDeficitAguaLivre: calcularDeficitAguaLivre,
        avaliarHipercalemia: avaliarHipercalemia
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NefrologiaDheService;
}
