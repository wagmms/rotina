// -*- coding: utf-8 -*-
/**
 * Testes unitários da Rotina Adaptativa (Time-Blocking Dinâmico, Overrides e Handlers)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

function setupEnvironment() {
  const store = {};
  const cache = {};
  const sent = [];

  global.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (k) => store[k] ?? null,
      setProperty: (k, v) => { store[k] = String(v); },
      deleteProperty: (k) => { delete store[k]; },
      getProperties: () => ({ ...store })
    })
  };

  global.CacheService = {
    getScriptCache: () => ({
      get: (k) => cache[k] ?? null,
      put: (k, v) => { cache[k] = v; },
      remove: (k) => { delete cache[k]; }
    })
  };

  global.CalendarApp = {
    _eventos: [],
    _setMockEventos: function(evs) { this._eventos = evs; },
    getDefaultCalendar: function() {
      const self = this;
      return {
        getEvents: () => self._eventos,
        createEvent: (tit, ini, fim, opt) => ({
          getId: () => 'ev-mock-id',
          getTitle: () => tit,
          getStartTime: () => ini,
          getEndTime: () => fim
        })
      };
    }
  };

  global.enviarChatAction = () => {};
  store.TELEGRAM_BOT_TOKEN = 'mock_token_123';
  store.TELEGRAM_CHAT_ID = '123456';

  const files = [
    '00_config.js',
    '01_utils.js',
    '02_calculadoras_puras.js',
    '03_bases_locais.js',
    '04_motores_ia.js',
    '05_notion.js',
    '06_rotina_agenda.js',
    '07a_telegram_router.js',
    '07b_telegram_preceptor.js',
    '07c_telegram_consultas_e_ia.js',
    '07d_telegram_callbacks.js',
    '07e_telegram_midia_e_leitos.js',
    '07f_telegram_calculadoras_parser.js',
    '07g_telegram_ajuda_e_protocolos.js',
    '08_main.js',
    '09_enfermaria.js',
    '10_pdf_receita.js',
    '11_entrega_confiavel.js',
    '12_experiencia_bot.js'
  ];

  const vm = require('vm');
  for (const f of files) {
    const p = path.join(SRC_DIR, f);
    if (fs.existsSync(p)) {
      vm.runInThisContext(fs.readFileSync(p, 'utf8'));
    }
  }

  // Mocks aplicados após carregamento dos módulos para capturar envios
  global.enviarMensagemParaChat = (chatId, texto) => {
    sent.push({ chatId, texto });
    return true;
  };
  global.enviarMensagemComTecladoParaChat = (chatId, texto, teclado) => {
    sent.push({ chatId, texto, teclado });
    return true;
  };
  global.enviarMensagemComTecladoFixo = (chatId, texto) => {
    sent.push({ chatId, texto, fixo: true });
    return true;
  };
  global.enviarMensagemSegmentada = (chatId, texto, teclado) => {
    sent.push({ chatId, texto, teclado });
    return true;
  };
  global.responderCallbackTelegram = (cbId, alerta) => {
    sent.push({ cbId, alerta });
    return true;
  };
  global.executarPostTelegram = (url, payload) => {
    sent.push({ url, payload });
    return { getResponseCode: () => 200, getContentText: () => '{"ok":true}' };
  };

  return { store, cache, sent };
}

function runTests() {
  console.log("Iniciando bateria de testes da Rotina Adaptativa...");

  const env = setupEnvironment();

  // Teste 1: Grade Base por dia da semana
  for (let dia = 0; dia <= 6; dia++) {
    const grade = RotinaService.obterGradeBase(dia);
    assert(Array.isArray(grade), `Grade do dia ${dia} deve ser um array`);
    assert(grade.length >= 5, `Grade do dia ${dia} deve ter pelo menos 5 blocos`);
    for (const b of grade) {
      assert(b.id, "Bloco deve ter id");
      assert(b.titulo, "Bloco deve ter titulo");
      assert(b.inicio, "Bloco deve ter inicio");
      assert(b.fim, "Bloco deve ter fim");
      assert(b.categoria, "Bloco deve ter categoria");
      assert(b.status, "Bloco deve ter status");
    }
  }
  console.log("✓ Teste 1: Grade base de segunda a domingo validada");

  // Teste 2: Leitura padrão de blocos sem override
  const dataSegunda = new Date('2026-10-05T10:00:00'); // Segunda-feira
  const blocosSeg = RotinaService.obterBlocosDoDia(dataSegunda);
  assert(blocosSeg.some(b => b.id === 'treino' && b.titulo.includes('Superior A')), "Segunda-feira deve conter treino Superior A");
  assert(blocosSeg.some(b => b.id === 'estudo'), "Segunda-feira deve conter bloco de estudo");
  assert(blocosSeg.some(b => b.id === 'cochilo'), "Segunda-feira deve conter cochilo");
  console.log("✓ Teste 2: Leitura padrão sem override correta");

  // Teste 3: Aplicação de instrução "não vou treinar hoje"
  const resCancelTreino = RotinaService.aplicarInstrucao(dataSegunda, "hoje não vou treinar");
  assert(resCancelTreino.sucesso, "Instrução de cancelamento deve ter sucesso");
  const bTreino = resCancelTreino.blocos.find(b => b.id === 'treino');
  assert.equal(bTreino.status, 'pulado', "Status do treino deve ser 'pulado'");
  assert(bTreino.nota.includes('Cancelado'), "Nota deve indicar cancelamento");
  
  // Persistência gravada em ScriptProperties
  const dataISO = RotinaService.normalizarDataISO(dataSegunda);
  assert(env.store['ROTINA_OVERRIDE_' + dataISO], "Override deve ter sido salvo em ScriptProperties");
  console.log("✓ Teste 3: Cancelamento de treino via instrução gravado e persistido");

  // Teste 4: Treino do dia reflete o cancelamento
  const descTreinoCancelado = obterTreinoDoDia(1, dataSegunda);
  assert(descTreinoCancelado.includes("cancelado"), "obterTreinoDoDia deve indicar que o treino foi cancelado");
  console.log("✓ Teste 4: obterTreinoDoDia reflete override diário");

  // Teste 5: Alteração de horário ("mudei o treino para as 19h")
  const resHoraTreino = RotinaService.aplicarInstrucao(dataSegunda, "mudei o treino para as 19h");
  assert(resHoraTreino.sucesso, "Alteração de horário deve ter sucesso");
  const bTreinoHora = resHoraTreino.blocos.find(b => b.id === 'treino');
  assert.equal(bTreinoHora.inicio, '19:00', "Horário de início deve ser 19:00");
  assert.equal(bTreinoHora.status, 'pendente', "Status do treino deve voltar a pendente");
  console.log("✓ Teste 5: Reprogramação de horário de treino validada");

  // Teste 6: Substituição de atividade ("troquei o treino por corrida de 40 min")
  const resTroca = RotinaService.aplicarInstrucao(dataSegunda, "troquei o treino por corrida de 40 min");
  assert(resTroca.sucesso, "Troca de atividade deve ter sucesso");
  const bTreinoTroca = resTroca.blocos.find(b => b.id === 'treino');
  assert(bTreinoTroca.titulo.includes("Corrida"), "Título deve ter sido alterado para Corrida");
  console.log("✓ Teste 6: Substituição de modalidade física validada");

  // Teste 7: Modo descanso total ("modo descanso hoje")
  const resDesc = RotinaService.aplicarInstrucao(dataSegunda, "modo descanso hoje");
  assert(resDesc.sucesso, "Modo descanso deve ter sucesso");
  const bTreinoDesc = resDesc.blocos.find(b => b.id === 'treino');
  assert.equal(bTreinoDesc.status, 'descanso', "Status do treino deve ser 'descanso'");
  console.log("✓ Teste 7: Modo descanso total ativado");

  // Teste 8: Reset para a grade padrão ("reset")
  const resReset = RotinaService.aplicarInstrucao(dataSegunda, "reset");
  assert(resReset.sucesso, "Reset deve ter sucesso");
  assert.equal(env.store['ROTINA_OVERRIDE_' + dataISO], null, "Override deve ser deletado ao resetar");
  const blocosAposReset = RotinaService.obterBlocosDoDia(dataSegunda);
  const bTreinoReset = blocosAposReset.find(b => b.id === 'treino');
  assert.equal(bTreinoReset.status, 'pendente', "Treino volta ao status pendente padrão");
  assert(bTreinoReset.titulo.includes('Superior A'), "Título original é restaurado");
  console.log("✓ Teste 8: Reset para grade base validado");

  // Teste 9: Marcar bloco como concluído
  const resConcluir = RotinaService.marcarStatusBloco(dataSegunda, 'treino', 'concluido', 'Feito com 100% de carga');
  assert(resConcluir.sucesso, "marcarStatusBloco deve ter sucesso");
  const bConcluido = resConcluir.blocos.find(b => b.id === 'treino');
  assert.equal(bConcluido.status, 'concluido', "Status deve ser concluído");
  assert.equal(bConcluido.nota, 'Feito com 100% de carga');
  console.log("✓ Teste 9: Marcação de status de bloco validada");

  // Teste 10: Formatação de Timeline em Markdown
  const md = RotinaService.formatarTimelineMarkdown(resConcluir.blocos, dataSegunda);
  assert(md.includes("TIMELINE DE HOJE"), "Deve conter cabeçalho da timeline");
  assert(md.includes("✅ `17:30 - 19:00`"), "Bloco concluído deve ter ícone ✅");
  assert(md.includes("Progresso do Dia:"), "Deve exibir barra de progresso");
  console.log("✓ Teste 10: Formatação em Markdown da timeline validada");

  // Teste 11: Teclado inline da timeline
  const teclado = RotinaService.construirTecladoTimeline(dataSegunda, resConcluir.blocos);
  assert(teclado.inline_keyboard.length >= 3, "Teclado deve ter no mínimo 3 linhas");
  const todosBotoes = teclado.inline_keyboard.flat();
  assert(todosBotoes.some(b => b.callback_data === 'rotina:ajustar'), "Deve ter botão de ajustar");
  assert(todosBotoes.some(b => b.callback_data === 'rotina:descanso'), "Deve ter botão de modo descanso");
  assert(todosBotoes.some(b => b.callback_data === 'rotina:reset'), "Deve ter botão de reset");
  console.log("✓ Teste 11: Teclado dinâmico da timeline validado");

  // Teste 12: Briefing Matinal adaptativo com blocos reais
  env.sent.length = 0;
  enviarBriefingMatinal('123456');
  assert(env.sent.length > 0, "Briefing deve enviar mensagem");
  const msgBriefing = env.sent[0];
  assert(msgBriefing.texto.includes("Raio-X & Rotina Adaptativa"), "Briefing deve ter título da rotina adaptativa");
  assert(msgBriefing.texto.includes("TIMELINE DE HOJE"), "Briefing deve conter timeline do dia");
  assert(msgBriefing.teclado, "Briefing deve anexar teclado inline de ações da rotina");
  console.log("✓ Teste 12: Briefing Matinal adaptativo validado");

  // Teste 13: Check-in Noturno inteligente
  env.sent.length = 0;
  enviarCheckinNoturno('123456');
  assert(env.sent.length > 0, "Check-in deve enviar mensagem");
  const msgCheckin = env.sent[0];
  assert(msgCheckin.texto.includes("Check-in da Noite Adaptativo"), "Check-in deve ter cabeçalho adaptativo");
  const btnsCheckin = msgCheckin.teclado.inline_keyboard.flat();
  assert(btnsCheckin.some(b => b.callback_data === 'habit_medquest'), "Deve conter habit_medquest");
  assert(btnsCheckin.some(b => b.callback_data === 'energy_5'), "Deve conter nota de energia");
  console.log("✓ Teste 13: Check-in Noturno inteligente validado");

  // Teste 14: Comando /rotina via processarMensagemTexto
  env.sent.length = 0;
  processarMensagemTexto({ chat: { id: '123456' }, text: '/rotina hoje' });
  assert(env.sent.length > 0, "Comando /rotina deve responder");
  console.log("SENT 0:", env.sent[0]);
assert(env.sent[0].texto.includes("TIME-BLOCKING ADAPTATIVO"), "Deve responder com painel adaptativo");
  console.log("✓ Teste 14: Comando /rotina validado");

  // Teste 15: Mensagem livre de alteração ("não vou treinar hoje") via texto
  env.sent.length = 0;
  processarMensagemTexto({ chat: { id: '123456' }, text: 'hoje não vou treinar' });
  assert(env.sent.length > 0, "Mensagem natural deve ser interceptada e respondida");
  assert(env.sent[0].texto.includes("cancelado"), "Deve confirmar cancelamento do treino");
  console.log("✓ Teste 15: Interceptação em linguagem natural de rotina validada");

  // Teste 16: Callback de rotina:check e rotina:reset
  env.sent.length = 0;
  processarCallbackBotao({
    id: 'cb-1',
    data: 'rotina:check:treino',
    from: { id: '123456' },
    message: { chat: { id: '123456' }, message_id: 99 }
  });
  assert(env.sent.some(s => s.alerta && s.alerta.includes("concluído")), "Callback rotina:check deve confirmar conclusão");
  console.log("✓ Teste 16: Callbacks inline de rotina validados");

  console.log("\n🎉 TODOS OS 16 TESTES DA ROTINA ADAPTATIVA FORAM APROVADOS COM SUCESSO!");
}

runTests();
