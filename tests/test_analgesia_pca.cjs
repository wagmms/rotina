const assert = require('assert');
const AnalgesiaPcaService = require('../src/02_analgesia_pca.js');

function runTests() {
    console.log("Iniciando bateria de testes determinísticos para Analgesia PCA...\n");
    let passed = 0;
    let failed = 0;

    function runTest(name, fn) {
        try {
            fn();
            console.log(`[PASS] ${name}`);
            passed++;
        } catch (error) {
            console.error(`[FAIL] ${name}`);
            console.error(error);
            failed++;
        }
    }

    runTest("Deve calcular PCA de Morfina para paciente não idoso e opioid-naive", () => {
        const res = AnalgesiaPcaService.calcularPca({ farmaco: 'Morfina', idade: 40, pesoKg: 70, opioideTolerante: false });
        assert.strictEqual(res.farmaco, 'Morfina');
        assert.strictEqual(res.doseBasalSugerida, '0 mg/h (Não recomendada para pacientes opioid-naive)');
        assert.strictEqual(res.bolusSugerido, '1 a 2 mg');
        assert.strictEqual(res.lockoutSugerido, '6 a 8 minutos');
        assert.strictEqual(res.limite4hSugerido, '30 mg');
        assert(res.alertasSeguranca.some(a => a.includes('aumenta significativamente o risco de depressão respiratória')));
    });

    runTest("Deve calcular PCA de Morfina para paciente idoso e opioid-naive", () => {
        const res = AnalgesiaPcaService.calcularPca({ farmaco: 'Morfina', idade: 70, pesoKg: 70, opioideTolerante: false });
        assert.strictEqual(res.bolusSugerido, '0.5 a 1 mg');
        assert.strictEqual(res.lockoutSugerido, '8 a 10 minutos');
    });

    runTest("Deve calcular PCA de Fentanil para paciente não idoso e tolerante", () => {
        const res = AnalgesiaPcaService.calcularPca({ farmaco: 'Fentanil', idade: 40, pesoKg: 70, opioideTolerante: true });
        assert.strictEqual(res.farmaco, 'Fentanil');
        assert.strictEqual(res.doseBasalSugerida, '20 mcg/h');
        assert.strictEqual(res.bolusSugerido, '30 a 60 mcg');
        assert.strictEqual(res.lockoutSugerido, '5 a 6 minutos');
        // Limite: 60 * 12 * 4 * 0.5 = 1440
        assert.strictEqual(res.limite4hSugerido, '1440 mcg');
        assert(!res.alertasSeguranca.some(a => a.includes('aumenta significativamente o risco')));
    });

    runTest("Deve retornar erro para farmaco não suportado", () => {
        const res = AnalgesiaPcaService.calcularPca({ farmaco: 'Tramadol' });
        assert(res.erro);
        assert.strictEqual(res.erro, "Fármaco não suportado para PCA neste motor. Utilize 'Morfina' ou 'Fentanil'.");
    });

    console.log(`\nResultados: ${passed} passaram, ${failed} falharam.`);
    if (failed > 0) process.exit(1);
}

runTests();
