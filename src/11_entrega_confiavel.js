/** Entrada persistente e caixa de saída. Não repete automaticamente efeitos incertos. */
var EXECUCAO_ATUAL = null;
// A cota diária do PropertiesService conta CHAMADAS: getProperties() custa 1 operação,
// independentemente do volume. Varreduras usam um snapshot único por passagem.
var PersistenciaBot = (function() {
  var _snapCache = null;
  function props() { return PropertiesService.getScriptProperties(); }
  function snapshot(forcar) {
    if (_snapCache && !forcar) return _snapCache;
    _snapCache = props().getProperties() || {};
    return _snapCache;
  }
  function invalidarSnapshot() { _snapCache = null; }
  // Reconstrói o texto de um registro a partir do snapshot; null se ausente ou incompleto.
  function textoDe(all, k) {
    var manifest = all[k];
    if (!manifest) return null;
    var m = JSON.parse(manifest), texto = '';
    for (var i = 0; i < m.n; i++) {
      var parte = all[k + ':' + m.v + ':' + i];
      if (parte === undefined || parte === null) return null;
      texto += parte;
    }
    return texto;
  }
  function ler(k, all) {
    if (all) {
      if (!all[k]) return null;
      var t = textoDe(all, k);
      if (t !== null) return JSON.parse(t);
      // Snapshot capturou uma escrita concorrente pela metade: relê diretamente.
    }
    var p = props();
    for (var tent = 0; tent < 2; tent++) {
      var manifest = p.getProperty(k);
      if (!manifest) return null;
      var m = JSON.parse(manifest), texto = '', falhou = false;
      for (var i = 0; i < m.n; i++) {
        var parte = p.getProperty(k + ':' + m.v + ':' + i);
        if (parte === null) {
          falhou = true;
          break;
        }
        texto += parte;
      }
      if (!falhou) {
        return JSON.parse(texto);
      }
    }
    throw new Error('Dados persistidos incompletos.');
  }
  function apagarPartes(k, m) {
    if (!m) return;
    var p = props();
    for (var i=0;i<m.n;i++) {
      var chaveParte = k+':'+m.v+':'+i;
      p.deleteProperty(chaveParte);
      if (_snapCache) delete _snapCache[chaveParte];
    }
  }
  function bytesUtf8(str) {
    if (!str) return 0;
    if (typeof Buffer !== 'undefined' && typeof Buffer.byteLength === 'function') {
      return Buffer.byteLength(str, 'utf8');
    }
    if (typeof Utilities !== 'undefined' && typeof Utilities.newBlob === 'function') {
      try { return Utilities.newBlob(str).getBytes().length; } catch (e) {}
    }
    var b = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) b += 1;
      else if (c < 0x800) b += 2;
      else if (c >= 0xD800 && c <= 0xDBFF) { b += 4; i++; }
      else b += 3;
    }
    return b;
  }
  function totalBytes(all) {
    all = all || snapshot();
    return Object.keys(all).reduce(function(n,k) {return n + bytesUtf8(k) + bytesUtf8(all[k]);}, 0);
  }
  function chaves(prefixo, all) {
    return Object.keys(all || snapshot()).filter(function(k){return k.indexOf(prefixo)===0 && k.indexOf(':')===-1;}).sort();
  }
  function listar(prefixo, all) {
    all = all || snapshot();
    return chaves(prefixo, all).map(function(k) {
      var t = textoDe(all, k);
      return {key:k, valor: t !== null ? JSON.parse(t) : ler(k)};
    }).filter(function(r) {return !!r.valor;}); // removido entre a listagem e a releitura
  }
  function podarPersistenciaAntiga(all) {
    all = all || snapshot(true);
    ['outbox_', 'inbox_'].forEach(function(pfx) {
      var itens = listar(pfx, all).sort(function(a, b) {
        var tA = a.valor ? (a.valor.created || 0) : 0;
        var tB = b.valor ? (b.valor.created || 0) : 0;
        return tA - tB;
      });
      // Prioriza remover itens já finalizados ('done')
      var dones = itens.filter(function(r) { return !r.valor || r.valor.status === 'done'; });
      dones.slice(0, 100).forEach(function(r) { remover(r.key); });
      // Remove itens velhos com mais de 1 hora
      var velhos = itens.filter(function(r) { return r.valor && Date.now() - (r.valor.created || 0) > 3600000; });
      velhos.slice(0, 50).forEach(function(r) { remover(r.key); });
    });
  }
  // Partes em uma única chamada quando o serviço oferece escrita em lote (GAS: setProperties).
  function gravarPartes(p, k, m, s) {
    var partes = {};
    for (var i=0;i<m.n;i++) partes[k+':'+m.v+':'+i] = s.slice(i*1500,(i+1)*1500);
    if (typeof p.setProperties === 'function') p.setProperties(partes);
    else Object.keys(partes).forEach(function(c) {p.setProperty(c, partes[c]);});
    return partes;
  }
  function salvar(k, valor) {
    var p=props(), s=JSON.stringify(valor);
    var sBytes = bytesUtf8(s);
    if (sBytes > 25000) throw new Error('Conteúdo muito grande para armazenamento. Divida o pedido.');
    var all = snapshot(), bAtual = totalBytes(all);
    if (bAtual + sBytes > 300000) {
      podarPersistenciaAntiga(all);
      all = snapshot(true);
      bAtual = totalBytes(all);
    }
    var anterior = all[k] || null;
    var textoAnterior = anterior ? textoDe(all, k) : null;
    var bytesAnteriores = textoAnterior ? bytesUtf8(textoAnterior) : 0;
    if (bAtual + sBytes > 400000 && !(sBytes < bytesAnteriores && bAtual + sBytes < 450000)) {
      podarPersistenciaAntiga(all);
      all = snapshot(true);
      bAtual = totalBytes(all);
      if (bAtual + sBytes > 420000) {
        // Purgar todos os outbox_ e inbox_ concluidos
        ['outbox_', 'inbox_'].forEach(function(pfx) {
          listar(pfx, all).filter(function(r) { return !r.valor || r.valor.status === 'done'; }).forEach(function(r) { remover(r.key); });
        });
        all = snapshot(true);
        bAtual = totalBytes(all);
      }
      if (bAtual + sBytes > 480000) {
        throw new Error('Orçamento global de armazenamento excedido (cota 500 KB do GAS). Contrapressão ativada.');
      }
    }
    var m={v:Utilities.getUuid().replace(/-/g,''),n:Math.ceil(s.length/1500)};
    try {
      var partesGravadas = gravarPartes(p,k,m,s);
      p.setProperty(k,JSON.stringify(m)); // manifesto por último: leitores nunca veem partes incompletas
      if (_snapCache) {
        Object.assign(_snapCache, partesGravadas);
        _snapCache[k] = JSON.stringify(m);
      }
    } catch(e) { apagarPartes(k,m); throw e; }
    if(anterior) apagarPartes(k,JSON.parse(anterior));
  }
  function remover(k) {
    var m=props().getProperty(k);
    props().deleteProperty(k);
    if(m) apagarPartes(k,JSON.parse(m));
    if (_snapCache) delete _snapCache[k];
  }
  return {ler:ler,salvar:salvar,remover:remover,chaves:chaves,listar:listar,totalBytes:totalBytes,snapshot:snapshot,invalidarSnapshot:invalidarSnapshot};
})();

function enfileirarUpdate(update) {
  var lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var key='inbox_'+update.update_id, all=PersistenciaBot.snapshot();
    if(PersistenciaBot.ler(key,all)) return false;
    var ativos = PersistenciaBot.listar('inbox_',all).filter(function(r) {
      return ['pending','running','awaiting_delivery'].indexOf(r.valor.status) !== -1;
    }).length;
    if(ativos >= 50) throw new Error('Fila cheia. Tente novamente mais tarde.');
    PersistenciaBot.salvar(key,{update:update,status:'pending',created:Date.now()});
    return true;
  } finally {lock.releaseLock();}
}

var _cacheCallbackIds = {};
function verificarERegistrarCallbackId(callbackId, data) {
  if (!callbackId) return true;
  var idStr = String(callbackId).trim();
  if (!idStr) return true;

  // Em ambiente de teste automatizado, mocks sintéticos de interface (cb_ux_...) não bloqueiam reexecução
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') {
    if (idStr.indexOf('cb_ux_') === 0) return true;
  }

  var agora = Date.now();
  var chaveCompleta = idStr + (data ? '_' + String(data).trim() : '');

  // 1. Verificação rápida em memória volátil com janela de deduplicação (15s)
  if (_cacheCallbackIds[chaveCompleta]) {
    if (agora - _cacheCallbackIds[chaveCompleta] < 15000) {
      return false; // Callback duplicado detectado
    }
  }

  // Limpeza de entradas expiradas se o cache crescer
  var chaves = Object.keys(_cacheCallbackIds);
  if (chaves.length > 500) {
    chaves.forEach(function(k) {
      if (agora - _cacheCallbackIds[k] > 15000) delete _cacheCallbackIds[k];
    });
  }
  _cacheCallbackIds[chaveCompleta] = agora;

  // 2. Verificação em CacheService (distribuído entre workers/sessões)
  try {
    if (typeof CacheService !== 'undefined' && CacheService.getScriptCache) {
      var cache = CacheService.getScriptCache();
      var chaveCache = 'cb_seen_' + chaveCompleta.substring(0, 80);
      var visto = cache.get(chaveCache);
      if (visto) return false;
      cache.put(chaveCache, '1', 60);
    }
  } catch (_) {}

  return true;
}

function enfileirarTarefaPc(chatId, tarefa, args) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sufixo = (typeof Utilities !== 'undefined' && Utilities.getUuid) ? Utilities.getUuid().replace(/-/g,'').substring(0,6) : Math.random().toString(36).substring(2,7);
    var taskId = 'pctask_' + Date.now() + '_' + sufixo;
    var payload = {
      id: taskId,
      chat_id: String(chatId),
      tarefa: String(tarefa || '').toLowerCase(),
      args: args || [],
      status: 'pending',
      created: Date.now()
    };
    PersistenciaBot.salvar(taskId, payload);
    return taskId;
  } finally {
    lock.releaseLock();
  }
}

function obterTarefasPcPendentes() {
  var all = PersistenciaBot.snapshot(true);
  return PersistenciaBot.listar('pctask_', all).filter(function(r) {
    return r.valor && r.valor.status === 'pending';
  }).map(function(r) { return r.valor; });
}

function concluirTarefaPc(taskId, status, resultado) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var reg = PersistenciaBot.ler(taskId);
    if (!reg) return false;
    reg.status = status || 'done';
    reg.resultado = resultado || '';
    reg.completed = Date.now();
    PersistenciaBot.salvar(taskId, reg);
    return true;
  } finally {
    lock.releaseLock();
  }
}

function rotearUpdate(update) {
  if(update.inline_query && typeof processarInlineQuery === 'function') return processarInlineQuery(update.inline_query);
  if(update.callback_query) return processarCallbackBotao(update.callback_query);
  var m=update.message;
  if(!m) return;
  if(m.web_app_data && typeof processarWebAppData === 'function') return processarWebAppData(m);
  if(m.voice||m.audio) return processarMensagemVoz(m);
  if(m.photo) return processarMensagemFoto(m);
  if(m.text) return processarMensagemTexto(m);
}

// Lista fechada: somente telas estáticas, sem estado clínico ou integrações lentas.
function destinoNavegacaoRapida(update) {
  var cb = update.callback_query, m = update.message, destinos, chave;
  if (cb) {
    destinos = {'ux:menu':'hub', 'ux:hub:inicio':'hub', 'ux:hub:sala':'sala',
    'ux:sala':'sala', 'ux:hub:calc':'calc', 'ux:dvamenu':'dva',
    'ux:srimenu':'sri'};
    chave = String(cb.data || '');
  } else {
    if (!m || m.voice || m.audio || m.photo) return null;
    destinos = {'/menu':'hub', '/start':'hub', '/sala':'sala',
      '🚨 Sala Vermelha':'sala', '📐 Calculadoras':'calc'};
    chave = String(m.text || '').trim();
  }
  return Object.prototype.hasOwnProperty.call(destinos, chave) ? destinos[chave] : null;
}

function executarNavegacaoRapida(update, destino) {
  var cb = update.callback_query, m = cb ? cb.message : update.message;
  if (cb) responderCallbackTelegram(cb.id, '');
  var telas = {hub:enviarHubPrincipal, sala:enviarMenuSalaVermelha,
    calc:enviarMenuUXCalculadoras, dva:enviarMenuDva, sri:enviarMenuSri};
  return telas[destino](m.chat.id, cb ? m.message_id : undefined);
}

function medirEtapaBot(nome, executar) {
  var inicio = Date.now(), falhou = false;
  try { return executar(); } catch (e) { falhou = true; throw e; }
  finally {
    if (EXECUCAO_ATUAL && EXECUCAO_ATUAL.metricas &&
        ['geracao_clinica','download_midia','processamento_audio'].indexOf(nome) !== -1) {
      var etapas = EXECUCAO_ATUAL.metricas.etapas;
      var etapa = etapas[nome] || {ms:0, chamadas:0, falhas:0};
      etapa.ms += Math.max(0, Date.now() - inicio); etapa.chamadas++;
      if (falhou) etapa.falhas++;
      etapas[nome] = etapa;
    }
  }
}

// Worker e webhook disputam apenas a reserva, nunca a chamada externa sob este lock.
function reservarPedidoTelegram(key) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var job = PersistenciaBot.ler(key);
    if (!job || job.status !== 'pending') return null;
    job.status = 'running'; job.startedAt = Date.now();
    PersistenciaBot.salvar(key, job);
    return job;
  } finally { lock.releaseLock(); }
}

function executarPedidoTelegram(key, job) {
  var destino = destinoNavegacaoRapida(job.update);
  var anterior = EXECUCAO_ATUAL;
  EXECUCAO_ATUAL = {id:job.update.update_id, seq:0, entregas:[],
    canal:destino ? 'navegacao' : 'principal',
    metricas:{esperaMs:Math.max(0, job.startedAt-job.created), etapas:{}}};
  try {
    var resultado = destino ? executarNavegacaoRapida(job.update, destino) : rotearUpdate(job.update);
    job.entregas = EXECUCAO_ATUAL.entregas.slice();
    var estado = estadoEntregaPedido(job, mapaCaixaSaida());
    if (estado === 'done' && (resultado === false || (resultado && resultado.sucesso === false))) estado = 'failed';
    concluirPedido(job, estado);
  } catch (e) {
    job.entregas = EXECUCAO_ATUAL.entregas.slice(); job.status = 'failed';
    Logger.log('Falha no pedido ' + job.update.update_id);
  } finally {
    job.processedAt = Date.now();
    job.metricas = EXECUCAO_ATUAL.metricas;
    job.metricas.processamentoMs = Math.max(0, job.processedAt-job.startedAt);
    job.metricas.canal = EXECUCAO_ATUAL.canal;
    if (EXECUCAO_ATUAL.fontesClinicas) job.fontesClinicas = EXECUCAO_ATUAL.fontesClinicas;
    EXECUCAO_ATUAL = anterior;
  }
  PersistenciaBot.salvar(key, job);
}

function processarNavegacaoRapida(update) {
  if (!destinoNavegacaoRapida(update)) return false;
  var key = 'inbox_' + update.update_id, job = reservarPedidoTelegram(key);
  if (job) executarPedidoTelegram(key, job);
  return true;
}

function estadoEntregaPedido(job, saidas) {
  var itens = (job.entregas || []).map(function(k) {return saidas[k];});
  if (itens.some(function(x) {return !x || x.status === 'uncertain';})) return 'uncertain';
  if (itens.some(function(x) {return x.status === 'failed';})) return 'failed';
  if (itens.some(function(x) {return x.status !== 'done';})) return 'awaiting_delivery';
  return 'done';
}
function mapaCaixaSaida(all) {
  var mapa = {}; PersistenciaBot.listar('outbox_',all).forEach(function(r) {mapa[r.key]=r.valor;}); return mapa;
}
function concluirPedido(job, status) {
  job.status = status;
  if (status === 'done') job.update = {update_id:job.update.update_id};
  return job;
}
function processarFilaTelegram() {
  var worker=LockService.getUserLock();
  if(!worker.tryLock(1)) return;
  var inicio=Date.now();
  try {
    // Snapshot único alimenta manutenção e varreduras: sem trabalho, custa 1 operação de cota.
    var all=PersistenciaBot.snapshot(true);
    if(manterPersistenciaBot(all)) all=PersistenciaBot.snapshot();
    var registros=PersistenciaBot.listar('inbox_',all).sort(function(a,b){return Number(a.key.slice(6))-Number(b.key.slice(6));});
    var houveMudanca=false;
    for(var i=0;i<registros.length && Date.now()-inicio<180000;i++) {
      var key=registros[i].key, job=registros[i].valor;
      if (!job) continue;
      if(job.status==='running' && Date.now()-(job.startedAt||job.created||0)>=120000) {
        job.status='uncertain'; PersistenciaBot.salvar(key,job); houveMudanca=true;
      }
      if(job.status!=='pending') continue;
      houveMudanca=true;
      var reservadoPedido = reservarPedidoTelegram(key);
      if (reservadoPedido) executarPedidoTelegram(key, reservadoPedido);
    }
    if(houveMudanca) all=PersistenciaBot.snapshot();
    if(processarCaixaSaida(all)) all=PersistenciaBot.snapshot();
    var saidas=mapaCaixaSaida(all);
    PersistenciaBot.listar('inbox_',all).forEach(function(r) {
      if(r.valor.status !== 'awaiting_delivery') return;
      var estado=estadoEntregaPedido(r.valor,saidas);
      if(estado !== 'awaiting_delivery') PersistenciaBot.salvar(r.key,concluirPedido(r.valor,estado));
    });
  } finally {worker.releaseLock();}
}

function entregarTelegramPersistente(metodo,payload) {
  // Chunking atômico e seguro para mensagens longas (> 4000 chars)
  // Preserva reply_markup exclusivamente no último chunk da sequência
  if (metodo === 'sendMessage' && payload && typeof payload.text === 'string' && payload.text.length > 4000) {
    var partesTexto = (typeof fragmentarTexto === 'function')
      ? fragmentarTexto(payload.text, 3800)
      : [payload.text.slice(0, 3800), payload.text.slice(3800)];
    if (partesTexto.length > 1) {
      var ultimoIdx = partesTexto.length - 1;
      var sucessoTodos = true;
      for (var idxParte = 0; idxParte < partesTexto.length; idxParte++) {
        var chunkPayload = Object.assign({}, payload, { text: partesTexto[idxParte] });
        if (idxParte !== ultimoIdx) {
          delete chunkPayload.reply_markup;
        }
        var okParte = entregarTelegramPersistente('sendMessage', chunkPayload);
        if (!okParte) sucessoTodos = false;
      }
      return sucessoTodos;
    }
  }

  var key='outbox_'+(EXECUCAO_ATUAL ? EXECUCAO_ATUAL.id+'_'+(++EXECUCAO_ATUAL.seq) : Utilities.getUuid().replace(/-/g,''));
  if (EXECUCAO_ATUAL && EXECUCAO_ATUAL.entregas) EXECUCAO_ATUAL.entregas.push(key);
  var all=PersistenciaBot.snapshot();
  var item=PersistenciaBot.ler(key,all);
  if(item && item.status==='done') return true;
  var novo=!item;
  if(novo) item={method:metodo,payload:payload,status:'pending',created:Date.now(),next:0,attempts:0,
    canal:EXECUCAO_ATUAL ? EXECUCAO_ATUAL.canal || 'principal' : 'principal'};
  // Ordem FIFO: havendo entrega mais antiga pendente, esta aguarda o worker.
  var anterior=PersistenciaBot.listar('outbox_',all).some(function(r){
    return r.key!==key && r.valor.status==='pending' && r.valor.created<=item.created &&
      ((r.valor.canal || 'principal') === (item.canal || 'principal') || r.valor.next>Date.now());
  });
  if(novo && !anterior) {
    // Chave recém-criada ainda invisível a outros executores: nasce reservada ('sending')
    // e é persistida antes do efeito externo, sem a gravação intermediária 'pending'.
    item.status='sending'; item.startedAt=Date.now(); item.attempts=1;
    PersistenciaBot.salvar(key,item);
    return enviarItemTelegram(key,item);
  }
  if(novo) PersistenciaBot.salvar(key,item);
  if(anterior)return true;
  return tentarEntregaTelegram(key,item);
}

// Transição pending → sending sob lock; devolve o item reservado ou null.
function reservarEntregaTelegram(key) {
  var lock=LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var atual = PersistenciaBot.ler(key);
    if (!atual || atual.status !== 'pending' || atual.next > Date.now()) return null;
    atual.status = 'sending';
    atual.startedAt = Date.now();
    atual.attempts++;
    PersistenciaBot.salvar(key, atual);
    return atual;
  } finally {
    lock.releaseLock();
  }
}

function tentarEntregaTelegram(key,item) {
  var reservado=reservarEntregaTelegram(key);
  if(!reservado) return true;
  return enviarItemTelegram(key,reservado);
}

// Efeito externo de um item já reservado. Repetição imediata apenas quando a resposta
// garante que nada foi entregue (400 de formatação; 429 com espera curta).
function enviarItemTelegram(key,item) {
  var inicioEntrega = Date.now();
  try {
    var url='https://api.telegram.org/bot'+ConfigService.exigir('TELEGRAM_BOT_TOKEN')+'/'+item.method;
    for (var tentativa=0; tentativa<3; tentativa++) {
      var options={method:'post',contentType:'application/json',payload:JSON.stringify(item.payload),muteHttpExceptions:true};
      var res=UrlFetchApp.fetch(url,options);
      var code=res.getResponseCode(),body={};
      try{body=JSON.parse(res.getContentText());}catch(ignore){}
      var descricao=body.description||'';
      if(code===200&&body.ok!==false){item.status='done';delete item.payload;}
      else if(code===400 && item.payload && (item.payload.parse_mode || /can't parse|entities|parse error|entity|tag|unmatched|not found/i.test(descricao))) {
        // Fallback de Erro 400 de Entidades / Markdown: limpa formatação e reenvia em texto puro sem marcar como failed
        if (item.payload.text && typeof item.payload.text === 'string') {
          item.payload.text = item.payload.text.replace(/<[^>]+>/g, '').replace(/[*_`#]/g, '');
        }
        delete item.payload.parse_mode;
        item.status='pending';
        item.next=Date.now()+1000;
        continue;
      }
      else if(code===429){
        var espera=Math.max(1,Number(body.parameters&&body.parameters.retry_after)||60);
        item.status='pending';item.next=Date.now()+espera*1000;
        if(espera<=2 && tentativa===0 && typeof Utilities!=='undefined' && typeof Utilities.sleep==='function') {
          Utilities.sleep(espera*1000);
          continue;
        }
      }
      else if(code===400 && /message is not modified/i.test(descricao)) {item.status='done';delete item.payload;}
      else {item.status=code>=500?'uncertain':'failed';}
      break;
    }
  } catch(e) {item.status='uncertain';}
  item.envioMs = (item.envioMs || 0) + Math.max(0, Date.now()-inicioEntrega);
  if (item.status === 'done') item.completedAt = Date.now();
  PersistenciaBot.salvar(key,item);
  return item.status==='done'||item.status==='pending';
}

// Devolve true se alterou algum registro (o chamador renova o snapshot).
function processarCaixaSaida(all) {
  var interromper=false, mudou=false;
  PersistenciaBot.listar('outbox_',all).sort(function(a,b){return a.valor.created-b.valor.created;}).forEach(function(r){
    var key=r.key,item=r.valor;if(!item)return;
    if(item.status==='sending' && Date.now()-(item.startedAt||item.created||0)>120000){
      item.status='uncertain';PersistenciaBot.salvar(key,item);mudou=true;
    }
    if(item.status==='pending'&&!interromper){
      // Adiado (429): mantém a ordem sem lock nem releitura.
      if(item.next>Date.now()) interromper=true;
      else {
        mudou=true;
        var reservado=reservarEntregaTelegram(key);
        if(reservado) enviarItemTelegram(key,reservado);
        var status=reservado ? reservado.status : (PersistenciaBot.ler(key)||{}).status;
        if(status==='pending') interromper=true;
      }
    }
    // Concluídos são pequenos e retidos pelo mesmo prazo da inbox para reconciliação.
    if(item.status==='done'&&Date.now()-item.created>86400000){PersistenciaBot.remover(key);mudou=true;}
  });
  return mudou;
}

// Arquivos permanecem privados no Drive. Nunca reenvia nem reexecuta uma pendência.
function pastaPendenciasBot(criar) {
  var p=PropertiesService.getScriptProperties(),id=p.getProperty('BOT_PENDENCIAS_FOLDER_ID');
  if(id) return DriveApp.getFolderById(id);
  if(!criar) return null;
  var pasta=DriveApp.createFolder('Ultra Rotina - Pendências preservadas');
  p.setProperty('BOT_PENDENCIAS_FOLDER_ID',pasta.getId());
  return pasta;
}
function arquivarPendenciaBot(key, item) {
  if (item.archiveId) return item;
  var pasta=pastaPendenciasBot(true);
  var file=pasta.createFile(key+'.json',JSON.stringify({key:key,registro:item}), 'application/json');
  var arquivoId=file.getId();
  if(!arquivoId) throw new Error('Arquivo de recuperação sem identificador.');
  // Confirma o conteúdo antes de remover qualquer payload da fila.
  var verificado=JSON.parse(file.getBlob().getDataAsString());
  if(verificado.key!==key || JSON.stringify(verificado.registro)!==JSON.stringify(item)) throw new Error('Falha na verificação do arquivo de recuperação.');
  var compacto={status:item.status,created:item.created,archiveId:arquivoId};
  if(item.update) compacto.update={update_id:item.update.update_id};
  PersistenciaBot.salvar(key,compacto);
  return compacto;
}
// Aceita snapshot opcional; devolve true se removeu ou arquivou algo.
function manterPersistenciaBot(all) {
  all=all||PersistenciaBot.snapshot();
  var sobPressao=PersistenciaBot.totalBytes(all)>300000, tentativas=0, inicio=Date.now(), mudou=false;
  ['inbox_','outbox_'].forEach(function(prefixo) {
    PersistenciaBot.listar(prefixo,all).forEach(function(r) {
      var item=r.valor,idade=Date.now()-item.created;
      if(item.status==='done' && idade>86400000) {PersistenciaBot.remover(r.key);mudou=true;return;}
      if(['failed','uncertain'].indexOf(item.status)===-1) return;
      if(!item.archiveId && (sobPressao || idade>86400000) && tentativas<20 && Date.now()-inicio<15000) {
        tentativas++;
        try {item=arquivarPendenciaBot(r.key,item);mudou=true;}
        catch(e) {Logger.log('Não foi possível arquivar '+r.key+'; dados preservados na fila.');return;}
      }
      // Após a janela de deduplicação, recuperação permanece disponível no Drive.
      if(item.archiveId && idade>86400000) {PersistenciaBot.remover(r.key);mudou=true;}
    });
  });
  return mudou;
}
function recuperarRegistroBot(key) {
  if(!/^(?:inbox_\d+|outbox_[\w-]+)$/.test(key)) return null;
  var item=PersistenciaBot.ler(key);
  if(item && !item.archiveId) return item;
  var arquivo;
  if(item && item.archiveId) arquivo=DriveApp.getFileById(item.archiveId);
  else {
    var pasta=pastaPendenciasBot(false);if(!pasta)return null;
    var arquivos=pasta.getFilesByName(key+'.json');
    if(!arquivos.hasNext())return null;
    arquivo=arquivos.next();
  }
  var dados=JSON.parse(arquivo.getBlob().getDataAsString());
  return dados.key===key ? dados.registro : null;
}
function mostrarFilaTelegram(chatId) {
  var linhas=[], all=PersistenciaBot.snapshot();
  ['inbox_','outbox_'].forEach(function(prefix){PersistenciaBot.listar(prefix,all).forEach(function(r){if(r.valor.status!=='done')linhas.push(r.key+': '+r.valor.status+(r.valor.archiveId?' (arquivado)':''));});});
  var pasta=all.BOT_PENDENCIAS_FOLDER_ID;
  if(pasta)linhas.push('Arquivo de recuperação: https://drive.google.com/drive/folders/'+pasta);
  return enviarMensagemParaChat(chatId,linhas.length?'📬 *Pedidos e entregas*\n\n'+linhas.join('\n')+'\n\n/pedido <número>: consultar original, inclusive arquivado. /entrega <id outbox>: consultar resultado preservado. Entregas incertas não são repetidas automaticamente.':'📬 Nenhuma pendência registrada.');
}
