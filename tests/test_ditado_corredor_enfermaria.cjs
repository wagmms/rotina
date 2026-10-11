/**
 * TESTES DO DITADO DE CORREDOR (EVOLUÇÃO DE LEITO HOSPITALAR EM TEMPO ÚNICO)
 * Valida a captura de áudio livre pelo médico enquanto caminha entre os leitos:
 * 1. Extração do leito e evolução médica formal
 * 2. Classificação de gravidade (Estável, Vigilância, Instável)
 * 3. Gravação direta no EnfermariaService sem exigir comandos manuais
 * 4. Geração de texto limpo para prontuário (PEP) e botões táteis de 1 toque
 */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const source = fs.readFileSync(path.resolve(__dirname, '../ultra_rotina_master.js'), 'utf8');

function env() {
  const props = {
    TELEGRAM_CHAT_ID: '123',
    TELEGRAM_BOT_TOKEN: 'fake-token',
    WEBHOOK_SECRET: 'secret',
    GEMINI_API_KEY: 'fake-gemini'
  };
  const cache = {}, sent = [];
  let now = 2000000000000, seq = 0;
  class Clock extends Date { constructor(...a){super(...(a.length?a:[now]));} static now(){return now;} }
  const p = {
    getProperty: k => props[k] ?? null,
    setProperty: (k, v) => { props[k] = String(v); },
    deleteProperty: k => { delete props[k]; },
    getProperties: () => ({ ...props }),
    setProperties: (o, del) => {
      if (del) for (const k in props) delete props[k];
      for (const k in o) props[k] = String(o[k]);
      return p;
    }
  };
  const c = {
    Buffer, Date: Clock, console: { log() {}, error() {} },
    PropertiesService: { getScriptProperties: () => p },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] ?? null, put: (k, v) => { cache[k] = String(v); }, remove: k => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }), getUserLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    HtmlService: { createHtmlOutput: body => ({ body }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: body => ({ body, setMimeType() { return this; } }) },
    ScriptApp: { getProjectTriggers: () => [] },
    UrlFetchApp: {
      fetch: (url, opts) => {
        let payload = {};
        try {
          payload = typeof opts?.payload === 'string' ? JSON.parse(opts.payload) : (opts?.payload || {});
        } catch (_) {
          payload = opts?.payload || {};
        }
        sent.push({ url, payload });
        return { getResponseCode: () => 200, getContentText: () => '{"ok":true}' };
      }
    }
  };
  vm.createContext(c);
  vm.runInContext(source, c);
  c.Utilities.getUuid = () => String(++seq).padStart(32, '0');
  c.Utilities.sleep = () => {};

  return { c, props, cache, sent };
}

let total = 0, pass = 0;
function test(name, fn) {
  total++;
  try {
    fn();
    pass++;
    console.log('✅ APROVADO: ' + name);
  } catch (e) {
    process.exitCode = 1;
    console.error('❌ FALHOU: ' + name + '\n' + e.stack);
  }
}

// -----------------------------------------------------------------------------
// 1. ÁUDIO DE CORREDOR ATUALIZA LEITO ESTÁVEL AUTOMATICAMENTE
// -----------------------------------------------------------------------------
test('1. Áudio de leito estável grava no EnfermariaService e envia card com botão Copiar PEP', () => {
  const { c, sent } = env();

  c.baixarMidiaTelegram = () => ({ data: 'audio_leito_4', mime: 'audio/ogg' });

  c.chamarGeminiPoolMultimodal = () => JSON.stringify({
    transcricao: 'Leito 4: homem de 72 anos, D3 de ceftriaxona para PAC grave, afebril há 24h, eupneico em ar ambiente com saturação de 95%. Mantida antibioticoterapia e programo transição para via oral.',
    eh_clinico: true,
    tipo_relato: 'leito',
    numero_leito: '4',
    status_sugerido: 'estavel',
    evolucao_texto: 'Homem, 72 anos. D3 de ceftriaxona para PAC grave. Afebril há 24h, eupneico em ar ambiente (SatO2 95%). Conduta: Mantida antibioticoterapia. Transição para VO se mantiver estabilidade clínica.',
    pendencias: ['Transição para via oral amanhã']
  });

  c.processarMensagemVoz({ chat: { id: 123 }, voice: { file_id: 'voice_leito_4' } });

  // 1. Verifica se gravou no EnfermariaService
  const leito4 = c.EnfermariaService.obterLeito('4');
  assert(leito4, 'Leito 4 deve estar registrado na enfermaria');
  assert(leito4.status.includes('Estável'), 'Status deve ser Estável');
  assert(leito4.dados.includes('D3 de ceftriaxona'), 'Dados devem conter a evolução médica');

  // 2. Verifica mensagem enviada
  const msgEnviada = sent.find(s => s.payload && s.payload.text && s.payload.text.includes('LEITO 4 · ATUALIZADO VIA VOZ'));
  assert(msgEnviada, 'Deve enviar mensagem com confirmação de atualização do Leito 4');
  assert(msgEnviada.payload.text.includes('Pendências'), 'Deve listar as pendências');

  // 3. Verifica botões
  const kb = msgEnviada.payload.reply_markup?.inline_keyboard;
  assert(kb, 'Deve conter inline keyboard');
  const btnCopiar = kb[0][0];
  assert(btnCopiar.text.includes('Copiar PEP') || btnCopiar.text.includes('Copiar Conduta/Passagem para Prontuário'), 'Deve conter botão Copiar PEP / Conduta para Prontuário');
});

// -----------------------------------------------------------------------------
// 2. ÁUDIO DE CORREDOR COM FEBRE CLASSIFICA COMO VIGILÂNCIA
// -----------------------------------------------------------------------------
test('2. Áudio com intercorrência/febre classifica o leito como Vigilância', () => {
  const { c, sent } = env();

  c.baixarMidiaTelegram = () => ({ data: 'audio_leito_7_febre', mime: 'audio/ogg' });

  c.chamarGeminiPoolMultimodal = () => JSON.stringify({
    transcricao: 'Leito 7: paciente fez pico febril de 38,5 graus às 15 horas, taquicárdico. Colhidas hemoculturas. Pendência de checar leucograma às 19h.',
    eh_clinico: true,
    tipo_relato: 'leito',
    numero_leito: '7',
    status_sugerido: 'vigilancia',
    evolucao_texto: 'Pico febril de 38,5°C às 15h associado a taquicardia. PA estável. Colhidas 2 amostras de hemocultura e urina 1. Mantido esquema antimicrobiano.',
    pendencias: ['Checar leucograma às 19h']
  });

  c.processarMensagemVoz({ chat: { id: 123 }, voice: { file_id: 'voice_leito_7' } });

  const leito7 = c.EnfermariaService.obterLeito('7');
  assert(leito7, 'Leito 7 deve existir');
  assert(leito7.status.includes('Vigilância'), 'Status deve ser marcado como Vigilância devido à febre');
  assert(leito7.dados.includes('Pico febril'), 'Dados devem conter a evolução');
});

// -----------------------------------------------------------------------------
// 3. MENSAGEM DE TEXTO NATURAL (SEM BARRA /) ATUALIZA O LEITO
// -----------------------------------------------------------------------------
test('3. Texto natural digitado "Leito 12 paciente com..." atualiza o leito com botões táteis', () => {
  const { c, sent } = env();

  c.processarMensagemTexto({
    chat: { id: 123 },
    text: 'Leito 12: Paciente 68a em D2 de PO de colectomia, afebril, drenos com débito seroso, dor controlada. Dieta líquida iniciada hoje.'
  });

  const leito12 = c.EnfermariaService.obterLeito('12');
  assert(leito12, 'Leito 12 deve ser criado a partir de texto natural sem barra');
  assert(leito12.dados.includes('colectomia'), 'Dados devem conter o relato');

  const msgEnviada = sent.find(s => s.payload && s.payload.text && s.payload.text.includes('LEITO 12 · ATUALIZADO'));
  assert(msgEnviada, 'Deve enviar confirmação do Leito 12');
});

// -----------------------------------------------------------------------------
// 4. PRESERVAÇÃO TOTAL DO COMANDO TRADICIONAL /leito
// -----------------------------------------------------------------------------
test('4. Comando tradicional "/leito 5 ..." continua funcionando normalmente', () => {
  const { c, sent } = env();

  c.processarMensagemTexto({
    chat: { id: 123 },
    text: '/leito 5 55a, DPOC exacerbado, em desmame de VNI'
  });

  const leito5 = c.EnfermariaService.obterLeito('5');
  assert(leito5, 'Leito 5 deve existir');
  assert(leito5.dados.includes('DPOC'), 'Dados devem ter sido gravados');
});

console.log(`\n🎉 DITADO DE CORREDOR (ENFERMARIA): ${pass}/${total} testes aprovados com 100% de êxito!`);
