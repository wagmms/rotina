const assert = require('assert');
const ToxicologiaEmergenciaService = require('../src/02_toxicologia_emergencia');
const runtime = require('../server/runtime');

function runTests() {
  console.log('Iniciando suite de testes: Toxicologia de Emergência');

  // Teste 1: Paracetamol (Dose não tóxica, sem nível sérico)
  const p1 = ToxicologiaEmergenciaService.avaliarParacetamol({ pesoKg: 70, doseIngeridaMg: 3000 });
  assert.strictEqual(p1.sucesso, true);
  assert.strictEqual(p1.provavelDoseToxica, false);
  assert.strictEqual(p1.indicacaoNac, false);

  // Teste 2: Paracetamol (Dose altamente tóxica -> Empírico NAC)
  const p2 = ToxicologiaEmergenciaService.avaliarParacetamol({ pesoKg: 60, doseIngeridaMg: 10000 });
  assert.strictEqual(p2.sucesso, true);
  assert.strictEqual(p2.provavelDoseToxica, true);
  assert.strictEqual(p2.indicacaoNac, true);
  assert.ok(p2.prescricaoNac.esquema.includes('Protocolo Padrão'));

  // Teste 3: Paracetamol Nomograma (Abaixo da linha)
  // t=4h, limite é 150. Se valor = 100, não indica.
  const p3 = ToxicologiaEmergenciaService.avaliarParacetamol({ pesoKg: 70, tempoIngestaoHoras: 4, nivelSericoMcgMl: 100 });
  assert.strictEqual(p3.sucesso, true);
  assert.strictEqual(p3.indicacaoNac, false);

  // Teste 4: Paracetamol Nomograma (Acima da linha)
  // t=12h, limite é 150 * 0.5^2 = 37.5. Se valor = 50, indica.
  const p4 = ToxicologiaEmergenciaService.avaliarParacetamol({ pesoKg: 70, tempoIngestaoHoras: 12, nivelSericoMcgMl: 50, viaPreferencia: 'VO' });
  assert.strictEqual(p4.sucesso, true);
  assert.strictEqual(p4.indicacaoNac, true);
  assert.strictEqual(p4.linhaTratamentoNomograma, 37.5);
  assert.ok(p4.prescricaoNac.esquema.includes('72 horas (VO)'));

  // Teste 5: Tricíclicos (TCA) - QRS alargado
  const t1 = ToxicologiaEmergenciaService.avaliarTriciclicos({ pesoKg: 60, qrsMs: 120 });
  assert.strictEqual(t1.sucesso, true);
  assert.strictEqual(t1.riscoConvulsao, true);
  assert.strictEqual(t1.riscoArritmiaVentricular, false);
  assert.strictEqual(t1.indicacaoBicarbonato, true);
  assert.ok(t1.prescricaoBicarbonato.volumeBolus.includes('60 a 120 mL'));

  // Teste 6: Cardiotóxicos - BB / BCC
  const c1 = ToxicologiaEmergenciaService.avaliarCardiotoxicos({ toxina: 'BCC', pesoKg: 80, estadoChoque: true });
  assert.strictEqual(c1.sucesso, true);
  assert.ok(c1.farmacoterapia.calcio !== undefined);
  assert.ok(c1.farmacoterapia.glucagon !== undefined);
  assert.ok(c1.farmacoterapia.hiet !== undefined);

  // Teste 7: Opioides - Apneia
  const o1 = ToxicologiaEmergenciaService.avaliarOpioides({ ventilacao: 'APNEIA' });
  assert.strictEqual(o1.sucesso, true);
  assert.strictEqual(o1.indicacaoNaloxona, true);
  assert.ok(o1.prescricaoNaloxona.doseInicial.includes('0.4 mg a 2.0 mg'));

  // Teste 8: Integração via RPC no runtime
  const crypto = require('crypto');
  const botToken = 'dummy-token-dm';
  if (!runtime.ctx.ConfigService) runtime.ctx.ConfigService = {};
  runtime.ctx.ConfigService.exigir = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : (k === 'TELEGRAM_BOT_TOKEN' ? botToken : 'dummy');
  const hashEsperado = crypto.createHmac('sha256', botToken).update('123').digest('hex');
  const fakeSession = 'ck_' + hashEsperado;

  const rpcResult = runtime.cockpitRpc('cockpitToxicologiaEmergencia', fakeSession, [{ 
    acao: 'avaliarOpioides', 
    parametros: { ventilacao: 'DEPRIMIDA' } 
  }]);
  
  assert.strictEqual(rpcResult.sucesso, true);
  assert.strictEqual(rpcResult.indicacaoNaloxona, true);
  assert.ok(rpcResult.prescricaoNaloxona.doseInicial.includes('0.04 mg'));

  console.log('✅ Sucesso! 8 testes passaram em ToxicologiaEmergenciaService e Integração RPC.');
}

try {
  runTests();
} catch (e) {
  console.error('❌ Falha nos testes:', e);
  process.exit(1);
}
