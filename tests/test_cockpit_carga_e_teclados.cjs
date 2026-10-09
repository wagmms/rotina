const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== TESTE DE OTIMIZAÇÃO DE CARGA, LAZY LOADING E ERGONOMIA DE TECLADOS NO COCKPIT PWA ===\n');

const cockpitPath = path.resolve(__dirname, '../cockpit_movel.html');
const deployPath = path.resolve(__dirname, '../gh_cockpit_deploy/index.html');

assert(fs.existsSync(cockpitPath), 'cockpit_movel.html deve existir');
assert(fs.existsSync(deployPath), 'gh_cockpit_deploy/index.html deve existir');

const htmlCockpit = fs.readFileSync(cockpitPath, 'utf8');
const htmlDeploy = fs.readFileSync(deployPath, 'utf8');

// [1] Validação de Sincronismo entre Render e GitHub Pages
console.log('[1] Validando sincronismo absoluto entre cockpit_movel.html e gh_cockpit_deploy/index.html...');
assert.strictEqual(htmlCockpit, htmlDeploy, 'cockpit_movel.html e gh_cockpit_deploy/index.html devem ser idênticos');
console.log('  ✓ Arquivos 100% sincronizados em produção.');

// [2] Validação de Otimização de Carga e CDNs no <head>
console.log('\n[2] Validando preconnects e carregamento não bloqueante de scripts...');
assert(htmlCockpit.includes('<link rel="preconnect" href="https://cdn.tailwindcss.com" crossorigin>'), 'Deve conter preconnect para Tailwind');
assert(htmlCockpit.includes('<link rel="preconnect" href="https://unpkg.com" crossorigin>'), 'Deve conter preconnect para unpkg');
assert(htmlCockpit.includes('<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>'), 'Deve conter preconnect para jsdelivr');
assert(htmlCockpit.includes('<link rel="preconnect" href="https://telegram.org" crossorigin>'), 'Deve conter preconnect para telegram.org');

// Dexie e Telegram devem ter defer
assert(htmlCockpit.includes('<script defer src="https://telegram.org/js/telegram-web-app.js"></script>'), 'Telegram WebApp deve conter defer');
assert(htmlCockpit.includes('<script defer src="https://cdn.jsdelivr.net/npm/dexie@4.0.11/dist/dexie.min.js"></script>'), 'Dexie.js deve conter defer');

// Chart.js NÃO deve estar como script síncrono no <head>
assert(!htmlCockpit.includes('<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>'), 'Chart.js não deve estar bloqueando a renderização no <head>');
console.log('  ✓ Preconnects ativos e scripts pesados desacoplados do carregamento inicial crítico.');

// [3] Validação de Lazy Loading do Chart.js e Limpeza de Instâncias
console.log('\n[3] Validando rotina de Lazy Loading de Chart.js...');
assert(htmlCockpit.includes('function carregarChartJsLazy()'), 'Deve conter a função carregarChartJsLazy');
assert(htmlCockpit.includes('_instanciaGraficoCorpo = new Chart(ctx'), 'Deve gerenciar instância do gráfico para evitar erro de reuso de canvas');
assert(htmlCockpit.includes('_instanciaGraficoCorpo.destroy()'), 'Deve destruir instância anterior antes de recriar gráfico');
console.log('  ✓ Lazy loading e ciclo de vida de canvas/Chart.js devidamente blindados.');

// [4] Validação de Prevenção de Auto-Zoom no Mobile
console.log('\n[4] Validando regras CSS para prevenção de auto-zoom no iOS Safari / Android...');
assert(htmlCockpit.includes('@media screen and (max-width: 768px)'), 'Deve conter media query para telas mobile');
assert(htmlCockpit.includes('font-size: 16px !important;'), 'Inputs devem ter 16px no mobile para impedir zoom involuntário');
console.log('  ✓ Prevenção de zoom espúrio em formulários mobile validada.');

// [5] Validação de Teclados Numéricos (inputmode) e Autocomplete Off nas Calculadoras
console.log('\n[5] Validando ergonomia de teclados táteis (inputmode) nas calculadoras...');
const inputsDecimaisObrigatorios = [
  'id="dva-peso"',
  'id="sri-peso"',
  'id="cr-peso"',
  'id="cr-val"',
  'id="atb-clcr"',
  'id="dhe-peso"',
  'id="dhe-na-atual"',
  'id="dhe-k-atual"',
  'id="dhe-na-hiper"',
  'id="gaso-ph"',
  'id="gaso-pco2"',
  'id="gaso-hco3"',
  'id="ped-peso"'
];

inputsDecimaisObrigatorios.forEach(idInput => {
  const idx = htmlCockpit.indexOf(idInput);
  assert(idx !== -1, `Input ${idInput} deve existir no HTML`);
  const tagStart = htmlCockpit.lastIndexOf('<input', idx);
  const tagEnd = htmlCockpit.indexOf('>', idx);
  const tagHtml = htmlCockpit.substring(tagStart, tagEnd + 1);
  assert(tagHtml.includes('inputmode="decimal"'), `Input ${idInput} deve possuir inputmode="decimal" (encontrado: ${tagHtml})`);
  assert(tagHtml.includes('autocomplete="off"'), `Input ${idInput} deve possuir autocomplete="off"`);
});

const inputsNumericosObrigatorios = [
  'id="cr-idade"',
  'id="dhe-idade"',
  'id="dhe-hiper-idade"',
  'id="asma-spo2"',
  'id="asma-fr"',
  'id="asma-fc"',
  'id="heart-idade"'
];

inputsNumericosObrigatorios.forEach(idInput => {
  const idx = htmlCockpit.indexOf(idInput);
  assert(idx !== -1, `Input ${idInput} deve existir no HTML`);
  const tagStart = htmlCockpit.lastIndexOf('<input', idx);
  const tagEnd = htmlCockpit.indexOf('>', idx);
  const tagHtml = htmlCockpit.substring(tagStart, tagEnd + 1);
  assert(tagHtml.includes('inputmode="numeric"'), `Input ${idInput} deve possuir inputmode="numeric" (encontrado: ${tagHtml})`);
  assert(tagHtml.includes('autocomplete="off"'), `Input ${idInput} deve possuir autocomplete="off"`);
});

console.log('  ✓ 100% dos inputs numéricos configurados com teclado numérico direto (sem necessidade de alternar ?123).');

// [6] Validação da Função de Transição de Foco (configurarTecladosCalculadoras)
console.log('\n[6] Validando navegação suave de foco em teclados móveis...');
assert(htmlCockpit.includes('function configurarTecladosCalculadoras()'), 'Deve conter configurarTecladosCalculadoras');
assert(htmlCockpit.includes("campo.dataset.tecladoConfigurado = 'true'"), 'Deve evitar listeners duplicados com flag de controle');
console.log('  ✓ Transição de foco no Enter/Next das calculadoras validada.');

// [7] Validação de Escopo do Lucide Icons (Renderização Otimizada)
console.log('\n[7] Validando escopo restrito do Lucide Icons para evitar reflow global do DOM...');
assert(htmlCockpit.includes('lucide.createIcons({ root: container })'), 'renderizarCatalogoAulas deve limitar varredura ao container');
assert(htmlCockpit.includes('lucide.createIcons({ root: refeicoesContainer })'), 'renderizarPlanoNutricional deve limitar varredura ao container');
console.log('  ✓ Escopo de ícones restrito aos elementos filhos locais, poupando CPU.');

console.log('\n🎉 SUCESSO TOTAL: Todas as validações de carga, lazy loading e ergonomia do Cockpit foram aprovadas com 100% de sucesso!');
