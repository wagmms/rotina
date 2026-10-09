/**
 * Testes Unitários: Módulo de Pediatria de Emergência - Bronquiolite Viral Aguda (BVA)
 * Diretrizes SBP / AAP
 */

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

// Carregar código fonte
const srcPath = path.join(__dirname, '../src/02_pediatria_bronquiolite.js');
const srcCode = fs.readFileSync(srcPath, 'utf8');

const sandbox = { module: {} };
vm.createContext(sandbox);
vm.runInContext(srcCode, sandbox);

const PediatriaBronquioliteService = sandbox.module.exports || sandbox.PediatriaBronquioliteService;

function runTests() {
  console.log('Iniciando testes rigorosos de Pediatria — Bronquiolite Viral Aguda...');

  // 1. Caso Clínico Leve
  const resultLeve = PediatriaBronquioliteService.avaliar({
    idadeMeses: 6,
    pesoKg: 8,
    fr: 38,
    fc: 125,
    spo2: 97,
    sibilos: 1,
    tiragem: 1
  });
  assert.strictEqual(resultLeve.gravidade.classificacao, 'Leve', 'Classificação deve ser Leve');
  assert.strictEqual(resultLeve.gravidade.internacaoUTI, false, 'Leve não interna em UTI');
  assert.strictEqual(resultLeve.gravidade.internacaoHospitalar, false, 'Leve não necessita internação hospitalar');
  assert.strictEqual(resultLeve.gravidade.riscoBroncoaspiracao, false, 'Sem risco iminente de broncoaspiração em FR 38');
  assert.strictEqual(resultLeve.gravidade.indicacaoCNAF, false, 'Sem indicação de CNAF em quadro leve');
  console.log('✓ Teste 1: Bronquiolite Leve aprovado');

  // 2. Caso Clínico Moderado
  const resultMod = PediatriaBronquioliteService.avaliar({
    idadeMeses: 4,
    pesoKg: 6.5,
    fr: 54, // 1 pt (51-60 em lactente de 4 meses)
    fc: 145, // 1 pt (140-160)
    spo2: 92, // 1 pt (92-94)
    sibilos: 2, // 2 pts
    tiragem: 1  // 1 pt
  });
  // Total: 1 + 1 + 1 + 2 + 1 = 6 pontos
  assert.strictEqual(resultMod.gravidade.score, 6, 'Score deve ser 6');
  assert.strictEqual(resultMod.gravidade.classificacao, 'Moderada', 'Classificação deve ser Moderada (4 a 7 pontos)');
  assert.strictEqual(resultMod.gravidade.internacaoUTI, false, 'Moderada não deve ir direto para UTI sem fatores críticos');
  assert.strictEqual(resultMod.gravidade.internacaoHospitalar, true, 'Moderada deve ser admitida em enfermaria pediátrica');
  assert.strictEqual(resultMod.oxigenoterapia.cnaf, null, 'Sem indicação imediata de CNAF');
  console.log('✓ Teste 2: Bronquiolite Moderada aprovado');

  // 3. Caso Clínico Grave com Indicação de CNAF e Hidratação Venosa Restrita (70% Holliday)
  const resultGrave = PediatriaBronquioliteService.avaliar({
    idadeMeses: 2,
    pesoKg: 5,
    fr: 68, // 2 pts (61-70)
    fc: 165, // 2 pts (> 160)
    spo2: 89, // 2 pts (88-91)
    sibilos: 2, // 2 pts
    tiragem: 2 // 2 pts
  });
  // Total: 2 + 2 + 2 + 2 + 2 = 10 pontos
  assert.strictEqual(resultGrave.gravidade.score, 10, 'Score deve ser 10');
  assert.strictEqual(resultGrave.gravidade.classificacao, 'Grave', 'Classificação deve ser Grave (>= 8 pontos)');
  assert.strictEqual(resultGrave.gravidade.internacaoUTI, true, 'Grave indica internação em UTI');
  assert.strictEqual(resultGrave.gravidade.indicacaoCNAF, true, 'Grave indica CNAF');
  assert.strictEqual(resultGrave.gravidade.riscoBroncoaspiracao, true, 'FR 68 impõe suspensão de dieta oral');
  
  // Verificação dos parâmetros de CNAF: 5 kg -> 10 L/min
  assert.ok(resultGrave.oxigenoterapia.cnaf !== null, 'CNAF deve estar preenchido');
  assert.strictEqual(resultGrave.oxigenoterapia.cnaf.fluxoInicialLmin, 10, 'Fluxo inicial deve ser 10 L/min para 5kg');
  
  // Verificação de Holliday-Segar com 70% de restrição (5kg * 100 = 500 mL -> 70% = 350 mL/dia, 14.6 mL/h)
  assert.strictEqual(resultGrave.hidratacao.hollidayBasalDia, 500, 'Basal deve ser 500 mL/dia');
  assert.strictEqual(resultGrave.hidratacao.holliday70Dia, 350, 'Restrito 70% deve ser 350 mL/dia');
  assert.strictEqual(resultGrave.hidratacao.vazao70MlHora, 14.6, 'Vazão 70% deve ser 14.6 mL/h');
  console.log('✓ Teste 3: Bronquiolite Grave, CNAF e Hidratação Restrita aprovados');

  // 4. Caso Clínico Crítico / Ameaça à Vida (Exaustão, Apneia)
  const resultCritico = PediatriaBronquioliteService.avaliar({
    idadeMeses: 1,
    pesoKg: 3.5,
    fr: 78,
    spo2: 85,
    apneia: true,
    exaustao: true,
    toraxSilencioso: true
  });
  assert.strictEqual(resultCritico.gravidade.classificacao, 'Crítica / Ameaça à Vida');
  assert.strictEqual(resultCritico.gravidade.ameacaVida, true);
  assert.strictEqual(resultCritico.gravidade.internacaoUTI, true);
  console.log('✓ Teste 4: Bronquiolite Crítica com ameaça à vida aprovado');

  // 5. Rastreamento de Fatores de Risco e Profilaxia com Palivizumabe
  const resultVsr = PediatriaBronquioliteService.avaliar({
    idadeMeses: 4,
    pesoKg: 5,
    idadeGestacionalSemanas: 27,
    prematuro: true
  });
  assert.strictEqual(resultVsr.profilaxiaVsr.elegivel, true, 'Prematuro < 29 semanas deve ser elegível para Palivizumabe');
  assert.ok(resultVsr.fatoresRisco.presentes, 'Deve detectar fatores de risco');
  console.log('✓ Teste 5: Profilaxia com Palivizumabe e fatores de risco aprovados');

  // 6. Verificação de Bloqueios de Segurança (Choosing Wisely)
  const naoFazer = PediatriaBronquioliteService.avaliarNaoFazer();
  assert.ok(naoFazer.length >= 5, 'Deve conter pelo menos 5 alertas de não fazer');
  const temSalbutamol = naoFazer.some(b => b.item.includes('Salbutamol'));
  const temCorticoide = naoFazer.some(b => b.item.includes('Corticosteroides'));
  const temAntibiotico = naoFazer.some(b => b.item.includes('Antibioticoterapia'));
  assert.ok(temSalbutamol, 'Deve alertar sobre não uso de salbutamol');
  assert.ok(temCorticoide, 'Deve alertar sobre não uso de corticoide');
  assert.ok(temAntibiotico, 'Deve alertar sobre não uso de antibióticos');
  console.log('✓ Teste 6: Diretrizes Choosing Wisely SBP/AAP aprovadas');

  // 7. Extração de Parâmetros de Texto Livre
  const textoLivre = "bronquiolite 3 meses 6.5 kg fr 65 fc 155 spo2 90 tiragem moderada sibilo difuso apneia";
  const pExtraido = PediatriaBronquioliteService.extrairParametrosTexto(textoLivre);
  assert.strictEqual(pExtraido.idadeMeses, 3);
  assert.strictEqual(pExtraido.pesoKg, 6.5);
  assert.strictEqual(pExtraido.fr, 65);
  assert.strictEqual(pExtraido.fc, 155);
  assert.strictEqual(pExtraido.spo2, 90);
  assert.strictEqual(pExtraido.tiragem, 2);
  assert.strictEqual(pExtraido.sibilos, 3);
  assert.strictEqual(pExtraido.apneia, true);
  console.log('✓ Teste 7: Extração de texto livre aprovada');

  // 8. Formatação Telegram
  const textoFormatado = PediatriaBronquioliteService.formatarTextoTelegram(resultGrave);
  assert.ok(textoFormatado.includes('PEDIATRIA — MANEJO DA BRONQUIOLITE VIRAL AGUDA'), 'Header correto');
  assert.ok(textoFormatado.includes('Escore de Wood-Downes Modificado'), 'Exibe score');
  assert.ok(textoFormatado.includes('CNAF'), 'Menciona CNAF');
  assert.ok(textoFormatado.includes('NÃO prescrever Salbutamol'), 'Menciona Choosing Wisely');
  console.log('✓ Teste 8: Formatação de texto aprovada');

  console.log('\n🚀 TODOS OS TESTES DE PEDIATRIA (BRONQUIOLITE VIRAL AGUDA) PASSARAM COM 100% DE SUCESSO!\n');
}

runTests();
