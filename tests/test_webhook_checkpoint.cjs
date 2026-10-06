const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-checkpoint-'));
const runtimePath = path.resolve(__dirname, '../server/runtime.js');
const code = `
  const assert = require('node:assert/strict');
  const runtime = require(${JSON.stringify(runtimePath)});
  if (process.env.CHECKPOINT_PHASE === 'write') {
    runtime.ctx.enfileirarUpdate({update_id:42,message:{chat:{id:123},text:'pedido preservado'}});
    runtime.persistirPropriedades(true);
  } else {
    const pedido = runtime.ctx.PersistenciaBot.ler('inbox_42');
    assert.equal(pedido.status, 'pending');
    assert.equal(pedido.update.message.text, 'pedido preservado');
  }
  process.exit(0);
`;

try {
  for (const phase of ['write', 'read']) {
    const result = spawnSync(process.execPath, ['-e', code], {
      env: { ...process.env, BOT_DATA_DIR: dataDir, CHECKPOINT_PHASE: phase },
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, `${phase}: ${result.stderr}`);
  }
  assert.equal(fs.existsSync(path.join(dataDir, 'properties.json')), true);
  assert.equal(fs.readdirSync(dataDir).some(name => name.endsWith('.tmp')), false);
  console.log('OK: pedido pendente recuperado em outro processo após checkpoint');
} finally {
  fs.rmSync(dataDir, { recursive: true, force: true });
}
