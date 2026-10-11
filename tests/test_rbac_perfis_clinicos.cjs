/**
 * TESTES DETERMINÍSTICOS DE RBAC E SEPARAÇÃO DE PERFIS TELEGRAM
 * Valida a segregação de permissões:
 * 1. Titular (1771571035): Acesso irrestrito a Notion, Rotina, Agenda, Second Brain e Menu completo
 * 2. Convidado (1154165211): Acesso a Calculadoras, Condutas, CID, Prescrições; bloqueio de Notion e Rotina
 * 3. Estranho: Bloqueio total
 */
const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const runtime = require('../server/runtime.js');

async function executarTestesRBAC() {
  const ctx = runtime.ctx;

  const idTitular = 1771571035;
  const idConvidado = 1154165211;
  const idEstranho = 999999999;

  let mensagensEnviadas = [];
  let callbacksRespondidos = [];

  ctx.enviarMensagemParaChat = (id, texto) => {
    mensagensEnviadas.push({ tipo: 'texto', id, texto: String(texto) });
    return true;
  };
  ctx.enviarMensagemComTecladoParaChat = (id, texto, kb) => {
    mensagensEnviadas.push({ tipo: 'teclado', id, texto: String(texto), kb });
    return true;
  };
  ctx.enviarMensagemComTecladoFixo = (id, texto) => {
    mensagensEnviadas.push({ tipo: 'teclado_fixo', id, texto: String(texto) });
    return true;
  };
  ctx.responderCallbackTelegram = (id, texto) => {
    callbacksRespondidos.push({ id, texto: String(texto || '') });
    return true;
  };
  ctx.executarPostTelegram = (url, payload) => {
    if (payload && payload.text) {
      mensagensEnviadas.push({ tipo: 'post', id: payload.chat_id, texto: String(payload.text), kb: payload.reply_markup });
    }
    return true;
  };

  function limpar() {
    mensagensEnviadas = [];
    callbacksRespondidos = [];
  }

  console.log("=== INICIANDO BATERIA COMPLETA DE 15 TESTES DE RBAC ===");

  // Teste 1: ehUsuarioTitular para ID numérico do titular
  assert.strictEqual(ctx.ehUsuarioTitular(idTitular), true);
  console.log("✓ Teste 1: ehUsuarioTitular(idTitular) aprovado.");

  // Teste 2: ehUsuarioTitular para string do titular
  assert.strictEqual(ctx.ehUsuarioTitular(String(idTitular)), true);
  console.log("✓ Teste 2: ehUsuarioTitular('1771571035') aprovado.");

  // Teste 3: ehUsuarioTitular retorna false para convidado
  assert.strictEqual(ctx.ehUsuarioTitular(idConvidado), false);
  assert.strictEqual(ctx.ehUsuarioTitular(String(idConvidado)), false);
  console.log("✓ Teste 3: ehUsuarioTitular(idConvidado) é false.");

  // Teste 4: ehUsuarioTitular retorna false para terceiro/estranho
  assert.strictEqual(ctx.ehUsuarioTitular(idEstranho), false);
  assert.strictEqual(ctx.ehUsuarioTitular(null), false);
  console.log("✓ Teste 4: ehUsuarioTitular(idEstranho/null) é false.");

  // Teste 5: Convidado bloqueado em /rotina
  limpar();
  ctx.processarMensagemTexto({ chat: { id: idConvidado }, text: "/rotina" });
  assert(mensagensEnviadas.some(m => m.texto.includes("Restrito ao Titular")));
  console.log("✓ Teste 5: Bloqueio de /rotina para convidado validado.");

  // Teste 6: Convidado bloqueado em /task (Notion)
  limpar();
  ctx.processarMensagemTexto({ chat: { id: idConvidado }, text: "/task Comprar café" });
  assert(mensagensEnviadas.some(m => m.texto.includes("Restrito ao Titular")));
  console.log("✓ Teste 6: Bloqueio de /task (Notion) para convidado validado.");

  // Teste 7: Convidado bloqueado em /agenda
  limpar();
  ctx.processarMensagemTexto({ chat: { id: idConvidado }, text: "/agenda" });
  assert(mensagensEnviadas.some(m => m.texto.includes("Restrito ao Titular")));
  console.log("✓ Teste 7: Bloqueio de /agenda para convidado validado.");

  // Teste 8: Convidado bloqueado em /duvida (Notion)
  limpar();
  ctx.processarMensagemTexto({ chat: { id: idConvidado }, text: "/duvida Derrame pleural" });
  assert(mensagensEnviadas.some(m => m.texto.includes("Restrito ao Titular")));
  console.log("✓ Teste 8: Bloqueio de /duvida para convidado validado.");

  // Teste 9: Convidado bloqueado em /checkin e /briefing
  limpar();
  ctx.processarMensagemTexto({ chat: { id: idConvidado }, text: "/checkin" });
  assert(mensagensEnviadas.some(m => m.texto.includes("Restrito ao Titular")));
  limpar();
  ctx.processarMensagemTexto({ chat: { id: idConvidado }, text: "/briefing" });
  assert(mensagensEnviadas.some(m => m.texto.includes("Restrito ao Titular")));
  console.log("✓ Teste 9: Bloqueio de /checkin e /briefing para convidado validado.");

  // Teste 10: Menu adaptativo do Titular exibe 'Rotina & Estudo'
  limpar();
  ctx.processarMensagemTexto({ chat: { id: idTitular }, text: "/menu" });
  const msgTitular = mensagensEnviadas.find(m => m.kb);
  assert(msgTitular && JSON.stringify(msgTitular.kb).includes("Rotina & Estudo"));
  console.log("✓ Teste 10: Menu do titular exibe 'Rotina & Estudo'.");

  // Teste 11: Menu adaptativo do Convidado exibe 'Gasometria'
  limpar();
  ctx.processarMensagemTexto({ chat: { id: idConvidado }, text: "/menu" });
  const msgConvidado = mensagensEnviadas.find(m => m.kb);
  assert(msgConvidado && !JSON.stringify(msgConvidado.kb).includes("Rotina & Estudo"));
  assert(msgConvidado && JSON.stringify(msgConvidado.kb).includes("Gasometria"));
  console.log("✓ Teste 11: Menu do convidado oculta rotina e exibe 'Gasometria'.");

  // Teste 12: Acesso clínico de calculadoras autorizado para convidado
  limpar();
  ctx.processarMensagemTexto({ chat: { id: idConvidado }, text: "/curb65 confusao pressao" });
  assert(mensagensEnviadas.some(m => m.texto.includes("CURB-65")));
  console.log("✓ Teste 12: Convidado executa /curb65 com sucesso.");

  // Teste 13: Bloqueio de callbacks de hábitos para convidado
  limpar();
  ctx.processarCallbackBotao({ id: "cb1", from: { id: idConvidado }, data: "habit_check_1" });
  assert(callbacksRespondidos.some(c => c.texto.includes("exclusivo do titular")));
  console.log("✓ Teste 13: Callback de hábitos bloqueado para convidado.");

  // Teste 14: Bloqueio de callbacks de timeline para convidado
  limpar();
  ctx.processarCallbackBotao({ id: "cb2", from: { id: idConvidado }, data: "rotina:check_1" });
  assert(callbacksRespondidos.some(c => c.texto.includes("exclusivas do titular")));
  console.log("✓ Teste 14: Callback de timeline/rotina bloqueado para convidado.");

  // Teste 15: Validação de Sessão HMAC do Cockpit para ambos os IDs autorizados
  const botToken = ctx.ConfigService ? ctx.ConfigService.get('TELEGRAM_BOT_TOKEN') : 'dummy';
  const hashTitular = crypto.createHmac('sha256', botToken).update(String(idTitular)).digest('hex');
  const hashConvidado = crypto.createHmac('sha256', botToken).update(String(idConvidado)).digest('hex');
  const hashInvalido = crypto.createHmac('sha256', botToken).update(String(idEstranho)).digest('hex');
  
  assert.strictEqual(ctx.cockpitAutorizar_('ck_' + hashTitular), String(idTitular));
  assert.strictEqual(ctx.cockpitAutorizar_('ck_' + hashConvidado), String(idConvidado));
  assert.throws(() => ctx.cockpitAutorizar_('ck_' + hashInvalido), /A sessão está ausente, inválida ou expirada/);
  console.log("✓ Teste 15: Sessões HMAC do Cockpit validadas para ambos os IDs autorizados.");

  console.log("\n🚀 TODOS OS 15 TESTES DO MOTOR DE PERMISSÕES E PERFIS CLÍNICOS (RBAC) PASSARAM COM SUCESSO!\n");
}

executarTestesRBAC().catch(err => {
  console.error("❌ ERRO NO TESTE DE RBAC:", err);
  process.exit(1);
});
