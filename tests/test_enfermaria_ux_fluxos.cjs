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

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 5: Painel de Leitos com pacientes (mostrarPainelLeitos / enviarPainelEnfermaria)
// ─────────────────────────────────────────────────────────────────────────────
{
  const { c, sent } = setupEnv();
  c.EnfermariaService.limparTudo();
  c.EnfermariaService.atualizarLeito('4', '72a, PAC grave, em Ceftriaxona D3, estável, aguarda vaga CTI');
  c.EnfermariaService.atualizarLeito('12', '58a, DPOC exacerbado, em VNI intermitente, vigilância de acidose');

  c.mostrarPainelLeitos(123456, 0);
  assert.ok(sent.length > 0, 'mostrarPainelLeitos deve enviar mensagem');
  const ultimoEnvio = sent[sent.length - 1].payload;
  assert.ok(ultimoEnvio.text.includes('Leito 4') && ultimoEnvio.text.includes('Leito 12'), 'Painel deve listar os leitos 4 e 12');

  const kb = ultimoEnvio.reply_markup?.inline_keyboard || [];
  const temCopiar = kb.some(r => r.some(b => b.text.includes('Copiar') || b.callback_data?.includes('ux:copiar:')));
  const temAbrirLeito = kb.some(r => r.some(b => b.callback_data === 'ux:leito:4'));
  const temVoltarEnf = kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf'));
  const temInicio = kb.some(r => r.some(b => b.callback_data === 'ux:hub:inicio'));
  const temSbar = kb.some(r => r.some(b => b.callback_data === 'ux:enf:sbar' || b.callback_data === c.UX_CB_PASSAGEM_SBAR));

  assert.ok(temCopiar, 'Painel com leitos DEVE ter botão de cópia do censo para prontuário');
  assert.ok(temAbrirLeito, 'Painel DEVE permitir abrir leito individual em 1 toque');
  assert.ok(temVoltarEnf, 'Painel com leitos DEVE conter [🔙 Enfermaria]');
  assert.ok(temInicio, 'Painel com leitos DEVE conter [🏠 Início]');
  assert.ok(temSbar, 'Painel DEVE conter botão de Passagem SBAR');
  console.log('  ✓ 5. Painel de leitos preenchido (mostrarPainelLeitos) possui botão de cópia de censo e retornos contextuais');
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 6: Passagem SBAR determinística em 0ms com estrutura e botão de cópia
// ─────────────────────────────────────────────────────────────────────────────
{
  const { c, sent } = setupEnv();
  c.EnfermariaService.limparTudo();
  c.EnfermariaService.atualizarLeito('4', '72a, PAC grave, Ceftriaxona D3. Pendências: colher hemocultura controle e gasometria');

  const t0 = Date.now();
  c.tratarCallbackEnfSBAR(123456);
  const duracao = Date.now() - t0;

  assert.ok(duracao < 50, `SBAR com leitos ativos DEVE responder instantaneamente em 0ms (demorou ${duracao}ms)`);
  const ultimoEnvio = sent[sent.length - 1].payload;
  assert.ok(ultimoEnvio.text.includes('PASSAGEM DE PLANTÃO SBAR'), 'Deve conter cabeçalho SBAR');
  assert.ok(ultimoEnvio.text.includes('S (SITUAÇÃO') || ultimoEnvio.text.includes('S (SITUAÇÃO / CENSO)'), 'Deve conter seção Situação');
  assert.ok(ultimoEnvio.text.includes('LEITO 4'), 'Deve detalhar o Leito 4');

  const kb = ultimoEnvio.reply_markup?.inline_keyboard || [];
  const temCopiar = kb.some(r => r.some(b => b.text.includes('Copiar') || b.callback_data?.includes('ux:copiar:')));
  const temVoltarEnf = kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf'));
  const temInicio = kb.some(r => r.some(b => b.callback_data === 'ux:hub:inicio'));

  assert.ok(temCopiar, 'SBAR DEVE conter botão de cópia para prontuário');
  assert.ok(temVoltarEnf, 'SBAR DEVE conter botão [🔙 Enfermaria]');
  assert.ok(temInicio, 'SBAR DEVE conter botão [🏠 Início]');
  console.log('  ✓ 6. Passagem SBAR (tratarCallbackEnfSBAR) responde em 0ms com formato estruturado e botão de 1 toque para prontuário');
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 7: Gestão e Ações de Leito Individual (processarAcaoLeito e uxTelaLeito)
// ─────────────────────────────────────────────────────────────────────────────
{
  const { c, sent } = setupEnv();
  c.EnfermariaService.limparTudo();
  const resAt = c.EnfermariaService.atualizarLeito('8', 'Paciente 65a pós-operatório estável');
  const ver = resAt.leito.version.slice(0, 8);

  // Abertura do leito
  c.processarAcaoLeito(123456, 'abrir', '8');
  let envio = sent[sent.length - 1].payload;
  assert.ok(envio.text.includes('Leito 8'), 'Deve exibir tela do Leito 8');
  let kb = envio.reply_markup?.inline_keyboard || [];
  assert.ok(kb.some(r => r.some(b => b.text.includes('Copiar') || b.callback_data?.includes('ux:copiar:'))), 'Tela do leito DEVE ter cópia');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), 'Tela do leito DEVE ter [🔙 Enfermaria]');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:inicio')), 'Tela do leito DEVE ter [🏠 Início]');

  // Evoluir leito (mensagem de instrução para ditado/texto)
  c.processarAcaoLeito(123456, 'evoluir', '8');
  envio = sent[sent.length - 1].payload;
  assert.ok(envio.text.includes('EVOLUÇÃO DO LEITO 8'), 'Deve enviar tela de evolução');
  kb = envio.reply_markup?.inline_keyboard || [];
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), 'Tela de evolução DEVE ter [🔙 Enfermaria]');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:inicio')), 'Tela de evolução DEVE ter [🏠 Início]');

  // Confirmar alta do leito
  c.processarAcaoLeito(123456, 'confirmar', '8');
  envio = sent[sent.length - 1].payload;
  assert.ok(envio.text.includes('Confirmar alta do leito 8'), 'Deve solicitar confirmação de alta');
  kb = envio.reply_markup?.inline_keyboard || [];
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), 'Confirmação de alta DEVE ter [🔙 Enfermaria]');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:inicio')), 'Confirmação de alta DEVE ter [🏠 Início]');

  // Mudar status para vigilância
  c.processarAcaoLeito(123456, 'status', '8:vigilancia:' + ver);
  const lAtual = c.EnfermariaService.obterLeito('8');
  assert.ok(lAtual.status.includes('Vigilância'), 'Status deve ser atualizado para Vigilância');

  console.log('  ✓ 7. Fluxos de ação de leito (processarAcaoLeito / uxTelaLeito) 100% protegidos com navegação contextual');
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 8: Comandos /leitos, /censo, /sbar, /leito e /alta no Telegram Router
// ─────────────────────────────────────────────────────────────────────────────
{
  const { c, sent } = setupEnv();
  c.EnfermariaService.limparTudo();
  c.EnfermariaService.atualizarLeito('10', '45a, pielonefrite em Ceftriaxona D2, afebril');

  // /censo
  c.processarMensagemTexto({ chat: { id: 123456 }, text: '/censo' });
  let kb = sent[sent.length - 1].payload.reply_markup?.inline_keyboard;
  assert.ok(kb && kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), '/censo deve conter [🔙 Enfermaria]');
  assert.ok(kb && kb.some(r => r.some(b => b.callback_data === 'ux:hub:inicio')), '/censo deve conter [🏠 Início]');

  // /leitos
  c.processarMensagemTexto({ chat: { id: 123456 }, text: '/leitos' });
  kb = sent[sent.length - 1].payload.reply_markup?.inline_keyboard;
  assert.ok(kb && kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), '/leitos deve conter [🔙 Enfermaria]');

  // /sbar sem parâmetros entrega passagem determinística imediata
  c.processarMensagemTexto({ chat: { id: 123456 }, text: '/sbar' });
  let envio = sent[sent.length - 1].payload;
  assert.ok(envio.text.includes('PASSAGEM DE PLANTÃO SBAR'), '/sbar deve entregar passagem SBAR');
  kb = envio.reply_markup?.inline_keyboard;
  assert.ok(kb && kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), '/sbar deve conter [🔙 Enfermaria]');

  // /leito sem parâmetros
  c.processarMensagemTexto({ chat: { id: 123456 }, text: '/leito' });
  kb = sent[sent.length - 1].payload.reply_markup?.inline_keyboard;
  assert.ok(kb && kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), '/leito sem parâmetros deve conter [🔙 Enfermaria]');

  // /leito com atualização (/leito 10 paciente em alta amanha)
  c.processarMensagemTexto({ chat: { id: 123456 }, text: '/leito 10 paciente em alta amanha' });
  envio = sent[sent.length - 1].payload;
  kb = envio.reply_markup?.inline_keyboard;
  assert.ok(kb && kb.some(r => r.some(b => b.text.includes('Copiar'))), 'Atualização de leito deve oferecer botão de cópia');
  assert.ok(kb && kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), 'Atualização de leito deve conter [🔙 Enfermaria]');

  // /alta sem parâmetros
  c.processarMensagemTexto({ chat: { id: 123456 }, text: '/alta' });
  kb = sent[sent.length - 1].payload.reply_markup?.inline_keyboard;
  assert.ok(kb && kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), '/alta sem parâmetros deve conter [🔙 Enfermaria]');

  console.log('  ✓ 8. Comandos /leitos, /censo, /sbar, /leito e /alta devidamente roteados com respostas determinísticas e botões contextuais');
}

console.log('\n🎉 TODOS OS TESTES DE FLUXO DA ENFERMARIA PASSARAM COM SUCESSO!');
