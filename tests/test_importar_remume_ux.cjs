/**
 * TESTE DIRECIONADO: UNIFICAÇÃO DA SELEÇÃO DE CIDADE E ELIMINAÇÃO DA IMPORTAÇÃO MANUAL
 * Garante que:
 * 1. Enviar /cidade ativa o perfil com RENAME Nacional e botão de solicitar ao dev quando não for preset.
 * 2. O fallback não exibe mais botões de "Inserir REMUME manual".
 * 3. Enviar /importar_remume redireciona defensivamente para a configuração de cidade.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const source = fs.readFileSync(path.resolve(__dirname, '../ultra_rotina_master.js'), 'utf8');

function criarAmbiente() {
  const mensagensEnviadas = [];
  const props = { TELEGRAM_BOT_TOKEN: 'mock_token' };

  const c = {
    Buffer,
    Date,
    console: { log() {}, error() {}, warn() {} },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => props,
        getProperty: (k) => props[k]
      })
    },
    CacheService: {
      getScriptCache: () => ({
        get: () => null,
        put: () => {},
        remove: () => {}
      })
    },
    Logger: { log() {} }
  };

  vm.createContext(c);
  vm.runInContext(source, c);

  c.executarPostTelegram = (url, payload) => {
    mensagensEnviadas.push({ url, payload });
    return true;
  };

  return { c, mensagensEnviadas };
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

// 1. Comando /cidade Garrafão do Norte - PA ativa com RENAME e oferece solicitar ao dev
test('1. /cidade Garrafão do Norte - PA ativa cidade com RENAME Nacional e sem opção de inserção manual', () => {
  const env = criarAmbiente();
  const res = env.c.rotearComandoSistema('/cidade', '/cidade Garrafão do Norte - PA', 12345);

  assert.strictEqual(res.executado, true, 'Comando deve ser executado');
  assert.strictEqual(env.mensagensEnviadas.length >= 1, true, 'Deve ter enviado mensagem');

  const ultima = env.mensagensEnviadas[env.mensagensEnviadas.length - 1].payload;
  assert.match(ultima.text, /Configuração de Cidade para Garrafão do Norte/i);
  assert.match(ultima.text, /RENAME Nacional/i);
  assert.doesNotMatch(ultima.text, /Inserir REMUME Agora/i, 'Não deve conter botão/texto de inserir REMUME manual');

  const teclado = ultima.reply_markup;
  assert.ok(teclado && teclado.inline_keyboard);
  const temBotaoSolicitar = teclado.inline_keyboard.some(row =>
    row.some(btn => btn.callback_data && btn.callback_data.includes('ux:remume:solicitar:Garrafão do Norte:PA'))
  );
  assert.strictEqual(temBotaoSolicitar, true, 'Deve conter botão de solicitar ao desenvolvedor');

  const temBotaoInserir = teclado.inline_keyboard.some(row =>
    row.some(btn => btn.callback_data && btn.callback_data.includes('ux:remume:instrucoes'))
  );
  assert.strictEqual(temBotaoInserir, false, 'NÃO deve conter botão de inserir REMUME manual');
});

// 2. Enviar /importar_remume Garrafão do Norte - PA redireciona transparentemente para /cidade
test('2. /importar_remume redireciona de forma transparente e defensiva para /cidade', () => {
  const env = criarAmbiente();
  const res = env.c.rotearComandoSistema('/importar_remume', '/importar_remume Garrafão do Norte - PA', 12345);

  assert.strictEqual(res.executado, true, 'Comando deve ser executado');
  assert.strictEqual(env.mensagensEnviadas.length >= 1, true, 'Deve ter enviado mensagem');

  const ultima = env.mensagensEnviadas[env.mensagensEnviadas.length - 1].payload;
  assert.match(ultima.text, /Configuração de Cidade para Garrafão do Norte/i);
  assert.match(ultima.text, /RENAME Nacional/i);
});

console.log(`\nRESULTADO: ${pass}/${total} testes aprovados.`);
if (pass !== total) process.exit(1);
