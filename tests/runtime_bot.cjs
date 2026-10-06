const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const source=fs.readdirSync(path.join(root,'src')).sort().filter(n=>n.endsWith('.js')).map(n=>fs.readFileSync(path.join(root,'src',n),'utf8')).join('\n');
function env(config={}) {
 const props={TELEGRAM_CHAT_ID:'123',TELEGRAM_BOT_TOKEN:'fake',WEBHOOK_SECRET:'secret',...config},cache={},sent=[];
 let busy=false,quota=false,readFail=false; const c={console,Buffer};
 c.PropertiesService={getScriptProperties:()=>({getProperty:k=>{if(readFail)throw Error('read failure');return props[k]??null},setProperty:(k,v)=>{if(quota)throw Error('quota');props[k]=String(v)},deleteProperty:k=>delete props[k],getProperties:()=>{if(readFail)throw Error('read');return {...props}}})};
 c.CacheService={getScriptCache:()=>({get:k=>cache[k]??null,put:(k,v)=>cache[k]=v,remove:k=>delete cache[k]})};
 c.LockService={getScriptLock:()=>({waitLock:()=>{},releaseLock:()=>{}}),getUserLock:()=>({tryLock:()=>{if(busy)return false;busy=true;return true},releaseLock:()=>{busy=false}})};
 c.HtmlService={createHtmlOutput:body=>({body})};
 c.UrlFetchApp={fetch:(url,opts)=>{sent.push({method:url.split('/').pop(),body:JSON.parse(opts.payload||'{}')});return {getResponseCode:()=>200,getContentText:()=>'{"ok":true}'}}};
 vm.createContext(c);vm.runInContext(source,c);
 return {c,props,cache,sent,setBusy:v=>busy=v,setQuota:v=>quota=v,setReadFail:v=>readFail=v};
}
function req(text,id=1,chat=123,secret='secret'){return {parameter:{secret},postData:{contents:JSON.stringify({update_id:id,message:{chat:{id:chat},text}})}}}
const tests=[
 ['missing secret',()=>{let {c}=env({WEBHOOK_SECRET:''});let count=0;c.processarMensagemTexto=()=>count++;c.doPost(req('/manual'));assert.equal(count,0)}],
 ['missing allowed chat',()=>{let {c}=env({TELEGRAM_CHAT_ID:''});c.doPost(req('/manual'));assert.equal(c.PersistenciaBot.chaves('inbox_').length,0)}],
 ['wrong secret and chat',()=>{let {c}=env();c.doPost(req('/manual',1,123,'bad'));c.doPost(req('/manual',2,999));assert.equal(c.PersistenciaBot.chaves('inbox_').length,0)}],
 ['worker busy preserves input',()=>{let {c,setBusy}=env();setBusy(true);c.doPost(req('/manual'));assert.equal(c.PersistenciaBot.ler('inbox_1').status,'pending');let n=0;c.processarMensagemTexto=()=>n++;setBusy(false);c.processarFilaTelegram();assert.equal(n,1)}],
 ['duplicate update once',()=>{let {c}=env();let n=0;c.processarMensagemTexto=()=>n++;c.doPost(req('test'));c.doPost(req('test'));assert.equal(n,1)}],
 ['failed handler saved without replay',()=>{let {c}=env();let n=0;c.processarMensagemTexto=()=>{n++;throw Error('network')};c.doPost(req('test'));c.doPost(req('test'));assert.equal(n,1);assert.equal(c.PersistenciaBot.ler('inbox_1').update.message.text,'test')}],
 ['429 deferred and resumed',()=>{let {c}=env();let n=0;c.UrlFetchApp.fetch=()=>({getResponseCode:()=>++n===1?429:200,getContentText:()=>n===1?'{"parameters":{"retry_after":5}}':'{"ok":true}'});c.enviarMensagemParaChat(123,'hello');let key=c.PersistenciaBot.chaves('outbox_')[0],j=c.PersistenciaBot.ler(key);assert.equal(j.status,'pending');assert(j.next>Date.now());j.next=0;c.PersistenciaBot.salvar(key,j);c.processarCaixaSaida();assert.equal(c.PersistenciaBot.ler(key).status,'done')}],
 ['uncertain delivery not resent',()=>{let {c}=env();let n=0;c.UrlFetchApp.fetch=()=>{n++;throw Error('timeout')};c.enviarMensagemParaChat(123,'hello');c.processarCaixaSaida();assert.equal(n,1);assert.equal(c.PersistenciaBot.ler(c.PersistenciaBot.chaves('outbox_')[0]).status,'uncertain')}],
 ['atomic property chunks unicode',()=>{let {c}=env();const data='á😊'.repeat(3000);c.PersistenciaBot.salvar('teste',{data});assert.equal(c.PersistenciaBot.ler('teste').data,data)}],
 ['quota does not acknowledge update',()=>{let {c,setQuota}=env();setQuota(true);assert.throws(()=>c.doPost(req('hello')),/quota/)}],
 ['bed does not truncate',()=>{let {c}=env();const text='a'.repeat(1000)+' FINAL';let r=c.EnfermariaService.atualizarLeito('1',text);assert(r.sucesso);assert.equal(c.EnfermariaService.obterLeito('1').dados,text)}],
 ['bed oversize leaves prior intact',()=>{let {c}=env();c.EnfermariaService.atualizarLeito('1','original');let r=c.EnfermariaService.atualizarLeito('1','á'.repeat(5000));assert(!r.sucesso);assert.equal(c.EnfermariaService.obterLeito('1').dados,'original')}],
 ['read failure not vacant',()=>{let {c,setReadFail}=env();setReadFail(true);assert.throws(()=>c.EnfermariaService.obterLeito('1'));assert.throws(()=>c.EnfermariaService.formatarPainelBordo())}],
 ['write failure shown',()=>{let {c}=env();c.EnfermariaService.atualizarLeito=()=>({sucesso:false,erro:'falha de persistência'});let message;c.enviarMensagemParaChat=(id,t)=>message=t;c.processarMensagemTexto({chat:{id:123},text:'/leito 1 teste'});assert.equal(message,'falha de persistência')}],
 ['status explicit only',()=>{let {c}=env();let r=c.EnfermariaService.atualizarLeito('1','sem choque, rotina');assert(r.leito.status.includes('Não confirmado'));r=c.EnfermariaService.atualizarLeito('1','teste\nStatus: instável');assert(r.leito.status.includes('Instável'))}],
 ['Notion null no checkmark',()=>{let {c,sent}=env();c.obterOuCriarPaginaHabitLog=()=> 'page';c.atualizarCheckboxNotion=()=>null;c.processarCallbackBotao({id:'cb',data:'habit_gym',message:{chat:{id:123},date:1609459200,message_id:2,reply_markup:{inline_keyboard:[[{text:'Gym',callback_data:'habit_gym'}]]}}});assert(!sent.some(x=>x.method==='editMessageReplyMarkup'))}],
 ['natural language weight not age',()=>{let {c}=env();c.enviarChatAction=()=>{};c.classificarIntencaoMensagem=()=>({intencao:'CLINICO_EMERGENCIA'});let weight;c.CalculadorasClinicas.drogasVasoativas=(d,p)=>{weight=p;return {textoFormatado:'test'}};c.processarMensagemTexto({chat:{id:123},text:'nora paciente 65 anos, peso 80 kg'});assert.equal(weight,80)}],
 ['mode switch requires choice and clears case',()=>{let {c}=env();c.definirModoBot(123,'soap','CASO VELHO');c.processarMensagemTexto({chat:{id:123},text:'💊 Prescrever'});assert.equal(c.modoBot(123).mode,'soap');c.processarCallbackBotao({id:'cb',data:'ux:novo:rx',message:{chat:{id:123}}});let type,data;c.processarEEntregarIA=(id,f,d,t)=>{type=t;data=d};c.processarMensagemTexto({chat:{id:123},text:'NOVO PEDIDO'});assert.equal(type,'rx');assert(!data.includes('VELHO'))}],
 ['discharge confirmation version bound',()=>{let {c}=env();c.EnfermariaService.atualizarLeito('1','old');const v=c.EnfermariaService.obterLeito('1').version;c.EnfermariaService.atualizarLeito('1','new');assert(!c.EnfermariaService.desocuparLeito('1',v).sucesso);assert(c.EnfermariaService.obterLeito('1'))}],
 ['legacy bed preserved on migration',()=>{let {c,props}=env();props.ENFERMARIA_LEITOS_JSON=JSON.stringify({old:{numero:'old',dados:'legacy',dataISO:'2026-10-03',atualizadoEm:'12:00'}});c.EnfermariaService.atualizarLeito('new','test');assert.equal(c.EnfermariaService.obterLeito('old').dados,'legacy');c.EnfermariaService.desocuparLeito('old');assert.equal(c.EnfermariaService.obterLeito('old'),null);assert(props.ENFERMARIA_LEITOS_JSON.includes('legacy'))}],
 ['saving result retains other actions',()=>{let {c,cache,sent}=env();cache.content='RESULT';c.criarTarefaNotion=()=>true;c.processarCallbackBotao({id:'cb',data:'salvarNotion_rx_content',message:{chat:{id:123},message_id:1,reply_markup:{inline_keyboard:[[{text:'Save',callback_data:'salvarNotion_rx_content'}],[{text:'PDF',callback_data:'gerarPdfRx_content'}]]}}});assert.equal(cache.content,'RESULT');assert(sent.some(x=>x.method==='editMessageReplyMarkup'&&x.body.reply_markup.inline_keyboard[0][0].text==='PDF'))}],
 ['panel edits instead of sending copy',()=>{let {c,sent}=env();c.enviarPainelEnfermaria(123,0,777);assert.equal(sent[0].method,'editMessageText');assert.equal(sent[0].body.message_id,777)}],
 ['pending switch blocks free text',()=>{let {c}=env();c.definirModoBot(123,'soap','old case');c.processarMensagemTexto({chat:{id:123},text:'💊 Prescrever'});let n=0;c.processarEEntregarIA=()=>n++;c.processarMensagemTexto({chat:{id:123},text:'new data'});assert.equal(n,0);assert.equal(c.modoBot(123).data,'old case')}],
 ['calculator selection survives reply',()=>{let {c}=env();c.processarCallbackBotao({id:'cb',data:'calc_CURB-65',from:{id:123},message:{chat:{id:123}}});assert.equal(c.modoBot(123).mode,'calc');assert(c.modoBot(123).data.includes('CURB-65'))}],
 ['round continuation keeps case',()=>{let {c}=env();let seen=[];c.processarEEntregarIA=(id,f,d,t)=>seen.push({d,t});c.processarMensagemTexto({chat:{id:123},text:'/round old case'});c.processarMensagemTexto({chat:{id:123},text:'new details'});assert.equal(seen[1].t,'round');assert(seen[1].d.includes('old case'))}]

];
const n=Number(process.argv[2]);tests[n][1]();console.log('OK: '+tests[n][0]);
