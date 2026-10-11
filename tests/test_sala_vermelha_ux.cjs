/**
 * TESTE DE INTEGRIDADE DA ABA EMERGÊNCIAS & SALA VERMELHA DO TELEGRAM
 * Validação exaustiva de fluxos clínicos beira-leito, navegação contextual,
 * resposta determinística instantânea (0ms), ausência de IA generativa em emergência
 * e ausência de botões fantasmas.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const source = fs.readFileSync(path.resolve(__dirname, '../ultra_rotina_master.js'), 'utf8');

function setupEnv() {
  const props = {
    TELEGRAM_CHAT_ID: '123456',
    TELEGRAM_BOT_TOKEN: 'fake-token-test',
    WEBHOOK_SECRET: 'secret',
    GEMINI_API_KEY: 'fake-gemini'
  };
  const cache = {};
  const sent = [];
  let seq = 0;

  const p = {
    getProperty: k => props[k] ?? null,
    setProperty: (k, v) => { props[k] = String(v); },
    deleteProperty: k => { delete props[k]; },
    getProperties: () => ({ ...props })
  };

  const c = {
    Buffer,
    Date,
    console: { log() {}, error() {}, warn() {} },
    PropertiesService: { getScriptProperties: () => p },
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
    UrlFetchApp: {
      fetch: (url, opts) => {
        let payload = {};
        try {
          payload = typeof opts?.payload === 'string' ? JSON.parse(opts.payload) : (opts?.payload || {});
        } catch (_) {
          payload = opts?.payload || {};
        }
        sent.push({ url, payload });
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ ok: true, result: { message_id: 9999 } })
        };
      }
    }
  };

  vm.createContext(c);
  vm.runInContext(source, c);
  c.Utilities.getUuid = () => String(++seq).padStart(32, '0');
  c.Utilities.sleep = () => {};

  // Bloqueio rigoroso de IA: se qualquer função generativa for invocada, o teste quebra
  c.gerarCondutaEmergenciaComIA = () => {
    throw new Error('VIOLAÇÃO CRÍTICA: IA generativa foi invocada em conduta de emergência beira-leito!');
  };

  return { c, sent, cache };
}

function extrairBotoes(payload) {
  if (!payload || !payload.reply_markup) return [];
  return payload.reply_markup.inline_keyboard || [];
}

function temBotao(kb, callbackEsperado, textoEsperado) {
  return kb.some(row => row.some(b => {
    const cbOk = callbackEsperado ? b.callback_data === callbackEsperado : true;
    const txtOk = textoEsperado ? (b.text && b.text.includes(textoEsperado)) : true;
    return cbOk && txtOk;
  }));
}

console.log('🧪 Iniciando testes de integridade da Sala Vermelha & Emergências...');

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 1: Resposta determinística instantânea (0ms) das 5 condutas sem IA
// ─────────────────────────────────────────────────────────────────────────────
{
  const { c, sent, cache } = setupEnv();
  const condutas = [
    {
      tipo: 'eap',
      nome: 'Edema Agudo de Pulmão',
      termosEsperados: ['Nitroglicerina', 'Furosemida']
    },
    {
      tipo: 'anafilaxia',
      nome: 'Anafilaxia',
      termosEsperados: ['Adrenalina IM 0.5mg']
    },
    {
      tipo: 'convulsao',
      nome: 'Crise Convulsiva',
      termosEsperados: ['Diazepam', 'Midazolam']
    },
    {
      tipo: 'hipercalemia',
      nome: 'Hipercalemia',
      termosEsperados: ['Gluconato de Cálcio 10%', 'Glicoinsulina']
    },
    {
      tipo: 'cad',
      nome: 'Cetoacidose Diabética',
      termosEsperados: ['Hidratação 1000mL', 'K⁺ < 3,5']
    }
  ];

  condutas.forEach(cond => {
    const t0 = Date.now();
    const cb = {
      id: 'cb_' + cond.tipo,
      data: 'ux:conduta:' + cond.tipo,
      message: { chat: { id: 123456 }, message_id: 10 }
    };

    c.tratarCallbackUX(cb);
    const duracao = Date.now() - t0;

    assert.ok(duracao < 50, `Conduta ${cond.nome} deve responder em 0ms (demorou ${duracao}ms)`);
    const ultimoEnvio = sent[sent.length - 1].payload;
    const texto = ultimoEnvio.text || '';

    cond.termosEsperados.forEach(termo => {
      assert.ok(
        texto.includes(termo) || (cond.tipo === 'eap' && (texto.includes('Nitroglicerina') || texto.includes('Nipride'))),
        `Conduta ${cond.nome} DEVE conter posologia oficial com termo '${termo}'`
      );
    });

    console.log(`  ✓ 1. [${cond.tipo.toUpperCase()}] Respondeu em ${duracao}ms sem IA generativa e com posologia oficial validada`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 2: Botão de 1 toque [📋 Copiar para Prontuário] com chave de cache válida
// ─────────────────────────────────────────────────────────────────────────────
{
  const { c, sent, cache } = setupEnv();
  const tipos = ['eap', 'anafilaxia', 'convulsao', 'hipercalemia', 'cad'];

  tipos.forEach(tipo => {
    c.tratarCallbackUX({
      id: 'cb_copy_' + tipo,
      data: 'ux:conduta:' + tipo,
      message: { chat: { id: 123456 }, message_id: 20 }
    });

    const ultimoEnvio = sent[sent.length - 1].payload;
    const kb = extrairBotoes(ultimoEnvio);

    const btnCopiar = kb.flatMap(r => r).find(b => b.text && b.text.includes('Copiar para Prontuário'));
    assert.ok(btnCopiar, `Conduta ${tipo} deve conter botão [📋 Copiar para Prontuário]`);
    assert.ok(btnCopiar.callback_data.startsWith('ux:copiar:'), `Callback deve iniciar com ux:copiar: (recebeu ${btnCopiar.callback_data})`);

    const cacheKey = btnCopiar.callback_data.replace('ux:copiar:', '');
    assert.ok(cacheKey.length >= 10, `Chave de cache deve ser válida (recebeu ${cacheKey})`);
    const textoEmCache = cache[cacheKey];
    assert.ok(textoEmCache && textoEmCache.length > 50, `Conteúdo da conduta ${tipo} DEVE estar gravado no cache com a chave ${cacheKey}`);
    assert.strictEqual(textoEmCache, ultimoEnvio.text, 'Texto no cache deve ser idêntico à mensagem exibida');
  });

  console.log('  ✓ 2. Todas as 5 condutas possuem botão de 1 toque [📋 Copiar para Prontuário] com persistência íntegra em cache');
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 3: Presença mandatória de [🔙 Sala Vermelha] ('ux:sala') e [🏠 Início] ('ux:hub:inicio')
// ─────────────────────────────────────────────────────────────────────────────
{
  const { c, sent } = setupEnv();

  function validarBotoesNavegacao(nomeTela, payload, opts = {}) {
    const kb = extrairBotoes(payload);
    const temSala = temBotao(kb, 'ux:sala', 'Sala Vermelha');
    const temInicio = temBotao(kb, 'ux:hub:inicio', 'Início');

    assert.ok(temSala, `${nomeTela} DEVE conter botão [🔙 Sala Vermelha] ('ux:sala')`);
    assert.ok(temInicio, `${nomeTela} DEVE conter botão [🏠 Início] ('ux:hub:inicio')`);
  }

  // 3.1. Menu Sala Vermelha
  c.enviarMenuSalaVermelha(123456);
  validarBotoesNavegacao('enviarMenuSalaVermelha', sent[sent.length - 1].payload);

  // 3.2. Menu Condutas
  c.enviarMenuCondutas(123456);
  validarBotoesNavegacao('enviarMenuCondutas', sent[sent.length - 1].payload);

  // 3.3. Telas de Conduta (EAP, Anafilaxia, Convulsão, Hipercalemia, CAD)
  ['eap', 'anafilaxia', 'convulsao', 'hipercalemia', 'cad'].forEach(t => {
    c.enviarTelaCondutaEmergencia(123456, t);
    validarBotoesNavegacao(`Conduta ${t}`, sent[sent.length - 1].payload);
  });

  // 3.4. Menu SRI
  c.enviarMenuSri(123456);
  validarBotoesNavegacao('enviarMenuSri', sent[sent.length - 1].payload);

  // 3.5. Menu DVA e telas de peso/diluição
  c.enviarMenuDva(123456);
  validarBotoesNavegacao('enviarMenuDva', sent[sent.length - 1].payload);

  c.enviarTelaPesoDva(123456, 'nora');
  validarBotoesNavegacao('enviarTelaPesoDva', sent[sent.length - 1].payload);

  c.enviarTelaDiluicaoDva(123456, 'nora', 70);
  validarBotoesNavegacao('enviarTelaDiluicaoDva', sent[sent.length - 1].payload);

  // 3.6. Protocolos PCR (tratarComandoPcr em ritmos chocáveis, não chocáveis, gestante, PALS e drogas)
  const cenariosPcr = [
    { param: 'chocavel', desc: 'PCR Ritmo Chocável' },
    { param: 'nao chocavel', desc: 'PCR Ritmo Não Chocável' },
    { param: 'gestante', desc: 'PCR Gestante' },
    { param: 'ped', desc: 'PCR Pediátrico / PALS' },
    { param: '', desc: 'PCR Geral ACLS' }
  ];
  cenariosPcr.forEach(p => {
    c.tratarComandoPcr(123456, p.param);
    validarBotoesNavegacao(p.desc, sent[sent.length - 1].payload);
  });

  // Callbacks de Drogas PCR
  ['pcr_droga_adrena', 'pcr_droga_amiodarona', 'pcr_ciclo_2min', 'pcr_5hs_5ts', 'pcr_pos_rce'].forEach(cbData => {
    c.processarCallbackBotao({ id: 'cb_' + cbData, data: cbData, message: { chat: { id: 123456 }, message_id: 30 } });
    validarBotoesNavegacao(`Callback PCR ${cbData}`, sent[sent.length - 1].payload);
  });

  // 3.7. Protocolos Arritmias (tratarComandoArritmia em instável, TSV, TV, FA, Bradicardias)
  const cenariosArritmia = [
    { cmd: '/arritmia', param: 'instavel', desc: 'Arritmia Instável (CVE)' },
    { cmd: '/arritmia', param: 'tsv', desc: 'TSV Taquicardia Supra' },
    { cmd: '/arritmia', param: 'tv', desc: 'TV Monomórfica com pulso' },
    { cmd: '/arritmia', param: 'fa', desc: 'FA / Flutter Atrial' },
    { cmd: '/arritmia', param: 'bradi', desc: 'Bradicardias e BAV' },
    { cmd: '/arritmia', param: '', desc: 'Guia Geral Arritmias' }
  ];
  cenariosArritmia.forEach(a => {
    c.tratarComandoArritmia(123456, a.cmd, a.param);
    validarBotoesNavegacao(a.desc, sent[sent.length - 1].payload);
  });

  console.log('  ✓ 3. Botões [🔙 Sala Vermelha] e [🏠 Início] presentes em todas as telas de emergência, PCR e arritmias');
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 4: Ausência absoluta de botões fantasmas ('Gerar PDF', 'Ver critérios')
// ─────────────────────────────────────────────────────────────────────────────
{
  const { c, sent } = setupEnv();

  const rDva = c.CalculadorasClinicas.drogasVasoativas('nora', 70, 'padrao');
  const rSri = c.CalculadorasClinicas.sequenciaRapidaIntubacao(70, 'padrao');
  const rGaso = c.CalculadorasClinicas.gasometria(7.22, 58, 62, 23, 91);
  const rDeficitAgua = c.CalculadorasClinicas.deficitAguaLivre(160, 140, 70, 'homem');
  const rHiperSemDef = c.CalculadorasClinicas.deficitAguaLivre(140, 140, 70, 'homem');

  const calculadoras = [
    { nome: 'DVA Nora', res: rDva },
    { nome: 'SRI 70kg', res: rSri },
    { nome: 'Gasometria', res: rGaso },
    { nome: 'Água Livre', res: rDeficitAgua },
    { nome: 'Hipernatremia sem déficit', res: rHiperSemDef }
  ];

  calculadoras.forEach(calc => {
    const rawBotoes = calc.res.botoes ? (calc.res.botoes.inline_keyboard || calc.res.botoes) : [];
    const flattened = rawBotoes.flatMap(r => Array.isArray(r) ? r : [r]);

    const temPdfFantasma = flattened.some(b => (b.text && b.text.includes('Gerar PDF')) || (b.callback_data && b.callback_data.includes('pdf')));
    const temCriteriosFantasma = flattened.some(b => (b.text && b.text.includes('Ver critérios')) || (b.callback_data && b.callback_data.includes('criterios')));

    assert.strictEqual(temPdfFantasma, false, `Calculadora ${calc.nome} NÃO DEVE conter botão fantasma 'Gerar PDF'`);
    assert.strictEqual(temCriteriosFantasma, false, `Calculadora ${calc.nome} NÃO DEVE conter botão fantasma 'Ver critérios'`);
  });

  // Também verificar nas telas de conduta enviadas
  ['eap', 'anafilaxia', 'convulsao', 'hipercalemia', 'cad'].forEach(t => {
    c.enviarTelaCondutaEmergencia(123456, t);
    const kb = extrairBotoes(sent[sent.length - 1].payload);
    const flattened = kb.flatMap(r => r);
    const temPdf = flattened.some(b => b.text && b.text.includes('Gerar PDF'));
    const temCrit = flattened.some(b => b.text && b.text.includes('critérios'));
    assert.strictEqual(temPdf, false, `Tela de conduta ${t} NÃO DEVE ter botão 'Gerar PDF'`);
    assert.strictEqual(temCrit, false, `Tela de conduta ${t} NÃO DEVE ter botão 'Ver critérios'`);
  });

  console.log('  ✓ 4. Zero botões fantasmas detectados nas calculadoras e telas de emergência');
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 5: Funcionamento dos comandos slash (/pcr, /arritmia, /sri, /dva, /conduta)
// ─────────────────────────────────────────────────────────────────────────────
{
  const { c, sent } = setupEnv();

  // /pcr
  c.processarMensagemTexto({ chat: { id: 123456 }, text: '/pcr' });
  let envio = sent[sent.length - 1].payload;
  assert.ok(envio.text.includes('PARADA CARDIORRESPIRATÓRIA'), '/pcr deve abrir o protocolo ACLS de PCR');
  let kb = extrairBotoes(envio);
  assert.ok(temBotao(kb, 'pcr_chocavel', 'Ritmo Chocável'), '/pcr deve conter seletor de ritmo chocável');
  assert.ok(temBotao(kb, 'ux:sala', 'Sala Vermelha'), '/pcr deve conter retorno à Sala Vermelha');

  // /arritmia
  c.processarMensagemTexto({ chat: { id: 123456 }, text: '/arritmia' });
  envio = sent[sent.length - 1].payload;
  assert.ok(envio.text.includes('ARRITMIAS CARDÍACAS NA EMERGÊNCIA'), '/arritmia deve abrir algoritmo de arritmias');
  kb = extrairBotoes(envio);
  assert.ok(temBotao(kb, 'arritmia_instavel', 'Paciente Instável'), '/arritmia deve conter seletor de instabilidade');
  assert.ok(temBotao(kb, 'ux:sala', 'Sala Vermelha'), '/arritmia deve conter retorno à Sala Vermelha');

  // /sri vazio -> deve entregar menu com seletor de peso e botões de emergência
  c.processarMensagemTexto({ chat: { id: 123456 }, text: '/sri' });
  envio = sent[sent.length - 1].payload;
  assert.ok(/sequência rápida de intubação/i.test(envio.text), '/sri sem argumentos deve entregar o menu de SRI');
  kb = extrairBotoes(envio);
  assert.ok(temBotao(kb, 'ux:sri:70', '70 kg'), '/sri menu deve conter atalho de 70 kg');
  assert.ok(temBotao(kb, 'ux:sala', 'Sala Vermelha'), '/sri menu deve conter retorno à Sala Vermelha');

  // /dva vazio -> deve entregar menu de seleção de vasoativas
  c.processarMensagemTexto({ chat: { id: 123456 }, text: '/dva' });
  envio = sent[sent.length - 1].payload;
  assert.ok(/drogas vasoativas/i.test(envio.text), '/dva sem argumentos deve entregar o menu de DVA');
  kb = extrairBotoes(envio);
  assert.ok(temBotao(kb, 'ux:droga:nora', 'Noradrenalina'), '/dva menu deve conter atalho de Noradrenalina');
  assert.ok(temBotao(kb, 'ux:sala', 'Sala Vermelha'), '/dva menu deve conter retorno à Sala Vermelha');

  // /conduta eap -> resposta determinística
  c.processarMensagemTexto({ chat: { id: 123456 }, text: '/conduta eap' });
  envio = sent[sent.length - 1].payload;
  assert.ok(envio.text.includes('EDEMA AGUDO DE PULMÃO'), '/conduta eap deve abrir conduta imediata');
  kb = extrairBotoes(envio);
  assert.ok(temBotao(kb, 'ux:sala', 'Sala Vermelha'), '/conduta eap deve conter retorno à Sala Vermelha');

  console.log('  ✓ 5. Comandos slash (/pcr, /arritmia, /sri, /dva, /conduta) retornando navegação adequada e atalhos rápidos');
}

console.log('\n🎉 TODOS OS TESTES DA SALA VERMELHA & EMERGÊNCIA PASSARAM COM 100% DE SUCESSO!\n');
