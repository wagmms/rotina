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
});
