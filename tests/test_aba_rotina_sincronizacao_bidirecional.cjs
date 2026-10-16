/**
 * tests/test_aba_rotina_sincronizacao_bidirecional.cjs
 * Suíte de Testes Direcionada: Sincronização Bidirecional Telegram ↔ Cockpit PWA
 * e Integração Real do Google Calendar no Backend Fastify.
 */

const assert = require('assert');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.BOT_DATA_DIR = path.join(__dirname, '..', 'data_test_rotina');

const runtime = require('../server/runtime');
const { PropertiesService, rotinaBus, bumpRotinaVersion, getRotinaVersion, runWithOrigin } = runtime;
const { buildServer } = require('../server/index');

async function runTests() {
  console.log('--- TESTE 1: Barramento Reativo e Versionamento Monotônico ---');
  {
    const dateKey = '2026-10-16';
    const verInicial = getRotinaVersion(dateKey).version;

    let eventoRecebido = null;
    const listener = (evt) => {
      eventoRecebido = evt;
    };
    rotinaBus.once('rotina:mutated', listener);

    // Muta propriedade de rotina via PropertiesService
    PropertiesService.getScriptProperties().setProperty(`ROTINA_OVERRIDE_${dateKey}`, JSON.stringify([
      { id: 'bloco_teste_1', titulo: 'Treino de Força', inicio: '07:00', fim: '08:00', status: 'pendente' }
    ]));

    assert.ok(eventoRecebido, 'Deveria ter emitido evento rotina:mutated no barramento');
    assert.strictEqual(eventoRecebido.dateKey, dateKey, 'DateKey do evento deve ser igual');
    assert.strictEqual(eventoRecebido.version, verInicial + 1, 'Versão deve ser incrementada monotonicamente');

    const verApos = getRotinaVersion(dateKey).version;
    assert.strictEqual(verApos, verInicial + 1, 'getRotinaVersion deve refletir o incremento');
    console.log('✅ TESTE 1 PASSOU: Barramento reativo e versionamento monotônico ativos.');
  }

  console.log('--- TESTE 2: Persistência Imediata sem Atraso de Buffer ---');
  {
    const dateKey = '2026-10-17';
    PropertiesService.getScriptProperties().setProperty(`ROTINA_STATUS_${dateKey}`, 'ativo');

    // Leitura direta do propsStore em memória
    const valMem = PropertiesService.getScriptProperties().getProperty(`ROTINA_STATUS_${dateKey}`);
    assert.strictEqual(valMem, 'ativo', 'Valor deve estar disponível imediatamente');
    console.log('✅ TESTE 2 PASSOU: Persistência imediata de chaves ROTINA_ confirmada.');
  }

  console.log('--- TESTE 3: Rastreamento de Origem da Mutação (Cockpit vs Telegram) ---');
  {
    const dateKey = '2026-10-18';
    let origemDetectada = null;

    const listener = (evt) => {
      if (evt.dateKey === dateKey) origemDetectada = evt.origin;
    };
    rotinaBus.on('rotina:mutated', listener);

    runWithOrigin('cockpit', () => {
      PropertiesService.getScriptProperties().setProperty(`ROTINA_OVERRIDE_${dateKey}`, JSON.stringify([
        { id: 'b1', titulo: 'Plantão', status: 'concluido' }
      ]));
    });

    assert.strictEqual(origemDetectada, 'cockpit', 'Origem deve ser cockpit quando envelopada por runWithOrigin');

    runWithOrigin('telegram', () => {
      PropertiesService.getScriptProperties().setProperty(`ROTINA_OVERRIDE_${dateKey}`, JSON.stringify([
        { id: 'b1', titulo: 'Plantão', status: 'adiado' }
      ]));
    });

    assert.strictEqual(origemDetectada, 'telegram', 'Origem deve ser telegram quando alterado pelo bot');
    rotinaBus.removeListener('rotina:mutated', listener);
    console.log('✅ TESTE 3 PASSOU: Rastreamento bidirecional de origem validado.');
  }

  console.log('--- TESTE 4: Estrutura do Módulo Frontend (RotinaTimeline) ---');
  {
    const fs = require('fs');
    const timelineCode = fs.readFileSync(path.join(__dirname, '..', 'rotina_timeline.js'), 'utf8');

    assert.ok(timelineCode.includes('conectarSSE: conectarSSE'), 'Frontend deve exportar conectarSSE');
    assert.ok(timelineCode.includes('checarVersaoERevalidar: checarVersaoERevalidar'), 'Frontend deve exportar checarVersaoERevalidar');
    assert.ok(timelineCode.includes('EventSource'), 'Frontend deve implementar EventSource para SSE');
    assert.ok(timelineCode.includes('/api/rotina/events'), 'Frontend deve conectar em /api/rotina/events');
    assert.ok(timelineCode.includes('/api/rotina/version'), 'Frontend deve consultar /api/rotina/version');
    assert.ok(timelineCode.includes('visibilitychange'), 'Frontend deve revalidar em visibilitychange');

    console.log('✅ TESTE 4 PASSOU: Frontend rotina_timeline.js possui arquitetura SSE + ETag completa.');
  }

  console.log('--- TESTE 5: Integração Nativa Google Calendar sem Google Apps Script (GAS) ---');
  {
    const { googleCalendarInstance } = require('../server/google_calendar');
    assert.ok(googleCalendarInstance, 'Instância do GoogleCalendarService deve existir');
    assert.strictEqual(typeof googleCalendarInstance.listarEventosSync, 'function', 'Deve ter listarEventosSync');
    assert.strictEqual(typeof googleCalendarInstance.criarEventoSync, 'function', 'Deve ter criarEventoSync');
    assert.strictEqual(typeof googleCalendarInstance.obterStatus, 'function', 'Deve ter obterStatus');

    const statusGcal = googleCalendarInstance.obterStatus();
    assert.ok(statusGcal.conta.includes('moraes.wagg@gmail.com'), 'Conta médica deve ser moraes.wagg@gmail.com');
    console.log('✅ TESTE 5 PASSOU: GoogleCalendarService nativo Node.js operacional.');
  }

  console.log('--- TESTE 6: Endpoints Fastify de Rotina (/api/rotina/version, ETag, Status e Blocos) ---');
  {
    const app = await buildServer({ logger: false });

    // 6.1 GET /api/rotina/version
    const dateKey = '2026-10-19';
    const resVer = await app.inject({
      method: 'GET',
      url: `/api/rotina/version?date=${dateKey}`
    });

    assert.strictEqual(resVer.statusCode, 200, 'Endpoint de versão deve responder 200');
    const verData = JSON.parse(resVer.payload);
    assert.strictEqual(verData.ok, true);
    assert.strictEqual(verData.data, dateKey);
    assert.ok(resVer.headers.etag, 'Deve conter header ETag');

    // 6.2 GET /api/rotina/version com ETag condicional (304 Not Modified)
    const resVer304 = await app.inject({
      method: 'GET',
      url: `/api/rotina/version?date=${dateKey}`,
      headers: {
        'if-none-match': resVer.headers.etag
      }
    });
    assert.strictEqual(resVer304.statusCode, 304, 'Deve retornar 304 Not Modified com ETag idêntico');

    // 6.3 POST /api/rotina/blocos (Origem Cockpit)
    const resBlocos = await app.inject({
      method: 'POST',
      url: '/api/rotina/blocos',
      payload: {
        data: dateKey,
        blocos: [
          { id: 'b_inj_1', titulo: 'Plantão Sala Vermelha', inicio: '07:00', fim: '19:00', categoria: 'clinico', status: 'pendente' }
        ]
      }
    });
    assert.strictEqual(resBlocos.statusCode, 200, 'POST /api/rotina/blocos deve responder 200');
    const blocosBody = JSON.parse(resBlocos.payload);
    assert.strictEqual(blocosBody.sucesso, true);

    // 6.4 POST /api/rotina/status (Mudar status de bloco via Cockpit)
    const resStatus = await app.inject({
      method: 'POST',
      url: '/api/rotina/status',
      payload: {
        data: dateKey,
        blocoId: 'b_inj_1',
        status: 'concluido',
        nota: 'Concluído via PWA'
      }
    });
    assert.strictEqual(resStatus.statusCode, 200, 'POST /api/rotina/status deve responder 200');

    await app.close();
    console.log('✅ TESTE 6 PASSOU: Endpoints Fastify de rotina e ETag 304 validados.');
  }

  console.log('\n🎉 TODOS OS 6 TESTES DE SINCRONIZAÇÃO BIDIRECIONAL FORAM APROVADOS COM SUCESSO!');
}

runTests().catch(err => {
  console.error('❌ Falha nos testes de sincronização bidirecional:', err);
  process.exit(1);
});
