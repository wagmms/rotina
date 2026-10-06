/**
 * Contraprova da Sétima Rodada: Validação afirmativa e rigorosa das correções X01 a X06.
 * 
 * Executar: node reviews/setima_rodada_contraprova.cjs [caminho_opcional]
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

// --- X01: CHA com fatores parciais negados não presume ausência dos fatores não declarados ---
test('X01: Dois fatores negados sem declaração dos demais recusa 0/9 e exige fatores faltantes', () => {
  const {c} = env();
  const input = 'CHA2DS2-VASc homem 60 anos sem HAS, sem DM';
  const r = c.tentarCalcularDeterministico(input);
  assert(!r.includes('0/9'), 'Não pode emitir 0/9 quando IC, AVC e Doença Vascular permanecem desconhecidos');
  assert(!r.includes('NÃO recomendada'), 'Não pode emitir conduta definitiva de não anticoagular com histórico incompleto');
  assert(r.includes('Fatores Incompletos'), 'Deve alertar expressamente sobre fatores incompletos');
  assert(r.includes('Insuficiência Cardíaca'), 'Deve listar IC entre os fatores faltantes');
  assert(r.includes('AVC'), 'Deve listar AVC entre os fatores faltantes');
  assert(r.includes('Doença Vascular'), 'Deve listar Doença Vascular entre os fatores faltantes');
});

// --- X02: CHA com fator positivo único não conclui histórico e bloqueia 1/9 definitivo ---
test('X02: Um fator positivo isolado recusa fechamento em 1/9 e exige confirmação dos outros quatro fatores', () => {
  const {c} = env();
  const input = 'CHA2DS2-VASc homem 60 anos HAS';
  const r = c.tentarCalcularDeterministico(input);
  assert(!r.includes('1/9'), 'Não pode computar 1/9 definitivo com 4 comorbidades clínicas desconhecidas');
  assert(r.includes('Fatores Incompletos'), 'Deve acionar aviso de fatores incompletos');
  assert(r.includes('Insuficiência Cardíaca'), 'Deve requerer status de IC');
  assert(r.includes('Diabetes Mellitus'), 'Deve requerer status de DM');
  assert(r.includes('AVC'), 'Deve requerer status de AVC');
  assert(r.includes('Doença Vascular'), 'Deve requerer status de Doença Vascular');
});

// --- X03: CHA preserva fator afirmativo diante de negações posteriores com vírgula ---
test('X03: Negação posterior em lista com vírgulas não apaga HAS afirmada (calcula 1/9 risco intermediário)', () => {
  const {c} = env();
  const input = 'CHA2DS2-VASc homem 60 anos HAS, sem DM, sem IC, sem AVC, sem doença vascular';
  const r = c.tentarCalcularDeterministico(input);
  assert(r.includes('1/9'), 'Deve computar exatamente 1/9 (HAS presente, demais fatores ausentes)');
  assert(!r.includes('0/9'), 'HAS afirmada não pode ser anulada pela negação do próximo item');
  assert(r.includes('RISCO INTERMEDIÁRIO'), 'Classificação deve ser risco intermediário');
  
  // Consistência: lista com vírgula deve ter resultado idêntico à lista com conjunção adversativa
  const rControl = c.tentarCalcularDeterministico('CHA2DS2-VASc homem 60 anos HAS, mas sem DM, sem IC, sem AVC, sem doença vascular');
  assert.strictEqual(r, rControl, 'Sintaxe com vírgula e com adversativa devem produzir exatamente o mesmo resultado determinístico');
});

// --- X04: Gasometria higieniza valores mesmo em linhas contendo o termo "conduta" ---
test('X04: Palavra conduta na linha de interpretação não isenta medições contraditórias da validação', () => {
  const {c} = env();
  const input = 'pH 7.40 pCO2 40 HCO3 24';
  const mockedIA = 'O pH é 6.00; conduta: reavaliar a amostra.';
  c.executarRaciocinioClinico = () => mockedIA;
  const r = c.gerarAnaliseGasometriaComIA(input);
  assert(r.includes('pH 7.40'), 'Deve conter o valor real medido de pH 7.40');
  assert(!r.includes('O pH é 6.00'), 'Não pode permitir a afirmação de que o pH é 6.00');
  assert(!r.includes('pH 6.00'), 'Não pode conter o valor 6.00 espúrio mesmo em linha de conduta');
});

// --- X05: Validação de receita exige identificação substantiva do fármaco para habilitar PDF ---
test('X05: Verbo e dosagem sem nome de medicamento ("1. Usar 500 mg") rejeita receita e não emite PDF', () => {
  const {c, sent} = env();
  const input = '1. Usar 500 mg';
  assert.strictEqual(c.validarReceitaTemMedicamentos(input), false, 'Linha sem substantivo de medicamento deve ser recusada');
  c.processarEEntregarIA(123, () => input, 'x', 'rx');
  const temPdf = sent.some(x => JSON.stringify(x.payload).includes('gerarPdfRx_'));
  assert.strictEqual(temPdf, false, 'Receita inválida sem fármaco não pode liberar botão de PDF');
});

// --- X06: Receita exige completude de TODOS os itens; item incompleto bloqueia PDF ---
test('X06: Prescrição com um item completo e um incompleto recusa PDF até que todos estejam conformes', () => {
  const {c, sent} = env();
  const inputIncompleto = '1. Paracetamol 500 mg VO 1 comprimido de 6/6h se dor.\n2. Amoxicilina 500 mg';
  assert.strictEqual(c.validarReceitaTemMedicamentos(inputIncompleto), false, 'Receita com item sem posologia não pode ser aprovada');
  c.processarEEntregarIA(123, () => inputIncompleto, 'x', 'rx');
  const temPdfIncompleto = sent.some(x => JSON.stringify(x.payload).includes('gerarPdfRx_'));
  assert.strictEqual(temPdfIncompleto, false, 'Receita com item incompleto não pode liberar PDF');

  // Contraprova positiva: com ambos os itens completos, aprova e libera PDF
  sent.length = 0;
  const inputCompleto = '1. Paracetamol 500 mg VO 1 comprimido de 6/6h se dor.\n2. Amoxicilina 500 mg VO 1 cápsula de 8/8h por 7 dias.';
  assert.strictEqual(c.validarReceitaTemMedicamentos(inputCompleto), true, 'Receita com todos os itens completos deve ser aprovada');
  c.processarEEntregarIA(123, () => inputCompleto, 'x', 'rx');
  const temPdfCompleto = sent.some(x => JSON.stringify(x.payload).includes('gerarPdfRx_'));
  assert.strictEqual(temPdfCompleto, true, 'Receita completa deve liberar PDF com sucesso');
});

console.log('\n🎉 RESULTADO DA CONTRAPROVA DA 7ª RODADA: ' + aprovados + ' DE 6 TESTES VALIDADOS COM 100% DE ÊXITO!');
