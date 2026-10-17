/**
 * ==============================================================================
 * tests/test_circuit_breaker_multimodal.cjs
 * ==============================================================================
 * Bateria de testes automatizados para:
 * 1. Circuit Breaker determinístico (CLOSED, OPEN, HALF_OPEN)
 * 2. Timeout seguro de 15s para chamadas de IA multimodal
 * 3. Fallback determinístico local de laudos de imagem médica (FMRP-USP)
 * 4. Fallback determinístico local de áudio clínico (SOAP e Leito de Enfermaria)
 * 5. Integração defensiva em chamarGeminiPoolMultimodal e processarAudioClinicoMultimodal
 * 6. Telemetria e observabilidade do Circuit Breaker no endpoint /api/status
 * ==============================================================================
 */

const assert = require('assert');
const test = require('node:test');

test('⚡ Bateria de Testes: Circuit Breaker Multimodal e Resiliência Local', async (t) => {
  const runtime = require('../server/runtime');
  const { ctx } = runtime;
  const { IaCircuitBreaker, IaLocalFallbackService } = ctx;

  assert(IaCircuitBreaker, 'IaCircuitBreaker deve estar carregado no contexto do runtime.');
  assert(IaLocalFallbackService, 'IaLocalFallbackService deve estar carregado no contexto do runtime.');

  // ───────────────────────────────────────────────────────────────────────────
  // 1. TESTES UNITÁRIOS DO CIRCUIT BREAKER (TRANSIÇÕES DE ESTADO)
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('1. Circuit Breaker: Estados CLOSED, OPEN, HALF_OPEN e Cooldown', () => {
    IaCircuitBreaker.resetar('TESTE_CB');
    let st = IaCircuitBreaker.obterStatus('TESTE_CB');
    assert.strictEqual(st.estado, 'CLOSED');
    assert.strictEqual(st.fechado, true);
    assert.strictEqual(st.aberto, false);
    assert.strictEqual(st.falhasConsecutivas, 0);

    // Falha 1: Permanece CLOSED
    IaCircuitBreaker.registrarFalha('TESTE_CB', 'Timeout 15s');
    st = IaCircuitBreaker.obterStatus('TESTE_CB');
    assert.strictEqual(st.estado, 'CLOSED');
    assert.strictEqual(st.falhasConsecutivas, 1);
    assert.strictEqual(IaCircuitBreaker.podeExecutar('TESTE_CB'), true);

    // Falha 2: Permanece CLOSED
    IaCircuitBreaker.registrarFalha('TESTE_CB', '503 Service Unavailable');
    st = IaCircuitBreaker.obterStatus('TESTE_CB');
    assert.strictEqual(st.estado, 'CLOSED');
    assert.strictEqual(st.falhasConsecutivas, 2);
    assert.strictEqual(IaCircuitBreaker.podeExecutar('TESTE_CB'), true);

    // Falha 3: Transiciona para OPEN
    IaCircuitBreaker.registrarFalha('TESTE_CB', 'Connection Reset');
    st = IaCircuitBreaker.obterStatus('TESTE_CB');
    assert.strictEqual(st.estado, 'OPEN');
    assert.strictEqual(st.aberto, true);
    assert.strictEqual(st.fechado, false);
    assert.strictEqual(st.falhasConsecutivas, 3);
    assert.ok(st.tempoRestanteMs > 0, 'Deve ter cooldown restante');

    // Estado OPEN: Bloqueia imediatamente chamadas em 0ms
    assert.strictEqual(IaCircuitBreaker.podeExecutar('TESTE_CB'), false);
    st = IaCircuitBreaker.obterStatus('TESTE_CB');
    assert.strictEqual(st.totalBloqueios, 1);

    // Simula expiração do cooldown (transição para HALF_OPEN)
    IaCircuitBreaker.forcarEstado('TESTE_CB', 'HALF_OPEN');
    st = IaCircuitBreaker.obterStatus('TESTE_CB');
    assert.strictEqual(st.estado, 'HALF_OPEN');
    assert.strictEqual(st.meioAberto, true);
    assert.strictEqual(IaCircuitBreaker.podeExecutar('TESTE_CB'), true);

    // Sucesso em HALF_OPEN: Restabelece para CLOSED
    IaCircuitBreaker.registrarSucesso('TESTE_CB');
    st = IaCircuitBreaker.obterStatus('TESTE_CB');
    assert.strictEqual(st.estado, 'CLOSED');
    assert.strictEqual(st.fechado, true);
    assert.strictEqual(st.falhasConsecutivas, 0);

    // Testa reabertura se falhar em HALF_OPEN
    IaCircuitBreaker.forcarEstado('TESTE_CB', 'HALF_OPEN');
    IaCircuitBreaker.registrarFalha('TESTE_CB', 'Falha na sonda de teste');
    st = IaCircuitBreaker.obterStatus('TESTE_CB');
    assert.strictEqual(st.estado, 'OPEN');
    assert.strictEqual(st.aberto, true);

    // Reset limpa contadores
    IaCircuitBreaker.resetar('TESTE_CB');
    st = IaCircuitBreaker.obterStatus('TESTE_CB');
    assert.strictEqual(st.estado, 'CLOSED');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. LAUDO DETERMINÍSTICO DE IMAGEM MÉDICA OFFLINE (FMRP-USP)
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('2. Laudo de Imagem Médica Offline: ECG, RX, Dermatologia e Alerta Crítico', () => {
    // 2.1 ECG com dor torácica aguda (Alerta de Emergência obrigatório na 1ª linha)
    const laudoEcg = IaLocalFallbackService.analisarImagemOffline('ECG de paciente com dor no peito e supra de ST', 'image/jpeg');
    assert(laudoEcg.includes('MODO OFFLINE DE CONTINGÊNCIA'), 'Deve conter cabeçalho de contingência.');
    assert(laudoEcg.includes('EMERGÊNCIA - ACHADO CRÍTICO (SALA VERMELHA / SCA)'), 'Alerta de SCA obrigatório na 1ª linha.');
    assert(laudoEcg.includes('6 PASSOS SBC'), 'Deve conter o roteiro sistemático em 6 passos SBC.');
    assert(laudoEcg.includes('Ritmo'), 'Deve analisar ritmo.');
    assert(laudoEcg.includes('Frequência Cardíaca'), 'Deve calcular FC.');
    assert(laudoEcg.includes('Eixo Elétrico'), 'Deve analisar eixo frontal.');
    assert(laudoEcg.includes('Intervalos e Condução'), 'Deve analisar PR, QRS e QTc de Bazett.');
    assert(laudoEcg.includes('Sobrecargas de Câmaras'), 'Deve checar Sokolow-Lyon e Cornell.');
    assert(laudoEcg.includes('Isquemia, Lesão e Necrose'), 'Deve checar paredes contíguas e V3R/V4R.');

    // 2.2 Radiografia de Tórax (RX 5 Passos)
    const laudoRx = IaLocalFallbackService.analisarImagemOffline('Raio-X de tórax paciente com tosse e febre', 'image/jpeg');
    assert(laudoRx.includes('5 PASSOS CBR'), 'Deve conter os 5 passos do RX de tórax.');
    assert(laudoRx.includes('Identificação e Técnica'), 'Passo 1: Técnica.');
    assert(laudoRx.includes('Arcabouço Ósseo e Partes Moles'), 'Passo 2: Arcabouço.');
    assert(laudoRx.includes('Mediastino e Silhueta Cardíaca'), 'Passo 3: Mediastino.');
    assert(laudoRx.includes('Campos Pleuropulmonares'), 'Passo 4: Pleuropulmonar.');
    assert(laudoRx.includes('Pleura e Cúpulas Diafragmáticas'), 'Passo 5: Pleura/cúpulas.');

    // 2.3 Dermatologia (Regra ABCDE)
    const laudoDerma = IaLocalFallbackService.analisarImagemOffline('Lesão de pele hiperpigmentada em dorso', 'image/jpeg');
    assert(laudoDerma.includes('ROTEIRO SEMIOLÓGICO DERMATOLÓGICO'), 'Deve identificar dermato.');
    assert(laudoDerma.includes('Regra ABCDE para Lesões Pigmentadas'), 'Deve incluir a regra ABCDE.');

    // 2.4 Laboratório / Limites críticos
    const laudoLab = IaLocalFallbackService.analisarImagemOffline('Resultado de exame com potássio alterado', 'image/jpeg');
    assert(laudoLab.includes('VALORES CRÍTICOS LABORATORIAIS'), 'Deve identificar laboratório.');
    assert(laudoLab.includes('Gluconato de Cálcio 10%'), 'Deve instruir antídoto de hipercalemia.');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. PROCESSADOR DETERMINÍSTICO DE ÁUDIO CLÍNICO OFFLINE
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('3. Áudio Clínico Offline: Ditado de Leito, Emergência e Contrato SOAP', () => {
    // 3.1 Ditado de leito de enfermaria
    const resLeito = IaLocalFallbackService.processarAudioClinicoOffline('dummy_audio', 'audio/wav', {
      caption: 'Leito 14B: paciente afebril, em ar ambiente, aguardando parecer da cardiologia'
    });
    assert.strictEqual(resLeito.sucesso, true);
    assert.strictEqual(resLeito.eh_clinico, true);
    assert.strictEqual(resLeito.tipo_relato, 'leito');
    assert.strictEqual(resLeito.numero_leito, '14B');
    assert.strictEqual(resLeito.status_sugerido, 'estavel');
    assert(resLeito.evolucao_texto.includes('Leito 14B'), 'Evolução formal de leito montada.');

    // 3.2 Ditado de emergência com PCR / ACLS
    const resPcr = IaLocalFallbackService.processarAudioClinicoOffline('dummy_audio', 'audio/wav', {
      caption: 'Paciente em parada cardiorrespiratoria em FV'
    });
    assert.strictEqual(resPcr.sucesso, true);
    assert.strictEqual(resPcr.status_sugerido, 'instavel');
    assert(resPcr.soapTexto.includes('PARADA CARDIORRESPIRATÓRIA'), 'Deve acoplar protocolo ACLS oficial.');
    assert(resPcr.soapTexto.includes('Adrenalina 1 mg IV/IO'), 'Dose e vias preservadas intactas.');

    // 3.3 Ditado ambulatorial padrão
    const resAmbulat = IaLocalFallbackService.processarAudioClinicoOffline('dummy_audio', 'audio/wav', {
      caption: 'Paciente com cefaleia pulsátil unilateral há 2 dias'
    });
    assert.strictEqual(resAmbulat.tipo_relato, 'soap');
    assert.ok(resAmbulat.perguntas_anamnese.length >= 2, 'Deve sugerir perguntas de anamnese direcionadas.');
    assert.strictEqual(resAmbulat.contingencia_offline, true);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. INTEGRAÇÃO DEFENSIVA EM CHAMARGEMINIPOOLMULTIMODAL & PROCESSARAUDIOCLINICOMULTIMODAL
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('4. chamarGeminiPoolMultimodal & processarAudioClinicoMultimodal sob Falhas Externas', () => {
    // Prepara Circuit Breaker limpo
    IaCircuitBreaker.resetar('MULTIMODAL');

    // 4.1 Mock de falha no provedor externo
    const originalProv = ctx._iaProvGemini;
    ctx._iaProvGemini = () => null; // Simula saturação/timeout de todos os modelos

    try {
      // Chamada de imagem quando IA externa falha -> deve retornar laudo determinístico offline!
      const resImgFallback = ctx.analisarImagemMedicaComIA('fake_b64', 'image/jpeg', 'ECG com dor precordial e supra');
      assert(resImgFallback, 'Deve retornar fallback de laudo.');
      assert(resImgFallback.includes('MODO OFFLINE DE CONTINGÊNCIA'), 'Laudo offline gerado.');
      assert(resImgFallback.includes('6 PASSOS SBC'), 'Roteiro de ECG incorporado.');

      // Chamada de áudio quando IA externa falha -> deve retornar contrato estruturado offline!
      const resAudioFallback = ctx.processarAudioClinicoMultimodal('fake_b64', 'audio/wav', {
        caption: 'Quarto 20: paciente evoluindo estável'
      });
      assert(resAudioFallback, 'Deve retornar fallback de áudio.');
      assert.strictEqual(resAudioFallback.eh_clinico, true);
      assert.strictEqual(resAudioFallback.tipo_relato, 'leito');
      assert.strictEqual(resAudioFallback.numero_leito, '20');

      // 4.2 Circuit Breaker ABERTO: Fast-Fail em 0ms
      IaCircuitBreaker.forcarEstado('MULTIMODAL', 'OPEN', 'Forçado para teste');
      assert.strictEqual(IaCircuitBreaker.podeExecutar('MULTIMODAL'), false);

      let chamadaExecutada = false;
      ctx._iaProvGemini = () => { chamadaExecutada = true; return { texto: 'Não deveria chamar' }; };

      const resBloqueado = ctx.chamarGeminiPoolMultimodal('fake_b64', 'image/jpeg', 'Sistema', 'ECG');
      assert.strictEqual(chamadaExecutada, false, 'Com circuito aberto, NÃO deve realizar chamada externa.');
      assert(resBloqueado.includes('MODO OFFLINE DE CONTINGÊNCIA'), 'Deve acionar fallback determinístico imediato.');

      // 4.3 Opção fallbackOffline: false
      const resSemFallback = ctx.chamarGeminiPoolMultimodal('fake_b64', 'image/jpeg', 'Sistema', 'ECG', {
        fallbackOffline: false
      });
      assert.strictEqual(resSemFallback, null, 'Com fallbackOffline: false, retorna null.');
    } finally {
      ctx._iaProvGemini = originalProv;
      IaCircuitBreaker.resetar('MULTIMODAL');
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. TESTE DE TELEMETRIA FASTIFY /API/STATUS
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('5. Telemetria do Circuit Breaker no endpoint /api/status', async () => {
    const { buildServer } = require('../server/index.js');
    const app = await buildServer();
    const res = await app.inject({
      method: 'GET',
      url: '/api/status'
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert(body.circuit_breaker, 'Endpoint deve reportar bloco circuit_breaker.');
    assert(body.circuit_breaker.multimodal, 'Telemetria do circuito multimodal presente.');
    assert.strictEqual(body.circuit_breaker.multimodal.chave, 'MULTIMODAL');
    assert.strictEqual(body.circuit_breaker.multimodal.estado, 'CLOSED');
  });
});
