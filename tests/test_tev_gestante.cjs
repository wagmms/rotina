const assert = require('assert');
const { TevGestanteService } = require('../src/02_tev_gestante');

function runTests() {
  console.log("Iniciando suite de testes: Tromboembolismo Venoso (TEV) na Gestação e Puerpério (RCOG/FEBRASGO)");

  // ---------------------------------------------------------------------------
  // Teste 1: Gestante no 1º trimestre com TEV prévio não provocado (Escore >= 4)
  // ---------------------------------------------------------------------------
  const casoTevPrevio = TevGestanteService.avaliarRiscoAntenatal({
    tevPrevio: true,
    tevPrevioTipo: 'nao_provocado',
    idadeGestacionalSemanas: 8,
    pesoKg: 68
  });

  assert.strictEqual(casoTevPrevio.periodo, 'ANTENATAL');
  assert.strictEqual(casoTevPrevio.escoreTotal, 4);
  assert.strictEqual(casoTevPrevio.classificacaoRisco, 'ALTO');
  assert.strictEqual(casoTevPrevio.tromboprofilaxiaIndicada, true);
  assert.ok(casoTevPrevio.momentoInicio.includes('DESDE O 1º TRIMESTRE'));
  assert.strictEqual(casoTevPrevio.posologiaEnoxaparina.doseMg, 40);
  assert.strictEqual(casoTevPrevio.posologiaEnoxaparina.volumeMl, 0.4);

  // ---------------------------------------------------------------------------
  // Teste 2: Gestante com fatores cumulativos (Idade > 35, IMC > 30, Pré-eclâmpsia, Tabagismo)
  // ---------------------------------------------------------------------------
  const casoCumulativo = TevGestanteService.avaliarRiscoAntenatal({
    idade: 37,
    imc: 33,
    preEclampsia: true,
    tabagismo: true,
    pesoKg: 85
  });

  assert.strictEqual(casoCumulativo.escoreTotal, 4);
  assert.strictEqual(casoCumulativo.classificacaoRisco, 'ALTO');
  assert.strictEqual(casoCumulativo.tromboprofilaxiaIndicada, true);
  assert.strictEqual(casoCumulativo.fatoresIdentificados.length, 4);
  assert.ok(casoCumulativo.fatoresIdentificados.some(f => f.fator.includes('Idade')));
  assert.ok(casoCumulativo.fatoresIdentificados.some(f => f.fator.includes('Obesidade')));
  assert.ok(casoCumulativo.fatoresIdentificados.some(f => f.fator.includes('Pré-eclâmpsia')));
  assert.ok(casoCumulativo.fatoresIdentificados.some(f => f.fator.includes('Tabagismo')));

  // ---------------------------------------------------------------------------
  // Teste 3: Risco Intermediário Antenatal (Escore = 3 -> Início a partir de 28 semanas)
  // ---------------------------------------------------------------------------
  const casoIntermediario = TevGestanteService.avaliarRiscoAntenatal({
    idade: 36, // 1 ponto
    paridade: 3, // 1 ponto
    reproducaoAssistida: true, // 1 ponto
    pesoKg: 70
  });

  assert.strictEqual(casoIntermediario.escoreTotal, 3);
  assert.strictEqual(casoIntermediario.classificacaoRisco, 'INTERMEDIARIO');
  assert.strictEqual(casoIntermediario.tromboprofilaxiaIndicada, true);
  assert.ok(casoIntermediario.momentoInicio.includes('A PARTIR DE 28 SEMANAS'));

  // ---------------------------------------------------------------------------
  // Teste 4: Baixo Risco Antenatal Ambulatorial vs Hospitalar
  // ---------------------------------------------------------------------------
  const casoBaixoAmbulatorial = TevGestanteService.avaliarRiscoAntenatal({
    idade: 25,
    imc: 22,
    internada: false
  });
  assert.strictEqual(casoBaixoAmbulatorial.escoreTotal, 0);
  assert.strictEqual(casoBaixoAmbulatorial.classificacaoRisco, 'BAIXO');
  assert.strictEqual(casoBaixoAmbulatorial.tromboprofilaxiaIndicada, false);

  const casoBaixoInternada = TevGestanteService.avaliarRiscoAntenatal({
    idade: 25,
    imc: 22,
    internada: true
  });
  assert.strictEqual(casoBaixoInternada.tromboprofilaxiaIndicada, true);
  assert.ok(casoBaixoInternada.momentoInicio.includes('Durante a internação hospitalar'));

  // ---------------------------------------------------------------------------
  // Teste 5: Estratificação Pós-Parto (Cesariana de Urgência + Fatores Adicionais)
  // ---------------------------------------------------------------------------
  const casoPosPartoCesariana = TevGestanteService.avaliarRiscoPosParto({
    tipoParto: 'cesariana_urgencia', // 2 pontos
    imc: 32, // 1 ponto
    idade: 36, // 1 ponto
    pesoKg: 95
  });

  assert.strictEqual(casoPosPartoCesariana.periodo, 'POS_PARTO');
  assert.strictEqual(casoPosPartoCesariana.escoreTotal, 4);
  assert.strictEqual(casoPosPartoCesariana.classificacaoRisco, 'ALTO');
  assert.strictEqual(casoPosPartoCesariana.tromboprofilaxiaIndicada, true);
  assert.ok(casoPosPartoCesariana.duracaoRecomendada.includes('10 DIAS PÓS-PARTO'));
  // Peso 95kg deve cair na faixa 91-130kg -> 60mg SC
  assert.strictEqual(casoPosPartoCesariana.posologiaEnoxaparina.doseMg, 60);
  assert.strictEqual(casoPosPartoCesariana.posologiaEnoxaparina.volumeMl, 0.6);

  // ---------------------------------------------------------------------------
  // Teste 6: Puérpera com TEV prévio -> Profilaxia por 6 Semanas
  // ---------------------------------------------------------------------------
  const casoPosPartoTevPrevio = TevGestanteService.avaliarRiscoPosParto({
    tevPrevio: true,
    pesoKg: 65
  });
  assert.strictEqual(casoPosPartoTevPrevio.classificacaoRisco, 'MUITO_ALTO');
  assert.ok(casoPosPartoTevPrevio.duracaoRecomendada.includes('6 SEMANAS'));

  // ---------------------------------------------------------------------------
  // Teste 7: Ponderação de Doses por Peso e Ajuste na Insuficiência Renal
  // ---------------------------------------------------------------------------
  const doseBaixoPeso = TevGestanteService.calcularDoseEnoxaparina(45, 100);
  assert.strictEqual(doseBaixoPeso.doseMg, 20);
  assert.strictEqual(doseBaixoPeso.volumeMl, 0.2);

  const dosePadrao = TevGestanteService.calcularDoseEnoxaparina(70, 100);
  assert.strictEqual(dosePadrao.doseMg, 40);
  assert.strictEqual(dosePadrao.volumeMl, 0.4);

  const doseSobrepeso = TevGestanteService.calcularDoseEnoxaparina(110, 100);
  assert.strictEqual(doseSobrepeso.doseMg, 60);
  assert.strictEqual(doseSobrepeso.volumeMl, 0.6);

  const doseObesidadeGrave = TevGestanteService.calcularDoseEnoxaparina(150, 100);
  assert.strictEqual(doseObesidadeGrave.doseMg, 80);
  assert.strictEqual(doseObesidadeGrave.volumeMl, 0.8);

  const doseRenalGrave = TevGestanteService.calcularDoseEnoxaparina(70, 25);
  assert.strictEqual(doseRenalGrave.ajusteRenalAplicado, true);
  assert.strictEqual(doseRenalGrave.doseMg, 20);
  assert.ok(doseRenalGrave.alertaRenal.includes('INSUFICIÊNCIA RENAL SEVERA'));

  const doseTerapeutica = TevGestanteService.calcularDoseEnoxaparina(75, 100, 'TERAPEUTICO');
  assert.strictEqual(doseTerapeutica.doseMg, 75);
  assert.ok(doseTerapeutica.frequencia.includes('12/12h'));

  // ---------------------------------------------------------------------------
  // Teste 8: Bloqueio de Varfarina (1º Trimestre vs Lactação) e DOACs
  // ---------------------------------------------------------------------------
  const alertaVarfarina1Tri = TevGestanteService.verificarAlertasAnticoagulantes({
    trimestre: 1,
    amamentando: false,
    emUsoVarfarina: true
  });
  assert.strictEqual(alertaVarfarina1Tri.possuiBloqueioCritico, true);
  assert.ok(alertaVarfarina1Tri.alertas[0].titulo.includes('EMBRIOPATIA VARFARÍNICA'));
  assert.ok(alertaVarfarina1Tri.alertas[0].descricao.includes('hipoplasia nasal'));

  const alertaVarfarinaLactacao = TevGestanteService.verificarAlertasAnticoagulantes({
    trimestre: 3,
    amamentando: true,
    emUsoVarfarina: true
  });
  assert.strictEqual(alertaVarfarinaLactacao.possuiBloqueioCritico, false);
  assert.strictEqual(alertaVarfarinaLactacao.alertas[0].nivel, 'PERMITIDO_COM_MONITORAMENTO');
  assert.ok(alertaVarfarinaLactacao.alertas[0].titulo.includes('COMPATÍVEL COM AMAMENTAÇÃO'));

  const alertaDoacGestacao = TevGestanteService.verificarAlertasAnticoagulantes({
    trimestre: 2,
    amamentando: false,
    emUsoDoac: true
  });
  assert.strictEqual(alertaDoacGestacao.possuiBloqueioCritico, true);
  assert.ok(alertaDoacGestacao.alertas[0].titulo.includes('DOACs CONTRAINDICADOS'));

  // ---------------------------------------------------------------------------
  // Teste 9: Intervalo de Segurança Neuroaxial (Raqui / Peridural)
  // ---------------------------------------------------------------------------
  const neuroaxialBloqueadoProfilatica = TevGestanteService.verificarSegurancaNeuroaxial(8, 'PROFILATICA');
  assert.strictEqual(neuroaxialBloqueadoProfilatica.liberado, false);
  assert.strictEqual(neuroaxialBloqueadoProfilatica.status, 'BLOQUEADO_JANELA_INSUFICIENTE');
  assert.strictEqual(neuroaxialBloqueadoProfilatica.janelaMinimaHoras, 12);
  assert.strictEqual(neuroaxialBloqueadoProfilatica.horasRestantes, 4);
  assert.ok(neuroaxialBloqueadoProfilatica.alertaHematomaEpidural.includes('HEMATOMA EPIDURAL'));

  const neuroaxialLiberadoProfilatica = TevGestanteService.verificarSegurancaNeuroaxial(13, 'PROFILATICA');
  assert.strictEqual(neuroaxialLiberadoProfilatica.liberado, true);
  assert.strictEqual(neuroaxialLiberadoProfilatica.status, 'LIBERADO');
  assert.strictEqual(neuroaxialLiberadoProfilatica.horasRestantes, 0);

  const neuroaxialBloqueadoTerapeutica = TevGestanteService.verificarSegurancaNeuroaxial(18, 'TERAPEUTICA');
  assert.strictEqual(neuroaxialBloqueadoTerapeutica.liberado, false);
  assert.strictEqual(neuroaxialBloqueadoTerapeutica.janelaMinimaHoras, 24);
  assert.strictEqual(neuroaxialBloqueadoTerapeutica.horasRestantes, 6);

  const neuroaxialLiberadoTerapeutica = TevGestanteService.verificarSegurancaNeuroaxial(24.5, 'TERAPEUTICA');
  assert.strictEqual(neuroaxialLiberadoTerapeutica.liberado, true);

  // ---------------------------------------------------------------------------
  // Teste 10: Integração com Runtime / Cockpit RPC
  // ---------------------------------------------------------------------------
  const runtime = require('../server/runtime');
  const crypto = require('crypto');
  const botToken = 'fake_bot_token_tev_test';
  runtime.ctx.ConfigService.get = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : null;
  runtime.ctx.ConfigService.exigir = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : (k === 'TELEGRAM_BOT_TOKEN' ? botToken : 'dummy');
  const hashEsperado = crypto.createHmac('sha256', botToken).update('123').digest('hex');
  const fakeSession = 'ck_' + hashEsperado;

  const rpcResAntenatal = runtime.cockpitRpc('cockpitTevGestante', fakeSession, [{
    acao: 'avaliarRiscoAntenatal',
    tevPrevio: true,
    pesoKg: 70
  }]);

  assert.strictEqual(rpcResAntenatal.periodo, 'ANTENATAL');
  assert.strictEqual(rpcResAntenatal.classificacaoRisco, 'ALTO');
  assert.strictEqual(rpcResAntenatal.posologiaEnoxaparina.doseMg, 40);

  const rpcResNeuroaxial = runtime.cockpitRpc('cockpitTevGestante', fakeSession, [{
    acao: 'verificarSegurancaNeuroaxial',
    ultimaDoseHorasAtras: 14,
    tipoDose: 'PROFILATICA'
  }]);
  assert.strictEqual(rpcResNeuroaxial.liberado, true);

  console.log("✅ Todos os testes de TEV na Gestação e Puerpério passaram com 100% de sucesso!");
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
