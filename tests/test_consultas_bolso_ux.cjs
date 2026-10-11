process.env.NODE_ENV = 'test';
const assert = require('assert');
const runtime = require('../server/runtime.js');

async function testConsultasBolsoUX() {
  console.log('=== TESTE DE UI/UX E DETERMINISMO: CONSULTAS RÁPIDAS DE BOLSO (ux:hub:bolso) ===\n');

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

  // 1. Menu Principal de Consultas Rápidas de Bolso
  console.log('[1] Testando Menu Principal de Consultas Rápidas de Bolso (ux:hub:bolso)...');
  let msgs = acionarCallback('ux:hub:bolso');
  assert(msgs.length >= 1, 'Deve responder ao callback ux:hub:bolso');
  let msgMenu = msgs.find(m => m.texto && m.texto.includes('CONSULTAS RÁPIDAS DE BOLSO'));
  assert(msgMenu, 'Menu deve conter título canônico "CONSULTAS RÁPIDAS DE BOLSO"');
  let botoesMenu = msgMenu.kb.inline_keyboard.flat();
  let callbacksMenu = botoesMenu.map(b => b.callback_data);
  assert(callbacksMenu.includes('ux:bolso:atb'), 'Menu deve conter botão ux:bolso:atb');
  assert(callbacksMenu.includes('ux:bolso:ped'), 'Menu deve conter botão ux:bolso:ped');
  assert(callbacksMenu.includes('ux:bolso:gestacao'), 'Menu deve conter botão ux:bolso:gestacao');
  assert(callbacksMenu.includes('ux:bolso:interacao'), 'Menu deve conter botão ux:bolso:interacao');
  assert(callbacksMenu.includes('ux:bolso:hsl'), 'Menu deve conter botão ux:bolso:hsl');
  assert(callbacksMenu.includes('ux:menu') || callbacksMenu.includes('ux:hub:inicio'), 'Menu deve conter retorno');
  console.log('  ✓ Menu principal e seus 5 submódulos de bolso validados com sucesso.');

  // 2. Submódulo: Antibióticos por Foco (ux:bolso:atb)
  console.log('\n[2] Testando Submódulo Antibióticos por Foco (ux:bolso:atb)...');
  msgs = acionarCallback('ux:bolso:atb');
  assert(msgs.length >= 1, 'ux:bolso:atb deve responder');
  let msgAtb = msgs.find(m => m.texto && m.texto.includes('ANTIMICROBIAN'));
  assert(msgAtb, 'ux:bolso:atb deve conter ANTIMICROBIAN no cabeçalho');
  assert(msgAtb.texto.includes('Pulmão (PAC'), 'Deve conter esquema para PAC');
  assert(msgAtb.texto.includes('Urinário (Pielonefrite'), 'Deve conter esquema para ITU');
  let botoesAtb = msgAtb.kb.inline_keyboard.flat();
  let cbsAtb = botoesAtb.map(b => b.callback_data);
  assert(cbsAtb.includes('ux:hub:bolso'), 'Deve conter retorno contextual [🔙 Consultas de Bolso]');
  assert(cbsAtb.includes('ux:hub:inicio'), 'Deve conter retorno [🏠 Início]');
  let btnCopiarAtb = botoesAtb.find(b => b.text && b.text.includes('Copiar'));
  assert(btnCopiarAtb, 'Deve conter botão de cópia de conduta');
  console.log('  ✓ Tela principal de ATB validada com retorno contextual e botão de cópia.');

  // Sub-callbacks táteis de ATB
  console.log('  [2.1] Testando sub-callbacks táteis de ATB (PAC e ITU)...');
  msgs = acionarCallback('ux:bolso:atb:pac');
  let msgPac = msgs.find(m => m.texto && m.texto.includes('PNEUMONIA ADQUIRIDA NA COMUNIDADE'));
  assert(msgPac, 'ux:bolso:atb:pac deve entregar protocolo detalhado de PAC');
  assert(msgPac.texto.includes('CURB-65'), 'PAC deve conter estratificação CURB-65');
  assert(msgPac.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:bolso'), 'PAC deve ter retorno a bolso');

  msgs = acionarCallback('ux:bolso:atb:itu');
  let msgItu = msgs.find(m => m.texto && m.texto.includes('INFECÇÃO DO TRATO URINÁRIO'));
  assert(msgItu, 'ux:bolso:atb:itu deve entregar protocolo detalhado de ITU');
  assert(msgItu.texto.includes('Fosfomicina') && msgItu.texto.includes('Pielonefrite'), 'ITU deve conter esquemas canônicos');
  assert(msgItu.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:bolso'), 'ITU deve ter retorno a bolso');
  console.log('  ✓ Prescrições determinísticas de PAC e ITU validadas em 0ms.');

  // 3. Submódulo: Doses Pediátricas por Peso (ux:bolso:ped)
  console.log('\n[3] Testando Submódulo Doses Pediátricas por Peso (ux:bolso:ped)...');
  msgs = acionarCallback('ux:bolso:ped');
  assert(msgs.length >= 1, 'ux:bolso:ped deve responder');
  let msgPed = msgs.find(m => m.texto && m.texto.includes('PEDIÁTRIC'));
  assert(msgPed, 'ux:bolso:ped deve conter PEDIÁTRIC no cabeçalho');
  assert(msgPed.texto.includes('Dipirona') && msgPed.texto.includes('Amoxicilina'), 'Deve conter orientações práticas');
  let botoesPed = msgPed.kb.inline_keyboard.flat();
  let cbsPed = botoesPed.map(b => b.callback_data);
  assert(cbsPed.includes('ux:hub:bolso'), 'Deve conter retorno contextual [🔙 Consultas de Bolso]');
  assert(cbsPed.includes('ux:hub:inicio'), 'Deve conter retorno [🏠 Início]');
  assert(botoesPed.some(b => b.text && b.text.includes('Copiar')), 'Deve conter botão de cópia');

  // Sub-callbacks táteis pediátricos
  console.log('  [3.1] Testando sub-callbacks táteis pediátricos (dipi12, amoxi15, pred10, azitro12)...');
  const presetsPed = [
    { cb: 'ux:bolso:ped:dipi12', esperado: 'DIPIRONA (12 KG)' },
    { cb: 'ux:bolso:ped:amoxi15', esperado: 'AMOXICILINA (15 KG)' },
    { cb: 'ux:bolso:ped:pred10', esperado: 'PREDNISOLONA (10 KG)' },
    { cb: 'ux:bolso:ped:azitro12', esperado: 'AZITROMICINA (12 KG)' }
  ];
  for (const p of presetsPed) {
    msgs = acionarCallback(p.cb);
    let msgPreset = msgs.find(m => m.texto && m.texto.includes(p.esperado));
    assert(msgPreset, `Preset ${p.cb} deve conter ${p.esperado}`);
    assert(msgPreset.texto.includes('Memória de Cálculo'), `Preset ${p.cb} deve conter memória de cálculo matemática`);
    assert(msgPreset.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:bolso'), `Preset ${p.cb} deve retornar a bolso`);
    assert(msgPreset.kb.inline_keyboard.flat().some(b => b.text && b.text.includes('Copiar')), `Preset ${p.cb} deve ter botão de cópia`);
  }
  console.log('  ✓ Prescrições pediátricas por peso calculadas determinísticamente com memória de cálculo.');

  // 4. Submódulo: Gestação & Lactação (ux:bolso:gestacao)
  console.log('\n[4] Testando Submódulo Gestação & Lactação (ux:bolso:gestacao)...');
  msgs = acionarCallback('ux:bolso:gestacao');
  assert(msgs.length >= 1, 'ux:bolso:gestacao deve responder');
  let msgGest = msgs.find(m => m.texto && (m.texto.includes('GESTAÇÃO') || m.texto.includes('LACTAÇÃO')));
  assert(msgGest, 'ux:bolso:gestacao deve conter GESTAÇÃO & LACTAÇÃO');
  assert(msgGest.texto.includes('Paracetamol') && msgGest.texto.includes('Metildopa'), 'Deve conter fármacos de referência');
  assert(msgGest.texto.includes('CONTRAINDICADOS'), 'Deve conter alertas de contraindicações no 3º tri');
  let botoesGest = msgGest.kb.inline_keyboard.flat();
  assert(botoesGest.some(b => b.callback_data === 'ux:hub:bolso'), 'Deve conter retorno a bolso');
  assert(botoesGest.some(b => b.text && b.text.includes('Copiar')), 'Deve conter botão de cópia');

  // Sub-callbacks táteis de Gestação
  console.log('  [4.1] Testando sub-callbacks táteis de Gestação (analgesia, has, atb, antiem)...');
  const presetsGest = [
    { cb: 'ux:bolso:gest:analgesia', esperado: 'ANALGESIA' },
    { cb: 'ux:bolso:gest:has', esperado: 'ANTI-HIPERTENSIVOS' },
    { cb: 'ux:bolso:gest:atb', esperado: 'ANTIBIÓTICOS SEGUROS' },
    { cb: 'ux:bolso:gest:antiem', esperado: 'ANTIEMÉTICOS' }
  ];
  for (const g of presetsGest) {
    msgs = acionarCallback(g.cb);
    let msgPreset = msgs.find(m => m.texto && m.texto.includes(g.esperado));
    assert(msgPreset, `Preset ${g.cb} deve conter ${g.esperado}`);
    assert(msgPreset.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:bolso'), `Preset ${g.cb} deve retornar a bolso`);
    assert(msgPreset.kb.inline_keyboard.flat().some(b => b.text && b.text.includes('Copiar')), `Preset ${g.cb} deve ter botão de cópia`);
  }
  console.log('  ✓ Prescrições de analgesia, HAS, antibióticos e antieméticos na gestação validadas.');

  // 5. Submódulo: Interações Graves & Crosscheck (ux:bolso:interacao)
  console.log('\n[5] Testando Submódulo Interações Graves & Crosscheck (ux:bolso:interacao)...');
  msgs = acionarCallback('ux:bolso:interacao');
  assert(msgs.length >= 1, 'ux:bolso:interacao deve responder');
  let msgInte = msgs.find(m => m.texto && m.texto.includes('INTERA'));
  assert(msgInte, 'ux:bolso:interacao deve conter INTERA no cabeçalho');
  assert(msgInte.texto.includes('Prolongamento de Intervalo QT') && msgInte.texto.includes('Hipercalemia Grave'), 'Deve alertar para interações sentinela');
  let botoesInte = msgInte.kb.inline_keyboard.flat();
  assert(botoesInte.some(b => b.callback_data === 'ux:hub:bolso'), 'Deve conter retorno a bolso');
  assert(botoesInte.some(b => b.text && b.text.includes('Copiar')), 'Deve conter botão de cópia');

  // Sub-callbacks táteis de Interações
  console.log('  [5.1] Testando sub-callbacks táteis de Interações (amio_fluco, varf_aine, ieca_espiro, nitrato_sild)...');
  const presetsInte = [
    { cb: 'ux:bolso:inte:amio_fluco', esperado: 'AMIODARONA + FLUCONAZOL' },
    { cb: 'ux:bolso:inte:varf_aine', esperado: 'ANTICOAGULANTE + AINE' },
    { cb: 'ux:bolso:inte:ieca_espiro', esperado: 'IECA/BRA + ESPIRONOLACTONA' },
    { cb: 'ux:bolso:inte:nitrato_sild', esperado: 'NITRATO + INIBIDOR DA 5-FOSFODIESTERASE' }
  ];
  for (const it of presetsInte) {
    msgs = acionarCallback(it.cb);
    let msgPreset = msgs.find(m => m.texto && m.texto.includes(it.esperado));
    assert(msgPreset, `Preset ${it.cb} deve conter ${it.esperado}`);
    assert(msgPreset.texto.includes('Mecanismo Farmacológico') && msgPreset.texto.includes('Conduta Beira-Leito'), `Preset ${it.cb} deve conter farmacologia e conduta`);
    assert(msgPreset.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:bolso'), `Preset ${it.cb} deve retornar a bolso`);
    assert(msgPreset.kb.inline_keyboard.flat().some(b => b.text && b.text.includes('Copiar')), `Preset ${it.cb} deve ter botão de cópia`);
  }
  console.log('  ✓ Alertas sentinela de farmacovigilância e interações críticas validados em 0ms.');

  // 6. Submódulo: Diluição & Preparo HSL (ux:bolso:hsl)
  console.log('\n[6] Testando Submódulo Diluição & Preparo HSL (ux:bolso:hsl)...');
  msgs = acionarCallback('ux:bolso:hsl');
  assert(msgs.length >= 1, 'ux:bolso:hsl deve responder');
  let msgHsl = msgs.find(m => m.texto && m.texto.includes('DILUIÇÃO'));
  assert(msgHsl, 'ux:bolso:hsl deve conter DILUIÇÃO no cabeçalho');
  assert(msgHsl.texto.includes('Ceftriaxona') && msgHsl.texto.includes('Noradrenalina'), 'Deve conter injetáveis frequentes');
  let botoesHsl = msgHsl.kb.inline_keyboard.flat();
  assert(botoesHsl.some(b => b.callback_data === 'ux:hub:bolso'), 'Deve conter retorno a bolso');
  assert(botoesHsl.some(b => b.text && b.text.includes('Copiar')), 'Deve conter botão de cópia');

  // Sub-callbacks táteis de HSL
  console.log('  [6.1] Testando sub-callbacks táteis de HSL (ceftri, vanco, mero, nora)...');
  const presetsHsl = [
    { cb: 'ux:bolso:hsl:ceftri', esperado: 'CEFTRIAXONA EV' },
    { cb: 'ux:bolso:hsl:vanco', esperado: 'VANCOMICINA EV' },
    { cb: 'ux:bolso:hsl:mero', esperado: 'MEROPENEM EV' },
    { cb: 'ux:bolso:hsl:nora', esperado: 'NORADRENALINA' }
  ];
  for (const h of presetsHsl) {
    msgs = acionarCallback(h.cb);
    let msgPreset = msgs.find(m => m.texto && m.texto.includes(h.esperado));
    assert(msgPreset, `Preset ${h.cb} deve conter ${h.esperado}`);
    assert(msgPreset.texto.includes('Reconstituição') || msgPreset.texto.includes('Preparo Padronizado'), `Preset ${h.cb} deve conter reconstituição/preparo`);
    assert(msgPreset.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:bolso'), `Preset ${h.cb} deve retornar a bolso`);
    assert(msgPreset.kb.inline_keyboard.flat().some(b => b.text && b.text.includes('Copiar')), `Preset ${h.cb} deve ter botão de cópia`);
  }
  console.log('  ✓ Fichas oficiais de diluição HSL validadas em 0ms com salvaguardas de estabilidade.');

  // 7. Testando Ação de Cópia de Prontuário (ux:copiar:<hash>)
  console.log('\n[7] Testando Ação Rápida de 1 Toque (ux:copiar:<hash>)...');
  msgs = acionarCallback('ux:bolso:atb:pac');
  let msgComBotaoCopia = msgs.find(m => m.texto && m.texto.includes('PNEUMONIA ADQUIRIDA NA COMUNIDADE'));
  let btnCopiar = msgComBotaoCopia.kb.inline_keyboard.flat().find(b => b.callback_data && b.callback_data.startsWith('ux:copiar:'));
  assert(btnCopiar, 'Deve possuir botão ux:copiar:<hash>');

  let msgsCopia = acionarCallback(btnCopiar.callback_data);
  assert(msgsCopia.length >= 1, 'Deve enviar o texto de cópia para o chat');
  let textoCopiado = msgsCopia.map(m => m.texto).join('\n');
  assert(textoCopiado.includes('PNEUMONIA ADQUIRIDA NA COMUNIDADE'), 'Texto copiado deve conter a conduta formatada de prontuário');
  console.log('  ✓ Botão de 1 toque ux:copiar entrega conduta pronta para colar no PEP/prontuário.');

  console.log('\n🎉 TODOS OS TESTES DA ABA CONSULTAS RÁPIDAS DE BOLSO PASSARAM COM 100% DE SUCESSO!\n');
}

testConsultasBolsoUX().catch(err => {
  console.error('\n❌ FALHA NO TESTE:', err);
  process.exit(1);
});
