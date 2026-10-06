/* Auditoria offline: passar confirma defeito, não conformidade. IA simulada. */
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


const cb=data=>({id:'cb',data,message:{chat:{id:123},message_id:1}});
let count=0,failed=0;
function bug(name,fn){try{const evidence=fn();count++;console.log(JSON.stringify({caso:name,defeito_reproduzido:true,evidence}));}catch(e){failed++;console.error(JSON.stringify({caso:name,defeito_reproduzido:false,erro:e.message}));}}
bug('Y01 SOAP permite exportar sinais vitais do modelo sem medidas informadas',()=>{const {c,sent}=env();let prompt;const input='Homem 45 anos com tosse. Exame físico e sinais vitais não informados.';c.executarRaciocinioClinico=(p)=>{prompt=p;const model=p.match(/```\n([\s\S]*?)\n```/);assert(model);return model[1];};c.processarMensagemTexto({chat:{id:123},text:'/soap '+input});assert(prompt.includes('se não descreveu achados anormais, mantenha o padrão normal'));assert(prompt.includes('PA 120x80 mmHg'));const msg=sent.find(x=>JSON.stringify(x.payload.reply_markup||{}).includes('ux:copiar:'));assert(msg);const button=msg.payload.reply_markup.inline_keyboard.flat().find(x=>(x.callback_data||'').startsWith('ux:copiar:'));sent.length=0;c.tratarCallbackUX(cb(button.callback_data));const output=sent.map(x=>x.payload.text||'').join('\n');assert(output.includes('PA 120x80'));assert(output.includes('Tax 36.5'));return {input,modelo_extraido_do_prompt:true,output,limite:'Modelo simulado; não mede frequência de invenção em chamadas reais.'};});
bug('Y02 CHA negação anterior apaga afirmativa explícita tem HAS',()=>{const {c}=env();const input='CHA2DS2-VASc homem 60 anos sem IC, tem HAS, sem DM, sem AVC, sem doença vascular';const output=c.tentarCalcularDeterministico(input);const control=c.tentarCalcularDeterministico('CHA2DS2-VASc homem 60 anos HAS, sem IC, sem DM, sem AVC, sem doença vascular');assert(output.includes('0/9'));assert(control.includes('1/9'));return {input,output,control};});
function soapEnv(){const x=env();x.c.executarRaciocinioClinico=()=> 'SOAP de teste';x.c.processarMensagemTexto({chat:{id:123},text:'/soap Paciente com fraqueza no braço direito há duas horas'});return x;}
bug('Y03 Botão EF recebe contexto vazio apesar de SOAP ativo',()=>{const {c}=soapEnv();const before=c.modoBot(123);let observed;c.gerarGuiaExameFisicoEspecial=(tipo,contexto)=>{observed={tipo,contexto};return 'Guia de teste';};c.processarCallbackBotao(cb('ef_neuro'));assert(before.data.includes('fraqueza'));assert.strictEqual(observed.contexto,'');return {before,observed,after:c.modoBot(123)};});
bug('Y04 Comando EF apaga caso e voltar ao SOAP restaura dados vazios',()=>{const {c}=soapEnv();const before=c.modoBot(123);c.processarMensagemTexto({chat:{id:123},text:'/ef_neuro'});assert.strictEqual(c.modoBot(123),null);c.tratarCallbackUX(cb('ux:usar:soap'));const after=c.modoBot(123);assert.strictEqual(after.data,'');return {before,after};});
bug('Y05 Higienização da gasometria reescreve meta explícita de pH',()=>{const {c}=env();const input='pH 7.40 pCO2 40 HCO3 24';const mockedIA='Meta de pH: 7.30.';c.executarRaciocinioClinico=()=>mockedIA;const output=c.gerarAnaliseGasometriaComIA(input);assert(!output.includes('7.30'));assert(output.includes('Meta de pH da amostra (7.40)'));return {input,mockedIA,output,limite:'Meta sintética para testar preservação semântica; não é recomendação clínica.'};});
bug('Y06 Receita sem identificação do medicamento habilita PDF',()=>{const {c,sent}=env();const input='1. Usar medicamento 500 mg';assert.strictEqual(c.validarReceitaTemMedicamentos(input),true);c.processarEEntregarIA(123,()=>input,'x','rx');const pdf=sent.some(x=>JSON.stringify(x.payload).includes('gerarPdfRx_'));assert(pdf);return {input,pdf};});
bug('Y07 Receita completa em duas linhas não habilita PDF',()=>{const {c,sent}=env();const input='1. Paracetamol 500 mg\nPosologia: tomar 1 comprimido via oral de 6/6h se dor.';assert.strictEqual(c.validarReceitaTemMedicamentos(input),false);const control=input.replace('\n',' ');assert.strictEqual(c.validarReceitaTemMedicamentos(control),true);c.processarEEntregarIA(123,()=>input,'x','rx');const pdf=sent.some(x=>JSON.stringify(x.payload).includes('gerarPdfRx_'));assert(!pdf);return {input,pdf,mesmo_conteudo_uma_linha_valido:true};});
bug('Y08 Copiar Modelo exporta também o checklist inteiro',()=>{const {c,sent}=env();c.processarMensagemTexto({chat:{id:123},text:'/ef_neuro'});const msg=sent.find(x=>x.payload.reply_markup);const button=msg.payload.reply_markup.inline_keyboard[0][0];assert(button.text.includes('Copiar Modelo'));sent.length=0;c.tratarCallbackUX(cb(button.callback_data));const output=sent.map(x=>x.payload.text||'').join('\n');assert(output.includes('Checklist de Execução'));assert(output.includes('[EXAME NEUROLÓGICO]'));return {button:button.text,output};});
console.log(JSON.stringify({defeitos_reproduzidos:count,verificacoes_nao_confirmadas:failed}));process.exitCode=failed?1:0;
