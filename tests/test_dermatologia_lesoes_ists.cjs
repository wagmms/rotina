const assert = require('assert');
const path = require('path');

// 1. Carrega o runtime completo do projeto para validar compilação e RPC
const { ctx, cockpitRpc } = require('../server/runtime');
const DermatoService = ctx.DermatologiaLesoesIstsService;

function runTests() {
    console.log("=== INICIANDO BATERIA DE TESTES: DERMATOLOGIA & INFECTOLOGIA (LESÕES ELEMENTARES & ISTs) ===");

    assert.ok(DermatoService, "DermatologiaLesoesIstsService deve estar disponível no contexto runtime.");

    // ─────────────────────────────────────────────────────────────────────────
    // PARTE 1: ALGORITMO DE DIFERENCIAÇÃO MORFOLÓGICA DE LESÕES ELEMENTARES
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[1] Testando Morfologia de Lesões Elementares e Red Flags...");

    // Teste 1.1: Púrpura / Petéquias com Febre (Meningococcemia / Sepse)
    let purpura = DermatoService.diferenciarLesaoElementar({
        morfologia: "petequias e purpura",
        digitopressao: "nao_some",
        febre: true,
        localizacao: "membros inferiores e tronco"
    });
    assert.strictEqual(purpura.morfologia_identificada, "Púrpura / Petéquias");
    assert.ok(purpura.red_flags.some(r => r.includes("MENINGOCOCCEMIA") && r.includes("Ceftriaxona")), "Deve emitir emergência médica para febre + púrpura que não some.");

    // Teste 1.2: Vesículas em Dermátomo (Herpes Zoster)
    let zosterDerm = DermatoService.diferenciarLesaoElementar({
        morfologia: "vesiculas agrupadas sobre base eritematosa",
        localizacao: "dermatomo toracico unilateral T4",
        sintomas: "dor intensa em queimacao"
    });
    assert.strictEqual(zosterDerm.morfologia_identificada, "Vesícula (< 1,0 cm)");
    assert.ok(zosterDerm.hipoteses_diagnosticas.some(h => h.includes("Herpes Zoster")), "Deve sugerir Herpes Zoster.");

    // Teste 1.3: Sinal de Hutchinson (Risco de Ceratite Oftálmica)
    let hutchinson = DermatoService.diferenciarLesaoElementar({
        morfologia: "vesiculas",
        localizacao: "ponta do nariz e dorso nasal",
        hutchinson: true
    });
    assert.ok(hutchinson.red_flags.some(r => r.includes("HUTCHINSON") && r.includes("CERATITE")), "Deve emitir red flag de Sinal de Hutchinson e urgência oftalmológica.");

    // Teste 1.4: Bolhas com Sinal de Nikolsky Positivo (SSJ / NET)
    let ssj = DermatoService.diferenciarLesaoElementar({
        morfologia: "bolhas flacidas e descolamento epidermico",
        nikolsky: true,
        mucosas: true,
        febre: true
    });
    assert.strictEqual(ssj.morfologia_identificada, "Bolha / Flictena (> 1,0 cm)");
    assert.ok(ssj.red_flags.some(r => r.includes("NIKOLSKY") && r.includes("SSJ / NET")), "Deve alertar para SSJ / NET com descolamento epidérmico.");

    // Teste 1.5: Pápulas Palmo-Plantares com Colarete de Biett (Sífilis Secundária)
    let biett = DermatoService.diferenciarLesaoElementar({
        morfologia: "papulas eritematosas descamativas",
        localizacao: "palmas das maos e plantas dos pes",
        texto: "lesoes com colarete descamativo de biett"
    });
    assert.strictEqual(biett.morfologia_identificada, "Pápula (< 1,0 cm)");
    assert.ok(biett.hipoteses_diagnosticas.some(h => h.includes("SÍFILIS SECUNDÁRIA")), "Deve diagnosticar Sífilis Secundária.");
    assert.ok(biett.red_flags.some(r => r.includes("Biett")), "Deve destacar o colarete de Biett.");

    // Teste 1.6: Crostas Melicéricas (Impetigo)
    let impetigo = DermatoService.diferenciarLesaoElementar({
        morfologia: "crostas melicericas amareladas cor de mel",
        localizacao: "face perioral em crianca"
    });
    assert.strictEqual(impetigo.morfologia_identificada, "Crosta");
    assert.ok(impetigo.hipoteses_diagnosticas.some(h => h.includes("Impetigo Crostoso")), "Deve identificar Impetigo crostoso.");

    // ─────────────────────────────────────────────────────────────────────────
    // PARTE 2: PROTOCOLO ANTIVIRAL PARA HERPES ZOSTER E SIMPLES COM AJUSTE RENAL
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[2] Testando Protocolo Posológico Antiviral e Ajustes por ClCr...");

    // Teste 2.1: Herpes Zoster com Função Renal Normal (ClCr 95 mL/min)
    let zosterNormal = DermatoService.calcularPosologiaAntiviralHerpes({
        tipo: "zoster",
        clcr: 95,
        peso: 70,
        idade: 62
    });
    assert.strictEqual(zosterNormal.ajuste_renal_aplicado, false);
    assert.ok(zosterNormal.aciclovir_oral.posologia.includes("800 mg VO, 5 vezes ao dia"), "Aciclovir deve ser 800mg 5x/dia.");
    assert.ok(zosterNormal.valaciclovir_oral.posologia.includes("1.000 mg") && zosterNormal.valaciclovir_oral.posologia.includes("a cada 8 horas"), "Valaciclovir deve ser 1.000mg 8/8h.");

    // Teste 2.2: Herpes Zoster com ClCr 38 mL/min (Ajuste para Valaciclovir)
    let zosterMod = DermatoService.calcularPosologiaAntiviralHerpes({
        tipo: "zoster",
        clcr: 38,
        peso: 70
    });
    assert.strictEqual(zosterMod.ajuste_renal_aplicado, true);
    assert.ok(zosterMod.valaciclovir_oral.posologia.includes("a cada 12 horas"), "Valaciclovir deve ser ajustado para 12/12h para ClCr 30-49.");
    assert.ok(zosterMod.aciclovir_oral.posologia.includes("5 vezes ao dia"), "Aciclovir oral mantém 5x/dia para ClCr > 25.");

    // Teste 2.3: Herpes Zoster com ClCr 18 mL/min (Ajuste para Aciclovir e Valaciclovir)
    let zosterGrave = DermatoService.calcularPosologiaAntiviralHerpes({
        tipo: "zoster",
        clcr: 18,
        peso: 65
    });
    assert.strictEqual(zosterGrave.ajuste_renal_aplicado, true);
    assert.ok(zosterGrave.aciclovir_oral.posologia.includes("a cada 8 horas (8/8h)"), "Aciclovir deve ser ajustado para 800mg 8/8h para ClCr 10-25.");
    assert.ok(zosterGrave.valaciclovir_oral.posologia.includes("a cada 24 horas"), "Valaciclovir deve ser ajustado para 1.000mg 24/24h para ClCr 10-29.");

    // Teste 2.4: Herpes Zoster com ClCr 8 mL/min (DRC Terminal)
    let zosterTerminal = DermatoService.calcularPosologiaAntiviralHerpes({
        tipo: "zoster",
        clcr: 8,
        peso: 60
    });
    assert.ok(zosterTerminal.aciclovir_oral.posologia.includes("a cada 12 horas (12/12h)"), "Aciclovir deve ser 800mg 12/12h para ClCr < 10.");
    assert.ok(zosterTerminal.valaciclovir_oral.posologia.includes("500 mg VO, a cada 24 horas"), "Valaciclovir deve ser reduzido para 500mg 24/24h para ClCr < 10.");

    // Teste 2.5: Herpes Zoster em Hemodiálise
    let zosterHd = DermatoService.calcularPosologiaAntiviralHerpes({
        tipo: "zoster",
        hemodialise: true,
        peso: 68
    });
    assert.ok(zosterHd.aciclovir_oral.posologia.includes("APÓS a hemodiálise"), "Deve conter instrução de dose pós-diálise para Aciclovir.");
    assert.ok(zosterHd.valaciclovir_oral.posologia.includes("após a hemodiálise"), "Deve orientar Valaciclovir após hemodiálise.");

    // Teste 2.6: Aciclovir Intravenoso para Caso Grave (80 kg)
    let zosterIv = DermatoService.calcularPosologiaAntiviralHerpes({
        tipo: "zoster",
        clcr: 80,
        peso: 80
    });
    assert.ok(zosterIv.aciclovir_intravenoso.posologia_calculada.includes("800 mg IV"), "Deve calcular 800 mg IV (10 mg/kg x 80 kg).");
    assert.ok(zosterIv.aciclovir_intravenoso.regra_infusao.includes("PELO MENOS 1 HORA"), "Deve exigir infusão lenta em 1 hora.");
    assert.ok(zosterIv.aciclovir_intravenoso.risco_nefropatia.includes("CRISTALÚRIA TUBULAR"), "Deve alertar contra cristalúria.");

    // Teste 2.7: Herpes Simples Primoinfecção Genital
    let hsvPrim = DermatoService.calcularPosologiaAntiviralHerpes({
        tipo: "simples_genital_primaria",
        clcr: 90
    });
    assert.ok(hsvPrim.aciclovir_oral.posologia.includes("400 mg VO a cada 8 horas") && hsvPrim.aciclovir_oral.posologia.includes("7 a 10 dias"), "Primoinfecção deve ser tratada por 7 a 10 dias.");

    // Teste 2.8: Herpes Simples Supressão Crônica
    let hsvSup = DermatoService.calcularPosologiaAntiviralHerpes({
        tipo: "simples_supressao",
        clcr: 90
    });
    assert.ok(hsvSup.aciclovir_oral.posologia.includes("400 mg VO de 12/12 horas contínuo"), "Supressão de Aciclovir deve ser 400mg 12/12h.");
    assert.ok(hsvSup.valaciclovir_oral.posologia.includes("500 mg VO 1 vez ao dia"), "Valaciclovir supressão deve ser 500mg 1x/dia.");

    // Teste 2.9: Gestante com Herpes Genital
    let hsvGest = DermatoService.calcularPosologiaAntiviralHerpes({
        tipo: "simples_genital",
        gestante: true
    });
    assert.ok(hsvGest.alertas_seguranca.some(a => a.includes("CESARIANA")), "Deve alertar para indicação de cesariana se lesões ativas no parto.");

    // ─────────────────────────────────────────────────────────────────────────
    // PARTE 3: ABORDAGEM SINDRÔMICA DE ÚLCERAS GENITAIS (MS PCDT 2024-2026)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[3] Testando Abordagem Sindrômica de Úlceras Genitais...");

    // Teste 3.1: Úlcera Herpética (Presença de Vesículas)
    let ulcHerpes = DermatoService.avaliarUlceraGenitalIst({
        vesiculas: true,
        tempo_dias: 3
    });
    assert.ok(ulcHerpes.classificacao_sindromica.includes("Herpética"), "Presença de vesículas direciona para Herpes.");
    assert.ok(ulcHerpes.tratamento_imediato.some(t => t.medicamento.includes("Aciclovir")), "Tratamento de 1ª linha deve conter Aciclovir.");

    // Teste 3.2: Úlcera Aguda < 4 semanas (Tratamento Duplo Sífilis + Cancro Mole)
    let ulcAguda = DermatoService.avaliarUlceraGenitalIst({
        vesiculas: false,
        tempo_semanas: 2,
        dor: "dolorosa"
    });
    assert.strictEqual(ulcAguda.classificacao_sindromica, "Úlcera Genital Aguda (< 4 semanas de evolução)");
    assert.ok(ulcAguda.tratamento_imediato.some(t => t.medicamento.includes("Penicilina G Benzatina 2.400.000 UI")), "Deve prescrever Penicilina Benzatina 2,4M UI.");
    assert.ok(ulcAguda.tratamento_imediato.some(t => t.medicamento.includes("Azitromicina 500 mg") && t.posologia.includes("1.000 mg")), "Deve prescrever Azitromicina 1g dose única.");

    // Teste 3.3: Gestante com Alergia à Penicilina e Úlcera Aguda (Bloqueio Doxiciclina)
    let ulcGestAlergica = DermatoService.avaliarUlceraGenitalIst({
        vesiculas: false,
        tempo_semanas: 2,
        gestante: true,
        alergia_penicilina: true
    });
    assert.ok(ulcGestAlergica.bloqueios_iatrogenia.some(b => b.includes("CONTRAINDICADA") && b.includes("DESSENSIBILIZAÇÃO")), "Deve bloquear Doxiciclina e exigir dessensibilização hospitalar.");

    // Teste 3.4: Úlcera Crônica >= 4 semanas (Donovanose, LGV e Biópsia)
    let ulcCronica = DermatoService.avaliarUlceraGenitalIst({
        vesiculas: false,
        tempo_semanas: 6,
        dor: "indolor"
    });
    assert.ok(ulcCronica.classificacao_sindromica.includes("Úlcera Genital Crônica"), "Deve classificar como crônica.");
    assert.ok(ulcCronica.tratamento_imediato.some(t => t.medicamento.includes("Azitromicina") && t.posologia.includes("pelo menos 3 semanas")), "Deve conter tratamento estendido para Donovanose.");
    assert.ok(ulcCronica.alertas_seguranca.some(a => a.includes("BIÓPSIA")), "Deve indicar biópsia para afastar Carcinoma Espinocelular.");

    // ─────────────────────────────────────────────────────────────────────────
    // PARTE 4: MANEJO DA SÍFILIS E REAÇÃO DE JARISCH-HERXHEIMER
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[4] Testando Manejo da Sífilis e Diretrizes Terapêuticas...");

    // Teste 4.1: Sífilis Primária / Secundária (Dose Única 2,4M UI)
    let sifSec = DermatoService.avaliarSifilisManejo({
        estagio: "secundaria",
        vdrl_titulo: "1:64"
    });
    assert.strictEqual(sifSec.dose_total_penicilina, "2.400.000 UI IM em dose única");
    assert.ok(sifSec.esquema_penicilina_benzatina.posologia.includes("1.200.000 UI por via intramuscular profunda em cada glúteo"), "Deve orientar aplicação de 1,2M UI em cada glúteo.");
    assert.ok(sifSec.alerta_jarisch_herxheimer.some(j => j.includes("JARISCH-HERXHEIMER")), "Deve alertar sobre Reação de Jarisch-Herxheimer.");

    // Teste 4.2: Sífilis Latente Tardia / Ignorada (3 Doses Semanais de 2,4M UI - Total 7,2M UI)
    let sifTardia = DermatoService.avaliarSifilisManejo({
        estagio: "latente_tardia"
    });
    assert.strictEqual(sifTardia.dose_total_penicilina, "7.200.000 UI IM no total (3 doses semanais de 2.400.000 UI)");
    assert.ok(sifTardia.esquema_penicilina_benzatina.posologia.includes("uma vez por semana, durante 3 semanas"), "Deve prescrever 3 semanas consecutivas.");

    // Teste 4.3: Alergia à Penicilina em Não-Gestante (Doxiciclina)
    let sifAlergica = DermatoService.avaliarSifilisManejo({
        estagio: "secundaria",
        alergia_penicilina: true,
        gestante: false
    });
    assert.ok(sifAlergica.conduta_alergia_penicilina.droga.includes("Doxiciclina 100 mg") && sifAlergica.conduta_alergia_penicilina.posologia.includes("15 dias"), "Deve prescrever Doxiciclina 12/12h por 15 dias para sífilis recente.");

    // Teste 4.4: Alergia à Penicilina em Gestante (Dessensibilização Obrigatória)
    let sifGestAlergica = DermatoService.avaliarSifilisManejo({
        estagio: "primaria",
        alergia_penicilina: true,
        gestante: true
    });
    assert.ok(sifGestAlergica.bloqueios_iatrogenia.some(b => b.includes("CONTRAINDICAÇÃO ABSOLUTA")), "Doxiciclina deve ser contraindicada na gravidez.");
    assert.ok(sifGestAlergica.conduta_alergia_penicilina.droga.includes("DESSENSIBILIZAÇÃO HOSPITALAR") || sifGestAlergica.conduta_alergia_penicilina.conduta.includes("dessensibilização"), "Deve exigir dessensibilização hospitalar.");

    // Teste 4.5: Neurossífilis (Penicilina Cristalina IV em Internação)
    let neuroSif = DermatoService.avaliarSifilisManejo({
        estagio: "neurossifilis"
    });
    assert.ok(neuroSif.esquema_penicilina_benzatina.medicamento.includes("Penicilina G Cristalina"), "Neurossífilis deve receber Penicilina Cristalina IV.");
    assert.ok(neuroSif.esquema_penicilina_benzatina.orientacao.includes("Punção lombar"), "Deve orientar punção lombar.");

    // ─────────────────────────────────────────────────────────────────────────
    // PARTE 5: MPOX (MONKEYPOX) E BIOSSEGURANÇA
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[5] Testando Manejo Clínico de Mpox...");

    let mpox = DermatoService.avaliarMpox({
        febre: true,
        linfonodomegalia: true,
        vesiculas_umbilicadas: true,
        proctite: true
    });
    assert.ok(mpox.probabilidade_clinica.includes("Muito Alta"), "Febre + linfadenomegalia + lesões umbilicadas = Muito Alta.");
    assert.ok(mpox.criterios_alta_isolamento.includes("QUEDA DE TODAS AS CROSTAS"), "Critério de fim do isolamento deve ser queda de todas as crostas.");
    assert.ok(mpox.paramentacao_profissionais.some(p => p.includes("PFF2 / N95")), "Profissional deve utilizar máscara PFF2/N95.");
    assert.ok(mpox.suporte_clinico_dor.some(s => s.includes("Proctite por Mpox")), "Deve incluir conduta analgésica para proctite.");

    // ─────────────────────────────────────────────────────────────────────────
    // PARTE 6: INTEGRAÇÃO RPC DO COCKPIT
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[6] Testando Integração Fastify RPC do Cockpit...");

    let rpcDerm = cockpitRpc('cockpitDermatologiaLesao', 'internal', { morfologia: "vesicula", localizacao: "torax" });
    assert.strictEqual(rpcDerm.sucesso, true);
    assert.ok(rpcDerm.textoFormatado.includes("DERMATOLOGIA: ANÁLISE DE LESÃO ELEMENTAR"));

    let rpcHerpes = cockpitRpc('cockpitDermatologiaHerpes', 'internal', { tipo: "zoster", clcr: 35 });
    assert.strictEqual(rpcHerpes.sucesso, true);
    assert.ok(rpcHerpes.textoFormatado.includes("PROTOCOLO ANTIVIRAL"));

    let rpcUlc = cockpitRpc('cockpitDermatologiaUlcerasGenitais', 'internal', { tempo_semanas: 2, dor: "dolorosa" });
    assert.strictEqual(rpcUlc.sucesso, true);
    assert.ok(rpcUlc.textoFormatado.includes("ABORDAGEM SINDRÔMICA DE ÚLCERAS GENITAIS"));

    let rpcSif = cockpitRpc('cockpitDermatologiaSifilis', 'internal', { estagio: "secundaria" });
    assert.strictEqual(rpcSif.sucesso, true);
    assert.ok(rpcSif.textoFormatado.includes("MANEJO DA SÍFILIS"));

    let rpcMpox = cockpitRpc('cockpitDermatologiaMpox', 'internal', { febre: true, linfonodomegalia: true });
    assert.strictEqual(rpcMpox.sucesso, true);
    assert.ok(rpcMpox.textoFormatado.includes("MPOX"));

    console.log("\n🎉 SUCESSO TOTAL: Todos os 26 testes de Dermatologia & ISTs passaram com 100% de aprovação!");
}

runTests();
