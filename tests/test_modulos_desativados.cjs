'use strict';
// Contrato de retirada documentado no commit 498b4a5, preservando autorização RPC.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const runtime = require('../server/runtime.js');
const modules = {
  analgesia_pca: 'cockpitAnalgesiaPca',
  auditoria_kaizen_clinico: 'cockpitAuditoriaKaizen',
  auditoria_infusao_uti: 'cockpitAuditarInfusaoUti',
  auditoria_y_site: 'cockpitAuditarYSite',
  mecanica_pulmonar_sdra: 'cockpitSdraMecanica',
  suporte_nutricional: 'cockpitSuporteNutricional',
  transfusao_sanguinea: 'cockpitTransfusaoSanguinea'
};

async function main() {
  const session = runtime.ctx.criarSessaoCockpit_(process.env.TELEGRAM_CHAT_ID);
  assert(session, 'Sessão válida necessária para verificar as rotas retiradas');
  for (const [name, route] of Object.entries(modules)) {
    assert(!fs.existsSync(path.join(__dirname, '../src', `02_${name}.js`)), `${name}: módulo retirado não deve reaparecer`);
    await assert.rejects(async () => runtime.cockpitRpc(route, '', [{}]), /sessão|sessao|inválid|invalid|expir/i,
      `${route}: retirada do módulo não dispensa autenticação`);
    const result = await runtime.cockpitRpc(route, session, [{}]);
    assert.equal(result.sucesso, false, `${route}: não pode simular sucesso clínico`);
    assert.equal(result.desativado, true, `${route}: deve informar desativação`);
    assert.equal(typeof result.mensagem, 'string');
    assert(result.mensagem.trim().length > 0, `${route}: resposta deve orientar o usuário`);
    assert.equal(result.dados, undefined, `${route}: não deve gerar resultados do módulo retirado`);
    console.log(`DESATIVACAO_VALIDADA:${name}`);
  }
  // O módulo pediátrico preservado pela decisão de retirada continua disponível.
  assert(fs.existsSync(path.join(__dirname, '../src/02_suporte_nutricional_pediatrico.js')));
  assert.equal(typeof runtime.ctx.cockpitSuporteNutricionalPediatrico, 'function');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
