const assert = require('assert');
const { DipAbscessoTuboOvarianoService } = require('../src/02_dip_abscesso_tubo_ovariano');

function runTests() {
  console.log('Iniciando suite de testes: Doença Inflamatória Pélvica (DIP) e Abscesso Tubo-Ovariano (PCDT MS / CDC)');

  // ---------------------------------------------------------------------------
  // Teste 1: Caso clássico Hager / PCDT MS Ambulatorial (Monif I)
  // ---------------------------------------------------------------------------
  const casoAmbulatorialClassico = DipAbscessoTuboOvarianoService.avaliarDipCompleto({
    dorHipogastrio: true,
    dorAnexial: true,
    dorMobilizacaoColo: true,
    febre: true,
    temperaturaCelsius: 38.0,
    corrimentoEndocervicalAnormal: true,
    leucocitose: true,
    leucocitosValor: 13500,
    pesoKg: 62
  });

  assert.strictEqual(casoAmbulatorialClassico.sucesso, true);
  assert.strictEqual(casoAmbulatorialClassico.criteriosDiagnosticos.statusDiagnostico, 'CONFIRMADO_CRITERIOS_HAGER_PCDT');
  assert.strictEqual(casoAmbulatorialClassico.criteriosDiagnosticos.criteriosMaiores.totalPresentes, 3);
  assert.strictEqual(casoAmbulatorialClassico.criteriosDiagnosticos.indicacaoTratamentoEmpirico, true);
  assert.strictEqual(casoAmbulatorialClassico.estadiamentoMonif.estagio, 'ESTAGIO_I');
  assert.strictEqual(casoAmbulatorialClassico.criteriosInternacao.indicacaoInternacao, false);
  assert.strictEqual(casoAmbulatorialClassico.condutaTerapeutica.localTratamento, 'AMBULATORIAL');

  // Validação das medicações ambulatoriais
  const prescricoesAmb = casoAmbulatorialClassico.condutaTerapeutica.prescricoes.join(' | ');
  assert.ok(prescricoesAmb.includes('Ceftriaxona 500 mg IM dose única'), 'Deve prescrever Ceftriaxona 500mg IM');
  assert.ok(prescricoesAmb.includes('Doxiciclina 100 mg VO'), 'Deve prescrever Doxiciclina 100mg VO');
  assert.ok(prescricoesAmb.includes('Metronidazol 500 mg VO'), 'Deve prescrever Metronidazol 500mg VO');
  assert.strictEqual(casoAmbulatorialClassico.condutaTerapeutica.planoSeguimento.reavaliacaoObrigatoriaHoras, 72);
  console.log('✓ Teste 1: Caso clássico ambulatorial (Monif I - Hager/PCDT) validado com sucesso.');

  // ---------------------------------------------------------------------------
  // Teste 2: Ajuste posológico para obesidade severa (Peso >= 150 kg)
  // ---------------------------------------------------------------------------
  const casoObesaGrave = DipAbscessoTuboOvarianoService.avaliarDipCompleto({
    dorHipogastrio: true,
    dorAnexial: true,
    dorMobilizacaoColo: true,
    pesoKg: 154
  });

  const prescricoesObesa = casoObesaGrave.condutaTerapeutica.prescricoes.join(' | ');
  assert.ok(prescricoesObesa.includes('Ceftriaxona 1 g IM dose única'), 'Dose deve ser ajustada para 1g IM se peso >= 150 kg');
  const alertaPeso = casoObesaGrave.condutaTerapeutica.alertasSeguranca.some(a => a.includes('150 kg'));
  assert.strictEqual(alertaPeso, true, 'Deve gerar alerta de dose de Ceftriaxona dobrada para 1g');
  console.log('✓ Teste 2: Ajuste de Ceftriaxona por peso corporal (>= 150 kg) validado.');

  // ---------------------------------------------------------------------------
  // Teste 3: Limiar prático do CDC (dor hipogástrio + mobilização colo isolada)
  // ---------------------------------------------------------------------------
  const casoSuspeitaCdc = DipAbscessoTuboOvarianoService.avaliarCriteriosDiagnosticos({
    dorHipogastrio: true,
    dorMobilizacaoColo: true,
    dorAnexial: false
  });

  assert.strictEqual(casoSuspeitaCdc.statusDiagnostico, 'SUSPEITA_CLINICA_CDC_INDICADA_TERAPIA');
  assert.strictEqual(casoSuspeitaCdc.indicacaoTratamentoEmpirico, true);
  assert.ok(casoSuspeitaCdc.justificativa.includes('CDC STI Guidelines'));
  console.log('✓ Teste 3: Limiar de alta sensibilidade e conduta empírica do CDC validado.');

  // ---------------------------------------------------------------------------
  // Teste 4: Critério Elaborado Definitivo (USG / Biópsia / Laparoscopia)
  // ---------------------------------------------------------------------------
  const casoCriterioElaborado = DipAbscessoTuboOvarianoService.avaliarCriteriosDiagnosticos({
    dorHipogastrio: true,
    dorAnexial: false,
    dorMobilizacaoColo: false,
    imagemCompativel: true
  });

  assert.strictEqual(casoCriterioElaborado.statusDiagnostico, 'CONFIRMADO_CRITERIO_ELABORADO');
  assert.strictEqual(casoCriterioElaborado.confiancaDiagnostica, 'DEFINITIVA');
  assert.strictEqual(casoCriterioElaborado.criteriosElaborados.imagemCompativel, true);
  console.log('✓ Teste 4: Confirmação definitiva por critério elaborado de imagem/laparoscopia validada.');

  // ---------------------------------------------------------------------------
  // Teste 5: Gestante com DIP (Internação obrigatória e bloqueio de Doxiciclina)
  // ---------------------------------------------------------------------------
  const casoGestante = DipAbscessoTuboOvarianoService.avaliarDipCompleto({
    dorHipogastrio: true,
    dorAnexial: true,
    dorMobilizacaoColo: true,
    gestante: true
  });

  assert.strictEqual(casoGestante.criteriosInternacao.indicacaoInternacao, true);
  assert.strictEqual(casoGestante.condutaTerapeutica.localTratamento, 'HOSPITALAR');
  const prescricoesGestante = casoGestante.condutaTerapeutica.prescricoes.join(' | ');
  assert.ok(prescricoesGestante.includes('Azitromicina'), 'Azitromicina deve substituir a Doxiciclina na gestante');
  assert.ok(!prescricoesGestante.includes('Doxiciclina'), 'Doxiciclina não pode estar na prescrição de gestante');
  const alertaGestante = casoGestante.condutaTerapeutica.alertasSeguranca.some(a => a.includes('Doxiciclina'));
  assert.strictEqual(alertaGestante, true, 'Deve gerar alerta de bloqueio absoluto de tetraciclinas');
  console.log('✓ Teste 5: Gestante com DIP (internação obrigatória e bloqueio de Doxiciclina) validado.');

  // ---------------------------------------------------------------------------
  // Teste 6: Abscesso Tubo-Ovariano (ATO) Íntegro de 6 cm (Monif III)
  // ---------------------------------------------------------------------------
  const casoAtoIntegro = DipAbscessoTuboOvarianoService.avaliarDipCompleto({
    dorHipogastrio: true,
    dorAnexial: true,
    dorMobilizacaoColo: true,
    presencaAto: true,
    tamanhoAtoCm: 6.0,
    pesoKg: 70
  });

  assert.strictEqual(casoAtoIntegro.estadiamentoMonif.estagio, 'ESTAGIO_III');
  assert.strictEqual(casoAtoIntegro.criteriosInternacao.indicacaoInternacao, true);
  assert.strictEqual(casoAtoIntegro.condutaTerapeutica.localTratamento, 'HOSPITALAR');
  const prescricaoAto = casoAtoIntegro.condutaTerapeutica.prescricoes.join(' | ');
  assert.ok(prescricaoAto.includes('Clindamicina 900 mg IV'), 'Deve prescrever Clindamicina 900mg IV para ATO');
  assert.ok(prescricaoAto.includes('Gentamicina'), 'Deve prescrever Gentamicina com dose ponderada para ATO');
  assert.ok(prescricaoAto.includes('140 mg'), 'Dose de ataque da gentamicina para 70 kg deve ser ~140 mg (2 mg/kg)');
  console.log('✓ Teste 6: Abscesso Tubo-Ovariano íntegro (Monif III / Clinda + Genta) validado.');

  // ---------------------------------------------------------------------------
  // Teste 7: ATO Volumoso (>= 8 cm) com indicação de drenagem precoce
  // ---------------------------------------------------------------------------
  const casoAtoVolumoso = DipAbscessoTuboOvarianoService.avaliarDipCompleto({
    dorHipogastrio: true,
    dorAnexial: true,
    dorMobilizacaoColo: true,
    presencaAto: true,
    tamanhoAtoCm: 9.5
  });

  assert.strictEqual(casoAtoVolumoso.estadiamentoMonif.necessidadeCirurgica, 'AVALIAR_DRENAGEM_PRECOCE_SE_MAIOR_8CM');
  assert.ok(casoAtoVolumoso.estadiamentoMonif.alertaCritico.includes('drenagem percutânea'));
  console.log('✓ Teste 7: ATO volumoso (>= 8 cm) com indicação de drenagem precoce guiada validado.');

  // ---------------------------------------------------------------------------
  // Teste 8: Estágio IV de Monif (ATO Roto / Choque Séptico - Emergência Cirúrgica)
  // ---------------------------------------------------------------------------
  const casoAtoRoto = DipAbscessoTuboOvarianoService.avaliarDipCompleto({
    dorHipogastrio: true,
    dorAnexial: true,
    dorMobilizacaoColo: true,
    presencaAto: true,
    atoRoto: true,
    choqueSeptico: true
  });

  assert.strictEqual(casoAtoRoto.estadiamentoMonif.estagio, 'ESTAGIO_IV');
  assert.strictEqual(casoAtoRoto.estadiamentoMonif.necessidadeCirurgica, 'EMERGENCIA_CIRURGICA_IMEDIATA');
  assert.ok(casoAtoRoto.estadiamentoMonif.alertaCritico.includes('EMERGÊNCIA CIRÚRGICA ABSOLUTA'));
  console.log('✓ Teste 8: Estágio IV de Monif (Ruptura de ATO / Choque séptico) validado.');

  // ---------------------------------------------------------------------------
  // Teste 9: Manejo do DIU em DIP Não Complicada (Monif I)
  // ---------------------------------------------------------------------------
  const diuEstavel = DipAbscessoTuboOvarianoService.avaliarCondutaDiu({
    diuPresente: true,
    estagioMonif: 'ESTAGIO_I',
    refrataria72h: false
  });

  assert.strictEqual(diuEstavel.condutaRecomendada, 'MANTER_DIU_INICIALMENTE_E_REAVALIAR_EM_72H');
  assert.strictEqual(diuEstavel.removerImediatamente, false);
  console.log('✓ Teste 9: Conduta conservadora inicial para DIU em DIP leve/moderada validada.');

  // ---------------------------------------------------------------------------
  // Teste 10: Manejo do DIU em ATO ou Refratariedade após 72h
  // ---------------------------------------------------------------------------
  const diuAto = DipAbscessoTuboOvarianoService.avaliarCondutaDiu({
    diuPresente: true,
    estagioMonif: 'ESTAGIO_III'
  });
  assert.strictEqual(diuAto.removerImediatamente, true);
  assert.strictEqual(diuAto.condutaRecomendada, 'REMOVER_DIU_SOB_COBERTURA_ANTIBIOTICA');

  const diuFalha = DipAbscessoTuboOvarianoService.avaliarCondutaDiu({
    diuPresente: true,
    estagioMonif: 'ESTAGIO_I',
    refrataria72h: true
  });
  assert.strictEqual(diuFalha.removerAposFalha, true);
  assert.strictEqual(diuFalha.condutaRecomendada, 'REMOVER_DIU_DEVIDO_A_FALHA_CLINICA_EM_72H');
  console.log('✓ Teste 10: Remoção de DIU em DIP grave ou refratária em 72h validada.');

  // ---------------------------------------------------------------------------
  // Teste 11: Protocolo Obrigatório de Parceiros Sexuais
  // ---------------------------------------------------------------------------
  const parceiros60d = DipAbscessoTuboOvarianoService.gerarProtocoloParceiros({ diasUltimoContato: 45 });
  assert.strictEqual(parceiros60d.obrigatorio, true);
  assert.strictEqual(parceiros60d.janelaTemporal, 'Últimos 60 dias');
  assert.ok(parceiros60d.rastreioSorologicoMandatorio.length >= 4);

  const parceirosAntigo = DipAbscessoTuboOvarianoService.gerarProtocoloParceiros({ diasUltimoContato: 80 });
  assert.ok(parceirosAntigo.orientacaoJanela.includes('último parceiro sexual DEVE ser tratado'));
  console.log('✓ Teste 11: Convocação, rastreio e tratamento de parceiros sexuais validado.');

  // ---------------------------------------------------------------------------
  // Teste 12: Síndrome de Fitz-Hugh-Curtis e Alerta de Peri-hepatite
  // ---------------------------------------------------------------------------
  const casoFitzHugh = DipAbscessoTuboOvarianoService.avaliarDipCompleto({
    dorHipogastrio: true,
    dorAnexial: true,
    dorMobilizacaoColo: true,
    sintomaFitzHughCurtis: true
  });

  assert.strictEqual(casoFitzHugh.criteriosDiagnosticos.sindromeFitzHughCurtisPresente, true);
  assert.ok(casoFitzHugh.criteriosDiagnosticos.alertaFitzHughCurtis.includes('FITZ-HUGH-CURTIS'));
  console.log('✓ Teste 12: Síndrome de Fitz-Hugh-Curtis (peri-hepatite) identificada.');

  // ---------------------------------------------------------------------------
  // Teste 13: Ajuste Renal de Gentamicina (ClCr < 50 mL/min)
  // ---------------------------------------------------------------------------
  const casoRenal = DipAbscessoTuboOvarianoService.avaliarDipCompleto({
    dorHipogastrio: true,
    dorAnexial: true,
    dorMobilizacaoColo: true,
    presencaAto: true,
    clcr: 32
  });

  const alertaRenal = casoRenal.condutaTerapeutica.alertasSeguranca.some(a => a.includes('NEFROTOXICIDADE'));
  assert.strictEqual(alertaRenal, true, 'Deve alertar nefrotoxicidade e ajuste de dose/intervalo da Gentamicina');
  console.log('✓ Teste 13: Auditoria de segurança renal para Gentamicina (ClCr < 50) validada.');

  // ---------------------------------------------------------------------------
  // Teste 14: Geração de Relatório Clínico Estruturado
  // ---------------------------------------------------------------------------
  const textoRelatorio = DipAbscessoTuboOvarianoService.gerarResumoDip(casoAmbulatorialClassico);
  assert.ok(textoRelatorio.includes('PARECER CLÍNICO: DOENÇA INFLAMATÓRIA PÉLVICA'));
  assert.ok(textoRelatorio.includes('Ceftriaxona 500 mg'));
  assert.ok(textoRelatorio.includes('ORIENTAÇÃO DOXICICLINA'));
  assert.ok(textoRelatorio.includes('ORIENTAÇÃO METRONIDAZOL'));
  console.log('✓ Teste 14: Relatório clínico humanizado e estruturado gerado com sucesso.');

  // ---------------------------------------------------------------------------
  // Teste 15: Execução Integrada no Servidor Runtime Fastify (Cockpit RPC)
  // ---------------------------------------------------------------------------
  const runtime = require('../server/runtime');
  const crypto = require('crypto');
  const botToken = 'dummy-token';
  runtime.ctx.ConfigService.exigir = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : (k === 'TELEGRAM_BOT_TOKEN' ? botToken : 'dummy');
  const hashEsperado = crypto.createHmac('sha256', botToken).update('123').digest('hex');
  const fakeSession = 'ck_' + hashEsperado;

  const rpcResult = runtime.cockpitRpc('cockpitDipAbscessoTuboOvariano', fakeSession, [{
    acao: 'avaliarDipCompleto',
    dorHipogastrio: true,
    dorAnexial: true,
    dorMobilizacaoColo: true,
    febre: true,
    pesoKg: 65
  }]);

  assert.strictEqual(rpcResult.sucesso, true);
  assert.strictEqual(rpcResult.condutaTerapeutica.localTratamento, 'AMBULATORIAL');

  const rpcCriterios = runtime.cockpitRpc('cockpitDipAbscessoTuboOvariano', fakeSession, [{
    acao: 'avaliarCriteriosDiagnosticos',
    dorHipogastrio: true,
    dorAnexial: true,
    dorMobilizacaoColo: true
  }]);
  assert.strictEqual(rpcCriterios.criteriosMaiores.todosPresentes, true);

  console.log('✓ Teste 15: Integração no Fastify/Cockpit RPC validada com sucesso.');
  console.log('🚀 TODOS OS TESTES DE DIP E ABSCESSO TUBO-OVARIANO PASSARAM COM SUCESSO!\n');
}

runTests();
