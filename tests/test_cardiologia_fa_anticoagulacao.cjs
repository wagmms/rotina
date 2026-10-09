const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Carrega o módulo globalmente via eval (padrão do projeto)
const codigoFonte = fs.readFileSync(path.join(__dirname, '../src/02_cardiologia_fa_anticoagulacao.js'), 'utf8');
eval(codigoFonte);
const Svc = CardiologiaFaAnticoagulacaoService;

let pass = 0, fail = 0;
function test(name, fn) {
    try {
        fn();
        console.log(`[PASS] ${name}`);
        pass++;
    } catch (e) {
        console.error(`[FAIL] ${name}`);
        console.error(e.message);
        fail++;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTES — CHA2DS2-VASc
// ═══════════════════════════════════════════════════════════════════════════

test('1. CHA2DS2-VASc: Homem de 60 anos sem comorbidades = 0 pontos (Baixo Risco)', () => {
    const r = Svc.calcularCHA2DS2VASc({ idade: 60, sexo: 'M' });
    assert.strictEqual(r.escore, 0);
    assert.ok(r.recomendacao.includes('Baixo risco'));
});

test('2. CHA2DS2-VASc: Mulher de 60 anos sem comorbidades = 1 ponto (Baixo Risco)', () => {
    const r = Svc.calcularCHA2DS2VASc({ idade: 60, sexo: 'F' });
    assert.strictEqual(r.escore, 1);
    assert.ok(r.recomendacao.includes('Baixo risco'));
});

test('3. CHA2DS2-VASc: Homem com 65 anos, HAS e IC = 3 pontos (Alto Risco)', () => {
    const r = Svc.calcularCHA2DS2VASc({ idade: 65, sexo: 'M', hipertensao: true, insuficienciaCardiaca: true });
    assert.strictEqual(r.escore, 3); // Idade 65 (+1), HAS (+1), IC (+1)
    assert.ok(r.recomendacao.includes('Alto risco'));
});

test('4. CHA2DS2-VASc: Mulher com 76 anos, AVC prévio e DM = 7 pontos', () => {
    const r = Svc.calcularCHA2DS2VASc({ idade: 76, sexo: 'F', avcOuAitPrevio: true, diabetes: true });
    // Idade 75+ (+2), Sexo F (+1), AVC (+2), DM (+1) = 6 pontos
    assert.strictEqual(r.escore, 6);
    assert.ok(r.recomendacao.includes('Alto risco'));
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTES — HAS-BLED
// ═══════════════════════════════════════════════════════════════════════════

test('5. HAS-BLED: Risco baixo (escore 1)', () => {
    const r = Svc.calcularHASBLED({ hipertensaoNaoControlada: true });
    assert.strictEqual(r.escore, 1);
    assert.ok(r.interpretacao.includes('RISCO BAIXO'));
});

test('6. HAS-BLED: Risco alto (escore >= 3)', () => {
    const r = Svc.calcularHASBLED({ idadeMaior65: true, funcaoRenalAnormal: true, sangramentoPrevioOuPredisposicao: true });
    assert.strictEqual(r.escore, 3);
    assert.ok(r.interpretacao.includes('ALTO RISCO DE SANGRAMENTO'));
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTES — CONDUTA E AVALIAÇÃO GLOBAL
// ═══════════════════════════════════════════════════════════════════════════

test('7. Instabilidade hemodinâmica sugere CVE', () => {
    const r = Svc.avaliarCondutaAgudaFA({ instabilidadeHemodinamica: true });
    assert.ok(r.includes('PACIENTE INSTÁVEL'));
    assert.ok(r.includes('Cardioversão Elétrica'));
});

test('8. Conduta tempo < 48h (Amiodarona ou CVE permitidas)', () => {
    const r = Svc.avaliarCondutaAgudaFA({ instabilidadeHemodinamica: false, tempoSintomas: '<48h' });
    assert.ok(r.includes('< 48 horas'));
    assert.ok(r.includes('É SEGURA'));
});

test('9. Conduta tempo > 48h sugere anticoagulação por 3 semanas ou ECO-TE', () => {
    const r = Svc.avaliarCondutaAgudaFA({ instabilidadeHemodinamica: false, tempoSintomas: '>48h' });
    assert.ok(r.includes('> 48 horas'));
    assert.ok(r.includes('ALTO RISCO TROMBOEMBÓLICO'));
    assert.ok(r.includes('Estratégia A'));
    assert.ok(r.includes('Estratégia B'));
});

test('10. FA Valvar indica Varfarina', () => {
    const r = Svc.avaliarCondutaAgudaFA({ proteseMetalica: true });
    assert.ok(r.includes('FA VALVAR'));
    assert.ok(r.includes('CONTRAINDICADOS'));
});

test('11. Parser e Avaliação: Mulher 70 anos, HAS, instável com prótese metálica', () => {
    const r = Svc.avaliar(Svc.extrairParametrosTexto('mulher 70 anos has choque protese metalica'));
    assert.strictEqual(r.paciente.idade, 70);
    assert.strictEqual(r.paciente.sexo, 'F');
    // CHA2DS2VASc: Idade 65-74 (+1), F (+1), HAS (+1) = 3
    assert.strictEqual(r.cha2ds2vasc.escore, 3);
    assert.ok(r.conduta.includes('PACIENTE INSTÁVEL'));
    assert.ok(r.conduta.includes('Varfarina'));
});

console.log(`\nResultados Cardiologia FA Anticoagulacao: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
