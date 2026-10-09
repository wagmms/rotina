/**
 * ==============================================================================
 * ULTRA ROTINA - MÓDULO DE ENDOCRINOLOGIA GINECOLÓGICA E REPRODUÇÃO
 * ==============================================================================
 * Manejo de Hiperprolactinemia e Prolactinomas
 * Diretrizes Endocrine Society / FEBRASGO
 * 
 * Escopo:
 * - Algoritmo escalonado de investigação etiológica
 * - Diferenciação de micro vs macroadenoma e rastreio campimétrico
 * - Terapia com agonistas dopaminérgicos (Cabergolina)
 * - Manejo na gestação e ecocardiograma para valvulopatia
 * ==============================================================================
 */

var EndocrinologiaHiperprolactinemiaService = (function () {
  'use strict';

  function avaliarHiperprolactinemia(parametros) {
    var prolactina = parseFloat(parametros.prolactina) || 0;
    var macroprolactinaPesquisada = parametros.macroprolactinaPesquisada === true || parametros.macroprolactinaPesquisada === 'true';
    var macroprolactinaPositiva = parametros.macroprolactinaPositiva === true || parametros.macroprolactinaPositiva === 'true';
    var assintomatica = parametros.assintomatica === true || parametros.assintomatica === 'true';
    var tshAlterado = parametros.tshAlterado === true || parametros.tshAlterado === 'true';
    var usoDrogasIndutoras = parametros.usoDrogasIndutoras === true || parametros.usoDrogasIndutoras === 'true';
    var gestante = parametros.gestante === true || parametros.gestante === 'true';
    var adenomaTamanho = parseFloat(parametros.adenomaTamanho) || 0; // mm
    var alteracaoVisual = parametros.alteracaoVisual === true || parametros.alteracaoVisual === 'true';
    var doseCabergolinaSemana = parseFloat(parametros.doseCabergolinaSemana) || 0;

    var laudo = [];
    var alertas = [];
    var conduta = [];
    var indicacaoTratamento = false;

    // 1. Diagnóstico e Investigação
    if (prolactina > 25) { // Valor de corte genérico ~25 ng/mL para mulheres
        laudo.push("Hiperprolactinemia detectada (PRL > 25 ng/mL).");

        if (gestante) {
            alertas.push("Aumento fisiológico da prolactina é esperado na gestação.");
            conduta.push("Suspender investigação ou tratamento em casos de hiperprolactinemia idiopática ou microadenoma durante a gestação (Endocrine Society).");
            if (adenomaTamanho >= 10) {
                conduta.push("Atenção: Para MACROADENOMAS, considerar manter agonista dopaminérgico ou realizar vigilância visual clínica rigorosa durante a gestação.");
            }
        } else {
            // Rastreio de causas secundárias
            if (tshAlterado) {
                alertas.push("Hipotireoidismo Primário detectado/suspeito (TSH alterado).");
                conduta.push("Tratar o hipotireoidismo primeiro com Levotiroxina e reavaliar a prolactina antes de investigar adenoma.");
            } else if (usoDrogasIndutoras) {
                alertas.push("Uso de drogas indutoras relatado (Antipsicóticos, Metoclopramida, Tricíclicos, ACO).");
                conduta.push("Avaliar possibilidade de suspensão ou troca da medicação indutora com o médico prescritor, aguardar 3 dias e repetir prolactina.");
            } else {
                // Investigação de Macroprolactina
                if (assintomatica && !macroprolactinaPesquisada) {
                    conduta.push("Paciente ASSINTOMÁTICA. Obrigatório solicitar pesquisa de MACROPROLACTINA (fenômeno de precipitação com PEG) para excluir falso-positivo.");
                } else if (assintomatica && macroprolactinaPositiva) {
                    laudo.push("Macroprolactinemia confirmada.");
                    alertas.push("Condição benigna. Não necessita de investigação radiológica ou tratamento.");
                } else {
                    conduta.push("Causas secundárias excluídas e/ou paciente sintomática (galactorreia, amenorreia, infertilidade). Indicado RNM de sela túrcica.");
                    indicacaoTratamento = true;
                }
            }
        }
    } else {
        laudo.push("Prolactina dentro dos limites fisiológicos normais (< 25 ng/mL).");
    }

    // 2. Manejo de Prolactinomas
    if (indicacaoTratamento && adenomaTamanho > 0) {
        if (adenomaTamanho < 10) {
            laudo.push("Diagnóstico radiológico: MICROADENOMA (< 10 mm).");
            conduta.push("Terapia medicamentosa indicada se houver desejo de gestação, hipogonadismo, perda óssea ou sintomas incômodos (galactorreia severa).");
        } else {
            laudo.push("Diagnóstico radiológico: MACROADENOMA (>= 10 mm).");
            alertas.push("Risco de compressão do quiasma óptico.");
            conduta.push("Tratamento medicamentoso MANDATÓRIO para redução da massa e controle hormonal.");
            conduta.push("Obrigatório solicitar Avaliação de Campo Visual (Campimetria).");
            
            if (alteracaoVisual) {
                alertas.push("Atenção Crítica: Comprometimento visual detectado.");
                conduta.push("Urgência no início do agonista dopaminérgico. Avaliação neurocirúrgica se não houver melhora visual rápida com tratamento clínico.");
            }
        }
    }

    // 3. Posologia e Segurança
    if (indicacaoTratamento && !gestante) {
        conduta.push("1ª Linha (Endocrine Society/FEBRASGO): Cabergolina 0.5 mg/semana, dividida em 1 a 2 tomadas (ex: 1/2 comprimido 2x/sem). Preferencial pela maior eficácia e tolerabilidade que a bromocriptina.");
        conduta.push("2ª Linha: Bromocriptina 1.25 a 2.5 mg/dia, iniciar dose baixa à noite com alimentos.");
    }

    if (doseCabergolinaSemana >= 2.0) {
        alertas.push("Uso de altas doses de Cabergolina (>= 2 mg/semana).");
        conduta.push("Obrigatório realizar Ecocardiograma basal e anual para rastreio de valvulopatia cardíaca induzida por agonistas dopaminérgicos.");
    }

    return {
        resultado: {
            laudo: laudo,
            alertas: alertas,
            conduta: conduta,
            regrasBase: "Diretrizes Endocrine Society para Hiperprolactinemia e FEBRASGO 2024"
        }
    };
  }

  function processarComandoTelegram(texto) {
    var regexProlactina = /prl\s*[:=]?\s*(\d+[\.,]?\d*)/i;
    var regexTamanho = /tamanho\s*[:=]?\s*(\d+[\.,]?\d*)/i;
    var regexDose = /dose\s*[:=]?\s*(\d+[\.,]?\d*)/i;

    var matchPrl = texto.match(regexProlactina);
    var matchTamanho = texto.match(regexTamanho);
    var matchDose = texto.match(regexDose);

    var prolactina = matchPrl ? parseFloat(matchPrl[1].replace(',', '.')) : 0;
    var adenomaTamanho = matchTamanho ? parseFloat(matchTamanho[1].replace(',', '.')) : 0;
    var doseCabergolinaSemana = matchDose ? parseFloat(matchDose[1].replace(',', '.')) : 0;

    var tshAlterado = /tsh (alterado|alto)/i.test(texto);
    var usoDrogasIndutoras = /droga|antipsicotico|metoclopramida/i.test(texto);
    var assintomatica = /assintomatica/i.test(texto);
    var macroprolactinaPesquisada = /macro(prolactina)? pesquisada/i.test(texto);
    var macroprolactinaPositiva = /macro(prolactina)? positiva/i.test(texto);
    var gestante = /gestan/i.test(texto);
    var alteracaoVisual = /visual|campimetria/i.test(texto);

    var parametros = {
        prolactina: prolactina,
        adenomaTamanho: adenomaTamanho,
        tshAlterado: tshAlterado,
        usoDrogasIndutoras: usoDrogasIndutoras,
        assintomatica: assintomatica,
        macroprolactinaPesquisada: macroprolactinaPesquisada,
        macroprolactinaPositiva: macroprolactinaPositiva,
        gestante: gestante,
        alteracaoVisual: alteracaoVisual,
        doseCabergolinaSemana: doseCabergolinaSemana
    };

    var resultado = avaliarHiperprolactinemia(parametros).resultado;

    var resposta = "🧠 *Módulo de Hiperprolactinemia e Prolactinomas (Endocrine Society/FEBRASGO)*\n\n";
    resposta += "📋 *Avaliação Clínica:*\n";
    for (var i = 0; i < resultado.laudo.length; i++) {
        resposta += "• " + resultado.laudo[i] + "\n";
    }

    if (resultado.alertas.length > 0) {
        resposta += "\n⚠️ *Alertas Críticos:*\n";
        for (var j = 0; j < resultado.alertas.length; j++) {
            resposta += "• " + resultado.alertas[j] + "\n";
        }
    }

    resposta += "\n💡 *Conduta Proposta:*\n";
    for (var k = 0; k < resultado.conduta.length; k++) {
        resposta += "• " + resultado.conduta[k] + "\n";
    }

    return resposta;
  }

  return {
    avaliarHiperprolactinemia: avaliarHiperprolactinemia,
    processarComandoTelegram: processarComandoTelegram
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EndocrinologiaHiperprolactinemiaService;
}
