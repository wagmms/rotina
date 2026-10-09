const assert = require('assert');
const EndocrinologiaDiabetesService = require('../src/02_endocrinologia_diabetes');
const runtime = require('../server/runtime');

function runTests() {
  console.log('Iniciando suite de testes: Endocrinologia e Diabetes Mellitus Avançado (SBD / ADA)');

  // ---------------------------------------------------------------------------
  // Teste 1: DM1 Ambulatorial - Partição Basal-Bolus (50/50)
  // ---------------------------------------------------------------------------
  const dm1 = EndocrinologiaDiabetesService.calcularInsulinaAmbulatorial({
    peso: 70,
    tipoDm: 1
  });
  assert.strictEqual(dm1.sucesso, true);
  assert.strictEqual(dm1.tipoDm, 'DM1');
  assert.strictEqual(dm1.doseTotalDia, 35); // 70 * 0.5
  assert.strictEqual(dm1.basal.dose, 18);    // 50% arredondado
  assert.strictEqual(dm1.bolusPrandial.doseTotalBolus, 17);
  assert.strictEqual(dm1.bolusPrandial.dosePorRefeicaoFixa, 6);
  console.log('✓ Teste 1: DM1 com partição basal-bolus (50/50) validado.');

  // ---------------------------------------------------------------------------
  // Teste 2: DM1 - Fator de Sensibilidade (Regra 1800) e ICR (Regra 500)
  // ---------------------------------------------------------------------------
  const contagem = dm1.bolusPrandial.contagemCarboidratos;
  assert.strictEqual(contagem.fsi, 51); // 1800 / 35 = 51.4 -> 51
  assert.strictEqual(contagem.icr, 14); // 500 / 35 = 14.2 -> 14
  assert.ok(contagem.regraFsi.includes('1 UI reduz aproximadamente 51 mg/dL'));
  assert.ok(contagem.regraIcr.includes('1 UI de insulina para cada 14 gramas'));
  console.log('✓ Teste 2: FSI (Regra 1800) e ICR (Regra 500) validados.');

  // ---------------------------------------------------------------------------
  // Teste 3: DM2 Ambulatorial - Basalização Inicial e Titulação 2-2-2
  // ---------------------------------------------------------------------------
  const dm2 = EndocrinologiaDiabetesService.calcularInsulinaAmbulatorial({
    peso: 80,
    tipoDm: 2
  });
  assert.strictEqual(dm2.sucesso, true);
  assert.strictEqual(dm2.tipoDm, 'DM2');
  assert.strictEqual(dm2.basal.doseInicial, 10);
  assert.ok(dm2.algoritmoTitulacao.instrucao.includes('aumentar 2 UI da basal a cada 3 dias'));
  assert.ok(dm2.algoritmoTitulacao.adicaoBolusPrandial.includes('4 UI de insulina rápida'));
  console.log('✓ Teste 3: DM2 com basalização inicial e algoritmo de titulação 2-2-2 validado.');

  // ---------------------------------------------------------------------------
  // Teste 4: DM2 Descompensado (Dose Inicial Ponderada 0.2 U/kg)
  // ---------------------------------------------------------------------------
  const dm2Grave = EndocrinologiaDiabetesService.calcularInsulinaAmbulatorial({
    peso: 90,
    tipoDm: 2,
    descompensado: true
  });
  assert.strictEqual(dm2Grave.basal.doseInicial, 18); // 90 * 0.2
  console.log('✓ Teste 4: DM2 descompensado com dose proporcional 0.2 U/kg validado.');

  // ---------------------------------------------------------------------------
  // Teste 5: Alerta iSGLT2 e Risco de CAD Euglicêmica
  // ---------------------------------------------------------------------------
  const alertaIsglt2 = EndocrinologiaDiabetesService.calcularInsulinaAmbulatorial({
    peso: 75,
    tipoDm: 2,
    emUsoIsglt2: true
  });
  assert.ok(alertaIsglt2.alertasSeguranca.some(a => a.includes('Cetoacidose Diabética Euglicêmica')));
  assert.ok(alertaIsglt2.alertasSeguranca.some(a => a.includes('Suspender Dapagliflozina/Empagliflozina')));
  console.log('✓ Teste 5: Alerta sentinela de iSGLT2 e CAD euglicêmica validado.');

  // ---------------------------------------------------------------------------
  // Teste 6: Bloqueio e Ajuste de Metformina por TFG
  // ---------------------------------------------------------------------------
  const metforminaContraindicada = EndocrinologiaDiabetesService.calcularInsulinaAmbulatorial({
    peso: 70,
    tipoDm: 2,
    tfg: 25 // < 30 mL/min
  });
  assert.ok(metforminaContraindicada.alertasSeguranca.some(a => a.includes('CONTRAINDICAÇÃO METFORMINA') && a.includes('acidose lática')));

  const metforminaAjustada = EndocrinologiaDiabetesService.calcularInsulinaAmbulatorial({
    peso: 70,
    tipoDm: 2,
    tfg: 38 // 30-44 mL/min
  });
  assert.ok(metforminaAjustada.alertasSeguranca.some(a => a.includes('AJUSTE METFORMINA') && a.includes('1.000 mg/dia')));
  console.log('✓ Teste 6: Bloqueio estrito e ajuste renal de Metformina validados.');

  // ---------------------------------------------------------------------------
  // Teste 7: Alerta de Sulfonilureias em Idosos (Beers Criteria)
  // ---------------------------------------------------------------------------
  const idoso = EndocrinologiaDiabetesService.calcularInsulinaAmbulatorial({
    peso: 65,
    tipoDm: 2,
    ehIdoso: true
  });
  assert.ok(idoso.alertasSeguranca.some(a => a.includes('CRITÉRIOS DE BEERS') && a.includes('Glibenclamida')));
  console.log('✓ Teste 7: Alerta geriátrico contra sulfonilureia de longa ação validado.');

  // ---------------------------------------------------------------------------
  // Teste 8: Correção Hospitalar - Faixa Alvo ADA/SBD (140-180 mg/dL)
  // ---------------------------------------------------------------------------
  const alvoHospitalar = EndocrinologiaDiabetesService.protocoloCorrecaoHospitalar({
    glicemia: 160,
    perfil: 'padrao'
  });
  assert.strictEqual(alvoHospitalar.doseCorrecaoSc, 0);
  assert.ok(alvoHospitalar.condutaPrescricao.includes('Glicemia no alvo terapêutico hospitalar'));
  assert.ok(alvoHospitalar.advertenciaSlidingScale.includes('condena o uso isolado de escala móvel'));
  console.log('✓ Teste 8: Faixa alvo hospitalar (140-180 mg/dL) e condenação de escala móvel pura validados.');

  // ---------------------------------------------------------------------------
  // Teste 9: Correção Hospitalar - Perfis de Sensibilidade (Sensível vs Resistente)
  // ---------------------------------------------------------------------------
  const sensivel = EndocrinologiaDiabetesService.protocoloCorrecaoHospitalar({ glicemia: 240, perfil: 'sensivel' });
  const padrao = EndocrinologiaDiabetesService.protocoloCorrecaoHospitalar({ glicemia: 240, perfil: 'padrao' });
  const resistente = EndocrinologiaDiabetesService.protocoloCorrecaoHospitalar({ glicemia: 240, perfil: 'resistente' });

  assert.strictEqual(sensivel.doseCorrecaoSc, 4);
  assert.strictEqual(padrao.doseCorrecaoSc, 6);
  assert.strictEqual(resistente.doseCorrecaoSc, 8);
  console.log('✓ Teste 9: Escala hospitalar estratificada por sensibilidade validada.');

  // ---------------------------------------------------------------------------
  // Teste 10: Detecção de Hipoglicemia Hospitalar (< 70 mg/dL) e Regra dos 15
  // ---------------------------------------------------------------------------
  const hipo = EndocrinologiaDiabetesService.protocoloCorrecaoHospitalar({ glicemia: 54 });
  assert.strictEqual(hipo.doseCorrecaoSc, 0);
  assert.ok(hipo.condutaPrescricao.includes('HIPOGLICEMIA'));
  assert.ok(hipo.condutaPrescricao.includes('Glicose 50% EV'));
  assert.ok(hipo.alertaCritico.includes('HIPOGLICEMIA HOSPITALAR DETECTADA'));
  console.log('✓ Teste 10: Protocolo de resgate de hipoglicemia e regra dos 15 validado.');

  // ---------------------------------------------------------------------------
  // Teste 11: Emergência CAD - Sódio Corrigido, Anion Gap e Gravidade
  // ---------------------------------------------------------------------------
  const cadGrave = EndocrinologiaDiabetesService.manejoCriseHiperglicemica({
    tipo: 'CAD',
    peso: 70,
    glicemia: 450,
    potassio: 4.2,
    sodio: 130,
    cloreto: 95,
    bicarbonato: 8,
    ph: 6.95
  });
  assert.strictEqual(cadGrave.sucesso, true);
  assert.strictEqual(cadGrave.gravidadeCad.startsWith('GRAVE'), true);
  assert.strictEqual(cadGrave.anionGap, 27); // 130 - (95 + 8) = 27
  // Glicemia > 400 usa fator 0.020: 130 + 0.020 * 350 = 137 mEq/L
  assert.strictEqual(cadGrave.sodioCorrigidoKatz, 137);
  console.log('✓ Teste 11: CAD grave com Sódio Corrigido de Katz e Anion Gap validados.');

  // ---------------------------------------------------------------------------
  // Teste 12: REGRA DE OURO - Bloqueio Fatal de Insulina se K+ < 3.3 mEq/L
  // ---------------------------------------------------------------------------
  const cadKBaixo = EndocrinologiaDiabetesService.manejoCriseHiperglicemica({
    tipo: 'CAD',
    peso: 70,
    glicemia: 420,
    potassio: 3.0 // < 3.3
  });
  assert.strictEqual(cadKBaixo.bloqueioInsulinaAtivo, true);
  assert.ok(cadKBaixo.alertasSentinela.some(a => a.includes('BLOQUEIO FATAL DE INSULINA: K+ < 3.3 mEq/L')));
  assert.ok(cadKBaixo.insulinoterapiaConduta.includes('INSULINOTERAPIA BLOQUEADA'));
  assert.ok(cadKBaixo.potassioConduta.includes('Repor 20 a 40 mEq/h de KCl'));
  console.log('✓ Teste 12: Bloqueio fatal preventivo de insulina IV com K+ < 3.3 mEq/L validado.');

  // ---------------------------------------------------------------------------
  // Teste 13: Reposição de K+ com K entre 3.3 e 5.2 mEq/L
  // ---------------------------------------------------------------------------
  const cadKNormal = EndocrinologiaDiabetesService.manejoCriseHiperglicemica({
    tipo: 'CAD',
    peso: 70,
    glicemia: 380,
    potassio: 4.0
  });
  assert.strictEqual(cadKNormal.bloqueioInsulinaAtivo, false);
  assert.ok(cadKNormal.potassioConduta.includes('Adicionar 20 a 30 mEq de KCl'));
  assert.ok(cadKNormal.insulinoterapiaConduta.includes('7 UI/h (0.1 UI/kg/h)'));
  console.log('✓ Teste 13: Titulação de Insulina IV (0.1 UI/kg/h) e reposição de K+ concomitante validada.');

  // ---------------------------------------------------------------------------
  // Teste 14: Bicarbonato de Sódio - Critério Restritivo (Apenas pH < 6.90)
  // ---------------------------------------------------------------------------
  const cadBicIndicado = EndocrinologiaDiabetesService.manejoCriseHiperglicemica({
    tipo: 'CAD',
    peso: 70,
    ph: 6.85
  });
  assert.ok(cadBicIndicado.bicarbonatoConduta.includes('Indicação formal de Bicarbonato de Sódio'));

  const cadBicContraindicado = EndocrinologiaDiabetesService.manejoCriseHiperglicemica({
    tipo: 'CAD',
    peso: 70,
    ph: 7.10
  });
  assert.ok(cadBicContraindicado.bicarbonatoConduta.includes('Bicarbonato de Sódio é FORMALMENTE CONTRAINDICADO'));
  console.log('✓ Teste 14: Critério restritivo de Bicarbonato de Sódio (pH < 6.90) validado.');

  // ---------------------------------------------------------------------------
  // Teste 15: Transição Hídrica de Salvaguarda e Transição Segura para SC
  // ---------------------------------------------------------------------------
  assert.ok(cadGrave.hidratacaoVenosa.includes('Soro Glicosado a 5% com NaCl 0.45%'));
  assert.ok(cadGrave.protocoloTransicaoSc.includes('1 a 2 horas ANTES de desligar a bomba'));
  assert.ok(cadGrave.criteriosResolucao.includes('Glicemia < 200 mg/dL associada a Bicarbonato sérico >= 15'));

  // Integração Fastify RPC via server/runtime.js
  const crypto = require('crypto');
  const botToken = 'dummy-token-dm';
  runtime.ctx.ConfigService.exigir = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : (k === 'TELEGRAM_BOT_TOKEN' ? botToken : 'dummy');
  const hashEsperado = crypto.createHmac('sha256', botToken).update('123').digest('hex');
  const fakeSession = 'ck_' + hashEsperado;

  const rpcCad = runtime.cockpitRpc('cockpitEndocrinologiaDiabetes', fakeSession, [{
    acao: 'manejoCriseHiperglicemica',
    tipo: 'CAD',
    peso: 70,
    glicemia: 400,
    potassio: 4.5
  }]);
  assert.strictEqual(rpcCad.sucesso, true);

  const rpcAmb = runtime.cockpitRpc('cockpitEndocrinologiaDiabetes', fakeSession, [{
    acao: 'calcularInsulinaAmbulatorial',
    peso: 80,
    tipoDm: 1
  }]);
  assert.strictEqual(rpcAmb.sucesso, true);

  console.log('✓ Teste 15: Transição de salvaguarda e integração Fastify RPC cockpitEndocrinologiaDiabetes 100% validadas.');

  console.log('\n🚀 TODOS OS 15 TESTES DE ENDOCRINOLOGIA E DIABETES (SBD / ADA) PASSARAM COM SUCESSO!\n');
}

runTests();
