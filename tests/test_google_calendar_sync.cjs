// -*- coding: utf-8 -*-
/**
 * Testes automatizados da integração viva com o Google Calendar (moraes.wagg@gmail.com)
 * e das rotas REST dedicadas da Aba Rotina no Fastify.
 */

const assert = require('assert');
const path = require('path');
const { GoogleCalendarService, googleCalendarInstance } = require('../server/google_calendar.js');
const runtime = require('../server/runtime.js');
const { buildServer } = require('../server/index.js');

async function runTests() {
  console.log('Iniciando testes da sincronização com Google Calendar (moraes.wagg@gmail.com)...');

  // Teste 1: Instância do serviço e leitura de credenciais
  const status = googleCalendarInstance.obterStatus();
  console.log('Status da Conexão:', status);
  assert.strictEqual(status.conta, 'moraes.wagg@gmail.com', 'Conta deve ser moraes.wagg@gmail.com');
  assert.strictEqual(status.conectado, true, 'Serviço deve estar conectado com credenciais válidas');
  assert.strictEqual(status.tokenValido, true, 'Token deve ser válido');
  console.log('✓ Teste 1: Credenciais e status do Google Calendar válidos para moraes.wagg@gmail.com');

  // Teste 2: Listagem de eventos reais da agenda médica
  const hoje = new Date();
  const proximaSemana = new Date(hoje.getTime() + (7 * 24 * 60 * 60 * 1000));
  const eventosSync = googleCalendarInstance.listarEventosSync(hoje, proximaSemana);
  assert(Array.isArray(eventosSync), 'listarEventosSync deve retornar array');
  assert(eventosSync.length > 0, 'Deve retornar eventos reais sincronizados da agenda médica');
  
  const primeiroEv = eventosSync[0];
  assert.strictEqual(typeof primeiroEv.getTitle(), 'string', 'Evento deve ter título');
  assert(primeiroEv.getStartTime() instanceof Date, 'Horário inicial deve ser Date');
  assert(primeiroEv.getEndTime() instanceof Date, 'Horário final deve ser Date');
  console.log(`✓ Teste 2: Leitura síncrona com sucesso (${eventosSync.length} eventos nos próximos 7 dias)`);

  // Teste 3: Leitura assíncrona
  const eventosAsync = await googleCalendarInstance.listarEventosAsync(hoje, proximaSemana);
  assert(Array.isArray(eventosAsync), 'listarEventosAsync deve retornar array');
  assert.strictEqual(eventosAsync.length, eventosSync.length, 'Leitura async e sync devem retornar a mesma contagem');
  console.log('✓ Teste 3: Leitura assíncrona com sucesso e paridade de dados');

  // Teste 4: Integração no Runtime e RotinaService
  assert(runtime.ctx.CalendarApp, 'CalendarApp deve estar injetado no runtime');
  assert.strictEqual(typeof runtime.ctx.CalendarApp.getDefaultCalendar, 'function');
  
  const blocosDoDia = runtime.ctx.RotinaService.obterBlocosDoDia(hoje);
  assert(Array.isArray(blocosDoDia), 'RotinaService.obterBlocosDoDia deve retornar array');
  console.log(`✓ Teste 4: RotinaService carregou ${blocosDoDia.length} blocos hoje via Google Calendar`);

  // Teste 5: Isolamento de mocks de teste (garante que testes legados funcionem)
  const mockEvs = [{
    getId: () => 'mock-1',
    getTitle: () => 'Plantão Mock UTI',
    getStartTime: () => new Date(),
    getEndTime: () => new Date(Date.now() + 3600000),
    isAllDayEvent: () => false,
    getLocation: () => 'Sala 4',
    getDescription: () => 'Teste'
  }];
  runtime.ctx.CalendarApp._setMockEventos(mockEvs);
  const evsMockados = runtime.ctx.CalendarApp.getDefaultCalendar().getEvents(new Date(), new Date());
  assert.strictEqual(evsMockados.length, 1, 'Deve respeitar mock quando _setMockEventos for usado');
  assert.strictEqual(evsMockados[0].getTitle(), 'Plantão Mock UTI');
  
  // Limpa mock para voltar ao Google Calendar real
  runtime.ctx.CalendarApp._setMockEventos(null);
  console.log('✓ Teste 5: Isolamento seguro de mocks para testes unitários preservado');

  // Teste 5.1: Sincronia de temas reais e reagendamento com updateEvent em modo offline/mock
  const temaRealMedQuest = '[MedQuest] ✍️ Nefrologia: Glomerulopatias e IRA';
  const mockEvsRotina = [{
    getId: () => 'medquest-ev-42',
    getTitle: () => temaRealMedQuest,
    getStartTime: () => new Date(2026, 9, 14, 19, 0, 0),
    getEndTime: () => new Date(2026, 9, 14, 20, 30, 0),
    isAllDayEvent: () => false,
    getLocation: () => 'Home Office / Anki',
    getDescription: () => 'Bloco focado em questões comentadas'
  }];
  runtime.ctx.CalendarApp._setMockEventos(mockEvsRotina);
  const dataTeste = new Date(2026, 9, 14, 12, 0, 0);
  runtime.ctx.RotinaService.resetarBlocosDoDia(dataTeste);

  const blocosImportados = runtime.ctx.RotinaService.obterBlocosDoDia(dataTeste);
  assert(blocosImportados.length > 0, 'Deve importar evento mockado da agenda');
  const blocoMq = blocosImportados.find(b => b.googleEventId === 'medquest-ev-42');
  assert(blocoMq, 'Bloco deve conter googleEventId medquest-ev-42');
  assert.strictEqual(blocoMq.titulo, temaRealMedQuest, 'Deve refletir o tema real com precisão');
  assert.strictEqual(blocoMq.inicio, '19:00');
  assert.strictEqual(blocoMq.fim, '20:30');

  // Adiar bloco em +30m
  const resAdiarMq = runtime.ctx.RotinaService.adiarProximoBloco(dataTeste, 30, 'medquest-ev-42');
  assert.strictEqual(resAdiarMq.sucesso, true);
  assert.strictEqual(resAdiarMq.modificado, true);
  assert.strictEqual(resAdiarMq.sincronizadoGoogle, true, 'Deve ter sincronizado via updateEvent no adaptador mock');
  assert.strictEqual(resAdiarMq.bloco.inicio, '19:30', 'Horário inicial deve ser adiado para 19:30');
  assert.strictEqual(resAdiarMq.bloco.fim, '21:00', 'Horário final deve ser adiado para 21:00');
  assert.strictEqual(resAdiarMq.bloco.titulo, temaRealMedQuest, 'Deve preservar o tema real');

  // Limpa mock para voltar ao Google Calendar real
  runtime.ctx.CalendarApp._setMockEventos(null);
  console.log('✓ Teste 5.1: Sincronia de temas reais e reagendamento seguro com updateEvent offline validado');

  // Teste 5.2: Autoridade soberana do Google Calendar para ajustes de horários e exclusão automática
  const mockEvsAjustados = [{
    getId: () => 'medquest-ev-42',
    getTitle: () => temaRealMedQuest,
    getStartTime: () => new Date(2026, 9, 14, 21, 0, 0), // Ajustado pelo usuário no Google Calendar para 21:00
    getEndTime: () => new Date(2026, 9, 14, 22, 30, 0),
    isAllDayEvent: () => false,
    getLocation: () => 'Home Office',
    getDescription: () => 'Horário reajustado no Calendar'
  }];
  runtime.ctx.CalendarApp._setMockEventos(mockEvsAjustados);
  const blocosReajustados = runtime.ctx.RotinaService.obterBlocosDoDia(dataTeste);
  const blocoReajustado = blocosReajustados.find(b => b.googleEventId === 'medquest-ev-42');
  assert(blocoReajustado, 'Bloco deve existir');
  assert.strictEqual(blocoReajustado.inicio, '21:00', 'Horário do Google Calendar deve prevalecer soberanamente');
  assert.strictEqual(blocoReajustado.fim, '22:30', 'Horário final do Google Calendar deve prevalecer');

  // Teste 5.3: Exclusão de evento no Google Calendar (não ressuscita bloco excluído)
  runtime.ctx.CalendarApp._setMockEventos([]); // Usuário deletou o evento no Google Calendar
  const blocosAposExclusao = runtime.ctx.RotinaService.obterBlocosDoDia(dataTeste);
  const blocoExcluido = blocosAposExclusao.find(b => b.googleEventId === 'medquest-ev-42');
  assert.strictEqual(blocoExcluido, undefined, 'Evento excluído do Google Calendar não deve ser ressuscitado do cache');
  runtime.ctx.CalendarApp._setMockEventos(null);
  console.log('✓ Teste 5.2 e 5.3: Ajustes e exclusões diretas no Google Calendar refletem automaticamente');

  // Teste 6: Inicialização do servidor Fastify e endpoints REST
  const app = await buildServer({ logger: false });

  // 6.1 GET /api/rotina/calendar/status
  const resStatus = await app.inject({
    method: 'GET',
    url: '/api/rotina/calendar/status'
  });
  assert.strictEqual(resStatus.statusCode, 200);
  const jsonStatus = resStatus.json();
  assert.strictEqual(jsonStatus.ok, true);
  assert.strictEqual(jsonStatus.status.conta, 'moraes.wagg@gmail.com');
  console.log('✓ Teste 6.1: Endpoint /api/rotina/calendar/status validado');

  // 6.2 GET /api/rotina/blocos
  const resBlocos = await app.inject({
    method: 'GET',
    url: '/api/rotina/blocos'
  });
  assert.strictEqual(resBlocos.statusCode, 200);
  const jsonBlocos = resBlocos.json();
  assert.strictEqual(jsonBlocos.ok, true);
  assert(Array.isArray(jsonBlocos.blocos));
  console.log(`✓ Teste 6.2: Endpoint /api/rotina/blocos retornou ${jsonBlocos.blocos.length} blocos`);

  // 6.3 POST /api/rotina/status
  if (jsonBlocos.blocos.length > 0) {
    const alvo = jsonBlocos.blocos[0];
    const resModStatus = await app.inject({
      method: 'POST',
      url: '/api/rotina/status',
      payload: {
        blocoId: alvo.id,
        status: 'concluido',
        nota: 'Realizado com excelência beira-leito'
      }
    });
    assert.strictEqual(resModStatus.statusCode, 200);
    const jsonModStatus = resModStatus.json();
    assert.strictEqual(jsonModStatus.ok, true);
    const blocoAtualizado = jsonModStatus.blocos.find(b => b.id === alvo.id);
    assert(blocoAtualizado, 'Bloco deve existir na lista atualizada');
    assert.strictEqual(blocoAtualizado.status, 'concluido');
    console.log('✓ Teste 6.3: Endpoint /api/rotina/status marcou bloco como concluído com sucesso');
  }

  // 6.4 POST /api/rotina/agenda/sync
  const resSync = await app.inject({
    method: 'POST',
    url: '/api/rotina/agenda/sync',
    payload: {}
  });
  assert.strictEqual(resSync.statusCode, 200);
  const jsonSync = resSync.json();
  assert.strictEqual(jsonSync.ok, true);
  assert.strictEqual(jsonSync.sincronizado, true);
  console.log(`✓ Teste 6.4: Endpoint /api/rotina/agenda/sync sincronizou ${jsonSync.total} blocos da agenda`);

  // 6.5 GET /api/rotina/resumo
  const resResumo = await app.inject({
    method: 'GET',
    url: '/api/rotina/resumo'
  });
  assert.strictEqual(resResumo.statusCode, 200);
  const jsonResumo = resResumo.json();
  assert.strictEqual(jsonResumo.ok, true);
  assert(jsonResumo.resumo.includes('AGENDA SEMANAL SINCRONIZADA'));
  console.log('✓ Teste 6.5: Endpoint /api/rotina/resumo retornou resumo semanal sincronizado');

  await app.close();
  console.log('\n🎉 TODOS OS TESTES DA SINCRONIZAÇÃO COM O GOOGLE CALENDAR FORAM APROVADOS!');
}

runTests().catch(err => {
  console.error('Falha nos testes de sincronização com Google Calendar:', err);
  process.exit(1);
});
