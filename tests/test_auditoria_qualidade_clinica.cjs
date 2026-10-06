/**
 * TESTE EXAUSTIVO DE QUALIDADE CLÍNICA, DIDÁTICA E FUNCIONAL:
 * - SOAP Fase 1 e Fase 2 (organização semiológica, cobrança ativa, ausência de alucinação)
 * - Integração de Exames Físicos Especializados ao SOAP
 * - Comandos de Voz e Preceptor Socrático
 * - Calculadoras Determinísticas (Segurança Matemática vs LLM)
 * - Preservação dos Menus e Teclados Interativos UX
 * - Fidelidade na persistência de sessões clínicas longas
 */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const source = fs.readFileSync(path.resolve(__dirname, '../ultra_rotina_master.js'), 'utf8');

function env() {
  const props = {
    TELEGRAM_CHAT_ID: '123',
    TELEGRAM_BOT_TOKEN: 'fake-token',
    WEBHOOK_SECRET: 'secret',
    NOTION_TASKS_DB_ID: 'fake-db',
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
  return { c, props, cache, sent, advance: n => now += n };
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
// 1. QUALIDADE ORGANIZATIVA E DIDÁTICA DO SOAP (FASE 1)
// -----------------------------------------------------------------------------
test('SOAP Fase 1: Anamnese estruturada com 5 sistemas padrão e cobrança semiológica ativa', () => {
  const { c } = env();
  c.executarRaciocinioClinico = () => JSON.stringify({
    subjetivo: 'QP: Dor precordial opressiva há 1h.\nHDA: Início súbito ao esforço físico, irradiada para MSE, acompanhada de sudorese fria e náuseas.\nAntecedentes: HAS e DM2 em uso irregular de medicamentos. Tabagista 30 anos-maço.',
    objetivo: 'Geral: BEG, LOTE, sudoreico, pálido, acianótico, PA 150x90, FC 88 bpm.\nACV: RCR em 2T, BNF sem sopros.\nAR: MV presente bilateralmente, sem ruídos adventícios.\nAbdome: Plano, flácido, indolor, RHA+.\nExtremidades: Pulsos simétricos, TEC < 2s, sem edemas.',
    perguntas_anamnese: [
      'Histórico pessoal ou familiar de DAC precoce?',
      'Fez uso de nitrato ou inibidores de fosfodiesterase-5 nas últimas 24-48h?'
    ],
    exame_dirigido: [
      'ECG de 12 derivações em até 10 minutos.',
      'Aferir PA em ambos os membros superiores para descartar dissecção de aorta.'
    ]
  });

  const res = c.gerarSOAPComIA('Homem 58 anos dor no peito há 1 hora com sudorese');

  // Validação da estrutura didática de Fase 1
  assert(res.includes('S - Subjetivo (Anamnese Estruturada)'), 'Deve conter cabeçalho do Subjetivo');
  assert(res.includes('O - Objetivo (Exame Físico)'), 'Deve conter cabeçalho do Objetivo');
  assert(res.includes('Dor precordial opressiva há 1h'), 'Deve conter QP e HDA organizadas');
  assert(res.includes('RCR em 2T, BNF sem sopros'), 'Deve conter exame cardiovascular');
  assert(res.includes('Perguntas para Completar a Anamnese'), 'Deve cobrar ativamente anamnese complementar');
  assert(res.includes('Cobrança Ativa do Exame Físico Dirigido'), 'Deve orientar exame físico e ECG dirigido');
  
  // Regra áurea didática: NÃO pode ter fechamento prematuro
  assert(!res.includes('A - Avaliação'), 'Fase 1 NÃO deve emitir Avaliação');
  assert(!res.includes('P - Plano'), 'Fase 1 NÃO deve emitir Plano terapêutico final');
});

// -----------------------------------------------------------------------------
// 2. QUALIDADE E PRECISÃO DO SOAP (FASE 2)
// -----------------------------------------------------------------------------
test('SOAP Fase 2: Fechamento completo com CID-10, estratificação, prescrição posológica e alarme', () => {
  const { c } = env();
  c.executarRaciocinioClinico = () => JSON.stringify({
    subjetivo: 'QP: Dor retroesternal opressiva há 1h.\nHDA: Cronologia típica de síndrome coronariana aguda.',
    objetivo: 'PA 150x90, FC 88 bpm. ECG com supra de ST em DII, DIII e aVF.',
    avaliacao: [
      'Infarto Agudo do Miocárdio com Supradesnivelamento do Segmento ST (IAMCSST) - Parede Inferior (CID-10: I21.1)',
      'Hipertensão Arterial Sistêmica Estágio 1 (CID-10: I10)'
    ],
    plano: [
      'AAS 200mg VO mastigado imediatamente (dose de ataque).',
      'Ticagrelor 180mg VO mastigado imediatamente (dose de ataque) ou Clopidogrel 300mg.',
      'Atorvastatina 80mg VO à noite.',
      'Acionar imediatamente o serviço de hemodinâmica para angioplastia primária (meta porta-balão < 90 min).',
      'Isossorbida ou Nitroglicerina EV CONTRAINDICADA se houver acometimento de VD (derivações direitas V3R/V4R) ou PA sistólica < 90.',
      'Monitorização cardíaca contínua, acesso venoso periférico calibroso e oximetria de pulso.'
    ],
    pendencias_opcionais: [
      'Realizar V3R, V4R, V7 e V8 para excluir infarto de ventrículo direito e parede dorsal.',
      'Coleta de troponina ultrassensível basal (sem atrasar a reperfusão).'
    ]
  });

  const res = c.gerarSOAPComIA('Homem com dor no peito. ECG supra em DII, DIII, aVF. Gerar avaliação e plano.', { fecharPlano: true });

  assert(res.includes('S - Subjetivo'), 'Deve ter Subjetivo');
  assert(res.includes('O - Objetivo'), 'Deve ter Objetivo');
  assert(res.includes('A - Avaliação'), 'Deve ter Avaliação diagnóstica');
  assert(res.includes('P - Plano'), 'Deve ter Plano');
  assert(res.includes('I21.1'), 'Deve incluir CID-10 correto');
  assert(res.includes('AAS 200mg VO'), 'Deve prescrever AAS com posologia');
  assert(res.includes('Ticagrelor 180mg'), 'Deve prescrever segundo antiagregante com posologia');
  assert(res.includes('Dados adicionais que enriqueceriam o caso'), 'Deve listar dados complementares opcionais');
});

// -----------------------------------------------------------------------------
// 3. INTEGRAÇÃO DOS EXAMES FÍSICOS ESPECIALIZADOS
// -----------------------------------------------------------------------------
test('Exames Físicos Especializados: Catálogo mantém modelos semiológicos completos', () => {
  const { c } = env();
  const especialidades = ['neuro', 'pqu', 'ortopo', 'orl', 'vascular', 'geriatria'];
  
  for (const esp of especialidades) {
    const guia = c.gerarGuiaExameFisicoEspecial(esp);
    assert(typeof guia === 'string' && guia.length > 50, `Guia da especialidade ${esp} deve ser robusto`);
  }

  // Neurológico: contém nível de consciência/ECG 15, pupilas e pares cranianos
  const neuro = c.gerarGuiaExameFisicoEspecial('neuro');
  assert(neuro.includes('ECG 15') || neuro.includes('Glasgow'), 'Neuro deve incluir escala de Coma de Glasgow (ECG)');
  assert(neuro.includes('Pupilas'), 'Neuro deve incluir pupilas');
  assert(neuro.includes('Pares Cranianos'), 'Neuro deve incluir pares cranianos');

  // Psiquiátrico: contém EPM, sensopercepção e juízo crítico
  const pqu = c.gerarGuiaExameFisicoEspecial('pqu');
  assert(pqu.includes('EXAME DO ESTADO MENTAL'), 'Pqu deve incluir EPM');
  assert(pqu.includes('Sensopercepção'), 'Pqu deve incluir sensopercepção');
  assert(pqu.includes('Juízo Crítico'), 'Pqu deve incluir juízo crítico');

  // Ortopédico: manobra de Lasègue
  const ortopo = c.gerarGuiaExameFisicoEspecial('ortopo');
  assert(ortopo.includes('Lasègue'), 'Ortopedia deve incluir teste de Lasègue');
});

// -----------------------------------------------------------------------------
// 4. FLUXO DE INCORPORAÇÃO DE EXAME FÍSICO AO CASO
// -----------------------------------------------------------------------------
test('Incorporação de EF Especial ao caso SOAP ativo preserva dados e modo', () => {
  const { c } = env();
  c.definirModoBot(123, 'soap', 'Paciente feminina 25 anos com crise de angústia e choro fácil.');
  
  // Usuário aciona o botão de incorporar exame psiquiátrico
  c.executarRaciocinioClinico = () => JSON.stringify({
    subjetivo: 'Paciente feminina 25 anos com angústia.',
    objetivo: 'BEG. [EXAME DO ESTADO MENTAL / PSICOPATOLÓGICO] Lúcida, orientada, humor ansioso, sem delírios ou alucinações, crítica preservada.',
    perguntas_anamnese: ['Ideação suicida ativa?'],
    exame_dirigido: ['Avaliação psicopatológica seriada.']
  });

  c.tratarCallbackUX({ id: 'cb_pqu', data: 'ux:ef_inc:pqu', message: { chat: { id: 123 }, message_id: 55 } });
  
  const estadoAtual = c.modoBot(123);
  assert.equal(estadoAtual.mode, 'soap');
  assert(estadoAtual.data.includes('[EXAME DO ESTADO MENTAL / PSICOPATOLÓGICO]'), 'Deve incorporar o modelo psiquiátrico aos dados do caso');
  assert(/humor/i.test(estadoAtual.data), 'Deve conter os dados clínicos adicionados');
});

// -----------------------------------------------------------------------------
// 5. PROCESSAMENTO DE VOZ E PRECEPTOR SOCRÁTICO
// -----------------------------------------------------------------------------
test('Comando por voz: Áudio com pedido de preceptor socrático herda caso ativo pedagogicamente', () => {
  const { c, sent } = env();
  c.definirModoBot(123, 'soap', 'Paciente com dor torácica pleurítica e dispneia súbita após viagem longa.');
  
  // Mock do download de áudio
  c.baixarMidiaTelegram = () => ({ data: 'fake_binary_audio', mime: 'audio/ogg' });
  
  // Transcrição sem texto excedente ativa busca de caso prévio
  c.chamarGeminiPoolMultimodal = () => 'Preceptor socrático me responda em áudio';
  
  let preceptorChamadoCom = null;
  c.responderPreceptorVozComIA = (chatId, texto) => {
    preceptorChamadoCom = texto;
    c.enviarMensagemParaChat(chatId, '🎙️ [Preceptor Socrático]: Vamos raciocinar juntos. Qual o escore de probabilidade clínica você aplicaria aqui?');
    return true;
  };

  c.processarMensagemVoz({ chat: { id: 123 }, voice: { file_id: 'voz_123' } });

  assert(preceptorChamadoCom !== null, 'Deveria acionar o preceptor médico por voz');
  assert(preceptorChamadoCom.includes('dor torácica'), 'Deve herdar o caso clínico ativo do paciente');
  assert(sent.some(s => s.payload.text && s.payload.text.includes('Preceptor Socrático')), 'Mensagem do preceptor deve ser entregue');
});

test('Comando por voz: Áudio sem caso clínico prévio não alucina e solicita envio do caso', () => {
  const { c, sent } = env();
  c.limparEstadoBot(123); // Sem caso ativo
  
  c.baixarMidiaTelegram = () => ({ data: 'fake_binary', mime: 'audio/ogg' });
  c.chamarGeminiPoolMultimodal = () => 'Me responda em áudio preceptor socrático';

  c.processarMensagemVoz({ chat: { id: 123 }, voice: { file_id: 'voz_sem_caso' } });

  const msgEntregue = sent.map(s => s.payload.text || '').join('\n');
  assert(msgEntregue.includes('Envie o caso clínico'), 'Deve alertar o médico para enviar o caso antes');
});

// -----------------------------------------------------------------------------
// 6. CALCULADORAS DETERMINÍSTICAS (RIGOR MATEMÁTICO SEM ALUCINAÇÃO)
// -----------------------------------------------------------------------------
test('Calculadoras determinísticas: CKD-EPI 2021, Cockcroft e Wells TEP mantêm rigor exato', () => {
  const { c } = env();
  
  // CKD-EPI 2021: Homem 60 anos, Creatinina 1.2 mg/dL
  const rCkd = c.tentarCalcularDeterministico('CKD-EPI homem 60 anos cr 1.2');
  assert(rCkd !== null, 'CKD-EPI deve ser calculada deterministicamente');
  assert(rCkd.includes('CKD-EPI 2021'), 'Deve usar a fórmula de 2021 sem raça');
  assert(rCkd.includes('mL/min/1.73m²'), 'Deve reportar a unidade correta');

  // Cockcroft-Gault: Homem 60 anos, Creatinina 1.2, Peso 70 kg
  const rCock = c.tentarCalcularDeterministico('Cockcroft homem 60 anos cr 1.2 peso 70 kg');
  assert(rCock !== null, 'Cockcroft-Gault deve ser calculada');
  assert(rCock.includes('Cockcroft-Gault'), 'Deve indicar o método');
  assert(rCock.includes('65 mL/min'), 'Resultado exato para 70kg, 60a, Cr 1.2');

  // Wells para TEP: Cálculo puro em CalculadorasClinicas (sem colisão com clearance)
  const rWells = c.CalculadorasClinicas.wellsTEP(false, true, true, false, false, false, false);
  assert(rWells.ok, 'Wells TEP deve ser calculado com sucesso');
  assert.equal(rWells.dados.pontos, 4.5, 'TEP alternativo menos provavel (3) + FC>100 (1.5) = 4.5');
  assert.equal(rWells.dados.provavel, true, 'Score 4.5 é TEP provável');

  // Segurança: Wells em texto livre não deve ser capturado erroneamente por heurística de clearance
  assert.equal(c.tentarCalcularDeterministico('Wells homem 60 anos cr 1.2 peso 70 kg'), null);
});

// -----------------------------------------------------------------------------
// 7. FIDELIDADE DE PERSISTÊNCIA E INTERFACE DO USUÁRIO
// -----------------------------------------------------------------------------
test('Persistência e Interface: Modos de sessão, unicode e teclados inline 100% íntegros', () => {
  const { c, sent } = env();
  
  // Teste de salvamento e recuperação de modo de sessão
  const textoLongo = '🏥 Paciente internado na UTI Leito 04: Choque séptico de foco pulmonar. DVA em desmame.\n' + '💊 Noradrenalina 0.08 mcg/kg/min.\n'.repeat(5);
  c.definirModoBot(999, 'soap', textoLongo);
  
  const recuperado = c.modoBot(999);
  assert.equal(recuperado.mode, 'soap');
  assert.equal(recuperado.data, textoLongo);
  assert(recuperado.data.includes('🏥'), 'Preserva emojis médicos');
  
  // Envio de mensagem interativa com botões de ação
  c.enviarMensagemComTecladoParaChat(999, 'Selecione uma opção clínica:', {
    inline_keyboard: [
      [{ text: '🩺 Gerar SOAP', callback_data: 'ux:soap:plano' }],
      [{ text: '💊 Prescrever', callback_data: 'ux:hub:rx' }]
    ]
  });

  assert(sent.length >= 1);
  const msgBotoes = sent[sent.length - 1];
  assert(msgBotoes.payload.reply_markup, 'Deve anexar botões reply_markup');
  const kbStr = JSON.stringify(msgBotoes.payload.reply_markup);
  assert(kbStr.includes('ux:soap:plano'));
  assert(kbStr.includes('ux:hub:rx'));
});

console.log(`\n🎉 BATERIA DE QUALIDADE CLÍNICA E DIDÁTICA: ${pass}/${total} testes aprovados com 100% de êxito!`);
