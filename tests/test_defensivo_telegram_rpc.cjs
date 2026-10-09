const assert = require('assert');
const runtime = require('../server/runtime.js');

async function testDefensivo() {
  console.log('--- Iniciando Auditoria Defensiva: Telegram & Fastify RPC ---');

  const ctx = runtime.ctx;
  const chatId = ctx.ConfigService.get('TELEGRAM_CHAT_ID') || '1771571035';
  const session = 'bot';

  let mensagensEnviadas = [];
  ctx.enviarMensagemParaChat = (id, texto) => {
    mensagensEnviadas.push({ metodo: 'enviarMensagemParaChat', id, texto });
  };
  ctx.enviarMensagemComTecladoFixo = (id, texto) => {
    mensagensEnviadas.push({ metodo: 'enviarMensagemComTecladoFixo', id, texto });
  };
  ctx.enviarMensagemComTecladoParaChat = (id, texto) => {
    mensagensEnviadas.push({ metodo: 'enviarMensagemComTecladoParaChat', id, texto });
  };
  ctx.enviarMensagemComBotoes = (id, texto) => {
    mensagensEnviadas.push({ metodo: 'enviarMensagemComBotoes', id, texto });
  };
  ctx.responderCallbackTelegram = (cbId, texto) => {
    mensagensEnviadas.push({ metodo: 'responderCallbackTelegram', cbId, texto });
  };

  // 1. Testes de Comandos Telegram com Casos Extremos e Entradas Malformadas
  const comandosParaTestar = [
    '/oftalmo', '/glaucoma', '/queimaduraocular', '/traumaocular',
    '/icc', '/framingham', '/quarteto',
    '/rcf', '/ciur', '/doppler',
    '/toxo', '/toxoplasmose', '/avidez',
    '/asma', '/criseasma', '/broncoespasmo',
    '/colica', '/colicanefretica', '/litiase',
    '/bronquiolite', '/cnaf',
    '/go', '/obstetricia',
    '/endometriose', '/dienogeste',
    '/saf', '/trombofilia',
    '/dva', '/sri', '/gaso', '/winter',
    '/pals', '/avc', '/hic', '/kdigo',
    '/monoartrite', '/gota', '/febrereumatica',
    '/dermato', '/herpes', '/zoster', '/ulceragenital', '/sifilis', '/mpox',
    '/vertigem', '/hints', '/tontura', '/vppb', '/epistaxe', '/sangramentonasal', '/tamponamento'
  ];

  const variacoesTexto = [
    '', // Sem parâmetros
    '   ', // Somente espaços
    '!@#$%^&*()_+=-{}[]:;"<>,.?/~`', // Caracteres especiais
    'NaN undefined null [object Object]', // Strings de erro comuns
    '-99999999999999999999', // Números negativos bizarros
    'palavra_aleatoria_sem_contexto_clinico'
  ];

  let totalTestesTelegram = 0;
  for (const cmd of comandosParaTestar) {
    for (const varTxt of variacoesTexto) {
      totalTestesTelegram++;
      mensagensEnviadas = [];
      const msgTexto = varTxt ? `${cmd} ${varTxt}` : cmd;
      assert.doesNotThrow(() => {
        ctx.processarMensagemTexto({
          chat: { id: chatId },
          text: msgTexto
        });
      }, `Comando ${msgTexto} não deve lançar exceção.`);

      // Deve ter havido pelo menos uma resposta de instrução ou aviso ao usuário
      assert(mensagensEnviadas.length > 0, `Comando ${msgTexto} não pode ficar sem resposta ao usuário.`);
    }
  }
  console.log(`✓ ${totalTestesTelegram} testes defensivos de comandos Telegram executados com sucesso.`);

  // 2. Testes de Rotas RPC do Cockpit com Payloads Defensivos
  const metodosRpc = [
    'cockpitOftalmologiaEmergencia',
    'cockpitCardiologiaIcCronica',
    'cockpitObstetriciaRcf',
    'cockpitObstetriciaToxoplasmose',
    'cockpitPneumologiaAsma',
    'cockpitUrologiaColicaNefretica',
    'cockpitPediatriaBronquiolite',
    'cockpitEndocrinologiaHiperprolactinemia',
    'cockpitGinecologiaEndometriose',
    'cockpitObstetriciaSaf',
    'cockpitGasometriaAcidoBase',
    'cockpitSuporteNutricionalPediatrico',
    'cockpitCardiologiaIntensiva',
    'cockpitNefrologiaKdigo',
    'cockpitReumatologiaMonoartrite',
    'cockpitReumatologiaFebreReumatica',
    'cockpitDermatologiaLesao',
    'cockpitDermatologiaHerpes',
    'cockpitDermatologiaUlcerasGenitais',
    'cockpitDermatologiaSifilis',
    'cockpitDermatologiaMpox',
    'cockpitOtorrinoVertigemHints',
    'cockpitOtorrinoEpistaxe',
    'cockpitOtorrinoResumo'
  ];

  const payloadsRpc = [
    null,
    {},
    '',
    'texto livre sem parâmetros definidos',
    { texto: 'dado clinico genérico' }
  ];

  let totalTestesRpc = 0;
  for (const metodo of metodosRpc) {
    for (const payload of payloadsRpc) {
      totalTestesRpc++;
      try {
        const res = runtime.cockpitRpc(metodo, session, [payload]);
        // Se responder, deve ser um objeto estruturado
        assert(typeof res === 'object' && res !== null, `Resposta de ${metodo} deve ser objeto`);
      } catch (errRpc) {
        // Se lançar, deve ser um erro compreensível de validação/negócio e não TypeError/crash
        assert(!(errRpc instanceof TypeError), `Erro em ${metodo} não deve ser TypeError: ${errRpc.message}`);
        assert(errRpc.message && errRpc.message.length > 0, `Mensagem de erro de ${metodo} deve ser explicativa`);
      }
    }
  }
  console.log(`✓ ${totalTestesRpc} testes defensivos de métodos Cockpit RPC executados com sucesso.`);

  // 3. Teste do Callback do Telegram com dados inválidos ou nulos
  assert.doesNotThrow(() => {
    ctx.processarCallbackBotao(null);
  });
  assert.doesNotThrow(() => {
    ctx.processarCallbackBotao({});
  });
  assert.doesNotThrow(() => {
    ctx.processarCallbackBotao({ id: 'cb_test_invalido', data: 'acao_completamente_desconhecida' });
  });
  console.log('✓ Tratamento defensivo de Callbacks de Botão validado.');

  console.log('\n🎉 TODOS OS TESTES DEFENSIVOS APROVADOS COM SUCESSO!');
}

testDefensivo().catch(err => {
  console.error('Falha nos testes defensivos:', err);
  process.exit(1);
});
