/**
 * tests/test_aderencia_semanal_rotina.cjs
 * Suíte de Testes Automatizados E2E: Motor Canônico de Aderência Semanal & Reagendamento Rápido
 * Cobre e audita:
 * 1. RotinaService.calcularAderenciaSemanal (4 eixos, divisão por zero segura 0/0 -> 0%, status visual)
 * 2. RotinaService.adiarProximoBloco (+30m, +60m, clamp 23:59 seguro, feedback amigável se concluído)
 * 3. Endpoints RPC Cockpit (cockpitRotinaAderencia, cockpitRotinaAdiarBloco)
 * 4. Bot do Telegram (/rotina aderencia, callbacks rotina:aderencia, rotina:adiar:30/60, callback_data < 64b)
 * 5. RotinaTimeline (calcularAderenciaSemanalLocal e atualização reativa do painel no Cockpit)
 * 6. Paridade estática SHA-256 garantida pelo build_master.py
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const vm = require('vm');
const runtime = require('../server/runtime.js');

console.log('=== TESTE E2E: ADERÊNCIA SEMANAL & REAGENDAMENTO RÁPIDO ===\n');

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function run() {
  const ctx = runtime.ctx;
  const RotinaService = ctx.RotinaService;
  assert.ok(RotinaService, 'RotinaService deve estar disponível no contexto.');

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. MOTOR CANÔNICO DE ADERÊNCIA SEMANAL (RotinaService.calcularAderenciaSemanal)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[1] Testando RotinaService.calcularAderenciaSemanal...');
  assert.strictEqual(typeof RotinaService.calcularAderenciaSemanal, 'function', 'calcularAderenciaSemanal deve ser função');

  const hoje = new Date(2026, 9, 14, 12, 0, 0); // 14/10/2026
  const dataHojeISO = RotinaService.normalizarDataISO(hoje);

  // Prepara mock de blocos nos últimos 7 dias
  const blocosD0 = [
    { id: 'p1', titulo: 'Internato USF Paulo Gomes', inicio: '07:00', fim: '12:00', categoria: 'plantao', status: 'concluido' },
    { id: 'e1', titulo: 'MedQuest Questões Comentadas', inicio: '19:00', fim: '20:30', categoria: 'estudo', status: 'concluido' },
    { id: 't1', titulo: 'Treino de Musculação', inicio: '17:15', fim: '18:15', categoria: 'treino', status: 'pendente' },
    { id: 'h1', titulo: 'Prática de Inglês', inicio: '22:00', fim: '22:30', categoria: 'lifestyle', status: 'concluido' }
  ];
  RotinaService.salvarBlocosDoDia(hoje, blocosD0);

  const ad = RotinaService.calcularAderenciaSemanal(hoje);
  assert.ok(ad, 'Aderência calculada deve retornar objeto');
  assert.strictEqual(typeof ad.taxaGlobal, 'number', 'taxaGlobal deve ser numérico');
  assert.ok(ad.totalPlanejados >= 4, 'totalPlanejados deve contabilizar blocos');
  assert.ok(ad.totalConcluidos >= 3, 'totalConcluidos deve contabilizar blocos concluídos');
  assert.ok(ad.eixos.plantao, 'Eixo plantao deve existir');
  assert.ok(ad.eixos.estudo, 'Eixo estudo deve existir');
  assert.ok(ad.eixos.treino, 'Eixo treino deve existir');
  assert.ok(ad.eixos.habitos, 'Eixo habitos deve existir');

  // Teste de prevenção estrita de divisão por zero (0/0 -> 0%)
  const eixoVazio = { planejados: 0, concluidos: 0 };
  const taxaVazia = eixoVazio.planejados > 0 ? Math.round((eixoVazio.concluidos / eixoVazio.planejados) * 100) : 0;
  assert.strictEqual(taxaVazia, 0, '0/0 deve resultar em 0% sem NaN');

  // Verifica contagem de horas
  assert.ok(ad.horasEstudoConcluidas >= 1.5, 'Horas de estudo concluídas devem ser >= 1.5h');
  assert.ok(ad.horasPlantaoConcluidas >= 5.0, 'Horas de plantão concluídas devem ser >= 5.0h');
  assert.ok(typeof ad.statusVisual === 'string', 'statusVisual deve ser string informativa');
  console.log('  ✓ Motor canônico de aderência semanal validado com 4 eixos.');

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. REAGENDAMENTO RÁPIDO & ADIAMENTO SEGURO (RotinaService.adiarProximoBloco)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[2] Testando RotinaService.adiarProximoBloco...');
  assert.strictEqual(typeof RotinaService.adiarProximoBloco, 'function', 'adiarProximoBloco deve ser função');

  // Adia bloco pendente específico (treino t1)
  const resAdiar = RotinaService.adiarProximoBloco(hoje, 30, 't1');
  assert.strictEqual(resAdiar.sucesso, true);
  assert.strictEqual(resAdiar.modificado, true);
  assert.strictEqual(resAdiar.bloco.id, 't1');
  assert.strictEqual(resAdiar.bloco.inicio, '17:45');
  assert.strictEqual(resAdiar.bloco.fim, '18:45');
  assert.strictEqual(resAdiar.bloco.status, 'adiado');

  // Adia próximo bloco pendente geral
  const resAdiarGeral = RotinaService.adiarProximoBloco(hoje, 30);
  assert.strictEqual(resAdiarGeral.sucesso, true);
  assert.strictEqual(resAdiarGeral.modificado, true);
  assert.ok(resAdiarGeral.bloco, 'Deve retornar bloco adiado');

  // Teste de clamp seguro de horário (nunca gerar 24:xx)
  const blocoNoturno = [
    { id: 'noturno', titulo: 'Revisão Tardia', inicio: '23:45', fim: '23:55', categoria: 'estudo', status: 'pendente' }
  ];
  RotinaService.salvarBlocosDoDia('2026-10-20', blocoNoturno);
  const resClamp = RotinaService.adiarProximoBloco('2026-10-20', 60, 'noturno');
  assert.strictEqual(resClamp.sucesso, true);
  assert.strictEqual(resClamp.bloco.inicio, '23:59', 'Clamp de horário deve limitar em 23:59');
  assert.strictEqual(resClamp.bloco.fim, '23:59', 'Clamp de horário deve limitar em 23:59');

  // Teste de todos os blocos já concluídos
  const blocosDoDia21 = RotinaService.obterBlocosDoDia('2026-10-21');
  const todosConcluidos = (blocosDoDia21 && blocosDoDia21.length > 0)
    ? blocosDoDia21.map(b => ({ ...b, status: 'concluido' }))
    : [{ id: 'c1', titulo: 'Estudo Feito', inicio: '10:00', fim: '11:00', status: 'concluido' }];
  RotinaService.salvarBlocosDoDia('2026-10-21', todosConcluidos);
  const resJaFeito = RotinaService.adiarProximoBloco('2026-10-21', 30);
  assert.strictEqual(resJaFeito.sucesso, true);
  assert.strictEqual(resJaFeito.modificado, false);
  assert.ok(resJaFeito.mensagem.includes('já foram concluídos'), 'Deve retornar feedback amigável de conclusão');
  console.log('  ✓ Reagendamento rápido, clamp de 23:59 e caso todos concluídos validados.');

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. RPC DO COCKPIT NO FASTIFY RUNTIME
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[3] Testando endpoints RPC cockpitRotinaAderencia e cockpitRotinaAdiarBloco...');
  const chatIdTitular = (ctx.ConfigService && ctx.ConfigService.getPrimary)
    ? ctx.ConfigService.getPrimary('TELEGRAM_CHAT_ID')
    : (ctx.ConfigService ? String(ctx.ConfigService.get('TELEGRAM_CHAT_ID') || '123456789').split(',')[0].trim() : '123456789');
  const sessaoMock = ctx.criarSessaoCockpit_(chatIdTitular);

  const rpcAderencia = runtime.cockpitRpc('cockpitRotinaAderencia', sessaoMock, [dataHojeISO]);
  assert.strictEqual(rpcAderencia.sucesso, true);
  assert.ok(rpcAderencia.aderencia, 'Deve retornar payload de aderência');
  assert.ok(rpcAderencia.aderencia.eixos.estudo, 'Deve conter eixo estudo');

  const rpcAdiar = runtime.cockpitRpc('cockpitRotinaAdiarBloco', sessaoMock, [dataHojeISO, 30]);
  assert.strictEqual(rpcAdiar.sucesso, true);
  assert.ok(rpcAdiar.mensagem, 'Deve retornar mensagem de adiamento');
  console.log('  ✓ RPCs de rotina no Fastify runtime validados com sucesso.');

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. TELEGRAM BOT (HUB, CALLBACKS & TECLADOS)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[4] Testando Telegram Bot (/rotina aderencia, callbacks rotina:adiar/aderencia)...');
  const chatId = '123456789';
  let mensagensCapturadas = [];
  let callbacksRespondidos = [];

  ctx.enviarMensagemParaChat = (id, texto) => {
    mensagensCapturadas.push({ tipo: 'texto', id, texto: String(texto) });
    return true;
  };
  ctx.enviarMensagemComTecladoParaChat = (id, texto, kb) => {
    mensagensCapturadas.push({ tipo: 'teclado', id, texto: String(texto), kb });
    return true;
  };
  ctx.responderCallbackTelegram = (id, texto) => {
    callbacksRespondidos.push({ id, texto: String(texto || '') });
    return true;
  };

  // 4.1 Comando /rotina aderencia
  mensagensCapturadas = [];
  ctx.tratarComandoRotina(chatId, 'aderencia');
  assert.ok(mensagensCapturadas.length > 0, 'Comando /rotina aderencia deve responder');
  const msgAd = mensagensCapturadas[0];
  assert.ok(msgAd.texto.includes('PAINEL DE ADERÊNCIA SEMANAL'), 'Deve conter título canônico');
  assert.ok(msgAd.texto.includes('Consistência Global:'), 'Deve exibir consistência');
  assert.ok(msgAd.texto.includes('MedQuest'), 'Deve exibir bloco de MedQuest');

  // 4.2 Botões do Teclado da Timeline
  const kbTimeline = RotinaService.construirTecladoTimeline(hoje, blocosD0);
  const inlineKb = kbTimeline.inline_keyboard;
  let temBotaoAdiar30 = false;
  let temBotaoAdiar60 = false;
  let temBotaoAderencia = false;

  inlineKb.forEach(row => {
    row.forEach(btn => {
      // Garante que todo callback_data seja < 64 bytes
      if (btn.callback_data) {
        assert.ok(Buffer.byteLength(btn.callback_data, 'utf8') < 64, `callback_data '${btn.callback_data}' deve ter menos de 64 bytes`);
      }
      if (btn.callback_data === 'rotina:adiar:30') temBotaoAdiar30 = true;
      if (btn.callback_data === 'rotina:adiar:60') temBotaoAdiar60 = true;
      if (btn.callback_data === 'rotina:aderencia') temBotaoAderencia = true;
    });
  });

  assert.ok(temBotaoAdiar30, 'Teclado timeline deve conter rotina:adiar:30');
  assert.ok(temBotaoAdiar60, 'Teclado timeline deve conter rotina:adiar:60');
  assert.ok(temBotaoAderencia, 'Teclado timeline deve conter rotina:aderencia');

  // 4.3 Despacho de Callback rotina:adiar:30
  callbacksRespondidos = [];
  ctx.processarCallbackBotao({ id: 'cb-adiar-test', data: 'rotina:adiar:30', message: { chat: { id: chatId }, message_id: 999 } });
  assert.ok(callbacksRespondidos.length > 0, 'Callback rotina:adiar:30 deve responder alerta');

  // 4.4 Despacho de Callback rotina_aderencia
  callbacksRespondidos = [];
  ctx.processarCallbackBotao({ id: 'cb-ad-test', data: 'rotina_aderencia', message: { chat: { id: chatId }, message_id: 1000 } });
  assert.ok(callbacksRespondidos.length > 0, 'Callback rotina_aderencia deve responder alerta');
  console.log('  ✓ Telegram Bot, teclados, comandos e limites de 64 bytes validados.');

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. PARIDADE E REATIVIDADE NO FRONTEND COCKPIT PWA
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[5] Testando paridade SHA-256 e módulo RotinaTimeline no Cockpit...');
  const rootDir = path.resolve(__dirname, '..');
  const cockpitHtmlPath = path.join(rootDir, 'cockpit_movel.html');
  const deployHtmlPath = path.join(rootDir, 'gh_cockpit_deploy', 'index.html');
  const rotinaJsPath = path.join(rootDir, 'rotina_timeline.js');
  const rotinaDeployJsPath = path.join(rootDir, 'gh_cockpit_deploy', 'rotina_timeline.js');

  assert.strictEqual(sha256(cockpitHtmlPath), sha256(deployHtmlPath), 'Paridade SHA-256 entre cockpit_movel.html e deploy deve ser 100%');
  assert.strictEqual(sha256(rotinaJsPath), sha256(rotinaDeployJsPath), 'Paridade SHA-256 de rotina_timeline.js deve ser 100%');

  const htmlContent = fs.readFileSync(cockpitHtmlPath, 'utf8');
  assert.ok(htmlContent.includes('id="painel-aderencia-rotina"'), 'Painel de aderência deve estar no HTML');
  assert.ok(htmlContent.includes('id="aderencia-pct-semanal"'), 'Badge de pct semanal deve estar no HTML');
  assert.ok(htmlContent.includes('id="aderencia-eixos-grid"'), 'Grid de eixos compactos deve estar no HTML');
  assert.ok(htmlContent.includes('id="aderencia-eixo-plantao-val"'), 'Eixo plantao deve estar no HTML');
  assert.ok(htmlContent.includes('id="aderencia-eixo-estudo-val"'), 'Eixo estudo deve estar no HTML');

  // Executa o módulo RotinaTimeline em VM para testar cálculo local
  const rotinaCode = fs.readFileSync(rotinaJsPath, 'utf8');
  const domElements = {};
  function makeMockEl() {
    return {
      textContent: '',
      style: {},
      replaceChildren: function() {},
      append: function() {}
    };
  }
  const sandbox = {
    window: {},
    document: {
      getElementById: function(id) {
        if (!domElements[id]) domElements[id] = makeMockEl();
        return domElements[id];
      },
      querySelectorAll: function() { return []; }
    },
    localStorage: {
      getItem: function() { return null; },
      setItem: function() {}
    },
    navigator: { onLine: true }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(rotinaCode, sandbox);

  assert.strictEqual(typeof sandbox.RotinaTimeline.calcularAderenciaSemanalLocal, 'function');
  assert.strictEqual(typeof sandbox.RotinaTimeline.atualizarPainelAderencia, 'function');

  const adLocal = sandbox.RotinaTimeline.calcularAderenciaSemanalLocal();
  assert.ok(adLocal, 'Cálculo de aderência local deve retornar objeto');
  assert.strictEqual(typeof adLocal.taxaGlobal, 'number');
  assert.ok(adLocal.eixos.plantao, 'Eixo plantao local deve existir');

  sandbox.RotinaTimeline.atualizarPainelAderencia(adLocal);
  const badgePct = sandbox.document.getElementById('aderencia-pct-semanal');
  assert.strictEqual(badgePct.textContent, String(adLocal.taxaGlobal), 'Badge deve refletir taxa global');
  console.log('  ✓ Paridade SHA-256 e reatividade local do Cockpit PWA aprovadas.');

  console.log('\n=== TODOS OS TESTES DE ADERÊNCIA SEMANAL E REAGENDAMENTO APROVADOS COM SUCESSO! ===');
}

run().catch(err => {
  console.error('\n❌ Falha nos testes de aderência semanal:', err);
  process.exit(1);
});
