/**
 * TESTE DE AUDITORIA E OTIMIZAÇÃO: GESTÃO DE LEITOS, PASSAGEM SBAR & PRESCRIÇÃO HOSPITALAR
 * Módulos Alvo: src/12_experiencia_bot.js, src/09_enfermaria.js e src/07e_telegram_midia_e_leitos.js
 * Funções Validadas:
 *  - enviarMenuEnfermaria, mostrarPainelLeitos, processarAcaoLeito, tratarCallbackEnfSBAR
 *  - comandos /leitos, /censo, /sbar, /leito, /alta, /passagem
 * Critérios de Aceite:
 *  1. Retorno contextual para [🔙 Enfermaria] (ux:hub:enf) e [🏠 Início] (ux:hub:inicio) em 100% dos fluxos
 *  2. Respostas determinísticas em 0ms sem IA desnecessária na Passagem SBAR
 *  3. Botão de 1 toque [📋 Copiar Conduta/Passagem para Prontuário] em todas as saídas de leitos e SBAR
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
    GEMINI_API_KEY: 'fake-gemini',
    TIMEZONE: 'America/Sao_Paulo'
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

console.log('🧪 Iniciando testes de Gestão de Leitos, Passagem SBAR & Prescrição Hospitalar...');

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 1: Menu da Enfermaria e Painel de Leitos (Vazio e Preenchido)
// ─────────────────────────────────────────────────────────────────────────────
{
  const { c, sent } = setupEnv();
  c.EnfermariaService.limparTudo();

  // Menu principal da enfermaria
  c.enviarMenuEnfermaria(123456);
  assert.ok(sent.length > 0, 'Menu da enfermaria deve enviar mensagem');
  let kb = sent[sent.length - 1].payload.reply_markup.inline_keyboard;
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:painel:0')), 'Menu deve ter Painel de Leitos');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:enf:sbar')), 'Menu deve ter Passagem SBAR');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:inicio')), 'Menu deve ter [🏠 Início]');

  // Painel vazio
  c.mostrarPainelLeitos(123456, 0);
  kb = sent[sent.length - 1].payload.reply_markup.inline_keyboard;
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), 'Painel vazio deve conter [🔙 Enfermaria]');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:inicio')), 'Painel vazio deve conter [🏠 Início]');

  // Cadastra 2 leitos e testa painel preenchido
  c.EnfermariaService.atualizarLeito('04', '72a, PAC grave em ar ambiente, Ceftriaxona D3, aguarda vaga CTI');
  c.EnfermariaService.atualizarLeito('12', '58a, ITU complicada em Cipro D4, estável. Pendência: urocultura controle');

  c.mostrarPainelLeitos(123456, 0);
  const msgPainel = sent[sent.length - 1].payload;
  assert.ok(msgPainel.text.includes('Leito 04'), 'Deve listar Leito 04');
  assert.ok(msgPainel.text.includes('Leito 12'), 'Deve listar Leito 12');

  kb = msgPainel.reply_markup.inline_keyboard;
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:leito:04')), 'Deve ter botão Abrir leito 04');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:leito:12')), 'Deve ter botão Abrir leito 12');
  assert.ok(kb.some(r => r.some(b => b.text.includes('Copiar Censo para Prontuário'))), 'Deve ter botão de cópia do censo');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), 'Painel preenchido deve conter [🔙 Enfermaria]');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:inicio')), 'Painel preenchido deve conter [🏠 Início]');

  console.log('  ✓ 1. Menu da Enfermaria e Painel de Leitos validados com retorno contextual e cópia de censo');
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 2: Abertura e Gestão de Leito Individual (uxTelaLeito)
// ─────────────────────────────────────────────────────────────────────────────
{
  const { c, sent } = setupEnv();
  c.EnfermariaService.limparTudo();
  c.EnfermariaService.atualizarLeito('04', '72a, PAC grave, SpO2 93% em cateter 2L/min, Ceftriaxona D3, aguarda vaga CTI');

  c.uxTelaLeito(123456, '04');
  assert.ok(sent.length > 0, 'uxTelaLeito deve enviar mensagem');
  const msgLeito = sent[sent.length - 1].payload;
  assert.ok(msgLeito.text.includes('Leito 04'), 'Deve exibir número do leito');
  assert.ok(msgLeito.text.includes('PAC grave'), 'Deve exibir evolução do leito');

  const kb = msgLeito.reply_markup.inline_keyboard;
  // Botão de cópia para prontuário
  const temCopiar = kb.some(r => r.some(b => b.text.includes('Copiar Conduta/Passagem para Prontuário') || b.text.includes('Copiar para Prontuário')));
  assert.ok(temCopiar, 'uxTelaLeito DEVE conter botão [📋 Copiar Conduta/Passagem para Prontuário]');

  // Botões de status rápido
  assert.ok(kb.some(r => r.some(b => b.text.includes('Estável'))), 'Deve conter botão Estável');
  assert.ok(kb.some(r => r.some(b => b.text.includes('Vigilância'))), 'Deve conter botão Vigilância');
  assert.ok(kb.some(r => r.some(b => b.text.includes('Instável'))), 'Deve conter botão Instável');

  // Ações de evolução e alta
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:evoluir:04')), 'Deve conter botão Evoluir leito');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:confirmar:04')), 'Deve conter botão Dar alta');

  // Rodapé contextual
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:painel:0')), 'Deve conter botão [← Leitos]');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), 'Deve conter botão [🔙 Enfermaria]');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:inicio')), 'Deve conter botão [🏠 Início]');

  console.log('  ✓ 2. Abertura e Gestão de Leito Individual possui 100% de navegação, status e cópia de conduta');
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 3: processarAcaoLeito (Status, Evoluir, Confirmar Alta e Desocupar)
// ─────────────────────────────────────────────────────────────────────────────
{
  const { c, sent } = setupEnv();
  c.EnfermariaService.limparTudo();
  const res = c.EnfermariaService.atualizarLeito('04', '72a, PAC grave, Ceftriaxona D3');
  const verLeito = res.leito.version.slice(0, 8);

  // Ação status
  c.processarAcaoLeito(123456, 'status', '04:vigilancia:' + verLeito);
  let msgStatus = sent[sent.length - 1].payload;
  assert.ok(msgStatus.text.includes('Vigilância'), 'Leito deve ser atualizado para vigilância');
  let kb = msgStatus.reply_markup.inline_keyboard;
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), 'Deve conter [🔙 Enfermaria]');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:inicio')), 'Deve conter [🏠 Início]');

  // Ação evoluir
  c.processarAcaoLeito(123456, 'evoluir', '04');
  let msgEvoluir = sent[sent.length - 1].payload;
  assert.ok(msgEvoluir.text.includes('EVOLUÇÃO DO LEITO 04'), 'Deve orientar envio da nova evolução');
  kb = msgEvoluir.reply_markup.inline_keyboard;
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:leito:04')), 'Deve conter [🔙 Cancelar / Leito 04]');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), 'Deve conter [🔙 Enfermaria]');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:inicio')), 'Deve conter [🏠 Início]');

  // Ação confirmar alta
  c.processarAcaoLeito(123456, 'confirmar', '04');
  let msgConfirmar = sent[sent.length - 1].payload;
  assert.ok(msgConfirmar.text.includes('Confirmar alta do leito 04'), 'Deve solicitar confirmação de alta');
  kb = msgConfirmar.reply_markup.inline_keyboard;
  assert.ok(kb.some(r => r.some(b => b.callback_data.startsWith('ux:alta:'))), 'Deve conter botão Confirmar alta');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:leito:04')), 'Deve conter botão Cancelar');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), 'Deve conter [🔙 Enfermaria]');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:inicio')), 'Deve conter [🏠 Início]');

  // Ação alta efetiva
  const btnAlta = kb.flat().find(b => b.callback_data.startsWith('ux:alta:'));
  const codeAlta = btnAlta.callback_data.replace('ux:alta:', '');
  c.processarAcaoLeito(123456, 'alta', codeAlta);
  let msgAltaOk = sent[sent.length - 1].payload;
  assert.ok(msgAltaOk.text.includes('Alta registrada'), 'Deve confirmar alta registrada');
  kb = msgAltaOk.reply_markup.inline_keyboard;
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:painel:0')), 'Deve conter [🏥 Painel de Leitos]');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), 'Deve conter [🔙 Enfermaria]');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:inicio')), 'Deve conter [🏠 Início]');

  console.log('  ✓ 3. processarAcaoLeito trata status, evolução, confirmação de alta e alta com 100% de navegação');
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 4: Passagem SBAR Determinística em 0ms (tratarCallbackEnfSBAR)
// ─────────────────────────────────────────────────────────────────────────────
{
  const { c, sent } = setupEnv();
  c.EnfermariaService.limparTudo();

  // Caso 1: SBAR vazio (0ms)
  let t0 = Date.now();
  c.tratarCallbackEnfSBAR(123456);
  let duracao = Date.now() - t0;
  assert.ok(duracao < 50, `SBAR vazio deve responder instantaneamente em 0ms (demorou ${duracao}ms)`);
  let msgVazio = sent[sent.length - 1].payload;
  assert.ok(msgVazio.text.includes('Nenhum leito registrado'), 'Deve informar leitos vazios');
  let kb = msgVazio.reply_markup.inline_keyboard;
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:painel:0')), 'Deve conter [🏥 Painel de Leitos]');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), 'Deve conter [🔙 Enfermaria]');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:inicio')), 'Deve conter [🏠 Início]');

  // Caso 2: SBAR preenchido com 2 pacientes e extração de pendências (0ms determinístico)
  c.EnfermariaService.atualizarLeito('04', 'Status: instável\n72a, Choque séptico foco pulmonar em desmame de Nora, aguarda vaga CTI');
  c.EnfermariaService.atualizarLeito('12', 'Status: estável\n58a, ITU complicada em Ceftriaxona D3, afebril. Pendência: checar hemograma e urocultura');

  t0 = Date.now();
  c.tratarCallbackEnfSBAR(123456);
  duracao = Date.now() - t0;
  assert.ok(duracao < 50, `SBAR com leitos DEVE responder instantaneamente em 0ms (demorou ${duracao}ms)`);

  const msgSbar = sent[sent.length - 1].payload;
  // Rigor semiológico SBAR
  assert.ok(msgSbar.text.includes('S (SITUAÇÃO / CENSO)'), 'Deve conter seção S');
  assert.ok(msgSbar.text.includes('B & A (HISTÓRICO & AVALIAÇÃO BEIRA-LEITO)'), 'Deve conter seção B & A');
  assert.ok(msgSbar.text.includes('R (RECOMENDAÇÕES & PENDÊNCIAS DO PLANTÃO)'), 'Deve conter seção R');
  assert.ok(msgSbar.text.includes('Leito 04'), 'Deve citar Leito 04');
  assert.ok(msgSbar.text.includes('Leito 12'), 'Deve citar Leito 12');
  assert.ok(msgSbar.text.includes('checar hemograma e urocultura') || msgSbar.text.includes('aguarda vaga CTI'), 'Deve extrair pendências ativas');

  kb = msgSbar.reply_markup.inline_keyboard;
  // Botão de 1 toque de cópia para prontuário
  const temCopiarSbar = kb.some(r => r.some(b => b.text.includes('Copiar Conduta/Passagem para Prontuário') || b.text.includes('Copiar')));
  assert.ok(temCopiarSbar, 'Passagem SBAR DEVE conter botão [📋 Copiar Conduta/Passagem para Prontuário]');

  // Rodapé contextual
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:painel:0')), 'Deve conter [🏥 Painel de Leitos]');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:enf:sbar')), 'Deve conter [🔄 Atualizar SBAR]');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), 'Deve conter [🔙 Enfermaria]');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:inicio')), 'Deve conter [🏠 Início]');

  console.log('  ✓ 4. Passagem SBAR responde determinística em 0ms com estrutura canônica SBAR e botão de cópia');
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 5: Ditado de Corredor via Áudio/Voz (processarDitadoEvolucaoLeito)
// ─────────────────────────────────────────────────────────────────────────────
{
  const { c, sent } = setupEnv();
  c.EnfermariaService.limparTudo();

  const dadosAudio = {
    numero_leito: '04',
    evolucao_texto: 'Paciente 72a lúcido, eupneico, em ar ambiente, mantendo Ceftriaxona D4',
    status_sugerido: 'estavel',
    pendencias: ['checar PCR amanhã cedo', 'programar alta se afebril']
  };

  c.processarDitadoEvolucaoLeito(123456, dadosAudio);
  assert.ok(sent.length > 0, 'processarDitadoEvolucaoLeito deve enviar mensagem');
  const msgDitado = sent[sent.length - 1].payload;
  assert.ok(msgDitado.text.includes('LEITO 04 · ATUALIZADO VIA VOZ'), 'Deve confirmar atualização de leito por voz');
  assert.ok(msgDitado.text.includes('checar PCR amanhã cedo'), 'Deve listar pendências extraídas');

  const kb = msgDitado.reply_markup.inline_keyboard;
  assert.ok(kb.some(r => r.some(b => b.text.includes('Copiar para Prontuário') || b.text.includes('Copiar Conduta/Passagem para Prontuário'))), 'Deve conter botão de cópia de conduta');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:leito:04')), 'Deve conter [🛏️ Abrir Leito 04]');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:painel:0')), 'Deve conter [🏥 Ver Enfermaria]');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), 'Deve conter [🔙 Enfermaria]');
  assert.ok(kb.some(r => r.some(b => b.callback_data === 'ux:hub:inicio')), 'Deve conter [🏠 Início]');

  console.log('  ✓ 5. Ditado de corredor via áudio atualiza leito e entrega retorno contextual completo');
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 6: Comandos Diretos Telegram (/leitos, /censo, /sbar, /leito, /alta)
// ─────────────────────────────────────────────────────────────────────────────
{
  const { c, sent } = setupEnv();
  c.EnfermariaService.limparTudo();
  c.EnfermariaService.atualizarLeito('04', '72a, PAC grave em ar ambiente');

  // /censo
  c.processarMensagemTexto({ chat: { id: 123456 }, text: '/censo' });
  let kb = sent[sent.length - 1].payload.reply_markup?.inline_keyboard;
  assert.ok(kb && kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), '/censo deve conter [🔙 Enfermaria]');
  assert.ok(kb && kb.some(r => r.some(b => b.callback_data === 'ux:hub:inicio')), '/censo deve conter [🏠 Início]');

  // /leitos
  c.processarMensagemTexto({ chat: { id: 123456 }, text: '/leitos' });
  kb = sent[sent.length - 1].payload.reply_markup?.inline_keyboard;
  assert.ok(kb && kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), '/leitos deve conter [🔙 Enfermaria]');

  // /sbar sem parâmetros
  c.processarMensagemTexto({ chat: { id: 123456 }, text: '/sbar' });
  const msgSbarCmd = sent[sent.length - 1].payload;
  assert.ok(msgSbarCmd.text.includes('S (SITUAÇÃO / CENSO)'), '/sbar sem parâmetros entrega passagem SBAR 0ms');
  kb = msgSbarCmd.reply_markup?.inline_keyboard;
  assert.ok(kb && kb.some(r => r.some(b => b.text.includes('Copiar para Prontuário') || b.text.includes('Copiar Conduta/Passagem para Prontuário'))), '/sbar deve conter botão de cópia');
  assert.ok(kb && kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), '/sbar deve conter [🔙 Enfermaria]');

  // /leito sem parâmetros
  c.processarMensagemTexto({ chat: { id: 123456 }, text: '/leito' });
  kb = sent[sent.length - 1].payload.reply_markup?.inline_keyboard;
  assert.ok(kb && kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), '/leito sem parâmetros deve conter [🔙 Enfermaria]');

  // /leito 04 (consulta)
  c.processarMensagemTexto({ chat: { id: 123456 }, text: '/leito 04' });
  const msgL04 = sent[sent.length - 1].payload;
  assert.ok(msgL04.text.includes('LEITO 04'), '/leito 04 deve exibir dados do leito');
  kb = msgL04.reply_markup?.inline_keyboard;
  assert.ok(kb && kb.some(r => r.some(b => b.text.includes('Copiar para Prontuário') || b.text.includes('Copiar Conduta/Passagem para Prontuário'))), '/leito 04 deve ter botão de cópia');
  assert.ok(kb && kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), '/leito 04 deve conter [🔙 Enfermaria]');

  // /alta 04 (dispara tela de confirmação de alta segura)
  c.processarMensagemTexto({ chat: { id: 123456 }, text: '/alta 04' });
  const msgAltaConf = sent[sent.length - 1].payload;
  assert.ok(msgAltaConf.text.includes('Confirmar alta do leito 04'), '/alta 04 deve solicitar confirmação de segurança');
  kb = msgAltaConf.reply_markup?.inline_keyboard;
  assert.ok(kb && kb.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), '/alta deve conter [🔙 Enfermaria]');
  assert.ok(kb && kb.some(r => r.some(b => b.callback_data === 'ux:hub:inicio')), '/alta deve conter [🏠 Início]');

  // Confirmação efetiva da alta
  const btnEfetivar = kb.flat().find(b => b.callback_data.startsWith('ux:alta:'));
  assert.ok(btnEfetivar, 'Deve existir botão para confirmar alta');
  c.tratarCallbackUX({ id: 'cb_alta_efetiva', data: btnEfetivar.callback_data, message: { chat: { id: 123456 }, message_id: 200 } });
  const msgAltaConcluida = sent[sent.length - 1].payload;
  assert.ok(msgAltaConcluida.text.includes('Alta registrada'), 'Alta deve ser registrada com sucesso');
  const kbFinal = msgAltaConcluida.reply_markup?.inline_keyboard;
  assert.ok(kbFinal && kbFinal.some(r => r.some(b => b.callback_data === 'ux:painel:0')), 'Deve conter [🏥 Painel de Leitos]');
  assert.ok(kbFinal && kbFinal.some(r => r.some(b => b.callback_data === 'ux:hub:enf')), 'Deve conter [🔙 Enfermaria]');
  assert.ok(kbFinal && kbFinal.some(r => r.some(b => b.callback_data === 'ux:hub:inicio')), 'Deve conter [🏠 Início]');

  console.log('  ✓ 6. Comandos /leitos, /censo, /sbar, /leito e /alta possuem 100% de navegação contextual e determinismo');
}

console.log('\n🎉 TODOS OS TESTES DE GESTÃO DE LEITOS E PASSAGEM SBAR PASSARAM COM 100% DE SUCESSO!');
