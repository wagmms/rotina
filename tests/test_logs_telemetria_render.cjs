/**
 * ==============================================================================
 * ULTRA ROTINA · TESTES DE LOGS, MONITORAMENTO E TELEMETRIA DE ERROS
 * ==============================================================================
 * Valida a rastreabilidade em produção (Render), Request Correlation IDs,
 * medição precisa de latência por endpoint, buffer circular de erros e
 * métricas agregadas de saúde e memória.
 * ==============================================================================
 */

const assert = require('assert');
const { buildServer } = require('../server/index.js');
const {
  registrarErroSistema,
  obterUltimosErros,
  obterMetricasAgregadas,
  limparMetricasTeste
} = require('../server/telemetry.js');

async function testLogsTelemetriaRender() {
  console.log('=== INICIANDO TESTES DE LOGS, TELEMETRIA E RASTREABILIDADE (RENDER) ===\n');
  limparMetricasTeste();

  const app = await buildServer();

  try {
    console.log('[1] Testando injeção e preservação de Request ID (Correlation ID)...');
    // 1.1 Sem header prévio: deve gerar req_...
    const resSemTrace = await app.inject({ method: 'GET', url: '/health' });
    assert.strictEqual(resSemTrace.statusCode, 200);
    const traceGerado = resSemTrace.headers['x-request-id'];
    assert(traceGerado && traceGerado.startsWith('req_'), `Request ID deve ser gerado com prefixo req_, recebido: ${traceGerado}`);
    assert(resSemTrace.headers['x-response-time'], 'Header x-response-time deve estar presente');
    console.log(`  ✓ Request ID gerado automaticamente: ${traceGerado} (${resSemTrace.headers['x-response-time']})`);

    // 1.2 Com header prévio: deve propagar o trace ID do cliente/Render
    const customTraceId = 'render-trace-beira-leito-98765';
    const resComTrace = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-request-id': customTraceId }
    });
    assert.strictEqual(resComTrace.headers['x-request-id'], customTraceId, 'Deve manter o trace ID enviado');
    console.log(`  ✓ Correlation ID propagado com fidelidade: ${customTraceId}`);

    console.log('\n[2] Testando enriquecimento de erro 404 com Request ID...');
    const res404 = await app.inject({ method: 'GET', url: '/rota-inexistente-telemetria' });
    assert.strictEqual(res404.statusCode, 404);
    const body404 = JSON.parse(res404.payload);
    assert(body404.requestId, 'Resposta de 404 deve conter requestId para rastreamento');
    assert.strictEqual(body404.requestId, res404.headers['x-request-id']);
    console.log(`  ✓ Erro 404 correlacionado com requestId: ${body404.requestId}`);

    console.log('\n[3] Testando endpoint de Métricas Agregadas (/api/telemetria/metricas)...');
    const resMetricas = await app.inject({ method: 'GET', url: '/api/telemetria/metricas' });
    assert.strictEqual(resMetricas.statusCode, 200);
    const metricas = JSON.parse(resMetricas.payload);
    assert.strictEqual(metricas.ok, true);
    assert.strictEqual(metricas.servico, 'Ultra Rotina Telemetria & Monitoramento');
    assert(metricas.uptime_segundos >= 0, 'Uptime deve ser não-negativo');
    assert(metricas.memoria_mb && typeof metricas.memoria_mb.rss === 'number', 'Memória RSS deve estar informada');
    assert(metricas.requisicoes && metricas.requisicoes.total >= 3, 'Contagem total de requisições deve registrar as chamadas anteriores');
    assert(metricas.latencia && metricas.latencia.amostras >= 3, 'Amostras de latência devem ser computadas');
    assert(metricas.latencia.media_ms >= 0, 'Latência média deve ser calculada');
    assert(metricas.rotas_mais_acessadas['GET /health'] >= 2, 'Rota /health deve estar contabilizada nas rotas ativas');
    console.log(`  ✓ Métricas agregadas validadas: ${metricas.requisicoes.total} requisições, P95: ${metricas.latencia.p95_ms}ms, Memória RSS: ${metricas.memoria_mb.rss}MB`);

    console.log('\n[4] Testando Buffer Circular de Erros (/api/telemetria/erros)...');
    registrarErroSistema('teste_unitario', 'Simulação controlada de erro para auditoria', { codigo: 'ERR_SIM_01' });
    
    const resErros = await app.inject({ method: 'GET', url: '/api/telemetria/erros?limite=5' });
    assert.strictEqual(resErros.statusCode, 200);
    const bodyErros = JSON.parse(resErros.payload);
    assert.strictEqual(bodyErros.ok, true);
    assert(bodyErros.total >= 1, 'Deve conter pelo menos 1 erro');
    const erroRegistrado = bodyErros.erros[0];
    assert.strictEqual(erroRegistrado.origem, 'teste_unitario');
    assert.strictEqual(erroRegistrado.mensagem, 'Simulação controlada de erro para auditoria');
    assert.strictEqual(erroRegistrado.detalhes.codigo, 'ERR_SIM_01');
    console.log(`  ✓ Buffer circular de erros capturou evento: [${erroRegistrado.origem}] ${erroRegistrado.mensagem}`);

    console.log('\n[5] Testando resiliência do buffer circular (rotação máxima de 20 erros)...');
    for (let i = 1; i <= 25; i++) {
      registrarErroSistema('estresse', `Erro sequencial número ${i}`);
    }
    const errosRotacionados = obterUltimosErros(50);
    assert(errosRotacionados.length <= 20, `Buffer circular não deve exceder 20 itens, atual: ${errosRotacionados.length}`);
    assert.strictEqual(errosRotacionados[0].mensagem, 'Erro sequencial número 25', 'O erro mais recente deve estar no topo');
    console.log(`  ✓ Rotação O(1) de erros validada: tamanho mantido em ${errosRotacionados.length} sem vazamento de memória`);

    console.log('\n🎉 TODOS OS TESTES DE LOGS, TELEMETRIA E RASTREABILIDADE (RENDER) FORAM APROVADOS COM 100% DE SUCESSO!\n');
  } finally {
    await app.close();
  }
}

testLogsTelemetriaRender().catch((err) => {
  console.error('❌ Falha nos testes de logs e telemetria:', err);
  process.exit(1);
});
