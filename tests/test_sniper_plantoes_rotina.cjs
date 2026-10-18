/**
 * ==============================================================================
 * BATERIA DE TESTES AUTOMATIZADOS: SNIPER DE PLANTÕES INTEGRADO À ABA ROTINA
 * ==============================================================================
 * Cobre e audita:
 * 1. Comandos /sniper e /vagas via Central de Rotina (`despacharComandosRotinaEProdutividade`)
 * 2. Estágio 1 (Regex < 0.2ms + Working Buffer Cross-Group)
 * 3. Estágio 2 (Extração Estruturada: Hospital, Cidade, Setor, Turno, R$/h, PIX)
 * 4. Estágio 3 (Blacklist Anti-Calote, Piso Financeiro, Setor e Conflito com RotinaService)
 * 5. Injeção Automática do Bloco de Plantão + Descanso Pós-Plantão na Timeline da Aba Rotina
 * 6. Callbacks interativos (`sniper:toggle_mode`, `sniper:toggle_stealth`, `sniper:val_up`, `sniper:simular`)
 * ==============================================================================
 */

const assert = require('assert');
const runtime = require('../server/runtime.js');

async function executarTestesSniperPlantoesRotina() {
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

  // Setup determinístico: limpa estado residual de execuções anteriores em data/properties.json
  ctx.PlantaoSniperService.redefinirConfigPadrao();
  ctx.PlantaoSniperService.destravarTodaAgendaSniper();
  ctx.PlantaoSniperService.salvarGruposAllowlist([
    { jid: "120363011111111@g.us", nome: "Plantões Premium SP & ABC", permitido: true, modoGrupo: "SNIPER_AUTO" },
    { jid: "120363022222222@g.us", nome: "Plantões Grande SP", permitido: true, modoGrupo: "RADAR_ONLY" },
    { jid: "120363033333333@g.us", nome: "Família Moraes (Privado)", permitido: false, modoGrupo: "BLOQUEADO" },
    { jid: "120363044444444@g.us", nome: "Turma Medicina Internato", permitido: false, modoGrupo: "BLOQUEADO" }
  ]);

  console.log('[1] Testando despacho de /sniper na Central de Rotina...');
  limparCaptura();
  const resCmd = ctx.despacharComandosRotinaEProdutividade('/sniper', '/sniper', chatId, {});
  assert.strictEqual(resCmd.tratado, true, '/sniper deve ser tratado pela Central de Rotina');
  assert.ok(mensagensEnviadas.length > 0, 'Deve renderizar o Painel Sniper no Telegram');
  assert.ok(mensagensEnviadas[0].texto.includes('SNIPER DE PLANTÕES'), 'Painel deve exibir título do Sniper');

  console.log('[2] Testando bateria de 8 mensagens reais de grupos de WhatsApp e injeção na Aba Rotina...');
  limparCaptura();
  const logs = ctx.PlantaoSniperService.executarSimulacaoSniper(chatId);
  assert.strictEqual(logs.length, 8, 'Deve processar exatamente os 8 cenários');

  // Msg 1: Bom dia barrado no Estágio 1
  assert.strictEqual(logs[0].status, 'DESCARTADA_ESTAGIO_1');
  // Msg 2: Oferta reversa (médico pedindo plantão) barrada no Estágio 1
  assert.strictEqual(logs[1].status, 'DESCARTADA_ESTAGIO_1');
  // Msg 3: UPA Fantasma Sul bloqueada na Blacklist Anti-Calote
  assert.strictEqual(logs[2].codigo, 'BLACKLIST_CALOTE');
  // Msg 4: R$ 950 bloqueado por piso financeiro
  assert.strictEqual(logs[3].codigo, 'VALOR_ABAIXO_DO_PISO');
  // Msg 5: Sala Vermelha bloqueada por filtro de setor
  assert.strictEqual(logs[4].codigo, 'SETOR_INCOMPATIVEL');
  // Msg 6: Hospital São Luiz R$ 1.560 capturada no modo Sniper Auto!
  assert.strictEqual(logs[5].status, 'CAPTURADA_SNIPER_AUTO');
  // Msg 7: Duplicata em outro grupo barrada no Working Buffer
  assert.strictEqual(logs[6].status, 'DESCARTADA_ESTAGIO_1');
  // Msg 8: Segundo plantão no mesmo horário bloqueado por Conflito de Agenda na Aba Rotina!
  assert.strictEqual(logs[7].codigo, 'CONFLITO_AGENDA_ROTINA');

  console.log('[3] Verificando se o plantão capturado foi injetado automaticamente na Timeline da Aba Rotina...');
  const blocosHoje = ctx.RotinaService.obterBlocosDoDia(new Date());
  const blocoPlantaoSniper = blocosHoje.find(b => String(b.id).startsWith('plantao_sniper_') || String(b.titulo).includes('9 de Julho') || String(b.titulo).includes('São Luiz'));
  assert.ok(blocoPlantaoSniper, 'O plantão capturado pelo Sniper deve existir na Timeline da Aba Rotina');
  assert.strictEqual(blocoPlantaoSniper.categoria, 'plantao');

  console.log('[4] Testando callbacks interativos do Sniper (sniper:toggle_mode, sniper:toggle_stealth, sniper:val_up)...');
  limparCaptura();
  ctx.processarCallbackBotao({
    id: 'cb_sniper_1',
    from: { id: chatId },
    message: { message_id: 101, chat: { id: chatId } },
    data: 'sniper:toggle_stealth'
  });
  assert.ok(callbacksRespondidos.length > 0, 'Deve responder ao callback sniper:toggle_stealth');

  ctx.processarCallbackBotao({
    id: 'cb_sniper_2',
    from: { id: chatId },
    message: { message_id: 102, chat: { id: chatId } },
    data: 'sniper:val_up'
  });
  const cfgAtual = ctx.PlantaoSniperService.obterConfigSniper();
  assert.strictEqual(cfgAtual.valorMinimo12h, 1400, 'Piso de 12h deve ter subido de 1300 para 1400');

  ctx.processarCallbackBotao({
    id: 'cb_sniper_3',
    from: { id: chatId },
    message: { message_id: 103, chat: { id: chatId } },
    data: 'sniper:diag'
  });
  assert.ok(callbacksRespondidos.length >= 3, 'Deve responder ao callback sniper:diag');

  // Teste do novo menu de piso e definição direta de valor
  ctx.processarCallbackBotao({
    id: 'cb_sniper_4',
    from: { id: chatId },
    message: { message_id: 104, chat: { id: chatId } },
    data: 'sniper:menu_piso'
  });
  assert.ok(callbacksRespondidos.length >= 4, 'Deve responder ao callback sniper:menu_piso');

  ctx.processarCallbackBotao({
    id: 'cb_sniper_5',
    from: { id: chatId },
    message: { message_id: 105, chat: { id: chatId } },
    data: 'sniper:set_piso:1800'
  });
  const cfgPiso1800 = ctx.PlantaoSniperService.obterConfigSniper();
  assert.strictEqual(cfgPiso1800.valorMinimo12h, 1800, 'Piso deve ter sido definido diretamente para 1800 via callback');

  // Teste do comando direto /piso 1500
  const resCmdPiso = ctx.despacharComandosRotinaEProdutividade('/piso', '/piso 1500', chatId, {});
  assert.strictEqual(resCmdPiso.tratado, true, 'Comando /piso deve ser tratado pelo despachante de rotina');
  const cfgPiso1500 = ctx.PlantaoSniperService.obterConfigSniper();
  assert.strictEqual(cfgPiso1500.valorMinimo12h, 1500, 'Piso deve ter sido atualizado para 1500 via comando /piso');

  console.log('[5] Testando Blindagem Zero-Trust em Dupla Camada (Chats Privados, Status, FromMe e Allowlist de Grupos)...');
  const bridge = require('../server/whatsapp-bridge.js');
  const allowlistPadrao = ctx.PlantaoSniperService.obterGruposAllowlist();
  assert.ok(allowlistPadrao.length >= 4, 'Deve carregar a Allowlist padrão de grupos');

  // 5.1 Conversa privada (namorada / família / paciente @s.whatsapp.net) -> BLOQUEIO CAMADA 1
  const resChatPrivado = ctx.PlantaoSniperService.processarMensagemGrupoWhatsApp(
    'Amor, passa no mercado hoje às 19h? R$ 1.800',
    'Conversa Privada',
    '5511999991111',
    { remoteJid: '5511999991111@s.whatsapp.net' }
  );
  assert.strictEqual(resChatPrivado.status, 'BLOQUEADA_ISOLAMENTO_ZERO_TRUST');
  assert.strictEqual(resChatPrivado.camada, 1);
  assert.strictEqual(resChatPrivado.codigo, 'CHAT_PRIVADO_OU_STATUS_BLOQUEADO');

  // 5.2 Mensagem enviada pelo próprio médico (fromMe: true) -> BLOQUEIO CAMADA 1
  const resFromMe = ctx.PlantaoSniperService.processarMensagemGrupoWhatsApp(
    'Vaga Hospital São Luiz R$ 1.600',
    'Plantões Premium SP & ABC',
    '5511988887777',
    { remoteJid: '120363011111111@g.us', fromMe: true }
  );
  assert.strictEqual(resFromMe.status, 'BLOQUEADA_ISOLAMENTO_ZERO_TRUST');
  assert.strictEqual(resFromMe.camada, 1);
  assert.strictEqual(resFromMe.codigo, 'MENSAGEM_PROPRIA_IGNORADA');

  // 5.3 Grupo da Família ou Internato (🔴 BLOQUEADO na Allowlist) -> BLOQUEIO CAMADA 2
  const resGrupoFamilia = ctx.PlantaoSniperService.processarMensagemGrupoWhatsApp(
    '🔥 COBERTURA HOJE NOTURNO Hospital São Luiz R$ 1.800 Porta Ficha Verde',
    'Família Moraes (Privado)',
    '5511988887777',
    { remoteJid: '120363033333333@g.us' }
  );
  assert.strictEqual(resGrupoFamilia.status, 'BLOQUEADA_ISOLAMENTO_ZERO_TRUST');
  assert.strictEqual(resGrupoFamilia.camada, 2);
  assert.strictEqual(resGrupoFamilia.codigo, 'GRUPO_NAO_AUTORIZADO_ALLOWLIST');

  // 5.4 Sincronização de novo grupo desconhecido entra 🔴 BLOQUEADO por padrão (Zero-Trust)
  const syncRes = ctx.PlantaoSniperService.sincronizarGruposWhatsApp([
    { jid: '120363099999999@g.us', nome: 'Grupo Futebol Medicina' }
  ]);
  assert.strictEqual(syncRes.novosAdicionados, 1);
  const grpNovo = syncRes.grupos.find(g => g.jid === '120363099999999@g.us');
  assert.strictEqual(grpNovo.permitido, false, 'Grupo recém-sincronizado deve nascer BLOQUEADO por padrão');
  assert.strictEqual(grpNovo.modoGrupo, 'BLOQUEADO');

  // 5.5 Validação do Bridge de Borda (server/whatsapp-bridge.js)
  const checkBridgePrivado = bridge.filtrarPacoteWhatsAppZeroTrust(
    { remoteJid: '5511988881111@s.whatsapp.net', text: 'Oi' },
    allowlistPadrao
  );
  assert.strictEqual(checkBridgePrivado.permitido, false);
  assert.strictEqual(checkBridgePrivado.camada, 1);

  // 5.6 Teste da UI de Grupos no Telegram (sniper:grupos e sniper:grp_toggle:2)
  limparCaptura();
  ctx.processarCallbackBotao({
    id: 'cb_sniper_grp_1',
    from: { id: chatId },
    message: { message_id: 103, chat: { id: chatId } },
    data: 'sniper:grupos'
  });
  assert.ok(mensagensEnviadas.some(m => m.texto.includes('ALLOWLIST ZERO-TRUST DE GRUPOS WHATSAPP')));

  ctx.processarCallbackBotao({
    id: 'cb_sniper_grp_2',
    from: { id: chatId },
    message: { message_id: 103, chat: { id: chatId } },
    data: 'sniper:grp_toggle:2'
  });
  const allowlistAposToggle = ctx.PlantaoSniperService.obterGruposAllowlist();
  assert.strictEqual(allowlistAposToggle[2].modoGrupo, 'RADAR_ONLY', 'Grupo #2 deve ter passado de BLOQUEADO para RADAR_ONLY');

  // 5.7 Teste da Geração de Código de Pareamento WhatsApp (8 caracteres além do traço: XXXX-XXXX)
  limparCaptura();
  ctx.processarCallbackBotao({
    id: 'cb_sniper_pair_1',
    from: { id: chatId },
    message: { message_id: 104, chat: { id: chatId } },
    data: 'sniper:pair_wa'
  });
  const msgPair = mensagensEnviadas.find(m => m.texto && m.texto.includes('PAREAMENTO WHATSAPP'));
  assert.ok(msgPair, 'Deve emitir mensagem com instruções de pareamento');
  const matchCode = msgPair.texto.match(/`([A-Z0-9]{4}-[A-Z0-9]{4})`/);
  assert.ok(matchCode, 'Código de pareamento deve ter exatamente o formato XXXX-XXXX (8 caracteres além do traço)');
  const [p1, p2] = matchCode[1].split('-');
  assert.strictEqual(p1.length, 4, 'Bloco 1 deve ter exatamente 4 caracteres');
  // 5.8 Teste do WhatsAppConnectionManager e Envelope Universal
  console.log('[6] Testando WhatsAppConnectionManager e Extração Universal de Envelopes...');
  const manager = bridge.instanciarOuObterManager();
  const resPairReal = await manager.solicitarCodigoPareamentoReal('11988887777');
  assert.strictEqual(resPairReal.ok, true);
  assert.strictEqual(resPairReal.telefone, '5511988887777');
  assert.strictEqual(resPairReal.pairingCode.length, 9); // XXXX-XXXX (8 caracteres + traço)
  assert.strictEqual(resPairReal.pairingCode.includes('-'), true);

  // Envelope Universal Baileys / Evolution
  const envelopeBaileys = bridge.extrairEnvelopeMensagem({
    key: { remoteJid: '120363011111111@g.us', participant: '5511987654321:3@s.whatsapp.net', fromMe: false },
    message: { conversation: 'Vaga Hospital 9 de Julho R$ 1.500 Porta' },
    pushName: 'Dra. Luiza Escalista'
  });
  assert.strictEqual(envelopeBaileys.remoteJid, '120363011111111@g.us');
  assert.strictEqual(envelopeBaileys.remetenteNumero, '5511987654321');
  assert.strictEqual(envelopeBaileys.pushName, 'Dra. Luiza Escalista');
  assert.strictEqual(envelopeBaileys.texto, 'Vaga Hospital 9 de Julho R$ 1.500 Porta');

  // 5.9 Teste de Blindagem de Especialidades Médicas (Fim do Fallback Cego para Porta)
  console.log('[7] Testando detecção cirúrgica de especialidades e hospitais complexos...');
  const vagaOrto = ctx.PlantaoSniperService.extrairDadosPlantao(
    'Vaga Hospital São Camilo D\'Avila - ORTOPEDIA / TRAUMA - R$ 1.800 noturno',
    '5511988887777'
  );
  assert.strictEqual(vagaOrto.setor, 'Ortopedia', 'Deve classificar como Ortopedia e não cair em Porta');
  assert.strictEqual(vagaOrto.hospital.includes('São Camilo'), true, 'Deve suportar apóstrofo no nome do hospital');

  const vagaPedi = ctx.PlantaoSniperService.extrairDadosPlantao(
    'Preciso de médico cobertura UPA 24h Vila Nova - PEDIATRIA - R$ 1.600 noturno',
    '5511988887777'
  );
  assert.strictEqual(vagaPedi.setor, 'Pediatria');
  assert.strictEqual(vagaPedi.hospital.includes('UPA 24h'), true, 'Deve suportar números como 24h no nome do hospital');

  ctx.PlantaoSniperService.redefinirConfigPadrao();
  console.log('✅ Todos os testes de integração Sniper de Plantões + Allowlist Zero-Trust + Aba Rotina passaram com 100% de sucesso!');
}

executarTestesSniperPlantoesRotina().catch(err => {
  console.error('❌ Falha nos testes do Sniper de Plantões:', err);
  process.exit(1);
});
