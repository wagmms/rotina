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

    function extrairParametrosTexto(texto) {
        var tLimpo = String(texto || "").trim();
        var tNorm = tLimpo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // 1. Idade > 60
        var idadeMaior60 = false;
        var mIdade = tNorm.match(/(?:idade\s*[:=]?\s*(\d+)|\b(\d+)\s*(?:a|anos|y|yo)\b)/i);
        if (mIdade) {
            var vIdade = parseInt(mIdade[1] || mIdade[2], 10);
            if (vIdade > 60) idadeMaior60 = true;
        } else if (/\b(?:idade\s*(?:>|maior(?:\s*que)?)\s*60|idoso|idosa|>60\s*anos)\b/i.test(tNorm)) {
            idadeMaior60 = true;
        }

        // 2. BUN > 25 ou Ureia > 50
        var bunMaior25 = false;
        var mBun = tNorm.match(/\bbun\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
        var mUreia = tNorm.match(/(?:ureia|urea)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
        if (mBun && parseFloat(mBun[1].replace(",", ".")) > 25) {
            bunMaior25 = true;
        } else if (mUreia && parseFloat(mUreia[1].replace(",", ".")) > 50) {
            bunMaior25 = true;
        } else if (/\b(?:bun\s*(?:>|maior)\s*25|ureia\s*(?:>|maior)\s*50|bun\s*elevad[ao]|ureia\s*elevad[ao]|azotemia)\b/i.test(tNorm)) {
            bunMaior25 = true;
        }

        // 3. Estado Mental Alterado (Glasgow < 15, confuso, rebaixado, sonolento)
        var mentalAlterado = false;
        var mGcs = tNorm.match(/(?:glasgow|ecg|gcs)\s*[:=]?\s*(\d+)/i);
        if (mGcs && parseInt(mGcs[1], 10) < 15) {
            mentalAlterado = true;
        } else if (/\b(?:confus[ao]|sonolent[ao]|rebaixad[ao]|desorientad[ao]|torpor(?:os[ao])?|coma|mental\s*alterad[ao]|glasgow\s*<\s*15)\b/i.test(tNorm)) {
            if (!/\b(?:sem\s+confus|nao\s+confus|sem\s+rebaixamento|lucid[ao]|orientad[ao])\b/i.test(tNorm)) {
                mentalAlterado = true;
            }
        }

        // 4. SIRS presente
        var sirs = false;
        var critsSirs = 0;
        var mFc = tNorm.match(/\bfc\s*[:=]?\s*(\d+)/i);
        if (mFc && parseInt(mFc[1], 10) > 90) critsSirs++;
        var mFr = tNorm.match(/\bfr\s*[:=]?\s*(\d+)/i);
        if (mFr && parseInt(mFr[1], 10) > 20) critsSirs++;
        var mTemp = tNorm.match(/(?:tax|temp(?:eratura)?)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
        if (mTemp) {
            var vT = parseFloat(mTemp[1].replace(",", "."));
            if (vT > 38 || vT < 36) critsSirs++;
        } else if (/\b(?:febre|febril|hipotermia)\b/i.test(tNorm)) {
            critsSirs++;
        }
        var mLeuco = tNorm.match(/leuco(?:citos)?\s*[:=]?\s*(\d+)/i);
        if (mLeuco) {
            var vL = parseInt(mLeuco[1], 10);
            if (vL > 12000 || (vL > 12 && vL < 100) || vL < 4000) critsSirs++;
        } else if (/\b(?:leucocitose|leucopenia)\b/i.test(tNorm)) {
            critsSirs++;
        }

        if (critsSirs >= 2) {
            sirs = true;
        } else if (/\bsirs\b/i.test(tNorm) && !/\b(?:sem\s+sirs|sirs\s*[-:]?\s*nao)\b/i.test(tNorm)) {
            sirs = true;
        }

        // 5. Derrame Pleural
        var derramePleural = false;
        if (/\b(?:derrame(?:\s+pleural)?|\bep\b)\b/i.test(tNorm)) {
            if (!/\b(?:sem\s+derrame|derrame\s*(?:ausente|negativo|nao))\b/i.test(tNorm)) {
                derramePleural = true;
            }
        }

        // Hidratação
        var doencaCardioRenal = /\b(?:ic|icc|insuficiencia\s+cardiaca|drc|ira|cardiopata|nefropata|renal)\b/i.test(tNorm) &&
            !/\b(?:sem\s+(?:ic|icc|drc|ira|doenca)|nao\s+cardiopata)\b/i.test(tNorm);
        var mHt = tNorm.match(/(?:ht|hematocrito)\s*[:=]?\s*(\d+)/i);
        var htElevado = (mHt && parseInt(mHt[1], 10) > 44) || /\b(?:hematocrito\s*elevad[ao]|ht\s*elevad[ao]|hemoconcentracao)\b/i.test(tNorm);
        var bunElevado = bunMaior25 || /\b(?:bun\s*elevad[ao]|ureia\s*elevad[ao])\b/i.test(tNorm);

        // Nutrição
        var dorControlada = /\b(?:dor\s+(?:controlada|aliviada|ausente|melhor|cedeu)|sem\s+dor)\b/i.test(tNorm);
        var nauseaVomitoAusentes = /\b(?:sem\s+(?:vomito|nausea|emese)|tolerando|vomitos?\s+ausente|nauseas?\s+ausente)\b/i.test(tNorm);
        var mNpo = tNorm.match(/(?:npo|jejum)\s*[:=]?\s*(\d+)\s*(?:h|horas)?/i);
        var tempoNPO = mNpo ? parseInt(mNpo[1], 10) : 0;

        return {
            bisap: {
                bunMaior25: bunMaior25,
                mentalAlterado: mentalAlterado,
                sirs: sirs,
                idadeMaior60: idadeMaior60,
                derramePleural: derramePleural
            },
            hidratacao: {
                doencaCardiovascularOuRenal: doencaCardioRenal,
                hematocritoElevado: htElevado,
                bunElevado: bunElevado
            },
            nutricao: {
                dorAbdominalControlada: dorControlada,
                nauseaVomitoAusentes: nauseaVomitoAusentes,
                tempoNPO: tempoNPO
            }
        };
    }

    return {
        calcularBISAP: calcularBISAP,
        protocoloHidratacao: protocoloHidratacao,
        protocoloNutricao: protocoloNutricao,
        avaliarPaciente: avaliarPaciente,
        extrairParametrosTexto: extrairParametrosTexto
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GastroenterologiaPancreatiteService;
}
