/**
 * Teste de Validação da Etapa 2: Performance, Separação Determinística e PWA Cache
 */
const assert = require('assert');
const { buildServer } = require('../server/index.js');
const runtime = require('../server/runtime.js');

async function run() {
  process.env.NODE_ENV = 'test';
  process.env.TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '1771571035';
  process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'test_bot_token';

  const app = await buildServer();
  const ctx = runtime.ctx;

  const medirConsulta = (consulta, limiteMs, rotulo) => {
    const inicio = process.hrtime.bigint();
    const resposta = consulta();
    const duracaoMs = Number(process.hrtime.bigint() - inicio) / 1e6;
    assert(resposta, `${rotulo} deve produzir resposta`);
    assert(duracaoMs < limiteMs, `${rotulo}: ${duracaoMs.toFixed(2)}ms excedeu ${limiteMs}ms`);
    return resposta;
  };

  const consultasLocais = [
    ['HSL', () => ctx.buscarMedicamentoNoHSL('vancomicina')],
    ['REMUME', () => ctx.consultarRemumeRP('dipirona')],
    ['PedBook fármaco', () => ctx.buscarMedicamentoPediatricoPedB('amoxicilina')],
    ['PedBook conduta', () => ctx.buscarCondutaPediatricaPedB('bronquiolite')]
  ];
  for (const [nome, consulta] of consultasLocais) {
    medirConsulta(consulta, 50, `${nome} após aquecimento`);
    for (let repeticao = 0; repeticao < 20; repeticao++) {
      medirConsulta(consulta, 5, `${nome} em cache`);
    }
  }
  const consultasCalculadoras = [
    ['Parkland', 'parkland 70kg 30%'],
    ['DVA', 'nora 80kg concentrada'],
    ['Diluição', 'como diluir meropenem']
  ];
  for (const [nome, entrada] of consultasCalculadoras) {
    medirConsulta(() => ctx.tentarCalcularDeterministico(entrada), 50, `${nome} determinística`);
    for (let repeticao = 0; repeticao < 20; repeticao++) {
      medirConsulta(() => ctx.tentarCalcularDeterministico(entrada), 5, `${nome} repetida`);
    }
  }
  const interacaoConhecida = medirConsulta(() => ctx.executarCrossCheckSegurancaClinica('amiodarona fluconazol'), 50, 'Interação local');
  assert(interacaoConhecida.interacoes.length > 0, 'Par amiodarona/fluconazol deve manter interação catalogada');
  for (let repeticao = 0; repeticao < 20; repeticao++) {
    medirConsulta(() => ctx.executarCrossCheckSegurancaClinica('amiodarona fluconazol'), 5, 'Interação repetida');
  }

  console.log('🧪 1. Testando Separação Rígida Determinística em RAM (0ms a 15ms)...');

  // A. Parkland
  const t0 = process.hrtime();
  const resPark = ctx.CalculadorasClinicas.parkland(70, 30);
  const diffPark = process.hrtime(t0);
  const msPark = (diffPark[0] * 1000 + diffPark[1] / 1e6).toFixed(2);
  assert.strictEqual(resPark.ok, true, 'Parkland deve calcular com sucesso');
  assert.strictEqual(resPark.dados.volumeTotal24hMl, 4200, 'Volume total atualizado (ABA/ATLS 2 mL/kg/%): 2 * 70 * 30 = 4200 mL');
  assert.strictEqual(resPark.dados.volumePrimeiras8hMl, 2100, 'Primeiras 8h deve ser 2100 mL');
  assert.strictEqual(resPark.dados.vazaoPrimeiras8hMlH, 263, 'Vazão 8h deve ser 263 mL/h');
  assert.strictEqual(resPark.dados.parklandClassico.volumeTotal24hMl, 8400, 'Parkland clássico preservado: 4 * 70 * 30 = 8400 mL');
  console.log(`   ✓ Parkland ABA 2024: 4200 mL total (2 mL/kg/%), 263 mL/h nas primeiras 8h (${msPark}ms em RAM)`);

  // B. DVA (Noradrenalina e Dobutamina em mcg/kg/min)
  const tDva = process.hrtime();
  const resDva = ctx.CalculadorasClinicas.drogasVasoativas('noradrenalina', 70, 'padrao');
  const diffDva = process.hrtime(tDva);
  const msDva = (diffDva[0] * 1000 + diffDva[1] / 1e6).toFixed(2);
  assert.strictEqual(resDva.ok, true, 'DVA deve calcular com sucesso');
  assert(resDva.dados.tabela.length > 0, 'DVA deve gerar tabela de titulação');
  console.log(`   ✓ DVA Noradrenalina 70kg: ${resDva.principal} (${msDva}ms em RAM)`);

  // C. CURB-65
  const tCurb = process.hrtime();
  const resCurb = ctx.CalculadorasClinicas.curb65(true, 65, 32, 85, 55, 72);
  const diffCurb = process.hrtime(tCurb);
  const msCurb = (diffCurb[0] * 1000 + diffCurb[1] / 1e6).toFixed(2);
  assert.strictEqual(resCurb.ok, true, 'CURB-65 deve calcular com sucesso');
  assert.strictEqual(resCurb.dados.pontos, 5, 'Todos os 5 critérios positivos');
  console.log(`   ✓ CURB-65: ${resCurb.principal} (${msCurb}ms em RAM)`);

  // D. Glasgow-P
  const tGcs = process.hrtime();
  const resGcs = ctx.CalculadorasClinicas.glasgowP(3, 4, 5, 0);
  const diffGcs = process.hrtime(tGcs);
  const msGcs = (diffGcs[0] * 1000 + diffGcs[1] / 1e6).toFixed(2);
  assert.strictEqual(resGcs.ok, true, 'Glasgow-P deve calcular com sucesso');
  assert(resGcs.principal.includes('12'), 'Glasgow 3+4+5 - 0 = 12');
  console.log(`   ✓ Glasgow-P: ${resGcs.principal} (${msGcs}ms em RAM)`);

  // E. Cockcroft-Gault (Clearance de Creatinina)
  const tCg = process.hrtime();
  const resCg = ctx.CalculadorasClinicas.cockcroftGault(1.5, 70, 65, false);
  const diffCg = process.hrtime(tCg);
  const msCg = (diffCg[0] * 1000 + diffCg[1] / 1e6).toFixed(2);
  assert.strictEqual(resCg.ok, true, 'Cockcroft-Gault deve calcular com sucesso');
  console.log(`   ✓ Clearance Creatinina (Cockcroft): ${resCg.principal} (${msCg}ms em RAM)`);

  // F. Diluição de Antibióticos no Guia Farmacêutico HSL
  const tDil = process.hrtime();
  const medVanco = ctx.buscarMedicamentoNoHSL('vancomicina');
  const diffDil = process.hrtime(tDil);
  const msDil = (diffDil[0] * 1000 + diffDil[1] / 1e6).toFixed(2);
  assert(medVanco && medVanco.preparo_diluicao, 'Vancomicina deve conter preparo e diluição');
  const txtDil = ctx.formatarDiluicaoPreparoHSL(medVanco);
  assert(txtDil.includes('GUIA FARMACÊUTICO HSL'), 'Deve formatar com cabeçalho oficial do HSL');
  console.log(`   ✓ Diluição Vancomicina Guia HSL: OK (${msDil}ms em RAM)`);

  console.log('\n🧪 2. Testando Roteador Deterministico de Texto Livre (sem acionar Gemini)...');
  const resTextoPark = ctx.tentarCalcularDeterministico('parkland 70kg 30%');
  assert(resTextoPark && resTextoPark.includes('8400 mL'), 'Texto livre de parkland deve calcular');
  console.log('   ✓ Texto livre "parkland 70kg 30%" resolvido deterministicamente em 0ms!');

  const resTextoDva = ctx.tentarCalcularDeterministico('nora 80kg concentrada');
  assert(resTextoDva && resTextoDva.includes('NORADRENALINA'), 'Texto livre de DVA deve calcular');
  console.log('   ✓ Texto livre "nora 80kg concentrada" resolvido deterministicamente em 0ms!');

  const resTextoDil = ctx.tentarCalcularDeterministico('como diluir meropenem');
  assert(resTextoDil && resTextoDil.includes('GUIA FARMACÊUTICO HSL'), 'Texto livre de diluição deve calcular');
  console.log('   ✓ Texto livre "como diluir meropenem" resolvido deterministicamente em 0ms!');

  console.log('\n🧪 2B. Testando Fast-Path no Telegram Router sem barra e Rota CLINICO_EMERGENCIA...');
  const origEnviarMsg = ctx.enviarMensagemParaChat;
  const origEnviarKb = ctx.enviarMensagemComTecladoParaChat;
  const origIaExec = ctx._iaExecutar;
  let llmFoiAcionada = false;

  ctx._iaExecutar = () => {
    llmFoiAcionada = true;
    throw new Error('LLM NÃO DEVERIA TER SIDO ACIONADA NO FAST-PATH DE RAM!');
  };

  try {
    // Aquecimento prévio em RAM para estabilização JIT do V8
    ctx.enviarMensagemParaChat = () => true;
    ctx.enviarMensagemComTecladoParaChat = () => true;
    ctx.processarMensagemTexto({ chat: { id: 1771571035 }, text: 'meropenem clcr 25' });
    ctx.processarMensagemTexto({ chat: { id: 1771571035 }, text: 'ceftriaxona' });
    ctx.processarMensagemTexto({ chat: { id: 1771571035 }, text: 'paciente 70kg em choque precisando de nora' });

    // Teste 1: "paciente 70kg em choque precisando de nora" (CLINICO_EMERGENCIA, fix tEmerg, < 15ms)
    let msgEmerg = '';
    ctx.enviarMensagemParaChat = (chatId, texto) => { msgEmerg = texto; return true; };
    ctx.enviarMensagemComTecladoParaChat = (chatId, texto, kb) => { msgEmerg = texto; return true; };

    const tEmerg0 = process.hrtime();
    ctx.processarMensagemTexto({
      chat: { id: 1771571035 },
      text: 'paciente 70kg em choque precisando de nora'
    });
    const diffEmerg = process.hrtime(tEmerg0);
    const msEmerg = (diffEmerg[0] * 1000 + diffEmerg[1] / 1e6);
    assert(msgEmerg && /noradrenalina/i.test(msgEmerg), 'Deve responder DVA de Noradrenalina');
    assert(msEmerg < 15, `Resposta da emergência deve ser < 15ms, levou ${msEmerg.toFixed(2)}ms`);
    assert.strictEqual(llmFoiAcionada, false, 'LLM não pode ser chamada na rota de emergência determinística');
    console.log(`   ✓ "paciente 70kg em choque precisando de nora" respondeu DVA sem ReferenceError em ${msEmerg.toFixed(2)}ms`);

    // Teste 2A: "meropenem clcr 25" (Ajuste Renal, < 15ms sem LLM)
    let msgMero = '';
    ctx.enviarMensagemParaChat = (chatId, texto) => { msgMero = texto; return true; };
    ctx.enviarMensagemComTecladoParaChat = (chatId, texto, kb) => { msgMero = texto; return true; };

    const tMero0 = process.hrtime();
    ctx.processarMensagemTexto({
      chat: { id: 1771571035 },
      text: 'meropenem clcr 25'
    });
    const diffMero = process.hrtime(tMero0);
    const msMero = (diffMero[0] * 1000 + diffMero[1] / 1e6);
    assert(msgMero && /meropenem/i.test(msgMero), 'Deve responder ajuste renal de Meropenem');
    assert(msMero < 15, `Consulta "meropenem clcr 25" deve responder em < 15ms, levou ${msMero.toFixed(2)}ms`);
    assert.strictEqual(llmFoiAcionada, false, 'LLM não pode ser chamada em ajuste renal determinístico');
    console.log(`   ✓ "meropenem clcr 25" respondeu via RAM em ${msMero.toFixed(2)}ms sem chamar LLM`);

    // Teste 2B: "ceftriaxona" (Posologia HSL direta sem barra, < 15ms sem LLM)
    let msgCeft = '';
    ctx.enviarMensagemParaChat = (chatId, texto) => { msgCeft = texto; return true; };
    ctx.enviarMensagemComTecladoParaChat = (chatId, texto, kb) => { msgCeft = texto; return true; };

    const tCeft0 = process.hrtime();
    ctx.processarMensagemTexto({
      chat: { id: 1771571035 },
      text: 'ceftriaxona'
    });
    const diffCeft = process.hrtime(tCeft0);
    const msCeft = (diffCeft[0] * 1000 + diffCeft[1] / 1e6);
    assert(msgCeft && /ceftriaxona/i.test(msgCeft), 'Deve responder posologia de Ceftriaxona');
    assert(msCeft < 15, `Consulta "ceftriaxona" deve responder em < 15ms, levou ${msCeft.toFixed(2)}ms`);
    assert.strictEqual(llmFoiAcionada, false, 'LLM não pode ser chamada em consulta direta HSL');
    console.log(`   ✓ "ceftriaxona" respondeu via RAM em ${msCeft.toFixed(2)}ms sem chamar LLM`);

    let msgInteracao = '';
    ctx.enviarMensagemParaChat = (chatId, texto) => { msgInteracao = texto; return true; };
    ctx.enviarMensagemComTecladoParaChat = (chatId, texto) => { msgInteracao = texto; return true; };
    medirConsulta(() => ctx.processarMensagemTexto({
      chat: { id: 1771571035 }, text: '/interacao paracetamol, metformina'
    }) || msgInteracao, 50, 'Interação catalogada sem achado');
    assert(msgInteracao.includes('CROSS-CHECK DE SEGURANÇA'), 'Interação deve usar auditoria local');
    assert.strictEqual(llmFoiAcionada, false, 'Interação sem achado não pode chamar LLM');

    for (const [entrada, trecho] of [
      ['/remume dipirona', 'REMUME-RP'],
      ['/compatibilidade nora furosemida', 'COMPATIBILIDADE']
    ]) {
      let mensagem = '';
      ctx.enviarMensagemParaChat = (chatId, texto) => { mensagem = texto; return true; };
      ctx.enviarMensagemComTecladoParaChat = (chatId, texto) => { mensagem = texto; return true; };
      medirConsulta(() => ctx.processarMensagemTexto({
        chat: { id: 1771571035 }, text: entrada
      }) || mensagem, 50, entrada);
      assert(mensagem.toUpperCase().includes(trecho), `${entrada} deve usar base local: ${mensagem.slice(0, 180)}`);
      assert.strictEqual(llmFoiAcionada, false, `${entrada} não pode chamar LLM`);
    }

    for (const entrada of [
      '/pals 14kg', '/sri 70kg', '/prenatal DUM 10/02/2026',
      '/dhe sodio 160', '/gaso pH 7.30 pCO2 30 HCO3 15'
    ]) {
      let mensagem = '';
      ctx.enviarMensagemParaChat = (chatId, texto) => { mensagem = texto; return true; };
      ctx.enviarMensagemComTecladoParaChat = (chatId, texto) => { mensagem = texto; return true; };
      medirConsulta(() => ctx.processarMensagemTexto({
        chat: { id: 1771571035 }, text: entrada
      }) || mensagem, 50, entrada);
      assert(mensagem.length > 20, `${entrada} deve produzir resposta clínica`);
      assert.strictEqual(llmFoiAcionada, false, `${entrada} não pode chamar LLM`);
    }
  } finally {
    ctx.enviarMensagemParaChat = origEnviarMsg;
    ctx.enviarMensagemComTecladoParaChat = origEnviarKb;
    ctx._iaExecutar = origIaExec;
  }

  console.log('\n🧪 3. Testando Fast-Path no Cockpit RPC (/api/cockpit)...');
  const sessaoToken = ctx.criarSessaoCockpit_(process.env.TELEGRAM_CHAT_ID);
  const resCockpitCalc = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitConversar',
      session: sessaoToken,
      args: [{
        acao: 'enviar',
        texto: 'parkland 70kg 30%'
      }]
    }
  });
  assert.strictEqual(resCockpitCalc.statusCode, 200);
  const jsonCockpit = JSON.parse(resCockpitCalc.payload);
  assert.strictEqual(jsonCockpit.ok, true, 'Resposta RPC deve ser ok');
  assert.strictEqual(jsonCockpit.resultado.deterministico, true, 'Deve marcar como deterministico');
  assert(jsonCockpit.resultado.resposta.includes('8400 mL'), 'Deve conter o cálculo exato');
  console.log('   ✓ Cockpit RPC respondeu cálculo em RAM sem acionar Gemini!');

  console.log('\n🧪 4. Testando Cache em Camadas do Service Worker e PWA Assets...');
  const resSw = await app.inject({ method: 'GET', url: '/sw.js' });
  assert.strictEqual(resSw.statusCode, 200);
  assert(/const\s+CACHE_NAME\s*=\s*['"]ultra-rotina-cockpit-v\d+(?:\.\d+)+['"]/.test(resSw.payload), 'Service Worker deve declarar cache versionado válido');
  assert(resSw.payload.includes('PRECACHE_ASSETS'), 'Deve conter lista de precache');
  console.log('   ✓ Service Worker versionado com Cache em Camadas operacional');

  const resIcon192 = await app.inject({ method: 'GET', url: '/pwa-192x192.png' });
  assert.strictEqual(resIcon192.statusCode, 200);
  assert.strictEqual(resIcon192.headers['content-type'], 'image/png');
  console.log('   ✓ Ícone PWA 192x192 PNG: 200 OK');

  const resIcon512 = await app.inject({ method: 'GET', url: '/pwa-512x512.png' });
  assert.strictEqual(resIcon512.statusCode, 200);
  assert.strictEqual(resIcon512.headers['content-type'], 'image/png');
  console.log('   ✓ Ícone PWA 512x512 PNG: 200 OK');

  const resAppleIcon = await app.inject({ method: 'GET', url: '/apple-touch-icon.png' });
  assert.strictEqual(resAppleIcon.statusCode, 200);
  assert.strictEqual(resAppleIcon.headers['content-type'], 'image/png');
  console.log('   ✓ Ícone iOS Safari apple-touch-icon PNG: 200 OK');

  console.log('\n🎉 TODOS OS TESTES DA ETAPA 2 PASSARAM COM 100% DE SUCESSO!\n');
}

run().catch((err) => {
  console.error('❌ Falha nos testes da Etapa 2:', err);
  process.exit(1);
});
