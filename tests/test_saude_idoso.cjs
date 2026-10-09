const SaudeIdosoService = require('../src/02_saude_idoso.js');

function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      passed++;
      console.log(`[PASS] ${message}`);
    } else {
      failed++;
      console.error(`[FAIL] ${message}`);
    }
  }

  console.log("=== Testes de Saúde do Idoso e AGA ===");

  // 1. CFS
  try {
    const cfs1 = SaudeIdosoService.avaliarFragilidadeCFS(3);
    assert(cfs1.alerta_fragilidade === false && cfs1.classificacao === "Bem", "CFS 3 é Robusto/Bem sem alerta de fragilidade");
    
    const cfs7 = SaudeIdosoService.avaliarFragilidadeCFS(7);
    assert(cfs7.alerta_fragilidade === true && cfs7.classificacao === "Fragilidade Grave", "CFS 7 é Fragilidade Grave");
  } catch (e) {
    assert(false, `Erro em CFS: ${e.message}`);
  }

  // 2. Mini-Cog
  try {
    const mc1 = SaudeIdosoService.avaliarMiniCog(3, true);
    assert(mc1.rastreio_positivo === false && mc1.escore_total === 5, "Mini-Cog 3 palavras + Relógio Normal = 5 pts (Negativo)");

    const mc2 = SaudeIdosoService.avaliarMiniCog(1, false);
    assert(mc2.rastreio_positivo === true && mc2.escore_total === 1, "Mini-Cog 1 palavra + Relógio Anormal = 1 pt (Positivo)");

    const mc3 = SaudeIdosoService.avaliarMiniCog(2, false);
    assert(mc3.rastreio_positivo === true && mc3.escore_total === 2, "Mini-Cog 2 palavras + Relógio Anormal = 2 pts (Positivo)");

    const mc4 = SaudeIdosoService.avaliarMiniCog(1, true);
    assert(mc4.rastreio_positivo === false && mc4.escore_total === 3, "Mini-Cog 1 palavra + Relógio Normal = 3 pts (Negativo)");
  } catch (e) {
    assert(false, `Erro em Mini-Cog: ${e.message}`);
  }

  // 3. TUG
  try {
    const tug1 = SaudeIdosoService.avaliarRiscoQuedasTUG(9);
    assert(tug1.risco_alto === false && tug1.classificacao === "Normal", "TUG 9s é Normal e baixo risco");

    const tug2 = SaudeIdosoService.avaliarRiscoQuedasTUG(15);
    assert(tug2.risco_alto === true && tug2.classificacao === "Risco Moderado / Limítrofe", "TUG 15s é Risco Aumentado (> 12s)");

    const tug3 = SaudeIdosoService.avaliarRiscoQuedasTUG(25);
    assert(tug3.risco_alto === true && tug3.classificacao === "Alto Risco de Quedas", "TUG 25s é Alto Risco");
  } catch (e) {
    assert(false, `Erro em TUG: ${e.message}`);
  }

  // 4. Polifarmácia e Beers
  try {
    const p1 = SaudeIdosoService.avaliarFarmacosBeers(["Losartana 50mg", "AAS 100mg", "Sinvastatina 20mg"]);
    assert(p1.polifarmacia === false && p1.alertas_beers === false, "3 fármacos sem Beers: OK");

    const p2 = SaudeIdosoService.avaliarFarmacosBeers(["Losartana", "AAS", "Amitriptilina 25mg", "Metformina", "Glibenclamida", "Zolpidem 10mg"]);
    assert(p2.polifarmacia === true, "6 fármacos: Polifarmácia positiva");
    assert(p2.alertas_beers === true && p2.medicamentos_inadequados.length === 3, "Amitriptilina, Glibenclamida e Zolpidem detectados em Beers");
    
    let achouAmi = p2.medicamentos_inadequados.some(m => m.medicamento.includes("Amitriptilina"));
    let achouGlib = p2.medicamentos_inadequados.some(m => m.medicamento.includes("Glibenclamida"));
    let achouZolp = p2.medicamentos_inadequados.some(m => m.medicamento.includes("Zolpidem"));
    assert(achouAmi && achouGlib && achouZolp, "Medicamentos inadequados corretos no Beers");

    const p3 = SaudeIdosoService.avaliarFarmacosBeers(["Clonazepam 2mg", "Omeprazol 20mg", "Cetoprofeno", "Dexclorfeniramina"]);
    assert(p3.polifarmacia === false, "4 fármacos: sem polifarmácia");
    assert(p3.alertas_beers === true && p3.medicamentos_inadequados.length === 4, "Todos são Beers: BZD, IBP crônico, AINE e Anti-H1 1a geração");
  } catch (e) {
    assert(false, `Erro em Beers: ${e.message}`);
  }

  console.log(`\nResumo: ${passed} passaram, ${failed} falharam.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
