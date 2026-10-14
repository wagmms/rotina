const assert = require('assert');
const GastroenterologiaPancreatiteService = require('../src/03_gastroenterologia_pancreatite.js');

function runTests() {
    console.log("=== Iniciando Testes: Gastroenterologia Pancreatite ===");
    
    // Teste 1: BISAP Alto Risco
    const bisap1 = GastroenterologiaPancreatiteService.calcularBISAP({
        bunMaior25: true, mentalAlterado: true, sirs: true, idadeMaior60: false, derramePleural: false
    });
    assert(bisap1.escore === 3, "Escore BISAP falhou");
    assert(bisap1.riscoGravidade === "Alto Risco", "Classificacao risco BISAP falhou");
    console.log("✓ Teste 1: BISAP Alto Risco passou.");

    // Teste 2: BISAP Baixo Risco
    const bisap2 = GastroenterologiaPancreatiteService.calcularBISAP({
        bunMaior25: false, mentalAlterado: false, sirs: true, idadeMaior60: false, derramePleural: false
    });
    assert(bisap2.escore === 1, "Escore BISAP falhou");
    assert(bisap2.riscoGravidade === "Baixo Risco", "Classificacao risco BISAP falhou");
    console.log("✓ Teste 2: BISAP Baixo Risco passou.");

    // Teste 3: Protocolo Hidratação
    const hidra1 = GastroenterologiaPancreatiteService.protocoloHidratacao({
        doencaCardiovascularOuRenal: true, hematocritoElevado: false, bunElevado: false
    });
    assert(hidra1.some(r => r.includes("sobrecarga de volume")), "Faltou alerta de sobrecarga para doenca cardio/renal");
    console.log("✓ Teste 3: Protocolo Hidratacao com DCV passou.");

    // Teste 4: Protocolo Nutrição
    const nutri1 = GastroenterologiaPancreatiteService.protocoloNutricao({
        dorAbdominalControlada: true, nauseaVomitoAusentes: true, tempoNPO: 12
    });
    assert(nutri1.some(r => r.includes("Nutrição Oral Precoce")), "Faltou recomendacao de nutricao oral precoce");
    console.log("✓ Teste 4: Protocolo Nutricao passou.");

    // Teste 5: Parser Dinâmico de Texto Clínico - Caso Grave (BISAP 5)
    const paramsGrave = GastroenterologiaPancreatiteService.extrairParametrosTexto(
        "68a ureia 65 confuso sirs derrame pleural hematocrito elevado"
    );
    assert.strictEqual(paramsGrave.bisap.idadeMaior60, true, "Idade 68 deve ser > 60");
    assert.strictEqual(paramsGrave.bisap.bunMaior25, true, "Ureia 65 deve marcar BUN elevado");
    assert.strictEqual(paramsGrave.bisap.mentalAlterado, true, "Confuso deve marcar estado mental alterado");
    assert.strictEqual(paramsGrave.bisap.sirs, true, "SIRS deve ser verdadeiro");
    assert.strictEqual(paramsGrave.bisap.derramePleural, true, "Derrame pleural deve ser verdadeiro");
    assert.strictEqual(paramsGrave.hidratacao.hematocritoElevado, true, "Hematocrito elevado");
    const avaliacaoGrave = GastroenterologiaPancreatiteService.avaliarPaciente(paramsGrave);
    assert.strictEqual(avaliacaoGrave.bisap.escore, 5, "Escore BISAP grave deve ser 5");
    assert.strictEqual(avaliacaoGrave.bisap.riscoGravidade, "Alto Risco", "Deve ser Alto Risco");
    console.log("✓ Teste 5: Parser Dinamico - Caso Grave (BISAP 5) passou.");

    // Teste 6: Parser Dinâmico - Caso Leve com Negações e Nutrição Precoce (BISAP 0)
    const paramsLeve = GastroenterologiaPancreatiteService.extrairParametrosTexto(
        "45a ureia 28 lúcido sem sirs sem derrame dor controlada sem vomito"
    );
    assert.strictEqual(paramsLeve.bisap.idadeMaior60, false, "Idade 45 não é > 60");
    assert.strictEqual(paramsLeve.bisap.bunMaior25, false, "Ureia 28 não é elevada");
    assert.strictEqual(paramsLeve.bisap.mentalAlterado, false, "Lúcido não deve alterar estado mental");
    assert.strictEqual(paramsLeve.bisap.sirs, false, "Sem SIRS deve ser falso");
    assert.strictEqual(paramsLeve.bisap.derramePleural, false, "Sem derrame deve ser falso");
    assert.strictEqual(paramsLeve.nutricao.dorAbdominalControlada, true, "Dor controlada");
    assert.strictEqual(paramsLeve.nutricao.nauseaVomitoAusentes, true, "Sem vômito");
    const avaliacaoLeve = GastroenterologiaPancreatiteService.avaliarPaciente(paramsLeve);
    assert.strictEqual(avaliacaoLeve.bisap.escore, 0, "Escore BISAP leve deve ser 0");
    assert.strictEqual(avaliacaoLeve.bisap.riscoGravidade, "Baixo Risco", "Deve ser Baixo Risco");
    assert(avaliacaoLeve.protocoloNutricao.some(r => r.includes("Nutrição Oral Precoce")), "Deve indicar nutrição oral precoce");
    console.log("✓ Teste 6: Parser Dinamico - Caso Leve (BISAP 0) passou.");

    // Teste 7: Parser Dinâmico - SIRS por Sinais Vitais Numéricos e ICC
    const paramsVitais = GastroenterologiaPancreatiteService.extrairParametrosTexto(
        "72 anos bun 35 fc 105 fr 24 icc sem vomito"
    );
    assert.strictEqual(paramsVitais.bisap.idadeMaior60, true, "72 anos > 60");
    assert.strictEqual(paramsVitais.bisap.bunMaior25, true, "BUN 35 > 25");
    assert.strictEqual(paramsVitais.bisap.sirs, true, "FC 105 + FR 24 preenche SIRS");
    assert.strictEqual(paramsVitais.hidratacao.doencaCardiovascularOuRenal, true, "ICC deve marcar risco cardiopata");
    const avaliacaoVitais = GastroenterologiaPancreatiteService.avaliarPaciente(paramsVitais);
    assert(avaliacaoVitais.protocoloHidratacao.some(r => r.includes("sobrecarga de volume")), "Deve alertar sobrecarga por ICC");
    console.log("✓ Teste 7: Parser Dinamico - SIRS por Sinais Vitais e ICC passou.");

    console.log("=== TODOS OS TESTES PASSARAM ===");
}

try {
    runTests();
} catch (error) {
    console.error("FALHA NOS TESTES:", error.message);
    process.exit(1);
}
