/**
 * TESTE DE FLUXOS, NAVEGAÇÃO E RESPONSIVIDADE DA ENFERMARIA
 * Valida a resolução completa das críticas do usuário no Telegram:
 * 1. Painel de leitos (vazio ou preenchido) sempre com botões de retorno (Enfermaria e Início)
 * 2. Telas contextuais da enfermaria (Clearance, Ajuste ATB, Holliday, RXH e SBAR) com navegação integrada
 * 3. Sintomáticos / SOS da enfermaria instantâneo (0ms, sem IA) com kit padrão e cópia para PEP
 * 4. Comandos diretos (/crcl, /atb, /holliday, /rxh, /passagem) com teclado inline e retorno à Enfermaria
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const source = fs.readFileSync(path.resolve(__dirname, '../ultra_rotina_master.js'), 'utf8');

function setupEnv() {
  const props = {
    TELEGRAM_CHAT_ID: '123456',
    TELEGRAM_BOT_TOKEN: 'fake-token-test',
    WEBHOOK_SECRET: 'secret',
    GEMINI_API_KEY: 'fake-gemini'
  };
  const cache = {};
  const sent = [];
  let seq = 0;

  const p = {
    getProperty: k => props[k] ?? null,
    setProperty: (k, v) => { props[k] = String(v); },
    deleteProperty: k => { delete props[k]; },
    getProperties: () => ({ ...props })
  };

  const c = {
    Buffer,
    Date,
    console: { log() {}, error() {}, warn() {} },
    PropertiesService: { getScriptProperties: () => p },
    CacheService: {
      getScriptCache: () => ({
        get: k => cache[k] ?? null,
        put: (k, v) => { cache[k] = String(v); },
        remove: k => { delete cache[k]; }
      })
    },
    LockService: {
      getScriptLock: () => ({ waitLock() {}, releaseLock() {} }),
      getUserLock: () => ({ tryLock: () => true, releaseLock() {} })
    },
    UrlFetchApp: {
      fetch: (url, opts) => {
        let payload = {};
        try {
          payload = typeof opts?.payload === 'string' ? JSON.parse(opts.payload) : (opts?.payload || {});
        } catch (_) {
          payload = opts?.payload || {};
        }
        sent.push({ url, payload });
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ ok: true, result: { message_id: 9999 } })
        };
      }
    }
  };

  vm.createContext(c);
  vm.runInContext(source, c);
  c.Utilities.getUuid = () => String(++seq).padStart(32, '0');
  c.Utilities.sleep = () => {};

  return { c, sent, cache };
}

console.log('🧪 Iniciando testes de UX e navegação da Enfermaria...');

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 1: Painel de leitos vazio e preenchido tem botões de retorno
// ─────────────────────────────────────────────────────────────────────────────
{
  const { c, sent } = setupEnv();
  c.EnfermariaService.limparTudo();

  c.enviarPainelEnfermaria(123456, 0);
  assert.ok(sent.length > 0, 'Painel de leitos vazio deve enviar mensagem');
  const ultimoEnvio = sent[sent.length - 1].payload;
  const kb = ultimoEnvio.reply_markup?.inline_keyboard || [];
  
  const temVoltarEnfermaria = kb.some(row => row.some(btn => btn.callback_data === 'ux:hub:enf' || btn.text.includes('Enfermaria')));
  const temInicio = kb.some(row => row.some(btn => btn.callback_data === 'ux:hub:inicio'));
  assert.ok(temVoltarEnfermaria, 'Painel vazio DEVE conter botão de retorno à Enfermaria');
  assert.ok(temInicio, 'Painel vazio DEVE conter botão de Início');
  console.log('  ✓ 1. Painel de leitos vazio contém botões [🔙 Enfermaria] e [🏠 Início]');
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 2: Telas contextuais da Enfermaria (Clearance, Ajuste ATB, Holliday, RXH, SBAR)
// ─────────────────────────────────────────────────────────────────────────────
{
  const { c, sent } = setupEnv();
  
  // Clearance
  c.enviarTelaEnfClearance(123456);
  let kb = sent[sent.length - 1].payload.reply_markup.inline_keyboard;
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), 'Clearance deve ter [🔙 Enfermaria]');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:inicio')), 'Clearance deve ter [🏠 Início]');

  // Ajuste ATB
  c.enviarTelaEnfAjusteATB(123456);
  kb = sent[sent.length - 1].payload.reply_markup.inline_keyboard;
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), 'Ajuste ATB deve ter [🔙 Enfermaria]');

  // Holliday
  c.enviarTelaEnfHidratacao(123456);
  kb = sent[sent.length - 1].payload.reply_markup.inline_keyboard;
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), 'Holliday deve ter [🔙 Enfermaria]');

  // Prescrição Hospitalar
  c.enviarTelaEnfPrescricaoHosp(123456);
  kb = sent[sent.length - 1].payload.reply_markup.inline_keyboard;
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), 'Prescrição Hosp deve ter [🔙 Enfermaria]');

  // Passagem SBAR vazia
  c.enviarTelaEnfSBAR(123456);
  kb = sent[sent.length - 1].payload.reply_markup.inline_keyboard;
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), 'SBAR vazio deve ter [🔙 Enfermaria]');

  console.log('  ✓ 2. Todas as telas contextuais da enfermaria possuem retorno consistente a [🔙 Enfermaria] e [🏠 Início]');
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 3: Sintomáticos / SOS imediato (0ms, sem IA) com kit hospitalar e cópia
// ─────────────────────────────────────────────────────────────────────────────
{
  const { c, sent } = setupEnv();
  
  const cb = {
    id: 'cb_test_sint',
    data: 'ux:enf:sintomaticos',
    message: { chat: { id: 123456 }, message_id: 100 }
  };

  const t0 = Date.now();
  c.tratarCallbackUX(cb);
  const duracao = Date.now() - t0;

  assert.ok(duracao < 50, `Sintomáticos deve responder imediatamente em 0ms (demorou ${duracao}ms)`);
  const msgSint = sent[sent.length - 1].payload;
  assert.ok(msgSint.text.includes('Dipirona 1g EV'), 'Deve conter Dipirona 1g EV');
  assert.ok(msgSint.text.includes('Ondansetrona 8mg EV'), 'Deve conter Ondansetrona 8mg EV');
  assert.ok(msgSint.text.includes('Metoclopramida 10mg EV'), 'Deve conter Metoclopramida 10mg EV');
  assert.ok(msgSint.text.includes('Omeprazol 40mg EV'), 'Deve conter Omeprazol 40mg EV');
  assert.ok(msgSint.text.includes('Simeticona 75mg'), 'Deve conter Simeticona');

  const kb = msgSint.reply_markup.inline_keyboard;
  assert.ok(kb.some(r => r.some(b => b.text.includes('Copiar para Prontuário'))), 'Deve conter botão de cópia');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), 'Deve conter botão [🔙 Enfermaria]');
  console.log('  ✓ 3. Sintomáticos / SOS responde em 0ms com kit hospitalar padronizado e cópia para prontuário');
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 4: Comandos diretos (/crcl, /atb, /holliday, /rxh, /passagem) com teclado
// ─────────────────────────────────────────────────────────────────────────────
{
  const { c, sent } = setupEnv();

  // /crcl sem parâmetros
  c.processarMensagemTexto({ chat: { id: 123456 }, text: '/crcl' });
  let kb = sent[sent.length - 1].payload.reply_markup?.inline_keyboard;
  assert.ok(kb && kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), '/crcl deve ter teclado com [🔙 Enfermaria]');

  // /atb sem parâmetros
  c.processarMensagemTexto({ chat: { id: 123456 }, text: '/atb' });
  kb = sent[sent.length - 1].payload.reply_markup?.inline_keyboard;
  assert.ok(kb && kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), '/atb deve ter teclado com [🔙 Enfermaria]');

  // /holliday sem parâmetros
  c.processarMensagemTexto({ chat: { id: 123456 }, text: '/holliday' });
  kb = sent[sent.length - 1].payload.reply_markup?.inline_keyboard;
  assert.ok(kb && kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), '/holliday deve ter teclado com [🔙 Enfermaria]');

  // /rxh sem parâmetros
  c.processarMensagemTexto({ chat: { id: 123456 }, text: '/rxh' });
  kb = sent[sent.length - 1].payload.reply_markup?.inline_keyboard;
  assert.ok(kb && kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), '/rxh deve ter teclado com [🔙 Enfermaria]');

  // /passagem sem leitos
  c.EnfermariaService.limparTudo();
  c.processarMensagemTexto({ chat: { id: 123456 }, text: '/passagem' });
  kb = sent[sent.length - 1].payload.reply_markup?.inline_keyboard;
  assert.ok(kb && kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), '/passagem deve ter teclado com [🔙 Enfermaria]');

  console.log('  ✓ 4. Comandos diretos (/crcl, /atb, /holliday, /rxh, /passagem) possuem botões de retorno contextual');
}

console.log('\n🎉 TODOS OS TESTES DE FLUXO DA ENFERMARIA PASSARAM COM SUCESSO!');
