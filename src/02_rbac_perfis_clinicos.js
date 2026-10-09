/**
 * ==============================================================================
 * MÓDULO 02: MOTOR DE PERMISSÕES E PERFIS CLÍNICOS (CLINICAL RBAC & SUPERVISÃO)
 * ==============================================================================
 * Fornece controle de acesso baseado em papéis (Role-Based Access Control - RBAC)
 * desenhado sob medida para hospitais universitários, programas de residência médica
 * e atenção à saúde (Resoluções CFM, CNRM/MEC e Diretrizes de Segurança do Paciente).
 *
 * HIERARQUIA CLÍNICA DETERMINÍSTICA:
 *  1. ACADEMICO (Estudante de Medicina / Interno):
 *     - Foco educacional: consulta irrestrita a protocolos, calculadoras, guias e bulários.
 *     - Elaboração de rascunhos de SOAP e simulação de receitas para estudo.
 *     - BLOQUEIO ESTRITO: Não pode liberar prescrição hospitalar ativa, não pode dar alta/transferir
 *       leito e não pode prescrever fármacos de alta vigilância sem co-validação preceptorial.
 *  2. RESIDENTE_R1 (Residente Júnior de 1º Ano):
 *     - Autonomia ambulatorial plena supervisionada; prescrições hospitalares rotineiras.
 *     - ALERTA / SUPERVISÃO OBRIGATÓRIA: Fármacos de alta vigilância (trombolíticos, bloqueadores
 *       neuromusculares, sedação profunda, quimioterápicos) exigem dupla checagem com R3+ ou Preceptor.
 *  3. RESIDENTE_R2 (Residente Pleno de 2º Ano):
 *     - Autonomia em leitos de enfermaria, sala amarela e procedimentos clínicos frequentes.
 *     - Capacidade de co-assinar e orientar acadêmicos em enfermarias.
 *  4. RESIDENTE_R3_R4 (Residente Sênior / Fellow / Chefe de Residentes):
 *     - Autonomia em sala vermelha, UTI, regulação de leitos e procedimentos invasivos críticos.
 *     - Pode validar prescrições de alta vigilância de R1 e acadêmicos.
 *  5. PRECEPTOR (Médico Assistente / Preceptor / Docente / Staff):
 *     - Autoridade clínica máxima e irrestrita (CRM ativo).
 *     - Aprovação final de altas hospitalares complexas, chancelas formais de condutas,
 *       parametrização de protocolos institucionais e feedback socrático.
 *  6. FARMACEUTICO_CLINICO (Farmacêutico Hospitalar / Segurança do Paciente):
 *     - Auditoria farmacêutica avançada (Y-Site, ClCr, dose-teto de DVA, interações graves).
 *     - Poder de veto técnico/sinalização de bloqueio por risco iatrogênico beira-leito.
 *
 * SALVAGUARDA VITAL:
 *  - MODO BREAK-THE-GLASS (Bypass de Emergência Médica):
 *    Em PCR, choque anafilático ou risco iminente de óbito, o médico/residente pode quebrar
 *    as travas com registro explícito da justificativa, garantindo que o cuidado ao paciente
 *    JAMAIS seja interrompido por burocracia do sistema.
 * ==============================================================================
 */

var RbacPerfisClinicosService = (function() {
  'use strict';

  // ───────────────────────────────────────────────────────────────────────────
  // 1. CATÁLOGO DE PERFIS E PERMISSÕES (ROLES & CAPABILITIES)
  // ───────────────────────────────────────────────────────────────────────────

  var PERFIS = {
    ACADEMICO: {
      id: 'ACADEMICO',
      titulo: 'Acadêmico de Medicina (Internato)',
      descricao: 'Estudante de medicina em estágio curricular sob supervisão docente contínua.',
      nivelHierarquico: 1,
      exigeCrm: false,
      podePrescreverOficialmente: false,
      permissoes: [
        'consultar_protocolos',
        'consultar_guias_farmaceuticos',
        'executar_calculadoras_clinicas',
        'redigir_soap_rascunho',
        'simular_receita_estudo',
        'visualizar_leitos_enfermaria',
        'acessar_aulas_e_conteudo_educacional',
        'solicitar_feedback_socratico_preceptor'
      ],
      restricoes: [
        'liberar_prescricao_hospitalar_ativa',
        'assinar_receita_definitiva',
        'alterar_status_leito_alta',
        'alterar_status_leito_instavel',
        'prescrever_farmacos_alta_vigilancia',
        'indicar_internacao_involuntaria_psiquiatrica',
        'configurar_parametros_sistema'
      ]
    },

    RESIDENTE_R1: {
      id: 'RESIDENTE_R1',
      titulo: 'Médico Residente R1 (Júnior)',
      descricao: 'Médico com CRM ativo em primeiro ano do programa de residência médica.',
      nivelHierarquico: 2,
      exigeCrm: true,
      podePrescreverOficialmente: true,
      permissoes: [
        'consultar_protocolos',
        'consultar_guias_farmaceuticos',
        'executar_calculadoras_clinicas',
        'redigir_soap_rascunho',
        'redigir_soap_definitivo',
        'gerar_receita_ambulatorial',
        'gerar_atestado_medico',
        'prescrever_enfermaria_basica',
        'atualizar_status_leito_rotina',
        'realizar_passagem_plantao_sbar',
        'acionar_feedback_preceptor'
      ],
      restricoes: [
        'prescrever_tromboliticos_sem_coassinatura',
        'prescrever_bloqueadores_neuromusculares_sem_coassinatura',
        'alta_hospitalar_uti',
        'indicar_interrupcao_gestacao_prematura',
        'configurar_parametros_sistema'
      ]
    },

    RESIDENTE_R2: {
      id: 'RESIDENTE_R2',
      titulo: 'Médico Residente R2 (Pleno)',
      descricao: 'Médico residente de segundo ano com experiência intermediária e plantões de enfermaria.',
      nivelHierarquico: 3,
      exigeCrm: true,
      podePrescreverOficialmente: true,
      permissoes: [
        'consultar_protocolos',
        'consultar_guias_farmaceuticos',
        'executar_calculadoras_clinicas',
        'redigir_soap_definitivo',
        'gerar_receita_ambulatorial',
        'gerar_atestado_medico',
        'prescrever_enfermaria_basica',
        'prescrever_enfermaria_avancada',
        'atualizar_status_leito_rotina',
        'conceder_alta_enfermaria',
        'validar_prescricao_academico',
        'realizar_passagem_plantao_sbar'
      ],
      restricoes: [
        'prescrever_tromboliticos_sem_coassinatura',
        'alta_hospitalar_uti',
        'configurar_parametros_sistema'
      ]
    },

    RESIDENTE_R3_R4: {
      id: 'RESIDENTE_R3_R4',
      titulo: 'Médico Residente Sênior / Fellow (R3/R4)',
      descricao: 'Residente sênior ou fellow de especialidade com autonomia em terapia intensiva e emergências graves.',
      nivelHierarquico: 4,
      exigeCrm: true,
      podePrescreverOficialmente: true,
      permissoes: [
        'consultar_protocolos',
        'consultar_guias_farmaceuticos',
        'executar_calculadoras_clinicas',
        'redigir_soap_definitivo',
        'gerar_receita_ambulatorial',
        'gerar_atestado_medico',
        'prescrever_enfermaria_avancada',
        'prescrever_uti_sala_vermelha',
        'prescrever_farmacos_alta_vigilancia',
        'atualizar_status_leito_todos',
        'conceder_alta_enfermaria',
        'conceder_alta_uti_stepdown',
        'validar_prescricao_academico',
        'validar_prescricao_r1',
        'coassinar_farmacos_alta_vigilancia',
        'indicar_internacao_involuntaria_psiquiatrica',
        'ativar_bypass_emergencia'
      ],
      restricoes: [
        'configurar_parametros_sistema'
      ]
    },

    PRECEPTOR: {
      id: 'PRECEPTOR',
      titulo: 'Médico Preceptor / Assistente (Staff Docente)',
      descricao: 'Médico preceptor responsável técnico pela equipe, auditoria e ensino em serviço.',
      nivelHierarquico: 5,
      exigeCrm: true,
      podePrescreverOficialmente: true,
      permissoes: [
        'consultar_protocolos',
        'consultar_guias_farmaceuticos',
        'executar_calculadoras_clinicas',
        'redigir_soap_definitivo',
        'gerar_receita_ambulatorial',
        'gerar_atestado_medico',
        'prescrever_enfermaria_avancada',
        'prescrever_uti_sala_vermelha',
        'prescrever_farmacos_alta_vigilancia',
        'atualizar_status_leito_todos',
        'conceder_alta_enfermaria',
        'conceder_alta_uti_stepdown',
        'conceder_alta_complexa_definitiva',
        'validar_prescricao_academico',
        'validar_prescricao_r1',
        'coassinar_farmacos_alta_vigilancia',
        'indicar_internacao_involuntaria_psiquiatrica',
        'emitir_parecer_socratico',
        'auditar_kaizen_seguranca',
        'configurar_parametros_sistema',
        'ativar_bypass_emergencia',
        'supervisao_plena_irrestrita'
      ],
      restricoes: []
    },

    FARMACEUTICO_CLINICO: {
      id: 'FARMACEUTICO_CLINICO',
      titulo: 'Farmacêutico Clínico / Especialista em Segurança',
      descricao: 'Farmacêutico hospitalar dedicado à farmacovigilância e reconciliação medicamentosa.',
      nivelHierarquico: 3,
      exigeCrm: false,
      podePrescreverOficialmente: false,
      permissoes: [
        'consultar_protocolos',
        'consultar_guias_farmaceuticos',
        'executar_calculadoras_clinicas',
        'auditar_prescricoes_hospitalares',
        'auditar_compatibilidade_y_site',
        'auditar_ajuste_renal_hepatica',
        'bloquear_dispensacao_farmaceutica_insegura',
        'sinalizar_interacoes_graves',
        'sugerir_conciliacao_medicamentosa'
      ],
      restricoes: [
        'prescrever_medicamentos_diretamente',
        'conceder_alta_hospitalar',
        'alterar_diagnostico_medico',
        'indicar_procedimentos_cirurgicos'
      ]
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 2. FÁRMACOS E MÓDULOS DE ALTA VIGILÂNCIA (HIGH-ALERT MEDICATIONS)
  // ───────────────────────────────────────────────────────────────────────────

  var FARMACOS_ALTA_VIGILANCIA = [
    { termo: 'alteplase', categoria: 'Trombolítico', nivelMinimoExigido: 'RESIDENTE_R3_R4', exigeCoAssinaturaR1: true },
    { termo: 'tenecteplase', categoria: 'Trombolítico', nivelMinimoExigido: 'RESIDENTE_R3_R4', exigeCoAssinaturaR1: true },
    { termo: 'rocuronio', categoria: 'Bloqueador Neuromuscular', nivelMinimoExigido: 'RESIDENTE_R2', exigeCoAssinaturaR1: true },
    { termo: 'vecuronio', categoria: 'Bloqueador Neuromuscular', nivelMinimoExigido: 'RESIDENTE_R2', exigeCoAssinaturaR1: true },
    { termo: 'succinilcolina', categoria: 'Bloqueador Neuromuscular', nivelMinimoExigido: 'RESIDENTE_R2', exigeCoAssinaturaR1: true },
    { termo: 'cisatracurio', categoria: 'Bloqueador Neuromuscular', nivelMinimoExigido: 'RESIDENTE_R2', exigeCoAssinaturaR1: true },
    { termo: 'noradrenalina', categoria: 'Amina Vasoativa Alta Vigilância', nivelMinimoExigido: 'RESIDENTE_R1', exigeAlertaSupervisao: true },
    { termo: 'adrenalina', categoria: 'Amina Vasoativa Alta Vigilância', nivelMinimoExigido: 'RESIDENTE_R1', exigeAlertaSupervisao: true },
    { termo: 'vasopressina', categoria: 'Vasopressor de Resgate', nivelMinimoExigido: 'RESIDENTE_R2', exigeCoAssinaturaR1: true },
    { termo: 'nitroprussiato', categoria: 'Vasodilatador Potente', nivelMinimoExigido: 'RESIDENTE_R1', exigeAlertaSupervisao: true },
    { termo: 'cloreto de potassio 19,1%', categoria: 'Eletrólito Concentrado Letal IV Direto', nivelMinimoExigido: 'RESIDENTE_R2', bloqueioInfusaoDireta: true },
    { termo: 'dantroleno', categoria: 'Antídoto Hipertermia/SNM', nivelMinimoExigido: 'RESIDENTE_R2', exigeNotificacaoPreceptor: true },
    { termo: 'metotrexato', categoria: 'Quimioterápico / Imunossupressor', nivelMinimoExigido: 'RESIDENTE_R3_R4', exigeCoAssinaturaR1: true }
  ];

  // ───────────────────────────────────────────────────────────────────────────
  // 3. ARMAZENAMENTO VOLÁTIL DE PENDÊNCIAS E AUDITORIA (EM MEMÓRIA DA INSTÂNCIA)
  // ───────────────────────────────────────────────────────────────────────────

  var pendenciasStore = new Map();
  var logAuditoriaRbac = [];
  var bypassAtivos = new Map(); // chatId/usuarioId -> { ativoAte, motivo, usuario }
  var usuariosPerfisStore = new Map(); // usuarioId -> { usuarioId, perfilId, nome, crm, atualizadoEm }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. MÉTODOS DE AVALIAÇÃO DE PERMISSÃO E AUDITORIA
  // ───────────────────────────────────────────────────────────────────────────

  function normalizarPerfilId(input) {
    if (!input) return 'ACADEMICO';
    var s = String(input).toUpperCase().trim();
    if (s === 'R1' || s === 'RESIDENTE_R1' || s === 'RESIDENTER1' || s === 'JUNIOR') return 'RESIDENTE_R1';
    if (s === 'R2' || s === 'RESIDENTE_R2' || s === 'RESIDENTER2' || s === 'PLENO') return 'RESIDENTE_R2';
    if (s === 'R3' || s === 'R4' || s === 'RESIDENTE_R3' || s === 'RESIDENTE_R4' || s === 'RESIDENTE_R3_R4' || s === 'SENIOR' || s === 'FELLOW') return 'RESIDENTE_R3_R4';
    if (s === 'PRECEPTOR' || s === 'STAFF' || s === 'DOCENTE' || s === 'CHEFE' || s === 'ASSISTENTE') return 'PRECEPTOR';
    if (s === 'FARMACEUTICO' || s === 'FARMACIA' || s === 'FARMACEUTICO_CLINICO') return 'FARMACEUTICO_CLINICO';
    if (s === 'ACADEMICO' || s === 'INTERNO' || s === 'ESTUDANTE' || s === 'ALUNO') return 'ACADEMICO';
    if (PERFIS[s]) return s;
    return 'ACADEMICO';
  }

  function definirPerfilUsuario(usuarioId, perfilId, dadosExtras) {
    var uId = String(usuarioId || 'anonimo').trim();
    var pId = normalizarPerfilId(perfilId);
    dadosExtras = dadosExtras || {};
    var registro = {
      usuarioId: uId,
      perfilId: pId,
      nome: dadosExtras.nome || ('Usuário ' + uId),
      crm: dadosExtras.crm ? String(dadosExtras.crm).trim() : null,
      atualizadoEm: new Date().toISOString()
    };
    usuariosPerfisStore.set(uId, registro);
    registrarLogAuditoria({
      usuario: registro.nome,
      perfil: pId,
      acao: 'definir_perfil_usuario',
      usuarioId: uId,
      motivo: 'Atribuição de papel clínico'
    });
    return {
      sucesso: true,
      usuarioId: uId,
      perfil: PERFIS[pId],
      crm: registro.crm,
      nome: registro.nome,
      mensagem: 'Perfil do usuário ' + uId + ' definido como ' + PERFIS[pId].titulo + '.'
    };
  }

  function obterPerfilUsuario(usuarioId) {
    var uId = String(usuarioId || 'anonimo').trim();
    var reg = usuariosPerfisStore.get(uId);
    if (reg) {
      return {
        usuarioId: uId,
        perfilId: reg.perfilId,
        perfil: PERFIS[reg.perfilId],
        nome: reg.nome,
        crm: reg.crm,
        atualizadoEm: reg.atualizadoEm
      };
    }
    return {
      usuarioId: uId,
      perfilId: 'ACADEMICO',
      perfil: PERFIS.ACADEMICO,
      nome: 'Profissional de Saúde',
      crm: null,
      atualizadoEm: null
    };
  }

  function listarUsuariosPerfis() {
    return Array.from(usuariosPerfisStore.values());
  }

  function obterPerfis() {
    return Object.keys(PERFIS).map(function(k) {
      var p = PERFIS[k];
      return {
        id: p.id,
        titulo: p.titulo,
        descricao: p.descricao,
        nivelHierarquico: p.nivelHierarquico,
        exigeCrm: p.exigeCrm,
        podePrescreverOficialmente: p.podePrescreverOficialmente,
        totalPermissoes: p.permissoes.length
      };
    });
  }

  function obterPermissoesPerfil(perfilId) {
    var pidNorm = normalizarPerfilId(perfilId);
    var p = PERFIS[pidNorm];
    if (!p) throw new Error('Perfil clínico não reconhecido: ' + perfilId);
    return {
      perfil: p.id,
      titulo: p.titulo,
      permissoes: p.permissoes.slice(),
      restricoes: p.restricoes.slice(),
      nivelHierarquico: p.nivelHierarquico
    };
  }

  function normalizarUsuarioContexto(ctx) {
    ctx = ctx || {};
    var uId = String(ctx.usuarioId || ctx.id || ctx.chatId || 'anonimo');
    var salvo = usuariosPerfisStore.get(uId);

    var perfilBruto = ctx.perfil || ctx.role || (salvo ? salvo.perfilId : 'ACADEMICO');
    var perfilId = normalizarPerfilId(perfilBruto);

    var nome = ctx.nome || ctx.usuario || (salvo ? salvo.nome : 'Profissional de Saúde');
    var crm = ctx.crm || (salvo ? salvo.crm : null);

    return {
      usuarioId: uId,
      nome: String(nome),
      crm: crm ? String(crm).trim() : null,
      perfilId: perfilId,
      perfil: PERFIS[perfilId],
      ehPreceptor: perfilId === 'PRECEPTOR',
      ehAcademico: perfilId === 'ACADEMICO'
    };
  }

  function verificarPermissao(usuarioContexto, recurso, acao) {
    var user = normalizarUsuarioContexto(usuarioContexto);
    var perfil = user.perfil;
    var acaoStr = String(acao || recurso || '').toLowerCase().trim();

    // 1. Verificação de Bypass de Emergência ("Break-the-Glass")
    var bypass = bypassAtivos.get(user.usuarioId);
    if (bypass && bypass.ativoAte > Date.now()) {
      registrarLogAuditoria({
        usuario: user.nome,
        perfil: user.perfilId,
        acao: acaoStr,
        autorizado: true,
        motivo: 'AUTORIZADO VIA BYPASS DE EMERGÊNCIA (Break-The-Glass)',
        bypassAtivo: true,
        justificativaBypass: bypass.motivo
      });
      return {
        autorizado: true,
        motivo: 'Ação autorizada excepcionalmente sob Protocolo de Emergência Médica ativa.',
        bypassEmergenciaAtivo: true,
        justificativaBypass: bypass.motivo,
        expiraEmMinutos: Math.ceil((bypass.ativoAte - Date.now()) / 60000)
      };
    }

    // 2. Preceptores possuem autorização irrestrita
    if (perfil.id === 'PRECEPTOR') {
      return {
        autorizado: true,
        motivo: 'Autoridade máxima preceptorial concedida.',
        exigeSupervisao: false,
        coAssinaturaNecessaria: false
      };
    }

    // 3. Checagem contra lista explícita de restrições do perfil
    var temRestricao = perfil.restricoes.some(function(r) {
      return acaoStr.includes(r) || r.includes(acaoStr);
    });

    if (temRestricao) {
      var motivoRecusa = 'Ação (' + acaoStr + ') não permitida para o perfil ' + perfil.titulo + '.';
      var permiteCoAssinatura = user.perfil.nivelHierarquico < 5;

      registrarLogAuditoria({
        usuario: user.nome,
        perfil: user.perfilId,
        acao: acaoStr,
        autorizado: false,
        motivo: motivoRecusa,
        permiteCoAssinatura: permiteCoAssinatura
      });

      return {
        autorizado: false,
        motivo: motivoRecusa,
        exigeSupervisao: true,
        permiteCoAssinaturaPreceptorial: permiteCoAssinatura,
        orientacao: user.ehAcademico
          ? 'Para acadêmicos de medicina, esta conduta deve ser validada e assinada conjuntamente por um médico residente ou preceptor responsável.'
          : 'Esta conduta de alta complexidade requer co-validação por preceptor ou residente sênior (R3/R4).'
      };
    }

    // 4. Checagem de permissões positivas
    var temPermissao = perfil.permissoes.some(function(p) {
      return acaoStr.includes(p) || p.includes(acaoStr);
    });

    if (temPermissao) {
      return {
        autorizado: true,
        motivo: 'Ação autorizada conforme matriz de competências do perfil ' + perfil.titulo + '.',
        exigeSupervisao: false
      };
    }

    // Default conservador para ações não catalogadas: permite para R2+ e restringe para Acadêmico
    if (user.perfil.nivelHierarquico >= 3) {
      return {
        autorizado: true,
        motivo: 'Autorizado por competência geral médica nível ' + perfil.id + '.',
        exigeSupervisao: false
      };
    }

    return {
      autorizado: false,
      motivo: 'Ação restrita. Usuário nível ' + perfil.titulo + ' requer supervisão ativa.',
      exigeSupervisao: true,
      permiteCoAssinaturaPreceptorial: true
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. AUDITORIA DE PRESCRIÇÃO HOSPITALAR E FÁRMACOS DE ALTA VIGILÂNCIA
  // ───────────────────────────────────────────────────────────────────────────

  function validarPrescricaoPorPerfil(usuarioContexto, dadosPrescricao) {
    var user = normalizarUsuarioContexto(usuarioContexto);
    dadosPrescricao = dadosPrescricao || {};

    var itens = Array.isArray(dadosPrescricao.itens) ? dadosPrescricao.itens : [];
    if (typeof dadosPrescricao.textoPrescricao === 'string') {
      itens = itens.concat(dadosPrescricao.textoPrescricao.split('\n'));
    }

    var farmacosDetectados = [];
    var bloqueiosCriticos = [];
    var alertasSupervisao = [];
    var exigeCoAssinatura = false;

    // Se usuário for acadêmico, NENHUMA prescrição hospitalar pode ser liberada sem preceptor
    if (user.ehAcademico) {
      exigeCoAssinatura = true;
      bloqueiosCriticos.push({
        tipo: 'PERFIL_ACADEMICO',
        mensagem: 'Acadêmicos de medicina não possuem prerrogativa legal (CRM) para liberar prescrição hospitalar definitiva sem co-assinatura médica de preceptor ou residente.'
      });
    }

    // Varredura de medicamentos de alta vigilância
    for (var i = 0; i < itens.length; i++) {
      var itemStr = String(itens[i] || '').toLowerCase();
      if (!itemStr.trim()) continue;

      for (var f = 0; f < FARMACOS_ALTA_VIGILANCIA.length; f++) {
        var regra = FARMACOS_ALTA_VIGILANCIA[f];
        if (itemStr.includes(regra.termo)) {
          farmacosDetectados.push({
            medicamento: regra.termo,
            categoria: regra.categoria,
            nivelExigido: regra.nivelMinimoExigido
          });

          // Bloqueio de infusão direta letal de KCl 19.1%
          if (regra.bloqueioInfusaoDireta && (itemStr.includes('bolus') || itemStr.includes('direto') || itemStr.includes('puro'))) {
            bloqueiosCriticos.push({
              tipo: 'EVENTO_SENTINELA_LETAL',
              medicamento: regra.termo,
              mensagem: 'BLOQUEIO FATAL: Cloreto de Potássio 19,1% NUNCA pode ser infundido puro ou em bolus direto (risco imediato de PCR por assistolia). Deve ser obrigatoriamente diluído com velocidade máxima controlada.'
            });
          }

          // Checagem de nível hierárquico mínimo
          var nivelReq = PERFIS[regra.nivelMinimoExigido] ? PERFIS[regra.nivelMinimoExigido].nivelHierarquico : 4;
          if (user.perfil.nivelHierarquico < nivelReq) {
            exigeCoAssinatura = true;
            alertasSupervisao.push({
              medicamento: regra.termo,
              categoria: regra.categoria,
              motivo: 'O medicamento de alta vigilância (' + regra.categoria + ') requer co-validação presencial por médico nível ' + regra.nivelMinimoExigido + ' ou Preceptor.'
            });
          }
        }
      }
    }

    var liberacaoAutorizada = bloqueiosCriticos.length === 0 && (!exigeCoAssinatura || user.ehPreceptor);

    return {
      sucesso: true,
      liberacaoAutorizada: liberacaoAutorizada,
      exigeCoAssinatura: exigeCoAssinatura,
      usuario: {
        nome: user.nome,
        perfil: user.perfilId,
        nivel: user.perfil.nivelHierarquico
      },
      farmacosAltaVigilanciaDetectados: farmacosDetectados,
      bloqueiosCriticos: bloqueiosCriticos,
      alertasSupervisao: alertasSupervisao,
      instrucaoPreceptor: exigeCoAssinatura
        ? 'Prescrição retida em modo Rascunho Supervisionado. Para liberação à enfermagem/farmácia, acione um preceptor ou residente sênior para co-chancela.'
        : 'Prescrição validada conforme competências do prescritor.'
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. GESTÃO DE PENDÊNCIAS E CO-ASSINATURA DE PRECEPTOR
  // ───────────────────────────────────────────────────────────────────────────

  function criarPendenciaCoAssinatura(usuarioContexto, dadosAcao) {
    var user = normalizarUsuarioContexto(usuarioContexto);
    dadosAcao = dadosAcao || {};

    var pendenciaId = 'pend_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    var registro = {
      id: pendenciaId,
      criadoEm: new Date().toISOString(),
      solicitante: {
        id: user.usuarioId,
        nome: user.nome,
        perfil: user.perfilId
      },
      tipoAcao: dadosAcao.tipo || 'liberacao_prescricao_hospitalar',
      paciente: dadosAcao.paciente || 'Não identificado',
      leito: dadosAcao.leito || 'N/A',
      dadosAcao: dadosAcao,
      status: 'PENDENTE',
      chanceladoPor: null,
      chanceladoEm: null,
      parecerPreceptor: null
    };

    pendenciasStore.set(pendenciaId, registro);

    registrarLogAuditoria({
      usuario: user.nome,
      perfil: user.perfilId,
      acao: 'criacao_pendencia_supervisao',
      pendenciaId: pendenciaId,
      motivo: 'Submissão para co-assinatura preceptorial'
    });

    return {
      sucesso: true,
      pendenciaId: pendenciaId,
      status: 'PENDENTE',
      mensagem: 'Pendência de supervisão registrada com sucesso. Aguardando validação do preceptor.'
    };
  }

  function chancelarCoAssinatura(preceptorContexto, pendenciaId, parecerClinico) {
    var preceptor = normalizarUsuarioContexto(preceptorContexto);
    var pId = String(pendenciaId || '').trim();
    var pendencia = pendenciasStore.get(pId);

    if (!pendencia) {
      throw new Error('Pendência não encontrada ou já expirada: ' + pId);
    }

    if (preceptor.perfil.nivelHierarquico < 4) {
      throw new Error('Apenas Médicos Residentes Seniores (R3/R4) ou Preceptores podem co-assinar e chancelar pendências clínicas.');
    }

    pendencia.status = 'CHANCELADO_E_LIBERADO';
    pendencia.chanceladoPor = {
      id: preceptor.usuarioId,
      nome: preceptor.nome,
      crm: preceptor.crm,
      perfil: preceptor.perfilId
    };
    pendencia.chanceladoEm = new Date().toISOString();
    pendencia.parecerPreceptor = parecerClinico || 'Conduta aprovada sem ressalvas pelo preceptor responsável.';

    registrarLogAuditoria({
      usuario: preceptor.nome,
      perfil: preceptor.perfilId,
      acao: 'chancela_preceptorial_aprovada',
      pendenciaId: pId,
      solicitanteOriginal: pendencia.solicitante.nome
    });

    return {
      sucesso: true,
      pendenciaId: pId,
      status: 'CHANCELADO_E_LIBERADO',
      chanceladoPor: pendencia.chanceladoPor,
      chanceladoEm: pendencia.chanceladoEm,
      mensagem: 'Ação clínica validada e liberada com sucesso com chancela preceptorial.'
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 7. MODO BREAK-THE-GLASS (BYPASS DE EMERGÊNCIA MÉDICA)
  // ───────────────────────────────────────────────────────────────────────────

  function ativarBypassEmergencia(usuarioContexto, justificativaClinica, duracaoHoras) {
    var user = normalizarUsuarioContexto(usuarioContexto);
    var justificativa = String(justificativaClinica || '').trim();

    if (justificativa.length < 10) {
      throw new Error('O acionamento de Bypass de Emergência exige justificativa clínica circunstanciada (ex: PCR em andamento, choque grave, intubação de emergência).');
    }

    var duracaoMs = Math.min(4, Math.max(0.5, Number(duracaoHoras || 2))) * 3600000;
    var expiraEm = Date.now() + duracaoMs;

    bypassAtivos.set(user.usuarioId, {
      ativoAte: expiraEm,
      motivo: justificativa,
      usuario: user.nome,
      perfil: user.perfilId,
      criadoEm: new Date().toISOString()
    });

    registrarLogAuditoria({
      usuario: user.nome,
      perfil: user.perfilId,
      acao: 'BYPASS_EMERGENCIA_ACIONADO',
      motivo: justificativa,
      expiraEm: new Date(expiraEm).toISOString(),
      alertaCritico: 'BREAK-THE-GLASS ATIVADO. Todas as travas foram relaxadas temporariamente para preservação da vida.'
    });

    return {
      sucesso: true,
      bypassAtivo: true,
      usuario: user.nome,
      perfil: user.perfilId,
      justificativa: justificativa,
      expiraEm: new Date(expiraEm).toISOString(),
      duracaoHoras: duracaoMs / 3600000,
      avisoSeguranca: '🚨 MODO DE EMERGÊNCIA ATIVADO: Travas de perfis relaxadas temporariamente. Toda ação executada será auditada formalmente.'
    };
  }

  function desativarBypassEmergencia(usuarioContexto) {
    var user = normalizarUsuarioContexto(usuarioContexto);
    var existia = bypassAtivos.delete(user.usuarioId);

    if (existia) {
      registrarLogAuditoria({
        usuario: user.nome,
        perfil: user.perfilId,
        acao: 'BYPASS_EMERGENCIA_ENCERRADO',
        motivo: 'Desativação manual pelo usuário ou término de intervenção de urgência'
      });
    }

    return {
      sucesso: true,
      bypassAtivo: false,
      mensagem: 'Bypass de emergência desativado com sucesso. Permissões normais restabelecidas.'
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 8. LOG DE AUDITORIA & RELATÓRIOS KAIZEN
  // ───────────────────────────────────────────────────────────────────────────

  function registrarLogAuditoria(dados) {
    dados = dados || {};
    dados.timestamp = new Date().toISOString();
    logAuditoriaRbac.push(dados);
    if (logAuditoriaRbac.length > 500) {
      logAuditoriaRbac.shift(); // Mantém ring buffer de 500 registros em RAM
    }
  }

  function obterLogsAuditoria(limite) {
    var lim = Math.min(100, Number(limite || 20));
    return logAuditoriaRbac.slice(-lim).reverse();
  }

  function gerarRelatorioSegurancaRbac() {
    var totalLogs = logAuditoriaRbac.length;
    var negados = logAuditoriaRbac.filter(function(l) { return l.autorizado === false; });
    var bypasses = logAuditoriaRbac.filter(function(l) { return l.acao && l.acao.includes('BYPASS'); });

    var l = [];
    l.push('════════════════════════════════════════════════════════════════');
    l.push('🛡️ ULTRA ROTINA · RELATÓRIO DE AUDITORIA DE PERMISSÕES & SEGURANÇA');
    l.push('════════════════════════════════════════════════════════════════');
    l.push('');
    l.push('► MÉTRICAS GERAIS:');
    l.push('  • Total de Ações Auditadas: ' + totalLogs);
    l.push('  • Bloqueios Preventivos por Nível de Perfil: ' + negados.length);
    l.push('  • Acionamentos de Bypass de Emergência: ' + bypasses.length);
    l.push('  • Pendências de Co-Assinatura em Aberto: ' + Array.from(pendenciasStore.values()).filter(function(p){return p.status === 'PENDENTE';}).length);
    l.push('');
    l.push('► PERFIS CLÍNICOS ATIVOS:');
    Object.keys(PERFIS).forEach(function(k) {
      var p = PERFIS[k];
      l.push('  • ' + p.titulo + ' (Nível ' + p.nivelHierarquico + '): ' + p.permissoes.length + ' permissões / ' + p.restricoes.length + ' restrições');
    });
    l.push('');
    l.push('════════════════════════════════════════════════════════════════');

    return {
      sucesso: true,
      totalLogs: totalLogs,
      totalBloqueios: negados.length,
      totalBypasses: bypasses.length,
      relatorioFormatado: l.join('\n')
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 9. FUNÇÕES DE SUPORTE, CONSULTA E FORMATAÇÃO UI
  // ───────────────────────────────────────────────────────────────────────────

  function listarPendenciasCoAssinatura(filtroStatus) {
    var lista = Array.from(pendenciasStore.values());
    if (filtroStatus) {
      var f = String(filtroStatus).toUpperCase().trim();
      lista = lista.filter(function(p) { return p.status === f; });
    }
    return lista.reverse();
  }

  function obterPendenciaPorId(pendenciaId) {
    var pId = String(pendenciaId || '').trim();
    return pendenciasStore.get(pId) || null;
  }

  function formatarPainelPerfil(usuarioId) {
    var uId = String(usuarioId || 'anonimo').trim();
    var user = normalizarUsuarioContexto({ usuarioId: uId });
    var bypass = bypassAtivos.get(uId);
    var bypassAtivo = bypass && bypass.ativoAte > Date.now();

    var pendenciasAbertas = Array.from(pendenciasStore.values()).filter(function(p) {
      return p.status === 'PENDENTE';
    });

    var l = [];
    l.push('🛡️ *CONTROLE DE ACESSO E PERFIS CLÍNICOS (RBAC)*');
    l.push('════════════════════════════════════════════');
    l.push('👤 *Identificação:* ' + user.nome);
    l.push('🏷️ *Papel Atual:* ' + user.perfil.titulo);
    l.push('📊 *Nível Hierárquico:* Nível ' + user.perfil.nivelHierarquico + ' de 5');
    if (user.crm) l.push('🆔 *CRM:* ' + user.crm);
    l.push('📋 *Prerrogativa Legal de Prescrição:* ' + (user.perfil.podePrescreverOficialmente ? 'Sim (Autonomia supervisionada)' : 'Não (Apenas rascunho / estudo)'));
    l.push('🚨 *Bypass de Emergência (Break-The-Glass):* ' + (bypassAtivo ? ('⚠️ ATIVO (Expira em ' + Math.ceil((bypass.ativoAte - Date.now()) / 60000) + ' min)') : 'Inativo'));
    l.push('');
    l.push('🔑 *Principais Permissões:*');
    user.perfil.permissoes.slice(0, 5).forEach(function(p) {
      l.push('  ✓ ' + p.replace(/_/g, ' '));
    });
    if (user.perfil.restricoes.length > 0) {
      l.push('');
      l.push('⚠️ *Restrições Operacionais:*');
      user.perfil.restricoes.slice(0, 4).forEach(function(r) {
        l.push('  ⛔ ' + r.replace(/_/g, ' '));
      });
    }
    l.push('');
    l.push('📌 *Pendências em Aberto no Plantão:* ' + pendenciasAbertas.length);
    l.push('════════════════════════════════════════════');
    l.push('💡 *Comandos do Sistema:*');
    l.push('• `/perfil [R1|R2|R3|preceptor|academico]` para alterar papel');
    l.push('• `/pendencias` para listar prescrições aguardando chancela');
    l.push('• `/chancelar <id> [parecer]` para chancelar conduta (Preceptor/R3)');
    l.push('• `/emergencia <motivo>` para ativar Break-The-Glass');
    l.push('• `/emergencia off` para encerrar modo emergência');

    return l.join('\n');
  }

  function formatarListaPerfis() {
    var l = [];
    l.push('📋 *CATÁLOGO DE PERFIS CLÍNICOS E COMPETÊNCIAS (RBAC)*');
    l.push('════════════════════════════════════════════');
    Object.keys(PERFIS).forEach(function(k) {
      var p = PERFIS[k];
      l.push('🔹 *' + p.titulo + '* (Nível ' + p.nivelHierarquico + ')');
      l.push('  • ' + p.descricao);
      l.push('  • CRM Obrigatório: ' + (p.exigeCrm ? 'Sim' : 'Não'));
      l.push('  • Prescrição Hospitalar: ' + (p.podePrescreverOficialmente ? 'Autorizada' : 'Bloqueada (requer co-assinatura)'));
      l.push('');
    });
    l.push('Para selecionar seu perfil, envie: `/perfil <papel>` (ex: `/perfil R1`, `/perfil preceptor`)');
    return l.join('\n');
  }

  function formatarListaPendencias(usuarioId) {
    var pendentes = Array.from(pendenciasStore.values()).filter(function(p) {
      return p.status === 'PENDENTE';
    });

    if (pendentes.length === 0) {
      return '✅ *NENHUMA PENDÊNCIA CLÍNICA NO MOMENTO*\n\nTodas as prescrições e condutas do plantão estão regularizadas e chanceladas.';
    }

    var l = [];
    l.push('⏳ *PENDÊNCIAS AGUARDANDO CO-ASSINATURA PRECEPTORIAL* (' + pendentes.length + ')');
    l.push('════════════════════════════════════════════');
    pendentes.forEach(function(p, idx) {
      l.push((idx + 1) + '. *ID:* `' + p.id + '`');
      l.push('   • Solicitante: ' + p.solicitante.nome + ' (' + p.solicitante.perfil + ')');
      l.push('   • Paciente: ' + p.paciente + ' | Leito: ' + p.leito);
      l.push('   • Ação: ' + p.tipoAcao);
      l.push('   • Criado em: ' + new Date(p.criadoEm).toLocaleTimeString('pt-BR'));
      l.push('');
    });
    l.push('════════════════════════════════════════════');
    l.push('Para chancelar uma conduta, envie:\n`/chancelar <id> [parecer clínico]` (ex: `/chancelar ' + pendentes[0].id + ' Aprovado sem ressalvas`)');
    return l.join('\n');
  }

  function formatarResultadoValidacaoPrescricao(res) {
    if (!res) return 'Erro ao validar prescrição.';
    var l = [];
    l.push('🩺 *AUDITORIA DE SEGURANÇA E NÍVEL DE PRESCRIÇÃO*');
    l.push('════════════════════════════════════════════');
    l.push('👤 *Prescritor:* ' + res.usuario.nome + ' (' + res.usuario.perfil + ' - Nível ' + res.usuario.nivel + ')');
    l.push('Status: ' + (res.liberacaoAutorizada ? '✅ LIBERAÇÃO IMEDIATA AUTORIZADA' : (res.exigeCoAssinatura ? '⚠️ RETIDA PARA CO-ASSINATURA' : '⛔ BLOQUEADA')));
    l.push('');

    if (res.bloqueiosCriticos && res.bloqueiosCriticos.length > 0) {
      l.push('🚨 *BLOQUEIOS CRÍTICOS:*');
      res.bloqueiosCriticos.forEach(function(b) {
        l.push('  ⛔ ' + b.mensagem);
      });
      l.push('');
    }

    if (res.farmacosAltaVigilanciaDetectados && res.farmacosAltaVigilanciaDetectados.length > 0) {
      l.push('💊 *Fármacos de Alta Vigilância Detectados:*');
      res.farmacosAltaVigilanciaDetectados.forEach(function(f) {
        l.push('  • ' + f.medicamento.toUpperCase() + ' (' + f.categoria + ') — Exige ' + f.nivelExigido);
      });
      l.push('');
    }

    if (res.alertasSupervisao && res.alertasSupervisao.length > 0) {
      l.push('⚠️ *Alertas de Supervisão:*');
      res.alertasSupervisao.forEach(function(a) {
        l.push('  • ' + a.motivo);
      });
      l.push('');
    }

    l.push('📋 *Orientação:* ' + res.instrucaoPreceptor);
    return l.join('\n');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // EXPORTAÇÃO PÚBLICA
  // ───────────────────────────────────────────────────────────────────────────

  return {
    PERFIS: PERFIS,
    FARMACOS_ALTA_VIGILANCIA: FARMACOS_ALTA_VIGILANCIA,
    obterPerfis: obterPerfis,
    obterPermissoesPerfil: obterPermissoesPerfil,
    normalizarPerfilId: normalizarPerfilId,
    definirPerfilUsuario: definirPerfilUsuario,
    obterPerfilUsuario: obterPerfilUsuario,
    listarUsuariosPerfis: listarUsuariosPerfis,
    verificarPermissao: verificarPermissao,
    validarPrescricaoPorPerfil: validarPrescricaoPorPerfil,
    criarPendenciaCoAssinatura: criarPendenciaCoAssinatura,
    chancelarCoAssinatura: chancelarCoAssinatura,
    listarPendenciasCoAssinatura: listarPendenciasCoAssinatura,
    obterPendenciaPorId: obterPendenciaPorId,
    ativarBypassEmergencia: ativarBypassEmergencia,
    desativarBypassEmergencia: desativarBypassEmergencia,
    obterLogsAuditoria: obterLogsAuditoria,
    gerarRelatorioSegurancaRbac: gerarRelatorioSegurancaRbac,
    formatarPainelPerfil: formatarPainelPerfil,
    formatarListaPerfis: formatarListaPerfis,
    formatarListaPendencias: formatarListaPendencias,
    formatarResultadoValidacaoPrescricao: formatarResultadoValidacaoPrescricao
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RbacPerfisClinicosService: RbacPerfisClinicosService };
}
