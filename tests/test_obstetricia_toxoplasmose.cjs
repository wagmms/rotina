const assert = require('assert');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

const scriptPath = path.join(__dirname, '../src/02_obstetricia_toxoplasmose.js');
const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context);
const Svc = context.ObstetriciaToxoplasmoseService;

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

// ═══════════════════════════════════════════════════════════════════════════
// TESTES — INTERPRETAÇÃO SOROLÓGICA (MS / FEBRASGO)
// ═══════════════════════════════════════════════════════════════════════════

test('1. Suscetível: IgG- / IgM- orienta prevenção primária e sorologia trimestral', () => {
    const r = Svc.avaliar({ ig: 12, igg: 'NEGATIVO', igm: 'NEGATIVO' });
    assert.strictEqual(r.sorologia.cenario, 'SUSCETÍVEL');
    assert.ok(r.sorologia.conduta_imediata.includes('trimestralmente'));
    assert.strictEqual(r.tratamento_fetal, null);
    assert.strictEqual(r.sorologia.tratamento, null);
    assert.ok(r.sorologia.orientacoes.length >= 4);
    assert.ok(r.bloqueios_seguranca.some(b => b.includes('trimestralmente')));
});

test('2. Imune: IgG+ / IgM- confirma imunidade pregressa sem novas sorologias de rotina', () => {
    const r = Svc.avaliar({ ig: 14, igg: 'POSITIVO', igm: 'NEGATIVO' });
    assert.strictEqual(r.sorologia.cenario, 'IMUNIDADE PREGRESSA');
    assert.ok(r.sorologia.conduta_imediata.includes('Tranquilizar'));
    assert.strictEqual(r.sorologia.tratamento, null);
});

test('3. Aguda recente ou IgM falso-positivo: IgG- / IgM+ inicia Espiramicina e repete em 2-3 sem', () => {
    const r = Svc.avaliar({ ig: 10, igg: 'NEGATIVO', igm: 'POSITIVO' });
    assert.ok(r.sorologia.cenario.includes('INFECÇÃO AGUDA RECENTE'));
    assert.ok(r.sorologia.conduta_imediata.includes('Espiramicina'));
    assert.ok(r.sorologia.tratamento.medicamentos[0].farmaco.includes('Espiramicina'));
});

test('4. 1º trimestre com IgG+ / IgM+ e Avidez pendente: inicia Espiramicina e solicita avidez urgente', () => {
    const r = Svc.avaliar({ ig: 11, igg: 'POSITIVO', igm: 'POSITIVO', avidez_igg: 'PENDENTE' });
    assert.strictEqual(r.sorologia.cenario, 'INFECÇÃO AGUDA SUSPEITA (AVIDEZ PENDENTE)');
    assert.ok(r.sorologia.conduta_imediata.includes('Espiramicina'));
    assert.strictEqual(r.sorologia.tratamento.medicamentos[0].farmaco, 'Espiramicina');
});

test('5. 1º trimestre com IgG+ / IgM+ e Avidez ALTA textual: afasta infecção gestacional e suspende medicação', () => {
    const r = Svc.avaliar({ ig: 12, igg: 'POSITIVO', igm: 'POSITIVO', avidez_igg: 'ALTA' });
    assert.strictEqual(r.sorologia.cenario, 'INFECÇÃO PREGRESSA (AVIDEZ ALTA)');
    assert.ok(r.sorologia.conduta_imediata.includes('Suspender Espiramicina'));
    assert.strictEqual(r.sorologia.tratamento, null);
});

test('6. 1º trimestre com Avidez numérica >= 60% (68%): normaliza como ALTA e suspende espiramicina', () => {
    const r = Svc.avaliar({ ig: 13, igg: 'POSITIVO', igm: 'POSITIVO', avidez_igg: 68 });
    assert.strictEqual(r.sorologia.cenario, 'INFECÇÃO PREGRESSA (AVIDEZ ALTA)');
    assert.strictEqual(Svc.normalizarAvidez(68), 'ALTA');
});

test('7. 1º trimestre com Avidez BAIXA (< 50% ou 25%): confirma infecção aguda e programa investigação fetal', () => {
    const r = Svc.avaliar({ ig: 14, igg: 'POSITIVO', igm: 'POSITIVO', avidez_igg: 25 });
    assert.strictEqual(r.sorologia.cenario, 'INFECÇÃO AGUDA MATERNA CONFIRMADA');
    assert.ok(r.sorologia.conduta_imediata.includes('Espiramicina'));
    assert.ok(r.sorologia.investigacao_fetal.exame.includes('PCR'));
    assert.ok(r.sorologia.investigacao_fetal.timing.includes('18 semanas'));
});

test('8. Coleta tardia (> 16 semanas): mesmo com avidez alta, considera aguda provável', () => {
    const r = Svc.avaliar({ ig: 22, igg: 'POSITIVO', igm: 'POSITIVO', avidez_igg: 'ALTA', ig_exame: 22 });
    assert.ok(r.sorologia.cenario.includes('COLETA TARDIA'));
    assert.ok(r.sorologia.conduta_imediata.includes('Espiramicina'));
    assert.ok(r.sorologia.investigacao_fetal !== null);
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTES — DIAGNÓSTICO E TRATAMENTO FETAL (ESQUEMA TRÍPLICE)
// ═══════════════════════════════════════════════════════════════════════════

test('9. Amniocentese com PCR POSITIVO: substitui Espiramicina por Esquema Tríplice', () => {
    const r = Svc.avaliar({ ig: 20, igg: 'POSITIVO', igm: 'POSITIVO', pcr_amniotico: 'POSITIVO' });
    assert.strictEqual(r.sorologia.tratamento, null);
    assert.ok(r.tratamento_fetal !== null);
    assert.strictEqual(r.tratamento_fetal.medicamentos.length, 3);
    assert.strictEqual(r.tratamento_fetal.medicamentos[0].farmaco, 'Sulfadiazina');
    assert.strictEqual(r.tratamento_fetal.medicamentos[1].farmaco, 'Pirimetamina');
    assert.strictEqual(r.tratamento_fetal.medicamentos[2].farmaco, 'Ácido Folínico (Leucovorina)');
});

test('10. Amniocentese com PCR NEGATIVO: mantém Espiramicina e vigilância USG', () => {
    const r = Svc.avaliar({ ig: 21, igg: 'POSITIVO', igm: 'POSITIVO', pcr_amniotico: 'NEGATIVO' });
    assert.strictEqual(r.tratamento_fetal, null);
    assert.ok(r.sorologia.conduta_imediata.includes('PCR NEGATIVO'));
    assert.ok(r.sorologia.conduta_imediata.includes('Espiramicina'));
});

test('11. USG alterado (hidrocefalia/calcificações): indica Esquema Tríplice mesmo sem PCR prévio', () => {
    const r = Svc.avaliar({ ig: 24, igg: 'POSITIVO', igm: 'POSITIVO', usg_alterado: true });
    assert.ok(r.tratamento_fetal !== null);
    assert.ok(r.sorologia.conduta_imediata.includes('INFECÇÃO FETAL CONFIRMADA'));
});

test('12. Paciente alérgica a sulfa: usa Clindamicina no lugar da Sulfadiazina', () => {
    const r = Svc.avaliar({ ig: 22, igg: 'POSITIVO', igm: 'POSITIVO', pcr_amniotico: 'POSITIVO', alergia_sulfa: true });
    assert.ok(r.tratamento_fetal !== null);
    assert.strictEqual(r.tratamento_fetal.medicamentos[0].farmaco, 'Clindamicina');
    assert.strictEqual(r.tratamento_fetal.medicamentos[1].farmaco, 'Pirimetamina');
    assert.strictEqual(r.tratamento_fetal.medicamentos[2].farmaco, 'Ácido Folínico (Leucovorina)');
});

test('13. Gestante a termo (>= 37 semanas) com esquema tríplice: alerta crítico de Kernicterus', () => {
    const r = Svc.avaliar({ ig: 38, igg: 'POSITIVO', igm: 'POSITIVO', pcr_amniotico: 'POSITIVO' });
    assert.ok(r.alertas.some(a => a.includes('Kernicterus')));
    assert.ok(r.alertas.some(a => a.includes('Espiramicina')));
});

test('14. Infecção no 3º trimestre tardio (>= 32 semanas): indica Esquema Tríplice direto por alta taxa de transmissão', () => {
    const r = Svc.avaliar({ ig: 34, igg: 'POSITIVO', igm: 'POSITIVO', avidez_igg: 'BAIXA' });
    assert.ok(r.tratamento_fetal !== null);
    assert.ok(r.sorologia.conduta_imediata.includes('>= 32 semanas'));
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTES — BLOQUEIOS DE SEGURANÇA E VALIDAÇÕES
// ═══════════════════════════════════════════════════════════════════════════

test('15. Bloqueios de segurança: Ácido Folínico obrigatório e monitorização com hemograma', () => {
    const r = Svc.avaliar({ ig: 26, igg: 'POSITIVO', igm: 'POSITIVO', pcr_amniotico: 'POSITIVO' });
    assert.ok(r.bloqueios_seguranca.some(b => b.includes('ÁCIDO FOLÍNICO')));
    assert.ok(r.bloqueios_seguranca.some(b => b.includes('HEMOGRAMA')));
});

test('16. Bloqueio de amniocentese antes de 18 semanas', () => {
    const r = Svc.avaliar({ ig: 14, igg: 'POSITIVO', igm: 'POSITIVO', avidez_igg: 'BAIXA' });
    assert.ok(r.bloqueios_seguranca.some(b => b.includes('NÃO realizar amniocentese antes de 18 semanas')));
});

test('17. Validação de IG inválida lança erro', () => {
    assert.throws(() => Svc.avaliar({ ig: 2, igg: 'POSITIVO' }), /semanas/);
    assert.throws(() => Svc.avaliar({ ig: 45, igg: 'POSITIVO' }), /semanas/);
    assert.throws(() => Svc.avaliar(null), /semanas/);
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTES — PARSER DE TEXTO LIVRE E FORMATAÇÃO TELEGRAM
// ═══════════════════════════════════════════════════════════════════════════

test('18. Parser de texto livre: extrai IG, sorologias e avidez percentual', () => {
    const p = Svc.extrairParametrosTexto('gestante 14s igg reagente igm reagente avidez 28%');
    assert.strictEqual(p.ig, 14);
    assert.strictEqual(p.igg, 'POSITIVO');
    assert.strictEqual(p.igm, 'POSITIVO');
    assert.strictEqual(p.avidez_igg, 28);
    const r = Svc.avaliar(p);
    assert.strictEqual(r.sorologia.cenario, 'INFECÇÃO AGUDA MATERNA CONFIRMADA');
});

test('19. Parser: detecta PCR positivo e alergia a sulfa', () => {
    const p = Svc.extrairParametrosTexto('22 semanas igg positivo igm positivo pcr positivo alergica a sulfa');
    assert.strictEqual(p.ig, 22);
    assert.strictEqual(p.pcr_amniotico, 'POSITIVO');
    assert.strictEqual(p.alergia_sulfa, true);
    const r = Svc.avaliar(p);
    assert.strictEqual(r.tratamento_fetal.medicamentos[0].farmaco, 'Clindamicina');
});

test('20. Formatação Telegram: seções essenciais presentes sem undefined ou NaN', () => {
    const r = Svc.avaliar({ ig: 26, igg: 'POSITIVO', igm: 'POSITIVO', pcr_amniotico: 'POSITIVO' });
    const txt = Svc.formatarTextoTelegram(r);
    assert.ok(txt.includes('TOXOPLASMOSE NA GESTAÇÃO'));
    assert.ok(txt.includes('TRATAMENTO FETAL INTRAÚTERO'));
    assert.ok(txt.includes('BLOQUEIOS DE SEGURANÇA'));
    assert.ok(txt.includes('Fontes:'));
    assert.ok(!/undefined|NaN/.test(txt), 'Texto formatado não pode conter undefined ou NaN');
});

console.log(`\nResultados Obstetrícia Toxoplasmose: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
