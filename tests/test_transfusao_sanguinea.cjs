/**
 * ==============================================================================
 * TESTES DETERMINÍSTICOS: PROTOCOLO AVANÇADO DE TRANSFUSÃO SANGUÍNEA E HEMOTERAPIA
 * ==============================================================================
 * Validação rigorosa dos pilares clínicos:
 *  1. Gatilho Restritivo em Paciente Clínico Estável (Hb < 7.0 g/dL)
 *  2. Gatilho Restritivo não atingido (Hb >= 7.0 g/dL - Bloqueio de transfusão desnecessária)
 *  3. Gatilho Liberal Modificado em Doença Coronariana Aguda (SCA/IAM - Hb < 8.0 g/dL)
 *  4. Alerta de Prevenção de Sobrecarga Circulatória (TACO) em Idosos e Cardiopatas
 *  5. Protocolo de Transfusão Maciça (PTM) com Escore ABC >= 2 e Choque Catastrófico
 *  6. Regra Estrita de O Negativo em Mulher em Idade Fértil sem tipagem
 *  7. Regra de O Positivo em Homem / Mulher Pós-Menopausa para preservação de estoque
 *  8. Janela Crítica de Ácido Tranexâmico (< 3 horas vs > 3 horas - CRASH-2 / WOMAN)
 *  9. Reposição Ponderada de Plasma Fresco Congelado (PFC - 10 a 15 mL/kg)
 * 10. Gatilhos Escalonados de Concentrado de Plaquetas (10k, 20k, 50k, 100k)
 * 11. Bloqueio Sentinela Absoluto de Plaquetas em Suspeita de PTT e HIT
 * 12. Reposição de Crioprecipitado em Hipofibrinogenemia Grave (HPP e Trauma)
 * 13. Escore ISTH para CIVD Manifesta (Overt DIC >= 5 pontos) com Suporte Hemoterápico
 * 14. Diagnóstico Diferencial de Reações Transfusionais Agudas (Hemólise ABO, TACO, Anafilaxia)
 * 15. Integração Fastify RPC via cockpitTransfusaoSanguinea
 * 16. Benchmark de Alta Performance (< 20ms)
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');
const { performance } = require('perf_hooks');

const TransfusaoSanguineaService = require(path.join(__dirname, '../src/02_transfusao_sanguinea.js'));
const runtime = require(path.join(__dirname, '../server/runtime.js'));

console.log('🧪 Iniciando testes do Módulo Avançado de Transfusão Sanguínea e Hemoterapia...');

// ─────────────────────────────────────────────────────────────────────────────
// 1. Gatilho Restritivo em Paciente Clínico Estável (Hb 6.5 g/dL)
// ─────────────────────────────────────────────────────────────────────────────
const t0 = performance.now();
const resEstavel = TransfusaoSanguineaService.avaliarGatilhoTransfusionalChad({
  hb: 6.5,
  peso: 70,
  cenarioClinico: 'ESTAVEL_GERAL',
  idade: 45
});
const dt1 = performance.now() - t0;

assert.strictEqual(resEstavel.indicada, true, 'Hb 6.5 em estável deve ter indicação transfusional');
assert.strictEqual(resEstavel.gatilhoHb, 7.0, 'Gatilho restritivo deve ser 7.0 g/dL');
assert.strictEqual(resEstavel.estrategia, 'RESTRITIVA', 'Estratégia deve ser RESTRITIVA');
assert.strictEqual(resEstavel.bolsasCalculadas, 1, 'Paciente estável deve receber 1 bolsa de cada vez');
assert.strictEqual(resEstavel.deltaEsperadoPorBolsa, 1.0, 'Elevação esperada de ~1.0 g/dL em 70 kg');
assert.strictEqual(resEstavel.riscoTaco, false, 'Sem risco de TACO em paciente jovem sem cardiopatia');
console.log(`✓ 1. Gatilho restritivo estável validado (${dt1.toFixed(2)}ms)`);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Bloqueio de Transfusão Desnecessária em Hb >= 7.0 g/dL
// ─────────────────────────────────────────────────────────────────────────────
const resNaoIndicada = TransfusaoSanguineaService.avaliarGatilhoTransfusionalChad({
  hb: 7.6,
  peso: 75,
  cenarioClinico: 'ESTAVEL_GERAL',
  sintomasAnemia: false
});

assert.strictEqual(resNaoIndicada.indicada, false, 'Hb 7.6 assintomático não deve receber CHAD');
assert.strictEqual(resNaoIndicada.bolsasCalculadas, 0, 'Zero bolsas para Hb normal/estável');
assert.ok(resNaoIndicada.alertas[0].includes('Estratégia restritiva mantida'), 'Deve conter alerta sobre diretriz restritiva');
console.log('✓ 2. Bloqueio de transfusão desnecessária com Hb >= 7.0 validado');

// ─────────────────────────────────────────────────────────────────────────────
// 3. Gatilho Liberal Modificado em Doença Coronariana Aguda (SCA/IAM)
// ─────────────────────────────────────────────────────────────────────────────
const resSca = TransfusaoSanguineaService.avaliarGatilhoTransfusionalChad({
  hb: 7.5,
  peso: 70,
  cenarioClinico: 'SCA',
  idade: 62
});

assert.strictEqual(resSca.indicada, true, 'Coronariopata com Hb 7.5 deve receber transfusão');
assert.strictEqual(resSca.gatilhoHb, 8.0, 'Gatilho coronariano deve ser 8.0 g/dL');
assert.strictEqual(resSca.hbAlvo, 9.0, 'Alvo coronariano deve ser 9.0 g/dL');
assert.strictEqual(resSca.estrategia, 'LIBERAL_MODIFICADA');
console.log('✓ 3. Gatilho liberal modificado em SCA/IAM validado');

// ─────────────────────────────────────────────────────────────────────────────
// 4. Prevenção de TACO em Idoso Cardiopata (ICC)
// ─────────────────────────────────────────────────────────────────────────────
const resTaco = TransfusaoSanguineaService.avaliarGatilhoTransfusionalChad({
  hb: 6.2,
  peso: 80,
  cenarioClinico: 'ESTAVEL_GERAL',
  idade: 78,
  comorbidades: ['ICC', 'HAS']
});

assert.strictEqual(resTaco.indicada, true);
assert.strictEqual(resTaco.riscoTaco, true, 'Deve identificar risco alto de TACO');
assert.ok(resTaco.alertaTaco.includes('TACO'), 'Alerta deve conter TACO');
assert.ok(resTaco.alertaTaco.includes('Furosemida'), 'Deve sugerir diurético (Furosemida)');
assert.ok(resTaco.recomendacaoVelocidade.includes('3 a 4 horas'), 'Velocidade lenta obrigatória');
console.log('✓ 4. Prevenção e alertas de TACO validados');

// ─────────────────────────────────────────────────────────────────────────────
// 5. Protocolo de Transfusão Maciça (PTM) com Escore ABC >= 2 e Choque
// ─────────────────────────────────────────────────────────────────────────────
const resPtm = TransfusaoSanguineaService.calcularProtocoloTransfusaoMaciça({
  peso: 70,
  idade: 30,
  sexo: 'M',
  fc: 132,
  pas: 82,
  traumaPenetrante: true,
  fastPositivo: true,
  sangramentoAtivo: true,
  tempoInicioSangramentoHoras: 1.2
});

assert.strictEqual(resPtm.ativacaoPtm, true, 'PTM deve ser formalmente ativado');
assert.strictEqual(resPtm.abcPontos, 4, 'Todos os 4 critérios ABC preenchidos (FC, PAS, penetrante, FAST)');
assert.ok(resPtm.shockIndex >= 1.4, 'Índice de choque catastrófico >= 1.4');
assert.strictEqual(resPtm.gravidadeChoque, 'CHOQUE_GRAVE_CATASTROFICO');
// Checagem Pacote 1 (1:1:1)
assert.strictEqual(resPtm.pacote1.chad.quantidade, 4);
assert.strictEqual(resPtm.pacote1.pfc.quantidade, 4);
assert.strictEqual(resPtm.pacote1.plaquetas.quantidade, 1);
assert.ok(resPtm.txa !== null, 'TXA deve estar prescrito dentro da janela de 3h');
assert.strictEqual(resPtm.pacote2.crioprecipitado.quantidade, 10, 'Pacote 2 deve ter 10 UI de Crioprecipitado');
console.log('✓ 5. Ativação de PTM com Escore ABC = 4 e proporção 1:1:1 validada');

// ─────────────────────────────────────────────────────────────────────────────
// 6. Regra Estrita de O Negativo em Mulher em Idade Fértil (<= 50 anos)
// ─────────────────────────────────────────────────────────────────────────────
const resMulherJovem = TransfusaoSanguineaService.calcularProtocoloTransfusaoMaciça({
  peso: 60,
  idade: 24,
  sexo: 'F',
  fc: 125,
  pas: 85,
  sangramentoAtivo: true
});

assert.strictEqual(resMulherJovem.tipoChadEmergencia, 'O_NEGATIVO', 'Mulher <= 50 anos deve receber O Negativo');
assert.ok(resMulherJovem.alertasCriticos[0].includes('MULHER EM IDADE FÉRTIL'), 'Justificativa para O Negativo');
console.log('✓ 6. Regra sentinela de O Negativo em mulher jovem validada');

// ─────────────────────────────────────────────────────────────────────────────
// 7. Regra de O Positivo em Homem para Preservação de Estoque
// ─────────────────────────────────────────────────────────────────────────────
const resHomemIdoso = TransfusaoSanguineaService.calcularProtocoloTransfusaoMaciça({
  peso: 75,
  idade: 68,
  sexo: 'M',
  fc: 130,
  pas: 80,
  sangramentoAtivo: true
});

assert.strictEqual(resHomemIdoso.tipoChadEmergencia, 'O_POSITIVO', 'Homem deve receber O Positivo na emergência');
console.log('✓ 7. Regra de O Positivo em homem validada');

// ─────────────────────────────────────────────────────────────────────────────
// 8. Janela Crítica de Ácido Tranexâmico (TXA)
// ─────────────────────────────────────────────────────────────────────────────
const resTxaTardio = TransfusaoSanguineaService.calcularProtocoloTransfusaoMaciça({
  fc: 120,
  pas: 85,
  sangramentoAtivo: true,
  tempoInicioSangramentoHoras: 4.5
});

assert.strictEqual(resTxaTardio.txa, null, 'TXA após 3 horas não deve ser prescrito');
assert.ok(resTxaTardio.alertasCriticos.some(a => a.includes('EXPIRADA (> 3 HORAS)')), 'Alerta de bloqueio do TXA tardio');
console.log('✓ 8. Janela crítica do Ácido Tranexâmico (<3h vs >3h) validada');

// ─────────────────────────────────────────────────────────────────────────────
// 9. Reposição Ponderada de Plasma Fresco Congelado (PFC)
// ─────────────────────────────────────────────────────────────────────────────
const resPfc = TransfusaoSanguineaService.calcularReposicaoPfc({
  peso: 70,
  rni: 2.2,
  sangramentoAtivo: true
});

assert.strictEqual(resPfc.indicada, true, 'PFC indicado para RNI 2.2 com sangramento');
assert.strictEqual(resPfc.volumeTotalRecomendadoMl, 840, '70 kg * 12 mL/kg = 840 mL');
assert.strictEqual(resPfc.bolsasRecomendadas, 4, '840 mL correspondem a 4 bolsas de PFC');

const resPfcSemSangramento = TransfusaoSanguineaService.calcularReposicaoPfc({
  peso: 70,
  rni: 1.3,
  sangramentoAtivo: false,
  procedimentoInvasivo: false
});
assert.strictEqual(resPfcSemSangramento.indicada, false, 'PFC contraindicado sem coagulopatia/sangramento');
console.log('✓ 9. Cálculo posológico de PFC (10-15 mL/kg) validado');

// ─────────────────────────────────────────────────────────────────────────────
// 10. Gatilhos Escalonados de Concentrado de Plaquetas (10k, 20k, 50k, 100k)
// ─────────────────────────────────────────────────────────────────────────────
// 10a. Profilático geral (10k)
const resPlaqProfilatico = TransfusaoSanguineaService.calcularReposicaoPlaquetas({
  plaquetasAtual: 8000,
  peso: 70
});
assert.strictEqual(resPlaqProfilatico.indicada, true);
assert.strictEqual(resPlaqProfilatico.gatilhoAlvo, 10000);
assert.strictEqual(resPlaqProfilatico.aféreseRecomendada, 1);
assert.strictEqual(resPlaqProfilatico.unidadesRandomicasCalculadas, 7);

// 10b. Sangramento ativo / cirurgia de grande porte (50k)
const resPlaqSangramento = TransfusaoSanguineaService.calcularReposicaoPlaquetas({
  plaquetasAtual: 38000,
  peso: 70,
  sangramentoAtivo: true
});
assert.strictEqual(resPlaqSangramento.indicada, true);
assert.strictEqual(resPlaqSangramento.gatilhoAlvo, 50000);

// 10c. Neurocirurgia / TCE (100k)
const resPlaqTce = TransfusaoSanguineaService.calcularReposicaoPlaquetas({
  plaquetasAtual: 75000,
  peso: 80,
  tceOuNeurotrauma: true
});
assert.strictEqual(resPlaqTce.indicada, true);
assert.strictEqual(resPlaqTce.gatilhoAlvo, 100000);
console.log('✓ 10. Gatilhos de plaquetas (10k, 50k, 100k) validados');

// ─────────────────────────────────────────────────────────────────────────────
// 11. Bloqueio Sentinela Absoluto de Plaquetas em Suspeita de PTT e HIT
// ─────────────────────────────────────────────────────────────────────────────
const resBloqueioPlaq = TransfusaoSanguineaService.calcularReposicaoPlaquetas({
  plaquetasAtual: 22000,
  peso: 70,
  suspeitaPttOuHit: true
});

assert.strictEqual(resBloqueioPlaq.indicada, false);
assert.strictEqual(resBloqueioPlaq.bloqueioAbsoluto, true);
assert.strictEqual(resBloqueioPlaq.categoria, 'CONTRAINDICADA_RISCO_TROMBOSE_FATAL');
assert.ok(resBloqueioPlaq.justificativa.includes('CONTRAINDICAÇÃO FORMAL ABSOLUTA'));
console.log('✓ 11. Bloqueio absoluto de plaquetas em PTT/HIT validado');

// ─────────────────────────────────────────────────────────────────────────────
// 12. Reposição de Crioprecipitado em Hipofibrinogenemia Grave
// ─────────────────────────────────────────────────────────────────────────────
const resCrio = TransfusaoSanguineaService.calcularReposicaoCrioprecipitado({
  fibrinogenioAtual: 85,
  peso: 70,
  cenario: 'HPP',
  sangramentoAtivo: true
});

assert.strictEqual(resCrio.indicada, true);
assert.strictEqual(resCrio.gatilhoFibrinogenio, 200, 'Em HPP o gatilho é 200 mg/dL');
assert.strictEqual(resCrio.alvoFibrinogenio, 200, 'Alvo em HPP é 200 mg/dL');
assert.ok(resCrio.bolsasCalculadas >= 8 && resCrio.bolsasCalculadas <= 15, 'Dose calculada de 8 a 15 bolsas');
console.log('✓ 12. Reposição de Crioprecipitado em HPP validada');

// ─────────────────────────────────────────────────────────────────────────────
// 13. Escore ISTH para CIVD Manifesta (Overt DIC Score)
// ─────────────────────────────────────────────────────────────────────────────
const resCivd = TransfusaoSanguineaService.avaliarCivd({
  plaquetas: 42000, // < 50k = 2 pts
  dDimeroAumento: 'ACENTUADO', // 3 pts
  tpAlargadoSegundos: 7, // >= 6s = 2 pts
  fibrinogenio: 80, // < 100 = 1 pt
  sangramentoAtivo: true
});

assert.strictEqual(resCivd.pontosTotais, 8, 'Total ISTH deve ser 8 pontos');
assert.strictEqual(resCivd.civdManifesta, true, 'Deve confirmar CIVD Manifesta');
assert.strictEqual(resCivd.classificacao, 'CIVD_MANIFESTA');
assert.ok(resCivd.planoAcao.some(p => p.includes('Plaquetas')), 'Deve sugerir suporte de plaquetas');
assert.ok(resCivd.planoAcao.some(p => p.includes('Plasma Fresco Congelado')), 'Deve sugerir PFC');
assert.ok(resCivd.planoAcao.some(p => p.includes('Crioprecipitado')), 'Deve sugerir Crioprecipitado');
console.log('✓ 13. Escore ISTH e conduta de CIVD manifesta validados');

// ─────────────────────────────────────────────────────────────────────────────
// 14. Diagnóstico Diferencial de Reações Transfusionais Agudas (RTA)
// ─────────────────────────────────────────────────────────────────────────────
// 14a. Reação Hemolítica Aguda ABO
const rAbo = TransfusaoSanguineaService.avaliarReacaoTransfusional({
  dorLombar: true,
  coluria: true,
  hipotensao: true,
  febre: true
});
assert.strictEqual(rAbo.tipoReacao, 'REACAO_HEMOLITICA_AGUDA_ABO');
assert.strictEqual(rAbo.gravidade, 'EMERGENCIA_MAXIMA');
assert.ok(rAbo.condutaImediata.some(c => c.includes('INTERRUPÇÃO IMEDIATA')));

// 14b. TACO
const rTaco = TransfusaoSanguineaService.avaliarReacaoTransfusional({
  dispneia: true,
  estertores: true,
  turgenciaJugular: true
});
assert.strictEqual(rTaco.tipoReacao, 'TACO_SOBRECARGA_CIRCULATORIA');
assert.ok(rTaco.condutaImediata.some(c => c.includes('Furosemida')));

// 14c. Anafilaxia
const rAnaf = TransfusaoSanguineaService.avaliarReacaoTransfusional({
  dispneia: true,
  estridor: true,
  urticaria: true,
  hipotensao: true
});
assert.strictEqual(rAnaf.tipoReacao, 'ANAFILAXIA_TRANSFUSIONAL');
assert.ok(rAnaf.condutaImediata.some(c => c.includes('Adrenalina')));
console.log('✓ 14. Diagnóstico diferencial de reações transfusionais agudas validado');

// ─────────────────────────────────────────────────────────────────────────────
// 15. Integração Fastify RPC via cockpitTransfusaoSanguinea
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');
const botToken = 'dummy-token-transfusao';
if (!runtime.ctx.ConfigService) runtime.ctx.ConfigService = {};
runtime.ctx.ConfigService.exigir = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : (k === 'TELEGRAM_BOT_TOKEN' ? botToken : 'dummy');
const hashEsperado = crypto.createHmac('sha256', botToken).update('123').digest('hex');
const fakeSession = 'ck_' + hashEsperado;

const rpcChad = runtime.cockpitRpc('cockpitTransfusaoSanguinea', fakeSession, [{
  acao: 'gatilhoChad',
  parametros: { hb: 6.4, peso: 70, cenarioClinico: 'ESTAVEL_GERAL' }
}]);
assert.strictEqual(rpcChad.sucesso, true);
assert.strictEqual(rpcChad.resultado.indicada, true);

const rpcPtm = runtime.cockpitRpc('cockpitTransfusaoSanguinea', fakeSession, [{
  acao: 'ptm',
  parametros: { fc: 125, pas: 85, traumaPenetrante: true, fastPositivo: true, sexo: 'F', idade: 25 }
}]);
assert.strictEqual(rpcPtm.sucesso, true);
assert.strictEqual(rpcPtm.resultado.ativacaoPtm, true);
assert.strictEqual(rpcPtm.resultado.tipoChadEmergencia, 'O_NEGATIVO');

const rpcCompleto = runtime.cockpitRpc('cockpitTransfusaoSanguinea', fakeSession, [{
  acao: 'completo',
  parametros: { hb: 6.8, peso: 70, cenarioClinico: 'ESTAVEL_GERAL', plaquetasAtual: 18000 }
}]);
assert.strictEqual(rpcCompleto.sucesso, true);
assert.ok(rpcCompleto.textoFormatado.includes('PAINEL DE HEMOTERAPIA'));
console.log('✓ 15. Integração Fastify RPC via cockpitTransfusaoSanguinea validada');

// ─────────────────────────────────────────────────────────────────────────────
// 16. Benchmark de Alta Performance (< 20ms)
// ─────────────────────────────────────────────────────────────────────────────
const tBench = performance.now();
for (let i = 0; i < 50; i++) {
  TransfusaoSanguineaService.avaliarGatilhoTransfusionalChad({ hb: 6.8, peso: 70 });
  TransfusaoSanguineaService.calcularProtocoloTransfusaoMaciça({ fc: 130, pas: 80, fastPositivo: true });
  TransfusaoSanguineaService.calcularReposicaoPlaquetas({ plaquetasAtual: 12000, peso: 70 });
  TransfusaoSanguineaService.calcularReposicaoPfc({ rni: 2.1, peso: 70, sangramentoAtivo: true });
  TransfusaoSanguineaService.calcularReposicaoCrioprecipitado({ fibrinogenioAtual: 90, peso: 70 });
}
const dtBench = performance.now() - tBench;
assert.ok(dtBench < 50, `50 iterações completas executadas em ${dtBench.toFixed(2)}ms (< 50ms)`);
console.log(`✓ 16. Benchmark de Alta Velocidade: 50 ciclos em ${dtBench.toFixed(2)}ms (~${(dtBench / 50).toFixed(3)}ms/ciclo)`);

console.log('🚀 TODOS OS 16 TESTES DO MÓDULO DE TRANSFUSÃO SANGUÍNEA PASSARAM COM SUCESSO!');
