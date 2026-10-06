// Falhas injetadas em rascunho clínico real do experimento; nenhuma rede.
const fs=require('fs'),path=require('path'),vm=require('vm');
const dir=path.resolve(__dirname,'../reviews/comparacao_clinica_2026_10_04');
const raw=JSON.parse(fs.readFileSync(path.join(dir,'P01_candidate_1.json'),'utf8'));
const draft=raw.calls.find(x=>x.phase==='geracao'&&x.status===200).text;
const rows=[];
for(const version of ['baseline','candidate'])for(const scenario of ['indisponivel','ambigua','alerta']){
 const c={Buffer,console:{log(){}},PropertiesService:{getScriptProperties:()=>({getProperties:()=>({}),getProperty:()=>null})},CacheService:{getScriptCache:()=>({get:()=>null,put(){}})},UrlFetchApp:{fetch(){throw Error('Rede proibida');}}};
 vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(dir,version+'.js'),'utf8'),c);
 c._iaExecutar=()=>({indisponivel:null,ambigua:'SEM ALERTAS, mas não foi possível conferir a dose.',alerta:'- Exemplo de alerta de dose para testar o fluxo.'})[scenario];
 const result=c._iaAuditarRascunho(draft,'Caso fictício','teste');
 rows.push({version,scenario,draft_preserved:result.startsWith(draft),returned_unchanged:result===draft,explicit_warning:/auditoria autom[aá]tica (?:indispon[ií]vel|incompleta)|alertas da auditoria autom[aá]tica/i.test(result),result});
}
fs.writeFileSync(path.join(dir,'auditoria_falhas.json'),JSON.stringify(rows,null,2)+'\n');
for(const {result,...r} of rows)console.log(JSON.stringify(r));
