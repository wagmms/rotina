const assert = require('assert');
const { ClimaterioThmService } = require('../src/02_climaterio_thm');

function runTests() {
  console.log('Iniciando suite de testes: Climatério e Terapia Hormonal da Menopausa (FEBRASGO/NAMS)');

  // ---------------------------------------------------------------------------
  // Teste 1: Janela de Oportunidade - Paciente Típica Aberta (< 60a e < 10a menopausa)
  // ---------------------------------------------------------------------------
  const janelaAberta = ClimaterioThmService.avaliarJanelaOportunidade({
    idade: 52,
    tempoMenopausaAnos: 2
  });

  assert.strictEqual(janelaAberta.status, 'DENTRO_DA_JANELA');
  assert.strictEqual(janelaAberta.elegivelInicio, true);
  assert.strictEqual(janelaAberta.relacaoRiscoBeneficio, 'AMPLAMENTE_FAVORAVEL');
  assert.ok(janelaAberta.classificacao.includes('Janela de Oportunidade Aberta'));

  // ---------------------------------------------------------------------------
  // Teste 2: Janela de Oportunidade - Ultrapassada / Fora da Janela (>= 60a e >= 10a)
  // ---------------------------------------------------------------------------
  const janelaUltrapassada = ClimaterioThmService.avaliarJanelaOportunidade({
    idade: 65,
    tempoMenopausaAnos: 15
  });

  assert.strictEqual(janelaUltrapassada.status, 'FORA_DA_JANELA');
  assert.strictEqual(janelaUltrapassada.elegivelInicio, false);
  assert.strictEqual(janelaUltrapassada.relacaoRiscoBeneficio, 'DESFAVORAVEL_PARA_INICIO');
  assert.ok(janelaUltrapassada.alertas.some(a => a.includes('NÃO RECOMENDADO O INÍCIO DE THM SISTÊMICA')));

  // ---------------------------------------------------------------------------
  // Teste 3: Janela de Oportunidade - Insuficiência Ovariana Prematura (< 40 anos)
  // ---------------------------------------------------------------------------
  const iop = ClimaterioThmService.avaliarJanelaOportunidade({
    idade: 36,
    idadeMenopausa: 34,
    insuficienciaOvarianaPrematura: true
  });

  assert.strictEqual(iop.status, 'INSUFICIENCIA_OVARIANA_PREMATURA');
  assert.strictEqual(iop.elegivelInicio, true);
  assert.strictEqual(iop.relacaoRiscoBeneficio, 'INDICACAO_MANDATORIA');
  assert.ok(iop.justificativa.includes('50-52 anos'));

  // ---------------------------------------------------------------------------
  // Teste 4: Regra de Ouro - Útero Intacto na Pós-Menopausa (Contínuo Combinado)
  // ---------------------------------------------------------------------------
  const protecaoUteroIntacto = ClimaterioThmService.determinarProtecaoEndometrial({
    uteroPresente: true,
    padraoMenstrual: 'pos_menopausa'
  });

  assert.strictEqual(protecaoUteroIntacto.uteroPresente, true);
  assert.strictEqual(protecaoUteroIntacto.necessitaProgestagenio, true);
  assert.strictEqual(protecaoUteroIntacto.regraDeOuro, 'OBRIGATÓRIA_ASSOCIACAO_PROGESTAGENIO');
  assert.strictEqual(protecaoUteroIntacto.esquemaRecomendado, 'CONTINUO_COMBINADO');
  assert.ok(protecaoUteroIntacto.alertaSeguranca.includes('REGRA DE OURO'));
  assert.ok(protecaoUteroIntacto.progestagenioPrimeiraEscolha.nome.includes('Progesterona Micronizada'));

  // ---------------------------------------------------------------------------
  // Teste 5: Regra de Ouro - Perimenopausa / Transição (Esquema Cíclico / Sequencial)
  // ---------------------------------------------------------------------------
  const protecaoTransicao = ClimaterioThmService.determinarProtecaoEndometrial({
    uteroPresente: true,
    emTransicaoMenopausica: true
  });

  assert.strictEqual(protecaoTransicao.uteroPresente, true);
  assert.strictEqual(protecaoTransicao.necessitaProgestagenio, true);
  assert.strictEqual(protecaoTransicao.esquemaRecomendado, 'SEQUENCIAL_CICLICO');
  assert.ok(protecaoTransicao.descricaoEsquema.includes('Esquema Cíclico / Sequencial'));

  // ---------------------------------------------------------------------------
  // Teste 6: Regra de Ouro - Histerectomizada sem Endometriose (Estrogênio Isolado)
  // ---------------------------------------------------------------------------
  const protecaoHisterectomizada = ClimaterioThmService.determinarProtecaoEndometrial({
    histerectomizada: true,
    historicoEndometriose: false
  });

  assert.strictEqual(protecaoHisterectomizada.uteroPresente, false);
  assert.strictEqual(protecaoHisterectomizada.necessitaProgestagenio, false);
  assert.strictEqual(protecaoHisterectomizada.esquemaRecomendado, 'ESTROGENIO_ISOLADO_CONTINUO');
  assert.strictEqual(protecaoHisterectomizada.progestagenioPrimeiraEscolha, null);

  // ---------------------------------------------------------------------------
  // Teste 7: Exceção Clínica - Histerectomizada com Histórico de Endometriose
  // ---------------------------------------------------------------------------
  const protecaoHisterectomizadaEndometriose = ClimaterioThmService.determinarProtecaoEndometrial({
    histerectomizada: true,
    historicoEndometriose: true
  });

  assert.strictEqual(protecaoHisterectomizadaEndometriose.uteroPresente, false);
  assert.strictEqual(protecaoHisterectomizadaEndometriose.necessitaProgestagenio, true);
  assert.strictEqual(protecaoHisterectomizadaEndometriose.regraDeOuro, 'EXCECAO_ENDOMETRIOSE_EXIGE_PROGESTAGENIO');
  assert.ok(protecaoHisterectomizadaEndometriose.alertaSeguranca.includes('EXCEÇÃO CLÍNICA FUNDAMENTAL'));

  // ---------------------------------------------------------------------------
  // Teste 8: Seleção de Via - Preferência Transdérmica Mandatória (HAS, IMC > 30, TG alto)
  // ---------------------------------------------------------------------------
  const viaTransdermica = ClimaterioThmService.selecionarViaAdministracao({
    has: true,
    imc: 32.5,
    triglicerideos: 240
  });

  assert.strictEqual(viaTransdermica.viaIndicada, 'TRANSDERMICA_PREFERENCIAL_MANDATORIA');
  assert.strictEqual(viaTransdermica.preferenciaTransdermica, true);
  assert.strictEqual(viaTransdermica.fatoresRiscoIdentificados.length, 3);
  assert.ok(viaTransdermica.justificativaFarmacologica.includes('primeira passagem hepática'));
  assert.strictEqual(viaTransdermica.medicamentosSugeridos[0].nome, 'Estradiol Gel 0,06% (17-beta-estradiol transdérmico)');

  // ---------------------------------------------------------------------------
  // Teste 9: Seleção de Via - Paciente Sem Comorbidades (Oral ou Transdérmica)
  // ---------------------------------------------------------------------------
  const viaHigida = ClimaterioThmService.selecionarViaAdministracao({
    has: false,
    imc: 22.0,
    triglicerideos: 110
  });

  assert.strictEqual(viaHigida.viaIndicada, 'ORAL_OU_TRANSDERMICA');
  assert.strictEqual(viaHigida.preferenciaTransdermica, false);
  assert.strictEqual(viaHigida.fatoresRiscoIdentificados.length, 0);

  // ---------------------------------------------------------------------------
  // Teste 10: Contraindicação Absoluta - Câncer de Mama Prévio
  // ---------------------------------------------------------------------------
  const contraindicacaoMama = ClimaterioThmService.auditarContraindicacoesThm({
    cancerMama: true
  });

  assert.strictEqual(contraindicacaoMama.elegivelThmSistemica, false);
  assert.strictEqual(contraindicacaoMama.grauSeguranca, 'CONTRAINDICADO_ABSOLUTO');
  assert.ok(contraindicacaoMama.contraindicacoesAbsolutas.some(c => c.fator.includes('Câncer de Mama')));
  assert.ok(contraindicacaoMama.alertasCriticos.some(a => a.includes('CONTRAINDICAÇÃO ABSOLUTA: Câncer de mama')));

  // ---------------------------------------------------------------------------
  // Teste 11: Contraindicação Absoluta - Sangramento Vaginal Não Investigado
  // ---------------------------------------------------------------------------
  const contraindicacaoSua = ClimaterioThmService.auditarContraindicacoesThm({
    sangramentoVaginalNaoEsclarecido: true
  });

  assert.strictEqual(contraindicacaoSua.elegivelThmSistemica, false);
  assert.ok(contraindicacaoSua.contraindicacoesAbsolutas.some(c => c.fator.includes('Sangramento Vaginal Anormal')));
  assert.ok(contraindicacaoSua.alertasCriticos.some(a => a.includes('BLOQUEIO MANDATÓRIO: Sangramento pós-menopausa')));

  // ---------------------------------------------------------------------------
  // Teste 12: Contraindicação Absoluta - TEV Prévio / Trombofilia / DAC
  // ---------------------------------------------------------------------------
  const contraindicacaoTev = ClimaterioThmService.auditarContraindicacoesThm({
    tvpPrevia: true,
    iamPrevio: true
  });

  assert.strictEqual(contraindicacaoTev.elegivelThmSistemica, false);
  assert.ok(contraindicacaoTev.contraindicacoesAbsolutas.some(c => c.fator.includes('Tromboembolismo Venoso')));
  assert.ok(contraindicacaoTev.contraindicacoesAbsolutas.some(c => c.fator.includes('Doença Arterial Aterosclerótica')));

  // ---------------------------------------------------------------------------
  // Teste 13: Alternativas Não Hormonais e Bloqueio Paroxetina x Tamoxifeno
  // ---------------------------------------------------------------------------
  const altTamoxifeno = ClimaterioThmService.sugerirAlternativasNaoHormonais({
    usoTamoxifeno: true
  });

  assert.strictEqual(altTamoxifeno.usoTamoxifeno, true);
  assert.ok(altTamoxifeno.opcoesFarmacologicas.some(o => o.farmaco.includes('Desvenlafaxina')));
  const paroxetinaBloqueada = altTamoxifeno.opcoesFarmacologicas.find(o => o.farmaco.includes('Paroxetina'));
  assert.ok(paroxetinaBloqueada);
  assert.strictEqual(paroxetinaBloqueada.contraindicado, true);
  assert.ok(paroxetinaBloqueada.alertaCritico.includes('CYP2D6'));

  // ---------------------------------------------------------------------------
  // Teste 14: Síndrome Geniturinária da Menopausa (SGM) Isolada
  // ---------------------------------------------------------------------------
  const sgmIsolada = ClimaterioThmService.avaliarSintomasGeniturinarios({
    ressecamentoVaginal: true,
    dispareunia: true,
    fogachos: false
  });

  assert.strictEqual(sgmIsolada.presente, true);
  assert.strictEqual(sgmIsolada.terapiaTopicaIndicada, true);
  assert.strictEqual(sgmIsolada.apenasUrogenital, true);
  assert.ok(sgmIsolada.recomendacaoPrincipal.includes('NÃO indicar THM sistêmica'));
  assert.ok(sgmIsolada.segurancaEndometrial.includes('NÃO há necessidade de associação com progestagênio'));

  // ---------------------------------------------------------------------------
  // Teste 15: Checklist Pré-THM - Mamografia Desatualizada Bloqueia Prescrição
  // ---------------------------------------------------------------------------
  const checklistPendente = ClimaterioThmService.verificarChecklistPreThm({
    mamografiaAtualizada: false
  });

  assert.strictEqual(checklistPendente.liberadoPrescricao, false);
  assert.ok(checklistPendente.pendenciasCriticas.some(p => p.includes('Mamografia Bilateral ausente')));

  const checklistLiberado = ClimaterioThmService.verificarChecklistPreThm({
    mamografiaAtualizada: true,
    mamografiaBirads: '2',
    preventivoColoAtualizado: true
  });

  assert.strictEqual(checklistLiberado.liberadoPrescricao, true);
  assert.strictEqual(checklistLiberado.pendenciasCriticas.length, 0);

  // ---------------------------------------------------------------------------
  // Teste 16: Avaliação Integrada Completa - Paciente Elegível (THM Sistêmica Segura)
  // ---------------------------------------------------------------------------
  const casoElegivel = ClimaterioThmService.avaliarThmCompleto({
    idade: 51,
    tempoMenopausaAnos: 2,
    uteroPresente: true,
    has: true,
    imc: 28,
    triglicerideos: 180,
    mamografiaAtualizada: true,
    mamografiaBirads: '1',
    preventivoColoAtualizado: true,
    fogachos: true
  });

  assert.strictEqual(casoElegivel.statusFinal, 'THM_SISTEMICA_INDICADA_E_SEGURA');
  assert.strictEqual(casoElegivel.podePrescreverThmSistemica, true);
  assert.strictEqual(casoElegivel.protecaoEndometrial.necessitaProgestagenio, true);
  assert.strictEqual(casoElegivel.viaAdministracao.preferenciaTransdermica, true);
  assert.ok(casoElegivel.planoPrescricao.estrogenio.nome.includes('Estradiol Gel'));
  assert.ok(casoElegivel.planoPrescricao.progestagenio.nome.includes('Progesterona Micronizada'));

  // ---------------------------------------------------------------------------
  // Teste 17: Avaliação Integrada Completa - Paciente Contraindicada (Câncer Mama)
  // ---------------------------------------------------------------------------
  const casoContraindicado = ClimaterioThmService.avaliarThmCompleto({
    idade: 53,
    tempoMenopausaAnos: 3,
    cancerMama: true,
    fogachos: true,
    usoTamoxifeno: true
  });

  assert.strictEqual(casoContraindicado.statusFinal, 'THM_SISTEMICA_NAO_INDICADA_OU_CONTRAINDICADA');
  assert.strictEqual(casoContraindicado.podePrescreverThmSistemica, false);
  assert.strictEqual(casoContraindicado.planoPrescricao, null);
  assert.ok(casoContraindicado.alternativasNaoHormonais !== null);
  assert.ok(casoContraindicado.alternativasNaoHormonais.opcoesFarmacologicas.some(o => o.farmaco.includes('Desvenlafaxina')));

  // ---------------------------------------------------------------------------
  // Teste 18: Formatação de Resumo em Texto
  // ---------------------------------------------------------------------------
  const textoResumo = ClimaterioThmService.gerarResumoThm({
    idade: 52,
    tempoMenopausaAnos: 2,
    uteroPresente: true,
    has: true,
    imc: 29,
    triglicerideos: 160,
    mamografiaAtualizada: true,
    mamografiaBirads: '2',
    preventivoColoAtualizado: true,
    fogachos: true
  });

  assert.ok(textoResumo.includes('PARECER DETERMINÍSTICO: CLIMATÉRIO E TERAPIA HORMONAL'));
  assert.ok(textoResumo.includes('REGRA DE OURO DA PROTEÇÃO ENDOMETRIAL'));
  assert.ok(textoResumo.includes('Estradiol Gel 0,06%'));
  assert.ok(textoResumo.includes('Progesterona Micronizada'));

  // ---------------------------------------------------------------------------
  // Teste 19: Integração com Runtime / Cockpit RPC
  // ---------------------------------------------------------------------------
  const runtime = require('../server/runtime');
  const crypto = require('crypto');
  const botToken = 'fake_bot_token_climaterio_test';
  runtime.ctx.ConfigService.get = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : null;
  runtime.ctx.ConfigService.exigir = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : (k === 'TELEGRAM_BOT_TOKEN' ? botToken : 'dummy');
  const hashEsperado = crypto.createHmac('sha256', botToken).update('123').digest('hex');
  const fakeSession = 'ck_' + hashEsperado;

  const rpcResCompleto = runtime.cockpitRpc('cockpitClimaterioThm', fakeSession, [{
    acao: 'avaliarThmCompleto',
    idade: 52,
    tempoMenopausaAnos: 2,
    uteroPresente: true,
    has: true,
    imc: 29,
    triglicerideos: 170,
    mamografiaAtualizada: true,
    mamografiaBirads: '1',
    preventivoColoAtualizado: true,
    fogachos: true
  }]);

  assert.strictEqual(rpcResCompleto.statusFinal, 'THM_SISTEMICA_INDICADA_E_SEGURA');
  assert.strictEqual(rpcResCompleto.podePrescreverThmSistemica, true);
  assert.strictEqual(rpcResCompleto.protecaoEndometrial.necessitaProgestagenio, true);
  assert.strictEqual(rpcResCompleto.viaAdministracao.preferenciaTransdermica, true);

  const rpcResResumo = runtime.cockpitRpc('cockpitClimaterioThm', fakeSession, [{
    acao: 'gerarResumoThm',
    idade: 52,
    tempoMenopausaAnos: 2,
    uteroPresente: true
  }]);
  assert.ok(typeof rpcResResumo === 'string');
  assert.ok(rpcResResumo.includes('PARECER DETERMINÍSTICO: CLIMATÉRIO'));

  console.log('Todos os testes de Climatério e THM passaram com 100% de sucesso!');
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };

