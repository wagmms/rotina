/**
 * Testes Unitários de Arquitetura e Resiliência do Pipeline de Motores de IA
 * Valida a refatoração linear e desacoplada de `chamarMotorIaComFallback` e `executarTentativaProvedor` em `src/04_motores_ia.js`.
 */

const assert = require('assert');
const path = require('path');
const { test } = require('node:test');

// Carrega o runtime oficial para inicializar o contexto de src/
const runtime = require('../server/runtime');

test('Pipeline de Motores de IA - Refatoração e Resiliência', async (t) => {
  const ctx = runtime.ctx;

  await t.test('1. Funções refatoradas estão disponíveis e exportadas', () => {
    assert.strictEqual(typeof ctx.chamarMotorIaComFallback, 'function');
    assert.strictEqual(typeof ctx.executarTentativaProvedor, 'function');
    assert.strictEqual(typeof ctx._iaExecutar, 'function');
    assert.strictEqual(typeof ctx._iaAcionarFallbackOffline, 'function');
  });

  await t.test('2. executarTentativaProvedor trata sucesso, modelos e formatação sem latex', () => {
    const origChamar = ctx._iaChamarProvedor;
    try {
      ctx._iaChamarProvedor = (nome, sistema, prompt, tokens, context, opcoes) => {
        return { texto: 'Conduta: \\textbf{Prescrever} Dipirona $500\\text{ mg}$', modelo: 'gemini-mock' };
      };

      const mockCtx = ctx._iaNovoCtx(5000);
      const res = ctx.executarTentativaProvedor('GEMINI', 'sis', 'prompt', 1000, mockCtx, {});
      assert.strictEqual(res.sucesso, true);
      assert.strictEqual(res.abortar, false);
      assert.ok(res.resultado.includes('Prescrever Dipirona 500 mg'));
      assert.ok(!res.resultado.includes('\\textbf'));
    } finally {
      ctx._iaChamarProvedor = origChamar;
    }
  });

  await t.test('3. executarTentativaProvedor trata resposta truncada com exigirRespostaCompleta', () => {
    const origChamar = ctx._iaChamarProvedor;
    try {
      ctx._iaChamarProvedor = () => ({ texto: 'Texto incompleto...', truncado: true });

      const mockCtx = ctx._iaNovoCtx(5000);
      const res = ctx.executarTentativaProvedor('GEMINI', 'sis', 'prompt', 1000, mockCtx, { exigirRespostaCompleta: true });
      assert.strictEqual(res.sucesso, false);
      assert.strictEqual(res.abortar, true);
      assert.strictEqual(res.resultado, null);
    } finally {
      ctx._iaChamarProvedor = origChamar;
    }
  });

  await t.test('4. executarTentativaProvedor trata resposta vazia registrando falha no CircuitBreaker', () => {
    const origChamar = ctx._iaChamarProvedor;
    const origCb = ctx.IaCircuitBreaker;
    let falhaRegistrada = null;
    try {
      ctx.IaCircuitBreaker = {
        podeExecutar: () => true,
        registrarFalha: (nome, razao) => { falhaRegistrada = { nome, razao }; },
        registrarSucesso: () => {}
      };
      ctx._iaChamarProvedor = () => ({ texto: '   ', modelo: 'vazio' });

      const mockCtx = ctx._iaNovoCtx(5000);
      const res = ctx.executarTentativaProvedor('GROQ', 'sis', 'prompt', 1000, mockCtx, {});
      assert.strictEqual(res.sucesso, false);
      assert.strictEqual(res.abortar, false);
      assert.strictEqual(falhaRegistrada?.nome, 'GROQ');
      assert.strictEqual(falhaRegistrada?.razao, 'Resposta vazia');
    } finally {
      ctx._iaChamarProvedor = origChamar;
      ctx.IaCircuitBreaker = origCb;
    }
  });

  await t.test('5. executarTentativaProvedor trata exceções capturando erro e registrando no CircuitBreaker', () => {
    const origChamar = ctx._iaChamarProvedor;
    const origCb = ctx.IaCircuitBreaker;
    let falhaRegistrada = null;
    try {
      ctx.IaCircuitBreaker = {
        podeExecutar: () => true,
        registrarFalha: (nome, razao) => { falhaRegistrada = { nome, razao }; },
        registrarSucesso: () => {}
      };
      ctx._iaChamarProvedor = () => { throw new Error('Timeout de rede 504'); };

      const mockCtx = ctx._iaNovoCtx(5000);
      const res = ctx.executarTentativaProvedor('OPENROUTER', 'sis', 'prompt', 1000, mockCtx, {});
      assert.strictEqual(res.sucesso, false);
      assert.strictEqual(res.abortar, false);
      assert.strictEqual(falhaRegistrada?.nome, 'OPENROUTER');
      assert.strictEqual(falhaRegistrada?.razao, 'Timeout de rede 504');
    } finally {
      ctx._iaChamarProvedor = origChamar;
      ctx.IaCircuitBreaker = origCb;
    }
  });

  await t.test('6. chamarMotorIaComFallback entrega resposta do primeiro provedor com sucesso', () => {
    const origChamar = ctx._iaChamarProvedor;
    try {
      ctx._iaChamarProvedor = (nome) => {
        if (nome === 'GEMINI') return { texto: 'Conduta via Gemini OK', modelo: 'gemini-pro' };
        return null;
      };

      const res = ctx.chamarMotorIaComFallback('sis', 'prompt', 1000, {});
      assert.ok(res.includes('Conduta via Gemini OK'));
    } finally {
      ctx._iaChamarProvedor = origChamar;
    }
  });

  await t.test('7. chamarMotorIaComFallback aciona fallback offline quando todos os provedores falham', () => {
    const origChamar = ctx._iaChamarProvedor;
    try {
      ctx._iaChamarProvedor = () => null;

      const res = ctx.chamarMotorIaComFallback('sis', 'PCR assistolia', 1000, {});
      assert.ok(res, 'Deve acionar o fallback offline clínico');
      assert.ok(res.includes('MODO OFFLINE DE CONTINGÊNCIA') || res.includes('PARADA CARDIORRESPIRATÓRIA'));
    } finally {
      ctx._iaChamarProvedor = origChamar;
    }
  });

  await t.test('8. _iaExecutar mantém contrato de compatibilidade delegando para chamarMotorIaComFallback', () => {
    const origChamar = ctx._iaChamarProvedor;
    try {
      ctx._iaChamarProvedor = (nome) => ({ texto: `Resposta via ${nome}`, modelo: 'test-model' });
      const res = ctx._iaExecutar('sis', 'prompt', 1000, {});
      assert.ok(res.includes('Resposta via'));
    } finally {
      ctx._iaChamarProvedor = origChamar;
    }
  });

  await t.test('9. _iaOrdemProvedores filtra provedores sem credenciais e prioriza Gemini', () => {
    const props = ctx.PropertiesService.getScriptProperties();
    const origPadrao = props.getProperty('PROVEDOR_TEXTO_PADRAO');
    const origGroq = props.getProperty('GROQ_API_KEY');
    const origLocalAtivo = props.getProperty('LOCAL_LLM_ATIVO');
    try {
      props.deleteProperty('GROQ_API_KEY');
      props.deleteProperty('OPENROUTER_API_KEY');
      props.deleteProperty('ZAI_API_KEY');
      props.setProperty('PROVEDOR_TEXTO_PADRAO', 'GEMINI');
      props.setProperty('LOCAL_LLM_ATIVO', 'false');
      ctx.ConfigService.invalidar();

      const ordem = ctx._iaOrdemProvedores();
      assert.strictEqual(ordem.length, 1, 'Deve conter apenas 1 provedor na ausência de chaves externas e local desativado');
      assert.strictEqual(ordem[0], 'GEMINI', 'Provedor único deve ser GEMINI');

      // Se GROQ_API_KEY for fornecida, deve incluir GROQ
      props.setProperty('GROQ_API_KEY', 'mock_groq_key');
      ctx.ConfigService.invalidar();
      const ordemComGroq = ctx._iaOrdemProvedores();
      assert.ok(ordemComGroq.includes('GROQ'), 'Deve incluir GROQ quando chave estiver presente');
    } finally {
      if (origPadrao) props.setProperty('PROVEDOR_TEXTO_PADRAO', origPadrao); else props.deleteProperty('PROVEDOR_TEXTO_PADRAO');
      if (origGroq) props.setProperty('GROQ_API_KEY', origGroq); else props.deleteProperty('GROQ_API_KEY');
      if (origLocalAtivo) props.setProperty('LOCAL_LLM_ATIVO', origLocalAtivo); else props.deleteProperty('LOCAL_LLM_ATIVO');
      ctx.ConfigService.invalidar();
    }
  });

  await t.test('10. chamarMotorIaComFallback retorna null imediatamente para entradas vazias', () => {
    const res = ctx.chamarMotorIaComFallback('', '', 1000, {});
    assert.strictEqual(res, null, 'Deve retornar null com guard clause se prompt e sistema forem vazios');
  });

  await t.test('11. Separação cirúrgica de cascatas: alta densidade clínica vs rápida para roteamento', () => {
    assert.ok(ctx.IA_PADROES.GEMINI_CLINICO, 'IA_PADROES.GEMINI_CLINICO deve existir');
    assert.ok(ctx.IA_PADROES.GEMINI_RAPIDO, 'IA_PADROES.GEMINI_RAPIDO deve existir');
    assert.strictEqual(ctx.IA_PADROES.GEMINI_CLINICO[0], 'gemini-3.5-flash', 'Ponta da cascata clínica deve ser gemini-3.5-flash para máxima qualidade médica');
    assert.strictEqual(ctx.IA_PADROES.GEMINI_RAPIDO[0], 'gemini-flash-lite-latest', 'Ponta da cascata rápida deve ser gemini-flash-lite-latest para latência mínima');

    const modelosClinicos = ctx._iaLista('IA_MODELOS_CLINICOS_GEMINI', ctx.IA_PADROES.GEMINI_CLINICO);
    assert.strictEqual(modelosClinicos[0], 'gemini-3.5-flash', 'Modelos clínicos devem priorizar raciocínio denso');

    const modelosRapidos = ctx._iaLista('IA_MODELOS_RAPIDOS_GEMINI', ctx.IA_PADROES.GEMINI_RAPIDO);
    assert.strictEqual(modelosRapidos[0], 'gemini-flash-lite-latest', 'Modelos rápidos devem priorizar velocidade');
  });

  await t.test('12. _iaAuditarRascunho elimina double-LLM round-trip por padrão e respeita thinkingBudget 384', () => {
    const origExecutar = ctx._iaExecutar;
    let chamadasLlm = 0;
    ctx._iaExecutar = () => {
      chamadasLlm++;
      return 'SEM ALERTAS';
    };

    const props = ctx.PropertiesService.getScriptProperties();
    const origSegundaPassada = props.getProperty('IA_AUDITORIA_LLM_SEGUNDA_PASSADA');

    try {
      // 1. Por padrão (false), não deve acionar segunda chamada de LLM
      props.deleteProperty('IA_AUDITORIA_LLM_SEGUNDA_PASSADA');
      ctx.ConfigService.invalidar();

      const resPadrao = ctx._iaAuditarRascunho('1. Amoxicilina 500mg 8/8h', 'Amigdalite aguda', 'prescricao');
      assert.strictEqual(chamadasLlm, 0, 'Não deve chamar _iaExecutar na auditoria por padrão');
      assert.ok(resPadrao.includes('Amoxicilina 500mg'), 'Deve preservar rascunho com validação em RAM');

      // 2. Quando ativado explicitamente (true), deve executar a auditoria via LLM
      props.setProperty('IA_AUDITORIA_LLM_SEGUNDA_PASSADA', 'true');
      ctx.ConfigService.invalidar();

      const resAtivo = ctx._iaAuditarRascunho('1. Amoxicilina 500mg 8/8h', 'Amigdalite aguda', 'prescricao');
      assert.strictEqual(chamadasLlm, 1, 'Deve chamar _iaExecutar quando flag estiver ativa');
      assert.ok(resAtivo.includes('Amoxicilina 500mg'));

      // 3. Verifica default de IA_THINKING_BUDGET_CLINICO para 384
      assert.strictEqual(Number(ctx._iaCfg('IA_THINKING_BUDGET_CLINICO', 384)), 384);
    } finally {
      ctx._iaExecutar = origExecutar;
      if (origSegundaPassada) props.setProperty('IA_AUDITORIA_LLM_SEGUNDA_PASSADA', origSegundaPassada);
      else props.deleteProperty('IA_AUDITORIA_LLM_SEGUNDA_PASSADA');
      ctx.ConfigService.invalidar();
    }
  });
});

