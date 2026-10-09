/**
 * Módulo de Mecânica Pulmonar e Ventilação Protetora na SDRA (ARDSNet)
 * Motor determinístico para cálculos de ventilação mecânica beira-leito.
 */

var MecanicaPulmonarSdraService = (function() {
    'use strict';

    // --- PESO PREDITO (PBW) E VOLUME CORRENTE ---
    function calcularPesoPredito(alturaCm, sexo) {
        var alturaInches = alturaCm / 2.54;
        var pbw = 0;
        if (sexo.toLowerCase() === 'f') {
            pbw = 45.5 + 2.3 * (alturaInches - 60);
        } else {
            pbw = 50.0 + 2.3 * (alturaInches - 60);
        }
        return Math.max(0, Math.round(pbw * 10) / 10); // não permitir valor negativo
    }

    function calcularVolumeCorrente(pbw) {
        return {
            vt4: Math.round(pbw * 4),
            vt6: Math.round(pbw * 6),
            vt8: Math.round(pbw * 8)
        };
    }

    // --- MECÂNICA PULMONAR ---
    function avaliarMecanicaPulmonar(pplat, peep) {
        var deltaP = pplat - peep;
        var alertas = [];

        if (pplat > 30) {
            alertas.push("ALERTA CRÍTICO: Pressão de Platô > 30 cmH2O. Risco de barotrauma. Reduzir Volume Corrente.");
        }
        if (deltaP > 15) {
            alertas.push("ALERTA CRÍTICO: Driving Pressure (ΔP) > 15 cmH2O. Alta mortalidade. Ajustar Vt ou PEEP.");
        }

        return {
            drivingPressure: deltaP,
            pplatSegura: pplat <= 30,
            deltaPSegura: deltaP <= 15,
            alertas: alertas
        };
    }

    // --- CRITÉRIOS DE BERLIM (SDRA) E PRONAÇÃO ---
    function avaliarSdra(pao2, fio2, peep) {
        // fio2 em % (ex: 40 para 0.4 ou 40%)
        var fio2Decimal = fio2 > 1 ? fio2 / 100 : fio2;
        var relacaoPF = Math.round(pao2 / fio2Decimal);
        var classificacao = "Não preenche critérios graves de SDRA";
        var condutas = [];

        if (peep >= 5) {
            if (relacaoPF <= 100) {
                classificacao = "SDRA Grave (Critérios de Berlim)";
            } else if (relacaoPF <= 200) {
                classificacao = "SDRA Moderada (Critérios de Berlim)";
            } else if (relacaoPF <= 300) {
                classificacao = "SDRA Leve (Critérios de Berlim)";
            }
        } else {
            condutas.push("Reavaliar PEEP (mínimo 5 cmH2O para critérios de SDRA).");
        }

        if (relacaoPF < 150 && peep >= 10) { 
            condutas.push("CONDUTA BEIRA-LEITO (PS / ENFERMARIA): Manter ventilação protetora (Vt 4-6 mL/kg PBW, Pplat <= 30, ΔP <= 15) e solicitar IMEDIATAMENTE VAGA ZERO / TRANSFERÊNCIA URGENTE PARA CTI/UTI.");
            condutas.push("⚠️ CONDUTA EXCLUSIVA DE UTI TERCIÁRIA: Posição Prona precoce (16h/dia) e Bloqueio Neuromuscular Contínuo (ex: Cisatracúrio) exigem ambiente de CTI com equipe treinada e monitorização intensiva contínua. Contraindicado em enfermaria clínica geral.");
        } else if (relacaoPF < 150 && peep < 10 && peep >= 5) {
            condutas.push("CONSIDERAR: Titular PEEP para >= 10 cmH2O, manter ventilação protetora e acionar leito de CTI se mantiver P/F < 150.");
        }

        return {
            pao2Fio2: relacaoPF,
            classificacao: classificacao,
            condutas: condutas
        };
    }

    function processarMecanica(params) {
        var pbw = calcularPesoPredito(params.alturaCm, params.sexo);
        var vt = calcularVolumeCorrente(pbw);
        var mecanica = avaliarMecanicaPulmonar(params.pplat, params.peep);
        var sdra = avaliarSdra(params.pao2, params.fio2, params.peep);

        return {
            pesoPreditoKg: pbw,
            volumeCorrenteAlvo: {
                vtProtetor4ml: vt.vt4,
                vtProtetor6ml: vt.vt6,
                vtPermissivo8ml: vt.vt8
            },
            mecanicaPulmonar: mecanica,
            gasometria: sdra
        };
    }

    // Exposição da API
    return {
        calcularPesoPredito: calcularPesoPredito,
        calcularVolumeCorrente: calcularVolumeCorrente,
        avaliarMecanicaPulmonar: avaliarMecanicaPulmonar,
        avaliarSdra: avaliarSdra,
        processarMecanica: processarMecanica
    };
})();

// Exportação para uso no Node.js/Testes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MecanicaPulmonarSdraService;
}
