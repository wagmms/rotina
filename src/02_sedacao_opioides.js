/**
 * Módulo de Sedação e Rotação de Opioides (UTI / Cuidados Paliativos)
 * Motor determinístico para cálculo de MME e avaliação RASS/CAM-ICU.
 */

var SedacaoOpioidesService = (function() {
    'use strict';

    // --- ESCALA RASS (Richmond Agitation-Sedation Scale) ---
    function avaliarRASS(score) {
        if (score === undefined || score === null) return null;
        
        var interpretacoes = {
            "4": "Combativo (violento, perigo imediato para equipe)",
            "3": "Muito agitado (puxa cateteres, agressivo)",
            "2": "Agitado (movimentos despropositados frequentes, assincronia com ventilador)",
            "1": "Inquieto (ansioso, movimentos não agressivos)",
            "0": "Alerta e calmo",
            "-1": "Sonolento (acorda com voz, mantém contato visual > 10s)",
            "-2": "Sedação leve (acorda com voz, mantém contato visual < 10s)",
            "-3": "Sedação moderada (movimento ou abertura ocular ao chamado, sem contato visual)",
            "-4": "Sedação profunda (resposta apenas a estímulo físico)",
            "-5": "Não despertável (sem resposta à voz ou estímulo físico)"
        };

        var nivel = interpretacoes[String(score)];
        if (!nivel) return { erro: "Score RASS inválido. Deve ser entre -5 e +4." };

        var meta = "Fora do alvo";
        if (score >= -2 && score <= 0) meta = "Meta típica para desmame ventilatório";
        else if (score <= -3) meta = "Sedação profunda (indicação: bloqueador neuromuscular, hipertensão intracraniana ou estado de mal epiléptico)";
        else if (score > 0) meta = "Agitação (necessita analgesia, sedação de resgate ou contenção)";

        var alertaUti = null;
        if (score <= -3) {
            alertaUti = "⚠️ CONDUTA EXCLUSIVA DE UTI TERCIÁRIA: Sedação profunda (RASS <= -3) associada a bloqueio neuromuscular contínuo ou controle de HIC é restrita a ambiente de CTI/UTI. Contraindicada a manutenção em enfermaria geral. Acionar leito intensivo imediatamente.";
        }

        return { score: score, nivel: nivel, meta: meta, alertaUti: alertaUti };
    }

    // --- CAM-ICU (Avaliação de Delirium) ---
    function avaliarCAMICU(params) {
        // 1. Alteração aguda do estado mental ou flutuação
        // 2. Desatenção
        // 3. Nível de consciência alterado (RASS diferente de zero)
        // 4. Pensamento desorganizado
        
        if (!params.alteracaoAgudaMental) return { delirium: false, justificativa: "Sem alteração aguda/flutuante do estado mental." };
        if (!params.desatencao) return { delirium: false, justificativa: "Sem desatenção (erro < 3 letras na avaliação de atenção)." };
        
        if (params.alteracaoConsciencia || params.pensamentoDesorganizado) {
            return { 
                delirium: true, 
                justificativa: "Critérios 1 e 2 presentes, e " + (params.alteracaoConsciencia ? "nível de consciência alterado." : "pensamento desorganizado.")
            };
        }

        return { delirium: false, justificativa: "Critérios 3 e 4 ausentes." };
    }

    // --- ROTAÇÃO DE OPIOIDES (MME = Morphine Milligram Equivalent - oral) ---
    function calcularMME(farmaco, via, doseMgDia) {
        var fatorConversao = 0;
        var metadonaObservacao = null;

        var f = farmaco.toLowerCase();
        var v = via.toLowerCase();

        if (f === "morfina") {
            fatorConversao = v === "iv" ? 3.0 : 1.0;
        } else if (f === "oxicodona" && v === "vo") {
            fatorConversao = 1.5;
        } else if (f === "fentanil" && v === "iv") {
            // Fentanil IV dose entra em MG/dia.
            // 1 mg Fentanil IV = 1000 mcg = 100 mg Morfina IV = 300 mg Morfina VO
            fatorConversao = 300.0;
        } else if (f === "metadona" && (v === "vo" || v === "iv")) {
            // Conversão não linear da Metadona
            if (doseMgDia <= 20) { fatorConversao = 4; }
            else if (doseMgDia <= 40) { fatorConversao = 8; }
            else if (doseMgDia <= 60) { fatorConversao = 10; }
            else { fatorConversao = 12; }
            metadonaObservacao = "Conversão não linear; extrema cautela devido à meia-vida longa (pode acumular).";
        } else {
            return { erro: "Fármaco/Via não suportados." };
        }

        var mme = doseMgDia * fatorConversao;
        
        return {
            farmacoOriginal: farmaco,
            viaOriginal: via,
            doseMgDia: doseMgDia,
            mmeDia: Math.round(mme * 10) / 10,
            observacao: metadonaObservacao
        };
    }

    // Converte de um MME de volta para dose alvo com redução cruzada
    function rotacionarOpioide(mmeTotal, alvoFarmaco, alvoVia, reducaoToleranciaCruzada) {
        if (reducaoToleranciaCruzada === undefined) reducaoToleranciaCruzada = 0.25;
        
        var doseMgDiaAlvo = 0;
        var fatorReverso = 0;

        var mmeCorrigido = mmeTotal * (1 - reducaoToleranciaCruzada);

        var f = alvoFarmaco.toLowerCase();
        var v = alvoVia.toLowerCase();

        if (f === "morfina") {
            fatorReverso = v === "iv" ? 3.0 : 1.0;
            doseMgDiaAlvo = mmeCorrigido / fatorReverso;
        } else if (f === "oxicodona" && v === "vo") {
            fatorReverso = 1.5;
            doseMgDiaAlvo = mmeCorrigido / fatorReverso;
        } else if (f === "fentanil" && v === "iv") {
            fatorReverso = 300.0;
            doseMgDiaAlvo = mmeCorrigido / fatorReverso;
        } else if (f === "metadona") {
            return { erro: "Rotação PARA Metadona requer especialista (fator de conversão não reversível facilmente e meia vida longa)." };
        } else {
            return { erro: "Fármaco alvo não suportado." };
        }

        var doseMcgDia = null;
        if (f === "fentanil") {
            doseMcgDia = doseMgDiaAlvo * 1000;
        }

        return {
            alvoFarmaco: alvoFarmaco,
            alvoVia: alvoVia,
            mmeOriginalCorrigido: Math.round(mmeCorrigido * 10) / 10,
            reducaoCruzadaPercentual: reducaoToleranciaCruzada * 100,
            doseMgDiaCalculada: Math.round(doseMgDiaAlvo * 100) / 100,
            doseMcgDiaCalculada: doseMcgDia ? Math.round(doseMcgDia * 100) / 100 : undefined
        };
    }

    return {
        avaliarRASS: avaliarRASS,
        avaliarCAMICU: avaliarCAMICU,
        calcularMME: calcularMME,
        rotacionarOpioide: rotacionarOpioide
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SedacaoOpioidesService; // Ajustado para não usar destructuring
}
