/* Evidência de defeitos residuais. PASSAR confirma defeito, não homologação. Sem rede. */
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

let total=0,failed=0;
function bug(name,fn){try{fn();total++;console.log('REPRODUZIDO: '+name);}catch(e){failed++;console.error('NÃO CONFIRMADO: '+name+' :: '+e.message);}}
bug('V01 CHA antecedentes desconhecidos termina em 0/9',()=>{const {c}=env();const r=c.tentarCalcularDeterministico('CHA2DS2-VASc homem 60 anos antecedentes desconhecidos');assert(r.includes('0/9'));assert(r.includes('NÃO recomendada'));});
bug('V02 CHA negação apaga HAS afirmada depois de mas',()=>{const {c}=env();const r=c.tentarCalcularDeterministico('CHA2DS2-VASc homem 60 anos sem DM, sem IC, sem AVC, sem doença vascular, mas HAS');assert(r.includes('0/9'));assert(r.includes('NÃO recomendada'));});
bug('V03 gasometria mantém pH 6.00 contraditório da IA',()=>{const {c}=env();c.executarRaciocinioClinico=()=> 'pH 6.00; AG = 99; HCO3 = 3';const r=c.gerarAnaliseGasometriaComIA('pH 7.40 pCO2 40 HCO3 24');assert(r.includes('pH 7.40'));assert(r.includes('pH 6.00'));assert(!r.includes('AG = 99'));assert(!r.includes('HCO3 = 3'));});
bug('V04 revisar exames sem medicamento habilita PDF',()=>{const {c,sent}=env();c.processarEEntregarIA(123,()=> '1. Revisar exames.','x','rx');assert(sent.some(x=>JSON.stringify(x.payload).includes('gerarPdfRx_')));});
bug('V05 clearance com Cr zero rejeitado pelo motor vai para IA',()=>{const {c}=env();let seen=null;c.processarEEntregarIA=(...a)=>{seen=a;};assert.equal(c.CalculadorasClinicas.cockcroftGault(0,70,60,false).ok,false);c.processarMensagemTexto({chat:{id:123},text:'/calc clearance Cr 0 peso 70 idade 60 masculino'});assert(seen);assert.strictEqual(seen[1],c.processarCalculadoraClinicaComIA);});
console.log(JSON.stringify({defeitos_reproduzidos:total,verificacoes_nao_confirmadas:failed}));process.exitCode=failed?1:0;
