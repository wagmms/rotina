/**
 * Módulo de Nefrologia: Clearance de Creatinina e Auditoria Renal
 * Motor determinístico para cálculo de Cockcroft-Gault e auditoria de prescrições.
 */

var NefrologiaClearanceService = (function() {
    'use strict';

    function calcularCockcroftGault(idade, peso, creatinina, sexo) {
        if (!idade || !peso || !creatinina || !sexo) {
            return { erro: "Parâmetros incompletos. Necessário idade, peso, creatinina e sexo (M/F)." };
        }
        var fator = (sexo.toLowerCase() === 'f' || sexo.toLowerCase() === 'feminino') ? 0.85 : 1.0;
        var crcl = (((140 - idade) * peso) / (72 * creatinina)) * fator;
        return Math.round(crcl * 10) / 10;
    }

    function classificarEstagio(crcl) {
        if (crcl >= 90) return "Estágio 1 (Normal ou Alto - G1)";
        if (crcl >= 60) return "Estágio 2 (Levemente diminuído - G2)";
        if (crcl >= 45) return "Estágio 3a (Leve a moderadamente diminuído - G3a)";
        if (crcl >= 30) return "Estágio 3b (Moderada a severamente diminuído - G3b)";
        if (crcl >= 15) return "Estágio 4 (Severamente diminuído - G4)";
        return "Estágio 5 (Falência renal / G5)";
    }

    function auditarPrescricao(crcl, medicamentos) {
        var auditoria = {
            crcl_estimado: crcl,
            estagio: classificarEstagio(crcl),
            bloqueios: [],
            alertas: [],
            orientacoes: []
        };

        var drogasAjusteObrigatorio = [
            "vancomicina", "meropenem", "piperacilina", "tazobactam", "cefepime", 
            "fluconazol", "enoxaparina", "rivaroxabana", "dabigatrana", "aciclovir", 
            "amicacina", "gentamicina", "polimixina", "colistina", "levofloxacino"
        ];

        var drogasContraindicadasSevera = [
            "nitrofurantoina", "espironolactona", "metformina"
        ];

        if (crcl < 30) {
            auditoria.alertas.push("ALERTA CRÍTICO: Ritmo de Filtração Glomerular < 30 mL/min. Risco elevado de toxicidade e acúmulo de fármacos.");
        }

        if (medicamentos && Array.isArray(medicamentos)) {
            medicamentos.forEach(function(med) {
                var nome = typeof med === 'string' ? med.toLowerCase() : med.nome.toLowerCase();
                
                // Checa contraindicação
                var contraindicado = drogasContraindicadasSevera.some(function(d) { return nome.indexOf(d) !== -1; });
                if (contraindicado && crcl < 30) {
                    auditoria.bloqueios.push("CONTRAINDICAÇÃO ABSOLUTA: " + nome.toUpperCase() + " deve ser evitada em TFG < 30 mL/min.");
                }

                // Checa necessidade de ajuste
                var precisaAjuste = drogasAjusteObrigatorio.some(function(d) { return nome.indexOf(d) !== -1; });
                if (precisaAjuste) {
                    if (crcl < 30) {
                        auditoria.bloqueios.push("AJUSTE RENAL OBRIGATÓRIO: " + nome.toUpperCase() + " requer ajuste imediato de dose para TFG < 30 mL/min.");
                    } else if (crcl < 50) {
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
