const assert = require('assert');
const { PcrGestanteService } = require('../src/02_pcr_gestante');

function runTests() {
  console.log("Iniciando suite de testes: PCR na Gestante (ACLS Materno e Cesariana Perimortem)");

  // ---------------------------------------------------------------------------
  // Teste 1: Gestante < 20 semanas (sem compressão aortocaval significativa)
  // ---------------------------------------------------------------------------
  const casoPrecoce = PcrGestanteService.avaliarPcrGestante({
    idadeGestacionalSemanas: 14,
    tempoPcrMinutos: 2,
    ritmoPcr: "Assistolia"
  });

  assert.strictEqual(casoPrecoce.sucesso, true);
  assert.strictEqual(casoPrecoce.dule.indicado, false, "DULE não deve ser indicado para IG < 20 semanas");
  assert.strictEqual(casoPrecoce.histerotomiaRessuscitacao.indicada, false);
  assert.strictEqual(casoPrecoce.histerotomiaRessuscitacao.status, "NÃO_APLICÁVEL_IG_MENOR_20");
  assert.strictEqual(casoPrecoce.condutaFarmacologica.eChocavel, false);
  assert.ok(casoPrecoce.acessoVascular.localizacaoPrioritaria.includes("ACIMA DO DIAFRAGMA"));

  // ---------------------------------------------------------------------------
  // Teste 2: Gestante 32 semanas, PCR 2 min, ritmo chocável (FV)
  // ---------------------------------------------------------------------------
  const casoTardioInicio = PcrGestanteService.avaliarPcrGestante({
    idadeGestacionalSemanas: 32,
    tempoPcrMinutos: 2,
    ritmoPcr: "FV"
  });

  assert.strictEqual(casoTardioInicio.dule.indicado, true, "DULE é obrigatório para IG >= 20 semanas");
  assert.ok(casoTardioInicio.dule.alertaPosicionamento.includes("NÃO inclinar a paciente ou a prancha em 30 graus"));
  assert.strictEqual(casoTardioInicio.condutaFarmacologica.eChocavel, true);
  assert.ok(casoTardioInicio.condutaFarmacologica.desfibrilacao.includes("200 Joules"));
  assert.ok(casoTardioInicio.condutaFarmacologica.alertaSegurancaDesfibrilador.includes("REMOVER/DESCONECTAR monitores fetais"));
  assert.strictEqual(casoTardioInicio.histerotomiaRessuscitacao.indicada, false);
  assert.strictEqual(casoTardioInicio.histerotomiaRessuscitacao.status, "PREPARO_IMEDIATO");
  assert.strictEqual(casoTardioInicio.histerotomiaRessuscitacao.minutosRestantesDecisao, 2);

  // ---------------------------------------------------------------------------
  // Teste 3: Gestante 28 semanas, PCR >= 4 min sem ROSC (Regra dos 4 Minutos)
  // ---------------------------------------------------------------------------
  const casoHisterotomiaUrgente = PcrGestanteService.avaliarPcrGestante({
    idadeGestacionalSemanas: 28,
    tempoPcrMinutos: 4,
    ritmoPcr: "AESP"
  });

  assert.strictEqual(casoHisterotomiaUrgente.histerotomiaRessuscitacao.indicada, true, "Histerotomia deve ser indicada aos 4 minutos");
  assert.strictEqual(casoHisterotomiaUrgente.histerotomiaRessuscitacao.status, "INDICADA_IMEDIATAMENTE");
  assert.ok(casoHisterotomiaUrgente.histerotomiaRessuscitacao.localProcedimento.includes("NO PRÓPRIO LOCAL DA PCR"));
  assert.ok(casoHisterotomiaUrgente.histerotomiaRessuscitacao.localProcedimento.includes("NUNCA transportar"));
  assert.ok(casoHisterotomiaUrgente.histerotomiaRessuscitacao.orientacoesCirurgicas.some(o => o.includes("NUNCA interromper a massagem cardíaca")));

  // ---------------------------------------------------------------------------
  // Teste 4: Reversão de intoxicação por Sulfato de Magnésio (Gluconato de Cálcio)
  // ---------------------------------------------------------------------------
  const casoSulfato = PcrGestanteService.avaliarPcrGestante({
    idadeGestacionalSemanas: 34,
    tempoPcrMinutos: 1,
    ritmoPcr: "Assistolia",
    emUsoSulfatoMagnesio: true
  });

  assert.strictEqual(casoSulfato.antidotos.length, 1);
  assert.strictEqual(casoSulfato.antidotos[0].antidoto, "Gluconato de Cálcio a 10%");
  assert.ok(casoSulfato.antidotos[0].posologia.includes("10 mL (1 g) IV lento"));
  assert.ok(casoSulfato.antidotos[0].acaoImediata.includes("INTERROMPER IMEDIATAMENTE"));

  // ---------------------------------------------------------------------------
  // Teste 5: Reversão de LAST (Toxicidade por Anestésico Local - Intralipid)
  // ---------------------------------------------------------------------------
  const casoLast = PcrGestanteService.avaliarPcrGestante({
    idadeGestacionalSemanas: 38,
    tempoPcrMinutos: 3,
    ritmoPcr: "TVSP",
    suspeitaToxicidadeAnestesicoLocal: true
  });

  assert.strictEqual(casoLast.antidotos.length, 1);
  assert.strictEqual(casoLast.antidotos[0].antidoto, "Emulsão Lipídica a 20% (Intralipid)");
  assert.ok(casoLast.antidotos[0].posologia.includes("1,5 mL/kg IV em 1 minuto"));

  // ---------------------------------------------------------------------------
  // Teste 6: Checklist de Causas Reversíveis (Mnemônico A-to-H)
  // ---------------------------------------------------------------------------
  assert.strictEqual(casoLast.checklistCausasReversiveis.length, 8);
  const letras = casoLast.checklistCausasReversiveis.map(c => c.letra).join('');
  assert.strictEqual(letras, "ABCDEFGH");

  // ---------------------------------------------------------------------------
  // Teste 6b: Conduta de Pré-Eclâmpsia / Eclâmpsia pós-RCE (Zuspan, Pritchard e Antídoto)
  // ---------------------------------------------------------------------------
  const casoPreEclampsia = PcrGestanteService.avaliarPcrGestante({
    idadeGestacionalSemanas: 34,
    tempoPcrMinutos: 2,
    ritmoPcr: "Assistolia",
    suspeitaPreEclampsia: true
  });
  assert.ok(casoPreEclampsia.condutaPreEclampsia);
  assert.strictEqual(casoPreEclampsia.condutaPreEclampsia.condicao, "Pré-Eclâmpsia com Sinais de Gravidade / Eclâmpsia");
  assert.ok(casoPreEclampsia.condutaPreEclampsia.esquemaZuspan.ataque.includes("4g IV"));
  assert.ok(casoPreEclampsia.condutaPreEclampsia.esquemaZuspan.manutencao.includes("1g/h em BIC"));
  assert.ok(casoPreEclampsia.condutaPreEclampsia.esquemaPritchard.ataque.includes("10g IM"));
  assert.ok(casoPreEclampsia.condutaPreEclampsia.esquemaPritchard.manutencao.includes("5g IM"));
  assert.ok(casoPreEclampsia.condutaPreEclampsia.checklistVigilancia.patelar.includes("Reflexo patelar presente"));
  assert.ok(casoPreEclampsia.condutaPreEclampsia.checklistVigilancia.frequenciaRespiratoria.includes("FR >= 16 irpm"));
  assert.ok(casoPreEclampsia.condutaPreEclampsia.checklistVigilancia.diurese.includes(">= 25 mL/h"));
  assert.strictEqual(casoPreEclampsia.condutaPreEclampsia.antidoto.droga, "Gluconato de Cálcio 10%");
  assert.ok(casoPreEclampsia.condutaPreEclampsia.antidoto.dose.includes("10 mL"));
  assert.ok(casoPreEclampsia.condutaPreEclampsia.prescricaoPep.includes("PRESCRIÇÃO PÓS-RCE"));

  // ---------------------------------------------------------------------------
  // Teste 7: Integração com Runtime / Cockpit RPC
  // ---------------------------------------------------------------------------
  const runtime = require('../server/runtime');
  const crypto = require('crypto');
  const botToken = 'fake_bot_token_pcr_test';
  runtime.ctx.ConfigService.get = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : null;
  runtime.ctx.ConfigService.exigir = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : (k === 'TELEGRAM_BOT_TOKEN' ? botToken : 'dummy');
  const hashEsperado = crypto.createHmac('sha256', botToken).update('123').digest('hex');
  const fakeSession = 'ck_' + hashEsperado;

  const rpcRes = runtime.cockpitRpc('cockpitPcrGestante', fakeSession, [{
    idadeGestacionalSemanas: 30,
    tempoPcrMinutos: 5,
    ritmoPcr: "FV",
    emUsoSulfatoMagnesio: true
  }]);

  assert.strictEqual(rpcRes.sucesso, true);
  assert.strictEqual(rpcRes.dule.indicado, true);
  assert.strictEqual(rpcRes.histerotomiaRessuscitacao.indicada, true);
  assert.strictEqual(rpcRes.antidotos[0].antidoto, "Gluconato de Cálcio a 10%");

  console.log("✅ Todos os testes de PCR na Gestante passaram com sucesso!");
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
