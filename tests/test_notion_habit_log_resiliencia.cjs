/**
 * Testes unitários para resiliência da integração Notion Habit Log e Tasks DB.
 */
const assert = require('assert');
const path = require('path');

const { ctx } = require(path.join(__dirname, '..', 'server', 'runtime.js'));

console.log('🧪 Iniciando testes de resiliência do Notion Habit Log...');

// Teste 1: normalizarNotionId
assert.strictEqual(typeof ctx.normalizarNotionId, 'function', 'normalizarNotionId deve ser uma função');
assert.strictEqual(ctx.normalizarNotionId(''), '', 'string vazia retorna vazio');
assert.strictEqual(ctx.normalizarNotionId(null), '', 'null retorna vazio');
assert.strictEqual(ctx.normalizarNotionId('f1b41e4b-2d61-43aa-aa6a-81de8d073386'), 'f1b41e4b-2d61-43aa-aa6a-81de8d073386', 'uuid com hífen preservado');
assert.strictEqual(ctx.normalizarNotionId('f1b41e4b2d6143aaaa6a81de8d073386'), 'f1b41e4b2d6143aaaa6a81de8d073386', 'uuid sem hífen preservado');
assert.strictEqual(ctx.normalizarNotionId('https://www.notion.so/workspace/f1b41e4b2d6143aaaa6a81de8d073386?v=123'), 'f1b41e4b2d6143aaaa6a81de8d073386', 'extrai uuid de url com query');
assert.strictEqual(ctx.normalizarNotionId('https://notion.so/f1b41e4b-2d61-43aa-aa6a-81de8d073386'), 'f1b41e4b-2d61-43aa-aa6a-81de8d073386', 'extrai uuid com hifen de url');

// Teste 2: obterOuCriarPaginaHabitLog defensivo quando dbId ausente
const origGet = ctx.ConfigService.get;
ctx.ConfigService.get = function(k, def) {
  if (k === 'NOTION_HABIT_LOG_DB_ID') return '';
  return origGet.call(ctx.ConfigService, k, def);
};

const resSemDb = ctx.obterOuCriarPaginaHabitLog('2026-10-12');
assert.strictEqual(resSemDb, null, 'Sem dbId deve retornar null sem crash');

// Teste 3: enviarRelatorioSemanalHabitos defensivo quando token ausente
let msgEnviada = '';
ctx.enviarMensagemParaChat = function(dest, msg) {
  msgEnviada = msg;
  return true;
};
ctx.ehUsuarioTitular = function() { return true; };

ctx.ConfigService.get = function(k, def) {
  if (k === 'NOTION_TOKEN') return '';
  if (k === 'NOTION_HABIT_LOG_DB_ID') return 'f1b41e4b-2d61-43aa-aa6a-81de8d073386';
  return origGet.call(ctx.ConfigService, k, def);
};

ctx.enviarRelatorioSemanalHabitos(123456);
assert.ok(msgEnviada.includes('NOTION_TOKEN'), 'Mensagem deve alertar sobre NOTION_TOKEN ausente');

// Restaura ConfigService
ctx.ConfigService.get = origGet;

console.log('✅ Todos os testes de resiliência do Notion passaram com sucesso!');
