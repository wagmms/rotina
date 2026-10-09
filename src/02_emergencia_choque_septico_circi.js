// 02_emergencia_choque_septico_circi.js
// Módulo de Emergência - Choque Séptico Refratário e CIRCI
// Foco 100% Generalista/PS: Hidrocortisona e Vasopressina. Expurgo de Azul de Metileno (Terciário).

var EmergenciaChoqueSepticoService = {
  avaliarCirciEVasopressina: function(pesoKg, doseNoraMcgKgMin) {
    var alertas = [];
    var condutas = [];
    
    // Validação de entrada
    if (!pesoKg || pesoKg < 30 || pesoKg > 350) {
      return { erro: "Peso inválido. Informe um peso entre 30 e 350 kg." };
    }
    if (!doseNoraMcgKgMin || doseNoraMcgKgMin <= 0) {
      return { erro: "Dose de Noradrenalina inválida. Informe em mcg/kg/min." };
    }

    // Critério de Refratariedade (Surviving Sepsis Campaign)
    var choqueRefratario = doseNoraMcgKgMin >= 0.25;

    if (choqueRefratario) {
      alertas.push("🚨 ALERTA CRÍTICO: Choque Séptico Refratário detectado (Noradrenalina >= 0.25 mcg/kg/min).");
      
      condutas.push("1. HIDROCORTISONA (CIRCI - Insuficiência Corticosteroide Relacionada à Doença Crítica):");
      condutas.push("   - Indicação: Choque dependente de vasopressor em doses crescentes.");
      condutas.push("   - Dose: Hidrocortisona 200 mg/dia IV.");
      condutas.push("   - Posologia preferencial: 50 mg IV de 6/6h (ou infusão contínua).");
      condutas.push("   - Não aguardar teste de estímulo com ACTH no PS.");
      
      condutas.push("");
      condutas.push("2. VASOPRESSINA (2º Vasopressor):");
      condutas.push("   - Indicação: Poupar Noradrenalina e melhorar PAM.");
      condutas.push("   - Dose FIXA: 0.03 UI/min IV em bomba de infusão contínua.");
      condutas.push("   - Regra de Ouro: NÃO titular a Vasopressina. Dose teto é 0.03 a 0.04 UI/min para evitar isquemia esplâncnica/coronariana.");
      
      condutas.push("");
      condutas.push("🛑 EXPURGO TERCIÁRIO: O uso de Azul de Metileno para vasoplegia foi classificado como conduta exclusiva de UTI/Pós-operatório de Cirurgia Cardíaca e removido das diretrizes do PS.");
    } else {
      alertas.push("ℹ️ Choque Séptico em fase inicial/responsiva (Noradrenalina < 0.25 mcg/kg/min).");
      condutas.push("1. Otimizar Noradrenalina alvo PAM >= 65 mmHg.");
      condutas.push("2. Garantir ressuscitação volêmica adequada (Cristaloides 30 mL/kg nas primeiras 3h se não houver congestão).");
      condutas.push("3. Antibioticoterapia de amplo espectro na 1ª hora.");
      condutas.push("4. Controle do foco infeccioso.");
      condutas.push("Nota: Hidrocortisona e Vasopressina não estão indicados neste momento.");
    }

    var textoSOAP = "AVALIAÇÃO DE CHOQUE SÉPTICO\n";
    textoSOAP += "Peso: " + pesoKg + " kg | Noradrenalina atual: " + doseNoraMcgKgMin + " mcg/kg/min\n\n";
    if (alertas.length > 0) textoSOAP += alertas.join("\n") + "\n\n";
    textoSOAP += "CONDUTA BEIRA-LEITO (PS):\n" + condutas.join("\n");

    return {
      sucesso: true,
      choqueRefratario: choqueRefratario,
      textoSOAP: textoSOAP
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EmergenciaChoqueSepticoService };
}
