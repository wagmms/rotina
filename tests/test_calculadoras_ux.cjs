process.env.NODE_ENV = 'test';
const assert = require('assert');
const runtime = require('../server/runtime.js');

async function testCalculadorasUX() {
  console.log('=== TESTE DE UI/UX E DETERMINISMO: CALCULADORAS CLÍNICAS (ux:hub:calc) ===\n');

  const ctx = runtime.ctx;
  const chatId = ctx.ConfigService.get('TELEGRAM_CHAT_ID') || '1771571035';

  let mensagensEnviadas = [];
  ctx.enviarMensagemParaChat = (id, texto) => {
    mensagensEnviadas.push({ metodo: 'enviarMensagemParaChat', id, texto });
  };
  ctx.enviarMensagemComTecladoParaChat = (id, texto, kb) => {
    mensagensEnviadas.push({ metodo: 'enviarMensagemComTecladoParaChat', id, texto, kb });
  };
  ctx.responderCallbackTelegram = (cbId, texto) => {
    mensagensEnviadas.push({ metodo: 'responderCallbackTelegram', cbId, texto });
  };
  ctx.executarPostTelegram = (url, payload) => {
    if (payload && payload.text) {
      mensagensEnviadas.push({
        metodo: 'executarPostTelegram',
        id: payload.chat_id,
        texto: payload.text,
        kb: payload.reply_markup
      });
    }
    return true;
  };
  ctx.UrlFetchApp = {
    fetch: () => ({
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({ ok: true, result: { message_id: 12345 } })
    })
  };

  // Helper para acionar callback
  function acionarCallback(callbackData, messageId = 9999) {
    mensagensEnviadas = [];
    ctx.processarCallbackBotao({
      id: 'cb_' + String(callbackData).replace(/[^a-zA-Z0-9]/g, '_'),
      data: callbackData,
      message: { chat: { id: chatId }, message_id: messageId }
    });
    return mensagensEnviadas;
  }

  // Helper para enviar mensagem de texto
  function enviarTextoComando(textoComando) {
    mensagensEnviadas = [];
    ctx.processarMensagemTexto({
      chat: { id: chatId },
      text: textoComando
    });
    return mensagensEnviadas;
  }

  // 1. Menu Principal de Calculadoras Clínicas (ux:hub:calc)
  console.log('[1] Testando Menu Principal de Calculadoras Clínicas (ux:hub:calc)...');
  let msgs = acionarCallback('ux:hub:calc');
  assert(msgs.length >= 1, 'Deve responder ao callback ux:hub:calc');
  let msgMenu = msgs.find(m => m.texto && m.texto.includes('CALCULADORAS CLÍNICAS'));
  assert(msgMenu, 'Menu deve conter título canônico "CALCULADORAS CLÍNICAS & ESCORES"');
  let botoesMenu = msgMenu.kb.inline_keyboard.flat();
  let callbacksMenu = botoesMenu.map(b => b.callback_data);
  assert(callbacksMenu.includes('ux:calc:gaso'), 'Menu deve conter botão ux:calc:gaso');
  assert(callbacksMenu.includes('ux:calc:crcl'), 'Menu deve conter botão ux:calc:crcl');
  assert(callbacksMenu.includes('ux:calc:holliday'), 'Menu deve conter botão ux:calc:holliday');
  assert(callbacksMenu.includes('ux:calc:glasgow'), 'Menu deve conter botão ux:calc:glasgow');
  assert(callbacksMenu.includes('ux:calc:parkland'), 'Menu deve conter botão ux:calc:parkland');
  assert(callbacksMenu.includes('ux:calc:dva'), 'Menu deve conter botão ux:calc:dva');
  assert(callbacksMenu.includes('ux:hub:inicio'), 'Menu deve conter botão de retorno [🏠 Início]');
  console.log('  ✓ Menu principal e as 6 calculadoras principais validados com sucesso.');

  // 2. Telas Interativas com Presets de 1-toque e Retorno Contextual
  console.log('\n[2] Testando Telas Interativas das Calculadoras com Navegação Contextual...');

  // 2.1 Gasometria Arterial (ux:calc:gaso)
  msgs = acionarCallback('ux:calc:gaso');
  let msgGaso = msgs.find(m => m.texto && m.texto.includes('GASOMETRIA ARTERIAL'));
  assert(msgGaso, 'ux:calc:gaso deve responder com tela de Gasometria');
  assert(msgGaso.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:calc'), 'Gasometria deve ter retorno [🔙 Calculadoras]');
  assert(msgGaso.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:inicio'), 'Gasometria deve ter retorno [🏠 Início]');
  assert(msgGaso.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:calc:gaso_cad' || b.callback_data === 'ux:calc:gaso:met'), 'Gasometria deve ter preset Acidose Metabólica');

  // 2.2 Função Renal & ClCr (ux:calc:crcl)
  msgs = acionarCallback('ux:calc:crcl');
  let msgCrcl = msgs.find(m => m.texto && m.texto.includes('FUNÇÃO RENAL'));
  assert(msgCrcl, 'ux:calc:crcl deve responder com tela de Função Renal');
  assert(msgCrcl.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:calc'), 'CrCl deve ter retorno [🔙 Calculadoras]');
  assert(msgCrcl.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:inicio'), 'CrCl deve ter retorno [🏠 Início]');
  assert(msgCrcl.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:calc:renal_ex1' || b.callback_data === 'ux:calc:crcl:70kg'), 'CrCl deve ter preset');

  // 2.3 Holliday-Segar (ux:calc:holliday)
  msgs = acionarCallback('ux:calc:holliday');
  let msgHolliday = msgs.find(m => m.texto && m.texto.includes('HOLLIDAY-SEGAR'));
  assert(msgHolliday, 'ux:calc:holliday deve responder com tela de Holliday-Segar');
  assert(msgHolliday.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:calc'), 'Holliday deve ter retorno [🔙 Calculadoras]');
  assert(msgHolliday.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:inicio'), 'Holliday deve ter retorno [🏠 Início]');
  assert(msgHolliday.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:calc:hol_ex1' || b.callback_data === 'ux:calc:holliday:15kg'), 'Holliday deve ter preset');

  // 2.4 Glasgow-P (ux:calc:glasgow)
  msgs = acionarCallback('ux:calc:glasgow');
  let msgGlasgow = msgs.find(m => m.texto && m.texto.includes('GLASGOW-P'));
  assert(msgGlasgow, 'ux:calc:glasgow deve responder com tela de Glasgow-P');
  assert(msgGlasgow.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:calc'), 'Glasgow deve ter retorno [🔙 Calculadoras]');
  assert(msgGlasgow.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:inicio'), 'Glasgow deve ter retorno [🏠 Início]');
  assert(msgGlasgow.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:calc:gcs_ex3' || b.callback_data === 'ux:calc:glasgow:grave'), 'Glasgow deve ter preset Grave');

  // 2.5 Parkland (ux:calc:parkland)
  msgs = acionarCallback('ux:calc:parkland');
  let msgParkland = msgs.find(m => m.texto && m.texto.includes('PARKLAND'));
  assert(msgParkland, 'ux:calc:parkland deve responder com tela de Parkland');
  assert(msgParkland.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:calc'), 'Parkland deve ter retorno [🔙 Calculadoras]');
  assert(msgParkland.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:inicio'), 'Parkland deve ter retorno [🏠 Início]');
  assert(msgParkland.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:calc:park_ex1' || b.callback_data === 'ux:calc:parkland:70kg20p'), 'Parkland deve ter preset');

  // 2.6 Drogas Vasoativas (ux:calc:dva)
  msgs = acionarCallback('ux:calc:dva');
  let msgDva = msgs.find(m => m.texto && m.texto.includes('DROGAS VASOATIVAS'));
  assert(msgDva, 'ux:calc:dva deve responder com menu de DVA');
  assert(msgDva.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:calc'), 'DVA deve ter retorno [🔙 Calculadoras]');
  assert(msgDva.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:inicio'), 'DVA deve ter retorno [🏠 Início]');
  console.log('  ✓ Todas as 6 telas interativas validadas com retorno contextual obrigatório.');

  // 3. Execução Determinística em 0ms e Botão de Cópia [📋 Copiar Cálculo para Prontuário]
  console.log('\n[3] Testando Execução Determinística em 0ms com Botão de Cópia...');

  // 3.1 Preset Gasometria Acidose Metabólica
  msgs = acionarCallback('ux:calc:gaso:met');
  let resGasoMet = msgs.find(m => m.texto && m.texto.includes('GASOMETRIA ARTERIAL'));
  assert(resGasoMet, 'Preset ux:calc:gaso:met deve retornar análise gasométrica');
  assert(resGasoMet.texto.includes('Acidose Metabólica') || resGasoMet.texto.includes('Winter'), 'Deve conter compensação de Winter');
  let botoesGasoMet = resGasoMet.kb.inline_keyboard.flat();
  let btnCopiarGaso = botoesGasoMet.find(b => b.callback_data && b.callback_data.startsWith('ux:copiar:'));
  assert(btnCopiarGaso, 'Deve conter botão [📋 Copiar Cálculo para Prontuário]');
  assert(botoesGasoMet.some(b => b.callback_data === 'ux:hub:calc'), 'Deve conter [🔙 Calculadoras]');
  assert(botoesGasoMet.some(b => b.callback_data === 'ux:hub:inicio'), 'Deve conter [🏠 Início]');

  // 3.2 Preset Clearance Renal com Comparativo CKD-EPI
  msgs = acionarCallback('ux:calc:crcl:70kg');
  let resCrcl = msgs.find(m => m.texto && (m.texto.includes('FUNÇÃO RENAL') || m.texto.includes('CLEARANCE DE CREATININA')));
  assert(resCrcl, 'Preset ux:calc:crcl:70kg deve retornar cálculo renal');
  assert(resCrcl.texto.includes('Cockcroft-Gault') && resCrcl.texto.includes('CKD-EPI'), 'Deve conter comparativo Cockcroft vs CKD-EPI 2021');
  let botoesCrcl = resCrcl.kb.inline_keyboard.flat();
  assert(botoesCrcl.some(b => b.callback_data && b.callback_data.startsWith('ux:copiar:')), 'CrCl deve ter botão de cópia');
  assert(botoesCrcl.some(b => b.callback_data === 'ux:hub:calc'), 'CrCl deve ter [🔙 Calculadoras]');

  // 3.3 Preset Holliday-Segar 15kg
  msgs = acionarCallback('ux:calc:holliday:15kg');
  let resHolliday = msgs.find(m => m.texto && m.texto.includes('HOLLIDAY-SEGAR'));
  assert(resHolliday, 'Preset ux:calc:holliday:15kg deve retornar plano de hidratação');
  assert((resHolliday.texto.includes('1250') || resHolliday.texto.includes('1.200') || resHolliday.texto.includes('1200')), 'Deve calcular volume de Holliday-Segar');
  let botoesHolliday = resHolliday.kb.inline_keyboard.flat();
  assert(botoesHolliday.some(b => b.callback_data && b.callback_data.startsWith('ux:copiar:')), 'Holliday deve ter botão de cópia');
  assert(botoesHolliday.some(b => b.callback_data === 'ux:hub:calc'), 'Holliday deve ter [🔙 Calculadoras]');

  // 3.4 Preset Glasgow-P Grave
  msgs = acionarCallback('ux:calc:glasgow:grave');
  let resGlasgow = msgs.find(m => m.texto && m.texto.includes('GLASGOW'));
  assert(resGlasgow, 'Preset ux:calc:glasgow:grave deve retornar Glasgow');
  assert(resGlasgow.texto.includes('GCS') && (resGlasgow.texto.includes('7') || resGlasgow.texto.includes('6')), 'Deve calcular GCS e GCS-P');
  assert(resGlasgow.texto.includes('INTUBAÇÃO') || resGlasgow.texto.includes('VIA AÉREA'), 'Deve alertar para via aérea definitiva');
  let botoesGlasgow = resGlasgow.kb.inline_keyboard.flat();
  assert(botoesGlasgow.some(b => b.callback_data && b.callback_data.startsWith('ux:copiar:')), 'Glasgow deve ter botão de cópia');

  // 3.5 Preset Parkland 70kg 20%
  msgs = acionarCallback('ux:calc:parkland:70kg20p');
  let resParkland = msgs.find(m => m.texto && m.texto.includes('PARKLAND'));
  assert(resParkland, 'Preset ux:calc:parkland:70kg20p deve retornar Parkland');
  assert((resParkland.texto.includes('5600') || resParkland.texto.includes('5.600')) && resParkland.texto.includes('350'), 'Deve calcular 5600 mL total e 350 mL/h');
  let botoesParkland = resParkland.kb.inline_keyboard.flat();
  assert(botoesParkland.some(b => b.callback_data && b.callback_data.startsWith('ux:copiar:')), 'Parkland deve ter botão de cópia');

  // 3.6 Preset DVA Noradrenalina 70kg
  msgs = acionarCallback('ux:calc:dva:nora70');
  let resDva = msgs.find(m => m.texto && /noradrenalina/i.test(m.texto));
  assert(resDva, 'Preset ux:calc:dva:nora70 deve retornar infusão de Noradrenalina');
  let botoesDva = resDva.kb.inline_keyboard.flat();
  assert(botoesDva.some(b => b.callback_data && b.callback_data.startsWith('ux:copiar:')), 'DVA deve ter botão de cópia');
  console.log('  ✓ Presets de 1-toque determinísticos executados em 0ms com botões de cópia válidos.');

  // 4. Teste de Comandos Diretos /calc Determinísticos
  console.log('\n[4] Testando Comandos Diretos /calc Determinísticos...');

  // 4.1 /calc holliday 12
  msgs = enviarTextoComando('/calc holliday 12');
  let resCmdHolliday = msgs.find(m => m.texto && /holliday/i.test(m.texto));
  assert(resCmdHolliday, '/calc holliday 12 deve calcular determinístico');
  assert(resCmdHolliday.kb.inline_keyboard.flat().some(b => b.callback_data && b.callback_data.startsWith('ux:copiar:')), 'Deve anexar botão de cópia');
  assert(resCmdHolliday.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:calc'), 'Deve anexar [🔙 Calculadoras]');

  // 4.2 /calc parkland 70 25
  msgs = enviarTextoComando('/calc parkland 70 25');
  let resCmdParkland = msgs.find(m => m.texto && /parkland/i.test(m.texto));
  assert(resCmdParkland, '/calc parkland 70 25 deve calcular determinístico');
  assert(resCmdParkland.kb.inline_keyboard.flat().some(b => b.callback_data && b.callback_data.startsWith('ux:copiar:')), 'Deve anexar botão de cópia');

  // 4.3 /calc glasgow 4 5 6
  msgs = enviarTextoComando('/calc glasgow 4 5 6');
  let resCmdGlasgow = msgs.find(m => m.texto && /glasgow/i.test(m.texto));
  assert(resCmdGlasgow, '/calc glasgow 4 5 6 deve calcular determinístico');
  assert(resCmdGlasgow.kb.inline_keyboard.flat().some(b => b.callback_data && b.callback_data.startsWith('ux:copiar:')), 'Deve anexar botão de cópia');
  console.log('  ✓ Comandos /calc determinísticos validados com injeção de botões de cópia e hub.');

  // 5. Teste de Mensagens de Texto Livre com Fast-Path Determinístico
  console.log('\n[5] Testando Mensagens de Texto Livre com Fast-Path Determinístico...');

  msgs = enviarTextoComando('parkland 70kg 25%');
  let resFastParkland = msgs.find(m => m.texto && /parkland/i.test(m.texto));
  assert(resFastParkland, 'Texto livre "parkland 70kg 25%" deve resolver em 0ms no fast-path');
  assert(resFastParkland.kb.inline_keyboard.flat().some(b => b.callback_data && b.callback_data.startsWith('ux:copiar:')), 'Fast-path deve anexar botão de cópia');
  assert(resFastParkland.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:calc'), 'Fast-path deve anexar [🔙 Calculadoras]');

  msgs = enviarTextoComando('glasgow 3 3 4');
  let resFastGlasgow = msgs.find(m => m.texto && /glasgow/i.test(m.texto));
  assert(resFastGlasgow, 'Texto livre "glasgow 3 3 4" deve resolver em 0ms no fast-path');
  assert(resFastGlasgow.kb.inline_keyboard.flat().some(b => b.callback_data && b.callback_data.startsWith('ux:copiar:')), 'Fast-path deve anexar botão de cópia');
  console.log('  ✓ Fast-path de texto livre validado com anexação de teclado UX.');

  // 6. Teste da Ação de Cópia ux:copiar:<hash>
  console.log('\n[6] Testando Ação de Cópia ux:copiar:<hash>...');
  let cbCopia = btnCopiarGaso.callback_data;
  msgs = acionarCallback(cbCopia);
  let msgCopiaPronta = msgs.find(m => m.texto && m.texto.includes('PRONTO PARA O PRONTUÁRIO'));
  assert(msgCopiaPronta, 'ux:copiar:<hash> deve retornar mensagem com bloco formatado para cópia');
  assert(msgCopiaPronta.texto.includes('```text'), 'Texto deve estar envolvido em bloco ```text para 1-toque');
  console.log('  ✓ Bloco de cópia instantânea para prontuário validado com sucesso.');

  // 7. Retorno Contextual em Submenus Legados
  console.log('\n[7] Testando Retorno Contextual em Submenus Legados...');
  msgs = acionarCallback('calc_cat_renal');
  let msgSubRenal = msgs.find(m => m.texto && m.texto.includes('Calculadoras de Função Renal'));
  assert(msgSubRenal, 'calc_cat_renal deve responder');
  assert(msgSubRenal.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:calc'), 'Deve conter [🔙 Calculadoras]');
  assert(msgSubRenal.kb.inline_keyboard.flat().some(b => b.callback_data === 'calc_menu_principal'), 'Deve manter compatibilidade com [⬅️ Voltar]');
  console.log('  ✓ Submenus legados preservam retorno contextual.');

  console.log('\n=== TODOS OS TESTES DE CALCULADORAS CLÍNICAS PASSARAM COM SUCESSO! ===');
}

if (require.main === module) {
  testCalculadorasUX().catch(err => {
    console.error('Falha no teste:', err);
    process.exit(1);
  });
}

module.exports = { testCalculadorasUX };
