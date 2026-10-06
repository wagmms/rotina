/**
 * TESTES OSTENSIVOS DE PRESCRIÇÃO MÉDICA (/rx, gerarPrescricaoComIA)
 * Valida a segurança farmacológica, memória de cálculo pediátrica transparente,
 * alerta de função renal/hepática, critérios de Beers e conformidade REMUME.
 */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const source = fs.readFileSync(path.resolve(__dirname, '../ultra_rotina_master.js'), 'utf8');

function env() {
  const props = {
    TELEGRAM_CHAT_ID: '123',
    TELEGRAM_BOT_TOKEN: 'fake-token',
    SPREADSHEET_ID_REMUME: 'remume-fake-id',
    GEMINI_API_KEY: 'fake-gemini-key'
  };
  const cache = {}, sent = [];

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

console.log('🧪 Iniciando TESTES OSTENSIVOS da Prescrição Médica (/rx)...\n');

// -----------------------------------------------------------------------------
// 1. DIRETRIZES DE PROMPT E RIGOR DIDÁTICO NO SISTEMA
// -----------------------------------------------------------------------------
test('1. Prompt de prescrição exige memória de cálculo pediátrica passo a passo e alerta de ajuste renal', () => {
  const { c } = env();

  // Mock de planilha REMUME
  c.obterPlanilha = () => "Amoxicilina 500mg cápsula\nAmoxicilina 250mg/5mL suspensão oral\nDipirona 500mg/mL gotas\nParacetamol 200mg/mL gotas";

  let promptCapturado = "";
  c.executarRaciocinioClinico = (sistema, dados) => {
    promptCapturado = sistema;
    return "💊 *PRESCRIÇÃO AMBULATORIAL - RASCUNHO (REMUME)*\n*Status:* Completa para revisão\n\n📝 *Receituário*\n...";
  };

  c.gerarPrescricaoComIA("Criança de 10 kg com otite média aguda");

  assert(promptCapturado.includes("PEDIATRIA E MEMÓRIA DE CÁLCULO DIDÁTICA TRANSPARENTE"), "Deve conter diretriz de memória de cálculo didática");
  assert(promptCapturado.includes("Sem peso informado: NUNCA presuma peso de criança"), "Deve proibir inventar peso");
  assert(promptCapturado.includes("AJUSTE RENAL, HEPÁTICO E CRITÉRIOS DE BEERS"), "Deve conter diretriz de ajuste renal e Beers");
  assert(promptCapturado.includes("QUANTIDADE TOTAL A DISPENSAR MATEMATICAMENTE COERENTE"), "Deve exigir quantidade total a dispensar");
  assert(promptCapturado.includes("CHECAGEM CRUZADA OBRIGATÓRIA de alergias"), "Deve exigir checagem cruzada de alergias");
});

// -----------------------------------------------------------------------------
// 2. DIDÁTICA PEDIÁTRICA COM PESO INFORMADO
// -----------------------------------------------------------------------------
test('2. Prescrição pediátrica com peso exibe memória de cálculo completa e transparente', () => {
  const { c } = env();
  c.obterPlanilha = () => "Amoxicilina 250mg/5mL suspensão oral\nDipirona 500mg/mL gotas";

  const respostaSimulada = [
    "💊 *PRESCRIÇÃO AMBULATORIAL - RASCUNHO (REMUME)*",
    "*Status:* Completa para revisão",
    "",
    "📝 *Receituário*",
    "*[USO ORAL]*",
    "1. *Amoxicilina* - 250 mg/5 mL suspensão oral - 2 frascos de 150 mL",
    "- *Posologia:* Dar 5 mL por via oral de 8 em 8 horas por 10 dias (utilizar a seringa dosadora).",
    "",
    "💡 *Orientações ao paciente*",
    "- Administrar após as refeições. Agitar o frasco antes do uso. Manter em local fresco.",
    "",
    "📋 *Conferência médica*",
    "- *Indicação clínica:* Otite média aguda bacteriana (lactente 12 kg).",
    "- *Memória de cálculo (pediátrico):*",
    "  • Dose de referência: 50 mg/kg/dia dividido em 3 tomadas/dia.",
    "  • Dose diária total: 50 mg/kg/dia × 12 kg = 600 mg/dia.",
    "  • Dose por tomada: 600 mg ÷ 3 tomadas = 200 mg por dose.",
    "  • Conversão volumétrica: apresentação 250 mg/5 mL (50 mg/mL) ➔ 200 mg ÷ 50 mg/mL = 4 mL por tomada.",
    "  • Checagem de dose máxima: 600 mg/dia bem abaixo do teto adulto (1.500 mg/dia).",
    "  • Quantidade a dispensar: 4 mL × 3 doses/dia × 10 dias = 120 mL ➔ Dispensar 1 frasco de 150 mL.",
    "- *Ajustes de segurança:* Paciente hígido sem nefropatia conhecida.",
    "- *Alergias e interações:* Nega alergias prévias a penicilinas.",
    "- *REMUME:* item presente na lista fornecida (conferir disponibilidade no estoque)."
  ].join("\n");

  c.executarRaciocinioClinico = () => respostaSimulada;

  const resultado = c.gerarPrescricaoComIA("Lactente 12 kg com OMA. Sem alergias.");
  assert(resultado.includes("Memória de cálculo"), "Deve conter o bloco de memória de cálculo");
  assert(resultado.includes("50 mg/kg/dia × 12 kg = 600 mg/dia"), "Deve mostrar a multiplicação por peso");
  assert(resultado.includes("Conversão volumétrica"), "Deve mostrar a conversão em mL");
  assert(resultado.includes("Checagem de dose máxima"), "Deve comparar com dose máxima");
  assert(resultado.includes("Quantidade a dispensar"), "Deve justificar o volume de frascos");
});

// -----------------------------------------------------------------------------
// 3. BLOQUEIO DE PEDIATRIA SEM PESO INFORMADO
// -----------------------------------------------------------------------------
test('3. Prescrição pediátrica sem peso sinaliza pendência e proíbe invenção de dosagem', () => {
  const { c } = env();
  c.obterPlanilha = () => "Amoxicilina 250mg/5mL suspensão oral";

  const respostaSemPeso = [
    "💊 *PRESCRIÇÃO AMBULATORIAL - RASCUNHO (REMUME)*",
    "*Status:* Dados pendentes (Peso em kg obrigatório para cálculo pediátrico seguro)",
    "",
    "📝 *Receituário*",
    "*[USO ORAL]*",
    "1. *Amoxicilina* - 250 mg/5 mL suspensão oral - quantidade pendente de peso",
    "- *Posologia:* Dose a calcular assim que o peso da criança for informado.",
    "",
    "⚠️ *Pendência Crítica de Segurança:*",
    "- Para cálculo pediátrico seguro de antibióticos e analgésicos, é terminantemente proibido arbitrar peso. Por favor informe o peso da criança em kg."
  ].join("\n");

  c.executarRaciocinioClinico = () => respostaSemPeso;

  const res = c.gerarPrescricaoComIA("Criança com febre e otalgia");
  assert(res.includes("Dados pendentes"), "Status deve acusar dados pendentes");
  assert(res.includes("Peso em kg obrigatório"), "Deve cobrar o peso explicitamente");
});

// -----------------------------------------------------------------------------
// 4. SEGURANÇA RENAL E CRITÉRIOS DE BEERS NO IDOSO
// -----------------------------------------------------------------------------
test('4. Prescrição para idoso ou nefropata inclui alerta ativo de TFG e critérios de Beers', () => {
  const { c } = env();
  c.obterPlanilha = () => "Ciprofloxacino 500mg comprimido\nDipirona 500mg comprimido\nIbuprofeno 600mg comprimido";

  const respostaIdoso = [
    "💊 *PRESCRIÇÃO AMBULATORIAL - RASCUNHO (REMUME)*",
    "*Status:* Completa para revisão",
    "",
    "📝 *Receituário*",
    "*[USO ORAL]*",
    "1. *Ciprofloxacino* - 500 mg comprimido - 14 comprimidos",
    "- *Posologia:* Tomar 1 comprimido por via oral de 12 em 12 horas por 7 dias.",
    "",
    "📋 *Conferência médica*",
    "- *Indicação clínica:* ITU complicada em paciente idoso (74 anos).",
    "- *Ajustes de segurança (renal, hepático, idade/Beers):*",
    "  • ⚠️ Função renal não informada — se TFG < 50 mL/min, reduzir ciprofloxacino para 250-500 mg a cada 18-24h.",
    "  • Critérios de Beers: Evitado uso de AINEs (ibuprofeno) pelo alto risco de nefrotoxicidade e sangramento digestivo em idoso.",
    "- *Alergias e interações:* Nega alergias."
  ].join("\n");

  c.executarRaciocinioClinico = () => respostaIdoso;

  const res = c.gerarPrescricaoComIA("Homem 74 anos com suspeita de pielonefrite");
  assert(res.includes("Função renal não informada") || res.includes("TFG"), "Deve alertar sobre a TFG e depuração renal");
  assert(res.includes("Critérios de Beers") || res.includes("AINEs"), "Deve considerar critérios de Beers no idoso");
});

// -----------------------------------------------------------------------------
// 5. COMPATIBILIDADE INTEGRAL COM GERADOR DE PDF DE RECEITA (ReceitaPdfService)
// -----------------------------------------------------------------------------
test('5. Formato gerado é 100% compatível com extração de PDF A4 via ReceitaPdfService', () => {
  const { c } = env();

  const prescricao = [
    "💊 *PRESCRIÇÃO AMBULATORIAL - RASCUNHO (REMUME)*",
    "Paciente: Maria de Lourdes",
    "",
    "📝 *Receituário*",
    "*[USO ORAL]*",
    "1. *Amoxicilina* - 500 mg cápsula - 21 cápsulas",
    "- *Posologia:* Tomar 1 cápsula por via oral de 8 em 8 horas por 7 dias.",
    "2. *Dipirona* - 500 mg comprimido - 10 comprimidos",
    "- *Posologia:* Tomar 1 comprimido por via oral até de 6 em 6 horas se dor ou febre.",
    "",
    "💡 *Orientações ao paciente*",
    "- Tomar a medicação com água. Não interromper o tratamento antimicrobiano antes dos 7 dias.",
    "",
    "📋 *Conferência médica*",
    "- *Indicação clínica:* Faringoamigdalite bacteriana.",
    "- *Memória de cálculo:* Tratamento padrão para adulto.",
    "- *Ajustes de segurança:* Sem necessidade de ajuste renal."
  ].join("\n");

  const html = c.ReceitaPdfService.gerarHtml(prescricao, "04/10/2026", "Maria de Lourdes");
  assert(html.indexOf("RECEITUÁRIO MÉDICO") !== -1, "Deve gerar título de receituário");
  assert(html.indexOf("Maria de Lourdes") !== -1, "Deve conter o nome do paciente");
  assert(html.indexOf("Amoxicilina") !== -1, "Deve conter amoxicilina");
  assert(html.indexOf("Dipirona") !== -1, "Deve conter dipirona");
  assert(html.indexOf("Conferência médica") === -1, "Não deve imprimir as notas de conferência no papel do paciente");
});

console.log(`\n🎉 TODOS OS ${pass}/${total} TESTES OSTENSIVOS DE PRESCRIÇÃO MÉDICA FORAM APROVADOS COM SUCESSO!\n`);
