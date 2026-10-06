// Verificações locais: todos os serviços externos são simulados.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const code=fs.readdirSync(path.join(root,'src')).sort().filter(n=>n.endsWith('.js')).map(n=>fs.readFileSync(path.join(root,'src',n),'utf8')).join('\n');
function env(overrides={}) {
 const store={},sent=[],ctx={console,Buffer}; vm.createContext(ctx);vm.runInContext(code,ctx);
 const config={TELEGRAM_CHAT_ID:'123',TELEGRAM_BOT_TOKEN:'fake',WEBHOOK_SECRET:'synthetic',TIMEZONE:'America/Sao_Paulo',...overrides};
 ctx.ConfigService={get:(k,d)=>config[k]??d};
 ctx.CacheService={getScriptCache:()=>({get:k=>store[k]??null,put:(k,v)=>store[k]=v,remove:k=>delete store[k]})};
 ctx.HtmlService={createHtmlOutput:x=>({body:x})};
 ctx.LockService={getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})};
 ctx.UrlFetchApp={fetch:(url,opts)=>{sent.push({method:url.split('/').pop(),payload:JSON.parse(opts.payload||'{}')});return {getResponseCode:()=>200,getContentText:()=>'{"ok":true}'}}};
 return {ctx,store,sent};
}
function req(text,id=1,chat=123,secret='synthetic'){return {parameter:{secret},postData:{contents:JSON.stringify({update_id:id,message:{chat:{id:chat},text}})}};}
function test(label,fn){fn();console.log('CONFIRMADO:',label)}
test('Segredo ausente permite handler sem autenticação',()=>{let {ctx}=env({WEBHOOK_SECRET:null});let n=0;ctx.processarMensagemTexto=()=>n++;ctx.doPost(req('/manual',1,123,''));assert.equal(n,1)});
test('Chat autorizado ausente permite outro chat',()=>{let {ctx}=env({TELEGRAM_CHAT_ID:null});let n=0;ctx.processarMensagemTexto=()=>n++;ctx.doPost(req('/manual',1,999));assert.equal(n,1)});
test('Lock negado retorna apenas corpo Busy sem guardar trabalho',()=>{let {ctx,store}=env();ctx.LockService={getScriptLock:()=>({tryLock:()=>false})};assert.equal(ctx.doPost(req('/manual')).body,'Busy');assert.deepEqual(store,{})});
test('Falha no handler retorna OK mesmo removendo cache',()=>{let {ctx,store}=env();ctx.processarMensagemTexto=()=>{throw Error('synthetic')};assert.equal(ctx.doPost(req('/manual')).body,'OK');assert.equal(store.upd_1,undefined)});
test('Falha de escrita do leito desaparece no handler',()=>{let {ctx,store,sent}=env();ctx.PropertiesService={getScriptProperties:()=>({getProperty:()=>null,setProperty:()=>{throw Error('synthetic')}})};ctx.doPost(req('/leito 1 teste'));assert.equal(sent.length,0);assert.equal(store.upd_1,'done')});
test('Leito trunca informação final e informa sucesso',()=>{let {ctx}=env();let text='a'.repeat(801)+' OBSERVACAO FINAL';let r=ctx.EnfermariaService.atualizarLeito('1',text);assert.equal(r.sucesso,true);assert.equal(r.leito.dados.length,800);assert(!r.leito.dados.includes('OBSERVACAO FINAL'))});
test('Painel quebra quando leitura devolve null',()=>{let {ctx}=env();ctx.PropertiesService={getScriptProperties:()=>({getProperty:()=>{throw Error('synthetic')}})};assert.throws(()=>ctx.EnfermariaService.formatarPainelBordo(),/null|undefined/)});
test('Notion retorna null mas botão mostra sucesso',()=>{let {ctx,sent}=env();ctx.obterOuCriarPaginaHabitLog=()=> 'page';ctx.atualizarCheckboxNotion=()=>null;ctx.processarCallbackBotao({id:'cb',data:'habit_gym',message:{date:1609459200,chat:{id:123},message_id:1,reply_markup:{inline_keyboard:[[{text:'Academia',callback_data:'habit_gym'}]]}}});assert(sent.some(s=>s.method==='editMessageReplyMarkup'&&s.payload.reply_markup.inline_keyboard[0][0].text.includes('✅')))});
test('429 de 5 segundos perde resposta e marca update concluído',()=>{let {ctx,store}=env();ctx.UrlFetchApp={fetch:()=>({getResponseCode:()=>429,getContentText:()=>'{"parameters":{"retry_after":5}}'})};ctx.doPost(req('/manual'));assert.equal(store.upd_1,'done')});
test('Linguagem natural usa idade como peso',()=>{let {ctx}=env();let peso;ctx.enviarChatAction=()=>{};ctx.enviarMensagemParaChat=()=>{};ctx.classificarIntencaoMensagem=()=>({intencao:'CLINICO_EMERGENCIA'});ctx.CalculadorasClinicas.drogasVasoativas=(d,p)=>{peso=p;return {textoFormatado:'synthetic'}};ctx.processarMensagemTexto({chat:{id:123},text:'nora paciente 65 anos, peso 80 kg'});assert.equal(peso,65)});
test('Prescrever preserva SOAP anterior e encaminha texto para SOAP',()=>{let {ctx,store}=env();store.ctx_123='/soap CASO ANTERIOR';ctx.enviarMensagemParaChat=()=>{};let tipo,dados;ctx.processarEEntregarIA=(c,f,d,t)=>{tipo=t;dados=d};ctx.processarMensagemTexto({chat:{id:123},text:'💊 Prescrever'});ctx.processarMensagemTexto({chat:{id:123},text:'PEDIDO NOVO'});assert.equal(tipo,'soap');assert(dados.includes('CASO ANTERIOR'))});
console.log('11 comportamentos problemáticos reproduzidos; não são testes de aprovação das correções.');
