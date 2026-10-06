/* Regressão funcional das correções da oitava rodada. Todos os serviços são simulados. */
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


let total=0, aprovados=0;
function test(nome,fn){total++;try{fn();aprovados++;console.log('OK '+nome);}catch(e){process.exitCode=1;console.error('FALHA '+nome+'\n'+e.stack);}}
const cb=data=>({id:'teste',data,message:{chat:{id:123},message_id:1}});
const textos=sent=>sent.map(x=>x.payload.text||'').join('\n');
const pdf=sent=>sent.some(x=>JSON.stringify(x.payload).includes('gerarPdfRx_'));
function clicarCopia(c,sent){const buttons=sent.flatMap(x=>x.payload.reply_markup ? x.payload.reply_markup.inline_keyboard.flat():[]);const b=buttons.find(x=>(x.callback_data||'').startsWith('ux:copiar:'));assert(b);sent.length=0;c.tratarCallbackUX(cb(b.callback_data));return textos(sent);}
test('SOAP: resposta livre com medidas inventadas não é exportada',()=>{
 const {c,sent}=env();c.executarRaciocinioClinico=()=> 'PA 120x80 mmHg | FC 76 bpm | Tax 36.5 °C. Afebril.';
 c.processarMensagemTexto({chat:{id:123},text:'/soap Tosse há três dias. Sinais vitais não informados.'});
 const out=clicarCopia(c,sent);assert(!out.includes('120x80'));assert(!out.includes('36.5'));assert(out.includes('Sinais vitais não informados'));
});
test('SOAP: objetivo preserva achados reais e rejeita sinais vitais inventados',()=>{
 const {c}=env();const input='Sem febre. PA 160x100 mmHg. Exame não realizado.';
 c.executarRaciocinioClinico=()=>JSON.stringify({objetivo:['PA 120x80 mmHg.','PA 160x100 mmHg.','Sem febre.']});
 const out=c.gerarSOAPComIA(input);
 assert(!out.includes('120x80'));
 const objetivo=out.split('O - Objetivo')[1].split('Perguntas para Completar')[0];
 assert(objetivo.includes('Sem febre.'));
 assert(objetivo.includes('PA 160x100'));
});
test('SOAP: Fase 1 não inclui A nem P e comando explícito gera consolidação',()=>{
 const {c}=env();
 c.executarRaciocinioClinico=()=>JSON.stringify({objetivo:'Exame físico normal.',perguntas:['Qual o início?']});
 const rascunho=c.gerarSOAPComIA('Paciente com tosse há 3 dias.');
 assert(!rascunho.includes('A - Avaliação'));
 assert(!rascunho.includes('P - Plano'));
 assert(rascunho.includes('Qual o início?'));

 c.executarRaciocinioClinico=()=>JSON.stringify({subjetivo:'Tosse há 3 dias.',objetivo:'Ausculta limpa.',avaliacao:['Traqueobronquite'],plano:['Sintomáticos'],pendencias_opcionais:['Aferir SpO2']});
 const fechado=c.gerarSOAPComIA('Paciente com tosse. Faça a avaliação e o plano.');
 assert(fechado.includes('A - Avaliação'));
 assert(fechado.includes('P - Plano'));
 assert(fechado.includes('Traqueobronquite'));
 assert(fechado.includes('Dados adicionais que enriqueceriam o caso'));
});
test('CHA: ordem dos fatores e operadores afirmativos preservam HAS',()=>{
 const {c}=env();for(const op of ['tem','apresenta','possui','com']){
 const out=c.tentarCalcularDeterministico('CHA2DS2-VASc homem 60 anos sem IC, '+op+' HAS, sem DM, sem AVC, sem doença vascular');assert(out.includes('1/9'),op+': '+out);
 }
});
test('CHA: não tem e lista coordenada continuam negadas',()=>{
 const {c}=env();for(const input of ['não tem HAS, sem IC, sem DM, sem AVC, sem doença vascular','sem HAS, IC, DM, AVC ou doença vascular']) assert(c.tentarCalcularDeterministico('CHA2DS2-VASc homem 60 anos '+input).includes('0/9'));
});
test('CHA: fatores omitidos não recebem pontuação final',()=>{
 const {c}=env();for(const input of ['sem IC, tem HAS','sem HAS, sem DM']){const out=c.tentarCalcularDeterministico('CHA2DS2-VASc homem 60 anos '+input);assert(out.includes('Fatores Incompletos'));assert(!/`\d\/9`/.test(out));}
});
for(const comando of ['/ef_neuro','/neuro','/ef','/exames_especiais']) test('Memória: navegação '+comando+' e retorno preservam caso',()=>{
 const {c}=env();let recebeu='';c.executarRaciocinioClinico=(p,d)=>{recebeu=d;return JSON.stringify({checklist:['Verificar força.'],achados:[]});};
 const original='Paciente com fraqueza no braço direito há duas horas.';c.processarMensagemTexto({chat:{id:123},text:'/soap '+original});
 c.processarMensagemTexto({chat:{id:123},text:comando});assert.equal(c.modoBot(123).data,original);
 if(comando.includes('neuro'))assert(recebeu.includes(original));
 c.tratarCallbackUX(cb('ux:usar:soap'));c.processarMensagemTexto({chat:{id:123},text:'Sem febre.'});assert(c.modoBot(123).data.includes(original));assert(c.modoBot(123).data.includes('Sem febre.'));
});
test('Memória: botão EF recebe caso persistente após expiração do cache',()=>{
 const {c,advance}=env();let contexto;c.executarRaciocinioClinico=()=> '{}';c.processarMensagemTexto({chat:{id:123},text:'/soap Caso clínico com fraqueza e cefaleia.'});
 c.gerarGuiaExameFisicoEspecial=(tipo,ctx)=>{contexto=ctx;return 'Guia';};c.processarCallbackBotao(cb('ef_neuro'));assert(contexto.includes('fraqueza'));
 advance(901000);c.processarCallbackBotao(cb('ef_neuro'));assert(contexto.includes('fraqueza'));
 c.limparEstadoBot(123);c.processarCallbackBotao(cb('ef_neuro'));assert.equal(contexto,'');
});
test('Memória: novo continua limpando dados',()=>{const {c}=env();c.definirModoBot(123,'soap','Caso anterior');c.processarMensagemTexto({chat:{id:123},text:'/novo'});assert.equal(c.modoBot(123),null);});
test('EF: copia apenas modelo de referência, sem checklist',()=>{const {c,sent}=env();c.processarMensagemTexto({chat:{id:123},text:'/ef_neuro'});const out=clicarCopia(c,sent);assert(out.includes('[EXAME NEUROLÓGICO]'));assert(out.includes('MODELO DE REFERÊNCIA'));assert(!out.includes('Checklist de Execução'));});
test('EF dirigido: achado inventado não é copiável',()=>{
 const {c,sent}=env();c.definirModoBot(123,'soap','Força reduzida no braço direito.');c.executarRaciocinioClinico=()=>JSON.stringify({checklist:['Examinar força.'],achados:['Força 5/5 nos quatro membros.','Força reduzida no braço direito.']});
 c.processarCallbackBotao(cb('ef_neuro'));const out=clicarCopia(c,sent);assert(out.includes('Força reduzida'));assert(!out.includes('5/5'));assert(!out.includes('Examinar força'));
});
test('Gasometria: metas estruturadas preservadas, valores da amostra separados',()=>{
 const {c}=env();c.executarRaciocinioClinico=()=>JSON.stringify({metas:[{parametro:'pH',valor:'7.30'},{parametro:'pCO2',valor:'35'}],hipoteses:['pH é 6.00','Avaliar contexto clínico.']});
 const out=c.gerarAnaliseGasometriaComIA('pH 7.40 pCO2 40 HCO3 24');assert(out.includes('Meta proposta: pH 7.30'));assert(out.includes('Meta proposta: pCO2 35'));assert(out.includes('pH 7.40'));assert(!out.includes('6.00'));
});
test('Gasometria: linha mista medição/meta não contorna contrato',()=>{
 const {c}=env();c.executarRaciocinioClinico=()=> 'O pH é 6.00; conduta: reavaliar. Meta pCO2 35.';const out=c.gerarAnaliseGasometriaComIA('pH 7.40 pCO2 40 HCO3 24');assert(!out.includes('6.00'));assert(out.includes('não estruturado'));
});
test('Gasometria: meta isolada legada não é reescrita',()=>{const {c}=env();c.executarRaciocinioClinico=()=> 'Meta de pH: 7.30.';const out=c.gerarAnaliseGasometriaComIA('pH 7.40 pCO2 40 HCO3 24');assert(out.includes('Meta proposta: pH 7.30'));});
test('Receita: medicamento genérico ou nome inventado não libera PDF',()=>{
 const {c,sent}=env();for(const t of ['1. Usar medicamento 500 mg','1. Medicamento 500 mg VO 6/6h','1. Xyzfalso 500 mg VO 6/6h']){sent.length=0;assert(!c.validarReceitaTemMedicamentos(t));c.processarEEntregarIA(123,()=>t,'x','rx');assert(!pdf(sent));}
});
test('Receita: apresentação, via ou quantidade isoladas não completam posologia',()=>{const {c}=env();for(const t of ['1. Paracetamol 500 mg','1. Paracetamol 500 mg VO','1. Paracetamol 500 mg - 20 comprimidos'])assert(!c.validarReceitaTemMedicamentos(t),t);});
test('Receita: linhas de posologia compõem o mesmo item, com PDF',()=>{
 const {c,sent}=env();const t='1. Paracetamol 500 mg\n- Posologia: tomar 1 comprimido via oral de 6/6h se dor.';assert(c.validarReceitaTemMedicamentos(t));assert(c.validarReceitaTemMedicamentos(t.replace('\n',' ')));c.processarEEntregarIA(123,()=>t,'x','rx');assert(pdf(sent));
 const html=c.ReceitaPdfService.gerarHtml(t,'04/10/2026','Teste');assert(html.includes('6/6h'));assert(html.includes('Paracetamol'));
});
test('Receita: item incompleto bloqueia independentemente da ordem',()=>{const {c}=env();const a='Paracetamol 500 mg VO 6/6h se dor.',b='Amoxicilina 500 mg';for(const t of ['1. '+a+'\n2. '+b,'1. '+b+'\n2. '+a])assert(!c.validarReceitaTemMedicamentos(t));});
test('Receita: catálogo REMUME em cache amplia identidade validável',()=>{const {c,cache}=env();const t='1. Medicamentoteste 10 mg VO ao dia';assert(!c.validarReceitaTemMedicamentos(t));cache.remume_chunks='1';cache.remume_0='Medicamentoteste 10 mg comprimido';assert(c.validarReceitaTemMedicamentos(t));});
test('PDF: callback antigo não ignora validação de completude',()=>{const {c}=env();let externo=false;c.Utilities.formatDate=()=>{externo=true;throw Error('Não deveria gerar PDF');};const result=c.ReceitaPdfService.processarEEnviarPdf(123,'1. Usar medicamento 500 mg');assert.equal(result.sucesso,false);assert(!externo);});
console.log(aprovados+'/'+total+' testes aprovados');
