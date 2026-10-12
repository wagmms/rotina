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

  console.log('[TESTE 10] Bloqueio de comandos de rotina/notion para convidado');
  limpar();
  const cmdsBloqueados = ['/rotina', '/agenda', '/habitos', '/task', '/briefing', '/checkin'];
  for (const cmd of cmdsBloqueados) {
    limpar();
    const res = ctx.despacharComandosAgendaRotinaEAudio_(cmd, cmd, idConvidado);
    assert.strictEqual(res.executado, true, `Comando ${cmd} deve ser interceptado para convidado`);
    assert.ok(mensagensEnviadas.length > 0, `Deve enviar mensagem ao bloquear ${cmd}`);
    const msgBloq = mensagensEnviadas[0];
    assert.ok(msgBloq.texto.includes('Restrito ao Titular') || msgBloq.texto.includes('privado do Dr. Wagner') || msgBloq.texto.includes('exclusivo do administrador'), `Mensagem de bloqueio de ${cmd} deve indicar acesso restrito`);
  }

  console.log('[TESTE 11] Catálogo Slash e Botões de Ajuda Ocultam Rotina para Convidado');
  const catalogoTitular = ctx.obterCatalogoComandosSlash(idTitular);
  const catalogoConvidado = ctx.obterCatalogoComandosSlash(idConvidado);
  const cmdsTitular = catalogoTitular.flatMap(cat => cat.comandos).map(c => c.cmd);
  const cmdsConvidado = catalogoConvidado.flatMap(cat => cat.comandos).map(c => c.cmd);
  assert.ok(cmdsTitular.includes('/rotina'), 'Titular deve ter /rotina no catálogo slash');
  assert.ok(!cmdsConvidado.includes('/rotina'), 'Convidado NÃO deve ter /rotina no catálogo slash');
  assert.ok(cmdsConvidado.includes('/voz'), 'Convidado deve ter /voz no catálogo slash');

  const tecladoAjudaConvidado = ctx.construirTecladoCategoriasAjuda(idConvidado);
  const textoBotoesAjuda = JSON.stringify(tecladoAjudaConvidado);
  assert.ok(!textoBotoesAjuda.includes('Rotina'), 'Teclado de ajuda do convidado não deve exibir termo Rotina');
  assert.ok(textoBotoesAjuda.includes('Preceptor Clínico'), 'Teclado de ajuda do convidado deve exibir Preceptor Clínico');

  console.log('[TESTE 12] Bloqueio de Notificações de Agenda, Briefings e Hábitos');
  limpar();
  // Notificação periódica matinal automática NÃO deve enviar para convidado
  const resBriefingAuto = ctx.enviarBriefingMatinal(idConvidado, false);
  assert.strictEqual(resBriefingAuto, false, 'Briefing periódico automático não deve ser enviado para convidado');
  assert.strictEqual(mensagensEnviadas.length, 0, 'Nenhuma mensagem matinal deve ser enviada para convidado');

  // Relatório semanal de hábitos NÃO deve enviar para convidado
  const resHabitos = ctx.enviarRelatorioSemanalHabitos(idConvidado);
  assert.strictEqual(resHabitos, false, 'Relatório de hábitos deve retornar false para convidado');
  assert.strictEqual(mensagensEnviadas.length, 0, 'Nenhuma mensagem de hábitos deve ser enviada');

  // Ações interativas forçadas por convidado devem exibir tela de bloqueio restrito ao titular
  ctx.enviarCheckinNoturno(idConvidado);
  assert.ok(mensagensEnviadas.length > 0, 'Checkin deve responder com aviso');
  assert.ok(mensagensEnviadas[0].texto.includes('Restrito ao Titular'), 'Check-in deve indicar restrição ao titular');

  limpar();
  ctx.consultarEventosAgenda('hoje', idConvidado);
  assert.ok(mensagensEnviadas.length > 0, 'Consulta de agenda deve responder com aviso');
  assert.ok(mensagensEnviadas[0].texto.includes('Restrito ao Titular'), 'Consulta de agenda deve indicar restrição ao titular');

  console.log('[TESTE 13] Mensagem de /cockpit personalizada para Titular vs Convidado');
  limpar();
  ctx.rotearAtalhoTecladoFixo('📱 Cockpit', '/cockpit', idTitular);
  const msgCockpitTitular = mensagensEnviadas[0];
  assert.ok(msgCockpitTitular.texto.includes('Corpo'), 'Titular deve ver menção a Corpo no /cockpit');
  assert.ok(msgCockpitTitular.texto.includes('Rotina'), 'Titular deve ver menção a Rotina no /cockpit');

  limpar();
  ctx.rotearAtalhoTecladoFixo('📱 Cockpit', '/cockpit', idConvidado);
  const msgCockpitConvidado = mensagensEnviadas[0];
  assert.ok(!msgCockpitConvidado.texto.includes('Corpo:'), 'Convidado NÃO deve ver Corpo no /cockpit');
  assert.ok(!msgCockpitConvidado.texto.includes('Rotina:'), 'Convidado NÃO deve ver Rotina no /cockpit');
  assert.ok(msgCockpitConvidado.texto.includes('SOAP:'), 'Convidado deve ver SOAP no /cockpit');
  assert.ok(msgCockpitConvidado.texto.includes('Leitos:'), 'Convidado deve ver Leitos no /cockpit');
  assert.ok(msgCockpitConvidado.texto.includes('Calculadoras:'), 'Convidado deve ver Calculadoras no /cockpit');
  // URL deve conter &guest=1 para convidado
  const btnCockpit = msgCockpitConvidado.kb.inline_keyboard[0][0];
  assert.ok(btnCockpit.web_app.url.includes('guest=1'), 'URL do Cockpit para convidado deve conter &guest=1');

  console.log('[TESTE 14] Bloqueio de RPC de Perfil e Registro de Peso para Convidado');
  const tokenConvidado = ctx.criarSessaoCockpit_(idConvidado);
  assert.throws(() => {
    ctx.cockpitPerfil(tokenConvidado);
  }, /Acesso restrito ao titular/i);
  assert.throws(() => {
    ctx.cockpitRegistrarPeso(tokenConvidado, 75, 15, 1);
  }, /Acesso restrito ao titular/i);

  // Titular deve conseguir acessar normalmente
  const tokenTitular = ctx.criarSessaoCockpit_(idTitular);
  const perfilTitular = ctx.cockpitPerfil(tokenTitular);
  assert.ok(perfilTitular && typeof perfilTitular === 'object', 'Titular deve obter objeto de perfil');

  console.log('[TESTE 15] Paridade Estrita de SHA-256 e Elementos no Cockpit PWA');
  const fs = require('fs');
  const crypto = require('crypto');
  const htmlMovel = fs.readFileSync('cockpit_movel.html', 'utf8');
  const htmlDeploy = fs.readFileSync('gh_cockpit_deploy/index.html', 'utf8');
  const hashMovel = crypto.createHash('sha256').update(htmlMovel).digest('hex');
  const hashDeploy = crypto.createHash('sha256').update(htmlDeploy).digest('hex');
  assert.strictEqual(hashMovel, hashDeploy, 'cockpit_movel.html e gh_cockpit_deploy/index.html devem ter SHA-256 idêntico');

  console.log('[TESTE 16] Elementos e Lógica de Convidado no HTML do Cockpit');
  assert.ok(htmlMovel.includes('id="cockpit-nav-grid"'), 'Cockpit deve ter id="cockpit-nav-grid"');
  assert.ok(htmlMovel.includes('function ehConvidadoCockpit'), 'Cockpit deve definir ehConvidadoCockpit()');
  assert.ok(htmlMovel.includes('function aplicarRestricoesConvidado'), 'Cockpit deve definir aplicarRestricoesConvidado()');
  assert.ok(htmlMovel.includes('grid-cols-5'), 'Cockpit deve ter lógica para reduzir para 5 colunas');
  assert.ok(htmlMovel.includes('tab-soap'), 'Cockpit deve redirecionar convidado para tab-soap');

  console.log('\n✅ TODOS OS 16 TESTES DE ONBOARDING, AJUDA E PRIVACIDADE DO CONVIDADO PASSARAM COM SUCESSO!');
}

executarTestesOnboardingEAjuda().catch(err => {
  console.error('❌ FALHA NOS TESTES DE ONBOARDING E AJUDA:', err);
  process.exit(1);
});
