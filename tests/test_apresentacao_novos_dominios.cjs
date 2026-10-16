'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const runtime = require('../server/runtime.js');

const ctx = runtime.ctx;
const chamadasEnvio = [];

ctx.enviarMensagemParaChat = (chat, txt) => {
  chamadasEnvio.push({ tipo: 'msg', chat, txt });
  return true;
};
ctx.enviarMensagemComTecladoParaChat = (chat, txt, kb) => {
  chamadasEnvio.push({ tipo: 'teclado', chat, txt, kb });
  return true;
};
ctx.executarPostTelegram = (url, payload) => {
  chamadasEnvio.push({ tipo: 'post', url, payload });
  return true;
};
ctx.responderCallbackTelegram = (id, txt) => true;

test('Apresentação UX: Callbacks de Diluição e Compatibilidade em Y', () => {
  chamadasEnvio.length = 0;
  const resMenu = ctx.tratarCallbackUX({
    id: 'cb1',
    message: { chat: { id: 1001 }, message_id: 2001 },
    data: 'ux:dil:menu'
  });
  assert.equal(resMenu, true);
  assert.ok(chamadasEnvio.length > 0);

  chamadasEnvio.length = 0;
  const resFarmaco = ctx.tratarCallbackUX({
    id: 'cb2',
    message: { chat: { id: 1001 }, message_id: 2001 },
    data: 'ux:dil:f:noradrenalina'
  });
  assert.equal(resFarmaco, true);
  assert.ok(chamadasEnvio.length > 0);

  chamadasEnvio.length = 0;
  const resY = ctx.tratarCallbackUX({
    id: 'cb3',
    message: { chat: { id: 1001 }, message_id: 2001 },
    data: 'ux:dil:y:noradrenalina:amiodarona'
  });
  assert.equal(resY, true);
  assert.ok(chamadasEnvio.length > 0);
});

test('Apresentação UX: Callbacks de Pacotes Sindrômicos de Emergência', () => {
  chamadasEnvio.length = 0;
  const resMenu = ctx.tratarCallbackUX({
    id: 'cb4',
    message: { chat: { id: 1001 }, message_id: 2001 },
    data: 'ux:kit:menu'
  });
  assert.equal(resMenu, true);
  assert.ok(chamadasEnvio.length > 0);

  chamadasEnvio.length = 0;
  const resKit = ctx.tratarCallbackUX({
    id: 'cb5',
    message: { chat: { id: 1001 }, message_id: 2001 },
    data: 'ux:kit:ver:colica_nefretica'
  });
  assert.equal(resKit, true);
  assert.ok(chamadasEnvio.length > 0);
});

test('Apresentação UX: Callbacks de Checklist Clínico com Bitmask', () => {
  chamadasEnvio.length = 0;
  const resMenu = ctx.tratarCallbackUX({
    id: 'cb6',
    message: { chat: { id: 1001 }, message_id: 2001 },
    data: 'ux:chk:menu'
  });
  assert.equal(resMenu, true);
  assert.ok(chamadasEnvio.length > 0);

  chamadasEnvio.length = 0;
  const resToggle = ctx.tratarCallbackUX({
    id: 'cb7',
    message: { chat: { id: 1001 }, message_id: 2001 },
    data: 'ux:chk:fast_hug_sb:3:2'
  });
  assert.equal(resToggle, true);
  assert.ok(chamadasEnvio.length > 0);
});

test('Apresentação UX: Callbacks de Time-Blocking Cockpit', () => {
  chamadasEnvio.length = 0;
  const resMenu = ctx.tratarCallbackUX({
    id: 'cb8',
    message: { chat: { id: 1001 }, message_id: 2001 },
    data: 'ux:tb:menu'
  });
  assert.equal(resMenu, true);
  assert.ok(chamadasEnvio.length > 0);

  chamadasEnvio.length = 0;
  const resAtraso = ctx.tratarCallbackUX({
    id: 'cb9',
    message: { chat: { id: 1001 }, message_id: 2001 },
    data: 'ux:tb:atraso:30'
  });
  assert.equal(resAtraso, true);
  assert.ok(chamadasEnvio.length > 0);
});
