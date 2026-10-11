/**
 * Testes Unitários e de Integração: Extração de Receita do SOAP (Fase 2)
 * Valida o fluxo direto: [💊 Extrair Receita] -> Receituário Ambulatorial Oficial (/rx)
 * com Copiar para Prontuário, Gerar PDF da Receita e botões de navegação.
 */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const source = require('./source_producao.cjs');

function env() {
  const props = { TELEGRAM_CHAT_ID: '123', TELEGRAM_BOT_TOKEN: 'fake', WEBHOOK_SECRET: 'secret' };
  const cache = {};
  const sent = [];
  let now = 2000000000000, seq = 0;
  class Clock extends Date { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } }
  const p = { getProperty: k => props[k] ?? null, setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: k => { delete props[k]; }, getProperties: () => ({ ...props }) };
  const c = {
    Buffer, Date: Clock, console: { log() {}, error() {} }, PropertiesService: { getScriptProperties: () => p },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] ?? null, put: (k, v) => { cache[k] = String(v); }, remove: k => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }), getUserLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    HtmlService: { createHtmlOutput: body => ({ body }) }, ContentService: { MimeType: { JSON: 'json' }, createTextOutput: body => ({ body, setMimeType() { return this; } }) },
    ScriptApp: { getProjectTriggers: () => [] },
    UrlFetchApp: { fetch: (url, opts) => { sent.push({ url, payload: JSON.parse((opts && opts.payload) || '{}') }); return { getResponseCode: () => 200, getContentText: () => '{"ok":true}' }; } }
  };
  vm.createContext(c); vm.runInContext(source, c);
  c.Utilities.getUuid = () => String(++seq).padStart(32, '0');
  c.Utilities.sleep = () => {};
  return { c, props, cache, sent };
}

let aprovados = 0;
function test(nome, fn) {
  try {
    fn();
    console.log('✅ APROVADO: ' + nome);
    aprovados++;
  } catch (e) {
    console.error('❌ FALHOU: ' + nome + ' :: ' + e.message);
    process.exitCode = 1;
  }
}

// 1. Extração bem-sucedida de receita via callback ux:soap:extrair_rx:<cacheKey>
test('1. Extração direta de receita a partir do SOAP Fase 2 entrega prescrição ambulatorial oficial (rx)', () => {
  const { c, cache, sent } = env();

  const soapTexto = [
    '🩺 *SÍNTESE SOAP · REGISTRO CONSOLIDADO*',
    '',
    '👤 *S - Subjetivo*',
    'Mulher 28 anos, 58kg, sem alergias. Dor de garganta e febre há 2 dias.',
    '',
    '🔍 *O - Objetivo*',
    'BEG, amígdalas hiperemiadas com placas de exsudato purulento.',
    '',
    '🧠 *A - Avaliação*',
    '• Faringoamigdalite bacteriana estreptocócica (CID-10: J03.0)',
    '',
    '📋 *P - Plano*',
    '• Amoxicilina 500mg, tomar 1 cápsula VO de 8/8h por 7 dias',
    '• Dipirona 500mg, tomar 1 comprimido VO de 6/6h se dor ou febre',
    '• Orientações: repouso e hidratação oral abundante',
    '',
    '⚠️ *Dados adicionais que enriqueceriam o caso:*',
    '• Checar histórico familiar'
  ].join('\n');

  const cacheKey = 'soap_fase2_mock_123';
  cache[cacheKey] = soapTexto;

  let chamouGerarPrescricao = false;
  let dadosRecebidosPrescricao = '';
  let tipoCacheRecebido = '';

  const origProcessar = c.processarEEntregarIA;
  c.processarEEntregarIA = (chatId, fnGeradora, dados, tipoCache) => {
    chamouGerarPrescricao = (fnGeradora === c.gerarPrescricaoComIA);
    dadosRecebidosPrescricao = dados;
    tipoCacheRecebido = tipoCache;

    // Simula retorno de prescrição formatada completa com medicamentos
    const rxFormatada = [
      '📋 *RECEITUÁRIO MÉDICO AMBULATORIAL*',
      '',
      'USO ORAL',
      '1. Amoxicilina 500mg --- 21 cápsulas',
      '   Tomar 1 cápsula via oral de 8 em 8 horas por 7 dias.',
      '',
      '2. Dipirona 500mg --- 20 comprimidos',
      '   Tomar 1 comprimido via oral de 6 em 6 horas se dor ou febre.',
      '',
      'Orientações ao paciente: Repouso e hidratação oral.'
    ].join('\n');

    return origProcessar(chatId, () => rxFormatada, dados, tipoCache);
  };

  const cb = {
    id: 'cb_extrair',
    data: 'ux:soap:extrair_rx:' + cacheKey,
    message: { chat: { id: 123 }, message_id: 88 }
  };

  const res = c.tratarCallbackUX(cb);
  assert(res, 'tratarCallbackUX deve retornar true');
  assert(chamouGerarPrescricao, 'Deve chamar gerarPrescricaoComIA');
  assert.equal(tipoCacheRecebido, 'rx', 'Tipo de cache deve ser rx');
  assert(dadosRecebidosPrescricao.includes('Amoxicilina 500mg'), 'Dados devem conter Amoxicilina');
  assert(dadosRecebidosPrescricao.includes('Dipirona 500mg'), 'Dados devem conter Dipirona');
  assert(dadosRecebidosPrescricao.includes('Paciente:'), 'Dados devem incluir contexto do paciente');

  // Verifica mensagem enviada e teclado de retorno
  assert(sent.length >= 1, 'Deve ter enviado mensagem para o Telegram');
  const ultMsg = sent[sent.length - 1];
  const payload = ultMsg.payload;
  assert(payload.text.includes('RECEITUÁRIO MÉDICO AMBULATORIAL') || payload.text.includes('Resumo Clínico'));

  const kb = JSON.stringify(payload.reply_markup || {});
  assert(kb.includes('📋 Copiar para Prontuário') || kb.includes('ux:copiar:'), 'Deve conter botão Copiar');
  assert(kb.includes('📄 Gerar PDF da Receita') || kb.includes('gerarPdfRx_'), 'Deve conter botão Gerar PDF da Receita');
  assert(kb.includes('🔙 Voltar ao Menu'), 'Deve conter botão Voltar ao Menu');
  assert(kb.includes('🏠 Início'), 'Deve conter botão Início');
});

// 2. Alerta quando o cache expira e não há plano
test('2. Cache expirado e sem plano no estado exibe alerta amigável', () => {
  const { c, sent } = env();

  const cb = {
    id: 'cb_expirado',
    data: 'ux:soap:extrair_rx:chave_inexistente_999',
    message: { chat: { id: 123 }, message_id: 89 }
  };

  const res = c.tratarCallbackUX(cb);
  assert(res, 'Deve retornar true ao tratar');
  assert(sent.length >= 1);
  const ultMsg = sent[sent.length - 1];
  assert(ultMsg.payload.text.includes('Nenhum plano terapêutico disponível para extrair receita'), 'Deve exibir mensagem amigável de indisponibilidade');
});

// 3. Alerta quando SOAP é Fase 1 (sem plano)
test('3. SOAP Fase 1 sem plano terapêutico exibe alerta amigável', () => {
  const { c, cache, sent } = env();

  const soapFase1 = [
    '🩺 *SÍNTESE SOAP · ANAMNESE E EXAME FÍSICO*',
    '',
    '👤 *S - Subjetivo*',
    'Paciente com tosse seca há 3 dias.',
    '',
    '🔍 *O - Objetivo*',
    'BEG, eupneica. AR: MV presente sem RA.'
  ].join('\n');

  const cacheKey = 'soap_fase1_mock';
  cache[cacheKey] = soapFase1;

  const cb = {
    id: 'cb_fase1',
    data: 'ux:soap:extrair_rx:' + cacheKey,
    message: { chat: { id: 123 }, message_id: 90 }
  };

  const res = c.tratarCallbackUX(cb);
  assert(res, 'Deve retornar true ao tratar');
  const ultMsg = sent[sent.length - 1];
  assert(ultMsg.payload.text.includes('Nenhum plano terapêutico disponível para extrair receita'), 'Não deve extrair receita de SOAP Fase 1 sem plano');
});

// 4. Recuperação do plano a partir do estado modoBot quando cache do Telegram expira
test('4. Recupera plano a partir do estado do modoBot quando o cacheKey expira', () => {
  const { c, sent } = env();

  const soapTexto = [
    '======================================================================',
    '[P - PLANO]',
    '💊 Prescrição Farmacológica:',
    '  1) Losartana Potássica 50 mg --- 1 comp VO 1x/dia pela manhã.',
    '  2) Hidroclorotiazida 25 mg --- 1 comp VO pela manhã.',
    '======================================================================'
  ].join('\n');

  c.definirModoBot(123, 'soap', soapTexto);

  let chamou = false;
  c.processarEEntregarIA = (chatId, fnGeradora, dados, tipoCache) => {
    chamou = true;
    assert.equal(tipoCache, 'rx');
    assert(dados.includes('Losartana Potássica 50 mg'));
    return true;
  };

  const cb = {
    id: 'cb_fallback_modo',
    data: 'ux:soap:extrair_rx:chave_perdida',
    message: { chat: { id: 123 }, message_id: 91 }
  };

  const res = c.tratarCallbackUX(cb);
  assert(res);
  assert(chamou, 'Deve ter recuperado o plano via modoBot(chat)');
});

// 5. Função pura extrairPlanoDeTextoSoap suporta múltiplos formatos
test('5. extrairPlanoDeTextoSoap extrai plano e remove pendências em múltiplos formatos', () => {
  const { c } = env();

  const formato1 = '📋 *P - Plano*\n• Dipirona 1g VO\n• Repouso\n\n⚠️ *Dados adicionais*';
  const p1 = c.extrairPlanoDeTextoSoap(formato1);
  assert(p1.includes('Dipirona 1g VO'));
  assert(!p1.includes('Dados adicionais'));

  const formato2 = '[P - PLANO]\n1) Amoxicilina 500mg\n======================================================================';
  const p2 = c.extrairPlanoDeTextoSoap(formato2);
  assert(p2.includes('Amoxicilina 500mg'));

  const formato3 = 'Plano:\n- Cetoprofeno 100mg VO 12/12h por 3 dias';
  const p3 = c.extrairPlanoDeTextoSoap(formato3);
  assert(p3.includes('Cetoprofeno 100mg'));

  const formatoVazio = '📋 *P - Plano*\nConduta e prescrição a definir pelo médico assistente.';
  const pVazio = c.extrairPlanoDeTextoSoap(formatoVazio);
  assert.equal(pVazio, null, 'Plano vazio/placeholder deve retornar null');
});

console.log(`${aprovados}/5 testes de extração de receita SOAP aprovados com sucesso!`);
