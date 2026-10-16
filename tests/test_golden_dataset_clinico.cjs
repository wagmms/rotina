/**
 * GOLDEN DATASET CLÍNICO (CI/CD DE AUDITORIA HOSPITALAR & BEIRA-LEITO)
 * =====================================================================
 * Suíte de casos clínicos críticos, imutáveis e extremos para garantir:
 * 1. Zero alucinação em situações de risco de vida (PCR, SRI, Choque, Anafilaxia).
 * 2. Assertividade matemática e farmacológica (PBW, ARDSNet, DVA, Tetos Pediátricos).
 * 3. Bloqueio de teratógenos, toxicidades (Triple Whammy, QTc) e salvaguardas ISMP.
 * 4. Isolamento estrito de paciente/leito (Prevenção de Context Bleed) e higienização LGPD.
 * 5. Disponibilidade do modo contingência determinístico offline.
 */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const source = require('./source_producao.cjs');

function env() {
  const props = {
    TELEGRAM_CHAT_ID: '123456',
    TELEGRAM_BOT_TOKEN: 'fake-token-golden',
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
    CacheService: { getScriptCache: () => ({ get: k => cache[k] ?? null, put: (k, v, ttl) => { cache[k] = String(v); }, remove: k => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }), getUserLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    HtmlService: { createHtmlOutput: body => ({ body }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: body => ({ body, setMimeType() { return this; } }) },
    ScriptApp: { getProjectTriggers: () => [] },
    UrlFetchApp: {
      fetch: (url, opts) => {
        let payload = {};
        try { payload = JSON.parse((opts && opts.payload) || '{}'); } catch (_) {}
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
    console.log(`  [OK] ${name}`);
  } catch (err) {
    console.error(`  [FALHA] ${name}:`, err.message);
    throw err;
  }
}

console.log('🩺 INICIANDO SUÍTE DO GOLDEN DATASET CLÍNICO (20 CASOS EXTREMOS)...');

// -----------------------------------------------------------------------------
// CASO 1: PCR ADULTO (ACLS 2025) - RITMOS CHOCÁVEIS & NÃO CHOCÁVEIS
// -----------------------------------------------------------------------------
test('Caso 01: PCR Adulto - Adrenalina 1mg a cada 3-5min, Amiodarona 300mg e 150mg', () => {
  const { c } = env();
  const pcr = c.IaLocalFallbackService.PROTOCOLOS_OFFLINE.PCR_ADULTO.gerarConduta({});
  assert(pcr.includes('Adrenalina 1 mg'), 'Deve indicar Adrenalina 1mg');
  assert(pcr.includes('Amiodarona 300 mg'), 'Deve indicar 1º bolus Amiodarona 300mg');
  assert(pcr.includes('Amiodarona 150 mg'), 'Deve indicar 2º bolus Amiodarona 150mg');
  assert(pcr.includes('100 a 120 compressões'), 'Taxa correta de compressão');
  assert(pcr.includes('5Hs e 5Ts'), 'Mencionar causas reversíveis 5Hs e 5Ts');
});

// -----------------------------------------------------------------------------
// CASO 2: PCR NA GESTANTE (ACLS MATERNO / DULE OBRIGATÓRIO)
// -----------------------------------------------------------------------------
test('Caso 02: PCR Gestante - DULE contínuo sem inclinar prancha e acesso venoso supra-diafragmático', () => {
  const { c } = env();
  const pcrG = c.IaLocalFallbackService.PROTOCOLOS_OFFLINE.PCR_GESTANTE.gerarConduta({});
  assert(pcrG.includes('DULE'), 'Deve indicar DULE');
  assert(pcrG.includes('acima do diafragma'), 'Acesso obrigatório acima do diafragma');
  assert(pcrG.includes('NUNCA inclinar a prancha') || pcrG.includes('decúbito dorsal horizontal'), 'Alerta contra inclinar prancha');
});

// -----------------------------------------------------------------------------
// CASO 3: CHOQUE SÉPTICO (SURVIVING SEPSIS 2021 / HORA-1)
// -----------------------------------------------------------------------------
test('Caso 03: Choque Séptico - Noradrenalina de 1ª linha, hemoculturas antes do ATB e lactato', () => {
  const { c } = env();
  const choque = c.IaLocalFallbackService.PROTOCOLOS_OFFLINE.CHOQUE_SEPTICO.gerarConduta({});
  assert(choque.includes('Noradrenalina'), 'Noradrenalina como vasopressor de primeira linha');
  assert(choque.includes('Hemoculturas') || choque.includes('hemoculturas'), 'Hemoculturas antes do antimicrobiano');
  assert(choque.includes('Lactato') || choque.includes('lactato'), 'Dosagem de lactato na Hora-1');
  assert(choque.includes('PAM >= 65') || choque.includes('65 mmHg'), 'Meta de PAM 65 mmHg');
});

// -----------------------------------------------------------------------------
// CASO 4: VENTILAÇÃO MECÂNICA PROTETORA (ARDSNET / DEVINE)
// -----------------------------------------------------------------------------
test('Caso 04: Ventilação Protetora - PBW e VT 6 mL/kg com proibição de peso real em obesos', () => {
  const { c } = env();
  // Homem de 180 cm: 50 + 0.91 * (180 - 152.4) = 50 + 25.116 = 75.1 kg
  const pbwMasc = c.CalculadorasClinicas.pesoPreditoEVolumeCorrente(180, 'm');
  assert(pbwMasc.ok, 'Cálculo de PBW deve ser executado');
  assert.equal(pbwMasc.dados.pesoPreditoKg, 75.1, 'PBW de homem 180cm deve ser 75.1 kg');
  assert.equal(pbwMasc.dados.volumeCorrente6mlKg, 451, 'VT 6ml/kg deve ser 451 mL');
  assert(pbwMasc.textoFormatado.includes('NUNCA programe o ventilador mecânico pelo peso real'), 'Alerta de ouro contra peso real');

  // Mulher de 165 cm: 45.5 + 0.91 * (165 - 152.4) = 45.5 + 11.466 = 57.0 kg
  const pbwFem = c.CalculadorasClinicas.pesoPreditoEVolumeCorrente(165, 'f');
  assert(pbwFem.ok, 'Cálculo de PBW feminino deve ser executado');
  assert.equal(pbwFem.dados.pesoPreditoKg, 57.0, 'PBW de mulher 165cm deve ser 57.0 kg');
  assert.equal(pbwFem.dados.volumeCorrente6mlKg, 342, 'VT 6ml/kg deve ser 342 mL');
});

// -----------------------------------------------------------------------------
// CASO 5: ANAFILAXIA (ADRENALINA IM NA COXA, NUNCA SC)
// -----------------------------------------------------------------------------
test('Caso 05: Anafilaxia - Adrenalina 0.3 a 0.5 mg IM vasto lateral da coxa', () => {
  const { c } = env();
  const ana = c.IaLocalFallbackService.PROTOCOLOS_OFFLINE.CHOQUE_ANAFILATICO.gerarConduta({});
  assert(ana.includes('ADRENALINA') && (ana.includes('IM') || ana.includes('INTRAMUSCULAR')), 'Deve indicar Adrenalina IM');
  assert(ana.includes('coxa') || ana.includes('vasto lateral'), 'Localização: face anterolateral da coxa');
  assert(ana.includes('1:1.000'), 'Concentração correta 1:1.000');
});

// -----------------------------------------------------------------------------
// CASO 6: PRÉ-ECLÂMPSIA GRAVE & ECLÂMPSIA (SULFATO DE MAGNÉSIO)
// -----------------------------------------------------------------------------
test('Caso 06: Pré-Eclâmpsia Grave - Sulfato de Magnésio e Gluconato de Cálcio 10%', () => {
  const { c } = env();
  const pe = c.IaLocalFallbackService.PROTOCOLOS_OFFLINE.PRE_ECLAMPSIA_ECLAMPSIA.gerarConduta({});
  assert(/Sulfato de Magn[ée]sio/i.test(pe), 'Droga de escolha para neuroproteção e prevenção de convulsão');
  assert(/Gluconato de C[áa]lcio 10%/i.test(pe), 'Antídoto obrigatório à beira-leito');
});

// -----------------------------------------------------------------------------
// CASO 7: SINERGISMO DE PROLONGAMENTO DE QTC (TORSADES DE POINTES)
// -----------------------------------------------------------------------------
test('Caso 07: Sinergismo de QTc - Amiodarona + Haloperidol + Ondansetrona detectado em RAM 0ms', () => {
  const { c } = env();
  const cross = c.executarCrossCheckSegurancaClinica(['amiodarona', 'haloperidol', 'ondansetrona'], 'Paciente internado');
  assert(cross.textoFormatado.includes('SINERGISMO DE QTc') || cross.textoFormatado.includes('Torsades de Pointes'), 'Deve acusar sinergismo de QTc');
});

// -----------------------------------------------------------------------------
// CASO 8: TRIPLE WHAMMY RENAL (IECA + DIURÉTICO + AINE)
// -----------------------------------------------------------------------------
test('Caso 08: Triple Whammy Renal - Enalapril + Furosemida + Ibuprofeno bloqueado com sugestão de analgésico seguro', () => {
  const { c } = env();
  const cross = c.executarCrossCheckSegurancaClinica(['enalapril', 'furosemida', 'ibuprofeno'], 'Dor aguda');
  assert(cross.textoFormatado.includes('TRIPLE WHAMMY RENAL'), 'Deve emitir alerta de Triple Whammy');
  assert(cross.textoFormatado.includes('Dipirona') || cross.textoFormatado.includes('Paracetamol'), 'Deve sugerir alternativa não nefrotóxica');
});

// -----------------------------------------------------------------------------
// CASO 9: AMPOLAS DUPLAS ISMP (GLUCONATO VS CLORETO DE CÁLCIO)
// -----------------------------------------------------------------------------
test('Caso 09: Ampolas Duplas ISMP - Gluconato de Cálcio 10% vs Cloreto de Cálcio 10% (3x potência)', () => {
  const { c } = env();
  const guia = c.formatarGuiaAmpolasDuplasISMP('gluconato de calcio');
  assert(guia.includes('Gluconato de Cálcio 10%'), 'Deve descrever Gluconato 10%');
  assert(guia.includes('Cloreto de Cálcio 10%'), 'Deve descrever Cloreto 10%');
  assert(guia.includes('3x mais'), 'Alerta da diferença de 3x em cálcio elementar');
});

// -----------------------------------------------------------------------------
// CASO 10: SALINA HIPERTÔNICA 3% & PREVENÇÃO DE MIELINÓLISE PONTINA
// -----------------------------------------------------------------------------
test('Caso 10: Salina 3% - Preparo 85 mL SF 0.9% + 15 mL NaCl 20% e limite de correção de Na+', () => {
  const { c } = env();
  const guia = c.formatarGuiaAmpolasDuplasISMP('salina hipertonica');
  assert(guia.includes('85 mL'), 'Preparo de 85 mL SF + 15 mL NaCl 20%');
  assert(guia.includes('mielinólise pontina') || guia.includes('desmielinização'), 'Alerta contra desmielinização osmótica');
});

// -----------------------------------------------------------------------------
// CASO 11: AMOXICILINA PEDIÁTRICA EM ALTA DOSE (OMA DE ALTO RISCO)
// -----------------------------------------------------------------------------
test('Caso 11: Amoxicilina 90 mg/kg/dia - Trava de teto e alerta de clavulanato excessivo', () => {
  const { c } = env();
  const med = c.CalculadorasClinicas.posologiaPediatrica(12, 'amoxicilina_clavulanato', { doseAlta: true });
  assert(med.ok, 'Deve calcular dose alta');
  assert.equal(med.dados.doseDiariaTotalMg, 1080, 'Dose diária deve ser 90 mg/kg/dia * 12 kg = 1080 mg/dia');
  assert(med.dados.orientacoes.includes('7:1') || med.dados.orientacoes.includes('14:1'), 'Deve orientar proporção correta para evitar diarreia');
});

// -----------------------------------------------------------------------------
// CASO 12: PARACETAMOL PEDIÁTRICO (TRAVA HEPATOTÓXICA)
// -----------------------------------------------------------------------------
test('Caso 12: Paracetamol Pediátrico - 1 gota/kg e teto de 75 mg/kg/dia ou 4000 mg/dia', () => {
  const { c } = env();
  const med = c.CalculadorasClinicas.posologiaPediatrica(15, 'paracetamol');
  assert(med.ok, 'Deve calcular dose de paracetamol');
  assert.equal(med.dados.gotasPorTomada, 15, '15 kg deve corresponder a 15 gotas');
  assert(med.textoFormatado.includes('4.000 mg') || med.dados.memoriaCalculo.includes('500 mg'), 'Alerta de teto hepatotóxico');
});

// -----------------------------------------------------------------------------
// CASO 13: IBUPROFENO PEDIÁTRICO (TETO EM MENORES DE 20 KG)
// -----------------------------------------------------------------------------
test('Caso 13: Ibuprofeno Pediátrico - Teto rigoroso de 200 mg (40 gotas) em crianças < 20 kg', () => {
  const { c } = env();
  const medPequena = c.CalculadorasClinicas.posologiaPediatrica(12, 'ibuprofeno');
  assert(medPequena.ok, 'Deve calcular dose de ibuprofeno');
  assert(medPequena.dados.memoriaCalculo.includes('máx 200 mg'), 'Teto de 200 mg para menor de 20 kg');

  const medMaior = c.CalculadorasClinicas.posologiaPediatrica(25, 'ibuprofeno');
  assert(medMaior.dados.memoriaCalculo.includes('máx 400 mg'), 'Teto de 400 mg para criança >= 20 kg');
});

// -----------------------------------------------------------------------------
// CASO 14: ISOLADOR DE LEITO & NOVO PACIENTE (COMANDO /leito E /novo_paciente)
// -----------------------------------------------------------------------------
test('Caso 14: Comandos /leito e /novo_paciente - Isolam e resetam sessão sem herança de dados', () => {
  const { c, cache } = env();

  // 1. Define leito 04
  c.rotearComandoTexto('/leito', '/leito 04', '123456');
  assert.equal(cache['leito_123456'], '04', 'Leito 04 deve ser salvo em cache');

  // 2. Simula dado salvo no contexto
  cache['ctx_123456'] = '/soap paciente leito 04 dados antigos';

  // 3. Executa /novo_paciente
  c.rotearComandoTexto('/novo_paciente', '/novo_paciente', '123456');
  assert.strictEqual(cache['ctx_123456'], undefined, 'Contexto clínico anterior deve ser apagado');
});

// -----------------------------------------------------------------------------
// CASO 15: POKA-YOKE CONTRA CONTEXT BLEED (TRANSIÇÃO PEDIATRIA ↔ ADULTO)
// -----------------------------------------------------------------------------
test('Caso 15: Poka-Yoke Context Bleed - Detecta transição brusca e descarta dados anteriores', () => {
  const { c, cache, sent } = env();

  // Salva contexto de um lactente de 8 kg
  cache['ctx_123456'] = '/soap lactente 8 meses 8kg febre e esforço respiratório';

  // Usuário envia caso de adulto sem barra
  c.rotearMensagemTelegram({
    chat: { id: '123456' },
    text: 'paciente idoso 75 anos dor no peito em aperto'
  });

  // O contexto anterior deve ter sido expurgado para evitar cálculo de dose de 8kg em idoso!
  assert.strictEqual(cache['ctx_123456'], undefined, 'Contexto do lactente não pode contaminar o idoso');
});

// -----------------------------------------------------------------------------
// CASO 16: HIGIENIZAÇÃO PÓS-PLANTÃO (COMANDO /limpar_plantao / LGPD)
// -----------------------------------------------------------------------------
test('Caso 16: Comando /limpar_plantao - Zera todos os identificadores em RAM', () => {
  const { c, cache } = env();
  cache['ctx_123456'] = 'dados clinicos sensiveis';
  cache['leito_123456'] = 'leito 12';
  cache['dvaw_123456'] = '70';

  c.rotearComandoTexto('/limpar_plantao', '/limpar_plantao', '123456');
  assert.strictEqual(cache['ctx_123456'], undefined, 'ctx limpo');
  assert.strictEqual(cache['leito_123456'], undefined, 'leito limpo');
  assert.strictEqual(cache['dvaw_123456'], undefined, 'peso limpo');
});

// -----------------------------------------------------------------------------
// CASO 17: MODO CONTINGÊNCIA OFFLINE-FROM-AI (/offline)
// -----------------------------------------------------------------------------
test('Caso 17: Comando /offline - Apresenta hub determinístico sem dependência de LLMs', () => {
  const { c, sent } = env();
  c.rotearComandoTexto('/offline', '/offline', '123456');
  const ultimoEnvio = sent[sent.length - 1];
  assert(ultimoEnvio, 'Deve enviar mensagem');
  assert(ultimoEnvio.payload.text.includes('MODO CONTINGÊNCIA DETERMINÍSTICA'), 'Deve anunciar modo contingência');
  assert(ultimoEnvio.payload.reply_markup.inline_keyboard.length >= 2, 'Deve fornecer botões diretos em RAM');
});

// -----------------------------------------------------------------------------
// CASO 18: SEGURANÇA EM LACTAÇÃO (HALE L1-L5 / MINISTÉRIO DA SAÚDE)
// -----------------------------------------------------------------------------
test('Caso 18: Lactação - Classificação correta de drogas compatíveis vs contraindicadas', () => {
  const { c } = env();
  const amoxi = c.consultarMedicamento('Amoxicilina');
  assert(amoxi !== null, 'Amoxicilina deve ser avaliada');
  assert.equal(amoxi.hale, 'L1', 'Amoxicilina é L1 (mais seguro)');
  assert.equal(amoxi.ms, 'VERDE', 'Amoxicilina é MS Verde (compatível)');
  assert.equal(amoxi.podeAmamentar, true, 'Amoxicilina pode amamentar');

  const amiodarona = c.consultarMedicamento('Amiodarona');
  assert(amiodarona !== null, 'Amiodarona deve ser avaliada');
  assert.equal(amiodarona.hale, 'L5', 'Amiodarona é L5 (contraindicada)');
  assert.equal(amiodarona.ms, 'VERMELHO', 'Amiodarona é MS Vermelho');
  assert.equal(amiodarona.podeAmamentar, false, 'Amiodarona contraindica amamentação');
});

// -----------------------------------------------------------------------------
// CASO 19: CRCL DUPLO (COCKCROFT-GAULT VS CKD-EPI 2021)
// -----------------------------------------------------------------------------
test('Caso 19: Função Renal - Cockcroft-Gault para ajuste posológico e CKD-EPI 2021 para estadiamento', () => {
  const { c } = env();
  // Homem, 70 anos, 70 kg, Cr 1.5
  // Cockcroft: ((140 - 70) * 70) / (72 * 1.5) = 4900 / 108 = 45.37 mL/min
  const cg = c.CalculadorasClinicas.cockcroftGault(1.5, 70, 70, false);
  assert(cg.ok, 'Cockcroft-Gault deve ser executado');
  assert.equal(Math.round(cg.dados.clearance), 45, 'ClCr deve ser ~45 mL/min');

  const ckd = c.CalculadorasClinicas.ckdEpi2021(1.5, 70, false);
  assert(ckd.ok, 'CKD-EPI 2021 deve ser executado');
  assert(ckd.dados.tfg > 0, 'TFG estimada válida');
});

// -----------------------------------------------------------------------------
// CASO 20: VIA AÉREA DIFÍCIL & SEQUÊNCIA RÁPIDA DE INTUBAÇÃO (SRI)
// -----------------------------------------------------------------------------
test('Caso 20: SRI / Intubação - Doses padronizadas (Cetamina, Etomidato, Succinilcolina, Rocurônio)', () => {
  const { c, sent } = env();
  c.tratarComandoSri('123456', '/sri 70');
  const envio = sent[sent.length - 1];
  assert(envio, 'Deve responder ao comando SRI');
  const txt = envio.payload.text;
  assert(txt.includes('Etomidato') || txt.includes('Cetamina'), 'Indutores contemplados');
  assert(txt.includes('Succinilcolina') || txt.includes('Rocurônio'), 'Bloqueadores neuromusculares contemplados');
  assert(txt.includes('SRI / IOT') || txt.includes('SALA VERMELHA'), 'Cabeçalho e protocolo padrão-ouro');
});

console.log(`\n🎉 SUÍTE DO GOLDEN DATASET CONCLUÍDA: ${pass}/${total} CASOS CLÍNICOS APROVADOS COM 100% DE ÊXITO!`);
