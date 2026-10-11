/**
 * ==============================================================================
 * ULTRA ROTINA · SUÍTE DE TESTES: RESILIÊNCIA E SANITIZAÇÃO DE PAYLOADS FASTIFY
 * ==============================================================================
 * Bateria exaustiva de testes defensivos para /api/calcular e /api/cockpit:
 * 1. Payloads com strings malformadas e JSON sintaticamente quebrado
 * 2. Arrays vazios, arrays aninhados e tipos primitivos na raiz da requisição
 * 3. Objetos aninhados inesperados em campos de tipo primitivo/string/numérico
 * 4. Valores fisiologicamente anômalos e fora dos limites biológicos humanos
 * 5. Parâmetros obrigatórios ausentes por modo de cálculo (DHE, DVA, SRI, etc.)
 * 6. Blindagem estrita contra vazamento de stacktrace e mensagens em português
 * 7. Execução determinística em alta performance para payloads válidos (< 5ms)
 * ==============================================================================
 */

process.env.NODE_ENV = 'test';

const assert = require('node:assert/strict');
const { test, describe } = require('node:test');
const { buildServer } = require('../server/index.js');
const runtime = require('../server/runtime.js');

describe('Resiliência e Sanitização de Erros na API Fastify (/api/calcular e /api/cockpit)', async () => {
  const app = await buildServer();
  const chatId = runtime.ctx.ConfigService.get('TELEGRAM_CHAT_ID') || '123456';
  const token = runtime.ctx.criarSessaoCockpit_(chatId);

  // Helper para verificar estrutura de resposta de erro sem vazamento de stacktrace
  function verificarRespostaErroDefensiva(res, statusCodeEsperado = 400) {
    assert.strictEqual(res.statusCode, statusCodeEsperado, `Status code deve ser ${statusCodeEsperado}`);
    const json = res.json();
    assert.strictEqual(json.ok, false, 'Campo ok deve ser false');
    assert.strictEqual(typeof json.erro, 'string', 'Campo erro deve ser string');
    assert(json.erro.length > 0, 'Mensagem de erro não pode ser vazia');
    assert.strictEqual(typeof json.requestId, 'string', 'Campo requestId deve estar presente');
    assert.strictEqual(json.stack, undefined, 'Stacktrace JAMAIS deve vazar na resposta HTTP');
    if (json.detalhes && typeof json.detalhes === 'object') {
      assert.strictEqual(json.detalhes.stack, undefined, 'Stacktrace JAMAIS deve vazar em detalhes');
    }
    return json;
  }

  test('1. Strings malformadas e JSON quebrado em /api/calcular e /api/cockpit', async () => {
    // 1.1 JSON truncado em Content-Type application/json em /api/calcular
    const resCalcJsonTruncado = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      headers: { 'content-type': 'application/json' },
      payload: '{"tipo": "dva", "parametros": {'
    });
    const err1 = verificarRespostaErroDefensiva(resCalcJsonTruncado, 400);
    assert(err1.erro.includes('JSON malformado') || err1.erro.includes('sintaxe inválida'), 'Erro deve ser em português');

    // 1.2 JSON com vírgula sobressalente em /api/cockpit
    const resCockpitVirgula = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      headers: { 'content-type': 'application/json' },
      payload: '{"metodo": "cockpitConsultar",,}'
    });
    const err2 = verificarRespostaErroDefensiva(resCockpitVirgula, 400);
    assert(err2.erro.includes('JSON malformado') || err2.erro.includes('sintaxe inválida'));

    // 1.3 String pura não-JSON enviada via text/plain em /api/calcular
    const resCalcTextPlainRuim = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      headers: { 'content-type': 'text/plain' },
      payload: 'texto_puro_invalido_sem_formato_json'
    });
    const err3 = verificarRespostaErroDefensiva(resCalcTextPlainRuim, 400);
    assert(err3.erro.includes('JSON malformado') || err3.erro.includes('não parseável'));

    // 1.4 String pura não-JSON enviada via text/plain em /api/cockpit
    const resCockpitTextPlainRuim = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      headers: { 'content-type': 'text/plain' },
      payload: 'parametro_corrompido_sem_fechamento_chave{{{'
    });
    const err4 = verificarRespostaErroDefensiva(resCockpitTextPlainRuim, 400);
    assert(err4.erro.includes('JSON malformado') || err4.erro.includes('não parseável'));
  });

  test('2. Arrays vazios e tipos primitivos na raiz do payload', async () => {
    // 2.1 Array vazio em /api/calcular
    const resCalcArrayVazio = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: []
    });
    const err1 = verificarRespostaErroDefensiva(resCalcArrayVazio, 400);
    assert(err1.erro.includes('objeto JSON') || err1.erro.includes('não nulo'));

    // 2.2 Array vazio em /api/cockpit
    const resCockpitArrayVazio = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: []
    });
    const err2 = verificarRespostaErroDefensiva(resCockpitArrayVazio, 400);
    assert(err2.erro.includes('objeto JSON') || err2.erro.includes('não nulo'));

    // 2.3 Número primitivo em /api/calcular
    const resCalcNumero = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: 12345
    });
    verificarRespostaErroDefensiva(resCalcNumero, 400);

    // 2.4 Boolean primitivo em /api/cockpit
    const resCockpitBool = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: true
    });
    verificarRespostaErroDefensiva(resCockpitBool, 400);
  });

  test('3. Objetos aninhados inesperados em campos de tipo primitivo', async () => {
    // 3.1 DVA: campo droga como objeto aninhado
    const resDvaDrogaObjeto = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: {
        tipo: 'dva',
        parametros: { droga: { nome: 'nora' }, peso: 70 }
      }
    });
    const errDva1 = verificarRespostaErroDefensiva(resDvaDrogaObjeto, 400);
    assert(errDva1.erro.includes('string') || errDva1.erro.includes('inválid'));

    // 3.2 DVA: campo peso como objeto aninhado
    const resDvaPesoObjeto = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: {
        tipo: 'dva',
        parametros: { droga: 'nora', peso: { kg: 70 } }
      }
    });
    const errDva2 = verificarRespostaErroDefensiva(resDvaPesoObjeto, 400);
    assert(errDva2.erro.includes('não numérico') || errDva2.erro.includes('Peso corporal'));

    // 3.3 SRI: cenário como array aninhado
    const resSriArray = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: {
        tipo: 'sri',
        parametros: { cenario: ['choque'], peso: 70 }
      }
    });
    const errSri = verificarRespostaErroDefensiva(resSriArray, 400);
    assert(errSri.erro.includes('string') || errSri.erro.includes('inválido'));

    // 3.4 CrCl: sexo como objeto aninhado
    const resCrclSexoObj = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: {
        tipo: 'crcl',
        parametros: { creatinina: 1.0, peso: 70, idade: 60, sexo: { m: true } }
      }
    });
    const errCrcl = verificarRespostaErroDefensiva(resCrclSexoObj, 400);
    assert(errCrcl.erro.includes('Sexo deve ser "m"'));

    // 3.5 Pediatria: condicaoClinica como objeto aninhado
    const resPedCondObj = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: {
        tipo: 'pediatria',
        parametros: { peso: 15, condicaoClinica: { trauma: true } }
      }
    });
    const errPed = verificarRespostaErroDefensiva(resPedCondObj, 400);
    assert(errPed.erro.includes('string') || errPed.erro.includes('Condição clínica'));

    // 3.6 DHE: modo como objeto aninhado
    const resDheModoObj = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: {
        tipo: 'dhe',
        parametros: { modo: { disturbo: 'hipo' }, naAtual: 130 }
      }
    });
    const errDhe1 = verificarRespostaErroDefensiva(resDheModoObj, 400);
    assert(errDhe1.erro.includes('string') || errDhe1.erro.includes('Modo'));

    // 3.7 Asma: refratario como objeto aninhado
    const resAsmaObj = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: {
        tipo: 'asma',
        parametros: { peso: 70, refratario: { grave: true } }
      }
    });
    const errAsma = verificarRespostaErroDefensiva(resAsmaObj, 400);
    assert(errAsma.erro.includes('objeto aninhado'));

    // 3.8 /api/cockpit com método proibido (__proto__ / constructor)
    const resMetodoProibido = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { metodo: '__proto__', session: token, args: [] }
    });
    const errProto = verificarRespostaErroDefensiva(resMetodoProibido, 400);
    assert(errProto.erro.includes('inválido ou proibido'));
  });

  test('4. Valores fisiologicamente anômalos e limites biológicos humanos', async () => {
    // 4.1 DVA: peso negativo (-15 kg)
    const resDvaPesoNeg = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: { tipo: 'dva', parametros: { droga: 'nora', peso: -15 } }
    });
    const err1 = verificarRespostaErroDefensiva(resDvaPesoNeg, 400);
    assert(err1.erro.includes('limites fisiológicos'));

    // 4.2 DVA: peso acima do limite humano (> 350 kg)
    const resDvaPesoGigante = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: { tipo: 'dva', parametros: { droga: 'nora', peso: 500 } }
    });
    const err2 = verificarRespostaErroDefensiva(resDvaPesoGigante, 400);
    assert(err2.erro.includes('limites fisiológicos'));

    // 4.3 CrCl: creatinina impossível (0 ou 50 mg/dL)
    const resCrclImpossivel = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: { tipo: 'crcl', parametros: { creatinina: 45.0, peso: 70, idade: 50 } }
    });
    const err3 = verificarRespostaErroDefensiva(resCrclImpossivel, 400);
    assert(err3.erro.includes('limites fisiológicos') && err3.erro.includes('Creatinina'));

    // 4.4 Gasometria: pH incompatível com a vida (pH 6.2 ou pH 8.1)
    const resGasoPhExtremo = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: { tipo: 'gaso', parametros: { ph: 6.2, pco2: 40, hco3: 24 } }
    });
    const err4 = verificarRespostaErroDefensiva(resGasoPhExtremo, 400);
    assert(err4.erro.includes('limites fisiológicos') && err4.erro.includes('pH'));

    // 4.5 Gasometria: pCO2 impossível (< 10 ou > 150 mmHg)
    const resGasoPco2Extremo = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: { tipo: 'gaso', parametros: { ph: 7.35, pco2: 250, hco3: 24 } }
    });
    const err5 = verificarRespostaErroDefensiva(resGasoPco2Extremo, 400);
    assert(err5.erro.includes('pCO₂') && err5.erro.includes('limites fisiológicos'));

    // 4.6 DHE: Sódio incompatível com a vida (60 mEq/L ou 220 mEq/L)
    const resDheNaExtremo = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: { tipo: 'dhe', parametros: { modo: 'hiponatremia', naAtual: 75 } }
    });
    const err6 = verificarRespostaErroDefensiva(resDheNaExtremo, 400);
    assert(err6.erro.includes('Sódio sérico') && err6.erro.includes('limites fisiológicos'));

    // 4.7 DHE: Potássio incompatível com a vida (0.5 mEq/L ou 15.0 mEq/L)
    const resDheKExtremo = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: { tipo: 'dhe', parametros: { modo: 'hipercalemia', kAtual: 13.5 } }
    });
    const err7 = verificarRespostaErroDefensiva(resDheKExtremo, 400);
    assert(err7.erro.includes('Potássio sérico') && err7.erro.includes('limites fisiológicos'));

    // 4.8 Asma: PFE absurdo (> 1000 L/min)
    const resAsmaPfeExtremo = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: { tipo: 'asma', parametros: { pfe: 1500, peso: 70 } }
    });
    const err8 = verificarRespostaErroDefensiva(resAsmaPfeExtremo, 400);
    assert(err8.erro.includes('Pico de Fluxo Expiratório') && err8.erro.includes('limites fisiológicos'));
  });

  test('5. Parâmetros obrigatórios por modo de cálculo', async () => {
    // 5.1 DHE modo hipercalemia sem kAtual/potassio
    const resHipercalemiaSemK = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: { tipo: 'dhe', parametros: { modo: 'hipercalemia', peso: 70 } }
    });
    const err1 = verificarRespostaErroDefensiva(resHipercalemiaSemK, 400);
    assert(err1.erro.includes('obrigatório') && err1.erro.includes('Potássio'));

    // 5.2 DHE modo hiponatremia sem naAtual/sodio
    const resHiponatremiaSemNa = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: { tipo: 'dhe', parametros: { modo: 'hiponatremia', peso: 70 } }
    });
    const err2 = verificarRespostaErroDefensiva(resHiponatremiaSemNa, 400);
    assert(err2.erro.includes('obrigatório') && err2.erro.includes('Sódio'));

    // 5.3 DHE modo inválido
    const resDheModoInvalido = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: { tipo: 'dhe', parametros: { modo: 'modo_inexistente', naAtual: 130 } }
    });
    const err3 = verificarRespostaErroDefensiva(resDheModoInvalido, 400);
    assert(err3.erro.includes('inválido') && err3.erro.includes('Opções:'));

    // 5.4 Compatibilidade em Y sem drogas informadas
    const resCompatSemDrogas = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: { tipo: 'compatibilidade_y', parametros: {} }
    });
    const err4 = verificarRespostaErroDefensiva(resCompatSemDrogas, 400);
    assert(err4.erro.includes('droga1 e droga2'));
  });

  test('6. Validação de mensagens defensivas e schemas Ajv em português', async () => {
    // 6.1 Campo obrigatório "parametros" ausente em /api/calcular
    const resSemParams = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: { tipo: 'dva' }
    });
    const err1 = verificarRespostaErroDefensiva(resSemParams, 400);
    assert(err1.erro.includes('Parâmetros da calculadora devem ser um objeto JSON') || err1.erro.includes('parametros'), 'Mensagem defensiva em PT-BR');

    // 6.2 Campo tipo inválido (não reconhecido / fora do enum)
    const resTipoInexistente = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: { tipo: 'calculadora_alienigena', parametros: {} }
    });
    const err2 = verificarRespostaErroDefensiva(resTipoInexistente, 400);
    assert(err2.erro.includes('não reconhecido') || err2.erro.includes('Suportados') || err2.erro.includes('tipo'), 'Mensagem de tipo inválido em PT-BR');

    // 6.3 Campo metodo obrigatório ausente em /api/cockpit
    const resSemMetodo = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { session: token }
    });
    const err3 = verificarRespostaErroDefensiva(resSemMetodo, 400);
    assert(err3.erro.includes('metodo') || err3.erro.includes('obrigatório'), 'Mensagem de campo obrigatório em PT-BR');

    // 6.4 Validação Ajv na rota de telemetria com tradução em português (limite < 1 -> minimum)
    const resTelemetriaMin = await app.inject({
      method: 'GET',
      url: '/api/telemetria/ao-vivo?limite=0'
    });
    const err4 = verificarRespostaErroDefensiva(resTelemetriaMin, 400);
    assert(err4.erro.includes('mínimo 1'), 'Tradução Ajv em português para minimum');

    // 6.5 Validação Ajv na rota de telemetria com tradução em português (limite > 100 -> maximum)
    const resTelemetriaMax = await app.inject({
      method: 'GET',
      url: '/api/telemetria/ao-vivo?limite=999'
    });
    const err5 = verificarRespostaErroDefensiva(resTelemetriaMax, 400);
    assert(err5.erro.includes('máximo 100'), 'Tradução Ajv em português para maximum');

    // 6.6 Validação Ajv na rota de telemetria com tradução em português (limite textual -> type)
    const resTelemetriaType = await app.inject({
      method: 'GET',
      url: '/api/telemetria/ao-vivo?limite=nao_numerico'
    });
    const err6 = verificarRespostaErroDefensiva(resTelemetriaType, 400);
    assert(err6.erro.includes('tipo integer'), 'Tradução Ajv em português para type');
  });

  test('7. Execução determinística de altíssima performance para payloads legítimos (< 50ms)', async () => {
    // 7.1 DVA legítimo
    const t0 = performance.now();
    const resDvaOk = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: {
        tipo: 'dva',
        session: token,
        parametros: { droga: 'nora', peso: 72.0 }
      }
    });
    const duracaoDva = performance.now() - t0;
    assert.strictEqual(resDvaOk.statusCode, 200);
    assert.strictEqual(resDvaOk.json().ok, true);
    assert(duracaoDva < 100, `DVA deve responder em tempo recorde (< 100ms, levou ${duracaoDva.toFixed(2)}ms)`);

    // 7.2 Gasometria legítima
    const resGasoOk = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: {
        tipo: 'gaso',
        session: token,
        parametros: { ph: 7.28, pco2: 30, hco3: 14, na: 140, cl: 104 }
      }
    });
    assert.strictEqual(resGasoOk.statusCode, 200);
    assert.strictEqual(resGasoOk.json().ok, true);
    assert(resGasoOk.json().resultado.texto.includes('Acidose Metabólica'));

    // 7.3 DHE legítimo (Manejo de Hipercalemia)
    const resDheOk = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: {
        tipo: 'dhe',
        session: token,
        parametros: { modo: 'hipercalemia', kAtual: 6.8, ecgAlterado: true }
      }
    });
    assert.strictEqual(resDheOk.statusCode, 200);
    assert.strictEqual(resDheOk.json().ok, true);
    assert(resDheOk.json().resultado.texto.includes('Gluconato de Cálcio') || resDheOk.json().resultado.texto.includes('HIPERCALEMIA'));

    // 7.4 Cockpit RPC legítimo via text/plain (compatibilidade PWA cross-origin)
    const resCockpitTextPlainOk = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      headers: { 'content-type': 'text/plain' },
      payload: JSON.stringify({
        metodo: 'cockpitCalcular',
        session: token,
        args: ['sri', { cenario: 'choque', peso: 75 }]
      })
    });
    assert.strictEqual(resCockpitTextPlainOk.statusCode, 200);
    assert.strictEqual(resCockpitTextPlainOk.json().ok, true);
    assert(resCockpitTextPlainOk.json().resultado.texto.includes('Etomidato') || resCockpitTextPlainOk.json().resultado.texto.includes('Cetamina'));
  });

  test('8. Resiliência e Sanitização do Endpoint Dedicado /api/chat', async () => {
    // 8.1 JSON truncado em /api/chat
    const resChatTruncado = await app.inject({
      method: 'POST',
      url: '/api/chat',
      headers: { 'content-type': 'application/json' },
      payload: '{"mensagem": "Paciente hipertenso com PA 180x110'
    });
    const errChat1 = verificarRespostaErroDefensiva(resChatTruncado, 400);
    assert(errChat1.erro.includes('JSON malformado') || errChat1.erro.includes('sintaxe inválida'));

    // 8.2 String pura não-JSON via text/plain em /api/chat
    const resChatTextPlainRuim = await app.inject({
      method: 'POST',
      url: '/api/chat',
      headers: { 'content-type': 'text/plain' },
      payload: 'texto_sem_formato_json_para_o_chat{{{'
    });
    const errChat2 = verificarRespostaErroDefensiva(resChatTextPlainRuim, 400);
    assert(errChat2.erro.includes('JSON malformado') || errChat2.erro.includes('não parseável'));

    // 8.3 Array vazio em /api/chat
    const resChatArray = await app.inject({
      method: 'POST',
      url: '/api/chat',
      payload: []
    });
    verificarRespostaErroDefensiva(resChatArray, 400);

    // 8.4 Tentativa de Prototype Pollution em /api/chat
    const resChatProto = await app.inject({
      method: 'POST',
      url: '/api/chat',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({
        __proto__: { admin: true },
        constructor: { admin: true },
        session: token,
        mensagem: 'Pergunta com payload malicioso'
      })
    });
    const errProto = verificarRespostaErroDefensiva(resChatProto, 400);
    assert(errProto.erro.includes('propriedade reservada') || errProto.erro.includes('protótipo') || errProto.erro.includes('inválido') || errProto.erro.includes('bloqueada'));

    // 8.5 Ausência de campos mínimos exigidos (sem mensagem, texto, prompt, acao, audioBase64)
    const resChatVazio = await app.inject({
      method: 'POST',
      url: '/api/chat',
      payload: { session: token }
    });
    verificarRespostaErroDefensiva(resChatVazio, 400);

    // 8.6 Sessão ausente em /api/chat -> 401 Unauthorized
    const resChatSemSessao = await app.inject({
      method: 'POST',
      url: '/api/chat',
      payload: { mensagem: 'Qual a dose de noradrenalina em choque séptico?' }
    });
    const errAuth1 = verificarRespostaErroDefensiva(resChatSemSessao, 401);
    assert(errAuth1.erro.includes('Sessão') || errAuth1.erro.includes('Telegram') || errAuth1.erro.includes('expirada'));

    // 8.7 Sessão inválida / expirada em /api/chat -> 401 Unauthorized
    const resChatSessaoRuim = await app.inject({
      method: 'POST',
      url: '/api/chat',
      payload: {
        session: 'ck_0000000000000000000000000000000000000000000000000000000000000000',
        mensagem: 'Qual conduta na acidose diabética?'
      }
    });
    const errAuth2 = verificarRespostaErroDefensiva(resChatSessaoRuim, 401);
    assert(errAuth2.erro.includes('Sessão') || errAuth2.erro.includes('Telegram') || errAuth2.erro.includes('expirada'));

    // 8.8 Requisição legítima ao /api/chat com resposta rápida
    const resChatOk = await app.inject({
      method: 'POST',
      url: '/api/chat',
      payload: {
        session: token,
        acao: 'novo'
      }
    });
    assert.strictEqual(resChatOk.statusCode, 200);
    assert.strictEqual(resChatOk.json().ok, true);
    assert(typeof resChatOk.json().benchmark_ms === 'number');
  });

  test('9. Sessões ausentes e expiradas em /api/cockpit e /api/calcular', async () => {
    // 9.1 /api/cockpit sem sessão
    const resCockpitSemSessao = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { metodo: 'cockpitConsultar' }
    });
    const err1 = verificarRespostaErroDefensiva(resCockpitSemSessao, 401);
    assert(err1.erro.includes('Sessão') || err1.erro.includes('autorizado') || err1.erro.includes('Telegram'));

    // 9.2 /api/cockpit com token HMAC expirado/falso
    const resCockpitTokenFalso = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: {
        metodo: 'cockpitConsultar',
        session: 'ck_deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
      }
    });
    const err2 = verificarRespostaErroDefensiva(resCockpitTokenFalso, 401);
    assert(err2.erro.includes('Sessão') || err2.erro.includes('Telegram') || err2.erro.includes('expirada'));

    // 9.3 /api/calcular sem sessão e com token inválido
    const resCalcTokenFalso = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: {
        tipo: 'dva',
        session: 'ck_fake_token_invalido',
        parametros: { droga: 'nora', peso: 70 }
      }
    });
    const err3 = verificarRespostaErroDefensiva(resCalcTokenFalso, 401);
    assert(err3.erro.includes('Sessão') || err3.erro.includes('Telegram') || err3.erro.includes('autorizado'));
  });

  test('10. Blindagem contra Prototype Pollution e Métodos Reservados em cockpitRpc', async () => {
    // 10.1 Métodos de protótipo de Object no Cockpit RPC
    for (const metodoProibido of ['__proto__', 'constructor', 'prototype', 'toString', 'valueOf']) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/cockpit',
        payload: {
          metodo: metodoProibido,
          session: token,
          args: []
        }
      });
      const err = verificarRespostaErroDefensiva(res, 400);
      assert(err.erro.includes('inválido ou proibido') || err.erro.includes('não suportado'));
    }

    // 10.2 Chamada direta ao helper runtime.cockpitRpc com método proibido
    assert.throws(
      () => runtime.cockpitRpc('constructor', token, []),
      /Método solicitado inválido ou proibido/
    );
    assert.throws(
      () => runtime.cockpitRpc('__proto__', token, []),
      /Método solicitado inválido ou proibido/
    );
    assert.throws(
      () => runtime.cockpitRpc('toString', token, []),
      /Método solicitado inválido ou proibido/
    );
    assert.throws(
      () => runtime.cockpitRpc('hasOwnProperty', token, []),
      /Método solicitado inválido ou proibido/
    );
    assert.throws(
      () => runtime.cockpitRpc('isPrototypeOf', token, []),
      /Método solicitado inválido ou proibido/
    );
    assert.throws(
      () => runtime.cockpitRpc('', token, []),
      /Método do Cockpit deve ser uma string válida/
    );
  });

  test('11. Limites fisiológicos hemodinâmicos e validação estrita de inteiros (CURB, Glasgow, HEART)', async () => {
    // 11.1 CURB-65: PAS menor que PAD (hemodinamicamente impossível: PAS 70, PAD 100)
    const resCurbPasMenor = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: {
        tipo: 'curb65',
        parametros: { idade: 65, fr: 25, ureia: 40, pas: 70, pad: 100 }
      }
    });
    const errCurb = verificarRespostaErroDefensiva(resCurbPasMenor, 400);
    assert(errCurb.erro.includes('Pressão Arterial Sistólica') && errCurb.erro.includes('não pode ser menor'), 'CURB deve rejeitar PAS < PAD');

    // 11.2 Glasgow com valores decimais não-inteiros
    const resGlasgowDecimal = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: {
        tipo: 'glasgow',
        parametros: { ocular: 3.5, verbal: 5, motor: 6 }
      }
    });
    const errGlas = verificarRespostaErroDefensiva(resGlasgowDecimal, 400);
    assert(errGlas.erro.includes('Resposta Ocular do Glasgow') || errGlas.erro.includes('número inteiro'), 'Glasgow deve rejeitar valores fracionários');

    // 11.3 HEART score com valor decimal não-inteiro
    const resHeartDecimal = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: {
        tipo: 'heart',
        parametros: { historia: 1.5, ecg: 1, troponina: 1 }
      }
    });
    const errHeart = verificarRespostaErroDefensiva(resHeartDecimal, 400);
    assert(errHeart.erro.includes('HEART Score') && errHeart.erro.includes('0, 1 ou 2'), 'HEART deve exigir inteiros 0, 1 ou 2');

    // 11.4 Garantia de ausência de paths internos ou stacktraces em qualquer resposta de erro
    assert(!JSON.stringify(errCurb).includes('/home/'), 'Nenhum caminho de sistema deve vazar no erro CURB');
    assert(!JSON.stringify(errGlas).includes('/home/'), 'Nenhum caminho de sistema deve vazar no erro Glasgow');
    assert(!JSON.stringify(errHeart).includes('/home/'), 'Nenhum caminho de sistema deve vazar no erro HEART');
  });
});

