/**
 * @file src/clinical/tdc_service.js
 * @description Motor RAG Determinístico Local sobre o acervo clínico "Tá de Clinicagem" (data/tdc_knowledge.db).
 *              Consulta instantânea (< 2ms) via node:sqlite FTS5 (BM25) nos 3.899 documentos clínicos.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const STOPWORDS_PT = new Set([
  'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos', 'um', 'uma',
  'para', 'por', 'com', 'sem', 'sob', 'sobre', 'que', 'se', 'ao', 'aos', 'ou',
  'as', 'os', 'ele', 'ela', 'paciente', 'relata', 'refere', 'apresenta', 'ha',
  'dias', 'horas', 'anos', 'meses', 'exame', 'fisico', 'normal', 'nega', 'uso',
  'caso', 'clinico', 'sintetico', 'auditoria', 'consulta', 'atendimento'
]);

function normalizeQueryTokens(text) {
  if (!text || typeof text !== 'string') return [];
  const clean = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ');

  const seen = new Set();
  const tokens = [];
  for (const w of clean.split(/\s+/)) {
    if (w.length >= 3 && !STOPWORDS_PT.has(w) && !/^\d+$/.test(w) && !seen.has(w)) {
      seen.add(w);
      tokens.push(w);
    }
    if (tokens.length >= 8) break;
  }
  return tokens;
}

class TdcKnowledgeService {
  constructor(dbPathOverride = null) {
    this.sqliteDb = null;
    this._initSqlite(dbPathOverride);
  }

  _initSqlite(customPath = null) {
    try {
      const candidates = [
        customPath,
        process.env.TDC_DB_PATH,
        path.resolve(__dirname, '../../data/tdc_knowledge.db'),
        path.resolve(process.cwd(), 'data/tdc_knowledge.db')
      ].filter(Boolean);

      let found = null;
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          found = p;
          break;
        }
      }

      if (found) {
        const { DatabaseSync } = require('node:sqlite');
        this.sqliteDb = new DatabaseSync(found, { open: true, readOnly: true });
        this.sqliteDb.exec('PRAGMA query_only = ON; PRAGMA mmap_size = 67108864;');
      }
    } catch (_) {
      this.sqliteDb = null;
    }
  }

  /**
   * Busca evidências clínicas relevantes no banco FTS5 do Tá de Clinicagem em < 2ms.
   * @param {string} rawText - Texto da queixa, hipótese ou brain dump.
   * @param {number} [limit=3] - Número máximo de documentos retornados.
   * @returns {Array<{id: number, title: string, category: string, specialty: string, snippet: string}>}
   */
  buscarEvidenciasClinicas(rawText = '', limit = 3) {
    if (!this.sqliteDb || !rawText) return [];
    const tokens = normalizeQueryTokens(rawText);
    if (tokens.length === 0) return [];

    const maxLimit = Math.min(Math.max(Number(limit) || 3, 1), 10);
    const ftsMatchQuery = tokens.map((t) => `"${t}"*`).join(' OR ');

    try {
      const sql = `
        SELECT
          d.id,
          d.title,
          d.category,
          d.specialty,
          d.edition_date,
          substr(d.markdown_content, 1, 900) AS snippet
        FROM clinical_documents_fts f
        JOIN clinical_documents d ON d.id = f.rowid
        WHERE clinical_documents_fts MATCH ?
        ORDER BY bm25(clinical_documents_fts, 5.0, 2.0, 1.5, 2.0, 1.0)
        LIMIT ?
      `;
      const rows = this.sqliteDb.prepare(sql).all(ftsMatchQuery, maxLimit);
      return Array.isArray(rows) ? rows : [];
    } catch (_) {
      return [];
    }
  }

  /**
   * Alias de conveniência para busca de evidências clínicas por tema/assunto.
   */
  buscarPorTema(tema = '', options = {}) {
    const limit = options.limite || options.limit || 3;
    return this.buscarEvidenciasClinicas(tema, limit);
  }
}

const tdcService = new TdcKnowledgeService();

module.exports = {
  TdcKnowledgeService,
  tdcService
};
