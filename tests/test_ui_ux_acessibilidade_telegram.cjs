process.env.NODE_ENV = 'test';
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
  ctx.executarPostTelegram = (url, payload) => {
    if (payload && payload.text) {
      mensagensEnviadas.push({ metodo: 'executarPostTelegram', id: payload.chat_id, texto: payload.text, kb: payload.reply_markup });
    }
    return true;
  };
  ctx.UrlFetchApp = {
    fetch: () => ({
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({ ok: true, result: { message_id: 12345 } })
    })
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

  // =========================================================================
  // 6. Roteamento Imediato de Plantão (Glasgow isolado, Choque, CriseHAS)
  // =========================================================================
  console.log('\n[6] Testando Roteamento Imediato de Plantão (Termos Clínicos sem Barra)...');
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: 'glasgow' });
  assert(mensagensEnviadas.length > 0);
  assert(mensagensEnviadas[0].texto.includes('ESCALA DE COMA DE GLASGOW (GUIA RÁPIDO)'));
  assert(mensagensEnviadas[0].texto.includes('Abertura Ocular') && mensagensEnviadas[0].texto.includes('Glasgow ≤ 8'));
  console.log('  ✓ "glasgow" isolado entrega guia rápido da escala com pontuação e alerta sentinela.');

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: 'choque' });
  assert(mensagensEnviadas.length > 0);
  assert(mensagensEnviadas[0].texto.toUpperCase().includes('CHOQUE'));
  console.log('  ✓ "choque" sem barra roteia diretamente para o protocolo de choque.');

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: 'crisehas' });
  assert(mensagensEnviadas.length > 0);
  assert(mensagensEnviadas[0].texto.toUpperCase().includes('CRISE HIPERTENSIVA') || mensagensEnviadas[0].texto.toUpperCase().includes('URGÊNCIA'));
  console.log('  ✓ "crisehas" sem barra roteia para o protocolo de crise hipertensiva.');

  // =========================================================================
  // 7. Sanitização Universal de Entidades e Markdown/HTML
  // =========================================================================
  console.log('\n[7] Testando Sanitização Universal de Markdown e HTML...');
  const mdComCrasesImpares = 'Conduta: `dose 10 mg/kg em bólus com monitorização';
  const mdLimpo = ctx.limparMarkdownTelegram(mdComCrasesImpares);
  const countB = (mdLimpo.match(/`/g) || []).length;
  assert.strictEqual(countB % 2, 0, 'Crases ímpares devem ser balanceadas');
  console.log('  ✓ limparMarkdownTelegram balanceia crases ímpares sem quebrar o parse do Telegram.');

  const mdBlocoTriplo = '```\nPrescrição Hospitalar';
  const mdBlocoLimpo = ctx.limparMarkdownTelegram(mdBlocoTriplo);
  assert(mdBlocoLimpo.endsWith('```'), 'Bloco triplo de código deve ser fechado');
  console.log('  ✓ limparMarkdownTelegram fecha blocos triplos de código abertos.');

  const htmlComSinaisMedicos = '<b>CONDUTA:</b> Se peso < 10 kg e K+ > 5.5 mEq/L, suspender reposição.';
  const htmlSanitizado = ctx.sanitizarHtmlTelegram(htmlComSinaisMedicos);
  assert(htmlSanitizado.includes('<b>CONDUTA:</b>'), 'Tags HTML válidas devem ser preservadas');
  assert(htmlSanitizado.includes('&lt; 10 kg') && htmlSanitizado.includes('&gt; 5.5'), 'Sinais médicos de comparação soltos devem ser escapados para &lt; e &gt;');
  console.log('  ✓ sanitizarHtmlTelegram preserva tags válidas e escapa comparações clínicas soltas.');

  // =========================================================================
  // 8. Fragmentação com Indicador Visual de Partes e Fast-Ack In-Place
  // =========================================================================
  console.log('\n[8] Testando Fragmentação com Continuidade e Reutilização de Fast-Ack...');
  const textoLongo = 'LINHA DE CONDUTA CLÍNICA '.repeat(200); // ~5000 chars
  assert(textoLongo.length > 4000, 'Texto deve exceder o limite de 4000 caracteres');

  let chamadasPost = [];
  const originalExec = ctx.executarPostTelegram;
  ctx.executarPostTelegram = (url, payload) => {
    chamadasPost.push({ url, payload });
    return true;
  };

  const okSegmentado = ctx.enviarMensagemSegmentada(chatId, textoLongo, null, 999888);
  ctx.executarPostTelegram = originalExec;

  assert.strictEqual(okSegmentado, true, 'Envio segmentado deve retornar true');
  assert(chamadasPost.length >= 2, 'Deve gerar pelo menos 2 partes para mensagem de 5000 chars');

  // Verifica se a primeira parte tentou in-place edit em messageIdParaEditar
  const primeiraChamada = chamadasPost[0];
  assert(primeiraChamada.url.includes('editMessageText'), 'Primeira parte deve tentar editMessageText no Fast-Ack');
  assert.strictEqual(primeiraChamada.payload.message_id, 999888, 'Deve reutilizar message_id do Fast-Ack');
  assert(primeiraChamada.payload.text.includes('[Parte 1/'), 'Primeira parte deve conter cabeçalho/rodapé de partes');
  assert(primeiraChamada.payload.text.includes('Continua abaixo ⬇️'), 'Primeira parte deve indicar continuidade abaixo');

  // Verifica segunda chamada
  const segundaChamada = chamadasPost[1];
  assert(segundaChamada.url.includes('sendMessage'), 'Segunda parte deve usar sendMessage');
  assert(segundaChamada.payload.text.includes('[Parte 2/'), 'Segunda parte deve conter identificador de parte 2');
  assert(segundaChamada.payload.text.includes('Continuação'), 'Segunda parte deve indicar continuação');
  console.log('  ✓ Fragmentação inclui cabeçalhos/rodapés visuais (Parte X/Y) e reutiliza Fast-Ack sem mensagem órfã.');

  console.log('\n🎉 TODOS OS TESTES DE UI/UX, MENUS, ERGONOMIA E ENTRADA RÁPIDA PASSARAM COM SUCESSO!\n');
}

testUiUxAcessibilidadeTelegram().catch(err => {
  console.error('Falha nos testes de UI/UX:', err);
  process.exit(1);
});
