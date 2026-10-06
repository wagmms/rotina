const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const source = fs.readFileSync(process.argv[2] || path.resolve(__dirname, '../ultra_rotina_master.js'), 'utf8');

function env() {
  const props = {TELEGRAM_CHAT_ID:'123', TELEGRAM_BOT_TOKEN:'fake', WEBHOOK_SECRET:'secret', NOTION_TASKS_DB_ID:'fake-db'}, cache = {}, sent = [];
  const ops = {getProperty:0, getProperties:0, setProperty:0, setProperties:0, deleteProperty:0};
  let now = 2000000000000, seq = 0, sleepCount = 0, fetchImpl = null;
  class Clock extends Date { constructor(...a){super(...(a.length?a:[now]));} static now(){return now;} }
  const p = {
    getProperty: k => { ops.getProperty++; return props[k] ?? null; },
    setProperty: (k, v) => { ops.setProperty++; props[k] = String(v); },
    deleteProperty: k => { ops.deleteProperty++; delete props[k]; },
    getProperties: () => { ops.getProperties++; return {...props}; },
    setProperties: (o, del) => {
      ops.setProperties++;
      if (del) for (const k in props) delete props[k];
      for (const k in o) props[k] = String(o[k]);
      return p;
    }
  };
  const c = {
    Buffer, Date: Clock, console: {log(){}, error(){}},
    PropertiesService: {getScriptProperties: () => p},
    CacheService: {getScriptCache: () => ({get: k => cache[k] ?? null, put: (k,v) => {cache[k] = String(v);}, remove: k => {delete cache[k];}})},
    LockService: {getScriptLock: () => ({waitLock(){}, releaseLock(){}}), getUserLock: () => ({tryLock: () => true, releaseLock(){}})},
    HtmlService: {createHtmlOutput: body => ({body})},
    ContentService: {MimeType: {JSON: 'json'}, createTextOutput: body => ({body, setMimeType(){return this;}})},
    ScriptApp: {getProjectTriggers: () => []},
    UrlFetchApp: {
      fetch: (url, opts) => {
        const payload = JSON.parse((opts && opts.payload) || '{}');
        sent.push({url, payload, t: now});
        if (fetchImpl) return fetchImpl(url, payload, opts);
        return {getResponseCode: () => 200, getContentText: () => '{"ok":true}'};
      }
    }
  };
  vm.createContext(c);
  vm.runInContext(source, c);
  c.Utilities.getUuid = () => String(++seq).padStart(32, '0');
  c.Utilities.sleep = (ms) => { sleepCount++; now += ms; };
  const resetOps = () => { for (const k in ops) ops[k] = 0; };
  const totalOps = () => Object.values(ops).reduce((a, b) => a + b, 0);
  return {
    c, props, ops, sent, resetOps, totalOps,
    advance: n => now += n,
    setFetch: f => fetchImpl = f,
    getSleepCount: () => sleepCount
  };
}

let total = 0, pass = 0;
function test(name, fn) {
  total++;
  try {
    fn();
    pass++;
    console.log('OK ' + name);
  } catch (e) {
    process.exitCode = 1;
    console.error('FALHA ' + name + '\n' + e.stack);
  }
}

// 1. A carga do script faz no máximo 1 chamada de Properties.
test('1. A carga do script faz no maximo 1 chamada de Properties', () => {
  const e = env();
  assert(e.totalOps() <= 1, `Carga do script fez ${e.totalOps()} operacoes, maximo permitido eh 1`);
});

// 2. Worker ocioso com 100 done recentes faz exatamente 1 getProperties e 0 de qualquer outra chamada.
test('2. Worker ocioso com 100 done recentes faz exatamente 1 getProperties e 0 de outra chamada', () => {
  const e = env();
  for (let i = 0; i < 100; i++) {
    e.c.PersistenciaBot.salvar('inbox_' + i, {update: {update_id: i}, status: 'done', created: e.c.Date.now()});
    e.c.PersistenciaBot.salvar('outbox_' + i + '_1', {status: 'done', created: e.c.Date.now(), method: 'sendMessage'});
  }
  e.resetOps();
  e.c.processarFilaTelegram();
  assert.equal(e.ops.getProperties, 1, `Esperava exatamente 1 getProperties, obteve ${e.ops.getProperties}`);
  assert.equal(e.ops.getProperty, 0, `Esperava 0 getProperty, obteve ${e.ops.getProperty}`);
  assert.equal(e.ops.setProperty, 0, `Esperava 0 setProperty, obteve ${e.ops.setProperty}`);
  assert.equal(e.ops.setProperties, 0, `Esperava 0 setProperties, obteve ${e.ops.setProperties}`);
  assert.equal(e.ops.deleteProperty, 0, `Esperava 0 deleteProperty, obteve ${e.ops.deleteProperty}`);
  assert.equal(e.totalOps(), 1, `Total esperado 1, obteve ${e.totalOps()}`);
});

// 3. Um 400 "can't parse entities" é reenviado sem parse_mode na mesma execução, o outbox termina done e são exatamente 2 fetches de sendMessage.
test('3. 400 cant parse entities eh reenviado sem parse_mode na mesma execucao e outbox termina done', () => {
  const e = env();
  let calls = 0;
  e.setFetch((url, payload) => {
    calls++;
    if (calls === 1) {
      assert(payload.parse_mode, 'Primeira chamada deve conter parse_mode');
      return {getResponseCode: () => 400, getContentText: () => '{"ok":false,"description":"Bad Request: can\'t parse entities"}'};
    }
    assert(!payload.parse_mode, 'Segunda chamada nao deve conter parse_mode');
    return {getResponseCode: () => 200, getContentText: () => '{"ok":true}'};
  });
  const res = e.c.entregarTelegramPersistente('sendMessage', {chat_id: 123, text: 'Texto com *erro', parse_mode: 'Markdown'});
  assert(res, 'Deve retornar true ao concluir');
  const sendMessages = e.sent.filter(s => s.url.endsWith('/sendMessage'));
  assert.equal(sendMessages.length, 2, `Esperava 2 fetches de sendMessage, obteve ${sendMessages.length}`);
  const outboxKeys = e.c.PersistenciaBot.chaves('outbox_');
  assert.equal(outboxKeys.length, 1);
  const outboxItem = e.c.PersistenciaBot.ler(outboxKeys[0]);
  assert.equal(outboxItem.status, 'done', 'Status no outbox deve ser done');
});

// 4. Um 429 com retry_after: 1 dorme (conte as chamadas a Utilities.sleep) e entrega na mesma execução.
test('4. 429 com retry_after 1 dorme e entrega na mesma execucao', () => {
  const e = env();
  let calls = 0;
  e.setFetch((url, payload) => {
    calls++;
    if (calls === 1) {
      return {getResponseCode: () => 429, getContentText: () => '{"ok":false,"parameters":{"retry_after":1}}'};
    }
    return {getResponseCode: () => 200, getContentText: () => '{"ok":true}'};
  });
  const res = e.c.entregarTelegramPersistente('sendMessage', {chat_id: 123, text: 'Teste 429'});
  assert(res, 'Deve retornar true');
  assert.equal(e.getSleepCount(), 1, `Deveria ter chamado sleep 1 vez, chamou ${e.getSleepCount()}`);
  const sendMessages = e.sent.filter(s => s.url.endsWith('/sendMessage'));
  assert.equal(sendMessages.length, 2, 'Deveria ter feito 2 fetches');
  const outboxKeys = e.c.PersistenciaBot.chaves('outbox_');
  const outboxItem = e.c.PersistenciaBot.ler(outboxKeys[0]);
  assert.equal(outboxItem.status, 'done', 'Status final deve ser done');
});

// 5. Um 429 com retry_after: 60 não dorme e fica pending com next no futuro. Com o tempo avançado para antes do next, processarCaixaSaida() não faz fetch.
test('5. 429 com retry_after 60 nao dorme e fica pending; processarCaixaSaida nao busca antes do next', () => {
  const e = env();
  e.setFetch(() => ({getResponseCode: () => 429, getContentText: () => '{"ok":false,"parameters":{"retry_after":60}}'}));
  const res = e.c.entregarTelegramPersistente('sendMessage', {chat_id: 123, text: 'Teste 429 60s'});
  assert.equal(e.getSleepCount(), 0, 'Nao deve chamar sleep para espera de 60s');
  assert(res, 'Retorna true/pending');
  const outboxKeys = e.c.PersistenciaBot.chaves('outbox_');
  const outboxItem = e.c.PersistenciaBot.ler(outboxKeys[0]);
  assert.equal(outboxItem.status, 'pending');
  assert(outboxItem.next > e.c.Date.now(), 'Next deve estar no futuro');

  e.advance(30000);
  const sentCountAntes = e.sent.length;
  e.c.processarCaixaSaida();
  assert.equal(e.sent.length, sentCountAntes, 'Nao deve tentar fetch antes do tempo de next expirar');
});

// 6. HTTP 500 e exceção de rede resultam em uncertain com exatamente 1 fetch (sem repetição).
test('6. HTTP 500 e excecao de rede resultam em uncertain com exatamente 1 fetch', () => {
  {
    const e = env();
    e.setFetch(() => ({getResponseCode: () => 500, getContentText: () => '{"ok":false}'}));
    e.c.entregarTelegramPersistente('sendMessage', {chat_id: 123, text: 'Erro 500'});
    assert.equal(e.sent.length, 1, 'HTTP 500 deve fazer exatamente 1 fetch');
    const outboxKeys = e.c.PersistenciaBot.chaves('outbox_');
    assert.equal(e.c.PersistenciaBot.ler(outboxKeys[0]).status, 'uncertain');
  }
  {
    const e = env();
    let fetches = 0;
    e.setFetch(() => { fetches++; throw new Error('Timeout de rede'); });
    e.c.entregarTelegramPersistente('sendMessage', {chat_id: 123, text: 'Falha de rede'});
    assert.equal(fetches, 1, 'Excecao de rede deve ter apenas 1 tentativa');
    const outboxKeys = e.c.PersistenciaBot.chaves('outbox_');
    assert.equal(e.c.PersistenciaBot.ler(outboxKeys[0]).status, 'uncertain');
  }
});

// 7. Quando o mock tem setProperties, salvar de um registro de 3 partes chama setProperties 1 vez, sem deleteAllOthers, e ler devolve o objeto íntegro, inclusive unicode 'á😊'.
test('7. salvar com setProperties grava em lote 1 vez sem deleteAllOthers e ler devolve integro com unicode', () => {
  const e = env();
  let setPropsCalls = 0;
  let passedDeleteAllOthers = null;
  const originalSetProperties = e.c.PropertiesService.getScriptProperties().setProperties;
  e.c.PropertiesService.getScriptProperties().setProperties = function(obj, del) {
    setPropsCalls++;
    passedDeleteAllOthers = del;
    return originalSetProperties.call(this, obj, del);
  };

  const unicodeTexto = 'á😊' + 'x'.repeat(3500);
  const objetoOriginal = {dados: unicodeTexto, numero: 42};

  e.c.PersistenciaBot.salvar('teste_multiparciais', objetoOriginal);
  assert.equal(setPropsCalls, 1, `setProperties deveria ter sido chamado 1 vez, foi chamado ${setPropsCalls} vezes`);
  assert(!passedDeleteAllOthers, 'deleteAllOthers nao pode ser true');

  const lido = e.c.PersistenciaBot.ler('teste_multiparciais');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(lido)), objetoOriginal, 'Objeto lido deve ser identico ao original');
  assert(lido.dados.includes('á😊'), 'Deve preservar caracteres unicode');
});

// 8. salvar continua lançando Orçamento global de armazenamento excedido no mesmo limite de antes.
test('8. salvar continua lancando Orcamento global de armazenamento excedido no limite', () => {
  const e = env();
  let salvos = 0;
  let erroDisparado = false;
  const chunk = 'a'.repeat(20000);
  for (let i = 0; i < 30; i++) {
    try {
      e.c.PersistenciaBot.salvar('bloco_' + i, {conteudo: chunk});
      salvos++;
    } catch (err) {
      if (err.message && err.message.includes('Orçamento global de armazenamento excedido')) {
        erroDisparado = true;
        break;
      }
      throw err;
    }
  }
  assert(erroDisparado, 'Deveria ter lancado erro de Orcamento global de armazenamento excedido');
  assert(salvos >= 15, `Deveria ter salvo varios blocos antes de estourar, salvou ${salvos}`);
});

console.log(pass + '/' + total + ' testes aprovados');
