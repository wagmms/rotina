/* Evidência de auditoria: passar confirma defeito presente. Sem rede. */
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

let count=0,failed=0;
function bug(name,fn){try{fn();count++;console.log('REPRODUZIDO: '+name);}catch(e){failed++;console.error('NÃO CONFIRMADO: '+name+' :: '+e.message);}}
bug('W01 CHA sem HAS omite os demais fatores e calcula 0/9',()=>{const {c}=env();const r=c.tentarCalcularDeterministico('CHA2DS2-VASc homem 60 anos sem HAS');assert(r.includes('0/9'));assert(r.includes('NÃO recomendada'));});
bug('W02 CHA mas sem torna positivos todos os fatores negados',()=>{const {c}=env();const r=c.tentarCalcularDeterministico('CHA2DS2-VASc homem 60 anos HAS, mas sem DM, sem IC, sem AVC, sem doença vascular');assert(r.includes('6/9'));assert(r.includes('fortemente recomendada'));});
bug('W03 Gasometria pH é 6.00 continua contraditório',()=>{const {c}=env();c.executarRaciocinioClinico=()=> 'O pH é 6.00';const r=c.gerarAnaliseGasometriaComIA('pH 7.40 pCO2 40 HCO3 24');assert(r.includes('pH 7.40'));assert(r.includes('O pH é 6.00'));});
bug('W04 Gasometria troca alvo numérico pelo valor medido',()=>{const {c}=env();c.executarRaciocinioClinico=()=> 'Alvo ventilatório: pCO2 35 mmHg.';const r=c.gerarAnaliseGasometriaComIA('pH 7.40 pCO2 40 HCO3 24');assert(!r.includes('pCO2 35'));assert(r.includes('Alvo ventilatório: pCO2 conforme amostra (40 mmHg)'));});
bug('W05 PDF liberado com apresentação sem posologia nem via',()=>{const {c,sent}=env();assert.equal(c.validarReceitaTemMedicamentos('1. Paracetamol 500 mg'),true);c.processarEEntregarIA(123,()=> '1. Paracetamol 500 mg','x','rx');assert(sent.some(x=>JSON.stringify(x.payload).includes('gerarPdfRx_')));});
bug('W06 HAS-BLED suportado permanece fora da proteção anti-IA',()=>{const {c}=env();assert.equal(typeof c.CalculadorasClinicas.hasbled,'function');assert.equal(c.ehCalculadoraReconhecida('HAS-BLED hipertensão'),false);let seen=null;c.processarEEntregarIA=(...a)=>{seen=a;};c.processarMensagemTexto({chat:{id:123},text:'/calc HAS-BLED hipertensão'});assert(seen);assert.strictEqual(seen[1],c.processarCalculadoraClinicaComIA);});
console.log(JSON.stringify({defeitos_reproduzidos:count,verificacoes_nao_confirmadas:failed}));process.exitCode=failed?1:0;
