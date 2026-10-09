/**
 * Módulo de Cardiologia de Emergência: Dor Torácica, Síndromes Coronarianas Agudas (SCA) e IAM
 * Motor determinístico baseado nas diretrizes SBC (2021/2024), AHA/ACC e ESC (2023).
 * Inclui: Escore HEART, TIMI SCASST, TIMI IAMCSST, Protocolo DAPT e Bloqueios Cruzados Críticos.
 */

var CardiologiaEmergenciaService = (function() {
    'use strict';

    /**
     * Escore HEART (History, ECG, Age, Risk factors, Troponin) para dor torácica na emergência
     * @param {Object} dados
     */
    function calcularHEART(dados) {
        dados = dados || {};
        var score = 0;
        var justificativas = [];

        // 1. History (História Clínica)
        var hist = dados.historia;
        if (hist === 2 || hist === '2' || hist === 'altamente_suspeita') {
            score += 2;
            justificativas.push("História altamente suspeita (+2): dor retroesternal em aperto, irradiação para mandíbula/MMSS, sudorese/diaforese ou piora ao esforço.");
        } else if (hist === 1 || hist === '1' || hist === 'moderadamente_suspeita') {
            score += 1;
            justificativas.push("História moderadamente suspeita (+1): elementos anginosos mistos ou equivalentes.");
        } else {
            justificativas.push("História pouco ou não suspeita (+0): dor incaracterística, atípica, pontual ou reprodutível à palpação.");
        }

        // 2. ECG (Eletrocardiograma)
        var ecg = dados.ecg;
        if (ecg === 2 || ecg === '2' || ecg === 'infradesnivel_st' || ecg === 'isquemia_significativa') {
            score += 2;
            justificativas.push("ECG com desvio significativo de ST ou inversão de onda T simétrica/profunda (+2). Se Supra de ST persistente -> Protocolo IAMCSST de Reperfusão Imediata!");
        } else if (ecg === 1 || ecg === '1' || ecg === 'alteracao_inespecifica' || ecg === 'bloqueio_ramo_previo' || ecg === 'sve') {
            score += 1;
            justificativas.push("ECG com alterações inespecíficas de repolarização, LBBB prévio ou SVE (+1).");
        } else {
            justificativas.push("ECG normal (+0).");
        }

        // 3. Age (Idade)
        var idade = Number(dados.idade) || 0;
        if (idade >= 65) {
            score += 2;
            justificativas.push("Idade >= 65 anos (+2).");
        } else if (idade >= 45) {
            score += 1;
            justificativas.push("Idade entre 45 e 64 anos (+1).");
        } else {
            justificativas.push("Idade < 45 anos (+0).");
        }

        // 4. Risk Factors (Fatores de Risco para DAC)
        // FR: HAS, DM, dislipidemia, tabagismo ativo/recente, obesidade IMC>30, HF prematura DAC, aterosclerose documentada
        var frCount = 0;
        if (dados.has) frCount++;
        if (dados.diabetes) frCount++;
        if (dados.dislipidemia) frCount++;
        if (dados.tabagismo) frCount++;
        if (dados.obesidade) frCount++;
        if (dados.historicoFamiliarPrecoce) frCount++;
        if (dados.fatoresRiscoContagem !== undefined) {
            frCount = Math.max(frCount, Number(dados.fatoresRiscoContagem) || 0);
        }

        var dacPrevia = Boolean(dados.dacPrevia || dados.doencaAteroscleroticaConfirmada || dados.iamPrevio || dados.avcPrevio || dados.dapPrevia);

        if (dacPrevia || frCount >= 3) {
            score += 2;
            justificativas.push("Fatores de risco cardiovasculares >= 3 OU aterosclerose arterial documentada (+2).");
        } else if (frCount >= 1) {
            score += 1;
            justificativas.push("1 ou 2 fatores de risco cardiovasculares conhecidos (+1).");
        } else {
            justificativas.push("Sem fatores de risco conhecidos (+0).");
        }

        // 5. Troponin (Troponina)
        var trop = dados.troponina;
        if (trop === 2 || trop === '2' || trop === 'elevada_3x' || trop === 'positiva_alta') {
            score += 2;
            justificativas.push("Troponina > 3x o limite superior de referência (ULN) (+2). Necrose miocárdica confirmada.");
        } else if (trop === 1 || trop === '1' || trop === 'elevada_1a3x' || trop === 'positiva_leve') {
            score += 1;
            justificativas.push("Troponina entre 1 e 3x o limite superior de referência (+1). Curva em andamento.");
        } else {
            justificativas.push("Troponina abaixo do limite superior de referência (normal) (+0).");
        }

        // Estratificação e Conduta
        var risco = "";
        var taxaMACE = "";
        var recomendacao = "";

        if (score <= 3) {
            risco = "Baixo Risco";
            taxaMACE = "0.9% a 1.7% de MACE em 6 semanas";
            recomendacao = "Candidato a protocolo de alta precoce e investigação ambulatorial rápida, se troponina ultrassensível seriada for negativa e delta estável.";
        } else if (score <= 6) {
            risco = "Risco Intermediário";
            taxaMACE = "12% a 16.6% de MACE em 6 semanas";
            recomendacao = "Internação hospitalar recomendada (unidade de observação/enfermaria) para monitorização, dosagem seriada de troponina e estratificação não-invasiva (Angio-TC de coronárias ou teste funcional).";
        } else {
            risco = "Alto Risco";
            taxaMACE = "50% a 65% de MACE em 6 semanas";
            recomendacao = "Internação IMEDIATA em Unidade Coronariana (UCO/UTI) e indicação de Estratégia Invasiva Precoce (Cateterismo cardíaco em < 24 horas). Monitorização eletrocardiográfica contínua.";
        }

        return {
            escore: score,
            risco: risco,
            taxaMACE: taxaMACE,
            recomendacao: recomendacao,
            justificativas: justificativas
        };
    }

    /**
     * Escore TIMI para Angina Instável / IAM Sem Supra de ST (SCASST)
     * @param {Object} dados
     */
    function calcularTIMISCASS(dados) {
        dados = dados || {};
        var score = 0;
        var criterios = [];

        if (Number(dados.idade) >= 65) {
            score++;
            criterios.push("Idade >= 65 anos (+1)");
        }
        
        var frCount = 0;
        if (dados.has) frCount++;
        if (dados.diabetes) frCount++;
        if (dados.dislipidemia) frCount++;
        if (dados.tabagismo) frCount++;
        if (dados.historicoFamiliarPrecoce) frCount++;
        if (dados.fatoresRiscoContagem !== undefined) frCount = Math.max(frCount, Number(dados.fatoresRiscoContagem) || 0);

        if (frCount >= 3) {
            score++;
            criterios.push(">= 3 Fatores de risco para DAC (+1)");
        }
        if (dados.estenoseCoronariaPrevia50 || dados.dacConhecida) {
            score++;
            criterios.push("Estenose coronariana prévia >= 50% (+1)");
        }
        if (dados.desvioST || dados.infradesnivelST) {
            score++;
            criterios.push("Desvio de segmento ST na admissão >= 0.5 mm (+1)");
        }
        if (dados.anginaRecente24h || dados.anginaGrave2Episodios) {
            score++;
            criterios.push(">= 2 episódios anginosos nas últimas 24h (+1)");
        }
        if (dados.usoAASUltimos7Dias) {
            score++;
            criterios.push("Uso prévio de AAS nos últimos 7 dias (+1)");
        }
        if (dados.troponinaElevada || dados.ckmbElevada) {
            score++;
            criterios.push("Marcadores de necrose miocárdica (Troponina/CK-MB) elevados (+1)");
        }

        var risco = "";
        var taxaMACE14Dias = "";
        var estrategia = "";

        if (score <= 2) {
            risco = "Baixo Risco";
            taxaMACE14Dias = "4.7% a 8.3%";
            estrategia = "Estratégia conservadora guiada por isquemia ou investigação não-invasiva.";
        } else if (score <= 4) {
            risco = "Risco Intermediário";
            taxaMACE14Dias = "13.2% a 19.9%";
            estrategia = "Estratégia invasiva precoce (< 24-72h) com cineangiocoronariografia.";
        } else {
            risco = "Alto Risco";
            taxaMACE14Dias = "26.2% a 41.0%";
            estrategia = "Estratégia invasiva urgente/precoce (< 24h) com monitorização intensiva em UCO.";
        }

        return {
            escore: score,
            risco: risco,
            taxaMACE14Dias: taxaMACE14Dias,
            estrategia: estrategia,
            criterios: criterios
        };
    }

    /**
     * Escore TIMI para IAM Com Supra de ST (IAMCSST)
     * @param {Object} dados
     */
    function calcularTIMIIAMCSST(dados) {
        dados = dados || {};
        var score = 0;
        var criterios = [];

        var idade = Number(dados.idade) || 0;
        if (idade >= 75) {
            score += 3;
            criterios.push("Idade >= 75 anos (+3)");
        } else if (idade >= 65) {
            score += 2;
            criterios.push("Idade entre 65 e 74 anos (+2)");
        }

        if (dados.diabetes || dados.has || dados.anginaPrevia) {
            score += 1;
            criterios.push("Histórico de DM, HAS ou Angina prévia (+1)");
        }

        var pas = Number(dados.pas);
        if (pas > 0 && pas < 100) {
            score += 3;
            criterios.push("PAS < 100 mmHg na admissão (+3)");
        }

        var fc = Number(dados.fc);
        if (fc > 100) {
            score += 2;
            criterios.push("Frequência cardíaca > 100 bpm (+2)");
        }

        var killip = Number(dados.killip) || (dados.killip === 'II' ? 2 : (dados.killip === 'III' ? 3 : (dados.killip === 'IV' ? 4 : 1)));
        if (killip >= 2 && killip <= 4) {
            score += 2;
            criterios.push("Classificação de Killip II a IV (congestão/choque) (+2)");
        }

        var peso = Number(dados.peso);
        if (peso > 0 && peso < 67) {
            score += 1;
            criterios.push("Peso corporal < 67 kg (+1)");
        }

        if (dados.supraParedeAnterior || dados.breNovo) {
            score += 1;
            criterios.push("Elevação de ST em parede anterior ou BRE presumivelmente novo (+1)");
        }

        if (dados.tempoDorMaior4h || dados.tempoPortaBalancoMaior4h) {
            score += 1;
            criterios.push("Tempo até tratamento/reperfusão > 4 horas (+1)");
        }

        // Mortalidade estimada em 30 dias
        var tabelaMortalidade = {
            0: "0.8%", 1: "1.6%", 2: "2.2%", 3: "4.4%",
            4: "7.3%", 5: "12.4%", 6: "16.1%", 7: "23.4%", 8: "26.8%"
        };
        var mort = score > 8 ? "35.9%" : (tabelaMortalidade[score] || "Varíavel");

        return {
            escore: score,
            mortalidade30Dias: mort,
            criterios: criterios
        };
    }

    /**
     * Avaliação Determinística de Terapia Antiplaquetária Dupla (DAPT) e Bloqueios Cruzados
     * @param {Object} dados
     */
    function avaliarDAPT(dados) {
        dados = dados || {};
        var recomendacoes = [];
        var bloqueios = [];
        var alertas = [];

        var avcOuAitPrevio = Boolean(dados.avcPrevio || dados.aitPrevio || dados.historicoAvc || dados.historicoAit);
        var sangramentoAtivo = Boolean(dados.sangramentoAtivo);
        var hicPrevia = Boolean(dados.hicPrevia || dados.hemorragiaIntracranianaPrevia);
        var trombolise = Boolean(dados.trombolise || dados.fibrinólise || dados.usoTrombolitico);
        var idade = Number(dados.idade) || 0;
        var peso = Number(dados.peso) || 0;
        var anticoagulacaoConcomitante = Boolean(dados.anticoagulacaoOral || dados.anticoagulacaoPlena || dados.fibrilacaoAtrial);
        var icpPlanejada = Boolean(dados.icpPlanejada || dados.cateterismoPlanejado || dados.angioplastiaPlanejada);
        var alergiaAAS = Boolean(dados.alergiaAAS);
        var usoOmeprazol = Boolean(dados.usoOmeprazol);
        var doencaHepaticaGrave = Boolean(dados.doencaHepaticaGrave);

        // 1. AAS
        if (alergiaAAS) {
            bloqueios.push({
                farmaco: "AAS (Ácido Acetilsalicílico)",
                nivel: "CONTRAINDICACAO_ABSOLUTA",
                motivo: "Alergia formal relatada ao AAS. Indicação de dessensibilização rápida de emergência se ICP imediata, ou monoterapia alternativa."
            });
        } else {
            recomendacoes.push({
                farmaco: "AAS (Ácido Acetilsalicílico)",
                ataque: "162 a 300 mg VO (mastigar 2 a 3 comprimidos de 100 mg infantis)",
                manutencao: "81 a 100 mg VO 1x ao dia contínuo",
                indicacao: "Antiagregação plaquetária via COX-1 precoce na suspeita de SCA."
            });
        }

        // 2. Análise dos Inibidores P2Y12
        var p2y12Escolhido = null;

        // Análise PRASUGREL
        var prasugrelContraindicado = false;
        var motivoPrasugrel = [];
        if (avcOuAitPrevio) {
            prasugrelContraindicado = true;
            motivoPrasugrel.push("BLOQUEIO SENTINELA: Antecedente de AVC ou AIT prévio (Aumento proibitivo de hemorragia intracraniana fatal - Ensaio TRITON-TIMI 38).");
        }
        if (hicPrevia) {
            prasugrelContraindicado = true;
            motivoPrasugrel.push("Histórico de hemorragia intracraniana prévia.");
        }
        if (sangramentoAtivo) {
            prasugrelContraindicado = true;
            motivoPrasugrel.push("Sangramento patológico ativo.");
        }
        if (trombolise) {
            prasugrelContraindicado = true;
            motivoPrasugrel.push("Não aprovado nem estudado em pacientes submetidos a fibrinólise/trombólise química.");
        }
        if (anticoagulacaoConcomitante) {
            prasugrelContraindicado = true;
            motivoPrasugrel.push("Terapia tripla com Prasugrel + DOAC é fortemente contraindicada por risco hemorrágico fatal.");
        }
        if (dados.scasst && !icpPlanejada && !dados.anatomiaCoronariaConhecida) {
            prasugrelContraindicado = true;
            motivoPrasugrel.push("Em SCASST, não administrar Prasugrel antes de conhecer a anatomia coronariana (Estudo ACCOAST).");
        }

        if (prasugrelContraindicado) {
            bloqueios.push({
                farmaco: "Prasugrel",
                nivel: "CONTRAINDICACAO_FORMAL",
                motivo: motivoPrasugrel.join(" ")
            });
        }

        // Análise TICAGRELOR
        var ticagrelorContraindicado = false;
        var motivoTicagrelor = [];
        if (hicPrevia) {
            ticagrelorContraindicado = true;
            motivoTicagrelor.push("Contraindicação formal: Antecedente de Hemorragia Intracraniana (HIC).");
        }
        if (sangramentoAtivo) {
            ticagrelorContraindicado = true;
            motivoTicagrelor.push("Sangramento patológico ativo.");
        }
        if (doencaHepaticaGrave) {
            ticagrelorContraindicado = true;
            motivoTicagrelor.push("Insuficiência hepática moderada a grave (metabolismo hepático via CYP3A4).");
        }
        if (trombolise) {
            ticagrelorContraindicado = true;
            motivoTicagrelor.push("Ticagrelor não é aprovado na vigência de fibrinólise/trombólise química no IAMCSST.");
        }
        if (anticoagulacaoConcomitante) {
            ticagrelorContraindicado = true;
            motivoTicagrelor.push("Uso concomitante com anticoagulante oral eleva excessivamente sangramentos maiores; preferir Clopidogrel.");
        }

        if (ticagrelorContraindicado) {
            bloqueios.push({
                farmaco: "Ticagrelor",
                nivel: "CONTRAINDICACAO_FORMAL",
                motivo: motivoTicagrelor.join(" ")
            });
        }

        // Escolha Estratégica do P2Y12:
        if (trombolise) {
            // Em trombólise o fármaco obrigatório é o CLOPIDOGREL
            p2y12Escolhido = "Clopidogrel";
            var ataqueClopi = "300 mg VO dose única";
            if (idade > 75) {
                ataqueClopi = "SEM DOSE DE ATAQUE em > 75 anos submetidos a trombólise! Apenas 75 mg VO inicial.";
                alertas.push("REGRA DE SEGURANÇA EM TROMBÓLISE: Idade > 75 anos requer OMISSÃO da dose de ataque de Clopidogrel (fazer apenas 75 mg VO).");
            }
            recomendacoes.push({
                farmaco: "Clopidogrel (Fármaco de escolha em Fibrinólise/Trombólise)",
                ataque: ataqueClopi,
                manutencao: "75 mg VO 1x ao dia",
                indicacao: "Inibidor P2Y12 padrão validado em estudos de trombólise (CLARITY-TIMI 28)."
            });
        } else if (anticoagulacaoConcomitante) {
            // Com anticoagulante oral, CLOPIDOGREL é a escolha padrão de segurança
            p2y12Escolhido = "Clopidogrel";
            recomendacoes.push({
                farmaco: "Clopidogrel (Fármaco de escolha em Associação com Anticoagulante)",
                ataque: "300 a 600 mg VO (600 mg se ICP imediata)",
                manutencao: "75 mg VO 1x ao dia",
                indicacao: "Menor taxa de sangramento quando associado a DOAC/Varfarina (Estudos PIONEER-AF, RE-DUAL, AUGUSTUS)."
            });
        } else if (!ticagrelorContraindicado) {
            // Ticagrelor é 1ª linha na maioria das diretrizes
            p2y12Escolhido = "Ticagrelor";
            recomendacoes.push({
                farmaco: "Ticagrelor (1ª Linha em SCA sem contraindicações)",
                ataque: "180 mg VO dose única",
                manutencao: "90 mg VO de 12/12 horas",
                indicacao: "Redução de mortalidade cardiovascular e trombose de stent sem necessidade de bioativação prévia (Estudo PLATO)."
            });
            alertas.push("Monitorar dispneia reflexa (mediada por adenosina, geralmente benigna e autolimitada) e risco de bradiarritmia.");
        } else if (!prasugrelContraindicado && icpPlanejada) {
            p2y12Escolhido = "Prasugrel";
            var doseManutPrasugrel = "10 mg VO 1x ao dia";
            if ((idade >= 75 && idade > 0) || (peso < 60 && peso > 0)) {
                doseManutPrasugrel = "5 mg VO 1x ao dia (redução ponderal por baixo peso < 60 kg ou idade >= 75 anos)";
                alertas.push("Dose reduzida de manutenção de Prasugrel (5 mg/dia) recomendada por idade >= 75 anos ou peso < 60 kg.");
            }
            recomendacoes.push({
                farmaco: "Prasugrel (Indicado pós-estudo coronariano com ICP planejada)",
                ataque: "60 mg VO dose única",
                manutencao: doseManutPrasugrel,
                indicacao: "Inibição plaquetária rápida e potente em ICP (Estudo TRITON-TIMI 38)."
            });
        } else {
            p2y12Escolhido = "Clopidogrel";
            var doseAtaqueClopi = icpPlanejada ? "600 mg VO dose única (se ICP urgente)" : "300 mg VO dose única";
            recomendacoes.push({
                farmaco: "Clopidogrel (Alternativa segura após contraindicação aos agentes potentes)",
                ataque: doseAtaqueClopi,
                manutencao: "75 mg VO 1x ao dia",
                indicacao: "Inibição de agregação plaquetária via metabólito ativo."
            });
        }

        // Alerta de interação com Omeprazol
        if (p2y12Escolhido === "Clopidogrel" && usoOmeprazol) {
            alertas.push("⚠️ INTERAÇÃO GRAVE (CYP2C19): O Omeprazol inibe a enzima CYP2C19, reduzindo significativamente o nível sérico do metabólito ativo do Clopidogrel e aumentando o risco de trombose de stent. CONDUTA: Substituir imediatamente por Pantoprazol.");
        }

        return {
            p2y12Escolhido: p2y12Escolhido,
            recomendacoes: recomendacoes,
            bloqueios: bloqueios,
            alertas: alertas
        };
    }

    /**
     * Avaliação de Medicação Adjuvante e Anti-isquêmica
     * @param {Object} dados
     */
    function avaliarMedicamentosAdjuvantes(dados) {
        dados = dados || {};
        var farmacos = [];
        var bloqueios = [];
        var alertas = [];

        var pas = Number(dados.pas) || 120;
        var fc = Number(dados.fc) || 80;
        var infartoVD = Boolean(dados.infartoVD || dados.paredeInferiorComV3RV4RAlterado || dados.iamVd);
        var usoIpde5 = Boolean(dados.usoSildenafilUltimas24h || dados.usoTadalafilUltimas48h || dados.usoIpde5);
        var choqueCardiogenico = Boolean(dados.choqueCardiogenico || pas < 90);
        var congestaoPulmonar = Boolean(dados.congestaoPulmonar || dados.killip >= 2 || dados.edemaAgudoPulmao);
        var bavAvancado = Boolean(dados.bav2grau || dados.bav3grau || dados.bloqueioAvAvancado || dados.intervaloPRMaior024);
        var broncoespasmoAtivo = Boolean(dados.broncoespasmoGrave || dados.asmaGraveDescompensada);
        var clearanceCr = Number(dados.clearanceCr) || 60;
        var peso = Number(dados.peso) || 70;

        // 1. Nitratos
        if (infartoVD) {
            bloqueios.push({
                farmaco: "Nitratos (Nitroglicerina / Isossorbida)",
                nivel: "BLOQUEIO_FATAL",
                motivo: "CONTRAINDICAÇÃO ABSOLUTA em Infarto de Ventrículo Direito (IAM-VD). Nitratos provocam venodilatação brusca, reduzem a pré-carga de VD e induzem choque cardiogênico hemodinamicamente devastador."
            });
        } else if (usoIpde5) {
            bloqueios.push({
                farmaco: "Nitratos (Nitroglicerina / Isossorbida)",
                nivel: "BLOQUEIO_FATAL",
                motivo: "CONTRAINDICAÇÃO ABSOLUTA devido ao uso recente de Inibidor de PDE-5 (Sildenafil nas últimas 24h ou Tadalafil nas últimas 48h). Risco de hipotensão severa refratária e colapso circulatório."
            });
        } else if (pas < 90) {
            bloqueios.push({
                farmaco: "Nitratos",
                nivel: "CONTRAINDICACAO_TEMPORARIA",
                motivo: "PAS < 90 mmHg. Aguardar estabilização pressórica antes de considerar vasodilatador venoso."
            });
        } else {
            farmacos.push({
                farmaco: "Dinitrato de Isossorbida 5 mg SL ou Nitroglicerina IV contínua",
                posologia: "Isossorbida 5 mg SL a cada 5 min (máx 3 doses) OU Nitroglicerina IV 5 a 10 mcg/min titulada",
                indicacao: "Alívio da dor isquêmica e controle da congestão pulmonar se PAS preservada."
            });
        }

        // 2. Betabloqueadores (Metoprolol)
        if (choqueCardiogenico || congestaoPulmonar || fc < 60 || pas < 100 || bavAvancado || broncoespasmoAtivo) {
            var motivosBb = [];
            if (choqueCardiogenico || pas < 100) motivosBb.push("Instabilidade hemodinâmica / Choque cardiogênico (PAS < 100 mmHg)");
            if (congestaoPulmonar) motivosBb.push("Insuficiência cardíaca descompensada / Congestão pulmonar (Killip >= II)");
            if (fc < 60) motivosBb.push("Bradicardia (FC < 60 bpm)");
            if (bavAvancado) motivosBb.push("Distúrbio de condução atrioventricular (BAV 2º/3º grau ou PR > 0.24s)");
            if (broncoespasmoAtivo) motivosBb.push("Broncoespasmo ativo / Asma descompensada");

            bloqueios.push({
                farmaco: "Betabloqueador (Tartarato de Metoprolol)",
                nivel: "CONTRAINDICACAO_FORMAL",
                motivo: motivosBb.join("; ")
            });
        } else {
            farmacos.push({
                farmaco: "Metoprolol (Tartarato)",
                posologia: "25 a 50 mg VO a cada 6 a 12 horas (iniciar oral nas primeiras 24h se paciente estável)",
                indicacao: "Redução do consumo miocárdico de oxigênio e prevenção de arritmias ventriculares."
            });
        }

        // 3. Estatina de Alta Intensidade
        farmacos.push({
            farmaco: "Atorvastatina 80 mg OU Rosuvastatina 40 mg VO dose única diária",
            posologia: "Atorvastatina 80 mg 1x ao dia à noite",
            indicacao: "Estatina de alta intensidade precoce com efeito pleiotrópico anti-inflamatório e estabilização endotelial de placa."
        });

        // 4. Anticoagulação Plena
        if (clearanceCr < 30) {
            farmacos.push({
                farmaco: "Enoxaparina (Ajuste Renal ClCr < 30 mL/min) OU Heparina Não Fracionada (HNF)",
                posologia: "Enoxaparina 1 mg/kg SC a cada 24 horas (ajuste obrigatório por falência renal) OU HNF com bolus 60 UI/kg (máx 4000 UI) + 12 UI/kg/h (máx 1000 UI/h) ajustada por TTPA",
                indicacao: "Anticoagulação plena obrigatória com bloqueio de sobredose renal."
            });
            alertas.push("AJUSTE RENAL: Clearance de creatinina < 30 mL/min exige ajuste de Enoxaparina para 1x ao dia (24/24h) ou migração para HNF com monitorização de TTPA.");
        } else {
            var doseEnoxa = (dados.idade >= 75 && dados.iamcsst) ? "0.75 mg/kg SC de 12/12h sem bolus IV (idade >= 75 anos)" : "1 mg/kg SC de 12/12h (com bolus IV de 30 mg se IAMCSST < 75 anos)";
            farmacos.push({
                farmaco: "Enoxaparina Sódica",
                posologia: doseEnoxa,
                indicacao: "Anticoagulação parenteral padrão para inibição do fator Xa e trombina."
            });
        }

        return {
            farmacosRecomendados: farmacos,
            bloqueios: bloqueios,
            alertas: alertas
        };
    }

    /**
     * Avaliação Completa do Paciente com Dor Torácica / SCA
     * @param {Object} params
     */
    function avaliarPaciente(params) {
        params = params || {};
        var heart = calcularHEART(params.heart || params);
        var timiScasst = calcularTIMISCASS(params.timi || params);
        var timiIamcsst = params.iamcsst ? calcularTIMIIAMCSST(params.timiIamcsst || params) : null;
        var dapt = avaliarDAPT(params.dapt || params);
        var adjuvantes = avaliarMedicamentosAdjuvantes(params.clinica || params);

        var alertasGerais = [];
        if (params.supraST || params.iamcsst) {
            alertasGerais.push("🚨 ALERTA VERMELHO - IAMCSST CONFIRMADO: Tempo porta-balão alvo < 90 min (se ICP primária) ou porta-agulha < 30 min (se trombólise química com Alteplase/Tenecteplase).");
        }

        return {
            heart: heart,
            timiScasst: timiScasst,
            timiIamcsst: timiIamcsst,
            dapt: dapt,
            adjuvantes: adjuvantes,
            alertasGerais: alertasGerais
        };
    }

    return {
        calcularHEART: calcularHEART,
        calcularTIMISCASS: calcularTIMISCASS,
        calcularTIMIIAMCSST: calcularTIMIIAMCSST,
        avaliarDAPT: avaliarDAPT,
        avaliarMedicamentosAdjuvantes: avaliarMedicamentosAdjuvantes,
        avaliarPaciente: avaliarPaciente
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CardiologiaEmergenciaService;
}

    