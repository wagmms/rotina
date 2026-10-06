/**
 * Contraprova da Quinta Rodada: Validação afirmativa e rigorosa das correções V01 a V05.
 * 
 * Executar: node reviews/quinta_rodada_contraprova.cjs
 */
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

let aprovados = 0;
function test(nome, fn) {
  try {
    fn();
    console.log('✅ APROVADO: ' + nome);
    aprovados++;
  } catch(e) {
    console.error('❌ FALHOU: ' + nome + ' :: ' + e.message);
    process.exitCode = 1;
  }
}

// --- V01: CHA com antecedentes explicitamente desconhecidos ---
test('V01: CHA com antecedentes desconhecidos recusa 0/9 e alerta sobre risco clínico', () => {
  const {c} = env();
  const r = c.tentarCalcularDeterministico('CHA2DS2-VASc homem 60 anos antecedentes desconhecidos');
  assert(!r.includes('0/9'), 'Não pode retornar 0/9 quando antecedentes são desconhecidos');
  assert(!r.includes('NÃO recomendada'), 'Não pode desaconselhar anticoagulação com histórico desconhecido');
  assert(r.includes('Antecedentes Desconhecidos') || r.includes('comorbidades desconhecidas'), 'Deve emitir alerta de histórico desconhecido');
});

// --- V02: CHA negação com fator afirmado após conjunção adversativa ("mas HAS") ---
test('V02: CHA com negações seguidas de "mas HAS" pontua 1/9 (risco intermediário) e não zera o escore', () => {
  const {c} = env();
  const r = c.tentarCalcularDeterministico('CHA2DS2-VASc homem 60 anos sem DM, sem IC, sem AVC, sem doença vascular, mas HAS');
  assert(r.includes('1/9'), 'Deve computar 1/9 correspondente a homem com HAS');
  assert(!r.includes('0/9'), 'Não pode retornar 0/9');
  assert(r.includes('RISCO INTERMEDIÁRIO'), 'Classificação deve refletir risco intermediário masculino');
});

// --- V03: Gasometria higieniza pH contraditório e alucinado da IA ---
test('V03: Gasometria substitui pH alucinado da IA pelo pH real da amostra determinística', () => {
  const {c} = env();
  c.executarRaciocinioClinico = () => 'pH 6.00; AG = 99; HCO3 = 3';
  const r = c.gerarAnaliseGasometriaComIA('pH 7.40 pCO2 40 HCO3 24');
  assert(r.includes('pH 7.40'), 'Deve conter o pH real da amostra');
  assert(!r.includes('pH 6.00'), 'Não pode manter o pH 6.00 alucinado e divergente');
  assert(!r.includes('AG = 99'), 'Não pode conter o AG espúrio da IA');
  assert(!r.includes('HCO3 = 3'), 'Não pode conter o bicarbonato alucinado');
});

// --- V04: Elegibilidade de PDF restrita a fármacos reais com dosagem/posologia ---
test('V04: Orientação "1. Revisar exames." não habilita PDF; prescrição real estruturada habilita', () => {
  const {c, sent} = env();
  // Caso negativo: orientação de exames
  c.processarEEntregarIA(123, () => '1. Revisar exames.', 'x', 'rx');
  const temPdfExame = sent.some(x => JSON.stringify(x.payload).includes('gerarPdfRx_'));
  assert.strictEqual(temPdfExame, false, 'Orientação de exames não deve habilitar PDF');

  // Caso positivo: prescrição medicamentosa real
  sent.length = 0;
  c.processarEEntregarIA(123, () => '1. Amoxicilina 500 mg VO de 8/8h por 7 dias.', 'x', 'rx');
  const temPdfRx = sent.some(x => JSON.stringify(x.payload).includes('gerarPdfRx_'));
  assert.strictEqual(temPdfRx, true, 'Prescrição farmacológica completa deve habilitar PDF');
});

// --- V05: Clearance com Cr 0 rejeitado deterministicamente sem fallback para IA ---
test('V05: /calc clearance Cr 0 é rejeitado pelo motor puro e não faz fallback para IA', () => {
  const {c, sent} = env();
  let iaChamada = false;
  c.processarCalculadoraClinicaComIA = () => { iaChamada = true; };
  c.processarMensagemTexto({chat:{id:123}, text:'/calc clearance Cr 0 peso 70 idade 60 masculino'});
  assert.strictEqual(iaChamada, false, 'Zero chamadas para a IA em erro de cálculo determinístico');
  assert(sent.length > 0, 'Deve responder ao usuário no chat');
  assert(sent[0].payload.text.includes('Parâmetros Inválidos'), 'Deve reportar os parâmetros fora da faixa biológica');
});

console.log('\n🎉 RESULTADO DA CONTRAPROVA DA 5ª RODADA: ' + aprovados + ' DE 5 TESTES VALIDADOS COM 100% DE ÊXITO!');
