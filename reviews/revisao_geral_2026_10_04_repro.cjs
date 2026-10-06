/* Revisão geral offline: passar confirma defeito presente. Sem rede. */
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



let reproduzidos=0, naoConfirmados=0;
function bug(caso,fn){try{const evidencia=fn();reproduzidos++;console.log(JSON.stringify({caso,reproduzido:true,evidencia}));}catch(e){naoConfirmados++;console.error(JSON.stringify({caso,reproduzido:false,erro:e.message}));}}
bug('R01 CKD-EPI explícito executa Cockcroft-Gault',()=>{const {c,sent}=env();const input='/calc CKD-EPI homem 60 anos cr 1.2 peso 70 kg';c.processarMensagemTexto({chat:{id:123},text:input});const output=sent.map(x=>x.payload.text||'').join('\n');assert(output.includes('Cockcroft-Gault'));assert(output.includes('65 mL/min'));const controle=c.CalculadorasClinicas.ckdEpi2021(1.2,60,false);assert.equal(controle.nome,'CKD-EPI 2021');return {input,output,controle:controle.principal};});
bug('R02 entrega incerta vira pedido concluído e perde texto original',()=>{const {c}=env();c.gerarSOAPComIA=()=> 'Resultado clínico';c.UrlFetchApp.fetch=()=>({getResponseCode:()=>500,getContentText:()=>'{"ok":false}'});c.enfileirarUpdate({update_id:201,message:{chat:{id:123},text:'/soap Paciente teste'}});c.processarFilaTelegram();const inbox=c.PersistenciaBot.ler('inbox_201'),outbox=c.PersistenciaBot.ler('outbox_201_1');assert.equal(inbox.status,'done');assert.equal(inbox.update.message,undefined);assert.equal(outbox.status,'uncertain');return {inbox,outboxStatus:outbox.status,payloadPreservado:Boolean(outbox.payload)};});
bug('R03 entregas incertas sem retenção bloqueiam novos pedidos',()=>{const {c,props,advance}=env();let aceitos=0;for(let i=0;i<100;i++){try{c.PersistenciaBot.salvar('outbox_'+i,{status:'uncertain',created:c.Date.now(),payload:{text:'á'.repeat(3250)}});aceitos++;}catch(e){assert(e.message.includes('Orçamento'));break;}}assert(aceitos>0&&aceitos<100);advance(8*86400000);c.processarCaixaSaida();c.doGet({parameter:{secret:'secret',action:'clean'}});const aposLimpeza=c.PersistenciaBot.chaves('outbox_').length;assert.equal(aposLimpeza,aceitos);assert.throws(()=>c.enfileirarUpdate({update_id:300,message:{chat:{id:123},text:'x'.repeat(4000)}}),/Orçamento/);return {aceitos,aposLimpeza,bytes:Object.entries(props).reduce((n,[k,v])=>n+Buffer.byteLength(k)+Buffer.byteLength(v),0),pedidoRecusadoCaracteres:4000,limite:'Backpressure local real; o mock não aplica cotas do serviço GAS.'};});
bug('R04 histórico de A_B é eliminado pela poda de A',()=>{const {c,props}=env();assert(c.EnfermariaService.atualizarLeito('A_B','Paciente B').sucesso);for(let i=0;i<8;i++)assert(c.EnfermariaService.atualizarLeito('A_B','B '+i).sucesso);const antes=Object.keys(props).filter(k=>k.startsWith('LEITO_HIST_A_B_')).length;assert(c.EnfermariaService.atualizarLeito('A','Paciente A').sucesso);for(let i=0;i<12;i++)assert(c.EnfermariaService.atualizarLeito('A','A '+i).sucesso);const depois=Object.keys(props).filter(k=>k.startsWith('LEITO_HIST_A_B_')).length;assert.equal(antes,8);assert.equal(depois,0);return {antes,depois,leitoBAtual:c.EnfermariaService.obterLeito('A_B').dados};});
bug('R05 solicitação de resposta por áudio perde SOAP ativo',()=>{const {c}=env();const caso='Paciente com fraqueza no braço direito.';c.definirModoBot(123,'soap',caso);c.baixarMidiaTelegram=()=>({data:'fake',mime:'audio/ogg'});c.chamarGeminiPoolMultimodal=()=> 'Me responda em áudio';let observado;c.responderPreceptorVozComIA=(id,ctx)=>{observado=ctx;};c.processarMensagemVoz({chat:{id:123},voice:{file_id:'fake'}});assert.equal(observado,'Me responda em áudio');assert(!observado.includes('fraqueza'));return {casoAtivo:c.modoBot(123).data,contextoRecebido:observado};});
bug('R06 psicoterapia é classificada como plantão',()=>{const {c}=env();const now=new c.Date();c.CalendarApp={getDefaultCalendar:()=>({getEvents:()=>[{getTitle:()=> 'Psicoterapia',getStartTime:()=>new c.Date(+now+3600000),getEndTime:()=>new c.Date(+now+7200000)}]})};const status=c.detectarPlantaoStatus(now);assert.equal(status.ehPlantaoHoje,true);assert.equal(status.tituloPlantao,'Psicoterapia');return status;});
const custos=[];
for(const n of [0,10,100,300]){const {c,p}=env();for(let i=0;i<n;i++)c.PersistenciaBot.salvar('inbox_'+i,{update:{update_id:i},status:'done',created:c.Date.now()});let leituras=0,listagens=0;const get=p.getProperty,all=p.getProperties;p.getProperty=(...a)=>{leituras++;return get(...a)};p.getProperties=()=>{listagens++;return all()};c.processarFilaTelegram();custos.push({concluidos:n,getProperty:leituras,getProperties:listagens});}
console.log(JSON.stringify({medicaoWorkerOcioso:custos}));
console.log(JSON.stringify({defeitos_reproduzidos:reproduzidos,nao_confirmados:naoConfirmados}));process.exitCode=naoConfirmados?1:0;
