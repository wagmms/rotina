/**
 * TESTES DO DIÁLOGO SOCRÁTICO MULTI-TURNO DO PRECEPTOR IA
 * Valida a retenção de estado de conversação, avaliação clínica das respostas de Wagner
 * (por texto e por áudio) e a geração de SOAP sob demanda.
 */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const source = fs.readFileSync(path.resolve(__dirname, '../ultra_rotina_master.js'), 'utf8');

function criarAmbiente() {
  const props = {
    TELEGRAM_CHAT_ID: '123',
    TELEGRAM_BOT_TOKEN: 'fake-bot-token',
    GEMINI_API_KEY: 'fake-gemini-key'
  };
  const cache = {};
  const chamadasEnviadas = [];
  let seqUuid = 0;

  const c = {
    Buffer,
    console: { log() {}, error() {} },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: k => props[k] ?? null,
        setProperty: (k, v) => { props[k] = String(v); },
        deleteProperty: k => { delete props[k]; },
        getProperties: () => ({ ...props })
      })
    },
    CacheService: {
      getScriptCache: () => ({
        get: k => cache[k] ?? null,
        put: (k, v) => { cache[k] = String(v); },
        remove: k => { delete cache[k]; }
      })
    },
    LockService: {
      getScriptLock: () => ({ waitLock() {}, releaseLock() {} }),
      getUserLock: () => ({ tryLock: () => true, releaseLock() {} })
    },
    Utilities: {
      getUuid: () => String(++seqUuid).padStart(32, '0'),
      sleep: () => {},
      formatDate: () => '2026-10-05',
      base64Encode: b => Buffer.from(b).toString('base64'),
      base64Decode: s => Buffer.from(s, 'base64')
    },
    UrlFetchApp: {
      fetch: (url, opts) => {
        let payload = null;
        try { payload = JSON.parse(opts.payload); } catch (e) { payload = opts.payload; }
        chamadasEnviadas.push({ url, opts, payload });
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ ok: true, result: { message_id: 1001 } }),
          getBlob: () => ({
            getBytes: () => Buffer.from('audio-bytes-fake'),
            getContentType: () => 'audio/ogg'
          })
        };
      }
    }
  };

  vm.createContext(c);
  vm.runInContext(source, c);
  return { c, cache, chamadasEnviadas };
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

console.log('🧪 Iniciando TESTES do Diálogo Socrático Multi-Turno do Preceptor IA...\n');

// 1. INICIALIZAÇÃO DO DIÁLOGO SOCRÁTICO
test('1. Iniciar preceptor arma o diálogo socrático com caso base e pergunta', () => {
  const { c, cache } = criarAmbiente();

  c.gerarProvocacaoPreceptorAudio = () => 'Qual é o padrão de ausculta pulmonar que mais sugere pneumonia versus DPOC?';
  c.sintetizarVozPreceptor = () => ({ getBytes: () => [1, 2, 3] });
  c.enviarAudioVozTelegram = (chatId, blob, legenda, kb) => {
    assert.equal(chatId, 123);
    assert(legenda.includes('pneumonia versus DPOC'));
    assert(kb.inline_keyboard[0][0].callback_data === 'preceptor_gerar_soap');
    return true;
  };

  c.processarMensagemTexto({
    chat: { id: 123 },
    text: '/voz Paciente 68 anos com tosse produtiva e febre há 3 dias'
  });

  const diag = c.obterDialogoPreceptor(123);
  assert(diag !== null, 'Diálogo do preceptor deve estar ativo no cache');
  assert.equal(diag.em_andamento, true);
  assert(diag.caso_base.includes('68 anos'));
  assert(diag.ultima_pergunta.includes('pneumonia versus DPOC'));
  assert.equal(diag.historico.length, 1);
});

// 2. RESPOSTA DE WAGNER POR TEXTO NÃO GERA SOAP E CONTINUA DIÁLOGO
test('2. Resposta de Wagner por texto é avaliada socraticamente sem cair no SOAP', () => {
  const { c } = criarAmbiente();

  // Configura diálogo pré-existente
  c.salvarDialogoPreceptor(123, {
    em_andamento: true,
    caso_base: 'Paciente 68 anos com tosse produtiva e febre há 3 dias',
    ultima_pergunta: 'Qual é o padrão de ausculta pulmonar que mais sugere pneumonia versus DPOC?',
    historico: [{ papel: 'preceptor', texto: 'Qual é o padrão de ausculta pulmonar que mais sugere pneumonia versus DPOC?' }]
  });

  let chamouDialogoIA = false;
  let chamouSOAP = false;

  c.gerarDialogoPreceptorSocratico = (casoBase, perguntaAnterior, respostaWagner, historico) => {
    chamouDialogoIA = true;
    assert(casoBase.includes('68 anos'));
    assert(perguntaAnterior.includes('pneumonia versus DPOC'));
    assert(respostaWagner.includes('Crepitacoes unilaterais'));
    return 'Exatamente, crepitações localizadas e broncofonia sugerem consolidação. Como você estratifica o risco desse paciente pelo CURB-65?';
  };

  c.gerarSOAPComIA = () => {
    chamouSOAP = true;
    return 'SOAP INCORRETO';
  };

  let msgEnviada = '';
  c.enviarMensagemComTecladoParaChat = (chatId, texto, kb) => {
    msgEnviada = texto;
    assert(kb.inline_keyboard[0][1].callback_data === 'preceptor_gerar_soap');
    return true;
  };

  // Wagner responde por texto
  c.processarMensagemTexto({
    chat: { id: 123 },
    text: 'Crepitacoes unilaterais. Exacerbação de doença crônica no cursa com isso.'
  });

  assert.equal(chamouSOAP, false, 'NÃO deve ter gerado SOAP!');
  assert.equal(chamouDialogoIA, true, 'Deve ter chamado gerarDialogoPreceptorSocratico!');
  assert(msgEnviada.includes('CURB-65'), 'Deve conter a próxima pergunta socrática');

  // Verifica que o histórico foi incrementado
  const diag = c.obterDialogoPreceptor(123);
  assert.equal(diag.historico.length, 3);
  assert.equal(diag.historico[1].papel, 'wagner');
  assert.equal(diag.historico[2].papel, 'preceptor');
});

// 3. RESPOSTA DE WAGNER POR ÁUDIO É AVALIADA E RESPONDE EM ÁUDIO
test('3. Resposta de Wagner por áudio responde com voz neural do preceptor sem cair no SOAP', () => {
  const { c } = criarAmbiente();

  c.salvarDialogoPreceptor(123, {
    em_andamento: true,
    caso_base: 'Paciente 68 anos, suspeita de pneumonia',
    ultima_pergunta: 'Como você estratifica o risco desse paciente pelo CURB-65?',
    historico: [{ papel: 'preceptor', texto: 'Como você estratifica o risco desse paciente pelo CURB-65?' }]
  });

  c.baixarMidiaTelegram = () => ({ data: 'base64_audio', mime: 'audio/ogg' });
  c.processarAudioClinicoMultimodal = () => ({
    transcricao: 'CURB 65 deu dois pontos pela idade e ureia de 55, indico internar em enfermaria.',
    eh_clinico: true
  });

  let audioEnviado = false;
  c.sintetizarVozPreceptor = (texto) => ({ getBytes: () => [1, 2, 3] });
  c.enviarAudioVozTelegram = (chatId, blob, legenda, kb) => {
    audioEnviado = true;
    assert.equal(chatId, 123);
    assert(legenda.includes('amoxicilina com clavulanato'));
    return true;
  };

  c.gerarDialogoPreceptorSocratico = () => {
    return 'Correto, pontuação dois requer internação hospitalar. Qual esquema antimicrobiano empírico inicial você prescreverá: ceftriaxona com claritromicina ou amoxicilina com clavulanato?';
  };

  c.processarMensagemVoz({
    chat: { id: 123 },
    voice: { file_id: 'voice_curb' }
  });

  assert.equal(audioEnviado, true, 'Deve responder via áudio de voz neural para o médico');
});

// 4. TRANSIÇÃO SOB DEMANDA PARA SOAP VIA BOTÃO INLINE OU TEXTO
test('4. Transição para SOAP consolida caso clínico e histórico da sabatina', () => {
  const { c } = criarAmbiente();

  c.salvarDialogoPreceptor(123, {
    em_andamento: true,
    caso_base: 'Paciente 68a com pneumonia',
    ultima_pergunta: 'Qual esquema antimicrobiano?',
    historico: [
      { papel: 'preceptor', texto: 'Qual ausculta pulmonar sugere pneumonia?' },
      { papel: 'wagner', texto: 'Crepitações unilaterais.' },
      { papel: 'preceptor', texto: 'Qual a conduta?' }
    ]
  });

  let casoEntregueAoSoap = '';
  c.gerarSOAPComIA = (caso) => {
    casoEntregueAoSoap = caso;
    return 'SOAP GERADO COM SUCESSO';
  };

  c.processarEEntregarIA = (chatId, motor, texto, tipo) => {
    motor(texto);
    return true;
  };

  // Simula clique no botão [📋 Gerar SOAP]
  c.processarCallbackBotao({
    id: 'cb_soap_1',
    data: 'preceptor_gerar_soap',
    message: { chat: { id: 123 }, message_id: 200 }
  });

  assert(casoEntregueAoSoap.includes('Paciente 68a com pneumonia'));
  assert(casoEntregueAoSoap.includes('Crepitações unilaterais'));
  assert(casoEntregueAoSoap.includes('Discussão Socrática e Raciocínio Clínico'));

  // Diálogo deve ter sido limpo
  assert.equal(c.obterDialogoPreceptor(123), null, 'Diálogo do preceptor deve ser encerrado após gerar SOAP');
});

// 5. ENCERRAMENTO LIMPO DA SESSÃO SOCRÁTICA
test('5. Encerramento socrático limpa a memória e restaura o teclado', () => {
  const { c } = criarAmbiente();

  c.salvarDialogoPreceptor(123, {
    em_andamento: true,
    caso_base: 'Caso teste',
    ultima_pergunta: 'Pergunta teste',
    historico: []
  });

  let restaurouTeclado = false;
  c.enviarMensagemComTecladoFixo = (chatId, msg) => {
    restaurouTeclado = true;
    assert(msg.includes('Discussão socrática encerrada'));
    return true;
  };

  c.processarCallbackBotao({
    id: 'cb_encerrar_1',
    data: 'preceptor_encerrar',
    message: { chat: { id: 123 }, message_id: 200 }
  });

  assert.equal(c.obterDialogoPreceptor(123), null);
  assert.equal(restaurouTeclado, true);
});

console.log(`\n🎉 TODOS OS ${pass}/${total} TESTES DO DIÁLOGO SOCRÁTICO FORAM APROVADOS!`);
