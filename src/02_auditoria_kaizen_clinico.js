/**
 * ==============================================================================
 * MÓDULO 02-KAIZEN: FERRAMENTA DE AUDITORIA ANALÍTICA (DASHBOARD KAIZEN CLÍNICO)
 * ==============================================================================
 * Sistema determinístico off-line de alta velocidade (< 10ms) que audita, agrega e
 * sumariza tendências de prescrições hospitalares rejeitadas por risco clínico,
 * interações medicamentosas graves, falhas de ajuste renal e eventos sentinela.
 * 
 * Funcionalidades:
 *  - Auditoria individual e processamento de lote (batch) em prontuários off-line.
 *  - Classificação de desfecho: Bloqueio Fatal, Interação Grave, Ajuste Renal,
 *    Retenção RBAC e Liberação Segura.
 *  - Cálculo determinístico do Índice de Maturidade de Kaizen Clínico (0 a 100).
 *  - Detecção em tempo real dos Top Fármacos Incidentes e Top Interações Recorrentes.
 *  - Distribuição analítica por Setor (UTI, Emergência, Enfermaria) e Perfil Prescritor.
 *  - Geração automática de Plano de Ação Kaizen e Intervenções Prioritárias.
 *  - Renderização de Dashboard em ASCII/Markdown e integração com Fastify RPC / PWA.
 * ==============================================================================
 */

var AuditoriaKaizenClinicoService = (function () {
  'use strict';

  // ───────────────────────────────────────────────────────────────────────────
  // 1. CONSTANTES E TAXONOMIA DE SEGURANÇA DO PACIENTE (OMS / ISMP)
  // ───────────────────────────────────────────────────────────────────────────

  var CAPACIDADE_MAXIMA_BUFFER = 2000;

  var CATEGORIAS_DESFECHO = {
    REJEITADA_BLOQUEIO_FATAL: {
      id: 'REJEITADA_BLOQUEIO_FATAL',
      rotulo: 'Bloqueio Fatal (Evento Sentinela)',
      icone: '🛑',
      gravidadeNivel: 5,
      bloqueiaDispensacao: true,
      penalidadeMaturidade: 20
    },
    REJEITADA_INTERACAO_GRAVE: {
      id: 'REJEITADA_INTERACAO_GRAVE',
      rotulo: 'Rejeitada por Interação Grave / Contraindicada',
      icone: '🔴',
      gravidadeNivel: 4,
      bloqueiaDispensacao: true,
      penalidadeMaturidade: 8
    },
    INTERVENCAO_AJUSTE_RENAL: {
      id: 'INTERVENCAO_AJUSTE_RENAL',
      rotulo: 'Intervenção Farmacêutica (Ajuste de Dose Renal)',
      icone: '🫘',
      gravidadeNivel: 3,
      bloqueiaDispensacao: true,
      penalidadeMaturidade: 4
    },
    RETIDA_SUPERVISAO: {
      id: 'RETIDA_SUPERVISAO',
      rotulo: 'Retida para Supervisão / Co-assinatura RBAC',
      icone: '📋',
      gravidadeNivel: 2,
      bloqueiaDispensacao: true,
      penalidadeMaturidade: 2
    },
    LIBERADA_COM_ALERTA: {
      id: 'LIBERADA_COM_ALERTA',
      rotulo: 'Liberada com Alerta / Monitoramento Farmacológico',
      icone: '🟡',
      gravidadeNivel: 1,
      bloqueiaDispensacao: false,
      penalidadeMaturidade: 1
    },
    LIBERADA_SEGURA: {
      id: 'LIBERADA_SEGURA',
      rotulo: 'Liberada Segura (Conforme Protocolos)',
      icone: '✅',
      gravidadeNivel: 0,
      bloqueiaDispensacao: false,
      penalidadeMaturidade: 0
    }
  };

  var SETORES_VALIDOS = ['UTI', 'EMERGENCIA', 'ENFERMARIA', 'AMBULATORIO', 'CENTRO_CIRURGICO', 'OUTROS'];

  var PERFIS_VALIDOS = ['ACADEMICO', 'INTERNO', 'RESIDENTE', 'ASSISTENTE', 'PRECEPTOR'];

  // Ring buffer em memória para eventos de auditoria analítica
  var _bufferAuditoria = [];

  // ───────────────────────────────────────────────────────────────────────────
  // 2. REGRAS DETERMINÍSTICAS DE CONTINGÊNCIA / BASE EMBUTIDA
  // ───────────────────────────────────────────────────────────────────────────

  var INTERACOES_CRITICAS_PADRAO = [
    {
      drogaA: 'amiodarona',
      drogaB: 'fluconazol',
      grau: 'CONTRAINDICADO',
      grauNormalizado: 'CONTRAINDICADO',
      efeito: 'Prolongamento sinérgico acentuado do intervalo QTc com risco de Torsades de Pointes e PCR.',
      recomendacao: 'Suspender fluconazol ou amiodarona. Considerar equinocandina (anidulafungina/micafungina).'
    },
    {
      drogaA: 'varfarina',
      drogaB: 'cetoprofeno',
      grau: 'GRAVE',
      grauNormalizado: 'GRAVE',
      efeito: 'Inibição plaquetária associada a lesão da mucosa gástrica e anticoagulação plena, gerando hemorragia digestiva maciça.',
      recomendacao: 'Contraindicado AINE. Utilizar analgésicos puros (dipirona, paracetamol) ou opioides fracos.'
    },
    {
      drogaA: 'varfarina',
      drogaB: 'ibuprofeno',
      grau: 'GRAVE',
      grauNormalizado: 'GRAVE',
      efeito: 'Aumento expressivo do risco de hemorragia grave gastrintestinal e sistêmica.',
      recomendacao: 'Substituir por dipirona ou paracetamol.'
    },
    {
      drogaA: 'espironolactona',
      drogaB: 'enalapril',
      grau: 'GRAVE',
      grauNormalizado: 'GRAVE',
      efeito: 'Hipercalemia severa potencialmente fatal em vigência de disfunção renal.',
      recomendacao: 'Monitorar K sérico estrito; suspender espironolactona se K > 5,5 mEq/L ou ClCr < 30.'
    },
    {
      drogaA: 'claritromicina',
      drogaB: 'sinvastatina',
      grau: 'CONTRAINDICADO',
      grauNormalizado: 'CONTRAINDICADO',
      efeito: 'Inibição potente de CYP3A4 com elevação de 10x na concentração da sinvastatina, levando a rabdomiólise e IRA.',
      recomendacao: 'Suspender temporariamente a sinvastatina durante o curso de claritromicina ou usar azitromicina.'
    },
    {
      drogaA: 'digoxina',
      drogaB: 'amiodarona',
      grau: 'GRAVE',
      grauNormalizado: 'GRAVE',
      efeito: 'Redução do clearance da digoxina em 50% com risco de intoxicação digitálica fatal (BAVT, arritmias ventriculares).',
      recomendacao: 'Reduzir a dose da digoxina em 50% e dosar digoxinemia após 3-5 dias.'
    }
  ];

  var AJUSTES_RENAIS_PADRAO = [
    {
      termo: 'enoxaparina',
      nomeOficial: 'Enoxaparina Sódica',
      ajuste: 'ClCr < 30 mL/min: profilaxia 20mg SC 1x/dia; dose terapêutica 1mg/kg SC 1x/dia (dose única diária) ou substituir por HNF com monitorização de TTPa.',
      limiarClCr: 30
    },
    {
      termo: 'vancomicina',
      nomeOficial: 'Cloridrato de Vancomicina',
      ajuste: 'ClCr 10-30 mL/min: dose de ataque 25-30 mg/kg seguida de manutenção guiada por vancocinemia (alvo AUC/MIC 400-600 ou vale 15-20 mcg/mL).',
      limiarClCr: 50
    },
    {
      termo: 'meropenem',
      nomeOficial: 'Meropenem',
      ajuste: 'ClCr 26-50: 1g IV 12/12h; ClCr 10-25: 500mg IV 12/12h; ClCr < 10: 500mg IV 24/24h.',
      limiarClCr: 50
    },
    {
      termo: 'metformina',
      nomeOficial: 'Cloridrato de Metformina',
      ajuste: 'TFG 30-44: dose máxima 1.000 mg/dia; TFG < 30 mL/min: CONTRAINDICAÇÃO FORMAL por risco elevado de acidose lática.',
      limiarClCr: 45
    },
    {
      termo: 'cetoprofeno',
      nomeOficial: 'Cetoprofeno',
      ajuste: 'ClCr < 30 mL/min: contraindicado por risco de progressão de insuficiência renal aguda.',
      limiarClCr: 30
    }
  ];

  // ───────────────────────────────────────────────────────────────────────────
  // 3. AUXILIARES DE NORMALIZAÇÃO E EXTRAÇÃO
  // ───────────────────────────────────────────────────────────────────────────

  function normalizarTexto(txt) {
    return String(txt || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function extrairListaFarmacos(entrada) {
    if (Array.isArray(entrada)) {
      var arr = [];
      entrada.forEach(function (it) {
        if (typeof it === 'string') {
          var f = normalizarTexto(it);
          if (f.length >= 3 && arr.indexOf(f) === -1) arr.push(f);
        } else if (it && it.farmaco) {
          var ff = normalizarTexto(it.farmaco);
          if (ff.length >= 3 && arr.indexOf(ff) === -1) arr.push(ff);
        }
      });
      return arr;
    }
    if (typeof entrada === 'string') {
      if (typeof extrairFarmacosDoTexto === 'function') {
        try {
          var res = extrairFarmacosDoTexto(entrada);
          if (Array.isArray(res) && res.length > 0) return res.map(normalizarTexto);
        } catch (e) {}
      }
      var tokens = entrada
        .split(/[\n,;+]/)
        .map(function (s) {
          return normalizarTexto(s.replace(/[\d]+(\.[\d]+)?\s*(mg|mcg|g|ml|ui|gotas|cp|ampola|frasco).*/i, ''));
        })
        .filter(function (s) { return s.length >= 3; });
      var unicos = [];
      tokens.forEach(function (t) { if (unicos.indexOf(t) === -1) unicos.push(t); });
      return unicos;
    }
    return [];
  }

  function extrairClCr(contextoClinico, textoPrescricao) {
    var txt = (typeof contextoClinico === 'string' ? contextoClinico : '') + ' ' + (typeof textoPrescricao === 'string' ? textoPrescricao : '');
    if (contextoClinico && typeof contextoClinico === 'object') {
      if (typeof contextoClinico.clcr === 'number') return contextoClinico.clcr;
      if (typeof contextoClinico.tfg === 'number') return contextoClinico.tfg;
      if (typeof contextoClinico.creatinina === 'number' && contextoClinico.creatinina > 2.5) {
        return 25; // Estimativa conservadora de disfunção renal severa
      }
    }
    var mClcr = txt.match(/(?:clcr|tfg|clearance)\D{0,5}(\d{1,3}(?:[.,]\d+)?)/i);
    if (mClcr) return parseFloat(mClcr[1].replace(',', '.'));
    var mCr = txt.match(/(?:cr|creatinina)\D{0,5}(\d{1,2}(?:[.,]\d+)?)/i);
    if (mCr) {
      var crVal = parseFloat(mCr[1].replace(',', '.'));
      if (crVal >= 3.0) return 20;
      if (crVal >= 2.0) return 30;
      if (crVal >= 1.5) return 45;
    }
    return null;
  }

  function normalizarSetor(setor) {
    var s = normalizarTexto(setor).toUpperCase();
    if (s.indexOf('UTI') !== -1 || s.indexOf('CTI') !== -1 || s.indexOf('INTENSIV') !== -1) return 'UTI';
    if (s.indexOf('EMERG') !== -1 || s.indexOf('PS') !== -1 || s.indexOf('PRONTO') !== -1 || s.indexOf('VERMELHA') !== -1) return 'EMERGENCIA';
    if (s.indexOf('ENFERM') !== -1 || s.indexOf('INTERNA') !== -1 || s.indexOf('LEITO') !== -1) return 'ENFERMARIA';
    if (s.indexOf('AMBUL') !== -1 || s.indexOf('POSTO') !== -1 || s.indexOf('UBS') !== -1 || s.indexOf('CONSULT') !== -1) return 'AMBULATORIO';
    if (s.indexOf('CIRURG') !== -1 || s.indexOf('RPA') !== -1 || s.indexOf('BLOCO') !== -1) return 'CENTRO_CIRURGICO';
    return 'OUTROS';
  }

  function normalizarPerfil(perfil) {
    var p = normalizarTexto(perfil).toUpperCase();
    if (p.indexOf('ACAD') !== -1 || p.indexOf('ALUN') !== -1 || p.indexOf('ESTUD') !== -1) return 'ACADEMICO';
    if (p.indexOf('INTERN') !== -1) return 'INTERNO';
    if (p.indexOf('RESID') !== -1 || p.indexOf('R1') !== -1 || p.indexOf('R2') !== -1 || p.indexOf('R3') !== -1) return 'RESIDENTE';
    if (p.indexOf('PRECEPT') !== -1 || p.indexOf('DOCENT') !== -1 || p.indexOf('CHEF') !== -1) return 'PRECEPTOR';
    return 'ASSISTENTE';
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. MOTOR DETERMINÍSTICO DE AUDITORIA BEIRA-LEITO
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Executa a auditoria completa de uma prescrição médica e classifica seu desfecho de segurança.
   * @param {Object} dadosPrescricao
   * @returns {Object} Evento de auditoria detalhado com status de segurança
   */
  function auditarPrescricao(dadosPrescricao) {
    var t0 = Date.now();
    dadosPrescricao = dadosPrescricao || {};

    var id = dadosPrescricao.id || dadosPrescricao.prescricaoId || ('audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
    var dataIso = dadosPrescricao.timestamp || new Date().toISOString();
    var paciente = dadosPrescricao.paciente || dadosPrescricao.leito || 'Paciente Não Identificado';
    var setor = normalizarSetor(dadosPrescricao.setor || 'ENFERMARIA');
    var prescritor = {
      nome: (dadosPrescricao.prescritor && dadosPrescricao.prescritor.nome) || dadosPrescricao.prescritorNome || 'Médico Prescritor',
      perfil: normalizarPerfil((dadosPrescricao.prescritor && dadosPrescricao.prescritor.perfil) || dadosPrescricao.perfilPrescritor || 'ASSISTENTE')
    };

    var textoPrescricao = dadosPrescricao.textoPrescricao || '';
    if (Array.isArray(dadosPrescricao.itens)) {
      textoPrescricao = textoPrescricao + '\n' + dadosPrescricao.itens.join('\n');
    }

    var farmacos = extrairListaFarmacos(dadosPrescricao.itens || textoPrescricao || dadosPrescricao.medicamentos || []);
    var clcr = extrairClCr(dadosPrescricao.contextoClinico, textoPrescricao);

    var bloqueiosSentinela = [];
    var interacoesDetectadas = [];
    var ajustesRenaisExigidos = [];
    var retencaoRbac = null;

    // A. Detecção de Bloqueios Fatais / Eventos Sentinela
    var txtNorm = normalizarTexto(textoPrescricao);
    if ((txtNorm.indexOf('kcl') !== -1 || txtNorm.indexOf('cloreto de potassio') !== -1) &&
        (txtNorm.indexOf('bolus') !== -1 || txtNorm.indexOf('puro') !== -1 || txtNorm.indexOf('direto') !== -1 || txtNorm.indexOf('sem diluir') !== -1)) {
      bloqueiosSentinela.push({
        tipo: 'EVENTO_SENTINELA_KCL_BOLUS',
        gravidade: 'LETAL',
        fármaco: 'Cloreto de Potássio 19,1%',
        motivo: 'Injeção de KCl 19,1% em bolus direto causa parada cardiorrespiratória imediata por assistolia.',
        acaoCorretiva: 'Infusão somente diluída em solução glicosada ou salina, velocidade máxima 20 mEq/h com monitorização contínua.'
      });
    }

    if (txtNorm.indexOf('succinilcolina') !== -1 && (txtNorm.indexOf('hipercalem') !== -1 || txtNorm.indexOf('k >') !== -1 || txtNorm.indexOf('queimado') !== -1 || txtNorm.indexOf('denervac') !== -1)) {
      bloqueiosSentinela.push({
        tipo: 'EVENTO_SENTINELA_SUCCINILCOLINA_HIPERCALEMIA',
        gravidade: 'LETAL',
        fármaco: 'Succinilcolina',
        motivo: 'Risco de hipercalemia maciça fulminante com parada cardíaca em pacientes queimados ou desnervados.',
        acaoCorretiva: 'Substituir por Rocurônio 1,2 mg/kg IV com Sugamadex 16 mg/kg disponível para reversão imediata.'
      });
    }

    // B. Detecção de Interações Medicamentosas
    // Prioridade 1: Executar cross-check oficial do sistema se disponível
    var crossCheckGlobal = null;
    if (typeof executarCrossCheckSegurancaClinica === 'function') {
      try {
        crossCheckGlobal = executarCrossCheckSegurancaClinica(farmacos, dadosPrescricao.contextoClinico || textoPrescricao);
        if (crossCheckGlobal && Array.isArray(crossCheckGlobal.interacoes)) {
          crossCheckGlobal.interacoes.forEach(function (it) {
            interacoesDetectadas.push({
              drogaA: it.drogaA,
              drogaB: it.drogaB,
              grau: it.grau || 'GRAVE',
              grauNormalizado: it.grauNormalizado || 'GRAVE',
              efeito: it.efeito,
              recomendacao: it.recomendacao
            });
          });
        }
      } catch (eCross) {}
    }

    // Prioridade 2: Fallback determinístico para pares críticos
    if (interacoesDetectadas.length === 0 && farmacos.length >= 2) {
      for (var f1 = 0; f1 < farmacos.length; f1++) {
        for (var f2 = f1 + 1; f2 < farmacos.length; f2++) {
          var d1 = farmacos[f1];
          var d2 = farmacos[f2];
          for (var ic = 0; ic < INTERACOES_CRITICAS_PADRAO.length; ic++) {
            var regInter = INTERACOES_CRITICAS_PADRAO[ic];
            if ((d1.indexOf(regInter.drogaA) !== -1 && d2.indexOf(regInter.drogaB) !== -1) ||
                (d1.indexOf(regInter.drogaB) !== -1 && d2.indexOf(regInter.drogaA) !== -1)) {
              interacoesDetectadas.push(regInter);
            }
          }
        }
      }
    }

    // C. Detecção de Fármacos com Falha de Ajuste Renal
    if (clcr !== null && clcr <= 50) {
      // Checar se o Guia HSL identificou ajustes no cross-check
      if (crossCheckGlobal && Array.isArray(crossCheckGlobal.ajustesRenais) && crossCheckGlobal.ajustesRenais.length > 0) {
        crossCheckGlobal.ajustesRenais.forEach(function (aj) {
          ajustesRenaisExigidos.push({
            farmaco: aj.farmaco || aj.nomeOficial,
            nomeOficial: aj.nomeOficial || aj.farmaco,
            clcrPaciente: clcr,
            instrucaoAjuste: aj.ajuste
          });
        });
      } else {
        // Fallback determinístico de ajustes renais
        farmacos.forEach(function (f) {
          AJUSTES_RENAIS_PADRAO.forEach(function (regRenal) {
            if (f.indexOf(regRenal.termo) !== -1 && clcr <= regRenal.limiarClCr) {
              ajustesRenaisExigidos.push({
                farmaco: f.toUpperCase(),
                nomeOficial: regRenal.nomeOficial,
                clcrPaciente: clcr,
                instrucaoAjuste: regRenal.ajuste
              });
            }
          });
        });
      }
    }

    // D. Validação de RBAC / Supervisão de Prescritor
    if (prescritor.perfil === 'ACADEMICO') {
      retencaoRbac = {
        motivo: 'Acadêmico de medicina sem registro no CRM. Liberação definitiva exige co-assinatura médica de preceptor ou residente.',
        nivelMinimo: 'RESIDENTE'
      };
    }

    // E. Determinação do Desfecho Clínico
    var temContraindicado = interacoesDetectadas.some(function (i) {
      return (i.grauNormalizado === 'CONTRAINDICADO' || /contraindic/i.test(i.grau));
    });
    var temGrave = interacoesDetectadas.some(function (i) {
      return (i.grauNormalizado === 'GRAVE' || /grave/i.test(i.grau));
    });
    var temModerado = interacoesDetectadas.some(function (i) {
      return (i.grauNormalizado === 'MODERADO' || /moderado/i.test(i.grau));
    });

    var categoriaDesfecho = CATEGORIAS_DESFECHO.LIBERADA_SEGURA;
    var escoreRisco = 0;
    var gargalos = [];
    var intervencoes = [];

    if (bloqueiosSentinela.length > 0) {
      categoriaDesfecho = CATEGORIAS_DESFECHO.REJEITADA_BLOQUEIO_FATAL;
      escoreRisco = 100;
      bloqueiosSentinela.forEach(function (b) {
        gargalos.push('BLOQUEIO FATAL: ' + b.fármaco + ' (' + b.motivo + ')');
        intervencoes.push('AÇÃO IMEDIATA: ' + b.acaoCorretiva);
      });
    } else if (temContraindicado || temGrave) {
      categoriaDesfecho = CATEGORIAS_DESFECHO.REJEITADA_INTERACAO_GRAVE;
      escoreRisco = temContraindicado ? 85 : 70;
      interacoesDetectadas.forEach(function (it) {
        if (/contraindic|grave/i.test(it.grauNormalizado || it.grau)) {
          gargalos.push('INTERAÇÃO ' + it.grau.toUpperCase() + ': ' + it.drogaA + ' ⚡ ' + it.drogaB);
          intervencoes.push(it.recomendacao || it.efeito);
        }
      });
    } else if (ajustesRenaisExigidos.length > 0) {
      categoriaDesfecho = CATEGORIAS_DESFECHO.INTERVENCAO_AJUSTE_RENAL;
      escoreRisco = 60;
      ajustesRenaisExigidos.forEach(function (aj) {
        gargalos.push('OMISSÃO DE AJUSTE RENAL: ' + aj.nomeOficial + ' em paciente com ClCr ' + aj.clcrPaciente + ' mL/min');
        intervencoes.push(aj.instrucaoAjuste);
      });
    } else if (retencaoRbac) {
      categoriaDesfecho = CATEGORIAS_DESFECHO.RETIDA_SUPERVISAO;
      escoreRisco = 40;
      gargalos.push('PERFIL PRESCRITOR: ' + retencaoRbac.motivo);
      intervencoes.push('Encaminhar para chancelamento presencial por preceptor.');
    } else if (temModerado) {
      categoriaDesfecho = CATEGORIAS_DESFECHO.LIBERADA_COM_ALERTA;
      escoreRisco = 25;
      interacoesDetectadas.forEach(function (it) {
        gargalos.push('ALERTA MODERADO: ' + it.drogaA + ' + ' + it.drogaB);
        if (it.recomendacao) intervencoes.push(it.recomendacao);
      });
    }

    var eventoAuditado = {
      id: id,
      timestamp: dataIso,
      paciente: paciente,
      setor: setor,
      prescritor: prescritor,
      farmacos: farmacos,
      clcrEstimado: clcr,
      desfecho: categoriaDesfecho.id,
      desfechoRotulo: categoriaDesfecho.rotulo,
      icone: categoriaDesfecho.icone,
      rejeitada: categoriaDesfecho.bloqueiaDispensacao,
      escoreRisco: escoreRisco,
      bloqueiosSentinela: bloqueiosSentinela,
      interacoes: interacoesDetectadas,
      ajustesRenais: ajustesRenaisExigidos,
      retencaoRbac: retencaoRbac,
      gargalosDetectados: gargalos,
      intervencoesRecomendadas: intervencoes,
      tempoAnaliseMs: Date.now() - t0
    };

    // Armazena no buffer circular em memória
    _registrarNoBuffer(eventoAuditado);

    return eventoAuditado;
  }

  function _registrarNoBuffer(evento) {
    _bufferAuditoria.push(evento);
    if (_bufferAuditoria.length > CAPACIDADE_MAXIMA_BUFFER) {
      _bufferAuditoria.shift();
    }
  }

  /**
   * Processa uma lista de prescrições em lote (batch processing off-line).
   * @param {Array<Object>} lotePrescricoes
   * @returns {Object} Relatório analítico do lote com resultados individuais
   */
  function processarLotePrescricoes(lotePrescricoes) {
    if (!Array.isArray(lotePrescricoes)) {
      throw new Error('processarLotePrescricoes requer um Array de prescrições.');
    }
    var t0 = Date.now();
    var eventos = [];
    for (var i = 0; i < lotePrescricoes.length; i++) {
      var ev = auditarPrescricao(lotePrescricoes[i]);
      eventos.push(ev);
    }
    var dashboard = gerarDashboardKaizen({ eventosEspecificos: eventos });
    return {
      sucesso: true,
      totalProcessadas: eventos.length,
      tempoTotalMs: Date.now() - t0,
      eventos: eventos,
      dashboard: dashboard
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. MOTOR DE SUMARIZAÇÃO ANALÍTICA & DASHBOARD KAIZEN CLÍNICO
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Gera o Dashboard Analítico de Kaizen Clínico consolidado com métricas,
   * rankings de gargalos, distribuição por setor e plano de ação gerencial.
   * @param {Object} opcoes Filtros opcionais (setor, perfil, periodoHoras, apenasRejeitadas)
   * @returns {Object} Dashboard completo
   */
  function gerarDashboardKaizen(opcoes) {
    opcoes = opcoes || {};
    var baseEventos = Array.isArray(opcoes.eventosEspecificos) ? opcoes.eventosEspecificos : _bufferAuditoria;

    // Aplicação de filtros
    var eventosFiltrados = baseEventos.filter(function (ev) {
      if (opcoes.setor && ev.setor !== normalizarSetor(opcoes.setor)) return false;
      if (opcoes.perfil && ev.prescritor && ev.prescritor.perfil !== normalizarPerfil(opcoes.perfil)) return false;
      if (opcoes.apenasRejeitadas && !ev.rejeitada) return false;
      if (opcoes.periodoHoras && typeof opcoes.periodoHoras === 'number') {
        var diffHoras = (Date.now() - new Date(ev.timestamp).getTime()) / (1000 * 60 * 60);
        if (diffHoras > opcoes.periodoHoras) return false;
      }
      return true;
    });

    var totalPrescricoes = eventosFiltrados.length;
    var totalRejeitadas = 0;
    var totalEventosSentinela = 0;
    var totalInteracoesContraindicadas = 0;
    var totalInteracoesGraves = 0;
    var totalIntervencoesRenais = 0;
    var totalRetencoesRbac = 0;
    var totalLiberadasComAlerta = 0;
    var totalLiberadasSeguras = 0;

    var mapaFarmacos = {};
    var mapaInteracoes = {};
    var mapaSetores = {};
    var mapaPerfis = {};

    SETORES_VALIDOS.forEach(function (s) {
      mapaSetores[s] = { total: 0, rejeitadas: 0, sentinelas: 0, interacoes: 0, ajustesRenais: 0 };
    });

    PERFIS_VALIDOS.forEach(function (p) {
      mapaPerfis[p] = { total: 0, rejeitadas: 0, retencoes: 0 };
    });

    // Penalidades acumuladas para cálculo do Índice de Maturidade
    var penalidadeAcumulada = 0;

    eventosFiltrados.forEach(function (ev) {
      if (ev.rejeitada) totalRejeitadas++;

      // Setores
      var set = ev.setor || 'OUTROS';
      if (!mapaSetores[set]) mapaSetores[set] = { total: 0, rejeitadas: 0, sentinelas: 0, interacoes: 0, ajustesRenais: 0 };
      mapaSetores[set].total++;
      if (ev.rejeitada) mapaSetores[set].rejeitadas++;

      // Perfis
      var perf = (ev.prescritor && ev.prescritor.perfil) || 'ASSISTENTE';
      if (!mapaPerfis[perf]) mapaPerfis[perf] = { total: 0, rejeitadas: 0, retencoes: 0 };
      mapaPerfis[perf].total++;
      if (ev.rejeitada) mapaPerfis[perf].rejeitadas++;

      // Contabilização de Desfechos
      if (ev.desfecho === 'REJEITADA_BLOQUEIO_FATAL') {
        totalEventosSentinela++;
        mapaSetores[set].sentinelas++;
        penalidadeAcumulada += CATEGORIAS_DESFECHO.REJEITADA_BLOQUEIO_FATAL.penalidadeMaturidade;
      } else if (ev.desfecho === 'REJEITADA_INTERACAO_GRAVE') {
        penalidadeAcumulada += CATEGORIAS_DESFECHO.REJEITADA_INTERACAO_GRAVE.penalidadeMaturidade;
      } else if (ev.desfecho === 'INTERVENCAO_AJUSTE_RENAL') {
        totalIntervencoesRenais++;
        mapaSetores[set].ajustesRenais++;
        penalidadeAcumulada += CATEGORIAS_DESFECHO.INTERVENCAO_AJUSTE_RENAL.penalidadeMaturidade;
      } else if (ev.desfecho === 'RETIDA_SUPERVISAO') {
        totalRetencoesRbac++;
        mapaPerfis[perf].retencoes++;
        penalidadeAcumulada += CATEGORIAS_DESFECHO.RETIDA_SUPERVISAO.penalidadeMaturidade;
      } else if (ev.desfecho === 'LIBERADA_COM_ALERTA') {
        totalLiberadasComAlerta++;
        penalidadeAcumulada += CATEGORIAS_DESFECHO.LIBERADA_COM_ALERTA.penalidadeMaturidade;
      } else if (ev.desfecho === 'LIBERADA_SEGURA') {
        totalLiberadasSeguras++;
      }

      // Detalhamento de Interações
      if (Array.isArray(ev.interacoes)) {
        ev.interacoes.forEach(function (it) {
          mapaSetores[set].interacoes++;
          var ehContra = (it.grauNormalizado === 'CONTRAINDICADO' || /contraindic/i.test(it.grau));
          if (ehContra) totalInteracoesContraindicadas++;
          else totalInteracoesGraves++;

          var dA = String(it.drogaA || '').toUpperCase();
          var dB = String(it.drogaB || '').toUpperCase();
          var parKey = [dA, dB].sort().join(' + ');

          if (!mapaInteracoes[parKey]) {
            mapaInteracoes[parKey] = {
              par: parKey,
              gravidade: ehContra ? 'CONTRAINDICADO' : 'GRAVE',
              total: 0,
              efeito: it.efeito || '',
              recomendacao: it.recomendacao || ''
            };
          }
          mapaInteracoes[parKey].total++;
        });
      }

      // Fármacos Incidentes
      if (Array.isArray(ev.farmacos)) {
        ev.farmacos.forEach(function (f) {
          var fUpper = String(f).toUpperCase();
          if (!mapaFarmacos[fUpper]) {
            mapaFarmacos[fUpper] = {
              farmaco: fUpper,
              totalPrescricoes: 0,
              rejeicoes: 0,
              bloqueiosFatais: 0,
              interacoes: 0,
              ajustesRenais: 0
            };
          }
          mapaFarmacos[fUpper].totalPrescricoes++;
          if (ev.rejeitada) mapaFarmacos[fUpper].rejeicoes++;
          if (ev.desfecho === 'REJEITADA_BLOQUEIO_FATAL') mapaFarmacos[fUpper].bloqueiosFatais++;
          if (ev.interacoes && ev.interacoes.length > 0) mapaFarmacos[fUpper].interacoes++;
          if (ev.ajustesRenais && ev.ajustesRenais.length > 0) mapaFarmacos[fUpper].ajustesRenais++;
        });
      }
    });

    // Métricas Percentuais
    var taxaRejeicaoPct = totalPrescricoes > 0 ? ((totalRejeitadas / totalPrescricoes) * 100) : 0;
    var taxaSegurancaGlobalPct = totalPrescricoes > 0 ? (((totalPrescricoes - totalRejeitadas) / totalPrescricoes) * 100) : 100;

    // Cálculo do Índice de Maturidade Kaizen de Segurança (0 a 100)
    var notaBase = 100;
    if (totalPrescricoes > 0) {
      var penalidadeMediaPorPrescricao = (penalidadeAcumulada / totalPrescricoes);
      // Fator de escala: cada 1 ponto de penalidade média reduz proporcionalmente a maturidade
      notaBase = Math.max(0, Math.min(100, Math.round(100 - (penalidadeMediaPorPrescricao * 10))));
      if (totalEventosSentinela > 0) {
        notaBase = Math.min(notaBase, 50); // Presença de evento sentinela impede nota de excelência
      }
    }

    var nivelMaturidade = 'NÍVEL 5 - EXCELÊNCIA / KAIZEN OTIMIZADO';
    var descMaturidade = 'Cultura de segurança do paciente proativa, ausência de eventos sentinela e mínima taxa de interações críticas.';
    if (notaBase < 40) {
      nivelMaturidade = 'NÍVEL 1 - ALERTA VERMELHO (Risco Elevado de Dano Iatrogênico)';
      descMaturidade = 'Presença de bloqueios letais ou elevado volume de contraindicações graves ignoradas. Intervenção imediata requerida.';
    } else if (notaBase < 60) {
      nivelMaturidade = 'NÍVEL 2 - CRÍTICO (Vulnerabilidades Sistêmicas)';
      descMaturidade = 'Frequência inaceitável de interações farmacológicas graves e omissões recorrentes de ajuste de função renal.';
    } else if (notaBase < 75) {
      nivelMaturidade = 'NÍVEL 3 - MODERADO (Gargalos de Segurança Detectados)';
      descMaturidade = 'Processos clínicos operantes, porém com gargalos relevantes em setores específicos (ex: UTI/Emergência).';
    } else if (notaBase < 90) {
      nivelMaturidade = 'NÍVEL 4 - AVANÇADO (Baixo Risco Sistêmico)';
      descMaturidade = 'Alta conformidade de prescrição, barreiras de segurança ativas e rápida adesão às intervenções farmacêuticas.';
    }

    // Top Fármacos Incidentes (ordenados por rejeições e alertas)
    var topFarmacos = Object.keys(mapaFarmacos)
      .map(function (k) { return mapaFarmacos[k]; })
      .filter(function (it) { return (it.rejeicoes > 0 || it.interacoes > 0 || it.ajustesRenais > 0); })
      .sort(function (a, b) {
        var scoreA = (a.bloqueiosFatais * 10) + (a.rejeicoes * 4) + (a.ajustesRenais * 2) + a.interacoes;
        var scoreB = (b.bloqueiosFatais * 10) + (b.rejeicoes * 4) + (b.ajustesRenais * 2) + b.interacoes;
        return scoreB - scoreA;
      })
      .slice(0, 5);

    // Top Interações Recorrentes
    var topInteracoes = Object.keys(mapaInteracoes)
      .map(function (k) { return mapaInteracoes[k]; })
      .sort(function (a, b) { return b.total - a.total; })
      .slice(0, 5);

    // Setor Mais Crítico
    var setorMaisCritico = 'NENHUM';
    var maiorTaxaRejeicaoSetor = -1;
    Object.keys(mapaSetores).forEach(function (s) {
      var dadosS = mapaSetores[s];
      if (dadosS.total >= 1) {
        var taxaS = (dadosS.rejeitadas / dadosS.total) * 100;
        if (taxaS > maiorTaxaRejeicaoSetor) {
          maiorTaxaRejeicaoSetor = taxaS;
          setorMaisCritico = s;
        }
      }
    });

    // Plano de Ação Kaizen Clínico Automatizado
    var planoDeAcao = [];
    if (totalEventosSentinela > 0) {
      planoDeAcao.push({
        prioridade: 'URGÊNCIA MÁXIMA',
        alvo: 'Farmácia Central / Enfermagem',
        acao: 'Retirar ampolas de KCl 19,1% concentrado das enfermarias e emergência; dispensar exclusivamente soluções pré-diluídas de fábrica.'
      });
    }
    if (totalInteracoesContraindicadas > 0) {
      planoDeAcao.push({
        prioridade: 'ALTA',
        alvo: 'Corpo Clínico / Prescrição Eletrônica',
        acao: 'Implementar barreira de interrupção (hard stop) no prontuário para combinações com risco de morte (ex: Amiodarona + Fluconazol).'
      });
    }
    if (totalIntervencoesRenais > 0) {
      planoDeAcao.push({
        prioridade: 'MÉDIA',
        alvo: 'Farmácia Clínica',
        acao: 'Triagem mandatória diária de pacientes com ClCr < 50 mL/min com foco em Enoxaparina, Meropenem e Vancomicina.'
      });
    }
    if (totalRetencoesRbac > 0) {
      planoDeAcao.push({
        prioridade: 'MÉDIA',
        alvo: 'Comissão de Ensino / Preceptoria',
        acao: 'Instituir rodada de validação de prescrições de internos antes do horário de corte da farmácia hospitalar.'
      });
    }
    if (planoDeAcao.length === 0) {
      planoDeAcao.push({
        prioridade: 'MANUTENÇÃO',
        alvo: 'Equipe Multiprofissional',
        acao: 'Manter rondas de segurança e auditorias periódicas contínuas (Ciclo Kaizen).'
      });
    }

    return {
      sucesso: true,
      timestampGeracao: new Date().toISOString(),
      metricasGerais: {
        totalPrescricoes: totalPrescricoes,
        totalRejeitadas: totalRejeitadas,
        taxaRejeicaoPct: parseFloat(taxaRejeicaoPct.toFixed(1)),
        taxaSegurancaGlobalPct: parseFloat(taxaSegurancaGlobalPct.toFixed(1)),
        totalEventosSentinela: totalEventosSentinela,
        totalInteracoesContraindicadas: totalInteracoesContraindicadas,
        totalInteracoesGraves: totalInteracoesGraves,
        totalIntervencoesRenais: totalIntervencoesRenais,
        totalRetencoesRbac: totalRetencoesRbac,
        totalLiberadasComAlerta: totalLiberadasComAlerta,
        totalLiberadasSeguras: totalLiberadasSeguras
      },
      maturidadeSeguranca: {
        indiceKaizen: notaBase,
        nivel: nivelMaturidade,
        descricao: descMaturidade
      },
      gargalosClinicos: {
        topFarmacosIncidentes: topFarmacos,
        topInteracoesCriticas: topInteracoes,
        setorMaisCritico: setorMaisCritico,
        distribuicaoSetores: mapaSetores,
        distribuicaoPerfis: mapaPerfis
      },
      planoDeAcaoKaizen: planoDeAcao
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. RENDERIZAÇÃO FORMATADA (ASCII / MARKDOWN) PARA TELEGRAM & COCKPIT
  // ───────────────────────────────────────────────────────────────────────────

  function gerarBarraProgressoAscii(percentual, tamanho) {
    tamanho = tamanho || 10;
    var pct = Math.max(0, Math.min(100, Number(percentual || 0)));
    var preenchido = Math.round((pct / 100) * tamanho);
    var vazio = tamanho - preenchido;
    var barra = '';
    for (var i = 0; i < preenchido; i++) barra += '█';
    for (var j = 0; j < vazio; j++) barra += '░';
    return '[' + barra + '] ' + pct.toFixed(1) + '%';
  }

  /**
   * Formata os dados consolidados do dashboard em texto limpo com gráficos ASCII.
   * @param {Object} dash Dados gerados por gerarDashboardKaizen
   * @returns {string} Relatório formatado para visualização
   */
  function formatarDashboardEmTexto(dash) {
    if (!dash || !dash.metricasGerais) return 'Nenhum dado analítico disponível.';
    var m = dash.metricasGerais;
    var mat = dash.maturidadeSeguranca;
    var g = dash.gargalosClinicos;

    var linhas = [];
    linhas.push('════════════════════════════════════════════════════════════════');
    linhas.push('📊 *DASHBOARD DE KAIZEN CLÍNICO · AUDITORIA DE SEGURANÇA*');
    linhas.push('════════════════════════════════════════════════════════════════');
    linhas.push('');
    linhas.push('🛡️ *ÍNDICE DE MATURIDADE DE SEGURANÇA DO PACIENTE:*');
    linhas.push('   *Nota Kaizen:* ' + mat.indiceKaizen + '/100 ' + gerarBarraProgressoAscii(mat.indiceKaizen, 12));
    linhas.push('   *Classificação:* ' + mat.nivel);
    linhas.push('   • _' + mat.descricao + '_');
    linhas.push('');
    linhas.push('► *MÉTRICAS GLOBAIS DE PRESCRIÇÃO:*');
    linhas.push('  • Total de Prescrições Auditadas: ' + m.totalPrescricoes);
    linhas.push('  • Prescrições Rejeitadas/Retidas: ' + m.totalRejeitadas + ' ' + gerarBarraProgressoAscii(m.taxaRejeicaoPct, 8));
    linhas.push('  • Conformidade de Segurança: ' + m.taxaSegurancaGlobalPct + '%');
    linhas.push('  • Eventos Sentinela (Bloqueio Fatal): ' + (m.totalEventosSentinela > 0 ? ('🛑 ' + m.totalEventosSentinela) : '0 (Zero) ✅'));
    linhas.push('  • Interações Contraindicadas: ' + m.totalInteracoesContraindicadas);
    linhas.push('  • Interações Graves: ' + m.totalInteracoesGraves);
    linhas.push('  • Omissões de Ajuste Renal: ' + m.totalIntervencoesRenais);
    linhas.push('  • Retenções RBAC (Supervisão): ' + m.totalRetencoesRbac);
    linhas.push('');

    if (g.topFarmacosIncidentes && g.topFarmacosIncidentes.length > 0) {
      linhas.push('⚠️ *TOP FÁRMACOS COM GARGALOS DE SEGURANÇA:*');
      g.topFarmacosIncidentes.forEach(function (f, idx) {
        var detalhes = [];
        if (f.bloqueiosFatais > 0) detalhes.push(f.bloqueiosFatais + ' sentinela(s)');
        if (f.rejeicoes > 0) detalhes.push(f.rejeicoes + ' rejeição(ões)');
        if (f.ajustesRenais > 0) detalhes.push(f.ajustesRenais + ' ajuste(s) renal(is)');
        if (f.interacoes > 0) detalhes.push(f.interacoes + ' interação(ões)');
        linhas.push('  ' + (idx + 1) + '. `' + f.farmaco + '` (' + detalhes.join(', ') + ')');
      });
      linhas.push('');
    }

    if (g.topInteracoesCriticas && g.topInteracoesCriticas.length > 0) {
      linhas.push('⚡ *TOP INTERAÇÕES FARMACOLÓGICAS RECORRENTES:*');
      g.topInteracoesCriticas.forEach(function (it, idx) {
        var icone = it.gravidade === 'CONTRAINDICADO' ? '🛑' : '🔴';
        linhas.push('  ' + (idx + 1) + '. ' + icone + ' *' + it.par + '* (' + it.total + ' ocorrência(s))');
        if (it.efeito) linhas.push('     ↳ _' + it.efeito + '_');
      });
      linhas.push('');
    }

    linhas.push('🏥 *DISTRIBUIÇÃO POR SETOR HOSPITALAR:*');
    Object.keys(g.distribuicaoSetores || {}).forEach(function (s) {
      var ds = g.distribuicaoSetores[s];
      if (ds.total > 0) {
        var taxaS = ((ds.rejeitadas / ds.total) * 100).toFixed(0);
        linhas.push('  • *' + s + ':* ' + ds.total + ' prescrições | ' + ds.rejeitadas + ' rejeições (' + taxaS + '%)' + (ds.sentinelas > 0 ? ' 🛑 Sentinela!' : ''));
      }
    });
    linhas.push('');

    if (dash.planoDeAcaoKaizen && dash.planoDeAcaoKaizen.length > 0) {
      linhas.push('🚀 *PLANO DE AÇÃO KAIZEN (INTERVENÇÕES PRIORITÁRIAS):*');
      dash.planoDeAcaoKaizen.forEach(function (pa, idx) {
        linhas.push('  [' + pa.prioridade + '] ' + pa.alvo + ':');
        linhas.push('  ↳ ' + pa.acao);
      });
      linhas.push('');
    }

    linhas.push('════════════════════════════════════════════════════════════════');
    linhas.push('⏱️ _Painel analítico gerado off-line em RAM pelo Ultra Rotina._');

    return linhas.join('\n');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 7. FUNÇÕES DE SUPORTE, MANUTENÇÃO E EXPORTAÇÃO
  // ───────────────────────────────────────────────────────────────────────────

  function limparHistorico() {
    _bufferAuditoria = [];
    return { sucesso: true, mensagem: 'Histórico de auditoria em memória reinicializado.' };
  }

  function obterHistorico(limite, apenasRejeitadas) {
    var lim = Math.min(200, Number(limite || 20));
    var res = _bufferAuditoria;
    if (apenasRejeitadas) {
      res = res.filter(function (e) { return e.rejeitada; });
    }
    return res.slice(-lim).reverse();
  }

  function exportarDataset() {
    return {
      versao: '1.0',
      totalRegistros: _bufferAuditoria.length,
      exportadoEm: new Date().toISOString(),
      eventos: _bufferAuditoria.slice()
    };
  }

  function importarDataset(dataset) {
    var lista = Array.isArray(dataset) ? dataset : (dataset && Array.isArray(dataset.eventos) ? dataset.eventos : []);
    var importados = 0;
    lista.forEach(function (ev) {
      if (ev && typeof ev === 'object') {
        _registrarNoBuffer(ev);
        importados++;
      }
    });
    return { sucesso: true, totalImportados: importados, totalAtual: _bufferAuditoria.length };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 8. INTERFACE PÚBLICA DO SERVIÇO
  // ───────────────────────────────────────────────────────────────────────────

  return {
    auditarPrescricao: auditarPrescricao,
    processarLotePrescricoes: processarLotePrescricoes,
    gerarDashboardKaizen: gerarDashboardKaizen,
    formatarDashboardEmTexto: formatarDashboardEmTexto,
    limparHistorico: limparHistorico,
    obterHistorico: obterHistorico,
    exportarDataset: exportarDataset,
    importarDataset: importarDataset,
    CATEGORIAS_DESFECHO: CATEGORIAS_DESFECHO
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuditoriaKaizenClinicoService;
}
