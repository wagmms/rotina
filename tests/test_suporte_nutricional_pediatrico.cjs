/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TESTES AUTOMATIZADOS: SUPORTE NUTRICIONAL EM PEDIATRIA E FÓRMULAS INFANTIS
 * ═══════════════════════════════════════════════════════════════════════════════
 * Validação rigorosa dos motores clínicos:
 *  - Fórmula de Holliday-Segar (100-50-20 mL/kg/dia e regra 4-2-1)
 *  - Ajustes clínicos (Bronquiolite 70%, Cardiopatia 60%, Febre, Catch-up)
 *  - Eletrolíticos de manutenção (Sódio, Potássio) e TIG (mg/kg/min)
 *  - Diluição padronizada de fórmulas infantis (1 medida para 30 mL)
 *  - Bloqueio de frações de medida e alerta de Cronobacter sakazakii
 *  - RPC Cockpit e despacho do serviço
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Carrega o módulo diretamente ou através do runtime
const SuporteNutricionalPediatricoService = require('../src/02_suporte_nutricional_pediatrico.js');

test('Suporte Nutricional Pediátrico - Módulo carregado com sucesso', (t) => {
  assert.ok(SuporteNutricionalPediatricoService, 'Serviço deve estar definido');
  assert.equal(typeof SuporteNutricionalPediatricoService.calcularHollidaySegar, 'function');
  assert.equal(typeof SuporteNutricionalPediatricoService.calcularDiluicaoFormula, 'function');
  assert.equal(typeof SuporteNutricionalPediatricoService.avaliarSuporteNutricionalPediatricoCompleto, 'function');
  assert.equal(SuporteNutricionalPediatricoService.DILUICAO_PADRAO_ML_POR_MEDIDA, 30);
});

test('Holliday-Segar - Faixas de Peso Basais (10kg, 15kg, 25kg)', (t) => {
  // 1. Lactente <= 10 kg (100 mL/kg/dia)
  const hs5 = SuporteNutricionalPediatricoService.calcularHollidaySegar(5);
  assert.equal(hs5.volumeBasal24h, 500);
  assert.equal(hs5.volumeBasalMlKgDia, 100);
  assert.equal(hs5.vazaoBasal421MlH, 20); // 5 * 4 = 20 mL/h

  const hs10 = SuporteNutricionalPediatricoService.calcularHollidaySegar(10);
  assert.equal(hs10.volumeBasal24h, 1000);
  assert.equal(hs10.volumeBasalMlKgDia, 100);
  assert.equal(hs10.vazaoBasal421MlH, 40); // 10 * 4 = 40 mL/h

  // 2. Criança 11 a 20 kg (1000 mL + 50 mL/kg acima de 10)
  const hs15 = SuporteNutricionalPediatricoService.calcularHollidaySegar(15);
  assert.equal(hs15.volumeBasal24h, 1250); // 1000 + 5*50 = 1250 mL
  assert.equal(hs15.vazaoBasal421MlH, 50); // 40 + 5*2 = 50 mL/h

  const hs20 = SuporteNutricionalPediatricoService.calcularHollidaySegar(20);
  assert.equal(hs20.volumeBasal24h, 1500); // 1000 + 10*50 = 1500 mL
  assert.equal(hs20.vazaoBasal421MlH, 60); // 40 + 10*2 = 60 mL/h

  // 3. Criança > 20 kg (1500 mL + 20 mL/kg acima de 20)
  const hs25 = SuporteNutricionalPediatricoService.calcularHollidaySegar(25);
  assert.equal(hs25.volumeBasal24h, 1600); // 1500 + 5*20 = 1600 mL
  assert.equal(hs25.vazaoBasal421MlH, 65); // 60 + 5*1 = 65 mL/h
});

test('Holliday-Segar - Ajustes Clínicos (Bronquiolite 70%, Cardiopatia 60%, Febre)', (t) => {
  // Bronquiolite: restrição a 70%
  const hsBva = SuporteNutricionalPediatricoService.calcularHollidaySegar(10, {
    condicaoClinica: 'restricao_bronquiolite'
  });
  assert.equal(hsBva.volumeAjustado24h, 700);
  assert.equal(hsBva.percentualAplicado, 70);
  assert.ok(hsBva.justificativaAjuste.includes('Bronquiolite'));

  // Cardiopatia congênita / IC: restrição a 60%
  const hsIc = SuporteNutricionalPediatricoService.calcularHollidaySegar(10, {
    condicaoClinica: 'restricao_ic'
  });
  assert.equal(hsIc.volumeAjustado24h, 600);
  assert.equal(hsIc.percentualAplicado, 60);

  // Febre 39.0°C: incremento de perdas insensíveis
  const hsFebre = SuporteNutricionalPediatricoService.calcularHollidaySegar(10, {
    condicaoClinica: 'febre',
    temperaturaC: 39.0
  });
  assert.ok(hsFebre.percentualAplicado > 100, 'Percentual deve ser maior que 100% na febre');
  assert.ok(hsFebre.volumeAjustado24h > 1000);
});

test('Prescrição Eletrolítica e TIG de Manutenção', (t) => {
  const hs = SuporteNutricionalPediatricoService.calcularHollidaySegar(8);
  assert.ok(hs.eletrolitos.sodioTotalMeqDia > 0);
  assert.ok(hs.eletrolitos.potassioTotalMeqDia > 0);
  assert.ok(hs.glicoseTig.tigComSg5 > 0);
  assert.ok(hs.alertas.some(a => a.includes('HIPONATREMIA HOSPITALAR')));
  assert.ok(hs.alertas.some(a => a.includes('diurese')));
});

test('Diluição de Fórmula Infantil - Volume Múltiplo de 30 mL (Regra de Ouro)', (t) => {
  // Mamada de 90 mL -> exatamente 3 medidas rasas
  const form90 = SuporteNutricionalPediatricoService.calcularDiluicaoFormula({
    volumeMamadaMl: 90,
    tipoFormula: 'partida',
    numeroMamadasDia: 6
  });

  assert.equal(form90.prescricaoMamada.medidasRasas, 3);
  assert.equal(form90.prescricaoMamada.volumeAguaMl, 90);
  assert.equal(form90.esquemaDiario.volumeTotalAguaDiaMl, 540); // 90 * 6 = 540 mL
  assert.ok(form90.prescricaoMamada.caloriasPorMamadaKcal > 55); // 90 * 0.67 ≈ 60.3 kcal
  assert.ok(form90.passosPreparoSeguro.length >= 7);
  assert.ok(form90.passosPreparoSeguro.some(p => p.includes('70°C')));
  assert.ok(form90.passosPreparoSeguro.some(p => p.includes('Cronobacter sakazakii')));
});

test('Diluição de Fórmula Infantil - Volume NÃO Múltiplo de 30 mL (Alerta contra frações)', (t) => {
  // Mamada de 100 mL -> não múltiplo de 30
  const form100 = SuporteNutricionalPediatricoService.calcularDiluicaoFormula({
    volumeMamadaMl: 100,
    tipoFormula: 'partida'
  });

  assert.ok(form100.alertas.some(a => a.includes('NÃO MÚLTIPLO DE 30 mL')));
  assert.ok(form100.alertas.some(a => a.includes('NUNCA divida medidas ao meio')));
});

test('Segurança e Bloqueios: Fórmula de Soja em menores de 6 meses', (t) => {
  const formSoja = SuporteNutricionalPediatricoService.calcularDiluicaoFormula({
    pesoKg: 5,
    idadeMeses: 3,
    tipoFormula: 'soja'
  });

  assert.ok(formSoja.alertas.some(a => a.includes('CONTRAINDICAÇÃO FORMAL')));
  assert.ok(formSoja.alertas.some(a => a.includes('menores de 6 meses')));
});

test('Avaliação Completa Integrada com Resumo Formatado', (t) => {
  const res = SuporteNutricionalPediatricoService.avaliarSuporteNutricionalPediatricoCompleto({
    pesoKg: 6.5,
    idadeMeses: 4,
    condicaoClinica: 'manutencao_padrao',
    tipoFormula: 'partida'
  });

  assert.equal(res.sucesso, true);
  assert.equal(res.pesoKg, 6.5);
  assert.equal(res.idadeMeses, 4);
  assert.ok(res.hollidaySegar.volumeBasal24h === 650);
  assert.ok(res.formulaInfantil.prescricaoMamada.medidasRasas >= 4);
  assert.ok(res.textoFormatado.includes('SUPORTE NUTRICIONAL EM PEDIATRIA'));
  assert.ok(res.textoFormatado.includes('HOLLIDAY-SEGAR'));
  assert.ok(res.textoFormatado.includes('PRESCRIÇÃO DE FÓRMULA INFANTIL'));
});
