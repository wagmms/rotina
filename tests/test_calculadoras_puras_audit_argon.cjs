/**
 * ==============================================================================
 * BATERIA DE AUDITORIA CLÍNICA & HARDENING: CALCULADORAS PURAS (GEMINI 4 ARGON)
 * ==============================================================================
 * Certifica as correções dos bugs de execução, tetos de segurança toxicológica,
 * limites fisiológicos e compatibilidade de campos opcionais em CalculadorasClinicas.
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const runtime = require(path.join(ROOT_DIR, 'server', 'runtime.js'));
const Calc = runtime.ctx.CalculadorasClinicas;

console.log('🧪 INICIANDO TESTES DE AUDITORIA CLÍNICA ARGON (CalculadorasClinicas)...\n');

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

// --------------------------------------------------------------------------
// 1. SUPORTE A CAMPOS OPCIONAIS EM bool() (CHA2DS2-VASc e MELD)
// --------------------------------------------------------------------------
test('1.1: CHA2DS2-VASc sem o 8º argumento opcional (scFeminino omitido)', () => {
  const r = Calc.cha2ds2vasc(true, true, false, false, false, false, false);
  assert.strictEqual(r.ok, true, 'CHA2DS2-VASc deve ser calculado mesmo sem scFeminino');
  assert.strictEqual(r.estado, 'ANTICOAGULAÇÃO FORTEMENTE RECOMENDADA');
  assert.ok(r.texto.includes('CHA₂DS₂-VASc'), 'Texto deve conter nome do escore');
});

test('1.2: MELD sem o argumento opcional de diálise recente', () => {
  const r = Calc.meld(1.5, 1.2, 1.1, 138);
  assert.strictEqual(r.ok, true, 'MELD deve ser calculado com dialiseRecente omitida');
  assert.strictEqual(r.dados.meld, 11);
});

// --------------------------------------------------------------------------
// 2. FALHA LIMPA EM VEZ DE ReferenceError (falhaCtx vs entradaInvalida)
// --------------------------------------------------------------------------
test('2.1: Posologia Pediátrica com peso inválido retorna falhaCtx estruturada', () => {
  const r = Calc.posologiaPediatrica(-5, 'amoxicilina');
  assert.strictEqual(r.ok, false, 'Deve retornar ok = false');
  assert.strictEqual(r.estado, 'NÃO CALCULADO');
  assert.ok(r.erros.some(e => e.includes('Peso (kg)')), 'Deve conter erro explícito de peso');
  assert.strictEqual(r.texto.includes('E_POSOLOGIA_PEDIATRICA_ENTRADAINVALIDAISNOTDEFI'), false, 'Não deve vazar ReferenceError opaco');
});

test('2.2: Posologia Pediátrica com fármaco não especificado', () => {
  const r = Calc.posologiaPediatrica(15, 'sintomas de dor');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.estado, 'INCOMPLETO');
  assert.ok(r.faltas.some(f => f.includes('medicamento explícito')), 'Deve exigir medicamento explícito');
});

// --------------------------------------------------------------------------
// 3. PROTEÇÃO DE COMPARADORES CONTRA IDADE NULA
// --------------------------------------------------------------------------
test('3.1: Nitazoxanida com peso 40 kg e idade nula não pode receber dose de lactente', () => {
  const r = Calc.posologiaPediatrica(40, 'nitazoxanida');
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.dados.dosePorTomadaMg, 500, 'Paciente de 40 kg deve receber 500 mg (faixa >= 12 anos)');
  assert.strictEqual(r.dados.volumePorTomadaMl, 25);
});

test('3.2: Loratadina com peso 35 kg e idade nula recebe 10 mL (teto >= 30 kg)', () => {
  const r = Calc.posologiaPediatrica(35, 'loratadina');
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.dados.volumePorTomadaMl, 10);
  assert.strictEqual(r.dados.dosePorTomadaMg, 10);
});

test('3.3: Dexclorfeniramina com peso 30 kg e idade nula recebe dose adequada', () => {
  const r = Calc.posologiaPediatrica(30, 'dexclorfeniramina');
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.dados.volumePorTomadaMl, 2.5); // faixa intermediária 22 a 40 kg
});

// --------------------------------------------------------------------------
// 4. PRESCRIÇÃO CORRETA DE IBUPROFENO GOTAS (50 mg/mL, 10 gotas/mL -> 1 gota = 5 mg)
// --------------------------------------------------------------------------
test('4.1: Ibuprofeno gotas 15 kg prescreve 2 gotas/kg (30 gotas = 150 mg = 10 mg/kg)', () => {
  const r = Calc.posologiaPediatrica(15, 'ibuprofeno');
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.dados.gotasPorTomada, 30, '15 kg * 2 gotas/kg = 30 gotas');
  assert.strictEqual(r.dados.dosePorTomadaMg, 150, '30 gotas * 5 mg = 150 mg');
  assert.ok(r.dados.instrucaoPosologica.includes('30 gotas'));
});

// --------------------------------------------------------------------------
// 5. TETO TOXICOLÓGICO EM SRI PARA OBESOS MÓRBIDOS
// --------------------------------------------------------------------------
test('5.1: SRI em paciente de 180 kg respeita teto de 200 mg de Succinilcolina e 120 mg de Rocurônio', () => {
  const r = Calc.sequenciaRapidaIntubacao(180, 'padrao');
  assert.strictEqual(r.ok, true);
  assert.ok(r.texto.includes('Succinilcolina (10 mg/mL · 1,5 mg/kg): 200 mg → 20,0 mL IV'), 'Succinilcolina travada em 200 mg');
  assert.ok(r.texto.includes('Rocurônio (10 mg/mL · 1,2 mg/kg): 120,0 mg → 12,0 mL IV'), 'Rocurônio travado em 120 mg');
});

// --------------------------------------------------------------------------
// 6. AMOXICILINA DOSE ALTA (TETO 3000 mg/dia)
// --------------------------------------------------------------------------
test('6.1: Amoxicilina dose alta para criança de 25 kg não corta em 1500 mg', () => {
  const r = Calc.posologiaPediatrica(25, 'amoxicilina', { doseAlta: true });
  assert.strictEqual(r.ok, true);
  // 25 kg * 90 mg/kg/dia = 2250 mg/dia (deve permitir 2250 mg pois teto é 3000 mg)
  assert.strictEqual(r.dados.doseDiariaTotalMg, 2250, 'Deve calcular 2250 mg/dia para 25 kg em dose alta');
  assert.strictEqual(r.dados.dosePorTomadaMg, 750);
});

console.log('\n==============================================================================');
console.log(`🎉 AUDITORIA CLÍNICA ARGON: ${aprovados}/${totalTestes} CASOS APROVADOS COM 100% DE SUCESSO!`);
console.log('==============================================================================\n');
