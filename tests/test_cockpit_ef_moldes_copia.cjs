/**
 * tests/test_cockpit_ef_moldes_copia.cjs
 * Teste unitário e de integração para os novos recursos de Exame Físico Padrão:
 * 1. Chips de seleção rápida de modelos no Cockpit PWA.
 * 2. Grade de cópia direta em 1 toque de outros moldes de exame físico.
 * 3. Funções JavaScript associadas (copiarOutroModeloEfDireto, selecionarChipModeloEf, atualizarChipsModeloEf_).
 * 4. Paridade SHA-256 entre cockpit_movel.html e gh_cockpit_deploy/index.html.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const rootDir = path.resolve(__dirname, '..');
const cockpitHtmlPath = path.join(rootDir, 'cockpit_movel.html');
const deployHtmlPath = path.join(rootDir, 'gh_cockpit_deploy', 'index.html');

test('Cockpit EF Moldes - Paridade estrita SHA-256 de build de produção', () => {
  const hashDev = crypto.createHash('sha256').update(fs.readFileSync(cockpitHtmlPath)).digest('hex');
  const hashDeploy = crypto.createHash('sha256').update(fs.readFileSync(deployHtmlPath)).digest('hex');
  assert.strictEqual(hashDev, hashDeploy, 'cockpit_movel.html e gh_cockpit_deploy/index.html devem ter hash SHA-256 idêntico');
});

test('Cockpit EF Moldes - Estrutura visual de chips rápidos e grade de cópia direta', () => {
  const html = fs.readFileSync(cockpitHtmlPath, 'utf8');

  // Chips de alternância rápida
  assert.ok(html.includes('id="ef-chips-moldes"'), 'Deve conter container #ef-chips-moldes');
  const chavesEsperadas = [
    'padrao_completo',
    'pediatrico',
    'geriatrico',
    'obstetrico',
    'cardiovascular',
    'respiratorio',
    'abdome',
    'neurologico',
    'vascular',
    'ortopedico',
    'saude_mental'
  ];

  for (const chave of chavesEsperadas) {
    assert.ok(
      html.includes(`data-ef-key="${chave}"`),
      `Deve conter chip com data-ef-key="${chave}"`
    );
    assert.ok(
      html.includes(`copiarOutroModeloEfDireto('${chave}', this)`),
      `Deve conter botão de cópia direta para ${chave}`
    );
  }

  // Título da seção de cópia direta
  assert.ok(
    html.includes('Copiar Outros Moldes Direto (1 Toque)'),
    'Deve conter o título da seção de cópia direta de outros moldes'
  );
});

test('Cockpit EF Moldes - Definição das funções JavaScript de alternância e cópia', () => {
  const html = fs.readFileSync(cockpitHtmlPath, 'utf8');

  assert.ok(
    html.includes('function atualizarChipsModeloEf_('),
    'Deve definir atualizarChipsModeloEf_'
  );
  assert.ok(
    html.includes('function selecionarChipModeloEf('),
    'Deve definir selecionarChipModeloEf'
  );
  assert.ok(
    html.includes('function copiarOutroModeloEfDireto('),
    'Deve definir copiarOutroModeloEfDireto'
  );
});
