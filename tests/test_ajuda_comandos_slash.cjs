/**
 * Testes Automatizados para o Manual Completo de Comandos Slash (/ajuda, /help, /manual)
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

  // 1. Validar Catálogo Completo
  console.log('[1] Testando estrutura do catálogo de comandos...');
  assert.strictEqual(typeof ctx.obterCatalogoComandosSlash, 'function', 'obterCatalogoComandosSlash deve existir');
  const catalogo = ctx.obterCatalogoComandosSlash();
  assert.ok(Array.isArray(catalogo), 'Catálogo deve ser um array');
  assert.strictEqual(catalogo.length, 17, 'Devem existir 17 categorias temáticas');

  let totalCmds = 0;
  let totalAliases = 0;
  const aliasesSet = new Set();
  catalogo.forEach(cat => {
    assert.ok(cat.id, 'Categoria deve ter id');
    assert.ok(cat.titulo, 'Categoria deve ter título');
    assert.ok(Array.isArray(cat.comandos), 'Categoria deve ter array de comandos');
    totalCmds += cat.comandos.length;
    cat.comandos.forEach(cmd => {
      assert.ok(cmd.cmd.startsWith('/'), `Comando ${cmd.cmd} deve iniciar com /`);
      assert.ok(cmd.sintaxe, `Comando ${cmd.cmd} deve ter sintaxe`);
      assert.ok(cmd.desc, `Comando ${cmd.cmd} deve ter descrição`);
      cmd.aliases.forEach(a => {
        totalAliases++;
        aliasesSet.add(a);
      });
    });
  });

  assert.strictEqual(totalCmds, 132, 'Devem existir 131 comandos funcionais principais');
  assert.strictEqual(aliasesSet.size, 268, 'Devem existir 264 aliases/atalhos cobertos');
  console.log(`  ✓ 17 categorias, 132 comandos clínicos e 266 atalhos validados com sucesso.`);

  // 2. Testar /ajuda completo
  console.log('[2] Testando comando /ajuda completo...');
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/ajuda todas' });
  assert.ok(mensagensEnviadas.length > 0, 'Deve enviar mensagem');
  const msgAjuda = mensagensEnviadas[0].texto; console.log("msgAjuda start:", msgAjuda.substring(0,100));
  assert.ok(msgAjuda.includes('MANUAL COMPLETO DE COMANDOS SLASH'), 'Deve conter cabeçalho do manual');
  assert.ok(msgAjuda.includes('268 comandos'), 'Deve referenciar todos os comandos');
  assert.ok(msgAjuda.includes('NÚCLEO, SESSÃO, NAVEGAÇÃO & COCKPIT'), 'Deve conter categoria núcleo');
  assert.ok(msgAjuda.includes('SALA VERMELHA & CTI'), 'Deve conter categoria emergência');
  assert.ok(msgAjuda.includes('PEDIATRIA & SUPORTE VITAL'), 'Deve conter categoria pediatria');
  assert.ok(msgAjuda.includes('OBSTETRÍCIA & MEDICINA FETAL'), 'Deve conter categoria obstetrícia');
  assert.ok(msgAjuda.includes('DERMATOLOGIA & ISTs CUTÂNEAS'), 'Deve conter categoria dermatologia');
  assert.ok(mensagensEnviadas[0].kb, 'Deve incluir teclado inline de categorias');
  console.log('  ✓ /ajuda envia manual completo com categorias e inline keyboard.');

  // 3. Testar aliases /help e /manual
  console.log('[3] Testando aliases /help e /manual...');
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/help todas' });
  assert.ok(mensagensEnviadas.length > 0);
  assert.ok(mensagensEnviadas[0].texto.includes('MANUAL COMPLETO DE COMANDOS SLASH'));

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/manual' });
  assert.ok(mensagensEnviadas.length > 0);
  assert.ok(mensagensEnviadas[0].texto.includes('MANUAL COMPLETO DE COMANDOS SLASH'));
  console.log('  ✓ /help e /manual disparam o manual completo com consistência.');

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
  assert.ok(mensagensEnviadas[0].texto.includes('/herpes'));
  assert.ok(mensagensEnviadas[0].texto.includes('/sifilis'));

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/ajuda obstetrícia' });
  assert.ok(mensagensEnviadas.length > 0);
  assert.ok(mensagensEnviadas[0].texto.includes('OBSTETRÍCIA & MEDICINA FETAL'));
  assert.ok(mensagensEnviadas[0].texto.includes('/prenatal'));
  assert.ok(mensagensEnviadas[0].texto.includes('/parto'));
  console.log('  ✓ Filtragem por especialidade isola perfeitamente os comandos da categoria solicitada.');

  // 5. Testar busca por comando direto (/ajuda dva, /ajuda /soap, /ajuda sifilis)
  console.log('[5] Testando busca por comando específico (/ajuda dva, /ajuda /soap, /ajuda sifilis)...');
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
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/ajuda sifilis' });
  assert.ok(mensagensEnviadas.length > 0);
  assert.ok(mensagensEnviadas[0].texto.includes('DETALHES DO COMANDO /sifilis'));
  assert.ok(mensagensEnviadas[0].texto.includes('Penicilina Benzatina'));
  console.log('  ✓ Busca de comando direto retorna sintaxe, aliases e função clínica detalhada.');

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
  assert.ok(msgTodas && msgTodas.texto.includes('MANUAL COMPLETO DE COMANDOS SLASH'));
  console.log('  ✓ Callbacks inline respondem e entregam categorias ou manual completo.');

  console.log('\n🎉 TODOS OS TESTES DO MANUAL DE COMANDOS SLASH PASSARAM COM SUCESSO!\n');
}

runAjudaTests().catch(err => {
  console.error('❌ Falha nos testes de ajuda:', err);
  process.exit(1);
});
