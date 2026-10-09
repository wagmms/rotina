/**
 * ==============================================================================
 * BATERIA DE TESTES AUTOMATIZADOS: HUBS, COMANDOS E CALLBACKS DO TELEGRAM
 * ==============================================================================
 * Cobre e audita:
 * 1. Central de Menus & Hubs: /menu, /hub, /emergencia, /sala, /enfermaria, /rotina, /ambulatorio, /go
 * 2. Protocolos de PCR & ACLS: /pcr, /acls (chocável, não chocável, gestante, pals)
 * 3. Drogas Vasoativas & Sequência Rápida de Intubação: /dva, /sri
 * 4. Calculadoras Renais e Distúrbios Hidroeletrolíticos: /crcl, /clcr, /clearance, /dhe, /eletrolitos, /gaso, /winter
 * 5. Callbacks de Botões Inline: PCR, DHE, Hub GO, Hub Rotina, Hub Enfermaria e UX Geral
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');
const runtime = require('../server/runtime.js');

async function executarTestesHubsEComandosTelegram() {
  console.log('=== INICIANDO BATERIA DE TESTES: HUBS & COMANDOS DO TELEGRAM ===\n');
  const ctx = runtime.ctx;
  const chatId = '123456789';

  let mensagensEnviadas = [];
  let callbacksRespondidos = [];

  ctx.enviarMensagemParaChat = (id, texto) => {
    mensagensEnviadas.push({ tipo: 'texto', id, texto: String(texto) });
    return true;
  };
  ctx.enviarMensagemComTecladoParaChat = (id, texto, kb) => {
    mensagensEnviadas.push({ tipo: 'teclado', id, texto: String(texto), kb });
    return true;
  };
  ctx.responderCallbackTelegram = (id, texto) => {
    callbacksRespondidos.push({ id, texto: String(texto || '') });
    return true;
  };

  function limparCaptura() {
    mensagensEnviadas = [];
    callbacksRespondidos = [];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. HUBS PRINCIPAIS E MENUS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[1] Testando Menus e Hubs Principais...');

  // /menu e /hub
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/menu' });
  assert.ok(mensagensEnviadas.length > 0, 'Comando /menu deve enviar mensagem');
  assert.ok(mensagensEnviadas[0].texto.includes('Central de Comandos Beira-Leito'), 'Deve exibir Central de Comandos');
  assert.ok(mensagensEnviadas[0].kb, 'Deve incluir teclado de navegação');

  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/hub' });
  assert.ok(mensagensEnviadas.length > 0, 'Comando /hub deve enviar mensagem');
  assert.ok(mensagensEnviadas[0].texto.includes('Central de Comandos Beira-Leito'));

  // /emergencia e /sala
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/emergencia' });
  assert.ok(mensagensEnviadas.length > 0, '/emergencia deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('EMERGÊNCIA & SALA VERMELHA'));

  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/sala' });
  assert.ok(mensagensEnviadas.length > 0, '/sala deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('EMERGÊNCIA & SALA VERMELHA'));

  // /enfermaria
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/enfermaria' });
  assert.ok(mensagensEnviadas.length > 0, '/enfermaria deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('PAINEL') || mensagensEnviadas[0].texto.includes('Leito') || mensagensEnviadas[0].texto.includes('leito'), 'Deve exibir Painel de Bordo da enfermaria');

  // /rotina
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/rotina' });
  assert.ok(mensagensEnviadas.length > 0, '/rotina deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('HUB DE ROTINA & PRODUTIVIDADE'));

  // /ambulatorio sem parâmetros
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/ambulatorio' });
  assert.ok(mensagensEnviadas.length > 0, '/ambulatorio deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('MÓDULO SOAP AMBULATORIAL ÁGIL'));
  assert.ok(mensagensEnviadas[0].kb, '/ambulatorio sem args deve enviar teclado inline rápido');

  // /go e /obstetricia sem parâmetros
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/go' });
  assert.ok(mensagensEnviadas.length > 0, '/go deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('HUB DE GINECOLOGIA & OBSTETRÍCIA'));
  assert.ok(mensagensEnviadas[0].kb, '/go deve conter teclado inline de 10 botões');

  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/obstetricia' });
  assert.ok(mensagensEnviadas.length > 0, '/obstetricia deve responder com o hub GO');
  assert.ok(mensagensEnviadas[0].texto.includes('HUB DE GINECOLOGIA & OBSTETRÍCIA'));

  console.log('  ✓ Menus e Hubs validados com sucesso.');

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. PROTOCOLOS DE PARADA CARDIORRESPIRATÓRIA (PCR & ACLS)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[2] Testando Protocolos de PCR & ACLS (/pcr, /acls)...');

  // /pcr sem parâmetros (algoritmo geral)
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/pcr' });
  assert.ok(mensagensEnviadas.length > 0, '/pcr deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('PARADA CARDIORRESPIRATÓRIA (PCR ADULTO'));
  assert.ok(mensagensEnviadas[0].kb, '/pcr deve oferecer botões chocável/não chocável');

  // /acls alias
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/acls' });
  assert.ok(mensagensEnviadas.length > 0, '/acls deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('PARADA CARDIORRESPIRATÓRIA'));

  // /pcr chocavel (FV / TVSP)
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/pcr fv' });
  assert.ok(mensagensEnviadas.length > 0, '/pcr fv deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('RITMO CHOCÁVEL (FV / TV SEM PULSO)'));
  assert.ok(mensagensEnviadas[0].texto.includes('200 J'), 'Deve indicar desfibrilação 200 J');
  assert.ok(mensagensEnviadas[0].texto.includes('Adrenalina 1 mg'), 'Deve indicar Adrenalina 1 mg');
  assert.ok(mensagensEnviadas[0].texto.includes('Amiodarona 300 mg'), 'Deve indicar Amiodarona 300 mg');

  // /pcr nao chocavel (AESP / Assistolia)
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/pcr assistolia' });
  assert.ok(mensagensEnviadas.length > 0, '/pcr assistolia deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('RITMO NÃO CHOCÁVEL (AESP / ASSISTOLIA)'));
  assert.ok(mensagensEnviadas[0].texto.includes('NÃO aplicar choque!'), 'Deve alertar para não chocar assistolia');
  assert.ok(mensagensEnviadas[0].texto.includes('5 Hs E 5 Ts'), 'Deve conter checklist de 5 Hs e 5 Ts');

  // /pcr gestante
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/pcr gestante 30 semanas' });
  assert.ok(mensagensEnviadas.length > 0, '/pcr gestante deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('PCR NA GESTANTE') && mensagensEnviadas[0].texto.includes('ACLS MATERNO'));
  assert.ok(mensagensEnviadas[0].texto.includes('MANOBRA DULE MANDATÓRIA'), 'Deve indicar DULE');
  assert.ok(mensagensEnviadas[0].texto.includes('CESARIANA DE RESSUSCITAÇÃO'), 'Deve orientar cesariana perimortem no 4º min');

  // /pcr pals / pediatria
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/pcr pediatria' });
  assert.ok(mensagensEnviadas.length > 0, '/pcr pediatria deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('SUPORTE AVANÇADO DE VIDA PEDIÁTRICO (PALS'));
  assert.ok(mensagensEnviadas[0].texto.includes('0,01 mg/kg'), 'Deve indicar Adrenalina 0.01 mg/kg');

  console.log('  ✓ Protocolos de PCR & ACLS validados com sucesso.');

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. DROGAS VASOATIVAS E SRI (/dva, /sri)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[3] Testando DVA e SRI (/dva, /sri)...');

  // /dva sem argumentos
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/dva' });
  assert.ok(mensagensEnviadas.length > 0, '/dva sem args deve enviar guia');
  assert.ok(mensagensEnviadas[0].texto.includes('CALCULADORA DE DROGAS VASOATIVAS'));

  // /dva nora 70
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/dva nora 70' });
  assert.ok(mensagensEnviadas.length > 0, '/dva nora 70 deve calcular');
  assert.ok(mensagensEnviadas[0].texto.includes('Noradrenalina') || mensagensEnviadas[0].texto.includes('NORADRENALINA'));

  // /dva vaso
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/dva vaso' });
  assert.ok(mensagensEnviadas.length > 0, '/dva vaso deve calcular');
  assert.ok(mensagensEnviadas[0].texto.includes('Vasopressina') || mensagensEnviadas[0].texto.includes('VASOPRESSINA'));

  // /sri sem argumentos
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/sri' });
  assert.ok(mensagensEnviadas.length > 0, '/sri sem args deve enviar guia');
  assert.ok(mensagensEnviadas[0].texto.includes('SEQUÊNCIA RÁPIDA DE INTUBAÇÃO'));

  // /sri 70
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/sri 70' });
  assert.ok(mensagensEnviadas.length > 0, '/sri 70 deve calcular');
  assert.ok(mensagensEnviadas[0].texto.includes('Fentanil') || mensagensEnviadas[0].texto.includes('Etomidato') || mensagensEnviadas[0].texto.includes('Rocurônio'));

  console.log('  ✓ DVA e SRI validados com sucesso.');

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. CALCULADORAS RENAIS E DISTÚRBIOS HIDROELETROLÍTICOS (/crcl, /clcr, /dhe)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[4] Testando Clearance Renal e DHE (/crcl, /clcr, /clearance, /dhe)...');

  // /crcl sem argumentos
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/crcl' });
  assert.ok(mensagensEnviadas.length > 0, '/crcl sem args deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('CALCULADORA DE CLEARANCE'));
  assert.ok(mensagensEnviadas[0].kb, 'Deve incluir teclado com botões rápidos');

  // /clcr alias
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/clcr 60 70 1.2 fem' });
  assert.ok(mensagensEnviadas.length > 0, '/clcr com dados deve calcular Cockcroft-Gault');
  assert.ok(mensagensEnviadas[0].texto.includes('Clearance Estimado') && mensagensEnviadas[0].texto.includes('mL/min'));

  // /clearance completo
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/clearance 65 anos, 70kg, cr 1.8, masculino' });
  assert.ok(mensagensEnviadas.length > 0, '/clearance deve calcular');
  assert.ok(mensagensEnviadas[0].texto.includes('Clearance'));

  // /dhe sem argumentos
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/dhe' });
  assert.ok(mensagensEnviadas.length > 0, '/dhe sem args deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('DISTÚRBIOS HIDROELETROLÍTICOS (DHE)'));
  assert.ok(mensagensEnviadas[0].kb, 'Deve incluir teclado com botões de 1 toque');

  // /dhe hiponatremia: na 118 peso 60 f 72
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/dhe na 118 peso 60 f 72' });
  assert.ok(mensagensEnviadas.length > 0, '/dhe hiponatremia deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('CORREÇÃO DE HIPONATREMIA (FÓRMULA DE ADROGUÉ-MADIAS)'));
  assert.ok(mensagensEnviadas[0].texto.includes('NaCl 3%'), 'Deve prescrever NaCl 3%');
  assert.ok(mensagensEnviadas[0].texto.includes('8 mEq/L em 24h'), 'Deve respeitar teto de segurança de 8 mEq');
  assert.ok(mensagensEnviadas[0].texto.includes('Taxa de Infusão em BIC'), 'Deve calcular taxa de infusão na BIC');

  // /dhe hipernatremia: na 164 peso 70 m
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/dhe na 164 peso 70 m' });
  assert.ok(mensagensEnviadas.length > 0, '/dhe hipernatremia deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('HIPERNATREMIA — DÉFICIT DE ÁGUA LIVRE'));
  assert.ok(mensagensEnviadas[0].texto.includes('Litros'), 'Deve calcular déficit em litros');
  assert.ok(mensagensEnviadas[0].texto.includes('SG 5%'), 'Deve orientar reposição com SG 5%');

  // /dhe hipercalemia: k 7.2 ecg
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/dhe k 7.2 ecg' });
  assert.ok(mensagensEnviadas.length > 0, '/dhe hipercalemia deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('MANEJO EMERGENCIAL DE HIPERCALEMIA'));
  assert.ok(mensagensEnviadas[0].texto.includes('Gluconato de Cálcio 10%'), 'Deve indicar Gluconato de Cálcio para estabilização de membrana');
  assert.ok(mensagensEnviadas[0].texto.includes('Glicoinsulina'), 'Deve indicar Glicoinsulina para redistribuição');

  // /dhe hipercalemia extrema: k 8.4 (risco de PCR e indicação de diálise de emergência)
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/dhe k 8.4' });
  assert.ok(mensagensEnviadas.length > 0, '/dhe k 8.4 deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('Risco Iminente de PCR') || mensagensEnviadas[0].texto.includes('ALERTA VERMELHO MÁXIMO'));
  assert.ok(mensagensEnviadas[0].texto.includes('HEMODIÁLISE DE EMERGÊNCIA'), 'Deve acionar hemodiálise de emergência');

  // /gaso sem parâmetros
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/gaso' });
  assert.ok(mensagensEnviadas.length > 0, '/gaso sem args deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('GASOMETRIA ARTERIAL'));

  // /winter
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/winter 12' });
  assert.ok(mensagensEnviadas.length > 0, '/winter 12 deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('FÓRMULA DE WINTER'));

  console.log('  ✓ Calculadoras Renais e DHE validadas com sucesso.');

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. TESTES DE CALLBACKS DE BOTÕES INLINE
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[5] Testando Callbacks de Botões Inline...');

  const callbacksParaTestar = [
    // PCR
    { data: 'pcr_chocavel', desc: 'PCR Ritmo Chocável' },
    { data: 'pcr_naochocavel', desc: 'PCR Não Chocável' },
    { data: 'pcr_gestante', desc: 'PCR na Gestante' },
    { data: 'pcr_pals', desc: 'PCR Pediátrico PALS' },
    // DHE
    { data: 'dhe_hipo', desc: 'DHE Hiponatremia' },
    { data: 'dhe_hiper', desc: 'DHE Hipernatremia' },
    { data: 'dhe_k', desc: 'DHE Hipercalemia' },
    // Hub GO
    { data: 'go_prenatal', desc: 'Hub GO Pré-Natal' },
    { data: 'go_parto', desc: 'Hub GO Parto' },
    { data: 'go_hpp', desc: 'Hub GO HPP' },
    { data: 'go_mgso4', desc: 'Hub GO MgSO4' },
    { data: 'go_prematuridade', desc: 'Hub GO Prematuridade' },
    { data: 'go_toxo', desc: 'Hub GO Toxoplasmose' },
    { data: 'go_corrimento', desc: 'Hub GO Vulvovaginites' },
    { data: 'go_preventivo', desc: 'Hub GO Preventivo' },
    { data: 'go_anticoncepcao', desc: 'Hub GO Anticoncepção' },
    { data: 'go_dip', desc: 'Hub GO DIP' },
    // Hub Rotina
    { data: 'rotina_timeline', desc: 'Rotina Timeline' },
    { data: 'rotina_duvida', desc: 'Rotina MedQuest Dúvidas' },
    // UX Geral
    { data: 'ux:menu', desc: 'UX Menu' },
    { data: 'ux:hub:inicio', desc: 'UX Início' },
    { data: 'ux:hub:sala', desc: 'UX Sala Vermelha' },
    { data: 'ux:hub:enf', desc: 'UX Enfermaria' },
    { data: 'ux:hub:amb', desc: 'UX Ambulatório' }
  ];

  for (const item of callbacksParaTestar) {
    limparCaptura();
    const fakeCb = {
      id: 'cb_' + Date.now(),
      data: item.data,
      from: { id: chatId },
      message: { message_id: 999, chat: { id: chatId } }
    };
    ctx.processarCallbackBotao(fakeCb);
    assert.ok(callbacksRespondidos.length > 0, `Callback ${item.data} (${item.desc}) deve responder ao Telegram answerCallbackQuery`);
    assert.ok(mensagensEnviadas.length > 0, `Callback ${item.data} (${item.desc}) deve emitir mensagem ou tela`);
  }

  console.log(`  ✓ Todos os ${callbacksParaTestar.length} callbacks de botões inline foram executados e aprovados.`);

  console.log('\n🎉 TODOS OS TESTES DE HUBS, COMANDOS E CALLBACKS PASSARAM COM 100% DE SUCESSO!\n');
}

if (require.main === module) {
  executarTestesHubsEComandosTelegram().catch((err) => {
    console.error('❌ Falha nos testes de hubs e comandos Telegram:', err);
    process.exit(1);
  });
}

module.exports = { executarTestesHubsEComandosTelegram };
