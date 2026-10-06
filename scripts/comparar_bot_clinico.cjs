// Avaliação isolada: chamadas externas exclusivamente aos provedores de IA.
const fs=require('fs'),path=require('path'),vm=require('vm'),cp=require('child_process'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'), dir=path.join(root,'reviews/comparacao_clinica_2026_10_04');
const [version,caseId,roundArg]=process.argv.slice(2),round=Number(roundArg||1);
if(!['baseline','candidate'].includes(version))throw Error('Versão inválida');
const cases=JSON.parse(fs.readFileSync(path.join(dir,'casos.json'),'utf8'));
const test=cases.find(x=>x.id===caseId);if(!test)throw Error('Caso inválido');
const output=path.join(dir,`${caseId}_${version}_${round}.json`);
if(fs.existsSync(output)){console.log(JSON.stringify({id:caseId,version,round,estado:'já executado'}));process.exit(0);}
const config=JSON.parse(fs.readFileSync(path.join(root,'.deploy_state.json'),'utf8')).config;
const props={PROVEDOR_TEXTO_PADRAO:'GEMINI',SPREADSHEET_ID_REMUME:'fixture-remume',SPREADSHEET_ID_INTERACOES:'fixture-interacoes'};
for(const k of ['GEMINI_API_KEYS','GEMINI_API_KEY','GROQ_API_KEY','OPENROUTER_API_KEY','ZAI_API_KEY'])if(config[k])props[k]=config[k];
const remume=JSON.parse(fs.readFileSync(path.join(dir,'remume_fixture.json'),'utf8'));
const interacoes=[['Varfarina','Sulfametoxazol + trimetoprima','Pode aumentar anticoagulação; monitorar tempo de protrombina e INR.'],['Enalapril','Sulfametoxazol + trimetoprima','Risco de hipercalemia, aumentado na insuficiência renal; monitorar potássio e função renal.'],['Espironolactona','Sulfametoxazol + trimetoprima','Risco aditivo de hipercalemia.']];
const cache={},calls=[],logs=[],metrics={cache_get:0,cache_getAll:0,cache_put:0,cache_putAll:0,sheets:0};
let seq=0;
const c={Buffer,Date,console:{log(){}},Logger:{log:s=>logs.push(String(s))},
 PropertiesService:{getScriptProperties:()=>({getProperties:()=>({...props}),getProperty:k=>props[k]??null})},
 CacheService:{getScriptCache:()=>({get:k=>{metrics.cache_get++;return cache[k]??null;},getAll:ks=>{metrics.cache_getAll++;return Object.fromEntries(ks.filter(k=>k in cache).map(k=>[k,cache[k]]));},put:(k,v)=>{metrics.cache_put++;cache[k]=String(v);},putAll:o=>{metrics.cache_putAll++;Object.assign(cache,o);},remove:k=>delete cache[k]})},
 SpreadsheetApp:{openById:id=>{metrics.sheets++;const rows=id==='fixture-remume'?remume.map(x=>[x]):interacoes;return {getSheets:()=>[{getLastRow:()=>rows.length+1,getLastColumn:()=>3,getRange:()=>({getValues:()=>rows})}]};}},
 UrlFetchApp:{fetch:(url,opts)=>{
  if(calls.length>=12)throw Error('Limite de requisições da avaliação atingido');
  const payload=JSON.parse(opts.payload||'{}');const model=payload.model||url.match(/models\/([^:]+):/)?.[1];
  const header={...(opts.headers||{})};if(opts.contentType)header['Content-Type']=opts.contentType;
  const start=Date.now();const res=cp.spawnSync('python3',[path.join(root,'scripts/avaliacao_clinica_bridge.py')],{input:JSON.stringify({url,method:opts.method||'POST',headers:header,payload:opts.payload}),encoding:'utf8',timeout:50000,maxBuffer:4*1024*1024});
  if(res.status!==0)throw Error('Transporte da avaliação não concluiu');
  const raw=JSON.parse(res.stdout);let parsed={};try{parsed=JSON.parse(raw.body||'{}');}catch{}
  const sys=payload.systemInstruction?.parts?.[0]?.text||payload.messages?.[0]?.content||'';
  const user=payload.contents?.[0]?.parts?.[0]?.text||payload.messages?.[1]?.content||'';
  const phase=sys.includes('auditor de segurança')?'auditoria':'geracao';
  calls.push({phase,model,resolved_model:parsed.modelVersion||parsed.model||null,host:new URL(url).host,status:raw.status,http_ms:raw.http_ms,bridge_ms:Date.now()-start,prompt_sha256:crypto.createHash('sha256').update(sys+'\n'+user).digest('hex'),prompt_chars:sys.length+user.length,usage:parsed.usageMetadata||parsed.usage||null,finish:parsed.candidates?.[0]?.finishReason||parsed.choices?.[0]?.finish_reason||null,text:(parsed.candidates?.[0]?.content?.parts||[]).filter(x=>x.text&&!x.thought).map(x=>x.text).join('')||parsed.choices?.[0]?.message?.content||'',groundingMetadata:parsed.candidates?.[0]?.groundingMetadata||null,error:raw.error||parsed.error?.status||null});
  if(!raw.status)throw Error('Falha de transporte: '+raw.error);
  return {getResponseCode:()=>raw.status,getContentText:()=>raw.body,getAllHeaders:()=>raw.headers};
 }}
};
vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(dir,version+'.js'),'utf8'),c);
c.Utilities.getUuid=()=>`eval-${++seq}`;
c.Utilities.sleep=ms=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms);
// Bloqueios adicionais: nenhuma entrega, persistência externa ou alteração de agenda.
for(const fn of ['enviarMensagemParaChat','enviarMensagemSegmentada','enviarMensagemComTecladoParaChat','enviarChatAction','executarPostTelegram','criarTarefaNotion','criarEventoAgendaGoogle'])c[fn]=()=>{throw Error('Efeito externo proibido na avaliação');};
const start=Date.now();let result=null,error=null;
try{
 if(test.mode==='rx')result=c.gerarPrescricaoComIA(test.input);
 else if(test.mode==='interacao')result=c.verificarInteracaoComIA(test.input);
 else if(test.mode==='soap')result=c.gerarSOAPComIA(test.input);
 else if(test.mode==='grounding')result=c.chamarGeminiPoolComGrounding(c.IA_PERSONA+'\nResponda a pergunta clínica e cite as fontes efetivamente consultadas.',test.input,2500);
 else throw Error('Modo inválido');
}catch(e){error=e.message;}
const total_ms=Date.now()-start;
let pdf_eligible=null;
if(test.mode==='rx'&&result)pdf_eligible=c.validarReceitaTemMedicamentos(String(result));
const record={id:caseId,version,round,synthetic:true,mode:test.mode,created:new Date().toISOString(),total_ms,http_ms:calls.reduce((n,x)=>n+x.http_ms,0),calls,metrics,pdf_eligible,result,error,censored:logs.some(x=>x.includes("Limite de requisições da avaliação")),logs};
// Defesa final contra exposição acidental de credenciais nos artefatos.
let serialized=JSON.stringify(record,null,2);
for(const [key,value] of Object.entries(props))if(/API_KEY/.test(key)){
 let values;try{values=JSON.parse(value);}catch{values=String(value).split(',');}
 for(const secret of Array.isArray(values)?values:[values])if(secret)serialized=serialized.split(String(secret)).join('[REDACTED]');
}
fs.writeFileSync(output,serialized+'\n');
console.log(JSON.stringify({id:caseId,version,round,total_ms,calls:calls.length,statuses:calls.map(x=>x.status),models:[...new Set(calls.filter(x=>x.status===200).map(x=>x.model))],resultado:!!result,erro:error}));
