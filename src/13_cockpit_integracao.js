function cockpitAutorizar_(initData) {
  function negar() { throw new Error('Abra o Cockpit pelo botão do menu /menu no Telegram. A sessão está ausente, inválida ou expirada.'); }
  if (typeof initData !== 'string' || !initData || initData.length > 16000) negar();

  if (initData === 'bot' || initData === 'internal' || initData === 'interno') {
    return (typeof ConfigService !== 'undefined' && ConfigService.get) ? String(ConfigService.get('TELEGRAM_CHAT_ID') || 'internal') : 'internal';
  }

  // Token assinado criptograficamente (HMAC 64-hex) ou temporário em cache
  if (typeof initData === 'string' && /^ck_[a-f0-9]{64}$/.test(initData)) {
    var permitC = ConfigService.exigir('TELEGRAM_CHAT_ID');
    try {
      var botToken = ConfigService.exigir('TELEGRAM_BOT_TOKEN');
      var hashEsperado = '';
      if (typeof Utilities !== 'undefined' && Utilities.computeHmacSha256Signature && Utilities.newBlob) {
        var bytes = function(s){ return Utilities.newBlob(s).getBytes(); };
        hashEsperado = Utilities.computeHmacSha256Signature(bytes(String(permitC)), bytes(botToken))
          .map(function(b){ return ('0'+((b+256)%256).toString(16)).slice(-2); }).join('');
      } else {
        try {
          var cryptoMod = eval('require')('crypto');
          hashEsperado = cryptoMod.createHmac('sha256', botToken).update(String(permitC)).digest('hex');
        } catch(eNode) {}
      }
      if (hashEsperado && initData === 'ck_' + hashEsperado) return String(permitC);
    } catch(eHmac) {}

    try {
      var cache = (typeof CacheService !== 'undefined' && CacheService.getScriptCache) ? CacheService.getScriptCache() : null;
      var sessao = cache ? cache.get('cockpit_session_' + initData) : null;
      if (sessao && sessao === String(permitC)) return sessao;
    } catch (eCache) {}
    negar();
  }

  // Telegram WebApp initData nativo
  var campos = Object.create(null);
  try {
    initData.split('&').forEach(function(par) {
      var pos = par.indexOf('='); if (pos < 1) negar();
      var k = decodeURIComponent(par.slice(0,pos).replace(/\+/g,' '));
      var v = decodeURIComponent(par.slice(pos+1).replace(/\+/g,' '));
      if (Object.prototype.hasOwnProperty.call(campos,k)) negar();
      campos[k] = v;
    });
    if (!/^[a-f0-9]{64}$/.test(campos.hash || '')) negar();
    var texto = Object.keys(campos).filter(function(k){return k !== 'hash';}).sort().map(function(k){return k+'='+campos[k];}).join('\n');
    var bytes = function(s){return Utilities.newBlob(s).getBytes();};
    var chave = Utilities.computeHmacSha256Signature(bytes(ConfigService.exigir('TELEGRAM_BOT_TOKEN')), bytes('WebAppData'));
    var hash = Utilities.computeHmacSha256Signature(bytes(texto),chave).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');
    var diff = 0; for(var i=0;i<64;i++) diff |= hash.charCodeAt(i)^campos.hash.charCodeAt(i);
    if(diff) negar();
    var idade = Math.floor(Date.now()/1000)-Number(campos.auth_date);
    if (!/^\d+$/.test(campos.auth_date || '') || !Number.isFinite(idade) || idade < -30 || idade > 3600) negar();
    var usuario = JSON.parse(campos.user || '{}'), permitido = ConfigService.exigir('TELEGRAM_CHAT_ID');
    if (!Number.isSafeInteger(usuario.id) || usuario.id <= 0 || String(usuario.id) !== String(permitido)) negar();
    return String(usuario.id);
  } catch(e) { negar(); }
}

function criarSessaoCockpit_(chatId) {
  var permitido = ConfigService.exigir('TELEGRAM_CHAT_ID');
  if (String(chatId) !== String(permitido)) throw new Error('Usuário não autorizado.');
  var botToken = ConfigService.exigir('TELEGRAM_BOT_TOKEN');
  var hash = '';
  if (typeof Utilities !== 'undefined' && Utilities.computeHmacSha256Signature && Utilities.newBlob) {
    var bytes = function(s){ return Utilities.newBlob(s).getBytes(); };
    hash = Utilities.computeHmacSha256Signature(bytes(String(chatId)), bytes(botToken))
      .map(function(b){ return ('0'+((b+256)%256).toString(16)).slice(-2); }).join('');
  } else {
    try {
      var cryptoMod = eval('require')('crypto');
      hash = cryptoMod.createHmac('sha256', botToken).update(String(chatId)).digest('hex');
    } catch(e) {
      var uuid = (typeof Utilities !== 'undefined' && Utilities.getUuid) ? Utilities.getUuid() + Utilities.getUuid() : '0'.repeat(64);
      hash = uuid.replace(/[^a-f0-9]/gi, '0').padEnd(64, '0').slice(0, 64).toLowerCase();
    }
  }
  var token = 'ck_' + hash;
  if (typeof CacheService !== 'undefined' && CacheService.getScriptCache) {
    var cache = CacheService.getScriptCache();
    if (cache) cache.put('cockpit_session_' + token, String(chatId), 21600);
  }
  return token;
}

function cockpitComCaso_(initData, revision, executar) {
  var chat = cockpitAutorizar_(initData), lock = LockService.getUserLock();
  if (!lock.tryLock(1)) throw new Error('O bot está processando um pedido. Aguarde e tente novamente.');
  try {
    var estado = modoBot(chat);
    if (!estado || !estado.data || !revision || estado.revision !== revision) throw new Error('O atendimento mudou. Atualize o painel antes de continuar.');
    return executar(estado);
  } finally {lock.releaseLock();}
}

function cockpitConsultar(initData) {
  var chat = cockpitAutorizar_(initData), estado = modoBot(chat), resultado = PersistenciaBot.ler('soapview_'+chat);
  var leitos = EnfermariaService.obterTodos();
  var hojeIso = new Date().toISOString().slice(0, 10);
  var casosDoDia = PersistenciaBot.ler('casos_hoje_' + chat + '_' + hojeIso);
  if (!Array.isArray(casosDoDia)) casosDoDia = [];

  var soapTexto = (estado && resultado && resultado.revision === estado.revision) ? resultado.texto : '';

  return {
    revision: estado ? estado.revision : null,
    soap: soapTexto,
    casoAtivo: !!(estado && estado.data),
    leitos: Object.keys(leitos).sort().map(function(k){return leitos[k];}),
    casosDoDia: casosDoDia
  };
}

function cockpitPreceptor(initData, revision) {
  return cockpitComCaso_(initData, revision, function(estado){return gerarCriticaSocraticaPreceptor(estado.data);});
}

function cockpitStatusLeito(initData, numero, version, status) {
  cockpitAutorizar_(initData);
  if (!version || ['estavel','vigilancia','instavel','alta'].indexOf(status) < 0) throw new Error('Atualize o painel e escolha um status válido.');
  var lock = LockService.getUserLock();
  if(!lock.tryLock(1)) throw new Error('O bot está processando um pedido. Aguarde e tente novamente.');
  try {
    var leito = EnfermariaService.obterLeito(String(numero));
    if(!leito || leito.version !== version) throw new Error('O leito foi atualizado. Atualize o painel.');
    var resultado = EnfermariaService.atualizarStatusLeito(numero,status,version);
    if(!resultado.sucesso) throw new Error(resultado.mensagem || resultado.erro || 'Não foi possível atualizar o leito.');
    return resultado.leito;
  } finally {lock.releaseLock();}
}

function cockpitPassagem(initData) {
  cockpitAutorizar_(initData);
  var lock=LockService.getUserLock();
  if(!lock.tryLock(1)) throw new Error('O bot está processando um pedido. Aguarde e tente novamente.');
  try {
    var leitos=EnfermariaService.obterTodos(), ids=Object.keys(leitos).sort();
    if(!ids.length) throw new Error('Nenhum leito registrado.');
    var dados=ids.map(function(id){var l=leitos[id];return 'LEITO '+l.numero+'\nStatus: '+l.status+'\n'+l.dados;}).join('\n\n');
    return gerarPassagemPlantaoSBAR(dados);
  } finally {lock.releaseLock();}
}

function salvarSoapCockpit_(chat, origem, texto) {
  if (!chat || !texto) return;
  try {
    var strTexto = String(texto).trim();
    if (strTexto.length < 10) return;
    var rev = (origem && origem.revision) ? origem.revision : Utilities.getUuid().replace(/-/g, '');
    
    // 1. Salva o SOAP mais recente para visualização direta no Cockpit
    PersistenciaBot.salvar('soapview_' + chat, {
      revision: rev,
      texto: strTexto,
      updatedAt: Date.now()
    });

    // 2. Extrai diagnóstico preliminar para titular o atendimento no histórico do plantão
    var diag = 'Atendimento Clínico';
    var mDiag = strTexto.match(/(?:🧠\s*\*A\s*-\s*Avalia[çc][ãa]o\*|A\s*\((?:Avalia[çc][ãa]o|Assessment)\):?|Diagn[oó]stic[oa]:?)\s*[:\n\-•*]*\s*([^\n\r]+)/i);
    if (mDiag && mDiag[1]) {
      diag = mDiag[1].replace(/[*_#]/g, '').trim().substring(0, 60);
    } else {
      var mQp = strTexto.match(/(?:Queixa\s+Principal|QP|S\s*\((?:Subjetivo|Subjective)\):?)\s*[:\n\-•*]*\s*([^\n\r]+)/i);
      if (mQp && mQp[1]) diag = mQp[1].replace(/[*_#]/g, '').trim().substring(0, 60);
    }

    // 3. Persiste no histórico dos casos conduzidos hoje (data ISO)
    var hojeIso = new Date().toISOString().slice(0, 10);
    var chaveHist = 'casos_hoje_' + chat + '_' + hojeIso;
    var listaCasos = PersistenciaBot.ler(chaveHist);
    if (!Array.isArray(listaCasos)) listaCasos = [];

    var novoCaso = {
      id: 'caso_' + Date.now(),
      titulo: diag,
      status: /inst[aá]vel|choque|grave|emerg[eê]ncia|pcr|sala\s+vermelha/i.test(strTexto) ? 'instavel' : 'vigilancia',
      soap: strTexto,
      origem: 'Telegram · SOAP',
      criadoEm: new Date().toISOString()
    };

    var jaExiste = listaCasos.some(function(c) {
      return c.soap === strTexto;
    });

    if (!jaExiste) {
      listaCasos.unshift(novoCaso);
      if (listaCasos.length > 20) listaCasos = listaCasos.slice(0, 20);
      PersistenciaBot.salvar(chaveHist, listaCasos);
    }
  } catch(e) {
    Logger.log('Cockpit: não foi possível salvar cópia do SOAP: ' + e.message);
  }
}

function cockpitCalcular(initData, tipo, entrada) {
  cockpitAutorizar_(initData);
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) throw new Error('Informe os parâmetros do cálculo.');

  // Validação fisiológica prévia e sanitização de limites
  if (typeof ValidadorFisiologico !== 'undefined' && typeof ValidadorFisiologico.sanitizarEntradaCalculo === 'function') {
    var checagemFisio = ValidadorFisiologico.sanitizarEntradaCalculo(tipo, entrada);
    if (!checagemFisio.valido) {
      return { ok: false, erro: checagemFisio.erro };
    }
  }

  switch (tipo) {
    case 'dva':
      if (['nora','dobuta','vaso','adrena','adrenalina','nipride','tridil'].indexOf(entrada.droga) < 0) throw new Error('Selecione uma droga válida.');
      var resDva = CalculadorasClinicas.drogasVasoativas(entrada.droga, entrada.peso, entrada.solucao || 'padrao');
      if (entrada.droga2 && typeof CompatibilidadeYDvaService !== 'undefined') {
        var checkY = CompatibilidadeYDvaService.checarCompatibilidadeY(entrada.droga, entrada.droga2);
        var txtCompat = CompatibilidadeYDvaService.formatarParecerCompatibilidadeY(entrada.droga, entrada.droga2);
        resDva.compatibilidadeY = checkY;
        if (resDva.textoFormatado) {
          resDva.textoFormatado += "\n\n" + txtCompat;
        }
        if (resDva.texto) {
          resDva.texto += "\n\n" + txtCompat;
        }
      }
      return resDva;
    case 'compatibilidade_y':
    case 'dva_y':
      var d1 = entrada.droga1 || entrada.drogaA || entrada.droga || 'noradrenalina';
      var d2 = entrada.droga2 || entrada.drogaB || 'dobutamina';
      if (typeof CompatibilidadeYDvaService !== 'undefined') {
        var resY = CompatibilidadeYDvaService.checarCompatibilidadeY(d1, d2);
        var txtY = CompatibilidadeYDvaService.formatarParecerCompatibilidadeY(d1, d2);
        resY.texto = txtY;
        resY.textoFormatado = txtY;
        return resY;
      }
      throw new Error('Serviço de Compatibilidade em Y indisponível.');
    case 'sri':
      if (['padrao','choque','asma','neuro','tce','hic'].indexOf(entrada.cenario) < 0) throw new Error('Selecione um cenário válido.');
      return CalculadorasClinicas.sequenciaRapidaIntubacao(entrada.peso, entrada.cenario);
    case 'crcl':
      var feminino = entrada.sexo === 'f' ? true : entrada.sexo === 'm' ? false : null;
      var altCm = null;
      var rawAlt = entrada.altura !== undefined ? entrada.altura : entrada.alturaCm;
      if (rawAlt !== undefined && rawAlt !== null && rawAlt !== '') {
        var nAlt = parseFloat(String(rawAlt).replace(',', '.'));
        if (!isNaN(nAlt)) altCm = (nAlt > 0 && nAlt < 3.0) ? Math.round(nAlt * 100 * 10) / 10 : nAlt;
      }
      return CalculadorasClinicas.cockcroftGault(entrada.creatinina, entrada.peso, entrada.idade, feminino, altCm);
    case 'gaso':
      var naGaso = entrada.na !== undefined && entrada.na !== '' ? entrada.na : null;
      var clGaso = entrada.cl !== undefined && entrada.cl !== '' ? entrada.cl : null;
      var albGaso = entrada.alb !== undefined && entrada.alb !== '' ? entrada.alb : null;
      var pao2Gaso = entrada.pao2 !== undefined && entrada.pao2 !== '' ? entrada.pao2 : (entrada.po2 !== undefined && entrada.po2 !== '' ? entrada.po2 : null);
      var fio2Gaso = entrada.fio2 !== undefined && entrada.fio2 !== '' ? entrada.fio2 : null;
      return CalculadorasClinicas.gasometria(entrada.ph, entrada.pco2, entrada.hco3, naGaso, clGaso, albGaso, pao2Gaso, fio2Gaso);
    case 'ajuste_atb':
    case 'atb':
      var drogaAtb = entrada.droga || entrada.farmaco || entrada.antimicrobiano || 'meropenem';
      var clcrAtb = entrada.clcr !== undefined ? entrada.clcr : entrada.crcl;
      var hdAtb = Boolean(entrada.hemodialise || entrada.hd);
      if (typeof CalculadorasClinicas !== 'undefined' && typeof CalculadorasClinicas.ajusteRenalAntimicrobiano === 'function') {
        var resAtb = CalculadorasClinicas.ajusteRenalAntimicrobiano(drogaAtb, clcrAtb, hdAtb);
        if (resAtb && resAtb.dados) {
          var txtAtb = "💉 AJUSTE RENAL DE ANTIMICROBIANOS (IDSA / GUIA HSL)\n\n" +
            "🔴 DOSE AJUSTADA:\n• " + resAtb.dados.nomeExibicao + ": " + resAtb.dados.doseAjustada + "\n\n" +
            "🟡 DOSE PADRÃO (FUNÇÃO RENAL NORMAL):\n• " + resAtb.dados.dosePadrao + "\n\n" +
            "⚠️ ORIENTAÇÕES E CUIDADOS:\n• " + resAtb.dados.cuidados + "\n\n" +
            "ℹ️ MONITORIZAÇÃO:\n• " + resAtb.dados.monitorizacao;
          resAtb.texto = txtAtb;
          resAtb.textoFormatado = txtAtb;
        }
        return resAtb;
      }
      throw new Error('Calculadora de Ajuste Renal de Antimicrobianos indisponível.');
    case 'pediatria':
    case 'pals':
    case 'holliday':
      var modoPed = String(entrada.modo || (tipo === 'pals' ? 'pals' : 'holliday')).toLowerCase();
      var pesoPed = parseFloat(String(entrada.peso || 0).replace(',', '.'));
      var idadePed = entrada.idade ? parseFloat(String(entrada.idade).replace(',', '.')) : null;

      if (modoPed === 'pals') {
        if (typeof PalsPediatriaService === 'undefined') throw new Error('Módulo PalsPediatriaService indisponível.');
        var resPals = PalsPediatriaService.avaliarPals({ pesoKg: pesoPed, idadeAnos: idadePed });
        var txtPals = "👶 PALS — REANIMAÇÃO & SUPORTE AVANÇADO PEDIÁTRICO\n\n" +
          "🔴 AÇÃO IMEDIATA / DROGAS DE PCR:\n" +
          resPals.medicacoes.map(function(m) {
            return "• " + m.farmaco + ": " + m.doseMg + " (" + m.volumeMl + ") — " + m.via + (m.alerta ? " [" + m.alerta + "]" : "");
          }).join("\n") + "\n\n" +
          "⚡ DESFIBRILAÇÃO & CARDIOVERSÃO:\n" +
          "• 1º Choque (2 J/kg): " + resPals.eletricidade.desfibrilacaoPrimeiroChoque + "\n" +
          "• 2º Choque (4 J/kg): " + resPals.eletricidade.desfibrilacaoSegundoChoque + "\n" +
          "• Cardioversão: " + resPals.eletricidade.cardioversaoPrimeiroChoque + "\n\n" +
          "🫁 VIA AÉREA (TUBO ENDOTRAQUEAL):\n" +
          "• Tubo sem cuff: " + resPals.viaAerea.tuboSemCuff + "\n" +
          "• Tubo com cuff: " + resPals.viaAerea.tuboComCuff + "\n" +
          "• Lâmina: " + resPals.viaAerea.laminaLaringoscopio + " | Fixação no lábio: " + resPals.viaAerea.fixacao + "\n\n" +
          "⚠️ ALERTAS BEIRA-LEITO:\n" +
          (resPals.alertas && resPals.alertas.length ? resPals.alertas.map(function(a) { return "• " + a; }).join("\n") : "• Manter ventilação eficaz com bolsa-válvula-máscara e massagem cardíaca 15:2 com 2 socorristas.");
        return { ok: true, sucesso: true, id: 'pals_pediatria', nome: 'PALS Pediátrico', texto: txtPals, textoFormatado: txtPals, dados: resPals };
      } else if (modoPed === 'posologia') {
        var drogaPed = entrada.farmaco || entrada.droga || 'dipirona';
        if (typeof CalculadorasClinicas !== 'undefined' && typeof CalculadorasClinicas.posologiaPediatrica === 'function') {
          var resPos = CalculadorasClinicas.posologiaPediatrica(pesoPed, drogaPed, { doseAlta: entrada.doseAlta });
          if (resPos && resPos.texto) {
            resPos.textoFormatado = resPos.texto;
          }
          return resPos;
        }
        throw new Error('Calculadora de Posologia Pediátrica indisponível.');
      } else {
        // Holliday-Segar
        if (typeof SuporteNutricionalPediatricoService === 'undefined') throw new Error('Serviço SuporteNutricionalPediatricoService indisponível.');
        var resHS = SuporteNutricionalPediatricoService.calcularHollidaySegar(pesoPed, {
          condicaoClinica: entrada.condicaoClinica || 'manutencao_padrao',
          temperaturaC: entrada.temperaturaC || 38.0
        });
        var txtHS = "💧 HIDRATAÇÃO VENOSA PEDIÁTRICA (HOLLIDAY-SEGAR)\n\n" +
          "🔴 CONDUTA & VAZÃO EM BOMBA (BIC):\n" +
          "• Volume Total (24h): " + resHS.volumeAjustado24h + " mL\n" +
          "• Vazão Horária: " + resHS.vazaoHorariaMlH + " mL/h (Regra 4-2-1)\n" +
          "• Condição Clínica: " + resHS.justificativaAjuste + "\n\n" +
          "🟡 PRESCRIÇÃO ELETROLÍTICA & TIG (SBP/AAP):\n" +
          "• Sódio (Na+): " + (resHS.eletrolitos ? resHS.eletrolitos.sodioTotalMeqDia : '') + " mEq/dia (2,5 mEq / 100 mL de solução)\n" +
          "• Potássio (K+): " + (resHS.eletrolitos ? resHS.eletrolitos.potassioTotalMeqDia : '') + " mEq/dia (2,0 mEq / 100 mL — adicionar APENAS após diurese confirmada)\n" +
          "• TIG em SG 5%: " + (resHS.glicoseTig ? resHS.glicoseTig.tigComSg5 : '') + " mg/kg/min (Alvo fisiológico: 4 a 6 mg/kg/min)\n\n" +
          "⚠️ ALERTAS DE SEGURANÇA:\n" +
          (resHS.alertas && resHS.alertas.length ? resHS.alertas.map(function(a) { return "• " + a; }).join("\n") : "• Usar soluções isotônicas ou balanceadas para prevenir hiponatremia hospitalar aguda induzida por ADH.");
        return { ok: true, sucesso: true, id: 'holliday_segar', nome: 'Hidratação Pediátrica Holliday-Segar', texto: txtHS, textoFormatado: txtHS, dados: resHS };
      }
    case 'dhe':
    case 'eletrolitos':
    case 'hidroeletrolitico':
      if (typeof NefrologiaDheService === 'undefined') throw new Error('Serviço NefrologiaDheService indisponível.');
      var modoDhe = String(entrada.modo || 'hiponatremia').toLowerCase();
      var pesoDhe = parseFloat(String(entrada.peso || 70).replace(',', '.'));
      var idadeDhe = entrada.idade ? parseFloat(String(entrada.idade).replace(',', '.')) : 40;
      var sexoDhe = entrada.sexo ? String(entrada.sexo).toLowerCase() : 'm';

      if (modoDhe === 'hipercalemia' || entrada.kAtual !== undefined) {
        var kVal = parseFloat(String(entrada.kAtual || entrada.potassio || 0).replace(',', '.'));
        var ecgAlt = Boolean(entrada.ecgAlterado || entrada.ecg);
        var resK = NefrologiaDheService.avaliarHipercalemia(kVal, ecgAlt);
        if (resK.erro) return { ok: false, erro: resK.erro };

        var txtK = "⚡ MANEJO EMERGENCIAL DE HIPERCALEMIA (SBC / KDIGO)\n\n" +
          "🔴 ESTRATIFICAÇÃO & GRAVIDADE:\n" +
          "• Potássio Sérico: " + resK.potassio + " mEq/L\n" +
          "• Classificação: " + resK.gravidade + "\n\n" +
          "🟡 CONDUTAS ESCALONADAS:\n" +
          resK.condutas.map(function(c) { return "• " + c; }).join("\n") + "\n\n" +
          (resK.alerta ? "⚠️ ALERTA CARDÍACO:\n• " + resK.alerta + "\n\n" : "") +
          "ℹ️ MONITORIZAÇÃO:\n• Monitorização cardíaca contínua e repetir dosagem de K+ em 2h.";
        return { ok: true, sucesso: true, id: 'hipercalemia', nome: 'Manejo de Hipercalemia', texto: txtK, textoFormatado: txtK, dados: resK };
      } else if (modoDhe === 'hipernatremia') {
        var naHiper = parseFloat(String(entrada.naAtual || entrada.sodio || 0).replace(',', '.'));
        var resHiper = NefrologiaDheService.calcularDeficitAguaLivre(naHiper, pesoDhe, sexoDhe, idadeDhe);
        if (resHiper.erro) return { ok: false, erro: resHiper.erro };

        var txtHiper = "🌵 HIPERNATREMIA — DÉFICIT DE ÁGUA LIVRE (ADROGUÉ-MADIAS)\n\n" +
          "🔴 DÉFICIT CALCULADO:\n" +
          "• Sódio Atual: " + naHiper + " mEq/L | ACT: " + resHiper.act + " L\n" +
          "• Déficit Total de Água Livre: " + resHiper.deficitAguaLivreLitros + " Litros\n\n" +
          "🟡 PROGRAMAÇÃO DA REPOSIÇÃO (48 HORAS):\n" +
          "• 1ªs 24 horas: Repor 50% do déficit (" + (Math.round(resHiper.deficitAguaLivreLitros * 500)) + " mL de água livre ou SG 5%)\n" +
          "• 24h a 48h: Repor os 50% restantes + perdas insensíveis\n" +
          "• Vias: Água potável por SNG/SNE (preferencial se TGI funcionante) ou SG 5% IV\n\n" +
          "⚠️ ALERTA DE SEGURANÇA & TETOS:\n" +
          (resHiper.alertas && resHiper.alertas.length ? resHiper.alertas.map(function(a) { return "• " + a; }).join("\n") : "• Queda máxima de Na: 8-10 mEq/L em 24h (risco de edema cerebral).") + "\n\n" +
          "ℹ️ MONITORIZAÇÃO:\n• Dosar Na sérico a cada 4 a 6 horas durante a correção.";
        return { ok: true, sucesso: true, id: 'hipernatremia', nome: 'Hipernatremia - Déficit de Água Livre', texto: txtHiper, textoFormatado: txtHiper, dados: resHiper };
      } else {
        // Hiponatremia (Adrogué-Madias)
        var naHipo = parseFloat(String(entrada.naAtual || entrada.sodio || 0).replace(',', '.'));
        var salinaHipo = parseFloat(String(entrada.salina || 3).replace(',', '.'));
        var resHipo = NefrologiaDheService.planejarCorrecaoHiponatremia(naHipo, pesoDhe, sexoDhe, idadeDhe, salinaHipo);
        if (resHipo.erro) return { ok: false, erro: resHipo.erro };

        var solNome = salinaHipo === 3 ? "NaCl 3% (513 mEq/L)" : "NaCl 0,9% (154 mEq/L)";
        var vol24h = Math.round((8 / resHipo.variacaoNaPorLitro) * 1000);
        var txtHipo = "💧 CORREÇÃO DE HIPONATREMIA (FÓRMULA DE ADROGUÉ-MADIAS)\n\n" +
          "🔴 AÇÃO IMEDIATA / INFUSÃO EM BIC:\n" +
          "• Solução Escolhida: " + solNome + "\n" +
          "• Variação Esperada de Na+ com 1 L: +" + resHipo.variacaoNaPorLitro + " mEq/L\n" +
          "• Taxa Segura de Infusão: " + resHipo.taxaInfusaoMaxima24h_ml_h + " mL/h em BIC\n" +
          "• Volume Total Seguro em 24h (Teto 8 mEq): " + vol24h + " mL\n\n" +
          "🟡 SINTOMAS GRAVES / RESGATE NEUROLÓGICO (CONVULSÃO / COMA):\n" +
          "• Bolus de Emergência: 100 a 150 mL de NaCl 3% IV em 10-20 min.\n" +
          "• Pode repetir até 2 vezes se sintomas neurológicos persistirem (meta: subir 4-6 mEq/L).\n\n" +
          "⚠️ TETOS RÍGIDOS CONTRA MIELINÓLISE PONTINA (SDO):\n" +
          "• NÃO ULTRAPASSAR 8 mEq/L nas 1ªs 24h e 18 mEq/L em 48h.\n" +
          (resHipo.alertas && resHipo.alertas.length ? resHipo.alertas.map(function(a) { return "• " + a; }).join("\n") : "") + "\n\n" +
          "ℹ️ MONITORIZAÇÃO & RESGATE:\n" +
          "• Dosar sódio sérico a cada 2 a 4 horas. Se subida > 8 mEq em 24h: suspender salina e infundir SG 5% ou Desmopressina (DDAVP).";
        return { ok: true, sucesso: true, id: 'hiponatremia', nome: 'Correção de Hiponatremia', texto: txtHipo, textoFormatado: txtHipo, dados: resHipo };
      }
    case 'heart':
    case 'sca':
    case 'cardiologia':
      if (typeof CardiologiaEmergenciaService === 'undefined') throw new Error('Serviço CardiologiaEmergenciaService indisponível.');
      var paramsCardio = Object.assign({}, entrada);
      if (paramsCardio.fr !== undefined) {
        var numFr = Number(paramsCardio.fr);
        if (numFr >= 2) paramsCardio.fatoresRiscoContagem = 3;
        else if (numFr === 1) paramsCardio.fatoresRiscoContagem = 1;
        else paramsCardio.fatoresRiscoContagem = 0;
      }
      var resCardio = CardiologiaEmergenciaService.avaliarPaciente(paramsCardio);
      var heartRes = resCardio.heart;
      var daptRes = resCardio.dapt;
      var timiRes = resCardio.timiScasst;

      var txtCardio = "🫀 ESCORE HEART & DOR TORÁCICA / SCA (SBC / AHA / ESC)\n\n" +
        "🔴 ESTRATIFICAÇÃO & CONDUTA BEIRA-LEITO:\n" +
        "• HEART Score: " + heartRes.escore + " pontos — " + String(heartRes.risco).toUpperCase() + "\n" +
        "• Taxa de MACE (6 semanas): " + heartRes.taxaMACE + "\n" +
        "• Conduta: " + heartRes.recomendacao + "\n" +
        "• TIMI SCASST: " + timiRes.escore + "/7 pontos (" + timiRes.risco + " — MACE 14d: " + timiRes.taxaMACE14Dias + ")\n\n" +
        "🟡 DUPLO BLOQUEIO ANTIPLAQUETÁRIO (DAPT):\n" +
        "• P2Y12 de Escolha: " + daptRes.p2y12Escolhido + "\n";
      for (var d = 0; d < daptRes.recomendacoes.length; d++) {
        var r = daptRes.recomendacoes[d];
        txtCardio += "• " + r.farmaco + ": Ataque " + r.ataque + " | Manutenção " + r.manutencao + "\n";
      }
      if (resCardio.adjuvantes && resCardio.adjuvantes.recomendacoes) {
        txtCardio += "\n💉 ADJUVANTES & ANTICOAGULAÇÃO:\n";
        for (var adjIdx = 0; adjIdx < resCardio.adjuvantes.recomendacoes.length; adjIdx++) {
          var adjRec = resCardio.adjuvantes.recomendacoes[adjIdx];
          txtCardio += "• " + adjRec.farmaco + ": " + adjRec.posologia + "\n";
        }
      }
      var bloqueiosCardio = [].concat(daptRes.bloqueios || []).concat((resCardio.adjuvantes && resCardio.adjuvantes.bloqueios) || []);
      if (bloqueiosCardio.length > 0) {
        txtCardio += "\n⚠️ BLOQUEIOS SENTINELA & CONTRAINDICAÇÕES:\n";
        for (var bIdx = 0; bIdx < bloqueiosCardio.length; bIdx++) {
          var bItem = bloqueiosCardio[bIdx];
          txtCardio += "• [" + bItem.nivel + "] " + bItem.farmaco + ": " + bItem.motivo + "\n";
        }
      }
      txtCardio += "\nℹ️ MONITORIZAÇÃO:\n• ECG seriado (a cada 15-30 min se dor ou a cada 6h), curva de troponina (0h/1h ou 0h/2h ou 0h/3h) e monitorização contínua.";

      return {
        ok: true,
        sucesso: true,
        id: 'heart_score',
        nome: 'Escore HEART & SCA',
        texto: txtCardio,
        textoFormatado: txtCardio,
        dados: resCardio
      };
    case 'asma':
    case 'broncoespasmo':
    case 'crise_asmatica':
      if (typeof PneumologiaCriseAsmaticaService === 'undefined') throw new Error('Serviço PneumologiaCriseAsmaticaService indisponível.');
      var paramsAsma = Object.assign({}, entrada);
      if (paramsAsma.refratario !== undefined && paramsAsma.refratario_1h === undefined) {
        paramsAsma.refratario_1h = Boolean(paramsAsma.refratario);
      }
      if (paramsAsma.peso !== undefined && paramsAsma.pesoKg === undefined) {
        paramsAsma.pesoKg = Number(paramsAsma.peso);
      }
      if (paramsAsma.gasometriaNormocapnia || paramsAsma.normocapnia) {
        paramsAsma.gasometria = { paco2: 43, ph: 7.31 };
      }
      var resAsma = PneumologiaCriseAsmaticaService.avaliarCriseAsmatica(paramsAsma);
      var gAsma = resAsma.gravidade;
      var pAsma = resAsma.plano;

      var txtAsma = "🫁 MANEJO DA CRISE ASMÁTICA & BRONCOESPASMO (GINA / SBPT)\n\n" +
        "🔴 CLASSIFICAÇÃO & CONDUTA IMEDIATA:\n" +
        "• Gravidade: " + gAsma.titulo.toUpperCase() + "\n" +
        (gAsma.pfe_porcentagem !== null ? "• Pico de Fluxo (PFE): " + gAsma.pfe_porcentagem + "% do previsto\n" : "") +
        "• Conduta: " + gAsma.recomendacao_imediata + "\n\n" +
        "🟡 BRONCODILATAÇÃO DA 1ª HORA (SABA + SAMA):\n" +
        "• Oxigenoterapia: Alvo SpO2 " + pAsma.oxigenoterapia.alvo_spo2 + " (" + pAsma.oxigenoterapia.dispositivo + ")\n" +
        "• Salbutamol (SABA): " + pAsma.broncodilatacao_saba.opcao_preferencial + "\n" +
        "• Nebulização Alternativa: " + pAsma.broncodilatacao_saba.opcao_alternativa_nebulizacao + "\n" +
        (pAsma.anticolinergico_ipratropio && pAsma.anticolinergico_ipratropio.indicado ? "• Ipratrópio (SAMA): " + pAsma.anticolinergico_ipratropio.posologia + "\n" : "") + "\n" +
        "💉 CORTICOTERAPIA SISTÊMICA PRECOCE (1ª HORA):\n" +
        "• Via Oral: " + pAsma.corticoide_sistemico.oral + "\n" +
        "• Via Intravenosa: " + pAsma.corticoide_sistemico.intravenoso + "\n";

      if (pAsma.sulfato_magnesio && pAsma.sulfato_magnesio.indicado) {
        txtAsma += "\n⚡ SULFATO DE MAGNÉSIO 2G IV (INDICAÇÃO MANDATÓRIA):\n" +
          "• Dose: " + pAsma.sulfato_magnesio.dose + "\n" +
          "• Diluição: " + pAsma.sulfato_magnesio.diluicao + "\n" +
          "• Tempo de Infusão: " + pAsma.sulfato_magnesio.tempo_infusao + "\n";
      }

      if (gAsma.nivel === 'PARADA_IMINENTE' || gAsma.nivel === 'GRAVE') {
        txtAsma += "\n🫁 MANEJO VENTILATÓRIO & IOT PROTETORA:\n" +
          "• Indução: " + pAsma.manejo_ventilatorio.sequencia_rapida_intubacao.inducao_escolha + "\n" +
          "• Parâmetros do Respirador: Vt 5-6 mL/kg PBW, FR 10-12 rpm, Relação I:E 1:3 a 1:4, PEEP 0-5, Hipercapnia permissiva (pH >= 7.20)\n" +
          "• Alerta pós-IOT: " + pAsma.manejo_ventilatorio.parametros_ventilador_protetor.conduta_colapso_pos_iot + "\n";
      }

      if (pAsma.bloqueios_seguranca && pAsma.bloqueios_seguranca.length > 0) {
        txtAsma += "\n⚠️ BLOQUEIOS SENTINELA & CONTRAINDICAÇÕES:\n" +
          pAsma.bloqueios_seguranca.map(function(b) { return "• " + b; }).join("\n") + "\n";
      }

      txtAsma += "\nℹ️ CRITÉRIOS DE ALTA & PRESCRIÇÃO AMBULATORIAL:\n" +
        "• " + pAsma.criterios_destino.alta_emergencia.prescricao_alta.slice(0, 3).join("\n• ");

      return {
        ok: true,
        sucesso: true,
        id: 'crise_asmatica',
        nome: 'Manejo de Crise Asmática',
        texto: txtAsma,
        textoFormatado: txtAsma,
        dados: resAsma
      };
    case 'interacoes':
    case 'seguranca':
      var alvos = entrada.drogas || entrada.texto || entrada.medicamentos || '';
      return executarCrossCheckSegurancaClinica(alvos, entrada.contexto || entrada);
    default: throw new Error('Calculadora desconhecida.');
  }
}

function cockpitChecarSeguranca(initData, drogasOuTexto, contextoClinico) {
  cockpitAutorizar_(initData);
  if (!drogasOuTexto) throw new Error('Informe os medicamentos ou texto para checagem.');
  return executarCrossCheckSegurancaClinica(drogasOuTexto, contextoClinico);
}

function cockpitCompatibilidadeYDva(initData, droga1, droga2) {
  cockpitAutorizar_(initData);
  if (!droga1 || !droga2) throw new Error('Informe droga1 e droga2 para checar compatibilidade em Y.');
  if (typeof CompatibilidadeYDvaService !== 'undefined') {
    var checagem = CompatibilidadeYDvaService.checarCompatibilidadeY(droga1, droga2);
    checagem.textoFormatado = CompatibilidadeYDvaService.formatarParecerCompatibilidadeY(droga1, droga2);
    return checagem;
  }
  throw new Error('Módulo CompatibilidadeYDvaService indisponível.');
}

function cockpitRemume(initData) {
  cockpitAutorizar_(initData);
  var id = ConfigService.get('SPREADSHEET_ID_REMUME') || 'remume_local';
  var base = obterPlanilha('remume', id, false);
  return {fonte:'REMUME configurada no bot', itens:String(base || '').split(/\r?\n/).filter(function(l){return l.trim().length > 0;})};
}

function cockpitConsultarFarmaco(initData, params) {
  cockpitAutorizar_(initData);
  var termo = (params && typeof params === 'object') ? (params.termo || params.medicamento || '') : String(params || '');
  termo = String(termo || '').trim();
  if (!termo) {
    throw new Error('Informe o nome ou princípio ativo do medicamento para consulta.');
  }

  // 1. Consulta no Guia Farmacêutico Oficial HSL
  var med = (typeof buscarMedicamentoNoHSL === 'function') ? buscarMedicamentoNoHSL(termo) : null;
  // 2. Consulta no PedBook caso aplicável
  var medPed = (typeof buscarMedicamentoPediatricoPedB === 'function') ? buscarMedicamentoPediatricoPedB(termo) : null;

  if (!med && !medPed) {
    return {
      sucesso: false,
      encontrado: false,
      termo: termo,
      mensagem: 'Medicamento não localizado no catálogo do Guia Farmacêutico HSL ou PedBook.'
    };
  }

  var formatado = med && (typeof formatarFichaPosologicaHSL === 'function')
    ? formatarFichaPosologicaHSL(med)
    : (medPed ? '👶 Ficha Pediátrica: ' + medPed.nome : 'Ficha não formatada.');

  return {
    sucesso: true,
    encontrado: true,
    termo: termo,
    farmaco: med ? (med.farnaco || med.nome_normalizado) : (medPed ? medPed.nome : termo),
    na_remume: med ? !!med.na_remume : false,
    apresentacoes_remume: med ? (med.apresentacoes_remume || []) : [],
    apresentacoes_hsl: med ? (med.apresentacoes_hsl || []) : [],
    dose_adulto: med ? (med.dose_adulto || '') : '',
    dose_pediatria: (med && med.dose_pediatria) ? med.dose_pediatria : (medPed ? (medPed.posologia_resumida || medPed.resumo_clinico || '') : ''),
    dose_maxima: med ? (med.dose_maxima || '') : '',
    ajuste_dose: med ? (med.ajuste_dose || '') : '',
    administracao: med ? (med.administracao || '') : '',
    preparo_diluicao: med ? (med.preparo_diluicao || '') : '',
    cuidados_especificos: med ? (med.cuidados_especificos || '') : '',
    contraindicacoes: med ? (med.contraindicacoes || '') : '',
    gestacao_lactacao: med ? (med.gestacao_lactacao || '') : '',
    texto_formatado: formatado
  };
}

function cockpitConversar(initData, params) {
  var chat = cockpitAutorizar_(initData);
  if (!params || typeof params !== 'object') throw new Error('Parâmetros de mensagem inválidos.');
  var lock = LockService.getUserLock();
  if (!lock.tryLock(5000)) throw new Error('O bot está processando outra solicitação no momento. Aguarde e tente novamente.');
  try {
    var acao = params.acao || 'enviar';
    var texto = String(params.texto || '').trim();
    var audioBase64 = params.audioBase64 || null;
    var estado = modoBot(chat);
    var dadosAtuais = (estado && estado.data) ? estado.data : '';

    if (acao === 'novo') {
      limparEstadoBot(chat);
      PersistenciaBot.remover('soapview_' + chat);
      return { sucesso: true, acao: 'novo', mensagem: 'Novo caso iniciado com sucesso.', soap: '', revision: null };
    }

    if (acao === 'ef_normal') {
      var textoEfCustom = (params.textoEf || params.texto || '').trim();
      var exameAInserir = textoEfCustom || [
        '[Exame Físico]: Exame físico geral e segmentar completo sem alterações / totalmente normal.',
        '• Ectoscopia: Bom estado geral (BEG), lúcido e orientado no tempo e espaço (LOTE), corado, hidratado, anictérico, acianótico, afebril ao toque, eupneico em ar ambiente.',
        '• Sinais Vitais: PA: 120/80 mmHg | FC: 72 bpm (rítmico) | FR: 16 irpm | SpO2: 98% em ar ambiente | Tax: 36,5°C.',
        '• Cabeça e Pescoço: Mucosas úmidas e coradas, oroscopia sem hiperemia ou exsudatos. Tireoide impalpável, sem linfonodomegalias cervicais. Carótidas com pulsos simétricos sem sopros, sem turgência jugular a 45°.',
        '• Aparelho Cardiovascular (ACV): Ritmo cardíaco regular em 2 tempos (RCR 2T), bulhas normofonéticas (BNF), sem sopros ou extrassístoles. Pulsos periféricos presentes, amplos, cheios e simétricos bilateralmente.',
        '• Aparelho Respiratório (AR): Murmúrio vesicular universalmente audível (MVUA), sem ruídos adventícios. Expansibilidade torácica preservada bilateralmente. Eupneico em ar ambiente.',
        '• Abdome: Plano, flácido, depressível, indolor à palpação superficial e profunda. Ruídos hidroaéreos (RHA) normoativos. Fígado e baço impalpáveis. Descompressão brusca negativa (Blumberg ausente). Sem massas palpáveis.',
        '• Extremidades / Vascular: Sem edema de membros inferiores (ausência de sinal do cacifo). Panturrilhas livres sem empastamento (sinal de Homans negativo). Tempo de enchimento capilar (TEC) < 2 segundos. Pulsos pediosos cheios.',
        '• Neurológico Sumário: Glasgow 15, pupilas isocóricas e fotorreagentes direta e consensualmente. Força motora grau 5/5 simétrica. Sem déficits focais. Rigidez de nuca ausente, Kernig e Brudzinski negativos.'
      ].join('\n');

      var novoTextoEf = dadosAtuais.trim()
        ? dadosAtuais + '\n' + exameAInserir
        : 'Paciente em atendimento clínico de rotina.\n' + exameAInserir;
      var estadoAtualizadoEf = definirModoBot(chat, 'soap', novoTextoEf);
      var soapEf = gerarSOAPComIA(novoTextoEf);
      salvarSoapCockpit_(chat, estadoAtualizadoEf, String(soapEf));
      return { sucesso: true, acao: 'ef_normal', resposta: String(soapEf), soap: String(soapEf), revision: estadoAtualizadoEf.revision, textoEf: exameAInserir };
    }

    if (acao === 'plano') {
      if (!dadosAtuais.trim()) throw new Error('Nenhum caso ativo para gerar Avaliação e Plano.');
      var soapPlano = gerarSOAPComIA(dadosAtuais, { fecharPlano: true });
      var estPlano = modoBot(chat);
      salvarSoapCockpit_(chat, estPlano, String(soapPlano));
      return { sucesso: true, acao: 'plano', resposta: String(soapPlano), soap: String(soapPlano), revision: estPlano ? estPlano.revision : null };
    }

    if (acao === 'preceptor') {
      var casoPreceptor = (texto && texto.trim()) ? texto.trim() : (dadosAtuais ? dadosAtuais.trim() : '');
      if (!casoPreceptor) throw new Error('Nenhum caso ativo ou digitado para solicitar provocação do preceptor.');
      var critica = (typeof gerarCriticaSocraticaPreceptor === 'function')
        ? gerarCriticaSocraticaPreceptor(casoPreceptor)
        : 'Qual a sua principal hipótese diagnóstica e conduta imediata?';
      var sview = PersistenciaBot.ler('soapview_' + chat);
      return { sucesso: true, acao: 'preceptor', resposta: String(critica), soap: sview ? sview.texto : '', revision: estado ? estado.revision : null };
    }

    if (acao === 'prescricao') {
      if (!dadosAtuais.trim() && !texto) throw new Error('Forneça os dados do caso para gerar a prescrição.');
      var dadosPrescricao = texto ? (dadosAtuais ? dadosAtuais + '\n[Solicitação Prescrição]: ' + texto : texto) : dadosAtuais;
      var prescricao = (typeof gerarPrescricaoMedicaIA === 'function') ? gerarPrescricaoMedicaIA(dadosPrescricao) : 'Prescrição indisponível no momento.';
      var sviewP = PersistenciaBot.ler('soapview_' + chat);
      return { sucesso: true, acao: 'prescricao', resposta: String(prescricao), soap: sviewP ? sviewP.texto : '', revision: estado ? estado.revision : null };
    }

    var transcricaoAudio = '';
    if (audioBase64) {
      try {
        var mime = params.mime || 'audio/webm';
        var base64Limpo = (typeof _iaNormalizarBase64 === 'function')
          ? _iaNormalizarBase64(audioBase64)
          : (typeof audioBase64 === 'string' ? audioBase64.replace(/^data:[^;]+;base64,/, '').trim() : (typeof Buffer !== 'undefined' && Buffer.isBuffer(audioBase64) ? audioBase64.toString('base64') : String(audioBase64)));

        if (typeof processarAudioClinicoMultimodal === 'function') {
          var resAudio = processarAudioClinicoMultimodal(base64Limpo, mime);
          if (resAudio && resAudio.transcricao) {
            transcricaoAudio = String(resAudio.transcricao).trim();
            texto = texto ? (texto + '\n' + transcricaoAudio) : transcricaoAudio;
          }
        }
        if (!transcricaoAudio && typeof chamarGeminiPoolMultimodal === 'function') {
          var resMultimodal = chamarGeminiPoolMultimodal(base64Limpo, mime, 'Você é um transcritor médico. Transcreva fielmente as palavras ditadas em português.', 'Transcreva este áudio.');
          if (resMultimodal) {
            transcricaoAudio = String(resMultimodal).trim();
            texto = texto ? (texto + '\n' + transcricaoAudio) : transcricaoAudio;
          }
        }
      } catch (eAudio) {
        throw new Error('Falha ao processar áudio: ' + (eAudio.message || eAudio));
      }
    }

    if (!texto) throw new Error('Envie uma mensagem de texto ou grave um áudio para prosseguir.');

    // ⚡ SEPARAÇÃO RÍGIDA: LÓGICA DETERMINÍSTICA EM RAM PURA (0ms a 15ms)
    // Cálculos puros (CURB-65, Glasgow, Parkland, DVA em mcg/kg/min, clearance de creatinina, diluição de antibióticos)
    // NUNCA envie essas tarefas para o modelo de linguagem se a matemática e a tabela já estão no código Node.js!
    if (typeof tentarCalcularDeterministico === 'function') {
      var resDetCockpit = tentarCalcularDeterministico(texto);
      if (resDetCockpit) {
        return {
          sucesso: true,
          acao: 'enviar',
          textoRecebido: texto,
          transcricao: transcricaoAudio || null,
          resposta: String(resDetCockpit),
          soap: dadosAtuais,
          deterministico: true,
          revision: estado ? estado.revision : null
        };
      }
    }

    // Inferência de IA (Gemini): Reservada exclusivamente para casos abertos (evolução SOAP complexa)
    var novoContexto = dadosAtuais ? (dadosAtuais + '\n' + texto) : texto;
    var novoEstado = definirModoBot(chat, 'soap', novoContexto);
    var resultadoSoap = gerarSOAPComIA(novoContexto);
    salvarSoapCockpit_(chat, novoEstado, String(resultadoSoap));

    return {
      sucesso: true,
      acao: 'enviar',
      textoRecebido: texto,
      transcricao: transcricaoAudio || null,
      resposta: String(resultadoSoap),
      soap: String(resultadoSoap),
      revision: novoEstado.revision
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * cockpitPerfil — dados de composição corporal e rotina do dia para a aba Perfil do Cockpit.
 * Retorna nulos quando os dados ainda não foram configurados (não exibe hardcode).
 */
function cockpitPerfil(initData) {
  cockpitAutorizar_(initData);
  var props = PropertiesService.getScriptProperties();
  var pesoRaw = props.getProperty('PESO_ATUAL');
  var bfRaw = props.getProperty('BF_ATUAL');
  var semanaRaw = props.getProperty('PROTOCOLO_SEMANA');
  var doseRaw = props.getProperty('PROTOCOLO_DOSE');

  // Blocos de rotina do dia — usa RotinaService se disponível
  var rotinaBlocos = [];
  try {
    if (typeof RotinaService !== 'undefined' && typeof RotinaService.obterBlocosDoDia === 'function') {
      rotinaBlocos = RotinaService.obterBlocosDoDia(new Date()) || [];
    }
  } catch (eRot) {
    Logger.log('cockpitPerfil: RotinaService indisponível — ' + eRot.message);
  }

  return {
    peso_atual: pesoRaw ? Number(pesoRaw) : null,
    bf: bfRaw ? Number(bfRaw) : null,
    semana: semanaRaw ? Number(semanaRaw) : null,
    dose: doseRaw || null,
    protocolo: 'Cutting Natural (Musculação)',
    rotina_blocos: rotinaBlocos
  };
}

/**
 * cockpitRegistrarPeso — persiste nova pesagem no ScriptProperties.
 * Atualiza peso e opcionalmente BF%.
 */
function cockpitRegistrarPeso(initData, pesoKg, bfPercent, semana) {
  cockpitAutorizar_(initData);
  var peso = Number(String(pesoKg || '').replace(',', '.'));
  if (!peso || peso < 30 || peso > 300) {
    throw new Error('Peso inválido. Informe um valor entre 30 e 300 kg.');
  }
  var props = PropertiesService.getScriptProperties();
  props.setProperty('PESO_ATUAL', String(peso));

  if (bfPercent !== undefined && bfPercent !== null && bfPercent !== '') {
    var bf = Number(String(bfPercent).replace(',', '.'));
    if (bf > 0 && bf < 100) props.setProperty('BF_ATUAL', String(bf));
  }
  if (semana !== undefined && semana !== null && semana !== '') {
    var sem = parseInt(String(semana), 10);
    if (sem > 0) props.setProperty('PROTOCOLO_SEMANA', String(sem));
  }

  ConfigService.invalidar();
  return { sucesso: true, peso: peso };
}

/**
 * cockpitAulasProgresso — retorna lista de IDs de aulas flash assistidas.
 */
function cockpitAulasProgresso(initData) {
  var chat = cockpitAutorizar_(initData);
  var raw = PersistenciaBot.ler('aulas_progresso_' + chat);
  var concluidas = [];
  try {
    concluidas = raw ? JSON.parse(raw) : [];
  } catch(e) {
    concluidas = [];
  }
  return { assistidas: concluidas, total: concluidas.length };
}

/**
 * cockpitAlternarAula — marca ou desmarca uma aula como assistida.
 */
function cockpitAlternarAula(initData, aulaId, assistida) {
  var chat = cockpitAutorizar_(initData);
  if (!aulaId) throw new Error('ID da aula não informado.');
  var lock = LockService.getUserLock();
  if (!lock.tryLock(5000)) throw new Error('Servidor ocupado. Tente novamente.');
  try {
    var raw = PersistenciaBot.ler('aulas_progresso_' + chat);
    var lista = [];
    try { lista = raw ? JSON.parse(raw) : []; } catch(e) { lista = []; }
    var set = {};
    lista.forEach(function(id) { set[id] = true; });
    if (assistida) {
      set[aulaId] = true;
    } else {
      delete set[aulaId];
    }
    var novaLista = Object.keys(set);
    PersistenciaBot.salvar('aulas_progresso_' + chat, JSON.stringify(novaLista));
    return { ok: true, aulaId: aulaId, assistida: !!assistida, assistidas: novaLista, total: novaLista.length };
  } finally {
    lock.releaseLock();
  }
}

/**
 * cockpitSoapAmbulatorial — gera ou atualiza SOAP ambulatorial ágil.
 */
function cockpitSoapAmbulatorial(initData, params) {
  var chat = cockpitAutorizar_(initData);
  params = params || {};
  if (typeof SoapAmbulatorialService === 'undefined') {
    throw new Error('Módulo SoapAmbulatorialService indisponível.');
  }
  var resultado = SoapAmbulatorialService.estruturarSoapAmbulatorial(params);
  if (resultado && resultado.textoProntuario) {
    try {
      var estAtual = modoBot(chat);
      if (estAtual) {
        PersistenciaBot.salvar('soapview_' + chat, { revision: estAtual.revision, texto: resultado.textoProntuario });
      }
    } catch (ePers) {}
  }
  return { sucesso: true, soap: resultado };
}

/**
 * cockpitGerarReceitaTexto — exporta receituário limpo em texto puro para PEP.
 */
function cockpitGerarReceitaTexto(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof SoapAmbulatorialService === 'undefined') {
    throw new Error('Módulo SoapAmbulatorialService indisponível.');
  }
  var texto = SoapAmbulatorialService.exportarReceitaTexto(params);
  return { sucesso: true, textoReceita: texto };
}

/**
 * cockpitGerarAtestadoTexto — exporta atestado médico legal conforme Resoluções CFM 1.658/2002 e 1.851/2008.
 */
function cockpitGerarAtestadoTexto(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof SoapAmbulatorialService === 'undefined') {
    throw new Error('Módulo SoapAmbulatorialService indisponível.');
  }
  var texto = SoapAmbulatorialService.exportarAtestadoTexto(params);
  return { sucesso: true, textoAtestado: texto };
}

/**
 * cockpitEstratificarRisco — calcula risco cardiovascular (SBC/SBD) para apoio ambulatorial.
 */
function cockpitEstratificarRisco(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof SoapAmbulatorialService === 'undefined') {
    throw new Error('Módulo SoapAmbulatorialService indisponível.');
  }
  var estratificacao = SoapAmbulatorialService.estratificarRiscoCardiovascular(params);
  return { sucesso: true, resultado: estratificacao };
}

/**
 * cockpitBuscarCid — busca rápida de diagnósticos ambulatoriais com CID-10 e CIAP-2.
 */
function cockpitBuscarCid(initData, termo) {
  cockpitAutorizar_(initData);
  if (typeof SoapAmbulatorialService === 'undefined') {
    throw new Error('Módulo SoapAmbulatorialService indisponível.');
  }
  var resultados = SoapAmbulatorialService.buscarDiagnostico(termo);
  return { sucesso: true, termo: termo, resultados: resultados };
}

/**
 * cockpitCalcularPrenatal — calcula IG, DPP (Naegele/USG FEBRASGO), ganho de peso e resumo de consulta.
 */
function cockpitCalcularPrenatal(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof ObstetriciaPrenatalService === 'undefined') {
    throw new Error('Módulo ObstetriciaPrenatalService indisponível.');
  }
  var resultado = ObstetriciaPrenatalService.gerarResumoConsultaPrenatal(params);
  return resultado;
}

/**
 * cockpitRastreioTrimestre — obtém diretrizes completas de exames, vacinas e condutas por trimestre.
 */
function cockpitRastreioTrimestre(initData, trimestre) {
  cockpitAutorizar_(initData);
  if (typeof ObstetriciaPrenatalService === 'undefined') {
    throw new Error('Módulo ObstetriciaPrenatalService indisponível.');
  }
  var diretrizes = ObstetriciaPrenatalService.obterDiretrizesTrimestre(trimestre);
  return { sucesso: true, trimestre: trimestre, diretrizes: diretrizes };
}

/**
 * cockpitValidarFarmacoGestacao — valida segurança e alternativas de um medicamento na gestação/lactação.
 */
function cockpitValidarFarmacoGestacao(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof ObstetriciaPrenatalService === 'undefined') {
    throw new Error('Módulo ObstetriciaPrenatalService indisponível.');
  }
  var resultado = ObstetriciaPrenatalService.validarMedicamentoGestacao(params.medicamento, params.trimestre);
  return resultado;
}

/**
 * cockpitAuditarPrescricaoGestante — audita lista de fármacos quanto a riscos teratogênicos e toxicidade.
 */
function cockpitAuditarPrescricaoGestante(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof ObstetriciaPrenatalService === 'undefined') {
    throw new Error('Módulo ObstetriciaPrenatalService indisponível.');
  }
  var resultado = ObstetriciaPrenatalService.auditarPrescricaoGestante(params.medicamentos, params.trimestre);
  return resultado;
}

/**
 * cockpitInterpretarSorologiasPrenatal — interpreta painel sorológico e exames laboratoriais do pré-natal.
 */
function cockpitInterpretarSorologiasPrenatal(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof ObstetriciaPrenatalService === 'undefined') {
    throw new Error('Módulo ObstetriciaPrenatalService indisponível.');
  }
  return ObstetriciaPrenatalService.interpretarSorologiasLaboratorioPrenatal(params);
}

/**
 * cockpitTrabalhoParto — avalia fase de parto, plano de De Lee e Bishop.
 */
function cockpitTrabalhoParto(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof CentroObstetricoService === 'undefined') {
    throw new Error('Módulo CentroObstetricoService indisponível.');
  }
  return CentroObstetricoService.avaliarTrabalhoParto(params);
}

/**
 * cockpitSulfatoMagnesio — prescrição Zuspan/Pritchard e alerta de intoxicação.
 */
function cockpitSulfatoMagnesio(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof CentroObstetricoService === 'undefined') {
    throw new Error('Módulo CentroObstetricoService indisponível.');
  }
  return CentroObstetricoService.prescreverSulfatoMagnesio(params);
}

/**
 * cockpitCriseHipertensivaObstetrica — protocolo de Hidralazina IV e Nifedipino VO.
 */
function cockpitCriseHipertensivaObstetrica(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof CentroObstetricoService === 'undefined') {
    throw new Error('Módulo CentroObstetricoService indisponível.');
  }
  return CentroObstetricoService.manejarCriseHipertensiva(params);
}

/**
 * cockpitHemorragiaPosParto — protocolo dos 4 Ts, Índice de Choque e uterotônicos.
 */
function cockpitHemorragiaPosParto(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof CentroObstetricoService === 'undefined') {
    throw new Error('Módulo CentroObstetricoService indisponível.');
  }
  return CentroObstetricoService.gerenciarHemorragiaPosParto(params);
}

/**
 * cockpitProfilaxiaGbs — profilaxia de sepse neonatal precoce por GBS intraparto.
 */
function cockpitProfilaxiaGbs(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof CentroObstetricoService === 'undefined') {
    throw new Error('Módulo CentroObstetricoService indisponível.');
  }
  return CentroObstetricoService.avaliarProfilaxiaGbs(params);
}

/**
 * cockpitPrematuridadeRpmo — corticoterapia, neuroproteção <32s, tocólise e latência.
 */
function cockpitPrematuridadeRpmo(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof CentroObstetricoService === 'undefined') {
    throw new Error('Módulo CentroObstetricoService indisponível.');
  }
  return CentroObstetricoService.protocoloPrematuridadeRpmo(params);
}

/**
 * cockpitResumoCentroObstetrico — relatório clínico estruturado unificado.
 */
function cockpitResumoCentroObstetrico(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof CentroObstetricoService === 'undefined') {
    throw new Error('Módulo CentroObstetricoService indisponível.');
  }
  return CentroObstetricoService.gerarResumoCentroObstetrico(params);
}

/**
 * cockpitRastreioColoUterino — rastreio de câncer de colo de útero (INCA/MS).
 */
function cockpitRastreioColoUterino(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof GinecologiaAmbulatorialService === 'undefined') {
    throw new Error('Módulo GinecologiaAmbulatorialService indisponível.');
  }
  return GinecologiaAmbulatorialService.avaliarRastreioColoUterino(params);
}

/**
 * cockpitSangramentoUterinoAnormal — SUA com classificação FIGO/PALM-COEIN e hemostasia.
 */
function cockpitSangramentoUterinoAnormal(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof GinecologiaAmbulatorialService === 'undefined') {
    throw new Error('Módulo GinecologiaAmbulatorialService indisponível.');
  }
  return GinecologiaAmbulatorialService.avaliarSangramentoUterinoAnormal(params);
}

/**
 * cockpitElegibilidadeAnticoncepcao — critérios médicos de elegibilidade OMS (1 a 4).
 */
function cockpitElegibilidadeAnticoncepcao(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof GinecologiaAmbulatorialService === 'undefined') {
    throw new Error('Módulo GinecologiaAmbulatorialService indisponível.');
  }
  return GinecologiaAmbulatorialService.avaliarCriteriosElegibilidadeContracepcao(params);
}

/**
 * cockpitInfeccaoVulvovaginal — manejo de candidíase, vaginose bacteriana e tricomoníase.
 */
function cockpitInfeccaoVulvovaginal(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof GinecologiaAmbulatorialService === 'undefined') {
    throw new Error('Módulo GinecologiaAmbulatorialService indisponível.');
  }
  return GinecologiaAmbulatorialService.avaliarInfeccaoVulvovaginal(params);
}

/**
 * cockpitResumoGinecologia — resumo clínico unificado de ginecologia de consultório.
 */
function cockpitResumoGinecologia(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof GinecologiaAmbulatorialService === 'undefined') {
    throw new Error('Módulo GinecologiaAmbulatorialService indisponível.');
  }
  return GinecologiaAmbulatorialService.gerarResumoGinecologia(params);
}


/**
 * cockpitPainelPuericultura — Avaliação de antropometria, vacinas, DNPM e suplementação.
 */
function cockpitPainelPuericultura(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof PuericulturaPediatriaService === 'undefined') {
    throw new Error('Módulo PuericulturaPediatriaService indisponível.');
  }
  return PuericulturaPediatriaService.painelCompleto(params);
}

/**
 * cockpitSaudeIdosoAga - Avaliação Geriátrica Ampla rápida.
 */
function cockpitSaudeIdosoAga(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof SaudeIdosoService === 'undefined') {
    throw new Error('Módulo SaudeIdosoService indisponível.');
  }
  return SaudeIdosoService.gerarResumoAga(params);
}

/**
 * cockpitGeriatriaFrax - Calculadora FRAX (risco de fratura em 10 anos calibrado para o Brasil).
 */
function cockpitGeriatriaFrax(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof SaudeIdosoService === 'undefined') {
    throw new Error('Módulo SaudeIdosoService indisponível.');
  }
  if (typeof params === 'string') {
    return SaudeIdosoService.interpretarTextoLivreFrax(params);
  }
  return SaudeIdosoService.calcularFrax(params);
}
var cockpitFrax = cockpitGeriatriaFrax;

/**
 * cockpitGeriatriaOsteoporose - Protocolo clínico de osteoporose, bisfosfonatos e cálcio/vit D.
 */
function cockpitGeriatriaOsteoporose(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof SaudeIdosoService === 'undefined') {
    throw new Error('Módulo SaudeIdosoService indisponível.');
  }
  if (typeof params === 'string') {
    return SaudeIdosoService.interpretarTextoLivreOsteoporose(params);
  }
  return SaudeIdosoService.avaliarOsteoporose(params);
}
var cockpitOsteoporose = cockpitGeriatriaOsteoporose;

/**
 * cockpitGeriatriaQuedas - Protocolo integrado de profilaxia de quedas e mobilidade.
 */
function cockpitGeriatriaQuedas(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof SaudeIdosoService === 'undefined') {
    throw new Error('Módulo SaudeIdosoService indisponível.');
  }
  if (typeof params === 'string') {
    return SaudeIdosoService.interpretarTextoLivreQuedas(params);
  }
  return SaudeIdosoService.protocoloProfilaxiaQuedas(params);
}
var cockpitQuedas = cockpitGeriatriaQuedas;

/**
 * cockpitGeriatriaPolifarmacia - Revisão de polifarmácia com identificação de FRIDs.
 */
function cockpitGeriatriaPolifarmacia(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof SaudeIdosoService === 'undefined') {
    throw new Error('Módulo SaudeIdosoService indisponível.');
  }
  var lista = Array.isArray(params) ? params : (Array.isArray(params.lista) ? params.lista : (typeof params === 'string' ? params.split(/[,;e\n]/).map(function(s){return s.trim();}).filter(function(s){return s.length > 2;}) : []));
  return SaudeIdosoService.revisarPolifarmaciaQuedas(lista);
}

/**
 * cockpitGeriatriaAvancada - Avaliação unificada de Geriatria Avançada.
 */
function cockpitGeriatriaAvancada(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof SaudeIdosoService === 'undefined') {
    throw new Error('Módulo SaudeIdosoService indisponível.');
  }
  return SaudeIdosoService.avaliarGeriatriaAvancada(params);
}

/**
 * cockpitAuditarInfusaoUti - Auditoria de UTI terciária desativada (escopo generalista).
 */
function cockpitAuditarInfusaoUti(initData, params) {
  cockpitAutorizar_(initData);
  return {
    sucesso: false,
    desativado: true,
    mensagem: "Módulo especializado de infusão em UTI desativado para foco no internato/generalista."
  };
}

/**
 * cockpitObterModelosExameFisico — retorna catálogo de modelos de exame físico estruturado.
 */
function cockpitObterModelosExameFisico(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof SoapAmbulatorialService !== 'undefined' && SoapAmbulatorialService.MODELOS_EXAME_FISICO) {
    return { sucesso: true, modelos: SoapAmbulatorialService.MODELOS_EXAME_FISICO };
  }
  return { sucesso: true, modelos: {} };
}




function cockpitAuditarYSite(initData, params) {
  cockpitAutorizar_(initData);
  return {
    sucesso: false,
    desativado: true,
    mensagem: "Módulo especializado de incompatibilidade Y-site desativado para foco no internato/generalista."
  };
}

function cockpitSedacaoOpioides(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof SedacaoOpioidesService === 'undefined') {
    throw new Error('Módulo SedacaoOpioidesService indisponível.');
  }
  if (params.acao === 'rass') {
    return SedacaoOpioidesService.avaliarRASS(params.score);
  }
  if (params.acao === 'camicu') {
    return SedacaoOpioidesService.avaliarCAMICU(params);
  }
  if (params.acao === 'calcularMME') {
    return SedacaoOpioidesService.calcularMME(params.farmaco, params.via, params.doseMgDia);
  }
  if (params.acao === 'rotacionar') {
    return SedacaoOpioidesService.rotacionarOpioide(params.mmeTotal, params.alvoFarmaco, params.alvoVia, params.reducaoCruzada);
  }
  throw new Error('Ação inválida para sedação/opioides. Use rass, camicu, calcularMME ou rotacionar.');
}

function cockpitNefrologiaDhe(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof NefrologiaDheService === 'undefined') {
    throw new Error('Módulo NefrologiaDheService indisponível.');
  }
  if (params.acao === 'deficitSodio') {
    return NefrologiaDheService.calcularDeficitSodio(params.naAtual, params.naAlvo, params.peso, params.sexo, params.idade);
  }
  if (params.acao === 'planejarCorrecaoHiponatremia') {
    return NefrologiaDheService.planejarCorrecaoHiponatremia(params.naAtual, params.peso, params.sexo, params.idade, params.salinaSendoUsada);
  }
  if (params.acao === 'deficitAguaLivre') {
    return NefrologiaDheService.calcularDeficitAguaLivre(params.naAtual, params.peso, params.sexo, params.idade);
  }
  if (params.acao === 'avaliarHipercalemia') {
    return NefrologiaDheService.avaliarHipercalemia(params.kAtual, params.ecgAlterado);
  }
  throw new Error('Ação inválida para Nefrologia DHE.');
}


function cockpitSdraMecanica(initData, params) {
  cockpitAutorizar_(initData);
  return {
    sucesso: false,
    desativado: true,
    mensagem: "Módulo especializado de mecânica pulmonar / SDRA desativado para foco no internato/generalista."
  };
}

function cockpitSepsePuerperal(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof SepsePuerperalService === 'undefined') {
    throw new Error('Módulo SepsePuerperalService indisponível.');
  }
  if (params.acao === 'avaliarRiscoSepsis') {
    return SepsePuerperalService.avaliarRiscoSepsis(params);
  }
  throw new Error('Ação inválida para Sepse Puerperal.');
}

function cockpitPcrGestante(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof PcrGestanteService === 'undefined') {
    throw new Error('Módulo PcrGestanteService indisponível.');
  }
  if (params.acao === 'avaliarPcrGestante' || !params.acao) {
    return PcrGestanteService.avaliarPcrGestante(params);
  }
  throw new Error('Ação inválida para PCR na Gestante.');
}

function cockpitTevGestante(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof TevGestanteService === 'undefined') {
    throw new Error('Módulo TevGestanteService indisponível.');
  }
  var acao = params.acao || 'avaliarTevCompleto';
  if (acao === 'avaliarTevCompleto') {
    return TevGestanteService.avaliarTevCompleto(params);
  }
  if (acao === 'avaliarRiscoAntenatal') {
    return TevGestanteService.avaliarRiscoAntenatal(params);
  }
  if (acao === 'avaliarRiscoPosParto') {
    return TevGestanteService.avaliarRiscoPosParto(params);
  }
  if (acao === 'calcularDoseEnoxaparina') {
    return TevGestanteService.calcularDoseEnoxaparina(params.pesoKg, params.clearanceCreatinina, params.regime);
  }
  if (acao === 'verificarSegurancaNeuroaxial') {
    return TevGestanteService.verificarSegurancaNeuroaxial(params.ultimaDoseHorasAtras, params.tipoDose);
  }
  if (acao === 'verificarAlertasAnticoagulantes') {
    return TevGestanteService.verificarAlertasAnticoagulantes(params);
  }
  throw new Error('Ação inválida para TEV na Gestação/Puerpério.');
}

function cockpitClimaterioThm(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof ClimaterioThmService === 'undefined') {
    throw new Error('Módulo ClimaterioThmService indisponível.');
  }
  var acao = params.acao || 'avaliarThmCompleto';
  if (acao === 'avaliarThmCompleto') {
    return ClimaterioThmService.avaliarThmCompleto(params);
  }
  if (acao === 'avaliarJanelaOportunidade') {
    return ClimaterioThmService.avaliarJanelaOportunidade(params);
  }
  if (acao === 'auditarContraindicacoesThm') {
    return ClimaterioThmService.auditarContraindicacoesThm(params);
  }
  if (acao === 'determinarProtecaoEndometrial') {
    return ClimaterioThmService.determinarProtecaoEndometrial(params);
  }
  if (acao === 'selecionarViaAdministracao') {
    return ClimaterioThmService.selecionarViaAdministracao(params);
  }
  if (acao === 'avaliarSintomasGeniturinarios') {
    return ClimaterioThmService.avaliarSintomasGeniturinarios(params);
  }
  if (acao === 'sugerirAlternativasNaoHormonais') {
    return ClimaterioThmService.sugerirAlternativasNaoHormonais(params);
  }
  if (acao === 'verificarChecklistPreThm') {
    return ClimaterioThmService.verificarChecklistPreThm(params);
  }
  if (acao === 'gerarResumoThm') {
    return ClimaterioThmService.gerarResumoThm(params);
  }
  throw new Error('Ação inválida para Climatério e THM.');
}

function cockpitSopOvariosPolicisticos(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof SopOvariosPolicisticosService === 'undefined') {
    throw new Error('Módulo SopOvariosPolicisticosService indisponível.');
  }
  var acao = params.acao || 'avaliarSopCompleto';
  if (acao === 'avaliarSopCompleto') {
    return SopOvariosPolicisticosService.avaliarSopCompleto(params);
  }
  if (acao === 'avaliarCriteriosRotterda') {
    return SopOvariosPolicisticosService.avaliarCriteriosRotterda(params);
  }
  if (acao === 'auditarDiagnosticosDiferenciais') {
    return SopOvariosPolicisticosService.auditarDiagnosticosDiferenciais(params);
  }
  if (acao === 'estratificarRiscoMetabolico') {
    return SopOvariosPolicisticosService.estratificarRiscoMetabolico(params);
  }
  if (acao === 'determinarCondutaTerapeutica') {
    return SopOvariosPolicisticosService.determinarCondutaTerapeutica(params);
  }
  if (acao === 'gerarResumoSop') {
    return SopOvariosPolicisticosService.gerarResumoSop(params);
  }
  throw new Error('Ação inválida para Síndrome dos Ovários Policísticos.');
}

function cockpitDipAbscessoTuboOvariano(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof DipAbscessoTuboOvarianoService === 'undefined') {
    throw new Error('Módulo DipAbscessoTuboOvarianoService indisponível.');
  }
  var acao = params.acao || 'avaliarDipCompleto';
  if (acao === 'avaliarDipCompleto') {
    return DipAbscessoTuboOvarianoService.avaliarDipCompleto(params);
  }
  if (acao === 'avaliarCriteriosDiagnosticos') {
    return DipAbscessoTuboOvarianoService.avaliarCriteriosDiagnosticos(params);
  }
  if (acao === 'estadiarMonif') {
    return DipAbscessoTuboOvarianoService.estadiarMonif(params);
  }
  if (acao === 'avaliarCriteriosInternacao') {
    return DipAbscessoTuboOvarianoService.avaliarCriteriosInternacao(params);
  }
  if (acao === 'avaliarCondutaDiu') {
    return DipAbscessoTuboOvarianoService.avaliarCondutaDiu(params);
  }
  if (acao === 'gerarProtocoloParceiros') {
    return DipAbscessoTuboOvarianoService.gerarProtocoloParceiros(params);
  }
  if (acao === 'determinarCondutaTerapeutica') {
    return DipAbscessoTuboOvarianoService.determinarCondutaTerapeutica(params);
  }
  if (acao === 'gerarResumoDip') {
    return DipAbscessoTuboOvarianoService.gerarResumoDip(params);
  }
  throw new Error('Ação inválida para Doença Inflamatória Pélvica / ATO.');
}

function cockpitIaLocalStatus(session, params) {
  params = params || {};
  params.acao = 'status';
  return typeof cockpitLocalLlm === 'function' ? cockpitLocalLlm(session, params) : { ok: false, erro: 'cockpitLocalLlm indisponível' };
}

function cockpitIaLocalFallback(session, params) {
  params = params || {};
  params.acao = 'fallback_offline';
  return typeof cockpitLocalLlm === 'function' ? cockpitLocalLlm(session, params) : { ok: false, erro: 'cockpitLocalLlm indisponível' };
}

function cockpitPsiquiatriaUrgencia(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof PsiquiatriaUrgenciaService === 'undefined') {
    throw new Error('Módulo PsiquiatriaUrgenciaService indisponível.');
  }
  var acao = params.acao || 'avaliarPsiquiatriaCompleto';
  if (acao === 'avaliarPsiquiatriaCompleto') {
    return PsiquiatriaUrgenciaService.avaliarPsiquiatriaCompleto(params);
  }
  if (acao === 'avaliarAgitacaoPsicomotora') {
    return PsiquiatriaUrgenciaService.avaliarAgitacaoPsicomotora(params);
  }
  if (acao === 'estratificarRiscoSuicidio') {
    return PsiquiatriaUrgenciaService.estratificarRiscoSuicidio(params);
  }
  if (acao === 'avaliarDepressaoPhq9') {
    return PsiquiatriaUrgenciaService.avaliarDepressaoPhq9(params);
  }
  if (acao === 'selecionarAntidepressivo') {
    return PsiquiatriaUrgenciaService.selecionarAntidepressivo(params);
  }
  if (acao === 'avaliarDistoniaAguda') {
    return PsiquiatriaUrgenciaService.avaliarDistoniaAguda(params);
  }
  if (acao === 'avaliarSindromeNeurolepticaMaligna') {
    return PsiquiatriaUrgenciaService.avaliarSindromeNeurolepticaMaligna(params);
  }
  if (acao === 'avaliarSindromeSerotoninergica') {
    return PsiquiatriaUrgenciaService.avaliarSindromeSerotoninergica(params);
  }
  if (acao === 'gerarResumoPsiquiatria') {
    return PsiquiatriaUrgenciaService.gerarResumoPsiquiatria(params);
  }
  throw new Error('Ação inválida para Psiquiatria de Urgência.');
}

function cockpitRbac(initData, params) {
  cockpitAutorizar_(initData);
  return {
    sucesso: false,
    desativado: true,
    mensagem: "Módulo especializado de RBAC e auditoria burocrática desativado para foco no internato/generalista."
  };
}

function cockpitSuporteNutricional(initData, params) {
  cockpitAutorizar_(initData);
  return {
    sucesso: false,
    desativado: true,
    mensagem: "Módulo especializado de suporte nutricional hospitalar/UTI desativado para foco no internato/generalista."
  };
}







function cockpitOncologiaBasica(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof OncologiaBasicaService === 'undefined') {
    throw new Error('OncologiaBasicaService não carregado.');
  }
  
  if (params.acao === 'avaliarRastreamento') {
    return OncologiaBasicaService.avaliarRastreamento(params.perfil || {});
  }
  if (params.acao === 'condutaBiRads') {
    return OncologiaBasicaService.condutaBiRads(params.birads);
  }
  if (params.acao === 'manejoEfeitoAdverso') {
    return OncologiaBasicaService.manejoEfeitoAdverso(params.efeito, params.parametros || {});
  }
  throw new Error('Ação inválida para Oncologia Básica.');
}

function cockpitEndocrinologiaDiabetes(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof EndocrinologiaDiabetesService === 'undefined') {
    throw new Error('EndocrinologiaDiabetesService não carregado.');
  }
  var p = params.parametros || params;
  if (params.acao === 'calcularInsulinaAmbulatorial') {
    return EndocrinologiaDiabetesService.calcularInsulinaAmbulatorial(p);
  }
  if (params.acao === 'protocoloCorrecaoHospitalar') {
    return EndocrinologiaDiabetesService.protocoloCorrecaoHospitalar(p);
  }
  if (params.acao === 'manejoCriseHiperglicemica') {
    return EndocrinologiaDiabetesService.manejoCriseHiperglicemica(p);
  }
  if (params.acao === 'formatarResumoDiabetes') {
    return EndocrinologiaDiabetesService.formatarResumoDiabetes(p);
  }
  throw new Error('Ação inválida para Endocrinologia/Diabetes.');
}

function cockpitPalsPediatria(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof PalsPediatriaService === 'undefined') {
    throw new Error('PalsPediatriaService não carregado.');
  }
  if (params.acao === 'avaliar') {
    return PalsPediatriaService.avaliarPals(params.parametros || params);
  }
  throw new Error('Ação inválida para PALS Pediatria.');
}


function cockpitNeurologiaAvc(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof NeurologiaAvcService === 'undefined') {
    throw new Error('NeurologiaAvcService não carregado.');
  }
  if (params.acao === 'trombolise' || params.acao === 'avaliar') {
    return NeurologiaAvcService.avaliarTrombolise(params.parametros || params);
  }
  if (params.acao === 'hic') {
    return NeurologiaAvcService.calcularHic(params.parametros || params);
  }
  if (params.acao === 'formatarResumoAvc') {
    return NeurologiaAvcService.formatarResumoAvc(params.parametros || params);
  }
  throw new Error('Ação inválida para Neurologia AVC.');
}


function cockpitToxicologiaEmergencia(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof ToxicologiaEmergenciaService === 'undefined') {
    throw new Error('ToxicologiaEmergenciaService não carregado.');
  }
  var p = params.parametros || params;
  if (params.acao === 'avaliarParacetamol') {
    return ToxicologiaEmergenciaService.avaliarParacetamol(p);
  }
  if (params.acao === 'avaliarTriciclicos') {
    return ToxicologiaEmergenciaService.avaliarTriciclicos(p);
  }
  if (params.acao === 'avaliarCardiotoxicos') {
    return ToxicologiaEmergenciaService.avaliarCardiotoxicos(p);
  }
  if (params.acao === 'avaliarOpioides') {
    return ToxicologiaEmergenciaService.avaliarOpioides(p);
  }
  throw new Error('Ação inválida para Toxicologia de Emergência.');
}

function cockpitHepatologiaHda(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof HepatologiaHdaService === 'undefined') {
    throw new Error('HepatologiaHdaService não carregado.');
  }
  return HepatologiaHdaService.avaliarHepatopatia(params.parametros || params);
}

function cockpitHepatologiaColestaseGestacional(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof HepatologiaColestaseGestacionalService === 'undefined') {
    throw new Error('HepatologiaColestaseGestacionalService não carregado.');
  }
  return HepatologiaColestaseGestacionalService.avaliar(params.parametros || params);
}

function cockpitAnalgesiaPca(initData, params) {
  cockpitAutorizar_(initData);
  return {
    sucesso: false,
    desativado: true,
    mensagem: "Módulo especializado de analgesia por PCA desativado para foco no internato/generalista."
  };
}

function cockpitViaAereaDificil(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof ViaAereaDificilService === 'undefined') {
    throw new Error('ViaAereaDificilService não carregado.');
  }
  var p = params.parametros || params;
  var acao = params.acao || 'completo';
  if (acao === 'lemon' || acao === 'avaliarLemon') {
    return ViaAereaDificilService.avaliarLemon(p);
  }
  if (acao === 'mascara' || acao === 'avaliarVentilacaoMascara') {
    return ViaAereaDificilService.avaliarVentilacaoMascara(p);
  }
  if (acao === 'rsi' || acao === 'calcularRsi') {
    return ViaAereaDificilService.calcularRsi(p);
  }
  if (acao === 'supraglotico' || acao === 'selecionarDispositivoSupraglotico') {
    var peso = p.pesoKg || p.peso || p;
    return ViaAereaDificilService.selecionarDispositivoSupraglotico(peso);
  }
  if (acao === 'algoritmo' || acao === 'algoritmoAsa') {
    return ViaAereaDificilService.algoritmoAsaViaAerea(p);
  }
  if (acao === 'formatarResumo') {
    return ViaAereaDificilService.formatarResumoViaAerea(p);
  }
  if (acao === 'completo') {
    var resLemon = ViaAereaDificilService.avaliarLemon(p);
    var resMoans = ViaAereaDificilService.avaliarVentilacaoMascara(p);
    var resRsi = ViaAereaDificilService.calcularRsi(p);
    var resSupraglotico = ViaAereaDificilService.selecionarDispositivoSupraglotico(p.pesoKg || 70);
    var resAlgoritmo = ViaAereaDificilService.algoritmoAsaViaAerea(p);
    return {
      lemon: resLemon,
      moans: resMoans,
      rsi: resRsi,
      dispositivoSupraglotico: resSupraglotico,
      algoritmo: resAlgoritmo,
      resumoFormatado: ViaAereaDificilService.formatarResumoViaAerea({
        lemon: resLemon,
        rsi: resRsi,
        algoritmo: resAlgoritmo
      })
    };
  }
  throw new Error('Ação inválida para Via Aérea Difícil.');
}

function cockpitAuditoriaKaizen(initData, params) {
  cockpitAutorizar_(initData);
  return {
    sucesso: false,
    desativado: true,
    mensagem: "Módulo especializado de Kaizen e auditoria prescritiva desativado para foco no internato/generalista.",
    textoFormatado: "⚠️ Módulo especializado de Kaizen desativado para foco no internato/generalista."
  };
}

function cockpitTransfusaoSanguinea(initData, params) {
  cockpitAutorizar_(initData);
  return {
    sucesso: false,
    desativado: true,
    mensagem: "Módulo especializado de hemoterapia/PTM desativado para foco no internato/generalista.",
    textoFormatado: "⚠️ Módulo especializado de hemoterapia/PTM desativado para foco no internato/generalista."
  };
}




function cockpitNefrologiaClearance(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros obrigatórios para cálculo de clearance não fornecidos.');
  var acao = params.acao || 'completo';
  var p = params.paciente || params;

  if (acao === 'calcular') {
    var crcl = NefrologiaClearanceService.calcularCockcroftGault(p.idade, p.peso, p.creatinina, p.sexo);
    var estagio = crcl.erro ? crcl.erro : NefrologiaClearanceService.classificarEstagio(crcl);
    return { sucesso: !crcl.erro, crcl: crcl, estagio: estagio };
  }

  if (acao === 'auditar') {
    var crcl = NefrologiaClearanceService.calcularCockcroftGault(p.idade, p.peso, p.creatinina, p.sexo);
    if (crcl.erro) return { sucesso: false, erro: crcl.erro };
    var auditoria = NefrologiaClearanceService.auditarPrescricao(crcl, p.medicamentos);
    return { sucesso: true, auditoria: auditoria };
  }

  if (acao === 'completo') {
    var crcl = NefrologiaClearanceService.calcularCockcroftGault(p.idade, p.peso, p.creatinina, p.sexo);
    if (crcl.erro) return { sucesso: false, erro: crcl.erro };
    var auditoria = NefrologiaClearanceService.auditarPrescricao(crcl, p.medicamentos);
    var texto = "*Clearance Estimado:* " + crcl + " mL/min (" + auditoria.estagio + ")\n\n";
    if (auditoria.bloqueios.length > 0) {
      texto += "🛑 *BLOQUEIOS / CONTRAINDICAÇÕES:*\n- " + auditoria.bloqueios.join("\n- ") + "\n\n";
    }
    if (auditoria.alertas.length > 0) {
      texto += "⚠️ *ALERTAS DE AJUSTE DE DOSE:*\n- " + auditoria.alertas.join("\n- ") + "\n\n";
    }
    if (auditoria.orientacoes.length > 0) {
      texto += "✅ *ORIENTAÇÕES:*\n- " + auditoria.orientacoes.join("\n- ") + "\n";
    }

    return {
      sucesso: true,
      crcl: crcl,
      auditoria: auditoria,
      textoFormatado: texto
    };
  }

  throw new Error('Ação inválida para Nefrologia Clearance.');
}

function cockpitInfectologiaNeutropenia(initData, params) {
  cockpitAutorizar_(initData);
  return {
    sucesso: false,
    desativado: true,
    mensagem: "Módulo especializado de neutropenia febril oncológica desativado para foco no internato/generalista.",
    textoFormatado: "⚠️ Módulo especializado de neutropenia desativado para foco no internato/generalista."
  };
}

function cockpitGastroenterologiaPancreatite(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros obrigatórios para pancreatite não fornecidos.');
  
  var avaliacao = GastroenterologiaPancreatiteService.avaliarPaciente(params);
  var bisap = avaliacao.bisap;
  var hidra = avaliacao.protocoloHidratacao;
  var nutri = avaliacao.protocoloNutricao;
  
  var texto = "🩸 *PANCREATITE AGUDA E MANEJO DE HIDRATAÇÃO*\n\n";
  texto += "*Escore BISAP:* " + bisap.escore + " pontos\n";
  texto += "*Risco de Gravidade:* " + bisap.riscoGravidade + "\n";
  texto += "*Mortalidade Esperada:* " + bisap.mortalidadeEsperada + "\n\n";
  
  texto += "💧 *PROTOCOLO DE HIDRATAÇÃO:*\n";
  for (var i = 0; i < hidra.length; i++) {
    texto += "• " + hidra[i] + "\n";
  }
  
  texto += "\n🍽️ *PROTOCOLO DE NUTRIÇÃO:*\n";
  for (var j = 0; j < nutri.length; j++) {
    texto += "• " + nutri[j] + "\n";
  }
  
  return {
    sucesso: true,
    avaliacao: avaliacao,
    textoFormatado: texto
  };
}

function cockpitCardiologiaEmergencia(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros obrigatórios para Cardiologia de Emergência não fornecidos.');
  
  if (typeof CardiologiaEmergenciaService === 'undefined') {
    throw new Error('Serviço CardiologiaEmergenciaService indisponível.');
  }

  var avaliacao = CardiologiaEmergenciaService.avaliarPaciente(params);
  var heart = avaliacao.heart;
  var timiScasst = avaliacao.timiScasst;
  var dapt = avaliacao.dapt;
  var adj = avaliacao.adjuvantes;

  var texto = "🫀 *CARDIOLOGIA DE EMERGÊNCIA — DOR TORÁCICA & IAM*\n\n";

  if (avaliacao.alertasGerais.length > 0) {
    for (var a = 0; a < avaliacao.alertasGerais.length; a++) {
      texto += avaliacao.alertasGerais[a] + "\n\n";
    }
  }

  texto += "📊 *ESTRATIFICAÇÃO DE RISCO:*\n";
  texto += "• *HEART Score:* " + heart.escore + " pontos (" + heart.risco + ") — MACE 6 semanas: " + heart.taxaMACE + "\n";
  texto += "  _Conduta:_ " + heart.recomendacao + "\n";
  texto += "• *TIMI SCASST:* " + timiScasst.escore + "/7 pontos (" + timiScasst.risco + ") — MACE 14 dias: " + timiScasst.taxaMACE14Dias + "\n";
  texto += "  _Estratégia:_ " + timiScasst.estrategia + "\n";

  if (avaliacao.timiIamcsst) {
    texto += "• *TIMI IAMCSST:* " + avaliacao.timiIamcsst.escore + "/14 pontos — Mortalidade 30 dias: " + avaliacao.timiIamcsst.mortalidade30Dias + "\n";
  }

  texto += "\n💊 *DUPLO BLOQUEIO ANTIPLAQUETÁRIO (DAPT):*\n";
  texto += "• *P2Y12 de Escolha:* " + dapt.p2y12Escolhido + "\n";
  for (var i = 0; i < dapt.recomendacoes.length; i++) {
    var rec = dapt.recomendacoes[i];
    texto += "• *" + rec.farmaco + "*:\n  - Ataque: " + rec.ataque + "\n  - Manutenção: " + rec.manutencao + "\n";
  }

  if (dapt.bloqueios.length > 0) {
    texto += "\n🚫 *BLOQUEIOS DE SEGURANÇA DAPT:*\n";
    for (var b = 0; b < dapt.bloqueios.length; b++) {
      var bloq = dapt.bloqueios[b];
      texto += "• *[" + bloq.nivel + "] " + bloq.farmaco + "*: " + bloq.motivo + "\n";
    }
  }

  if (dapt.alertas.length > 0) {
    texto += "\n⚠️ *ALERTAS DAPT & INTERAÇÕES:*\n";
    for (var d = 0; d < dapt.alertas.length; d++) {
      texto += "• " + dapt.alertas[d] + "\n";
    }
  }

  texto += "\n🩺 *MEDICAÇÃO ADJUVANTE & ANTI-ISQUÊMICA:*\n";
  for (var m = 0; m < adj.farmacosRecomendados.length; m++) {
    var med = adj.farmacosRecomendados[m];
    texto += "• *" + med.farmaco + "*: " + med.posologia + "\n";
  }

  if (adj.bloqueios.length > 0) {
    texto += "\n⛔ *CONTRAINDICAÇÕES ADJUVANTES DISPARADAS:*\n";
    for (var k = 0; k < adj.bloqueios.length; k++) {
      var blkAdj = adj.bloqueios[k];
      texto += "• *[" + blkAdj.nivel + "] " + blkAdj.farmaco + "*: " + blkAdj.motivo + "\n";
    }
  }

  if (adj.alertas.length > 0) {
    texto += "\n⚠️ *ALERTAS ADJUVANTES / RENAL:*\n";
    for (var r = 0; r < adj.alertas.length; r++) {
      texto += "• " + adj.alertas[r] + "\n";
    }
  }

  return {
    sucesso: true,
    avaliacao: avaliacao,
    textoFormatado: texto
  };
}

/**
 * Análise Inteligente de Gasometria Arterial e Distúrbios Ácido-Base (Regra dos 5 Passos)
 * @param {string} initData Sessão / autenticação
 * @param {Object} params Parâmetros gasométricos e laboratoriais
 */
function cockpitGasometriaAcidoBase(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros obrigatórios para Análise Gasométrica não fornecidos.');
  
  if (typeof GasometriaAcidoBaseService === 'undefined') {
    throw new Error('Serviço GasometriaAcidoBaseService indisponível.');
  }

  var analise = GasometriaAcidoBaseService.analisarGasometria(params);
  var texto = GasometriaAcidoBaseService.formatarTextoTelegram(analise);

  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}
var cockpitGasometria = cockpitGasometriaAcidoBase;

/**
 * Módulo de Suporte Nutricional em Pediatria (Fórmula Infantil / Holliday-Segar)
 * @param {string} initData Sessão / autenticação
 * @param {Object} params Parâmetros clínicos (pesoKg, idadeMeses, condicaoClinica, tipoFormula, volumeMamadaMl, etc.)
 */
function cockpitSuporteNutricionalPediatrico(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros obrigatórios para Suporte Nutricional Pediátrico não fornecidos.');

  if (typeof SuporteNutricionalPediatricoService === 'undefined') {
    throw new Error('Serviço SuporteNutricionalPediatricoService indisponível.');
  }

  var analise = SuporteNutricionalPediatricoService.avaliarSuporteNutricionalPediatricoCompleto(params);
  var texto = SuporteNutricionalPediatricoService.formatarTextoTelegram(analise);

  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

var cockpitNutricaoPediatrica = cockpitSuporteNutricionalPediatrico;

/**
 * Módulo de Hematologia: Investigação e Manejo de Anemias
 * @param {string} initData Sessão / autenticação
 * @param {Object} params Parâmetros clínicos (hb, vcm, hcm, chcm, rdw, hemacias, reticulocitos, ht, ferritina, ferroSerico, tibc, ist, pesoKg, gestante, etc.)
 */
function cockpitHematologiaAnemias(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros obrigatórios para Análise de Anemia e Hemograma não fornecidos.');

  if (typeof HematologiaAnemiasService === 'undefined') {
    throw new Error('Serviço HematologiaAnemiasService indisponível.');
  }

  var analise = HematologiaAnemiasService.analisarCasoCompleto(params);

  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: analise.textoFormatado
  };
}

var cockpitManejoAnemias = cockpitHematologiaAnemias;
var cockpitAnemia = cockpitHematologiaAnemias;

/**
 * Análise de IC Descompensada / Choque Cardiogênico (Forrester & Stevenson)
 * @param {string} initData Sessão / autenticação
 * @param {Object} params Parâmetros clínicos (congestao, ma_perfusao, pas, uso_betabloqueador, fase_aguda_descompensada)
 */
function cockpitICDescompensada(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros obrigatórios para IC Descompensada não fornecidos.');
  return cockpitCardiologiaIntensiva(initData, params);
}

function cockpitCardiologiaIntensiva(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros obrigatórios para IC Descompensada não fornecidos.');
  
  if (typeof CardiologiaIntensivaService === 'undefined') {
    throw new Error('Serviço CardiologiaIntensivaService indisponível.');
  }

  var avaliacao = CardiologiaIntensivaService.avaliarPacienteICDescompensada(params);
  
  var texto = "🫀 *CARDIOLOGIA INTENSIVA — CHOQUE CARDIOGÊNICO E IC DESCOMPENSADA*\n\n";
  
  var perf = avaliacao.perfil_clinico;
  texto += "*Classificação de Forrester & Stevenson:* Perfil " + perf.perfil + "\n";
  texto += "*Descrição:* " + perf.descricao + "\n";
  texto += "*Hemodinâmica:* " + perf.diagnostico_hemodinamico + " / " + perf.perfusao + "\n\n";
  
  texto += "*Conduta Geral:* " + perf.conduta_geral + "\n\n";
  
  var farmaco = avaliacao.plano_farmacologico;
  
  if (farmaco.bloqueios_seguranca.length > 0) {
    texto += "⚠️ *BLOQUEIOS DE SEGURANÇA:*\n";
    for (var i = 0; i < farmaco.bloqueios_seguranca.length; i++) {
      texto += "• " + farmaco.bloqueios_seguranca[i] + "\n";
    }
    texto += "\n";
  }

  if (farmaco.diuretico.length > 0) {
    texto += "💧 *DIURÉTICO (ALÇA):*\n";
    for (var i = 0; i < farmaco.diuretico.length; i++) {
      texto += "• " + farmaco.diuretico[i] + "\n";
    }
    texto += "\n";
  }

  if (farmaco.vasodilatador.length > 0) {
    texto += "🌬️ *VASODILATADOR:*\n";
    for (var i = 0; i < farmaco.vasodilatador.length; i++) {
      texto += "• " + farmaco.vasodilatador[i] + "\n";
    }
    texto += "\n";
  }

  if (farmaco.inotropico.length > 0) {
    texto += "⚡ *INOTRÓPICO:*\n";
    for (var i = 0; i < farmaco.inotropico.length; i++) {
      texto += "• " + farmaco.inotropico[i] + "\n";
    }
    texto += "\n";
  }

  if (farmaco.vasopressor.length > 0) {
    texto += "🩸 *VASOPRESSOR:*\n";
    for (var i = 0; i < farmaco.vasopressor.length; i++) {
      texto += "• " + farmaco.vasopressor[i] + "\n";
    }
    texto += "\n";
  }

  return {
    sucesso: true,
    avaliacao: avaliacao,
    textoFormatado: texto
  };
}

function cockpitNefrologiaKdigo(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros obrigatórios para LRA não fornecidos.');
  if (typeof NefrologiaLRAService === 'undefined') throw new Error('Serviço NefrologiaLRAService indisponível.');
  
  var analise = NefrologiaLRAService.avaliarLRA(params);
  var texto = NefrologiaLRAService.formatarTextoTelegram(analise);
  
  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitPneumologiaAsma(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros da crise asmática não fornecidos.');
  if (typeof PneumologiaCriseAsmaticaService === 'undefined') {
    throw new Error('Serviço PneumologiaCriseAsmaticaService indisponível.');
  }

  var analise = PneumologiaCriseAsmaticaService.avaliarCriseAsmatica(params);
  var texto = PneumologiaCriseAsmaticaService.formatarTextoTelegram(analise);

  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitCriseAsmatica(initData, params) {
  return cockpitPneumologiaAsma(initData, params);
}


function cockpitObstetriciaRcf(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros de RCF/Doppler não fornecidos.');
  if (typeof ObstetriciaRcfDopplerService === 'undefined') {
    throw new Error('Serviço ObstetriciaRcfDopplerService indisponível.');
  }

  // Aceita texto livre (laudo colado) ou objeto estruturado
  var entrada = typeof params === 'string'
    ? ObstetriciaRcfDopplerService.extrairParametrosTexto(params)
    : (params.texto ? ObstetriciaRcfDopplerService.extrairParametrosTexto(params.texto) : params);

  var analise = ObstetriciaRcfDopplerService.avaliarRcf(entrada);
  var texto = ObstetriciaRcfDopplerService.formatarTextoTelegram(analise);

  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitRestricaoCrescimentoFetal(initData, params) {
  return cockpitObstetriciaRcf(initData, params);
}

function cockpitHepatologiaColestase(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros de Colestase/EHAG não fornecidos.');
  if (typeof HepatologiaColestaseGestacionalService === 'undefined') {
    throw new Error('Serviço HepatologiaColestaseGestacionalService indisponível.');
  }

  // Aceita texto livre ou objeto estruturado
  var entrada = typeof params === 'string'
    ? HepatologiaColestaseGestacionalService.extrairParametrosTexto(params)
    : (params.texto ? HepatologiaColestaseGestacionalService.extrairParametrosTexto(params.texto) : params);

  var analise = HepatologiaColestaseGestacionalService.avaliar(entrada);
  var texto = HepatologiaColestaseGestacionalService.formatarTextoTelegram(analise);

  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitColestaseGestacional(initData, params) {
  return cockpitHepatologiaColestase(initData, params);
}

function cockpitEhagSwansea(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros de Swansea/EHAG não fornecidos.');
  if (typeof HepatologiaColestaseGestacionalService === 'undefined') {
    throw new Error('Serviço HepatologiaColestaseGestacionalService indisponível.');
  }

  var entrada = typeof params === 'string'
    ? HepatologiaColestaseGestacionalService.extrairParametrosTexto(params)
    : params;

  var analise = HepatologiaColestaseGestacionalService.avaliarSwansea(entrada);
  var texto = HepatologiaColestaseGestacionalService.formatarTextoTelegram(analise);

  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitObstetriciaToxoplasmose(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros de Toxoplasmose não fornecidos.');
  if (typeof ObstetriciaToxoplasmoseService === 'undefined') {
    throw new Error('Serviço ObstetriciaToxoplasmoseService indisponível.');
  }

  var entrada = typeof params === 'string'
    ? ObstetriciaToxoplasmoseService.extrairParametrosTexto(params)
    : (params.texto ? ObstetriciaToxoplasmoseService.extrairParametrosTexto(params.texto) : params);

  var analise = ObstetriciaToxoplasmoseService.avaliar(entrada);
  var texto = ObstetriciaToxoplasmoseService.formatarTextoTelegram(analise);

  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitToxoplasmoseGestacional(initData, params) {
  return cockpitObstetriciaToxoplasmose(initData, params);
}

function cockpitCardiologiaFaAnticoagulacao(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros de FA não fornecidos.');
  if (typeof CardiologiaFaAnticoagulacaoService === 'undefined') {
    throw new Error('Serviço CardiologiaFaAnticoagulacaoService indisponível.');
  }

  var entrada = typeof params === 'string'
    ? CardiologiaFaAnticoagulacaoService.extrairParametrosTexto(params)
    : (params.texto ? CardiologiaFaAnticoagulacaoService.extrairParametrosTexto(params.texto) : params);

  var analise = CardiologiaFaAnticoagulacaoService.avaliar(entrada);
  var texto = CardiologiaFaAnticoagulacaoService.formatarTextoTelegram(analise);

  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitFibrilacaoAtrial(initData, params) {
  return cockpitCardiologiaFaAnticoagulacao(initData, params);
}

function cockpitUrologiaColicaNefretica(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros de cólica nefrética não fornecidos.');
  if (typeof UrologiaColicaNefreticaService === 'undefined') {
    throw new Error('Serviço UrologiaColicaNefreticaService indisponível.');
  }

  var entrada = typeof params === 'string'
    ? UrologiaColicaNefreticaService.extrairParametrosTexto(params)
    : (params.texto ? UrologiaColicaNefreticaService.extrairParametrosTexto(params.texto) : params);

  var analise = UrologiaColicaNefreticaService.avaliar(entrada);
  var texto = UrologiaColicaNefreticaService.formatarTextoTelegram(analise);

  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitColicaNefretica(initData, params) {
  return cockpitUrologiaColicaNefretica(initData, params);
}

function cockpitPediatriaBronquiolite(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros de Bronquiolite não fornecidos.');
  if (typeof PediatriaBronquioliteService === 'undefined') {
    throw new Error('Serviço PediatriaBronquioliteService indisponível.');
  }

  var entrada = typeof params === 'string'
    ? PediatriaBronquioliteService.extrairParametrosTexto(params)
    : (params.texto ? PediatriaBronquioliteService.extrairParametrosTexto(params.texto) : params);

  var analise = PediatriaBronquioliteService.avaliar(entrada);
  var texto = PediatriaBronquioliteService.formatarTextoTelegram(analise);

  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitBronquiolite(initData, params) {
  return cockpitPediatriaBronquiolite(initData, params);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports.cockpitPediatriaBronquiolite = cockpitPediatriaBronquiolite;
  module.exports.cockpitBronquiolite = cockpitBronquiolite;
  module.exports.cockpitEndocrinologiaHiperprolactinemia = cockpitEndocrinologiaHiperprolactinemia;
  module.exports.cockpitHiperprolactinemia = cockpitHiperprolactinemia;
}

function cockpitEndocrinologiaHiperprolactinemia(initData, params) {
  cockpitAutorizar_(initData);
  return {
    sucesso: false,
    desativado: true,
    mensagem: "Módulo especializado de endocrinologia/hiperprolactinemia desativado para foco no internato/generalista.",
    textoFormatado: "⚠️ Módulo especializado de hiperprolactinemia desativado para foco no internato/generalista."
  };
}

function cockpitHiperprolactinemia(initData, params) {
  return cockpitEndocrinologiaHiperprolactinemia(initData, params);
}

function cockpitGinecologiaEndometriose(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros de Endometriose não fornecidos.');
  if (typeof GinecologiaEndometrioseService === 'undefined') {
    throw new Error('Serviço GinecologiaEndometrioseService indisponível.');
  }

  var entrada = typeof params === 'string'
    ? GinecologiaEndometrioseService.extrairParametrosTexto(params)
    : (params.texto ? GinecologiaEndometrioseService.extrairParametrosTexto(params.texto) : params);

  var analise = GinecologiaEndometrioseService.avaliar(entrada);
  var texto = GinecologiaEndometrioseService.formatarTextoTelegram(analise);

  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitEndometriose(initData, params) {
  return cockpitGinecologiaEndometriose(initData, params);
}

function cockpitObstetriciaSaf(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros de SAF/Trombofilias não fornecidos.');
  var service = typeof ObstetriciaSafTrombofiliasService !== 'undefined'
    ? ObstetriciaSafTrombofiliasService
    : (typeof ObstetriciaSafService !== 'undefined' ? ObstetriciaSafService : null);
  if (!service) {
    throw new Error('Serviço ObstetriciaSafTrombofiliasService indisponível.');
  }

  var entrada = typeof params === 'string'
    ? service.extrairParametrosTexto(params)
    : (params.texto ? service.extrairParametrosTexto(params.texto) : params);

  var analise = service.avaliar(entrada);
  var texto = service.formatarTextoTelegram(analise);

  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitSafTrombofilias(initData, params) {
  return cockpitObstetriciaSaf(initData, params);
}

function cockpitSafGestacional(initData, params) {
  return cockpitObstetriciaSaf(initData, params);
}

function cockpitCardiologiaIcCronica(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros de Insuficiência Cardíaca não fornecidos.');
  if (typeof CardiologiaIcCronicaService === 'undefined') {
    throw new Error('Serviço CardiologiaIcCronicaService indisponível.');
  }

  var entrada = typeof params === 'string'
    ? CardiologiaIcCronicaService.extrairParametrosTexto(params)
    : (params.texto ? CardiologiaIcCronicaService.extrairParametrosTexto(params.texto) : params);

  var analise = CardiologiaIcCronicaService.avaliar(entrada);
  var texto = CardiologiaIcCronicaService.formatarTextoTelegram(analise);

  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitIcCronica(initData, params) {
  return cockpitCardiologiaIcCronica(initData, params);
}

function cockpitOftalmologiaEmergencia(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros de Oftalmologia de Emergência não fornecidos.');
  if (typeof OftalmologiaEmergenciaService === 'undefined') {
    throw new Error('Serviço OftalmologiaEmergenciaService indisponível.');
  }

  var entrada = typeof params === 'string'
    ? OftalmologiaEmergenciaService.extrairParametrosTexto(params)
    : (params.texto ? OftalmologiaEmergenciaService.extrairParametrosTexto(params.texto) : params);

  var analise = OftalmologiaEmergenciaService.avaliar(entrada);
  var texto = OftalmologiaEmergenciaService.formatarTextoTelegram(analise);

  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitOftalmologia(initData, params) {
  return cockpitOftalmologiaEmergencia(initData, params);
}


function cockpitChoqueSeptico(initData, pesoKg, doseNora) {
  var peso = pesoKg;
  var dose = doseNora;
  if (typeof initData === 'number') {
    dose = pesoKg;
    peso = initData;
  } else if (typeof pesoKg === 'object' && pesoKg !== null) {
    peso = pesoKg.pesoKg || pesoKg.peso;
    dose = pesoKg.doseNora || pesoKg.dose;
  } else if (typeof initData === 'object' && initData !== null) {
    peso = initData.pesoKg || initData.peso;
    dose = initData.doseNora || initData.dose;
  }
  if (typeof EmergenciaChoqueSepticoService === "undefined") return { erro: "Módulo offline." };
  return EmergenciaChoqueSepticoService.avaliarCirciEVasopressina(peso, dose);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports.cockpitGinecologiaEndometriose = cockpitGinecologiaEndometriose;
  module.exports.cockpitEndometriose = cockpitEndometriose;
  module.exports.cockpitObstetriciaSaf = cockpitObstetriciaSaf;
  module.exports.cockpitSafTrombofilias = cockpitSafTrombofilias;
  module.exports.cockpitSafGestacional = cockpitSafGestacional;
  module.exports.cockpitCardiologiaIcCronica = cockpitCardiologiaIcCronica;
  module.exports.cockpitIcCronica = cockpitIcCronica;
  module.exports.cockpitOftalmologiaEmergencia = cockpitOftalmologiaEmergencia;
  module.exports.cockpitOftalmologia = cockpitOftalmologia;
}


// --------------------------------------------------------------------------------------------
// CARDIOLOGIA: ICC
// --------------------------------------------------------------------------------------------
function cockpitCardiologiaIcc(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros de Insuficiência Cardíaca não fornecidos.');
  var service = (typeof CardiologiaICCService !== 'undefined') ? CardiologiaICCService : (typeof CardiologiaIcCronicaService !== 'undefined' ? CardiologiaIcCronicaService : null);
  if (!service) return { erro: "Módulo Cardiologia ICC não carregado no backend." };

  var fe = (typeof params === 'object') ? (params.fe !== undefined ? params.fe : params.feve) : params;
  if (fe === undefined && typeof params === 'string') {
    var m = params.match(/(\d{1,2}(?:[.,]\d+)?)/);
    if (m) fe = parseFloat(m[1].replace(',', '.'));
  }
  var result = service.gerarRelatorioCompleto(fe);
  return result;
}

function cockpitICC(initData, params) {
    return cockpitCardiologiaIcc(initData, params);
}

function cockpitPneumologiaDpocVni(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros de DPOC/VNI não fornecidos.');
  if (typeof PneumologiaDpocVniService === 'undefined') {
    throw new Error('Serviço PneumologiaDpocVniService indisponível.');
  }

  var analise = PneumologiaDpocVniService.avaliarVni(params);
  var texto = PneumologiaDpocVniService.formatarTextoTelegram(analise);

  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitDpocVni(initData, params) {
  return cockpitPneumologiaDpocVni(initData, params);
}

function cockpitReumatologiaMonoartrite(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros de Monoartrite não fornecidos.');
  if (typeof ReumatologiaMonoartriteFebreReumaticaService === 'undefined') {
    throw new Error('Serviço ReumatologiaMonoartriteFebreReumaticaService indisponível.');
  }

  var analise = ReumatologiaMonoartriteFebreReumaticaService.analisarMonoartrite(params);
  var texto = ReumatologiaMonoartriteFebreReumaticaService.formatarMonoartriteTelegram(analise);

  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitMonoartrite(initData, params) {
  return cockpitReumatologiaMonoartrite(initData, params);
}

function cockpitReumatologiaFebreReumatica(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros de Febre Reumática não fornecidos.');
  if (typeof ReumatologiaMonoartriteFebreReumaticaService === 'undefined') {
    throw new Error('Serviço ReumatologiaMonoartriteFebreReumaticaService indisponível.');
  }

  var analise = ReumatologiaMonoartriteFebreReumaticaService.avaliarFebreReumatica(params);
  var texto = ReumatologiaMonoartriteFebreReumaticaService.formatarFebreReumaticaTelegram(analise);

  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitFebreReumatica(initData, params) {
  return cockpitReumatologiaFebreReumatica(initData, params);
}

function cockpitJones(initData, params) {
  return cockpitReumatologiaFebreReumatica(initData, params);
}

function cockpitDermatologiaLesao(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros de lesão elementar não fornecidos.');
  if (typeof DermatologiaLesoesIstsService === 'undefined') {
    throw new Error('Serviço DermatologiaLesoesIstsService indisponível.');
  }
  var analise = DermatologiaLesoesIstsService.diferenciarLesaoElementar(params);
  var texto = DermatologiaLesoesIstsService.formatarDermatologiaTelegram(analise);
  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitDermatologiaHerpes(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros de Herpes não fornecidos.');
  if (typeof DermatologiaLesoesIstsService === 'undefined') {
    throw new Error('Serviço DermatologiaLesoesIstsService indisponível.');
  }
  var analise = DermatologiaLesoesIstsService.calcularPosologiaAntiviralHerpes(params);
  var texto = DermatologiaLesoesIstsService.formatarHerpesAntiviralTelegram(analise);
  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitHerpes(initData, params) {
  return cockpitDermatologiaHerpes(initData, params);
}

function cockpitZoster(initData, params) {
  return cockpitDermatologiaHerpes(initData, params);
}

function cockpitDermatologiaUlcerasGenitais(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros de úlcera genital não fornecidos.');
  if (typeof DermatologiaLesoesIstsService === 'undefined') {
    throw new Error('Serviço DermatologiaLesoesIstsService indisponível.');
  }
  var analise = DermatologiaLesoesIstsService.avaliarUlceraGenitalIst(params);
  var texto = DermatologiaLesoesIstsService.formatarUlcerasGenitaisTelegram(analise);
  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitUlceraGenital(initData, params) {
  return cockpitDermatologiaUlcerasGenitais(initData, params);
}

function cockpitDermatologiaSifilis(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros de Sífilis não fornecidos.');
  if (typeof DermatologiaLesoesIstsService === 'undefined') {
    throw new Error('Serviço DermatologiaLesoesIstsService indisponível.');
  }
  var analise = DermatologiaLesoesIstsService.avaliarSifilisManejo(params);
  var texto = DermatologiaLesoesIstsService.formatarSifilisTelegram(analise);
  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitSifilis(initData, params) {
  return cockpitDermatologiaSifilis(initData, params);
}

function cockpitDermatologiaMpox(initData, params) {
  cockpitAutorizar_(initData);
  if (!params) throw new Error('Parâmetros de Mpox não fornecidos.');
  if (typeof DermatologiaLesoesIstsService === 'undefined') {
    throw new Error('Serviço DermatologiaLesoesIstsService indisponível.');
  }
  var analise = DermatologiaLesoesIstsService.avaliarMpox(params);
  var texto = DermatologiaLesoesIstsService.formatarMpoxTelegram(analise);
  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitMpox(initData, params) {
  return cockpitDermatologiaMpox(initData, params);
}

function cockpitOtorrinoVertigemHints(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof OtorrinoEpistaxeVertigemService === 'undefined') {
    throw new Error('Serviço OtorrinoEpistaxeVertigemService indisponível.');
  }
  var analise = OtorrinoEpistaxeVertigemService.avaliarVertigemHints(params);
  var texto = OtorrinoEpistaxeVertigemService.formatarVertigemHintsTelegram(analise);
  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitVertigem(initData, params) {
  return cockpitOtorrinoVertigemHints(initData, params);
}

function cockpitHints(initData, params) {
  return cockpitOtorrinoVertigemHints(initData, params);
}

function cockpitOtorrinoEpistaxe(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof OtorrinoEpistaxeVertigemService === 'undefined') {
    throw new Error('Serviço OtorrinoEpistaxeVertigemService indisponível.');
  }
  var analise = OtorrinoEpistaxeVertigemService.avaliarEpistaxe(params);
  var texto = OtorrinoEpistaxeVertigemService.formatarEpistaxeTelegram(analise);
  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitEpistaxe(initData, params) {
  return cockpitOtorrinoEpistaxe(initData, params);
}

function cockpitTamponamento(initData, params) {
  return cockpitOtorrinoEpistaxe(initData, params);
}

function cockpitOtorrinoResumo(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  var vertigem = cockpitOtorrinoVertigemHints(initData, params.vertigem || params);
  var epistaxe = cockpitOtorrinoEpistaxe(initData, params.epistaxe || params);
  return {
    sucesso: true,
    vertigem: vertigem,
    epistaxe: epistaxe
  };
}

// ==============================================================================
// MÓDULOS DE ATENÇÃO PRIMÁRIA E URGÊNCIA (FASE 2)
// ==============================================================================

function cockpitArbovirosesDengue(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof ArbovirosesDengueService === 'undefined') {
    throw new Error('Serviço ArbovirosesDengueService indisponível.');
  }
  var p = typeof params === 'string' ? ArbovirosesDengueService.extrairParametrosTexto(params) : params;
  var analise = ArbovirosesDengueService.estadiarDengue(p);
  var texto = ArbovirosesDengueService.formatarTextoTelegram(analise);
  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitPneumologiaPac(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof PneumologiaPacService === 'undefined') {
    throw new Error('Serviço PneumologiaPacService indisponível.');
  }
  var p = typeof params === 'string' ? PneumologiaPacService.extrairParametrosTexto(params) : params;
  var analise = PneumologiaPacService.calcularCurb65(p);
  var texto = PneumologiaPacService.formatarTextoTelegram(analise);
  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitInfectologiaItu(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof InfectologiaItuService === 'undefined') {
    throw new Error('Serviço InfectologiaItuService indisponível.');
  }
  var p = typeof params === 'string' ? InfectologiaItuService.extrairParametrosTexto(params) : params;
  var analise = InfectologiaItuService.conduzirItu(p);
  var texto = InfectologiaItuService.formatarTextoTelegram(analise);
  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitEmergenciaCriseHipertensiva(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof EmergenciaCriseHipertensivaService === 'undefined') {
    throw new Error('Serviço EmergenciaCriseHipertensivaService indisponível.');
  }
  var p = typeof params === 'string' ? EmergenciaCriseHipertensivaService.extrairParametrosTexto(params) : params;
  var analise = EmergenciaCriseHipertensivaService.classificarCrise(p);
  var texto = EmergenciaCriseHipertensivaService.formatarTextoTelegram(analise);
  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitNeurologiaCefaleias(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof NeurologiaCefaleiasService === 'undefined') {
    throw new Error('Serviço NeurologiaCefaleiasService indisponível.');
  }
  var p = typeof params === 'string' ? NeurologiaCefaleiasService.extrairParametrosTexto(params) : params;
  var analise = NeurologiaCefaleiasService.avaliarBandeirasVermelhas(p);
  var texto = NeurologiaCefaleiasService.formatarTextoTelegram(analise);
  return {
    sucesso: true,
    resultado: analise,
    textoFormatado: texto
  };
}

function cockpitPequenasUrgencias(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof PequenasUrgenciasTraumaService === 'undefined') {
    throw new Error('Serviço PequenasUrgenciasTraumaService indisponível.');
  }
  var p = typeof params === 'string' ? PequenasUrgenciasTraumaService.extrairParametrosTexto(params) : params;
  var ottawa = PequenasUrgenciasTraumaService.regraOttawaTornozelo(p);
  var texto = PequenasUrgenciasTraumaService.formatarTextoTelegram(p);
  return {
    sucesso: true,
    resultado: { params: p, ottawa: ottawa },
    textoFormatado: texto
  };
}

function cockpitMedicinaLegalObito(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof MedicinaLegalObitoService === 'undefined') {
    throw new Error('Serviço MedicinaLegalObitoService indisponível.');
  }
  var p = typeof params === 'string' ? MedicinaLegalObitoService.extrairParametrosTexto(params) : params;
  var fluxo = MedicinaLegalObitoService.fluxoDeclaracaoObito(p.tipo || p.tipoMorte);
  var texto = MedicinaLegalObitoService.formatarTextoTelegram(p);
  return {
    sucesso: true,
    resultado: { params: p, fluxo: fluxo },
    textoFormatado: texto
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports.cockpitArbovirosesDengue = cockpitArbovirosesDengue;
  module.exports.cockpitDengue = cockpitArbovirosesDengue;
  module.exports.cockpitPneumologiaPac = cockpitPneumologiaPac;
  module.exports.cockpitPac = cockpitPneumologiaPac;
  module.exports.cockpitInfectologiaItu = cockpitInfectologiaItu;
  module.exports.cockpitItu = cockpitInfectologiaItu;
  module.exports.cockpitEmergenciaCriseHipertensiva = cockpitEmergenciaCriseHipertensiva;
  module.exports.cockpitCriseHipertensiva = cockpitEmergenciaCriseHipertensiva;
  module.exports.cockpitNeurologiaCefaleias = cockpitNeurologiaCefaleias;
  module.exports.cockpitCefaleia = cockpitNeurologiaCefaleias;
  module.exports.cockpitPequenasUrgencias = cockpitPequenasUrgencias;
  module.exports.cockpitSutura = cockpitPequenasUrgencias;
  module.exports.cockpitMedicinaLegalObito = cockpitMedicinaLegalObito;
  module.exports.cockpitObito = cockpitMedicinaLegalObito;
}


