const assert = require('assert');
const NefrologiaDheService = require('../src/02_nefrologia_dhe.js');

function runTests() {
    console.log("=== INICIANDO TESTES: NEFROLOGIA E DHE ===");

    // Teste 1: Cálculo de ACT
    var actHomem = NefrologiaDheService.calcularACT(70, 'M', 30);
    assert.strictEqual(actHomem, 42, "ACT de homem de 70kg e 30 anos deve ser 42 L (70 * 0.6)");
    
    var actMulherIdosa = NefrologiaDheService.calcularACT(60, 'F', 70);
    assert.strictEqual(actMulherIdosa, 27, "ACT de mulher idosa de 60kg deve ser 27 L (60 * 0.45)");

    // Teste 2: Déficit de Sódio
    var deficitNa = NefrologiaDheService.calcularDeficitSodio(115, 125, 70, 'M', 30);
    assert.strictEqual(deficitNa.act, 42, "ACT deveria ser 42");
    assert.strictEqual(deficitNa.deficitSodioMEq, 420, "Déficit deveria ser 42 * 10 = 420");

    var deficitNegativo = NefrologiaDheService.calcularDeficitSodio(130, 125, 70, 'M', 30);
    assert.ok(deficitNegativo.erro, "Deveria retornar erro se Na atual >= Na alvo");

    // Teste 3: Planejar Correção Hiponatremia
    var planoCorrecao = NefrologiaDheService.planejarCorrecaoHiponatremia(115, 70, 'M', 30, 3);
    assert.strictEqual(planoCorrecao.solucao, "NaCl 3%", "Solução deve ser NaCl 3%");
    assert.strictEqual(planoCorrecao.variacaoNaPorLitro, 9.3, "Variacao deve ser 9.3 mEq/L ( (513-115)/43 )");
    assert.strictEqual(planoCorrecao.tetoElevacao24h, 8, "Teto de segurança é 8 mEq em 24h");
    
    // Teste 4: Cálculo de Déficit de Água Livre (Hipernatremia)
    var deficitAguaLivre = NefrologiaDheService.calcularDeficitAguaLivre(160, 70, 'M', 30);
    assert.strictEqual(deficitAguaLivre.act, 42, "ACT deveria ser 42");
    assert.strictEqual(deficitAguaLivre.deficitAguaLivreLitros, 6, "Déficit deveria ser 42 * (160/140 - 1) = 6 L");

    var deficitAguaNegativo = NefrologiaDheService.calcularDeficitAguaLivre(135, 70, 'M', 30);
    assert.ok(deficitAguaNegativo.erro, "Deveria retornar erro se Na atual <= 140");

    // Teste 5: Hipercalemia Moderada
    var kModerado = NefrologiaDheService.avaliarHipercalemia(6.0, false);
    assert.strictEqual(kModerado.gravidade, "Moderada", "Gravidade moderada para K=6.0 s/ alt ECG");
    assert.ok(kModerado.condutas.join().includes("Glicoinsulina"), "Deve recomendar glicoinsulina");
    assert.ok(!kModerado.condutas.join().includes("Gluconato"), "NÃO deve recomendar gluconato (s/ alt ECG e K<6.5)");

    // Teste 6: Hipercalemia Grave
    var kGrave = NefrologiaDheService.avaliarHipercalemia(6.2, true);
    assert.strictEqual(kGrave.gravidade, "Grave / Urgência Médica", "Gravidade grave se alt ECG");
    assert.ok(kGrave.alerta.includes("ALERTA VERMELHO"), "Deve emitir alerta vermelho sobre toxicidade cardíaca");
    assert.ok(kGrave.condutas.join().includes("Gluconato"), "DEVE recomendar gluconato p/ estabilizar membrana");

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
