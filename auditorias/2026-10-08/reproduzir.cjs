// Auditoria isolada: sem credenciais, rede, runtime de produção ou envios.
// As asserções confirmam defeitos observados; NÃO são critérios de aprovação clínica.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const c = { console };
vm.createContext(c);
for (const file of ['00_config.js', '01_utils.js', '02_calculadoras_puras.js', '03_bases_locais.js', '04_motores_ia.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'src', file), 'utf8'), c, { filename: file });
}
const evidence = [];
function check(id, observed, predicate) {
  assert(predicate(observed), id + ': comportamento mudou; reavaliar achado');
  evidence.push({ id, observed });
}
function dose(input) {
  const r = c.CalculadorasClinicas.calcularPosologiaPorTextoLivre(input);
  return { input, drug: r?.farmaco, weight: r?.pesoKg, instruction: r?.instrucaoPosologica };
}
check('A01_paracetamol_trocado', dose('paracetamol para febre criança 20kg'), r => r.drug === 'Dipirona');
check('A02_antibiotico_sem_pedido', dose('hidratação criança 20kg'), r => r.drug === 'Amoxicilina');
check('A03_peso_inventado', dose('loratadina'), r => r.weight === 20 && !!r.instruction);
check('A04_anafilaxia_sepse', c.obterProtocoloClinico('choque anafilático').titulo, r => /Sepse/.test(r));
check('A05_negacao_ignorada', c.obterProtocoloClinico('sem sepse, crise de asma').titulo, r => /Sepse/.test(r));
let prompt = '';
c.executarRaciocinioClinico = system => {
  prompt = system;
  return JSON.stringify({ subjetivo: 'Alergias: Nega alergias medicamentosas conhecidas.', objetivo: 'PA 120/80. ACV: sem sopros.', avaliacao: ['Hipótese'], plano: Array.from({length: 10}, (_,i) => 'Medida clínica ' + (i+1)) });
};
const soap = c.gerarSOAPComIA('Paciente com tosse. Gerar avaliação e plano.', { fecharPlano: true });
check('A06_prompt_negativa_sem_dado', prompt.includes("ou 'Nega alergias medicamentosas conhecidas'"), Boolean);
check('A07_fase2_aceita_dado_inventado', soap.includes('PA 120/80'), Boolean);
check('A08_plano_cortado', { item8: soap.includes('Medida clínica 8'), item9: soap.includes('Medida clínica 9') }, r => r.item8 && !r.item9);
const base = JSON.parse(fs.readFileSync(path.join(root, 'src/data/guia_farmaceutico_hsl.json'), 'utf8'));
const leaking = base.medicamentos.filter(m => !m.dose_pediatria && /pediatr/i.test(m.dose_adulto || ''));
check('A09_extracao_pediatria_em_adulto', { count: leaking.length, examples: leaking.slice(0,5).map(m => m.farnaco) }, r => r.count > 0);
const metrics = {};
const telemetry = require(path.join(root, 'server/telemetry.js'));
const ctx = { UrlFetchApp: { fetch: () => ({getResponseCode: () => 429}) } };
telemetry.measureLegacyHttp(ctx, metrics, () => ctx.UrlFetchApp.fetch('https://generativelanguage.googleapis.com/example'));
check('A10_429_nao_conta_erro', metrics.gemini, r => r.errors === 0);
console.log(JSON.stringify({ scope: 'Reproduções locais; não mede respostas reais de LLM nem produção', evidence }, null, 2));
