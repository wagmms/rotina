/**
 * Testes Automatizados Determinísticos: Manejo de Via Aérea Difícil (Algoritmo ASA / DAS / LEMON / RSI / CICO)
 */

const assert = require('assert');
const path = require('path');
const ViaAereaDificilService = require(path.join(__dirname, '../src/02_via_aerea_dificil.js'));

console.log('🧪 Iniciando testes do Módulo de Manejo de Via Aérea Difícil...');

// 1. Teste LEMON - Baixo Risco
const lemonBaixo = ViaAereaDificilService.avaliarLemon({
  lookExterno: false,
  aberturaBocaMenor3Dedos: false,
  distanciaTireomentonianaMenor3Dedos: false,
  distanciaHioideCartilagemMenor2Dedos: false,
  mallampati: 1,
  obstrucao: false,
  mobilidadeCervicalReduzida: false
});
assert.strictEqual(lemonBaixo.pontos, 0, 'Pontos LEMON baixo risco deve ser 0');
assert.strictEqual(lemonBaixo.risco, 'BAIXO', 'Classificação deve ser BAIXO');
console.log('✓ Teste LEMON (Baixo Risco) OK');

// 2. Teste LEMON - Risco Moderado e Alto
const lemonAlto = ViaAereaDificilService.avaliarLemon({
  lookExterno: 'Retrognatismo acentuado e barba espessa',
  aberturaBocaMenor3Dedos: true,
  distanciaTireomentonianaMenor3Dedos: true,
  distanciaHioideCartilagemMenor2Dedos: false,
  mallampati: 4,
  estridor: true,
  colarCervical: true
});
assert.ok(lemonAlto.pontos >= 4, 'LEMON alto risco deve ter >= 4 pontos (obtido: ' + lemonAlto.pontos + ')');
assert.strictEqual(lemonAlto.risco, 'ALTO', 'Classificação deve ser ALTO');
assert.ok(lemonAlto.recomendacoes.some(r => r.includes('Videolaringoscópio')), 'Deve recomendar videolaringoscópio');
assert.ok(lemonAlto.recomendacoes.some(r => r.includes('Cricotireoidostomia')), 'Deve recomendar kit de cricotireoidostomia na sala');
console.log('✓ Teste LEMON (Alto Risco com videolaringoscópio e crico) OK');

// 3. Teste MOANS (Ventilação sob máscara facial)
const moansDificil = ViaAereaDificilService.avaliarVentilacaoMascara({
  barbaDensa: true,
  imc: 35,
  idade: 67,
  edentulo: true,
  asmaGrave: true
});
assert.strictEqual(moansDificil.pontos, 5, 'MOANS deve somar 5 pontos');
assert.strictEqual(moansDificil.risco, 'ALTO', 'MOANS risco deve ser ALTO');
assert.ok(moansDificil.conduta.some(c => c.includes('dois operadores') || c.includes('duas mãos')), 'Deve indicar técnica a 2 operadores');
assert.ok(moansDificil.conduta.some(c => c.includes('Guedel')), 'Deve indicar cânula de Guedel');
console.log('✓ Teste MOANS (Ventilação Difícil sob Máscara Facial) OK');

// 4. Teste RSI - Paciente Estável Padrão
const rsiEstavel = ViaAereaDificilService.calcularRsi({
  pesoKg: 70,
  condicaoClinica: 'estavel',
  pas: 120,
  fc: 75
});
assert.strictEqual(rsiEstavel.doseHipnotico.farmaco, 'Etomidato');
assert.strictEqual(rsiEstavel.doseHipnotico.doseMg, 21.0, 'Etomidato 0.3 mg/kg para 70 kg = 21 mg');
assert.strictEqual(rsiEstavel.doseBnm.farmaco, 'Succinilcolina');
assert.strictEqual(rsiEstavel.doseBnm.doseMg, 105.0, 'Succinilcolina 1.5 mg/kg para 70 kg = 105 mg');
assert.strictEqual(rsiEstavel.riscoColapsoHemodinamico, false);
console.log('✓ Teste RSI (Paciente Estável: Etomidato + Succinilcolina) OK');

// 5. Teste RSI - Bloqueio Absoluto de Succinilcolina em Hipercalemia / Grande Queimado
const rsiContraindicado = ViaAereaDificilService.calcularRsi({
  pesoKg: 80,
  condicaoClinica: 'sepse',
  contraindicacoesSuccinilcolina: {
    hipercalemia: true
  },
  kSérico: 6.2,
  pas: 110,
  fc: 80
});
assert.strictEqual(rsiContraindicado.doseBnm.farmaco, 'Rocurônio', 'Deve substituir obrigatoriamente por Rocurônio');
assert.strictEqual(rsiContraindicado.doseBnm.doseMg, 96.0, 'Rocurônio RSI 1.2 mg/kg para 80 kg = 96 mg');
assert.ok(rsiContraindicado.doseBnm.antidotoResgate.includes('Sugamadex 16 mg/kg'), 'Deve incluir dose de resgate de Sugamadex');
assert.ok(rsiContraindicado.doseBnm.antidotoResgate.includes('1280 mg'), 'Sugamadex 16 mg/kg para 80 kg = 1280 mg');
assert.ok(rsiContraindicado.alertasCriticos.some(a => a.includes('CONTRAINDICAÇÃO ABSOLUTA DA SUCCINILCOLINA')), 'Deve conter alerta de contraindicação da succinilcolina');
console.log('✓ Teste RSI (Bloqueio Absoluto Succinilcolina -> Rocurônio 1.2 mg/kg + Sugamadex) OK');

// 6. Teste RSI - Choque Peri-intubação e Risco de PCR
const rsiChoque = ViaAereaDificilService.calcularRsi({
  pesoKg: 70,
  condicaoClinica: 'choque',
  pas: 70,
  fc: 130
});
assert.strictEqual(rsiChoque.riscoColapsoHemodinamico, true, 'Deve detectar risco de colapso hemodinâmico');
assert.ok(rsiChoque.indiceChoque >= 1.5, 'Índice de choque deve ser elevado');
assert.ok(rsiChoque.alertasCriticos.some(a => a.includes('ALERTA VERMELHO DE CHOQUE PERI-INTUBAÇÃO')), 'Deve emitir alerta vermelho de choque');
console.log('✓ Teste RSI (Choque Peri-intubação e Ressuscitação Prévia) OK');

// 7. Seleção de Máscara Laríngea por Peso
const mlAdultoMedio = ViaAereaDificilService.selecionarDispositivoSupraglotico(65);
assert.strictEqual(mlAdultoMedio.tamanho, 4, 'Para 65 kg deve ser tamanho 4');
const mlAdultoGrande = ViaAereaDificilService.selecionarDispositivoSupraglotico(85);
assert.strictEqual(mlAdultoGrande.tamanho, 5, 'Para 85 kg deve ser tamanho 5');
const mlAdultoPequeno = ViaAereaDificilService.selecionarDispositivoSupraglotico(42);
assert.strictEqual(mlAdultoPequeno.tamanho, 3, 'Para 42 kg deve ser tamanho 3');
console.log('✓ Teste Dispositivo Supraglótico por Faixa de Peso OK');

// 8. Algoritmo ASA - Plano A (Tentativa 1 com Otimização)
const planoA = ViaAereaDificilService.algoritmoAsaViaAerea({
  tentativasLaringoscopia: 1,
  cormackLehane: 3,
  sucessoIntubacao: false,
  oxigenaComMascara: true
});
assert.strictEqual(planoA.planoAtivo, 'PLANO A: OTIMIZAÇÃO DA LARINGOSCOPIA');
assert.ok(planoA.acoesImediatas.some(a => a.includes('Bougie')), 'Deve orientar uso de Bougie');
assert.ok(planoA.acoesImediatas.some(a => a.includes('BURP')), 'Deve orientar manobra BURP');
console.log('✓ Teste Algoritmo ASA (Plano A com Bougie e BURP) OK');

// 9. Algoritmo ASA - Falha de Laringoscopia (3 tentativas) e Transição para Máscara Laríngea (Plano B)
const planoB = ViaAereaDificilService.algoritmoAsaViaAerea({
  tentativasLaringoscopia: 3,
  sucessoIntubacao: false,
  oxigenaComMascara: true,
  dispositivoSupragloticoTentado: false,
  pesoKg: 70
});
assert.strictEqual(planoB.planoAtivo, 'PLANO B: DISPOSITIVO SUPRAGLÓTICO (MÁSCARA LARÍNGEA)');
assert.ok(planoB.acoesImediatas.some(a => a.includes('PARAR novas tentativas de laringoscopia')), 'Deve ordenar parar laringoscopia direta');
console.log('✓ Teste Algoritmo ASA (Falha Plano A -> Plano B com Máscara Laríngea) OK');

// 10. Algoritmo ASA - Resgate com Máscara Laríngea Bem-Sucedido
const planoBSucesso = ViaAereaDificilService.algoritmoAsaViaAerea({
  tentativasLaringoscopia: 3,
  sucessoIntubacao: false,
  dispositivoSupragloticoTentado: true,
  sucessoSupraglotico: true,
  pesoKg: 70
});
assert.strictEqual(planoBSucesso.planoAtivo, 'VENTILAÇÃO DE RESGATE ESTABILIZADA');
assert.ok(planoBSucesso.acoesImediatas.some(a => a.includes('fibrobroncoscópio')), 'Deve sugerir intubação através da ML ou acordar paciente');
console.log('✓ Teste Algoritmo ASA (Sucesso no Supraglótico) OK');

// 11. Algoritmo ASA - EMERGÊNCIA CRÍTICA: NÃO INTUBA, NÃO OXIGENA (CICO)
const cico = ViaAereaDificilService.algoritmoAsaViaAerea({
  tentativasLaringoscopia: 3,
  sucessoIntubacao: false,
  oxigenaComMascara: false,
  dispositivoSupragloticoTentado: true,
  sucessoSupraglotico: false,
  pesoKg: 75
});
assert.strictEqual(cico.alertaVermelhoCico, true, 'Deve ativar alerta vermelho CICO');
assert.strictEqual(cico.planoAtivo, 'PLANO D / eFONA: ACESSO CIRÚRGICO FRONTAL NO PESCOÇO IMEDIATO');
assert.ok(cico.protocoloCricotireoidostomia !== null, 'Deve prover protocolo de cricotireoidostomia cirúrgica');
assert.ok(cico.protocoloCricotireoidostomia.passoAPasso.some(p => p.includes('Scalpel') || p.includes('bisturi')), 'Deve detalhar técnica cirúrgica bisturi-bougie-tubo');
assert.ok(cico.protocoloCricotireoidostomia.materiais.some(m => m.includes('Tubo orotraqueal com cuff tamanho 6.0 mm')), 'Deve indicar tubo 6.0 com cuff');
console.log('✓ Teste Algoritmo ASA (Emergência CICO com Scalpel-Bougie-Tube 6.0mm) OK');

// 12. Teste de Formatação de Resumo
const resumo = ViaAereaDificilService.formatarResumoViaAerea({
  lemon: lemonAlto,
  rsi: rsiContraindicado,
  algoritmo: cico
});
assert.ok(resumo.includes('MANEJO DETERMINÍSTICO DE VIA AÉREA DIFÍCIL'), 'Deve conter título');
assert.ok(resumo.includes('Rocurônio'), 'Deve conter Rocurônio no resumo');
assert.ok(resumo.includes('EMERGÊNCIA CICO'), 'Deve destacar emergência CICO');
console.log('✓ Teste Formatação de Resumo OK');

// 13. Teste de Integração via RPC no Runtime Fastify
const crypto = require('crypto');
const runtime = require(path.join(__dirname, '../server/runtime.js'));
const botToken = 'dummy-token-va';
if (!runtime.ctx.ConfigService) runtime.ctx.ConfigService = {};
runtime.ctx.ConfigService.exigir = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : (k === 'TELEGRAM_BOT_TOKEN' ? botToken : 'dummy');
const hashEsperado = crypto.createHmac('sha256', botToken).update('123').digest('hex');
const fakeSession = 'ck_' + hashEsperado;

const rpcResult = runtime.cockpitRpc('cockpitViaAereaDificil', fakeSession, [{
  acao: 'completo',
  pesoKg: 75,
  mallampati: 4,
  condicaoClinica: 'choque',
  pas: 80,
  fc: 125,
  tentativasLaringoscopia: 3,
  oxigenaComMascara: false,
  dispositivoSupragloticoTentado: true,
  sucessoSupraglotico: false
}]);

assert.ok(rpcResult.lemon, 'Deve retornar objeto lemon via RPC');
assert.ok(rpcResult.rsi, 'Deve retornar objeto rsi via RPC');
assert.ok(rpcResult.algoritmo, 'Deve retornar objeto algoritmo via RPC');
assert.strictEqual(rpcResult.algoritmo.alertaVermelhoCico, true, 'Deve conter alerta CICO via RPC');
assert.strictEqual(rpcResult.rsi.riscoColapsoHemodinamico, true, 'Deve conter risco colapso hemodinâmico via RPC');
console.log('✓ Teste Integração RPC no Runtime Fastify OK');

console.log('\n🎉 TODOS OS 13 TESTES DETERMINÍSTICOS DE VIA AÉREA DIFÍCIL PASSARAM COM SUCESSO! ✅');

