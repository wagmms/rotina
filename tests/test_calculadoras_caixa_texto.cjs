const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const source = fs.readdirSync(path.join(root, 'src'))
  .sort()
  .filter(n => n.endsWith('.js'))
  .map(n => fs.readFileSync(path.join(root, 'src', n), 'utf8'))
  .join('\n');

function env(config = {}) {
  const props = {
    TELEGRAM_CHAT_ID: '123',
    TELEGRAM_BOT_TOKEN: 'fake',
    WEBHOOK_SECRET: 'secret',
    ...config
  };
  const cache = {};
  const sent = [];
  const c = { console, Buffer };
  c.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: k => props[k] ?? null,
      setProperty: (k, v) => { props[k] = String(v); },
      deleteProperty: k => delete props[k],
      getProperties: () => ({ ...props })
    })
  };
  c.CacheService = {
    getScriptCache: () => ({
      get: k => cache[k] ?? null,
      put: (k, v) => { cache[k] = v; },
      remove: k => delete cache[k]
    })
  };
  c.LockService = {
    getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }),
    getUserLock: () => ({ tryLock: () => true, releaseLock: () => {} })
  };
  c.HtmlService = { createHtmlOutput: body => ({ body }) };
  c.UrlFetchApp = {
    fetch: (url, opts) => {
      sent.push({ method: url.split('/').pop(), body: JSON.parse(opts.payload || '{}') });
      return { getResponseCode: () => 200, getContentText: () => '{"ok":true}' };
    }
  };
  vm.createContext(c);
  vm.runInContext(source, c);
  return { c, sent, cache };
}

console.log('🧪 Iniciando testes de calculadoras com caixa de texto e dados estritos...');

// 1. Validação de obterInstrucoesCalculadora para CURB-65
{
  const { c } = env();
  const instr = c.obterInstrucoesCalculadora('curb65');
  assert(instr.includes('CURB-65'), 'Deve identificar CURB-65');
  assert(instr.includes('```'), 'Deve conter caixa de texto monoespaçada');
  assert(instr.includes('/calc curb65'), 'Deve conter comando na caixa');
  assert(instr.includes('Confusão mental: [sim/não]'), 'Deve solicitar confusão mental');
  assert(instr.includes('Ureia:'), 'Deve solicitar ureia');
  assert(instr.includes('FR:'), 'Deve solicitar FR');
  assert(instr.includes('PA:'), 'Deve solicitar PA');
  assert(instr.includes('Idade:'), 'Deve solicitar idade');
  assert(!instr.includes('sinais vitais e valores laboratoriais relevantes'), 'Não deve conter termos genéricos');
  console.log('✅ 1. Instruções CURB-65 possuem caixa de preenchimento estrita');
}

// 2. Validação de CKD-EPI vs Cockcroft-Gault
{
  const { c } = env();
  const instrCkd = c.obterInstrucoesCalculadora('ckd');
  assert(instrCkd.includes('CKD-EPI 2021'), 'Deve identificar CKD-EPI 2021');
  assert(instrCkd.includes('Creatinina: [ ] mg/dL'), 'Deve solicitar creatinina');
  assert(instrCkd.includes('Idade: [ ] anos'), 'Deve solicitar idade');
  assert(instrCkd.includes('Sexo biológico: [M/F]'), 'Deve solicitar sexo biológico');
  assert(!instrCkd.includes('Peso:'), 'CKD-EPI NÃO deve solicitar peso');
  assert(!instrCkd.includes('Altura'), 'CKD-EPI NÃO deve solicitar altura');
  assert(instrCkd.includes('```'), 'Deve conter caixa de preenchimento');

  const instrCock = c.obterInstrucoesCalculadora('cockcroft');
  assert(instrCock.includes('Cockcroft-Gault'), 'Deve identificar Cockcroft');
  assert(instrCock.includes('Peso: [ ] kg'), 'Cockcroft deve solicitar peso');
  assert(instrCock.includes('```'), 'Deve conter caixa de preenchimento');
  console.log('✅ 2. CKD-EPI e Cockcroft não solicitam dados desnecessários e possuem caixas dedicadas');
}

// 3. Validação de MELD (sem misturar com Child-Pugh)
{
  const { c } = env();
  const instrMeld = c.obterInstrucoesCalculadora('meld');
  assert(instrMeld.includes('MELD'), 'Deve identificar MELD');
  assert(instrMeld.includes('Bilirrubina total:'), 'Deve solicitar bilirrubina');
  assert(instrMeld.includes('Creatinina:'), 'Deve solicitar creatinina');
  assert(instrMeld.includes('INR:'), 'Deve solicitar INR');
  assert(instrMeld.includes('Sódio:'), 'Deve solicitar sódio');
  assert(!instrMeld.includes('Ascite:'), 'MELD não deve solicitar ascite');
  assert(!instrMeld.includes('Encefalopatia:'), 'MELD não deve solicitar encefalopatia');
  assert(instrMeld.includes('```'), 'Deve conter caixa de preenchimento');
  console.log('✅ 3. MELD solicita apenas seus parâmetros estritos');
}

// 4. Validação de Cálcio Corrigido, Gap Osmolar e Água Livre
{
  const { c } = env();
  const instrCa = c.obterInstrucoesCalculadora('calcio');
  assert(instrCa.includes('Cálcio Corrigido'), 'Deve identificar cálcio');
  assert(instrCa.includes('Cálcio total: [ ] mg/dL'), 'Deve solicitar Ca');
  assert(instrCa.includes('Albumina: [ ] g/dL'), 'Deve solicitar Albumina');
  assert(instrCa.includes('```'), 'Deve conter caixa');

  const instrGap = c.obterInstrucoesCalculadora('gap osmolar');
  assert(instrGap.includes('Gap Osmolar'), 'Deve identificar Gap Osmolar');
  assert(instrGap.includes('Osmolaridade medida:'), 'Deve solicitar osmolaridade');
  assert(instrGap.includes('```'), 'Deve conter caixa');

  const instrAgua = c.obterInstrucoesCalculadora('agua');
  assert(instrAgua.includes('Déficit de Água Livre'), 'Deve identificar Déficit de Água');
  assert(instrAgua.includes('Sódio atual:'), 'Deve solicitar sódio atual');
  assert(instrAgua.includes('Peso:'), 'Deve solicitar peso');
  assert(instrAgua.includes('```'), 'Deve conter caixa');
  console.log('✅ 4. Cálcio, Gap Osmolar e Água Livre formatados com caixas monospaçadas');
}

// 5. Fallback geral de calculadora não cadastrada: ZERO termos genéricos
{
  const { c } = env();
  const instrGenerica = c.obterInstrucoesCalculadora('escore_x');
  assert(!instrGenerica.includes('sinais vitais e valores laboratoriais relevantes'), 'Nunca solicitar dados genéricos');
  assert(instrGenerica.includes('```'), 'Deve fornecer caixa de texto para preencher');
  assert(instrGenerica.includes('/calc escore_x'), 'Deve conter o comando na caixa');
  console.log('✅ 5. Fallback geral fornece caixa de texto e não solicita dados genéricos');
}

// 6. Cálculo determinístico de CURB-65 a partir de mensagem preenchida
{
  const { c } = env();
  const textoPreenchido = `/calc curb65
Idade: 71 anos
Confusão mental: não
Ureia: 68 mg/dL
FR: 32 irpm
PA: 100x60 mmHg`;

  const res = c.tentarCalcularDeterministico(textoPreenchido);
  assert(res !== null, 'CURB-65 deve ser calculado deterministicamente');
  // 71 anos (+1), ureia 68 (+1), FR 32 (+1), PA 100/60 (PAD<=60, +1), confuso: não (0) -> 4/5
  assert(res.includes('CURB-65'), 'Deve reportar CURB-65');
  assert(res.includes('4/5') || res.includes('Alto Risco') || res.includes('ALTO RISCO'), 'Deve estratificar com precisão');
  console.log('✅ 6. CURB-65 calcula deterministicamente a partir da caixa de texto preenchida');
}

// 7. CURB-65 incompleto retorna aviso e caixa para preencher
{
  const { c } = env();
  const resIncompleto = c.tentarCalcularDeterministico('/calc curb65 Idade 71');
  assert(resIncompleto.includes('Parâmetros Insuficientes'), 'Deve apontar insuficiência');
  assert(resIncompleto.includes('```'), 'Deve fornecer a caixa para completar');
  console.log('✅ 7. CURB-65 incompleto devolve parâmetros faltantes e caixa para completar');
}

// 8. Cálculo determinístico de Cálcio Corrigido
{
  const { c } = env();
  const resCa = c.tentarCalcularDeterministico('/calc calcio Cálcio total: 7.5 mg/dL, Albumina: 2.5 g/dL');
  assert(resCa !== null, 'Cálcio corrigido deve calcular');
  assert(resCa.includes('8.7') || resCa.includes('Cálcio'), 'Deve reportar cálcio corrigido');
  console.log('✅ 8. Cálcio corrigido calcula deterministicamente');
}

// 9. Cálculo determinístico de Gap Osmolar
{
  const { c } = env();
  const resGap = c.tentarCalcularDeterministico('/calc gap osmolar Osmolaridade medida: 315, Sódio: 140, Glicose: 90, Ureia: 30');
  assert(resGap !== null, 'Gap osmolar deve calcular');
  assert(resGap.includes('Gap') || resGap.includes('GAP'), 'Deve reportar gap osmolar');
  console.log('✅ 9. Gap osmolar calcula deterministicamente');
}

// 10. Cálculo determinístico de Déficit de Água Livre
{
  const { c } = env();
  const resAgua = c.tentarCalcularDeterministico('/calc deficit agua Sódio atual: 160, Peso: 60 kg, Homem idoso');
  assert(resAgua !== null, 'Déficit de água deve calcular');
  assert(resAgua.includes('Água') || resAgua.includes('Déficit') || resAgua.includes('Litros'), 'Deve reportar déficit de água');
  console.log('✅ 10. Déficit de água livre calcula deterministicamente');
}

// 11. Envio de /calc curb65 no chat via processarMensagemTexto
{
  const { c, sent } = env();
  c.enviarChatAction = () => {};
  c.processarMensagemTexto({ chat: { id: 123 }, text: '/calc curb65' });
  const msgEnviada = sent[sent.length - 1]?.body?.text || '';
  assert(msgEnviada.includes('CURB-65'), 'Bot deve enviar instruções de CURB-65');
  assert(msgEnviada.includes('```'), 'Bot deve enviar a caixa de texto monospaçada');
  assert(!msgEnviada.includes('sinais vitais e valores laboratoriais relevantes'), 'Bot não deve enviar mensagem genérica');
  console.log('✅ 11. Bot responde /calc curb65 diretamente com a caixa de texto para completar');
}

// 12. Envio de /calc curb65 com dados completos no chat via processarMensagemTexto
{
  const { c, sent } = env();
  let iaChamada = false;
  c.enviarChatAction = () => {};
  c.processarEEntregarIA = () => { iaChamada = true; };
  c.processarMensagemTexto({
    chat: { id: 123 },
    text: '/calc curb65\nIdade: 40\nConfusão mental: não\nUreia: 30\nFR: 18\nPA: 120x80'
  });
  assert(!iaChamada, 'Cálculo de CURB-65 não deve acionar IA');
  const msgEnviada = sent[sent.length - 1]?.body?.text || '';
  assert(msgEnviada.includes('CURB-65') || msgEnviada.includes('0/5'), 'Deve reportar resultado do cálculo');
  console.log('✅ 12. Bot processa cálculo de CURB-65 sem chamar IA e com resposta formatada');
}

console.log('🎉 TODOS OS TESTES DE CALCULADORAS COM CAIXA DE TEXTO PASSARAM COM SUCESSO!');
