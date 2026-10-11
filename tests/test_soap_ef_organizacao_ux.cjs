process.env.NODE_ENV = 'test';
const assert = require('assert');
const runtime = require('../server/runtime.js');

async function testSoapEfOrganizacaoUX() {
  console.log('=== TESTE DE ORGANIZAÇÃO DO EF E UX DO SOAP AMBULATORIAL ===\n');

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
    if (payload && (payload.text || payload.reply_markup)) {
      mensagensEnviadas.push({
        metodo: 'executarPostTelegram',
        id: payload.chat_id,
        texto: payload.text,
        kb: payload.reply_markup
      });
    }
    return true;
  };

  function acionarCallback(callbackData, messageId = 9999) {
    mensagensEnviadas = [];
    ctx.processarCallbackBotao({
      id: 'cb_' + String(callbackData).replace(/[^a-zA-Z0-9]/g, '_'),
      data: callbackData,
      message: { chat: { id: chatId }, message_id: messageId }
    });
    return mensagensEnviadas;
  }

  function enviarTextoComando(textoComando) {
    mensagensEnviadas = [];
    ctx.processarMensagemTexto({
      chat: { id: chatId },
      text: textoComando
    });
    return mensagensEnviadas;
  }

  // 1. Organização do Exame Físico por Linhas (formatarExameFisicoSistemas)
  console.log('[1] Validando formatação de Exame Físico com cada sistema em linha única...');
  assert(typeof ctx.SoapAmbulatorialService.formatarExameFisicoSistemas === 'function', 'formatarExameFisicoSistemas deve estar exportado');

  const textoCorrido = 'Sinais Vitais: PA 120/80 mmHg, FC 75 bpm. Bom estado geral, corado. ACV: RCR em 2T, BNF sem sopros. AR: MV presente bilateralmente sem ruídos. Abdome: Flácido, indolor, RHA+. Extremidades: Sem edema.';
  const formatado = ctx.SoapAmbulatorialService.formatarExameFisicoSistemas(textoCorrido);

  assert(formatado.includes('Geral: Bom estado geral'), 'Geral deve estar delimitado');
  assert(formatado.includes('\nACV: RCR'), 'ACV deve iniciar em nova linha');
  assert(formatado.includes('\nAR: MV'), 'AR deve iniciar em nova linha');
  assert(formatado.includes('\nAbdome: Flácido'), 'Abdome deve iniciar em nova linha');
  assert(formatado.includes('\nExtremidades: Sem edema'), 'Extremidades deve iniciar em nova linha');

  const modeloCompleto = ctx.SoapAmbulatorialService.obterModeloExameFisicoCompleto();
  assert(modeloCompleto.includes('\nACV: Ritmo'), 'Modelo padrão completo deve conter ACV em nova linha');
  assert(modeloCompleto.includes('\nAR: Murmúrio'), 'Modelo padrão completo deve conter AR em nova linha');
  assert(modeloCompleto.includes('\nAbdome: Plano'), 'Modelo padrão completo deve conter Abdome em nova linha');
  assert(modeloCompleto.includes('\nExtremidades: Sem edema'), 'Modelo padrão completo deve conter Extremidades em nova linha');
  console.log('  ✓ Sistemas semiológicos formatados em linhas separadas e limpas.');

  // 2. Remoção de modelos de casos SOAP (HAS, DM2, IVAS, Lombalgia) nos menus e telas iniciais
  console.log('\n[2] Validando ausência de botões de casos prontos no menu SOAP...');
  let msgs = acionarCallback('ux:amb:soap');
  let msgSoap = msgs.find(m => m.texto && m.texto.includes('SOAP AMBULATORIAL ÁGIL'));
  assert(msgSoap, 'Tela inicial de SOAP deve responder');
  let botoesSoap = msgSoap.kb.inline_keyboard.flat();
  let cbsSoap = botoesSoap.map(b => b.callback_data);
  assert(!cbsSoap.includes('ux:amb:soap:has'), 'Não deve conter botão de caso HAS');
  assert(!cbsSoap.includes('ux:amb:soap:dm2'), 'Não deve conter botão de caso DM2');
  assert(!cbsSoap.includes('ux:amb:soap:ivas'), 'Não deve conter botão de caso IVAS');
  assert(!cbsSoap.includes('ux:amb:soap:lombalgia'), 'Não deve conter botão de caso Lombalgia');
  assert(!botoesSoap.some(b => b.text && b.text.includes('Copiar Exame Físico Padrão')), 'Não deve conter botão de copiar EF padrão na raiz');
  console.log('  ✓ Tela inicial de SOAP limpa de casos pré-fabricados e EF avulso.');

  // 3. Ausência de modelos no comando /soap sem argumentos
  console.log('\n[3] Validando comando /soap sem exemplos pré-fabricados...');
  msgs = enviarTextoComando('/soap');
  let msgComandoSoap = msgs.find(m => m.texto && m.texto.includes('MODO SOAP'));
  if (msgComandoSoap && msgComandoSoap.kb) {
    let cbsCmdSoap = msgComandoSoap.kb.inline_keyboard.flat().map(b => b.callback_data);
    assert(!cbsCmdSoap.includes('ux:amb:soap:has'), '/soap não deve sugerir caso HAS em botão');
    assert(!cbsCmdSoap.includes('ux:amb:soap:dm2'), '/soap não deve sugerir caso DM2 em botão');
  }
  console.log('  ✓ Comando /soap sem poluição de botões de exemplo.');

  // 4. Remoção de Modelo de Exame Físico avulso do menu Ambulatório
  console.log('\n[4] Validando menu Ambulatório sem botão de modelo de EF solto...');
  msgs = acionarCallback('ux:hub:amb');
  let msgAmb = msgs.find(m => m.texto && m.texto.includes('AMBULATÓRIO & ATENÇÃO PRIMÁRIA'));
  assert(msgAmb, 'Menu Ambulatório deve responder');
  let cbsAmb = msgAmb.kb.inline_keyboard.flat().map(b => b.callback_data);
  assert(!cbsAmb.includes('ux:amb:ef'), 'Menu Ambulatório não deve conter ux:amb:ef solto');
  console.log('  ✓ Modelo de EF avulso removido do menu Ambulatório.');

  // 5. Início direto do SOAP quando há dados ("Dados do caso atual mantidos" eliminado)
  console.log('\n[5] Validando fluxo direto sem mensagem burocrática de dados mantidos...');
  ctx.definirModoBot(chatId, 'soap', 'Paciente 52 anos com queixa de tosse seca há 2 semanas, afebril, PA 130/80.');
  msgs = acionarCallback('ux:usar:soap');
  let encontrouMensagemTravamento = msgs.some(m => m.texto && m.texto.includes('Dados do caso atual mantidos. Envie a próxima informação.'));
  assert(!encontrouMensagemTravamento, 'Não deve emitir mensagem burocrática travando o usuário');
  console.log('  ✓ Transição para SOAP inicia diretamente com os dados existentes sem atrito.');

  console.log('\n🎉 TODOS OS TESTES DE ORGANIZAÇÃO DO EF E UX DO SOAP PASSARAM COM SUCESSO!');
}

testSoapEfOrganizacaoUX().catch(err => {
  console.error('\n❌ ERRO NO TESTE:', err);
  process.exit(1);
});
