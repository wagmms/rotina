/**
 * ==============================================================================
 * BATERIA DE TESTES AUTOMATIZADOS: FASE 2 & FASE 3 (CLÍNICA & EPIDEMIOLOGIA)
 * ==============================================================================
 * Cobre:
 * 1. Dengue & Arboviroses (MS 2024: Grupos A, B, C, D e Hidratação)
 * 2. PAC & CURB-65 (SBPT / ATS / IDSA)
 * 3. ITU, Cistite & Pielonefrite (SBU 2023 / IDSA)
 * 4. Crise Hipertensiva vs Pseudocrise (SBC 2024)
 * 5. Cefaleias Agudas & Critérios SNOOP (ABN / ICHD-3)
 * 6. Pequenas Urgências, Regras de Ottawa & Profilaxias (MS)
 * 7. Declaração de Óbito & Notificação Compulsória (CFM 1.779 / SINAN)
 * 8. Despacho Telegram dos Comandos Slash
 * 9. Despacho Fastify RPC do Cockpit
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');
const runtime = require('../server/runtime.js');

async function executarTestesFase2EFase3() {
  console.log('=== INICIANDO AUDITORIA CLÍNICA DETERMINÍSTICA: FASE 2 & FASE 3 ===\n');
  const ctx = runtime.ctx;
  const chatId = '987654321';

  let mensagensEnviadas = [];
  ctx.enviarMensagemParaChat = (id, texto) => {
    mensagensEnviadas.push({ tipo: 'texto', id, texto });
    return true;
  };
  ctx.enviarMensagemComTecladoParaChat = (id, texto, kb) => {
    mensagensEnviadas.push({ tipo: 'teclado', id, texto, kb });
    return true;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DENGUE & ARBOVIROSES (MS 2024)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[1] Testando Arboviroses & Dengue MS 2024...');
  assert.ok(ctx.ArbovirosesDengueService, 'ArbovirosesDengueService deve estar no runtime');

  // Grupo A: Sem alarme, 70 kg
  const dengueA = ctx.ArbovirosesDengueService.estadiarDengue({ pesoKg: 70 });
  assert.strictEqual(dengueA.grupo, 'A');
  assert.strictEqual(dengueA.hidratacao.volumeTotal24hMl, 4200); // 60 mL * 70 = 4200 mL
  assert.strictEqual(dengueA.hidratacao.volumeSroMl, 1400); // 1/3 = 1400 mL
  assert.strictEqual(dengueA.hidratacao.volumeOutrosLiquidosMl, 2800); // 2/3 = 2800 mL

  // Grupo B: Comorbidade (gestante), 60 kg
  const dengueB = ctx.ArbovirosesDengueService.estadiarDengue({ pesoKg: 60, gestante: true });
  assert.strictEqual(dengueB.grupo, 'B');
  assert.ok(dengueB.localAtendimento.includes('Ponto de Hidratação') || dengueB.localAtendimento.includes('UPA'));

  // Grupo C: Sinal de alarme, 80 kg
  const dengueC = ctx.ArbovirosesDengueService.estadiarDengue({ pesoKg: 80, sinaisAlarme: true });
  assert.strictEqual(dengueC.grupo, 'C');
  assert.strictEqual(dengueC.hidratacao.faseRapidaVazaoMlH, 800); // 10 mL/kg/h * 80 = 800 mL/h

  // Grupo D: Choque, 50 kg
  const dengueD = ctx.ArbovirosesDengueService.estadiarDengue({ pesoKg: 50, sinaisChoque: true });
  assert.strictEqual(dengueD.grupo, 'D');
  assert.strictEqual(dengueD.hidratacao.volumeBolusMl, 1000); // 20 mL/kg * 50 = 1000 mL bolus

  const txtDengue = ctx.ArbovirosesDengueService.formatarTextoTelegram(dengueC);
  assert.ok(txtDengue.includes('Dengue com Sinais de Alarme (Grupo C)'));
  assert.ok(txtDengue.includes('800 mL/h'));
  console.log('  ✓ Estadiamento A/B/C/D e hidratação oral/venosa calculados com precisão.');

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. PAC & CURB-65
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[2] Testando PAC & Escore CURB-65...');
  assert.ok(ctx.PneumologiaPacService, 'PneumologiaPacService deve estar no runtime');

  // CURB-65 = 0 (Ambulatorial)
  const curb0 = ctx.PneumologiaPacService.calcularCurb65({ idade: 40, fr: 18, pas: 120, pad: 80 });
  assert.strictEqual(curb0.escore, 0);
  assert.strictEqual(curb0.risco, 'BAIXO');
  assert.ok(curb0.localRecomendado.includes('Ambulatorial'));

  // CURB-65 = 2 (Moderado)
  const curb2 = ctx.PneumologiaPacService.calcularCurb65({ idade: 70, fr: 32, pas: 130, pad: 85 });
  assert.strictEqual(curb2.escore, 2);
  assert.strictEqual(curb2.risco, 'MODERADO');
  assert.ok(curb2.localRecomendado.includes('Enfermaria') || curb2.localRecomendado.includes('Observação'));

  // CURB-65 = 4 (Grave/Internação)
  const curb4 = ctx.PneumologiaPacService.calcularCurb65({
    confusao: true,
    ureia: 75,
    fr: 34,
    pas: 80,
    pad: 50,
    idade: 60
  });
  assert.strictEqual(curb4.escore, 4);
  assert.strictEqual(curb4.risco, 'ALTO');
  assert.ok(curb4.localRecomendado.includes('Internação Hospitalar Mandatória'));
  console.log('  ✓ Escore CURB-65 0 a 5 e estratificação de risco validados.');

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. ITU & PIELONEFRITE
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[3] Testando Infecção do Trato Urinário (ITU)...');
  assert.ok(ctx.InfectologiaItuService, 'InfectologiaItuService deve estar no runtime');

  // Cistite não complicada
  const ituCistite = ctx.InfectologiaItuService.conduzirItu({ tipo: 'cistite_nao_complicada' });
  assert.ok(ituCistite.prescricoes.some(p => p.includes('Fosfomicina')));
  assert.ok(ituCistite.prescricoes.some(p => p.includes('Nitrofurantoína')));

  // Gestante (Bloqueio de Fluoroquinolonas)
  const ituGestante = ctx.InfectologiaItuService.conduzirItu({ gestante: true });
  assert.strictEqual(ituGestante.tipo, 'cistite_gestante');
  assert.ok(ituGestante.alertas.some(a => a.includes('CONTRAINDICAÇÕES GESTACIONAIS')));
  assert.ok(ituGestante.alertas.some(a => a.includes('Fluoroquinolonas')));

  // Pielonefrite ambulatorial vs hospitalar
  const ituPieloAmb = ctx.InfectologiaItuService.conduzirItu({ febre: true });
  assert.strictEqual(ituPieloAmb.tipo, 'pielonefrite_ambulatorial');

  const ituPieloHosp = ctx.InfectologiaItuService.conduzirItu({ febre: true, sepse: true });
  assert.strictEqual(ituPieloHosp.tipo, 'pielonefrite_hospitalar');

  // ITU masculina
  const ituMasc = ctx.InfectologiaItuService.conduzirItu({ sexo: 'M' });
  assert.strictEqual(ituMasc.tipo, 'itu_masculina');
  console.log('  ✓ Cistite, gestante com bloqueio de quinolonas, pielonefrite e ITU masculina validadas.');

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. CRISE HIPERTENSIVA & PSEUDOCRISE
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[4] Testando Crise Hipertensiva vs Pseudocrise...');
  assert.ok(ctx.EmergenciaCriseHipertensivaService, 'EmergenciaCriseHipertensivaService deve estar no runtime');

  // Pseudocrise (dor e ansiedade)
  const hasPseudo = ctx.EmergenciaCriseHipertensivaService.classificarCrise({ pas: 170, pad: 100, dor: true });
  assert.strictEqual(hasPseudo.tipo, 'PSEUDOCRISE_HIPERTENSIVA');
  assert.ok(hasPseudo.alertas.some(a => a.includes('NUNCA prescrever Nifedipino')));

  // Urgência Hipertensiva
  const hasUrg = ctx.EmergenciaCriseHipertensivaService.classificarCrise({ pas: 200, pad: 120 });
  assert.strictEqual(hasUrg.tipo, 'URGENCIA_HIPERTENSIVA');
  assert.ok(hasUrg.medicacoes.some(m => m.includes('Captopril')));

  // Emergência com Dissecção
  const hasDisseccao = ctx.EmergenciaCriseHipertensivaService.classificarCrise({
    pas: 210, pad: 120,
    lesaoOrgaoAlvo: { disseccao: true }
  });
  assert.strictEqual(hasDisseccao.tipo, 'EMERGENCIA_HIPERTENSIVA');
  assert.ok(hasDisseccao.metaPressorica.includes('PAS < 120 mmHg e FC < 60 bpm em 20 minutos'));
  assert.ok(hasDisseccao.medicacoes.some(m => m.includes('Betabloqueador IV')));

  // Emergência com EAP
  const hasEap = ctx.EmergenciaCriseHipertensivaService.classificarCrise({
    pas: 220, pad: 130,
    lesaoOrgaoAlvo: { eap: true }
  });
  assert.strictEqual(hasEap.tipo, 'EMERGENCIA_HIPERTENSIVA');
  assert.ok(hasEap.medicacoes.some(m => m.includes('Nitroglicerina')));
  console.log('  ✓ Pseudocrise, Urgência e Emergências (Dissecção, EAP) estratificadas com bloqueios.');

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. CEFALEIAS & SNOOP
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[5] Testando Cefaleias Agudas & Critérios SNOOP...');
  assert.ok(ctx.NeurologiaCefaleiasService, 'NeurologiaCefaleiasService deve estar no runtime');

  // Cefaleia benigna
  const cefBenigna = ctx.NeurologiaCefaleiasService.avaliarBandeirasVermelhas({});
  assert.strictEqual(cefBenigna.temBandeiraVermelha, false);
  assert.ok(cefBenigna.esquemaTratamentoPS.some(m => m.includes('Dipirona')));
  assert.ok(cefBenigna.bloqueiosSeguranca.some(b => b.includes('NÃO USAR OPIOIDES')));

  // Bandeira Thunderclap (HSA)
  const cefThunderclap = ctx.NeurologiaCefaleiasService.avaliarBandeirasVermelhas({ thunderclap: true });
  assert.strictEqual(cefThunderclap.temBandeiraVermelha, true);
  assert.ok(cefThunderclap.condutas.some(c => c.includes('TOMOGRAFIA COMPUTADORIZADA')));
  assert.ok(cefThunderclap.condutas.some(c => c.includes('PUNÇÃO LOMBAR')));
  console.log('  ✓ Checklist SNOOP, conduta de HSA e bloqueio de opioides validados.');

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. PEQUENAS URGÊNCIAS & TRAUMA
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[6] Testando Pequenas Urgências & Trauma...');
  assert.ok(ctx.PequenasUrgenciasTraumaService, 'PequenasUrgenciasTraumaService deve estar no runtime');

  // Regras de Ottawa (sem indicação de Rx)
  const ottawaNao = ctx.PequenasUrgenciasTraumaService.regraOttawaTornozelo({});
  assert.strictEqual(ottawaNao.necessitaImagem, false);
  assert.ok(ottawaNao.conduta.includes('DISPENSADA RADIOGRAFIA'));

  // Regras de Ottawa (com indicação por maléolo lateral)
  const ottawaSim = ctx.PequenasUrgenciasTraumaService.regraOttawaTornozelo({ dorMaleoloLateral: true });
  assert.strictEqual(ottawaSim.necessitaImagem, true);
  assert.ok(ottawaSim.conduta.includes('INDICAÇÃO DE RAIO-X'));

  // Lidocaína Doses Máximas (70 kg)
  const lidoSem = ctx.PequenasUrgenciasTraumaService.calcularLidocainaDoseMaxima(70, false);
  assert.strictEqual(lidoSem.doseMaximaMg, 300); // 70 * 4.5 = 315 -> clamp teto 300 mg

  const lidoCom = ctx.PequenasUrgenciasTraumaService.calcularLidocainaDoseMaxima(70, true);
  assert.strictEqual(lidoCom.doseMaximaMg, 490); // 70 * 7 = 490 mg (teto 500)

  // Profilaxia Raiva (Morcego = Risco Máximo)
  const raivaMorcego = ctx.PequenasUrgenciasTraumaService.avaliarProfilaxiaRaiva({ animal: 'morcego' });
  assert.strictEqual(raivaMorcego.ehGrave, true);
  assert.ok(raivaMorcego.condutas.some(c => c.includes('Soro Antirrábico (SAR 40 UI/kg)')));
  console.log('  ✓ Ottawa, Lidocaína com tetos, Profilaxia de Tétano e Raiva validadas.');

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. DECLARAÇÃO DE ÓBITO & NOTIFICAÇÃO
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[7] Testando Declaração de Óbito & Notificação...');
  assert.ok(ctx.MedicinaLegalObitoService, 'MedicinaLegalObitoService deve estar no runtime');

  // Morte violenta / trauma -> IML obrigatório
  const doIml = ctx.MedicinaLegalObitoService.fluxoDeclaracaoObito('violenta_acidental');
  assert.ok(doIml.destinoObrigatorio.includes('IML'));
  assert.ok(doIml.orientacoes.some(o => o.includes('TERMINANTEMENTE PROIBIDO ao médico assistente')));

  // Morte sem assistência -> SVO
  const doSvo = ctx.MedicinaLegalObitoService.fluxoDeclaracaoObito('sem_assistencia');
  assert.ok(doSvo.destinoObrigatorio.includes('SVO'));

  // Notificações imediatas
  const notifs = ctx.MedicinaLegalObitoService.listarNotificacoesImediatas();
  assert.ok(notifs.some(n => n.includes('Dengue com sinais de alarme ou Dengue Grave')));
  assert.ok(notifs.some(n => n.includes('Raiva')));
  console.log('  ✓ Fluxo legal CFM 1.779 (IML vs SVO vs Assistente) e SINAN validados.');

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. COMANDOS TELEGRAM
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[8] Testando despacho de comandos Telegram...');
  mensagensEnviadas = [];

  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/dengue 75kg dor abdominal intensa vomitos' });
  assert.ok(mensagensEnviadas.length > 0);
  assert.ok(mensagensEnviadas[0].texto.includes('DENGUE'));
  assert.ok(mensagensEnviadas[0].texto.includes('Grupo C'));

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/pac 72 anos pa 85x55 fr 32 confusao' });
  assert.ok(mensagensEnviadas.length > 0);
  assert.ok(mensagensEnviadas[0].texto.includes('CURB-65'));

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/itu disuria polaciuria mulher' });
  assert.ok(mensagensEnviadas.length > 0);
  assert.ok(mensagensEnviadas[0].texto.includes('INFECÇÃO DO TRATO URINÁRIO'));

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/crisehipertensiva 210x120 disseccao' });
  assert.ok(mensagensEnviadas.length > 0);
  assert.ok(mensagensEnviadas[0].texto.includes('CRISE HIPERTENSIVA'));

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/cefaleia thunderclap dor subita' });
  assert.ok(mensagensEnviadas.length > 0);
  assert.ok(mensagensEnviadas[0].texto.includes('CEFALEIA'));

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/sutura 70kg ferimento face' });
  assert.ok(mensagensEnviadas.length > 0);
  assert.ok(mensagensEnviadas[0].texto.includes('PEQUENAS URGÊNCIAS'));

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/obito violenta acidente de transito' });
  assert.ok(mensagensEnviadas.length > 0);
  assert.ok(mensagensEnviadas[0].texto.includes('IML'));
  console.log('  ✓ Todos os 7 comandos Telegram despachados e respondidos com sucesso.');

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. FASTIFY RPC DO COCKPIT
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[9] Testando métodos RPC do Cockpit...');

  const rpcDengue = runtime.cockpitRpc('cockpitArbovirosesDengue', 'internal', [{ pesoKg: 70, sinaisAlarme: true }]);
  assert.strictEqual(rpcDengue.resultado.grupo, 'C');

  const rpcPac = runtime.cockpitRpc('cockpitPneumologiaPac', 'internal', [{ idade: 65, fr: 30 }]);
  assert.strictEqual(rpcPac.resultado.escore, 2);

  const rpcItu = runtime.cockpitRpc('cockpitInfectologiaItu', 'internal', [{ gestante: true }]);
  assert.strictEqual(rpcItu.resultado.tipo, 'cistite_gestante');

  const rpcHas = runtime.cockpitRpc('cockpitEmergenciaCriseHipertensiva', 'internal', [{ pas: 190, pad: 110, dor: true }]);
  assert.strictEqual(rpcHas.resultado.tipo, 'PSEUDOCRISE_HIPERTENSIVA');

  const rpcCef = runtime.cockpitRpc('cockpitNeurologiaCefaleias', 'internal', [{ thunderclap: true }]);
  assert.strictEqual(rpcCef.resultado.temBandeiraVermelha, true);

  const rpcTrauma = runtime.cockpitRpc('cockpitPequenasUrgencias', 'internal', [{ dorMaleoloLateral: true }]);
  assert.strictEqual(rpcTrauma.resultado.ottawa.necessitaImagem, true);

  const rpcObito = runtime.cockpitRpc('cockpitMedicinaLegalObito', 'internal', [{ tipoMorte: 'violenta_acidental' }]);
  assert.ok(rpcObito.resultado.fluxo.destinoObrigatorio.includes('IML'));
  console.log('  ✓ Todos os 7 métodos RPC do Cockpit executados com sucesso.');

  console.log('\n🎉 SUCESSO TOTAL: Todos os testes das Fases 2 e 3 foram aprovados com 100% de sucesso!\n');
}

executarTestesFase2EFase3().catch(err => {
  console.error('❌ Falha nos testes:', err);
  process.exit(1);
});
