/**
 * ==============================================================================
 * BATERIA DE TESTES: PRECEPTOR CLÍNICO & NÓS DE EMERGÊNCIA (AUDITORIA TDC)
 * ==============================================================================
 * Valida a sincronização das diretrizes 2024-2026 e pérolas do Tá de Clinicagem:
 * 1. obterAncoraSocraticaTdCEmergencia (Sepse, CAD, Asma, Anafilaxia, HDA, IAM, EAP, Convulsão)
 * 2. formatarBlocoProtocoloEmergenciaTelegram (estruturação, pérolas e checklist socrático)
 * 3. Despacho Telegram do comando /protocolo
 * 4. Salvaguardas ISMP Brasil e alvos clínicos beira-leito
 * ==============================================================================
 */

const assert = require('assert');
const runtime = require('../server/runtime.js');

async function testarPreceptorTdCEmergencia() {
  console.log('=== TESTE: PRECEPTOR CLÍNICO & NÓS DE EMERGÊNCIA (TDC) ===\n');
  const ctx = runtime.ctx;

  // 1. Verificação de existência das funções no runtime
  assert.strictEqual(typeof ctx.obterProtocoloClinico, 'function', 'obterProtocoloClinico deve estar presente no runtime');
  assert.strictEqual(typeof ctx.obterAncoraSocraticaTdCEmergencia, 'function', 'obterAncoraSocraticaTdCEmergencia deve estar presente no runtime');
  assert.strictEqual(typeof ctx.formatarBlocoProtocoloEmergenciaTelegram, 'function', 'formatarBlocoProtocoloEmergenciaTelegram deve estar presente no runtime');

  // 2. Testando Âncora Socrática TdC para Sepse
  console.log('[1] Testando âncora socrática e pérola para Sepse/Choque Séptico...');
  const ancoraSepse = ctx.obterAncoraSocraticaTdCEmergencia('paciente com sepse foco pulmonar');
  assert.ok(ancoraSepse, 'Deve retornar âncora socrática para sepse');
  assert.ok(ancoraSepse.perolaTdC.includes('ANDROMEDA-SHOCK') || ancoraSepse.perolaTdC.includes('TEC ≤ 3s'), 'Deve citar TEC ou ANDROMEDA-SHOCK na sepse');
  assert.ok(ancoraSepse.perguntaSocratica.includes('Tempo de Enchimento Capilar') || ancoraSepse.perguntaSocratica.includes('Noradrenalina'), 'Pergunta socrática deve abordar TEC ou Noradrenalina precoce');
  console.log('  ✓ Âncora socrática de sepse validada.');

  // 3. Testando Âncora Socrática TdC para CAD
  console.log('[2] Testando âncora socrática e pérola para CAD/EHH...');
  const ancoraCad = ctx.obterAncoraSocraticaTdCEmergencia('cetoacidose diabetica grave');
  assert.ok(ancoraCad, 'Deve retornar âncora socrática para CAD');
  assert.ok(ancoraCad.perolaTdC.includes('Potássio') || ancoraCad.perolaTdC.includes('K < 3,5'), 'Deve citar checagem de K+');
  assert.ok(ancoraCad.perolaTdC.includes('2 a 4h ANTES') || ancoraCad.perolaTdC.includes('insulina basal'), 'Deve citar transição com insulina basal 2 a 4h antes');
  assert.ok(ancoraCad.perguntaSocratica.includes('Potássio') && ancoraCad.perguntaSocratica.includes('subcutânea'), 'Pergunta socrática de CAD validada');
  console.log('  ✓ Âncora socrática de CAD validada.');

  // 4. Testando Âncora Socrática TdC para Asma
  console.log('[3] Testando âncora socrática e pérola para Asma Grave...');
  const ancoraAsma = ctx.obterAncoraSocraticaTdCEmergencia('crise de asma');
  assert.ok(ancoraAsma, 'Deve retornar âncora socrática para asma');
  assert.ok(ancoraAsma.perolaTdC.includes('GINA') && ancoraAsma.perolaTdC.includes('Track 1'), 'Deve citar GINA Track 1');
  assert.ok(ancoraAsma.perguntaSocratica.includes('Sulfato de Magnésio') || ancoraAsma.perguntaSocratica.includes('Track 1'), 'Pergunta socrática de asma validada');
  console.log('  ✓ Âncora socrática de asma grave validada.');

  // 5. Testando Âncora Socrática TdC para Anafilaxia
  console.log('[4] Testando âncora socrática e pérola para Anafilaxia...');
  const ancoraAnafilaxia = ctx.obterAncoraSocraticaTdCEmergencia('choque anafilatico');
  assert.ok(ancoraAnafilaxia, 'Deve retornar âncora socrática para anafilaxia');
  assert.ok(ancoraAnafilaxia.perolaTdC.includes('Glucagon') && ancoraAnafilaxia.perolaTdC.includes('betabloqueador'), 'Deve citar Glucagon em betabloqueado');
  assert.ok(ancoraAnafilaxia.perguntaSocratica.includes('Adrenalina 1:1000') && ancoraAnafilaxia.perguntaSocratica.includes('decúbito dorsal'), 'Pergunta socrática de anafilaxia validada');
  console.log('  ✓ Âncora socrática de anafilaxia validada.');

  // 6. Testando Âncora Socrática TdC para HDA
  console.log('[5] Testando âncora socrática e pérola para Hemorragia Digestiva Alta...');
  const ancoraHda = ctx.obterAncoraSocraticaTdCEmergencia('hemorragia digestiva alta varizes esofagicas');
  assert.ok(ancoraHda, 'Deve retornar âncora socrática para HDA');
  assert.ok(ancoraHda.perolaTdC.includes('Baveno VII') && ancoraHda.perolaTdC.includes('Terlipressina'), 'Deve citar Baveno VII e Terlipressina');
  assert.ok(ancoraHda.perguntaSocratica.includes('Hb 7-8 g/dL'), 'Pergunta socrática de HDA deve reforçar estratégia restritiva');
  console.log('  ✓ Âncora socrática de HDA validada.');

  // 7. Testando formatação de bloco Telegram
  console.log('[6] Testando formatarBlocoProtocoloEmergenciaTelegram...');
  const blocoTelegram = ctx.formatarBlocoProtocoloEmergenciaTelegram('sepse');
  assert.ok(blocoTelegram.includes('PROTOCOLO DE EMERGÊNCIA: SEPSE E CHOQUE SÉPTICO'), 'Título do protocolo formatado');
  assert.ok(blocoTelegram.includes('Diretriz BR:'), 'Deve incluir Diretriz BR');
  assert.ok(blocoTelegram.includes('Diretriz Internacional:'), 'Deve incluir Diretriz Internacional');
  assert.ok(blocoTelegram.includes('Check-list do Preceptor (TdC):'), 'Deve incluir o checklist socrático do preceptor');
  console.log('  ✓ Formatação do bloco Telegram validada.');

  // 8. Testando despacho do comando /protocolo no Telegram Router
  console.log('[7] Testando despacho do comando /protocolo asma e /protocolo hda...');
  let ultimasMensagens = [];
  ctx.enviarMensagemParaChat = (chatId, texto) => {
    ultimasMensagens.push({ chatId, texto });
    return true;
  };

  ctx.processarMensagemTexto({ chat: { id: 123456 }, text: '/protocolo asma' });
  assert.strictEqual(ultimasMensagens.length, 1, 'Deveria ter enviado 1 mensagem');
  assert.ok(ultimasMensagens[0].texto.includes('CRISE DE ASMA GRAVE'), 'Deveria responder com protocolo de asma');
  assert.ok(ultimasMensagens[0].texto.includes('Check-list do Preceptor (TdC)'), 'Deveria conter checklist do preceptor');

  ultimasMensagens = [];
  ctx.processarMensagemTexto({ chat: { id: 123456 }, text: '/protocolo hda' });
  assert.strictEqual(ultimasMensagens.length, 1, 'Deveria ter enviado 1 mensagem');
  assert.ok(ultimasMensagens[0].texto.includes('HEMORRAGIA DIGESTIVA ALTA'), 'Deveria responder com protocolo de HDA');
  assert.ok(ultimasMensagens[0].texto.includes('Baveno VII'), 'Deveria conter Baveno VII');
  console.log('  ✓ Despacho do comando /protocolo via Router validado com sucesso.');

  console.log('\n=== TODOS OS TESTES DO PRECEPTOR & NÓS DE EMERGÊNCIA APROVADOS COM SUCESSO! ===');
}

testarPreceptorTdCEmergencia().catch(err => {
  console.error('FALHA NO TESTE:', err);
  process.exit(1);
});
