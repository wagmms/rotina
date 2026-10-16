/**
 * Suíte de Testes Cirúrgicos - Onda 3 da Revisão de Protocolos Médicos
 *
 * Módulos Cobertos:
 * 1. src/02_calculadoras_puras.js (Escore FIB-4 determinístico para MASLD / MASH AASLD/EASL 2024)
 * 2. src/02_endocrinologia_diabetes.js (Síndrome CKM AHA 2024 e Farmacoterapia DM2 ADA 2025/2026)
 * 3. src/02_soap_ambulatorial.js (Classificação e Metas Pressóricas HAS Diretriz ESC 2024)
 */

const assert = require('assert');
const CalculadorasPuras = require('../src/02_calculadoras_puras.js');
const EndocrinologiaDiabetesService = require('../src/02_endocrinologia_diabetes.js');
const SoapAmbulatorialService = require('../src/02_soap_ambulatorial.js');

console.log('🧪 Iniciando testes da Onda 3: Doenças Crônicas, Síndrome CKM & Hepatologia...');

// ============================================================================
// 1. ESCORE FIB-4 PARA MASLD / MASH (AASLD / EASL 2024)
// ============================================================================
console.log('--- Testando Escore FIB-4 determinístico (MASLD AASLD/EASL 2024) ---');

// Caso 1: Adulto < 65 anos com Baixo Risco de Fibrose (< 1.30)
// Idade 45 anos, AST 28 U/L, ALT 32 U/L, Plaquetas 250 (ou 250.000)
// FIB-4 = (45 * 28) / (250 * sqrt(32)) = 1260 / (250 * 5.6568) = 1260 / 1414.2 = ~0.89
const resFib4Baixo = CalculadorasPuras.fib4({
  idade: 45,
  ast: 28,
  alt: 32,
  plaquetas: 250
});

assert.strictEqual(resFib4Baixo.ok, true, 'FIB-4 deve retornar ok: true');
assert(Math.abs(resFib4Baixo.dados.fib4 - 0.89) < 0.05, 'FIB-4 calculado deve ser ~0.89');
assert.strictEqual(resFib4Baixo.dados.risco, 'Baixo', 'Risco deve ser Baixo');
assert(resFib4Baixo.dados.categoria.includes('Baixo risco'), 'Categoria deve indicar baixo risco');
assert(resFib4Baixo.textoFormatado.includes('FIB-4'), 'Texto formatado deve conter FIB-4');

// Caso 2: Normalização de plaquetas em /mm³ (ex: 210000 convertida para 210)
const resFib4PlaqConvertida = CalculadorasPuras.fib4(50, 40, 35, 210000);
assert.strictEqual(resFib4PlaqConvertida.ok, true, 'Deve aceitar chamada posicional');
assert(resFib4PlaqConvertida.dados.fib4 > 0, 'FIB-4 deve ser calculado com plaquetas normalizadas');

// Caso 3: Idoso >= 65 anos testando corte ajustado de 2.00 (Diretriz AASLD/EASL 2024)
// Idade 68 anos, AST 42, ALT 38, Plaquetas 180 -> FIB-4 = (68 * 42) / (180 * sqrt(38)) = 2856 / 1109.6 = 2.57
// Em < 65 seria intermediário; em >= 65 o corte inferior é 2.00 (permanece intermediário pois 2.57 > 2.00 e <= 2.67)
const resFib4IdosoIntermed = CalculadorasPuras.fib4(68, 42, 38, 180);
assert.strictEqual(resFib4IdosoIntermed.dados.corteInferior, 2.00, 'Corte inferior em >= 65 anos deve ser 2.00');
assert.strictEqual(resFib4IdosoIntermed.dados.risco, 'Intermediário', 'Risco intermediário com 2.57 em idoso');

// Idoso 70 anos com FIB-4 de 1.65 (em paciente jovem seria intermediário, mas em idoso com corte 2.00 é BAIXO RISCO)
// Ex: Idade 70, AST 26, ALT 30, Plaquetas 200 -> FIB-4 = (70 * 26) / (200 * sqrt(30)) = 1820 / 1095.4 = ~1.66
const resFib4IdosoBaixo = CalculadorasPuras.fib4(70, 26, 30, 200);
assert.strictEqual(resFib4IdosoBaixo.dados.risco, 'Baixo', 'FIB-4 1.66 em idoso >= 65 deve ser Baixo Risco (corte < 2.00)');

// Caso 4: Alto Risco de Fibrose Avançada F3-F4 (> 2.67)
// Idade 58, AST 85, ALT 45, Plaquetas 110 -> FIB-4 = (58 * 85) / (110 * sqrt(45)) = 4930 / 737.9 = ~6.68
const resFib4Alto = CalculadorasPuras.fib4(58, 85, 45, 110);
assert.strictEqual(resFib4Alto.dados.risco, 'Alto', 'FIB-4 > 2.67 deve ser Alto Risco');
assert(resFib4Alto.dados.conduta.includes('Hepatologia'), 'Deve indicar encaminhamento ao especialista');

console.log('✅ Todos os testes do Escore FIB-4 passaram com sucesso.');

// ============================================================================
// 2. SÍNDROME CARDIO-RENAL-METABÓLICA (CKM AHA 2024) E DM2 (ADA 2025/2026)
// ============================================================================
console.log('--- Testando Síndrome CKM (AHA 2024) e DM2 (ADA 2025/2026) ---');

// Teste CKM Estádio 0 (Indivíduo saudável sem fatores de risco)
const ckm0 = EndocrinologiaDiabetesService.avaliarSindromeCKM({
  imc: 22,
  tfg: 105,
  pas: 115,
  pad: 72,
  glicemiaJejum: 82,
  triglicerideos: 95
});
assert.strictEqual(ckm0.estadio, '0', 'Sem fatores de risco deve ser CKM Estádio 0');

// Teste CKM Estádio 1 (Sobrepeso IMC 28 sem DM/HAS)
const ckm1 = EndocrinologiaDiabetesService.avaliarSindromeCKM({
  imc: 28.5,
  tfg: 98,
  pas: 118,
  pad: 76
});
assert.strictEqual(ckm1.estadio, '1', 'Excesso de adiposidade isolado deve ser CKM Estádio 1');

// Teste CKM Estádio 2 (DM2 estabelecido ou HAS)
const ckm2 = EndocrinologiaDiabetesService.avaliarSindromeCKM({
  imc: 29,
  tfg: 80,
  dm2Diagnostico: true,
  pas: 135,
  pad: 85
});
assert.strictEqual(ckm2.estadio, '2', 'DM2 sem DCV deve ser CKM Estádio 2');

// Teste CKM Estádio 3 (DCV subclínica: CAC >= 100 ou DRC de muito alto risco)
const ckm3 = EndocrinologiaDiabetesService.avaliarSindromeCKM({
  imc: 30,
  tfg: 40,
  rac: 350, // DRC muito alto risco
  dm2Diagnostico: true
});
assert.strictEqual(ckm3.estadio, '3', 'DRC muito alto risco deve classificar como CKM Estádio 3');

// Teste CKM Estádio 4a (DCV clínica estabelecida: IAM prévio, sem falência renal terminal)
const ckm4a = EndocrinologiaDiabetesService.avaliarSindromeCKM({
  imc: 27,
  tfg: 65,
  dcvClinica: { dac: true }
});
assert.strictEqual(ckm4a.estadio, '4a', 'DAC manifesta sem diálise deve ser Estádio 4a');

// Teste CKM Estádio 4b (DCV clínica com diálise ou TFG < 15)
const ckm4b = EndocrinologiaDiabetesService.avaliarSindromeCKM({
  imc: 26,
  tfg: 12,
  dialise: true,
  dcvClinica: { ic: true }
});
assert.strictEqual(ckm4b.estadio, '4b', 'IC com diálise deve ser Estádio 4b');

// Teste ADA 2025/2026: Prescrição DM2 com IC ou DRC
// Paciente com DM2 e Insuficiência Cardíaca, com HbA1c controlada (6.8%)
// REGRA PÉTREA ADA: iSGLT2 obrigatório Classe I independentemente da HbA1c!
const prescricaoDmIC = EndocrinologiaDiabetesService.prescreverTerapiaDM2_ADA2026({
  hba1c: 6.8,
  tfg: 55,
  insuficienciaCardiaca: true
});

assert.strictEqual(prescricaoDmIC.temIndicacaoCardiorrenalPrioritaria, true, 'Deve ter indicação cardiorrenal mandatória');
assert(prescricaoDmIC.classesFarmacologicasRecomendadas.includes('iSGLT2'), 'iSGLT2 deve ser recomendado mandatoriamente');
assert(prescricaoDmIC.eixo1_ProtecaoOrgaoAlvo.some(p => p.indicacao.includes('Insuficiência Cardíaca')));

console.log('✅ Todos os testes de Síndrome CKM e DM2 ADA passaram com sucesso.');

// ============================================================================
// 3. CLASSIFICAÇÃO E METAS DE HAS (DIRETRIZ ESC 2024)
// ============================================================================
console.log('--- Testando Classificação e Metas de HAS (ESC 2024) ---');

// Caso 1: Pressão Arterial Não Elevada (< 120 e < 70)
const paNaoElevada = SoapAmbulatorialService.classificarPA_ESC2024(116, 68);
assert.strictEqual(paNaoElevada.id, 'pa_nao_elevada');
assert.strictEqual(paNaoElevada.isHipertensao, false);

// Caso 2: Nova categoria 'Pressão Arterial Elevada' (120-139 ou 70-89)
const paElevada = SoapAmbulatorialService.classificarPA_ESC2024(128, 76);
assert.strictEqual(paElevada.id, 'pa_elevada');
assert.strictEqual(paElevada.isHipertensao, false);
assert(paElevada.label.includes('Pressão Arterial Elevada'));

// Caso 3: Hipertensão Estágio 1, 2 e 3
const paEstagio1 = SoapAmbulatorialService.classificarPA_ESC2024(146, 92);
assert.strictEqual(paEstagio1.estagio, 1);
assert.strictEqual(paEstagio1.isHipertensao, true);

const paEstagio2 = SoapAmbulatorialService.classificarPA_ESC2024(165, 102);
assert.strictEqual(paEstagio2.estagio, 2);

const paEstagio3 = SoapAmbulatorialService.classificarPA_ESC2024(190, 115);
assert.strictEqual(paEstagio3.estagio, 3);

// Caso 4: Meta Pressórica ESC 2024 (Adulto 18-79 anos: PAS 120-129 mmHg)
const metaAdulto = SoapAmbulatorialService.obterMetaPressorica_ESC2024(52, false);
assert.strictEqual(metaAdulto.alvoPAS.min, 120);
assert.strictEqual(metaAdulto.alvoPAS.max, 129);
assert(metaAdulto.recomendacaoSOAP.includes('120-129 mmHg'));

// Caso 5: Meta Idoso Frágil / >= 80 anos (130-139 mmHg com princípio ALARA)
const metaIdoso = SoapAmbulatorialService.obterMetaPressorica_ESC2024(82, false);
assert.strictEqual(metaIdoso.alvoPAS.min, 130);
assert.strictEqual(metaIdoso.alvoPAS.max, 139);
assert.strictEqual(metaIdoso.principioALARA, true);

// Caso 6: Integração no estruturarCondutaHas
const condutaHas = SoapAmbulatorialService.estruturarCondutaHas({
  pas: 154,
  pad: 94,
  idade: 58
});
assert(condutaHas.classificacaoESC2024 !== undefined, 'classificacaoESC2024 deve estar presente');
assert(condutaHas.metaESC2024 !== undefined, 'metaESC2024 deve estar presente');
assert(condutaHas.avaliacaoControleESC2024 !== undefined, 'avaliacaoControleESC2024 deve estar presente');

console.log('✅ Todos os testes de HAS ESC 2024 passaram com sucesso.');

console.log('\n🎉 PARABÉNS: Todos os testes cirúrgicos da Onda 3 foram aprovados com 100% de sucesso!');
