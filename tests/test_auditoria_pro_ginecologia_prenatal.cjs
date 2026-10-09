/**
 * ==============================================================================
 * TESTE DE AUDITORIA CLÍNICA INTEGRAL COM MODELO PRO:
 * GINECOLOGIA AMBULATORIAL, PRÉ-NATAL E FARMACOLOGIA GESTACIONAL (TAREFA 61)
 * ==============================================================================
 * Validação rigorosa e determinística de conformidade com as diretrizes:
 *  - FEBRASGO (Tratado de Obstetrícia / Anticoncepção / Trato Genital Inferior)
 *  - Ministério da Saúde (Manual de Pré-Natal de Baixo Risco / PCDT Sífilis e HIV)
 *  - Organização Mundial da Saúde (Critérios Médicos de Elegibilidade para Contracepção)
 *  - ACOG (Committee Opinion nº 700 para Datação Gestacional)
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');

// Carrega os serviços diretamente
const ObstetriciaPrenatalService = require(path.join(__dirname, '../src/02_obstetricia_prenatal.js'));
const GinecologiaAmbulatorialService = require(path.join(__dirname, '../src/02_ginecologia_ambulatorial.js'));
const Runtime = require(path.join(__dirname, '../server/runtime.js'));

console.log('=== INICIANDO BATERIA DE AUDITORIA MÉDICA PRO: GINECOLOGIA & PRÉ-NATAL ===\n');

let testesPassados = 0;

function test(descricao, fn) {
  try {
    fn();
    console.log(`  ✓ ${descricao}`);
    testesPassados++;
  } catch (err) {
    console.error(`  ❌ FALHA em: ${descricao}`);
    console.error(err);
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DATAÇÃO GESTACIONAL: DUM, NAEGELE E CONCORDÂNCIA FEBRASGO/ACOG COM 1º USG
// ─────────────────────────────────────────────────────────────────────────────
console.log('[1] Testando Datação Gestacional, Naegele e Concordância FEBRASGO/ACOG...');

test('Regra de Naegele: DUM em janeiro (virada do mesmo ano)', () => {
  const dpp = ObstetriciaPrenatalService.calcularDppNaegele('15/01/2026');
  assert(dpp instanceof Date);
  assert.strictEqual(dpp.getDate(), 22);
  assert.strictEqual(dpp.getMonth(), 9); // outubro (mês 9 em JS = 10)
  assert.strictEqual(dpp.getFullYear(), 2026);
});

test('Regra de Naegele: DUM em maio (virada para o ano seguinte)', () => {
  const dpp = ObstetriciaPrenatalService.calcularDppNaegele('25/05/2026');
  assert.strictEqual(dpp.getDate(), 4); // 25 + 7 = 32 -> 32 - 28 (fevereiro 2027 não bissexto) = 4
  assert.strictEqual(dpp.getMonth(), 2); // março (mês 2 em JS = 3)
  assert.strictEqual(dpp.getFullYear(), 2027);
});

test('Regra de Naegele: Ano bissexto (fevereiro de 2024)', () => {
  const dpp = ObstetriciaPrenatalService.calcularDppNaegele('28/02/2024');
  assert.strictEqual(dpp.getDate(), 5); // 28 + 7 = 35 -> 35 - 30 (novembro tem 30 dias) = 5 de dezembro
  assert.strictEqual(dpp.getMonth(), 11); // dezembro
  assert.strictEqual(dpp.getFullYear(), 2024);
});

test('Concordância FEBRASGO/ACOG: CCN precoce <= 8s6d com diferença <= 5 dias mantém DUM', () => {
  const res = ObstetriciaPrenatalService.avaliarConcordanciaDumUsg({
    dataRef: '20/03/2026',
    dum: '01/01/2026',       // IG teórica no USG (05/02): 5 semanas
    dataUsg: '05/02/2026',
    semanasUsg: 5,
    diasUsg: 3               // Diferença de 3 dias (margem aceitável é +-5 dias)
  });
  assert.strictEqual(res.sucesso, true);
  assert.strictEqual(res.concordante, true);
  assert.strictEqual(res.metodoAdotado, 'DUM_CONFIRMADA_POR_USG');
  assert.strictEqual(res.margemAceitavelDias, 5);
});

test('Concordância FEBRASGO/ACOG: CCN precoce com diferença > 5 dias redata pelo USG', () => {
  const res = ObstetriciaPrenatalService.avaliarConcordanciaDumUsg({
    dataRef: '20/03/2026',
    dum: '01/01/2026',
    dataUsg: '05/02/2026',
    semanasUsg: 6,
    diasUsg: 4               // Diferença de 11 dias (> 5 dias)
  });
  assert.strictEqual(res.sucesso, true);
  assert.strictEqual(res.concordante, false);
  assert.strictEqual(res.metodoAdotado, 'USG_REDATADA_DISCORDANTE');
  assert.strictEqual(res.margemAceitavelDias, 5);
});

test('Concordância FEBRASGO/ACOG: USG 11-13s6d com tolerância de +-7 dias', () => {
  const res = ObstetriciaPrenatalService.avaliarConcordanciaDumUsg({
    dataRef: '15/04/2026',
    dum: '01/01/2026',
    dataUsg: '26/03/2026',   // 12 semanas exatas pela DUM
    semanasUsg: 13,
    diasUsg: 4               // Diferença de 11 dias (> 7 dias)
  });
  assert.strictEqual(res.concordante, false);
  assert.strictEqual(res.metodoAdotado, 'USG_REDATADA_DISCORDANTE');
  assert.strictEqual(res.margemAceitavelDias, 7);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. INTERPRETAÇÃO DETERMINÍSTICA DE SOROLOGIAS E EXAMES DO PRÉ-NATAL
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] Testando Interpretação Determinística de Sorologias e Exames Laboratoriais...');

test('Glicemia de Jejum: < 92 mg/dL é normal com indicação de TOTG 75g a 24-28s', () => {
  const laudo = ObstetriciaPrenatalService.interpretarSorologiasLaboratorioPrenatal({ glicemiaJejum: 84 });
  assert.strictEqual(laudo.sucesso, true);
  const item = laudo.itens.find(i => i.exame === 'Glicemia de Jejum');
  assert.strictEqual(item.status, 'NORMAL');
  assert(item.conduta.includes('TOTG 75g'));
});

test('Glicemia de Jejum: 92 a 125 mg/dL no 1º tri confirma DMG e dispensa TOTG 75g', () => {
  const laudo = ObstetriciaPrenatalService.interpretarSorologiasLaboratorioPrenatal({ glicemiaJejum: 98 });
  const item = laudo.itens.find(i => i.exame === 'Glicemia de Jejum');
  assert.strictEqual(item.status, 'CRITICO');
  assert(item.diagnostico.includes('DIABETES MELLITUS GESTACIONAL'));
  assert(item.conduta.includes('dispensa e contraindica'));
  assert(laudo.alertasCriticos.some(a => a.includes('DMG CONFIRMADO')));
});

test('Glicemia de Jejum: >= 126 mg/dL diagnostica Diabetes Pré-Gestacional (Overt Diabetes)', () => {
  const laudo = ObstetriciaPrenatalService.interpretarSorologiasLaboratorioPrenatal({ glicemiaJejum: 132 });
  const item = laudo.itens.find(i => i.exame === 'Glicemia de Jejum');
  assert.strictEqual(item.status, 'CRITICO');
  assert(item.diagnostico.includes('OVERT DIABETES'));
  assert(laudo.alertasCriticos.some(a => a.includes('OVERT DIABETES')));
});

test('Toxoplasmose: IgG- IgM- identifica gestante suscetível com profilaxia primária e sorologia trimestral', () => {
  const laudo = ObstetriciaPrenatalService.interpretarSorologiasLaboratorioPrenatal({ toxoIgg: 'nao_reagente', toxoIgm: 'nao_reagente' });
  const item = laudo.itens.find(i => i.exame.includes('Toxoplasmose'));
  assert.strictEqual(item.status, 'ATENCAO');
  assert(item.diagnostico.includes('Suscetível'));
  assert(item.conduta.includes('REPETIR SOROLOGIA A CADA TRIMESTRE'));
});

test('Toxoplasmose: IgG+ IgM- confirma imunidade pregressa sem risco fetal', () => {
  const laudo = ObstetriciaPrenatalService.interpretarSorologiasLaboratorioPrenatal({ toxoIgg: 'reagente', toxoIgm: 'nao_reagente' });
  const item = laudo.itens.find(i => i.exame.includes('Toxoplasmose'));
  assert.strictEqual(item.status, 'NORMAL');
  assert(item.diagnostico.includes('Imunidade Pregressa'));
  assert(item.conduta.includes('NÃO necessita de novas sorologias'));
});

test('Toxoplasmose: IgG+ IgM+ com avidez alta (>= 60%) antes de 16s afasta infecção gestacional', () => {
  const laudo = ObstetriciaPrenatalService.interpretarSorologiasLaboratorioPrenatal({
    toxoIgg: 'reagente',
    toxoIgm: 'reagente',
    toxoAvidez: 72,
    semanasGestacao: 11
  });
  const item = laudo.itens.find(i => i.exame.includes('Toxoplasmose'));
  assert.strictEqual(item.status, 'NORMAL');
  assert(item.diagnostico.includes('Imunidade Pré-Gestacional'));
  assert(item.conduta.includes('Pode suspender a Espiramicina'));
});

test('Toxoplasmose: IgG+ IgM+ com avidez baixa (< 50%) antes de 16s confirma infecção aguda recente', () => {
  const laudo = ObstetriciaPrenatalService.interpretarSorologiasLaboratorioPrenatal({
    toxoIgg: 'reagente',
    toxoIgm: 'reagente',
    toxoAvidez: 25,
    semanasGestacao: 12
  });
  const item = laudo.itens.find(i => i.exame.includes('Toxoplasmose'));
  assert.strictEqual(item.status, 'CRITICO');
  assert(item.diagnostico.includes('INFECÇÃO AGUDA GESTACIONAL CONFIRMADA'));
  assert(item.conduta.includes('Espiramicina 1g'));
  assert(item.conduta.includes('amniocentese'));
});

test('Sífilis: VDRL reagente 1:8 orienta Penicilina Benzatina semanal x 3 com alerta de intervalo', () => {
  const laudo = ObstetriciaPrenatalService.interpretarSorologiasLaboratorioPrenatal({
    vdrl: 'Reagente 1:8',
    sifilisFase: 'latente_tardia'
  });
  const item = laudo.itens.find(i => i.exame.includes('Sífilis'));
  assert.strictEqual(item.status, 'CRITICO');
  assert(item.conduta.includes('Penicilina G Benzatina 2.400.000 UI'));
  assert(item.conduta.includes('3 SEMANAS CONSECUTIVAS'));
  assert(item.conduta.includes('NÃO pode exceder 7 a 9 dias'));
  assert(item.conduta.includes('TRATAR O PARCEIRO SEXUAL'));
});

test('HIV: Anti-HIV reagente orienta TARV imediata e contraindica amamentação com inibição por cabergolina', () => {
  const laudo = ObstetriciaPrenatalService.interpretarSorologiasLaboratorioPrenatal({ hiv: 'reagente' });
  const item = laudo.itens.find(i => i.exame.includes('HIV'));
  assert.strictEqual(item.status, 'CRITICO');
  assert(item.conduta.includes('INÍCIO IMEDIATO DE TARV'));
  assert(item.conduta.includes('Contraindicação absoluta à amamentação'));
  assert(item.conduta.includes('Cabergolina 1mg'));
});

test('Hepatite B: HBsAg reagente exige HBIG + Vacina no RN nas primeiras 12h de vida', () => {
  const laudo = ObstetriciaPrenatalService.interpretarSorologiasLaboratorioPrenatal({ hbsag: 'reagente' });
  const item = laudo.itens.find(i => i.exame.includes('Hepatite B'));
  assert.strictEqual(item.status, 'CRITICO');
  assert(item.conduta.includes('HBIG 0,5 mL IM'));
  assert(item.conduta.includes('primeiras 12 horas de vida'));
});

test('Urocultura: Bacteriúria assintomática (>= 10^5 UFC) exige antibioticoterapia e controle de cura', () => {
  const laudo = ObstetriciaPrenatalService.interpretarSorologiasLaboratorioPrenatal({ urocultura: 'E. coli > 10^5 UFC/mL' });
  const item = laudo.itens.find(i => i.exame.includes('Urocultura'));
  assert.strictEqual(item.status, 'CRITICO');
  assert(item.conduta.includes('Fosfomicina Trometamol 3g') || item.conduta.includes('Cefalexina'));
  assert(item.conduta.includes('urocultura de controle de cura'));
});

test('Hemoglobina: Anemia gestacional moderada (Hb 9.5) orienta dose terapêutica de ferro 120-200mg', () => {
  const laudo = ObstetriciaPrenatalService.interpretarSorologiasLaboratorioPrenatal({ hb: 9.5 });
  const item = laudo.itens.find(i => i.exame.includes('Hemoglobina'));
  assert.strictEqual(item.status, 'ATENCAO');
  assert(item.conduta.includes('120 a 200 mg de ferro elementar/dia'));
});

test('Fator Rh & Coombs: Mãe Rh- com Coombs- indica Anti-D na 28ª semana e periparto', () => {
  const laudo = ObstetriciaPrenatalService.interpretarSorologiasLaboratorioPrenatal({ rh: 'negativo', coombs: 'nao_reagente' });
  const item = laudo.itens.find(i => i.exame.includes('Tipagem Rh'));
  assert.strictEqual(item.status, 'ATENCAO');
  assert(item.conduta.includes('IMUNOGLOBULINA ANTI-D 300 mcg IM na 28ª semana'));
});

test('Fator Rh & Coombs: Mãe Rh- com Coombs+ (aloimunizada) encaminha ao PNAR para Doppler de ACM', () => {
  const laudo = ObstetriciaPrenatalService.interpretarSorologiasLaboratorioPrenatal({ rh: 'negativo', coombs: 'reagente 1:32' });
  const item = laudo.itens.find(i => i.exame.includes('Tipagem Rh'));
  assert.strictEqual(item.status, 'CRITICO');
  assert(item.conduta.includes('Doppler de artéria cerebral média'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. AUDITORIA DE SEGURANÇA FARMACOLÓGICA E TETOS NA GESTAÇÃO
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] Testando Auditoria Farmacológica e Contraindicações na Gestação...');

test('Anti-hipertensivos: Enalapril/Losartana CONTRAINDICADOS vs Metildopa/Nifedipino SEGUROS', () => {
  const audit = ObstetriciaPrenatalService.auditarPrescricaoGestante(['Enalapril', 'Losartana', 'Metildopa', 'Nifedipino']);
  assert.strictEqual(audit.sucesso, true);
  assert.strictEqual(audit.parecerGeral, 'CONTRAINDICADO');
  assert(audit.contraindicados.some(c => c.medicamento === 'Enalapril'));
  assert(audit.contraindicados.some(c => c.medicamento === 'Losartana'));
  assert(audit.seguros.some(s => s.medicamento === 'Metildopa'));
  assert(audit.seguros.some(s => s.medicamento === 'Nifedipino'));
});

test('Anticoagulantes: DOACs (Rivaroxabana/Apixabana/Dabigatrana) CONTRAINDICADOS vs Enoxaparina SEGURA', () => {
  const audit = ObstetriciaPrenatalService.auditarPrescricaoGestante(['Rivaroxabana', 'Apixabana', 'Enoxaparina']);
  assert.strictEqual(audit.parecerGeral, 'CONTRAINDICADO');
  assert(audit.contraindicados.some(c => c.medicamento.includes('Rivaroxabana')));
  assert(audit.contraindicados.some(c => c.medicamento.includes('Apixabana')));
  assert(audit.seguros.some(s => s.medicamento.includes('Enoxaparina')));
});

test('Antidiabéticos: Glibenclamida CONTRAINDICADA vs Insulina NPH/Regular PADRÃO OURO', () => {
  const audit = ObstetriciaPrenatalService.auditarPrescricaoGestante(['Glibenclamida', 'Insulina NPH', 'Insulina Regular']);
  assert(audit.contraindicados.some(c => c.medicamento.includes('Glibenclamida')));
  assert(audit.seguros.some(s => s.medicamento.includes('Insulina NPH')));
  assert(audit.seguros.some(s => s.medicamento.includes('Insulina Regular')));
});

test('Antidepressivos: Paroxetina CONTRAINDICADA no 1º tri vs Sertralina SEGURA de 1ª escolha', () => {
  const audit = ObstetriciaPrenatalService.auditarPrescricaoGestante(['Paroxetina', 'Sertralina']);
  assert(audit.contraindicados.some(c => c.medicamento.includes('Paroxetina')));
  assert(audit.seguros.some(s => s.medicamento.includes('Sertralina')));
});

test('Tireoide: Levotiroxina CATEGORIA A (manter e aumentar 20-30%) e PTU de escolha no 1º tri', () => {
  const vLevo = ObstetriciaPrenatalService.validarMedicamentoGestacao('levotiroxina');
  assert.strictEqual(vLevo.categoriaFda, 'A');
  assert.strictEqual(vLevo.segurancaGestacao, 'SEGURO');
  assert(vLevo.alertas[2].includes('Aumentar a dose diária em 20% a 30%'));

  const vPtu = ObstetriciaPrenatalService.validarMedicamentoGestacao('propiltiouracil');
  assert.strictEqual(vPtu.segurancaGestacao, 'SEGURO');
  assert(vPtu.alertas[0].includes('1º TRIMESTRE'));
});

test('AINEs: Ibuprofeno/Diclofenaco CONTRAINDICADOS no 3º tri por fechamento precoce do canal arterial', () => {
  const vIbu = ObstetriciaPrenatalService.validarMedicamentoGestacao('ibuprofeno', 3);
  assert.strictEqual(vIbu.segurancaGestacao, 'CONTRAINDICADO');
  assert(vIbu.alertas[0].includes('canal arterial'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. CRITÉRIOS MÉDICOS DE ELEGIBILIDADE PARA CONTRACEPÇÃO DA OMS (CATEGORIAS 1-4)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] Testando Critérios Médicos de Elegibilidade para Contracepção da OMS...');

test('Enxaqueca com aura: AHC Categoria 4 (AVC), DIU de Cobre Categoria 1 (padrão ouro), Progestagênios Cat. 2', () => {
  const res = GinecologiaAmbulatorialService.avaliarCriteriosElegibilidadeContracepcao({
    enxaqueca: 'com_aura'
  });
  const ahc = res.metodosBloqueadosCat4.find(m => m.id === 'AHC');
  assert(ahc !== undefined, 'AHC deve ser Categoria 4');
  const diuCu = res.metodosElegiveisCat1.find(m => m.id === 'DIU_CU');
  assert(diuCu !== undefined, 'DIU de Cobre deve ser Categoria 1');
  const pop = res.metodosAceitaveisCat2.find(m => m.id === 'POP');
  assert(pop !== undefined, 'Progestagênio oral deve ser Categoria 2');
});

test('Trombose venosa profunda pregressa/ativa: AHC Categoria 4 vs DIU de Cobre Categoria 1', () => {
  const res = GinecologiaAmbulatorialService.avaliarCriteriosElegibilidadeContracepcao({
    historicoTev: true
  });
  assert(res.metodosBloqueadosCat4.some(m => m.id === 'AHC'));
  assert(res.metodosElegiveisCat1.some(m => m.id === 'DIU_CU'));
});

test('Hipertensão grave (PA >= 160x100): AHC Categoria 4, AMPD Cat. 3, DIU de Cobre Cat. 1', () => {
  const res = GinecologiaAmbulatorialService.avaliarCriteriosElegibilidadeContracepcao({
    pas: 170,
    pad: 105
  });
  assert(res.metodosBloqueadosCat4.some(m => m.id === 'AHC'));
  assert(res.metodosEvitarCat3.some(m => m.id === 'AMPD'));
  assert(res.metodosElegiveisCat1.some(m => m.id === 'DIU_CU'));
});

test('Tabagismo >= 35 anos com >= 15 cigarros/dia: AHC Categoria 4 vs Métodos livres de estrogênio Cat. 1', () => {
  const res = GinecologiaAmbulatorialService.avaliarCriteriosElegibilidadeContracepcao({
    idade: 37,
    tabagismo: true,
    cigarrosDia: 20
  });
  assert(res.metodosBloqueadosCat4.some(m => m.id === 'AHC'));
  assert(res.metodosElegiveisCat1.some(m => m.id === 'POP'));
  assert(res.metodosElegiveisCat1.some(m => m.id === 'DIU_CU'));
  assert(res.metodosElegiveisCat1.some(m => m.id === 'DIU_LNG'));
});

test('Câncer de mama atual: TODOS os métodos hormonais são Categoria 4! DIU de Cobre é Categoria 1', () => {
  const res = GinecologiaAmbulatorialService.avaliarCriteriosElegibilidadeContracepcao({
    cancerMama: 'atual'
  });
  assert(res.metodosBloqueadosCat4.some(m => m.id === 'AHC'));
  assert(res.metodosBloqueadosCat4.some(m => m.id === 'POP'));
  assert(res.metodosBloqueadosCat4.some(m => m.id === 'AMPD'));
  assert(res.metodosBloqueadosCat4.some(m => m.id === 'IMPLANTE'));
  assert(res.metodosBloqueadosCat4.some(m => m.id === 'DIU_LNG'));
  assert(res.metodosElegiveisCat1.some(m => m.id === 'DIU_CU'));
  assert.strictEqual(res.metodosElegiveisCat1.length, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. INTEGRAÇÃO COM A MALHA RPC DO SERVIDOR FASTIFY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] Testando Integração com o Despachante RPC do Servidor Fastify...');

test('RPC cockpitInterpretarSorologiasPrenatal executa determinísticamente via runtime', () => {
  const resRpc = Runtime.cockpitRpc('cockpitInterpretarSorologiasPrenatal', 'bot', [{
    glicemiaJejum: 104,
    vdrl: 'reagente 1:4',
    hiv: 'nao_reagente'
  }]);
  assert.strictEqual(resRpc.sucesso, true);
  assert.strictEqual(resRpc.totalAvaliados, 3);
  assert(resRpc.alertasCriticos.length >= 2);
  assert(resRpc.textoFormatado.includes('DIABETES MELLITUS GESTACIONAL'));
});

console.log(`\n🎉 SUCESSO TOTAL: Todos os ${testesPassados}/${testesPassados} testes de auditoria PRO em Ginecologia e Pré-Natal passaram com 100% de conformidade clínica!`);
