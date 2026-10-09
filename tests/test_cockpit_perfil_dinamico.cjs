// Teste automatizado para cockpitPerfil e cockpitRegistrarPeso (novas funções de UI/UX)
const assert = require('assert');
const fs = require('fs');

function carregarAmbiente() {
  const store = {};
  const scriptProps = {};
  global.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: k => scriptProps[k] ?? null,
      setProperty: (k, v) => { scriptProps[k] = String(v); },
      getProperties: () => ({ ...scriptProps })
    })
  };
  global.ConfigService = {
    get: (k, def) => scriptProps[k] ?? def ?? '',
    exigir: (k) => {
      const v = scriptProps[k];
      if (!v) throw new Error('Ausente: ' + k);
      return v;
    },
    invalidar: () => {}
  };
  global.Utilities = {
    computeHmacSha256Signature: (data, key) => {
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', Buffer.from(key));
      hmac.update(Buffer.from(data));
      return Array.from(hmac.digest());
    },
    newBlob: (s) => ({
      getBytes: () => Array.from(Buffer.from(s, 'utf8'))
    }),
    getUuid: () => require('crypto').randomUUID()
  };
  global.LockService = {
    getUserLock: () => ({
      tryLock: () => true,
      releaseLock: () => {}
    })
  };
  global.Logger = { log: () => {} };
  global.modoBot = () => null;
  global.PersistenciaBot = { ler: () => null, salvar: () => {}, remover: () => {} };
  global.EnfermariaService = { obterTodos: () => ({}), obterLeito: () => null };
  global.RotinaService = {
    obterBlocosDoDia: () => [
      { nome: 'Plantão Enfermaria', horario: '07:00 - 13:00', ativo: true },
      { nome: 'Estudo MedQuest', horario: '20:30 - 22:30', ativo: false }
    ]
  };

  // Executa o script no escopo global para expor as funções
  const codigo = fs.readFileSync('src/13_cockpit_integracao.js', 'utf8');
  const vm = require('vm');
  vm.runInThisContext(codigo);

  // Configurações obrigatórias
  scriptProps['TELEGRAM_BOT_TOKEN'] = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
  scriptProps['TELEGRAM_CHAT_ID'] = '987654321';

  return { scriptProps };
}

function gerarInitData(token, userId) {
  const crypto = require('crypto');
  const authDate = Math.floor(Date.now() / 1000);
  const userJson = JSON.stringify({ id: Number(userId), first_name: 'Dr. Wagner' });
  const params = {
    auth_date: String(authDate),
    query_id: 'teste_perfil_1',
    user: userJson
  };
  const dataCheckString = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  return Object.keys(params).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&') + `&hash=${hash}`;
}

console.log('Iniciando testes de Perfil Dinâmico do Cockpit...');

// 1. Rejeição sem autenticação
const env1 = carregarAmbiente();
assert.throws(() => cockpitPerfil(''), /Telegram/);
assert.throws(() => cockpitRegistrarPeso('', '80.5'), /Telegram/);
console.log('✓ Rejeição sem credenciais');

// 2. Consulta de perfil com dados iniciais vazios
const token = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
const authOk = gerarInitData(token, '987654321');
const perfilInicial = cockpitPerfil(authOk);
assert.strictEqual(perfilInicial.protocolo, 'Cutting Natural (Musculação)');
assert.strictEqual(perfilInicial.peso_atual, null);
assert.strictEqual(perfilInicial.bf, null);
assert.strictEqual(perfilInicial.rotina_blocos.length, 2);
assert.strictEqual(perfilInicial.rotina_blocos[0].nome, 'Plantão Enfermaria');
console.log('✓ Perfil inicial limpo e dinâmico');

// 3. Validação de peso fora da faixa biológica aceitável
assert.throws(() => cockpitRegistrarPeso(authOk, '20'), /Peso inválido/);
assert.throws(() => cockpitRegistrarPeso(authOk, '350'), /Peso inválido/);
assert.throws(() => cockpitRegistrarPeso(authOk, 'abc'), /Peso inválido/);
console.log('✓ Validação de limites de peso');

// 4. Registro com vírgula e BF%
const resultadoRegistro = cockpitRegistrarPeso(authOk, '97,4', '23.5', '17');
assert.strictEqual(resultadoRegistro.sucesso, true);
assert.strictEqual(resultadoRegistro.peso, 97.4);
console.log('✓ Registro com conversão de vírgula');

// 5. Consulta subsequente retorna valores persistidos
const perfilAtualizado = cockpitPerfil(authOk);
assert.strictEqual(perfilAtualizado.peso_atual, 97.4);
assert.strictEqual(perfilAtualizado.bf, 23.5);
assert.strictEqual(perfilAtualizado.semana, 17);
console.log('✓ Persistência em ScriptProperties verificada');

console.log('TODOS OS 5 TESTES DE PERFIL DINÂMICO APROVADOS! ✅');
