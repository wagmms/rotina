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


const cb = data => ({id:'cb', data, message:{chat:{id:123}, message_id:10}});
const tests = [
 ['cache perdido e pausa não apagam atendimento', () => {
   const {c,cache,advance}=env(); const st=c.definirModoBot(123,'soap','Relato integral 🩺 com alergia');
   Object.keys(cache).forEach(k=>delete cache[k]); advance(86400000);
   assert.equal(c.modoBot(123).data,st.data); assert.equal(c.modoBot(123).revision,st.revision);
 }],
 ['novo caso e alterações invalidam versão, leitura não invalida', () => {
   const {c}=env(); const a=c.definirModoBot(123,'soap','Caso A');
   assert.equal(c.definirModoBot(123,'soap','Caso A').revision,a.revision);
   const b=c.definirModoBot(123,'rx','Caso A'); assert.equal(b.caseId,a.caseId);assert.notEqual(b.revision,a.revision);
   const novo=c.definirModoBot(123,'soap','Caso A',true);assert.notEqual(novo.caseId,a.caseId);
 }],
 ['encerramento prevalece sobre cache antigo', () => {
   const {c,cache}=env(); c.definirModoBot(123,'soap','Caso encerrado'); const antigo=cache.modo_123;
   c.limparEstadoBot(123);cache.modo_123=antigo;cache.ctx_123='Caso encerrado';
   assert.equal(c.modoBot(123),null);assert.equal(c.obterContextoClinicoBot(123),'');
 }],
 ['migração preserva legado válido', () => {
   const {c,cache}=env();cache.modo_123=JSON.stringify({mode:'soap',data:'Legado',expires:2000000900000});
   assert.equal(c.modoBot(123).data,'Legado');delete cache.modo_123;assert.equal(c.modoBot(123).data,'Legado');
 }],
 ['legado expirado não ressuscita', () => {
   const {c,cache}=env();cache.modo_123=JSON.stringify({mode:'soap',data:'Velho',expires:1});cache.ctx_123='Velho';
   assert.equal(c.modoBot(123),null);assert.equal(c.obterContextoClinicoBot(123),'');
 }],
 ['falha de gravação preserva estado anterior e auxiliares', () => {
   const {c,p,cache}=env();const a=c.definirModoBot(123,'soap','Original');cache.pending_123='rx';
   const gravar=p.setProperty;p.setProperty=(k,v)=>{if(k==='atendimento_123')throw Error('quota');gravar(k,v)};
   assert.throws(()=>c.definirModoBot(123,'soap','Alterado'),/quota/);
   assert.equal(c.modoBot(123).revision,a.revision);assert.equal(cache.pending_123,'rx');
 }],
 ['falha de leitura não retorna atendimento vazio', () => {
   const {c,setHook}=env();c.definirModoBot(123,'soap','Original');setHook(()=>{throw Error('indisponivel')});
   assert.throws(()=>c.modoBot(123),/indisponivel/);
 }],
 ['botão antigo ou sem versão não chama IA', () => {
   const {c}=env();const a=c.definirModoBot(123,'soap','Caso inicial');let n=0;c.processarEEntregarIA=()=>n++;
   c.definirModoBot(123,'soap','Caso atualizado');c.tratarCallbackUX(cb('ux:soap:plano:'+a.revision));
   c.tratarCallbackUX(cb('ux:soap:plano'));assert.equal(n,0);
   c.tratarCallbackUX(cb('ux:soap:plano:'+c.modoBot(123).revision));assert.equal(n,1);
 }],
 ['botão de exame normal antigo não abre confirmação', () => {
   const {c,cache}=env();const a=c.definirModoBot(123,'soap','Caso inicial');
   c.definirModoBot(123,'soap','Novo caso',true);c.tratarCallbackUX(cb('ux:soap:ef_normal:'+a.revision));
   assert(!cache.efconfirm_123);
 }],
 ['teclado entregue usa revisão de origem e respeita 64 bytes', () => {
   const {c,sent}=env();const a=c.definirModoBot(123,'soap','Caso inicial');
   c.processarEEntregarIA(123,()=>{c.definirModoBot(123,'soap','Atualizado');return 'SOAP integral'},a.data,'soap');
   const botoes=sent[sent.length-1].payload.reply_markup.inline_keyboard.flat();
   assert(botoes.some(b=>b.callback_data==='ux:soap:plano:'+a.revision));
   botoes.forEach(b=>{if(b.callback_data)assert(Buffer.byteLength(b.callback_data)<=64)});
 }],
 ['comando de navegação suspende modo sem apagar caso', () => {
   const {c}=env();c.definirModoBot(123,'soap','Caso inicial');c.tratarEntradaUX({chat:{id:123},text:'/manual'});
   assert.equal(c.modoBot(123).mode,'');assert.equal(c.obterContextoClinicoBot(123),'Caso inicial');
 }],
 ['casos de chats distintos não compartilham estado', () => {
   const {c}=env();c.definirModoBot(123,'soap','Caso A');c.definirModoBot(456,'soap','Caso B');c.limparEstadoBot(123);
   assert.equal(c.modoBot(456).data,'Caso B');
 }]
];
for (const [nome,fn] of tests) {fn();console.log('OK '+nome)}
console.log(tests.length+' cenários aprovados');
