const assert = require('assert');
const SuporteNutricionalService = require('../src/02_suporte_nutricional.js');

function runTests() {
    console.log("=== INICIANDO TESTES: SUPORTE NUTRICIONAL ===");

    // Teste 1: Necessidades Basais
    var reqHomem = SuporteNutricionalService.calcularNecessidadesBasais(70, 175, 30, 'M', 1.2);
    // TMB = 66.5 + (13.75*70) + (5.003*175) - (6.75*30) = 66.5 + 962.5 + 875.525 - 202.5 = 1702.025
    assert.strictEqual(reqHomem.tmb_kcal, 1702, "TMB do homem deve ser ~1702");
    assert.strictEqual(reqHomem.vet_harris_benedict_kcal, Math.round(1702.025 * 1.2), "VET deve ser TMB * 1.2");
    assert.strictEqual(reqHomem.vet_regra_bolso_kcal, "1750 a 2100", "Regra de bolso 25-30 kcal/kg p/ 70kg");
    assert.strictEqual(reqHomem.proteina_alvo_g, "84 a 140", "Proteína 1.2 a 2.0 g/kg p/ 70kg");

    var reqMulher = SuporteNutricionalService.calcularNecessidadesBasais(60, 160, 40, 'F', 1.0);
    // TMB = 655.1 + (9.563*60) + (1.85*160) - (4.676*40) = 655.1 + 573.78 + 296 - 187.04 = 1337.84
    assert.strictEqual(reqMulher.tmb_kcal, 1338, "TMB da mulher deve ser ~1338");

    // Teste 2: Síndrome de Realimentação (Baixo Risco)
    var riscoBaixo = SuporteNutricionalService.avaliarRiscoRealimentacao(22, 5, 3, 4.0, 2.0, 3.5);
    assert.strictEqual(riscoBaixo.altoRisco, false, "Paciente normal deve ter risco baixo");
    assert.ok(riscoBaixo.condutas[0].includes("Risco baixo a moderado"), "Deve recomendar avanço em 48-72h");

    // Teste 3: Síndrome de Realimentação (Alto Risco por 1 critério maior)
    var riscoAlto1 = SuporteNutricionalService.avaliarRiscoRealimentacao(15, 5, 3, 4.0, 2.0, 3.5);
    assert.strictEqual(riscoAlto1.altoRisco, true, "IMC < 16 é alto risco automático");
    assert.ok(riscoAlto1.condutas.join().includes("Tiamina 200-300 mg"), "Deve prescrever Tiamina profilática");
    assert.ok(riscoAlto1.condutas.join().includes("INÍCIO LENTO"), "Deve recomendar início lento");

    // Teste 4: Síndrome de Realimentação (Alto Risco por 2 critérios menores)
    var riscoAlto2 = SuporteNutricionalService.avaliarRiscoRealimentacao(17, 12, 3, 4.0, 2.0, 3.5);
    assert.strictEqual(riscoAlto2.altoRisco, true, "IMC 17 e perda 12% são 2 menores = alto risco");
    assert.ok(riscoAlto2.motivos.join().includes("2 ou mais critérios menores"), "Deve listar como critério");

    // Teste 5: Nutrição Enteral vs Parenteral
    var presNE = SuporteNutricionalService.prescreverTerapiaNutricional(3, true, 2, 3);
    assert.strictEqual(presNE.via, "NUTRIÇÃO ENTERAL PRECOCE (NE)", "TGI funcionante indica NE");
    assert.ok(presNE.condutas[0].includes("nas primeiras 24-48h"), "Jejum >= 2 indica urgência na admissão");

    var presNPT = SuporteNutricionalService.prescreverTerapiaNutricional(3, false, 4, 0);
    assert.strictEqual(presNPT.via, "NUTRIÇÃO PARENTERAL (NPT)", "TGI não funcionante indica NPT");
    assert.strictEqual(presNPT.riscoNutricional, true, "NRS >= 3 é risco");
    assert.ok(presNPT.condutas[0].includes("Alto risco nutricional"), "NPT precoce se alto risco");

    var presNPTSaudavel = SuporteNutricionalService.prescreverTerapiaNutricional(5, false, 1, 1);
    assert.strictEqual(presNPTSaudavel.riscoNutricional, false, "NRS e Nutric baixos");
    assert.ok(presNPTSaudavel.condutas[0].includes("Aguardar até 7 dias"), "Aguardar em baixo risco");

    console.log("=== TODOS OS TESTES PASSARAM ===");
}

if (require.main === module) {
    try {
        runTests();
        process.exit(0);
    } catch (e) {
        console.error("FALHA NO TESTE:", e);
        process.exit(1);
    }
}

module.exports = { runTests };
