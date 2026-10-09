const assert = require('assert');
const InfectologiaNeutropeniaService = require('../src/02_infectologia_neutropenia.js');

function runTests() {
    console.log("=== Iniciando Testes: Infectologia Neutropenia ===");
    
    // Teste 1: MASCC Alto Risco
    const mascc1 = InfectologiaNeutropeniaService.calcularMASCC({
        cargaSintomas: 'grave', // 0
        semHipotensao: true, // 5
        semDpoc: true, // 4
        tumorSolidoOuHematoSemFungo: true, // 4
        semDesidratacao: true, // 3
        ambulatorial: false, // 0
        idadeMenor60: true // 2
    }); // Total = 18 (< 21 -> Alto Risco)
    assert(mascc1.escore === 18, "Escore MASCC falhou");
    assert(mascc1.risco === 'Alto Risco', "Classificacao risco MASCC falhou");
    console.log("✓ Teste 1: MASCC Alto Risco passou.");

    // Teste 2: MASCC Baixo Risco
    const mascc2 = InfectologiaNeutropeniaService.calcularMASCC({
        cargaSintomas: 'leve', // 5
        semHipotensao: true, // 5
        semDpoc: true, // 4
        tumorSolidoOuHematoSemFungo: true, // 4
        semDesidratacao: true, // 3
        ambulatorial: true, // 3
        idadeMenor60: true // 2
    }); // Total = 26 (>= 21 -> Baixo Risco)
    assert(mascc2.escore === 26, "Escore MASCC falhou");
    assert(mascc2.risco === 'Baixo Risco', "Classificacao risco MASCC falhou");
    console.log("✓ Teste 2: MASCC Baixo Risco passou.");

    // Teste 3: Protocolo ATB Base
    const atb1 = InfectologiaNeutropeniaService.protocoloAntibiotico({
        instabilidade: false, suspeitaCateter: false, mrsa: false, alergiaPenicilina: 'nao', diasFebre: 1
    });
    assert(atb1.recomendacoes[0].includes("Cefepime"), "Faltou Cefepime/Tazocin na 1a linha");
    assert(atb1.recomendacoes.length === 1, "Deveria ter apenas 1 recomendacao");
    console.log("✓ Teste 3: Protocolo ATB Base passou.");

    // Teste 4: Protocolo ATB MRSA e Fungo
    const atb2 = InfectologiaNeutropeniaService.protocoloAntibiotico({
        instabilidade: true, suspeitaCateter: true, mrsa: false, alergiaPenicilina: 'nao', diasFebre: 5
    });
    assert(atb2.recomendacoes.some(r => r.includes("Vancomicina")), "Faltou Vancomicina para instabilidade/cateter");
    assert(atb2.recomendacoes.some(r => r.includes("antifúngica")), "Faltou alerta de antifungico para febre >4 dias");
    console.log("✓ Teste 4: Protocolo ATB MRSA e Fungo passou.");

    
    // Teste 5: CISNE Baixo Risco
    const cisne1 = InfectologiaNeutropeniaService.calcularCISNE({
        ecogMaiorIgual2: false, dpoc: false, doencaCardiovascular: false, mucosite: false, monocitosMenor200: false, hiperglicemiaEstresse: false
    });
    assert(cisne1.escore === 0, "Escore CISNE falhou");
    assert(cisne1.risco.includes('Baixo Risco'), "Risco CISNE falhou");

    // Teste 6: CISNE Alto Risco
    const cisne2 = InfectologiaNeutropeniaService.calcularCISNE({
        ecogMaiorIgual2: true, // 2
        dpoc: true, // 1
        doencaCardiovascular: false,
        mucosite: false,
        monocitosMenor200: false,
        hiperglicemiaEstresse: false
    });
    assert(cisne2.escore === 3, "Escore CISNE falhou");
    assert(cisne2.risco.includes('Alto Risco'), "Risco CISNE falhou");
    
    console.log("✓ Testes CISNE passaram.");

    console.log("=== TODOS OS TESTES PASSARAM ===");
}

try {
    runTests();
} catch (error) {
    console.error("FALHA NOS TESTES:", error.message);
    process.exit(1);
}
