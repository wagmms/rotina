const assert = require('assert');
const SedacaoOpioidesService = require('../src/02_sedacao_opioides.js');

function runTests() {
    console.log("Iniciando bateria de testes: SedacaoOpioidesService...");

    // Teste 1: RASS
    const rass0 = SedacaoOpioidesService.avaliarRASS(0);
    assert.strictEqual(rass0.nivel, "Alerta e calmo");
    assert.strictEqual(rass0.meta, "Meta típica para desmame ventilatório");

    const rassM4 = SedacaoOpioidesService.avaliarRASS(-4);
    assert.strictEqual(rassM4.nivel, "Sedação profunda (resposta apenas a estímulo físico)");
    assert.strictEqual(rassM4.meta, "Sedação profunda (indicação: bloqueador neuromuscular, hipertensão intracraniana ou estado de mal epiléptico)");

    const rass3 = SedacaoOpioidesService.avaliarRASS(3);
    assert.strictEqual(rass3.nivel, "Muito agitado (puxa cateteres, agressivo)");
    assert.strictEqual(rass3.meta, "Agitação (necessita analgesia, sedação de resgate ou contenção)");

    // Teste 2: CAM-ICU
    const camNao = SedacaoOpioidesService.avaliarCAMICU({
        alteracaoAgudaMental: true,
        desatencao: false, // sem desatenção -> não tem delirium
        alteracaoConsciencia: true,
        pensamentoDesorganizado: true
    });
    assert.strictEqual(camNao.delirium, false);

    const camSim = SedacaoOpioidesService.avaliarCAMICU({
        alteracaoAgudaMental: true,
        desatencao: true,
        alteracaoConsciencia: true,
        pensamentoDesorganizado: false
    });
    assert.strictEqual(camSim.delirium, true);

    // Teste 3: Cálculo de MME
    const morfinaVO = SedacaoOpioidesService.calcularMME("Morfina", "VO", 60);
    assert.strictEqual(morfinaVO.mmeDia, 60);

    const morfinaIV = SedacaoOpioidesService.calcularMME("Morfina", "IV", 20); // 20 mg iv = 60 mme
    assert.strictEqual(morfinaIV.mmeDia, 60);

    const fentanilIV = SedacaoOpioidesService.calcularMME("Fentanil", "IV", 1.2); // 1.2 mg/dia fentanil (50mcg/h) = 1.2 * 300 = 360 MME
    assert.strictEqual(fentanilIV.mmeDia, 360);

    const metadona20 = SedacaoOpioidesService.calcularMME("Metadona", "VO", 20); // x4
    assert.strictEqual(metadona20.mmeDia, 80);

    const metadona30 = SedacaoOpioidesService.calcularMME("Metadona", "VO", 30); // x8
    assert.strictEqual(metadona30.mmeDia, 240);

    // Teste 4: Rotação
    // Fentanil IV 1.2 mg -> Morfina VO
    // MME original = 360
    // Redução cruzada = 25% = 270 MME
    // Morfina VO fator = 1 => 270 mg/dia
    const rotMorfinaVO = SedacaoOpioidesService.rotacionarOpioide(360, "Morfina", "VO", 0.25);
    assert.strictEqual(rotMorfinaVO.mmeOriginalCorrigido, 270);
    assert.strictEqual(rotMorfinaVO.doseMgDiaCalculada, 270);

    // Morfina IV 20 mg/dia -> Fentanil IV
    // MME original = 60
    // Redução cruzada 0% = 60 MME
    // Fentanil fator = 300 => 60 / 300 = 0.2 mg/dia
    const rotFent = SedacaoOpioidesService.rotacionarOpioide(60, "Fentanil", "IV", 0);
    assert.strictEqual(rotFent.doseMgDiaCalculada, 0.2);
    assert.strictEqual(rotFent.doseMcgDiaCalculada, 200);

    console.log("✅ Todos os testes de SedacaoOpioidesService passaram com sucesso!");
}

runTests();
