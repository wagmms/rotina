'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { fingerprint, environment, runOne, runPool, receiptValid, receiptReusableFailure, loadSuiteDurations, orderLPT } = require('../scripts/run_tests.cjs');

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

    // Validação da Execução Direcionada / Test Sharding (argumento posicional direto)
    if (fs.existsSync(path.join(__dirname, '../.git'))) {
      const runOutput = execFileSync(process.execPath, [
        path.join(__dirname, '../scripts/run_tests.cjs'),
        'tests/test_obstetricia_prenatal.cjs'
      ], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' });
      assert(runOutput.includes('[TESTES] 1 suítes; 1 processos'), 'Deve executar 1 suíte direcionada em 1 processo');
      assert(runOutput.includes('[OK] tests/test_obstetricia_prenatal.cjs'), 'Suíte direcionada deve passar');
    }

    // Validação do Agendamento LPT (Longest Processing Time First)
    const mockReceipt = {
      version: 1, scope: 'all', passed: true, fingerprint: 'mock', versions,
      results: [
        { file: 'tests/test_curto.cjs', seconds: 0.1, code: 0, status: 'passed' },
        { file: 'tests/test_pesado.cjs', seconds: 4.2, code: 0, status: 'passed' },
        { file: 'tests/test_medio.cjs', seconds: 1.5, code: 0, status: 'passed' },
        { file: 'tests/test_empate_b.cjs', seconds: 0.5, code: 0, status: 'passed' },
        { file: 'tests/test_empate_a.cjs', seconds: 0.5, code: 0, status: 'passed' }
      ]
    };
    fs.writeFileSync(path.join(root, 'data', '.autoloop_test_receipt.json'), JSON.stringify(mockReceipt));
    const inputTasks = [
      { file: 'tests/test_curto.cjs', kind: 'cjs' },
      { file: 'tests/test_empate_b.cjs', kind: 'cjs' },
      { file: 'tests/test_pesado.cjs', kind: 'cjs' },
      { file: 'tests/test_empate_a.cjs', kind: 'cjs' },
      { file: 'tests/test_medio.cjs', kind: 'cjs' }
    ];
    const orderedTasks = orderLPT(inputTasks, root);
    assert.equal(orderedTasks[0].file, 'tests/test_pesado.cjs', 'A suíte mais demorada (4.2s) deve ser a primeira (LPT)');
    assert.equal(orderedTasks[1].file, 'tests/test_medio.cjs', 'A segunda mais demorada (1.5s) deve vir em seguida');
    assert.equal(orderedTasks[2].file, 'tests/test_empate_a.cjs', 'Empate deve ser resolvido em ordem alfabética estável (a antes de b)');
    assert.equal(orderedTasks[3].file, 'tests/test_empate_b.cjs', 'Empate deve ser resolvido em ordem alfabética estável');
    assert.equal(orderedTasks[4].file, 'tests/test_curto.cjs', 'A suíte mais rápida (0.1s) deve vir ao final');

    console.log('✓ Runner: isolamento, falhas, timeout, concorrência, execução direcionada (test sharding), agendamento LPT e identidade validados.');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
