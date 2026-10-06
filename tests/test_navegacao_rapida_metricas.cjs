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



function req(update, secret='secret') {return {parameter:{secret}, postData:{contents:JSON.stringify(update)}}}
function msg(id,text){return {update_id:id,message:{chat:{id:123},text}}}
function callback(id,data){return {update_id:id,callback_query:{id:'cb'+id,data,message:{chat:{id:123},message_id:20}}}}
const tests = [
 ['menu responde com worker ocupado e preserva caso e pedido clínico',()=>{
   const {c,sent}=env();c.definirModoBot(123,'soap','Relato clínico intacto');const original=c.modoBot(123).revision;
   c.LockService.getUserLock=()=>({tryLock:()=>false,releaseLock(){}});
   c.doPost(req(msg(1,'Dados adicionais')));assert.equal(c.PersistenciaBot.ler('inbox_1').status,'pending');
   c.doPost(req(msg(2,'/menu')));assert(sent.some(s=>s.payload.text&&s.payload.text.includes('Central de Comandos')));
   assert.equal(c.PersistenciaBot.ler('inbox_2').status,'done');assert.equal(c.modoBot(123).revision,original);
   assert.equal(c.PersistenciaBot.ler('inbox_1').status,'pending');
 }],
 ['menus funcionam com configuração assíncrona',()=>{
   const {c,props,sent}=env();props.TELEGRAM_ASYNC_WORKER='true';c.doPost(req(callback(3,'ux:dvamenu')));
   assert(sent.some(s=>s.url.endsWith('/editMessageText')));assert.equal(c.PersistenciaBot.ler('inbox_3').status,'done');
 }],
 ['update duplicado e reserva concorrente não repetem tela',()=>{
   const {c,sent}=env();c.doPost(req(msg(1,'/menu')));const n=sent.length;c.doPost(req(msg(1,'/menu')));assert.equal(sent.length,n);
   const u=msg(2,'/menu');c.enfileirarUpdate(u);const job=c.reservarPedidoTelegram('inbox_2');
   assert(job);assert.equal(c.reservarPedidoTelegram('inbox_2'),null);c.processarNavegacaoRapida(u);assert.equal(sent.length,n);
   c.executarPedidoTelegram('inbox_2',job);assert(sent.length>n);
 }],
 ['autenticação antecede caminho rápido',()=>{
   const {c,sent}=env();c.doPost(req(msg(1,'/menu'),'errado'));
   const u=msg(2,'/menu');u.message.chat.id=999;c.doPost(req(u));assert.equal(sent.length,0);assert.equal(c.PersistenciaBot.chaves('inbox_').length,0);
 }],
 ['ações clínicas e chaves herdadas nunca passam pela via rápida',()=>{
   const {c}=env();for(const text of ['/novo','/cancelar','/soap teste','constructor','toString','__proto__','/menu dados']) assert.equal(c.destinoNavegacaoRapida(msg(1,text)),null);
   for(const data of ['ux:soap:plano','ux:novo:soap','ux:usar:rx','ux:alta:1','ux:ef_inc:neuro','ux:hub:rx','constructor']) assert.equal(c.destinoNavegacaoRapida(callback(1,data)),null);
 }],
 ['menu ultrapassa entrega pendente comum sem ultrapassar bloqueio 429',()=>{
   const {c,sent}=env();c.PersistenciaBot.salvar('outbox_antiga',{status:'pending',created:0,next:0,attempts:0,method:'sendMessage',payload:{chat_id:123,text:'antiga'}});
   c.doPost(req(msg(1,'/menu')));assert(sent.length>0);assert.equal(c.PersistenciaBot.ler('outbox_antiga').status,'pending');
   const bloqueio=c.PersistenciaBot.ler('outbox_antiga');bloqueio.next=c.Date.now()+60000;c.PersistenciaBot.salvar('outbox_antiga',bloqueio);
   const n=sent.length;c.doPost(req(msg(2,'/menu')));assert.equal(sent.length,n);assert.equal(c.PersistenciaBot.ler('inbox_2').status,'awaiting_delivery');
 }],
 ['falha incerta não é reenviada ao repetir navegação',()=>{
   const {c}=env();let n=0;c.UrlFetchApp.fetch=()=>{n++;throw Error('timeout')};
   c.doPost(req(msg(1,'/menu')));c.doPost(req(msg(1,'/menu')));assert.equal(n,1);assert.equal(c.PersistenciaBot.ler('inbox_1').status,'uncertain');
 }],
 ['worker recupera menu enfileirado se webhook não o executou',()=>{
   const {c}=env();c.enfileirarUpdate(msg(1,'/menu'));c.processarFilaTelegram();assert.equal(c.PersistenciaBot.ler('inbox_1').status,'done');
 }],
 ['tempos separam espera geração e envio sem incluir texto clínico',()=>{
   const {c,advance}=env();c.enfileirarUpdate(msg(1,'SEGREDO_CLINICO'));advance(1200);
   c.processarMensagemTexto=()=>{c.medirEtapaBot('geracao_clinica',()=>advance(2400));c.enviarMensagemParaChat(123,'Resposta');};
   c.UrlFetchApp.fetch=()=>{advance(75);return {getResponseCode:()=>200,getContentText:()=>'{"ok":true}'}};
   c.processarFilaTelegram();const job=c.PersistenciaBot.ler('inbox_1');
   assert.equal(job.metricas.esperaMs,1200);assert.equal(job.metricas.etapas.geracao_clinica.ms,2400);
   assert.equal(job.metricas.processamentoMs,2475);assert(!JSON.stringify(job.metricas).includes('SEGREDO'));
   const out=c.PersistenciaBot.ler(job.entregas[0]);assert.equal(out.envioMs,75);assert(out.completedAt>=out.created);
 }],
 ['etapa que lança erro mantém métrica e pedido falho',()=>{
   const {c,advance}=env();c.processarMensagemTexto=()=>c.medirEtapaBot('geracao_clinica',()=>{advance(50);throw Error('falha')});
   c.doPost(req(msg(1,'teste')));const job=c.PersistenciaBot.ler('inbox_1');assert.equal(job.status,'failed');
   assert.equal(job.metricas.etapas.geracao_clinica.falhas,1);assert.equal(job.metricas.etapas.geracao_clinica.ms,50);assert.equal(c.EXECUCAO_ATUAL,null);
 }],
 ['ordem entre solicitações clínicas permanece FIFO',()=>{
   const {c}=env();const ordem=[];c.processarMensagemTexto=m=>ordem.push(m.text);
   c.enfileirarUpdate(msg(2,'segundo'));c.enfileirarUpdate(msg(1,'primeiro'));c.processarFilaTelegram();assert.deepEqual(ordem,['primeiro','segundo']);
 }]
];
for(const [nome,fn] of tests){fn();console.log('OK '+nome)}
console.log(tests.length+' cenários aprovados');
