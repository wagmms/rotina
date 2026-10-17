/**
 * ==============================================================================
 * TESTE DE INTEGRAÇÃO: SINALIZAÇÃO REMUME-RP, PONTE RECEITA PDF E BLOCO SOAP
 * ==============================================================================
 * Bateria automatizada testando:
 * 1. Resolução determinística e normalização de sais em consultarRemumeRP()
 * 2. Mapeamento de marcas e sinônimos comerciais (novalgina -> dipirona)
 * 3. Priorização de monoterapias antes de associações
 * 4. Proteção contra falsos positivos para medicamentos fora da rede municipal
 * 5. Selo explícito 🟢 [REMUME-RP] nas fichas HSL e PedBook
 * 6. Geração de botões inline com callback_data < 64 bytes
 * 7. Rascunho ckRx aprovado sem restrição por validarReceitaTemMedicamentos
 * 8. Disparo ponta a ponta do callback gerarPdfRx_<ckRx> emitindo PDF A4
 * 9. Disparo ponta a ponta do callback ux:copiar:<ckSoap> entregando SOAP no PEP
 * 10. Cálculo pediátrico gerando prescrição válida e botões funcionais
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');
const ROOT_DIR = path.resolve(__dirname, '..');
const runtime = require(path.join(ROOT_DIR, 'server', 'runtime.js'));
const c = runtime.ctx;

let aprovados = 0;
function test(nome, fn) {
  try {
    fn();
    console.log('✅ APROVADO: ' + nome);
    aprovados++;
  } catch (e) {
    console.error('❌ FALHOU: ' + nome + ' :: ' + e.message);
    process.exitCode = 1;
  }
}

console.log('--- INICIANDO TESTES: REMUME-RP, SOAP E RECEITA PDF ---');

// Na arquitetura White-Label Multi-Localidade, o padrão sem configuração é RENAME Nacional (SUS).
// Para testar especificamente o preset de Ribeirão Preto (🟢 [REMUME-RP]), ativamos o preset no contexto padrão e no chatId 999888:
if (c.ConfigService && typeof c.ConfigService.salvarContextoClinico === 'function') {
  const ctxRp = {
    municipio: 'Ribeirão Preto',
    uf: 'SP',
    remume_slug: 'sp_ribeirao_preto',
    farmacopeia: {
      remume_id: 'sp_ribeirao_preto',
      remume_nome_exibicao: 'REMUME Ribeirão Preto (SP)',
      selo_curto: '🟢 [REMUME-RP]',
      fallback_rename_nacional: false
    }
  };
  c.ConfigService.salvarContextoClinico('default', ctxRp);
  c.ConfigService.salvarContextoClinico('1771571035', ctxRp);
  c.ConfigService.salvarContextoClinico('999888', ctxRp);
}

// 1. Resolução determinística e normalização de sais
test('1. consultarRemumeRP("losartana") e "Losartana potássica" retornam presente: true e 🟢 [REMUME-RP]', () => {
  assert.strictEqual(typeof c.consultarRemumeRP, 'function', 'consultarRemumeRP deve existir');

  const res1 = c.consultarRemumeRP('losartana');
  assert.strictEqual(res1.presente, true, 'Losartana deve constar na REMUME');
  assert.strictEqual(res1.selo, '🟢 [REMUME-RP]');
  assert.ok(res1.apresentacoes.some(a => a.toLowerCase().includes('losartana 50 mg')), 'Deve conter Losartana 50 mg');

  const res2 = c.consultarRemumeRP('Losartana potássica');
  assert.strictEqual(res2.presente, true, 'Sal potássico deve ser normalizado');
  assert.strictEqual(res2.selo, '🟢 [REMUME-RP]');
});

// 2. Mapeamento de marcas e sinônimos comerciais
test('2. consultarRemumeRP("novalgina") resolve para Dipirona com selo 🟢 [REMUME-RP]', () => {
  const res = c.consultarRemumeRP('novalgina');
  assert.strictEqual(res.presente, true, 'Novalgina deve resolver via sinônimo para dipirona');
  assert.strictEqual(res.selo, '🟢 [REMUME-RP]');
  assert.ok(res.apresentacoes.some(a => a.toLowerCase().includes('dipirona 500 mg')), 'Deve conter Dipirona 500 mg');
});

// 3. Monoterapia priorizada antes de associações
test('3. consultarRemumeRP("amoxicilina") prioriza monoterapias antes de associações com clavulanato', () => {
  const res = c.consultarRemumeRP('amoxicilina');
  assert.strictEqual(res.presente, true);
  assert.ok(res.apresentacoes.length >= 2, 'Deve ter múltiplas apresentações');
  // As primeiras devem ser monoterapias (sem +)
  assert.ok(!res.apresentacoes[0].includes('+'), 'Primeira apresentação deve ser monoterapia');
  assert.ok(res.apresentacoes.some(a => a.includes('+')), 'Associações com clavulanato devem constar na lista');
});

// 4. Ausência de falsos positivos para medicamentos fora da REMUME
test('4. consultarRemumeRP("abatacepte") ou fármaco desconhecido retorna presente: false e ⚪ [NÃO-REMUME]', () => {
  const resAbatacepte = c.consultarRemumeRP('abatacepte');
  assert.strictEqual(resAbatacepte.presente, false, 'Abatacepte não consta na REMUME');
  assert.strictEqual(resAbatacepte.selo, '⚪ [NÃO-REMUME]');
  assert.strictEqual(resAbatacepte.apresentacoes.length, 0);

  const resInexistente = c.consultarRemumeRP('farmaco_inventado_xyz_99');
  assert.strictEqual(resInexistente.presente, false);
  assert.strictEqual(resInexistente.selo, '⚪ [NÃO-REMUME]');
});

// 5. Exibição do selo nas fichas HSL e PedBook
test('5. formatarFichaPosologicaHSL exibe selo 🟢 [REMUME-RP] para medicamento padronizado', () => {
  const medDip = c.buscarMedicamentoNoHSL('dipirona');
  assert.ok(medDip, 'Dipirona deve existir no HSL');
  const fichaTexto = c.formatarFichaPosologicaHSL(medDip);
  assert.ok(fichaTexto.includes('🟢 [REMUME-RP]'), 'Deve conter selo 🟢 [REMUME-RP] na ficha');
  assert.ok(fichaTexto.includes('PADRONIZADO NA REDE MUNICIPAL'), 'Deve conter texto de confirmação municipal');
});

// 6. Consulta posológica gera botões inline de 1 toque com callback_data < 64 bytes
test('6. responderConsultaPosologiaHSL("dipirona") gera botões PDF e SOAP com callback_data < 64 bytes', () => {
  let chamada = null;
  const origEnviarComTeclado = c.enviarMensagemComTecladoParaChat;
  c.enviarMensagemComTecladoParaChat = (chatId, texto, kb) => {
    chamada = { chatId, texto, kb };
    return true;
  };

  try {
    c.responderConsultaPosologiaHSL('999888', 'dipirona');
    assert.ok(chamada, 'Deve ter chamado enviarMensagemComTecladoParaChat');
    const teclado = chamada.kb;
    assert.ok(teclado && teclado.inline_keyboard, 'Deve conter inline_keyboard');

    const botoesPrimeiraLinha = teclado.inline_keyboard[0];
    assert.strictEqual(botoesPrimeiraLinha.length, 2, 'Primeira linha deve ter 2 botões de ação rápida');

    const btnPdf = botoesPrimeiraLinha[0];
    const btnSoap = botoesPrimeiraLinha[1];

    assert.ok(btnPdf.text.includes('Gerar PDF'), 'Deve ter botão Gerar PDF');
    assert.ok(btnPdf.callback_data.startsWith('gerarPdfRx_'), 'Callback deve ter prefixo gerarPdfRx_');
    assert.ok(btnPdf.callback_data.length < 64, `callback_data do PDF deve ser < 64 bytes (${btnPdf.callback_data.length})`);

    assert.ok(btnSoap.text.includes('Copiar SOAP'), 'Deve ter botão Copiar SOAP');
    assert.ok(btnSoap.callback_data.startsWith('ux:copiar:'), 'Callback deve ter prefixo ux:copiar:');
    assert.ok(btnSoap.callback_data.length < 64, `callback_data do SOAP deve ser < 64 bytes (${btnSoap.callback_data.length})`);
  } finally {
    c.enviarMensagemComTecladoParaChat = origEnviarComTeclado;
  }
});

// 7. Rascunho salvo no cache passa por validarReceitaTemMedicamentos
test('7. Rascunho de prescrição em ckRx passa sem ressalvas por validarReceitaTemMedicamentos', () => {
  let chamada = null;
  const origEnviarComTeclado = c.enviarMensagemComTecladoParaChat;
  c.enviarMensagemComTecladoParaChat = (chatId, texto, kb) => {
    chamada = { chatId, texto, kb };
    return true;
  };

  try {
    c.responderConsultaPosologiaHSL('999888', 'dipirona');
    const btnPdf = chamada.kb.inline_keyboard[0][0];
    const ckRx = btnPdf.callback_data.replace('gerarPdfRx_', '');

    const conteudoPrescricao = c.CacheService.getScriptCache().get(ckRx);
    assert.ok(conteudoPrescricao, 'Conteúdo da prescrição deve estar salvo no cache');
    assert.ok(conteudoPrescricao.includes('RECEITUÁRIO'), 'Deve conter cabeçalho');

    const valida = c.validarReceitaTemMedicamentos(conteudoPrescricao);
    assert.strictEqual(valida, true, 'Rascunho de receita deve ser aprovado por validarReceitaTemMedicamentos');
  } finally {
    c.enviarMensagemComTecladoParaChat = origEnviarComTeclado;
  }
});

// 8. Disparo do callback gerarPdfRx_<ckRx> emite PDF da receita
test('8. Callback gerarPdfRx_<ckRx> emite documento PDF oficial via Telegram', () => {
  let chamada = null;
  const origEnviarComTeclado = c.enviarMensagemComTecladoParaChat;
  c.enviarMensagemComTecladoParaChat = (chatId, texto, kb) => {
    chamada = { chatId, texto, kb };
    return true;
  };

  const documentosEnviados = [];
  const origEnviarDoc = c.enviarDocumentoTelegram;
  c.enviarDocumentoTelegram = (chatId, blob, legenda) => {
    documentosEnviados.push({ chatId, blob, legenda });
    return true;
  };

  try {
    c.responderConsultaPosologiaHSL('999888', 'dipirona');
    const btnPdf = chamada.kb.inline_keyboard[0][0];

    const cbObj = {
      id: 'cb_pdf_1',
      data: btnPdf.callback_data,
      message: { chat: { id: 999888 }, message_id: 200 }
    };

    const despachado = c.processarCallbackBotao(cbObj);
    assert.ok(despachado, 'Callback deve ser processado com sucesso');
    assert.strictEqual(documentosEnviados.length, 1, 'Deve ter enviado 1 documento PDF para o Telegram');
    assert.ok(documentosEnviados[0].legenda.includes('RECEITUÁRIO MÉDICO (PDF)'), 'Legenda deve confirmar PDF');
  } finally {
    c.enviarMensagemComTecladoParaChat = origEnviarComTeclado;
    c.enviarDocumentoTelegram = origEnviarDoc;
  }
});

// 9. Disparo do callback ux:copiar:<ckSoap> entrega bloco estruturado SOAP com status REMUME
test('9. Callback ux:copiar:<ckSoap> entrega bloco SOAP com apresentação REMUME e cópia rápida', () => {
  let chamada = null;
  const origEnviarComTeclado = c.enviarMensagemComTecladoParaChat;
  const chamadasEnviadas = [];
  c.enviarMensagemComTecladoParaChat = (chatId, texto, kb) => {
    chamada = { chatId, texto, kb };
    chamadasEnviadas.push(chamada);
    return true;
  };

  try {
    c.responderConsultaPosologiaHSL('999888', 'losartana');
    const btnSoap = chamada.kb.inline_keyboard[0][1];
    const ckSoap = btnSoap.callback_data.replace('ux:copiar:', '');
    const rawSoap = c.CacheService.getScriptCache().get(ckSoap);
    assert.ok(rawSoap, 'Conteúdo SOAP bruto deve estar salvo no cache');
    assert.ok(rawSoap.includes('🟢 [REMUME-RP]'), 'SOAP bruto no cache deve conter selo 🟢 [REMUME-RP]');
    assert.ok(rawSoap.includes('Losartana 50 mg'), 'SOAP bruto no cache deve conter apresentação da REMUME');

    const cbObj = {
      id: 'cb_soap_1',
      data: btnSoap.callback_data,
      message: { chat: { id: 999888 }, message_id: 201 }
    };

    const despachado = c.processarCallbackBotao(cbObj);
    assert.ok(despachado, 'Callback UX copiar deve ser processado');

    const msgSoap = chamadasEnviadas.find(call =>
      call.texto && call.texto.includes('PRONTO PARA O PRONTUÁRIO')
    );
    assert.ok(msgSoap, 'Deve enviar mensagem com modelo pronto para o prontuário');
    assert.ok(msgSoap.texto.includes('[REMUME-RP]'), 'SOAP limpo para PEP deve sinalizar [REMUME-RP]');
    assert.ok(msgSoap.texto.includes('Losartana 50 mg'), 'SOAP deve conter apresentação da REMUME');
  } finally {
    c.enviarMensagemComTecladoParaChat = origEnviarComTeclado;
  }
});

// 10. Cálculo pediátrico determinístico gera botões de PDF e SOAP com apresentação REMUME
test('10. responderConsultaPosologiaHSL com peso (amoxicilina 16kg) gera botões PDF e SOAP funcionais', () => {
  let chamada = null;
  const origEnviarComTeclado = c.enviarMensagemComTecladoParaChat;
  c.enviarMensagemComTecladoParaChat = (chatId, texto, kb) => {
    chamada = { chatId, texto, kb };
    return true;
  };

  try {
    c.responderConsultaPosologiaHSL('999888', 'amoxicilina 16kg');
    assert.ok(chamada, 'Deve responder cálculo pediátrico com teclado');
    const teclado = chamada.kb;
    assert.ok(teclado && teclado.inline_keyboard, 'Deve conter inline_keyboard no cálculo pediátrico');

    const btnPdf = teclado.inline_keyboard[0][0];
    const btnSoap = teclado.inline_keyboard[0][1];

    assert.ok(btnPdf.callback_data.startsWith('gerarPdfRx_'));
    assert.ok(btnPdf.callback_data.length < 64);
    assert.ok(btnSoap.callback_data.startsWith('ux:copiar:'));
    assert.ok(btnSoap.callback_data.length < 64);

    const ckRx = btnPdf.callback_data.replace('gerarPdfRx_', '');
    const rascunho = c.CacheService.getScriptCache().get(ckRx);
    assert.ok(rascunho, 'Rascunho de prescrição pediátrica deve existir no cache');
    assert.strictEqual(c.validarReceitaTemMedicamentos(rascunho), true, 'Prescrição pediátrica deve ser válida');
  } finally {
    c.enviarMensagemComTecladoParaChat = origEnviarComTeclado;
  }
});

console.log(`\n🎉 Todos os ${aprovados} testes de integração REMUME-RP / SOAP / PDF foram APROVADOS!`);
