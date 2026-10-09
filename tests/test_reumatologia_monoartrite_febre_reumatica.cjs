const assert = require('assert');
const path = require('path');

// 1. Carrega o runtime completo do projeto para validar compilação e RPC
const { ctx, cockpitRpc } = require('../server/runtime');
const ReumatologiaService = ctx.ReumatologiaMonoartriteFebreReumaticaService;

function runTests() {
    console.log("=== INICIANDO BATERIA DE TESTES: REUMATOLOGIA & URGÊNCIA (MONOARTRITE & FEBRE REUMÁTICA) ===");

    assert.ok(ReumatologiaService, "ReumatologiaMonoartriteFebreReumaticaService deve estar disponível no contexto runtime.");

    // ─────────────────────────────────────────────────────────────────────────
    // PARTE 1: DIAGNÓSTICO DIFERENCIAL DE MONOARTRITE E LÍQUIDO SINOVIAL
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[1] Testando Análise do Líquido Sinovial e Monoartrite Aguda...");

    // Teste 1.1: Artrite Séptica Típica
    let septica = ReumatologiaService.analisarMonoartrite({
        leucocitos: 85000,
        neutrofilos_pct: 92,
        aspecto: "purulento",
        gram: "cocos gram positivos em pares e cadeias",
        febre: true,
        articulacao: "joelho"
    });
    assert.strictEqual(septica.artrite_septica_provavel, true, "Deve classificar como artrite séptica provável.");
    assert.strictEqual(septica.categoria_efusao, "Séptica");
    assert.ok(septica.conduta_artrocentese_drenagem.some(c => c.includes("EMERGÊNCIA MÉDICA")), "Deve emitir conduta de emergência médica.");
    assert.ok(septica.antimicrobianos_empiricos.some(a => a.esquema.includes("Oxacilina")), "Deve sugerir Oxacilina para adulto padrão.");

    // Teste 1.2: Adulto Jovem Sexualmente Ativo (Artrite Gonocócica)
    let gono = ReumatologiaService.analisarMonoartrite({
        leucocitos: 60000,
        neutrofilos_pct: 88,
        aspecto: "turvo opalescente",
        gram: "diplococos gram negativos intracelulares",
        idade: 23,
        sexualmente_ativo: true,
        articulacao: "punho"
    });
    assert.strictEqual(gono.artrite_septica_provavel, true);
    assert.ok(gono.antimicrobianos_empiricos.some(a => a.esquema.includes("Ceftriaxona") && a.esquema.includes("Azitromicina")), "Deve prescrever Ceftriaxona + Azitromicina para suspeita gonocócica.");

    // Teste 1.3: Paciente com Fatores de Risco para MRSA
    let mrsa = ReumatologiaService.analisarMonoartrite({
        leucocitos: 95000,
        neutrofilos_pct: 94,
        aspecto: "purulento leitoso",
        risco_mrsa: true,
        peso: 80,
        articulacao: "joelho"
    });
    assert.strictEqual(mrsa.artrite_septica_provavel, true);
    assert.ok(mrsa.antimicrobianos_empiricos.some(a => a.esquema.includes("Vancomicina") && a.esquema.includes("1200 mg")), "Deve calcular dose de Vancomicina por peso (~1200 mg).");

    // Teste 1.4: Artrite Gotosa Típica
    let gota = ReumatologiaService.analisarMonoartrite({
        leucocitos: 16000,
        neutrofilos_pct: 70,
        aspecto: "turvo",
        cristais: "cristais em forma de agulha com forte birrefringencia negativa",
        articulacao: "1a articulacao metatarsofalangiana (podagra)",
        clcr: 85
    });
    assert.strictEqual(gota.gota_confirmada, true, "Deve confirmar gota pela presença de cristais de urato em agulha.");
    assert.strictEqual(gota.artrite_septica_provavel, false);
    assert.ok(gota.manejo_gota_aguda.some(m => m.medicamento.includes("AINE")), "Deve conter AINE de 1ª linha quando ClCr preservado.");
    assert.ok(gota.manejo_gota_aguda.some(m => m.posologia.includes("Colchicina em Baixa Dose") || m.medicamento.includes("Colchicina")), "Deve conter Colchicina em baixa dose.");
    assert.ok(gota.bloqueios_iatrogenia.some(b => b.includes("REGRA DE OURO DO ALOPURINOL")), "Deve alertar para regra de ouro de não iniciar ou suspender alopurinol.");

    // Teste 1.5: Gota em Insuficiência Renal (ClCr 22 mL/min) - Bloqueio de AINE
    let gotaRenal = ReumatologiaService.analisarMonoartrite({
        leucocitos: 14000,
        cristais: "urato monossodico",
        clcr: 22,
        articulacao: "tornozelo"
    });
    assert.strictEqual(gotaRenal.gota_confirmada, true);
    assert.ok(gotaRenal.bloqueios_iatrogenia.some(b => b.includes("AINE CONTRAINDICADO")), "Deve emitir contraindicação de AINE.");
    assert.ok(gotaRenal.manejo_gota_aguda.some(m => m.medicamento.includes("Prednisona")), "Prednisona deve ser a droga de escolha.");

    // Teste 1.6: Alerta Crítico de Coexistência (Gota + Artrite Séptica)
    let coex = ReumatologiaService.analisarMonoartrite({
        leucocitos: 88000,
        neutrofilos_pct: 95,
        cristais: "urato monossodico em agulha",
        gram: "cocos gram positivos",
        febre: true,
        aspecto: "purulento"
    });
    assert.strictEqual(coex.gota_confirmada, true);
    assert.strictEqual(coex.coexistencia_alerta, true, "Deve disparar alerta de coexistência.");
    assert.ok(coex.alertas_seguranca.some(a => a.includes("ALERTA CRÍTICO DE COEXISTÊNCIA")), "Mensagem de coexistência deve ser clara.");

    // Teste 1.7: Pseudogota (CPPD)
    let cppd = ReumatologiaService.analisarMonoartrite({
        leucocitos: 12000,
        cristais: "cristais romboides com birrefringencia positiva fraca (pirofosfato de calcio)",
        articulacao: "joelho"
    });
    assert.strictEqual(cppd.pseudogota_confirmada, true);
    assert.strictEqual(cppd.categoria_efusao, "Inflamatória");

    // Teste 1.8: Líquido Não-inflamatório (Osteoartrite Mecânica)
    let mec = ReumatologiaService.analisarMonoartrite({
        leucocitos: 650,
        neutrofilos_pct: 20,
        aspecto: "claro transparente citrino",
        articulacao: "joelho"
    });
    assert.strictEqual(mec.categoria_efusao, "Mecânica");

    // Teste 1.9: Formatação Telegram
    let textoMono = ReumatologiaService.formatarMonoartriteTelegram(septica);
    assert.ok(textoMono.includes("DIAGNÓSTICO DIFERENCIAL DE MONOARTRITE AGUDA"));
    assert.ok(textoMono.includes("Séptico / Infeccioso"));
    assert.ok(textoMono.includes("EMERGÊNCIA MÉDICA"));

    console.log("  ✓ Análise sinovial, celularidade, diferenciação microcristalina e bloqueios de AINE validados com sucesso.");

    // ─────────────────────────────────────────────────────────────────────────
    // PARTE 2: FEBRE REUMÁTICA AGUDA E CRITÉRIOS DE JONES (AHA 2015 / SBP)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[2] Testando Febre Reumática Aguda e Critérios de Jones...");

    // Teste 2.1: 1º Episódio Típico em Criança (25 kg, 9 anos) - Poliartrite + Cardite + ASLO
    let frCriança = ReumatologiaService.avaliarFebreReumatica({
        peso: 25,
        idade: 9,
        aslo_elevada: true,
        aslo: 650,
        artrite: "poliartrite migratoria",
        cardite: true,
        febre: true,
        temperatura: 38.6
    });
    assert.strictEqual(frCriança.diagnostico_confirmado, true, "Diagnóstico deve ser confirmado (2 maiores + ASLO).");
    assert.strictEqual(frCriança.infeccao_estreptococica_evidenciada, true);
    assert.strictEqual(frCriança.criterios_maiores_preenchidos.length, 2);
    assert.ok(frCriança.esquema_erradicacao_gas.posologia.includes("600.000 UI"), "Dose de erradicação infantil < 27 kg deve ser 600.000 UI.");
    assert.ok(frCriança.manejo_antiinflamatorio_fase_aguda.medicamento.includes("Prednisona"), "Cardite indica prednisona oral.");
    assert.ok(frCriança.profilaxia_secundaria.posologia.includes("600.000 UI"), "Profilaxia secundária de 600.000 UI a cada 21 dias.");
    assert.ok(frCriança.profilaxia_secundaria.duracao_recomendada.includes("25 anos"), "Sem valvulopatia residual crônica declarada: até 25 anos ou 10 anos pós-surto.");

    // Teste 2.2: 1º Episódio em Adolescente (50 kg, 15 anos) - 1 Maior + 3 Menores
    let frAdolescente = ReumatologiaService.avaliarFebreReumatica({
        peso: 50,
        idade: 15,
        aslo_elevada: true,
        aslo: 480,
        artrite: "poliartrite migratoria",
        febre: true,
        temperatura: 38.8,
        vhs: 55,
        pr_prolongado: true
    });
    assert.strictEqual(frAdolescente.diagnostico_confirmado, true, "1 Maior + 3 Menores com ASLO+ confirma diagnóstico.");
    assert.ok(frAdolescente.esquema_erradicacao_gas.posologia.includes("1.200.000 UI"), "Dose para >= 27 kg é 1.200.000 UI.");
    assert.ok(frAdolescente.manejo_antiinflamatorio_fase_aguda.medicamento.includes("AAS"), "Artrite pura indica AAS em dose plena anti-inflamatória.");
    assert.ok(frAdolescente.profilaxia_secundaria.duracao_recomendada.includes("21 anos"), "Artrite sem cardite: até os 21 anos.");

    // Teste 2.3: Alergia à Penicilina
    let frAlergico = ReumatologiaService.avaliarFebreReumatica({
        peso: 60,
        idade: 18,
        aslo_elevada: true,
        cardite: true,
        febre: true,
        alergia_penicilina: true
    });
    assert.ok(frAlergico.esquema_erradicacao_gas.medicamento.includes("Eritromicina"), "Deve indicar Eritromicina para erradicação em alérgicos.");
    assert.ok(frAlergico.profilaxia_secundaria.medicamento_escolha.includes("Sulfadiazina"), "Deve indicar Sulfadiazina para profilaxia secundária em alérgicos.");

    // Teste 2.4: Valvulopatia Residual Crônica / Cirurgia Valvar -> Profilaxia Vitalícia / até 40 anos
    let frValvar = ReumatologiaService.avaliarFebreReumatica({
        peso: 70,
        idade: 26,
        aslo_elevada: true,
        cardite: true,
        valvulopatia_residual: true
    });
    assert.ok(frValvar.profilaxia_secundaria.duracao_recomendada.includes("40 anos") || frValvar.profilaxia_secundaria.duracao_recomendada.includes("vida"), "Cardiopatia reumática residual requer profilaxia até 40 anos ou vitalícia.");

    // Teste 2.5: Coreia de Sydenham Isolada
    let coreia = ReumatologiaService.avaliarFebreReumatica({
        peso: 35,
        idade: 11,
        coreia: true
    });
    assert.strictEqual(coreia.diagnostico_confirmado, true, "Coreia isolada confirma Febre Reumática presuntiva.");
    assert.ok(coreia.alertas_clinicos.some(a => a.includes("Coreia de Sydenham isolada autoriza o diagnóstico presuntivo")));

    // Teste 2.6: Ausência de Prova Estreptocócica (Não Confirmado)
    let semGas = ReumatologiaService.avaliarFebreReumatica({
        peso: 40,
        idade: 12,
        artrite: "monoartrite",
        febre: true,
        vhs: 45
    });
    assert.strictEqual(semGas.diagnostico_confirmado, false);
    assert.ok(semGas.alertas_clinicos.some(a => a.includes("AUSÊNCIA DE PROVA DE INFECÇÃO ESTREPTOCÓCICA")));

    // Teste 2.7: Formatação Telegram
    let textoFr = ReumatologiaService.formatarFebreReumaticaTelegram(frCriança);
    assert.ok(textoFr.includes("FEBRE REUMÁTICA AGUDA & CRITÉRIOS DE JONES"));
    assert.ok(textoFr.includes("CONFIRMADO"));
    assert.ok(textoFr.includes("Erradicação de Orofaringe"));
    assert.ok(textoFr.includes("Profilaxia Secundária"));

    console.log("  ✓ Critérios de Jones, estratificação de risco, posologias por faixa de peso e duração da profilaxia validadas.");

    // ─────────────────────────────────────────────────────────────────────────
    // PARTE 3: MÉTODOS RPC DO COCKPIT
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[3] Testando Integração RPC do Cockpit...");

    let rpcMono = cockpitRpc('cockpitReumatologiaMonoartrite', 'internal', {
        leucocitos: 75000,
        aspecto: "purulento",
        febre: true,
        joelho: true
    });
    assert.strictEqual(rpcMono.sucesso, true);
    assert.strictEqual(rpcMono.resultado.artrite_septica_provavel, true);
    assert.ok(rpcMono.textoFormatado.length > 50);

    let rpcFr = cockpitRpc('cockpitReumatologiaFebreReumatica', 'internal', {
        peso: 25,
        aslo_elevada: true,
        artrite: "poliartrite migratoria",
        febre: true,
        temperatura: 38.5,
        vhs: 40
    });
    assert.strictEqual(rpcFr.sucesso, true);
    assert.strictEqual(rpcFr.resultado.diagnostico_confirmado, true);
    assert.ok(rpcFr.textoFormatado.length > 50);

    console.log("  ✓ Métodos RPC do Cockpit (cockpitReumatologiaMonoartrite, cockpitReumatologiaFebreReumatica) responderam com 100% de sucesso.");

    console.log("\n🎉 SUCESSO TOTAL: Todos os testes de Reumatologia (Monoartrite & Febre Reumática) passaram com louvor!");
}

runTests();
