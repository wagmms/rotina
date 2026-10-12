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

  // 4.1 Cockpit RPC - Cálculo Pediatria & Holliday-Segar (< 50ms)
  const t0Ped = performance.now();
  const resPed = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitCalcular',
      session: token,
      args: ['pediatria', { peso: 12, modo: 'holliday', condicaoClinica: 'manutencao_padrao' }]
    }
  });
  const tPed = performance.now() - t0Ped;
  assert.equal(resPed.statusCode, 200);
  const jsonPed = resPed.json();
  assert.equal(jsonPed.ok, true);
  assert.equal(jsonPed.resultado.ok, true);
  assert(jsonPed.resultado.texto.includes('HOLLIDAY-SEGAR'));
  assert(jsonPed.resultado.texto.includes('1100 mL'));
  assert(tPed < 50, `Tempo de Pediatria (${tPed}ms) deve ser menor que 50ms`);
  console.log(`✓ Cockpit Cálculo Pediatria & Holliday-Segar OK (${tPed.toFixed(2)}ms)`);

  // 4.2 Cockpit RPC - Cálculo SRI Neurointensivismo / TCE (< 50ms)
  const t0Sri = performance.now();
  const resSri = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitCalcular',
      session: token,
      args: ['sri', { peso: 70, cenario: 'neuro' }]
    }
  });
  const tSri = performance.now() - t0Sri;
  assert.equal(resSri.statusCode, 200);
  const jsonSri = resSri.json();
  assert.equal(jsonSri.ok, true);
  assert.equal(jsonSri.resultado.ok, true);
  assert(jsonSri.resultado.texto.includes('Neurointensivismo') || jsonSri.resultado.texto.includes('TCE'));
  assert(tSri < 50, `Tempo de SRI (${tSri}ms) deve ser menor que 50ms`);
  console.log(`✓ Cockpit Cálculo SRI Neurointensivismo/TCE OK (${tSri.toFixed(2)}ms)`);

  // 4.3 Cockpit RPC - Cálculo DVA Adrenalina & Vasodilatadores (< 50ms)
  const resAdrena = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitCalcular',
      session: token,
      args: ['dva', { droga: 'adrena', peso: 70 }]
    }
  });
  assert.equal(resAdrena.statusCode, 200);
  const jsonAdrena = resAdrena.json();
  assert.equal(jsonAdrena.ok, true);
  assert.equal(jsonAdrena.resultado.ok, true);
  assert(jsonAdrena.resultado.texto.includes('Adrenalina'));
  console.log(`✓ Cockpit Cálculo DVA Adrenalina OK`);

  // 4.4 Cockpit RPC - Cálculo Ajuste Renal de Antimicrobianos (< 50ms)
  const resAtb = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitCalcular',
      session: token,
      args: ['ajuste_atb', { droga: 'meropenem', clcr: 30 }]
    }
  });
  assert.equal(resAtb.statusCode, 200);
  const jsonAtb = resAtb.json();
  assert.equal(jsonAtb.ok, true);
  assert.equal(jsonAtb.resultado.ok, true);
  assert(jsonAtb.resultado.dados.doseAjustada.includes('1g EV a cada 12h'));
  console.log(`✓ Cockpit Cálculo Ajuste Renal ATB (Meropenem ClCr 30) OK`);

  // 4.5 Cockpit RPC - Cálculo Distúrbios Hidroeletrolíticos (DHE - Hiponatremia e Hipercalemia) (< 50ms)
  const resDheHipo = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitCalcular',
      session: token,
      args: ['dhe', { modo: 'hiponatremia', naAtual: 118, peso: 70, sexo: 'm', idade: 50, salina: 3 }]
    }
  });
  assert.equal(resDheHipo.statusCode, 200);
  const jsonDheHipo = resDheHipo.json();
  assert.equal(jsonDheHipo.ok, true);
  assert.equal(jsonDheHipo.resultado.ok, true);
  assert(jsonDheHipo.resultado.texto.includes('CORREÇÃO DE HIPONATREMIA'));
  assert(jsonDheHipo.resultado.texto.includes('MIELINÓLISE PONTINA'));

  const resDheK = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitCalcular',
      session: token,
      args: ['dhe', { modo: 'hipercalemia', kAtual: 7.0, ecgAlterado: true }]
    }
  });
  assert.equal(resDheK.statusCode, 200);
  const jsonDheK = resDheK.json();
  assert.equal(jsonDheK.ok, true);
  assert.equal(jsonDheK.resultado.ok, true);
  assert(jsonDheK.resultado.texto.includes('Gluconato de Cálcio 10%'));
  console.log(`✓ Cockpit Cálculo DHE (Hiponatremia Adrogué-Madias & Hipercalemia) OK`);

  // 4.6 Cockpit RPC - Cálculo Gasometria Arterial 5 Passos (< 50ms)
  const resGasoCalc = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitCalcular',
      session: token,
      args: ['gaso', { ph: 7.15, pco2: 20, hco3: 7, na: 135, cl: 98, alb: 4.0, pao2: 85, fio2: 21 }]
    }
  });
  assert.equal(resGasoCalc.statusCode, 200);
  const jsonGasoCalc = resGasoCalc.json();
  assert.equal(jsonGasoCalc.ok, true);
  assert.equal(jsonGasoCalc.resultado.ok, true);
  assert(jsonGasoCalc.resultado.texto.includes('Acidose Metabólica'));
  assert(jsonGasoCalc.resultado.texto.includes('Winter'));
  assert(jsonGasoCalc.resultado.texto.includes('AG: 30') || jsonGasoCalc.resultado.texto.includes('30.0'));
  console.log(`✓ Cockpit Cálculo Gasometria Arterial 5 Passos OK`);

  // 4.7 Cockpit RPC - Cálculo Escore HEART & SCA / DAPT (< 50ms)
  const resHeartCalc = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitCalcular',
      session: token,
      args: ['heart', { historia: 2, ecg: 2, idade: 68, fr: 2, troponina: 2, avcPrevio: true }]
    }
  });
  assert.equal(resHeartCalc.statusCode, 200);
  const jsonHeartCalc = resHeartCalc.json();
  assert.equal(jsonHeartCalc.ok, true);
  assert.equal(jsonHeartCalc.resultado.ok, true);
  assert(jsonHeartCalc.resultado.texto.includes('ESCORE HEART'));
  assert(jsonHeartCalc.resultado.texto.includes('ALTO RISCO'));
  assert(jsonHeartCalc.resultado.texto.includes('Ticagrelor'));
  assert(jsonHeartCalc.resultado.texto.includes('PRASUGREL') || jsonHeartCalc.resultado.texto.includes('Prasugrel'));
  console.log(`✓ Cockpit Cálculo Escore HEART & SCA / DAPT OK`);

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

  // TESTE CARDIOLOGIA ICC
  const resIcc = await app.inject({
      method: 'POST',
      url: '/api/cockpit',
      payload: {
          session: token,
          metodo: 'cockpitCardiologiaIcc',
          args: [{ fe: 35 }]
      }
  });
  if (resIcc.statusCode !== 200) console.error("BODY:", resIcc.body);
  assert.equal(resIcc.statusCode, 200, "Erro ao testar cockpitCardiologiaIcc");
  const dataIcc = JSON.parse(resIcc.body); console.log("DATA_ICC:", dataIcc);
  assert.equal(dataIcc.resultado.sigla, 'ICFEr', "Classificação de ICC falhou");
  console.log('✓ Cockpit Cardiologia Insuficiência Cardíaca Crônica (SBC/ESC) OK');

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

  // 6.12 Cockpit RPC - Pediatria: Bronquiolite Viral Aguda (CNAF e Wood-Downes)
  const resBronq = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitPediatriaBronquiolite',
      session: token,
      args: [{
        idadeMeses: 2,
        pesoKg: 5,
        fr: 68,
        fc: 165,
        spo2: 89,
        sibilos: 2,
        tiragem: 2
      }]
    }
  });
  if (resBronq.statusCode !== 200) console.log(resBronq.payload);
  assert.equal(resBronq.statusCode, 200, "Erro ao testar cockpitPediatriaBronquiolite");
  const bronqBody = JSON.parse(resBronq.payload);
  assert.equal(bronqBody.resultado.sucesso, true);
  assert.equal(bronqBody.resultado.resultado.gravidade.classificacao, 'Grave');
  assert.equal(bronqBody.resultado.resultado.gravidade.indicacaoCNAF, true);
  assert.equal(bronqBody.resultado.resultado.oxigenoterapia.cnaf.fluxoInicialLmin, 10);
  console.log('✓ Cockpit Pediatria Bronquiolite (Wood-Downes & CNAF) OK');

  // 6.13 Cockpit RPC - Pediatria: Bronquiolite via texto livre (alias cockpitBronquiolite)
  const resBronqTexto = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitBronquiolite',
      session: token,
      args: ['bronquiolite 3 meses 6kg fr 65 spo2 89 exaustao']
    }
  });
  if (resBronqTexto.statusCode !== 200) console.log(resBronqTexto.payload);
  assert.equal(resBronqTexto.statusCode, 200, "Erro ao testar cockpitBronquiolite via texto");
  const bronqTextoBody = JSON.parse(resBronqTexto.payload);
  assert.equal(bronqTextoBody.resultado.sucesso, true);
  assert.equal(bronqTextoBody.resultado.resultado.gravidade.internacaoUTI, true);
  console.log('✓ Cockpit Bronquiolite via texto livre (alias) OK');

  // 6.14 Cockpit RPC - Endocrinologia: Hiperprolactinemia
  const resHiperprolact = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitHiperprolactinemia',
      session: token,
      args: [{
        prolactina: 85,
        adenomaTamanho: 8,
        assintomatica: false
      }]
    }
  });
  assert.equal(resHiperprolact.statusCode, 200, "Erro ao testar cockpitHiperprolactinemia");
  const hiperprolactBody = JSON.parse(resHiperprolact.payload);
  assert.equal(hiperprolactBody.resultado.desativado, true);
  console.log('✓ Cockpit Hiperprolactinemia desativado graciosamente para foco no internato OK');

  // 6.15 Cockpit RPC - Ginecologia: Endometriose e Dor Pélvica Crônica
  const resEndo = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitGinecologiaEndometriose',
      session: token,
      args: [{
        dismenorreia: true,
        dispareunia: true,
        evaDor: 8,
        desejoGestacional: false
      }]
    }
  });
  assert.equal(resEndo.statusCode, 200, "Erro ao testar cockpitGinecologiaEndometriose");
  const endoBody = JSON.parse(resEndo.payload);
  assert.equal(endoBody.resultado.sucesso, true);
  assert.equal(endoBody.resultado.resultado.diagnostico.suspeitaClinica, true);
  assert.equal(endoBody.resultado.resultado.diagnostico.indicacaoCirurgicaUrgente, false);
  console.log('✓ Cockpit Ginecologia Endometriose (Dienogeste 1ª Linha) OK');

  // 6.16 Cockpit RPC - Ginecologia: Endometriose via texto livre (alias cockpitEndometriose)
  const resEndoTexto = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitEndometriose',
      session: token,
      args: ['endometriose 35 anos tentando engravidar endometrioma 4cm bilateral amh 0.8 hidronefrose']
    }
  });
  assert.equal(resEndoTexto.statusCode, 200, "Erro ao testar cockpitEndometriose via texto");
  const endoTextoBody = JSON.parse(resEndoTexto.payload);
  assert.equal(endoTextoBody.resultado.sucesso, true);
  assert.equal(endoTextoBody.resultado.resultado.diagnostico.indicacaoCirurgicaUrgente, true);
  console.log('✓ Cockpit Endometriose via texto livre (alias) OK');

  // 6.17 Cockpit RPC - Obstetrícia & Reumatologia: SAF e Trombofilias na Gestação
  const resSaf = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitObstetriciaSaf',
      session: token,
      args: [{
        abortosPrecoces: 3,
        anticoagulanteLupico: true,
        intervaloMinimo12Semanas: true,
        peso: 65,
        idadeGestacional: 10
      }]
    }
  });
  assert.equal(resSaf.statusCode, 200, "Erro ao testar cockpitObstetriciaSaf");
  const safBody = JSON.parse(resSaf.payload);
  assert.equal(safBody.resultado.sucesso, true);
  assert.equal(safBody.resultado.resultado.fenotipo, 'SAF OBSTÉTRICA TÍPICA CONFIRMADA');
  assert.ok(safBody.resultado.textoFormatado.includes('SAF E TROMBOFILIAS'));
  console.log('✓ Cockpit Obstetrícia SAF (Sydney / Enoxaparina + AAS) OK');

  // 6.18 Cockpit RPC - SAF Gestacional via texto livre (alias cockpitSafTrombofilias)
  const resSafTexto = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitSafTrombofilias',
      session: token,
      args: ['saf gestante peso 70kg tvp previa anticardiolipina positiva confirmado 12 semanas']
    }
  });
  assert.equal(resSafTexto.statusCode, 200, "Erro ao testar cockpitSafTrombofilias via texto");
  const safTextoBody = JSON.parse(resSafTexto.payload);
  assert.equal(safTextoBody.resultado.sucesso, true);
  assert.equal(safTextoBody.resultado.resultado.fenotipo, 'SAF TROMBÓTICA CONFIRMADA');
  console.log('✓ Cockpit SAF e Trombofilias via texto livre (alias) OK');

  // 6.19 Cockpit RPC - Oftalmologia de Emergência: Queimadura Química e Glaucoma Agudo
  const resOftalmo = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitOftalmologiaEmergencia',
      session: token,
      args: [{
        glaucoma: true,
        pio: 54,
        dorIntensa: true,
        pupilaMidriaseFixa: true
      }]
    }
  });
  assert.equal(resOftalmo.statusCode, 200, "Erro ao testar cockpitOftalmologiaEmergencia");
  const oftalmoBody = JSON.parse(resOftalmo.payload);
  assert.equal(oftalmoBody.resultado.sucesso, true);
  assert.equal(oftalmoBody.resultado.resultado.tipoCaso, 'GLAUCOMA_AGUDO_ANGULO_FECHADO');
  assert.ok(oftalmoBody.resultado.textoFormatado.includes('OFTALMOLOGIA DE EMERGÊNCIA'));
  console.log('✓ Cockpit Oftalmologia Emergência (Glaucoma Agudo & Pilocarpina) OK');

  // 6.20 Cockpit RPC - Oftalmologia via texto livre (alias cockpitOftalmologia)
  const resOftalmoTexto = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitOftalmologia',
      session: token,
      args: ['queimadura por soda caustica cal nos olhos pH 9.8']
    }
  });
  assert.equal(resOftalmoTexto.statusCode, 200, "Erro ao testar cockpitOftalmologia via texto");
  const oftalmoTextoBody = JSON.parse(resOftalmoTexto.payload);
  assert.equal(oftalmoTextoBody.resultado.sucesso, true);
  assert.equal(oftalmoTextoBody.resultado.resultado.tipoCaso, 'QUEIMADURA_QUIMICA');
  console.log('✓ Cockpit Oftalmologia via texto livre (alias) OK');

  // 6.20 Cockpit RPC - Geriatria Avançada & FRAX Brasil
  const resFrax = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitGeriatriaFrax',
      session: token,
      args: [{
        idade: 68,
        sexo: 'F',
        peso: 56,
        altura: 154,
        fraturaPrevia: true
      }]
    }
  });
  assert.equal(resFrax.statusCode, 200, "Erro ao testar cockpitGeriatriaFrax");
  const fraxBody = JSON.parse(resFrax.payload);
  assert.equal(fraxBody.ok, true);
  assert.equal(fraxBody.resultado.indicacao_tratamento_farmacologico, true);
  assert.equal(fraxBody.resultado.classificacao_risco, 'Alto Risco');
  console.log('✓ Cockpit Geriatria FRAX Brasil (ABRASSO / SBGG) OK');

  // 6.21 Cockpit RPC - Geriatria Osteoporose & Bloqueio Renal
  const resOsteo = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {
      metodo: 'cockpitGeriatriaOsteoporose',
      session: token,
      args: [{
        altoRisco: true,
        clcr: 25,
        calcioDietaMg: 450
      }]
    }
  });
  assert.equal(resOsteo.statusCode, 200, "Erro ao testar cockpitGeriatriaOsteoporose");
  const osteoBody = JSON.parse(resOsteo.payload);
  assert.equal(osteoBody.ok, true);
  assert.ok(osteoBody.resultado.bloqueios_seguranca.some(b => b.includes('ClCr 25')));
  console.log('✓ Cockpit Geriatria Osteoporose (Bloqueio ClCr < 35) OK');

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

  // 11. Bateria de Auditoria Defensiva & Resiliência (Zero-Crash em Payloads Malformados)
  // 11.1 Payload sem método
  const resSemMetodo = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: {}
  });
  assert.equal(resSemMetodo.statusCode, 400);
  assert.equal(resSemMetodo.json().ok, false);

  // 11.2 Método inexistente com sessão válida
  const resMetodoInexistente = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: { metodo: 'metodoFantasmaInexistente', session: token, args: [] }
  });
  assert.equal(resMetodoInexistente.statusCode, 400);
  assert.equal(resMetodoInexistente.json().ok, false);
  assert(resMetodoInexistente.json().erro.includes('não suportado'));

  // 11.3 Payload com args null ou string simples (auto-normalização sem crash)
  const resArgsNull = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    payload: { metodo: 'cockpitRemume', session: token, args: null }
  });
  assert.equal(resArgsNull.statusCode, 200);
  assert.equal(resArgsNull.json().ok, true);

  // 11.4 Payload com JSON malformado
  const resJsonCorrompido = await app.inject({
    method: 'POST',
    url: '/api/cockpit',
    headers: { 'content-type': 'application/json' },
    payload: '{"metodo": "cockpitRemume", invalid_json'
  });
  assert.equal(resJsonCorrompido.statusCode, 400);

  // 11.5 Webhook do Telegram com segredo incorreto e update inválido
  runtime.ctx.PropertiesService.getScriptProperties().setProperty('WEBHOOK_SECRET', 'test_secret');
  const resWebhookSegredoInvalido = await app.inject({
    method: 'POST',
    url: '/webhook',
    headers: { 'x-telegram-bot-api-secret-token': 'segredo_incorreto' },
    payload: { update_id: 123 }
  });
  assert.equal(resWebhookSegredoInvalido.statusCode, 401);

  const resWebhookUpdateInvalido = await app.inject({
    method: 'POST',
    url: '/webhook',
    headers: { 'x-telegram-bot-api-secret-token': 'test_secret' },
    payload: { update_id: -1 }
  });
  assert.equal(resWebhookUpdateInvalido.statusCode, 400);

  // 12. Endpoints da Rotina & Dúvidas MedQuest
  const resCriarDuvida = await app.inject({
    method: 'POST',
    url: '/api/rotina/duvidas',
    payload: { texto: 'Indicações de ventilação mecânica não invasiva no edema agudo' }
  });
  assert.equal(resCriarDuvida.statusCode, 200);
  const jsonCriar = resCriarDuvida.json();
  assert.equal(jsonCriar.sucesso, true);
  assert.ok(jsonCriar.duvida && jsonCriar.duvida.id);
  const duvidaId = jsonCriar.duvida.id;

  const resListarDuvidas = await app.inject({
    method: 'GET',
    url: '/api/rotina/duvidas'
  });
  assert.equal(resListarDuvidas.statusCode, 200);
  const jsonListar = resListarDuvidas.json();
  assert.equal(jsonListar.sucesso, true);
  assert.ok(Array.isArray(jsonListar.duvidas));
  assert(jsonListar.duvidas.some(d => d.id === duvidaId));

  const resResolverDuvida = await app.inject({
    method: 'POST',
    url: '/api/rotina/duvidas/resolver',
    payload: { id: duvidaId }
  });
  assert.equal(resResolverDuvida.statusCode, 200);
  const jsonResolver = resResolverDuvida.json();
  assert.equal(jsonResolver.sucesso, true);
  assert.equal(jsonResolver.resolvida, true);
  console.log('✓ Endpoints Fastify de Dúvidas MedQuest (/api/rotina/duvidas) OK');

  console.log('✓ Bateria de Auditoria Defensiva & Resiliência RPC/Webhook OK (Zero Crash)');

  console.log('\n🚀 TODOS OS TESTES DO SERVIDOR RENDER PASSARAM COM SUCESSO!');
}

run().catch(err => {
  console.error('Erro nos testes do servidor:', err);
  process.exit(1);
});
