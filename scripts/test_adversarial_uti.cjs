// scripts/test_adversarial_uti.cjs
const assert = require("assert");
const path = require("path");

function unwrap(mod, key) {
  if (!mod) return mod;
  if (key && mod[key]) return mod[key];
  const keys = Object.keys(mod);
  if (keys.length === 1 && typeof mod[keys[0]] === "object") return mod[keys[0]];
  return mod;
}

const Calculadoras = unwrap(require(path.resolve(__dirname, "../src/02_calculadoras_puras.js")), "CalculadorasClinicas");
const Choque = unwrap(require(path.resolve(__dirname, "../src/02_emergencia_choque_septico_circi.js")), "EmergenciaChoqueSepticoService");
const CompatY = unwrap(require(path.resolve(__dirname, "../src/02_compatibilidade_y_dva.js")), "CompatibilidadeYDvaService");
const Nefro = unwrap(require(path.resolve(__dirname, "../src/02_nefrologia_dhe.js")), "NefrologiaDheService");
const Parser = unwrap(require(path.resolve(__dirname, "../src/07f_telegram_calculadoras_parser.js")), "TelegramCalculadorasParser");

console.log("==============================================================");
console.log("🧪 INICIANDO BATERIA DE TESTES ADVERSARIAIS (RED TEAM UTI)");
console.log("==============================================================\n");

let falhas = 0;
function testar(nome, fn) {
  try {
    fn();
    console.log("✅ [PASSOU] " + nome);
  } catch (err) {
    falhas++;
    console.log("❌ [FALHOU] " + nome);
    console.log("   ↳ Motivo: " + err.message + "\n");
  }
}

testar("1. Nefro: Bloquear cálculo de Salina 3% quando peso é inválido/omitido", () => {
  const res = Nefro.planejarCorrecaoHiponatremia(115, 0, "f", 80, 3);
  assert(res && res.erro, "Calculou Salina 3% assumindo 70kg silenciosamente em vez de retornar erro!");
});

testar("2. Nefro: Detectar Hipocalemia grave (K+ 2.2 mEq/L) e orientar KCl 19,1%", () => {
  const fn = Nefro.avaliarPotassio || Nefro.avaliarHipercalemia;
  const res = fn(2.2, true);
  assert(res.gravidade !== "Normal" && JSON.stringify(res).includes("19,1%"), "Retornou gravidade=" + res.gravidade + " sem KCl 19,1% para K=2.2!");
});

testar("3. Nefro: Hipercalemia moderada (5.4) com ECG alterado deve prescrever Solução Polarizante + alerta HGT >= 250", () => {
  const res = Nefro.avaliarHipercalemia(5.4, true);
  assert(res.tripeCanonico && res.tripeCanonico.redistribuicaoIntracelular.length > 0, "Omitiu redistribuicaoIntracelular em K=5.4 com ECG alterado!");
  assert(res.prescricaoPEP.includes("250 mg/dL"), "Faltou trava de hiperglicemia (HGT >= 250) na Solução Polarizante!");
});

testar("4. Choque: Bloquear dose de Noradrenalina > 3.5 mcg/kg/min e incluir Dobutamina no choque refratário", () => {
  const resErro = Choque.avaliarCirciEVasopressina(70, 15);
  assert(resErro && resErro.erro, "Aceitou dose letal de 15 mcg/kg/min sem travar!");
  const resRefrat = Choque.avaliarCirciEVasopressina(70, 0.35);
  assert(JSON.stringify(resRefrat).toLowerCase().includes("dobutamina"), "Omitiu suporte inotrópico (Dobutamina) no choque refratário!");
});

testar("5. Compatibilidade Y: Proibir selo COMPATIVEL para Vancomicina + Piperacilina-Tazobactam", () => {
  const res = CompatY.checarCompatibilidadeY("vancomicina", "piperacilina_tazobactam");
  assert(res.status !== "COMPATIVEL", "Retornou status=" + res.status + " (Falso-Positivo perigoso)!");
});

testar("6. Compatibilidade Y: Bloquear Fenitoína + Midazolam (precipitação)", () => {
  const res = CompatY.checarCompatibilidadeY("fenitoina", "midazolam");
  assert(res.status === "INCOMPATIVEL", "Retornou status=" + res.status + " para Fenitoína + Midazolam!");
});

testar("7. SRI: Travar dose de Succinilcolina (<= 200mg) e Etomidato (<= 30mg) em obeso de 160kg", () => {
  const res = Calculadoras.sequenciaRapidaIntubacao(160, "padrao");
  const texto = JSON.stringify(res);
  assert(!texto.includes("240 mg") && !texto.includes("48 mg"), "Calculou dose linear sem teto para 160kg (Overdose)!");
});

testar("8. Parser: Resolver \"sri 80kg choque\" deterministicamente (< 5ms)", () => {
  const res = Parser.tentarCalcularDeterministico("sri 80kg choque");
  assert(res !== null, "Retornou null (caiu no fallback lento de IA)!");
});

testar("9. Parser: Resolver \"nora 80 0.2\" sem exigir a string \"kg\"", () => {
  const res = Parser.tentarCalcularDeterministico("nora 80 0.2");
  assert(res !== null && !String(res).includes("Parâmetros Insuficientes"), "Falhou ao extrair peso sem kg!");
});

testar("10. Parser: Resolver comandos rápidos de K+, Na+, Choque e Via em Y", () => {
  const rK = Parser.tentarCalcularDeterministico("k 6.8 ecg");
  const rY = Parser.tentarCalcularDeterministico("y nora fenta");
  assert(rK !== null && rY !== null, "Módulos de DHE e Compatibilidade em Y continuam desconectados do parser!");
});

console.log("==============================================================");
console.log("📊 RESULTADO: " + (10 - falhas) + "/10 testes aprovados (" + falhas + " falhas críticas ativas)");
console.log("==============================================================");
process.exit(falhas > 0 ? 1 : 0);
