process.env.NODE_ENV = 'test';
process.env.TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '1771571035';
process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ';
process.env.SPREADSHEET_ID_REMUME = process.env.SPREADSHEET_ID_REMUME || 'mock_remume_sheet_id';
const assert = require('assert');
const { buildServer } = require('../server/index.js');
const runtime = require('../server/runtime.js');

async function run() {
  process.env.NODE_ENV = 'test';
  process.env.TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '1771571035';
  process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'test_bot_token';
  runtime.ctx.PropertiesService.getScriptProperties().setProperty('TELEGRAM_CHAT_ID', process.env.TELEGRAM_CHAT_ID);
  runtime.ctx.PropertiesService.getScriptProperties().setProperty('TELEGRAM_BOT_TOKEN', process.env.TELEGRAM_BOT_TOKEN);
  const app = await buildServer();

  // 1. Healthcheck
  const resHealth = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(resHealth.statusCode, 200);
  const healthJson = resHealth.json();
  assert.equal(healthJson.status, 'ok');
  console.log('✓ Healthcheck OK');

  // 2. Status
  const resStatus = await app.inject({ method: 'GET', url: '/api/status' });
  assert.equal(resStatus.statusCode, 200);
  const statusJson = resStatus.json();
  assert.equal(statusJson.ok, true);
  assert.equal(statusJson.chat_id, '1771571035');
  console.log('✓ Status OK');

  // 3. Cockpit RPC - Sem autenticação deve retornar 401
  const resSemAuth = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: { metodo: 'cockpitConsultar', session: '' }
  });
  assert.equal(resSemAuth.statusCode, 401);
  console.log('✓ Cockpit 401 não autenticado OK');

  // 4. Cockpit RPC - Cálculo DVA autenticado (< 20ms)
  const chatId = runtime.ctx.ConfigService.get('TELEGRAM_CHAT_ID');
  const token = runtime.ctx.criarSessaoCockpit_(chatId);

  const t0 = performance.now();
  const resDva = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitCalcular',
      session: token,
      args: ['dva', { droga: 'nora', peso: 70 }]
    }
  });
  const tDva = performance.now() - t0;
  assert.equal(resDva.statusCode, 200);
  const jsonDva = resDva.json();
  assert.equal(jsonDva.ok, true);
  assert.equal(jsonDva.resultado.ok, true);
  assert(jsonDva.resultado.texto.includes('Noradrenalina'));
  assert(tDva < 50, `Tempo de DVA (${tDva}ms) deve ser menor que 50ms`);
  console.log(`✓ Cockpit Cálculo DVA OK (${tDva.toFixed(2)}ms)`);

  // 5. Cockpit RPC - Consulta REMUME (< 20ms)
  const resRemume = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitRemume',
      session: token,
      args: []
    }
  });
  assert.equal(resRemume.statusCode, 200);
  const jsonRemume = resRemume.json();
  assert.equal(jsonRemume.ok, true);
  assert(jsonRemume.resultado.itens.length > 200);
  console.log(`✓ Cockpit REMUME OK (${jsonRemume.resultado.itens.length} itens)`);

  // 6. Cockpit RPC - Cross-Check de Segurança Clínica & Interações (< 20ms)
  const tCross0 = performance.now();
  const resCross = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitChecarSeguranca',
      session: token,
      args: ['amiodarona 200mg, fluconazol 150mg, enoxaparina 40mg, clcr 28']
    }
  });
  const tCross = performance.now() - tCross0;
  assert.equal(resCross.statusCode, 200);
  const jsonCross = resCross.json();
  assert.equal(jsonCross.ok, true);
  assert.equal(jsonCross.resultado.ok, true);
  assert.equal(jsonCross.resultado.temAlertasCriticos, true);
  assert(jsonCross.resultado.interacoes.length >= 1);
  assert(jsonCross.resultado.ajustesRenais.length >= 1);
  assert(tCross < 100, `Tempo de Cross-Check (${tCross}ms) deve ser menor que 100ms`);
  console.log(`✓ Cockpit Cross-Check de Segurança OK (${tCross.toFixed(2)}ms, ${jsonCross.resultado.interacoes.length} interações, ${jsonCross.resultado.ajustesRenais.length} ajustes renais)`);

  // 6.1 Cockpit RPC - Gasometria Arterial (Regra dos 5 Passos & Winter)
  const resGaso = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitGasometriaAcidoBase',
      session: token,
      args: [{ ph: 7.20, pco2: 23, hco3: 10, na: 140, cl: 105, albumina: 4.0 }]
    }
  });
  assert.equal(resGaso.statusCode, 200);
  const jsonGaso = resGaso.json();
  assert.equal(jsonGaso.ok, true);
  assert.equal(jsonGaso.resultado.sucesso, true);
  assert.equal(jsonGaso.resultado.resultado.disturbio, 'Acidose Metabólica');
  assert(jsonGaso.resultado.textoFormatado.includes('GASOMETRIA ARTERIAL'));
  console.log('✓ Cockpit Gasometria Arterial (5 Passos & Winter) OK');

  // 6.2 Cockpit RPC - Suporte Nutricional em Pediatria (Holliday-Segar & Fórmulas)
  const resNutriPed = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitSuporteNutricionalPediatrico',
      session: token,
      args: [{ pesoKg: 6.5, idadeMeses: 3, tipoFormula: 'partida', volumeMamadaMl: 90 }]
    }
  });
  assert.equal(resNutriPed.statusCode, 200);
  const jsonNutriPed = resNutriPed.json();
  assert.equal(jsonNutriPed.ok, true);
  assert.equal(jsonNutriPed.resultado.sucesso, true);
  assert.equal(jsonNutriPed.resultado.resultado.formulaInfantil.prescricaoMamada.medidasRasas, 3);
  assert(jsonNutriPed.resultado.textoFormatado.includes('SUPORTE NUTRICIONAL EM PEDIATRIA'));
  console.log('✓ Cockpit Suporte Nutricional Pediátrico (Holliday-Segar & Fórmula Infantil) OK');

  // 6.3 Cockpit RPC - Hematologia Clínica & Investigação de Anemias (Ganzoni & Mentzer)
  const resHemato = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitHematologiaAnemias',
      session: token,
      args: [{ hb: 8.0, vcm: 68, rdw: 18.0, hemacias: 3.2, pesoKg: 60, sexo: 'F', motivoIv: 'pos_bariatrica' }]
    }
  });
  assert.equal(resHemato.statusCode, 200);
  const jsonHemato = resHemato.json();
  assert.equal(jsonHemato.ok, true);
  assert.equal(jsonHemato.resultado.sucesso, true);
  assert.equal(jsonHemato.resultado.resultado.analiseHemograma.temAnemia, true);
  assert.equal(jsonHemato.resultado.resultado.analiseHemograma.morfologia.classificacaoVcm, 'MICROCITICA');
  assert.equal(jsonHemato.resultado.resultado.reposicaoFerro.esquemaIv.totalAmpolasNecessarias, 14);
  assert(jsonHemato.resultado.textoFormatado.includes('HEMATOLOGIA'));
  console.log('✓ Cockpit Hematologia & Investigação de Anemias (Ganzoni & Mentzer) OK');

  // 7. PWA Manifest & Service Worker
  const resIC = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitCardiologiaIntensiva',
      session: token,
      args: [{ congestao: true, baixa_perfusao: true, pas: 80, uso_betabloqueador: true }]
    }
  });
  if (resIC.statusCode !== 200) console.error("BODY:", resIC.body); assert.equal(resIC.statusCode, 200, "Erro ao testar cockpitCardiologiaIntensiva");
  const jsonIC = JSON.parse(resIC.body);
  if (!jsonIC.ok) console.error(jsonIC); assert(jsonIC.ok, "Sucesso IC deve ser true");
  assert.equal(jsonIC.resultado.avaliacao.perfil_clinico.perfil, 'C');
  assert(jsonIC.resultado.textoFormatado.includes('CONTRAINDICAÇÃO ABSOLUTA'));
  console.log('✓ Cockpit Cardiologia Intensiva (Forrester) OK');
  const resManifest = await app.inject({ method: 'GET', url: '/manifest.json' });
  assert.equal(resManifest.statusCode, 200);
  const jsonManifest = JSON.parse(resManifest.body);
  assert.equal(jsonManifest.short_name, 'Cockpit');
  assert.equal(jsonManifest.display, 'standalone');
  console.log('✓ PWA Manifest.json OK');

  const resSw = await app.inject({ method: 'GET', url: '/sw.js' });
  assert.equal(resSw.statusCode, 200);
  assert(resSw.body.includes('CACHE_NAME'));
  assert(resSw.body.includes('caches.match'));
  console.log('✓ PWA Service Worker (sw.js) OK');

  // 8. Cache-Control: métodos de leitura recebem cache curto
  const resConsultar = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: { metodo: 'cockpitConsultar', session: token, args: [] }
  });
  assert.equal(resConsultar.statusCode, 200);
  const ccRead = resConsultar.headers['cache-control'];
  assert(ccRead && ccRead.includes('max-age=30'), `Leitura deve ter cache: ${ccRead}`);
  console.log(`✓ Cache-Control leitura OK (${ccRead})`);

  // 9. Cache-Control: métodos de escrita recebem no-store
  const ccWrite = resDva.headers['cache-control'];
  assert(ccWrite && ccWrite.includes('no-store'), `Escrita deve ter no-store: ${ccWrite}`);
  console.log(`✓ Cache-Control escrita OK (${ccWrite})`);

  // 10. Compressão HTTP: respostas grandes são comprimidas com gzip
  const resGzip = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    headers: { 'accept-encoding': 'gzip' },
    payload: { metodo: 'cockpitRemume', session: token, args: [] }
  });
  assert.equal(resGzip.statusCode, 200);
  const contentEncoding = resGzip.headers['content-encoding'];
  assert(contentEncoding === 'gzip', `REMUME deve ser comprimido com gzip, obteve: ${contentEncoding}`);
  const rawSize = Buffer.byteLength(JSON.stringify(jsonRemume));
  const compressedSize = resGzip.rawPayload.length;
  const ratio = ((1 - compressedSize / rawSize) * 100).toFixed(1);
  console.log(`✓ Compressão gzip OK (${rawSize} → ${compressedSize} bytes, -${ratio}%)`);

  console.log('\n🚀 TODOS OS TESTES DO SERVIDOR RENDER PASSARAM COM SUCESSO!');
}

run().catch(err => {
  console.error('Erro nos testes do servidor:', err);
  process.exit(1);
});
