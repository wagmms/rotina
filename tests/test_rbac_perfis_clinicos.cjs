const assert = require('assert');
const { RbacPerfisClinicosService } = require('../src/02_rbac_perfis_clinicos');
const runtime = require('../server/runtime');

function runTests() {
  console.log('Iniciando suite de testes: Controle de Acesso e Perfis Clínicos (RBAC / CFM / Residência Médica)');

  // ---------------------------------------------------------------------------
  // Teste 1: Catálogo de Perfis e Hierarquia Clínica
  // ---------------------------------------------------------------------------
  const perfis = RbacPerfisClinicosService.obterPerfis();
  assert.strictEqual(perfis.length, 6, 'Deve conter exatamente 6 perfis clínicos cadastrados');

  const ids = perfis.map(p => p.id);
  assert.ok(ids.includes('ACADEMICO'), 'Deve conter perfil ACADEMICO');
  assert.ok(ids.includes('RESIDENTE_R1'), 'Deve conter perfil RESIDENTE_R1');
  assert.ok(ids.includes('RESIDENTE_R2'), 'Deve conter perfil RESIDENTE_R2');
  assert.ok(ids.includes('RESIDENTE_R3_R4'), 'Deve conter perfil RESIDENTE_R3_R4');
  assert.ok(ids.includes('PRECEPTOR'), 'Deve conter perfil PRECEPTOR');
  assert.ok(ids.includes('FARMACEUTICO_CLINICO'), 'Deve conter perfil FARMACEUTICO_CLINICO');

  const acad = perfis.find(p => p.id === 'ACADEMICO');
  assert.strictEqual(acad.nivelHierarquico, 1);
  assert.strictEqual(acad.exigeCrm, false);
  assert.strictEqual(acad.podePrescreverOficialmente, false);

  const prec = perfis.find(p => p.id === 'PRECEPTOR');
  assert.strictEqual(prec.nivelHierarquico, 5);
  assert.strictEqual(prec.exigeCrm, true);
  assert.strictEqual(prec.podePrescreverOficialmente, true);

  console.log('✓ Teste 1: Catálogo de perfis e hierarquia clínica validada com sucesso.');

  // ---------------------------------------------------------------------------
  // Teste 2: Normalização de Aliases e Obtenção de Permissões
  // ---------------------------------------------------------------------------
  assert.strictEqual(RbacPerfisClinicosService.normalizarPerfilId('r1'), 'RESIDENTE_R1');
  assert.strictEqual(RbacPerfisClinicosService.normalizarPerfilId('r2'), 'RESIDENTE_R2');
  assert.strictEqual(RbacPerfisClinicosService.normalizarPerfilId('r3'), 'RESIDENTE_R3_R4');
  assert.strictEqual(RbacPerfisClinicosService.normalizarPerfilId('preceptor'), 'PRECEPTOR');
  assert.strictEqual(RbacPerfisClinicosService.normalizarPerfilId('interno'), 'ACADEMICO');
  assert.strictEqual(RbacPerfisClinicosService.normalizarPerfilId('farmacia'), 'FARMACEUTICO_CLINICO');

  const permsR1 = RbacPerfisClinicosService.obterPermissoesPerfil('r1');
  assert.strictEqual(permsR1.perfil, 'RESIDENTE_R1');
  assert.ok(permsR1.permissoes.includes('gerar_receita_ambulatorial'));
  assert.ok(permsR1.restricoes.includes('prescrever_tromboliticos_sem_coassinatura'));

  console.log('✓ Teste 2: Normalização de aliases e busca de permissões validada.');

  // ---------------------------------------------------------------------------
  // Teste 3: Restrições Estritas de Acadêmico de Medicina
  // ---------------------------------------------------------------------------
  const acadCtx = { usuarioId: 'aluno_1', nome: 'Interno Carlos', perfil: 'ACADEMICO' };

  // Acadêmico pode consultar protocolos e calculadoras
  const permCons = RbacPerfisClinicosService.verificarPermissao(acadCtx, 'consultar_protocolos');
  assert.strictEqual(permCons.autorizado, true);

  // Acadêmico NÃO pode liberar prescrição ativa nem dar alta hospitalar
  const permPrescAtiva = RbacPerfisClinicosService.verificarPermissao(acadCtx, 'liberar_prescricao_hospitalar_ativa');
  assert.strictEqual(permPrescAtiva.autorizado, false);
  assert.strictEqual(permPrescAtiva.exigeSupervisao, true);

  const permAlta = RbacPerfisClinicosService.verificarPermissao(acadCtx, 'alterar_status_leito_alta');
  assert.strictEqual(permAlta.autorizado, false);

  console.log('✓ Teste 3: Restrições estritas para acadêmicos validadas com sucesso.');

  // ---------------------------------------------------------------------------
  // Teste 4: Autonomia Ambulatorial e Limites do Residente R1
  // ---------------------------------------------------------------------------
  const r1Ctx = { usuarioId: 'r1_maria', nome: 'Dra. Maria R1', perfil: 'RESIDENTE_R1', crm: '111222-SP' };

  // R1 tem autonomia em receita ambulatorial e prescrição básica
  const permR1Rec = RbacPerfisClinicosService.verificarPermissao(r1Ctx, 'gerar_receita_ambulatorial');
  assert.strictEqual(permR1Rec.autorizado, true);

  // R1 é bloqueado para trombolíticos sem co-assinatura
  const permR1Tromb = RbacPerfisClinicosService.verificarPermissao(r1Ctx, 'prescrever_tromboliticos_sem_coassinatura');
  assert.strictEqual(permR1Tromb.autorizado, false);
  assert.strictEqual(permR1Tromb.permiteCoAssinaturaPreceptorial, true);

  console.log('✓ Teste 4: Autonomia e travas de supervisão do R1 validadas.');

  // ---------------------------------------------------------------------------
  // Teste 5: Autonomia em Leito do R2 vs Bloqueio em Trombolíticos
  // ---------------------------------------------------------------------------
  const r2Ctx = { usuarioId: 'r2_pedro', nome: 'Dr. Pedro R2', perfil: 'RESIDENTE_R2', crm: '333444-SP' };

  const permR2AltaEnf = RbacPerfisClinicosService.verificarPermissao(r2Ctx, 'conceder_alta_enfermaria');
  assert.strictEqual(permR2AltaEnf.autorizado, true);

  const permR2Tromb = RbacPerfisClinicosService.verificarPermissao(r2Ctx, 'prescrever_tromboliticos_sem_coassinatura');
  assert.strictEqual(permR2Tromb.autorizado, false);

  console.log('✓ Teste 5: Autonomia de enfermaria do R2 validada.');

  // ---------------------------------------------------------------------------
  // Teste 6: Residente Sênior R3/R4 e Preceptor (Autoridade e Supervisão)
  // ---------------------------------------------------------------------------
  const r3Ctx = { usuarioId: 'r3_ana', nome: 'Dra. Ana R3', perfil: 'RESIDENTE_R3_R4', crm: '555666-SP' };
  const precCtx = { usuarioId: 'staff_dr_wagner', nome: 'Prof. Dr. Wagner', perfil: 'PRECEPTOR', crm: '777888-SP' };

  // R3 tem acesso à UTI e pode coassinar
  const permR3Uti = RbacPerfisClinicosService.verificarPermissao(r3Ctx, 'prescrever_uti_sala_vermelha');
  assert.strictEqual(permR3Uti.autorizado, true);

  const permR3Coass = RbacPerfisClinicosService.verificarPermissao(r3Ctx, 'coassinar_farmacos_alta_vigilancia');
  assert.strictEqual(permR3Coass.autorizado, true);

  // Preceptor possui autoridade máxima irrestrita
  const permPrecGeral = RbacPerfisClinicosService.verificarPermissao(precCtx, 'qualquer_acao_critica_hospitalar');
  assert.strictEqual(permPrecGeral.autorizado, true);
  assert.strictEqual(permPrecGeral.exigeSupervisao, false);

  console.log('✓ Teste 6: Autonomia sênior (R3/R4) e autoridade preceptorial validadas.');

  // ---------------------------------------------------------------------------
  // Teste 7: Farmacêutico Clínico (Auditoria e Veto Farmacêutico)
  // ---------------------------------------------------------------------------
  const farmCtx = { usuarioId: 'farm_lucas', nome: 'Farm. Lucas', perfil: 'FARMACEUTICO_CLINICO' };

  const permFarmAudit = RbacPerfisClinicosService.verificarPermissao(farmCtx, 'auditar_compatibilidade_y_site');
  assert.strictEqual(permFarmAudit.autorizado, true);

  const permFarmPresc = RbacPerfisClinicosService.verificarPermissao(farmCtx, 'prescrever_medicamentos_diretamente');
  assert.strictEqual(permFarmPresc.autorizado, false);

  console.log('✓ Teste 7: Prerrogativas de farmácia clínica validadas.');

  // ---------------------------------------------------------------------------
  // Teste 8: Validação de Prescrição com Drogas de Alta Vigilância
  // ---------------------------------------------------------------------------
  const prescricaoR1ComTrombolitico = RbacPerfisClinicosService.validarPrescricaoPorPerfil(r1Ctx, {
    itens: [
      'Dipirona 1g EV 6/6h',
      'Alteplase 0.9 mg/kg EV (infusão para AVC isquêmico agudo)',
      'Omeprazol 40mg EV 24/24h'
    ]
  });

  assert.strictEqual(prescricaoR1ComTrombolitico.liberacaoAutorizada, false, 'R1 não pode liberar Alteplase sem co-assinatura');
  assert.strictEqual(prescricaoR1ComTrombolitico.exigeCoAssinatura, true);
  assert.strictEqual(prescricaoR1ComTrombolitico.farmacosAltaVigilanciaDetectados.length, 1);
  assert.strictEqual(prescricaoR1ComTrombolitico.farmacosAltaVigilanciaDetectados[0].categoria, 'Trombolítico');

  // A mesma prescrição nas mãos do Preceptor é liberada imediatamente
  const prescricaoPreceptor = RbacPerfisClinicosService.validarPrescricaoPorPerfil(precCtx, {
    itens: [
      'Alteplase 0.9 mg/kg EV'
    ]
  });
  assert.strictEqual(prescricaoPreceptor.liberacaoAutorizada, true);

  console.log('✓ Teste 8: Retenção de trombolítico com R1 e liberação com Preceptor validadas.');

  // ---------------------------------------------------------------------------
  // Teste 9: Evento Sentinela Letal (Bloqueio Fatal de KCl 19.1% Direto/Puro)
  // ---------------------------------------------------------------------------
  const prescricaoKclLetal = RbacPerfisClinicosService.validarPrescricaoPorPerfil(precCtx, {
    itens: [
      'Cloreto de potassio 19,1% 10 mL bolus direto EV'
    ]
  });

  assert.strictEqual(prescricaoKclLetal.liberacaoAutorizada, false, 'KCl 19.1% puro/bolus deve ser bloqueado mesmo para preceptor');
  assert.ok(prescricaoKclLetal.bloqueiosCriticos.some(b => b.tipo === 'EVENTO_SENTINELA_LETAL'));

  console.log('✓ Teste 9: Bloqueio fatal de KCl 19.1% direto validado contra evento sentinela.');

  // ---------------------------------------------------------------------------
  // Teste 10: Fluxo Completo de Pendência de Co-Assinatura e Chancela
  // ---------------------------------------------------------------------------
  const novaPendencia = RbacPerfisClinicosService.criarPendenciaCoAssinatura(r1Ctx, {
    tipo: 'liberacao_trombolise_alteplase',
    paciente: 'José da Silva, 62 anos',
    leito: 'Leito 03 - Sala Vermelha',
    dose: 'Alteplase 63mg total'
  });

  assert.strictEqual(novaPendencia.sucesso, true);
  assert.ok(novaPendencia.pendenciaId.startsWith('pend_'));

  // Tentativa inválida: outro R1 tenta chancelar
  assert.throws(() => {
    RbacPerfisClinicosService.chancelarCoAssinatura(r1Ctx, novaPendencia.pendenciaId, 'Aprovado por colega R1');
  }, /Apenas Médicos Residentes Seniores/, 'R1 não pode chancelar pendências');

  // Preceptor chancela com parecer
  const chancelaPreceptor = RbacPerfisClinicosService.chancelarCoAssinatura(precCtx, novaPendencia.pendenciaId, 'Critérios de inclusão de AVC em 3h preenchidos, sem contraindicações tomográficas. Liberado.');
  assert.strictEqual(chancelaPreceptor.sucesso, true);
  assert.strictEqual(chancelaPreceptor.status, 'CHANCELADO_E_LIBERADO');
  assert.strictEqual(chancelaPreceptor.chanceladoPor.perfil, 'PRECEPTOR');

  console.log('✓ Teste 10: Ciclo de vida de pendência e chancela preceptorial validado.');

  // ---------------------------------------------------------------------------
  // Teste 11: Protocolo Break-the-Glass (Bypass de Emergência Médica)
  // ---------------------------------------------------------------------------
  // Tentativa com justificativa vazia ou muito curta deve falhar
  assert.throws(() => {
    RbacPerfisClinicosService.ativarBypassEmergencia(r1Ctx, 'urgente');
  }, /exige justificativa clínica circunstanciada/);

  // Ativação legítima em parada cardiorrespiratória
  const resBypass = RbacPerfisClinicosService.ativarBypassEmergencia(r1Ctx, 'PCR em assistolia no leito 2. Administração emergencial de Adrenalina e IOT imediata.', 1);
  assert.strictEqual(resBypass.sucesso, true);
  assert.strictEqual(resBypass.bypassAtivo, true);

  // Agora, a checagem de permissão do R1 deve autorizar via Bypass
  const permEmPCR = RbacPerfisClinicosService.verificarPermissao(r1Ctx, 'prescrever_farmacos_alta_vigilancia');
  assert.strictEqual(permEmPCR.autorizado, true);
  assert.strictEqual(permEmPCR.bypassEmergenciaAtivo, true);

  // Desativação do Bypass
  const resDesat = RbacPerfisClinicosService.desativarBypassEmergencia(r1Ctx);
  assert.strictEqual(resDesat.bypassAtivo, false);

  console.log('✓ Teste 11: Protocolo Break-the-Glass validado com salvaguarda e auditoria.');

  // ---------------------------------------------------------------------------
  // Teste 12: Definição e Persistência de Perfil por Chat/Usuário
  // ---------------------------------------------------------------------------
  const def1 = RbacPerfisClinicosService.definirPerfilUsuario('chat_999888', 'R1', {
    nome: 'Dr. Lucas Residente',
    crm: '998877/RJ'
  });
  assert.strictEqual(def1.sucesso, true);
  assert.strictEqual(def1.perfil.id, 'RESIDENTE_R1');

  const obt1 = RbacPerfisClinicosService.obterPerfilUsuario('chat_999888');
  assert.strictEqual(obt1.perfilId, 'RESIDENTE_R1');
  assert.strictEqual(obt1.crm, '998877/RJ');
  assert.strictEqual(obt1.nome, 'Dr. Lucas Residente');

  console.log('✓ Teste 12: Definição e recuperação de perfil por usuário/chatId validadas.');

  // ---------------------------------------------------------------------------
  // Teste 13: Funções de Formatação UI (Telegram Markdown)
  // ---------------------------------------------------------------------------
  const painel = RbacPerfisClinicosService.formatarPainelPerfil('chat_999888');
  assert.ok(painel.includes('CONTROLE DE ACESSO E PERFIS CLÍNICOS'));
  assert.ok(painel.includes('Dr. Lucas Residente'));
  assert.ok(painel.includes('Médico Residente R1 (Júnior)'));

  const listaP = RbacPerfisClinicosService.formatarListaPerfis();
  assert.ok(listaP.includes('CATÁLOGO DE PERFIS CLÍNICOS'));
  assert.ok(listaP.includes('Médico Preceptor / Assistente'));

  console.log('✓ Teste 13: Formatação UI para Telegram validada.');

  // ---------------------------------------------------------------------------
  // Teste 14: Integração Fastify RPC Cockpit
  // ---------------------------------------------------------------------------
  const crypto = require('crypto');
  const botToken = 'dummy-token-rbac';
  runtime.ctx.ConfigService.exigir = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : (k === 'TELEGRAM_BOT_TOKEN' ? botToken : 'dummy');
  const hashEsperado = crypto.createHmac('sha256', botToken).update('123').digest('hex');
  const fakeSession = 'ck_' + hashEsperado;

  const rpcPerfis = runtime.cockpitRpc('cockpitRbac', fakeSession, [{ acao: 'obterPerfis' }]);
  assert.strictEqual(rpcPerfis.length, 6);

  const rpcPerms = runtime.cockpitRpc('cockpitRbac', fakeSession, [{ acao: 'obterPermissoesPerfil', perfilId: 'PRECEPTOR' }]);
  assert.strictEqual(rpcPerms.perfil, 'PRECEPTOR');

  const rpcDefPerfil = runtime.cockpitRpc('cockpitRbac', fakeSession, [{
    acao: 'definirPerfilUsuario',
    usuarioId: 'user_cockpit_test',
    perfilId: 'PRECEPTOR',
    dadosExtras: { nome: 'Dra. Preceptora Cockpit', crm: '12345-MG' }
  }]);
  assert.strictEqual(rpcDefPerfil.sucesso, true);
  assert.strictEqual(rpcDefPerfil.perfil.id, 'PRECEPTOR');

  console.log('✓ Teste 14: Despacho RPC Fastify cockpitRbac validado com sucesso.');

  // ---------------------------------------------------------------------------
  // Teste 15: Relatório de Auditoria e Kaizen de Segurança
  // ---------------------------------------------------------------------------
  const relatorio = RbacPerfisClinicosService.gerarRelatorioSegurancaRbac();
  assert.strictEqual(relatorio.sucesso, true);
  assert.ok(relatorio.totalLogs > 0);
  assert.ok(relatorio.relatorioFormatado.includes('RELATÓRIO DE AUDITORIA DE PERMISSÕES & SEGURANÇA'));

  console.log('✓ Teste 15: Relatório Kaizen de auditoria e segurança gerado com sucesso.');

  console.log('\n🚀 TODOS OS 15 TESTES DO MOTOR DE PERMISSÕES E PERFIS CLÍNICOS (RBAC) PASSARAM COM SUCESSO!\n');
}

runTests();
