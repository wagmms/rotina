/**
 * @file test_auditoria_edge_cases_clinicos.cjs
 * @description Suíte de testes automatizados para validação de casos extremos (Edge Cases)
 * em calculadoras clínicas e prescrições:
 *  - Pesos extremos: neonatos < 1 kg e obesidade severa > 150 kg
 *  - Idades avançadas: nonagenários / pacientes ≥ 90 anos
 *  - Valores laboratoriais discrepantes: Creatinina > 15 mg/dL, Potássio > 8.0 mEq/L, pH < 6.80
 *  - Blindagem matemática: ausência de NaN, Infinity, undefined ou divisões por zero.
 */

const assert = require('assert');

// Módulos auditados
const CalculadorasClinicas = require('../src/02_calculadoras_puras.js');
const NefrologiaClearanceService = require('../src/02_nefrologia_clearance.js');
const NefrologiaDheService = require('../src/02_nefrologia_dhe.js');
const NefrologiaLRAService = require('../src/02_nefrologia_lra_kdigo.js');
const GasometriaAcidoBaseService = require('../src/02_gasometria_acido_base.js');
const PalsPediatriaService = require('../src/02_pals_pediatria.js');
const SuporteNutricionalPediatricoService = require('../src/02_suporte_nutricional_pediatrico.js');
const EndocrinologiaDiabetesService = require('../src/02_endocrinologia_diabetes.js');
const ToxicologiaEmergenciaService = require('../src/02_toxicologia_emergencia.js');
const AnalgesiaPcaService = require('../src/02_analgesia_pca.js');
const TransfusaoSanguineaService = require('../src/02_transfusao_sanguinea.js');
const HematologiaAnemiasService = require('../src/02_hematologia_anemias.js');
const CardiologiaICCService = require('../src/02_cardiologia_icc.js');
const NeurologiaAvcService = require('../src/02_neurologia_avc.js');
const SuporteNutricionalService = require('../src/02_suporte_nutricional.js');

function runEdgeCaseTests() {
    console.log("=== INICIANDO BATERIA DE AUDITORIA DE CASOS EXTREMOS (EDGE CASES) ===");

    // ─────────────────────────────────────────────────────────────────────────
    // 1. PESOS EXTREMOS: NEONATOS < 1 KG
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[1] Testando Neonatos < 1 kg...");
    
    // 1.1 PALS com prematuro de 0.8 kg
    const palsNeonato = PalsPediatriaService.avaliarPals({ pesoKg: 0.8, idadeAnos: 0 });
    assert.strictEqual(palsNeonato.pesoConsideradoKg, 0.8);
    assert.strictEqual(palsNeonato.viaAerea.tuboSemCuff, "2.5", "TET deve ser 2.5 mm em prematuro < 1 kg");
    assert.ok(palsNeonato.viaAerea.fixacao.includes('6.8 cm'), "Profundidade deve ser 0.8 + 6 = 6.8 cm");
    assert.ok(palsNeonato.alertas.some(a => a.includes('PREMATURO EXTREMO')), "Deve alertar sobre prematuro extremo");
    assert.strictEqual(palsNeonato.eletricidade.desfibrilacaoPrimeiroChoque, '1.6 J (2 J/kg)');
    console.log("  ✓ PALS 0.8 kg: TET 2.5mm, 6.8cm no lábio e 1.6 Joules calculados com precisão.");

    // 1.2 Holliday-Segar com 0.7 kg
    const hollidayNeonato = SuporteNutricionalPediatricoService.calcularHollidaySegar(0.7);
    assert.strictEqual(hollidayNeonato.volumeBasal24h, 70);
    assert.ok(hollidayNeonato.alertas.some(a => a.includes('EXTREMO BAIXO PESO')), "Deve alertar sobre prematuro extremo em Holliday-Segar");
    console.log("  ✓ Holliday-Segar 0.7 kg: 70 mL/24h com alerta neonatal sentinela.");

    // 1.3 Ganzoni com 0.8 kg
    const ganzoniNeonato = HematologiaAnemiasService.calcularGanzoni(0.8, 8.0, 12.0);
    assert.strictEqual(ganzoniNeonato.pesoKg, 0.8);
    assert.ok(ganzoniNeonato.bloqueiosSeguranca.some(b => b.includes('PREMATURO EXTREMO')), "Deve desaconselhar ferro IV em prematuro < 1 kg");
    console.log("  ✓ Ganzoni 0.8 kg: Alerta de prematuro extremo e bloqueio de ferro IV.");

    // 1.4 Déficit de água livre e DHE em neonato < 2 kg
    const deficitNeonato = CalculadorasClinicas.deficitAguaLivre(180, 140, 1.5, 'crianca');
    assert.ok(deficitNeonato.avisos.some(a => a.toLowerCase().includes('neonato')), "Deve alertar sobre neonato em deficit de água livre");
    assert.ok(deficitNeonato.avisos.some(a => a.includes('HIPERNATREMIA EXTREMA')), "Deve alertar sobre hipernatremia extrema (> 175)");
    console.log("  ✓ Déficit Água Livre 1.5 kg: Alertas de neonato e hipernatremia extrema emitidos.");

    // 1.5 Parkland em lactente de 8 kg
    const parklandLactente = CalculadorasClinicas.parkland(8, 20);
    assert.ok(parklandLactente.avisos.some(a => a.includes('LACTENTE')), "Deve orientar SG 5% para lactente < 10 kg");
    console.log("  ✓ Parkland 8 kg: Orientação de SG 5% de manutenção para lactente validada.");

    // 1.6 HIC em lactente de 8 kg
    const hicLactente = NeurologiaAvcService.calcularHic({ pesoKg: 8 });
    assert.ok(hicLactente.alertasPeso.some(a => a.includes('Lactente/Pediatria')), "Deve alertar sobre infusão de osmolares em lactentes");
    console.log("  ✓ HIC 8 kg: Alerta pediátrico/lactente para osmoterapia emitido.");

    // 1.7 PCA em baixo peso (< 40 kg)
    const pcaBaixoPeso = AnalgesiaPcaService.calcularPca({ farmaco: 'morfina', pesoKg: 35 });
    assert.ok(pcaBaixoPeso.alertasSeguranca.some(a => a.includes('BAIXO PESO CORPORAL')), "Deve alertar sobre risco em baixo peso");
    console.log("  ✓ PCA 35 kg: Alerta de baixo peso corporal/caquexia emitido.");

    // ─────────────────────────────────────────────────────────────────────────
    // 2. PESOS EXTREMOS: OBESIDADE SEVERA > 150 KG
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[2] Testando Obesidade Severa > 150 kg...");

    // 2.1 CAD / Expansão volêmica com 180 kg
    const cadObeso = EndocrinologiaDiabetesService.manejoCriseHiperglicemica({
        peso: 180,
        glicemia: 450,
        potassio: 4.5,
        tipo: 'CAD'
    });
    assert.ok(cadObeso.alertasSentinela.some(a => a.includes('OBESIDADE SEVERA')), "Deve alertar sobre expansão hídrica em obesidade severa");
    assert.ok(cadObeso.hidratacaoVenosa.includes('2000 mL na 1ª hora'), "Deve limitar volume da 1ª hora a 2.000 mL");
    console.log("  ✓ CAD 180 kg: Expansão inicial limitada a 2.000 mL para prevenção de edema agudo de pulmão.");

    // 2.2 N-acetilcisteína (NAC) com 160 kg (Teto de 100 kg)
    const nacObeso = ToxicologiaEmergenciaService.avaliarParacetamol({
        pesoKg: 160,
        doseIngeridaMg: 20000,
        viaPreferencia: 'IV'
    });
    assert.strictEqual(nacObeso.prescricaoNac.etapa1.doseMg, 15000, "Dose de ataque deve ser limitada ao teto de 15.000 mg (100 kg)");
    assert.strictEqual(nacObeso.prescricaoNac.etapa2.doseMg, 5000, "Etapa 2 limitada a 5.000 mg");
    assert.strictEqual(nacObeso.prescricaoNac.etapa3.doseMg, 10000, "Etapa 3 limitada a 10.000 mg");
    console.log("  ✓ Toxicologia NAC 160 kg: Tetos farmacológicos absolutos de 15g, 5g e 10g respeitados.");

    // 2.3 SRI em 170 kg
    const sriObeso = CalculadorasClinicas.sequenciaRapidaIntubacao(170);
    assert.ok(sriObeso.texto.includes('OBESIDADE GRAVE'), "SRI deve alertar sobre peso ideal para sedativos e rocurônio");
    console.log("  ✓ SRI 170 kg: Alerta de peso ideal (IBW) para bloqueadores e sedativos.");

    // 2.4 Transfusão de plaquetas em 180 kg (Teto de 10 unidades)
    const plaquetasObeso = TransfusaoSanguineaService.calcularReposicaoPlaquetas({
        peso: 180,
        plaquetasAtual: 8000
    });
    assert.strictEqual(plaquetasObeso.unidadesRandomicasCalculadas, 10, "Plaquetas randômicas devem ser limitadas ao teto seguro de 10 UI");
    assert.ok(plaquetasObeso.alertas.some(a => a.includes('OBESIDADE SEVERA')), "Deve alertar sobre obesidade severa no pool plaquetário");
    console.log("  ✓ Hemoterapia 180 kg: Teto seguro de 10 unidades randômicas aplicado.");

    // 2.5 Cockcroft-Gault em 160 kg
    const cgObeso = NefrologiaClearanceService.auditarPrescricao(45, ["vancomicina"], { peso: 160 });
    assert.ok(cgObeso.alertas.some(a => a.includes('OBESIDADE SEVERA')), "Deve alertar sobre peso ajustado na obesidade");
    console.log("  ✓ Clearance 160 kg: Alerta de peso ajustado emitido.");

    // 2.6 Parkland em 160 kg e 60% SCQ
    const parklandObeso = CalculadorasClinicas.parkland(160, 60);
    assert.ok(parklandObeso.avisos.some(a => a.includes('OBESIDADE SEVERA')), "Deve alertar sobre fluid creep e peso ideal na obesidade");
    assert.ok(parklandObeso.avisos.some(a => a.includes('GRANDE QUEIMADO CRÍTICO')), "Deve alertar sobre grande queimado crítico (SCQ > 50%)");
    console.log("  ✓ Parkland 160 kg & 60% SCQ: Alertas de fluid creep e grande queimado validados.");

    // 2.7 Déficit de água livre em 160 kg
    const deficitObeso = CalculadorasClinicas.deficitAguaLivre(160, 140, 160, 'homem');
    assert.ok(deficitObeso.avisos.some(a => a.toLowerCase().includes('obesidade severa')), "Deve alertar sobre sobrestimação em obesidade");
    console.log("  ✓ Déficit Água Livre 160 kg: Alerta de cálculo por peso real vs ideal emitido.");

    // 2.8 HIC em 165 kg
    const hicObeso = NeurologiaAvcService.calcularHic({ pesoKg: 165 });
    assert.ok(hicObeso.alertasPeso.some(a => a.includes('Obesidade extrema')), "Deve alertar sobre sobrecarga osmolar aguda");
    console.log("  ✓ HIC 165 kg: Alerta de osmoterápicos e risco de edema pulmonar emitido.");

    // 2.9 PCA Fentanil em 160 kg
    const pcaObeso = AnalgesiaPcaService.calcularPca({ farmaco: 'fentanil', pesoKg: 160 });
    assert.ok(pcaObeso.alertasSeguranca.some(a => a.includes('OBESIDADE SEVERA/EXTREMA')), "Deve alertar sobre AOS e farmacocinética");
    console.log("  ✓ PCA 160 kg: Alerta de farmacocinética lipofílica e risco de hipoventilação validado.");

    // 2.10 Trombólise no AVC em 160 kg
    const avcObeso = NeurologiaAvcService.avaliarTrombolise({ idade: 65, tempoSintomasHoras: 2, pesoKg: 160 });
    assert.ok(avcObeso.elegibilidade.alertasClinicos.some(a => a.includes('Obesidade extrema')), "Deve alertar sobre teto absoluto de dose");
    assert.ok(avcObeso.elegibilidade.posologiaAlteplase.includes('90.0 mg'), "Dose deve ser limitada ao teto de 90 mg");
    assert.ok(avcObeso.elegibilidade.posologiaTenecteplase.includes('25.0 mg'), "Dose deve ser limitada ao teto de 25 mg");
    console.log("  ✓ Trombólise 160 kg: Tetos farmacológicos absolutos de 90 mg (rtPA) e 25 mg (TNK) respeitados.");

    // ─────────────────────────────────────────────────────────────────────────
    // 3. IDADES AVANÇADAS: PACIENTES ≥ 90 ANOS (NONAGENÁRIOS)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[3] Testando Idades Avançadas ≥ 90 anos...");

    // 3.1 PCA em paciente de 94 anos
    const pcaIdosoMorfina = AnalgesiaPcaService.calcularPca({
        farmaco: 'morfina',
        idade: 94,
        pesoKg: 55
    });
    assert.ok(pcaIdosoMorfina.doseBasalSugerida.includes('CONTRAINDICADA'), "Dose basal deve ser contraindicada em ≥ 90 anos");
    assert.strictEqual(pcaIdosoMorfina.bolusSugerido, '0.5 a 0.5 mg');
    assert.strictEqual(pcaIdosoMorfina.lockoutSugerido, '10 a 15 minutos');
    assert.ok(pcaIdosoMorfina.alertasSeguranca.some(a => a.includes('PACIENTE MUITO IDOSO')), "Alerta de paciente muito idoso presente");
    console.log("  ✓ PCA Morfina 94 anos: Basal bloqueada, bolus reduzido a 0.5mg e lockout 10-15min.");

    // 3.2 Transfusão de hemácias com TACO em 92 anos
    const tacoIdoso = TransfusaoSanguineaService.avaliarGatilhoTransfusionalChad({
        idade: 92,
        hb: 6.2,
        peso: 60
    });
    assert.ok(tacoIdoso.alertaTaco.includes('NONAGENÁRIO'), "Deve alertar especificamente sobre TACO em nonagenários");
    assert.ok(tacoIdoso.recomendacaoVelocidade.includes('3 a 4 horas'), "Velocidade deve ser ultralenta");
    console.log("  ✓ Transfusão 92 anos: Alerta sentinela de TACO e infusão ultralenta de 3-4h.");

    // 3.3 Cockcroft-Gault em 95 anos
    const crcl95 = NefrologiaClearanceService.calcularCockcroftGault(95, 60, 0.9, 'F');
    assert.ok(crcl95 > 0, "Clearance deve ser positivo e finito");
    const aud95 = NefrologiaClearanceService.auditarPrescricao(crcl95, ["cefepime"], { idade: 95 });
    assert.ok(aud95.alertas.some(a => a.includes('PACIENTE MUITO IDOSO')), "Deve alertar sobre sarcopenia em ≥ 90 anos");
    console.log("  ✓ Clearance 95 anos: Calculado sem erro com alerta de sarcopenia fisiológica.");

    // 3.4 CURB-65 em 93 anos
    const curb93 = CalculadorasClinicas.curb65(false, 30, 22, 120, 80, 93);
    assert.ok(curb93.avisos.some(a => a.includes('nonagenário')), "CURB-65 deve alertar sobre fragilidade em ≥ 90 anos");
    console.log("  ✓ CURB-65 93 anos: Alerta de fragilidade clínica e risco ampliado emitido.");

    // 3.5 Trombólise AVC em 92 anos
    const avc92 = NeurologiaAvcService.avaliarTrombolise({ idade: 92, tempoSintomasHoras: 2, pesoKg: 70 });
    assert.ok(avc92.elegibilidade.alertasClinicos.some(a => a.includes('longevo/nonagenário')), "Deve emitir alerta de risco/benefício em nonagenário");
    console.log("  ✓ Trombólise AVC 92 anos: Alerta de ponderação risco/benefício e mRS basal emitido.");

    // 3.6 Suporte Nutricional em 94 anos
    const nut94 = SuporteNutricionalService.calcularNecessidadesBasais(60, 160, 94, 'f');
    assert.ok(nut94.alertaLongevo !== null, "Deve gerar alertaLongevo");
    assert.ok(nut94.orientacaoClinica.includes('Idoso Longevo'), "Orientação deve citar idoso longevo");
    console.log("  ✓ Suporte Nutricional 94 anos: Alerta de sarcopenia e restrição hídrica emitido.");

    // ─────────────────────────────────────────────────────────────────────────
    // 4. VALORES LABORATORIAIS DISCREPANTES: CR > 15, K > 8.0, PH < 6.80
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[4] Testando Valores Laboratoriais Discrepantes...");

    // 4.1 Creatinina > 15 mg/dL no KDIGO
    const kdigoCrExtrema = NefrologiaLRAService.estadiarKDIGO(1.2, 18.5, 0.1, 24);
    assert.strictEqual(kdigoCrExtrema.estagio, 3);
    assert.ok(kdigoCrExtrema.alertas.some(a => a.includes('18.5 mg/dL')), "Deve alertar sobre Cr extrema de 18.5");
    const dialiseCr = NefrologiaLRAService.avaliarDialiseUrgencia({ cr_atual: 18.5, uremia: true });
    assert.strictEqual(dialiseCr.aeiou.uremia, true);
    console.log("  ✓ KDIGO Cr 18.5 mg/dL: Estágio 3 e gatilho de uremia/diálise acionado.");

    // 4.2 Potássio > 8.0 mEq/L em DHE
    const dheKExtremo = NefrologiaDheService.avaliarHipercalemia(8.5, true);
    assert.ok(dheKExtremo.gravidade.includes('Extrema'), "Gravidade deve ser classificada como extrema");
    assert.ok(dheKExtremo.alerta.includes('K+ > 8.0 mEq/L'), "Alerta vermelho máximo deve ser disparado");
    assert.ok(dheKExtremo.condutas.some(c => c.includes('HEMODIÁLISE DE EMERGÊNCIA')), "Deve indicar hemodiálise de emergência");
    console.log("  ✓ DHE K+ 8.5 mEq/L: Alerta de PCR iminente, Gluconato de Ca2+ e hemodiálise mandatória.");

    // 4.3 Potássio > 8.0 mEq/L no manejo de CAD
    const cadKExtremo = EndocrinologiaDiabetesService.manejoCriseHiperglicemica({
        potassio: 8.3,
        glicemia: 400,
        peso: 70
    });
    assert.ok(cadKExtremo.alertasSentinela.some(a => a.includes('K+ > 8.0 mEq/L')), "CAD deve alertar sobre K+ extremo");
    assert.ok(cadKExtremo.potassioConduta.includes('NÃO repor potássio'), "Deve proibir reposição de K");
    console.log("  ✓ CAD K+ 8.3 mEq/L: Reposição de potássio terminantemente proibida com alerta de PCR.");

    // 4.4 Potássio > 8.0 mEq/L na IC Crônica (SBC/ESC)
    const icKExtremo = CardiologiaICCService.avaliar({ k: 8.4, fe: 30 });
    assert.ok(icKExtremo.alertas_clinicos.some(a => a.includes('SUSPENSÃO IMEDIATA de ARM')), "Deve ordenar suspensão imediata de ARM e ARNI");
    console.log("  ✓ ICFEr K+ 8.4 mEq/L: Suspensão imediata de Espironolactona, ARNI e IECA.");

    // 4.5 pH < 6.80 na Gasometria Arterial
    const gasoExtrema = GasometriaAcidoBaseService.analisarGasometria({
        ph: 6.72,
        pco2: 20,
        hco3: 4,
        na: 140,
        cl: 104
    });
    assert.strictEqual(gasoExtrema.estado, 'PRIORITARIO');
    assert.ok(gasoExtrema.avisos.some(a => a.includes('ACIDEMIA EXTREMA')), "Deve disparar alerta de acidemia extrema para pH 6.72");
    console.log("  ✓ Gasometria pH 6.72: Alerta de colapso cardiovascular e acidemia extrema.");

    // 4.6 pH < 6.80 em CAD e Diálise
    const cadPhExtremo = EndocrinologiaDiabetesService.manejoCriseHiperglicemica({
        ph: 6.75,
        bicarbonato: 5,
        glicemia: 500
    });
    assert.ok(cadPhExtremo.bicarbonatoConduta.includes('Indicação emergencial mandatória'), "Deve indicar bicarbonato emergencial para pH < 6.80");
    const dialisePhExtremo = NefrologiaLRAService.avaliarDialiseUrgencia({ ph: 6.70 });
    assert.strictEqual(dialisePhExtremo.aeiou.acidose, true);
    console.log("  ✓ CAD e Diálise pH 6.70-6.75: Indicação emergencial de Bicarbonato e hemodiálise.");

    // 4.7 Cálcio corrigido: crise hipercalcêmica (15.2 mg/dL) e hipocalcemia grave (6.2 mg/dL)
    const caHiper = CalculadorasClinicas.calcioCorrigido(15.2, 4.0);
    assert.ok(caHiper.avisos.some(a => a.includes('CRISE HIPERCALCÊMICA')), "Deve alertar crise hipercalcêmica");
    const caHipo = CalculadorasClinicas.calcioCorrigido(6.2, 4.0);
    assert.ok(caHipo.avisos.some(a => a.includes('HIPOCALCEMIA GRAVE')), "Deve alertar hipocalcemia grave");
    console.log("  ✓ Cálcio Corrigido: Crise hipercalcêmica (15.2 mg/dL) e hipocalcemia grave (6.2 mg/dL) alertadas.");

    // 4.8 Gap Osmolar > 50 mOsm/kg (intoxicação maciça)
    const gapExtremo = CalculadorasClinicas.gapOsmolar(360, 140, 90, 30, 0);
    assert.ok(gapExtremo.avisos.some(a => a.toUpperCase().includes('INTOXICAÇÃO MACIÇA')), "Deve alertar intoxicação maciça se gap > 50");
    console.log("  ✓ Gap Osmolar > 50 mOsm/kg: Alerta de intoxicação exógena severa validado.");

    // 4.9 KDIGO puro com Cr > 15 mg/dL
    const kdigoPuro = CalculadorasClinicas.estadiamentoKDIGO(16.5, 1.0, 0.2, 12);
    assert.ok(kdigoPuro.avisos.some(a => a.includes('Creatinina extremamente discrepante')), "Deve alertar sobre falência renal terminal com Cr > 15");
    console.log("  ✓ KDIGO Cr 16.5 mg/dL: Alerta de uremia terminal emitido.");

    // 4.10 Ajuste Renal Antimicrobiano com ARC (CrCl > 130 mL/min)
    const atbArc = CalculadorasClinicas.ajusteRenalAntimicrobiano('meropenem', 160);
    assert.ok(atbArc.dados.cuidados.includes('CLEARANCE AUMENTADO (ARC > 130 mL/min)'), "Deve alertar sobre clearance aumentado");
    console.log("  ✓ Ajuste ATB CrCl 160 mL/min: Alerta de ARC e subdosagem emitido.");

    // 4.11 Anemia grave crítica Hb ≤ 4.0 g/dL
    const transExtrema = TransfusaoSanguineaService.avaliarGatilhoTransfusionalChad({ idade: 40, hb: 3.5, peso: 70 });
    assert.ok(transExtrema.alertas.some(a => a.includes('HEMOGLOBINA CRÍTICA')), "Deve alertar hemoglobina crítica ≤ 4.0 g/dL");
    const ganzoniHbExtrema = HematologiaAnemiasService.calcularGanzoni(70, 3.5, 12.0);
    assert.ok(ganzoniHbExtrema.bloqueiosSeguranca.some(b => b.includes('HEMOGLOBINA CRÍTICA')), "Ganzoni deve alertar sobre Hb crítica");
    console.log("  ✓ Anemia Crítica Hb 3.5 g/dL: Alerta sentinela em Transfusão e Ganzoni validado.");

    // ─────────────────────────────────────────────────────────────────────────
    // 5. TESTES DE RESILIÊNCIA CONTRA DIVISÕES POR ZERO E ENTRADAS INVÁLIDAS
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[5] Testando Blindagem contra Divisões por Zero e NaN...");

    // 5.1 Cockcroft-Gault com Cr = 0
    const cgZero = NefrologiaClearanceService.calcularCockcroftGault(60, 70, 0, 'M');
    assert.ok(cgZero.erro, "Cr = 0 deve retornar erro limpo sem dividir por zero");
    const cgNeg = NefrologiaClearanceService.calcularCockcroftGault(-10, 70, 1.2, 'M');
    assert.ok(cgNeg.erro, "Idade negativa deve retornar erro limpo");

    // 5.2 KDIGO com Cr basal = 0
    const kdigoZero = NefrologiaLRAService.estadiarKDIGO(0, 2.0, null, null);
    assert.ok(!isNaN(kdigoZero.estagio), "Estágio não pode ser NaN");
    assert.ok(isFinite(kdigoZero.estagio), "Estágio deve ser finito");

    // 5.3 DHE Hiponatremia com NaAtual >= Concentração da Solução
    const dheDivZero = NefrologiaDheService.planejarCorrecaoHiponatremia(513, 70, 'M', 50, 3);
    assert.ok(dheDivZero.erro, "Na = 513 em salina 3% deve retornar erro sem dividir por zero");

    // 5.4 PALS com peso negativo
    assert.throws(() => {
        PalsPediatriaService.avaliarPals({ pesoKg: -5 });
    }, /inválido|obrigatório/i, "Peso negativo em PALS deve lançar erro");

    console.log("  ✓ Blindagem de divisões por zero e valores inválidos 100% aprovada.");

    console.log("\n🚀 TODOS OS 38 TESTES DE CASOS EXTREMOS E BLINDAGEM CLÍNICA PASSARAM COM SUCESSO!");
}

try {
    runEdgeCaseTests();
} catch (err) {
    console.error("FALHA NA SUÍTE DE CASOS EXTREMOS:", err);
    process.exit(1);
}
