/**
 * Módulo de Cardiologia: Insuficiência Cardíaca Crônica (SBC/ESC)
 */

var CardiologiaICCService = (function() {
    'use strict';

    function sanitizarFE(val) {
        if (val == null) return null;
        if (typeof val === 'number') return isNaN(val) ? null : val;
        if (typeof val === 'string') {
            var m = val.match(/(\d+(?:[.,]\d+)?)/);
            if (m) {
                var num = parseFloat(m[1].replace(',', '.'));
                return isNaN(num) ? null : num;
            }
        }
        if (typeof val === 'object') {
            if (val.fe !== undefined) return sanitizarFE(val.fe);
            if (val.feve !== undefined) return sanitizarFE(val.feve);
        }
        return null;
    }

    function classificarFracaoEjecao(feRaw) {
        var fe = sanitizarFE(feRaw);
        if (fe == null) return { erro: "Fração de ejeção inválida ou não informada." };
        if (fe <= 40) {
            return {
                fe: fe,
                classificacao: "ICFEr (Fração de Ejeção Reduzida)",
                sigla: "ICFEr",
                terapia_base: "Quarteto Fantástico MANDATÓRIO (benefício em mortalidade).",
                orientacao: "iSGLT2 + Beta-bloqueador + ARM + (ARNI ou iECA/BRA). Iniciar simultaneamente ou em rápida sequência."
            };
        } else if (fe > 40 && fe <= 49) {
            return {
                fe: fe,
                classificacao: "ICFEi (Fração de Ejeção Levemente Reduzida/Intermediária)",
                sigla: "ICFEi",
                terapia_base: "iSGLT2 recomendado. iECA/BRA, BB, ARM e ARNI podem ser considerados (evidência menor, foco no fenótipo ICFEr).",
                orientacao: "Tratar comorbidades. Considerar terapias da ICFEr individualizadas."
            };
        } else {
            return {
                fe: fe,
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

    function extrairParametrosTexto(texto) {
        if (!texto || typeof texto !== 'string') return {};
        var t = texto.toLowerCase();
        var p = {};

        var mFe = t.match(/(?:feve|fe|fracao)\s*[:=]?\s*(\d{1,2}(?:[.,]\d+)?)\s*%?/i) ||
                  t.match(/\b(\d{1,2})\s*%/i);
        if (mFe) p.fe = parseFloat(mFe[1].replace(',', '.'));

        var mNyha = t.match(/nyha\s*[:=]?\s*([1-4]|i{1,3}|iv)\b/i) || t.match(/classe\s*([1-4]|i{1,3}|iv)\b/i);
        if (mNyha) {
            var r = mNyha[1];
            p.nyha = (r === 'i' || r === '1') ? 1 : (r === 'ii' || r === '2') ? 2 : (r === 'iii' || r === '3') ? 3 : 4;
        }

        var mK = t.match(/\bk\+?\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i) || t.match(/potassio\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
        if (mK) p.k = parseFloat(mK[1].replace(',', '.'));

        var mClcr = t.match(/\b(?:clcr|tfg|clearance)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
        if (mClcr) p.clcr = parseFloat(mClcr[1].replace(',', '.'));

        var mPas = t.match(/\b(?:pas|pa)\s*[:=]?\s*(\d{2,3})/i);
        if (mPas) p.pas = parseInt(mPas[1], 10);

        var mFc = t.match(/\bfc\s*[:=]?\s*(\d{2,3})/i);
        if (mFc) p.fc = parseInt(mFc[1], 10);

        p.dpn = /dpn|dispneia paroxistica noturna/i.test(t);
        p.ortopneia = /ortopneia/i.test(t);
        p.tjp = /tjp|turgencia jugular/i.test(t);
        p.estertores = /estertor/i.test(t);
        p.b3 = /\bb3\b|terceira bulha/i.test(t);
        p.edema = /edema/i.test(t);
        p.cardiomegalia = /cardiomegalia/i.test(t);

        p.enalapril = /enalapril/i.test(t);
        p.ieca = /ieca|enalapril|captopril|ramipril/i.test(t);
        p.bra = /bra|losartana|valsartana|candesartana/i.test(t);
        p.semWashout = /sem washout|washout\s*<\s*36/i.test(t);
        p.washout36h = /washout 36|washout\s*>=?\s*36/i.test(t);
        p.angioedema = /angioedema/i.test(t);

        return p;
    }

    function avaliar(params) {
        params = params || {};
        if (typeof params === 'string') params = extrairParametrosTexto(params);
        else if (typeof params === 'number') params = { fe: params };

        var fe = sanitizarFE(params.fe !== undefined ? params.fe : params.feve);
        var rel = classificarFracaoEjecao(fe !== null ? fe : 50);
        rel.parametros = params;
        rel.quarteto_fantastico = obterQuartetoFantastico();
        rel.bloqueios = bloqueiosMedicais();

        // Alertas individualizados baseados em biomarcadores
        rel.alertas_clinicos = [];
        if (params.k !== undefined && params.k > 5.0) {
            rel.alertas_clinicos.push("🛑 Hipercalemia (K+ = " + params.k + " mEq/L): Contraindicação a início/titulação de Espironolactona (ARM) e cautela com ARNI/iECA/BRA.");
        }
        if (params.clcr !== undefined && params.clcr < 30) {
            rel.alertas_clinicos.push("⚠️ Disfunção Renal Grave (ClCr/TFG = " + params.clcr + " mL/min): Espironolactona não recomendada se TFG < 30. Ajustar doses de iECA/BRA.");
        }
        if (params.semWashout || (params.ieca && !params.washout36h && params.substituicaoArni)) {
            rel.alertas_clinicos.push("🛑 BLOQUEIO CRÍTICO DE ARNI: Necessário intervalo de washout mínimo de 36 horas após última dose de iECA antes de iniciar Sacubitril/Valsartana para prevenir ANGIOEDEMA GRAVE potencialmente fatal.");
        }
        if (params.angioedema) {
            rel.alertas_clinicos.push("🛑 HISTÓRICO DE ANGIOEDEMA: Contraindicação absoluta a iECA e ARNI.");
        }
        if (params.pas !== undefined && params.pas < 90) {
            rel.alertas_clinicos.push("⚠️ Hipotensão (PAS = " + params.pas + " mmHg): Evitar aumentos de dose de vasodilatadores e avaliar estabilidade hemodinâmica.");
        }
        if (params.fc !== undefined && params.fc < 55) {
            rel.alertas_clinicos.push("⚠️ Bradicardia (FC = " + params.fc + " bpm): Não titular dose de Beta-bloqueador no momento.");
        }

        // Critérios de Framingham
        var maiores = 0;
        if (params.dpn) maiores++;
        if (params.tjp) maiores++;
        if (params.estertores) maiores++;
        if (params.cardiomegalia) maiores++;
        if (params.b3) maiores++;

        var menores = 0;
        if (params.edema) menores++;
        if (params.ortopneia) menores++;

        rel.framingham = {
            criteriosMaiores: maiores,
            criteriosMenores: menores,
            diagnosticoClinico: (maiores >= 2 || (maiores >= 1 && menores >= 2)) ? "IC Clínica Altamente Provável (Critérios de Framingham preenchidos)" : "Critérios de Framingham incompletos ou dados insuficientes"
        };

        return rel;
    }

    function formatarTextoTelegram(rel) {
        if (!rel) return "⚠️ Relatório de ICC indisponível.";
        var txt = "🫀 *INSUFICIÊNCIA CARDÍACA CRÔNICA (SBC/ESC/AHA)*\n";
        txt += "════════════════════════════════════════════\n";
        if (rel.fe !== undefined) {
            txt += "📊 *FEVE:* " + rel.fe + "% — *" + rel.classificacao + "*\n";
        } else if (rel.classificacao) {
            txt += "📊 *Classificação:* " + rel.classificacao + "\n";
        }
        if (rel.terapia_base) txt += "💡 *Base Terapêutica:* " + rel.terapia_base + "\n";
        if (rel.orientacao) txt += "🧭 *Diretriz:* " + rel.orientacao + "\n\n";

        if (rel.framingham && rel.framingham.criteriosMaiores > 0) {
            txt += "📋 *Framingham:* " + rel.framingham.diagnosticoClinico + " (" + rel.framingham.criteriosMaiores + " maiores, " + rel.framingham.criteriosMenores + " menores)\n\n";
        }

        if (rel.alertas_clinicos && rel.alertas_clinicos.length > 0) {
            txt += "⚠️ *ALERTAS CLÍNICOS CRÍTICOS:*\n";
            for (var a = 0; a < rel.alertas_clinicos.length; a++) {
                txt += "• " + rel.alertas_clinicos[a] + "\n";
            }
            txt += "\n";
        }

        if (rel.quarteto_fantastico && rel.quarteto_fantastico.length > 0) {
            txt += "💊 *QUARTETO FANTÁSTICO (ICFER):*\n";
            for (var i = 0; i < rel.quarteto_fantastico.length; i++) {
                var cls = rel.quarteto_fantastico[i];
                txt += "🔹 *" + cls.classe + "*:\n";
                for (var j = 0; j < cls.drogas.length; j++) {
                    var d = cls.drogas[j];
                    txt += "  • " + d.nome + " (Alvo: " + d.dose_alvo + (d.dose_inicial ? " | Início: " + d.dose_inicial : "") + ")\n";
                }
            }
            txt += "\n";
        }

        if (rel.bloqueios && rel.bloqueios.drogas) {
            txt += "🛑 *BLOQUEIOS MÉDICOS OBRIGATÓRIOS:*\n";
            for (var k = 0; k < rel.bloqueios.drogas.length; k++) {
                var bl = rel.bloqueios.drogas[k];
                txt += "• *" + bl.classe + "*: " + bl.recomendacao + "\n";
            }
        }

        return txt;
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
        extrairParametrosTexto: extrairParametrosTexto,
        avaliar: avaliar,
        formatarTextoTelegram: formatarTextoTelegram,
        gerarRelatorioCompleto: gerarRelatorioCompleto
    };
})();

var CardiologiaIcCronicaService = CardiologiaICCService;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CardiologiaICCService;
    module.exports.CardiologiaICCService = CardiologiaICCService;
    module.exports.CardiologiaIcCronicaService = CardiologiaIcCronicaService;
}
