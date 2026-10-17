'use strict';

// Reproduções da auditoria: somente dados sintéticos, sem chamadas externas.
// As asserções descrevem defeitos observados, não o comportamento desejado.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '../../..');
const fromRoot = name => require(path.join(root, name));
const { validateSafety } = fromRoot('src/clinical/safety_guard.js');
const { runAllCalculations } = fromRoot('src/clinical/calculators.js');
const vertexPath = require.resolve(path.join(root, 'src/ai/vertex_soap_agent.js'));
require.cache[vertexPath] = {
  id: vertexPath, filename: vertexPath, loaded: true,
  exports: { generateSoapWithVertex: async () => ({
    subjetivo_formatado: { texto_unificado: 'Cenário sintético' },
    objetivo_formatado: { texto_unificado: 'Exame não informado' },
    avaliacao: {},
    plano: { prescricao: [{ medicamento: 'amoxicilina', posologia: '5 mL 8/8 h' }] },
    _meta: { model_used: 'stub-local-sem-rede' }
  }) }
};
const { processClinicalSoap, formatClipboardSoap } = fromRoot('src/clinical/soap_service.js');

async function main() {
  const results = [];
  const allergy = validateSafety({
    subjetivo_formatado: { alergias: 'Alergia à amoxicilina; nega alergia à dipirona' },
    plano: { prescricao: [{ medicamento: 'amoxicilina' }] }
  }, { patient_context: { idade: 40 } });
  assert.equal(allergy.is_safe, true);
  assert.equal(allergy.safety_alerts.length, 0);
  results.push({ caso: 'alergia positiva perdida por negação em outra oração', is_safe: allergy.is_safe });

  const child = await processClinicalSoap({
    brain_dump: 'Caso sintético de auditoria', patient_context: { idade: 4 }, vitals: {}
  });
  assert.equal(child.is_safe, true);
  assert(child.clinical_alerts.some(alert => alert.severity === 'CRITICAL'));
  assert(child.clipboard.prescription_text.includes('amoxicilina'));
  results.push({ caso: 'alerta pediátrico crítico com is_safe verdadeiro e receita exportável',
    is_safe: child.is_safe, alertas: child.clinical_alerts.map(alert => alert.code) });

  const partial = runAllCalculations({ pas: 120 }, {});
  assert.equal(partial.metrics.qsofa, 0);
  const bmi = runAllCalculations({ peso: 16, altura: 100 }, { idade: 4 });
  assert.equal(bmi.metrics.imc_classificacao, 'Baixo peso');
  results.push({ caso: 'escores sem completude/população', qsofa_so_pas: partial.metrics.qsofa,
    imc_crianca: bmi.metrics.imc, classificacao_adulta: bmi.metrics.imc_classificacao });

  const emptyNote = formatClipboardSoap({ subjetivo: {}, avaliacao: {} });
  assert(emptyNote.includes('Red Flags: Ausentes'));
  assert(emptyNote.includes('Nega alergias'));
  results.push({ caso: 'dados ausentes viram negativas', texto: emptyNote });

  const app = fromRoot('node_modules/fastify')();
  const { SoapInputSchema } = fromRoot('src/clinical/schemas/soap.schema.js');
  app.post('/echo', { schema: { body: SoapInputSchema } }, async req => req.body);
  try {
    const response = await app.inject({ method: 'POST', url: '/echo', payload: {
      brain_dump: 'Caso sintético de auditoria', idade: 75, alergias: 'amoxicilina',
      gestante: true, sinais_vitais: { pas: 80, pad: 40 }, model_override: 'teste'
    } });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { brain_dump: 'Caso sintético de auditoria' });
    results.push({ caso: 'schema remove campos enviados pelo formulário', recebido: response.json() });
  } finally {
    await app.close();
  }

  const catalogDir = path.join(root, 'src/data/remumes');
  const national = JSON.parse(fs.readFileSync(path.join(catalogDir, 'rename_nacional.json'), 'utf8'));
  const presetFiles = fs.readdirSync(path.join(catalogDir, 'presets')).filter(name => name.endsWith('.json') && name !== 'manifest.json');
  for (const file of presetFiles) {
    const preset = JSON.parse(fs.readFileSync(path.join(catalogDir, 'presets', file), 'utf8'));
    assert.deepEqual(preset.itens, national.itens);
    assert.equal(preset.verificado, true);
  }
  // Este CSV tem uma coluna; valores com vírgula vêm entre aspas CSV.
  const municipal = fs.readFileSync(path.join(root, 'REMUME_RP.csv'), 'utf8').trim()
    .split(/\r?\n/).slice(1).map(line => line.startsWith('"') && line.endsWith('"')
      ? line.slice(1, -1).replace(/""/g, '"') : line);
  assert.deepEqual(national.itens, municipal);
  results.push({ caso: 'catálogos de localidades distintas idênticos ao CSV de Ribeirão Preto',
    presets: presetFiles.length, itens: national.itens.length });
  console.log(JSON.stringify(results, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
