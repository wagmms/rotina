/**
 * ==============================================================================
 * BATERIA DE TESTES AUTOMATIZADOS: TELEGRAM MINI APP (WEBAPP) & INLINE MODE
 * ==============================================================================
 * Cobre e audita:
 * 1. Geração de Artigos Clínicos Inline: DVA (Nora, Vaso, Dobuta), SRI, Escores, Gasometria e REMUME/HSL
 * 2. Cálculo dinâmico por peso em queries inline (ex: 'nora 80', 'sri 75')
 * 3. Formatação HTML e botões nativos de WebApp (Cockpit Mini App)
 * 4. Despacho e resposta a inline_query via answerInlineQuery
 * 5. Processamento bidirecional de web_app_data (dados enviados do Cockpit PWA para o chat)
 * 6. Configuração de Chat Menu Button (setChatMenuButton com WebApp)
 * 7. Blindagem de segurança e autorização no webhook (doPost) para inline queries
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');
const runtime = require('../server/runtime.js');

async function executarTestesTelegramInlineEWebApp() {
  const ctx = runtime.ctx;
  const chatId = (ctx.ConfigService && ctx.ConfigService.getPrimary)
    ? ctx.ConfigService.getPrimary('TELEGRAM_CHAT_ID')
    : (ctx.ConfigService ? String(ctx.ConfigService.get('TELEGRAM_CHAT_ID') || '123456789').split(',')[0].trim() : '123456789');

  let chamadasPost = [];
  let mensagensEnviadas = [];

  ctx.executarPostTelegram = (url, payload) => {
    chamadasPost.push({ url, payload });
    return true;
  };

  ctx.enviarMensagemParaChat = (id, texto) => {
    mensagensEnviadas.push({ tipo: 'texto', id, texto: String(texto) });
    return true;
  };

  ctx.enviarMensagemComTecladoParaChat = (id, texto, kb) => {
    mensagensEnviadas.push({ tipo: 'teclado', id, texto: String(texto), kb });
    return true;
  };

  function limparCaptura() {
    chamadasPost = [];
    mensagensEnviadas = [];
  }

  console.log('[1] Testando Geração de Artigos Clínicos Inline Canônicos...');
  limparCaptura();

  // 1. Query vazia / genérica deve entregar a grade canônica completa
  const resultadosPadrao = ctx.montarResultadosInlineClinicos('', chatId);
  assert.ok(Array.isArray(resultadosPadrao), 'Deve retornar um array de resultados');
  assert.ok(resultadosPadrao.length >= 8, 'Grade padrão deve ter ao menos 8 artigos clínicos de alta relevância');

  const titulosPadrao = resultadosPadrao.map(r => r.title);
  assert.ok(titulosPadrao.some(t => t.includes('Noradrenalina')), 'Deve conter Noradrenalina');
  assert.ok(titulosPadrao.some(t => t.includes('Vasopressina')), 'Deve conter Vasopressina');
  assert.ok(titulosPadrao.some(t => t.includes('Dobutamina')), 'Deve conter Dobutamina');
  assert.ok(titulosPadrao.some(t => t.includes('Intubação em Sequência Rápida')), 'Deve conter SRI');
  assert.ok(titulosPadrao.some(t => t.includes('CURB-65')), 'Deve conter CURB-65');
  assert.ok(titulosPadrao.some(t => t.includes('Wells TEP')), 'Deve conter Wells TEP');
  assert.ok(titulosPadrao.some(t => t.includes('Gasometria Arterial')), 'Deve conter Gasometria');
  assert.ok(titulosPadrao.some(t => t.includes('Glasgow-P')), 'Deve conter Glasgow-P');
  assert.ok(titulosPadrao.some(t => t.includes('Cockpit')), 'Deve conter atalho para o Cockpit');

  // Cada artigo deve conter HTML válido e botão de abrir no Cockpit
  resultadosPadrao.forEach((item, idx) => {
    assert.strictEqual(item.type, 'article', `Item ${idx} deve ser type 'article'`);
    assert.ok(item.id, `Item ${idx} deve possuir ID único`);
    assert.ok(item.input_message_content, `Item ${idx} deve possuir input_message_content`);
    assert.strictEqual(item.input_message_content.parse_mode, 'HTML', `Item ${idx} deve ser parse_mode HTML`);
    assert.ok(item.input_message_content.message_text.length > 50, `Item ${idx} deve conter corpo clínico rico`);
    assert.ok(item.reply_markup?.inline_keyboard?.[0]?.[0]?.web_app?.url, `Item ${idx} deve conter botão com web_app`);
  });
  console.log('  ✓ Grade canônica verificada com sucesso (' + resultadosPadrao.length + ' cards).');

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. CÁLCULO DINÂMICO POR PESO EM CONSULTAS INLINE
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[2] Testando Cálculos Dinâmicos por Peso em Queries Inline...');

  // Noradrenalina para 80 kg
  const resNora80 = ctx.montarResultadosInlineClinicos('nora 80kg', chatId);
  assert.ok(resNora80.length > 0, 'Deve retornar resultado para nora 80');
  const cardNora80 = resNora80.find(r => r.title.includes('Noradrenalina'));
  assert.ok(cardNora80, 'Deve encontrar card de Noradrenalina');
  assert.ok(cardNora80.title.includes('80 kg'), 'Título deve refletir 80 kg');
  // Para 80kg e solução 64 mcg/mL: vazão 0.1 mcg/kg/min = (0.1 * 80 * 60) / 64 = 7.5 mL/h
  assert.ok(cardNora80.input_message_content.message_text.includes('7.5 mL/h'), 'Deve conter vazão precisa de 7.5 mL/h para 80kg');

  // Sequência Rápida de Intubação para 70 kg
  const resSri70 = ctx.montarResultadosInlineClinicos('sri 70', chatId);
  const cardSri70 = resSri70.find(r => r.title.includes('Intubação'));
  assert.ok(cardSri70, 'Deve encontrar card de SRI');
  assert.ok(cardSri70.title.includes('70 kg'), 'Título deve refletir 70 kg');
  // Etomidato 0.3 mg/kg = 21 mg (10.5 mL a 2 mg/mL)
  assert.ok(cardSri70.input_message_content.message_text.includes('21 mg'), 'Deve conter Etomidato 21 mg');
  assert.ok(cardSri70.input_message_content.message_text.includes('10.5 mL'), 'Deve conter Etomidato 10.5 mL');
  // Succinilcolina 1.0 mg/kg = 70 mg
  assert.ok(cardSri70.input_message_content.message_text.includes('70 mg'), 'Deve conter Succinilcolina 70 mg');
  // Rocurônio 1.2 mg/kg = 84 mg (8.4 mL a 10 mg/mL)
  assert.ok(cardSri70.input_message_content.message_text.includes('84 mg'), 'Deve conter Rocurônio 84 mg');
  assert.ok(cardSri70.input_message_content.message_text.includes('8.4 mL'), 'Deve conter Rocurônio 8.4 mL');
  console.log('  ✓ Cálculos por peso para Noradrenalina e SRI 100% validados.');

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. CONSULTA INLINE DE MEDICAMENTOS (HSL / REMUME)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[3] Testando Busca de Medicamentos em Linha...');

  const resAmox = ctx.montarResultadosInlineClinicos('amoxicilina', chatId);
  assert.ok(resAmox.length > 0, 'Deve retornar resultado para amoxicilina');
  const cardAmox = resAmox.find(r => r.title.toLowerCase().includes('amoxicilina'));
  assert.ok(cardAmox, 'Deve conter card específico para Amoxicilina');
  assert.ok(cardAmox.input_message_content.message_text.includes('AMOXICILINA'), 'Deve exibir informações farmacológicas');
  console.log('  ✓ Busca inline de medicamento verificada.');

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. DESPACHO DE ANSWER_INLINE_QUERY END-TO-END
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[4] Testando processarInlineQuery e chamada de answerInlineQuery...');
  limparCaptura();

  const updateInlineMock = {
    id: 'query_123456789',
    from: { id: parseInt(chatId, 10), is_bot: false, first_name: 'Dr. Wagner' },
    query: 'curb65',
    offset: ''
  };

  const sucessoInline = ctx.processarInlineQuery(updateInlineMock);
  assert.strictEqual(sucessoInline, true, 'processarInlineQuery deve retornar sucesso');
  assert.strictEqual(chamadasPost.length, 1, 'Deve ter disparado exatamente uma chamada Telegram');
  assert.ok(chamadasPost[0].url.includes('/answerInlineQuery'), 'Deve chamar o endpoint /answerInlineQuery');
  assert.strictEqual(chamadasPost[0].payload.inline_query_id, 'query_123456789', 'Deve correlacionar o query_id');
  assert.ok(Array.isArray(chamadasPost[0].payload.results), 'Deve conter a lista de resultados');
  assert.strictEqual(chamadasPost[0].payload.is_personal, true, 'Deve ser resposta pessoal');
  console.log('  ✓ Despacho de answerInlineQuery 100% aprovado.');

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. PROCESSAMENTO DE WEB_APP_DATA DO COCKPIT PWA
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[5] Testando processarWebAppData (Sincronização PWA ➔ Chat)...');
  limparCaptura();

  const msgWebAppDataMock = {
    message_id: 999,
    chat: { id: chatId },
    from: { id: chatId },
    web_app_data: {
      data: JSON.stringify({
        tipo: 'calculo',
        titulo: 'Cálculo de Noradrenalina no Cockpit',
        conteudo: 'Paciente 75 kg | Vazão atual: 14 mL/h (0.2 mcg/kg/min) em CVC'
      })
    }
  };

  const sucessoWebAppData = ctx.processarWebAppData(msgWebAppDataMock);
  assert.strictEqual(sucessoWebAppData, true, 'processarWebAppData deve processar os dados');
  assert.strictEqual(mensagensEnviadas.length, 1, 'Deve enviar mensagem com resumo para o chat');
  assert.ok(mensagensEnviadas[0].texto.includes('CÁLCULO DE NORADRENALINA NO COCKPIT'), 'Deve exibir título formatado');
  assert.ok(mensagensEnviadas[0].texto.includes('14 mL/h'), 'Deve exibir detalhes do cálculo');
  assert.ok(mensagensEnviadas[0].kb?.inline_keyboard, 'Deve conter botões de prontuário e reabertura do Cockpit');
  console.log('  ✓ Sincronização de web_app_data do Mini App 100% validada.');

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. CONFIGURAÇÃO DE CHAT MENU BUTTON (MINI APP)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[6] Testando configurarMenuButtonTelegram...');
  limparCaptura();

  const sucessoMenuButton = ctx.configurarMenuButtonTelegram(chatId);
  assert.strictEqual(sucessoMenuButton, true, 'configurarMenuButtonTelegram deve retornar true');
  assert.strictEqual(chamadasPost.length, 1, 'Deve disparar chamada Telegram');
  assert.ok(chamadasPost[0].url.includes('/setChatMenuButton'), 'Deve chamar /setChatMenuButton');
  assert.strictEqual(chamadasPost[0].payload.menu_button.type, 'web_app', 'Menu button deve ser type web_app');
  assert.ok(chamadasPost[0].payload.menu_button.text.includes('Cockpit'), 'Texto do botão deve mencionar Cockpit');
  assert.ok(chamadasPost[0].payload.menu_button.web_app.url.includes('wagmms.github.io/cockpit'), 'URL deve apontar para o Cockpit');
  console.log('  ✓ Configuração de Menu Button para WebApp 100% validada.');

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. AUTORIZAÇÃO E FAST-PATH NO WEBHOOK (doPost)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[7] Testando Segurança e Fast-Path em doPost para Inline Query...');
  limparCaptura();

  let secretValido = (ctx.ConfigService && ctx.ConfigService.get) ? ctx.ConfigService.get('WEBHOOK_SECRET') : null;
  if (!secretValido) {
    secretValido = 'secret_teste_inline_valid';
    if (ctx.PropertiesService && ctx.PropertiesService.getScriptProperties) {
      ctx.PropertiesService.getScriptProperties().setProperty('WEBHOOK_SECRET', secretValido);
    }
  }
  if (ctx.PropertiesService && ctx.PropertiesService.getScriptProperties) {
    ctx.PropertiesService.getScriptProperties().setProperty('TELEGRAM_CHAT_ID', String(chatId));
    if (ctx.ConfigService && typeof ctx.ConfigService.invalidar === 'function') {
      ctx.ConfigService.invalidar();
    }
  }

  // Caso 1: Usuário autorizado
  const eventoAutorizado = {
    parameter: { secret: secretValido },
    postData: {
      contents: JSON.stringify({
        update_id: 555001,
        inline_query: {
          id: 'iq_auth_1',
          from: { id: parseInt(chatId, 10), is_bot: false },
          query: 'gaso',
          offset: ''
        }
      })
    }
  };

  const respostaAutorizado = ctx.doPost(eventoAutorizado);
  const textoAutorizado = respostaAutorizado?.getContent ? respostaAutorizado.getContent() : (respostaAutorizado?.getContentText ? respostaAutorizado.getContentText() : '');
  assert.strictEqual(textoAutorizado, 'OK', 'doPost deve retornar OK para inline_query autorizada');
  assert.ok(chamadasPost.some(c => c.url.includes('/answerInlineQuery')), 'Fast-path deve responder a inline query imediatamente');

  // Caso 2: Usuário não autorizado (ID desconhecido)
  limparCaptura();
  const eventoNaoAutorizado = {
    parameter: { secret: secretValido },
    postData: {
      contents: JSON.stringify({
        update_id: 555002,
        inline_query: {
          id: 'iq_unauth_2',
          from: { id: 999999999, is_bot: false },
          query: 'nora',
          offset: ''
        }
      })
    }
  };

  const respostaNaoAutorizado = ctx.doPost(eventoNaoAutorizado);
  const textoNaoAutorizado = respostaNaoAutorizado?.getContent ? respostaNaoAutorizado.getContent() : (respostaNaoAutorizado?.getContentText ? respostaNaoAutorizado.getContentText() : '');
  assert.strictEqual(textoNaoAutorizado, 'Forbidden', 'doPost deve bloquear com Forbidden para usuário não cadastrado');
  assert.strictEqual(chamadasPost.length, 0, 'Não deve disparar chamadas para consultas não autorizadas');
  console.log('  ✓ Blindagem de autorização e fast-path no doPost 100% validadas.');

  console.log('\n✅ Todos os testes de Telegram Mini App e Inline Mode passaram com 100% de sucesso!');
}

executarTestesTelegramInlineEWebApp().catch(err => {
  console.error('❌ Falha nos testes de Telegram Mini App e Inline Mode:', err);
  process.exit(1);
});
