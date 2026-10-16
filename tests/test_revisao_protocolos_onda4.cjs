/**
 * Suíte de Testes Cirúrgicos - Onda 4 da Revisão de Protocolos Médicos
 *
 * Módulos Cobertos:
 * 1. src/02_pneumologia_crise_asmatica.js (GINA 2024 - Track 1 AIR/MART, bloqueio de SABA isolado)
 * 2. src/02_pneumologia_dpoc_vni.js (GOLD 2024 ABE, Dupilumabe anti-IL-4Ra e VNI)
 * 3. src/02_arboviroses_dengue.js (Dengue MS 2024 Grupos A-D, Hidratação 60 mL/kg e Vacina Qdenga TAK-003)
 */

const assert = require('assert');
const CriseAsmaticaService = require('../src/02_pneumologia_crise_asmatica.js');
const DpocVniService = require('../src/02_pneumologia_dpoc_vni.js');
const ArbovirosesDengueService = require('../src/02_arboviroses_dengue.js');

console.log('🧪 Iniciando testes da Onda 4: Vias Aéreas, Pneumologia & Arboviroses...');

// ============================================================================
// 1. ASMA - PROTOCOLO GINA 2024 (AIR / MART E BLOQUEIO DE SABA ISOLADO)
// ============================================================================
console.log('--- Testando Asma GINA 2024 (Track 1 AIR/MART) ---');

// Teste 1: Bloqueio estrito de SABA isolado e constantes
assert(CriseAsmaticaService.GINA_2024_CONSTANTS, 'Deve exportar GINA_2024_CONSTANTS');
assert.strictEqual(
  CriseAsmaticaService.GINA_2024_CONSTANTS.BLOQUEIO_SABA_ISOLADO,
  true,
  'GINA 2024 deve bloquear estritamente o uso de SABA isolado sem corticoide inalatório'
);

// Teste 2: Prescrição Track 1 - Etapa 1 e 2 (AIR / Resgate com Formoterol + CI)
const ginaEtapa1 = CriseAsmaticaService.prescreverManejoGina2024({ etapa: 1, usarTrack1Preferencial: true });
assert.strictEqual(ginaEtapa1.etapa, 1, 'Etapa 1 GINA');
assert.strictEqual(ginaEtapa1.track, 'Track 1 (Preferencial GINA)', 'Deve ser Track 1 preferencial');
assert(ginaEtapa1.estrategiaResgate.includes('Formoterol') && ginaEtapa1.estrategiaResgate.includes('Budesonida'), 'Resgate AIR com CI + Formoterol');
assert(ginaEtapa1.alertaSegurancaSaba.includes('PROIBIÇÃO') || ginaEtapa1.alertaSegurancaSaba.includes('PROSCRITO'), 'Deve conter alerta formal contra SABA isolado');

// Teste 3: Prescrição Track 1 - Etapa 3 (MART - Manutenção Dose Baixa + Alívio)
const ginaEtapa3 = CriseAsmaticaService.prescreverManejoGina2024({ etapa: 3, usarTrack1Preferencial: true });
assert.strictEqual(ginaEtapa3.etapa, 3, 'Etapa 3 GINA');
assert(ginaEtapa3.estrategiaManutencao.includes('dose baixa'), 'Etapa 3 deve ter dose baixa de CI');
assert(ginaEtapa3.estrategiaResgate.includes('MART'), 'Etapa 3 deve usar estratégia MART');

// Teste 4: Prescrição Track 1 - Etapa 5 (Avaliação fenotípica e biológicos)
const ginaEtapa5 = CriseAsmaticaService.prescreverManejoGina2024({ etapa: 5 });
assert.strictEqual(ginaEtapa5.etapa, 5, 'Etapa 5 GINA');
assert(ginaEtapa5.estrategiaManutencao.includes('Biológicos') || ginaEtapa5.estrategiaManutencao.includes('LAMA'), 'Etapa 5 inclui LAMA e biológicos');

// Teste 5: Prescrição de alta na crise asmática com diretriz GINA 2024
const analiseCrise = CriseAsmaticaService.avaliarCriseAsmatica({ fc: 85, fr: 18, spo2: 96 });
assert(analiseCrise.plano && analiseCrise.plano.criterios_destino, 'Deve conter critérios de destino');
const altaPrescricao = analiseCrise.plano.criterios_destino.alta_emergencia.prescricao_alta.join('\n');
assert(altaPrescricao.includes('GINA 2024'), 'Alta deve citar diretriz GINA 2024');
assert(altaPrescricao.includes('AIR/MART') || altaPrescricao.includes('Formoterol'), 'Alta deve preconizar AIR/MART com corticoide');

console.log('✅ Todos os testes de Asma GINA 2024 passaram com sucesso.');

// ============================================================================
// 2. DPOC - PROTOCOLO GOLD 2024 (CLASSIFICAÇÃO ABE, DUPILUMABE E VNI)
// ============================================================================
console.log('--- Testando DPOC GOLD 2024 (Classificação ABE & Biológico) ---');

// Teste 1: Grupo A (0 exacerbações sem internação, CAT < 10)
const dpocA = DpocVniService.classificarEManejarDPOCGold2024({
  historicoExacerbacoesAno: 0,
  internacoesPreviasAno: 0,
  catScore: 6,
  eosinofilosSangue: 120
});
assert.strictEqual(dpocA.grupo, 'Grupo A', 'Deve ser Grupo A');
assert(dpocA.terapiaInicial.includes('Broncodilatador'), 'Grupo A recebe monoterapia broncodilatadora');

// Teste 2: Grupo B (0 exacerbações, CAT >= 10 ou mMRC >= 2)
const dpocB = DpocVniService.classificarEManejarDPOCGold2024({
  historicoExacerbacoesAno: 1,
  internacoesPreviasAno: 0,
  catScore: 16,
  eosinofilosSangue: 180
});
assert.strictEqual(dpocB.grupo, 'Grupo B', 'Deve ser Grupo B');
assert(dpocB.terapiaInicial.includes('LABA + LAMA'), 'Grupo B recebe dupla broncodilatação inicial');

// Teste 3: Grupo E com exacerbações frequentes e Eosinófilos >= 300 -> Indicação de Dupilumabe (GOLD 2024)
const dpocE_Dupilumabe = DpocVniService.classificarEManejarDPOCGold2024({
  historicoExacerbacoesAno: 2,
  internacoesPreviasAno: 1,
  catScore: 22,
  eosinofilosSangue: 350,
  refratarioTerapiaTripla: true
});
assert.strictEqual(dpocE_Dupilumabe.grupo, 'Grupo E', 'Deve ser Grupo E');
assert(dpocE_Dupilumabe.terapiaInicial.includes('LABA + LAMA'), 'Grupo E recebe LABA + LAMA');
assert.strictEqual(dpocE_Dupilumabe.elegivelDupilumabe, true, 'Deve ser elegível ao Dupilumabe com eos >= 300');
assert(dpocE_Dupilumabe.detalheDupilumabe.includes('Dupilumabe'), 'Detalhe deve indicar Dupilumabe 300mg SC a cada 2 semanas');

// Teste 4: Grupo E com eosinófilos < 300 não refratário -> não elegível de imediato a Dupilumabe
const dpocE_SemBiol = DpocVniService.classificarEManejarDPOCGold2024({
  historicoExacerbacoesAno: 2,
  internacoesPreviasAno: 0,
  catScore: 18,
  eosinofilosSangue: 150
});
assert.strictEqual(dpocE_SemBiol.elegivelDupilumabe, false, 'Não deve indicar Dupilumabe se eos < 300');

// Teste 5: Avaliação determinística de VNI em exacerbação hipercápnica
const vniIndicada = DpocVniService.avaliarIndicacaoVniDpoc({
  ph: 7.28,
  paco2: 58,
  frequenciaRespiratoria: 28,
  glasgow: 15
});
assert.strictEqual(vniIndicada.indicada, true, 'VNI indicada em acidose hipercápnica pH < 7.35 e PaCO2 > 45');
assert(vniIndicada.parametrosIniciais.ipapCmH2O >= 10, 'IPAP inicial adequado');

console.log('✅ Todos os testes de DPOC GOLD 2024 e VNI passaram com sucesso.');

// ============================================================================
// 3. DENGUE & QDENGA - MINISTÉRIO DA SAÚDE 2024
// ============================================================================
console.log('--- Testando Arboviroses: Dengue MS 2024 & Vacina Qdenga ---');

// Teste 1: Dengue Grupo A (Ambulatorial - 60 mL/kg/dia)
const dengueA = ArbovirosesDengueService.manejarDengueMS2024({
  pesoKg: 70,
  sinaisAlarme: false,
  sinaisChoqueOuSangramentoGrave: false,
  condicaoEspecialOuRiscoSocialOuPetequias: false
});
assert.strictEqual(dengueA.estadiamento, 'GRUPO A', 'Deve ser Grupo A');
assert(dengueA.hidratacaoCalculada.volumeDiarioTotal.includes('4200 mL/dia'), '70kg x 60 mL/kg = 4200 mL/dia');
assert(dengueA.hidratacaoCalculada.fracionamento.includes('1400 mL'), '1/3 com SRO = 1400 mL');
assert(dengueA.prescricaoSintomaticaSegura.includes('Dipirona'), 'Prescrição segura com Dipirona');
assert(dengueA.prescricaoSintomaticaSegura.includes('CONTRAINDICADOS: AAS'), 'Contraindicação expressa de AINEs');

// Teste 2: Dengue Grupo B (Observação UPA - 60 mL/kg/dia)
const dengueB = ArbovirosesDengueService.manejarDengueMS2024({
  pesoKg: 60,
  sinaisAlarme: false,
  sinaisChoqueOuSangramentoGrave: false,
  condicaoEspecialOuRiscoSocialOuPetequias: true
});
assert.strictEqual(dengueB.estadiamento, 'GRUPO B', 'Deve ser Grupo B');
assert(dengueB.destinoPaciente.includes('Observação'), 'Leito de observação UPA');
assert(dengueB.hidratacaoCalculada.volumeDiarioTotal.includes('3600 mL/dia'), '60kg x 60 mL/kg = 3600 mL/dia');
assert(dengueB.examesComplementares[0].includes('Hemograma completo OBRIGATÓRIO'), 'Hemograma obrigatório');

// Teste 3: Dengue Grupo C (Sinais de Alarme - Expansão EV 10 mL/kg/h na 1ª hora)
const dengueC = ArbovirosesDengueService.manejarDengueMS2024({
  pesoKg: 80,
  sinaisAlarme: true,
  sinaisChoqueOuSangramentoGrave: false
});
assert.strictEqual(dengueC.estadiamento, 'GRUPO C', 'Deve ser Grupo C');
assert(dengueC.destinoPaciente.includes('Internação'), 'Internação hospitalar');
assert(dengueC.hidratacaoCalculada.faseExpansao.includes('800 mL'), '80kg x 10 mL/kg/h = 800 mL');

// Teste 4: Dengue Grupo D (Choque - Expansão Rápida 20 mL/kg em 20 min)
const dengueD = ArbovirosesDengueService.manejarDengueMS2024({
  pesoKg: 50,
  sinaisAlarme: true,
  sinaisChoqueOuSangramentoGrave: true
});
assert.strictEqual(dengueD.estadiamento, 'GRUPO D', 'Deve ser Grupo D');
assert(dengueD.destinoPaciente.includes('Emergência / UTI'), 'Emergência/UTI imediata');
assert(dengueD.hidratacaoCalculada.faseExpansaoRapida.includes('1000 mL'), '50kg x 20 mL/kg = 1000 mL em 20 min');

// Teste 5: Vacina Qdenga - Perfil elegível (Jovem 25 anos sem contraindicações)
const qdengaApto = ArbovirosesDengueService.avaliarVacinaQdenga({
  idadeAnos: 25,
  gestante: false,
  lactante: false,
  imunossuprimido: false,
  teveDengueRecenteMenos6Meses: false
});
assert.strictEqual(qdengaApto.elegivelAgora, true, 'Deve estar apto para tomar Qdenga');
assert(qdengaApto.esquemaPosologico.includes('meses 0 e 3'), 'Esquema de 2 doses (0 e 3 meses)');

// Teste 6: Vacina Qdenga - Contraindicações Absolutas (Gestante ou Lactante)
const qdengaGestante = ArbovirosesDengueService.avaliarVacinaQdenga({
  idadeAnos: 28,
  gestante: true
});
assert.strictEqual(qdengaGestante.elegivelAgora, false, 'Gestante contraindicada');
assert(qdengaGestante.contraindicacoesAbsolutas[0].includes('Gestantes'), 'Deve constar gestante na lista');

// Teste 7: Vacina Qdenga - Infecção recente por dengue (< 6 meses)
const qdengaRecente = ArbovirosesDengueService.avaliarVacinaQdenga({
  idadeAnos: 35,
  teveDengueRecenteMenos6Meses: true
});
assert.strictEqual(qdengaRecente.elegivelAgora, false, 'Infecção recente não permite aplicação imediata');
assert(qdengaRecente.adiamentoTemporario.includes('6 meses'), 'Deve recomendar aguardar 6 meses');

// Teste 8: Retrocompatibilidade de calcularHidratacao legado
const hidratacaoLegada = ArbovirosesDengueService.calcularHidratacao('B', 70);
assert.strictEqual(hidratacaoLegada.volumeTotal24hMl, 4200, 'Grupo B legado deve calcular 60 mL/kg = 4200 mL');
assert(hidratacaoLegada.prescricaoFormatada.includes('4200 mL'), 'Prescrição formatada deve citar 4200 mL');

console.log('✅ Todos os testes de Dengue MS 2024 e Qdenga passaram com sucesso.');

console.log('\n🎉 SUCESSO TOTAL: Todos os testes da Onda 4 foram aprovados!');
