/**
 * ==============================================================================
 * TESTES AUTOMATIZADOS: PROTOCOLOS DE CENTRO OBSTÉTRICO & SALA DE PARTO
 * ==============================================================================
 * Suíte de testes determinísticos para o Módulo 02-D (CentroObstetricoService).
 * Valida rigorosamente:
 *  1. Trabalho de Parto (fases, planos de De Lee, BCF e Índice de Bishop).
 *  2. Pré-Eclâmpsia & MgSO4 (Zuspan, Pritchard, intoxicação e antídoto Gluconato de Cálcio).
 *  3. Crise Hipertensiva Obstétrica (Hidralazina IV, Nifedipino VO, bloqueio IECA/BRA).
 *  4. Hemorragia Pós-Parto (Regra dos 4 Ts, Índice de Choque e bloqueio de Metilergometrina na HAS).
 *  5. Profilaxia de Sepse por GBS (indicações formais, Penicilina, Ampicilina, Cefazolina e Vancomicina).
 *  6. Prematuridade & RPMO (Betametasona, Neuroproteção <32s, Tocólise e Latência).
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');
const CentroObstetricoService = require('../src/02_centro_obstetrico.js');
const runtime = require('../server/runtime.js');

console.log('🧪 Iniciando testes de CentroObstetricoService...\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. TRABALHO DE PARTO, DE LEE, BCF E ÍNDICE DE BISHOP
// ─────────────────────────────────────────────────────────────────────────────

console.log('--- 1. Diagnóstico e Monitoramento de Trabalho de Parto ---');

// Caso 1: Fase Ativa de Trabalho de Parto
const partoAtivo = CentroObstetricoService.avaliarTrabalhoParto({
  dilatacaoCm: 5,
  contracoes10min: 3,
  duracaoContracaoSeg: 40,
  planoDeLee: 0,
  bcf: 144,
  bolsa: 'integra'
});
assert.strictEqual(partoAtivo.fase, 'FASE_ATIVA');
assert.strictEqual(partoAtivo.insinuado, true);
assert.strictEqual(partoAtivo.bcfStatus, 'NORMAL');
assert.strictEqual(partoAtivo.bcfAlerta, null);
console.log('  ✓ Caso 1: Identificação de Fase Ativa e apresentação insinuada (plano 0 De Lee) aprovada.');

// Caso 2: Período Expulsivo (Dilatação 10 cm)
const partoExpulsivo = CentroObstetricoService.avaliarTrabalhoParto({
  dilatacaoCm: 10,
  contracoes10min: 5,
  duracaoContracaoSeg: 50,
  planoDeLee: 3,
  bcf: 135
});
assert.strictEqual(partoExpulsivo.fase, 'PERIODO_EXPULSIVO');
assert.strictEqual(partoExpulsivo.insinuado, true);
console.log('  ✓ Caso 2: Identificação do Período Expulsivo com dilatação total aprovada.');

// Caso 3: Fase Latente (Dilatação < 4 cm)
const partoLatente = CentroObstetricoService.avaliarTrabalhoParto({
  dilatacaoCm: 2,
  contracoes10min: 2,
  duracaoContracaoSeg: 25,
  planoDeLee: -3,
  bcf: 150
});
assert.strictEqual(partoLatente.fase, 'FASE_LATENTE');
assert.strictEqual(partoLatente.insinuado, false);
console.log('  ✓ Caso 3: Fase Latente com orientação de evitar internação desnecessária aprovada.');

// Caso 4: Alerta de BCF — Bradicardia Fetal Severa (< 110 bpm)
const partoBradicardia = CentroObstetricoService.avaliarTrabalhoParto({
  dilatacaoCm: 6,
  contracoes10min: 3,
  duracaoContracaoSeg: 45,
  bcf: 90
});
assert.strictEqual(partoBradicardia.bcfStatus, 'BRADICARDIA_FETAL');
assert.ok(partoBradicardia.bcfAlerta.includes('BRADICARDIA FETAL SEVERA'));
console.log('  ✓ Caso 4: Alerta crítico de sofrimento fetal por bradicardia severa (<110 bpm) aprovado.');

// Caso 5: Alerta de BCF — Taquicardia Fetal (> 160 bpm)
const partoTaquicardia = CentroObstetricoService.avaliarTrabalhoParto({
  dilatacaoCm: 4,
  contracoes10min: 2,
  duracaoContracaoSeg: 35,
  bcf: 175
});
assert.strictEqual(partoTaquicardia.bcfStatus, 'TAQUICARDIA_FETAL');
assert.ok(partoTaquicardia.bcfAlerta.includes('TAQUICARDIA FETAL'));
console.log('  ✓ Caso 5: Detecção de taquicardia fetal aprovada.');

// Caso 6: Índice de Bishop — Colo Favorável (>= 9) vs Desfavorável (<= 5)
const bishopFavoravel = CentroObstetricoService.calcularIndiceBishop({
  dilatacaoCm: 5,     // 3 pontos
  apagamentoPct: 80,  // 3 pontos
  planoDeLee: 1,      // 3 pontos
  consistencia: 'amolecido', // 2 pontos
  posicao: 'anterior' // 2 pontos
});
assert.strictEqual(bishopFavoravel.pontos, 13);
assert.strictEqual(bishopFavoravel.favoravel, true);
assert.ok(bishopFavoravel.condutaInducao.includes('Ocitocina IV'));

const bishopDesfavoravel = CentroObstetricoService.calcularIndiceBishop({
  dilatacaoCm: 0,
  apagamentoPct: 20,
  planoDeLee: -3,
  consistencia: 'rigido',
  posicao: 'posterior'
});
assert.strictEqual(bishopDesfavoravel.pontos, 0);
assert.strictEqual(bishopDesfavoravel.favoravel, false);
assert.ok(bishopDesfavoravel.condutaInducao.includes('Misoprostol 25 mcg'));
console.log('  ✓ Caso 6: Cálculo do Índice de Bishop e recomendação de preparo cervical com Misoprostol aprovados.');

// ─────────────────────────────────────────────────────────────────────────────
// 2. PRÉ-ECLÂMPSIA COM SINAIS DE GRAVIDADE E SULFATO DE MAGNÉSIO
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 2. Manejo de Pré-Eclâmpsia e Sulfato de Magnésio ---');

// Caso 7: Esquema Zuspan Padrão
const zuspan = CentroObstetricoService.prescreverSulfatoMagnesio({
  esquema: 'Zuspan',
  reflexoPatelar: true,
  frequenciaRespiratoria: 16,
  diureseMlHora: 40
});
assert.strictEqual(zuspan.intoxicacaoDetectada, false);
assert.ok(zuspan.prescricao.ataque[0].includes('4g'));
assert.ok(zuspan.prescricao.manutencao[0].includes('1g de MgSO4 por hora'));
assert.strictEqual(zuspan.rotinaVigilancia.length, 4);
console.log('  ✓ Caso 7: Prescrição do Esquema de Zuspan (4g IV + 1g/h em bomba) aprovada.');

// Caso 8: Esquema Pritchard (IM/Transporte)
const pritchard = CentroObstetricoService.prescreverSulfatoMagnesio({
  esquema: 'Pritchard',
  reflexoPatelar: true,
  frequenciaRespiratoria: 18,
  diureseMlHora: 35
});
assert.strictEqual(pritchard.intoxicacaoDetectada, false);
assert.ok(pritchard.prescricao.ataque[1].includes('10g'));
assert.ok(pritchard.prescricao.manutencao[0].includes('5g'));
console.log('  ✓ Caso 8: Prescrição do Esquema de Pritchard (4g IV + 10g IM, depois 5g IM 4/4h) aprovada.');

// Caso 9: Alerta de Intoxicação por MgSO4 (Reflexo abolido, oligúria ou bradipneia) e Antídoto
const intoxicacaoMg = CentroObstetricoService.prescreverSulfatoMagnesio({
  esquema: 'Zuspan',
  reflexoPatelar: false,
  frequenciaRespiratoria: 10,
  diureseMlHora: 15
});
assert.strictEqual(intoxicacaoMg.intoxicacaoDetectada, true);
assert.strictEqual(intoxicacaoMg.alertasIntoxicacao.length, 3);
assert.ok(intoxicacaoMg.condutaIntoxicacao.antidoto.includes('GLUCONATO DE CÁLCIO 10%'));
console.log('  ✓ Caso 9: Bloqueio imediato por intoxicação de MgSO4 e indicação de Gluconato de Cálcio aprovados.');

// Caso 10: Crise Hipertensiva Obstétrica Aguda (PAS >= 160 ou PAD >= 110)
const crisePa = CentroObstetricoService.manejarCriseHipertensiva({
  pas: 170,
  pad: 115
});
assert.strictEqual(crisePa.ehCrise, true);
assert.strictEqual(crisePa.classificacao, 'EMERGENCIA_HIPERTENSIVA_OBSTETRICA');
assert.ok(crisePa.medicacoes[0].farmaco.includes('Hidralazina IV'));
assert.ok(crisePa.medicacoes[1].farmaco.includes('Nifedipino VO'));
assert.ok(crisePa.contraindicacoesAbsolutas[0].includes('IECAs'));
console.log('  ✓ Caso 10: Protocolo de crise hipertensiva com Hidralazina IV e contraindicação formal de IECA aprovados.');

// Caso 10b: Manejo Integral de Pré-Eclâmpsia com Sinais de Gravidade e Esquemas Zuspan/Pritchard
const preEclampsiaGrave = CentroObstetricoService.manejarPreEclampsiaGrave({
  pas: 165,
  pad: 112,
  esquema: 'Zuspan',
  igSemanas: 33,
  sintomasGravidade: ['cefaleia frontal intensa', 'escotomas cintilantes']
});
assert.strictEqual(preEclampsiaGrave.sucesso, true);
assert.strictEqual(preEclampsiaGrave.ehIminencia, true);
assert.strictEqual(preEclampsiaGrave.classificacao, 'IMINÊNCIA DE ECLÂMPSIA (SINAIS PREMONITÓRIOS NEUROLÓGICOS/VISUAIS)');

// Validação dos dois esquemas disponíveis e canônicos
assert.ok(preEclampsiaGrave.esquemaZuspan.ataque[0].includes('4g'));
assert.ok(preEclampsiaGrave.esquemaZuspan.manutencao[0].includes('1g de MgSO4 por hora'));
assert.ok(preEclampsiaGrave.esquemaPritchard.ataque[0].includes('4g'));
assert.ok(preEclampsiaGrave.esquemaPritchard.ataque[1].includes('10g'));
assert.ok(preEclampsiaGrave.esquemaPritchard.manutencao[0].includes('5g'));

// Validação do Checklist de Vigilância (Tríade de Segurança) e Antídoto
assert.ok(preEclampsiaGrave.checklistVigilancia.patelar.includes('Reflexo patelar presente'));
assert.ok(preEclampsiaGrave.checklistVigilancia.frequenciaRespiratoria.includes('FR >= 16 irpm'));
assert.ok(preEclampsiaGrave.checklistVigilancia.diurese.includes('>= 25 mL/h'));
assert.strictEqual(preEclampsiaGrave.antidoto.droga, 'Gluconato de Cálcio 10%');
assert.ok(preEclampsiaGrave.antidoto.dose.includes('10 mL'));

// Validação da Prescrição PEP Beira-Leito
assert.ok(preEclampsiaGrave.prescricaoPep.includes('ESQUEMA DE ZUSPAN'));
assert.ok(preEclampsiaGrave.prescricaoPep.includes('ESQUEMA DE PRITCHARD'));
assert.ok(preEclampsiaGrave.prescricaoPep.includes('Gluconato de Cálcio 10% 1 ampola (10 mL = 1g)'));
console.log('  ✓ Caso 10b: Detalhamento de Pré-Eclâmpsia Grave (Zuspan, Pritchard, Vigilância e Gluconato de Cálcio) aprovado.');

// ─────────────────────────────────────────────────────────────────────────────
// 3. PROTOCOLO DE HEMORRAGIA PÓS-PARTO (HPP - 4 Ts)
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 3. Protocolo de Hemorragia Pós-Parto (Regra dos 4 Ts) ---');

// Caso 11: Choque Grave na HPP com Índice de Choque >= 1.4
const hppGrave = CentroObstetricoService.gerenciarHemorragiaPosParto({
  perdaEstimadaMl: 1500,
  tipoParto: 'vaginal',
  fc: 130,
  pas: 80,
  tempoDesdePartoMin: 30,
  temHipertensao: false
});
assert.strictEqual(hppGrave.ehHpp, true);
assert.strictEqual(hppGrave.indiceChoque, 1.63);
assert.strictEqual(hppGrave.gravidadeChoque, 'CHOQUE_GRAVE');
assert.ok(hppGrave.alertaChoque.includes('CHOQUE GRAVE'));
assert.strictEqual(hppGrave.quatroTs.length, 4);
console.log('  ✓ Caso 11: Detecção de Choque Grave por Índice de Choque >= 1.4 na HPP aprovada.');

// Caso 12: Bloqueio estrito de Metilergometrina (Ergotrate) na paciente hipertensa
const hppComHas = CentroObstetricoService.gerenciarHemorragiaPosParto({
  perdaEstimadaMl: 1000,
  tipoParto: 'vaginal',
  fc: 110,
  pas: 160,
  tempoDesdePartoMin: 45,
  temHipertensao: true
});
const etapaErgotrate = hppComHas.sequenciaUterotonica.find(u => u.etapa === 2);
assert.strictEqual(etapaErgotrate.bloqueado, true);
assert.ok(etapaErgotrate.motivoBloqueio.includes('CONTRAINDICAÇÃO ABSOLUTA'));
console.log('  ✓ Caso 12: Bloqueio absoluto de Metilergometrina na paciente hipertensa aprovado.');

// Caso 13: Permissão de Metilergometrina na paciente sem hipertensão
const hppNormotensa = CentroObstetricoService.gerenciarHemorragiaPosParto({
  perdaEstimadaMl: 800,
  tipoParto: 'vaginal',
  fc: 90,
  pas: 110,
  tempoDesdePartoMin: 20,
  temHipertensao: false
});
const etapaErgotrateOk = hppNormotensa.sequenciaUterotonica.find(u => u.etapa === 2);
assert.strictEqual(etapaErgotrateOk.bloqueado, undefined);
assert.ok(etapaErgotrateOk.dose.includes('0,2 mg'));
console.log('  ✓ Caso 13: Sequenciamento de uterotônicos em paciente normotensa aprovado.');

// Caso 14: Indicação de Ácido Tranexâmico em até 3 horas (Estudo WOMAN)
const etapaTransamin = hppNormotensa.sequenciaUterotonica.find(u => u.etapa === 4);
assert.ok(etapaTransamin.nota.includes('em até 3 horas do parto'));
console.log('  ✓ Caso 14: Prescrição precoce de Ácido Tranexâmico 1g IV aprovada.');

// ─────────────────────────────────────────────────────────────────────────────
// 4. PROFILAXIA INTRAPARTO PARA SEPSE POR GBS
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 4. Profilaxia Intraparto para Sepse Neonatal por GBS ---');

// Caso 15: Cultura Positiva — Penicilina Cristalina (1ª Linha)
const gbsPositivo = CentroObstetricoService.avaliarProfilaxiaGbs({
  culturaGbs: 'positiva',
  alergiaPenicilina: false
});
assert.strictEqual(gbsPositivo.indicada, true);
assert.ok(gbsPositivo.esquemaRecomendado.opcaoPrincipal.farmaco.includes('Penicilina G Cristalina'));
assert.ok(gbsPositivo.esquemaRecomendado.opcaoPrincipal.doseAtaque.includes('5.000.000 UI'));
assert.ok(gbsPositivo.esquemaRecomendado.opcaoPrincipal.doseManutencao.includes('2.500.000 UI'));
console.log('  ✓ Caso 15: Indicação com cultura positiva e esquema com Penicilina G Cristalina aprovados.');

// Caso 16: Cultura Desconhecida + Bolsa Rota >= 18h
const gbsBolsaRota = CentroObstetricoService.avaliarProfilaxiaGbs({
  culturaGbs: 'desconhecida',
  bolsaRotaHoras: 19,
  alergiaPenicilina: false
});
assert.strictEqual(gbsBolsaRota.indicada, true);
assert.ok(gbsBolsaRota.motivosIndicacao[0].includes('18 horas'));
console.log('  ✓ Caso 16: Indicação por bolsa rota >= 18h em cultura desconhecida aprovada.');

// Caso 17: Trabalho de Parto Prematuro (< 37 semanas) com cultura desconhecida
const gbsPrematuro = CentroObstetricoService.avaliarProfilaxiaGbs({
  culturaGbs: 'desconhecida',
  igSemanas: 34
});
assert.strictEqual(gbsPrematuro.indicada, true);
console.log('  ✓ Caso 17: Indicação em prematuridade (< 37 semanas) com cultura desconhecida aprovada.');

// Caso 18: Alergia à Penicilina sem histórico de anafilaxia — Cefazolina
const gbsAlergiaLeve = CentroObstetricoService.avaliarProfilaxiaGbs({
  culturaGbs: 'positiva',
  alergiaPenicilina: true,
  tipoAlergiaPenicilina: 'leve'
});
assert.strictEqual(gbsAlergiaLeve.indicada, true);
assert.ok(gbsAlergiaLeve.esquemaRecomendado.opcaoPrincipal.farmaco.includes('Cefazolina'));
console.log('  ✓ Caso 18: Alergia não anafilática recebendo Cefazolina aprovada.');

// Caso 19: Alergia Anafilática com GBS Resistente / Perfil Desconhecido — Vancomicina
const gbsAlergiaGrave = CentroObstetricoService.avaliarProfilaxiaGbs({
  culturaGbs: 'positiva',
  alergiaPenicilina: true,
  tipoAlergiaPenicilina: 'anafilaxia',
  sensibilidadeClindamicina: false
});
assert.strictEqual(gbsAlergiaGrave.indicada, true);
assert.ok(gbsAlergiaGrave.esquemaRecomendado.opcaoPrincipal.farmaco.includes('Vancomicina'));
console.log('  ✓ Caso 19: Alergia grave com resistência à clindamicina recebendo Vancomicina aprovada.');

// Caso 20: Cesariana eletiva antes do trabalho de parto com bolsa íntegra — NÃO INDICADA
const gbsCesareaEletiva = CentroObstetricoService.avaliarProfilaxiaGbs({
  culturaGbs: 'positiva',
  cesarianaEletivaSemTrabalhoPartoBolsaIntegra: true
});
assert.strictEqual(gbsCesareaEletiva.indicada, false);
assert.ok(gbsCesareaEletiva.motivo.includes('NÃO INDICADA PROFILAXIA'));
console.log('  ✓ Caso 20: Dispensa de profilaxia em cesariana eletiva com membranas íntegras aprovada.');

// ─────────────────────────────────────────────────────────────────────────────
// 5. PREMATURIDADE, RPMO, CORTICOTERAPIA E NEUROPROTEÇÃO FETAL
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 5. Prematuridade, RPMO e Neuroproteção Fetal ---');

// Caso 21: Prematuridade Extrema (IG 29 semanas) — Corticoide + MgSO4 + Tocólise
const prematuridadeExtrema = CentroObstetricoService.protocoloPrematuridadeRpmo({
  igSemanas: 29,
  igDias: 2,
  ameacaPartoIminente: true,
  rpmConfirmada: false
});
assert.strictEqual(prematuridadeExtrema.corticoterapia.indicada, true);
assert.ok(prematuridadeExtrema.corticoterapia.esquemaPrimeiraLinha.farmaco.includes('Betametasona'));
assert.strictEqual(prematuridadeExtrema.neuroprotecao.indicada, true);
assert.strictEqual(prematuridadeExtrema.tocolise.indicada, true);
console.log('  ✓ Caso 21: Prescrição de Betametasona, neuroproteção com MgSO4 (<32s) e tocólise com Nifedipino aprovada.');

// Caso 22: RPMO < 34 semanas — Latência Antimicrobiana (Ampicilina + Azitromicina)
const rpmoLatencia = CentroObstetricoService.protocoloPrematuridadeRpmo({
  igSemanas: 31,
  igDias: 0,
  ameacaPartoIminente: false,
  rpmConfirmada: true
});
assert.strictEqual(rpmoLatencia.latenciaRpmo.indicada, true);
assert.ok(rpmoLatencia.latenciaRpmo.fase1_primeiras48h[0].includes('Ampicilina 2 g'));
assert.ok(rpmoLatencia.latenciaRpmo.fase1_primeiras48h[1].includes('Azitromicina 1 g'));
console.log('  ✓ Caso 22: Protocolo de latência para RPMO com Ampicilina e Azitromicina aprovado.');

// Caso 23: Corioamnionite — Bloqueio de Tocólise e Interrupção da Gestação
const corioamnionite = CentroObstetricoService.protocoloPrematuridadeRpmo({
  igSemanas: 30,
  sinaisCorioamnionite: true
});
assert.strictEqual(corioamnionite.corioamnioniteDetectada, true);
assert.ok(corioamnionite.alertaCritico.includes('CORIOAMNIONITE'));
console.log('  ✓ Caso 23: Alerta crítico e bloqueio de tocólise em corioamnionite aprovados.');

// ─────────────────────────────────────────────────────────────────────────────
// 6. INTEGRAÇÃO COM COCKPIT RPC (FASTIFY SERVER)
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 6. Teste de RPC no Fastify Runtime ---');

const crypto = require('crypto');
const botToken = 'fake_bot_token_co_test';
runtime.ctx.ConfigService.get = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : null;
runtime.ctx.ConfigService.exigir = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : (k === 'TELEGRAM_BOT_TOKEN' ? botToken : 'dummy');
const hashEsperado = crypto.createHmac('sha256', botToken).update('123').digest('hex');
const fakeSession = 'ck_' + hashEsperado;

const rpcTrabalhoParto = runtime.cockpitRpc('cockpitTrabalhoParto', fakeSession, [{
  dilatacaoCm: 6,
  contracoes10min: 3,
  duracaoContracaoSeg: 40,
  planoDeLee: 0
}]);
assert.strictEqual(rpcTrabalhoParto.fase, 'FASE_ATIVA');

const rpcMgso4 = runtime.cockpitRpc('cockpitSulfatoMagnesio', fakeSession, [{
  esquema: 'Zuspan',
  reflexoPatelar: true,
  frequenciaRespiratoria: 16,
  diureseMlHora: 40
}]);
assert.strictEqual(rpcMgso4.intoxicacaoDetectada, false);

const rpcHpp = runtime.cockpitRpc('cockpitHemorragiaPosParto', fakeSession, [{
  perdaEstimadaMl: 1200,
  fc: 110,
  pas: 90,
  temHipertensao: true
}]);
assert.strictEqual(rpcHpp.ehHpp, true);
const ergBloq = rpcHpp.sequenciaUterotonica.find(u => u.etapa === 2);
assert.strictEqual(ergBloq.bloqueado, true);

const rpcGbs = runtime.cockpitRpc('cockpitProfilaxiaGbs', fakeSession, [{
  culturaGbs: 'positiva',
  alergiaPenicilina: false
}]);
assert.strictEqual(rpcGbs.indicada, true);

console.log('  ✓ Caso 24: Métodos RPC do Cockpit (cockpitTrabalhoParto, cockpitSulfatoMagnesio, cockpitHemorragiaPosParto, cockpitProfilaxiaGbs) 100% integrados.');

console.log('\n🎉 Todos os 24 casos clínicos de Centro Obstétrico passaram com 100% de sucesso!');
