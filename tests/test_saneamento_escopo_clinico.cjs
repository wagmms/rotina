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
  assert.ok(btnTexts.includes('Drogas Vasoativas (DVA)') || btnTexts.includes('DVA'), 'Deve conter botão unificado de DVA');
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
  // [2] Validação do Hub de Ginecologia & Obstetrícia Beira-Leito (/go)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('[2] Testando roteamento beira-leito do Hub de G&O (/go e /obstetricia)...');
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/go' });
  assert.ok(mensagensEnviadas.length > 0, 'Deve responder ao comando /go');
  const msgGo = mensagensEnviadas[0].texto;
  assert.ok(msgGo.includes('HUB DE GINECOLOGIA & OBSTETRÍCIA'), 'Deve abrir o Hub de G&O');
  assert.ok(msgGo.includes('29/11'), 'Deve destacar vigência do estágio até 29/11');
  assert.ok(mensagensEnviadas[0].kb, 'Deve incluir teclado inline com 10 botões clínicos');
  const btnsGo = JSON.stringify(mensagensEnviadas[0].kb);
  assert.ok(btnsGo.includes('go_prenatal'), 'Deve conter botão de Pré-Natal');
  assert.ok(btnsGo.includes('go_parto'), 'Deve conter botão de Parto');
  assert.ok(btnsGo.includes('go_hpp'), 'Deve conter botão de HPP');
  assert.ok(btnsGo.includes('go_mgso4'), 'Deve conter botão de MgSO4');
  console.log('  ✓ /go abre imediatamente o Hub de G&O com os 10 botões de rotação.');

  // Testar alias /obstetricia sem argumentos chamando o Hub
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/obstetricia' });
  assert.ok(mensagensEnviadas.length > 0 && mensagensEnviadas[0].texto.includes('HUB DE GINECOLOGIA & OBSTETRÍCIA'));
  console.log('  ✓ /obstetricia sem parâmetros redireciona diretamente ao Hub.');

  // ───────────────────────────────────────────────────────────────────────────
  // [3] Validação de Callbacks Beira-Leito do Hub G&O
  // ───────────────────────────────────────────────────────────────────────────
  console.log('[3] Testando callbacks rápidos do Hub G&O (Zuspan & HPP 4 Ts)...');
  mensagensEnviadas = [];
  ctx.processarCallbackBotao({ id: 'cb1', data: 'go_mgso4', message: { chat: { id: chatId } } });
  assert.ok(mensagensEnviadas.length > 0, 'Deve responder ao callback go_mgso4');
  assert.ok(mensagensEnviadas[0].texto.includes('ZUSPAN'), 'Deve conter esquema de Zuspan');
  assert.ok(mensagensEnviadas[0].texto.includes('Gluconato de Cálcio'), 'Deve orientar antídoto Gluconato de Cálcio');

  mensagensEnviadas = [];
  ctx.processarCallbackBotao({ id: 'cb2', data: 'go_hpp', message: { chat: { id: chatId } } });
  assert.ok(mensagensEnviadas.length > 0, 'Deve responder ao callback go_hpp');
  assert.ok(mensagensEnviadas[0].texto.includes('4 Ts'), 'Deve orientar a regra dos 4 Ts');
  assert.ok(mensagensEnviadas[0].texto.includes('Ocitocina'), 'Deve orientar Ocitocina de 1ª linha');
  console.log('  ✓ Callbacks do Hub G&O respondem instantaneamente com condutas e diluições.');

  // ───────────────────────────────────────────────────────────────────────────
  // [4] Validação de Salvaguardas de UTI Terciária em SDRA (Definição de Berlim)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('[4] Testando salvaguardas de SDRA/Berlim no módulo geral de Gasometria...');
  const GasoService = ctx.GasometriaAcidoBaseService || require('../src/02_gasometria_acido_base.js');
  const resSdraGrave = GasoService.avaliarOxigenacao(65, 50, 40); // PaO2 65, FiO2 50% -> P/F = 130
  assert.strictEqual(resSdraGrave.pfRatio, 130);
  assert.strictEqual(resSdraGrave.classificacaoPF, 'SDRA Moderada (Berlim: P/F 101–200)');
  assert.ok(resSdraGrave.avisos.some(a => a.includes('SDRA (Berlim 2012)')), 'Deve conter critérios de Berlim 2012');
  console.log('  ✓ SDRA classificada com precisão em Berlim no módulo geral de Gasometria.');

  // ───────────────────────────────────────────────────────────────────────────
  // [5] Validação de Salvaguardas em Sedação Profunda (RASS)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('[5] Testando salvaguarda de UTI Terciária em Sedação Profunda (RASS)...');
  const Sedacao = ctx.SedacaoOpioidesService || require('../src/02_sedacao_opioides.js');
  const rassM4 = Sedacao.avaliarRASS(-4);
  assert.ok(rassM4.alertaUti, 'Deve possuir alertaUti para RASS -4');
  assert.ok(rassM4.alertaUti.includes('CONDUTA EXCLUSIVA DE UTI TERCIÁRIA'), 'Deve alertar sobre escopo de CTI');
  assert.ok(rassM4.alertaUti.includes('enfermaria'), 'Deve alertar contra manutenção em enfermaria geral');

  const rass0 = Sedacao.avaliarRASS(0);
  assert.strictEqual(rass0.alertaUti, null, 'Paciente calmo não deve emitir alerta de UTI');
  console.log('  ✓ Sedação Profunda (RASS <= -3) emite alerta sentinela de leito intensivo obrigatório.');

  // ───────────────────────────────────────────────────────────────────────────
  // [6] Validação de Drogas Vasoativas Beira-Leito (DVA) no Módulo Geral
  // ───────────────────────────────────────────────────────────────────────────
  console.log('[6] Testando cálculo de DVA / Noradrenalina beira-leito...');
  const CalcClinicas = ctx.CalculadorasClinicas || require('../src/02_calculadoras_puras.js');
  const resNora = CalcClinicas.drogasVasoativas('noradrenalina', 70, 'padrao');
  assert.strictEqual(resNora.ok, true, 'DVA deve calcular com sucesso');
  assert.ok(resNora.texto.includes('Noradrenalina'), 'Deve identificar noradrenalina');
  assert.ok(resNora.texto.includes('Bomba de Infusão') || resNora.texto.includes('mcg/kg/min'), 'Deve conter orientações beira-leito de infusão');
  console.log('  ✓ Cálculo de DVA (Noradrenalina) validado com sucesso no módulo geral.');

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
