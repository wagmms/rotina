/**
 * RADAR DE OPORTUNIDADES AÉREAS - TRAVEL HACKING ENGINE (VERSÃO ROBUSTA AUDITADA)
 * 
 * Correções e Melhorias de Arquitetura:
 * 1. Suporte universal a "Só Ida" (com ou sem acento, maiúsculas/minúsculas).
 * 2. Diferenciação estrita entre "Sem voos no filtro" e falhas de API/HTTP/JSON.
 * 3. Proteção com LockService, cotas diárias e mensais por chave, com contabilização atômica.
 * 4. Deduplicação inteligente de alertas para evitar notificações repetidas do mesmo preço.
 * 5. Armazenamento numérico com formatação monetária e parser compatível com dados antigos.
 * 6. Fila justa anti-inanição (LRU) para evitar que as primeiras linhas esgotem a cota.
 * 7. Reformatar Planilha com preservação integral de dados existentes e ação separada de reset.
 */

// POOL DE 4 CHAVES BALANCEADAS (1.000 BUSCAS/MÊS NO TOTAL)
const SERPAPI_KEYS = [
  "SERPAPI_KEY_CONTA_1",
  "SERPAPI_KEY_CONTA_2",
  "SERPAPI_KEY_CONTA_3",
  "SERPAPI_KEY_CONTA_4"
];

const EMAIL_NOTIFICACAO = "usuario@exemplo.com";
const TELEGRAM_BOT_TOKEN = "TOKEN_TELEGRAM_BOT_PLACEHOLDER";
const TELEGRAM_CHAT_ID = "123456789";

// Limites matemáticos de cota
const LIMITE_DIARIO_POR_CHAVE = 8;
const LIMITE_MENSAL_POR_CHAVE = 250;
const LIMITE_DIARIO_TOTAL = SERPAPI_KEYS.length * LIMITE_DIARIO_POR_CHAVE; // 32 buscas/dia
const GATILHO_QUEDA_RELAMPAGO_PCT = 10;
const FEED_PROMOCOES_URL = "https://www.melhoresdestinos.com.br/feed";

// ÍNDICE DE CUSTO DE VIDA NO DESTINO
const DICIONARIO_CUSTO_DESTINO = {
  "buenos aires": "🟢 $ Econômico (~R$ 180/dia)",
  "argentina": "🟢 $ Econômico (~R$ 180/dia)",
  "mendoza": "🟢 $ Econômico (~R$ 220/dia)",
  "bariloche": "🟢 $ Econômico (~R$ 250/dia)",
  "santiago": "🟢 $ Econômico (~R$ 240/dia)",
  "chile": "🟢 $ Econômico (~R$ 240/dia)",
  "lima": "🟢 $ Econômico (~R$ 190/dia)",
  "peru": "🟢 $ Econômico (~R$ 190/dia)",
  "bogota": "🟢 $ Econômico (~R$ 180/dia)",
  "colombia": "🟢 $ Econômico (~R$ 180/dia)",
  "america do sul": "🟢 $ Econômico (~R$ 200/dia)",
  "belem": "🟢 $ Nacional (~R$ 170/dia)",
  "ribeirao preto": "🟢 $ Nacional (~R$ 160/dia)",
  "curitiba": "🟢 $ Nacional (~R$ 190/dia)",
  "salvador": "🟢 $ Nacional (~R$ 180/dia)",
  "recife": "🟢 $ Nacional (~R$ 180/dia)",
  "fortaleza": "🟢 $ Nacional (~R$ 180/dia)",
  "natal": "🟢 $ Nacional (~R$ 190/dia)",
  "nordeste": "🟢 $ Nacional (~R$ 180/dia)",
  "lisboa": "🟡 $$ Moderado (~R$ 380/dia)",
  "porto": "🟡 $$ Moderado (~R$ 340/dia)",
  "portugal": "🟡 $$ Moderado (~R$ 360/dia)",
  "madrid": "🟡 $$ Moderado (~R$ 420/dia)",
  "barcelona": "🟡 $$ Moderado (~R$ 450/dia)",
  "espanha": "🟡 $$ Moderado (~R$ 420/dia)",
  "roma": "🟡 $$ Moderado (~R$ 460/dia)",
  "italia": "🟡 $$ Moderado (~R$ 450/dia)",
  "montevideu": "🟡 $$ Moderado (~R$ 350/dia)",
  "uruguai": "🟡 $$ Moderado (~R$ 350/dia)",
  "cancun": "🟡 $$ Moderado (~R$ 400/dia)",
  "punta cana": "🟡 $$ Moderado (~R$ 420/dia)",
  "rio de janeiro": "🟡 $$ Moderado (~R$ 260/dia)",
  "sao paulo": "🟡 $$ Moderado (~R$ 280/dia)",
  "orlando": "🟠 $$$ Caro (~R$ 650/dia)",
  "miami": "🟠 $$$ Caro (~R$ 750/dia)",
  "paris": "🟠 $$$ Caro (~R$ 700/dia)",
  "franca": "🟠 $$$ Caro (~R$ 680/dia)",
  "berlim": "🟠 $$$ Caro (~R$ 550/dia)",
  "amsterdam": "🟠 $$$ Caro (~R$ 750/dia)",
  "los angeles": "🟠 $$$ Caro (~R$ 800/dia)",
  "san francisco": "🟠 $$$ Caro (~R$ 850/dia)",
  "estados unidos": "🟠 $$$ Caro (~R$ 750/dia)",
  "eua": "🟠 $$$ Caro (~R$ 750/dia)",
  "europa": "🟡 $$ a $$$ (~R$ 500/dia)",
  "nova york": "🔴 $$$$ Ultra Caro (~R$ 1.100/dia)",
  "londres": "🔴 $$$$ Ultra Caro (~R$ 1.050/dia)",
  "zurique": "🔴 $$$$ Ultra Caro (~R$ 1.200/dia)",
  "suica": "🔴 $$$$ Ultra Caro (~R$ 1.200/dia)",
  "toquio": "🔴 $$$$ Alto (~R$ 750/dia)"
};

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
  "america do sul": "SCL",
  "sul america": "SCL",
  "argentina": "AEP",
  "uruguai": "MVD",
  "peru": "LIM",
  "colombia": "BOG"
};

const DICIONARIO_CIDADES = {
  "sao paulo": "GRU", "sp": "GRU", "sampa": "GRU",
  "rio de janeiro": "GIG", "rio": "GIG", "rj": "GIG",
  "ribeirao preto": "RAO", "ribeirao": "RAO",
  "campinas": "VCP", "sao jose do rio preto": "SJP",
  "bauru": "JTC", "marilia": "MII", "presidente prudente": "PPB",
  "belo horizonte": "CNF", "bh": "CNF", "uberlandia": "UDI",
  "vitoria": "VIX", "belem": "BEL", "manaus": "MAO", "porto velho": "PVH",
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
  "buenos aires": "AEP", "bue": "AEP", "eze": "EZE", "aep": "AEP",
  "santiago": "SCL", "scl": "SCL",
  "montevideu": "MVD", "montevideo": "MVD",
  "bariloche": "BRC", "mendoza": "MDZ",
  "lima": "LIM", "bogota": "BOG", "cancun": "CUN", "punta cana": "PUJ",
  "lisboa": "LIS", "porto": "OPO", "madrid": "MAD", "madri": "MAD",
  "barcelona": "BCN", "paris": "CDG", "roma": "FCO", "milao": "MXP",
  "londres": "LHR", "amsterdam": "AMS", "frankfurt": "FRA",
  "zurique": "ZRH", "miami": "MIA", "orlando": "MCO", "nova york": "JFK",
  "los angeles": "LAX", "san francisco": "SFO", "toquio": "HND"
};

/**
 * MENU NATIVO NA PLANILHA
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu("✈️ Radar de Viagens")
      .addItem("🔄 Verificar Voos (Agendamento Inteligente)", "verificarVoosGoogleFlights")
      .addItem("⚡ Forçar Checagem de Todas as Linhas", "forcarVerificacaoCompleta")
      .addItem("🚨 Caçar Bug Fares & Promoções Agora", "verificarBugFaresEPromocoes")
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
 * PARSER ROBUSTO DE PREÇOS
 * Lida com valores numéricos nativos e strings legadas: "R$ 1.234,56", "R$ 1234.56", "765,00"
 */
function parsePreco(valor) {
  if (typeof valor === "number" && !isNaN(valor)) return valor;
  if (valor === null || valor === undefined) return 0;
  let s = String(valor).replace(/R\$/gi, "").trim();
  if (!s) return 0;

  // Se tiver ponto e vírgula juntos
  if (s.includes(".") && s.includes(",")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      // Padrão brasileiro: 1.234,56 -> 1234.56
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // Padrão americano: 1,234.56 -> 1234.56
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    // Apenas vírgula decimal: "1234,56" -> "1234.56"
    s = s.replace(",", ".");
  }
  // Se contiver apenas ponto (ex: "1234.56"), o parseFloat trata nativamente

  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

/**
 * IDENTIFICA SE O CAMPO VOLTA REPRESENTA "SÓ IDA"
 * Funciona com ou sem acento, maiúsculas/minúsculas e variações
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
 * CALCULA DATA DE VOLTA
 * Retorna null estrito para "Só Ida", permitindo busca one-way
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
  }

  return formatarData(campoVolta);
}

/**
 * SINCRONIZAÇÃO DE PERÍODOS DE COTA
 * Garante reset diário e mensal por chave sem corromper histórico
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
 * SELEÇÃO E CONTROLE ATÔMICO DE CHAVES (POOL MULTI-CHAVE)
 */
function selecionarChaveDisponivel(props) {
  let indiceInicial = parseInt(props.getProperty("INDICE_CHAVE_ATUAL") || "0", 10);
  if (isNaN(indiceInicial) || indiceInicial >= SERPAPI_KEYS.length) indiceInicial = 0;

  for (let i = 0; i < SERPAPI_KEYS.length; i++) {
    const idx = (indiceInicial + i) % SERPAPI_KEYS.length;
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
      }
      Logger.log("Contadores diários resetados para 0 com sucesso (cotas mensais preservadas).");
    } finally {
      lock.releaseLock();
    }
  }
}

/**
 * PARSER DE DATA DE ÚLTIMA CHECAGEM
 */
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

/**
 * DEDUPLICAÇÃO DE ALERTAS
 * Impede reenvio repetido para a mesma rota, datas e preço
 */
function deveDispararAlerta(props, chaveAlerta, precoAtual, precoAnterior, precoAlvo, ehRecordeMinimo, nivelPreco, pctVariacao) {
  const propChave = `ALERTA_${chaveAlerta}`;
  const ultimoAlertaRaw = props.getProperty(propChave);
  let ultimoAlerta = null;
  if (ultimoAlertaRaw) {
    try { ultimoAlerta = JSON.parse(ultimoAlertaRaw); } catch (_) {}
  }

  // 1. Deduplicação estrita: se o preço for idêntico ao já alertado, não reenviar
  if (ultimoAlerta && typeof ultimoAlerta.preco === "number") {
    if (Math.abs(ultimoAlerta.preco - precoAtual) < 0.01) {
      return false;
    }
  }

  const ehQuedaRelampago = pctVariacao <= -GATILHO_QUEDA_RELAMPAGO_PCT;
  const cruzouMetaAbaixo = (precoAnterior > precoAlvo && precoAtual <= precoAlvo);
  const primeiraChecagemAtende = (precoAnterior === 0 && (precoAtual <= precoAlvo || nivelPreco === "LOW"));
  const ehNovoRecordeReal = ehRecordeMinimo && (!ultimoAlerta || precoAtual < ultimoAlerta.preco);

  if (ehQuedaRelampago || ehNovoRecordeReal || cruzouMetaAbaixo || primeiraChecagemAtende) {
    props.setProperty(propChave, JSON.stringify({
      preco: precoAtual,
      timestamp: new Date().toISOString()
    }));
    return true;
  }

  return false;
}

/**
 * MOTOR DE EXECUÇÃO OTIMIZADO COM FILA JUSTA (LRU) E LOCKSERVICE
 */
function executarVarredura(forcarTodas) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    Logger.log("⚠️ Outra execução já está ativa. Abortando execução concorrente.");
    return;
  }

  try {
    // 1. Radar de Bug Fares (Custo ZERO)
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

    // 2. Coleta de candidatos da planilha
    const candidatos = [];
    for (let i = 1; i < dados.length; i++) {
      const linhaPlanilha = i + 1;
      const origem = String(dados[i][0] || "").trim();
      const destinoOuRegiao = String(dados[i][1] || "").trim();
      const dataIdaStr = formatarData(dados[i][2]);
      const campoVolta = dados[i][3];
      const duracaoMaxHoras = parseFloat(dados[i][4]) || 999;
      const precoAlvo = parsePreco(dados[i][5]) || Infinity;
      const ultimaChecagemValor = dados[i][14];
      const ultimaChecagemData = parseDataChecagem(ultimaChecagemValor);

      if (!origem || !destinoOuRegiao || !dataIdaStr) continue;

      const deveChecar = forcarTodas || !ultimaChecagemData || verificarSeDeveChecar(dataIdaStr, ultimaChecagemData, agoraObj);

      candidatos.push({
        linhaPlanilha: linhaPlanilha,
        indiceDados: i,
        origem: origem,
        destinoOuRegiao: destinoOuRegiao,
        dataIdaStr: dataIdaStr,
        campoVolta: campoVolta,
        duracaoMaxHoras: duracaoMaxHoras,
        precoAlvo: precoAlvo,
        ultimaChecagemValor: ultimaChecagemValor,
        ultimaChecagemData: ultimaChecagemData,
        deveChecar: deveChecar
      });
    }

    const linhasParaProcessar = candidatos.filter(c => c.deveChecar);

    // 3. Fila Justa anti-inanição: ordena por prioridade (nunca checadas primeiro, depois as mais antigas)
    linhasParaProcessar.sort((a, b) => {
      if (!a.ultimaChecagemData && b.ultimaChecagemData) return -1;
      if (a.ultimaChecagemData && !b.ultimaChecagemData) return 1;
      if (!a.ultimaChecagemData && !b.ultimaChecagemData) return a.linhaPlanilha - b.linhaPlanilha;

      const diffTempo = a.ultimaChecagemData.getTime() - b.ultimaChecagemData.getTime();
      if (diffTempo !== 0) return diffTempo;
      return a.linhaPlanilha - b.linhaPlanilha;
    });

    let linhasExecutadas = 0;
    const agoraFormatado = Utilities.formatDate(agoraObj, "America/Sao_Paulo", "dd/MM/yyyy HH:mm");

    for (const item of linhasParaProcessar) {
      const chaveInfo = selecionarChaveDisponivel(props);
      if (!chaveInfo) {
        Logger.log("⚠️ Limite de cota atingido em todas as chaves disponíveis hoje/mês.");
        break;
      }

      // Contabilização atômica iniciada: consome cota antes da requisição
      registrarConsumoChave(props, chaveInfo.indice);
      linhasExecutadas++;

      const dataVolta = calcularDataVolta(item.dataIdaStr, item.campoVolta);
      const codigoOrigem = resolverDestino(item.origem);
      const codigoDestino = resolverDestino(item.destinoOuRegiao);

      Logger.log(`[Execução ${linhasExecutadas} | Chave ${chaveInfo.indice + 1}/4] ${item.origem} (${codigoOrigem}) ➔ ${item.destinoOuRegiao} (${codigoDestino}) | Volta: ${dataVolta || 'Só Ida'}`);

      const resultado = buscarOfertas(
        chaveInfo.chave,
        codigoOrigem,
        codigoDestino,
        item.origem,
        item.destinoOuRegiao,
        item.dataIdaStr,
        dataVolta,
        item.duracaoMaxHoras
      );

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

        const custoDestinoInfo = avaliarCustoDestino(oferta.destinoReal, item.destinoOuRegiao);

        sheet.getRange(linha, 7).setValue(oferta.destinoReal);

        // Gravação estritamente numérica com formatação monetária
        sheet.getRange(linha, 8).setValue(precoAtual).setNumberFormat('"R$"#,##0.00');
        sheet.getRange(linha, 9).setValue(novoMenorPreco).setNumberFormat('"R$"#,##0.00');

        sheet.getRange(linha, 10).setValue(variacaoTexto);
        sheet.getRange(linha, 11).setValue(oferta.termometro);
        sheet.getRange(linha, 12).setValue(custoDestinoInfo);
        sheet.getRange(linha, 13).setValue(`${oferta.duracaoHoras.toFixed(1)}h | ${oferta.detalhes}`);
        sheet.getRange(linha, 14).setValue(oferta.dicaStopover);
        sheet.getRange(linha, 15).setValue(agoraFormatado);
        sheet.getRange(linha, 16).setValue(oferta.link);

        // Deduplicação de alertas
        const chaveAlerta = `${codigoOrigem}_${codigoDestino}_${item.dataIdaStr}_${dataVolta || 'SO_IDA'}`;
        if (deveDispararAlerta(props, chaveAlerta, precoAtual, precoAnterior, item.precoAlvo, ehRecordeMinimo, oferta.nivelPreco, pct)) {
          enviarAlertaInteligente(item.origem, item.destinoOuRegiao, item.dataIdaStr, dataVolta, oferta, variacaoTexto, ehRecordeMinimo, custoDestinoInfo);
        }
      } else if (resultado.ok && !resultado.encontrouVoos) {
        // Busca válida na API, mas sem voos disponíveis
        sheet.getRange(linha, 7).setValue("Sem voos no filtro");
        sheet.getRange(linha, 11).setValue(resultado.mensagem || "Nenhum voo encontrado");
        sheet.getRange(linha, 15).setValue(agoraFormatado);
      } else {
        // Falha real da API, rede ou HTTP: registra o erro e permite nova tentativa
        sheet.getRange(linha, 7).setValue(`⚠️ Erro: ${resultado.mensagemErro || "Falha na consulta"}`);
        Logger.log(`[FALHA NA CONSULTA] Linha ${linha}: ${resultado.mensagemErro}`);
        // NÃO sobrescreve a data com sucesso para que continue prioritária na próxima checagem
      }

      Utilities.sleep(1500);
    }

    const linhasPendentes = linhasParaProcessar.length - linhasExecutadas;
    const msgRelatorio = `Execução concluída: ${linhasExecutadas} rotas consultadas. ${linhasPendentes > 0 ? `⚠️ ${linhasPendentes} rotas pendentes por limite de cota.` : "Todas as rotas da fila foram verificadas."}`;
    Logger.log(msgRelatorio);

    if (forcarTodas) {
      try {
        const ui = SpreadsheetApp.getUi();
        ui.alert(
          "Forçar Checagem Concluída",
          `Rotas verificadas: ${linhasExecutadas}\n${linhasPendentes > 0 ? `Rotas pendentes (cota esgotada): ${linhasPendentes}` : "Nenhuma rota ficou pendente."}`,
          ui.ButtonSet.OK
        );
      } catch (_) {}
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * REGRAS DE VELOCIDADE ACELERADA COM CHECAGEM TEMPORAL
 */
function verificarSeDeveChecar(dataIdaStr, ultimaChecagemData, agoraObj) {
  try {
    if (!ultimaChecagemData || isNaN(ultimaChecagemData.getTime())) return true;

    const partesIda = dataIdaStr.split("-");
    const dataIda = new Date(parseInt(partesIda[0], 10), parseInt(partesIda[1], 10) - 1, parseInt(partesIda[2], 10));
    const diffDiasAteVoo = (dataIda - agoraObj) / (1000 * 60 * 60 * 24);

    const horasPassadas = (agoraObj - ultimaChecagemData) / (1000 * 60 * 60);

    if (diffDiasAteVoo <= 45) {
      return horasPassadas >= 4; // ZONA QUENTE: a cada 4 horas
    } else if (diffDiasAteVoo <= 120) {
      return horasPassadas >= 12; // ZONA MÉDIA: a cada 12 horas
    } else {
      return horasPassadas >= 48; // ZONA FRIA: a cada 48 horas
    }
  } catch (e) {
    return true;
  }
}

/**
 * CONSULTA A SERPAPI COM TRATAMENTO DE ERROS DISTINTO
 */
function buscarOfertas(apiKey, origemCod, destinoCod, nomeOrigem, nomeDestino, dataIda, dataVolta, duracaoMaxHoras) {
  const duracaoMaxMinutos = duracaoMaxHoras * 60;

  let url = `https://serpapi.com/search.json?engine=google_flights` +
            `&departure_id=${origemCod}` +
            `&arrival_id=${destinoCod}` +
            `&outbound_date=${dataIda}` +
            `&currency=BRL` +
            `&hl=pt` +
            `&api_key=${apiKey}`;

  if (dataVolta) {
    url += `&type=1&return_date=${dataVolta}`;
  } else {
    url += `&type=2`;
  }

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
    const linkWeb = `https://www.google.com/travel/flights?q=Voos%20de%20${encodeURIComponent(nomeOrigem)}%20para%20${encodeURIComponent(nomeDestino)}%20em%20${dataIda}`;

    for (const voo of todosVoos) {
      const duracaoMinutos = voo.total_duration;
      const preco = voo.price;
      if (!duracaoMinutos || !preco) continue;

      if (duracaoMinutos > duracaoMaxMinutos) continue;

      let destinoFinal = nomeDestino;
      if (voo.flights && voo.flights.length > 0) {
        const ult = voo.flights[voo.flights.length - 1];
        if (ult.arrival_airport) {
          destinoFinal = `${ult.arrival_airport.name} (${ult.arrival_airport.id})`;
        }
      }

      const cias = (voo.flights || []).map(f => f.airline).filter((v, i, a) => a.indexOf(v) === i).join(", ");
      const escalas = voo.flights ? voo.flights.length - 1 : 0;

      let dicaStopover = "-";
      const ciasLower = cias.toLowerCase();
      if (ciasLower.includes("tap") || ciasLower.includes("tp")) {
        dicaStopover = "🇵🇹 Stopover grátis em Lisboa/Porto (até 5 dias)";
      } else if (ciasLower.includes("copa") || ciasLower.includes("cm")) {
        dicaStopover = "🇵🇦 Stopover grátis no Panamá (até 7 dias)";
      } else if (ciasLower.includes("iberia") || ciasLower.includes("ib")) {
        dicaStopover = "🇪🇸 Stopover grátis em Madri (até 6 dias)";
      } else if (ciasLower.includes("avianca") || ciasLower.includes("av")) {
        dicaStopover = "🇨🇴 Stopover grátis em Bogotá";
      }

      if (!melhorOpcao || preco < melhorOpcao.preco) {
        melhorOpcao = {
          preco: preco,
          duracaoHoras: duracaoMinutos / 60,
          destinoReal: destinoFinal,
          detalhes: `${escalas} escala(s) | Cias: ${cias}`,
          dicaStopover: dicaStopover,
          termometro: termometro,
          nivelPreco: nivelPreco,
          link: linkWeb
        };
      }
    }

    if (!melhorOpcao) {
      return {
        ok: true,
        encontrouVoos: false,
        mensagem: "Nenhum voo atendeu ao filtro de duração máxima"
      };
    }

    return {
      ok: true,
      encontrouVoos: true,
      oferta: melhorOpcao
    };
  } catch (e) {
    return { ok: false, erro: true, mensagemErro: "Falha de rede: " + e.message };
  }
}

function avaliarCustoDestino(destinoReal, destinoOriginal) {
  const busca1 = String(destinoReal || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const busca2 = String(destinoOriginal || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  for (const chave in DICIONARIO_CUSTO_DESTINO) {
    if (busca1.includes(chave) || busca2.includes(chave)) {
      return DICIONARIO_CUSTO_DESTINO[chave];
    }
  }
  return "🟡 $$ Médio";
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

function resolverDestino(texto) {
  if (!texto) return "";
  const limpo = texto.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (DICIONARIO_REGIOES[limpo]) return DICIONARIO_REGIOES[limpo];
  if (DICIONARIO_CIDADES[limpo]) return DICIONARIO_CIDADES[limpo];

  if (texto.trim().length === 3 && /^[A-Za-z]{3}$/.test(texto.trim())) {
    return texto.trim().toUpperCase();
  }
  if (texto.trim().startsWith("/m/") || texto.trim().startsWith("/g/")) {
    return texto.trim();
  }
  return texto.trim();
}

function formatarData(valor) {
  if (valor instanceof Date) {
    return Utilities.formatDate(valor, "America/Sao_Paulo", "yyyy-MM-dd");
  }
  return String(valor).trim();
}

function enviarTelegram(textoHtml, urlBotao, textoBotao) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text: textoHtml,
    parse_mode: "HTML",
    disable_web_page_preview: false
  };

  if (urlBotao) {
    payload.reply_markup = {
      inline_keyboard: [[{ text: textoBotao || "🔗 Abrir no Google Flights", url: urlBotao }]]
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
    "⚡ <b>RADAR EM ALTA VELOCIDADE:</b>\n\nNotificações ativas com verificação de cotas e fila justa anti-inanição!",
    "https://docs.google.com/spreadsheets/d/14kmdf5xmmL3-zMAY2UsJ5Niz8J5mxKB_gLEGYm2q3r4",
    "📊 Abrir Planilha de Voos"
  );
  Logger.log("Mensagem de teste enviada para o Telegram!");
}

function verificarBugFaresEPromocoes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Promoções & Bug Fares");

  if (!sheet) {
    sheet = ss.insertSheet("Promoções & Bug Fares");
    sheet.getRange(1, 1, 1, 4).setValues([["Data/Hora", "Tipo de Alerta", "Título da Promoção", "Link da Oferta"]]);
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

      if (ultimosLinksProcessados.includes(link)) continue;

      const ehBugFare = tituloLower.includes("erro") || tituloLower.includes("bug") || tituloLower.includes("loucura") || tituloLower.includes("histórico");
      const ehMegaPromo = tituloLower.includes("a partir de r$") || tituloLower.includes("ida e volta") || tituloLower.includes("passagens baratas") || tituloLower.includes("imperdível") || tituloLower.includes("super");

      if (ehBugFare || ehMegaPromo) {
        const tipoAlerta = ehBugFare ? "🚨 BUG FARE (ERRO DE TARIFA!)" : "🔥 MEGAPROMOÇÃO RELÂMPAGO";
        const agora = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy HH:mm");

        sheet.appendRow([agora, tipoAlerta, titulo, link]);
        enviarAlertaBugFare(tipoAlerta, titulo, link);

        ultimosLinksProcessados.push(link);
        novosAlertas++;
      }
    }

    if (ultimosLinksProcessados.length > 50) {
      ultimosLinksProcessados = ultimosLinksProcessados.slice(-50);
    }
    props.setProperty("LINKS_PROMOCOES_VISTOS", JSON.stringify(ultimosLinksProcessados));
    Logger.log(`✅ Varredura de Bug Fares concluída. ${novosAlertas} novas ofertas.`);
  } catch (e) {
    Logger.log("Erro feed: " + e.message);
  }
}

function enviarAlertaBugFare(tipo, titulo, link) {
  const assunto = `${tipo}: ${titulo}`;
  const corpo = `ATENÇÃO! Acabamos de detectar uma oportunidade relâmpago no radar:\n\n` +
                `• Título: ${titulo}\n` +
                `• Categoria: ${tipo}\n\n` +
                `⚡ DICA DE OURO:\n` +
                `Erros de tarifa e megapromoções esgotam em poucas horas pelas companhias aéreas.\n\n` +
                `🔗 Acesse a oferta imediatamente para emitir:\n${link}\n`;
  GmailApp.sendEmail(EMAIL_NOTIFICACAO, assunto, corpo);

  const msgTelegram = `<b>${tipo}</b>\n\n` +
                      `📢 <b>${titulo}</b>\n\n` +
                      `⚡ <i>Erros de tarifa e promoções relâmpago esgotam muito rápido!</i>`;
  enviarTelegram(msgTelegram, link, "⚡ VER OFERTA AGORA");
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

/**
 * REFORMATAR PLANILHA (PRESERVA DADOS EXISTENTES)
 * Atualiza apenas os cabeçalhos, formatação monetária e congelamento de linha
 */
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

  // Aplica formatação monetária nas colunas de preço caso já existam dados
  if (totalLinhas > 1) {
    sheet.getRange(2, 6, totalLinhas - 1, 1).setNumberFormat('"R$"#,##0.00');
    sheet.getRange(2, 8, totalLinhas - 1, 1).setNumberFormat('"R$"#,##0.00');
    sheet.getRange(2, 9, totalLinhas - 1, 1).setNumberFormat('"R$"#,##0.00');
  } else {
    // Insere exemplos apenas se a planilha estiver completamente vazia
    const exemplos = [
      ["São Paulo", "Europa", "2026-11-10", 14, 16, 4200],
      ["São Paulo", "América do Sul", "2026-10-15", 7, 8, 1900],
      ["Rio de Janeiro", "Belém", "2027-01-17", "Só Ida", 8, 700],
      ["Rio de Janeiro", "Ribeirão Preto", "2027-01-17", "Só Ida", 6, 800]
    ];
    sheet.getRange(2, 1, 4, 6).setValues(exemplos);
    sheet.getRange(2, 6, 4, 1).setNumberFormat('"R$"#,##0.00');
  }

  sheet.setFrozenRows(1);
  for (let col = 1; col <= 16; col++) {
    sheet.autoResizeColumn(col);
  }
  Logger.log("✅ Planilha reformatada com dados preservados com sucesso!");
}

/**
 * REINICIALIZAR PLANILHA DO ZERO (AÇÃO EXPLÍCITA)
 * Apaga tudo e recria a estrutura original limpa com exemplos
 */
function reinicializarPlanilhaDoZero() {
  try {
    const ui = SpreadsheetApp.getUi();
    const resposta = ui.alert(
      "Confirmar Reinicialização",
      "ATENÇÃO: Isso apagará TODOS os dados da aba 'Monitoramento' e restaurará os exemplos iniciais. Deseja continuar?",
      ui.ButtonSet.YES_NO
    );
    if (resposta !== ui.Button.YES) {
      Logger.log("Operação cancelada pelo usuário.");
      return;
    }
  } catch (_) {
    // Modo headless
  }

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
    ["São Paulo", "América do Sul", "2026-10-15", 7, 8, 1900],
    ["Rio de Janeiro", "Belém", "2027-01-17", "Só Ida", 8, 700],
    ["Rio de Janeiro", "Ribeirão Preto", "2027-01-17", "Só Ida", 6, 800]
  ];
  sheet.getRange(2, 1, 4, 6).setValues(exemplos);
  sheet.getRange(2, 6, 4, 1).setNumberFormat('"R$"#,##0.00');

  sheet.setFrozenRows(1);
  for (let col = 1; col <= 16; col++) {
    sheet.autoResizeColumn(col);
  }
  Logger.log("Planilha completamente reinicializada com exemplos padrão.");
}

function enviarAlertaInteligente(origem, destino, dataIda, dataVolta, oferta, variacao, ehRecorde, custoDestino) {
  const voltaTexto = dataVolta ? ` até ${dataVolta}` : " (Só Ida)";
  
  let prefixoAssunto = "✈️ OPORTUNIDADE";
  if (variacao.includes("Caiu")) prefixoAssunto = "🚨 QUEDA RELÂMPAGO";
  else if (ehRecorde) prefixoAssunto = "🏆 NOVO RECORDE DE PREÇO BAIXO";

  const assunto = `${prefixoAssunto}: ${origem} ➔ ${oferta.destinoReal} por R$ ${oferta.preco.toFixed(2)}`;
  let corpo = `Relatório de Oportunidade Aérea:\n\n` +
              `• Rota: ${origem} ➔ ${oferta.destinoReal} (${destino})\n` +
              `• Período: ${dataIda}${voltaTexto}\n` +
              `• Preço Atual: R$ ${oferta.preco.toFixed(2)}\n` +
              `• Variação Recente: ${variacao}\n` +
              `• Termômetro Voo: ${oferta.termometro}\n` +
              `• Custo no Destino: ${custoDestino}\n` +
              `• Duração / Escalas: ${oferta.duracaoHoras.toFixed(1)}h | ${oferta.detalhes}\n`;

  if (oferta.dicaStopover !== "-") {
    corpo += `\n💡 DICA DE TRAVEL HACKING (2-em-1):\n• ${oferta.dicaStopover}\n`;
  }
  corpo += `\n🔗 Link direto para emitir no Google Flights:\n${oferta.link}\n`;
  GmailApp.sendEmail(EMAIL_NOTIFICACAO, assunto, corpo);

  let msgTelegram = `<b>${prefixoAssunto}!</b>\n\n` +
                    `✈️ <b>${origem} ➔ ${oferta.destinoReal}</b>\n` +
                    `📅 <b>Período:</b> ${dataIda}${voltaTexto}\n` +
                    `💰 <b>Voo:</b> R$ ${oferta.preco.toFixed(2)}\n` +
                    `📊 <b>Variação:</b> ${variacao}\n` +
                    `🏨 <b>Custo no Destino:</b> ${custoDestino}\n` +
                    `⏱️ <b>Duração:</b> ${oferta.duracaoHoras.toFixed(1)}h (${oferta.detalhes})\n`;

  if (oferta.dicaStopover !== "-") {
    msgTelegram += `\n💡 <b>Dica 2-em-1:</b> ${oferta.dicaStopover}\n`;
  }

  enviarTelegram(msgTelegram, oferta.link, "✈️ VER NO GOOGLE FLIGHTS");
}

// Exportação para testes unitários em Node.js (ignorado em ambiente Apps Script)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    parsePreco,
    ehSoIda,
    calcularDataVolta,
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
    SERPAPI_KEYS,
    LIMITE_DIARIO_TOTAL,
    LIMITE_DIARIO_POR_CHAVE,
    LIMITE_MENSAL_POR_CHAVE
  };
}