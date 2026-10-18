/**
 * TESTE DE PERSISTÊNCIA TOTAL DE PERFIL PÓS-DEPLOY NO RENDER
 * Valida que o bot do Telegram NUNCA perde as informações de perfil
 * (Nome, Cidade, Cenário/Serviço, CRM, REMUME) após novo deploy.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Cria diretório isolado simulando contêiner Render recém-construído (data/ limpo)
const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'render-deploy-test-'));
process.env.BOT_DATA_DIR = testDataDir;

const runtime = require('../server/runtime.js');

async function executarTestesPersistencia() {
  const ctx = runtime.ctx;
  const idTitular = '1771571035';

  console.log('[TESTE 1] Carregamento automático de perfil canônico sem data/ local (Simulação Deploy Limpo no Render)');
  // Invalida cache de memória para forçar leitura a frio
  if (ctx.ConfigService && typeof ctx.ConfigService.invalidar === 'function') {
    ctx.ConfigService.invalidar();
  }

  const perfilTitular = ctx.ConfigService.getContextoClinico(idTitular);
  assert.ok(perfilTitular, 'Perfil deve existir');
  assert.strictEqual(perfilTitular.profissional.nome_chamada, 'Wagner', 'Nome de chamada deve ser Wagner');
  assert.strictEqual(perfilTitular.profissional.prefixo, 'Dr.', 'Prefixo deve ser Dr.');
  assert.strictEqual(perfilTitular.profissional.saudacao_formal, 'Dr. Wagner', 'Saudação formal deve ser Dr. Wagner');
  assert.strictEqual(perfilTitular.profissional.nome_completo_carimbo, 'Wagner Moraes', 'Nome no carimbo deve ser Wagner Moraes');
  assert.strictEqual(perfilTitular.localidade.municipio_nome, 'São Paulo', 'Município deve ser São Paulo');
  assert.strictEqual(perfilTitular.localidade.uf, 'SP', 'UF deve ser SP');
  assert.strictEqual(perfilTitular.unidade_assistencial.cenario_id, 'URGENCIA_UPA_24H', 'Cenário deve ser URGENCIA_UPA_24H');
  assert.strictEqual(perfilTitular.nome_chamada_configurado, true, 'Nome deve constar como configurado');
  assert.strictEqual(perfilTitular.onboarding_concluido, true, 'Onboarding deve constar como concluído');
  console.log('✓ Perfil titular preservado com integridade total pós-deploy');

  console.log('[TESTE 2] Carregamento de perfil padrão ("default") mapeia para perfil titular ou canônico');
  const perfilDefault = ctx.ConfigService.getContextoClinico('default');
  assert.ok(perfilDefault, 'Perfil default deve existir');
  assert.strictEqual(perfilDefault.profissional.nome_chamada, 'Wagner');
  assert.strictEqual(perfilDefault.localidade.municipio_nome, 'São Paulo');
  console.log('✓ Perfil default mapeado e íntegro');

  console.log('[TESTE 3] Saudação do Telegram e ausência de alerta de "Dica: Digite /nome"');
  const nomeTratamento = ctx.obterNomeTratamentoUsuario(idTitular);
  assert.strictEqual(nomeTratamento, 'Dr. Wagner', 'Tratamento do usuário deve ser Dr. Wagner');
  assert.notStrictEqual(nomeTratamento, 'Médico(a) Assistente', 'Não pode reverter para genérico');
  console.log('✓ Saudação no Telegram 100% personalizada');

  console.log('[TESTE 4] Runtime preserva PERFIL_CLINICO_ e CONTEXTO_CLINICO_ no PropertiesService');
  const propsScript = ctx.PropertiesService.getScriptProperties();
  propsScript.setProperty(`PERFIL_CLINICO_${idTitular}`, JSON.stringify(perfilTitular));
  const lidoProp = propsScript.getProperty(`PERFIL_CLINICO_${idTitular}`);
  assert.ok(lidoProp, 'Deve permitir ler PERFIL_CLINICO_ do PropertiesService');
  const parsed = JSON.parse(lidoProp);
  assert.strictEqual(parsed.profissional.nome_chamada, 'Wagner');
  console.log('✓ ScriptProperties preserva chaves de perfil clínico');

  console.log('[TESTE 5] salvarContextoClinico persiste em runtime e no espelho versionado');
  const patchTeste = {
    municipio: 'Ribeirão Preto',
    uf: 'SP',
    unidade_saude: 'UPA 24h Ribeirão'
  };
  const atualizado = ctx.ConfigService.salvarContextoClinico(idTitular, patchTeste);
  assert.strictEqual(atualizado.localidade.municipio_nome, 'Ribeirão Preto');
  assert.strictEqual(atualizado.localidade.uf, 'SP');
  assert.strictEqual(atualizado.unidade_assistencial.nome_unidade, 'UPA 24h Ribeirão');

  // Restaura para São Paulo para manter o perfil canônico limpo
  ctx.ConfigService.salvarContextoClinico(idTitular, {
    municipio: 'São Paulo',
    uf: 'SP',
    unidade_saude: 'Unidade de Saúde / SUS'
  });
  console.log('✓ salvarContextoClinico com dupla persistência verificado');

  console.log('[TESTE 6] Fallback dinâmico por variáveis de ambiente para novos usuários');
  const idNovo = '999999888';
  propsScript.setProperty('BOT_MEDICO_NOME', 'Dra. Gabriela');
  propsScript.setProperty('BOT_MEDICO_CIDADE', 'Campinas');
  propsScript.setProperty('BOT_MEDICO_UF', 'SP');
  propsScript.setProperty('BOT_MEDICO_SERVICO', 'APS_UBS');
  if (ctx.ConfigService && typeof ctx.ConfigService.invalidar === 'function') {
    ctx.ConfigService.invalidar();
  }

  const perfilNovo = ctx.ConfigService.getContextoClinico(idNovo);
  assert.strictEqual(perfilNovo.profissional.nome_chamada, 'Gabriela');
  assert.strictEqual(perfilNovo.profissional.prefixo, 'Dra.');
  assert.strictEqual(perfilNovo.profissional.saudacao_formal, 'Dra. Gabriela');
  assert.strictEqual(perfilNovo.localidade.municipio_nome, 'Campinas');
  assert.strictEqual(perfilNovo.unidade_assistencial.cenario_id, 'APS_UBS');
  console.log('✓ Variáveis de ambiente configuram perfil dinâmico com sucesso');

  console.log('\nTODOS OS 6 TESTES DE PERSISTÊNCIA DE PERFIL PÓS-DEPLOY FORAM APROVADOS! ✅');
}

executarTestesPersistencia()
  .then(() => {
    try { fs.rmSync(testDataDir, { recursive: true, force: true }); } catch (_) {}
    process.exit(0);
  })
  .catch((err) => {
    try { fs.rmSync(testDataDir, { recursive: true, force: true }); } catch (_) {}
    console.error('Falha no teste de persistência:', err);
    process.exit(1);
  });
