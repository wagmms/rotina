const assert = require('assert');
const AuditoriaYSiteService = require('../src/02_auditoria_y_site.js');

function runTests() {
    console.log("Iniciando testes determinísticos: Auditoria Y-Site");

    // Teste 1: Ceftriaxona + Ringer Lactato (Precipitação Grave)
    var res1 = AuditoriaYSiteService.verificarCompatibilidadeLista(['Ceftriaxona 1g', 'Ringer Lactato 500ml', 'Dipirona']);
    assert.strictEqual(res1.compativel, false);
    assert.strictEqual(res1.bloqueio, true);
    assert.ok(res1.alertas[0].mensagem.includes('PRECIPITAÇÃO GRAVE'));
    assert.ok(res1.alertas[0].mensagem.includes('cristais'));

    // Teste 2: Fenitoína + Soro Glicosado 5% (Precipitação Imediata)
    var res2 = AuditoriaYSiteService.verificarCompatibilidadeLista(['Fenitoína 250mg', 'Soro Glicosado 5%']);
    assert.strictEqual(res2.compativel, false);
    assert.strictEqual(res2.bloqueio, true);
    assert.ok(res2.alertas[0].mensagem.includes('Fenitoína'));

    // Teste 3: Bicarbonato de Sódio + Noradrenalina (Inativação)
    var res3 = AuditoriaYSiteService.verificarCompatibilidadeLista(['Bicarbonato de Sódio 8,4%', 'Noradrenalina 4mg']);
    assert.strictEqual(res3.compativel, false);
    assert.strictEqual(res3.bloqueio, true);
    assert.ok(res3.alertas[0].mensagem.includes('INATIVAÇÃO'));

    // Teste 4: Furosemida + Midazolam
    var res4 = AuditoriaYSiteService.verificarCompatibilidadeLista(['Furosemida 20mg', 'Midazolam 15mg', 'Soro Fisiologico']);
    assert.strictEqual(res4.compativel, false);
    assert.strictEqual(res4.bloqueio, true);

    // Teste 5: Diazepam + Soro Fisiológico (Não bloqueante, mas alerta)
    var res5 = AuditoriaYSiteService.verificarCompatibilidadeLista(['Diazepam 10mg', 'Soro Fisiologico 0.9%']);
    assert.strictEqual(res5.compativel, false);
    assert.strictEqual(res5.bloqueio, false);

    // Teste 6: Compatíveis (Sem alertas)
    var res6 = AuditoriaYSiteService.verificarCompatibilidadeLista(['Dipirona 1g', 'Ondansetrona 8mg', 'Soro Fisiologico']);
    assert.strictEqual(res6.compativel, true);
    assert.strictEqual(res6.alertas.length, 0);
    assert.strictEqual(res6.bloqueio, false);

    console.log("Todos os testes de Y-Site (CJS) passaram com sucesso!");
}

if (require.main === module) {
    runTests();
}

module.exports = { runTests };
