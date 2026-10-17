const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const https = require('https');
const { VertexSoapOutputSchema } = require('../clinical/schemas/soap.schema.js');

const DEFAULT_PROJECT_ID = 'gen-lang-client-0798056953';
const DEFAULT_LOCATION = process.env.VERTEX_LOCATION || 'global';
const DEFAULT_MODEL = process.env.VERTEX_MODEL || 'gemini-4-argon';
const FALLBACK_MODEL = process.env.VERTEX_FALLBACK_MODEL || 'gemini-2.5-pro';
const REQUEST_TIMEOUT_MS = 30000;

let cachedToken = null;
let tokenExpirationTime = 0;
let cachedCredentials = null;

/**
 * Localiza e carrega o arquivo de credenciais da Service Account do Google Cloud.
 */
function loadCredentials() {
  if (cachedCredentials) {
    return cachedCredentials;
  }

  const candidatePaths = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.join(os.homedir(), '.gemini', 'config', 'vertex-key.json'),
    path.resolve(process.cwd(), 'google-credentials.json'),
    path.resolve(process.cwd(), 'vertex-key.json')
  ].filter(Boolean);

  for (const credPath of candidatePaths) {
    try {
      if (fs.existsSync(credPath)) {
        const raw = fs.readFileSync(credPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.client_email && parsed.private_key) {
          cachedCredentials = parsed;
          return cachedCredentials;
        }
      }
    } catch (err) {
      // Continua tentando os próximos caminhos válidos
    }
  }

  throw new Error(
    'Credenciais Vertex AI não encontradas. Configure GOOGLE_APPLICATION_CREDENTIALS ou ~/.gemini/config/vertex-key.json.'
  );
}

/**
 * Codifica buffer ou string para Base64URL.
 */
function base64UrlEncode(input) {
  const base64 = Buffer.isBuffer(input)
    ? input.toString('base64')
    : Buffer.from(input, 'utf8').toString('base64');
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Realiza chamadas HTTPS nativas com suporte a Timeout rigoroso.
 */
function httpsRequest(url, options, bodyString) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let responseBody = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, body: responseBody });
        } else {
          const error = new Error(`HTTP Error ${res.statusCode}: ${responseBody}`);
          error.statusCode = res.statusCode;
          error.responseBody = responseBody;
          reject(error);
        }
      });
    });

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`Request timeout após ${REQUEST_TIMEOUT_MS}ms para ${url}`));
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (bodyString) {
      req.write(bodyString);
    }
    req.end();
  });
}

/**
 * Obtém um token OAuth2 válido para a Vertex AI utilizando assinatura RSA-SHA256 e cache em memória.
 */
async function getAccessToken() {
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (cachedToken && nowSeconds < tokenExpirationTime - 120) {
    return cachedToken;
  }

  const credentials = loadCredentials();
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const exp = nowSeconds + 3600;
  const payload = {
    iss: credentials.client_email,
    sub: credentials.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: nowSeconds,
    exp: exp,
    scope: 'https://www.googleapis.com/auth/cloud-platform'
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();

  const signature = signer.sign(credentials.private_key);
  const encodedSignature = base64UrlEncode(signature);
  const jwt = `${unsignedToken}.${encodedSignature}`;

  const postData = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt
  }).toString();

  const response = await httpsRequest(
    'https://oauth2.googleapis.com/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    },
    postData
  );

  const tokenData = JSON.parse(response.body);
  if (!tokenData.access_token) {
    throw new Error('Falha ao obter access_token na resposta OAuth2 do Google.');
  }

  cachedToken = tokenData.access_token;
  tokenExpirationTime = nowSeconds + (tokenData.expires_in || 3600);

  return cachedToken;
}

/**
 * Constrói o System Prompt Clínico Mestre do Preceptor Sênior.
 */
function buildClinicalSystemPrompt() {
  return `Você é um Preceptor Sênior de Clínica Médica, Medicina de Família e Comunidade e Medicina de Emergência atuando no Brasil.
Sua função é estruturar notas clínicas no formato SOAP (Subjetivo, Objetivo, Avaliação e Plano) de altíssimo rigor técnico a partir de relatos livres (brain dump), sinais vitais e métricas clínicas calculadas.

DIRETRIZES CLÍNICAS E SEMIOLÓGICAS OBRIGATÓRIAS:
1. TRADUÇÃO SEMIOLÓGICA TÉCNICA:
   - Converta expressões coloquiais ou leigas para terminologia médica semiológica precisa no Subjetivo (ex.: "dor no peito em queimação" -> "dor torácica retroesternal em pirose/queimação"; "falta de ar ao deitar" -> "ortopneia"; "falta de ar" -> "dispneia"; "batedeira no peito" -> "palpitações"; "urina solta" -> "incontinência urinária").
   - Organize a História da Doença Atual (HDA) de forma cronológica, clara e concisa, preservando negativas pertinentes.

2. FIDELIDADE AO EXAME FÍSICO (PROIBIÇÃO DE ALUCINAÇÃO):
   - NUNCA invente, presuma ou adicione achados de exame físico que não foram explicitamente informados no relato ou nos sinais vitais.
   - Caso faltem dados críticos do exame físico para a queixa principal (ex.: ausência de ausculta cardíaca/pulmonar em paciente com dispneia, ou ausência de sinais de irritação peritoneal em dor abdominal), aponte explicitamente a sugestão do que deve ser examinado no campo apropriado do Objetivo, sem falsificar que o exame já foi feito.

3. FARMACOLOGIA E PRESCRIÇÃO (PADRÃO ANVISA / RENAME / DCB):
   - Utilize estritamente a Denominação Comum Brasileira (DCB) para todos os fármacos (ex.: "dipirona sódica", "losartana potássica", "amoxicilina + clavulanato de potássio", "omeprazol"). Nunca utilize nomes comerciais.
   - Especifique apresentações farmacêuticas, concentrações, posologias, vias de administração e durações reais comercializadas no Brasil e disponíveis no SUS/RENAME ou farmácias comunitárias brasileiras.

4. ANCORAGEM EM DIRETRIZES NACIONAIS BRASILEIRAS:
   - Baseie o raciocínio diagnóstico, estratificação de risco e condutas terapêuticas nas diretrizes médicas brasileiras vigentes: Protocolos Clínicos e Diretrizes Terapêuticas (PCDTs) do Ministério da Saúde, Sociedade Brasileira de Cardiologia (SBC), Sociedade Brasileira de Pneumologia e Tisiologia (SBPT), Federação Brasileira das Associações de Ginecologia e Obstetrícia (FEBRASGO), Sociedade Brasileira de Diabetes (SBD) e Cadernos de Atenção Básica.
   - Utilize códigos CID-10 oficiais e precisos nas hipóteses diagnósticas.

5. INTEGRAÇÃO COM MÉTRICAS DETERMINÍSTICAS:
   - Incorpore e interprete clinicamente no Objetivo e na Avaliação todos os escores e índices determinísticos fornecidos em "calculated_metrics" (ex.: IMC, PAM, Clearance de Creatinina CKD-EPI, escores de risco), não contradizendo os valores matemáticos já calculados.

6. FORMATO DE SAÍDA:
   - Responda exclusivamente com um objeto JSON estritamente válido e compatível com o schema estruturado solicitado.`;
}

/**
 * Monta o prompt de entrada do usuário consolidando o relato livre e os dados estruturados.
 */
function buildUserPrompt({ brain_dump, patient_context, vitals, calculated_metrics, tdc_evidences }) {
  const payload = {
    relato_clinico_livre_brain_dump: brain_dump || '',
    contexto_demografico_paciente: patient_context || {},
    sinais_vitais_brutos: vitals || {},
    metricas_deterministicas_calculadas: calculated_metrics || {},
    evidencias_clinicas_locais_tdc: Array.isArray(tdc_evidences) ? tdc_evidences : []
  };

  return `Analise os dados clínicos do atendimento abaixo e gere o registro estruturado SOAP completo seguindo rigorosamente as instruções do sistema:

${JSON.stringify(payload, null, 2)}`;
}

/**
 * Executa a chamada à API generateContent da Vertex AI para um modelo específico.
 */
async function callVertexModel({ model, systemPrompt, userPrompt, accessToken, projectId, location }) {
  const host = location === 'global'
    ? 'aiplatform.googleapis.com'
    : `${location}-aiplatform.googleapis.com`;

  const url = `https://${host}/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

  const requestPayload = {
    systemInstruction: {
      role: 'system',
      parts: [{ text: systemPrompt }]
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: VertexSoapOutputSchema
    }
  };

  const bodyString = JSON.stringify(requestPayload);

  const response = await httpsRequest(
    url,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyString)
      }
    },
    bodyString
  );

  const parsedResponse = JSON.parse(response.body);
  const candidateText = parsedResponse?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!candidateText) {
    throw new Error(`Resposta da Vertex AI (${model}) não contém texto válido no candidato.`);
  }

  return JSON.parse(candidateText);
}

/**
 * Gera a evolução clínica estruturada no padrão SOAP utilizando a Vertex AI com fallback resiliente.
 */
async function generateSoapWithVertex({
  brain_dump,
  patient_context = {},
  vitals = {},
  calculated_metrics = {},
  tdc_evidences = [],
  modelOverride = null
}) {
  if (!brain_dump || typeof brain_dump !== 'string' || !brain_dump.trim()) {
    throw new Error('O parâmetro "brain_dump" é obrigatório e deve ser uma string não vazia.');
  }

  const startTime = Date.now();
  const credentials = loadCredentials();
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || credentials.project_id || DEFAULT_PROJECT_ID;
  const location = DEFAULT_LOCATION;
  const primaryModel = modelOverride || DEFAULT_MODEL;

  const accessToken = await getAccessToken();
  const systemPrompt = buildClinicalSystemPrompt();
  const userPrompt = buildUserPrompt({
    brain_dump,
    patient_context,
    vitals,
    calculated_metrics,
    tdc_evidences
  });

  let soapObject = null;
  let modelUsed = primaryModel;

  try {
    soapObject = await callVertexModel({
      model: primaryModel,
      systemPrompt,
      userPrompt,
      accessToken,
      projectId,
      location
    });
  } catch (primaryError) {
    const isRecoverable =
      !primaryError.statusCode ||
      primaryError.statusCode === 429 ||
      primaryError.statusCode === 404 ||
      primaryError.statusCode >= 500 ||
      /timeout/i.test(primaryError.message);

    if (isRecoverable && primaryModel !== FALLBACK_MODEL) {
      modelUsed = FALLBACK_MODEL;
      soapObject = await callVertexModel({
        model: FALLBACK_MODEL,
        systemPrompt,
        userPrompt,
        accessToken,
        projectId,
        location
      });
    } else {
      throw primaryError;
    }
  }

  const executionTimeMs = Date.now() - startTime;

  return {
    ...soapObject,
    _meta: {
      model_used: modelUsed,
      execution_time_ms: executionTimeMs
    }
  };
}

module.exports = {
  generateSoapWithVertex,
  buildClinicalSystemPrompt
};
