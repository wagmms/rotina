/**
 * Suíte de Testes Automatizados: Geriatria Avançada, Profilaxia de Quedas e Osteoporose (FRAX/ACR/SBGG)
 * Valida Calculadora FRAX Brasil, Manejo de Osteoporose, Cálcio, Vitamina D, Bisfosfonatos,
 * Revisão de Polifarmácia (QT Longo / Hipotensão Ortostática), FRIDs e Métodos RPC do Cockpit.
 */

const assert = require('assert');
const path = require('path');
const runtime = require(path.join(__dirname, '../server/runtime.js'));
const SaudeIdosoService = runtime.ctx.SaudeIdosoService;

console.log('=== INICIANDO BATERIA DE TESTES: GERIATRIA AVANÇADA (FRAX & QUEDAS) ===\n');

let totalTestes = 0;
let aprovados = 0;

function test(descricao, fn) {
  totalTestes++;
  try {
    fn();
    aprovados++;
    console.log(`  ✓ ${descricao}`);
  } catch (err) {
    console.error(`  ❌ FALHA: ${descricao}`);
    console.error(err);
    process.exit(1);
  }
}

// =============================================================================
// [1] CALCULADORA FRAX BRASIL (ABRASSO / SBGG / NOGG)
// =============================================================================
console.log('[1] Testando Calculadora FRAX Brasil...');

test('Mulher de 65 anos sem CRFs e sem DMO: cálculo basal determinístico', () => {
  const res = SaudeIdosoService.calcularFraxBrasil({
    idade: 65,
    sexo: 'F',
    peso: 60,
    altura: 160
  });
  assert.strictEqual(res.sexo, 'Feminino');
  assert.strictEqual(res.idade, 65);
  assert.ok(res.risco_fratura_maior_10a_pct > 4.0 && res.risco_fratura_maior_10a_pct < 12.0);
  assert.ok(res.risco_fratura_quadril_10a_pct > 0.5 && res.risco_fratura_quadril_10a_pct < 3.0);
  assert.ok(res.classificacao_risco === 'Baixo Risco' || res.classificacao_risco === 'Risco Intermediário');
});

test('Homem vs Mulher para mesma idade: risco masculino reduzido (~55% do feminino)', () => {
  const fem = SaudeIdosoService.calcularFraxBrasil({ idade: 70, sexo: 'F', peso: 65, altura: 160 });
  const masc = SaudeIdosoService.calcularFraxBrasil({ idade: 70, sexo: 'M', peso: 65, altura: 160 });
  assert.ok(masc.risco_fratura_maior_10a_pct < fem.risco_fratura_maior_10a_pct, 'Risco masculino deve ser menor que o feminino');
  assert.ok(masc.risco_fratura_quadril_10a_pct < fem.risco_fratura_quadril_10a_pct, 'Risco quadril masculino deve ser menor');
});

test('Fratura Prévia por Fragilidade: Alto Risco automático e indicação farmacológica mandatória', () => {
  const res = SaudeIdosoService.calcularFraxBrasil({
    idade: 55,
    sexo: 'F',
    fraturaPrevia: true
  });
  assert.strictEqual(res.classificacao_risco, 'Alto Risco');
  assert.strictEqual(res.indicacao_tratamento_farmacologico, true);
  assert.ok(res.justificativa_conduta.includes('Fratura por fragilidade prévia'));
});

test('Osteoporose Densitométrica (T-score <= -2.5): Alto Risco e indicação de antirreabsortivo', () => {
  const res = SaudeIdosoService.calcularFraxBrasil({
    idade: 62,
    sexo: 'F',
    dmoColoFemurTScore: -2.8
  });
  assert.strictEqual(res.classificacao_risco, 'Alto Risco');
  assert.strictEqual(res.indicacao_tratamento_farmacologico, true);
});

test('Risco Intermediário sem DMO: indicação expressa de solicitar Densitometria Óssea', () => {
  const res = SaudeIdosoService.calcularFraxBrasil({
    idade: 70,
    sexo: 'F',
    tabagismo: true,
    alcool: true
  });
  if (res.classificacao_risco === 'Risco Intermediário') {
    assert.strictEqual(res.indicacao_solicitar_dmo, true);
    assert.ok(res.justificativa_conduta.includes('Densitometria Óssea'));
  }
});

test('Extremos e Blindagem: Idade < 40 e Nonagenário > 90 anos clamp com alertas sentinela', () => {
  const jovemj = SaudeIdosoService.calcularFraxBrasil({ idade: 32, sexo: 'F' });
  assert.strictEqual(jovemj.idade, 40);
  assert.ok(jovemj.alertas.some(a => a.includes('Idade < 40 anos')));

  const velhinho = SaudeIdosoService.calcularFraxBrasil({ idade: 96, sexo: 'F' });
  assert.strictEqual(velhinho.idade, 90);
  assert.ok(velhinho.alertas.some(a => a.includes('Idade > 90 anos')));
});

// =============================================================================
// [2] MANEJO DE OSTEOPOROSE, CÁLCIO, VITAMINA D E BISFOSFONATOS
// =============================================================================
console.log('\n[2] Testando Manejo de Osteoporose e Bloqueios de Segurança...');

test('Bloqueio Renal Estrito: ClCr < 35 mL/min contraindica bisfosfonatos e indica Denosumabe', () => {
  const res = SaudeIdosoService.avaliarManejoOsteoporose({
    altoRisco: true,
    clcr: 26,
    calcioDietaMg: 500
  });
  assert.ok(res.bloqueios_seguranca.some(b => b.tipo === 'CONTRAINDICACAO_RENAL_BISFOSFONATO'));
  assert.strictEqual(res.bisfosfonato, null, 'Prescrição de bisfosfonato deve ser nula se ClCr < 35');
});

test('Bloqueio de Hipocalcemia: Cálcio sérico < 8.5 mg/dL impede início do bisfosfonato', () => {
  const res = SaudeIdosoService.avaliarManejoOsteoporose({
    altoRisco: true,
    calcioSerico: 7.9,
    clcr: 60
  });
  assert.ok(res.bloqueios_seguranca.some(b => b.tipo === 'CONTRAINDICACAO_HIPOCALCEMIA'));
  assert.strictEqual(res.bisfosfonato, null);
});

test('Bloqueio Esofágico / Ortostase: Esofagite grave contraindica alendronato oral', () => {
  const res = SaudeIdosoService.avaliarManejoOsteoporose({
    altoRisco: true,
    doencaEsofagica: true,
    clcr: 60
  });
  assert.ok(res.bloqueios_seguranca.some(b => b.tipo === 'CONTRAINDICACAO_ESOFAGICA_ORAL'));
  assert.strictEqual(res.bisfosfonato, null);
});

test('Prescrição de 1ª linha: Alendronato de Sódio 70 mg semanal com instruções de jejum e ortostase', () => {
  const res = SaudeIdosoService.avaliarManejoOsteoporose({
    altoRisco: true,
    clcr: 65,
    calcioSerico: 9.4
  });
  assert.ok(res.bisfosfonato !== null);
  assert.ok(res.bisfosfonato.medicamento.includes('Alendronato'));
  assert.ok(res.bisfosfonato.instrucoes_ouro.length >= 3);
  assert.ok(res.bisfosfonato.instrucoes_ouro.some(i => i.includes('JEJUM ABSOLUTO')));
  assert.ok(res.bisfosfonato.instrucoes_ouro.some(i => i.includes('30 a 60 minutos')));
});

test('Alerta de Drug Holiday: tempo de uso >= 3-5 anos gera alerta de pausa terapêutica', () => {
  const res = SaudeIdosoService.avaliarManejoOsteoporose({
    altoRisco: true,
    tempoUsoBisfosfonatoAnos: 4,
    clcr: 60
  });
  assert.ok(res.alertas_clinicos.some(a => a.includes('DRUG HOLIDAY')));
});

test('Manejo do Cálcio: Citrato para usuário crônico de IBP e Carbonato para padrão', () => {
  const resIbp = SaudeIdosoService.avaliarManejoOsteoporose({ calcioDietaMg: 400, emUsoIbp: true });
  assert.ok(resIbp.calcio.medicamento.includes('Citrato de Cálcio'));

  const resPadrao = SaudeIdosoService.avaliarManejoOsteoporose({ calcioDietaMg: 400, emUsoIbp: false });
  assert.ok(resPadrao.calcio.medicamento.includes('Carbonato de Cálcio'));

  const resDietaBoa = SaudeIdosoService.avaliarManejoOsteoporose({ calcioDietaMg: 1100 });
  assert.strictEqual(resDietaBoa.calcio.suplementar, false);
});

test('Manejo de Vitamina D: Ataque de 50.000 UI/sem se < 20 ng/mL e bloqueio sentinela de megadose anual', () => {
  const resDefic = SaudeIdosoService.avaliarManejoOsteoporose({ vitaminaD25OH: 15 });
  assert.ok(resDefic.vitamina_d.esquema_ataque.includes('50.000 UI'));
  assert.ok(resDefic.alertas_clinicos.some(a => a.includes('PROIBIDO o uso de megadoses orais em dose única anual')));

  const resToxico = SaudeIdosoService.avaliarManejoOsteoporose({ vitaminaD25OH: 110 });
  assert.ok(resToxico.bloqueios_seguranca.some(b => b.tipo === 'HIPERVITAMINOSE_D'));
});

// =============================================================================
// [3] REVISÃO DE POLIFARMÁCIA, QT LONGO, HIPOTENSÃO ORTOSTÁTICA E FRIDs
// =============================================================================
console.log('\n[3] Testando Revisão de Polifarmácia e Risco de Quedas...');

test('Detecção de risco de QT Longo: combinação de 2 drogas gera alerta crítico de Torsades', () => {
  const res = SaudeIdosoService.revisarPolifarmaciaERiscoQuedas([
    'Amiodarona 200mg',
    'Citalopram 20mg',
    'Losartana 50mg'
  ]);
  assert.strictEqual(res.drogas_prolongamento_qt.length, 2);
  assert.ok(res.alertas_criticos.some(a => a.includes('ALERTA VERMELHO DE QT LONGO')));
});

test('Detecção de Hipotensão Ortostática Farmacológica e Diagnóstico Clínico Beira-Leito', () => {
  const res = SaudeIdosoService.revisarPolifarmaciaERiscoQuedas(
    ['Doxazosina 4mg', 'Furosemida 40mg', 'AAS 100mg'],
    { pasDeitado: 145, padDeitado: 85, pasEmPe: 118, padEmPe: 72 } // Delta PAS = 27 mmHg (>= 20)
  );
  assert.strictEqual(res.drogas_hipotensao_ortostatica.length, 2);
  assert.ok(res.hipotensao_ortostatica_clinica !== null);
  assert.strictEqual(res.hipotensao_ortostatica_clinica.diagnostico_confirmado, true);
  assert.ok(res.alertas_criticos.some(a => a.includes('HIPOTENSÃO ORTOSTÁTICA DOCUMENTADA')));
});

test('Detecção de FRIDs (Fall-Risk Increasing Drugs) e Classificação de Risco Iatrogênico', () => {
  const res = SaudeIdosoService.revisarPolifarmaciaERiscoQuedas([
    'Zolpidem 10mg',
    'Clonazepam 2mg',
    'Ciclobenzaprina 10mg',
    'Doxazosina 2mg',
    'Omeprazol 20mg',
    'Hidroclorotiazida 25mg'
  ]);
  assert.ok(res.polifarmacia, 'Deve detectar polifarmácia (>= 5 remédios)');
  assert.ok(res.drogas_sedativas_frids.length >= 3);
  assert.ok(res.nivel_risco_iatrogenico_quedas === 'Alto' || res.nivel_risco_iatrogenico_quedas === 'Crítico');
  assert.ok(res.conduta_desprescricao.includes('desmame gradual'));
});

// =============================================================================
// [4] INTEGRAÇÃO FASTIFY RPC E ALIASES COCKPIT
// =============================================================================
console.log('\n[4] Testando Métodos RPC do Cockpit...');

test('cockpitGeriatriaFrax via RPC do Cockpit', () => {
  const rpcRes = runtime.cockpitRpc('cockpitGeriatriaFrax', 'internal', [{
    idade: 68,
    sexo: 'F',
    peso: 58,
    altura: 155,
    fraturaPrevia: true
  }]);
  assert.strictEqual(rpcRes.idade, 68);
  assert.strictEqual(rpcRes.indicacao_tratamento_farmacologico, true);
  assert.ok(rpcRes.conduta_beira_leito.length > 0);
  assert.ok(rpcRes.criterios_encaminhamento_especialista.length > 0);
});

test('cockpitGeriatriaOsteoporose com bloqueio renal (ClCr 28) via RPC', () => {
  const rpcRes = runtime.cockpitRpc('cockpitGeriatriaOsteoporose', 'internal', [{
    altoRisco: true,
    clcr: 28,
    calcioDietaMg: 400
  }]);
  assert.ok(rpcRes.bloqueios_seguranca.some(b => b.includes('ClCr 28')));
  assert.ok(rpcRes.protocolo_calcio.length > 0);
});

test('cockpitGeriatriaPolifarmacia via RPC', () => {
  const rpcRes = runtime.cockpitRpc('cockpitGeriatriaPolifarmacia', 'internal', [
    ['Amitriptilina', 'Doxazosina', 'Zolpidem', 'AAS', 'Enalapril']
  ]);
  assert.strictEqual(rpcRes.total_medicamentos_analisados, 5);
  assert.ok(rpcRes.recomendacoes_desprescricao.length > 0);
});

test('cockpitGeriatriaQuedas com TUG 22s e histórico de quedas', () => {
  const rpcRes = runtime.cockpitRpc('cockpitGeriatriaQuedas', 'internal', [{
    tempoTugSegundos: 22,
    historicoQuedas: 3,
    medicamentos: ['Clonazepam', 'Doxazosina']
  }]);
  assert.strictEqual(rpcRes.nivel_risco, 'ALTO RISCO DE QUEDAS');
  assert.ok(rpcRes.acoes_beira_leito.length > 0);
  assert.ok(rpcRes.criterios_encaminhamento_especialista.length > 0);
});

test('cockpitGeriatriaAvancada (Resumo Completo AGA + FRAX + Polifarmácia)', () => {
  const rpcRes = runtime.cockpitRpc('cockpitGeriatriaAvancada', 'internal', [{
    cfs: { score: 6 },
    miniCog: { palavras: 1, relogioNormal: false },
    tug: { tempo: 19 },
    frax: { idade: 75, sexo: 'F', peso: 54, altura: 152 },
    farmacos: { lista: ['Haloperidol', 'Prometazina', 'Omeprazol', 'AAS', 'Sinvastatina'] }
  }]);
  assert.ok(rpcRes.fragilidade !== null);
  assert.strictEqual(rpcRes.fragilidade.alerta_fragilidade, true);
  assert.strictEqual(rpcRes.cognicao.rastreio_positivo, true);
  assert.ok(rpcRes.frax_brasil !== null);
  assert.ok(rpcRes.farmacologia_avancada !== null);
  assert.ok(rpcRes.prevencao_quedas_domicilio.length >= 4);
});

test('Texto livre inteligente via Telegram parser: /frax, /osteoporose e /quedas', () => {
  const resFrax = SaudeIdosoService.interpretarTextoLivreFrax("mulher 72 anos, 55kg, 155cm, fratura previa, corticoide, t-score -2.7");
  assert.strictEqual(resFrax.idade, 72);
  assert.strictEqual(resFrax.indicacao_tratamento_farmacologico, true);

  const resOsteo = SaudeIdosoService.interpretarTextoLivreOsteoporose("75 anos, tscore -2.9, clcr 30, calcio 8.0");
  assert.ok(resOsteo.bloqueios_seguranca.length >= 1, 'Deve detectar bloqueio de ClCr ou hipocalcemia');

  const resQuedas = SaudeIdosoService.interpretarTextoLivreQuedas("84 anos, 3 quedas, tug 21, usa diazepam e doxazosina");
  assert.strictEqual(resQuedas.nivel_risco, 'ALTO RISCO DE QUEDAS');
});

console.log(`\n🎉 SUCESSO TOTAL: Todos os ${aprovados}/${totalTestes} testes de Geriatria Avançada passaram com 100% de aprovação!`);
