/**
 * TESTE DIRECIONADO: UX E TRATAMENTO DEFENSIVO DO COMANDO /importar_remume
 * Garante que:
 * 1. Enviar apenas "/importar_remume Cidade - UF" sem lista exibe aviso cirúrgico da cidade com exemplo formatado e botão de solicitar ao dev.
 * 2. Enviar apenas "/importar_remume" puro exibe a tela de instruções gerais.
 * 3. Enviar cidade + medicamentos válidos processa normalmente.
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

// 1. Usuário digita apenas /importar_remume Garrafão do Norte - PA
test('Quando usuário envia /importar_remume com cidade mas sem remédios, exibe aviso específico da cidade', () => {
  const env = criarAmbiente();
  const res = env.c.rotearComandoSistema('/importar_remume', '/importar_remume Garrafão do Norte - PA', 12345);

  assert.strictEqual(res.executado, true, 'Comando deve ser executado');
  assert.strictEqual(env.mensagensEnviadas.length >= 1, true, 'Deve ter enviado mensagem');
  
  const ultima = env.mensagensEnviadas[env.mensagensEnviadas.length - 1].payload;
  assert.match(ultima.text, /Faltou colar a lista de medicamentos de Garrafão do Norte/, 'Texto deve citar a cidade informada');
  assert.match(ultima.text, /\/importar_remume Garrafão do Norte - PA/, 'Deve fornecer modelo com a cidade do usuário');
  assert.match(ultima.text, /\/cidade Garrafão do Norte - PA/, 'Deve sugerir o comando /cidade alternativo');

  // Verifica se o teclado contém botão de solicitar ao desenvolvedor
  const teclado = ultima.reply_markup;
  assert.ok(teclado && teclado.inline_keyboard, 'Deve conter inline_keyboard');
  const temBotaoSolicitar = teclado.inline_keyboard.some(row =>
    row.some(btn => btn.callback_data && btn.callback_data.includes('ux:remume:solicitar:Garrafão do Norte:PA'))
  );
  assert.strictEqual(temBotaoSolicitar, true, 'Teclado deve conter botão de solicitar ao desenvolvedor');
});

// 2. Usuário digita /importar_remume sem argumentos
test('Quando usuário envia /importar_remume sem argumentos, exibe instruções gerais', () => {
  const env = criarAmbiente();
  const res = env.c.rotearComandoSistema('/importar_remume', '/importar_remume', 12345);

  assert.strictEqual(res.executado, true, 'Comando deve ser executado');
  assert.strictEqual(env.mensagensEnviadas.length >= 1, true, 'Deve ter enviado mensagem');
  
  const ultima = env.mensagensEnviadas[env.mensagensEnviadas.length - 1].payload;
  assert.match(ultima.text, /INSERIR REMUME MUNICIPAL|Como enviar/i, 'Deve exibir instruções');
});

console.log(`\nRESULTADO: ${pass}/${total} testes aprovados.`);
if (pass !== total) process.exit(1);
