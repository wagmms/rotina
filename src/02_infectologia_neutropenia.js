/**
 * Módulo de Infectologia: Manejo de Neutropenia Febril Oncológica
 * Motor determinístico baseado nas diretrizes MASCC, CISNE e IDSA.
 */

var InfectologiaNeutropeniaService = (function() {
    'use strict';

    function calcularMASCC(fatores) {
        // fatores: { cargaSintomas: 'leve'|'moderada'|'grave', semHipotensao: bool, semDpoc: bool, tumorSolidoOuHematoSemFungo: bool, semDesidratacao: bool, ambulatorial: bool, idadeMenor60: bool }
        var score = 0;
        
        if (fatores.cargaSintomas === 'leve' || fatores.cargaSintomas === 'assintomatico') score += 5;
        else if (fatores.cargaSintomas === 'moderada') score += 3;
        
        if (fatores.semHipotensao) score += 5;
        if (fatores.semDpoc) score += 4;
        if (fatores.tumorSolidoOuHematoSemFungo) score += 4;
        if (fatores.semDesidratacao) score += 3;
        if (fatores.ambulatorial) score += 3; // Início da febre em ambiente ambulatorial
        if (fatores.idadeMenor60) score += 2;
        
        var risco = score >= 21 ? 'Baixo Risco' : 'Alto Risco';
        var conduta = score >= 21 ? 'Elegível para tratamento ambulatorial seguro (Ciprofloxacino + Amoxicilina/Clavulanato) se reavaliação garantida.' : 'Internação hospitalar IMEDIATA requerida (Antibioticoterapia IV empírica).';
        
        return {
            escore: score,
            risco: risco,
            conduta: conduta
        };
    }

    
    function calcularCISNE(fatores) {
        // fatores: { ecogMaiorIgual2: bool, dpoc: bool, doencaCardiovascular: bool, mucosite: bool, monocitosMenor200: bool, hiperglicemiaEstresse: bool }
        var score = 0;
        
        if (fatores.ecogMaiorIgual2) score += 2;
        if (fatores.dpoc) score += 1;
        if (fatores.doencaCardiovascular) score += 1;
        if (fatores.mucosite) score += 1; // NCI CTCAE >= grade 2
        if (fatores.monocitosMenor200) score += 1;
        if (fatores.hiperglicemiaEstresse) score += 2;
        
        var risco = "";
        var complicacoes = "";
        
        if (score === 0) {
            risco = "Baixo Risco (CISNE)";
            complicacoes = "~1.1%";
        } else if (score >= 1 && score <= 2) {
            risco = "Risco Intermediário (CISNE)";
            complicacoes = "~6.2%";
        } else {
            risco = "Alto Risco (CISNE)";
            complicacoes = "~36%";
        }
        
        return {
            escore: score,
            risco: risco,
            complicacoes: complicacoes
        };
    }

    function protocoloAntibiotico(fatores) {
        // fatores: { instabilidade: bool, suspeitaCateter: bool, mrsa: bool, alergiaPenicilina: 'nao'|'leve'|'grave', diasFebre: number }
        var recomendacao = [];
        var bloqueios = [];
        var atbBase = "";

        if (fatores.alergiaPenicilina === 'grave') {
            atbBase = "Aztreonam 2g IV 8/8h + Vancomicina";
        } else {
            atbBase = "Cefepime 2g IV 8/8h OU Piperacilina-Tazobactam 4.5g IV 6/6h (terapia anti-pseudomonas)";
        }
        
        recomendacao.push("1ª Linha: " + atbBase);
        
        if (fatores.instabilidade || fatores.suspeitaCateter || fatores.mrsa) {
            recomendacao.push("Adicionar COBERTURA GRAM-POSITIVA (MRSA): Vancomicina 15-20 mg/kg IV 12/12h.");
            if (fatores.instabilidade) {
                recomendacao.push("ALERTA DE CHOQUE: Iniciar antibioticoterapia na 1ª hora (Golden Hour) + Ressuscitação Volêmica.");
            }
        }
        
        if (fatores.diasFebre >= 4 && fatores.diasFebre <= 7) {
            recomendacao.push("FEBRE REFRATÁRIA (> 4-7 dias): Forte indicação de terapia antifúngica empírica com Echinocandina (ex: Anidulafungina ou Caspofungina) ou Anfotericina B Lipossomal.");
        }
        
        return {
            recomendacoes: recomendacao,
            bloqueios: bloqueios
        };
    }

    function avaliarPaciente(params) {
        var mascc = calcularMASCC(params.mascc || {});
        var cisne = params.cisne ? calcularCISNE(params.cisne) : null;
        var atb = protocoloAntibiotico(params.clinica || {});
        
        var alertas = [];
        if (mascc.risco === 'Alto Risco') {
            alertas.push("ISOLAMENTO PROTETOR: Manter paciente em quarto privativo, higiene rigorosa das mãos.");
        }
        
        return {
            mascc: mascc,
            cisne: cisne,
            antibioticoterapia: atb,
            alertas: alertas
        };
    }

    return {
        calcularMASCC: calcularMASCC,
        calcularCISNE: calcularCISNE,
        protocoloAntibiotico: protocoloAntibiotico,
        avaliarPaciente: avaliarPaciente
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = InfectologiaNeutropeniaService;
}
