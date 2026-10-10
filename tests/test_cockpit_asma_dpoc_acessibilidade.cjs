/**
 * test_cockpit_asma_dpoc_acessibilidade.cjs
 *
 * Suíte de testes automatizados para auditoria de teclados táteis, acessibilidade,
 * sanitização de entradas e prevenção de NaN nos presets da calculadora de Asma e DPOC
 * no Cockpit PWA e no backend Node.js (Fastify).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const ROOT_DIR = path.resolve(__dirname, '..');
const COCKPIT_PATH = path.join(ROOT_DIR, 'cockpit_movel.html');
const DEPLOY_PATH = path.join(ROOT_DIR, 'gh_cockpit_deploy', 'index.html');
const UTILS_PATH = path.join(ROOT_DIR, 'src', '01_utils.js');
const ASMA_SERVICE_PATH = path.join(ROOT_DIR, 'src', '02_pneumologia_crise_asmatica.js');
const COCKPIT_INT_PATH = path.join(ROOT_DIR, 'src', '13_cockpit_integracao.js');
const VALIDATORS_PATH = path.join(ROOT_DIR, 'server', 'validators.js');

test('Cockpit Asma & DPOC - Paridade estrita SHA-256 de build de produção', () => {
  const hash1 = crypto.createHash('sha256').update(fs.readFileSync(COCKPIT_PATH)).digest('hex');
  const hash2 = crypto.createHash('sha256').update(fs.readFileSync(DEPLOY_PATH)).digest('hex');
  assert.equal(hash1, hash2, 'cockpit_movel.html e gh_cockpit_deploy/index.html devem ter hash SHA-256 idêntico.');
});

test('Cockpit Asma & DPOC - Proibição absoluta de Google Apps Script (GAS)', () => {
  const arquivosAuditoria = [COCKPIT_PATH, ASMA_SERVICE_PATH, COCKPIT_INT_PATH, VALIDATORS_PATH];
  for (const arq of arquivosAuditoria) {
    const conteudo = fs.readFileSync(arq, 'utf-8');
    assert.doesNotMatch(conteudo, /google\.script\.run/i, `Arquivo ${path.basename(arq)} não deve conter referências ativas a google.script.run.`);
    assert.doesNotMatch(conteudo, /clasp/i, `Arquivo ${path.basename(arq)} não deve mencionar clasp.`);
  }
});

test('Cockpit Asma & DPOC - Semântica acessível, labels (for=...) e inputmode nos painéis', () => {
  const html = fs.readFileSync(COCKPIT_PATH, 'utf-8');

  // Subcalc pane
  assert.match(html, /id="calc-asma"[^>]*aria-labelledby="titulo-calc-asma"/, 'calc-asma deve ter aria-labelledby apontando para seu título');
  assert.match(html, /id="titulo-calc-asma"/, 'Título de calc-asma deve possuir id titulo-calc-asma');

  // Labels for
  const camposObrigatorios = [
    'asma-fala',
    'asma-ausculta',
    'asma-spo2',
    'asma-fr',
    'asma-fc',
    'asma-peso',
    'asma-idade',
    'asma-refratario',
    'asma-normocapnia',
    'asma-gestante',
    'asma-dpoc'
  ];

  for (const c of camposObrigatorios) {
    const regexLabel = new RegExp(`for="${c}"`, 'i');
    assert.match(html, regexLabel, `Deve existir um <label for="${c}"> semântico no HTML.`);
  }

  // Inputmode e tipos
  assert.match(html, /id="asma-spo2"[^>]*inputmode="numeric"/, 'Input asma-spo2 deve ter inputmode="numeric"');
  assert.match(html, /id="asma-fr"[^>]*inputmode="numeric"/, 'Input asma-fr deve ter inputmode="numeric"');
  assert.match(html, /id="asma-fc"[^>]*inputmode="numeric"/, 'Input asma-fc deve ter inputmode="numeric"');
  assert.match(html, /id="asma-idade"[^>]*inputmode="numeric"/, 'Input asma-idade deve ter inputmode="numeric"');
  assert.match(html, /id="asma-peso"[^>]*inputmode="decimal"/, 'Input asma-peso deve ter inputmode="decimal"');

  // Área de resultado acessível
  assert.match(html, /id="asma-resultado"[^>]*role="status"/, 'Container asma-resultado deve ter role="status"');
  assert.match(html, /id="asma-resultado"[^>]*aria-live="polite"/, 'Container asma-resultado deve ter aria-live="polite"');

  // Presets táteis de 1 toque (incluindo DPOC)
  assert.match(html, /definirPresetAsma\('frases_completas'/, 'Preset Leve/Moderada deve existir');
  assert.match(html, /definirPresetAsma\('palavras_isoladas', 89/, 'Preset Grave deve existir');
  assert.match(html, /definirPresetAsma\('incapaz', 82/, 'Preset Parada Iminente deve existir');
  assert.match(html, /definirPresetAsma\('palavras_isoladas', 90, 42, 140, 'sibilos_difusos', 15, 4/, 'Preset Pediátrico 15kg deve existir');
  assert.match(html, /definirPresetAsma\('palavras_isoladas', 88, 32, 120, 'sibilos_difusos', 70, 28, true/, 'Preset Refratário 1h deve existir');
  assert.match(html, /definirPresetAsma\('palavras_isoladas', 88, 28, 105, 'sibilos_difusos', 70, 65, false, false, false, true\)/, 'Preset DPOC Exacerbado (GOLD) deve existir');
});

test('Cockpit Asma & DPOC - Validação fisiológica em 0ms (validarEntradaFisiologica) com Aliases', () => {
  const html = fs.readFileSync(COCKPIT_PATH, 'utf-8');

  const matchScript = html.match(/const FAIXAS_FISIO = \{[\s\S]*?\n\s*const pedidosCalc = \{\};/);
  assert.ok(matchScript, 'Função validarEntradaFisiologica e FAIXAS_FISIO devem existir no script');

  const codigoExtraido = matchScript[0].replace(/const pedidosCalc = \{\};$/, '');
  const sandbox = {
    console,
    Math
  };
  vm.createContext(sandbox);
  vm.runInContext(codigoExtraido, sandbox);

  const { validarEntradaFisiologica } = sandbox;
  assert.equal(typeof validarEntradaFisiologica, 'function');

  // 1. SpO2 fora de limites (30 a 100%)
  const errSpo2Baixo = validarEntradaFisiologica('asma', { spo2: 20 });
  assert.match(errSpo2Baixo, /Saturação de Oxigênio.*fora da faixa biológica esperada \(30 a 100\s*%\)/);

  const errSpo2Alto = validarEntradaFisiologica('asma', { spo2: 105 });
  assert.match(errSpo2Alto, /Saturação de Oxigênio.*fora da faixa biológica esperada/);

  // 2. FR fora de limites (4 a 80 irpm)
  const errFrBaixa = validarEntradaFisiologica('asma', { fr: 2 });
  assert.match(errFrBaixa, /Frequência Respiratória.*fora da faixa biológica esperada \(4 a 80 irpm\)/);

  const errFrAlta = validarEntradaFisiologica('asma', { fr: 120 });
  assert.match(errFrAlta, /Frequência Respiratória.*fora da faixa biológica esperada/);

  // 3. FC fora de limites (20 a 300 bpm)
  const errFcBaixa = validarEntradaFisiologica('asma', { fc: 15 });
  assert.match(errFcBaixa, /Frequência Cardíaca.*fora da faixa biológica esperada \(20 a 300 bpm\)/);

  const errFcAlta = validarEntradaFisiologica('asma', { fc: 350 });
  assert.match(errFcAlta, /Frequência Cardíaca.*fora da faixa biológica esperada/);

  // 4. PaCO2 via alias paco2 (10 a 150 mmHg)
  const errPco2Alta = validarEntradaFisiologica('asma', { paco2: 180 });
  assert.match(errPco2Alta, /pCO₂ de 180 mmHg fora da faixa biológica esperada/);

  // 5. Entradas válidas normais passam com null
  const okAsma = validarEntradaFisiologica('asma', {
    spo2: 89,
    fr: 32,
    fc: 120,
    peso: 70,
    idade: 30,
    paco2: 38
  });
  assert.equal(okAsma, null, 'Entrada fisiológica válida deve retornar null (sem erro).');

  // 6. Entradas com vírgula passam sem erro e sem NaN
  const okVirgula = validarEntradaFisiologica('asma', {
    spo2: '92',
    fr: '28',
    peso: '72,5',
    idade: '45'
  });
  assert.equal(okVirgula, null, 'Entrada com vírgula válida não deve ser bloqueada.');
});

test('Cockpit Asma & DPOC - Cálculo determinístico offline com suporte a DPOC (GOLD) e prevenção de NaN', () => {
  const html = fs.readFileSync(COCKPIT_PATH, 'utf-8');

  const matchScript = html.match(/function calcularOfflineLocal\(tipo, entrada\) \{[\s\S]*?\n\s*const valorCalc/);
  assert.ok(matchScript, 'calcularOfflineLocal deve existir no script');

  const sandbox = {
    console,
    Math,
    parseFloat,
    parseInt,
    isNaN,
    Number,
    Boolean,
    String
  };
  vm.createContext(sandbox);
  vm.runInContext(matchScript[0].replace(/const valorCalc$/, ''), sandbox);

  const { calcularOfflineLocal } = sandbox;
  assert.equal(typeof calcularOfflineLocal, 'function');

  // Caso 1: Preset Pediátrico 15 kg - Validação estrita de doses sem NaN
  const resPed = calcularOfflineLocal('asma', {
    fala: 'palavras_isoladas',
    spo2: 90,
    fr: 42,
    fc: 140,
    ausculta: 'sibilos_difusos',
    peso: '15,0',
    idade: 4,
    dpoc: false
  });
  assert.ok(resPed, 'Deve retornar parecer para asma pediátrica');
  assert.doesNotMatch(resPed, /NaN/, 'Parecer não deve conter NaN em nenhuma hipótese.');
  assert.match(resPed, /Prednisolona oral \(3 mg\/mL\): 23 mg \(7\.7 mL\) VO/, 'Deve calcular dose precisa de Prednisolona oral em mg e mL');
  assert.match(resPed, /Salbutamol gotas \(5 mg\/mL\) 11 gotas/, 'Deve calcular gotas de Salbutamol pediátrico sem NaN');

  // Caso 2: Preset Parada Iminente / Tórax Silencioso
  const resIminente = calcularOfflineLocal('asma', {
    fala: 'incapaz',
    spo2: 82,
    fr: 38,
    fc: 135,
    ausculta: 'torax_silencioso',
    peso: 70,
    idade: 35,
    refratario: true,
    normocapnia: true,
    dpoc: false
  });
  assert.match(resIminente, /AMEAÇA À VIDA \/ PARADA IMINENTE/);
  assert.match(resIminente, /TÓRAX SILENCIOSO/);
  assert.match(resIminente, /NORMOCAPNIA \/ HIPERCAPNIA PARADOXAL/);
  assert.match(resIminente, /SULFATO DE MAGNÉSIO 2G IV/);
  assert.match(resIminente, /Ketamina 1\.5 a 2\.0 mg\/kg IV/);
  assert.doesNotMatch(resIminente, /NaN/);

  // Caso 3: Preset DPOC Exacerbado (GOLD)
  const resDpoc = calcularOfflineLocal('asma', {
    fala: 'palavras_isoladas',
    spo2: 88,
    fr: 28,
    fc: 105,
    ausculta: 'sibilos_difusos',
    peso: '70,5',
    idade: 65,
    dpoc: true
  });
  assert.match(resDpoc, /EXACERBAÇÃO AGUDA DE DPOC \(GOLD \/ SBPT\)/);
  assert.match(resDpoc, /Alvo SpO2 88% a 92%/);
  assert.match(resDpoc, /ALERTA DE HIPERÓXIA/);
  assert.match(resDpoc, /Prednisona 40 mg VO em dose única diária pela manhã por EXATAMENTE 5 DIAS/);
  assert.match(resDpoc, /Brometo de Ipratrópio \(SAMA\)/);
  assert.match(resDpoc, /ANTIBIOTICOTERAPIA \(CRITÉRIOS DE ANTHONISEN\)/);
  assert.match(resDpoc, /Amoxicilina \+ Clavulanato 875\/125 mg/);
  assert.match(resDpoc, /VNI \(BiPAP - 1ª Linha\)/);
  assert.doesNotMatch(resDpoc, /NaN/);
});

test('Fastify Validators & PneumologiaCriseAsmaticaService - Resiliência e Contrato Clínico', () => {
  const { validarParametrosCalculadora, LIMITES_FISIOLOGICOS } = require(VALIDATORS_PATH);
  const PneumologiaCriseAsmaticaService = require(ASMA_SERVICE_PATH);

  // 1. LIMITES_FISIOLOGICOS contém fr, spo2, fc
  assert.ok(LIMITES_FISIOLOGICOS.fr, 'LIMITES_FISIOLOGICOS deve conter fr');
  assert.equal(LIMITES_FISIOLOGICOS.fr.min, 4);
  assert.equal(LIMITES_FISIOLOGICOS.fr.max, 80);

  assert.ok(LIMITES_FISIOLOGICOS.spo2, 'LIMITES_FISIOLOGICOS deve conter spo2');
  assert.equal(LIMITES_FISIOLOGICOS.spo2.min, 30);
  assert.equal(LIMITES_FISIOLOGICOS.spo2.max, 100);

  assert.ok(LIMITES_FISIOLOGICOS.fc, 'LIMITES_FISIOLOGICOS deve conter fc');
  assert.equal(LIMITES_FISIOLOGICOS.fc.min, 20);
  assert.equal(LIMITES_FISIOLOGICOS.fc.max, 300);

  // 2. Validação do Fastify rejeita limites aberrantes
  const vErrFr = validarParametrosCalculadora('asma', { fr: 150 });
  assert.equal(vErrFr.valido, false);
  assert.match(vErrFr.erro, /Frequência Respiratória/);

  const vErrSpo2 = validarParametrosCalculadora('asma', { spo2: 25 });
  assert.equal(vErrSpo2.valido, false);
  assert.match(vErrSpo2.erro, /Saturação de Oxigênio/);

  const vErrObjeto = validarParametrosCalculadora('asma', { refratario: { tentou: true } });
  assert.equal(vErrObjeto.valido, false);
  assert.match(vErrObjeto.erro, /não pode ser um objeto aninhado/);

  // 3. Validação do Fastify aceita entrada com vírgula e campos válidos
  const vOk = validarParametrosCalculadora('asma', {
    spo2: '89',
    fr: '32',
    fc: '122',
    peso: '68,5',
    idade: '30',
    dpoc: true
  });
  assert.equal(vOk.valido, true);
  assert.equal(vOk.entradaSanitizada.peso, 68.5);
  assert.equal(vOk.entradaSanitizada.dpoc, true);

  // 4. Teste de PneumologiaCriseAsmaticaService com DPOC
  const avaliacaoDpoc = PneumologiaCriseAsmaticaService.avaliarCriseAsmatica({
    spo2: 88,
    fr: 28,
    fc: 105,
    peso: '70,0',
    idade: 65,
    dpoc: true
  });
  assert.equal(avaliacaoDpoc.gravidade.isDpoc, true);
  assert.equal(avaliacaoDpoc.plano.isDpoc, true);
  assert.equal(avaliacaoDpoc.plano.oxigenoterapia.alvo_spo2, '88% a 92%');
  assert.match(avaliacaoDpoc.plano.corticoide_sistemico.oral, /Prednisona 40 mg VO/);
  assert.ok(avaliacaoDpoc.plano.antibioticoterapia.indicado);
  assert.ok(avaliacaoDpoc.plano.manejo_ventilatorio.vni.indicado);

  const txtTelegram = PneumologiaCriseAsmaticaService.formatarTextoTelegram(avaliacaoDpoc);
  assert.match(txtTelegram, /EXACERBAÇÃO DE DPOC \(GOLD \/ SBPT\)/);
  assert.match(txtTelegram, /CRITÉRIOS DE ANTHONISEN/);
  assert.doesNotMatch(txtTelegram, /NaN/);
});
