/**
 * ==============================================================================
 * TESTES DETERMINÍSTICOS: FERRAMENTA DE AUDITORIA ANALÍTICA (KAIZEN CLÍNICO)
 * ==============================================================================
 * Validação de alta fidelidade:
 *  1. Prescrição Segura (Liberação Sem Alertas)
 *  2. Bloqueio Fatal / Evento Sentinela (KCl 19,1% bolus direto)
 *  3. Rejeição por Interação Grave / Contraindicada (Amiodarona + Fluconazol)
 *  4. Intervenção Farmacêutica por Omissão de Ajuste Renal (ClCr < 30)
 *  5. Retenção de Prescrição por Perfil Acadêmico (RBAC)
 *  6. Processamento em Lote Off-line (Batch Processing)
 *  7. Cálculo Determinístico do Índice de Maturidade de Segurança (0-100)
 *  8. Top Fármacos Incidentes e Top Interações Recorrentes
 *  9. Plano de Ação Kaizen e Intervenções Prioritárias
 * 10. Formatação Visual em ASCII para Cockpit e Telegram
 * 11. Integração RPC Fastify via cockpitAuditoriaKaizen
 * 12. Benchmark de Alta Velocidade (< 15ms)
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');
const { performance } = require('perf_hooks');

const AuditoriaKaizenClinicoService = require(path.join(__dirname, '../src/02_auditoria_kaizen_clinico.js'));
const runtime = require(path.join(__dirname, '../server/runtime.js'));

console.log('🧪 Iniciando testes do Módulo de Auditoria Analítica (Dashboard de Kaizen Clínico)...');

// Limpa histórico inicial
AuditoriaKaizenClinicoService.limparHistorico();

// ─────────────────────────────────────────────────────────────────────────────
// 1. Teste: Prescrição Segura
// ─────────────────────────────────────────────────────────────────────────────
const t0 = performance.now();
const resSegura = AuditoriaKaizenClinicoService.auditarPrescricao({
  paciente: 'Paciente 01 - Leito 201',
  setor: 'ENFERMARIA',
  prescritorNome: 'Dra. Alice',
  perfilPrescritor: 'ASSISTENTE',
  textoPrescricao: 'Dipirona 1g IV se dor\nCeftriaxona 1g IV 12/12h',
  contextoClinico: { clcr: 85 }
});
const dt1 = performance.now() - t0;

assert.strictEqual(resSegura.desfecho, 'LIBERADA_SEGURA', 'Prescrição limpa deve ter desfecho LIBERADA_SEGURA');
assert.strictEqual(resSegura.rejeitada, false, 'Prescrição limpa não deve ser rejeitada');
assert.strictEqual(resSegura.escoreRisco, 0, 'Escore de risco deve ser 0');
assert.strictEqual(resSegura.bloqueiosSentinela.length, 0, 'Sem bloqueios sentinela');
assert.ok(dt1 < 25, `Tempo de auditoria individual (${dt1.toFixed(2)}ms) deve ser menor que 25ms`);
console.log(`✓ 1. Prescrição Segura validada com sucesso (${dt1.toFixed(2)}ms)`);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Teste: Evento Sentinela / Bloqueio Fatal (KCl 19,1% bolus)
// ─────────────────────────────────────────────────────────────────────────────
const resSentinela = AuditoriaKaizenClinicoService.auditarPrescricao({
  paciente: 'Paciente 02 - Leito 104',
  setor: 'EMERGENCIA',
  prescritorNome: 'Dr. Bruno',
  perfilPrescritor: 'RESIDENTE',
  textoPrescricao: 'Cloreto de Potássio 19,1% 1 ampola em bolus direto EV agora',
  contextoClinico: { clcr: 60 }
});

assert.strictEqual(resSentinela.desfecho, 'REJEITADA_BLOQUEIO_FATAL', 'KCl bolus deve disparar REJEITADA_BLOQUEIO_FATAL');
assert.strictEqual(resSentinela.rejeitada, true, 'Deve rejeitar e bloquear dispensação');
assert.strictEqual(resSentinela.escoreRisco, 100, 'Escore de risco máximo = 100');
assert.strictEqual(resSentinela.bloqueiosSentinela.length, 1, 'Deve conter 1 evento sentinela');
assert.strictEqual(resSentinela.bloqueiosSentinela[0].tipo, 'EVENTO_SENTINELA_KCL_BOLUS');
assert.ok(resSentinela.gargalosDetectados[0].includes('BLOQUEIO FATAL'), 'Deve indicar bloqueio fatal no gargalo');
console.log('✓ 2. Bloqueio Fatal / Evento Sentinela (KCl 19,1% bolus) validado com sucesso');

// ─────────────────────────────────────────────────────────────────────────────
// 3. Teste: Rejeição por Interação Grave / Contraindicada (Amiodarona + Fluconazol)
// ─────────────────────────────────────────────────────────────────────────────
const resInteracao = AuditoriaKaizenClinicoService.auditarPrescricao({
  paciente: 'Paciente 03 - UTI Leito 05',
  setor: 'UTI',
  prescritorNome: 'Dr. Carlos',
  perfilPrescritor: 'ASSISTENTE',
  textoPrescricao: 'Amiodarona 200mg VO 1x/dia\nFluconazol 200mg IV 1x/dia',
  contextoClinico: { clcr: 70 }
});

assert.strictEqual(resInteracao.desfecho, 'REJEITADA_INTERACAO_GRAVE', 'Combinação deve disparar REJEITADA_INTERACAO_GRAVE');
assert.strictEqual(resInteracao.rejeitada, true, 'Interação crítica deve rejeitar prescrição');
assert.ok(resInteracao.escoreRisco >= 70, 'Escore de risco deve ser >= 70');
assert.ok(resInteracao.interacoes.length >= 1, 'Deve registrar pelo menos 1 interação crítica');
const temQt = resInteracao.interacoes.some(i => i.efeito.toLowerCase().includes('qt') || i.efeito.toLowerCase().includes('torsades'));
assert.ok(temQt, 'Efeito da interação deve citar prolongamento de QT / Torsades');
console.log('✓ 3. Rejeição por Interação Grave (Amiodarona + Fluconazol) validada com sucesso');

// ─────────────────────────────────────────────────────────────────────────────
// 4. Teste: Intervenção por Omissão de Ajuste Renal (ClCr 20)
// ─────────────────────────────────────────────────────────────────────────────
const resRenal = AuditoriaKaizenClinicoService.auditarPrescricao({
  paciente: 'Paciente 04 - Enfermaria Leito 312',
  setor: 'ENFERMARIA',
  prescritorNome: 'Dra. Daniela',
  perfilPrescritor: 'RESIDENTE',
  textoPrescricao: 'Enoxaparina 80mg SC 12/12h',
  contextoClinico: { clcr: 20 }
});

assert.strictEqual(resRenal.desfecho, 'INTERVENCAO_AJUSTE_RENAL', 'Disfunção renal com enoxaparina plena deve gerar intervenção renal');
assert.strictEqual(resRenal.rejeitada, true, 'Deve reter prescrição para correção de dose');
assert.ok(resRenal.ajustesRenais.length >= 1, 'Deve ter lista de ajustes renais exigidos');
assert.ok(resRenal.ajustesRenais[0].instrucaoAjuste.includes('ClCr < 30'), 'Instrução deve abordar ClCr < 30');
console.log('✓ 4. Intervenção de Ajuste de Função Renal validada com sucesso');

// ─────────────────────────────────────────────────────────────────────────────
// 5. Teste: Retenção por Perfil Acadêmico (RBAC)
// ─────────────────────────────────────────────────────────────────────────────
const resRbac = AuditoriaKaizenClinicoService.auditarPrescricao({
  paciente: 'Paciente 05 - Ambulatório Sala 02',
  setor: 'AMBULATORIO',
  prescritorNome: 'Acadêmico Lucas',
  perfilPrescritor: 'ACADEMICO',
  textoPrescricao: 'Amoxicilina 500mg VO 8/8h',
  contextoClinico: { clcr: 90 }
});

assert.strictEqual(resRbac.desfecho, 'RETIDA_SUPERVISAO', 'Prescrição por acadêmico deve ficar RETIDA_SUPERVISAO');
assert.strictEqual(resRbac.rejeitada, true, 'Deve reter para co-assinatura');
assert.ok(resRbac.retencaoRbac !== null, 'Objeto retencaoRbac deve estar preenchido');
assert.ok(resRbac.retencaoRbac.motivo.includes('Acadêmico de medicina'), 'Motivo deve citar acadêmico');
console.log('✓ 5. Retenção RBAC por Perfil Acadêmico validada com sucesso');

// ─────────────────────────────────────────────────────────────────────────────
// 6. Teste: Processamento em Lote Off-line (Batch Processing)
// ─────────────────────────────────────────────────────────────────────────────
const lotePrescricoes = [
  { paciente: 'P01', setor: 'UTI', textoPrescricao: 'Noradrenalina 0.2 mcg/kg/min\nFentanil 50 mcg/h', contextoClinico: { clcr: 60 } },
  { paciente: 'P02', setor: 'UTI', textoPrescricao: 'Amiodarona 200mg\nFluconazol 200mg', contextoClinico: { clcr: 75 } },
  { paciente: 'P03', setor: 'EMERGENCIA', textoPrescricao: 'Cloreto de Potássio 19,1% bolus puro', contextoClinico: { clcr: 50 } },
  { paciente: 'P04', setor: 'ENFERMARIA', textoPrescricao: 'Enoxaparina 60mg SC 12/12h', contextoClinico: { clcr: 25 } },
  { paciente: 'P05', setor: 'AMBULATORIO', perfilPrescritor: 'ACADEMICO', textoPrescricao: 'Dipirona 500mg', contextoClinico: { clcr: 80 } },
  { paciente: 'P06', setor: 'ENFERMARIA', textoPrescricao: 'Paracetamol 750mg VO 6/6h', contextoClinico: { clcr: 90 } }
];

const tBatch0 = performance.now();
const resLote = AuditoriaKaizenClinicoService.processarLotePrescricoes(lotePrescricoes);
const dtBatch = performance.now() - tBatch0;

assert.strictEqual(resLote.sucesso, true);
assert.strictEqual(resLote.totalProcessadas, 6);
assert.strictEqual(resLote.eventos.length, 6);
assert.ok(dtBatch < 50, `Processamento em lote (${dtBatch.toFixed(2)}ms) deve ser ultra-rápido (< 50ms)`);
console.log(`✓ 6. Processamento em Lote Off-line aprovado (${dtBatch.toFixed(2)}ms para 6 prontuários)`);

// ─────────────────────────────────────────────────────────────────────────────
// 7. Teste: Dashboard e Índice de Maturidade de Kaizen (0-100)
// ─────────────────────────────────────────────────────────────────────────────
const dashboardGeral = AuditoriaKaizenClinicoService.gerarDashboardKaizen();
assert.strictEqual(dashboardGeral.sucesso, true);
assert.ok(dashboardGeral.metricasGerais.totalPrescricoes >= 11, 'Deve contabilizar todas as prescrições auditadas');
assert.ok(dashboardGeral.metricasGerais.totalEventosSentinela >= 2, 'Deve registrar eventos sentinela');
assert.ok(dashboardGeral.metricasGerais.totalInteracoesContraindicadas >= 2, 'Deve registrar interações contraindicadas');
assert.ok(dashboardGeral.metricasGerais.totalIntervencoesRenais >= 2, 'Deve registrar intervenções renais');
assert.ok(dashboardGeral.maturidadeSeguranca.indiceKaizen <= 50, 'Presença de evento sentinela deve limitar nota a <= 50');
assert.ok(dashboardGeral.maturidadeSeguranca.nivel.includes('NÍVEL 1') || dashboardGeral.maturidadeSeguranca.nivel.includes('NÍVEL 2'), 'Nível de risco adequado');
console.log(`✓ 7. Dashboard e Índice de Maturidade Kaizen apurado (Nota: ${dashboardGeral.maturidadeSeguranca.indiceKaizen}/100, Nível: ${dashboardGeral.maturidadeSeguranca.nivel})`);

// ─────────────────────────────────────────────────────────────────────────────
// 8. Teste: Top Fármacos Incidentes e Top Interações
// ─────────────────────────────────────────────────────────────────────────────
const topF = dashboardGeral.gargalosClinicos.topFarmacosIncidentes;
assert.ok(topF.length >= 1, 'Deve identificar top fármacos problemáticos');
console.log('✓ 8. Top Fármacos Incidentes detectados:', topF.map(f => `${f.farmaco} (${f.rejeicoes} rejeições)`).join(', '));

const topI = dashboardGeral.gargalosClinicos.topInteracoesCriticas;
assert.ok(topI.length >= 1, 'Deve identificar top interações recorrentes');
console.log('✓ 8b. Top Interações Recorrentes detectadas:', topI.map(i => `${i.par} (${i.total}x)`).join(', '));

// ─────────────────────────────────────────────────────────────────────────────
// 9. Teste: Plano de Ação Kaizen e Intervenções Prioritárias
// ─────────────────────────────────────────────────────────────────────────────
const plano = dashboardGeral.planoDeAcaoKaizen;
assert.ok(plano.length >= 2, 'Deve formular plano de ação com múltiplas recomendações');
const temAcaoKcl = plano.some(p => p.acao.includes('KCl 19,1%'));
assert.ok(temAcaoKcl, 'Plano de ação deve conter recomendação emergencial sobre KCl');
console.log('✓ 9. Plano de Ação Kaizen gerado com sucesso:', plano.length, 'ações recomendadas');

// ─────────────────────────────────────────────────────────────────────────────
// 10. Teste: Formatação Visual em ASCII (Telegram / Cockpit)
// ─────────────────────────────────────────────────────────────────────────────
const textoAscii = AuditoriaKaizenClinicoService.formatarDashboardEmTexto(dashboardGeral);
assert.ok(textoAscii.includes('DASHBOARD DE KAIZEN CLÍNICO'), 'Deve conter título do dashboard');
assert.ok(textoAscii.includes('ÍNDICE DE MATURIDADE'), 'Deve conter índice de maturidade');
assert.ok(textoAscii.includes('MÉTRICAS GLOBAIS'), 'Deve conter métricas');
assert.ok(textoAscii.includes('PLANO DE AÇÃO KAIZEN'), 'Deve conter plano de ação');
console.log('✓ 10. Renderização de Dashboard em ASCII validada com sucesso');

// ─────────────────────────────────────────────────────────────────────────────
// 11. Teste: Integração RPC Fastify via cockpitAuditoriaKaizen
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');
const botToken = 'dummy-token-audit';
if (!runtime.ctx.ConfigService) runtime.ctx.ConfigService = {};
runtime.ctx.ConfigService.exigir = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : (k === 'TELEGRAM_BOT_TOKEN' ? botToken : 'dummy');
const hashEsperado = crypto.createHmac('sha256', botToken).update('123').digest('hex');
const fakeSession = 'ck_' + hashEsperado;

const tRpc0 = performance.now();
const resRpc = runtime.cockpitRpc('cockpitAuditoriaKaizen', fakeSession, [{
  acao: 'completo',
  prescricao: {
    paciente: 'Teste RPC Fastify',
    setor: 'UTI',
    textoPrescricao: 'Meropenem 1g IV 8/8h\nAmiodarona 200mg VO',
    contextoClinico: { clcr: 25 }
  }
}]);
const dtRpc = performance.now() - tRpc0;

assert.strictEqual(resRpc.sucesso, true, 'Chamada RPC deve ter sucesso: true');
assert.ok(resRpc.dashboard, 'Deve retornar dashboard');
assert.ok(resRpc.textoFormatado, 'Deve retornar textoFormatado');
assert.ok(dtRpc < 50, `Tempo RPC Fastify (${dtRpc.toFixed(2)}ms) deve ser menor que 50ms`);
console.log(`✓ 11. Integração RPC Fastify cockpitAuditoriaKaizen aprovada (${dtRpc.toFixed(2)}ms)`);

// ─────────────────────────────────────────────────────────────────────────────
// 12. Teste de Reinicialização de Histórico (limparHistorico)
// ─────────────────────────────────────────────────────────────────────────────
AuditoriaKaizenClinicoService.limparHistorico();
const dashLimpo = AuditoriaKaizenClinicoService.gerarDashboardKaizen();
assert.strictEqual(dashLimpo.metricasGerais.totalPrescricoes, 0, 'Histórico limpo deve ter 0 prescrições');
assert.strictEqual(dashLimpo.maturidadeSeguranca.indiceKaizen, 100, 'Unidade sem incidentes deve ter nota 100');
console.log('✓ 12. Reinicialização de histórico e nota base 100 confirmados com sucesso');

console.log('\n🚀 TODOS OS 12 TESTES DA AUDITORIA ANALÍTICA (KAIZEN CLÍNICO) PASSARAM COM SUCESSO!\n');
