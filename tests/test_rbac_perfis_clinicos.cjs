const assert = require('assert');
const { RbacPerfisClinicosService } = require('../src/02_rbac_perfis_clinicos');
const runtime = require('../server/runtime');
const crypto = require('crypto');

function runTests() {
  console.log('Iniciando suite de testes: Motor de Permissões e Perfis Clínicos (RBAC)');

  // ---------------------------------------------------------------------------
  // Teste 1: Estrutura dos Perfis Clínicos e Níveis Hierárquicos
  // ---------------------------------------------------------------------------
  const perfis = RbacPerfisClinicosService.obterPerfis();
  assert.strictEqual(perfis.length, 6, 'Devem existir 6 perfis clínicos mapeados');
  const ids = perfis.map(p => p.id);
  assert.ok(ids.includes('ACADEMICO'));
  assert.ok(ids.includes('RESIDENTE_R1'));
  assert.ok(ids.includes('RESIDENTE_R2'));
  assert.ok(ids.includes('RESIDENTE_R3_R4'));
  assert.ok(ids.includes('PRECEPTOR'));
  assert.ok(ids.includes('FARMACEUTICO_CLINICO'));
  console.log('✓ Teste 1: Estrutura e catálogo de perfis clínicos validados.');

  // ---------------------------------------------------------------------------
  // Teste 2: Permissões e Bloqueios do Acadêmico de Medicina (Interno)
  // ---------------------------------------------------------------------------
  const academico = { usuarioId: 'user_academico', nome: 'Interno João', perfil: 'ACADEMICO' };

  // Ações permitidas
  const permConsulta = RbacPerfisClinicosService.verificarPermissao(academico, 'consultar_protocolos');
  assert.strictEqual(permConsulta.autorizado, true);
  const permCalculo = RbacPerfisClinicosService.verificarPermissao(academico, 'executar_calculadoras_clinicas');
  assert.strictEqual(permCalculo.autorizado, true);
  const permRascunho = RbacPerfisClinicosService.verificarPermissao(academico, 'redigir_soap_rascunho');
  assert.strictEqual(permRascunho.autorizado, true);

  // Ações bloqueadas (exigem co-validação)
  const permLiberarPrescricao = RbacPerfisClinicosService.verificarPermissao(academico, 'liberar_prescricao_hospitalar_ativa');
  assert.strictEqual(permLiberarPrescricao.autorizado, false);
  assert.strictEqual(permLiberarPrescricao.exigeSupervisao, true);
  assert.strictEqual(permLiberarPrescricao.permiteCoAssinaturaPreceptorial, true);

  const permAltaLeito = RbacPerfisClinicosService.verificarPermissao(academico, 'alterar_status_leito_alta');
  assert.strictEqual(permAltaLeito.autorizado, false);
  console.log('✓ Teste 2: Permissões de aprendizado e salvaguardas de acadêmico validadas.');

  // ---------------------------------------------------------------------------
  // Teste 3: Autonomia e Supervisão do Residente R1 (Júnior)
  // ---------------------------------------------------------------------------
  const residenteR1 = { usuarioId: 'user_r1', nome: 'Dra. Maria (R1)', crm: '123456-SP', perfil: 'RESIDENTE_R1' };

  const permSoapOficial = RbacPerfisClinicosService.verificarPermissao(residenteR1, 'redigir_soap_definitivo');
  assert.strictEqual(permSoapOficial.autorizado, true);
  const permPrescEnf = RbacPerfisClinicosService.verificarPermissao(residenteR1, 'prescrever_enfermaria_basica');
  assert.strictEqual(permPrescEnf.autorizado, true);

  // Trombolítico exige co-assinatura para R1
  const permTrombolitico = RbacPerfisClinicosService.verificarPermissao(residenteR1, 'prescrever_tromboliticos_sem_coassinatura');
  assert.strictEqual(permTrombolitico.autorizado, false);
  console.log('✓ Teste 3: Autonomia assistencial e supervisão de R1 validadas.');

  // ---------------------------------------------------------------------------
  // Teste 4: Autonomia de Residente Sênior R3/R4 e Preceptor
  // ---------------------------------------------------------------------------
  const preceptor = { usuarioId: 'user_staff', nome: 'Dr. Wagner (Preceptor)', crm: '999999-SP', perfil: 'PRECEPTOR' };

  const permPreceptorPresc = RbacPerfisClinicosService.verificarPermissao(preceptor, 'prescrever_farmacos_alta_vigilancia');
  assert.strictEqual(permPreceptorPresc.autorizado, true);
  const permPreceptorAlta = RbacPerfisClinicosService.verificarPermissao(preceptor, 'conceder_alta_complexa_definitiva');
  assert.strictEqual(permPreceptorAlta.autorizado, true);
  console.log('✓ Teste 4: Autoridade preceptorial irrestrita validada.');

  // ---------------------------------------------------------------------------
  // Teste 5: Farmacêutico Clínico (Auditoria sem Prerrogativa de Prescrição Médica)
  // ---------------------------------------------------------------------------
  const farmaceutico = { usuarioId: 'user_farm', nome: 'Farm. Carlos', perfil: 'FARMACEUTICO_CLINICO' };

  const permAuditarY = RbacPerfisClinicosService.verificarPermissao(farmaceutico, 'auditar_compatibilidade_y_site');
  assert.strictEqual(permAuditarY.autorizado, true);
  const permBloquearInseguro = RbacPerfisClinicosService.verificarPermissao(farmaceutico, 'bloquear_dispensacao_farmaceutica_insegura');
  assert.strictEqual(permBloquearInseguro.autorizado, true);

  const permPrescrever = RbacPerfisClinicosService.verificarPermissao(farmaceutico, 'prescrever_medicamentos_diretamente');
  assert.strictEqual(permPrescrever.autorizado, false);
  console.log('✓ Teste 5: Prerrogativas de farmacovigilância e barreiras privativas médicas validadas.');

  // ---------------------------------------------------------------------------
  // Teste 6: Auditoria de Prescrição Hospitalar e Fármacos de Alta Vigilância
  // ---------------------------------------------------------------------------
  // Caso 1: R1 prescrevendo antibiótico comum (autorizado)
  const auditR1Comum = RbacPerfisClinicosService.validarPrescricaoPorPerfil(residenteR1, {
    itens: ['Ceftriaxona 1g IV de 24/24h', 'Dipirona 1g IV se dor ou febre']
  });
  assert.strictEqual(auditR1Comum.liberacaoAutorizada, true);
  assert.strictEqual(auditR1Comum.exigeCoAssinatura, false);

  // Caso 2: Acadêmico prescrevendo antibiótico comum (exige co-assinatura formal)
  const auditAcademico = RbacPerfisClinicosService.validarPrescricaoPorPerfil(academico, {
    itens: ['Ceftriaxona 1g IV de 24/24h']
  });
  assert.strictEqual(auditAcademico.liberacaoAutorizada, false);
  assert.strictEqual(auditAcademico.exigeCoAssinatura, true);
  assert.ok(auditAcademico.bloqueiosCriticos.some(b => b.tipo === 'PERFIL_ACADEMICO'));

  // Caso 3: R1 prescrevendo Alteplase (Trombolítico de Alta Vigilância) -> Exige co-assinatura
  const auditR1Trombolise = RbacPerfisClinicosService.validarPrescricaoPorPerfil(residenteR1, {
    itens: ['Alteplase 0.9 mg/kg IV para AVC isquêmico agudo']
  });
  assert.strictEqual(auditR1Trombolise.liberacaoAutorizada, false);
  assert.strictEqual(auditR1Trombolise.exigeCoAssinatura, true);
  assert.ok(auditR1Trombolise.alertasSupervisao.some(a => a.medicamento === 'alteplase'));

  // Caso 4: Preceptor prescrevendo Alteplase -> Totalmente autorizado
  const auditPreceptorTrombolise = RbacPerfisClinicosService.validarPrescricaoPorPerfil(preceptor, {
    itens: ['Alteplase 0.9 mg/kg IV']
  });
  assert.strictEqual(auditPreceptorTrombolise.liberacaoAutorizada, true);
  assert.strictEqual(auditPreceptorTrombolise.exigeCoAssinatura, false);
  console.log('✓ Teste 6: Auditoria de alta vigilância e bloqueio por perfil clínico validados.');

  // ---------------------------------------------------------------------------
  // Teste 7: Bloqueio Fatal de Infusão Direta de Cloreto de Potássio 19,1% (Evento Sentinela)
  // ---------------------------------------------------------------------------
  const auditKclFatal = RbacPerfisClinicosService.validarPrescricaoPorPerfil(residenteR1, {
    itens: ['Cloreto de Potassio 19,1% 10 mL IV direto em bolus']
  });
  assert.strictEqual(auditKclFatal.liberacaoAutorizada, false);
  assert.ok(auditKclFatal.bloqueiosCriticos.some(b => b.tipo === 'EVENTO_SENTINELA_LETAL'));
  console.log('✓ Teste 7: Bloqueio preventivo de evento sentinela (KCl 19,1% em bolus) validado.');

  // ---------------------------------------------------------------------------
  // Teste 8: Fluxo de Criação de Pendência e Chancela Preceptorial
  // ---------------------------------------------------------------------------
  const pendencia = RbacPerfisClinicosService.criarPendenciaCoAssinatura(academico, {
    tipo: 'liberacao_prescricao_hospitalar',
    paciente: 'Carlos Eduardo, 58a',
    leito: 'Leito 14B',
    itens: ['Amoxicilina-Clavulanato 1.2g IV 8/8h']
  });

  assert.strictEqual(pendencia.sucesso, true);
  assert.strictEqual(pendencia.status, 'PENDENTE');
  assert.ok(pendencia.pendenciaId.startsWith('pend_'));

  // Preceptor chancela a pendência
  const chancela = RbacPerfisClinicosService.chancelarCoAssinatura(preceptor, pendencia.pendenciaId, 'Conduta adequada e liberada.');
  assert.strictEqual(chancela.sucesso, true);
  assert.strictEqual(chancela.status, 'CHANCELADO_E_LIBERADO');
  assert.strictEqual(chancela.chanceladoPor.nome, 'Dr. Wagner (Preceptor)');
  console.log('✓ Teste 8: Fluxo completo de pendência e co-assinatura preceptorial validado.');

  // ---------------------------------------------------------------------------
  // Teste 9: Break-the-Glass (Bypass de Emergência Médica)
  // ---------------------------------------------------------------------------
  // Acadêmico em situação de PCR tenta ação restrita antes do bypass
  const antesBypass = RbacPerfisClinicosService.verificarPermissao(academico, 'prescrever_farmacos_alta_vigilancia');
  assert.strictEqual(antesBypass.autorizado, false);

  // Ativação do Break-the-Glass por motivo de PCR
  const bypass = RbacPerfisClinicosService.ativarBypassEmergencia(academico, 'PCR em andamento / Parada Cardiorrespiratória em assistolia no leito 12');
  assert.strictEqual(bypass.sucesso, true);
  assert.strictEqual(bypass.bypassAtivo, true);

  // Com o bypass ativo, a permissão é concedida excepcionalmente
  const duranteBypass = RbacPerfisClinicosService.verificarPermissao(academico, 'prescrever_farmacos_alta_vigilancia');
  assert.strictEqual(duranteBypass.autorizado, true);
  assert.strictEqual(duranteBypass.bypassEmergenciaAtivo, true);

  // Desativação do bypass
  const encerramentoBypass = RbacPerfisClinicosService.desativarBypassEmergencia(academico);
  assert.strictEqual(encerramentoBypass.sucesso, true);
  assert.strictEqual(encerramentoBypass.bypassAtivo, false);

  // Após desativação, as restrições normais são restabelecidas
  const posBypass = RbacPerfisClinicosService.verificarPermissao(academico, 'prescrever_farmacos_alta_vigilancia');
  assert.strictEqual(posBypass.autorizado, false);
  console.log('✓ Teste 9: Protocolo Break-the-Glass (Bypass de Emergência Médica) validado.');

  // ---------------------------------------------------------------------------
  // Teste 10: Relatório de Segurança e Auditoria RBAC
  // ---------------------------------------------------------------------------
  const relatorio = RbacPerfisClinicosService.gerarRelatorioSegurancaRbac();
  assert.strictEqual(relatorio.sucesso, true);
  assert.ok(relatorio.totalLogs > 0);
  assert.ok(relatorio.totalBloqueios > 0);
  assert.ok(relatorio.totalBypasses > 0);
  assert.ok(relatorio.relatorioFormatado.includes('RELATÓRIO DE AUDITORIA DE PERMISSÕES & SEGURANÇA'));
  console.log('✓ Teste 10: Auditoria e métricas Kaizen de segurança validadas.');

  // ---------------------------------------------------------------------------
  // Teste 11: Integração Fastify RPC via server/runtime.js (cockpitRbac)
  // ---------------------------------------------------------------------------
  const botToken = 'dummy-token';
  runtime.ctx.ConfigService.exigir = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : (k === 'TELEGRAM_BOT_TOKEN' ? botToken : 'dummy');
  const hashEsperado = crypto.createHmac('sha256', botToken).update('123').digest('hex');
  const fakeSession = 'ck_' + hashEsperado;

  const rpcPerfis = runtime.cockpitRpc('cockpitRbac', fakeSession, [{ acao: 'obterPerfis' }]);
  assert.strictEqual(Array.isArray(rpcPerfis), true);
  assert.strictEqual(rpcPerfis.length, 6);

  const rpcVerificar = runtime.cockpitRpc('cockpitRbac', fakeSession, [{
    acao: 'verificarPermissao',
    usuarioContexto: { perfil: 'ACADEMICO' },
    recurso: 'liberar_prescricao_hospitalar_ativa'
  }]);
  assert.strictEqual(rpcVerificar.autorizado, false);

  const rpcValidar = runtime.cockpitRpc('cockpitRbac', fakeSession, [{
    acao: 'validarPrescricaoPorPerfil',
    usuarioContexto: { perfil: 'RESIDENTE_R1' },
    dadosPrescricao: { itens: ['Alteplase 50mg'] }
  }]);
  assert.strictEqual(rpcValidar.exigeCoAssinatura, true);

  console.log('✓ Teste 11: Integração Fastify RPC (cockpitRbac) 100% validada.');

  console.log('\n🚀 TODOS OS TESTES DE RBAC E PERFIS CLÍNICOS PASSARAM COM SUCESSO!\n');
}

runTests();
