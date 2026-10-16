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

    /**
     * Avalia a função renal e o clearance nefrológico em conformidade estrita com o KDIGO 2024.
     * Integra CKD-EPI 2021 Creatinina (eGFRcr) e combinação Creatinina + Cistatina C (eGFRcr-cys),
     * estadiamento CGA (G1–G5 e A1–A3) e auditoria de concordância diagnóstica.
     *
     * @param {Object} params Parâmetros clínicos e laboratoriais
     * @param {number} params.creatinina Creatinina sérica (mg/dL)
     * @param {number} params.idade Idade em anos (>= 18)
     * @param {string|boolean} params.sexo Sexo biológico ('M' | 'F') ou ehFeminino
     * @param {number} [params.cistatinaC] Cistatina C sérica em mg/L (opcional - KDIGO 2024)
     * @param {number} [params.pesoKg] Peso corporal em kg (para Cockcroft-Gault complementar)
     * @param {number} [params.relacaoAlbuminaCreatinina] RAC urinária em mg/g (para estadiamento A1-A3)
     * @returns {Object} Avaliação nefrológica completa KDIGO 2024
     */
    function avaliarClearanceNefrologico(params) {
        params = params || {};
        var creatinina = params.creatinina !== undefined ? params.creatinina : params.scr;
        var idade = params.idade;
        var sexo = params.sexo !== undefined ? params.sexo : params.ehFeminino;
        var cistatinaC = params.cistatinaC !== undefined ? params.cistatinaC : params.scys;
        var pesoKg = params.pesoKg !== undefined ? params.pesoKg : params.peso;
        var racInput = params.relacaoAlbuminaCreatinina !== undefined ? params.relacaoAlbuminaCreatinina : params.rac;

        var scr = parseFloat(creatinina);
        var id = parseFloat(idade);
        var scys = (cistatinaC !== undefined && cistatinaC !== null && String(cistatinaC).trim() !== '') ? parseFloat(cistatinaC) : null;

        if (isNaN(scr) || scr <= 0) {
            return { erro: "Creatinina sérica inválida para avaliação nefrológica KDIGO 2024." };
        }
        if (isNaN(id) || id < 18) {
            return { erro: "Idade inválida: diretriz KDIGO 2024 CKD-EPI é validada para adultos (>= 18 anos)." };
        }

        var sexoStr = String(sexo || '').toUpperCase().trim();
        var isFem = (sexo === true) || ['F', 'FEM', 'FEMININO', 'FEMALE', 'MULHER'].indexOf(sexoStr) !== -1;

        // 1. CKD-EPI 2021 Creatinina Isolada (eGFRcr)
        var kCr = isFem ? 0.7 : 0.9;
        var aCr = isFem ? -0.241 : -0.302;
        var fCr = isFem ? 1.012 : 1.0;
        var rCr = scr / kCr;
        var tfgCr = 142 * Math.pow(Math.min(rCr, 1), aCr) * Math.pow(Math.max(rCr, 1), -1.200) * Math.pow(0.9938, id) * fCr;
        tfgCr = Math.round(tfgCr * 10) / 10;

        function estadiarG(val) {
            if (val >= 90) return { estadio: 'G1', descricao: 'Normal ou elevada', faixa: '>= 90 mL/min/1,73m²' };
            if (val >= 60) return { estadio: 'G2', descricao: 'Levemente diminuída', faixa: '60–89 mL/min/1,73m²' };
            if (val >= 45) return { estadio: 'G3a', descricao: 'Leve a moderadamente diminuída', faixa: '45–59 mL/min/1,73m²' };
            if (val >= 30) return { estadio: 'G3b', descricao: 'Moderada a gravemente diminuída', faixa: '30–44 mL/min/1,73m²' };
            if (val >= 15) return { estadio: 'G4', descricao: 'Gravemente diminuída', faixa: '15–29 mL/min/1,73m²' };
            return { estadio: 'G5', descricao: 'Falência renal (Estádio Terminal)', faixa: '< 15 mL/min/1,73m²' };
        }

        var estadiamentoCr = estadiarG(tfgCr);

        // 2. CKD-EPI 2021 Combinada Creatinina-Cistatina C (eGFRcr-cys - KDIGO 2024)
        var tfgComb = null;
        var estadiamentoComb = null;
        var concordancia = {
            avaliada: false,
            cistatinaCFornecida: false,
            estadiosConcordantes: null,
            reclassificacaoKDIGO: null,
            diferencaAbsolutaMlMin: null,
            diferencaPercentual: null,
            interpretacaoClinica: 'Cistatina C não informada. Em casos limítrofes (TFG 45–59 mL/min/1,73m² sem albuminúria) ou extremos de massa muscular, o KDIGO 2024 recomenda dosar Cistatina C para cálculo da eGFRcr-cys.'
        };

        if (scys !== null && !isNaN(scys) && scys > 0) {
            var kComb = isFem ? 0.7 : 0.9;
            var aComb = isFem ? -0.219 : -0.144;
            var fComb = isFem ? 1.018 : 1.0;
            var rScr = scr / kComb;
            var rScys = scys / 0.8;

            var tfgCombBruta =
                135 *
                Math.pow(Math.min(rScr, 1), aComb) *
                Math.pow(Math.max(rScr, 1), -0.544) *
                Math.pow(Math.min(rScys, 1), -0.323) *
                Math.pow(Math.max(rScys, 1), -0.778) *
                Math.pow(0.9961, id) *
                fComb;

            tfgComb = Math.round(tfgCombBruta * 10) / 10;
            estadiamentoComb = estadiarG(tfgComb);

            var diffAbs = Math.round((tfgComb - tfgCr) * 10) / 10;
            var diffPct = Math.round((Math.abs(diffAbs) / tfgCr) * 1000) / 10;
            var mesmoEstadio = estadiamentoCr.estadio === estadiamentoComb.estadio;

            concordancia = {
                avaliada: true,
                cistatinaCFornecida: true,
                estadiosConcordantes: mesmoEstadio,
                reclassificacaoKDIGO: mesmoEstadio
                    ? ('Mantido em ' + estadiamentoComb.estadio)
                    : ('Reclassificado de ' + estadiamentoCr.estadio + ' (eGFRcr) para ' + estadiamentoComb.estadio + ' (eGFRcr-cys)'),
                diferencaAbsolutaMlMin: diffAbs,
                diferencaPercentual: diffPct,
                interpretacaoClinica: mesmoEstadio
                    ? ('Alta concordância diagnóstica KDIGO 2024: ambas as equações classificam o paciente no estádio ' + estadiamentoComb.estadio + '. Utilizar a tfgCombinada (' + tfgComb + ' mL/min/1,73m²) como referência padrão-ouro.')
                    : ('Discordância inter-equações detectada (' + estadiamentoCr.estadio + ' vs ' + estadiamentoComb.estadio + '). Segundo a Diretriz KDIGO 2024, a equação combinada Creatinina-Cistatina C (' + tfgComb + ' mL/min/1,73m² - ' + estadiamentoComb.estadio + ') possui maior acurácia e deve guiar o ajuste posológico e o estadiamento.')
            };
        }

        var tfgOficial = tfgComb !== null ? tfgComb : tfgCr;
        var estadiamentoOficial = estadiamentoComb !== null ? estadiamentoComb : estadiamentoCr;

        // 3. Albuminúria KDIGO (A1, A2, A3)
        var categoriaAlbuminuria = null;
        if (racInput !== undefined && racInput !== null && !isNaN(racInput)) {
            var racNum = parseFloat(racInput);
            if (racNum < 30) {
                categoriaAlbuminuria = { categoria: 'A1', descricao: 'Normal a levemente aumentada (< 30 mg/g)' };
            } else if (racNum <= 300) {
                categoriaAlbuminuria = { categoria: 'A2', descricao: 'Moderadamente aumentada (30–300 mg/g)' };
            } else {
                categoriaAlbuminuria = { categoria: 'A3', descricao: 'Gravemente aumentada (> 300 mg/g)' };
            }
        }

        // 4. Cockcroft-Gault se peso informado
        var cgMlMin = null;
        if (pesoKg !== undefined && pesoKg !== null && !isNaN(pesoKg) && parseFloat(pesoKg) > 0) {
            cgMlMin = calcularCockcroftGault(id, pesoKg, scr, isFem ? 'f' : 'm');
            if (typeof cgMlMin === 'object' && cgMlMin.erro) cgMlMin = null;
        }

        // 5. Alertas de conformidade KDIGO 2024
        var alertasKDIGO = [];
        if (tfgComb !== null) {
            alertasKDIGO.push(
                '[CONFORMIDADE KDIGO 2024 - PADRÃO-OURO ATIVO]: Equação combinada CKD-EPI 2021 Creatinina-Cistatina C (eGFRcr-cys = ' + tfgComb + ' mL/min/1,73m²) utilizada como métrica principal de estadiamento (' + estadiamentoOficial.estadio + ') e ajuste de fármacos.'
            );
            if (!concordancia.estadiosConcordantes) {
                alertasKDIGO.push(
                    '[ALERTA DE RECLASSIFICAÇÃO KDIGO 2024]: ' + concordancia.reclassificacaoKDIGO + '. Priorizar a eGFRcr-cys para decisões clínicas críticas e nefroproteção.'
                );
            }
        } else {
            alertasKDIGO.push(
                '[AVISO KDIGO 2024 - CISTATINA C AUSENTE]: Avaliação realizada exclusivamente via CKD-EPI 2021 Creatinina (eGFRcr = ' + tfgCr + ' mL/min/1,73m² - ' + estadiamentoOficial.estadio + ').'
            );
            if (tfgCr >= 45 && tfgCr < 60) {
                alertasKDIGO.push(
                    '[RECOMENDAÇÃO KDIGO 2024 - ESTÁDIO G3a LIMÍTROFE]: Pacientes com eGFRcr entre 45–59 mL/min/1,73m² têm indicação formal de confirmação diagnóstica com Cistatina C sérica (eGFRcr-cys), especialmente na ausência de albuminúria ou em extremos de massa muscular (sarcopenia, desnutrição, hepatopatia, amputados).'
                );
            }
        }

        if (tfgOficial < 30) {
            alertasKDIGO.push(
                '[ALERTA CRÍTICO NEFROLÓGICO - ' + estadiamentoOficial.estadio + ']: TFG < 30 mL/min/1,73m². Revisar imediatamente fármacos nefrotóxicos (AINEs, contrastes iodados, aminoglicosídeos), ajustar antimicrobianos/anticoagulantes e encaminhar ao nefrologista.'
            );
        }

        return {
            diretriz: 'KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of CKD',
            tfgCreatinina: tfgCr,
            tfgCombinada: tfgComb,
            tfgOficialKDIGO2024: tfgOficial,
            cockcroftGaultMlMin: cgMlMin,
            estadiamentoKDIGO: {
                categoriaOficial: estadiamentoOficial.estadio,
                descricaoOficial: estadiamentoOficial.descricao,
                faixaOficial: estadiamentoOficial.faixa,
                porCreatinina: estadiamentoCr,
                porCombinada: estadiamentoComb,
                albuminuria: categoriaAlbuminuria,
                classificacaoCompletaCGA: categoriaAlbuminuria
                    ? (estadiamentoOficial.estadio + categoriaAlbuminuria.categoria)
                    : estadiamentoOficial.estadio
            },
            concordanciaDiagnostica: concordancia,
            conformidadeKDIGO2024: {
                cistatinaCUtilizada: tfgComb !== null,
                equacaoSelecionada: tfgComb !== null
                    ? 'CKD-EPI 2021 Creatinina-Cistatina C Combinada (eGFRcr-cys)'
                    : 'CKD-EPI 2021 Creatinina Isolada (eGFRcr)',
                alertas: alertasKDIGO
            }
        };
    }

    return {
        calcularCockcroftGault: calcularCockcroftGault,
        classificarEstagio: classificarEstagio,
        auditarPrescricao: auditarPrescricao,
        avaliarClearanceNefrologico: avaliarClearanceNefrologico
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NefrologiaClearanceService;
}
