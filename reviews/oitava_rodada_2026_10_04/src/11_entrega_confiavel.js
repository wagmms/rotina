/** Entrada persistente e caixa de saída. Não repete automaticamente efeitos incertos. */
var EXECUCAO_ATUAL = null;
var PersistenciaBot = (function() {
  function props() { return PropertiesService.getScriptProperties(); }
  function ler(k) {
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
  function apagarPartes(k, m) { if (m) for (var i=0;i<m.n;i++) props().deleteProperty(k+':'+m.v+':'+i); }
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
  function totalBytes() {
    var all = props().getProperties();
    var b = 0;
    for (var k in all) {
      if (all.hasOwnProperty(k)) b += bytesUtf8(k) + bytesUtf8(all[k]);
    }
    return b;
  }
  function podarPersistenciaAntiga() {
    var keysDone = chaves('inbox_').filter(function(k){
      var j = ler(k);
      return j && j.status === 'done' && (Date.now() - (j.created || 0) > 86400000);
    });
    keysDone.slice(0, 20).forEach(function(k){ remover(k); });
  }
  function salvar(k, valor) {
    var p=props(), s=JSON.stringify(valor), anterior=p.getProperty(k);
    var sBytes = bytesUtf8(s);
    if (sBytes > 25000) throw new Error('Conteúdo muito grande para armazenamento. Divida o pedido.');
    var bAtual = totalBytes();
    if (bAtual + sBytes > 350000) {
      podarPersistenciaAntiga();
      bAtual = totalBytes();
    }
    if (bAtual + sBytes > 400000) {
      throw new Error('Orçamento global de armazenamento excedido (cota 500 KB do GAS). Contrapressão ativada.');
    }
    var m={v:Utilities.getUuid().replace(/-/g,''),n:Math.ceil(s.length/1500)};
    try {
      for (var i=0;i<m.n;i++) p.setProperty(k+':'+m.v+':'+i,s.slice(i*1500,(i+1)*1500));
      p.setProperty(k,JSON.stringify(m));
    } catch(e) { apagarPartes(k,m); throw e; }
    if(anterior) apagarPartes(k,JSON.parse(anterior));
  }
  function remover(k) { var m=props().getProperty(k); props().deleteProperty(k); if(m)apagarPartes(k,JSON.parse(m)); }
  function chaves(prefixo) { return Object.keys(props().getProperties()).filter(function(k){return k.indexOf(prefixo)===0 && k.indexOf(':')===-1;}).sort(); }
  return {ler:ler,salvar:salvar,remover:remover,chaves:chaves};
})();

function enfileirarUpdate(update) {
  var lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var key='inbox_'+update.update_id;
    if(PersistenciaBot.ler(key)) return;
    var todasChaves = PersistenciaBot.chaves('inbox_');
    var ativos = 0;
    for (var ci = 0; ci < todasChaves.length; ci++) {
      var jobI = PersistenciaBot.ler(todasChaves[ci]);
      if (jobI && (jobI.status === 'pending' || jobI.status === 'running')) {
        ativos++;
      }
    }
    if(ativos >= 50) throw new Error('Fila cheia. Tente novamente mais tarde.');
    PersistenciaBot.salvar(key,{update:update,status:'pending',created:Date.now()});
  } finally {lock.releaseLock();}
}

function rotearUpdate(update) {
  if(update.callback_query) return processarCallbackBotao(update.callback_query);
  var m=update.message;
  if(m.voice||m.audio) return processarMensagemVoz(m);
  if(m.photo) return processarMensagemFoto(m);
  if(m.text) return processarMensagemTexto(m);
}

function processarFilaTelegram() {
  // Lock diferente do ingresso: uma IA lenta nunca impede persistir a próxima mensagem.
  var worker=LockService.getUserLock();
  if(!worker.tryLock(1)) return;
  var inicio=Date.now();
  try {
    var keys=PersistenciaBot.chaves('inbox_').sort(function(a,b){return Number(a.slice(6))-Number(b.slice(6));});
    for(var i=0;i<keys.length && Date.now()-inicio<180000;i++) {
      var job=PersistenciaBot.ler(keys[i]);
      if(!job)continue;
      if(job.status==='running') {
        var tempoExec = Date.now() - (job.startedAt || job.created || 0);
        if (tempoExec < 120000) {
          // Execução ativa em andamento por outro worker recente; não interromper
          continue;
        }
        // Uma execução interrompida pode ter concluído uma escrita externa. Não a duplicar.
        job.status='uncertain'; PersistenciaBot.salvar(keys[i],job);
      }
      if(job.status!=='pending') {
        if((job.status==='done' || job.status==='uncertain' || job.status==='failed') && Date.now()-job.created>86400000) {
          PersistenciaBot.remover(keys[i]);
        }
        continue;
      }
      job.status='running'; job.startedAt=Date.now(); PersistenciaBot.salvar(keys[i],job);
      EXECUCAO_ATUAL={id:job.update.update_id,seq:0};
      try {
        var resRoteamento = rotearUpdate(job.update);
        if (resRoteamento === false || (resRoteamento && resRoteamento.sucesso === false)) {
          job.status = 'failed';
        } else {
          job.status = 'done';
          job.update = { update_id: job.update.update_id };
        }
      } catch(e) {
        job.status = 'failed';
        enviarMensagemParaChat(ConfigService.get('TELEGRAM_CHAT_ID'), '⚠️ Não concluí o pedido ' + job.update.update_id + '. Ele foi preservado. Consulte /fila antes de repetir.');
        Logger.log('Falha no pedido ' + job.update.update_id);
      } finally { EXECUCAO_ATUAL = null; }
      PersistenciaBot.salvar(keys[i], job);
    }
    processarCaixaSaida();
  } finally {worker.releaseLock();}
}

function entregarTelegramPersistente(metodo,payload) {
  var key='outbox_'+(EXECUCAO_ATUAL ? EXECUCAO_ATUAL.id+'_'+(++EXECUCAO_ATUAL.seq) : Utilities.getUuid().replace(/-/g,''));
  var item=PersistenciaBot.ler(key);
  if(!item) {item={method:metodo,payload:payload,status:'pending',created:Date.now(),next:0,attempts:0};PersistenciaBot.salvar(key,item);}
  if(item.status==='done') return true;
  var anterior=PersistenciaBot.chaves('outbox_').some(function(k){var j=PersistenciaBot.ler(k);return k!==key && j.status==='pending' && j.created<=item.created;});
  if(anterior)return true;
  return tentarEntregaTelegram(key,item);
}

function tentarEntregaTelegram(key,item) {
  var lock=LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var atual = PersistenciaBot.ler(key);
    if (!atual || atual.status !== 'pending' || atual.next > Date.now()) return true;
    atual.status = 'sending';
    atual.startedAt = Date.now();
    atual.attempts++;
    PersistenciaBot.salvar(key, atual);
    item = atual;
  } finally {
    lock.releaseLock();
  }

  try {
    var options={method:'post',contentType:'application/json',payload:JSON.stringify(item.payload),muteHttpExceptions:true};
    var res=UrlFetchApp.fetch('https://api.telegram.org/bot'+ConfigService.exigir('TELEGRAM_BOT_TOKEN')+'/'+item.method,options);
    var code=res.getResponseCode(),body={};
    try{body=JSON.parse(res.getContentText());}catch(ignore){}
    if(code===200&&body.ok!==false){item.status='done';delete item.payload;}
    else if(code===429){item.status='pending';item.next=Date.now()+Math.max(1,Number(body.parameters&&body.parameters.retry_after)||60)*1000;}
    else if(code===400 && item.payload && item.payload.parse_mode && /can't parse|entities/i.test(body.description||'')) {
      delete item.payload.parse_mode;item.status='pending';item.next=Date.now()+1000;
    } else if(code===400 && /message is not modified/i.test(body.description||'')) {item.status='done';delete item.payload;}
    else {item.status=code>=500?'uncertain':'failed';}
  } catch(e) {item.status='uncertain';}
  PersistenciaBot.salvar(key,item);
  return item.status==='done'||item.status==='pending';
}

function processarCaixaSaida() {
  var interromper=false;
  PersistenciaBot.chaves('outbox_').sort(function(a,b){return PersistenciaBot.ler(a).created-PersistenciaBot.ler(b).created;}).forEach(function(key){
    var item=PersistenciaBot.ler(key);if(!item)return;
    if(item.status==='sending'){
      var tempoVoo = Date.now() - (item.startedAt || item.created || 0);
      if (tempoVoo > 120000) {
        item.status='uncertain';
        PersistenciaBot.salvar(key,item);
      }
    }
    if(item.status==='pending'&&!interromper){tentarEntregaTelegram(key,item);if(PersistenciaBot.ler(key).status==='pending')interromper=true;}
    if(item.status==='done'&&Date.now()-item.created>1800000)PersistenciaBot.remover(key);
  });
}

function mostrarFilaTelegram(chatId) {
  var linhas=[];
  ['inbox_','outbox_'].forEach(function(prefix){PersistenciaBot.chaves(prefix).forEach(function(key){var j=PersistenciaBot.ler(key);if(j.status!=='done')linhas.push(key+': '+j.status);});});
  return enviarMensagemParaChat(chatId,linhas.length?'📬 *Pedidos e entregas*\n\n'+linhas.join('\n')+'\n\nPendentes serão retomados automaticamente. Para recuperar o texto de um pedido, use /pedido seguido do número. Em falhas ou resultado incerto, confira o chat e o destino antes de repetir.':'📬 Nenhuma pendência registrada.');
}
