/**
 * Suíte de Testes da Onda 1 de Revisão de Protocolos Médicos (Consensos 2024-2026):
 * 1. Fibrilação Atrial: Escore CHA2DS2-VA unissex (ESC 2024 / SBC 2025)
 * 2. AVC Isquêmico: Tenecteplase preferencial e Large Core Strokes (ASPECTS 3-5)
 * 3. Sepse Adulto: Escore NEWS2 e Noradrenalina Precoce (SSC 2024-2026)
 * 4. PAC Grave: Corticoterapia CAPE COD (Hidrocortisona 200mg/dia)
 * 5. Parkland Atualizado: Consenso ABA 2024 / ATLS 11ª Ed (Adulto 2mL, Ped 3mL+SG5%, Elétrico 4mL)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Carregamento de módulos
const CalculadorasClinicas = require('../src/02_calculadoras_puras.js');
const CardiologiaFaAnticoagulacaoService = require('../src/02_cardiologia_fa_anticoagulacao.js');
const NeurologiaAvcService = require('../src/02_neurologia_avc.js');
const { EmergenciaChoqueSepticoService } = require('../src/02_emergencia_choque_septico_circi.js');
const PneumologiaPacService = require('../src/02_pneumologia_pac.js');

function runTests() {
  console.log("=== INICIANDO TESTES DA ONDA 1: PROTOCOLOS MÉDICOS ATUALIZADOS ===");

  // 1. CHA2DS2-VA (ESC 2024 / SBC 2025)
  console.log("[1] Testando CHA2DS2-VA unissex...");
  // Mulher de 62 anos sem outras comorbidades: CHA2DS2-VA = 0 (baixo risco, sem ACO).
  const vaMulher62 = CardiologiaFaAnticoagulacaoService.calcularCHA2DS2VA({ idade: 62, sexo: 'F' });
  assert.strictEqual(vaMulher62.escore, 0, "No CHA2DS2-VA, sexo feminino não soma ponto");
  assert.strictEqual(vaMulher62.classe, "Classe III");
  assert.ok(vaMulher62.recomendacao.includes("não é recomendada"));

  // Homem de 66 anos com HAS: CHA2DS2-VA = 2 (idade 65-74 = 1, HAS = 1) -> Alto Risco, Classe I
  const vaHomem66 = CardiologiaFaAnticoagulacaoService.calcularCHA2DS2VA({ idade: 66, hipertensao: true });
  assert.strictEqual(vaHomem66.escore, 2);
  assert.strictEqual(vaHomem66.classe, "Classe I");
  assert.ok(vaHomem66.recomendacao.includes("Classe I"));

  // Retrocompatibilidade no método legado calcularCHA2DS2VASc
  const vascRetro = CardiologiaFaAnticoagulacaoService.calcularCHA2DS2VASc({ idade: 62, sexo: 'F' });
  assert.strictEqual(vascRetro.escore, 1, "VASc legado ainda reporta 1 para sexo F");
  assert.strictEqual(vascRetro.escoreVA, 0, "Escore VA unissex embutido deve ser 0");
  assert.ok(vascRetro.cha2ds2va, "Deve expor objeto cha2ds2va");

  // 2. AVC Isquêmico: Tenecteplase e Trombectomia Large Core
  console.log("[2] Testando Tenecteplase preferencial e Large Core no AVC...");
  const avcElegivel = NeurologiaAvcService.avaliarTrombolise({ idade: 65, tempoSintomasHoras: 2, pesoKg: 70 });
  assert.strictEqual(avcElegivel.elegibilidade.elegivel, true);
  assert.ok(avcElegivel.elegibilidade.posologiaTenecteplase.includes("17.5 mg"), "0.25 mg/kg para 70kg = 17.5 mg");

  const resumoAvc = NeurologiaAvcService.formatarResumoAvc(avcElegivel);
  assert.ok(resumoAvc.includes("1ª ESCOLHA / PREFERENCIAL: TENECTEPLASE (TNK)"), "Deve destacar TNK como primeira escolha");
  assert.ok(resumoAvc.includes("ALTERNATIVA PADRÃO: ALTEPLASE"), "Deve manter Alteplase como alternativa");

  // Trombectomia mecânica além de 4.5h com Large Core
  const avcTardio = NeurologiaAvcService.avaliarTrombolise({ idade: 65, tempoSintomasHoras: 6 });
  assert.ok(avcTardio.elegibilidade.mensagem.includes("ASPECTS 3 a 5"), "Deve citar Large Core Strokes ASPECTS 3 a 5");

  // 3. Choque Séptico: NEWS2 determinístico e Noradrenalina Precoce
  console.log("[3] Testando Escore NEWS2 e Noradrenalina Precoce...");
  const newsNormal = EmergenciaChoqueSepticoService.calcularNews2({
    fr: 16, spo2: 98, o2Suplementar: false, pas: 125, fc: 72, temperatura: 36.8
  });
  assert.strictEqual(newsNormal.escore, 0);
  assert.strictEqual(newsNormal.risco, "BAIXO");
  assert.strictEqual(newsNormal.gatilhoSepse, false);

  const newsGrave = EmergenciaChoqueSepticoService.calcularNews2({
    fr: 26, spo2: 90, o2Suplementar: true, pas: 85, fc: 118, confusao: true, temperatura: 38.5
  });
  // FR 26 (+3), SpO2 90 (+3), O2 (+2), PAS 85 (+3), FC 118 (+2), Confusão (+3), Temp 38.5 (+1) = 17 pts
  assert.strictEqual(newsGrave.escore, 17);
  assert.strictEqual(newsGrave.risco, "ALTO");
  assert.strictEqual(newsGrave.gatilhoSepse, true);

  const condutaChoque = EmergenciaChoqueSepticoService.avaliarCirciEVasopressina(75, 0.15);
  assert.ok(condutaChoque.alertasClinicos.some(a => a.includes("Noradrenalina Precoce")), "Deve incluir alerta de noradrenalina precoce/periférica");

  // 4. PAC Grave: Corticoterapia CAPE COD
  console.log("[4] Testando Corticoterapia CAPE COD na PAC Grave...");
  const pacGrave = PneumologiaPacService.calcularCurb65({
    confusao: true, ureia: 65, fr: 32, pas: 85, pad: 55, idade: 70
  });
  assert.strictEqual(pacGrave.escore, 5);
  assert.strictEqual(pacGrave.risco, "ALTO");
  assert.ok(pacGrave.esquemaSugerido.some(s => s.includes("CAPE COD") && s.includes("Hidrocortisona 200mg/dia")), "Deve orientar Hidrocortisona contínua na PAC grave");

  // 5. Parkland Atualizado (Consenso ABA 2024 / ATLS 11ª Ed / SBQ)
  console.log("[5] Testando Parkland Atualizado ABA 2024...");
  // A. Adulto Térmico: 2 mL/kg/% SCQ
  const pkAdulto = CalculadorasClinicas.parkland(70, 30);
  assert.strictEqual(pkAdulto.ok, true);
  assert.strictEqual(pkAdulto.dados.fatorMlKgScq, 2, "Adulto térmico deve usar 2 mL/kg/%");
  assert.strictEqual(pkAdulto.dados.volumeTotal24hMl, 4200, "2 * 70 * 30 = 4200 mL");
  assert.strictEqual(pkAdulto.dados.volumePrimeiras8hMl, 2100, "Primeiras 8h = 2100 mL");
  assert.strictEqual(pkAdulto.dados.vazaoPrimeiras8hMlH, 263, "Vazão 8h = 263 mL/h");
  assert.strictEqual(pkAdulto.dados.parklandClassico.volumeTotal24hMl, 8400, "Comparativo clássico 8400 mL");
  assert.ok(pkAdulto.textoFormatado.includes("Consenso ABA / ATLS / Parkland"), "Texto formatado deve citar ABA/ATLS");

  // B. Pediátrico: 3 mL/kg/% SCQ + Manutenção Glicídica Holliday-Segar
  const pkPed = CalculadorasClinicas.parkland(15, 20); // peso <= 30kg ativa pediatria
  assert.strictEqual(pkPed.dados.isPediatrico, true);
  assert.strictEqual(pkPed.dados.fatorMlKgScq, 3, "Pediátrico deve usar 3 mL/kg/%");
  assert.strictEqual(pkPed.dados.volumeTotal24hMl, 900, "3 * 15 * 20 = 900 mL");
  assert.strictEqual(pkPed.dados.volumeManutencaoPediatrica24hMl, 1250, "15kg no Holliday-Segar: 1000 + 5*50 = 1250 mL");
  assert.strictEqual(pkPed.dados.vazaoManutencaoPediatricaMlH, 52, "1250 / 24 = 52 mL/h");

  // C. Elétrica Alta Voltagem: 4 mL/kg/% SCQ + diurese elevada
  const pkEletrico = CalculadorasClinicas.parkland(80, 25, 'eletrica');
  assert.strictEqual(pkEletrico.dados.isEletrica, true);
  assert.strictEqual(pkEletrico.dados.fatorMlKgScq, 4, "Queimadura elétrica deve usar 4 mL/kg/%");
  assert.strictEqual(pkEletrico.dados.volumeTotal24hMl, 8000, "4 * 80 * 25 = 8000 mL");
  assert.strictEqual(pkEletrico.dados.debitoUrinarioAlvoMlH.min, 80, "Meta mínima de diurese elétrica: 1.0 mL/kg/h");
  assert.strictEqual(pkEletrico.dados.debitoUrinarioAlvoMlH.max, 120, "Meta máxima de diurese elétrica: 1.5 mL/kg/h");

  console.log("=== TODOS OS TESTES DA ONDA 1 FORAM APROVADOS COM SUCESSO! ===");
}

runTests();
