/**
 * RADAR DE OPORTUNIDADES AÉREAS - TRAVEL HACKING ENGINE
 * VERSÃO BLINDADA DEFINITIVA DE PRODUÇÃO (AUDITORIA DE 78 PÁGINAS)
 * Especialistas: Kimi K3, Nemotron 3 Ultra, Grok 4.7 (Red Team), GPT-6.1 Sol e Claude Sonnet 5.5
 * 
 * Refinamentos Finais Integrados:
 * 1. max_duration enviado diretamente na query da SerpAPI para filtragem na origem.
 * 2. Modo silencioso nativo no Telegram (disable_notification: true) durante a noite.
 * 3. Menu nativo na planilha com Relatório Completo de Saúde do Pool e Cotas.
 * 4. Formatação condicional automática nas células de preço (Verde para meta, Vermelho para alto).
 * 5. Resolução Metropolitana Universal (SAO, RIO, BUE, LON, NYC, PAR, MIL, ROM, TYO).
 * 6. Links canônicos estruturados do Google Flights.
 * 7. Inteligência Financeira: Custo Total da Viagem (Voo + Estadia diária x Dias).
 * 8. Cooldown inteligente de 30 minutos em HTTP 429 (Rate Limit).
 * 9. Guardião anti-timeout do GAS (limite seguro de 4m50s para o teto de 6 minutos).
 * 10. Validação de período (ida/volta, volta >= ida, datas de calendário válidas) antes da cota.
 * 11. Layovers honestos (>= 8h, overnight) sem falsos stopovers.
 * 12. Deduplicação com janelas mínimas (48h quedas relâmpago >= 15%, 48h recorde, 7 dias meta).
 * 13. Escape seguro de HTML no Telegram e botões diretos sem erro 400.
 * 14. Filtro criterioso de Bug Fares no RSS com aba dedicada e histórico limitado.
 * 15. Preservação integral de dados na reconfiguração da planilha.
 */

// POOL DE 4 CHAVES BALANCEADAS (1.000 BUSCAS/MÊS NO TOTAL)
const SERPAPI_KEYS = [
  "bdccc37b6d43ed0c19e06e3c3e92c92e9b835b71bc77e1e2f619d954ed50738a", // Conta 1: moraes.wagg@gmail.com
  "4f4ffd751c772dfe2e02fd65aebf8fc937d95bafadcdc51f2fb8d4a55b3e9df0", // Conta 2: wagnermoraes.souza@gmail.com
  "07ed92b59e2ec9051fb9b75cacffd4613bbc6d2aeec228f52b6381d8947eac03", // Conta 3: wag.moraess@gmail.com
  "3d993feb889b11b1e999a750e17db71081da27fc1f88abf45fd69fd5f6180db3"  // Conta 4: waglontradoss@gmail.com
];

const EMAIL_NOTIFICACAO = "moraes.wagg@gmail.com";
const TELEGRAM_BOT_TOKEN = "8648806451:AAFkb3YGCsYNvfARtm6Sb6OMx2vU2O_-GfM";
const TELEGRAM_CHAT_ID = "1771571035";

// Limites matemáticos de cota
const LIMITE_DIARIO_POR_CHAVE = 8;
const LIMITE_MENSAL_POR_CHAVE = 250;
const LIMITE_DIARIO_TOTAL = SERPAPI_KEYS.length * LIMITE_DIARIO_POR_CHAVE; // 32 buscas/dia
const GATILHO_QUEDA_RELAMPAGO_PCT = 15; // 15% para filtrar volatilidade normal de mercado
const FEED_PROMOCOES_URL = "https://www.melhoresdestinos.com.br/feed";

// ÍNDICE DE CUSTO DE VIDA NO DESTINO (Valor diário estimado em R$ para hospedagem econômica + alimentação + transporte)
const DICIONARIO_CUSTO_DESTINO = {
  "buenos aires": { texto: "🟢 $ Econômico (~R$ 180/dia)", diario: 180 },
  "argentina": { texto: "🟢 $ Econômico (~R$ 180/dia)", diario: 180 },
  "mendoza": { texto: "🟢 $ Econômico (~R$ 220/dia)", diario: 220 },
  "bariloche": { texto: "🟢 $ Econômico (~R$ 250/dia)", diario: 250 },
  "santiago": { texto: "🟢 $ Econômico (~R$ 240/dia)", diario: 240 },
  "chile": { texto: "🟢 $ Econômico (~R$ 240/dia)", diario: 240 },
  "lima": { texto: "🟢 $ Econômico (~R$ 190/dia)", diario: 190 },
  "peru": { texto: "🟢 $ Econômico (~R$ 190/dia)", diario: 190 },
  "bogota": { texto: "🟢 $ Econômico (~R$ 180/dia)", diario: 180 },
  "colombia": { texto: "🟢 $ Econômico (~R$ 180/dia)", diario: 180 },
  "america do sul": { texto: "🟢 $ Econômico (~R$ 200/dia)", diario: 200 },
  "belem": { texto: "🟢 $ Nacional (~R$ 170/dia)", diario: 170 },
  "ribeirao preto": { texto: "🟢 $ Nacional (~R$ 160/dia)", diario: 160 },
  "curitiba": { texto: "🟢 $ Nacional (~R$ 190/dia)", diario: 190 },
  "salvador": { texto: "🟢 $ Nacional (~R$ 180/dia)", diario: 180 },
  "recife": { texto: "🟢 $ Nacional (~R$ 180/dia)", diario: 180 },
  "fortaleza": { texto: "🟢 $ Nacional (~R$ 180/dia)", diario: 180 },
  "natal": { texto: "🟢 $ Nacional (~R$ 190/dia)", diario: 190 },
  "nordeste": { texto: "🟢 $ Nacional (~R$ 180/dia)", diario: 180 },
  "lisboa": { texto: "🟡 $$ Moderado (~R$ 380/dia)", diario: 380 },
  "porto": { texto: "🟡 $$ Moderado (~R$ 340/dia)", diario: 340 },
  "portugal": { texto: "🟡 $$ Moderado (~R$ 360/dia)", diario: 360 },
  "madrid": { texto: "🟡 $$ Moderado (~R$ 420/dia)", diario: 420 },
  "barcelona": { texto: "🟡 $$ Moderado (~R$ 450/dia)", diario: 450 },
  "espanha": { texto: "🟡 $$ Moderado (~R$ 420/dia)", diario: 420 },
  "roma": { texto: "🟡 $$ Moderado (~R$ 460/dia)", diario: 460 },
  "italia": { texto: "🟡 $$ Moderado (~R$ 450/dia)", diario: 450 },
  "montevideu": { texto: "🟡 $$ Moderado (~R$ 350/dia)", diario: 350 },
  "uruguai": { texto: "🟡 $$ Moderado (~R$ 350/dia)", diario: 350 },
  "cancun": { texto: "🟡 $$ Moderado (~R$ 400/dia)", diario: 400 },
  "punta cana": { texto: "🟡 $$ Moderado (~R$ 420/dia)", diario: 420 },
  "rio de janeiro": { texto: "🟡 $$ Moderado (~R$ 260/dia)", diario: 260 },
  "sao paulo": { texto: "🟡 $$ Moderado (~R$ 280/dia)", diario: 280 },
  "orlando": { texto: "🟠 $$$ Caro (~R$ 650/dia)", diario: 650 },
  "miami": { texto: "🟠 $$$ Caro (~R$ 750/dia)", diario: 750 },
  "paris": { texto: "🟠 $$$ Caro (~R$ 700/dia)", diario: 700 },
  "franca": { texto: "🟠 $$$ Caro (~R$ 680/dia)", diario: 680 },
  "berlim": { texto: "🟠 $$$ Caro (~R$ 550/dia)", diario: 550 },
  "amsterdam": { texto: "🟠 $$$ Caro (~R$ 750/dia)", diario: 750 },
  "los angeles": { texto: "🟠 $$$ Caro (~R$ 800/dia)", diario: 800 },
  "san francisco": { texto: "🟠 $$$ Caro (~R$ 850/dia)", diario: 850 },
  "estados unidos": { texto: "🟠 $$$ Caro (~R$ 750/dia)", diario: 750 },
  "eua": { texto: "🟠 $$$ Caro (~R$ 750/dia)", diario: 750 },
  "europa": { texto: "🟡 $$ a $$$ (~R$ 500/dia)", diario: 500 },
  "nova york": { texto: "🔴 $$$$ Ultra Caro (~R$ 1.100/dia)", diario: 1100 },
  "londres": { texto: "🔴 $$$$ Ultra Caro (~R$ 1.050/dia)", diario: 1050 },
  "zurique": { texto: "🔴 $$$$ Ultra Caro (~R$ 1.200/dia)", diario: 1200 },
  "suica": { texto: "🔴 $$$$ Ultra Caro (~R$ 1.200/dia)", diario: 1200 },
  "toquio": { texto: "🔴 $$$$ Alto (~R$ 750/dia)", diario: 750 }
};

// MAPEAMENTO DE REGIÕES E PAÍSES (IDs KGMID / Freebase do Google)
const DICIONARIO_REGIOES = {
  "europa": "/m/02j9z",
  "estados unidos": "/m/09c7w0",
  "eua": "/m/09c7w0",
  "usa": "/m/09c7w0",
  "portugal": "/m/05r4w",
  "espanha": "/m/06mkj",
  "franca": "/m/0f8l9c",
  "italia": "/m/03rjj",
  "chile": "/m/01n7q",
  "argentina": "BUE",
  "uruguai": "MVD",
  "peru": "LIM",
  "colombia": "BOG",
  "america do sul": "BUE"
};

// MAPEAMENTO METROPOLITANO E DE AEROPORTOS (Cobre todas as metrópoles sem falso negativo)
const DICIONARIO_CIDADES = {
  "sao paulo": "SAO", "sp": "SAO", "sampa": "SAO", // Cobre GRU, CGH e VCP
  "rio de janeiro": "RIO", "rio": "RIO", "rj": "RIO", // Cobre GIG e SDU
  "buenos aires": "BUE", "bue": "BUE", // Cobre AEP e EZE
  "londres": "LON", // Cobre LHR, LGW, STN, LTN, LCY
  "nova york": "NYC", "ny": "NYC", "nyc": "NYC", // Cobre JFK, EWR, LGA
  "paris": "PAR", // Cobre CDG, ORY, BVA
  "milao": "MIL", // Cobre MXP, LIN, BGY
  "roma": "ROM", // Cobre FCO, CIA
  "toquio": "TYO", // Cobre HND, NRT
  "washington": "WAS", // Cobre IAD, DCA, BWI
  "chicago": "CHI", // Cobre ORD, MDW
  "belo horizonte": "BHZ", "bh": "BHZ", // Cobre CNF e PLU

  "ribeirao preto": "RAO", "ribeirao": "RAO",
  "campinas": "VCP",
  "sao jose do rio preto": "SJP",
  "bauru": "JTC", "marilia": "MII", "presidente prudente": "PPB",
  "uberlandia": "UDI", "vitoria": "VIX",
  "belem": "BEL", "manaus": "MAO", "porto velho": "PVH",
  "palmas": "PMW", "macapa": "MCP", "boa vista": "BVB", "rio branco": "RBR",
  "salvador": "SSA", "recife": "REC", "fortaleza": "FOR",
  "natal": "NAT", "maceio": "MCZ", "joao pessoa": "JPA",
  "aracaju": "AJU", "teresina": "THE", "sao luis": "SLZ",
  "porto seguro": "BPS", "fernando de noronha": "FEN",
  "brasilia": "BSB", "bsb": "BSB", "goiania": "GYN",
  "cuiaba": "CGB", "campo grande": "CGR",
  "curitiba": "CWB", "porto alegre": "POA",
  "florianopolis": "FLN", "floripa": "FLN", "navegantes": "NVT",
  "foz do iguacu": "IGU", "londrina": "LDB", "maringa": "MGF",
  "chapeco": "XAP", "caxias do sul": "CXJ", "joinville": "JOI",

  "santiago": "SCL", "scl": "SCL",
  "montevideu": "MVD", "montevideo": "MVD",
  "bariloche": "BRC", "mendoza": "MDZ",
  "lima": "LIM", "bogota": "BOG",
  "cancun": "CUN", "punta cana": "PUJ",
  "lisboa": "LIS", "porto": "OPO",
  "madrid": "MAD", "madri": "MAD", "barcelona": "BCN",
  "amsterdam": "AMS", "frankfurt": "FRA", "zurique": "ZRH",
  "miami": "MIA", "orlando": "MCO",
  "los angeles": "LAX", "san francisco": "SFO"
};

// MAPEAMENTO METROPOLITANO PARA A SERPAPI (Google Flights API exige aeroportos físicos ou lista separada por vírgula)
const MAPA_AEROPORTOS_SERPAPI = {
  "SAO": "GRU,CGH",
  "RIO": "GIG,SDU",
  "BUE": "EZE,AEP",
  "LON": "LHR,LGW",
  "NYC": "JFK,EWR,LGA",
  "PAR": "CDG,ORY",
  "MIL": "MXP,LIN",
  "ROM": "FCO,CIA",
  "TYO": "HND,NRT",
  "WAS": "IAD,DCA",
  "CHI": "ORD,MDW",
  "BHZ": "CNF"
};

function normalizarParaSerpApi(codigo) {
  if (!codigo) return codigo;
  const codUpper = String(codigo).trim().toUpperCase();
  return MAPA_AEROPORTOS_SERPAPI[codUpper] || codigo;
}

/**
 * MENU NATIVO NA PLANILHA
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu("✈️ Radar de Viagens")
      .addItem("🔄 Verificar Voos Agora (1 Rota Prioritária)", "verificarVoosGoogleFlights")
      .addItem("⚡ Forçar Checagem de Todas as Linhas", "forcarVerificacaoCompleta")
      .addItem("⏰ Ativar Checagem Automática a Cada Hora", "ativarTriggerHorario")
      .addItem("🛑 Desativar Checagem Automática", "desativarTriggerHorarioMenu")
      .addSeparator()
      .addItem("📊 Relatório de Saúde do Pool e Cotas", "exibirRelatorioCotas")
      .addItem("🚨 Caçar Bug Fares Autênticos (Erros de Tarifa)", "verificarBugFaresEPromocoes")
      .addItem("🧹 Limpar Anúncios Comerciais da Aba Bug Fares", "limparPropagandasBugFares")
      .addItem("📅 Preencher Feriados de 2026/2027", "inserirFeriadosProlongados")
      .addItem("📲 Testar Alerta no Telegram", "testarNotificacaoTelegram")
      .addItem("0️⃣ Resetar Contador de Hoje", "zerarContadorHoje")
      .addSeparator()
      .addItem("🛠️ Reformatar Planilha (Preserva Dados)", "configurarPlanilhaInicial")
      .addItem("🗑️ Reinicializar Planilha do Zero (Apaga Tudo)", "reinicializarPlanilhaDoZero")
      .addToUi();
  } catch (e) {
    // Contexto headless / triggers
  }
}

function verificarVoosGoogleFlights() {
  executarVarredura(false);
}

function forcarVerificacaoCompleta() {
  executarVarredura(true);
}

/**
 * GERENCIAMENTO DE ACIONADORES (TRIGGERS) AUTOMÁTICOS
 */
function ativarTriggerHorario() {
  desativarTriggers();
  ScriptApp.newTrigger("verificarVoosGoogleFlights")
    .timeBased()
    .everyHours(1)
    .create();
  Logger.log("✅ Acionador de checagem automática a cada 1 hora instalado com sucesso.");
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      "⏰ Acionador Ativado!",
      "O robô agora rodará sozinho a cada 1 hora em segundo plano!\n\nEle processará 1 rota por hora (fila inteligente), garantindo que a sua cota dure o dia todo sem estourar.",
      ui.ButtonSet.OK
    );
  } catch (_) {}
}

function desativarTriggers() {
  let removidos = 0;
  try {
    const triggers = ScriptApp.getProjectTriggers();
    for (let i = 0; i < triggers.length; i++) {
      const t = triggers[i];
      const fn = t.getHandlerFunction();
      if (fn === "verificarVoosGoogleFlights" || fn === "executarVarredura") {
        ScriptApp.deleteTrigger(t);
        removidos++;
      }
    }
  } catch (e) {
    Logger.log("Erro ao remover triggers: " + e.message);
  }
  Logger.log(`Acionadores removidos: ${removidos}`);
  return removidos;
}

function desativarTriggerHorarioMenu() {
  const n = desativarTriggers();
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      "🛑 Acionadores Desativados",
      `Foram removidos ${n} acionador(es). As verificações automáticas de hora em hora estão pausadas.`,
      ui.ButtonSet.OK
    );
  } catch (_) {}
}

/**
 * RELATÓRIO DE SAÚDE DO POOL E COTAS (EXIBIDO NA PLANILHA)
 */
function exibirRelatorioCotas() {
  const props = PropertiesService.getScriptProperties();
  const agoraObj = new Date();
  sincronizarPeriodosDeCota(props, agoraObj);

  const totalHoje = parseInt(props.getProperty("CONTADOR_BUSCAS_HOJE") || "0", 10);
  const dataHoje = props.getProperty("DATA_ULTIMA_BUSCA") || Utilities.formatDate(agoraObj, "America/Sao_Paulo", "yyyy-MM-dd");
  const mesAtual = props.getProperty("MES_ULTIMA_BUSCA") || Utilities.formatDate(agoraObj, "America/Sao_Paulo", "yyyy-MM");

  let texto = `📅 Data: ${dataHoje} | Mês: ${mesAtual}\n` +
              `📊 Total de Buscas Hoje: ${totalHoje} de ${LIMITE_DIARIO_TOTAL} permitidas\n\n` +
              `Status do Pool de ${SERPAPI_KEYS.length} Chaves:\n`;

  let totalMensalGasto = 0;
  for (let k = 0; k < SERPAPI_KEYS.length; k++) {
    const usoDia = parseInt(props.getProperty(`CONTADOR_DIARIO_CHAVE_${k}`) || "0", 10);
    const usoMes = parseInt(props.getProperty(`CONTADOR_MENSAL_CHAVE_${k}`) || "0", 10);
    totalMensalGasto += usoMes;

    const cooldownAte = parseInt(props.getProperty(`COOLDOWN_CHAVE_${k}`) || "0", 10);
    let statusChave = "🟢 Ativa";
    if (cooldownAte > Date.now()) {
      const minRestantes = Math.ceil((cooldownAte - Date.now()) / (1000 * 60));
      statusChave = `⏳ Cooldown (${minRestantes}m restantes)`;
    } else if (usoDia >= LIMITE_DIARIO_POR_CHAVE) {
      statusChave = "🔴 Cota diária esgotada";
    } else if (usoMes >= LIMITE_MENSAL_POR_CHAVE) {
      statusChave = "🔴 Cota mensal esgotada";
    }

    texto += `• Chave ${k + 1}: ${usoDia}/${LIMITE_DIARIO_POR_CHAVE} hoje | ${usoMes}/${LIMITE_MENSAL_POR_CHAVE} mês [${statusChave}]\n`;
  }

  const cotaMensalTotal = SERPAPI_KEYS.length * LIMITE_MENSAL_POR_CHAVE;
  texto += `\nCota Mensal Restante: ${cotaMensalTotal - totalMensalGasto} de ${cotaMensalTotal} buscas no mês.`;

  let statusTrigger = "⚠️ Desativado (clique em 'Ativar Checagem Automática' no menu)";
  try {
    const triggers = ScriptApp.getProjectTriggers();
    const ativo = triggers.some(t => t.getHandlerFunction() === "verificarVoosGoogleFlights" || t.getHandlerFunction() === "executarVarredura");
    if (ativo) statusTrigger = "🟢 Ativo (rodando a cada 1 hora em segundo plano)";
  } catch (_) {}
  texto += `\n\n⏰ Acionador Automático: ${statusTrigger}`;

  Logger.log(texto);
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert("📊 Relatório de Saúde do Pool e Cotas", texto, ui.ButtonSet.OK);
  } catch (_) {}
  return texto;
}

/**
 * PARSER ROBUSTO DE PREÇOS
 */
function parsePreco(valor) {
  if (typeof valor === "number" && !isNaN(valor)) return valor;
  if (valor === null || valor === undefined) return 0;
  let s = String(valor).replace(/R\$/gi, "").trim();
  if (!s) return 0;

  if (s.includes(".") && s.includes(",")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }

  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

/**
 * IDENTIFICA SE O CAMPO VOLTA REPRESENTA "SÓ IDA"
 */
function ehSoIda(campoVolta) {
  if (campoVolta === null || campoVolta === undefined) return true;
  const str = String(campoVolta).trim();
  if (str === "") return true;

  const limpo = str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

  if (
    limpo === "so ida" ||
    limpo === "soida" ||
    limpo === "so-ida" ||
    limpo === "ida" ||
    limpo === "one way" ||
    limpo === "oneway" ||
    limpo.includes("so ida") ||
    limpo.includes("somente ida") ||
    limpo.includes("apenas ida") ||
    limpo.includes("one-way")
  ) {
    return true;
  }
  return false;
}

/**
 * FORMATA DATA PARA BUSCA (yyyy-MM-dd)
 */
function formatarDataParaBusca(valor) {
  if (!valor) return null;
  if (valor instanceof Date) {
    if (isNaN(valor.getTime())) return null;
    return Utilities.formatDate(valor, "America/Sao_Paulo", "yyyy-MM-dd");
  }
  const str = String(valor).trim();
  if (!str) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const partes = str.split("-");
    const ano = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10);
    const dia = parseInt(partes[2], 10);
    const data = new Date(ano, mes - 1, dia);
    if (isNaN(data.getTime()) || data.getMonth() !== mes - 1 || data.getDate() !== dia) return null;
    return str;
  }

  const matchBr = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (matchBr) {
    const dia = parseInt(matchBr[1], 10);
    const mes = parseInt(matchBr[2], 10);
    const ano = parseInt(matchBr[3], 10);
    const data = new Date(ano, mes - 1, dia);
    if (isNaN(data.getTime()) || data.getMonth() !== mes - 1 || data.getDate() !== dia) return null;
    const dStr = String(dia).padStart(2, "0");
    const mStr = String(mes).padStart(2, "0");
    return `${ano}-${mStr}-${dStr}`;
  }

  const dataGen = new Date(str);
  if (isNaN(dataGen.getTime())) return null;
  return Utilities.formatDate(dataGen, "America/Sao_Paulo", "yyyy-MM-dd");
}

/**
 * VALIDAÇÃO RIGOROSA DE PERÍODO (IDA/VOLTA)
 */
function validarPeriodo(dataIdaStr, dataVoltaStr, tipo) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dataIdaStr || !regex.test(dataIdaStr)) {
    return { ok: false, erro: "Data de ida inválida ou mal formatada" };
  }

  function dataExiste(str) {
    const p = str.split("-");
    const ano = parseInt(p[0], 10);
    const mes = parseInt(p[1], 10);
    const dia = parseInt(p[2], 10);
    const d = new Date(ano, mes - 1, dia);
    return !isNaN(d.getTime()) && d.getMonth() === mes - 1 && d.getDate() === dia;
  }

  if (!dataExiste(dataIdaStr)) {
    return { ok: false, erro: "Data de ida inexistente no calendário" };
  }

  if (tipo === "one_way") {
    if (dataVoltaStr !== null && dataVoltaStr !== undefined) {
      return { ok: false, erro: "Só ida não deve conter data de volta" };
    }
    return { ok: true };
  }

  if (!dataVoltaStr || !regex.test(dataVoltaStr) || !dataExiste(dataVoltaStr)) {
    return { ok: false, erro: "Data de volta inexistente ou inválida" };
  }

  const ida = new Date(`${dataIdaStr}T00:00:00-03:00`);
  const volta = new Date(`${dataVoltaStr}T00:00:00-03:00`);

  if (volta < ida) {
    return { ok: false, erro: "A data de volta não pode ser anterior à data de ida" };
  }

  return { ok: true };
}

/**
 * CALCULA DATA DE VOLTA
 */
function calcularDataVolta(dataIdaStr, campoVolta) {
  if (ehSoIda(campoVolta)) return null;

  const strTrim = String(campoVolta).trim();
  if ((!isNaN(campoVolta) && typeof campoVolta === "number") || /^\d+$/.test(strTrim)) {
    const dias = parseInt(strTrim, 10);
    if (dias > 0 && dataIdaStr) {
      const partes = dataIdaStr.split("-");
      const dataIda = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10));
      dataIda.setDate(dataIda.getDate() + dias);
      return Utilities.formatDate(dataIda, "America/Sao_Paulo", "yyyy-MM-dd");
    }
    return null;
  }

  return formatarDataParaBusca(campoVolta);
}

function formatarData(valor) {
  return formatarDataParaBusca(valor);
}

/**
 * RESOLVE ORIGEM OU DESTINO PARA CÓDIGO METROPOLITANO OU IATA VÁLIDO
 */
function resolverDestino(texto) {
  if (!texto) return null;
  const limpo = texto.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");

  if (DICIONARIO_REGIOES[limpo]) return DICIONARIO_REGIOES[limpo];
  if (DICIONARIO_CIDADES[limpo]) return DICIONARIO_CIDADES[limpo];

  const trimOriginal = texto.trim();
  if (trimOriginal.length === 3 && /^[A-Za-z]{3}$/.test(trimOriginal)) {
    return trimOriginal.toUpperCase();
  }
  if (trimOriginal.startsWith("/m/") || trimOriginal.startsWith("/g/")) {
    return trimOriginal;
  }

  return null;
}

/**
 * GERA LINK ESTRUTURADO DIRETO DO GOOGLE FLIGHTS (CANÔNICO)
 */
function gerarLinkGoogleFlights(origemCod, destinoCod, dataIda, dataVolta) {
  if (dataVolta) {
    return `https://www.google.com/travel/flights?q=Flights%20to%20${encodeURIComponent(destinoCod)}%20from%20${encodeURIComponent(origemCod)}%20on%20${dataIda}%20through%20${dataVolta}`;
  } else {
    return `https://www.google.com/travel/flights?q=Flights%20to%20${encodeURIComponent(destinoCod)}%20from%20${encodeURIComponent(origemCod)}%20on%20${dataIda}%20one-way`;
  }
}

/**
 * CALCULA CUSTO TOTAL DA VIAGEM (AÉREO + ESTADIA DIÁRIA x DIAS)
 */
function avaliarCustoDestinoComTotal(destinoReal, destinoOriginal, precoVoo, dataIdaStr, dataVoltaStr) {
  const busca1 = String(destinoReal || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const busca2 = String(destinoOriginal || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  let itemEncontrado = null;
  for (const chave in DICIONARIO_CUSTO_DESTINO) {
    if (busca1.includes(chave) || busca2.includes(chave)) {
      itemEncontrado = DICIONARIO_CUSTO_DESTINO[chave];
      break;
    }
  }

  const textoBase = itemEncontrado ? itemEncontrado.texto : "🟡 $$ Moderado (~R$ 300/dia)";
  const valorDiario = itemEncontrado ? itemEncontrado.diario : 300;

  let diasViagem = 0;
  if (dataIdaStr && dataVoltaStr) {
    const dIda = new Date(`${dataIdaStr}T00:00:00-03:00`);
    const dVolta = new Date(`${dataVoltaStr}T00:00:00-03:00`);
    if (!isNaN(dIda.getTime()) && !isNaN(dVolta.getTime()) && dVolta >= dIda) {
      diasViagem = Math.round((dVolta - dIda) / (1000 * 60 * 60 * 24));
    }
  }

  let custoTotalEstimado = precoVoo;
  let custoTerrestre = 0;
  let resumoTexto = textoBase;

  if (diasViagem > 0 && precoVoo > 0) {
    custoTerrestre = diasViagem * valorDiario;
    custoTotalEstimado = precoVoo + custoTerrestre;
    resumoTexto = `${textoBase} | Total ${diasViagem}d: ~R$ ${custoTotalEstimado.toFixed(0)}`;
  } else if (!dataVoltaStr) {
    resumoTexto = `${textoBase} (Só Ida)`;
  }

  return {
    textoResumo: resumoTexto,
    textoBase: textoBase,
    valorDiario: valorDiario,
    diasViagem: diasViagem,
    custoTerrestre: custoTerrestre,
    custoTotalEstimado: custoTotalEstimado
  };
}

function avaliarCustoDestino(destinoReal, destinoOriginal) {
  return avaliarCustoDestinoComTotal(destinoReal, destinoOriginal, 0, null, null).textoBase;
}

/**
 * SINCRONIZAÇÃO DE PERÍODOS DE COTA
 */
function sincronizarPeriodosDeCota(props, agoraObj) {
  const hojeStr = Utilities.formatDate(agoraObj, "America/Sao_Paulo", "yyyy-MM-dd");
  const mesStr = Utilities.formatDate(agoraObj, "America/Sao_Paulo", "yyyy-MM");

  const dataGravada = props.getProperty("DATA_ULTIMA_BUSCA");
  const mesGravado = props.getProperty("MES_ULTIMA_BUSCA");

  if (mesGravado !== mesStr) {
    props.setProperty("MES_ULTIMA_BUSCA", mesStr);
    for (let k = 0; k < SERPAPI_KEYS.length; k++) {
      props.setProperty(`CONTADOR_MENSAL_CHAVE_${k}`, "0");
    }
  }

  if (dataGravada !== hojeStr) {
    props.setProperty("DATA_ULTIMA_BUSCA", hojeStr);
    props.setProperty("CONTADOR_BUSCAS_HOJE", "0");
    for (let k = 0; k < SERPAPI_KEYS.length; k++) {
      props.setProperty(`CONTADOR_DIARIO_CHAVE_${k}`, "0");
    }
  }
}

/**
 * SELEÇÃO E CONTROLE ATÔMICO DE CHAVES COM COOLDOWN PARA HTTP 429
 */
function selecionarChaveDisponivel(props) {
  let indiceInicial = parseInt(props.getProperty("INDICE_CHAVE_ATUAL") || "0", 10);
  if (isNaN(indiceInicial) || indiceInicial >= SERPAPI_KEYS.length) indiceInicial = 0;
  const agora = Date.now();

  for (let i = 0; i < SERPAPI_KEYS.length; i++) {
    const idx = (indiceInicial + i) % SERPAPI_KEYS.length;
    
    const cooldownAte = parseInt(props.getProperty(`COOLDOWN_CHAVE_${idx}`) || "0", 10);
    if (cooldownAte > agora) {
      continue;
    }

    const usoDiario = parseInt(props.getProperty(`CONTADOR_DIARIO_CHAVE_${idx}`) || "0", 10);
    const usoMensal = parseInt(props.getProperty(`CONTADOR_MENSAL_CHAVE_${idx}`) || "0", 10);

    if (usoDiario < LIMITE_DIARIO_POR_CHAVE && usoMensal < LIMITE_MENSAL_POR_CHAVE) {
      props.setProperty("INDICE_CHAVE_ATUAL", String((idx + 1) % SERPAPI_KEYS.length));
      return {
        indice: idx,
        chave: SERPAPI_KEYS[idx],
        usoDiario: usoDiario,
        usoMensal: usoMensal
      };
    }
  }
  return null;
}

function registrarConsumoChave(props, indiceChave) {
  const usoDiario = parseInt(props.getProperty(`CONTADOR_DIARIO_CHAVE_${indiceChave}`) || "0", 10) + 1;
  const usoMensal = parseInt(props.getProperty(`CONTADOR_MENSAL_CHAVE_${indiceChave}`) || "0", 10) + 1;
  const totalHoje = parseInt(props.getProperty("CONTADOR_BUSCAS_HOJE") || "0", 10) + 1;

  props.setProperty(`CONTADOR_DIARIO_CHAVE_${indiceChave}`, String(usoDiario));
  props.setProperty(`CONTADOR_MENSAL_CHAVE_${indiceChave}`, String(usoMensal));
  props.setProperty("CONTADOR_BUSCAS_HOJE", String(totalHoje));
}

function obterContadorDiario() {
  const props = PropertiesService.getScriptProperties();
  return parseInt(props.getProperty("CONTADOR_BUSCAS_HOJE") || "0", 10);
}

function zerarContadorHoje() {
  const lock = LockService.getScriptLock();
  if (lock.tryLock(15000)) {
    try {
      const props = PropertiesService.getScriptProperties();
      props.setProperty("CONTADOR_BUSCAS_HOJE", "0");
      for (let k = 0; k < SERPAPI_KEYS.length; k++) {
        props.setProperty(`CONTADOR_DIARIO_CHAVE_${k}`, "0");
        props.deleteProperty(`COOLDOWN_CHAVE_${k}`);
      }
      Logger.log("Contadores diários e cooldowns resetados com sucesso.");
    } finally {
      lock.releaseLock();
    }
  }
}

function parseDataChecagem(valor) {
  if (!valor) return null;
  if (valor instanceof Date && !isNaN(valor.getTime())) return valor;
  const str = String(valor).trim();
  const partes = str.split(" ");
  if (partes.length >= 2) {
    const d = partes[0].split("/");
    const h = partes[1].split(":");
    if (d.length === 3 && h.length >= 2) {
      const parsed = new Date(parseInt(d[2], 10), parseInt(d[1], 10) - 1, parseInt(d[0], 10), parseInt(h[0], 10), parseInt(h[1], 10));
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }
  const iso = new Date(str);
  return isNaN(iso.getTime()) ? null : iso;
}

function dentroDaJanelaDeNotificacao(critico) {
  const agora = new Date();
  const hora = Utilities.formatDate(agora, "America/Sao_Paulo", "HH");
  const horaNum = parseInt(hora, 10);

  if (critico) {
    return horaNum >= 6 && horaNum <= 23;
  } else {
    return horaNum >= 8 && horaNum <= 21;
  }
}

function escapeHtml(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function deveDispararAlerta(props, chaveAlerta, precoAtual, precoAnterior, precoAlvo, ehRecordeMinimo, nivelPreco, pctVariacao) {
  const propChave = `ALERTA_${chaveAlerta}`;
  const ultimoAlertaRaw = props.getProperty(propChave);
  let ultimoAlerta = null;
  if (ultimoAlertaRaw) {
    try { ultimoAlerta = JSON.parse(ultimoAlertaRaw); } catch (_) {}
  }

  if (ultimoAlerta && typeof ultimoAlerta.preco === "number") {
    if (Math.abs(ultimoAlerta.preco - precoAtual) < 0.01) {
      return false;
    }
  }

  const agora = new Date();
  const horasDesdeUltimo = ultimoAlerta && ultimoAlerta.timestamp
    ? (agora.getTime() - new Date(ultimoAlerta.timestamp).getTime()) / (1000 * 60 * 60)
    : Infinity;

  const ehQuedaRelampago = pctVariacao <= -GATILHO_QUEDA_RELAMPAGO_PCT;
  const ehNovoRecordeReal = ehRecordeMinimo && (!ultimoAlerta || precoAtual < ultimoAlerta.preco);
  const cruzouMetaAbaixo = (precoAnterior > 0 && precoAnterior > precoAlvo && precoAtual <= precoAlvo);
  const primeiraChecagemAtende = (precoAnterior === 0 && (precoAtual <= precoAlvo || nivelPreco === "LOW"));

  let deveAlertar = false;
  let tipoAlerta = null;

  if (ehQuedaRelampago) {
    if (horasDesdeUltimo >= 48) {
      deveAlertar = true;
      tipoAlerta = "QUEDA";
    }
  } else if (cruzouMetaAbaixo) {
    if (horasDesdeUltimo >= 168) {
      deveAlertar = true;
      tipoAlerta = "META";
    }
  } else if (ehNovoRecordeReal) {
    if (horasDesdeUltimo >= 48) {
      deveAlertar = true;
      tipoAlerta = "RECORDE";
    }
  } else if (primeiraChecagemAtende) {
    deveAlertar = true;
    tipoAlerta = "PRIMEIRA_CHECAGEM";
  }

  if (!deveAlertar) return false;

  props.setProperty(propChave, JSON.stringify({
    preco: precoAtual,
    timestamp: agora.toISOString(),
    tipo: tipoAlerta
  }));
  return true;
}

/**
 * MOTOR DE EXECUÇÃO COM GUARDIÃO DE TIMEOUT E TRATAMENTO DE COOLDOWN
 */
function executarVarredura(forcarTodas) {
  const ehForcado = (forcarTodas === true);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    Logger.log("⚠️ Outra execução já está ativa. Abortando execução concorrente.");
    return;
  }

  const inicioExecucaoMs = Date.now();
  const TEMPO_LIMITE_SEGURANCA_MS = 290000; // 4m50s (respeitando limite de 6 min do GAS)

  try {
    try {
      verificarBugFaresEPromocoes();
    } catch (e) {
      Logger.log("Erro ao checar Bug Fares: " + e.message);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Monitoramento");
    if (!sheet) return;

    garantirEstruturaCabecalho(sheet);
    const dados = sheet.getDataRange().getValues();
    if (dados.length <= 1) return;

    const props = PropertiesService.getScriptProperties();
    const agoraObj = new Date();
    sincronizarPeriodosDeCota(props, agoraObj);

    const candidatos = [];
    for (let i = 1; i < dados.length; i++) {
      const linhaPlanilha = i + 1;
      const origem = String(dados[i][0] || "").trim();
      const destinoOuRegiao = String(dados[i][1] || "").trim();
      const campoVolta = dados[i][3];
      const duracaoMaxHoras = parseFloat(dados[i][4]) || 999;
      const precoAlvo = parsePreco(dados[i][5]) || Infinity;
      const ultimaChecagemValor = dados[i][14];
      const ultimaChecagemData = parseDataChecagem(ultimaChecagemValor);

      if (!origem || !destinoOuRegiao) continue;

      const codigoOrigem = resolverDestino(origem);
      const codigoDestino = resolverDestino(destinoOuRegiao);

      if (!codigoOrigem || !codigoDestino) {
        Logger.log(`[DESTINO NÃO RECONHECIDO] Linha ${linhaPlanilha}: Origem ou destino não reconhecido.`);
        sheet.getRange(linhaPlanilha, 7).setValue(`⚠️ Não reconhecido: ${!codigoOrigem ? origem : destinoOuRegiao}`);
        continue;
      }

      const dataIdaStr = formatarDataParaBusca(dados[i][2]);
      if (!dataIdaStr) {
        Logger.log(`[DATA INVÁLIDA] Linha ${linhaPlanilha}: Data de ida inválida.`);
        sheet.getRange(linhaPlanilha, 7).setValue("⚠️ Data de Ida Inválida");
        continue;
      }

      const dataVolta = calcularDataVolta(dataIdaStr, campoVolta);
      const tipoViagem = dataVolta ? "round_trip" : "one_way";
      const validacaoPeriodo = validarPeriodo(dataIdaStr, dataVolta, tipoViagem);

      if (!validacaoPeriodo.ok) {
        Logger.log(`[PERÍODO INVÁLIDO] Linha ${linhaPlanilha}: ${validacaoPeriodo.erro}`);
        sheet.getRange(linhaPlanilha, 7).setValue(`⚠️ Data Inválida: ${validacaoPeriodo.erro}`);
        continue;
      }

      const deveChecar = ehForcado || !ultimaChecagemData || verificarSeDeveChecar(dataIdaStr, ultimaChecagemData, agoraObj);

      candidatos.push({
        linhaPlanilha: linhaPlanilha,
        indiceDados: i,
        origem: origem,
        destinoOuRegiao: destinoOuRegiao,
        codigoOrigem: codigoOrigem,
        codigoDestino: codigoDestino,
        dataIdaStr: dataIdaStr,
        campoVolta: campoVolta,
        dataVolta: dataVolta,
        duracaoMaxHoras: duracaoMaxHoras,
        precoAlvo: precoAlvo,
        ultimaChecagemValor: ultimaChecagemValor,
        ultimaChecagemData: ultimaChecagemData,
        deveChecar: deveChecar
      });
    }

    const linhasParaProcessar = candidatos.filter(c => c.deveChecar);

    // Fila Justa anti-inanição (LRU: a rota há mais tempo sem checagem vai para o topo)
    linhasParaProcessar.sort((a, b) => {
      if (!a.ultimaChecagemData && b.ultimaChecagemData) return -1;
      if (a.ultimaChecagemData && !b.ultimaChecagemData) return 1;
      if (!a.ultimaChecagemData && !b.ultimaChecagemData) return a.linhaPlanilha - b.linhaPlanilha;

      const diffTempo = a.ultimaChecagemData.getTime() - b.ultimaChecagemData.getTime();
      if (diffTempo !== 0) return diffTempo;
      return a.linhaPlanilha - b.linhaPlanilha;
    });

    // Em execução horária automática, processa 1 rota por vez (24 buscas/dia), garantindo cota para o dia todo
    const rotasFinais = ehForcado ? linhasParaProcessar : linhasParaProcessar.slice(0, 1);

    let linhasExecutadas = 0;
    const agoraFormatado = Utilities.formatDate(agoraObj, "America/Sao_Paulo", "dd/MM/yyyy HH:mm");

    for (const item of rotasFinais) {
      if (Date.now() - inicioExecucaoMs > TEMPO_LIMITE_SEGURANCA_MS) {
        Logger.log("⚠️ Limite de tempo de segurança (4m50s) atingido. Interrompendo varredura de forma controlada.");
        break;
      }

      const chaveInfo = selecionarChaveDisponivel(props);
      if (!chaveInfo) {
        Logger.log("⚠️ Limite de cota atingido ou chaves em cooldown hoje/mês.");
        break;
      }

      registrarConsumoChave(props, chaveInfo.indice);
      linhasExecutadas++;

      Logger.log(`[Execução ${linhasExecutadas} | Chave ${chaveInfo.indice + 1}/4] ${item.origem} (${item.codigoOrigem}) ➔ ${item.destinoOuRegiao} (${item.codigoDestino}) | Volta: ${item.dataVolta || "Só Ida"}`);

      const resultado = buscarOfertas(
        chaveInfo.chave,
        item.codigoOrigem,
        item.codigoDestino,
        item.origem,
        item.destinoOuRegiao,
        item.dataIdaStr,
        item.dataVolta,
        item.duracaoMaxHoras
      );

      if (resultado.erro && resultado.mensagemErro && (resultado.mensagemErro.includes("429") || resultado.mensagemErro.toLowerCase().includes("rate limit"))) {
        const trintaMinutos = Date.now() + 30 * 60 * 1000;
        props.setProperty(`COOLDOWN_CHAVE_${chaveInfo.indice}`, String(trintaMinutos));
        Logger.log(`⚠️ Chave ${chaveInfo.indice + 1} em cooldown por 30 minutos devido a rate limit.`);
      }

      const linha = item.linhaPlanilha;
      const precoAnterior = parsePreco(dados[item.indiceDados][7]);
      const menorJaVistoAnterior = parsePreco(dados[item.indiceDados][8]) || Infinity;

      if (resultado.ok && resultado.encontrouVoos) {
        const oferta = resultado.oferta;
        const precoAtual = oferta.preco;
        const novoMenorPreco = Math.min(precoAtual, menorJaVistoAnterior);
        const ehRecordeMinimo = precoAtual < menorJaVistoAnterior;

        let variacaoTexto = "Estável";
        let pct = 0;

        if (precoAnterior > 0) {
          const diff = precoAtual - precoAnterior;
          pct = (diff / precoAnterior) * 100;
          if (pct <= -GATILHO_QUEDA_RELAMPAGO_PCT) {
            variacaoTexto = `🟢 ${pct.toFixed(1)}% (Caiu R$ ${Math.abs(diff).toFixed(0)})`;
          } else if (pct < 0) {
            variacaoTexto = `🟢 ${pct.toFixed(1)}% (Caiu R$ ${Math.abs(diff).toFixed(0)})`;
          } else if (pct > 0) {
            variacaoTexto = `🔴 +${pct.toFixed(1)}% (Subiu R$ ${diff.toFixed(0)})`;
          }
        } else {
          variacaoTexto = "Primeira Checagem";
        }

        const custoInfoCompleto = avaliarCustoDestinoComTotal(
          oferta.destinoReal,
          item.destinoOuRegiao,
          precoAtual,
          item.dataIdaStr,
          item.dataVolta
        );

        sheet.getRange(linha, 7).setValue(oferta.destinoReal);
        sheet.getRange(linha, 8).setValue(precoAtual).setNumberFormat('"R$"#,##0.00');
        sheet.getRange(linha, 9).setValue(novoMenorPreco).setNumberFormat('"R$"#,##0.00');
        sheet.getRange(linha, 10).setValue(variacaoTexto);
        sheet.getRange(linha, 11).setValue(oferta.termometro);
        sheet.getRange(linha, 12).setValue(custoInfoCompleto.textoResumo);
        sheet.getRange(linha, 13).setValue(`${oferta.duracaoHoras.toFixed(1)}h | ${oferta.detalhes}`);
        sheet.getRange(linha, 14).setValue(oferta.dicaStopover);
        sheet.getRange(linha, 15).setValue(agoraFormatado);
        sheet.getRange(linha, 16).setValue(oferta.link);

        const chaveAlerta = `${item.codigoOrigem}_${item.codigoDestino}_${item.dataIdaStr}_${item.dataVolta || "SO_IDA"}`;
        if (deveDispararAlerta(props, chaveAlerta, precoAtual, precoAnterior, item.precoAlvo, ehRecordeMinimo, oferta.nivelPreco, pct)) {
          enviarAlertaInteligente(item.origem, item.destinoOuRegiao, item.dataIdaStr, item.dataVolta, oferta, variacaoTexto, ehRecordeMinimo, custoInfoCompleto);
        }
      } else if (resultado.ok && !resultado.encontrouVoos) {
        sheet.getRange(linha, 7).setValue(item.destinoOuRegiao);
        sheet.getRange(linha, 8).setValue("Sem voos no filtro");
        sheet.getRange(linha, 10).setValue("-");
        sheet.getRange(linha, 11).setValue(resultado.mensagem || "⚪ Nenhum voo");
        sheet.getRange(linha, 15).setValue(agoraFormatado);
        Logger.log(`[SEM VOOS NO FILTRO] Linha ${linha}: ${resultado.mensagem || "Sem voos disponíveis"}`);
      } else {
        sheet.getRange(linha, 7).setValue(`⚠️ Erro: ${resultado.mensagemErro || "Falha na consulta"}`);
        Logger.log(`[FALHA NA CONSULTA] Linha ${linha}: ${resultado.mensagemErro}`);
      }

      Utilities.sleep(1500);
    }

    const linhasPendentes = rotasFinais.length - linhasExecutadas;
    const msgRelatorio = `Execução concluída: ${linhasExecutadas} rota(s) consultada(s). ${ehForcado && linhasPendentes > 0 ? `⚠️ ${linhasPendentes} rotas pendentes por limite de cota/tempo.` : ""}`;
    Logger.log(msgRelatorio);

    if (ehForcado) {
      try {
        const ui = SpreadsheetApp.getUi();
        ui.alert(
          "Forçar Checagem Concluída",
          `Rotas verificadas: ${linhasExecutadas}\n${linhasPendentes > 0 ? `Rotas pendentes: ${linhasPendentes}` : "Nenhuma rota ficou pendente."}`,
          ui.ButtonSet.OK
        );
      } catch (_) {}
    }
  } finally {
    lock.releaseLock();
  }
}

function verificarSeDeveChecar(dataIdaStr, ultimaChecagemData, agoraObj) {
  try {
    if (!ultimaChecagemData || isNaN(ultimaChecagemData.getTime())) return true;

    const horasPassadas = (agoraObj - ultimaChecagemData) / (1000 * 60 * 60);
    // Intervalo de segurança para não repetir a mesma rota na mesma hora
    if (horasPassadas < 1) return false;

    const partesIda = dataIdaStr.split("-");
    const dataIda = new Date(parseInt(partesIda[0], 10), parseInt(partesIda[1], 10) - 1, parseInt(partesIda[2], 10));
    const diffDiasAteVoo = (dataIda - agoraObj) / (1000 * 60 * 60 * 24);

    if (diffDiasAteVoo <= 30) {
      return horasPassadas >= 2; // Viagens próximas: checagem a cada 2h
    } else if (diffDiasAteVoo <= 90) {
      return horasPassadas >= 4; // Médio prazo: a cada 4h
    } else {
      return horasPassadas >= 8; // Longo prazo: a cada 8h
    }
  } catch (e) {
    return true;
  }
}

/**
 * CONSULTA A SERPAPI COM MAX_DURATION, LINKS ESTRUTURADOS E CODIFICAÇÃO
 */
function buscarOfertas(apiKey, origemCod, destinoCod, nomeOrigem, nomeDestino, dataIda, dataVolta, duracaoMaxHoras) {
  const origemSerp = normalizarParaSerpApi(origemCod);
  const destinoSerp = normalizarParaSerpApi(destinoCod);
  const duracaoMaxMinutos = (duracaoMaxHoras && Number(duracaoMaxHoras) > 0) ? Math.round(Number(duracaoMaxHoras) * 60) : Infinity;

  function param(nome, valor) {
    return `${nome}=${encodeURIComponent(String(valor))}`;
  }

  let urlParts = [
    "https://serpapi.com/search.json?engine=google_flights",
    param("departure_id", origemSerp),
    param("arrival_id", destinoSerp),
    param("outbound_date", dataIda),
    param("currency", "BRL"),
    param("hl", "pt"),
    param("type", dataVolta ? "1" : "2")
  ];

  if (duracaoMaxMinutos !== Infinity) {
    urlParts.push(param("max_duration", duracaoMaxMinutos));
  }

  if (dataVolta) {
    urlParts.push(param("return_date", dataVolta));
  }

  urlParts.push(param("api_key", apiKey));
  const url = urlParts.join("&");

  try {
    const resposta = UrlFetchApp.fetch(url, { method: "get", muteHttpExceptions: true });
    const codigoHttp = resposta.getResponseCode ? resposta.getResponseCode() : 200;
    const textoResposta = resposta.getContentText();

    if (codigoHttp >= 400) {
      let msgErro = `HTTP ${codigoHttp}`;
      try {
        const errJson = JSON.parse(textoResposta);
        if (errJson.error) msgErro += `: ${errJson.error}`;
      } catch (_) {}
      return { ok: false, erro: true, mensagemErro: msgErro };
    }

    let json;
    try {
      json = JSON.parse(textoResposta);
    } catch (eJson) {
      return { ok: false, erro: true, mensagemErro: "JSON inválido retornado pela API" };
    }

    if (json.error) {
      const errStr = String(json.error).toLowerCase();
      if (errStr.includes("hasn't returned any results") || errStr.includes("no results") || errStr.includes("hasn't returned any flight")) {
        return {
          ok: true,
          encontrouVoos: false,
          mensagem: "Sem voos para esta rota/filtro no Google Flights"
        };
      }
      return { ok: false, erro: true, mensagemErro: "API: " + json.error };
    }

    let termometro = "⚪ Preço Normal";
    let nivelPreco = "NORMAL";
    if (json.price_insights) {
      nivelPreco = json.price_insights.price_level || "TYPICAL";
      if (nivelPreco === "LOW") termometro = "🟢 Super Barato (Promoção!)";
      else if (nivelPreco === "HIGH") termometro = "🔴 Caro (Acima da média)";
    }

    const todosVoos = [...(json.best_flights || []), ...(json.other_flights || [])];
    if (todosVoos.length === 0) {
      return {
        ok: true,
        encontrouVoos: false,
        mensagem: "Sem voos disponíveis no Google Flights para esta data"
      };
    }

    let melhorOpcao = null;
    const linkWebEstruturado = gerarLinkGoogleFlights(origemCod, destinoCod, dataIda, dataVolta);

    for (const voo of todosVoos) {
      const duracaoMinutos = Number(voo.total_duration);
      const preco = Number(voo.price);
      if (!Number.isFinite(duracaoMinutos) || !Number.isFinite(preco) || preco <= 0) continue;

      if (duracaoMinutos > duracaoMaxMinutos) continue;

      let destinoFinal = nomeDestino;
      const segmentos = Array.isArray(voo.flights) ? voo.flights : [];
      if (segmentos.length > 0) {
        const ult = segmentos[segmentos.length - 1];
        if (ult && ult.arrival_airport) {
          destinoFinal = `${ult.arrival_airport.name} (${ult.arrival_airport.id})`;
        }
      }

      const cias = [...new Set(
        segmentos
          .map(f => (f && (f.airline || f.airline_code)) || null)
          .filter(Boolean)
      )].join(", ") || "Companhia não informada";
      const escalas = Math.max(0, segmentos.length - 1);

      const layovers = Array.isArray(voo.layovers) ? voo.layovers : [];
      const layoversValidos = layovers
        .map(l => ({
          aeroporto: (l && l.id) ? l.id : "N/A",
          nome: (l && l.name) ? l.name : "Aeroporto não informado",
          minutos: Number(l && l.duration),
          overnight: Boolean(l && l.overnight)
        }))
        .filter(l => Number.isFinite(l.minutos));

      let dicaStopover = "-";
      if (layoversValidos.length > 0) {
        const longas = layoversValidos.filter(l => l.minutos >= 480);
        if (longas.length > 0) {
          const principal = longas[0];
          const horario = principal.overnight ? "noturna" : "longa";
          dicaStopover = `Possível conexão ${horario} de ${Math.floor(principal.minutos / 60)}h em ${principal.aeroporto} (${principal.nome}). Confirme regras da tarifa.`;
        }
      }

      if (!melhorOpcao || preco < melhorOpcao.preco) {
        melhorOpcao = {
          preco: preco,
          duracaoHoras: duracaoMinutos / 60,
          destinoReal: destinoFinal,
          termometro: termometro,
          nivelPreco: nivelPreco,
          detalhes: `${escalas} escala(s) | ${cias}`,
          dicaStopover: dicaStopover,
          link: linkWebEstruturado
        };
      }
    }

    if (!melhorOpcao) {
      return {
        ok: true,
        encontrouVoos: false,
        mensagem: `Sem voos dentro da duração máxima (${duracaoMaxHoras}h)`
      };
    }

    return {
      ok: true,
      encontrouVoos: true,
      oferta: melhorOpcao
    };
  } catch (erro) {
    return {
      ok: false,
      erro: true,
      mensagemErro: "Falha de rede: " + erro.message
    };
  }
}

function garantirEstruturaCabecalho(sheet) {
  const colunasAtuais = sheet.getLastColumn();
  if (colunasAtuais < 16) {
    const novosCabecalhos = [
      [
        "Origem (Cidade)", "Destino ou Região", "Data de Ida", "Volta (Data ou Dias)",
        "Duração Máx (h)", "Preço Alvo (R$)", "Destino Encontrado", "Preço Atual (R$)",
        "Menor Já Visto (R$)", "Variação (%)", "Termômetro Voo", "Custo no Destino ($)",
        "Conexões / Cia", "Dica Stopover (2 em 1)", "Última Checagem", "Link Google Flights"
      ]
    ];
    sheet.getRange(1, 1, 1, 16).setValues(novosCabecalhos);
    sheet.getRange(1, 1, 1, 16)
      .setBackground("#0d47a1")
      .setFontColor("#ffffff")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
  }
}

function enviarTelegram(textoHtml, urlBotao, textoBotao, silencioso) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text: textoHtml,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    disable_notification: Boolean(silencioso)
  };

  if (urlBotao) {
    payload.reply_markup = {
      inline_keyboard: [[{ text: escapeHtml(textoBotao || "✈️ Ver voos"), url: urlBotao }]]
    };
  }

  try {
    UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log("Erro Telegram: " + e.message);
  }
}

function testarNotificacaoTelegram() {
  enviarTelegram(
    "✈️ <b>RADAR DE VIAGENS ATIVO!</b>\n\nO robô de viagens no Google Apps Script está operacional e monitorando passagens.",
    "https://www.google.com/travel/flights",
    "🌍 Abrir Google Flights",
    false
  );
  Logger.log("Mensagem de teste enviada para o Telegram!");
}

function montarMensagemTelegram(prefixoAssunto, origem, destinoReal, dataIda, voltaTexto, preco, variacao, custoInfoCompleto, duracaoHoras, detalhes, dicaStopover, link) {
  const prefixoMap = {
    "🚨 QUEDA RELÂMPAGO": "🚨",
    "✈️ OPORTUNIDADE": "✈️",
    "🏆 NOVO RECORDE DE PREÇO BAIXO": "🏆"
  };
  const emoji = prefixoMap[prefixoAssunto] || "✈️";

  let msg = `<b>${emoji} ${escapeHtml(prefixoAssunto)}</b>\n\n`;
  msg += `✈️ <b>${escapeHtml(origem)} ➔ ${escapeHtml(destinoReal)}</b>\n`;
  msg += `📅 ${escapeHtml(dataIda)}${escapeHtml(voltaTexto)}\n`;
  msg += `💰 <b>Voo: R$ ${preco.toFixed(2).replace(".", ",")}</b>\n`;

  if (variacao && variacao !== "Estável" && variacao !== "Primeira Checagem") {
    msg += `📊 ${escapeHtml(variacao)}\n`;
  }

  if (custoInfoCompleto && custoInfoCompleto.diasViagem > 0) {
    msg += `🏨 Estadia (${custoInfoCompleto.diasViagem}d): ~R$ ${custoInfoCompleto.custoTerrestre.toFixed(0)}\n`;
    msg += `💵 <b>CUSTO TOTAL ESTIMADO: ~R$ ${custoInfoCompleto.custoTotalEstimado.toFixed(0)}</b>\n`;
  } else if (custoInfoCompleto && custoInfoCompleto.textoBase) {
    msg += `🏨 Custo no Destino: ${escapeHtml(custoInfoCompleto.textoBase)}\n`;
  }

  msg += `⏱️ ${duracaoHoras.toFixed(1).replace(".", ",")}h | ${escapeHtml(detalhes)}\n`;

  if (dicaStopover && dicaStopover !== "-") {
    msg += `\n💡 <i>${escapeHtml(dicaStopover)}</i>\n`;
  }

  msg += `\n⚠️ <i>Preços e disponibilidade sujeitos a alteração pela companhia aérea.</i>`;
  return msg;
}

function enviarAlertaInteligente(origem, destino, dataIda, dataVolta, oferta, variacao, ehRecorde, custoInfoCompleto) {
  const voltaTexto = dataVolta ? ` até ${dataVolta}` : " (Só Ida)";
  
  let prefixoAssunto = "✈️ OPORTUNIDADE";
  if (variacao.includes("Caiu")) prefixoAssunto = "🚨 QUEDA RELÂMPAGO";
  else if (ehRecorde) prefixoAssunto = "🏆 NOVO RECORDE DE PREÇO BAIXO";

  const assunto = `${prefixoAssunto}: ${origem} ➔ ${oferta.destinoReal} por R$ ${oferta.preco.toFixed(2)}`;
  let corpo = `Relatório de Oportunidade Aérea:\n\n` +
              `• Rota: ${origem} ➔ ${oferta.destinoReal} (${destino})\n` +
              `• Período: ${dataIda}${voltaTexto}\n` +
              `• Preço do Voo: R$ ${oferta.preco.toFixed(2)}\n`;

  if (custoInfoCompleto && custoInfoCompleto.diasViagem > 0) {
    corpo += `• Estadia Estimada (${custoInfoCompleto.diasViagem} dias): R$ ${custoInfoCompleto.custoTerrestre.toFixed(2)}\n` +
             `• CUSTO TOTAL DA VIAGEM (Voo + Estadia): R$ ${custoInfoCompleto.custoTotalEstimado.toFixed(2)}\n`;
  } else if (custoInfoCompleto && custoInfoCompleto.textoBase) {
    corpo += `• Custo no Destino: ${custoInfoCompleto.textoBase}\n`;
  }

  corpo += `• Variação Recente: ${variacao}\n` +
           `• Termômetro Voo: ${oferta.termometro}\n` +
           `• Duração / Escalas: ${oferta.duracaoHoras.toFixed(1)}h | ${oferta.detalhes}\n`;

  if (oferta.dicaStopover !== "-") {
    corpo += `\n💡 DICA DE CONEXÃO:\n• ${oferta.dicaStopover}\n`;
  }
  corpo += `\n🔗 Link de busca no Google Flights (preços podem mudar):\n${oferta.link}\n`;
  GmailApp.sendEmail(EMAIL_NOTIFICACAO, assunto, corpo);

  const ehNoite = !dentroDaJanelaDeNotificacao(false);
  if (ehNoite) {
    Logger.log("Alerta fora da janela diurna (08h-21h). Enviando Telegram no modo silencioso.");
  }

  const msgTelegram = montarMensagemTelegram(
    prefixoAssunto,
    origem,
    oferta.destinoReal,
    dataIda,
    voltaTexto,
    oferta.preco,
    variacao,
    custoInfoCompleto,
    oferta.duracaoHoras,
    oferta.detalhes,
    oferta.dicaStopover,
    oferta.link
  );

  enviarTelegram(msgTelegram, oferta.link, "✈️ Ver voos", ehNoite);
}

// TERMOS INEQUÍVOCOS DE ERRO DE TARIFA (BUG FARE AUTÊNTICO)
const TERMOS_BUG_FARE = [
  "erro de tarifa",
  "bug fare",
  "bug de tarifa",
  "tarifa com erro",
  "tarifa errada",
  "erro no preço",
  "erro no preco",
  "preço errado",
  "preco errado"
];

// LISTA NEGRA IMPLACÁVEL CONTRA MARKETING, AFILIADOS E PUBLIPOSTS
const TERMOS_MARKETING_BANIDOS = [
  "pacote", "pacotes",
  "hotel", "hotéis", "hoteis", "resort", "resorts", "pousada", "pousadas", "fazenda",
  "cupom", "cupons", "off", "desconto",
  "executiva", "business", "primeira classe",
  "seguro", "seguro viagem",
  "carro", "aluguel", "locação", "rent a car",
  "cartão", "cartao", "cartões", "cartoes",
  "milhas", "pontos", "pontuação", "clube", "livelo", "esfera", "smiles", "latam pass", "tudoazul",
  "cruzeiro", "navio", "ingressos", "disney"
];

function verificarBugFaresEPromocoes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("🚨 Bug Fares") || ss.getSheetByName("Promoções & Bug Fares") || ss.getSheetByName("🚨 Bug Fares & Promos");

  if (!sheet) {
    sheet = ss.insertSheet("🚨 Bug Fares");
    sheet.getRange(1, 1, 1, 4).setValues([["Data/Hora", "Tipo de Alerta", "Título do Bug Fare", "Link da Oferta"]]);
    sheet.getRange(1, 1, 1, 4)
      .setBackground("#b71c1c")
      .setFontColor("#ffffff")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, 4);
  }

  try {
    const options = { headers: { "User-Agent": "Mozilla/5.0" }, muteHttpExceptions: true };
    const resposta = UrlFetchApp.fetch(FEED_PROMOCOES_URL, options);
    const xml = XmlService.parse(resposta.getContentText());
    const items = xml.getRootElement().getChild("channel").getChildren("item");

    const props = PropertiesService.getScriptProperties();
    let ultimosLinksProcessados = JSON.parse(props.getProperty("LINKS_PROMOCOES_VISTOS") || "[]");
    let novosAlertas = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const titulo = item.getChildText("title") || "";
      const link = item.getChildText("link") || "";
      const tituloLower = titulo.toLowerCase();
      const linkLower = link.toLowerCase();

      if (ultimosLinksProcessados.includes(link)) continue;

      // Filtro 1: Descarta qualquer publieditorial, afiliado de pacote, hotel, cupom ou executiva
      const ehMarketing = TERMOS_MARKETING_BANIDOS.some(t => tituloLower.includes(t) || linkLower.includes(t));
      if (ehMarketing) {
        ultimosLinksProcessados.push(link);
        continue;
      }

      // Filtro 2: Exige positivamente ser um ERRO DE TARIFA legítimo (Bug Fare)
      const ehBugFare = TERMOS_BUG_FARE.some(t => tituloLower.includes(t));
      if (!ehBugFare) {
        ultimosLinksProcessados.push(link);
        continue;
      }

      const tipoAlerta = "🚨 BUG FARE (ERRO DE TARIFA!)";
      const agora = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy HH:mm");

      sheet.appendRow([agora, tipoAlerta, titulo, link]);

      const ehNoite = !dentroDaJanelaDeNotificacao(true);
      enviarAlertaBugFare(tipoAlerta, titulo, link, ehNoite);

      ultimosLinksProcessados.push(link);
      novosAlertas++;
    }

    if (ultimosLinksProcessados.length > 50) {
      ultimosLinksProcessados = ultimosLinksProcessados.slice(-50);
    }
    props.setProperty("LINKS_PROMOCOES_VISTOS", JSON.stringify(ultimosLinksProcessados));
    Logger.log(`✅ Varredura de Bug Fares concluída. ${novosAlertas} novos erros de tarifa autênticos.`);
  } catch (e) {
    Logger.log("Erro feed: " + e.message);
  }
}

function limparPropagandasBugFares() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("🚨 Bug Fares") || ss.getSheetByName("Promoções & Bug Fares") || ss.getSheetByName("🚨 Bug Fares & Promos");
  if (!sheet) return;

  const ultimaLinha = sheet.getLastRow();
  if (ultimaLinha <= 1) return;

  const dados = sheet.getRange(2, 1, ultimaLinha - 1, 4).getValues();
  const linhasLimpas = [];

  for (let r = 0; r < dados.length; r++) {
    const tipo = String(dados[r][1] || "").toLowerCase();
    const titulo = String(dados[r][2] || "").toLowerCase();
    const link = String(dados[r][3] || "").toLowerCase();

    const ehPromoComum = tipo.includes("megapromoção") || tipo.includes("megapromocao");
    const contemMarketing = TERMOS_MARKETING_BANIDOS.some(t => titulo.includes(t) || link.includes(t));

    if (!ehPromoComum && !contemMarketing) {
      linhasLimpas.push(dados[r]);
    }
  }

  if (ultimaLinha > 1) {
    sheet.deleteRows(2, ultimaLinha - 1);
  }
  if (linhasLimpas.length > 0) {
    sheet.getRange(2, 1, linhasLimpas.length, 4).setValues(linhasLimpas);
  }
  Logger.log(`🧹 Aba de Bug Fares higienizada: ${dados.length - linhasLimpas.length} anúncios removidos.`);
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      "Higienização Concluída",
      `Foram removidos ${dados.length - linhasLimpas.length} anúncios e posts comerciais da aba de Bug Fares.\nRestam ${linhasLimpas.length} ofertas autênticas.`,
      ui.ButtonSet.OK
    );
  } catch (_) {}
}

function enviarAlertaBugFare(tipo, titulo, link, silencioso) {
  const assunto = `${tipo}: ${titulo}`;
  const corpo = `ATENÇÃO! Acabamos de detectar uma oportunidade relâmpago no radar:\n\n` +
                `• Título: ${titulo}\n` +
                `• Categoria: ${tipo}\n\n` +
                `⚡ DICA DE OURO:\n` +
                `Erros de tarifa e megapromoções podem esgotar em poucas horas e nem sempre são honrados pelas companhias.\n\n` +
                `🔗 Acesse a oferta imediatamente para verificar disponibilidade:\n${link}\n`;
  GmailApp.sendEmail(EMAIL_NOTIFICACAO, assunto, corpo);

  const msgTelegram =
    `<b>${escapeHtml(tipo)}</b>\n\n` +
    `📢 <b>${escapeHtml(titulo)}</b>\n\n` +
    `⚡ <i>Erros de tarifa e promoções relâmpago esgotam muito rápido. Verifique disponibilidade no link!</i>`;
  enviarTelegram(msgTelegram, link, "⚡ Ver oferta", silencioso);
}

function inserirFeriadosProlongados() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Monitoramento");
  if (!sheet) return;

  const origemPadrao = String(sheet.getRange(2, 1).getValue()).trim() || "São Paulo";

  const feriados = [
    [origemPadrao, "América do Sul", "2026-10-09", "2026-10-12", 8, 2000],
    [origemPadrao, "Europa", "2026-11-13", "2026-11-23", 16, 4300],
    [origemPadrao, "Estados Unidos", "2026-12-23", "2027-01-02", 15, 4800],
    [origemPadrao, "América do Sul", "2027-02-05", "2027-02-10", 8, 2200],
    [origemPadrao, "Nordeste", "2027-03-25", "2027-03-28", 6, 1200],
    [origemPadrao, "Europa", "2027-04-21", "2027-04-26", 16, 4200],
    [origemPadrao, "Buenos Aires", "2027-05-27", "2027-05-30", 6, 1800]
  ];

  const proximaLinha = Math.max(sheet.getLastRow() + 1, 2);
  sheet.getRange(proximaLinha, 1, feriados.length, 6).setValues(feriados);
  Logger.log(`✅ ${feriados.length} feriados prolongados inseridos na planilha.`);
}

function aplicarFormatacaoCondicionalPrecos(sheet) {
  try {
    const totalLinhas = Math.max(sheet.getLastRow(), 2);
    if (totalLinhas <= 1) return;
    const rangePrecoAtual = sheet.getRange(2, 8, totalLinhas - 1, 1); // Coluna H (Preço Atual)

    // Regra 1: Verde se Preço Atual <= Preço Alvo (Coluna F)
    const regraVerde = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied("=AND(ISNUMBER(H2), ISNUMBER(F2), H2<=F2, H2>0)")
      .setBackground("#e6f4ea")
      .setFontColor("#137333")
      .setRanges([rangePrecoAtual])
      .build();

    // Regra 2: Vermelho se Preço Atual > 1.5 * Preço Alvo
    const regraVermelho = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied("=AND(ISNUMBER(H2), ISNUMBER(F2), H2>(F2*1.5))")
      .setBackground("#fce8e6")
      .setFontColor("#c5221f")
      .setRanges([rangePrecoAtual])
      .build();

    sheet.setConditionalFormatRules([regraVerde, regraVermelho]);
  } catch (e) {
    Logger.log("Aviso: Formatação condicional não suportada: " + e.message);
  }
}

function configurarPlanilhaInicial() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Monitoramento");
  if (!sheet) {
    sheet = ss.insertSheet("Monitoramento");
  }

  const cabecalhos = [
    [
      "Origem (Cidade)", "Destino ou Região", "Data de Ida", "Volta (Data ou Dias)",
      "Duração Máx (h)", "Preço Alvo (R$)", "Destino Encontrado", "Preço Atual (R$)",
      "Menor Já Visto (R$)", "Variação (%)", "Termômetro Voo", "Custo no Destino ($)",
      "Conexões / Cia", "Dica Stopover (2 em 1)", "Última Checagem", "Link Google Flights"
    ]
  ];

  sheet.getRange(1, 1, 1, 16).setValues(cabecalhos);
  sheet.getRange(1, 1, 1, 16)
    .setBackground("#0d47a1")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  const totalLinhas = sheet.getLastRow();

  if (totalLinhas > 1) {
    sheet.getRange(2, 6, totalLinhas - 1, 1).setNumberFormat('"R$"#,##0.00');
    sheet.getRange(2, 8, totalLinhas - 1, 1).setNumberFormat('"R$"#,##0.00');
    sheet.getRange(2, 9, totalLinhas - 1, 1).setNumberFormat('"R$"#,##0.00');
    aplicarFormatacaoCondicionalPrecos(sheet);
  } else {
    const exemplos = [
      ["São Paulo", "Europa", "2026-11-10", 14, 16, 4200],
      ["São Paulo", "Buenos Aires", "2026-10-15", 7, 8, 1900],
      ["Rio de Janeiro", "Belém", "2027-01-17", "Só Ida", 8, 700],
      ["Rio de Janeiro", "Ribeirão Preto", "2027-01-17", "Só Ida", 6, 800]
    ];
    sheet.getRange(2, 1, 4, 6).setValues(exemplos);
    sheet.getRange(2, 6, 4, 1).setNumberFormat('"R$"#,##0.00');
    aplicarFormatacaoCondicionalPrecos(sheet);
  }

  sheet.setFrozenRows(1);
  for (let col = 1; col <= 16; col++) {
    sheet.autoResizeColumn(col);
  }
  Logger.log("✅ Planilha reformatada com formatação condicional ativa!");
}

function reinicializarPlanilhaDoZero() {
  try {
    const ui = SpreadsheetApp.getUi();
    const resposta = ui.alert(
      "Confirmar Reinicialização",
      "ATENÇÃO: Isso apagará TODOS os dados da aba \"Monitoramento\" e restaurará os exemplos iniciais. Deseja continuar?",
      ui.ButtonSet.YES_NO
    );
    if (resposta !== ui.Button.YES) {
      Logger.log("Operação cancelada pelo usuário.");
      return;
    }
  } catch (_) {}

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Monitoramento");
  if (!sheet) {
    sheet = ss.insertSheet("Monitoramento");
  } else {
    sheet.clear();
  }

  const cabecalhos = [
    [
      "Origem (Cidade)", "Destino ou Região", "Data de Ida", "Volta (Data ou Dias)",
      "Duração Máx (h)", "Preço Alvo (R$)", "Destino Encontrado", "Preço Atual (R$)",
      "Menor Já Visto (R$)", "Variação (%)", "Termômetro Voo", "Custo no Destino ($)",
      "Conexões / Cia", "Dica Stopover (2 em 1)", "Última Checagem", "Link Google Flights"
    ]
  ];

  sheet.getRange(1, 1, 1, 16).setValues(cabecalhos);
  sheet.getRange(1, 1, 1, 16)
    .setBackground("#0d47a1")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  const exemplos = [
    ["São Paulo", "Europa", "2026-11-10", 14, 16, 4200],
    ["São Paulo", "Buenos Aires", "2026-10-15", 7, 8, 1900],
    ["Rio de Janeiro", "Belém", "2027-01-17", "Só Ida", 8, 700],
    ["Rio de Janeiro", "Ribeirão Preto", "2027-01-17", "Só Ida", 6, 800]
  ];
  sheet.getRange(2, 1, 4, 6).setValues(exemplos);
  sheet.getRange(2, 6, 4, 1).setNumberFormat('"R$"#,##0.00');

  aplicarFormatacaoCondicionalPrecos(sheet);

  sheet.setFrozenRows(1);
  for (let col = 1; col <= 16; col++) {
    sheet.autoResizeColumn(col);
  }
  Logger.log("Planilha completamente reinicializada com exemplos padrão.");
}

// Exportação para testes unitários em Node.js (ignorado em ambiente Apps Script)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    parsePreco,
    ehSoIda,
    formatarDataParaBusca,
    validarPeriodo,
    calcularDataVolta,
    dentroDaJanelaDeNotificacao,
    escapeHtml,
    montarMensagemTelegram,
    sincronizarPeriodosDeCota,
    selecionarChaveDisponivel,
    registrarConsumoChave,
    parseDataChecagem,
    deveDispararAlerta,
    buscarOfertas,
    executarVarredura,
    configurarPlanilhaInicial,
    reinicializarPlanilhaDoZero,
    zerarContadorHoje,
    verificarSeDeveChecar,
    resolverDestino,
    avaliarCustoDestino,
    avaliarCustoDestinoComTotal,
    gerarLinkGoogleFlights,
    exibirRelatorioCotas,
    aplicarFormatacaoCondicionalPrecos,
    enviarTelegram,
    enviarAlertaInteligente,
    verificarBugFaresEPromocoes,
    enviarAlertaBugFare,
    limparPropagandasBugFares,
    ativarTriggerHorario,
    desativarTriggers,
    TERMOS_BUG_FARE,
    TERMOS_MARKETING_BANIDOS,
    normalizarParaSerpApi,
    MAPA_AEROPORTOS_SERPAPI,
    SERPAPI_KEYS,
    LIMITE_DIARIO_TOTAL,
    LIMITE_DIARIO_POR_CHAVE,
    LIMITE_MENSAL_POR_CHAVE,
    GATILHO_QUEDA_RELAMPAGO_PCT
  };
}
