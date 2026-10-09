#!/usr/bin/env node
/**
 * ==============================================================================
 * ULTRA ROTINA · MONITOR DE TELEMETRIA AO VIVO (TELEGRAM & COCKPIT)
 * ==============================================================================
 * Exibe as interações em tempo real do Dr. Wagner com o Telegram Bot e o Cockpit.
 * Uso:
 *   node scripts/ver_interacoes.cjs           (exibe as últimas interações)
 *   node scripts/ver_interacoes.cjs -f        (acompanha ao vivo em tempo real)
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');

const LOGS_FILE = path.join(__dirname, '..', 'logs', 'interacao_ao_vivo.jsonl');
const SEGUIR = process.argv.includes('-f') || process.argv.includes('--follow');

const CORES = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  verde: '\x1b[32m',
  azul: '\x1b[34m',
  ciano: '\x1b[36m',
  amarelo: '\x1b[33m',
  vermelho: '\x1b[31m',
  magenta: '\x1b[35m'
};

function formatarLinha(item) {
  if (!item || !item.timestamp) return null;
  const hora = item.hora || new Date(item.timestamp).toLocaleTimeString('pt-BR');
  
  let icone = '📱';
  let tagOrigem = `${CORES.azul}[TELEGRAM]${CORES.reset}`;
  if (item.origem === 'cockpit_pwa') {
    icone = '💻';
    tagOrigem = `${CORES.magenta}[COCKPIT ]${CORES.reset}`;
  }

  if (item.tipo === 'callback') icone = '🔘';
  else if (item.tipo === 'voice') icone = '🎙️';
  else if (item.tipo === 'photo') icone = '📸';
  else if (item.tipo === 'rpc') icone = '⚡';

  const statusCor = item.status === 'sucesso' ? `${CORES.verde}✔ OK${CORES.reset}` : `${CORES.vermelho}✖ ERRO${CORES.reset}`;
  const duracao = item.duracao_ms ? `${CORES.dim}(${item.duracao_ms}ms)${CORES.reset}` : '';

  return `${CORES.dim}[${hora}]${CORES.reset} ${tagOrigem} ${icone} ${CORES.bold}${item.resumo}${CORES.reset} ${statusCor} ${duracao}`;
}

function exibirHistorico() {
  if (!fs.existsSync(LOGS_FILE)) {
    console.log(`${CORES.amarelo}[Aviso] Nenhum log de interação registrado ainda em ${LOGS_FILE}.${CORES.reset}`);
    console.log(`${CORES.dim}Envie uma mensagem no bot ou abra o Cockpit para gerar eventos.${CORES.reset}`);
    return 0;
  }

  const conteudo = fs.readFileSync(LOGS_FILE, 'utf-8');
  const linhas = conteudo.trim().split('\n').filter(Boolean);
  const ultimas = linhas.slice(-25);

  console.log(`\n${CORES.bold}${CORES.ciano}════════════════════════════════════════════════════════════════════════════════${CORES.reset}`);
  console.log(`${CORES.bold} 🩺 ULTRA ROTINA · TELEMETRIA DE INTERAÇÃO EM TEMPO REAL${CORES.reset}`);
  console.log(`${CORES.dim} Arquivo: ${LOGS_FILE} (${linhas.length} eventos registrados)${CORES.reset}`);
  console.log(`${CORES.bold}${CORES.ciano}════════════════════════════════════════════════════════════════════════════════${CORES.reset}\n`);

  ultimas.forEach(l => {
    try {
      const item = JSON.parse(l);
      const fmt = formatarLinha(item);
      if (fmt) console.log(fmt);
    } catch (_) {}
  });

  console.log('');
  return fs.statSync(LOGS_FILE).size;
}

let ultimaPos = exibirHistorico();

if (SEGUIR) {
  console.log(`${CORES.verde}📡 Monitorando novas interações ao vivo... Pressione Ctrl+C para encerrar.${CORES.reset}\n`);
  
  setInterval(() => {
    if (!fs.existsSync(LOGS_FILE)) return;
    const stats = fs.statSync(LOGS_FILE);
    if (stats.size > ultimaPos) {
      const stream = fs.createReadStream(LOGS_FILE, { start: ultimaPos, end: stats.size });
      let acumulado = '';
      stream.on('data', chunk => { acumulado += chunk.toString(); });
      stream.on('end', () => {
        acumulado.trim().split('\n').filter(Boolean).forEach(l => {
          try {
            const item = JSON.parse(l);
            const fmt = formatarLinha(item);
            if (fmt) console.log(fmt);
          } catch (_) {}
        });
        ultimaPos = stats.size;
      });
    }
  }, 1000);
}
