/* Auditoria offline: PASSAR confirma presença do defeito, não conformidade. */
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


let count=0,failed=0;
function bug(name,fn){try{const evidence=fn();count++;console.log(JSON.stringify({caso:name,defeito_reproduzido:true,evidence}));}catch(e){failed++;console.error(JSON.stringify({caso:name,defeito_reproduzido:false,erro:e.message}));}}
bug('X01: dois fatores negados não completam o histórico',()=>{const {c}=env();const input='CHA2DS2-VASc homem 60 anos sem HAS, sem DM';const output=c.tentarCalcularDeterministico(input);assert(output.includes('0/9'));assert(output.includes('NÃO recomendada'));return {input,output};});
bug('X02: um fator positivo não completa o histórico',()=>{const {c}=env();const input='CHA2DS2-VASc homem 60 anos HAS';const output=c.tentarCalcularDeterministico(input);assert(output.includes('1/9'));assert(!output.includes('Fatores Incompletos'));return {input,output};});
bug('X03: negação posterior apaga HAS afirmada',()=>{const {c}=env();const input='CHA2DS2-VASc homem 60 anos HAS, sem DM, sem IC, sem AVC, sem doença vascular';const control=c.tentarCalcularDeterministico(input.replace('HAS, sem','HAS, mas sem'));assert(control.includes('1/9'));const output=c.tentarCalcularDeterministico(input);assert(output.includes('0/9'));assert(output.includes('NÃO recomendada'));return {input,output,control};});
bug('X04: palavra conduta dispensa validação da amostra na linha inteira',()=>{const {c}=env();const input='pH 7.40 pCO2 40 HCO3 24';const mockedIA='O pH é 6.00; conduta: reavaliar a amostra.';c.executarRaciocinioClinico=()=>mockedIA;const output=c.gerarAnaliseGasometriaComIA(input);assert(output.includes('pH 7.40'));assert(output.includes('O pH é 6.00'));return {input,mockedIA,output};});
bug('X05: PDF habilitado sem nome de fármaco',()=>{const {c,sent}=env();const input='1. Usar 500 mg';assert.strictEqual(c.validarReceitaTemMedicamentos(input),true);c.processarEEntregarIA(123,()=>input,'x','rx');const pdf=sent.some(x=>JSON.stringify(x.payload).includes('gerarPdfRx_'));assert(pdf);return {input,pdf};});
bug('X06: primeiro item completo libera receita com segundo incompleto',()=>{const {c,sent}=env();const input='1. Paracetamol 500 mg VO 1 comprimido de 6/6h se dor.\n2. Amoxicilina 500 mg';assert.strictEqual(c.validarReceitaTemMedicamentos(input),true);c.processarEEntregarIA(123,()=>input,'x','rx');const pdf=sent.some(x=>JSON.stringify(x.payload).includes('gerarPdfRx_'));assert(pdf);return {input,pdf};});
console.log(JSON.stringify({defeitos_reproduzidos:count,verificacoes_nao_confirmadas:failed}));process.exitCode=failed?1:0;
