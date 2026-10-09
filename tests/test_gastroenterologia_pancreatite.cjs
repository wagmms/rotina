const assert = require('assert');
const GastroenterologiaPancreatiteService = require('../src/03_gastroenterologia_pancreatite.js');

function runTests() {
    console.log("=== Iniciando Testes: Gastroenterologia Pancreatite ===");
    
    // Teste 1: BISAP Alto Risco
    const bisap1 = GastroenterologiaPancreatiteService.calcularBISAP({
        bunMaior25: true, mentalAlterado: true, sirs: true, idadeMaior60: false, derramePleural: false
    });
    assert(bisap1.escore === 3, "Escore BISAP falhou");
    assert(bisap1.riscoGravidade === "Alto Risco", "Classificacao risco BISAP falhou");
    console.log("✓ Teste 1: BISAP Alto Risco passou.");

    // Teste 2: BISAP Baixo Risco
    const bisap2 = GastroenterologiaPancreatiteService.calcularBISAP({
        bunMaior25: false, mentalAlterado: false, sirs: true, idadeMaior60: false, derramePleural: false
    });
    assert(bisap2.escore === 1, "Escore BISAP falhou");
    assert(bisap2.riscoGravidade === "Baixo Risco", "Classificacao risco BISAP falhou");
    console.log("✓ Teste 2: BISAP Baixo Risco passou.");

    // Teste 3: Protocolo Hidratação
    const hidra1 = GastroenterologiaPancreatiteService.protocoloHidratacao({
        doencaCardiovascularOuRenal: true, hematocritoElevado: false, bunElevado: false
    });
    assert(hidra1.some(r => r.includes("sobrecarga de volume")), "Faltou alerta de sobrecarga para doenca cardio/renal");
    console.log("✓ Teste 3: Protocolo Hidratacao com DCV passou.");

    // Teste 4: Protocolo Nutrição
    const nutri1 = GastroenterologiaPancreatiteService.protocoloNutricao({
        dorAbdominalControlada: true, nauseaVomitoAusentes: true, tempoNPO: 12
    });
    assert(nutri1.some(r => r.includes("Nutrição Oral Precoce")), "Faltou recomendacao de nutricao oral precoce");
    console.log("✓ Teste 4: Protocolo Nutricao passou.");

    console.log("=== TODOS OS TESTES PASSARAM ===");
}

try {
    runTests();
} catch (error) {
    console.error("FALHA NOS TESTES:", error.message);
    process.exit(1);
}
