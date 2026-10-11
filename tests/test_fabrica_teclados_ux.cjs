const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const source = require('./source_producao.cjs');

function criarAmbienteTeste() {
  const props = {
    TELEGRAM_CHAT_ID: '123456',
    TELEGRAM_BOT_TOKEN: 'fake-token-test',
    WEBHOOK_SECRET: 'secret-test'
  };
  const cache = {}, sent = [];
  let now = 2000000000000, seq = 0;
  class Clock extends Date { constructor(...a){super(...(a.length?a:[now]));} static now(){return now;} }
  const p = {
    getProperty: k => props[k] ?? null,
    setProperty: (k, v) => { props[k] = String(v); },
    deleteProperty: k => { delete props[k]; },
    getProperties: () => ({ ...props })
  };
  const c = {
    Buffer,
    Date: Clock,
    console: { log() {}, error() {}, warn() {} },
    PropertiesService: { getScriptProperties: () => p },
    CacheService: {
      getScriptCache: () => ({
        get: k => cache[k] ?? null,
        put: (k, v) => { cache[k] = String(v); },
        remove: k => { delete cache[k]; }
      })
    },
    LockService: {
      getScriptLock: () => ({ waitLock() {}, releaseLock() {} }),
      getUserLock: () => ({ tryLock: () => true, releaseLock() {} })
    },
    HtmlService: { createHtmlOutput: body => ({ body }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: body => ({ body, setMimeType() { return this; } }) },
    ScriptApp: { getProjectTriggers: () => [] },
    UrlFetchApp: {
      fetch: (url, opts) => {
        sent.push({ url, payload: JSON.parse((opts && opts.payload) || '{}') });
        return { getResponseCode: () => 200, getContentText: () => '{"ok":true}' };
      }
    }
  };
  vm.createContext(c);
  vm.runInContext(source, c);
  c.Utilities.getUuid = () => String(++seq).padStart(32, '0');
  c.Utilities.sleep = () => {};
  return { c, props, cache, sent };
}

test('Fábrica Modular de Teclados do Bot (UX Keyboard Builder)', async (t) => {
  const { c } = criarAmbienteTeste();

  await t.test('Deve expor as funções e constantes canônicas da fábrica', () => {
    assert.equal(typeof c.uxLinhaNavegacao, 'function');
    assert.equal(typeof c.uxCriarTeclado, 'function');
    assert.equal(typeof c.uxCriarTecladoGrade, 'function');
    assert.equal(typeof c.enviarTelaBotComNavegacao, 'function');
    assert.equal(c.UX_BOTAO_INICIO[0], '🏠 Início');
    assert.equal(c.UX_BOTAO_INICIO[1], 'ux:hub:inicio');
  });

  await t.test('uxLinhaNavegacao deve resolver corretamente destinos canônicos', () => {
    const navMenu = c.uxLinhaNavegacao('menu');
    assert.equal(JSON.stringify(navMenu), JSON.stringify([['🔙 Voltar ao Menu', 'ux:menu'], ['🏠 Início', 'ux:hub:inicio']]));

    const navSala = c.uxLinhaNavegacao('sala');
    assert.equal(JSON.stringify(navSala), JSON.stringify([['🔙 Sala Vermelha', 'ux:hub:sala'], ['🏠 Início', 'ux:hub:inicio']]));

    const navEnf = c.uxLinhaNavegacao('enf');
    assert.equal(JSON.stringify(navEnf), JSON.stringify([['🔙 Enfermaria', 'ux:hub:enf'], ['🏠 Início', 'ux:hub:inicio']]));

    const navCalc = c.uxLinhaNavegacao('calc');
    assert.equal(JSON.stringify(navCalc), JSON.stringify([['🔙 Calculadoras', 'ux:hub:calc'], ['🏠 Início', 'ux:hub:inicio']]));

    const navCustom = c.uxLinhaNavegacao(['Voltar Custom', 'ux:custom']);
    assert.equal(JSON.stringify(navCustom), JSON.stringify([['Voltar Custom', 'ux:custom'], ['🏠 Início', 'ux:hub:inicio']]));

    assert.equal(c.uxLinhaNavegacao(null), null);
    assert.equal(c.uxLinhaNavegacao('inexistente'), null);
  });

  await t.test('uxCriarTeclado deve montar matriz com botões de navegação no rodapé', () => {
    const linhas = [
      [['Opção 1', 'ux:op1'], ['Opção 2', 'ux:op2']]
    ];
    const kb = c.uxCriarTeclado(linhas, 'sala');
    assert.ok(kb && kb.inline_keyboard);
    assert.equal(kb.inline_keyboard.length, 2);
    assert.equal(JSON.stringify(kb.inline_keyboard[0]), JSON.stringify([
      { text: 'Opção 1', callback_data: 'ux:op1' },
      { text: 'Opção 2', callback_data: 'ux:op2' }
    ]));
    assert.equal(JSON.stringify(kb.inline_keyboard[1]), JSON.stringify([
      { text: '🔙 Sala Vermelha', callback_data: 'ux:hub:sala' },
      { text: '🏠 Início', callback_data: 'ux:hub:inicio' }
    ]));
  });

  await t.test('uxCriarTecladoGrade deve particionar lista em colunas automáticas com rodapé', () => {
    const itens = [
      ['50 kg', 'ux:peso:50'],
      ['60 kg', 'ux:peso:60'],
      ['70 kg', 'ux:peso:70'],
      ['80 kg', 'ux:peso:80'],
      ['90 kg', 'ux:peso:90']
    ];
    const kb = c.uxCriarTecladoGrade(itens, 2, 'dva');
    assert.ok(kb && kb.inline_keyboard);
    // 5 itens em 2 colunas = 3 linhas de botões + 1 linha de rodapé = 4 linhas
    assert.equal(kb.inline_keyboard.length, 4);
    assert.equal(kb.inline_keyboard[0].length, 2);
    assert.equal(kb.inline_keyboard[1].length, 2);
    assert.equal(kb.inline_keyboard[2].length, 1);
    assert.equal(kb.inline_keyboard[3].length, 2);
    assert.equal(kb.inline_keyboard[3][0].text, '← Trocar medicamento');
    assert.equal(kb.inline_keyboard[3][1].text, '🔙 Sala Vermelha');
  });

  await t.test('enviarTelaBotComNavegacao deve despachar tela e teclado integrados', () => {
    let chamadaEnvio = null;
    c.executarPostTelegram = (url, payload) => {
      chamadaEnvio = { url, payload };
      return true;
    };

    const res = c.enviarTelaBotComNavegacao(123456, 'Texto de teste', [[['Ação', 'ux:acao']]], 'menu', 9999);
    assert.ok(res);
    assert.ok(chamadaEnvio);
    assert.equal(chamadaEnvio.payload.chat_id, 123456);
    assert.equal(chamadaEnvio.payload.message_id, 9999);
    assert.ok(chamadaEnvio.payload.reply_markup);
    assert.equal(chamadaEnvio.payload.reply_markup.inline_keyboard.length, 2);
  });
});
