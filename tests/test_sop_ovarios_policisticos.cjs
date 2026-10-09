const assert = require('assert');
const { SopOvariosPolicisticosService } = require('../src/02_sop_ovarios_policisticos');

function runTests() {
  console.log('Iniciando suite de testes: Síndrome dos Ovários Policísticos (Roterdã & ESHRE/ASRM 2023)');

  // ---------------------------------------------------------------------------
  // Teste 1: Fenótipo A (Clássico Completo: HA + DO + PCOM)
  // ---------------------------------------------------------------------------
  const casoFenotipoA = SopOvariosPolicisticosService.avaliarCriteriosRotterda({
    escoreFerrimanGallwey: 12,
    testosteronaTotal: 68,
    intervaloCicloDias: 55,
    ciclosPorAno: 6,
    contagemFolículosPorOvario: 24,
    volumeOvarianoMaximo: 12.5
  });

  assert.strictEqual(casoFenotipoA.criteriosAtendidos, true);
  assert.strictEqual(casoFenotipoA.contagemCriterios, 3);
  assert.strictEqual(casoFenotipoA.fenotipo, 'FENOTIPO_A');
  assert.ok(casoFenotipoA.nomeFenotipo.includes('Fenótipo A'));
  assert.strictEqual(casoFenotipoA.criteriosDetalhados.hiperandrogenismo.presente, true);
  assert.strictEqual(casoFenotipoA.criteriosDetalhados.disfuncaoOvulatoria.presente, true);
  assert.strictEqual(casoFenotipoA.criteriosDetalhados.morfologiaPolicistica.presente, true);
  console.log('✓ Teste 1: Fenótipo A (Completo: HA + DO + PCOM) validado.');

  // ---------------------------------------------------------------------------
  // Teste 2: Fenótipo B (Clássico Anovulatório Não-Policístico: HA + DO)
  // ---------------------------------------------------------------------------
  const casoFenotipoB = SopOvariosPolicisticosService.avaliarCriteriosRotterda({
    hirsutismoClinico: true,
    amenorreia: true,
    contagemFolículosPorOvario: 8,
    volumeOvarianoMaximo: 6.0
  });

  assert.strictEqual(casoFenotipoB.criteriosAtendidos, true);
  assert.strictEqual(casoFenotipoB.contagemCriterios, 2);
  assert.strictEqual(casoFenotipoB.fenotipo, 'FENOTIPO_B');
  assert.strictEqual(casoFenotipoB.criteriosDetalhados.morfologiaPolicistica.presente, false);
  console.log('✓ Teste 2: Fenótipo B (Clássico Anovulatório sem PCOM) validado.');

  // ---------------------------------------------------------------------------
  // Teste 3: Fenótipo C (Ovulatório: HA + PCOM com ciclos normais)
  // ---------------------------------------------------------------------------
  const casoFenotipoC = SopOvariosPolicisticosService.avaliarCriteriosRotterda({
    alopeciaAndrogenica: true,
    acneGravePersistente: true,
    intervaloCicloDias: 28,
    ciclosPorAno: 12,
    volumeOvarianoMaximo: 11.0
  });

  assert.strictEqual(casoFenotipoC.criteriosAtendidos, true);
  assert.strictEqual(casoFenotipoC.contagemCriterios, 2);
  assert.strictEqual(casoFenotipoC.fenotipo, 'FENOTIPO_C');
  assert.strictEqual(casoFenotipoC.criteriosDetalhados.disfuncaoOvulatoria.presente, false);
  console.log('✓ Teste 3: Fenótipo C (Ovulatório: HA + PCOM) validado.');

  // ---------------------------------------------------------------------------
  // Teste 4: Fenótipo D (Não-Hiperandrogênico: DO + PCOM)
  // ---------------------------------------------------------------------------
  const casoFenotipoD = SopOvariosPolicisticosService.avaliarCriteriosRotterda({
    escoreFerrimanGallwey: 3,
    testosteronaTotal: 28,
    intervaloCicloDias: 45,
    ciclosPorAno: 7,
    contagemFolículosPorOvario: 22
  });

  assert.strictEqual(casoFenotipoD.criteriosAtendidos, true);
  assert.strictEqual(casoFenotipoD.contagemCriterios, 2);
  assert.strictEqual(casoFenotipoD.fenotipo, 'FENOTIPO_D');
  assert.strictEqual(casoFenotipoD.criteriosDetalhados.hiperandrogenismo.presente, false);
  console.log('✓ Teste 4: Fenótipo D (Não-hiperandrogênico: DO + PCOM) validado.');

  // ---------------------------------------------------------------------------
  // Teste 5: Critérios Insuficientes (< 2 critérios)
  // ---------------------------------------------------------------------------
  const casoInsuficiente = SopOvariosPolicisticosService.avaliarCriteriosRotterda({
    escoreFerrimanGallwey: 2,
    intervaloCicloDias: 29,
    ciclosPorAno: 12,
    contagemFolículosPorOvario: 22 // PCOM isolado
  });

  assert.strictEqual(casoInsuficiente.criteriosAtendidos, false);
  assert.strictEqual(casoInsuficiente.contagemCriterios, 1);
  assert.strictEqual(casoInsuficiente.fenotipo, 'CRITERIOS_INSUFICIENTES');
  console.log('✓ Teste 5: Critérios Insuficientes (< 2 critérios) validado.');

  // ---------------------------------------------------------------------------
  // Teste 6: Adolescente (< 3 anos pós-menarca) - Alerta de Anovulação Fisiológica
  // ---------------------------------------------------------------------------
  const casoAdolescente = SopOvariosPolicisticosService.avaliarCriteriosRotterda({
    idade: 15,
    anosPosMenarca: 1.5,
    escoreFerrimanGallwey: 9,
    intervaloCicloDias: 42
  });

  assert.strictEqual(casoAdolescente.criteriosDetalhados.disfuncaoOvulatoria.eAdolescente, true);
  assert.ok(casoAdolescente.criteriosDetalhados.disfuncaoOvulatoria.alertaAdolescente.includes('PACIENTE ADOLESCENTE'));
  assert.ok(casoAdolescente.criteriosDetalhados.disfuncaoOvulatoria.alertaAdolescente.includes('ESHRE/ASRM 2023'));
  console.log('✓ Teste 6: Manejo em Adolescente com alerta de imaturidade fisiológica validado.');

  // ---------------------------------------------------------------------------
  // Teste 7: Exclusão com Sucesso de Diagnósticos Diferenciais
  // ---------------------------------------------------------------------------
  const exclusoesNormais = SopOvariosPolicisticosService.auditarDiagnosticosDiferenciais({
    tsh: 2.1,
    prolactina: 15.0,
    progesterona17Oh: 1.2,
    unidade17Oh: 'ng/ml'
  });

  assert.strictEqual(exclusoesNormais.diagnosticoDiferencialDescartado, true);
  assert.strictEqual(exclusoesNormais.alertasCriticos.length, 0);
  assert.strictEqual(exclusoesNormais.pendenciasObrigatorias.length, 0);
  assert.strictEqual(exclusoesNormais.exclusoesAuditadas.length, 3);
  console.log('✓ Teste 7: Exclusão de TSH, Prolactina e 17-OHP concluída com sucesso.');

  // ---------------------------------------------------------------------------
  // Teste 8: 17-OHP em Zona Cinzenta (2 a 10 ng/mL) -> Exige Teste de ACTH
  // ---------------------------------------------------------------------------
  const zonaCinzentaHac = SopOvariosPolicisticosService.auditarDiagnosticosDiferenciais({
    tsh: 1.9,
    prolactina: 18.0,
    progesterona17Oh: 4.8,
    unidade17Oh: 'ng/ml'
  });

  assert.strictEqual(zonaCinzentaHac.diagnosticoDiferencialDescartado, false);
  assert.ok(zonaCinzentaHac.alertasCriticos.some(a => a.includes('ZONA CINZENTA') && a.includes('Cosintropina')));
  console.log('✓ Teste 8: 17-OHP em zona cinzenta com indicação de teste de estímulo validado.');

  // ---------------------------------------------------------------------------
  // Teste 9: 17-OHP Confirmatória (> 10 ng/mL) -> Diagnóstico de HAC-NC e Exclusão de SOP
  // ---------------------------------------------------------------------------
  const confirmacaoHac = SopOvariosPolicisticosService.auditarDiagnosticosDiferenciais({
    tsh: 2.0,
    prolactina: 14.0,
    progesterona17Oh: 15.2,
    unidade17Oh: 'ng/ml'
  });

  assert.strictEqual(confirmacaoHac.diagnosticoDiferencialDescartado, false);
  assert.strictEqual(confirmacaoHac.diagnosticoAlternativoProvavel, 'HIPERPLASIA_ADRENAL_CONGENITA_NAO_CLASSICA');
  assert.ok(confirmacaoHac.alertasCriticos.some(a => a.includes('SOP EXCLUÍDA como causa primária')));
  console.log('✓ Teste 9: Diagnóstico confirmatório de HAC não clássica validado.');

  // ---------------------------------------------------------------------------
  // Teste 10: Alerta Vermelho de Virilização Aguda e Suspeita de Tumor Produtor
  // ---------------------------------------------------------------------------
  const suspeitaTumor = SopOvariosPolicisticosService.auditarDiagnosticosDiferenciais({
    virilizacaoRapida: true,
    testosteronaTotal: 195,
    dheaS: 820
  });

  assert.strictEqual(suspeitaTumor.diagnosticoDiferencialDescartado, false);
  assert.strictEqual(suspeitaTumor.diagnosticoAlternativoProvavel, 'TUMOR_PRODUTOR_DE_ANDROGENIOS');
  assert.ok(suspeitaTumor.alertasCriticos.some(a => a.includes('ALERTA VERMELHO ONCOLÓGICO')));
  console.log('✓ Teste 10: Alerta de tumor produtor de androgênios validado.');

  // ---------------------------------------------------------------------------
  // Teste 11: Estratificação Metabólica e Critérios de Síndrome Metabólica
  // ---------------------------------------------------------------------------
  const perfilMetabolico = SopOvariosPolicisticosService.estratificarRiscoMetabolico({
    pesoKg: 85,
    alturaCm: 162,
    circunferenciaAbdominalCm: 94,
    glicemiaJejum: 104,
    glicemia2hTtgo: 155,
    insulinaJejum: 22,
    triglicerideos: 185,
    hdl: 42,
    pas: 135,
    pad: 88,
    esteatoseHepatica: true
  });

  assert.strictEqual(perfilMetabolico.classificacaoImc, 'OBESIDADE_GRAU_I');
  assert.strictEqual(perfilMetabolico.circunferenciaAbdominalAumentada, true);
  assert.strictEqual(perfilMetabolico.statusGlicemico, 'INTOLERANCIA_A_GLICOSE_PRE_DM');
  assert.strictEqual(perfilMetabolico.sindromeMetabolica.presente, true);
  assert.strictEqual(perfilMetabolico.sindromeMetabolica.criteriosPreenchidos, 5);
  assert.ok(perfilMetabolico.homaIr > 2.5);
  assert.strictEqual(perfilMetabolico.resistenciaInsulinicaDocumentada, true);
  assert.strictEqual(perfilMetabolico.esteatoseHepaticaPresente, true);
  console.log('✓ Teste 11: Estratificação cardiometabólica e Síndrome Metabólica validada.');

  // ---------------------------------------------------------------------------
  // Teste 12: Risco Endometrial por Amenorreia Prolongada
  // ---------------------------------------------------------------------------
  const riscoEndometrial = SopOvariosPolicisticosService.estratificarRiscoMetabolico({
    tempoAmenorreiaMeses: 7,
    espessuraEndometrialMm: 13
  });

  assert.strictEqual(riscoEndometrial.riscoEndometrial.nivel, 'ELEVADO');
  assert.ok(riscoEndometrial.riscoEndometrial.alerta.includes('HIPERPLASIA ENDOMETRIAL'));
  assert.ok(riscoEndometrial.riscoEndometrial.alerta.includes('sangramento de privação'));
  console.log('✓ Teste 12: Alerta de risco endometrial por amenorreia > 6m validado.');

  // ---------------------------------------------------------------------------
  // Teste 13: Conduta com Desejo Reprodutivo - Letrozol de 1ª Linha e Bloqueio de Antiandrogênicos
  // ---------------------------------------------------------------------------
  const condutaFertilidade = SopOvariosPolicisticosService.determinarCondutaTerapeutica({
    desejoReprodutivo: true,
    imc: 29.5
  });

  assert.strictEqual(condutaFertilidade.desejoReprodutivo, true);
  assert.ok(condutaFertilidade.planoFarmacologico.prescricaoPrincipal.some(p => p.medicamento.includes('Letrozol')));
  assert.ok(condutaFertilidade.planoFarmacologico.prescricaoPrincipal.some(p => p.posologia.includes('2,5 mg')));
  assert.ok(condutaFertilidade.planoFarmacologico.prescricoesAdjuvantes.some(a => a.medicamento.includes('Ácido Fólico')));
  assert.ok(condutaFertilidade.planoFarmacologico.prescricoesAdjuvantes.some(a => a.medicamento.includes('Metformina')));
  assert.ok(condutaFertilidade.planoFarmacologico.alertasContraindicacao.some(ac => ac.includes('BLOQUEIO ABSOLUTO DE ANTIANDROGÊNICOS')));
  console.log('✓ Teste 13: Indução com Letrozol de 1ª linha e bloqueio de antiandrogênicos validado.');

  // ---------------------------------------------------------------------------
  // Teste 14: Conduta sem Desejo Reprodutivo - AHC Combinado + Espironolactona + Metformina
  // ---------------------------------------------------------------------------
  const condutaSintomas = SopOvariosPolicisticosService.determinarCondutaTerapeutica({
    desejoReprodutivo: false,
    hirsutismoModeradoGrave: true,
    imc: 27.2
  });

  assert.strictEqual(condutaSintomas.desejoReprodutivo, false);
  assert.ok(condutaSintomas.planoFarmacologico.prescricaoPrincipal.some(p => p.medicamento.includes('Ciproterona')));
  assert.ok(condutaSintomas.planoFarmacologico.prescricoesAdjuvantes.some(a => a.medicamento.includes('Espironolactona')));
  assert.ok(condutaSintomas.planoFarmacologico.prescricoesAdjuvantes.some(a => a.medicamento.includes('Metformina')));
  assert.ok(condutaSintomas.planoFarmacologico.prescricoesAdjuvantes.some(a => a.alertaCritico && a.alertaCritico.includes('CONTRAINDICAÇÃO ABSOLUTA NA GRAVIDEZ')));
  console.log('✓ Teste 14: Manejo de hirsutismo e proteção endometrial com AHC + Espironolactona validado.');

  // ---------------------------------------------------------------------------
  // Teste 15: Contraindicação a Estrogênios (OMS MEC 4: Enxaqueca com Aura)
  // ---------------------------------------------------------------------------
  const condutaContraindicacao = SopOvariosPolicisticosService.determinarCondutaTerapeutica({
    desejoReprodutivo: false,
    enxaquecaComAura: true,
    imc: 26.0
  });

  assert.ok(condutaContraindicacao.planoFarmacologico.alertasContraindicacao.some(ac => ac.includes('CONTRAINDICAÇÃO A ESTROGÊNIOS')));
  assert.ok(condutaContraindicacao.planoFarmacologico.prescricaoPrincipal.some(p => p.medicamento.includes('Didrogesterona')));
  assert.ok(condutaContraindicacao.planoFarmacologico.prescricaoPrincipal.some(p => p.medicamento.includes('Levonorgestrel')));
  console.log('✓ Teste 15: Bloqueio estrito de estrogênios em enxaqueca com aura (MEC 4) validado.');

  // ---------------------------------------------------------------------------
  // Teste 16: Avaliação Completa de Ponta a Ponta e Geração de Resumo
  // ---------------------------------------------------------------------------
  const avaliacaoCompleta = SopOvariosPolicisticosService.avaliarSopCompleto({
    idade: 26,
    escoreFerrimanGallwey: 11,
    testosteronaTotal: 64,
    intervaloCicloDias: 52,
    ciclosPorAno: 6,
    contagemFolículosPorOvario: 25,
    volumeOvarianoMaximo: 12.0,
    tsh: 1.8,
    prolactina: 16.0,
    progesterona17Oh: 1.1,
    pesoKg: 78,
    alturaCm: 165,
    circunferenciaAbdominalCm: 86,
    glicemiaJejum: 98,
    glicemia2hTtgo: 148,
    insulinaJejum: 18,
    triglicerideos: 160,
    hdl: 46,
    desejoReprodutivo: false,
    hirsutismoModeradoGrave: true
  });

  assert.strictEqual(avaliacaoCompleta.sucesso, true);
  assert.strictEqual(avaliacaoCompleta.diagnosticoConfirmado, true);
  assert.strictEqual(avaliacaoCompleta.statusDiagnostico, 'SOP_CONFIRMADA');
  assert.strictEqual(avaliacaoCompleta.rotterdam.fenotipo, 'FENOTIPO_A');

  const resumoTexto = SopOvariosPolicisticosService.gerarResumoSop(avaliacaoCompleta);
  assert.ok(resumoTexto.includes('SOP CONFIRMADA'));
  assert.ok(resumoTexto.includes('Fenótipo A (Clássico Completo)'));
  assert.ok(resumoTexto.includes('Tireoidopatia excluída com sucesso'));
  assert.ok(resumoTexto.includes('PLANO TERAPÊUTICO DIRIGIDO'));
  assert.ok(resumoTexto.includes('Espironolactona'));
  console.log('✓ Teste 16: Avaliação completa e resumo formatado validados com sucesso.');

  // ---------------------------------------------------------------------------
  // Teste 17: Integração Cockpit RPC (runtime.cockpitRpc)
  // ---------------------------------------------------------------------------
  const crypto = require('crypto');
  const runtime = require('../server/runtime');

  const botToken = 'fake_bot_token_test';
  runtime.ctx.ConfigService.get = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : (k === 'TELEGRAM_BOT_TOKEN' ? botToken : null);
  runtime.ctx.ConfigService.exigir = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : (k === 'TELEGRAM_BOT_TOKEN' ? botToken : 'dummy');
  const hashEsperado = crypto.createHmac('sha256', botToken).update('123').digest('hex');
  const fakeSession = 'ck_' + hashEsperado;

  const rpcResCompleto = runtime.cockpitRpc('cockpitSopOvariosPolicisticos', fakeSession, [{
    acao: 'avaliarSopCompleto',
    idade: 27,
    escoreFerrimanGallwey: 10,
    testosteronaTotal: 62,
    intervaloCicloDias: 50,
    contagemFolículosPorOvario: 22,
    tsh: 2.0,
    prolactina: 15.0,
    progesterona17Oh: 1.0,
    desejoReprodutivo: true
  }]);

  assert.strictEqual(rpcResCompleto.sucesso, true);
  assert.strictEqual(rpcResCompleto.diagnosticoConfirmado, true);
  assert.strictEqual(rpcResCompleto.conduta.desejoReprodutivo, true);
  assert.ok(rpcResCompleto.conduta.planoFarmacologico.prescricaoPrincipal.some(p => p.medicamento.includes('Letrozol')));
  console.log('✓ Teste 17: Integração Cockpit RPC (cockpitSopOvariosPolicisticos) validada com sucesso.');

  console.log('\n🚀 TODOS OS TESTES DE SOP PASSARAM COM 100% DE SUCESSO!\n');
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };

