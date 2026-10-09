// Teste automatizado para Teclados Adaptativos Contextuais e Máquina de Estados de UI/UX
const assert = require('assert');
const fs = require('fs');

function carregarAmbiente() {
  const store = {};
  global.CacheService = {
    getScriptCache: () => ({
      get: k => store[k] ?? null,
      put: (k, v) => { store[k] = String(v); },
      remove: k => { delete store[k]; }
    })
  };
  global.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: () => null,
      setProperty: () => {},
      getProperties: () => ({})
    })
  };
  global.ConfigService = {
    get: (k, def) => def ?? '',
    exigir: (k) => 'mock_' + k,
    invalidar: () => {}
  };
  global.Utilities = {
    getUuid: () => require('crypto').randomUUID()
  };
  global.Logger = { log: () => {} };
  global.enviarChatAction = () => {};
  global.enviarMensagemParaChat = () => true;
  global.enviarMensagemSegmentada = (chat, texto, kb) => ({ chat, texto, kb });
  global.executarPostTelegram = () => true;
  global.PersistenciaBot = {
    ler: () => null,
    salvar: () => {},
    remover: () => {}
  };
  global.EnfermariaService = {
    obterTodos: () => ({}),
    obterLeito: () => null,
    atualizarStatusLeito: (id, st) => ({ sucesso: true, mensagem: `Leito ${id} agora está ${st}` })
  };

  const vm = require('vm');
  vm.runInThisContext(fs.readFileSync('src/00_config.js', 'utf8'));
  vm.runInThisContext(fs.readFileSync('src/01_utils.js', 'utf8'));
  vm.runInThisContext(fs.readFileSync('src/12_experiencia_bot.js', 'utf8'));

  return { store };
}

console.log('Iniciando testes da Máquina de Estados do Teclado Adaptativo...');

// 1. Teclado Fixo Universal 2x2 com SOAP prioritário
carregarAmbiente();
const kbUniversal = obterTecladoFixoPrincipal();
assert.strictEqual(kbUniversal.keyboard.length, 3);
assert.deepStrictEqual(
  kbUniversal.keyboard[0].map(b => b.text),
  ['🩺 SOAP Ambulatorial', '🏥 Enfermaria']
);
assert.strictEqual(kbUniversal.keyboard[1][0].text, '🚨 Emergência');
assert.strictEqual(kbUniversal.keyboard[1][1].text, '💊 REMUME Rápida');
console.log('✓ Teclado Fixo Universal 2x2 com SOAP prioritário verificado');

// 2. Despachante Contextual retorna sempre o Teclado Universal estável
assert.deepStrictEqual(obterTecladoContextual('soap'), kbUniversal);
assert.deepStrictEqual(obterTecladoContextual('leito'), kbUniversal);
assert.deepStrictEqual(obterTecladoContextual('sala'), kbUniversal);
assert.deepStrictEqual(obterTecladoContextual(null), kbUniversal);
console.log('✓ Despachante contextual estável verificado');

// 3. Reset e Conclusão Limpa em 1 toque com 🧹 Novo Paciente
const chatId = 999;
definirModoBot(chatId, 'soap', 'Paciente com dor torácica');
assert.notStrictEqual(modoBot(chatId), null);

let respostaEnviada = null;
global.enviarMensagemComTecladoFixo = (chat, msg) => {
  respostaEnviada = { chat, msg };
  return true;
};

// Dispara '🧹 Novo Paciente'
const processado = tratarEntradaUX({ chat: { id: chatId }, text: '🧹 Novo Paciente' });
assert.strictEqual(processado, true);
assert.strictEqual(modoBot(chatId), null);
assert.ok(respostaEnviada.msg.includes('Memória limpa'));
console.log('✓ Reset em 1 toque com 🧹 Novo Paciente restaura Standby e limpa memória');

console.log('TODOS OS TESTES DE TECLADOS ADAPTATIVOS APROVADOS! ✅');
