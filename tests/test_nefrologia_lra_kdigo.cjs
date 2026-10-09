const assert = require('assert');
const path = require('path');
const fs = require('fs');

const scriptPath = path.join(__dirname, '../src/02_nefrologia_lra_kdigo.js');
const scriptCode = fs.readFileSync(scriptPath, 'utf8');

const context = {};
const vm = require('vm');
vm.createContext(context);
vm.runInContext(scriptCode, context);

const NefrologiaLRAService = context.NefrologiaLRAService;

describe('NefrologiaLRAService', function() {
    it('deve classificar corretamente o estágio KDIGO 0', function() {
        const resultado = NefrologiaLRAService.estadiarKDIGO(1.0, 1.1, null, null);
        assert.strictEqual(resultado.estagio, 0);
        assert.ok(resultado.descricao.includes('Sem LRA KDIGO'));
    });

    it('deve classificar corretamente o estágio KDIGO 1 por creatinina', function() {
        const resultado = NefrologiaLRAService.estadiarKDIGO(1.0, 1.6, null, null);
        assert.strictEqual(resultado.estagio, 1);
        assert.ok(resultado.descricao.includes('KDIGO 1'));
    });

    it('deve classificar corretamente o estágio KDIGO 2 por creatinina', function() {
        const resultado = NefrologiaLRAService.estadiarKDIGO(1.0, 2.5, null, null);
        assert.strictEqual(resultado.estagio, 2);
    });

    it('deve classificar corretamente o estágio KDIGO 3 por creatinina', function() {
        const resultado = NefrologiaLRAService.estadiarKDIGO(1.0, 4.1, null, null);
        assert.strictEqual(resultado.estagio, 3);
    });

    it('deve classificar corretamente o estágio KDIGO 3 por débito urinário', function() {
        const resultado = NefrologiaLRAService.estadiarKDIGO(1.0, 1.0, 0.2, 25);
        assert.strictEqual(resultado.estagio, 3);
    });

    it('deve sinalizar indicações de diálise de urgência para acidose', function() {
        const resultado = NefrologiaLRAService.avaliarDialiseUrgencia({
            ph: 7.10,
            acidose_refrataria: true
        });
        assert.strictEqual(resultado.aeiou.acidose, true);
        assert.strictEqual(resultado.indicacoes_presentes, true);
        assert.ok(resultado.lista[0].includes('Acidose'));
    });

    it('deve sinalizar indicações de diálise de urgência para uremia e hipervolemia', function() {
        const resultado = NefrologiaLRAService.avaliarDialiseUrgencia({
            ureia: 210,
            eap_refratario: true,
            ph: 7.30
        });
        assert.strictEqual(resultado.aeiou.uremia, true);
        assert.strictEqual(resultado.aeiou.overload, true);
        assert.strictEqual(resultado.indicacoes_presentes, true);
        assert.strictEqual(resultado.lista.length, 2);
    });

    it('não deve sinalizar indicações se parâmetros estiverem normais', function() {
        const resultado = NefrologiaLRAService.avaliarDialiseUrgencia({
            ph: 7.35,
            potassio: 4.5,
            ureia: 50
        });
        assert.strictEqual(resultado.indicacoes_presentes, false);
        assert.strictEqual(resultado.lista.length, 0);
    });
});
