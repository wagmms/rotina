/**
 * ==============================================================================
 * Testes Unitários: Saneamento do Escopo Clínico, Inventário e Expurgo Terciário
 * ==============================================================================
 * Valida a conclusão rigorosa da Tarefa 57 do PROGRESS.md:
 * 1. Expurgo de rotinas administrativas e burocráticas hospitalares (/auditar_rbac)
 * 2. Desvinculação de /emergencia do RBAC, restaurando a Central de Sala Vermelha
 * 3. Salvaguardas e alertas sentinela de condutas exclusivas de UTI Terciária (SDRA, RASS, Choque)
 * 4. Validação de inventário canônico de 97 comandos e documentação de matriz de escopo
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const runtime = require('../server/runtime.js');

async function testSaneamentoEscopo() {
  console.log('=== INICIANDO BATERIA DE TESTES: SANEAMENTO DO ESCOPO CLÍNICO ===\n');

  const ctx = runtime.ctx;
  const chatId = '123456789';

  let mensagensEnviadas = [];
  ctx.enviarMensagemParaChat = (id, texto) => {
    mensagensEnviadas.push({ tipo: 'texto', id, texto });
    return true;
  };
  ctx.enviarMensagemComBotoes = (id, texto, kb) => {
    mensagensEnviadas.push({ tipo: 'botoes', id, texto, kb });
    return true;
  };
  ctx.enviarMensagemComTecladoParaChat = (id, texto, kb) => {
    mensagensEnviadas.push({ tipo: 'teclado', id, texto, kb });
    return true;
  };

  // ───────────────────────────────────────────────────────────────────────────
  // [1] Validação de Desvinculação de /emergencia e Roteamento de Sala Vermelha
  // ───────────────────────────────────────────────────────────────────────────
  console.log('[1] Testando novo despachante de /emergencia (Sala Vermelha)...');
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/emergencia' });
  assert.ok(mensagensEnviadas.length > 0, 'Deve enviar mensagem em resposta a /emergencia');
  const msgEmerg = mensagensEnviadas[0].texto;
  assert.ok(msgEmerg.includes('EMERGÊNCIA & SALA VERMELHA'), 'Deve abrir a Central de Emergência e Sala Vermelha');
  assert.ok(mensagensEnviadas[0].kb, 'Deve incluir teclado com botões de ação rápida');
  const btnTexts = JSON.stringify(mensagensEnviadas[0].kb);
  assert.ok(btnTexts.includes('PCR (ACLS)'), 'Deve conter botão de PCR');
  assert.ok(btnTexts.includes('SRI / IOT'), 'Deve conter botão de SRI');
  assert.ok(btnTexts.includes('Noradrenalina'), 'Deve conter botão de Nora');
  assert.ok(btnTexts.includes('Gasometria'), 'Deve conter botão de Gasometria');
  console.log('  ✓ /emergencia abre imediatamente a Central de Sala Vermelha com botões rápidos.');

  // Testar aliases /salavermelha e /urgencia
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/salavermelha' });
  assert.ok(mensagensEnviadas.length > 0 && mensagensEnviadas[0].texto.includes('EMERGÊNCIA & SALA VERMELHA'));

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/urgencia' });
  assert.ok(mensagensEnviadas.length > 0 && mensagensEnviadas[0].texto.includes('EMERGÊNCIA & SALA VERMELHA'));

  // ───────────────────────────────────────────────────────────────────────────
  // [2] Validação de /breaktheglass (Bypass do RBAC mantido isolado)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('[2] Testando /breaktheglass para bypass administrativo do RBAC...');
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/breaktheglass' });
  assert.ok(mensagensEnviadas.length > 0, 'Deve responder a /breaktheglass');
  assert.ok(mensagensEnviadas[0].texto.includes('PROTOCOLO BREAK-THE-GLASS'), 'Deve orientar ativação do bypass');
  console.log('  ✓ /breaktheglass opera isolado sem conflitar com emergência médica.');

  // ───────────────────────────────────────────────────────────────────────────
  // [3] Validação de Desativação de Relatórios Burocráticos (/auditar_rbac)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('[3] Testando desativação de relatórios burocráticos (/auditar_rbac)...');
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/auditar_rbac' });
  assert.ok(mensagensEnviadas.length > 0, 'Deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('FUNÇÃO ADMINISTRATIVA DESATIVADA'), 'Deve informar desativação');
  assert.ok(mensagensEnviadas[0].texto.includes('/perfil'), 'Deve redirecionar para /perfil');

  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/relatorio_rbac' });
  assert.ok(mensagensEnviadas.length > 0, 'Deve responder');
  assert.ok(mensagensEnviadas[0].texto.includes('FUNÇÃO ADMINISTRATIVA DESATIVADA'));
  console.log('  ✓ Comandos administrativos e burocráticos respondem com desativação amigável.');

  // ───────────────────────────────────────────────────────────────────────────
  // [4] Validação de Salvaguardas de UTI Terciária em SDRA
  // ───────────────────────────────────────────────────────────────────────────
  console.log('[4] Testando salvaguardas de UTI Terciária em Mecânica Pulmonar / SDRA...');
  const MecanicaSdra = require('../src/02_mecanica_pulmonar_sdra.js');
  const resSdraGrave = MecanicaSdra.avaliarSdra(65, 50, 10); // PaO2 65, FiO2 50% -> P/F = 130
  assert.strictEqual(resSdraGrave.classificacao, 'SDRA Moderada (Critérios de Berlim)');
  assert.ok(resSdraGrave.condutas.some(c => c.includes('CONDUTA BEIRA-LEITO (PS / ENFERMARIA)') && c.includes('VAGA ZERO')), 'Deve indicar conduta do generalista e solicitação de vaga');
  assert.ok(resSdraGrave.condutas.some(c => c.includes('CONDUTA EXCLUSIVA DE UTI TERCIÁRIA') && c.includes('Posição Prona')), 'Deve alertar que Prona e Cisatracúrio são exclusivos de UTI');
  console.log('  ✓ SDRA emite alerta sentinela de conduta exclusiva de UTI e solicitação imediata de Vaga Zero.');

  // ───────────────────────────────────────────────────────────────────────────
  // [5] Validação de Salvaguardas em Sedação Profunda (RASS)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('[5] Testando salvaguarda de UTI Terciária em Sedação Profunda (RASS)...');
  const Sedacao = require('../src/02_sedacao_opioides.js');
  const rassM4 = Sedacao.avaliarRASS(-4);
  assert.ok(rassM4.alertaUti, 'Deve possuir alertaUti para RASS -4');
  assert.ok(rassM4.alertaUti.includes('CONDUTA EXCLUSIVA DE UTI TERCIÁRIA'), 'Deve alertar sobre escopo de CTI');
  assert.ok(rassM4.alertaUti.includes('enfermaria'), 'Deve alertar contra manutenção em enfermaria geral');

  const rass0 = Sedacao.avaliarRASS(0);
  assert.strictEqual(rass0.alertaUti, null, 'Paciente calmo não deve emitir alerta de UTI');
  console.log('  ✓ Sedação Profunda (RASS <= -3) emite alerta sentinela de leito intensivo obrigatório.');

  // ───────────────────────────────────────────────────────────────────────────
  // [6] Validação de Alertas em Infusão Contínua / DVA
  // ───────────────────────────────────────────────────────────────────────────
  console.log('[6] Testando alerta de vasoplegia refratária e escopo terciário em DVA...');
  const InfusaoUti = require('../src/02_auditoria_infusao_uti.js');
  const limitesNora = InfusaoUti.DROGAS.noradrenalina;
  assert.ok(limitesNora.alertas_clinicos.some(a => a.includes('CONDUTA EXCLUSIVA DE UTI TERCIÁRIA') && a.includes('Azul de Metileno')), 'Deve conter alerta de vasoplegia terciária');
  console.log('  ✓ Alerta de vasoplegia refratária e terapias experimentais validado na base de infusão.');

  // ───────────────────────────────────────────────────────────────────────────
  // [7] Validação da Existência do Inventário Clínico Estruturado
  // ───────────────────────────────────────────────────────────────────────────
  console.log('[7] Testando existência e integridade do inventário clínico estruturado...');
  const docInventarioPath = path.resolve(__dirname, '../docs/INVENTARIO_CLINICO_GERAL.md');
  assert.ok(fs.existsSync(docInventarioPath), 'Arquivo docs/INVENTARIO_CLINICO_GERAL.md deve existir');
  const inventarioContent = fs.readFileSync(docInventarioPath, 'utf8');
  assert.ok(inventarioContent.includes('Inventário Clínico Geral'), 'Deve conter título do inventário');
  assert.ok(inventarioContent.includes('Pilar 1: Porta de Emergência / Sala Vermelha'), 'Deve detalhar Pilar 1');
  assert.ok(inventarioContent.includes('Pilar 2: Enfermaria Clínica Geral'), 'Deve detalhar Pilar 2');
  assert.ok(inventarioContent.includes('Pilar 3: Atenção Primária / UBS'), 'Deve detalhar Pilar 3');
  assert.ok(inventarioContent.includes('97 Comandos Slash'), 'Deve conter referência aos 97 comandos canônicos');
  assert.ok(inventarioContent.includes('Matriz de Expurgo'), 'Deve conter matriz de expurgo');
  console.log('  ✓ docs/INVENTARIO_CLINICO_GERAL.md validado com todos os 3 pilares e matriz de expurgo.');

  console.log('\n🎉 TODOS OS TESTES DE SANEAMENTO DO ESCOPO CLÍNICO PASSARAM COM 100% DE SUCESSO!\n');
}

testSaneamentoEscopo().catch(err => {
  console.error('❌ Falha nos testes de saneamento do escopo clínico:', err);
  process.exit(1);
});
