const assert = require('assert');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

const scriptPath = path.join(__dirname, '../src/02_obstetricia_rcf_doppler.js');
const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context);
const Rcf = context.ObstetriciaRcfDopplerService;

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

test('Sem restrição - biometria e Doppler normais', () => {
    const r = Rcf.avaliarRcf({ ig_semanas: 30, peso_fetal_percentil: 45, ca_percentil: 50, au_ip_percentil: 50 });
    assert.strictEqual(r.classificacao.tipo, 'SEM_RESTRICAO');
    assert.strictEqual(r.estadiamento.estagio, null);
    assert.strictEqual(r.conduta.parto_indicado_agora, false);
    assert.strictEqual(r.corticoide.indicado, false);
});

test('PIG constitucional - PFE p7 com Doppler normal (parto a termo)', () => {
    const r = Rcf.avaliarRcf({ ig_semanas: 35, peso_fetal_percentil: 7, ca_percentil: 8, au_ip_percentil: 50, rcp_percentil: 40 });
    assert.strictEqual(r.classificacao.tipo, 'PIG');
    assert.strictEqual(r.estadiamento.estagio, 0);
    assert.strictEqual(r.conduta.ig_alvo_semanas, 39);
    assert.strictEqual(r.conduta.parto_indicado_agora, false);
    assert.ok(r.bloqueios_seguranca.some(b => b.includes('PIG com Doppler normal antes de 37 semanas')));
});

test('RCF precoce Estágio I - PFE < p3 isolado às 28 semanas', () => {
    const r = Rcf.avaliarRcf({ ig_semanas: 28, peso_fetal_percentil: 2, au_ip_percentil: 60 });
    assert.strictEqual(r.classificacao.tipo, 'RCF_PRECOCE');
    assert.strictEqual(r.estadiamento.estagio, 1);
    assert.strictEqual(r.conduta.ig_alvo_semanas, 37);
    assert.strictEqual(r.corticoide.indicado, false, 'Estágio I distante do parto não recebe corticoide de rotina');
    assert.ok(r.investigacao_etiologica.some(i => i.includes('CMV')));
});

test('RCF precoce - PFE p8 + uterinas > p95 (critério combinado Delphi)', () => {
    const r = Rcf.avaliarRcf({ ig_semanas: 26, peso_fetal_percentil: 8, uterinas_ip_percentil: 97 });
    assert.strictEqual(r.classificacao.tipo, 'RCF_PRECOCE');
    assert.ok(r.classificacao.criterios.some(c => c.includes('uterinas')));
    assert.strictEqual(r.estadiamento.estagio, 1);
});

test('RCF tardia - 2 de 3 critérios contributivos (PFE p8 + RCP < p5) às 35 semanas', () => {
    const r = Rcf.avaliarRcf({ ig_semanas: 35, ig_dias: 2, peso_fetal_percentil: 8, rcp_percentil: 3 });
    assert.strictEqual(r.classificacao.tipo, 'RCF_TARDIA');
    assert.strictEqual(r.estadiamento.estagio, 1);
    assert.strictEqual(r.ig.texto, '35s2d');
    assert.ok(r.conduta.decisao.includes('37+0'));
    assert.ok(r.conduta.via_parto.includes('Indução'));
});

test('RCF tardia Estágio I com 37 semanas - parto indicado agora', () => {
    const r = Rcf.avaliarRcf({ ig_semanas: 37, ig_dias: 1, peso_fetal_percentil: 2 });
    assert.strictEqual(r.estadiamento.estagio, 1);
    assert.strictEqual(r.conduta.parto_indicado_agora, true);
    assert.strictEqual(r.neuroprotecao_magnesio.indicado, false);
});

test('Estágio II - diástole zero na AU às 31 semanas (corticoide pendente, cesariana)', () => {
    const r = Rcf.avaliarRcf({ ig_semanas: 31, peso_fetal_percentil: 2, au_diastole: 'zero' });
    assert.strictEqual(r.classificacao.tipo, 'RCF_PRECOCE');
    assert.strictEqual(r.estadiamento.estagio, 2);
    assert.strictEqual(r.conduta.ig_alvo_semanas, 34);
    assert.ok(r.conduta.via_parto.includes('Cesariana'));
    assert.strictEqual(r.corticoide.indicado, false, 'Estágio II a 3 semanas do alvo: corticoide quando parto previsto em 7 dias');
    assert.ok(r.bloqueios_seguranca.some(b => b.includes('Evitar indução')));
});

test('Estágio II às 33+2 semanas - corticoide indicado (parto previsto em <= 7 dias)', () => {
    const r = Rcf.avaliarRcf({ ig_semanas: 33, ig_dias: 2, peso_fetal_percentil: 4, au_diastole: 'ausente' });
    assert.strictEqual(r.estadiamento.estagio, 2);
    assert.strictEqual(r.corticoide.indicado, true);
    assert.ok(r.corticoide.esquema.includes('Betametasona 12 mg IM'));
});

test('Estágio III - diástole reversa às 29 semanas (corticoide, sem parto ainda)', () => {
    const r = Rcf.avaliarRcf({ ig_semanas: 29, peso_fetal_percentil: 1, au_diastole: 'reversa', dv_onda_a: 'positiva', vcp_ms: 4.5 });
    assert.strictEqual(r.estadiamento.estagio, 3);
    assert.strictEqual(r.conduta.ig_alvo_semanas, 30);
    assert.strictEqual(r.conduta.parto_indicado_agora, false);
    assert.strictEqual(r.corticoide.indicado, true);
    assert.ok(r.corticoide.observacao.includes('VCP'));
    assert.ok(r.alertas.some(a => a.includes('TRUFFLE')));
});

test('Estágio III às 30+1 com IP do DV > p95 - parto com MgSO4 e corticoide', () => {
    const r = Rcf.avaliarRcf({ ig_semanas: 30, ig_dias: 1, peso_fetal_percentil: 2, dv_ip_percentil: 97 });
    assert.strictEqual(r.estadiamento.estagio, 3);
    assert.strictEqual(r.conduta.parto_indicado_agora, true);
    assert.strictEqual(r.neuroprotecao_magnesio.indicado, true);
    assert.ok(r.neuroprotecao_magnesio.esquema.includes('4 g IV'));
    assert.strictEqual(r.corticoide.indicado, true);
});

test('Estágio IV - onda A reversa no DV às 27 semanas (interrupção)', () => {
    const r = Rcf.avaliarRcf({ ig_semanas: 27, peso_fetal_percentil: 1, au_diastole: 'reversa', dv_onda_a: 'reversa' });
    assert.strictEqual(r.estadiamento.estagio, 4);
    assert.strictEqual(r.conduta.parto_indicado_agora, true);
    assert.ok(r.conduta.decisao.includes('INTERROMPER'));
    assert.ok(r.conduta.decisao.includes('NÃO postergar'));
    assert.strictEqual(r.neuroprotecao_magnesio.indicado, true);
    assert.strictEqual(r.doppler.marcadores.dv_ip_maior_p95, true);
});

test('Estágio IV por VCP - limiar TRUFFLE dependente da IG (2,6 ms < 29 sem; 3,0 ms >= 29 sem)', () => {
    const r28 = Rcf.avaliarRcf({ ig_semanas: 28, peso_fetal_percentil: 2, vcp_ms: 2.8 });
    assert.strictEqual(r28.estadiamento.estagio, 1, 'VCP 2,8 ms com 28 sem está acima do limiar 2,6');
    const r30 = Rcf.avaliarRcf({ ig_semanas: 30, peso_fetal_percentil: 2, vcp_ms: 2.8 });
    assert.strictEqual(r30.estadiamento.estagio, 4, 'VCP 2,8 ms com 30 sem está abaixo do limiar 3,0');
});

test('Estágio IV abaixo de 26 semanas e periviabilidade - decisão individualizada', () => {
    const r25 = Rcf.avaliarRcf({ ig_semanas: 25, peso_fetal_percentil: 1, desaceleracoes_espontaneas: true });
    assert.strictEqual(r25.estadiamento.estagio, 4);
    assert.strictEqual(r25.conduta.parto_indicado_agora, false);
    assert.ok(r25.conduta.decisao.includes('limite de viabilidade'));
    const r23 = Rcf.avaliarRcf({ ig_semanas: 23, peso_fetal_percentil: 1, dv_onda_a: 'ausente', peso_fetal_gramas: 420 });
    assert.ok(r23.conduta.decisao.includes('PERIVIABILIDADE'));
    assert.strictEqual(r23.corticoide.indicado, false);
    assert.ok(r23.alertas.some(a => a.includes('PFE < 500 g')));
});

test('Insuficiência placentária grave sem critério biométrico é conduzida como RCF', () => {
    const r = Rcf.avaliarRcf({ ig_semanas: 33, peso_fetal_percentil: 25, au_diastole: 'zero' });
    assert.strictEqual(r.classificacao.tipo, 'RCF_TARDIA');
    assert.strictEqual(r.estadiamento.estagio, 2);
});

test('RCP calculada: < 1,0 no 3º trimestre é alterada; >= 1,0 sem percentil é indeterminada', () => {
    const r1 = Rcf.avaliarRcf({ ig_semanas: 36, peso_fetal_percentil: 6, au_ip_valor: 1.2, acm_ip_valor: 1.0 });
    assert.strictEqual(r1.doppler.rcp.valor, 0.83);
    assert.strictEqual(r1.doppler.rcp.status, 'alterada');
    assert.strictEqual(r1.classificacao.tipo, 'RCF_TARDIA');
    const r2 = Rcf.avaliarRcf({ ig_semanas: 36, peso_fetal_percentil: 6, au_ip_valor: 0.9, acm_ip_valor: 1.1 });
    assert.strictEqual(r2.doppler.rcp.status, 'indeterminada');
    assert.strictEqual(r2.classificacao.tipo, 'PIG', 'Sem percentil não se pode afirmar RCP < p5');
    assert.ok(r2.alertas.some(a => a.includes('Confirmar o percentil')));
});

test('PIG com uterinas > p95 é rotulado como Estágio I', () => {
    const r = Rcf.avaliarRcf({ ig_semanas: 34, peso_fetal_percentil: 7, uterinas_ip_maior_p95: true });
    assert.strictEqual(r.classificacao.tipo, 'PIG');
    assert.strictEqual(r.estadiamento.estagio, 1);
    assert.ok(r.classificacao.titulo.includes('Estágio I'));
});

test('Doppler alterado em feto AIG gera alerta de reavaliação', () => {
    const r = Rcf.avaliarRcf({ ig_semanas: 36, peso_fetal_percentil: 30, acm_ip_percentil: 3 });
    assert.strictEqual(r.estadiamento.estagio, null);
    assert.ok(r.alertas.some(a => a.includes('biometria adequada')));
});

test('Validação de entrada - IG obrigatória, faixa e percentil inválido', () => {
    assert.throws(() => Rcf.avaliarRcf({ peso_fetal_percentil: 2 }), /Idade gestacional obrigatória/);
    assert.throws(() => Rcf.avaliarRcf({ ig_semanas: 16, peso_fetal_percentil: 2 }), /fora da faixa/);
    assert.throws(() => Rcf.avaliarRcf({ ig_semanas: 30, peso_fetal_percentil: 140 }), /Percentil inválido/);
    assert.strictEqual(Rcf.normalizarIg({ ig: '30+4' }).texto, '30s4d');
});

test('Alertas maternos e de escopo (pré-eclâmpsia, gemelar, oligoâmnio)', () => {
    const r = Rcf.avaliarRcf({ ig_semanas: 32, peso_fetal_percentil: 2, pre_eclampsia: true, gemelar: true, ila_cm: 4 });
    assert.ok(r.alertas.some(a => a.includes('indicação MATERNA')));
    assert.ok(r.alertas.some(a => a.includes('gemelar')));
    assert.ok(r.alertas.some(a => a.includes('Oligoâmnio')));
});

test('Bloqueios de segurança - sildenafila, AAS/heparina e repouso', () => {
    const r = Rcf.avaliarRcf({ ig_semanas: 30, peso_fetal_percentil: 2 });
    assert.ok(r.bloqueios_seguranca[0].includes('SILDENAFILA'));
    assert.ok(r.bloqueios_seguranca[1].includes('AAS e heparina'));
    assert.ok(r.bloqueios_seguranca.some(b => b.includes('Repouso absoluto')));
    assert.ok(r.referencias.length >= 5);
});

test('Parser de texto livre - Estágio IV com onda A reversa não vira diástole reversa da AU', () => {
    const p = Rcf.extrairParametrosTexto('ig 27s3d pfe p1 ca p2 au diastole zero dv onda a reversa vcp 2,4 450g');
    assert.strictEqual(p.ig_semanas, 27);
    assert.strictEqual(p.ig_dias, 3);
    assert.strictEqual(p.peso_fetal_percentil, 1);
    assert.strictEqual(p.ca_percentil, 2);
    assert.strictEqual(p.au_diastole, 'zero');
    assert.strictEqual(p.dv_onda_a, 'reversa');
    assert.strictEqual(p.vcp_ms, 2.4);
    assert.strictEqual(p.peso_fetal_gramas, 450);
    const r = Rcf.avaliarRcf(p);
    assert.strictEqual(r.estadiamento.estagio, 4);
});

test('Parser de texto livre - RCF tardia com RCP, uterinas e pré-eclâmpsia', () => {
    const p = Rcf.extrairParametrosTexto('35+2 pfe p6 rcp p3 acm p4 uterinas p97 queda de percentil pre-eclampsia oligoamnio');
    assert.strictEqual(p.ig_semanas, 35);
    assert.strictEqual(p.ig_dias, 2);
    assert.strictEqual(p.rcp_percentil, 3);
    assert.strictEqual(p.acm_ip_percentil, 4);
    assert.strictEqual(p.uterinas_ip_percentil, 97);
    assert.strictEqual(p.queda_percentil, true);
    assert.strictEqual(p.pre_eclampsia, true);
    assert.strictEqual(p.oligoamnio, true);
    assert.strictEqual(p.au_diastole, undefined, 'Nenhuma menção a diástole da AU');
    const r = Rcf.avaliarRcf(p);
    assert.strictEqual(r.classificacao.tipo, 'RCF_TARDIA');
    assert.strictEqual(r.estadiamento.estagio, 1);
});

test('Parser - "dr" e "dz" não são interpretados como diástole (segurança contra falso positivo)', () => {
    const p = Rcf.extrairParametrosTexto('dr wagner pediu dz ig 33 semanas pfe p5');
    assert.strictEqual(p.au_diastole, undefined);
    assert.strictEqual(p.ig_semanas, 33);
});

test('Exemplos da ajuda do Telegram produzem os estágios anunciados', () => {
    const casos = [
        ['35+2 pfe p6 rcp p3', 1],
        ['31s pfe p2 diastole zero', 2],
        ['27s3d pfe p1 diastole reversa onda a reversa vcp 2.4', 4]
    ];
    casos.forEach(([txt, estagio]) => {
        const r = Rcf.avaliarRcf(Rcf.extrairParametrosTexto(txt));
        assert.strictEqual(r.estadiamento.estagio, estagio, txt);
    });
});

test('Formatação Telegram - seções essenciais e fontes', () => {
    const r = Rcf.avaliarRcf({ ig_semanas: 30, ig_dias: 1, peso_fetal_percentil: 2, dv_ip_percentil: 97 });
    const txt = Rcf.formatarTextoTelegram(r);
    assert.ok(txt.includes('RCF / DOPPLER'));
    assert.ok(txt.includes('ESTADIAMENTO (BARCELONA): Estágio III'));
    assert.ok(txt.includes('CORTICOIDE ANTENATAL (INDICADO)'));
    assert.ok(txt.includes('NEUROPROTEÇÃO FETAL (INDICADA)'));
    assert.ok(txt.includes('BLOQUEIOS DE SEGURANÇA'));
    assert.ok(txt.includes('Fontes:'));
    assert.ok(!/undefined|NaN/.test(txt), 'Texto não deve conter undefined/NaN');
});

console.log(`\nResultados Obstetrícia RCF/Doppler: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
