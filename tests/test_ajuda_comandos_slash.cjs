/**
 * Testes Automatizados para o Manual Canônico de Comandos Slash (/ajuda, /help, /manual)
 * Valida a regra: 1 comando canônico com barra (/) por função clínica + roteamento em linguagem natural
 */
const assert = require('assert');
const runtime = require('../server/runtime.js');

async function runAjudaTests() {
  console.log('=== INICIANDO BATERIA DE TESTES DO MANUAL DE COMANDOS SLASH ===\n');
  const ctx = runtime.ctx;
  const chatId = '123456789';

  let mensagensEnviadas = [];
  ctx.enviarMensagemParaChat = (id, texto) => {
    mensagensEnviadas.push({ tipo: 'texto', id, texto });
    return true;
  };
  ctx.enviarMensagemComTecladoParaChat = (id, texto, kb) => {
    mensagensEnviadas.push({ tipo: 'teclado', id, texto, kb });
    return true;
  };
  ctx.enviarMensagemComTecladoFixo = (id, texto) => {
    mensagensEnviadas.push({ tipo: 'teclado_fixo', id, texto });
    return true;
  };
  ctx.responderCallbackTelegram = (cbId, texto) => {
    mensagensEnviadas.push({ tipo: 'callback_answer', cbId, texto });
    return true;
  };

  // 1. Validar Catálogo Completo (132 funções clínicas, 1 comando por função)
  console.log('[1] Testando estrutura do catálogo de comandos (1 comando slash por função)...');
  assert.strictEqual(typeof ctx.obterCatalogoComandosSlash, 'function', 'obterCatalogoComandosSlash deve existir');
  const catalogo = ctx.obterCatalogoComandosSlash();
  assert.ok(Array.isArray(catalogo), 'Catálogo deve ser um array');
  assert.strictEqual(catalogo.length, 17, 'Devem existir 17 categorias temáticas');

  let totalCmds = 0;
  const slashCmdsSet = new Set();
  catalogo.forEach(cat => {
    assert.ok(cat.id, 'Categoria deve ter id');
    assert.ok(cat.titulo, 'Categoria deve ter título');
    assert.ok(Array.isArray(cat.comandos), 'Categoria deve ter array de comandos');
    totalCmds += cat.comandos.length;
    cat.comandos.forEach(cmd => {
      assert.ok(cmd.cmd.startsWith('/'), `Comando ${cmd.cmd} deve iniciar com /`);
      assert.ok(cmd.sintaxe, `Comando ${cmd.cmd} deve ter sintaxe`);
      assert.ok(cmd.desc, `Comando ${cmd.cmd} deve ter descrição`);
      assert.strictEqual(cmd.aliases.length, 1, `Comando ${cmd.cmd} deve ter estritamente 1 alias canônico`);
      assert.strictEqual(cmd.aliases[0], cmd.cmd, `Alias deve ser idêntico ao comando canônico`);
      slashCmdsSet.add(cmd.cmd);
    });
  });

  assert.strictEqual(totalCmds, 97, 'Devem existir exatamente 97 comandos funcionais canônicos');
  assert.strictEqual(slashCmdsSet.size, 97, 'Cada função clínica deve ter seu único comando slash sem redundâncias');
  console.log(`  ✓ 17 categorias, 97 funções clínicas e exatamente 97 comandos slash padronizados.`);

  // 1.1 Validar que Categoria Exame Físico possui estritamente /ef com botões interativos
  const catEf = catalogo.find(c => c.id === 'exame_fisico');
  assert.ok(catEf, 'Categoria exame_fisico deve existir');
  assert.strictEqual(catEf.comandos.length, 1, 'Categoria exame_fisico deve conter estritamente o comando /ef');
  assert.strictEqual(catEf.comandos[0].cmd, '/ef', 'Comando de exame físico deve ser /ef');

  // 2. Testar /ajuda completo
  console.log('[2] Testando comando /ajuda completo...');
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/ajuda' });
  assert.ok(mensagensEnviadas.length > 0, 'Deve enviar mensagem');
  assert.ok(!mensagensEnviadas[0].texto.includes('/cancelar · Sair do modo atual'), 'Não pode retornar a mensagem legada de 4 comandos');
  assert.ok(mensagensEnviadas[0].texto.includes('MANUAL DE COMANDOS CANÔNICOS'), 'Deve conter cabeçalho canônico');
  assert.ok(mensagensEnviadas[0].texto.includes('97 comandos padronizados'), 'Deve referenciar os 97 comandos padronizados');
  assert.ok(mensagensEnviadas[0].kb, 'Deve incluir teclado inline de categorias');

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/ajuda todas' });
  assert.ok(mensagensEnviadas.length > 0, 'Deve enviar mensagem');
  const msgAjuda = mensagensEnviadas[0].texto;
  assert.ok(msgAjuda.includes('MANUAL DE COMANDOS CANÔNICOS'), 'Deve conter cabeçalho canônico');
  assert.ok(msgAjuda.includes('97 comandos padronizados'), 'Deve referenciar os 97 comandos padronizados');
  assert.ok(msgAjuda.includes('NÚCLEO, SESSÃO, NAVEGAÇÃO & COCKPIT'), 'Deve conter categoria núcleo');
  assert.ok(msgAjuda.includes('SALA VERMELHA & CTI'), 'Deve conter categoria emergência');
  assert.ok(msgAjuda.includes('PEDIATRIA & SUPORTE VITAL'), 'Deve conter categoria pediatria');
  assert.ok(msgAjuda.includes('OBSTETRÍCIA & MEDICINA FETAL'), 'Deve conter categoria obstetrícia');
  assert.ok(msgAjuda.includes('DERMATOLOGIA & ISTs CUTÂNEAS'), 'Deve conter categoria dermatologia');
  assert.ok(!msgAjuda.includes('_(atalhos:'), 'Não deve exibir poluição de atalhos redundantes');
  assert.ok(mensagensEnviadas[0].kb, 'Deve incluir teclado inline de categorias');
  console.log('  ✓ /ajuda envia manual completo com formato limpo e inline keyboard.');

  // 3. Testar aliases /help e /manual
  console.log('[3] Testando aliases /help e /manual...');
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/help todas' });
  assert.ok(mensagensEnviadas.length > 0);
  assert.ok(mensagensEnviadas[0].texto.includes('MANUAL DE COMANDOS CANÔNICOS'));

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/manual' });
  assert.ok(mensagensEnviadas.length > 0);
  assert.ok(mensagensEnviadas[0].texto.includes('MANUAL DE COMANDOS CANÔNICOS'));
  console.log('  ✓ /help e /manual disparam o manual canônico com consistência.');

  // 4. Testar filtro por categoria (/ajuda emergencia, /ajuda dermato, /ajuda obstetricia)
  console.log('[4] Testando filtragem por especialidade (/ajuda <categoria>)...');
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/ajuda emergencia' });
  assert.ok(mensagensEnviadas.length > 0);
  assert.ok(mensagensEnviadas[0].texto.includes('SALA VERMELHA & CTI'));
  assert.ok(mensagensEnviadas[0].texto.includes('/dva'));
  assert.ok(mensagensEnviadas[0].texto.includes('/sri'));
  assert.ok(!mensagensEnviadas[0].texto.includes('GERIATRIA & SAÚDE DO IDOSO'), 'Não deve misturar outras categorias');

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/ajuda dermato' });
  assert.ok(mensagensEnviadas.length > 0);
  assert.ok(mensagensEnviadas[0].texto.includes('DERMATOLOGIA & ISTs CUTÂNEAS'));
  assert.ok(mensagensEnviadas[0].texto.includes('/dermato'));
  assert.ok(mensagensEnviadas[0].texto.includes('/ulceragenital'));
  assert.ok(mensagensEnviadas[0].texto.includes('/mpox'));

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/ajuda obstetrícia' });
  assert.ok(mensagensEnviadas.length > 0);
  assert.ok(mensagensEnviadas[0].texto.includes('OBSTETRÍCIA & MEDICINA FETAL'));
  assert.ok(mensagensEnviadas[0].texto.includes('/prenatal'));
  assert.ok(mensagensEnviadas[0].texto.includes('/parto'));
  console.log('  ✓ Filtragem por especialidade isola perfeitamente os comandos da categoria solicitada.');

  // 5. Testar busca por comando direto e sinônimos (/ajuda dva, /ajuda /soap, /ajuda ulceragenital, /ajuda receita)
  console.log('[5] Testando busca por comando canônico e sinônimos...');
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/ajuda dva' });
  assert.ok(mensagensEnviadas.length > 0);
  assert.ok(mensagensEnviadas[0].texto.includes('DETALHES DO COMANDO /dva'));
  assert.ok(mensagensEnviadas[0].texto.includes('Noradrenalina'));

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/ajuda /soap' });
  assert.ok(mensagensEnviadas.length > 0);
  assert.ok(mensagensEnviadas[0].texto.includes('DETALHES DO COMANDO /soap'));
  assert.ok(mensagensEnviadas[0].texto.includes('nota estruturada SOAP'));

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/ajuda ulceragenital' });
  assert.ok(mensagensEnviadas.length > 0);
  assert.ok(mensagensEnviadas[0].texto.includes('DETALHES DO COMANDO /ulceragenital'));
  assert.ok(mensagensEnviadas[0].texto.includes('úlceras genitais'));

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/ajuda receita' });
  assert.ok(mensagensEnviadas.length > 0);
  assert.ok(mensagensEnviadas[0].texto.includes('DETALHES DO COMANDO /rx'), 'Sinônimo receita deve apontar para /rx');

  // Testar comando /ef com exibição de botões
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/ef' });
  assert.ok(mensagensEnviadas.length > 0);
  assert.ok(mensagensEnviadas[0].kb, '/ef deve retornar teclado inline com botões dos roteiros de exame');
  console.log('  ✓ Busca de comando e sinônimos direciona para o comando canônico correto.');

  // 6. Testar callbacks inline (ajuda_cat_geriatria, ajuda_cat_dermato, ajuda_todas)
  console.log('[6] Testando callbacks de botões inline...');
  mensagensEnviadas = [];
  ctx.processarCallbackBotao({
    id: 'cb_123',
    from: { id: chatId },
    message: { chat: { id: chatId }, message_id: 999 },
    data: 'ajuda_cat_geriatria'
  });
  assert.ok(mensagensEnviadas.some(m => m.tipo === 'callback_answer'));
  const msgGeriatria = mensagensEnviadas.find(m => m.tipo === 'teclado' || m.tipo === 'texto');
  assert.ok(msgGeriatria && msgGeriatria.texto.includes('GERIATRIA & SAÚDE DO IDOSO'));
  assert.ok(msgGeriatria.texto.includes('/frax'));
  assert.ok(msgGeriatria.texto.includes('/beers'));

  mensagensEnviadas = [];
  ctx.processarCallbackBotao({
    id: 'cb_derm',
    from: { id: chatId },
    message: { chat: { id: chatId }, message_id: 1001 },
    data: 'ajuda_cat_dermato'
  });
  const msgDerm = mensagensEnviadas.find(m => m.tipo === 'teclado' || m.tipo === 'texto');
  assert.ok(msgDerm && msgDerm.texto.includes('DERMATOLOGIA & ISTs CUTÂNEAS'));

  mensagensEnviadas = [];
  ctx.processarCallbackBotao({
    id: 'cb_456',
    from: { id: chatId },
    message: { chat: { id: chatId }, message_id: 1000 },
    data: 'ajuda_todas'
  });
  const msgTodas = mensagensEnviadas.find(m => m.tipo === 'teclado' || m.tipo === 'texto');
  assert.ok(msgTodas && msgTodas.texto.includes('MANUAL DE COMANDOS CANÔNICOS'));
  console.log('  ✓ Callbacks inline respondem e entregam categorias ou manual canônico.');

  // 7. Testar roteamento em Linguagem Natural sem barra (/)
  console.log('[7] Testando chamadas das funções em linguagem natural (sem /)...');
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: 'trabalho de parto dilatação 7 altura de lee -1' });
  assert.ok(mensagensEnviadas.length > 0);
  assert.ok(mensagensEnviadas[0].texto.includes('PARTO') || mensagensEnviadas[0].texto.includes('Parto') || mensagensEnviadas[0].texto.includes('Dilatação'));

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: 'herpes zoster em torax dor em queimação' });
  assert.ok(mensagensEnviadas.length > 0);
  assert.ok(mensagensEnviadas[0].texto.includes('Aciclovir') || mensagensEnviadas[0].texto.includes('HERPES'));

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: 'choque séptico refratário 70 0.3' });
  assert.ok(mensagensEnviadas.length > 0);
  assert.ok(mensagensEnviadas[0].texto.includes('CHOQUE SÉPTICO') || mensagensEnviadas[0].texto.includes('CIRCI'));

  console.log('  ✓ Roteador de linguagem natural aciona perfeitamente as funções clínicas sem barra (/).\n');

  console.log('🎉 TODOS OS TESTES DO MANUAL DE COMANDOS SLASH PASSARAM COM 100% DE SUCESSO!\n');
}

runAjudaTests().catch(err => {
  console.error('❌ Falha nos testes de ajuda:', err);
  process.exit(1);
});
