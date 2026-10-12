/**
 * TESTES AUTOMATIZADOS: PRESCRIÇÃO HOSPITALAR & AJUSTE RENAL DE ANTIMICROBIANOS
 * Valida a ordem canônica hospitalar (Dieta, Hidratação, ATB D_, Profilaxias, SOS, Cuidados)
 * e o motor determinístico de ajuste renal (Guia Farmacêutico HSL / IDSA / UpToDate).
 */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const source = fs.readFileSync(path.resolve(__dirname, '../ultra_rotina_master.js'), 'utf8');

function env() {
  const props = {
    TELEGRAM_CHAT_ID: '123',
    TELEGRAM_BOT_TOKEN: 'fake-token',
    GEMINI_API_KEY: 'fake-gemini-key'
  };
  const cache = {};

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
    Buffer, console: { log() {}, error() {} },
    PropertiesService: { getScriptProperties: () => p },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] ?? null, put: (k, v) => { cache[k] = String(v); }, remove: k => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }), getUserLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    HtmlService: { createHtmlOutput: body => ({ body }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: body => ({ body, setMimeType() { return this; } }) },
    ScriptApp: { getProjectTriggers: () => [] },
    UrlFetchApp: {
      fetch: (url, opts) => ({ getResponseCode: () => 200, getContentText: () => '{"ok":true}' })
    }
  };

  vm.createContext(c);
  vm.runInContext(source, c);
  c.Utilities = {
    getUuid: () => '00000000000000000000000000000001',
    sleep: () => {},
    base64Decode: str => Buffer.from(str, 'base64'),
    base64Encode: bytes => Buffer.from(bytes).toString('base64'),
    newBlob: (b, m, n) => ({ getBytes: () => b, getContentType: () => m, getName: () => n })
  };

  return { c, props, cache };
}

let total = 0, pass = 0;
function test(name, fn) {
  total++;
  try {
    fn();
    pass++;
    console.log('✓ ' + name);
  } catch (e) {
    console.error('✗ ' + name + ' -> ' + e.message);
    throw e;
  }
}

console.log('🧪 Iniciando TESTES DE PRESCRIÇÃO HOSPITALAR E AJUSTE DE ANTIMICROBIANOS...\n');

// 1. Vancomicina
test('Ajuste Renal: Vancomicina conforme faixas de ClCr e Hemodiálise', () => {
  const { c } = env();
  const v1 = c.CalculadorasClinicas.ajusteRenalAntimicrobiano('vancomicina', 100);
  assert(v1.ok && v1.dados.doseAjustada.includes('8-12h'), 'Vanco ClCr 100 deve ser 8-12h');

  const v2 = c.CalculadorasClinicas.ajusteRenalAntimicrobiano('vancomicina', 40);
  assert(v2.ok && v2.dados.doseAjustada.includes('24h'), 'Vanco ClCr 40 deve ser 24h');

  const v3 = c.CalculadorasClinicas.ajusteRenalAntimicrobiano('vancomicina', null, true);
  assert(v3.ok && v3.dados.doseAjustada.includes('pós-hemodiálise'), 'Vanco em HD deve ter dose pós-HD');
});

// 2. Meropenem
test('Ajuste Renal: Meropenem nas 4 faixas críticas e diálise', () => {
  const { c } = env();
  const m1 = c.CalculadorasClinicas.ajusteRenalAntimicrobiano('meropenem', 70);
  assert(m1.ok && m1.dados.doseAjustada.includes('8h') && m1.dados.doseAjustada.includes('1g'), 'Mero ClCr 70: 1g 8/8h');

  const m2 = c.CalculadorasClinicas.ajusteRenalAntimicrobiano('meropenem', 30);
  assert(m2.ok && m2.dados.doseAjustada.includes('12h') && m2.dados.doseAjustada.includes('1g'), 'Mero ClCr 30: 1g 12/12h');

  const m3 = c.CalculadorasClinicas.ajusteRenalAntimicrobiano('meropenem', 15);
  assert(m3.ok && m3.dados.doseAjustada.includes('12h') && m3.dados.doseAjustada.includes('500 mg'), 'Mero ClCr 15: 500mg 12/12h');

  const m4 = c.CalculadorasClinicas.ajusteRenalAntimicrobiano('meropenem', 5);
  assert(m4.ok && m4.dados.doseAjustada.includes('24h') && m4.dados.doseAjustada.includes('500 mg'), 'Mero ClCr 5: 500mg 24/24h');

  const mHd = c.CalculadorasClinicas.ajusteRenalAntimicrobiano('meropenem', null, true);
  assert(mHd.ok && mHd.dados.doseAjustada.includes('APÓS a hemodiálise'), 'Mero HD após sessão');
});

// 3. Piperacilina + Tazobactam
test('Ajuste Renal: Pip-Tazo e infusão estendida', () => {
  const { c } = env();
  const p1 = c.CalculadorasClinicas.ajusteRenalAntimicrobiano('pip-tazo', 60);
  assert(p1.ok && p1.dados.doseAjustada.includes('4,5g'), 'Pip-Tazo ClCr 60: 4,5g');

  const p2 = c.CalculadorasClinicas.ajusteRenalAntimicrobiano('pip-tazo', 35);
  assert(p2.ok && p2.dados.doseAjustada.includes('3,375g'), 'Pip-Tazo ClCr 35: 3,375g');

  const p3 = c.CalculadorasClinicas.ajusteRenalAntimicrobiano('pip-tazo', 15);
  assert(p3.ok && p3.dados.doseAjustada.includes('2,25g'), 'Pip-Tazo ClCr 15: 2,25g');
});

// 4. Cefepime e Encefalopatia
test('Ajuste Renal: Cefepime com alerta de encefalopatia e neurotoxicidade', () => {
  const { c } = env();
  const cf1 = c.CalculadorasClinicas.ajusteRenalAntimicrobiano('cefepime', 80);
  assert(cf1.ok && cf1.dados.doseAjustada.includes('8h'), 'Cefepime ClCr 80: 8/8h');

  const cf2 = c.CalculadorasClinicas.ajusteRenalAntimicrobiano('cefepime', 40);
  assert(cf2.ok && cf2.dados.doseAjustada.includes('12h'), 'Cefepime ClCr 40: 12/12h');
  assert(cf2.dados.cuidados.includes('ENCEFALOPATIA'), 'Deve alertar para encefalopatia por cefepime');
});

// 5. Ceftriaxona sem ajuste
test('Ajuste Renal: Ceftriaxona NÃO requer redução posológica', () => {
  const { c } = env();
  const ctx = c.CalculadorasClinicas.ajusteRenalAntimicrobiano('ceftriaxona', 10);
  assert(ctx.ok && ctx.dados.doseAjustada.includes('NÃO REQUER AJUSTE RENAL'), 'Ceftriaxona sem ajuste');
});

// 6. Polimixina B
test('Ajuste Renal: Polimixina B NÃO deve sofrer subdosagem na IRA', () => {
  const { c } = env();
  const pol = c.CalculadorasClinicas.ajusteRenalAntimicrobiano('polimixina b', 15);
  assert(pol.ok && pol.dados.doseAjustada.includes('NÃO REDUZIR DOSE'), 'Polimixina B sem redução');
});

// 7. Extração a partir de texto livre
test('Extração em texto livre: /atb e texto corrido', () => {
  const { c } = env();
  const r1 = c.CalculadorasClinicas.calcularAjusteRenalPorTextoLivre('quero ajuste de meropenem com clcr de 22 ml/min');
  assert(r1 && r1.ok && r1.dados.farmaco === 'meropenem' && r1.dados.doseAjustada.includes('500 mg'));

  const r2 = c.CalculadorasClinicas.calcularAjusteRenalPorTextoLivre('ajuste vanco hemodialise');
  assert(r2 && r2.ok && r2.dados.hemodialise === true);

  const r3 = c.CalculadorasClinicas.calcularAjusteRenalPorTextoLivre('pip-tazo clcr 30');
  assert(r3 && r3.ok && r3.dados.doseAjustada.includes('3,375g'));
});

// 8. Roteamento Telegram: /atb determinístico instantâneo
test('Telegram Handler: /atb responde sem depender de IA externa', () => {
  const { c } = env();
  let enviou = '';
  let tecladoEnviado = null;
  c.enviarMensagemParaChat = (chatId, txt) => { enviou = txt; return true; };
  c.enviarMensagemComTecladoParaChat = (chatId, txt, kb) => { enviou = txt; tecladoEnviado = kb; return true; };

  c.processarMensagemTexto({ chat: { id: 123 }, text: '/atb meropenem clcr 20' });
  assert(enviou.includes('AJUSTE RENAL DE ANTIMICROBIANOS'));
  assert(enviou.includes('Meropenem'));
  assert(enviou.includes('500 mg'));
  assert(enviou.includes('12h'));
  assert(tecladoEnviado && Array.isArray(tecladoEnviado.inline_keyboard), 'Deve fornecer navegação contextual');
});

// 9. Prescrição Hospitalar (/rxh): Ordem Canônica de 7 Blocos
test('Prescrição Hospitalar: prompt e estrutura canônica contêm os 7 blocos obrigatórios', () => {
  const { c } = env();
  let promptRecebido = '';
  c.executarRaciocinioClinico = (prompt, dados, tokens) => {
    promptRecebido = prompt;
    return '🏥 *PRESCRIÇÃO HOSPITALAR DE INTERNAÇÃO (ORDEM CANÔNICA)*\n\n' +
      '1. *DIETA:* Geral hipossódica para diabético\n' +
      '2. *HIDRATAÇÃO VENOSA:* SG 5% 500 mL + KCl 19,1% 10 mL EV a 42 mL/h\n' +
      '3. *ANTIMICROBIANOS:* Ceftriaxona 2g EV 1x/dia D1/7\n' +
      '4. *MEDICAÇÕES DE USO CONTÍNUO:* Suspensa metformina; mantida sinvastatina\n' +
      '5. *PROFILAXIAS DE LEITO:* Enoxaparina 40 mg SC 1x/dia\n' +
      '6. *SINTOMÁTICOS & SOS:* Dipirona 1g EV 6/6h se dor ou febre\n' +
      '7. *CUIDADOS DE ENFERMAGEM:* Sinais vitais 6/6h, cabeceira 30-45°';
  };

  const prescricao = c.gerarPrescricaoHospitalarComIA('Paciente 70a internado com PAC grave, HAS e DM2, Cr 1.4');
  assert(promptRecebido.includes('ORDEM CANÔNICA OBRIGATÓRIA DA PRESCRIÇÃO HOSPITALAR'));
  assert(promptRecebido.includes('1. DIETA'));
  assert(promptRecebido.includes('2. HIDRATAÇÃO VENOSA'));
  assert(promptRecebido.includes('3. ANTIMICROBIANOS'));
  assert(promptRecebido.includes('5. PROFILAXIAS HOSPITALARES OBRIGATÓRIAS'));
  assert(prescricao.includes('DIETA'));
  assert(prescricao.includes('HIDRATAÇÃO VENOSA'));
  assert(prescricao.includes('ANTIMICROBIANOS'));
  assert(prescricao.includes('PROFILAXIAS DE LEITO'));
  assert(prescricao.includes('CUIDADOS DE ENFERMAGEM'));
});

// 10. Telegram Handler: /rxh roteia corretamente
test('Telegram Handler: /rxh aciona geração de prescrição hospitalar', () => {
  const { c } = env();
  let modoAcionado = '';
  c.processarEEntregarIA = (chatId, fn, dados, modo) => {
    modoAcionado = modo;
    return fn(dados);
  };
  c.executarRaciocinioClinico = () => 'Prescrição hospitalar montada com sucesso.';

  c.processarMensagemTexto({ chat: { id: 123 }, text: '/rxh Paciente 65a leito 8 pneumonia aspirativa' });
  assert.equal(modoAcionado, 'rxh', 'Modo deve ser rxh');
});

console.log(`\n🎉 Todos os ${pass}/${total} testes de Prescrição Hospitalar e Ajuste Renal foram APROVADOS!`);
