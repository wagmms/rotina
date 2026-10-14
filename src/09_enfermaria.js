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
  var STATUS_CANONICO = {
    instavel: '🚨 Instável / Crítico',
    estavel: '⚪ Estável',
    vigilancia: '🟡 Em Vigilância',
    alta: '🟢 Alta Programada'
  };

  function normalizarStatus(statusChave) {
    var k = String(statusChave || '').toLowerCase();
    return STATUS_CANONICO[k] || statusChave;
  }

  function statusExplicito(texto, anterior) {
    var m = texto.match(/(?:^|\n)status:\s*(est[aá]vel|inst[aá]vel|vigil[aâ]ncia|alta programada)\s*(?:\n|$)/i);
    if (!m) return anterior || '⚪ Não confirmado';
    var s = m[1].toLowerCase();
    if (s.indexOf('inst') === 0) return STATUS_CANONICO.instavel;
    if (s.indexOf('est') === 0) return STATUS_CANONICO.estavel;
    if (s.indexOf('alta') === 0) return STATUS_CANONICO.alta;
    return STATUS_CANONICO.vigilancia;
  }

  function contarCensoLeitos(all, keys) {
    var estaveis = 0, vigilancias = 0, instaveis = 0, naoConfirmados = 0;
    keys.forEach(function (id) {
      var st = (all[id].status || '').toLowerCase();
      if (st.indexOf('inst') !== -1) instaveis++;
      else if (st.indexOf('vigil') !== -1) vigilancias++;
      else if (st.indexOf('est') !== -1) estaveis++;
      else naoConfirmados++;
    });
    var sufixoAvaliar = naoConfirmados ? ' | ⚪ ' + naoConfirmados + ' a avaliar' : '';
    return {
      total: keys.length,
      estaveis: estaveis,
      vigilancias: vigilancias,
      instaveis: instaveis,
      naoConfirmados: naoConfirmados,
      resumoPainel: '(' + keys.length + ' leitos: 🟢 ' + estaveis + ' estáveis | 🟡 ' + vigilancias + ' vigilância | 🔴 ' + instaveis + ' críticos' + sufixoAvaliar + ')',
      resumoSbar: keys.length + ' leitos ativos (🟢 ' + estaveis + ' estáveis | 🟡 ' + vigilancias + ' vigilância | 🔴 ' + instaveis + ' críticos' + sufixoAvaliar + ')'
    };
  }

  var REGEX_PENDENCIAS = /(?:pend[êe]ncia[s]?|checar|solicito|programo|aguardando|aguarda|colher|repetir|ajustar|desmamar|trocar)\s*[:=]?\s*([^.,;\n]+)/gi;
  var REGEX_PREFIXO_PENDENCIA = /^(?:pend[êe]ncia[s]?|checar|solicito|programo|aguardando|aguarda|colher|repetir|ajustar|desmamar|trocar)\s*[:=]?\s*/i;

  function extrairPendenciasLeito(dadosTxt) {
    if (!dadosTxt) return [];
    var pendLeito = [];
    var mPend = String(dadosTxt).match(REGEX_PENDENCIAS);
    if (!mPend) return pendLeito;
    mPend.forEach(function (p) {
      var limpo = p.replace(REGEX_PREFIXO_PENDENCIA, '').trim();
      if (limpo.length >= 3 && pendLeito.indexOf(limpo) === -1) {
        pendLeito.push(limpo);
      }
    });
    return pendLeito;
  }

  function formatarCardLeitoSbar(id, leito, pendencias) {
    var pendTxt = pendencias.length > 0 ? '\n⏰ *Pendências:* ' + pendencias.join('; ') : '';
    return '🛏️ *LEITO ' + id + '* · ' + leito.status + '\n' +
      '⏱️ Atualizado: ' + leito.dataISO + ' às ' + leito.atualizadoEm + '\n' +
      '📝 *Evolução:* ' + leito.dados + pendTxt + '\n' + CHECKLIST_PRE_ROUND;
  }

  function formatarSecaoSituacao(censoResumo) {
    return '*S (SITUAÇÃO / CENSO)*\n' +
      '• Censo: ' + censoResumo + '\n' +
      '• Setor: Enfermaria Geral / Internação Hospitalar';
  }

  function formatarSecaoHistoricoAvaliacao(listaLeitos) {
    return '*B & A (HISTÓRICO & AVALIAÇÃO BEIRA-LEITO)*\n\n' + listaLeitos.join('\n\n');
  }

  function formatarSecaoRecomendacoes(pendenciasPlantao) {
    return '*R (RECOMENDAÇÕES & PENDÊNCIAS DO PLANTÃO)*\n' +
      (pendenciasPlantao.length > 0
        ? pendenciasPlantao.join('\n')
        : '• Sem pendências críticas registradas no momento. Manter vigilância clínica e planos vigentes.');
  }

  var CHECKLIST_PRE_ROUND = 'Checklist rápido pré-round: Profilaxia TEV (indicação/contraindicação); Sonda/Acesso (necessidade e retirada); Dia de ATB/Descalonamento (culturas, foco e duração); Diurese/Eletrólitos (balanço, creatinina, Na/K/Mg).';

  function obterMascarasPep() {
    return {
      admissaoCo: '<code>ADMISSÃO CO | Data/hora: [ ]\nG/P/A: [ ] | IG: [ ] por [DUM/USG] | DPP: [ ] | Rh/GBS: [ ]\nQueixa e início: [ ] | Movimentos fetais: [ ] | Perda líquida/sangramento: [ ]\nPA/FC/FR/SpO2/T: [ ] | BCF: [ ] | Dinâmica uterina: [ ]\nAbdome/apresentação: [ ] | Bolsa: [ ] | Especular se indicado: [ ]\nToque vaginal somente se indicado, após consentimento e excluída placenta prévia: dilatação [ ], apagamento [ ], De Lee [ ].\nHipótese/risco materno-fetal: [ ] | Conduta, exames, vigilância e comunicação à obstetrícia: [ ]</code>',
      puerpera: '<code>EVOLUÇÃO ALOJAMENTO CONJUNTO | DPP: [ ] | Parto: [ ] | RN: [ ]\nQueixas, dor, amamentação e deambulação: [ ]\nPA/FC/T: [ ] | Mamas/mamilos: [ ] | Útero/involução: [ ]\nLóquios (volume, odor): [ ] | Períneo/ferida operatória: [ ] | Diurese/evacuação: [ ]\nProfilaxia TEV/risco hemorrágico: [ ] | Conduta, sinais de alarme e alta: [ ]</code>',
      prenatal: '<code>CONSULTA PRÉ-NATAL | G/P/A: [ ] | DUM: [ ] | IG: [ ] | DPP: [ ]\nQueixas, sangramento/perda líquida, movimentos fetais: [ ]\nPA/peso/edema: [ ] | AU: [ ] | BCF: [ ]\nExames por trimestre e resultados pendentes: [ ] | Vacinas (dT/dTpa/Hep B/Influenza): [ ]\nFerro/ácido fólico/cálcio; AAS se risco de PE: [ ] | GBS 35–37 sem: [ ]\nRisco gestacional, conduta, retorno e sinais de alarme: [ ]</code>',
      exameGinecologico: '<code>EXAME GINECOLÓGICO | Indicação e consentimento: [ ] | Acompanhante ofertado: [ ]\nInspeção vulvar/perineal: [ ] | Espéculo: paredes vaginais [ ], colo [ ], secreção [ ], sangramento [ ].\nColetas, se indicadas: [ ] | Toque bimanual somente se indicado: colo [ ], útero [ ], anexos [ ], dor [ ].\nAchados, tolerância, hipótese e conduta: [ ]</code>',
      clinicaGeral: '<code>EVOLUÇÃO ENFERMARIA | Leito: [ ] | D de internação: [ ]\nProblemas ativos e eventos 24h: [ ] | Sinais vitais: [ ] | Exame dirigido: [ ]\nExames/culturas: [ ] | Plano por problema: [ ]\nProfilaxia TEV: [ ] | Sonda/Acesso: [ ] | Dia de ATB/Descalonamento: [ ] | Diurese/Eletrólitos: [ ]\nPendências e critérios de alta: [ ]</code>'
    };
  }

  return {
    obterChecklistPreRound: function () { return CHECKLIST_PRE_ROUND; },
    obterMascarasPep: obterMascarasPep,
    obterTodos: carregar,
    obterLeito: function (id) { return carregar()[String(id).trim()] || null; },
    atualizarLeito: function (num, texto) {
      try {
        var id = String(num).trim();
        if (!/^[\w-]{1,24}$/.test(id)) throw new Error('Use até 24 letras, números ou hífen para identificar o leito.');
        texto = String(texto || '').trim();
        if (!texto) throw new Error('Informe a evolução.');
        var all = carregar(), prior = all[id], tz = ConfigService.get('TIMEZONE', 'America/Sao_Paulo'), now = new Date();
        var obj = {
          numero: id,
          dados: texto,
          status: statusExplicito(texto, prior && prior.status),
          atualizadoEm: Utilities.formatDate(now, tz, 'HH:mm'),
          dataISO: Utilities.formatDate(now, tz, 'yyyy-MM-dd'),
          version: Utilities.getUuid()
        };
        if (unescape(encodeURIComponent(JSON.stringify(obj))).length > 8000) throw new Error('Evolução excede 8 KB. Nenhum dado foi alterado; divida o conteúdo.');
        if (prior) {
          podarHistorico(props(), id);
          props().setProperty(gerarChaveHist(id), JSON.stringify(prior));
        }
        gravar(id, obj);
        return { sucesso: true, leito: obj, mensagem: '🛏️ *Leito ' + id + ' atualizado*\n' + obj.dataISO + ' · ' + obj.atualizadoEm + '\nStatus: ' + obj.status + '\n\n' + texto };
      } catch (e) { return erro(e); }
    },
    atualizarStatusLeito: function (num, novoStatus, versaoEsperada) {
      try {
        var id = String(num).trim(), all = carregar(), l = all[id];
        if (!l) return { sucesso: false, mensagem: 'Leito ' + id + ' não está registrado.' };
        if (versaoEsperada && l.version && versaoEsperada !== l.version.slice(0, 8) && versaoEsperada !== l.version) {
          return { sucesso: false, mensagem: 'O leito mudou de paciente ou foi atualizado. Abra-o novamente.' };
        }
        var statusFormatado = normalizarStatus(novoStatus);
        var tz = ConfigService.get('TIMEZONE', 'America/Sao_Paulo'), now = new Date();
        var obj = {
          numero: id,
          dados: l.dados,
          status: statusFormatado,
          atualizadoEm: Utilities.formatDate(now, tz, 'HH:mm'),
          dataISO: Utilities.formatDate(now, tz, 'yyyy-MM-dd'),
          version: Utilities.getUuid()
        };
        podarHistorico(props(), id);
        props().setProperty(gerarChaveHist(id), JSON.stringify(l));
        gravar(id, obj);
        return { sucesso: true, leito: obj, mensagem: '🛏️ Status do Leito ' + id + ' alterado para ' + statusFormatado };
      } catch (e) { return erro(e); }
    },
    desocuparLeito: function (num, versao) {
      try {
        var id = String(num).trim(), l = carregar()[id];
        if (!l) return { sucesso: false, mensagem: 'Leito ' + id + ' não estava registrado como ocupado.' };
        if (versao && versao !== (l.version || l.dataISO + ' ' + l.atualizadoEm)) throw new Error('O leito mudou. Abra-o novamente antes de confirmar a alta.');
        podarHistorico(props(), id);
        props().setProperty(gerarChaveHist(id), JSON.stringify(l));
        gravar(id, { numero: id, arquivado: true, dataAlta: new Date().toISOString() });
        return { sucesso: true, mensagem: '🟢 Alta registrada · leito ' + id + '. Histórico preservado.' };
      } catch (e) { return erro(e); }
    },
    limparTudo: function () {
      try {
        var all = carregar(), self = this;
        for (var id of Object.keys(all)) {
          var r = self.desocuparLeito(id);
          if (!r.sucesso) return r;
        }
        return { sucesso: true, mensagem: 'Enfermaria encerrada. Histórico preservado.' };
      } catch (e) { return erro(e); }
    },
    formatarPainelBordo: function () {
      var all = carregar(), keys = ids(all);
      if (!keys.length) return '🏥 *ENFERMARIA · NENHUM LEITO REGISTRADO*\n\nUse /leito 4 seguido da evolução.';
      var censo = contarCensoLeitos(all, keys);
      var cards = keys.map(function (id) {
        var l = all[id];
        return '*LEITO ' + id + '* · ' + l.status + '\n' + l.dataISO + ' ' + l.atualizadoEm + '\n' + l.dados + '\n' + CHECKLIST_PRE_ROUND;
      });
      return '🏥 *Enfermaria* · ' + censo.resumoPainel + '\n\n' + cards.join('\n\n');
    },
    obterTextoConsolidadoParaPassagem: function () {
      var all = carregar(), keys = ids(all);
      return keys.length ? keys.map(function (id) {
        var l = all[id];
        return 'LEITO ' + id + ' · ' + l.status + ' · ' + l.dataISO + ' ' + l.atualizadoEm + '\n' + l.dados + '\n' + CHECKLIST_PRE_ROUND;
      }).join('\n\n') : null;
    },
    gerarPassagemSBARConsolidada: function (idLeitoAlvo) {
      var all = carregar(), keys = ids(all);
      if (!keys.length) return null;
      if (idLeitoAlvo) {
        var alvoStr = String(idLeitoAlvo).trim();
        keys = keys.filter(function (k) { return String(k).trim() === alvoStr; });
        if (!keys.length) return null;
      }

      var censo = contarCensoLeitos(all, keys);
      var pendenciasPlantao = [];
      var listaLeitos = [];

      keys.forEach(function (id) {
        var l = all[id];
        var pendLeito = extrairPendenciasLeito(l.dados);
        if (pendLeito.length > 0) {
          pendenciasPlantao.push('• Leito ' + id + ': ' + pendLeito.join('; '));
        }
        listaLeitos.push(formatarCardLeitoSbar(id, l, pendLeito));
      });

      var tz = ConfigService.get('TIMEZONE', 'America/Sao_Paulo');
      var now = new Date();
      var dataHora = Utilities.formatDate(now, tz, 'dd/MM/yyyy às HH:mm');

      var secaoSituacao = formatarSecaoSituacao(censo.resumoSbar);
      var secaoHistoricoAvaliacao = formatarSecaoHistoricoAvaliacao(listaLeitos);
      var secaoRecomendacoes = formatarSecaoRecomendacoes(pendenciasPlantao);

      return '📋 *PASSAGEM DE PLANTÃO SBAR · ENFERMARIA*\n' +
        '📅 ' + dataHora + '\n\n' +
        secaoSituacao + '\n\n' +
        secaoHistoricoAvaliacao + '\n\n' +
        secaoRecomendacoes;
    },
    gerarPassagemSBARDeterministica: function (idLeitoAlvo) {
      return this.gerarPassagemSBARConsolidada(idLeitoAlvo);
    }
  };
})();
