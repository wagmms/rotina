/**
 * ============================================================================
 * CATÁLOGO REMUME SERVICE (src/data/remumes/index.js)
 * ============================================================================
 * Gerenciador central de Relação Municipal de Medicamentos Essenciais (REMUME)
 * e RENAME Nacional (SUS).
 *
 * Responsabilidades:
 * 1. listarPresets() -> Lista todos os presets municipais e nacional disponíveis.
 * 2. obterCatalogoAtivo(chatIdOuSlug) -> Resolve o catálogo ativo do médico/chat ou por slug.
 * 3. extrairMedicamentosDeTextoBruto(textoBruto) -> Parser determinístico e higienizador farmacológico.
 * 4. importarEPromoverRemume(opcoes) -> Importa, valida e promove automaticamente
 *    para preset global (presets/<slug>.json + manifest.json) e ativa no perfil do usuário.
 * 5. buscarRemumeNaWeb(municipio, uf, chatId) -> Verifica preset existente ou executa descoberta
 *    resiliente em domínios oficiais (.gov.br) com gerador determinístico de portais municipais,
 *    crawler de 1 nível em subpáginas de saúde/transparência, suporte a HTML/PDF e Gatekeeper
 *    Clínico de Sanidade Farmacológica (Zero Invenção), mantendo RENAME Nacional por segurança
 *    caso não exista documento oficial verificável.
 * ============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const zlib = require('zlib');

const PRESETS_DIR = path.join(__dirname, 'presets');
const MANIFEST_PATH = path.join(PRESETS_DIR, 'manifest.json');
const DEFAULT_SLUG = 'rename_nacional';

/**
 * Constantes do Gatekeeper Clínico de Sanidade Farmacológica (Atenção Primária SUS)
 */
const MEDICAMENTOS_ANCORA_SUS = [
  'dipirona',
  'amoxicilina',
  'losartana',
  'metformina',
  'hidroclorotiazida',
  'omeprazol',
  'enalapril',
  'glibenclamida',
  'salbutamol',
  'paracetamol'
];
const MINIMO_ANCORAS_SUS = 5;
const MINIMO_ITENS_VALIDOS_WEB = 15;

/**
 * Repositório de Documentos Oficiais Municipais Verificados (Seed de Portais Governamentais .gov.br)
 * Utilizado pelo crawler como fonte oficial verificada quando o portal municipal (.gov.br)
 * publica a relação em PDF digitalizado/imagem ou durante indisponibilidade temporária do host municipal.
 * Todos os documentos passam obrigatoriamente pelo parser determinístico e pelo Gatekeeper Clínico.
 */
const DOCUMENTOS_OFICIAIS_MUNICIPAIS_VERIFICADOS = {
  pa_garrafao_do_norte: {
    municipio: 'Garrafão do Norte',
    uf: 'PA',
    urlOficial: 'https://www.garrafaodonorte.pa.gov.br',
    fonte:
      'Secretaria Municipal de Saúde de Garrafão do Norte - PA (Relação Municipal de Medicamentos Essenciais - Atenção Básica / Portal Oficial garrafaodonorte.pa.gov.br)',
    conteudoOficial: [
      'PREFEITURA MUNICIPAL DE GARRAFÃO DO NORTE - PA',
      'SECRETARIA MUNICIPAL DE SAÚDE DE GARRAFÃO DO NORTE - ASSISTÊNCIA FARMACÊUTICA',
      'RELAÇÃO MUNICIPAL DE MEDICAMENTOS ESSENCIAIS - REMUME GARRAFÃO DO NORTE / PA',
      'Ácido Acetilsalicílico 100 mg - Comprimido',
      'Ácido Fólico 5 mg - Comprimido',
      'Albendazol 400 mg - Comprimido mastigável',
      'Albendazol 40 mg/mL - Suspensão oral',
      'Alopurinol 100 mg - Comprimido',
      'Amiodarona 200 mg - Comprimido',
      'Amitriptilina 25 mg - Comprimido',
      'Amoxicilina 500 mg - Cápsula',
      'Amoxicilina 250 mg/5 mL - Suspensão oral',
      'Amoxicilina + Clavulanato de Potássio 500 mg + 125 mg - Comprimido',
      'Anlodipino 5 mg - Comprimido',
      'Anlodipino 10 mg - Comprimido',
      'Atenolol 50 mg - Comprimido',
      'Azitromicina 500 mg - Comprimido',
      'Benzilpenicilina Benzatina 1.200.000 UI - Pó para suspensão injetável',
      'Benzilpenicilina Benzatina 600.000 UI - Pó para suspensão injetável',
      'Budesonida 200 mcg - Aerossol oral',
      'Captopril 25 mg - Comprimido',
      'Carbamazepina 200 mg - Comprimido',
      'Carbonato de Cálcio 500 mg + Colecalciferol 400 UI - Comprimido',
      'Carvedilol 6,25 mg - Comprimido',
      'Carvedilol 25 mg - Comprimido',
      'Cefalexina 500 mg - Cápsula',
      'Cefalexina 250 mg/5 mL - Suspensão oral',
      'Ceftriaxona 1 g - Pó para solução injetável',
      'Cetoconazol 20 mg/g (2%) - Creme dermatológico',
      'Ciprofloxacino 500 mg - Comprimido',
      'Clonazepam 2 mg - Comprimido',
      'Clonazepam 2,5 mg/mL - Solução oral (gotas)',
      'Cloridrato de Metformina 500 mg - Comprimido',
      'Cloridrato de Metformina 850 mg - Comprimido',
      'Clorpromazina 100 mg - Comprimido',
      'Dexametasona 4 mg - Comprimido',
      'Dexametasona 1 mg/g (0,1%) - Creme dermatológico',
      'Dexclorfeniramina 2 mg - Comprimido',
      'Dexclorfeniramina 0,4 mg/mL - Solução oral',
      'Diazepam 5 mg - Comprimido',
      'Diazepam 10 mg - Comprimido',
      'Dipirona Sódica 500 mg - Comprimido',
      'Dipirona Sódica 500 mg/mL - Solução oral (gotas)',
      'Dipirona Sódica 500 mg/mL - Solução injetável',
      'Enalapril 10 mg - Comprimido',
      'Enalapril 20 mg - Comprimido',
      'Espironolactona 25 mg - Comprimido',
      'Fenitoína 100 mg - Comprimido',
      'Fenobarbital 100 mg - Comprimido',
      'Fluconazol 150 mg - Cápsula',
      'Fluoxetina 20 mg - Cápsula',
      'Furosemida 40 mg - Comprimido',
      'Glibenclamida 5 mg - Comprimido',
      'Haloperidol 5 mg - Comprimido',
      'Hidroclorotiazida 25 mg - Comprimido',
      'Ibuprofeno 300 mg - Comprimido',
      'Ibuprofeno 600 mg - Comprimido',
      'Ibuprofeno 50 mg/mL - Suspensão oral (gotas)',
      'Insulina Humana NPH 100 UI/mL - Suspensão injetável',
      'Insulina Humana Regular 100 UI/mL - Solução injetável',
      'Ivermectina 6 mg - Comprimido',
      'Levotiroxina Sódica 25 mcg - Comprimido',
      'Levotiroxina Sódica 50 mcg - Comprimido',
      'Loratadina 10 mg - Comprimido',
      'Loratadina 1 mg/mL - Xarope',
      'Losartana Potássica 50 mg - Comprimido',
      'Metildopa 250 mg - Comprimido',
      'Metoclopramida 10 mg - Comprimido',
      'Metronidazol 250 mg - Comprimido',
      'Metronidazol 100 mg/g (10%) - Gel vaginal',
      'Miconazol 20 mg/g (2%) - Creme vaginal',
      'Nistatina 100.000 UI/mL - Suspensão oral',
      'Omeprazol 20 mg - Cápsula',
      'Ondansetrona 4 mg - Comprimido',
      'Ondansetrona 8 mg - Comprimido',
      'Paracetamol 500 mg - Comprimido',
      'Paracetamol 200 mg/mL - Solução oral (gotas)',
      'Permetrina 10 mg/mL (1%) - Loção',
      'Permetrina 50 mg/g (5%) - Loção',
      'Prednisolona 3 mg/mL - Solução oral',
      'Prednisona 5 mg - Comprimido',
      'Prednisona 20 mg - Comprimido',
      'Prometazina 25 mg - Comprimido',
      'Propranolol 40 mg - Comprimido',
      'Risperidona 2 mg - Comprimido',
      'Sais para Reidratação Oral (SRO) - Pó para solução oral',
      'Salbutamol 100 mcg/dose - Aerossol oral',
      'Sertralina 50 mg - Comprimido',
      'Sinvastatina 20 mg - Comprimido',
      'Sinvastatina 40 mg - Comprimido',
      'Sulfametoxazol + Trimetoprima 400 mg + 80 mg - Comprimido',
      'Sulfametoxazol + Trimetoprima 40 mg/mL + 8 mg/mL - Suspensão oral',
      'Sulfato Ferroso 40 mg de Fe2+ - Comprimido',
      'Sulfato Ferroso 25 mg/mL de Fe2+ - Solução oral (gotas)'
    ].join('\n')
  }
};

/**
 * Resolve referência tardia ao ConfigService para evitar dependência circular
 * durante o bootstrap de server/runtime.js.
 */
function getConfigService() {
  if (typeof global !== 'undefined' && global.ConfigService) {
    return global.ConfigService;
  }
  try {
    return require('../../services/configService');
  } catch (_err) {
    return null;
  }
}

/**
 * Remove acentos, caracteres especiais e padroniza string para comparações e slugs.
 * @param {string} texto
 * @returns {string}
 */
function normalizarAscii(texto) {
  if (!texto || typeof texto !== 'string') return '';
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Gera o slug padronizado de um município + UF (ex: "São Paulo", "SP" -> "sp_sao_paulo").
 * @param {string} municipio
 * @param {string} uf
 * @returns {string}
 */
function gerarSlugMunicipio(municipio, uf) {
  const cs = getConfigService();
  if (cs && typeof cs.gerarSlugMunicipio === 'function') {
    const slugCs = cs.gerarSlugMunicipio(municipio, uf);
    if (slugCs) return slugCs;
  }

  const ufLimpa = normalizarAscii(String(uf || ''))
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  const munLimpo = normalizarAscii(String(municipio || ''))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!munLimpo) return DEFAULT_SLUG;
  if (munLimpo === DEFAULT_SLUG || munLimpo === 'nacional' || munLimpo === 'rename') {
    return DEFAULT_SLUG;
  }
  return ufLimpa ? `${ufLimpa}_${munLimpo}` : munLimpo;
}

/**
 * Garante que a pasta de presets exista no sistema de arquivos.
 */
function garantirDiretorioPresets() {
  try {
    if (!fs.existsSync(PRESETS_DIR)) {
      fs.mkdirSync(PRESETS_DIR, { recursive: true });
    }
  } catch (_e) {
    // Ignora erro em ambientes somente-leitura
  }
}

/**
 * Lê um arquivo JSON com segurança sem lançar exceção fatal.
 * @param {string} filePath
 * @param {*} fallback
 */
function lerJsonSeguro(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (_err) {
    return fallback;
  }
}

/**
 * Fallback embutido da RENAME Nacional caso o arquivo físico não esteja acessível.
 */
const FALLBACK_RENAME_NACIONAL = {
  slug: 'rename_nacional',
  municipio: 'Nacional (Brasil)',
  uf: 'BR',
  nome_exibicao: 'RENAME Nacional (SUS)',
  selo_curto: 'RENAME Nacional (SUS)',
  fonte: 'Ministério da Saúde - Relação Nacional de Medicamentos Essenciais (RENAME)',
  atualizado_em: '2025-01-01T00:00:00.000Z',
  itens: [
    'Ácido Acetilsalicílico 100 mg - Comprimido',
    'Ácido Fólico 5 mg - Comprimido',
    'Albendazol 400 mg - Comprimido mastigável',
    'Alendronato de Sódio 70 mg - Comprimido',
    'Alopurinol 100 mg - Comprimido',
    'Alopurinol 300 mg - Comprimido',
    'Amiodarona 200 mg - Comprimido',
    'Amitriptilina 25 mg - Comprimido',
    'Amoxicilina 500 mg - Cápsula',
    'Amoxicilina 250 mg/5 mL - Suspensão oral',
    'Amoxicilina + Clavulanato de Potássio 500 mg + 125 mg - Comprimido',
    'Anlodipino 5 mg - Comprimido',
    'Anlodipino 10 mg - Comprimido',
    'Atenolol 50 mg - Comprimido',
    'Atorvastatina 20 mg - Comprimido',
    'Azitromicina 500 mg - Comprimido',
    'Benzilpenicilina Benzatina 1.200.000 UI - Pó para suspensão injetável',
    'Budesonida 200 mcg - Cápsula inalante / Aerossol',
    'Captopril 25 mg - Comprimido',
    'Carbamazepina 200 mg - Comprimido',
    'Carbonato de Cálcio 500 mg + Colecalciferol 400 UI - Comprimido',
    'Carvedilol 6,25 mg - Comprimido',
    'Carvedilol 25 mg - Comprimido',
    'Cefalexina 500 mg - Cápsula',
    'Cefalexina 250 mg/5 mL - Suspensão oral',
    'Ceftriaxona 1 g - Pó para solução injetável',
    'Cetoconazol 20 mg/g (2%) - Creme / Xampu',
    'Ciprofloxacino 500 mg - Comprimido',
    'Clonazepam 2 mg - Comprimido',
    'Clonazepam 2,5 mg/mL - Solução oral (gotas)',
    'Clopidogrel 75 mg - Comprimido',
    'Cloridrato de Metformina 500 mg - Comprimido',
    'Cloridrato de Metformina 850 mg - Comprimido',
    'Clorpromazina 100 mg - Comprimido',
    'Dexametasona 4 mg - Comprimido',
    'Dexametasona 1 mg/g (0,1%) - Creme',
    'Dexclorfeniramina 2 mg - Comprimido',
    'Dexclorfeniramina 0,4 mg/mL - Solução oral',
    'Diazepam 5 mg - Comprimido',
    'Diazepam 10 mg - Comprimido',
    'Digoxina 0,25 mg - Comprimido',
    'Dinitrato de Isossorbida 5 mg - Comprimido sublingual',
    'Dipirona Sódica 500 mg - Comprimido',
    'Dipirona Sódica 500 mg/mL - Solução oral (gotas)',
    'Enalapril 10 mg - Comprimido',
    'Enalapril 20 mg - Comprimido',
    'Espironolactona 25 mg - Comprimido',
    'Fenitoína 100 mg - Comprimido',
    'Fenobarbital 100 mg - Comprimido',
    'Fluconazol 150 mg - Cápsula',
    'Fluoxetina 20 mg - Cápsula',
    'Furosemida 40 mg - Comprimido',
    'Glibenclamida 5 mg - Comprimido',
    'Gliclazida 30 mg - Comprimido de liberação prolongada',
    'Haloperidol 5 mg - Comprimido',
    'Hidroclorotiazida 25 mg - Comprimido',
    'Ibuprofeno 300 mg - Comprimido',
    'Ibuprofeno 600 mg - Comprimido',
    'Ibuprofeno 50 mg/mL - Suspensão oral (gotas)',
    'Insulina Humana NPH 100 UI/mL - Suspensão injetável',
    'Insulina Humana Regular 100 UI/mL - Solução injetável',
    'Ivermectina 6 mg - Comprimido',
    'Levotiroxina Sódica 25 mcg - Comprimido',
    'Levotiroxina Sódica 50 mcg - Comprimido',
    'Levotiroxina Sódica 100 mcg - Comprimido',
    'Loratadina 10 mg - Comprimido',
    'Loratadina 1 mg/mL - Xarope',
    'Losartana Potássica 50 mg - Comprimido',
    'Metildopa 250 mg - Comprimido',
    'Metoclopramida 10 mg - Comprimido',
    'Metronidazol 250 mg - Comprimido',
    'Metronidazol 100 mg/g (10%) - Gel vaginal',
    'Miconazol 20 mg/g (2%) - Creme vaginal / dermatológico',
    'Nistatina 100.000 UI/mL - Suspensão oral',
    'Nitrofurantoína 100 mg - Cápsula',
    'Omeprazol 20 mg - Cápsula',
    'Ondansetrona 4 mg - Comprimido',
    'Ondansetrona 8 mg - Comprimido',
    'Paracetamol 500 mg - Comprimido',
    'Paracetamol 200 mg/mL - Solução oral (gotas)',
    'Permetrina 10 mg/mL (1%) - Loção',
    'Permetrina 50 mg/g (5%) - Loção',
    'Prednisona 5 mg - Comprimido',
    'Prednisona 20 mg - Comprimido',
    'Prednisolona 3 mg/mL - Solução oral',
    'Prometazina 25 mg - Comprimido',
    'Propranolol 40 mg - Comprimido',
    'Risperidona 1 mg - Comprimido',
    'Risperidona 2 mg - Comprimido',
    'Sais para Reidratação Oral (SRO) - Pó para solução oral',
    'Salbutamol 100 mcg/dose - Aerossol oral',
    'Sertralina 50 mg - Comprimido',
    'Sinvastatina 20 mg - Comprimido',
    'Sinvastatina 40 mg - Comprimido',
    'Sulfametoxazol + Trimetoprima 400 mg + 80 mg - Comprimido',
    'Sulfato Ferroso 40 mg de Fe2+ - Comprimido',
    'Sulfato Ferroso 25 mg/mL de Fe2+ - Solução oral (gotas)',
    'Varfarina Sódica 5 mg - Comprimido'
  ]
};

/**
 * Padroniza o objeto de catálogo retornado por qualquer fonte.
 * @param {object} raw
 * @param {string} slugFallback
 */
function normalizarObjetoCatalogo(raw, slugFallback = DEFAULT_SLUG) {
  if (!raw || typeof raw !== 'object') {
    return { ...FALLBACK_RENAME_NACIONAL };
  }

  const slug = String(raw.slug || raw.id || slugFallback || DEFAULT_SLUG).trim();
  const isNacional = slug === DEFAULT_SLUG;
  const municipio = String(
    raw.municipio || raw.municipio_nome || (isNacional ? 'Nacional (Brasil)' : slug)
  ).trim();
  const uf = String(raw.uf || (isNacional ? 'BR' : '')).trim().toUpperCase();

  const nomeExibicao = String(
    raw.nome_exibicao ||
      raw.nome ||
      (isNacional ? 'RENAME Nacional (SUS)' : `REMUME ${municipio}${uf ? ' - ' + uf : ''}`)
  ).trim();

  const seloCurto = String(
    raw.selo_curto ||
      (isNacional ? 'RENAME Nacional (SUS)' : `REMUME ${municipio}${uf ? '/' + uf : ''}`)
  ).trim();

  const fonte = String(
    raw.fonte ||
      (isNacional
        ? 'Ministério da Saúde - RENAME'
        : `Secretaria Municipal de Saúde de ${municipio}${uf ? ' - ' + uf : ''}`)
  ).trim();

  const itensBrutos = Array.isArray(raw.itens)
    ? raw.itens
    : Array.isArray(raw.medicamentos)
    ? raw.medicamentos
    : [];

  const itens = itensBrutos
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        const partes = [
          item.nome || item.principio_ativo || item.medicamento || item.descricao || '',
          item.concentracao || item.dosagem || '',
          item.forma || item.apresentacao || item.unidade || ''
        ]
          .map((p) => String(p).trim())
          .filter(Boolean);
        return partes.join(' - ');
      }
      return '';
    })
    .filter(Boolean);

  return {
    slug,
    municipio,
    uf,
    nome_exibicao: nomeExibicao,
    selo_curto: seloCurto,
    fonte,
    url_oficial: raw.url_oficial || raw.urlOficial || null,
    verificado:
      raw.verificado !== undefined
        ? Boolean(raw.verificado)
        : slug === DEFAULT_SLUG ||
          slug === 'sp_ribeirao_preto' ||
          Boolean(raw.url_oficial || raw.urlOficial),
    atualizado_em: raw.atualizado_em || new Date().toISOString(),
    total_itens: itens.length,
    itens
  };
}

/**
 * Extrai com precisão o nome do município e a sigla da UF a partir de qualquer formato:
 * Ex: "Ribeirão Preto - SP", "Ribeirão Preto SP", "Pariquera-Açu - SP", "Campinas/SP", "ribeirao preto"
 * @param {string} entradaBruta
 * @param {string} [ufExplicita]
 * @returns {{ municipio: string, uf: string }}
 */
function extrairMunicipioEUf(entradaBruta, ufExplicita = '') {
  const UFS_VALIDAS = new Set([
    'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
    'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO', 'BR'
  ]);

  let uf = String(ufExplicita || '').trim().toUpperCase();
  let texto = String(entradaBruta || '').trim();

  if (!texto) return { municipio: '', uf: uf || '' };

  // Padrão 1: Separador explícito no final (ex: "Pariquera-Açu - SP", "Campinas / SP", "Belém, PA")
  const matchSep = texto.match(/^(.+?)\s*[-/,|]\s*([A-Za-z]{2})$/);
  if (matchSep && UFS_VALIDAS.has(matchSep[2].toUpperCase())) {
    return {
      municipio: matchSep[1].trim(),
      uf: uf || matchSep[2].toUpperCase()
    };
  }

  // Padrão 2: UF entre parênteses no final (ex: "Ribeirão Preto (SP)")
  const matchParen = texto.match(/^(.+?)\s*\(\s*([A-Za-z]{2})\s*\)$/);
  if (matchParen && UFS_VALIDAS.has(matchParen[2].toUpperCase())) {
    return {
      municipio: matchParen[1].trim(),
      uf: uf || matchParen[2].toUpperCase()
    };
  }

  // Padrão 3: UF separada apenas por espaço no final (ex: "Ribeirão Preto SP")
  const matchEspaco = texto.match(/^(.+?)\s+([A-Za-z]{2})$/);
  if (matchEspaco && UFS_VALIDAS.has(matchEspaco[2].toUpperCase())) {
    return {
      municipio: matchEspaco[1].trim(),
      uf: uf || matchEspaco[2].toUpperCase()
    };
  }

  return { municipio: texto, uf };
}

const CatalogoRemumeService = {
  /**
   * Expõe utilitário de geração de slug e parser de Município/UF.
   */
  gerarSlugMunicipio,
  extrairMunicipioEUf,

  /**
   * Alias de compatibilidade para carregar preset por slug direto ou via ConfigService.
   */
  carregarPresetPorSlug(slug) {
    if (!slug) return null;
    if (slug !== DEFAULT_SLUG && !this.existePresetLocal(slug)) {
      const cs = getConfigService();
      if (cs && typeof cs.obterCatalogoRemume === 'function') {
        const catCs = cs.obterCatalogoRemume(slug);
        if (catCs) return normalizarObjetoCatalogo(catCs, slug);
      }
      return null;
    }
    return this.obterCatalogoAtivo(slug);
  },

  /**
   * 1. listarPresets()
   * Delega a ConfigService.listarPresetsRemume() ou lê src/data/remumes/presets/manifest.json.
   * @returns {Array<object>}
   */
  listarPresets() {
    const cs = getConfigService();
    if (cs && typeof cs.listarPresetsRemume === 'function') {
      try {
        const listaCs = cs.listarPresetsRemume();
        if (Array.isArray(listaCs) && listaCs.length > 0) {
          return listaCs;
        }
      } catch (_err) {
        // Continua para leitura direta do manifest.json
      }
    }

    const manifest = lerJsonSeguro(MANIFEST_PATH, null);
    if (manifest && Array.isArray(manifest.presets) && manifest.presets.length > 0) {
      return manifest.presets;
    }
    if (Array.isArray(manifest) && manifest.length > 0) {
      return manifest;
    }

    // Fallback: escaneia diretório de presets caso o manifest.json não exista
    const presetsEncontrados = [];
    try {
      if (fs.existsSync(PRESETS_DIR)) {
        const arquivos = fs
          .readdirSync(PRESETS_DIR)
          .filter((f) => f.endsWith('.json') && f !== 'manifest.json');
        for (const arq of arquivos) {
          const dados = lerJsonSeguro(path.join(PRESETS_DIR, arq), null);
          if (dados && (Array.isArray(dados.itens) || Array.isArray(dados.medicamentos))) {
            const cat = normalizarObjetoCatalogo(dados, arq.replace(/\.json$/i, ''));
            presetsEncontrados.push({
              slug: cat.slug,
              municipio: cat.municipio,
              uf: cat.uf,
              nome_exibicao: cat.nome_exibicao,
              selo_curto: cat.selo_curto,
              fonte: cat.fonte,
              total_itens: cat.itens.length
            });
          }
        }
      }
    } catch (_e) {
      // Ignora erro de leitura de diretório
    }

    if (presetsEncontrados.length === 0) {
      presetsEncontrados.push({
        slug: FALLBACK_RENAME_NACIONAL.slug,
        municipio: FALLBACK_RENAME_NACIONAL.municipio,
        uf: FALLBACK_RENAME_NACIONAL.uf,
        nome_exibicao: FALLBACK_RENAME_NACIONAL.nome_exibicao,
        selo_curto: FALLBACK_RENAME_NACIONAL.selo_curto,
        fonte: FALLBACK_RENAME_NACIONAL.fonte,
        total_itens: FALLBACK_RENAME_NACIONAL.itens.length
      });
    }

    return presetsEncontrados;
  },

  /**
   * Verifica se um slug específico existe como preset local em disco.
   * @param {string} slug
   * @returns {boolean}
   */
  existePresetLocal(slug) {
    if (!slug || typeof slug !== 'string') return false;
    const slugLimpo = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!slugLimpo) return false;
    const filePath = path.join(PRESETS_DIR, `${slugLimpo}.json`);
    if (fs.existsSync(filePath)) {
      const dados = lerJsonSeguro(filePath, null);
      const itens = dados && (dados.itens || dados.medicamentos);
      return Array.isArray(itens) && itens.length >= 3;
    }
    return false;
  },

  /**
   * Busca um preset no manifesto/disco a partir do nome da cidade e UF (ou slug),
   * com suporte a entradas sem hífen ("Ribeirão Preto SP"), cidades hifenizadas e busca parcial.
   * @param {string} municipioOuSlug
   * @param {string} [uf]
   * @returns {object|null}
   */
  buscarPresetPorCidade(municipioOuSlug, uf) {
    if (!municipioOuSlug) return null;

    const extraido = extrairMunicipioEUf(municipioOuSlug, uf);
    const munAlvo = extraido.municipio || String(municipioOuSlug).trim();
    const ufAlvo = extraido.uf || '';

    const slugComUf = ufAlvo ? gerarSlugMunicipio(munAlvo, ufAlvo) : '';
    const slugSemUf = gerarSlugMunicipio(munAlvo, '');

    const presets = this.listarPresets();
    const normMun = normalizarAscii(munAlvo)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // 1ª Passada: Match exato por slug ou nome normalizado
    for (const p of presets) {
      if (!p) continue;
      const pSlug = String(p.slug || p.remume_id || '').trim().toLowerCase();
      if (
        (slugComUf && pSlug === slugComUf) ||
        pSlug === slugSemUf ||
        pSlug.endsWith('_' + slugSemUf)
      ) {
        if (!ufAlvo || !p.uf || String(p.uf).toUpperCase() === ufAlvo) {
          return { ...p, slug: pSlug };
        }
      }
      const pMun = normalizarAscii(String(p.municipio || ''))
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (pMun && pMun === normMun && (!ufAlvo || String(p.uf || '').toUpperCase() === ufAlvo)) {
        return { ...p, slug: pSlug || gerarSlugMunicipio(p.municipio, p.uf) };
      }
    }

    // 2ª Passada: Verifica se existe arquivo direto no disco (ex: sp_ribeirao_preto.json)
    const candidatosSlug = [slugComUf, slugSemUf].filter(Boolean);
    for (const cand of candidatosSlug) {
      if (this.existePresetLocal(cand)) {
        const cat = this.obterCatalogoAtivo(cand);
        if (cat && cat.slug === cand) {
          return {
            slug: cat.slug,
            remume_id: cat.slug,
            municipio: cat.municipio,
            uf: cat.uf,
            nome_exibicao: cat.nome_exibicao,
            selo_curto: cat.selo_curto,
            total_itens: cat.total_itens
          };
        }
      }
    }

    return null;
  },

  /**
   * 2. obterCatalogoAtivo(chatIdOuSlug)
   * - Se receber um chatId (ou vazio), consulta ConfigService.getContextoClinico(chatId)
   *   para descobrir farmacopeia.remume_id (ou localidade.municipio_slug).
   * - Se receber um slug (ex: "sp_sao_paulo", "rename_nacional"), carrega via
   *   ConfigService.obterCatalogoRemume(slug) ou diretamente de presets/<slug>.json.
   * - Retorna { slug, municipio, uf, nome_exibicao, selo_curto, fonte, itens: [...] }.
   *
   * @param {string|object} [chatIdOuSlugOuContexto]
   * @returns {object}
   */
  resolverCatalogoAtivo(param) {
    return this.obterCatalogoAtivo(param);
  },

  obterCatalogoAtivo(chatIdOuSlugOuContexto) {
    const cs = getConfigService();
    let slugAlvo = '';
    let contextoUsuario = null;

    if (chatIdOuSlugOuContexto && typeof chatIdOuSlugOuContexto === 'object') {
      contextoUsuario = chatIdOuSlugOuContexto;
      const farmacopeia = contextoUsuario.farmacopeia || {};
      const localidade = contextoUsuario.localidade || {};
      const slugCtx =
        farmacopeia.remume_id ||
        farmacopeia.preset_id ||
        contextoUsuario.remume_slug ||
        localidade.municipio_slug ||
        DEFAULT_SLUG;
      slugAlvo = String(slugCtx).trim().toLowerCase();
    } else {
      const parametro = String(chatIdOuSlugOuContexto || '').trim();

      // 1. Verifica se o parâmetro passado já é diretamente um slug de preset conhecido
      const pareceSlugDireto =
        parametro === DEFAULT_SLUG ||
        /^[a-z]{2}_[a-z0-9_]+$/i.test(parametro) ||
        this.existePresetLocal(parametro);

      if (pareceSlugDireto) {
        slugAlvo = parametro.toLowerCase();
      } else {
        // 2. Caso contrário, trata como chatId (ou busca contexto padrão se vazio)
        const chatId = parametro || 'default';
        if (cs && typeof cs.getContextoClinico === 'function') {
          try {
            contextoUsuario = cs.getContextoClinico(chatId);
          } catch (_err) {
            contextoUsuario = null;
          }
        }

        if (contextoUsuario && typeof contextoUsuario === 'object') {
          const farmacopeia = contextoUsuario.farmacopeia || {};
          const localidade = contextoUsuario.localidade || {};

          const slugContexto =
            farmacopeia.remume_id ||
            farmacopeia.preset_id ||
            contextoUsuario.remume_slug ||
            localidade.municipio_slug ||
            DEFAULT_SLUG;

          slugAlvo = String(slugContexto).trim().toLowerCase();
        }
      }
    }

    if (contextoUsuario && typeof contextoUsuario === 'object') {
      const farmacopeia = contextoUsuario.farmacopeia || {};
      const localidade = contextoUsuario.localidade || {};

      // Se o contexto tiver itens customizados válidos e o preset ainda não existir em disco
      if (
        Array.isArray(farmacopeia.itens_customizados) &&
        farmacopeia.itens_customizados.length >= 5 &&
        !this.existePresetLocal(slugAlvo)
      ) {
        const munNome = localidade.municipio_nome || localidade.municipio || 'Município Customizado';
        const ufSigla = localidade.uf || '';
        return normalizarObjetoCatalogo(
          {
            slug: slugAlvo !== DEFAULT_SLUG ? slugAlvo : gerarSlugMunicipio(munNome, ufSigla),
            municipio: munNome,
            uf: ufSigla,
            nome_exibicao:
              farmacopeia.nome_exibicao || `REMUME ${munNome}${ufSigla ? ' - ' + ufSigla : ''}`,
            selo_curto: `REMUME ${munNome}${ufSigla ? '/' + ufSigla : ''}`,
            fonte: farmacopeia.fonte || `REMUME Municipal (${munNome})`,
            itens: farmacopeia.itens_customizados
          },
          slugAlvo
        );
      }
    }

    if (!slugAlvo) {
      slugAlvo = DEFAULT_SLUG;
    }

    // 3. Tenta carregar via ConfigService.obterCatalogoRemume(slugAlvo)
    if (cs && typeof cs.obterCatalogoRemume === 'function') {
      try {
        const catalogoCs = cs.obterCatalogoRemume(slugAlvo);
        if (catalogoCs && Array.isArray(catalogoCs.itens) && catalogoCs.itens.length > 0) {
          return normalizarObjetoCatalogo(catalogoCs, slugAlvo);
        }
      } catch (_err) {
        // Fallback para leitura direta em disco
      }
    }

    // 4. Leitura direta em src/data/remumes/presets/<slugAlvo>.json
    const presetPath = path.join(PRESETS_DIR, `${slugAlvo}.json`);
    const dadosDisco = lerJsonSeguro(presetPath, null);
    if (dadosDisco && (Array.isArray(dadosDisco.itens) || Array.isArray(dadosDisco.medicamentos))) {
      return normalizarObjetoCatalogo(dadosDisco, slugAlvo);
    }

    // 5. Fallback para rename_nacional.json em disco ou constante embutida
    if (slugAlvo !== DEFAULT_SLUG) {
      const renamePath = path.join(PRESETS_DIR, `${DEFAULT_SLUG}.json`);
      const renameDisco = lerJsonSeguro(renamePath, null);
      if (renameDisco && Array.isArray(renameDisco.itens) && renameDisco.itens.length > 0) {
        return normalizarObjetoCatalogo(renameDisco, DEFAULT_SLUG);
      }
    }

    return normalizarObjetoCatalogo(FALLBACK_RENAME_NACIONAL, DEFAULT_SLUG);
  },

  /**
   * 3. extrairMedicamentosDeTextoBruto(textoBruto)
   * Parser determinístico + higienização de listas de medicamentos vindas de CSV, JSON,
   * HTML ou texto bruto extraído de PDFs de prefeituras.
   *
   * @param {string|Array} textoBruto
   * @returns {Array<string>}
   */
  extrairMedicamentosDeTextoBruto(textoBruto) {
    if (!textoBruto) return [];

    let linhasCandidatas = [];

    // Caso 1: Já é um Array (de strings ou de objetos JSON)
    if (Array.isArray(textoBruto)) {
      for (const elem of textoBruto) {
        if (typeof elem === 'string') {
          linhasCandidatas.push(elem);
        } else if (elem && typeof elem === 'object') {
          const montado = [
            elem.nome || elem.principio_ativo || elem.medicamento || elem.descricao || elem.item || '',
            elem.concentracao || elem.dosagem || elem.dose || '',
            elem.forma || elem.apresentacao || elem.forma_farmaceutica || elem.unidade || ''
          ]
            .map((s) => String(s).trim())
            .filter(Boolean)
            .join(' - ');
          if (montado) linhasCandidatas.push(montado);
        }
      }
    } else if (typeof textoBruto === 'string') {
      const trimmed = textoBruto.trim();
      if (!trimmed) return [];

      // Caso 2: String em formato JSON (Array ou Objeto contendo { itens: [...] })
      if (
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))
      ) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return this.extrairMedicamentosDeTextoBruto(parsed);
          }
          if (parsed && typeof parsed === 'object') {
            const listaInterna =
              parsed.itens || parsed.medicamentos || parsed.remume || parsed.data || parsed.lista;
            if (Array.isArray(listaInterna)) {
              return this.extrairMedicamentosDeTextoBruto(listaInterna);
            }
          }
        } catch (_e) {
          // Não é JSON válido, segue fluxo normal de texto bruto
        }
      }

      // Caso 3: Texto bruto (PDF extraído, CSV, TSV ou lista textual)
      linhasCandidatas = trimmed.split(/\r?\n/);
    } else {
      return [];
    }

    // Expressões regulares para validação farmacológica determinística
    const regexUnidadeDosagem =
      /\b\d+(?:[.,]\d+)*(?:\s*\/\s*\d+(?:[.,]\d+)*)?\s*(?:mg|mcg|ug|µg|g|kg|ml|l|ui|u\.i\.|%|meq|mmol|mg\/ml|mcg\/ml|mg\/g|ui\/ml|mg\/dose|mcg\/dose)(?:\s*\/\s*\d*(?:[.,]\d+)?\s*(?:ml|g|mg|l|dose|gotas))?\b/i;

    // Inclui formas completas e abreviações oficiais de tabelas de almoxarifado/farmácia municipal
    const regexFormaFarmaceutica =
      /\b(?:comprimido|comprimidos|comp\b|cpr\b|cápsula|capsula|cápsulas|capsulas|caps?\b|drágea|dragea|ampola|ampolas|amp\b|frasco|frascos|frasco-ampola|fr\b|xarope|xpe\b|suspensão|suspensao|susp\b|solução|solucao|sol\b|gotas|gts\b|pomada|pom\b|creme|cr\b|gel\b|loção|locao|adesivo|pó\s+para|po\s+para|injetável|injetavel|inj\b|spray|aerossol|inalante|inalatório|inalatorio|colírio|colirio|supositório|supositorio|óvulo|ovulo|bisnaga|bisn\b|tubo|sachê|sache|envelope|env\b|seringa|ser\b|caneta|implante|sistema\s+terapêutico|pastilha|elix|elixir|enema|granulado|flaconete|flac\b|pacote|pct\b|unidade|und\b)\b/i;

    // Cabeçalhos e ruídos institucionais que devem ser descartados
    const regexRuidoInstitucional =
      /^(?:p[áa]gina\s*\d+|prefeitura\s+municipal|secretaria\s+(?:municipal|estadual)\s+de\s+sa[úu]de|rela[çc][ãa]o\s+(?:municipal|nacional)\s+de\s+medicamentos|remume\b|rename\b|sum[áa]rio\b|[íi]ndice\b|anexo\s+[ivx\d]+|portaria\s+n|decreto\s+n|resolu[çc][ãa]o\s+n|cnpj\b|endere[çc]o\b|telefone\b|www\.|https?:\/\/|c[óo]digo\s+descri[çc][ãa]o|item\s+medicamento|princ[íi]pio\s+ativo\s+concentra[çc][ãa]o|lista\s+de\s+medicamentos|atualizado\s+em|data\s+de\s+publica[çc][ãa]o|coordena[çc][ãa]o\s+de\s+assist[êe]ncia|mostrando\s+\d+|nenhum\s+registro|total\s+de\s+registros|pesquisar\s+pela|selecione\s+uma|selecione\s+um)/i;

    const regexApenasDataOuNumero =
      /^(?:\d{1,4}[./-]\d{1,2}[./-]\d{2,4}|\d+(?:[.,]\d+)?|\W+)$/;

    // Colunas de ruído em tabelas de portais de transparência (estoque, botões, status)
    const regexColunaRuidoTabela =
      /^(?:BR\d+|\d{1,9}(?:[.,]\d{1,3})?|SIM|N[ÃA]O|ATIVO|INATIVO|B[ÁA]SICO|CBAF|DISPON[ÍI]VEL|INDISPON[ÍI]VEL|EM\s+ESTOQUE|SEM\s+ESTOQUE|EM\s+FALTA|NORMAL|ZERADO|VER\s+DETALHES|DETALHES|DETALHAR|VISUALIZAR|A[ÇC][ÕO]ES|MAIS\s+INFORMA[ÇC][ÕO]ES)$/i;

    const itensHigienizados = [];
    const vistos = new Set();

    for (let linha of linhasCandidatas) {
      if (typeof linha !== 'string') continue;

      // Remove caracteres de controle e múltiplos espaços
      linha = linha.replace(/[\u0000-\u001F\u007F]+/g, ' ').trim();
      if (!linha || linha.length < 4 || linha.length > 320) continue;

      // Se for linha de CSV/TSV/Tabela HTML separada por ";" ou "|" ou "\t", converte colunas relevantes
      if (linha.includes(';') || linha.includes('|') || linha.includes('\t')) {
        const delimitador = linha.includes(';') ? ';' : linha.includes('|') ? '|' : '\t';
        const colunas = linha
          .split(delimitador)
          .map((c) => c.replace(/^["']+|["']+$/g, '').replace(/\s+/g, ' ').trim())
          .filter(Boolean)
          // Remove colunas que são apenas códigos internos, estoque numérico, status ou botões de ação
          .filter((c) => !regexColunaRuidoTabela.test(c));

        // Se a linha era o cabeçalho da tabela (ex: "MEDICAMENTO ; UNIDADE ; TIPO ; ESTOQUE"), descarta
        if (
          colunas.length > 0 &&
          /^(?:medicamento|nome|descri[çc][ãa]o|princ[íi]pio\s+ativo|item|produto)$/i.test(colunas[0])
        ) {
          continue;
        }

        linha = colunas.join(' - ');
      }

      // Remove numeração inicial de listas/tabelas (ex: "1.", "01 - ", "104) ", "• ")
      linha = linha
        .replace(/^(?:[\d]{1,5}\s*[.)-]\s*|[-•*▪▸►]+\s*)/, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

      if (!linha || linha.length < 4) continue;

      // Filtra cabeçalhos genéricos, rodapés e datas
      if (regexRuidoInstitucional.test(linha)) continue;
      if (regexApenasDataOuNumero.test(linha)) continue;
      if (
        /^(?:medicamento|apresenta[çc][ãa]o|concentra[çc][ãa]o|forma\s+farmac[êe]utica|unidade|observa[çc][ãa]o|categoria|tipo|estoque|quantidade)$/i.test(
          linha
        )
      ) {
        continue;
      }

      // Verifica se possui nome farmacológico (pelo menos uma palavra alfabética >= 3 letras)
      const temNomeFarmaco = /[a-zA-ZÀ-ÿ]{3,}/.test(linha);
      if (!temNomeFarmaco) continue;

      // Verifica se possui concentração/dosagem válida OU forma farmacêutica válida (incluindo a coluna de unidade unida por ' - ')
      const temDosagem = regexUnidadeDosagem.test(linha);
      const temForma = regexFormaFarmaceutica.test(linha);

      if (!temDosagem && !temForma) continue;

      // Padronização estética de unidades comuns
      const linhaLimpa = linha
        .replace(/\b(\d+)\s*(MG)\b/gi, '$1 mg')
        .replace(/\b(\d+)\s*(MCG|UG)\b/gi, '$1 mcg')
        .replace(/\b(\d+)\s*(ML)\b/gi, '$1 mL')
        .replace(/\b(\d+)\s*(UI)\b/gi, '$1 UI')
        .replace(/\s+-\s+-\s+/g, ' - ')
        .trim();

      const chaveUnica = normalizarAscii(linhaLimpa).toLowerCase().replace(/\s+/g, ' ');
      if (!vistos.has(chaveUnica)) {
        vistos.add(chaveUnica);
        itensHigienizados.push(linhaLimpa);
      }
    }

    return itensHigienizados;
  },

  /**
   * Valida a Sanidade Clínica e Farmacológica de um documento candidato à REMUME municipal.
   * Gatekeeper Anti-Alucinação (Zero Invenção):
   * 1. O documento deve mencionar o município buscado.
   * 2. Deve conter pelo menos 5 dos 10 medicamentos âncora da Atenção Primária do SUS.
   * 3. Deve possuir pelo menos 15 itens farmacológicos válidos com dosagem/apresentação.
   *
   * @param {string} textoBruto
   * @param {Array<string>} itensExtraidos
   * @param {string} municipio
   * @param {string} [uf]
   * @returns {{ aprovado: boolean, motivo: string, ancorasEncontradas: Array<string>, totalItens: number }}
   */
  validarSanidadeClinicaRemume(textoBruto, itensExtraidos, municipio, uf = '') {
    const itens = Array.isArray(itensExtraidos) ? itensExtraidos : [];

    const normalizarComparacaoTerritorial = (s) =>
      normalizarAscii(String(s || ''))
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const munNorm = normalizarComparacaoTerritorial(municipio);

    if (!munNorm) {
      return {
        aprovado: false,
        motivo: 'Município não informado para validação territorial.',
        ancorasEncontradas: [],
        totalItens: itens.length
      };
    }

    const textoNorm = normalizarComparacaoTerritorial(textoBruto);
    const itensNormConcat = normalizarComparacaoTerritorial(itens.join('\n'));

    // 1. Verifica vínculo territorial com o município
    const mencionaMunicipio = textoNorm.includes(munNorm) || itensNormConcat.includes(munNorm);
    if (!mencionaMunicipio) {
      return {
        aprovado: false,
        motivo: `O documento não menciona o município de ${municipio}${uf ? ' - ' + uf : ''}.`,
        ancorasEncontradas: [],
        totalItens: itens.length
      };
    }

    // 2. Verifica presença dos medicamentos âncora da Atenção Primária do SUS nos itens extraídos
    const ancorasEncontradas = MEDICAMENTOS_ANCORA_SUS.filter((ancora) =>
      itensNormConcat.includes(ancora)
    );

    if (ancorasEncontradas.length < MINIMO_ANCORAS_SUS) {
      return {
        aprovado: false,
        motivo: `Sanidade farmacológica insuficiente: encontrados apenas ${ancorasEncontradas.length}/${MINIMO_ANCORAS_SUS} medicamentos âncora do SUS nos itens extraídos.`,
        ancorasEncontradas,
        totalItens: itens.length
      };
    }

    // 3. Verifica densidade mínima de medicamentos válidos
    if (itens.length < MINIMO_ITENS_VALIDOS_WEB) {
      return {
        aprovado: false,
        motivo: `Quantidade insuficiente de medicamentos extraídos (${itens.length}/${MINIMO_ITENS_VALIDOS_WEB}).`,
        ancorasEncontradas,
        totalItens: itens.length
      };
    }

    return {
      aprovado: true,
      motivo: 'Documento oficial validado pelo Gatekeeper Clínico de Sanidade Farmacológica.',
      ancorasEncontradas,
      totalItens: itens.length
    };
  },

  /**
   * 4. importarEPromoverRemume(opcoes)
   * - Recebe { chatId, municipio, uf, conteudoBruto, itens, fonte, urlOficial }.
   * - Extrai/valida os itens.
   * - Promove automaticamente para os presets globais (src/data/remumes/presets/<slug>.json e manifest.json).
   * - Se chatId foi passado, atualiza automaticamente o perfil daquele chatId.
   *
   * @param {object|string} opcoesOuMun
   * @returns {object}
   */
  importarEPromoverRemume(
    opcoesOuMun = {},
    ufArg = '',
    conteudoArg = '',
    fonteArg = '',
    chatIdArg = ''
  ) {
    let opcoes = opcoesOuMun;
    if (typeof opcoesOuMun === 'string') {
      opcoes = {
        municipio: opcoesOuMun,
        uf: ufArg,
        conteudoBruto: Array.isArray(conteudoArg) ? '' : String(conteudoArg || ''),
        itens: Array.isArray(conteudoArg) ? conteudoArg : [],
        fonte: fonteArg,
        chatId: chatIdArg
      };
    }

    const {
      chatId,
      municipio = '',
      uf = '',
      conteudoBruto = '',
      itens = [],
      fonte = '',
      urlOficial = null
    } = opcoes || {};

    const municipioLimpo = String(municipio || '').trim();
    const ufLimpa = String(uf || '').trim().toUpperCase();

    if (!municipioLimpo) {
      return {
        sucesso: false,
        promovido: false,
        erro: 'Nome do município é obrigatório para importar e promover a REMUME.',
        itens_validos: 0,
        total: 0
      };
    }

    // Combina itens já estruturados (se enviados) com extração de texto bruto
    const listaCombinada = [];
    if (Array.isArray(itens) && itens.length > 0) {
      listaCombinada.push(...this.extrairMedicamentosDeTextoBruto(itens));
    }
    if (conteudoBruto) {
      listaCombinada.push(...this.extrairMedicamentosDeTextoBruto(conteudoBruto));
    }

    // Deduplica mantendo ordem
    const itensValidos = Array.from(new Set(listaCombinada));

    if (itensValidos.length < 3) {
      return {
        sucesso: false,
        promovido: false,
        municipio: municipioLimpo,
        uf: ufLimpa,
        itens_validos: itensValidos.length,
        total: itensValidos.length,
        erro: `A lista fornecida contém apenas ${itensValidos.length} medicamento(s) válido(s). São necessários pelo menos 3 medicamentos com concentração/apresentação para validar uma REMUME municipal.`
      };
    }

    const slug = gerarSlugMunicipio(municipioLimpo, ufLimpa);
    const nomeExibicao = `REMUME ${municipioLimpo}${ufLimpa ? ' - ' + ufLimpa : ''}`;
    const seloCurto = `REMUME ${municipioLimpo}${ufLimpa ? '/' + ufLimpa : ''}`;
    const fonteFinal =
      String(fonte || '').trim() ||
      `Secretaria Municipal de Saúde de ${municipioLimpo}${ufLimpa ? ' - ' + ufLimpa : ''}`;

    const objetoPreset = normalizarObjetoCatalogo(
      {
        slug,
        municipio: municipioLimpo,
        uf: ufLimpa,
        nome_exibicao: nomeExibicao,
        selo_curto: seloCurto,
        fonte: fonteFinal,
        url_oficial: urlOficial || null,
        verificado: true,
        atualizado_em: new Date().toISOString(),
        itens: itensValidos
      },
      slug
    );

    const cs = getConfigService();
    let promovidoViaCs = false;

    // 1. REGRA DE OURO: Promove para preset global via ConfigService
    if (cs && typeof cs.promoverRemumeParaPresetGlobal === 'function') {
      try {
        cs.promoverRemumeParaPresetGlobal({
          slug,
          municipio: municipioLimpo,
          uf: ufLimpa,
          nome_exibicao: nomeExibicao,
          selo_curto: seloCurto,
          fonte: fonteFinal,
          urlOficial: urlOficial || null,
          itens: itensValidos
        });
        promovidoViaCs = true;
      } catch (_err) {
        promovidoViaCs = false;
      }
    }

    // Garante gravação física em src/data/remumes/presets/<slug>.json e manifest.json
    try {
      garantirDiretorioPresets();
      const presetFilePath = path.join(PRESETS_DIR, `${slug}.json`);
      fs.writeFileSync(presetFilePath, JSON.stringify(objetoPreset, null, 2), 'utf8');

      const manifestAtual = lerJsonSeguro(MANIFEST_PATH, {
        versao: '1.0.0',
        atualizado_em: new Date().toISOString(),
        presets: []
      });

      const listaPresets = Array.isArray(manifestAtual.presets)
        ? manifestAtual.presets
        : Array.isArray(manifestAtual)
        ? manifestAtual
        : [];

      const entradaManifest = {
        slug,
        remume_id: slug,
        municipio: municipioLimpo,
        uf: ufLimpa,
        nome_exibicao: nomeExibicao,
        selo_curto: seloCurto,
        fonte: fonteFinal,
        url_oficial: urlOficial || null,
        total_itens: itensValidos.length,
        total_medicamentos: itensValidos.length,
        arquivo: `${slug}.json`,
        atualizado_em: objetoPreset.atualizado_em
      };

      const idxExistente = listaPresets.findIndex(
        (p) => p && (p.slug === slug || p.remume_id === slug)
      );
      if (idxExistente >= 0) {
        listaPresets[idxExistente] = { ...listaPresets[idxExistente], ...entradaManifest };
      } else {
        listaPresets.push(entradaManifest);
      }

      const novoManifest = {
        versao: manifestAtual.versao || '1.0.0',
        atualizado_em: new Date().toISOString(),
        presets: listaPresets
      };
      fs.writeFileSync(MANIFEST_PATH, JSON.stringify(novoManifest, null, 2), 'utf8');
      promovidoViaCs = true;
    } catch (_fsErr) {
      // Silencioso caso FS seja restrito
    }

    // 2. Se chatId foi passado, atualiza automaticamente o perfil clínico daquele chatId
    if (chatId && cs && typeof cs.salvarContextoClinico === 'function') {
      try {
        cs.salvarContextoClinico(chatId, {
          localidade: {
            municipio_nome: municipioLimpo,
            uf: ufLimpa,
            municipio_slug: slug
          },
          farmacopeia: {
            modo: 'MUNICIPAL',
            remume_id: slug,
            nome_exibicao: nomeExibicao,
            fonte: fonteFinal,
            itens_customizados: []
          }
        });
      } catch (_err) {
        // Ignora falha não-crítica de persistência de sessão
      }
    }

    return {
      sucesso: true,
      promovido: promovidoViaCs,
      slug,
      municipio: municipioLimpo,
      uf: ufLimpa,
      total: itensValidos.length,
      total_itens: itensValidos.length,
      catalogo: objetoPreset
    };
  },

  /**
   * 5. buscarRemumeNaWeb(municipio, uf, chatId)
   * - Primeiro verifica se já existe preset local para gerarSlugMunicipio(municipio, uf)
   *   em src/data/remumes/presets/<slug>.json. Se já existir, ativa imediatamente no perfil
   *   do chatId e retorna { encontrado: true, origem: "PRESET_EXISTENTE", catalogo: ... }.
   * - Se não existir localmente, realiza busca web determinística em domínios oficiais (.gov.br)
   *   com gerador de portais municipais, crawler de 1 nível, parser de HTML/PDF e Gatekeeper Clínico:
   *   - Se aprovado, promove automaticamente para preset global e ativa no perfil.
   *   - Se NÃO encontrar documento oficial confiável e verificável, JAMAIS inventa dados:
   *     mantém RENAME Nacional (SUS) como segurança no perfil do usuário.
   *
   * @param {string} municipio
   * @param {string} uf
   * @param {string} [chatId]
   * @returns {Promise<object>}
   */
  async buscarRemumeNaWeb(municipio, uf, chatId) {
    const extraido = extrairMunicipioEUf(municipio, uf);
    const municipioLimpo = String(extraido.municipio || municipio || '').trim();
    const ufLimpa = String(extraido.uf || uf || '').trim().toUpperCase();
    const slug = gerarSlugMunicipio(municipioLimpo, ufLimpa);
    const cs = getConfigService();

    // 1. Verifica se já existe nos presets locais (ex: já veio no pacote ou outro médico já importou)
    if (this.existePresetLocal(slug)) {
      const catalogoExistente = this.obterCatalogoAtivo(slug);

      if (chatId && cs && typeof cs.salvarContextoClinico === 'function') {
        try {
          cs.salvarContextoClinico(chatId, {
            localidade: {
              municipio_nome: catalogoExistente.municipio || municipioLimpo,
              uf: catalogoExistente.uf || ufLimpa,
              municipio_slug: slug
            },
            farmacopeia: {
              modo: slug === DEFAULT_SLUG ? 'NACIONAL' : 'MUNICIPAL',
              remume_id: slug,
              nome_exibicao: catalogoExistente.nome_exibicao,
              fonte: catalogoExistente.fonte,
              itens_customizados: []
            }
          });
        } catch (_e) {
          // Ignora erro ao salvar contexto
        }
      }

      return {
        encontrado: true,
        origem: 'PRESET_EXISTENTE',
        slug,
        municipio: catalogoExistente.municipio || municipioLimpo,
        uf: catalogoExistente.uf || ufLimpa,
        catalogo: catalogoExistente,
        mensagem: `REMUME de ${municipioLimpo} - ${ufLimpa} localizada nos presets oficiais (${catalogoExistente.itens.length} medicamentos) e ativada automaticamente.`
      };
    }

    // 2. Tentativa de busca web verificada (Gatekeeper Anti-Alucinação / Zero Invenção)
    let documentoVerificado = null;
    try {
      documentoVerificado = await this._tentarBuscaOficialVerificada(municipioLimpo, ufLimpa);
    } catch (_err) {
      documentoVerificado = null;
    }

    if (
      documentoVerificado &&
      Array.isArray(documentoVerificado.itens) &&
      documentoVerificado.itens.length >= MINIMO_ITENS_VALIDOS_WEB
    ) {
      const resultadoPromocao = this.importarEPromoverRemume({
        chatId,
        municipio: municipioLimpo,
        uf: ufLimpa,
        itens: documentoVerificado.itens,
        fonte: documentoVerificado.fonte,
        urlOficial: documentoVerificado.urlOficial
      });

      if (resultadoPromocao && resultadoPromocao.sucesso) {
        return {
          encontrado: true,
          origem: 'BUSCA_WEB_OFICIAL',
          slug: resultadoPromocao.slug,
          municipio: municipioLimpo,
          uf: ufLimpa,
          url_oficial: documentoVerificado.urlOficial || null,
          ancoras_sus: documentoVerificado.ancorasEncontradas || [],
          catalogo: resultadoPromocao.catalogo,
          mensagem: `REMUME oficial de ${municipioLimpo} - ${ufLimpa} localizada em fonte governamental verificada (${resultadoPromocao.total_itens} medicamentos) e promovida para preset global.`
        };
      }
    }

    // 3. GATEKEEPER ANTI-ALUCINAÇÃO: Não foi localizado documento oficial verificável.
    // JAMAIS inventar medicamentos municipais. Mantém RENAME Nacional (SUS) por segurança clínica.
    const catalogoRename = this.obterCatalogoAtivo(DEFAULT_SLUG);

    if (chatId && cs && typeof cs.salvarContextoClinico === 'function') {
      try {
        cs.salvarContextoClinico(chatId, {
          localidade: {
            municipio_nome: municipioLimpo,
            uf: ufLimpa,
            municipio_slug: slug
          },
          farmacopeia: {
            modo: 'NACIONAL',
            remume_id: DEFAULT_SLUG,
            nome_exibicao: 'RENAME Nacional (SUS)',
            fonte: catalogoRename.fonte,
            itens_customizados: []
          }
        });
      } catch (_e) {
        // Ignora falha ao salvar contexto
      }
    }

    return {
      encontrado: false,
      requer_solicitacao_dev: true,
      slug,
      municipio: municipioLimpo,
      uf: ufLimpa,
      catalogo_seguranca: catalogoRename,
      mensagem:
        'Não foi localizado um documento oficial verificável da REMUME de ' +
        municipioLimpo +
        ' - ' +
        ufLimpa +
        '. Mantendo a RENAME Nacional (SUS) por segurança clínica.'
    };
  },

  /**
   * Executa o pipeline determinístico de busca em domínios oficiais (.gov.br),
   * rastreamento de 1 nível, extração de texto (HTML/PDF) e validação pelo Gatekeeper Clínico.
   * @private
   */
  async _tentarBuscaOficialVerificada(municipio, uf) {
    if (!municipio || !uf) return null;

    // 1. Permite injeção de provider customizado de busca oficial se configurado no runtime
    if (
      typeof global !== 'undefined' &&
      typeof global.RemumeOfficialWebVerifier === 'function'
    ) {
      const resCustom = await global.RemumeOfficialWebVerifier(municipio, uf);
      if (
        resCustom &&
        Array.isArray(resCustom.itens) &&
        resCustom.itens.length >= MINIMO_ITENS_VALIDOS_WEB
      ) {
        return resCustom;
      }
    }

    const slug = gerarSlugMunicipio(municipio, uf);

    // 2. Coleta URLs candidatas oficiais (fontes_oficiais + gerador .gov.br + crawler 1 nível + buscadores)
    const urlsCandidatas = await this._buscarUrlsCandidatasGovBr(municipio, uf);

    // 3. Inspeciona cada URL oficial candidata com parser de HTML/PDF e Gatekeeper Clínico
    const urlsInspecionadas = new Set();
    const filaCandidatas = Array.isArray(urlsCandidatas) ? [...urlsCandidatas] : [];

    while (filaCandidatas.length > 0 && urlsInspecionadas.size < 16) {
      const candidata = filaCandidatas.shift();
      const urlOficial = typeof candidata === 'string' ? candidata : candidata && candidata.url;
      if (!urlOficial || urlsInspecionadas.has(urlOficial)) continue;
      if (!this._ehUrlOficialConfiavel(urlOficial)) continue;

      urlsInspecionadas.add(urlOficial);

      // Se a candidata já trouxe buffer pré-carregado durante o rastreamento do portal municipal, reutiliza
      let respostaHttp =
        typeof candidata === 'object' && candidata.respostaHttp
          ? candidata.respostaHttp
          : await this._httpGetBufferSeguro(urlOficial, 6000, 3);

      if (!respostaHttp || !respostaHttp.buffer || respostaHttp.buffer.length < 150) {
        continue;
      }

      const urlFinal = respostaHttp.finalUrl || urlOficial;
      if (!this._ehUrlOficialConfiavel(urlFinal)) {
        continue;
      }

      const ctLower = String(respostaHttp.contentType || '').toLowerCase();
      const ehHtml =
        ctLower.includes('text/html') ||
        (!ctLower.includes('pdf') &&
          /<(?:!doctype|html|table|tr|td)\b/i.test(
            respostaHttp.buffer.subarray(0, 2048).toString('utf8')
          ));

      let textoExtraido = await this._extrairTextoDeBuffer(
        respostaHttp.buffer,
        respostaHttp.contentType,
        urlFinal
      );

      if (textoExtraido && textoExtraido.length >= 150) {
        let itensExtraidos = this.extrairMedicamentosDeTextoBruto(textoExtraido);

        // Se for página HTML com indícios de tabela farmacológica (ou paginada),
        // expande e consolida todas as páginas (pagina=1..N) e escopos (farmacia_basica, hospitalar)
        if (ehHtml && itensExtraidos.length >= 3) {
          const htmlBruto = respostaHttp.buffer.toString('utf8');
          textoExtraido = await this._coletarTextoPaginadoEComplementar(
            htmlBruto,
            urlFinal,
            textoExtraido
          );
          itensExtraidos = this.extrairMedicamentosDeTextoBruto(textoExtraido);
        }

        const cabecalhoContexto =
          typeof candidata === 'object' && candidata.contextoTerritorial
            ? `${candidata.contextoTerritorial}\n${textoExtraido}`
            : textoExtraido;

        const validacao = this.validarSanidadeClinicaRemume(
          cabecalhoContexto,
          itensExtraidos,
          municipio,
          uf
        );

        if (validacao.aprovado) {
          return {
            fonte:
              (typeof candidata === 'object' && candidata.fonte) ||
              `Secretaria Municipal de Saúde de ${municipio} - ${uf} (Documento Oficial Verificado)`,
            urlOficial: urlFinal,
            ancorasEncontradas: validacao.ancorasEncontradas,
            itens: itensExtraidos
          };
        }
      }

      // Crawler de 1º nível: se a página oficial for HTML/JSON e ainda não tiver sido expandida,
      // extrai links internos de PDFs / páginas de REMUME / medicamentos da prefeitura
      const nivelAtual = (typeof candidata === 'object' && candidata.nivel) || 0;
      if (
        nivelAtual < 1 &&
        (ehHtml || ctLower.includes('application/json'))
      ) {
        const htmlOuJson = respostaHttp.buffer.toString('utf8');
        const subLinks = this._extrairLinksInternosRelevantes(htmlOuJson, urlFinal, municipio);
        for (const sub of subLinks) {
          if (!urlsInspecionadas.has(sub.url) && filaCandidatas.length < 24) {
            filaCandidatas.push({
              url: sub.url,
              fonte:
                (typeof candidata === 'object' && candidata.fonte) ||
                `Secretaria Municipal de Saúde de ${municipio} - ${uf} (${urlFinal})`,
              contextoTerritorial: `${municipio} - ${uf}`,
              nivel: nivelAtual + 1,
              prioridade: sub.score
            });
          }
        }
        // Prioriza PDFs e URLs com maior score farmacológico
        filaCandidatas.sort((a, b) => (b.prioridade || 0) - (a.prioridade || 0));
      }
    }

    // 4. Verifica se o município possui Documento Oficial Verificado catalogado (Seed Governamental .gov.br)
    // (ex: quando o PDF do portal municipal é digitalizado em imagem ou o servidor da prefeitura está em manutenção)
    const docCatalogado = DOCUMENTOS_OFICIAIS_MUNICIPAIS_VERIFICADOS[slug];
    if (docCatalogado && docCatalogado.conteudoOficial) {
      const itensOficiais = this.extrairMedicamentosDeTextoBruto(docCatalogado.conteudoOficial);
      const validacaoOficial = this.validarSanidadeClinicaRemume(
        docCatalogado.conteudoOficial,
        itensOficiais,
        municipio,
        uf
      );

      if (validacaoOficial.aprovado) {
        return {
          fonte: docCatalogado.fonte,
          urlOficial: docCatalogado.urlOficial,
          ancorasEncontradas: validacaoOficial.ancorasEncontradas,
          itens: itensOficiais
        };
      }
    }

    return null;
  },

  /**
   * Verifica estritamente se uma URL pertence a um domínio oficial governamental (.gov.br, .leg.br)
   * ou portal institucional de prefeitura/câmara/secretaria de saúde.
   * @param {string} urlStr
   * @returns {boolean}
   */
  _ehUrlOficialConfiavel(urlStr) {
    if (!urlStr || typeof urlStr !== 'string') return false;
    try {
      const parsed = new URL(urlStr.trim());
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;

      const host = parsed.hostname.toLowerCase();

      // Bloqueia loopback, endereços locais e IPs privados (Prevenção SSRF)
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '0.0.0.0' ||
        host.startsWith('10.') ||
        host.startsWith('192.168.') ||
        host.startsWith('169.254.') ||
        host.endsWith('.local') ||
        host.endsWith('.internal')
      ) {
        return false;
      }

      // Domínios estritamente governamentais brasileiros (.gov.br / .leg.br / .jus.br)
      if (/\.(?:gov|leg|jus)\.br$/i.test(host)) {
        return true;
      }

      // Portais oficiais municipais de prefeituras, câmaras, COSEMS ou diários oficiais municipais
      if (
        /^(?:www\.)?(?:prefeitura|pm|saude|sms|camara|diariooficial|cosems|transparencia)[a-z0-9-]*\.(?:org\.br|com\.br|net\.br|br)$/i.test(
          host
        )
      ) {
        return true;
      }

      return false;
    } catch (_e) {
      return false;
    }
  },

  /**
   * Gera de forma determinística os domínios oficiais (.gov.br) prováveis de uma prefeitura brasileira.
   * Ex: ("Garrafão do Norte", "PA") ->
   *   - https://www.garrafaodonorte.pa.gov.br
   *   - https://garrafaodonorte.pa.gov.br
   *   - https://saude.garrafaodonorte.pa.gov.br
   *   - https://prefeitura.garrafaodonorte.pa.gov.br
   *   - https://prefeituragarrafaodonorte.pa.gov.br
   *   - https://transparencia.garrafaodonorte.pa.gov.br
   *   - https://www.garrafaonorte.pa.gov.br
   * @param {string} municipio
   * @param {string} uf
   * @returns {Array<string>}
   */
  _gerarDominiosOficiaisMunicipio(municipio, uf) {
    const ufLower = normalizarAscii(String(uf || ''))
      .toLowerCase()
      .replace(/[^a-z]/g, '');
    const munNorm = normalizarAscii(String(municipio || ''))
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!munNorm || !ufLower || ufLower.length !== 2) return [];

    const preposicoes = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
    const tokens = munNorm.split(/[\s-]+/).filter(Boolean);
    const tokensSemPrep = tokens.filter((t) => !preposicoes.has(t));

    const nomeCompacto = tokens.join('');
    const nomeSemPrepCompacto = tokensSemPrep.join('');
    const nomeHifenizado = tokens.join('-');

    const dominios = [
      `https://www.${nomeCompacto}.${ufLower}.gov.br`,
      `https://${nomeCompacto}.${ufLower}.gov.br`,
      `https://saude.${nomeCompacto}.${ufLower}.gov.br`,
      `https://prefeitura.${nomeCompacto}.${ufLower}.gov.br`,
      `https://prefeitura${nomeCompacto}.${ufLower}.gov.br`,
      `https://pm${nomeCompacto}.${ufLower}.gov.br`,
      `https://transparencia.${nomeCompacto}.${ufLower}.gov.br`
    ];

    if (nomeSemPrepCompacto && nomeSemPrepCompacto !== nomeCompacto) {
      dominios.push(
        `https://www.${nomeSemPrepCompacto}.${ufLower}.gov.br`,
        `https://${nomeSemPrepCompacto}.${ufLower}.gov.br`,
        `https://prefeitura${nomeSemPrepCompacto}.${ufLower}.gov.br`
      );
    }

    if (nomeHifenizado && nomeHifenizado !== nomeCompacto) {
      dominios.push(`https://www.${nomeHifenizado}.${ufLower}.gov.br`);
    }

    return Array.from(new Set(dominios));
  },

  /**
   * Lista de subpáginas e endpoints de busca interna/CMS/Transparência comuns em portais de prefeituras (.gov.br).
   * Inclui rotas padrão de portais de medicamentos municipais (medicamentoslista.php, farmacia_basica, etc.).
   * @returns {Array<{ path: string, prioridade: number }>}
   */
  _gerarSubcaminhosSaude() {
    return [
      { path: '/medicamentoslista.php', prioridade: 16 },
      { path: '/medicamentoslista.php?tipo=farmacia_basica', prioridade: 16 },
      { path: '/medicamentos.php', prioridade: 15 },
      { path: '/wp-json/wp/v2/media?search=remume&per_page=10', prioridade: 15 },
      { path: '/wp-json/wp/v2/posts?search=remume&per_page=10', prioridade: 14 },
      { path: '/wp-json/wp/v2/pages?search=remume&per_page=10', prioridade: 14 },
      { path: '/wp-json/wp/v2/media?search=medicamentos&per_page=10', prioridade: 12 },
      { path: '/remume', prioridade: 13 },
      { path: '/remume.pdf', prioridade: 13 },
      { path: '/saude/remume', prioridade: 12 },
      { path: '/assistencia-farmaceutica', prioridade: 11 },
      { path: '/medicamentos', prioridade: 11 },
      { path: '/?s=remume', prioridade: 10 },
      { path: '/?s=relacao+municipal+de+medicamentos', prioridade: 10 },
      { path: '/saude', prioridade: 9 },
      { path: '/secretaria-de-saude', prioridade: 9 },
      { path: '/secretarias/saude', prioridade: 9 },
      { path: '/secretaria-municipal-de-saude', prioridade: 9 },
      { path: '/transparencia', prioridade: 7 }
    ];
  },

  /**
   * Detecta links de paginação (pagina=2, page=2, p=2, pg=2) e filtros de escopo farmacêutico
   * (tipo=farmacia_basica, tipo=hospitalar, etc.) dentro de uma página HTML de tabela municipal.
   * @param {string} html
   * @param {string} urlBase
   * @returns {Array<string>}
   */
  _extrairLinksPaginacaoEEscopos(html, urlBase) {
    if (!html || typeof html !== 'string' || !urlBase) return [];

    let parsedBase;
    try {
      parsedBase = new URL(urlBase);
    } catch (_e) {
      return [];
    }

    const urlsComplementares = new Set();
    const regexHref = /<a\b[^>]*href=["']([^"'#>]+)["'][^>]*>/gi;
    let match;

    while ((match = regexHref.exec(html)) !== null) {
      const rawHref = match[1].replace(/&amp;/g, '&').trim();
      if (!rawHref || rawHref.startsWith('javascript:') || rawHref.startsWith('mailto:')) {
        continue;
      }

      try {
        const resolved = new URL(rawHref, parsedBase);
        // Deve pertencer ao mesmo domínio oficial
        if (resolved.hostname !== parsedBase.hostname) continue;

        const searchLower = resolved.search.toLowerCase();
        const pathLower = resolved.pathname.toLowerCase();

        // Ignora links de detalhe individual para não fazer centenas de requests desnecessários
        // quando a listagem paginada já traz os dados
        if (pathLower.includes('detalhe') || /[?&]id=\d+/i.test(searchLower)) {
          continue;
        }

        const mesmoEndpointLista =
          resolved.pathname === parsedBase.pathname ||
          pathLower.includes('medicamento') ||
          pathLower.includes('remume') ||
          pathLower.includes('farmacia');

        const temParametroPaginacaoOuEscopo =
          /[?&](?:pagina|page|pag|pg|p|offset|inicio)=\d+/i.test(searchLower) ||
          /[?&](?:tipo|categoria|elenco|farmacia)=[a-z0-9_-]+/i.test(searchLower);

        if (mesmoEndpointLista && temParametroPaginacaoOuEscopo) {
          const fullUrl = resolved.toString();
          if (fullUrl !== parsedBase.toString()) {
            urlsComplementares.add(fullUrl);
          }
        }
      } catch (_e) {
        // Ignora URL malformada
      }
    }

    return Array.from(urlsComplementares).slice(0, 24);
  },

  /**
   * Quando uma página HTML governamental contém uma tabela de medicamentos paginada
   * (ex: medicamentoslista.php?tipo=farmacia_basica&pagina=1..N ou múltiplos tipos),
   * segue automaticamente todas as páginas e escopos irmãos para consolidar os 100% dos itens.
   * @param {string} htmlInicial
   * @param {string} urlInicial
   * @param {string} textoInicial
   * @returns {Promise<string>}
   */
  async _coletarTextoPaginadoEComplementar(htmlInicial, urlInicial, textoInicial) {
    if (!htmlInicial || typeof htmlInicial !== 'string') return textoInicial || '';

    const filaPaginacao = this._extrairLinksPaginacaoEEscopos(htmlInicial, urlInicial);
    if (filaPaginacao.length === 0) return textoInicial;

    const visitadas = new Set([urlInicial]);
    const blocosTexto = [textoInicial];
    const LIMITE_PAGINAS = 25;

    while (filaPaginacao.length > 0 && visitadas.size < LIMITE_PAGINAS) {
      // Processa em lotes de até 4 páginas simultâneas para alta performance sem sobrecarregar o portal
      const lote = [];
      while (filaPaginacao.length > 0 && lote.length < 4 && visitadas.size < LIMITE_PAGINAS) {
        const proxUrl = filaPaginacao.shift();
        if (!visitadas.has(proxUrl)) {
          visitadas.add(proxUrl);
          lote.push(proxUrl);
        }
      }

      if (lote.length === 0) break;

      const respostas = await Promise.allSettled(
        lote.map((u) => this._httpGetBufferSeguro(u, 5000, 2))
      );

      for (let i = 0; i < respostas.length; i++) {
        const res = respostas[i];
        if (res.status !== 'fulfilled' || !res.value || !res.value.buffer) continue;

        const respPag = res.value;
        const urlPag = respPag.finalUrl || lote[i];
        const htmlPag = respPag.buffer.toString('utf8');

        const textoPag = this._limparHtmlParaTexto(htmlPag);
        if (textoPag) {
          blocosTexto.push(textoPag);
        }

        // Descobre páginas seguintes (ex: página 2 revela links para páginas 6, 7, 8...)
        const novosLinks = this._extrairLinksPaginacaoEEscopos(htmlPag, urlPag);
        for (const nv of novosLinks) {
          if (
            !visitadas.has(nv) &&
            !filaPaginacao.includes(nv) &&
            visitadas.size + filaPaginacao.length < LIMITE_PAGINAS
          ) {
            filaPaginacao.push(nv);
          }
        }
      }
    }

    return blocosTexto.join('\n');
  },

  /**
   * Extrai links internos de 1º nível a partir do HTML ou JSON (WP-JSON) de um portal municipal,
   * pontuando links de PDFs e subpáginas de REMUME / Assistência Farmacêutica / Saúde.
   * @param {string} htmlOuJson
   * @param {string} baseUrl
   * @param {string} [municipio]
   * @returns {Array<{ url: string, score: number }>}
   */
  _extrairLinksInternosRelevantes(htmlOuJson, baseUrl, municipio = '') {
    if (!htmlOuJson || typeof htmlOuJson !== 'string') return [];

    const linksPontuados = new Map();
    const munNorm = normalizarAscii(municipio).toLowerCase().replace(/\s+/g, '');

    const registrarUrl = (rawUrl, textoAncora = '') => {
      if (!rawUrl || typeof rawUrl !== 'string') return;
      const limpa = rawUrl
        .replace(/\\+/g, '')
        .replace(/&amp;/g, '&')
        .trim();

      if (
        !limpa ||
        limpa.startsWith('javascript:') ||
        limpa.startsWith('mailto:') ||
        limpa.startsWith('tel:') ||
        limpa.startsWith('#')
      ) {
        return;
      }

      let urlAbsoluta = '';
      try {
        urlAbsoluta = new URL(limpa, baseUrl).toString();
      } catch (_e) {
        return;
      }

      if (!this._ehUrlOficialConfiavel(urlAbsoluta)) return;

      const urlLower = normalizarAscii(urlAbsoluta).toLowerCase();
      const ancoraLower = normalizarAscii(textoAncora).toLowerCase();
      const combinado = `${urlLower} ${ancoraLower}`;

      // Ignora arquivos estáticos irrelevantes (imagens, estilos, fontes, scripts)
      if (/\.(?:jpg|jpeg|png|gif|svg|webp|css|js|ico|woff2?|ttf|eot|mp4|mp3|zip)(?:$|\?)/i.test(urlLower)) {
        return;
      }

      let score = 0;
      if (combinado.includes('remume')) score += 15;
      if (combinado.includes('relacao municipal de medicamentos') || combinado.includes('relacao-municipal-de-medicamentos')) {
        score += 15;
      }
      if (combinado.includes('elenco de medicamentos') || combinado.includes('lista de medicamentos')) {
        score += 12;
      }
      if (combinado.includes('assistencia farmaceutica') || combinado.includes('assistencia-farmaceutica')) {
        score += 10;
      }
      if (combinado.includes('medicamento') || combinado.includes('farmacia')) {
        score += 8;
      }
      if (combinado.includes('rename')) score += 6;
      if (combinado.includes('saude') || combinado.includes('secretaria')) score += 4;
      if (urlLower.endsWith('.pdf') || urlLower.includes('.pdf?')) score += 7;
      if (munNorm && urlLower.includes(munNorm)) score += 3;

      if (score >= 7) {
        const anterior = linksPontuados.get(urlAbsoluta) || 0;
        if (score > anterior) {
          linksPontuados.set(urlAbsoluta, score);
        }
      }
    };

    // 1. Se for resposta JSON (ex: WP-JSON /wp-json/wp/v2/media ou posts)
    const trimmed = htmlOuJson.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        const itensJson = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of itensJson) {
          if (!item || typeof item !== 'object') continue;
          const titulo =
            (item.title && (item.title.rendered || item.title)) ||
            item.slug ||
            item.description ||
            '';
          if (item.source_url) registrarUrl(item.source_url, `${titulo} remume pdf`);
          if (item.link) registrarUrl(item.link, String(titulo));
          if (item.guid && item.guid.rendered) registrarUrl(item.guid.rendered, String(titulo));
          const corpoHtml =
            (item.content && item.content.rendered) ||
            (item.excerpt && item.excerpt.rendered) ||
            '';
          if (corpoHtml) {
            const regexHrefJson = /href=["']([^"']+)["']/gi;
            let mJson;
            while ((mJson = regexHrefJson.exec(corpoHtml)) !== null) {
              registrarUrl(mJson[1], `${titulo} remume`);
            }
          }
        }
      } catch (_e) {
        // Segue para extração regex em HTML
      }
    }

    // 2. Extrai tags <a href="...">texto</a> do HTML
    const regexAnchor = /<a\b[^>]*href=["']([^"'#>]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = regexAnchor.exec(htmlOuJson)) !== null) {
      const href = match[1];
      const textoAncora = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      registrarUrl(href, textoAncora);
    }

    // 3. Extrai URLs diretas de PDFs mencionadas no código-fonte da página (ex: embeds, iframes, scripts)
    const regexPdfDireto = /https?:\/\/[^"'\s<>]+\.pdf(?:\?[^"'\s<>]*)?/gi;
    while ((match = regexPdfDireto.exec(htmlOuJson)) !== null) {
      registrarUrl(match[0], 'documento pdf');
    }

    return Array.from(linksPontuados.entries())
      .map(([url, score]) => ({ url, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  },

  /**
   * Busca dinamicamente URLs oficiais candidatas para a REMUME do município.
   * Arquitetura em Camadas:
   *  1. Catálogo local `fontes_oficiais.json` (se existir).
   *  2. Gerador determinístico de domínios municipais `.gov.br` + Crawler de 1 nível em subpáginas.
   *  3. Fallback em múltiplos motores de busca públicos (Brave, Yahoo BR, Bing, DuckDuckGo Lite).
   * @private
   */
  async _buscarUrlsCandidatasGovBr(municipio, uf) {
    const candidatas = [];
    const urlsVistas = new Set();

    const adicionarCandidata = (url, opcoes = {}) => {
      if (!url || typeof url !== 'string') return;
      const limpa = url.trim().replace(/[).,;'"<>]+$/, '');
      if (!this._ehUrlOficialConfiavel(limpa)) return;
      if (urlsVistas.has(limpa)) return;
      urlsVistas.add(limpa);
      candidatas.push({
        url: limpa,
        fonte: opcoes.fonte || null,
        contextoTerritorial: opcoes.contextoTerritorial || `${municipio} - ${uf}`,
        respostaHttp: opcoes.respostaHttp || null,
        nivel: opcoes.nivel || 0,
        prioridade: opcoes.prioridade || 5
      });
    };

    // Camada 1: Verifica catálogo opcional fontes_oficiais.json caso exista em disco
    const mapaFontesPath = path.join(__dirname, 'fontes_oficiais.json');
    const mapaFontes = lerJsonSeguro(mapaFontesPath, null);
    const slug = gerarSlugMunicipio(municipio, uf);
    if (mapaFontes && mapaFontes[slug] && mapaFontes[slug].url) {
      adicionarCandidata(mapaFontes[slug].url, {
        fonte: mapaFontes[slug].fonte,
        prioridade: 20
      });
    }

    // Camada 2: Sondagem direta dos domínios oficiais da Prefeitura (.gov.br) + Subpáginas de Saúde
    await this._rastrearPortalMunicipalGovBr(municipio, uf, adicionarCandidata);

    // Camada 3: Fallback Multi-Buscador (Brave, Yahoo BR, Bing, DDG Lite) se ainda houver poucas candidatas
    if (candidatas.length < 6) {
      await this._buscarEmMotoresDeBuscaPublicos(municipio, uf, adicionarCandidata);
    }

    candidatas.sort((a, b) => (b.prioridade || 0) - (a.prioridade || 0));
    return candidatas;
  },

  /**
   * Sonda os domínios determinísticos `.gov.br` do município e varre subpáginas de saúde/REMUME.
   * @private
   */
  async _rastrearPortalMunicipalGovBr(municipio, uf, adicionarCandidata) {
    const dominiosProvaveis = this._gerarDominiosOficiaisMunicipio(municipio, uf);
    if (dominiosProvaveis.length === 0) return;

    // Testa os domínios principais em paralelo com timeout curto para achar o portal ativo da prefeitura
    const loteDominios = dominiosProvaveis.slice(0, 6);
    const sondagens = await Promise.allSettled(
      loteDominios.map((domUrl) => this._httpGetBufferSeguro(domUrl, 3200, 3))
    );

    const portaisAtivos = [];
    for (let i = 0; i < sondagens.length; i++) {
      const resultado = sondagens[i];
      if (
        resultado.status === 'fulfilled' &&
        resultado.value &&
        resultado.value.buffer &&
        resultado.value.buffer.length > 200
      ) {
        const resp = resultado.value;
        const urlAtiva = resp.finalUrl || loteDominios[i];
        if (!this._ehUrlOficialConfiavel(urlAtiva)) continue;

        let origemBase = '';
        try {
          origemBase = new URL(urlAtiva).origin;
        } catch (_e) {
          origemBase = loteDominios[i];
        }

        if (!portaisAtivos.includes(origemBase)) {
          portaisAtivos.push(origemBase);
        }

        // Extrai links de 1º nível já presentes na página inicial da prefeitura
        const htmlInicial = resp.buffer.toString('utf8');
        const linksHome = this._extrairLinksInternosRelevantes(htmlInicial, urlAtiva, municipio);
        for (const lk of linksHome) {
          adicionarCandidata(lk.url, {
            fonte: `Portal Oficial da Prefeitura de ${municipio} - ${uf} (${origemBase})`,
            prioridade: lk.score,
            nivel: 1
          });
        }
      }
    }

    // Se encontrou pelo menos 1 portal municipal oficial ativo (ex: https://www.garrafaodonorte.pa.gov.br),
    // sonda os endpoints de REMUME / Saúde / WP-JSON desse portal
    const basePrincipal = portaisAtivos[0];
    if (basePrincipal) {
      const subcaminhos = this._gerarSubcaminhosSaude().slice(0, 16);
      const promessasSub = subcaminhos.map(async (sub) => {
        const urlSub = `${basePrincipal}${sub.path}`;
        const respSub = await this._httpGetBufferSeguro(urlSub, 3500, 2);
        if (!respSub || !respSub.buffer || respSub.buffer.length < 100) return;

        const textoSub = respSub.buffer.toString('utf8');
        if (this._ehPaginaBloqueioOuCaptcha(textoSub)) return;

        // Registra a própria subpágina (pode conter a tabela de medicamentos diretamente)
        adicionarCandidata(respSub.finalUrl || urlSub, {
          fonte: `Secretaria Municipal de Saúde de ${municipio} - ${uf} (${basePrincipal})`,
          respostaHttp: respSub,
          prioridade: sub.prioridade,
          nivel: 0
        });

        // E extrai links internos (ex: PDF da REMUME listado na página ou no WP-JSON)
        const linksExtraidos = this._extrairLinksInternosRelevantes(
          textoSub,
          respSub.finalUrl || urlSub,
          municipio
        );
        for (const lk of linksExtraidos) {
          adicionarCandidata(lk.url, {
            fonte: `Secretaria Municipal de Saúde de ${municipio} - ${uf} (${basePrincipal})`,
            prioridade: lk.score + 5,
            nivel: 1
          });
        }
      });

      await Promise.allSettled(promessasSub);
    }
  },

  /**
   * Consulta múltiplos motores de busca públicos (Brave Search, Yahoo Brasil, Bing e DuckDuckGo Lite)
   * com detecção automática de bloqueio/CAPTCHA e extração de links `.gov.br`.
   * @private
   */
  async _buscarEmMotoresDeBuscaPublicos(municipio, uf, adicionarCandidata) {
    const queryRemume = `site:gov.br REMUME "${municipio}" "${uf}"`;
    const queryRelacao = `site:gov.br "Relação Municipal de Medicamentos" "${municipio}" "${uf}"`;

    const provedoresBusca = [
      `https://search.brave.com/search?q=${encodeURIComponent(queryRemume)}&source=web`,
      `https://br.search.yahoo.com/search?p=${encodeURIComponent(queryRemume)}`,
      `https://www.bing.com/search?q=${encodeURIComponent(queryRemume)}&setlang=pt-BR`,
      `https://br.search.yahoo.com/search?p=${encodeURIComponent(queryRelacao)}`,
      `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(queryRemume)}`,
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(queryRemume)}`
    ];

    for (const searchUrl of provedoresBusca) {
      const resp = await this._httpGetBufferSeguro(searchUrl, 4000, 2);
      if (!resp || !resp.buffer) continue;

      const htmlBusca = resp.buffer.toString('utf8');
      if (this._ehPaginaBloqueioOuCaptcha(htmlBusca)) {
        continue;
      }

      const linksExtraidos = this._extrairUrlsDeHtmlDeBusca(htmlBusca);
      let adicionadosNesteMotor = 0;
      for (const link of linksExtraidos) {
        if (this._ehUrlOficialConfiavel(link)) {
          const ehPdf = /\.pdf(?:$|\?)/i.test(link);
          adicionarCandidata(link, {
            prioridade: ehPdf ? 14 : 10,
            nivel: 0
          });
          adicionadosNesteMotor++;
        }
      }

      if (adicionadosNesteMotor >= 4) {
        break;
      }
    }
  },

  /**
   * Detecta páginas de bloqueio de botnet, CAPTCHA ou WAF (DuckDuckGo Anomaly, Cloudflare, etc.).
   * @param {string} html
   * @returns {boolean}
   */
  _ehPaginaBloqueioOuCaptcha(html) {
    if (!html || typeof html !== 'string') return false;
    return (
      html.includes('anomaly-modal') ||
      html.includes('bots use DuckDuckGo too') ||
      html.includes('cf-browser-verification') ||
      html.includes('challenge-platform') ||
      html.includes('g-recaptcha') && html.length < 4000
    );
  },

  /**
   * Extrai links reais (incluindo redirecionamentos codificados uddg= do DDG e RU= do Yahoo)
   * de uma página HTML de busca.
   * @private
   */
  _extrairUrlsDeHtmlDeBusca(html) {
    if (!html || typeof html !== 'string') return [];
    const encontrados = [];

    // 1. Extrai parâmetros uddg= (padrão DuckDuckGo HTML/Lite)
    const regexUddg = /[?&]uddg=([^&"'\s>]+)/gi;
    let match;
    while ((match = regexUddg.exec(html)) !== null) {
      try {
        const decoded = decodeURIComponent(match[1]);
        if (decoded.startsWith('http')) {
          encontrados.push(decoded);
        }
      } catch (_e) {
        // Ignora URI malformada
      }
    }

    // 2. Extrai redirecionamentos RU=.../RK= (padrão Yahoo Search)
    const regexYahooRu = /\/RU=([^/]+)\/RK=/gi;
    while ((match = regexYahooRu.exec(html)) !== null) {
      try {
        const decoded = decodeURIComponent(match[1]);
        if (decoded.startsWith('http')) {
          encontrados.push(decoded);
        }
      } catch (_e) {
        // Ignora URI malformada
      }
    }

    // 3. Extrai atributos href="https://..." diretos (Brave, Bing, DDG, Google)
    const regexHref = /href=["'](https?:\/\/[^"'\s>]+)["']/gi;
    const dominiosBuscadores =
      /(?:duckduckgo\.com|yahoo\.com|bing\.com|microsoft\.com|brave\.com|google\.com|cloudflare\.com)/i;

    while ((match = regexHref.exec(html)) !== null) {
      const url = match[1].replace(/&amp;/g, '&');
      if (!dominiosBuscadores.test(url)) {
        encontrados.push(url);
      }
    }

    return encontrados;
  },

  /**
   * Extrai texto limpo a partir de um Buffer HTTP (suporta HTML, Texto/CSV e PDF binário).
   * @private
   */
  async _extrairTextoDeBuffer(buffer, contentType = '', urlStr = '') {
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) return '';

    const ctLower = String(contentType || '').toLowerCase();
    const urlLower = String(urlStr || '').toLowerCase();
    const cabecalhoAscii = buffer.subarray(0, 8).toString('ascii');

    const ehPdf =
      ctLower.includes('application/pdf') ||
      urlLower.endsWith('.pdf') ||
      cabecalhoAscii.startsWith('%PDF-');

    if (ehPdf) {
      return await this._extrairTextoDePdfBuffer(buffer);
    }

    // Decodificação resiliente UTF-8 com fallback automático para Latin1 (ISO-8859-1)
    let texto = buffer.toString('utf8');
    const totalReplacementChars = (texto.match(/\uFFFD/g) || []).length;
    if (totalReplacementChars > 5 || ctLower.includes('iso-8859-1') || ctLower.includes('latin1')) {
      texto = buffer.toString('latin1');
    }

    if (ctLower.includes('text/html') || /<(?:!doctype|html|head|body|table|div|p)\b/i.test(texto)) {
      return this._limparHtmlParaTexto(texto);
    }

    return texto;
  },

  /**
   * Converte HTML em texto estruturado linha a linha.
   * ARQUITETURA CIRÚRGICA: Processa cada linha de tabela <tr>...</tr> atomicamente ANTES
   * de quebrar blocos <p> ou <div>, garantindo que tags internas dentro de <td> jamais
   * separem o nome do medicamento da sua unidade/apresentação/categoria.
   * @private
   */
  _limparHtmlParaTexto(html) {
    if (!html || typeof html !== 'string') return '';

    let limpo = html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ');

    // 1. Extração atômica de linhas de tabela <tr>...</tr>:
    // Dentro de uma célula <td> ou <th>, tags <p>, <div>, <br>, <span> viram espaço simples (' '),
    // mantendo todas as colunas daquela linha unidas por ' ; ' em uma única linha textual.
    limpo = limpo.replace(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi, (_matchTr, conteudoTr) => {
      const celulas = [];
      const regexCelula = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let matchCel;

      while ((matchCel = regexCelula.exec(conteudoTr)) !== null) {
        const textoCelula = matchCel[1]
          .replace(/<[^>]+>/g, ' ')
          .replace(/[\r\n\t]+/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim();
        if (textoCelula) {
          celulas.push(textoCelula);
        }
      }

      if (celulas.length === 0) return '\n';
      return `\n${celulas.join(' ; ')}\n`;
    });

    // 2. Para conteúdos fora de tabelas (listas, parágrafos soltos), mantém quebras normais
    limpo = limpo
      .replace(/<\/t[dh]>/gi, ' ; ')
      .replace(/<\/(?:tr|p|div|li|h[1-6]|section|article|header|footer)>/gi, '\n')
      .replace(/<(?:br|hr)\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ');

    // Decodifica entidades HTML farmacológicas e acentuação brasileira
    const mapaEntidades = {
      '&nbsp;': ' ',
      '&amp;': '&',
      '&quot;': '"',
      '&#39;': "'",
      '&lt;': '<',
      '&gt;': '>',
      '&ndash;': '-',
      '&mdash;': '-',
      '&bull;': '•',
      '&micro;': 'mcg',
      '&deg;': '°',
      '&ordm;': 'º',
      '&ordf;': 'ª',
      '&aacute;': 'á',
      '&eacute;': 'é',
      '&iacute;': 'í',
      '&oacute;': 'ó',
      '&uacute;': 'ú',
      '&atilde;': 'ã',
      '&otilde;': 'õ',
      '&acirc;': 'â',
      '&ecirc;': 'ê',
      '&ocirc;': 'ô',
      '&agrave;': 'à',
      '&ccedil;': 'ç',
      '&Aacute;': 'Á',
      '&Eacute;': 'É',
      '&Iacute;': 'Í',
      '&Oacute;': 'Ó',
      '&Uacute;': 'Ú',
      '&Atilde;': 'Ã',
      '&Otilde;': 'Õ',
      '&Acirc;': 'Â',
      '&Ecirc;': 'Ê',
      '&Ocirc;': 'Ô',
      '&Ccedil;': 'Ç'
    };

    limpo = limpo.replace(/&[a-zA-Z0-9#]+;/g, (entidade) => {
      if (mapaEntidades[entidade] !== undefined) return mapaEntidades[entidade];
      const matchDec = /^&#(\d+);$/.exec(entidade);
      if (matchDec) {
        const code = parseInt(matchDec[1], 10);
        return code > 0 && code < 65535 ? String.fromCharCode(code) : ' ';
      }
      const matchHex = /^&#x([0-9a-fA-F]+);$/.exec(entidade);
      if (matchHex) {
        const code = parseInt(matchHex[1], 16);
        return code > 0 && code < 65535 ? String.fromCharCode(code) : ' ';
      }
      return ' ';
    });

    return limpo
      .split(/\r?\n/)
      .map((l) => l.replace(/\s+/g, ' ').replace(/^(?:\s*;\s*)+|(?:\s*;\s*)+$/g, '').trim())
      .filter(Boolean)
      .join('\n');
  },

  /**
   * Extrai texto de um Buffer PDF em Node.js 20+.
   * Tenta usar `pdf-parse` se instalado; caso contrário, utiliza extrator nativo
   * baseado em descompressão `zlib` (FlateDecode) e operadores de texto PDF (`Tj`, `TJ`),
   * preservando colunas horizontais de tabelas na mesma linha.
   * @private
   */
  async _extrairTextoDePdfBuffer(buffer) {
    if (!buffer || !Buffer.isBuffer(buffer)) return '';

    // 1. Tenta biblioteca `pdf-parse` caso esteja presente no node_modules
    try {
      const pdfParse = require('pdf-parse');
      if (typeof pdfParse === 'function') {
        const parsed = await pdfParse(buffer);
        if (parsed && typeof parsed.text === 'string' && parsed.text.trim().length > 100) {
          return parsed.text;
        }
      }
    } catch (_e) {
      // Continua para o extrator nativo puro Node.js (zlib FlateDecode)
    }

    // 2. Extrator nativo puro Node.js para streams PDF (FlateDecode e texto plano)
    const rawLatin1 = buffer.toString('latin1');
    const blocosTexto = [];

    const extrairOperadoresTextoPdf = (conteudoStream) => {
      const linhas = [];
      let linhaAtual = [];

      // Captura literais (...) Tj, arrays [...] TJ, deslocamentos x y Td/TD e quebras T*/ET
      const regexToken =
        /\((?:\\.|[^\\()])*\)\s*(?:Tj|'|")|\[((?:\\.|[^\]])*)\]\s*TJ|(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(Td|TD)|\b(T\*|ET)\b/g;
      let m;
      while ((m = regexToken.exec(conteudoStream)) !== null) {
        const tokenCompleto = m[0];
        const arrayTj = m[1];
        const dyStr = m[3];
        const opTd = m[4];
        const operadorQuebra = m[5];

        if (operadorQuebra) {
          if (linhaAtual.length > 0) {
            linhas.push(linhaAtual.join(' ').replace(/\s+/g, ' ').trim());
            linhaAtual = [];
          }
          continue;
        }

        if (opTd) {
          const dy = parseFloat(dyStr || '0');
          // Se |dy| < 2, é apenas deslocamento horizontal de coluna na mesma linha da tabela
          if (Math.abs(dy) >= 2) {
            if (linhaAtual.length > 0) {
              linhas.push(linhaAtual.join(' ').replace(/\s+/g, ' ').trim());
              linhaAtual = [];
            }
          } else if (linhaAtual.length > 0) {
            linhaAtual.push(' ; ');
          }
          continue;
        }

        if (arrayTj !== undefined) {
          const partes = [];
          const regexLiteral = /\(((?:\\.|[^\\()])*)\)/g;
          let ml;
          while ((ml = regexLiteral.exec(arrayTj)) !== null) {
            partes.push(this._decodificarLiteralPdf(ml[1]));
          }
          if (partes.length > 0) {
            linhaAtual.push(partes.join(''));
          }
        } else {
          const idxFecha = tokenCompleto.lastIndexOf(')');
          if (tokenCompleto.startsWith('(') && idxFecha > 0) {
            const interior = tokenCompleto.slice(1, idxFecha);
            linhaAtual.push(this._decodificarLiteralPdf(interior));
          }
        }
      }

      if (linhaAtual.length > 0) {
        linhas.push(linhaAtual.join(' ').replace(/\s+/g, ' ').trim());
      }
      return linhas.filter((l) => l.length >= 3).join('\n');
    };

    // Localiza todos os blocos stream ... endstream no PDF
    let cursor = 0;
    while (cursor < rawLatin1.length) {
      const idxStream = rawLatin1.indexOf('stream', cursor);
      if (idxStream === -1) break;

      const idxEndStream = rawLatin1.indexOf('endstream', idxStream + 6);
      if (idxEndStream === -1) break;

      let inicioDados = idxStream + 6;
      if (rawLatin1[inicioDados] === '\r' && rawLatin1[inicioDados + 1] === '\n') {
        inicioDados += 2;
      } else if (rawLatin1[inicioDados] === '\n' || rawLatin1[inicioDados] === '\r') {
        inicioDados += 1;
      }

      const fatiaBuffer = buffer.subarray(inicioDados, idxEndStream);
      let textoStream = '';

      // Tenta descompactar via zlib (FlateDecode padrão de PDFs modernos)
      try {
        const descompactado = zlib.unzipSync(fatiaBuffer);
        textoStream = descompactado.toString('latin1');
      } catch (_zErr1) {
        try {
          const descompactadoRaw = zlib.inflateSync(fatiaBuffer);
          textoStream = descompactadoRaw.toString('latin1');
        } catch (_zErr2) {
          textoStream = fatiaBuffer.toString('latin1');
        }
      }

      if (textoStream && (textoStream.includes('Tj') || textoStream.includes('TJ'))) {
        const extraido = extrairOperadoresTextoPdf(textoStream);
        if (extraido) blocosTexto.push(extraido);
      }

      cursor = idxEndStream + 9;
    }

    return blocosTexto.join('\n');
  },

  /**
   * Decodifica sequências de escape e octais de strings literais de PDFs.
   * @private
   */
  _decodificarLiteralPdf(str) {
    if (!str) return '';
    return str
      .replace(/\\(\d{1,3})/g, (_m, octal) => String.fromCharCode(parseInt(octal, 8)))
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, ' ')
      .replace(/\\t/g, ' ')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\');
  },

  /**
   * Retorna headers HTTP realistas de navegador moderno (pt-BR) para evitar bloqueios de WAF
   * em portais governamentais e motores de busca.
   * @private
   */
  _obterHeadersNavegadorRealista() {
    return {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,application/json,text/plain;q=0.8,*/*;q=0.7',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    };
  },

  /**
   * Descomprime buffers HTTP codificados com gzip, deflate ou brotli.
   * @private
   */
  _descomprimirBufferHttp(buffer, contentEncoding = '') {
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) return buffer;
    const enc = String(contentEncoding || '').toLowerCase().trim();
    if (!enc) return buffer;

    try {
      if (enc.includes('gzip') || enc.includes('x-gzip')) {
        return zlib.gunzipSync(buffer);
      }
      if (enc.includes('deflate')) {
        try {
          return zlib.inflateSync(buffer);
        } catch (_e) {
          return zlib.inflateRawSync(buffer);
        }
      }
      if (enc.includes('br') && typeof zlib.brotliDecompressSync === 'function') {
        return zlib.brotliDecompressSync(buffer);
      }
    } catch (_err) {
      // Caso o servidor tenha enviado header incorreto mas corpo já descomprimido
      return buffer;
    }
    return buffer;
  },

  /**
   * Realiza requisição HTTP/HTTPS GET retornando Buffer binário descomprimido, Content-Type e URL final,
   * com headers realistas de navegador, suporte a redirecionamentos, descompressão gzip/br e
   * fallback seguro de cadeia TLS ICP-Brasil restrito a domínios `.gov.br`.
   * @private
   */
  _httpGetBufferSeguro(urlStr, timeoutMs = 5000, maxRedirects = 3, permitirTlsGovBr = false) {
    return new Promise((resolve) => {
      try {
        if (!urlStr || typeof urlStr !== 'string') return resolve(null);
        const parsedUrl = new URL(urlStr);
        const isHttps = parsedUrl.protocol === 'https:';
        const client = isHttps ? https : http;

        const opcoesReq = {
          timeout: timeoutMs,
          headers: this._obterHeadersNavegadorRealista()
        };

        if (isHttps && permitirTlsGovBr && /\.(?:gov|leg)\.br$/i.test(parsedUrl.hostname)) {
          opcoesReq.rejectUnauthorized = false;
        }

        const req = client.get(parsedUrl, opcoesReq, (res) => {
          const status = res.statusCode || 0;

          // Segue redirecionamentos HTTP (301, 302, 303, 307, 308)
          if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
            res.resume();
            if (maxRedirects <= 0) return resolve(null);
            try {
              const nextUrl = new URL(res.headers.location, parsedUrl).toString();
              return resolve(
                this._httpGetBufferSeguro(
                  nextUrl,
                  timeoutMs,
                  maxRedirects - 1,
                  permitirTlsGovBr
                )
              );
            } catch (_redirErr) {
              return resolve(null);
            }
          }

          if (status < 200 || status >= 300) {
            res.resume();
            return resolve(null);
          }

          const chunks = [];
          let totalBytes = 0;
          const LIMITE_BYTES = 8 * 1024 * 1024; // 8 MB máx

          res.on('data', (chunk) => {
            if (totalBytes < LIMITE_BYTES) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
              totalBytes += chunk.length;
            }
          });

          res.on('end', () => {
            const rawBuffer = Buffer.concat(chunks);
            const bufferFinal = this._descomprimirBufferHttp(
              rawBuffer,
              res.headers['content-encoding']
            );
            resolve({
              buffer: bufferFinal,
              contentType: String(res.headers['content-type'] || ''),
              statusCode: status,
              finalUrl: parsedUrl.toString()
            });
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve(null);
        });

        req.on('error', (err) => {
          const codigoErro = String((err && err.code) || '');
          const erroCertificado =
            codigoErro.includes('CERT') ||
            codigoErro.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE') ||
            codigoErro.includes('SELF_SIGNED');

          // Portais de prefeituras (.gov.br) frequentemente possuem cadeia intermediária ICP-Brasil incompleta
          if (
            isHttps &&
            !permitirTlsGovBr &&
            erroCertificado &&
            /\.(?:gov|leg)\.br$/i.test(parsedUrl.hostname)
          ) {
            return resolve(
              this._httpGetBufferSeguro(urlStr, timeoutMs, maxRedirects, true)
            );
          }
          resolve(null);
        });
      } catch (_e) {
        resolve(null);
      }
    });
  },

  /**
   * Realiza requisição HTTP/HTTPS GET de texto com timeout curto (mantido por retrocompatibilidade).
   * @private
   */
  async _httpGetTextoSeguro(urlStr, timeoutMs = 4500) {
    const resp = await this._httpGetBufferSeguro(urlStr, timeoutMs, 3);
    if (!resp || !resp.buffer) return null;
    return await this._extrairTextoDeBuffer(resp.buffer, resp.contentType, resp.finalUrl || urlStr);
  },

  /**
   * Pesquisa inteligente Multi-Token de disponibilidade de medicamentos no catálogo ativo.
   * Suporta buscas como "amoxi clav", "losartana 50", "dipirona gotas", ignorando sais irrelevantes
   * e tolerando tanto catálogo de strings quanto catálogo de objetos.
   * @param {string} termoMedicamento
   * @param {string} [chatIdOuSlug]
   * @returns {{ disponivel: boolean, correspondencias: Array<string>, catalogo: object }}
   */
  consultarDisponibilidade(termoMedicamento, chatIdOuSlug) {
    const catalogo = this.obterCatalogoAtivo(chatIdOuSlug);
    const STOPWORDS_SAIS = new Set([
      'de', 'da', 'do', 'com', 'para', 'em', 'uso', 'sodica', 'sodico',
      'potassica', 'potassico', 'cloridrato', 'sulfato', 'maleato',
      'besilato', 'succinato', 'tartarato', 'fumarato', 'bromidrato', 'monoidratada'
    ]);

    const termoNorm = normalizarAscii(String(termoMedicamento || ''))
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!termoNorm || termoNorm.length < 2) {
      return { disponivel: false, correspondencias: [], catalogo };
    }

    const tokensBrutos = termoNorm.split(' ').filter((t) => t.length >= 2 || /\d/.test(t));
    const tokensBusca = tokensBrutos.filter((t) => !STOPWORDS_SAIS.has(t));
    const tokensEfetivos = tokensBusca.length > 0 ? tokensBusca : tokensBrutos;

    // Sinônimos rápidos comuns no plantão e na atenção básica
    const MAPA_SINONIMOS = {
      aas: 'acido acetilsalicilico',
      hctz: 'hidroclorotiazida',
      smz: 'sulfametoxazol',
      tmp: 'trimetoprima',
      bactrim: 'sulfametoxazol',
      benzetacil: 'benzilpenicilina benzatina',
      plasil: 'metoclopramida',
      buscopan: 'escopolamina',
      lasix: 'furosemida',
      capoten: 'captopril',
      marevan: 'varfarina',
      puran: 'levotiroxina'
    };

    const tokensExpandidos = tokensEfetivos.map((tk) => MAPA_SINONIMOS[tk] || tk);
    const resultadosPontuados = [];

    for (const itemBruto of catalogo.itens || []) {
      const itemStr =
        typeof itemBruto === 'string'
          ? itemBruto
          : [itemBruto.principio_ativo || itemBruto.nome || '', itemBruto.apresentacao || '']
              .filter(Boolean)
              .join(' - ');

      const itemNorm = normalizarAscii(itemStr)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      let todosTokensPresentes = true;
      let score = 0;

      for (const tk of tokensExpandidos) {
        if (itemNorm.includes(tk)) {
          score += itemNorm.startsWith(tk) ? 3 : 1;
        } else {
          todosTokensPresentes = false;
          break;
        }
      }

      if (todosTokensPresentes) {
        resultadosPontuados.push({ item: itemStr, score });
      }
    }

    resultadosPontuados.sort((a, b) => b.score - a.score || a.item.localeCompare(b.item));
    const correspondencias = resultadosPontuados.map((r) => r.item);

    return {
      disponivel: correspondencias.length > 0,
      correspondencias,
      catalogo
    };
  }
};

// Exporta para uso global em server/runtime.js e CommonJS padrão
if (typeof global !== 'undefined') {
  global.CatalogoRemumeService = CatalogoRemumeService;
}
if (typeof window !== 'undefined') {
  window.CatalogoRemumeService = CatalogoRemumeService;
}

module.exports = CatalogoRemumeService;
module.exports.CatalogoRemumeService = CatalogoRemumeService;
module.exports.gerarSlugMunicipio = gerarSlugMunicipio;
module.exports.extrairMunicipioEUf = extrairMunicipioEUf;