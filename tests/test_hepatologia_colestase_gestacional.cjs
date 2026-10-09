const assert = require('assert');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

const scriptPath = path.join(__dirname, '../src/02_hepatologia_colestase_gestacional.js');
const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context);
const Svc = context.HepatologiaColestaseGestacionalService;

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
// TESTES — CIG (Colestase Intra-hepática da Gestação)
// ═══════════════════════════════════════════════════════════════════════════

test('Classificação ABT Normal (< 10): CIG não confirmada', () => {
    const r = Svc.classificarGravidadeCIG(8);
    assert.strictEqual(r.gravidade, 'NORMAL');
    assert.strictEqual(r.timing_parto, null);
});

test('Classificação ABT Leve (10-39): parto 38+0 semanas', () => {
    const r = Svc.classificarGravidadeCIG(25);
    assert.strictEqual(r.gravidade, 'LEVE');
    assert.strictEqual(r.timing_parto.ig_semanas, 38);
});

test('Classificação ABT Moderada (40-99): parto 37+0 semanas', () => {
    const r = Svc.classificarGravidadeCIG(75);
    assert.strictEqual(r.gravidade, 'MODERADA');
    assert.strictEqual(r.timing_parto.ig_semanas, 37);
});

test('Classificação ABT Grave (>= 100): parto 36+0 semanas com risco de óbito fetal', () => {
    const r = Svc.classificarGravidadeCIG(150);
    assert.strictEqual(r.gravidade, 'GRAVE');
    assert.strictEqual(r.timing_parto.ig_semanas, 36);
    assert.ok(r.faixa.risco_fetal.includes('3,44%'));
});

test('ABT no limiar exato: 10 = LEVE, 40 = MODERADA, 100 = GRAVE', () => {
    assert.strictEqual(Svc.classificarGravidadeCIG(10).gravidade, 'LEVE');
    assert.strictEqual(Svc.classificarGravidadeCIG(39).gravidade, 'LEVE');
    assert.strictEqual(Svc.classificarGravidadeCIG(40).gravidade, 'MODERADA');
    assert.strictEqual(Svc.classificarGravidadeCIG(99).gravidade, 'MODERADA');
    assert.strictEqual(Svc.classificarGravidadeCIG(100).gravidade, 'GRAVE');
});

test('ABT inválido lança erro', () => {
    assert.throws(() => Svc.classificarGravidadeCIG(-5), /número >= 0/);
    assert.throws(() => Svc.classificarGravidadeCIG('abc'), /número >= 0/);
});

test('Dose UDCA para 70kg: 700-1050 mg/dia, divisão em 2 tomadas', () => {
    const d = Svc.calcularDoseUDCA(70);
    assert.strictEqual(d.dose_min_mg, 700);
    assert.strictEqual(d.dose_max_mg, 1050);
    assert.ok(d.dose_diaria_texto.includes('700'));
    assert.ok(d.dose_diaria_texto.includes('1050'));
    // Dose <= 900 seria 2x, mas 1050 > 900 → 3x
    assert.strictEqual(d.num_tomadas, 3);
});

test('Dose UDCA para 55kg: 550-825 mg/dia, 2 tomadas (dose <= 900)', () => {
    const d = Svc.calcularDoseUDCA(55);
    assert.strictEqual(d.dose_min_mg, 550);
    assert.ok(d.dose_max_mg <= 850);
    assert.strictEqual(d.num_tomadas, 2);
});

test('Dose UDCA não excede teto absoluto de 2000 mg/dia', () => {
    const d = Svc.calcularDoseUDCA(200);
    assert.ok(d.dose_max_mg <= 2000);
});

test('Peso inválido lança erro no cálculo UDCA', () => {
    assert.throws(() => Svc.calcularDoseUDCA(0), /positivo/);
    assert.throws(() => Svc.calcularDoseUDCA(-10), /positivo/);
});

test('Avaliação CIG Leve completa (ABT 20, 70kg, 34 semanas)', () => {
    const r = Svc.avaliarCIG({ acidos_biliares: 20, peso: 70, ig_semanas: 34 });
    assert.strictEqual(r.diagnostico, 'COLESTASE_INTRAHEPATICA_GESTACIONAL');
    assert.strictEqual(r.classificacao.gravidade, 'LEVE');
    assert.ok(r.tratamento.farmacologico.length >= 1);
    assert.ok(r.tratamento.farmacologico[0].farmaco.includes('UDCA'));
    assert.strictEqual(r.parto.ig_alvo_semanas, 38);
    assert.strictEqual(r.parto.parto_indicado_agora, false);
    assert.ok(r.bloqueios_seguranca.length >= 3);
    assert.ok(r.referencias.length >= 5);
});

test('CIG Grave com IG >= alvo: parto indicado agora', () => {
    const r = Svc.avaliarCIG({ acidos_biliares: 120, peso: 65, ig_semanas: 37 });
    assert.strictEqual(r.classificacao.gravidade, 'GRAVE');
    assert.strictEqual(r.parto.parto_indicado_agora, true);
    assert.ok(r.alertas.some(a => a.includes('3,44%')));
    assert.ok(r.alertas.some(a => a.includes('CTG NÃO é preditiva')));
});

test('CIG Grave: vitamina K indicada', () => {
    const r = Svc.avaliarCIG({ acidos_biliares: 100, ig_semanas: 35 });
    assert.ok(r.parto.vitamina_k);
    assert.strictEqual(r.parto.vitamina_k.indicada, true);
    assert.ok(r.parto.vitamina_k.dose.includes('Fitomenadiona'));
});

test('CIG com ABT < 10: diagnóstico não confirmado', () => {
    const r = Svc.avaliarCIG({ acidos_biliares: 7 });
    assert.strictEqual(r.diagnostico, 'NAO_CONFIRMADO');
    assert.ok(r.alertas.some(a => a.includes('não confirmada')));
});

test('CIG com antecedente e gemelar: alertas específicos', () => {
    const r = Svc.avaliarCIG({ acidos_biliares: 30, antecedente_cig: true, gestacao_gemelar: true });
    assert.ok(r.alertas.some(a => a.includes('recorrência')));
    assert.ok(r.alertas.some(a => a.includes('gemelar')));
});

test('CIG com TGO elevada: alerta de hepatite viral', () => {
    const r = Svc.avaliarCIG({ acidos_biliares: 50, tgo: 350 });
    assert.ok(r.alertas.some(a => a.includes('hepatites virais')));
});

test('CIG com bilirrubina > 2,0: alerta de investigação alternativa', () => {
    const r = Svc.avaliarCIG({ acidos_biliares: 45, bilirrubina_total: 3.5 });
    assert.ok(r.alertas.some(a => a.includes('Bilirrubina > 2,0')));
});

test('Bloqueios de segurança incluem Colestiramina, Dexa e SAMe', () => {
    const r = Svc.avaliarCIG({ acidos_biliares: 50 });
    assert.ok(r.bloqueios_seguranca.some(b => b.includes('Colestiramina')));
    assert.ok(r.bloqueios_seguranca.some(b => b.includes('Dexametasona')));
    assert.ok(r.bloqueios_seguranca.some(b => b.includes('SAMe')));
});

test('Sem peso: dose UDCA genérica informando 10-15 mg/kg/dia', () => {
    const r = Svc.avaliarCIG({ acidos_biliares: 30 });
    assert.ok(r.tratamento.farmacologico[0].dose.includes('10-15 mg/kg/dia'));
});

test('Parâmetro obrigatório: acidos_biliares', () => {
    assert.throws(() => Svc.avaliarCIG({}), /acidos_biliares/);
    assert.throws(() => Svc.avaliarCIG({ peso: 70 }), /acidos_biliares/);
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTES — EHAG (Esteatose Hepática Aguda da Gestação)
// ═══════════════════════════════════════════════════════════════════════════

test('Swansea: 6 critérios = EHAG confirmada', () => {
    const r = Svc.avaliarSwansea({
        vomitos: true,
        dor_abdominal: true,
        hipoglicemia: true,
        encefalopatia: true,
        bilirrubina_elevada: true,
        coagulopatia: true
    });
    assert.strictEqual(r.diagnostico, 'EHAG_CONFIRMADA');
    assert.strictEqual(r.confirmado, true);
    assert.strictEqual(r.total_presentes, 6);
    assert.ok(r.protocolo);
    assert.ok(r.protocolo.prioridade.includes('EMERGÊNCIA'));
    assert.ok(r.alertas.some(a => a.includes('EMERGÊNCIA OBSTÉTRICA')));
});

test('Swansea: 5 critérios = EHAG não confirmada', () => {
    const r = Svc.avaliarSwansea({
        vomitos: true,
        dor_abdominal: true,
        hipoglicemia: true,
        encefalopatia: true,
        bilirrubina_elevada: true
    });
    assert.strictEqual(r.diagnostico, 'EHAG_NAO_CONFIRMADA');
    assert.strictEqual(r.confirmado, false);
    assert.strictEqual(r.protocolo, null);
    assert.ok(r.alertas.some(a => a.includes('5/6')));
});

test('EHAG confirmada: protocolo inclui estabilização de hipoglicemia', () => {
    const r = Svc.avaliarSwansea({
        vomitos: true, dor_abdominal: true, hipoglicemia: true,
        encefalopatia: true, bilirrubina_elevada: true, coagulopatia: true,
        transaminases_elevadas: true
    });
    assert.ok(r.protocolo.estabilizacao_pre_parto.some(e => e.includes('HIPOGLICEMIA')));
    assert.ok(r.protocolo.estabilizacao_pre_parto.some(e => e.includes('Glicose hipertônica')));
});

test('EHAG confirmada: protocolo inclui correção de coagulopatia', () => {
    const r = Svc.avaliarSwansea({
        vomitos: true, dor_abdominal: true, hipoglicemia: true,
        encefalopatia: true, bilirrubina_elevada: true, coagulopatia: true
    });
    assert.ok(r.protocolo.estabilizacao_pre_parto.some(e => e.includes('COAGULOPATIA')));
    assert.ok(r.protocolo.estabilizacao_pre_parto.some(e => e.includes('Plasma Fresco')));
    assert.ok(r.protocolo.estabilizacao_pre_parto.some(e => e.includes('Vitamina K1')));
});

test('EHAG confirmada: protocolo inclui encefalopatia e NAC', () => {
    const r = Svc.avaliarSwansea({
        vomitos: true, dor_abdominal: true, hipoglicemia: true,
        encefalopatia: true, bilirrubina_elevada: true, coagulopatia: true
    });
    assert.ok(r.protocolo.estabilizacao_pre_parto.some(e => e.includes('ENCEFALOPATIA')));
    assert.ok(r.protocolo.estabilizacao_pre_parto.some(e => e.includes('Lactulose')));
    assert.ok(r.protocolo.estabilizacao_pre_parto.some(e => e.includes('N-acetilcisteína')));
});

test('EHAG: equipe multidisciplinar completa', () => {
    const r = Svc.avaliarSwansea({
        vomitos: true, dor_abdominal: true, hipoglicemia: true,
        encefalopatia: true, bilirrubina_elevada: true, coagulopatia: true
    });
    assert.ok(r.protocolo.equipe.some(e => e.includes('Obstetra')));
    assert.ok(r.protocolo.equipe.some(e => e.includes('Hepatologista')));
    assert.ok(r.protocolo.equipe.some(e => e.includes('Anestesiologista')));
    assert.ok(r.protocolo.equipe.some(e => e.includes('Neonatologista')));
});

test('Swansea: objeto inválido lança erro', () => {
    assert.throws(() => Svc.avaliarSwansea(null), /objeto/);
    assert.throws(() => Svc.avaliarSwansea('texto'), /objeto/);
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTES — DIAGNÓSTICO DIFERENCIAL
// ═══════════════════════════════════════════════════════════════════════════

test('Diagnóstico diferencial: ABT elevados sugere CIG', () => {
    const r = Svc.diagnosticoDiferencial({ acidos_biliares: 50 });
    assert.ok(r.diagnosticos_provaveis.includes('CIG'));
    assert.ok(r.tabela.length >= 3);
});

test('Diagnóstico diferencial: hipoglicemia + encefalopatia sugere EHAG', () => {
    const r = Svc.diagnosticoDiferencial({ hipoglicemia: true, encefalopatia: true });
    assert.ok(r.diagnosticos_provaveis.includes('EHAG/AFLP'));
});

test('Diagnóstico diferencial: plaquetas baixas + hipertensão sugere HELLP', () => {
    const r = Svc.diagnosticoDiferencial({ plaquetas_baixas: true, hipertensao: true });
    assert.ok(r.diagnosticos_provaveis.includes('HELLP'));
});

test('Diagnóstico diferencial: sem dados = mensagem insuficiente', () => {
    const r = Svc.diagnosticoDiferencial({});
    assert.ok(r.diagnosticos_provaveis[0].includes('insuficientes'));
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTES — PARSER DE TEXTO LIVRE
// ═══════════════════════════════════════════════════════════════════════════

test('Parser: extrai ABT, peso e IG de texto livre', () => {
    const p = Svc.extrairParametrosTexto('abt 85 peso 72kg 35 semanas');
    assert.strictEqual(p.acidos_biliares, 85);
    assert.strictEqual(p.peso, 72);
    assert.strictEqual(p.ig_semanas, 35);
});

test('Parser: extrai IG com dias', () => {
    const p = Svc.extrairParametrosTexto('34+5 acidos biliares 120');
    assert.strictEqual(p.ig_semanas, 34);
    assert.strictEqual(p.ig_dias, 5);
    assert.strictEqual(p.acidos_biliares, 120);
});

test('Parser: detecta prurido, antecedente e gemelar', () => {
    const p = Svc.extrairParametrosTexto('prurido palmoplantar antecedente de CIG gemelar ab 45');
    assert.strictEqual(p.prurido, true);
    assert.strictEqual(p.antecedente_cig, true);
    assert.strictEqual(p.gestacao_gemelar, true);
    assert.strictEqual(p.acidos_biliares, 45);
});

test('Parser: detecta modo EHAG e critérios de Swansea', () => {
    const p = Svc.extrairParametrosTexto('ehag vômito dor epigástrica hipoglicemia encefalopatia bilirrubina elevada coagulopatia tgo 580');
    assert.strictEqual(p.modo, 'EHAG');
    assert.ok(p.swansea);
    assert.strictEqual(p.swansea.vomitos, true);
    assert.strictEqual(p.swansea.dor_abdominal, true);
    assert.strictEqual(p.swansea.hipoglicemia, true);
    assert.strictEqual(p.swansea.encefalopatia, true);
    assert.strictEqual(p.swansea.bilirrubina_elevada, true);
    assert.strictEqual(p.swansea.coagulopatia, true);
    assert.strictEqual(p.swansea.transaminases_elevadas, true);
    assert.strictEqual(p.tgo, 580);
});

test('Parser: texto vazio retorna objeto vazio', () => {
    const p = Svc.extrairParametrosTexto('');
    assert.strictEqual(Object.keys(p).length, 0);
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTES — FUNÇÃO UNIFICADA avaliar()
// ═══════════════════════════════════════════════════════════════════════════

test('avaliar(): despacha para CIG quando acidos_biliares informado', () => {
    const r = Svc.avaliar({ acidos_biliares: 50, peso: 70, ig_semanas: 35 });
    assert.strictEqual(r.diagnostico, 'COLESTASE_INTRAHEPATICA_GESTACIONAL');
    assert.strictEqual(r.classificacao.gravidade, 'MODERADA');
});

test('avaliar(): despacha para EHAG quando modo = EHAG', () => {
    const r = Svc.avaliar({
        modo: 'EHAG',
        swansea: { vomitos: true, dor_abdominal: true, hipoglicemia: true,
                   encefalopatia: true, bilirrubina_elevada: true, coagulopatia: true }
    });
    assert.strictEqual(r.diagnostico, 'EHAG_CONFIRMADA');
});

test('avaliar(): sem dados suficientes lança erro', () => {
    assert.throws(() => Svc.avaliar({}), /acidos_biliares.*EHAG/);
    assert.throws(() => Svc.avaliar(null), /obrigatórios/);
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTES — FORMATAÇÃO TELEGRAM
// ═══════════════════════════════════════════════════════════════════════════

test('Formatação Telegram CIG: seções essenciais presentes', () => {
    const r = Svc.avaliarCIG({ acidos_biliares: 75, peso: 70, ig_semanas: 36 });
    const txt = Svc.formatarTextoTelegram(r);
    assert.ok(txt.includes('COLESTASE INTRA-HEPÁTICA'));
    assert.ok(txt.includes('ÁCIDOS BILIARES'));
    assert.ok(txt.includes('CLASSIFICAÇÃO'));
    assert.ok(txt.includes('TRATAMENTO'));
    assert.ok(txt.includes('VIGILÂNCIA'));
    assert.ok(txt.includes('PROGRAMAÇÃO DO PARTO'));
    assert.ok(txt.includes('BLOQUEIOS DE SEGURANÇA'));
    assert.ok(txt.includes('Fontes:'));
    assert.ok(!/undefined|NaN/.test(txt), 'Texto não deve conter undefined/NaN');
});

test('Formatação Telegram CIG Grave: parto indicado agora', () => {
    const r = Svc.avaliarCIG({ acidos_biliares: 150, peso: 65, ig_semanas: 37 });
    const txt = Svc.formatarTextoTelegram(r);
    assert.ok(txt.includes('PARTO INDICADO AGORA'));
});

test('Formatação Telegram EHAG: seções de emergência presentes', () => {
    const r = Svc.avaliarSwansea({
        vomitos: true, dor_abdominal: true, hipoglicemia: true,
        encefalopatia: true, bilirrubina_elevada: true, coagulopatia: true
    });
    const txt = Svc.formatarTextoTelegram(r);
    assert.ok(txt.includes('ESTEATOSE HEPÁTICA AGUDA'));
    assert.ok(txt.includes('CRITÉRIOS DE SWANSEA'));
    assert.ok(txt.includes('✅ CONFIRMADA'));
    assert.ok(txt.includes('EQUIPE MULTIDISCIPLINAR'));
    assert.ok(txt.includes('ESTABILIZAÇÃO PRÉ-PARTO'));
    assert.ok(txt.includes('PARTO'));
    assert.ok(txt.includes('PÓS-PARTO'));
    assert.ok(!/undefined|NaN/.test(txt), 'Texto não deve conter undefined/NaN');
});

test('Formatação Telegram CIG não confirmada', () => {
    const r = Svc.avaliarCIG({ acidos_biliares: 5 });
    const txt = Svc.formatarTextoTelegram(r);
    assert.ok(txt.includes('não confirmada'));
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTES — CORTICOIDE ANTENATAL
// ═══════════════════════════════════════════════════════════════════════════

test('CIG Grave às 35 semanas (parto alvo 36): corticoide indicado', () => {
    const r = Svc.avaliarCIG({ acidos_biliares: 120, ig_semanas: 35 });
    assert.strictEqual(r.parto.corticoide.indicado, true);
    assert.ok(r.parto.corticoide.esquema.includes('Betametasona'));
});

test('CIG Leve às 34 semanas (parto alvo 38): corticoide NÃO indicado (distante)', () => {
    const r = Svc.avaliarCIG({ acidos_biliares: 20, ig_semanas: 34 });
    assert.strictEqual(r.parto.corticoide.indicado, false);
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTES — CONSTANTES EXPORTADAS
// ═══════════════════════════════════════════════════════════════════════════

test('Constantes clínicas exportadas corretamente', () => {
    assert.ok(Svc.CRITERIOS_SWANSEA.length === 14);
    assert.ok(Svc.FAIXAS_ABT.LEVE.min === 10);
    assert.ok(Svc.FAIXAS_ABT.GRAVE.min === 100);
    assert.ok(Svc.REFERENCIAS.length >= 5);
});

console.log(`\nResultados Hepatologia Colestase Gestacional: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
