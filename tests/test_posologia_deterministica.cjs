/**
 * ==============================================================================
 * BATERIA DE AUDITORIA CLÍNICA: POSOLOGIA DETERMINÍSTICA (ZERO ALUCINAÇÃO)
 * ==============================================================================
 * Valida a exatidão matemática e farmacológica das fórmulas fixas de posologia
 * pediátrica integradas ao Guia Farmacêutico HSL e REMUME.
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const runtime = require(path.join(ROOT_DIR, 'server', 'runtime.js'));
const Calc = runtime.ctx.CalculadorasClinicas;

console.log('🧪 INICIANDO AUDITORIA CLÍNICA DE POSOLOGIA DETERMINÍSTICA...\n');

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
// 1. AMOXICILINA — AMIGDALITE BACTERIANA PADRÃO (50 mg/kg/dia de 8/8h por 10 dias)
// --------------------------------------------------------------------------
test('Caso 1: Amoxicilina 16 kg (Amigdalite/Faringite 50 mg/kg/dia)', () => {
  const r = Calc.posologiaPediatrica(16, 'amoxicilina');
  assert.ok(r.ok, 'Cálculo deve retornar sucesso');
  const d = r.dados;
  assert.strictEqual(d.farmaco, 'Amoxicilina');
  assert.strictEqual(d.pesoKg, 16);
  assert.strictEqual(d.doseDiariaTotalMg, 800); // 16 * 50 = 800 mg
  assert.strictEqual(d.volumePorTomadaMl, 5.3); // 266.67 mg / 50 mg/mL = 5.33 mL -> 5.3 mL
  assert.strictEqual(d.intervaloHoras, 8);
  assert.strictEqual(d.diasTratamento, 10);
  assert.strictEqual(d.frascosNecessarios, 2); // 5.3 * 3 * 10 = 159 mL -> 2 frascos de 150 mL
  assert.ok(d.instrucaoPosologica.includes('5,3 mL'), 'Instrução deve conter 5,3 mL');
});

// --------------------------------------------------------------------------
// 2. AMOXICILINA — DOSE ALTA (90 mg/kg/dia) & AMOXI+CLAVULANATO
// --------------------------------------------------------------------------
test('Caso 2A: Amoxicilina pura 14 kg em Dose alta (90 mg/kg/dia)', () => {
  const r = Calc.posologiaPediatrica(14, 'amoxicilina', { doseAlta: true });
  assert.ok(r.ok);
  const d = r.dados;
  assert.strictEqual(d.farmaco, 'Amoxicilina');
  assert.strictEqual(d.doseDiariaTotalMg, 1260); // 14 * 90 = 1260 mg
  assert.strictEqual(d.dosePorTomadaMg, 420); // 1260 / 3 = 420 mg
  assert.strictEqual(d.volumePorTomadaMl, 8.4); // 420 / 50 = 8.4 mL
  assert.strictEqual(d.volumeFrascoMl, 150);
  assert.strictEqual(d.frascosNecessarios, 2); // 8.4 * 3 * 10 = 252 mL / 150 mL = 1.68 -> 2 frascos
});

test('Caso 2B: Amoxicilina + Clavulanato 14 kg em Otite (frasco 75 mL REMUME)', () => {
  const r = Calc.posologiaPediatrica(14, 'otite amoxicilina clavulanato', { doseAlta: true });
  assert.ok(r.ok);
  const d = r.dados;
  assert.strictEqual(d.farmaco, 'Amoxicilina + Clavulanato de Potássio');
  assert.strictEqual(d.volumeFrascoMl, 75);
  assert.strictEqual(d.frascosNecessarios, 4); // 252 mL / 75 mL = 3.36 -> 4 frascos obrigatórios
});

// --------------------------------------------------------------------------
// 3. AZITROMICINA — ALERGIA A PENICILINA (10 mg/kg/dia 1x/dia por 5 dias)
// --------------------------------------------------------------------------
test('Caso 3: Azitromicina 18 kg (Alergia a penicilina 10 mg/kg/dia)', () => {
  const r = Calc.posologiaPediatrica(18, 'azitromicina');
  assert.ok(r.ok);
  const d = r.dados;
  assert.strictEqual(d.doseDiariaTotalMg, 180); // 18 * 10 = 180 mg
  assert.strictEqual(d.volumePorTomadaMl, 4.5); // 180 mg / 40 mg/mL = 4.5 mL
  assert.strictEqual(d.intervaloHoras, 24);
  assert.strictEqual(d.diasTratamento, 5);
  assert.strictEqual(d.frascosNecessarios, 2); // 4.5 * 5 = 22.5 mL -> 2 frascos de 15 mL
});

// --------------------------------------------------------------------------
// 4. DIPIRONA GOTAS — ANALGÉSICO / ANTITÉRMICO (1 gota para cada 2 kg)
// --------------------------------------------------------------------------
test('Caso 4: Dipirona Gotas 20 kg (1 gota para cada 2 kg)', () => {
  const r = Calc.posologiaPediatrica(20, 'dipirona');
  assert.ok(r.ok);
  const d = r.dados;
  assert.strictEqual(d.tipo, 'gotas');
  assert.strictEqual(d.gotasPorTomada, 10); // 20 kg / 2 = 10 gotas (250 mg)
  assert.strictEqual(d.intervaloHoras, 6);
  assert.ok(d.instrucaoPosologica.includes('10 gotas'));
});

// --------------------------------------------------------------------------
// 5. PARACETAMOL GOTAS — ANALGÉSICO / ANTITÉRMICO (1 gota por kg)
// --------------------------------------------------------------------------
test('Caso 5: Paracetamol Gotas 12 kg (1 gota por kg)', () => {
  const r = Calc.posologiaPediatrica(12, 'paracetamol');
  assert.ok(r.ok);
  const d = r.dados;
  assert.strictEqual(d.tipo, 'gotas');
  assert.strictEqual(d.gotasPorTomada, 12); // 12 gotas (120 mg = 10 mg/kg)
  assert.strictEqual(d.intervaloHoras, 6);
  assert.ok(d.instrucaoPosologica.includes('12 gotas'));
});

// --------------------------------------------------------------------------
// 6. PREDNISOLONA — CRISE ASMÁTICA / LARINGITE (1 mg/kg/dia matinal)
// --------------------------------------------------------------------------
test('Caso 6: Prednisolona 15 kg (1 mg/kg/dia solução 3 mg/mL)', () => {
  const r = Calc.posologiaPediatrica(15, 'prednisolona');
  assert.ok(r.ok);
  const d = r.dados;
  assert.strictEqual(d.doseDiariaTotalMg, 15); // 15 * 1 = 15 mg
  assert.strictEqual(d.volumePorTomadaMl, 5.0); // 15 / 3 = 5.0 mL
  assert.strictEqual(d.intervaloHoras, 24);
  assert.strictEqual(d.diasTratamento, 5);
  assert.strictEqual(d.frascosNecessarios, 1); // 5 * 5 = 25 mL <= 60 mL
});

// --------------------------------------------------------------------------
// 7. SULFAMETOXAZOL + TRIMETOPRIMA — ITU PEDIÁTRICA
// --------------------------------------------------------------------------
test('Caso 7: Sulfametoxazol+Trimetoprima 16 kg (8 mg TMP/kg/dia de 12/12h)', () => {
  const r = Calc.posologiaPediatrica(16, 'sulfametoxazol');
  assert.ok(r.ok);
  const d = r.dados;
  assert.strictEqual(d.volumePorTomadaMl, 8.0); // 16 * 0.5 mL = 8.0 mL
  assert.strictEqual(d.intervaloHoras, 12);
  assert.strictEqual(d.diasTratamento, 10);
  assert.strictEqual(d.frascosNecessarios, 2); // 8 * 2 * 10 = 160 mL -> 2 frascos de 100 mL
});

// --------------------------------------------------------------------------
// 8. CEFALEXINA — INFECÇÃO DE PELE / IMPETIGO (50 mg/kg/dia de 6/6h)
// --------------------------------------------------------------------------
test('Caso 8: Cefalexina 18 kg (50 mg/kg/dia de 6/6h)', () => {
  const r = Calc.posologiaPediatrica(18, 'cefalexina');
  assert.ok(r.ok);
  const d = r.dados;
  assert.strictEqual(d.doseDiariaTotalMg, 900); // 18 * 50 = 900 mg
  assert.strictEqual(d.dosePorTomadaMg, 225); // 900 / 4 = 225 mg
  assert.strictEqual(d.volumePorTomadaMl, 4.5); // 225 / 50 = 4.5 mL
  assert.strictEqual(d.intervaloHoras, 6);
  assert.strictEqual(d.diasTratamento, 7);
  assert.strictEqual(d.frascosNecessarios, 2); // 4.5 * 4 * 7 = 126 mL -> 2 frascos de 100 mL
});

// --------------------------------------------------------------------------
// 9. EXTRAÇÃO DETERMINÍSTICA A PARTIR DE TEXTO LIVRE
// --------------------------------------------------------------------------
test('Caso 9: Extração de texto livre complexo e blindagem contra prescrição cega', () => {
  // Fármaco explícito com peso decimal é extraído com precisão
  const calc1 = Calc.calcularPosologiaPorTextoLivre('/rx azitromicina crianca 17.5kg');
  assert.ok(calc1, 'Deve extrair azitromicina com peso decimal');
  assert.strictEqual(calc1.farmaco, 'Azitromicina');
  assert.strictEqual(calc1.pesoKg, 17.5);
  assert.strictEqual(calc1.volumePorTomadaMl, 4.4);

  // Fármaco explícito em linguagem natural com dor e febre
  const calc2 = Calc.calcularPosologiaPorTextoLivre('dipirona gotas paciente pediatrico com dor e febre, peso 15 quilos');
  assert.ok(calc2, 'Deve extrair dipirona explícita com dor e febre');
  assert.strictEqual(calc2.farmaco, 'Dipirona');
  assert.strictEqual(calc2.pesoKg, 15);

  // Segurança estrita: Alergia, negação ou sintomas isolados sem fármaco NÃO elegem tratamento cego
  const calcAlergia = Calc.calcularPosologiaPorTextoLivre('/rx amigdalite bacteriana crianca 17.5kg alergica a penicilina');
  assert.strictEqual(calcAlergia, null, 'Alergia/diagnóstico isolado não deve eleger tratamento cego');
  const calcSintomas = Calc.calcularPosologiaPorTextoLivre('paciente pediatrico com dor e febre, peso 15 quilos');
  assert.strictEqual(calcSintomas, null, 'Sintomas isolados sem fármaco não devem prescrever automaticamente');
});

// --------------------------------------------------------------------------
// 10. RESPOSTA DO COMANDO /dose NO TELEGRAM COM PESO (INSTANTÂNEO)
// --------------------------------------------------------------------------
test('Caso 10: responderConsultaPosologiaHSL com peso via Telegram', () => {
  let enviou = false;
  let mensagemEnviada = '';
  // Mock temporário de envio
  const originalEnviar = runtime.ctx.enviarMensagemComTecladoParaChat;
  runtime.ctx.enviarMensagemComTecladoParaChat = (chatId, texto, kb) => {
    enviou = true;
    mensagemEnviada = texto;
    return { ok: true };
  };

  try {
    runtime.ctx.responderConsultaPosologiaHSL('12345', 'amoxicilina 16kg');
    assert.ok(enviou, 'Deve ter chamado envio do Telegram');
    assert.ok(mensagemEnviada.includes('CÁLCULO POSOLÓGICO PEDIÁTRICO DETERMINÍSTICO'), 'Deve ter cabeçalho determinístico');
    assert.ok(mensagemEnviada.includes('5,3 mL'), 'Deve conter o volume exato 5,3 mL');
    assert.ok(mensagemEnviada.includes('2 frasco(s)'), 'Deve conter a quantidade exata de frascos');
    assert.ok(mensagemEnviada.includes('Conferência') || mensagemEnviada.includes('avaliação clínica'), 'Deve conter menção de segurança e conferência clínica');
  } finally {
    runtime.ctx.enviarMensagemComTecladoParaChat = originalEnviar;
  }
});

console.log('\n==============================================================================');
console.log(`🎉 AUDITORIA CONCLUÍDA: ${aprovados}/${totalTestes} CASOS CLÍNICOS APROVADOS (100% SUCESSO)!`);
console.log('==============================================================================\n');
