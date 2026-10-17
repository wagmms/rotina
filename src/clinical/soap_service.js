/**
 * @fileoverview Serviço Orquestrador Clínico SOAP (Rotina - Gemini 4 Argon).
 * Coordena cálculos determinísticos, inferência estruturada via Vertex AI,
 * RAG local sobre o acervo Tá de Clinicagem (data/tdc_knowledge.db),
 * travas de segurança farmacológica e formatação de prontuário/receituário.
 */

'use strict';

const { runAllCalculations } = require('./calculators.js');
const { validateSafety } = require('./safety_guard.js');
const { generateSoapWithVertex } = require('../ai/vertex_soap_agent.js');
const { tdcService } = require('./tdc_service.js');

/**
 * Normaliza o payload de entrada aceitando tanto o formato estruturado
 * ({ brain_dump, patient_context, vitals }) quanto o formato plano enviado por formulários
 * ({ brain_dump, idade, sexo, gestante, alergias, sinais_vitais, pas, pad, ... }).
 * @param {Object} rawPayload
 * @returns {Object}
 */
function normalizeSoapInputPayload(rawPayload = {}) {
  if (!rawPayload || typeof rawPayload !== 'object') return {};

  const rawContext = rawPayload.patient_context && typeof rawPayload.patient_context === 'object'
    ? { ...rawPayload.patient_context }
    : {};

  const rawVitals = (rawPayload.vitals && typeof rawPayload.vitals === 'object')
    ? { ...rawPayload.vitals }
    : ((rawPayload.sinais_vitais && typeof rawPayload.sinais_vitais === 'object')
        ? { ...rawPayload.sinais_vitais }
        : {});

  // Migra campos demográficos enviados na raiz para patient_context
  if (rawContext.idade !== undefined && rawContext.idade !== '' && rawContext.idade !== null) {
    const numIdade = Number(rawContext.idade);
    if (!Number.isNaN(numIdade) && numIdade >= 0) rawContext.idade = numIdade;
    else delete rawContext.idade;
  } else if (rawPayload.idade !== undefined && rawPayload.idade !== '' && rawPayload.idade !== null) {
    const numIdade = Number(rawPayload.idade);
    if (!Number.isNaN(numIdade) && numIdade >= 0) rawContext.idade = numIdade;
  }
  if (rawContext.sexo === undefined && rawPayload.sexo) {
    const s = String(rawPayload.sexo).trim().toUpperCase();
    if (['M', 'F', 'I'].includes(s)) rawContext.sexo = s;
    else if (s.startsWith('MASC')) rawContext.sexo = 'M';
    else if (s.startsWith('FEM')) rawContext.sexo = 'F';
  }
  if (rawContext.gestante === undefined && rawPayload.gestante !== undefined) {
    rawContext.gestante = Boolean(rawPayload.gestante === true || rawPayload.gestante === 'true' || rawPayload.gestante === '1');
  }
  if (rawContext.alergias === undefined && rawPayload.alergias !== undefined && rawPayload.alergias !== null) {
    if (Array.isArray(rawPayload.alergias)) {
      rawContext.alergias = rawPayload.alergias.map((a) => String(a).trim()).filter(Boolean);
    } else if (typeof rawPayload.alergias === 'string' && rawPayload.alergias.trim()) {
      rawContext.alergias = [rawPayload.alergias.trim()];
    }
  }

  // Migra e valida estritamente sinais vitais (descarta valores não-numéricos ou negativos)
  const vitalKeys = ['pas', 'pad', 'fc', 'fr', 'tax', 'spo2', 'hgt', 'peso', 'altura', 'glasgow'];
  for (const k of vitalKeys) {
    let rawVal = rawVitals[k];
    if (rawVal === undefined || rawVal === null || rawVal === '') {
      rawVal = rawPayload[k];
    }
    if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
      const n = Number(rawVal);
      if (!Number.isNaN(n) && n >= 0) {
        rawVitals[k] = n;
      } else {
        delete rawVitals[k];
      }
    } else {
      delete rawVitals[k];
    }
  }

  return {
    brain_dump: typeof rawPayload.brain_dump === 'string' ? rawPayload.brain_dump : '',
    patient_context: rawContext,
    vitals: rawVitals,
    model_override: rawPayload.model_override || rawPayload.options?.model_override || null
  };
}

/**
 * Formata o objeto SOAP estruturado e métricas calculadas em texto limpo
 * pronto para colar em sistemas de prontuário eletrônico (e-SUS PEC, Tasy, MV).
 * Nunca fabrica negativas clínicas ("Nega alergias", "Red Flags: Ausentes") quando os dados estão ausentes.
 *
 * @param {Object} soapData - Objeto SOAP estruturado e sanitizado.
 * @param {Object} [calculatedMetrics={}] - Métricas determinísticas calculadas.
 * @returns {string} Texto formatado do prontuário SOAP.
 */
function formatClipboardSoap(soapData, calculatedMetrics = {}) {
  if (!soapData || typeof soapData !== 'object') {
    return 'Dados clínicos indisponíveis para formatação.';
  }

  const s = soapData.subjetivo_formatado || soapData.subjetivo || {};
  const o = soapData.objetivo_formatado || soapData.objetivo || {};
  const a = soapData.avaliacao || {};
  const p = soapData.plano || {};

  const lines = [];

  // =========================================================================
  // 1. SUBJETIVO
  // =========================================================================
  lines.push('=== SUBJETIVO ===');
  if (typeof s === 'string') {
    lines.push(s);
  } else if (s.texto_unificado) {
    lines.push(s.texto_unificado);
  } else {
    if (s.qp || s.queixa_principal) lines.push(`QP: ${s.qp || s.queixa_principal}`);
    if (s.hda) lines.push(`HDA: ${s.hda}`);
    if (s.hpp_medicacoes || s.antecedentes) {
      lines.push(`HPP / Medicações: ${s.hpp_medicacoes || s.antecedentes}`);
    }
    lines.push(`Alergias: ${s.alergias ? String(s.alergias).trim() : 'Não informado (confirmar ativamente antes de prescrever)'}`);
  }
  lines.push('');

  // =========================================================================
  // 2. OBJETIVO
  // =========================================================================
  lines.push('=== OBJETIVO ===');
  const vitalsParts = [];
  if (calculatedMetrics && typeof calculatedMetrics === 'object') {
    if (calculatedMetrics.pam !== undefined && calculatedMetrics.pam !== null) {
      vitalsParts.push(`PAM: ${calculatedMetrics.pam} mmHg`);
    }
    if (calculatedMetrics.indice_choque !== undefined && calculatedMetrics.indice_choque !== null) {
      vitalsParts.push(`Índice de Choque: ${calculatedMetrics.indice_choque}`);
    }
    if (calculatedMetrics.qsofa !== undefined && calculatedMetrics.qsofa !== null) {
      vitalsParts.push(`qSOFA: ${calculatedMetrics.qsofa}/3`);
    }
    if (calculatedMetrics.imc !== undefined && calculatedMetrics.imc !== null) {
      vitalsParts.push(`IMC: ${calculatedMetrics.imc} kg/m² (${calculatedMetrics.imc_classificacao || ''})`);
    }
  }

  if (vitalsParts.length > 0) {
    lines.push(`Sinais Vitais / Antropometria: ${vitalsParts.join(' | ')}`);
  }

  if (typeof o === 'string') {
    lines.push(o);
  } else if (o.texto_unificado) {
    lines.push(o.texto_unificado);
  } else {
    if (o.sinais_vitais_formatados || o.sinais_vitais_resumo) {
      lines.push(`Sinais Vitais Detalhados: ${o.sinais_vitais_formatados || o.sinais_vitais_resumo}`);
    }
    if (o.exame_fisico_sistemas) {
      lines.push(o.exame_fisico_sistemas);
    }
  }
  lines.push('');

  // =========================================================================
  // 3. AVALIAÇÃO
  // =========================================================================
  lines.push('=== AVALIAÇÃO ===');
  if (typeof a === 'string') {
    lines.push(a);
  } else {
    const hipoteses = Array.isArray(a.hipoteses_diagnosticas) ? a.hipoteses_diagnosticas : [];
    if (hipoteses.length > 0) {
      lines.push('Hipóteses Diagnósticas:');
      hipoteses.forEach((h, idx) => {
        const cid = h.cid10 ? ` [CID-10: ${h.cid10}]` : '';
        const prob = h.probabilidade ? ` (${h.probabilidade})` : '';
        lines.push(`  ${idx + 1}. ${h.descricao || 'Hipótese não especificada'}${cid}${prob}`);
        if (h.justificativa) {
          lines.push(`     Justificativa: ${h.justificativa}`);
        }
      });
    }

    if (a.raciocinio_clinico) {
      lines.push(`Raciocínio Clínico: ${a.raciocinio_clinico}`);
    }

    const redFlags = Array.isArray(a.red_flags)
      ? a.red_flags
      : (Array.isArray(a.sinais_de_alarme_identificados) ? a.sinais_de_alarme_identificados : null);
    if (Array.isArray(redFlags) && redFlags.length > 0) {
      lines.push(`Red Flags / Sinais de Alarme: ${redFlags.join('; ')}`);
    } else {
      lines.push('Red Flags / Sinais de Alarme: Não informados / Não documentados no relato.');
    }
  }
  lines.push('');

  // =========================================================================
  // 4. PLANO
  // =========================================================================
  lines.push('=== PLANO ===');
  if (typeof p === 'string') {
    lines.push(p);
  } else {
    const prescricoes = Array.isArray(p.prescricao) ? p.prescricao : [];
    if (prescricoes.length > 0) {
      lines.push('Conduta Medicamentosa:');
      prescricoes.forEach((med) => {
        const conc = med.concentracao ? ` ${med.concentracao}` : '';
        const pos = med.posologia ? ` - ${med.posologia}` : '';
        const dur = med.duracao ? ` (${med.duracao})` : '';
        const warn = med.has_allergy_warning ? ' [⚠️ ALERTA: COLISÃO DE ALERGIA - REVISÃO OBRIGATÓRIA]' : '';
        lines.push(`  • ${med.medicamento}${conc}${pos}${dur}${warn}`);
      });
    }

    const exames = Array.isArray(p.exames_solicitados) ? p.exames_solicitados : [];
    if (exames.length > 0) {
      lines.push(`Exames Solicitados: ${exames.join(', ')}`);
    }

    const orientacoes = Array.isArray(p.orientacoes_paciente)
      ? p.orientacoes_paciente
      : (Array.isArray(p.orientacoes_nao_farmacologicas) ? p.orientacoes_nao_farmacologicas : []);
    if (orientacoes.length > 0) {
      lines.push(`Orientações: ${orientacoes.join('; ')}`);
    }

    const retorno = p.criterios_retorno_encaminhamento || p.criterios_retorno_e_alarme;
    if (retorno) {
      lines.push(`Critérios de Retorno / Encaminhamento: ${retorno}`);
    }
  }

  return lines.join('\n').trim();
}

/**
 * Normaliza a via de administração para agrupamento no receituário médico.
 * Não inventa via oral quando a via não foi informada.
 *
 * @param {string} viaRaw - Via de administração bruta.
 * @returns {string} Cabeçalho padronizado de uso.
 */
function resolveRouteHeader(viaRaw) {
  const v = String(viaRaw || '').toUpperCase().trim();
  if (!v || v === 'NAO ESPECIFICADA' || v === 'NÃO ESPECIFICADA') {
    return 'VIA DE ADMINISTRAÇÃO A CONFIRMAR';
  }
  if (v.includes('ORAL') || v === 'VO' || v.includes('SUBLINGUAL') || v.includes('INTERNO')) {
    return 'USO ORAL / INTERNO';
  }
  if (v.includes('TOPICO') || v.includes('TÓPICO') || v.includes('DERMATO') || v.includes('EXTERNO')) {
    return 'USO EXTERNO / TÓPICO';
  }
  if (v.includes('INALAT') || v.includes('NEBULIZ') || v.includes('NASAL')) {
    return 'USO INALATÓRIO / NASAL';
  }
  if (v.includes('OFTALM') || v.includes('OFTÁLM') || v.includes('OCULAR')) {
    return 'USO OFTÁLMICO';
  }
  if (v.includes('OTOL') || v.includes('AURICULAR')) {
    return 'USO OTOLÓGICO';
  }
  if (v.includes('IM') || v.includes('IV') || v.includes('EV') || v.includes('SC') || v.includes('PARENTERAL') || v.includes('INJET')) {
    return 'USO PARENTERAL / INJETÁVEL';
  }
  if (v.includes('RETAL') || v.includes('VAGINAL')) {
    return `USO ${v}`;
  }
  return `VIA: ${v}`;
}

/**
 * Monta o receituário médico formatado e agrupado por via de administração.
 * Se houver alertas críticos pendentes (alergia ou pediatria sem peso), inclui banner explícito de bloqueio/revisão.
 *
 * @param {Array<Object>} prescricaoList - Lista de itens prescritos.
 * @param {Array<Object>} [criticalAlerts=[]] - Alertas críticos ativos.
 * @returns {string} Texto formatado do receituário médico.
 */
function formatClipboardPrescription(prescricaoList, criticalAlerts = []) {
  if (!Array.isArray(prescricaoList) || prescricaoList.length === 0) {
    return 'Nenhuma prescrição medicamentosa registrada para este atendimento.';
  }

  const grouped = {};

  prescricaoList.forEach((item) => {
    if (!item || !item.medicamento) return;
    const header = resolveRouteHeader(item.via);
    if (!grouped[header]) {
      grouped[header] = [];
    }
    grouped[header].push(item);
  });

  const sections = ['RECEITUÁRIO MÉDICO'];
  if (Array.isArray(criticalAlerts) && criticalAlerts.length > 0) {
    sections.push('⚠️ [PENDÊNCIA DE SEGURANÇA CLÍNICA — REVISÃO MÉDICA OBRIGATÓRIA ANTES DA DISPENSAÇÃO]');
    criticalAlerts.forEach((al) => {
      if (al && al.message) sections.push(`• ${al.message}`);
    });
  }
  sections.push('');

  let itemCounter = 1;

  for (const [routeHeader, items] of Object.entries(grouped)) {
    sections.push(routeHeader);
    sections.push('');

    items.forEach((med) => {
      const nome = String(med.medicamento || '').trim();
      const conc = med.concentracao && med.concentracao !== 'Não especificada' ? ` ${med.concentracao.trim()}` : '';
      const rawQtd = med.quantidade_dispensacao || med.quantidade_total || med.quantidade || '';
      const qtd = rawQtd ? String(rawQtd).trim() : 'A definir pelo prescritor';

      const posologia = String(med.posologia || 'Posologia a confirmar pelo médico prescritor.').trim();
      const duracao = med.duracao && !posologia.toLowerCase().includes(med.duracao.toLowerCase())
        ? ` (${med.duracao.trim()})`
        : '';
      const allergyFlag = med.has_allergy_warning ? ' [🚫 BLOQUEADO POR ALERGIA REGISTRADA]' : '';

      sections.push(`${itemCounter}. ${nome}${conc} --------- Qtd: ${qtd}${allergyFlag}`);
      sections.push(`   ${posologia}${duracao}`);
      sections.push('');
      itemCounter += 1;
    });
  }

  return sections.join('\n').trim();
}

/**
 * Orquestra o fluxo completo de geração, cálculo determinístico, RAG local TdC e validação de segurança do SOAP.
 *
 * @param {Object} payload - Dados da requisição clínica.
 * @returns {Promise<Object>} Resultado clínico consolidado e auditado.
 */
async function processClinicalSoap(payload = {}) {
  try {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload clínico inválido ou ausente.');
    }

    const normalizedPayload = normalizeSoapInputPayload(payload);
    const {
      brain_dump = '',
      patient_context = {},
      vitals = {},
      model_override = null
    } = normalizedPayload;

    if (!brain_dump || String(brain_dump).trim().length === 0) {
      throw new Error('O campo "brain_dump" (relato clínico) é obrigatório para processar o SOAP.');
    }

    // 1. Executa cálculos clínicos determinísticos (IMC, PAM, Índice de Choque, qSOFA, Pediatria)
    const calcResult = runAllCalculations(vitals, patient_context);

    // 1.5. Consulta RAG local em < 2ms no acervo "Tá de Clinicagem" (data/tdc_knowledge.db)
    const tdcEvidences = tdcService.buscarEvidenciasClinicas(brain_dump, 3);

    // 2. Invoca o agente especialista na Vertex AI com injeção das métricas exatas e evidências TdC
    const rawSoap = await generateSoapWithVertex({
      brain_dump,
      patient_context,
      vitals,
      calculated_metrics: calcResult.metrics,
      tdc_evidences: tdcEvidences,
      modelOverride: model_override
    });

    // 3. Executa trava de segurança determinística (Alergias por oração, Gestação, Duplicidades, Pediatria)
    const safetyResult = validateSafety(rawSoap, normalizedPayload);

    // 4. Consolida alertas sem duplicar alerta pediátrico de ausência de peso
    const mergedAlerts = [...calcResult.alerts];
    for (const sAlert of safetyResult.safety_alerts) {
      const isDuplicatePedWeight =
        sAlert.code === 'ALERTA_PEDIATRIA_REVISAO_DOSE' &&
        mergedAlerts.some((a) => a.code === 'ALERTA_PEDIATRIA_PESO_AUSENTE');
      if (!isDuplicatePedWeight) {
        mergedAlerts.push(sAlert);
      }
    }

    const criticalAlerts = mergedAlerts.filter((a) => a && a.severity === 'CRITICAL');
    const overallIsSafe = safetyResult.is_safe && criticalAlerts.length === 0;

    // 5. Formata textos prontos para área de transferência (Prontuário e Receituário)
    const sanitizedSoap = safetyResult.sanitized_soap;
    if (tdcEvidences.length > 0 && Array.isArray(sanitizedSoap.referencias_bibliograficas)) {
      for (const ev of tdcEvidences) {
        const jaExiste = sanitizedSoap.referencias_bibliograficas.some(
          (r) => r && String(r.diretriz || '').toLowerCase().includes(String(ev.title || '').toLowerCase())
        );
        if (!jaExiste) {
          sanitizedSoap.referencias_bibliograficas.push({
            orgao: `Acervo Clínico TdC (${ev.specialty || ev.category || 'Clínica Médica'})`,
            diretriz: ev.title,
            ano: ev.edition_date ? String(ev.edition_date).slice(0, 4) : '2025'
          });
        }
      }
    }

    const clipboardSoap = formatClipboardSoap(sanitizedSoap, calcResult.metrics);
    const clipboardPrescription = formatClipboardPrescription(
      sanitizedSoap?.plano?.prescricao || [],
      criticalAlerts
    );

    return {
      success: true,
      data: sanitizedSoap,
      calculated_metrics: calcResult.metrics,
      clinical_alerts: mergedAlerts,
      is_safe: overallIsSafe,
      clipboard: {
        soap_text: clipboardSoap,
        prescription_text: clipboardPrescription
      },
      _meta: {
        ...(rawSoap._meta || {}),
        tdc_rag_matches: tdcEvidences.length
      }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`[SOAP Service Error] Falha no processamento clínico: ${errorMessage}`);
  }
}

module.exports = {
  processClinicalSoap,
  normalizeSoapInputPayload,
  formatClipboardSoap,
  formatClipboardPrescription,
  resolveRouteHeader
};