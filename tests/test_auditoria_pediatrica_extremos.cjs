/**
 * ==============================================================================
 * BATERIA DE AUDITORIA CLÍNICA AVANÇADA: CENÁRIOS EXTREMOS DE DOSE E CONVERSÃO PEDIÁTRICA
 * ==============================================================================
 * Cláusula Pétrea de Segurança Clínica:
 * Valida os limites máximos de segurança (teto de dose de adulto), limites
 * inferiores neonatais/lactentes, restrições etárias absolutas de bula,
 * conversões de frascos para cursos terapêuticos e blindagem contra prescrição cega.
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const runtime = require(path.join(ROOT_DIR, 'server', 'runtime.js'));
const Calc = runtime.ctx.CalculadorasClinicas;

console.log('🧪 INICIANDO AUDITORIA CLÍNICA AVANÇADA: CENÁRIOS EXTREMOS DE DOSE PEDIÁTRICA...\n');

let totalTestes = 0;
let aprovados = 0;

function test(nome, fn) {
  totalTestes++;
  try {
    fn();
    aprovados++;
    console.log(`  ✅ [PASS] ${nome}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${nome}:`, err.message);
    throw err;
  }
}

// ==============================================================================
// BATERIA 1: TETOS DE DOSE MÁXIMA DE ADULTO (SAFETY CEILING CLAMPING)
// Em crianças com sobrepeso ou peso elevado, a dose em mg/kg não pode ultrapassar o teto adulto.
// ==============================================================================

test('Bateria 1.1: Amoxicilina — Criança 35 kg atinge teto adulto de 1500 mg/dia', () => {
  // 35 kg * 50 mg/kg = 1750 mg/dia -> Teto adulto é 1500 mg/dia
  const r = Calc.posologiaPediatrica(35, 'amoxicilina');
  assert.ok(r.ok, 'Cálculo deve retornar ok');
  const d = r.dados;
  assert.strictEqual(d.pesoKg, 35);
  assert.strictEqual(d.doseDiariaTotalMg, 1500, 'Dose diária deve ser limitada a 1500 mg');
  assert.strictEqual(d.dosePorTomadaMg, 500, '500 mg por tomada de 8/8h');
  assert.strictEqual(d.volumePorTomadaMl, 10.0, '500 mg / 50 mg/mL = 10.0 mL');
  assert.strictEqual(d.intervaloHoras, 8);
  // Volume total: 10 * 3 * 10 = 300 mL -> 2 frascos de 150 mL
  assert.strictEqual(d.frascosNecessarios, 2);
});

test('Bateria 1.2: Amoxicilina Dose Alta (90 mg/kg) — Criança 25 kg atinge teto adulto de 1500 mg/dia', () => {
  // 25 kg * 90 mg/kg = 2250 mg/dia -> Limitado a 1500 mg/dia
  const r = Calc.posologiaPediatrica(25, 'amoxicilina', { doseAlta: true });
  assert.ok(r.ok);
  const d = r.dados;
  assert.strictEqual(d.doseDiariaTotalMg, 1500);
  assert.strictEqual(d.dosePorTomadaMg, 500);
  assert.strictEqual(d.volumePorTomadaMl, 10.0);
});

test('Bateria 1.3: Amoxicilina + Clavulanato — Criança 35 kg atinge teto adulto e calcula frascos de 75 mL', () => {
  // 35 kg * 50 mg/kg = 1750 mg/dia -> Limitado a 1500 mg/dia (500 mg 8/8h = 10 mL)
  // Volume total 10 dias: 10 * 3 * 10 = 300 mL. Frascos de 75 mL -> 300 / 75 = 4 frascos
  const r = Calc.posologiaPediatrica(35, 'amoxicilina clavulanato');
  assert.ok(r.ok);
  const d = r.dados;
  assert.strictEqual(d.doseDiariaTotalMg, 1500);
  assert.strictEqual(d.volumePorTomadaMl, 10.0);
  assert.strictEqual(d.volumeFrascoMl, 75);
  assert.strictEqual(d.frascosNecessarios, 4, 'Deve dispensar 4 frascos de 75 mL para cobrir os 300 mL');
});

test('Bateria 1.4: Azitromicina — Criança 55 kg atinge teto adulto de 500 mg/dia', () => {
  // 55 kg * 10 mg/kg = 550 mg/dia -> Teto adulto é 500 mg/dia (12.5 mL de 40 mg/mL)
  // Volume total 5 dias: 12.5 * 5 = 62.5 mL. Frascos de 15 mL -> ceil(62.5 / 15) = 5 frascos
  const r = Calc.posologiaPediatrica(55, 'azitromicina');
  assert.ok(r.ok);
  const d = r.dados;
  assert.strictEqual(d.doseDiariaTotalMg, 500);
  assert.strictEqual(d.dosePorTomadaMg, 500);
  assert.strictEqual(d.volumePorTomadaMl, 12.5);
  assert.strictEqual(d.frascosNecessarios, 5);
});

test('Bateria 1.5: Cefalexina — Criança 45 kg atinge teto adulto de 2000 mg/dia', () => {
  // 45 kg * 50 mg/kg = 2250 mg/dia -> Teto adulto é 2000 mg/dia (500 mg 6/6h = 10 mL)
  const r = Calc.posologiaPediatrica(45, 'cefalexina');
  assert.ok(r.ok);
  const d = r.dados;
  assert.strictEqual(d.doseDiariaTotalMg, 2000);
  assert.strictEqual(d.dosePorTomadaMg, 500);
  assert.strictEqual(d.volumePorTomadaMl, 10.0);
  assert.strictEqual(d.intervaloHoras, 6);
  // Volume total 7 dias: 10 * 4 * 7 = 280 mL -> ceil(280 / 100) = 3 frascos
  assert.strictEqual(d.frascosNecessarios, 3);
});

test('Bateria 1.6: Cefalexina Dose Alta (100 mg/kg) — Criança 25 kg atinge teto adulto de 2000 mg/dia', () => {
  // 25 kg * 100 mg/kg = 2500 mg/dia -> Limitado a 2000 mg/dia
  const r = Calc.posologiaPediatrica(25, 'cefalexina', { doseAlta: true });
  assert.ok(r.ok);
  const d = r.dados;
  assert.strictEqual(d.doseDiariaTotalMg, 2000);
  assert.strictEqual(d.volumePorTomadaMl, 10.0);
});

test('Bateria 1.7: Prednisolona — Criança 50 kg atinge teto adulto de 40 mg/dia', () => {
  // 50 kg * 1 mg/kg = 50 mg/dia -> Teto adulto é 40 mg/dia
  // 40 mg / 3 mg/mL = 13.33 -> 13.3 mL
  const r = Calc.posologiaPediatrica(50, 'prednisolona');
  assert.ok(r.ok);
  const d = r.dados;
  assert.strictEqual(d.doseDiariaTotalMg, 40);
  assert.strictEqual(d.dosePorTomadaMg, 40);
  assert.strictEqual(d.volumePorTomadaMl, 13.3);
  assert.strictEqual(d.intervaloHoras, 24);
  // Volume 5 dias: 13.3 * 5 = 66.5 mL -> ceil(66.5 / 60) = 2 frascos de 60 mL
  assert.strictEqual(d.frascosNecessarios, 2);
});

test('Bateria 1.8: Sulfametoxazol + Trimetoprima — Criança 45 kg atinge teto adulto de 320 mg TMP/dia', () => {
  // 45 kg * 8 mg TMP/kg = 360 mg TMP/dia -> Teto é 320 mg TMP/dia
  // 320 / 2 = 160 mg TMP por dose (12/12h). 160 / 8 mg/mL = 20.0 mL
  const r = Calc.posologiaPediatrica(45, 'sulfametoxazol trimetoprima');
  assert.ok(r.ok);
  const d = r.dados;
  assert.strictEqual(d.doseDiariaTotalMg, 320);
  assert.strictEqual(d.dosePorTomadaMg, 160);
  assert.strictEqual(d.volumePorTomadaMl, 20.0);
  assert.strictEqual(d.intervaloHoras, 12);
  // Volume total 10 dias: 20 * 2 * 10 = 400 mL -> 4 frascos de 100 mL
  assert.strictEqual(d.frascosNecessarios, 4);
});

test('Bateria 1.9: Dipirona Gotas — Crianças 45 kg e 60 kg atingem teto de 500 mg (20 gotas)', () => {
  // 45 kg * 12.5 mg/kg = 562.5 mg -> Teto 500 mg = 20 gotas
  const r45 = Calc.posologiaPediatrica(45, 'dipirona');
  assert.ok(r45.ok);
  assert.strictEqual(r45.dados.dosePorTomadaMg, 500);
  assert.strictEqual(r45.dados.gotasPorTomada, 20);

  // 60 kg * 12.5 mg/kg = 750 mg -> Teto 500 mg = 20 gotas
  const r60 = Calc.posologiaPediatrica(60, 'dipirona');
  assert.ok(r60.ok);
  assert.strictEqual(r60.dados.dosePorTomadaMg, 500);
  assert.strictEqual(r60.dados.gotasPorTomada, 20);
});

test('Bateria 1.10: Paracetamol Gotas — Crianças 55 kg e 70 kg atingem teto de 500 mg (50 gotas)', () => {
  // 55 kg * 10 mg/kg = 550 mg -> Teto 500 mg = 50 gotas
  const r55 = Calc.posologiaPediatrica(55, 'paracetamol');
  assert.ok(r55.ok);
  assert.strictEqual(r55.dados.dosePorTomadaMg, 500);
  assert.strictEqual(r55.dados.gotasPorTomada, 50);

  // 70 kg -> Teto 500 mg = 50 gotas
  const r70 = Calc.posologiaPediatrica(70, 'paracetamol');
  assert.ok(r70.ok);
  assert.strictEqual(r70.dados.dosePorTomadaMg, 500);
  assert.strictEqual(r70.dados.gotasPorTomada, 50);
});

test('Bateria 1.11: Ibuprofeno Gotas — Crianças 45 kg e 60 kg atingem teto de 400 mg (160 gotas)', () => {
  // 45 kg * 10 mg/kg = 450 mg -> Teto 400 mg = 160 gotas (400 mg / 2.5 mg/gota)
  const r45 = Calc.posologiaPediatrica(45, 'ibuprofeno');
  assert.ok(r45.ok);
  assert.strictEqual(r45.dados.dosePorTomadaMg, 400);
  assert.strictEqual(r45.dados.gotasPorTomada, 160);

  // 60 kg -> Teto 400 mg = 160 gotas
  const r60 = Calc.posologiaPediatrica(60, 'ibuprofeno');
  assert.ok(r60.ok);
  assert.strictEqual(r60.dados.dosePorTomadaMg, 400);
  assert.strictEqual(r60.dados.gotasPorTomada, 160);
});

// ==============================================================================
// BATERIA 2: LIMITES INFERIORES E PROTEÇÃO NEONATAL / LACTENTES
// ==============================================================================

test('Bateria 2.1: Dipirona Gotas em lactente pequeno (1.5 kg e 2 kg) — Gota mínima de segurança', () => {
  // 1.5 kg / 2 = 0.75 gota -> Arredonda para 1 gota mínima
  const r = Calc.posologiaPediatrica(1.5, 'dipirona');
  assert.ok(r.ok);
  assert.strictEqual(r.dados.gotasPorTomada, 1, 'Deve garantir no mínimo 1 gota');
  assert.strictEqual(r.dados.dosePorTomadaMg, 18.75);
});

test('Bateria 2.2: Paracetamol Gotas em lactente pequeno (1.2 kg) — Gota mínima de segurança', () => {
  // 1.2 kg * 10 mg/kg = 12 mg -> 12 / 10 = 1.2 gotas -> 1 gota
  const r = Calc.posologiaPediatrica(1.2, 'paracetamol');
  assert.ok(r.ok);
  assert.strictEqual(r.dados.gotasPorTomada, 1, 'Deve garantir no mínimo 1 gota');
});

test('Bateria 2.3: Amoxicilina em lactente de 2 kg — Volume fracionado seguro sem zerar', () => {
  // 2 kg * 50 mg/kg = 100 mg/dia -> 33.3 mg de 8/8h -> 33.3 / 50 = 0.66 mL -> 0.7 mL
  const r = Calc.posologiaPediatrica(2, 'amoxicilina');
  assert.ok(r.ok);
  assert.strictEqual(r.dados.doseDiariaTotalMg, 100);
  assert.strictEqual(r.dados.volumePorTomadaMl, 0.7);
  assert.ok(r.dados.volumePorTomadaMl >= 0.5, 'Volume nunca deve ser inferior a 0.5 mL');
});

test('Bateria 2.4: Proteção contra pesos inválidos e fora da faixa pediátrica (1 a 80 kg)', () => {
  // Peso 0 ou negativo
  assert.strictEqual(Calc.posologiaPediatrica(0, 'amoxicilina').ok, false);
  assert.strictEqual(Calc.posologiaPediatrica(-5, 'amoxicilina').ok, false);

  // Peso abaixo de 1 kg (extremo prematuro - requer UTI neonatal e individualização absoluta)
  assert.strictEqual(Calc.posologiaPediatrica(0.5, 'amoxicilina').ok, false);

  // Peso acima de 80 kg (deve ser conduzido com esquema de adulto, não pediátrico)
  assert.strictEqual(Calc.posologiaPediatrica(85, 'amoxicilina').ok, false);
  assert.strictEqual(Calc.posologiaPediatrica(100, 'amoxicilina').ok, false);
});

// ==============================================================================
// BATERIA 3: RESTRIÇÕES ETÁRIAS ABSOLUTAS DE BULA (CONTRAINDICAÇÕES ESTRITAS)
// ==============================================================================

test('Bateria 3.1: Albendazol — Contraindicado em menores de 2 anos; dose fixa 400 mg para >= 2 anos', () => {
  // < 2 anos: ERRO DE SEGURANÇA
  const rMenor2 = Calc.posologiaPediatrica(10, 'albendazol', { idadeAnos: 1 });
  assert.strictEqual(rMenor2.ok, false, 'Deve bloquear albendazol para < 2 anos');

  // >= 2 anos: Dose fixa de 400 mg (10 mL) independente de peso
  const rMaior2 = Calc.posologiaPediatrica(15, 'albendazol', { idadeAnos: 3 });
  assert.ok(rMaior2.ok);
  assert.strictEqual(rMaior2.dados.dosePorTomadaMg, 400);
  assert.strictEqual(rMaior2.dados.volumePorTomadaMl, 10);
  assert.strictEqual(rMaior2.dados.frascosNecessarios, 1);
});

test('Bateria 3.2: Mebendazol — Contraindicado em menores de 2 anos; 100 mg 12/12h para >= 2 anos', () => {
  // < 2 anos: ERRO DE SEGURANÇA
  const rMenor2 = Calc.posologiaPediatrica(11, 'mebendazol', { idadeAnos: 1 });
  assert.strictEqual(rMenor2.ok, false, 'Deve bloquear mebendazol para < 2 anos');

  // >= 2 anos: 100 mg (5 mL) 12/12h por 3 dias
  const rMaior2 = Calc.posologiaPediatrica(16, 'mebendazol', { idadeAnos: 4 });
  assert.ok(rMaior2.ok);
  assert.strictEqual(rMaior2.dados.dosePorTomadaMg, 100);
  assert.strictEqual(rMaior2.dados.volumePorTomadaMl, 5);
  assert.strictEqual(rMaior2.dados.intervaloHoras, 12);
  assert.strictEqual(rMaior2.dados.diasTratamento, 3);
  assert.strictEqual(rMaior2.dados.frascosNecessarios, 1);
});

test('Bateria 3.3: Nitazoxanida — Contraindicado em menores de 1 ano; faixas etárias de bula', () => {
  // < 1 ano: ERRO DE SEGURANÇA
  const rMenor1 = Calc.posologiaPediatrica(8, 'nitazoxanida', { idadeAnos: 0.5 });
  assert.strictEqual(rMenor1.ok, false, 'Deve bloquear nitazoxanida para < 1 ano');

  // 1 a 3 anos: 100 mg (5 mL) 12/12h por 3 dias
  const rFaixa1 = Calc.posologiaPediatrica(12, 'nitazoxanida', { idadeAnos: 2 });
  assert.ok(rFaixa1.ok);
  assert.strictEqual(rFaixa1.dados.dosePorTomadaMg, 100);
  assert.strictEqual(rFaixa1.dados.volumePorTomadaMl, 5);
  assert.strictEqual(rFaixa1.dados.frascosNecessarios, 1); // 5 * 2 * 3 = 30 mL <= 100 mL

  // 4 a 11 anos: 200 mg (10 mL) 12/12h por 3 dias
  const rFaixa2 = Calc.posologiaPediatrica(22, 'nitazoxanida', { idadeAnos: 6 });
  assert.ok(rFaixa2.ok);
  assert.strictEqual(rFaixa2.dados.dosePorTomadaMg, 200);
  assert.strictEqual(rFaixa2.dados.volumePorTomadaMl, 10);
  assert.strictEqual(rFaixa2.dados.frascosNecessarios, 1); // 10 * 2 * 3 = 60 mL <= 100 mL

  // >= 12 anos: 500 mg (25 mL) 12/12h por 3 dias
  const rFaixa3 = Calc.posologiaPediatrica(45, 'nitazoxanida', { idadeAnos: 14 });
  assert.ok(rFaixa3.ok);
  assert.strictEqual(rFaixa3.dados.dosePorTomadaMg, 500);
  assert.strictEqual(rFaixa3.dados.volumePorTomadaMl, 25);
  // Volume total: 25 * 2 * 3 = 150 mL -> 2 frascos de 100 mL
  assert.strictEqual(rFaixa3.dados.frascosNecessarios, 2);
});

test('Bateria 3.4: Loratadina — Faixas de peso/idade (5 mg se <= 30 kg; 10 mg se > 30 kg ou > 12 anos)', () => {
  // Menor de 2 anos: bloqueado
  const rMenor2 = Calc.posologiaPediatrica(10, 'loratadina', { idadeAnos: 1 });
  assert.strictEqual(rMenor2.ok, false);

  // 5 anos, 20 kg (<= 30 kg): 5 mg (5 mL)
  const rAte30 = Calc.posologiaPediatrica(20, 'loratadina', { idadeAnos: 5 });
  assert.ok(rAte30.ok);
  assert.strictEqual(rAte30.dados.dosePorTomadaMg, 5);
  assert.strictEqual(rAte30.dados.volumePorTomadaMl, 5);

  // 9 anos, 35 kg (> 30 kg): 10 mg (10 mL)
  const rMais30 = Calc.posologiaPediatrica(35, 'loratadina', { idadeAnos: 9 });
  assert.ok(rMais30.ok);
  assert.strictEqual(rMais30.dados.dosePorTomadaMg, 10);
  assert.strictEqual(rMais30.dados.volumePorTomadaMl, 10);

  // 14 anos (> 12 anos): 10 mg (10 mL)
  const rMais12a = Calc.posologiaPediatrica(28, 'loratadina', { idadeAnos: 14 });
  assert.ok(rMais12a.ok);
  assert.strictEqual(rMais12a.dados.dosePorTomadaMg, 10);
  assert.strictEqual(rMais12a.dados.volumePorTomadaMl, 10);
});

test('Bateria 3.5: Dexclorfeniramina — Faixas de idade oficial (2-6a: 1.25 mL; 6-12a: 2.5 mL; >12a: 5.0 mL)', () => {
  // Menor de 2 anos: bloqueado
  assert.strictEqual(Calc.posologiaPediatrica(10, 'dexclorfeniramina', { idadeAnos: 1 }).ok, false);

  // 3 anos (2 a 6 anos): 1.25 mL 8/8h
  const r2a6 = Calc.posologiaPediatrica(14, 'dexclorfeniramina', { idadeAnos: 3 });
  assert.ok(r2a6.ok);
  assert.strictEqual(r2a6.dados.volumePorTomadaMl, 1.25);
  assert.strictEqual(r2a6.dados.dosePorTomadaMg, 0.5);

  // 8 anos (6 a 12 anos): 2.5 mL 8/8h
  const r6a12 = Calc.posologiaPediatrica(25, 'dexclorfeniramina', { idadeAnos: 8 });
  assert.ok(r6a12.ok);
  assert.strictEqual(r6a12.dados.volumePorTomadaMl, 2.5);
  assert.strictEqual(r6a12.dados.dosePorTomadaMg, 1.0);

  // 14 anos (> 12 anos): 5.0 mL 8/8h
  const rMais12 = Calc.posologiaPediatrica(40, 'dexclorfeniramina', { idadeAnos: 14 });
  assert.ok(rMais12.ok);
  assert.strictEqual(rMais12.dados.volumePorTomadaMl, 5.0);
  assert.strictEqual(rMais12.dados.dosePorTomadaMg, 2.0);
});

// ==============================================================================
// BATERIA 4: CONVERSÕES DE FRASCOS E TRATAMENTOS PROLONGADOS
// ==============================================================================

test('Bateria 4.1: Amoxicilina 14 kg com Otite em dose alta por 14 dias — Dispensa 3 frascos de 150 mL', () => {
  // 14 kg * 90 mg/kg = 1260 mg/dia -> 420 mg de 8/8h -> 8.4 mL
  // Volume total 14 dias: 8.4 * 3 * 14 = 352.8 mL -> ceil(352.8 / 150) = 3 frascos
  const r = Calc.posologiaPediatrica(14, 'amoxicilina', { doseAlta: true, diasTratamento: 14 });
  assert.ok(r.ok);
  const d = r.dados;
  assert.strictEqual(d.volumePorTomadaMl, 8.4);
  assert.strictEqual(d.diasTratamento, 14);
  assert.strictEqual(d.volumeTotalTratamentoMl, 352.8);
  assert.strictEqual(d.frascosNecessarios, 3);
});

test('Bateria 4.2: Azitromicina 15 kg — Tratamento de 3 dias vs 5 dias', () => {
  // 15 kg * 10 mg/kg = 150 mg/dia -> 3.8 mL de 24/24h
  // 3 dias: 3.8 * 3 = 11.4 mL -> 1 frasco de 15 mL
  const r3d = Calc.posologiaPediatrica(15, 'azitromicina', { diasTratamento: 3 });
  assert.ok(r3d.ok);
  assert.strictEqual(r3d.dados.frascosNecessarios, 1);

  // 5 dias: 3.8 * 5 = 19.0 mL -> 2 frascos de 15 mL
  const r5d = Calc.posologiaPediatrica(15, 'azitromicina', { diasTratamento: 5 });
  assert.ok(r5d.ok);
  assert.strictEqual(r5d.dados.frascosNecessarios, 2);
});

test('Bateria 4.3: Cefalexina 15 kg por 10 dias em Impetigo extenso — Dispensa 2 frascos de 100 mL', () => {
  // 15 kg * 50 mg/kg = 750 mg/dia -> 187.5 mg de 6/6h -> 3.8 mL por tomada
  // Volume total 10 dias: 3.8 * 4 * 10 = 152 mL -> ceil(152 / 100) = 2 frascos
  const r = Calc.posologiaPediatrica(15, 'cefalexina', { diasTratamento: 10 });
  assert.ok(r.ok);
  assert.strictEqual(r.dados.volumePorTomadaMl, 3.8);
  assert.strictEqual(r.dados.frascosNecessarios, 2);
});

// ==============================================================================
// BATERIA 5: EXTRAÇÃO EM LINGUAGEM NATURAL E BLINDAGEM CONTRA PRESCRIÇÃO CEGA
// ==============================================================================

test('Bateria 5.1: Suporte a separadores decimais (vírgula e ponto)', () => {
  const cPonto = Calc.calcularPosologiaPorTextoLivre('amoxicilina crianca 12.5kg');
  assert.ok(cPonto);
  assert.strictEqual(cPonto.pesoKg, 12.5);

  const cVirgula = Calc.calcularPosologiaPorTextoLivre('amoxicilina crianca 12,5 kg');
  assert.ok(cVirgula);
  assert.strictEqual(cVirgula.pesoKg, 12.5);
});

test('Bateria 5.2: Blindagem contra prescrição cega em textos ambíguos ou com contraindicações', () => {
  // Alergia mencionada: NUNCA prescrever automaticamente
  assert.strictEqual(Calc.calcularPosologiaPorTextoLivre('alergia a amoxicilina crianca 15kg'), null);

  // Negação: NUNCA prescrever
  assert.strictEqual(Calc.calcularPosologiaPorTextoLivre('não prescrever amoxicilina 20kg'), null);

  // Conflito de peso / correção no texto: NUNCA adivinhar
  assert.strictEqual(Calc.calcularPosologiaPorTextoLivre('amoxicilina 10kg, quer dizer 15kg'), null);

  // Sintoma isolado sem medicamento: NUNCA prescrever tratamento cego
  assert.strictEqual(Calc.calcularPosologiaPorTextoLivre('crianca 14kg com tosse e febre'), null);
});

// ==============================================================================
// BATERIA 6: INTEGRAÇÃO E VALIDAÇÃO COM O GUIA PEDIÁTRICO PEDBOOK (pedb.com.br)
// ==============================================================================

test('Bateria 6.1: Validação de fármacos essenciais pediátricos no PedBook', () => {
  const farmacosEssenciais = ['salbutamol', 'diazepam', 'ceftriaxona', 'adrenalina', 'paracetamol', 'dipirona'];
  for (const f of farmacosEssenciais) {
    const med = runtime.ctx.buscarMedicamentoPediatricoPedB(f);
    assert.ok(med, `Fármaco essencial '${f}' deve existir na base PedBook em RAM`);
    assert.ok(med.apresentacoes.length > 0, `'${f}' deve ter apresentações cadastradas`);
    assert.ok(med.posologias.length > 0, `'${f}' deve ter posologias cadastradas`);
  }
});

test('Bateria 6.2: Validação de protocolos de emergência e condutas no PedBook', () => {
  const condutasEssenciais = ['bronquiolite', 'asma', 'convulsao febril', 'laringite'];
  for (const c of condutasEssenciais) {
    const cond = runtime.ctx.buscarCondutaPediatricaPedB(c);
    assert.ok(cond, `Conduta '${c}' deve existir na base de Condutas PedBook em RAM`);
    assert.ok(cond.titulo, `Conduta '${c}' deve ter título oficial`);
    const texto = cond.conteudo_tratamento || cond.conteudo_diagnostico || cond.conteudo_introducao || '';
    assert.ok(texto.length > 50, `Conduta '${c}' deve ter texto clínico detalhado`);
  }
});

console.log('\n==============================================================================');
console.log(`🎉 AUDITORIA AVANÇADA CONCLUÍDA: ${aprovados}/${totalTestes} CASOS CLÍNICOS EXTREMOS APROVADOS (100% SUCESSO)!`);
console.log('==============================================================================\n');
