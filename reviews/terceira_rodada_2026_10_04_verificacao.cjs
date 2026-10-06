/* Evidência da terceira rodada. CORREÇÃO confirma um caso corrigido; DEFEITO confirma falha presente.
 * Mocks isolados, sem rede. Aceita caminho do master como primeiro argumento. */
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
let fixed=0, defects=0, failed=0;
function check(kind,name,fn){try{fn();if(kind==='CORREÇÃO')fixed++;else defects++;console.log(kind+': '+name);}catch(e){failed++;console.error('VERIFICAÇÃO FALHOU: '+name+' :: '+e.message);}}
const ok=(n,f)=>check('CORREÇÃO',n,f), bug=(n,f)=>check('DEFEITO',n,f);
ok('R01/R02 MELD 22 e MELD-Na 25, Na ou sódio',()=>{const {c}=env();for(const na of ['na 132','sódio 132'])assert(c.tentarCalcularDeterministico('MELD bili 2 cr 4 inr 1 '+na).includes('MELD 22 · MELD-Na 25'));});
ok('R03 sem diálise é false',()=>{const {c}=env();let a;c.CalculadorasClinicas.meld=(...x)=>{a=x;return {ok:true,principal:'ok'};};c.tentarCalcularDeterministico('MELD bili 2 cr 1 inr 1 sem diálise');assert.strictEqual(a[4],false);});
ok('R04 sexo ausente pede esclarecimento sem calcular',()=>{const {c}=env();let n=0;c.CalculadorasClinicas.cockcroftGault=()=>{n++;};assert(c.tentarCalcularDeterministico('clearance Cr 1 peso 70 idade 60').includes('informe o sexo'));assert.equal(n,0);});
ok('R05 comando CHA desvia da IA',()=>{const {c}=env();let calls=0;c.processarEEntregarIA=()=>calls++;c.processarMensagemTexto({chat:{id:123},text:'/calc CHA2DS2-VASc mulher 60 anos HAS'});assert.equal(calls,0);});
ok('R06/R07 amostra incompleta não chama cálculo nem IA',()=>{const {c}=env();let calls=0;c.executarRaciocinioClinico=()=>calls++;c.CalculadorasClinicas.gasometria=()=>calls++;for(const t of ['pH 7.20','pH 7.20 pCO2 30 HCO3 12 Atualização: pH 7.40'])assert(c.gerarAnaliseGasometriaComIA(t).includes('Incompleta'));assert.equal(calls,0);});
ok('R08 resultado puro permanece no texto apesar de IA conflitante',()=>{const {c}=env();c.executarRaciocinioClinico=()=> 'pH 6.00';const r=c.gerarAnaliseGasometriaComIA('pH 7.40 pCO2 40 HCO3 24');assert(r.includes('pH 7.40'));assert(r.includes('pH 6.00'));});
ok('R09 mulher com 2 pontos é intermediário',()=>{const {c}=env(),r=c.CalculadorasClinicas.cha2ds2vasc(false,true,false,false,false,false,false,true);assert.equal(r.pontuacao,2);assert(r.recomendacao.includes('Risco intermediário'));assert.equal(r.icone,'🟠');});
ok('R10 vasopressina 9 no legado e tabela',()=>{const {c}=env(),r=c.CalculadorasClinicas.drogasVasoativas('vaso');assert.equal(r.taxaMlH,9);assert.equal(r.tabela.find(x=>x.dose===0.03).mlH,9);});
ok('R12 GET clean preserva dedup aos 61 min sem pressão',()=>{const {c,advance}=env();let n=0;c.processarMensagemTexto=()=>n++;c.doPost(req('x'));advance(61*60000);c.doGet({parameter:{secret:'secret',action:'clean'}});c.doPost(req('x'));assert.equal(n,1);});
ok('R13 150 done não impedem enfileirar novo pedido',()=>{const {c}=env();for(let i=0;i<150;i++)c.PersistenciaBot.salvar('inbox_'+i,{status:'done',created:c.Date.now()});c.enfileirarUpdate({update_id:151,message:{chat:{id:123},text:'x'}});assert(c.PersistenciaBot.ler('inbox_151'));});
ok('R14 callback PDF com falha preservado',()=>{const {c,cache}=env();cache.rx='texto';c.ReceitaPdfService.processarEEnviarPdf=()=>({sucesso:false});c.doPost({parameter:{secret:'secret'},postData:{contents:JSON.stringify({update_id:1,callback_query:cb('gerarPdfRx_rx')})}});const j=c.PersistenciaBot.ler('inbox_1');assert.equal(j.status,'failed');assert(j.update.callback_query);});
ok('R15 evoluções de dois leitos mantêm 10 por leito no caso monotônico',()=>{const {c,props}=env();for(let id=1;id<=2;id++)for(let n=0;n<12;n++)assert(c.EnfermariaService.atualizarLeito(String(id),'E'+n).sucesso);for(const id of [1,2])assert.equal(Object.keys(props).filter(k=>k.startsWith('LEITO_HIST_'+id+'_')).length,10);});
ok('R16 contrapressão ASCII rejeita excesso',()=>{const {c}=env();assert.throws(()=>{for(let i=0;i<70;i++)c.enfileirarUpdate({update_id:i,message:{chat:{id:123},text:'x'.repeat(8000)}});},/Orçamento global|Fila cheia/);});
ok('R17 erro explícito não oferece PDF',()=>{const {c,sent}=env();c.processarEEntregarIA(123,()=> '❌ Não foi possível gerar a prescrição.','x','rx');assert(!sent.some(x=>JSON.stringify(x.payload).includes('gerarPdfRx_')));});
ok('R18 banner incondicional',()=>{const {c}=env();assert(c.ReceitaPdfService.gerarHtml('1. TESTE','data','nome').includes('CONFERÊNCIA MÉDICA OBRIGATÓRIA'));});
ok('R19 sending recente permanece em voo',()=>{const {c}=env();c.PersistenciaBot.salvar('outbox_x',{status:'sending',created:c.Date.now(),startedAt:c.Date.now()});c.processarCaixaSaida();assert.equal(c.PersistenciaBot.ler('outbox_x').status,'sending');});
ok('R20 segmentação respeita espaço',()=>{const {c}=env();assert.equal(c.uxDividirTexto('abc defghij',7)[0],'abc');});

bug('T01 CHA sem dados calcula 0/9 e baixa probabilidade',()=>{const {c}=env();const r=c.tentarCalcularDeterministico('CHA2DS2-VASc paciente');assert(r.includes('0/9'));assert(r.includes('NÃO recomendada'));});
bug('T02 CHA conta doenças expressamente negadas',()=>{const {c}=env();const r=c.tentarCalcularDeterministico('CHA2DS2-VASc mulher 60 anos sem IC, sem diabetes, sem AVC, sem doença vascular, sem hipertensão');assert(r.includes('3/9'));assert(r.includes('fortemente recomendada'));console.log('  Negativas explícitas: '+r.split('\n').slice(0,7).join(' '));});
bug('T03 CHA reconhece IC dentro de diabético',()=>{const {c}=env();let a;c.CalculadorasClinicas.cha2ds2vasc=(...x)=>{a=x;return {ok:true};};c.tentarCalcularDeterministico('CHA2DS2-VASc homem 60 anos diabético');assert.strictEqual(a[0],true);assert.strictEqual(a[3],true);});
bug('T04 MELD incompleto continua enviado à IA',()=>{const {c}=env();let calls=0;c.processarEEntregarIA=()=>calls++;c.processarMensagemTexto({chat:{id:123},text:'/calc MELD bili 2 inr 1'});assert.equal(calls,1);});
bug('T05 MELD negação não faz hemodiálise é interpretada como sim',()=>{const {c}=env();let a;c.CalculadorasClinicas.meld=(...x)=>{a=x;return {ok:true};};c.tentarCalcularDeterministico('MELD bili 2 cr 1 inr 1 não faz hemodiálise');assert.strictEqual(a[4],true);});
bug('T06 Gasometria falha no motor ainda permite IA sem laudo puro',()=>{const {c}=env();let n=0;c.CalculadorasClinicas.gasometria=()=>{throw Error('falha sintética');};c.executarRaciocinioClinico=()=>{n++;return 'pH 6.00';};const r=c.gerarAnaliseGasometriaComIA('pH 7.40 pCO2 40 HCO3 24');assert.equal(n,1);assert(r.includes('6.00'));assert(!r.includes('7.40'));});
bug('T07 Gasometria inclui cálculo contraditório da IA no mesmo laudo',()=>{const {c}=env();c.executarRaciocinioClinico=()=> 'pH 6.00; ânion gap 99';const r=c.gerarAnaliseGasometriaComIA('pH 7.40 pCO2 40 HCO3 24');assert(r.includes('pH 7.40'));assert(r.includes('pH 6.00'));assert(r.includes('gap 99'));});
bug('T08 orçamento aceita mais de 500 KiB UTF-8 em pedidos',()=>{const {c,props}=env();for(let i=0;i<40;i++)c.enfileirarUpdate({update_id:i,message:{chat:{id:123},text:'界'.repeat(5000)}});const b=Object.entries(props).reduce((n,[k,v])=>n+Buffer.byteLength(k)+Buffer.byteLength(v),0);assert(b>512000);console.log('  Conteúdo UTF-8 aceito no mock: '+b+' bytes');});
bug('T09 poda por pressão apaga dedup de pedido recém-concluído',()=>{const {c,p}=env();let n=0;c.processarMensagemTexto=()=>n++;c.doPost(req('efeito'));for(let i=0;i<44;i++)p.setProperty('existente_'+i,'x'.repeat(8000));c.PersistenciaBot.salvar('outbox_teste',{status:'pending',created:c.Date.now(),payload:{text:'x'}});assert.strictEqual(c.PersistenciaBot.ler('inbox_1'),null);c.doPost(req('efeito'));assert.equal(n,2);});
bug('T10 histórico ordena UUID e descarta registro recente',()=>{const {c,props}=env();let seq=0;c.Utilities.getUuid=()=>String(99999-seq++).padStart(32,'0');for(let n=0;n<12;n++)assert(c.EnfermariaService.atualizarLeito('1','E'+n).sucesso);const hs=Object.entries(props).filter(([k])=>k.startsWith('LEITO_HIST_1_')).map(([,v])=>JSON.parse(v).dados);assert(hs.includes('E0'));assert(!hs.includes('E9'));});
bug('T11 mudança de status ainda cria histórico sem ID do leito',()=>{const {c,props}=env();c.EnfermariaService.atualizarLeito('9','caso');c.EnfermariaService.atualizarStatusLeito('9','estavel');const ks=Object.keys(props).filter(k=>k.startsWith('LEITO_HIST_'));assert.equal(ks.length,1);assert(!ks[0].startsWith('LEITO_HIST_9_'));});
bug('T12 texto de pendência clínica ainda oferece PDF',()=>{const {c,sent}=env();c.processarEEntregarIA(123,()=> '⚠️ Prescrição incompleta: informe peso e alergias.','x','rx');assert(sent.some(x=>JSON.stringify(x.payload).includes('gerarPdfRx_')));});
bug('T13 flag async alegada não evita worker síncrono',()=>{const {c,props,advance}=env();props.TELEGRAM_ASYNC_WORKER='true';let n=0;c.processarMensagemTexto=()=>{n++;advance(20000);};const before=c.Date.now();c.doPost(req('x'));assert.equal(n,1);assert(c.Date.now()-before>=20000);assert(!source.includes('TELEGRAM_ASYNC_WORKER'));});
bug('T14 lease de saída expira com fetch ainda ativo',()=>{const {c,advance}=env();let during;c.UrlFetchApp.fetch=()=>{advance(61000);c.processarCaixaSaida();during=c.PersistenciaBot.ler('outbox_x').status;return {getResponseCode:()=>200,getContentText:()=>'{"ok":true}'};};const item={status:'pending',created:c.Date.now(),next:0,attempts:0,method:'sendMessage',payload:{chat_id:123,text:'x'}};c.PersistenciaBot.salvar('outbox_x',item);c.tentarEntregaTelegram('outbox_x',item);assert.equal(during,'uncertain');});
bug('T15 CHA imprime classificação undefined',()=>{const {c}=env();const r=c.tentarCalcularDeterministico('CHA2DS2-VASc mulher 60 anos HAS');assert(r.includes('Classificação:* undefined'));});
console.log(JSON.stringify({correcoes_confirmadas:fixed,defeitos_reproduzidos:defects,verificacoes_falharam:failed}));process.exitCode=failed?1:0;
