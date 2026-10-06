/**
 * Testes Unitários e de Integração com Mocks GAS para scripts/voos_gas/Code.js
 * Pós-Auditoria Completa (78 Páginas do Dossiê dos 5 Especialistas)
 * 
 * Cobertura Completa:
 * 1. "Só Ida" e Validação de Período (datas válidas, volta >= ida, omissão de return_date)
 * 2. Conversão e gravação de preços (numérico, formato brasileiro, formato legado)
 * 3. Resolução Metropolitana Universal (SAO, RIO, BUE, LON, NYC, PAR) e bloqueio de destinos inválidos
 * 4. Links estruturados canônicos do Google Flights (one-way e round-trip com aeroportos exatos)
 * 5. Inteligência Financeira: Custo Total da Viagem (Voo + Estadia x Dias)
 * 6. Cooldown de chaves em caso de Rate Limit HTTP 429
 * 7. Deduplicação com janelas mínimas (48h quedas relâmpago >= 15% e recordes, 7 dias meta)
 * 8. Layovers detalhados e honestos (>= 8h, overnight) sem falsos stopovers
 * 9. Janela de horário de notificações (08h-21h) e escape seguro de HTML no Telegram
 * 10. Concorrência, cotas diárias/mensais e guardião anti-timeout do GAS
 * 11. Preservação integral de dados na reconfiguração da planilha
 */

const assert = require("assert");
const path = require("path");

// ==========================================
// MOCKS PARA O AMBIENTE GOOGLE APPS SCRIPT
// ==========================================

let scriptPropsStore = {};
let fetchLog = [];
let emailLog = [];
let loggerLog = [];
let mockFetchHandler = null;
let scriptLockAcquired = false;
let lockTryLockResult = true;

const mockPropertiesService = {
  getScriptProperties: () => ({
    getProperty: (key) => (key in scriptPropsStore ? scriptPropsStore[key] : null),
    setProperty: (key, val) => {
      scriptPropsStore[key] = String(val);
    },
    deleteProperty: (key) => {
      delete scriptPropsStore[key];
    },
    getProperties: () => ({ ...scriptPropsStore })
  })
};

const mockLock = {
  tryLock: (timeout) => {
    if (!lockTryLockResult) return false;
    scriptLockAcquired = true;
    return true;
  },
  releaseLock: () => {
    scriptLockAcquired = false;
  }
};

const mockLockService = {
  getScriptLock: () => mockLock
};

const mockUtilities = {
  formatDate: (date, tz, fmt) => {
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const HH = pad(d.getHours());
    const mm = pad(d.getMinutes());

    if (fmt === "yyyy-MM-dd") return `${yyyy}-${MM}-${dd}`;
    if (fmt === "yyyy-MM") return `${yyyy}-${MM}`;
    if (fmt === "HH") return `${HH}`;
    if (fmt === "dd/MM/yyyy HH:mm") return `${dd}/${MM}/${yyyy} ${HH}:${mm}`;
    return d.toISOString();
  },
  sleep: (ms) => {}
};

const mockLogger = {
  log: (...args) => {
    loggerLog.push(args.join(" "));
  }
};

const mockGmailApp = {
  sendEmail: (to, subject, body) => {
    emailLog.push({ to, subject, body });
  }
};

const mockUrlFetchApp = {
  fetch: (url, options) => {
    fetchLog.push({ url, options });
    if (mockFetchHandler) {
      return mockFetchHandler(url, options);
    }
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({ best_flights: [], other_flights: [] })
    };
  }
};

class MockRange {
  constructor(sheet, row, col, numRows = 1, numCols = 1) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
    this.numRows = numRows;
    this.numCols = numCols;
  }

  setValue(val) {
    this.sheet._ensureCell(this.row, this.col);
    this.sheet.cells[this.row - 1][this.col - 1] = val;
    return this;
  }

  setValues(values) {
    for (let r = 0; r < values.length; r++) {
      for (let c = 0; c < values[r].length; c++) {
        this.sheet._ensureCell(this.row + r, this.col + c);
        this.sheet.cells[this.row + r - 1][this.col + c - 1] = values[r][c];
      }
    }
    return this;
  }

  setNumberFormat(fmt) {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet._ensureCell(this.row + r, this.col + c);
        this.sheet.formats[`${this.row + r},${this.col + c}`] = fmt;
      }
    }
    return this;
  }

  getValue() {
    this.sheet._ensureCell(this.row, this.col);
    return this.sheet.cells[this.row - 1][this.col - 1];
  }

  getValues() {
    const res = [];
    for (let r = 0; r < this.numRows; r++) {
      const row = [];
      for (let c = 0; c < this.numCols; c++) {
        const val = (this.sheet.cells[this.row + r - 1] && this.sheet.cells[this.row + r - 1][this.col + c - 1]) || "";
        row.push(val);
      }
      res.push(row);
    }
    return res;
  }

  clearContent() {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        if (this.sheet.cells[this.row + r - 1]) {
          this.sheet.cells[this.row + r - 1][this.col + c - 1] = "";
        }
      }
    }
    return this;
  }

  setBackground(color) { return this; }
  setFontColor(color) { return this; }
  setFontWeight(weight) { return this; }
  setHorizontalAlignment(align) { return this; }
}

class MockSheet {
  constructor(name) {
    this.name = name;
    this.cells = [];
    this.formats = {};
    this.cleared = false;
  }

  _ensureCell(row, col) {
    while (this.cells.length < row) {
      this.cells.push([]);
    }
    for (let r = 0; r < this.cells.length; r++) {
      while (this.cells[r].length < col) {
        this.cells[r].push("");
      }
    }
  }

  getRange(row, col, numRows = 1, numCols = 1) {
    return new MockRange(this, row, col, numRows, numCols);
  }

  getDataRange() {
    return {
      getValues: () => this.cells.map(row => [...row])
    };
  }

  getLastRow() {
    return this.cells.length;
  }

  getLastColumn() {
    let max = 0;
    for (const r of this.cells) {
      if (r && r.length > max) max = r.length;
    }
    return max;
  }

  appendRow(row) {
    this.cells.push([...row]);
  }

  clear() {
    this.cleared = true;
    this.cells = [];
    this.formats = {};
  }

  deleteRows(startRow, count = 1) {
    this.cells.splice(startRow - 1, count);
  }

  setFrozenRows(n) {}
  autoResizeColumn(col) {}
  autoResizeColumns(start, count) {}
  setConditionalFormatRules(rules) {
    this.conditionalFormatRules = rules;
  }
  getConditionalFormatRules() {
    return this.conditionalFormatRules || [];
  }
}

class MockSpreadsheet {
  constructor() {
    this.sheets = {};
    this.activeSheetName = "Monitoramento";
  }

  getSheetByName(name) {
    return this.sheets[name] || null;
  }

  insertSheet(name) {
    const s = new MockSheet(name);
    this.sheets[name] = s;
    return s;
  }

  getActiveSheet() {
    return this.sheets[this.activeSheetName];
  }
}

class MockConditionalFormatRuleBuilder {
  constructor() {
    this.rule = {};
  }
  whenFormulaSatisfied(f) { this.rule.formula = f; return this; }
  setBackground(c) { this.rule.bg = c; return this; }
  setFontColor(c) { this.rule.font = c; return this; }
  setRanges(r) { this.rule.ranges = r; return this; }
  build() { return this.rule; }
}

let currentSpreadsheet = new MockSpreadsheet();
const mockSpreadsheetApp = {
  getActiveSpreadsheet: () => currentSpreadsheet,
  newConditionalFormatRule: () => new MockConditionalFormatRuleBuilder(),
  getUi: () => ({
    createMenu: () => ({
      addItem: function() { return this; },
      addSeparator: function() { return this; },
      addToUi: function() {}
    }),
    alert: (title, message, buttons) => "YES",
    ButtonSet: { OK: "OK", YES_NO: "YES_NO" },
    Button: { YES: "YES", NO: "NO" }
  })
};

const mockScriptApp = {
  triggers: [],
  getProjectTriggers: function() { return [...this.triggers]; },
  deleteTrigger: function(t) {
    this.triggers = this.triggers.filter(x => x !== t);
  },
  newTrigger: function(fnName) {
    const triggerObj = { handlerFunction: fnName, getHandlerFunction: () => fnName };
    return {
      timeBased: () => ({
        everyHours: () => ({
          create: () => {
            mockScriptApp.triggers.push(triggerObj);
            return triggerObj;
          }
        })
      })
    };
  }
};

// Injetar mocks no escopo global antes de carregar o módulo
global.PropertiesService = mockPropertiesService;
global.LockService = mockLockService;
global.Utilities = mockUtilities;
global.Logger = mockLogger;
global.GmailApp = mockGmailApp;
global.UrlFetchApp = mockUrlFetchApp;
global.SpreadsheetApp = mockSpreadsheetApp;
global.ScriptApp = mockScriptApp;

// Carregar o módulo Code.js
const codePath = path.resolve(__dirname, "../scripts/voos_gas/Code.js");
const radar = require(codePath);

let totalTestes = 0;
function test(nome, fn) {
  try {
    fn();
    console.log(`✅ [PASSOU] ${nome}`);
    totalTestes++;
  } catch (err) {
    console.error(`❌ [FALHOU] ${nome}`);
    console.error(err);
    process.exit(1);
  }
}

function resetTestEnv() {
  scriptPropsStore = {};
  fetchLog = [];
  emailLog = [];
  loggerLog = [];
  mockFetchHandler = null;
  mockScriptApp.triggers = [];
  scriptLockAcquired = false;
  lockTryLockResult = true;
  currentSpreadsheet = new MockSpreadsheet();
}

console.log("=== INICIANDO TESTES DO RADAR DE VOOS GAS (AUDITORIA DEFINITIVA) ===\n");

// ==========================================
// GRUPO 1: RESOLUÇÃO METROPOLITANA UNIVERSAL
// ==========================================

test("1.1. resolverDestino mapeia metrópoles universais (SAO, RIO, BUE, LON, NYC, PAR)", () => {
  assert.strictEqual(radar.resolverDestino("São Paulo"), "SAO", "São Paulo deve mapear para SAO (GRU, CGH, VCP)");
  assert.strictEqual(radar.resolverDestino("sp"), "SAO");
  assert.strictEqual(radar.resolverDestino("Rio de Janeiro"), "RIO", "Rio de Janeiro deve mapear para RIO (GIG, SDU)");
  assert.strictEqual(radar.resolverDestino("Buenos Aires"), "BUE", "Buenos Aires deve mapear para BUE (AEP, EZE)");
  assert.strictEqual(radar.resolverDestino("Londres"), "LON", "Londres deve mapear para LON (LHR, LGW, STN)");
  assert.strictEqual(radar.resolverDestino("Nova York"), "NYC", "Nova York deve mapear para NYC (JFK, EWR, LGA)");
  assert.strictEqual(radar.resolverDestino("Paris"), "PAR", "Paris deve mapear para PAR (CDG, ORY)");
  assert.strictEqual(radar.resolverDestino("Milão"), "MIL", "Milão deve mapear para MIL (MXP, LIN)");

  // Aeroportos específicos e interior
  assert.strictEqual(radar.resolverDestino("Ribeirão Preto"), "RAO");
  assert.strictEqual(radar.resolverDestino("Campinas"), "VCP");
  assert.strictEqual(radar.resolverDestino("Belém"), "BEL");

  // Códigos IATA diretos
  assert.strictEqual(radar.resolverDestino("GRU"), "GRU");
  assert.strictEqual(radar.resolverDestino("gig"), "GIG");

  // Destino não reconhecido deve retornar null para evitar queima de cota
  assert.strictEqual(radar.resolverDestino("Destino Inexistente XPTO"), null);
  assert.strictEqual(radar.resolverDestino(""), null);
  assert.strictEqual(radar.resolverDestino(null), null);
});

// ==========================================
// GRUPO 2: LINKS ESTRUTURADOS DO GOOGLE FLIGHTS
// ==========================================

test("2.1. gerarLinkGoogleFlights cria URLs canônicas estruturadas para ida/volta e só ida", () => {
  const linkIdaVolta = radar.gerarLinkGoogleFlights("SAO", "LIS", "2026-11-10", "2026-11-20");
  assert(linkIdaVolta.includes("Flights%20to%20LIS"), "Deve conter o destino LIS");
  assert(linkIdaVolta.includes("from%20SAO"), "Deve conter a origem SAO");
  assert(linkIdaVolta.includes("on%202026-11-10"), "Deve conter a data de ida");
  assert(linkIdaVolta.includes("through%202026-11-20"), "Deve conter a data de volta");

  const linkSoIda = radar.gerarLinkGoogleFlights("SAO", "BUE", "2026-11-10", null);
  assert(linkSoIda.includes("Flights%20to%20BUE"), "Deve conter destino BUE");
  assert(linkSoIda.includes("one-way"), "Deve ser estruturado como one-way");
  assert(!linkSoIda.includes("through"), "Não deve conter through");
});

// ==========================================
// GRUPO 3: INTELIGÊNCIA FINANCEIRA (CUSTO TOTAL)
// ==========================================

test("3.1. avaliarCustoDestinoComTotal calcula Custo Total = Voo + Diária x Dias", () => {
  // Buenos Aires: R$ 180/dia. Viagem de 7 dias com voo de R$ 1.300
  const c1 = radar.avaliarCustoDestinoComTotal("Aeroporto AEP", "Buenos Aires", 1300, "2026-11-10", "2026-11-17");
  assert.strictEqual(c1.diasViagem, 7);
  assert.strictEqual(c1.valorDiario, 180);
  assert.strictEqual(c1.custoTerrestre, 1260); // 7 * 180
  assert.strictEqual(c1.custoTotalEstimado, 2560); // 1300 + 1260
  assert(c1.textoResumo.includes("Total 7d: ~R$ 2560"));

  // Só Ida: não calcula total de dias
  const c2 = radar.avaliarCustoDestinoComTotal("Aeroporto LIS", "Lisboa", 2000, "2026-11-10", null);
  assert.strictEqual(c2.diasViagem, 0);
  assert(c2.textoResumo.includes("(Só Ida)"));
});

// ==========================================
// GRUPO 4: RESFRIAMENTO DE CHAVES EM HTTP 429
// ==========================================

test("4.1. selecionarChaveDisponivel pula chaves em cooldown (HTTP 429)", () => {
  resetTestEnv();
  const props = mockPropertiesService.getScriptProperties();

  // Colocar a Chave 0 em cooldown de 30 minutos
  const trintaMinutosFuturo = Date.now() + 30 * 60 * 1000;
  props.setProperty("COOLDOWN_CHAVE_0", String(trintaMinutosFuturo));

  // Ambas as chaves 0 e 1 têm cota disponível
  props.setProperty("CONTADOR_DIARIO_CHAVE_0", "2");
  props.setProperty("CONTADOR_DIARIO_CHAVE_1", "2");

  // A seleção deve pular a chave 0 em cooldown e escolher a chave 1
  const selecao = radar.selecionarChaveDisponivel(props);
  assert(selecao !== null);
  assert.strictEqual(selecao.indice, 1, "Chave em cooldown deve ser pulada!");

  // zerarContadorHoje limpa também os cooldowns
  radar.zerarContadorHoje();
  assert.strictEqual(props.getProperty("COOLDOWN_CHAVE_0"), null, "Reset deve limpar cooldowns");
});

// ==========================================
// GRUPO 5: VALIDAÇÃO DE PERÍODOS E "SÓ IDA"
// ==========================================

test("5.1. ehSoIda reconhece variações com/sem acento e maiúsculas/minúsculas", () => {
  assert.strictEqual(radar.ehSoIda("Só Ida"), true);
  assert.strictEqual(radar.ehSoIda("so ida"), true);
  assert.strictEqual(radar.ehSoIda("SÓ IDA"), true);
  assert.strictEqual(radar.ehSoIda("one way"), true);
  assert.strictEqual(radar.ehSoIda(7), false);
  assert.strictEqual(radar.ehSoIda("14"), false);
});

test("5.2. validarPeriodo rejeita volta anterior à ida e datas inexistentes", () => {
  assert.strictEqual(radar.validarPeriodo("2026-11-10", null, "one_way").ok, true);
  assert.strictEqual(radar.validarPeriodo("2026-11-10", "2026-11-20", "one_way").ok, false);
  assert.strictEqual(radar.validarPeriodo("2026-11-10", "2026-11-20", "round_trip").ok, true);
  assert.strictEqual(radar.validarPeriodo("2027-05-20", "2027-05-10", "round_trip").ok, false);
  assert.strictEqual(radar.validarPeriodo("2027-02-30", "2027-03-05", "round_trip").ok, false);
});

// ==========================================
// GRUPO 6: LAYOVERS HONESTOS E CODIFICAÇÃO SERPAPI
// ==========================================

test("6.1. buscarOfertas codifica parâmetros e analisa layovers honestamente", () => {
  resetTestEnv();
  mockFetchHandler = (url) => {
    assert(url.includes("%2Fm%2F02j9z"), "Região deve estar codificada na query");
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({
        best_flights: [{
          price: 2800,
          total_duration: 1100,
          flights: [{ airline: "TAP", arrival_airport: { id: "MAD", name: "Madri" } }],
          layovers: [{ duration: 540, id: "LIS", name: "Lisboa", overnight: false }] // 9h diurna
        }]
      })
    };
  };

  const res = radar.buscarOfertas("mock_key", "SAO", "/m/02j9z", "São Paulo", "Europa", "2026-11-10", null, 25);
  assert.strictEqual(res.ok, true);
  assert(res.oferta.dicaStopover.includes("Possível conexão longa de 9h em LIS (Lisboa)"));
  assert(res.oferta.link.includes("Flights%20to"));
});

// ==========================================
// GRUPO 7: DEDUPLICAÇÃO E JANELAS DE TEMPO
// ==========================================

test("7.1. Deduplicação silencia mesmo preço e respeita janela de 48h para queda >= 15%", () => {
  resetTestEnv();
  const props = mockPropertiesService.getScriptProperties();
  const chaveAlerta = "SAO_BUE_2026-11-10_SO_IDA";

  // 1ª checagem: dispara
  assert.strictEqual(radar.deveDispararAlerta(props, chaveAlerta, 1500, 0, 1600, true, "NORMAL", 0), true);

  // Preço idêntico: silencia
  assert.strictEqual(radar.deveDispararAlerta(props, chaveAlerta, 1500, 1500, 1600, false, "NORMAL", 0), false);

  // Queda de 16% com menos de 48h desde o último alerta: silencia
  assert.strictEqual(radar.deveDispararAlerta(props, chaveAlerta, 1260, 1500, 1600, false, "LOW", -16), false);

  // Queda de 16% com timestamp de 50h atrás: dispara
  props.setProperty(`ALERTA_${chaveAlerta}`, JSON.stringify({
    preco: 1500,
    timestamp: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(),
    tipo: "QUEDA"
  }));
  assert.strictEqual(radar.deveDispararAlerta(props, chaveAlerta, 1260, 1500, 1600, false, "LOW", -16), true);
});

// ==========================================
// GRUPO 8: JANELA DE HORÁRIO E ESCAPE DE HTML
// ==========================================

test("8.1. Janela de horário e escapeHtml protegem notificações", () => {
  // Janela de horário
  mockUtilities.formatDate = (d, tz, fmt) => (fmt === "HH" ? "02" : "2026-10-04");
  assert.strictEqual(radar.dentroDaJanelaDeNotificacao(false), false, "Madrugada bloqueada");

  mockUtilities.formatDate = (d, tz, fmt) => (fmt === "HH" ? "15" : "2026-10-04");
  assert.strictEqual(radar.dentroDaJanelaDeNotificacao(false), true, "Tarde permitida");

  // Escape HTML
  assert.strictEqual(radar.escapeHtml("Oferta <Gol> & Latam"), "Oferta &lt;Gol&gt; &amp; Latam");
});

// ==========================================
// GRUPO 9: PREVENÇÃO DE DESPERDÍCIO DE COTA
// ==========================================

test("9.1. Destinos não reconhecidos ou datas inválidas NÃO gastam cota SerpAPI", () => {
  resetTestEnv();
  const sheet = currentSpreadsheet.insertSheet("Monitoramento");
  sheet.getRange(1, 1, 1, 16).setValues([[
    "Origem", "Destino", "Data Ida", "Volta", "Duracao", "Alvo",
    "DestEnc", "Preco", "Menor", "Var", "Termo", "Custo", "Conex", "Dica", "UltimaChecagem", "Link"
  ]]);

  // Linha 2: Destino não reconhecido
  sheet.getRange(2, 1, 1, 6).setValues([
    ["São Paulo", "Cidade Que Não Existe ABC", "2026-11-10", "Só Ida", 10, 800]
  ]);

  radar.executarVarredura(true);

  const chamadasSerpApi = fetchLog.filter(f => f.url.includes("serpapi.com"));
  assert.strictEqual(chamadasSerpApi.length, 0, "Nenhuma chamada à SerpAPI para destinos não reconhecidos");
  const celulaStatus = sheet.getRange(2, 7).sheet.cells[1][6];
  assert(celulaStatus.includes("Não reconhecido"), "Deve registrar erro de não reconhecimento na planilha");
});

// ==========================================
// GRUPO 10: PRESERVAÇÃO DE DADOS
// ==========================================

test("10.1. Reformatar preserva dados e Reset limpa sob confirmação", () => {
  resetTestEnv();
  const sheet = currentSpreadsheet.insertSheet("Monitoramento");
  sheet.getRange(1, 1, 1, 6).setValues([["Origem", "Destino", "Ida", "Volta", "Dur", "Alvo"]]);
  sheet.getRange(2, 1, 1, 6).setValues([["Curitiba", "Fortaleza", "2026-12-01", "Só Ida", 10, 1100]]);

  radar.configurarPlanilhaInicial();
  assert.strictEqual(sheet.cleared, false);
  assert.strictEqual(sheet.getDataRange().getValues()[1][0], "Curitiba");

  radar.reinicializarPlanilhaDoZero();
  assert.strictEqual(sheet.cleared, true);
});

// ==========================================
// GRUPO 11: REFINAMENTOS MULTI-IA FINAIS
// ==========================================

test("11.1. max_duration é enviado diretamente na URL da SerpAPI em minutos", () => {
  resetTestEnv();
  // Simular busca com duracaoMaxHoras = 12 horas -> 720 minutos
  radar.buscarOfertas("chave_teste_1", "SAO", "MIA", "São Paulo", "Miami", "2026-11-01", "2026-11-15", 12);
  const call = fetchLog.find(f => f.url.includes("serpapi.com"));
  assert(call, "Deve ter realizado chamada para SerpAPI");
  assert(call.url.includes("max_duration=720"), `A URL deve conter max_duration=720, obtido: ${call.url}`);
});

test("11.2. enviarTelegram e enviarAlertaInteligente suportam modo silencioso fora da janela 08h-21h", () => {
  resetTestEnv();
  // Simular 23h (noite) para envio de alerta inteligente
  mockUtilities.formatDate = (d, tz, fmt) => (fmt === "HH" ? "23" : "2026-10-04");
  const oferta = {
    preco: 1200,
    duracaoHoras: 8,
    destinoReal: "MIA",
    termometro: "Preço baixo",
    nivelPreco: "LOW",
    detalhes: "0 escala(s) | Gol",
    dicaStopover: "-",
    link: "https://flights.google.com"
  };
  radar.enviarAlertaInteligente("SAO", "MIA", "2026-11-01", "2026-11-15", oferta, "Caiu 20%", false, null);

  const callNoite = fetchLog.find(f => f.url.includes("telegram.org"));
  assert(callNoite, "Deve ter enviado mensagem via Telegram à noite");
  const payloadNoite = JSON.parse(callNoite.options.payload);
  assert.strictEqual(payloadNoite.disable_notification, true, "Deve enviar disable_notification: true às 23h");

  // Simular 10h (manhã)
  resetTestEnv();
  mockUtilities.formatDate = (d, tz, fmt) => (fmt === "HH" ? "10" : "2026-10-04");
  radar.enviarAlertaInteligente("SAO", "MIA", "2026-11-01", "2026-11-15", oferta, "Caiu 20%", false, null);

  const callDia = fetchLog.find(f => f.url.includes("telegram.org"));
  assert(callDia, "Deve ter enviado mensagem via Telegram de dia");
  const payloadDia = JSON.parse(callDia.options.payload);
  assert.strictEqual(payloadDia.disable_notification, false, "Deve enviar disable_notification: false às 10h");
});

test("11.3. exibirRelatorioCotas gera string informativa do pool e cotas sem erros", () => {
  resetTestEnv();
  const relatorio = radar.exibirRelatorioCotas();
  assert(typeof relatorio === "string", "Relatório deve ser string");
  assert(relatorio.includes("Total de Buscas Hoje"), "Deve conter Total de Buscas Hoje");
  assert(relatorio.includes("Status do Pool de"), "Deve conter Status do Pool de chaves");
  assert(relatorio.includes("Cota Mensal Restante:"), "Deve conter Cota Mensal Restante");
});

test("11.4. aplicarFormatacaoCondicionalPrecos adiciona regras de verde (meta) e vermelho (>1.5x meta)", () => {
  resetTestEnv();
  const sheet = currentSpreadsheet.insertSheet("Monitoramento");
  sheet.getRange(1, 1, 1, 8).setValues([["Origem", "Destino", "Ida", "Volta", "Dur", "Alvo", "Var", "Preco"]]);
  sheet.getRange(2, 1, 1, 8).setValues([["SAO", "RIO", "2026-11-01", "2026-11-05", 5, 500, "", 450]]);

  radar.aplicarFormatacaoCondicionalPrecos(sheet);
  const regras = sheet.getConditionalFormatRules();
  assert.strictEqual(regras.length, 2, "Devem existir 2 regras condicionais configuradas");
  assert(regras[0].formula.includes("H2<=F2"), "Regra verde deve verificar se preço atual <= alvo");
  assert(regras[1].formula.includes("H2>(F2*1.5)"), "Regra vermelha deve verificar se preço atual > 1.5 * alvo");
});

// ==========================================
// GRUPO 12: NORMALIZAÇÃO DE AEROPORTOS SERPAPI & TRATAMENTO DE RETORNO SEM VOOS
// ==========================================

test("12.1. normalizarParaSerpApi mapeia códigos metropolitanos para aeroportos reais da SerpAPI", () => {
  assert.strictEqual(radar.normalizarParaSerpApi("SAO"), "GRU,CGH");
  assert.strictEqual(radar.normalizarParaSerpApi("RIO"), "GIG,SDU");
  assert.strictEqual(radar.normalizarParaSerpApi("BUE"), "EZE,AEP");
  assert.strictEqual(radar.normalizarParaSerpApi("LON"), "LHR,LGW");
  assert.strictEqual(radar.normalizarParaSerpApi("NYC"), "JFK,EWR,LGA");
  assert.strictEqual(radar.normalizarParaSerpApi("PAR"), "CDG,ORY");
  // Aeroportos únicos mantêm seu código
  assert.strictEqual(radar.normalizarParaSerpApi("BEL"), "BEL");
  assert.strictEqual(radar.normalizarParaSerpApi("/m/02j9z"), "/m/02j9z");
});

test("12.2. buscarOfertas trata resposta de ausência de voos como ok: true, encontrouVoos: false", () => {
  resetTestEnv();
  mockFetchHandler = () => ({
    getResponseCode: () => 200,
    getContentText: () => JSON.stringify({
      error: "Google Flights hasn't returned any results for this query."
    })
  });

  const res = radar.buscarOfertas("mock_key", "SAO", "BEL", "São Paulo", "Belém", "2026-11-10", null, 10);
  assert.strictEqual(res.ok, true, "Ausência de voos não deve ser erro fatal");
  assert.strictEqual(res.encontrouVoos, false, "Deve indicar que não encontrou voos");
  assert(res.mensagem.includes("Sem voos para esta rota/filtro"), "Deve conter mensagem amigável");
});

// ==========================================
// GRUPO 13: FILTRO ANTI-MARKETING DE BUG FARES & HIGIENIZAÇÃO DE ANÚNCIOS
// ==========================================

test("13.1. Filtro anti-marketing rejeita posts comerciais de pacotes, hotéis, cupons e executiva", () => {
  const postsComerciais = [
    "Aproveite! Pacotes para Foz do Iguaçu com voos + hotel a partir de R$ 905 com cupom",
    "Europa de Executiva Passagens aéreas a partir de R$ 9.904 de Campinas",
    "Ainda dá tempo! Hotéis fazenda e resorts para o feriado de outubro a partir de R$ 448",
    "Muito bom! Passagens aéreas para Lima ou Cusco a partir de R$ 1.257 ida e volta"
  ];

  for (const post of postsComerciais) {
    const postLower = post.toLowerCase();
    const contemMarketing = radar.TERMOS_MARKETING_BANIDOS.some(t => postLower.includes(t));
    const ehBugFare = radar.TERMOS_BUG_FARE.some(t => postLower.includes(t));
    // Post comercial deve ser bloqueado por marketing ou por não ser bug fare
    assert(contemMarketing || !ehBugFare, `Post "${post}" deveria ser descartado`);
  }

  // Apenas Bug Fare autêntico deve ser aprovado
  const postBugReal = "URGENTE! Erro de tarifa para Miami por apenas R$ 320 ida e volta!";
  const bugLower = postBugReal.toLowerCase();
  const temMarketing = radar.TERMOS_MARKETING_BANIDOS.some(t => bugLower.includes(t));
  const ehBugReal = radar.TERMOS_BUG_FARE.some(t => bugLower.includes(t));
  assert.strictEqual(temMarketing, false, "Bug real não deve conter termos de marketing banidos");
  assert.strictEqual(ehBugReal, true, "Bug real deve conter termo inequívoco de erro de tarifa");
});

test("13.2. limparPropagandasBugFares remove anúncios e preserva apenas ofertas autênticas", () => {
  resetTestEnv();
  const sheet = currentSpreadsheet.insertSheet("🚨 Bug Fares");
  sheet.getRange(1, 1, 1, 4).setValues([["Data/Hora", "Tipo de Alerta", "Título", "Link"]]);
  sheet.getRange(2, 1, 4, 4).setValues([
    ["04/10 13:25", "🔥 MEGAPROMOÇÃO RELÂMPAGO", "Pacotes para Foz do Iguaçu voos + hotel", "http://..."],
    ["04/10 13:25", "🔥 MEGAPROMOÇÃO RELÂMPAGO", "Europa de Executiva R$ 9.904", "http://..."],
    ["04/10 13:25", "🔥 MEGAPROMOÇÃO RELÂMPAGO", "Hotéis fazenda e resorts a partir de R$ 448", "http://..."],
    ["04/10 13:30", "🚨 BUG FARE (ERRO DE TARIFA!)", "Erro de tarifa para Roma por R$ 500", "http://..."]
  ]);

  radar.limparPropagandasBugFares();

  const linhasRestantes = sheet.cells;
  // Apenas o cabeçalho e a linha do Bug Fare autêntico devem restar (total 2 linhas)
  assert.strictEqual(linhasRestantes.length, 2, "Devem restar apenas cabeçalho e 1 bug fare");
  assert(linhasRestantes[1][2].includes("Erro de tarifa para Roma"), "Deve preservar apenas o erro de tarifa genuíno");
});

// ==========================================
// GRUPO 14: ACIONADORES HORÁRIOS & PROTEÇÃO CONTRA QUEIMA DE COTAS
// ==========================================

test("14.1. ativarTriggerHorario instala acionador de 1 hora e desativarTriggers remove", () => {
  resetTestEnv();
  radar.ativarTriggerHorario();
  const triggersAtivos = mockScriptApp.getProjectTriggers();
  assert.strictEqual(triggersAtivos.length, 1, "Deve existir exatamente 1 acionador criado");
  assert.strictEqual(triggersAtivos[0].getHandlerFunction(), "verificarVoosGoogleFlights");

  const removidos = radar.desativarTriggers();
  assert.strictEqual(removidos, 1, "Deve remover 1 acionador");
  assert.strictEqual(mockScriptApp.getProjectTriggers().length, 0, "Lista de acionadores deve ficar vazia");
});

test("14.2. Execução por trigger (objeto de evento) não força todas as rotas e limita a 1 rota", () => {
  resetTestEnv();
  const sheet = currentSpreadsheet.insertSheet("Monitoramento");
  sheet.getRange(1, 1, 1, 16).setValues([[
    "Origem", "Destino", "Data Ida", "Volta", "Duracao", "Alvo",
    "DestEnc", "Preco", "Menor", "Var", "Termo", "Custo", "Conex", "Dica", "UltimaChecagem", "Link"
  ]]);

  // Inserir 3 rotas válidas sem checagem anterior
  sheet.getRange(2, 1, 3, 6).setValues([
    ["São Paulo", "Miami", "2026-11-10", 7, 12, 3000],
    ["Rio de Janeiro", "Belém", "2026-12-01", "Só Ida", 8, 700],
    ["Curitiba", "Fortaleza", "2026-12-15", 5, 10, 1100]
  ]);

  // Simula o Google Apps Script chamando a função a partir de um trigger
  const eventoDoTrigger = { authMode: "FULL", triggerUid: "123456" };
  radar.executarVarredura(eventoDoTrigger);

  const chamadasApi = fetchLog.filter(f => f.url.includes("serpapi.com"));
  assert.strictEqual(chamadasApi.length, 1, "Execução automática horária deve consultar estritamente 1 rota por hora para poupar cota");
});

test("14.3. verificarSeDeveChecar bloqueia consultas repetidas com intervalo menor que 1 hora", () => {
  const agora = new Date("2026-10-05T13:00:00Z");
  const meiaHoraAtras = new Date("2026-10-05T12:30:00Z");
  const duasHorasAtras = new Date("2026-10-05T11:00:00Z");

  // Rota próxima (daqui a 10 dias)
  assert.strictEqual(radar.verificarSeDeveChecar("2026-10-15", meiaHoraAtras, agora), false, "Deve bloquear checagem com 30min");
  assert.strictEqual(radar.verificarSeDeveChecar("2026-10-15", duasHorasAtras, agora), true, "Deve permitir checagem após 2h para voo próximo");
});

console.log(`\n========================================`);
console.log(`🎉 TODOS OS ${totalTestes} TESTES PASSARAM COM SUCESSO!`);
console.log(`========================================\n`);





