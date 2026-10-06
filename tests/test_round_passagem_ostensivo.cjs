/**
 * TESTES OSTENSIVOS DE ROUND E PASSAGEM DE PLANTÃO (/round, /passagem)
 * Valida o Pitch Executivo SNAPPS (60-90s), a sabatina socrática com defesa de conduta,
 * o checklist FAST-HUG, controle de antimicrobianos (D+?) e dispositivos invasivos.
 */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const source = fs.readFileSync(path.resolve(__dirname, '../ultra_rotina_master.js'), 'utf8');

function env() {
  const props = {
    TELEGRAM_CHAT_ID: '123',
    TELEGRAM_BOT_TOKEN: 'fake-token',
    GEMINI_API_KEY: 'fake-gemini-key'
  };
  const cache = {};

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
    Buffer, console: { log() {}, error() {} },
    PropertiesService: { getScriptProperties: () => p },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] ?? null, put: (k, v) => { cache[k] = String(v); }, remove: k => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }), getUserLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    HtmlService: { createHtmlOutput: body => ({ body }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: body => ({ body, setMimeType() { return this; } }) },
    ScriptApp: { getProjectTriggers: () => [] },
    UrlFetchApp: {
      fetch: (url, opts) => ({ getResponseCode: () => 200, getContentText: () => '{"ok":true}' })
    }
  };

  vm.createContext(c);
  vm.runInContext(source, c);
  c.Utilities = {
    getUuid: () => '00000000000000000000000000000001',
    sleep: () => {},
    base64Decode: str => Buffer.from(str, 'base64'),
    base64Encode: bytes => Buffer.from(bytes).toString('base64'),
    newBlob: (b, m, n) => ({ getBytes: () => b, getContentType: () => m, getName: () => n })
  };

  return { c, props, cache };
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

console.log('🧪 Iniciando TESTES OSTENSIVOS de Round (/round) e Passagem SBAR (/passagem)...\n');

// -----------------------------------------------------------------------------
// 1. DIRETRIZES DO SBAR DE PASSAGEM DE PLANTÃO
// -----------------------------------------------------------------------------
test('1. Prompt do SBAR exige FAST-HUG, dias de antimicrobiano e previsão de retirada de invasões', () => {
  const { c } = env();

  let promptCapturado = "";
  c.executarRaciocinioClinico = (sistema, dados) => {
    promptCapturado = sistema;
    return "🏥 *SBAR - PASSAGEM DE PLANTÃO*\n*Status:* Estável\n\n📍 *S - Situação*\n...";
  };

  c.gerarPassagemPlantaoSBAR("Leito 14, Sr. João 68a, D4 de PAC");

  assert(promptCapturado.includes("SEGURANÇA DE LEITO & FAST-HUG OBRIGATÓRIOS"), "Deve conter diretriz de segurança e FAST-HUG");
  assert(promptCapturado.includes("Foco infeccioso, antimicrobianos em curso e dia exato de tratamento (D+?)"), "Deve exigir dia de ATB");
  assert(promptCapturado.includes("Invasões e dispositivos (CVC, PAI, SVD, SNE, dreno, TOT/traqueo)"), "Deve exigir controle de invasões");
  assert(promptCapturado.includes("Profilaxia de TEV (química/mecânica)"), "Deve exigir profilaxia de TEV");
  assert(promptCapturado.includes("Gatilhos de intercorrência devem ser operacionais"), "Deve exigir gatilhos com parâmetros numéricos");
});

// -----------------------------------------------------------------------------
// 2. DIRETRIZES DO PITCH DO ROUND (MODELO SNAPPS / 60-90s)
// -----------------------------------------------------------------------------
test('2. Prompt do Round exige Pitch Executivo de 60-90s, checklist de leito e 3 perguntas socráticas', () => {
  const { c } = env();

  let promptCapturado = "";
  c.executarRaciocinioClinico = (sistema, dados) => {
    promptCapturado = sistema;
    return "🎤 *PITCH DO ROUND & SABATINA (60-90s)*\n...";
  };

  c.gerarPitchERoundComIA("Leito 08, Maria 55a com DPOC descompensado");

  assert(promptCapturado.includes("PITCH DO ROUND E PRECEPTORIA SOCRÁTICA (MODELO SNAPPS / FMRP-USP)"), "Deve declarar modelo SNAPPS/FMRP-USP");
  assert(promptCapturado.includes("Pitch Executivo oral de 60 a 90 segundos"), "Deve exigir pitch executivo oral");
  assert(promptCapturado.includes("Checklist de leito obrigatório: antimicrobianos (D+?), dispositivos invasivos e profilaxias"), "Deve exigir checklist de leito");
  assert(promptCapturado.includes("Sabatina socrática: 3 perguntas discriminantes"), "Deve exigir 3 perguntas da sabatina");
  assert(promptCapturado.includes("NÃO forneça gabarito de imediato"), "Deve estimular a resposta ativa de Wagner");
});

// -----------------------------------------------------------------------------
// 3. EXECUÇÃO DO SBAR COM DADOS CLÍNICOS E FORMATO VISUAL
// -----------------------------------------------------------------------------
test('3. Passagem SBAR estrutura e entrega avaliação por sistemas e checklist FAST-HUG', () => {
  const { c } = env();

  const mockSbar = [
    "🏥 *SBAR - PASSAGEM DE PLANTÃO*",
    "*Status:* Em vigilância | *Risco do plantão:* moderado (desmame de O2)",
    "",
    "📍 *S - Situação*",
    "- *Leito / paciente:* Leito 12, M.S.A., 71a, masc",
    "- *DIH:* D5",
    "- *Diagnóstico principal:* Pneumonia adquirida na comunidade grave",
    "- *Status atual:* Eupneico em cateter nasal a 2 L/min, afebril há 48h",
    "",
    "📜 *B - Contexto*",
    "- *Admissão e evolução:* Admitido por sepse pulmonar, recebido Ceftriaxona + Claritromicina",
    "- *Comorbidades:* HAS, DM2",
    "- *Alergias:* Não informado",
    "- *Limitação de suporte / isolamento:* Suporte total",
    "",
    "🩺 *A - Avaliação por sistemas & Segurança*",
    "- *Neuro:* LOTE, Glasgow 15, CAM-ICU negativo",
    "- *Cardio / hemodinâmica:* PA 130x80, FC 76 bpm, sem DVA",
    "- *Resp:* FR 18 irpm, SpO2 96% em CN 2 L/min",
    "- *Gastro / nutrição:* Dieta branda para diabético com boa aceitação",
    "- *Renal / balanço:* Diurese 1,2 mL/kg/h, BH 24h +300 mL, Creatinina 0,9",
    "- *Infeccioso & Terapia Antimicrobiana:* Foco pulmonar, Ceftriaxona D5/7 e Claritromicina D5/7, Tax 36,4°C",
    "- *Dispositivos & Invasões:* CVP em MSE D2, sem CVC ou SVD",
    "- *Profilaxias (FAST-HUG):* Enoxaparina 40 mg SC 1x/dia, sem IBP",
    "- *Exames relevantes:* Leucócitos 8.200 sem desvio, PCR em queda (24 mg/L)",
    "",
    "🚨 *R - Recomendações e gatilhos*",
    "- *Pendências do próximo plantão:* Rx tórax de controle amanha",
    "- *Gatilhos de intercorrência:* Se SpO2 < 92% aumentar O2; se Tax > 37,8°C hemoculturas",
    "- *Planejamento terapêutico:* Testar desmame de O2 para ar ambiente hoje à tarde"
  ].join("\n");

  c.executarRaciocinioClinico = () => mockSbar;

  const res = c.gerarPassagemPlantaoSBAR("Caso do leito 12");
  assert(res.includes("SBAR - PASSAGEM DE PLANTÃO"), "Deve conter título SBAR");
  assert(res.includes("Ceftriaxona D5/7"), "Deve conter dia de antimicrobiano");
  assert(res.includes("Profilaxias (FAST-HUG)"), "Deve conter profilaxia");
  assert(res.includes("Gatilhos de intercorrência"), "Deve conter gatilhos operacionais");
});

// -----------------------------------------------------------------------------
// 4. EXECUÇÃO DO PITCH DO ROUND COM SABATINA SOCRÁTICA
// -----------------------------------------------------------------------------
test('4. Pitch do Round entrega fala executiva pronta, checklist e 3 perguntas discriminantes', () => {
  const { c } = env();

  const mockRound = [
    "🎤 *PITCH DO ROUND & SABATINA (60-90s)*",
    "",
    "🗣️ *1. Pitch Executivo Sugerido (para falar na frente da equipe):*",
    "\"Paciente do Leito 12, 71 anos, no quinto dia de internação por pneumonia comunitária grave. Nas últimas 24 horas manteve estabilidade hemodinâmica sem drogas vasoativas, curva térmica afebril e balanço hídrico equilibrado. Completa hoje D5 de ceftriaxona e claritromicina com melhora clínica e queda de provas inflamatórias. A proposta para hoje é testar desmame do oxigênio para ar ambiente e programar alta hospitalar em 48 horas se mantiver estabilidade.\"",
    "",
    "🛡️ *2. Checklist de Segurança do Leito:*",
    "- *Antimicrobiano:* Ceftriaxona + Claritromicina D5/7 (programado término com 7 dias)",
    "- *Dispositivos Invasivos:* Acesso venoso periférico exclusivo, sem cateteres centrais ou sondas",
    "- *Profilaxias:* TEV química ativa (enoxaparina 40 mg SC)",
    "",
    "🔍 *3. Ponto Crítico a Conferir:*",
    "- Critérios de transição para antimicrobiano oral ou descontinuação com 5 vs 7 dias.",
    "",
    "🎯 *4. Sabatina Socrática (Defenda sua conduta):*",
    "1) *Fisiopatologia/Diagnóstico:* Quais critérios objetivos indicam que a resposta inflamatória foi superada e permitem definir a duração do antibiótico em 5 ou 7 dias?",
    "2) *Farmacologia/Conduta:* Por que a associação inicial de betalactâmico com macrolídeo é mandatória na PAC grave hospitalizada em vez de monoterapia?",
    "3) *Critério de Alta/Intercorrência:* Qual é o tempo mínimo de estabilidade clínica em ar ambiente exigido para alta segura desse paciente idoso?",
    "",
    "💬 _Responda no chat ou por áudio; em seguida dou o feedback do seu raciocínio e, se solicitar, o gabarito das diretrizes._"
  ].join("\n");

  c.executarRaciocinioClinico = () => mockRound;

  const resRound = c.gerarPitchERoundComIA("Caso Leito 12 para o round");
  assert(resRound.includes("PITCH DO ROUND"), "Deve conter título do Round");
  assert(resRound.includes("Pitch Executivo Sugerido"), "Deve conter o pitch oral pronto");
  assert(resRound.includes("Checklist de Segurança do Leito"), "Deve conter checklist de leito");
  assert(resRound.includes("Sabatina Socrática"), "Deve conter a sabatina");
  assert(resRound.includes("Fisiopatologia/Diagnóstico") && resRound.includes("Farmacologia/Conduta"), "Deve conter os pilares socráticos");
});

console.log(`\n🎉 TODOS OS ${pass}/${total} TESTES DE ROUND E PASSAGEM FORAM APROVADOS COM SUCESSO!\n`);
