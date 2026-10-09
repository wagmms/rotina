const assert = require('assert');
const MecanicaPulmonarSdraService = require('../src/02_mecanica_pulmonar_sdra');

function testPesoPredito() {
    console.log("-> Testando Peso Predito (PBW)...");
    
    // Homem, 180 cm (approx 70.86 inches, pbw = 50 + 2.3*(10.86) = ~75)
    // 180 / 2.54 = 70.866
    // PBW = 50 + 2.3 * 10.866 = 74.99 -> 75.0
    let pbwM = MecanicaPulmonarSdraService.calcularPesoPredito(180, 'M');
    assert.strictEqual(pbwM, 75.0);

    // Mulher, 160 cm
    // 160 / 2.54 = 62.99
    // PBW = 45.5 + 2.3 * 2.99 = 52.38 -> 52.4
    let pbwF = MecanicaPulmonarSdraService.calcularPesoPredito(160, 'F');
    assert.strictEqual(pbwF, 52.4);
}

function testVolumeCorrente() {
    console.log("-> Testando Volume Corrente...");
    let vt = MecanicaPulmonarSdraService.calcularVolumeCorrente(75.0);
    assert.strictEqual(vt.vt4, 300);
    assert.strictEqual(vt.vt6, 450);
    assert.strictEqual(vt.vt8, 600);
}

function testMecanicaPulmonar() {
    console.log("-> Testando Mecânica Pulmonar...");
    // Normal
    let m1 = MecanicaPulmonarSdraService.avaliarMecanicaPulmonar(25, 12);
    assert.strictEqual(m1.drivingPressure, 13);
    assert.strictEqual(m1.pplatSegura, true);
    assert.strictEqual(m1.deltaPSegura, true);
    assert.strictEqual(m1.alertas.length, 0);

    // Crítico
    let m2 = MecanicaPulmonarSdraService.avaliarMecanicaPulmonar(35, 10);
    assert.strictEqual(m2.drivingPressure, 25);
    assert.strictEqual(m2.pplatSegura, false);
    assert.strictEqual(m2.deltaPSegura, false);
    assert.strictEqual(m2.alertas.length, 2);
}

function testCriteriosBerlimProna() {
    console.log("-> Testando Critérios de Berlim e Pronação...");
    // Leve
    let s1 = MecanicaPulmonarSdraService.avaliarSdra(90, 40, 8);
    assert.strictEqual(s1.pao2Fio2, 225); // 90 / 0.4
    assert.strictEqual(s1.classificacao.includes("Leve"), true);
    
    // Moderada / Prona indicada
    let s2 = MecanicaPulmonarSdraService.avaliarSdra(70, 60, 12);
    assert.strictEqual(s2.pao2Fio2, 117); // 70 / 0.6 = 116.6 -> 117
    assert.strictEqual(s2.classificacao.includes("Moderada"), true);
    assert.strictEqual(s2.condutas.some(c => c.includes("Prona precoce")), true);
    assert.strictEqual(s2.condutas.some(c => c.includes("Bloqueio Neuromuscular")), true);

    // Grave
    let s3 = MecanicaPulmonarSdraService.avaliarSdra(60, 100, 15);
    assert.strictEqual(s3.pao2Fio2, 60); // 60 / 1.0
    assert.strictEqual(s3.classificacao.includes("Grave"), true);
}

function runAll() {
    try {
        testPesoPredito();
        testVolumeCorrente();
        testMecanicaPulmonar();
        testCriteriosBerlimProna();
        console.log("✅ Todos os testes de SDRA/Mecânica Pulmonar passaram com sucesso.");
    } catch (e) {
        console.error("❌ Falha nos testes:", e);
        process.exit(1);
    }
}

runAll();
