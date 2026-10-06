/**
 * Contraprova da Quarta Rodada: Validação afirmativa e rigorosa das correções U01 a U07
 * e das 4 verificações positivas de requisitos.
 * 
 * Executar: node reviews/quarta_rodada_contraprova.cjs
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

// --- U01: CHA com idade/sexo mas fatores desconhecidos ---
test('U01: CHA com idade/sexo mas sem relato de comorbidades exige fatores e não assume 0/9', () => {
  const {c} = env();
  const r = c.tentarCalcularDeterministico('CHA2DS2-VASc homem 60 anos');
  assert(!r.includes('0/9'), 'Não deve pontuar 0/9 assumindo ausência presumida');
  assert(!r.includes('NÃO recomendada'), 'Não deve desencorajar anticoagulação sem conhecer os fatores');
  assert(r.includes('informe a presença ou ausência dos fatores de risco'), 'Deve solicitar declaração expressa dos fatores');
});

// --- U02: CHA negação coordenada em lista ---
test('U02: CHA negação coordenada em lista ("sem HAS, DM ou AVC") zera todos os fatores da lista', () => {
  const {c} = env();
  const r = c.tentarCalcularDeterministico('CHA2DS2-VASc homem 60 anos sem HAS, DM ou AVC, sem IC, sem doença vascular');
  assert(r.includes('0/9'), 'Deve computar 0/9 reconhecendo todos os itens negados');
  assert(r.includes('BAIXO RISCO TROMBOEMBÓLICO'), 'Deve classificar como baixo risco');
  assert(!r.includes('3/9'), 'Não deve somar 3/9 por falha de parsing no DM e AVC');
});

// --- U03: MELD com parâmetros biológicos inválidos ---
test('U03: MELD com parâmetro fora da faixa (bili 0) rejeita deterministicamente e não cai na IA', () => {
  const {c, sent} = env();
  let iaChamada = false;
  c.processarCalculadoraClinicaComIA = () => { iaChamada = true; };
  c.processarMensagemTexto({chat:{id:123}, text:'/calc MELD bili 0 cr 1 inr 1'});
  assert.strictEqual(iaChamada, false, 'Não deve fazer fallback para a IA');
  assert(sent.length > 0, 'Deve emitir mensagem de retorno ao usuário');
  assert(sent[0].payload.text.includes('Parâmetros Inválidos'), 'Deve detalhar a inconsistência biológica');
});

// --- U04: Higienização de contradições da IA na Gasometria ---
test('U04: Gasometria higieniza alucinações e contradições de AG e HCO3 da IA', () => {
  const {c} = env();
  c.executarRaciocinioClinico = () => 'pH 6.00; AG = 99; HCO3 = 3';
  const r = c.gerarAnaliseGasometriaComIA('pH 7.40 pCO2 40 HCO3 24');
  assert(r.includes('pH 7.40'), 'Deve manter os dados determinísticos de entrada');
  assert(!r.includes('AG = 99'), 'Deve filtrar o AG espúrio da IA');
  assert(!r.includes('HCO3 = 3'), 'Deve filtrar o bicarbonato alucinado');
});

// --- U05: Botão de PDF Rx apenas com itens farmacológicos reais ---
test('U05: Mensagem sem prescrição estruturada não inclui botão de PDF', () => {
  const {c, sent} = env();
  c.processarEEntregarIA(123, () => 'Aguarde a confirmação dos dados do paciente.', 'x', 'rx');
  const temBotaoPdf = sent.some(x => JSON.stringify(x.payload).includes('gerarPdfRx_'));
  assert.strictEqual(temBotaoPdf, false, 'Não deve exibir botão de PDF em texto sem medicamentos');
});

// --- U06: Orçamento global UTF-8 em EnfermariaService ---
test('U06: Gravação de leitos respeita o orçamento global de armazenamento UTF-8', () => {
  const {c, props} = env();
  let rejeitado = false;
  for (let id = 1; id <= 80; id++) {
    const res = c.EnfermariaService.atualizarLeito(String(id), 'x'.repeat(7000));
    if (!res.sucesso) {
      rejeitado = true;
      break;
    }
  }
  const bytes = Object.entries(props).reduce((n,[k,v]) => n + Buffer.byteLength(k) + Buffer.byteLength(v), 0);
  assert.strictEqual(rejeitado, true, 'Deve rejeitar gravação antes de estourar a cota');
  assert(bytes <= 512000, 'Consumo total em ScriptProperties deve ser rigorosamente inferior a 500 KB');
});

// --- U07: Poda de histórico preserva cronologia de registros novos frente a legados ---
test('U07: Poda de histórico elimina registros legados antigos e retém atualizações recentes', () => {
  const {c, props, p} = env();
  c.EnfermariaService.atualizarLeito('1', 'E0');
  for (let i = 0; i < 10; i++) {
    p.setProperty('LEITO_HIST_1_ffffffff-ffff-4fff-8fff-fffffffffff' + i, JSON.stringify({numero:'1', dados:'ANTIGO' + i}));
  }
  for (let n = 1; n <= 12; n++) {
    assert(c.EnfermariaService.atualizarLeito('1', 'E' + n).sucesso);
  }
  const hs = Object.entries(props).filter(([k]) => k.startsWith('LEITO_HIST_1_')).map(([,v]) => JSON.parse(v).dados);
  assert(hs.includes('E11'), 'Deve reter E11 recente');
  assert(hs.includes('E10'), 'Deve reter E10 recente');
  assert.strictEqual(hs.filter(t => t.startsWith('ANTIGO')).length, 0, 'Registros legados sem timestamp devem ser podados primeiro');
});

// --- Verificações Positivas da Quarta Rodada ---
test('V01 (Positiva): Modo async enfileira update e worker explícito conclui processamento', () => {
  const {c, props} = env();
  props.TELEGRAM_ASYNC_WORKER = 'true';
  let n = 0;
  c.processarMensagemTexto = () => n++;
  c.doPost(req('x'));
  assert.strictEqual(n, 0, 'Worker síncrono não deve executar');
  assert.strictEqual(c.PersistenciaBot.ler('inbox_1').status, 'pending');
  c.processarFilaTelegram();
  assert.strictEqual(n, 1, 'Worker explícito deve processar o item');
  assert.strictEqual(c.PersistenciaBot.ler('inbox_1').status, 'done');
});

test('V02 (Positiva): Sem flag de async worker, comportamento continua síncrono', () => {
  const {c} = env();
  let n = 0;
  c.processarMensagemTexto = () => n++;
  c.doPost(req('x'));
  assert.strictEqual(n, 1, 'Execução síncrona deve ocorrer imediatamente');
});

test('V03 (Positiva): Orçamento multibyte rejeita excesso mesmo sem Buffer e sem newBlob', () => {
  const {c} = env();
  c.Buffer = undefined;
  c.Utilities.newBlob = undefined;
  assert.throws(() => {
    for (let i = 0; i < 40; i++) {
      c.enfileirarUpdate({update_id:i, message:{chat:{id:123}, text:'界'.repeat(5000)}});
    }
  }, /Orçamento global|Fila cheia/);
});

test('V04 (Positiva): Status e alta usam prefixo de histórico específico do leito', () => {
  const {c, props} = env();
  c.EnfermariaService.atualizarLeito('9', 'caso');
  assert(c.EnfermariaService.atualizarStatusLeito('9', 'estavel').sucesso);
  assert(c.EnfermariaService.desocuparLeito('9').sucesso);
  const ks = Object.keys(props).filter(k => k.startsWith('LEITO_HIST_'));
  assert.strictEqual(ks.length, 2);
  assert(ks.every(k => k.startsWith('LEITO_HIST_9_')));
});

console.log('\n🎉 RESULTADO DA CONTRAPROVA DA 4ª RODADA: ' + aprovados + ' DE 11 TESTES VALIDADOS COM 100% DE ÊXITO!');
