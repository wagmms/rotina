/**
 * Testes Unitários: Módulo de Obstetrícia & Reumatologia — SAF e Trombofilias na Gestação
 * Diretrizes Oficiais: Sydney (2006) / ACR-EULAR (2023) / RCOG 37a / FEBRASGO (2023-2026) / SOAP-ASRA
 */

const assert = require('assert');
const path = require('path');

const ObstetriciaSafService = require('../src/02_obstetricia_saf_trombofilias.js');

function runTests() {
  console.log('Iniciando testes rigorosos de Obstetrícia & Reumatologia — SAF e Trombofilias...');

  // 1. Caso 1: SAF Obstétrica Típica Confirmada (Critérios de Sydney / ACR-EULAR 2023)
  const resCaso1 = ObstetriciaSafService.avaliar({
    abortosPrecoces: 3,
    anticoagulanteLupico: true,
    intervaloMinimo12Semanas: true,
    peso: 65,
    idadeGestacional: 8
  });
  assert.strictEqual(resCaso1.sucesso, true, 'Execução com sucesso');
  assert.strictEqual(resCaso1.diagnosticoSaf.safConfirmada, true, 'Deve confirmar diagnóstico de SAF');
  assert.strictEqual(resCaso1.diagnosticoSaf.criterioClinicoObstetrico, true, 'Deve confirmar critério obstétrico');
  assert.strictEqual(resCaso1.fenotipo, 'SAF OBSTÉTRICA TÍPICA CONFIRMADA', 'Fenótipo obstétrico correto');
  assert.ok(resCaso1.prescricoes.some(p => p.medicamento.includes('AAS')), 'Deve prescrever AAS em baixa dose');
  assert.ok(resCaso1.prescricoes.some(p => p.medicamento.includes('Enoxaparina') && p.posologia.includes('40 mg')), 'Deve prescrever Enoxaparina 40 mg SC/dia');
  assert.ok(resCaso1.prescricoes.some(p => p.medicamento.includes('Cálcio')), 'Deve suplementar Cálcio e Vitamina D');
  assert.ok(resCaso1.regrasPeriparto.some(r => r.includes('12 HORAS')), 'Regra de suspensão de 12h para HBPM profilática');
  assert.ok(resCaso1.regrasPeriparto.some(r => r.includes('SEIS SEMANAS')), 'Manter por 6 semanas no puerpério');
  console.log('✓ Teste 1: SAF Obstétrica Típica (AAS + Enoxaparina 40mg + 12h neuroaxial + 6 sem puerpério) aprovado');

  // 2. Caso 2: SAF Trombótica Prévia (Dose Plena / Terapêutica)
  const resCaso2 = ObstetriciaSafService.avaliar({
    trombosePrevia: true,
    anticardiolipina: true,
    intervaloMinimo12Semanas: true,
    peso: 70,
    idadeGestacional: 14
  });
  assert.strictEqual(resCaso2.diagnosticoSaf.safConfirmada, true, 'Deve confirmar SAF');
  assert.strictEqual(resCaso2.diagnosticoSaf.criterioClinicoTrombotico, true, 'Deve confirmar critério trombótico');
  assert.strictEqual(resCaso2.fenotipo, 'SAF TROMBÓTICA CONFIRMADA', 'Fenótipo trombótico correto');
  assert.strictEqual(resCaso2.prioridade, 'MÁXIMA', 'Prioridade máxima');
  assert.ok(resCaso2.prescricoes.some(p => p.medicamento.includes('Enoxaparina') && p.posologia.includes('70 mg') && p.posologia.includes('12/12h')), 'Dose plena terapêutica de 1 mg/kg 12/12h (70 mg 12/12h)');
  assert.ok(resCaso2.regrasPeriparto.some(r => r.includes('24 HORAS')), 'Regra de suspensão de 24h para HBPM terapêutica');
  assert.ok(resCaso2.bloqueios.some(b => b.includes('DOACs') && b.includes('CONTRAINDICAÇÃO')), 'Contraindicação formal de DOACs');
  assert.ok(resCaso2.bloqueios.some(b => b.includes('VARFARINA')), 'Alerta de Varfarina no 1º trimestre');
  console.log('✓ Teste 2: SAF Trombótica (Enoxaparina plena 1mg/kg 12/12h + suspensão 24h + bloqueios) aprovado');

  // 3. Caso 3: SAF Obstétrica Refratária (Falha com AAS + HBPM -> Escalonamento + Hidroxicloroquina)
  const resCaso3 = ObstetriciaSafService.avaliar({
    abortosPrecoces: 3,
    anticoagulanteLupico: true,
    intervaloMinimo12Semanas: true,
    refrataria: true,
    peso: 60
  });
  assert.strictEqual(resCaso3.fenotipo, 'SAF OBSTÉTRICA REFRATÁRIA', 'Deve identificar SAF refratária');
  assert.ok(resCaso3.prescricoes.some(p => p.medicamento.includes('Hidroxicloroquina')), 'Deve prescrever Hidroxicloroquina (HCQ)');
  assert.ok(resCaso3.alertas.some(a => a.includes('Hidroxicloroquina 200 a 400 mg/dia')), 'Alerta de adição de HCQ segundo EULAR/ACR 2023');
  console.log('✓ Teste 3: SAF Obstétrica Refratária (Hidroxicloroquina adjuvante) aprovado');

  // 4. Caso 4: Tripla Positividade em Portadora Assintomática
  const resCaso4 = ObstetriciaSafService.avaliar({
    anticoagulanteLupico: true,
    anticardiolipina: true,
    antiBeta2GlicoproteinaI: true,
    intervaloMinimo12Semanas: true,
    abortosPrecoces: 0,
    trombosePrevia: false
  });
  assert.strictEqual(resCaso4.diagnosticoSaf.triplaPositividade, true, 'Deve identificar Tripla Positividade');
  assert.strictEqual(resCaso4.fenotipo, 'PORTADORA ASSINTOMÁTICA DE ANTICORPOS ANTIFOSFOLIPÍDIOS (aPL POSITIVO)', 'Fenótipo assintomático');
  assert.ok(resCaso4.alertas.some(a => a.includes('TRIPLA POSITIVIDADE')), 'Deve alertar para risco extremo da tripla positividade');
  assert.ok(resCaso4.prescricoes.some(p => p.medicamento.includes('Enoxaparina')), 'Deve indicar Enoxaparina profilática pela tripla positividade');
  console.log('✓ Teste 4: Tripla Positividade aPL em assintomática aprovado');

  // 5. Caso 5: Trombofilias Hereditárias — Alto Risco vs Desmistificação do MTHFR
  // 5a. Deficiência de Antitrombina III (Alto Risco)
  const resCaso5a = ObstetriciaSafService.avaliar({
    deficienciaAntitrombinaIII: true,
    peso: 60
  });
  assert.strictEqual(resCaso5a.diagnosticoTrombofilias.altoRisco, true, 'Deve identificar alto risco');
  assert.strictEqual(resCaso5a.fenotipo, 'TROMBOFILIA HEREDITÁRIA DE ALTO RISCO', 'Fenótipo de alto risco');
  assert.ok(resCaso5a.prescricoes.some(p => p.medicamento.includes('Enoxaparina')), 'Deve prescrever Enoxaparina');
  
  // 5b. Polimorfismo MTHFR Isolado (Variante Benigna / Não Indicação)
  const resCaso5b = ObstetriciaSafService.avaliar({
    mthfr: true,
    peso: 60
  });
  assert.strictEqual(resCaso5b.diagnosticoTrombofilias.mthfrIsolado, true, 'Deve identificar MTHFR isolado');
  assert.strictEqual(resCaso5b.fenotipo, 'POLIMORFISMO MTHFR ISOLADO (VARIANTE BENIGNA)', 'Fenótipo benigno de MTHFR');
  assert.ok(resCaso5b.bloqueios.some(b => b.includes('NÃO INDICADA ANTICOAGULAÇÃO / HEPARINA') && b.includes('MTHFR')), 'Deve conter bloqueio formal contra anticoagulação por MTHFR');
  console.log('✓ Teste 5: Trombofilias hereditárias (Déficit AT-III alto risco vs Bloqueio de Heparina em MTHFR) aprovado');

  // 6. Caso 6: Ajuste Renal de Enoxaparina (ClCr < 30 mL/min)
  const resCaso6 = ObstetriciaSafService.calcularDoseEnoxaparina(60, 25, false);
  assert.strictEqual(resCaso6.doseMg, 20, 'Dose reduzida para 20 mg em insuficiência renal severa');
  assert.ok(resCaso6.alertaRenal.includes('ALERTA RENAL CRÍTICO'), 'Deve emitir alerta de clearance < 30 mL/min');
  console.log('✓ Teste 6: Ajuste de dose renal de Enoxaparina (ClCr < 30 mL/min) aprovado');

  // 7. Caso 7: Faixas Ponderais Extremas de Enoxaparina (< 50kg, 91-130kg, > 130kg)
  const doseBaixa = ObstetriciaSafService.calcularDoseEnoxaparina(45, 100, false);
  assert.strictEqual(doseBaixa.doseMg, 20, 'Peso < 50 kg deve receber 20 mg');

  const doseAlta = ObstetriciaSafService.calcularDoseEnoxaparina(100, 100, false);
  assert.strictEqual(doseAlta.doseMg, 60, 'Peso 91-130 kg deve receber 60 mg');

  const doseObesidadeGrave = ObstetriciaSafService.calcularDoseEnoxaparina(140, 100, false);
  assert.strictEqual(doseObesidadeGrave.doseMg, 80, 'Peso > 130 kg deve receber 80 mg/dia (40mg 12/12h)');
  console.log('✓ Teste 7: Faixas de peso corporal de Enoxaparina aprovado');

  // 8. Caso 8: Parser de Texto Livre (Telegram e Cockpit)
  const textoLivre = "saf gestante 68kg 3 abortos anticoagulante lupico positivo confirmado 12 semanas ig 10 semanas";
  const paramsExt = ObstetriciaSafService.extrairParametrosTexto(textoLivre);
  assert.strictEqual(paramsExt.peso, 68, 'Peso 68 kg detectado');
  assert.strictEqual(paramsExt.abortosPrecoces, 3, '3 abortos detectados');
  assert.strictEqual(paramsExt.anticoagulanteLupico, true, 'Anticoagulante lúpico detectado');
  assert.strictEqual(paramsExt.intervaloMinimo12Semanas, true, 'Confirmação de 12 semanas detectada');
  assert.strictEqual(paramsExt.idadeGestacional, 10, 'IG 10 semanas detectada');
  console.log('✓ Teste 8: Parser de texto livre aprovado');

  // 9. Caso 9: Formatação Telegram
  const textoFormatado = ObstetriciaSafService.formatarTextoTelegram(resCaso1);
  assert.ok(textoFormatado.includes('MANEJO DE SAF E TROMBOFILIAS'), 'Header correto');
  assert.ok(textoFormatado.includes('SAF OBSTÉTRICA TÍPICA CONFIRMADA'), 'Fenótipo presente no texto');
  assert.ok(textoFormatado.includes('Enoxaparina Sódica'), 'Menciona Enoxaparina');
  assert.ok(textoFormatado.includes('REGRAS DE PERIPARTO & ANESTESIA NEUROAXIAL'), 'Contém regras de periparto');
  console.log('✓ Teste 9: Formatação de relatório Telegram aprovado');

  console.log('\n🚀 TODOS OS TESTES DE OBSTETRÍCIA & REUMATOLOGIA (SAF & TROMBOFILIAS) PASSARAM COM 100% DE SUCESSO!\n');
}

runTests();
