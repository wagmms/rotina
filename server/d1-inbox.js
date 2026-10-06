/** Caixa de entrada remota para updates do Telegram. O D1 recebe apenas JSON cifrado. */
const crypto = require('node:crypto');

function createD1Inbox(env = process.env, fetchImpl = fetch) {
  const accountId = env.CF_D1_ACCOUNT_ID || '';
  const databaseId = env.CF_D1_DATABASE_ID || '';
  const apiToken = env.CF_D1_API_TOKEN || '';
  const keyBase64 = env.BOT_INBOX_KEY || '';
  if (![accountId, databaseId, apiToken, keyBase64].some(Boolean)) return null;
  if (![accountId, databaseId, apiToken, keyBase64].every(Boolean)) {
    throw new Error('Configuração D1 incompleta: são necessários conta, banco, token e chave de cifra.');
  }
  if (!/^[a-f0-9]{32}$/i.test(accountId) || !/^[a-f0-9-]{36}$/i.test(databaseId)) {
    throw new Error('Identificadores do D1 inválidos.');
  }
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32 || key.toString('base64') !== keyBase64) {
    throw new Error('BOT_INBOX_KEY deve conter 32 bytes em base64.');
  }
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  function encrypt(update) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(String(update.update_id)));
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(update), 'utf8'), cipher.final()]);
    return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join(':');
  }

  function decrypt(id, encoded) {
    const parts = String(encoded).split(':');
    if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('Formato cifrado do D1 inválido.');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(parts[1], 'base64'));
    decipher.setAAD(Buffer.from(String(id)));
    decipher.setAuthTag(Buffer.from(parts[2], 'base64'));
    const update = JSON.parse(Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64')), decipher.final()]).toString('utf8'));
    if (update.update_id !== Number(id)) throw new Error('ID do update cifrado não confere.');
    return update;
  }

  async function query(body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`D1 HTTP ${response.status}`);
      const data = await response.json();
      if (!data.success || !Array.isArray(data.result) || data.result.some(item => !item.success)) {
        throw new Error('Consulta D1 recusada.');
      }
      return data.result;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async init() {
      await query({ sql: 'CREATE TABLE IF NOT EXISTS bot_inbox (id INTEGER PRIMARY KEY, state TEXT NOT NULL, payload TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS bot_inbox_state_created ON bot_inbox(state, created_at);' });
    },
    async accept(update) {
      const id = String(update.update_id);
      const now = String(Date.now());
      const results = await query({ batch: [
        { sql: 'INSERT OR IGNORE INTO bot_inbox (id, state, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', params: [id, 'pending', encrypt(update), now, now] },
        { sql: 'SELECT state FROM bot_inbox WHERE id = ?', params: [id] }
      ] });
      const state = results[1] && results[1].results && results[1].results[0] && results[1].results[0].state;
      if (!state) throw new Error('Update não confirmado no D1.');
      return state === 'pending';
    },
    async markRunning(id) {
      const result = await query({ sql: "UPDATE bot_inbox SET state = 'running', updated_at = ? WHERE id = ? AND state = 'pending'", params: [String(Date.now()), String(id)] });
      return Number(result[0].meta && result[0].meta.changes) === 1;
    },
    async markState(id, state) {
      if (!['done', 'failed', 'uncertain'].includes(state)) throw new Error('Estado remoto inválido.');
      await query({ sql: 'UPDATE bot_inbox SET state = ?, updated_at = ? WHERE id = ? AND state = ?', params: [state, String(Date.now()), String(id), 'running'] });
    },
    async recoverPending(limit = 50, afterId = -1) {
      const result = await query({ sql: "SELECT id, payload FROM bot_inbox WHERE state = 'pending' AND id > ? ORDER BY id LIMIT ?", params: [String(afterId), String(limit)] });
      return (result[0].results || []).map(row => decrypt(row.id, row.payload));
    },
    async markInterrupted() {
      const result = await query({ sql: "UPDATE bot_inbox SET state = 'uncertain', updated_at = ? WHERE state = 'running'", params: [String(Date.now())] });
      return Number(result[0].meta && result[0].meta.changes) || 0;
    }
  };
}

module.exports = { createD1Inbox };
