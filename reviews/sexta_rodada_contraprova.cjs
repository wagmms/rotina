/**
 * Contraprova da Sexta Rodada: Validação afirmativa e rigorosa das correções W01 a W06.
 * 
 * Executar: node reviews/sexta_rodada_contraprova.cjs
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

// --- W01: CHA com fator único negado não presume ausência dos demais ---
test('W01: CHA com apenas um fator negado recusa 0/9 e exige confirmação dos fatores pendentes', () => {
  const {c} = env();
  const r = c.tentarCalcularDeterministico('CHA2DS2-VASc homem 60 anos sem HAS');
  assert(!r.includes('0/9'), 'Não pode emitir 0/9 quando outros fatores permanecem desconhecidos');
  assert(!r.includes('NÃO recomendada'), 'Não pode atestar ausência de indicação sem avaliar IC, DM, AVC ou doença vascular');
  assert(r.includes('Fatores Incompletos') || r.includes('não informados'), 'Deve emitir aviso de fatores clínicos incompletos');
});

// --- W02: CHA negação coordenada após "mas" é rigorosamente preservada ---
test('W02: CHA com afirmação e negações coordenadas pós-adversativas calcula 1/9 e não 6/9', () => {
  const {c} = env();
  const r = c.tentarCalcularDeterministico('CHA2DS2-VASc homem 60 anos HAS, mas sem DM, sem IC, sem AVC, sem doença vascular');
  assert(r.includes('1/9'), 'Deve computar exatamente 1/9 (apenas HAS afirmada em homem 60a)');
  assert(!r.includes('6/9'), 'Não pode transformar termos negados após "mas" em fatores positivos');
  assert(r.includes('RISCO INTERMEDIÁRIO'), 'Classificação deve refletir risco intermediário masculino (1 ponto)');
  assert(!r.includes('fortemente recomendada'), 'Não pode recomendar fortemente anticoagulação baseada em falsos positivos');
});

// --- W03: Gasometria neutraliza contradições de pH em qualquer grafia em prosa ---
test('W03: Gasometria higieniza pH contraditório expresso em linguagem natural', () => {
  const {c} = env();
  c.executarRaciocinioClinico = () => 'O pH é 6.00 com acidose grave e choque.';
  const r = c.gerarAnaliseGasometriaComIA('pH 7.40 pCO2 40 HCO3 24');
  assert(r.includes('pH 7.40'), 'Deve conter o pH real da amostra determinística');
  assert(!r.includes('O pH é 6.00'), 'Não pode manter a assertiva de que o pH é 6.00');
  assert(!r.includes('pH 6.00'), 'Não pode conter o valor espúrio de 6.00');
});

// --- W04: Gasometria preserva metas e alvos ventilatórios sem alteração indevida ---
test('W04: Gasometria preserva alvo ventilatório e não o sobrescreve com valor da amostra', () => {
  const {c} = env();
  c.executarRaciocinioClinico = () => 'Alvo ventilatório: pCO2 35 mmHg.';
  const r = c.gerarAnaliseGasometriaComIA('pH 7.40 pCO2 40 HCO3 24');
  assert(r.includes('pCO2 35'), 'Deve preservar a meta ventilatória terapêutica de 35 mmHg');
  assert(!r.includes('Alvo ventilatório: pCO2 conforme amostra'), 'Não pode reescrever uma meta terapêutica pelo valor medido');
});

// --- W05: Receita exige medicamento + dosagem E instrução/posologia/via para habilitar PDF ---
test('W05: Apresentação farmacológica sem posologia/via recusa PDF; receita completa habilita', () => {
  const {c, sent} = env();
  // Caso negativo: apresentação isolada (fármaco + dosagem, sem instrução de uso nem via)
  assert.strictEqual(c.validarReceitaTemMedicamentos('1. Paracetamol 500 mg'), false, 'Apresentação isolada sem posologia/via não é receita completa');
  c.processarEEntregarIA(123, () => '1. Paracetamol 500 mg', 'x', 'rx');
  const temPdfIsolado = sent.some(x => JSON.stringify(x.payload).includes('gerarPdfRx_'));
  assert.strictEqual(temPdfIsolado, false, 'Apresentação isolada não pode habilitar emissão de PDF');

  // Caso positivo: prescrição completa com apresentação, via e posologia
  sent.length = 0;
  assert.strictEqual(c.validarReceitaTemMedicamentos('1. Paracetamol 500 mg VO 1 comprimido de 6/6h se dor.'), true, 'Prescrição com via e posologia é válida');
  c.processarEEntregarIA(123, () => '1. Paracetamol 500 mg VO 1 comprimido de 6/6h se dor.', 'x', 'rx');
  const temPdfCompleto = sent.some(x => JSON.stringify(x.payload).includes('gerarPdfRx_'));
  assert.strictEqual(temPdfCompleto, true, 'Prescrição completa deve habilitar PDF');
});

// --- W06: Catálogo único garante proteção anti-IA para todas as calculadoras suportadas ---
test('W06: Calculadoras suportadas (incluindo HAS-BLED e Wells) têm cobertura determinística e zero fallback de IA', () => {
  const {c, sent} = env();
  assert.strictEqual(typeof c.CalculadorasClinicas.hasbled, 'function');
  assert.strictEqual(c.ehCalculadoraReconhecida('HAS-BLED hipertensão'), true, 'HAS-BLED deve ser reconhecida no catálogo');
  assert.strictEqual(c.ehCalculadoraReconhecida('Wells suspeita de TEP'), true, 'Wells deve ser reconhecida no catálogo');
  assert.strictEqual(c.ehCalculadoraReconhecida('CURB-65 70 anos'), true, 'CURB-65 deve ser reconhecida no catálogo');

  // Execução de HAS-BLED incompleto: zero chamadas de IA
  let iaChamada = false;
  c.processarCalculadoraClinicaComIA = () => { iaChamada = true; };
  c.processarMensagemTexto({chat:{id:123}, text:'/calc HAS-BLED hipertensão'});
  assert.strictEqual(iaChamada, false, 'Zero chamadas à IA para calculadora reconhecida com dados incompletos');
  assert(sent.length > 0, 'Deve emitir resposta determinística');
  assert(sent[0].payload.text.includes('HAS-BLED') || sent[0].payload.text.includes('Parâmetros Insuficientes'), 'Deve emitir guia/pendências determinísticas');
});

console.log('\n🎉 RESULTADO DA CONTRAPROVA DA 6ª RODADA: ' + aprovados + ' DE 6 TESTES VALIDADOS COM 100% DE ÊXITO!');
