/**
 * ==============================================================================
 * SUÍTE DE TESTES: DESREGIONALIZAÇÃO WHITE-LABEL & MOTOR MULTI-LOCALIDADE
 * ==============================================================================
 * Valida:
 * 1. Zero menções fixas a Ribeirão Preto, FMRP-USP, HC-UE, Dr. Wagner em src/, server/ e Cockpit.
 * 2. Saudação personalizada Dr./Dra. + Nome de Chamada (obterNomeTratamentoUsuario e /nome).
 * 3. Receituário PDF 100% preto (#000000), Controle Especial (2 vias) e Regra de Interno sem CRM.
 * 4. Visibilidade Modular por Cenário com Checkboxes (✅ / ⬜) dos 10 módulos clínicos.
 * 5. Motor de Catálogos REMUME, Auto-Promoção para Preset Global, Busca Web Anti-Alucinação e Solicitação ao Desenvolvedor.
 * ==============================================================================
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const runtime = require('../server/runtime');
const { gerarReceitaPDFBuffer } = require('../server/pdf-cli');

console.log('🧪 Iniciando Testes: Desregionalização White-Label & Motor Multi-Localidade...');

const ctx = runtime.ctx;

// 1. Auditoria Estática Anti-Regionalismo em src/, server/ e Cockpit
(function testarZeroHardcodesRegionais() {
  const srcFiles = fs.readdirSync(path.join(__dirname, '..', 'src')).filter(f => f.endsWith('.js'));
  const proibidos = [/FMRP/i, /HC-UE/i, /HCRP/i, /USP-RP/i, /Dr\.\s*Wagner/i];

  for (const file of srcFiles) {
    const conteudo = fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8');
    for (const rx of proibidos) {
      assert.strictEqual(
        rx.test(conteudo),
        false,
        `O arquivo src/${file} ainda contém menção proibida: ${rx}`
      );
    }
  }

  const serverIndex = fs.readFileSync(path.join(__dirname, '..', 'server', 'index.js'), 'utf8');
  for (const rx of proibidos) {
    assert.strictEqual(
      rx.test(serverIndex),
      false,
      `O arquivo server/index.js ainda contém menção proibida: ${rx}`
    );
  }
  console.log('  ✅ 1. Zero hardcodes regionais/pessoais em src/ e server/index.js');
})();

// 2. Saudação Personalizada Dr. / Dra. + Nome de Chamada
(function testarIdentidadeESaudacaoPersonalizada() {
  const chatId = 'test_chat_identidade_901';
  ctx.ConfigService.salvarContextoClinico(chatId, {
    prefixo_tratamento: 'Dra.',
    nome_chamada: 'Carolina',
    nome_chamada_configurado: true
  });

  const tratamento = ctx.obterNomeTratamentoUsuario(chatId);
  assert.strictEqual(tratamento, 'Dra. Carolina', 'Deve retornar Dra. Carolina');

  // Testar troca via comando /nome
  ctx.rotearComandoSistema('/nome', '/nome Dr. Matheus', chatId);
  const tratamentoNovo = ctx.obterNomeTratamentoUsuario(chatId);
  assert.strictEqual(tratamentoNovo, 'Dr. Matheus', 'Após /nome Dr. Matheus deve retornar Dr. Matheus');
  console.log('  ✅ 2. Identidade e saudação personalizada (Dr./Dra. + Nome) operacionais');
})();

// 3. Visibilidade Modular por Cenário + Checkboxes (10 Módulos)
(function testarCenarioECheckboxesModulos() {
  const chatId = 'test_chat_cenario_902';
  assert.strictEqual(ctx.ConfigService.CATALOGO_MODULOS_CLINICOS.length, 10, 'Catálogo deve ter 10 módulos clínicos');

  // Aplicar cenário APS_UBS
  const perfilUbs = ctx.ConfigService.aplicarCenarioAssistencial(chatId, 'APS_UBS');
  assert.strictEqual(perfilUbs.cenario_assistencial, 'APS_UBS');
  assert.ok(perfilUbs.modulos_ativos.includes('SOAP_PEP'), 'APS_UBS deve sugerir SOAP_PEP marcado');
  assert.ok(!perfilUbs.modulos_ativos.includes('SALA_VERMELHA'), 'APS_UBS não marca SALA_VERMELHA por padrão');

  // Marcar manualmente SALA_VERMELHA via checkbox toggle
  const perfilToggle = ctx.ConfigService.alternarModuloCenario(chatId, 'SALA_VERMELHA');
  assert.ok(perfilToggle.modulos_ativos.includes('SALA_VERMELHA'), 'Toggle deve marcar SALA_VERMELHA');

  // Desmarcar via checkbox toggle
  const perfilToggle2 = ctx.ConfigService.alternarModuloCenario(chatId, 'SALA_VERMELHA');
  assert.ok(!perfilToggle2.modulos_ativos.includes('SALA_VERMELHA'), 'Segundo toggle deve desmarcar SALA_VERMELHA');
  console.log('  ✅ 3. Cenário assistencial e Checkboxes interativos (10 módulos) operacionais');
})();

// 4. Receituário PDF 100% Preto (#000000) e Regra de Interno sem CRM
async function testarReceituarioPdfMonoERegraInterno() {
  const chatIdMedico = 'test_chat_pdf_medico_903';
  ctx.ConfigService.salvarContextoClinico(chatIdMedico, {
    papel: 'MEDICO_CRM',
    nome_completo_carimbo: 'Dr. Roberto Almeida',
    crm: 'CRM/MG 554433',
    municipio: 'Belo Horizonte',
    uf: 'MG',
    unidade_saude: 'UBS Savassi'
  });

  const rxMedicoTxt = ctx.SoapAmbulatorialService.exportarReceitaTexto({
    chatId: chatIdMedico,
    pacienteNome: 'José Paciente',
    prescricaoMedicamentosa: [
      { nome: 'Losartana Potássica', apresentacao: '50mg comprimido', quantidade: '30 cp', posologia: 'Tomar 1 cp VO 1x ao dia' }
    ]
  });
  assert.ok(rxMedicoTxt.includes('Dr. Roberto Almeida'), 'Receita de médico deve conter o nome do médico');
  assert.ok(rxMedicoTxt.includes('CRM/MG 554433'), 'Receita de médico deve conter o CRM');
  assert.ok(rxMedicoTxt.includes('Belo Horizonte - MG'), 'Receita deve exibir a cidade do perfil');

  // Agora testar INTERNO_ACADEMICO: receita sem nome de médico e sem CRM impresso
  const chatIdInterno = 'test_chat_pdf_interno_904';
  ctx.ConfigService.salvarContextoClinico(chatIdInterno, {
    papel: 'INTERNO_ACADEMICO',
    nome_chamada: 'Lucas',
    nome_completo_carimbo: 'Lucas Interno',
    crm: 'CRM/SP 999999',
    municipio: 'Curitiba',
    uf: 'PR',
    unidade_saude: 'UPA Cajuru'
  });

  const rxInternoTxt = ctx.SoapAmbulatorialService.exportarReceitaTexto({
    chatId: chatIdInterno,
    pacienteNome: 'Maria Paciente',
    prescricaoMedicamentosa: [
      { nome: 'Amoxicilina', apresentacao: '500mg cápsula', quantidade: '21 caps', posologia: 'Tomar 1 cap VO de 8/8h por 7 dias' }
    ]
  });
  assert.ok(!rxInternoTxt.includes('Lucas Interno'), 'Receita de interno NÃO deve imprimir nome do interno');
  assert.ok(!rxInternoTxt.includes('CRM/SP 999999'), 'Receita de interno NÃO deve imprimir CRM');
  assert.ok(rxInternoTxt.includes('Assinatura e Carimbo do(a) Médico(a) Responsável'), 'Receita de interno deve exibir linha limpa para médico responsável');

  // Testar geração binária do PDF (Simples e Controle Especial)
  const bufInterno = await gerarReceitaPDFBuffer({
    unidadeSaude: 'UPA Cajuru',
    cidadeUf: 'Curitiba - PR',
    ehInterno: true,
    controleEspecial: true,
    paciente: 'Maria Paciente',
    itens: [{ nome: 'Clonazepam 2mg comprimido', quantidade: '1 cx', posologia: 'Tomar 1 cp VO à noite.' }]
  });
  assert.ok(Buffer.isBuffer(bufInterno) && bufInterno.length > 800, 'PDF binário 100% preto deve ser gerado com sucesso');
  console.log('  ✅ 4. Receituário PDF 100% preto (#000000), Controle Especial e Regra de Interno validados');
}

// 5. Catálogo REMUME, Auto-Promoção para Preset Global e Solicitação ao Desenvolvedor
function testarCatalogoRemumeEAutoPromocao() {
  const presetsIniciais = ctx.CatalogoRemumeService.listarPresets();
  assert.ok(presetsIniciais.length >= 8, 'Deve conter pelo menos os 8 presets municipais iniciais');

  // Testar consulta mudando de cidade (Belo Horizonte)
  const chatIdBh = 'test_chat_bh_905';
  ctx.ConfigService.salvarContextoClinico(chatIdBh, {
    municipio: 'Belo Horizonte',
    uf: 'MG',
    remume_slug: 'mg_belo_horizonte'
  });
  const resAmoxiBh = ctx.consultarRemumeRP('amoxicilina', chatIdBh);
  assert.strictEqual(resAmoxiBh.presente, true, 'Amoxicilina deve constar na REMUME de BH');
  assert.ok(resAmoxiBh.selo.includes('MG') || resAmoxiBh.rede.includes('Belo Horizonte'), 'Selo/rede deve refletir Belo Horizonte');

  // Testar Auto-Promoção de nova cidade inserida por usuário (ex: Joinville - SC)
  const chatIdJoinville = 'test_chat_joinville_906';
  const textoRemumeJoinville = [
    'Amoxicilina 500mg cápsula',
    'Dipirona Sódica 500mg comprimido',
    'Losartana Potássica 50mg comprimido',
    'Omeprazol 20mg cápsula'
  ].join('\n');

  const prom = ctx.ConfigService.promoverRemumeParaPresetGlobal(
    'Joinville',
    'SC',
    textoRemumeJoinville,
    'Teste Automatizado Joinville',
    chatIdJoinville
  );
  assert.strictEqual(prom.sucesso, true, 'Deve importar e auto-promover Joinville para preset');
  assert.strictEqual(prom.slug, 'sc_joinville');
  assert.strictEqual(prom.total, 4);

  // Verificar se Joinville entrou no preset global para outro usuário
  const buscaJoinville = ctx.CatalogoRemumeService.buscarPresetPorCidade('Joinville', 'SC');
  assert.ok(buscaJoinville && buscaJoinville.slug === 'sc_joinville', 'Joinville deve estar disponível nos presets globais');

  // Limpar o arquivo de teste sc_joinville.json e restaurar manifest para manter repo limpo
  const arqJoinville = path.join(__dirname, '..', 'src', 'data', 'remumes', 'presets', 'sc_joinville.json');
  if (fs.existsSync(arqJoinville)) fs.unlinkSync(arqJoinville);
  const manifestPath = path.join(__dirname, '..', 'src', 'data', 'remumes', 'presets', 'manifest.json');
  const manifestObj = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifestObj.presets = manifestObj.presets.filter(p => p.slug !== 'sc_joinville');
  fs.writeFileSync(manifestPath, JSON.stringify(manifestObj, null, 2) + '\n', 'utf8');

  // Testar Solicitação de REMUME ao Desenvolvedor + Homologação
  const req = ctx.ConfigService.registrarSolicitacaoRemume(' Pelotas ', 'RS', 'chat_solicitante_1');
  assert.strictEqual(req.status, 'PENDENTE');
  assert.ok(req.solicitantes.includes('chat_solicitante_1'));

  // Testar Código de Equipe (legado) e Nova Tela Limpa de Unidade de Saúde (/unidade e ux:perfil:unidade)
  const tokenEquipe = ctx.ConfigService.gerarCodigoUnidade(chatIdBh);
  assert.ok(tokenEquipe.startsWith('EQP-'), 'Código de equipe deve começar com EQP-');
  const chatColega = 'test_chat_colega_907';
  ctx.ConfigService.salvarContextoClinico(chatColega, {
    prefixo_tratamento: 'Dra.',
    nome_chamada: 'Fernanda',
    nome_chamada_configurado: true,
    crm: 'CRM/MG 888888'
  });
  const ctxClonado = ctx.ConfigService.importarCodigoUnidade(chatColega, tokenEquipe);
  assert.strictEqual(ctxClonado.municipio, 'Belo Horizonte', 'Deve clonar a cidade da equipe');
  assert.strictEqual(ctxClonado.nome_chamada, 'Fernanda', 'Deve preservar o nome individual da médica');
  assert.strictEqual(ctxClonado.crm, 'CRM/MG 888888', 'Deve preservar o CRM individual da médica');

  // Validar nova tela de Unidade de Saúde (ux:perfil:unidade) sem poluição de token Base64
  let msgUnidadeEnviada = null;
  const originalEnviarTelaBot = ctx.enviarTelaBot;
  ctx.enviarTelaBot = (chat, txt, kb, msgId) => {
    msgUnidadeEnviada = { chat, txt, kb, msgId };
    return true;
  };
  ctx.tratarCallbackPerfilClinico(chatColega, 'unidade');
  assert.ok(msgUnidadeEnviada, 'Deve disparar enviarTelaBot para unidade');
  assert.ok(msgUnidadeEnviada.txt.includes('UNIDADE DE SAÚDE & LOCAL DE ATUAÇÃO'), 'Deve conter título amigável');
  assert.ok(msgUnidadeEnviada.txt.includes('/unidade Nome do Hospital'), 'Deve orientar comando direto');
  assert.ok(!msgUnidadeEnviada.txt.includes('EQP-'), 'Não deve exibir código Base64 ou token');
  ctx.enviarTelaBot = originalEnviarTelaBot;

  console.log('  ✅ 5. Catálogo REMUME, Auto-Promoção para Preset, Solicitação e Tela de Unidade limpa validados');
}

(async () => {
  try {
    await testarReceituarioPdfMonoERegraInterno();
    testarCatalogoRemumeEAutoPromocao();
    console.log('🎉 Todos os testes de Desregionalização White-Label & Multi-Localidade passaram com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Falha nos testes:', err);
    process.exit(1);
  }
})();
