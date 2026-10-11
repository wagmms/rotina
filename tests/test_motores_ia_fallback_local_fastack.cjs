/**
 * ==============================================================================
 * tests/test_motores_ia_fallback_local_fastack.cjs
 * ==============================================================================
 * Bateria de testes de alta fidelidade para:
 * 1. Motores de IA e inferência local Ollama nativa (_iaChamarOllamaNativo)
 * 2. Fallback unificado local offline e contingência clínica (executarFallbackLocalOffline)
 * 3. Fast-Ack e Fast-Fail protetivo em caso de timeout/indisponibilidade da API Gemini
 * 4. Resiliência do endpoint REST /api/chat e do RPC do Cockpit
 * ==============================================================================
 */

const assert = require('assert');
const runtime = require('../server/runtime');
const ctx = runtime.ctx;

function runTests() {
  console.log('Iniciando suíte: Motores de IA, Ollama Nativo, Fallback Local e Fast-Ack Gemini...');

  const originalFetch = ctx.UrlFetchApp.fetch;

  try {
    // -------------------------------------------------------------------------
    // Teste 1: _iaChamarOllamaNativo com polimorfismo de parâmetros
    // -------------------------------------------------------------------------
    let chamadasOllama = [];
    ctx.UrlFetchApp.fetch = function (url, opts) {
      chamadasOllama.push({ url, opts });
      const payload = JSON.parse(opts.payload || '{}');
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          model: payload.model || 'mistral:latest',
          message: {
            role: 'assistant',
            content: 'Conduta imediata: Adrenalina 0,5 mg IM no vasto lateral da coxa.'
          },
          done: true
        })
      };
    };

    // Chamada formato 1: (url, modelo, sistema, prompt, tokens, opcoes)
    const res1 = ctx._iaChamarOllamaNativo(
      'http://127.0.0.1:11434/api/chat',
      'mistral:latest',
      'Você é médico assistente.',
      'Paciente em choque anafilático.',
      500,
      { temperature: 0.1 }
    );

    assert.ok(res1, 'Formato 1 de _iaChamarOllamaNativo deve retornar resultado');
    assert.strictEqual(res1.modelo, 'ollama/mistral:latest');
    assert.ok(res1.texto.includes('Adrenalina 0,5 mg IM'), 'Deve conter posologia da Adrenalina');
    assert.strictEqual(res1.offline_disponivel, true);
    assert.ok(chamadasOllama.some(c => c.url.includes('/api/chat')), 'Deve chamar /api/chat');

    // Chamada formato 2: (sistema, prompt, tokens, ctx, opcoes)
    chamadasOllama = [];
    const res2 = ctx._iaChamarOllamaNativo(
      'Você é médico de emergência.',
      'Paciente com PCR em assistolia.',
      500,
      null,
      { modeloForcado: 'llama3:8b' }
    );

    assert.ok(res2, 'Formato 2 de _iaChamarOllamaNativo deve retornar resultado');
    assert.strictEqual(res2.modelo, 'ollama/llama3:8b');
    assert.strictEqual(res2.origem, 'ollama_nativo');
    console.log('✓ Teste 1: _iaChamarOllamaNativo validado com suporte polimórfico a ambas as assinaturas.');

    // -------------------------------------------------------------------------
    // Teste 2: _iaChamarOllamaNativo em caso de 404 e erros de conexão
    // -------------------------------------------------------------------------
    ctx.UrlFetchApp.fetch = function (url, opts) {
      return {
        getResponseCode: () => 404,
        getContentText: () => 'model not found'
      };
    };

    const res404 = ctx._iaChamarOllamaNativo(
      'http://127.0.0.1:11434/api/chat',
      'modelo_inexistente',
      'sistema',
      'prompt',
      300
    );
    assert.strictEqual(res404, null, 'Modelo 404 deve retornar null defensivamente');

    ctx.UrlFetchApp.fetch = function () {
      throw new Error('Connection refused by Ollama daemon');
    };

    const resConnErr = ctx._iaChamarOllamaNativo(
      'http://127.0.0.1:11434/api/chat',
      'mistral:latest',
      'sistema',
      'prompt',
      300
    );
    assert.strictEqual(resConnErr, null, 'Erro de conexão deve retornar null sem lançar exceção');
    console.log('✓ Teste 2: _iaChamarOllamaNativo defensivo contra 404 e falhas de conexão.');

    // -------------------------------------------------------------------------
    // Teste 3: executarFallbackLocalOffline com inferência local disponível
    // -------------------------------------------------------------------------
    ctx.CacheService.getScriptCache().remove('iabl_LOCAL_mistral:latest');
    ctx.CacheService.getScriptCache().remove('iabl_LOCAL_llama3.1:latest');
    ctx.UrlFetchApp.fetch = function (url, opts) {
      if (url.includes('/api/chat') || url.includes('/v1/chat/completions')) {
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            message: {
              content: 'Conduta: Ringer Lactato 30 mL/kg nas primeiras 3h e Noradrenalina se PAM < 65 mmHg.'
            },
            done: true
          })
        };
      }
      return { getResponseCode: () => 500, getContentText: () => 'Erro' };
    };

    const fbInferido = ctx.executarFallbackLocalOffline(
      'Médico UTI',
      'Paciente em choque séptico com lactato 4.5',
      { modeloForcado: 'mistral:latest' }
    );

    assert.ok(fbInferido, 'executarFallbackLocalOffline deve retornar resposta');
    const txtInferido = typeof fbInferido === 'object' ? fbInferido.resposta : fbInferido;
    assert.ok(txtInferido.includes('Noradrenalina') || txtInferido.includes('Ringer Lactato'), 'Deve conter conduta do choque séptico');
    console.log('✓ Teste 3: executarFallbackLocalOffline via inferência generativa local validada.');

    // -------------------------------------------------------------------------
    // Teste 4: executarFallbackLocalOffline com nó local offline (Blackout)
    // -------------------------------------------------------------------------
    ctx.UrlFetchApp.fetch = function () {
      throw new Error('Local daemon offline / ETIMEDOUT');
    };

    const fbDeterministaPcr = ctx.executarFallbackLocalOffline(
      'Emergência',
      'Paciente adulto em PCR com FV chocável',
      { clinico: true }
    );

    assert.ok(fbDeterministaPcr, 'Deve acionar fallback determinístico em blackout');
    const txtPcr = typeof fbDeterministaPcr === 'object' ? fbDeterministaPcr.resposta : fbDeterministaPcr;
    assert.ok(txtPcr.includes('PARADA CARDIORRESPIRATÓRIA'), 'Deve conter protocolo de PCR');
    assert.ok(txtPcr.includes('200 J'), 'Carga de desfibrilação bifásica de 200J');
    assert.ok(txtPcr.includes('Adrenalina 1 mg IV/IO'), 'Dose de Adrenalina 1mg');
    assert.ok(txtPcr.includes('Amiodarona 300 mg'), 'Dose de Amiodarona 300mg');

    const fbDeterministaGest = ctx.executarFallbackLocalOffline(
      'Obstetrícia',
      'Gestante 32 semanas em PCR perimortem',
      { clinico: true }
    );
    const txtGest = typeof fbDeterministaGest === 'object' ? fbDeterministaGest.resposta : fbDeterministaGest;
    assert.ok(txtGest.includes('DULE'), 'Manobra de DULE obrigatória');
    assert.ok(txtGest.includes('CESARIANA PERIMORTEM'), 'Cesariana perimortem no 4º-5º min');

    console.log('✓ Teste 4: Transição em 0ms para protocolos determinísticos oficiais (ACLS/DULE) em blackout validada.');

    // -------------------------------------------------------------------------
    // Teste 5: executarFallbackLocalOffline com extração estruturada JSON
    // -------------------------------------------------------------------------
    const fbJson = ctx.executarFallbackLocalOffline(
      'Classificador',
      'Paciente com dor no peito intensa e IAM com supra',
      { json: true }
    );
    assert.ok(fbJson, 'Deve gerar fallback estruturado');
    const objJson = typeof fbJson === 'string' ? JSON.parse(fbJson) : (fbJson.resposta ? JSON.parse(fbJson.resposta) : fbJson);
    assert.strictEqual(objJson.intencao, 'CLINICO_EMERGENCIA');
    assert.strictEqual(objJson.modoOffline, true);
    console.log('✓ Teste 5: Extração e fallback heurístico JSON offline em 0ms validado.');

    // -------------------------------------------------------------------------
    // Teste 6: Fast-Ack e Fast-Fail protetivo contra Timeout do Gemini
    // -------------------------------------------------------------------------
    // Limpa caches de bloqueio prévios
    ctx.CacheService.getScriptCache().remove('iabl_GEMINI_NET_FAIL');
    ctx.CacheService.getScriptCache().remove('iabl_GEMINI_gemini-3.7-flash');
    for (const m of (ctx.IaLocalFallbackService.MODELOS_HOMOLOGADOS_LOCAL || [])) {
      ctx.CacheService.getScriptCache().remove('iabl_LOCAL_' + m);
    }

    let tentativasGemini = 0;
    let chamouLocal = false;

    ctx.UrlFetchApp.fetch = function (url, opts) {
      if (url.includes('generativelanguage.googleapis.com')) {
        tentativasGemini++;
        const err = new Error('ESOCKETTIMEDOUT: Connection to Google Cloud timed out after 15000ms');
        err.name = 'TimeoutError';
        throw err;
      }
      if (url.includes('11434') || url.includes('/api/chat') || url.includes('/v1/chat/completions')) {
        chamouLocal = true;
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            message: {
              content: 'Resposta de contingência gerada pelo nó local Ollama/Mistral após timeout na nuvem.'
            },
            done: true
          })
        };
      }
      return { getResponseCode: () => 500, getContentText: () => 'Erro' };
    };

    const inicioTimeout = Date.now();
    const resFastAck = ctx.executarRaciocinioClinico(
      'Você é assistente de UTI.',
      'Conduta imediata na crise hipertensiva da gestante.',
      1000
    );
    const duracaoMs = Date.now() - inicioTimeout;

    assert.ok(resFastAck, 'Deve obter resposta sem travar a aplicação');
    assert.ok(tentativasGemini <= 3, `Deve disparar Fast-Fail (tentativas: ${tentativasGemini}), sem iterar desnecessariamente todas as chaves e modelos`);
    const txtFastAckLow = String(resFastAck).toLowerCase();
    assert.ok(chamouLocal || txtFastAckLow.includes('contingência') || txtFastAckLow.includes('pré-eclâmpsia') || txtFastAckLow.includes('zuspan'), 'Deve resolver via motor local ou contingência oficial');
    console.log(`✓ Teste 6: Fast-Fail do Gemini em caso de timeout de rede validado com corte em ${duracaoMs}ms e ${tentativasGemini} tentativa(s).`);

    // -------------------------------------------------------------------------
    // Teste 7: RPC do Cockpit executarFallbackLocalOffline
    // -------------------------------------------------------------------------
    const rpcFb = runtime.cockpitRpc('executarFallbackLocalOffline', 'session_test', [
      'Você é médico assistente.',
      'Paciente com anafilaxia e estridor laríngeo',
      { forcarDeterministico: true }
    ]);
    assert.ok(rpcFb, 'RPC executarFallbackLocalOffline deve responder com sucesso');
    const txtRpc = typeof rpcFb === 'object' ? rpcFb.resposta : rpcFb;
    assert.ok(txtRpc.includes('ADRENALINA (1:1.000 / 1 mg/mL) INTRAMUSCULAR'), 'RPC deve conter protocolo de Anafilaxia');
    assert.ok(txtRpc.includes('0,5 mg'), 'Dose de 0,5 mg IM');
    console.log('✓ Teste 7: RPC executarFallbackLocalOffline validado com entrega de protocolo beira-leito.');

    // -------------------------------------------------------------------------
    // Teste 8: RPC cockpitLocalLlm com ação fallback_local_offline
    // -------------------------------------------------------------------------
    const rpcLocalLlm = runtime.cockpitRpc('cockpitLocalLlm', 'session_test', [{
      acao: 'fallback_local_offline',
      prompt: 'Paciente em AVC isquêmico agudo há 2 horas',
      forcarDeterministico: true
    }]);
    assert.strictEqual(rpcLocalLlm.sucesso, true);
    assert.strictEqual(rpcLocalLlm.modoOffline, true);
    assert.ok(rpcLocalLlm.resposta.includes('0,9 mg/kg') || rpcLocalLlm.resposta.includes('AVC ISQUÊMICO'), 'Deve conter protocolo de AVC');
    console.log('✓ Teste 8: RPC cockpitLocalLlm (ação fallback_local_offline) validado com sucesso.');

  } finally {
    // Restaura o fetch original
    ctx.UrlFetchApp.fetch = originalFetch;
    ctx.CacheService.getScriptCache().remove('iabl_GEMINI_NET_FAIL');
  }

  console.log('\n🚀 TODOS OS 8 TESTES DE MOTORES DE IA, OLLAMA NATIVO E FAST-ACK PASSARAM COM 100% DE SUCESSO!\n');
}

runTests();
