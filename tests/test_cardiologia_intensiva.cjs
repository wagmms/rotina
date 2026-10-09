const assert = require('assert');
const CardiologiaIntensivaService = require('../src/02_cardiologia_intensiva.js');

function runTests() {
    let pass = 0, fail = 0;

    function test(name, fn) {
        try {
            fn();
            pass++;
            console.log(`[PASS] ${name}`);
        } catch (e) {
            fail++;
            console.error(`[FAIL] ${name}`);
            console.error(e);
        }
    }

    test('Forrester Perfil A - Quente e Seco', () => {
        const res = CardiologiaIntensivaService.avaliarPacienteICDescompensada({ congestao: false, baixa_perfusao: false });
        assert.strictEqual(res.perfil_clinico.perfil, 'A');
        assert.ok(res.perfil_clinico.descricao.includes('Quente e Seco'));
    });

    test('Forrester Perfil B - Quente e Úmido', () => {
        const res = CardiologiaIntensivaService.avaliarPacienteICDescompensada({ congestao: true, baixa_perfusao: false, pas: 120 });
        assert.strictEqual(res.perfil_clinico.perfil, 'B');
        assert.ok(res.perfil_clinico.descricao.includes('Quente e Úmido'));
        assert.ok(res.plano_farmacologico.diuretico.length > 0, "Deve ter indicação de diurético");
        assert.ok(res.plano_farmacologico.vasodilatador.length > 0, "Deve ter vasodilatador se PAS > 110");
        assert.strictEqual(res.plano_farmacologico.inotropico.length, 0);
    });

    test('Forrester Perfil C - Frio e Úmido (Choque Franco)', () => {
        const res = CardiologiaIntensivaService.avaliarPacienteICDescompensada({ congestao: true, baixa_perfusao: true, pas: 80, uso_betabloqueador: true });
        assert.strictEqual(res.perfil_clinico.perfil, 'C');
        assert.ok(res.perfil_clinico.descricao.includes('Frio e Úmido'));
        assert.ok(res.plano_farmacologico.inotropico.length > 0, "Deve indicar inotrópico");
        assert.ok(res.plano_farmacologico.vasopressor.length > 0, "Deve indicar vasopressor para PAS < 90");
        assert.ok(res.plano_farmacologico.bloqueios_seguranca[0].includes('CONTRAINDICAÇÃO ABSOLUTA'), "Deve mandar suspender betabloqueador");
    });

    test('Forrester Perfil L - Frio e Seco', () => {
        const res = CardiologiaIntensivaService.avaliarPacienteICDescompensada({ congestao: false, baixa_perfusao: true, pas: 90 });
        assert.strictEqual(res.perfil_clinico.perfil, 'L');
        assert.ok(res.perfil_clinico.descricao.includes('Frio e Seco'));
        assert.ok(res.perfil_clinico.conduta_geral.includes('Prova de volume'));
        assert.ok(res.plano_farmacologico.diuretico[0].includes('CONTRAINDICADO'), "Não pode dar diurético no perfil L");
    });

    console.log(`\nResultados Cardiologia Intensiva: ${pass} pass, ${fail} fail`);
    if (fail > 0) process.exit(1);
}

runTests();
