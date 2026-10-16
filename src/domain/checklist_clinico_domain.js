'use strict';

/**
 * @fileoverview Módulo de Domínio para Checklists Clínicos de Segurança do Paciente.
 * Implementa manipulação determinística por bitmask (< 64 bytes para payload de callback)
 * para protocolos canônicos: FAST HUG-SB, SBAR, Alta Segura de PS e Cirurgia Segura OMS.
 *
 * Padrão: Clean Architecture / Domain-Driven Design (Zero External Dependencies)
 */

class ChecklistClinicoDomain {
  constructor() {
    /**
     * Repositório imutável em memória dos protocolos clínicos canônicos.
     * Cada item possui um índice de bit (0 a N-1) usado para operações bitwise.
     */
    this._checklists = {
      fast_hug_sb: {
        id: 'fast_hug_sb',
        titulo: 'FAST HUG-SB (Visita Multidisciplinar UTI)',
        categoria: 'Medicina Intensiva',
        icone: '🏥',
        descricao: 'Checklist diário de cuidados críticos à beira-leito para prevenção de eventos adversos na UTI.',
        itens: [
          {
            id: 'feeding',
            bit: 0,
            label: 'F - Feeding (Nutrição)',
            descricao: 'Meta calórico-proteica atingida (VO, TNE ou TNP) ou justificativa clínica para jejum.',
            obrigatorio: true
          },
          {
            id: 'analgesia',
            bit: 1,
            label: 'A - Analgesia',
            descricao: 'Dor controlada e avaliada sistematicamente (EVA < 3 ou BPS < 5 / CPOT < 3).',
            obrigatorio: true
          },
          {
            id: 'sedation',
            bit: 2,
            label: 'S - Sedation (Sedação / Delirium)',
            descricao: 'Alvo de RASS atingido (idealmente 0 a -1), despertar diário avaliado e CAM-ICU aplicado.',
            obrigatorio: true
          },
          {
            id: 'thromboembolism',
            bit: 3,
            label: 'T - Thromboembolism (Profilaxia TEV)',
            descricao: 'Profilaxia farmacológica (HBPM/HNF) ou mecânica (CPI/meias) prescrita conforme risco/sangramento.',
            obrigatorio: true
          },
          {
            id: 'head_of_bed',
            bit: 4,
            label: 'H - Head-of-bed (Cabeceira Elevada)',
            descricao: 'Decúbito elevado entre 30° e 45° (salvo contraindicação formal como TRM instável ou prona).',
            obrigatorio: true
          },
          {
            id: 'ulcer_prophylaxis',
            bit: 5,
            label: 'U - Stress Ulcer (Profilaxia Úlcera de Estresse)',
            descricao: 'Indicação revisada (VM > 48h, coagulopatia, choque). Desprescrever IBP se sem indicação.',
            obrigatorio: false
          },
          {
            id: 'glycemic_control',
            bit: 6,
            label: 'G - Glycemic Control (Controle Glicêmico)',
            descricao: 'Glicemia capilar mantida na faixa alvo (140-180 mg/dL) e ausência de hipoglicemia (< 70 mg/dL).',
            obrigatorio: true
          },
          {
            id: 'spontaneous_breathing',
            bit: 7,
            label: 'S - Spontaneous Breathing (Teste de Respiração Espontânea)',
            descricao: 'Elegibilidade para desmame ventilatório avaliada hoje (TRE em Tubo T ou PSV baixa).',
            obrigatorio: true
          },
          {
            id: 'bowel_movement',
            bit: 8,
            label: 'B - Bowel Movement (Ritmo Intestinal e Dispositivos)',
            descricao: 'Função gastrointestinal monitorada (ausência de constipação > 3 dias/diarreia) e revisão de invasões (Sonda/CVC).',
            obrigatorio: false
          }
        ]
      },

      passagem_sbar: {
        id: 'passagem_sbar',
        titulo: 'Passagem de Plantão Estruturada (SBAR)',
        categoria: 'Transição de Cuidado',
        icone: '🔄',
        descricao: 'Ferramenta padronizada para comunicação crítica e transferência segura de responsabilidade clínica.',
        itens: [
          {
            id: 'sbar_situation',
            bit: 0,
            label: 'S - Situation (Situação Atual e Identificação)',
            descricao: 'Nome, idade, leito, diagnóstico principal, tempo de internação e motivo da instabilidade atual.',
            obrigatorio: true
          },
          {
            id: 'sbar_background',
            bit: 1,
            label: 'B - Background (Histórico e Contexto Clínico)',
            descricao: 'Comorbidades relevantes, alergias, cirurgias/procedimentos realizados e linha de antibióticos (D-atual).',
            obrigatorio: true
          },
          {
            id: 'sbar_assessment_hemo',
            bit: 2,
            label: 'A1 - Assessment (Estabilidade Hemodinâmica / DVA)',
            descricao: 'Sinais vitais, balanço hídrico, lactato, perfusão periférica e vazão exata de Drogas Vasoativas.',
            obrigatorio: true
          },
          {
            id: 'sbar_assessment_resp',
            bit: 3,
            label: 'A2 - Assessment (Via Aérea / Ventilação / Neuro)',
            descricao: 'Padrão respiratório, parâmetros de VM (Modo, VC, PEEP, FiO2), nível de consciência (Glasgow/RASS) e drenos.',
            obrigatorio: true
          },
          {
            id: 'sbar_recommendation_pendencias',
            bit: 4,
            label: 'R1 - Recommendation (Exames e Pendências Críticas)',
            descricao: 'Exames laboratoriais/imagem aguardando laudo, pareceres solicitados, reserva de hemoderivados ou vaga de UTI/CC.',
            obrigatorio: true
          },
          {
            id: 'sbar_recommendation_plano',
            bit: 5,
            label: 'R2 - Recommendation (Plano Terapêutico e Teto)',
            descricao: 'Condutas caso haja piora ("Se X acontecer, fazer Y") e definição clara de diretivas/teto terapêutico.',
            obrigatorio: false
          }
        ]
      },

      alta_ps_criterios: {
        id: 'alta_ps_criterios',
        titulo: 'Checklist de Alta Segura do Pronto-Socorro',
        categoria: 'Medicina de Emergência',
        icone: '🏠',
        descricao: 'Verificação obrigatória de segurança antes da liberação hospitalar para reduzir retorno precoce (< 72h).',
        itens: [
          {
            id: 'estabilidade_vital',
            bit: 0,
            label: 'Estabilidade Hemodinâmica e Respiratória',
            descricao: 'PA, FC, FR, SpO2 e Temperatura reavaliados e normais para o basal do paciente sem suporte agudo.',
            obrigatorio: true
          },
          {
            id: 'controle_sintomas',
            bit: 1,
            label: 'Controle de Dor e Sintomas (Tolerância VO)',
            descricao: 'Dor controlada (EVA <= 3), ausência de vômitos incoercíveis e tolerância à via oral comprovada.',
            obrigatorio: true
          },
          {
            id: 'revisao_exames',
            bit: 2,
            label: 'Revisão de Exames e Descarte de Red Flags',
            descricao: 'Todos os exames solicitados foram checados e diagnósticos ameaçadores à vida foram formalmente excluídos.',
            obrigatorio: true
          },
          {
            id: 'receita_reconciliacao',
            bit: 3,
            label: 'Receita Médica Clara e Reconciliação',
            descricao: 'Prescrição domiciliar entregue e explicada (posologia, duração) sem conflito com medicações de uso contínuo.',
            obrigatorio: true
          },
          {
            id: 'sinais_alarme',
            bit: 4,
            label: 'Orientação de Sinais de Alarme (Teach-Back)',
            descricao: 'Paciente ou acompanhante compreendeu e verbalizou quais sinais exigem retorno imediato ao Pronto-Socorro.',
            obrigatorio: true
          },
          {
            id: 'encaminhamento_rede',
            bit: 5,
            label: 'Contra-referência e Atestado/Documentos',
            descricao: 'Relatório de alta/encaminhamento ambulatorial entregue e condição social/transporte seguro verificados.',
            obrigatorio: false
          }
        ]
      },

      cirurgia_segura_oms: {
        id: 'cirurgia_segura_oms',
        titulo: 'Checklist de Cirurgia Segura (OMS)',
        categoria: 'Centro Cirúrgico',
        icone: '😷',
        descricao: 'Protocolo cirúrgico nos 3 momentos críticos: Sign In (Indução), Time Out (Incisão) e Sign Out (Saída de Sala).',
        itens: [
          {
            id: 'signin_identificacao',
            bit: 0,
            label: '[Sign In] Identidade, Sítio Demarcado e Consentimento',
            descricao: 'Antes da indução: Paciente confirmou nome, procedimento, lateralidade demarcada e termo assinado.',
            obrigatorio: true
          },
          {
            id: 'signin_seguranca_anestesica',
            bit: 1,
            label: '[Sign In] Checagem Anestésica, Via Aérea e Sangue',
            descricao: 'Aparelho de anestesia e oxímetro revisados, alergias checadas, via aérea difícil avaliada e reserva sanguínea se perda > 500ml.',
            obrigatorio: true
          },
          {
            id: 'timeout_pausa_equipe',
            bit: 2,
            label: '[Time Out] Pausa Cirúrgica e Confirmação Verbal',
            descricao: 'Antes da incisão: Equipe se apresentou e confirmou verbalmente paciente, sítio cirúrgico e procedimento.',
            obrigatorio: true
          },
          {
            id: 'timeout_atb_imagem',
            bit: 3,
            label: '[Time Out] Antibiótico Profilático (< 60min) e Imagens',
            descricao: 'ATB profilático administrado nos últimos 60 minutos, eventos críticos revisados e exames de imagem em sala.',
            obrigatorio: true
          },
          {
            id: 'signout_contagem',
            bit: 4,
            label: '[Sign Out] Contagem de Compressas, Agulhas e Instrumental',
            descricao: 'Antes de sair da sala: Contagem final exata conferida pela enfermagem e peças anatômicas devidamente identificadas.',
            obrigatorio: true
          },
          {
            id: 'signout_recuperacao',
            bit: 5,
            label: '[Sign Out] Revisão de Recuperação Pós-Anestésica (RPA/UTI)',
            descricao: 'Cirurgião, anestesista e enfermagem revisaram as principais preocupações para a recuperação imediata do paciente.',
            obrigatorio: true
          }
        ]
      }
    };

    // Pré-computa máscaras de referência para performance O(1)
    this._mascarasReferencia = {};
    for (const [id, checklist] of Object.entries(this._checklists)) {
      let mascaraTotal = 0;
      let mascaraObrigatoria = 0;

      for (const item of checklist.itens) {
        const bitVal = 1 << item.bit;
        mascaraTotal |= bitVal;
        if (item.obrigatorio) {
          mascaraObrigatoria |= bitVal;
        }
      }

      this._mascarasReferencia[id] = {
        mascaraTotal,
        mascaraObrigatoria
      };
    }
  }

  /**
   * Lista os metadados resumidos de todos os checklists disponíveis.
   * @returns {Array<{id: string, titulo: string, categoria: string, totalItens: number, icone: string}>}
   */
  listarChecklists() {
    return Object.values(this._checklists).map((chk) => ({
      id: chk.id,
      titulo: chk.titulo,
      categoria: chk.categoria,
      totalItens: chk.itens.length,
      icone: chk.icone
    }));
  }

  /**
   * Obtém a estrutura completa e clonada de um checklist pelo ID.
   * @param {string} checklistId - Identificador canônico do checklist.
   * @returns {Object} Objeto contendo metadados, itens e máscaras de referência.
   * @throws {Error} Se o checklistId for inválido ou não encontrado.
   */
  obterChecklist(checklistId) {
    if (!checklistId || typeof checklistId !== 'string') {
      throw new Error('ID do checklist inválido.');
    }

    const chk = this._checklists[checklistId];
    if (!chk) {
      throw new Error(`Checklist clínico não encontrado: '${checklistId}'.`);
    }

    const ref = this._mascarasReferencia[checklistId];

    return {
      id: chk.id,
      titulo: chk.titulo,
      categoria: chk.categoria,
      icone: chk.icone,
      descricao: chk.descricao,
      totalItens: chk.itens.length,
      mascaraTotal: ref.mascaraTotal,
      mascaraObrigatoria: ref.mascaraObrigatoria,
      itens: chk.itens.map((item) => ({ ...item }))
    };
  }

  /**
   * Inverte o estado (0 -> 1 ou 1 -> 0) de um bit específico na bitmask.
   * @param {number} mascara - Estado atual em inteiro (bitmask).
   * @param {number} itemIndex - Índice do bit a ser alternado (0 a 30).
   * @returns {number} Nova bitmask inteira após operação XOR.
   */
  alternarBit(mascara, itemIndex) {
    const estadoAtual = Number.isInteger(mascara) && mascara >= 0 ? mascara : 0;
    const bit = Number(itemIndex);

    if (!Number.isInteger(bit) || bit < 0 || bit > 30) {
      throw new Error(`Índice de bit inválido: ${itemIndex}. Deve ser um inteiro entre 0 e 30.`);
    }

    return estadoAtual ^ (1 << bit);
  }

  /**
   * Alias semântico de alternarBit conforme diretriz de domínio.
   * @param {number} estadoBitmask - Estado atual em inteiro.
   * @param {number} bitIndex - Índice do bit do item.
   * @returns {number} Nova bitmask inteira.
   */
  alternarItem(estadoBitmask, bitIndex) {
    return this.alternarBit(estadoBitmask, bitIndex);
  }

  /**
   * Calcula o progresso, conformidade obrigatória e status de prontidão do checklist.
   * @param {string} checklistId - ID do checklist.
   * @param {number} estadoBitmask - Bitmask inteira representando itens marcados.
   * @returns {{
   *   checklistId: string,
   *   titulo: string,
   *   mascaraAtual: number,
   *   completados: number,
   *   total: number,
   *   percentual: number,
   *   obrigatoriosCompletados: number,
   *   totalObrigatorios: number,
   *   pendentesObrigatorios: Array<{id: string, bit: number, label: string}>,
   *   pendentesOpcionais: Array<{id: string, bit: number, label: string}>,
   *   itensAvaliados: Array<Object>,
   *   status: 'incompleto'|'apto'|'completo'
   * }}
   */
  calcularProgresso(checklistId, estadoBitmask = 0) {
    const chk = this.obterChecklist(checklistId);
    const ref = this._mascarasReferencia[checklistId];
    const mascaraLimpa = (Number.isInteger(estadoBitmask) && estadoBitmask >= 0 ? estadoBitmask : 0) & ref.mascaraTotal;

    let completados = 0;
    let obrigatoriosCompletados = 0;
    let totalObrigatorios = 0;
    const pendentesObrigatorios = [];
    const pendentesOpcionais = [];
    const itensAvaliados = [];

    for (const item of chk.itens) {
      const marcado = (mascaraLimpa & (1 << item.bit)) !== 0;

      if (item.obrigatorio) {
        totalObrigatorios++;
      }

      if (marcado) {
        completados++;
        if (item.obrigatorio) {
          obrigatoriosCompletados++;
        }
      } else {
        const resumoItem = { id: item.id, bit: item.bit, label: item.label };
        if (item.obrigatorio) {
          pendentesObrigatorios.push(resumoItem);
        } else {
          pendentesOpcionais.push(resumoItem);
        }
      }

      itensAvaliados.push({
        ...item,
        concluido: marcado
      });
    }

    const total = chk.itens.length;
    const percentual = total > 0 ? Math.round((completados / total) * 100) : 0;

    let status = 'incompleto';
    if (completados === total) {
      status = 'completo';
    } else if (pendentesObrigatorios.length === 0) {
      status = 'apto';
    }

    return {
      checklistId: chk.id,
      titulo: chk.titulo,
      mascaraAtual: mascaraLimpa,
      completados,
      total,
      percentual,
      obrigatoriosCompletados,
      totalObrigatorios,
      pendentesObrigatorios,
      pendentesOpcionais,
      itensAvaliados,
      status
    };
  }

  /**
   * Avalia a conformidade clínica de um checklist frente à bitmask informada.
   * @param {string} checklistId - ID do checklist.
   * @param {number} mascara - Bitmask inteira.
   * @returns {Object} Relatório estruturado de conformidade.
   */
  avaliar(checklistId, mascara = 0) {
    const progresso = this.calcularProgresso(checklistId, mascara);
    const aprovadoSeguranca = progresso.status === 'completo' || progresso.status === 'apto';

    let parecerClinico = '';
    if (progresso.status === 'completo') {
      parecerClinico = 'CONFORMIDADE TOTAL: Todos os critérios (obrigatórios e complementares) foram verificados.';
    } else if (progresso.status === 'apto') {
      parecerClinico = 'APTO COM RESSALVAS: Todos os critérios obrigatórios de segurança foram atendidos. Há itens complementares pendentes.';
    } else {
      parecerClinico = `NÃO CONFORME / BLOQUEIO DE SEGURANÇA: Existem ${progresso.pendentesObrigatorios.length} item(ns) obrigatório(s) pendente(s).`;
    }

    return {
      ...progresso,
      aprovadoSeguranca,
      parecerClinico
    };
  }

  /**
   * Gera texto visual estruturado com checkboxes [x] e [ ] otimizado para mensagens do Telegram.
   * @param {string} checklistId - ID do checklist.
   * @param {number} mascara - Bitmask inteira atual.
   * @param {Array<string>} [pendencias=[]] - Lista opcional de observações ou pendências livres.
   * @returns {string} Texto formatado.
   */
  gerarTextoFormatadoTelegram(checklistId, mascara = 0, pendencias = []) {
    const chk = this.obterChecklist(checklistId);
    const avaliacao = this.avaliar(checklistId, mascara);

    const barraBlocos = 10;
    const blocosPreenchidos = Math.round((avaliacao.percentual / 100) * barraBlocos);
    const barraVisual = '█'.repeat(blocosPreenchidos) + '░'.repeat(barraBlocos - blocosPreenchidos);

    const linhas = [];
    linhas.push(`${chk.icone} *${chk.titulo}*`);
    linhas.push(`Categoria: _${chk.categoria}_`);
    linhas.push(`Progresso: [${barraVisual}] ${avaliacao.percentual}% (${avaliacao.completados}/${avaliacao.total})`);
    linhas.push('');

    for (const item of avaliacao.itensAvaliados) {
      const checkStr = item.concluido ? '[x]' : '[ ]';
      const tagObrig = item.obrigatorio ? '*' : '(opcional)';
      linhas.push(`${checkStr} *${item.label}* ${tagObrig}`);
      linhas.push(`    └ _${item.descricao}_`);
    }

    linhas.push('');
    if (avaliacao.status === 'completo') {
      linhas.push('✅ *STATUS: COMPLETO (100% Verificado)*');
    } else if (avaliacao.status === 'apto') {
      linhas.push('🟢 *STATUS: APTO (Itens obrigatórios concluídos)*');
    } else {
      linhas.push(`🔴 *STATUS: INCOMPLETO (${avaliacao.pendentesObrigatorios.length} obrigatório(s) pendente(s))*`);
    }

    if (Array.isArray(pendencias) && pendencias.length > 0) {
      const pendenciasLimpas = pendencias
        .map((p) => (typeof p === 'string' ? p.trim() : ''))
        .filter(Boolean);

      if (pendenciasLimpas.length > 0) {
        linhas.push('');
        linhas.push('⚠️ *Pendências / Observações Registradas:*');
        for (const p of pendenciasLimpas) {
          linhas.push(`• ${p}`);
        }
      }
    }

    return linhas.join('\n');
  }

  /**
   * Gera relatório clínico estruturado limpo para exportação em Prontuário Eletrônico (PEP) ou Telegram.
   * @param {string} checklistId - ID do checklist.
   * @param {number} estadoBitmask - Bitmask inteira atual.
   * @param {Object} [dadosAdicionais={}] - Metadados contextuais (paciente, leito, profissional, pendencias, notas).
   * @returns {string} Relatório textual estruturado para evolução clínica.
   */
  gerarRelatorioFormatado(checklistId, estadoBitmask = 0, dadosAdicionais = {}) {
    const chk = this.obterChecklist(checklistId);
    const avaliacao = this.avaliar(checklistId, estadoBitmask);
    const meta = dadosAdicionais && typeof dadosAdicionais === 'object' ? dadosAdicionais : {};

    const dataHora = meta.dataHora || new Date().toISOString().replace('T', ' ').substring(0, 19);
    const linhas = [];

    linhas.push('==================================================');
    linhas.push(`RELATÓRIO DE CHECKLIST CLÍNICO: ${chk.titulo.toUpperCase()}`);
    linhas.push('==================================================');
    linhas.push(`Data/Hora: ${dataHora}`);
    if (meta.paciente) linhas.push(`Paciente: ${meta.paciente}`);
    if (meta.leito) linhas.push(`Leito/Setor: ${meta.leito}`);
    if (meta.profissional) linhas.push(`Responsável: ${meta.profissional}`);
    linhas.push(`Status de Conformidade: ${avaliacao.status.toUpperCase()} (${avaliacao.completados}/${avaliacao.total} - ${avaliacao.percentual}%)`);
    linhas.push(`Parecer: ${avaliacao.parecerClinico}`);
    linhas.push('--------------------------------------------------');
    linhas.push('ITENS VERIFICADOS:');

    for (const item of avaliacao.itensAvaliados) {
      const box = item.concluido ? '[X]' : '[ ]';
      const req = item.obrigatorio ? '[OBRIGATÓRIO]' : '[COMPLEMENTAR]';
      linhas.push(`${box} ${item.label} ${req}`);
    }

    if (avaliacao.pendentesObrigatorios.length > 0) {
      linhas.push('--------------------------------------------------');
      linhas.push('PENDÊNCIAS OBRIGATÓRIAS DE SEGURANÇA:');
      for (const pend of avaliacao.pendentesObrigatorios) {
        linhas.push(`- [PENDENTE] ${pend.label}`);
      }
    }

    const listaPendencias = Array.isArray(meta.pendencias) ? meta.pendencias : [];
    if (listaPendencias.length > 0 || meta.notas) {
      linhas.push('--------------------------------------------------');
      linhas.push('OBSERVAÇÕES E PLANO DE AÇÃO:');
      for (const p of listaPendencias) {
        if (typeof p === 'string' && p.trim()) {
          linhas.push(`* ${p.trim()}`);
        }
      }
      if (typeof meta.notas === 'string' && meta.notas.trim()) {
        linhas.push(`Notas: ${meta.notas.trim()}`);
      }
    }

    linhas.push('==================================================');
    return linhas.join('\n');
  }
}

module.exports = ChecklistClinicoDomain;
