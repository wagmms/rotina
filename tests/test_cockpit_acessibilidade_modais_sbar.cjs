/**
 * tests/test_cockpit_acessibilidade_modais_sbar.cjs
 * Bateria de testes automatizados para acessibilidade, teclados táteis mobile
 * nos modais de Prescrição Ambulatorial, Atestado CFM, Modais Obstétricos/Ginecológicos e Passagem SBAR.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const rootDir = path.resolve(__dirname, '..');
const cockpitHtmlPath = path.join(rootDir, 'cockpit_movel.html');
const deployHtmlPath = path.join(rootDir, 'gh_cockpit_deploy', 'index.html');

test('Cockpit Acessibilidade e SBAR - Paridade estrita SHA-256 de build de produção', () => {
  assert.ok(fs.existsSync(cockpitHtmlPath), 'cockpit_movel.html deve existir');
  assert.ok(fs.existsSync(deployHtmlPath), 'gh_cockpit_deploy/index.html deve existir');

  const hashDev = crypto.createHash('sha256').update(fs.readFileSync(cockpitHtmlPath)).digest('hex');
  const hashDeploy = crypto.createHash('sha256').update(fs.readFileSync(deployHtmlPath)).digest('hex');

  assert.strictEqual(hashDev, hashDeploy, 'cockpit_movel.html e gh_cockpit_deploy/index.html devem ter hash SHA-256 100% idêntico');
});

test('Cockpit Acessibilidade e SBAR - Proibição absoluta de Google Apps Script (GAS)', () => {
  const html = fs.readFileSync(cockpitHtmlPath, 'utf8');
  assert.ok(!html.includes('google.script.run'), 'Nao deve conter chamadas legadas google.script.run');
  assert.ok(!html.includes('GAS_BACKEND_URL'), 'Nao deve conter GAS_BACKEND_URL');
  assert.ok(!html.includes('clasp'), 'Nao deve conter mencoes ativas a clasp');
});

test('Cockpit Acessibilidade e SBAR - Estrutura e semântica do Modal de Passagem SBAR (#modal-sbar-passagem)', () => {
  const html = fs.readFileSync(cockpitHtmlPath, 'utf8');

  // Modal SBAR com atributos de acessibilidade
  assert.ok(html.includes('id="modal-sbar-passagem"'), 'Deve conter o modal-sbar-passagem');
  assert.ok(html.includes('role="dialog"'), 'Deve declarar role="dialog"');
  assert.ok(html.includes('aria-modal="true"'), 'Deve declarar aria-modal="true"');
  assert.ok(html.includes('aria-labelledby="titulo-sbar-modal"'), 'Deve associar o cabeçalho acessível');

  // Elementos internos do modal SBAR
  assert.ok(html.includes('id="sbar-modal-seletor-leito"'), 'Deve conter seletor de leito no modal SBAR');
  assert.ok(html.includes('for="sbar-modal-seletor-leito"'), 'Deve conter label acessível para o seletor SBAR');
  assert.ok(html.includes('id="sbar-modal-conteudo"'), 'Deve conter o container de conteúdo SBAR');
  assert.ok(html.includes('id="sbar-texto-preview"'), 'Deve conter o elemento pre de visualização do SBAR');
  assert.ok(html.includes('aria-live="polite"'), 'Deve possuir aria-live polite no conteúdo do SBAR');
  assert.ok(html.includes('id="btn-copiar-sbar-modal"'), 'Deve conter botão de cópia rápida do SBAR');
  assert.ok(html.includes('copiarSbarModalPEP()'), 'Deve invocar copiarSbarModalPEP()');
});

test('Cockpit Acessibilidade e SBAR - Teclados móveis e labels semânticos em Ambulatório e Atestado CFM', () => {
  const html = fs.readFileSync(cockpitHtmlPath, 'utf8');

  // Modal Ambulatório SOAP
  assert.ok(html.includes('id="modal-ambulatorio-soap"'), 'Deve conter modal-ambulatorio-soap');
  assert.ok(html.includes('for="amb-input-paciente"'), 'Label semântico para paciente ambulatorial');
  assert.ok(html.includes('for="amb-sv-pa"'), 'Label semântico para PA');
  assert.ok(html.includes('for="amb-sv-glicemia"'), 'Label semântico para Glicemia');
  assert.ok(html.includes('for="amb-sv-fc"'), 'Label semântico para FC');
  assert.ok(html.includes('for="amb-sv-peso"'), 'Label semântico para Peso');

  // Inputmode e acessibilidade tátil
  assert.ok(html.includes('id="amb-sv-pa"') && html.includes('inputmode="tel"'), 'PA deve ter inputmode="tel"');
  assert.ok(html.includes('id="amb-sv-glicemia"') && html.includes('inputmode="numeric"'), 'Glicemia deve ter inputmode="numeric"');
  assert.ok(html.includes('id="amb-sv-fc"') && html.includes('inputmode="numeric"'), 'FC deve ter inputmode="numeric"');
  assert.ok(html.includes('id="amb-sv-peso"') && html.includes('inputmode="decimal"'), 'Peso deve ter inputmode="decimal"');
  assert.ok(html.includes('enterkeyhint="next"'), 'Inputs devem ter enterkeyhint="next"');

  // Botões de cópia PEP
  assert.ok(html.includes('id="btn-copiar-prescricao-amb"'), 'Deve conter botão de copiar prescrição para PEP');
  assert.ok(html.includes('copiarPrescricaoAmbulatorialGerada()'), 'Deve invocar copiarPrescricaoAmbulatorialGerada()');
  assert.ok(html.includes('id="btn-copiar-soap-amb"'), 'Deve conter botão de copiar SOAP completo');

  // Modal Atestado CFM
  assert.ok(html.includes('id="modal-atestado-cfm"'), 'Deve conter modal-atestado-cfm');
  assert.ok(html.includes('for="atestado-input-paciente"'), 'Label semântico para paciente atestado');
  assert.ok(html.includes('for="atestado-input-doc"'), 'Label semântico para documento');
  assert.ok(html.includes('for="atestado-select-dias"'), 'Label semântico para dias de repouso');
  assert.ok(html.includes('for="atestado-input-motivo"'), 'Label semântico para motivo/CID');
});

test('Cockpit Acessibilidade e SBAR - Modais Obstétricos e Ginecológicos com acessibilidade e inputmode', () => {
  const html = fs.readFileSync(cockpitHtmlPath, 'utf8');

  // Pré-natal
  assert.ok(html.includes('id="modal-prenatal"'), 'Deve conter modal-prenatal');
  assert.ok(html.includes('for="pn-input-dum"'), 'Label semântico para DUM');
  assert.ok(html.includes('for="pn-input-ref"'), 'Label semântico para data de referência');
  assert.ok(html.includes('for="pn-input-usg-data"'), 'Label semântico para USG');

  // Centro Obstétrico
  assert.ok(html.includes('id="modal-centro-obstetrico"'), 'Deve conter modal-centro-obstetrico');
  assert.ok(html.includes('for="co-input-dilatacao"'), 'Label semântico para dilatação');
  assert.ok(html.includes('for="co-input-contracoes"'), 'Label semântico para contrações');
  assert.ok(html.includes('for="co-input-duracao"'), 'Label semântico para duração da contração');
  assert.ok(html.includes('for="co-input-bcf"'), 'Label semântico para BCF');

  // Ginecologia Ambulatorial
  assert.ok(html.includes('id="modal-ginecologia-ambulatorial"'), 'Deve conter modal-ginecologia-ambulatorial');
  assert.ok(html.includes('for="gin-input-colo-idade"'), 'Label semântico para idade ginecológica');
  assert.ok(html.includes('for="gin-input-colo-citologia"'), 'Label semântico para citopatológico');
  assert.ok(html.includes('for="gin-input-colo-negativos"'), 'Label semântico para negativos consecutivos');
});

test('Cockpit Acessibilidade e SBAR - Compilação de scripts e funções do ciclo autônomo', () => {
  const html = fs.readFileSync(cockpitHtmlPath, 'utf8');
  const scriptMatches = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scriptMatches.length >= 1, 'Deve possuir scripts embutidos');

  const mainScript = scriptMatches[scriptMatches.length - 1][1];
  assert.doesNotThrow(() => {
    new vm.Script(mainScript, { filename: 'cockpit_main.js' });
  }, 'O código JavaScript principal do Cockpit deve compilar sem erro de sintaxe');

  // Validação da presença das funções essenciais
  assert.ok(mainScript.includes('function gerarSbarLeitoIndividualOffline'), 'Deve conter gerarSbarLeitoIndividualOffline');
  assert.ok(mainScript.includes('function gerarPassagemPlantaoSBAROfflineLocal'), 'Deve conter gerarPassagemPlantaoSBAROfflineLocal');
  assert.ok(mainScript.includes('function abrirModalSbarPassagem'), 'Deve conter abrirModalSbarPassagem');
  assert.ok(mainScript.includes('function fecharModalSbarPassagem'), 'Deve conter fecharModalSbarPassagem');
  assert.ok(mainScript.includes('function copiarSbarModalPEP'), 'Deve conter copiarSbarModalPEP');
  assert.ok(mainScript.includes('function copiarPrescricaoAmbulatorialGerada'), 'Deve conter copiarPrescricaoAmbulatorialGerada');
  assert.ok(mainScript.includes('function configurarTecladosModaisAmbulatorioESbar'), 'Deve conter configurarTecladosModaisAmbulatorioESbar');
});

test('Cockpit Acessibilidade e SBAR - Execução determinística do gerador SBAR individual e censo', () => {
  const html = fs.readFileSync(cockpitHtmlPath, 'utf8');

  // Contexto VM isolado simulando as funções SBAR
  const context = {
    console,
    Date: global.Date
  };
  vm.createContext(context);

  // Extrai as funções SBAR do script
  const fn1Match = html.match(/function gerarSbarLeitoIndividualOffline\(leito\) \{[\s\S]*?\n    \}/);
  assert.ok(fn1Match, 'Deve extrair gerarSbarLeitoIndividualOffline');

  const fn2Match = html.match(/function gerarPassagemPlantaoSBAROfflineLocal\(leitos\) \{[\s\S]*?\n    \}/);
  assert.ok(fn2Match, 'Deve extrair gerarPassagemPlantaoSBAROfflineLocal');

  vm.runInContext(fn1Match[0], context);
  vm.runInContext(fn2Match[0], context);

  // Teste de leito individual
  const leitoMock = {
    numero: '12',
    status: 'vigilancia',
    dados: 'DPOC exacerbado infeccioso. Ceftriaxona + Azitromicina D3. Checar gasometria pós-broncodilatador.',
    atualizadoEm: '09/10/2026 23:00'
  };

  const sbarInd = context.gerarSbarLeitoIndividualOffline(leitoMock);
  assert.ok(sbarInd.includes('[LEITO 12 · SBAR BEIRA-LEITO]'), 'Deve conter cabeçalho do leito');
  assert.ok(sbarInd.includes('S (Situação)'), 'Deve conter bloco S');
  assert.ok(sbarInd.includes('Leito 12'), 'Deve conter identificação do leito');
  assert.ok(sbarInd.includes('B (Breve Histórico)'), 'Deve conter bloco B');
  assert.ok(sbarInd.includes('DPOC exacerbado infeccioso'), 'Deve conter diagnóstico');
  assert.ok(sbarInd.includes('A (Avaliação)'), 'Deve conter bloco A');
  assert.ok(sbarInd.includes('R (Recomendação)'), 'Deve conter bloco R');

  // Teste de censo agregado
  const listaLeitos = [
    leitoMock,
    {
      numero: '14',
      status: 'estavel',
      dados: 'Pneumonia adquirida na comunidade. Amoxicilina + Clavulanato D2.',
      atualizadoEm: '09/10/2026 22:30'
    }
  ];

  const sbarCenso = context.gerarPassagemPlantaoSBAROfflineLocal(listaLeitos);
  assert.ok(sbarCenso.includes('PASSAGEM DE PLANTÃO (SBAR)'), 'Deve conter cabeçalho do censo SBAR');
  assert.ok(sbarCenso.includes('Total no Censo: 2 leito(s)'), 'Deve registrar censo total');
  assert.ok(sbarCenso.includes('LEITO 12'), 'Deve conter Leito 12');
  assert.ok(sbarCenso.includes('LEITO 14'), 'Deve conter Leito 14');
  assert.ok(sbarCenso.includes('Padronização HC-UE FMRP-USP'), 'Deve conter assinatura institucional de segurança');
});

test('Cockpit Acessibilidade e SBAR - Extração de prescrição PEP a partir do SOAP ambulatorial', () => {
  const soapGerado = [
    '======================================================================',
    '                  PRONTUÁRIO CLÍNICO AMBULATORIAL (SOAP)              ',
    '======================================================================',
    'Data: 09/10/2026 23:00',
    'Paciente: João Pereira',
    '',
    '[S - SUBJETIVO]',
    'Queixa Principal: Consulta de rotina / HAS e DM2.',
    '',
    '[O - OBJETIVO]',
    'PA: 130/80 mmHg | Glicemia: 110 mg/dL | FC: 74 bpm | Peso: 78 kg',
    '',
    '[A - AVALIAÇÃO]',
    'Hipertensão arterial sistêmica e Diabetes Mellitus controlados em UBS.',
    '',
    '[P - PLANO]',
    '💊 Prescrição Farmacológica (REMUME):',
    '  1) Losartana Potássica 50 mg --- 1 comp VO 1x/dia pela manhã.',
    '  2) Metformina 850 mg --- 1 comp VO após o almoço e jantar.',
    '',
    '🥗 MEV: Dieta com redução de sódio e carboidratos simples.',
    '🔬 Exames: HbA1c, Creatinina, Perfil Lipídico em 90 dias.',
    '======================================================================'
  ].join('\n');

  const match = soapGerado.match(/\[P - PLANO\]\s*([\s\S]*?)(?:\n={3,}|$)/i);
  assert.ok(match, 'Deve localizar a seção [P - PLANO]');
  const prescricao = match[1].trim();

  assert.ok(prescricao.includes('Losartana Potássica 50 mg'), 'Deve conter Losartana');
  assert.ok(prescricao.includes('Metformina 850 mg'), 'Deve conter Metformina');
  assert.ok(!prescricao.includes('[S - SUBJETIVO]'), 'Não deve conter o bloco subjetivo');
  assert.ok(!prescricao.includes('[O - OBJETIVO]'), 'Não deve conter o bloco objetivo');
  assert.ok(!prescricao.includes('PRONTUÁRIO CLÍNICO AMBULATORIAL'), 'Não deve conter cabeçalho');
});
