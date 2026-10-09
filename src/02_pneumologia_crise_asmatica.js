/**
 * @file 02_pneumologia_crise_asmatica.js
 * @description Módulo de Pneumologia e Medicina de Emergência: Manejo da Crise Asmática Grave
 * e Estado de Mal Asmático baseado nas diretrizes GINA (Global Initiative for Asthma),
 * SBPT (Sociedade Brasileira de Pneumologia e Tisiologia) e Consensos de Terapia Intensiva.
 */

var PneumologiaCriseAsmaticaService = (function() {
    'use strict';

    /**
     * Classifica a gravidade da crise asmática beira-leito.
     * @param {Object} params - Sinais vitais, exame físico e gasometria
     * @returns {Object} Estratificação detalhada de gravidade
     */
    function classificarGravidade(params) {
        params = params || {};

        var fala = (params.fala || '').toLowerCase(); // 'frases_completas', 'frases_curtas', 'palavras_isoladas', 'incapaz'
        var posicao = (params.posicao || '').toLowerCase(); // 'deitado', 'sentado', 'tripe'
        var estado_mental = (params.estado_mental || '').toLowerCase(); // 'calmo', 'agitado', 'sonolento', 'confuso', 'coma'
        var musculatura_acessoria = (params.musculatura_acessoria || '').toLowerCase(); // 'ausente', 'moderada', 'acentuada'
        var ausculta = (params.ausculta || '').toLowerCase(); // 'normal', 'sibilos_expiratorios', 'sibilos_difusos', 'torax_silencioso'
        
        var fc = parseFloat(params.fc);
        var fr = parseFloat(params.fr);
        var spo2 = parseFloat(params.spo2);
        var pfe = parseFloat(params.pfe);
        var pfe_previsto = parseFloat(params.pfe_previsto);
        var pfe_pct = parseFloat(params.pfe_porcentagem);

        // Se fornecido PFE medido e PFE previsto, calcula porcentagem
        if (!isNaN(pfe) && !isNaN(pfe_previsto) && pfe_previsto > 0 && isNaN(pfe_pct)) {
            pfe_pct = Math.round((pfe / pfe_previsto) * 100);
        }

        var respiracao_paradoxal = !!params.respiracao_paradoxal;
        var bradicardia = !!params.bradicardia || (!isNaN(fc) && fc < 55);
        var gasometria = params.gasometria || null;

        var criterios_ameaca_vida = [];
        var criterios_grave = [];
        var criterios_leve_moderada = [];

        // 1. CHECAGEM DE CRITÉRIOS DE AMEAÇA À VIDA / PARADA IMINENTE / ESTADO DE MAL ASMÁTICO
        if (ausculta === 'torax_silencioso' || params.torax_silencioso) {
            criterios_ameaca_vida.push("Tórax Silencioso (ausência de murmúrio vesicular por broncoespasmo crítico e fluxo aéreo quase nulo)");
        }
        if (['sonolento', 'confuso', 'coma', 'rebaixado', 'letargico'].indexOf(estado_mental) !== -1) {
            criterios_ameaca_vida.push("Alteração de sensório / sonolência / confusão mental (exaustão hipercápnica e hipóxia encefálica)");
        }
        if (respiracao_paradoxal) {
            criterios_ameaca_vida.push("Respiração paradoxal toracoabdominal (fadiga diafragmática franca)");
        }
        if (bradicardia) {
            criterios_ameaca_vida.push("Bradicardia / colapso hemodinâmico iminente");
        }
        if (fala === 'incapaz' || fala === 'incapaz_de_falar') {
            criterios_ameaca_vida.push("Incapacidade total de articular palavras por exaustão respiratória");
        }
        if (gasometria) {
            var ph = parseFloat(gasometria.ph);
            var paco2 = parseFloat(gasometria.paco2 || gasometria.pco2);
            if (!isNaN(paco2) && paco2 >= 42) {
                criterios_ameaca_vida.push("PaCO2 normal ou elevada (" + paco2 + " mmHg) em crise asmática: falência muscular aguda (deveria estar hipocápnico < 35 mmHg por hiperventilação)");
            }
            if (!isNaN(ph) && ph < 7.30) {
                criterios_ameaca_vida.push("Acidose respiratória ou mista severa (pH " + ph + ")");
            }
        }

        // 2. CHECAGEM DE CRITÉRIOS DE GRAVIDADE
        if (fala === 'palavras_isoladas' || fala === 'palavras') {
            criterios_grave.push("Fala apenas palavras isoladas (incapaz de formar frases completas)");
        }
        if (posicao === 'tripe' || posicao === 'inclinado_frente') {
            criterios_grave.push("Posição de tripé (sentado inclinando-se para a frente)");
        }
        if (estado_mental === 'agitado') {
            criterios_grave.push("Agitação psicomotora e ansiedade extrema");
        }
        if (musculatura_acessoria === 'acentuada' || musculatura_acessoria === 'grave') {
            criterios_grave.push("Uso acentuado de musculatura acessória (tiragem supraclavicular, fúrcula e batimento de asa de nariz)");
        }
        if (!isNaN(fc) && fc > 120) {
            criterios_grave.push("Taquicardia severa (FC " + fc + " bpm)");
        }
        if (!isNaN(fr) && fr > 30) {
            criterios_grave.push("Taquipneia acentuada (FR " + fr + " irpm)");
        }
        if (!isNaN(spo2) && spo2 < 90) {
            criterios_grave.push("Dessaturação grave em ar ambiente (SpO2 " + spo2 + "% < 90%)");
        }
        if (!isNaN(pfe_pct) && pfe_pct <= 50) {
            criterios_grave.push("Pico de Fluxo Expiratório (PFE) <= 50% do previsto (" + pfe_pct + "%)");
        }
        if (ausculta === 'sibilos_difusos' || ausculta === 'inspiratorios_e_expiratorios') {
            criterios_grave.push("Sibilos difusos e inspiratórios/expiratórios com tempo expiratório acentuadamente prolongado");
        }

        // 3. CLASSIFICAÇÃO FINAL
        var nivel = "LEVE_MODERADA";
        var titulo = "Crise Asmática Leve a Moderada";
        var cor = "AMARELO";
        var recomendacao_imediata = "Iniciar SABA 4-10 jatos com espaçador a cada 20 min na 1ª hora + Corticoide sistêmico oral precoce.";

        if (criterios_ameaca_vida.length > 0) {
            nivel = "PARADA_IMINENTE";
            titulo = "AMEAÇA À VIDA / PARADA IMINENTE (Estado de Mal Asmático)";
            cor = "VERMELHO_PULSANTE";
            recomendacao_imediata = "EMERGÊNCIA MÉDICA IMEDIATA: Mover para Sala Vermelha. Oxigenioterapia de alto fluxo, SABA + Ipratrópio contínuo/frequente, Corticoide IV imediato, Sulfato de Magnésio 2g IV em 20 min. Preparar sequência rápida de intubação com Ketamina se exaustão, com ventilação protetora.";
        } else if (criterios_grave.length >= 2 || (criterios_grave.length >= 1 && (!isNaN(spo2) && spo2 < 92))) {
            nivel = "GRAVE";
            titulo = "Crise Asmática Grave";
            cor = "LARANJA";
            recomendacao_imediata = "Atendimento prioritário em leito monitorizado. SABA + Brometo de Ipratrópio a cada 20 min na 1ª hora, Corticoide sistêmico oral ou IV imediato, Oxigênio com alvo de SpO2 93-95%. Preparar Sulfato de Magnésio 2g IV se refratário após 1ª hora.";
        } else {
            criterios_leve_moderada.push("Fala frases completas ou pequenos períodos");
            criterios_leve_moderada.push("Sem uso extremo de musculatura acessória");
            if (!isNaN(spo2) && spo2 >= 90) criterios_leve_moderada.push("SpO2 mantida >= 90-95%");
            if (!isNaN(pfe_pct) && pfe_pct > 50) criterios_leve_moderada.push("PFE > 50% do previsto (" + pfe_pct + "%)");
        }

        return {
            nivel: nivel,
            titulo: titulo,
            cor: cor,
            pfe_porcentagem: !isNaN(pfe_pct) ? pfe_pct : null,
            criterios_ameaca_vida: criterios_ameaca_vida,
            criterios_grave: criterios_grave,
            criterios_leve_moderada: criterios_leve_moderada,
            recomendacao_imediata: recomendacao_imediata
        };
    }

    /**
     * Calcula o plano escalonado de broncodilatação e medicações.
     * @param {Object} params - Dados clínicos do paciente e gravidade
     * @param {string} nivelGravidade - 'LEVE_MODERADA', 'GRAVE' ou 'PARADA_IMINENTE'
     * @returns {Object} Prescrições detalhadas com doses, vias e horários
     */
    function calcularPlanoTratamento(params, nivelGravidade) {
        params = params || {};
        var idade = parseFloat(params.idade) || 30;
        var pesoKg = parseFloat(params.pesoKg) || 70;
        var ehPediatrico = (idade < 12) || (params.faixa_etaria === 'pediatrico');
        var refratario1h = !!params.refratario_1h;
        var toleranciaOral = params.tolerancia_oral !== false;
        var gestante = !!params.gestante;

        var plano = {
            oxigenoterapia: null,
            broncodilatacao_saba: null,
            anticolinergico_ipratropio: null,
            corticoide_sistemico: null,
            sulfato_magnesio: null,
            resgate_adjuvante: null,
            manejo_ventilatorio: null,
            bloqueios_seguranca: [],
            criterios_destino: null
        };

        // 1. OXIGENOTERAPIA CONTROLADA
        var alvoSpo2 = (gestante || ehPediatrico) ? "94% a 98%" : "93% a 95%";
        plano.oxigenoterapia = {
            alvo_spo2: alvoSpo2,
            dispositivo: nivelGravidade === 'PARADA_IMINENTE' ? 
                "Máscara com reservatório não reinalante 10-15 L/min com monitorização contínua" : 
                "Cânula nasal de O2 1 a 3 L/min ou Máscara de Venturi titulada",
            orientacao: "Administrar oxigênio suplementar para manter SpO2 entre " + alvoSpo2 + ". Evitar hiperóxia não controlada (SpO2 100%), pois pode agravar hipercapnia por aumento do espaço morto fisiológico (efeito Haldane)."
        };

        // 2. SABA - SALBUTAMOL (BETA-2 AGONISTA DE CURTA AÇÃO)
        if (ehPediatrico) {
            var jatosPed = idade < 6 ? "4 a 6 jatos" : "6 a 10 jatos";
            var doseGtsSalb = Math.min(20, Math.max(5, Math.round(pesoKg * 0.75))); // 0.15 mg/kg = ~0.6 a 0.8 gts/kg
            plano.broncodilatacao_saba = {
                farmaco: "Salbutamol 100 mcg/jato (Spray/MDI) com espaçador valvulado",
                opcao_preferencial: "Spray MDI com espaçador e máscara facial: " + jatosPed + " (1 jato por vez com 4-6 ciclos respiratórios) a cada 20 minutos na 1ª hora (ciclos aos 0, 20 e 40 minutos).",
                opcao_alternativa_nebulizacao: "Nebulização: Salbutamol gotas (5 mg/mL) " + doseGtsSalb + " gotas (" + (doseGtsSalb * 0.25).toFixed(2) + " mg) diluídas em 3 mL de SF 0.9% sob fluxo de O2 a 6-8 L/min a cada 20 minutos na 1ª hora.",
                nota: "O uso de espaçador valvulado é tão ou mais eficaz que nebulização, com menor taquicardia e menor aerolização viral."
            };
        } else {
            plano.broncodilatacao_saba = {
                farmaco: "Salbutamol 100 mcg/jato (Spray/MDI) com espaçador",
                opcao_preferencial: "Spray MDI com espaçador: 4 a 10 jatos (1 jato por vez; aguardar 30-60 segundos entre jatos com apneia de 10s ou 4 respirações lentas) a cada 20 minutos na 1ª hora (3 ciclos: aos 0, 20 e 40 minutos).",
                opcao_alternativa_nebulizacao: "Nebulização intermitente: Salbutamol gotas (5 mg/mL) 10 a 20 gotas (2.5 a 5.0 mg = 0.5 a 1.0 mL) diluídos em 3 a 4 mL de SF 0.9% a cada 20 minutos na 1ª hora (fluxo de O2 a 6-8 L/min).",
                opcao_nebulizacao_continua: nivelGravidade === 'PARADA_IMINENTE' ? "Em estado de mal asmático refratário: Nebulização contínua a 10-15 mg/hora (2 a 3 mL da solução a 5 mg/mL por hora em nebulizador de alto fluxo)." : null,
                nota: "Se boa resposta inicial com alívio dos sintomas, espaçar para cada 2 a 4 horas conforme necessidade."
            };
        }

        // 3. SAMA - BROMETO DE IPRATRÓPIO (ANTICOLINÉRGICO)
        var indicarIpratropio = (nivelGravidade === 'GRAVE' || nivelGravidade === 'PARADA_IMINENTE' || refratario1h);
        if (indicarIpratropio) {
            if (ehPediatrico) {
                var doseGtsIpra = pesoKg < 20 ? 20 : 40; // 0.25mg vs 0.5mg
                plano.anticolinergico_ipratropio = {
                    indicado: true,
                    farmaco: "Brometo de Ipratrópio 0.25 mg/mL (Atrovent)",
                    posologia: "Nebulização: " + doseGtsIpra + " gotas (" + (doseGtsIpra === 20 ? "0.25 mg" : "0.50 mg") + ") diluídas junto com o Salbutamol a cada 20 minutos nas primeiras 3 doses (1ª hora).",
                    spray_alternativo: "Spray MDI com espaçador: 4 a 8 jatos (20 mcg/jato) a cada 20 minutos na 1ª hora.",
                    justificativa: "Associação sinérgica na crise grave que reduz significativamente as taxas de hospitalização e melhora função pulmonar."
                };
            } else {
                plano.anticolinergico_ipratropio = {
                    indicado: true,
                    farmaco: "Brometo de Ipratrópio 0.25 mg/mL (Atrovent) ou Spray 20 mcg/jato",
                    posologia: "Nebulização: 40 gotas (0.5 mg = 2.0 mL) adicionadas ao mesmo copo do Salbutamol a cada 20 minutos nas primeiras 3 doses (1ª hora).",
                    spray_alternativo: "Spray MDI com espaçador: 4 a 8 jatos (20 mcg/jato) a cada 20 minutos na 1ª hora associado ao SABA.",
                    justificativa: "Recomendação GINA/SBPT classe I na crise moderada/grave: bloqueia tônus colinérgico vagal e reduz necessidade de intubação."
                };
            }
        } else {
            plano.anticolinergico_ipratropio = {
                indicado: false,
                motivo: "Não indicado de rotina na crise leve que responde bem ao primeiro ciclo de SABA isolado. Reservar se resposta incompleta."
            };
        }

        // 4. CORTICOTERAPIA SISTÊMICA PRECOCE (MANDATÓRIA NA 1ª HORA)
        var usarIv = (!toleranciaOral || nivelGravidade === 'PARADA_IMINENTE' || nivelGravidade === 'GRAVE');
        if (ehPediatrico) {
            var dosePrednisolonaPed = Math.min(50, Math.max(10, Math.round(pesoKg * 1.5))); // 1 a 2 mg/kg/dia
            plano.corticoide_sistemico = {
                momento: "Administrar na PRIMEIRA HORA do atendimento (efeito genômico anti-inflamatório inicia em 4-6 horas).",
                via_preferencial: usarIv ? "INTRAVENOSA" : "ORAL",
                oral: "Prednisolona solução oral (3 mg/mL): " + dosePrednisolonaPed + " mg (" + (dosePrednisolonaPed / 3).toFixed(1) + " mL) VO uma vez ao dia pela manhã por 3 a 5 dias.",
                intravenoso: "Hidrocortisona: 4 a 5 mg/kg IV a cada 6 horas (dose máx: 200 mg/dose); OU Metilprednisolona 1 mg/kg IV a cada 12 horas.",
                duracao: "Tratamento curto de 3 a 5 dias. Não necessita de desmame gradual."
            };
        } else {
            plano.corticoide_sistemico = {
                momento: "Administrar IMEDIATAMENTE na PRIMEIRA HORA da chegada ao PS.",
                via_preferencial: usarIv ? "INTRAVENOSA (pela gravidade/risco de broncoaspiração)" : "ORAL (tão eficaz e rápida absorção quanto IV se tolerar VO)",
                oral: "Prednisona ou Prednisolona 40 a 50 mg VO em dose única diária pela manhã por 5 a 7 dias.",
                intravenoso: "Hidrocortisona 200 mg IV em bolus imediato, seguido de 100 mg IV a cada 6 horas; OU Metilprednisolona 40 a 60 mg IV a cada 6 a 12 horas.",
                duracao: "Manter por 5 a 7 dias em adultos. Não necessita de redução progressiva/desmame se usado por até 7-10 dias."
            };
        }

        // 5. SULFATO DE MAGNÉSIO 2G IV (INDICAÇÃO OPORTUNA NA CRISE REFRATÁRIA OU PARADA IMINENTE)
        var indicarSulfatoMg = (nivelGravidade === 'PARADA_IMINENTE' || nivelGravidade === 'GRAVE' || refratario1h);
        if (indicarSulfatoMg) {
            if (ehPediatrico) {
                var doseMgPed = Math.min(2000, Math.round(pesoKg * 50)); // 40-50 mg/kg, máx 2g
                var mlMg50Ped = (doseMgPed / 500).toFixed(1); // 50% = 500mg/mL
                plano.sulfato_magnesio = {
                    indicado: true,
                    farmaco: "Sulfato de Magnésio 50% IV",
                    dose: doseMgPed + " mg (" + mlMg50Ped + " mL da solução a 50%)",
                    diluicao: "Diluir em 100 mL de Solução Fisiológica 0.9% ou SG 5%",
                    tempo_infusao: "Infundir por via intravenosa em 20 a 30 minutos em bomba de infusão contínua",
                    monitoramento: "Monitorar pressão arterial (risco de vasodilatação e hipotensão), frequência respiratória e reflexo patelar.",
                    mecanismo: "Potente relaxamento da musculatura lisa brônquica por bloqueio dos canais de cálcio dependentes de voltagem e inibição da liberação de acetilcolina pré-sináptica."
                };
            } else {
                plano.sulfato_magnesio = {
                    indicado: true,
                    farmaco: "Sulfato de Magnésio IV",
                    dose: "2,0 g (Sulfato de Magnésio 50%: 4 mL; OU Sulfato de Magnésio 10%: 20 mL)",
                    diluicao: "Diluir em 100 mL de Solução Fisiológica 0.9% ou Soro Glicosado 5%",
                    tempo_infusao: "Infundir IV em 20 minutos (evitar bolus rápido para não deflagrar hipotensão e rubor facial)",
                    monitoramento: "Monitorar PA, FC, FR e reflexos tendinosos profundos (patelar) durante a infusão.",
                    justificativa: "Recomendado pelas diretrizes GINA/SBPT em crises que persistem com PFE < 50% ou SpO2 < 92% após a 1ª hora, ou em qualquer paciente com sinais de ameaça à vida na apresentação inicial."
                };
            }
        } else {
            plano.sulfato_magnesio = {
                indicado: false,
                criterio: "Indicar Sulfato de Magnésio 2g IV em 20 min caso o paciente mantenha PFE < 50% ou SpO2 < 92% após a 1ª hora de broncodilatação intensiva."
            };
        }

        // 6. RESGATE ADJUVANTE PARENTERAL (ESTADO DE MAL ASMÁTICO / TÓRAX SILENCIOSO)
        if (nivelGravidade === 'PARADA_IMINENTE') {
            var doseAdrenalina = ehPediatrico ? (Math.min(0.5, Math.round(pesoKg * 0.01 * 100) / 100) + " mg (0.01 mg/kg)") : "0.3 a 0.5 mg (0.3 a 0.5 mL da solução 1:1000)";
            plano.resgate_adjuvante = {
                farmaco: "Adrenalina (Epinefrina) 1:1000 (1 mg/mL) por via INTRAMUSCULAR",
                dose: doseAdrenalina + " IM no vasto lateral da coxa",
                repeticao: "Pode ser repetida a cada 10 a 15 minutos até 3 doses se persistência de broncoespasmo intratável.",
                indicacao_precisa: "Indicado se suspeita de anafilaxia associada OU crise asmática extrema com fluxo aéreo tão crítico (tórax silencioso) que impede a penetração alveolar do aerossol inalatório."
            };
        }

        // 7. MANEJO VENTILATÓRIO E PRECAUÇÕES DE INTUBAÇÃO
        plano.manejo_ventilatorio = {
            aviso_vital: "EVITAR A INTUBAÇÃO OROTRAQUEAL (IOT) AO MÁXIMO! A IOT na crise de asma apresenta altíssimo índice de complicações letais (hiperinsuflação dinâmica, auto-PEEP extrema, pneumotórax hipertensivo e colapso hemodinâmico por perda de retorno venoso).",
            indicacoes_absolutas_iot: [
                "Parada cardiorrespiratória ou respiração agônica iminente",
                "Coma ou rebaixamento severo de consciência (Glasgow < 8) por narcose hipercápnica",
                "Exaustão motora extrema e colapso muscular ventilatório",
                "Acidose respiratória refratária severa e progressiva (pH < 7.15 a 7.20)"
            ],
            sequencia_rapida_intubacao: {
                pre_oxigenacao: "Pré-oxigenação com máscara com reservatório e baixo esforço; evitar ventilação excessiva com ambú para não distender estômago e pulmão.",
                inducao_escolha: "KETAMINA 1.5 a 2.0 mg/kg IV (fármaco de indução padrão-ouro na asma: potente broncodilatador simpaticomimético direto).",
                bloqueador_neuromuscular: "SUCCINILCOLINA 1.5 mg/kg IV ou ROCURÔNIO 1.2 mg/kg IV.",
                contraindicados_inducao: "Evitar Fentanil em bolus rápido e Morfina (liberação de histamina e broncoespasmo reflexo)."
            },
            parametros_ventilador_protetor: {
                modo: "VCV (Volume Controlado) ou PCV",
                volume_corrente: "5 a 6 mL/kg de peso predito (PBW) para evitar hiperdistensão alveolar",
                frequencia_respiratoria: "10 a 12 irpm (BAIXA, permitindo tempo expiratório longo)",
                tempo_expiratorio_ie: "Relação I:E de 1:3 a 1:5 (fluxo inspiratório alto 60-80 L/min com onda quadrada)",
                peep: "PEEP BAIXA: 0 a 5 cmH2O (para não somar ao auto-PEEP intrínseco)",
                alvo_mecanica: "Pressão de Platô (Pplat) < 30 cmH2O e Driving Pressure < 15 cmH2O",
                estrategia_gasometrica: "HIPERCAPNIA PERMISSIVA: tolerar PaCO2 de 50 a 70 mmHg desde que pH >= 7.20.",
                conduta_colapso_pos_iot: "ALERTA SENTINELA: Se ocorrer hipotensão súbita ou assistolia imediatamente após a intubação: DESCONECTAR O PACIENTE DO VENTILADOR IMEDIATAMENTE e comprimir o tórax manualmente para esvaziar o ar aprisionado (alívio imediato de auto-PEEP extrema e tamponamento gasoso torácico), e afastar pneumotórax hipertensivo!"
            }
        };

        // 8. BLOQUEIOS DE SEGURANÇA E CONTRAINDICAÇÕES CRÍTICAS
        plano.bloqueios_seguranca.push("🚫 CONTRAINDICAÇÃO FORMAL: NUNCA prescrever sedativos, ansiolíticos (Benzodiazepínicos como Diazepam/Midazolam) ou opioides na crise asmática em paciente sem via aérea definitiva intubada! Causa depressão respiratória aguda e parada cardiorrespiratória por abolição do drive ventilatório de exaustão.");
        plano.bloqueios_seguranca.push("🚫 CONTRAINDICAÇÃO DE ANTIBIÓTICOS ROTINEIROS: Não indicar antimicrobianos empiricamente para exacerbação de asma. Mais de 80% das crises são deflagradas por infecções virais respiratórias ou alérgenos. Reservar apenas se pneumonia bacteriana confirmada radiologicamente ou febre alta mantida com expectoração francamente purulenta.");
        plano.bloqueios_seguranca.push("🚫 CONTRAINDICAÇÃO DE MUCOLÍTICOS: Fluidificantes e mucolíticos (ex: Acetilcisteína inalatória) são formalmente contraindicados na fase aguda de broncoespasmo (pioram tosse, irritação e broncoconstrição reflexa).");

        // 9. CRITÉRIOS DE DESTINO E PRESCRIÇÃO DE ALTA
        plano.criterios_destino = {
            alta_emergencia: {
                criterios: [
                    "Sintomas resolvidos e fala fluida sem dispneia",
                    "Ausência de uso de musculatura acessória e ausculta limpa ou com sibilos mínimos",
                    "SpO2 > 94% em ar ambiente mantida por pelo menos 1 a 2 horas após a última dose de SABA",
                    "Pico de Fluxo Expiratório (PFE) > 70% do previsto ou do melhor pessoal"
                ],
                prescricao_alta: [
                    "1. Corticoide Oral: Prednisona 40 a 50 mg/dia VO pela manhã por 5 a 7 dias (adultos) ou Prednisolona 1-2 mg/kg/dia por 3 a 5 dias (crianças).",
                    "2. Corticoide Inalatório de Manutenção: Iniciar ou otimizar CI (ex: Budesonida 200 a 400 mcg 12/12h OU Budesonida + Formoterol) para prevenir exacerbações precoces.",
                    "3. Broncodilatador de Resgate: Salbutamol Spray 100 mcg (2 a 4 jatos com espaçador se sintomas de falta de ar).",
                    "4. Orientação Técnica: Revisar minuciosamente a técnica de uso do inalador dosimetrado com espaçador antes da alta hospitalar.",
                    "5. Retorno: Consulta médica ambulatorial de retorno agendada em 2 a 7 dias com plano de ação escrito."
                ]
            },
            internacao_enfermaria: {
                criterios: [
                    "Resposta intermediária ao tratamento inicial",
                    "PFE entre 50% e 70% após 1ª a 2ª hora de broncodilatação",
                    "Necessidade persistente de SABA a cada 2 a 3 horas para controle sintomático",
                    "Fatores de risco psicossocial, falta de suporte familiar ou exacerbações graves recentes"
                ]
            },
            internacao_uti: {
                criterios: [
                    "Apresentação inicial com tórax silencioso, acidose ou alteração neurológica",
                    "PFE < 50% persistente após 1ª hora de broncodilatação intensiva",
                    "Necessidade de infusão de Sulfato de Magnésio IV",
                    "Hipercapnia (PaCO2 normal ou em ascensão) com fadiga muscular",
                    "Necessidade de intubação traqueal e ventilação mecânica invasiva"
                ]
            }
        };

        return plano;
    }

    /**
     * Orquestrador principal da avaliação de crise asmática.
     * @param {Object} params
     * @returns {Object} Avaliação completa com classificação e prescrições
     */
    function avaliarCriseAsmatica(params) {
        params = params || {};
        var gravidade = classificarGravidade(params);
        var plano = calcularPlanoTratamento(params, gravidade.nivel);

        return {
            gravidade: gravidade,
            plano: plano,
            params_recebidos: params
        };
    }

    /**
     * Formata os resultados para o Telegram com sintaxe Markdown rica.
     * @param {Object} analise - Resultado retornado por avaliarCriseAsmatica
     * @returns {string} Mensagem clínica estruturada
     */
    function formatarTextoTelegram(analise) {
        var g = analise.gravidade;
        var p = analise.plano;

        var txt = "🫁 *PNEUMOLOGIA & EMERGÊNCIA — MANEJO DA CRISE ASMÁTICA*\n\n";
        
        txt += "📊 *ESTRATIFICAÇÃO DE GRAVIDADE:*\n";
        txt += "• Classificação: *" + g.titulo + "*\n";
        if (g.pfe_porcentagem !== null) {
            txt += "• Pico de Fluxo Expiratório (PFE): *" + g.pfe_porcentagem + "% do previsto*\n";
        }

        if (g.criterios_ameaca_vida.length > 0) {
            txt += "🚨 *SINAIS DE AMEAÇA À VIDA / PARADA IMINENTE DETECTADOS:*\n";
            g.criterios_ameaca_vida.forEach(function(c) {
                txt += "  ⚠️ " + c + "\n";
            });
        } else if (g.criterios_grave.length > 0) {
            txt += "⚠️ *Critérios de Gravidade Presentes:*\n";
            g.criterios_grave.forEach(function(c) {
                txt += "  • " + c + "\n";
            });
        } else {
            txt += "✅ Padrão clínico compatível com crise leve a moderada.\n";
        }

        txt += "\n👉 *CONDUTA IMEDIATA:* " + g.recomendacao_imediata + "\n";

        txt += "\n💊 *PROTOCOLO ESCALONADO DE MEDICAÇÕES:*\n";
        
        // Oxigênio
        txt += "1️⃣ *Oxigenoterapia:* Alvo SpO2 *" + p.oxigenoterapia.alvo_spo2 + "* via " + p.oxigenoterapia.dispositivo + ".\n";
        
        // SABA
        txt += "2️⃣ *SABA (Salbutamol):* " + p.broncodilatacao_saba.opcao_preferencial + "\n";
        if (p.broncodilatacao_saba.opcao_nebulizacao_continua) {
            txt += "   ↳ _" + p.broncodilatacao_saba.opcao_nebulizacao_continua + "_\n";
        }

        // Ipratrópio
        if (p.anticolinergico_ipratropio && p.anticolinergico_ipratropio.indicado) {
            txt += "3️⃣ *Anticolinérgico (Brometo de Ipratrópio):* " + p.anticolinergico_ipratropio.posologia + "\n";
        }

        // Corticoide
        txt += "4️⃣ *Corticoide Sistêmico (Administrar na 1ª hora):*\n";
        txt += "   • Via Oral: " + p.corticoide_sistemico.oral + "\n";
        txt += "   • Via IV: " + p.corticoide_sistemico.intravenoso + "\n";

        // Sulfato de Magnésio
        if (p.sulfato_magnesio && p.sulfato_magnesio.indicado) {
            txt += "\n⚡ *SULFATO DE MAGNÉSIO 2G IV (INDICAÇÃO MANDATÓRIA):*\n";
            txt += "   • *Dose:* " + p.sulfato_magnesio.dose + "\n";
            txt += "   • *Diluição:* " + p.sulfato_magnesio.diluicao + "\n";
            txt += "   • *Infusão:* " + p.sulfato_magnesio.tempo_infusao + "\n";
        }

        // Resgate Adrenalina
        if (p.resgate_adjuvante) {
            txt += "\n💉 *ADRENALINA IM DE RESGATE:* " + p.resgate_adjuvante.dose + " (" + p.resgate_adjuvante.indicacao_precisa + ").\n";
        }

        // Ventilação
        if (g.nivel === 'PARADA_IMINENTE' || g.nivel === 'GRAVE') {
            txt += "\n🫁 *ESTRATÉGIA VENTILATÓRIA & IOT PROTETORA:*\n";
            txt += "• *Indução de Escolha:* " + p.manejo_ventilatorio.sequencia_rapida_intubacao.inducao_escolha + "\n";
            txt += "• *Parâmetros do Respirador:* Vt 5-6 mL/kg predito, FR 10-12 rpm, Relação I:E 1:3 a 1:4, PEEP baixa (0-5), Hipercapnia permissiva (pH >= 7.20).\n";
            txt += "• ⚠️ *" + p.manejo_ventilatorio.parametros_ventilador_protetor.conduta_colapso_pos_iot + "*\n";
        }

        // Bloqueios
        txt += "\n🛡️ *BLOQUEIOS DE SEGURANÇA:*\n";
        p.bloqueios_seguranca.forEach(function(b) {
            txt += "• " + b + "\n";
        });

        txt += "\n_Referência: Diretrizes GINA 2024-2026 / SBPT (Sociedade Brasileira de Pneumologia e Tisiologia)_";

        return txt;
    }

    return {
        classificarGravidade: classificarGravidade,
        calcularPlanoTratamento: calcularPlanoTratamento,
        avaliarCriseAsmatica: avaliarCriseAsmatica,
        formatarTextoTelegram: formatarTextoTelegram
    };
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = PneumologiaCriseAsmaticaService;
}
