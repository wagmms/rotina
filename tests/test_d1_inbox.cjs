const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createD1Inbox } = require('../server/d1-inbox');

const rows = new Map();
const env = {
  CF_D1_ACCOUNT_ID: 'a'.repeat(32),
  CF_D1_DATABASE_ID: '11111111-2222-3333-4444-555555555555',
  CF_D1_API_TOKEN: 'token-ficticio',
  BOT_INBOX_KEY: crypto.randomBytes(32).toString('base64')
};

async function fakeFetch(url, options) {
  assert(url.includes('/d1/database/'));
  assert.equal(options.headers.Authorization, 'Bearer token-ficticio');
  const body = JSON.parse(options.body);
  const execute = ({ sql, params = [] }) => {
    if (sql.startsWith('CREATE TABLE')) return { success: true, results: [] };
    if (sql.startsWith('INSERT OR IGNORE')) {
      if (!rows.has(params[0])) rows.set(params[0], { state: params[1], payload: params[2] });
      return { success: true, results: [], meta: { changes: 1 } };
    }
    if (sql.startsWith('SELECT state')) return { success: true, results: rows.has(params[0]) ? [{ state: rows.get(params[0]).state }] : [] };
    if (sql.startsWith('SELECT id, payload')) {
      return { success: true, results: [...rows].filter(([id, row]) => row.state === 'pending' && Number(id) > Number(params[0])).sort((a, b) => Number(a[0]) - Number(b[0])).slice(0, Number(params[1])).map(([id, row]) => ({ id, payload: row.payload })) };
    }
    if (sql.startsWith('UPDATE bot_inbox')) {
      let changes = 0;
      if (sql.includes("SET state = 'uncertain'")) {
        for (const row of rows.values()) if (row.state === 'running') { row.state = 'uncertain'; changes++; }
      } else if (sql.includes("SET state = 'running'")) {
        const row = rows.get(params[1]);
        if (row && row.state === 'pending') { row.state = 'running'; changes++; }
      } else {
        const row = rows.get(params[2]);
        if (row && row.state === params[3]) { row.state = params[0]; changes++; }
      }
      return { success: true, results: [], meta: { changes } };
    }
    throw new Error('SQL inesperado no teste: ' + sql);
  };
  return { ok: true, json: async () => ({ success: true, result: body.batch ? body.batch.map(execute) : [execute(body)] }) };
}

async function main() {
  const inbox = createD1Inbox(env, fakeFetch);
  await inbox.init();
  const primeiro = { update_id: 0, message: { chat: { id: 123 }, text: 'primeiro' } };
  assert.equal(await inbox.accept(primeiro), true);
  assert.deepEqual((await inbox.recoverPending(1)).map(update => update.update_id), [0]);
  assert.equal(await inbox.markRunning(0), true);
  await inbox.markState(0, 'done');
  const pedido = { update_id: 7, message: { chat: { id: 123 }, text: 'SEGREDO_CLINICO' } };
  assert.equal(await inbox.accept(pedido), true);
  assert(!rows.get('7').payload.includes('SEGREDO_CLINICO'));
  assert.deepEqual(await inbox.recoverPending(), [pedido]);
  assert.equal(await inbox.markRunning(7), true);
  assert.equal(await inbox.markRunning(7), false);
  await inbox.markState(7, 'done');
  assert.equal(await inbox.accept(pedido), false);
  assert.deepEqual(await inbox.recoverPending(), []);

  await inbox.accept({ update_id: 8, message: { chat: { id: 123 }, text: 'outro' } });
  await inbox.accept({ update_id: 9, message: { chat: { id: 123 }, text: 'mais um' } });
  assert.deepEqual((await inbox.recoverPending(1, 8)).map(update => update.update_id), [9]);
  assert.equal(await inbox.markRunning(8), true);
  assert.equal(await inbox.markInterrupted(), 1);
  assert.equal(rows.get('8').state, 'uncertain');
  assert.throws(() => createD1Inbox({ ...env, BOT_INBOX_KEY: 'curta' }), /32 bytes/);
  console.log('OK: D1 cifra o pedido, deduplica e preserva estados de recuperação');
}

main().catch(err => { console.error(err); process.exitCode = 1; });
