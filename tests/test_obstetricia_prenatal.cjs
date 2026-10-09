/**
 * ==============================================================================
 * SUÍTE DE TESTES: CALCULADORA E PAINEL DE PRÉ-NATAL (OBSTETRÍCIA AMBULATORIAL)
 * ==============================================================================
 * Valida com rigor clínico:
 *  1. Cálculo de DPP por Naegele (viradas de ano, meses, anos bissextos)
 *  2. Cálculo de IG por DUM em semanas e dias
 *  3. Regra de concordância FEBRASGO/ACOG (DUM mantida vs redatada pelo 1º USG)
 *  4. Avaliação de ganho de peso ideal IOM / Ministério da Saúde por IMC
 *  5. Diretrizes e cronologia de rastreio de exames por trimestre (1º, 2º e 3º)
 *  6. Validador farmacológico de risco gestacional e detecção de drogas teratogênicas
 *  7. Métodos RPC do Cockpit no Fastify / Node.js runtime
 *  8. Comandos /prenatal e /dpp no Bot Telegram
 * ==============================================================================
 */

const assert = require('assert');
const crypto = require('crypto');
const ObstetriciaPrenatalService = require('../src/02_obstetricia_prenatal.js');
const runtime = require('../server/runtime.js');
const ctx = runtime.ctx;

console.log('🤰 Iniciando bateria de testes do Serviço de Obstetrícia e Pré-Natal...\n');

let totalTestes = 0;
let aprovados = 0;

function test(descricao, fn) {
  totalTestes++;
  try {
    fn();
    aprovados++;
    console.log(`  ✓ [TESTE ${totalTestes}] ${descricao}`);
  } catch (err) {
    console.error(`  ❌ [FALHA ${totalTestes}] ${descricao}`);
    console.error(`     Erro: ${err.message}`);
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. REGRA DE NAEGELE & CÁLCULO DE DPP
// ─────────────────────────────────────────────────────────────────────────────
test('Naegele: DUM em maio (mês > 3) gera DPP em fevereiro do ano seguinte (+7 dias, -3 meses)', () => {
  const dpp = ObstetriciaPrenatalService.calcularDppNaegele('10/05/2026');
  assert(dpp instanceof Date);
  assert.strictEqual(dpp.getDate(), 17);
  assert.strictEqual(dpp.getMonth() + 1, 2);
  assert.strictEqual(dpp.getFullYear(), 2027);
});

test('Naegele: DUM em janeiro (mês <= 3) gera DPP em outubro do mesmo ano (+7 dias, +9 meses)', () => {
  const dpp = ObstetriciaPrenatalService.calcularDppNaegele('15/01/2026');
  assert.strictEqual(dpp.getDate(), 22);
  assert.strictEqual(dpp.getMonth() + 1, 10);
  assert.strictEqual(dpp.getFullYear(), 2026);
});

test('Naegele: DUM no final do mês com virada exata de calendário (28/01/2026)', () => {
  // 28 + 7 = 35 de janeiro -> 35 - 31 dias de jan = 4 de fevereiro -> +9 meses = 4 de novembro
  const dpp = ObstetriciaPrenatalService.calcularDppNaegele('28/01/2026');
  assert.strictEqual(dpp.getDate(), 4);
  assert.strictEqual(dpp.getMonth() + 1, 11);
  assert.strictEqual(dpp.getFullYear(), 2026);
});

test('Naegele: Consideração precisa de ano bissexto para viradas em fevereiro (2024)', () => {
  // 25/05/2023: novo mês = 5 - 3 = 2 (fevereiro de 2024, ano bissexto com 29 dias).
  // 25 + 7 = 32. 32 - 29 = 3 de março de 2024.
  const dpp = ObstetriciaPrenatalService.calcularDppNaegele('25/05/2023');
  assert.strictEqual(dpp.getDate(), 3);
  assert.strictEqual(dpp.getMonth() + 1, 3);
  assert.strictEqual(dpp.getFullYear(), 2024);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. CÁLCULO DE IG ENTRE DATAS
// ─────────────────────────────────────────────────────────────────────────────
test('Cálculo exato de IG: 70 dias decorridos = 10 semanas e 0 dias', () => {
  const dInicio = new Date(2026, 0, 1, 12, 0, 0); // 01/01/2026
  const dRef = new Date(2026, 0, 1 + 70, 12, 0, 0);
  const ig = ObstetriciaPrenatalService.calcularIgEntreDatas(dInicio, dRef);
  assert.strictEqual(ig.totalDias, 70);
  assert.strictEqual(ig.semanas, 10);
  assert.strictEqual(ig.dias, 0);
});

test('Cálculo de IG: 87 dias decorridos = 12 semanas e 3 dias (12s3d)', () => {
  const dInicio = new Date(2026, 0, 1, 12, 0, 0);
  const dRef = new Date(2026, 0, 1 + 87, 12, 0, 0);
  const ig = ObstetriciaPrenatalService.calcularIgEntreDatas(dInicio, dRef);
  assert.strictEqual(ig.semanas, 12);
  assert.strictEqual(ig.dias, 3);
  assert(ig.textoFormatado.includes('12s3d'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. REGRA DE CONCORDÂNCIA FEBRASGO / ACOG ENTRE DUM E 1º USG
// ─────────────────────────────────────────────────────────────────────────────
test('FEBRASGO: DUM Mantida quando diferença <= 5 dias no 1º trimestre precoce (CCN <= 8s6d)', () => {
  // DUM em 01/01/2026. USG feito em 01/03/2026 (59 dias de DUM = 8s3d).
  // Se USG mediu 8s1d (57 dias), diferença é de apenas 2 dias (<= 5 dias).
  const res = ObstetriciaPrenatalService.avaliarConcordanciaDumUsg({
    dum: '01/01/2026',
    dataUsg: '01/03/2026',
    semanasUsg: 8,
    diasUsg: 1,
    dataRef: '01/03/2026'
  });

  assert(res.sucesso);
  assert.strictEqual(res.concordante, true);
  assert.strictEqual(res.metodoAdotado, 'DUM_CONFIRMADA_POR_USG');
  assert.strictEqual(res.diferencaDias, 2);
  assert(res.justificativaClinica.includes('DUM é mantida como cronologia oficial'));
});

test('FEBRASGO: Gestação Redatada por USG quando diferença > 5 dias no precoce (<= 8s6d)', () => {
  // DUM em 01/01/2026. USG em 01/03/2026 (59 dias de DUM = 8s3d).
  // Mas USG mediu apenas 7s0d (49 dias). Diferença = 10 dias (> 5 dias).
  const res = ObstetriciaPrenatalService.avaliarConcordanciaDumUsg({
    dum: '01/01/2026',
    dataUsg: '01/03/2026',
    semanasUsg: 7,
    diasUsg: 0,
    dataRef: '01/03/2026'
  });

  assert(res.sucesso);
  assert.strictEqual(res.concordante, false);
  assert.strictEqual(res.metodoAdotado, 'USG_REDATADA_DISCORDANTE');
  assert.strictEqual(res.diferencaDias, 10);
  assert(res.justificativaClinica.includes('redatada pelo ultrassom'));
  assert.strictEqual(res.igAtual.semanas, 7);
});

test('USG Exclusivo (sem DUM conhecida): Cronologia fixada com sucesso', () => {
  const res = ObstetriciaPrenatalService.avaliarConcordanciaDumUsg({
    dataUsg: '10/02/2026',
    semanasUsg: 11,
    diasUsg: 4,
    dataRef: '10/02/2026'
  });

  assert(res.sucesso);
  assert.strictEqual(res.metodoAdotado, 'USG_EXCLUSIVA');
  assert.strictEqual(res.igAtual.semanas, 11);
  assert.strictEqual(res.igAtual.dias, 4);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. AVALIAÇÃO DE GANHO DE PESO GESTACIONAL (IOM / MINISTÉRIO DA SAÚDE)
// ─────────────────────────────────────────────────────────────────────────────
test('Ganho de Peso IOM: Eutrofia (IMC 22.2) deve recomendar 11.5 a 16.0 kg', () => {
  const res = ObstetriciaPrenatalService.avaliarGanhoPesoGestacional({
    pesoPreGestacional: 58.0,
    altura: 1.62,
    pesoAtual: 63.5,
    semanas: 24
  });

  assert(res.sucesso);
  assert.strictEqual(res.imcPreGestacional, 22.1);
  assert.strictEqual(res.categoriaImc, 'Eutrofia Pré-Gestacional');
  assert.strictEqual(res.ganhoTotalRecomendadoMin, 11.5);
  assert.strictEqual(res.ganhoTotalRecomendadoMax, 16.0);
  assert.strictEqual(res.statusPonderal, 'GANHO_ADEQUADO');
});

test('Ganho de Peso IOM: Obesidade (IMC 32.4) deve recomendar 5.0 a 9.0 kg', () => {
  const res = ObstetriciaPrenatalService.avaliarGanhoPesoGestacional({
    pesoPreGestacional: 85.0,
    altura: 1.62,
    pesoAtual: 98.0,
    semanas: 26
  });

  assert(res.sucesso);
  assert.strictEqual(res.categoriaImc, 'Obesidade Pré-Gestacional');
  assert.strictEqual(res.ganhoTotalRecomendadoMin, 5.0);
  assert.strictEqual(res.ganhoTotalRecomendadoMax, 9.0);
  assert.strictEqual(res.statusPonderal, 'GANHO_EXCESSIVO');
  assert(res.alertaClinico.includes('Diabetes Gestacional'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. RASTREIO POR TRIMESTRE (FEBRASGO & MS)
// ─────────────────────────────────────────────────────────────────────────────
test('Rastreio 1º Trimestre: contém bateria de sorologias, glicemia jejum corte 92 e ácido fólico', () => {
  const tri1 = ObstetriciaPrenatalService.obterDiretrizesTrimestre(1);
  assert.strictEqual(tri1.trimestre, '1º Trimestre (0 a 13 semanas e 6 dias)');
  
  const temGlicemia = tri1.examesObrigatorios.some(e => e.exame.includes('Glicemia') && e.conduta.includes('92 a 125'));
  assert(temGlicemia, 'Glicemia de jejum com ponto de corte 92 mg/dL deve estar presente no 1º tri');

  const temVdrl = tri1.examesObrigatorios.some(e => e.exame.includes('VDRL'));
  assert(temVdrl, 'VDRL deve constar no 1º trimestre');

  const temFolico = tri1.suplementacoes.some(s => s.includes('Ácido Fólico'));
  assert(temFolico, 'Ácido fólico deve constar no 1º trimestre');
});

test('Rastreio 2º Trimestre: contém TOTG 75g (cortes 92/180/153), dTpa e AAS+Cálcio para pré-eclâmpsia', () => {
  const tri2 = ObstetriciaPrenatalService.obterDiretrizesTrimestre(2);
  const temTotg = tri2.examesObrigatorios.some(e => e.exame.includes('TOTG 75g') && e.conduta.includes('180') && e.conduta.includes('153'));
  assert(temTotg, 'TOTG 75g com cortes 92/180/153 mg/dL deve estar no 2º tri');

  assert(tri2.profilaxiaPreEclampsia.esquemaRecomendado.includes('AAS 100 a 150 mg'));
  assert(tri2.profilaxiaPreEclampsia.esquemaRecomendado.includes('Cálcio'));

  const temDtpa = tri2.vacinacaoGestante.some(v => v.includes('dTpa'));
  assert(temDtpa, 'Vacina dTpa deve constar no 2º trimestre');
});

test('Rastreio 3º Trimestre: contém Swab anovaginal para GBS entre 35-37 semanas', () => {
  const tri3 = ObstetriciaPrenatalService.obterDiretrizesTrimestre(3);
  const temGbs = tri3.examesObrigatorios.some(e => e.exame.includes('Streptococcus agalactiae') && e.conduta.includes('Penicilina Cristalina'));
  assert(temGbs, 'Rastreio de GBS na 35-37 semanas com profilaxia de penicilina deve estar no 3º tri');
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. VALIDADOR FARMACOLÓGICO NA GESTAÇÃO & LACTAÇÃO
// ─────────────────────────────────────────────────────────────────────────────
test('Validador Farmacológico: Enalapril (IECA) deve ser CONTRAINDICADO e sugerir Metildopa', () => {
  const check = ObstetriciaPrenatalService.validarMedicamentoGestacao('Enalapril');
  assert(check.sucesso);
  assert.strictEqual(check.segurancaGestacao, 'CONTRAINDICADO');
  assert.strictEqual(check.categoriaFda, 'D');
  assert(check.alertas[1].includes('disgenesia renal fetal'));
  assert(check.alternativasRecomendadas.some(a => a.includes('Metildopa')));
});

test('Validador Farmacológico: Sinvastatina (Estatina) deve ter Categoria X e contraindicação absoluta', () => {
  const check = ObstetriciaPrenatalService.validarMedicamentoGestacao('Sinvastatina');
  assert(check.sucesso);
  assert.strictEqual(check.segurancaGestacao, 'CONTRAINDICADO');
  assert.strictEqual(check.categoriaFda, 'X');
});

test('Validador Farmacológico: Doxiciclina (Tetraciclina) deve ter alerta de pigmentação dentária', () => {
  const check = ObstetriciaPrenatalService.validarMedicamentoGestacao('Doxiciclina');
  assert(check.sucesso);
  assert.strictEqual(check.segurancaGestacao, 'CONTRAINDICADO');
  assert(check.alertas[1].includes('tecidos ósseos e dentários'));
});

test('Validador Farmacológico: Ibuprofeno no 3º trimestre deve alertar fechamento de ductus arteriosus', () => {
  const check = ObstetriciaPrenatalService.validarMedicamentoGestacao('Ibuprofeno', 3);
  assert(check.sucesso);
  assert.strictEqual(check.segurancaGestacao, 'CONTRAINDICADO');
  assert(check.alertas[0].includes('canal arterial') || check.alertas[1].includes('canal arterial'));
});

test('Validador Farmacológico: Medicamentos seguros (Paracetamol, Metildopa, Cefalexina, Fosfomicina)', () => {
  assert.strictEqual(ObstetriciaPrenatalService.validarMedicamentoGestacao('Paracetamol').segurancaGestacao, 'SEGURO');
  assert.strictEqual(ObstetriciaPrenatalService.validarMedicamentoGestacao('Metildopa').segurancaGestacao, 'SEGURO');
  assert.strictEqual(ObstetriciaPrenatalService.validarMedicamentoGestacao('Cefalexina').segurancaGestacao, 'SEGURO');
  assert.strictEqual(ObstetriciaPrenatalService.validarMedicamentoGestacao('Fosfomicina').segurancaGestacao, 'SEGURO');
});

test('Auditoria de Prescrição Gestante: detecta misturas de risco', () => {
  const audit = ObstetriciaPrenatalService.auditarPrescricaoGestante('Enalapril, Paracetamol, Metildopa, Sinvastatina', 2);
  assert(audit.sucesso);
  assert.strictEqual(audit.parecerGeral, 'CONTRAINDICADO');
  assert.strictEqual(audit.contraindicados.length, 2); // Enalapril e Sinvastatina
  assert.strictEqual(audit.seguros.length, 2); // Paracetamol e Metildopa
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. MÉTODOS RPC DO COCKPIT NO FASTIFY RUNTIME
// ─────────────────────────────────────────────────────────────────────────────
test('Cockpit RPC: Métodos de Obstetrícia funcionam via dispatch do runtime', () => {
  const botToken = 'fake_bot_token_pn_test';
  ctx.ConfigService.get = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : null;
  ctx.ConfigService.exigir = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : (k === 'TELEGRAM_BOT_TOKEN' ? botToken : 'dummy');
  const hashEsperado = crypto.createHmac('sha256', botToken).update('123').digest('hex');
  const fakeSession = 'ck_' + hashEsperado;

  // 7A: cockpitCalcularPrenatal
  const resCalc = runtime.cockpitRpc('cockpitCalcularPrenatal', fakeSession, [{
    dum: '15/02/2026',
    pesoPreGestacional: 60,
    altura: 1.65,
    pesoAtual: 64
  }]);
  assert(resCalc.sucesso === true, 'cockpitCalcularPrenatal deve responder com sucesso');
  assert(resCalc.cronologia && resCalc.cronologia.dpp, 'Deve conter DPP calculada');
  assert(resCalc.ganhoPeso && resCalc.ganhoPeso.imcPreGestacional, 'Deve conter ganho de peso');

  // 7B: cockpitRastreioTrimestre
  const resTri = runtime.cockpitRpc('cockpitRastreioTrimestre', fakeSession, [1]);
  assert(resTri.sucesso === true && resTri.diretrizes.examesObrigatorios.length > 0);

  // 7C: cockpitValidarFarmacoGestacao
  const resFarm = runtime.cockpitRpc('cockpitValidarFarmacoGestacao', fakeSession, [{ medicamento: 'Enalapril' }]);
  assert(resFarm.sucesso === true && resFarm.segurancaGestacao === 'CONTRAINDICADO');

  // 7D: cockpitAuditarPrescricaoGestante
  const resAudit = runtime.cockpitRpc('cockpitAuditarPrescricaoGestante', fakeSession, [{
    medicamentos: 'Metildopa, Paracetamol',
    trimestre: 2
  }]);
  assert(resAudit.sucesso === true && resAudit.parecerGeral === 'SEGURO');
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. COMANDOS TELEGRAM /PRENATAL E /DPP
// ─────────────────────────────────────────────────────────────────────────────
test('Comandos /prenatal e /dpp no Telegram Bot respondem com assertividade clínica', () => {
  let msgEnviada = null;
  const originalEnviar = ctx.enviarMensagemParaChat;
  ctx.enviarMensagemParaChat = (chatId, texto) => {
    msgEnviada = texto;
    return { ok: true };
  };

  try {
    // 8A: Ajuda do /prenatal sem argumentos
    ctx.processarMensagemTexto({ chat: { id: 123 }, text: '/prenatal' });
    assert(msgEnviada && msgEnviada.includes('CALCULADORA E PAINEL DE PRÉ-NATAL'));

    // 8B: /dpp com data
    ctx.processarMensagemTexto({ chat: { id: 123 }, text: '/dpp 10/05/2026' });
    assert(msgEnviada && msgEnviada.includes('AVALIAÇÃO DE PRÉ-NATAL'));
    assert(msgEnviada && msgEnviada.includes('17/02/2027')); // DPP

    // 8C: /prenatal com auditoria de medicamentos
    ctx.processarMensagemTexto({ chat: { id: 123 }, text: '/prenatal med Enalapril, Paracetamol' });
    assert(msgEnviada && msgEnviada.includes('AUDITORIA DE SEGURANÇA FARMACOLÓGICA'));
    assert(msgEnviada && msgEnviada.includes('CONTRAINDICADOS NA GESTAÇÃO'));
    assert(msgEnviada && msgEnviada.includes('Enalapril'));
  } finally {
    ctx.enviarMensagemParaChat = originalEnviar;
  }
});

console.log(`\n🎉 Todos os ${aprovados}/${totalTestes} testes de Obstetrícia e Pré-Natal passaram com 100% de sucesso!`);
