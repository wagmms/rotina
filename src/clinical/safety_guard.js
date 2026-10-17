/**
 * @file src/clinical/safety_guard.js
 * @description Guardião Determinístico de Segurança Clínica (Zero-Hallucination Safety Layer)
 * Valida prescrições geradas por IA contra alergias declaradas (com resolução por cláusula/oração),
 * reações cruzadas, contraindicações na gestação, duplicidades terapêuticas e regras pediátricas.
 */

'use strict';

const DRUG_FAMILIES = {
  DIPIRONA: [
    'dipirona',
    'metamizol',
    'novalgina',
    'lisador',
    'buscopan composto',
    'dorflex',
    'neosaldina'
  ],
  PENICILINAS: [
    'penicilina',
    'amoxicilina',
    'ampicilina',
    'clavulanato',
    'benzetacil',
    'benzilpenicilina',
    'piperacilina',
    'tazobactam',
    'oxacilina'
  ],
  SULFAMIDAS: [
    'sulfa',
    'sulfamida',
    'sulfametoxazol',
    'trimetoprima',
    'bactrim',
    'sulfadiazina'
  ],
  AINES: [
    'aine',
    'aines',
    'anti-inflamatorio',
    'antiinflamatorio',
    'ibuprofeno',
    'cetoprofeno',
    'diclofenaco',
    'nimesulida',
    'cetorolaco',
    'piroxicam',
    'meloxicam',
    'tenoxicam',
    'naproxeno',
    'celecoxibe',
    'etoricoxibe',
    'indometacina'
  ],
  SALICILATOS: [
    'aas',
    'aspirina',
    'acido acetilsalicilico'
  ],
  MACROLIDEOS: [
    'macrolideo',
    'azitromicina',
    'claritromicina',
    'eritromicina'
  ],
  QUINOLONAS: [
    'quinolona',
    'ciprofloxacino',
    'ciprofloxacina',
    'levofloxacino',
    'moxifloxacino',
    'norfloxacino'
  ],
  IECA_BRA: [
    'enalapril',
    'captopril',
    'ramipril',
    'lisinopril',
    'perindopril',
    'losartana',
    'valsartana',
    'candesartana',
    'olmesartana',
    'telmisartana'
  ],
  ESTATINAS: [
    'sinvastatina',
    'atorvastatina',
    'rosuvastatina',
    'pravastatina',
    'pitavastatina'
  ],
  TETRACICLINAS: [
    'doxiciclina',
    'tetraciclina',
    'minociclina'
  ],
  TERATOGENICOS_ESTRITOS: [
    'metotrexato',
    'isotretinoina',
    'acitretina',
    'talidomida',
    'varfarina',
    'misoprostol',
    'micofenolato',
    'valproato',
    'acido valproico'
  ]
};

const PREGNANCY_CONTRAINDICATED_FAMILIES = new Set([
  'AINES',
  'QUINOLONAS',
  'IECA_BRA',
  'ESTATINAS',
  'TETRACICLINAS',
  'TERATOGENICOS_ESTRITOS'
]);

const NEGATION_TERMS = [
  'nega',
  'sem alergia',
  'sem alergias',
  'nao possui',
  'nao refere',
  'nao relatada',
  'nao tem',
  'desconhece',
  'ndn',
  'nada digno de nota',
  'ausente',
  'ausentes',
  'nenhuma'
];

/**
 * Normaliza texto removendo acentos, convertendo para minúsculas e limpando espaços extras.
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Verifica se uma cláusula/oração individual representa uma negação clínica (ex: "nega alergia à dipirona").
 * IMPORTANTE: Deve ser avaliada sobre cada oração/cláusula separada, nunca sobre um parágrafo composto inteiro!
 * @param {string} normalizedClause
 * @returns {boolean}
 */
function isNegatedAllergy(normalizedClause) {
  if (!normalizedClause) return true;
  return NEGATION_TERMS.some((term) => normalizedClause.includes(term));
}

/**
 * Divide um texto de alergias em orações/itens independentes e extrai apenas as alergias positivas.
 * Exemplo: "Alergia à amoxicilina; nega alergia à dipirona" -> extrai ["amoxicilina"] e descarta a oração negada.
 * @param {string} rawString
 * @param {Set<string>} targetSet
 */
function parseAllergyClausesIntoSet(rawString, targetSet) {
  if (!rawString || typeof rawString !== 'string') return;
  const normFull = normalizeText(rawString);
  if (!normFull) return;

  // 1. Primeiro divide por separadores de oração/cláusula (ponto-e-vírgula, ponto, quebra de linha, conjunções adversativas)
  const clauses = normFull.split(/[;.\n/]+|\b(?:mas|porem|contudo|entretanto|exceto)\b/i);

  for (const rawClause of clauses) {
    const clause = rawClause.trim();
    if (!clause) continue;

    // Se a cláusula contiver vírgulas, avaliamos sub-segmentos caso um deles tenha negação explícita
    const subClauses = clause.split(',');
    let clauseNegatedContext = false;

    for (const sub of subClauses) {
      const subTrim = sub.trim();
      if (!subTrim) continue;

      if (isNegatedAllergy(subTrim)) {
        clauseNegatedContext = true;
        continue;
      }

      // Se o segmento anterior era "nega alergia a X, Y", mas este segmento diz explicitamente "alergia a Z"
      const hasPositiveMarker = /\b(?:alergia|alergico|alergica|hipersensibilidade|intolerancia|reacao)\b/.test(subTrim);
      if (clauseNegatedContext && !hasPositiveMarker) {
        continue;
      }
      if (hasPositiveMarker) {
        clauseNegatedContext = false;
      }

      // Divide itens coordenados por " e " dentro de uma afirmação positiva
      const items = subTrim.split(/\be\b/);
      for (const item of items) {
        if (isNegatedAllergy(item)) continue;
        const cleaned = item
          .replace(/^(?:possui|tem|relata|refere|historico de|alergias|alergia|alergico|alergica|hipersensibilidade|a|ao|as|aos|de|por)\s*:?\s*/g, '')
          .replace(/^(?:alergias|alergia|alergico|alergica|a|ao|as|aos)\s*:?\s*/g, '')
          .replace(/\b(?:medicamentosa|medicamentosas|conhecida|conhecidas|grave|leve|moderada)\b/g, '')
          .trim();

        if (cleaned && cleaned.length > 2 && !isNegatedAllergy(cleaned)) {
          targetSet.add(cleaned);
        }
      }
    }
  }
}

/**
 * Extrai e consolida a lista de termos alergênicos do contexto bruto e do SOAP gerado.
 * @param {Object} soapResult
 * @param {Object} rawInput
 * @returns {Array<string>}
 */
function extractPatientAllergies(soapResult, rawInput) {
  const allergySet = new Set();

  // 1. Extração a partir do contexto estruturado do paciente (patient_context.alergias ou raiz alergias)
  const rawAllergies = rawInput?.patient_context?.alergias ?? rawInput?.alergias;
  if (Array.isArray(rawAllergies)) {
    rawAllergies.forEach((item) => {
      parseAllergyClausesIntoSet(String(item || ''), allergySet);
    });
  } else if (typeof rawAllergies === 'string') {
    parseAllergyClausesIntoSet(rawAllergies, allergySet);
  }

  // 2. Extração a partir do campo subjetivo gerado pela IA
  const soapAllergyText =
    soapResult?.subjetivo_formatado?.alergias ??
    (typeof soapResult?.subjetivo === 'object' ? soapResult?.subjetivo?.alergias : null);
  if (typeof soapAllergyText === 'string') {
    parseAllergyClausesIntoSet(soapAllergyText, allergySet);
  }

  return Array.from(allergySet);
}

/**
 * Identifica a quais famílias farmacológicas um determinado termo pertence.
 * @param {string} normalizedTerm
 * @returns {Array<string>} Nomes das famílias
 */
function findDrugFamilies(normalizedTerm) {
  const matchedFamilies = [];

  for (const [familyName, synonyms] of Object.entries(DRUG_FAMILIES)) {
    const belongsToFamily = synonyms.some(
      (synonym) =>
        normalizedTerm.includes(synonym) || synonym.includes(normalizedTerm)
    );
    if (belongsToFamily) {
      matchedFamilies.push(familyName);
    }
  }

  return matchedFamilies;
}

/**
 * Valida a segurança clínica do SOAP gerado contra os dados do paciente.
 * @param {Object} soapResult Objeto no formato VertexSoapOutputSchema
 * @param {Object} rawInput Dados de entrada originais (patient_context, vitals)
 * @returns {Object} { is_safe, safety_alerts, sanitized_soap }
 */
function validateSafety(soapResult, rawInput = {}) {
  const safetyAlerts = [];
  const sanitizedSoap = soapResult ? structuredClone(soapResult) : {};

  if (!Array.isArray(sanitizedSoap.alertas_seguranca)) {
    sanitizedSoap.alertas_seguranca = [];
  }

  const patientAllergies = extractPatientAllergies(sanitizedSoap, rawInput);
  const prescriptions = sanitizedSoap?.plano?.prescricao;
  const isPregnant = Boolean(
    rawInput?.patient_context?.gestante === true ||
    rawInput?.gestante === true
  );

  const seenFamiliesInPrescription = new Map();

  // 1. Validação de Colisão de Alergias, Reações Cruzadas, Gestação e Duplicidade
  if (Array.isArray(prescriptions)) {
    prescriptions.forEach((item) => {
      if (!item || typeof item.medicamento !== 'string') return;

      const normMed = normalizeText(item.medicamento);
      if (!normMed) return;

      const medFamilies = findDrugFamilies(normMed);
      let collisionDetected = false;

      // 1.1 Colisão de Alergias e Reatividade Cruzada
      for (const allergyTerm of patientAllergies) {
        const isDirectMatch =
          normMed.includes(allergyTerm) || allergyTerm.includes(normMed);

        const allergyFamilies = findDrugFamilies(allergyTerm);
        const sharedFamilies = medFamilies.filter((fam) =>
          allergyFamilies.includes(fam)
        );
        const isCrossReaction = sharedFamilies.length > 0;

        if (isDirectMatch || isCrossReaction) {
          collisionDetected = true;
          const familyInfo = isCrossReaction
            ? ` (Grupo Farmacológico: ${sharedFamilies.join(', ')})`
            : '';

          const alertMessage = `Risco grave: Prescrição de "${item.medicamento}" colide com alergia registrada a "${allergyTerm}"${familyInfo}.`;

          safetyAlerts.push({
            type: 'CONTRAINDICATION_ALLERGY',
            code: 'ALERTA_COLISAO_ALERGIA_MEDICAMENTOSA',
            severity: 'CRITICAL',
            title: 'Contraindicação por Alergia',
            medication: item.medicamento,
            allergy: allergyTerm,
            message: alertMessage
          });

          if (!sanitizedSoap.alertas_seguranca.includes(alertMessage)) {
            sanitizedSoap.alertas_seguranca.push(alertMessage);
          }
        }
      }

      // 1.2 Proteção Materno-Fetal na Gestação
      if (isPregnant) {
        const contraindicatedFam = medFamilies.filter((fam) =>
          PREGNANCY_CONTRAINDICATED_FAMILIES.has(fam)
        );
        if (contraindicatedFam.length > 0) {
          const pregMsg = `Risco obstétrico/teratogênico: "${item.medicamento}" (${contraindicatedFam.join(', ')}) contraindicado ou de alto risco na gestação.`;
          safetyAlerts.push({
            type: 'CONTRAINDICATION_PREGNANCY',
            code: 'ALERTA_CONTRAINDICACAO_GESTACAO',
            severity: 'CRITICAL',
            title: 'Contraindicação na Gestação',
            medication: item.medicamento,
            message: pregMsg
          });
          if (!sanitizedSoap.alertas_seguranca.includes(pregMsg)) {
            sanitizedSoap.alertas_seguranca.push(pregMsg);
          }
        }
      }

      // 1.3 Detecção de Duplicidade Farmacológica na mesma prescrição
      for (const fam of medFamilies) {
        if (seenFamiliesInPrescription.has(fam)) {
          const prevMed = seenFamiliesInPrescription.get(fam);
          if (normalizeText(prevMed) !== normMed) {
            const dupMsg = `Duplicidade terapêutica detectada no grupo ${fam}: "${prevMed}" e "${item.medicamento}".`;
            safetyAlerts.push({
              type: 'DUPLICATION_THERAPEUTIC',
              code: 'ALERTA_DUPLICIDADE_TERAPEUTICA',
              severity: 'WARNING',
              title: 'Duplicidade Farmacológica',
              medication: item.medicamento,
              message: dupMsg
            });
            if (!sanitizedSoap.alertas_seguranca.includes(dupMsg)) {
              sanitizedSoap.alertas_seguranca.push(dupMsg);
            }
          }
        } else {
          seenFamiliesInPrescription.set(fam, item.medicamento);
        }
      }

      item.has_allergy_warning = Boolean(collisionDetected);
    });
  }

  // 2. Validação Pediátrica (< 12 anos sem peso aferido)
  const rawAge = rawInput?.patient_context?.idade ?? rawInput?.idade;
  const age = typeof rawAge === 'number' ? rawAge : parseFloat(rawAge);
  const weight =
    rawInput?.patient_context?.peso ??
    rawInput?.vitals?.peso ??
    rawInput?.vitals?.weight ??
    rawInput?.sinais_vitais?.peso ??
    rawInput?.peso;

  const isPediatric = !Number.isNaN(age) && age < 12;
  const isWeightMissing =
    weight === undefined ||
    weight === null ||
    weight === '' ||
    Number.isNaN(parseFloat(weight)) ||
    parseFloat(weight) <= 0;

  if (isPediatric && isWeightMissing) {
    const pedMessage =
      'Paciente pediátrico (< 12 anos) sem peso aferido: obrigatório confirmar dose ponderal em mg/kg antes da administração.';

    safetyAlerts.push({
      type: 'CRITICAL_PEDIATRIC_PENDING',
      code: 'ALERTA_PEDIATRIA_REVISAO_DOSE',
      severity: 'CRITICAL',
      title: 'Pendência Pediátrica Crítica',
      message: pedMessage
    });

    if (!sanitizedSoap.alertas_seguranca.includes(pedMessage)) {
      sanitizedSoap.alertas_seguranca.push(pedMessage);
    }
  }

  const hasCriticalAlerts = safetyAlerts.some(
    (alert) => alert.severity === 'CRITICAL'
  );

  return {
    is_safe: !hasCriticalAlerts,
    safety_alerts: safetyAlerts,
    sanitized_soap: sanitizedSoap
  };
}

module.exports = {
  validateSafety,
  extractPatientAllergies,
  isNegatedAllergy
};