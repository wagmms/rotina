const assert = require('assert');
const { PsiquiatriaUrgenciaService } = require('../src/02_psiquiatria_urgencia');
const runtime = require('../server/runtime');

function runTests() {
  console.log('Iniciando suite de testes: Psiquiatria de Urgência & Saúde Mental (ABP / MS / APA / NICE)');

  // ---------------------------------------------------------------------------
  // Teste 1: Agitação Psicomotora em Paciente Colaborativo (Via Oral)
  // ---------------------------------------------------------------------------
  const casoOralColaborativo = PsiquiatriaUrgenciaService.avaliarAgitacaoPsicomotora({
    gravidade: 'moderada',
    escalaBars: 4,
    aceitaViaOral: true,
    etiologia: 'psicose'
  });

  assert.strictEqual(casoOralColaborativo.sucesso, true);
  assert.strictEqual(casoOralColaborativo.nivelEstratificado, 'MODERADA');
  assert.strictEqual(casoOralColaborativo.decisaoVia, 'ORAL');
  assert.ok(casoOralColaborativo.prescricoes.some(p => p.includes('Risperidona') || p.includes('Olanzapina')), 'Deve prescrever antipsicótico atípico VO');
  console.log('✓ Teste 1: Agitação psicomotora colaborativa via oral validada.');

  // ---------------------------------------------------------------------------
  // Teste 2: Agitação Psicomotora Grave / Recusa Oral (Parenteral IM Padrão Nacional)
  // ---------------------------------------------------------------------------
  const casoGraveRecusaOral = PsiquiatriaUrgenciaService.avaliarAgitacaoPsicomotora({
    gravidade: 'grave',
    escalaBars: 6,
    aceitaViaOral: false,
    etiologia: 'psicose'
  });

  assert.strictEqual(casoGraveRecusaOral.sucesso, true);
  assert.strictEqual(casoGraveRecusaOral.decisaoVia, 'INTRAMUSCULAR');
  assert.ok(casoGraveRecusaOral.prescricoes.some(p => p.includes('Haloperidol 5 mg IM') && p.includes('Prometazina 50 mg IM')), 'Deve prescrever Haloperidol + Prometazina IM');
  assert.ok(casoGraveRecusaOral.alertasSeguranca.some(a => a.includes('PROIBIÇÃO FORMAL: NUNCA aplicar Olanzapina IM conjuntamente com Benzodiazepínico')), 'Deve conter alerta de Olanzapina IM + BZD');
  assert.ok(casoGraveRecusaOral.alertasSeguranca.some(a => a.includes('EVITAR DIAZEPAM IM')), 'Deve desaconselhar Diazepam IM por absorção errática');
  console.log('✓ Teste 2: Agitação psicomotora grave com Haloperidol + Prometazina IM validada.');

  // ---------------------------------------------------------------------------
  // Teste 3: Agitação em Paciente Idoso com Delirium (Dose Reduzida e Evitar BZD)
  // ---------------------------------------------------------------------------
  const casoIdosoDelirium = PsiquiatriaUrgenciaService.avaliarAgitacaoPsicomotora({
    idade: 78,
    etiologia: 'delirium_organico',
    aceitaViaOral: true
  });

  assert.strictEqual(casoIdosoDelirium.ehIdoso, true);
  assert.ok(casoIdosoDelirium.prescricoes.some(p => p.includes('0.5 a 1 mg') || p.includes('Quetiapina')), 'Deve usar dose reduzida em idoso');
  assert.ok(casoIdosoDelirium.alertasSeguranca.some(a => a.includes('Evitar benzodiazepínicos na ausência de abstinência')), 'Deve alertar contra BZD em idosos sem abstinência');
  console.log('✓ Teste 3: Agitação em idoso com delirium e dose fracionada validada.');

  // ---------------------------------------------------------------------------
  // Teste 4: Contraindicação Absoluta de Haloperidol em Doença de Parkinson / Lewy
  // ---------------------------------------------------------------------------
  const casoParkinson = PsiquiatriaUrgenciaService.avaliarAgitacaoPsicomotora({
    comorbidades: ['parkinson'],
    aceitaViaOral: true
  });

  assert.ok(casoParkinson.alertasSeguranca.some(a => a.includes('ALERTA PARKINSON') && a.includes('CONTRAINDICAÇÃO FORMAL DE HALOPERIDOL')), 'Deve contraindicar Haloperidol em Parkinson');
  assert.ok(casoParkinson.prescricoes.some(p => p.includes('Quetiapina')), 'Deve indicar Quetiapina em parkinsonianos');
  console.log('✓ Teste 4: Proteção dopaminérgica em Doença de Parkinson validada.');

  // ---------------------------------------------------------------------------
  // Teste 5: Síndrome de Abstinência Alcoólica (BZD + Tiamina e Evitar Haloperidol Isolado)
  // ---------------------------------------------------------------------------
  const casoAbstinenciaAlcoolica = PsiquiatriaUrgenciaService.avaliarAgitacaoPsicomotora({
    etiologia: 'abstinencia_alcoolica',
    aceitaViaOral: false
  });

  assert.ok(casoAbstinenciaAlcoolica.prescricoes.some(p => p.includes('Diazepam 10 mg IV') || p.includes('Midazolam 5 mg')), 'Deve usar benzodiazepínico em abstinência etílica');
  assert.ok(casoAbstinenciaAlcoolica.prescricoes.some(p => p.includes('Tiamina 300 mg')), 'Deve administrar Tiamina parenteral');
  assert.ok(casoAbstinenciaAlcoolica.alertasSeguranca.some(a => a.includes('SÍNDROME DE ABSTINÊNCIA ALCOÓLICA') && a.includes('Wernicke')), 'Deve alertar sobre prevenção de Wernicke');
  console.log('✓ Teste 5: Manejo de Síndrome de Abstinência Alcoólica validado.');

  // ---------------------------------------------------------------------------
  // Teste 6: Reversão de Distonia Aguda Extrapiramidal (Biperideno)
  // ---------------------------------------------------------------------------
  const casoDistonia = PsiquiatriaUrgenciaService.manejarDistoniaAguda({
    via: 'iv',
    biperidenoDisponivel: true
  });

  assert.strictEqual(casoDistonia.sucesso, true);
  assert.ok(casoDistonia.conduta.farmacoPrincipal.includes('Biperideno 5 mg'), 'Deve indicar Biperideno 5mg');
  assert.ok(casoDistonia.conduta.posologia.includes('IV LENTO'), 'Posologia intravenosa lenta');
  assert.ok(casoDistonia.conduta.manutencaoVO.includes('Biperideno 2 mg VO'), 'Prescrição preventiva de manutenção por 48-72h');

  // Alternativa quando Biperideno indisponível
  const casoDistoniaSemBiperideno = PsiquiatriaUrgenciaService.manejarDistoniaAguda({
    biperidenoDisponivel: false
  });
  assert.ok(casoDistoniaSemBiperideno.conduta.farmacoPrincipal.includes('Prometazina'), 'Deve usar Prometazina como alternativa');
  console.log('✓ Teste 6: Protocolo de reversão de distonia aguda validado.');

  // ---------------------------------------------------------------------------
  // Teste 7: Síndrome Neuroléptica Maligna (SNM)
  // ---------------------------------------------------------------------------
  const casoSnm = PsiquiatriaUrgenciaService.avaliarSindromeNeurolepticaMaligna({
    temperatura: 39.5,
    rigidezMuscular: true,
    instabilidadeAutonomica: true,
    alteracaoConsciencia: true,
    cpk: 4500
  });

  assert.strictEqual(casoSnm.sucesso, true);
  assert.strictEqual(casoSnm.suspeitaClinicaSNM, true);
  assert.strictEqual(casoSnm.criteriosPresentes, 5);
  assert.ok(casoSnm.condutaUrgente.some(c => c.includes('SUSPENDER IMEDIATAMENTE')), 'Deve suspender antipsicóticos');
  assert.ok(casoSnm.condutaUrgente.some(c => c.includes('UTI')), 'Deve transferir para UTI');
  assert.ok(casoSnm.condutaUrgente.some(c => c.includes('Dantroleno') || c.includes('Bromocriptina')), 'Deve sugerir Dantroleno / Bromocriptina');
  console.log('✓ Teste 7: Critérios de Síndrome Neuroléptica Maligna validados.');

  // ---------------------------------------------------------------------------
  // Teste 8: Síndrome Serotoninérgica pelos Critérios de Hunter
  // ---------------------------------------------------------------------------
  const casoHunter = PsiquiatriaUrgenciaService.avaliarSindromeSerotoninergica({
    usaSerotoninergico: true,
    clonusEspontaneo: true,
    temperatura: 38.6
  });

  assert.strictEqual(casoHunter.sucesso, true);
  assert.strictEqual(casoHunter.atendeCriteriosHunter, true);
  assert.strictEqual(casoHunter.gravidade, 'GRAVE_RISCO_VIDA');
  assert.ok(casoHunter.condutaEmergencia.some(c => c.includes('Ciproeptadina 12 mg')), 'Deve prescrever antídoto Ciproeptadina');
  assert.ok(casoHunter.condutaEmergencia.some(c => c.includes('BENZODIAZEPÍNICOS')), 'Deve indicar sedação com benzodiazepínicos');
  console.log('✓ Teste 8: Síndrome Serotoninérgica (Critérios de Hunter) validada.');

  // ---------------------------------------------------------------------------
  // Teste 9: Avaliação de Risco de Suicídio Iminente (Vigilância 1:1 e Internação)
  // ---------------------------------------------------------------------------
  const casoSuicidioIminente = PsiquiatriaUrgenciaService.avaliarRiscoSuicidio({
    ideacaoAtiva: true,
    planoEstruturado: true,
    intencaoSuicida: true,
    acessoMeiosLetais: true,
    tentativaPrevia: true
  });

  assert.strictEqual(casoSuicidioIminente.sucesso, true);
  assert.strictEqual(casoSuicidioIminente.nivelRisco, 'IMINENTE');
  assert.strictEqual(casoSuicidioIminente.indicacaoInternacao, 'INTERNACAO_HOSPITALAR_OBRIGATORIA');
  assert.ok(casoSuicidioIminente.condutaImediata.some(c => c.includes('VIGILÂNCIA 1:1 CONTÍNUA')), 'Exige vigilância 1:1 contínua');
  assert.ok(casoSuicidioIminente.condutaImediata.some(c => c.includes('REVISTA DE PERTENCES')), 'Exige revista imediata de pertences');
  assert.ok(casoSuicidioIminente.condutaImediata.some(c => c.includes('Lei Federal 10.216/2001')), 'Cita amparo legal da internação involuntária');
  console.log('✓ Teste 9: Risco de suicídio iminente e conduta protecionista validados.');

  // ---------------------------------------------------------------------------
  // Teste 10: Rastreamento de Depressão via PHQ-9 (Escore Grave + Pergunta 9 Positiva)
  // ---------------------------------------------------------------------------
  const casoPhq9Grave = PsiquiatriaUrgenciaService.avaliarDepressaoPhq9({
    respostas: [3, 3, 2, 3, 2, 3, 2, 2, 2], // Soma = 22, Q9 = 2
    comorbidades: ['insonia_grave', 'perda_peso']
  });

  assert.strictEqual(casoPhq9Grave.sucesso, true);
  assert.strictEqual(casoPhq9Grave.pontuacaoTotal, 22);
  assert.strictEqual(casoPhq9Grave.gravidade, 'GRAVE');
  assert.strictEqual(casoPhq9Grave.alertaIdeacaoSuicida, true);
  assert.strictEqual(casoPhq9Grave.valorPergunta9, 2);
  // Paciente com insônia e perda de peso -> Mirtazapina
  assert.strictEqual(casoPhq9Grave.antidepressivoRecomendado.medicamento, 'Mirtazapina');
  console.log('✓ Teste 10: PHQ-9 grave com trigger na pergunta 9 e Mirtazapina validado.');

  // ---------------------------------------------------------------------------
  // Teste 11: Seleção de Antidepressivo em Cardiopata / Pós-IAM (Sertralina / SADHART)
  // ---------------------------------------------------------------------------
  const casoCardiopata = PsiquiatriaUrgenciaService.selecionarAntidepressivo({
    cardiopatia: true,
    posIam: true
  });

  assert.strictEqual(casoCardiopata.sucesso, true);
  assert.strictEqual(casoCardiopata.antidepressivoRecomendado.medicamento, 'Sertralina');
  assert.ok(casoCardiopata.justificativaFarmacologica.includes('SADHART'), 'Deve referenciar o estudo SADHART');
  assert.ok(casoCardiopata.contraindicacoes.some(c => c.includes('TRICÍCLICOS')), 'Deve alertar contra tricíclicos em cardiopatas');
  console.log('✓ Teste 11: Seleção de Sertralina para paciente cardiopata validada.');

  // ---------------------------------------------------------------------------
  // Teste 12: Seleção de Antidepressivo em Dor Crônica / Fibromialgia (Duloxetina IRSN)
  // ---------------------------------------------------------------------------
  const casoDorCronica = PsiquiatriaUrgenciaService.selecionarAntidepressivo({
    dorCronica: true,
    fibromialgia: true
  });

  assert.strictEqual(casoDorCronica.antidepressivoRecomendado.medicamento, 'Duloxetina');
  assert.strictEqual(casoDorCronica.antidepressivoRecomendado.classe.includes('IRSN'), true);
  console.log('✓ Teste 12: Seleção de Duloxetina para dor crônica validada.');

  // ---------------------------------------------------------------------------
  // Teste 13: Bloqueio Absoluto de Bupropiona em Epilepsia ou Bulimia Nervosa
  // ---------------------------------------------------------------------------
  const casoEpilepsia = PsiquiatriaUrgenciaService.selecionarAntidepressivo({
    tabagismo: true,
    epilepsia: true
  });

  assert.ok(casoEpilepsia.contraindicacoes.some(c => c.includes('CONTRAINDICAÇÃO ABSOLUTA DE BUPROPIONA')), 'Deve contraindicar Bupropiona formalmente em convulsões');
  // Não deve selecionar Bupropiona mesmo com tabagismo
  assert.notStrictEqual(casoEpilepsia.antidepressivoRecomendado.medicamento, 'Bupropiona');
  console.log('✓ Teste 13: Bloqueio de segurança de Bupropiona em epilepsia validado.');

  // ---------------------------------------------------------------------------
  // Teste 14: Avaliação Completa Integrada e Resumo Formatado
  // ---------------------------------------------------------------------------
  const casoCompleto = PsiquiatriaUrgenciaService.avaliarPsiquiatriaCompleto({
    gravidade: 'grave',
    aceitaViaOral: false,
    ideacaoAtiva: true,
    planoEstruturado: true,
    respostas: [3, 2, 2, 2, 2, 2, 2, 1, 1],
    cardiopatia: true
  });

  assert.strictEqual(casoCompleto.sucesso, true);
  assert.ok(casoCompleto.resumoFormatado.includes('ULTRA ROTINA · CONDUTA INTEGRADA EM PSIQUIATRIA'), 'Resumo deve conter cabeçalho');
  assert.ok(casoCompleto.resumoFormatado.includes('AGITAÇÃO PSICOMOTORA'), 'Resumo deve conter seção de agitação');
  assert.ok(casoCompleto.resumoFormatado.includes('RISCO DE SUICÍDIO'), 'Resumo deve conter seção de suicídio');
  assert.ok(casoCompleto.resumoFormatado.includes('PHQ-9'), 'Resumo deve conter seção de PHQ-9');
  assert.ok(casoCompleto.resumoFormatado.includes('188'), 'Resumo deve conter telefone do CVV');
  console.log('✓ Teste 14: Avaliação psiquiátrica completa integrada validada.');

  // ---------------------------------------------------------------------------
  // Teste 15: Integração Fastify RPC via server/runtime.js
  // ---------------------------------------------------------------------------
  const crypto = require('crypto');
  const botToken = 'dummy-token';
  runtime.ctx.ConfigService.exigir = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : (k === 'TELEGRAM_BOT_TOKEN' ? botToken : 'dummy');
  const hashEsperado = crypto.createHmac('sha256', botToken).update('123').digest('hex');
  const fakeSession = 'ck_' + hashEsperado;

  const rpcAgitacao = runtime.cockpitRpc('cockpitPsiquiatriaUrgencia', fakeSession, [{
    acao: 'avaliarAgitacaoPsicomotora',
    gravidade: 'grave',
    aceitaViaOral: false
  }]);
  assert.strictEqual(rpcAgitacao.sucesso, true);
  assert.strictEqual(rpcAgitacao.decisaoVia, 'INTRAMUSCULAR');

  const rpcSuicidio = runtime.cockpitRpc('cockpitPsiquiatriaUrgencia', fakeSession, [{
    acao: 'estratificarRiscoSuicidio',
    tentativaRecente: true
  }]);
  assert.strictEqual(rpcSuicidio.sucesso, true);
  assert.strictEqual(rpcSuicidio.nivelRisco, 'IMINENTE');

  const rpcPhq9 = runtime.cockpitRpc('cockpitPsiquiatriaUrgencia', fakeSession, [{
    acao: 'avaliarDepressaoPhq9',
    respostas: [3, 3, 3, 2, 2, 2, 2, 2, 1],
    cardiopatia: true
  }]);
  assert.strictEqual(rpcPhq9.sucesso, true);
  assert.strictEqual(rpcPhq9.antidepressivoRecomendado.medicamento, 'Sertralina');

  const rpcDistonia = runtime.cockpitRpc('cockpitPsiquiatriaUrgencia', fakeSession, [{
    acao: 'avaliarDistoniaAguda',
    via: 'iv'
  }]);
  assert.strictEqual(rpcDistonia.sucesso, true);
  assert.ok(rpcDistonia.conduta.farmacoPrincipal.includes('Biperideno'));

  const rpcSerotonina = runtime.cockpitRpc('cockpitPsiquiatriaUrgencia', fakeSession, [{
    acao: 'avaliarSindromeSerotoninergica',
    clonusEspontaneo: true
  }]);
  assert.strictEqual(rpcSerotonina.sucesso, true);
  assert.strictEqual(rpcSerotonina.atendeCriteriosHunter, true);

  console.log('✓ Teste 15: Integração Fastify RPC (cockpitPsiquiatriaUrgencia) 100% validada.');

  console.log('\n🚀 TODOS OS TESTES DE PSIQUIATRIA DE URGÊNCIA PASSARAM COM SUCESSO!\n');
}

runTests();
