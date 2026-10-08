const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const source = require('./source_producao.cjs');

function env({ legacy = false } = {}) {
  const store = {}, props = {SPREADSHEET_ID_REMUME:'remume-id', SPREADSHEET_ID_INTERACOES:'interacoes-id', GEMINI_API_KEY:'fake'};
  const ops = {get:0, getAll:0, put:0, putAll:0, sheet:0, fetch:0};
  const sheets = {'remume-id':[['FarmacoTeste 10 mg comprimido']], 'interacoes-id':[['A', 'B', 'alerta']]};
  const ttl = {}, logs = [], writes = [];
  let sequence = 0, failWrites = false, failCache = false, putHook = null, getHook = null, response = null;
  const cache = {
    get(k) {ops.get++; if (failCache) throw Error('cache offline'); if (getHook) getHook(k); return store[k] ?? null;},
    put(k,v,t) {ops.put++; if (failWrites) throw Error('quota'); store[k]=String(v); ttl[k]=t; writes.push(k); if(putHook)putHook(k);},
    remove(k) {delete store[k];}
  };
  if (!legacy) {
    cache.getAll = keys => {ops.getAll++; if (failCache)throw Error('offline'); return Object.fromEntries(keys.filter(k=>k in store).map(k=>[k,store[k]]));};
    cache.putAll = (obj,t) => {ops.putAll++; Object.keys(obj).forEach(k=>{if(failWrites)throw Error('quota');store[k]=obj[k];ttl[k]=t;writes.push(k);if(putHook)putHook(k);});};
  }
  const c = {
    Buffer, console, Date,
    Logger: {log:s=>logs.push(s)},
    PropertiesService: {getScriptProperties:()=>({getProperties:()=>({...props}),getProperty:k=>props[k]??null})},
    CacheService: {getScriptCache:()=>cache},
    SpreadsheetApp: {openById(id) {ops.sheet++;if(!sheets[id])throw Error('sheet offline');return {getSheets:()=>[{getLastRow:()=>sheets[id].length+1,getLastColumn:()=>3,getRange:()=>({getValues:()=>sheets[id]})}]};}},
    UrlFetchApp: {fetch(url,options) {ops.fetch++; return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(response || {candidates:[{content:{parts:[{text:'Resposta clínica completa.'}]},finishReason:'STOP'}]})};}}
  };
  vm.createContext(c); vm.runInContext(source,c);
  c.Utilities.getUuid=()=>`test-${++sequence}`;
  c.Utilities.sleep=()=>{};
  return {c,store,props,ops,sheets,ttl,writes,logs,
    resetOps(){Object.keys(ops).forEach(k=>ops[k]=0);},
    cold(){c._cachePlanilhasExecucao={}; c._fontesPlanilhasExecucao={};},
    failWrites:v=>failWrites=v, failCache:v=>failCache=v,
    putHook:h=>putHook=h, getHook:h=>getHook=h, response:r=>response=r};
}
let count=0,pass=0;
function test(name,fn){count++;try{fn();pass++;console.log('OK '+name);}catch(e){process.exitCode=1;console.error('FALHA '+name+'\n'+e.stack);}}

test('validação reutiliza a REMUME integral L1 sem operações remotas',()=>{
 const e=env();e.c.obterPlanilha('remume','remume-id',false);e.resetOps();
 assert(e.c.validarReceitaTemMedicamentos('1. FarmacoTeste 10 mg VO ao dia'));
 assert.equal(Object.values(e.ops).reduce((a,b)=>a+b),0);
});
test('validação em outra execução lê manifesto e lote, sem Sheets',()=>{
 const e=env();e.c.obterPlanilha('remume','remume-id',false);e.cold();e.resetOps();
 assert(e.c.validarReceitaTemMedicamentos('1. FarmacoTeste 10 mg VO ao dia'));
 assert.equal(e.ops.get,1);assert.equal(e.ops.getAll,1);assert.equal(e.ops.sheet,0);
});
test('aquecimento recarrega ambas as fontes mesmo com cache e L1 válidos',()=>{
 const e=env();e.c.aquecerCachePlanilhas(); const before=e.store.remume_chunks;
 e.sheets['remume-id']=[['OutroFarmaco 20 mg']];e.resetOps();e.c.aquecerCachePlanilhas();
 assert.equal(e.ops.sheet,2);assert.notEqual(e.store.remume_chunks,before);
 e.cold();assert.equal(e.c.obterPlanilha('remume','remume-id',false),'OutroFarmaco 20 mg');
 assert.equal(e.ttl.remume_chunks,21600);
});
test('manifesto só muda depois de gravadas todas as partes; leitor vê versão antiga inteira',()=>{
 const e=env();e.c.obterPlanilha('remume','remume-id',false);const old=e.store.remume_chunks;
 const text='Á💊'.repeat(18000); e.sheets['remume-id']=[[text]];
 e.putHook(k=>{if(k!=='remume_chunks'){assert.equal(e.store.remume_chunks,old);e.cold();assert.equal(e.c.lerPlanilhaEmCache('remume','remume-id',false),'FarmacoTeste 10 mg comprimido');}});
 assert.equal(e.c.obterPlanilha('remume','remume-id',false,true),text);
 e.putHook(null);e.cold();assert.equal(e.c.obterPlanilha('remume','remume-id',false),text);
 const m=JSON.parse(e.store.remume_chunks);
 for(let i=0;i<m.n;i++){const t=e.store[`remume_${m.geracao}_${i}`];assert(Buffer.byteLength(t,'utf8')<100000);assert(!/[\uD800-\uDBFF]$/.test(t));}
});
test('falha parcial de escrita mantém manifesto antigo e leitura clínica fresca em RAM',()=>{
 const e=env();e.c.obterPlanilha('remume','remume-id',false);const old=e.store.remume_chunks;
 e.sheets['remume-id']=[['Novo'.repeat(10000)]];
 e.putHook(k=>{if(k!=='remume_chunks')e.failWrites(true);});
 assert.throws(()=>e.c.obterPlanilha('remume','remume-id',false,true));
 assert.equal(e.store.remume_chunks,old);assert.equal(e.c.lerPlanilhaEmCache('remume','remume-id',false),'Novo'.repeat(10000));
});
test('fragmento ausente provoca recarga integral, sem misturar versões',()=>{
 const e=env();e.c.obterPlanilha('remume','remume-id',false);
 const m=JSON.parse(e.store.remume_chunks);delete e.store[`remume_${m.geracao}_0`];e.cold();
 e.sheets['remume-id']=[['Atual 50 mg']];e.resetOps();assert.equal(e.c.obterPlanilha('remume','remume-id',false),'Atual 50 mg');assert.equal(e.ops.sheet,1);
});
test('conteúdo encurtado é rejeitado pelo tamanho do manifesto',()=>{
 const e=env();e.c.obterPlanilha('remume','remume-id',false);const m=JSON.parse(e.store.remume_chunks);
 e.store[`remume_${m.geracao}_0`]='parcial';e.cold();e.resetOps();
 assert.equal(e.c.obterPlanilha('remume','remume-id',false),'FarmacoTeste 10 mg comprimido');assert.equal(e.ops.sheet,1);
});
test('base vazia atualizada não ressuscita os medicamentos antigos',()=>{
 const e=env();e.c.obterPlanilha('remume','remume-id',false);e.sheets['remume-id']=[];
 assert.equal(e.c.obterPlanilha('remume','remume-id',false,true),'');e.cold();e.resetOps();
 assert.equal(e.c.obterPlanilha('remume','remume-id',false),'');assert.equal(e.ops.sheet,0);
 assert(!e.c.validarReceitaTemMedicamentos('1. FarmacoTeste 10 mg VO ao dia'));
});
test('troca de fonte não reutiliza L1 nem manifesto da planilha anterior',()=>{
 const e=env();e.c.obterPlanilha('remume','remume-id',false);e.sheets.nova=[['Nova 30 mg']];
 assert.equal(e.c.obterPlanilha('remume','nova',false),'Nova 30 mg');assert.equal(e.ops.sheet,2);
});
test('cache indisponível não impede leitura completa da fonte',()=>{
 const e=env();e.failCache(true);e.failWrites(true);
 assert.equal(e.c.obterPlanilha('remume','remume-id',false),'FarmacoTeste 10 mg comprimido');
});
test('aquecimento tenta a segunda base se a primeira falhar',()=>{
 const e=env();delete e.sheets['remume-id'];assert.throws(()=>e.c.aquecerCachePlanilhas());assert(e.store.interacoes_chunks);
});
test('formato legado e serviços sem operações em lote permanecem compatíveis',()=>{
 const e=env({legacy:true});e.store.remume_chunks='2';e.store.remume_0='Parte A';e.store.remume_1=' + B';
 assert.equal(e.c.obterPlanilha('remume','remume-id',false),'Parte A + B');
 e.c.obterPlanilha('remume','remume-id',false,true);e.cold();
 assert.equal(e.c.obterPlanilha('remume','remume-id',false),'FarmacoTeste 10 mg comprimido');
});
test('filtro preserva todas as correspondências e o fármaco explícito após linha 40',()=>{
 const e=env();const lines=Array.from({length:60},(_,i)=>`Medicamento${i} 10 mg comprimido`).concat('MedicamentoAlvo 20 mg comprimido');
 const r=e.c.filtrarMedicamentosRelevantes(lines.join('\n'),'MedicamentoAlvo comprimido');
 for(const line of lines)assert(r.includes(line));
});
test('ausência de match retorna base inteira, inclusive depois da linha 50',()=>{
 const e=env();const base=Array.from({length:80},(_,i)=>`Farmaco${i} 10 mg`).join('\n');
 assert.equal(e.c.filtrarMedicamentosRelevantes(base,'solicitação desconhecida'),base);
});
test('interações relevantes posteriores à linha 40 chegam ao prompt',()=>{
 const e=env();e.c.obterPlanilha=()=>Array.from({length:60},(_,i)=>`farmacox | farmacoy${i} | alerta${i}`).join('\n');
 let prompt;e.c.executarRaciocinioClinico=(s)=>{prompt=s;return 'Análise';};
 e.c.verificarInteracaoComIA('farmacox');assert(prompt.includes('alerta59'));
});
test('auditoria indisponível ou exceção preserva rascunho e explicita revisão pendente',()=>{
 const e=env();for(const f of [()=>null,()=>'',()=>{throw Error('offline');}]){
 e.c._iaExecutar=f;const r=e.c._iaAuditarRascunho('Rascunho original','Caso','teste');
 assert(r.startsWith('Rascunho original'));assert(r.includes('Auditoria automática indisponível'));assert(e.c.auditoriaClinicaPendente(r));}
});
test('SEM ALERTAS só é aceito integralmente; ressalvas não desaparecem',()=>{
 const e=env();e.c._iaExecutar=()=> 'SEM ALERTAS';assert.equal(e.c._iaAuditarRascunho('Rascunho','Caso','teste'),'Rascunho');
 e.c._iaExecutar=()=> 'SEM ALERTAS, mas faltam dados';const r=e.c._iaAuditarRascunho('Rascunho','Caso','teste');assert(r.includes('faltam dados'));assert(e.c.auditoriaClinicaPendente(r));
});
test('auditor recebe exatamente a lista fornecida ao gerador',()=>{
 const e=env();let prompt,options;e.c._iaExecutar=(s,p,t,o)=>{prompt=p;options=o;return 'SEM ALERTAS';};
 e.c._iaAuditarRascunho('Rascunho','Caso','teste','FarmacoTeste 10 mg');assert(prompt.includes('FarmacoTeste 10 mg'));assert(options.exigirRespostaCompleta);
});
test('resposta truncada da auditoria não é aceita como completa',()=>{
 const e=env();e.c._iaChamarProvedor=()=>({texto:'SEM ALERTAS',truncado:true});
 assert.equal(e.c._iaExecutar('s','p',600,{exigirRespostaCompleta:true}),null);
});
test('alerta da auditoria ou revisão indisponível bloqueia PDF mesmo em callback antigo',()=>{
 const e=env();e.c.enviarMensagemParaChat=()=>true;
 for(const audit of ['Auditoria automática indisponível — revisão pendente','Alertas da auditoria automática (prescricao) — revisão pendente']){
 const rx='1. Dipirona 500 mg VO ao dia\n\n'+audit;
 assert(!e.c.validarReceitaTemMedicamentos(rx));const result=e.c.ReceitaPdfService.processarEEnviarPdf('123',rx);assert.equal(result.sucesso,false);}
});
test('saída não farmacológica não consulta catálogo de receita',()=>{
 const e=env();e.c.enviarChatAction=()=>{};e.c.enviarMensagemComTecladoParaChat=()=>true;
 e.c.validarReceitaTemMedicamentos=()=>{throw Error('consulta indevida');};
 assert(e.c.processarEEntregarIA('123',()=> 'Passagem clínica completa','Caso','plantao'));
});
test('grounding mantém fontes e associação exata em uma única requisição',()=>{
 const e=env();e.response({candidates:[{content:{parts:[{text:'Afirmação clínica.'}]},finishReason:'STOP',groundingMetadata:{
 groundingChunks:[{web:{uri:'https://exemplo.org/diretriz_atual',title:'Diretriz'}}],
 groundingSupports:[{segment:{text:'Afirmação clínica.'},groundingChunkIndices:[0]}]}}]});
 const result=e.c.chamarGeminiPoolComGrounding('sistema','caso',2500,{exibirFontes:true});assert.equal(e.ops.fetch,1);
 assert(result.includes('Afirmação clínica. [1]'));assert(result.includes('https://exemplo.org/diretriz_atual'));
 assert(e.c.limparMarkdownTelegram(e.c._iaFinalizarTexto(result)).includes('https://exemplo.org/diretriz_atual'));
});
test('metadados ausentes ou inválidos não criam referências falsas',()=>{
 const e=env();assert(e.c._iaAcrescentarFontesBusca('Texto',null).includes('não retornou referências'));
 const r=e.c._iaAcrescentarFontesBusca('Texto',{groundingChunks:[{web:{uri:'javascript:alert(1)'}}]});
 assert(!r.includes('javascript:'));assert(r.includes('não retornou referências'));
});
test('trecho ausente ou repetido não recebe associação inventada',()=>{
 const e=env();const r=e.c._iaAcrescentarFontesBusca('Mesmo. Mesmo.',{groundingChunks:[{web:{uri:'https://exemplo.org',title:'Fonte'}}],groundingSupports:[{segment:{text:'Mesmo.'},groundingChunkIndices:[0]},{segment:{text:'Ausente'},groundingChunkIndices:[0]}]});
 assert(r.startsWith('Mesmo. Mesmo.\n'));assert(!r.includes('Mesmo. [1]'));
});
console.log(`${pass}/${count} testes de otimização com preservação de qualidade aprovados`);
