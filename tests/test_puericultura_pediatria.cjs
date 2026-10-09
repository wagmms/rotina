/**
 * ==============================================================================
 * SUÍTE DE TESTES: PAINEL DE PUERICULTURA E DESENVOLVIMENTO INFANTIL
 * ==============================================================================
 * Valida:
 *  1. Suplementação de Ferro e Vitamina D (SBP)
 *  2. Avaliação de DNPM por faixa etária
 *  3. Avaliação Antropométrica (IMC e Z-scores)
 *  4. Calendário Vacinal do PNI 2026
 *  5. Integração RPC via cockpitPainelPuericultura
 * ==============================================================================
 */

const assert = require('assert');
const PuericulturaPediatriaService = require('../src/02_puericultura_pediatria.js');
const runtime = require('../server/runtime.js');
const ctx = runtime.ctx;

console.log('👶 Iniciando bateria de testes do Serviço de Puericultura e Pediatria...\n');

let totalTestes = 0;
let aprovados = 0;

function test(descricao, fn) {
  totalTestes++;
  try {
    fn();
    console.log(`[PASS] ${descricao}`);
    aprovados++;
  } catch (error) {
    console.error(`[FAIL] ${descricao}\n       ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SUPLEMENTAÇÃO PROFILÁTICA (FERRO E VITAMINA D)
// ─────────────────────────────────────────────────────────────────────────────
test('Deve indicar Vitamina D 400 UI para menor de 1 ano e 600 UI de 1 a 2 anos', () => {
    let r1 = PuericulturaPediatriaService.orientarSuplementacao(6, 3200, true);
    assert.match(r1.vitamina_d, /400 UI/);
    
    let r2 = PuericulturaPediatriaService.orientarSuplementacao(15, 3200, true);
    assert.match(r2.vitamina_d, /600 UI/);
    
    let r3 = PuericulturaPediatriaService.orientarSuplementacao(25, 3200, true);
    assert.equal(r3.vitamina_d, "Não indicada para a idade atual.");
});

test('Deve indicar Ferro elementar 1 mg/kg/dia aos 6 meses para nascido a termo com AME', () => {
    let r1 = PuericulturaPediatriaService.orientarSuplementacao(6, 3200, true);
    assert.match(r1.ferro, /1 mg\/kg\/dia \(iniciar aos 6 meses/);
    
    let r2 = PuericulturaPediatriaService.orientarSuplementacao(4, 3200, true);
    assert.match(r2.ferro, /Não indicado no momento/);
});

test('Deve indicar Ferro elementar 1 mg/kg/dia aos 3 meses para nascido a termo SEM AME', () => {
    let r1 = PuericulturaPediatriaService.orientarSuplementacao(3, 3200, false);
    assert.match(r1.ferro, /1 mg\/kg\/dia \(iniciar aos 3 meses/);
});

test('Deve indicar Ferro elementar de acordo com peso de nascimento para prematuros', () => {
    let r1 = PuericulturaPediatriaService.orientarSuplementacao(1, 1400, true);
    assert.match(r1.ferro, /3 mg\/kg\/dia/);
    
    let r2 = PuericulturaPediatriaService.orientarSuplementacao(1, 900, true);
    assert.match(r2.ferro, /4 mg\/kg\/dia/);
    
    let r3 = PuericulturaPediatriaService.orientarSuplementacao(1, 2000, true);
    assert.match(r3.ferro, /2 mg\/kg\/dia/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. AVALIAÇÃO DO DESENVOLVIMENTO (DNPM)
// ─────────────────────────────────────────────────────────────────────────────
test('Deve avaliar marcos do DNPM corretamente para 6 meses', () => {
    let res = PuericulturaPediatriaService.avaliarDNPM(6);
    assert.equal(res.idade_avaliada_meses, 6);
    assert.ok(res.marcos_esperados.join().includes("Senta com apoio") || res.marcos_esperados.join().includes("Senta sem apoio"));
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. AVALIAÇÃO ANTROPOMÉTRICA
// ─────────────────────────────────────────────────────────────────────────────
test('Deve calcular IMC e classificar corretamente', () => {
    let res = PuericulturaPediatriaService.avaliarAntropometria(12, 10, 75, 46, 'M');
    // IMC = 10 / (0.75 * 0.75) = 17.77
    assert.ok(res.imc > 17.7 && res.imc < 17.8);
    assert.match(res.classificacao_imc, /Eutrofia/);
});

test('Deve alertar sobrepeso', () => {
    let res = PuericulturaPediatriaService.avaliarAntropometria(24, 15, 80, 48, 'M');
    // IMC = 15 / (0.8 * 0.8) = 23.43
    assert.match(res.classificacao_imc, /Sobrepeso \/ Obesidade/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. CALENDÁRIO VACINAL
// ─────────────────────────────────────────────────────────────────────────────
test('Deve retornar vacinas para idade específica (ex: 2 meses)', () => {
    let res = PuericulturaPediatriaService.calendarioVacinal(2);
    assert.equal(res.vacinas_atuais.nome, "2 Meses");
    assert.ok(res.vacinas_atuais.vacinas.join().includes("Pentavalente"));
});

test('Deve lidar com meses sem vacina prevista (ex: 7 meses)', () => {
    let res = PuericulturaPediatriaService.calendarioVacinal(7);
    assert.match(res.vacinas_atuais.nome, /Nenhuma prevista/);
    assert.equal(res.proximas_vacinas.nome, "9 Meses");
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. INTEGRAÇÃO RPC
// ─────────────────────────────────────────────────────────────────────────────
test('Deve rodar painel completo no RPC Cockpit', () => {
    const crypto = require('crypto');
    const botToken = 'fake_bot_token_pn_test';
    ctx.ConfigService.get = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : null;
    ctx.ConfigService.exigir = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : (k === 'TELEGRAM_BOT_TOKEN' ? botToken : 'dummy');
    const hashEsperado = crypto.createHmac('sha256', botToken).update('123').digest('hex');
    const fakeSession = 'ck_' + hashEsperado;

    let res = runtime.cockpitRpc('cockpitPainelPuericultura', fakeSession, [{ idadeMeses: 4, pesoNascimento: 3000, aleitamentoExclusivo: true }]);
    assert.ok(res.suplementacao);
    assert.ok(res.antropometria);
    assert.ok(res.dnpm);
    assert.ok(res.vacinas);
});

console.log(`\n✅ Suíte Puericultura Pediatria concluída: ${aprovados} de ${totalTestes} testes aprovados.\n`);
if (aprovados !== totalTestes) {
  process.exit(1);
}
