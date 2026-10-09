const assert = require('assert');
const NefrologiaLRAService = require('../src/02_nefrologia_lra_kdigo.js');

function runTests() {
    console.log("=== Iniciando Testes: Nefrologia LRA KDIGO ===");

    // Teste 1: Estágio KDIGO 0
    const res0 = NefrologiaLRAService.estadiarKDIGO(1.0, 1.1, null, null);
    assert.strictEqual(res0.estagio, 0);
    assert.ok(res0.descricao.includes('Sem LRA KDIGO'));
    console.log("✓ Teste 1: KDIGO 0 passou.");

    // Teste 2: Estágio KDIGO 1 por creatinina
    const res1 = NefrologiaLRAService.estadiarKDIGO(1.0, 1.6, null, null);
    assert.strictEqual(res1.estagio, 1);
    assert.ok(res1.descricao.includes('KDIGO 1'));
    console.log("✓ Teste 2: KDIGO 1 passou.");

    // Teste 3: Estágio KDIGO 2 por creatinina
    const res2 = NefrologiaLRAService.estadiarKDIGO(1.0, 2.5, null, null);
    assert.strictEqual(res2.estagio, 2);
    console.log("✓ Teste 3: KDIGO 2 passou.");

    // Teste 4: Estágio KDIGO 3 por creatinina
    const res3 = NefrologiaLRAService.estadiarKDIGO(1.0, 4.1, null, null);
    assert.strictEqual(res3.estagio, 3);
    console.log("✓ Teste 4: KDIGO 3 passou.");

    // Teste 5: Estágio KDIGO 3 por débito urinário
    const resDu3 = NefrologiaLRAService.estadiarKDIGO(1.0, 1.0, 0.2, 25);
    assert.strictEqual(resDu3.estagio, 3);
    console.log("✓ Teste 5: KDIGO 3 DU passou.");

    // Teste 6: Diálise de urgência para acidose
    const resDialise1 = NefrologiaLRAService.avaliarDialiseUrgencia({
        ph: 7.10,
        acidose_refrataria: true
    });
    assert.strictEqual(resDialise1.aeiou.acidose, true);
    assert.strictEqual(resDialise1.indicacoes_presentes, true);
    assert.ok(resDialise1.lista[0].includes('Acidose'));
    console.log("✓ Teste 6: Diálise acidose passou.");

    // Teste 7: Diálise de urgência para uremia e hipervolemia
    const resDialise2 = NefrologiaLRAService.avaliarDialiseUrgencia({
        ureia: 210,
        eap_refratario: true,
        ph: 7.30
    });
    assert.strictEqual(resDialise2.aeiou.uremia, true);
    assert.strictEqual(resDialise2.aeiou.overload, true);
    assert.strictEqual(resDialise2.indicacoes_presentes, true);
    assert.strictEqual(resDialise2.lista.length, 2);
    console.log("✓ Teste 7: Diálise uremia/hipervolemia passou.");

    // Teste 8: Sem critérios de diálise
    const resDialise3 = NefrologiaLRAService.avaliarDialiseUrgencia({
        ph: 7.35,
        potassio: 4.5,
        ureia: 50
    });
    assert.strictEqual(resDialise3.indicacoes_presentes, false);
    assert.strictEqual(resDialise3.lista.length, 0);
    console.log("✓ Teste 8: Diálise normal passou.");

    console.log("🚀 TODOS OS TESTES DE NEFROLOGIA LRA KDIGO PASSARAM COM SUCESSO!");
}

runTests();
