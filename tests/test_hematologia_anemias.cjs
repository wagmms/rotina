/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TESTES AUTOMATIZADOS: HEMATOLOGIA CLÍNICA — INVESTIGAÇÃO DE ANEMIAS & GANZONI
 * ═══════════════════════════════════════════════════════════════════════════════
 * Validação rigorosa dos motores clínicos:
 *  - Definição e pontos de corte de Hemoglobina (OMS/MS) por perfil
 *  - Índices morfológicos (VCM, HCM, CHCM, RDW)
 *  - Diagnóstico diferencial de microcitose (Índice de Mentzer e Green & King)
 *  - Resposta medular e cinética reticulocitária (IPR com shift factor)
 *  - Integração com cinética de ferro e carências vitamínicas (B12/Folato)
 *  - Reposição de ferro oral com limites de segurança e teto de hepcidina
 *  - Critérios e cálculo de déficit de ferro por Ganzoni (Noripurum EV)
 *  - Gatilhos transfusionais restritivos e alertas de segurança
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const HematologiaAnemiasService = require('../src/02_hematologia_anemias.js');

test('Hematologia Anemias - Módulo carregado e exports íntegros', (t) => {
  assert.ok(HematologiaAnemiasService, 'Serviço deve estar definido');
  assert.equal(typeof HematologiaAnemiasService.interpretarHemogramaAnemia, 'function');
  assert.equal(typeof HematologiaAnemiasService.calcularReposicaoFerro, 'function');
  assert.equal(typeof HematologiaAnemiasService.gerarRelatorioCompleto, 'function');
  assert.equal(typeof HematologiaAnemiasService.analisarCasoCompleto, 'function');
  assert.equal(typeof HematologiaAnemiasService.calcularIndiceMentzer, 'function');
  assert.equal(typeof HematologiaAnemiasService.calcularGreenKing, 'function');
  assert.equal(typeof HematologiaAnemiasService.calcularIpr, 'function');
  assert.equal(typeof HematologiaAnemiasService.calcularGanzoni, 'function');
  assert.equal(HematologiaAnemiasService.LIMITES_HB.ADULTO_MASCULINO, 13.0);
  assert.equal(HematologiaAnemiasService.LIMITES_HB.ADULTO_FEMININO, 12.0);
  assert.equal(HematologiaAnemiasService.LIMITES_HB.GESTANTE_GERAL, 11.0);
  assert.equal(HematologiaAnemiasService.LIMITES_HB.GESTANTE_2TRI, 10.5);
});

test('Limites de Hemoglobina e Detecção de Anemia por Perfil', (t) => {
  // Homem adulto: normal >= 13.0
  const hNorm = HematologiaAnemiasService.interpretarHemogramaAnemia({ hb: 14.5, sexo: 'M' });
  assert.equal(hNorm.temAnemia, false);
  assert.equal(hNorm.severidade, 'NORMAL');

  // Homem adulto: anemia leve se Hb 11.5
  const hAnemia = HematologiaAnemiasService.interpretarHemogramaAnemia({ hb: 11.5, sexo: 'M' });
  assert.equal(hAnemia.temAnemia, true);
  assert.equal(hAnemia.severidade, 'LEVE');

  // Mulher adulta: normal >= 12.0, anemia se Hb 11.2
  const mNorm = HematologiaAnemiasService.interpretarHemogramaAnemia({ hb: 12.5, sexo: 'F' });
  assert.equal(mNorm.temAnemia, false);
  const mAnemia = HematologiaAnemiasService.interpretarHemogramaAnemia({ hb: 11.2, sexo: 'F' });
  assert.equal(mAnemia.temAnemia, true);
  assert.equal(mAnemia.severidade, 'LEVE');

  // Gestante 2º trimestre: corte é 10.5
  const gest2Norm = HematologiaAnemiasService.interpretarHemogramaAnemia({ hb: 10.8, gestante: true, trimestre: 2 });
  assert.equal(gest2Norm.temAnemia, false);
  const gest2Anemia = HematologiaAnemiasService.interpretarHemogramaAnemia({ hb: 10.2, gestante: true, trimestre: 2 });
  assert.equal(gest2Anemia.temAnemia, true);

  // Criança de 3 anos: corte é 11.0
  const pedNorm = HematologiaAnemiasService.interpretarHemogramaAnemia({ hb: 11.4, idadeAnos: 3 });
  assert.equal(pedNorm.temAnemia, false);
  const pedAnemia = HematologiaAnemiasService.interpretarHemogramaAnemia({ hb: 9.5, idadeAnos: 3 });
  assert.equal(pedAnemia.temAnemia, true);
  assert.equal(pedAnemia.severidade, 'MODERADA');
});

test('Classificação Morfológica e Anisocitose (VCM, HCM, RDW)', (t) => {
  // Microcítica hipocrômica com anisocitose (Perfil clássico de Anemia Ferropriva)
  const casoMicro = HematologiaAnemiasService.interpretarHemogramaAnemia({
    hb: 8.5,
    vcm: 68,
    hcm: 22,
    chcm: 30,
    rdw: 18.5,
    sexo: 'F'
  });
  assert.equal(casoMicro.morfologia.classificacaoVcm, 'MICROCITICA');
  assert.equal(casoMicro.morfologia.classificacaoCromia, 'HIPOCROMICA');
  assert.equal(casoMicro.morfologia.classificacaoRdw, 'HETEROGENEA');
  assert.equal(casoMicro.severidade, 'MODERADA');

  // Macrocítica (Deficiência B12 / Megaloblástica)
  const casoMacro = HematologiaAnemiasService.interpretarHemogramaAnemia({
    hb: 9.0,
    vcm: 115,
    hcm: 34,
    rdw: 16.0,
    sexo: 'M'
  });
  assert.equal(casoMacro.morfologia.classificacaoVcm, 'MACROCITICA');
  assert.equal(casoMacro.hipotesesDiagnosticas.some(h => h.diagnostico.includes('Megaloblástica')), true);

  // Normocítica normocrômica
  const casoNormo = HematologiaAnemiasService.interpretarHemogramaAnemia({
    hb: 10.0,
    vcm: 88,
    hcm: 29,
    chcm: 33,
    rdw: 13.5,
    sexo: 'F'
  });
  assert.equal(casoNormo.morfologia.classificacaoVcm, 'NORMOCITICA');
  assert.equal(casoNormo.morfologia.classificacaoCromia, 'NORMOCROMICA');
  assert.equal(casoNormo.morfologia.classificacaoRdw, 'HOMOGENEA');
});

test('Diagnóstico Diferencial de Microcitose: Mentzer e Green & King', (t) => {
  // Caso 1: Traço Talassêmico (muitas hemácias pequenas: VCM 62, RBC 5.8 mi -> Mentzer = 62 / 5.8 = 10.7 < 13)
  const casoTalas = HematologiaAnemiasService.interpretarHemogramaAnemia({
    hb: 10.5,
    vcm: 62,
    hemacias: 5.8,
    rdw: 13.0,
    sexo: 'M'
  });
  assert.ok(casoTalas.indicesEspeciais.mentzer < 13);
  assert.equal(casoTalas.indicesEspeciais.interpretacaoMentzer.padrao, 'SUGESTAO_TALASSEMIA_MENOR');

  const mCalc = HematologiaAnemiasService.calcularIndiceMentzer(62, 5.8);
  assert.equal(mCalc.valor, 10.7);
  assert.ok(mCalc.sugestao.includes('Talassêmico'));

  // Caso 2: Anemia Ferropriva (VCM 68, RBC 3.2 mi -> Mentzer = 68 / 3.2 = 21.3 >= 13)
  const casoFerro = HematologiaAnemiasService.interpretarHemogramaAnemia({
    hb: 8.0,
    vcm: 68,
    hemacias: 3.2,
    rdw: 18.0,
    sexo: 'F'
  });
  assert.ok(casoFerro.indicesEspeciais.mentzer >= 13);
  assert.equal(casoFerro.indicesEspeciais.interpretacaoMentzer.padrao, 'SUGESTAO_ANEMIA_FERROPRIVA');

  // Green & King
  const gkFerro = HematologiaAnemiasService.calcularGreenKing(68, 18.0, 8.0);
  assert.ok(gkFerro.valor > 72);
  assert.ok(gkFerro.sugestao.includes('Ferropriva'));
});

test('Cinética Reticulocitária e Índice de Produção Reticulocitária (IPR)', (t) => {
  // Anemia com resposta regenerativa (Hemólise ou Sangramento agudo):
  // Ht 24% (shift factor = 2.0), Retic 6% -> Retic corr = 6 * (24/45) = 3.2% -> IPR = 3.2 / 2.0 = 1.6
  // Se Retic 10%: Retic corr = 10 * (24/45) = 5.33% -> IPR = 5.33 / 2.0 = 2.67 > 2.0 (Regenerativa)
  const iprReg = HematologiaAnemiasService.calcularIpr(10.0, 24.0);
  assert.equal(iprReg.shiftFactor, 2.0);
  assert.equal(iprReg.tipo, 'REGENERATIVA');
  assert.ok(iprReg.ipr > 2.0);

  // Anemia arregenerativa / hipoproliferativa:
  // Ht 30% (shift factor = 1.5), Retic 0.8% -> Retic corr = 0.8 * (30/45) = 0.53% -> IPR = 0.53 / 1.5 = 0.36 <= 2.0
  const iprArreg = HematologiaAnemiasService.calcularIpr(0.8, 30.0);
  assert.equal(iprArreg.shiftFactor, 1.5);
  assert.equal(iprArreg.tipo, 'HIPOPROLIFERATIVA');
  assert.ok(iprArreg.ipr <= 2.0);
});

test('Calculadora de Reposição de Ferro Oral — Adulto e Pediatria', (t) => {
  // Adulto 60 kg: Dose de 60-100 mg/dia, teto seguro 200 mg/dia
  const repAdulto = HematologiaAnemiasService.calcularReposicaoFerro({
    pesoKg: 60,
    hbAtual: 8.5,
    sexo: 'F'
  });
  assert.equal(repAdulto.esquemaVo.tetoSegurancaMgDia, 200);
  assert.ok(repAdulto.esquemaVo.opcoesPrescricao.length >= 2);
  assert.ok(repAdulto.esquemaVo.racionalCientifico.includes('Hepcidina'));

  // Pediatria 10 kg: 3 a 5 mg/kg/dia = 30 mg/dia (leve/moderada) a 50 mg/dia (severa)
  const repPed = HematologiaAnemiasService.calcularReposicaoFerro({
    pesoKg: 10,
    hbAtual: 9.0,
    idadeAnos: 2
  });
  assert.equal(repPed.esquemaVo.populacao, 'Pediátrica (SBP / MS)');
  assert.equal(repPed.esquemaVo.doseCalculadaMgDia, 30);
  assert.equal(repPed.esquemaVo.doseSeveraMgDia, 50);
  assert.equal(repPed.esquemaVo.tetoSegurancaMgDia, 60);
});

test('Fórmula de Ganzoni e Prescrição de Ferro Endovenoso (Noripurum IV)', (t) => {
  // Mulher de 60 kg, Hb atual 8.0 g/dL, Hb alvo 14.0 g/dL
  // Delta Hb = 14.0 - 8.0 = 6.0 g/dL
  // Déficit por Hb = 60 * 6.0 * 2.4 = 864 mg
  // Estoque padrão (>= 35 kg) = 500 mg
  // Déficit Total Ganzoni = 864 + 500 = 1364 mg
  // Ampolas de 100 mg = Math.ceil(1364 / 100) = 14 ampolas
  // Sessões de 200 mg = Math.ceil(1364 / 200) = 7 sessões
  const repGanzoni = HematologiaAnemiasService.calcularReposicaoFerro({
    pesoKg: 60,
    hbAtual: 8.0,
    sexo: 'F',
    motivoIv: 'pos_bariatrica'
  });

  assert.equal(repGanzoni.esquemaIv.deltaHb, 6.0);
  assert.equal(repGanzoni.esquemaIv.deficitPorHbMg, 864);
  assert.equal(repGanzoni.esquemaIv.reservaEstoqueMg, 500);
  assert.equal(repGanzoni.esquemaIv.deficitTotalGanzoniMg, 1364);
  assert.equal(repGanzoni.esquemaIv.totalAmpolasNecessarias, 14);
  assert.equal(repGanzoni.esquemaIv.totalSessoes, 7);
  assert.equal(repGanzoni.esquemaIv.dosePorSessaoMg, 200);
  assert.equal(repGanzoni.indicacaoIvForte, true);
  assert.ok(repGanzoni.criteriosIv.some(c => c.includes('Bariátrica')));
  assert.ok(repGanzoni.esquemaIv.bloqueiosESeguranca.some(b => b.includes('1º TRIMESTRE')));
});

test('Gatilhos Transfusionais Beira-Leito (CHAD)', (t) => {
  // Hb 6.5 g/dL em paciente clínico estável: gatilho atingido (< 7.0)
  const casoTransf = HematologiaAnemiasService.interpretarHemogramaAnemia({
    hb: 6.5,
    sexo: 'M'
  });
  assert.equal(casoTransf.gatilhoTransfusional.indicado, true);
  assert.equal(casoTransf.severidade, 'CRITICA');

  // Hb 7.5 g/dL em cardiopata com IAM prévio: gatilho atingido (< 8.0)
  const casoCardio = HematologiaAnemiasService.interpretarHemogramaAnemia({
    hb: 7.5,
    sexo: 'M',
    cardiopatiaIsquemica: true
  });
  assert.equal(casoCardio.gatilhoTransfusional.indicado, true);
  assert.ok(casoCardio.gatilhoTransfusional.alvoHb.includes('8.0'));

  // Hb 7.5 g/dL em paciente jovem hígido sem cardiopatia: não atinge gatilho
  const casoHigido = HematologiaAnemiasService.interpretarHemogramaAnemia({
    hb: 7.5,
    sexo: 'M',
    cardiopatiaIsquemica: false
  });
  assert.equal(casoHigido.gatilhoTransfusional.indicado, false);
});

test('Relatório Completo Beira-Leito e Formatação Telegram', (t) => {
  const relatorio = HematologiaAnemiasService.gerarRelatorioCompleto({
    hb: 7.8,
    vcm: 69,
    hcm: 23,
    rdw: 17.5,
    hemacias: 3.4,
    reticulocitos: 0.6,
    pesoKg: 65,
    sexo: 'F',
    ferritina: 11
  });

  assert.equal(relatorio.sucesso, true);
  assert.ok(relatorio.textoFormatado.includes('HEMATOLOGIA'));
  assert.ok(relatorio.textoFormatado.includes('Índice de Mentzer'));
  assert.ok(relatorio.textoFormatado.includes('GANZONI'));
  assert.ok(relatorio.textoFormatado.includes('Noripurum IV'));

  const msgTg = HematologiaAnemiasService.formatarTextoTelegram(relatorio);
  assert.equal(typeof msgTg, 'string');
  assert.ok(msgTg.length > 100);
});
