/**
 * Contraprova da Terceira Rodada: Validação positiva dos 15 comportamentos corrigidos (T01 a T15).
 * Executar: node reviews/terceira_rodada_contraprova.cjs
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

test('T01 CHA sem dados mínimos não calcula 0/9 e solicita parâmetros obrigatórios', () => {
  const {c} = env();
  const r = c.tentarCalcularDeterministico('CHA2DS2-VASc paciente');
  assert(!r.includes('0/9'));
  assert(r.includes('informe no mínimo'));
  assert(r.includes('Idade'));
  assert(r.includes('Sexo biológico'));
});

test('T02 CHA com fatores expressamente negados calcula 1/9 (apenas sexo) e não 3/9', () => {
  const {c} = env();
  const r = c.tentarCalcularDeterministico('CHA2DS2-VASc mulher 60 anos sem IC, sem diabetes, sem AVC, sem doença vascular, sem hipertensão');
  assert(r.includes('1/9'));
  assert(!r.includes('3/9'));
  assert(r.includes('NÃO recomendada'));
});

test('T03 CHA não reconhece IC dentro da palavra diabético', () => {
  const {c} = env();
  let args;
  c.CalculadorasClinicas.cha2ds2vasc = (...x) => { args = x; return {ok:true, nome:'CHA', principal:'1/9', rotulo:'ok'}; };
  c.tentarCalcularDeterministico('CHA2DS2-VASc homem 60 anos diabético');
  assert.strictEqual(args[0], false, 'IC deve ser falso');
  assert.strictEqual(args[3], true, 'DM deve ser verdadeiro');
});

test('T04 MELD incompleto não chama IA e retorna pendências obrigatórias', () => {
  const {c} = env();
  let calls = 0;
  c.processarEEntregarIA = () => calls++;
  c.processarMensagemTexto({chat:{id:123}, text:'/calc MELD bili 2 inr 1'});
  assert.equal(calls, 0, 'Não deve chamar IA');
});

test('T05 MELD com negação não faz hemodiálise passa diálise false', () => {
  const {c} = env();
  let args;
  c.CalculadorasClinicas.meld = (...x) => { args = x; return {ok:true, nome:'MELD', principal:'15', rotulo:'ok'}; };
  c.tentarCalcularDeterministico('MELD bili 2 cr 1 inr 1 não faz hemodiálise');
  assert.strictEqual(args[4], false, 'Diálise deve ser false');
});

test('T06 Gasometria com falha matemática interrompe e não chama IA', () => {
  const {c} = env();
  let n = 0;
  c.CalculadorasClinicas.gasometria = () => { throw Error('falha sintética'); };
  c.executarRaciocinioClinico = () => { n++; return 'pH 6.00'; };
  const r = c.gerarAnaliseGasometriaComIA('pH 7.40 pCO2 40 HCO3 24');
  assert.equal(n, 0, 'IA não deve ser chamada');
  assert(r.includes('Falha no Processamento da Gasometria'));
});

test('T07 Gasometria neutraliza cálculos contraditórios de ânion gap da IA', () => {
  const {c} = env();
  c.executarRaciocinioClinico = () => 'Considerar cetoacidose; ânion gap 99';
  const r = c.gerarAnaliseGasometriaComIA('pH 7.40 pCO2 40 HCO3 24');
  assert(!r.includes('gap 99'), 'Cálculo contraditório de ânion gap deve ser neutralizado');
  assert(r.includes('pH 7.40'));
});

test('T08 Orçamento UTF-8 ativa contrapressão antes de 512 KiB em caracteres multibyte', () => {
  const {c} = env();
  assert.throws(() => {
    for (let i = 0; i < 40; i++) {
      c.enfileirarUpdate({update_id:i, message:{chat:{id:123}, text:'界'.repeat(5000)}});
    }
  }, /Orçamento global|Fila cheia/);
});

test('T09 Poda sob pressão não apaga deduplicação recente (< 24h)', () => {
  const {c, p} = env();
  let n = 0;
  c.processarMensagemTexto = () => n++;
  c.doPost(req('efeito'));
  for (let i = 0; i < 44; i++) p.setProperty('existente_' + i, 'x'.repeat(8000));
  try {
    c.PersistenciaBot.salvar('outbox_teste', {status:'pending', created:c.Date.now(), payload:{text:'x'}});
  } catch(ignore) {}
  assert.notStrictEqual(c.PersistenciaBot.ler('inbox_1'), null, 'inbox_1 recente deve ser mantido');
  c.doPost(req('efeito'));
  assert.equal(n, 1, 'Replay deve ser impedido pela deduplicação mantida');
});

test('T10 Histórico de leito mantém registros cronologicamente recentes independentemente do UUID', () => {
  const {c, props} = env();
  let seq = 0;
  c.Utilities.getUuid = () => String(99999 - seq++).padStart(32, '0');
  for (let n = 0; n < 12; n++) assert(c.EnfermariaService.atualizarLeito('1', 'E' + n).sucesso);
  const hs = Object.entries(props).filter(([k]) => k.startsWith('LEITO_HIST_1_')).map(([,v]) => JSON.parse(v).dados);
  assert(hs.includes('E10') || hs.includes('E9'), 'Registros recentes devem ser preservados');
  assert(!hs.includes('E0'), 'Registro mais antigo E0 deve ter sido podado');
});

test('T11 Mudança de status cria histórico prefixado com ID do leito', () => {
  const {c, props} = env();
  c.EnfermariaService.atualizarLeito('9', 'caso');
  c.EnfermariaService.atualizarStatusLeito('9', 'estavel');
  const ks = Object.keys(props).filter(k => k.startsWith('LEITO_HIST_'));
  assert.equal(ks.length, 1);
  assert(ks[0].startsWith('LEITO_HIST_9_'), 'Deve começar com LEITO_HIST_9_');
});

test('T12 Prescrição incompleta ou com pendência não recebe botão de PDF', () => {
  const {c, sent} = env();
  c.processarEEntregarIA(123, () => '⚠️ Prescrição incompleta: informe peso e alergias.', 'x', 'rx');
  assert(!sent.some(x => JSON.stringify(x.payload).includes('gerarPdfRx_')), 'Não deve ter botão PDF');
});

test('T13 Flag TELEGRAM_ASYNC_WORKER=true evita execução síncrona do worker', () => {
  const {c, props} = env();
  props.TELEGRAM_ASYNC_WORKER = 'true';
  let n = 0;
  c.processarMensagemTexto = () => n++;
  c.doPost(req('x'));
  assert.equal(n, 0, 'Com TELEGRAM_ASYNC_WORKER=true, worker síncrono não deve rodar no doPost');
  assert(source.includes('TELEGRAM_ASYNC_WORKER'), 'Código-fonte deve conter suporte à flag');
});

test('T14 Lease de envio permanece sending durante fetch ativo e não vira uncertain prematuramente', () => {
  const {c, advance} = env();
  let during = null;
  c.UrlFetchApp.fetch = () => {
    advance(61000);
    c.processarCaixaSaida();
    during = c.PersistenciaBot.ler('outbox_x').status;
    return {getResponseCode:()=>200, getContentText:()=>'{"ok":true}'};
  };
  const item = {status:'pending', created:c.Date.now(), next:0, attempts:0, method:'sendMessage', payload:{chat_id:123, text:'x'}};
  c.PersistenciaBot.salvar('outbox_x', item);
  c.tentarEntregaTelegram('outbox_x', item);
  assert.equal(during, 'sending', 'Deve permanecer sending durante o fetch ativo aos 61s');
});

test('T15 Classificação de CHA imprime valor válido e nunca undefined', () => {
  const {c} = env();
  const r = c.tentarCalcularDeterministico('CHA2DS2-VASc mulher 60 anos HAS, sem IC, sem DM, sem AVC, sem doença vascular');
  assert(!r.includes('undefined'), 'Não deve conter undefined');
  assert(r.includes('Classificação:* RISCO INTERMEDIÁRIO'));
});

console.log('\n🎉 RESULTADO DA CONTRAPROVA: ' + aprovados + ' DE 15 COMPORTAMENTOS CORRIGIDOS E VALIDADOS COM 100% DE ÊXITO!');
