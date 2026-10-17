/**
 * ==============================================================================
 * SUÍTE DE TESTES: EXPANSÃO CLÍNICA DE G&O (PADRÃO-OURO ARGON / FEBRASGO / MS)
 * ==============================================================================
 * Valida determinística e matematicamente os novos módulos clínicos de emergência:
 *  1. Cardiotocografia Intraparto (NICHD / FIGO - Categorias I, II, III e DIPs)
 *  2. Distócia de Ombros (Algoritmo HELPERR / ALERTA cronometrado e travas críticas)
 *  3. Sangramento de 1ª Metade da Gestação (Abortamento, Ectópica/MTX, Mola e Anti-D)
 *  4. Atendimento Integral à Vítima de Violência Sexual (Kit 5 Profilaxias + PEP HIV)
 *  5. Urgências de Mama e Vulva (Mastite Puerperal e Abscesso de Bartholin)
 *  6. Integração e Roteamento Determinístico no Telegram Router (/ctg, /distocia, etc.)
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');
const CentroObstetricoService = require('../src/02_centro_obstetrico.js');
const GinecologiaAmbulatorialService = require('../src/02_ginecologia_ambulatorial.js');
const runtime = require('../server/runtime.js');
const ctx = runtime.ctx;

console.log('🩺🤰 Iniciando suíte de testes da Expansão Clínica de GO (Padrão Argon / FEBRASGO)...\n');

let totalTestes = 0;
let aprovados = 0;

function test(descricao, fn) {
  totalTestes++;
  try {
    fn();
    aprovados++;
    console.log(`  ✓ [TESTE ${totalTestes}] ${descricao}`);
  } catch (err) {
    console.error(`  ✗ [TESTE ${totalTestes}] FALHA: ${descricao}`);
    console.error('    Erro:', err.message);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CARDIOTOCOGRAFIA INTRAPARTO (NICHD / ACOG / FIGO)
// ─────────────────────────────────────────────────────────────────────────────

test('CTG: Categoria I (Traçado Fisiológico com BCF basal normal e sem desacelerações patológicas)', () => {
  const res = CentroObstetricoService.avaliarCardiotocografiaIntraparto({
    bcfBasal: 135,
    variabilidade: 'moderada',
    aceleracoesPresentes: true,
    desaceleracoes: 'nenhuma'
  });
  assert.strictEqual(res.categoria, 'CATEGORIA_I');
  assert.ok(res.titulo.includes('CATEGORIA I'));
  assert.ok(res.fisiopatologia.includes('Equilíbrio ácido-básico fetal preservado'));
});

test('CTG: DIP I (Desaceleração Precoce — fisiológica por compressão cefálica)', () => {
  const res = CentroObstetricoService.avaliarCardiotocografiaIntraparto({
    bcfBasal: 140,
    variabilidade: 'moderada',
    desaceleracoes: 'dip1_precoce'
  });
  assert.strictEqual(res.categoria, 'CATEGORIA_I');
  assert.ok(res.fisiopatologia.includes('DIP I') || res.fisiopatologia.includes('compressão do polo cefálico'));
});

test('CTG: Categoria II (DIP II Tardio recorrente — Insuficiência Uteroplacentária)', () => {
  const res = CentroObstetricoService.avaliarCardiotocografiaIntraparto({
    bcfBasal: 130,
    variabilidade: 'minima',
    desaceleracoes: 'dip2_tardia'
  });
  assert.strictEqual(res.categoria, 'CATEGORIA_II');
  assert.ok(res.titulo.includes('CATEGORIA II'));
  assert.ok(res.fisiopatologia.includes('INSUFICIÊNCIA UTEROPLACENTÁRIA') || res.fisiopatologia.includes('DIP II'));
  assert.ok(res.condutas.some(c => c.includes('Decúbito Lateral Esquerdo')));
  assert.ok(res.condutas.some(c => c.includes('Ocitocina')));
});

test('CTG: Categoria II (DIP III Variável — Compressão de Cordão Umbilical)', () => {
  const res = CentroObstetricoService.avaliarCardiotocografiaIntraparto({
    bcfBasal: 145,
    variabilidade: 'moderada',
    desaceleracoes: 'dip3_variavel_simples'
  });
  assert.strictEqual(res.categoria, 'CATEGORIA_II');
  assert.ok(res.fisiopatologia.includes('COMPRESSÃO DE CORDÃO UMBILICAL') || res.fisiopatologia.includes('DIP III'));
});

test('CTG: Categoria III (Traçado Patológico por Bradicardia Severa e Variabilidade Ausente)', () => {
  const res = CentroObstetricoService.avaliarCardiotocografiaIntraparto({
    bcfBasal: 90,
    variabilidade: 'ausente',
    desaceleracoes: 'dip2_tardia'
  });
  assert.strictEqual(res.categoria, 'CATEGORIA_III');
  assert.ok(res.titulo.includes('CATEGORIA III'));
  assert.ok(res.condutas.some(c => c.includes('SUSPENDER IMEDIATAMENTE OCITOCINA')));
  assert.ok(res.condutas.some(c => c.includes('CESARIANA DE EMERGÊNCIA') || c.includes('parto instrumental')));
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. DISTÓCIA DE OMBROS (ALGORITMO HELPERR / ALERTA)
// ─────────────────────────────────────────────────────────────────────────────

test('Distócia de Ombros: algoritmo HELPERR com travas críticas contra Kristeller e tração', () => {
  const res = CentroObstetricoService.manejarDistociaDeOmbros();
  assert.ok(res.protocolo.includes('Distócia de Ombros'));
  assert.ok(res.diagnostico.includes('Sinal da Tartaruga'));

  // Travas de segurança
  assert.ok(res.travasSegurancaCriticas.some(t => t.includes('KRISTELLER')));
  assert.ok(res.travasSegurancaCriticas.some(t => t.includes('TRACIONAR')));

  // Manobras na ordem
  assert.strictEqual(res.sequenciaManobras.length, 6);
  assert.ok(res.sequenciaManobras[0].mnemonico.includes('Help'));
  assert.ok(res.sequenciaManobras[1].mnemonico.includes('McRoberts') && res.sequenciaManobras[1].acao.includes('RUBIN I'));
  assert.ok(res.sequenciaManobras[2].mnemonico.includes('Enter') && res.sequenciaManobras[2].acao.includes('WOODS'));
  assert.ok(res.sequenciaManobras[3].mnemonico.includes('Jacquemier'));
  assert.ok(res.sequenciaManobras[4].mnemonico.includes('Gaskin'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. SANGRAMENTO DA 1ª METADE DA GESTAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

test('Sangramento 1ª Metade: Ameaça de abortamento orienta repouso e analgesia', () => {
  const res = CentroObstetricoService.avaliarSangramentoPrimeiraMetade({
    quadroClinico: 'ameaca_aborto',
    orificioInternoColo: 'fechado',
    pas: 120,
    fc: 78
  });
  assert.ok(res.diagnostico.includes('AMEAÇA DE ABORTAMENTO'));
  assert.strictEqual(res.hemodinamicaEstavel, true);
  assert.ok(res.condutas.some(c => c.includes('Repouso relativo')));
});

test('Sangramento 1ª Metade: Abortamento Incompleto com colo aberto indica AMIU/curetagem', () => {
  const res = CentroObstetricoService.avaliarSangramentoPrimeiraMetade({
    orificioInternoColo: 'aberto',
    quadroClinico: 'aborto_incompleto'
  });
  assert.ok(res.diagnostico.includes('ABORTAMENTO INCOMPLETO'));
  assert.ok(res.condutas.some(c => c.includes('AMIU') || c.includes('Curetagem')));
});

test('Sangramento 1ª Metade: Ectópica íntegra elegível para Metotrexato com protocolo D1/D4/D7', () => {
  const res = CentroObstetricoService.avaliarSangramentoPrimeiraMetade({
    quadroClinico: 'ectopica',
    betaHcgQuantitativo: 2200,
    massaAnexialCm: 2.8,
    bcfEmbriaoAnexial: false,
    liquidoLivreAlemDaPelve: false,
    pas: 110,
    fc: 80,
    fatorRh: 'negativo'
  });
  assert.ok(res.diagnostico.includes('METOTREXATO'));
  assert.ok(res.prescricoes.some(p => p.includes('Metotrexato 50 mg/m²')));
  assert.ok(res.condutas.some(c => c.includes('D1')) && res.condutas.some(c => c.includes('D4')) && res.condutas.some(c => c.includes('D7')));
  assert.ok(res.profilaxiaAntiD && res.profilaxiaAntiD.includes('Anti-D 300 mcg'));
});

test('Sangramento 1ª Metade: Ectópica Rota com instabilidade indica cirurgia imediata', () => {
  const res = CentroObstetricoService.avaliarSangramentoPrimeiraMetade({
    quadroClinico: 'ectopica',
    pas: 80,
    fc: 125,
    liquidoLivreAlemDaPelve: true
  });
  assert.ok(res.diagnostico.includes('GRAVIDEZ ECTÓPICA ROTA'));
  assert.strictEqual(res.hemodinamicaEstavel, false);
  assert.ok(res.condutas.some(c => c.includes('LAPAROTOMIA') || c.includes('Salpingectomia')));
});

test('Sangramento 1ª Metade: Mola Hidatiforme bloqueia misoprostol pré-esvaziamento', () => {
  const res = CentroObstetricoService.avaliarSangramentoPrimeiraMetade({
    quadroClinico: 'mola'
  });
  assert.ok(res.diagnostico.includes('Mola Hidatiforme'));
  assert.ok(res.alertas.some(a => a.includes('PROIBIDO USO DE MISOPROSTOL') || a.includes('embolização')));
  assert.ok(res.condutas.some(c => c.includes('VÁCUO-ASPIRAÇÃO')));
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. ATENDIMENTO INTEGRAL À VÍTIMA DE VIOLÊNCIA SEXUAL
// ─────────────────────────────────────────────────────────────────────────────

test('Violência Sexual: kit completo de 5 profilaxias e dispensa de Boletim de Ocorrência', () => {
  const res = GinecologiaAmbulatorialService.protocoloViolenciaSexual({
    horasAposExposicao: 18,
    pesoKg: 62,
    gestante: false,
    vacinadaHepatiteBCompleta: false
  });
  assert.strictEqual(res.elegivelPepHiv, true);
  assert.strictEqual(res.elegivelContracepcaoEmergencia, true);

  // 1. Contracepção de emergência
  assert.ok(res.prescricoes.some(p => p.farmaco.includes('Levonorgestrel 1,5 mg')));
  // 2. Sífilis
  assert.ok(res.prescricoes.some(p => p.farmaco.includes('Penicilina G Benzatina 2.400.000 UI')));
  // 3. Gonorreia/Clamídia
  assert.ok(res.prescricoes.some(p => p.farmaco.includes('Ceftriaxona 500 mg') && p.farmaco.includes('Azitromicina 1 g')));
  // 4. Tricomoníase
  assert.ok(res.prescricoes.some(p => p.farmaco.includes('Metronidazol 2 g')));
  // 5. PEP HIV
  assert.ok(res.prescricoes.some(p => p.farmaco.includes('Tenofovir') && p.farmaco.includes('Dolutegravir')));
  // 6. Hep B
  assert.ok(res.prescricoes.some(p => p.farmaco.includes('IGHAHB')));

  // Aspecto ético-legal
  assert.ok(res.aspectosEticosLegais.some(a => a.includes('NÃO depende da apresentação de Boletim de Ocorrência')));
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. URGÊNCIAS DE MAMA E VULVA (MASTITE PUERPERAL E ABSCESSO DE BARTHOLIN)
// ─────────────────────────────────────────────────────────────────────────────

test('Mastite Puerperal: enfatiza MANTER amamentação e antibioticoterapia de 1ª linha', () => {
  const res = GinecologiaAmbulatorialService.manejarUrgenciaMamaVulva({ condicao: 'mastite' });
  assert.ok(res.condicao.includes('Mastite Puerperal'));
  assert.ok(res.condutaImediata.some(c => c.includes('NÃO SUSPENDER A AMAMENTAÇÃO')));
  assert.ok(res.condutaImediata.some(c => c.includes('Cefalexina 500 mg') || c.includes('Amoxicilina + Clavulanato')));
  assert.ok(res.alertaAbscesso.includes('ABSCESSO MAMÁRIO'));
});

test('Abscesso de Bartholin: tratamento definitivo mecânico com Marsupialização/Word', () => {
  const res = GinecologiaAmbulatorialService.manejarUrgenciaMamaVulva({ condicao: 'bartholin' });
  assert.ok(res.condicao.includes('Bartholin'));
  assert.ok(res.condutaImediata.some(c => c.includes('MARSUPIALIZAÇÃO') || c.includes('Cateter de Word')));
  assert.ok(res.alertaOncologico.includes('BIÓPSIA'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. ROTEAMENTO NO TELEGRAM ROUTER
// ─────────────────────────────────────────────────────────────────────────────

test('Router Telegram: comando /ctg responde com diagnóstico e conduta de reanimação', () => {
  let msgEnviada = '';
  let tecladoEnviado = null;

  ctx.enviarMensagemComTecladoParaChat = function(chatId, txt, teclado) {
    msgEnviada = txt;
    tecladoEnviado = teclado;
    return true;
  };

  ctx.processarMensagemTexto({ chat: { id: 111 }, text: '/ctg dip 2 bcf 120 desaceleracao tardia' });
  assert.ok(msgEnviada.includes('CATEGORIA II') || msgEnviada.includes('DIP II'), 'Deve identificar DIP II');
  assert.ok(msgEnviada.includes('INSUFICIÊNCIA UTEROPLACENTÁRIA') || msgEnviada.includes('Ocitocina'));

  const cbs = [];
  tecladoEnviado.inline_keyboard.forEach(r => r.forEach(b => cbs.push(b.callback_data)));
  assert.ok(cbs.some(c => c.startsWith('ux:copiar:')), 'Deve conter botão de cópia');
  assert.ok(cbs.includes('ux:rotina:go') && cbs.includes('ux:hub:inicio'), 'Deve conter navegação');
});

test('Router Telegram: comando /distocia responde com algoritmo HELPERR', () => {
  let msgEnviada = '';
  let tecladoEnviado = null;

  ctx.enviarMensagemComTecladoParaChat = function(chatId, txt, teclado) {
    msgEnviada = txt;
    tecladoEnviado = teclado;
    return true;
  };

  ctx.processarMensagemTexto({ chat: { id: 111 }, text: '/distocia' });
  assert.ok(msgEnviada.includes('HELPERR'), 'Deve emitir algoritmo HELPERR');
  assert.ok(msgEnviada.includes('McRoberts'), 'Deve citar McRoberts');

  const cbs = [];
  tecladoEnviado.inline_keyboard.forEach(r => r.forEach(b => cbs.push(b.callback_data)));
  assert.ok(cbs.some(c => c.startsWith('ux:copiar:')), 'Deve conter botão de cópia');
});

test('Router Telegram: comando /sangramento1tri responde com conduta e Anti-D', () => {
  let msgEnviada = '';
  let tecladoEnviado = null;

  ctx.enviarMensagemComTecladoParaChat = function(chatId, txt, teclado) {
    msgEnviada = txt;
    tecladoEnviado = teclado;
    return true;
  };

  ctx.processarMensagemTexto({ chat: { id: 111 }, text: '/sangramento1tri ectopica beta 2000 massa 3cm rh neg' });
  assert.ok(msgEnviada.includes('METOTREXATO') || msgEnviada.includes('ECTÓPICA'), 'Deve identificar ectópica');
  assert.ok(msgEnviada.includes('Anti-D') || msgEnviada.includes('PROFILAXIA'), 'Deve emitir profilaxia Anti-D');

  const cbs = [];
  tecladoEnviado.inline_keyboard.forEach(r => r.forEach(b => cbs.push(b.callback_data)));
  assert.ok(cbs.some(c => c.startsWith('ux:copiar:')), 'Deve conter botão de cópia');
});

test('Router Telegram: comando /violencia_sexual responde com kit profilático e PEP', () => {
  let msgEnviada = '';
  let tecladoEnviado = null;

  ctx.enviarMensagemComTecladoParaChat = function(chatId, txt, teclado) {
    msgEnviada = txt;
    tecladoEnviado = teclado;
    return true;
  };

  ctx.processarMensagemTexto({ chat: { id: 111 }, text: '/violencia_sexual 24h sem vacina' });
  assert.ok(msgEnviada.includes('Violência Sexual'), 'Deve emitir protocolo de violência sexual');
  assert.ok(msgEnviada.includes('Levonorgestrel'), 'Deve conter Levonorgestrel');
  assert.ok(msgEnviada.includes('Tenofovir') || msgEnviada.includes('PEP'), 'Deve conter PEP HIV');

  const cbs = [];
  tecladoEnviado.inline_keyboard.forEach(r => r.forEach(b => cbs.push(b.callback_data)));
  assert.ok(cbs.some(c => c.startsWith('ux:copiar:')), 'Deve conter botão de cópia');
});

test('Router Telegram: comando /mastite responde com conduta e amamentação mantida', () => {
  let msgEnviada = '';
  let tecladoEnviado = null;

  ctx.enviarMensagemComTecladoParaChat = function(chatId, txt, teclado) {
    msgEnviada = txt;
    tecladoEnviado = teclado;
    return true;
  };

  ctx.processarMensagemTexto({ chat: { id: 111 }, text: '/mastite dor mama esquerda febre 39' });
  assert.ok(msgEnviada.includes('Mastite Puerperal'), 'Deve identificar mastite puerperal');
  assert.ok(msgEnviada.includes('AMAMENTAÇÃO'), 'Deve orientar manter amamentação');

  const cbs = [];
  tecladoEnviado.inline_keyboard.forEach(r => r.forEach(b => cbs.push(b.callback_data)));
  assert.ok(cbs.some(c => c.startsWith('ux:copiar:')), 'Deve conter botão de cópia');
});

console.log(`\n🎉 Todos os ${aprovados}/${totalTestes} testes da Expansão Clínica de GO passaram com 100% de sucesso!\n`);
