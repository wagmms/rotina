// Reproduz a apresentação de respostas REAIS já obtidas, sem qualquer nova chamada externa.
const fs=require('fs'),path=require('path'),vm=require('vm');
const dir=path.resolve(__dirname,'../reviews/comparacao_clinica_2026_10_04');
const rows=[];
for(const name of fs.readdirSync(dir).filter(n=>/^[A-Z]\d{2}_(baseline|candidate)_[123]\.json$/.test(n))){
 const r=JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));if(!r.result||r.mode!=='rx')continue;
 const store={},sent=[];const c={Buffer,console:{log(){}},PropertiesService:{getScriptProperties:()=>({getProperties:()=>({}),getProperty:()=>null})},CacheService:{getScriptCache:()=>({get:k=>store[k]??null,put:(k,v)=>store[k]=String(v),remove:k=>delete store[k]})},UrlFetchApp:{fetch(){throw Error('Rede proibida');}}};
 vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(dir,r.version+'.js'),'utf8'),c);
 c.enviarChatAction=()=>{};
 c.enviarMensagemComTecladoParaChat=(id,text,kb)=>{sent.push({text,kb});return true;};
 c.enviarMensagemSegmentada=c.enviarMensagemComTecladoParaChat;
 c.enviarMensagemParaChat=(id,text)=>{sent.push({text});return true;};
 c.processarEEntregarIA('teste',()=>r.result,'Caso fictício','rx');
 const invalidItems=c.analisarItensReceita(r.result).filter(x=>!x.completo);
 rows.push({file:name,pdf_button:sent.some(s=>(s.kb?.inline_keyboard||[]).flat().some(b=>b.callback_data?.startsWith('gerarPdfRx_'))),parsed_invalid_items:invalidItems});
}
fs.writeFileSync(path.join(dir,'entrega_replay.json'),JSON.stringify(rows,null,2)+'\n');
for(const r of rows)console.log(JSON.stringify({file:r.file,pdf_button:r.pdf_button,invalid_items:r.parsed_invalid_items.map(x=>x.nome)}));
