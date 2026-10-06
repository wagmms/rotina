/**
 * Testes Ostensivos de Didática e Segurança no SOAP (FMRP-USP):
 * 1. Didática: Perguntas investigativas com racional semiológico/diagnóstico obrigatório entre parênteses.
 * 2. Segurança: Bloqueio rigoroso de sinais vitais numéricos não informados (PA, FC, FR, SpO2, Tax).
 * 3. Preservação: Dados legítimos relatados pelo médico são preservados com 100% de integridade.
 * 4. Resiliência: Sistemas não examinados no foco da queixa não ganham falsa normalidade silenciosa.
 */

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function carregarAmbiente() {
  const code = fs.readFileSync('ultra_rotina_master.js', 'utf8');
  const cacheMock = {};
  const propsMock = {
    TELEGRAM_BOT_TOKEN: 'token123',
    TELEGRAM_CHAT_ID: '999999',
    GEMINI_API_KEYS: 'key_teste_1,key_teste_2'
  };

  let promptsEnviados = [];

  const sandbox = {
    Logger: { log: () => {} },
    console: console,
    Date: Date,
    Math: Math,
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    String: String,
    Array: Array,
    Object: Object,
    RegExp: RegExp,
    JSON: JSON,
    Number: Number,
    Utilities: {
      getUuid: () => 'uuid-' + Math.random().toString(36).substring(2, 10),
      sleep: () => {}
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => cacheMock[k] || null,
        put: (k, v) => { cacheMock[k] = String(v); },
        remove: (k) => { delete cacheMock[k]; },
        getAll: (keys) => {
          const res = {};
          keys.forEach(k => { if (cacheMock[k]) res[k] = cacheMock[k]; });
          return res;
        },
        putAll: (obj) => { Object.assign(cacheMock, obj); }
      })
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => propsMock[k] || null,
        getProperties: () => Object.assign({}, propsMock),
        setProperty: (k, v) => { propsMock[k] = String(v); },
        setProperties: (obj) => { Object.assign(propsMock, obj); },
        deleteProperty: (k) => { delete propsMock[k]; }
      })
    },
    UrlFetchApp: {
      fetch: (url, opts) => {
        if (opts && opts.payload) {
          try {
            const p = JSON.parse(opts.payload);
            promptsEnviados.push(p);
          } catch (e) {}
        }
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            candidates: [{
              content: { parts: [{ text: "Mock de resposta de IA" }] },
              finishReason: "STOP"
            }]
          }),
          getAllHeaders: () => ({})
        };
      }
    }
  };

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  return {
    sandbox,
    getPrompts: () => promptsEnviados,
    resetPrompts: () => { promptsEnviados = []; }
  };
}

console.log('🧪 Iniciando TESTES OSTENSIVOS de Didática e Segurança no SOAP...\n');

const env = carregarAmbiente();
const c = env.sandbox;

// -------------------------------------------------------------
// BLOCO A: DIDÁTICA NAS PERGUNTAS INVESTIGATIVAS DO SUBJETIVO
// -------------------------------------------------------------

// Teste 1: O prompt de sistema do SOAP exige formalmente justificativa clínica entre parênteses
console.log('--- Bloco A: Didática das Perguntas Investigativas ---');
let promptCapturado = '';
c.executarRaciocinioClinico = (p, dados) => {
  promptCapturado = p;
  return JSON.stringify({
    subjetivo: "QP: Dor torácica há 2 horas.\nHDA: Dor em queimação retroesternal...",
    objetivo: "BEG, ACV normal.",
    perguntas_anamnese: [
      "A dor irradia para a mandíbula, dorso ou membro superior esquerdo? (descartar síndrome coronariana aguda e dissecção aórtica)",
      "Apresentou sudorese fria, náuseas ou dispneia concomitante? (identificar equivalentes anginosos e disautonomia)",
      "A dor piora com a palpação torácica ou com a inspiração profunda? (avaliar etiologia osteomusculoesquelética ou pleurítica)"
    ],
    exame_dirigido: ["Aferir PA em ambos os membros superiores", "Realizar ECG de 12 derivações em até 10 minutos"]
  });
};

const soapResultado = c.gerarSOAPComIA("Paciente 52 anos com dor no peito há 2h");
assert(promptCapturado.includes("JUSTIFICATIVA DIDÁTICA (FMRP-USP)"), "Prompt do rascunho deve exigir didática FMRP-USP");
assert(promptCapturado.includes("RIGOR DIDÁTICO OBRIGATÓRIO") && promptCapturado.includes("conter sua justificativa clínica ou hipótese a descartar entre parênteses"), "Prompt deve tornar a justificativa obrigatória");
assert(soapResultado.includes("descartar síndrome coronariana aguda e dissecção aórtica"), "Apresentação deve conter a justificativa da pergunta 1");
assert(soapResultado.includes("identificar equivalentes anginosos"), "Apresentação deve conter a justificativa da pergunta 2");
assert(soapResultado.includes("avaliar etiologia osteomusculoesquelética"), "Apresentação deve conter a justificativa da pergunta 3");
console.log('✅ APROVADO: 1. Prompt do SOAP e entrega formatada exigem e exibem justificativa semiológica em cada pergunta');

// Teste 2: Prompt do Áudio Multimodal em Tempo Único também exige justificativa nas perguntas
const codeMaster = fs.readFileSync('ultra_rotina_master.js', 'utf8');
assert(codeMaster.includes('Perguntas de Anamnese com Racional Didático: 2 a 4 perguntas investigativas diretas, CADA UMA COM SUA JUSTIFICATIVA CLÍNICA OU HIPÓTESE A DESCARTAR ENTRE PARÊNTESES'), 'Áudio multimodal deve exigir justificativa didática nas perguntas');
console.log('✅ APROVADO: 2. Áudio Multimodal em Tempo Único alinhado com o mesmo rigor didático');

// -------------------------------------------------------------
// BLOCO B: SEGURANÇA E BLOQUEIO DE DADOS NÃO INFORMADOS
// -------------------------------------------------------------
console.log('\n--- Bloco B: Segurança e Bloqueio de Sinais Vitais Inventados ---');

// Teste 3: Bloqueio estrito de Pressão Arterial não informada
const casoSemSinais = "Homem 40 anos com tosse seca há 5 dias. Nega febre.";
c.executarRaciocinioClinico = () => JSON.stringify({
  subjetivo: "Anamnese estruturada",
  objetivo: [
    "Geral: BEG, corado, hidratado. PA 120x80 mmHg.",
    "ACV: RCR 2T BNF sem sopros.",
    "AR: MV presente bilateralmente."
  ],
  perguntas_anamnese: ["Há expectoração? (diferenciar tosse seca de infecciosa produtiva)"],
  exame_dirigido: ["Aferir PA e saturação de O2"]
});

const r3 = c.gerarSOAPComIA(casoSemSinais);
assert(!r3.includes("120x80"), "PA inventada de 120x80 mmHg DEVE ser bloqueada e expurgada");
assert(r3.includes("ACV: RCR 2T BNF sem sopros"), "Achados não inventados de sistemas gerais são mantidos");
console.log('✅ APROVADO: 3. Pressão Arterial inventada (120x80) bloqueada com sucesso quando não informada no relato');

// Teste 4: Bloqueio de Frequência Cardíaca (bpm) inventada
c.executarRaciocinioClinico = () => JSON.stringify({
  subjetivo: "Anamnese estruturada",
  objetivo: [
    "Geral: FC 78 bpm, eupneico.",
    "ACV: Bulhas normofonéticas."
  ],
  perguntas_anamnese: ["Usa medicações? (conferir cronotrópicos)"]
});

const r4 = c.gerarSOAPComIA("Paciente com epigastralgia");
assert(!r4.includes("78 bpm"), "FC inventada de 78 bpm DEVE ser bloqueada");
console.log('✅ APROVADO: 4. Frequência Cardíaca inventada (78 bpm) bloqueada com sucesso');

// Teste 5: Bloqueio de Temperatura inventada (Tax °C)
c.executarRaciocinioClinico = () => JSON.stringify({
  subjetivo: "Anamnese",
  objetivo: "Geral: Tax 36.5 °C ao toque.\nAR: Murmúrio vesicular presente.",
  perguntas_anamnese: ["Pergunta? (justificativa)"]
});

const r5 = c.gerarSOAPComIA("Paciente com cefaleia há 1 dia");
assert(!r5.includes("36.5 °C") && !r5.includes("36.5°C"), "Temperatura inventada de 36.5°C DEVE ser bloqueada");
console.log('✅ APROVADO: 5. Temperatura corporal inventada (36.5 °C) bloqueada com sucesso');

// Teste 6: Bloqueio de SpO2 / Saturação inventada
c.executarRaciocinioClinico = () => JSON.stringify({
  subjetivo: "Anamnese",
  objetivo: "Geral: SpO2 99% em ar ambiente.\nAR: Sem ruídos.",
  perguntas_anamnese: ["Pergunta? (justificativa)"]
});

const r6 = c.gerarSOAPComIA("Paciente com dor lombar");
assert(!r6.includes("99%"), "SpO2 inventada de 99% DEVE ser bloqueada");
console.log('✅ APROVADO: 6. Oximetria inventada (SpO2 99%) bloqueada com sucesso');

// Teste 7: Preservação TOTAL de sinais vitais legitimamente relatados pelo médico
console.log('\n--- Bloco C: Preservação de Dados Verídicos Informados ---');
const casoComSinaisReais = "Mulher 68 anos, PA 165x95 mmHg, FC 112 bpm, Tax 38.8°C, SpO2: 89% em ar ambiente com dispneia.";
c.executarRaciocinioClinico = () => JSON.stringify({
  subjetivo: "Paciente idosa com insuficiência respiratória aguda e febre alta.",
  objetivo: [
    "Geral: Estado geral comprometido, taquicárdica (FC 112 bpm), febril (Tax 38.8°C), hipotoxêmica com SpO2: 89%.",
    "PA 165x95 mmHg em MSD.",
    "AR: Crepitações em base direita."
  ],
  perguntas_anamnese: ["Início súbito ou progressivo? (avaliar gravidade e etiologia de pneumonia vs TEP)"],
  exame_dirigido: ["Ausculta pulmonar comparativa detalhada"]
});

const r7 = c.gerarSOAPComIA(casoComSinaisReais);
assert(r7.includes("165x95"), "PA real informada pelo médico (165x95) DEVE ser 100% preservada");
assert(r7.includes("112 bpm"), "FC real informada pelo médico (112 bpm) DEVE ser 100% preservada");
assert(r7.includes("38.8"), "Temperatura real informada (38.8) DEVE ser 100% preservada");
assert(r7.includes("89%"), "SpO2 real informada (89%) DEVE ser 100% preservada");
console.log('✅ APROVADO: 7. Sinais vitais legítimos informados pelo médico (PA, FC, Tax, SpO2) são 100% preservados');

// Teste 8: Filtro seletivo quando há mistura de dados reais e inventados
const casoParcial = "Paciente com PA 140x90 mmHg e tosse.";
c.executarRaciocinioClinico = () => JSON.stringify({
  subjetivo: "Anamnese",
  objetivo: [
    "PA 140x90 mmHg no membro superior direito.",
    "Geral: FC 84 bpm, SpO2: 98%." // Estes 2 foram inventados!
  ],
  perguntas_anamnese: ["Pergunta? (justificativa)"]
});

const r8 = c.gerarSOAPComIA(casoParcial);
assert(r8.includes("140x90"), "Dado real (PA 140x90) deve ser mantido");
assert(!r8.includes("84 bpm"), "Dado inventado na mesma chamada (FC 84 bpm) deve ser expurgado");
assert(!r8.includes("98%"), "Dado inventado na mesma chamada (SpO2 98%) deve ser expurgado");
console.log('✅ APROVADO: 8. Filtro cirúrgico: preserva a medição verídica e expurga as medições inventadas na mesma consulta');

// Teste 9: Alerta explícito de sistemas-foco pendentes no exame físico
assert(promptCapturado.includes("NUNCA assuma como normais os sistemas que são o FOCO ou suspeita central da queixa"), "Prompt deve proibir normalidade presumida para sistemas com queixas ativas");
console.log('✅ APROVADO: 9. Prompt proíbe formalmente transformar ausência de dados de foco de queixa em normalidade');

console.log('\n🎉 TESTES OSTENSIVOS CONCLUÍDOS COM 100% DE SUCESSO! ZERO PREJUÍZO OU REGRESSÃO CLÍNICA DETECTADA.');
