/**
 * @file 02_pneumologia_dpoc_vni.js
 * @description Módulo de Pneumologia e Terapia Intensiva: Manejo da Crise Hipercápnica na DPOC
 * e Ventilação Não Invasiva (VNI - BiPAP/CPAP) baseado nas diretrizes GOLD 2026 e SBPT.
 */

var PneumologiaDpocVniService = (function() {
    'use strict';

    function avaliarVni(p) {
        var res = {
            indicacao: false,
            contraindicacao_absoluta: false,
            contraindicacoes: [],
            criterios_indicacao: [],
            falha_iminente: false,
            parametros_iniciais: null,
            alertas: [],
            monitoramento: []
        };

        var pH = parseFloat(p.ph);
        var pco2 = parseFloat(p.pco2);
        var po2 = parseFloat(p.po2);
        var fr = parseInt(p.fr, 10);
        var glasgow = parseInt(p.glasgow, 10) || 15;

        if (p.parada_cardiorespiratoria || p.pcr) {
            res.contraindicacao_absoluta = true;
            res.contraindicacoes.push("Parada cardiorrespiratória (indicação imediata de IOT).");
        }
        if (p.instabilidade_hemodinamica || p.choque) {
            res.contraindicacao_absoluta = true;
            res.contraindicacoes.push("Instabilidade hemodinâmica severa (choque refratário, isquemia, arritmia letal).");
        }
        if (p.incapacidade_proteger_via_aerea || glasgow < 8) {
            res.contraindicacao_absoluta = true;
            res.contraindicacoes.push("Incapacidade de proteger a via aérea / Glasgow < 8 (" + glasgow + ").");
        }
        if (p.secrecao_abundante) {
            res.contraindicacoes.push("Secreção respiratória muito abundante e incontrolável (risco de asfixia/asipração).");
            res.contraindicacao_absoluta = true;
        }
        if (p.trauma_face_cirurgia_recente || p.trauma_face) {
            res.contraindicacoes.push("Traumatismo/queimadura facial ou cirurgia gastrointestinal alta recente (impossibilidade de acoplagem ou risco de deiscência).");
            res.contraindicacao_absoluta = true;
        }
        if (p.obstrucao_fixa_via_aerea) {
            res.contraindicacoes.push("Obstrução fixa de via aérea superior.");
            res.contraindicacao_absoluta = true;
        }
        if (p.vometos_incoerciveis || p.hda) {
            res.contraindicacoes.push("Vômitos incoercíveis ou HDA ativa (altíssimo risco de broncoaspiração grave).");
            res.contraindicacao_absoluta = true;
        }
        if (p.nao_colaboracao || p.agitacao_extrema) {
            res.contraindicacoes.push("Agitação psicomotora extrema ou não colaboração (Relativa - pode tentar VNI leve com contenção verbal ou sedação parcimoniosa, mas preparar IOT).");
            if (res.contraindicacoes.length === 1) res.contraindicacao_absoluta = false; 
        }

        var temAcidoseRespiratoria = (!isNaN(pH) && pH <= 7.35) && (!isNaN(pco2) && pco2 >= 45);
        var temDispneiaGrave = (!isNaN(fr) && fr > 24) || p.uso_musculatura_acessoria || p.respiracao_paradoxal;
        var temHipoxemia = (!isNaN(po2) && po2 < 60);

        if (temAcidoseRespiratoria) {
            res.indicacao = true;
            res.criterios_indicacao.push("Acidose respiratória (pH " + pH + ", pCO2 " + pco2 + " mmHg).");
        }
        if (temDispneiaGrave) {
            res.indicacao = true;
            var txt = "Dispneia grave";
            if (!isNaN(fr)) txt += " (FR " + fr + " irpm)";
            if (p.uso_musculatura_acessoria) txt += " com uso de musculatura acessória/paradoxal";
            res.criterios_indicacao.push(txt + ".");
        }
        if (temHipoxemia && !temAcidoseRespiratoria) {
            res.criterios_indicacao.push("Hipoxemia persistente sem hipercapnia severa (VNI tem evidência menor que na hipercapnia, mas é útil).");
            res.indicacao = true;
        }

        if (!isNaN(pH) && pH < 7.20) {
            res.alertas.push("🔴 ALERTAS CRÍTICOS: Acidemia severa (pH < 7.20) com altíssimo risco de falha da VNI. Testar VNI em ambiente de UTI e estar com material de Intubação Orotraqueal (IOT) montado na beira-leito.");
        }

        if (res.contraindicacao_absoluta) {
            res.indicacao = false;
            res.alertas.push("🛑 CONTRAINDICAÇÃO FORMAL PARA VNI. Indicação de INTUBAÇÃO OROTRAQUEAL (IOT) IMEDIATA e Ventilação Mecânica Invasiva.");
            return res;
        }

        if (!res.indicacao) {
            res.alertas.push("ℹ️ Sem critérios formais (gasométricos ou clínicos) de indicação de VNI no momento. Otimizar broncodilatadores, corticoide sistêmico e oxigenoterapia titulada para SpO2 88-92%.");
            return res;
        }

        res.parametros_iniciais = {
            modo: "BiPAP (Pressão de Suporte de 2 níveis)",
            interface: "Máscara oronasal (facial) com boa vedação e fixação confortável (evitar lesão de pele).",
            epap: "4 a 5 cmH2O (para contrabalançar o auto-PEEP, manter via aérea aberta e melhorar oxigenação).",
            ipap: "10 a 12 cmH2O (o diferencial IPAP - EPAP = Pressão de Suporte. Ajustar para garantir volume corrente de 6 a 8 mL/kg e alívio do trabalho respiratório).",
            fio2: "Titular para SpO2 alvo fisiológica do DPOC: 88% a 92%.",
            ajustes: [
                "Se hipercapnia persistente (pCO2 alta, pH < 7.35): Aumentar IPAP de 2 em 2 cmH2O.",
                "Se hipoxemia persistente (SpO2 < 88% com FiO2 alta): Aumentar EPAP de 2 em 2 cmH2O (e subir IPAP junto para manter o gradiente de Pressão de Suporte).",
                "Se assincronia ou desconforto: Ajustar ramp (rampa de subida), trigger (sensibilidade) e verificar vazamentos na máscara."
            ]
        };

        res.monitoramento = [
            "Monitorização contínua de oximetria e FC beira-leito.",
            "Reavaliação gasométrica estrita em 1 a 2 horas de VNI.",
            "CRITÉRIOS DE FALHA (Gatilhos de IOT):",
            " - Piora da acidose (pH diminui ou pCO2 aumenta) após 1-2h de VNI.",
            " - Piora do nível de consciência, agitação refratária ou letargia emergente.",
            " - Instabilidade hemodinâmica emergente ou arritmias ventriculares.",
            " - Piora da taquipneia (exaustão muscular eminente)."
        ];

        return res;
    }

    function formatarTextoTelegram(res) {
        var t = "🫁 *AVALIAÇÃO DE VNI - DPOC EXACERBADO*\n\n";

        if (res.contraindicacao_absoluta) {
            t += "🛑 *CONTRAINDICAÇÃO FORMAL DETECTADA*\n";
            res.contraindicacoes.forEach(function(c) {
                t += " - " + c + "\n";
            });
            t += "\n🚨 *CONDUTA*: IOT Imediata (Intubação Orotraqueal). Não atrasar acesso à via aérea definitiva!\n";
        } else if (res.indicacao) {
            t += "✅ *INDICAÇÃO CONFIRMADA DE VNI*\n";
            res.criterios_indicacao.forEach(function(c) {
                t += " - " + c + "\n";
            });
            if (res.contraindicacoes.length > 0) {
                t += "\n⚠️ *CUIDADOS/CONTRAINDICAÇÕES RELATIVAS*\n";
                res.contraindicacoes.forEach(function(c) {
                    t += " - " + c + "\n";
                });
            }
            
            t += "\n⚙️ *PARÂMETROS INICIAIS SUGERIDOS*\n";
            t += "🔹 Modo: " + res.parametros_iniciais.modo + "\n";
            t += "🔹 Interface: " + res.parametros_iniciais.interface + "\n";
            t += "🔹 EPAP: " + res.parametros_iniciais.epap + "\n";
            t += "🔹 IPAP: " + res.parametros_iniciais.ipap + "\n";
            t += "🔹 FiO2: " + res.parametros_iniciais.fio2 + "\n";
            
            t += "\n🛠 *AJUSTES FINOS*\n";
            res.parametros_iniciais.ajustes.forEach(function(a) {
                t += " - " + a + "\n";
            });
        } else {
            t += "ℹ️ *SEM INDICAÇÃO FORMAL DE VNI NO MOMENTO*\n";
            t += " - Não foram preenchidos critérios gasométricos de acidose respiratória ou sinais de exaustão clínica grave para VNI.\n";
            t += " - Conduta: Otimizar broncodilatadores, corticoide, CNAF/cateter de O2 e reavaliar.\n";
        }

        if (res.alertas.length > 0) {
            t += "\n⚠️ *ALERTAS CLÍNICOS*\n";
            res.alertas.forEach(function(a) {
                t += " - " + a + "\n";
            });
        }

        if (res.indicacao && res.monitoramento.length > 0) {
            t += "\n⏱ *MONITORAMENTO E GATILHOS PARA IOT*\n";
            res.monitoramento.forEach(function(m) {
                t += m.indexOf("-") === 1 ? m + "\n" : "🔹 " + m + "\n";
            });
        }

        return t;
    }

    return {
        avaliarVni: avaliarVni,
        formatarTextoTelegram: formatarTextoTelegram
    };

})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PneumologiaDpocVniService;
}
