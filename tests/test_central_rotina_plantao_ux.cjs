/**
 * ==============================================================================
 * BATERIA DE TESTES AUTOMATIZADOS: CENTRAL DE ROTINA & PLANTÃO DO MÉDICO (UX)
 * ==============================================================================
 * Cobre e audita:
 * 1. Central de Rotina & Lifestyle Adaptativo (`enviarRotinaBot`, `ux:hub:rotina`)
 * 2. Roteamento de callbacks `ux:rotina:*` com determinismo 0ms e edição in-place
 * 3. Consulta de Agenda Hoje e Amanhã (`consultarEventosAgenda`, `ux:rotina:agenda`, `/agenda`)
 * 4. Listagem de Tarefas do Notion (`listarTarefasHojeNotion`, `ux:rotina:tasks`, `/tasks`)
 * 5. Briefing Matinal & Check-in Noturno (`enviarBriefingMatinal`, `enviarCheckinNoturno`)
 * 6. Fechamento e Passagem de Plantão (`gerarResumoFimPlantao`, `/plantao_fim`, `ux:rotina:plantao_fim`)
 * 7. Botão de 1 Toque para Copiar Resumo de Plantão para Prontuário (`ux:copiar:<uuid>`)
 * 8. Retorno contextual em 1 toque: [🔙 Central de Rotina] e [🏠 Início] em 100% dos fluxos
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');
const runtime = require('../server/runtime.js');

async function executarTestesCentralRotinaPlantaoUX() {
  const ctx = runtime.ctx;
  const chatId = (ctx.ConfigService && ctx.ConfigService.getPrimary)
    ? ctx.ConfigService.getPrimary('TELEGRAM_CHAT_ID')
    : (ctx.ConfigService ? String(ctx.ConfigService.get('TELEGRAM_CHAT_ID') || '123456789').split(',')[0].trim() : '123456789');

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
  ctx.responderCallbackTelegram = (id, texto) => {
    callbacksRespondidos.push({ id, texto: String(texto || '') });
    return true;
  };
  ctx.executarPostTelegram = (url, payload) => {
    if (payload && payload.text) {
      mensagensEnviadas.push({ tipo: 'edit', id: payload.chat_id, texto: String(payload.text), kb: payload.reply_markup });
    }
    return true;
  };

  function limparCaptura() {
    mensagensEnviadas = [];
    callbacksRespondidos = [];
  }

  function extrairCallbacks(kb) {
    if (!kb) return [];
    const lista = [];
    const matrix = kb.inline_keyboard || kb;
    if (Array.isArray(matrix)) {
      matrix.forEach(row => {
        if (Array.isArray(row)) {
          row.forEach(btn => {
            if (btn && btn.callback_data) lista.push(btn.callback_data);
          });
        }
      });
    }
    return lista;
  }

  function extrairTextosBotoes(kb) {
    if (!kb) return [];
    const lista = [];
    const matrix = kb.inline_keyboard || kb;
    if (Array.isArray(matrix)) {
      matrix.forEach(row => {
        if (Array.isArray(row)) {
          row.forEach(btn => {
            if (btn && btn.text) lista.push(btn.text);
          });
        }
      });
    }
    return lista;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BLOCO 1: TELA PRINCIPAL DA CENTRAL DE ROTINA (enviarRotinaBot e ux:hub:rotina)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[1] Testando Central de Rotina Principal (enviarRotinaBot)...');
  limparCaptura();
  ctx.enviarRotinaBot(chatId);
  assert.ok(mensagensEnviadas.length > 0, 'enviarRotinaBot deve enviar mensagem');
  const msgPrincipal = mensagensEnviadas[0];
  assert.ok(msgPrincipal.texto.includes('Central de Rotina & Lifestyle Adaptativo'), 'Deve conter cabeçalho canônico');
  
  const cbsPrincipal = extrairCallbacks(msgPrincipal.kb);
  const textosPrincipal = extrairTextosBotoes(msgPrincipal.kb);

  assert.ok(!cbsPrincipal.includes('rotina:ajustar'), 'Central de Rotina NÃO deve conter botão manual Ajustar Rotina');
  assert.ok(!cbsPrincipal.includes('rotina:descanso'), 'Central de Rotina NÃO deve conter botão Modo Descanso');
  assert.ok(cbsPrincipal.includes('rotina:reset'), 'Deve conter botão Restaurar Padrão');
  assert.ok(!cbsPrincipal.includes('rotina:cal_sync'), 'Central de Rotina NÃO deve conter botão manual Sincronizar Google (auto-sync)');
  assert.ok(cbsPrincipal.includes('ux:rotina:agenda'), 'Deve conter botão Agenda de Hoje');
  assert.ok(cbsPrincipal.includes('ux:rotina:agenda_amanha'), 'Deve conter botão Agenda de Amanhã');
  assert.ok(!cbsPrincipal.includes('ux:rotina:tasks'), 'Central de Rotina NÃO deve conter botão Tarefas Notion');
  assert.ok(cbsPrincipal.includes('ux:rotina:briefing'), 'Deve conter botão Briefing Matinal');
  assert.ok(cbsPrincipal.includes('ux:rotina:checkin'), 'Deve conter botão Check-in Noturno');
  assert.ok(!cbsPrincipal.includes('ux:rotina:duvida'), 'Central de Rotina NÃO deve conter botão Dúvida MedQuest');
  assert.ok(cbsPrincipal.includes('ux:hub:inicio'), 'Deve conter botão [🏠 Início]');

  // Teste de segurança: usuário não-titular
  limparCaptura();
  ctx.enviarRotinaBot('999999999_nao_titular');
  assert.ok(mensagensEnviadas.length > 0, 'Deve bloquear usuário não-titular');
  assert.ok(mensagensEnviadas[0].texto.includes('Recurso Restrito ao Titular'), 'Deve avisar sobre recurso restrito');
  const cbsNaoTitular = extrairCallbacks(mensagensEnviadas[0].kb);
  assert.ok(cbsNaoTitular.includes('ux:hub:inicio'), 'Deve conter retorno ao início mesmo para não titular');

  // ─────────────────────────────────────────────────────────────────────────────
  // BLOCO 2: ROTEAMENTO DOS CALLBACKS ux:rotina:* (IN-PLACE & RETORNO CONTEXTUAL)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[2] Testando Callbacks ux:rotina:* em tratarCallbackUX...');

  // 2.1 Agenda Hoje
  limparCaptura();
  ctx.tratarCallbackUX({ id: 'cb1', data: 'ux:rotina:agenda', message: { chat: { id: chatId }, message_id: 101 } });
  assert.ok(mensagensEnviadas.length > 0, 'ux:rotina:agenda deve responder');
  assert.strictEqual(mensagensEnviadas[0].tipo, 'edit', 'Deve editar mensagem in-place (sem flood)');
  assert.ok(mensagensEnviadas[0].texto.includes('AGENDA DE HOJE') || mensagensEnviadas[0].texto.includes('Nenhum compromisso') || mensagensEnviadas[0].texto.includes('Calendário'), 'Deve exibir agenda de hoje');
  const cbsAgenda = extrairCallbacks(mensagensEnviadas[0].kb);
  assert.ok(cbsAgenda.includes('ux:hub:rotina'), 'Agenda deve ter [🔙 Central de Rotina]');
  assert.ok(cbsAgenda.includes('ux:hub:inicio'), 'Agenda deve ter [🏠 Início]');
  assert.ok(cbsAgenda.includes('ux:rotina:agenda_amanha'), 'Agenda hoje deve alternar para agenda de amanhã');

  // 2.2 Agenda Amanhã
  limparCaptura();
  ctx.tratarCallbackUX({ id: 'cb2', data: 'ux:rotina:agenda_amanha', message: { chat: { id: chatId }, message_id: 102 } });
  assert.ok(mensagensEnviadas.length > 0, 'ux:rotina:agenda_amanha deve responder');
  assert.strictEqual(mensagensEnviadas[0].tipo, 'edit', 'Deve editar mensagem in-place');
  assert.ok(mensagensEnviadas[0].texto.includes('AGENDA DE AMANHÃ') || mensagensEnviadas[0].texto.includes('Nenhum compromisso') || mensagensEnviadas[0].texto.includes('Calendário'));
  const cbsAgendaAmanha = extrairCallbacks(mensagensEnviadas[0].kb);
  assert.ok(cbsAgendaAmanha.includes('ux:hub:rotina'), 'Agenda amanhã deve ter [🔙 Central de Rotina]');
  assert.ok(cbsAgendaAmanha.includes('ux:hub:inicio'), 'Agenda amanhã deve ter [🏠 Início]');
  assert.ok(cbsAgendaAmanha.includes('ux:rotina:agenda'), 'Agenda amanhã deve alternar para agenda de hoje');

  // 2.3 Tarefas Notion (tasks)
  limparCaptura();
  ctx.tratarCallbackUX({ id: 'cb3', data: 'ux:rotina:tasks', message: { chat: { id: chatId }, message_id: 103 } });
  assert.ok(mensagensEnviadas.length > 0, 'ux:rotina:tasks deve responder');
  assert.strictEqual(mensagensEnviadas[0].tipo, 'edit', 'Deve editar mensagem in-place');
  assert.ok(mensagensEnviadas[0].texto.includes('Tarefas') || mensagensEnviadas[0].texto.includes('PENDÊNCIAS') || mensagensEnviadas[0].texto.includes('Notion Tasks'));
  const cbsTasks = extrairCallbacks(mensagensEnviadas[0].kb);
  assert.ok(cbsTasks.includes('ux:hub:rotina'), 'Tarefas deve ter [🔙 Central de Rotina]');
  assert.ok(cbsTasks.includes('ux:hub:inicio'), 'Tarefas deve ter [🏠 Início]');
  assert.ok(cbsTasks.includes('ux:rotina:tasks'), 'Tarefas deve ter botão de atualizar');

  // 2.4 Briefing Matinal (briefing)
  limparCaptura();
  ctx.tratarCallbackUX({ id: 'cb4', data: 'ux:rotina:briefing', message: { chat: { id: chatId }, message_id: 104 } });
  assert.ok(mensagensEnviadas.length > 0, 'ux:rotina:briefing deve responder');
  assert.strictEqual(mensagensEnviadas[0].tipo, 'edit', 'Deve editar mensagem in-place');
  assert.ok(mensagensEnviadas[0].texto.includes('Bom dia') || mensagensEnviadas[0].texto.includes('Raio-X') || mensagensEnviadas[0].texto.includes('PÓS-PLANTÃO'));
  const cbsBriefing = extrairCallbacks(mensagensEnviadas[0].kb);
  assert.ok(cbsBriefing.includes('ux:hub:rotina'), 'Briefing deve ter [🔙 Central de Rotina]');
  assert.ok(cbsBriefing.includes('ux:hub:inicio'), 'Briefing deve ter [🏠 Início]');

  // 2.5 Check-in Noturno (checkin)
  limparCaptura();
  ctx.tratarCallbackUX({ id: 'cb5', data: 'ux:rotina:checkin', message: { chat: { id: chatId }, message_id: 105 } });
  assert.ok(mensagensEnviadas.length > 0, 'ux:rotina:checkin deve responder');
  assert.strictEqual(mensagensEnviadas[0].tipo, 'edit', 'Deve editar mensagem in-place');
  assert.ok(mensagensEnviadas[0].texto.includes('Check-in da Noite Adaptativo'));
  const cbsCheckin = extrairCallbacks(mensagensEnviadas[0].kb);
  assert.ok(cbsCheckin.includes('ux:hub:rotina'), 'Check-in deve ter [🔙 Central de Rotina]');
  assert.ok(cbsCheckin.includes('ux:hub:inicio'), 'Check-in deve ter [🏠 Início]');
  assert.ok(cbsCheckin.includes('habit_medquest'), 'Check-in deve ter MedQuest');
  assert.ok(cbsCheckin.includes('energy_3'), 'Check-in deve ter escala de energia');

  // 2.6 Encerramento de Plantão (plantao_fim)
  limparCaptura();
  ctx.tratarCallbackUX({ id: 'cb6', data: 'ux:rotina:plantao_fim', message: { chat: { id: chatId }, message_id: 106 } });
  assert.ok(mensagensEnviadas.length > 0, 'ux:rotina:plantao_fim deve responder');
  assert.strictEqual(mensagensEnviadas[0].tipo, 'edit', 'Deve editar mensagem in-place');
  assert.ok(mensagensEnviadas[0].texto.includes('DEBRIEFING & FECHAMENTO DE PLANTÃO'), 'Deve exibir título de debriefing');
  assert.ok(mensagensEnviadas[0].texto.includes('Checklist de Segurança'), 'Deve conter checklist de segurança');
  const cbsPlantaoFim = extrairCallbacks(mensagensEnviadas[0].kb);
  assert.ok(cbsPlantaoFim.includes('ux:hub:rotina'), 'Fim de plantão deve ter [🔙 Central de Rotina]');
  assert.ok(cbsPlantaoFim.includes('ux:hub:inicio'), 'Fim de plantão deve ter [🏠 Início]');
  assert.ok(cbsPlantaoFim.some(c => c.startsWith('ux:copiar:')), 'Fim de plantão deve conter botão de 1 toque de cópia do resumo');

  // 2.7 Dúvida MedQuest (duvida)
  limparCaptura();
  ctx.tratarCallbackUX({ id: 'cb7', data: 'ux:rotina:duvida', message: { chat: { id: chatId }, message_id: 107 } });
  assert.ok(mensagensEnviadas.length > 0, 'ux:rotina:duvida deve responder');
  assert.strictEqual(mensagensEnviadas[0].tipo, 'edit', 'Deve editar mensagem in-place');
  assert.ok(mensagensEnviadas[0].texto.includes('MEDQUEST / DÚVIDAS MÉDICAS'));
  const cbsDuvida = extrairCallbacks(mensagensEnviadas[0].kb);
  assert.ok(cbsDuvida.includes('ux:hub:rotina'), 'Dúvida deve ter [🔙 Central de Rotina]');
  assert.ok(cbsDuvida.includes('ux:hub:inicio'), 'Dúvida deve ter [🏠 Início]');

  // ─────────────────────────────────────────────────────────────────────────────
  // BLOCO 3: COMANDOS SLASH DIRETOS VIA ROUTER (/rotina, /agenda, /tasks, /briefing, /checkin, /plantao_fim)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[3] Testando Comandos Slash Diretos no Router...');

  // 3.1 /rotina sem argumentos
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/rotina' });
  assert.ok(mensagensEnviadas.length > 0, '/rotina deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('Central de Rotina & Lifestyle Adaptativo') || mensagensEnviadas[0].texto.includes('HUB DE ROTINA & PRODUTIVIDADE'), 'Deve abrir a Central de Rotina');
  const cbsSlashRotina = extrairCallbacks(mensagensEnviadas[0].kb);
  assert.ok(cbsSlashRotina.includes('ux:rotina:agenda') || cbsSlashRotina.includes('rotina_agenda'), '/rotina deve ter agenda');
  assert.ok(!cbsSlashRotina.includes('ux:rotina:tasks') && !cbsSlashRotina.includes('rotina_tasks'), '/rotina NÃO deve ter tasks Notion');
  assert.ok(!cbsSlashRotina.includes('rotina_duvida'), '/rotina NÃO deve ter duvida MedQuest');
  assert.ok(cbsSlashRotina.includes('ux:rotina:briefing') || cbsSlashRotina.includes('rotina_briefing'), '/rotina deve ter briefing');
  assert.ok(cbsSlashRotina.includes('ux:rotina:checkin') || cbsSlashRotina.includes('rotina_checkin'), '/rotina deve ter checkin');

  // 3.2 /agenda
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/agenda' });
  assert.ok(mensagensEnviadas.length > 0, '/agenda deve responder');
  const cbsSlashAgenda = extrairCallbacks(mensagensEnviadas[0].kb);
  assert.ok(cbsSlashAgenda.includes('ux:hub:rotina'), '/agenda deve ter [🔙 Central de Rotina]');
  assert.ok(cbsSlashAgenda.includes('ux:hub:inicio'), '/agenda deve ter [🏠 Início]');

  // 3.3 /tasks
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/tasks' });
  assert.ok(mensagensEnviadas.length > 0, '/tasks deve responder');
  const cbsSlashTasks = extrairCallbacks(mensagensEnviadas[0].kb);
  assert.ok(cbsSlashTasks.includes('ux:hub:rotina'), '/tasks deve ter [🔙 Central de Rotina]');
  assert.ok(cbsSlashTasks.includes('ux:hub:inicio'), '/tasks deve ter [🏠 Início]');

  // 3.4 /briefing
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/briefing' });
  assert.ok(mensagensEnviadas.length > 0, '/briefing deve responder');
  const cbsSlashBriefing = extrairCallbacks(mensagensEnviadas[0].kb);
  assert.ok(cbsSlashBriefing.includes('ux:hub:rotina'), '/briefing deve ter [🔙 Central de Rotina]');
  assert.ok(cbsSlashBriefing.includes('ux:hub:inicio'), '/briefing deve ter [🏠 Início]');

  // 3.5 /checkin
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/checkin' });
  assert.ok(mensagensEnviadas.length > 0, '/checkin deve responder');
  const cbsSlashCheckin = extrairCallbacks(mensagensEnviadas[0].kb);
  assert.ok(cbsSlashCheckin.includes('ux:hub:rotina'), '/checkin deve ter [🔙 Central de Rotina]');
  assert.ok(cbsSlashCheckin.includes('ux:hub:inicio'), '/checkin deve ter [🏠 Início]');

  // 3.6 /plantao_fim
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/plantao_fim' });
  assert.ok(mensagensEnviadas.length > 0, '/plantao_fim deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('DEBRIEFING & FECHAMENTO DE PLANTÃO'));
  const cbsSlashPlantaoFim = extrairCallbacks(mensagensEnviadas[0].kb);
  assert.ok(cbsSlashPlantaoFim.includes('ux:hub:rotina'), '/plantao_fim deve ter [🔙 Central de Rotina]');
  assert.ok(cbsSlashPlantaoFim.includes('ux:hub:inicio'), '/plantao_fim deve ter [🏠 Início]');
  const btnCopiaSlash = cbsSlashPlantaoFim.find(c => c.startsWith('ux:copiar:'));
  assert.ok(btnCopiaSlash, '/plantao_fim deve conter botão de cópia com UUID');

  // ─────────────────────────────────────────────────────────────────────────────
  // BLOCO 4: BOTÃO DE CÓPIA DO RESUMO DO PLANTÃO EM 1 TOQUE (ux:copiar:<uuid>)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[4] Testando Ação de Cópia em 1 Toque do Resumo do Plantão...');
  limparCaptura();
  ctx.processarCallbackBotao({
    id: 'cb_copiar_plantao',
    data: btnCopiaSlash,
    from: { id: chatId },
    message: { chat: { id: chatId }, message_id: 201 }
  });
  assert.ok(mensagensEnviadas.length > 0, 'Clique em copiar resumo deve enviar mensagem formatada');
  const msgCopiada = mensagensEnviadas[0];
  assert.ok(msgCopiada.texto.includes('PASSAGEM DE PLANTÃO / DEBRIEFING') || msgCopiada.texto.includes('FECHAMENTO DE PLANTÃO'), 'Deve conter cabeçalho canônico de cópia');
  assert.ok(msgCopiada.texto.includes('CHECKLIST DE'), 'Deve conter checklist no texto de cópia');
  assert.ok(msgCopiada.texto.includes('```text'), 'Deve estar em bloco ```text para cópia instantânea em 1 toque');

  // ─────────────────────────────────────────────────────────────────────────────
  // BLOCO 5: CALLBACKS DE TIMELINE (tratarCallbackRotina)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[5] Testando Callbacks da Timeline (tratarCallbackRotina)...');

  // 5.1 rotina:ajustar
  limparCaptura();
  ctx.processarCallbackBotao({
    id: 'cb_rot_ajustar',
    data: 'rotina:ajustar',
    from: { id: chatId },
    message: { chat: { id: chatId }, message_id: 301 }
  });
  assert.ok(mensagensEnviadas.length > 0, 'rotina:ajustar deve responder com instruções');
  assert.ok(mensagensEnviadas[0].texto.includes('AJUSTES DE ROTINA NO GOOGLE CALENDAR'), 'Deve orientar que ajustes são feitos no Google Calendar');
  const cbsAjustar = extrairCallbacks(mensagensEnviadas[0].kb);
  assert.ok(cbsAjustar.includes('ux:hub:rotina'), 'rotina:ajustar deve ter [🔙 Central de Rotina]');
  assert.ok(cbsAjustar.includes('ux:hub:inicio'), 'rotina:ajustar deve ter [🏠 Início]');

  // 5.2 rotina:ver_amanha
  limparCaptura();
  ctx.processarCallbackBotao({
    id: 'cb_rot_amanha',
    data: 'rotina:ver_amanha',
    from: { id: chatId },
    message: { chat: { id: chatId }, message_id: 302 }
  });
  assert.ok(mensagensEnviadas.length > 0, 'rotina:ver_amanha deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('ROTINA DE AMANHÃ'));
  const cbsVerAmanha = extrairCallbacks(mensagensEnviadas[0].kb);
  assert.ok(cbsVerAmanha.includes('rotina:ver_hoje'), 'Deve ter botão para voltar para hoje');
  assert.ok(cbsVerAmanha.includes('ux:hub:rotina'), 'Deve ter [🔙 Central de Rotina]');
  assert.ok(cbsVerAmanha.includes('ux:hub:inicio'), 'Deve ter [🏠 Início]');

  console.log('✅ Todos os testes de Central de Rotina & Plantão do Médico (UX) passaram com 100% de sucesso!');
}

if (require.main === module) {
  executarTestesCentralRotinaPlantaoUX().catch(err => {
    console.error('❌ Falha nos testes de Central de Rotina & Plantão UX:', err);
    process.exit(1);
  });
}

module.exports = { executarTestesCentralRotinaPlantaoUX };
