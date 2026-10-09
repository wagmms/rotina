/**
 * @file 02_nefrologia_lra_kdigo.js
 * @description Módulo de Nefrologia Intensiva: Estadiamento KDIGO para Lesão Renal Aguda (LRA/IRA)
 * e avaliação de indicações clássicas para Diálise de Urgência (AEIOU).
 */

var NefrologiaLRAService = (function() {
    'use strict';

    /**
     * Calcula o estágio KDIGO com base na creatinina e débito urinário.
     * @param {number} cr_basal - Creatinina basal prévia (mg/dL)
     * @param {number} cr_atual - Creatinina atual ou pico (mg/dL)
     * @param {number} debito_urinario - Débito urinário em mL/kg/h
     * @param {number} horas_oliguria - Horas em que o paciente está com débito urinário < 0.5 mL/kg/h ou anúrico
     * @returns {Object} Dados do estadiamento KDIGO
     */
    function estadiarKDIGO(cr_basal, cr_atual, debito_urinario, horas_oliguria) {
        var aumento_cr = cr_atual / cr_basal;
        var estagio_cr = 0;
        var estagio_du = 0;

        // Estadiamento por Creatinina
        if (cr_atual >= 4.0 || aumento_cr >= 3.0 || (cr_atual - cr_basal >= 0.3 && cr_atual >= 4.0)) {
            estagio_cr = 3;
        } else if (aumento_cr >= 2.0) {
            estagio_cr = 2;
        } else if (aumento_cr >= 1.5 || (cr_atual - cr_basal >= 0.3)) {
            estagio_cr = 1;
        }

        // Estadiamento por Débito Urinário (DU)
        if (debito_urinario !== null && horas_oliguria !== null) {
            if (debito_urinario < 0.3 && horas_oliguria >= 24 || horas_oliguria >= 12 && debito_urinario === 0) {
                estagio_du = 3; // Anúria > 12h ou DU < 0.3 por 24h
            } else if (debito_urinario < 0.5 && horas_oliguria >= 12) {
                estagio_du = 2;
            } else if (debito_urinario < 0.5 && horas_oliguria >= 6) {
                estagio_du = 1;
            }
        }

        var estagio_final = Math.max(estagio_cr, estagio_du);
        
        var descricao = "Sem LRA KDIGO (Função Renal Estável)";
        if (estagio_final === 1) descricao = "KDIGO 1 (Risco)";
        else if (estagio_final === 2) descricao = "KDIGO 2 (Lesão)";
        else if (estagio_final === 3) descricao = "KDIGO 3 (Falência)";

        return {
            estagio: estagio_final,
            descricao: descricao,
            estagio_cr: estagio_cr,
            estagio_du: estagio_du
        };
    }

    /**
     * Avalia as indicações clássicas de diálise de urgência (Mnemônico AEIOU)
     * @param {Object} dados - Dados clínicos do paciente
     */
    function avaliarDialiseUrgencia(dados) {
        var indicacoes = [];
        var aeiou = {
            acidose: false,
            eletrolitos: false,
            intoxicacao: false,
            overload: false,
            uremia: false
        };

        if (dados.ph < 7.15 && dados.acidose_refrataria) {
            indicacoes.push("🅰️ Acidose Metabólica grave refratária ao tratamento clínico (pH < 7.15).");
            aeiou.acidose = true;
        }

        if (dados.potassio > 6.5 || (dados.potassio > 6.0 && dados.ecg_alterado)) {
            indicacoes.push("🇪 Eletrólitos: Hipercalemia grave refratária (K > 6.5) ou sintomática com alterações no ECG.");
            aeiou.eletrolitos = true;
        }

        if (dados.intoxicacao_dialisavel) {
            indicacoes.push("🇮 Intoxicação por substâncias dialisáveis (ex: Lítio, Salicilatos, Metanol, Etilenoglicol).");
            aeiou.intoxicacao = true;
        }

        if (dados.eap_refratario) {
            indicacoes.push("🅾️ Overload (Sobrecarga Hídrica): Edema Agudo de Pulmão refratário a diuréticos / oligúria severa.");
            aeiou.overload = true;
        }

        if (dados.ureia > 200 || dados.sindrome_uremica) {
            indicacoes.push("🇺 Uremia Clínica: Pericardite urêmica, encefalopatia urêmica ou sangramento inexplicável.");
            aeiou.uremia = true;
        }

        return {
            indicacoes_presentes: indicacoes.length > 0,
            lista: indicacoes,
            aeiou: aeiou
        };
    }

    /**
     * Avaliação principal de LRA
     * @param {Object} params
     */
    function avaliarLRA(params) {
        var cr_basal = parseFloat(params.cr_basal);
        var cr_atual = parseFloat(params.cr_atual);
        var du = params.debito_urinario !== undefined ? parseFloat(params.debito_urinario) : null;
        var horas = params.horas_oliguria !== undefined ? parseFloat(params.horas_oliguria) : null;

        if (isNaN(cr_basal) || isNaN(cr_atual)) {
            throw new Error("Valores de creatinina basal e atual são obrigatórios para avaliar LRA.");
        }

        var kdigo = estadiarKDIGO(cr_basal, cr_atual, du, horas);
        var dialise = avaliarDialiseUrgencia(params);

        return {
            kdigo: kdigo,
            dialise: dialise,
            params_recebidos: params
        };
    }

    /**
     * Formata texto para Telegram
     */
    function formatarTextoTelegram(analise) {
        var k = analise.kdigo;
        var d = analise.dialise;

        var txt = "🫘 *NEFROLOGIA INTENSIVA — INJÚRIA RENAL AGUDA (KDIGO)*\n\n";
        
        txt += "📊 *ESTADIAMENTO KDIGO:*\n";
        txt += "• Classificação Final: *" + k.descricao + "*\n";
        
        if (k.estagio > 0) {
            txt += "• *Conduta Geral LRA:* Otimizar volemia, suspender nefrotóxicos (AINEs, contraste, iECA/BRA temporariamente), ajustar doses de antimicrobianos pelo ClCr, monitorar eletrólitos (K+, Mg++) e débito urinário diário.\n";
        }

        txt += "\n🚨 *INDICAÇÕES DE DIÁLISE DE URGÊNCIA (AEIOU):*\n";
        if (d.indicacoes_presentes) {
            txt += "⚠️ *CRÍTICO: Paciente possui critérios para Terapia Renal Substitutiva IMEDIATA!*\n";
            d.lista.forEach(function(item) {
                txt += item + "\n";
            });
            txt += "\n👉 *Ação:* Acionar equipe de Nefrologia de plantão e providenciar acesso venoso central de duplo lúmen (Shilley) preferencialmente em Veia Jugular Interna Direita.";
        } else {
            txt += "✅ Sem critérios clássicos para diálise de urgência no momento.\n";
            txt += "_(Checagem Mnemônica: Acidose, Eletrólitos, Intoxicação, Overload de volume, Uremia)_\n";
        }

        txt += "\n_Referência: Protocolos KDIGO (Kidney Disease: Improving Global Outcomes)_";

        return txt;
    }

    return {
        estadiarKDIGO: estadiarKDIGO,
        avaliarDialiseUrgencia: avaliarDialiseUrgencia,
        avaliarLRA: avaliarLRA,
        formatarTextoTelegram: formatarTextoTelegram
    };
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = NefrologiaLRAService;
}
