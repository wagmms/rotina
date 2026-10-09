const assert = require('assert');
const NefrologiaClearanceService = require('../src/02_nefrologia_clearance.js');

function runTests() {
    console.log("=== Iniciando Testes: Nefrologia Clearance ===");
    
    // Teste 1: Cálculo Cockcroft-Gault Feminino
    const crclF = NefrologiaClearanceService.calcularCockcroftGault(60, 60, 1.2, 'F');
    // ((140 - 60) * 60) / (72 * 1.2) = 4800 / 86.4 = 55.55 * 0.85 = 47.2
    assert(crclF === 47.2, `Erro no crcl feminino: ${crclF}`);
    console.log("✓ Teste 1: Cálculo Cockcroft-Gault Feminino passou.");

    // Teste 2: Cálculo Cockcroft-Gault Masculino
    const crclM = NefrologiaClearanceService.calcularCockcroftGault(65, 75, 1.5, 'M');
    // ((140 - 65) * 75) / (72 * 1.5) = 5625 / 108 = 52.08
    assert(crclM === 52.1, `Erro no crcl masculino: ${crclM}`);
    console.log("✓ Teste 2: Cálculo Cockcroft-Gault Masculino passou.");

    // Teste 3: Classificação Estágio
    assert(NefrologiaClearanceService.classificarEstagio(25) === "Estágio 4 (Severamente diminuído - G4)", "Erro estágio 4");
    assert(NefrologiaClearanceService.classificarEstagio(95) === "Estágio 1 (Normal ou Alto - G1)", "Erro estágio 1");
    console.log("✓ Teste 3: Classificação de Estágio passou.");

    // Teste 4: Auditoria de Prescrição - Bloqueio Severo
    const aud1 = NefrologiaClearanceService.auditarPrescricao(20, ["vancomicina", "paracetamol"]);
    assert(aud1.bloqueios.length === 1, "Deveria ter 1 bloqueio de ajuste");
    assert(aud1.bloqueios[0].includes("VANCOMICINA"), "Bloqueio deveria ser para vancomicina");
    console.log("✓ Teste 4: Auditoria Prescrição - Bloqueio Severo passou.");

    // Teste 5: Auditoria de Prescrição - Contraindicação
    const aud2 = NefrologiaClearanceService.auditarPrescricao(15, ["nitrofurantoina", "dipirona"]);
    assert(aud2.bloqueios.length === 1, "Deveria ter 1 contraindicação");
    assert(aud2.bloqueios[0].includes("CONTRAINDICAÇÃO ABSOLUTA"), "Deveria ser contraindicação");
    console.log("✓ Teste 5: Auditoria Prescrição - Contraindicação passou.");

    // Teste 6: Auditoria de Prescrição - Alerta
    const aud3 = NefrologiaClearanceService.auditarPrescricao(45, ["cefepime"]);
    assert(aud3.alertas.length === 1, "Deveria ter 1 alerta para cefepime em < 50");
    assert(aud3.bloqueios.length === 0, "Não deveria ter bloqueios");
    console.log("✓ Teste 6: Auditoria Prescrição - Alerta passou.");

    console.log("=== TODOS OS TESTES PASSARAM ===");
}

try {
    runTests();
} catch (error) {
    console.error("FALHA NOS TESTES:", error.message);
    process.exit(1);
}
