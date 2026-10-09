/**
 * Módulo de Gastroenterologia: Pancreatite Aguda e Manejo da Hidratação
 * Motor determinístico baseado nos Critérios de Atlanta, BISAP, Ranson e Marshall.
 */

var GastroenterologiaPancreatiteService = (function() {
    'use strict';

    function calcularBISAP(fatores) {
        // fatores: { bunMaior25: bool, mentalAlterado: bool, sirs: bool, idadeMaior60: bool, derramePleural: bool }
        var score = 0;
        if (fatores.bunMaior25) score += 1;
        if (fatores.mentalAlterado) score += 1;
        if (fatores.sirs) score += 1;
        if (fatores.idadeMaior60) score += 1;
        if (fatores.derramePleural) score += 1;
        
        var mortalidade = "";
        if (score === 0) mortalidade = "< 1%";
        else if (score === 1) mortalidade = "~ 1%";
        else if (score === 2) mortalidade = "~ 2%";
        else if (score === 3) mortalidade = "~ 5%";
        else if (score === 4) mortalidade = "~ 15%";
        else if (score >= 5) mortalidade = "> 20%";

        return {
            escore: score,
            mortalidadeEsperada: mortalidade,
            riscoGravidade: score >= 3 ? "Alto Risco" : "Baixo Risco"
        };
    }

    function protocoloHidratacao(fatores) {
        // fatores: { doencaCardiovascularOuRenal: bool, hematocritoElevado: bool, bunElevado: bool }
        var recomendacao = [];
        var cristaloides = "Ringer Lactato 5-10 mL/kg/h nas primeiras 12-24h";
        
        if (fatores.doencaCardiovascularOuRenal) {
            cristaloides = "Ringer Lactato (com cautela, titulação guiada para evitar sobrecarga e SDRA)";
            recomendacao.push("ALERTA: Paciente com risco de sobrecarga de volume (doença cardíaca/renal). Monitorar atentamente os sinais clínicos.");
        } else if (fatores.hematocritoElevado || fatores.bunElevado) {
            cristaloides = "Ringer Lactato bolus agressivo (20 mL/kg em 30 min) seguido de 3 mL/kg/h";
            recomendacao.push("Alvo Terapêutico: Redução do hematócrito e ureia (BUN) nas primeiras 24h.");
        }
        
        recomendacao.unshift("Hidratação Dirigida por Metas: " + cristaloides);
        return recomendacao;
    }

    function protocoloNutricao(fatores) {
        // fatores: { dorAbdominalControlada: bool, nauseaVomitoAusentes: bool, tempoNPO: number }
        var recomendacao = [];
        
        if (fatores.dorAbdominalControlada && fatores.nauseaVomitoAusentes) {
            recomendacao.push("Nutrição Oral Precoce: Iniciar dieta sólida pobre em gorduras ou líquida clara, conforme tolerância.");
            recomendacao.push("Justificativa: NPO prolongado aumenta o risco de translocação bacteriana e infecção de necrose.");
        } else {
            recomendacao.push("Rejeição de NPO prolongado sem justificativa: Se intolerância oral persistir > 48h, iniciar Nutrição Enteral (sonda nasojejunal ou nasogástrica).");
        }
        
        return recomendacao;
    }

    function avaliarPaciente(params) {
        var bisap = calcularBISAP(params.bisap || {});
        var hidratacao = protocoloHidratacao(params.hidratacao || {});
        var nutricao = protocoloNutricao(params.nutricao || {});
        
        return {
            bisap: bisap,
            protocoloHidratacao: hidratacao,
            protocoloNutricao: nutricao
        };
    }

    return {
        calcularBISAP: calcularBISAP,
        protocoloHidratacao: protocoloHidratacao,
        protocoloNutricao: protocoloNutricao,
        avaliarPaciente: avaliarPaciente
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GastroenterologiaPancreatiteService;
}
