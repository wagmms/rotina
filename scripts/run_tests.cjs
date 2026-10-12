#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawn, execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const MANIFEST = require('./test_manifest.json');
const EXCLUDED = /^(?:data|logs|auditorias|tests\/repros|gas_deploy|gh_cockpit_deploy|archive|scratch|scripts\/voos_gas)\//;
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
    if (/^(?:data|logs|auditorias|tests\/repros)\//.test(name) || name === 'docs/RELATORIO_TESTADOR_MASTER.md' || name === 'docs/dashboard_grafo.html' || name === 'tooling/testador_master/dashboard_grafo.html') continue;
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
  if (fs.existsSync(path.join(root, 'calendar_manager', 'token.json'))) {
    const destToken = path.join(destination, 'calendar_manager', 'token.json');
    fs.mkdirSync(path.dirname(destToken), { recursive: true });
    try { fs.copyFileSync(path.join(root, 'calendar_manager', 'token.json'), destToken); } catch (_) {}
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

function loadSuiteDurations(root) {
  const durations = new Map();
  const receiptFile = path.join(root, 'data', '.autoloop_test_receipt.json');
  try {
    if (fs.existsSync(receiptFile)) {
      const receipt = JSON.parse(fs.readFileSync(receiptFile, 'utf8'));
      if (Array.isArray(receipt.results)) {
        for (const r of receipt.results) {
          if (r && r.file && typeof r.seconds === 'number' && r.seconds > 0) {
            durations.set(r.file, r.seconds);
          }
        }
      }
    }
  } catch (_) {}

  const reportsDir = path.join(root, 'data', 'test_reports');
  try {
    if (fs.existsSync(reportsDir)) {
      const recentReports = fs.readdirSync(reportsDir)
        .map(n => ({ path: path.join(reportsDir, n, 'summary.json'), stat: fs.statSync(path.join(reportsDir, n)) }))
        .filter(d => fs.existsSync(d.path))
        .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
      for (const rep of recentReports.slice(0, 3)) {
        try {
          const summary = JSON.parse(fs.readFileSync(rep.path, 'utf8'));
          if (Array.isArray(summary.results)) {
            for (const r of summary.results) {
              if (r && r.file && typeof r.seconds === 'number' && r.seconds > 0 && !durations.has(r.file)) {
                durations.set(r.file, r.seconds);
              }
            }
          }
        } catch (_) {}
      }
    }
  } catch (_) {}

  return durations;
}

function orderLPT(tasks, root) {
  if (!Array.isArray(tasks) || tasks.length <= 1) return tasks;
  const durations = loadSuiteDurations(root || ROOT);
  return [...tasks].sort((a, b) => {
    const durA = durations.get(a.file) || (a.kind && a.kind.startsWith('python') ? 0.6 : 0.2);
    const durB = durations.get(b.file) || (b.kind && b.kind.startsWith('python') ? 0.6 : 0.2);
    if (durB !== durA) {
      return durB - durA; // LPT: tarefas mais longas primeiro
    }
    return a.file.localeCompare(b.file);
  });
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

const IGNORED_AFFECTED_PATTERN = /^(?:\.git|docs\/|logs\/|auditorias\/|archive\/|scratch\/|\.github\/|\.gemini\/|\.cursor\/|\.codex\/|\.vscode\/)|(?:\.(?:md|txt|png|jpg|jpeg|gif|ico|webp)$)|(?:^\.gitignore$)/i;

const STATIC_AFFECTED_MAP = {
  // Módulos Clínicos, SOAP e Ambulatório
  'src/02_soap_ambulatorial.js': [
    'tests/test_soap_ambulatorial.cjs',
    'tests/test_soap_modo_e_receita_ux.cjs'
  ],
  'src/02_calculadoras_puras.js': [
    'tests/test_schemas_validacao_calculadoras.cjs',
    'tests/test_calculadoras_ux.cjs'
  ],
  'src/02_centro_obstetrico.js': [
    'tests/test_auditoria_pro_ginecologia_prenatal.cjs',
    'tests/test_hub_go_ux.cjs',
    'tests/test_go_hub_ux.cjs'
  ],
  'src/02_cardiologia_emergencia.js': [
    'tests/test_sala_vermelha_ux.cjs',
    'tests/test_cardiologia_emergencia.cjs'
  ],
  'src/02_emergencia_choque_septico_circi.js': [
    'tests/test_emergencia_choque_septico_circi.cjs',
    'tests/test_sala_vermelha_ux.cjs'
  ],
  'src/02_compatibilidade_y_dva.js': [
    'tests/test_compatibilidade_y_dva.cjs',
    'tests/test_sala_vermelha_ux.cjs'
  ],
  'src/02_pcr_gestante.js': [
    'tests/test_pcr_gestante.cjs',
    'tests/test_sala_vermelha_ux.cjs'
  ],
  // Motores de IA e Fallbacks
  'src/04_motores_ia.js': [
    'tests/test_circuit_breaker_multimodal.cjs',
    'tests/test_resiliencia_gemini_429.cjs',
    'tests/test_resiliencia_multimodal.cjs'
  ],
  'src/04_ia_local_fallback.js': [
    'tests/test_circuit_breaker_multimodal.cjs',
    'tests/test_resiliencia_gemini_429.cjs'
  ],
  // Handlers e Roteamento do Bot Telegram
  'src/07a_telegram_router.js': [
    'tests/test_hubs_e_comandos_telegram.cjs',
    'tests/test_ajuda_comandos_slash.cjs',
    'tests/test_defensivo_telegram_rpc.cjs'
  ],
  'src/07b_telegram_preceptor.js': [
    'tests/test_preceptor_dialogo_socratico.cjs',
    'tests/test_preceptor_live_voice.cjs',
    'tests/test_tts_modo_rapido_preceptor.cjs'
  ],
  'src/07c_telegram_consultas_e_ia.js': [
    'tests/test_consultas_bolso_ux.cjs',
    'tests/test_hubs_e_comandos_telegram.cjs'
  ],
  'src/07d_telegram_callbacks.js': [
    'tests/test_hubs_e_comandos_telegram.cjs',
    'tests/test_ui_ux_acessibilidade_telegram.cjs'
  ],
  'src/07e_telegram_midia_e_leitos.js': [
    'tests/test_gestao_leitos_sbar_ux.cjs',
    'tests/test_pipeline_audio_otimizado.cjs',
    'tests/test_hubs_e_comandos_telegram.cjs'
  ],
  'src/07f_telegram_calculadoras_parser.js': [
    'tests/test_calculadoras_ux.cjs',
    'tests/test_schemas_validacao_calculadoras.cjs'
  ],
  'src/07g_telegram_ajuda_e_protocolos.js': [
    'tests/test_ajuda_comandos_slash.cjs',
    'tests/test_hubs_e_comandos_telegram.cjs'
  ],
  // Enfermaria e Gestão de Leitos SBAR
  'src/09_enfermaria.js': [
    'tests/test_enfermaria_ux_fluxos.cjs',
    'tests/test_gestao_leitos_sbar_ux.cjs'
  ],
  // PDF e Prescrição
  'src/10_pdf_receita.js': [
    'tests/test_pdf_receita.py',
    'tests/test_soap_extrair_receita.cjs'
  ],
  // Experiência do Bot e PEP
  'src/12_experiencia_bot.js': [
    'tests/test_ui_ux_formatacao_respostas_pep.cjs',
    'tests/test_central_rotina_plantao_ux.cjs',
    'tests/test_ui_ux_acessibilidade_telegram.cjs'
  ],
  // Cockpit PWA e Integrações
  'src/13_cockpit_integracao.js': [
    'tests/test_cockpit_resiliencia_e_offline.cjs',
    'tests/test_cockpit_carga_e_teclados.cjs',
    'tests/test_defensivo_telegram_rpc.cjs'
  ],
  'cockpit_movel.html': [
    'tests/test_acessibilidade_contraste_cockpit.cjs',
    'tests/test_cockpit_resiliencia_e_offline.cjs',
    'tests/test_cockpit_carga_e_teclados.cjs',
    'tests/test_cockpit_historico_calculos.cjs'
  ],
  // Servidor Fastify e Runtime
  'server.js': [
    'tests/test_server_render.cjs',
    'tests/test_fastify_resiliencia.cjs'
  ],
  'server/index.js': [
    'tests/test_server_render.cjs',
    'tests/test_fastify_resiliencia.cjs',
    'tests/test_fastify_resiliencia_payloads.cjs',
    'tests/test_seguranca_helmet_ratelimit.cjs',
    'tests/test_caching_etag_fastify.cjs',
    'tests/test_logs_telemetria_render.cjs'
  ],
  'server/runtime.js': [
    'tests/test_server_render.cjs',
    'tests/test_defensivo_telegram_rpc.cjs',
    'tests/test_autoloop_runner.cjs'
  ],
  'server/validators.js': [
    'tests/test_schemas_validacao_calculadoras.cjs',
    'tests/test_fastify_resiliencia_payloads.cjs'
  ],
  // Scripts do Runner
  'scripts/run_tests.cjs': [
    'tests/test_autoloop_runner.cjs'
  ],
  'scripts/test_manifest.json': [
    'tests/test_autoloop_runner.cjs'
  ],
  'scripts/python_test_catalog.py': [
    'tests/test_autoloop_runner.cjs'
  ],
  'build_master.py': [
    'tests/test_autoloop_runner.cjs',
    'tests/test_server_render.cjs'
  ],
  'ultra_rotina_master.js': [
    'tests/test_server_render.cjs'
  ]
};

function getChangedFiles(root = ROOT, options = {}) {
  const ref = options.ref || null;
  const changed = new Set();
  try {
    const statusOut = execFileSync('git', ['status', '--porcelain', '-uall'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']
    });
    for (const line of statusOut.split('\n')) {
      if (!line.trim()) continue;
      const payload = line.slice(3).trim();
      if (!payload) continue;
      if (payload.includes('->')) {
        const parts = payload.split('->').map(p => p.trim());
        for (const p of parts) if (p) changed.add(p);
      } else {
        changed.add(payload);
      }
    }
  } catch (_) {}

  if (ref) {
    try {
      const diffOut = execFileSync('git', ['diff', '--name-only', ref], {
        cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']
      });
      for (const line of diffOut.split('\n')) {
        const file = line.trim();
        if (file) changed.add(file);
      }
    } catch (_) {}
  }

  return [...changed]
    .map(f => path.normalize(f).replace(/^\.\//, ''))
    .filter(f => !IGNORED_AFFECTED_PATTERN.test(f))
    .sort();
}

function findAffectedSuites(changedFiles, root = ROOT) {
  if (!Array.isArray(changedFiles) || changedFiles.length === 0) return [];
  const allSuites = suites(root, true);
  const knownSuiteFiles = new Set(allSuites.map(s => s.file));
  const affected = new Set();

  for (const raw of changedFiles) {
    const file = path.normalize(raw.trim()).replace(/^\.\//, '');
    if (!file || IGNORED_AFFECTED_PATTERN.test(file)) continue;

    // 1. O próprio arquivo já é uma suíte de teste existente
    if (knownSuiteFiles.has(file)) {
      affected.add(file);
      continue;
    }
    const withTestsPrefix = file.startsWith('tests/') ? file : 'tests/' + file;
    if (knownSuiteFiles.has(withTestsPrefix)) {
      affected.add(withTestsPrefix);
      continue;
    }

    // 2. Mapeamento Estático Explícito
    if (STATIC_AFFECTED_MAP[file]) {
      for (const suite of STATIC_AFFECTED_MAP[file]) {
        if (knownSuiteFiles.has(suite)) affected.add(suite);
      }
      continue;
    }

    // 3. Heurística de Stem (ex.: src/02_pneumologia_dpoc_vni.js -> tests/test_pneumologia_dpoc_vni.cjs)
    if (file.startsWith('src/') || file.startsWith('server/')) {
      const baseName = path.basename(file, path.extname(file));
      const cleanStem = baseName.replace(/^\d+[a-z]?_/, '');

      const candidateCjs = `tests/test_${cleanStem}.cjs`;
      const candidatePy = `tests/test_${cleanStem}.py`;
      if (knownSuiteFiles.has(candidateCjs)) affected.add(candidateCjs);
      if (knownSuiteFiles.has(candidatePy)) affected.add(candidatePy);

      // Correspondência com stem longo em suítes existentes
      for (const known of knownSuiteFiles) {
        if (cleanStem.length >= 6 && known.includes(cleanStem)) {
          affected.add(known);
        }
      }
    }
  }

  return [...affected].sort();
}

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  if (args.includes('--list')) { console.log(JSON.stringify(suites(ROOT, true), null, 2)); return; }
  const affected = args.includes('--affected') || args.some(arg => arg.startsWith('--affected='));
  const affectedArg = args.find(arg => arg.startsWith('--affected='));
  const affectedRef = affectedArg ? affectedArg.slice(11).trim() : null;

  let wanted = null;

  if (affected) {
    const changedFiles = getChangedFiles(ROOT, { ref: affectedRef });
    if (!changedFiles.length) {
      console.log('[TESTES] Nenhuma modificação de código detectada via git status. Nenhuma suíte afetada.');
      return;
    }
    const affectedSuites = findAffectedSuites(changedFiles, ROOT);
    if (!affectedSuites.length) {
      console.log(`[TESTES] Nenhuma suíte de teste afetada pelas alterações (${changedFiles.length} arquivos analisados).`);
      return;
    }
    const displayFiles = changedFiles.slice(0, 5).join(', ') + (changedFiles.length > 5 ? ` (+${changedFiles.length - 5} arquivos)` : '');
    console.log(`[AFETADOS] Arquivos modificados (${changedFiles.length}): ${displayFiles}`);
    console.log(`[AFETADOS] Suítes mapeadas (${affectedSuites.length}): ${affectedSuites.join(', ')}`);
    wanted = affectedSuites;
  } else {
    const selectedArg = args.find(arg => arg.startsWith('--select='));
    const selectedList = selectedArg ? selectedArg.slice(9).split(',').filter(Boolean) : [];
    const positionalList = args.filter(arg => !arg.startsWith('--'));
    const rawWanted = [...selectedList, ...positionalList];
    wanted = rawWanted.length > 0 ? rawWanted.map(raw => {
      let clean = path.normalize(raw.trim()).replace(/^\.\//, '');
      if (path.isAbsolute(clean)) {
        clean = path.relative(ROOT, clean);
      }
      if (!clean.startsWith('tests/') && fs.existsSync(path.join(ROOT, 'tests', clean))) {
        clean = 'tests/' + clean;
      }
      return clean;
    }) : null;
  }

  const inventory = wanted ? suites(ROOT, true) : suites(ROOT, all);
  const tasks = wanted ? inventory.filter(s => wanted.includes(s.file)) : inventory;
  if (wanted) {
    const found = new Set(tasks.map(s => s.file));
    const missing = wanted.filter(w => !found.has(w));
    if (missing.length > 0) throw new Error(`Seleção contém suíte desconhecida: ${missing.join(', ')}`);
  }
  if (!tasks.length) throw new Error('Nenhuma suíte de teste selecionada.');
  const jobsArg = args.find(arg => arg.startsWith('--jobs='));
  const defaultJobs = wanted ? Math.min(tasks.length, 4) : 4;
  const jobs = Number(jobsArg ? jobsArg.slice(7) : defaultJobs);
  if (!Number.isInteger(jobs) || jobs < 1 || jobs > 4) throw new Error('--jobs deve ser inteiro entre 1 e 4.');
  const timeoutMs = Number(args.find(arg => arg.startsWith('--timeout-ms='))?.slice(13) || 120000);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 100) throw new Error('Timeout inválido.');
  const localPython = path.join(ROOT, '.venv', 'bin', 'python');
  const python = process.env.AUTOLOOP_TEST_PYTHON || (fs.existsSync(localPython) ? localPython : 'python3');
  const versions = { node: process.version, python: execFileSync(python, ['--version'], { encoding: 'utf8' }).trim() };
  const identity = fingerprint(ROOT);
  const receiptFile = path.join(ROOT, 'data', '.autoloop_test_receipt.json');
  const isFullRun = all && !wanted;
  if (isFullRun && args.includes('--reuse')) {
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
    const cjsTasks = orderLPT(tasks.filter(s => s.kind === 'cjs'), ROOT);
    const cjs = await runPool(cjsTasks, lanes, execute);
    const receiptsFile = path.join(workspace, 'cjs-receipts.json');
    const cjsReceipts = Object.fromEntries(cjs.filter(r => r.code !== null && r.status !== 'timeout').map(r => [r.file, {
      code: r.code, seconds: r.seconds, stdout: fs.readFileSync(r.stdoutFile, 'utf8'), stderr: fs.readFileSync(r.stderrFile, 'utf8')
    }]));
    fs.writeFileSync(receiptsFile, JSON.stringify(cjsReceipts));
    const pyTasks = orderLPT(tasks.filter(s => s.kind.startsWith('python')), ROOT);
    const pythonResults = await runPool(pyTasks, lanes,
      (suite, lane, index) => execute(suite, lane, index, receiptsFile));
    results = [...cjs, ...pythonResults];
    const stable = fingerprint(ROOT) === identity;
    const passed = !interrupted && stable && results.length === tasks.length && results.every(r => r.status === 'passed');
    const receipt = { version: 1, scope: isFullRun ? 'all' : 'partial', fingerprint: identity,
      versions, passed, stable, seconds: (performance.now() - started) / 1000,
      results: results.map(({ tail, logFile, stdoutFile, stderrFile, ...result }) => result) };
    fs.writeFileSync(path.join(reportDir, 'summary.json'), JSON.stringify(receipt, null, 2));
    if (isFullRun) {
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

module.exports = {
  fingerprint,
  suites,
  environment,
  snapshot,
  runOne,
  runPool,
  receiptValid,
  receiptReusableFailure,
  loadSuiteDurations,
  orderLPT,
  getChangedFiles,
  findAffectedSuites,
  STATIC_AFFECTED_MAP
};
if (require.main === module) main().catch(error => { console.error('[TESTES] ' + error.message); process.exitCode = 1; });
