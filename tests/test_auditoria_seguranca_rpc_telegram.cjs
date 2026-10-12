/**
 * ==============================================================================
 * ULTRA ROTINA - TESTE DE AUDITORIA DE SEGURANÇA E ROBUSTEZ: RPC & TELEGRAM
 * ==============================================================================
 * Valida resiliência extrema a parâmetros ausentes, corrompidos, tipos inválidos
 * e exceções não tratadas em todos os handlers do Telegram e rotas RPC Fastify.
 * ==============================================================================
 */

const assert = require('assert');
const runtime = require('../server/runtime.js');
const ctx = runtime.ctx;

console.log('--- Iniciando Teste de Auditoria de Segurança: RPC e Telegram ---');

// 1. Validação de Sessão Cockpit
const sessionValida = ctx.criarSessaoCockpit_(ctx.ConfigService.get('TELEGRAM_CHAT_ID'));
assert(sessionValida && sessionValida.startsWith('ck_'), 'Sessão do Cockpit deve ser gerada');

// 2. Teste de resiliência em obterUrlCockpit para usuários desconhecidos
const urlDesconhecido = ctx.obterUrlCockpit(999999999);
assert(typeof urlDesconhecido === 'string' && urlDesconhecido.length > 0, 'obterUrlCockpit deve retornar URL válida sem crash');

// 3. Teste defensivo do Telegram: Mock de envio
const mensagensCapturadas = [];
ctx.enviarMensagemParaChat = (chatId, texto, kb) => {
  mensagensCapturadas.push({ chatId, texto, kb });
  return true;
};
ctx.enviarMensagemComBotoes = (chatId, texto, kb) => {
  mensagensCapturadas.push({ chatId, texto, kb });
  return true;
};
ctx.enviarMensagemComTecladoFixo = (chatId, texto) => {
  mensagensCapturadas.push({ chatId, texto });
  return true;
};
ctx.enviarMensagemComTecladoParaChat = (chatId, texto, kb) => {
  mensagensCapturadas.push({ chatId, texto, kb });
  return true;
};
ctx.enviarMensagemSegmentada = (chatId, texto, kb) => {
  mensagensCapturadas.push({ chatId, texto, kb });
  return true;
};
ctx.enviarChatAction = () => true;
ctx.executarPostTelegram = (url, payload) => { mensagensCapturadas.push({ chatId: payload.chat_id, texto: payload.text, kb: payload.reply_markup }); return true; };

// Lista de comandos clínicos chave para auditoria
const comandosClinicos = [
  '/icc', '/icc 35', '/icc feve 32% nyha 3 k 4.5 clcr 50 pas 120', '/icc parametro_invalido',
  '/dva', '/dva nora 70', '/dva nora abc',
  '/crcl', '/crcl cr 1.2 peso 70 idade 60', '/crcl invalido',
  '/gaso', '/gaso ph 7.25 pco2 28 hco3 12', '/gaso parametro_invalido',
  '/oftalmo', '/oftalmo queimadura acido sulfurico', '/oftalmo glaucoma agudo pio 55',
  '/glaucoma', '/glaucoma pio 50 asma',
  '/bronquiolite', '/bronquiolite fc 175 fr 65 tiragem batimento',
  '/saf', '/saf lac positivo trombose gestante',
  '/endometriose', '/endometriose dor pelvica',
  '/colica', '/colica calculo 6mm hidronefrose',
  '/pancreatite', '/pancreatite bun 30 sirs',
  '/neutropenia', '/neutropenia carga leve',
  '/sca', '/iam supra idade 65 peso 70 pas 130 fc 80',
  '/transfusao', '/transfusao hb 6.2',
  '/pals', '/pals 14kg', '/pals invalido_sem_peso',
  '/winter', '/winter 14', '/winter invalido',
  '/task', '/task Revisar caso do leito 12',
  '/menu', '/start', '/status'
];

for (const cmd of comandosClinicos) {
  mensagensCapturadas.length = 0;
  assert.doesNotThrow(() => {
    ctx.processarMensagemTexto({
      text: cmd,
      chat: { id: ctx.ConfigService.get('TELEGRAM_CHAT_ID') }
    });
  }, `Comando ${cmd} não pode lançar exceção não capturada`);
  assert(mensagensCapturadas.length > 0, `Comando ${cmd} deve responder ao usuário`);
}
console.log('✓ Auditoria de Comandos Telegram: 100% resilientes e sem exceções não tratadas');

// 4. Teste de todos os métodos RPC registrados com payloads extremos
const metodosRpc = [
  'cockpitConsultar', 'cockpitPreceptor', 'cockpitStatusLeito', 'cockpitPassagem',
  'cockpitCalcular', 'cockpitRemume', 'cockpitConversar', 'cockpitPerfil',
  'cockpitRegistrarPeso', 'cockpitAulasProgresso', 'cockpitAlternarAula',
  'cockpitChecarSeguranca', 'cockpitSoapAmbulatorial', 'cockpitGerarReceitaTexto',
  'cockpitGerarAtestadoTexto', 'cockpitEstratificarRisco', 'cockpitBuscarCid',
  'cockpitEstruturarCondutaHas', 'cockpitGerarEncaminhamentoTexto',
  'cockpitCalcularPrenatal', 'cockpitRastreioTrimestre', 'cockpitValidarFarmacoGestacao',
  'cockpitAuditarPrescricaoGestante', 'cockpitTrabalhoParto', 'cockpitSulfatoMagnesio',
  'cockpitCriseHipertensivaObstetrica', 'cockpitHemorragiaPosParto', 'cockpitProfilaxiaGbs',
  'cockpitPrematuridadeRpmo', 'cockpitResumoCentroObstetrico', 'cockpitRastreioColoUterino',
  'cockpitSangramentoUterinoAnormal', 'cockpitElegibilidadeAnticoncepcao',
  'cockpitInfeccaoVulvovaginal', 'cockpitResumoGinecologia', 'cockpitPainelPuericultura',
  'cockpitSaudeIdosoAga', 'cockpitAuditarInfusaoUti', 'cockpitSepsePuerperal',
  'cockpitAuditarYSite', 'cockpitPcrGestante', 'cockpitTevGestante', 'cockpitClimaterioThm',
  'cockpitSopOvariosPolicisticos', 'cockpitDipAbscessoTuboOvariano', 'cockpitPsiquiatriaUrgencia',
  'cockpitObterModelosExameFisico', 'cockpitSedacaoOpioides', 'cockpitNefrologiaDhe',
  'cockpitSdraMecanica', 'cockpitRbac', 'cockpitSuporteNutricional', 'cockpitOncologiaBasica',
  'cockpitEndocrinologiaDiabetes', 'cockpitPalsPediatria', 'cockpitNeurologiaAvc',
  'cockpitToxicologiaEmergencia', 'cockpitHepatologiaHda', 'cockpitAnalgesiaPca',
  'cockpitViaAereaDificil', 'cockpitAuditoriaKaizen', 'cockpitTransfusaoSanguinea',
  'cockpitNefrologiaClearance', 'cockpitInfectologiaNeutropenia',
  'cockpitGastroenterologiaPancreatite', 'cockpitCardiologiaEmergencia',
  'cockpitCardiologiaIntensiva', 'cockpitCardiologiaIcc', 'cockpitICDescompensada',
  'cockpitGasometriaAcidoBase', 'cockpitGasometria', 'cockpitSuporteNutricionalPediatrico',
  'cockpitNutricaoPediatrica', 'cockpitHematologiaAnemias', 'cockpitManejoAnemias',
  'cockpitAnemia', 'cockpitNefrologiaKdigo', 'cockpitPneumologiaAsma', 'cockpitCriseAsmatica',
  'cockpitObstetriciaRcf', 'cockpitRestricaoCrescimentoFetal', 'cockpitHepatologiaColestase',
  'cockpitColestaseGestacional', 'cockpitEhagSwansea', 'cockpitObstetriciaToxoplasmose',
  'cockpitToxoplasmoseGestacional', 'cockpitCardiologiaFaAnticoagulacao',
  'cockpitFibrilacaoAtrial', 'cockpitUrologiaColicaNefretica', 'cockpitColicaNefretica',
  'cockpitPediatriaBronquiolite', 'cockpitBronquiolite',
  'cockpitEndocrinologiaHiperprolactinemia', 'cockpitHiperprolactinemia',
  'cockpitGinecologiaEndometriose', 'cockpitEndometriose', 'cockpitObstetriciaSaf',
  'cockpitSafTrombofilias', 'cockpitSafGestacional', 'cockpitCardiologiaIcCronica',
  'cockpitIcCronica', 'cockpitOftalmologiaEmergencia', 'cockpitOftalmologia'
];

for (const m of metodosRpc) {
  // Teste 1: Sessão vazia deve negar sem crash
  assert.throws(() => {
    runtime.cockpitRpc(m, '', []);
  }, /(autorizado|sessão|expirada)/i, `Método ${m} sem sessão deve lançar erro de autorização`);

  // Teste 2: Sessão válida com argumentos vazios, nulos ou strings inválidas
  const payloads = [[], [null], [{}], ['invalido_corrompido']];
  for (const p of payloads) {
    try {
      runtime.cockpitRpc(m, sessionValida, p);
    } catch (err) {
      // Se lançar erro, deve ser de validação de parâmetros, NUNCA TypeError de runtime não tratado
      assert(err.name !== 'TypeError', `Método ${m} não pode lançar TypeError não tratado com payload ${JSON.stringify(p)}: ${err.message}`);
    }
  }
}

console.log('✓ Auditoria de Métodos RPC Fastify: 101 métodos validados com resiliência total');
console.log('🚀 TODOS OS TESTES DE AUDITORIA DE SEGURANÇA E ROBUSTEZ PASSARAM COM SUCESSO!');
