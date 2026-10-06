/* Reproduções da auditoria: confirmam defeitos presentes, não são gabaritos de regressão.
 * Executar: node reviews/auditoria_2026_10_04_repro.cjs
 * Nenhuma rede, credencial real ou alteração no código auditado.
 */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const source = fs.readFileSync(path.resolve(__dirname, '../ultra_rotina_master.js'), 'utf8');
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
    UrlFetchApp:{fetch:(url,opts)=>{sent.push({url,payload:JSON.parse(opts.payload||'{}')});return {getResponseCode:()=>200,getContentText:()=>' {"ok":true}'};}}};
  vm.createContext(c);vm.runInContext(source,c);
  c.Utilities.getUuid=()=>String(++seq).padStart(32,'0'); c.Utilities.sleep=()=>{};
  return {c,props,cache,sent,p,advance:n=>now+=n,setHook:h=>hook=h};
}
const req=(text,id=1)=>({parameter:{secret:'secret'},postData:{contents:JSON.stringify({update_id:id,message:{chat:{id:123},text}})}});
const cb=data=>({id:'cb',data,message:{chat:{id:123},message_id:1}});
let count=0;
function test(name,fn){fn();console.log('REPRODUZIDO: '+name);count++;}
test('REMUME: expansão autorreferente não termina',()=>{
 const {c}=env();c.base=Array.from({length:36},(_,i)=>'Medicamento '+i).join('\n');
 assert.throws(()=>vm.runInContext('filtrarMedicamentosRelevantes(base,"omeprazol")',c,{timeout:150}),/timed out/);
});
test('Nora concentrada: 128 mcg/mL com preparo textual de 64 mcg/mL',()=>{
 const {c}=env(),r=c.CalculadorasClinicas.drogasVasoativas('nora',70,'concentrada');
 assert.equal(r.dados.concentracao,128);assert(r.preparo.includes('64 mcg/mL'));assert.equal(r.tabela[1].mlH,3.3);
});
test('Vasopressina: campo legado 12 mL/h, dose fixa no texto equivale a 9',()=>{
 const {c}=env(),r=c.CalculadorasClinicas.drogasVasoativas('vaso');
 assert.equal(r.taxaMlH,12);assert.equal(r.tabela.find(x=>x.dose===0.03).mlH,9);
});
test('KDIGO: anúria 12h recebe estágio 2',()=>{const {c}=env();assert.equal(c.CalculadorasClinicas.estadiamentoKDIGO(1,1,0,12).dados.estagio,2);});
test('KDIGO: DU 0,4 por 24h recebe estágio 3',()=>{const {c}=env();assert.equal(c.CalculadorasClinicas.estadiamentoKDIGO(1,1,0.4,24).dados.estagio,3);});
test('KDIGO: sem basal nem diurese recebe ausência de IRA',()=>{const {c}=env(),r=c.CalculadorasClinicas.estadiamentoKDIGO(5,null,null,null);assert(r.ok);assert.equal(r.dados.estagio,0);});
test('CHA2DS2-VASc: payload 2/9, renderização mantém 1/8',()=>{
 const {c}=env(),r=c.CalculadorasClinicas.cha2ds2vasc(false,true,false,false,false,false,false,true);
 assert.equal(r.pontuacao,2);assert(r.texto.includes('1/8'));assert.equal(r.icone,'🟠');
});
test('Glasgow-P: pupilas não informadas viram zero',()=>{const {c}=env(),r=c.CalculadorasClinicas.glasgowP(4,5,6,null);assert(r.ok);assert(r.texto.includes('Pupilas não reagentes: 0/2'));});
test('SRI: seleção de fármacos não restringe cartão',()=>{
 const {c}=env(),r=c.CalculadorasClinicas.sequenciaRapidaIntubacao(70,'choque','etomidato','rocuronio','nenhum');
 assert(r.texto.includes('Fentanil'));assert(r.texto.includes('Succinilcolina'));assert(r.texto.includes('Quetamina'));
});
test('/calc clearance ainda chama IA',()=>{
 const {c}=env();let seen; c.enviarChatAction=()=>{};c.processarEEntregarIA=(chat,fn,data)=>{seen={fn,data};};
 c.processarMensagemTexto({chat:{id:123},text:'/calc clearance Cr 1, peso 70, idade 60, masculino'});
 assert.equal(seen.fn,c.processarCalculadoraClinicaComIA);
});
test('Gasometria inválida ainda chega à IA com resultados undefined',()=>{
 const {c}=env();let seen;c.executarRaciocinioClinico=(s,p)=>{seen=p;return 'fake';};
 c.gerarAnaliseGasometriaComIA('pH 7.2 pCO2 0 HCO3 10');assert(seen.includes('pH: undefined'));
});
test('Gasometria: atualização mantém primeiro pH',()=>{
 const {c}=env();let seen;c.executarRaciocinioClinico=(s,p)=>{seen=p;return 'fake';};
 c.gerarAnaliseGasometriaComIA('pH 7.20 pCO2 30 HCO3 12\nAtualização: pH 7.40 pCO2 40 HCO3 24');assert(seen.includes('- pH: 7.2'));
});
test('Linguagem natural: concentrada é ignorada',()=>{
 const {c}=env();let args;c.enviarChatAction=()=>{};c.enviarMensagemParaChat=()=>true;
 c.CalculadorasClinicas.drogasVasoativas=(...a)=>{args=a;return {textoFormatado:'fake'};};
 c.processarMensagemTexto({chat:{id:123},text:'noradrenalina concentrada paciente peso 70 kg'});assert.equal(args.length,2);
});
test('Webhook chama worker antes de retornar',()=>{
 const {c}=env();const seq=[];c.enfileirarUpdate=()=>seq.push('persistir');c.processarFilaTelegram=()=>seq.push('worker');
 c.doPost(req('x'));seq.push('retorno');assert.equal(seq.join(','),'persistir,worker,retorno');
});
test('POST configure dispensa corpo, chat e update_id',()=>{
 const {c}=env();let n=0;c.configurarWebhookTelegram=()=>n++;c.configurarMenuTelegram=()=>n++;
 c.doPost({parameter:{secret:'secret',action:'configure'}});assert.equal(n,2);
});
test('GET clean apaga pedido pending com 11 minutos',()=>{
 const {c}=env();c.PersistenciaBot.salvar('inbox_1',{status:'pending',created:c.Date.now()-660000});
 c.doGet({parameter:{secret:'secret',action:'clean'}});assert.equal(c.PersistenciaBot.ler('inbox_1'),null);
});
test('Replay: mesmo update executa novamente após limpeza de 31 min',()=>{
 const {c,advance}=env();let n=0;c.processarMensagemTexto=()=>n++;c.doPost(req('x'));advance(1860000);c.processarFilaTelegram();c.doPost(req('x'));assert.equal(n,2);
});
test('Leitura chunk concorrente com substituição encontra versão removida',()=>{
 const {c,setHook}=env();c.PersistenciaBot.salvar('obj',{s:'antigo'});let fired=false;
 setHook(k=>{if(!fired&&k.startsWith('obj:')){fired=true;setHook(null);c.PersistenciaBot.salvar('obj',{s:'novo'});}});
 assert.throws(()=>c.PersistenciaBot.ler('obj'),/incompletos/);assert.equal(c.PersistenciaBot.ler('obj').s,'novo');
});
test('Outbox: snapshot pending antigo permite segundo envio',()=>{
 const {c,sent}=env();c.PersistenciaBot.salvar('outbox_x',{status:'pending',method:'sendMessage',payload:{chat_id:123,text:'x'},created:c.Date.now(),next:0,attempts:0});
 const a=c.PersistenciaBot.ler('outbox_x'),b=c.PersistenciaBot.ler('outbox_x');c.tentarEntregaTelegram('outbox_x',a);c.tentarEntregaTelegram('outbox_x',b);assert.equal(sent.length,2);
});
test('Histórico de leito cresce além de 500 KB sem orçamento global',()=>{
 const {c,props}=env();for(let i=0;i<80;i++)assert(c.EnfermariaService.atualizarLeito('1','x'.repeat(7000)).sucesso);
 const bytes=Object.entries(props).reduce((s,[k,v])=>s+Buffer.byteLength(k)+Buffer.byteLength(v),0);assert(bytes>512000);
});
test('Falha retornada pelo Notion termina inbox done e apaga texto',()=>{
 const {c}=env();c.criarTarefaNotion=()=>false;c.doPost(req('/task texto sintético'));const j=c.PersistenciaBot.ler('inbox_1');assert.equal(j.status,'done');assert(!j.update.message);
});
test('Hábitos confirmados apesar de PATCH falhar',()=>{
 const {c}=env();c.obterOuCriarPaginaHabitLog=()=>'page';c.atualizarCheckboxNotion=()=>null;assert.equal(c.marcarHabitoProativoHoje('treinei').length,1);
});
test('/tasks reporta tudo zerado quando consulta falha',()=>{
 const {c}=env();let msg;c.chamarNotionAPI=()=>null;c.enviarMensagemParaChat=(id,t)=>msg=t;c.listarTarefasHojeNotion(123);assert(msg.includes('Tudo zerado'));
});
test('HabitLog cria página após falha ao consultar',()=>{
 const {c}=env();c.ConfigService.get=k=>k==='NOTION_HABIT_LOG_DB_ID'?'db':null;let creates=0;
 c.chamarNotionAPI=url=>{if(url.endsWith('/pages')){creates++;return {id:'new'};}return null;};c.obterOuCriarPaginaHabitLog('2026-10-04');assert.equal(creates,1);
});
test('Novo SOAP conserva destino de evolução de leito pendente',()=>{
 const {c}=env();c.enviarMensagemParaChat=()=>true;c.enviarMensagemComTecladoParaChat=()=>true;let seen;
 c.EnfermariaService.atualizarLeito=(id,data)=>{seen={id,data};return {mensagem:'ok'};};
 c.aguardarEvolucaoLeito(123,'4');c.processarMensagemTexto({chat:{id:123},text:'🩺 Novo SOAP'});c.processarMensagemTexto({chat:{id:123},text:'CASO NOVO'});assert.equal(seen.id,'4');assert.equal(seen.data,'CASO NOVO');
});
test('Botão antigo de status altera novo ocupante do leito',()=>{
 const {c}=env();c.EnfermariaService.atualizarLeito('1','Paciente A');c.EnfermariaService.desocuparLeito('1');c.EnfermariaService.atualizarLeito('1','Paciente B');c.processarCallbackBotao(cb('ux:status:1:estavel'));assert(c.EnfermariaService.obterLeito('1').status.includes('Estável'));
});
test('Status não confirmado é contado como estável',()=>{
 const {c}=env();c.EnfermariaService.atualizarLeito('1','sem status informado');assert(c.EnfermariaService.formatarPainelBordo().includes('1 estáveis'));
});
test('PDF sobrescreve posologia multilinha e presume via oral',()=>{
 const {c}=env(),html=c.ReceitaPdfService.gerarHtml('Paciente: TESTE\n1. Medicamento TESTE\nTomar 1 comprimido pela manhã\nTomar 2 comprimidos à noite','04/10/2026','TESTE');
 assert(!html.includes('Tomar 1 comprimido'));assert(html.includes('Tomar 2 comprimidos'));assert(html.includes('USO ORAL'));
});
test('PDF injeta HTML recebido e remove rótulo de rascunho',()=>{
 const {c}=env(),html=c.ReceitaPdfService.gerarHtml('💊 PRESCRIÇÃO AMBULATORIAL - RASCUNHO\n1. Teste <span style="display:none">dose</span>\nTomar 1 comprimido','04/10/2026','TESTE');
 assert(html.includes('<span style="display:none">'));assert(!html.includes('RASCUNHO'));
});
test('PDF retorna sucesso sem Drive e com envio Telegram falho',()=>{
 const {c}=env();c.enviarDocumentoTelegram=()=>false;const r=c.ReceitaPdfService.processarEEnviarPdf(123,'1. TESTE\nTomar conforme revisão');assert(r.sucesso);assert(!r.enviadoTelegram);assert.equal(r.linkDrive,'');
});
test('Erro REMUME recebe botão de gerar receita PDF',()=>{
 const {c,sent}=env();c.processarEEntregarIA(123,()=> '❌ Erro ao acessar a base de dados (remume).','x','rx');
 const message=sent.find(x=>x.payload.text);assert(message.payload.reply_markup.inline_keyboard.flat().some(b=>b.callback_data.startsWith('gerarPdfRx_')));
});
test('Calculadora HTML enviada com parse_mode Markdown',()=>{
 const {c,sent}=env();c.processarMensagemTexto({chat:{id:123},text:'/dva nora 70'});const p=sent.find(x=>x.payload.text).payload;assert.equal(p.parse_mode,'Markdown');assert(p.text.includes('<b>'));
});
test('Botão Copiar Texto Limpo não utiliza copy_text',()=>{
 const {c,sent}=env();c.enviarChatAction=()=>{};c.processarEEntregarIA(123,()=> 'Texto curto','x','soap');
 const b=sent[0].payload.reply_markup.inline_keyboard[0][0];assert(b.callback_data.startsWith('ux:copiar:'));assert(!b.copy_text);
});
test('botoesBot não valida callback em objeto nativo',()=>{
 const {c}=env(),b=c.botoesBot([[{text:'x',callback_data:'á'.repeat(40)}]]);assert(Buffer.byteLength(b.inline_keyboard[0][0].callback_data)>64);
});
test('Segmentação corta palavra e cópia pode cortar surrogate pair',()=>{
 const {c}=env();assert.equal(c.fragmentarTexto('abc defghij',7)[0],'abc def');const r=c.uxDividirTexto('aaa😀zzz',4);assert.equal(r[0].charCodeAt(3),0xD83D);
});
test('Cache REMUME parcialmente evicto retorna base incompleta',()=>{
 const {c,cache}=env();cache.remume_chunks='2';cache.remume_0='apenas primeira parte';assert.equal(c.obterPlanilha('remume','fake',false),'apenas primeira parte');
});
test('Fallback de edição não recebe descrição do erro',()=>{
 const {c,sent}=env();c.UrlFetchApp.fetch=(url,opts)=>{sent.push({url});return {getResponseCode:()=>400,getContentText:()=>JSON.stringify({ok:false,description:"Bad Request: message can't be edited"})};};
 assert.equal(c.enviarTelaBot(123,'tela',c.botoesBot([]),1),false);assert.equal(sent.length,1);
});
console.log('TOTAL: '+count+' cenários reproduzidos.');
