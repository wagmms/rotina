/**
 * @file 02_obstetricia_rcf_doppler.js
 * @description Módulo de Obstetrícia & Medicina Materno-Fetal: Restrição de Crescimento Fetal
 * (RCF / CIUR) e interpretação determinística do Doppler obstétrico.
 *
 * Fontes (rastreabilidade clínica):
 *  - Gordijn SJ et al. Consensus definition of fetal growth restriction: a Delphi procedure.
 *    Ultrasound Obstet Gynecol 2016;48:333-339 (definição de RCF precoce < 32 sem vs tardia >= 32 sem).
 *  - Lees CC et al. ISUOG Practice Guidelines: diagnosis and management of small-for-gestational-age
 *    fetus and fetal growth restriction. Ultrasound Obstet Gynecol 2020;56:298-312.
 *  - Figueras F, Gratacós E. Update on the diagnosis and classification of fetal growth restriction and
 *    proposal of a stage-based management protocol. Fetal Diagn Ther 2014;36:86-98 (Estágios I-IV de Barcelona).
 *  - Lees CC et al. (TRUFFLE). Lancet 2015;385:2162-2172 (limiares de VCP da cCTG e onda A do ducto venoso).
 *  - Pels A et al. (Dutch STRIDER). Lancet Child Adolesc Health 2020;4:22-32 (sildenafila: dano neonatal).
 *  - FEBRASGO — Protocolo de Restrição de Crescimento Fetal (Comissão Nacional Especializada em Medicina Fetal).
 *
 * Escopo: gestação única, sem anomalias estruturais. Percentis devem vir da curva de referência adotada
 * pelo serviço (laudo do ultrassom). O módulo NÃO estima percentis a partir de valores brutos de IP,
 * exceto a regra conservadora RCP < 1,0 (sempre anormal no 3º trimestre).
 */

var ObstetriciaRcfDopplerService = (function() {
    'use strict';

    var LIMITE_RCF_PRECOCE_SEMANAS = 32;
    var IG_MINIMA = 20;
    var IG_MAXIMA = 42;

    /**
     * Conduta por estágio (Figueras & Gratacós 2014 / ISUOG 2020).
     * Estágio 0 = PIG constitucional (Doppler normal, sem critérios de RCF).
     */
    var PROTOCOLO_ESTAGIOS = {
        0: {
            rotulo: 'PIG (Pequeno para a Idade Gestacional) — Doppler normal',
            fisiopatologia: 'Feto constitucionalmente pequeno, sem evidência de insuficiência placentária.',
            vigilancia: 'Biometria fetal e Doppler (AU, ACM, RCP) a cada 2 semanas.',
            ig_alvo_semanas: 39,
            ig_alvo_texto: '39+0 a 40+0 semanas',
            via_parto: 'Via obstétrica habitual; indução do trabalho de parto permitida.'
        },
        1: {
            rotulo: 'Estágio I — PIG grave ou insuficiência placentária leve',
            fisiopatologia: 'Insuficiência placentária leve / redistribuição hemodinâmica inicial (baixo risco de acidose).',
            vigilancia: 'Doppler semanal (AU, ACM, RCP, uterinas) + biometria a cada 2 semanas + avaliação do líquido amniótico.',
            ig_alvo_semanas: 37,
            ig_alvo_texto: '37+0 semanas',
            via_parto: 'Indução do trabalho de parto permitida, com monitorização fetal contínua (cardiotocografia intraparto).'
        },
        2: {
            rotulo: 'Estágio II — Insuficiência placentária grave',
            fisiopatologia: 'Diástole zero na artéria umbilical ou fluxo reverso no istmo aórtico: alto risco de deterioração.',
            vigilancia: 'Doppler (AU, ACM, ducto venoso) e cCTG 2 a 3 vezes por semana; considerar internação.',
            ig_alvo_semanas: 34,
            ig_alvo_texto: '34+0 semanas',
            via_parto: 'Cesariana (baixa reserva fetal para contrações; indução não recomendada).'
        },
        3: {
            rotulo: 'Estágio III — Baixa suspeita de acidose fetal (descompensação em curso)',
            fisiopatologia: 'Diástole reversa na artéria umbilical ou IP do ducto venoso > p95: descompensação cardiovascular fetal em curso.',
            vigilancia: 'Internação em centro terciário com UTI neonatal; Doppler (ducto venoso) e cCTG a cada 24 a 48 horas.',
            ig_alvo_semanas: 30,
            ig_alvo_texto: '30+0 semanas',
            via_parto: 'Cesariana.'
        },
        4: {
            rotulo: 'Estágio IV — Alta suspeita de acidose fetal',
            fisiopatologia: 'Onda A ausente/reversa no ducto venoso, VCP reduzida na cCTG ou desacelerações espontâneas: risco iminente de óbito fetal.',
            vigilancia: 'Internação em centro terciário; cCTG/vitalidade a cada 12 horas até o parto.',
            ig_alvo_semanas: 26,
            ig_alvo_texto: '>= 26+0 semanas (após corticoide, se a vitalidade permitir)',
            via_parto: 'Cesariana.'
        }
    };

    var REFERENCIAS = [
        'Gordijn SJ et al. Consenso Delphi de definição de RCF. Ultrasound Obstet Gynecol 2016;48:333-9.',
        'ISUOG Practice Guidelines — SGA e RCF. Ultrasound Obstet Gynecol 2020;56:298-312.',
        'Figueras F, Gratacós E. Protocolo por estágios (Barcelona). Fetal Diagn Ther 2014;36:86-98.',
        'TRUFFLE (Lees CC et al.). Lancet 2015;385:2162-72.',
        'Dutch STRIDER (Pels A et al.). Lancet Child Adolesc Health 2020;4:22-32.',
        'FEBRASGO — Protocolo de Restrição de Crescimento Fetal.'
    ];

    // ───────────────────────────── utilitários ─────────────────────────────

    function num(v) {
        if (v === null || v === undefined || v === '') return NaN;
        return parseFloat(String(v).replace(',', '.'));
    }

    function flag(v) {
        return v === true || v === 1 || v === 'true' || v === 'sim';
    }

    function percentil(params, chave) {
        var p = num(params[chave]);
        if (isNaN(p)) return NaN;
        if (p < 0 || p > 100) {
            throw new Error('Percentil inválido em "' + chave + '": ' + params[chave] + ' (esperado entre 0 e 100).');
        }
        return p;
    }

    /** Verdadeiro se o percentil informado atende ao critério, ou se o marcador booleano equivalente veio marcado. */
    function criterioPercentil(params, chavePercentil, chaveFlag, comparador) {
        var p = percentil(params, chavePercentil);
        if (!isNaN(p)) return comparador(p);
        return flag(params[chaveFlag]);
    }

    function normalizarDiastoleAU(v) {
        var s = String(v || '').toLowerCase();
        if (/revers|revert|invertid|redv/.test(s)) return 'reversa';
        if (/zero|ausente|aedv/.test(s)) return 'zero';
        return 'normal';
    }

    function normalizarOndaA(v) {
        var s = String(v || '').toLowerCase();
        if (/revers|revert|negativ|invertid/.test(s)) return 'reversa';
        if (/ausente|zero/.test(s)) return 'ausente';
        return 'positiva';
    }

    function formatarIg(diasTotais) {
        return Math.floor(diasTotais / 7) + 's' + (diasTotais % 7) + 'd';
    }

    /**
     * Normaliza a idade gestacional. Aceita ig_semanas (+ ig_dias), ig decimal ou string "30+4" / "30s4d".
     */
    function normalizarIg(params) {
        var semanas = NaN;
        var dias = 0;
        var igStr = params.ig !== undefined && params.ig !== null ? String(params.ig) : '';
        var mStr = igStr.match(/^\s*(\d{1,2})\s*(?:\+|s|sem)\s*(\d)?\s*d?\s*$/i);

        if (!isNaN(num(params.ig_semanas))) {
            semanas = num(params.ig_semanas);
            dias = num(params.ig_dias) || 0;
        } else if (mStr) {
            semanas = parseInt(mStr[1], 10);
            dias = mStr[2] ? parseInt(mStr[2], 10) : 0;
        } else if (!isNaN(num(params.ig))) {
            semanas = num(params.ig);
        }

        if (isNaN(semanas)) {
            throw new Error('Idade gestacional obrigatória (ex.: ig_semanas: 30, ig_dias: 4).');
        }
        if (dias < 0 || dias > 6) {
            throw new Error('Dias da idade gestacional devem estar entre 0 e 6.');
        }

        var diasTotais = Math.round(Math.floor(semanas) * 7 + (semanas - Math.floor(semanas)) * 7 + dias);
        var decimal = diasTotais / 7;
        if (decimal < IG_MINIMA || decimal >= IG_MAXIMA + 1) {
            throw new Error('Idade gestacional fora da faixa de aplicação do protocolo (' + IG_MINIMA + ' a ' + IG_MAXIMA + ' semanas).');
        }

        return {
            semanas: Math.floor(diasTotais / 7),
            dias: diasTotais % 7,
            dias_totais: diasTotais,
            decimal: Math.round(decimal * 100) / 100,
            texto: formatarIg(diasTotais)
        };
    }

    // ─────────────────────────── interpretação Doppler ───────────────────────────

    /**
     * Interpreta os achados biométricos e dopplervelocimétricos em marcadores binários auditáveis.
     */
    function interpretarDoppler(params, ig) {
        params = params || {};
        var achados = [];
        var notas = [];

        var diastoleAU = normalizarDiastoleAU(params.au_diastole);
        var ondaA = normalizarOndaA(params.dv_onda_a);

        var pfeMenorP3 = criterioPercentil(params, 'peso_fetal_percentil', 'peso_fetal_menor_p3', function(p) { return p < 3; });
        var caMenorP3 = criterioPercentil(params, 'ca_percentil', 'ca_menor_p3', function(p) { return p < 3; });
        var pfeMenorP10 = pfeMenorP3 || criterioPercentil(params, 'peso_fetal_percentil', 'peso_fetal_menor_p10', function(p) { return p < 10; });
        var caMenorP10 = caMenorP3 || criterioPercentil(params, 'ca_percentil', 'ca_menor_p10', function(p) { return p < 10; });

        var auIpMaiorP95 = criterioPercentil(params, 'au_ip_percentil', 'au_ip_maior_p95', function(p) { return p > 95; }) || diastoleAU !== 'normal';
        var acmIpMenorP5 = criterioPercentil(params, 'acm_ip_percentil', 'acm_ip_menor_p5', function(p) { return p < 5; });
        var uterinasIpMaiorP95 = criterioPercentil(params, 'uterinas_ip_percentil', 'uterinas_ip_maior_p95', function(p) { return p > 95; });
        var dvIpMaiorP95 = criterioPercentil(params, 'dv_ip_percentil', 'dv_ip_maior_p95', function(p) { return p > 95; });
        var istmoReverso = flag(params.istmo_aortico_reverso);
        var quedaPercentil = flag(params.queda_percentil);

        // Relação cerebroplacentária (RCP = IP ACM / IP AU)
        var auIpValor = num(params.au_ip_valor);
        var acmIpValor = num(params.acm_ip_valor);
        var rcpValor = num(params.rcp_valor);
        var rcpFonte = null;
        if (isNaN(rcpValor) && !isNaN(auIpValor) && !isNaN(acmIpValor) && auIpValor > 0) {
            rcpValor = Math.round((acmIpValor / auIpValor) * 100) / 100;
            rcpFonte = 'calculada (IP ACM ' + acmIpValor + ' / IP AU ' + auIpValor + ')';
        } else if (!isNaN(rcpValor)) {
            rcpFonte = 'informada';
        }

        var rcpStatus = 'nao_avaliada';
        var rcpPct = percentil(params, 'rcp_percentil');
        if (!isNaN(rcpPct)) {
            rcpStatus = rcpPct < 5 ? 'alterada' : 'normal';
            rcpFonte = 'percentil informado (p' + rcpPct + ')';
        } else if (flag(params.rcp_menor_p5)) {
            rcpStatus = 'alterada';
            rcpFonte = rcpFonte || 'marcador informado (RCP < p5)';
        } else if (!isNaN(rcpValor)) {
            if (ig.decimal >= 28 && rcpValor < 1.0) {
                rcpStatus = 'alterada';
                notas.push('RCP ' + rcpValor + ' < 1,0: inferior ao p5 em todo o 3º trimestre (critério conservador sem curva).');
            } else {
                rcpStatus = 'indeterminada';
                notas.push('RCP bruta ' + rcpValor + ' não exclui RCP < p5 (no 3º trimestre o p5 é superior a 1,0). Confirmar o percentil na curva de referência adotada pelo serviço.');
            }
        }
        var rcpMenorP5 = rcpStatus === 'alterada';

        if (!isNaN(auIpValor) && isNaN(percentil(params, 'au_ip_percentil')) && !flag(params.au_ip_maior_p95) && diastoleAU === 'normal') {
            notas.push('IP da AU bruto (' + auIpValor + ') sem percentil: informar o percentil do laudo para classificar AU > p95.');
        }

        // Ducto venoso: onda A com perfusão anormal implica IP elevado
        if (ondaA !== 'positiva') dvIpMaiorP95 = true;

        // Registro auditável dos achados
        if (pfeMenorP3) achados.push('Peso fetal estimado < p3');
        else if (pfeMenorP10) achados.push('Peso fetal estimado < p10');
        if (caMenorP3) achados.push('Circunferência abdominal < p3');
        else if (caMenorP10) achados.push('Circunferência abdominal < p10');
        if (quedaPercentil) achados.push('Queda de percentil de crescimento > 2 quartis');
        if (diastoleAU === 'reversa') achados.push('Artéria umbilical: DIÁSTOLE REVERSA');
        else if (diastoleAU === 'zero') achados.push('Artéria umbilical: DIÁSTOLE ZERO (ausente)');
        else if (auIpMaiorP95) achados.push('Artéria umbilical: IP > p95');
        if (acmIpMenorP5) achados.push('Artéria cerebral média: IP < p5 (vasodilatação cerebral / centralização)');
        if (rcpMenorP5) achados.push('Relação cerebroplacentária < p5 (redistribuição hemodinâmica)');
        if (uterinasIpMaiorP95) achados.push('Artérias uterinas: IP médio > p95');
        if (istmoReverso) achados.push('Istmo aórtico: fluxo diastólico reverso');
        if (ondaA === 'reversa') achados.push('Ducto venoso: ONDA A REVERSA');
        else if (ondaA === 'ausente') achados.push('Ducto venoso: ONDA A AUSENTE');
        else if (dvIpMaiorP95) achados.push('Ducto venoso: IP > p95');

        return {
            achados: achados,
            notas: notas,
            rcp: { valor: isNaN(rcpValor) ? null : rcpValor, status: rcpStatus, fonte: rcpFonte },
            marcadores: {
                peso_fetal_menor_p3: pfeMenorP3,
                peso_fetal_menor_p10: pfeMenorP10,
                ca_menor_p3: caMenorP3,
                ca_menor_p10: caMenorP10,
                queda_percentil: quedaPercentil,
                au_diastole: diastoleAU,
                au_ip_maior_p95: auIpMaiorP95,
                acm_ip_menor_p5: acmIpMenorP5,
                rcp_menor_p5: rcpMenorP5,
                uterinas_ip_maior_p95: uterinasIpMaiorP95,
                istmo_aortico_reverso: istmoReverso,
                dv_ip_maior_p95: dvIpMaiorP95,
                dv_onda_a: ondaA
            }
        };
    }

    // ───────────────────────────── classificação ─────────────────────────────

    /**
     * Classifica em RCF precoce, RCF tardia, PIG ou sem restrição (Consenso Delphi 2016).
     */
    function classificarRcf(m, ig) {
        var criterios = [];
        var tipo = 'SEM_RESTRICAO';
        var pequeno = m.peso_fetal_menor_p10 || m.ca_menor_p10;
        var gravePlacentario = m.au_diastole !== 'normal' || m.dv_ip_maior_p95 || m.istmo_aortico_reverso;

        if (ig.decimal < LIMITE_RCF_PRECOCE_SEMANAS) {
            if (m.ca_menor_p3) criterios.push('Critério isolado: CA < p3');
            if (m.peso_fetal_menor_p3) criterios.push('Critério isolado: PFE < p3');
            if (m.au_diastole !== 'normal') criterios.push('Critério isolado: diástole zero/reversa na artéria umbilical');
            if (pequeno && m.uterinas_ip_maior_p95) criterios.push('PFE/CA < p10 + IP médio das uterinas > p95');
            if (pequeno && m.au_ip_maior_p95 && m.au_diastole === 'normal') criterios.push('PFE/CA < p10 + IP da artéria umbilical > p95');
            if (criterios.length) tipo = 'RCF_PRECOCE';
        } else {
            if (m.ca_menor_p3) criterios.push('Critério isolado: CA < p3');
            if (m.peso_fetal_menor_p3) criterios.push('Critério isolado: PFE < p3');
            var contributivos = [];
            if (pequeno) contributivos.push('PFE/CA < p10');
            if (m.queda_percentil) contributivos.push('queda de percentil > 2 quartis');
            if (m.rcp_menor_p5 || m.au_ip_maior_p95) contributivos.push('RCP < p5 ou IP da AU > p95');
            if (contributivos.length >= 2) criterios.push('2 de 3 critérios contributivos: ' + contributivos.join(' + '));
            if (criterios.length) tipo = 'RCF_TARDIA';
        }

        // Insuficiência placentária grave ao Doppler deve ser conduzida como RCF mesmo sem critério biométrico
        if (tipo === 'SEM_RESTRICAO' && gravePlacentario) {
            tipo = ig.decimal < LIMITE_RCF_PRECOCE_SEMANAS ? 'RCF_PRECOCE' : 'RCF_TARDIA';
            criterios.push('Insuficiência placentária grave ao Doppler (AU diástole zero/reversa, DV alterado ou istmo reverso): conduzir como RCF independentemente da biometria');
        }

        if (tipo === 'SEM_RESTRICAO' && pequeno) {
            tipo = 'PIG';
            criterios.push('PFE/CA entre p3 e p10 sem alteração Doppler nem critérios de RCF');
        }

        var titulos = {
            RCF_PRECOCE: 'RCF PRECOCE (< 32 semanas) — predomínio placentário, maior risco de hipóxia crônica e prematuridade',
            RCF_TARDIA: 'RCF TARDIA (>= 32 semanas) — insuficiência placentária leve, risco de deterioração aguda e óbito sem aviso',
            PIG: 'PIG constitucional (Pequeno para a Idade Gestacional)',
            SEM_RESTRICAO: 'Sem critérios de RCF ou PIG'
        };

        return { tipo: tipo, titulo: titulos[tipo], criterios: criterios };
    }

    /**
     * Limiar de VCP (variabilidade de curto prazo) da cCTG para Estágio IV.
     * TRUFFLE: < 2,6 ms até 28+6 semanas; < 3,0 ms a partir de 29+0 semanas (Barcelona: < 3 ms).
     */
    function limiarVcp(ig) {
        return ig.dias_totais < 29 * 7 ? 2.6 : 3.0;
    }

    /**
     * Estadiamento de Barcelona (I-IV). Retorna estágio 0 para PIG e null sem restrição.
     */
    function estadiar(params, m, classificacao, ig) {
        params = params || {};
        if (classificacao.tipo === 'SEM_RESTRICAO') {
            return { estagio: null, criterios: [] };
        }

        var vcp = num(params.vcp_ms);
        var limiar = limiarVcp(ig);
        var desacel = flag(params.desaceleracoes_espontaneas);

        var c4 = [], c3 = [], c2 = [], c1 = [];
        if (m.dv_onda_a !== 'positiva') c4.push('Onda A ' + (m.dv_onda_a === 'reversa' ? 'reversa' : 'ausente') + ' no ducto venoso');
        if (!isNaN(vcp) && vcp < limiar) c4.push('VCP da cCTG ' + vcp + ' ms < ' + String(limiar).replace('.', ',') + ' ms');
        if (desacel) c4.push('Desacelerações espontâneas (não provocadas) na cardiotocografia');

        if (m.au_diastole === 'reversa') c3.push('Diástole reversa na artéria umbilical');
        if (m.dv_ip_maior_p95 && m.dv_onda_a === 'positiva') c3.push('IP do ducto venoso > p95');

        if (m.au_diastole === 'zero') c2.push('Diástole zero na artéria umbilical');
        if (m.istmo_aortico_reverso) c2.push('Fluxo reverso no istmo aórtico');

        if (m.peso_fetal_menor_p3) c1.push('PFE < p3');
        if (m.ca_menor_p3) c1.push('CA < p3');
        if (m.au_ip_maior_p95 && m.au_diastole === 'normal') c1.push('IP da artéria umbilical > p95');
        if (m.acm_ip_menor_p5) c1.push('IP da ACM < p5');
        if (m.rcp_menor_p5) c1.push('RCP < p5');
        if (m.uterinas_ip_maior_p95) c1.push('IP médio das uterinas > p95');

        var estagio, criterios;
        if (c4.length) { estagio = 4; criterios = c4; }
        else if (c3.length) { estagio = 3; criterios = c3; }
        else if (c2.length) { estagio = 2; criterios = c2; }
        else if (c1.length || classificacao.tipo !== 'PIG') {
            estagio = 1;
            criterios = c1.length ? c1 : ['RCF tardia definida por crescimento (queda de percentil) com Doppler sem alterações'];
        } else { estagio = 0; criterios = ['PFE/CA entre p3 e p10 com Doppler normal']; }

        return { estagio: estagio, criterios: criterios, limiar_vcp_ms: limiar };
    }

    // ───────────────────────────── conduta ─────────────────────────────

    function planejarConduta(estadiamento, ig, params) {
        if (estadiamento.estagio === null) {
            return {
                parto_indicado_agora: false,
                vigilancia: 'Pré-natal habitual; repetir biometria em 2 a 3 semanas se houver suspeita clínica (altura uterina < p10).',
                via_parto: 'Via obstétrica habitual.',
                decisao: 'Sem indicação de antecipação do parto por crescimento fetal.'
            };
        }

        var prot = PROTOCOLO_ESTAGIOS[estadiamento.estagio];
        var alvoDias = prot.ig_alvo_semanas * 7;
        var partoAgora = ig.dias_totais >= alvoDias;
        var decisao;

        if (partoAgora) {
            if (estadiamento.estagio === 4) {
                decisao = 'INTERROMPER A GESTAÇÃO — idealmente após ciclo de corticoide (48 h) se a vitalidade permitir; NÃO postergar diante de desacelerações espontâneas recorrentes, bradicardia fetal ou cCTG terminal.';
            } else if (estadiamento.estagio === 0) {
                decisao = 'Programar o parto a termo (' + prot.ig_alvo_texto + ').';
            } else {
                decisao = 'PARTO INDICADO: idade gestacional alvo do ' + prot.rotulo.split(' — ')[0] + ' atingida (' + prot.ig_alvo_texto + ').';
            }
        } else {
            var faltam = alvoDias - ig.dias_totais;
            decisao = 'Manter vigilância e programar o parto com ' + prot.ig_alvo_texto + ' (faltam ' + Math.floor(faltam / 7) + ' semana(s) e ' + (faltam % 7) + ' dia(s)), antecipando se houver progressão de estágio ou indicação materna.';
            if (estadiamento.estagio === 4) {
                decisao = ig.decimal < 24
                    ? 'PERIVIABILIDADE (< 24 semanas) com sinais de acidose fetal: aconselhamento conjunto Obstetrícia/Neonatologia e decisão compartilhada com a gestante sobre suporte neonatal ativo; prognóstico muito reservado.'
                    : 'Estágio IV abaixo de 26 semanas: decisão individualizada em limite de viabilidade com aconselhamento conjunto Obstetrícia/Neonatologia; corticoide e neuroproteção se houver opção por intervenção.';
            }
        }

        return {
            parto_indicado_agora: partoAgora,
            vigilancia: prot.vigilancia,
            ig_alvo_semanas: prot.ig_alvo_semanas,
            ig_alvo_texto: prot.ig_alvo_texto,
            via_parto: prot.via_parto,
            local_parto: estadiamento.estagio >= 2 ? 'Centro terciário com UTI neonatal' : 'Maternidade com suporte neonatal adequado à IG',
            decisao: decisao
        };
    }

    function planejarCorticoide(estadiamento, conduta, ig) {
        var estagio = estadiamento.estagio;
        var esquema = 'Betametasona 12 mg IM a cada 24 h, 2 doses (ciclo único). Alternativa: Dexametasona 6 mg IM a cada 12 h, 4 doses.';
        if (estagio === null) return { indicado: false, motivo: 'Sem restrição de crescimento.' };

        if (ig.decimal >= 34) {
            if (conduta.parto_indicado_agora && ig.decimal < 37) {
                return {
                    indicado: false,
                    considerar: true,
                    esquema: esquema,
                    motivo: 'Prematuro tardio (34+0 a 36+6): considerar individualmente conforme protocolo institucional; evitar em diabetes pré-gestacional (hipoglicemia neonatal) e se já recebeu ciclo prévio.'
                };
            }
            return { indicado: false, motivo: 'IG >= 34 semanas: corticoide antenatal de rotina não indicado.' };
        }

        if (ig.decimal < 24) {
            return {
                indicado: false,
                considerar: estagio >= 3,
                esquema: esquema,
                motivo: 'Periviabilidade: corticoide apenas após decisão compartilhada por suporte neonatal ativo (a partir de 22-23 semanas conforme política institucional).'
            };
        }

        var semanasAteAlvo = conduta.ig_alvo_semanas - ig.decimal;
        var indicado = conduta.parto_indicado_agora || estagio >= 3 || (estagio === 2 && semanasAteAlvo <= 1);
        if (indicado) {
            return {
                indicado: true,
                esquema: esquema,
                motivo: 'Parto previsto antes de 34 semanas (Estágio ' + estagio + ').',
                observacao: 'Após o corticoide, a VCP da cCTG e os movimentos fetais podem reduzir transitoriamente por 24-72 h (efeito farmacológico) e o Doppler da AU pode melhorar temporariamente: interpretar com cautela, sem mascarar deterioração.'
            };
        }
        return {
            indicado: false,
            esquema: esquema,
            motivo: 'Administrar quando o parto for previsto para os próximos 7 dias ou se houver progressão de estágio.'
        };
    }

    function planejarNeuroprotecao(conduta, ig, estadiamento) {
        if (estadiamento.estagio === null || ig.decimal >= 32) {
            return { indicado: false, motivo: 'Neuroproteção com sulfato de magnésio restrita a partos com IG < 32 semanas.' };
        }
        var esquema = 'Sulfato de magnésio: ataque 4 g IV em 20-30 min (MgSO4 50% 8 mL + 12 mL de AD/SF 0,9%), manutenção 1 g/h (MgSO4 50% 10 mL + SF 0,9% 490 mL a 100 mL/h) até o parto, máximo 24 h; iniciar idealmente >= 4 h antes do parto. Monitorar reflexo patelar, FR (> 12 irpm) e diurese (> 25 mL/h); gluconato de cálcio 10% 10 mL IV disponível.';
        if (conduta.parto_indicado_agora && ig.decimal >= 24) {
            return { indicado: true, esquema: esquema, motivo: 'Parto indicado com IG < 32 semanas (prevenção de paralisia cerebral).' };
        }
        return { indicado: false, esquema: esquema, motivo: 'Programar no momento da decisão de parto se IG < 32 semanas.' };
    }

    function investigarEtiologia(classificacao, m, ig, params) {
        var lista = [];
        if (classificacao.tipo === 'SEM_RESTRICAO') return lista;
        lista.push('Confirmar a datação da gestação (CCN do 1º trimestre) antes de firmar o diagnóstico.');
        lista.push('Ultrassonografia morfológica detalhada para excluir anomalias estruturais.');
        if (classificacao.tipo === 'PIG') {
            lista.push('Avaliar fatores constitucionais (estatura/peso maternos, etnia, PIG familiar).');
            return lista;
        }
        lista.push('Rastrear pré-eclâmpsia: PA seriada, relação proteína/creatinina urinária, plaquetas, TGO/TGP, creatinina e LDH; considerar relação sFlt-1/PlGF se disponível.');
        lista.push('Revisar fatores maternos: tabagismo, hipertensão crônica, nefropatia, LES, uso de drogas e desnutrição.');
        var precoceGrave = classificacao.tipo === 'RCF_PRECOCE' || m.peso_fetal_menor_p3;
        if (precoceGrave) {
            lista.push('Infecções congênitas: CMV (IgG/IgM/avidez; PCR no líquido amniótico se suspeita), toxoplasmose, sífilis (treponêmico + VDRL) e rubéola.');
            lista.push('Oferecer estudo genético invasivo (amniocentese com microarray/cariótipo) se RCF grave < 24 semanas, anomalias associadas, polidrâmnio ou Doppler das uterinas normal (perfil não placentário).');
            lista.push('Considerar pesquisa de síndrome antifosfolipídio (anticoagulante lúpico, anticardiolipina, anti-β2-glicoproteína I) se insuficiência placentária grave com parto < 34 semanas.');
        }
        return lista;
    }

    function gerarAlertas(params, m, estadiamento, ig, interpretacao) {
        var alertas = [];
        if (flag(params.gemelar)) {
            alertas.push('⚠️ Gestação gemelar: este protocolo aplica-se a gestação única. Usar critérios específicos de RCF seletiva (classificação de Gratacós I-III em monocoriônicos).');
        }
        if (flag(params.anomalias_estruturais)) {
            alertas.push('⚠️ Anomalia estrutural presente: RCF associada a malformação foge à definição do Consenso Delphi — conduta com Medicina Fetal e estudo genético.');
        }
        if (flag(params.pre_eclampsia) || flag(params.hellp)) {
            alertas.push('🚨 Pré-eclâmpsia/HELLP associada: a indicação MATERNA (sinais de gravidade, HELLP, eclâmpsia, descontrole pressórico) pode antecipar o parto independentemente do estágio fetal.');
        }
        var ila = num(params.ila_cm);
        var maiorBolsao = num(params.maior_bolsao_cm);
        if (flag(params.oligoamnio) || (!isNaN(ila) && ila < 5) || (!isNaN(maiorBolsao) && maiorBolsao < 2)) {
            alertas.push('⚠️ Oligoâmnio: sinal de hipoperfusão renal fetal crônica — intensificar a vigilância (não altera isoladamente o estágio de Barcelona).');
        }
        if (estadiamento.estagio === null && (m.acm_ip_menor_p5 || m.rcp_menor_p5 || m.au_ip_maior_p95 || m.uterinas_ip_maior_p95)) {
            alertas.push('⚠️ Doppler alterado em feto com biometria adequada: repetir biometria e Doppler em 1-2 semanas (risco de RCF tardia em evolução); se ACM alterada, avaliar também o pico de velocidade sistólica (anemia fetal).');
        }
        if (estadiamento.estagio >= 3 && ig.decimal < 30) {
            alertas.push('🚨 RCF precoce com descompensação: o momento do parto deve ser guiado pelo ducto venoso e pela VCP da cCTG (TRUFFLE), não pela ACM/RCP isoladas.');
        }
        var pfeGramas = num(params.peso_fetal_gramas);
        if (!isNaN(pfeGramas) && pfeGramas < 500) {
            alertas.push('⚠️ PFE < 500 g: limite de viabilidade — aconselhamento neonatal obrigatório antes de qualquer intervenção.');
        }
        interpretacao.notas.forEach(function(n) { alertas.push('ℹ️ ' + n); });
        return alertas;
    }

    function bloqueiosSeguranca(estadiamento) {
        var b = [
            '🚫 SILDENAFILA CONTRAINDICADA para tratamento de RCF: o ensaio STRIDER holandês foi interrompido por excesso de hipertensão pulmonar neonatal e tendência a maior mortalidade neonatal.',
            '🚫 AAS e heparina NÃO tratam RCF estabelecida: AAS em baixa dose é profilaxia de pré-eclâmpsia iniciada antes de 16 semanas em gestantes de risco; heparina apenas se indicação própria (ex.: SAF, TEV).',
            '🚫 Repouso absoluto, hiperoxigenação materna, suplementos nutricionais e hidratação venosa não melhoram o crescimento nem os desfechos fetais.',
            '🚫 Não antecipar o parto por biometria isolada em PIG com Doppler normal antes de 37 semanas (prematuridade iatrogênica sem benefício).',
            '🚫 Na RCF precoce, ACM e RCP isoladas não definem o momento do parto antes de 34 semanas.'
        ];
        if (estadiamento.estagio >= 2) {
            b.push('🚫 Evitar indução do trabalho de parto nos Estágios II a IV: via de parto preferencial é a cesariana.');
        }
        return b;
    }

    // ───────────────────────────── orquestração ─────────────────────────────

    /**
     * Avaliação completa de RCF / Doppler obstétrico.
     * @param {Object} params - ver extrairParametrosTexto para chaves aceitas
     */
    function avaliarRcf(params) {
        params = params || {};
        var ig = normalizarIg(params);
        var interpretacao = interpretarDoppler(params, ig);
        var m = interpretacao.marcadores;
        var classificacao = classificarRcf(m, ig);
        var estadiamento = estadiar(params, m, classificacao, ig);
        if (estadiamento.estagio !== null) {
            var prot = PROTOCOLO_ESTAGIOS[estadiamento.estagio];
            estadiamento.rotulo = prot.rotulo;
            estadiamento.fisiopatologia = prot.fisiopatologia;
        }
        if (classificacao.tipo === 'PIG' && estadiamento.estagio >= 1) {
            classificacao.titulo = 'PIG com marcador Doppler de insuficiência placentária (conduzir como Estágio I de Barcelona)';
        }
        var conduta = planejarConduta(estadiamento, ig, params);
        var decisaoInterno = estadiamento.estagio === null
            ? 'Sem critérios de RCF: manter pré-natal e reavaliar biometria conforme suspeita clínica.'
            : (estadiamento.estagio >= 3
                ? 'Internar em centro terciário com UTI neonatal hoje; avaliar ducto venoso e cCTG seriados.'
                : estadiamento.estagio === 2
                    ? 'Diástole zero na artéria umbilical: avaliação em centro terciário hoje e considerar internação.'
                    : 'AU com fluxo presente/ACM ou RCP alterada isoladamente: seguimento especializado; não antecipar parto antes de 34 semanas só pela ACM.') +
              ' Alvo de interrupção do estágio: ' + PROTOCOLO_ESTAGIOS[estadiamento.estagio].ig_alvo_texto +
              '; antecipar por deterioração fetal ou indicação materna.';

        return {
            ig: ig,
            classificacao: classificacao,
            doppler: { achados: interpretacao.achados, rcp: interpretacao.rcp, marcadores: m },
            estadiamento: estadiamento,
            conduta: conduta,
            decisao_interno: decisaoInterno,
            corticoide: planejarCorticoide(estadiamento, conduta, ig),
            neuroprotecao_magnesio: planejarNeuroprotecao(conduta, ig, estadiamento),
            investigacao_etiologica: investigarEtiologia(classificacao, m, ig, params),
            alertas: gerarAlertas(params, m, estadiamento, ig, interpretacao),
            bloqueios_seguranca: bloqueiosSeguranca(estadiamento),
            referencias: REFERENCIAS.slice()
        };
    }

    /**
     * Extrai parâmetros de texto livre (Telegram). Ex.:
     * "ig 30s4d pfe p2 ca p4 au diastole zero acm p3 dv onda a positiva vcp 4.1"
     */
    function extrairParametrosTexto(texto) {
        var t = String(texto || '');
        var tl = t.toLowerCase();
        var p = {};

        function n(re) {
            var mm = t.match(re);
            return mm ? parseFloat(String(mm[1]).replace(',', '.')) : null;
        }
        function pct(rotulo) {
            return n(new RegExp('\\b(?:' + rotulo + ')\\s*(?:ip\\s*)?[:=]?\\s*<?\\s*p\\s*(\\d+(?:[.,]\\d+)?)', 'i'));
        }

        // Idade gestacional: "30s4d", "30 semanas e 4 dias", "30+4", "ig 30.5", "30 semanas"
        var mIg = t.match(/(\d{2})\s*(?:s|sem|semanas)\s*(?:e\s*|\+\s*)?(\d)\s*d(?:ias?)?\b/i) || t.match(/\b(\d{2})\s*\+\s*(\d)\b/);
        if (mIg) {
            p.ig_semanas = parseInt(mIg[1], 10);
            p.ig_dias = parseInt(mIg[2], 10);
        } else {
            var igNum = n(/\big\s*[:=]?\s*(\d{2}(?:[.,]\d+)?)/i);
            if (igNum === null) igNum = n(/\b(\d{2})\s*(?:semanas|sem|s)\b/i);
            if (igNum !== null) p.ig_semanas = igNum;
        }

        var v;
        if ((v = pct('pfe|peso\\s*fetal|efw|peso')) !== null) p.peso_fetal_percentil = v;
        if ((v = n(/\b(\d{3,4})\s*g(?:ramas)?\b/i)) !== null) p.peso_fetal_gramas = v;
        if ((v = pct('ca|circ(?:unfer[eê]ncia)?\\s*abd(?:ominal)?|ac')) !== null) p.ca_percentil = v;
        if ((v = pct('au|umbilical|aumb')) !== null) p.au_ip_percentil = v;
        if ((v = pct('acm|cerebral\\s*m[eé]dia|mca')) !== null) p.acm_ip_percentil = v;
        if ((v = pct('rcp|cpr|rcu')) !== null) p.rcp_percentil = v;
        if ((v = pct('uterinas?|aut|aauu')) !== null) p.uterinas_ip_percentil = v;
        if ((v = pct('dv|ducto(?:\\s*venoso)?')) !== null) p.dv_ip_percentil = v;

        if ((v = n(/(?:ip\s*(?:da\s*)?au|au\s*ip)\s*[:=]?\s*(\d[.,]\d+)/i)) !== null) p.au_ip_valor = v;
        if ((v = n(/(?:ip\s*(?:da\s*)?acm|acm\s*ip)\s*[:=]?\s*(\d[.,]\d+)/i)) !== null) p.acm_ip_valor = v;
        if ((v = n(/\b(?:rcp|cpr)\s*[:=]?\s*(\d[.,]\d+)/i)) !== null) p.rcp_valor = v;
        if ((v = n(/\b(?:vcp|stv)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i)) !== null) p.vcp_ms = v;
        if ((v = n(/\bila\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i)) !== null) p.ila_cm = v;
        if ((v = n(/maior\s*bols[aã]o\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i)) !== null) p.maior_bolsao_cm = v;

        // Ducto venoso (processado antes da AU para não confundir "onda a reversa" com diástole reversa)
        var tlSemDv = tl;
        var mOnda = tl.match(/onda\s*a\s*(reversa|revertida|invertida|negativa|ausente|zero|positiva|normal)/);
        if (mOnda) {
            p.dv_onda_a = mOnda[1];
            tlSemDv = tl.replace(mOnda[0], ' ');
        }
        if (/\b(?:dv|ducto(?:\s*venoso)?)\s*(?:ip\s*)?(?:alterado|aumentado|elevado|>\s*p95)/.test(tl)) p.dv_ip_maior_p95 = true;

        // Artéria umbilical (sem abreviações ambíguas: falso positivo de diástole reversa indicaria Estágio III)
        if (/di[aá]stole\s*(?:reversa|revertida|invertida)|\bredv\b|\b(?:au|umbilical)\s*(?:com\s*)?(?:fluxo\s*)?(?:revers|revert)/.test(tlSemDv)) {
            p.au_diastole = 'reversa';
        } else if (/di[aá]stole\s*(?:zero|ausente)|\baedv\b|\b(?:au|umbilical)\s*(?:com\s*)?(?:di[aá]stole\s*)?(?:zero|ausente)/.test(tlSemDv)) {
            p.au_diastole = 'zero';
        }
        if (/(?:\bau\b|umbilical)\s*(?:ip\s*)?(?:alterad|aumentad|elevad|>\s*p95)/.test(tlSemDv)) p.au_ip_maior_p95 = true;

        if (/istmo[^,;.]*revers/.test(tlSemDv)) p.istmo_aortico_reverso = true;
        if (/centraliza|redistribui/.test(tl)) p.rcp_menor_p5 = true;
        if (/(?:acm|cerebral)\s*(?:ip\s*)?(?:<\s*p5|baixo|vasodilat)/.test(tl)) p.acm_ip_menor_p5 = true;
        if (/uterinas?\s*(?:ip\s*)?(?:alterad|aumentad|>\s*p95)|incisura\s*bilateral/.test(tl)) p.uterinas_ip_maior_p95 = true;
        if (/desacelera/.test(tl)) p.desaceleracoes_espontaneas = true;
        if (/queda\s*(?:de\s*)?percentil|cruz(?:ou|amento)\s*(?:de\s*)?percentis?/.test(tl)) p.queda_percentil = true;
        if (/oligo[aâ]mnio|oligoidr[aâ]mnio|\boligo\b/.test(tl)) p.oligoamnio = true;
        if (/pr[eé][\s-]?ecl[aâ]mpsia|\bdheg\b/.test(tl)) p.pre_eclampsia = true;
        if (/hellp/.test(tl)) p.hellp = true;
        if (/gemela|gemelar/.test(tl)) p.gemelar = true;
        if (/malforma|anomalia/.test(tl)) p.anomalias_estruturais = true;

        return p;
    }

    /**
     * Formata a avaliação para Telegram (Markdown legado).
     */
    function formatarTextoTelegram(a) {
        var txt = '⚠️ *MÓDULO DE REFERÊNCIA AVANÇADA* — A conduta definitiva requer especialista. O generalista deve reconhecer, estabilizar e encaminhar.\n\n';
        txt += '🤰 *OBSTETRÍCIA & MEDICINA FETAL — RCF / DOPPLER*\n\n';
        txt += '📅 *IG:* ' + a.ig.texto + '\n';
        txt += '📊 *Classificação (Delphi):* ' + a.classificacao.titulo + '\n';
        a.classificacao.criterios.forEach(function(c) { txt += '  • ' + c + '\n'; });

        if (a.doppler.achados.length) {
            txt += '\n🔬 *ACHADOS BIOMÉTRICOS E DOPPLER:*\n';
            a.doppler.achados.forEach(function(c) { txt += '  • ' + c + '\n'; });
        }
        if (a.doppler.rcp.valor !== null) {
            txt += '  • RCP: ' + a.doppler.rcp.valor + ' (' + a.doppler.rcp.fonte + ')\n';
        }

        if (a.estadiamento.estagio !== null) {
            var icone = a.estadiamento.estagio >= 3 ? '🚨' : (a.estadiamento.estagio === 2 ? '⚠️' : '🟡');
            txt += '\n' + icone + ' *ESTADIAMENTO (BARCELONA): ' + a.estadiamento.rotulo + '*\n';
            a.estadiamento.criterios.forEach(function(c) { txt += '  • ' + c + '\n'; });
            txt += '  ↳ ' + a.estadiamento.fisiopatologia + '\n';
        }

        txt += '\n🚨 *PARA O INTERNO — INTERNAR / INTERROMPER:* ' + a.decisao_interno + '\n';
        txt += '👉 *DECISÃO:* ' + a.conduta.decisao + '\n';
        txt += '• *Vigilância:* ' + a.conduta.vigilancia + '\n';
        txt += '• *Via de parto:* ' + a.conduta.via_parto + '\n';
        if (a.conduta.local_parto) txt += '• *Local:* ' + a.conduta.local_parto + '\n';

        if (a.corticoide.indicado) {
            txt += '\n💉 *CORTICOIDE ANTENATAL (INDICADO):* ' + a.corticoide.esquema + '\n';
            if (a.corticoide.observacao) txt += '  ↳ ' + a.corticoide.observacao + '\n';
        } else if (a.corticoide.considerar) {
            txt += '\n💉 *Corticoide antenatal (considerar):* ' + a.corticoide.motivo + '\n';
        }
        if (a.neuroprotecao_magnesio.indicado) {
            txt += '\n🧠 *NEUROPROTEÇÃO FETAL (INDICADA):* ' + a.neuroprotecao_magnesio.esquema + '\n';
        } else if (a.neuroprotecao_magnesio.esquema && a.estadiamento.estagio >= 2) {
            txt += '\n🧠 *Neuroproteção fetal (programar ao decidir o parto < 32 sem):* ' + a.neuroprotecao_magnesio.esquema + '\n';
        }

        if (a.investigacao_etiologica.length) {
            txt += '\n🧪 *INVESTIGAÇÃO ETIOLÓGICA:*\n';
            a.investigacao_etiologica.forEach(function(c) { txt += '  • ' + c + '\n'; });
        }
        if (a.alertas.length) {
            txt += '\n⚠️ *ALERTAS:*\n';
            a.alertas.forEach(function(c) { txt += '  ' + c + '\n'; });
        }
        txt += '\n🛡️ *BLOQUEIOS DE SEGURANÇA:*\n';
        a.bloqueios_seguranca.forEach(function(c) { txt += '• ' + c + '\n'; });

        txt += '\n📚 Fontes: Consenso Delphi 2016, ISUOG 2020, Barcelona (Figueras & Gratacós 2014), TRUFFLE 2015, STRIDER 2020, FEBRASGO.\n';
        txt += 'Percentis conforme curva de referência do laudo. Decisão final do obstetra assistente.';
        return txt;
    }

    return {
        normalizarIg: normalizarIg,
        interpretarDoppler: interpretarDoppler,
        classificarRcf: classificarRcf,
        estadiar: estadiar,
        avaliarRcf: avaliarRcf,
        extrairParametrosTexto: extrairParametrosTexto,
        formatarTextoTelegram: formatarTextoTelegram,
        PROTOCOLO_ESTAGIOS: PROTOCOLO_ESTAGIOS
    };
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = ObstetriciaRcfDopplerService;
}
