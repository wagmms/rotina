/**
 * ==============================================================================
 * ULTRA ROTINA · SUÍTE DE TESTES DEFENSIVOS: SCHEMAS E SANITIZAÇÃO FASTIFY
 * ==============================================================================
 * Valida a sanitização e validação estrita de parâmetros na camada HTTP Fastify:
 * 1. Fast-Fail em 0ms no handshake para tipos incorretos em /api/cockpit
 * 2. Validação fisiológica estrita e limites biológicos para calculadoras clínicas
 * 3. Proteção ativa contra Prototype Pollution e injeção de parâmetros espúrios
 * 4. Endpoint REST dedicado /api/calcular com schema JSON nativo
 * 5. Validação defensiva de handshake no /webhook do Telegram
 * 6. Validação de query string em endpoints de telemetria (/api/telemetria/*)
 * 7. Exposição transparente da telemetria de schemas em /api/status
 * ==============================================================================
 */

process.env.NODE_ENV = 'test';

const assert = require('node:assert/strict');
const { buildServer } = require('../server/index.js');
const runtime = require('../server/runtime.js');

async function testSchemasValidacaoCalculadoras() {
  console.log('\n==================================================================');
  console.log('🧪 INICIANDO TESTES: SCHEMAS E VALIDAÇÃO ESTRIFA NO FASTIFY');
  console.log('==================================================================\n');

  const app = await buildServer();

  try {
    const chatId = runtime.ctx.ConfigService.get('TELEGRAM_CHAT_ID') || '123456';
    const token = runtime.ctx.criarSessaoCockpit_(chatId);

    // ──────────────────────────────────────────────────────────────────────────
    // [1] Validação de Handshake em /api/cockpit (RPC Central)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[1] Testando validação de handshake em /api/cockpit...');

    // 1.1 Metodo ausente
    const resSemMetodo = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { session: token }
    });
    assert.strictEqual(resSemMetodo.statusCode, 400, 'Deve rejeitar payload sem metodo');
    assert(resSemMetodo.json().erro.includes('metodo') || resSemMetodo.json().erro.includes('required'), 'Mensagem de erro deve citar metodo');

    // 1.2 Metodo como número (tipo incorreto)
    const resMetodoNum = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { metodo: 12345, session: token }
    });
    assert.strictEqual(resMetodoNum.statusCode, 400, 'Deve rejeitar metodo não-string com 400');

    // 1.3 Metodo string vazia
    const resMetodoVazio = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { metodo: '   ', session: token }
    });
    assert.strictEqual(resMetodoVazio.statusCode, 400, 'Deve rejeitar metodo vazio com 400');

    // 1.4 Payload como Array em vez de Objeto
    const resPayloadArray = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: [{ metodo: 'cockpitConsultar' }]
    });
    assert.strictEqual(resPayloadArray.statusCode, 400, 'Deve rejeitar payload array com 400');

    console.log('  ✓ Fast-fail no handshake para tipos de raiz aprovado.');

    // ──────────────────────────────────────────────────────────────────────────
    // [2] Validação Fisiológica e Limites Biológicos em cockpitCalcular
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[2] Testando validação de calculadoras clínicas via /api/cockpit...');

    // 2.1 Args malformados
    const resArgsVazio = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { metodo: 'cockpitCalcular', session: token, args: ['dva'] }
    });
    assert.strictEqual(resArgsVazio.statusCode, 400, 'Args com menos de 2 itens deve retornar 400');

    // 2.2 Tipo de calculadora desconhecido
    const resTipoInvalido = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { metodo: 'cockpitCalcular', session: token, args: ['calc_desconhecida', { peso: 70 }] }
    });
    assert.strictEqual(resTipoInvalido.statusCode, 400, 'Tipo desconhecido deve retornar 400');
    assert(resTipoInvalido.json().erro.includes('não reconhecido'));

    // 2.3 DVA: Droga inválida
    const resDvaDrogaRuim = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { metodo: 'cockpitCalcular', session: token, args: ['dva', { droga: 'droga_inexistente', peso: 70 }] }
    });
    assert.strictEqual(resDvaDrogaRuim.statusCode, 400, 'Droga inválida deve retornar 400');
    assert(resDvaDrogaRuim.json().erro.includes('Droga vasoativa inválida'));

    // 2.4 DVA: Peso fisiologicamente implausível (negativo ou > 350kg)
    const resDvaPesoNeg = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { metodo: 'cockpitCalcular', session: token, args: ['dva', { droga: 'nora', peso: -10 }] }
    });
    assert.strictEqual(resDvaPesoNeg.statusCode, 400, 'Peso negativo deve retornar 400');

    const resDvaPesoGigante = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { metodo: 'cockpitCalcular', session: token, args: ['dva', { droga: 'nora', peso: 600 }] }
    });
    assert.strictEqual(resDvaPesoGigante.statusCode, 400, 'Peso > 350kg deve retornar 400');

    // 2.5 DVA: Peso não numérico (string corrompida)
    const resDvaPesoStr = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { metodo: 'cockpitCalcular', session: token, args: ['dva', { droga: 'nora', peso: 'cem_quilos' }] }
    });
    assert.strictEqual(resDvaPesoStr.statusCode, 400, 'Peso textual deve retornar 400');

    // 2.6 DVA: Sucesso válido
    const resDvaOk = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { metodo: 'cockpitCalcular', session: token, args: ['dva', { droga: 'nora', peso: 75.5 }] }
    });
    assert.strictEqual(resDvaOk.statusCode, 200, 'DVA válido deve retornar 200');
    assert.strictEqual(resDvaOk.json().ok, true);
    assert(resDvaOk.json().resultado.texto.includes('Noradrenalina'));

    // 2.7 SRI: Cenário inválido vs Cenário válido
    const resSriRuim = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { metodo: 'cockpitCalcular', session: token, args: ['sri', { cenario: 'espacial', peso: 70 }] }
    });
    assert.strictEqual(resSriRuim.statusCode, 400, 'SRI com cenário inválido deve retornar 400');

    const resSriOk = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { metodo: 'cockpitCalcular', session: token, args: ['sri', { cenario: 'choque', peso: 70 }] }
    });
    assert.strictEqual(resSriOk.statusCode, 200);
    assert(resSriOk.json().resultado.texto.includes('Etomidato') || resSriOk.json().resultado.texto.includes('Cetamina'));

    // 2.8 Gasometria: pH fora dos limites biológicos (6.70 a 7.80)
    const resGasoPhIncompativel = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { metodo: 'cockpitCalcular', session: token, args: ['gaso', { ph: 8.4, pco2: 40, hco3: 24 }] }
    });
    assert.strictEqual(resGasoPhIncompativel.statusCode, 400, 'pH 8.4 deve ser descartado no handshake');

    const resGasoOk = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { metodo: 'cockpitCalcular', session: token, args: ['gaso', { ph: 7.20, pco2: 25, hco3: 10, na: 138, cl: 102 }] }
    });
    assert.strictEqual(resGasoOk.statusCode, 200);
    assert(resGasoOk.json().resultado.texto.includes('Acidose Metabólica'));

    // 2.9 CrCl: Creatinina <= 0 ou > 30 mg/dL
    const resCrclNeg = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { metodo: 'cockpitCalcular', session: token, args: ['crcl', { creatinina: 0, peso: 70, idade: 50 }] }
    });
    assert.strictEqual(resCrclNeg.statusCode, 400, 'Creatinina 0 deve retornar 400');

    const resCrclOk = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { metodo: 'cockpitCalcular', session: token, args: ['crcl', { creatinina: 1.1, peso: 70, idade: 60, sexo: 'f' }] }
    });
    assert.strictEqual(resCrclOk.statusCode, 200);
    assert.strictEqual(resCrclOk.json().ok, true);

    // 2.10 Pediatria: Peso acima do teto pediátrico (150 kg)
    const resPedAdulto = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { metodo: 'cockpitCalcular', session: token, args: ['pediatria', { peso: 180, modo: 'holliday' }] }
    });
    assert.strictEqual(resPedAdulto.statusCode, 400, 'Peso 180kg em pediatria deve retornar 400');

    // 2.11 HEART Score: Parâmetro fora de [0, 2]
    const resHeartRuim = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: { metodo: 'cockpitCalcular', session: token, args: ['heart', { historia: 5, ecg: 1 }] }
    });
    assert.strictEqual(resHeartRuim.statusCode, 400, 'HEART com pontuação > 2 deve retornar 400');

    console.log('  ✓ Validação fisiológica beira-leito aprovada para todas as calculadoras.');

    // ──────────────────────────────────────────────────────────────────────────
    // [3] Proteção Ativa Contra Prototype Pollution
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[3] Testando blindagem contra Prototype Pollution...');

    const payloadPoluicao = JSON.parse(
      '{"metodo":"cockpitCalcular","session":"' + token + '","args":["dva",{"droga":"nora","peso":70,"__proto__":{"ataquePollution":true}}]}'
    );
    const resPoluicao = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: payloadPoluicao
    });
    assert.strictEqual(resPoluicao.statusCode, 400, 'Payload com __proto__ deve ser sumariamente rejeitado no handshake com 400');
    assert.strictEqual(Object.prototype.ataquePollution, undefined, 'Protótipo global jamais deve ser poluído');

    console.log('  ✓ Blindagem de protótipo 100% segura.');

    // ──────────────────────────────────────────────────────────────────────────
    // [4] Endpoint REST Dedicado /api/calcular (Schema Fastify Nativo)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[4] Testando endpoint REST dedicado /api/calcular...');

    // 4.1 Rejeição por schema: campo "tipo" ausente
    const resRestSemTipo = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: { parametros: { peso: 70 } }
    });
    assert.strictEqual(resRestSemTipo.statusCode, 400, 'Schema deve rejeitar sem tipo com 400');

    // 4.2 Rejeição por schema: campo "tipo" inválido (enum violation)
    const resRestTipoEnum = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: { tipo: 'tipo_inexistente', parametros: { peso: 70 } }
    });
    assert.strictEqual(resRestTipoEnum.statusCode, 400, 'Schema deve rejeitar tipo fora do enum com 400');

    // 4.3 Rejeição por schema: campo "parametros" não é objeto
    const resRestParamNaoObj = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: { tipo: 'dva', parametros: 'peso_70' }
    });
    assert.strictEqual(resRestParamNaoObj.statusCode, 400, 'Schema deve rejeitar parametros string com 400');

    // 4.4 Cálculo REST com sucesso
    const resRestOk = await app.inject({
      method: 'POST',
      url: '/api/calcular',
      payload: {
        tipo: 'dva',
        session: token,
        parametros: { droga: 'dobuta', peso: 68 }
      }
    });
    assert.strictEqual(resRestOk.statusCode, 200, 'Endpoint REST deve responder 200');
    const jsonRest = resRestOk.json();
    assert.strictEqual(jsonRest.ok, true);
    assert.strictEqual(jsonRest.tipo, 'dva');
    assert(jsonRest.resultado.texto.includes('Dobutamina'));
    assert(typeof jsonRest.benchmark_ms === 'number');

    console.log(`  ✓ Endpoint REST /api/calcular validado com sucesso (${jsonRest.benchmark_ms}ms).`);

    // ──────────────────────────────────────────────────────────────────────────
    // [5] Validação de Handshake no /webhook do Telegram
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[5] Testando validação de handshake no /webhook do Telegram...');

    runtime.ctx.PropertiesService.getScriptProperties().setProperty('WEBHOOK_SECRET', 'secret_test_123');

    // 5.1 update_id como string (deve descartar antes do processamento)
    const resWebhookStr = await app.inject({
      method: 'POST',
      url: '/webhook',
      headers: { 'x-telegram-bot-api-secret-token': 'secret_test_123' },
      payload: { update_id: '12345' }
    });
    assert.strictEqual(resWebhookStr.statusCode, 400, 'update_id como string deve retornar 400');

    // 5.2 update_id negativo
    const resWebhookNeg = await app.inject({
      method: 'POST',
      url: '/webhook',
      headers: { 'x-telegram-bot-api-secret-token': 'secret_test_123' },
      payload: { update_id: -10 }
    });
    assert.strictEqual(resWebhookNeg.statusCode, 400, 'update_id negativo deve retornar 400');

    // 5.3 update_id fracionário
    const resWebhookFloat = await app.inject({
      method: 'POST',
      url: '/webhook',
      headers: { 'x-telegram-bot-api-secret-token': 'secret_test_123' },
      payload: { update_id: 12.34 }
    });
    assert.strictEqual(resWebhookFloat.statusCode, 400, 'update_id não-inteiro deve retornar 400');

    console.log('  ✓ Handshake defensivo de webhook aprovado.');

    // ──────────────────────────────────────────────────────────────────────────
    // [6] Validação de Querystring nos Endpoints de Telemetria
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[6] Testando validação de querystring nos endpoints de telemetria...');

    // 6.1 Limite negativo ou zero
    const resTelemetriaZero = await app.inject({
      method: 'GET',
      url: '/api/telemetria/ao-vivo?limite=0'
    });
    assert.strictEqual(resTelemetriaZero.statusCode, 400, 'limite=0 deve retornar 400');

    // 6.2 Limite excessivo (> 100)
    const resTelemetriaExcessivo = await app.inject({
      method: 'GET',
      url: '/api/telemetria/ao-vivo?limite=500'
    });
    assert.strictEqual(resTelemetriaExcessivo.statusCode, 400, 'limite > 100 deve retornar 400');

    // 6.3 Limite textual não numérico
    const resTelemetriaNaoNum = await app.inject({
      method: 'GET',
      url: '/api/telemetria/erros?limite=muitos'
    });
    assert.strictEqual(resTelemetriaNaoNum.statusCode, 400, 'limite string deve retornar 400');

    // 6.4 Limite válido
    const resTelemetriaOk = await app.inject({
      method: 'GET',
      url: '/api/telemetria/ao-vivo?limite=25'
    });
    assert.strictEqual(resTelemetriaOk.statusCode, 200, 'limite válido deve retornar 200');
    assert.strictEqual(resTelemetriaOk.json().ok, true);

    console.log('  ✓ Validação de querystrings de telemetria aprovada.');

    // ──────────────────────────────────────────────────────────────────────────
    // [7] Telemetria de Schemas em /api/status
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[7] Verificando telemetria de segurança em /api/status...');

    const resStatus = await app.inject({
      method: 'GET',
      url: '/api/status'
    });
    assert.strictEqual(resStatus.statusCode, 200);
    const jsonStatus = resStatus.json();
    assert.strictEqual(jsonStatus.seguranca.schemas_fastify, true, 'schemas_fastify deve estar ativo em /api/status');
    assert.strictEqual(jsonStatus.seguranca.helmet, true);
    assert.strictEqual(jsonStatus.seguranca.rate_limit, true);

    console.log('  ✓ Telemetria de segurança /api/status validada com sucesso.');

    console.log('\n🎉 TODOS OS TESTES DE SCHEMAS E VALIDAÇÃO FORAM APROVADOS COM 100% DE SUCESSO!\n');
  } finally {
    await app.close();
  }
}

testSchemasValidacaoCalculadoras().catch(err => {
  console.error('\n❌ FALHA NOS TESTES DE SCHEMAS FASTIFY:', err);
  process.exit(1);
});
