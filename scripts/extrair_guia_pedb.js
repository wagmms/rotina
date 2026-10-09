#!/usr/bin/env node
/**
 * ==============================================================================
 * EXTRATOR OFICIAL DE MEDICAMENTOS PEDIÁTRICOS DO PEDBOOK (pedb.com.br)
 * ==============================================================================
 * Extrai todos os medicamentos pediátricos, apresentações farmacêuticas,
 * faixas de dose por kg/idade, casos de uso clínico, resumos de condutas,
 * instruções posológicas e bulas da API oficial do PedBook (Supabase REST API).
 *
 * Cruza cada medicamento e apresentação com a lista municipal da REMUME
 * (Ribeirão Preto / SUS) e gera a base consolidada higienizada para uso
 * direto em memória RAM no Ultra Rotina.
 *
 * Arquivos de saída oficiais:
 * - src/data/guia_pediatrico_pedb.json   (espelho em data/guia_pediatrico_pedb.json)
 * - src/data/condutas_pediatricas_pedb.json (espelho em data/condutas_pediatricas_pedb.json)
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const REMUME_CSV_PATH = path.join(ROOT_DIR, 'REMUME_RP.csv');

const OUT_SRC_MEDS = path.join(ROOT_DIR, 'src', 'data', 'guia_pediatrico_pedb.json');
const OUT_DATA_MEDS = path.join(ROOT_DIR, 'data', 'guia_pediatrico_pedb.json');

const OUT_SRC_CONDUTAS = path.join(ROOT_DIR, 'src', 'data', 'condutas_pediatricas_pedb.json');
const OUT_DATA_CONDUTAS = path.join(ROOT_DIR, 'data', 'condutas_pediatricas_pedb.json');

// Credenciais públicas do cliente web oficial do PedBook (pedb.com.br)
const PEDB_SUPABASE_URL = 'https://hzcpwhhoftzgvfwnrhcg.supabase.co/rest/v1';
const PEDB_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6Y3B3aGhvZnR6Z3Zmd25yaGNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MTY1NDksImV4cCI6MjA5MTk5MjU0OX0.uC1NNi737hduy3U_PIUY5nfSIFhzBT0fNTp26W9Fm7U';

/**
 * Normaliza strings para busca fonética e textual (sem acentos, maiúsculas, pontuações).
 */
function normalizarTexto(txt) {
  return String(txt || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Carrega e higieniza a lista oficial da REMUME (Ribeirão Preto).
 */
function carregarRemume() {
  if (!fs.existsSync(REMUME_CSV_PATH)) {
    console.warn('⚠️ REMUME_RP.csv não encontrado em:', REMUME_CSV_PATH);
    return [];
  }
  const lines = fs.readFileSync(REMUME_CSV_PATH, 'utf8')
    .split(/\r?\n/)
    .map(l => l.replace(/^"|"$/g, '').trim())
    .filter(l => l && l.toLowerCase() !== 'medicamento');
  return lines;
}

/**
 * Cruza o fármaco pediátrico com a REMUME de Ribeirão Preto.
 */
function cruzarComRemume(nomeMedicamento, remumeLinhas) {
  const nomeNorm = normalizarTexto(nomeMedicamento);
  // Remove sufixos como (METAMIZOL SÓDICO), — REVISÃO..., etc.
  const nomeLimpo = nomeNorm.replace(/\s*\([^)]*\)/g, '').split('—')[0].trim();
  const palavras = nomeLimpo
    .split(/\s+/)
    .filter(p => p.length >= 3 && !['COM', 'SEM', 'PARA', 'FRASCO', 'SOLUCAO', 'SUSPENSAO', 'GOTAS', 'USO', 'ORAL'].includes(p));

  if (palavras.length === 0) return { na_remume: false, apresentacoes_remume: [] };

  const matches = remumeLinhas.filter(linhaRemume => {
    const rNorm = normalizarTexto(linhaRemume);
    
    // Match 1: Prefixo direto do nome
    if (rNorm.startsWith(nomeLimpo) || nomeLimpo.startsWith(rNorm.split(/\s+\d/)[0])) {
      return true;
    }

    // Match 2: Todas as palavras significativas estão na linha da REMUME (ex: AMOXICILINA + CLAVULANATO)
    if (palavras.length >= 2) {
      const contemTodas = palavras.every(p => rNorm.includes(p));
      if (contemTodas) return true;
    }

    // Match 3: Fármaco simples de palavra única (ex: DIPIRONA, PARACETAMOL, IBUPROFENO)
    if (palavras.length === 1) {
      const primeiraRemume = rNorm.split(/\s+/)[0];
      return primeiraRemume === palavras[0];
    }

    return false;
  });

  return {
    na_remume: matches.length > 0,
    apresentacoes_remume: matches
  };
}

/**
 * Consulta genérica paginada à API REST do Supabase do PedBook.
 */
async function fetchTabelaPedBook(nomeTabela) {
  let todos = [];
  let pagina = 0;
  const limite = 1000;

  while (true) {
    const url = `${PEDB_SUPABASE_URL}/${nomeTabela}?select=*&limit=${limite}&offset=${pagina * limite}`;
    const resp = await fetch(url, {
      headers: {
        'apikey': PEDB_ANON_KEY,
        'Authorization': `Bearer ${PEDB_ANON_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!resp.ok) {
      throw new Error(`Erro HTTP ao buscar tabela '${nomeTabela}': ${resp.status} ${resp.statusText}`);
    }

    const lote = await resp.json();
    if (!Array.isArray(lote)) {
      throw new Error(`Resposta inesperada para '${nomeTabela}': formato não é array`);
    }

    todos = todos.concat(lote);
    if (lote.length < limite) break;
    pagina++;
  }

  return todos;
}

/**
 * Higieniza texto de markdown ou html para evitar espaços em excesso.
 */
function limparEspacos(txt) {
  if (!txt || typeof txt !== 'string') return '';
  return txt.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

/**
 * Fluxo mestre de extração e consolidação.
 */
async function extrairGuiaPediatricoPedBook() {
  console.log('==============================================================================');
  console.log('🚀 INICIANDO EXTRAÇÃO DE MEDICAMENTOS PEDIÁTRICOS DO PEDBOOK (pedb.com.br)');
  console.log('🌐 Endpoint:', PEDB_SUPABASE_URL);
  console.log('==============================================================================');

  const remumeLinhas = carregarRemume();
  console.log(`📦 Carregadas ${remumeLinhas.length} apresentações municipais da REMUME (Ribeirão Preto).`);

  const tInicio = Date.now();

  // 1. Download de todas as tabelas clínicas
  console.log('📡 Buscando tabelas clínicas do PedBook...');
  const [
    medsRaw,
    categoriasRaw,
    apresentacoesRaw,
    posologiasRaw,
    instrucoesRaw,
    casosUsoRaw,
    bulasRaw,
    condutasRaw
  ] = await Promise.all([
    fetchTabelaPedBook('pedbook_medications'),
    fetchTabelaPedBook('pedbook_medication_categories'),
    fetchTabelaPedBook('pedbook_medication_presentations'),
    fetchTabelaPedBook('pedbook_medication_dosages'),
    fetchTabelaPedBook('pedbook_medication_instructions'),
    fetchTabelaPedBook('pedbook_medication_use_cases'),
    fetchTabelaPedBook('pedbook_medication_leaflets'),
    fetchTabelaPedBook('pedbook_conducts_optimized')
  ]);

  console.log(`✅ Dados brutos recebidos em ${Date.now() - tInicio}ms:`);
  console.log(`   • Medicamentos:    ${medsRaw.length}`);
  console.log(`   • Categorias:      ${categoriasRaw.length}`);
  console.log(`   • Apresentações:   ${apresentacoesRaw.length}`);
  console.log(`   • Posologias:      ${posologiasRaw.length}`);
  console.log(`   • Casos de uso:    ${casosUsoRaw.length}`);
  console.log(`   • Instruções:      ${instrucoesRaw.length}`);
  console.log(`   • Bulas:           ${bulasRaw.length}`);
  console.log(`   • Condutas/Manejos: ${condutasRaw.length}`);

  // 2. Mapeamentos e indexações
  const catMap = new Map();
  categoriasRaw.forEach(c => {
    catMap.set(c.id, {
      id: c.id,
      nome: c.name,
      slug: c.slug,
      descricao: c.description,
      ordem: c.display_order
    });
  });

  const useCaseMap = new Map();
  casosUsoRaw.forEach(u => {
    useCaseMap.set(u.id, {
      id: u.id,
      medication_id: u.medication_id,
      nome: u.name,
      descricao: u.description,
      indicacao_clinica: u.clinical_indication,
      padrao: Boolean(u.is_default_regimen),
      ordem: u.display_order
    });
  });

  // Agrupamentos por medicamento
  const presPorMed = new Map();
  apresentacoesRaw.forEach(p => {
    if (!presPorMed.has(p.medication_id)) presPorMed.set(p.medication_id, []);
    presPorMed.get(p.medication_id).push(p);
  });

  const dosagensPorMed = new Map();
  posologiasRaw.forEach(d => {
    if (!dosagensPorMed.has(d.medication_id)) dosagensPorMed.set(d.medication_id, []);
    dosagensPorMed.get(d.medication_id).push(d);
  });

  const instrucaoPorMed = new Map();
  instrucoesRaw.forEach(i => {
    instrucaoPorMed.set(i.medication_id, i);
  });

  const bulaPorMed = new Map();
  bulasRaw.forEach(b => {
    bulaPorMed.set(b.medication_id, b);
  });

  // 3. Consolidação dos Medicamentos Pediátricos
  let contNaRemume = 0;
  let contComApresentacoes = 0;
  let contComPosologia = 0;

  const medicamentosConsolidados = medsRaw
    .filter(m => m && m.name && m.is_active !== false)
    .map(raw => {
      const cat = catMap.get(raw.category_id) || { nome: 'Geral', slug: 'geral' };
      const remumeInfo = cruzarComRemume(raw.name, remumeLinhas);
      if (remumeInfo.na_remume) contNaRemume++;

      // Apresentações do medicamento
      const rawPres = presPorMed.get(raw.id) || [];
      let apresentacoes = rawPres.map(p => ({
        id: p.id,
        forma: p.form_name,
        tipo: p.form_type || 'outro',
        concentracao: p.concentration || '',
        template_calculo: p.dose_calculation_template || '',
        dose_max_tomada: p.max_dose_per_time || '',
        dose_max_dia: p.max_dose_per_day || '',
        notas_administracao: p.administration_notes || '',
        peso_minimo_kg: p.min_weight !== null ? Number(p.min_weight) : null,
        idade_minima_meses: p.min_age_months !== null ? Number(p.min_age_months) : null,
        rename_status: p.rename_status,
        rename_componente: p.rename_component
      }));

      // Esquemas posológicos / doses
      const rawDos = dosagensPorMed.get(raw.id) || [];
      if (rawDos.length > 0) contComPosologia++;

      const posologias = rawDos.map(d => {
        const uCase = useCaseMap.get(d.use_case_id);
        return {
          id: d.id,
          nome: d.name,
          caso_de_uso: uCase ? uCase.nome : (d.tabs || 'Geral'),
          tipo: d.type,
          resumo: limparEspacos(d.summary),
          template: d.dosage_template,
          faixa_etaria: d.age_group,
          via: d.route,
          alerta: d.warning ? limparEspacos(d.warning) : null,
          max_dose: d.max_value,
          multiplicador: d.multiplier,
          volume_max_local_ml: d.max_volume_per_site_ml,
          requer_confirmacao: Boolean(d.requires_confirmation)
        };
      });

      // Se não houver apresentação na tabela específica, sintetiza a partir das posologias
      if (apresentacoes.length === 0 && posologias.length > 0) {
        const vistas = new Set();
        posologias.forEach(p => {
          if (!p.nome || vistas.has(p.nome)) return;
          vistas.add(p.nome);

          let tipo = 'outro';
          const nLower = p.nome.toLowerCase();
          if (nLower.includes('gotas')) tipo = 'gotas';
          else if (nLower.includes('suspens') || nLower.includes('xarope')) tipo = 'suspensao';
          else if (nLower.includes('comp') || nLower.includes('capsul')) tipo = 'comprimido';
          else if (nLower.includes('injet') || nLower.includes('ampola')) tipo = 'injetavel';
          else if (nLower.includes('pomada') || nLower.includes('creme')) tipo = 'topico';

          // Tenta extrair concentração do resumo
          let conc = '';
          const mConc = p.resumo && p.resumo.match(/Concentraç[aã]o:\s*([^\n\r]+)/i);
          if (mConc) conc = mConc[1].replace(/\*\*/g, '').trim();

          apresentacoes.push({
            id: null,
            forma: p.nome,
            tipo: tipo,
            concentracao: conc,
            template_calculo: p.template || '',
            dose_max_tomada: '',
            dose_max_dia: '',
            notas_administracao: '',
            peso_minimo_kg: null,
            idade_minima_meses: null,
            rename_status: null,
            rename_componente: null
          });
        });
      }

      if (apresentacoes.length > 0) contComApresentacoes++;

      // Instrução rápida / Resumo clínico estruturado
      const rawInst = instrucaoPorMed.get(raw.id);
      const resumoClinico = rawInst ? limparEspacos(rawInst.quick_summary) : '';

      // Bula profissional consolidada
      const rawBula = bulaPorMed.get(raw.id);
      const bula = rawBula ? {
        titulo: rawBula.title,
        fabricante: rawBula.manufacturer,
        principio_ativo: rawBula.active_ingredient,
        classe_terapeutica: rawBula.therapeutic_class,
        indicacoes: rawBula.indications,
        contraindicacoes: rawBula.contraindications,
        advertencias: rawBula.warnings,
        reacoes_adversas: rawBula.adverse_reactions,
        interacoes: rawBula.interactions,
        posologia: rawBula.posology
      } : null;

      // Nomes comerciais limpos e marcas
      const marcasLimpo = raw.brands ? raw.brands.replace(/®/g, '').trim() : '';

      return {
        id: raw.id,
        nome: raw.name,
        nome_normalizado: normalizarTexto(raw.name),
        slug: raw.slug,
        descricao: raw.description,
        categoria: cat.nome,
        categoria_slug: cat.slug,
        marcas: raw.brands,
        marcas_texto: marcasLimpo,
        contraindicacoes: limparEspacos(raw.contraindications),
        diretrizes: limparEspacos(raw.guidelines),
        referencias_cientificas: limparEspacos(raw.scientific_references),
        palavras_chave: Array.isArray(raw.keywords) ? raw.keywords : [],
        na_remume: remumeInfo.na_remume,
        apresentacoes_remume: remumeInfo.apresentacoes_remume,
        apresentacoes: apresentacoes,
        posologias: posologias,
        resumo_clinico: resumoClinico,
        bula: bula
      };
    });

  // Ordena alfabeticamente por nome
  medicamentosConsolidados.sort((a, b) => a.nome.localeCompare(b.nome));

  // 4. Consolidação das Condutas Pediátricas
  const condutasConsolidadas = condutasRaw
    .filter(c => c && c.title && c.published !== false)
    .map(c => ({
      id: c.id,
      titulo: c.title,
      titulo_normalizado: normalizarTexto(c.title),
      slug: c.slug,
      resumo_rapido: limparEspacos(c.quick_summary_content),
      conteudo_tratamento: limparEspacos(c.treatment_content),
      tags: Array.isArray(c.tags) ? c.tags : [],
      tem_tratamento: Boolean(c.has_treatment)
    }));

  condutasConsolidadas.sort((a, b) => a.titulo.localeCompare(b.titulo));

  // 5. Metadados e estruturação final
  const payloadMedicamentos = {
    metadados: {
      fonte: 'PedBook - Calculadora e Doses Pediátricas',
      url_oficial: 'https://pedb.com.br/',
      data_extracao: new Date().toISOString(),
      versao_extrator: '2.0-pedbook-render',
      total_medicamentos: medicamentosConsolidados.length,
      total_com_apresentacoes: contComApresentacoes,
      total_com_posologias: contComPosologia,
      total_na_remume: contNaRemume,
      total_categorias: categoriasRaw.length
    },
    medicamentos: medicamentosConsolidados
  };

  const payloadCondutas = {
    metadados: {
      fonte: 'PedBook - Condutas e Manejos Pediátricos',
      url_oficial: 'https://pedb.com.br/condutas-e-manejos',
      data_extracao: new Date().toISOString(),
      total_condutas: condutasConsolidadas.length
    },
    condutas: condutasConsolidadas
  };

  // 6. Salvamento atômico nos diretórios oficiais
  console.log('\n💾 Gravando arquivos consolidados...');

  // Garante que as pastas existem
  fs.mkdirSync(path.dirname(OUT_SRC_MEDS), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_DATA_MEDS), { recursive: true });

  const jsonMeds = JSON.stringify(payloadMedicamentos, null, 2);
  fs.writeFileSync(OUT_SRC_MEDS, jsonMeds, 'utf8');
  fs.writeFileSync(OUT_DATA_MEDS, jsonMeds, 'utf8');
  console.log(`  ✓ Base de Medicamentos: ${OUT_SRC_MEDS} (${(Buffer.byteLength(jsonMeds) / 1024).toFixed(1)} KB)`);
  console.log(`  ✓ Espelho:              ${OUT_DATA_MEDS}`);

  const jsonCondutas = JSON.stringify(payloadCondutas, null, 2);
  fs.writeFileSync(OUT_SRC_CONDUTAS, jsonCondutas, 'utf8');
  fs.writeFileSync(OUT_DATA_CONDUTAS, jsonCondutas, 'utf8');
  console.log(`  ✓ Base de Condutas:     ${OUT_SRC_CONDUTAS} (${(Buffer.byteLength(jsonCondutas) / 1024).toFixed(1)} KB)`);
  console.log(`  ✓ Espelho:              ${OUT_DATA_CONDUTAS}`);

  console.log('\n==============================================================================');
  console.log('🎉 EXTRAÇÃO DO PEDBOOK CONCLUÍDA COM SUCESSO!');
  console.log(`   • Medicamentos pediátricos consolidados: ${medicamentosConsolidados.length}`);
  console.log(`   • Com apresentações detalhadas:          ${contComApresentacoes}`);
  console.log(`   • Com esquemas posológicos por kg/idade: ${contComPosologia}`);
  console.log(`   • Itens padronizados na REMUME RP:       ${contNaRemume}`);
  console.log(`   • Protocolos de condutas pediátricas:    ${condutasConsolidadas.length}`);
  console.log(`   • Tempo total:                           ${((Date.now() - tInicio) / 1000).toFixed(2)}s`);
  console.log('==============================================================================');

  return payloadMedicamentos;
}

if (require.main === module) {
  extrairGuiaPediatricoPedBook().catch(err => {
    console.error('❌ Falha na extração do PedBook:', err);
    process.exit(1);
  });
}

module.exports = {
  extrairGuiaPediatricoPedBook,
  cruzarComRemume,
  normalizarTexto
};
