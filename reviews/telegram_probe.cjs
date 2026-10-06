const fs=require('fs'),vm=require('vm'),path=require('path');
const root=process.argv[2] || path.resolve(__dirname, '..');
function env(){
 const store={},ctx={console,Buffer};vm.createContext(ctx);
 const code=fs.readdirSync(path.join(root,'src')).sort().filter(x=>x.endsWith('.js')).map(x=>fs.readFileSync(path.join(root,'src',x),'utf8')).join('\n');
 vm.runInContext(code,ctx);
 ctx.ConfigService={get:(k,d)=>({TELEGRAM_CHAT_ID:'123',TELEGRAM_BOT_TOKEN:'test',TIMEZONE:'America/Sao_Paulo'}[k]??d)};
 ctx.CacheService={getScriptCache:()=>({get:k=>store[k]??null,put:(k,v)=>store[k]=v,remove:k=>delete store[k]})};
 ctx.HtmlService={createHtmlOutput:x=>x};ctx.LockService={getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})};
 ctx.UrlFetchApp={fetch:()=>({getResponseCode:()=>200,getContentText:()=>'{"ok":true}'})};
 return ctx;
}
function update(id){return {postData:{contents:JSON.stringify({update_id:id,message:{chat:{id:123},text:'/manual'}})}};}
let c=env(),n=0;c.LockService={getScriptLock:()=>({tryLock:()=>false,releaseLock:()=>{}})};c.processarMensagemTexto=()=>n++;c.doPost(update(1));console.log('unauthenticated_request_with_failed_lock:',n,'handler invocation(s)');
c=env();n=0;c.processarMensagemTexto=()=>{n++;throw Error('simulated transient failure')};c.doPost(update(2));c.doPost(update(2));console.log('failed_update_then_retry:',n,'handler invocation(s)');
c=env();c.PropertiesService={getScriptProperties:()=>({getProperty:()=>null,setProperty:()=>{throw Error('quota exceeded')}})};console.log('failed_bed_write_reports_success:',c.EnfermariaService.atualizarLeito('1','synthetic test').sucesso);
c=env();let weights=[];c.enviarMensagemParaChat=()=>{};c.CalculadorasClinicas.drogasVasoativas=(d,p)=>{weights.push(p);return {textoFormatado:'test'}};['/dva nora','/dva nora abc','/dva nora 70,5'].forEach(text=>c.processarMensagemTexto({chat:{id:123},text}));console.log('weights_for_missing_invalid_decimal_comma:',JSON.stringify(weights));
c=env();let dates=[];c.obterOuCriarPaginaHabitLog=d=>{dates.push(d);return 'page'};c.responderCallbackTelegram=()=>{};c.atualizarCheckboxNotion=()=>{};c.processarCallbackBotao({id:'test',data:'habit_gym',message:{date:1609459200,chat:{id:123}}});console.log('habit_for_message_from_2021_written_to:',dates.join());
c=env();let calls=0;c.UrlFetchApp={fetch:()=>{calls++;return {getResponseCode:()=>429,getContentText:()=>'{"ok":false,"parameters":{"retry_after":5}}'}}};console.log('429_result:',c.executarPostTelegram('mock',{parse_mode:'Markdown',text:'test'}),'immediate_attempts:',calls);
