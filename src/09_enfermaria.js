/** Leitos persistidos individualmente. Legado preservado; texto nunca é truncado. */
var EnfermariaService=(function(){
  var PREFIX='LEITO_V2_';
  function props(){return PropertiesService.getScriptProperties();}
  function key(id){return PREFIX+encodeURIComponent(id);}
  function carregar(){
    var p=props(),old=p.getProperty('ENFERMARIA_LEITOS_JSON'),all=old?JSON.parse(old):{};
    if(!all||Array.isArray(all)||typeof all!=='object')throw new Error('Dados de leitos inválidos.');
    var values=p.getProperties();
    Object.keys(values).filter(function(k){return k.indexOf(PREFIX)===0;}).forEach(function(k){var v=JSON.parse(values[k]);if(v.arquivado)delete all[v.numero];else all[v.numero]=v;});
    return all;
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
  function totalBytesPersistencia() {
    var all = props().getProperties();
    var b = 0;
    for (var k in all) {
      if (all.hasOwnProperty(k)) b += bytesUtf8(k) + bytesUtf8(all[k]);
    }
    return b;
  }
  function gravar(id,obj){
    var texto=JSON.stringify(obj);
    var bTexto = bytesUtf8(texto);
    if(bTexto>100000)throw new Error('Evolução muito extensa. Divida o conteúdo.');
    var bTotal = totalBytesPersistencia();
    if (bTotal + bTexto > 5000000) {
      podarHistorico(props());
    }
    props().setProperty(key(id),texto);
  }
  function erro(e){return {sucesso:false,erro:e.message,mensagem:'⚠️ '+e.message};}
  function ids(all){return Object.keys(all).sort(function(a,b){return a.localeCompare(b,undefined,{numeric:true});});}
  var _seqHist = 0;
  function gerarChaveHist(id) {
    _seqHist = (_seqHist + 1) % 10000000;
    var tNow = Date.now();
    var sTs = String(tNow).padStart(15, '0');
    var sSeq = String(_seqHist).padStart(8, '0');
    return 'LEITO_HIST_' + id + '_' + sTs + '_' + sSeq + '_' + Utilities.getUuid();
  }
  function obterTimestampRegistro(chave, payloadStr) {
    // Sufixo fixo, independente de underscores no identificador. Milissegundos
    // permanecem dentro de Number.MAX_SAFE_INTEGER; a chave desempata a sequência.
    var m = chave.match(/_(\d{15})_(\d{8})_[^_]+$/);
    if (m) return Number(m[1]);
    if (payloadStr) {
      try {
        var obj = JSON.parse(payloadStr);
        if (obj.timestamp) return obj.timestamp;
      } catch(e) {}
    }
    return 0; // Chaves legadas sem timestamp numérico são consideradas mais antigas
  }
  function podarHistorico(p, leitoId) {
    try {
      var allProps = p.getProperties();
      if (leitoId) {
        var prefixLeito = 'LEITO_HIST_' + leitoId + '_';
        var histKeysLeito = Object.keys(allProps).filter(function(k){
          if (k.indexOf('LEITO_HIST_') !== 0) return false;
          try { return String(JSON.parse(allProps[k]).numero) === String(leitoId); }
          catch (e) { return false; } // Não podar registros de origem indeterminada.
        });
        histKeysLeito.sort(function(k1, k2) {
          var t1 = obterTimestampRegistro(k1, allProps[k1]);
          var t2 = obterTimestampRegistro(k2, allProps[k2]);
          if (t1 !== t2) return t1 - t2;
          return k1.localeCompare(k2);
        });
        if (histKeysLeito.length >= 10) {
          histKeysLeito.slice(0, histKeysLeito.length - 9).forEach(function(k){ p.deleteProperty(k); });
        }
      } else {
        var allHistKeys = Object.keys(allProps).filter(function(k){ return k.indexOf('LEITO_HIST_') === 0; });
        allHistKeys.sort(function(k1, k2) {
          var t1 = obterTimestampRegistro(k1, allProps[k1]);
          var t2 = obterTimestampRegistro(k2, allProps[k2]);
          if (t1 !== t2) return t1 - t2;
          return k1.localeCompare(k2);
        });
        if (allHistKeys.length >= 50) {
          allHistKeys.slice(0, allHistKeys.length - 49).forEach(function(k){ p.deleteProperty(k); });
        }
      }
      var totalBytes = Object.keys(allProps).reduce(function(sum, k){
        return sum + bytesUtf8(k) + bytesUtf8(allProps[k]);
      }, 0);
      if (totalBytes > 250000) {
        var globalHist = Object.keys(allProps).filter(function(k){ return k.indexOf('LEITO_HIST_') === 0; });
        globalHist.sort(function(k1, k2) {
          var t1 = obterTimestampRegistro(k1, allProps[k1]);
          var t2 = obterTimestampRegistro(k2, allProps[k2]);
          if (t1 !== t2) return t1 - t2;
          return k1.localeCompare(k2);
        });
        globalHist.slice(0, Math.ceil(globalHist.length / 2)).forEach(function(k){ p.deleteProperty(k); });
      }
    } catch(e) {}
  }
  function statusExplicito(texto, anterior){
    var m=texto.match(/(?:^|\n)status:\s*(est[aá]vel|inst[aá]vel|vigil[aâ]ncia|alta programada)\s*(?:\n|$)/i);
    if(!m)return anterior||'⚪ Não confirmado';
    var s=m[1].toLowerCase();return s.indexOf('inst')===0?'🚨 Instável / Crítico':s.indexOf('est')===0?'⚪ Estável':s.indexOf('alta')===0?'🟢 Alta Programada':'🟡 Em Vigilância';
  }
  return {
    obterTodos:carregar,
    obterLeito:function(id){return carregar()[String(id).trim()]||null;},
    atualizarLeito:function(num,texto){
      try{
        var id=String(num).trim();if(!/^[\w-]{1,24}$/.test(id))throw new Error('Use até 24 letras, números ou hífen para identificar o leito.');
        texto=String(texto||'').trim();if(!texto)throw new Error('Informe a evolução.');
        var all=carregar(),prior=all[id],tz=ConfigService.get('TIMEZONE','America/Sao_Paulo'),now=new Date();
        var obj={numero:id,dados:texto,status:statusExplicito(texto,prior&&prior.status),atualizadoEm:Utilities.formatDate(now,tz,'HH:mm'),dataISO:Utilities.formatDate(now,tz,'yyyy-MM-dd'),version:Utilities.getUuid()};
        if(unescape(encodeURIComponent(JSON.stringify(obj))).length>8000)throw new Error('Evolução excede 8 KB. Nenhum dado foi alterado; divida o conteúdo.');
        if(prior){
          podarHistorico(props(), id);
          props().setProperty(gerarChaveHist(id),JSON.stringify(prior));
        }
        gravar(id,obj);
        return {sucesso:true,leito:obj,mensagem:'🛏️ *Leito '+id+' atualizado*\n'+obj.dataISO+' · '+obj.atualizadoEm+'\nStatus: '+obj.status+'\n\n'+texto};
      }catch(e){return erro(e);}
    },
    atualizarStatusLeito:function(num,novoStatus,versaoEsperada){
      try{
        var id=String(num).trim(),all=carregar(),l=all[id];
        if(!l)return {sucesso:false,mensagem:'Leito '+id+' não está registrado.'};
        if(versaoEsperada && l.version && versaoEsperada !== l.version.slice(0, 8) && versaoEsperada !== l.version) {
          return {sucesso:false,mensagem:'O leito mudou de paciente ou foi atualizado. Abra-o novamente.'};
        }
        var statusFormatado=novoStatus;
        if(novoStatus==='estavel')statusFormatado='⚪ Estável';
        else if(novoStatus==='vigilancia')statusFormatado='🟡 Em Vigilância';
        else if(novoStatus==='instavel')statusFormatado='🚨 Instável / Crítico';
        else if(novoStatus==='alta')statusFormatado='🟢 Alta Programada';
        var tz=ConfigService.get('TIMEZONE','America/Sao_Paulo'),now=new Date();
        var obj={numero:id,dados:l.dados,status:statusFormatado,atualizadoEm:Utilities.formatDate(now,tz,'HH:mm'),dataISO:Utilities.formatDate(now,tz,'yyyy-MM-dd'),version:Utilities.getUuid()};
        podarHistorico(props(), id);
        props().setProperty(gerarChaveHist(id),JSON.stringify(l));
        gravar(id,obj);
        return {sucesso:true,leito:obj,mensagem:'🛏️ Status do Leito '+id+' alterado para '+statusFormatado};
      }catch(e){return erro(e);}
    },
    desocuparLeito:function(num,versao){
      try{var id=String(num).trim(),l=carregar()[id];if(!l)return {sucesso:false,mensagem:'Leito '+id+' não estava registrado como ocupado.'};
        if(versao && versao!==(l.version||l.dataISO+' '+l.atualizadoEm))throw new Error('O leito mudou. Abra-o novamente antes de confirmar a alta.');
        podarHistorico(props(), id);
        props().setProperty(gerarChaveHist(id),JSON.stringify(l));
        gravar(id,{numero:id,arquivado:true,dataAlta:new Date().toISOString()});
        return {sucesso:true,mensagem:'🟢 Alta registrada · leito '+id+'. Histórico preservado.'};
      }catch(e){return erro(e);}
    },
    limparTudo:function(){
      try{var all=carregar(),self=this;for(var id of Object.keys(all)){var r=self.desocuparLeito(id);if(!r.sucesso)return r;}return {sucesso:true,mensagem:'Enfermaria encerrada. Histórico preservado.'};}catch(e){return erro(e);}
    },
    formatarPainelBordo:function(){
      var all=carregar(),keys=ids(all);if(!keys.length)return '🏥 *ENFERMARIA · NENHUM LEITO REGISTRADO*\n\nUse /leito 4 seguido da evolução.';
      var estaveis=0,vigilancias=0,instaveis=0,naoConfirmados=0;
      keys.forEach(function(id){
        var st=(all[id].status||'').toLowerCase();
        if(st.indexOf('inst')!==-1)instaveis++;
        else if(st.indexOf('vigil')!==-1)vigilancias++;
        else if(st.indexOf('est')!==-1)estaveis++;
        else naoConfirmados++;
      });
      var censo='('+keys.length+' leitos: 🟢 '+estaveis+' estáveis | 🟡 '+vigilancias+' vigilância | 🔴 '+instaveis+' críticos'+(naoConfirmados ? ' | ⚪ '+naoConfirmados+' a avaliar' : '')+')';
      return '🏥 *Enfermaria* · '+censo+'\n\n'+keys.map(function(id){var l=all[id];return '*LEITO '+id+'* · '+l.status+'\n'+l.dataISO+' '+l.atualizadoEm+'\n'+l.dados;}).join('\n\n');
    },
    obterTextoConsolidadoParaPassagem:function(){var all=carregar(),keys=ids(all);return keys.length?keys.map(function(id){var l=all[id];return 'LEITO '+id+' · '+l.status+' · '+l.dataISO+' '+l.atualizadoEm+'\n'+l.dados;}).join('\n\n'):null;},
    gerarPassagemSBARConsolidada:function(idLeitoAlvo){
      var all=carregar(),keys=ids(all);
      if(!keys.length)return null;
      if(idLeitoAlvo){
        keys=keys.filter(function(k){return String(k).trim()===String(idLeitoAlvo).trim();});
        if(!keys.length)return null;
      }
      var estaveis=0,vigilancias=0,instaveis=0,naoConfirmados=0;
      var pendenciasPlantao=[];
      var listaLeitos=[];

      keys.forEach(function(id){
        var l=all[id];
        var st=(l.status||'').toLowerCase();
        if(st.indexOf('inst')!==-1)instaveis++;
        else if(st.indexOf('vigil')!==-1)vigilancias++;
        else if(st.indexOf('est')!==-1)estaveis++;
        else naoConfirmados++;

        var dadosTxt=String(l.dados||'');
        var pendLeito=[];
        var mPend=dadosTxt.match(/(?:pend[êe]ncia[s]?|checar|solicito|programo|aguardando|aguarda|colher|repetir|ajustar|desmamar|trocar)\s*[:=]?\s*([^.,;\n]+)/gi);
        if(mPend){
          mPend.forEach(function(p){
            var limpo=p.replace(/^(?:pend[êe]ncia[s]?|checar|solicito|programo|aguardando|aguarda|colher|repetir|ajustar|desmamar|trocar)\s*[:=]?\s*/i,'').trim();
            if(limpo.length>=3&&pendLeito.indexOf(limpo)===-1){
              pendLeito.push(limpo);
            }
          });
        }
        if(pendLeito.length>0){
          pendenciasPlantao.push('• Leito '+id+': '+pendLeito.join('; '));
        }

        listaLeitos.push(
          '🛏️ *LEITO '+id+'* · '+l.status+'\n'+
          '⏱️ Atualizado: '+l.dataISO+' às '+l.atualizadoEm+'\n'+
          '📝 *Evolução:* '+l.dados+
          (pendLeito.length>0?'\n⏰ *Pendências:* '+pendLeito.join('; '):'')
        );
      });

      var tz=ConfigService.get('TIMEZONE','America/Sao_Paulo');
      var now=new Date();
      var dataHora=Utilities.formatDate(now,tz,'dd/MM/yyyy às HH:mm');

      var censoResumo=keys.length+' leitos ativos (🟢 '+estaveis+' estáveis | 🟡 '+vigilancias+' vigilância | 🔴 '+instaveis+' críticos'+(naoConfirmados?' | ⚪ '+naoConfirmados+' a avaliar':'')+')';

      var txtSbar='📋 *PASSAGEM DE PLANTÃO SBAR · ENFERMARIA*\n'+
        '📅 '+dataHora+'\n\n'+
        '*S (SITUAÇÃO / CENSO)*\n'+
        '• Censo: '+censoResumo+'\n'+
        '• Setor: Enfermaria Geral / Internação Hospitalar\n\n'+
        '*B & A (HISTÓRICO & AVALIAÇÃO BEIRA-LEITO)*\n\n'+
        listaLeitos.join('\n\n')+'\n\n'+
        '*R (RECOMENDAÇÕES & PENDÊNCIAS DO PLANTÃO)*\n'+
        (pendenciasPlantao.length>0?pendenciasPlantao.join('\n'):'• Sem pendências críticas registradas no momento. Manter vigilância clínica e planos vigentes.');

      return txtSbar;
    },
    gerarPassagemSBARDeterministica:function(idLeitoAlvo){
      return this.gerarPassagemSBARConsolidada(idLeitoAlvo);
    }
  };
})();
