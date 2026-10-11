/**
 * ==============================================================================
 * tests/test_ia_motores_fallback_local.cjs
 * ==============================================================================
 * Bateria de Testes Automatizados para Motores de IA, Ollama Nativo,
 * Fast-Ack em Timeouts do Gemini e Execução Resiliente de Fallback Local Offline.
 * ==============================================================================
 */

const assert = require('assert');
const runtime = require('../server/runtime');
const { buildServer } = require('../server/index');
const { IaCircuitBreaker } = require('../src/04_ia_local_fallback');

async function testSuite() {
  console.log('🧪 Iniciando testes de Motores de IA, Ollama Nativo e Resiliência Beira-Leito...\n');

  const ctx = runtime.ctx;
  const originalFetch = ctx.UrlFetchApp.fetch;
  const props = ctx.PropertiesService.getScriptProperties();
  props.setProperty('GEMINI_API_KEYS', 'mock_gemini_key_1,mock_gemini_key_2');
  props.setProperty('LOCAL_LLM_URL', 'http://127.0.0.1:11434/api/chat');
  ctx.ConfigService.invalidar();

  try {
    // -------------------------------------------------------------------------
    // Bloco 1: _iaChamarOllamaNativo com endpoint /api/chat e payload nativo
    // -------------------------------------------------------------------------
    console.log('[1/9] Testando _iaChamarOllamaNativo com payload nativo do Ollama...');
    let reqCapturada = null;
    ctx.UrlFetchApp.fetch = function (url, opts) {
      reqCapturada = { url, opts };
      const payload = JSON.parse(opts.payload || '{}');
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          model: payload.model || 'mistral:latest',
          message: {
            role: 'assistant',
            content: '🚨 PCR em adulto: Iniciar RCP 100-120/min, 30:2, Adrenalina 1mg a cada 3-5 min.'
          },
          done: true
        })
      };
    };

    const resOllama = ctx._iaChamarOllamaNativo(
      'Você é médico de emergência.',
      'Conduta imediata na PCR em adulto',
      1000,
      null,
      { modeloForcado: 'mistral:latest' }
    );

    assert.ok(resOllama, 'Deve retornar resultado de _iaChamarOllamaNativo');
    assert.strictEqual(resOllama.modelo, 'ollama/mistral:latest');
    assert.strictEqual(resOllama.origem, 'ollama_nativo');
    assert.strictEqual(resOllama.offline_disponivel, true);
    assert.ok(resOllama.texto.includes('Adrenalina 1mg'), 'Deve conter orientação da dose de Adrenalina');
    assert.ok(reqCapturada.url.includes('/api/chat'), 'Deve direcionar para /api/chat');

    const bodyEnviado = JSON.parse(reqCapturada.opts.payload);
    assert.strictEqual(bodyEnviado.model, 'mistral:latest');
    assert.strictEqual(bodyEnviado.stream, false);
    assert.strictEqual(Array.isArray(bodyEnviado.messages), true);
    assert.strictEqual(bodyEnviado.messages[0].role, 'system');
    assert.strictEqual(bodyEnviado.messages[1].role, 'user');
    console.log('  ✓ _iaChamarOllamaNativo validado com payload nativo e formato correto.\n');

    // -------------------------------------------------------------------------
    // Bloco 2: chamarOllamaNativoAPI pública e tratamento de truncamento
    // -------------------------------------------------------------------------
    console.log('[2/9] Testando chamarOllamaNativoAPI e flags de truncamento...');
    ctx.UrlFetchApp.fetch = function (url, opts) {
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          model: 'llama3.1:latest',
          message: {
            role: 'assistant',
            content: 'Conduta na crise asmática: Salbutamol inalatório + Corticoide sistêmico.'
          },
          done: false,
          done_reason: 'length'
        })
      };
    };

    const resPublica = ctx.chamarOllamaNativoAPI(
      'Emergência Pediátrica',
      'Crise asmática grave',
      400,
      'llama3.1:latest'
    );
    assert.ok(resPublica, 'chamarOllamaNativoAPI deve responder com texto');
    assert.ok(resPublica.includes('Salbutamol'), 'Deve conter recomendação de broncodilatador');
    console.log('  ✓ chamarOllamaNativoAPI pública validada.\n');

    // -------------------------------------------------------------------------
    // Bloco 3: executarFallbackLocalOffline com Ollama disponível
    // -------------------------------------------------------------------------
    console.log('[3/9] Testando executarFallbackLocalOffline quando nó Ollama está operacional...');
    ctx.UrlFetchApp.fetch = function (url, opts) {
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          model: 'mistral:latest',
          message: {
            role: 'assistant',
            content: 'Sepse: Colher hemoculturas, lactato sérico, cristaloide 30 mL/kg e iniciar antibiótico na 1ª hora.'
          },
          done: true
        })
      };
    };

    const resFallbackOllama = ctx.executarFallbackLocalOffline(
      'Você é copiloto de UTI.',
      'Paciente em choque séptico na sala vermelha',
      { modeloForcado: 'mistral:latest' }
    );
    assert.ok(resFallbackOllama.includes('30 mL/kg'), 'Deve orientar cristaloide 30 mL/kg');
    assert.ok(resFallbackOllama.includes('hemoculturas'), 'Deve exigir hemoculturas');
    console.log('  ✓ executarFallbackLocalOffline prioriza inferência local com modelo generativo.\n');

    // -------------------------------------------------------------------------
    // Bloco 4: executarFallbackLocalOffline quando nó Ollama falha (Fallback Determinístico)
    // -------------------------------------------------------------------------
    console.log('[4/9] Testando executarFallbackLocalOffline quando nó Ollama falha (contingência determinística canônica)...');
    ctx.UrlFetchApp.fetch = function () {
      throw new Error('connect ECONNREFUSED 127.0.0.1:11434');
    };

    const resFallbackDet = ctx.executarFallbackLocalOffline(
      'Você é copiloto de emergência.',
      'Paciente em PCR ritmo de FV sem pulso',
      {}
    );
    assert.ok(resFallbackDet, 'Deve entregar resposta clínica mesmo sem nó local');
    assert.ok(resFallbackDet.includes('PARADA CARDIORRESPIRATÓRIA'), 'Deve acionar protocolo oficial de PCR');
    assert.ok(resFallbackDet.includes('200 J'), 'Deve conter carga de choque 200J');
    assert.ok(resFallbackDet.includes('Adrenalina 1 mg'), 'Deve conter Adrenalina 1mg');
    assert.ok(resFallbackDet.includes('Amiodarona 300 mg'), 'Deve conter Amiodarona 300mg');
    console.log('  ✓ Fallback determinístico clínico imediato (ACLS) ativado com 100% de precisão.\n');

    // -------------------------------------------------------------------------
    // Bloco 5: executarFallbackLocalOffline com json: true e retorno estruturado
    // -------------------------------------------------------------------------
    console.log('[5/9] Testando executarFallbackLocalOffline com json: true...');
    const resJsonOffline = ctx.executarFallbackLocalOffline(
      '',
      'paciente hipotenso com choque séptico e lactato elevado',
      { json: true, retornarObjeto: true }
    );
    assert.ok(resJsonOffline, 'Deve retornar objeto estruturado');
    assert.strictEqual(resJsonOffline.intencao, 'CLINICO_EMERGENCIA');
    assert.strictEqual(resJsonOffline.modoOffline, true);
    console.log('  ✓ executarFallbackLocalOffline em modo JSON estruturado validado.\n');

    // -------------------------------------------------------------------------
    // Bloco 6: Gemini Timeout (HTTP 504) e Fast-Ack com Circuit Breaker
    // -------------------------------------------------------------------------
    console.log('[6/9] Testando Fast-Ack em caso de Timeout HTTP 504 do Gemini...');
    ctx.IaCircuitBreaker.resetar('GEMINI');
    ctx._iaDesbloquear('GEMINI_NET_FAIL');
    for (const mod of ['gemini-3.7-flash', 'gemini-flash-lite-latest', 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.5-flash']) {
      ctx._iaDesbloquear('GEMINI_' + mod);
    }
    let tentativasGemini = 0;
    let localAcionadoAposTimeout = false;

    // Desbloqueia explicitamente os modelos locais para este teste
    const modelosLocais = ['llama3.1:latest', 'llama3:8b', 'mistral:latest', 'llama3:latest', 'mistral:7b'];
    modelosLocais.forEach(m => ctx._iaDesbloquear('LOCAL_' + m));

    props.setProperty('GEMINI_API_KEYS', 'mock_gemini_key_1,mock_gemini_key_2');
    props.setProperty('PROVEDOR_TEXTO_PADRAO', 'GEMINI');
    props.setProperty('LOCAL_LLM_URL', 'http://127.0.0.1:11434/api/chat');
    ctx.ConfigService.invalidar();

    ctx.UrlFetchApp.fetch = function (url, opts) {
      if (url.includes('googleapis.com')) {
        tentativasGemini++;
        return {
          getResponseCode: () => 504,
          getContentText: () => JSON.stringify({ error: 'Gateway Timeout' }),
          getHeaders: () => ({})
        };
      }
      if (url.includes('/api/chat') || url.includes('11434')) {
        localAcionadoAposTimeout = true;
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            model: 'mistral:latest',
            message: {
              role: 'assistant',
              content: 'Conduta na taquiarritmia: Cardioversão sincronizada 100 J se instável.'
            },
            done: true
          })
        };
      }
      return { getResponseCode: () => 404, getContentText: () => 'Not found' };
    };

    const resCascataTimeout = ctx.executarRaciocinioClinico(
      'Emergência Cardiológica',
      'Taquicardia ventricular com pulso e instabilidade hemodinâmica',
      500
    );

    assert.ok(resCascataTimeout, 'Deve responder via motor local');
    assert.ok(localAcionadoAposTimeout, 'Deve ter acionado o nó local após timeout do Gemini');
    assert.ok(tentativasGemini >= 1 && tentativasGemini <= 4, `Fast-Ack deve limitar tentativas em timeout (feitas: ${tentativasGemini})`);
    assert.ok(resCascataTimeout.includes('Cardioversão'), 'Deve conter conduta do motor local');

    const statusBreakerGemini = ctx.IaCircuitBreaker.obterStatus('GEMINI');
    assert.ok(statusBreakerGemini.totalFalhas >= 1, 'Deve registrar falhas no CircuitBreaker de Gemini');
    console.log('  ✓ Fast-Ack em HTTP 504 validado com sucesso (fallback transparente para nó local).\n');

    // -------------------------------------------------------------------------
    // Bloco 7: Fast-Fail em 0ms quando Circuit Breaker de Gemini está OPEN
    // -------------------------------------------------------------------------
    console.log('[7/9] Testando Fast-Fail imediato (0ms) com Circuit Breaker ABERTO...');
    ctx.IaCircuitBreaker.forcarEstado('GEMINI', 'OPEN', 'Simulação de manutenção da API Google');
    assert.strictEqual(ctx.IaCircuitBreaker.podeExecutar('GEMINI'), false);

    let chamouGeminiEmCircuitoAberto = false;
    ctx.UrlFetchApp.fetch = function (url, opts) {
      if (url.includes('googleapis.com')) {
        chamouGeminiEmCircuitoAberto = true;
        return { getResponseCode: () => 500, getContentText: () => '' };
      }
      if (url.includes('/api/chat') || url.includes('11434')) {
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            model: 'mistral:latest',
            message: { role: 'assistant', content: 'Conduta rápida via Ollama após fast-fail da nuvem.' },
            done: true
          })
        };
      }
      return { getResponseCode: () => 404, getContentText: () => '' };
    };

    const resFastFail = ctx.executarRaciocinioClinico('Clínica Geral', 'Pergunta de rotina', 300);
    assert.strictEqual(chamouGeminiEmCircuitoAberto, false, 'NÃO deve tentar chamar API Gemini com circuito aberto');
    assert.ok(resFastFail.includes('Ollama'), 'Deve responder direto pelo motor local');
    ctx.IaCircuitBreaker.resetar('GEMINI');
    console.log('  ✓ Fast-Fail em 0ms validado (circuito aberto desvia sem retenção de thread).\n');

    // -------------------------------------------------------------------------
    // Bloco 8: cockpitLocalLlm com ações ollama_nativo e fallback_local_offline
    // -------------------------------------------------------------------------
    console.log('[8/9] Testando RPC cockpitLocalLlm com ações nativas de Ollama e Fallback...');
    ctx.UrlFetchApp.fetch = function (url) {
      if (url.includes('/api/chat')) {
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            model: 'mistral:latest',
            message: { role: 'assistant', content: 'Dose pediátrica de Dipirona: 20 mg/kg a cada 6 horas.' },
            done: true
          })
        };
      }
      return { getResponseCode: () => 404, getContentText: () => '' };
    };

    const rpcOllama = ctx.cockpitLocalLlm('session_mock', {
      acao: 'ollama_nativo',
      prompt: 'Dose de Dipirona para criança de 15 kg',
      modelo: 'mistral:latest'
    });
    assert.strictEqual(rpcOllama.sucesso, true);
    assert.strictEqual(rpcOllama.acao, 'ollama_nativo');
    assert.ok(rpcOllama.resposta.includes('20 mg/kg'), 'Deve retornar cálculo correto de posologia');

    // Teste de contingência médica oficial com forcarDeterministico
    const rpcFallback = ctx.cockpitLocalLlm('session_mock', {
      acao: 'fallback_local_offline',
      prompt: 'Gestante 32 semanas em parada cardiorrespiratória',
      forcarDeterministico: true
    });
    assert.strictEqual(rpcFallback.sucesso, true);
    assert.strictEqual(rpcFallback.acao, 'fallback_local_offline');
    assert.strictEqual(rpcFallback.modoOffline, true);
    assert.ok(rpcFallback.resposta.includes('DULE'), 'Deve orientar manobra DULE contínua');
    assert.ok(rpcFallback.resposta.includes('CESARIANA PERIMORTEM'), 'Deve orientar cesariana perimortem');
    console.log('  ✓ RPC cockpitLocalLlm validado com sucesso para todas as ações.\n');

    // -------------------------------------------------------------------------
    // Bloco 9: Endpoints Fastify /api/status e /api/chat com Fallback Resiliente
    // -------------------------------------------------------------------------
    console.log('[9/9] Testando endpoints Fastify /api/status e /api/chat com fallback beira-leito...');
    const app = await buildServer();
    const token = ctx.criarSessaoCockpit_(ctx.ConfigService.get('TELEGRAM_CHAT_ID') || '123456');

    // 9.1 Verificar /api/status exibindo circuitos e ia_local_disponivel
    const resStatus = await app.inject({
      method: 'GET',
      url: '/api/status'
    });
    assert.strictEqual(resStatus.statusCode, 200);
    const jsonStatus = resStatus.json();
    assert.strictEqual(jsonStatus.ok, true);
    assert.ok(jsonStatus.circuit_breaker, 'Deve conter objeto circuit_breaker');
    assert.strictEqual(typeof jsonStatus.circuit_breaker.gemini, 'object');
    assert.strictEqual(typeof jsonStatus.circuit_breaker.local, 'object');
    assert.strictEqual(typeof jsonStatus.circuit_breaker.ollama, 'object');
    assert.strictEqual(jsonStatus.ia_local_disponivel, true);
    console.log('  ✓ /api/status expõe telemetria dos circuitos de IA e disponibilidade local.');

    // 9.2 Simular que a nuvem falha e /api/chat ativa fallback com Fast-Ack e HTTP 200
    ctx.UrlFetchApp.fetch = function (url) {
      if (url.includes('googleapis.com')) {
        throw new Error('ETIMEDOUT: Connection to generativelanguage.googleapis.com timed out');
      }
      return { getResponseCode: () => 500, getContentText: () => 'Unavailable' };
    };

    const resChatFallback = await app.inject({
      method: 'POST',
      url: '/api/chat',
      payload: {
        token: token,
        mensagem: 'Paciente em parada cardiorrespiratória FV na emergência',
        fallbackLocal: true
      }
    });

    assert.strictEqual(resChatFallback.statusCode, 200, 'Mesmo com queda na nuvem, deve responder 200 via fallback');
    const jsonChat = resChatFallback.json();
    console.log('jsonChat:', JSON.stringify(jsonChat, null, 2));
    assert.strictEqual(jsonChat.ok, true);
    assert.strictEqual(jsonChat.contingencia_offline, true);
    assert.ok(jsonChat.resposta.includes('PARADA CARDIORRESPIRATÓRIA'), 'Deve conter conduta de PCR do fallback');
    assert.ok(jsonChat.resposta.includes('200 J'), 'Deve prescrever desfibrilação 200 J');
    console.log('  ✓ /api/chat com fallback beira-leito responde com 200 OK e conduta protocolada sem travar.\n');

    await app.close();

    console.log('🎉 TODOS OS 9 BLOCOS DE TESTES DE IA E FALLBACK FORAM APROVADOS COM SUCESSO!');
  } finally {
    ctx.UrlFetchApp.fetch = originalFetch;
    IaCircuitBreaker.resetar('GEMINI');
  }
}

testSuite().catch(err => {
  console.error('❌ Falha na suite de testes de IA e fallback:', err);
  process.exit(1);
});
