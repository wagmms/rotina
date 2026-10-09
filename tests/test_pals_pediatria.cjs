const assert = require('assert');
const PalsPediatriaService = require('../src/02_pals_pediatria.js');

function runTests() {
  console.log("=== INICIANDO TESTES PALS PEDIATRIA ===");

  // Teste 1: Peso 10kg direto
  let res1 = PalsPediatriaService.avaliarPals({ pesoKg: 10, idadeAnos: 1 });
  assert.strictEqual(res1.pesoConsideradoKg, 10, "O peso considerado deve ser 10kg");
  assert.strictEqual(res1.eletricidade.desfibrilacaoPrimeiroChoque, '20 J (2 J/kg)', "Choque desfibrilação errado");
  assert.strictEqual(res1.medicacoes[0].farmaco, "Adrenalina 0,1 mg/mL (1:10.000)");
  assert.strictEqual(res1.medicacoes[0].doseMg, '0.10 mg');
  assert.strictEqual(res1.medicacoes[0].volumeMl, '1.0 mL');
  assert.strictEqual(res1.medicacoes[1].farmaco, "Amiodarona (50 mg/mL)");
  assert.strictEqual(res1.medicacoes[1].doseMg, '50 mg');
  assert.strictEqual(res1.medicacoes[1].volumeMl, '1.0 mL');

  // Teste 2: Peso > 50kg (teto pediátrico)
  let res2 = PalsPediatriaService.avaliarPals({ pesoKg: 60, idadeAnos: 12 });
  assert.strictEqual(res2.pesoConsideradoKg, 50, "Deve limitar a 50kg");
  assert.strictEqual(res2.eletricidade.desfibrilacaoPrimeiroChoque, '100 J (2 J/kg)');
  assert.strictEqual(res2.medicacoes[0].doseMg, '0.50 mg');

  // Teste 3: Estimativa de peso por idade
  let res3 = PalsPediatriaService.avaliarPals({ idadeAnos: 5 });
  assert.strictEqual(res3.pesoConsideradoKg, 18, "Idade 5 anos deve gerar peso de 18kg");
  assert.strictEqual(res3.eletricidade.desfibrilacaoPrimeiroChoque, '36 J (2 J/kg)');
  
  // Teste 4: Lactente
  let res4 = PalsPediatriaService.avaliarPals({ idadeAnos: 0.5 }); // 6 meses
  assert.strictEqual(res4.pesoConsideradoKg, 5, "Idade < 1 ano deve gerar 5kg se não informar peso");
  assert.strictEqual(res4.viaAerea.tuboSemCuff, "3.5");
  assert.strictEqual(res4.viaAerea.tuboComCuff, "3.0");

  // Teste 5: Broselow
  let res5 = PalsPediatriaService.avaliarPals({ corBroselow: 'Rosa' });
  assert.strictEqual(res5.pesoConsideradoKg, 6.5, "Cor rosa na fita de Broselow deve estimar 6.5kg");
  assert.strictEqual(res5.eletricidade.desfibrilacaoPrimeiroChoque, '13 J (2 J/kg)');

  console.log("=== TODOS OS TESTES PALS PEDIATRIA PASSARAM COM SUCESSO ===");
}

runTests();
