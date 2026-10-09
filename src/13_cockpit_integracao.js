function cockpitAutorizar_(initData) {
  function negar() { throw new Error('Abra o Cockpit pelo botão do menu /menu no Telegram. A sessão está ausente, inválida ou expirada.'); }
  if (typeof initData !== 'string' || !initData || initData.length > 16000) negar();

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
  return {revision:estado ? estado.revision : null,
    soap:estado && resultado && resultado.revision === estado.revision ? resultado.texto : '',
    casoAtivo:!!(estado && estado.data),
    leitos:Object.keys(leitos).sort().map(function(k){return leitos[k];})};
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
  if(!origem) return;
  try {
    var atual=modoBot(chat);
    if(atual && atual.revision===origem.revision) PersistenciaBot.salvar('soapview_'+chat,{revision:origem.revision,texto:texto});
  } catch(e) {Logger.log('Cockpit: não foi possível preservar a cópia do SOAP. A entrega clínica continua.');}
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
      return CalculadorasClinicas.drogasVasoativas(entrada.droga, entrada.peso, entrada.solucao || 'padrao');
    case 'sri':
      if (['padrao','choque','asma'].indexOf(entrada.cenario) < 0) throw new Error('Selecione um cenário válido.');
      return CalculadorasClinicas.sequenciaRapidaIntubacao(entrada.peso, entrada.cenario);
    case 'crcl':
      var feminino = entrada.sexo === 'f' ? true : entrada.sexo === 'm' ? false : null;
      return CalculadorasClinicas.cockcroftGault(entrada.creatinina, entrada.peso, entrada.idade, feminino);
    case 'gaso':
      return CalculadorasClinicas.gasometria(entrada.ph, entrada.pco2, entrada.hco3);
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

function cockpitRemume(initData) {
  cockpitAutorizar_(initData);
  var id = ConfigService.get('SPREADSHEET_ID_REMUME') || 'remume_local';
  var base = obterPlanilha('remume', id, false);
  return {fonte:'REMUME configurada no bot', itens:String(base || '').split(/\r?\n/).filter(function(l){return l.trim().length > 0;})};
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
      if (!dadosAtuais.trim()) throw new Error('Nenhum caso ativo para solicitar provocação do preceptor.');
      var critica = gerarCriticaSocraticaPreceptor(dadosAtuais);
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
        var bytes = Utilities.base64Decode(audioBase64);
        if (typeof processarAudioClinicoMultimodal === 'function') {
          var resAudio = processarAudioClinicoMultimodal(bytes, mime);
          if (resAudio && resAudio.transcricao) {
            transcricaoAudio = resAudio.transcricao;
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
  var semanaRaw = props.getProperty('MOUNJARO_SEMANA');
  var doseRaw = props.getProperty('MOUNJARO_DOSE');

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
    protocolo: 'Mounjaro',
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
    if (sem > 0) props.setProperty('MOUNJARO_SEMANA', String(sem));
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
 * cockpitAuditarInfusaoUti - Auditoria de toxicidade e limites de taxa de infusão beira-leito.
 */
function cockpitAuditarInfusaoUti(initData, params) {
  cockpitAutorizar_(initData);
  params = params || {};
  if (typeof AuditoriaInfusaoUtiService === 'undefined') {
    throw new Error('Módulo AuditoriaInfusaoUtiService indisponível.');
  }
  if (params.vazaoMlH !== undefined) {
    return AuditoriaInfusaoUtiService.auditarVazaoBomba(params);
  }
  if (params.doseAlvo !== undefined) {
    return AuditoriaInfusaoUtiService.calcularVazaoSegura(params);
  }
  if (params.infusoes && Array.isArray(params.infusoes)) {
    return AuditoriaInfusaoUtiService.auditarPrescricaoMultipla(params);
  }
  if (params.tabelaTitulacao) {
    return AuditoriaInfusaoUtiService.gerarTabelaTitulacao(params.droga, params.pesoKg, params.solucao);
  }
  throw new Error('Informe vazaoMlH, doseAlvo, infusoes ou tabelaTitulacao para auditoria de UTI.');
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
  params = params || {};
  if (typeof AuditoriaYSiteService === 'undefined') {
    throw new Error('Módulo AuditoriaYSiteService indisponível.');
  }

  var lista = params.listaFarmacos || [];
  var resultado = AuditoriaYSiteService.verificarCompatibilidadeLista(lista);
  
  return { sucesso: true, resultado: resultado };
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
  params = params || {};
  if (typeof MecanicaPulmonarSdraService === 'undefined') {
    throw new Error('Módulo MecanicaPulmonarSdraService indisponível.');
  }
  if (params.acao === 'processarMecanica') {
    return MecanicaPulmonarSdraService.processarMecanica(params);
  }
  throw new Error('Ação inválida para SDRA / Mecânica Pulmonar.');
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





