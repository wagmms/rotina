/* Quarta rodada: verificações adicionais de requisitos. DEFEITO confirma falha, não aprovação.
 * Sem rede ou dados reais. Aceita master como argumento; preserva suítes anteriores. */
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

let defects=0, positives=0, failed=0;
function run(kind,name,fn){try{fn();if(kind==='DEFEITO')defects++;else positives++;console.log(kind+': '+name);}catch(e){failed++;console.error('VERIFICAÇÃO FALHOU: '+name+' :: '+e.message);}}
const bug=(n,f)=>run('DEFEITO',n,f),ok=(n,f)=>run('CONFIRMADO',n,f);
bug('U01 CHA com idade/sexo mas fatores desconhecidos calcula 0/9',()=>{
 const {c}=env();const r=c.tentarCalcularDeterministico('CHA2DS2-VASc homem 60 anos');assert(r.includes('0/9'));assert(r.includes('NÃO recomendada'));
});
bug('U02 CHA negação de lista sem HAS, DM ou AVC soma DM e AVC',()=>{
 const {c}=env();const r=c.tentarCalcularDeterministico('CHA2DS2-VASc homem 60 anos sem HAS, DM ou AVC');assert(r.includes('3/9'));assert(r.includes('fortemente recomendada'));
});
bug('U03 MELD reconhecido com valor inválido cai na IA',()=>{
 const {c}=env();let seen=null;c.processarEEntregarIA=(...a)=>{seen=a;};c.processarMensagemTexto({chat:{id:123},text:'/calc MELD bili 0 cr 1 inr 1'});assert(seen);assert.strictEqual(seen[1],c.processarCalculadoraClinicaComIA);
});
bug('U04 Gasometria ainda entrega pH e AG contraditórios da IA',()=>{
 const {c}=env();c.executarRaciocinioClinico=()=> 'pH 6.00; AG = 99; HCO3 = 3';const r=c.gerarAnaliseGasometriaComIA('pH 7.40 pCO2 40 HCO3 24');assert(r.includes('pH 7.40'));assert(r.includes('pH 6.00'));assert(r.includes('AG = 99'));assert(r.includes('HCO3 = 3'));
});
bug('U05 resposta sem medicamento nem posologia oferece PDF',()=>{
 const {c,sent}=env();c.processarEEntregarIA(123,()=> 'Aguarde a confirmação dos dados do paciente.','x','rx');assert(sent.some(x=>JSON.stringify(x.payload).includes('gerarPdfRx_')));
});
bug('U06 gravação de leitos excede orçamento global fora de PersistenciaBot',()=>{
 const {c,props}=env();for(let id=1;id<=80;id++)assert(c.EnfermariaService.atualizarLeito(String(id),'x'.repeat(7000)).sucesso);
 const bytes=Object.entries(props).reduce((n,[k,v])=>n+Buffer.byteLength(k)+Buffer.byteLength(v),0);assert(bytes>512000);console.log('  Bytes de chaves/valores no mock: '+bytes);
});
bug('U07 migração de histórico anterior faz poda conservar antigos e apagar recentes',()=>{
 const {c,props,p}=env();c.EnfermariaService.atualizarLeito('1','E0');
 for(let i=0;i<10;i++)p.setProperty('LEITO_HIST_1_ffffffff-ffff-4fff-8fff-fffffffffff'+i,JSON.stringify({numero:'1',dados:'ANTIGO'+i}));
 for(let n=1;n<=12;n++)assert(c.EnfermariaService.atualizarLeito('1','E'+n).sucesso);
 const hs=Object.entries(props).filter(([k])=>k.startsWith('LEITO_HIST_1_')).map(([,v])=>JSON.parse(v).dados);
 assert.equal(hs.length,10);assert(hs.includes('E11'));assert(!hs.includes('E10'));assert(hs.filter(t=>t.startsWith('ANTIGO')).length===9);console.log('  Histórico retido: '+hs.join(', '));
});
ok('Modo async enfileira e worker explícito conclui',()=>{
 const {c,props}=env();props.TELEGRAM_ASYNC_WORKER='true';let n=0;c.processarMensagemTexto=()=>n++;
 c.doPost(req('x'));assert.equal(n,0);assert.equal(c.PersistenciaBot.ler('inbox_1').status,'pending');c.processarFilaTelegram();assert.equal(n,1);assert.equal(c.PersistenciaBot.ler('inbox_1').status,'done');
});
ok('Sem flag, comportamento continua síncrono (condição de configuração)',()=>{
 const {c}=env();let n=0;c.processarMensagemTexto=()=>n++;c.doPost(req('x'));assert.equal(n,1);
});
ok('Orçamento multibyte também rejeita excesso sem Buffer e sem newBlob',()=>{
 const {c}=env();c.Buffer=undefined;c.Utilities.newBlob=undefined;
 assert.throws(()=>{for(let i=0;i<40;i++)c.enfileirarUpdate({update_id:i,message:{chat:{id:123},text:'界'.repeat(5000)}});},/Orçamento global|Fila cheia/);
});
ok('Status e alta usam prefixo de histórico do leito',()=>{
 const {c,props}=env();c.EnfermariaService.atualizarLeito('9','caso');assert(c.EnfermariaService.atualizarStatusLeito('9','estavel').sucesso);assert(c.EnfermariaService.desocuparLeito('9').sucesso);const ks=Object.keys(props).filter(k=>k.startsWith('LEITO_HIST_'));assert.equal(ks.length,2);assert(ks.every(k=>k.startsWith('LEITO_HIST_9_')));
});
console.log(JSON.stringify({defeitos_reproduzidos:defects,verificacoes_positivas:positives,verificacoes_falharam:failed}));process.exitCode=failed?1:0;
