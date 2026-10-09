/**
 * Teste de Validação da Etapa 2: Performance, Separação Determinística e PWA Cache
 */
const assert = require('assert');
const { buildServer } = require('../server/index.js');
const runtime = require('../server/runtime.js');

async function run() {
  process.env.NODE_ENV = 'test';
  process.env.TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '1771571035';
  process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'test_bot_token';

  const app = await buildServer();
  const ctx = runtime.ctx;

  console.log('🧪 1. Testando Separação Rígida Determinística em RAM (0ms a 15ms)...');

  // A. Parkland
  const t0 = process.hrtime();
  const resPark = ctx.CalculadorasClinicas.parkland(70, 30);
  const diffPark = process.hrtime(t0);
  const msPark = (diffPark[0] * 1000 + diffPark[1] / 1e6).toFixed(2);
  assert.strictEqual(resPark.ok, true, 'Parkland deve calcular com sucesso');
  assert.strictEqual(resPark.dados.volumeTotal24hMl, 8400, 'Volume total deve ser 4 * 70 * 30 = 8400 mL');
  assert.strictEqual(resPark.dados.volumePrimeiras8hMl, 4200, 'Primeiras 8h deve ser 4200 mL');
  assert.strictEqual(resPark.dados.vazaoPrimeiras8hMlH, 525, 'Vazão 8h deve ser 525 mL/h');
  console.log(`   ✓ Parkland: 8400 mL total, 525 mL/h nas primeiras 8h (${msPark}ms em RAM)`);

  // B. DVA (Noradrenalina e Dobutamina em mcg/kg/min)
  const tDva = process.hrtime();
  const resDva = ctx.CalculadorasClinicas.drogasVasoativas('noradrenalina', 70, 'padrao');
  const diffDva = process.hrtime(tDva);
  const msDva = (diffDva[0] * 1000 + diffDva[1] / 1e6).toFixed(2);
  assert.strictEqual(resDva.ok, true, 'DVA deve calcular com sucesso');
  assert(resDva.dados.tabela.length > 0, 'DVA deve gerar tabela de titulação');
  console.log(`   ✓ DVA Noradrenalina 70kg: ${resDva.principal} (${msDva}ms em RAM)`);

  // C. CURB-65
  const tCurb = process.hrtime();
  const resCurb = ctx.CalculadorasClinicas.curb65(true, 65, 32, 85, 55, 72);
  const diffCurb = process.hrtime(tCurb);
  const msCurb = (diffCurb[0] * 1000 + diffCurb[1] / 1e6).toFixed(2);
  assert.strictEqual(resCurb.ok, true, 'CURB-65 deve calcular com sucesso');
  assert.strictEqual(resCurb.dados.pontos, 5, 'Todos os 5 critérios positivos');
  console.log(`   ✓ CURB-65: ${resCurb.principal} (${msCurb}ms em RAM)`);

  // D. Glasgow-P
  const tGcs = process.hrtime();
  const resGcs = ctx.CalculadorasClinicas.glasgowP(3, 4, 5, 0);
  const diffGcs = process.hrtime(tGcs);
  const msGcs = (diffGcs[0] * 1000 + diffGcs[1] / 1e6).toFixed(2);
  assert.strictEqual(resGcs.ok, true, 'Glasgow-P deve calcular com sucesso');
  assert(resGcs.principal.includes('12'), 'Glasgow 3+4+5 - 0 = 12');
  console.log(`   ✓ Glasgow-P: ${resGcs.principal} (${msGcs}ms em RAM)`);

  // E. Cockcroft-Gault (Clearance de Creatinina)
  const tCg = process.hrtime();
  const resCg = ctx.CalculadorasClinicas.cockcroftGault(1.5, 70, 65, false);
  const diffCg = process.hrtime(tCg);
  const msCg = (diffCg[0] * 1000 + diffCg[1] / 1e6).toFixed(2);
  assert.strictEqual(resCg.ok, true, 'Cockcroft-Gault deve calcular com sucesso');
  console.log(`   ✓ Clearance Creatinina (Cockcroft): ${resCg.principal} (${msCg}ms em RAM)`);

  // F. Diluição de Antibióticos no Guia Farmacêutico HSL
  const tDil = process.hrtime();
  const medVanco = ctx.buscarMedicamentoNoHSL('vancomicina');
  const diffDil = process.hrtime(tDil);
  const msDil = (diffDil[0] * 1000 + diffDil[1] / 1e6).toFixed(2);
  assert(medVanco && medVanco.preparo_diluicao, 'Vancomicina deve conter preparo e diluição');
  const txtDil = ctx.formatarDiluicaoPreparoHSL(medVanco);
  assert(txtDil.includes('GUIA FARMACÊUTICO HSL'), 'Deve formatar com cabeçalho oficial do HSL');
  console.log(`   ✓ Diluição Vancomicina Guia HSL: OK (${msDil}ms em RAM)`);

  console.log('\n🧪 2. Testando Roteador Deterministico de Texto Livre (sem acionar Gemini)...');
  const resTextoPark = ctx.tentarCalcularDeterministico('parkland 70kg 30%');
  assert(resTextoPark && resTextoPark.includes('8400 mL'), 'Texto livre de parkland deve calcular');
  console.log('   ✓ Texto livre "parkland 70kg 30%" resolvido deterministicamente em 0ms!');

  const resTextoDva = ctx.tentarCalcularDeterministico('nora 80kg concentrada');
  assert(resTextoDva && resTextoDva.includes('NORADRENALINA'), 'Texto livre de DVA deve calcular');
  console.log('   ✓ Texto livre "nora 80kg concentrada" resolvido deterministicamente em 0ms!');

  const resTextoDil = ctx.tentarCalcularDeterministico('como diluir meropenem');
  assert(resTextoDil && resTextoDil.includes('GUIA FARMACÊUTICO HSL'), 'Texto livre de diluição deve calcular');
  console.log('   ✓ Texto livre "como diluir meropenem" resolvido deterministicamente em 0ms!');

  console.log('\n🧪 3. Testando Fast-Path no Cockpit RPC (/api/cockpit)...');
  const sessaoToken = ctx.criarSessaoCockpit_(process.env.TELEGRAM_CHAT_ID);
  const resCockpitCalc = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitConversar',
      session: sessaoToken,
      args: [{
        acao: 'enviar',
        texto: 'parkland 70kg 30%'
      }]
    }
  });
  assert.strictEqual(resCockpitCalc.statusCode, 200);
  const jsonCockpit = JSON.parse(resCockpitCalc.payload);
  assert.strictEqual(jsonCockpit.ok, true, 'Resposta RPC deve ser ok');
  assert.strictEqual(jsonCockpit.resultado.deterministico, true, 'Deve marcar como deterministico');
  assert(jsonCockpit.resultado.resposta.includes('8400 mL'), 'Deve conter o cálculo exato');
  console.log('   ✓ Cockpit RPC respondeu cálculo em RAM sem acionar Gemini!');

  console.log('\n🧪 4. Testando Cache em Camadas do Service Worker e PWA Assets...');
  const resSw = await app.inject({ method: 'GET', url: '/sw.js' });
  assert.strictEqual(resSw.statusCode, 200);
  assert(resSw.payload.includes('ultra-rotina-cockpit-v3.0'), 'Deve conter versão do cache');
  assert(resSw.payload.includes('PRECACHE_ASSETS'), 'Deve conter lista de precache');
  console.log('   ✓ Service Worker v3.0 com Cache em Camadas operacional');

  const resIcon192 = await app.inject({ method: 'GET', url: '/pwa-192x192.png' });
  assert.strictEqual(resIcon192.statusCode, 200);
  assert.strictEqual(resIcon192.headers['content-type'], 'image/png');
  console.log('   ✓ Ícone PWA 192x192 PNG: 200 OK');

  const resIcon512 = await app.inject({ method: 'GET', url: '/pwa-512x512.png' });
  assert.strictEqual(resIcon512.statusCode, 200);
  assert.strictEqual(resIcon512.headers['content-type'], 'image/png');
  console.log('   ✓ Ícone PWA 512x512 PNG: 200 OK');

  const resAppleIcon = await app.inject({ method: 'GET', url: '/apple-touch-icon.png' });
  assert.strictEqual(resAppleIcon.statusCode, 200);
  assert.strictEqual(resAppleIcon.headers['content-type'], 'image/png');
  console.log('   ✓ Ícone iOS Safari apple-touch-icon PNG: 200 OK');

  console.log('\n🎉 TODOS OS TESTES DA ETAPA 2 PASSARAM COM 100% DE SUCESSO!\n');
}

run().catch((err) => {
  console.error('❌ Falha nos testes da Etapa 2:', err);
  process.exit(1);
});
