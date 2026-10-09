/**
 * Testes Unitários: Módulo de Ginecologia Endócrina e Cirúrgica — Endometriose e Dor Pélvica Crônica
 * Diretrizes Oficiais: ESHRE (2022/2024) / FEBRASGO (2024-2026) / AAGL (2021)
 */

const assert = require('assert');
const path = require('path');

const GinecologiaEndometrioseService = require('../src/02_ginecologia_endometriose.js');

function runTests() {
  console.log('Iniciando testes rigorosos de Ginecologia — Endometriose e Dor Pélvica Crônica...');

  // 1. Caso Clínico 1: Dor Pélvica Clássica sem Desejo Reprodutivo Imediato
  const resCaso1 = GinecologiaEndometrioseService.avaliar({
    dismenorreia: true,
    dispareunia: true,
    dorPelvicaCronica: true,
    evaDor: 8,
    desejoGestacional: false
  });
  assert.strictEqual(resCaso1.sucesso, true, 'Execução com sucesso');
  assert.strictEqual(resCaso1.diagnostico.suspeitaClinica, true, 'Deve confirmar alta suspeita clínica');
  assert.strictEqual(resCaso1.diagnostico.classificacaoSintomas.total6Ds, 3, 'Deve identificar 3 sintomas clássicos dos 6 Ds');
  assert.strictEqual(resCaso1.diagnostico.indicacaoCirurgicaUrgente, false, 'Sem indicação cirúrgica urgente');
  assert.ok(resCaso1.condutaFarmacologica.some(c => c.includes('Dienogeste 2 mg')), 'Deve prescrever Dienogeste como 1ª linha');
  assert.ok(resCaso1.condutaFarmacologica.some(c => c.includes('SIU-LNG 52 mg')), 'Deve sugerir SIU-LNG como alternativa');
  console.log('✓ Teste 1: Endometriose sintomática clássica (1ª linha progestagênios) aprovado');

  // 2. Caso Clínico 2: Desejo Reprodutivo Ativo — Bloqueio de Hormonioterapia
  const resCaso2 = GinecologiaEndometrioseService.avaliar({
    dismenorreia: true,
    desejoGestacional: true
  });
  assert.ok(resCaso2.alertas.some(a => a.includes('BLOQUEIO MANDATÓRIO DE TRATAMENTO HORMONAL')), 'Deve bloquear hormonioterapia contraceptiva');
  console.log('✓ Teste 2: Bloqueio mandatPoint de hormonioterapia contraceptiva em tentante aprovado');

  // 3. Caso Clínico 3: Desejo Gestacional com Baixa Reserva Ovariana (Indicação Direta de FIV)
  const resCaso3 = GinecologiaEndometrioseService.avaliar({
    idade: 36,
    infertilidade: true,
    desejoGestacional: true,
    amh: 0.8, // Reserva baixa (< 1.1)
    endometrioma: true,
    endometriomaTamanhoCm: 4
  });
  assert.strictEqual(resCaso3.diagnostico.indicacaoCirurgicaUrgente, false, 'Sem indicação de cirurgia urgente');
  assert.ok(resCaso3.planoReprodutivo.some(d => d.includes('Fertilização in Vitro - FIV')), 'Deve indicar FIV como conduta preferencial');
  assert.ok(resCaso3.planoReprodutivo.some(d => d.includes('Evitar cirurgias ovarianas repetidas')), 'Alerta contra dano iatrogênico ovariano');
  console.log('✓ Teste 3: Decisão reprodutiva (FIV vs dano folicular ovariano) aprovado');

  // 4. Caso Clínico 4: Emergência / Indicação Cirúrgica Mandatória (Hidronefrose Ureteral)
  const resCaso4 = GinecologiaEndometrioseService.avaliar({
    dismenorreia: true,
    disuria: true,
    acometimentoUreteral: true,
    hidronefrose: true
  });
  assert.strictEqual(resCaso4.diagnostico.indicacaoCirurgicaUrgente, true, 'Deve indicar cirurgia mandatória urgente');
  assert.ok(resCaso4.diagnostico.redFlags.some(rf => rf.orgao.includes('Ureter') || rf.achado.includes('Hidronefrose')), 'Deve apontar risco renal');
  console.log('✓ Teste 4: Indicação cirúrgica mandatória por acometimento ureteral aprovado');

  // 5. Caso Clínico 5: Terapia de 2ª Linha (Falha de 1ª Linha -> GnRH com Add-Back)
  const resCaso5 = GinecologiaEndometrioseService.avaliar({
    dismenorreia: true,
    falhaDienogeste: true,
    evaDor: 9
  });
  assert.ok(resCaso5.condutaFarmacologica.some(c => c.includes('ESCALONAMENTO PARA 2ª LINHA')), 'Deve indicar escalonamento para 2ª linha');
  assert.ok(resCaso5.condutaFarmacologica.some(c => c.includes('Relugolix')), 'Deve conter Relugolix');
  assert.ok(resCaso5.condutaFarmacologica.some(c => c.includes('Add-Back Therapy OBRIGATÓRIA')), 'Deve conter regra mandatória de add-back');
  console.log('✓ Teste 5: Terapia de 2ª linha (GnRH e Add-Back) aprovado');

  // 6. Teste de Extração de Parâmetros de Texto Livre
  const textoLivre = "endometriose 35 anos dismenorreia dispareunia eva 8 amh 0.7 endometrioma 4cm tentando engravidar";
  const paramsExt = GinecologiaEndometrioseService.extrairParametrosTexto(textoLivre);
  assert.strictEqual(paramsExt.idade, 35, 'Idade deve ser 35');
  assert.strictEqual(paramsExt.dismenorreia, true, 'Dismenorreia detectada');
  assert.strictEqual(paramsExt.dispareunia, true, 'Dispareunia detectada');
  assert.strictEqual(paramsExt.evaDor, 8, 'EVA 8 detectado');
  assert.strictEqual(paramsExt.amh, 0.7, 'AMH 0.7 detectado');
  assert.strictEqual(paramsExt.desejoGestacional, true, 'Desejo gestacional detectado');
  assert.strictEqual(paramsExt.endometrioma, true, 'Endometrioma detectado');
  assert.strictEqual(paramsExt.endometriomaTamanhoCm, 4, 'Endometrioma 4cm detectado');
  console.log('✓ Teste 6: Extração de texto livre aprovada');

  // 7. Formatação Telegram
  const textoFormatado = GinecologiaEndometrioseService.formatarTextoTelegram(resCaso3);
  assert.ok(textoFormatado.includes('ENDOMETRIOSE E DOR PÉLVICA CRÔNICA'), 'Header correto');
  assert.ok(textoFormatado.includes('CONDUTA REPRODUTIVA & FERTILIDADE'), 'Contém seção reprodutiva');
  assert.ok(textoFormatado.includes('Fertilização in Vitro - FIV'), 'Menciona FIV');
  console.log('✓ Teste 7: Formatação de relatório aprovada');

  console.log('\n🚀 TODOS OS TESTES DE GINECOLOGIA (ENDOMETRIOSE & DOR PÉLVICA CRÔNICA) PASSARAM COM 100% DE SUCESSO!\n');
}

runTests();
