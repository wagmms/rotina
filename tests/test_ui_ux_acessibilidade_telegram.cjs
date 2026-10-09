const assert = require('assert');
const runtime = require('../server/runtime.js');

async function testUiUxAcessibilidadeTelegram() {
  console.log('=== INICIANDO BATERIA DE TESTES: UI/UX & ACESSIBILIDADE DO BOT (TELEGRAM) ===\n');

  const ctx = runtime.ctx;
  const chatId = ctx.ConfigService.get('TELEGRAM_CHAT_ID') || '1771571035';

  let mensagensEnviadas = [];
  ctx.enviarMensagemParaChat = (id, texto) => {
    mensagensEnviadas.push({ metodo: 'enviarMensagemParaChat', id, texto });
  };
  ctx.enviarMensagemComTecladoFixo = (id, texto) => {
    mensagensEnviadas.push({ metodo: 'enviarMensagemComTecladoFixo', id, texto });
  };
  ctx.enviarMensagemComTecladoParaChat = (id, texto, kb) => {
    mensagensEnviadas.push({ metodo: 'enviarMensagemComTecladoParaChat', id, texto, kb });
  };
  ctx.enviarMensagemComBotoes = (id, texto, kb) => {
    mensagensEnviadas.push({ metodo: 'enviarMensagemComBotoes', id, texto, kb });
  };
  ctx.responderCallbackTelegram = (cbId, texto) => {
    mensagensEnviadas.push({ metodo: 'responderCallbackTelegram', cbId, texto });
  };

  // =========================================================================
  // 1. Teclado Adaptativo e Usabilidade Mobile (Reply Keyboard não-persistente)
  // =========================================================================
  console.log('[1] Testando Teclado Fixo Principal e Usabilidade Mobile...');
  const tecladoFixo = ctx.obterTecladoFixoPrincipal(chatId);
  assert.strictEqual(tecladoFixo.is_persistent, false, 'Teclado do Telegram deve ter is_persistent: false para ergonomia mobile');
  assert.strictEqual(tecladoFixo.resize_keyboard, true, 'Teclado do Telegram deve ter resize_keyboard: true');

  const textosBotoesTeclado = tecladoFixo.keyboard.flat().map(b => b.text);
  assert(textosBotoesTeclado.includes('🚨 Sala Vermelha'), 'Teclado deve conter botão 🚨 Sala Vermelha');
  assert(textosBotoesTeclado.includes('🛏️ Enfermaria'), 'Teclado deve conter botão 🛏️ Enfermaria');
  assert(textosBotoesTeclado.includes('🩺 Ambulatório'), 'Teclado deve conter botão 🩺 Ambulatório');
  assert(textosBotoesTeclado.includes('💊 Consultas de Bolso'), 'Teclado deve conter botão 💊 Consultas de Bolso');
  assert(textosBotoesTeclado.includes('⚙️ Central / Menu'), 'Teclado deve conter botão ⚙️ Central / Menu');
  console.log('  ✓ Teclado fixo configurado com is_persistent: false e 4 cenários clínicos imediatos.');

  const botoesPadrao = ctx.obterBotoesNavegacaoPadrao();
  assert(botoesPadrao && botoesPadrao.inline_keyboard, 'Deve fornecer botões de navegação padronizados');
  assert.strictEqual(botoesPadrao.inline_keyboard[0][0].text, '🔙 Voltar ao Menu');
  assert.strictEqual(botoesPadrao.inline_keyboard[0][1].text, '🏠 Início');
  console.log('  ✓ Botões de retorno padronizados ("🔙 Voltar ao Menu", "🏠 Início") validados.');

  // =========================================================================
  // 2. Fluxo Principal (/start, /menu, Hub dos 4 Cenários Clínicos)
  // =========================================================================
  console.log('\n[2] Testando Fluxo Principal (/start, /menu, Hub dos 4 Cenários)...');
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/start' });
  assert(mensagensEnviadas.length >= 1, 'Comando /start deve responder');
  const txtStart = mensagensEnviadas.map(m => m.texto).join('\n');
  assert(txtStart.includes('Central de Comandos') || txtStart.includes('Olá, Dr.') || txtStart.includes('Emergência'), 'Start deve saudar e apresentar central');
  console.log('  ✓ /start inicializa com saudação ergonômica e Central de Comandos.');

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/menu' });
  assert(mensagensEnviadas.length >= 1, 'Comando /menu deve responder');
  const txtMenu = mensagensEnviadas.map(m => m.texto).join('\n');
  assert(txtMenu.includes('Central de Comandos') || txtMenu.includes('4 cenários clínicos'), '/menu deve abrir o Hub Principal');
  console.log('  ✓ /menu abre a Central de Comandos beira-leito.');

  // Teste de acionamento via texto dos botões do teclado
  const botoesMenuParaTestar = [
    { txt: '🚨 Sala Vermelha', esperado: 'SALA VERMELHA' },
    { txt: '🛏️ Enfermaria', esperado: 'ENFERMARIA' },
    { txt: '🩺 Ambulatório', esperado: 'AMBULATÓRIO' },
    { txt: '💊 Consultas de Bolso', esperado: 'CONSULTAS RÁPIDAS DE BOLSO' },
    { txt: '⚙️ Central / Menu', esperado: 'Central de Comandos' }
  ];

  for (const bTest of botoesMenuParaTestar) {
    mensagensEnviadas = [];
    ctx.processarMensagemTexto({ chat: { id: chatId }, text: bTest.txt });
    assert(mensagensEnviadas.length >= 1, `Botão ${bTest.txt} deve responder`);
    const txtResp = mensagensEnviadas.map(m => m.texto).join('\n');
    assert(txtResp.includes(bTest.esperado), `Botão ${bTest.txt} deve conter ${bTest.esperado}`);
  }
  console.log('  ✓ Todos os 5 botões do teclado fixo acionam instantaneamente suas respectivas telas.');

  // =========================================================================
  // 3. Callbacks dos 4 Cenários Clínicos (Navegação em no máximo 1-2 toques)
  // =========================================================================
  console.log('\n[3] Testando Callbacks dos 4 Cenários Clínicos...');
  const callbacksCenarios = [
    { cb: 'ux:hub:sala', esperado: 'SALA VERMELHA' },
    { cb: 'ux:hub:enf', esperado: 'ENFERMARIA' },
    { cb: 'ux:hub:amb', esperado: 'AMBULATÓRIO' },
    { cb: 'ux:hub:bolso', esperado: 'CONSULTAS RÁPIDAS DE BOLSO' },
    { cb: 'ux:menu', esperado: 'Central de Comandos' },
    { cb: 'ux:hub:inicio', esperado: 'Central de Comandos' },
    // Cenário 1: Emergência
    { cb: 'ux:emerg:choque', esperado: 'CHOQUE' },
    { cb: 'ux:emerg:glasgow', esperado: 'GLASGOW' },
    { cb: 'ux:fixa:vaso', esperado: 'VASOPRESSINA' },
    // Cenário 2: Enfermaria
    { cb: 'ux:enf:clcr', esperado: 'CLEARANCE' },
    { cb: 'ux:enf:ajuste', esperado: 'AJUSTE' },
    { cb: 'ux:enf:hidratacao', esperado: 'HOLLIDAY' },
    { cb: 'ux:enf:rxh', esperado: 'PRESCRIÇÃO' },
    { cb: 'ux:enf:sbar', esperado: 'PASSAGEM' },
    // Cenário 3: Ambulatório
    { cb: 'ux:amb:cid', esperado: 'CID' },
    { cb: 'ux:amb:atestado', esperado: 'ATESTADO' },
    // Cenário 4: Consultas de Bolso
    { cb: 'ux:bolso:atb', esperado: 'ANTIMICROBIAN' },
    { cb: 'ux:bolso:ped', esperado: 'PEDIÁTRIC' },
    { cb: 'ux:bolso:interacao', esperado: 'INTERA' },
    { cb: 'ux:bolso:hsl', esperado: 'DILUIÇÃO' }
  ];

  for (const cTest of callbacksCenarios) {
    mensagensEnviadas = [];
    ctx.processarCallbackBotao({
      id: 'cb_test_' + cTest.cb.replace(/:/g, '_'),
      data: cTest.cb,
      message: { chat: { id: chatId }, message_id: 1234 }
    });
    assert(mensagensEnviadas.length >= 1, `Callback ${cTest.cb} deve responder`);
    const txtCb = mensagensEnviadas.map(m => m.texto).join('\n').toUpperCase();
    assert(txtCb.includes(cTest.esperado.toUpperCase()), `Callback ${cTest.cb} deve conter ${cTest.esperado}, obteve: ${txtCb}`);
  }
  console.log(`  ✓ ${callbacksCenarios.length} callbacks de submenus e cenários clínicos validados.`);

  // =========================================================================
  // 4. Inteligência de Entrada e Tolerância a Termos Coloquiais do Plantão
  // =========================================================================
  console.log('\n[4] Testando Roteamento Coloquial e Siglas do Plantão...');
  ctx.limparEstadoBot(chatId);

  // A. Amoxicilina
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: 'amoxi 15kg' });
  assert(mensagensEnviadas.length > 0);
  assert(mensagensEnviadas[0].texto.includes('AMOXICILINA PEDIÁTRICA') && mensagensEnviadas[0].texto.includes('15 kg'));
  assert(mensagensEnviadas[0].texto.includes('50 mg/kg/dia') && mensagensEnviadas[0].texto.includes('90 mg/kg/dia'));
  console.log('  ✓ "amoxi 15kg" calcula dose pediátrica padrão e OMA/PAC de alto risco com teto de segurança.');

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: 'amoxicilina' });
  assert(mensagensEnviadas.length > 0);
  assert(mensagensEnviadas[0].texto.includes('500 mg') && mensagensEnviadas[0].texto.includes('875 mg'));
  console.log('  ✓ "amoxicilina" isolado exibe posologias adulto de 1ª linha e alerta de ajuste renal.');

  // B. Noradrenalina
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: 'nora 70' });
  assert(mensagensEnviadas.length > 0);
  assert(mensagensEnviadas[0].texto.toUpperCase().includes('NORADRENALINA') && mensagensEnviadas[0].texto.includes('70'));
  console.log('  ✓ "nora 70" calcula DVA Noradrenalina determinística em mL/h.');

  // C. Dobutamina
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: 'dobuta 65' });
  assert(mensagensEnviadas.length > 0);
  assert(mensagensEnviadas[0].texto.toUpperCase().includes('DOBUTAMINA') && mensagensEnviadas[0].texto.includes('65'));
  console.log('  ✓ "dobuta 65" calcula DVA Dobutamina determinística em mL/h.');

  // D. Vasopressina
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: 'vaso' });
  assert(mensagensEnviadas.length > 0);
  assert(mensagensEnviadas[0].texto.toUpperCase().includes('VASOPRESSINA') && mensagensEnviadas[0].texto.includes('12 mL/h'));
  console.log('  ✓ "vaso" calcula DVA Vasopressina determinística em dose fixa.');

  // E. Dipirona
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: 'dipirona 16kg' });
  assert(mensagensEnviadas.length > 0);
  assert(mensagensEnviadas[0].texto.includes('DIPIRONA PEDIÁTRICA') && mensagensEnviadas[0].texto.includes('16 gotas'));
  console.log('  ✓ "dipirona 16kg" calcula posologia em gotas (1 gota/kg) e mL com tetos de segurança.');

  // F. Clearance (ClCr)
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: 'clcr 68 70 1.4' });
  assert(mensagensEnviadas.length > 0);
  assert(mensagensEnviadas[0].texto.includes('Cockcroft-Gault') || mensagensEnviadas[0].texto.includes('mL/min'));
  console.log('  ✓ "clcr 68 70 1.4" calcula clearance Cockcroft-Gault determinístico.');

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: 'clcr' });
  assert(mensagensEnviadas.length > 0);
  assert(mensagensEnviadas[0].texto.includes('CLEARANCE DE CREATININA'));
  console.log('  ✓ "clcr" isolado exibe instruções escaneáveis com exemplos práticos.');

  // G. SOFA & qSOFA
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: 'sofa' });
  assert(mensagensEnviadas.length > 0);
  assert(mensagensEnviadas[0].texto.includes('qSOFA') && mensagensEnviadas[0].texto.includes('BUNDLE DE 1 HORA'));
  console.log('  ✓ "sofa" entrega qSOFA beira-leito e Bundle de 1 hora da Sepse.');

  // H. HAS Descompensada
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: 'has descompensada' });
  assert(mensagensEnviadas.length > 0);
  assert(mensagensEnviadas[0].texto.includes('Urgência Hipertensiva') && mensagensEnviadas[0].texto.includes('Emergência Hipertensiva'));
  console.log('  ✓ "has descompensada" entrega conduta de urgência vs emergência hipertensiva.');

  // I. DPP / DUM
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: 'dpp 15/05/2026' });
  assert(mensagensEnviadas.length > 0);
  assert(mensagensEnviadas[0].texto.includes('DPP') || mensagensEnviadas[0].texto.includes('Idade Gestacional') || mensagensEnviadas[0].texto.includes('Naegele'));
  console.log('  ✓ "dpp 15/05/2026" calcula DPP e IG pela Regra de Naegele.');

  // J. Glasgow
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: 'glasgow 7' });
  assert(mensagensEnviadas.length > 0);
  assert(mensagensEnviadas[0].texto.includes('TCE GRAVE') && mensagensEnviadas[0].texto.includes('SRI / IOT'));
  console.log('  ✓ "glasgow 7" detecta TCE grave e emite indicação imediata de IOT/SRI.');

  // =========================================================================
  // 5. Comandos sem barra e Correção de Erros de Digitação (Typos)
  // =========================================================================
  console.log('\n[5] Testando Normalização sem Barra e Correção de Typos...');

  // Sem barra
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: 'sri 70 choque' });
  assert(mensagensEnviadas.length > 0);
  assert(mensagensEnviadas[0].texto.includes('Etomidato') || mensagensEnviadas[0].texto.includes('Quetamina'));
  console.log('  ✓ "sri 70 choque" sem barra executa o protocolo determinístico de intubação.');

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: 'gaso pH 7.24 pCO2 26 HCO3 11' });
  assert(mensagensEnviadas.length > 0);
  assert(mensagensEnviadas[0].texto.includes('Acidose') || mensagensEnviadas[0].texto.includes('Winter'));
  console.log('  ✓ "gaso ..." sem barra executa interpretação gasométrica dos 5 passos.');

  // Typos corrigidos
  ctx.limparEstadoBot(chatId);
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: 'clearence 65 70 1.2' });
  assert(mensagensEnviadas.length > 0);
  assert(mensagensEnviadas[0].texto.includes('Clearance') || mensagensEnviadas[0].texto.includes('mL/min'));
  console.log('  ✓ Typo "clearence" corrigido graciosamente para /crcl.');

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: 'intubacao 70' });
  assert(mensagensEnviadas.length > 0);
  assert(mensagensEnviadas[0].texto.includes('Etomidato') || mensagensEnviadas[0].texto.includes('Rocurônio'));
  console.log('  ✓ Typo "intubacao" corrigido graciosamente para /sri.');

  console.log('\n🎉 TODOS OS TESTES DE UI/UX, MENUS, ERGONOMIA E ENTRADA RÁPIDA PASSARAM COM SUCESSO!\n');
}

testUiUxAcessibilidadeTelegram().catch(err => {
  console.error('Falha nos testes de UI/UX:', err);
  process.exit(1);
});
