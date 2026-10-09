/**
 * ==============================================================================
 * BATERIA DE AUDITORIA CLÍNICA: INFUSÕES CONTÍNUAS DE UTI
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const runtime = require(path.join(ROOT_DIR, 'server', 'runtime.js'));
const AuditoriaUti = runtime.ctx.AuditoriaInfusaoUtiService;

console.log('🧪 INICIANDO BATERIA: AUDITORIA DE INFUSÕES DE UTI...\n');

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

// 1. Testes de Auditoria de Vazão (mL/h -> mcg/kg/min)
test('Auditoria: Noradrenalina Padrão 70kg a 10 mL/h', () => {
  const r = AuditoriaUti.auditarVazaoBomba({
    droga: 'noradrenalina',
    pesoKg: 70,
    solucaoOuConc: 'padrao', // 64 mcg/mL
    vazaoMlH: 10
  });
  assert.ok(r.dose_entregue >= 0.15 && r.dose_entregue <= 0.16);
  assert.strictEqual(r.nome_droga, 'Noradrenalina (Norepinefrina)');
});

test('Auditoria: Noradrenalina Concentrada 80kg a 15 mL/h', () => {
  const r = AuditoriaUti.auditarVazaoBomba({
    droga: 'noradrenalina',
    pesoKg: 80,
    solucaoOuConc: 'concentrada', // 128 mcg/mL
    vazaoMlH: 15
  });
  assert.strictEqual(Math.round(r.dose_entregue * 100) / 100, 0.4);
});

test('Auditoria: Adrenalina Concentrada em dose tóxica', () => {
  const r = AuditoriaUti.auditarVazaoBomba({
    droga: 'adrenalina',
    pesoKg: 60,
    solucaoOuConc: 'concentrada', // 32 mcg/mL
    vazaoMlH: 200 // dose = 1.77 mcg/kg/min -> toxica
  });
  assert.ok(r.status_seguranca && (r.status_seguranca.indexOf('TOXICIDADE') !== -1 || r.status_seguranca.indexOf('LETAL') !== -1 || r.status_seguranca.indexOf('CRÍTICO') !== -1 || r.status_seguranca.indexOf('TÓXICO') !== -1));
});

// 2. Testes de Cálculo de Vazão Segura (mcg/kg/min -> mL/h)
test('Cálculo: Noradrenalina Padrão 70kg para alvo 0.1 mcg/kg/min', () => {
  const r = AuditoriaUti.calcularVazaoSegura({
    droga: 'noradrenalina',
    pesoKg: 70,
    solucao: 'padrao',
    doseAlvo: 0.1
  });
  assert.strictEqual(r.vazao_ml_h, 6.6); // Arredondado para 1 casa
});

test('Cálculo: Vasopressina Fixa para alvo 0.03 UI/min', () => {
  const r = AuditoriaUti.calcularVazaoSegura({
    droga: 'vasopressina',
    pesoKg: 70, 
    solucao: 'padrao', 
    doseAlvo: 0.03
  });
  assert.strictEqual(r.vazao_ml_h, 9);
});

// 3. Múltiplas Infusões
test('Auditoria Múltipla: Sinergismo Nora + Vaso', () => {
  const r = AuditoriaUti.auditarPrescricaoMultipla({
    pesoKg: 70,
    infusoes: [
      { droga: 'noradrenalina', vazaoMlH: 20 }, 
      { droga: 'vasopressina', vazaoMlH: 9 }
    ]
  });
  assert.strictEqual(r.total_infusoes, 2);
  assert.ok(r.suporte_vasoativo_pesado === false);
});

test('Auditoria Múltipla: Alerta de Incompatibilidade de Bicarbonato', () => {
  const r = AuditoriaUti.auditarPrescricaoMultipla({
    pesoKg: 70,
    infusoes: [
      { droga: 'noradrenalina', vazaoMlH: 10 }
    ],
    solucoes_concomitantes: ['Bicarbonato de Sodio 8.4%']
  });
  assert.ok(r.alertas_globais.some(a => a.indexOf('CONTRAINDICAÇÃO ABSOLUTA') !== -1));
});

console.log(`\n✅ RESULTADO: ${aprovados}/${totalTestes} testes aprovados.`);
if (aprovados !== totalTestes) {
  process.exit(1);
}
