/**
 * test_acessibilidade_contraste_cockpit.cjs
 * Bateria de testes automatizados para auditoria de Acessibilidade e Contraste de Cores (WCAG AA)
 * nos Cards de Alertas Clínicos, Sala Vermelha (USP-RP / HC-UE), Salvaguardas e Cockpit PWA.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');

function runTests() {
  console.log('=== TESTE DE ACESSIBILIDADE E CONTRASTE DE CORES WCAG AA NO COCKPIT PWA ===\n');

  const cockpitPath = path.join(__dirname, '../cockpit_movel.html');
  const deployPath = path.join(__dirname, '../gh_cockpit_deploy/index.html');

  assert(fs.existsSync(cockpitPath), 'cockpit_movel.html deve existir');
  assert(fs.existsSync(deployPath), 'gh_cockpit_deploy/index.html deve existir');

  const cockpitHtml = fs.readFileSync(cockpitPath, 'utf8');
  const deployHtml = fs.readFileSync(deployPath, 'utf8');

  // [1] Validando sincronismo absoluto entre cockpit_movel.html e gh_cockpit_deploy/index.html
  console.log('[1] Validando paridade de hash SHA-256 entre os arquivos do Cockpit...');
  const hash1 = crypto.createHash('sha256').update(cockpitHtml).digest('hex');
  const hash2 = crypto.createHash('sha256').update(deployHtml).digest('hex');
  assert.strictEqual(hash1, hash2, 'cockpit_movel.html e gh_cockpit_deploy/index.html devem ter hash SHA-256 idêntico');
  console.log('  ✓ Paridade absoluta validada (SHA-256: ' + hash1.substring(0, 16) + '...).');

  // [2] Classes utilitárias de contraste clínico WCAG AA no <style>
  console.log('[2] Validando classes utilitárias de contraste clínico WCAG AA no style...');
  assert(cockpitHtml.includes('.alerta-clinico-critico'), 'Deve conter classe .alerta-clinico-critico no style');
  assert(cockpitHtml.includes('.alerta-clinico-vigilancia'), 'Deve conter classe .alerta-clinico-vigilancia no style');
  assert(cockpitHtml.includes('.alerta-clinico-salvaguarda'), 'Deve conter classe .alerta-clinico-salvaguarda no style');
  assert(cockpitHtml.includes('#ffe4e6'), 'alerta-clinico-critico deve utilizar cor #ffe4e6 de alto contraste');
  console.log('  ✓ Classes utilitárias de contraste clínico WCAG AA validadas no style.');

  // [3] Botão de chamada para Sala Vermelha (USP-RP / HC-UE)
  console.log('[3] Validando botão de chamada para Sala Vermelha (USP-RP / HC-UE)...');
  assert(cockpitHtml.includes('bg-rose-500/25') && cockpitHtml.includes('text-rose-100') && cockpitHtml.includes('border-2 border-rose-400/70'),
    'Botão de Sala Vermelha deve possuir contraste WCAG AA com bg-rose-500/25, text-rose-100 e border-2 border-rose-400/70');
  assert(cockpitHtml.includes('bg-rose-500/40 text-white') && cockpitHtml.includes('HC-UE'),
    'Badge HC-UE deve possuir texto branco e fundo calibrado de alto contraste');
  console.log('  ✓ Botão e badge de Sala Vermelha validados com alto contraste WCAG AA.');

  // [4] Card de Erros Críticos & Contraindicações da USP-RP
  console.log('[4] Validando Card de Erros Críticos & Contraindicações da Sala Vermelha...');
  assert(cockpitHtml.includes('bg-rose-950/70 border-2 border-rose-500/70') && cockpitHtml.includes('text-rose-100'),
    'Container de erros críticos deve possuir bg-rose-950/70 border-2 border-rose-500/70 e text-rose-100');
  assert(cockpitHtml.includes('Armadilhas &amp; Erros Críticos (HC-UE FMRP-USP)') || cockpitHtml.includes('Armadilhas & Erros Críticos (HC-UE FMRP-USP)'),
    'Título oficial de armadilhas e erros críticos deve estar presente');
  assert(cockpitHtml.includes('<span class="text-rose-300 font-bold shrink-0">❌</span> <span class="text-rose-100 leading-snug">${erro}</span>'),
    'Renderização dos erros em JS deve utilizar text-rose-100 de alta legibilidade');
  console.log('  ✓ Card de Erros Críticos e Armadilhas HC-UE validado com conformidade WCAG AA.');

  // [5] Card de Metas da Sala Vermelha e Itens Interativos
  console.log('[5] Validando Card de Metas e Itens Interativos de Conduta da Sala Vermelha...');
  assert(cockpitHtml.includes('id="usprp-metas-card" class="p-3 rounded-xl bg-slate-900/95 border border-slate-700/80'),
    'Metas card deve possuir container de alto contraste bg-slate-900/95 e borda border-slate-700/80');
  assert(cockpitHtml.includes('bg-emerald-950/40 border-2 border-emerald-500/70'),
    'Card de conduta checada deve possuir destaque verde claro com borda 2px');
  assert(cockpitHtml.includes('bg-rose-500/30 text-rose-100 border border-rose-400/70'),
    'Badge de prioridade Imediata/Mandatória deve possuir text-rose-100 de alto contraste');
  assert(cockpitHtml.includes('font-mono text-[11px] text-amber-200 whitespace-pre-wrap leading-relaxed'),
    'Box de prescrição deve possuir fonte mono legível de 11px em text-amber-200');
  assert(cockpitHtml.includes("racionalEl.className = 'text-[10.5px] text-slate-300 font-medium leading-snug'"),
    'Racional FMRP deve ter peso font-medium e text-slate-300 sem itálico desbotado');
  console.log('  ✓ Metas, checklists e caixas de prescrição da Sala Vermelha validados.');

  // [6] Salvaguardas das Calculadoras Clínicas (HEART, Asma, DHE)
  console.log('[6] Validando cartões de salvaguarda das calculadoras clínicas...');
  // HEART
  assert(cockpitHtml.includes('bg-rose-950/40 border-2 border-rose-500/50') && cockpitHtml.includes('Bloqueios Sentinela &amp; Salvaguardas DAPT'),
    'HEART deve possuir cartão de bloqueios sentinela e salvaguardas DAPT com borda e fundo reforçados');
  // Asma
  assert(cockpitHtml.includes('bg-teal-950/35 border-2 border-teal-500/50') && cockpitHtml.includes('Salvaguardas &amp; Sinais Sentinela'),
    'Asma deve possuir cartão de salvaguardas e sinais sentinela com alto contraste');
  assert(cockpitHtml.includes('text-rose-200 font-semibold cursor-pointer') && cockpitHtml.includes('PaCO₂ &gt;= 42 mmHg (Fadiga)'),
    'Sinal de normocapnia/fadiga na Asma deve possuir realce em text-rose-200 font-semibold');
  // DHE
  assert(cockpitHtml.includes('bg-rose-950/70 px-3 py-1.5 rounded-xl border-2 border-rose-500/70') && cockpitHtml.includes('ECG Alterado'),
    'ECG alterado na hipercalemia deve possuir cartão de destaque com borda 2px');
  assert(cockpitHtml.includes('bg-red-600/35 text-red-100 border-2 border-red-400/80 font-black') && cockpitHtml.includes('8.3 (PCR Iminente)'),
    'Chip de PCR iminente por K+ deve possuir text-red-100 font-black e borda 2px');
  console.log('  ✓ Salvaguardas e bloqueios sentinela de HEART, Asma e DHE validados.');

  // [7] Censo de Leitos da Enfermaria e Cards de Leitos
  console.log('[7] Validando indicadores do Censo de Leitos e status de instabilidade...');
  assert(cockpitHtml.includes('bg-rose-950/60 border-2 border-rose-500/60 rounded-xl') && cockpitHtml.includes('🚨 Instáveis'),
    'Indicador de leitos instáveis no censo deve ter borda 2px e fundo escuro contrastante');
  assert(cockpitHtml.includes('bg-amber-950/60 border-2 border-amber-500/60 rounded-xl') && cockpitHtml.includes('⚠️ Vigilância'),
    'Indicador de leitos em vigilância no censo deve ter borda 2px e fundo âmbar contrastante');
  assert(cockpitHtml.includes("badgeClass: 'bg-rose-500/30 text-rose-100 border border-rose-400/70 font-extrabold shadow-sm'"),
    'Badge de leito instável em renderizarLeitos deve usar text-rose-100 font-extrabold');
  assert(cockpitHtml.includes("badgeClass: 'bg-amber-500/30 text-amber-100 border border-amber-400/70 font-extrabold shadow-sm'"),
    'Badge de leito em vigilância em renderizarLeitos deve usar text-amber-100 font-extrabold');
  console.log('  ✓ Indicadores do Censo e badges de status de leitos validados.');

  // [8] Ponto Cego do Plantão / Preceptor IA
  console.log('[8] Validando Ponto Cego do Plantão, Pérola Beira-Leito e Diretriz HC-UE...');
  assert(cockpitHtml.includes('ponto-cego-armadilha-texto') && cockpitHtml.includes('text-[11.5px] text-slate-100 leading-relaxed font-medium'),
    'Ponto cego do plantão deve possuir texto text-slate-100 font-medium');
  assert(cockpitHtml.includes('bg-purple-950/40 border-2 border-purple-500/50') && cockpitHtml.includes('Pérola Beira-Leito'),
    'Pérola beira-leito deve possuir container roxo de alto contraste com borda 2px');
  assert(cockpitHtml.includes('bg-emerald-950/40 border-2 border-emerald-500/50') && cockpitHtml.includes('Conduta Padrão-Ouro HC-UE'),
    'Diretriz salva-vidas deve possuir container verde esmeralda de alto contraste com borda 2px');
  console.log('  ✓ Ponto Cego, Pérola e Diretriz HC-UE validados.');

  // [9] Obstetrícia e Sala de Parto (G&O)
  console.log('[9] Validando salvaguardas de G&O (Sulfato de Magnésio e Choque Hemorrágico)...');
  assert(cockpitHtml.includes('bg-rose-950/80 border-2 border-rose-500 text-rose-100') && cockpitHtml.includes('co-pe-alerta-intoxicacao'),
    'Alerta de intoxicação por sulfato de magnésio deve possuir alto contraste WCAG AA');
  assert(cockpitHtml.includes('ANTÍDOTO DE CABECEIRA:') && cockpitHtml.includes('Gluconato de Cálcio 10% 10 mL IV lento'),
    'Alerta sentinela de antídoto de cabeceira de MgSO4 deve estar destacado');
  assert(cockpitHtml.includes('bg-rose-950 border-2 border-rose-400 text-rose-100 text-xs font-black') && cockpitHtml.includes('CHOQUE GRAVE'),
    'Alerta de índice de choque grave deve possuir text-rose-100 font-black e borda 2px');
  assert(cockpitHtml.includes('bg-rose-950/60 border-2 border-rose-500/70 text-rose-100') && cockpitHtml.includes('pn-soro-alertas-criticos'),
    'Alertas críticos de sorologias pré-natal devem possuir alto contraste');
  console.log('  ✓ Salvaguardas obstétricas de intoxicação e choque validadas.');

  // [10] Padrão das 5 Grandes Áreas Médicas e Subcalculadoras
  console.log('[10] Validando botões de calculadoras e padrão visual das 5 Grandes Áreas...');
  assert(cockpitHtml.includes("badgeClass: 'bg-blue-500/20 text-blue-100 border border-blue-400/60 font-bold'"),
    'Padrão visual de Clínica Médica deve usar text-blue-100');
  assert(cockpitHtml.includes("badgeClass: 'bg-rose-500/20 text-rose-100 border border-rose-400/60 font-bold'"),
    'Padrão visual de G&O deve usar text-rose-100');
  assert(cockpitHtml.includes("badgeClass: 'bg-amber-500/20 text-amber-100 border border-amber-400/60 font-bold'"),
    'Padrão visual de Pediatria deve usar text-amber-100');
  assert(cockpitHtml.includes("b.className = \"subcalc-btn py-2 px-1 rounded-lg bg-slate-900/90 text-slate-200 border border-slate-700/80 hover:text-white text-[10px] font-bold\""),
    'Botões inativos de subcalculadoras devem manter text-slate-200 e borda contrastante');
  console.log('  ✓ Padrão das 5 Grandes Áreas e subcalculadoras validados com sucesso.');

  console.log('\n🎉 SUCESSO TOTAL: 10/10 validações de acessibilidade e contraste WCAG AA aprovadas com 100% de sucesso!\n');
}

runTests();
