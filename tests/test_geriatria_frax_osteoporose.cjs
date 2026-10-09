/**
 * ==============================================================================
 * SUÍTE DE TESTES AUTOMATIZADOS: GERIATRIA AVANÇADA, FRAX E OSTEOPOROSE
 * ==============================================================================
 * Valida a Calculadora FRAX Brasil, Protocolos de Osteoporose e Bisfosfonatos,
 * Bloqueios Mandatórios (ClCr < 35, Hipocalcemia, Esofagite, ONJ, Drug Holiday),
 * Auditoria de FRIDs (Hipotensão Ortostática, QT Longo, Sedativos) e Profilaxia de Quedas.
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');
const runtime = require('../server/runtime.js');

const SaudeIdosoService = runtime.ctx.SaudeIdosoService;

console.log('=== INICIANDO BATERIA DE TESTES DE GERIATRIA AVANÇADA (FRAX / OSTEOPOROSE / QUEDAS) ===\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. AGA BÁSICA E RETROCOMPATIBILIDADE
// ─────────────────────────────────────────────────────────────────────────────
console.log('[1] Testando AGA Básica e Retrocompatibilidade...');

// 1.1 CFS
const cfsRobusto = SaudeIdosoService.avaliarFragilidadeCFS(2);
assert.equal(cfsRobusto.classificacao, 'Robusto');
assert.equal(cfsRobusto.alerta_fragilidade, false);

const cfsFragil = SaudeIdosoService.avaliarFragilidadeCFS(6);
assert.equal(cfsFragil.classificacao, 'Fragilidade Moderada');
assert.equal(cfsFragil.alerta_fragilidade, true);

// 1.2 Mini-Cog
const miniCogNormal = SaudeIdosoService.avaliarMiniCog(3, true);
assert.equal(miniCogNormal.escore_total, 5);
assert.equal(miniCogNormal.rastreio_positivo, false);

const miniCogAlterado = SaudeIdosoService.avaliarMiniCog(1, false);
assert.equal(miniCogAlterado.escore_total, 1);
assert.equal(miniCogAlterado.rastreio_positivo, true);

// 1.3 TUG
const tugRapido = SaudeIdosoService.avaliarRiscoQuedasTUG(9);
assert.equal(tugRapido.classificacao, 'Normal');
assert.equal(tugRapido.risco_alto, false);

const tugLento = SaudeIdosoService.avaliarRiscoQuedasTUG(22);
assert.equal(tugLento.classificacao, 'Alto Risco de Quedas');
assert.equal(tugLento.risco_alto, true);

// 1.4 Beers
const analiseBeers = SaudeIdosoService.avaliarFarmacosBeers(['clonazepam', 'omeprazol', 'losartana', 'atenolol', 'glibenclamida']);
assert.equal(analiseBeers.polifarmacia, true);
assert.equal(analiseBeers.alertas_beers, true);
assert(analiseBeers.medicamentos_inadequados.some(m => m.medicamento === 'clonazepam'));
assert(analiseBeers.medicamentos_inadequados.some(m => m.medicamento === 'glibenclamida'));

console.log('  ✓ CFS, Mini-Cog, TUG e Beers 100% validados.');

// ─────────────────────────────────────────────────────────────────────────────
// 2. CALCULADORA FRAX (BRASIL / ABRASSO / NOGG)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] Testando Calculadora FRAX (Brasil)...');

// 2.1 Mulher 65 anos, IMC 25, sem fatores de risco e sem DMO
const fraxBasico = SaudeIdosoService.calcularFrax({
  idade: 65,
  sexo: 'F',
  peso: 60,
  altura: 155
});
assert(fraxBasico.risco_fratura_maior_pct > 0);
assert(fraxBasico.risco_fratura_quadril_pct > 0);
assert.equal(fraxBasico.categoria_risco, 'BAIXO RISCO');
assert.equal(fraxBasico.indicacao_tratamento_farmacologico, false);

// 2.2 Mulher 68 anos, alto risco clínico e DMO T-score -2.6
const fraxGrave = SaudeIdosoService.calcularFrax({
  idade: 68,
  sexo: 'F',
  peso: 52,
  altura: 155,
  fraturaPrevia: true,
  corticoide: true,
  tScoreColoFemur: -2.6
});
assert(fraxGrave.risco_fratura_maior_pct >= 25.0, `MOF (${fraxGrave.risco_fratura_maior_pct}%) deve ser alto`);
assert(fraxGrave.risco_fratura_quadril_pct >= 4.0, `Quadril (${fraxGrave.risco_fratura_quadril_pct}%) deve ser alto`);
assert(fraxGrave.categoria_risco.includes('ALTO RISCO'));
assert.equal(fraxGrave.indicacao_tratamento_farmacologico, true);

// 2.3 Homem 75 anos com tabagismo e artrite reumatoide
const fraxHomem = SaudeIdosoService.calcularFrax({
  idade: 75,
  sexo: 'M',
  peso: 70,
  altura: 172,
  tabagismo: true,
  artriteReumatoide: true
});
assert.equal(fraxHomem.sexo, 'Masculino');
assert(fraxHomem.risco_fratura_maior_pct > 0);
assert(fraxHomem.risco_fratura_quadril_pct > 0);

// 2.4 Casos Extremos: Idade < 40 e Idade > 90 anos
const fraxJovem = SaudeIdosoService.calcularFrax({ idade: 32, sexo: 'F' });
assert.equal(fraxJovem.idade, 32);
assert.equal(fraxJovem.idade_utilizada, 40);
assert(fraxJovem.alertas.some(a => a.includes('< 40 anos')));

const fraxLongevo = SaudeIdosoService.calcularFrax({ idade: 94, sexo: 'F' });
assert.equal(fraxLongevo.idade, 94);
assert.equal(fraxLongevo.idade_utilizada, 90);
assert(fraxLongevo.alertas.some(a => a.includes('> 90 anos')));

// 2.5 Casos Extremos: Baixo peso (< 40 kg) e Obesidade (> 150 kg)
const fraxBaixoPeso = SaudeIdosoService.calcularFrax({ idade: 70, peso: 36, sexo: 'F' });
assert(fraxBaixoPeso.alertas.some(a => a.includes('Baixo peso corporal')));

const fraxObeso = SaudeIdosoService.calcularFrax({ idade: 65, peso: 165, sexo: 'F' });
assert(fraxObeso.alertas.some(a => a.includes('Obesidade severa')));

// 2.6 T-score extremo (< -4.0)
const fraxTScoreCritico = SaudeIdosoService.calcularFrax({ idade: 72, sexo: 'F', tScoreColoFemur: -4.5 });
assert(fraxTScoreCritico.alertas.some(a => a.includes('T-score extremamente reduzido')));

// 2.7 Parser de texto livre FRAX
const fraxTexto = SaudeIdosoService.interpretarTextoLivreFrax('mulher 68 anos, 55kg, 158cm, fratura previa, corticoide, tscore -2.8');
assert.equal(fraxTexto.idade, 68);
assert.equal(fraxTexto.sexo, 'Feminino');
assert.equal(fraxTexto.fatores_risco.fratura_previa, true);
assert.equal(fraxTexto.fatores_risco.corticoide_cronico, true);
assert.equal(fraxTexto.t_score_colo_femur, -2.8);
assert.equal(fraxTexto.indicacao_tratamento_farmacologico, true);

console.log('  ✓ Calculadora FRAX validada com precisão determinística e edge cases protegidos.');

// ─────────────────────────────────────────────────────────────────────────────
// 3. PROTOCOLO CLÍNICO DE OSTEOPOROSE & BLOQUEIOS DE SEGURANÇA
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] Testando Protocolo Clínico de Osteoporose e Bloqueios...');

// 3.1 Tratamento padrão 1ª linha (sem contraindicações)
const osteoPadrao = SaudeIdosoService.avaliarOsteoporose({
  tScore: -2.7,
  clcr: 65,
  calcioSerico: 9.4,
  vitaminaD: 32
});
assert.equal(osteoPadrao.classificacao_diagnostica, 'Osteoporose');
assert.equal(osteoPadrao.indicacao_tratamento, true);
assert(osteoPadrao.esquema_recomendado.includes('ALENDRONATO DE SÓDIO 70 mg'));
assert.equal(osteoPadrao.bloqueios_seguranca.length, 0);

// 3.2 Bloqueio Renal Absoluto: ClCr < 35 mL/min (Contraindica Bisfosfonatos -> Denosumabe)
const osteoRim = SaudeIdosoService.avaliarOsteoporose({
  tScore: -2.8,
  clcr: 26,
  calcioSerico: 9.1
});
assert(osteoRim.bloqueios_seguranca.some(b => b.includes('BLOQUEIO RENAL ABSOLUTO')));
assert(osteoRim.esquema_recomendado.includes('DENOSUMABE 60 mg SC'));
assert(osteoRim.alternativas.some(a => a.includes('efeito rebote')));

// 3.3 Bloqueio de Hipocalcemia: Cálcio < 8.5 mg/dL
const osteoHipocalcemia = SaudeIdosoService.avaliarOsteoporose({
  tScore: -3.0,
  clcr: 50,
  calcioSerico: 7.9
});
assert(osteoHipocalcemia.bloqueios_seguranca.some(b => b.includes('BLOQUEIO DE HIPOCALCEMIA')));
assert(osteoHipocalcemia.esquema_recomendado.includes('AGUARDAR: Corrigir hipocalcemia'));

// 3.4 Bloqueio Esofágico: Paciente acamada ou com esofagite grave
const osteoEsofago = SaudeIdosoService.avaliarOsteoporose({
  tScore: -2.6,
  clcr: 55,
  calcioSerico: 9.2,
  doencaEsofagica: true
});
assert(osteoEsofago.bloqueios_seguranca.some(b => b.includes('BLOQUEIO ESOFÁGICO')));
assert(osteoEsofago.esquema_recomendado.includes('ÁCIDO ZOLEDRÔNICO 5 mg IV'));

// 3.5 Alerta Odontológico / ONJ
const osteoOdonto = SaudeIdosoService.avaliarOsteoporose({
  tScore: -2.9,
  procedimentoOdontologicoPendente: true
});
assert(osteoOdonto.alertas.some(a => a.includes('PROCEDIMENTO ODONTOLÓGICO INVASIVO PENDENTE')));

// 3.6 Férias Terapêuticas (Drug Holiday) após 5 anos
const osteoDrugHoliday = SaudeIdosoService.avaliarOsteoporose({
  tScore: -2.2,
  tempoUsoBisfosfonatoAnos: 5
});
assert(osteoDrugHoliday.alertas.some(a => a.includes('Drug Holiday')));

// 3.7 Protocolo de Vitamina D e Cálcio
const osteoVitDDeficiente = SaudeIdosoService.avaliarOsteoporose({
  tScore: -2.5,
  vitaminaD: 12
});
assert(osteoVitDDeficiente.protocolo_vitamina_d.includes('50.000 UI VO 1x por semana por 8 semanas'));
assert(osteoVitDDeficiente.protocolo_vitamina_d.includes('PROIBIDO prescrever megadoses anuais em bolus único'));
assert(osteoVitDDeficiente.protocolo_calcio.some(c => c.includes('NUNCA prescrever suplementação que exceda 2.000 mg/dia')));

// 3.8 Parser de texto livre Osteoporose
const osteoTexto = SaudeIdosoService.interpretarTextoLivreOsteoporose('72 anos, tscore -2.9, clcr 28, calcio 9.2, vit D 18');
assert.equal(osteoTexto.classificacao_diagnostica, 'Osteoporose');
assert(osteoTexto.bloqueios_seguranca.some(b => b.includes('BLOQUEIO RENAL ABSOLUTO')));
assert(osteoTexto.esquema_recomendado.includes('DENOSUMABE'));

console.log('  ✓ Protocolo de Osteoporose e Bloqueios Mandatórios (Rim, Cálcio, Esôfago, ONJ, Holiday) 100% testados.');

// ─────────────────────────────────────────────────────────────────────────────
// 4. PROFILAXIA DE QUEDAS & REVISÃO DE POLIFARMÁCIA (FRIDs)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] Testando Profilaxia de Quedas e Auditoria de FRIDs...');

// 4.1 Detecção de Drogas que Causam Hipotensão Ortostática
const fridsHipotensao = SaudeIdosoService.revisarPolifarmaciaQuedas(['doxazosina', 'furosemida', 'trazodona']);
assert(fridsHipotensao.drogas_hipotensao_ortostatica.length >= 3);
assert(fridsHipotensao.recomendacoes_desprescricao.some(r => r.includes('Hipotensores Ortostáticos')));

// 4.2 Detecção de Drogas que Prolongam QT
const fridsQt = SaudeIdosoService.revisarPolifarmaciaQuedas(['amiodarona', 'citalopram', 'ondansetrona']);
assert(fridsQt.drogas_prolongamento_qt.length >= 3);
assert(fridsQt.recomendacoes_desprescricao.some(r => r.includes('Prolongamento de QT')));

// 4.3 Detecção de Sedativos / Ataxia
const fridsSedativos = SaudeIdosoService.revisarPolifarmaciaQuedas(['clonazepam', 'zolpidem', 'ciclobenzaprina', 'pregabalina']);
assert(fridsSedativos.drogas_sedativas_ataxia.length >= 4);
assert(fridsSedativos.recomendacoes_desprescricao.some(r => r.includes('Benzodiazepínicos / Drogas Z')));

// 4.4 Carga Crítica (Sedativo + Hipotensor Ortostático)
const fridsCombinado = SaudeIdosoService.revisarPolifarmaciaQuedas(['clonazepam', 'doxazosina']);
assert.equal(fridsCombinado.alerta_critico, true);
assert(fridsCombinado.carga_risco_quedas.includes('CARGA CRÍTICA'));

// 4.5 Protocolo Integrado de Profilaxia de Quedas
const quedasGrave = SaudeIdosoService.protocoloProfilaxiaQuedas({
  tempoTug: 24,
  historicoQuedasUltimoAno: 3,
  quedaComFraturaOuLesao: true,
  hipotensaoOrtostatica: true,
  listaMedicamentos: ['clonazepam', 'doxazosina', 'furosemida']
});
assert.equal(quedasGrave.nivel_risco, 'ALTO RISCO DE QUEDAS');
assert(quedasGrave.acoes_beira_leito.some(a => a.includes('Teste da Hipotensão Ortostática')));
assert(quedasGrave.acoes_beira_leito.some(a => a.includes('CONTRAINDICAÇÃO FORMAL de contenção mecânica')));
assert(quedasGrave.criterios_encaminhamento_especialista.some(c => c.includes('síncope')));

// 4.6 Parser de texto livre Quedas
const quedasTexto = SaudeIdosoService.interpretarTextoLivreQuedas('82 anos, 3 quedas, tug 19s, usa clonazepam, furosemida, doxazosina, tontura ao levantar');
assert.equal(quedasTexto.nivel_risco, 'ALTO RISCO DE QUEDAS');
assert.equal(quedasTexto.analise_medicamentosa.alerta_critico, true);

console.log('  ✓ Auditoria de FRIDs (Hipotensão, QT, Sedativos) e Profilaxia de Quedas 100% testadas.');

// ─────────────────────────────────────────────────────────────────────────────
// 5. AVALIAÇÃO GERIÁTRICA AMPLA AVANÇADA INTEGRADA
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] Testando Avaliação Integrada...');

const integracaoAga = SaudeIdosoService.avaliarGeriatriaAvancada({
  cfs: { score: 5 },
  miniCog: { palavras: 2, relogioNormal: true },
  tug: { tempo: 15 },
  farmacos: { lista: ['clonazepam', 'losartana', 'hidroclorotiazida', 'omeprazol', 'metformina'] },
  frax: { idade: 70, sexo: 'F', peso: 55, altura: 156, fraturaPrevia: true, tScoreColoFemur: -2.6 },
  osteoporose: { tScore: -2.6, clcr: 45, calcioSerico: 9.3, vitaminaD: 24 }
});

assert(integracaoAga.aga.fragilidade);
assert(integracaoAga.aga.cognicao);
assert(integracaoAga.frax);
assert(integracaoAga.osteoporose);
assert(integracaoAga.profilaxia_quedas);

console.log('  ✓ Avaliação Geriátrica Ampla Avançada Integrada 100% validada.');

// ─────────────────────────────────────────────────────────────────────────────
// 6. COCKPIT RPC ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[6] Testando Cockpit RPC Endpoints via runtime.ctx...');

const tokenFake = 'test_token';
// Mock de autorização para teste direto de unidade
runtime.ctx.cockpitAutorizar_ = () => ({ ok: true, usuario: 'test' });

// 6.1 cockpitGeriatriaFrax
const rpcFrax = runtime.ctx.cockpitGeriatriaFrax(tokenFake, {
  idade: 66,
  sexo: 'F',
  peso: 58,
  altura: 157,
  fraturaPrevia: true
});
assert.equal(rpcFrax.sexo, 'Feminino');
assert(rpcFrax.risco_fratura_maior_pct > 0);

// 6.2 cockpitGeriatriaOsteoporose
const rpcOsteo = runtime.ctx.cockpitGeriatriaOsteoporose(tokenFake, {
  tScore: -2.7,
  clcr: 30
});
assert(rpcOsteo.esquema_recomendado.includes('DENOSUMABE'));

// 6.3 cockpitGeriatriaQuedas
const rpcQuedas = runtime.ctx.cockpitGeriatriaQuedas(tokenFake, {
  tempoTug: 16,
  historicoQuedasUltimoAno: 1
});
assert(rpcQuedas.nivel_risco.includes('Moderado'));

// 6.4 cockpitGeriatriaPolifarmacia
const rpcPolifarm = runtime.ctx.cockpitGeriatriaPolifarmacia(tokenFake, ['diazepam', 'furosemida', 'haloperidol']);
assert(rpcPolifarm.total_frids_detectados >= 2);

console.log('  ✓ Todos os métodos Cockpit RPC executados com sucesso.');

console.log('\n🎉 TODOS OS TESTES DE GERIATRIA AVANÇADA PASSARAM COM 100% DE SUCESSO!\n');
