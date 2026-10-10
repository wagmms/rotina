/**
 * ==============================================================================
 * ULTRA ROTINA · VALIDATORES E SCHEMAS FASTIFY (HANDSHAKE DE ALTA PERFORMANCE)
 * ==============================================================================
 * Sanitização e validação de parâmetros na camada HTTP antes de entrar no runtime.
 * Descarta tipos incorretos em 0ms sem consumir processamento da VM V8.
 * ==============================================================================
 */

// Limites fisiológicos e faixas biológicas beira-leito
const LIMITES_FISIOLOGICOS = {
  peso: { min: 0.4, max: 350.0, nome: 'Peso corporal', unidade: 'kg' },
  idade: { min: 0, max: 125, nome: 'Idade', unidade: 'anos' },
  creatinina: { min: 0.1, max: 30.0, nome: 'Creatinina sérica', unidade: 'mg/dL' },
  ph: { min: 6.70, max: 7.80, nome: 'pH sanguíneo', unidade: '' },
  pco2: { min: 10, max: 150, nome: 'pCO₂ arterial', unidade: 'mmHg' },
  hco3: { min: 2, max: 60, nome: 'Bicarbonato (HCO₃⁻)', unidade: 'mEq/L' },
  na: { min: 90, max: 180, nome: 'Sódio sérico (Na⁺)', unidade: 'mEq/L' },
  cl: { min: 60, max: 160, nome: 'Cloro sérico (Cl⁻)', unidade: 'mEq/L' },
  alb: { min: 0.5, max: 7.0, nome: 'Albumina sérica', unidade: 'g/dL' },
  pao2: { min: 15, max: 600, nome: 'PaO₂ arterial', unidade: 'mmHg' },
  fio2: { min: 0.21, max: 100, nome: 'FiO₂', unidade: '%' },
  k: { min: 1.0, max: 10.0, nome: 'Potássio sérico (K⁺)', unidade: 'mEq/L' },
  clcr: { min: 0, max: 250, nome: 'Clearance de Creatinina', unidade: 'mL/min' },
  pfe: { min: 0, max: 1000, nome: 'Pico de Fluxo Expiratório (PFE)', unidade: 'L/min' }
};

const DROGAS_DVA_VALIDAS = new Set(['nora', 'dobuta', 'vaso', 'adrena', 'adrenalina', 'nipride', 'tridil']);
const CENARIOS_SRI_VALIDOS = new Set(['padrao', 'choque', 'asma', 'neuro', 'tce', 'hic']);
const TIPOS_CALCULADORA_VALIDOS = new Set([
  'dva', 'sri', 'crcl', 'gaso', 'ajuste_atb', 'atb',
  'pediatria', 'pals', 'holliday', 'dhe', 'eletrolitos', 'hidroeletrolitico',
  'heart', 'sca', 'cardiologia', 'asma', 'crise_asmatica', 'broncoespasmo'
]);

/**
 * Normaliza um valor para número finito ou null se inválido.
 */
function normalizarNumero(val) {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : null;
  }
  if (typeof val === 'string') {
    const limpo = val.trim().replace(',', '.');
    if (!limpo) return null;
    const num = Number(limpo);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

/**
 * Validação fisiológica e sanitização de limites de entrada.
 */
function validarParametroFisiologico(chave, valor, obrigatorio = false) {
  const config = LIMITES_FISIOLOGICOS[chave];
  if (!config) return { valido: true, valor };

  if (valor === undefined || valor === null || valor === '') {
    if (obrigatorio) {
      return { valido: false, erro: `${config.nome} é de preenchimento obrigatório.` };
    }
    return { valido: true, valor: null };
  }

  const num = normalizarNumero(valor);
  if (num === null) {
    return { valido: false, erro: `Valor inválido ou não numérico para ${config.nome}.` };
  }

  if (num < config.min || num > config.max) {
    const unidadeStr = config.unidade ? ` ${config.unidade}` : '';
    return {
      valido: false,
      erro: `${config.nome} (${num}${unidadeStr}) fora dos limites fisiológicos admitidos (${config.min} a ${config.max}${unidadeStr}).`
    };
  }

  return { valido: true, valor: num };
}

/**
 * Sanitiza e valida parâmetros das calculadoras beira-leito.
 * Retorna { valido: boolean, erro?: string, entradaSanitizada?: object }
 */
function validarParametrosCalculadora(tipoRaw, entradaRaw) {
  if (!tipoRaw || typeof tipoRaw !== 'string') {
    return { valido: false, erro: 'Tipo de calculadora deve ser uma string válida.' };
  }
  const tipo = tipoRaw.trim().toLowerCase();
  if (!TIPOS_CALCULADORA_VALIDOS.has(tipo)) {
    return {
      valido: false,
      erro: `Tipo de calculadora "${tipo}" não reconhecido. Suportados: ${Array.from(TIPOS_CALCULADORA_VALIDOS).join(', ')}.`
    };
  }

  if (!entradaRaw || typeof entradaRaw !== 'object' || Array.isArray(entradaRaw)) {
    return { valido: false, erro: 'Parâmetros da calculadora devem ser um objeto JSON não nulo.' };
  }

  // Prevenção contra poluição de protótipo
  const entrada = Object.create(null);
  for (const chave of Object.keys(entradaRaw)) {
    if (chave === '__proto__' || chave === 'constructor' || chave === 'prototype') continue;
    entrada[chave] = entradaRaw[chave];
  }

  const entradaSanitizada = {};

  // Validação específica por tipo
  switch (tipo) {
    case 'dva': {
      const droga = typeof entrada.droga === 'string' ? entrada.droga.trim().toLowerCase() : '';
      if (!DROGAS_DVA_VALIDAS.has(droga)) {
        return {
          valido: false,
          erro: `Droga vasoativa inválida ("${entrada.droga}"). Opções: ${Array.from(DROGAS_DVA_VALIDAS).join(', ')}.`
        };
      }
      const vPeso = validarParametroFisiologico('peso', entrada.peso, true);
      if (!vPeso.valido) return vPeso;

      entradaSanitizada.droga = droga;
      entradaSanitizada.peso = vPeso.valor;
      entradaSanitizada.solucao = typeof entrada.solucao === 'string' ? entrada.solucao.trim().slice(0, 50) : 'padrao';
      break;
    }

    case 'sri': {
      const cenario = typeof entrada.cenario === 'string' ? entrada.cenario.trim().toLowerCase() : '';
      if (!CENARIOS_SRI_VALIDOS.has(cenario)) {
        return {
          valido: false,
          erro: `Cenário de SRI inválido ("${entrada.cenario}"). Opções: ${Array.from(CENARIOS_SRI_VALIDOS).join(', ')}.`
        };
      }
      const vPeso = validarParametroFisiologico('peso', entrada.peso, true);
      if (!vPeso.valido) return vPeso;

      entradaSanitizada.cenario = cenario;
      entradaSanitizada.peso = vPeso.valor;
      break;
    }

    case 'crcl': {
      const vCr = validarParametroFisiologico('creatinina', entrada.creatinina, true);
      if (!vCr.valido) return vCr;

      const vPeso = validarParametroFisiologico('peso', entrada.peso, true);
      if (!vPeso.valido) return vPeso;

      const vIdade = validarParametroFisiologico('idade', entrada.idade, true);
      if (!vIdade.valido) return vIdade;

      let sexo = null;
      if (entrada.sexo !== undefined && entrada.sexo !== null) {
        const s = String(entrada.sexo).trim().toLowerCase();
        if (['f', 'feminino'].includes(s)) sexo = 'f';
        else if (['m', 'masculino'].includes(s)) sexo = 'm';
        else return { valido: false, erro: 'Sexo deve ser "m" (masculino) ou "f" (feminino).' };
      }

      entradaSanitizada.creatinina = vCr.valor;
      entradaSanitizada.peso = vPeso.valor;
      entradaSanitizada.idade = vIdade.valor;
      entradaSanitizada.sexo = sexo;
      break;
    }

    case 'gaso': {
      const vPh = validarParametroFisiologico('ph', entrada.ph, true);
      if (!vPh.valido) return vPh;

      const vPco2 = validarParametroFisiologico('pco2', entrada.pco2, true);
      if (!vPco2.valido) return vPco2;

      const vHco3 = validarParametroFisiologico('hco3', entrada.hco3, true);
      if (!vHco3.valido) return vHco3;

      entradaSanitizada.ph = vPh.valor;
      entradaSanitizada.pco2 = vPco2.valor;
      entradaSanitizada.hco3 = vHco3.valor;

      if (entrada.na !== undefined && entrada.na !== null && entrada.na !== '') {
        const vNa = validarParametroFisiologico('na', entrada.na);
        if (!vNa.valido) return vNa;
        entradaSanitizada.na = vNa.valor;
      }
      if (entrada.cl !== undefined && entrada.cl !== null && entrada.cl !== '') {
        const vCl = validarParametroFisiologico('cl', entrada.cl);
        if (!vCl.valido) return vCl;
        entradaSanitizada.cl = vCl.valor;
      }
      if (entrada.alb !== undefined && entrada.alb !== null && entrada.alb !== '') {
        const vAlb = validarParametroFisiologico('alb', entrada.alb);
        if (!vAlb.valido) return vAlb;
        entradaSanitizada.alb = vAlb.valor;
      }
      const pao2Raw = entrada.pao2 !== undefined ? entrada.pao2 : entrada.po2;
      if (pao2Raw !== undefined && pao2Raw !== null && pao2Raw !== '') {
        const vPao2 = validarParametroFisiologico('pao2', pao2Raw);
        if (!vPao2.valido) return vPao2;
        entradaSanitizada.pao2 = vPao2.valor;
      }
      if (entrada.fio2 !== undefined && entrada.fio2 !== null && entrada.fio2 !== '') {
        const vFio2 = validarParametroFisiologico('fio2', entrada.fio2);
        if (!vFio2.valido) return vFio2;
        entradaSanitizada.fio2 = vFio2.valor;
      }
      break;
    }

    case 'ajuste_atb':
    case 'atb': {
      entradaSanitizada.droga = typeof entrada.droga === 'string'
        ? entrada.droga.trim().slice(0, 80)
        : (typeof entrada.farmaco === 'string' ? entrada.farmaco.trim().slice(0, 80) : 'meropenem');
      
      const clcrVal = entrada.clcr !== undefined ? entrada.clcr : entrada.crcl;
      if (clcrVal !== undefined && clcrVal !== null && clcrVal !== '') {
        const vClcr = validarParametroFisiologico('clcr', clcrVal);
        if (!vClcr.valido) return vClcr;
        entradaSanitizada.clcr = vClcr.valor;
      }
      entradaSanitizada.hemodialise = Boolean(entrada.hemodialise || entrada.hd);
      break;
    }

    case 'pediatria':
    case 'pals':
    case 'holliday': {
      const vPeso = validarParametroFisiologico('peso', entrada.peso, true);
      if (!vPeso.valido) return vPeso;
      if (vPeso.valor > 150.0) {
        return { valido: false, erro: 'Peso acima do limite pediátrico de 150.0 kg.' };
      }
      entradaSanitizada.peso = vPeso.valor;

      if (entrada.idade !== undefined && entrada.idade !== null && entrada.idade !== '') {
        const vIdade = validarParametroFisiologico('idade', entrada.idade);
        if (!vIdade.valido) return vIdade;
        if (vIdade.valor > 18) {
          return { valido: false, erro: 'Idade acima do limite pediátrico de 18 anos.' };
        }
        entradaSanitizada.idade = vIdade.valor;
      }
      entradaSanitizada.modo = typeof entrada.modo === 'string' ? entrada.modo.trim().toLowerCase() : (tipo === 'pals' ? 'pals' : 'holliday');
      if (entrada.condicaoClinica) {
        entradaSanitizada.condicaoClinica = String(entrada.condicaoClinica).trim().slice(0, 50);
      }
      if (entrada.temperaturaC) {
        const temp = normalizarNumero(entrada.temperaturaC);
        if (temp === null || temp < 30 || temp > 43) {
          return { valido: false, erro: 'Temperatura corporal deve estar entre 30 e 43°C.' };
        }
        entradaSanitizada.temperaturaC = temp;
      }
      if (entrada.farmaco || entrada.droga) {
        entradaSanitizada.farmaco = String(entrada.farmaco || entrada.droga).trim().slice(0, 80);
      }
      if (entrada.doseAlta !== undefined) {
        entradaSanitizada.doseAlta = Boolean(entrada.doseAlta);
      }
      break;
    }

    case 'dhe':
    case 'eletrolitos':
    case 'hidroeletrolitico': {
      const modo = typeof entrada.modo === 'string' ? entrada.modo.trim().toLowerCase() : 'hiponatremia';
      entradaSanitizada.modo = modo;

      if (entrada.peso !== undefined && entrada.peso !== null && entrada.peso !== '') {
        const vPeso = validarParametroFisiologico('peso', entrada.peso);
        if (!vPeso.valido) return vPeso;
        entradaSanitizada.peso = vPeso.valor;
      }
      if (entrada.idade !== undefined && entrada.idade !== null && entrada.idade !== '') {
        const vIdade = validarParametroFisiologico('idade', entrada.idade);
        if (!vIdade.valido) return vIdade;
        entradaSanitizada.idade = vIdade.valor;
      }
      if (entrada.sexo !== undefined && entrada.sexo !== null) {
        entradaSanitizada.sexo = String(entrada.sexo).trim().toLowerCase().slice(0, 10);
      }

      const kVal = entrada.kAtual !== undefined ? entrada.kAtual : entrada.potassio;
      if (kVal !== undefined && kVal !== null && kVal !== '') {
        const vK = validarParametroFisiologico('k', kVal);
        if (!vK.valido) return vK;
        entradaSanitizada.kAtual = vK.valor;
      }

      const naVal = entrada.naAtual !== undefined ? entrada.naAtual : entrada.sodio;
      if (naVal !== undefined && naVal !== null && naVal !== '') {
        const vNa = validarParametroFisiologico('na', naVal);
        if (!vNa.valido) return vNa;
        entradaSanitizada.naAtual = vNa.valor;
      }

      if (entrada.salina !== undefined && entrada.salina !== null) {
        const salNum = normalizarNumero(entrada.salina);
        if (salNum === null || salNum <= 0 || salNum > 20) {
          return { valido: false, erro: 'Concentração de salina inválida (deve ser entre 0.1% e 20%).' };
        }
        entradaSanitizada.salina = salNum;
      }

      entradaSanitizada.ecgAlterado = Boolean(entrada.ecgAlterado || entrada.ecg);
      break;
    }

    case 'heart':
    case 'sca':
    case 'cardiologia': {
      for (const campo of ['historia', 'ecg', 'fr', 'troponina']) {
        if (entrada[campo] !== undefined && entrada[campo] !== null && entrada[campo] !== '') {
          const num = normalizarNumero(entrada[campo]);
          if (num === null || num < 0 || num > 2) {
            return { valido: false, erro: `Parâmetro "${campo}" do HEART Score deve ser 0, 1 ou 2.` };
          }
          entradaSanitizada[campo] = num;
        }
      }
      if (entrada.idade !== undefined && entrada.idade !== null && entrada.idade !== '') {
        const vIdade = validarParametroFisiologico('idade', entrada.idade);
        if (!vIdade.valido) return vIdade;
        entradaSanitizada.idade = vIdade.valor;
      }
      entradaSanitizada.avcPrevio = Boolean(entrada.avcPrevio);
      break;
    }

    case 'asma':
    case 'crise_asmatica':
    case 'broncoespasmo': {
      if (entrada.peso !== undefined && entrada.peso !== null && entrada.peso !== '') {
        const vPeso = validarParametroFisiologico('peso', entrada.peso);
        if (!vPeso.valido) return vPeso;
        entradaSanitizada.peso = vPeso.valor;
        entradaSanitizada.pesoKg = vPeso.valor;
      }
      if (entrada.pfe !== undefined && entrada.pfe !== null && entrada.pfe !== '') {
        const vPfe = validarParametroFisiologico('pfe', entrada.pfe);
        if (!vPfe.valido) return vPfe;
        entradaSanitizada.pfe = vPfe.valor;
      }
      entradaSanitizada.refratario = Boolean(entrada.refratario || entrada.refratario_1h);
      entradaSanitizada.normocapnia = Boolean(entrada.normocapnia || entrada.gasometriaNormocapnia);
      break;
    }
  }

  return { valido: true, entradaSanitizada };
}

// Schemas JSON Schema oficiais para Fastify Ajv
const cockpitBodySchema = {
  type: 'object',
  required: ['metodo'],
  properties: {
    metodo: { type: 'string', minLength: 1, maxLength: 100 },
    session: { type: 'string', maxLength: 2048 },
    token: { type: 'string', maxLength: 2048 },
    args: {
      anyOf: [
        { type: 'array', maxItems: 50 },
        { type: 'object' },
        { type: 'string', maxLength: 4096 },
        { type: 'number' },
        { type: 'boolean' }
      ]
    },
    etag: { type: 'string', maxLength: 128 }
  },
  additionalProperties: true
};

const calcularBodySchema = {
  type: 'object',
  required: ['tipo', 'parametros'],
  properties: {
    tipo: {
      type: 'string',
      enum: Array.from(TIPOS_CALCULADORA_VALIDOS)
    },
    session: { type: 'string', maxLength: 2048 },
    token: { type: 'string', maxLength: 2048 },
    parametros: {
      type: 'object',
      additionalProperties: true
    }
  },
  additionalProperties: false
};

const telemetriaQuerySchema = {
  type: 'object',
  properties: {
    limite: { type: 'integer', minimum: 1, maximum: 100 }
  },
  additionalProperties: true
};

module.exports = {
  LIMITES_FISIOLOGICOS,
  DROGAS_DVA_VALIDAS,
  CENARIOS_SRI_VALIDOS,
  TIPOS_CALCULADORA_VALIDOS,
  normalizarNumero,
  validarParametroFisiologico,
  validarParametrosCalculadora,
  cockpitBodySchema,
  calcularBodySchema,
  telemetriaQuerySchema
};
