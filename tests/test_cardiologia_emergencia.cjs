const assert = require('assert');
const CardiologiaEmergenciaService = require('../src/02_cardiologia_emergencia.js');

function runTests() {
    console.log("=== Iniciando Testes Determinísticos: Cardiologia de Emergência (HEART, TIMI, DAPT) ===");

    // 1. Escore HEART - Baixo Risco
    const heartBaixo = CardiologiaEmergenciaService.calcularHEART({
        historia: 0,
        ecg: 0,
        idade: 38,
        fatoresRiscoContagem: 0,
        troponina: 0
    });
    assert.strictEqual(heartBaixo.escore, 0, "Escore HEART baixo risco deve ser 0");
    assert.strictEqual(heartBaixo.risco, "Baixo Risco", "Classificação de risco deve ser Baixo Risco");
    assert(heartBaixo.recomendacao.includes("alta precoce"), "Deve sugerir protocolo de alta precoce");
    console.log("✓ Teste 1: HEART Baixo Risco validado com sucesso.");

    // 2. Escore HEART - Alto Risco
    const heartAlto = CardiologiaEmergenciaService.calcularHEART({
        historia: 'altamente_suspeita', // 2
        ecg: 'isquemia_significativa',  // 2
        idade: 68,                      // 2
        has: true,
        diabetes: true,
        tabagismo: true,                // >= 3 FR -> 2
        troponina: 'elevada_3x'         // 2
    });
    assert.strictEqual(heartAlto.escore, 10, "Escore HEART alto risco deve ser 10");
    assert.strictEqual(heartAlto.risco, "Alto Risco", "Classificação deve ser Alto Risco");
    assert(heartAlto.recomendacao.includes("Invasiva Precoce"), "Deve recomendar estratégia invasiva precoce");
    console.log("✓ Teste 2: HEART Alto Risco (10 pts) validado com sucesso.");

    // 3. Escore TIMI para SCASST
    const timiScasst = CardiologiaEmergenciaService.calcularTIMISCASS({
        idade: 70,                  // 1
        has: true, diabetes: true, tabagismo: true, // 1 (>=3 FR)
        estenoseCoronariaPrevia50: true, // 1
        desvioST: true,             // 1
        anginaRecente24h: true,     // 1
        usoAASUltimos7Dias: true,   // 1
        troponinaElevada: true      // 1
    });
    assert.strictEqual(timiScasst.escore, 7, "Escore TIMI SCASST deve somar 7");
    assert.strictEqual(timiScasst.risco, "Alto Risco", "TIMI 7 deve ser Alto Risco");
    assert(timiScasst.estrategia.includes("urgente/precoce"), "Estratégia deve ser invasiva urgente");
    console.log("✓ Teste 3: TIMI SCASST (7 pts) validado com sucesso.");

    // 4. Escore TIMI para IAMCSST
    const timiIamcsst = CardiologiaEmergenciaService.calcularTIMIIAMCSST({
        idade: 76,               // +3
        has: true,               // +1
        pas: 95,                 // +3 (<100)
        fc: 110,                 // +2 (>100)
        killip: 3,               // +2 (II-IV)
        peso: 62,                // +1 (<67)
        supraParedeAnterior: true, // +1
        tempoDorMaior4h: true    // +1
    });
    assert.strictEqual(timiIamcsst.escore, 14, "Escore TIMI IAMCSST máximo deve ser 14");
    assert.strictEqual(timiIamcsst.mortalidade30Dias, "35.9%", "Mortalidade em 30 dias deve ser de 35.9%");
    console.log("✓ Teste 4: TIMI IAMCSST (14 pts) validado com sucesso.");

    // 5. Bloqueio Fatal Cruzado: Prasugrel contraindicado em AVC prévio (TRITON-TIMI 38)
    const daptComAvc = CardiologiaEmergenciaService.avaliarDAPT({
        avcPrevio: true,
        icpPlanejada: true,
        idade: 62,
        peso: 75
    });
    const bloqueioPrasugrel = daptComAvc.bloqueios.find(b => b.farmaco === "Prasugrel");
    assert(bloqueioPrasugrel !== undefined, "Prasugrel DEVE constar nos bloqueios por AVC prévio");
    assert(bloqueioPrasugrel.motivo.includes("AVC ou AIT prévio"), "Motivo deve especificar AVC ou AIT prévio");
    assert(bloqueioPrasugrel.motivo.includes("TRITON-TIMI 38"), "Motivo deve referenciar TRITON-TIMI 38");
    console.log("✓ Teste 5: Bloqueio sentinela de Prasugrel em paciente com AVC validado.");

    // 6. Trombólise Química no IAMCSST: Clopidogrel mandatório; omissão de ataque em > 75 anos
    const daptTromboliseIdoso = CardiologiaEmergenciaService.avaliarDAPT({
        trombolise: true,
        idade: 78,
        peso: 70
    });
    assert.strictEqual(daptTromboliseIdoso.p2y12Escolhido, "Clopidogrel", "Em trombólise química o P2Y12 deve ser Clopidogrel");
    const recClopi = daptTromboliseIdoso.recomendacoes.find(r => r.farmaco.includes("Clopidogrel"));
    assert(recClopi.ataque.includes("SEM DOSE DE ATAQUE"), "Em trombólise > 75 anos deve omitir dose de ataque");
    console.log("✓ Teste 6: Protocolo de trombólise com Clopidogrel sem dose de ataque em > 75 anos validado.");

    // 7. Interação Grave com Omeprazol (CYP2C19)
    const daptOmeprazol = CardiologiaEmergenciaService.avaliarDAPT({
        avcPrevio: true,
        hicPrevia: true, // Força Clopidogrel
        usoOmeprazol: true
    });
    assert(daptOmeprazol.alertas.some(a => a.includes("CYP2C19") && a.includes("Pantoprazol")), "Deve alertar sobre interação com Omeprazol e sugerir Pantoprazol");
    console.log("✓ Teste 7: Alerta de interação CYP2C19 Clopidogrel-Omeprazol validado.");

    // 8. Bloqueio de Nitratos em Infarto de VD e em uso de IPDE-5 (Sildenafil)
    const adjVd = CardiologiaEmergenciaService.avaliarMedicamentosAdjuvantes({
        infartoVD: true,
        pas: 130
    });
    const bloqNitratoVd = adjVd.bloqueios.find(b => b.farmaco.includes("Nitratos"));
    assert(bloqNitratoVd !== undefined, "Nitrato deve ser bloqueado em IAM de VD");
    assert(bloqNitratoVd.nivel === "BLOQUEIO_FATAL", "Nível deve ser BLOQUEIO_FATAL em IAM de VD");

    const adjIpde5 = CardiologiaEmergenciaService.avaliarMedicamentosAdjuvantes({
        usoSildenafilUltimas24h: true,
        pas: 140
    });
    const bloqNitratoIpde5 = adjIpde5.bloqueios.find(b => b.farmaco.includes("Nitratos"));
    assert(bloqNitratoIpde5 !== undefined, "Nitrato deve ser bloqueado com Sildenafil recente");
    assert(bloqNitratoIpde5.motivo.includes("Sildenafil"), "Motivo deve citar Sildenafil");
    console.log("✓ Teste 8: Bloqueios fatais de nitratos em IAM-VD e IPDE-5 validados.");

    // 9. Bloqueio de Betabloqueador em Choque e Congestão Pulmonar
    const adjChoque = CardiologiaEmergenciaService.avaliarMedicamentosAdjuvantes({
        pas: 85,
        congestaoPulmonar: true
    });
    const bloqBb = adjChoque.bloqueios.find(b => b.farmaco.includes("Betabloqueador"));
    assert(bloqBb !== undefined, "Betabloqueador deve ser contraindicado em choque/congestão");
    console.log("✓ Teste 9: Contraindicação de betabloqueador em choque cardiogênico validada.");

    // 10. Ajuste Renal de Anticoagulação (Enoxaparina em ClCr < 30)
    const adjRenal = CardiologiaEmergenciaService.avaliarMedicamentosAdjuvantes({
        clearanceCr: 24,
        peso: 80
    });
    assert(adjRenal.alertas.some(a => a.includes("AJUSTE RENAL") && a.includes("24/24h")), "Deve alertar sobre ajuste renal de Enoxaparina para cada 24 horas");
    console.log("✓ Teste 10: Ajuste renal de Enoxaparina em TFG < 30 mL/min validado.");

    // 11. Avaliação Integrada Completa
    const casoCompleto = CardiologiaEmergenciaService.avaliarPaciente({
        idade: 64,
        historia: 'altamente_suspeita',
        ecg: 'infradesnivel_st',
        has: true,
        diabetes: true,
        troponina: 'elevada_3x',
        avcPrevio: false,
        icpPlanejada: true,
        pas: 135,
        fc: 76,
        clearanceCr: 75
    });
    assert.strictEqual(casoCompleto.heart.risco, "Alto Risco", "Caso deve ser HEART Alto Risco");
    assert.strictEqual(casoCompleto.dapt.p2y12Escolhido, "Ticagrelor", "Sem contraindicação o P2Y12 preferencial é Ticagrelor");
    assert(casoCompleto.adjuvantes.farmacosRecomendados.some(f => f.farmaco.includes("Atorvastatina 80 mg")), "Deve prescrever Atorvastatina 80 mg");
    console.log("✓ Teste 11: Avaliação clínica integrada completa validada.");

    // 12. Teste de Integração RPC Fastify via runtime
    const runtime = require('../server/runtime.js');
    const crypto = require('crypto');
    const botToken = 'dummy-token-cardio';
    if (!runtime.ctx.ConfigService) runtime.ctx.ConfigService = {};
    runtime.ctx.ConfigService.exigir = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : (k === 'TELEGRAM_BOT_TOKEN' ? botToken : 'dummy');
    const hashEsperado = crypto.createHmac('sha256', botToken).update('123').digest('hex');
    const fakeSession = 'ck_' + hashEsperado;

    const rpcRes = runtime.cockpitRpc('cockpitCardiologiaEmergencia', fakeSession, [{
        idade: 68,
        historia: 'altamente_suspeita',
        ecg: 'isquemia_significativa',
        troponina: 'elevada_3x',
        has: true,
        diabetes: true,
        tabagismo: true,
        avcPrevio: true,
        icpPlanejada: true,
        supraST: true
    }]);
    assert(rpcRes.sucesso === true, "RPC deve retornar sucesso: true");
    assert(rpcRes.textoFormatado.includes("CARDIOLOGIA DE EMERGÊNCIA"), "Texto formatado deve conter título oficial");
    assert(rpcRes.textoFormatado.includes("TRITON-TIMI 38"), "Texto formatado deve conter justificativa do bloqueio do Prasugrel");
    console.log("✓ Teste 12: Integração Fastify RPC (cockpitCardiologiaEmergencia) validada com sucesso.");

    console.log("=== TODOS OS 12 TESTES DE CARDIOLOGIA DE EMERGÊNCIA PASSARAM COM SUCESSO! ===");
}


try {
    runTests();
} catch (e) {
    console.error("FALHA NOS TESTES:", e);
    process.exit(1);
}

