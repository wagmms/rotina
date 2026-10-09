/**
 * ==============================================================================
 * Testes Unitários: Módulo de Oftalmologia de Emergência & Pronto Atendimento
 * Diretrizes: CBO (Conselho Brasileiro de Oftalmologia), AAO PPP, Wills Eye Manual
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');

const OftalmologiaEmergenciaService = require('../src/02_oftalmologia_emergencia.js');

function runTests() {
  console.log('Iniciando testes rigorosos de Oftalmologia de Emergência...');

  // 1. Caso 1: Queimadura Química Ocular por Álcali (Soda Cáustica / Cimento)
  const resCaso1 = OftalmologiaEmergenciaService.avaliar({
    queimadura: true,
    agente: 'soda cáustica e cal',
    ph: 9.5,
    particulasSolidas: true
  });

  assert.strictEqual(resCaso1.sucesso, true, 'Execução com sucesso');
  assert.strictEqual(resCaso1.tipoCaso, 'QUEIMADURA_QUIMICA', 'Tipo de caso correto');
  assert.ok(resCaso1.detalhes.agente.includes('ÁLCALI'), 'Identifica substância alcalina');
  assert.ok(resCaso1.detalhes.condutaImediata.some(c => c.includes('IRRIGAÇÃO PROFUSA IMEDIATA')), 'Regra de ouro de irrigação imediata');
  assert.ok(resCaso1.detalhes.condutaImediata.some(c => c.includes('Ringer Lactato') || c.includes('SF 0,9%')), 'Uso de RL ou SF 0,9%');
  assert.ok(resCaso1.detalhes.alertasCriticos.some(a => a.includes('PARTÍCULAS SÓLIDAS RETIDAS') && a.includes('eversão')), 'Alerta para eversão de pálpebras e remoção mecânica');
  assert.ok(resCaso1.detalhes.alertasCriticos.some(a => a.includes('pH CONJUNTIVAL ANORMAL')), 'Alerta para pH 9.5 anormal e meta de 7.0 a 7.2');
  console.log('✓ Teste 1: Queimadura química por álcali (irrigação profusa imediata, eversão e alvo de pH) aprovado');

  // 2. Caso 2: Crise Aguda de Glaucoma de Ângulo Fechado (GAAF) com PIO Extrema (55 mmHg)
  const resCaso2 = OftalmologiaEmergenciaService.avaliar({
    glaucoma: true,
    pio: 55,
    dorIntensa: true,
    olhoVermelho: true,
    edemaCornea: true,
    pupilaMidriaseFixa: true,
    nauseasOuVomitos: true
  });

  assert.strictEqual(resCaso2.tipoCaso, 'GLAUCOMA_AGUDO_ANGULO_FECHADO');
  assert.strictEqual(resCaso2.detalhes.pioExtrema, true, 'PIO extrema identificada');

  const medicamentos = resCaso2.detalhes.prescricoes.map(p => p.medicamento);
  assert.ok(medicamentos.some(m => m.includes('Acetazolamida')), 'Prescreve Acetazolamida 500 mg');
  assert.ok(medicamentos.some(m => m.includes('Timolol')), 'Prescreve Timolol 0,5%');
  assert.ok(medicamentos.some(m => m.includes('Brimonidina')), 'Prescreve Brimonidina');
  assert.ok(medicamentos.some(m => m.includes('Manitol')), 'Prescreve Manitol 20% IV para PIO extrema/vômitos');

  // REGRA DE OURO DA PILOCARPINA: Bloqueio quando PIO > 40-50
  assert.ok(resCaso2.detalhes.bloqueios.some(b => b.includes('REGRA DE OURO / BLOQUEIO DA PILOCARPINA')), 'Bloqueio de Pilocarpina imediata se PIO > 40');
  assert.ok(resCaso2.detalhes.bloqueios.some(b => b.includes('SOMENTE APÓS a PIO baixar (< 40 mmHg)')), 'Condição estrita para início da Pilocarpina');
  assert.ok(resCaso2.detalhes.alertas.some(a => a.includes('Iridotomia periférica a laser') && a.includes('AMBOS os olhos')), 'Iridotomia bilateral preventiva');
  console.log('✓ Teste 2: Glaucoma agudo com Acetazolamida, Manitol e Regra de Ouro da Pilocarpina aprovado');

  // 3. Caso 3: Contraindicação de Timolol em Glaucoma com Asma/DPOC
  const resCaso3 = OftalmologiaEmergenciaService.avaliar({
    glaucoma: true,
    pio: 45,
    asmaOuDpoc: true
  });
  assert.ok(resCaso3.detalhes.bloqueios.some(b => b.includes('CONTRAINDICAÇÃO DE TIMOLOL TÓPICO') && b.includes('asma')), 'Bloqueio de beta-bloqueador tópico em asmático');
  assert.ok(!resCaso3.detalhes.prescricoes.some(p => p.medicamento.includes('Timolol')), 'Não deve prescrever Timolol');
  console.log('✓ Teste 3: Bloqueio de Timolol em paciente asmático aprovado');

  // 4. Caso 4: Trauma Ocular com Suspeita de Globo Ocular Aberto / Perfuração
  const resCaso4 = OftalmologiaEmergenciaService.avaliar({
    trauma: true,
    pupilaDeformada: true, // pupila em gota
    seidelPositivo: true,
    acuidadeVisual: 'Movimento de mãos'
  });

  assert.strictEqual(resCaso4.tipoCaso, 'TRAUMA_OCULAR');
  assert.strictEqual(resCaso4.detalhes.suspeitaGloboAberto, true, 'Identifica suspeita de globo aberto');

  // Regras de Ouro do que NUNCA fazer
  assert.ok(resCaso4.detalhes.bloqueios.some(b => b.includes('NUNCA PRESSIONAR O OLHO')), 'Bloqueio estrito de palpação/tonometria');
  assert.ok(resCaso4.detalhes.bloqueios.some(b => b.includes('NUNCA INSTILAR POMADAS OFTÁLMICAS')), 'Bloqueio de pomadas');
  assert.ok(resCaso4.detalhes.bloqueios.some(b => b.includes('NUNCA APLICAR CURATIVO COMPRESSIVO')), 'Bloqueio de curativo compressivo');

  // Condutas imediatas
  assert.ok(resCaso4.detalhes.condutas.some(c => c.includes('PROTETOR OCULAR RÍGIDO (SHIELD ACRÍLICO)')), 'Proteção imediata com shield rígido');
  assert.ok(resCaso4.detalhes.condutas.some(c => c.includes('Jejum absoluto (NPO)')), 'Jejum para cirurgia');
  assert.ok(resCaso4.detalhes.condutas.some(c => c.includes('Antiemético potente')), 'Antiemético para prevenir Valsalva');
  console.log('✓ Teste 4: Suspeita de globo ocular aberto (shield rígido, NPO e bloqueios de manipulação) aprovado');

  // 5. Caso 5: Hifema Traumático e Bloqueio de AAS/AINEs
  const resCaso5 = OftalmologiaEmergenciaService.avaliar({
    trauma: true,
    hifema: true
  });
  assert.strictEqual(resCaso5.detalhes.hifema, true, 'Hifema identificado');
  assert.ok(resCaso5.detalhes.bloqueios.some(b => b.includes('CONTRAINDICAÇÃO FORMAL DE AAS E AINEs')), 'Contraindicação formal de anti-inflamatórios');
  assert.ok(resCaso5.detalhes.condutas.some(c => c.includes('cabeceira elevada a 30-45º')), 'Cabeceira elevada para decantação');
  console.log('✓ Teste 5: Hifema traumático com cabeceira elevada e bloqueio estrito de AAS/AINEs aprovado');

  // 6. Caso 6: Fratura de Órbita ("Blowout") e Bloqueio de Assoar Nariz
  const resCaso6 = OftalmologiaEmergenciaService.avaliar({
    trauma: true,
    enfisemaSubcutaneo: true
  });
  assert.ok(resCaso6.detalhes.bloqueios.some(b => b.includes('PROIBIDO ASSOAR O NARIZ')), 'Bloqueio formal de assoar o nariz contra enfisema orbitário');
  console.log('✓ Teste 6: Fratura de órbita com proibição de assoar nariz aprovado');

  // 7. Caso 7: Parser de Texto Livre
  const textoLivre = "glaucoma agudo dor ocular intensa olho vermelho midriase fixa pio 52";
  const paramsExt = OftalmologiaEmergenciaService.extrairParametrosTexto(textoLivre);
  assert.strictEqual(paramsExt.glaucoma, true, 'Glaucoma detectado');
  assert.strictEqual(paramsExt.pio, 52, 'PIO 52 detectada');
  assert.strictEqual(paramsExt.dorIntensa, true, 'Dor intensa detectada');
  assert.strictEqual(paramsExt.olhoVermelho, true, 'Olho vermelho detectado');
  assert.strictEqual(paramsExt.pupilaMidriaseFixa, true, 'Midríase fixa detectada');
  console.log('✓ Teste 7: Parser de texto livre aprovado');

  // 8. Caso 8: Formatação de Relatório Telegram
  const textoTelegram = OftalmologiaEmergenciaService.formatarTextoTelegram(resCaso2);
  assert.ok(textoTelegram.includes('OFTALMOLOGIA DE EMERGÊNCIA'), 'Header presente');
  assert.ok(textoTelegram.includes('GLAUCOMA DE ÂNGULO FECHADO'), 'Título de glaucoma presente');
  assert.ok(textoTelegram.includes('Acetazolamida 500 mg'), 'Acetazolamida presente');
  assert.ok(textoTelegram.includes('REGRA DE OURO / BLOQUEIO DA PILOCARPINA'), 'Regra da pilocarpina formatada');
  console.log('✓ Teste 8: Formatação de relatório Telegram aprovada');

  console.log('\n🚀 TODOS OS TESTES DE OFTALMOLOGIA DE EMERGÊNCIA PASSARAM COM 100% DE SUCESSO!\n');
}

runTests();
