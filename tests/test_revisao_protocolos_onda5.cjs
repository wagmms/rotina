/**
 * Suíte de Testes Cirúrgicos - Onda 5 da Revisão de Protocolos Médicos
 *
 * Módulos Cobertos:
 * 1. src/02_centro_obstetrico.js (Hemorragia Pós-Parto HPP, Bundle E-MOTIVE FIGO 2024 e ICO = FC/PAS)
 * 2. src/02_centro_obstetrico.js (Pré-Eclâmpsia com Sinais de Gravidade, Zuspan/Pritchard e Gluconato de Cálcio)
 * 3. src/02_centro_obstetrico.js (Integração com RCF e Doppler Obstétrico Estádios I a IV Barcelona/ISUOG)
 */

const assert = require('assert');
const CentroObstetricoService = require('../src/02_centro_obstetrico.js');

console.log('🧪 Iniciando testes da Onda 5: Centro Obstétrico, Hemorragia Pós-Parto & Pré-Eclâmpsia...');

// ============================================================================
// 1. HEMORRAGIA PÓS-PARTO (HPP), ÍNDICE DE CHOQUE OBSTÉTRICO & BUNDLE E-MOTIVE
// ============================================================================
console.log('--- Testando HPP, Índice de Choque Obstétrico (ICO) e Bundle E-MOTIVE ---');

// Teste 1: Puerpério estável com ICO normal (< 0.9)
const hppNormal = CentroObstetricoService.avaliarHemorragiaPosParto({
  fc: 76,
  pas: 118,
  pad: 74,
  perdaSanguineaEstimadaMl: 250,
  tempoPosPartoHoras: 0.5
});
assert.strictEqual(hppNormal.hemodinamica.indiceChoqueObstetrico, 0.64, 'ICO deve ser 76/118 = 0.64');
assert.strictEqual(hppNormal.hemodinamica.nivelAlertaIco, 'NORMAL', 'Nível de alerta deve ser NORMAL');
assert.strictEqual(hppNormal.hemodinamica.acionarTransfusaoMacica, false, 'Não deve acionar transfusão maciça');

// Teste 2: Alerta Precoce de Choque Obstétrico Oculto (ICO entre 0.9 e 1.1)
const hppAlerta = CentroObstetricoService.avaliarHemorragiaPosParto({
  fc: 104,
  pas: 100,
  pad: 60,
  perdaSanguineaEstimadaMl: 450,
  tempoPosPartoHoras: 1.0
});
assert.strictEqual(hppAlerta.hemodinamica.indiceChoqueObstetrico, 1.04, 'ICO deve ser 104/100 = 1.04');
assert.strictEqual(hppAlerta.hemodinamica.nivelAlertaIco, 'ALERTA_PRECOCE', 'Deve disparar ALERTA_PRECOCE');
assert.strictEqual(hppAlerta.diagnosticoHppConfirmado, true, 'Deve confirmar suspeita de HPP por perda e ICO alterado');

// Teste 3: Choque Grave com ativação de Transfusão Maciça (ICO >= 1.4)
const hppCritico = CentroObstetricoService.avaliarHemorragiaPosParto({
  fc: 135,
  pas: 90,
  pad: 50,
  perdaSanguineaEstimadaMl: 1200,
  tempoPosPartoHoras: 1.5,
  refratarioUterotonicos: true
});
assert.strictEqual(hppCritico.hemodinamica.indiceChoqueObstetrico, 1.5, 'ICO deve ser 135/90 = 1.5');
assert.strictEqual(hppCritico.hemodinamica.nivelAlertaIco, 'CHOQUE_GRAVE_CRITICO', 'Choque crítico');
assert.strictEqual(hppCritico.hemodinamica.acionarTransfusaoMacica, true, 'Deve ativar protocolo de transfusão maciça 1:1:1');
assert(hppCritico.bundleEMOTIVE.VE_ExaminationAndEscalation.escalonamentoInvasivo.length > 0, 'Deve conter escalonamento invasivo com Bakri e B-Lynch');

// Teste 4: Janela do Ácido Tranexâmico (Estudo WOMAN / FIGO 2024: <= 3 horas vs > 3 horas)
const hppPrecoce = CentroObstetricoService.avaliarHemorragiaPosParto({ fc: 110, pas: 95, tempoPosPartoHoras: 2.0 });
assert(hppPrecoce.bundleEMOTIVE.T_TranexamicAcid.includes('INDICADO IMEDIATAMENTE'), 'TXA indicado em até 3 horas do parto');
assert(hppPrecoce.bundleEMOTIVE.T_TranexamicAcid.includes('1 g'), 'Dose de 1g IV em 10 minutos');

const hppTardia = CentroObstetricoService.avaliarHemorragiaPosParto({ fc: 110, pas: 95, tempoPosPartoHoras: 4.5 });
assert(hppTardia.bundleEMOTIVE.T_TranexamicAcid.includes('CONTRAINDICADO'), 'TXA contraindicado/não recomendado após 3 horas');

// Teste 5: Trava de Segurança - Bloqueio de Metilergometrina (Methergin) na Hipertensão / Pré-Eclâmpsia
const hppComHas = CentroObstetricoService.avaliarHemorragiaPosParto({
  fc: 105,
  pas: 150,
  pad: 95,
  hipertensaoOuPreEclampsia: true
});
const condutaErgotaminico = hppComHas.bundleEMOTIVE.VE_ExaminationAndEscalation.segundaLinhaUterotonicos.ergotaminico;
assert(condutaErgotaminico.includes('BLOQUEIO DE SEGURANÇA') || condutaErgotaminico.includes('PROIBIDA'), 'Methergin deve ser estritamente bloqueado na hipertensa');

console.log('✅ Todos os testes de Hemorragia Pós-Parto (HPP) passaram com sucesso.');

// ============================================================================
// 2. PRÉ-ECLÂMPSIA COM SINAIS DE GRAVIDADE, SULFATO DE MAGNÉSIO & CRISE
// ============================================================================
console.log('--- Testando Pré-Eclâmpsia com Sinais de Gravidade (Zuspan/Pritchard) ---');

// Teste 1: Pré-eclâmpsia com critérios de gravidade (Crise PA 165/112 e Plaquetopenia)
const peGrave = CentroObstetricoService.manejarPreEclampsiaGraveEclampsia({
  pas: 165,
  pad: 112,
  plaquetas: 85000,
  creatinina: 1.2,
  tgoAst: 95,
  bombaInfusaoDisponivel: true
});
assert.strictEqual(peGrave.classificacao, 'PRÉ-ECLÂMPSIA COM SINAIS DE GRAVIDADE', 'Classificação de Pré-Eclâmpsia Grave');
assert.strictEqual(peGrave.sulfatoDeMagnesio.indicado, true, 'Sulfato de magnésio indicado');
assert(peGrave.sulfatoDeMagnesio.esquemas.zuspan_IV_Exclusivo.ataque.includes('4 g'), 'Ataque de 4g em 15-20 min');
assert(peGrave.sulfatoDeMagnesio.esquemas.zuspan_IV_Exclusivo.manutencao.includes('1 a 2 g/hora'), 'Manutenção 1 a 2 g/h');
assert(peGrave.manejoCriseHipertensiva.emCriseHipertensiva, true, 'Deve indicar crise hipertensiva');
assert(peGrave.manejoCriseHipertensiva.primeiraLinhaOpcaoB_IV.includes('Hidralazina 5 mg'), 'Hidralazina 5 mg IV de 1ª linha');

// Teste 2: Síndrome HELLP Completa
const hellp = CentroObstetricoService.manejarPreEclampsiaGraveEclampsia({
  pas: 155,
  pad: 98,
  plaquetas: 45000,
  tgoAst: 120,
  ldh: 750
});
assert(hellp.classificacao.includes('HELLP'), 'Deve classificar como Síndrome HELLP');
// Com plaquetas < 50.000, deve contraindicar Pritchard e exigir Zuspan
assert(hellp.sulfatoDeMagnesio.esquemas.esquemaPreferencialUnidade.includes('ZUSPAN OBRIGATÓRIO'), 'Zuspan obrigatório com plaquetas < 50k');

// Teste 3: Vigilância de Toxicidade por Magnésio e Antídoto Gluconato de Cálcio
const vigIntoxicacao = CentroObstetricoService.manejarPreEclampsiaGraveEclampsia({
  pas: 160,
  pad: 100,
  monitorizacaoMgSO4: {
    reflexoPatelar: 'AUSENTE',
    fr: 11,
    diureseMlHora: 15
  }
});
assert.strictEqual(vigIntoxicacao.sulfatoDeMagnesio.vigilanciaToxicidade.intoxicacaoDetectada, true, 'Deve detectar intoxicação por MgSO4');
assert(vigIntoxicacao.sulfatoDeMagnesio.vigilanciaToxicidade.condutaImediata.includes('SUSPENDER IMEDIATAMENTE'), 'Deve mandar suspender MgSO4');
assert(vigIntoxicacao.sulfatoDeMagnesio.vigilanciaToxicidade.condutaImediata.includes('Gluconato de Cálcio'), 'Deve prescrever Gluconato de Cálcio 10% 10 mL IV');

console.log('✅ Todos os testes de Pré-Eclâmpsia e Sulfato de Magnésio passaram com sucesso.');

// ============================================================================
// 3. RESTRIÇÃO DE CRESCIMENTO FETAL (RCF / CIUR) & DOPPLER DE BARCELONA / ISUOG
// ============================================================================
console.log('--- Testando Restrição de Crescimento Fetal (RCF) e Doppler Obstétrico ---');

// Teste 1: Feto com biometria normal (PFE p25)
const rcfNormal = CentroObstetricoService.avaliarRcfDopplerCentroObstetrico({
  igSemanas: 36,
  pfePercentil: 25
});
assert.strictEqual(rcfNormal.classificacaoBarcelona, 'FETO_ADEQUADO_PARA_IG', 'Feto AIG');

// Teste 2: PIG Constitucional (PFE p6 com Doppler normal)
const pigConstitucional = CentroObstetricoService.avaliarRcfDopplerCentroObstetrico({
  igSemanas: 36,
  pfePercentil: 6,
  fluxoDiastolicoAU: 'PRESENTE',
  ipUmbilicalPercentil: 50,
  icpPercentil: 50
});
assert.strictEqual(pigConstitucional.classificacaoBarcelona, 'PIG_CONSTITUCIONAL', 'PIG Constitucional');
assert(pigConstitucional.condutaCentroObstetrico.momentoInterrupcaoMeta.includes('40 semanas'), 'Interrupção com 40 semanas');

// Teste 3: RCF Estádio I (PFE < p3 ou PFE < p10 com Doppler alterado leve)
const rcfEstadio1 = CentroObstetricoService.avaliarRcfDopplerCentroObstetrico({
  igSemanas: 34,
  pfePercentil: 2,
  fluxoDiastolicoAU: 'PRESENTE'
});
assert.strictEqual(rcfEstadio1.classificacaoBarcelona, 'RCF_ESTADIO_I', 'RCF Estádio I');
assert(rcfEstadio1.condutaCentroObstetrico.momentoInterrupcaoMeta.includes('37 semanas'), 'Interrupção com 37 semanas');

// Teste 4: RCF Estádio II (Diástole Zero na Artéria Umbilical)
const rcfEstadio2 = CentroObstetricoService.avaliarRcfDopplerCentroObstetrico({
  igSemanas: 32,
  pfePercentil: 4,
  fluxoDiastolicoAU: 'ZERO'
});
assert.strictEqual(rcfEstadio2.classificacaoBarcelona, 'RCF_ESTADIO_II', 'RCF Estádio II');
assert(rcfEstadio2.condutaCentroObstetrico.momentoInterrupcaoMeta.includes('34 semanas'), 'Interrupção com 34 semanas');
assert.strictEqual(rcfEstadio2.condutaCentroObstetrico.viaDePartoRecomendada, 'CESARIANA ELETIVA.', 'Cesariana indicada');

// Teste 5: RCF Estádio III (Diástole Reversa na AU ou Ducto Venoso > p95)
const rcfEstadio3 = CentroObstetricoService.avaliarRcfDopplerCentroObstetrico({
  igSemanas: 29,
  pfePercentil: 3,
  fluxoDiastolicoAU: 'REVERSO'
});
assert.strictEqual(rcfEstadio3.classificacaoBarcelona, 'RCF_ESTADIO_III', 'RCF Estádio III');
assert(rcfEstadio3.condutaCentroObstetrico.momentoInterrupcaoMeta.includes('30 semanas'), 'Interrupção com 30 semanas');
assert(rcfEstadio3.condutaCentroObstetrico.corticoideAntenatal.includes('INDICADO'), 'Corticoterapia antenatal indicada');
assert(rcfEstadio3.condutaCentroObstetrico.neuroprotecaoFetalMgSO4.includes('INDICADO'), 'Neuroproteção com MgSO4 indicada para < 32 semanas');

// Teste 6: RCF Estádio IV (Onda-A Reversa no Ducto Venoso ou CTG crítico)
const rcfEstadio4 = CentroObstetricoService.avaliarRcfDopplerCentroObstetrico({
  igSemanas: 27,
  pfePercentil: 2,
  ondaADuctoVenoso: 'REVERSA'
});
assert.strictEqual(rcfEstadio4.classificacaoBarcelona, 'RCF_ESTADIO_IV', 'RCF Estádio IV');
assert(rcfEstadio4.condutaCentroObstetrico.momentoInterrupcaoMeta.includes('IMEDIATA'), 'Interrupção imediata');

console.log('✅ Todos os testes de RCF e Doppler Obstétrico passaram com sucesso.');

console.log('\n🎉 SUCESSO TOTAL: Todos os testes da Onda 5 foram aprovados com excelência!');
