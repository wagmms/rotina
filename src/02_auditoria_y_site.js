/**
 * Módulo de Auditoria Farmacêutica Hospitalar: Compatibilidade Físico-Química em Y-Site (Linha Venosa)
 * Motor determinístico para predição de precipitados e inativação de fármacos comuns.
 */

var AuditoriaYSiteService = (function() {
    'use strict';

    // Matriz de incompatibilidades graves
    var matrizIncompatibilidades = [
        {
            grupoA: ['ceftriaxona'],
            grupoB: ['ringer lactato', 'gluconato de calcio', 'cloreto de calcio', 'calcio'],
            motivo: 'Formação de cristais insolúveis mortais (precipitados de cálcio-ceftriaxona nos pulmões e rins).',
            tipo: 'PRECIPITAÇÃO GRAVE',
            bloqueio: true
        },
        {
            grupoA: ['fenitoina'],
            grupoB: ['soro glicosado', 'sg 5%', 'sg 10%'],
            motivo: 'Precipitação imediata. A Fenitoína exige diluição EXCLUSIVA em Soro Fisiológico 0,9%.',
            tipo: 'PRECIPITAÇÃO GRAVE',
            bloqueio: true
        },
        {
            grupoA: ['bicarbonato de sodio'],
            grupoB: ['noradrenalina', 'adrenalina', 'dobutamina', 'dopamina'],
            motivo: 'Inativação imediata das catecolaminas devido ao pH fortemente alcalino do bicarbonato.',
            tipo: 'INATIVAÇÃO QUÍMICA',
            bloqueio: true
        },
        {
            grupoA: ['furosemida'],
            grupoB: ['midazolam'],
            motivo: 'Incompatibilidade ácido-base resultando em precipitação e turvação visual imediata em Y-site.',
            tipo: 'PRECIPITAÇÃO',
            bloqueio: true
        },
        {
            grupoA: ['diazepam'],
            grupoB: ['soro fisiologico', 'soro glicosado', 'ringer lactato'],
            motivo: 'Alta probabilidade de precipitação. O diazepam tem baixa solubilidade aquosa e não deve ser diluído nestas soluções.',
            tipo: 'PRECIPITAÇÃO',
            bloqueio: false
        },
        {
            grupoA: ['ampicilina'],
            grupoB: ['soro glicosado', 'sg 5%'],
            motivo: 'Degradação acelerada e perda de estabilidade em meio glicosado. Exige diluição em SF 0,9%.',
            tipo: 'PERDA DE ESTABILIDADE',
            bloqueio: true
        }
    ];

    function normalizarNome(nome) {
        if (!nome) return '';
        return nome.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
            .replace(/[^a-z0-9\s%]/g, " ")
            .trim();
    }

    function checarMatch(fNormalizado, grupo) {
        return grupo.some(function(item) {
            return fNormalizado.indexOf(item) !== -1;
        });
    }

    // Retorna { compativel: bool, bloqueio: bool, alertas: [] }
    function verificarCompatibilidadeLista(listaFarmacos) {
        if (!listaFarmacos || !Array.isArray(listaFarmacos) || listaFarmacos.length < 2) {
            return { compativel: true, bloqueio: false, alertas: [] };
        }

        var alertas = [];
        var bloqueioTotal = false;

        var nomesNormalizados = listaFarmacos.map(function(f) { return normalizarNome(f); });

        for (var i = 0; i < nomesNormalizados.length; i++) {
            for (var j = i + 1; j < nomesNormalizados.length; j++) {
                var f1_orig = listaFarmacos[i];
                var f2_orig = listaFarmacos[j];
                var f1 = nomesNormalizados[i];
                var f2 = nomesNormalizados[j];

                matrizIncompatibilidades.forEach(function(regra) {
                    var matchF1_A = checarMatch(f1, regra.grupoA);
                    var matchF1_B = checarMatch(f1, regra.grupoB);
                    var matchF2_A = checarMatch(f2, regra.grupoA);
                    var matchF2_B = checarMatch(f2, regra.grupoB);

                    var colide = (matchF1_A && matchF2_B) || (matchF1_B && matchF2_A);

                    if (colide) {
                        var msg = regra.tipo + " - " + f1_orig + " + " + f2_orig + ": " + regra.motivo;
                        
                        var jaExiste = alertas.some(function(a) { 
                            return (a.farmaco1 === f1_orig && a.farmaco2 === f2_orig) ||
                                   (a.farmaco1 === f2_orig && a.farmaco2 === f1_orig);
                        });
                        
                        if (!jaExiste) {
                            alertas.push({
                                farmaco1: f1_orig,
                                farmaco2: f2_orig,
                                tipo: regra.tipo,
                                mensagem: msg,
                                bloqueio: regra.bloqueio
                            });
                            if (regra.bloqueio) {
                                bloqueioTotal = true;
                            }
                        }
                    }
                });
            }
        }

        return {
            compativel: alertas.length === 0,
            bloqueio: bloqueioTotal,
            alertas: alertas
        };
    }

    return {
        verificarCompatibilidadeLista: verificarCompatibilidadeLista
    };
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = AuditoriaYSiteService;
}
