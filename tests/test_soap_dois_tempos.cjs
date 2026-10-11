/**
 * Testes Funcionais Completos do Fluxo SOAP em Dois Tempos:
 * 1. Anamnese organizada (sem transcrição literal)
 * 2. Exame Físico inteligente (sistemas normais padrão preenchidos + cobrança dirigida)
 * 3. Fase 1: Sem Avaliação e Plano prematuros + botões dedicados
 * 4. Fase 2: Fechamento sob demanda (comando ou callback) com A, P e pendências opcionais
 */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const source = require('./source_producao.cjs');

function env() {
  const props = { TELEGRAM_CHAT_ID: '123', TELEGRAM_BOT_TOKEN: 'fake', WEBHOOK_SECRET: 'secret', NOTION_TASKS_DB_ID: 'fake-db' }, cache = {}, sent = [];
  let now = 2000000000000, seq = 0, hook = null;
  class Clock extends Date { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } }
  const p = { getProperty: k => { if (hook) hook(k); return props[k] ?? null; }, setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: k => { delete props[k]; }, getProperties: () => ({ ...props }) };
  const c = {
    Buffer, Date: Clock, console: { log() {}, error() {} }, PropertiesService: { getScriptProperties: () => p },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] ?? null, put: (k, v) => { cache[k] = String(v); }, remove: k => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }), getUserLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    HtmlService: { createHtmlOutput: body => ({ body }) }, ContentService: { MimeType: { JSON: 'json' }, createTextOutput: body => ({ body, setMimeType() { return this; } }) },
    ScriptApp: { getProjectTriggers: () => [] },
    UrlFetchApp: { fetch: (url, opts) => { sent.push({ url, payload: JSON.parse((opts && opts.payload) || '{}') }); return { getResponseCode: () => 200, getContentText: () => ' {"ok":true}' }; } }
  };
  vm.createContext(c); vm.runInContext(source, c);
  c.Utilities.getUuid = () => String(++seq).padStart(32, '0'); c.Utilities.sleep = () => {};
  return { c, props, cache, sent, p, advance: n => now += n, setHook: h => hook = h };
}

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

// 1. Fase 1: Anamnese organizada e Exame Físico inteligente SEM Avaliação nem Plano
test('1. Fase 1 não gera Avaliação nem Plano prematuros e organiza anamnese', () => {
  const { c } = env();
  c.executarRaciocinioClinico = () => JSON.stringify({
    subjetivo: 'QP: Febre há 3 dias e dispneia aos esforços.\nHDA: Paciente iniciou quadro febril há 3 dias...',
    objetivo: 'Ectoscopia: BEG, LOTE, hidratado.\nACV: RCR 2T BNF sem sopros.\nAbdome: Plano, indolor, RHA+.',
    perguntas_anamnese: ['Há expectoração ou dor torácica?', 'Possui comorbidades prévias?'],
    exame_dirigido: ['Aferir SpO2, FR e ausculta pulmonar detalhada.']
  });

  const r = c.gerarSOAPComIA('Mulher com febre há 3 dias e falta de ar.');
  assert(r.includes('S - Subjetivo (Anamnese Estruturada)'));
  assert(r.includes('O - Objetivo (Exame Físico)'));
  assert(r.includes('Febre há 3 dias e dispneia aos esforços'));
  assert(r.includes('RCR 2T BNF sem sopros'));
  assert(r.includes('Perguntas para Completar a Anamnese'));
  assert(r.includes('Cobrança Ativa do Exame Físico Dirigido'));
  // REGRAS CRUCIAIS:
  assert(!r.includes('A - Avaliação'));
  assert(!r.includes('P - Plano'));
});

// 2. Teclado inline de Fase 1 embute botões de Gerar Avaliação & Plano e EF 100% Normal
test('2. Teclado de Fase 1 embute botões de Gerar Avaliação & Plano e EF 100% Normal', () => {
  const { c, sent } = env();
  c.executarRaciocinioClinico = () => JSON.stringify({
    subjetivo: 'QP: Tosse há 4 dias.',
    objetivo: 'BEG, ACV normal.',
    perguntas_anamnese: ['Alergia a medicações?'],
    exame_dirigido: ['Aferir SpO2.']
  });

  c.processarMensagemTexto({ chat: { id: 123 }, text: '/soap Homem 50a tosse' });
  assert(sent.length >= 1);
  const ultMsg = sent[sent.length - 1];
  const kbJson = JSON.stringify(ultMsg.payload.reply_markup);
  assert(kbJson.includes('ux:soap:plano'), 'Deve conter callback para gerar plano');
  assert(kbJson.includes('ux:soap:ef_normal'), 'Deve conter callback para marcar EF normal');
  assert(kbJson.includes('Fechar Plano') || kbJson.includes('Gerar Avaliação & Plano'));
});

// 3. Callback ux:soap:ef_normal atualiza caso com EF totalmente normal
test('3. EF normal exige confirmação antes de alterar o caso', () => {
  const { c, sent } = env();
  c.definirModoBot(123, 'soap', 'Mulher 30a com cefaleia pulsátil há 2h.');
  c.executarRaciocinioClinico = () => JSON.stringify({
    subjetivo: 'Cefaleia unilateral.',
    objetivo: 'Exame físico geral e segmentar completo sem alterações / totalmente normal.'
  });

  c.tratarCallbackUX({ id: 'cb1', data: 'ux:soap:ef_normal:' + c.modoBot(123).revision, message: { chat: { id: 123 }, message_id: 10 } });
  assert(!c.modoBot(123).data.includes('Bom estado geral'));
  const confirmar = sent[sent.length - 1].payload.reply_markup.inline_keyboard[0][0].callback_data;
  c.tratarCallbackUX({ id: 'cb2', data: confirmar, message: { chat: { id: 123 }, message_id: 11 } });
  const modo = c.modoBot(123);
  assert(modo.data.includes('Bom estado geral') && modo.data.includes('ACV:'));
  c.tratarCallbackUX({ id: 'cb3', data: confirmar, message: { chat: { id: 123 }, message_id: 11 } });
  assert.equal(c.modoBot(123).data, modo.data, 'Repetição não deve acrescentar dados');
});

// 4. Fechamento explícito por texto gera Fase 2 com A, P e pendências opcionais
test('4. Solicitação explícita por texto gera Fase 2 completa com A, P e pendências', () => {
  const { c } = env();
  c.executarRaciocinioClinico = () => JSON.stringify({
    subjetivo: 'Anamnese completa.',
    objetivo: 'EF completo.',
    avaliacao: ['Enxaqueca sem aura (CID-10: G43.0)'],
    plano: ['Dipirona 1g VO + Metoclopramida 10mg VO'],
    pendencias_opcionais: ['Aferir PA em repouso']
  });

  const r = c.gerarSOAPComIA('Mulher 30a dor de cabeça. Faça a avaliação e o plano.');
  assert(r.includes('A - Avaliação'));
  assert(r.includes('P - Plano'));
  assert(r.includes('Enxaqueca sem aura'));
  assert(r.includes('Dipirona 1g'));
  assert(r.includes('Dados pendentes — conferir antes de concluir'));
});

// 5. Botões inline de Fase 2 consolidada
test('5. Mensagem consolidada de Fase 2 embute botões de prontuário, REMUME e Notion', () => {
  const { c, sent } = env();
  // Este cenário cobre revisão concluída; a indisponibilidade tem regressão própria.
  c._iaExecutar = () => 'SEM ALERTAS';
  c.executarRaciocinioClinico = () => JSON.stringify({
    subjetivo: 'Dor de cabeça.',
    objetivo: 'EF normal.',
    avaliacao: ['Enxaqueca'],
    plano: ['Dipirona']
  });

  c.processarMensagemTexto({ chat: { id: 123 }, text: '/soap Paciente com enxaqueca. Gerar avaliação e plano.' });
  assert(sent.length >= 1);
  const ultMsg = sent[sent.length - 1];
  const kbJson = JSON.stringify(ultMsg.payload.reply_markup);
  assert(kbJson.includes('ux:hub:rx'), 'Deve conter atalho para prescrever');
  assert(kbJson.includes('ux:soap:atualizar'), 'Deve conter atalho para atualizar');
  assert(!kbJson.includes('ux:soap:plano'), 'Não deve repetir o botão de gerar plano se já está gerado');
});



for (const acao of ['troca', 'expiracao', 'cancelamento']) test('Confirmação EF protege contra ' + acao, () => {
  const { c, sent, advance } = env();
  c.definirModoBot(123, 'soap', 'Caso inicial com cefaleia');
  const cb = data => ({id:'cb', data, message:{chat:{id:123}, message_id:10}});
  c.tratarCallbackUX(cb('ux:soap:ef_normal:' + c.modoBot(123).revision));
  const linhas = sent[sent.length - 1].payload.reply_markup.inline_keyboard;
  if (acao === 'troca') c.definirModoBot(123, 'soap', 'Outro caso com dispneia');
  if (acao === 'expiracao') advance(301000);
  if (acao === 'cancelamento') c.tratarCallbackUX(cb(linhas[1][0].callback_data));
  c.tratarCallbackUX(cb(linhas[0][0].callback_data));
  assert(!c.modoBot(123).data.includes('Bom estado geral'));
});

console.log(`${aprovados}/8 cenários SOAP aprovados`);
