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
 * 4. importarEPromoverRemume(opcoes) -> Importa, valida (>= 5 itens) e promove automaticamente
 *    para preset global (presets/<slug>.json + manifest.json) e ativa no perfil do usuário.
 * 5. buscarRemumeNaWeb(municipio, uf, chatId) -> Verifica preset existente ou busca fonte oficial
 *    verificável com trava Anti-Alucinação (Zero Invenção), mantendo RENAME Nacional por segurança
 *    caso não exista documento oficial verificável.
 * ============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const PRESETS_DIR = path.join(__dirname, 'presets');
const MANIFEST_PATH = path.join(PRESETS_DIR, 'manifest.json');
const DEFAULT_SLUG = 'rename_nacional';

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
    verificado: raw.verificado !== undefined ? Boolean(raw.verificado) : (slug === DEFAULT_SLUG || slug === 'sp_ribeirao_preto'),
    atualizado_em: raw.atualizado_em || new Date().toISOString(),
    total_itens: itens.length,
    itens
  };
}

const CatalogoRemumeService = {
  /**
   * Expõe utilitário de geração de slug.
   */
  gerarSlugMunicipio,

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
        const arquivos = fs.readdirSync(PRESETS_DIR).filter((f) => f.endsWith('.json') && f !== 'manifest.json');
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
   * Busca um preset no manifesto/disco a partir do nome da cidade e UF (ou slug).
   * @param {string} municipioOuSlug
   * @param {string} [uf]
   * @returns {object|null}
   */
  buscarPresetPorCidade(municipioOuSlug, uf) {
    if (!municipioOuSlug) return null;
    const slugBusca = uf
      ? gerarSlugMunicipio(municipioOuSlug, uf)
      : String(municipioOuSlug).includes('_')
      ? String(municipioOuSlug).trim().toLowerCase()
      : gerarSlugMunicipio(municipioOuSlug, '');

    const presets = this.listarPresets();
    const normMun = normalizarAscii(String(municipioOuSlug)).toLowerCase();
    const normUf = uf ? String(uf).trim().toUpperCase() : '';

    for (const p of presets) {
      if (!p) continue;
      const pSlug = p.slug || p.remume_id || '';
      if (pSlug === slugBusca) {
        return { ...p, slug: pSlug };
      }
      const pMun = normalizarAscii(String(p.municipio || '')).toLowerCase();
      if (pMun && pMun === normMun && (!normUf || String(p.uf || '').toUpperCase() === normUf)) {
        return { ...p, slug: pSlug || gerarSlugMunicipio(p.municipio, p.uf) };
      }
    }

    if (this.existePresetLocal(slugBusca)) {
      const cat = this.obterCatalogoAtivo(slugBusca);
      if (cat && cat.slug === slugBusca) {
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
      const slugCtx = farmacopeia.remume_id || farmacopeia.preset_id || contextoUsuario.remume_slug || localidade.municipio_slug || DEFAULT_SLUG;
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

          // Se o usuário possui itens customizados salvos diretamente no contexto e sem preset global
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
            nome_exibicao: farmacopeia.nome_exibicao || `REMUME ${munNome}${ufSigla ? ' - ' + ufSigla : ''}`,
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
        if (
          catalogoCs &&
          Array.isArray(catalogoCs.itens) &&
          catalogoCs.itens.length > 0
        ) {
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
   * Parser determinístico + higienização de listas de medicamentos vindas de CSV, JSON
   * ou texto bruto copiado de PDFs de prefeituras.
   *
   * Filtra linhas vazias, cabeçalhos genéricos ("Medicamento", "Página 1",
   * "Secretaria Municipal", números isolados, datas) e mantém apenas linhas que
   * contenham nome farmacológico + concentração/apresentação válida.
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
      if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
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

      // Caso 3: Texto bruto (PDF copiado, CSV, TSV ou lista textual)
      linhasCandidatas = trimmed.split(/\r?\n/);
    } else {
      return [];
    }

    // Expressões regulares para validação farmacológica determinística
    const regexUnidadeDosagem =
      /\b\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?\s*(?:mg|mcg|ug|µg|g|kg|ml|l|ui|u\.i\.|%|meq|mmol|mg\/ml|mcg\/ml|mg\/g|ui\/ml|mg\/dose|mcg\/dose)\b/i;

    const regexFormaFarmaceutica =
      /\b(?:comprimido|comprimidos|comp\b|cápsula|capsula|cápsulas|capsulas|caps\b|drágea|dragea|ampola|ampolas|amp\b|frasco|frasco-ampola|xarope|suspensão|suspensao|solução|solucao|gotas|pomada|creme|gel\b|loção|locao|adesivo|pó\s+para|po\s+para|injetável|injetavel|spray|aerossol|inalante|inalatório|inalatorio|colírio|colirio|supositório|supositorio|óvulo|ovulo|bisnaga|sachê|sache|envelope|seringa|caneta|implante|sistema\s+terapêutico|pastilha|elix|elixir|enema|granulado)\b/i;

    // Cabeçalhos e ruídos institucionais que devem ser descartados
    const regexRuidoInstitucional =
      /^(?:p[áa]gina\s*\d+|prefeitura\s+municipal|secretaria\s+(?:municipal|estadual)\s+de\s+sa[úu]de|rela[çc][ãa]o\s+(?:municipal|nacional)\s+de\s+medicamentos|remume\b|rename\b|sum[áa]rio\b|[íi]ndice\b|anexo\s+[ivx\d]+|portaria\s+n|decreto\s+n|resolu[çc][ãa]o\s+n|cnpj\b|endere[çc]o\b|telefone\b|www\.|https?:\/\/|c[óo]digo\s+descri[çc][ãa]o|item\s+medicamento|princ[íi]pio\s+ativo\s+concentra[çc][ãa]o|lista\s+de\s+medicamentos|atualizado\s+em|data\s+de\s+publica[çc][ãa]o|coordena[çc][ãa]o\s+de\s+assist[êe]ncia)/i;

    const regexApenasDataOuNumero =
      /^(?:\d{1,4}[./-]\d{1,2}[./-]\d{2,4}|\d+(?:[.,]\d+)?|\W+)$/;

    const itensHigienizados = [];
    const vistos = new Set();

    for (let linha of linhasCandidatas) {
      if (typeof linha !== 'string') continue;

      // Remove caracteres de controle e múltiplos espaços
      linha = linha.replace(/[\u0000-\u001F\u007F]+/g, ' ').trim();
      if (!linha || linha.length < 5 || linha.length > 260) continue;

      // Se for linha de CSV/TSV separada por ";" ou "|" ou "\t", converte colunas relevantes
      if (linha.includes(';') || linha.includes('|') || linha.includes('\t')) {
        const delimitador = linha.includes(';') ? ';' : linha.includes('|') ? '|' : '\t';
        const colunas = linha
          .split(delimitador)
          .map((c) => c.replace(/^["']+|["']+$/g, '').trim())
          .filter(Boolean)
          // Remove colunas que são apenas códigos numéricos internos (ex: "00123", "BR0267312")
          .filter((c) => !/^(?:BR\d+|\d{1,8}|SIM|NÃO|NAO|ATIVO|INATIVO|BÁSICO|BASICO|CBAF)$/i.test(c));

        linha = colunas.join(' - ');
      }

      // Remove numeração inicial de listas/tabelas (ex: "1.", "01 - ", "104) ", "• ")
      linha = linha
        .replace(/^(?:[\d]{1,5}\s*[.)-]\s*|[-•*▪▸►]+\s*)/, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

      if (!linha || linha.length < 5) continue;

      // Filtra cabeçalhos genéricos, rodapés e datas
      if (regexRuidoInstitucional.test(linha)) continue;
      if (regexApenasDataOuNumero.test(linha)) continue;
      if (/^(?:medicamento|apresenta[çc][ãa]o|concentra[çc][ãa]o|forma\s+farmac[êe]utica|unidade|observa[çc][ãa]o)$/i.test(linha)) {
        continue;
      }

      // Verifica se possui nome farmacológico (pelo menos uma palavra alfabética >= 3 letras)
      const temNomeFarmaco = /[a-zA-ZÀ-ÿ]{3,}/.test(linha);
      if (!temNomeFarmaco) continue;

      // Verifica se possui concentração/dosagem válida OU forma farmacêutica válida
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
   * 4. importarEPromoverRemume(opcoes)
   * - Recebe { chatId, municipio, uf, conteudoBruto, itens, fonte, urlOficial }.
   * - Extrai/valida os itens.
   * - REGRA DE OURO DO USUÁRIO: Se tiver pelo menos 5 itens válidos, chama
   *   ConfigService.promoverRemumeParaPresetGlobal(...) para que essa cidade entre
   *   AUTOMATICAMENTE nos presets globais (src/data/remumes/presets/<slug>.json e manifest.json)
   *   para todos os próximos usuários!
   * - Se chatId foi passado, atualiza automaticamente o perfil daquele chatId
   *   (ConfigService.salvarContextoClinico) para usar o novo preset recém-criado!
   *
   * @param {object} opcoes
   * @returns {object}
   */
  importarEPromoverRemume(opcoesOuMun = {}, ufArg = '', conteudoArg = '', fonteArg = '', chatIdArg = '') {
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
    // mesmo se ConfigService não tiver gravado ou ainda não estiver inicializado
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

      const idxExistente = listaPresets.findIndex((p) => p && (p.slug === slug || p.remume_id === slug));
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
   * - Se não existir localmente, realiza busca web verificada (Zero Invenção / Gatekeeper Anti-Alucinação):
   *   - Se encontrar documento oficial verificável da Prefeitura/Secretaria Municipal de Saúde
   *     contendo medicamentos reais com dosagens, extrai, promove para preset global e ativa no perfil.
   *   - Se NÃO encontrar documento oficial confiável e verificável, JAMAIS inventa dados:
   *     mantém RENAME Nacional (SUS) como segurança no perfil do usuário (atualizando apenas
   *     localidade.municipio_nome e localidade.uf) e retorna o objeto de fallback seguro.
   *
   * @param {string} municipio
   * @param {string} uf
   * @param {string} [chatId]
   * @returns {Promise<object>}
   */
  async buscarRemumeNaWeb(municipio, uf, chatId) {
    const municipioLimpo = String(municipio || '').trim();
    const ufLimpa = String(uf || '').trim().toUpperCase();
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
      documentoVerificado.itens.length >= 15
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
          catalogo: resultadoPromocao.catalogo,
          mensagem: `REMUME oficial de ${municipioLimpo} - ${ufLimpa} localizada, validada (${resultadoPromocao.total_itens} medicamentos) e promovida para preset global.`
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
   * Utilitário interno para busca de documento oficial verificável (.gov.br)
   * com validação estrita anti-alucinação.
   * @private
   */
  async _tentarBuscaOficialVerificada(municipio, uf) {
    if (!municipio || !uf) return null;

    // Permite injeção de provider customizado de busca oficial se configurado no runtime
    if (
      typeof global !== 'undefined' &&
      typeof global.RemumeOfficialWebVerifier === 'function'
    ) {
      const resCustom = await global.RemumeOfficialWebVerifier(municipio, uf);
      if (resCustom && Array.isArray(resCustom.itens) && resCustom.itens.length >= 15) {
        return resCustom;
      }
    }

    // Verifica se há URL oficial mapeada em catálogo de fontes governamentais conhecidas
    const mapaFontesPath = path.join(__dirname, 'fontes_oficiais.json');
    const mapaFontes = lerJsonSeguro(mapaFontesPath, null);
    const slug = gerarSlugMunicipio(municipio, uf);

    if (!mapaFontes || !mapaFontes[slug] || !mapaFontes[slug].url) {
      return null;
    }

    const infoFonte = mapaFontes[slug];
    const urlOficial = String(infoFonte.url).trim();

    // Só aceita domínios oficiais governamentais (.gov.br)
    if (!/^https?:\/\/[^/]+\.gov\.br(\/|$)/i.test(urlOficial)) {
      return null;
    }

    const conteudo = await this._httpGetTextoSeguro(urlOficial, 4500);
    if (!conteudo || conteudo.length < 200) return null;

    const conteudoNormalizado = normalizarAscii(conteudo).toLowerCase();
    const municipioNormalizado = normalizarAscii(municipio).toLowerCase();

    // Verifica se o documento realmente menciona o município e termos de REMUME/Relação de Medicamentos
    const mencionaMunicipio = conteudoNormalizado.includes(municipioNormalizado);
    const mencionaRemume =
      conteudoNormalizado.includes('remume') ||
      conteudoNormalizado.includes('relacao municipal de medicamentos') ||
      conteudoNormalizado.includes('assistencia farmaceutica');

    if (!mencionaMunicipio || !mencionaRemume) {
      return null;
    }

    const itensExtraidos = this.extrairMedicamentosDeTextoBruto(conteudo);
    if (itensExtraidos.length < 15) {
      return null;
    }

    return {
      fonte: infoFonte.fonte || `Secretaria Municipal de Saúde de ${municipio} - ${uf} (Portal Oficial)`,
      urlOficial,
      itens: itensExtraidos
    };
  },

  /**
   * Realiza requisição HTTP/HTTPS GET com timeout curto para nunca bloquear a thread clínica.
   * @private
   */
  _httpGetTextoSeguro(urlStr, timeoutMs = 4000) {
    return new Promise((resolve) => {
      try {
        const client = urlStr.startsWith('https') ? https : http;
        const req = client.get(
          urlStr,
          {
            timeout: timeoutMs,
            headers: {
              'User-Agent': 'meusRemedios-ClinicalSafetyVerifier/1.0',
              Accept: 'text/plain, text/html, application/json, text/csv'
            }
          },
          (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
              res.resume();
              return resolve(null);
            }
            let rawData = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
              if (rawData.length < 2 * 1024 * 1024) {
                rawData += chunk;
              }
            });
            res.on('end', () => resolve(rawData));
          }
        );
        req.on('timeout', () => {
          req.destroy();
          resolve(null);
        });
        req.on('error', () => resolve(null));
      } catch (_e) {
        resolve(null);
      }
    });
  },

  /**
   * Utilitário auxiliar: Consulta se um princípio ativo/medicamento faz parte
   * do catálogo ativo do usuário/município.
   * @param {string} termoMedicamento
   * @param {string} [chatIdOuSlug]
   * @returns {{ disponivel: boolean, correspondencias: Array<string>, catalogo: object }}
   */
  consultarDisponibilidade(termoMedicamento, chatIdOuSlug) {
    const catalogo = this.obterCatalogoAtivo(chatIdOuSlug);
    const termoLimpo = normalizarAscii(String(termoMedicamento || '')).toLowerCase();

    if (!termoLimpo || termoLimpo.length < 3) {
      return { disponivel: false, correspondencias: [], catalogo };
    }

    const correspondencias = (catalogo.itens || []).filter((item) => {
      const itemNorm = normalizarAscii(item).toLowerCase();
      return itemNorm.includes(termoLimpo);
    });

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