'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { fingerprint, environment, runOne, runPool, receiptValid, receiptReusableFailure } = require('../scripts/run_tests.cjs');

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-contract-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: root });
    fs.writeFileSync(path.join(root, '.gitignore'), 'data/\nlogs/\n');
    fs.writeFileSync(path.join(root, 'main.cjs'), 'console.log("OK");');
    const initial = fingerprint(root);
    fs.mkdirSync(path.join(root, 'data'));
    fs.writeFileSync(path.join(root, 'data', 'state.json'), '{}');
    assert.equal(fingerprint(root), initial);
    fs.writeFileSync(path.join(root, 'new.cjs'), 'throw Error("failed")');
    assert.notEqual(fingerprint(root), initial, 'Código novo invalida a identidade');
    const previous = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = 'must-not-inherit';
    assert.notEqual(environment(root).TELEGRAM_BOT_TOKEN, 'must-not-inherit');
    assert.equal(environment(root).TELEGRAM_BOT_TOKEN, '123456789:local-test-placeholder');
    if (previous === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = previous;
    const success = await runOne({ file: 'main.cjs', kind: 'cjs' }, root);
    const failure = await runOne({ file: 'new.cjs', kind: 'cjs' }, root);
    assert.equal(success.status, 'passed');
    assert.equal(failure.status, 'failed');
    fs.writeFileSync(path.join(root, 'hang.cjs'), 'setInterval(() => {}, 1000);');
    const hang = await runOne({ file: 'hang.cjs', kind: 'cjs' }, root, { timeoutMs: 120 });
    assert.equal(hang.status, 'timeout');
    const tasks = Array.from({ length: 7 }, (_, file) => ({ file }));
    let count = 0, maximum = 0;
    const outcomes = await runPool(tasks, ['a', 'b'], async task => {
      count++; maximum = Math.max(maximum, count);
      await new Promise(done => setTimeout(done, 5)); count--;
      return task;
    });
    assert.equal(outcomes.length, 7);
    assert.equal(new Set(outcomes.map(task => task.file)).size, 7);
    assert.equal(maximum, 2);
    const versions = { node: 'fixture', python: 'fixture' };
    const inventory = [{ file: 'main.cjs' }];
    const receipt = { version: 1, scope: 'all', passed: true, fingerprint: initial, versions,
      results: [{ file: 'main.cjs', code: 0, status: 'passed' }] };
    assert(receiptValid(receipt, initial, inventory, versions));
    assert(!receiptValid(receipt, 'changed', inventory, versions));
    assert(!receiptValid(receipt, initial, [...inventory, { file: 'new.cjs' }], versions));
    assert(!receiptValid({ ...receipt, scope: 'partial' }, initial, inventory, versions));
    const failedReceipt = { ...receipt, passed: false, stable: true,
      results: [{ file: 'main.cjs', code: 1, status: 'failed', signal: null, error: null }] };
    assert(receiptReusableFailure(failedReceipt, initial, inventory, versions));
    assert(!receiptValid(failedReceipt, initial, inventory, versions));
    assert(!receiptReusableFailure(failedReceipt, 'changed', inventory, versions));
    assert(!receiptReusableFailure({ ...failedReceipt, scope: 'partial' }, initial, inventory, versions));
    assert(!receiptReusableFailure({ ...failedReceipt, stable: false }, initial, inventory, versions));
    assert(!receiptReusableFailure({ ...failedReceipt, results: [{ file: 'main.cjs', code: 124, status: 'timeout' }] }, initial, inventory, versions));
    assert(!receiptReusableFailure(failedReceipt, initial, inventory, { node: 'changed' }));
    console.log('✓ Runner: isolamento, falhas, timeout, concorrência e identidade validados.');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
