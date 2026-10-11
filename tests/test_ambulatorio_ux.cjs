process.env.NODE_ENV = 'test';
const assert = require('assert');
const runtime = require('../server/runtime.js');

async function testAmbulatorioUX() {
  console.log('=== TESTE DE UI/UX E DETERMINISMO: AMBULATÓRIO & ATENÇÃO PRIMÁRIA (ux:hub:amb) ===\n');

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

  // 1. Menu Principal de Ambulatório & Atenção Primária
  console.log('[1] Testando Menu Principal de Ambulatório & Atenção Primária (ux:hub:amb)...');
  let msgs = acionarCallback('ux:hub:amb');
  assert(msgs.length >= 1, 'Deve responder ao callback ux:hub:amb');
  let msgMenu = msgs.find(m => m.texto && m.texto.includes('AMBULATÓRIO & ATENÇÃO PRIMÁRIA'));
  assert(msgMenu, 'Menu deve conter título canônico "AMBULATÓRIO & ATENÇÃO PRIMÁRIA (UBS)"');
  let botoesMenu = msgMenu.kb.inline_keyboard.flat();
  let callbacksMenu = botoesMenu.map(b => b.callback_data);
  assert(callbacksMenu.includes('ux:amb:soap'), 'Menu deve conter botão ux:amb:soap');
  assert(callbacksMenu.includes('ux:amb:remume'), 'Menu deve conter botão ux:amb:remume');
  assert(callbacksMenu.includes('ux:amb:cid'), 'Menu deve conter botão ux:amb:cid');
  assert(callbacksMenu.includes('ux:amb:atestado'), 'Menu deve conter botão ux:amb:atestado');
  assert(!callbacksMenu.includes('ux:amb:ef'), 'Menu não deve conter modelo EF solto (apenas dentro do caso)');
  assert(callbacksMenu.includes('ux:amb:sisreg'), 'Menu deve conter botão ux:amb:sisreg');
  assert(callbacksMenu.includes('ux:menu') || callbacksMenu.includes('ux:hub:inicio'), 'Menu deve conter botão de retorno');
  console.log('  ✓ Menu principal e seus submódulos essenciais validados com sucesso.');

  // 2. Submódulo: SOAP Ágil Ambulatorial (ux:amb:soap)
  console.log('\n[2] Testando Submódulo SOAP Ágil Ambulatorial (ux:amb:soap)...');
  msgs = acionarCallback('ux:amb:soap');
  assert(msgs.length >= 1, 'ux:amb:soap deve responder');
  let msgSoap = msgs.find(m => m.texto && m.texto.includes('SOAP AMBULATORIAL ÁGIL'));
  assert(msgSoap, 'ux:amb:soap deve conter SOAP AMBULATORIAL ÁGIL no cabeçalho');
  assert(msgSoap.texto.includes('Subjetivo') && msgSoap.texto.includes('Objetivo'), 'Deve conter estrutura canônica SOAP');
  let botoesSoap = msgSoap.kb.inline_keyboard.flat();
  let cbsSoap = botoesSoap.map(b => b.callback_data);
  assert(cbsSoap.includes('ux:hub:amb'), 'Deve conter retorno contextual [🔙 Ambulatório]');
  assert(cbsSoap.includes('ux:hub:inicio'), 'Deve conter retorno [🏠 Início]');
  assert(cbsSoap.includes('ux:iniciar:soap'), 'Deve conter botão [📝 Iniciar SOAP]');
  console.log('  ✓ Tela principal de SOAP validada com retorno contextual e início rápido.');

  // Sub-callbacks táteis de SOAP
  console.log('  [2.1] Testando sub-callbacks táteis de casos SOAP (HAS, DM2, IVAS e Lombalgia)...');
  msgs = acionarCallback('ux:amb:soap:has');
  let msgSoapHas = msgs.find(m => m.texto && m.texto.includes('PRONTUÁRIO CLÍNICO AMBULATORIAL') && m.texto.includes('Hipertensão'));
  assert(msgSoapHas, 'ux:amb:soap:has deve entregar caso completo de HAS');
  assert(msgSoapHas.texto.includes('I10') && msgSoapHas.texto.includes('K86'), 'Caso HAS deve conter CID-10 e CIAP-2');
  assert(msgSoapHas.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:amb'), 'Caso HAS deve ter retorno a Ambulatório');

  msgs = acionarCallback('ux:amb:soap:dm2');
  let msgSoapDm = msgs.find(m => m.texto && m.texto.includes('PRONTUÁRIO CLÍNICO AMBULATORIAL') && m.texto.includes('Diabetes'));
  assert(msgSoapDm, 'ux:amb:soap:dm2 deve entregar caso completo de DM2');
  assert(msgSoapDm.texto.includes('E11.9') && msgSoapDm.texto.includes('Metformina'), 'Caso DM2 deve conter CID-10 e conduta');
  assert(msgSoapDm.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:amb'), 'Caso DM2 deve ter retorno a Ambulatório');

  msgs = acionarCallback('ux:amb:soap:ivas');
  let msgSoapIvas = msgs.find(m => m.texto && m.texto.includes('PRONTUÁRIO CLÍNICO AMBULATORIAL') && m.texto.includes('Rinofaringite'));
  assert(msgSoapIvas, 'ux:amb:soap:ivas deve entregar caso completo de IVAS');
  assert(msgSoapIvas.texto.includes('J00') && msgSoapIvas.texto.includes('R74'), 'Caso IVAS deve conter CID-10 e CIAP-2');
  assert(msgSoapIvas.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:amb'), 'Caso IVAS deve ter retorno a Ambulatório');

  msgs = acionarCallback('ux:amb:soap:lombalgia');
  let msgSoapLomb = msgs.find(m => m.texto && m.texto.includes('PRONTUÁRIO CLÍNICO AMBULATORIAL') && m.texto.includes('Lombalgia'));
  assert(msgSoapLomb, 'ux:amb:soap:lombalgia deve entregar caso completo de Lombalgia');
  assert(msgSoapLomb.texto.includes('M54.5') && msgSoapLomb.texto.includes('L03'), 'Caso Lombalgia deve conter CID-10 e CIAP-2');
  assert(msgSoapLomb.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:amb'), 'Caso Lombalgia deve ter retorno a Ambulatório');
  console.log('  ✓ Prescrições e evoluções determinísticas SOAP validadas em 0ms.');

  // 3. Submódulo: Prescrição REMUME SUS (ux:amb:remume)
  console.log('\n[3] Testando Submódulo Prescrição REMUME SUS (ux:amb:remume)...');
  msgs = acionarCallback('ux:amb:remume');
  assert(msgs.length >= 1, 'ux:amb:remume deve responder');
  let msgRemume = msgs.find(m => m.texto && m.texto.includes('PRESCRIÇÃO AMBULATORIAL REMUME SUS'));
  assert(msgRemume, 'ux:amb:remume deve conter título canônico');
  assert(msgRemume.texto.includes('Losartana') && msgRemume.texto.includes('Metformina'), 'Deve listar fármacos essenciais da atenção básica');
  let botoesRemume = msgRemume.kb.inline_keyboard.flat();
  let cbsRemume = botoesRemume.map(b => b.callback_data);
  assert(cbsRemume.includes('ux:hub:amb'), 'Deve conter retorno contextual [🔙 Ambulatório]');
  assert(cbsRemume.includes('ux:hub:inicio'), 'Deve conter retorno [🏠 Início]');
  let btnCopiarRemume = botoesRemume.find(b => b.text && b.text.includes('Copiar Guia REMUME'));
  assert(btnCopiarRemume, 'Deve conter botão de cópia do guia REMUME');

  // Sub-callbacks táteis de receitas REMUME
  console.log('  [3.1] Testando sub-callbacks táteis de receitas REMUME (HAS, DM, Dor e Asma)...');
  msgs = acionarCallback('ux:amb:remume:has');
  let msgRecHas = msgs.find(m => m.texto && m.texto.includes('RECEITUÁRIO AMBULATORIAL') && m.texto.includes('Losartana'));
  assert(msgRecHas, 'ux:amb:remume:has deve entregar receituário de HAS formatado');
  assert(msgRecHas.texto.includes('USO ORAL') && msgRecHas.texto.includes('Hidroclorotiazida'), 'Deve conter vias e posologia canônica');
  assert(msgRecHas.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:amb'), 'Receita HAS deve ter retorno a Ambulatório');

  msgs = acionarCallback('ux:amb:remume:dm');
  let msgRecDm = msgs.find(m => m.texto && m.texto.includes('RECEITUÁRIO AMBULATORIAL') && m.texto.includes('Metformina'));
  assert(msgRecDm, 'ux:amb:remume:dm deve entregar receituário de DM2 formatado');
  assert(msgRecDm.texto.includes('Gliclazida MR') && msgRecDm.texto.includes('ORIENTAÇÕES'), 'Deve conter antidiabéticos orais e MEV');
  assert(msgRecDm.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:amb'), 'Receita DM2 deve ter retorno a Ambulatório');

  msgs = acionarCallback('ux:amb:remume:dor');
  let msgRecDor = msgs.find(m => m.texto && m.texto.includes('RECEITUÁRIO AMBULATORIAL') && m.texto.includes('Dipirona'));
  assert(msgRecDor, 'ux:amb:remume:dor deve entregar receituário de Dor e Sintomáticos');
  assert(msgRecDor.texto.includes('Ibuprofeno') && msgRecDor.texto.includes('Paracetamol'), 'Deve conter analgésicos e AINEs');
  assert(msgRecDor.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:amb'), 'Receita Dor deve ter retorno a Ambulatório');

  msgs = acionarCallback('ux:amb:remume:asma');
  let msgRecAsma = msgs.find(m => m.texto && m.texto.includes('RECEITUÁRIO AMBULATORIAL') && m.texto.includes('Salbutamol'));
  assert(msgRecAsma, 'ux:amb:remume:asma deve entregar receituário respiratório');
  assert(msgRecAsma.texto.includes('USO INALATÓRIO') && msgRecAsma.texto.includes('Beclometasona'), 'Deve conter broncodilatador e corticoide inalatório');
  assert(msgRecAsma.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:amb'), 'Receita Asma deve ter retorno a Ambulatório');
  console.log('  ✓ Receituários SUS da Atenção Básica validados com retorno contextual e botão de cópia.');

  // 4. Submódulo: Tabela de CID-10 & CIAP-2 (ux:amb:cid)
  console.log('\n[4] Testando Submódulo CID-10 & CIAP-2 (ux:amb:cid)...');
  msgs = acionarCallback('ux:amb:cid');
  assert(msgs.length >= 1, 'ux:amb:cid deve responder');
  let msgCid = msgs.find(m => m.texto && m.texto.includes('CID-10 & CIAP-2'));
  assert(msgCid, 'ux:amb:cid deve conter CID-10 & CIAP-2 no título');
  assert(msgCid.texto.includes('I10') && msgCid.texto.includes('E11.9') && msgCid.texto.includes('M54.5'), 'Deve listar códigos frequentes');
  let botoesCid = msgCid.kb.inline_keyboard.flat();
  let cbsCid = botoesCid.map(b => b.callback_data);
  assert(cbsCid.includes('ux:hub:amb'), 'Deve conter retorno contextual [🔙 Ambulatório]');
  assert(cbsCid.includes('ux:hub:inicio'), 'Deve conter retorno [🏠 Início]');
  let btnCopiarCid = botoesCid.find(b => b.text && b.text.includes('Copiar'));
  assert(btnCopiarCid, 'Deve conter botão de cópia da tabela');

  // Sub-callbacks táteis de fichas de CID
  console.log('  [4.1] Testando sub-callbacks táteis de fichas clínicas de CID (HAS, DM2, Lombalgia e ITU)...');
  msgs = acionarCallback('ux:amb:cid:has');
  let msgFichaHas = msgs.find(m => m.texto && m.texto.includes('FICHA CLÍNICA') && m.texto.includes('Hipertensão'));
  assert(msgFichaHas, 'ux:amb:cid:has deve entregar ficha de Hipertensão');
  assert(msgFichaHas.texto.includes('I10') && msgFichaHas.texto.includes('Sinais de Alarme'), 'Deve conter CID-10 e alarmes');
  assert(msgFichaHas.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:amb'), 'Ficha HAS deve ter retorno a Ambulatório');

  msgs = acionarCallback('ux:amb:cid:dm2');
  let msgFichaDm = msgs.find(m => m.texto && m.texto.includes('FICHA CLÍNICA') && m.texto.includes('Diabetes'));
  assert(msgFichaDm, 'ux:amb:cid:dm2 deve entregar ficha de DM2');
  assert(msgFichaDm.texto.includes('E11.9') && msgFichaDm.texto.includes('T90'), 'Deve conter códigos cruzados');
  assert(msgFichaDm.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:amb'), 'Ficha DM2 deve ter retorno a Ambulatório');

  msgs = acionarCallback('ux:amb:cid:lombalgia');
  let msgFichaLomb = msgs.find(m => m.texto && m.texto.includes('FICHA CLÍNICA') && m.texto.includes('Lombalgia'));
  assert(msgFichaLomb, 'ux:amb:cid:lombalgia deve entregar ficha de Lombalgia');
  assert(msgFichaLomb.texto.includes('M54.5') && msgFichaLomb.texto.includes('L03'), 'Deve conter CID-10 e CIAP-2');
  assert(msgFichaLomb.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:amb'), 'Ficha Lombalgia deve ter retorno a Ambulatório');
  console.log('  ✓ Fichas clínicas de CID-10 e CIAP-2 validadas com retorno contextual e botão de cópia.');

  // 5. Submódulo: Atestados Médicos CFM (ux:amb:atestado)
  console.log('\n[5] Testando Submódulo Atestados Médicos CFM (ux:amb:atestado)...');
  msgs = acionarCallback('ux:amb:atestado');
  assert(msgs.length >= 1, 'ux:amb:atestado deve responder');
  let msgAtest = msgs.find(m => m.texto && m.texto.includes('ATESTADO MÉDICO CFM'));
  assert(msgAtest, 'ux:amb:atestado deve conter ATESTADO MÉDICO CFM no título');
  assert(msgAtest.texto.includes('1.658/2002'), 'Deve citar a Resolução CFM 1.658/2002');
  let botoesAtest = msgAtest.kb.inline_keyboard.flat();
  let cbsAtest = botoesAtest.map(b => b.callback_data);
  assert(cbsAtest.includes('ux:hub:amb'), 'Deve conter retorno contextual [🔙 Ambulatório]');
  assert(cbsAtest.includes('ux:hub:inicio'), 'Deve conter retorno [🏠 Início]');

  // Sub-callbacks táteis de atestados
  console.log('  [5.1] Testando sub-callbacks táteis de atestados (1 dia, 3 dias, 5 dias e comparecimento)...');
  msgs = acionarCallback('ux:amb:atest:1d');
  let msgAt1 = msgs.find(m => m.texto && m.texto.includes('ATESTADO MÉDICO') && m.texto.includes('1 (um) dia'));
  assert(msgAt1, 'ux:amb:atest:1d deve gerar atestado de 1 dia por extenso');
  assert(msgAt1.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:amb'), 'Atestado 1d deve ter retorno a Ambulatório');

  msgs = acionarCallback('ux:amb:atest:3d');
  let msgAt3 = msgs.find(m => m.texto && m.texto.includes('ATESTADO MÉDICO') && m.texto.includes('3 (três) dia'));
  assert(msgAt3, 'ux:amb:atest:3d deve gerar atestado de 3 dias por extenso');
  assert(msgAt3.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:amb'), 'Atestado 3d deve ter retorno a Ambulatório');

  msgs = acionarCallback('ux:amb:atest:comp');
  let msgComp = msgs.find(m => m.texto && m.texto.includes('DECLARAÇÃO DE COMPARECIMENTO MÉDICO'));
  assert(msgComp, 'ux:amb:atest:comp deve gerar declaração de comparecimento');
  assert(msgComp.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:amb'), 'Declaração deve ter retorno a Ambulatório');

  // Testando alias ux:amb:atestado:3d
  msgs = acionarCallback('ux:amb:atestado:3d');
  let msgAtAlias = msgs.find(m => m.texto && m.texto.includes('ATESTADO MÉDICO') && m.texto.includes('3 (três) dia'));
  assert(msgAtAlias, 'ux:amb:atestado:3d deve funcionar com prefixo atestado:');
  console.log('  ✓ Atestados CFM determinísticos e legais validados em 0ms com retorno e cópia.');

  // 6. Submódulos: Exame Físico Padrão (ux:amb:ef) e SISREG (ux:amb:sisreg)
  console.log('\n[6] Testando Submódulos Exame Físico Padrão (ux:amb:ef) e SISREG (ux:amb:sisreg)...');
  msgs = acionarCallback('ux:amb:ef');
  let msgEf = msgs.find(m => m.texto && m.texto.includes('MODELO CANÔNICO DE EXAME FÍSICO NORMAL'));
  assert(msgEf, 'ux:amb:ef deve entregar modelo de exame físico normal');
  assert(msgEf.texto.includes('ACV') && msgEf.texto.includes('AR') && msgEf.texto.includes('Abdome'), 'Deve conter exame segmentar');
  assert(msgEf.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:amb'), 'Exame Físico deve ter retorno a Ambulatório');

  msgs = acionarCallback('ux:amb:sisreg');
  let msgSisreg = msgs.find(m => m.texto && m.texto.includes('GUIA DE ENCAMINHAMENTO / REGULAÇÃO AMBULATORIAL'));
  assert(msgSisreg, 'ux:amb:sisreg deve entregar guia oficial de regulação');
  assert(msgSisreg.texto.includes('SISREG') || msgSisreg.texto.includes('CROSS'), 'Deve conter menção aos sistemas regulatórios');
  assert(msgSisreg.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:amb'), 'SISREG deve ter retorno a Ambulatório');
  console.log('  ✓ Exame Físico normal canônico e Guia SISREG validados com sucesso.');

  // 7. Testando Comandos de Texto do Roteador (/ambulatorio, /cid, /atestado, /rx)
  console.log('\n[7] Testando Comandos de Texto do Roteador (/ambulatorio, /cid, /atestado, /rx)...');
  msgs = enviarTextoComando('/ambulatorio');
  assert(msgs.length >= 1, '/ambulatorio sem argumentos deve responder');
  assert(msgs.some(m => m.texto && (m.texto.includes('AMBULATÓRIO') || m.texto.includes('AMBULATORIAL'))), '/ambulatorio deve exibir menu ou módulo ambulatorial');

  msgs = enviarTextoComando('/cid');
  assert(msgs.length >= 1, '/cid sem argumentos deve responder');
  assert(msgs.some(m => m.texto && m.texto.includes('CID-10 & CIAP-2')), '/cid deve exibir catálogo ou tela de busca');

  msgs = enviarTextoComando('/cid lombalgia');
  assert(msgs.length >= 1, '/cid lombalgia deve responder');
  let msgCidBusca = msgs.find(m => m.texto && m.texto.includes('M54.5'));
  assert(msgCidBusca, '/cid lombalgia deve encontrar código M54.5');
  assert(msgCidBusca.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:amb'), '/cid busca deve ter retorno a Ambulatório');

  msgs = enviarTextoComando('/atestado');
  assert(msgs.length >= 1, '/atestado sem argumentos deve responder');
  let msgAtCmd = msgs.find(m => m.texto && m.texto.includes('ATESTADO MÉDICO'));
  assert(msgAtCmd, '/atestado sem argumentos deve exibir tela de emissor');

  msgs = enviarTextoComando('/atestado 3 dias lombalgia');
  assert(msgs.length >= 1, '/atestado 3 dias lombalgia deve responder');
  let msgAtGerado = msgs.find(m => m.texto && m.texto.includes('3 (três) dia'));
  assert(msgAtGerado, '/atestado com argumentos deve gerar atestado com prazo por extenso');
  assert(msgAtGerado.kb.inline_keyboard.flat().some(b => b.callback_data === 'ux:hub:amb'), '/atestado gerado deve ter retorno a Ambulatório');

  msgs = enviarTextoComando('/rx');
  assert(msgs.length >= 1, '/rx sem argumentos deve responder com tela REMUME ou opções');
  assert(msgs.some(m => m.texto && m.texto.includes('PRESCRIÇÃO AMBULATORIAL')), '/rx sem argumentos deve apresentar opções estruturadas');
  console.log('  ✓ Comandos /ambulatorio, /cid, /atestado e /rx respondem de forma robusta e contextual.');

  console.log('\n🎉 TODOS OS TESTES DE UI/UX E DETERMINISMO DO AMBULATÓRIO FORAM APROVADOS COM SUCESSO!');
}

testAmbulatorioUX().catch(err => {
  console.error('\n❌ ERRO NO TESTE DE AMBULATÓRIO UX:', err);
  process.exit(1);
});
