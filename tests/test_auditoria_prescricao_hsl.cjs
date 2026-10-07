/**
 * Testes de auditoria da prescrição pediátrica, integração do Guia HSL e cronofarmacologia.
 */
const assert = require('assert');
const runtime = require('../server/runtime.js');

console.log('🧪 Iniciando testes de auditoria de prescrição, HSL e cronofarmacologia...\n');

// 1. Loratadina por idade sem peso (dose oficial do HSL: 5 mL VO 1x/dia à noite)
const calcLoraIdade = runtime.ctx.CalculadorasClinicas.calcularPosologiaPorTextoLivre('/rx loratadina crianca 5 anos');
assert.ok(calcLoraIdade, 'Deve calcular Loratadina por idade');
assert.strictEqual(calcLoraIdade.farmaco, 'Loratadina');
assert.strictEqual(calcLoraIdade.volumePorTomadaMl, 5);
assert.strictEqual(calcLoraIdade.dosePorTomadaMg, 5);
assert.strictEqual(calcLoraIdade.tomadasDia, 1);
assert.ok(calcLoraIdade.instrucaoPosologica.includes('20:00'), 'Deve sugerir horário noturno (20:00)');
assert.ok(calcLoraIdade.instrucaoPosologica.includes('5 mL'), 'Deve conter 5 mL');
console.log('✅ 1. Loratadina calcula por idade (5 anos) sem exigir peso: 5 mL 1x/dia às 20h00');

// 2. Loratadina por peso limítrofe (<= 30 kg vs > 30 kg)
const calcLoraLeve = runtime.ctx.CalculadorasClinicas.calcularPosologiaPorTextoLivre('loratadina 22kg');
assert.ok(calcLoraLeve);
assert.strictEqual(calcLoraLeve.volumePorTomadaMl, 5);
assert.strictEqual(calcLoraLeve.dosePorTomadaMg, 5);

const calcLoraPesado = runtime.ctx.CalculadorasClinicas.calcularPosologiaPorTextoLivre('loratadina 35kg');
assert.ok(calcLoraPesado);
assert.strictEqual(calcLoraPesado.volumePorTomadaMl, 10);
assert.strictEqual(calcLoraPesado.dosePorTomadaMg, 10);
console.log('✅ 2. Loratadina ajusta degrau por peso (22 kg -> 5 mL; 35 kg -> 10 mL)');

// 3. Dexclorfeniramina nas faixas oficiais do HSL (2-6 anos, 6-12 anos, > 12 anos)
const calcDex2a6 = runtime.ctx.CalculadorasClinicas.calcularPosologiaPorTextoLivre('polaramine crianca 4 anos');
assert.ok(calcDex2a6, 'Deve calcular Dexclorfeniramina para 4 anos');
assert.strictEqual(calcDex2a6.volumePorTomadaMl, 1.25);
assert.strictEqual(calcDex2a6.intervaloHoras, 8);
assert.ok(calcDex2a6.instrucaoPosologica.includes('07:00 - 15:00 - 23:00'), 'Deve conter horários de 8/8h humanizados');

const calcDex6a12 = runtime.ctx.CalculadorasClinicas.calcularPosologiaPorTextoLivre('dexclorfeniramina 8 anos');
assert.ok(calcDex6a12, 'Deve calcular Dexclorfeniramina para 8 anos');
assert.strictEqual(calcDex6a12.volumePorTomadaMl, 2.5);
assert.strictEqual(calcDex6a12.intervaloHoras, 8);
console.log('✅ 3. Dexclorfeniramina calcula faixas oficiais do HSL (4 anos -> 1,25 mL; 8 anos -> 2,5 mL de 8/8h: 07h-15h-23h)');

// 4. RAG do HSL com proteção contra falso positivo (eliminação de stop-words como "ANOS")
const ctxRinite = runtime.ctx.filtrarContextoPosologiasHSL('crianca 5 anos rinite loratadina');
assert.ok(ctxRinite.includes('LORATADINA'), 'Deve incluir Loratadina no contexto do HSL');
assert.ok(!ctxRinite.includes('DESLANOSIDEO'), 'NUNCA deve trazer Deslanosídeo por causa de "anos"');
assert.ok(!ctxRinite.includes('HUMANOS'), 'NUNCA deve trazer Timoglobulina por causa de "anos"');
console.log('✅ 4. RAG do HSL blindado contra falsos positivos (zero digitálico, zero imunossupressor)');

// 5. Horários sugeridos para antibióticos e suspensões
const calcAmoxi = runtime.ctx.CalculadorasClinicas.calcularPosologiaPorTextoLivre('amoxicilina 16kg');
assert.ok(calcAmoxi);
assert.ok(calcAmoxi.instrucaoPosologica.includes('07:00 - 15:00 - 23:00'), 'Amoxicilina deve sugerir horários preservando o sono');

const calcPred = runtime.ctx.CalculadorasClinicas.calcularPosologiaPorTextoLivre('prednisolona 15kg');
assert.ok(calcPred);
assert.ok(calcPred.instrucaoPosologica.includes('08:00'), 'Prednisolona deve sugerir horário matinal com alimento');
console.log('✅ 5. Cronofarmacologia validada: Amoxicilina (07h-15h-23h) e Prednisolona (08h00 matinal)');

// 6. Antiparasitários determinísticos (Albendazol, Mebendazol, Nitazoxanida)
const calcAlben = runtime.ctx.CalculadorasClinicas.calcularPosologiaPorTextoLivre('albendazol crianca 4 anos');
assert.ok(calcAlben, 'Deve calcular Albendazol');
assert.strictEqual(calcAlben.farmaco, 'Albendazol');
assert.strictEqual(calcAlben.volumePorTomadaMl, 10);
assert.strictEqual(calcAlben.dosePorTomadaMg, 400);
assert.strictEqual(calcAlben.tomadasDia, 1);
assert.ok(calcAlben.instrucaoPosologica.includes('08:00'), 'Deve sugerir dose matinal');
assert.ok(calcAlben.instrucaoPosologica.includes('gorduroso'), 'Deve orientar administração com alimento gorduroso');

const calcMeben = runtime.ctx.CalculadorasClinicas.calcularPosologiaPorTextoLivre('mebendazol crianca 3 anos');
assert.ok(calcMeben, 'Deve calcular Mebendazol');
assert.strictEqual(calcMeben.volumePorTomadaMl, 5);
assert.strictEqual(calcMeben.dosePorTomadaMg, 100);
assert.strictEqual(calcMeben.intervaloHoras, 12);
assert.ok(calcMeben.instrucaoPosologica.includes('08:00 e 20:00'), 'Deve sugerir horários 08:00 e 20:00');

const calcNita1a3 = runtime.ctx.CalculadorasClinicas.calcularPosologiaPorTextoLivre('nitazoxanida crianca 2 anos');
assert.ok(calcNita1a3, 'Deve calcular Nitazoxanida 1-3 anos');
assert.strictEqual(calcNita1a3.volumePorTomadaMl, 5);
assert.strictEqual(calcNita1a3.dosePorTomadaMg, 100);

const calcNita4a11 = runtime.ctx.CalculadorasClinicas.calcularPosologiaPorTextoLivre('annita crianca 6 anos');
assert.ok(calcNita4a11, 'Deve calcular Annita (Nitazoxanida) 4-11 anos');
assert.strictEqual(calcNita4a11.volumePorTomadaMl, 10);
assert.strictEqual(calcNita4a11.dosePorTomadaMg, 200);
console.log('✅ 6. Antiparasitários validados (Albendazol, Mebendazol, Nitazoxanida/Annita com faixas e horários corretos)');

// 7. Corticoide nasal determinístico (Budesonida Nasal)
const calcBusonid = runtime.ctx.CalculadorasClinicas.calcularPosologiaPorTextoLivre('busonid crianca 6 anos');
assert.ok(calcBusonid, 'Deve calcular Busonid por sinônimo');
assert.strictEqual(calcBusonid.farmaco, 'Budesonida Spray Nasal');
assert.ok(calcBusonid.instrucaoPosologica.includes('narina'), 'Deve conter instrução por narina');
console.log('✅ 7. Corticoide nasal validado (Budesonida nasal por idade e marca comercial)');

// 8. Alerta formal de ausência de dose pediátrica no Guia HSL
const ctxAmiodarona = runtime.ctx.filtrarContextoPosologiasHSL('amiodarona crianca');
assert.ok(ctxAmiodarona.includes('AMIODARONA'), 'Deve encontrar Amiodarona no HSL');
assert.ok(
  ctxAmiodarona.includes('NÃO PADRONIZADA NO GUIA HSL') || ctxAmiodarona.includes('uso adulto'),
  'Deve conter alerta de não padronização pediátrica para fármaco exclusivamente adulto'
);
console.log('✅ 8. Alerta formal de dose pediátrica não padronizada no Guia HSL validado');

console.log('\n🎉 TODOS OS TESTES DE AUDITORIA DE PRESCRIÇÃO E HSL PASSARAM COM SUCESSO!');
