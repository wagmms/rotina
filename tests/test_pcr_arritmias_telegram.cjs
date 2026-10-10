/**
 * ==============================================================================
 * ULTRA ROTINA · SUÍTE DE TESTES DEFENSIVOS E COBERTURA AUTOMATIZADA
 * PROTOCOLOS DE PCR (ACLS) & ARRITMIAS CARDÍACAS NO TELEGRAM
 * ==============================================================================
 * Cobertura e Auditoria Estrita:
 * 1. Comando /pcr e /acls sem argumentos (guia geral e seletores de ritmo inline)
 * 2. Comando /pcr com argumento chocável (/pcr chocavel, /pcr tv, /pcr fv) e atalhos 1-toque
 * 3. Comando /pcr não chocável (/pcr nao chocavel, /pcr aesp, /pcr assistolia, linha reta, 5Hs/5Ts)
 * 4. Callbacks interativos de PCR: pcr_chocavel, pcr_naochocavel, pcr_droga_adrena,
 *    pcr_droga_amiodarona, pcr_ciclo_2min, pcr_5hs_5ts, pcr_pos_rce
 * 5. Comandos de Arritmias Cardíacas: /arritmia, /arritmia instavel, /taquiarritmia,
 *    /taquicardia tsv, /taquiarritmia tv, /bradiarritmia, /bradicardia
 * 6. Callbacks inline de arritmias: arritmia_instavel, arritmia_tsv, arritmia_tv,
 *    arritmia_fa, arritmia_bradi
 * 7. Integração no menu Sala Vermelha via callback ux:emerg:arritmia
 * 8. Edge cases defensivos: variações de caixa (case-insensitive), espaços extras e resiliência
 * ==============================================================================
 */

process.env.NODE_ENV = 'test';
const assert = require('assert');
const runtime = require('../server/runtime.js');

async function testPcrArritmiasTelegram() {
  console.log('======================================================================');
  console.log('🔍 INICIANDO BATERIA DE TESTES DE QA: PCR (ACLS) & ARRITMIAS CARDÍACAS');
  console.log('======================================================================\n');

  const ctx = runtime.ctx;
  const chatId = ctx.ConfigService.get('TELEGRAM_CHAT_ID') || '1771571035';

  // Sistema de captura defensiva de mensagens e callbacks
  let mensagensEnviadas = [];
  let callbacksRespondidos = [];
  let postsTelegram = [];

  ctx.enviarMensagemParaChat = (id, texto) => {
    mensagensEnviadas.push({ metodo: 'enviarMensagemParaChat', id, texto: String(texto || '') });
    return true;
  };

  ctx.enviarMensagemComTecladoParaChat = (id, texto, kb) => {
    mensagensEnviadas.push({ metodo: 'enviarMensagemComTecladoParaChat', id, texto: String(texto || ''), kb });
    return true;
  };

  ctx.responderCallbackTelegram = (cbId, texto) => {
    callbacksRespondidos.push({ id: cbId, texto: String(texto || '') });
    return true;
  };

  ctx.executarPostTelegram = (url, payload) => {
    postsTelegram.push({ url, payload });
    if (payload && payload.text) {
      mensagensEnviadas.push({ metodo: 'executarPostTelegram', id: payload.chat_id, texto: String(payload.text), kb: payload.reply_markup });
    }
    return true;
  };

  function limparCaptura() {
    mensagensEnviadas = [];
    callbacksRespondidos = [];
    postsTelegram = [];
  }

  function obterUltimaMensagem() {
    assert.ok(mensagensEnviadas.length > 0, 'Deve ter enviado ao menos uma mensagem');
    return mensagensEnviadas[mensagensEnviadas.length - 1];
  }

  function extrairCallbacksDoTeclado(kb) {
    if (!kb || !kb.inline_keyboard) return [];
    const lista = [];
    kb.inline_keyboard.forEach(linha => {
      linha.forEach(btn => {
        if (btn.callback_data) lista.push(btn.callback_data);
      });
    });
    return lista;
  }

  // -----------------------------------------------------------------------------
  // [CENÁRIO A] COMANDO /pcr E /acls SEM ARGUMENTOS
  // -----------------------------------------------------------------------------
  console.log('📌 [Cenário A] Testando comando /pcr e /acls sem argumentos...');
  
  const comandosGerais = ['/pcr', '/acls', '/pcr    ', '/ACLS'];
  for (const cmd of comandosGerais) {
    limparCaptura();
    ctx.processarMensagemTexto({ chat: { id: chatId }, text: cmd });
    const msg = obterUltimaMensagem();

    assert.ok(
      msg.texto.includes('PARADA CARDIORRESPIRATÓRIA') || msg.texto.includes('PCR ADULTO'),
      `Comando ${cmd} deve exibir título de Parada Cardiorrespiratória`
    );
    assert.ok(msg.texto.includes('ACLS'), `Comando ${cmd} deve referenciar algoritmo ACLS`);
    assert.ok(msg.kb, `Comando ${cmd} deve conter teclado inline de seleção de ritmo`);

    const cbs = extrairCallbacksDoTeclado(msg.kb);
    assert.ok(cbs.includes('pcr_chocavel'), 'Deve conter botão de Ritmo Chocável');
    assert.ok(cbs.includes('pcr_naochocavel'), 'Deve conter botão de Ritmo Não Chocável');
    assert.ok(cbs.includes('pcr_gestante'), 'Deve conter botão de PCR na Gestante');
    assert.ok(cbs.includes('pcr_pals'), 'Deve conter botão de PALS Pediátrico');
  }
  console.log('  ✓ /pcr e /acls sem args exibem guia geral e seletor com 4 cenários (chocável, não chocável, gestante, pals).');

  // -----------------------------------------------------------------------------
  // [CENÁRIO B] COMANDO /pcr COM ARGUMENTO CHOCÁVEL (/pcr chocavel, /pcr tv, /pcr fv)
  // -----------------------------------------------------------------------------
  console.log('\n📌 [Cenário B] Testando comando /pcr com argumento chocável...');

  const comandosChocaveis = ['/pcr chocavel', '/pcr chocável', '/pcr fv', '/pcr tv', '/acls fv', '/PCR CHOCAVEL'];
  for (const cmd of comandosChocaveis) {
    limparCaptura();
    ctx.processarMensagemTexto({ chat: { id: chatId }, text: cmd });
    const msg = obterUltimaMensagem();

    assert.ok(msg.texto.includes('RITMO CHOCÁVEL'), `Comando ${cmd} deve identificar ritmo chocável`);
    assert.ok(msg.texto.includes('200 J'), 'Deve prescrever choque bifásico de 200 J imediato');
    assert.ok(msg.texto.includes('CICLO 2') || msg.texto.includes('Ciclo 2'), 'Deve orientar Ciclo 2');
    assert.ok(msg.texto.includes('Adrenalina 1 mg'), 'Deve indicar Adrenalina 1 mg IV/IO no ciclo 2');
    assert.ok(msg.texto.includes('3 a 5 min'), 'Deve citar intervalo de adrenalina q3-5 min');
    assert.ok(msg.texto.includes('CICLO 3') || msg.texto.includes('Ciclo 3'), 'Deve orientar Ciclo 3');
    assert.ok(msg.texto.includes('Amiodarona 300 mg'), 'Deve indicar Amiodarona 300 mg no ciclo 3');
    assert.ok(msg.texto.includes('150 mg'), 'Deve citar 2ª dose de Amiodarona 150 mg');
    assert.ok(msg.texto.includes('Lidocaína') || msg.texto.includes('Lidocaina'), 'Deve citar alternativa Lidocaína');
    assert.ok(msg.texto.includes('Torsades'), 'Deve citar conduta para Torsades de Pointes');

    // Validação estrita do teclado de atalhos de 1 toque beira-leito
    assert.ok(msg.kb, 'Mensagem deve incluir teclado inline de atalhos rápidos');
    const cbs = extrairCallbacksDoTeclado(msg.kb);
    assert.ok(cbs.includes('pcr_droga_adrena'), 'Teclado chocável deve conter atalho de Adrenalina 1mg');
    assert.ok(cbs.includes('pcr_droga_amiodarona'), 'Teclado chocável deve conter atalho de Amiodarona');
    assert.ok(cbs.includes('pcr_ciclo_2min'), 'Teclado chocável deve conter atalho de Ciclo RCP 2 min');
    assert.ok(cbs.includes('pcr_5hs_5ts'), 'Teclado chocável deve conter atalho de 5Hs e 5Ts');
    assert.ok(cbs.includes('pcr_pos_rce'), 'Teclado chocável deve conter atalho de Cuidados Pós-RCE');
    assert.ok(cbs.includes('pcr_naochocavel'), 'Teclado chocável deve permitir migrar para Não Chocável');
  }
  console.log('  ✓ Ritmo chocável (/pcr chocavel, /pcr fv, /pcr tv): Choque 200J, Adrena ciclo 2, Amio ciclo 3 e teclado 1-toque auditados.');

  // -----------------------------------------------------------------------------
  // [CENÁRIO C] COMANDO /pcr NÃO CHOCÁVEL (/pcr nao chocavel, /pcr aesp, /pcr assistolia)
  // -----------------------------------------------------------------------------
  console.log('\n📌 [Cenário C] Testando comando /pcr com argumento não chocável...');

  const comandosNaoChocaveis = ['/pcr nao chocavel', '/pcr não chocável', '/pcr aesp', '/pcr assistolia', '/acls assistolia'];
  for (const cmd of comandosNaoChocaveis) {
    limparCaptura();
    ctx.processarMensagemTexto({ chat: { id: chatId }, text: cmd });
    const msg = obterUltimaMensagem();

    assert.ok(msg.texto.includes('RITMO NÃO CHOCÁVEL') || msg.texto.includes('NÃO CHOCÁVEL'), `Comando ${cmd} deve identificar ritmo não chocável`);
    assert.ok(msg.texto.includes('NÃO aplicar choque'), 'Deve proibir aplicação de choque em assistolia/AESP');
    assert.ok(msg.texto.includes('Adrenalina 1 mg'), 'Deve indicar Adrenalina 1 mg o mais rápido possível');
    assert.ok(msg.texto.includes('100-120 cpm') || msg.texto.includes('100 a 120 cpm'), 'Deve indicar compressões de 100-120 cpm');
    assert.ok(msg.texto.includes('5-6 cm') || msg.texto.includes('5 a 6 cm'), 'Deve indicar profundidade de 5-6 cm');
    assert.ok(msg.texto.includes('Linha Reta') || msg.texto.includes('linha reta'), 'Deve orientar protocolo da linha reta na assistolia');
    assert.ok(msg.texto.includes('5 Hs') || msg.texto.includes('5Hs') || msg.texto.includes('5 HS'), 'Deve orientar checklist de 5 Hs e 5 Ts');

    // Validação estrita do teclado de atalhos rápidos
    assert.ok(msg.kb, 'Mensagem deve incluir teclado inline de atalhos');
    const cbs = extrairCallbacksDoTeclado(msg.kb);
    assert.ok(cbs.includes('pcr_chocavel'), 'Teclado não chocável deve permitir migrar para Ritmo Chocável');
    assert.ok(cbs.includes('pcr_droga_adrena'), 'Teclado não chocável deve conter atalho de Adrenalina');
    assert.ok(cbs.includes('pcr_ciclo_2min'), 'Teclado não chocável deve conter atalho de Ciclo 2 min');
    assert.ok(cbs.includes('pcr_5hs_5ts'), 'Teclado não chocável deve conter atalho de 5Hs e 5Ts');
    assert.ok(cbs.includes('pcr_pos_rce'), 'Teclado não chocável deve conter atalho de Cuidados Pós-RCE');
  }
  console.log('  ✓ Ritmo não chocável (/pcr nao chocavel, /pcr aesp, /pcr assistolia): RCP imediata, Adrena precoce, linha reta e 5Hs/5Ts auditados.');

  // -----------------------------------------------------------------------------
  // [CENÁRIO D] CALLBACKS INTERATIVOS DE PCR
  // -----------------------------------------------------------------------------
  console.log('\n📌 [Cenário D] Testando callbacks interativos de PCR...');

  // 1. pcr_chocavel
  limparCaptura();
  ctx.processarCallbackBotao({ id: 'cb_choc', message: { chat: { id: chatId }, message_id: 101 }, data: 'pcr_chocavel' });
  assert.ok(callbacksRespondidos.some(c => c.texto.includes('Chocável') || c.id === 'cb_choc'), 'Callback pcr_chocavel deve responder');
  assert.ok(obterUltimaMensagem().texto.includes('RITMO CHOCÁVEL'), 'pcr_chocavel deve exibir protocolo chocável');

  // 2. pcr_naochocavel
  limparCaptura();
  ctx.processarCallbackBotao({ id: 'cb_nchoc', message: { chat: { id: chatId }, message_id: 102 }, data: 'pcr_naochocavel' });
  assert.ok(callbacksRespondidos.some(c => c.texto.includes('Não Chocável') || c.id === 'cb_nchoc'), 'Callback pcr_naochocavel deve responder');
  assert.ok(obterUltimaMensagem().texto.includes('NÃO CHOCÁVEL'), 'pcr_naochocavel deve exibir protocolo não chocável');

  // 3. pcr_droga_adrena
  limparCaptura();
  ctx.processarCallbackBotao({ id: 'cb_adrena', message: { chat: { id: chatId }, message_id: 103 }, data: 'pcr_droga_adrena' });
  const msgAdrena = obterUltimaMensagem();
  assert.ok(callbacksRespondidos.some(c => c.id === 'cb_adrena'), 'Callback pcr_droga_adrena deve responder ao Telegram');
  assert.ok(msgAdrena.texto.includes('1 mg IV/IO') || msgAdrena.texto.includes('1 mg IV'), 'Adrenalina deve detalhar dose 1 mg IV/IO');
  assert.ok(msgAdrena.texto.includes('3 a 5 minutos') || msgAdrena.texto.includes('3 a 5 min'), 'Adrenalina deve indicar intervalo de 3 a 5 min');
  assert.ok(/flush\s+(?:de\s+)?20\s*mL/i.test(msgAdrena.texto), 'Adrenalina deve prescrever flush de 20 mL');
  console.log('  ✓ Callback pcr_droga_adrena: 1 mg IV/IO, intervalo 3 a 5 min, flush 20 mL auditados.');

  // 4. pcr_droga_amiodarona
  limparCaptura();
  ctx.processarCallbackBotao({ id: 'cb_amio', message: { chat: { id: chatId }, message_id: 104 }, data: 'pcr_droga_amiodarona' });
  const msgAmio = obterUltimaMensagem();
  assert.ok(callbacksRespondidos.some(c => c.id === 'cb_amio'), 'Callback pcr_droga_amiodarona deve responder ao Telegram');
  assert.ok(msgAmio.texto.includes('300 mg'), 'Amiodarona deve detalhar 1ª dose de 300 mg');
  assert.ok(msgAmio.texto.includes('150 mg'), 'Amiodarona deve detalhar 2ª dose de 150 mg');
  assert.ok(/lidoca[ií]na/i.test(msgAmio.texto), 'Deve citar alternativa com Lidocaína');
  assert.ok(msgAmio.texto.includes('Torsades de Pointes') || msgAmio.texto.includes('Torsades'), 'Deve citar Magnésio para Torsades');
  console.log('  ✓ Callback pcr_droga_amiodarona: doses 300 mg e 150 mg, alternativa lidocaína e magnésio para Torsades auditados.');

  // 5. pcr_ciclo_2min
  limparCaptura();
  ctx.processarCallbackBotao({ id: 'cb_ciclo', message: { chat: { id: chatId }, message_id: 105 }, data: 'pcr_ciclo_2min' });
  const msgCiclo = obterUltimaMensagem();
  assert.ok(callbacksRespondidos.some(c => c.id === 'cb_ciclo'), 'Callback pcr_ciclo_2min deve responder ao Telegram');
  assert.ok(/100\s*(?:a|-)\s*120\s*(?:cpm|compress)/i.test(msgCiclo.texto), 'Deve conter frequência 100-120 cpm');
  assert.ok(msgCiclo.texto.includes('5 a 6 cm') || msgCiclo.texto.includes('5-6 cm'), 'Deve conter profundidade 5-6 cm');
  assert.ok(msgCiclo.texto.includes('30:2') || msgCiclo.texto.includes('Ventilação'), 'Deve detalhar ventilação/relação 30:2');
  console.log('  ✓ Callback pcr_ciclo_2min: compressão 100-120 cpm, profundidade 5-6 cm e ventilação auditados.');

  // 6. pcr_5hs_5ts
  limparCaptura();
  ctx.processarCallbackBotao({ id: 'cb_5h5t', message: { chat: { id: chatId }, message_id: 106 }, data: 'pcr_5hs_5ts' });
  const msg5H5T = obterUltimaMensagem();
  assert.ok(callbacksRespondidos.some(c => c.id === 'cb_5h5t'), 'Callback pcr_5hs_5ts deve responder ao Telegram');
  // Checagem dos 5 Hs
  assert.ok(msg5H5T.texto.includes('Hipovolemia'), 'Deve conter Hipovolemia');
  assert.ok(msg5H5T.texto.includes('Hipóxia') || msg5H5T.texto.includes('Hipoxia'), 'Deve conter Hipóxia');
  assert.ok(msg5H5T.texto.includes('Acidose') || msg5H5T.texto.includes('Hidrogênio'), 'Deve conter Hidrogênio/Acidose');
  assert.ok(msg5H5T.texto.includes('Hipercalemia') || msg5H5T.texto.includes('Potássio'), 'Deve conter Hipo/Hipercalemia');
  assert.ok(msg5H5T.texto.includes('Hipotermia'), 'Deve conter Hipotermia');
  // Checagem dos 5 Ts
  assert.ok(msg5H5T.texto.includes('Tensão') || msg5H5T.texto.includes('Pneumotórax'), 'Deve conter Tensão no Tórax/Pneumotórax');
  assert.ok(msg5H5T.texto.includes('Tamponamento'), 'Deve conter Tamponamento Cardíaco');
  assert.ok(msg5H5T.texto.includes('Toxinas') || msg5H5T.texto.includes('Intoxicaç'), 'Deve conter Toxinas');
  assert.ok(msg5H5T.texto.includes('Trombose Pulmonar') || msg5H5T.texto.includes('TEP'), 'Deve conter TEP/Trombose Pulmonar');
  assert.ok(msg5H5T.texto.includes('Trombose Coronariana') || msg5H5T.texto.includes('IAM'), 'Deve conter IAM/Trombose Coronariana');
  console.log('  ✓ Callback pcr_5hs_5ts: 5Hs e 5Ts completos auditados beira-leito.');

  // 7. pcr_pos_rce
  limparCaptura();
  ctx.processarCallbackBotao({ id: 'cb_rce', message: { chat: { id: chatId }, message_id: 107 }, data: 'pcr_pos_rce' });
  const msgRce = obterUltimaMensagem();
  assert.ok(callbacksRespondidos.some(c => c.id === 'cb_rce'), 'Callback pcr_pos_rce deve responder ao Telegram');
  assert.ok(msgRce.texto.includes('PAM ≥ 65') || msgRce.texto.includes('PAM >= 65'), 'Deve conter meta PAM >= 65 mmHg');
  assert.ok(/SpO[2₂].*92.*98/i.test(msgRce.texto) || /92%?\s*(?:a|-)\s*98%/i.test(msgRce.texto), 'Deve conter meta SpO2 92-98%');
  assert.ok(msgRce.texto.includes('ECG') || msgRce.texto.includes('12 derivações'), 'Deve orientar ECG imediato');
  assert.ok(msgRce.texto.includes('32°C a 36°C') || msgRce.texto.includes('Controle Direcionado de Temperatura'), 'Deve orientar controle de temperatura (CDT 32-36°C)');
  console.log('  ✓ Callback pcr_pos_rce: metas de PAM >= 65, SpO2 92-98%, ECG e controle térmico auditados.');

  // -----------------------------------------------------------------------------
  // [CENÁRIO E] COMANDOS DE ARRITMIAS CARDÍACAS (/arritmia, /taquiarritmia, /bradiarritmia)
  // -----------------------------------------------------------------------------
  console.log('\n📌 [Cenário E] Testando comandos de Arritmias Cardíacas...');

  // 1. /arritmia sem argumentos
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/arritmia' });
  const msgArrGuia = obterUltimaMensagem();
  assert.ok(msgArrGuia.texto.includes('ARRITMIAS CARDÍACAS') || msgArrGuia.texto.includes('ALGORITMO ACLS'), 'Deve exibir guia geral de arritmias');
  assert.ok(msgArrGuia.texto.includes('4D') || msgArrGuia.texto.includes('INSTABILIDADE'), 'Deve descrever critérios de instabilidade');
  assert.ok(msgArrGuia.kb, 'Deve conter teclado com seletores');
  const cbsArr = extrairCallbacksDoTeclado(msgArrGuia.kb);
  assert.ok(cbsArr.includes('arritmia_instavel'), 'Seletor deve conter botão de Instabilidade / CVE');
  assert.ok(cbsArr.includes('arritmia_tsv'), 'Seletor deve conter botão de TSV');
  assert.ok(cbsArr.includes('arritmia_tv'), 'Seletor deve conter botão de TV');
  assert.ok(cbsArr.includes('arritmia_fa'), 'Seletor deve conter botão de FA / Flutter');
  assert.ok(cbsArr.includes('arritmia_bradi'), 'Seletor deve conter botão de Bradicardias');
  console.log('  ✓ /arritmia sem args: exibe guia geral e botões inline rápidos.');

  // 2. /arritmia instavel ou parâmetros com choque/dor
  const comandosInstaveis = [
    '/arritmia instavel',
    '/arritmia instável',
    '/arritmia choque e hipotensão',
    '/taquiarritmia dor torácica e hipotenso'
  ];
  for (const cmdInst of comandosInstaveis) {
    limparCaptura();
    ctx.processarMensagemTexto({ chat: { id: chatId }, text: cmdInst });
    const msgInst = obterUltimaMensagem();
    assert.ok(
      msgInst.texto.includes('CARDIOVERSÃO ELÉTRICA') || msgInst.texto.includes('CVE'),
      `Comando ${cmdInst} deve prescrever CVE sincronizada imediata`
    );
    assert.ok(msgInst.texto.includes('SYNC'), 'Deve enfatizar ativação do botão SYNC');
    assert.ok(msgInst.texto.includes('Sedação') || msgInst.texto.includes('sedação'), 'Deve orientar sedação/analgesia rápida');
    assert.ok(msgInst.texto.includes('50 a 100 J') || msgInst.texto.includes('50-100 J'), 'Deve detalhar carga para QRS estreito');
    assert.ok(msgInst.texto.includes('100 J'), 'Deve detalhar carga para TV monomórfica');
  }
  console.log('  ✓ /arritmia instavel / choque / dor: CVE sincronizada imediata com SYNC ON e sedação auditada.');

  // 3. /taquiarritmia ou /taquicardia tsv
  const comandosTsv = ['/taquiarritmia tsv', '/taquicardia tsv', '/arritmia tsv', '/taquiarritmia'];
  for (const cmdTsv of comandosTsv) {
    limparCaptura();
    ctx.processarMensagemTexto({ chat: { id: chatId }, text: cmdTsv });
    const msgTsv = obterUltimaMensagem();
    assert.ok(msgTsv.texto.includes('TAQUICARDIA SUPRAVENTRICULAR') || msgTsv.texto.includes('TSV'), `Comando ${cmdTsv} deve focar em TSV`);
    assert.ok(msgTsv.texto.includes('Valsalva Modificada') || msgTsv.texto.includes('REVERT'), 'Deve prescrever Manobra de Valsalva Modificada');
    assert.ok(msgTsv.texto.includes('Adenosina 6 mg') || msgTsv.texto.includes('6 mg IV'), 'Deve prescrever 1ª dose de Adenosina 6 mg push');
    assert.ok(msgTsv.texto.includes('Adenosina 12 mg') || msgTsv.texto.includes('12 mg IV'), 'Deve prescrever 2ª dose de Adenosina 12 mg');
    assert.ok(msgTsv.texto.includes('flush') || msgTsv.texto.includes('20 mL'), 'Deve orientar flush de 20 mL');
  }
  console.log('  ✓ /taquiarritmia e /taquicardia tsv: Valsalva Modificada (Revert) e Adenosina 6mg/12mg auditados.');

  // 4. /taquiarritmia tv ou TV monomórfica estável
  const comandosTv = ['/taquiarritmia tv', '/taquicardia tv', '/arritmia tv monomorfica'];
  for (const cmdTv of comandosTv) {
    limparCaptura();
    ctx.processarMensagemTexto({ chat: { id: chatId }, text: cmdTv });
    const msgTv = obterUltimaMensagem();
    assert.ok(msgTv.texto.includes('TAQUICARDIA VENTRICULAR') || msgTv.texto.includes('TV MONOMÓRFICA'), `Comando ${cmdTv} deve focar em TV`);
    assert.ok(msgTv.texto.includes('Amiodarona 150 mg') || msgTv.texto.includes('150 mg IV'), 'Deve prescrever Amiodarona 150 mg em 10 min');
    assert.ok(msgTv.texto.includes('10 minutos') || msgTv.texto.includes('10 min'), 'Deve orientar infusão em 10 min');
    assert.ok(msgTv.texto.includes('Cardioversão') || msgTv.texto.includes('CVE'), 'Deve alertar para CVE imediata se instabilizar');
    assert.ok(msgTv.texto.includes('sem pulso') || msgTv.texto.includes('PCR'), 'Deve alertar para protocolo de PCR se sem pulso');
  }
  console.log('  ✓ /taquiarritmia tv: Amiodarona 150mg em 10 min e indicação de CVE se instável auditados.');

  // 5. /bradiarritmia ou /bradicardia
  const comandosBradi = ['/bradiarritmia', '/bradicardia', '/arritmia bradi', '/bradicardia bav'];
  for (const cmdBradi of comandosBradi) {
    limparCaptura();
    ctx.processarMensagemTexto({ chat: { id: chatId }, text: cmdBradi });
    const msgBradi = obterUltimaMensagem();
    assert.ok(msgBradi.texto.includes('BRADIARRITMIAS') || msgBradi.texto.includes('BLOQUEIOS'), `Comando ${cmdBradi} deve focar em bradicardias`);
    assert.ok(msgBradi.texto.includes('Atropina 1 mg') || msgBradi.texto.includes('1 mg IV/IO'), 'Deve prescrever Atropina 1 mg');
    assert.ok(msgBradi.texto.includes('3 mg'), 'Deve indicar dose máxima acumulada de 3 mg');
    assert.ok(msgBradi.texto.includes('ineficaz em BAV') || msgBradi.texto.includes('Mobitz II') || msgBradi.texto.includes('BAVT'), 'Deve alertar sobre ineficácia em BAV avançado');
    assert.ok(msgBradi.texto.includes('Marcapasso Transcutâneo') || msgBradi.texto.includes('MPTC'), 'Deve indicar Marcapasso transcutâneo');
    assert.ok(msgBradi.texto.includes('Dopamina') || msgBradi.texto.includes('Adrenalina'), 'Deve indicar suporte com Dopamina ou Adrenalina contínua');
  }
  console.log('  ✓ /bradiarritmia e /bradicardia: Atropina 1mg (máx 3mg), alerta de BAV avançado e MPTC/Dopamina/Adrenalina auditados.');

  // -----------------------------------------------------------------------------
  // [CENÁRIO F] CALLBACKS INLINE DE ARRITMIAS CARDÍACAS
  // -----------------------------------------------------------------------------
  console.log('\n📌 [Cenário F] Testando callbacks inline de arritmias...');

  const callbacksArritmias = [
    { data: 'arritmia_instavel', esperado: 'CARDIOVERSÃO ELÉTRICA' },
    { data: 'arritmia_tsv', esperado: 'Valsalva Modificada' },
    { data: 'arritmia_tv', esperado: 'Amiodarona 150 mg' },
    { data: 'arritmia_fa', esperado: 'FIBRILAÇÃO ATRIAL' },
    { data: 'arritmia_bradi', esperado: 'Atropina 1 mg' }
  ];

  for (const cbArr of callbacksArritmias) {
    limparCaptura();
    ctx.processarCallbackBotao({
      id: 'cb_' + cbArr.data,
      message: { chat: { id: chatId }, message_id: 200 },
      data: cbArr.data
    });
    assert.ok(callbacksRespondidos.some(c => c.id === 'cb_' + cbArr.data), `Callback ${cbArr.data} deve responder ao Telegram`);
    const msgCb = obterUltimaMensagem();
    assert.ok(
      msgCb.texto.includes(cbArr.esperado) || msgCb.texto.toUpperCase().includes(cbArr.esperado.toUpperCase()),
      `Callback ${cbArr.data} deve conter ${cbArr.esperado}`
    );
  }
  console.log('  ✓ Todos os 5 callbacks inline de arritmias (arritmia_instavel, arritmia_tsv, arritmia_tv, arritmia_fa, arritmia_bradi) auditados.');

  // -----------------------------------------------------------------------------
  // [CENÁRIO G] INTEGRAÇÃO NO MENU SALA VERMELHA (CALLBACK ux:emerg:arritmia)
  // -----------------------------------------------------------------------------
  console.log('\n📌 [Cenário G] Testando integração no menu Sala Vermelha (callback ux:emerg:arritmia)...');

  // 1. Verificar presença do botão no Menu da Sala Vermelha
  limparCaptura();
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/sala' });
  const msgSala = obterUltimaMensagem();
  assert.ok(msgSala.kb, 'Sala Vermelha deve possuir teclado');
  const cbsSala = extrairCallbacksDoTeclado(msgSala.kb);
  assert.ok(
    cbsSala.includes('ux:emerg:arritmia'),
    'Menu Sala Vermelha deve conter botão inline com callback "ux:emerg:arritmia"'
  );

  // 2. Acionar callback 'ux:emerg:arritmia' e verificar redirecionamento para o guia de arritmias
  limparCaptura();
  ctx.processarCallbackBotao({
    id: 'cb_sala_arr',
    message: { chat: { id: chatId }, message_id: 300 },
    data: 'ux:emerg:arritmia'
  });
  const msgAposCallback = obterUltimaMensagem();
  assert.ok(
    msgAposCallback.texto.includes('ARRITMIAS CARDÍACAS') || msgAposCallback.texto.includes('ALGORITMO ACLS'),
    'Callback "ux:emerg:arritmia" deve redirecionar instantaneamente para o Guia de Arritmias Cardíacas'
  );
  console.log('  ✓ Menu Sala Vermelha possui botão ux:emerg:arritmia e redireciona com sucesso.');

  // -----------------------------------------------------------------------------
  // [CENÁRIO H] RESILIÊNCIA E TESTES DEFENSIVOS (EDGE CASES)
  // -----------------------------------------------------------------------------
  console.log('\n📌 [Cenário H] Mapeando edge cases e verificando robustez defensiva...');

  // 1. Textos com espaços aberrantes e caracteres especiais
  const edgeCasesTexto = [
    '   /pcr    tv   sem   pulso   ',
    '/acls\t\tchocavel\n',
    '/arritmia     instavel  grave ',
    '/taquicardia   TSV   refrataria ',
    '/bradicardia    bavt   bloqueio '
  ];
  for (const tEdge of edgeCasesTexto) {
    limparCaptura();
    assert.doesNotThrow(() => {
      ctx.processarMensagemTexto({ chat: { id: chatId }, text: tEdge });
    }, `Não deve lançar exceção para entrada edge case: "${tEdge}"`);
    assert.ok(mensagensEnviadas.length > 0, `Entrada "${tEdge}" deve gerar resposta clínica válida`);
  }

  // 2. Callbacks com mensagens incompletas ou nulas
  assert.doesNotThrow(() => {
    ctx.processarCallbackBotao(null);
    ctx.processarCallbackBotao({});
    ctx.processarCallbackBotao({ id: 'dummy', data: 'pcr_inexistente' });
    ctx.processarCallbackBotao({ id: 'sem_chat', message: {}, data: 'pcr_droga_adrena' });
  }, 'Módulo de callbacks deve ser resiliente a objetos nulos e incompletos');

  console.log('  ✓ Resiliência defensiva e tratamento de edge cases auditados com sucesso.');

  console.log('\n======================================================================');
  console.log('🎉 TODOS OS TESTES DE PCR & ARRITMIAS DO TELEGRAM FORAM APROVADOS! (100% PASS)');
  console.log('======================================================================\n');
}

testPcrArritmiasTelegram().catch(err => {
  console.error('\n❌ FALHA CRÍTICA NA SUÍTE DE TESTES:', err);
  process.exit(1);
});
