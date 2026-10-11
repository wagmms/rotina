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

    // Cálculos Farmacológicos Determinísticos Beira-Leito (SSC)
    var concentracaoNora = 64; // mcg/mL (4 ampolas de 4mg/4mL = 16mg em 234mL de SG 5%, vol total 250mL)
    var vazaoAtualNora = Number(((doseNoraMcgKgMin * pesoKg * 60) / concentracaoNora).toFixed(1));
    var vazaoInicialNora = Number(((0.05 * pesoKg * 60) / concentracaoNora).toFixed(1));
    var vazaoInicialMaxNora = Number(((0.10 * pesoKg * 60) / concentracaoNora).toFixed(1));
    var vazaoRefratarioNora = Number(((0.25 * pesoKg * 60) / concentracaoNora).toFixed(1));
    var vazaoTetoNora = Number(((1.00 * pesoKg * 60) / concentracaoNora).toFixed(1));

    var concentracaoVaso = 0.2; // UI/mL (1 ampola de 20 UI/1mL em 99mL de SF 0,9%, vol total 100mL)
    var vazaoFixaVaso = 9.0; // mL/h fixo em BIC (0,03 UI/min)

    // Critério de Refratariedade (Surviving Sepsis Campaign)
    var choqueRefratario = doseNoraMcgKgMin >= 0.25;

    // Alertas Canônicos de Segurança e Metas Clínicas
    alertas.push("🎯 Alvo Hemodinâmico: PAM alvo >= 65 mmHg (titulação contínua para perfusão orgânica).");
    alertas.push("🧪 Monitorização Metabólica: Lactato sérico seriado de 2-4h (objetivar clareamento de lactato > 20% a cada 2h).");
    alertas.push("💧 Gestão Volêmica: Restrição volêmica pós-ressuscitação inicial (após cristaloides 30 mL/kg iniciais, evitar sobrecarga hídrica; guiar por parâmetros dinâmicos de responsividade).");

    if (choqueRefratario) {
      alertas.unshift("🚨 ALERTA CRÍTICO: Choque Séptico Refratário detectado (Noradrenalina >= 0.25 mcg/kg/min).");
      
      condutas.push("1. NORADRENALINA (1º Vasopressor - Titulação Contínua):");
      condutas.push("   - Solução Padrão: Solução de Noradrenalina padrão (4 ampolas de 4mg/4mL = 16mg em 234mL de SG 5%, concentração 64 mcg/mL).");
      condutas.push("   - Vazão Atual (" + doseNoraMcgKgMin + " mcg/kg/min): " + vazaoAtualNora + " mL/h em BIC.");
      condutas.push("   - Vazão Inicial (0,05 a 0,10 mcg/kg/min): " + vazaoInicialNora + " a " + vazaoInicialMaxNora + " mL/h em BIC.");
      condutas.push("   - Limiar de Refratariedade (0,25 mcg/kg/min): " + vazaoRefratarioNora + " mL/h em BIC.");
      condutas.push("   - Vazão Teto Máximo (1,00 mcg/kg/min): " + vazaoTetoNora + " mL/h em BIC.");
      condutas.push("   - Titulação: Ajustar a cada 2-5 min visando PAM alvo >= 65 mmHg.");
      condutas.push("");
      condutas.push("2. VASOPRESSINA (2º Vasopressor - Poupar Catecolamina):");
      condutas.push("   - Solução Padrão: Solução padrão de Vasopressina (1 ampola de 20 UI/1mL em 99mL de SF 0,9% = 0,2 UI/mL).");
      condutas.push("   - Vazão FIXA em BIC: vazão fixa em BIC de 9 mL/h (0,03 UI/min) sem titulação.");
      condutas.push("   - Regra de Ouro: NÃO titular a Vasopressina. Dose fixa de 0.03 UI/min (9 mL/h) sem titulação para evitar isquemia esplâncnica/coronariana.");
      condutas.push("");
      condutas.push("3. HIDROCORTISONA (CIRCI - Insuficiência Corticosteroide Relacionada à Doença Crítica):");
      condutas.push("   - Indicação: Choque dependente de vasopressor em doses crescentes (Noradrenalina >= 0.25 mcg/kg/min).");
      condutas.push("   - Diluição e Administração: Diluição da Hidrocortisona (50mg pó liofilizado diluído em 10mL de SF 0,9% administrado IV em 3 min de 6/6h).");
      condutas.push("   - Posologia: 50 mg IV de 6/6h (200 mg/dia) em bolus lento de 3 minutos.");
      condutas.push("   - Não aguardar teste de estímulo com ACTH no PS.");
      condutas.push("");
      condutas.push("4. PRESCRIÇÃO PRONTA PARA PRONTUÁRIO (PEP):");
      condutas.push("   a) Noradrenalina 4mg/4mL (4 amp = 16mg) + SG 5% 234mL (64 mcg/mL) --- EV em BIC a " + vazaoAtualNora + " mL/h (titular para PAM >= 65 mmHg).");
      condutas.push("   b) Vasopressina 20 UI/1mL (1 amp = 20 UI) + SF 0,9% 99mL (0,2 UI/mL) --- EV em BIC a 9 mL/h contínuo (sem titulação).");
      condutas.push("   c) Hidrocortisona 50mg pó liofilizado + SF 0,9% 10mL --- EV direto em bolus lento (em 3 min) de 6/6h.");
      condutas.push("");
      condutas.push("🛑 EXPURGO TERCIÁRIO: O uso de Azul de Metileno para vasoplegia foi classificado como conduta exclusiva de UTI/Pós-operatório de Cirurgia Cardíaca e removido das diretrizes do PS.");
    } else {
      alertas.unshift("ℹ️ Choque Séptico em fase inicial/responsiva (Noradrenalina < 0.25 mcg/kg/min).");
      
      condutas.push("1. NORADRENALINA (1º Vasopressor de Escolha - Titulação Contínua):");
      condutas.push("   - Solução Padrão: Solução de Noradrenalina padrão (4 ampolas de 4mg/4mL = 16mg em 234mL de SG 5%, concentração 64 mcg/mL).");
      condutas.push("   - Vazão Atual (" + doseNoraMcgKgMin + " mcg/kg/min): " + vazaoAtualNora + " mL/h em BIC.");
      condutas.push("   - Vazão Inicial (0,05 a 0,10 mcg/kg/min): " + vazaoInicialNora + " a " + vazaoInicialMaxNora + " mL/h em BIC.");
      condutas.push("   - Limiar de Refratariedade (0,25 mcg/kg/min): " + vazaoRefratarioNora + " mL/h em BIC.");
      condutas.push("   - Vazão Teto Máximo (1,00 mcg/kg/min): " + vazaoTetoNora + " mL/h em BIC.");
      condutas.push("   - Titulação: Ajustar a cada 2-5 min visando PAM alvo >= 65 mmHg.");
      condutas.push("");
      condutas.push("2. RESSUSCITAÇÃO VOLÊMICA & CONTROLE INFECCIOSO:");
      condutas.push("   - Cristaloides balanceados: 30 mL/kg nas primeiras 3h se ausência de congestão pulmonar.");
      condutas.push("   - Antibioticoterapia empírica de amplo espectro na 1ª hora (após coleta de hemoculturas).");
      condutas.push("   - Controle ágil do foco infeccioso.");
      condutas.push("");
      condutas.push("3. PRESCRIÇÃO PRONTA PARA PRONTUÁRIO (PEP):");
      condutas.push("   a) Noradrenalina 4mg/4mL (4 amp = 16mg) + SG 5% 234mL (64 mcg/mL) --- EV em BIC a " + vazaoAtualNora + " mL/h (titular para PAM >= 65 mmHg).");
      condutas.push("");
      condutas.push("Nota: Hidrocortisona e Vasopressina não estão indicados neste momento (indicados se choque refratário com Noradrenalina >= 0.25 mcg/kg/min).");
    }

    var textoSOAP = "AVALIAÇÃO DE CHOQUE SÉPTICO\n";
    textoSOAP += "Peso: " + pesoKg + " kg | Noradrenalina atual: " + doseNoraMcgKgMin + " mcg/kg/min\n\n";
    if (alertas.length > 0) textoSOAP += alertas.join("\n") + "\n\n";
    textoSOAP += "CONDUTA BEIRA-LEITO (PS):\n" + condutas.join("\n");

    return {
      sucesso: true,
      choqueRefratario: choqueRefratario,
      pesoKg: pesoKg,
      doseNoraMcgKgMin: doseNoraMcgKgMin,
      calculos: {
        concentracaoNoraMcgMl: concentracaoNora,
        vazaoNoraAtualMlh: vazaoAtualNora,
        vazaoNoraInicialMlh: vazaoInicialNora,
        vazaoNoraInicialMaxMlh: vazaoInicialMaxNora,
        vazaoNoraRefratarioMlh: vazaoRefratarioNora,
        vazaoNoraTetoMlh: vazaoTetoNora,
        concentracaoVasoUiMl: concentracaoVaso,
        vazaoVasoFixaMlh: vazaoFixaVaso
      },
      prescricaoPEP: {
        noradrenalina: "Noradrenalina 4mg/4mL (4 amp = 16mg) + SG 5% 234mL (64 mcg/mL) --- EV em BIC a " + vazaoAtualNora + " mL/h (titular para PAM >= 65 mmHg).",
        vasopressina: choqueRefratario ? "Vasopressina 20 UI/1mL (1 amp = 20 UI) + SF 0,9% 99mL (0,2 UI/mL) --- EV em BIC a 9 mL/h contínuo (sem titulação)." : null,
        hidrocortisona: choqueRefratario ? "Hidrocortisona 50mg pó liofilizado + SF 0,9% 10mL --- EV direto em bolus lento (em 3 min) de 6/6h." : null
      },
      textoSOAP: textoSOAP
    };
  },

  formatarTextoTelegram: function(res) {
    if (!res) return "";
    return "🩸 *PROTOCOLO DE CHOQUE SÉPTICO REFRATÁRIO & CIRCI*\n\n" + (res.textoSOAP || "");
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EmergenciaChoqueSepticoService };
}
