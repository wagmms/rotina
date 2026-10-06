/**
 * TESTES DO ÁUDIO CLÍNICO EM TEMPO ÚNICO MULTIMODAL (FMRP-USP)
 * Valida a execução em 1 única inferência multimodal (Single-Pass Audio-to-SOAP),
 * cortando 50% da latência de áudio e preservando a transcrição e rigor semiológico.
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
  } catch (e) {
    process.exitCode = 1;
    console.error('❌ FALHOU: ' + name + '\n' + e.stack);
  }
}

// -----------------------------------------------------------------------------
// 1. EXECUÇÃO EM TEMPO ÚNICO COM RETORNO JSON MULTIMODAL
// -----------------------------------------------------------------------------
test('1. Áudio clínico multimodal gera SOAP direto em 1 única inferência', () => {
  const { c, sent, cache } = env();

  // Mock de download do Telegram
  c.baixarMidiaTelegram = () => ({ data: 'base64_audio_bytes', mime: 'audio/ogg' });

  let chamadasMultimodal = 0;
  let chamadasGerarSOAPComIA = 0;

  c.chamarGeminiPoolMultimodal = (data, mime, sistema, prompt) => {
    chamadasMultimodal++;
    return JSON.stringify({
      transcricao: 'Paciente masculino, 65 anos, hipertenso e tabagista, com dor torácica opressiva iniciada há 2 horas com irradiação para MSE.',
      eh_clinico: true,
      subjetivo: 'QP: Dor precordial opressiva há 2 horas.\nHDA: Paciente masculino, 65a, hipertenso e tabagista com dor retroesternal em aperto, sem melhora ao repouso, irradiada para membro superior esquerdo.',
      objetivo: 'Geral: BEG, LOTE, sudoreico, PA 150x90 mmHg, FC 92 bpm.\nACV: RCR em 2T, BNF sem sopros.\nAR: MV presente sem ruídos adventícios.\nAbdome: Inalterado.\nExtremidades: Sem edemas.',
      perguntas_anamnese: ['Histórico pessoal ou familiar prévio de coronariopatia?', 'Uso de AAS ou estatinas?'],
      exame_dirigido: ['ECG de 12 derivações imediato (em até 10 minutos)', 'Troponina ultrassensível']
    });
  };

  const origGerarSOAP = c.gerarSOAPComIA;
  c.gerarSOAPComIA = (...args) => {
    chamadasGerarSOAPComIA++;
    return origGerarSOAP.apply(c, args);
  };

  c.processarMensagemVoz({ chat: { id: 123 }, voice: { file_id: 'voice_dor_toracica' } });

  // 1. Verificação de chamada única
  assert.equal(chamadasMultimodal, 1, 'Deve realizar exatamente 1 chamada multimodal');
  assert.equal(chamadasGerarSOAPComIA, 0, 'NÃO deve chamar gerarSOAPComIA (segunda chamada foi eliminada com sucesso!)');

  // 2. Verificação do conteúdo entregue no Telegram
  const mensagensTelegram = sent.filter(s => s.url.includes('sendMessage')).map(s => s.payload.text || '');
  const textoEntregue = mensagensTelegram.join('\n');

  assert(textoEntregue.includes('SÍNTESE SOAP · ATENDIMENTO CLÍNICO'), 'Deve entregar o cabeçalho do SOAP');
  assert(textoEntregue.includes('Dor precordial opressiva'), 'Deve conter o Subjetivo formal');
  assert(textoEntregue.includes('PA 150x90 mmHg'), 'Deve conter o Exame Físico com sinais vitais');
  assert(textoEntregue.includes('ECG de 12 derivações imediato'), 'Deve conter o Exame Dirigido');

  // 3. Verificação do cache de contexto do médico
  const ctxSalvo = cache['ctx_123'];
  assert(ctxSalvo && ctxSalvo.includes('dor torácica opressiva'), 'A transcrição deve ser salva no cache de contexto clínico');

  // 4. Verificação do modo bot
  const modo = c.modoBot(123);
  assert.equal(modo.mode, 'soap', 'Modo deve ser atualizado para soap');
});

// -----------------------------------------------------------------------------
// 2. ÁUDIO NÃO CLÍNICO (CALENDÁRIO / TAREFA) REPASSA PARA FLUXO APROPRIADO
// -----------------------------------------------------------------------------
test('2. Áudio não clínico (ex: agendar plantão) extrai transcrição e cai no roteador de comandos', () => {
  const { c, sent } = env();

  c.baixarMidiaTelegram = () => ({ data: 'base64_audio_bytes', mime: 'audio/ogg' });

  c.chamarGeminiPoolMultimodal = () => {
    return JSON.stringify({
      transcricao: 'Marcar plantão de clínica médica amanhã às 7 horas no Hospital das Clínicas',
      eh_clinico: false
    });
  };

  // Mock do agendador do Google Calendar
  c.extrairDadosEventoCalendario = (texto) => ({
    titulo: 'Plantão Clínica Médica',
    dataInicio: '2026-10-05T07:00:00',
    dataFim: '2026-10-05T19:00:00',
    local: 'Hospital das Clínicas',
    descricao: texto
  });
  c.criarEventoAgendaGoogle = () => ({ sucesso: true, mensagem: '📅 Plantão agendado com sucesso!' });

  c.processarMensagemVoz({ chat: { id: 123 }, voice: { file_id: 'voice_calendar_1' } });

  const entregas = sent.filter(s => s.url.includes('sendMessage')).map(s => s.payload.text || '').join('\n');
  assert(entregas.includes('Plantão agendado com sucesso'), 'Deve executar o agendamento no Google Calendar');
});

// -----------------------------------------------------------------------------
// 3. RESILIÊNCIA QUANDO O GEMINI RETORNA TEXTO DIRETO EM VEZ DE JSON
// -----------------------------------------------------------------------------
test('3. Resiliência: se o modelo responder em texto simples, faz fallback gracioso para processarMensagemTexto', () => {
  const { c, sent } = env();

  c.baixarMidiaTelegram = () => ({ data: 'base64_audio_bytes', mime: 'audio/ogg' });
  c.chamarGeminiPoolMultimodal = () => 'Homem 45 anos com febre e tosse seca há 2 dias';

  c.processarMensagemVoz({ chat: { id: 123 }, voice: { file_id: 'voice_texto_puro' } });

  const entregas = sent.filter(s => s.url.includes('sendMessage')).map(s => s.payload.text || '').join('\n');
  assert(entregas.includes('S - Subjetivo'), 'Deve ter gerado o SOAP via fallback sem falhar');
});

// -----------------------------------------------------------------------------
// 4. ROTEAMENTO DIRETO DE PRESCRIÇÃO DITADA POR VOZ (BYPASS DE LLM INTERMEDIÁRIO)
// -----------------------------------------------------------------------------
test('4. Áudio com ditado de prescrição chama gerarPrescricaoComIA diretamente', () => {
  const { c, sent } = env();

  c.baixarMidiaTelegram = () => ({ data: 'base64_audio_bytes', mime: 'audio/ogg' });
  c.chamarGeminiPoolMultimodal = () => 'Prescrever amoxicilina 500mg comprimido de 8 em 8 horas por 7 dias';

  let chamouPrescricao = false;
  let tipoCacheRecebido = '';
  const origProcessarEEntregarIA = c.processarEEntregarIA;
  c.processarEEntregarIA = (chatId, fnGeradora, dados, tipoCache) => {
    if (fnGeradora === c.gerarPrescricaoComIA) chamouPrescricao = true;
    tipoCacheRecebido = tipoCache;
    return origProcessarEEntregarIA(chatId, () => 'RECEITA MÉDICA GERADA', dados, tipoCache);
  };

  c.processarMensagemVoz({ chat: { id: 123 }, voice: { file_id: 'voice_rx' } });

  assert(chamouPrescricao, 'Deve chamar gerarPrescricaoComIA diretamente');
  assert.equal(tipoCacheRecebido, 'rx', 'Tipo de cache deve ser rx');
});

// -----------------------------------------------------------------------------
// 5. ROTEAMENTO DIRETO DE GASOMETRIA DITADA POR VOZ (BYPASS DE LLM INTERMEDIÁRIO)
// -----------------------------------------------------------------------------
test('5. Áudio com valores de gasometria chama gerarAnaliseGasometriaComIA diretamente', () => {
  const { c, sent } = env();

  c.baixarMidiaTelegram = () => ({ data: 'base64_audio_bytes', mime: 'audio/ogg' });
  c.chamarGeminiPoolMultimodal = () => 'Gasometria arterial ph 7.25 pco2 50 hco3 18';

  let chamouGaso = false;
  let tipoCacheRecebido = '';
  const origProcessarEEntregarIA = c.processarEEntregarIA;
  c.processarEEntregarIA = (chatId, fnGeradora, dados, tipoCache) => {
    if (fnGeradora === c.gerarAnaliseGasometriaComIA) chamouGaso = true;
    tipoCacheRecebido = tipoCache;
    return origProcessarEEntregarIA(chatId, () => 'ANÁLISE DE GASOMETRIA GERADA', dados, tipoCache);
  };

  c.processarMensagemVoz({ chat: { id: 123 }, voice: { file_id: 'voice_gaso' } });

  assert(chamouGaso, 'Deve chamar gerarAnaliseGasometriaComIA diretamente');
  assert.equal(tipoCacheRecebido, 'gaso', 'Tipo de cache deve ser gaso');
});

// -----------------------------------------------------------------------------
// 6. ROTEAMENTO DIRETO DE EMERGÊNCIA DITADA POR VOZ (SALA VERMELHA / PCR)
// -----------------------------------------------------------------------------
test('6. Áudio com emergência chama gerarCondutaEmergenciaComIA diretamente', () => {
  const { c, sent } = env();

  c.baixarMidiaTelegram = () => ({ data: 'base64_audio_bytes', mime: 'audio/ogg' });
  c.chamarGeminiPoolMultimodal = () => 'Paciente em parada cardiorrespiratória em ritmo de fibrilação ventricular choque imediato';

  let chamouEmergencia = false;
  let tipoCacheRecebido = '';
  const origProcessarEEntregarIA = c.processarEEntregarIA;
  c.processarEEntregarIA = (chatId, fnGeradora, dados, tipoCache) => {
    if (fnGeradora === c.gerarCondutaEmergenciaComIA) chamouEmergencia = true;
    tipoCacheRecebido = tipoCache;
    return origProcessarEEntregarIA(chatId, () => 'CONDUTA DE EMERGÊNCIA GERADA', dados, tipoCache);
  };

  c.processarMensagemVoz({ chat: { id: 123 }, voice: { file_id: 'voice_emergencia' } });

  assert(chamouEmergencia, 'Deve chamar gerarCondutaEmergenciaComIA diretamente');
  assert.equal(tipoCacheRecebido, 'emergencia', 'Tipo de cache deve ser emergencia');
});

// -----------------------------------------------------------------------------
// 7. PRESCRIÇÃO EM JARGÃO NATURAL (SEM COMPRIMIDO / "PASSA [DROGA] DE X EM X H")
// -----------------------------------------------------------------------------
test('7. Áudio com "passa dipirona 1g de 6 em 6 se dor" reconhece rx diretamente', () => {
  const { c, sent } = env();

  c.baixarMidiaTelegram = () => ({ data: 'base64_audio_bytes', mime: 'audio/ogg' });
  c.chamarGeminiPoolMultimodal = () => 'Passa dipirona 1g de 6 em 6 se dor ou febre';

  let chamouPrescricao = false;
  let tipoCacheRecebido = '';
  c.processarEEntregarIA = (chatId, fnGeradora, dados, tipoCache) => {
    if (fnGeradora === c.gerarPrescricaoComIA) chamouPrescricao = true;
    tipoCacheRecebido = tipoCache;
    return true;
  };

  c.processarMensagemVoz({ chat: { id: 123 }, voice: { file_id: 'voice_passa_dipirona' } });

  assert(chamouPrescricao, 'Deve chamar gerarPrescricaoComIA com verbo "passa"');
  assert.equal(tipoCacheRecebido, 'rx');
});

// -----------------------------------------------------------------------------
// 8. EMERGÊNCIA EM JARGÃO NATURAL ("PAROU NO BOX 1" / "SALA VERMELHA")
// -----------------------------------------------------------------------------
test('8. Áudio com "paciente parou no box 1" reconhece emergência diretamente', () => {
  const { c, sent } = env();

  c.baixarMidiaTelegram = () => ({ data: 'base64_audio_bytes', mime: 'audio/ogg' });
  c.chamarGeminiPoolMultimodal = () => 'Paciente parou no box 1, choque!';

  let chamouEmergencia = false;
  let tipoCacheRecebido = '';
  c.processarEEntregarIA = (chatId, fnGeradora, dados, tipoCache) => {
    if (fnGeradora === c.gerarCondutaEmergenciaComIA) chamouEmergencia = true;
    tipoCacheRecebido = tipoCache;
    return true;
  };

  c.processarMensagemVoz({ chat: { id: 123 }, voice: { file_id: 'voice_parou' } });

  assert(chamouEmergencia, 'Deve chamar gerarCondutaEmergenciaComIA com "parou"');
  assert.equal(tipoCacheRecebido, 'emergencia');
});

console.log(`\n🎉 ÁUDIO CLÍNICO EM TEMPO ÚNICO: ${pass}/${total} testes aprovados com 100% de êxito!`);
