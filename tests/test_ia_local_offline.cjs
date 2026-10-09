/**
 * ==============================================================================
 * tests/test_ia_local_offline.cjs - BATERIA DE TESTES DE IA LOCAL E FALLBACK
 * ==============================================================================
 * Valida a integração de IA Generativa Local (Llama 3 / Mistral / Ollama)
 * e o mecanismo de contingência e alta disponibilidade offline.
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');
const runtime = require('../server/runtime');
const ctx = runtime.ctx;

function runTests() {
  console.log('Iniciando bateria de testes: IA Generativa Local (Llama 3 / Mistral) e Fallback Offline...');

  // ---------------------------------------------------------------------------
  // Teste 1: Normalização de URLs para endpoints locais
  // ---------------------------------------------------------------------------
  const normalizar = ctx._iaNormalizarUrlLocal;
  assert.strictEqual(typeof normalizar, 'function', '_iaNormalizarUrlLocal deve existir no runtime');
  assert.strictEqual(normalizar('http://localhost:11434'), 'http://localhost:11434/v1/chat/completions');
  assert.strictEqual(normalizar('http://127.0.0.1:11434/'), 'http://127.0.0.1:11434/v1/chat/completions');
  assert.strictEqual(normalizar('http://127.0.0.1:11434/v1'), 'http://127.0.0.1:11434/v1/chat/completions');
  assert.strictEqual(normalizar('http://127.0.0.1:11434/v1/chat/completions'), 'http://127.0.0.1:11434/v1/chat/completions');
  assert.strictEqual(normalizar('http://127.0.0.1:11434/api/chat'), 'http://127.0.0.1:11434/api/chat');
  console.log('✓ Teste 1: Normalização de URLs para endpoints locais validada com sucesso.');

  // ---------------------------------------------------------------------------
  // Teste 2: Ordem dos provedores e inclusão de LOCAL na cascata
  // ---------------------------------------------------------------------------
  const ordem = ctx._iaOrdemProvedores();
  assert.ok(Array.isArray(ordem), 'Ordem de provedores deve ser array');
  assert.ok(ordem.includes('LOCAL'), 'Provedor LOCAL deve estar incluído na cascata padrão');
  console.log('✓ Teste 2: Ordem de provedores inclui LOCAL na cascata de alta disponibilidade: ' + ordem.join(' -> '));

  // ---------------------------------------------------------------------------
  // Teste 3: Chamada a nó local compatível com OpenAI (Llama 3 / Mistral)
  // ---------------------------------------------------------------------------
  const urlFetchOriginal = ctx.UrlFetchApp.fetch;
  let chamadasFeitas = [];

  ctx.UrlFetchApp.fetch = function (url, opts) {
    chamadasFeitas.push({ url, opts });
    if (url.includes('/v1/chat/completions')) {
      const payload = JSON.parse(opts.payload || '{}');
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          choices: [{
            message: {
              content: 'Conduta inicial: Iniciar Noradrenalina 0.05 mcg/kg/min e titular para PAM >= 65 mmHg.'
            },
            finish_reason: 'stop'
          }],
          model: payload.model || 'llama3.1:latest'
        })
      };
    }
    return {
      getResponseCode: () => 500,
      getContentText: () => JSON.stringify({ error: 'Erro inesperado' })
    };
  };

  const resLlama3 = ctx.chamarLocalLlmAPI(
    'Você é um assistente médico hospitalar.',
    'Paciente em choque séptico refratário a volume. Qual vasopressor inicial?',
    500,
    'llama3.1:latest'
  );

  assert.ok(resLlama3, 'Deve retornar resposta da IA local');
  assert.ok(resLlama3.includes('Noradrenalina'), 'Deve conter a conduta com Noradrenalina');
  assert.ok(chamadasFeitas.some(c => c.url.includes('/v1/chat/completions')), 'Deve ter feito requisição para o endpoint local');
  console.log('✓ Teste 3: Inferência via motor local compatível com OpenAI (Llama 3) executada com sucesso.');

  // ---------------------------------------------------------------------------
  // Teste 4: Chamada a nó local no formato nativo Ollama (/api/chat)
  // ---------------------------------------------------------------------------
  chamadasFeitas = [];
  ctx.ConfigService.invalidar();
  ctx.PropertiesService.getScriptProperties().setProperty('LOCAL_LLM_URL', 'http://127.0.0.1:11434/api/chat');

  ctx.UrlFetchApp.fetch = function (url, opts) {
    chamadasFeitas.push({ url, opts });
    if (url.includes('/api/chat')) {
      const payload = JSON.parse(opts.payload || '{}');
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          model: payload.model || 'mistral:latest',
          message: {
            role: 'assistant',
            content: 'Dose de Adrenalina na anafilaxia: 0,5 mg IM no vasto lateral da coxa imediatamente.'
          },
          done: true
        })
      };
    }
    return {
      getResponseCode: () => 404,
      getContentText: () => 'Not found'
    };
  };

  const resMistral = ctx.chamarLocalLlmAPI(
    'Você é um assistente médico hospitalar.',
    'Qual a dose de Adrenalina na anafilaxia?',
    500,
    'mistral:latest'
  );

  assert.ok(resMistral, 'Deve retornar resposta do Ollama nativo');
  assert.ok(resMistral.includes('0,5 mg IM'), 'Deve orientar adrenalina 0,5 mg IM');
  assert.ok(chamadasFeitas.some(c => c.url.includes('/api/chat')), 'Deve ter requisitado /api/chat');
  console.log('✓ Teste 4: Inferência via API nativa do Ollama (/api/chat - Mistral) validada.');

  // ---------------------------------------------------------------------------
  // Teste 5: Cascata de Fallback da Nuvem para o Motor Local
  // ---------------------------------------------------------------------------
  // Simulando que Gemini, Groq, OpenRouter e Zai falharam com 429 ou erro de conexão,
  // mas o motor local responde prontamente
  chamadasFeitas = [];
  ctx.PropertiesService.getScriptProperties().setProperty('LOCAL_LLM_URL', 'http://127.0.0.1:11434/v1/chat/completions');

  ctx.UrlFetchApp.fetch = function (url, opts) {
    chamadasFeitas.push({ url, opts });
    if (url.includes('googleapis.com') || url.includes('groq.com') || url.includes('openrouter.ai') || url.includes('z.ai')) {
      return {
        getResponseCode: () => 429,
        getContentText: () => JSON.stringify({ error: 'Quota exceeded' }),
        getHeaders: () => ({})
      };
    }
    if (url.includes('11434') || url.includes('localhost') || url.includes('127.0.0.1')) {
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          choices: [{
            message: {
              content: 'Resposta gerada com sucesso via motor de contingência local Llama 3.'
            },
            finish_reason: 'stop'
          }],
          model: 'llama3.1:latest'
        })
      };
    }
    return { getResponseCode: () => 500, getContentText: () => 'Erro' };
  };

  const resCascataLocal = ctx.executarRaciocinioClinico(
    'Você é um assistente médico de UTI.',
    'Paciente em pós-operatório imediato com instabilidade.',
    1000
  );

  assert.ok(resCascataLocal, 'Deve obter resposta com sucesso mesmo com a nuvem inoperante');
  assert.ok(resCascataLocal.includes('contingência local Llama 3'), 'Deve ter sido resolvido pelo motor local');
  console.log('✓ Teste 5: Transição suave e transparente da nuvem para o motor local Llama 3 validada.');

  // ---------------------------------------------------------------------------
  // Teste 6: Fallback Determinístico de Emergência em Blackout Total
  // ---------------------------------------------------------------------------
  // Quando todos os provedores na nuvem E o motor local falham, o sistema
  // recorre imediatamente aos protocolos determinísticos oficiais
  ctx.UrlFetchApp.fetch = function (url, opts) {
    throw new Error('Network connection failed / Host unreachable (Blackout total)');
  };

  const resPcrDeterminista = ctx.executarRaciocinioClinico(
    'Atendimento de urgência.',
    'Paciente em PCR no pronto-socorro com ritmo de Fibrilação Ventricular (FV).',
    1000
  );

  assert.ok(resPcrDeterminista, 'Deve fornecer resposta de segurança do protocolo offline');
  assert.ok(resPcrDeterminista.includes('MODO OFFLINE DE CONTINGÊNCIA'), 'Deve conter cabeçalho de contingência offline');
  assert.ok(resPcrDeterminista.includes('PARADA CARDIORRESPIRATÓRIA'), 'Deve acionar o protocolo ACLS determinístico');
  assert.ok(resPcrDeterminista.includes('Adrenalina 1 mg'), 'Deve indicar dose de Adrenalina');
  assert.ok(resPcrDeterminista.includes('Amiodarona 300 mg'), 'Deve indicar dose de Amiodarona para FV');
  console.log('✓ Teste 6: Fallback determinístico clínico oficial para PCR/ACLS em blackout validado.');

  // ---------------------------------------------------------------------------
  // Teste 7: Fallback Estruturado JSON em Blackout
  // ---------------------------------------------------------------------------
  const jsonOfflineStr = ctx._iaExecutar(
    'Classificador de intenção JSON',
    'Preciso prescrever Ciprofloxacino 500mg para infecção urinária',
    200,
    { json: true }
  );

  assert.ok(jsonOfflineStr, 'Deve retornar JSON estruturado');
  const jsonParsed = JSON.parse(jsonOfflineStr);
  assert.strictEqual(jsonParsed.intencao, 'CLINICO_RX', 'Deve classificar como CLINICO_RX');
  assert.strictEqual(jsonParsed.modoOffline, true, 'Deve marcar flag de modoOffline');
  console.log('✓ Teste 7: Extração e fallback estruturado JSON offline validado com sucesso.');

  // ---------------------------------------------------------------------------
  // Teste 8: Diagnóstico de Saúde Local (verificarSaudeLocalLlm)
  // ---------------------------------------------------------------------------
  ctx.UrlFetchApp.fetch = function (url, opts) {
    if (url.includes('/v1/models')) {
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          data: [
            { id: 'llama3.1:latest' },
            { id: 'mistral:latest' }
          ]
        })
      };
    }
    return { getResponseCode: () => 404, getContentText: () => '{}' };
  };

  const saude = ctx.verificarSaudeLocalLlm();
  assert.strictEqual(saude.ok, true, 'Saúde deve retornar OK');
  assert.strictEqual(saude.status, 'ONLINE', 'Status deve ser ONLINE');
  assert.ok(saude.modelosDisponiveis.includes('llama3.1:latest'), 'Deve listar modelo llama3.1');
  console.log('✓ Teste 8: Diagnóstico de saúde do servidor de IA local validado com sucesso.');

  // ---------------------------------------------------------------------------
  // Teste 9: Integração RPC com o Cockpit PWA (cockpitLocalLlm)
  // ---------------------------------------------------------------------------
  const rpcConfig = runtime.cockpitRpc('cockpitLocalLlm', 'session_test', [{ acao: 'config' }]);
  assert.ok(rpcConfig, 'RPC config deve responder');
  assert.ok(rpcConfig.url.includes('11434'), 'RPC deve retornar URL do motor local');
  assert.ok(Array.isArray(rpcConfig.modelosConfigurados), 'Modelos configurados deve ser array');

  const rpcStatus = runtime.cockpitRpc('cockpitLocalLlm', 'session_test', [{ acao: 'status' }]);
  assert.strictEqual(rpcStatus.ok, true, 'RPC status deve responder online com o mock');

  console.log('✓ Teste 9: Métodos RPC do Cockpit (config e status) validados com sucesso.');

  // Restaura o fetch original
  ctx.UrlFetchApp.fetch = urlFetchOriginal;

  console.log('🚀 TODOS OS TESTES DE IA LOCAL E FALLBACK OFFLINE PASSARAM COM SUCESSO!\n');
}

runTests();
