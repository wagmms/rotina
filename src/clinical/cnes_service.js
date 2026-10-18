/**
 * @file src/clinical/cnes_service.js
 * @description Serviço Dual-Layer de alta performance (< 2ms) para busca de Municípios e Estabelecimentos
 *              de Saúde do CNES (base nacional completa com ~574.000 unidades em data/cnes.db e fallback em memória).
 */

const fs = require('node:fs');
const path = require('node:path');

const normalizeText = (str) => {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const MUNICIPIOS_BASE = [
  { ibge: '3550308', nome: 'São Paulo', uf: 'SP', polo: true },
  { ibge: '3543402', nome: 'Ribeirão Preto', uf: 'SP', polo: true },
  { ibge: '3509502', nome: 'Campinas', uf: 'SP', polo: true },
  { ibge: '3548708', nome: 'São Bernardo do Campo', uf: 'SP', polo: false },
  { ibge: '3547809', nome: 'Santo André', uf: 'SP', polo: false },
  { ibge: '3548500', nome: 'Santos', uf: 'SP', polo: false },
  { ibge: '3549805', nome: 'São José do Rio Preto', uf: 'SP', polo: true },
  { ibge: '3552205', nome: 'Sorocaba', uf: 'SP', polo: false },
  { ibge: '3304557', nome: 'Rio de Janeiro', uf: 'RJ', polo: true },
  { ibge: '3303302', nome: 'Niterói', uf: 'RJ', polo: false },
  { ibge: '3106200', nome: 'Belo Horizonte', uf: 'MG', polo: true },
  { ibge: '3170206', nome: 'Uberlândia', uf: 'MG', polo: false },
  { ibge: '4106902', nome: 'Curitiba', uf: 'PR', polo: true },
  { ibge: '4113700', nome: 'Londrina', uf: 'PR', polo: false },
  { ibge: '4314902', nome: 'Porto Alegre', uf: 'RS', polo: true },
  { ibge: '5300108', nome: 'Brasília', uf: 'DF', polo: true },
  { ibge: '2927408', nome: 'Salvador', uf: 'BA', polo: true },
  { ibge: '2611606', nome: 'Recife', uf: 'PE', polo: true },
  { ibge: '2304400', nome: 'Fortaleza', uf: 'CE', polo: true },
  { ibge: '5208707', nome: 'Goiânia', uf: 'GO', polo: true }
];

const ESTABELECIMENTOS_BASE = [
  // SÃO PAULO - SP (3550308)
  {
    cnes: '2077477',
    ibge: '3550308',
    cidade: 'São Paulo',
    uf: 'SP',
    nome_fantasia: 'Hospital Israelita Albert Einstein',
    razao_social: 'Sociedade Beneficente Israelita Brasileira Hospital Albert Einstein',
    tipo: 'HOSPITAL',
    esfera: 'PRIVADO',
    logradouro: 'Av. Albert Einstein, 627',
    bairro: 'Morumbi',
    cep: '05652-900',
    telefone: '(11) 2151-1233'
  },
  {
    cnes: '2077485',
    ibge: '3550308',
    cidade: 'São Paulo',
    uf: 'SP',
    nome_fantasia: 'Hospital das Clínicas da FMUSP (HCFMUSP)',
    razao_social: 'Hospital das Clínicas da Faculdade de Medicina da USP',
    tipo: 'HOSPITAL',
    esfera: 'PUBLICO',
    logradouro: 'Av. Dr. Enéas Carvalho de Aguiar, 255',
    bairro: 'Cerqueira César',
    cep: '05403-000',
    telefone: '(11) 2661-0000'
  },
  {
    cnes: '2077396',
    ibge: '3550308',
    cidade: 'São Paulo',
    uf: 'SP',
    nome_fantasia: 'Hospital São Paulo (UNIFESP)',
    razao_social: 'Associação Paulista para o Desenvolvimento da Medicina',
    tipo: 'HOSPITAL',
    esfera: 'FILANTROPICO',
    logradouro: 'Rua Napoleão de Barros, 715',
    bairro: 'Vila Clementino',
    cep: '04024-002',
    telefone: '(11) 5576-4000'
  },
  {
    cnes: '9051421',
    ibge: '3550308',
    cidade: 'São Paulo',
    uf: 'SP',
    nome_fantasia: 'UPA Vergueiro / Vila Mariana',
    razao_social: 'Secretaria Municipal da Saúde de São Paulo - UPA Vergueiro',
    tipo: 'UPA',
    esfera: 'PUBLICO',
    logradouro: 'Rua Vergueiro, 6100',
    bairro: 'Vila Firmiano Pinto',
    cep: '04272-200',
    telefone: '(11) 5061-8002'
  },
  {
    cnes: '2786664',
    ibge: '3550308',
    cidade: 'São Paulo',
    uf: 'SP',
    nome_fantasia: 'UBS Santa Cecília (CSE Barra Funda)',
    razao_social: 'Centro de Saúde Escola Barra Funda Dr. Alexandre Vranjac',
    tipo: 'UBS',
    esfera: 'PUBLICO',
    logradouro: 'Av. Dr. Abraão Ribeiro, 283',
    bairro: 'Bom Retiro',
    cep: '01133-020',
    telefone: '(11) 3392-4822'
  },

  // RIBEIRÃO PRETO - SP (3543402)
  {
    cnes: '2082187',
    ibge: '3543402',
    cidade: 'Ribeirão Preto',
    uf: 'SP',
    nome_fantasia: 'HCRP - Hospital das Clínicas de Ribeirão Preto (Campus)',
    razao_social: 'Hospital das Clínicas da FMRP-USP',
    tipo: 'HOSPITAL',
    esfera: 'PUBLICO',
    logradouro: 'Av. Bandeirantes, 3900',
    bairro: 'Monte Alegre',
    cep: '14048-900',
    telefone: '(16) 3602-1000'
  },
  {
    cnes: '2079798',
    ibge: '3543402',
    cidade: 'Ribeirão Preto',
    uf: 'SP',
    nome_fantasia: 'Unidade de Emergência do HCRP (UE-HCRP)',
    razao_social: 'Hospital das Clínicas da FMRP-USP - Unidade de Emergência',
    tipo: 'HOSPITAL',
    esfera: 'PUBLICO',
    logradouro: 'Rua Bernardino de Campos, 1000',
    bairro: 'Centro',
    cep: '14015-130',
    telefone: '(16) 3602-1111'
  },
  {
    cnes: '2084341',
    ibge: '3543402',
    cidade: 'Ribeirão Preto',
    uf: 'SP',
    nome_fantasia: 'Santa Casa de Ribeirão Preto',
    razao_social: 'Sociedade Beneficente e Hospitalar Santa Casa de Misericórdia',
    tipo: 'HOSPITAL',
    esfera: 'FILANTROPICO',
    logradouro: 'Av. Saudade, 456',
    bairro: 'Campos Elíseos',
    cep: '14085-000',
    telefone: '(16) 3605-0606'
  },
  {
    cnes: '7023911',
    ibge: '3543402',
    cidade: 'Ribeirão Preto',
    uf: 'SP',
    nome_fantasia: 'UPA 24h Treze de Maio (UPA Leste)',
    razao_social: 'Secretaria Municipal da Saúde de Ribeirão Preto - UPA Leste',
    tipo: 'UPA',
    esfera: 'PUBLICO',
    logradouro: 'Av. Treze de Maio, 353',
    bairro: 'Jardim Paulistano',
    cep: '14090-260',
    telefone: '(16) 3977-9200'
  },
  {
    cnes: '9431020',
    ibge: '3543402',
    cidade: 'Ribeirão Preto',
    uf: 'SP',
    nome_fantasia: 'UPA 24h Nelson Mandela (UPA Norte)',
    razao_social: 'Secretaria Municipal da Saúde de Ribeirão Preto - UPA Norte',
    tipo: 'UPA',
    esfera: 'PUBLICO',
    logradouro: 'Av. General Euclides de Figueiredo, 295',
    bairro: 'Adelino Simioni',
    cep: '14070-430',
    telefone: '(16) 3977-9100'
  },
  {
    cnes: '2079801',
    ibge: '3543402',
    cidade: 'Ribeirão Preto',
    uf: 'SP',
    nome_fantasia: 'CSE Cuiabá (Centro de Saúde Escola FMRP-USP)',
    razao_social: 'Centro de Saúde Escola Joel Domingos Machado',
    tipo: 'UBS',
    esfera: 'PUBLICO',
    logradouro: 'Rua Teresina, 690',
    bairro: 'Sumarezinho',
    cep: '14055-380',
    telefone: '(16) 3315-0000'
  },
  {
    cnes: '2081695',
    ibge: '3543402',
    cidade: 'Ribeirão Preto',
    uf: 'SP',
    nome_fantasia: 'Hospital São Lucas Ribeirão Preto',
    razao_social: 'Hospital São Lucas S/A',
    tipo: 'HOSPITAL',
    esfera: 'PRIVADO',
    logradouro: 'Rua Bernardino de Campos, 1426',
    bairro: 'Vila Seixas',
    cep: '14015-130',
    telefone: '(16) 4009-0022'
  }
];

class CnesService {
  constructor(dbPathOverride = null) {
    this.municipiosBase = MUNICIPIOS_BASE.map((m) => ({
      ...m,
      _search: normalizeText(`${m.nome} ${m.uf} ${m.ibge}`)
    }));

    this.estabelecimentosBase = ESTABELECIMENTOS_BASE.map((e) => this._indexEstabelecimento(e));
    this.customEstabelecimentos = [];

    this.sqliteDb = null;
    this._initSqlite(dbPathOverride);
  }

  _initSqlite(customPath = null) {
    try {
      const candidates = [
        customPath,
        process.env.CNES_DB_PATH,
        path.resolve(__dirname, '../../data/cnes.db'),
        path.resolve(process.cwd(), 'data/cnes.db')
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
    } catch (err) {
      this.sqliteDb = null;
    }
  }

  _indexEstabelecimento(est) {
    return {
      ...est,
      _cidadeNorm: normalizeText(est.cidade),
      _search: normalizeText(
        `${est.nome_fantasia} ${est.razao_social} ${est.cnes} ${est.bairro} ${est.tipo} ${est.cidade}`
      )
    };
  }

  /**
   * Busca municípios por nome, UF ou código IBGE em < 1ms.
   * @param {string} query
   * @param {number} limit
   */
  buscarMunicipios(query = '', limit = 20) {
    const qNorm = normalizeText(query);
    const maxLimit = Number(limit) || 20;

    // Se temos banco SQLite conectado, busca diretamente na base de 5.571 municípios
    if (this.sqliteDb) {
      try {
        if (!qNorm) {
          const stmt = this.sqliteDb.prepare(
            'SELECT ibge, nome, uf FROM municipios WHERE ibge IN (\'3550308\', \'3543402\', \'3509502\', \'3304557\', \'3106200\', \'4106902\', \'4314902\', \'5300108\', \'2927408\', \'2611606\') LIMIT ?'
          );
          const results = stmt.all(maxLimit);
          if (results && results.length > 0) return results;
        } else {
          const stmt = this.sqliteDb.prepare(
            'SELECT ibge, nome, uf FROM municipios WHERE nome_norm LIKE ? OR ibge LIKE ? OR uf = ? LIMIT ?'
          );
          const results = stmt.all(`%${qNorm}%`, `${qNorm}%`, qNorm.toUpperCase(), maxLimit);
          if (results && results.length > 0) return results;
        }
      } catch (_) {}
    }

    // Fallback em memória
    if (!qNorm) {
      return this.municipiosBase
        .slice(0, maxLimit)
        .map(({ _search, ...rest }) => rest);
    }

    return this.municipiosBase
      .filter((m) => m._search.includes(qNorm))
      .slice(0, maxLimit)
      .map(({ _search, ...rest }) => rest);
  }

  /**
   * Busca estabelecimentos na base nacional (~574.000) ou em memória por código IBGE,
   * nome da cidade, filtro de texto e tipo.
   * @param {Object} params
   * @param {string} [params.ibge]
   * @param {string} [params.cidade]
   * @param {string} [params.q]
   * @param {string} [params.tipo] - HOSPITAL | UPA | UBS | CONSULTORIO | CLINICA
   * @param {number} [params.limit=30]
   */
  buscarEstabelecimentos({ ibge, cidade, q = '', tipo = '', limit = 30 } = {}) {
    const queryNorm = normalizeText(q);
    const cidadeNorm = normalizeText(cidade);
    const tipoNorm = tipo ? String(tipo).toUpperCase().trim() : '';
    const maxLimit = Number(limit) || 30;

    const customFiltrados = this.customEstabelecimentos.filter((item) => {
      if (ibge && !String(item.ibge).startsWith(String(ibge).slice(0, 6))) return false;
      if (!ibge && cidadeNorm && !item._cidadeNorm.includes(cidadeNorm)) return false;
      if (tipoNorm && item.tipo !== tipoNorm) return false;
      if (queryNorm && !item._search.includes(queryNorm)) return false;
      return true;
    });

    // Se temos banco SQLite conectado, busca diretamente na base nacional oficial
    if (this.sqliteDb) {
      try {
        let sql = 'SELECT e.cnes, e.ibge, e.uf, e.cidade, e.nome_fantasia, e.razao_social, e.tipo, e.logradouro, e.bairro, e.cep, e.telefone FROM estabelecimentos e WHERE e.ativo = 1';
        const params = [];

        if (ibge) {
          const ibgePrefix = String(ibge).slice(0, 6);
          sql += ' AND (e.ibge = ? OR e.ibge LIKE ?)';
          params.push(String(ibge), `${ibgePrefix}%`);
        } else if (cidadeNorm) {
          sql += ' AND (e.cidade_norm = ? OR e.cidade_norm LIKE ?)';
          params.push(cidadeNorm, `%${cidadeNorm}%`);
        }

        if (tipoNorm) {
          sql += ' AND e.tipo = ?';
          params.push(tipoNorm);
        }

        if (queryNorm) {
          const rawTrim = String(q || '').trim();
          if (/^\d+$/.test(rawTrim)) {
            sql += ' AND (e.cnes = ? OR e.cnes LIKE ?)';
            params.push(rawTrim.padStart(7, '0'), `${rawTrim}%`);
          } else {
            const ftsTokens = queryNorm
              .replace(/[^\p{L}\p{N}\s]/gu, ' ')
              .split(/\s+/)
              .filter((t) => t.length >= 2)
              .map((t) => `"${t}"*`);
            if (ftsTokens.length > 0) {
              sql += ' AND e.rowid IN (SELECT rowid FROM estabelecimentos_fts WHERE estabelecimentos_fts MATCH ?)';
              params.push(ftsTokens.join(' AND '));
            } else {
              sql += ' AND (e.nome_fantasia LIKE ? OR e.razao_social LIKE ?)';
              params.push(`%${rawTrim}%`, `%${rawTrim}%`);
            }
          }
        }

        // Ordenação assistencial universal para qualquer município do Brasil:
        // Prioridade 1: Emergência, UPAs, Prontos-Socorros e Hospitais Gerais/Especializados
        // Prioridade 2: Atenção Primária (UBS, USF, PSF, Postos, Centros de Saúde, Policlínicas, Unidades Mistas)
        // Prioridade 3: Centros de Especialidades, CAPS, Maternidades, AME, CEO, CER, Reabilitação
        // Prioridade 4: Clínicas médicas gerais
        // Prioridade 5: Consultórios particulares isolados (tipo_codigo = 22)
        sql += ` ORDER BY 
          CASE 
            WHEN e.tipo_codigo IN ('05', '07', '20', '21', '73', '5', '7') 
                 OR e.tipo IN ('HOSPITAL', 'UPA') 
                 OR e.nome_fantasia LIKE '%HOSPITAL%' 
                 OR e.nome_fantasia LIKE '%PRONTO SOCORRO%' 
                 OR e.nome_fantasia LIKE '%PRONTO ATENDIMENTO%' 
                 OR e.nome_fantasia LIKE '%MATERNIDADE%' 
                 OR e.nome_fantasia LIKE '%SANTA CASA%' THEN 1

            WHEN e.tipo_codigo IN ('01', '02', '04', '15', '1', '2', '4') 
                 OR e.tipo = 'UBS' 
                 OR e.nome_fantasia LIKE '%CENTRO DE SAUDE%' 
                 OR e.nome_fantasia LIKE '%POSTO DE SAUDE%' 
                 OR e.nome_fantasia LIKE '%UNIDADE BASICA%' 
                 OR e.nome_fantasia LIKE '%SAUDE DA FAMILIA%' 
                 OR e.nome_fantasia LIKE '%CLINICA DA FAMILIA%' 
                 OR e.nome_fantasia LIKE '%UBDS%' 
                 OR e.nome_fantasia LIKE '%USF%' 
                 OR e.nome_fantasia LIKE '%CSE%' THEN 2

            WHEN e.tipo_codigo IN ('36', '62', '70') 
                 OR e.nome_fantasia LIKE '%CAPS%' 
                 OR e.nome_fantasia LIKE '%AME%' 
                 OR e.nome_fantasia LIKE '%CEO%' 
                 OR e.nome_fantasia LIKE '%CER%' 
                 OR e.nome_fantasia LIKE '%ESPECIALID%' THEN 3

            WHEN e.tipo = 'CLINICA' THEN 4
            ELSE 5
          END ASC,
          e.nome_fantasia ASC
          LIMIT ?`;
        params.push(maxLimit);

        const rows = this.sqliteDb.prepare(sql).all(...params);
        if (rows && rows.length > 0) {
          const cleanCustom = customFiltrados.map(({ _search, _cidadeNorm, ...clean }) => clean);
          const combinados = [...cleanCustom, ...rows];
          return combinados.slice(0, maxLimit);
        }
        if (customFiltrados.length > 0) {
          return customFiltrados.slice(0, maxLimit).map(({ _search, _cidadeNorm, ...clean }) => clean);
        }
        return [];
      } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
          console.warn('[CnesService] Aviso na consulta SQLite FTS5:', err.message);
        }
      }
    }

    // Fallback em memória (para ambientes sem o arquivo de banco nacional)
    const computeScoreAssistencial = (item) => {
      const nome = (item.nome_fantasia || '').toUpperCase();
      const tipo = (item.tipo || '').toUpperCase();
      const tc = String(item.tipo_codigo || '');

      if (['05', '07', '20', '21', '73', '5', '7'].includes(tc) || tipo === 'HOSPITAL' || tipo === 'UPA' || nome.includes('HOSPITAL') || nome.includes('PRONTO') || nome.includes('MATERNIDADE') || nome.includes('SANTA CASA')) {
        return 1;
      }
      if (['01', '02', '04', '15', '1', '2', '4'].includes(tc) || tipo === 'UBS' || nome.includes('CENTRO DE SAUDE') || nome.includes('POSTO') || nome.includes('UNIDADE BASICA') || nome.includes('FAMILIA') || nome.includes('UBDS') || nome.includes('USF') || nome.includes('CSE')) {
        return 2;
      }
      if (['36', '62', '70'].includes(tc) || nome.includes('CAPS') || nome.includes('AME') || nome.includes('CEO') || nome.includes('CER')) {
        return 3;
      }
      if (tipo === 'CLINICA') return 4;
      return 5;
    };

    const all = [...this.customEstabelecimentos, ...this.estabelecimentosBase];
    const filtered = all.filter((item) => {
      if (ibge && !String(item.ibge).startsWith(String(ibge).slice(0, 6))) return false;
      if (!ibge && cidadeNorm && !item._cidadeNorm.includes(cidadeNorm)) return false;
      if (tipoNorm && item.tipo !== tipoNorm) return false;
      if (queryNorm && !item._search.includes(queryNorm)) return false;
      return true;
    });

    filtered.sort((a, b) => {
      const scoreA = computeScoreAssistencial(a);
      const scoreB = computeScoreAssistencial(b);
      if (scoreA !== scoreB) return scoreA - scoreB;
      return (a.nome_fantasia || '').localeCompare(b.nome_fantasia || '');
    });

    return filtered.slice(0, maxLimit).map(({ _search, _cidadeNorm, ...clean }) => clean);
  }

  /**
   * Valida e salva um estabelecimento personalizado (ex: Consultório Particular).
   * @param {Object} payload
   */
  registrarEstabelecimentoPersonalizado(payload = {}) {
    const nomeFantasia = String(payload.nome_fantasia || '').trim();
    if (!nomeFantasia) {
      throw new Error('O campo nome_fantasia é obrigatório para o local de trabalho.');
    }

    const cidade = String(payload.cidade || 'Não informada').trim();
    const uf = String(payload.uf || 'SP').toUpperCase().trim().slice(0, 2);
    const cnes = String(payload.cnes || `CUSTOM-${Date.now().toString().slice(-6)}`).trim();

    const novo = {
      cnes,
      ibge: String(payload.ibge || '0000000').trim(),
      cidade,
      uf,
      nome_fantasia: nomeFantasia,
      razao_social: String(payload.razao_social || nomeFantasia).trim(),
      tipo: String(payload.tipo || 'CONSULTORIO').toUpperCase().trim(),
      esfera: String(payload.esfera || 'PRIVADO').toUpperCase().trim(),
      logradouro: String(payload.logradouro || '').trim(),
      bairro: String(payload.bairro || '').trim(),
      cep: String(payload.cep || '').trim(),
      telefone: String(payload.telefone || '').trim(),
      personalizado: true
    };

    const indexed = this._indexEstabelecimento(novo);
    const existingIdx = this.customEstabelecimentos.findIndex((e) => e.cnes === novo.cnes);
    if (existingIdx >= 0) {
      this.customEstabelecimentos[existingIdx] = indexed;
    } else {
      this.customEstabelecimentos.unshift(indexed);
    }

    const { _search, _cidadeNorm, ...clean } = indexed;
    return clean;
  }

  /**
   * Formata os dados de cabeçalho de receituário/prontuário para PDF e DOCX.
   * @param {Object} estabelecimento
   */
  formatarCabecalhoReceituario(estabelecimento = {}) {
    if (!estabelecimento || !estabelecimento.nome_fantasia) {
      return {
        titulo: 'Atendimento Médico',
        subtitulo: '',
        endereco_linha1: '',
        endereco_linha2: '',
        cnes_formatado: '',
        texto_completo: 'Atendimento Médico'
      };
    }

    const isCustomCnes = String(estabelecimento.cnes || '').startsWith('CUSTOM-');
    const cnesStr = estabelecimento.cnes && !isCustomCnes ? `CNES: ${estabelecimento.cnes}` : '';
    const endereco1 = [estabelecimento.logradouro, estabelecimento.bairro]
      .filter(Boolean)
      .join(' - ');
    const cidadeUf = [estabelecimento.cidade, estabelecimento.uf].filter(Boolean).join('/');
    const endereco2 = [
      cidadeUf,
      estabelecimento.cep ? `CEP: ${estabelecimento.cep}` : '',
      estabelecimento.telefone ? `Tel: ${estabelecimento.telefone}` : ''
    ]
      .filter(Boolean)
      .join(' • ');

    return {
      titulo: estabelecimento.nome_fantasia,
      subtitulo: estabelecimento.razao_social || estabelecimento.nome_fantasia,
      tipo: estabelecimento.tipo || 'UNIDADE DE SAUDE',
      cnes_formatado: cnesStr,
      endereco_linha1: endereco1,
      endereco_linha2: endereco2,
      texto_completo: [
        estabelecimento.nome_fantasia,
        cnesStr,
        endereco1,
        endereco2
      ]
        .filter(Boolean)
        .join(' | ')
    };
  }
}

const cnesService = new CnesService();

module.exports = {
  CnesService,
  cnesService
};
