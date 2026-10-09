/**
 * Módulo de Cardiologia Intensiva: Choque Cardiogênico e IC Descompensada
 * Classificação Hemodinâmica Clínico-Beira-Leito de Forrester & Stevenson
 */

var CardiologiaIntensivaService = (function() {
    'use strict';

    /**
     * Estratificação Hemodinâmica (Forrester & Stevenson)
     * @param {Object} dados - { congestao: boolean, baixa_perfusao: boolean }
     */
    function estratificarForresterStevenson(dados) {
        dados = dados || {};
        var congestao = dados.congestao || false; // Estertores, TJP, ascite, edema, ortopneia, B3
        var baixa_perfusao = dados.baixa_perfusao || false; // Extremidades frias, TEC alargado, oligúria, rebaixamento de sensório, pressao de pulso convergente, lactato elevado

        var perfil = "";
        var descricao = "";
        var conduta_geral = "";
        
        if (!congestao && !baixa_perfusao) {
            perfil = "A";
            descricao = "Quente e Seco (Compensado)";
            conduta_geral = "Avaliar outras causas para os sintomas. Ajustar terapia oral modificadora de doença (iECA/BRA, Beta-bloqueador, ARM, iSGLT2).";
        } else if (congestao && !baixa_perfusao) {
            perfil = "B";
            descricao = "Quente e Úmido (Congestão Pulmonar/Sistêmica isolada)";
            conduta_geral = "Otimizar diuréticos de alça (Furosemida IV). Considerar vasodilatadores (Nitroglicerina/Nitroprussiato) se PA adequada/elevada. Contraindicado expansão volêmica.";
        } else if (congestao && baixa_perfusao) {
            perfil = "C";
            descricao = "Frio e Úmido (Choque Cardiogênico Clássico)";
            conduta_geral = "Suporte inotrópico (Dobutamina/Milrinona) associado a diurético (quando estabilizado/perfusão melhorar) ou terapia de substituição renal. Uso de vasopressores (Noradrenalina) se choque franco (PAS < 90mmHg ou PAM < 65mmHg). Vasodilatador geralmente não tolerado inicialmente.";
        } else if (!congestao && baixa_perfusao) {
            perfil = "L";
            descricao = "Frio e Seco (Baixo Débito / Hipovolemia)";
            conduta_geral = "Prova de volume cautelosa (desafio hídrico com alíquotas de 250ml) avaliando responsividade. Se refratário ou piora da congestão sem melhora da perfusão, avaliar inotrópicos.";
        }

        return {
            perfil: perfil,
            descricao: descricao,
            diagnostico_hemodinamico: congestao ? "Presença de Congestão (Elevada Pressão Capilar Pulmonar)" : "Ausência de Congestão",
            perfusao: baixa_perfusao ? "Baixa Perfusão Tecidual (Baixo Débito Cardíaco)" : "Perfusão Tecidual Adequada",
            conduta_geral: conduta_geral
        };
    }

    /**
     * Manejo Específico da Terapia (Inotrópicos, Vasopressores, Vasodilatadores, Diuréticos)
     * @param {Object} paciente - { perfil: 'A'|'B'|'C'|'L', pas: number, pam: number, uso_betabloqueador: boolean, dose_furosemida_previa: number }
     */
    function gerarManejoFarmacologico(paciente) {
        var manejo = {
            diuretico: [],
            vasodilatador: [],
            inotropico: [],
            vasopressor: [],
            bloqueios_seguranca: []
        };

        var pas = paciente.pas || 100;
        var pam = paciente.pam || 75;
        var choque_franco = (pas < 90 || pam < 65);
        var perfil = paciente.perfil || 'B';

        // Bloqueio de Betabloqueador na Descompensação
        if (paciente.uso_betabloqueador && (perfil === 'C' || perfil === 'L' || choque_franco)) {
            manejo.bloqueios_seguranca.push("CONTRAINDICAÇÃO ABSOLUTA: Suspender imediatamente Betabloqueador na fase aguda de choque cardiogênico (Perfis C e L ou hipoperfusão severa).");
        } else if (paciente.uso_betabloqueador && perfil === 'B') {
            manejo.bloqueios_seguranca.push("ALERTA: Betabloqueador pode ser mantido ou ter dose reduzida em Perfil B, a menos que congestão seja severa/EAP refratário.");
        }

        // Diurético (Foco em Furosemida)
        if (perfil === 'B' || perfil === 'C') {
            var dose = paciente.dose_furosemida_previa ? (paciente.dose_furosemida_previa * 1) + " a " + (paciente.dose_furosemida_previa * 2.5) + " mg IV (pelo menos igual à dose oral 24h ou até 2,5x maior, em bolus ou BIC contínua)" : "Furosemida 20 a 40 mg IV (bolus inicial)";
            
            if (perfil === 'B') {
                manejo.diuretico.push("Indicação: Congestão pulmonar/sistêmica.");
                manejo.diuretico.push("Dose Inicial: " + dose);
                manejo.diuretico.push("Meta: Diurese satisfatória (> 100-150 ml/h). Se falha, dobrar a dose ou iniciar infusão contínua, podendo associar tiazídico (bloqueio sequencial do néfron).");
            } else if (perfil === 'C') {
                manejo.diuretico.push("Furosemida: Utilizar com cautela APÓS garantia de perfusão adequada (vasopressor/inotrópico ativos) ou usar com doses mais baixas iniciais. Em choque profundo associado a IRA oligúrica, diurético não fará efeito antes de otimizar débito cardíaco (possível necessidade de Hemodiálise/UF).");
            }
        }

        // Vasodilatador
        if (perfil === 'B' && pas >= 110) {
            manejo.vasodilatador.push("Indicação: Redução de pré e pós-carga, alívio rápido de congestão (EAP).");
            manejo.vasodilatador.push("Fármaco 1ª linha: Nitroglicerina (Tridil) se predomínio de congestão venosa/EAP; ou Nitroprussiato (Nipride) se hipertensão severa predominante e aumento brutal de pós-carga.");
            manejo.vasodilatador.push("Titulação: Iniciar Tridil 5 a 10 mcg/min e titular para alívio de dispneia mantendo PAS > 90-100 mmHg.");
        } else if ((perfil === 'C' || perfil === 'B') && pas < 90) {
            manejo.vasodilatador.push("CONTRAINDICADO: Vasodilatadores clássicos estão contraindicados devido a hipotensão franca (PAS < 90).");
        }

        // Inotrópico
        if (perfil === 'C') {
            manejo.inotropico.push("Indicação: Aumento do débito cardíaco por falência de bomba.");
            manejo.inotropico.push("Dobutamina: 1ª escolha se paciente com PAS tolerável ou já em uso de noradrenalina. Iniciar a 2,5 a 5 mcg/kg/min e titular.");
            manejo.inotropico.push("Milrinona: Inibidor da Fosfodiesterase III (Inodilatador). Excelente se IC direita/hipertensão pulmonar associada, ou uso prévio crônico de betabloqueador (dribla receptor beta). Evitar se hipotensão franca prévia devido ao seu forte efeito vasodilatador, a menos que amparada por Noradrenalina.");
        }

        // Vasopressor
        if (choque_franco) {
            manejo.vasopressor.push("Indicação: Choque cardiogênico franco (hipotensão profunda).");
            manejo.vasopressor.push("Noradrenalina: Vasopressor de eleição para choque cardiogênico com PAS < 85-90 ou PAM < 65. Iniciar 0,05 a 0,1 mcg/kg/min para garantir pressão de perfusão coronariana antes do inotrópico (Dobutamina/Milrinona).");
            manejo.vasopressor.push("Dopamina: NÃO recomendada de rotina (estudo SOAP II: maior mortalidade e arritmias vs noradrenalina).");
        } else if (perfil === 'C' && pas >= 90) {
            manejo.vasopressor.push("Noradrenalina: Pode não ser necessária inicialmente se a pressão for limítrofe, tentar Dobutamina isolada sob vigilância estrita, mas ter Noradrenalina à mão caso ocorra vasodilatação induzida pela Dobutamina.");
        }
        
        // Perfil L
        if (perfil === 'L') {
            manejo.diuretico.push("CONTRAINDICADO: Furosemida (piorará a perfusão).");
            manejo.vasodilatador.push("CONTRAINDICADO: Risco de piora do choque por hipovolemia.");
            manejo.inotropico.push("Avaliar apenas se refratário a prova de volume (250ml SF/RL). Falência de bomba direita ou ventrículo duro (restritivo).");
        }

        return manejo;
    }

    /**
     * API Principal: Avaliação Completa
     */
    function avaliarPacienteICDescompensada(dadosPaciente) {
        var estratificacao = estratificarForresterStevenson(dadosPaciente);
        var pacienteManejo = {
            perfil: estratificacao.perfil,
            pas: dadosPaciente.pas,
            pam: dadosPaciente.pam,
            uso_betabloqueador: dadosPaciente.uso_betabloqueador,
            dose_furosemida_previa: dadosPaciente.dose_furosemida_previa
        };
        var farmacologia = gerarManejoFarmacologico(pacienteManejo);

        return {
            perfil_clinico: estratificacao,
            plano_farmacologico: farmacologia
        };
    }

    return {
        estratificarForresterStevenson: estratificarForresterStevenson,
        gerarManejoFarmacologico: gerarManejoFarmacologico,
        avaliarPacienteICDescompensada: avaliarPacienteICDescompensada
    };

})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = CardiologiaIntensivaService;
}
