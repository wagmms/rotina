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
const telegramHandlersContent = fs.readFileSync(path.join(rootDir, 'src/07a_telegram_router.js'), 'utf8');
assert.strictEqual(telegramHandlersContent.includes('/pc tenda'), false, 'Comando /pc tenda deve ter sido removido');

// 2. Verificação de Expurgo no README.md
const readmeContent = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8');
assert.strictEqual(readmeContent.includes('Radar de Voos'), false, 'README.md não deve conter módulo de Radar de Voos');
assert.strictEqual(readmeContent.includes('radar_voos/'), false, 'README.md não deve conter referências a radar_voos/');

// 3. Ginecologia e Obstetrícia (Internato Ativo até 29/11)
const PrenatalService = require('../src/02_obstetricia_prenatal.js');
const resDpp = PrenatalService.calcularDppNaegele('2024-01-01');
assert.ok(resDpp, 'Deve calcular DPP pela regra de Naegele');
const CentroObstetrico = require('../src/02_centro_obstetrico.js');
const resParto = CentroObstetrico.avaliarTrabalhoParto({
  dilatacaoCm: 6,
  contracoes10min: 3,
  duracaoContracaoSeg: 40,
  planoDeLee: 0
});
assert.ok(resParto.faseDescricao.includes('Fase Ativa'), 'Deve diagnosticar Fase Ativa de Trabalho de Parto');
assert.strictEqual(resParto.insinuado, true, 'Plano 0 de De Lee deve ser considerado insinuado');
assert.ok(resParto.bishop.pontos >= 6, 'Índice de Bishop deve ser favorável');

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

// 9. Validação dos Banners de Módulo de Referência Avançada (Fase 1)
const BANNER_ESPECIALISTA = 'MÓDULO DE REFERÊNCIA AVANÇADA';

const ClimaterioModule = require('../src/02_climaterio_thm.js');
const txtThm = ClimaterioModule.ClimaterioThmService.gerarResumoThm({ idade: 52, fogachosIntensos: true });
assert.ok(txtThm.includes(BANNER_ESPECIALISTA), 'Climatério deve conter banner de referência avançada');

const SopModule = require('../src/02_sop_ovarios_policisticos.js');
const txtSop = SopModule.SopOvariosPolicisticosService.gerarResumoSop({ oligoAnovulacao: true, hiperandrogenismoClinico: true });
assert.ok(txtSop.includes(BANNER_ESPECIALISTA), 'SOP deve conter banner de referência avançada');

const DipModule = require('../src/02_dip_abscesso_tubo_ovariano.js');
const resDip = DipModule.DipAbscessoTuboOvarianoService.avaliarDipCompleto({ dorPalpacaoUterina: true, febreAferida: true });
const txtDip = DipModule.DipAbscessoTuboOvarianoService.gerarResumoDip(resDip);
assert.ok(txtDip.includes(BANNER_ESPECIALISTA), 'DIP deve conter banner de referência avançada');

const CentroObsService = require('../src/02_centro_obstetrico.js');
const resCo = CentroObsService.gerarResumoCentroObstetrico({ parto: { dilatacaoCm: 6, contrações10min: 3, duracaoContracaoSeg: 40 } });
assert.ok(resCo.textoFormatado.includes(BANNER_ESPECIALISTA), 'Centro Obstétrico deve conter banner de referência avançada');

const RcfService = require('../src/02_obstetricia_rcf_doppler.js');
const resRcf = RcfService.avaliarRcf({ ig_semanas: 32, peso_fetal_percentil: 2 });
const txtRcf = RcfService.formatarTextoTelegram(resRcf);
assert.ok(txtRcf.includes(BANNER_ESPECIALISTA), 'RCF Doppler deve conter banner de referência avançada');

const resSafBanner = SafService.avaliarSaf({ peso: 65, idadeGestacionalSemanas: 10, abortosPrecoces: 3, lacPositivo: true });
const txtSafBanner = SafService.formatarTextoTelegram(resSafBanner);
assert.ok(txtSafBanner.includes(BANNER_ESPECIALISTA), 'SAF deve conter banner de referência avançada');

const TevModule = require('../src/02_tev_gestante.js');
const resTev = TevModule.TevGestanteService.avaliarTevCompleto({ periodo: 'antenatal', tevPrevio: true });
assert.ok(resTev.banner && resTev.banner.includes(BANNER_ESPECIALISTA), 'TEV Gestante deve conter banner de referência avançada');

// 10. Validação dos Hubs Interativos com Botões Inline (Fase 1)
const runtime = require('../server/runtime.js');
const ctx = runtime.ctx;

assert.strictEqual(typeof ctx.construirTecladoHubEnfermaria, 'function', 'construirTecladoHubEnfermaria deve existir');
assert.strictEqual(typeof ctx.construirTecladoHubRotina, 'function', 'construirTecladoHubRotina deve existir');
assert.strictEqual(typeof ctx.construirTecladoHubDiabetes, 'function', 'construirTecladoHubDiabetes deve existir');
assert.strictEqual(typeof ctx.construirTecladoHubAnemia, 'function', 'construirTecladoHubAnemia deve existir');

const kbEnf = ctx.construirTecladoHubEnfermaria();
assert.strictEqual(kbEnf.inline_keyboard.flat().length, 7, 'Hub Enfermaria deve ter 7 botões interativos');

const kbRot = ctx.construirTecladoHubRotina();
assert.strictEqual(kbRot.inline_keyboard.flat().length, 7, 'Hub Rotina deve ter 7 botões interativos');

const kbDm = ctx.construirTecladoHubDiabetes();
assert.strictEqual(kbDm.inline_keyboard.flat().length, 4, 'Hub Diabetes deve ter 4 botões interativos');

const kbAne = ctx.construirTecladoHubAnemia();
assert.strictEqual(kbAne.inline_keyboard.flat().length, 2, 'Hub Anemia deve ter 2 botões interativos');

const chatIdTitular = (ctx.ConfigService && ctx.ConfigService.getPrimary)
  ? ctx.ConfigService.getPrimary("TELEGRAM_CHAT_ID")
  : (ctx.ConfigService ? String(ctx.ConfigService.get("TELEGRAM_CHAT_ID") || "123").split(",")[0].trim() : "123");

let msgEnviadasF1 = [];
ctx.enviarMensagemComTecladoParaChat = (id, texto, kb) => {
  msgEnviadasF1.push({ texto, kb });
  return true;
};
ctx.enviarMensagemParaChat = (id, texto) => {
  msgEnviadasF1.push({ texto });
  return true;
};

msgEnviadasF1 = [];
ctx.processarMensagemTexto({ chat: { id: chatIdTitular }, text: '/enfermaria' });
assert.ok(msgEnviadasF1.length > 0 && msgEnviadasF1[0].kb, '/enfermaria deve retornar teclado inline');
assert.strictEqual(msgEnviadasF1[0].kb.inline_keyboard.flat().length, 7);

msgEnviadasF1 = [];
ctx.processarMensagemTexto({ chat: { id: chatIdTitular }, text: '/rotina' });
assert.ok(msgEnviadasF1.length > 0 && msgEnviadasF1[0].kb, '/rotina deve retornar teclado inline');
assert.strictEqual(msgEnviadasF1[0].kb.inline_keyboard.flat().length, 7);

msgEnviadasF1 = [];
ctx.processarMensagemTexto({ chat: { id: chatIdTitular }, text: '/diabetes' });
assert.ok(msgEnviadasF1.length > 0 && msgEnviadasF1[0].kb, '/diabetes deve retornar teclado inline');
assert.strictEqual(msgEnviadasF1[0].kb.inline_keyboard.flat().length, 4);

msgEnviadasF1 = [];
ctx.processarMensagemTexto({ chat: { id: chatIdTitular }, text: '/anemia' });
assert.ok(msgEnviadasF1.length > 0 && msgEnviadasF1[0].kb, '/anemia deve retornar teclado inline');
assert.strictEqual(msgEnviadasF1[0].kb.inline_keyboard.flat().length, 2);

// Validação dos aliases antigos continuando ativos
msgEnviadasF1 = [];
ctx.processarMensagemTexto({ chat: { id: chatIdTitular }, text: '/alta' });
assert.ok(msgEnviadasF1.length > 0, '/alta deve responder como alias');

msgEnviadasF1 = [];
ctx.processarMensagemTexto({ chat: { id: chatIdTitular }, text: '/tasks' });
assert.ok(msgEnviadasF1.length > 0, '/tasks deve responder como alias');

console.log('🎉 TODOS OS TESTES DE SIMPLIFICAÇÃO, EXPURGO E CONDUTA BEIRA-LEITO PASSARAM COM 100% DE SUCESSO!');
