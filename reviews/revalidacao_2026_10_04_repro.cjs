/* Reproduções independentes: PASSAR confirma defeito presente, não segurança.
 * Apenas mocks em memória, sem rede ou serviços reais.
 */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const source = fs.readFileSync(process.argv[2] || path.resolve(__dirname, '../ultra_rotina_master.js'), 'utf8');

function env() {
  const props = {TELEGRAM_CHAT_ID:'123', TELEGRAM_BOT_TOKEN:'fake', WEBHOOK_SECRET:'secret', NOTION_TASKS_DB_ID:'fake-db'}, cache={}, sent=[];
  let now=2000000000000, seq=0, hook=null;
  class Clock extends Date { constructor(...a){super(...(a.length?a:[now]));} static now(){return now;} }
  const p={getProperty:k=>{if(hook)hook(k);return props[k]??null;},setProperty:(k,v)=>{props[k]=String(v);},deleteProperty:k=>{delete props[k];},getProperties:()=>({...props})};
  const c={Buffer, Date:Clock, console:{log(){},error(){}}, PropertiesService:{getScriptProperties:()=>p},
    CacheService:{getScriptCache:()=>({get:k=>cache[k]??null,put:(k,v)=>{cache[k]=String(v);},remove:k=>{delete cache[k];}})},
    LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}}),getUserLock:()=>({tryLock:()=>true,releaseLock(){}})},
    HtmlService:{createHtmlOutput:body=>({body})}, ContentService:{MimeType:{JSON:'json'},createTextOutput:body=>({body,setMimeType(){return this;}})},
    ScriptApp:{getProjectTriggers:()=>[]},
    UrlFetchApp:{fetch:(url,opts)=>{sent.push({url,payload:JSON.parse((opts&&opts.payload)||'{}')});return {getResponseCode:()=>200,getContentText:()=>' {"ok":true}'};}}};
  vm.createContext(c);vm.runInContext(source,c);
  c.Utilities.getUuid=()=>String(++seq).padStart(32,'0'); c.Utilities.sleep=()=>{};
  return {c,props,cache,sent,p,advance:n=>now+=n,setHook:h=>hook=h};
}

const req=(text,id=1)=>({parameter:{secret:'secret'},postData:{contents:JSON.stringify({update_id:id,message:{chat:{id:123},text}})}});
const cb=data=>({id:'cb',data,message:{chat:{id:123},message_id:1}});
let total=0, failures=0;
function test(name,fn){try {fn();console.log('REPRODUZIDO: '+name);total++;} catch(e){console.error('NÃO REPRODUZIDO: '+name+' :: '+e.message);failures++;}}

test('R01 MELD: parser troca creatinina e INR',()=>{
 const {c}=env(); const direct=c.CalculadorasClinicas.meld(2,4,1,132,false);
 const parsed=c.tentarCalcularDeterministico('MELD bili 2 cr 4 inr 1 na 132');
 assert(direct.ok); assert(!parsed.includes(direct.principal));
 console.log('  Direto: '+direct.principal+'; parser: '+parsed.replace(/\n/g,' '));
});
test('R02 MELD: sódio por extenso lança TypeError',()=>{
 const {c}=env();assert.throws(()=>c.tentarCalcularDeterministico('MELD bili 2 cr 4 inr 1 sódio 132'),/replace/);
});
test('R03 MELD: sem diálise ativa dialise=true',()=>{
 const {c}=env();let args;c.CalculadorasClinicas.meld=(...a)=>{args=a;return {ok:true,principal:'teste'};};
 c.tentarCalcularDeterministico('MELD bili 2 cr 1 inr 1 sem diálise');assert.equal(args[4],true);
});
test('R04 Clearance: sexo ausente é assumido masculino',()=>{
 const {c}=env();let args;c.CalculadorasClinicas.cockcroftGault=(...a)=>{args=a;return {ok:true,principal:'teste'};};
 assert(c.tentarCalcularDeterministico('clearance Cr 1 peso 70 idade 60'));assert.equal(args[3],false);
});
test('R05 /calc CHA2DS2-VASc continua encaminhado à IA',()=>{
 const {c}=env();let seen=null;c.enviarChatAction=()=>{};c.processarEEntregarIA=(...a)=>{seen=a;};
 c.processarMensagemTexto({chat:{id:123},text:'/calc CHA2DS2-VASc mulher 60 anos HAS sem IC DM AVC doença vascular'});
 assert(seen);assert.strictEqual(seen[1],c.processarCalculadoraClinicaComIA);
});
test('R06 Gasometria: faltantes ainda chegam à IA',()=>{
 const {c}=env();let calls=0;c.executarRaciocinioClinico=()=>{calls++;return 'inventado';};
 c.gerarAnaliseGasometriaComIA('pH 7.20');assert.equal(calls,1);
});
test('R07 Gasometria: última amostra incompleta herda dados da antiga',()=>{
 const {c}=env();let args;c.CalculadorasClinicas.gasometria=(...a)=>{args=a;return {ok:false};};
 c.gerarAnaliseGasometriaComIA('pH 7.20 pCO2 30 HCO3 12 Atualização: pH 7.40');
 assert.deepEqual(args.slice(0,3),['7.40','30','12']);
});
test('R08 Gasometria: resultado entregue pode substituir valores puros por saída da IA',()=>{
 const {c}=env();c.executarRaciocinioClinico=()=> 'pH 6.00 calculado pela IA';
 const r=c.gerarAnaliseGasometriaComIA('pH 7.40 pCO2 40 HCO3 24');assert(r.includes('pH 6.00'));assert(!r.includes('7.4'));
});
test('R09 CHA: mulher com 2 pontos recebe recomendação forte',()=>{
 const {c}=env(),r=c.CalculadorasClinicas.cha2ds2vasc(false,true,false,false,false,false,false,true);
 assert.equal(r.pontuacao,2);assert(r.recomendacao.includes('fortemente recomendada'));
});
test('R10 Vasopressina: campo legado 12 contradiz dose textual 9 mL/h',()=>{
 const {c}=env(),r=c.CalculadorasClinicas.drogasVasoativas('vaso');assert.equal(r.taxaMlH,12);assert.equal(r.tabela.find(x=>x.dose===0.03).mlH,9);
});
test('R11 Webhook só retorna após executar worker',()=>{
 const {c}=env();let ran=false;c.processarFilaTelegram=()=>{ran=true;};c.doPost(req('x'));assert(ran);
});
test('R12 GET clean remove dedup e permite replay com 61 minutos',()=>{
 const {c,advance}=env();let count=0;c.processarMensagemTexto=()=>count++;
 c.doPost(req('x'));advance(61*60000);c.doGet({parameter:{secret:'secret',action:'clean'}});c.doPost(req('x'));assert.equal(count,2);
});
test('R13 150 pedidos concluídos bloqueiam a entrada do próximo',()=>{
 const {c}=env();for(let i=0;i<150;i++)c.PersistenciaBot.salvar('inbox_'+i,{status:'done',created:c.Date.now(),update:{update_id:i}});
 assert.throws(()=>c.enfileirarUpdate({update_id:150,message:{chat:{id:123},text:'novo'}}),/Fila cheia/);
});
test('R14 Falha real de callback PDF termina inbox done sem preservar callback',()=>{
 const {c,cache}=env();let called=false;cache.rx_teste='1. Medicamento TESTE';
 c.ReceitaPdfService.processarEEnviarPdf=()=>{called=true;return {sucesso:false,enviadoTelegram:false};};
 c.doPost({parameter:{secret:'secret'},postData:{contents:JSON.stringify({update_id:1,callback_query:cb('gerarPdfRx_rx_teste')})}});
 const job=c.PersistenciaBot.ler('inbox_1');assert(called);assert.equal(job.status,'done');assert(!job.update.callback_query);
});
test('R15 Histórico é limitado a 10 registros globais, não por leito',()=>{
 const {c,props}=env();for(let id=1;id<=2;id++)for(let n=0;n<12;n++)assert(c.EnfermariaService.atualizarLeito(String(id),'Evolução '+n).sucesso);
 const hist=Object.keys(props).filter(k=>k.startsWith('LEITO_HIST_')).map(k=>JSON.parse(props[k]));assert.equal(hist.length,10);assert(hist.every(x=>x.numero==='2'));
});
test('R16 Fila aceita mais de 500 KB de conteúdo sem orçamento global',()=>{
 const {c,props}=env();for(let i=0;i<70;i++)c.enfileirarUpdate({update_id:i,message:{chat:{id:123},text:'x'.repeat(8000)}});
 const bytes=Object.entries(props).reduce((n,[k,v])=>n+Buffer.byteLength(k)+Buffer.byteLength(v),0);assert(bytes>500*1024);console.log('  Bytes aceitos pelo mock: '+bytes);
});
test('R17 Mensagem de erro com palavra prescrição recebe botão PDF',()=>{
 const {c,sent}=env();c.processarEEntregarIA(123,()=> '❌ Não foi possível gerar a prescrição.','x','rx');
 assert(sent.some(x=>JSON.stringify(x.payload.reply_markup||{}).includes('gerarPdfRx_')));
});
test('R18 PDF sem palavra rascunho não recebe banner obrigatório',()=>{
 const {c}=env();const h=c.ReceitaPdfService.gerarHtml('1. Medicamento TESTE\nTomar 1 comprimido','04/10/2026','TESTE');assert(!h.includes('CONFERÊNCIA MÉDICA OBRIGATÓRIA'));
});
test('R19 Outbox: processo concorrente marca sending ativo como uncertain',()=>{
 const {c}=env();let during;c.UrlFetchApp.fetch=()=>{c.processarCaixaSaida();during=c.PersistenciaBot.ler('outbox_x').status;return {getResponseCode:()=>200,getContentText:()=>'{"ok":true}'};};
 c.PersistenciaBot.salvar('outbox_x',{status:'pending',created:c.Date.now(),next:0,attempts:0,method:'sendMessage',payload:{chat_id:123,text:'x'}});
 c.tentarEntregaTelegram('outbox_x',c.PersistenciaBot.ler('outbox_x'));assert.equal(during,'uncertain');
});
test('R20 uxDividirTexto ainda corta palavras',()=>{
 const {c}=env();assert.equal(c.uxDividirTexto('abc defghij',7)[0],'abc def');
});
console.log('\n'+total+' defeitos reproduzidos; '+failures+' reproduções não confirmadas.');process.exitCode=failures?1:0;
