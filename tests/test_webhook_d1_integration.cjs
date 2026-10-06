process.env.NODE_ENV = 'test';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-d1-test-'));
process.env.BOT_DATA_DIR = dataDir;
process.env.CF_D1_ACCOUNT_ID = 'a'.repeat(32);
process.env.CF_D1_DATABASE_ID = '11111111-2222-3333-4444-555555555555';
process.env.CF_D1_API_TOKEN = 'token-ficticio';
process.env.BOT_INBOX_KEY = crypto.randomBytes(32).toString('base64');

const rows = new Map();
global.fetch = async (_url, opts) => {
  const body = JSON.parse(opts.body);
  const run = ({ sql, params = [] }) => {
    if (sql.startsWith('CREATE TABLE')) return { success: true, results: [] };
    if (sql.startsWith('INSERT OR IGNORE')) {
      if (!rows.has(params[0])) rows.set(params[0], { state: 'pending', payload: params[2] });
      return { success: true, results: [] };
    }
    if (sql.startsWith('SELECT state')) return { success: true, results: [{ state: rows.get(params[0]).state }] };
    if (sql.startsWith('SELECT id, payload')) return { success: true, results: [...rows].filter(([id, row]) => row.state === 'pending' && Number(id) > Number(params[0])).slice(0, Number(params[1])).map(([id, row]) => ({ id, payload: row.payload })) };
    if (sql.startsWith('UPDATE bot_inbox')) {
      if (sql.includes("SET state = 'running'")) {
        const row = rows.get(params[1]);
        if (row && row.state === 'pending') { row.state = 'running'; return { success: true, results: [], meta: { changes: 1 } }; }
      } else if (sql.includes("SET state = 'uncertain'")) {
        return { success: true, results: [], meta: { changes: 0 } };
      } else {
        const row = rows.get(params[2]);
        if (row && row.state === 'running') { row.state = params[0]; return { success: true, results: [], meta: { changes: 1 } }; }
      }
      return { success: true, results: [], meta: { changes: 0 } };
    }
    throw new Error('SQL inesperado: ' + sql);
  };
  return { ok: true, json: async () => ({ success: true, result: body.batch ? body.batch.map(run) : [run(body)] }) };
};

const runtime = require('../server/runtime.js');
const { buildServer } = require('../server/index.js');

async function main() {
  const app = await buildServer();
  const events = [];
  runtime.ctx.ConfigService.get = key => key === 'WEBHOOK_SECRET' ? 'secret' : key === 'TELEGRAM_CHAT_ID' ? '123' : '';
  runtime.ctx.enfileirarUpdate = () => { throw new Error('checkpoint local indisponível'); };
  runtime.persistirPropriedades = () => { throw new Error('checkpoint local indisponível'); };
  runtime.doPost = () => events.push('processado');
  runtime.ctx.PersistenciaBot.ler = () => ({ status: 'done' });
  await app.recoverD1Inbox();

  const update = { update_id: 10, message: { chat: { id: 123 }, text: 'TEXTO_CLINICO_FICTICIO' } };
  const req = () => app.inject({ method: 'POST', url: '/webhook', headers: { 'x-telegram-bot-api-secret-token': 'secret' }, payload: update });
  assert.equal((await req()).statusCode, 200);
  for (let i = 0; i < 10 && rows.get('10').state !== 'done'; i++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(rows.get('10').state, 'done');
  assert(!rows.get('10').payload.includes('TEXTO_CLINICO_FICTICIO'));
  assert.deepEqual(events, ['processado']);
  assert.equal((await req()).json().duplicate, true);
  assert.equal(events.filter(item => item === 'processado').length, 1);
  await app.close();
  console.log('OK: webhook usa D1 cifrado antes do ACK e deduplica após conclusão');
}

main().then(() => { fs.rmSync(dataDir, { recursive: true, force: true }); process.exit(0); })
  .catch(err => { fs.rmSync(dataDir, { recursive: true, force: true }); console.error(err); process.exit(1); });
