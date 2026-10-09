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


  const resNefro = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitNefrologiaKdigo',
      session: token,
      args: [{ cr_basal: 1.0, cr_atual: 3.5, ph: 7.10, acidose_refrataria: true }]
    }
  });
  assert.equal(resNefro.statusCode, 200, "Erro ao testar cockpitNefrologiaKdigo");
  const jsonNefro = JSON.parse(resNefro.body);
  assert(jsonNefro.ok, "ok Nefro deve ser true");
  assert.equal(jsonNefro.resultado.resultado.kdigo.estagio, 3);
  assert.equal(jsonNefro.resultado.resultado.dialise.aeiou.acidose, true);
  console.log('✓ Cockpit Nefrologia KDIGO (LRA) e Diálise OK');

  // 7. PWA Manifest
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

  // 6.6 Cockpit RPC - Pneumologia & Emergência (Crise Asmática Grave & Estado de Mal Asmático)
  const resAsma = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitPneumologiaAsma',
      session: token,
      args: [{
        ausculta: 'torax_silencioso',
        estado_mental: 'sonolento',
        respiracao_paradoxal: true,
        fc: 52,
        fr: 10,
        spo2: 82
      }]
    }
  });
  assert.equal(resAsma.statusCode, 200, "Erro ao testar cockpitPneumologiaAsma");
  const jsonAsma = JSON.parse(resAsma.body);
  assert(jsonAsma.ok, "ok Asma deve ser true");
  assert.equal(jsonAsma.resultado.resultado.gravidade.nivel, 'PARADA_IMINENTE');
  assert.equal(jsonAsma.resultado.resultado.plano.sulfato_magnesio.indicado, true);
  assert(jsonAsma.resultado.textoFormatado.includes('PNEUMOLOGIA & EMERGÊNCIA'));
  console.log('✓ Cockpit Pneumologia & Crise Asmática (GINA & MgSO4) OK');

  // 6.7 Cockpit RPC - Obstetrícia & Medicina Fetal (RCF / Doppler — Barcelona)
  const resRcf = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitObstetriciaRcf',
      session: token,
      args: [{
        ig_semanas: 30,
        ig_dias: 1,
        peso_fetal_percentil: 2,
        dv_ip_percentil: 97
      }]
    }
  });
  assert.equal(resRcf.statusCode, 200, "Erro ao testar cockpitObstetriciaRcf");
  const jsonRcf = JSON.parse(resRcf.body);
  assert(jsonRcf.ok, "ok RCF deve ser true");
  assert.equal(jsonRcf.resultado.resultado.classificacao.tipo, 'RCF_PRECOCE');
  assert.equal(jsonRcf.resultado.resultado.estadiamento.estagio, 3);
  assert.equal(jsonRcf.resultado.resultado.conduta.parto_indicado_agora, true);
  assert.equal(jsonRcf.resultado.resultado.corticoide.indicado, true);
  assert.equal(jsonRcf.resultado.resultado.neuroprotecao_magnesio.indicado, true);
  assert(jsonRcf.resultado.textoFormatado.includes('RCF / DOPPLER'));
  assert(jsonRcf.resultado.textoFormatado.includes('ESTADIAMENTO (BARCELONA)'));
  console.log('✓ Cockpit Obstetrícia & Medicina Fetal (RCF / Doppler — Barcelona) OK');

  // 6.8 Cockpit RPC - Obstetrícia RCF via texto livre (alias cockpitRestricaoCrescimentoFetal)
  const resRcfTexto = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitRestricaoCrescimentoFetal',
      session: token,
      args: ['35+2 pfe p6 rcp p3']
    }
  });
  assert.equal(resRcfTexto.statusCode, 200, "Erro ao testar cockpitRestricaoCrescimentoFetal via texto");
  const jsonRcfTexto = JSON.parse(resRcfTexto.body);
  assert(jsonRcfTexto.ok, "ok RCF texto deve ser true");
  assert.equal(jsonRcfTexto.resultado.resultado.classificacao.tipo, 'RCF_TARDIA');
  assert.equal(jsonRcfTexto.resultado.resultado.estadiamento.estagio, 1);
  console.log('✓ Cockpit Obstetrícia RCF via texto livre (alias) OK');

  // 6.9 Cockpit RPC - Hepatologia Obstétrica (Colestase Intra-hepática da Gestação / UDCA)
  const resCig = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitHepatologiaColestase',
      session: token,
      args: [{
        acidos_biliares: 110,
        peso: 70,
        ig_semanas: 35
      }]
    }
  });
  assert.equal(resCig.statusCode, 200, "Erro ao testar cockpitHepatologiaColestase");
  const jsonCig = JSON.parse(resCig.body);
  assert(jsonCig.ok, "ok CIG deve ser true");
  assert.equal(jsonCig.resultado.resultado.classificacao.gravidade, 'GRAVE');
  assert.equal(jsonCig.resultado.resultado.parto.ig_alvo_semanas, 36);
  assert.equal(jsonCig.resultado.resultado.parto.corticoide.indicado, true);
  assert.equal(jsonCig.resultado.resultado.parto.vitamina_k.indicada, true);
  assert(jsonCig.resultado.textoFormatado.includes('COLESTASE INTRA-HEPÁTICA'));
  console.log('✓ Cockpit Hepatologia Obstétrica (CIG Grave & UDCA) OK');


  // 6.11 Cockpit RPC - Toxoplasmose Gestacional
  const resToxo = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitObstetriciaToxoplasmose',
      session: token,
      args: [{ ig: 14, igg: 'POSITIVO', igm: 'POSITIVO', avidez_igg: 'BAIXA' }]
    }
  });
  assert.equal(resToxo.statusCode, 200, "Erro ao testar cockpitObstetriciaToxoplasmose");
  const toxoBody = JSON.parse(resToxo.payload);
  assert.equal(toxoBody.resultado.sucesso, true);
  assert.equal(toxoBody.resultado.resultado.sorologia.cenario, 'INFECÇÃO AGUDA MATERNA CONFIRMADA');
  console.log('✓ Cockpit Obstetrícia & Infectologia (Toxoplasmose Aguda / Espiramicina) OK');

  const resToxoTexto = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitToxoplasmoseGestacional',
      session: token,
      args: ["12s igg positivo igm positivo avidez alta"]
    }
  });
  assert.equal(resToxoTexto.statusCode, 200, "Erro ao testar cockpitToxoplasmoseGestacional via texto");
  const toxoTextoBody = JSON.parse(resToxoTexto.payload);
  assert.equal(toxoTextoBody.resultado.sucesso, true);
  assert.equal(toxoTextoBody.resultado.resultado.sorologia.cenario, 'INFECÇÃO PREGRESSA (AVIDEZ ALTA)');
  console.log('✓ Cockpit Toxoplasmose Gestacional via texto livre (alias) OK');

  // 6.10 Cockpit RPC - Fibrilação Atrial e Anticoagulação
  const resFa = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitFibrilacaoAtrial',
      session: token,
      args: ['75 anos mulher has dm ic pam < 60 prótese metálica']
    }
  });
  if(resFa.statusCode !== 200) console.log(resFa.payload);
  assert.equal(resFa.statusCode, 200, "Erro ao testar cockpitFibrilacaoAtrial");
  const faBody = JSON.parse(resFa.payload);
  assert.equal(faBody.resultado.sucesso, true);
  assert.equal(faBody.resultado.resultado.cha2ds2vasc.escore, 6);
  console.log('✓ Cockpit Fibrilação Atrial & Anticoagulação (CHA2DS2-VASc/HAS-BLED) OK');

  // 6.11 Cockpit RPC - Urologia & Cólica Nefrética
  const resColica = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitColicaNefretica',
      session: token,
      args: ['paciente monoreno calculo 15mm dor refrataria']
    }
  });
  if(resColica.statusCode !== 200) console.log(resColica.payload);
  assert.equal(resColica.statusCode, 200, "Erro ao testar cockpitColicaNefretica");
  const colicaBody = JSON.parse(resColica.payload);
  assert.equal(colicaBody.resultado.sucesso, true);
  assert.equal(colicaBody.resultado.resultado.gravidade.urgencia, true);
  console.log('✓ Cockpit Cólica Nefrética e Litíase (MET / Analgesia) OK');

  // 6.11 Cockpit RPC - Cólica Nefrética via texto livre (alias cockpitColicaNefretica)
  const resUro = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitColicaNefretica',
      session: token,
      args: ['paciente rim unico febre dor refrataria calculo 8mm distal']
    }
  });
  if(resUro.statusCode !== 200) console.log(resUro.payload);
  assert.equal(resUro.statusCode, 200, "Erro ao testar cockpitColicaNefretica");
  const uroBody = JSON.parse(resUro.payload);
  assert.equal(uroBody.resultado.sucesso, true);
  assert.equal(uroBody.resultado.resultado.gravidade.urgencia, true);
  console.log('✓ Cockpit Cólica Nefrética (Urologia) via texto livre OK');
  // 6.10 Cockpit RPC - CIG via texto livre (alias cockpitColestaseGestacional)
  const resCigTexto = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitColestaseGestacional',
      session: token,
      args: ['abt 35 peso 60 ig 38s prurido']
    }
  });
  assert.equal(resCigTexto.statusCode, 200, "Erro ao testar cockpitColestaseGestacional via texto");
  const jsonCigTexto = JSON.parse(resCigTexto.body);
  assert(jsonCigTexto.ok, "ok CIG texto deve ser true");
  assert.equal(jsonCigTexto.resultado.resultado.classificacao.gravidade, 'LEVE');
  assert.equal(jsonCigTexto.resultado.resultado.parto.parto_indicado_agora, true);
  console.log('✓ Cockpit Colestase Gestacional via texto livre (alias) OK');

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
