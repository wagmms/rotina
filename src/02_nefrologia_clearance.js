/**
 * Módulo de Nefrologia: Clearance de Creatinina e Auditoria Renal
 * Motor determinístico para cálculo de Cockcroft-Gault e auditoria de prescrições.
 */

var NefrologiaClearanceService = (function() {
    'use strict';

    function calcularCockcroftGault(idade, peso, creatinina, sexo) {
        if (idade === undefined || peso === undefined || creatinina === undefined || !sexo) {
            return { erro: "Parâmetros incompletos. Necessário idade, peso, creatinina e sexo (M/F)." };
        }
        var id = parseFloat(idade);
        var p = parseFloat(peso);
        var cr = parseFloat(creatinina);

        if (isNaN(id) || isNaN(p) || isNaN(cr) || id <= 0 || p <= 0 || cr <= 0) {
            return { erro: "Parâmetros inválidos. Idade, peso e creatinina devem ser números positivos maiores que zero." };
        }

        // Blindagem contra idade extrema (>= 140 anos evitaria numerador negativo)
        var idCalc = Math.min(120, id);

        var sexoStr = String(sexo).toLowerCase();
        var fator = (sexoStr === 'f' || sexoStr === 'feminino') ? 0.85 : 1.0;

        // Fórmula de Cockcroft-Gault: ((140 - idade) * peso) / (72 * Cr)
        var crcl = (((140 - idCalc) * p) / (72 * cr)) * fator;
        if (!isFinite(crcl) || isNaN(crcl) || crcl < 0) crcl = 0;

        return Math.round(crcl * 10) / 10;
    }

    function classificarEstagio(crcl) {
        var num = typeof crcl === 'number' ? crcl : parseFloat(crcl);
        if (isNaN(num) || num < 0) return "Estágio 5 (Falência renal / G5)";
        if (num >= 90) return "Estágio 1 (Normal ou Alto - G1)";
        if (num >= 60) return "Estágio 2 (Levemente diminuído - G2)";
        if (num >= 45) return "Estágio 3a (Leve a moderadamente diminuído - G3a)";
        if (num >= 30) return "Estágio 3b (Moderada a severamente diminuído - G3b)";
        if (num >= 15) return "Estágio 4 (Severamente diminuído - G4)";
        return "Estágio 5 (Falência renal / G5)";
    }

    function auditarPrescricao(crcl, medicamentos, opcoes) {
        opcoes = opcoes || {};
        var valorCrcl = typeof crcl === 'object' && crcl !== null ? (crcl.crcl !== undefined ? crcl.crcl : null) : crcl;
        var crclNum = parseFloat(valorCrcl);

        var auditoria = {
            crcl_estimado: isNaN(crclNum) ? 0 : crclNum,
            estagio: classificarEstagio(isNaN(crclNum) ? 0 : crclNum),
            bloqueios: [],
            alertas: [],
            orientacoes: []
        };

        if (isNaN(crclNum) || crclNum < 0) {
            auditoria.alertas.push("ALERTA DE SEGURANÇA: Clearance não mensurável ou indeterminado. Tratar como disfunção renal grave (TFG < 15 mL/min) por segurança farmacológica.");
            crclNum = 0;
        }

        // Casos extremos de laboratório ou biometria
        if (opcoes.creatinina !== undefined && Number(opcoes.creatinina) > 15) {
            auditoria.alertas.push("🚨 ALERTA CRÍTICO: Creatinina sérica extremamente elevada (> 15 mg/dL: " + opcoes.creatinina + " mg/dL). Falência renal terminal com risco iminente de síndrome urêmica e indicação de diálise de urgência (AEIOU).");
        }
        if (opcoes.idade !== undefined && Number(opcoes.idade) >= 90) {
            auditoria.alertas.push("⚠️ PACIENTE MUITO IDOSO (≥ 90 ANOS): Sarcopenia acentuada reduz a produção de creatinina, superestimando o clearance real. Avaliar Cistatina C e monitorar toxicidade.");
        }
        if (opcoes.peso !== undefined && Number(opcoes.peso) > 150) {
            auditoria.alertas.push("⚠️ OBESIDADE SEVERA (> 150 KG): O cálculo de clearance com peso real superestima a filtração glomerular. Recomenda-se usar Peso Ajustado (ABW) ou Peso Ideal para ajuste farmacológico.");
        }

        var drogasAjusteObrigatorio = [
            "vancomicina", "meropenem", "piperacilina", "tazobactam", "cefepime", 
            "fluconazol", "enoxaparina", "rivaroxabana", "dabigatrana", "aciclovir", 
            "amicacina", "gentamicina", "polimixina", "colistina", "levofloxacino"
        ];

        var drogasContraindicadasSevera = [
            "nitrofurantoina", "espironolactona", "metformina"
        ];

        if (crclNum < 30) {
            auditoria.alertas.push("ALERTA CRÍTICO: Ritmo de Filtração Glomerular < 30 mL/min. Risco elevado de toxicidade e acúmulo de fármacos.");
        }

        if (medicamentos && Array.isArray(medicamentos)) {
            medicamentos.forEach(function(med) {
                var nome = typeof med === 'string' ? med.toLowerCase() : (med && med.nome ? med.nome.toLowerCase() : '');
                if (!nome) return;
                
                // Checa contraindicação
                var contraindicado = drogasContraindicadasSevera.some(function(d) { return nome.indexOf(d) !== -1; });
                if (contraindicado && crclNum < 30) {
                    auditoria.bloqueios.push("CONTRAINDICAÇÃO ABSOLUTA: " + nome.toUpperCase() + " deve ser evitada em TFG < 30 mL/min.");
                }

                // Checa necessidade de ajuste
                var precisaAjuste = drogasAjusteObrigatorio.some(function(d) { return nome.indexOf(d) !== -1; });
                if (precisaAjuste) {
                    if (crclNum < 30) {
                        auditoria.bloqueios.push("AJUSTE RENAL OBRIGATÓRIO: " + nome.toUpperCase() + " requer ajuste imediato de dose para TFG < 30 mL/min.");
                    } else if (crclNum < 50) {
                        auditoria.alertas.push("ATENÇÃO: " + nome.toUpperCase() + " requer avaliação de ajuste de dose (TFG < 50 mL/min).");
                    }
                }
            });
        }

        if (auditoria.bloqueios.length === 0 && auditoria.alertas.length === 0 && medicamentos && medicamentos.length > 0) {
             auditoria.orientacoes.push("Nenhuma restrição maior detectada para os medicamentos fornecidos com base neste clearance.");
        }

        return auditoria;
    }

    return {
        calcularCockcroftGault: calcularCockcroftGault,
        classificarEstagio: classificarEstagio,
        auditarPrescricao: auditarPrescricao
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NefrologiaClearanceService;
}
