/**
 * ==============================================================================
 * ULTRA ROTINA · GERADOR DE PDF VETORIAL A4 NATIVO (RECEITUÁRIO MÉDICO)
 * ==============================================================================
 * Converte dados estruturados de prescrição em PDF binário oficial de alta qualidade
 * pronto para impressão A4 e visualização em qualquer dispositivo/visualizador.
 * ==============================================================================
 */

const path = require('path');
const { spawnSync } = require('child_process');
const PDF_CLI_PATH = path.join(__dirname, 'pdf-cli.js');

/**
 * Função síncrona de altíssima performance para gerar PDF médico oficial via pdfkit.
 *
 * @param {Object} dados
 * @param {string} dados.nomePaciente
 * @param {string} dados.dataFormatada
 * @param {Array<{via: string, nome: string, quantidade: string, posologia: string}>} dados.itens
 * @param {Array<string>} [dados.orientacoes]
 * @param {boolean} [dados.ehRascunho]
 * @returns {Buffer} Buffer com os bytes legítimos do arquivo PDF (%PDF-1.3+)
 */
function gerarPdfReceitaSync(dados) {
  const jsonInput = JSON.stringify(dados || {});
  const res = spawnSync(process.execPath, [PDF_CLI_PATH], {
    input: jsonInput,
    maxBuffer: 32 * 1024 * 1024,
    timeout: 10000
  });

  if (res.error) {
    throw res.error;
  }

  if (res.status !== 0) {
    const errText = res.stderr ? res.stderr.toString('utf8') : `Erro status ${res.status}`;
    throw new Error(`Falha ao gerar PDF no subprocesso: ${errText}`);
  }

  const outBuf = res.stdout;
  if (!outBuf || outBuf.length < 50 || outBuf.slice(0, 4).toString() !== '%PDF') {
    throw new Error('Saída gerada não é um arquivo PDF válido.');
  }

  return outBuf;
}

module.exports = {
  gerarPdfReceitaSync
};
