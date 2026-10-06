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



const crypto=require('crypto');
function assinar(c, extras={}) {
 const dados={auth_date:String(Math.floor(c.Date.now()/1000)),query_id:'teste',user:JSON.stringify({id:123}),...extras};
 const chave=crypto.createHmac('sha256','WebAppData').update('fake').digest();
 const hash=crypto.createHmac('sha256',chave).update(Object.keys(dados).sort().map(k=>k+'='+dados[k]).join('\n')).digest('hex');
 return new URLSearchParams({...dados,hash}).toString();
}
function preparado(){
 const e=env();e.c.Utilities.newBlob=s=>({getBytes:()=>[...Buffer.from(s)]});
 e.c.Utilities.computeHmacSha256Signature=(valor,chave)=>[...crypto.createHmac('sha256',Buffer.from(chave)).update(Buffer.from(valor)).digest()];
 return e;
}
const tests=[
 ['sessão curta do botão autentica o painel e rejeita token inválido',()=>{
   const {c}=preparado();
   const url=c.obterUrlCockpit(123), token=new URL(url).searchParams.get('session');
   assert.match(token,/^ck_[a-f0-9]{64}$/);
   assert.equal(c.cockpitAutorizar_(token),'123');
   assert.throws(()=>c.cockpitAutorizar_(token.slice(0,-1)+'f'));
   assert.throws(()=>c.obterUrlCockpit(456));
 }],
 ['sessão assinada e dados reais sem reescrever SOAP',()=>{
   const {c}=preparado();const estado=c.definirModoBot(123,'soap','Relato original');
   const texto='🩺 SOAP integral\n\nAlertas e pendências preservados';c.salvarSoapCockpit_(123,estado,texto);
   c.EnfermariaService.atualizarLeito('7','Dados do leito real');const r=c.cockpitConsultar(assinar(c));
   assert.equal(r.soap,texto);assert.equal(r.leitos.length,1);assert.equal(r.leitos[0].numero,'7');
   c.definirModoBot(123,'soap','Complemento novo');assert.equal(c.cockpitConsultar(assinar(c)).soap,'');
 }],
 ['sem sessão adulterada expirada outro usuário ou chaves duplicadas são recusados',()=>{
   const {c}=preparado();for(const input of ['',assinar(c).replace('query_id=teste','query_id=alterado'),assinar(c,{auth_date:'1'}),assinar(c,{user:JSON.stringify({id:456})}),assinar(c)+'&auth_date=0',assinar(c,{auth_date:String(c.Date.now()/1000+100)})]) assert.throws(()=>c.cockpitConsultar(input));
 }],
 ['preceptor recebe dados canônicos e rejeita revisão antiga e worker ocupado',()=>{
   const {c}=preparado();const st=c.definirModoBot(123,'soap','Dados canônicos');let entrada;
   c.gerarCriticaSocraticaPreceptor=d=>{entrada=d;return 'Pergunta real?'};
   assert.equal(c.cockpitPreceptor(assinar(c),st.revision),'Pergunta real?');assert.equal(entrada,st.data);
   assert.throws(()=>c.cockpitPreceptor(assinar(c),'antiga'));
   c.LockService.getUserLock=()=>({tryLock:()=>false,releaseLock(){}});assert.throws(()=>c.cockpitPreceptor(assinar(c),st.revision));
 }],
 ['status versionado usa o serviço compartilhado',()=>{
   const {c}=preparado();c.EnfermariaService.atualizarLeito('1','Paciente real');const l=c.EnfermariaService.obterLeito('1');
   c.cockpitStatusLeito(assinar(c),'1',l.version,'vigilancia');assert(c.EnfermariaService.obterLeito('1').status.includes('Vigilância'));
   assert.throws(()=>c.cockpitStatusLeito(assinar(c),'1',l.version,'estavel'));
   assert.throws(()=>c.cockpitStatusLeito(assinar(c),'1','', 'estavel'));
 }],
 ['passagem usa leitos reais e motor existente',()=>{
   const {c}=preparado();assert.throws(()=>c.cockpitPassagem(assinar(c)));
   c.EnfermariaService.atualizarLeito('3','Evolução integral');let entrada;c.gerarPassagemPlantaoSBAR=d=>{entrada=d;return 'SBAR real'};
   assert.equal(c.cockpitPassagem(assinar(c)),'SBAR real');assert(entrada.includes('Evolução integral'));
 }],
 ['artefato GAS não expõe funções clínicas por RPC e exige credenciais',()=>{
   const contexto={console};vm.createContext(contexto);vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../ultra_rotina_gas.js'),'utf8'),contexto);
   for(const name of ['modoBot','gerarSOAPComIA','processarMensagemTexto','salvarSoapCockpit_','cockpitAutorizar_']) assert.equal(typeof contexto[name],'undefined');
   assert.equal(typeof contexto.cockpitConsultar,'function');assert.throws(()=>contexto.cockpitConsultar(''));
   assert.throws(()=>contexto.processarFilaTelegram());assert.throws(()=>contexto.instalarTodosOsAcionadores());
 }]
];

tests.push(
 ['calculadoras retornam exatamente resultados completos do bot',()=>{
   const {c}=preparado(), auth=assinar(c);
   const pares=[
    ['dva',{droga:'nora',peso:'70'},()=>c.CalculadorasClinicas.drogasVasoativas('nora','70','padrao')],
    ['dva',{droga:'vaso',peso:''},()=>c.CalculadorasClinicas.drogasVasoativas('vaso','','padrao')],
    ['sri',{peso:'80',cenario:'choque'},()=>c.CalculadorasClinicas.sequenciaRapidaIntubacao('80','choque')],
    ['sri',{peso:'80',cenario:'asma'},()=>c.CalculadorasClinicas.sequenciaRapidaIntubacao('80','asma')],
    ['crcl',{creatinina:'1.4',peso:'70',idade:'65',sexo:'f'},()=>c.CalculadorasClinicas.cockcroftGault('1.4','70','65',true)],
    ['gaso',{ph:'7.28',pco2:'28',hco3:'13'},()=>c.CalculadorasClinicas.gasometria('7.28','28','13')]
   ];
   for(const [tipo,dados,original] of pares) assert.equal(JSON.stringify(c.cockpitCalcular(auth,tipo,dados)),JSON.stringify(original()));
 }],
 ['calculadoras não preenchem campos ausentes nem aceitam números fora do intervalo',()=>{
   const {c}=preparado(), auth=assinar(c);
   for(const [tipo,dados] of [['dva',{droga:'nora',peso:''}],['sri',{cenario:'padrao',peso:'0'}],['crcl',{creatinina:'1',peso:'70',idade:'65',sexo:''}],['gaso',{ph:'',pco2:'28',hco3:'13'}],['gaso',{ph:'99',pco2:'28',hco3:'13'}]]) assert.equal(c.cockpitCalcular(auth,tipo,dados).ok,false);
   assert.throws(()=>c.cockpitCalcular(auth,'constructor',{}));
   assert.throws(()=>c.cockpitCalcular('', 'gaso', {}));
 }],
 ['REMUME usa fonte configurada sem truncar catálogo nem acrescentar posologia',()=>{
   const {c,props}=preparado();props.SPREADSHEET_ID_REMUME='planilha-ficticia';c.ConfigService.invalidar();let args;
   const linhas=Array.from({length:180},(_,i)=>'Apresentação '+i+' 10 mg');
   linhas.push('<img src=x onerror=alert(1)>');
   c.obterPlanilha=(...a)=>{args=a;return linhas.join('\n')};
   const r=c.cockpitRemume(assinar(c));assert.equal(JSON.stringify(r.itens),JSON.stringify(linhas));
   assert.deepEqual(args,['remume','planilha-ficticia',false]);
   c.obterPlanilha=()=>{throw Error('indisponível')};assert.throws(()=>c.cockpitRemume(assinar(c)),/indisponível/);
   assert.throws(()=>c.cockpitRemume(''));
 }],
 ['cockpitConversar gerencia fluxo conversacional, chips clínicos e autenticação',()=>{
   const {c}=preparado(), auth=assinar(c);
   assert.throws(()=>c.cockpitConversar('', {acao:'enviar', texto:'olá'}));
   assert.throws(()=>c.cockpitConversar(auth.replace('query_id=teste','query_id=fake'), {acao:'enviar', texto:'olá'}));
   c.gerarSOAPComIA = (entrada, opts) => 'SOAP IA: ' + entrada + (opts && opts.fecharPlano ? ' [PLANO FECHADO]' : '');
   c.gerarCriticaSocraticaPreceptor = entrada => 'Crítica IA sobre ' + entrada;
   c.gerarPrescricaoMedicaIA = entrada => 'Prescrição IA: ' + entrada;
   const res1 = c.cockpitConversar(auth, {acao:'enviar', texto:'Paciente 45a com tosse e febre'});
   assert.equal(res1.sucesso, true);
   assert.equal(res1.acao, 'enviar');
   assert(res1.soap.includes('Paciente 45a com tosse e febre'));
   assert(res1.revision > 0);
   const resEf = c.cockpitConversar(auth, {acao:'ef_normal'});
   assert.equal(resEf.sucesso, true);
   assert(resEf.soap.includes('Exame físico geral e segmentar completo sem alterações'));
   const resPlano = c.cockpitConversar(auth, {acao:'plano'});
   assert.equal(resPlano.sucesso, true);
   assert(resPlano.soap.includes('[PLANO FECHADO]'));
   const resPreceptor = c.cockpitConversar(auth, {acao:'preceptor'});
   assert.equal(resPreceptor.sucesso, true);
   assert(resPreceptor.resposta.includes('Crítica IA sobre'));
   const resPresc = c.cockpitConversar(auth, {acao:'prescricao'});
   assert.equal(resPresc.sucesso, true);
   assert(resPresc.resposta.includes('Prescrição IA:'));
   const resNovo = c.cockpitConversar(auth, {acao:'novo'});
   assert.equal(resNovo.sucesso, true);
   assert.equal(resNovo.soap, '');
   assert.equal(c.modoBot(123), null);
 }]
);
for(const [nome,fn] of tests){fn();console.log('OK '+nome)}
console.log(tests.length+' cenários aprovados');
