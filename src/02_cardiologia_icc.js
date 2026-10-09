/**
 * Módulo de Cardiologia: Insuficiência Cardíaca Crônica (SBC/ESC)
 */

var CardiologiaICCService = (function() {
    'use strict';

    function classificarFracaoEjecao(fe) {
        if (fe == null || isNaN(fe)) return { erro: "Fração de ejeção inválida." };
        if (fe <= 40) {
            return {
                classificacao: "ICFEr (Fração de Ejeção Reduzida)",
                sigla: "ICFEr",
                terapia_base: "Quarteto Fantástico MANDATÓRIO (benefício em mortalidade).",
                orientacao: "iSGLT2 + Beta-bloqueador + ARM + (ARNI ou iECA/BRA). Iniciar simultaneamente ou em rápida sequência."
            };
        } else if (fe > 40 && fe <= 49) {
            return {
                classificacao: "ICFEi (Fração de Ejeção Levemente Reduzida/Intermediária)",
                sigla: "ICFEi",
                terapia_base: "iSGLT2 recomendado. iECA/BRA, BB, ARM e ARNI podem ser considerados (evidência menor, foco no fenótipo ICFEr).",
                orientacao: "Tratar comorbidades. Considerar terapias da ICFEr individualizadas."
            };
        } else {
            return {
                classificacao: "ICFEp (Fração de Ejeção Preservada)",
                sigla: "ICFEp",
                terapia_base: "iSGLT2 (Dapagliflozina/Empagliflozina) é a única classe com benefício robusto de sobrevida livre de eventos. Diuréticos para congestão.",
                orientacao: "Controle estrito de PA (BRA/iECA), FA, isquemia, obesidade. Espironolactona/ARNI podem ser considerados para redução de hospitalizações."
            };
        }
    }

    function obterQuartetoFantastico() {
        return [
            {
                classe: "iSGLT2",
                drogas: [
                    { nome: "Dapagliflozina", dose_alvo: "10 mg 1x/dia" },
                    { nome: "Empagliflozina", dose_alvo: "10 mg 1x/dia" }
                ],
                cuidados: "Risco de infecção fúngica genital. Não usar se TFG < 20-25 ml/min (depende do fabricante/guideline, mas benefício na IC se TFG > 20). Não causa hipoglicemia isolada."
            },
            {
                classe: "Beta-bloqueadores (BB)",
                drogas: [
                    { nome: "Carvedilol", dose_inicial: "3,125 mg 2x/dia", dose_alvo: "25-50 mg 2x/dia" },
                    { nome: "Bisoprolol", dose_inicial: "1,25 mg 1x/dia", dose_alvo: "10 mg 1x/dia" },
                    { nome: "Metoprolol Succinato", dose_inicial: "12,5-25 mg 1x/dia", dose_alvo: "200 mg 1x/dia" },
                    { nome: "Nebivolol", dose_inicial: "1,25 mg 1x/dia", dose_alvo: "10 mg 1x/dia" }
                ],
                cuidados: "Não iniciar se congestão aguda. Dobrar a dose a cada 2 semanas até o alvo ou limite de tolerância (bradicardia/hipotensão)."
            },
            {
                classe: "Antagonistas do Receptor Mineralocorticoide (ARM)",
                drogas: [
                    { nome: "Espironolactona", dose_inicial: "12,5-25 mg 1x/dia", dose_alvo: "25-50 mg 1x/dia" }
                ],
                cuidados: "Cuidado se K+ > 5.0 ou Creatinina > 2.5 (TFG < 30). Monitorar função renal e K+ em 1 e 4 semanas."
            },
            {
                classe: "Inibidores da Neprilisina e do Receptor de Angiotensina (ARNI) / iECA / BRA",
                drogas: [
                    { nome: "Sacubitril/Valsartana", dose_inicial: "24/26 ou 49/51 mg 2x/dia", dose_alvo: "97/103 mg 2x/dia" },
                    { nome: "Enalapril (iECA)", dose_inicial: "2,5 mg 2x/dia", dose_alvo: "10-20 mg 2x/dia" },
                    { nome: "Losartana (BRA)", dose_inicial: "25-50 mg 1x/dia", dose_alvo: "100-150 mg/dia" }
                ],
                cuidados: "Washout obrigatório de 36 horas ao trocar de iECA para ARNI (risco de angioedema severo). Monitorar PA, TFG e K+."
            }
        ];
    }

    function bloqueiosMedicais() {
        return {
            alerta: "MEDICAÇÕES POTENCIALMENTE DELETÉRIAS NA INSUFICIÊNCIA CARDÍACA",
            drogas: [
                {
                    classe: "AINEs (Anti-inflamatórios Não Esteroidais)",
                    risco: "Retenção hidrossalina, piora da função renal, descompensação franca da IC, atenuação do efeito de diuréticos e iECA/BRA.",
                    recomendacao: "CONTRAINDICADOS. Alternativas: Paracetamol, Dipirona, ou curto curso de corticoides/opioides se estritamente necessário."
                },
                {
                    classe: "Bloqueadores de Canal de Cálcio Não Diidropiridínicos",
                    exemplos: "Verapamil, Diltiazem",
                    risco: "Efeito inotrópico negativo significativo. Pioram desfechos na ICFEr.",
                    recomendacao: "CONTRAINDICADOS NA ICFEr. (Amlodipino/Felodipino são neutros e podem ser usados para hipertensão refratária ou angina)."
                },
                {
                    classe: "Glitazonas",
                    exemplos: "Pioglitazona, Rosiglitazona",
                    risco: "Retenção hídrica importante, aumentando risco de internação por IC.",
                    recomendacao: "CONTRAINDICADAS."
                },
                {
                    classe: "Antiarrítmicos da Classe I e III",
                    exemplos: "Flecainida, Propafenona, Dronedarona (para ICFEr)",
                    risco: "Efeito pró-arrítmico e inotrópico negativo na disfunção ventricular.",
                    recomendacao: "Amiodarona é o antiarrítmico de escolha seguro na ICFEr (não prolonga mortalidade, neutro)."
                }
            ]
        };
    }

    function gerarRelatorioCompleto(fe) {
        var relatorio = classificarFracaoEjecao(fe);
        relatorio.quarteto_fantastico = obterQuartetoFantastico();
        relatorio.bloqueios = bloqueiosMedicais();
        return relatorio;
    }

    return {
        classificarFracaoEjecao: classificarFracaoEjecao,
        obterQuartetoFantastico: obterQuartetoFantastico,
        bloqueiosMedicais: bloqueiosMedicais,
        gerarRelatorioCompleto: gerarRelatorioCompleto
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CardiologiaICCService;
}
