/**
 * @file 02_dermatologia_lesoes_ists.js
 * @description Módulo de Dermatologia e Infectologia: Diagnóstico e Manejo de Lesões Elementares,
 * ISTs Cutâneas (Herpes Simples, Herpes Zoster com ajuste por ClCr, Sífilis Secundária com colarete de Biett,
 * Mpox com critérios de isolamento) e Abordagem Sindrômica de Úlceras Genitais (Ministério da Saúde PCDT 2024-2026).
 */

var DermatologiaLesoesIstsService = (function() {
    'use strict';

    /**
     * 1. Algoritmo de Diferenciação Morfológica de Lesões Elementares da Pele
     * @param {Object} p Parâmetros morfológicos e clínicos
     * @returns {Object} Classificação elementar, hipóteses diagnósticas e red flags
     */
    function diferenciarLesaoElementar(p) {
        p = p || {};
        var textoEntrada = (String(p.texto || "") + " " + String(p.descricao || "") + " " + String(p.morfologia || "") + " " + String(p.localizacao || "") + " " + String(p.distribuicao || "") + " " + String(p.cor || "") + " " + String(p.sintomas || "")).toLowerCase().trim();
        var morfologia = String(p.morfologia || textoEntrada).toLowerCase().trim();
        var localizacao = String(p.localizacao || p.distribuicao || textoEntrada).toLowerCase().trim();
        var cor = String(p.cor || textoEntrada).toLowerCase().trim();
        var sintomas = String(p.sintomas || textoEntrada).toLowerCase().trim();

        var digitopressao = p.digitopressao !== undefined ? String(p.digitopressao).toLowerCase() : "";
        if (!digitopressao) {
            if (textoEntrada.indexOf("nao some") !== -1 || textoEntrada.indexOf("não some") !== -1 || textoEntrada.indexOf("nao desaparece") !== -1 || textoEntrada.indexOf("não desaparece") !== -1) {
                digitopressao = "nao_some";
            } else if (textoEntrada.indexOf("some") !== -1 || textoEntrada.indexOf("desaparece") !== -1) {
                digitopressao = "some";
            }
        }

        var hutchinson = !!(p.hutchinson || /(?:hutchinson|asa do nariz|ponta do nariz)/i.test(textoEntrada));
        var nikolsky = !!(p.nikolsky || /(?:nikolsky|descolamento epidermico|descolamento epidérmico)/i.test(textoEntrada));
        var mucosas = !!(p.mucosas || /(?:mucosa|oral|ocular|conjuntiv|labio|genital)/i.test(textoEntrada));
        var febre = !!(p.febre || /(?:febre|febril|tax)/i.test(textoEntrada));

        var res = {
            morfologia_identificada: "Indeterminada",
            categoria_elementar: "",
            definicao: "",
            hipoteses_diagnosticas: [],
            red_flags: [],
            conduta_beira_leito: [],
            alertas_seguranca: []
        };

        // Identificação morfológica
        var ehMacula = /m[aá]cula|mancha/i.test(morfologia);
        var ehPapula = /p[aá]pula/i.test(morfologia);
        var ehPlaca = /placa/i.test(morfologia);
        var ehNodulo = /n[oó]dulo|nodosidade/i.test(morfologia);
        var ehVesicula = /ves[ií]cula/i.test(morfologia);
        var ehBolha = /bolha|flictena/i.test(morfologia);
        var ehPustula = /p[uú]stula/i.test(morfologia);
        var ehCrosta = /crosta/i.test(morfologia);
        var ehUlcera = /[uú]lcera|ferida|perda de subst/i.test(morfologia);
        var ehErosao = /eros[aã]o|exulcera[cç]/i.test(morfologia);
        var ehPurpura = /p[uú]rpura|pet[eé]quia|equimose/i.test(morfologia);
        var ehUrtica = /[uú]rtica|verg[aã]o|edema fugaz/i.test(morfologia);

        if (ehPurpura || digitopressao === "nao_some") {
            res.morfologia_identificada = "Púrpura / Petéquias";
            res.categoria_elementar = "Alteração de Cor por Extravasamento Sanguíneo (Mancha Hemorrágica)";
            res.definicao = "Extravasamento hemorrágico dérmico que NÃO desaparece à digitopressão / vitropressão.";
            res.hipoteses_diagnosticas.push("Púrpura Trombocitopênica (Plaquetopenia severa)");
            res.hipoteses_diagnosticas.push("Vasculite Leucocitoclástica / IgA (Henoch-Schönlein)");
            res.hipoteses_diagnosticas.push("Meningococcemia / Sepse Grave com CIVD (Púrpura Fulminans)");
            res.hipoteses_diagnosticas.push("Endocardite Infecciosa (Lesões de Janeway / Manchas de Roth)");
            res.hipoteses_diagnosticas.push("Farmacodermia purpúrica");

            res.red_flags.push("🔴 ALERTA VERMELHO: Lesões purpúricas/petéquias que NÃO somem à digitopressão indicam extravasamento de hemácias.");
            if (febre) {
                res.red_flags.push("🚨 EMERGÊNCIA MÉDICA: Febre + Púrpura/Petéquias em rápida progressão impõe afastar MENINGOCOCCEMIA e Sepse com CIVD. Coletar hemoculturas e iniciar Ceftriaxona 2g IV imediatamente sem atraso!");
            }
            res.conduta_beira_leito.push("Solicitar Hemograma completo urgente com contagem de plaquetas, Coagulograma (TP/TTPa/Fibrinogênio/D-dímero) e função renal.");
        } else if (ehVesicula) {
            res.morfologia_identificada = "Vesícula (< 1,0 cm)";
            res.categoria_elementar = "Lesão de Conteúdo Líquido Claro";
            res.definicao = "Elevação circunscrita da pele com diâmetro menor que 1,0 cm contendo líquido claro/seroso.";

            var dermatomica = /(?:derm[aá]tomo|zoster|faixa|unilateral|tor[aá]cico)/i.test(localizacao);
            var genital = /(?:genital|penis|pênis|vulva|vagina|perineo|períneo)/i.test(localizacao);
            var labial = /(?:l[aá]bio|perioral|boca|face)/i.test(localizacao);
            var umbilicada = /(?:umbilicad|centro deprimido|mpox|monkeypox)/i.test(textoEntrada);

            if (dermatomica) {
                res.hipoteses_diagnosticas.push("Herpes Zoster (Reativação do VZV)");
            }
            if (genital) {
                res.hipoteses_diagnosticas.push("Herpes Simples Genital (HSV-2 / HSV-1)");
            }
            if (labial) {
                res.hipoteses_diagnosticas.push("Herpes Simples Labial (HSV-1)");
            }
            if (umbilicada) {
                res.hipoteses_diagnosticas.push("Mpox (Monkeypox - Orthopoxvirus) ou Molusco Contagioso");
            }
            res.hipoteses_diagnosticas.push("Varicela (Catapora - polimorfismo regional típico)");
            res.hipoteses_diagnosticas.push("Eczema Herpético (Erupção Variceliforme de Kaposi em dermatite atópica)");
            res.hipoteses_diagnosticas.push("Dermatite de Contato Aguda / Fitofotodermatose");

            if (hutchinson) {
                res.red_flags.push("👁️ SINAL DE HUTCHINSON POSITIVO: Vesículas na ponta ou asa do nariz indicam acometimento do ramo nasociliar do nervo oftálmico (V1). Risco iminente de CERATITE HERPÉTICA, uveíte e perda visual permanente!");
                res.red_flags.push("Mandatória AVALIAÇÃO OFTALMOLÓGICA URGENTE em lâmpada de fenda e início imediato de Antiviral sistêmico em dose plena.");
            }
            res.conduta_beira_leito.push("Evitar romper as vesículas; manter área limpa com soro fisiológico ou permanganato diluído 1:40.000.");
            res.conduta_beira_leito.push("Avaliar indicação precoce de Aciclovir ou Valaciclovir nas primeiras 72 horas para prevenir complicações e neuralgia pós-herpética.");
        } else if (ehBolha) {
            res.morfologia_identificada = "Bolha / Flictena (> 1,0 cm)";
            res.categoria_elementar = "Lesão de Conteúdo Líquido Amplo";
            res.definicao = "Elevação circunscrita contendo líquido seroso, turvo ou hemorrágico com diâmetro superior a 1,0 cm.";
            res.hipoteses_diagnosticas.push("Farmacodermia Severa: Síndrome de Stevens-Johnson (SSJ) / NET");
            res.hipoteses_diagnosticas.push("Queimadura térmica ou química de 2º grau");
            res.hipoteses_diagnosticas.push("Doença Bolhosa Autoimune: Penfigoide Bolhoso (subepidérmica, tensa) vs Pênfigo Vulgar (intraepidérmica, flácida)");
            res.hipoteses_diagnosticas.push("Erisipela Bolhosa / Fasciíte Necrosante");
            res.hipoteses_diagnosticas.push("Síndrome da Pele Escaldada Estafilocócica (SSSS)");

            if (nikolsky || (mucosas && febre)) {
                res.red_flags.push("🚨 SINAL DE NIKOLSKY POSITIVO / DESCOLAMENTO EPIDÉRMICO: Forte suspeita de SSJ / NET (Síndrome de Stevens-Johnson / Necrólise Epidérmica Tóxica).");
                res.red_flags.push("Suspender IMEDIATAMENTE todas as medicações suspeitas recentes (anticonvulsivantes, alopurinol, sulfas, AINEs).");
                res.red_flags.push("Indicação de internação em UTI ou Unidade de Queimados, hidratação volêmica cuidadosa e suporte dermatológico avançado.");
            }
        } else if (ehPustula) {
            res.morfologia_identificada = "Pústula (< 1,0 cm com conteúdo purulento)";
            res.categoria_elementar = "Lesão de Conteúdo Purulento Circunscrito";
            res.definicao = "Elevação circunscrita da epiderme preenchida por exsudato purulento estéril ou séptico.";
            res.hipoteses_diagnosticas.push("Foliculite bacteriana (Staphylococcus aureus)");
            res.hipoteses_diagnosticas.push("Acne vulgar inflamatória");
            res.hipoteses_diagnosticas.push("Rosácea pápulo-pustulosa");
            res.hipoteses_diagnosticas.push("Mpox na fase pustulosa umbilicada");
            res.hipoteses_diagnosticas.push("Psoríase Pustulosa generalizada (Von Zumbusch) ou Farmacodermia (PEGA - Pustulose Exantemática Generalizada Aguda)");
            res.conduta_beira_leito.push("Higiene local com sabonete antisséptico; avaliar antibioticoterapia tópica ou oral se celulite adjacente.");
        } else if (ehCrosta) {
            res.morfologia_identificada = "Crosta";
            res.categoria_elementar = "Lesão Elementar Secundária por Ressecamento";
            res.definicao = "Concreção amarelada, esverdeada ou hemorrágica resultante do ressecamento de serosidade, pus ou sangue.";
            if (textoEntrada.indexOf("melicerica") !== -1 || textoEntrada.indexOf("melicérica") !== -1 || textoEntrada.indexOf("amarela mel") !== -1) {
                res.hipoteses_diagnosticas.push("Impetigo Crostoso (Staphylococcus aureus e Streptococcus pyogenes) - Altamente contagioso");
            }
            res.hipoteses_diagnosticas.push("Fase de cicatrização de Herpes Zoster, Herpes Simples ou Varicela");
            res.hipoteses_diagnosticas.push("Mpox na fase de crosta (desprendimento das crostas marca o fim da transmissibilidade)");
            res.hipoteses_diagnosticas.push("Dermatite Seborreica crostosa");
            res.conduta_beira_leito.push("Remoção delicada com compressas úmidas mornas de soro fisiológico; não forçar arrancamento precoce.");
            if (textoEntrada.indexOf("melicerica") !== -1 || textoEntrada.indexOf("melicérica") !== -1) {
                res.conduta_beira_leito.push("Tratar Impetigo com Mupirocina tópica 2% 3x/dia por 5-7 dias (se localizado) ou Cefalexina 500mg VO 6/6h (se disseminado).");
            }
        } else if (ehUlcera || ehErosao) {
            res.morfologia_identificada = ehUlcera ? "Úlcera" : "Erosão / Exulceração";
            res.categoria_elementar = "Solução de Continuidade / Perda Tecidual";
            res.definicao = ehUlcera ? "Perda tecidual profunda (epiderme e derme/hipoderme), que cura com cicatriz." : "Perda superficial confinada à epiderme, curando sem deixar cicatriz.";
            if (/(?:genital|penis|pênis|vulva|vagina|glande|prepucio|virilha)/i.test(localizacao)) {
                res.hipoteses_diagnosticas.push("Úlcera Genital por IST: Sífilis primária, Cancro Mole, Herpes Genital, Donovanose, LGV");
                res.conduta_beira_leito.push("Aplicar Fluxograma de Abordagem Sindrômica de Úlceras Genitais do Ministério da Saúde.");
            } else {
                res.hipoteses_diagnosticas.push("Úlcera Venosa crônica de estase / Úlcera Arterial isquêmica");
                res.hipoteses_diagnosticas.push("Úlcera de Pressão (Lesão por Pressão / LPP)");
                res.hipoteses_diagnosticas.push("Leishmaniose Tegumentar Americana (úlcera indolor em moldura de quadro)");
                res.hipoteses_diagnosticas.push("Carcinoma Espinocelular / Basocelular ulcerado");
            }
        } else if (ehPapula || ehPlaca) {
            res.morfologia_identificada = ehPapula ? "Pápula (< 1,0 cm)" : "Placa (> 1,0 cm)";
            res.categoria_elementar = "Lesão Sólida Circunscrita";
            res.definicao = "Elevação sólida da pele decorrente de hiperplasia, infiltrado celular ou depósito dérmico.";

            var palmoplantar = /(?:palma|planta|palmoplantar|palmar|plantar)/i.test(localizacao);
            var colarete = /(?:biett|colarete|descamativo|descamacao perif)/i.test(textoEntrada);

            if (palmoplantar || colarete) {
                res.hipoteses_diagnosticas.push("SÍFILIS SECUNDÁRIA (Sifílides papulosas com colarete descamativo de Biett e acometimento palmo-plantar)");
                res.red_flags.push("🔍 Pápulas descamativas em palmas e plantas com colarete periférico (Colarete de Biett) são ALTAMENTE PATOGNOMÔNICAS de Sífilis Secundária. Mandatório solicitar Teste Rápido / VDRL!");
            }
            res.hipoteses_diagnosticas.push("Psoríase vulgar (placas eritemato-descamativas em cotovelos, joelhos e couro cabeludo)");
            res.hipoteses_diagnosticas.push("Líquen Plano (pápulas poligonais violáceas pruriginosas com estrias de Wickham)");
            res.hipoteses_diagnosticas.push("Molusco contagioso (pápulas cupuliformes umbilicadas)");
            res.hipoteses_diagnosticas.push("Verruga vulgar / HPV");
            res.hipoteses_diagnosticas.push("Farmacodermia maculopapular");
        } else if (ehNodulo) {
            res.morfologia_identificada = "Nódulo / Nodosidade (> 1,0 a 3,0 cm)";
            res.categoria_elementar = "Lesão Sólida Profunda Palpável";
            res.definicao = "Infiltração ou neoformação sólida profunda na derme ou hipoderme, mais palpável que visível.";
            res.hipoteses_diagnosticas.push("Eritema Nodoso (nódulos subcutâneos eritematosos e dolorosos pré-tibiais)");
            res.hipoteses_diagnosticas.push("Cisto epidérmico inflamado / Lipoma");
            res.hipoteses_diagnosticas.push("Esporotricose gomosa / Micose profunda");
            res.hipoteses_diagnosticas.push("Metástase cutânea / Neoplasia mesenquimal");
        } else if (ehMacula) {
            res.morfologia_identificada = "Mácula / Mancha";
            res.categoria_elementar = "Modificação de Cor da Pele sem Relevo";
            res.definicao = "Alteração circunscrita na cor da pele sem espessamento, elevação ou depressão anatômica palpável.";

            if (cor.indexOf("vermelh") !== -1 || cor.indexOf("eritem") !== -1 || digitopressao === "some") {
                res.hipoteses_diagnosticas.push("Exantema Viral agudo (Sarampo, Rubéola, Dengue, Arboviroses)");
                res.hipoteses_diagnosticas.push("Roséola Sifilítica (Sífilis Secundária precoce em tronco)");
                res.hipoteses_diagnosticas.push("Farmacodermia exantemática leve");
            } else if (cor.indexOf("branc") !== -1 || cor.indexOf("hipo") !== -1 || cor.indexOf("acrom") !== -1) {
                res.hipoteses_diagnosticas.push("Pitiríase Versicolor (Malassezia furfur)");
                res.hipoteses_diagnosticas.push("Hanseníase indeterminada ou tuberculoide (pesquisar alteração de sensibilidade térmica/tátil/dolorosa)");
                res.hipoteses_diagnosticas.push("Vitiligo (acromia completa)");
                res.hipoteses_diagnosticas.push("Pitiríase Alba (atópica)");
            } else {
                res.hipoteses_diagnosticas.push("Melasma / Efélides / Manchas pós-inflamatórias");
            }
        } else {
            res.morfologia_identificada = "Avaliação Clínica Geral";
            res.categoria_elementar = "Não especificada estritamente";
            res.definicao = "Caracterize se a lesão é plana (mácula), sólida elevada (pápula/placa/nódulo), líquida (vesícula/bolha/pústula) ou solução de continuidade (úlcera/erosão).";
            res.hipoteses_diagnosticas.push("Dermatite / Eczema");
            res.hipoteses_diagnosticas.push("Infecção fúngica superficial (Tinea)");
            res.hipoteses_diagnosticas.push("Farmacodermia");
        }

        return res;
    }

    /**
     * 2. Cálculo Posológico de Antivirais para Herpes Simples e Zoster com Ajuste Estrito por ClCr
     * @param {Object} p Parâmetros clínicos, laboratoriais e de posologia
     * @returns {Object} Prescrição detalhada, posologia de Aciclovir e Valaciclovir ajustados por ClCr
     */
    function calcularPosologiaAntiviralHerpes(p) {
        p = p || {};
        var tipo = String(p.tipo || "zoster").toLowerCase().trim();
        var clcr = parseFloat(p.clcr);
        var peso = parseFloat(p.peso) || 70;
        var idade = parseInt(p.idade, 10);
        var hutchinson = !!(p.hutchinson || p.zoster_oftalmico);
        var imunossuprimido = !!(p.imunossuprimido || p.hiv || p.transplante || p.quimioterapia);
        var gestante = !!p.gestante;
        var dialise = !!(p.hemodialise || p.dialise || (clcr < 10 && p.dialitico));

        // Clamps sanitizadores
        if (isNaN(clcr) || clcr < 0) {
            clcr = 100; // Normal padrão quando não informado
        }
        if (peso < 10) peso = 10;
        if (peso > 200) peso = 200;

        var res = {
            patologia: "",
            droga_primeira_escolha: "Valaciclovir ou Aciclovir",
            aciclovir_oral: null,
            valaciclovir_oral: null,
            aciclovir_intravenoso: null,
            ajuste_renal_aplicado: false,
            faixa_clcr: "",
            duracao_tratamento: "7 dias",
            tempo_inicio_ideal: "Até 72 horas do início das vesículas (ou a qualquer momento se novas lesões ativas, idosos ou imunossuprimidos)",
            alertas_seguranca: [],
            bloqueios_iatrogenia: [],
            manejo_dor_e_adjuvantes: []
        };

        // Identificação da faixa renal
        if (dialise) {
            res.faixa_clcr = "Hemodiálise / DRC Terminal";
            res.ajuste_renal_aplicado = true;
        } else if (clcr >= 50) {
            res.faixa_clcr = "Função Renal Normal ou Levemente Reduzida (ClCr >= 50 mL/min)";
        } else if (clcr >= 30) {
            res.faixa_clcr = "Disfunção Renal Moderada (ClCr 30 a 49 mL/min)";
            res.ajuste_renal_aplicado = true;
        } else if (clcr >= 10) {
            res.faixa_clcr = "Disfunção Renal Grave (ClCr 10 a 29 mL/min)";
            res.ajuste_renal_aplicado = true;
        } else {
            res.faixa_clcr = "Insuficiência Renal Terminal (ClCr < 10 mL/min)";
            res.ajuste_renal_aplicado = true;
        }

        // ─────────────────────────────────────────────────────────────────────
        // RAMIFICAÇÃO A: HERPES ZOSTER (VZV)
        // ─────────────────────────────────────────────────────────────────────
        if (tipo.indexOf("zoster") !== -1) {
            res.patologia = "Herpes Zoster (Reativação do Vírus Varicela-Zóster - VZV)";
            res.duracao_tratamento = "7 dias (estender para 10 a 14 dias se imunodeprimido ou resposta lenta)";

            // 1. Aciclovir Oral (Base: 800 mg 5x/dia)
            var aciclovirDose = "800 mg";
            var aciclovirFreq = "5 vezes ao dia (a cada 4 horas enquanto acordado: 06h, 10h, 14h, 18h, 22h)";
            if (dialise) {
                aciclovirFreq = "800 mg a cada 12 horas + dose suplementar de 800 mg imediatamente APÓS a hemodiálise";
            } else if (clcr < 10) {
                aciclovirFreq = "800 mg a cada 12 horas (12/12h)";
            } else if (clcr <= 25) {
                aciclovirFreq = "800 mg a cada 8 horas (8/8h)";
            }

            res.aciclovir_oral = {
                medicamento: "Aciclovir 800 mg comprimidos",
                posologia: aciclovirDose + " VO, " + aciclovirFreq + " por 7 dias.",
                ajuste_clcr: "Base 800mg 5x/d: ClCr >25 mL/min (5x/dia); ClCr 10-25 mL/min (8/8h); ClCr <10 mL/min (12/12h); Diálise (12/12h + pós-sessão)."
            };

            // 2. Valaciclovir Oral (Base: 1.000 mg 8/8h - padrão ouro em conveniência e absorção)
            var valaciclovirDose = "1.000 mg";
            var valaciclovirFreq = "a cada 8 horas (3 vezes ao dia)";
            if (dialise) {
                valaciclovirDose = "500 mg";
                valaciclovirFreq = "a cada 24 horas (tomar logo após a hemodiálise nos dias de sessão)";
            } else if (clcr < 10) {
                valaciclovirDose = "500 mg";
                valaciclovirFreq = "a cada 24 horas (1 vez ao dia)";
            } else if (clcr < 30) {
                valaciclovirDose = "1.000 mg";
                valaciclovirFreq = "a cada 24 horas (1 vez ao dia)";
            } else if (clcr < 50) {
                valaciclovirDose = "1.000 mg";
                valaciclovirFreq = "a cada 12 horas (2 vezes ao dia)";
            }

            res.valaciclovir_oral = {
                medicamento: "Valaciclovir 500 mg comprimidos",
                posologia: valaciclovirDose + " VO, " + valaciclovirFreq + " por 7 dias.",
                ajuste_clcr: "Base 1.000mg 8/8h: ClCr >=50 (8/8h); ClCr 30-49 (12/12h); ClCr 10-29 (24/24h); ClCr <10 ou diálise (500mg 24/24h)."
            };

            // 3. Aciclovir IV para casos graves / imunossuprimidos / zoster oftálmico extenso
            var doseMgKg = 10;
            var doseIvMg = Math.round(peso * doseMgKg);
            var freqIv = "a cada 8 horas (8/8h)";
            if (dialise) {
                freqIv = "2.5 a 5 mg/kg a cada 24h + dose de reforço pós-hemodiálise";
            } else if (clcr < 10) {
                freqIv = "5 mg/kg a cada 24 horas";
            } else if (clcr <= 25) {
                freqIv = "10 mg/kg a cada 24 horas";
            } else if (clcr <= 50) {
                freqIv = "10 mg/kg a cada 12 horas";
            }

            res.aciclovir_intravenoso = {
                medicamento: "Aciclovir 250 mg pó liofilizado para solução injetável",
                posologia_calculada: doseIvMg + " mg IV (calculado a 10 mg/kg para " + peso + " kg), " + freqIv + " por 7 a 10 dias.",
                regra_infusao: "INFUSÃO LENTA EM PELO MENOS 1 HORA. Concentração máxima de 5 mg/mL (diluir em SF 0,9% ou SG 5%). NUNCA FAZER EM BOLUS!",
                risco_nefropatia: "CRISTALÚRIA TUBULAR AGUDA: Manter hidratação venosa vigorosa (500 a 1000 mL de cristaloides) antes e durante a infusão para prevenir nefrotoxicidade."
            };

            // Alerta Oftálmico
            if (hutchinson) {
                res.alertas_seguranca.push("👁️ ZOSTER OFTÁLMICO / SINAL DE HUTCHINSON: Comprometimento do ramo nasociliar do trigêmeo (V1). Risco de ceratite neurotrófica, necrose retiniana e amaurose. Encaminhamento IMEDIATO ao Oftalmologista e preferência por Valaciclovir em dose plena ou Aciclovir IV se paciente idoso/grave.");
            }

            // Manejo de analgesia e prevenção da neuralgia pós-herpética
            res.manejo_dor_e_adjuvantes.push("Dor Aguda Leve: Dipirona 1g VO 6/6h ou Paracetamol 750mg 6/6h.");
            res.manejo_dor_e_adjuvantes.push("Dor Aguda Moderada/Severa: Associar Tramadol 50 mg VO 8/8h ou Codeína 30 mg 6/6h.");
            res.manejo_dor_e_adjuvantes.push("Prevenção da Neuralgia Pós-Herpética (NPH): Início precoce de Gabapentina 300 mg VO à noite (titulando até 900-1800 mg/dia) ou Pregabalina 75 mg VO 12/12h.");
            res.manejo_dor_e_adjuvantes.push("Cuidados Locais: Compressas com SF 0,9% gelado ou Permanganato de Potássio 1:40.000. Manter lesões secas. Proibido pomadas com corticoides.");

        // ─────────────────────────────────────────────────────────────────────
        // RAMIFICAÇÃO B: HERPES SIMPLES GENITAL / LABIAL (HSV-1 / HSV-2)
        // ─────────────────────────────────────────────────────────────────────
        } else {
            var ehPrimoinfeccao = tipo.indexOf("prim") !== -1 || tipo.indexOf("inicial") !== -1;
            var ehSupressao = tipo.indexOf("supres") !== -1 || tipo.indexOf("cron") !== -1;
            var ehLabial = tipo.indexOf("labial") !== -1;

            if (ehSupressao) {
                res.patologia = "Herpes Genital - Terapia Supressiva Crônica (indicada se >= 6 recidivas/ano)";
                res.duracao_tratamento = "Contínuo por 6 a 12 meses (reavaliar periodicamente a frequência de crises)";

                res.aciclovir_oral = {
                    medicamento: "Aciclovir 400 mg comprimidos",
                    posologia: (clcr < 10 ? "200 mg 1x/dia" : "400 mg VO de 12/12 horas contínuo."),
                    ajuste_clcr: "ClCr >= 10: 400 mg 12/12h; ClCr < 10 mL/min: 200 mg 1x/dia."
                };
                res.valaciclovir_oral = {
                    medicamento: "Valaciclovir 500 mg comprimidos",
                    posologia: (clcr < 10 ? "500 mg a cada 48 horas" : "500 mg VO 1 vez ao dia (ou 1.000 mg/dia se >= 10 surtos/ano)."),
                    ajuste_clcr: "ClCr >= 30: 500 mg/dia; ClCr 10-29: 500 mg a cada 48h; ClCr < 10: 500 mg a cada 48h."
                };
            } else if (ehPrimoinfeccao) {
                res.patologia = "Herpes Simples Genital - 1º Episódio / Primoinfecção (PCDT IST 2024-2026)";
                res.duracao_tratamento = "7 a 10 dias (iniciar o mais precoce possível)";

                var aciclovirFreqPr = "400 mg VO a cada 8 horas (3 vezes ao dia) por 7 a 10 dias";
                if (clcr < 10) aciclovirFreqPr = "200 mg VO a cada 12 horas por 7 a 10 dias";

                res.aciclovir_oral = {
                    medicamento: "Aciclovir 400 mg comprimidos (ou 200 mg)",
                    posologia: aciclovirFreqPr,
                    alternativa: "Aciclovir 200 mg VO 5 vezes ao dia (a cada 4h) por 7 a 10 dias."
                };
                res.valaciclovir_oral = {
                    medicamento: "Valaciclovir 500 mg comprimidos",
                    posologia: (clcr < 10 ? "500 mg VO 1 vez ao dia por 7 a 10 dias" : "1.000 mg (ou 500 mg) VO a cada 12 horas por 7 a 10 dias.")
                };
            } else if (ehLabial) {
                res.patologia = "Herpes Simples Labial Recorrente";
                res.duracao_tratamento = "1 a 5 dias";
                res.aciclovir_oral = {
                    medicamento: "Aciclovir 400 mg comprimidos",
                    posologia: "400 mg VO a cada 8 horas (3x/dia) por 5 dias."
                };
                res.valaciclovir_oral = {
                    medicamento: "Valaciclovir 500 mg comprimidos",
                    posologia: "2.000 mg (2g) VO de 12/12h por 1 único dia (iniciar nos pródromos)."
                };
            } else {
                // Recorrência Genital
                res.patologia = "Herpes Simples Genital - Episódio Recorrente";
                res.duracao_tratamento = "3 a 5 dias (iniciar no pródromo ou nas primeiras 24 horas)";

                res.aciclovir_oral = {
                    medicamento: "Aciclovir 400 mg comprimidos",
                    posologia: "400 mg VO a cada 8 horas por 5 dias (ou 800 mg VO 12/12h por 5 dias)."
                };
                res.valaciclovir_oral = {
                    medicamento: "Valaciclovir 500 mg comprimidos",
                    posologia: "500 mg VO a cada 12 horas por 3 dias (ou 1.000 mg VO 1x/dia por 5 dias)."
                };
            }

            if (gestante) {
                res.alertas_seguranca.push("🤰 GESTANTE COM HERPES GENITAL: O Aciclovir é considerado seguro na gestação (categoria B). Se lesões herpéticas ativas ou pródromos no momento do trabalho de parto, há indicação formal de CESARIANA para prevenção de infecção neonatal grave e encefalite herpética.");
            }
        }

        if (res.ajuste_renal_aplicado) {
            res.alertas_seguranca.push("⚠️ AJUSTE RENAL OBRIGATÓRIO: Clearance estimado em " + clcr.toFixed(0) + " mL/min (" + res.faixa_clcr + "). Dosagens de Aciclovir/Valaciclovir foram reduzidas para prevenir neurotoxicidade (alucinações, confusão mental, tremores, coma) e cristalúria renal.");
        }

        return res;
    }

    /**
     * 3. Abordagem Sindrômica de Úlceras Genitais (Ministério da Saúde PCDT IST 2024-2026)
     * @param {Object} p Parâmetros clínicos e laboratoriais da úlcera
     * @returns {Object} Diagnóstico sindrômico/etiológico, esquema terapêutico imediato e alertas
     */
    function avaliarUlceraGenitalIst(p) {
        p = p || {};
        var textoEntrada = (String(p.texto || "") + " " + String(p.descricao || "") + " " + String(p.dor || "") + " " + String(p.lesoes || "") + " " + String(p.linfonodo || "")).toLowerCase().trim();
        var vesiculas = !!(p.vesiculas || p.vesiculas_presentes || /(?:ves[ií]cula|pequenas bolhas|polic[ií]clica)/i.test(textoEntrada));
        var tempoSemanas = parseFloat(p.tempo_semanas);
        var tempoDias = parseFloat(p.tempo_dias);

        if (isNaN(tempoSemanas)) {
            if (!isNaN(tempoDias)) {
                tempoSemanas = tempoDias / 7;
            } else {
                var matchSem = textoEntrada.match(/(\d+)\s*semana/i);
                var matchDias = textoEntrada.match(/(\d+)\s*dia/i);
                var matchMes = textoEntrada.match(/(\d+)\s*m[eê]s/i);
                if (matchSem) tempoSemanas = parseFloat(matchSem[1]);
                else if (matchDias) tempoSemanas = parseFloat(matchDias[1]) / 7;
                else if (matchMes) tempoSemanas = parseFloat(matchMes[1]) * 4;
                else tempoSemanas = 1; // Padrão agudo se não informado
            }
        }

        var dor = String(p.dor || textoEntrada).toLowerCase();
        var ehIndolor = dor.indexOf("indolor") !== -1 || dor.indexOf("nao doe") !== -1 || dor.indexOf("não dói") !== -1;
        var ehDolorosa = dor.indexOf("dolor") !== -1 || dor.indexOf("muito dor") !== -1;
        var ehGestante = !!p.gestante;
        var alergiaPenicilina = !!(p.alergia_penicilina || /(?:alergia a penicilina|al[eé]rgico a penicilina|anafilaxia)/i.test(textoEntrada));

        var res = {
            classificacao_sindromica: "",
            tempo_evolucao_semanas: tempoSemanas,
            fluxograma_ms: "",
            hipoteses_etiologicas: [],
            tratamento_imediato: [],
            testes_obrigatorios: [],
            conduta_parcerias: [],
            alertas_seguranca: [],
            bloqueios_iatrogenia: []
        };

        res.testes_obrigatorios.push("Realizar TESTE RÁPIDO para Sífilis e coletar VDRL quantitativo basal.");
        res.testes_obrigatorios.push("Realizar TESTE RÁPIDO para HIV, Hepatite B (HBsAg) e Hepatite C (Anti-HCV).");
        res.conduta_parcerias.push("Tratar todas as parcerias sexuais dos últimos 90 dias, mesmo assintomáticas.");
        res.conduta_parcerias.push("Recomendar abstinência sexual até resolução completa das lesões e término do tratamento.");
        res.conduta_parcerias.push("Notificação compulsória no SINAN.");

        // 1. RAMO HERPÉTICO: Presença de Vesículas Agrupadas
        if (vesiculas) {
            res.classificacao_sindromica = "Úlcera Genital de Provável Etiologia Herpética (HSV-2 / HSV-1)";
            res.fluxograma_ms = "Presença de vesículas agrupadas sobre base eritematosa -> Tratar Herpes Genital";
            res.hipoteses_etiologicas.push("Herpes Simples Genital (Vírus Herpes Simplex tipo 2 ou tipo 1)");

            res.tratamento_imediato.push({
                medicamento: "Aciclovir 400 mg comprimidos",
                posologia: "400 mg VO a cada 8 horas (3x/dia) por 7 dias (ou 200 mg 5x/dia por 7 dias).",
                linha: "1ª Linha (REMUME / SUS)"
            });
            res.tratamento_imediato.push({
                medicamento: "Valaciclovir 500 mg comprimidos (ou 1000 mg)",
                posologia: "1.000 mg (ou 500 mg) VO a cada 12 horas por 7 dias.",
                linha: "Alternativa de maior comodidade posológica"
            });
            res.alertas_seguranca.push("Oriente higiene local com água e sabão ou soro fisiológico. Não utilizar pomadas com corticoides.");
            return res;
        }

        // 2. RAMO SEM VESÍCULAS: Estratificação por Tempo de Evolução (< 4 semanas vs >= 4 semanas)
        if (tempoSemanas < 4) {
            res.classificacao_sindromica = "Úlcera Genital Aguda (< 4 semanas de evolução)";
            res.fluxograma_ms = "Lesão sem vesículas com menos de 4 semanas de evolução -> TRATAR SÍFILIS PRIMÁRIA + CANCRO MOLE CONJUNTAMENTE";
            res.hipoteses_etiologicas.push("Sífilis Primária (Cancro Duro - Treponema pallidum)");
            res.hipoteses_etiologicas.push("Cancro Mole (Haemophilus ducreyi - múltiplas úlceras dolorosas com fundo purulento e bubão)");
            res.hipoteses_etiologicas.push("Herpes genital ulcerado em fase tardia pós-vesicular");

            // A. Tratamento para Sífilis
            if (alergiaPenicilina) {
                if (ehGestante) {
                    res.bloqueios_iatrogenia.push("🛑 BLOQUEIO CRÍTICO: GESTANTE COM ALERGIA À PENICILINA. A Doxiciclina é TERMINANTEMENTE CONTRAINDICADA na gravidez (risco de anomalias esqueléticas e manchas dentárias fetais). Encaminhar IMEDIATAMENTE para DESSENSIBILIZAÇÃO HOSPITALAR à Penicilina. A Penicilina é o ÚNICO antimicrobiano capaz de tratar o feto e prevenir a Sífilis Congênita!");
                } else {
                    res.tratamento_imediato.push({
                        medicamento: "Doxiciclina 100 mg comprimidos",
                        posologia: "100 mg VO a cada 12 horas por 15 dias.",
                        indicacao: "Tratamento de Sífilis recente em ALÉRGICOS NÃO-GESTANTES à Penicilina"
                    });
                }
            } else {
                res.tratamento_imediato.push({
                    medicamento: "Penicilina G Benzatina 2.400.000 UI injetável",
                    posologia: "2.400.000 UI IM em dose única (aplicar 1.200.000 UI profunda em cada glúteo).",
                    indicacao: "Tratamento de Sífilis Primária (Cancro Duro)",
                    linha: "1ª Linha Absoluta (PCDT MS)"
                });
            }

            // B. Tratamento para Cancro Mole
            res.tratamento_imediato.push({
                medicamento: "Azitromicina 500 mg comprimidos",
                posologia: "1.000 mg (2 comprimidos de 500 mg) VO em dose única.",
                indicacao: "Tratamento de Cancro Mole (Haemophilus ducreyi)",
                linha: "1ª Linha (PCDT MS)"
            });
            res.tratamento_imediato.push({
                medicamento: "Ceftriaxona 500 mg injetável (Alternativa ao Cancro Mole)",
                posologia: "500 mg IM em dose única.",
                indicacao: "Alternativa parenteral para Cancro Mole",
                linha: "Alternativa"
            });

            res.alertas_seguranca.push("Se teste rápido para sífilis for reagente: confirma o diagnóstico e mantém o seguimento sorológico (VDRL trimestral).");
            res.alertas_seguranca.push("Se teste rápido for não reagente: MANTER O TRATAMENTO (janela imunológica do cancro duro) e repetir o teste após 30 dias.");
            res.alertas_seguranca.push("Reavaliar em 7 dias: se não houver cicatrização ou melhora franca, investigar patógenos resistentes, Linfogranuloma Venéreo ou Donovanose.");

        } else {
            // >= 4 semanas de evolução (Úlcera Crônica)
            res.classificacao_sindromica = "Úlcera Genital Crônica (>= 4 semanas de evolução)";
            res.fluxograma_ms = "Lesão persistente >= 4 semanas -> Tratar Sífilis + Cancro Mole + INVESTIGAR/TRATAR DONOVANOSE E LINFOGRANULOMA VENÉREO (LGV) + BIÓPSIA SE SUSPEITA DE NEOPLASIA";
            res.hipoteses_etiologicas.push("Donovanose (Klebsiella granulomatis - úlcera vegetante, granulosa, indolor, vermelho-viva, que sangra fácil e pseudobubão)");
            res.hipoteses_etiologicas.push("Linfogranuloma Venéreo (Chlamydia trachomatis L1-L3 - bubão inguinal volumoso unilateral com fistulização em 'bico de regador')");
            res.hipoteses_etiologicas.push("Sífilis Primária ou Terciária ulcerada");
            res.hipoteses_etiologicas.push("Carcinoma Espinocelular (CEC de pênis ou vulva) - Mandatória biópsia se bordas evertidas/induradas");

            // Cobertura ampla
            if (!alergiaPenicilina) {
                res.tratamento_imediato.push({
                    medicamento: "Penicilina G Benzatina 2.400.000 UI IM",
                    posologia: "2.400.000 UI IM dose única (1,2M UI cada glúteo).",
                    indicacao: "Cobertura de Sífilis"
                });
            }

            res.tratamento_imediato.push({
                medicamento: "Azitromicina 500 mg comprimidos (Tratamento para Donovanose)",
                posologia: "1.000 mg (1g) VO no 1º dia, seguido de 500 mg VO 1x/dia (ou 1g VO 1x/semana) por pelo menos 3 semanas OU até a cicatrização completa das lesões.",
                indicacao: "Donovanose (Klebsiella granulomatis)"
            });

            if (!ehGestante) {
                res.tratamento_imediato.push({
                    medicamento: "Doxiciclina 100 mg comprimidos (Tratamento para Linfogranuloma Venéreo - LGV)",
                    posologia: "100 mg VO a cada 12 horas por 21 dias.",
                    indicacao: "Linfogranuloma Venéreo (Chlamydia trachomatis L1-L3)"
                });
            }

            res.alertas_seguranca.push("⚠️ BIÓPSIA DE BORDA DE LESÃO: Se a úlcera não apresentar regressão após tratamento adequado ou se houver bordas endurecidas/evertidas e base friável, realizar biópsia incisional da borda para descartar Carcinoma Espinocelular (Neoplasia Maligna).");
        }

        return res;
    }

    /**
     * 4. Manejo e Estadiamento da Sífilis (Primária, Secundária, Latente e Terciária)
     * @param {Object} p Parâmetros clínicos, estadiamento e titulação sorológica
     * @returns {Object} Diagnóstico estadiado, dose precisa de Penicilina Benzatina, manejo de alergia e reação de Jarisch-Herxheimer
     */
    function avaliarSifilisManejo(p) {
        p = p || {};
        var textoEntrada = (String(p.texto || "") + " " + String(p.descricao || "") + " " + String(p.estagio || "") + " " + String(p.achados_clinicos || "") + " " + String(p.vdrl || "") + " " + String(p.vdrl_titulo || "")).toLowerCase().trim();
        var estagio = String(p.estagio || "").toLowerCase();
        var vdrl = String(p.vdrl || p.vdrl_titulo || textoEntrada).toLowerCase();
        var gestante = !!p.gestante;
        var alergiaPenicilina = !!(p.alergia_penicilina || /(?:alergia a penicilina|anafilaxia)/i.test(textoEntrada));

        // Detecção de manifestações de Sífilis Secundária
        var temBiett = /(?:biett|colarete|descamativo|palmoplantar|palmas e plantas)/i.test(textoEntrada);
        var temRoseola = /(?:roseola|roséola|exantema macular|tronco)/i.test(textoEntrada);
        var temCondilomaPlano = /(?:condiloma lata|condiloma plano|placa mucosa)/i.test(textoEntrada);
        var temAlopecia = /(?:alopecia|clareira|ro[ií]do de tra[cç]a)/i.test(textoEntrada);

        if (!estagio) {
            if (temBiett || temRoseola || temCondilomaPlano || temAlopecia || textoEntrada.indexOf("secundaria") !== -1 || textoEntrada.indexOf("secundária") !== -1) {
                estagio = "secundaria";
            } else if (textoEntrada.indexOf("primaria") !== -1 || textoEntrada.indexOf("primária") !== -1 || textoEntrada.indexOf("cancro duro") !== -1) {
                estagio = "primaria";
            } else if (textoEntrada.indexOf("tardia") !== -1 || textoEntrada.indexOf("indeterminada") !== -1 || textoEntrada.indexOf("latente tardia") !== -1) {
                estagio = "latente_tardia";
            } else if (textoEntrada.indexOf("recente") !== -1 || textoEntrada.indexOf("latente recente") !== -1) {
                estagio = "latente_recente";
            } else if (textoEntrada.indexOf("terciaria") !== -1 || textoEntrada.indexOf("terciária") !== -1) {
                estagio = "terciaria";
            } else if (textoEntrada.indexOf("neuro") !== -1) {
                estagio = "neurossifilis";
            } else {
                estagio = "latente_tardia"; // Por precaução do Ministério da Saúde: tempo ignorado = tratar como tardia
            }
        }

        var res = {
            estagio_clinico: "",
            classificacao_temporal: "",
            esquema_penicilina_benzatina: null,
            dose_total_penicilina: "",
            intervalo_doses: "",
            conduta_alergia_penicilina: null,
            alerta_jarisch_herxheimer: [],
            criterios_cura_seguimento: [],
            alertas_gestante: [],
            bloqueios_iatrogenia: []
        };

        if (estagio === "primaria") {
            res.estagio_clinico = "Sífilis Primária (Cancro Duro - Úlcera única, indolor, bordas cartilagíneas)";
            res.classificacao_temporal = "Sífilis Recente (< 1 ano de infecção)";
        } else if (estagio === "secundaria") {
            res.estagio_clinico = "Sífilis Secundária (Disseminação treponêmica: Roséola, Sifílides papulosas com colarete de Biett, acometimento palmo-plantar, condiloma plano e alopecia em clareira)";
            res.classificacao_temporal = "Sífilis Recente (< 1 ano de infecção)";
        } else if (estagio === "latente_recente") {
            res.estagio_clinico = "Sífilis Latente Recente (Assintomática, com infecção comprovada há menos de 1 ano)";
            res.classificacao_temporal = "Sífilis Recente (< 1 ano de infecção)";
        } else if (estagio === "neurossifilis") {
            res.estagio_clinico = "Neurossífilis / Sífilis Ocular / Otossífilis (Acometimento de SNC/ocular/auditivo)";
            res.classificacao_temporal = "Independente do tempo de evolução - Emergência Infectológica";
        } else if (estagio === "terciaria") {
            res.estagio_clinico = "Sífilis Terciária (Gomas sifilíticas, aneurisma de aorta ascendente, tabes dorsalis)";
            res.classificacao_temporal = "Sífilis Tardia (> 1 ano de evolução)";
        } else {
            res.estagio_clinico = "Sífilis Latente Tardia ou de Duração Ignorada (Assintomática, sem documentação temporal nos últimos 12 meses)";
            res.classificacao_temporal = "Sífilis Tardia (ou duração indeterminada - PCDT MS orienta tratar como tardia)";
        }

        // ESQUEMAS POSOLÓGICOS (PCDT Ministério da Saúde 2024-2026)
        if (estagio === "neurossifilis") {
            res.dose_total_penicilina = "18 a 24 milhões UI/dia por 10 a 14 dias";
            res.esquema_penicilina_benzatina = {
                medicamento: "Penicilina G Cristalina / Potássica IV (Internação Hospitalar Obrigatória)",
                posologia: "3 a 4 milhões UI IV a cada 4 horas (ou infusão contínua de 18-24M UI/dia) por 10 a 14 dias.",
                orientacao: "Punção lombar para análise de LCR mandatória. A Penicilina Benzatina NÃO atinge níveis terapêuticos no SNC."
            };
        } else if (estagio === "primaria" || estagio === "secundaria" || estagio === "latente_recente") {
            // Sífilis Recente
            res.dose_total_penicilina = "2.400.000 UI IM em dose única";
            res.intervalo_doses = "Dose única";
            res.esquema_penicilina_benzatina = {
                medicamento: "Penicilina G Benzatina 1.200.000 UI frasco-ampola",
                posologia: "2.400.000 UI IM em dose única (aplicar 1.200.000 UI por via intramuscular profunda em cada glúteo no mesmo momento).",
                linha: "Padrão-Ouro Absoluto (PCDT MS)"
            };
        } else {
            // Sífilis Tardia ou Ignorada
            res.dose_total_penicilina = "7.200.000 UI IM no total (3 doses semanais de 2.400.000 UI)";
            res.intervalo_doses = "1 aplicação a cada 7 dias por 3 semanas consecutivas";
            res.esquema_penicilina_benzatina = {
                medicamento: "Penicilina G Benzatina 1.200.000 UI frasco-ampola",
                posologia: "2.400.000 UI IM (1.200.000 UI em cada glúteo) uma vez por semana, durante 3 semanas consecutivas.",
                alerta_intervalo: "O intervalo ideal é de 7 dias. Tolerância máxima de 9 dias entre as doses. Se o intervalo ultrapassar 14 dias em gestantes, o esquema deve ser REINICIADO DO ZERO!"
            };
        }

        // MANEJO DE ALERGIA À PENICILINA
        if (alergiaPenicilina) {
            if (gestante) {
                res.bloqueios_iatrogenia.push("🛑 CONTRAINDICAÇÃO ABSOLUTA: A Doxiciclina é contraindicada na gestação. Ceftriaxona ou Azitromicina NÃO são consideradas tratamento adequado para a prevenção da Sífilis Congênita segundo o Ministério da Saúde!");
                res.conduta_alergia_penicilina = {
                    droga: "DESSENSIBILIZAÇÃO HOSPITALAR À PENICILINA",
                    conduta: "Internar em leito com suporte de reanimação e realizar protocolo de dessensibilização oral/venosa à Penicilina. A Penicilina é a ÚNICA medicação capaz de atravessar a barreira placentária em concentrações treponemicidas e curar o feto."
                };
            } else {
                var duracaoDoxi = (estagio === "primaria" || estagio === "secundaria" || estagio === "latente_recente") ? "15 dias" : "30 dias";
                res.conduta_alergia_penicilina = {
                    droga: "Doxiciclina 100 mg comprimidos (Não-gestantes)",
                    posologia: "100 mg VO de 12/12 horas por " + duracaoDoxi + ".",
                    alternativa: "Ceftriaxona 1g IV ou IM 1x/dia por 10 a 14 dias."
                };
            }
        }

        // REAÇÃO DE JARISCH-HERXHEIMER
        res.alerta_jarisch_herxheimer.push("🔥 REAÇÃO DE JARISCH-HERXHEIMER (Alerta Educativo Beira-Leito):");
        res.alerta_jarisch_herxheimer.push("• Ocorre em até 50-70% dos casos de Sífilis Primária/Secundária nas primeiras 24 horas após a 1ª dose de Penicilina.");
        res.alerta_jarisch_herxheimer.push("• Fisiopatologia: Liberação massiva de endotoxinas e citocinas inflamatórias após a lise aguda de milhões de treponemas.");
        res.alerta_jarisch_herxheimer.push("• Sintomas: Febre súbita, calafrios, cefaleia, mialgia, sudorese e exacerbação temporária das lesões cutâneas.");
        res.alerta_jarisch_herxheimer.push("• CONDUTA: Autolimitada (dura 12 a 24 horas). NÃO É ALERGIA À PENICILINA! Não suspender o tratamento. Prescrever Dipirona 1g VO ou Paracetamol 750mg.");
        if (gestante) {
            res.alerta_jarisch_herxheimer.push("• Em gestantes, pode desencadear contrações uterinas transitórias ou sofrimento fetal agudo transitório; monitorar movimentos fetais.");
        }

        // SEGUIMENTO E CRITÉRIOS DE CURA
        res.criterios_cura_seguimento.push("Seguimento sorológico com teste não treponêmico (VDRL quantitativo) no mesmo laboratório / mesma metodologia.");
        res.criterios_cura_seguimento.push("Periodicidade: Trimestral até 12 meses na população geral; Mensal durante o pré-natal em gestantes.");
        res.criterios_cura_seguimento.push("Critério de Resposta Terapêutica Adequada (Cura): Queda do título em pelo menos 2 titulações (ou 4 vezes) em até 6 meses para sífilis recente e em até 12 meses para sífilis tardia (ex: queda de 1:32 para 1:8 ou menor).");
        res.criterios_cura_seguimento.push("Cicatriz Sorológica: Títulos baixos e estáveis (ex: 1:1, 1:2 ou 1:4) que persistem indefinidamente sem sintomas não caracterizam falha terapêutica nem reinfecção.");

        return res;
    }

    /**
     * 5. Avaliação e Manejo de Mpox (Monkeypox / Orthopoxvirus)
     * @param {Object} p Parâmetros clínicos, tempo de evolução e achados físicos
     * @returns {Object} Estratificação diagnóstica, medidas de isolamento respiratório/contato e suporte clínico
     */
    function avaliarMpox(p) {
        p = p || {};
        var textoEntrada = String(p.texto || p.descricao || "").toLowerCase();
        var febre = !!(p.febre || /(?:febre|febril|astenia|prostracao)/i.test(textoEntrada));
        var linfonodomegalia = !!(p.linfonodomegalia || /(?:linfonodo|adenomegalia|ganglio|inguinal|cervical|axilar)/i.test(textoEntrada));
        var lesoesUmbilicadas = !!(p.vesiculas_umbilicadas || /(?:umbilicad|centro deprimido|pustula|crosta)/i.test(textoEntrada));
        var anorretal = !!(p.proctite || /(?:proctite|retal|anus|[aâ]nus|dor ao evacuar|perianal)/i.test(textoEntrada));
        var imunodeprimido = !!(p.imunossuprimido || p.hiv || /(?:hiv|cd4|imunossup)/i.test(textoEntrada));

        var res = {
            diagnostico_suspeito: "Mpox (Monkeypox / Vírus Mpox - Orthopoxvirus)",
            probabilidade_clinica: "Moderada a Alta",
            caracteristica_chave: "Linfadenopatia proeminente e dolorosa + Erupção com vesículas/pústulas umbilicadas e sincrônicas",
            medidas_isolamento: [],
            paramentacao_profissionais: [],
            suporte_clinico_dor: [],
            criterios_alta_isolamento: "",
            notificacao_compulsoria: "NOTIFICAÇÃO COMPULSÓRIA IMEDIATA (em até 24 horas no SINAN / CIEVS)",
            red_flags: []
        };

        if (linfonodomegalia && lesoesUmbilicadas) {
            res.probabilidade_clinica = "Muito Alta (Tríade clássica: Febre + Linfadenomegalia marcada + Lesões umbilicadas sincrônicas)";
        }

        res.medidas_isolamento.push("Isolamento domiciliar estrito (ou em quarto individual privativo em unidade de saúde).");
        res.medidas_isolamento.push("Proibição de compartilhamento de roupas de cama, toalhas, lençóis, copos, pratos e talheres.");
        res.medidas_isolamento.push("O paciente deve usar máscara cirúrgica bem ajustada quando houver presença de outras pessoas no ambiente.");
        res.medidas_isolamento.push("Cobrir as lesões cutâneas com roupas compridas ou curativos estéreis para minimizar a transmissão por contato direto.");

        res.paramentacao_profissionais.push("Máscara de proteção respiratória tipo PFF2 / N95 para os profissionais de saúde.");
        res.paramentacao_profissionais.push("Avental / Capote de mangas longas e luvas de procedimento.");
        res.paramentacao_profissionais.push("Proteção ocular (óculos de proteção ou protetor facial tipo face shield).");

        res.criterios_alta_isolamento = "O isolamento deve ser mantido até a QUEDA DE TODAS AS CROSTAS com formação de nova camada de pele intacta por baixo (reepitelização completa). Geralmente dura entre 2 a 4 semanas.";

        res.suporte_clinico_dor.push("Manejo da Dor Geral: Dipirona 1g VO 6/6h + Paracetamol 750mg ou AINEs se função renal normal.");
        if (anorretal) {
            res.suporte_clinico_dor.push("Proctite por Mpox (Dor anorretal intensa): Banho de assento morno 3 a 4 vezes ao dia; Anestésico tópico (pomada de lidocaína 2% a 5%); Laxantes emolientes (Lactulose ou Macrogol) para evitar fezes endurecidas; Considerar Tramadol ou opioides se dor intratável.");
        }
        res.suporte_clinico_dor.push("Prevenção de infecção bacteriana secundária: Higienizar com água e sabão neutro. Se sinais de celulite perilesional (calor, rubor extenso, pus bacteriano), iniciar Cefalexina 500 mg VO 6/6h ou Amoxicilina-Clavulanato.");

        if (imunodeprimido) {
            res.red_flags.push("⚠️ PACIENTE IMUNODEPRIMIDO / HIV COM CD4 < 200: Risco elevado de Mpox grave fulminante (lesões confluentes necrosantes extensas, envolvimento pulmonar/sepse e óbito). Indicação de avaliação para antiviral específico (Tecovirimat) via protocolo do Ministério da Saúde.");
        }

        return res;
    }

    /**
     * 6. Formatadores de Mensagens para o Telegram
     */
    function formatarDermatologiaTelegram(r) {
        var t = "🔬 *DERMATOLOGIA: ANÁLISE DE LESÃO ELEMENTAR*\n";
        t += "───────────────────────────────\n";
        t += "📌 *Morfologia:* *" + r.morfologia_identificada + "*\n";
        t += "🏷️ *Categoria:* " + r.categoria_elementar + "\n";
        t += "📖 *Definição:* _" + r.definicao + "_\n\n";

        t += "💡 *Principais Hipóteses Diagnósticas:*\n";
        if (r.hipoteses_diagnosticas && r.hipoteses_diagnosticas.length > 0) {
            r.hipoteses_diagnosticas.forEach(function(h) { t += "  • " + h + "\n"; });
        }

        if (r.red_flags && r.red_flags.length > 0) {
            t += "\n🚨 *Alertas Críticos / Red Flags:*\n";
            r.red_flags.forEach(function(rf) { t += "  " + rf + "\n"; });
        }

        if (r.conduta_beira_leito && r.conduta_beira_leito.length > 0) {
            t += "\n🩺 *Conduta Beira-Leito:*\n";
            r.conduta_beira_leito.forEach(function(c) { t += "  • " + c + "\n"; });
        }

        return t.trim();
    }

    function formatarHerpesAntiviralTelegram(r) {
        var t = "🛡️ *PROTOCOLO ANTIVIRAL: HERPES ZOSTER & SIMPLES*\n";
        t += "───────────────────────────────\n";
        t += "📌 *Diagnóstico:* *" + r.patologia + "*\n";
        t += "⏱️ *Duração Recomendada:* *" + r.duracao_tratamento + "*\n";
        t += "🩸 *Status Renal:* " + r.faixa_clcr + (r.ajuste_renal_aplicado ? " ⚠️ *[DOSE AJUSTADA]*" : " ✅") + "\n\n";

        if (r.valaciclovir_oral) {
            t += "💊 *Valaciclovir Oral (1ª Linha Comodidade):*\n";
            t += "• " + r.valaciclovir_oral.posologia + "\n";
            t += "  _" + r.valaciclovir_oral.ajuste_clcr + "_\n\n";
        }

        if (r.aciclovir_oral) {
            t += "💊 *Aciclovir Oral (Padrão SUS / REMUME):*\n";
            t += "• " + r.aciclovir_oral.posologia + "\n";
            if (r.aciclovir_oral.ajuste_clcr) {
                t += "  _" + r.aciclovir_oral.ajuste_clcr + "_\n";
            }
            t += "\n";
        }

        if (r.aciclovir_intravenoso) {
            t += "💉 *Aciclovir Intravenoso (Casos Graves / Imunodeprimidos):*\n";
            t += "• " + r.aciclovir_intravenoso.posologia_calculada + "\n";
            t += "  ⚠️ " + r.aciclovir_intravenoso.regra_infusao + "\n";
            t += "  💧 " + r.aciclovir_intravenoso.risco_nefropatia + "\n\n";
        }

        if (r.manejo_dor_e_adjuvantes && r.manejo_dor_e_adjuvantes.length > 0) {
            t += "⚡ *Manejo da Dor & Prevenção de Neuralgia:*\n";
            r.manejo_dor_e_adjuvantes.forEach(function(m) { t += "  • " + m + "\n"; });
            t += "\n";
        }

        if (r.alertas_seguranca && r.alertas_seguranca.length > 0) {
            t += "📢 *Alertas de Segurança:*\n";
            r.alertas_seguranca.forEach(function(a) { t += "  " + a + "\n"; });
        }

        return t.trim();
    }

    function formatarUlcerasGenitaisTelegram(r) {
        var t = "🩹 *ABORDAGEM SINDRÔMICA DE ÚLCERAS GENITAIS (MS 2026)*\n";
        t += "───────────────────────────────\n";
        t += "📌 *Classificação:* *" + r.classificacao_sindromica + "*\n";
        t += "⏳ *Evolução:* " + r.tempo_evolucao_semanas.toFixed(1) + " semanas\n";
        t += "🎯 *Diretriz MS:* _" + r.fluxograma_ms + "_\n\n";

        t += "🔬 *Hipóteses Etiológicas Cobertas:*\n";
        r.hipoteses_etiologicas.forEach(function(h) { t += "  • " + h + "\n"; });
        t += "\n";

        t += "💊 *Prescrição Imediata Beira-Leito:*\n";
        r.tratamento_imediato.forEach(function(ti) {
            t += "• *" + ti.medicamento + "*\n";
            t += "  Posologia: " + ti.posologia + "\n";
            if (ti.indicacao) t += "  Indicação: _" + ti.indicacao + "_\n";
        });
        t += "\n";

        if (r.bloqueios_iatrogenia && r.bloqueios_iatrogenia.length > 0) {
            t += "🛑 *Bloqueios Críticos:*\n";
            r.bloqueios_iatrogenia.forEach(function(b) { t += "  " + b + "\n"; });
            t += "\n";
        }

        t += "🧪 *Condutas e Testagem Obrigatórias:*\n";
        r.testes_obrigatorios.forEach(function(to) { t += "  • " + to + "\n"; });
        r.conduta_parcerias.forEach(function(cp) { t += "  • " + cp + "\n"; });

        return t.trim();
    }

    function formatarSifilisTelegram(r) {
        var t = "🩸 *MANEJO DA SÍFILIS & CONDUTA CLÍNICA (PCDT MS)*\n";
        t += "───────────────────────────────\n";
        t += "📌 *Estágio:* *" + r.estagio_clinico + "*\n";
        t += "⏱️ *Classificação:* " + r.classificacao_temporal + "\n";
        t += "💉 *Dose Total Acumulada:* *" + r.dose_total_penicilina + "*\n\n";

        if (r.esquema_penicilina_benzatina) {
            t += "🏛️ *Esquema Oficial (Penicilina G Benzatina):*\n";
            t += "• *" + r.esquema_penicilina_benzatina.medicamento + "*\n";
            t += "  " + r.esquema_penicilina_benzatina.posologia + "\n";
            if (r.esquema_penicilina_benzatina.alerta_intervalo) {
                t += "  ⚠️ _" + r.esquema_penicilina_benzatina.alerta_intervalo + "_\n";
            }
            t += "\n";
        }

        if (r.conduta_alergia_penicilina) {
            t += "⚠️ *Manejo em Alérgicos à Penicilina:*\n";
            t += "• *" + r.conduta_alergia_penicilina.droga + "*\n";
            t += "  " + (r.conduta_alergia_penicilina.posologia || r.conduta_alergia_penicilina.conduta) + "\n\n";
        }

        if (r.alerta_jarisch_herxheimer && r.alerta_jarisch_herxheimer.length > 0) {
            t += r.alerta_jarisch_herxheimer.join("\n") + "\n\n";
        }

        t += "📈 *Critérios de Cura e Seguimento:* \n";
        r.criterios_cura_seguimento.forEach(function(cs) { t += "  • " + cs + "\n"; });

        return t.trim();
    }

    function formatarMpoxTelegram(r) {
        var t = "🐵 *MANEJO CLÍNICO E BIOSSEGURANÇA: MPOX*\n";
        t += "───────────────────────────────\n";
        t += "📌 *Hipótese:* *" + r.diagnostico_suspeito + "*\n";
        t += "📊 *Probabilidade:* " + r.probabilidade_clinica + "\n";
        t += "🔍 *Apresentação:* " + r.caracteristica_chave + "\n\n";

        t += "🛡️ *Medidas de Isolamento Obrigatórias:*\n";
        r.medidas_isolamento.forEach(function(mi) { t += "  • " + mi + "\n"; });
        t += "\n";

        t += "🥽 *Paramentação do Profissional (EPI):*\n";
        r.paramentacao_profissionais.forEach(function(pp) { t += "  • " + pp + "\n"; });
        t += "\n";

        t += "⏳ *Critério de Alta do Isolamento:*\n";
        t += "• *" + r.criterios_alta_isolamento + "*\n\n";

        t += "💊 *Controle de Sintomas & Proctite:*\n";
        r.suporte_clinico_dor.forEach(function(sc) { t += "  • " + sc + "\n"; });
        t += "\n";

        t += "📢 *" + r.notificacao_compulsoria + "*\n";

        if (r.red_flags && r.red_flags.length > 0) {
            t += "\n🚨 *Alertas Especiais:*\n";
            r.red_flags.forEach(function(rf) { t += "  " + rf + "\n"; });
        }

        return t.trim();
    }

    return {
        diferenciarLesaoElementar: diferenciarLesaoElementar,
        calcularPosologiaAntiviralHerpes: calcularPosologiaAntiviralHerpes,
        avaliarUlceraGenitalIst: avaliarUlceraGenitalIst,
        avaliarSifilisManejo: avaliarSifilisManejo,
        avaliarMpox: avaliarMpox,
        formatarDermatologiaTelegram: formatarDermatologiaTelegram,
        formatarHerpesAntiviralTelegram: formatarHerpesAntiviralTelegram,
        formatarUlcerasGenitaisTelegram: formatarUlcerasGenitaisTelegram,
        formatarSifilisTelegram: formatarSifilisTelegram,
        formatarMpoxTelegram: formatarMpoxTelegram
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DermatologiaLesoesIstsService;
}
