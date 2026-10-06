#!/usr/bin/env node
/**
 * ==============================================================================
 * EXTRATOR OFICIAL DO GUIA FARMACÊUTICO HOSPITAL SÍRIO-LIBANÊS (HSL)
 * ==============================================================================
 * Extrai todas as posologias, apresentações, ajustes de dose e diretrizes de
 * administração da API pública do Guia Farmacêutico HSL (SharePoint REST API),
 * cruza com a lista da REMUME (Ribeirão Preto / SUS) e gera a base consolidada
 * em formato JSON estruturado e higienizado.
 *
 * Arquivo de saída oficial: src/data/guia_farmaceutico_hsl.json
 * Espelho persistente:       data/guia_farmaceutico_hsl.json
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const REMUME_CSV_PATH = path.join(ROOT_DIR, 'REMUME_RP.csv');
const OUT_SRC_JSON = path.join(ROOT_DIR, 'src', 'data', 'guia_farmaceutico_hsl.json');
const OUT_DATA_JSON = path.join(ROOT_DIR, 'data', 'guia_farmaceutico_hsl.json');

const HSL_API_URL = "https://guiafarmaceutico.hsl.org.br/_api/web/lists/getbytitle('P%C3%A1ginas')/items";
const FIELDS = [
  'Id',
  'Title',
  'NomeComercialApresentacao',
  'NomeComercial',
  'Indicacoes',
  'Dose',
  'ViaAdministracao',
  'PreparoDiluicao',
  'Administracao',
  'EstabilidadeConservacao',
  'CuidadosEspecificos',
  'Contraindicacoes',
  'UsoDuranteGestacao',
  'UsoDuranteLactacao',
  'PotencialEmetogenico',
  'MedicamentosSintomaticos'
];

/**
 * Normaliza strings para indexação e busca fonética/textual (sem acentos, maiúsculas).
 */
function normalizarTexto(txt) {
  return String(txt || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\([A-Z]\)/g, '') // remove marcações do HSL como (A), (B), (C)
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Limpa HTML mantendo quebras de linha e estrutura legível.
 */
function htmlParaTextoLimpo(html) {
  if (!html || typeof html !== 'string') return '';
  
  let texto = html
    .replace(/<sup[^>]*>.*?<\/sup>/gi, '') // remove sobrescritos (números de referência bibliográfica)
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/blockquote>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<tr[^>]*>/gi, '\n')
    .replace(/<\/td>/gi, ' | ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#58;/g, ':')
    .replace(/&#160;/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\u200B/g, '') // zero-width space
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ');

  return texto
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}

/**
 * Divide o campo Dose do HSL em seções estruturadas:
 * - adulto
 * - pediatria
 * - dose_maxima
 * - ajuste_dose (renal, hemodiálise, hepática)
 * - texto_completo
 */
function parseSecoesDose(doseHtml) {
  if (!doseHtml || typeof doseHtml !== 'string' || !doseHtml.trim()) {
    return {
      adulto: '',
      pediatria: '',
      dose_maxima: '',
      ajuste_dose: '',
      texto_completo: ''
    };
  }

  let bruto = doseHtml.replace(/<sup[^>]*>.*?<\/sup>/gi, '');

  // Marcações de início de seção
  bruto = bruto.replace(/<(h[1-6]|b|strong|p|blockquote)[^>]*>\s*(?:​|\s)*(?:<strong>|<b>)?\s*(adulto[s]?|pediatria|crian[cç]as?|dose\s+m[aá]xima|ajuste\s+de\s+dose|insufici[eê]ncia\s+renal)\s*(?:<\/strong>|<\/b>)?\s*(?::|&#58;)?\s*<\/\1>/gi, (match, tag, title) => {
    const t = title.toLowerCase();
    if (t.includes('adulto')) return '\n\n===SEC_ADULTO===\n';
    if (t.includes('pediatria') || t.includes('crian')) return '\n\n===SEC_PEDIATRIA===\n';
    if (t.includes('m[aá]xima') || t.includes('maxima')) return '\n\n===SEC_MAXIMA===\n';
    if (t.includes('ajuste') || t.includes('renal')) return '\n\n===SEC_AJUSTE===\n';
    return match;
  });

  // Também identifica padrões onde a tag inline abre e fecha
  bruto = bruto.replace(/(?:^|\n|<br\s*\/?>|<p[^>]*>)\s*(?:​|\s)*(?:<strong>|<b>)\s*(adulto[s]?|pediatria|crian[cç]as?|dose\s+m[aá]xima|ajuste\s+de\s+dose)\s*(?:<\/strong>|<\/b>)\s*(?::|&#58;)?/gi, (match, title) => {
    const t = title.toLowerCase();
    if (t.includes('adulto')) return '\n\n===SEC_ADULTO===\n';
    if (t.includes('pediatria') || t.includes('crian')) return '\n\n===SEC_PEDIATRIA===\n';
    if (t.includes('m[aá]xima') || t.includes('maxima')) return '\n\n===SEC_MAXIMA===\n';
    if (t.includes('ajuste')) return '\n\n===SEC_AJUSTE===\n';
    return match;
  });

  const textoCompleto = htmlParaTextoLimpo(doseHtml);
  const secoes = {
    adulto: '',
    pediatria: '',
    dose_maxima: '',
    ajuste_dose: '',
    texto_completo: textoCompleto
  };

  const partes = bruto.split(/(===SEC_[A-Z]+===)/g);
  let chaveAtual = null;

  for (const parte of partes) {
    if (parte === '===SEC_ADULTO===') chaveAtual = 'adulto';
    else if (parte === '===SEC_PEDIATRIA===') chaveAtual = 'pediatria';
    else if (parte === '===SEC_MAXIMA===') chaveAtual = 'dose_maxima';
    else if (parte === '===SEC_AJUSTE===') chaveAtual = 'ajuste_dose';
    else if (chaveAtual) {
      const conteudoLimpo = htmlParaTextoLimpo(parte);
      if (conteudoLimpo) {
        secoes[chaveAtual] = (secoes[chaveAtual] ? secoes[chaveAtual] + '\n' : '') + conteudoLimpo;
      }
    }
  }

  // Se não detectou subseções mas existe texto, assume como adulto/geral
  if (!secoes.adulto && !secoes.pediatria && !secoes.ajuste_dose && textoCompleto) {
    secoes.adulto = textoCompleto;
  }

  return secoes;
}

/**
 * Converte campo de apresentações em lista de itens limpos.
 */
function parseApresentacoes(html) {
  const texto = htmlParaTextoLimpo(html);
  if (!texto) return [];
  return texto
    .split('\n')
    .map(line => line.replace(/^[•\-\*]\s*/, '').trim())
    .filter(line => line.length > 0);
}

/**
 * Carrega a base REMUME_RP.csv local.
 */
function carregarRemume() {
  if (!fs.existsSync(REMUME_CSV_PATH)) {
    console.warn(`[Extrator HSL] ⚠️ Arquivo ${REMUME_CSV_PATH} não encontrado.`);
    return [];
  }
  const lines = fs.readFileSync(REMUME_CSV_PATH, 'utf8')
    .split('\n')
    .map(l => l.replace(/^"|"$/g, '').trim())
    .filter(l => l && l.toLowerCase() !== 'medicamento');
  return lines;
}

/**
 * Verifica se um medicamento HSL consta na REMUME e lista as apresentações correspondentes.
 */
function cruzarComRemume(tituloHsl, remumeLinhas) {
  const tituloNorm = normalizarTexto(tituloHsl);
  const palavrasHsl = tituloNorm
    .split(/\s+/)
    .filter(p => p.length >= 3 && !['COM', 'SEM', 'PARA', 'FRASCO', 'SOLUCAO'].includes(p));

  if (palavrasHsl.length === 0) return { na_remume: false, apresentacoes_remume: [] };

  const matches = remumeLinhas.filter(linhaRemume => {
    const rNorm = normalizarTexto(linhaRemume);
    
    // Match 1: O nome da REMUME começa com o título normalizado do HSL
    if (rNorm.startsWith(tituloNorm) || tituloNorm.startsWith(rNorm.split(/\s+\d/)[0])) {
      return true;
    }

    // Match 2: Todas as palavras significativas do HSL estão na linha da REMUME
    // (útil para associações: ex "Amoxicilina + Clavulanato")
    if (palavrasHsl.length >= 2) {
      const contemTodas = palavrasHsl.every(p => rNorm.includes(p));
      if (contemTodas) return true;
    }

    // Match 3: Para fármaco de palavra única (ex: DIPIRONA, ACICLOVIR), primeira palavra bate exato
    if (palavrasHsl.length === 1) {
      const primeiraRemume = rNorm.split(/\s+/)[0];
      return primeiraRemume === palavrasHsl[0];
    }

    return false;
  });

  return {
    na_remume: matches.length > 0,
    apresentacoes_remume: matches
  };
}

/**
 * Executa o fluxo completo de extração.
 */
async function extrairGuiaHSL() {
  console.log('==============================================================================');
  console.log('🚀 INICIANDO EXTRAÇÃO OFICIAL DO GUIA FARMACÊUTICO HSL');
  console.log('🌐 Endpoint:', HSL_API_URL);
  console.log('==============================================================================');

  const remumeLinhas = carregarRemume();
  console.log(`📦 Carregadas ${remumeLinhas.length} apresentações municipais da REMUME (Ribeirão Preto).`);

  let itemsRecebidos = [];
  let nextUrl = `${HSL_API_URL}?$select=${FIELDS.join(',')}&$top=1000`;
  let pagina = 1;

  const tInicio = Date.now();

  while (nextUrl) {
    console.log(`📡 Requisitando página ${pagina}...`);
    const resp = await fetch(nextUrl, {
      headers: {
        'Accept': 'application/json;odata=verbose',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!resp.ok) {
      throw new Error(`Erro HTTP ao acessar HSL: ${resp.status} ${resp.statusText}`);
    }

    const payload = await resp.json();
    const results = (payload.d && payload.d.results) || [];
    itemsRecebidos.push(...results);
    console.log(`   ↳ Recebidos ${results.length} registros nesta página (total acumulado: ${itemsRecebidos.length}).`);

    nextUrl = (payload.d && payload.d.__next) ? payload.d.__next : null;
    pagina++;
  }

  console.log(`✅ Consulta à API HSL concluída com sucesso! Processando e higienizando registros...`);

  // Filtra itens irrelevantes/administrativos
  const nomesBloqueados = new Set([
    'HOME', 'PESQUISA', 'PAGINA INICIAL', 'PAGE NOT FOUND', 'MODELO DE PAGINA'
  ]);

  const listaTratada = [];
  let contComDose = 0;
  let contAdulto = 0;
  let contPediatria = 0;
  let contAjuste = 0;
  let contNaRemume = 0;

  for (const raw of itemsRecebidos) {
    const tituloOriginal = String(raw.Title || '').trim();
    if (!tituloOriginal || nomesBloqueados.has(tituloOriginal.toUpperCase())) {
      continue;
    }

    const secoesDose = parseSecoesDose(raw.Dose);
    const apresentacoesComerciais = parseApresentacoes(raw.NomeComercialApresentacao || raw.NomeComercial);
    const indicacoes = htmlParaTextoLimpo(raw.Indicacoes);
    const administracao = htmlParaTextoLimpo(raw.Administracao);
    const preparoDiluicao = htmlParaTextoLimpo(raw.PreparoDiluicao);
    const estabilidadeConservacao = htmlParaTextoLimpo(raw.EstabilidadeConservacao);
    const cuidadosEspecificos = htmlParaTextoLimpo(raw.CuidadosEspecificos);
    const contraindicacoes = htmlParaTextoLimpo(raw.Contraindicacoes);
    const gestacao = htmlParaTextoLimpo(raw.UsoDuranteGestacao);
    const lactacao = htmlParaTextoLimpo(raw.UsoDuranteLactacao);

    // Resumo gestação e lactação
    let gestacaoLactacao = '';
    if (gestacao || lactacao) {
      gestacaoLactacao = [
        gestacao ? `Gestação: ${gestacao}` : '',
        lactacao ? `Lactação: ${lactacao}` : ''
      ].filter(Boolean).join('\n');
    }

    // Cruzamento com a REMUME
    const cruzamento = cruzarComRemume(tituloOriginal, remumeLinhas);

    if (secoesDose.texto_completo) contComDose++;
    if (secoesDose.adulto) contAdulto++;
    if (secoesDose.pediatria) contPediatria++;
    if (secoesDose.ajuste_dose) contAjuste++;
    if (cruzamento.na_remume) contNaRemume++;

    listaTratada.push({
      id: raw.Id || raw.ID,
      farnaco: tituloOriginal,
      nome_normalizado: normalizarTexto(tituloOriginal),
      na_remume: cruzamento.na_remume,
      apresentacoes_remume: cruzamento.apresentacoes_remume,
      apresentacoes_hsl: apresentacoesComerciais,
      indicacoes: indicacoes,
      dose_adulto: secoesDose.adulto,
      dose_pediatria: secoesDose.pediatria,
      dose_maxima: secoesDose.dose_maxima,
      ajuste_dose: secoesDose.ajuste_dose,
      posologia_completa: secoesDose.texto_completo,
      administracao: administracao,
      preparo_diluicao: preparoDiluicao,
      estabilidade_conservacao: estabilidadeConservacao,
      cuidados_especificos: cuidadosEspecificos,
      contraindicacoes: contraindicacoes,
      gestacao_lactacao: gestacaoLactacao,
      potencial_emetogenico: htmlParaTextoLimpo(raw.PotencialEmetogenico),
      medicamentos_sintomaticos: htmlParaTextoLimpo(raw.MedicamentosSintomaticos)
    });
  }

  // Ordena alfabeticamente
  listaTratada.sort((a, b) => a.farnaco.localeCompare(b.farnaco, 'pt-BR'));

  const duracao = ((Date.now() - tInicio) / 1000).toFixed(2);

  const payloadFinal = {
    metadados: {
      fonte: "Guia Farmacêutico Hospital Sírio-Libanês (HSL)",
      url_oficial: "https://guiafarmaceutico.hsl.org.br",
      data_extracao: new Date().toISOString(),
      versao: "1.0.0",
      total_medicamentos: listaTratada.length,
      total_com_posologia: contComDose,
      total_com_dose_adulto: contAdulto,
      total_com_dose_pediatrica: contPediatria,
      total_com_ajuste_renal: contAjuste,
      total_na_remume: contNaRemume,
      duracao_extracao_segundos: parseFloat(duracao)
    },
    medicamentos: listaTratada
  };

  // Garante diretórios
  fs.mkdirSync(path.dirname(OUT_SRC_JSON), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_DATA_JSON), { recursive: true });

  const jsonStr = JSON.stringify(payloadFinal, null, 2);
  fs.writeFileSync(OUT_SRC_JSON, jsonStr, 'utf8');
  fs.writeFileSync(OUT_DATA_JSON, jsonStr, 'utf8');

  console.log('==============================================================================');
  console.log('🎉 EXTRAÇÃO CONCLUÍDA COM SUCESSO!');
  console.log('==============================================================================');
  console.log(`📊 Total de Medicamentos Extraídos:  ${listaTratada.length}`);
  console.log(`💊 Com Posologia Cadastrada:         ${contComDose}`);
  console.log(`👤 Com Dose Adulto Estruturada:      ${contAdulto}`);
  console.log(`👶 Com Dose Pediátrica Estruturada:  ${contPediatria}`);
  console.log(`⚠️ Com Ajuste Renal/Hepático:        ${contAjuste}`);
  console.log(`🏛️ Vinculados à REMUME de Ribeirão:  ${contNaRemume}`);
  console.log(`⏱️ Tempo total de execução:          ${duracao}s`);
  console.log(`💾 Arquivo Oficial:                  ${OUT_SRC_JSON} (${(Buffer.byteLength(jsonStr) / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`💾 Arquivo Espelho:                  ${OUT_DATA_JSON}`);
  console.log('==============================================================================');

  return payloadFinal;
}

if (require.main === module) {
  extrairGuiaHSL().catch(err => {
    console.error('❌ Erro fatal durante a extração do Guia HSL:', err);
    process.exit(1);
  });
}

module.exports = { extrairGuiaHSL, htmlParaTextoLimpo, parseSecoesDose, cruzarComRemume, normalizarTexto };
