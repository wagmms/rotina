'use strict';
// Evidência local: não carrega runtime, não lê credenciais e não chama provedores.
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const load = file => require(path.join(root, file));
const { validateSafety, extractPatientAllergies } = load('src/clinical/safety_guard.js');
const { runAllCalculations } = load('src/clinical/calculators.js');
const { normalizeSoapInputPayload, formatClipboardSoap, formatClipboardPrescription } = load('src/clinical/soap_service.js');
const { SoapInputSchema } = load('src/clinical/schemas/soap.schema.js');

async function main() {
  const allergyCases = [
    'Alergia à amoxicilina; nega alergia à dipirona',
    'Alergia à amoxicilina e nega alergia à dipirona',
    'Nega alergia à dipirona e refere alergia à amoxicilina'
  ].map(text => {
    const soap = { subjetivo_formatado: { alergias: text }, plano: { prescricao: [{ medicamento: 'amoxicilina' }] } };
    return { text, extracted: extractPatientAllergies(soap, {}), is_safe: validateSafety(soap, {}).is_safe };
  });
  const app = load('node_modules/fastify')();
  app.post('/check', { schema: { body: SoapInputSchema } }, async req => normalizeSoapInputPayload(req.body));
  const schemaCases = [];
  try {
    for (const input of [
      { brain_dump: 'teste', patient_context: { idade: 4 }, vitals: { peso: -2, pas: 800 } },
      { brain_dump: 'teste', idade: 4, sinais_vitais: { peso: -2, pas: 800 } },
      { brain_dump: 'teste', patient_context: {}, gestante: true, alergias: 'amoxicilina' },
      { brain_dump: 'teste', idade: 'abc', gestante: 1 }
    ]) {
      const response = await app.inject({ method: 'POST', url: '/check', payload: input });
      schemaCases.push({ input, status: response.statusCode, output: response.json() });
    }
  } finally {
    await app.close();
  }
  console.log(JSON.stringify({
    allergyCases, schemaCases,
    qsofaWithoutConsciousness: runAllCalculations({ pas: 120, fr: 16 }, { idade: 40 }),
    pediatricBMI: runAllCalculations({ peso: 16, altura: 100 }, { idade: 4 }),
    emptyNote: formatClipboardSoap({ subjetivo: {}, avaliacao: {} }),
    missingPrescriptionFields: formatClipboardPrescription([{ medicamento: 'medicamento sintético' }]),
    betaBlockers: validateSafety({ plano: { prescricao: [{ medicamento: 'atenolol' }, { medicamento: 'propranolol' }] } }, {})
  }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
