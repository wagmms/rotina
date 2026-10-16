/**
 * Suíte de Testes Cirúrgicos - Onda 2 da Revisão de Protocolos Médicos
 *
 * Módulos Cobertos:
 * 1. src/02_pals_pediatria.js (Escore Phoenix de Sepse Pediátrica SCCM/JAMA 2024)
 * 2. src/02_calculadoras_puras.js (CKD-EPI 2021 Creatinina + Cistatina C KDIGO 2024)
 * 3. src/02_nefrologia_clearance.js (Avaliação Nefrológica Integral KDIGO 2024 CGA)
 */

const assert = require('assert');
const PalsPediatriaService = require('../src/02_pals_pediatria.js');
const CalculadorasPuras = require('../src/02_calculadoras_puras.js');
const NefrologiaClearanceService = require('../src/02_nefrologia_clearance.js');

console.log('🧪 Iniciando testes da Onda 2: Pediatria Crítica (Phoenix) e Nefrologia (KDIGO 2024)...');

// ============================================================================
// 1. ESCORE PHOENIX DE SEPSE PEDIÁTRICA (SCCM / JAMA 2024)
// ============================================================================
console.log('--- Testando Escore Phoenix de Sepse Pediátrica (SCCM 2024) ---');

// Caso 1: Criança hígida sem disfunção orgânica (0 pontos)
const resNormal = PalsPediatriaService.avaliarPhoenixSepsis({
  idadeAnos: 4,
  pesoKg: 16,
  suspeitaInfeccao: true,
  spo2: 98,
  fio2: 0.21,
  pam: 65,
  lactatoMmolL: 1.2,
  plaquetas: 250000,
  inr: 1.0,
  glasgow: 15
});

assert.strictEqual(resNormal.pontosTotais, 0, 'Criança normal deve ter 0 pontos Phoenix');
assert.strictEqual(resNormal.sepseConfirmada, false, 'Não deve pontuar sepse com 0 pontos');
assert.strictEqual(resNormal.choqueSepticoConfirmado, false, 'Não deve pontuar choque séptico');

// Caso 2: Sepse Pediátrica sem choque (Phoenix >= 2, pontos Respiratório + Coagulação, CV = 0)
// Idade 18 meses (1.5 anos), PaO2/FiO2 180 em VMI (2 pts), Plaquetas 80.000 (1 pt)
const resSepse = PalsPediatriaService.avaliarPhoenixSepsis({
  idadeMeses: 18,
  pesoKg: 11,
  suspeitaInfeccao: true,
  pao2: 90,
  fio2: 0.5, // PaO2/FiO2 = 180 -> 2 pts em VMI
  vmi: true,
  pam: 55, // PAM normal para 18 meses (> 43 mmHg)
  lactatoMmolL: 1.8,
  plaquetas: 80000, // 1 pt coagulacao
  glasgow: 14
});

assert.strictEqual(resSepse.dominios.respiratorio.pontos, 2, 'PaO2/FiO2 180 em VMI deve pontuar 2 pts');
assert.strictEqual(resSepse.dominios.coagulacao.pontos, 1, 'Plaquetas 80k deve pontuar 1 pt');
assert.strictEqual(resSepse.dominios.cardiovascular.pontos, 0, 'Cardiovascular deve ser 0 pts');
assert.strictEqual(resSepse.pontosTotais, 3, 'Pontos totais devem ser 3');
assert.strictEqual(resSepse.sepseConfirmada, true, 'Deve confirmar Sepse Pediátrica');
assert.strictEqual(resSepse.choqueSepticoConfirmado, false, 'Não é choque séptico pois CV = 0');
assert(resSepse.diagnostico.includes('Sepse Pediátrica'), 'Diagnóstico deve indicar Sepse Pediátrica');

// Caso 3: Choque Séptico Pediátrico (Phoenix >= 2 com >= 1 pt Cardiovascular)
// Lactente 8 meses, 8 kg, com Noradrenalina contínua (1 pt DVA), Lactato 6.2 mmol/L (1 pt), PAM 28 mmHg (1 pt)
const resChoque = PalsPediatriaService.avaliarPhoenixSepsis({
  idadeMeses: 8,
  pesoKg: 8,
  suspeitaInfeccao: true,
  dva: ['noradrenalina'],
  lactatoMmolL: 6.2,
  pam: 28, // 1 a 11 meses: 25-38 mmHg -> 1 pt
  glasgow: 9 // ECG <= 10 -> 1 pt neuro
});

assert.strictEqual(resChoque.dominios.cardiovascular.pontos, 3, 'CV deve somar 3 pts (1 DVA + 1 Lactato + 1 PAM)');
assert.strictEqual(resChoque.dominios.neurologico.pontos, 1, 'ECG 9 deve somar 1 pt');
assert.strictEqual(resChoque.pontosTotais, 4, 'Total de pontos deve ser 4');
assert.strictEqual(resChoque.sepseConfirmada, true, 'Sepse confirmada');
assert.strictEqual(resChoque.choqueSepticoConfirmado, true, 'Choque séptico confirmado');
assert(resChoque.diagnostico.includes('Choque Séptico Pediátrico'), 'Diagnóstico de choque séptico');
assert.strictEqual(resChoque.condutas.ressuscitacaoVolemica.volumeCalculadoPorPeso.aliquota10mlKg, '80 mL');
assert.strictEqual(resChoque.condutas.ressuscitacaoVolemica.volumeCalculadoPorPeso.aliquota20mlKg, '160 mL');

// Caso 4: Avaliação da Tabela etária de PAM Phoenix
// Neonato < 1 mês: PAM 15 mmHg deve pontuar 2 pts (< 17)
const resNeoCritico = PalsPediatriaService.avaliarPhoenixSepsis({ idadeMeses: 0.5, pam: 15 });
assert.strictEqual(resNeoCritico.dominios.cardiovascular.subcomponentes.pam, 2, 'Neonato PAM 15 deve pontuar 2 pts');

// Adolescente 14 anos: PAM 35 mmHg deve pontuar 2 pts (< 38)
const resAdolescente = PalsPediatriaService.avaliarPhoenixSepsis({ idadeAnos: 14, pam: 35 });
assert.strictEqual(resAdolescente.dominios.cardiovascular.subcomponentes.pam, 2, 'Adolescente PAM 35 deve pontuar 2 pts');

// Caso 5: Disfunção extrema neurológica (Pupilas fixas bilaterais = 2 pts)
const resNeuroGrave = PalsPediatriaService.avaliarPhoenixSepsis({ pupilasFixasBilaterais: true });
assert.strictEqual(resNeuroGrave.dominios.neurologico.pontos, 2, 'Pupilas fixas bilaterais somam 2 pts');

console.log('✅ Todos os testes do Escore Phoenix (SCCM 2024) passaram com sucesso.');

// ============================================================================
// 2. CKD-EPI 2021 CREATININA-CISTATINA C (KDIGO 2024)
// ============================================================================
console.log('--- Testando CKD-EPI 2021 + Cistatina C (KDIGO 2024) ---');

// Teste de regressão posicional clássico (Homem 60 anos, Cr 1.0 mg/dL, sem Cistatina)
const resCrIsolada = CalculadorasPuras.ckdEpi2021(1.0, 60, false);
assert.strictEqual(resCrIsolada.ok, true, 'Cálculo de CKD-EPI deve retornar ok: true');
assert(Math.abs(resCrIsolada.dados.tfg - 86.2) < 2.0, 'TFG homem 60a Cr 1.0 deve ser ~86.2');
assert.strictEqual(resCrIsolada.dados.categoria, 'G2', 'Estádio deve ser G2');
assert.strictEqual(resCrIsolada.dados.tfgCombinada, null, 'Sem cistatina, tfgCombinada é null');

// Teste com Cistatina C fornecida (Mulher 68 anos, Cr 1.1 mg/dL, Cistatina C 1.8 mg/L)
// eGFRcr isolada é ~54 mL/min (G3a limítrofe), mas a Cistatina C elevada reclassifica para G3b
const resComb = CalculadorasPuras.ckdEpi2021({
  creatinina: 1.1,
  idade: 68,
  ehFeminino: true,
  cistatinaC: 1.8
});

assert.strictEqual(resComb.ok, true, 'Cálculo combinado deve retornar ok: true');
assert(resComb.dados.tfgCreatinina > 50, 'eGFRcr deve ser > 50 (estádio G3a)');
assert(resComb.dados.tfgCombinada < 45, 'eGFRcr-cys deve ser < 45 (estádio G3b)');
assert.strictEqual(resComb.dados.categoria, 'G3b', 'Categoria oficial deve ser a da combinada (G3b)');
assert.strictEqual(resComb.dados.concordanciaDiagnostica.estadiosConcordantes, false, 'Deve detectar discordância inter-equações');
assert(resComb.dados.concordanciaDiagnostica.reclassificacaoKDIGO.includes('Reclassificado de G3a (eGFRcr) para G3b (eGFRcr-cys)'));
assert(resComb.textoFormatado.includes('eGFRcr-cys'), 'Texto formatado deve destacar a equação combinada');

console.log('✅ Todos os testes do CKD-EPI 2021 com Cistatina C passaram com sucesso.');

// ============================================================================
// 3. AVALIAÇÃO NEFROLÓGICA INTEGRAL (KDIGO 2024 CGA)
// ============================================================================
console.log('--- Testando NefrologiaClearanceService.avaliarClearanceNefrologico ---');

const resNefroCompleto = NefrologiaClearanceService.avaliarClearanceNefrologico({
  creatinina: 1.4,
  idade: 72,
  sexo: 'M',
  cistatinaC: 1.9,
  pesoKg: 75,
  relacaoAlbuminaCreatinina: 150 // A2 (30-300 mg/g)
});

assert(resNefroCompleto.tfgCombinada !== null, 'TFG Combinada calculada');
assert.strictEqual(resNefroCompleto.estadiamentoKDIGO.categoriaOficial, 'G3b', 'Categoria TFG oficial deve ser G3b');
assert.strictEqual(resNefroCompleto.estadiamentoKDIGO.albuminuria.categoria, 'A2', 'Categoria RAC deve ser A2');
assert.strictEqual(resNefroCompleto.estadiamentoKDIGO.classificacaoCompletaCGA, 'G3bA2', 'Classificação CGA completa deve ser G3bA2');
assert(resNefroCompleto.cockcroftGaultMlMin > 0, 'Cockcroft-Gault deve ser computado quando peso fornecido');
assert(resNefroCompleto.conformidadeKDIGO2024.cistatinaCUtilizada, 'Flag de Cistatina utilizada deve ser true');
assert(resNefroCompleto.conformidadeKDIGO2024.alertas.length > 0, 'Alertas KDIGO devem ser emitidos');

console.log('✅ Todos os testes do NefrologiaClearanceService passaram com sucesso.');

console.log('\n🎉 PARABÉNS: Todos os testes cirúrgicos da Onda 2 foram aprovados com 100% de sucesso!');
