/**
 * ==============================================================================
 * TESTES AUTOMATIZADOS: GINECOLOGIA AMBULATORIAL DE CONSULTÓRIO & APS
 * ==============================================================================
 * Suíte de testes determinísticos para o Módulo 02-E (GinecologiaAmbulatorialService).
 * Valida rigorosamente:
 *  1. Rastreio de Câncer de Colo Uterino (Diretrizes INCA/MS):
 *     - Contraindicação de rastreio em < 25 anos (infecção transitória HPV).
 *     - ASC-US e LSIL em < 25 anos (conduta expectante).
 *     - ASC-US em 25-29 anos (repetir em 12m) vs >= 30 anos (repetir em 6m).
 *     - LSIL em >= 25 anos (repetir em 6m).
 *     - ASC-US ou LSIL persistente (colposcopia imediata).
 *     - ASC-H e HSIL (colposcopia imediata; elegibilidade "Ver e Tratar").
 *     - AGC (colposcopia + canal + endométrio se >= 35 anos).
 *     - Encerramento aos 65 anos com exames prévios negativos.
 *     - Histerectomizada total dispensada.
 *     - Imunossuprimidas (qualquer atipia vai para colposcopia).
 *  2. Sangramento Uterino Anormal (SUA - FIGO PALM-COEIN):
 *     - Exclusão mandatória de gestação com Beta-hCG em idade fértil.
 *     - Detecção de choque hipovolêmico e tamponamento uterino com Foley.
 *     - Hemostasia de urgência: Ácido Tranexâmico + ACO decrescente vs Progestagênio.
 *     - Investigação mandatória na pós-menopausa se endométrio > 4 mm.
 *  3. Critérios Médicos de Elegibilidade de Anticoncepção da OMS (Categorias 1 a 4):
 *     - Enxaqueca com aura: AHC é Cat 4 (AVC), DIU Cobre é Cat 1.
 *     - TVP/TEP prévia ou ativa: AHC é Cat 4, DIU Cobre é Cat 1.
 *     - HAS grave descontrolada: AHC é Cat 4, DIU Cobre é Cat 1.
 *     - Tabagista >= 35 anos: AHC é Cat 4, métodos sem estrogênio são Cat 1.
 *     - Pós-parto < 6 semanas com amamentação: AHC é Cat 4.
 *     - Câncer de mama atual: TODOS hormonais são Cat 4; DIU Cobre é Cat 1 absoluto.
 *  4. Síndromes Infecciosas Vulvovaginais (Leucorreias):
 *     - Candidíase: Fluconazol 150mg VO dose única.
 *     - Bloqueio estrito de Fluconazol oral na gestante -> Miconazol tópico obrigatório.
 *     - Candidíase recorrente: indução D1/D4/D7 + manutenção semanal por 6 meses.
 *     - Vaginose bacteriana: critérios de Amsel, Metronidazol 7 dias, alerta dissulfiram, parceiro não tratado.
 *     - Tricomoníase: Metronidazol 2g dose única, TRATAMENTO MANDATÓRIO DO PARCEIRO e rastreio de ISTs.
 *  5. Integração com Fastify RPC Bridge no Node.js Runtime.
 * ==============================================================================
 */

const assert = require('assert');
const GinecologiaAmbulatorialService = require('../src/02_ginecologia_ambulatorial.js');
const runtime = require('../server/runtime.js');

console.log('🧪 Iniciando testes de GinecologiaAmbulatorialService...\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. RASTREAMENTO DO CÂNCER DO COLO UTERINO (INCA/MS)
// ─────────────────────────────────────────────────────────────────────────────

console.log('--- 1. Rastreamento do Câncer do Colo Uterino (INCA/MS) ---');

// Caso 1: Mulher < 25 anos com citologia de rotina (Não indicado rastreamento)
const jovemRotina = GinecologiaAmbulatorialService.avaliarRastreioColoUterino({
  idade: 21,
  resultadoCitologia: 'rotina'
});
assert.strictEqual(jovemRotina.elegivelRastreio, false);
assert.strictEqual(jovemRotina.classificacao, 'NAO_INDICADO_MENOR_25_ANOS');
assert.ok(jovemRotina.resumoConduta.indexOf('NÃO é recomendado antes dos 25 anos') >= 0);
console.log('  ✓ Caso 1: Contraindicação de rastreio de rotina em menor de 25 anos aprovada.');

// Caso 2: Mulher < 25 anos com ASC-US ou LSIL (Conduta expectante)
const jovemAscus = GinecologiaAmbulatorialService.avaliarRastreioColoUterino({
  idade: 23,
  resultadoCitologia: 'asc-us'
});
assert.strictEqual(jovemAscus.classificacao, 'CONDUTA_EXPECTANTE_MENOR_25');
assert.strictEqual(jovemAscus.localAtendimento, 'ATENCAO_BASICA');
console.log('  ✓ Caso 2: Conduta expectante em menor de 25 anos com ASC-US/LSIL aprovada.');

// Caso 3: Mulher 27 anos (25 a 29 anos) com ASC-US (Repetir em 12 meses na UBS)
const ascUs27 = GinecologiaAmbulatorialService.avaliarRastreioColoUterino({
  idade: 27,
  resultadoCitologia: 'asc-us'
});
assert.strictEqual(ascUs27.citologia, 'ASC_US');
assert.strictEqual(ascUs27.localAtendimento, 'ATENCAO_BASICA');
assert.ok(ascUs27.prazoRecomendado.indexOf('12 meses') >= 0);
console.log('  ✓ Caso 3: ASC-US em mulher de 27 anos -> repetição em 12 meses aprovada.');

// Caso 4: Mulher 35 anos (>= 30 anos) com ASC-US (Repetir em 6 meses na UBS)
const ascUs35 = GinecologiaAmbulatorialService.avaliarRastreioColoUterino({
  idade: 35,
  resultadoCitologia: 'asc-us'
});
assert.strictEqual(ascUs35.citologia, 'ASC_US');
assert.strictEqual(ascUs35.localAtendimento, 'ATENCAO_BASICA');
assert.ok(ascUs35.prazoRecomendado.indexOf('6 meses') >= 0);
console.log('  ✓ Caso 4: ASC-US em mulher de 35 anos -> repetição em 6 meses aprovada.');

// Caso 5: Mulher 30 anos com LSIL (Repetir em 6 meses na UBS)
const lsil30 = GinecologiaAmbulatorialService.avaliarRastreioColoUterino({
  idade: 30,
  resultadoCitologia: 'lsil'
});
assert.strictEqual(lsil30.citologia, 'LSIL');
assert.strictEqual(lsil30.localAtendimento, 'ATENCAO_BASICA');
assert.ok(lsil30.prazoRecomendado.indexOf('6 meses') >= 0);
console.log('  ✓ Caso 5: LSIL em mulher >= 25 anos -> repetição em 6 meses aprovada.');

// Caso 6: ASC-US ou LSIL persistente (Colposcopia especializada)
const lesaoPersistente = GinecologiaAmbulatorialService.avaliarRastreioColoUterino({
  idade: 32,
  resultadoCitologia: 'asc-us',
  ascUsOuLsilPrevio: true
});
assert.strictEqual(lesaoPersistente.localAtendimento, 'COLPOSCOPIA_ESPECIALIZADA');
assert.ok(lesaoPersistente.condutas[0].indexOf('COLPOSCOPIA') >= 0);
console.log('  ✓ Caso 6: Lesão persistente (2 exames alterados) -> colposcopia especializada aprovada.');

// Caso 7: ASC-H (Colposcopia Imediata)
const ascH = GinecologiaAmbulatorialService.avaliarRastreioColoUterino({
  idade: 34,
  resultadoCitologia: 'asc-h'
});
assert.strictEqual(ascH.citologia, 'ASC_H');
assert.strictEqual(ascH.localAtendimento, 'COLPOSCOPIA_ESPECIALIZADA');
assert.ok(ascH.prazoRecomendado.indexOf('Colposcopia IMEDIATA') >= 0);
console.log('  ✓ Caso 7: ASC-H -> colposcopia imediata aprovada.');

// Caso 8: HSIL com elegibilidade "Ver e Tratar"
const hsil = GinecologiaAmbulatorialService.avaliarRastreioColoUterino({
  idade: 29,
  resultadoCitologia: 'hsil'
});
assert.strictEqual(hsil.citologia, 'HSIL');
assert.strictEqual(hsil.localAtendimento, 'COLPOSCOPIA_ESPECIALIZADA');
assert.ok(hsil.condutas[1].indexOf('Ver e Tratar') >= 0);
console.log('  ✓ Caso 8: HSIL -> colposcopia imediata e conduta Ver e Tratar aprovada.');

// Caso 9: AGC (Colposcopia + canal + avaliação endometrial se >= 35 anos)
const agc = GinecologiaAmbulatorialService.avaliarRastreioColoUterino({
  idade: 42,
  resultadoCitologia: 'agc'
});
assert.strictEqual(agc.citologia, 'AGC');
assert.strictEqual(agc.localAtendimento, 'COLPOSCOPIA_ESPECIALIZADA');
assert.ok(agc.condutas[1].indexOf('Investigação Endometrial Mandatória') >= 0);
console.log('  ✓ Caso 9: AGC em mulher >= 35 anos -> canal endocervical e biópsia endometrial aprovada.');

// Caso 10: Encerramento de rastreamento aos 65 anos com exames normais
const encerramento68 = GinecologiaAmbulatorialService.avaliarRastreioColoUterino({
  idade: 68,
  resultadoCitologia: 'rotina',
  examesAnterioresNegativos: 2
});
assert.strictEqual(encerramento68.classificacao, 'ENCERRAMENTO_RASTREAMENTO');
assert.strictEqual(encerramento68.elegivelRastreio, false);
console.log('  ✓ Caso 10: Encerramento de rastreamento aos 68 anos com histórico negativo aprovado.');

// Caso 11: Histerectomizada Total por patologia benigna
const histerectomizada = GinecologiaAmbulatorialService.avaliarRastreioColoUterino({
  idade: 50,
  histerectomizadaTotal: true
});
assert.strictEqual(histerectomizada.classificacao, 'DISPENSADA_DO_RASTREAMENTO');
assert.strictEqual(histerectomizada.elegivelRastreio, false);
console.log('  ✓ Caso 11: Dispensa de rastreamento para histerectomia total aprovada.');

// Caso 12: Imunossuprimida com qualquer atipia (ASC-US) -> Colposcopia imediata
const imunoAscus = GinecologiaAmbulatorialService.avaliarRastreioColoUterino({
  idade: 26,
  resultadoCitologia: 'asc-us',
  imunossuprimida: true
});
assert.strictEqual(imunoAscus.imunossuprimida, true);
assert.strictEqual(imunoAscus.localAtendimento, 'COLPOSCOPIA_ESPECIALIZADA');
assert.strictEqual(imunoAscus.classificacao, 'COLPOSCOPIA_IMEDIATA_IMUNOSSUPRESSAO');
console.log('  ✓ Caso 12: Imunossuprimida com atipia -> colposcopia imediata aprovada.');


// ─────────────────────────────────────────────────────────────────────────────
// 2. SANGRAMENTO UTERINO ANORMAL (SUA - FIGO / PALM-COEIN)
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 2. Sangramento Uterino Anormal (FIGO PALM-COEIN) ---');

// Caso 13: Exclusão mandatória de gravidez com Beta-hCG
const suaSemBhcg = GinecologiaAmbulatorialService.avaliarSangramentoUterinoAnormal({
  idade: 29,
  intensidade: 'moderada',
  betaHcg: 'nao_realizado'
});
assert.ok(suaSemBhcg.alertas.some(a => a.indexOf('MANDATÓRIO: Realizar teste imunológico de gravidez') >= 0));
console.log('  ✓ Caso 13: Alerta mandatório de Beta-hCG em mulher em idade fértil aprovado.');

// Caso 14: Beta-hCG positivo em mulher com SUA -> redireciona para obstetrícia
const suaGravida = GinecologiaAmbulatorialService.avaliarSangramentoUterinoAnormal({
  idade: 27,
  betaHcg: 'positivo'
});
assert.strictEqual(suaGravida.gravidez, true);
assert.strictEqual(suaGravida.classificacao, 'SANGRAMENTO_PRIMEIRO_TRIMESTRE_OBSTETRICO');
console.log('  ✓ Caso 14: Detecção de gravidez e redirecionamento obstétrico imediato aprovado.');

// Caso 15: Choque Hipovolêmico / Instabilidade Hemodinâmica (Tamponamento com Foley)
const suaChoque = GinecologiaAmbulatorialService.avaliarSangramentoUterinoAnormal({
  idade: 36,
  pas: 80,
  fc: 125,
  intensidade: 'grave_aguda',
  betaHcg: 'negativo'
});
assert.strictEqual(suaChoque.choqueInstavel, true);
assert.ok(suaChoque.indiceChoque >= 1.0);
assert.ok(suaChoque.condutasEmergencia.some(c => c.indexOf('sonda Foley') >= 0));
console.log('  ✓ Caso 15: Identificação de Choque Hipovolêmico e conduta com sonda Foley aprovada.');

// Caso 16: SUA Agudo Grave Estável sem contraindicação a estrogênio (Tranexâmico + ACO)
const suaAgudoAco = GinecologiaAmbulatorialService.avaliarSangramentoUterinoAnormal({
  idade: 32,
  pas: 120,
  fc: 80,
  intensidade: 'grave_aguda',
  betaHcg: 'negativo',
  contraindicacaoEstrogenio: false
});
assert.strictEqual(suaAgudoAco.choqueInstavel, false);
assert.ok(suaAgudoAco.prescricoesSugeridas.some(p => p.farmaco.indexOf('Ácido Tranexâmico') >= 0));
assert.ok(suaAgudoAco.prescricoesSugeridas.some(p => p.farmaco.indexOf('Anticoncepcional Oral Combinado') >= 0));
console.log('  ✓ Caso 16: Prescrição de Ácido Tranexâmico + ACO em esquema de hemostasia rápida aprovada.');

// Caso 17: SUA Agudo com contraindicação a estrogênio -> Medroxiprogesterona
const suaAgudoProgest = GinecologiaAmbulatorialService.avaliarSangramentoUterinoAnormal({
  idade: 38,
  pas: 120,
  fc: 78,
  intensidade: 'grave_aguda',
  betaHcg: 'negativo',
  contraindicacaoEstrogenio: true
});
assert.ok(suaAgudoProgest.prescricoesSugeridas.some(p => p.farmaco.indexOf('Acetato de Medroxiprogesterona') >= 0));
console.log('  ✓ Caso 17: Prescrição de Progestagênio isolado na contraindicação ao estrogênio aprovada.');

// Caso 18: SUA na Pós-Menopausa com endométrio espessado (> 4 mm) -> Biópsia
const suaPosMenopausa = GinecologiaAmbulatorialService.avaliarSangramentoUterinoAnormal({
  idade: 59,
  posMenopausa: true,
  espessuraEndometrioMm: 7.5
});
assert.strictEqual(suaPosMenopausa.posMenopausa, true);
assert.ok(suaPosMenopausa.alertas.some(a => a.indexOf('ENDOMÉTRIO ESPESSADO') >= 0));
assert.ok(suaPosMenopausa.condutasAmbulatoriais.some(c => c.indexOf('Biópsia Endometrial') >= 0));
console.log('  ✓ Caso 18: Alerta de endométrio espessado na pós-menopausa com biópsia obrigatória aprovado.');


// ─────────────────────────────────────────────────────────────────────────────
// 3. CRITÉRIOS DE ELEGIBILIDADE DE ANTICONCEPÇÃO DA OMS (CATEGORIAS 1 A 4)
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 3. Critérios Médicos de Elegibilidade da OMS (1 a 4) ---');

// Caso 19: Enxaqueca com Aura -> AHC é Categoria 4, DIU Cobre é Cat 1, POP é Cat 2
const elegEnxaqueca = GinecologiaAmbulatorialService.avaliarCriteriosElegibilidadeContracepcao({
  idade: 28,
  enxaqueca: 'com_aura'
});
assert.strictEqual(elegEnxaqueca.detalhesPorMetodo.AHC.cat, 4);
assert.strictEqual(elegEnxaqueca.detalhesPorMetodo.DIU_CU.cat, 1);
assert.strictEqual(elegEnxaqueca.detalhesPorMetodo.POP.cat, 2);
assert.ok(elegEnxaqueca.metodosBloqueadosCat4.some(m => m.id === 'AHC'));
console.log('  ✓ Caso 19: Bloqueio estrito de AHC (Cat 4) na enxaqueca com aura aprovado.');

// Caso 20: Trombose prévia (TVP/TEP) -> AHC é Categoria 4, DIU Cobre é Cat 1
const elegTev = GinecologiaAmbulatorialService.avaliarCriteriosElegibilidadeContracepcao({
  idade: 34,
  historicoTev: true
});
assert.strictEqual(elegTev.detalhesPorMetodo.AHC.cat, 4);
assert.strictEqual(elegTev.detalhesPorMetodo.DIU_CU.cat, 1);
console.log('  ✓ Caso 20: Bloqueio de AHC (Cat 4) e indicação de DIU de Cobre (Cat 1) em TEV aprovados.');

// Caso 21: HAS Grave Descontrolada (PA 170x105) -> AHC Cat 4, AMPD Cat 3, DIU Cobre Cat 1
const elegHas = GinecologiaAmbulatorialService.avaliarCriteriosElegibilidadeContracepcao({
  idade: 41,
  pas: 170,
  pad: 105
});
assert.strictEqual(elegHas.detalhesPorMetodo.AHC.cat, 4);
assert.strictEqual(elegHas.detalhesPorMetodo.AMPD.cat, 3);
assert.strictEqual(elegHas.detalhesPorMetodo.DIU_CU.cat, 1);
console.log('  ✓ Caso 21: HAS Grave -> AHC Cat 4, AMPD Cat 3 e DIU Cobre Cat 1 aprovados.');

// Caso 22: Tabagista >= 35 anos (20 cigarros/dia) -> AHC Cat 4, métodos sem estrogênio Cat 1
const elegFumante = GinecologiaAmbulatorialService.avaliarCriteriosElegibilidadeContracepcao({
  idade: 37,
  tabagismo: true,
  cigarrosDia: 20
});
assert.strictEqual(elegFumante.detalhesPorMetodo.AHC.cat, 4);
assert.strictEqual(elegFumante.detalhesPorMetodo.POP.cat, 1);
assert.strictEqual(elegFumante.detalhesPorMetodo.DIU_LNG.cat, 1);
assert.strictEqual(elegFumante.detalhesPorMetodo.DIU_CU.cat, 1);
console.log('  ✓ Caso 22: Tabagista >= 35 anos -> AHC Cat 4 e progestagênios/DIUs Cat 1 aprovados.');

// Caso 23: Pós-Parto < 6 semanas com amamentação exclusiva -> AHC Cat 4, DIU Cu Cat 1
const elegLactacao = GinecologiaAmbulatorialService.avaliarCriteriosElegibilidadeContracepcao({
  idade: 26,
  lactacao: true,
  semanasPosParto: 3
});
assert.strictEqual(elegLactacao.detalhesPorMetodo.AHC.cat, 4);
assert.strictEqual(elegLactacao.detalhesPorMetodo.DIU_CU.cat, 1);
console.log('  ✓ Caso 23: Pós-parto < 6 semanas com amamentação -> AHC Cat 4 e DIU Cobre Cat 1 aprovados.');

// Caso 24: Câncer de Mama Atual -> TODOS os hormonais são Cat 4; DIU Cobre é Cat 1 absoluto
const elegMama = GinecologiaAmbulatorialService.avaliarCriteriosElegibilidadeContracepcao({
  idade: 44,
  cancerMama: 'atual'
});
assert.strictEqual(elegMama.detalhesPorMetodo.AHC.cat, 4);
assert.strictEqual(elegMama.detalhesPorMetodo.POP.cat, 4);
assert.strictEqual(elegMama.detalhesPorMetodo.AMPD.cat, 4);
assert.strictEqual(elegMama.detalhesPorMetodo.IMPLANTE.cat, 4);
assert.strictEqual(elegMama.detalhesPorMetodo.DIU_LNG.cat, 4);
assert.strictEqual(elegMama.detalhesPorMetodo.DIU_CU.cat, 1);
console.log('  ✓ Caso 24: Câncer de mama atual -> bloqueio total de hormônios (Cat 4) e DIU Cobre Cat 1 aprovados.');


// ─────────────────────────────────────────────────────────────────────────────
// 4. SÍNDROMES INFECCIOSAS VULVOVAGINAIS (LEUCORREIAS)
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 4. Síndromes Infecciosas Vulvovaginais (REMUME/MS) ---');

// Caso 25: Candidíase Vulvovaginal não gestante -> Fluconazol 150mg VO dose única
const candidaNaoGest = GinecologiaAmbulatorialService.avaliarInfeccaoVulvovaginal({
  sintomaPredominante: 'prurido',
  aspectoCorrimento: 'grumoso_branco',
  phVaginal: 4.2,
  whiffTest: 'negativo',
  microscopia: 'hifas_esporos',
  gestante: false
});
assert.strictEqual(candidaNaoGest.diagnostico, 'CANDIDIASE_VULVOVAGINAL');
assert.ok(candidaNaoGest.prescricoes.some(p => p.farmaco.indexOf('Fluconazol 150 mg VO') >= 0));
console.log('  ✓ Caso 25: Candidíase em não gestante com Fluconazol oral dose única aprovada.');

// Caso 26: Candidíase na Gestante -> CONTRAINDICAÇÃO de Fluconazol e uso de Miconazol creme
const candidaGest = GinecologiaAmbulatorialService.avaliarInfeccaoVulvovaginal({
  sintomaPredominante: 'prurido',
  aspectoCorrimento: 'grumoso_branco',
  phVaginal: 4.0,
  whiffTest: 'negativo',
  gestante: true
});
assert.strictEqual(candidaGest.diagnostico, 'CANDIDIASE_VULVOVAGINAL');
assert.ok(candidaGest.alertas.some(a => a.indexOf('Fluconazol oral é CONTRAINDICADO') >= 0));
assert.ok(candidaGest.prescricoes.some(p => p.farmaco.indexOf('Miconazol nitrato creme') >= 0));
assert.ok(!candidaGest.prescricoes.some(p => p.farmaco.indexOf('Fluconazol') >= 0));
console.log('  ✓ Caso 26: Bloqueio estrito de Fluconazol oral na gestante e Miconazol tópico aprovados.');

// Caso 27: Candidíase Recorrente -> esquema de indução e manutenção por 6 meses
const candidaRecorrente = GinecologiaAmbulatorialService.avaliarInfeccaoVulvovaginal({
  sintomaPredominante: 'prurido',
  aspectoCorrimento: 'grumoso_branco',
  recorrente: true,
  gestante: false
});
assert.strictEqual(candidaRecorrente.diagnostico, 'CANDIDIASE_VULVOVAGINAL');
assert.ok(candidaRecorrente.prescricoes.some(p => p.tipo.indexOf('Fase de Indução') >= 0));
assert.ok(candidaRecorrente.prescricoes.some(p => p.tipo.indexOf('Fase de Manutenção') >= 0));
console.log('  ✓ Caso 27: Protocolo de Candidíase Recorrente com indução e manutenção de 6 meses aprovado.');

// Caso 28: Vaginose Bacteriana -> Amsel, Metronidazol 7 dias, Dissulfiram, parceiro não tratado
const vaginose = GinecologiaAmbulatorialService.avaliarInfeccaoVulvovaginal({
  sintomaPredominante: 'odor_fetido',
  aspectoCorrimento: 'branco_acinzentado_fino',
  phVaginal: 5.0,
  whiffTest: 'positivo',
  microscopia: 'clue_cells'
});
assert.strictEqual(vaginose.diagnostico, 'VAGINOSE_BACTERIANA');
assert.ok(vaginose.prescricoes.some(p => p.farmaco.indexOf('Metronidazol 250 mg') >= 0));
assert.ok(vaginose.alertas.some(a => a.indexOf('Dissulfiram') >= 0));
assert.ok(vaginose.condutas.some(c => c.indexOf('NÃO tratar parceiro') >= 0));
console.log('  ✓ Caso 28: Vaginose Bacteriana com critérios de Amsel, Metronidazol e alerta Dissulfiram aprovados.');

// Caso 29: Tricomoníase -> Metronidazol 2g dose única, TRATAMENTO DO PARCEIRO e ISTs
const tricomoniase = GinecologiaAmbulatorialService.avaliarInfeccaoVulvovaginal({
  sintomaPredominante: 'odor_fetido',
  aspectoCorrimento: 'amarelo_esverdeado_bolhoso',
  phVaginal: 6.0,
  microscopia: 'protozoarios_moveis'
});
assert.strictEqual(tricomoniase.diagnostico, 'TRICOMONIASE');
assert.ok(tricomoniase.prescricoes.some(p => p.farmaco.indexOf('Metronidazol 2 g') >= 0));
assert.ok(tricomoniase.condutas.some(c => c.indexOf('TRATAR O PARCEIRO') >= 0));
assert.ok(tricomoniase.condutas.some(c => c.indexOf('Rastreamento de ISTs') >= 0));
console.log('  ✓ Caso 29: Tricomoníase com Metronidazol dose única e tratamento do parceiro aprovados.');


// ─────────────────────────────────────────────────────────────────────────────
// 5. RESUMO CLÍNICO UNIFICADO E INTEGRAÇÃO FASTIFY RPC
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 5. Resumo Estruturado e Fastify RPC Bridge ---');

// Caso 30: Resumo unificado em texto
const resumoGin = GinecologiaAmbulatorialService.gerarResumoGinecologia({
  coloUterino: { idade: 30, resultadoCitologia: 'lsil' },
  sua: { idade: 30, intensidade: 'moderada', betaHcg: 'negativo' },
  anticoncepcao: { idade: 30, enxaqueca: 'com_aura' },
  infeccao: { aspectoCorrimento: 'grumoso_branco', sintomaPredominante: 'prurido' }
});
assert.ok(typeof resumoGin === 'string');
assert.ok(resumoGin.indexOf('GINECOLOGIA AMBULATORIAL') >= 0);
assert.ok(resumoGin.indexOf('RASTREIO DE CÂNCER DO COLO UTERINO') >= 0);
assert.ok(resumoGin.indexOf('SANGRAMENTO UTERINO ANORMAL') >= 0);
assert.ok(resumoGin.indexOf('CRITÉRIOS DE ELEGIBILIDADE DE ANTICONCEPÇÃO') >= 0);
assert.ok(resumoGin.indexOf('SÍNDROMES INFECCIOSAS VULVOVAGINAIS') >= 0);
console.log('  ✓ Caso 30: Geração de resumo clínico estruturado para PEP aprovada.');

// Caso 31: Fastify RPC bridge no runtime.js
const crypto = require('crypto');
const botToken = 'fake_bot_token_gin_test';
runtime.ctx.ConfigService.get = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : null;
runtime.ctx.ConfigService.exigir = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : (k === 'TELEGRAM_BOT_TOKEN' ? botToken : 'dummy');
const hashEsperado = crypto.createHmac('sha256', botToken).update('123').digest('hex');
const fakeSession = 'ck_' + hashEsperado;

const rpcColo = runtime.cockpitRpc('cockpitRastreioColoUterino', fakeSession, [{ idade: 35, resultadoCitologia: 'asc-us' }]);
assert.strictEqual(rpcColo.citologia, 'ASC_US');

const rpcSua = runtime.cockpitRpc('cockpitSangramentoUterinoAnormal', fakeSession, [{ idade: 35, betaHcg: 'negativo', intensidade: 'grave_aguda' }]);
assert.strictEqual(rpcSua.choqueInstavel, false);

const rpcAnti = runtime.cockpitRpc('cockpitElegibilidadeAnticoncepcao', fakeSession, [{ idade: 28, enxaqueca: 'com_aura' }]);
assert.strictEqual(rpcAnti.detalhesPorMetodo.AHC.cat, 4);

const rpcInf = runtime.cockpitRpc('cockpitInfeccaoVulvovaginal', fakeSession, [{ sintomaPredominante: 'prurido', aspectoCorrimento: 'grumoso_branco', gestante: true }]);
assert.strictEqual(rpcInf.diagnostico, 'CANDIDIASE_VULVOVAGINAL');

const rpcResumo = runtime.cockpitRpc('cockpitResumoGinecologia', fakeSession, [{ sua: { idade: 35, intensidade: 'leve' } }]);
assert.ok(typeof rpcResumo === 'string');
console.log('  ✓ Caso 31: Todos os 5 métodos RPC integrados ao Fastify Runtime aprovados.');

console.log('\n🎯 Todos os 31 testes de GinecologiaAmbulatorialService passaram com 100% de sucesso!\n');

