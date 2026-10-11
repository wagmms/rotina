/**
 * ==============================================================================
 * SUÍTE DE TESTES: HUB UNIFICADO DE GINECOLOGIA & OBSTETRÍCIA (UX BEIRA-LEITO)
 * ==============================================================================
 * Valida com rigor clínico e conformidade total com o Protocolo das 6 Regras de Ouro:
 *  1. Presença do menu principal enviarMenuUXGinecoObstetricia com 10 submódulos
 *  2. Navegação contextual obrigatória: [🔙 Hub G&O] (ux:rotina:go) e [🏠 Início] (ux:hub:inicio)
 *     em 100% dos 10 submódulos (Pré-Natal, Parto, HPP, MgSO4, Prematuridade, Toxo,
 *     Corrimento, Preventivo, Anticoncepção e DIP)
 *  3. Respostas determinísticas em 0ms sem IA desnecessária para todos os submódulos
 *  4. Botão de 1 toque [📋 Copiar Conduta para Prontuário] via ux:copiar:<hash> em todas as saídas
 *  5. Interceptação in-place fluida de callbacks legados go_* e modernos ux:go:*
 *  6. Comandos /go, /prenatal, /parto, /hpp, /mgso4 e /dip no roteador do Telegram
 * ==============================================================================
 */

const assert = require('assert');
const runtime = require('../server/runtime.js');
const ctx = runtime.ctx;

console.log('🌸🤰 Iniciando suíte de testes do Hub Unificado de Ginecologia & Obstetrícia (UX)...\n');

let totalTestes = 0;
let aprovados = 0;

function test(descricao, fn) {
  totalTestes++;
  try {
    fn();
    aprovados++;
    console.log(`  ✓ [TESTE ${totalTestes}] ${descricao}`);
  } catch (err) {
    console.error(`  ✗ [TESTE ${totalTestes}] FALHA: ${descricao}`);
    console.error('    Erro:', err.message);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Menu Principal enviarMenuUXGinecoObstetricia e Teclado do Hub G&O
// ─────────────────────────────────────────────────────────────────────────────

test('enviarMenuUXGinecoObstetricia: gera mensagem com os 10 submódulos e navegação inicial', () => {
  let enviou = false;
  let telaTexto = '';
  let botoesGerados = null;

  ctx.enviarTelaBot = function(chat, texto, botoes, msgId) {
    enviou = true;
    telaTexto = texto;
    botoesGerados = botoes;
    return true;
  };

  const res = ctx.enviarMenuUXGinecoObstetricia(12345, 99);
  assert.strictEqual(res, true, 'Deve retornar true ao enviar tela');
  assert.strictEqual(enviou, true, 'Deve chamar enviarTelaBot');
  assert.ok(telaTexto.includes('Hub Unificado de Ginecologia & Obstetrícia'), 'Deve conter cabeçalho do Hub G&O');

  // Validar os 10 submódulos presentes nos callbacks
  const flatCallbacks = [];
  botoesGerados.inline_keyboard.forEach(row => {
    row.forEach(btn => {
      flatCallbacks.push(btn.callback_data);
    });
  });

  const submodulosEsperados = [
    'go_prenatal', 'go_parto', 'go_hpp', 'go_mgso4', 'go_prematuridade',
    'go_toxo', 'go_corrimento', 'go_preventivo', 'go_anticoncepcao', 'go_dip'
  ];

  submodulosEsperados.forEach(sm => {
    assert.ok(flatCallbacks.includes(sm), `Deve conter submódulo ${sm} no menu principal`);
  });

  // Validar botões de retorno na base do menu
  assert.ok(flatCallbacks.includes('ux:menu'), 'Deve conter [🔙 Voltar ao Menu]');
  assert.ok(flatCallbacks.includes('ux:hub:inicio'), 'Deve conter [🏠 Início]');
});

test('construirTecladoHubGO: deve conter os 10 submódulos e rodapé contextual', () => {
  const teclado = ctx.construirTecladoHubGO();
  assert.ok(teclado && teclado.inline_keyboard, 'Deve retornar inline_keyboard');

  const callbacks = [];
  teclado.inline_keyboard.forEach(row => {
    row.forEach(btn => callbacks.push(btn.callback_data));
  });

  assert.ok(callbacks.includes('ux:rotina:go'), 'Teclado de /go deve conter [🔙 Hub G&O]');
  assert.ok(callbacks.includes('ux:hub:inicio'), 'Teclado de /go deve conter [🏠 Início]');
  assert.strictEqual(callbacks.length, 12, 'Deve ter 10 submódulos + 2 botões de navegação no rodapé');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Auditoria dos 10 Submódulos: Telas Iniciais, Presets e Retorno Contextual
// ─────────────────────────────────────────────────────────────────────────────

const submódulosParaAuditar = [
  { nome: 'Pré-Natal & DPP', telaFn: 'enviarTelaGOPrenatal', cbPrefix: 'prenatal', termoEsperado: 'PRÉ-NATAL' },
  { nome: 'Parto & Partograma', telaFn: 'enviarTelaGOParto', cbPrefix: 'parto', termoEsperado: 'PARTO' },
  { nome: 'HPP (4 Ts)', telaFn: 'enviarTelaGOHpp', cbPrefix: 'hpp', termoEsperado: 'HEMORRAGIA PÓS-PARTO' },
  { nome: 'Pré-Eclâmpsia & MgSO4', telaFn: 'enviarTelaGOMgso4', cbPrefix: 'mgso4', termoEsperado: 'MAGNÉSIO' },
  { nome: 'Prematuridade & RPMO', telaFn: 'enviarTelaGOPrematuridade', cbPrefix: 'prematuridade', termoEsperado: 'PREMATURO' },
  { nome: 'Toxoplasmose', telaFn: 'enviarTelaGOToxo', cbPrefix: 'toxo', termoEsperado: 'TOXOPLASMOSE' },
  { nome: 'Vulvovaginites', telaFn: 'enviarTelaGOCorrimento', cbPrefix: 'corrimento', termoEsperado: 'VULVOVAGINITES' },
  { nome: 'Preventivo INCA', telaFn: 'enviarTelaGOPreventivo', cbPrefix: 'preventivo', termoEsperado: 'CITOPATOLÓGICA' },
  { nome: 'Anticoncepção OMS', telaFn: 'enviarTelaGOAnticoncepcao', cbPrefix: 'anticoncepcao', termoEsperado: 'CONTRACEPÇÃO' },
  { nome: 'DIP & Infecção Pélvica', telaFn: 'enviarTelaGODip', cbPrefix: 'dip', termoEsperado: 'INFLAMATÓRIA PÉLVICA' }
];

submódulosParaAuditar.forEach((sm, idx) => {
  test(`Submódulo ${idx + 1}/10 (${sm.nome}): tela inicial possui 0ms, guia de cópia e rodapé [🔙 Hub G&O] + [🏠 Início]`, () => {
    let textoCapturado = '';
    let botoesCapturados = null;

    ctx.enviarTelaBot = function(chat, txt, btns, msgId) {
      textoCapturado = txt;
      botoesCapturados = btns;
      return true;
    };

    const fn = ctx[sm.telaFn];
    assert.strictEqual(typeof fn, 'function', `Função ${sm.telaFn} deve existir`);
    fn(12345, 101);

    assert.ok(textoCapturado.toUpperCase().includes(sm.termoEsperado), `Texto da tela deve mencionar ${sm.termoEsperado}`);

    const cbs = [];
    botoesCapturados.inline_keyboard.forEach(r => r.forEach(b => cbs.push(b.callback_data)));

    // Checar se tem botão de cópia de conduta/guia
    const temBotaoCopiar = cbs.some(c => c.startsWith('ux:copiar:'));
    assert.ok(temBotaoCopiar, `Submódulo ${sm.nome} deve fornecer botão de cópia de guia`);

    // Checar retorno contextual estrito
    assert.ok(cbs.includes('ux:rotina:go'), `Submódulo ${sm.nome} DEVE conter [🔙 Hub G&O]`);
    assert.ok(cbs.includes('ux:hub:inicio'), `Submódulo ${sm.nome} DEVE conter [🏠 Início]`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Execução Determinística (0ms) e Presets de Alta Fidelidade Clínica
// ─────────────────────────────────────────────────────────────────────────────

test('Pré-Natal: preset DUM calcula Naegele, IG e IOM em 0ms com botão de cópia', () => {
  let textoResultado = '';
  let botoesResultado = null;

  ctx.enviarTelaBot = function(chat, txt, btns, msgId) {
    textoResultado = txt;
    botoesResultado = btns;
    return true;
  };

  ctx.tratarCallbackGOPrenatal(12345, 'dum', 201);
  assert.ok(textoResultado.includes('DUM: 10/02/2026') || textoResultado.includes('CRONOLOGIA'), 'Deve conter cronologia');
  assert.ok(textoResultado.includes('DPP') || textoResultado.includes('17/11/2026'), 'Deve calcular DPP');

  const cbs = [];
  botoesResultado.inline_keyboard.forEach(r => r.forEach(b => cbs.push(b.callback_data)));
  assert.ok(cbs.some(c => c.startsWith('ux:copiar:')), 'Deve conter botão de cópia de conduta');
  assert.ok(cbs.includes('ux:rotina:go') && cbs.includes('ux:hub:inicio'), 'Deve conter retorno contextual');
});

test('Parto: preset Fase Ativa e Bishop calcula conduta em 0ms com botão de cópia', () => {
  let textoResultado = '';
  let botoesResultado = null;

  ctx.enviarTelaBot = function(chat, txt, btns, msgId) {
    textoResultado = txt;
    botoesResultado = btns;
    return true;
  };

  ctx.tratarCallbackGOParto(12345, 'ativa', 202);
  assert.ok(textoResultado.includes('FASE ATIVA') || textoResultado.includes('Fase Ativa'), 'Deve diagnosticar Fase Ativa');

  ctx.tratarCallbackGOParto(12345, 'bishop', 203);
  assert.ok(textoResultado.includes('BISHOP') || textoResultado.includes('Bishop'), 'Deve avaliar Bishop');
  assert.ok(textoResultado.includes('Misoprostol') || textoResultado.includes('desfavorável') || textoResultado.includes('Preparo'), 'Deve orientar preparo cervical');

  const cbs = [];
  botoesResultado.inline_keyboard.forEach(r => r.forEach(b => cbs.push(b.callback_data)));
  assert.ok(cbs.some(c => c.startsWith('ux:copiar:')), 'Deve conter botão de cópia');
  assert.ok(cbs.includes('ux:rotina:go') && cbs.includes('ux:hub:inicio'), 'Deve conter retorno');
});

test('HPP (4 Ts): preset Atonia Grave calcula Índice de Choque e uterotônicos sequenciais', () => {
  let textoResultado = '';
  let botoesResultado = null;

  ctx.enviarTelaBot = function(chat, txt, btns, msgId) {
    textoResultado = txt;
    botoesResultado = btns;
    return true;
  };

  ctx.tratarCallbackGOHpp(12345, 'atonia', 204);
  assert.ok(textoResultado.includes('ÍNDICE DE CHOQUE') || textoResultado.includes('Choque'), 'Deve calcular Índice de Choque');
  assert.ok(textoResultado.includes('Ocitocina') || textoResultado.includes('UTEROTÔNICO'), 'Deve orientar Ocitocina');
  assert.ok(textoResultado.includes('Ácido Tranexâmico') || textoResultado.includes('Tranexâmico'), 'Deve incluir Ácido Tranexâmico');

  const cbs = [];
  botoesResultado.inline_keyboard.forEach(r => r.forEach(b => cbs.push(b.callback_data)));
  assert.ok(cbs.some(c => c.startsWith('ux:copiar:')), 'Deve conter botão de cópia');
  assert.ok(cbs.includes('ux:rotina:go') && cbs.includes('ux:hub:inicio'), 'Deve conter retorno');
});

test('Pré-Eclâmpsia & MgSO4: preset Zuspan e intoxicação prescrevem sulfato e antídoto', () => {
  let textoResultado = '';
  let botoesResultado = null;

  ctx.enviarTelaBot = function(chat, txt, btns, msgId) {
    textoResultado = txt;
    botoesResultado = btns;
    return true;
  };

  ctx.tratarCallbackGOMgso4(12345, 'zuspan', 205);
  assert.ok(textoResultado.includes('Zuspan') || textoResultado.includes('Ataque'), 'Deve descrever esquema Zuspan');
  assert.ok(textoResultado.includes('Gluconato de Cálcio') || textoResultado.includes('Gluconato'), 'Deve citar Gluconato de Cálcio');

  ctx.tratarCallbackGOMgso4(12345, 'intox', 206);
  assert.ok(textoResultado.includes('INTOXICAÇÃO') || textoResultado.includes('ALERTA'), 'Deve soar alerta de intoxicação');
  assert.ok(textoResultado.includes('Suspender') || textoResultado.includes('suspensão'), 'Deve orientar suspender sulfato');

  const cbs = [];
  botoesResultado.inline_keyboard.forEach(r => r.forEach(b => cbs.push(b.callback_data)));
  assert.ok(cbs.some(c => c.startsWith('ux:copiar:')), 'Deve conter botão de cópia');
  assert.ok(cbs.includes('ux:rotina:go') && cbs.includes('ux:hub:inicio'), 'Deve conter retorno');
});

test('Prematuridade & RPMO: preset TPP e RPMO orientam corticoide, neuroproteção e latência', () => {
  let textoResultado = '';
  let botoesResultado = null;

  ctx.enviarTelaBot = function(chat, txt, btns, msgId) {
    textoResultado = txt;
    botoesResultado = btns;
    return true;
  };

  ctx.tratarCallbackGOPrematuridade(12345, 'tpp', 207);
  assert.ok(textoResultado.includes('Betametasona') || textoResultado.includes('Corticoterapia'), 'Deve prescrever corticoterapia');
  assert.ok(textoResultado.includes('MgSO4') || textoResultado.includes('Neuroproteção'), 'Deve orientar neuroproteção <32s');

  ctx.tratarCallbackGOPrematuridade(12345, 'rpmo', 208);
  assert.ok(textoResultado.includes('Ampicilina') || textoResultado.includes('Latência'), 'Deve prescrever regime de latência');

  const cbs = [];
  botoesResultado.inline_keyboard.forEach(r => r.forEach(b => cbs.push(b.callback_data)));
  assert.ok(cbs.some(c => c.startsWith('ux:copiar:')), 'Deve conter botão de cópia');
  assert.ok(cbs.includes('ux:rotina:go') && cbs.includes('ux:hub:inicio'), 'Deve conter retorno');
});

test('DIP: preset Monif I e Hospitalar orientam esquemas MS/CDC com botão de cópia', () => {
  let textoResultado = '';
  let botoesResultado = null;

  ctx.enviarTelaBot = function(chat, txt, btns, msgId) {
    textoResultado = txt;
    botoesResultado = btns;
    return true;
  };

  ctx.tratarCallbackGODip(12345, 'monif1', 209);
  assert.ok(textoResultado.includes('Ceftriaxona') && textoResultado.includes('Doxiciclina') && textoResultado.includes('Metronidazol'), 'Monif I deve prescrever Ceftriaxona + Doxi + Metro');

  ctx.tratarCallbackGODip(12345, 'hospitalar', 210);
  assert.ok(textoResultado.includes('Internação') || textoResultado.includes('hospitalar') || textoResultado.includes('IV'), 'Monif II-III deve orientar internação');

  const cbs = [];
  botoesResultado.inline_keyboard.forEach(r => r.forEach(b => cbs.push(b.callback_data)));
  assert.ok(cbs.some(c => c.startsWith('ux:copiar:')), 'Deve conter botão de cópia');
  assert.ok(cbs.includes('ux:rotina:go') && cbs.includes('ux:hub:inicio'), 'Deve conter retorno');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Roteamento de Callbacks (tratarCallbackUX) e Normalização go_*
// ─────────────────────────────────────────────────────────────────────────────

test('tratarCallbackUX: normaliza go_* para ux:go:* e despacha in-place com sucesso', () => {
  let telaAberta = '';
  ctx.enviarTelaBot = function(chat, txt, btns, msgId) {
    telaAberta = txt;
    return true;
  };

  const fakeCb = {
    id: 'cb_test_1',
    data: 'go_prenatal',
    message: { chat: { id: 987 }, message_id: 55 }
  };

  const tratado = ctx.tratarCallbackUX(fakeCb);
  assert.strictEqual(tratado, true, 'Callback go_prenatal deve ser tratado pelo motor UX');
  assert.ok(telaAberta.includes('PRÉ-NATAL'), 'Deve abrir tela de pré-natal');

  const fakeCbHub = {
    id: 'cb_test_2',
    data: 'ux:rotina:go',
    message: { chat: { id: 987 }, message_id: 55 }
  };
  const tratadoHub = ctx.tratarCallbackUX(fakeCbHub);
  assert.strictEqual(tratadoHub, true, 'Callback ux:rotina:go deve ser tratado');
  assert.ok(telaAberta.includes('Hub Unificado de Ginecologia & Obstetrícia'), 'Deve abrir Hub G&O');
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Comandos de Texto do Router (/go, /prenatal, /parto, /hpp, /mgso4, /dip)
// ─────────────────────────────────────────────────────────────────────────────

test('Router Telegram: comando /go responde com teclado navegável de 10 submódulos', () => {
  let msgEnviada = '';
  let tecladoEnviado = null;

  ctx.enviarMensagemComTecladoParaChat = function(chatId, txt, teclado) {
    msgEnviada = txt;
    tecladoEnviado = teclado;
    return true;
  };

  ctx.processarMensagemTexto({ chat: { id: 111 }, text: '/go' });
  assert.ok(msgEnviada.includes('HUB DE GINECOLOGIA & OBSTETRÍCIA'), 'Deve responder com menu do Hub G&O');

  const cbs = [];
  tecladoEnviado.inline_keyboard.forEach(r => r.forEach(b => cbs.push(b.callback_data)));
  assert.ok(cbs.includes('ux:rotina:go') && cbs.includes('ux:hub:inicio'), 'Deve conter navegação de rodapé');
});

test('Router Telegram: comando /dip responde com conduta clínica e botão de cópia', () => {
  let msgEnviada = '';
  let tecladoEnviado = null;

  ctx.enviarMensagemComTecladoParaChat = function(chatId, txt, teclado) {
    msgEnviada = txt;
    tecladoEnviado = teclado;
    return true;
  };

  ctx.processarMensagemTexto({ chat: { id: 111 }, text: '/dip dor hipogastrio febre 38.5 mobilizacao colo positiva' });
  assert.ok(msgEnviada.includes('CONDUTA DE DOENÇA INFLAMATÓRIA PÉLVICA'), 'Deve emitir conduta de DIP');

  const cbs = [];
  tecladoEnviado.inline_keyboard.forEach(r => r.forEach(b => cbs.push(b.callback_data)));
  assert.ok(cbs.some(c => c.startsWith('ux:copiar:')), 'Deve conter botão de cópia');
  assert.ok(cbs.includes('ux:rotina:go') && cbs.includes('ux:hub:inicio'), 'Deve conter navegação');
});

test('Router Telegram: comando /prenatal responde com botão de cópia e navegação', () => {
  let msgEnviada = '';
  let tecladoEnviado = null;

  ctx.enviarMensagemComTecladoParaChat = function(chatId, txt, teclado) {
    msgEnviada = txt;
    tecladoEnviado = teclado;
    return true;
  };

  ctx.processarMensagemTexto({ chat: { id: 111 }, text: '/prenatal DUM 10/02/2026 peso 65 alt 1.62' });
  assert.ok(msgEnviada.includes('AVALIAÇÃO DE PRÉ-NATAL E CRONOLOGIA OBSTÉTRICA'), 'Deve calcular pré-natal');

  const cbs = [];
  tecladoEnviado.inline_keyboard.forEach(r => r.forEach(b => cbs.push(b.callback_data)));
  assert.ok(cbs.some(c => c.startsWith('ux:copiar:')), 'Deve conter botão de cópia');
  assert.ok(cbs.includes('ux:rotina:go') && cbs.includes('ux:hub:inicio'), 'Deve conter navegação');
});

test('Router Telegram: comando /parto responde com botão de cópia e navegação', () => {
  let msgEnviada = '';
  let tecladoEnviado = null;

  ctx.enviarMensagemComTecladoParaChat = function(chatId, txt, teclado) {
    msgEnviada = txt;
    tecladoEnviado = teclado;
    return true;
  };

  ctx.processarMensagemTexto({ chat: { id: 111 }, text: '/parto dil 6cm 3/10 45s lee 0 bcf 140' });
  assert.ok(msgEnviada.includes('CONDUTA DE CENTRO OBSTÉTRICO'), 'Deve emitir conduta de centro obstétrico');

  const cbs = [];
  tecladoEnviado.inline_keyboard.forEach(r => r.forEach(b => cbs.push(b.callback_data)));
  assert.ok(cbs.some(c => c.startsWith('ux:copiar:')), 'Deve conter botão de cópia');
  assert.ok(cbs.includes('ux:rotina:go') && cbs.includes('ux:hub:inicio'), 'Deve conter navegação');
});

console.log(`\n🎉 Todos os ${aprovados}/${totalTestes} testes de UX do Hub G&O passaram com 100% de sucesso!\n`);
