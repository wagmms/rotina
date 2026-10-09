const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

// Carregar o código fonte
const srcPath = path.join(__dirname, '../src/02_pediatria_bronquiolite.js');
const srcCode = fs.readFileSync(srcPath, 'utf8');

// Preparar ambiente de execução (sandbox)
const sandbox = { module: {} };
vm.createContext(sandbox);
vm.runInContext(srcCode, sandbox);

const PediatriaBronquioliteService = sandbox.module.exports || sandbox.PediatriaBronquioliteService;

function runTests() {
  console.log('Iniciando testes de Pediatria - Bronquiolite Viral Aguda...');

  // Teste 1: Bronquiolite Leve
  const resultLeve = PediatriaBronquioliteService.avaliar({
    idadeMeses: 6,
    pesoKg: 8,
    fr: 35,
    spo2: 97,
    sibilos: 1,
    tiragem: 1
  });
  assert.strictEqual(resultLeve.gravidade.classificacao, 'Leve');
  assert.strictEqual(resultLeve.gravidade.internacaoUTI, false);
  assert.strictEqual(resultLeve.gravidade.riscoBroncoaspiracao, false);
  
  // Teste 2: Bronquiolite Moderada (queda de SpO2)
  const resultMod = PediatriaBronquioliteService.avaliar({
    idadeMeses: 4,
    pesoKg: 6,
    fr: 45,
    spo2: 94, // Cai para moderada
    sibilos: 1,
    tiragem: 1
  });
  assert.strictEqual(resultMod.gravidade.classificacao, 'Moderada');
  assert.strictEqual(resultMod.gravidade.internacaoUTI, false);
  assert.strictEqual(resultMod.gravidade.riscoBroncoaspiracao, false);

  // Teste 3: Bronquiolite Grave (UTI, risco de aspiração)
  const resultGrave = PediatriaBronquioliteService.avaliar({
    idadeMeses: 2,
    pesoKg: 5,
    fr: 75,
    spo2: 88,
    exaustao: true,
    sibilos: 3,
    tiragem: 3
  });
  assert.strictEqual(resultGrave.gravidade.classificacao, 'Grave');
  assert.strictEqual(resultGrave.gravidade.internacaoUTI, true);
  assert.strictEqual(resultGrave.gravidade.riscoBroncoaspiracao, true);

  // Teste de extração de parâmetros
  const paramsStr = "bronquiolite 3 meses 6kg fr 65 spo2 89 exaustao";
  const paramsExt = PediatriaBronquioliteService.extrairParametrosTexto(paramsStr);
  assert.strictEqual(paramsExt.idadeMeses, 3);
  assert.strictEqual(paramsExt.pesoKg, 6);
  assert.strictEqual(paramsExt.fr, 65);
  assert.strictEqual(paramsExt.spo2, 89);
  assert.strictEqual(paramsExt.exaustao, true);

  console.log('✅ Todos os testes de Pediatria - Bronquiolite Viral Aguda passaram!');
}

runTests();
