/**
 * ==============================================================================
 * Testes Unitários de Simplificação, Expurgo e Conduta Beira-Leito (Médico Generalista)
 * ==============================================================================
 * Valida a conclusão rigorosa da Tarefa 0E:
 * 1. Expurgo de comandos não médicos (/pc tenda) e referências a voos no README
 * 2. Linguagem beira-leito pragmática e critérios de encaminhamento nos módulos especializados
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// 1. Verificação de Expurgo de Comandos Não Médicos
const telegramHandlersContent = fs.readFileSync(path.join(rootDir, 'src/07_telegram_handlers.js'), 'utf8');
assert.strictEqual(telegramHandlersContent.includes('/pc tenda'), false, 'Comando /pc tenda deve ter sido removido');

// 2. Verificação de Expurgo no README.md
const readmeContent = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8');
assert.strictEqual(readmeContent.includes('Radar de Voos'), false, 'README.md não deve conter módulo de Radar de Voos');
assert.strictEqual(readmeContent.includes('radar_voos/'), false, 'README.md não deve conter referências a radar_voos/');

// 3. Endocrinologia Hiperprolactinemia
const EndoHiper = require('../src/02_endocrinologia_hiperprolactinemia.js');
const resEndo = EndoHiper.avaliarHiperprolactinemia({
  prolactina: 80,
  adenomaTamanho: 12,
  alteracaoVisual: true
});
assert.ok(resEndo.resultado.condutaBeiraLeito.length >= 2, 'Deve conter orientações beira-leito');
assert.ok(resEndo.resultado.criteriosEncaminhamento.length >= 2, 'Deve conter critérios de encaminhamento');
const txtEndo = EndoHiper.processarComandoTelegram('prl 80 tamanho 12 visual');
assert.ok(txtEndo.includes('Conduta Beira-Leito / UBS'), 'Texto deve conter seção beira-leito');
assert.ok(txtEndo.includes('Critérios de Encaminhamento ao Especialista'), 'Texto deve conter critérios de encaminhamento');

// 4. Ginecologia Endometriose
const EndoGin = require('../src/02_ginecologia_endometriose.js');
const resGin = EndoGin.avaliarEndometriose({
  dismenorreia: true,
  evaDor: 9,
  desejoGestacional: false
});
const txtGin = EndoGin.formatarTextoTelegram(resGin);
assert.ok(txtGin.includes('CRITÉRIOS DE ENCAMINHAMENTO CIRÚRGICO / ESPECIALIZADO'), 'Texto deve conter critérios de encaminhamento cirúrgico');
assert.ok(txtGin.includes('CONDUTA BEIRA-LEITO / UBS (MÉDICO GENERALISTA)'), 'Texto deve conter conduta beira-leito UBS');

// 5. Obstetrícia SAF
const SafService = require('../src/02_obstetricia_saf_trombofilias.js');
const resSaf = SafService.avaliarSaf({
  peso: 65,
  idadeGestacionalSemanas: 10,
  abortosPrecoces: 3,
  lacPositivo: true
});
const txtSaf = SafService.formatarTextoTelegram(resSaf);
assert.ok(txtSaf.includes('CONDUTA BEIRA-LEITO / UBS (MÉDICO GENERALISTA)'), 'Texto deve conter conduta beira-leito');
assert.ok(txtSaf.includes('CRITÉRIOS DE ENCAMINHAMENTO AO PRÉ-NATAL DE ALTO RISCO (PNAR)'), 'Texto deve conter encaminhamento ao PNAR');

// 6. Oftalmologia Emergência
const OftalmoService = require('../src/02_oftalmologia_emergencia.js');
const resGlaucoma = OftalmoService.avaliar({
  tipoEmergencia: 'GLAUCOMA_AGUDO_ANGULO_FECHADO',
  pio: 55
});
const txtGlaucoma = OftalmoService.formatarTextoTelegram(resGlaucoma);
assert.ok(txtGlaucoma.includes('CRITÉRIOS DE ENCAMINHAMENTO URGENTE AO OFTALMOLOGISTA'), 'Texto de glaucoma deve conter encaminhamento');

const resQueimadura = OftalmoService.avaliar({
  tipoEmergencia: 'QUEIMADURA_QUIMICA',
  substancia: 'soda caustica'
});
const txtQueimadura = OftalmoService.formatarTextoTelegram(resQueimadura);
assert.ok(txtQueimadura.includes('CRITÉRIOS DE ENCAMINHAMENTO URGENTE AO OFTALMOLOGISTA'), 'Texto de queimadura deve conter encaminhamento');

// 7. Hepatologia Colestase Gestacional
const ColestaseService = require('../src/02_hepatologia_colestase_gestacional.js');
const resCig = ColestaseService.avaliar({
  acidos_biliares: 110,
  ig_semanas: 34
});
const txtCig = ColestaseService.formatarTextoTelegram(resCig);
assert.ok(txtCig.includes('CRITÉRIOS DE ENCAMINHAMENTO / MATERNIDADE DE ALTO RISCO'), 'Texto de CIG deve conter critérios de encaminhamento');

// 8. Urologia Cólica Nefrética
const ColicaService = require('../src/02_urologia_colica_nefretica.js');
const resColica = ColicaService.avaliar({
  tamanhoCalculo: 6,
  localizacao: 'distal'
});
const txtColica = ColicaService.formatarTextoTelegram(resColica);
assert.ok(txtColica.includes('CONDUTA BEIRA-LEITO / UBS (MÉDICO GENERALISTA)'), 'Texto de cólica deve conter conduta beira-leito');
assert.ok(txtColica.includes('CRITÉRIOS DE ENCAMINHAMENTO À UROLOGIA'), 'Texto de cólica deve conter encaminhamento à urologia');

console.log('🎉 TODOS OS TESTES DE SIMPLIFICAÇÃO, EXPURGO E CONDUTA BEIRA-LEITO PASSARAM COM 100% DE SUCESSO!');
