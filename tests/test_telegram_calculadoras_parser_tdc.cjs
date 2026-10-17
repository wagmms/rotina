'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Carrega o ambiente do Telegram bot em VM
const context = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Math: Math,
  Date: Date,
  Number: Number,
  String: String,
  parseFloat: parseFloat,
  parseInt: parseInt,
  isNaN: isNaN,
  Array: Array,
  Object: Object,
  RegExp: RegExp
};

// 1. Carrega CalculadorasClinicas
const codeCalc = fs.readFileSync(path.join(__dirname, '../src/02_calculadoras_puras.js'), 'utf8');
vm.runInNewContext(codeCalc, context);

// 2. Carrega 07f_telegram_calculadoras_parser.js
const codeParser = fs.readFileSync(path.join(__dirname, '../src/07f_telegram_calculadoras_parser.js'), 'utf8');
vm.runInNewContext(codeParser, context);

test('Parser Telegram: Reconhece alias e comandos de trombólise', () => {
  assert.equal(typeof context.identificarCalculadora, 'function');
  assert.equal(context.identificarCalculadora('/calc trombolise'), 'trombolise_avc');
  assert.equal(context.identificarCalculadora('/calc alteplase'), 'trombolise_avc');
  assert.equal(context.identificarCalculadora('/calc tenecteplase'), 'trombolise_avc');
  assert.equal(context.identificarCalculadora('/calc tnk'), 'trombolise_avc');
});

test('Parser Telegram: Calcula determinísticamente trombólise com peso', () => {
  const res = context.tentarCalcularDeterministico('/calc trombolise 80kg');
  assert.ok(res, 'Deve retornar resultado determinístico');
  assert.match(res, /TENECTEPLASE/i);
  assert.match(res, /ALTEPLASE/i);
  assert.match(res, /rt-PA 72,0 mg OU TNK 20,0 mg/i);
});

test('Parser Telegram: Detecta bloqueio de PA na trombólise', () => {
  const resPa = context.tentarCalcularDeterministico('/calc alteplase 70kg PA 190x110');
  assert.ok(resPa);
  assert.match(resPa, /BLOQUEIO TEMPORÁRIO|REDUZIR PA/i);
});

test('Parser Telegram: Template de instrução quando enviado sem parâmetros', () => {
  const instrucoes = context.obterInstrucoesCalculadora('trombolise_avc');
  assert.ok(instrucoes);
  assert.match(instrucoes, /CALCULADORA: TROMBÓLISE IV NO AVC ISQUÊMICO/i);
  assert.match(instrucoes, /\/calc trombolise/i);
});
