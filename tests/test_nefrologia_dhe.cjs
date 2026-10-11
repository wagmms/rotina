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
    assert.ok(kModerado.condutas.join().includes("SG 50% 50mL + 10 UI Regular em 20 min"), "Deve conter diluição canônica de solução polarizante");
    assert.ok(kModerado.condutas.join().includes("HGT horária por 4-6h"), "Deve alertar monitorização de HGT horária por 4-6h");
    assert.ok(kModerado.condutas.join().includes("Furosemida"), "Deve conter Furosemida para eliminação");
    assert.ok(kModerado.condutas.join().includes("Sorcal"), "Deve conter Sorcal para eliminação");
    assert.ok(!kModerado.condutas.join().includes("Gluconato"), "NÃO deve recomendar gluconato (s/ alt ECG e K<6.5)");
    assert.ok(kModerado.prescricaoPEP.includes("Solução Polarizante"), "Prescrição PEP deve conter solução polarizante");
    assert.ok(kModerado.prescricaoPEP.includes("HGT"), "Prescrição PEP deve conter vigilância de HGT");

    // Teste 6: Hipercalemia Grave
    var kGrave = NefrologiaDheService.avaliarHipercalemia(6.2, true);
    assert.strictEqual(kGrave.gravidade, "Grave / Urgência Médica", "Gravidade grave se alt ECG");
    assert.ok(kGrave.alerta.includes("ALERTA VERMELHO"), "Deve emitir alerta vermelho sobre toxicidade cardíaca");
    assert.ok(kGrave.condutas.join().includes("Gluconato de Cálcio 10% (10-20mL em 100mL SG 5% em 5 min)"), "DEVE recomendar gluconato canônico p/ estabilizar membrana");
    assert.ok(kGrave.tripeCanonico.estabilizacaoMembrana.includes("Gluconato"), "Tripé canônico deve ter estabilização de membrana");
    assert.ok(kGrave.tripeCanonico.redistribuicaoIntracelular.length > 0, "Tripé canônico deve ter redistribuição");
    assert.ok(kGrave.tripeCanonico.eliminacaoCorporal.length > 0, "Tripé canônico deve ter eliminação");

    // Teste 7: Alias calcularCorrecaoK
    assert.strictEqual(typeof NefrologiaDheService.calcularCorrecaoK, 'function', "calcularCorrecaoK deve ser exportado como alias");
    var kAlias = NefrologiaDheService.calcularCorrecaoK(7.0, false);
    assert.strictEqual(kAlias.gravidade, "Grave / Urgência Médica", "K=7.0 deve ser Grave");
    assert.ok(kAlias.condutas.join().includes("Gluconato de Cálcio 10% (10-20mL em 100mL SG 5% em 5 min)"), "K=7.0 deve receber gluconato mesmo sem ECG");

    // Teste 8: Hipercalemia Extrema (K > 8.0)
    var kExtremo = NefrologiaDheService.avaliarHipercalemia(8.4, true);
    assert.ok(kExtremo.gravidade.includes("Extrema"), "Gravidade deve ser extrema para K > 8.0");
    assert.ok(kExtremo.alerta.includes("ALERTA VERMELHO MÁXIMO"), "Deve conter alerta vermelho máximo");
    assert.ok(kExtremo.condutas.join().includes("HEMODIÁLISE DE EMERGÊNCIA"), "Deve indicar hemodiálise de emergência");
    assert.ok(kExtremo.condutas.join().includes("Gluconato de Cálcio 10% (10-20mL em 100mL SG 5% em 5 min)"), "Deve conter gluconato imediato");

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
