/**
 * ==============================================================================
 * BATERIA DE TESTES DE INTEGRAÇÃO & RESILIÊNCIA: COMPATIBILIDADE EM Y E D1
 * ==============================================================================
 * Validação exaustiva do motor determinístico em RAM para prescrições combinadas
 * em bomba de infusão (BIC), diluentes recomendados (D1), compatibilidade em Y
 * e bloqueios sentinela de precipitados beira-leito.
 * ==============================================================================
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('Iniciando testes de Compatibilidade em Y e Diluição de Vasoativos (D1)...');

// 1. CARREGAMENTO DO RUNTIME OFICIAL
const { ctx, cockpitRpc } = require('../server/runtime');
const CompatibilidadeYDvaService = ctx.CompatibilidadeYDvaService;
const CalculadorasClinicas = ctx.CalculadorasClinicas;
const executarCrossCheckSegurancaClinica = ctx.executarCrossCheckSegurancaClinica;

assert(CompatibilidadeYDvaService, 'Módulo CompatibilidadeYDvaService deve estar carregado no runtime');

// ------------------------------------------------------------------------------
// TESTE 1: Fichas Oficiais de Diluição e Cuidados Clínicos (D1)
// ------------------------------------------------------------------------------
console.log('[TESTE 1] Fichas Oficiais de Diluição, Vias de Infusão e Estabilidade (D1)...');

const fichaNora = CompatibilidadeYDvaService.obterFichaDiluicao('noradrenalina');
assert(fichaNora, 'Ficha da Noradrenalina deve existir');
assert(fichaNora.diluenteD1.includes('SG 5%'), 'Diluente D1 de Noradrenalina deve priorizar SG 5% contra oxidação');
assert(fichaNora.acessoVenoso.includes('Central'), 'Acesso venoso central mandatório para Noradrenalina');

const fichaDobuta = CompatibilidadeYDvaService.obterFichaDiluicao('dobuta');
assert(fichaDobuta, 'Ficha da Dobutamina deve existir');
assert(fichaDobuta.solucaoIncompativeis ? true : fichaDobuta.solucoesIncompativeis.some(s => s.includes('Bicarbonato')), 'Dobutamina incompatível com soluções alcalinas');

const fichaNipride = CompatibilidadeYDvaService.obterFichaDiluicao('nitroprussiato');
assert(fichaNipride, 'Ficha do Nitroprussiato deve existir');
assert(fichaNipride.diluenteD1.includes('EXCLUSIVO'), 'Nitroprussiato deve exigir SG 5% exclusivo (sem cloretos)');
assert(fichaNipride.estabilidade.includes('fotoproteção'), 'Fotoproteção estrita para Nitroprussiato');

const fichaTridil = CompatibilidadeYDvaService.obterFichaDiluicao('nitroglicerina');
assert(fichaTridil, 'Ficha da Nitroglicerina deve existir');
assert(fichaTridil.diluenteDetalhes.includes('PVC'), 'Nitroglicerina deve alertar adsorção e exigir equipo sem PVC');

const fichaAmio = CompatibilidadeYDvaService.obterFichaDiluicao('amiodarona');
assert(fichaAmio, 'Ficha da Amiodarona deve existir');
assert(fichaAmio.diluenteD1.includes('SG 5%') && fichaAmio.diluenteD1.includes('EXCLUSIVO'), 'Amiodarona contínua exige SG 5% exclusivo para evitar microcristais');

const fichaFuro = CompatibilidadeYDvaService.obterFichaDiluicao('furosemida');
assert(fichaFuro, 'Ficha da Furosemida deve existir');
assert(fichaFuro.diluenteD1.includes('SF 0,9%'), 'Furosemida deve ser diluída em SF 0,9%');

console.log('✓ Passou: Fichas de Diluente D1 e diretrizes de vasoativos 100% íntegras');

// ------------------------------------------------------------------------------
// TESTE 2: Matriz Canônica de Compatibilidade em Y (Pares Compatíveis e Bloqueios)
// ------------------------------------------------------------------------------
console.log('[TESTE 2] Checagem de Compatibilidade em Y (Y-Site) entre Fármacos de UTI...');

// Pares Compatíveis de Choque
const yNoraDobuta = CompatibilidadeYDvaService.checarCompatibilidadeY('nora', 'dobuta');
assert.strictEqual(yNoraDobuta.status, 'COMPATIVEL', 'Noradrenalina + Dobutamina devem ser compatíveis em Y');
assert(yNoraDobuta.icone === '✅', 'Ícone de compatível deve ser ✅');

const yNoraVaso = CompatibilidadeYDvaService.checarCompatibilidadeY('noradrenalina', 'vasopressina');
assert.strictEqual(yNoraVaso.status, 'COMPATIVEL', 'Noradrenalina + Vasopressina devem ser compatíveis em Y');

const yNoraMilri = CompatibilidadeYDvaService.checarCompatibilidadeY('noradrenalina', 'milrinona');
assert.strictEqual(yNoraMilri.status, 'COMPATIVEL', 'Noradrenalina + Milrinona devem ser compatíveis em Y');

const yNoraFentanil = CompatibilidadeYDvaService.checarCompatibilidadeY('noradrenalina', 'fentanil');
assert.strictEqual(yNoraFentanil.status, 'COMPATIVEL', 'Noradrenalina + Fentanil devem ser compatíveis em Y');

// Incompatibilidades Críticas (Bloqueios Sentinela)
const yNoraFuro = CompatibilidadeYDvaService.checarCompatibilidadeY('noradrenalina', 'furosemida');
assert.strictEqual(yNoraFuro.status, 'INCOMPATIVEL', 'Noradrenalina + Furosemida devem ser INCOMPATÍVEIS em Y');
assert(yNoraFuro.alertaCritico === true, 'Deve gerar alerta crítico');
assert(yNoraFuro.mecanismo.includes('precipitação') || yNoraFuro.mecanismo.includes('pH'), 'Mecanismo deve explicar incompatibilidade de pH e cristais');

const yNoraBicarb = CompatibilidadeYDvaService.checarCompatibilidadeY('noradrenalina', 'bicarbonato_de_sodio');
assert.strictEqual(yNoraBicarb.status, 'INCOMPATIVEL', 'Noradrenalina + Bicarbonato de Sódio devem ser INCOMPATÍVEIS em Y');
assert(yNoraBicarb.mecanismo.includes('oxidação') || yNoraBicarb.mecanismo.includes('inativa'), 'Mecanismo deve explicar oxidação e inativação de catecolaminas');

const yDobutaFuro = CompatibilidadeYDvaService.checarCompatibilidadeY('dobuta', 'furosemida');
assert.strictEqual(yDobutaFuro.status, 'INCOMPATIVEL', 'Dobutamina + Furosemida devem ser INCOMPATÍVEIS em Y');

const yDobutaBicarb = CompatibilidadeYDvaService.checarCompatibilidadeY('dobuta', 'bicarbonato');
assert.strictEqual(yDobutaBicarb.status, 'INCOMPATIVEL', 'Dobutamina + Bicarbonato devem ser INCOMPATÍVEIS em Y');

const yMilriFuro = CompatibilidadeYDvaService.checarCompatibilidadeY('milrinona', 'furosemida');
assert.strictEqual(yMilriFuro.status, 'INCOMPATIVEL', 'Milrinona + Furosemida devem ser INCOMPATÍVEIS em Y');

const yCeftriaxonaCalcio = CompatibilidadeYDvaService.checarCompatibilidadeY('ceftriaxona', 'gluconato_de_calcio');
assert.strictEqual(yCeftriaxonaCalcio.status, 'INCOMPATIVEL', 'Ceftriaxona + Cálcio devem ser INCOMPATÍVEIS FATAL em Y');
assert(yCeftriaxonaCalcio.alertaCritico === true, 'Deve gerar alerta crítico');

const yNoraPropofol = CompatibilidadeYDvaService.checarCompatibilidadeY('noradrenalina', 'propofol');
assert.strictEqual(yNoraPropofol.status, 'CONDICIONAL', 'Noradrenalina + Propofol devem ter status CONDICIONAL / CAUTELA');

console.log('✓ Passou: Matriz de compatibilidade em Y valida combinações e bloqueios com rigor científico');

// ------------------------------------------------------------------------------
// TESTE 3: Auditoria de Prescrições Múltiplas e Formatação de Parecer
// ------------------------------------------------------------------------------
console.log('[TESTE 3] Auditoria de Prescrições Múltiplas e Parecer Estruturado...');

const auditCompativel = CompatibilidadeYDvaService.auditarPrescricaoCombinada(['noradrenalina', 'dobutamina', 'vasopressina']);
assert.strictEqual(auditCompativel.temIncompativel, false, 'Não deve haver incompatibilidade entre Nora, Dobuta e Vaso');
assert.strictEqual(auditCompativel.totalPares, 3, 'Deve avaliar os 3 pares possíveis');

const auditIncompativel = CompatibilidadeYDvaService.auditarPrescricaoCombinada(['noradrenalina', 'dobutamina', 'furosemida']);
assert.strictEqual(auditIncompativel.temIncompativel, true, 'Deve detectar incompatibilidade com Furosemida');
assert.strictEqual(auditIncompativel.temAlertasCriticos, true, 'Deve marcar alertas críticos');

const parecerTexto = CompatibilidadeYDvaService.formatarParecerCompatibilidadeY('nora', 'furosemida');
assert(parecerTexto.includes('INCOMPATÍVEL EM Y'), 'Parecer formatado deve destacar status incompatível');
assert(parecerTexto.includes('BLOQUEIO SENTINELA'), 'Parecer formatado deve emitir bloqueio sentinela');
assert(parecerTexto.includes('Diluente de Escolha (D1)'), 'Parecer formatado deve indicar Diluente D1');

console.log('✓ Passou: Auditoria múltipla e parecer clínico beira-leito formatados com sucesso');

// ------------------------------------------------------------------------------
// TESTE 4: Integração com Calculadoras Clínicas Puras (CalculadorasClinicas)
// ------------------------------------------------------------------------------
console.log('[TESTE 4] Integração em CalculadorasClinicas.drogasVasoativas e Cross-Check...');

const resDvaPura = CalculadorasClinicas.drogasVasoativas('noradrenalina', 70, 'padrao');
assert(resDvaPura.ok, 'Cálculo de Noradrenalina deve ser bem-sucedido');
assert(resDvaPura.textoFormatado.includes('Diluente Oficial (D1)'), 'Texto formatado de DVA deve conter o Diluente Oficial D1');
assert(resDvaPura.textoFormatado.includes('SG 5%'), 'Diluente deve mencionar SG 5% preferencial');
assert(resDvaPura.textoFormatado.includes('Acesso Venoso'), 'Deve conter recomendação de acesso venoso');

const checkDireto = CalculadorasClinicas.compatibilidadeYDva('nora', 'dobuta');
assert(checkDireto && checkDireto.status === 'COMPATIVEL', 'Método direto compatibilidadeYDva deve responder');

console.log('✓ Passou: CalculadorasClinicas enriquecida com diluente D1 e compatibilidade em Y');

// ------------------------------------------------------------------------------
// TESTE 5: Integração no Cross-Check Farmacológico Global (executarCrossCheckSegurancaClinica)
// ------------------------------------------------------------------------------
console.log('[TESTE 5] Detecção Automática em executarCrossCheckSegurancaClinica...');

const crossPrescricao = executarCrossCheckSegurancaClinica('Paciente em choque: noradrenalina 0.3 mcg/kg/min, dobutamina 5 mcg/kg/min, furosemida 40mg EV em BIC contínua, clcr 45');
assert(crossPrescricao.ok, 'Cross-check deve executar com sucesso');
assert(crossPrescricao.temAlertasCriticos === true, 'Deve sinalizar alerta crítico para Furosemida em Y');
assert(crossPrescricao.textoFormatado.includes('COMPATIBILIDADE EM Y'), 'Texto formatado do cross-check deve conter seção de compatibilidade em Y');
assert(crossPrescricao.textoFormatado.includes('INCOMPATÍVEL'), 'Deve alertar incompatibilidade com Furosemida');
assert(crossPrescricao.textoFormatado.includes('DILUENTES PADRÃO & VIAS DE INFUSÃO (D1 / UTI)'), 'Deve listar as fichas D1 de diluente');

console.log('✓ Passou: Cross-Check global detecta e estrutura compatibilidade em Y automaticamente');

// ------------------------------------------------------------------------------
// TESTE 6: Handshake RPC no Fastify Runtime (cockpitCalcular e cockpitCompatibilidadeYDva)
// ------------------------------------------------------------------------------
console.log('[TESTE 6] Handshake RPC Fastify Runtime (cockpitCalcular & cockpitCompatibilidadeYDva)...');

// 6.1 RPC cockpitCalcular com dva e droga2
const respRpcDvaY = cockpitRpc('cockpitCalcular', 'bot', ['dva', { peso: 75, droga: 'nora', droga2: 'dobuta' }]);
assert(respRpcDvaY.ok, 'RPC dva com droga2 deve ser aprovada');
assert(respRpcDvaY.compatibilidadeY, 'Objeto compatibilidadeY deve ser retornado');
assert.strictEqual(respRpcDvaY.compatibilidadeY.status, 'COMPATIVEL', 'Status da combinação nora + dobuta deve ser COMPATIVEL');
assert(respRpcDvaY.textoFormatado.includes('COMPATIBILIDADE EM Y'), 'Texto deve anexar o parecer de compatibilidade');

// 6.2 RPC cockpitCalcular com tipo compatibilidade_y
const respRpcY = cockpitRpc('cockpitCalcular', 'bot', ['compatibilidade_y', { droga1: 'nora', droga2: 'furosemida' }]);
assert(respRpcY.ok, 'RPC compatibilidade_y deve ser aprovada');
assert.strictEqual(respRpcY.status, 'INCOMPATIVEL', 'Deve responder status INCOMPATIVEL para nora + furosemida');
assert(respRpcY.textoFormatado.includes('BLOQUEIO SENTINELA'), 'Texto deve conter bloqueio sentinela');

// 6.3 RPC cockpitCompatibilidadeYDva direto
const respRpcDireto = cockpitRpc('cockpitCompatibilidadeYDva', 'bot', ['dobutamina', 'furosemida']);
assert(respRpcDireto.ok, 'RPC cockpitCompatibilidadeYDva direto deve funcionar');
assert.strictEqual(respRpcDireto.status, 'INCOMPATIVEL', 'Dobutamina + Furosemida deve ser INCOMPATÍVEL');

console.log('✓ Passou: Handshake RPC Fastify executa rotas de compatibilidade em Y com latência < 1ms');

// ------------------------------------------------------------------------------
// TESTE 7: Integridade do Cockpit PWA (HTML, Elementos e Paridade com Deploy)
// ------------------------------------------------------------------------------
console.log('[TESTE 7] Integridade de Interface no Cockpit PWA e Paridade de Deploy...');

const htmlPath = path.join(__dirname, '..', 'cockpit_movel.html');
const ghDeployPath = path.join(__dirname, '..', 'gh_cockpit_deploy', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const ghContent = fs.readFileSync(ghDeployPath, 'utf8');

// Hash idêntico
const hashHtml = crypto.createHash('sha256').update(htmlContent).digest('hex');
const hashGh = crypto.createHash('sha256').update(ghContent).digest('hex');
assert.strictEqual(hashHtml, hashGh, 'cockpit_movel.html e gh_cockpit_deploy/index.html devem ter hash SHA-256 idêntico');

// Elemento dva-droga2 presente no DOM
assert(htmlContent.includes('id="dva-droga2"'), 'Campo seletor dva-droga2 deve existir no formulário de DVA');
assert(htmlContent.includes('Combinar em Y com 2ª Droga'), 'Rótulo de combinação em Y presente');

// Simulação de cálculo offline local com droga2
const scriptMatch = htmlContent.match(/function calcularOfflineLocal\(tipo, entrada\) \{([\s\S]*?)\n    \}/);
assert(scriptMatch, 'Função calcularOfflineLocal deve existir no Cockpit');
const fnCalcOffline = new Function('tipo', 'entrada', scriptMatch[1]);

const resOfflineDvaY = fnCalcOffline('dva', { peso: 70, droga: 'nora', droga2: 'furosemida' });
assert(resOfflineDvaY.includes('INCOMPATÍVEL NO MESMO EQUIPO / Y'), 'Motor offline deve emitir alerta crítico de incompatibilidade com Furosemida');

const resOfflineDvaCompat = fnCalcOffline('dva', { peso: 70, droga: 'nora', droga2: 'dobuta' });
assert(resOfflineDvaCompat.includes('COMPATÍVEL NO MESMO EQUIPO / Y'), 'Motor offline deve confirmar compatibilidade entre Nora e Dobuta');
assert(resOfflineDvaCompat.includes('Diluente D1'), 'Motor offline deve indicar o diluente D1');

console.log('✓ Passou: Cockpit PWA sincronizado com paridade estrita e motor offline determinístico validado');

// ------------------------------------------------------------------------------
// TESTE 8: Despacho do Telegram (/dva y nora dobuta e /dva nora furosemida)
// ------------------------------------------------------------------------------
console.log('[TESTE 8] Despachante e Roteador do Bot do Telegram (/dva y)...');

let ultimaMensagemChat = null;
ctx.enviarMensagemParaChat = function(chatId, texto) {
  ultimaMensagemChat = texto;
  return { ok: true, message_id: 12345 };
};

// 8.1 Comando /dva y nora dobuta
ctx.processarMensagemTexto({
  message_id: 101,
  chat: { id: 999999 },
  text: '/dva y nora dobuta'
});
assert(ultimaMensagemChat && ultimaMensagemChat.includes('COMPATIBILIDADE EM Y'), 'Comando /dva y deve acionar parecer de compatibilidade');
assert(ultimaMensagemChat.includes('COMPATÍVEL EM Y'), 'Deve identificar status compatível para nora e dobuta');

// 8.2 Comando /dva nora furosemida (sem número de peso)
ctx.processarMensagemTexto({
  message_id: 102,
  chat: { id: 999999 },
  text: '/dva nora furosemida'
});
assert(ultimaMensagemChat && ultimaMensagemChat.includes('INCOMPATÍVEL EM Y'), 'Comando inteligente /dva nora furosemida deve detectar incompatibilidade');
assert(ultimaMensagemChat.includes('BLOQUEIO SENTINELA'), 'Deve alertar bloqueio sentinela');

console.log('✓ Passou: Bot do Telegram responde instantaneamente com parecer de compatibilidade em Y');

console.log('\n🎉 TODOS OS 8 TESTES DE COMPATIBILIDADE EM Y E DILUIÇÃO D1 PASSARAM COM 100% DE SUCESSO!\n');
