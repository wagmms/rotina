process.env.NODE_ENV = 'test';
const assert = require('assert');
const runtime = require('../server/runtime.js');

async function testGoHubUX() {
  console.log('=== TESTE DE UI/UX E DETERMINISMO: HUB GINECOLOGIA & OBSTETRÍCIA (ux:rotina:go) ===\n');

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

  // 1. Menu Principal do Hub G&O (ux:rotina:go e ux:hub:go)
  console.log('[1] Testando Menu Principal de G&O (ux:rotina:go, ux:hub:go e comando /go)...');

  const rotasHub = ['ux:rotina:go', 'ux:hub:go'];
  for (const rota of rotasHub) {
    let msgs = acionarCallback(rota);
    assert(msgs.length >= 1, `Deve responder ao callback ${rota}`);
    let msgMenu = msgs.find(m => m.texto && (m.texto.includes('Ginecologia') || m.texto.includes('G&O')));
    assert(msgMenu, `Menu de ${rota} deve conter título com Ginecologia / G&O`);
    let botoesMenu = msgMenu.kb.inline_keyboard.flat();
    let callbacksMenu = botoesMenu.map(b => b.callback_data);

    // Conferir os 10 submódulos no teclado
    assert(callbacksMenu.includes('go_prenatal') || callbacksMenu.includes('ux:go:prenatal'), 'Menu deve conter Pré-Natal');
    assert(callbacksMenu.includes('go_parto') || callbacksMenu.includes('ux:go:parto'), 'Menu deve conter Parto');
    assert(callbacksMenu.includes('go_hpp') || callbacksMenu.includes('ux:go:hpp'), 'Menu deve conter HPP');
    assert(callbacksMenu.includes('go_mgso4') || callbacksMenu.includes('ux:go:mgso4'), 'Menu deve conter MgSO4');
    assert(callbacksMenu.includes('go_prematuridade') || callbacksMenu.includes('ux:go:prematuridade'), 'Menu deve conter Prematuridade');
    assert(callbacksMenu.includes('go_toxo') || callbacksMenu.includes('ux:go:toxo'), 'Menu deve conter Toxo');
    assert(callbacksMenu.includes('go_corrimento') || callbacksMenu.includes('ux:go:corrimento'), 'Menu deve conter Corrimento / Vulvovaginites');
    assert(callbacksMenu.includes('go_preventivo') || callbacksMenu.includes('ux:go:preventivo'), 'Menu deve conter Preventivo');
    assert(callbacksMenu.includes('go_anticoncepcao') || callbacksMenu.includes('ux:go:anticoncepcao'), 'Menu deve conter Anticoncepção');
    assert(callbacksMenu.includes('go_dip') || callbacksMenu.includes('ux:go:dip'), 'Menu deve conter DIP');
    assert(callbacksMenu.includes('ux:hub:inicio'), 'Menu deve conter [🏠 Início]');
  }

  // Comando de texto /go
  let msgsCmdGo = enviarTextoComando('/go');
  let msgCmdGo = msgsCmdGo.find(m => m.texto && (m.texto.includes('GINECOLOGIA') || m.texto.includes('Ginecologia')));
  assert(msgCmdGo, 'Comando /go deve exibir Menu do Hub G&O');
  let botoesCmdGo = msgCmdGo.kb.inline_keyboard.flat().map(b => b.callback_data);
  assert(botoesCmdGo.includes('go_prenatal'), '/go deve conter go_prenatal');
  assert(botoesCmdGo.includes('go_parto'), '/go deve conter go_parto');
  assert(botoesCmdGo.includes('go_dip'), '/go deve conter go_dip');
  assert(botoesCmdGo.includes('ux:hub:inicio'), '/go deve conter [🏠 Início]');
  console.log('  ✓ Menu principal e navegação do Hub G&O validados com sucesso.');

  // 2. Telas Interativas dos 10 Submódulos (com 100% de retorno contextual e botão de cópia)
  console.log('\n[2] Testando Telas Interativas dos 10 Submódulos com Retorno Contextual e Cópia...');

  const submodulos = [
    { nome: 'Pré-Natal & DPP', cbLegacy: 'go_prenatal', cbUx: 'ux:go:prenatal', termoEsperado: 'PRÉ-NATAL' },
    { nome: 'Parto & Partograma', cbLegacy: 'go_parto', cbUx: 'ux:go:parto', termoEsperado: 'PARTO' },
    { nome: 'HPP 4 Ts', cbLegacy: 'go_hpp', cbUx: 'ux:go:hpp', termoEsperado: 'HEMORRAGIA PÓS-PARTO' },
    { nome: 'Pré-Eclâmpsia & MgSO4', cbLegacy: 'go_mgso4', cbUx: 'ux:go:mgso4', termoEsperado: 'MAGNÉSIO' },
    { nome: 'Prematuridade & RPMO', cbLegacy: 'go_prematuridade', cbUx: 'ux:go:prematuridade', termoEsperado: 'PREMATUR' },
    { nome: 'Toxoplasmose', cbLegacy: 'go_toxo', cbUx: 'ux:go:toxo', termoEsperado: 'TOXOPLASMOSE' },
    { nome: 'Vulvovaginites', cbLegacy: 'go_corrimento', cbUx: 'ux:go:corrimento', termoEsperado: 'VULVOVAGINITES' },
    { nome: 'Preventivo INCA', cbLegacy: 'go_preventivo', cbUx: 'ux:go:preventivo', termoEsperado: 'CITOPATOLÓGIC' },
    { nome: 'Anticoncepção OMS', cbLegacy: 'go_anticoncepcao', cbUx: 'ux:go:anticoncepcao', termoEsperado: 'CONTRACEPÇÃO' },
    { nome: 'DIP & ATO', cbLegacy: 'go_dip', cbUx: 'ux:go:dip', termoEsperado: 'PÉLVICA' }
  ];

  for (const sm of submodulos) {
    // Testa via callback nativo UX (ux:go:<submodulo>)
    let msgsTela = acionarCallback(sm.cbUx);
    assert(msgsTela.length >= 1, `Submódulo ${sm.nome} deve responder ao callback ${sm.cbUx}`);
    let tela = msgsTela.find(m => m.texto && m.texto.includes(sm.termoEsperado));
    assert(tela, `Tela do submódulo ${sm.nome} deve conter '${sm.termoEsperado}'`);

    let botoesTela = tela.kb.inline_keyboard.flat();
    let cbTela = botoesTela.map(b => b.callback_data);

    // Validação estrita do Protocolo de Ouro
    assert(cbTela.includes('ux:rotina:go'), `Submódulo ${sm.nome} DEVE conter botão [🔙 Hub G&O] (ux:rotina:go)`);
    assert(cbTela.includes('ux:hub:inicio'), `Submódulo ${sm.nome} DEVE conter botão [🏠 Início] (ux:hub:inicio)`);
    assert(cbTela.some(c => c && c.startsWith('ux:copiar:')), `Submódulo ${sm.nome} DEVE conter botão de cópia de 1 toque (ux:copiar:<hash>)`);

    // Testa compatibilidade retroativa com callback legado (go_<submodulo>)
    let msgsLegacy = acionarCallback(sm.cbLegacy);
    assert(msgsLegacy.length >= 1, `Callback legado ${sm.cbLegacy} deve responder`);
    let telaLegacy = msgsLegacy.find(m => m.texto && (m.texto.includes(sm.termoEsperado) || m.texto.includes('G&O')));
    assert(telaLegacy, `Tela legada ${sm.cbLegacy} deve carregar conteúdo`);
    let cbLegacy = telaLegacy.kb.inline_keyboard.flat().map(b => b.callback_data);
    assert(cbLegacy.includes('ux:rotina:go'), `Callback legado ${sm.cbLegacy} deve conter retorno [🔙 Hub G&O]`);
    assert(cbLegacy.includes('ux:hub:inicio'), `Callback legado ${sm.cbLegacy} deve conter retorno [🏠 Início]`);

    console.log(`  ✓ Submódulo ${sm.nome} validado com retorno [🔙 Hub G&O], [🏠 Início] e botão de cópia.`);
  }

  // 3. Presets Clínicos Determinísticos de 1-Toque (0ms)
  console.log('\n[3] Testando Presets Determinísticos de 1-Toque (0ms)...');

  const presets = [
    // Pré-Natal
    { cb: 'ux:go:prenatal:dum', termo: 'CRONOLOGIA OBSTÉTRICA' },
    { cb: 'ux:go:prenatal:med', termo: 'FARMACOLÓGICA' },
    { cb: 'ux:go:prenatal:soro', termo: 'PRÉ-NATAL' },
    // Parto
    { cb: 'ux:go:parto:ativa', termo: 'PARTO' },
    { cb: 'ux:go:parto:bishop', termo: 'BISHOP' },
    { cb: 'ux:go:parto:expulsivo', termo: 'EXPULSIVO' },
    // HPP
    { cb: 'ux:go:hpp:atonia', termo: 'ATONIA' },
    { cb: 'ux:go:hpp:trauma', termo: 'TRAUMA' },
    { cb: 'ux:go:hpp:tecido', termo: 'RESTOS' },
    // MgSO4
    { cb: 'ux:go:mgso4:zuspan', termo: 'ZUSPAN' },
    { cb: 'ux:go:mgso4:crise', termo: 'CRISE HIPERTENSIVA' },
    { cb: 'ux:go:mgso4:intox', termo: 'INTOXICAÇÃO' },
    // Prematuridade
    { cb: 'ux:go:prematuridade:tpp', termo: 'PREMATURO' },
    { cb: 'ux:go:prematuridade:rpmo', termo: 'RPMO' },
    { cb: 'ux:go:prematuridade:corio', termo: 'CORIOAMNIONITE' },
    // Toxo
    { cb: 'ux:go:toxo:aguda', termo: 'TOXOPLASMOSE' },
    { cb: 'ux:go:toxo:previa', termo: 'INFECÇÃO PREGRESSA' },
    { cb: 'ux:go:toxo:fetal', termo: 'ESQUEMA TRÍPLICE' },
    // Corrimento
    { cb: 'ux:go:corrimento:candida', termo: 'CANDIDÍASE' },
    { cb: 'ux:go:corrimento:vaginose', termo: 'VAGINOSE' },
    { cb: 'ux:go:corrimento:tricomoniase', termo: 'TRICOMONÍASE' },
    // Preventivo
    { cb: 'ux:go:preventivo:ascus', termo: 'ASC-US' },
    { cb: 'ux:go:preventivo:lsil', termo: 'LSIL' },
    { cb: 'ux:go:preventivo:hsil', termo: 'HSIL' },
    // Anticoncepção
    { cb: 'ux:go:anticoncepcao:enxaqueca', termo: 'ENXAQUECA' },
    { cb: 'ux:go:anticoncepcao:tabagista', termo: 'TABAGISTA' },
    { cb: 'ux:go:anticoncepcao:puerpera', termo: 'PUÉRPERA' },
    // DIP
    { cb: 'ux:go:dip:monif1', termo: 'DIP' },
    { cb: 'ux:go:dip:hospitalar', termo: 'MONIF' },
    { cb: 'ux:go:dip:parceiro', termo: 'PARCEIROS' }
  ];

  let btnCopiaAmostra = null;

  for (const preset of presets) {
    let msgsPreset = acionarCallback(preset.cb);
    assert(msgsPreset.length >= 1, `Preset ${preset.cb} deve responder imediatamente`);
    let regex = new RegExp(preset.termo, 'i');
    let resposta = msgsPreset.find(m => m.texto && regex.test(m.texto));
    assert(resposta, `Preset ${preset.cb} deve conter '${preset.termo}'`);

    let botoesPreset = resposta.kb.inline_keyboard.flat();
    let cbPreset = botoesPreset.map(b => b.callback_data);

    assert(cbPreset.includes('ux:rotina:go'), `Preset ${preset.cb} deve conter [🔙 Hub G&O]`);
    assert(cbPreset.includes('ux:hub:inicio'), `Preset ${preset.cb} deve conter [🏠 Início]`);

    let btnCopia = botoesPreset.find(b => b.callback_data && b.callback_data.startsWith('ux:copiar:'));
    assert(btnCopia, `Preset ${preset.cb} deve conter botão de cópia de 1 toque`);
    btnCopiaAmostra = btnCopia;
  }
  console.log(`  ✓ Todos os ${presets.length} presets determinísticos de 0ms validados com sucesso.`);

  // 4. Teste da Ação de Cópia ux:copiar:<hash>
  console.log('\n[4] Testando Ação de Cópia ux:copiar:<hash> em Conduta de G&O...');
  assert(btnCopiaAmostra, 'Deve existir um botão de cópia de amostra');
  let msgsCopia = acionarCallback(btnCopiaAmostra.callback_data);
  let msgCopia = msgsCopia.find(m => m.texto && m.texto.includes('PRONTO PARA O PRONTUÁRIO'));
  assert(msgCopia, 'Callback ux:copiar deve retornar bloco PRONTO PARA O PRONTUÁRIO');
  assert(msgCopia.texto.includes('```text'), 'Texto deve estar em bloco ```text para cópia instantânea');
  console.log('  ✓ Botão de 1 toque [📋 Copiar Conduta para Prontuário] validado com sucesso.');

  // 5. Teste de Comandos Diretos de Texto com Parâmetros
  console.log('\n[5] Testando Comandos Diretos de Texto com Parâmetros...');

  const comandosTeste = [
    { cmd: '/prenatal DUM 10/02/2026 peso 65 alt 1.62', termo: 'PRÉ-NATAL' },
    { cmd: '/parto dil 6cm 3/10 40s lee 0 bcf 140', termo: 'PARTO' },
    { cmd: '/hpp perda 1200ml fc 120 pas 80 has', termo: 'HEMORRAGIA PÓS-PARTO' },
    { cmd: '/mgso4 zuspan pa 170x110 cefaleia fr 14 diurese 30', termo: 'PRÉ-ECLÂMPSIA' },
    { cmd: '/prematuridade 30 semanas dinamica uterina presente bolsa integra', termo: 'PREMATURIDADE' },
    { cmd: '/toxo igg reagente igm reagente avidez alta 10s', termo: 'TOXOPLASMOSE' },
    { cmd: '/corrimento branco grumoso prurido', termo: 'GINECOLOGIA' },
    { cmd: '/preventivo lsil 28 anos', termo: 'GINECOLOGIA' },
    { cmd: '/anticoncepcao 35 anos enxaqueca com aura', termo: 'GINECOLOGIA' },
    { cmd: '/dip dor hipogastrio febre 38.5 mobilizacao colo positiva', termo: 'DIP' }
  ];

  for (const ct of comandosTeste) {
    let msgsCmd = enviarTextoComando(ct.cmd);
    assert(msgsCmd.length >= 1, `Comando ${ct.cmd} deve responder`);
    let respCmd = msgsCmd.find(m => m.texto && m.texto.includes(ct.termo));
    assert(respCmd, `Resposta de ${ct.cmd} deve conter '${ct.termo}'`);

    let botoesCmd = respCmd.kb.inline_keyboard.flat().map(b => b.callback_data);
    assert(botoesCmd.includes('ux:rotina:go'), `Comando ${ct.cmd} deve conter [🔙 Hub G&O]`);
    assert(botoesCmd.includes('ux:hub:inicio'), `Comando ${ct.cmd} deve conter [🏠 Início]`);
    assert(botoesCmd.some(c => c && c.startsWith('ux:copiar:')), `Comando ${ct.cmd} deve conter botão de cópia`);
    console.log(`  ✓ Comando ${ct.cmd.split(' ')[0]} validado com retorno contextual e cópia.`);
  }

  // 6. Teste de Comandos Vazios Abrindo Suas Respectivas Telas
  console.log('\n[6] Testando Comandos Vazios Direcionando às Telas Interativas...');
  const comandosVazios = [
    { cmd: '/prenatal', termo: 'PRÉ-NATAL' },
    { cmd: '/parto', termo: 'PARTO' },
    { cmd: '/hpp', termo: 'HEMORRAGIA PÓS-PARTO' },
    { cmd: '/mgso4', termo: 'PRÉ-ECLÂMPSIA' },
    { cmd: '/prematuridade', termo: 'PREMATUR' },
    { cmd: '/toxo', termo: 'TOXOPLASMOSE' },
    { cmd: '/corrimento', termo: 'VULVOVAGINITES' },
    { cmd: '/preventivo', termo: 'CITOPATOLÓGIC' },
    { cmd: '/anticoncepcao', termo: 'CONTRACEPÇÃO' },
    { cmd: '/dip', termo: 'PÉLVICA' }
  ];

  for (const cv of comandosVazios) {
    let msgsCv = enviarTextoComando(cv.cmd);
    assert(msgsCv.length >= 1, `Comando vazio ${cv.cmd} deve responder`);
    let respCv = msgsCv.find(m => m.texto && m.texto.includes(cv.termo));
    assert(respCv, `Comando vazio ${cv.cmd} deve exibir tela contendo '${cv.termo}'`);
    let botoesCv = respCv.kb.inline_keyboard.flat().map(b => b.callback_data);
    assert(botoesCv.includes('ux:rotina:go') || botoesCv.includes('ux:menu'), `Comando vazio ${cv.cmd} deve conter navegação`);
    assert(botoesCv.includes('ux:hub:inicio'), `Comando vazio ${cv.cmd} deve conter [🏠 Início]`);
    console.log(`  ✓ Comando vazio ${cv.cmd} abriu tela dedicada com navegação contextual.`);
  }

  console.log('\n=== TODOS OS TESTES DO HUB G&O PASSARAM COM 100% DE SUCESSO! ===');
}

if (require.main === module) {
  testGoHubUX().catch(err => {
    console.error('Falha no teste:', err);
    process.exit(1);
  });
}

module.exports = { testGoHubUX };
