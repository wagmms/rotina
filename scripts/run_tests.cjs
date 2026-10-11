#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawn, execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const MANIFEST = require('./test_manifest.json');
const EXCLUDED = /^(?:data|logs|auditorias|gas_deploy|gh_cockpit_deploy|archive|scratch|scripts\/voos_gas)\//;
const FORBIDDEN = /(?:\.gs$|(?:^|\/)appsscript\.json$|(?:^|\/)ultra_rotina_gas\.js$)/;

function files(root) {
  const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).split('\0').filter(Boolean);
  // Artefatos públicos ignorados pelo Git também são alvo de testes de paridade.
  function visit(dir) {
    if (!fs.existsSync(path.join(root, dir))) return;
    for (const item of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      if (item.name.startsWith('.') || item.name === 'node_modules') continue;
      const name = dir + '/' + item.name;
      if (item.isDirectory()) visit(name);
      else if (item.isFile() && /\.(html|js|css|json|svg|png|ico|woff2?)$/.test(item.name)) tracked.push(name);
    }
  }
  visit('gh_cockpit_deploy');
  return [...new Set(tracked)].sort();
}

function fingerprint(root) {
  const hash = crypto.createHash('sha256');
  const inventory = files(root);
  if (!inventory.length) throw new Error('Inventário Git vazio; código não identificável.');
  for (const name of inventory) {
    if (/^(data|logs|auditorias)\//.test(name)) continue;
    hash.update(name + '\0');
    const target = path.join(root, name);
    if (!fs.existsSync(target)) { hash.update('deleted'); continue; }
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink()) hash.update('symlink\0' + fs.readlinkSync(target));
    else if (stat.isFile()) {
      hash.update(String(stat.mode & 0o777) + '\0');
      hash.update(fs.readFileSync(target));
    } else hash.update('deleted');
  }
  return hash.digest('hex');
}

function suites(root, all = false) {
  const baseline = MANIFEST.baseline.map(file => ({ file, kind: 'cjs' }));
  for (const suite of baseline) {
    if (!fs.existsSync(path.join(root, suite.file))) throw new Error('Suíte obrigatória ausente: ' + suite.file);
  }
  if (!all) return baseline;
  const pythonKinds = JSON.parse(execFileSync('python3', [path.join(root, 'scripts', 'python_test_catalog.py'), path.join(root, 'tests')], { encoding: 'utf8' }));
  return fs.readdirSync(path.join(root, 'tests')).sort()
    .filter(file => /^test_.*\.(cjs|py)$/.test(file))
    .map(file => ({ file: 'tests/' + file, kind: file.endsWith('.py') ? pythonKinds[file] : 'cjs' }));
}

function environment(lane, extra = {}) {
  // Não herdar credenciais do bot nem carregar .env/data da produção.
  const env = {};
  for (const key of ['PATH', 'LANG', 'LC_ALL', 'TZ', 'SYSTEMROOT', 'TMPDIR']) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return { ...env, NODE_ENV: 'test', TELEGRAM_CHAT_ID: '1771571035',
    TELEGRAM_BOT_TOKEN: '123456789:local-test-placeholder',
    BOT_DATA_DIR: path.join(lane, 'data'),
    PYTHONPATH: lane, PYTHONDONTWRITEBYTECODE: '1', ...extra };
}

function snapshot(root, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const name of files(root)) {
    if ((EXCLUDED.test(name) && !name.startsWith('gh_cockpit_deploy/')) || FORBIDDEN.test(name) ||
        name === '.env' || name === '.deploy_state.json' || name.startsWith('.agents/') || name.startsWith('.codex/')) continue;
    const source = path.join(root, name);
    if (!fs.existsSync(source)) continue;
    const stat = fs.lstatSync(source);
    if (!stat.isFile()) continue; // Sem symlinks que escapem para dados reais.
    const output = path.join(destination, name);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.copyFileSync(source, output);
    fs.chmodSync(output, stat.mode & 0o777);
  }
  if (fs.existsSync(path.join(root, 'node_modules'))) {
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(destination, 'node_modules'), 'dir');
  }
}

function terminate(child, signal) {
  try { process.kill(-child.pid, signal); } catch (e) { if (e.code !== 'ESRCH') throw e; }
}

function runOne(suite, lane, options = {}) {
  const timeoutMs = options.timeoutMs || 120000;
  const started = performance.now();
  const logFile = options.logFile;
  const command = suite.kind.startsWith('python') ? (options.python || 'python3') : process.execPath;
  const args = suite.kind === 'python'
    ? ['-m', 'pytest', '-p', 'scripts.pytest_cjs_receipts', '-q', suite.file]
    : suite.kind === 'python-script' ? ['-m', 'scripts.run_python_script_receipts', suite.file] : [suite.file];
  return new Promise(resolve => {
    let timedOut = false;
    let spawnError = null;
    let tail = '';
    const output = logFile ? fs.createWriteStream(logFile) : null;
    const stdoutFile = logFile ? logFile + '.stdout' : null;
    const stderrFile = logFile ? logFile + '.stderr' : null;
    const stdoutLog = stdoutFile ? fs.createWriteStream(stdoutFile) : null;
    const stderrLog = stderrFile ? fs.createWriteStream(stderrFile) : null;
    const childEnv = environment(lane, options.env);
    if (options.python && path.isAbsolute(options.python)) {
      childEnv.PATH = path.dirname(options.python) + path.delimiter + (childEnv.PATH || '');
    }
    const child = spawn(command, args, { cwd: lane, env: childEnv,
      detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    options.active?.add(child);
    const collect = (chunk, stream) => {
      output?.write(chunk);
      stream?.write(chunk);
      tail = (tail + chunk.toString()).slice(-12000);
    };
    child.stdout.on('data', chunk => collect(chunk, stdoutLog));
    child.stderr.on('data', chunk => collect(chunk, stderrLog));
    let killTimer;
    const timer = setTimeout(() => {
      timedOut = true;
      terminate(child, 'SIGTERM');
      killTimer = setTimeout(() => terminate(child, 'SIGKILL'), 2000);
    }, timeoutMs);
    child.on('error', err => { spawnError = err.message; });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      clearTimeout(killTimer);
      options.active?.delete(child);
      // Mesmo após o pai encerrar, descendentes não podem ficar órfãos.
      if (timedOut) terminate(child, 'SIGKILL');
      const result = { file: suite.file, kind: suite.kind,
        status: timedOut ? 'timeout' : (code === 0 && !spawnError ? 'passed' : 'failed'),
        code, signal, seconds: Math.round((performance.now() - started)) / 1000,
        error: spawnError, tail, logFile, stdoutFile, stderrFile };
      if (output) Promise.all([output, stdoutLog, stderrLog].map(stream =>
        new Promise(done => stream.end(done)))).then(() => resolve(result));
      else resolve(result);
    });
  });
}

async function runPool(tasks, lanes, execute) {
  const results = [];
  let next = 0;
  await Promise.all(lanes.map(async (lane, index) => {
    while (next < tasks.length) {
      const suite = tasks[next++];
      results.push(await execute(suite, lane, index));
    }
  }));
  return results;
}

function receiptValid(receipt, identity, inventory, versions) {
  if (!receipt || receipt.version !== 1 || receipt.scope !== 'all' || !receipt.passed ||
      !Array.isArray(receipt.results) || receipt.fingerprint !== identity || JSON.stringify(receipt.versions) !== JSON.stringify(versions)) return false;
  const expected = inventory.map(s => s.file).sort();
  const actual = (receipt.results || []).map(r => r.file).sort();
  return JSON.stringify(expected) === JSON.stringify(actual) &&
    receipt.results.every(r => r.status === 'passed' && r.code === 0);
}

function receiptReusableFailure(receipt, identity, inventory, versions) {
  // Reutilizar reprovação poupa repetição; nunca transforma falha em aprovação.
  if (!receipt || receipt.passed !== false || receipt.stable !== true ||
      !Array.isArray(receipt.results) || !receipt.results.some(r => r.status === 'failed')) return false;
  if (!receipt.results.every(r => !r.signal && !r.error &&
      ((r.status === 'passed' && r.code === 0) ||
       (r.status === 'failed' && Number.isInteger(r.code) && r.code > 0)))) return false;
  const shape = { ...receipt, passed: true,
    results: receipt.results.map(r => ({ ...r, status: 'passed', code: 0 })) };
  return receiptValid(shape, identity, inventory, versions);
}

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const inventory = suites(ROOT, all);
  if (args.includes('--list')) { console.log(JSON.stringify(inventory, null, 2)); return; }
  const selected = args.find(arg => arg.startsWith('--select='));
  const wanted = selected?.slice(9).split(',');
  const tasks = wanted ? inventory.filter(s => wanted.includes(s.file)) : inventory;
  if (!tasks.length || (wanted && new Set(wanted).size !== tasks.length)) throw new Error('Seleção contém suíte desconhecida.');
  const jobs = Number(args.find(arg => arg.startsWith('--jobs='))?.slice(7) || 4);
  if (!Number.isInteger(jobs) || jobs < 1 || jobs > 4) throw new Error('--jobs deve ser inteiro entre 1 e 4.');
  const timeoutMs = Number(args.find(arg => arg.startsWith('--timeout-ms='))?.slice(13) || 120000);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 100) throw new Error('Timeout inválido.');
  const localPython = path.join(ROOT, '.venv', 'bin', 'python');
  const python = process.env.AUTOLOOP_TEST_PYTHON || (fs.existsSync(localPython) ? localPython : 'python3');
  const versions = { node: process.version, python: execFileSync(python, ['--version'], { encoding: 'utf8' }).trim() };
  const identity = fingerprint(ROOT);
  const receiptFile = path.join(ROOT, 'data', '.autoloop_test_receipt.json');
  if (all && !selected && args.includes('--reuse')) {
    let receipt;
    try { receipt = JSON.parse(fs.readFileSync(receiptFile, 'utf8')); } catch (_) {}
    if (receiptValid(receipt, identity, inventory, versions)) {
      console.log(`[TESTES] Bateria completa já aprovada para este código e ambiente: ${inventory.length} suítes. Auditoria clínica continua obrigatória.`);
      return;
    }
    if (receiptReusableFailure(receipt, identity, inventory, versions)) {
      console.log('[TESTES] Reprovação completa já registrada para este código e ambiente. Publicação permanece bloqueada. Para nova medição ou diagnóstico, execute sem --reuse.');
      process.exitCode = 1;
      return;
    }
  }
  const started = performance.now();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'rotina-tests-'));
  const lanes = Array.from({ length: jobs }, (_, i) => path.join(workspace, 'lane-' + i));
  const reportsBase = path.join(ROOT, 'data', 'test_reports');
  try {
    if (fs.existsSync(reportsBase)) {
      const dirs = fs.readdirSync(reportsBase)
        .map(n => ({ full: path.join(reportsBase, n), stat: fs.statSync(path.join(reportsBase, n)) }))
        .filter(d => d.stat.isDirectory())
        .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
      for (const old of dirs.slice(10)) {
        fs.rmSync(old.full, { recursive: true, force: true });
      }
    }
  } catch (_) {}
  const reportDir = path.join(reportsBase, crypto.randomUUID());
  fs.mkdirSync(reportDir, { recursive: true });
  const active = new Set();
  let interrupted = false;
  const interrupt = () => { interrupted = true; for (const child of active) terminate(child, 'SIGTERM'); };
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', interrupt);
  const running = new Map();
  const heartbeat = setInterval(() => {
    console.log('[PROGRESSO] Testes ativos: ' + [...running.keys()].join(', '));
  }, 30000);
  let results = [];
  try {
    for (const lane of lanes) snapshot(ROOT, lane);
    if (fingerprint(ROOT) !== identity) throw new Error('Código mudou durante a preparação; repetir após estabilizar.');
    console.log(`[TESTES] ${tasks.length} suítes; ${jobs} processos; código ${identity.slice(0, 12)}; dados isolados.`);
    const execute = async (suite, lane, index, receipts) => {
      if (interrupted) return { file: suite.file, kind: suite.kind, status: 'interrupted', code: null };
      // Estado e logs independentes por suíte, inclusive dentro de uma mesma fila.
      for (const dir of ['data', 'logs', '.pytest_cache']) fs.rmSync(path.join(lane, dir), { recursive: true, force: true });
      fs.mkdirSync(path.join(lane, 'data'), { recursive: true });
      for (const name of ['interacoes.json', 'guia_farmaceutico_hsl.json', 'guia_pediatrico_pedb.json', 'condutas_pediatricas_pedb.json']) {
        const official = path.join(lane, 'src', 'data', name);
        if (fs.existsSync(official)) fs.copyFileSync(official, path.join(lane, 'data', name));
      }
      running.set(suite.file, true);
      const result = await runOne(suite, lane, { timeoutMs, python, active,
        env: receipts ? { AUTOLOOP_CJS_RECEIPTS: receipts } : {},
        logFile: path.join(reportDir, suite.file.replaceAll('/', '_') + '.log') });
      running.delete(suite.file);
      console.log(`[${result.status === 'passed' ? 'OK' : 'FALHA'}] ${suite.file}: ${result.seconds}s${result.status === 'timeout' ? ' (timeout)' : ''}`);
      if (result.status !== 'passed') console.log(result.error || result.tail.slice(-2200));
      return result;
    };
    const cjs = await runPool(tasks.filter(s => s.kind === 'cjs'), lanes, execute);
    const receiptsFile = path.join(workspace, 'cjs-receipts.json');
    const cjsReceipts = Object.fromEntries(cjs.filter(r => r.code !== null && r.status !== 'timeout').map(r => [r.file, {
      code: r.code, seconds: r.seconds, stdout: fs.readFileSync(r.stdoutFile, 'utf8'), stderr: fs.readFileSync(r.stderrFile, 'utf8')
    }]));
    fs.writeFileSync(receiptsFile, JSON.stringify(cjsReceipts));
    const pythonResults = await runPool(tasks.filter(s => s.kind.startsWith('python')), lanes,
      (suite, lane, index) => execute(suite, lane, index, receiptsFile));
    results = [...cjs, ...pythonResults];
    const stable = fingerprint(ROOT) === identity;
    const passed = !interrupted && stable && results.length === tasks.length && results.every(r => r.status === 'passed');
    const receipt = { version: 1, scope: all && !selected ? 'all' : 'partial', fingerprint: identity,
      versions, passed, stable, seconds: (performance.now() - started) / 1000,
      results: results.map(({ tail, logFile, stdoutFile, stderrFile, ...result }) => result) };
    fs.writeFileSync(path.join(reportDir, 'summary.json'), JSON.stringify(receipt, null, 2));
    if (all && !selected) {
      const temp = receiptFile + '.' + process.pid + '.tmp';
      fs.writeFileSync(temp, JSON.stringify(receipt, null, 2));
      fs.renameSync(temp, receiptFile);
    }
    const failures = results.filter(r => r.status !== 'passed').length;
    console.log(`[TESTES] ${results.length - failures}/${tasks.length} aprovadas; ${receipt.seconds.toFixed(2)}s; código ${stable ? 'estável' : 'ALTERADO'}. Relatório: ${reportDir}`);
    if (!passed) process.exitCode = 1;
  } finally {
    clearInterval(heartbeat);
    process.off('SIGINT', interrupt);
    process.off('SIGTERM', interrupt);
    for (const child of active) terminate(child, 'SIGKILL');
    fs.rmSync(workspace, { recursive: true, force: true });
  }
}

module.exports = { fingerprint, suites, environment, snapshot, runOne, runPool, receiptValid, receiptReusableFailure };
if (require.main === module) main().catch(error => { console.error('[TESTES] ' + error.message); process.exitCode = 1; });
