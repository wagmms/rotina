/**
 * ==============================================================================
 * TESTE DE AUTOMAÇÃO E AUDITORIA CLÍNICA: OTORRINOLARINGOLOGIA E URGÊNCIAS
 * ==============================================================================
 * Validação rigorosa dos motores de:
 * 1. Vertigem & Protocolo HINTS/HINTS-Plus (Diferenciação AVC vs Neurite vs VPPB)
 * 2. Epistaxe Aguda Escalonada (Anterior vs Posterior, Sonda de Foley e Bloqueios)
 * 3. Métodos Fastify Cockpit RPC e Despachante Telegram
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');

// Carrega o runtime oficial Node.js do projeto
const { ctx, cockpitRpc } = require('../server/runtime.js');
const service = ctx.OtorrinoEpistaxeVertigemService;

console.log("=== INICIANDO BATERIA DE AUDITORIA: OTORRINO (VERTIGEM & EPISTAXE) ===\n");

let aprovados = 0;
function testar(titulo, fn) {
  try {
    fn();
    console.log(`  ✓ ${titulo}`);
    aprovados++;
  } catch (err) {
    console.error(`  ❌ FALHA em "${titulo}":`, err.message);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// [1] SÍNDROME VESTIBULAR AGUDA & PROTOCOLO HINTS
// ─────────────────────────────────────────────────────────────────────────────
console.log("[1] Testando Vertigem e Protocolo HINTS (Bárány / AHA)...");

testar("HINTS Central 1: Head Impulse NORMAL gera alerta crítico de AVC ('Normal is dangerous')", () => {
  const res = service.avaliarVertigemHints({
    continua: true,
    headImpulse: "normal",
    nistagmo: "unidirecional_horizontal",
    testOfSkew: "normal"
  });

  assert.strictEqual(res.sucesso, true);
  assert.strictEqual(res.risco_avc.includes("Crítico"), true);
  assert.strictEqual(res.classificacao_final.includes("ALTO RISCO DE AVC"), true);
  assert.strictEqual(res.achados_centrais.some(a => a.includes("Normal is dangerous")), true);
  assert.strictEqual(res.redFlags.some(r => r.includes("AVC de Fossa Posterior")), true);
  assert.strictEqual(res.condutas_beira_leito.some(c => c.includes("SALA VERMELHA")), true);
});

testar("HINTS Central 2: Nistagmo Bidirecional (Gaze-evoked) detecta lesão central de tronco/cerebelo", () => {
  const res = service.avaliarVertigemHints({
    continua: true,
    headImpulse: "anormal",
    nistagmo: "bidirecional_ou_vertical",
    testOfSkew: "normal"
  });

  assert.strictEqual(res.sucesso, true);
  assert.strictEqual(res.classificacao_final.includes("ALTO RISCO DE AVC"), true);
  assert.strictEqual(res.achados_centrais.some(a => a.includes("Bidirecional")), true);
});

testar("HINTS Central 3: Skew Deviation (desalinhamento vertical) confirma lesão de via otolítica central", () => {
  const res = service.avaliarVertigemHints({
    continua: true,
    headImpulse: "anormal",
    nistagmo: "unidirecional_horizontal",
    testOfSkew: "alterado"
  });

  assert.strictEqual(res.sucesso, true);
  assert.strictEqual(res.classificacao_final.includes("ALTO RISCO DE AVC"), true);
  assert.strictEqual(res.achados_centrais.some(a => a.includes("Skew Deviation")), true);
});

testar("HINTS-Plus: Perda Auditiva Súbita associada a vertigem alerta para AVC de AICA", () => {
  const res = service.avaliarVertigemHints({
    continua: true,
    headImpulse: "anormal",
    nistagmo: "unidirecional_horizontal",
    testOfSkew: "normal",
    perdaAuditivaAguda: true
  });

  assert.strictEqual(res.sucesso, true);
  assert.strictEqual(res.classificacao_final.includes("ALTO RISCO DE AVC"), true);
  assert.strictEqual(res.achados_centrais.some(a => a.includes("HINTS-Plus")), true);
  assert.strictEqual(res.achados_centrais.some(a => a.includes("AICA")), true);
});

testar("HINTS Periférico: Neurite Vestibular Benigna confirmada e bloqueio de labirintolíticos crônicos", () => {
  const res = service.avaliarVertigemHints({
    continua: true,
    headImpulse: "anormal",
    nistagmo: "unidirecional_horizontal",
    testOfSkew: "normal",
    perdaAuditivaAguda: false
  });

  assert.strictEqual(res.sucesso, true);
  assert.strictEqual(res.risco_avc, "Baixo (Padrão HINTS 100% Periférico)");
  assert.strictEqual(res.classificacao_final.includes("BAIXO RISCO DE AVC"), true);
  assert.strictEqual(res.diagnostico_provavel.includes("Neurite Vestibular"), true);
  assert.strictEqual(res.condutas_beira_leito.some(c => c.includes("Dimenidrinato")), true);
  // Bloqueio de segurança
  assert.strictEqual(res.bloqueios_iatrogenia.some(b => b.includes("PROIBIDO manter sedativos vestibulares")), true);
});

testar("VPPB: Vertigem episódica posicional orienta manobra de Epley e contraindica fármacos", () => {
  const res = service.avaliarVertigemHints({
    episodica: true,
    dixHallpikePositivo: true,
    texto: "vertigem dura 30 segundos ao virar na cama"
  });

  assert.strictEqual(res.sucesso, true);
  assert.strictEqual(res.classificacao_final.includes("VPPB"), true);
  assert.strictEqual(res.condutas_beira_leito.some(c => c.includes("EPLEY")), true);
  assert.strictEqual(res.bloqueios_iatrogenia.some(b => b.includes("NÃO prescrever labirintolíticos contínuos")), true);
});

testar("Alerta de Neuroimagem: TC de crânio nas primeiras 24h possui sensibilidade baixa para fossa posterior", () => {
  const res = service.avaliarVertigemHints({
    headImpulse: "normal",
    texto: "paciente com vertigem continua"
  });

  assert.strictEqual(res.redFlags.some(r => r.includes("16 a 26%")), true);
  assert.strictEqual(res.redFlags.some(r => r.includes("Tomografia de Crânio (TC) normal NÃO descarta")), true);
});

// ─────────────────────────────────────────────────────────────────────────────
// [2] EPISTAXE AGUDA NO PRONTO-SOCORRO
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[2] Testando Manejo Escalonado de Epistaxe Aguda...");

testar("Epistaxe Anterior: Compressão, vasoconstritor e cauterização com nitrato de prata 75%", () => {
  const res = service.avaliarEpistaxe({
    localizacao: "anterior",
    paSistolica: 130,
    paDiastolica: 85
  });

  assert.strictEqual(res.sucesso, true);
  assert.strictEqual(res.classificacao_anatomica.includes("Epistaxe Anterior"), true);
  assert.strictEqual(res.topografia_provavel.includes("Kiesselbach"), true);
  assert.strictEqual(res.passos_escalonados.some(p => p.includes("COMPRESSÃO BIDIGITAL")), true);
  assert.strictEqual(res.passos_escalonados.some(p => p.includes("NITRATO DE PRATA 75%")), true);
});

testar("Bloqueio de Postura: NUNCA reclinar a cabeça do paciente para trás", () => {
  const res = service.avaliarEpistaxe({ localizacao: "anterior" });
  assert.strictEqual(res.bloqueios_iatrogenia.some(b => b.includes("NUNCA reclinar a cabeça do paciente para trás")), true);
});

testar("Bloqueio de Cauterização: NUNCA cauterizar ambos os lados do septo nasal (risco de perfuração)", () => {
  const res = service.avaliarEpistaxe({ localizacao: "anterior" });
  assert.strictEqual(res.bloqueios_iatrogenia.some(b => b.includes("NUNCA cauterizar os dois lados do septo nasal")), true);
  assert.strictEqual(res.bloqueios_iatrogenia.some(b => b.includes("PERFURAÇÃO PERMANENTE DO SEPTO")), true);
});

testar("Epistaxe Posterior: Indicação de Sonda de Foley com Água Destilada e tamponamento anterior", () => {
  const res = service.avaliarEpistaxe({
    localizacao: "posterior",
    falhaTamponamentoAnterior: true
  });

  assert.strictEqual(res.sucesso, true);
  assert.strictEqual(res.classificacao_anatomica.includes("Epistaxe Posterior"), true);
  assert.strictEqual(res.topografia_provavel.includes("Woodruff"), true);
  assert.strictEqual(res.tecnica_tamponamento_posterior.some(t => t.includes("ÁGUA DESTILADA ESTÉRIL")), true);
  assert.strictEqual(res.tecnica_tamponamento_posterior.some(t => t.includes("COMPLEMENTAÇÃO ANTERIOR OBRIGATÓRIA")), true);
  assert.strictEqual(res.bloqueios_iatrogenia.some(b => b.includes("NUNCA usar Soro Fisiológico")), true);
  assert.strictEqual(res.bloqueios_iatrogenia.some(b => b.includes("PREVENÇÃO DE NECROSE ALAR")), true);
});

testar("Reflexo Nasopulmonar: Alerta de hipóxia e arritmia com internação obrigatória no tamponamento posterior", () => {
  const res = service.avaliarEpistaxe({ localizacao: "posterior" });
  assert.strictEqual(res.bloqueios_iatrogenia.some(b => b.includes("REFLEXO NASOPULMONAR")), true);
  assert.strictEqual(res.bloqueios_iatrogenia.some(b => b.includes("INTERNAÇÃO HOSPITALAR MANDATÓRIA")), true);
});

testar("Hipertensão Arterial Concomitante: Bloqueio contra redução abrupta de PA no PS", () => {
  const res = service.avaliarEpistaxe({
    localizacao: "anterior",
    paSistolica: 190,
    paDiastolica: 110
  });

  assert.strictEqual(res.sucesso, true);
  assert.strictEqual(res.bloqueios_iatrogenia.some(b => b.includes("NUNCA baixar a pressão arterial abruptamente no PS")), true);
});

testar("Varfarina e RNI Elevado: Protocolo com Vitamina K1 e PCC", () => {
  const res = service.avaliarEpistaxe({
    localizacao: "posterior",
    anticoagulante: "varfarina",
    rni: 4.6
  });

  assert.strictEqual(res.sucesso, true);
  assert.strictEqual(res.passos_escalonados.some(p => p.includes("Fitomenadiona (Vitamina K1)")), true);
  assert.strictEqual(res.passos_escalonados.some(p => p.includes("Complexo Protrombínico")), true);
});

// ─────────────────────────────────────────────────────────────────────────────
// [3] FASTIFY COCKPIT RPC & TELEGRAM DISPATCH
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[3] Testando Métodos Cockpit RPC e Despachante Telegram...");

testar("RPC cockpitOtorrinoVertigemHints executa com sucesso e formata saída", () => {
  const resp = cockpitRpc("cockpitOtorrinoVertigemHints", "internal", [{
    headImpulse: "normal",
    nistagmo: "bidirecional_ou_vertical"
  }]);

  assert.strictEqual(resp.sucesso, true);
  assert.strictEqual(typeof resp.textoFormatado, 'string');
  assert.strictEqual(resp.textoFormatado.includes("PROTOCOLO HINTS"), true);
  assert.strictEqual(resp.resultado.classificacao_final.includes("ALTO RISCO DE AVC"), true);
});

testar("RPC aliases cockpitVertigem e cockpitHints funcionam identicamente", () => {
  const respV = cockpitRpc("cockpitVertigem", "internal", [{ headImpulse: "anormal", nistagmo: "unidirecional_horizontal", testOfSkew: "normal" }]);
  const respH = cockpitRpc("cockpitHints", "internal", [{ headImpulse: "anormal", nistagmo: "unidirecional_horizontal", testOfSkew: "normal" }]);

  assert.strictEqual(respV.sucesso, true);
  assert.strictEqual(respH.sucesso, true);
  assert.strictEqual(respV.resultado.diagnostico_provavel, respH.resultado.diagnostico_provavel);
});

testar("RPC cockpitOtorrinoEpistaxe e aliases cockpitEpistaxe / cockpitTamponamento", () => {
  const respE = cockpitRpc("cockpitOtorrinoEpistaxe", "internal", [{ localizacao: "anterior" }]);
  const respEp = cockpitRpc("cockpitEpistaxe", "internal", [{ localizacao: "anterior" }]);
  const respT = cockpitRpc("cockpitTamponamento", "internal", [{ localizacao: "posterior" }]);

  assert.strictEqual(respE.sucesso, true);
  assert.strictEqual(respEp.sucesso, true);
  assert.strictEqual(respT.sucesso, true);
  assert.strictEqual(respT.textoFormatado.includes("Sonda de Foley"), true);
});

testar("RPC cockpitOtorrinoResumo retorna visão integrada", () => {
  const respR = cockpitRpc("cockpitOtorrinoResumo", "internal", [{
    vertigem: { headImpulse: "normal" },
    epistaxe: { localizacao: "posterior" }
  }]);

  assert.strictEqual(respR.sucesso, true);
  assert.strictEqual(respR.vertigem.sucesso, true);
  assert.strictEqual(respR.epistaxe.sucesso, true);
});

testar("Parser Telegram: Comando /vertigem com texto livre e /epistaxe", () => {
  let msgEnviada = "";
  const origEnviar = ctx.enviarMensagemParaChat;
  ctx.enviarMensagemParaChat = (chatId, texto) => {
    msgEnviada = texto;
    return { ok: true };
  };

  try {
    ctx.processarMensagemTexto({
      chat: { id: 12345 },
      text: "/vertigem vertigem continua com nistagmo bidirecional impulso normal"
    });

    assert.strictEqual(msgEnviada.includes("PROTOCOLO HINTS"), true);
    assert.strictEqual(msgEnviada.includes("ALTO RISCO DE AVC"), true);

    msgEnviada = "";
    ctx.processarMensagemTexto({
      chat: { id: 12345 },
      text: "/epistaxe posterior volumoso falha do tampao anterior PA 190x100"
    });

    assert.strictEqual(msgEnviada.includes("MANEJO ESCALONADO DE EPISTAXE"), true);
    assert.strictEqual(msgEnviada.includes("Epistaxe Posterior"), true);
    assert.strictEqual(msgEnviada.includes("Sonda de Foley"), true);
  } finally {
    ctx.enviarMensagemParaChat = origEnviar;
  }
});

console.log(`\n🎉 SUCESSO TOTAL: Todos os ${aprovados}/${aprovados} testes de Otorrinolaringologia (Vertigem/HINTS & Epistaxe) passaram com 100% de aprovação!`);
