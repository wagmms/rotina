/**
 * TESTES DE ONBOARDING DO CONVIDADO (DR. VINICIUS) E CENTRAL DE AJUDA INTERATIVA
 * Valida a experiência didática beira-leito sem alterar a estrutura do bot:
 * 1. Nome e identificação: Dr. Wagner para titular, Dr. Vinicius para convidado.
 * 2. Comando /start: Ágil para Dr. Wagner, acolhedor e didático em 3 passos para Dr. Vinicius.
 * 3. Comando /ajuda: Novo menu interativo limpo com botões de navegação.
 * 4. Callbacks interativos de Ajuda: Guia Rápido, Exemplos Beira-Leito, Especialidades e Catálogo Completo.
 */
const assert = require('assert');
const runtime = require('../server/runtime.js');

async function executarTestesOnboardingEAjuda() {
  const ctx = runtime.ctx;

  const idTitular = 1771571035;
  const idConvidado = 1154165211;

  const propsScript = ctx.PropertiesService.getScriptProperties();
  propsScript.setProperty('TELEGRAM_CHAT_ID', `${idTitular},${idConvidado}`);
  propsScript.setProperty('TELEGRAM_GUEST_NAME', 'Dr. Vinicius');
  propsScript.setProperty('TELEGRAM_TITULAR_NAME', 'Dr. Wagner');
  if (ctx.ConfigService && typeof ctx.ConfigService.invalidar === 'function') {
    ctx.ConfigService.invalidar();
  }

  let mensagensEnviadas = [];
  let callbacksRespondidos = [];

  ctx.enviarMensagemParaChat = (id, texto) => {
    mensagensEnviadas.push({ tipo: 'texto', id, texto: String(texto) });
    return true;
  };
  ctx.enviarMensagemComTecladoParaChat = (id, texto, kb) => {
    mensagensEnviadas.push({ tipo: 'teclado', id, texto: String(texto), kb });
    return true;
  };
  ctx.enviarMensagemComTecladoFixo = (id, texto) => {
    mensagensEnviadas.push({ tipo: 'teclado_fixo', id, texto: String(texto) });
    return true;
  };
  ctx.enviarTelaBot = (id, texto, kb, messageId) => {
    mensagensEnviadas.push({ tipo: 'tela_bot', id, texto: String(texto), kb, messageId });
    return true;
  };
  ctx.responderCallbackTelegram = (id, texto) => {
    callbacksRespondidos.push({ id, texto: String(texto || '') });
    return true;
  };

  function limpar() {
    mensagensEnviadas = [];
    callbacksRespondidos = [];
  }

  console.log('[TESTE 1] Identificação de nomes por perfil');
  assert.strictEqual(ctx.ehUsuarioTitular(idTitular), true, 'Deve identificar titular');
  assert.strictEqual(ctx.ehUsuarioTitular(idConvidado), false, 'Deve identificar convidado');
  assert.strictEqual(ctx.obterNomeTratamentoUsuario(idTitular), 'Dr. Wagner', 'Nome titular deve ser Dr. Wagner');
  assert.strictEqual(ctx.obterNomeTratamentoUsuario(idConvidado), 'Dr. Vinicius', 'Nome convidado deve ser Dr. Vinicius');

  console.log('[TESTE 2] Comando /start para Dr. Wagner (Titular)');
  limpar();
  ctx.rotearComandoSistema('/start', '/start', idTitular);
  const msgTitular = mensagensEnviadas.find(m => m.texto.includes('Dr. Wagner'));
  assert.ok(msgTitular, 'Dr. Wagner deve receber saudação direta de titular');
  assert.ok(!mensagensEnviadas.some(m => m.texto.includes('Dr. Vinicius')), 'Dr. Wagner não deve ver mensagem de convidado');

  console.log('[TESTE 3] Comando /start para Dr. Vinicius (Convidado)');
  limpar();
  ctx.rotearComandoSistema('/start', '/start', idConvidado);
  const msgBoasVindas = mensagensEnviadas.find(m => m.tipo === 'teclado' && m.texto.includes('Dr. Vinicius'));
  assert.ok(msgBoasVindas, 'Dr. Vinicius deve receber mensagem acolhedora com seu nome');
  assert.ok(msgBoasVindas.texto.includes('3 maneiras super simples') || msgBoasVindas.texto.includes('3 maneiras'), 'Deve ensinar as 3 formas de uso');
  assert.ok(msgBoasVindas.texto.includes('Sala Vermelha'), 'Deve citar cenários clínicos');
  assert.ok(msgBoasVindas.texto.includes('Texto ou Áudio'), 'Deve ensinar envio por texto ou áudio');
  assert.ok(msgBoasVindas.kb && msgBoasVindas.kb.inline_keyboard, 'Deve conter botões inline de ação');

  const botoesStart = msgBoasVindas.kb.inline_keyboard.flat();
  const temGuiaPassos = botoesStart.some(b => b.callback_data === 'ux:ajuda:passos');
  const temExemplos = botoesStart.some(b => b.callback_data === 'ux:ajuda:exemplos');
  const temHubInicio = botoesStart.some(b => b.callback_data === 'ux:hub:inicio');
  const temManual = botoesStart.some(b => b.callback_data === 'ux:ajuda:todos');
  assert.ok(temGuiaPassos, 'Deve conter botão para Guia Rápido');
  assert.ok(temExemplos, 'Deve conter botão para Exemplos Práticos');
  assert.ok(temHubInicio, 'Deve conter botão para Central de Cenários');
  assert.ok(temManual, 'Deve conter botão para Manual');

  console.log('[TESTE 4] Comando /ajuda sem argumentos (Menu Interativo Limpo)');
  limpar();
  ctx.rotearComandoSistema('/ajuda', '/ajuda', idConvidado);
  const msgAjudaMenu = mensagensEnviadas[0];
  assert.ok(msgAjudaMenu, 'Deve responder ao comando /ajuda');
  assert.ok(msgAjudaMenu.texto.includes('CENTRAL DE AJUDA & GUIA PRÁTICO'), 'Deve conter cabeçalho da central de ajuda');
  assert.ok(msgAjudaMenu.texto.includes('Linguagem Natural'), 'Deve instruir uso de linguagem natural/áudio');
  assert.ok(!msgAjudaMenu.texto.includes('MANUAL DE COMANDOS CANÔNICOS (COPILOTO CLÍNICO 4.0)'), 'Não deve despejar lista gigantesca');

  console.log('[TESTE 5] Callback ux:ajuda:passos (Guia Rápido 3 Passos)');
  limpar();
  ctx.tratarCallbackUX({
    id: 'cb_passos',
    data: 'ux:ajuda:passos',
    message: { chat: { id: idConvidado }, message_id: 101 }
  });
  const msgPassos = mensagensEnviadas[0];
  assert.ok(msgPassos, 'Deve responder ao callback de passos');
  assert.ok(msgPassos.texto.includes('COMO USAR O ULTRA ROTINA EM 3 PASSOS'), 'Deve conter tela de 3 passos');
  assert.ok(msgPassos.texto.includes('/novo') || msgPassos.texto.includes('Novo Paciente'), 'Deve ensinar a limpar a memória com /novo');

  console.log('[TESTE 6] Callback ux:ajuda:exemplos (Exemplos Práticos Beira-Leito)');
  limpar();
  ctx.tratarCallbackUX({
    id: 'cb_exemplos',
    data: 'ux:ajuda:exemplos',
    message: { chat: { id: idConvidado }, message_id: 102 }
  });
  const msgExemplos = mensagensEnviadas[0];
  assert.ok(msgExemplos, 'Deve responder ao callback de exemplos');
  assert.ok(msgExemplos.texto.includes('EXEMPLOS PRÁTICOS BEIRA-LEITO'), 'Deve conter tela de exemplos práticos');
  assert.ok(msgExemplos.texto.includes('/dva nora 70kg'), 'Deve conter exemplo de DVA');
  assert.ok(msgExemplos.texto.includes('/gaso'), 'Deve conter exemplo de Gasometria');
  assert.ok(msgExemplos.texto.includes('/dose'), 'Deve conter exemplo de Doses');

  console.log('[TESTE 7] Callback ux:ajuda:categorias (Especialidades Clínicas)');
  limpar();
  ctx.tratarCallbackUX({
    id: 'cb_categorias',
    data: 'ux:ajuda:categorias',
    message: { chat: { id: idConvidado }, message_id: 103 }
  });
  const msgCats = mensagensEnviadas[0];
  assert.ok(msgCats, 'Deve responder ao callback de especialidades');
  assert.ok(msgCats.texto.includes('COMANDOS POR ESPECIALIDADE CLÍNICA'), 'Deve conter tela de especialidades');

  console.log('[TESTE 8] Callback ajuda_todas (Catálogo Completo)');
  limpar();
  ctx.tratarCallbackAjuda_({ id: 'cb_todas' }, 'ajuda_todas', { chatId: idConvidado, msgId: 104 });
  const msgTodas = mensagensEnviadas[0];
  assert.ok(msgTodas, 'Deve responder ao catálogo completo');
  assert.ok(msgTodas.texto.includes('MANUAL DE COMANDOS CANÔNICOS'), 'Deve exibir o catálogo de comandos');
  const botoesTodas = msgTodas.kb.inline_keyboard.flat();
  assert.ok(botoesTodas.some(b => b.callback_data === 'ux:ajuda:menu'), 'Deve permitir retornar à Central de Ajuda');

  console.log('[TESTE 9] Busca filtrada /ajuda cardio');
  limpar();
  ctx.enviarManualCompletoComandos(idConvidado, 'cardio');
  const msgCardio = mensagensEnviadas[0];
  assert.ok(msgCardio, 'Deve responder com a especialidade cardio');
  assert.ok(msgCardio.texto.includes('CARDIO') || msgCardio.texto.includes('PNEUMO') || msgCardio.texto.includes('/sca'), 'Deve conter comandos de cardio');

  console.log('\n✅ TODOS OS 9 TESTES DE ONBOARDING E AJUDA PASSARAM COM SUCESSO!');
}

executarTestesOnboardingEAjuda().catch(err => {
  console.error('❌ FALHA NOS TESTES DE ONBOARDING E AJUDA:', err);
  process.exit(1);
});
