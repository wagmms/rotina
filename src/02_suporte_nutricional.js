/**
 * Módulo de Suporte Nutricional Enteral e Parenteral (UTI/Enfermaria)
 * Calculadora basal, síndrome de realimentação e prescrição NE/NPT.
 */

var SuporteNutricionalService = (function() {
    'use strict';

    function calcularNecessidadesBasais(peso, alturaCm, idade, sexo, fatorEstresse) {
        var tmb = 0;
        if (sexo.toLowerCase() === 'm') {
            tmb = 66.5 + (13.75 * peso) + (5.003 * alturaCm) - (6.75 * idade);
        } else {
            tmb = 655.1 + (9.563 * peso) + (1.85 * alturaCm) - (4.676 * idade);
        }
        
        var fator = fatorEstresse || 1.0;
        var vetHb = tmb * fator;
        
        var vetBolsoMin = peso * 25;
        var vetBolsoMax = peso * 30;
        
        var protMin = peso * 1.2;
        var protMax = peso * 2.0;

        return {
            tmb_kcal: Math.round(tmb),
            vet_harris_benedict_kcal: Math.round(vetHb),
            vet_regra_bolso_kcal: Math.round(vetBolsoMin) + " a " + Math.round(vetBolsoMax),
            proteina_alvo_g: Math.round(protMin) + " a " + Math.round(protMax),
            alerta: "Em pacientes críticos ou obesos, o peso ideal ou ajustado deve ser considerado. O alvo calórico inicial não deve ultrapassar 20-25 kcal/kg para prevenir superalimentação."
        };
    }

    function avaliarRiscoRealimentacao(imc, perdaPesoMeses, jejumDias, k, mg, p) {
        var altoRisco = false;
        var motivos = [];
        
        if (imc < 16) { altoRisco = true; motivos.push("IMC < 16"); }
        if (perdaPesoMeses > 15) { altoRisco = true; motivos.push("Perda de peso > 15% em 3-6 meses"); }
        if (jejumDias > 10) { altoRisco = true; motivos.push("Jejum > 10 dias"); }
        if (k < 3.5 || mg < 1.5 || p < 2.0) { altoRisco = true; motivos.push("Hipocalemia, hipomagnesemia ou hipofosfatemia basal"); }
        
        var criteriosMenores = 0;
        if (imc >= 16 && imc < 18.5) { criteriosMenores++; motivos.push("IMC < 18.5"); }
        if (perdaPesoMeses > 10 && perdaPesoMeses <= 15) { criteriosMenores++; motivos.push("Perda de peso > 10% em 3-6 meses"); }
        if (jejumDias > 5 && jejumDias <= 10) { criteriosMenores++; motivos.push("Jejum > 5 dias"); }
        
        if (criteriosMenores >= 2) { altoRisco = true; motivos.push("2 ou mais critérios menores presentes"); }
        
        var condutas = [];
        if (altoRisco) {
            condutas.push("ALERTA CRÍTICO: ALTO RISCO PARA SÍNDROME DE REALIMENTAÇÃO.");
            condutas.push("REPOSIÇÃO EMPÍRICA ANTES DA DIETA: Tiamina 200-300 mg IV 30 min antes de iniciar nutrição e continuar por 3 dias.");
            condutas.push("CORREÇÃO ELETROLÍTICA: Repor Potássio (KCl), Magnésio (MgSO4) e Fósforo (Fosfato de Potássio/Sódio) proativamente.");
            condutas.push("INÍCIO LENTO DA DIETA: Iniciar com 10 kcal/kg/dia ou 50% do alvo, evoluindo em 4-7 dias.");
            condutas.push("MONITORAMENTO: Dosar P, Mg, K e Ca diariamente nos primeiros 3-5 dias.");
        } else {
            condutas.push("Risco baixo a moderado. Avançar dieta até o alvo em 48-72h. Monitorar eletrólitos.");
        }
        
        return {
            altoRisco: altoRisco,
            motivos: motivos,
            condutas: condutas
        };
    }

    function prescreverTerapiaNutricional(jejumDias, tratoGastrointestinalFuncionante, nrs2002, nutricScore) {
        var riscoNutricional = (nrs2002 >= 3 || nutricScore >= 5);
        var indicacao = [];
        var via = "";
        
        if (tratoGastrointestinalFuncionante) {
            via = "NUTRIÇÃO ENTERAL PRECOCE (NE)";
            if (jejumDias >= 2) {
                indicacao.push("Iniciar NE nas primeiras 24-48h de admissão na UTI/Enfermaria.");
            } else {
                indicacao.push("Iniciar NE precocemente. Progressão lenta para atingir meta em 3-7 dias.");
            }
        } else {
            via = "NUTRIÇÃO PARENTERAL (NPT)";
            if (riscoNutricional) {
                indicacao.push("Alto risco nutricional. Iniciar NPT precoce se NE contraindicada ou inviável.");
            } else {
                if (jejumDias <= 7) {
                    indicacao.push("Baixo risco nutricional. Aguardar até 7 dias de jejum antes de iniciar NPT exclusiva (respeitando fase aguda do estresse).");
                } else {
                    indicacao.push("Jejum prolongado (>7 dias). Iniciar NPT suplementar ou total.");
                }
            }
        }
        
        return {
            via: via,
            riscoNutricional: riscoNutricional,
            condutas: indicacao
        };
    }

    return {
        calcularNecessidadesBasais: calcularNecessidadesBasais,
        avaliarRiscoRealimentacao: avaliarRiscoRealimentacao,
        prescreverTerapiaNutricional: prescreverTerapiaNutricional
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SuporteNutricionalService;
}
