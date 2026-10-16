'use strict';

/**
 * @file src/domain/time_blocking_optimizer_domain.js
 * @description Domínio Puro de Otimização de Grade Horária e Produtividade Médica.
 * Implementa heurística determinística de remanejamento dinâmico com degradação graciosa
 * e proteção estrita da janela de sono (22:30 - 06:00).
 * Zero dependências externas. Compatível com Node.js CommonJS.
 */

class TimeBlockingOptimizerDomain {
  constructor() {
    this.JANELA_INICIO_MIN = 360; // 06:00
    this.JANELA_FIM_MIN = 1350;   // 22:30 (Limite inegociável de proteção do sono)

    // Catálogo Canônico de Atividades Médicas e Regras de Degradação
    this.CATALOGO_ATIVIDADES = {
      PLATAO: {
        tipo: 'PLATAO',
        tituloPadrao: 'Plantão / Rodízio Hospitalar',
        prioridade: 100, // Inegociável / Rígido
        duracaoIdeal: 360,
        duracaoMinima: 360,
        rigido: true,
        essencial: true
      },
      DESCANSO_REFEICAO: {
        tipo: 'DESCANSO_REFEICAO',
        tituloPadrao: 'Refeição & Recuperação Cognitiva',
        prioridade: 90, // Proteção fisiológica obrigatória
        duracaoIdeal: 45,
        duracaoMinima: 25,
        rigido: false,
        essencial: true
      },
      ANKI: {
        tipo: 'ANKI',
        tituloPadrao: 'Anki (Revisão Espaçada Ativa)',
        prioridade: 85, // Alta retenção em micro-bloco
        duracaoIdeal: 30,
        duracaoMinima: 20,
        rigido: false,
        essencial: false
      },
      MEDQUEST: {
        tipo: 'MEDQUEST',
        tituloPadrao: 'MedQuest (Bloco de Questões de Residência)',
        prioridade: 80, // Estudo ativo profundo
        duracaoIdeal: 60,
        duracaoMinima: 30,
        rigido: false,
        essencial: false
      },
      TREINO: {
        tipo: 'TREINO',
        tituloPadrao: 'Treino de Força / Saúde Física',
        prioridade: 70, // Proteção de burnout
        duracaoIdeal: 50,
        duracaoMinima: 30,
        rigido: false,
        essencial: false
      },
      DESLOQUE: {
        tipo: 'DESLOQUE',
        tituloPadrao: 'Translado / Deslocamento',
        prioridade: 95,
        duracaoIdeal: 30,
        duracaoMinima: 20,
        rigido: false,
        essencial: false
      }
    };

    // Template Canônico Diário do Médico Residente / Interno
    this.TEMPLATE_ROTINA_PADRAO = [
      { id: 'BLK_ANKI_MANHA', tipo: 'ANKI', titulo: 'Anki Matinal (Consolidação)', duracaoIdeal: 30, duracaoMinima: 20 },
      { id: 'BLK_PLATAO_1', tipo: 'PLATAO', titulo: 'Plantão / Rodízio Clínico', inicioFixo: '07:00', fimFixo: '13:00', rigido: true },
      { id: 'BLK_ALMOCO', tipo: 'DESCANSO_REFEICAO', titulo: 'Almoço & Descompressão Pós-Plantão', duracaoIdeal: 45, duracaoMinima: 25, essencial: true },
      { id: 'BLK_DESLOQUE_CASA', tipo: 'DESLOQUE', titulo: 'Deslocamento Hospital -> Base', duracaoIdeal: 30, duracaoMinima: 20 },
      { id: 'BLK_MEDQUEST_1', tipo: 'MEDQUEST', titulo: 'MedQuest Bloco 01 (Clínica/Cirurgia)', duracaoIdeal: 60, duracaoMinima: 30 },
      { id: 'BLK_TREINO', tipo: 'TREINO', titulo: 'Treino de Força & Condicionamento', duracaoIdeal: 55, duracaoMinima: 30 },
      { id: 'BLK_JANTAR', tipo: 'DESCANSO_REFEICAO', titulo: 'Jantar & Pausa Cognitiva', duracaoIdeal: 40, duracaoMinima: 20, essencial: true },
      { id: 'BLK_MEDQUEST_2', tipo: 'MEDQUEST', titulo: 'MedQuest Bloco 02 (Pediatria/GO/Prev)', duracaoIdeal: 60, duracaoMinima: 30 },
      { id: 'BLK_ANKI_NOITE', tipo: 'ANKI', titulo: 'Anki Noturno (Fechamento de Meta)', duracaoIdeal: 25, duracaoMinima: 15 }
    ];
  }

  /**
   * Converte string 'HH:MM' ou número para minutos totais desde 00:00.
   * @param {string|number} valor
   * @returns {number}
   */
  _paraMinutos(valor) {
    if (typeof valor === 'number' && !Number.isNaN(valor)) {
      return Math.max(0, Math.min(1440, Math.floor(valor)));
    }
    if (typeof valor === 'string' && valor.includes(':')) {
      const partes = valor.trim().split(':');
      const horas = parseInt(partes[0], 10) || 0;
      const minutos = parseInt(partes[1], 10) || 0;
      return Math.max(0, Math.min(1440, horas * 60 + minutos));
    }
    return this.JANELA_INICIO_MIN;
  }

  /**
   * Converte minutos do dia para string formatada 'HH:MM'.
   * @param {number} totalMinutos
   * @returns {string}
   */
  _paraHorarioString(totalMinutos) {
    const minClamped = Math.max(0, Math.min(1440, Math.round(totalMinutos)));
    const h = Math.floor(minClamped / 60);
    const m = minClamped % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /**
   * Mescla e ordena intervalos fixos ocupados na linha do tempo.
   * @param {Array<{inicioMin: number, fimMin: number, bloco: Object}>} intervalosFixos
   * @returns {Array<{inicioMin: number, fimMin: number, bloco: Object}>}
   */
  _normalizarCompromissosFixos(intervalosFixos) {
    return [...intervalosFixos]
      .filter((i) => i.fimMin > i.inicioMin)
      .sort((a, b) => a.inicioMin - b.inicioMin);
  }

  /**
   * Calcula os espaços livres (janelas disponíveis) entre `cursorMin` e `JANELA_FIM_MIN`
   * descontando blocos rígidos/compromissos fixos.
   */
  _calcularJanelasLivres(cursorMin, blocosFixosOrdenados) {
    const janelas = [];
    let ponteiro = Math.max(this.JANELA_INICIO_MIN, cursorMin);

    for (const fixo of blocosFixosOrdenados) {
      if (fixo.fimMin <= ponteiro) {
        continue;
      }
      if (fixo.inicioMin > ponteiro) {
        const fimJanela = Math.min(fixo.inicioMin, this.JANELA_FIM_MIN);
        if (fimJanela > ponteiro) {
          janelas.push({ inicioMin: ponteiro, fimMin: fimJanela, duracao: fimJanela - ponteiro });
        }
      }
      ponteiro = Math.max(ponteiro, fixo.fimMin);
      if (ponteiro >= this.JANELA_FIM_MIN) {
        break;
      }
    }

    if (ponteiro < this.JANELA_FIM_MIN) {
      janelas.push({
        inicioMin: ponteiro,
        fimMin: this.JANELA_FIM_MIN,
        duracao: this.JANELA_FIM_MIN - ponteiro
      });
    }

    return janelas;
  }

  /**
   * Otimiza a grade horária do médico com base no estado atual, atrasos e compromissos fixos.
   *
   * @param {Object} parametros
   * @param {string|number} [parametros.horaAtual='06:00']
   * @param {Array<string>} [parametros.blocosConcluidos=[]]
   * @param {number} [parametros.atrasoMinutos=0]
   * @param {Array<{id?: string, inicio: string, fim: string, titulo: string, tipo?: string}>} [parametros.compromissosFixos=[]]
   * @returns {Object} Resultado determinístico da otimização
   */
  otimizarGrade(parametros = {}) {
    const {
      horaAtual = '06:00',
      blocosConcluidos = [],
      atrasoMinutos = 0,
      compromissosFixos = []
    } = parametros;

    const setConcluidos = new Set(Array.isArray(blocosConcluidos) ? blocosConcluidos : []);
    const atrasoSafe = Math.max(0, Number(atrasoMinutos) || 0);
    const minHoraAtual = this._paraMinutos(horaAtual);
    const cursorEfetivo = Math.max(this.JANELA_INICIO_MIN, minHoraAtual + atrasoSafe);

    const alertas = [];
    if (atrasoSafe > 0) {
      alertas.push(`Atraso operacional de ${atrasoSafe} min aplicado ao cursor de planejamento.`);
    }
    if (cursorEfetivo >= this.JANELA_FIM_MIN) {
      alertas.push('Horário limite de sono (22:30) atingido. Todos os blocos pendentes foram suspensos para proteção fisiológica.');
    }

    // 1. Preparar blocos fixos (do template + injetados via parâmetro)
    const blocosFixos = [];
    const blocosFlexiveisPendentes = [];
    const blocosHistoricoConcluidos = [];

    // Processar compromissos fixos externos injetados
    if (Array.isArray(compromissosFixos)) {
      compromissosFixos.forEach((comp, idx) => {
        const ini = this._paraMinutos(comp.inicio);
        const fim = Math.min(this.JANELA_FIM_MIN, this._paraMinutos(comp.fim));
        if (fim > ini) {
          const idComp = comp.id || `FIXO_EXT_${idx + 1}`;
          const concluido = setConcluidos.has(idComp) || fim <= minHoraAtual;
          const emAndamento = !concluido && ini <= minHoraAtual && fim > minHoraAtual;

          blocosFixos.push({
            inicioMin: ini,
            fimMin: fim,
            bloco: {
              id: idComp,
              tipo: comp.tipo || 'PLATAO',
              titulo: comp.titulo || 'Compromisso Fixo Hospitalar',
              inicio: this._paraHorarioString(ini),
              fim: this._paraHorarioString(fim),
              inicioMin: ini,
              fimMin: fim,
              duracaoPlanejada: fim - ini,
              duracaoAlocada: fim - ini,
              status: concluido ? 'CONCLUIDO' : (emAndamento ? 'EM_ANDAMENTO' : 'PENDENTE'),
              rigido: true,
              comprimido: false
            }
          });
        }
      });
    }

    // Processar Template Padrão
    for (const item of this.TEMPLATE_ROTINA_PADRAO) {
      const spec = this.CATALOGO_ATIVIDADES[item.tipo] || this.CATALOGO_ATIVIDADES.MEDQUEST;
      const jaConcluido = setConcluidos.has(item.id);

      if (item.rigido && item.inicioFixo && item.fimFixo) {
        // Se já houver compromisso externo sobreposto ao plantão padrão, prioriza o externo
        const iniPadrao = this._paraMinutos(item.inicioFixo);
        const fimPadrao = Math.min(this.JANELA_FIM_MIN, this._paraMinutos(item.fimFixo));
        const temConflitoExterno = blocosFixos.some(
          (f) => Math.max(f.inicioMin, iniPadrao) < Math.min(f.fimMin, fimPadrao)
        );

        if (!temConflitoExterno) {
          const concluido = jaConcluido || fimPadrao <= minHoraAtual;
          const emAndamento = !concluido && iniPadrao <= minHoraAtual && fimPadrao > minHoraAtual;
          blocosFixos.push({
            inicioMin: iniPadrao,
            fimMin: fimPadrao,
            bloco: {
              id: item.id,
              tipo: item.tipo,
              titulo: item.titulo,
              inicio: this._paraHorarioString(iniPadrao),
              fim: this._paraHorarioString(fimPadrao),
              inicioMin: iniPadrao,
              fimMin: fimPadrao,
              duracaoPlanejada: fimPadrao - iniPadrao,
              duracaoAlocada: fimPadrao - iniPadrao,
              status: concluido ? 'CONCLUIDO' : (emAndamento ? 'EM_ANDAMENTO' : 'PENDENTE'),
              rigido: true,
              comprimido: false
            }
          });
        }
        continue;
      }

      if (jaConcluido) {
        blocosHistoricoConcluidos.push({
          id: item.id,
          tipo: item.tipo,
          titulo: item.titulo,
          inicio: '--:--',
          fim: '--:--',
          inicioMin: 0,
          fimMin: 0,
          duracaoPlanejada: item.duracaoIdeal || spec.duracaoIdeal,
          duracaoAlocada: item.duracaoIdeal || spec.duracaoIdeal,
          status: 'CONCLUIDO',
          rigido: false,
          comprimido: false
        });
      } else {
        blocosFlexiveisPendentes.push({
          id: item.id,
          tipo: item.tipo,
          titulo: item.titulo || spec.tituloPadrao,
          prioridade: spec.prioridade,
          duracaoIdeal: item.duracaoIdeal || spec.duracaoIdeal,
          duracaoMinima: item.duracaoMinima || spec.duracaoMinima,
          essencial: Boolean(item.essencial || spec.essencial)
        });
      }
    }

    const fixosOrdenados = this._normalizarCompromissosFixos(blocosFixos);
    const janelasLivres = this._calcularJanelasLivres(cursorEfetivo, fixosOrdenados);
    const tempoTotalLivre = janelasLivres.reduce((acc, j) => acc + j.duracao, 0);

    // 2. Garantir regra obrigatória: Preservar pelo menos 1 bloco de DESCANSO_REFEICAO
    let garantiuRefeicao = blocosHistoricoConcluidos.some((b) => b.tipo === 'DESCANSO_REFEICAO');
    for (const b of blocosFlexiveisPendentes) {
      if (b.tipo === 'DESCANSO_REFEICAO' && !garantiuRefeicao) {
        b.prioridade = 99; // Eleva para prioridade máxima abaixo apenas de plantão rígido
        b.essencialPrimario = true;
        garantiuRefeicao = true;
      }
    }

    // 3. Calcular Demanda Total Ideal vs Mínima dos Flexíveis Pendentes
    const somaIdeal = blocosFlexiveisPendentes.reduce((acc, b) => acc + b.duracaoIdeal, 0);
    const somaMinima = blocosFlexiveisPendentes.reduce((acc, b) => acc + b.duracaoMinima, 0);

    let modoDegradacao = 'IDEAL';
    let blocosParaAlocar = [...blocosFlexiveisPendentes];
    const blocosCancelados = [];

    if (tempoTotalLivre >= somaIdeal) {
      // Todos cabem na duração ideal
      blocosParaAlocar.forEach((b) => {
        b.duracaoAlvo = b.duracaoIdeal;
        b.comprimido = false;
      });
    } else if (tempoTotalLivre >= somaMinima) {
      // Degradação Graciosa Proporcional entre duracaoMinima e duracaoIdeal
      modoDegradacao = 'COMPRESSAO_PROPORCIONAL';
      const folgaAcimaDoMinimo = tempoTotalLivre - somaMinima;
      const rangeCompressivelTotal = Math.max(1, somaIdeal - somaMinima);
      const fatorEscala = folgaAcimaDoMinimo / rangeCompressivelTotal;

      blocosParaAlocar.forEach((b) => {
        const extra = Math.floor((b.duracaoIdeal - b.duracaoMinima) * fatorEscala);
        // Arredonda em múltiplos de 5 min para ergonomia de agenda
        const duracaoCalculada = b.duracaoMinima + Math.floor(extra / 5) * 5;
        b.duracaoAlvo = Math.max(b.duracaoMinima, Math.min(b.duracaoIdeal, duracaoCalculada));
        b.comprimido = b.duracaoAlvo < b.duracaoIdeal;
      });

      alertas.push(
        `Degradação graciosa ativada: blocos reduzidos proporcionalmente para caberem nos ${tempoTotalLivre} min disponíveis antes das 22:30.`
      );
    } else {
      // Tempo crítico (< somaMinima): Usa micro-blocos mínimos por ordem de prioridade
      modoDegradacao = 'MICRO_BLOCOS_CRITICOS';
      const ordenadosPorPrioridade = [...blocosFlexiveisPendentes].sort((a, b) => b.prioridade - a.prioridade);
      let orcamentoRestante = tempoTotalLivre;
      const selecionadosIds = new Set();

      for (const b of ordenadosPorPrioridade) {
        if (orcamentoRestante >= b.duracaoMinima) {
          b.duracaoAlvo = b.duracaoMinima;
          b.comprimido = true;
          orcamentoRestante -= b.duracaoMinima;
          selecionadosIds.add(b.id);
        } else {
          blocosCancelados.push({
            id: b.id,
            tipo: b.tipo,
            titulo: b.titulo,
            inicio: '--:--',
            fim: '--:--',
            duracaoPlanejada: b.duracaoIdeal,
            duracaoAlocada: 0,
            status: 'CANCELADO_POR_TETO_SONO',
            rigido: false,
            comprimido: true
          });
        }
      }

      // Mantém a ordem cronológica lógica original dos selecionados
      blocosParaAlocar = blocosFlexiveisPendentes.filter((b) => selecionadosIds.has(b.id));
      alertas.push(
        `Compressão severa: ${blocosCancelados.length} bloco(s) suspenso(s) para proteger o limite de sono das 22:30. Micro-blocos mínimos preservados.`
      );
    }

    // 4. Alocar os blocos selecionados dentro das janelas livres (First-Fit Cronológico com Split Seguro ou Ajuste)
    const blocosAlocados = [];
    const janelasMutaveis = janelasLivres.map((j) => ({ ...j }));

    for (const bloco of blocosParaAlocar) {
      let alocado = false;

      for (const janela of janelasMutaveis) {
        if (janela.duracao >= bloco.duracaoAlvo) {
          const ini = janela.inicioMin;
          const fim = ini + bloco.duracaoAlvo;
          const emAndamento = ini <= minHoraAtual && fim > minHoraAtual;

          blocosAlocados.push({
            id: bloco.id,
            tipo: bloco.tipo,
            titulo: bloco.titulo,
            inicio: this._paraHorarioString(ini),
            fim: this._paraHorarioString(fim),
            inicioMin: ini,
            fimMin: fim,
            duracaoPlanejada: bloco.duracaoIdeal,
            duracaoAlocada: bloco.duracaoAlvo,
            status: emAndamento ? 'EM_ANDAMENTO' : 'PENDENTE',
            rigido: false,
            comprimido: bloco.comprimido
          });

          janela.inicioMin = fim;
          janela.duracao = janela.fimMin - janela.inicioMin;
          alocado = true;
          break;
        }
      }

      // Caso uma janela única não comporte o bloco inteiro mas haja janela >= duracaoMinima
      if (!alocado) {
        for (const janela of janelasMutaveis) {
          if (janela.duracao >= bloco.duracaoMinima) {
            const duracaoPossivel = Math.min(bloco.duracaoAlvo, janela.duracao);
            const ini = janela.inicioMin;
            const fim = ini + duracaoPossivel;
            const emAndamento = ini <= minHoraAtual && fim > minHoraAtual;

            blocosAlocados.push({
              id: bloco.id,
              tipo: bloco.tipo,
              titulo: bloco.titulo,
              inicio: this._paraHorarioString(ini),
              fim: this._paraHorarioString(fim),
              inicioMin: ini,
              fimMin: fim,
              duracaoPlanejada: bloco.duracaoIdeal,
              duracaoAlocada: duracaoPossivel,
              status: emAndamento ? 'EM_ANDAMENTO' : 'PENDENTE',
              rigido: false,
              comprimido: true
            });

            janela.inicioMin = fim;
            janela.duracao = janela.fimMin - janela.inicioMin;
            alocado = true;
            break;
          }
        }
      }

      if (!alocado) {
        blocosCancelados.push({
          id: bloco.id,
          tipo: bloco.tipo,
          titulo: bloco.titulo,
          inicio: '--:--',
          fim: '--:--',
          duracaoPlanejada: bloco.duracaoIdeal,
          duracaoAlocada: 0,
          status: 'CANCELADO_POR_FRAGMENTACAO',
          rigido: false,
          comprimido: true
        });
      }
    }

    // 5. Consolidar Timeline Completa Ordenada
    const timelineAtiva = [
      ...fixosOrdenados.map((f) => f.bloco),
      ...blocosAlocados
    ].sort((a, b) => a.inicioMin - b.inicioMin);

    const timelineCompleta = [
      ...blocosHistoricoConcluidos,
      ...timelineAtiva,
      ...blocosCancelados
    ];

    // 6. Calcular Métricas de Produtividade e Estudo Ativo
    const blocosEstudo = timelineCompleta.filter((b) => b.tipo === 'MEDQUEST' || b.tipo === 'ANKI');
    const minutosEstudoPlanejados = blocosEstudo.reduce((acc, b) => acc + b.duracaoPlanejada, 0);
    const minutosEstudoPreservados = blocosEstudo
      .filter((b) => b.status === 'CONCLUIDO' || b.status === 'EM_ANDAMENTO' || b.status === 'PENDENTE')
      .reduce((acc, b) => acc + b.duracaoAlocada, 0);

    const taxaPreservacaoEstudo = minutosEstudoPlanejados > 0
      ? Math.round((minutosEstudoPreservados / minutosEstudoPlanejados) * 100)
      : 100;

    return {
      meta: {
        horaAtual: this._paraHorarioString(minHoraAtual),
        cursorReplanejamento: this._paraHorarioString(cursorEfetivo),
        limiteSonoProtegido: '22:30',
        atrasoMinutos: atrasoSafe,
        modoDegradacao,
        tempoLivreDisponivelMin: tempoTotalLivre,
        minutosEstudoPlanejados,
        minutosEstudoPreservados,
        taxaPreservacaoEstudoPercentual: taxaPreservacaoEstudo
      },
      alertas,
      timeline: timelineCompleta
    };
  }

  /**
   * Gera visualização textual limpa para Telegram e Cockpit PWA.
   * @param {Object} timelineOtimizada Retorno de `otimizarGrade()`
   * @returns {string}
   */
  gerarTimelineFormatada(timelineOtimizada) {
    if (!timelineOtimizada || !Array.isArray(timelineOtimizada.timeline)) {
      return '⚠️ Grade horária indisponível para formatação.';
    }

    const { meta, alertas, timeline } = timelineOtimizada;
    const linhas = [];

    linhas.push('🩺 *COCKPIT TIME-BLOCKING MÉDICO*');
    linhas.push(`🕒 Referência: ${meta.horaAtual} | Cursor: ${meta.cursorReplanejamento} | Teto Sono: ${meta.limiteSonoProtegido}`);
    linhas.push(`⚙️ Modo: ${meta.modoDegradacao} | Retenção de Estudo: ${meta.taxaPreservacaoEstudoPercentual}% (${meta.minutosEstudoPreservados}/${meta.minutosEstudoPlanejados} min)`);
    linhas.push('────────────────────────────────────────');

    const mapaStatus = {
      CONCLUIDO: '[CONCLUÍDO]',
      EM_ANDAMENTO: '[EM ANDAMENTO]',
      PENDENTE: '[PENDENTE]',
      CANCELADO_POR_TETO_SONO: '[SUSPENSO - TETO 22:30]',
      CANCELADO_POR_FRAGMENTACAO: '[SUSPENSO - JANELA CURTA]'
    };

    for (const bloco of timeline) {
      const badgeStatus = mapaStatus[bloco.status] || `[${bloco.status}]`;
      const horarioStr = bloco.inicio !== '--:--' ? `${bloco.inicio} - ${bloco.fim}` : '  --:--      ';
      const tagCompressao = bloco.comprimido && bloco.duracaoAlocada > 0
        ? ` ⚡(${bloco.duracaoAlocada}m/${bloco.duracaoPlanejada}m)`
        : ` (${bloco.duracaoAlocada}m)`;

      linhas.push(`${horarioStr} | ${badgeStatus} ${bloco.titulo}${tagCompressao}`);
    }

    if (alertas && alertas.length > 0) {
      linhas.push('────────────────────────────────────────');
      linhas.push('⚠️ *Alertas do Otimizador:*');
      for (const alerta of alertas) {
        linhas.push(`• ${alerta}`);
      }
    }

    return linhas.join('\n');
  }

  /**
   * Simula o impacto de uma extensão de plantão sobre a meta de estudos do dia.
   *
   * @param {string|number} horaAtual Horário atual da simulação
   * @param {number} duracaoPlantaoExtra Minutos extras de plantão além do previsto
   * @returns {Object} Comparativo determinístico entre cenário base e cenário com plantão estendido
   */
  simularCenarios(horaAtual = '13:00', duracaoPlantaoExtra = 120) {
    const extraMin = Math.max(0, Number(duracaoPlantaoExtra) || 0);

    const cenarioBase = this.otimizarGrade({
      horaAtual,
      blocosConcluidos: ['BLK_ANKI_MANHA', 'BLK_PLATAO_1'],
      atrasoMinutos: 0
    });

    const cenarioPlantaoEstendido = this.otimizarGrade({
      horaAtual,
      blocosConcluidos: ['BLK_ANKI_MANHA', 'BLK_PLATAO_1'],
      atrasoMinutos: extraMin
    });

    const deltaMinutosEstudo =
      cenarioBase.meta.minutosEstudoPreservados - cenarioPlantaoEstendido.meta.minutosEstudoPreservados;

    const blocosEstudoAfetados = cenarioPlantaoEstendido.timeline
      .filter((b) => (b.tipo === 'MEDQUEST' || b.tipo === 'ANKI') && b.comprimido)
      .map((b) => ({
        id: b.id,
        titulo: b.titulo,
        status: b.status,
        duracaoOriginal: b.duracaoPlanejada,
        duracaoSimulada: b.duracaoAlocada
      }));

    return {
      parametrosSimulacao: {
        horaReferencia: this._paraHorarioString(this._paraMinutos(horaAtual)),
        plantaoExtraMinutos: extraMin,
        protecaoSonoRespeitada: true
      },
      cenarioBase: {
        modoDegradacao: cenarioBase.meta.modoDegradacao,
        minutosEstudoPreservados: cenarioBase.meta.minutosEstudoPreservados,
        taxaPreservacaoPercentual: cenarioBase.meta.taxaPreservacaoEstudoPercentual
      },
      cenarioEstendido: {
        modoDegradacao: cenarioPlantaoEstendido.meta.modoDegradacao,
        minutosEstudoPreservados: cenarioPlantaoEstendido.meta.minutosEstudoPreservados,
        taxaPreservacaoPercentual: cenarioPlantaoEstendido.meta.taxaPreservacaoEstudoPercentual,
        timelineFormatada: this.gerarTimelineFormatada(cenarioPlantaoEstendido)
      },
      impactoLiquido: {
        perdaMinutosEstudo: deltaMinutosEstudo,
        blocosEstudoComprimidosOuSuspensos: blocosEstudoAfetados
      }
    };
  }
}

module.exports = TimeBlockingOptimizerDomain;
