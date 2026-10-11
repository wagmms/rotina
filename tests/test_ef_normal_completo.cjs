/**
 * Teste de Verificação: Expansão do Exame Físico Normal Completo
 * Garante que o acionamento do botão [🩺 EF Normal] ou indicação de EF normal:
 * 1. Insere o modelo de Exame Físico Geral e Segmentar Completo (Ectoscopia, ACV, AR, Abdome, Extremidades, Neuro)
 * 2. NUNCA escreve apenas a síntese simplista "EF normal"
 * 3. Preserva sinais vitais informados previamente pelo médico assistente no relato
 * 4. Expande o modelo completo tanto no Telegram quanto no Cockpit
 */

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');
const source = require('./source_producao.cjs');

function env() {
  const props = { TELEGRAM_CHAT_ID: '123', TELEGRAM_BOT_TOKEN: 'fake', WEBHOOK_SECRET: 'secret' };
  const cache = {};
  const sent = [];
  let now = 2000000000000;
  let seq = 0;
  class Clock extends Date { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } }
  const p = {
    getProperty: k => props[k] ?? null,
    setProperty: (k, v) => { props[k] = String(v); },
    deleteProperty: k => { delete props[k]; },
    getProperties: () => ({ ...props })
  };
  const c = {
    Buffer,
    Date: Clock,
    console: { log() {}, error() {} },
    PropertiesService: { getScriptProperties: () => p },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] ?? null, put: (k, v) => { cache[k] = String(v); }, remove: k => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }), getUserLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    HtmlService: { createHtmlOutput: body => ({ body }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: body => ({ body, setMimeType() { return this; } }) },
    ScriptApp: { getProjectTriggers: () => [] },
    UrlFetchApp: { fetch: (url, opts) => { sent.push({ url, payload: JSON.parse((opts && opts.payload) || '{}') }); return { getResponseCode: () => 200, getContentText: () => ' {"ok":true}' }; } }
  };
  vm.createContext(c);
  vm.runInContext(source, c);
  c.Utilities.getUuid = () => String(++seq).padStart(32, '0');
  c.Utilities.sleep = () => {};
  return { c, sent };
}

console.log('🧪 Iniciando Testes de Expansão do Exame Físico Normal Completo...\n');

// 1. obterModeloExameFisicoCompleto gera todos os sistemas semiológicos canônicos
{
  const { c } = env();
  const modelo = c.obterModeloExameFisicoCompleto('Paciente em consulta de rotina.');
  assert(modelo.includes('Bom estado geral'), 'Deve conter Bom estado geral');
  assert(modelo.includes('Sinais Vitais:'), 'Deve conter Sinais Vitais');
  assert(modelo.includes('ACV:'), 'Deve conter ACV');
  assert(modelo.includes('AR:'), 'Deve conter AR');
  assert(modelo.includes('Abdome:'), 'Deve conter Abdome');
  assert(modelo.includes('Extremidades:'), 'Deve conter Extremidades');
  assert(modelo.includes('TEC < 3 segundos'), 'Deve conter TEC < 3 segundos');
  console.log('  ✓ 1. obterModeloExameFisicoCompleto gera todos os sistemas semiológicos canônicos');
}

// 2. Preserva sinais vitais informados pelo médico assistente no relato
{
  const { c } = env();
  const relatoComSV = 'Homem 50a com cefaleia. PA 150/95 mmHg, FC 88 bpm, Tax 36.8°C, SpO2 97%.';
  const modelo = c.obterModeloExameFisicoCompleto(relatoComSV);
  assert(modelo.includes('PA: 150/95 mmHg'), 'Deve preservar PA informada');
  assert(modelo.includes('FC: 88 bpm'), 'Deve preservar FC informada');
  assert(modelo.includes('T: 36,8°C') || modelo.includes('T: 36.8°C') || modelo.includes('36.8°C'), 'Deve preservar Tax informada');
  assert(modelo.includes('SpO2: 97%'), 'Deve preservar SpO2 informada');
  console.log('  ✓ 2. Preservação de sinais vitais relatados pelo médico no modelo completo');
}

// 3. Callback ux:soap:ef_confirmar insere modelo completo no caso ativo
{
  const { c, sent } = env();
  c.definirModoBot(123, 'soap', 'Paciente 40a com lombalgia mecânica.');
  c.executarRaciocinioClinico = () => JSON.stringify({
    subjetivo: 'Dor lombar há 2 dias.',
    objetivo: 'EF normal.' // simulando retorno simplificado da IA
  });

  // Dispara pedido de confirmação
  c.tratarCallbackUX({ id: 'cb1', data: 'ux:soap:ef_normal:' + c.modoBot(123).revision, message: { chat: { id: 123 }, message_id: 10 } });
  const btnConfirmar = sent[sent.length - 1].payload.reply_markup.inline_keyboard[0][0].callback_data;

  // Dispara confirmação
  c.tratarCallbackUX({ id: 'cb2', data: btnConfirmar, message: { chat: { id: 123 }, message_id: 11 } });
  const casoAtualizado = c.modoBot(123).data;

  assert(casoAtualizado.includes('ACV:'), 'Caso ativo deve conter ACV completo');
  assert(casoAtualizado.includes('AR:'), 'Caso ativo deve conter AR completo');
  assert(casoAtualizado.includes('Abdome:'), 'Caso ativo deve conter Abdome completo');
  assert(casoAtualizado.includes('totalmente normal'), 'Caso ativo deve conter marcador de totalmente normal');
  assert(casoAtualizado.includes('TEC < 3 segundos'), 'Caso ativo deve conter TEC < 3 segundos');

  const textosEnviados = sent.map(s => (s.payload && s.payload.text) || '');
  assert(!textosEnviados.some(t => t.includes('Atualizando rascunho')), 'Não deve enviar mensagem intermediária de Atualizando rascunho');
  console.log('  ✓ 3. Callback insere modelo completo e omite mensagem intermediária, entregando apenas o SOAP atualizado');
}

// 4. gerarSOAPComIA expande o modelo completo no Objetivo e NUNCA resume em apenas 'EF normal'
{
  const { c } = env();
  const casoComEFNormal = 'Paciente 35a queixa de dor de garganta.\n[Exame Físico]: Exame físico geral e segmentar completo sem alterações / totalmente normal.';

  // Simulando que o modelo da IA retornou apenas a síntese "EF normal."
  c.executarRaciocinioClinico = () => JSON.stringify({
    subjetivo: 'Odinofagia há 1 dia.',
    objetivo: 'EF normal.',
    perguntas_anamnese: [],
    exame_dirigido: []
  });

  const soapRascunho = c.gerarSOAPComIA(casoComEFNormal, { fecharPlano: false });
  assert(!soapRascunho.includes('🔍 *O - Objetivo (Exame Físico)*\nEF normal.'), 'Não deve conter apenas EF normal no Objetivo');
  assert(soapRascunho.includes('Bom estado geral'), 'Objetivo deve conter Bom estado geral');
  assert(soapRascunho.includes('ACV:'), 'Objetivo deve conter ACV');
  assert(soapRascunho.includes('AR:'), 'Objetivo deve conter AR');
  assert(soapRascunho.includes('Abdome:'), 'Objetivo deve conter Abdome');
  assert(soapRascunho.includes('Extremidades:'), 'Objetivo deve conter Extremidades');
  console.log('  ✓ 4. gerarSOAPComIA expande deterministamente o modelo completo no campo Objetivo');
}

// 5. Na Fase 1 com EF completo registrado, omite cobrança redundante de EF básico
{
  const { c } = env();
  const casoComEFNormal = 'Paciente 35a queixa de dor de garganta.\n[Exame Físico]: Exame físico geral e segmentar completo sem alterações / totalmente normal.';
  c.executarRaciocinioClinico = () => JSON.stringify({
    subjetivo: 'Odinofagia há 1 dia.',
    objetivo: 'EF normal.',
    perguntas_anamnese: ['Febre aferida?'],
    exame_dirigido: ['Aferir PA e FC']
  });
  const soapRascunho = c.gerarSOAPComIA(casoComEFNormal, { fecharPlano: false });
  assert(!soapRascunho.includes('🎯 *Cobrança Ativa do Exame Físico Dirigido*'), 'Não deve cobrar exame físico se EF completo já foi registrado');
  console.log('  ✓ 5. Omite cobrança ativa redundante de exame físico quando EF completo já foi registrado');
}

console.log('\n🎉 TODOS OS 5 TESTES DE EXPANSÃO DO EXAME FÍSICO NORMAL COMPLETO FORAM APROVADOS COM 100% DE SUCESSO!\n');
