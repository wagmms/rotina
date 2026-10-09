const assert = require('assert');
const SuporteNutricionalService = require('../src/02_suporte_nutricional');
const runtime = require('../server/runtime');

function runTests() {
  console.log('Iniciando suite de testes: Suporte Nutricional Enteral e Parenteral (BRASPEN / ESPEN / ASPEN / AMIB)');

  // ---------------------------------------------------------------------------
  // Teste 1: Adulto Hígido em Enfermaria (Harris-Benedict e Regra de Bolso)
  // ---------------------------------------------------------------------------
  const adultoEnf = SuporteNutricionalService.calcularNecessidadesBasais(70, 175, 40, 'm', 1.2, 'enfermaria');
  assert.strictEqual(adultoEnf.sucesso, true);
  assert.strictEqual(adultoEnf.antropometria.imc, 22.9);
  assert.strictEqual(adultoEnf.antropometria.ehObeso, false);
  assert.ok(adultoEnf.gebHarrisBenedict >= 1600 && adultoEnf.gebHarrisBenedict <= 1750, 'GEB deve estar entre 1600 e 1750 kcal');
  assert.strictEqual(adultoEnf.alvoCaloricoDia.minKcal, 1750); // 70 * 25
  assert.strictEqual(adultoEnf.alvoCaloricoDia.maxKcal, 2100); // 70 * 30
  assert.strictEqual(adultoEnf.alvoProteicoDia.minGramas, 70);  // 70 * 1.0
  assert.strictEqual(adultoEnf.alvoProteicoDia.maxGramas, 84);  // 70 * 1.2
  console.log('✓ Teste 1: Adulto hígido com Harris-Benedict e regra de bolso validado.');

  // ---------------------------------------------------------------------------
  // Teste 2: Paciente Crítico em UTI (Catabolismo e Alta Demanda Proteica)
  // ---------------------------------------------------------------------------
  const criticoUti = SuporteNutricionalService.calcularNecessidadesBasais(65, 170, 55, 'm', 1.3, 'uti');
  assert.strictEqual(criticoUti.sucesso, true);
  assert.strictEqual(criticoUti.alvoCaloricoDia.minKcal, 1625); // 65 * 25
  assert.strictEqual(criticoUti.alvoCaloricoDia.maxKcal, 1950); // 65 * 30
  assert.ok(criticoUti.alvoProteicoDia.minGramas >= 84, 'Proteína mínima em UTI deve ser >= 1.3 g/kg');
  assert.ok(criticoUti.alvoProteicoDia.maxGramas >= 130, 'Proteína máxima em UTI deve alcançar até 2.0 g/kg');
  console.log('✓ Teste 2: Paciente crítico em UTI com meta hiperproteica validada.');

  // ---------------------------------------------------------------------------
  // Teste 3: Fase Aguda Inicial de UTI (Alvo Hipocalórico Trófico Anti-Superalimentação)
  // ---------------------------------------------------------------------------
  const faseAguda = SuporteNutricionalService.calcularNecessidadesBasais(70, 175, 60, 'm', 1.2, 'fase_aguda');
  assert.strictEqual(faseAguda.sucesso, true);
  assert.strictEqual(faseAguda.alvoCaloricoDia.minKcal, 1400); // 70 * 20
  assert.strictEqual(faseAguda.alvoCaloricoDia.maxKcal, 1680); // 70 * 24
  assert.ok(faseAguda.orientacaoClinica.includes('Fase aguda inicial de UTI'), 'Deve orientar dieta trófica nos primeiros 2 dias');
  console.log('✓ Teste 3: Alvo hipocalórico trófico para fase aguda de UTI validado.');

  // ---------------------------------------------------------------------------
  // Teste 4: Paciente Obeso Crítico (IMC >= 30, Dieta Hipocalórica Hiperproteica)
  // ---------------------------------------------------------------------------
  const obesoCritico = SuporteNutricionalService.calcularNecessidadesBasais(110, 170, 50, 'f', 1.2, 'uti');
  assert.strictEqual(obesoCritico.antropometria.ehObeso, true);
  assert.strictEqual(obesoCritico.antropometria.imc, 38.1);
  assert.ok(obesoCritico.antropometria.pesoIdeal < 65, 'Peso ideal deve ser em torno de 60-63 kg');
  assert.ok(obesoCritico.antropometria.pesoAjustado > obesoCritico.antropometria.pesoIdeal, 'Peso ajustado deve ser superior ao peso ideal');
  assert.ok(obesoCritico.orientacaoClinica.includes('Estratégia hipocalórica hiperproteica'), 'Deve orientar protocolo de obesidade crítica');
  // 11 a 14 kcal/kg peso atual
  assert.strictEqual(obesoCritico.alvoCaloricoDia.minKcal, 1210); // 110 * 11
  assert.strictEqual(obesoCritico.alvoCaloricoDia.maxKcal, 1540); // 110 * 14
  console.log('✓ Teste 4: Paciente obeso crítico com peso ajustado e dieta hipocalórica hiperproteica validado.');

  // ---------------------------------------------------------------------------
  // Teste 5: Paciente em Hemodiálise Contínua (CRRT) vs DRC Conservadora
  // ---------------------------------------------------------------------------
  const renalCrrt = SuporteNutricionalService.calcularNecessidadesBasais(70, 175, 55, 'm', 1.3, 'crrt');
  assert.ok(renalCrrt.alvoProteicoDia.minGramas >= 119, 'Proteína mínima em CRRT deve ser >= 1.7 g/kg');
  assert.ok(renalCrrt.orientacaoClinica.includes('Hemodiálise Contínua (CRRT)'));

  const renalConservador = SuporteNutricionalService.calcularNecessidadesBasais(70, 175, 55, 'm', 1.0, 'drc_conservador');
  assert.strictEqual(renalConservador.alvoProteicoDia.minGramas, 56); // 70 * 0.8
  assert.strictEqual(renalConservador.alvoProteicoDia.maxGramas, 70); // 70 * 1.0
  assert.ok(renalConservador.orientacaoClinica.includes('DRC não-dialítica'));
  console.log('✓ Teste 5: Alvos proteicos em CRRT vs DRC conservadora validados.');

  // ---------------------------------------------------------------------------
  // Teste 6: Síndrome de Realimentação - Critérios Maiores (IMC < 16 e Perda Ponderal > 15%)
  // ---------------------------------------------------------------------------
  const refeedingAltoRisco = SuporteNutricionalService.avaliarRiscoRealimentacao({
    imc: 15.2,
    perdaPesoPct: 18,
    diasJejum: 12
  });
  assert.strictEqual(refeedingAltoRisco.altoRisco, true);
  assert.ok(refeedingAltoRisco.nivelRisco === 'ALTO' || refeedingAltoRisco.nivelRisco === 'EXTREMO');
  assert.ok(refeedingAltoRisco.criteriosMaioresDetectados.length >= 2);
  assert.ok(refeedingAltoRisco.condutasRecomendadas.some(c => c.includes('REPOSIÇÃO MANDATÓRIA DE TIAMINA PRÉ-DIETA')));
  assert.ok(refeedingAltoRisco.condutasRecomendadas.some(c => c.includes('10 a 15 kcal/kg/dia')));
  console.log('✓ Teste 6: Alto risco de síndrome de realimentação com critérios maiores validado.');

  // ---------------------------------------------------------------------------
  // Teste 7: Síndrome de Realimentação - Hipofosfatemia Basal Grave
  // ---------------------------------------------------------------------------
  const refeedingEletrolitos = SuporteNutricionalService.avaliarRiscoRealimentacao({
    imc: 18.0,
    perdaPesoPct: 8,
    diasJejum: 6,
    p: 1.6, // Fósforo grave < 2.0
    mg: 1.3
  });
  assert.strictEqual(refeedingEletrolitos.altoRisco, true);
  assert.ok(refeedingEletrolitos.criteriosMaioresDetectados.some(c => c.includes('Hipofosfatemia basal')));
  assert.ok(refeedingEletrolitos.condutasRecomendadas.some(c => c.includes('Fosfato de Potássio ou Fosfato de Sódio')));
  console.log('✓ Teste 7: Alerta e conduta de hipofosfatemia basal em realimentação validados.');

  // ---------------------------------------------------------------------------
  // Teste 8: Triagem de Risco Nutricional (NRS-2002)
  // ---------------------------------------------------------------------------
  const nrsAltoRisco = SuporteNutricionalService.calcularNrs2002({
    escoreNutricional: 2, // perda ponderal > 5% em 2 meses
    escoreDoenca: 2,      // grande cirurgia abdominal, AVC, pneumonia grave
    idade: 72             // >= 70 anos ganha +1 ponto
  });
  assert.strictEqual(nrsAltoRisco.escoreTotal, 5);
  assert.strictEqual(nrsAltoRisco.ajusteIdadeIdoso, 1);
  assert.strictEqual(nrsAltoRisco.altoRiscoNutricional, true);
  assert.ok(nrsAltoRisco.conduta.includes('Terapia Nutricional especializada precoce em até 24 a 48 horas'));

  const nrsBaixoRisco = SuporteNutricionalService.calcularNrs2002({
    escoreNutricional: 1,
    escoreDoenca: 0,
    idade: 45
  });
  assert.strictEqual(nrsBaixoRisco.escoreTotal, 1);
  assert.strictEqual(nrsBaixoRisco.altoRiscoNutricional, false);
  console.log('✓ Teste 8: Triagem NRS-2002 com pontuação e ajuste etário validada.');

  // ---------------------------------------------------------------------------
  // Teste 9: Prescrição de Nutrição Enteral Precoce (TGI Funcionante)
  // ---------------------------------------------------------------------------
  const prescricaoNe = SuporteNutricionalService.prescreverTerapiaNutricional({
    peso: 70,
    alturaCm: 175,
    idade: 55,
    sexo: 'm',
    diasJejum: 2,
    tratoGastrointestinalFuncionante: true,
    nrs2002: 4,
    densidadeKcalMl: 1.2,
    horasInfusao: 24
  });
  assert.strictEqual(prescricaoNe.sucesso, true);
  assert.ok(prescricaoNe.viaEscolhida.includes('NUTRIÇÃO ENTERAL'));
  assert.ok(prescricaoNe.tipoAcessoRecomendado.includes('Sonda Nasoenteral'));
  assert.ok(prescricaoNe.vazaoBombaInfusao.includes('mL/hora'));
  assert.strictEqual(prescricaoNe.densidadeDietaKcalMl, 1.2);
  console.log('✓ Teste 9: Prescrição de nutrição enteral precoce e cálculo de vazão validados.');

  // ---------------------------------------------------------------------------
  // Teste 10: Prescrição de NPT Precoce em TGI Inviável e Alto Risco
  // ---------------------------------------------------------------------------
  const prescricaoNptAltoRisco = SuporteNutricionalService.prescreverTerapiaNutricional({
    peso: 60,
    alturaCm: 165,
    idade: 62,
    sexo: 'f',
    diasJejum: 3,
    tratoGastrointestinalFuncionante: false,
    nrs2002: 4, // Alto risco nutricional
    condicaoClinica: 'ileo_paralitico_grave'
  });
  assert.strictEqual(prescricaoNptAltoRisco.sucesso, true);
  assert.ok(prescricaoNptAltoRisco.viaEscolhida.includes('NUTRIÇÃO PARENTERAL'));
  assert.ok(prescricaoNptAltoRisco.tipoAcessoRecomendado.includes('Cateter Venoso Central'));
  assert.ok(prescricaoNptAltoRisco.indicacoesClinicas.some(i => i.includes('ALTO RISCO nutricional com TGI inviável: Iniciar Nutrição Parenteral Total precoce')));
  console.log('✓ Teste 10: NPT precoce em paciente de alto risco com TGI inviável validada.');

  // ---------------------------------------------------------------------------
  // Teste 11: Prescrição de NPT Conservadora em Baixo Risco Nutricional (Aguardar 5-7 dias)
  // ---------------------------------------------------------------------------
  const prescricaoNptBaixoRisco = SuporteNutricionalService.prescreverTerapiaNutricional({
    peso: 75,
    alturaCm: 178,
    idade: 42,
    sexo: 'm',
    diasJejum: 2, // apenas 2 dias de jejum
    tratoGastrointestinalFuncionante: false,
    nrs2002: 1 // Baixo risco
  });
  assert.ok(prescricaoNptBaixoRisco.indicacoesClinicas.some(i => i.includes('Aguardar até 5 a 7 dias de jejum')));
  console.log('✓ Teste 11: NPT conservadora (aguardar 5-7 dias) em baixo risco validada.');

  // ---------------------------------------------------------------------------
  // Teste 12: Protocolo de Segurança e Volume Residual Gástrico (VRG)
  // ---------------------------------------------------------------------------
  assert.ok(prescricaoNe.protocoloMonitoramento.some(m => m.includes('Volume Residual Gástrico (VRG): NÃO suspender NE por resíduos inferiores a 500 mL/6h')));
  assert.ok(prescricaoNe.protocoloMonitoramento.some(m => m.includes('Cabeceira elevada a 30°-45°')));
  assert.ok(prescricaoNe.protocoloMonitoramento.some(m => m.includes('140 a 180 mg/dL')));
  console.log('✓ Teste 12: Protocolo de segurança de VRG e monitoramento glicêmico validado.');

  // ---------------------------------------------------------------------------
  // Teste 13: Avaliação Completa Integrada e Resumo Formatado
  // ---------------------------------------------------------------------------
  const avaliacaoCompleta = SuporteNutricionalService.avaliarSuporteNutricionalCompleto({
    peso: 72,
    alturaCm: 174,
    idade: 68,
    sexo: 'm',
    diasJejum: 5,
    tratoGastrointestinalFuncionante: true,
    condicaoClinica: 'sepse_uti',
    p: 1.8,
    mg: 1.4,
    escoreNutricional: 2,
    escoreDoenca: 2
  });
  assert.strictEqual(avaliacaoCompleta.sucesso, true);
  assert.ok(avaliacaoCompleta.resumoFormatado.includes('PROTOCOLO DE SUPORTE NUTRICIONAL'));
  assert.ok(avaliacaoCompleta.resumoFormatado.includes('METAS CALÓRICAS & PROTEICAS'));
  assert.ok(avaliacaoCompleta.resumoFormatado.includes('SÍNDROME DE REALIMENTAÇÃO'));
  assert.ok(avaliacaoCompleta.resumoFormatado.includes('PRESCRIÇÃO DA TERAPIA NUTRICIONAL'));
  console.log('✓ Teste 13: Avaliação completa integrada e resumo formatado validados.');

  // ---------------------------------------------------------------------------
  // Teste 14: Integração Fastify RPC (cockpitSuporteNutricional)
  // ---------------------------------------------------------------------------
  const crypto = require('crypto');
  const botToken = 'dummy-token-nutri';
  runtime.ctx.ConfigService.exigir = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : (k === 'TELEGRAM_BOT_TOKEN' ? botToken : 'dummy');
  const hashEsperado = crypto.createHmac('sha256', botToken).update('123').digest('hex');
  const fakeSession = 'ck_' + hashEsperado;

  const rpcBasal = runtime.cockpitRpc('cockpitSuporteNutricional', fakeSession, [{
    acao: 'calcularNecessidadesBasais',
    peso: 70,
    alturaCm: 175,
    idade: 45,
    sexo: 'm'
  }]);
  assert.strictEqual(rpcBasal.sucesso, true);

  const rpcRefeeding = runtime.cockpitRpc('cockpitSuporteNutricional', fakeSession, [{
    acao: 'avaliarRiscoRealimentacao',
    imc: 15.0,
    diasJejum: 10
  }]);
  assert.strictEqual(rpcRefeeding.altoRisco, true);

  const rpcCompleto = runtime.cockpitRpc('cockpitSuporteNutricional', fakeSession, [{
    acao: 'avaliarSuporteNutricionalCompleto',
    peso: 68,
    alturaCm: 170,
    idade: 60,
    sexo: 'f'
  }]);
  assert.strictEqual(rpcCompleto.sucesso, true);
  console.log('✓ Teste 14: Integração Fastify RPC cockpitSuporteNutricional validada.');

  // ---------------------------------------------------------------------------
  // Teste 15: Hidratação Basal e Estimativa Hídrica
  // ---------------------------------------------------------------------------
  assert.ok(adultoEnf.necessidadeHidricaEstimada.includes('2100 a 2450 mL/dia'), 'Deve calcular 30 a 35 mL/kg de hidratação');
  console.log('✓ Teste 15: Estimativa de hidratação basal (30-35 mL/kg) validada.');

  console.log('\n🚀 TODOS OS 15 TESTES DE SUPORTE NUTRICIONAL (UTI/ENFERMARIA) PASSARAM COM SUCESSO!\n');
}

runTests();
