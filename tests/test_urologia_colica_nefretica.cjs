const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Carrega o módulo globalmente via eval (padrão do projeto)
const codigoFonte = fs.readFileSync(path.join(__dirname, '../src/02_urologia_colica_nefretica.js'), 'utf8');
eval(codigoFonte);
const Svc = UrologiaColicaNefreticaService;

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
// TESTES — CÓLICA NEFRÉTICA
// ═══════════════════════════════════════════════════════════════════════════

test('1. Urologia: Gravidade - Rim único sugere descompressão cirúrgica', () => {
    const r = Svc.avaliarGravidade({ rimUnico: true });
    assert.strictEqual(r.urgencia, true);
    assert.ok(r.conduta.includes('DESCOMPRESSÃO CIRÚRGICA') || r.conduta.includes('DESCOMPRESSÃO IMEDIATA'));
});

test('2. Urologia: Analgesia com ClCr baixo bloqueia AINEs', () => {
    const r = Svc.avaliarAnalgesia({ clcr: 25 });
    assert.ok(r.includes('CONTRAINDICADOS'));
    assert.ok(r.includes('Opioides'));
});

test('3. Urologia: Terapia Expulsiva para cálculo de 7mm', () => {
    const r = Svc.avaliarTerapiaExpulsiva({ tamanhoCalculo: 7, localizacao: 'distal' });
    assert.ok(r.includes('Tansulosina 0.4mg VO'));
    assert.ok(r.includes('Indicação Confirmada'));
});

test('4. Urologia: Terapia Expulsiva bloqueada para > 10mm', () => {
    const r = Svc.avaliarTerapiaExpulsiva({ tamanhoCalculo: 12 });
    assert.ok(r.includes('CONTRAINDICADA'));
    assert.ok(r.includes('> 10 mm'));
});

test('5. Urologia: Analgesia padrão sugere AINEs', () => {
    const r = Svc.avaliarAnalgesia({ clcr: 100 });
    assert.ok(r.includes('Padrão-ouro'));
    assert.ok(r.includes('Cetoprofeno'));
});

test('6. Parser e Avaliação Completa', () => {
    const param = Svc.extrairParametrosTexto('paciente monoreno com febre dor refrataria calculo 15mm');
    assert.strictEqual(param.rimUnico, true);
    assert.strictEqual(param.sepseOuInfeccao, true);
    assert.strictEqual(param.tamanhoCalculo, 15);
    
    const r = Svc.avaliar(param);
    assert.strictEqual(r.gravidade.urgencia, true);
    assert.ok(r.met.includes('CONTRAINDICADA'));
});

console.log(`\nResultados Urologia Colica Nefretica: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
