const CalculadorasClinicas = require('../src/02_calculadoras_puras.js');

function runTest() {
  console.log("Iniciando testes da Auditoria Pediátrica e Schwartz...");
  let errors = [];

  function ok(condition, message) {
    if (!condition) {
      errors.push("FALHA: " + message);
      console.error("❌ " + message);
    } else {
      console.log("✅ " + message);
    }
  }

  // Teste: Schwartz Pediátrico
  let r = CalculadorasClinicas.schwartzPediatrico(0.8, 120);
  ok(r.ok && Math.abs(r.dados.clearance - 61.9) < 1.0, "Schwartz Pediátrico: Cr 0.8, Alt 120cm deve dar aprox 61.9 mL/min/1.73m2");
  
  // Teste: Tetos de dose máxima de adulto em crianças de peso elevado
  let rPos = CalculadorasClinicas.posologiaPediatrica(60, 'amoxicilina', { doseAlta: true });
  // dose bruta: 90 * 60 = 5400 mg/dia
  // dose maxima adulto: 1500 mg/dia
  ok(rPos.ok && rPos.dados.doseDiariaTotalMg === 1500, "Amoxicilina dose alta > 50kg: deve ser capada em 1500 mg/dia");
  ok(rPos.dados.orientacoes.includes('PESO ELEVADO'), "Alerta de peso elevado presente");

  // Teste: Regras de gota mínima em neonatos
  let rGota = CalculadorasClinicas.posologiaPediatrica(3.5, 'dipirona', { idadeAnos: 0.1 });
  // Contraindicado < 5kg ou < 3 meses
  ok(rGota.ok, "Cálculo ainda deve executar, mas com orientação de contraindicação");
  ok(rGota.dados.orientacoes.includes('CONTRAINDICAÇÃO'), "Dipirona contraindicada em < 5kg");

  let rGotaIbu = CalculadorasClinicas.posologiaPediatrica(6, 'ibuprofeno', { idadeAnos: 0.4 });
  ok(rGotaIbu.dados.orientacoes.includes('CONTRAINDICAÇÃO'), "Ibuprofeno contraindicado em < 6 meses");

  if (errors.length > 0) {
    console.error("Testes falharam com " + errors.length + " erros.");
    process.exit(1);
  } else {
    console.log("Todos os testes passaram com sucesso.");
    process.exit(0);
  }
}

runTest();
