/**
 * TESTES OSTENSIVOS DO LEITOR DE IMAGENS MÉDICAS MULTIMODAIS (FMRP-USP)
 * Valida:
 * 1. Download inteligente de resolução ideal (~1280px, penúltima foto) para economia de I/O.
 * 2. Eliminação de mensagem de texto intermediária poluidora ("Analisando imagem...").
 * 3. Rigor semiológico nos 4 roteiros (ECG 6 passos, RX, OCR laboratorial e Dermatologia).
 * 4. Alerta mandatório de emergência na PRIMEIRA LINHA em achados críticos (Sala Vermelha).
 * 5. Teclado inline com [➕ Incorporar ao SOAP], [🎧 Ouvir no Fone] e [📁 Salvar no Notion].
 * 6. Execução do callback de incorporação ao SOAP (início de caso e atualização de caso ativo).
 */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const source = fs.readFileSync(path.resolve(__dirname, '../ultra_rotina_master.js'), 'utf8');

function env() {
  const props = {
    TELEGRAM_CHAT_ID: '123',
    TELEGRAM_BOT_TOKEN: 'fake-token',
    WEBHOOK_SECRET: 'secret',
    GEMINI_API_KEY: 'fake-gemini'
  };
  const cache = {}, sent = [];
  let now = 2000000000000, seq = 0;
  class Clock extends Date { constructor(...a){super(...(a.length?a:[now]));} static now(){return now;} }
  const p = {
    getProperty: k => props[k] ?? null,
    setProperty: (k, v) => { props[k] = String(v); },
    deleteProperty: k => { delete props[k]; },
    getProperties: () => ({ ...props }),
    setProperties: (o, del) => {
      if (del) for (const k in props) delete props[k];
      for (const k in o) props[k] = String(o[k]);
      return p;
    }
  };
  const c = {
    Buffer, Date: Clock, console: { log() {}, error() {} },
    PropertiesService: { getScriptProperties: () => p },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] ?? null, put: (k, v) => { cache[k] = String(v); }, remove: k => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }), getUserLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    HtmlService: { createHtmlOutput: body => ({ body }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: body => ({ body, setMimeType() { return this; } }) },
    ScriptApp: { getProjectTriggers: () => [] },
    UrlFetchApp: {
      fetch: (url, opts) => {
        const payload = JSON.parse((opts && opts.payload) || '{}');
        sent.push({ url, payload });
        if (url.includes('/getFile')) {
          return {
            getResponseCode: () => 200,
            getContentText: () => JSON.stringify({ ok: true, result: { file_path: 'photos/file_target.jpg' } })
          };
        }
        if (url.includes('/file/bot')) {
          return {
            getResponseCode: () => 200,
            getBlob: () => ({
              getContentType: () => 'image/jpeg',
              getBytes: () => [1, 2, 3, 4]
            })
          };
        }
        if (url.includes('generateContent')) {
          return {
            getResponseCode: () => 200,
            getContentText: () => JSON.stringify({
              candidates: [{
                content: {
                  parts: [{
                    text: '🩺 *LAUDO CLÍNICO MULTIMODAL · ECG DE 12 DERIVAÇÕES*\n\n' +
                          '*1. 🔍 Descrição Semiológica e Metódica dos Achados*\n' +
                          '- Ritmo: Sinusal regular.\n' +
                          '- FC: 75 bpm.\n' +
                          '- Eixo: Normal (+45°).\n' +
                          '- Intervalos: PR 160 ms, QRS 88 ms, QTc 410 ms.\n' +
                          '- Sobrecargas: Ausentes.\n' +
                          '- Repolarização: Sem supradesnivelamento ou infradesnivelamento de ST.\n\n' +
                          '*2. 🎯 Hipóteses Diagnósticas Principais & Diferenciais*\n' +
                          '- Traçado eletrocardiográfico dentro dos limites da normalidade.\n\n' +
                          '*3. ⚡ Condutas Recomendadas & Recomendações de Diretriz*\n' +
                          '- Correlacionar com a clínica e troponina se dor torácica.'
                  }]
                }
              }]
            })
          };
        }
        return { getResponseCode: () => 200, getContentText: () => '{"ok":true}' };
      }
    }
  };
  vm.createContext(c);
  vm.runInContext(source, c);
  c.Utilities.getUuid = () => String(++seq).padStart(32, '0');
  c.Utilities.sleep = () => {};

  return { c, props, cache, sent };
}

let total = 0, pass = 0;
function test(name, fn) {
  total++;
  try {
    fn();
    pass++;
    console.log('✅ APROVADO: ' + name);
  } catch (err) {
    console.error('❌ FALHOU: ' + name);
    console.error(err);
    process.exitCode = 1;
  }
}

// 1. Download inteligente da resolução ideal (penúltima foto do array)
test('Download inteligente: seleciona penúltima resolução (~1280px) quando photos >= 2', () => {
  const { c, sent } = env();
  let arquivoBaixado = null;
  c.baixarMidiaTelegram = (arq) => {
    arquivoBaixado = arq;
    return { data: 'base64simulada', mime: 'image/jpeg' };
  };

  const msg4Fotos = {
    chat: { id: 123 },
    photo: [
      { file_id: 'thumb_small', width: 320 },
      { file_id: 'thumb_medium', width: 800 },
      { file_id: 'photo_ideal_1280', width: 1280 },
      { file_id: 'photo_giant_4000', width: 4000 }
    ]
  };

  c.processarMensagemFoto(msg4Fotos);
  assert.ok(arquivoBaixado, 'Deveria ter chamado baixarMidiaTelegram');
  assert.strictEqual(arquivoBaixado.file_id, 'photo_ideal_1280', 'Deveria selecionar penúltima foto (photo_ideal_1280)');
});

test('Download inteligente: seleciona a única foto se photos.length === 1', () => {
  const { c } = env();
  let arquivoBaixado = null;
  c.baixarMidiaTelegram = (arq) => {
    arquivoBaixado = arq;
    return { data: 'base64simulada', mime: 'image/jpeg' };
  };

  const msg1Foto = {
    chat: { id: 123 },
    photo: [{ file_id: 'single_photo', width: 800 }]
  };

  c.processarMensagemFoto(msg1Foto);
  assert.strictEqual(arquivoBaixado.file_id, 'single_photo');
});

// 2. Ausência de balão de texto intermediário ("Analisando imagem...") e presença de sendChatAction
test('Keep-alive visual: envia upload_photo e NÃO envia mensagem de texto "Analisando..."', () => {
  const { c, sent } = env();
  const msg = {
    chat: { id: 123 },
    photo: [{ file_id: 'f1', width: 800 }]
  };

  c.processarMensagemFoto(msg);

  // Verifica se houve chamada a sendChatAction com upload_photo
  const actionCall = sent.find(s => s.url.includes('/sendChatAction') && s.payload.action === 'upload_photo');
  assert.ok(actionCall, 'Deveria emitir sendChatAction com upload_photo');

  // Verifica se NENHUMA mensagem de texto continha "Analisando imagem..."
  const analisandoMsg = sent.find(s => s.url.includes('/sendMessage') && s.payload.text && s.payload.text.includes('Analisando imagem'));
  assert.strictEqual(analisandoMsg, undefined, 'NÃO deve enviar balão de texto redundante "Analisando imagem..."');
});

// 3. Teclado inline enriquecido: Incorporar ao SOAP, Ouvir no Fone, Salvar no Notion
test('Teclado inline: botões [➕ Incorporar ao SOAP], [🎧 Ouvir no Fone] e [📁 Salvar no Notion]', () => {
  const { c, sent, cache } = env();
  const msg = {
    chat: { id: 123 },
    photo: [{ file_id: 'f1', width: 800 }]
  };

  c.processarMensagemFoto(msg);

  const msgFinal = sent.find(s => s.url.includes('/sendMessage') && s.payload.reply_markup);
  assert.ok(msgFinal, 'Deveria enviar mensagem com reply_markup');
  const kb = msgFinal.payload.reply_markup.inline_keyboard;
  assert.strictEqual(kb.length, 2, 'Deveria ter 2 linhas de botões');

  // Linha 1: Incorporar ao SOAP
  assert.strictEqual(kb[0][0].text, '➕ Incorporar ao SOAP');
  assert.ok(kb[0][0].callback_data.startsWith('incorporarSoap_'), 'Callback deve ser incorporarSoap_');

  // Linha 2: Ouvir no Fone e Salvar no Notion
  assert.strictEqual(kb[1][0].text, '🎧 Ouvir no Fone');
  assert.ok(kb[1][0].callback_data.startsWith('ouvirPreceptor_'), 'Callback deve ser ouvirPreceptor_');
  assert.strictEqual(kb[1][1].text, '📁 Salvar no Notion');
  assert.ok(kb[1][1].callback_data.startsWith('salvarNotion_imagem_'), 'Callback deve ser salvarNotion_imagem_');

  // Valida persistência no cache
  const cacheKey = kb[0][0].callback_data.replace('incorporarSoap_', '');
  assert.ok(cache[cacheKey], 'Laudo deve estar salvo no cache');
  assert.ok(cache['ctx_123'], 'Contexto de curto prazo ctx_123 deve conter o laudo');
});

// 4. Rigor Semiológico FMRP-USP em analisarImagemMedicaComIA (prompt de sistema)
test('Rigor Semiológico: prompt de sistema de analisarImagemMedicaComIA contém todos os roteiros especializados', () => {
  const { c, sent } = env();
  c.analisarImagemMedicaComIA('base64', 'image/jpeg', 'Suspeita de IAM anterior');

  const geminiCall = sent.find(s => s.url.includes('generateContent'));
  assert.ok(geminiCall, 'Deveria ter feito chamada ao Gemini');
  const systemText = geminiCall.payload.systemInstruction.parts[0].text;

  // ECG 6 passos
  assert.ok(systemText.includes('Ritmo'), 'Prompt deve conter análise de Ritmo');
  assert.ok(systemText.includes('Frequência Cardíaca'), 'Prompt deve conter FC');
  assert.ok(systemText.includes('Eixo Elétrico'), 'Prompt deve conter Eixo Elétrico');
  assert.ok(systemText.includes('Intervalos'), 'Prompt deve conter Intervalos');
  assert.ok(systemText.includes('Sobrecargas'), 'Prompt deve conter Sobrecargas');
  assert.ok(systemText.includes('Isquemia'), 'Prompt deve conter Isquemia/ST-T');
  assert.ok(systemText.includes('paredes contíguas'), 'Prompt deve exigir análise de paredes contíguas');

  // Radiografia
  assert.ok(systemText.includes('RADIOGRAFIA'), 'Prompt deve conter roteiro de Radiografia');
  assert.ok(systemText.includes('Incidência') || systemText.includes('Técnica'), 'Prompt deve checar técnica de RX');
  assert.ok(systemText.includes('Índice Cardiotorácico') || systemText.includes('ICT'), 'Prompt deve conter ICT');
  assert.ok(systemText.includes('Campos Pleuropulmonares'), 'Prompt deve conter campos pulmonares');
  assert.ok(/seios costofr[eê]nicos/i.test(systemText), 'Prompt deve conter seios costofrênicos');

  // Laboratório / OCR
  assert.ok(systemText.includes('EXAMES LABORATORIAIS'), 'Prompt deve conter roteiro laboratorial');
  assert.ok(systemText.includes('Transcrição fiel'), 'Prompt deve exigir transcrição fiel');
  assert.ok(systemText.includes('valores de referência'), 'Prompt deve exigir valores de referência');

  // Dermatologia
  assert.ok(systemText.includes('DERMATOLÓGICA'), 'Prompt deve conter roteiro dermatológico');
  assert.ok(systemText.includes('Lesão elementar'), 'Prompt deve exigir lesão elementar');
  assert.ok(systemText.includes('Regra ABCDE'), 'Prompt deve exigir Regra ABCDE');

  // Tomografia Computadorizada (TC por topografias)
  assert.ok(systemText.includes('TOMOGRAFIA COMPUTADORIZADA'), 'Prompt deve conter roteiro de TC');
  assert.ok(systemText.includes('B-C-B-V-B'), 'Prompt deve conter o método B-C-B-V-B de crânio');
  assert.ok(systemText.includes('TC DE TÓRAX') && systemText.includes('TEP'), 'Prompt deve cobrir TC de Tórax e TEP');
  assert.ok(systemText.includes('TC DE ABDOME') && systemText.includes('Apendicite'), 'Prompt deve cobrir TC de Abdome e apendicite');

  // Ultrassonografia Beira-Leito (POCUS) e Ressonância
  assert.ok(systemText.includes('POCUS') && systemText.includes('eFAST'), 'Prompt deve conter POCUS e protocolo eFAST');
  assert.ok(systemText.includes('BLUE'), 'Prompt deve conter protocolo BLUE');
  assert.ok(systemText.includes('RESSONÂNCIA MAGNÉTICA') && systemText.includes('DWI'), 'Prompt deve cobrir Ressonância e difusão DWI');

  // Critérios diagnósticos de alta sensibilidade clínica (OMIs, Silhueta e Gasometria)
  assert.ok(systemText.includes('Sgarbossa'), 'Prompt deve conter critérios de Sgarbossa');
  assert.ok(systemText.includes('Wellens'), 'Prompt deve conter Síndrome de Wellens');
  assert.ok(systemText.includes('Silhueta de Felson'), 'Prompt deve conter sinal da silhueta de Felson');
  assert.ok(systemText.includes('Fórmula de Winter'), 'Prompt deve conter fórmula de Winter para gasometria');
  assert.ok(systemText.includes('ASPECTS'), 'Prompt deve conter score ASPECTS');

  // Calibração de thinkingBudget de alto raciocínio deliberado
  assert.strictEqual(geminiCall.payload.generationConfig.thinkingConfig.thinkingBudget, 2048, 'Deve usar thinkingBudget: 2048 para raciocínio clínico deliberado profundo');
});

// 5. Protocolo de Segurança Máxima (Sala Vermelha / Achado Crítico)
test('Sala Vermelha: prompt exige alerta mandatório na PRIMEIRA LINHA em achados críticos', () => {
  const { c, sent } = env();
  c.analisarImagemMedicaComIA('base64', 'image/png', 'Paciente chocado com dor torácica');

  const geminiCall = sent.find(s => s.url.includes('generateContent'));
  const systemText = geminiCall.payload.systemInstruction.parts[0].text;
  assert.ok(systemText.includes('🚨 *EMERGÊNCIA - ACHADO CRÍTICO:*'), 'Prompt deve instruir formato exato do alerta de emergência na primeira linha');
  assert.ok(systemText.includes('PRIMEIRA LINHA DA RESPOSTA DEVE SER OBRIGATORIAMENTE'), 'Prompt deve definir como obrigatório na primeira linha');
});

// 6. Callback de Incorporação ao SOAP [➕ Incorporar ao SOAP]
test('Callback incorporarSoap_: inicia novo caso SOAP a partir do laudo se não houver caso ativo', () => {
  const { c, cache, sent } = env();
  const cacheKey = 'img_test_123';
  const laudoSimulado = '🩺 *LAUDO CLÍNICO MULTIMODAL · ECG*\n- Supra de ST em V1-V4.';
  cache[cacheKey] = laudoSimulado;

  let soapChamadoCom = null;
  c.gerarSOAPComIA = (caso, opts) => {
    soapChamadoCom = caso;
    return '🩺 *SÍNTESE SOAP · ATENDIMENTO CLÍNICO*\nCaso estruturado com ECG incorporado.';
  };

  const cb = {
    id: 'cb_1',
    data: 'incorporarSoap_' + cacheKey,
    from: { id: 123 },
    message: { chat: { id: 123 }, message_id: 99 }
  };

  c.processarCallbackBotao(cb);

  assert.ok(soapChamadoCom, 'Deveria ter chamado gerarSOAPComIA');
  assert.ok(soapChamadoCom.includes(laudoSimulado), 'Deveria ter passado o laudo da imagem para o SOAP');
  assert.strictEqual(cache['ctx_123'].includes(laudoSimulado), true, 'Contexto do chat deve conter o laudo');
});

test('Callback incorporarSoap_: anexa laudo ao caso SOAP ativo se já houver paciente em andamento', () => {
  const { c, cache, sent } = env();
  const cacheKey = 'img_test_456';
  const laudoSimulado = '🩻 *LAUDO RADIOGRAFIA DE TÓRAX*\n- Consolidação em lobo inferior direito.';
  cache[cacheKey] = laudoSimulado;
  cache['ctx_123'] = 'Paciente masculino, 68 anos, tosse produtiva e febre há 3 dias.';

  let soapChamadoCom = null;
  c.gerarSOAPComIA = (caso, opts) => {
    soapChamadoCom = caso;
    return '🩺 *SÍNTESE SOAP · ATENDIMENTO CLÍNICO*\nAtualizado com consolidação em LID.';
  };

  const cb = {
    id: 'cb_2',
    data: 'incorporarSoap_' + cacheKey,
    from: { id: 123 },
    message: { chat: { id: 123 }, message_id: 100 }
  };

  c.processarCallbackBotao(cb);

  assert.ok(soapChamadoCom, 'Deveria ter chamado gerarSOAPComIA');
  assert.ok(soapChamadoCom.includes('tosse produtiva'), 'Deveria manter os dados do paciente anterior');
  assert.ok(soapChamadoCom.includes('Consolidação em lobo inferior direito'), 'Deveria anexar o laudo do RX');
});

console.log(`\n========================================`);
console.log(`TOTAL DE TESTES DO LEITOR DE IMAGENS: ${total}`);
console.log(`APROVADOS: ${pass}`);
console.log(`FALHAS: ${total - pass}`);
console.log(`========================================\n`);

if (pass !== total) {
  process.exit(1);
}
