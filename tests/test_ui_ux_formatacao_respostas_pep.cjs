const assert = require('assert');
const runtime = require('../server/runtime.js');

async function testUiUxFormatacaoRespostasPep() {
  console.log('=== INICIANDO BATERIA DE TESTES: UI/UX FORMATAÇÃO ESCANEÁVEL & CÓPIA PEP ===\n');

  const ctx = runtime.ctx;
  const chatId = ctx.ConfigService.get('TELEGRAM_CHAT_ID') || '1771571035';

  let mensagensEnviadas = [];
  ctx.enviarMensagemParaChat = (id, texto) => {
    mensagensEnviadas.push({ metodo: 'enviarMensagemParaChat', id, texto });
  };
  ctx.enviarMensagemComTecladoFixo = (id, texto) => {
    mensagensEnviadas.push({ metodo: 'enviarMensagemComTecladoFixo', id, texto });
  };
  ctx.enviarMensagemComTecladoParaChat = (id, texto, kb) => {
    mensagensEnviadas.push({ metodo: 'enviarMensagemComTecladoParaChat', id, texto, kb });
  };
  ctx.enviarMensagemComBotoes = (id, texto, kb) => {
    mensagensEnviadas.push({ metodo: 'enviarMensagemComBotoes', id, texto, kb });
  };
  ctx.responderCallbackTelegram = (cbId, texto) => {
    mensagensEnviadas.push({ metodo: 'responderCallbackTelegram', cbId, texto });
  };
  ctx.executarPostTelegram = (url, payload) => {
    mensagensEnviadas.push({ metodo: 'executarPostTelegram', id: payload.chat_id, texto: payload.text, kb: payload.reply_markup });
    return true;
  };

  // =========================================================================
  // 1. Hierarquia Visual Escaneável Beira-Leito (4 Marcadores Canônicos)
  // =========================================================================
  console.log('[1] Testando formatarHierarquiaEscaneavel e os 4 Blocos Beira-Leito...');
  assert(typeof ctx.formatarHierarquiaEscaneavel === 'function', 'formatarHierarquiaEscaneavel deve estar definida no runtime');

  const saidaHierarquia = ctx.formatarHierarquiaEscaneavel({
    titulo: '🚨 *EMERGÊNCIA: EDEMA AGUDO DE PULMÃO (EAP)*',
    acaoImediata: [
      'Cabeceira elevada a 90° com pernas pendentes',
      'VNI Imediata (CPAP 8-10 cmH2O ou BIPAP 12/6 cmH2O)',
      'Vasodilatador venoso precoce: Nitroglicerina (Tridil) IV'
    ],
    manutencaoDiluicao: [
      'Tridil 50 mg em 250 mL SG5% (200 mcg/mL): iniciar a 10-20 mcg/min (3-6 mL/h) e titular a cada 5 min',
      'Furosemida 20 a 40 mg IV em bolus lento'
    ],
    alertasSeguranca: [
      'Morfina NÃO é recomendada de rotina (aumenta intubação e mortalidade)',
      'Suspender ou não iniciar vasodilatador se PAS < 90-100 mmHg'
    ],
    justificativa: [
      'Diretrizes SBC / ESC Heart Failure 2023: vasodilatação rápida precoce reduz pós-carga e evita IOT'
    ]
  });

  assert(saidaHierarquia.includes('🔴 *AÇÃO IMEDIATA / CONDUTA / DOSE DE ATAQUE:*'), 'Deve conter bloco de Ação Imediata com 🔴');
  assert(saidaHierarquia.includes('🟡 *DILUIÇÃO, VELOCIDADE DE INFUSÃO E MANUTENÇÃO:*'), 'Deve conter bloco de Diluição e Manutenção com 🟡');
  assert(saidaHierarquia.includes('⚠️ *ALERTAS DE SEGURANÇA E BLOQUEIOS:*'), 'Deve conter bloco de Alertas com ⚠️');
  assert(saidaHierarquia.includes('ℹ️ *JUSTIFICATIVA CLÍNICA E REFERÊNCIAS:*'), 'Deve conter bloco de Justificativa com ℹ️');
  console.log('  ✓ formatarHierarquiaEscaneavel monta perfeitamente a estrutura de 4 blocos semafóricos.');

  // =========================================================================
  // 2. Calculadoras de Sala Vermelha com Hierarquia Escaneável
  // =========================================================================
  console.log('\n[2] Testando Calculadoras de Emergência com Hierarquia Escaneável...');
  // A. Noradrenalina (DVA)
  const resDva = ctx.CalculadorasClinicas.drogasVasoativas('noradrenalina', 70);
  assert(resDva && resDva.ok, 'drogasVasoativas deve calcular com sucesso');
  assert(resDva.textoFormatado.includes('🔴 AÇÃO IMEDIATA / DOSE DE ATAQUE'), 'DVA deve conter bloco de Ação Imediata');
  assert(resDva.textoFormatado.includes('🟡 DILUIÇÃO, VELOCIDADE DE INFUSÃO E MANUTENÇÃO'), 'DVA deve conter bloco de Diluição e Manutenção');
  assert(resDva.textoFormatado.includes('⚠️ ALERTAS DE SEGURANÇA E BLOQUEIOS'), 'DVA deve conter Alertas de Segurança');
  assert(resDva.textoFormatado.includes('ℹ️ JUSTIFICATIVA CLÍNICA E REFERÊNCIAS'), 'DVA deve conter Justificativa Clínica');
  console.log('  ✓ DVA Noradrenalina formatada com a hierarquia escaneável beira-leito.');

  // B. SRI / IOT
  const resSri = ctx.CalculadorasClinicas.sequenciaRapidaIntubacao(70, 'choque');
  assert(resSri && resSri.ok, 'sequenciaRapidaIntubacao deve calcular com sucesso');
  assert(resSri.textoFormatado.includes('🔴 AÇÃO IMEDIATA / CONDUTA / DOSE DE ATAQUE'), 'SRI deve conter bloco de Ação Imediata no topo');
  assert(resSri.textoFormatado.includes('🟡 DILUIÇÃO, VELOCIDADE DE INFUSÃO E MANUTENÇÃO'), 'SRI deve conter bloco de Diluição');
  assert(resSri.textoFormatado.includes('⚠️ ALERTAS DE SEGURANÇA E BLOQUEIOS'), 'SRI deve conter Alertas de Segurança');
  assert(resSri.textoFormatado.includes('ℹ️ JUSTIFICATIVA CLÍNICA E REFERÊNCIAS'), 'SRI deve conter Justificativa');
  console.log('  ✓ SRI Intubação formatada com a hierarquia escaneável beira-leito.');

  // =========================================================================
  // 3. Exportação Limpa para Prontuário / PEP (Botão "📋 Copiar para Prontuário")
  // =========================================================================
  console.log('\n[3] Testando Exportação Limpa para PEP (uxTextoProntuario e Botão Dedicado)...');
  const textoBrutoComMarkdown = '🚨 *EMERGÊNCIA*\n\n🔴 *AÇÃO:* **Fazer X** `agora`!\n• Item 1\n# Título\n\n\nTexto final.';
  const textoLimpoPep = ctx.uxTextoProntuario(textoBrutoComMarkdown);
  assert(!textoLimpoPep.includes('*'), 'Texto para prontuário não deve conter asteriscos de markdown');
  assert(!textoLimpoPep.includes('`'), 'Texto para prontuário não deve conter crases de markdown');
  assert(!textoLimpoPep.includes('#'), 'Texto para prontuário não deve conter cabeçalhos hashtag');
  assert(!textoLimpoPep.includes('🚨'), 'Texto para prontuário não deve conter emojis');
  assert(!textoLimpoPep.includes('🔴'), 'Texto para prontuário não deve conter emojis');
  console.log('  ✓ uxTextoProntuario limpa perfeitamente marcações e emojis para inserção no PEP.');

  // Teste de emissão de Atestado com botão inline "📋 Copiar para Prontuário"
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/atestado 3 dias repouso por lombalgia, com CID, paciente Carlos Silva' });
  assert(mensagensEnviadas.length > 0, 'Comando /atestado deve enviar mensagem');
  const msgAtestado = mensagensEnviadas[0];
  assert(msgAtestado.kb && msgAtestado.kb.inline_keyboard, 'Mensagem de atestado deve conter teclado inline');
  const todosBotoesAt = msgAtestado.kb.inline_keyboard.flat();
  const btnCopiarAt = todosBotoesAt.find(b => b.text === '📋 Copiar para Prontuário');
  assert(btnCopiarAt, 'Teclado do atestado deve conter botão "📋 Copiar para Prontuário"');
  console.log('  ✓ /atestado emite atestado estruturado com botão inline "📋 Copiar para Prontuário".');

  // =========================================================================
  // 4. Botões Inline de Ajuste Dinâmico em Prescrições e SOAP
  // =========================================================================
  console.log('\n[4] Testando Botões Dinâmicos: Recalcular por Peso e Ver Interações...');
  mensagensEnviadas = [];
  // Simula entrega via processarEEntregarIA para RX
  const mockPrescricao = '💊 *PRESCRIÇÃO AMBULATORIAL*\n1. Amoxicilina 500mg - 21 caps\n- 8/8h por 7 dias';
  ctx.processarEEntregarIA(chatId, () => mockPrescricao, 'amoxicilina 500mg', 'rx');
  assert(mensagensEnviadas.length > 0);
  const msgRx = mensagensEnviadas[mensagensEnviadas.length - 1];
  assert(msgRx.kb && msgRx.kb.inline_keyboard, 'Prescrição deve conter inline keyboard');
  const todosBotoesRx = msgRx.kb.inline_keyboard.flat();

  const btnCopiarRx = todosBotoesRx.find(b => b.text === '📋 Copiar para Prontuário');
  assert(btnCopiarRx, 'Prescrição deve conter botão "📋 Copiar para Prontuário"');

  const btnRecalcPeso = todosBotoesRx.find(b => b.text === '🔄 Recalcular por Peso');
  assert(btnRecalcPeso, 'Prescrição deve conter botão "🔄 Recalcular por Peso"');
  assert(btnRecalcPeso.callback_data.startsWith('ux:recalc:peso:'), 'Callback do botão deve ser ux:recalc:peso:');

  const btnVerInteracoes = todosBotoesRx.find(b => b.text === '⚠️ Ver Interações');
  assert(btnVerInteracoes, 'Prescrição deve conter botão "⚠️ Ver Interações"');
  assert(btnVerInteracoes.callback_data.startsWith('ux:interacao:caso:'), 'Callback do botão deve ser ux:interacao:caso:');
  console.log('  ✓ Prescrição entrega linha primária de cópia PEP e linha de botões dinâmicos (Recalcular e Interações).');

  // =========================================================================
  // 5. Fluxo Interativo dos Callbacks Dinâmicos
  // =========================================================================
  console.log('\n[5] Testando Execução dos Callbacks de Recalcular e Interações...');

  // A. Clique em "🔄 Recalcular por Peso" abre seletor com pesos rápidos
  mensagensEnviadas = [];
  const cbRecalc = btnRecalcPeso.callback_data;
  ctx.processarCallbackBotao({
    id: 'cb_test_recalc',
    data: cbRecalc,
    message: { chat: { id: chatId }, message_id: 8888 }
  });
  assert(mensagensEnviadas.length > 0);
  const msgTelaRecalc = mensagensEnviadas[mensagensEnviadas.length - 1];
  assert(msgTelaRecalc.texto.includes('RECALCULAR POR PESO'), 'Tela deve orientar recálculo por peso');
  const botoesPesos = msgTelaRecalc.kb.inline_keyboard.flat().map(b => b.text);
  assert(botoesPesos.includes('50 kg') && botoesPesos.includes('70 kg') && botoesPesos.includes('90 kg'), 'Deve conter botões de pesos rápidos');
  console.log('  ✓ Clique em "🔄 Recalcular por Peso" exibe seletor de peso imediato.');

  // B. Clique em peso rápido (ex: 80 kg) dispara recálculo
  mensagensEnviadas = [];
  const keyCacheCaso = cbRecalc.split(':')[3];
  ctx.processarCallbackBotao({
    id: 'cb_test_recalc_80',
    data: `ux:recalc_val:80:${keyCacheCaso}`,
    message: { chat: { id: chatId }, message_id: 8889 }
  });
  assert(mensagensEnviadas.length > 0);
  const txtRecalcResp = mensagensEnviadas.map(m => m.texto).join('\n');
  assert(txtRecalcResp.includes('80 kg') || txtRecalcResp.includes('Recalculando'), 'Deve disparar recálculo para 80 kg');
  console.log('  ✓ Seleção de peso rápido (80 kg) dispara recálculo dinâmico.');

  // C. Clique em "⚠️ Ver Interações" dispara análise farmacológica
  mensagensEnviadas = [];
  const cbInteracao = btnVerInteracoes.callback_data;
  ctx.processarCallbackBotao({
    id: 'cb_test_interacao',
    data: cbInteracao,
    message: { chat: { id: chatId }, message_id: 8890 }
  });
  assert(mensagensEnviadas.length > 0);
  const txtInteracaoResp = mensagensEnviadas.map(m => m.texto).join('\n');
  assert(txtInteracaoResp.includes('interações') || txtInteracaoResp.includes('INTERAÇÃO') || txtInteracaoResp.includes('Analisando'), 'Deve analisar interações');
  console.log('  ✓ Clique em "⚠️ Ver Interações" analisa interações farmacológicas do caso.');

  console.log('\n🎉 TODOS OS TESTES DE FORMATAÇÃO VISUAL, CÓPIA PEP E BOTÕES DINÂMICOS PASSARAM COM SUCESSO!\n');
}

testUiUxFormatacaoRespostasPep().catch(err => {
  console.error('Falha nos testes de formatação PEP:', err);
  process.exit(1);
});
