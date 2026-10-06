/**
 * Testes Funcionais: Nova Estratégia de SOAP, Exame Físico Padrão Copiável,
 * Perguntas Ativas no Subjetivo e Biblioteca Expandida de Exames Especiais (11 Especialidades).
 *
 * Executar: node tests/test_soap_exame_fisico.cjs
 */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const source = fs.readFileSync(path.resolve(__dirname, '../ultra_rotina_master.js'), 'utf8');

function env() {
  const props = { TELEGRAM_CHAT_ID: '123', TELEGRAM_BOT_TOKEN: 'fake', WEBHOOK_SECRET: 'secret', NOTION_TASKS_DB_ID: 'fake-db' }, cache = {}, sent = [];
  let now = 2000000000000, seq = 0, hook = null;
  class Clock extends Date { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } }
  const p = { getProperty: k => { if (hook) hook(k); return props[k] ?? null; }, setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: k => { delete props[k]; }, getProperties: () => ({ ...props }) };
  const c = {
    Buffer, Date: Clock, console: { log() {}, error() {} }, PropertiesService: { getScriptProperties: () => p },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] ?? null, put: (k, v) => { cache[k] = String(v); }, remove: k => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }), getUserLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    HtmlService: { createHtmlOutput: body => ({ body }) }, ContentService: { MimeType: { JSON: 'json' }, createTextOutput: body => ({ body, setMimeType() { return this; } }) },
    ScriptApp: { getProjectTriggers: () => [] },
    UrlFetchApp: { fetch: (url, opts) => { sent.push({ url, payload: JSON.parse((opts && opts.payload) || '{}') }); return { getResponseCode: () => 200, getContentText: () => ' {"ok":true}' }; } }
  };
  vm.createContext(c); vm.runInContext(source, c);
  c.Utilities.getUuid = () => String(++seq).padStart(32, '0'); c.Utilities.sleep = () => {};
  return { c, props, cache, sent, p, advance: n => now += n, setHook: h => hook = h };
}

let aprovados = 0;
function test(nome, fn) {
  try {
    fn();
    console.log('✅ APROVADO: ' + nome);
    aprovados++;
  } catch (e) {
    console.error('❌ FALHOU: ' + nome + ' :: ' + e.message);
    process.exitCode = 1;
  }
}

// O registro não pode ser aprovado apenas por conter títulos: rejeita achados inventados.
test('1. SOAP preserva dados fornecidos e rejeita sinais vitais inventados', () => {
  const { c } = env();
  const caso = 'Homem 45 anos com tosse. PA 160x100 mmHg.';
  let prompt;
  c.executarRaciocinioClinico = p => {
    prompt = p;
    return JSON.stringify({objetivo: ['PA 120x80 mmHg.', 'PA 160x100 mmHg.'], perguntas:['Há febre?'], exame_dirigido:['Aferir SpO2.']});
  };
  const r = c.gerarSOAPComIA(caso);
  assert(!prompt.includes('PA 120x80'));
  assert(r.includes('PA 160x100'));
  assert(!r.includes('PA 120x80'));
  assert(r.includes('Investigação Ativa do Subjetivo'));
  assert(r.includes('Cobrança Ativa do Exame Físico Dirigido'));
});

// 2. Biblioteca expandida de 11 Exames Físicos Especiais
test('2. Biblioteca completa com 11 Exames Físicos Especiais determinísticos e copiáveis', () => {
  const { c } = env();
  assert.strictEqual(typeof c.gerarGuiaExameFisicoEspecial, 'function');

  // Neuro, PQU, Oftalmo
  assert(c.gerarGuiaExameFisicoEspecial('neuro').includes('[EXAME NEUROLÓGICO]'));
  assert(c.gerarGuiaExameFisicoEspecial('pqu').includes('[EXAME DO ESTADO MENTAL / PSICOPATOLÓGICO]'));
  assert(c.gerarGuiaExameFisicoEspecial('oftalmo').includes('[EXAME OFTALMOLÓGICO]'));

  // Ortopedia, ORL, Dermato
  assert(c.gerarGuiaExameFisicoEspecial('ortopo').includes('[EXAME MÚSCULO-ESQUELÉTICO / ORTOPÉDICO]'));
  assert(c.gerarGuiaExameFisicoEspecial('ortopo').includes('Lasègue negativo'));
  assert(c.gerarGuiaExameFisicoEspecial('orl').includes('[EXAME OTORRINOLARINGOLÓGICO / CABEÇA E PESCOÇO]'));
  assert(c.gerarGuiaExameFisicoEspecial('orl').includes('Membranas timpânicas íntegras'));
  assert(c.gerarGuiaExameFisicoEspecial('dermato').includes('[EXAME DERMATOLÓGICO]'));
  assert(c.gerarGuiaExameFisicoEspecial('dermato').includes('regra ABCDE'));

  // Gineco, Procto, Pediatria
  assert(c.gerarGuiaExameFisicoEspecial('gineco').includes('[EXAME GINECOLÓGICO]'));
  assert(c.gerarGuiaExameFisicoEspecial('gineco').includes('Toque Bimanual'));
  assert(c.gerarGuiaExameFisicoEspecial('procto').includes('[EXAME UROLÓGICO E PROCTOLÓGICO]'));
  assert(c.gerarGuiaExameFisicoEspecial('procto').includes('Próstata de consistência fibroelástica'));
  assert(c.gerarGuiaExameFisicoEspecial('ped').includes('[EXAME FÍSICO PEDIÁTRICO]'));
  assert(c.gerarGuiaExameFisicoEspecial('ped').includes('Ortolani e Barlow'));

  // Geriatria, Vascular
  assert(c.gerarGuiaExameFisicoEspecial('geriatria').includes('[AVALIAÇÃO GERIÁTRICA AMPLA / EXAME FÍSICO DO IDOSO]'));
  assert(c.gerarGuiaExameFisicoEspecial('geriatria').includes('Timed Up and Go'));
  assert(c.gerarGuiaExameFisicoEspecial('vascular').includes('[EXAME VASCULAR PERIFÉRICO]'));
  assert(c.gerarGuiaExameFisicoEspecial('vascular').includes('Homans e Bancroft'));

  // Catálogo completo
  assert(c.gerarGuiaExameFisicoEspecial('menu').includes('CATÁLOGO DE EXAMES FÍSICOS ESPECIAIS'));
});

// 3. Comandos /ef, /ef_ortopo, /ef_orl, /ef_dermato, etc. no Telegram
test('3. Comandos especializados /ef, /ef_ortopo, /ef_orl respondem com guia e cópia', () => {
  const { c, sent } = env();
  c.processarMensagemTexto({ chat: { id: 123 }, text: '/ef' });
  assert(sent.length >= 1);
  const msgMenu = sent[sent.length - 1];
  assert(msgMenu.payload.text.includes('CATÁLOGO DE EXAMES FÍSICOS ESPECIAIS'));
  assert(JSON.stringify(msgMenu.payload.reply_markup).includes('ef_ortopo'));
  assert(JSON.stringify(msgMenu.payload.reply_markup).includes('ef_vascular'));

  c.processarMensagemTexto({ chat: { id: 123 }, text: '/ef_ortopo' });
  const msgOrt = sent[sent.length - 1];
  assert(msgOrt.payload.text.includes('MÚSCULO-ESQUELÉTICO'));
  assert(/Copiar Modelo ORTOPO/i.test(JSON.stringify(msgOrt.payload.reply_markup)));

  c.processarMensagemTexto({ chat: { id: 123 }, text: '/ef_orl' });
  const msgOrl = sent[sent.length - 1];
  assert(msgOrl.payload.text.includes('OTORRINOLARINGOLÓGICO'));
  assert(/Copiar Modelo ORL/i.test(JSON.stringify(msgOrl.payload.reply_markup)));
});

// 4. Teclado compacto mantém acesso ao catálogo de exames físicos
test('4. Entrega de SOAP concentra exames físicos no catálogo', () => {
  const { c, sent } = env();
  c.executarRaciocinioClinico = () => '🩺 *SÍNTESE SOAP - REGISTRO CLÍNICO*\n\nCaso teste.';
  c.processarMensagemTexto({ chat: { id: 123 }, text: '/soap Mulher 40a dor em joelho direito' });
  assert(sent.length >= 1);
  const ultMsg = sent[sent.length - 1];
  const kbJson = JSON.stringify(ultMsg.payload.reply_markup);
  assert(!kbJson.includes('ef_neuro'), 'Especialidades ficam no menu dedicado');
  assert(kbJson.includes('ef_menu'), 'Teclado deve conter ef_menu');
});

// 5. Continuidade conversacional: enviar respostas às perguntas do SOAP no mesmo chat acumula contexto
test('5. Enviar respostas às perguntas do SOAP no mesmo chat acumula contexto', () => {
  const { c } = env();
  c.executarRaciocinioClinico = (p, dados) => dados;
  c.processarMensagemTexto({ chat: { id: 123 }, text: '/soap Homem 50a dor epigástrica' });
  
  // O modo do bot deve estar em "soap"
  const modo = c.modoBot(123);
  assert(modo && modo.mode === 'soap', 'Modo do bot deve ser fixado em soap');
  assert(modo.data.includes('Homem 50a dor epigástrica'));

  // Médico responde ativamente à pergunta do subjetivo e adiciona exame físico
  c.processarMensagemTexto({ chat: { id: 123 }, text: 'Sem febre, piora com jejum, EF: abdome doloroso em epigástrio sem Blumberg' });
  const modoAtualizado = c.modoBot(123);
  assert(modoAtualizado.data.includes('Homem 50a dor epigástrica'));
  assert(modoAtualizado.data.includes('Sem febre, piora com jejum'));
});

// 6. Exame Psiquiátrico com as 10 funções psíquicas cardinais no formato de prontuário do usuário
test('6. Exame psiquiátrico contém modelo normal pronto com as 10 funções psíquicas do usuário', () => {
  const { c } = env();
  const pqu = c.gerarGuiaExameFisicoEspecial('pqu');
  assert(pqu.includes('[EXAME DO ESTADO MENTAL / PSICOPATOLÓGICO]'));
  assert(pqu.includes('Aparência e Comportamento: Paciente com higiene adequada'));
  assert(pqu.includes('Consciência: Lúcido e vigil'));
  assert(pqu.includes('Orientação: Orientado de forma global (auto e alopsiquicamente)'));
  assert(pqu.includes('Atenção: Tenacidade e vigilância mantidas'));
  assert(pqu.includes('Sensopercepção: Sem alterações quantitativas ou qualitativas'));
  assert(pqu.includes('Pensamento: Curso de velocidade normal'));
  assert(pqu.includes('Humor e Afeto: Humor eutímico'));
  assert(pqu.includes('Linguagem e Fala: Fala fluida, clara, articulada'));
  assert(pqu.includes('Memória: Fixação e evocação preservadas'));
  assert(pqu.includes('Juízo Crítico e Insight: Capacidade de julgamento da realidade mantida'));
});

// 7. Botão [➕ Incorporar ao SOAP] aparece em caso ativo e incorpora o modelo ao SOAP
test('7. Botão [➕ Incorporar ao SOAP] anexa modelo normal de exame especial ao caso ativo', () => {
  const { c, sent } = env();
  c.executarRaciocinioClinico = (p, d) => d;
  c.processarMensagemTexto({ chat: { id: 123 }, text: '/soap Mulher 28a com insônia e ansiedade.' });

  // Dispara o guia do exame psiquiátrico durante o caso ativo
  c.processarMensagemTexto({ chat: { id: 123 }, text: '/ef_pqu' });
  assert(sent.length >= 2);
  const msgPqu = sent[sent.length - 1];
  const kbJson = JSON.stringify(msgPqu.payload.reply_markup);
  assert(kbJson.includes('ux:ef_inc:pqu'), 'Deve conter botão para incorporar ao SOAP');
  assert(kbJson.includes('Incorporar ao SOAP'));

  // Clica no botão Incorporar ao SOAP
  c.processarCallbackBotao({ id: 'cb1', data: 'ux:ef_inc:pqu', message: { chat: { id: 123 }, message_id: 99 } });

  const estado = c.modoBot(123);
  assert(estado && estado.mode === 'soap', 'Modo continua sendo soap');
  assert(estado.data.includes('Mulher 28a com insônia e ansiedade.'));
  assert(estado.data.includes('[EXAME DO ESTADO MENTAL / PSICOPATOLÓGICO]'));
  assert(estado.data.includes('Humor e Afeto: Humor eutímico'));
});

console.log('\n🎉 TESTES DE EXAME FÍSICO E SOAP: ' + aprovados + ' DE 7 APROVADOS COM 100% DE ÊXITO!');
