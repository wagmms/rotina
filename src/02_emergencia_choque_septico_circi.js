// 02_emergencia_choque_septico_circi.js
// Módulo de Emergência - Choque Séptico Refratário e CIRCI
// Foco 100% Generalista/PS: Hidrocortisona, Vasopressina e Suporte Inotrópico (SSC 2021). Expurgo de Azul de Metileno (Terciário).

var EmergenciaChoqueSepticoService = {
  avaliarCirciEVasopressina: function(pesoKg, doseNoraMcgKgMin) {
    var alertas = [];
    var condutas = [];

    var pReal = typeof pesoKg === "string" ? parseFloat(pesoKg.trim().replace(",", ".")) : parseFloat(pesoKg);
    var dNora = typeof doseNoraMcgKgMin === "string" ? parseFloat(doseNoraMcgKgMin.trim().replace(",", ".")) : parseFloat(doseNoraMcgKgMin);

    // 1. Validação estrita de limites fisiológicos
    if (!pReal || isNaN(pReal) || pReal < 30 || pReal > 350) {
      return { erro: "Peso inválido (" + pesoKg + "). Informe um peso adulto entre 30 e 350 kg." };
    }
    if (!dNora || isNaN(dNora) || dNora <= 0 || dNora > 3.5) {
      return {
        erro: "Dose de Noradrenalina inválida ou fora do limite fisiológico (" + doseNoraMcgKgMin + "). Informe entre 0,01 e 3,5 mcg/kg/min. Se tentou informar a vazão da bomba, especifique \"ml/h\"."
      };
    }

    // 2. Trava de segurança para superobesos (> 120 kg)
    var pesoCalculo = Math.min(pReal, 120);
    if (pReal > 120) {
      alertas.push("⚠️ TRAVA DE OBESIDADE (> 120 kg): Peso de cálculo travado em 120 kg (peso real: " + pReal + " kg) para evitar sobredose inicial de catecolaminas. Titular estritamente pela PAM >= 65 mmHg.");
    }

    // 3. Cálculos Farmacológicos Determinísticos Beira-Leito (SSC 2021)
    var concentracaoNora = 64; // mcg/mL (4 ampolas de 4mg/4mL = 16mg em 234mL de SG 5%, vol total 250mL)
    var vazaoAtualNora = Number(((dNora * pesoCalculo * 60) / concentracaoNora).toFixed(1));
    var vazaoInicialNora = Number(((0.05 * pesoCalculo * 60) / concentracaoNora).toFixed(1));
    var vazaoInicialMaxNora = Number(((0.10 * pesoCalculo * 60) / concentracaoNora).toFixed(1));
    var vazaoRefratarioNora = Number(((0.25 * pesoCalculo * 60) / concentracaoNora).toFixed(1));
    var vazaoTetoNora = Number(((1.00 * pesoCalculo * 60) / concentracaoNora).toFixed(1));

    var concentracaoVaso = 0.2; // UI/mL (1 ampola de 20 UI/1mL em 99mL de SF 0,9%, vol total 100mL)
    var vazaoFixaVaso = 9.0; // mL/h fixo em BIC (0,03 UI/min)

    // Cálculo de Dobutamina (1 amp 250mg/20mL + 230mL SF/SG5% = 1000 mcg/mL) para suporte inotrópico
    var concentracaoDobuta = 1000; // mcg/mL
    var vazaoDobutaMin = Number(((2.5 * pesoCalculo * 60) / concentracaoDobuta).toFixed(1));
    var vazaoDobutaAlvo = Number(((5.0 * pesoCalculo * 60) / concentracaoDobuta).toFixed(1));
    var vazaoDobutaMax = Number(((20.0 * pesoCalculo * 60) / concentracaoDobuta).toFixed(1));

    // Critério de Refratariedade (Surviving Sepsis Campaign 2021)
    var choqueRefratario = dNora >= 0.25;

    // Alertas Canônicos de Segurança e Metas Clínicas
    alertas.push("🎯 Alvo Hemodinâmico: PAM alvo >= 65 mmHg (titulação contínua para perfusão orgânica).");
    alertas.push("🧪 Monitorização Metabólica: Lactato sérico seriado de 2-4h (objetivar clareamento de lactato > 20% a cada 2h) e tempo de enchimento capilar (TEC < 3s).");
    alertas.push("💧 Gestão Volêmica: Restrição volêmica pós-ressuscitação inicial (após cristaloides 30 mL/kg iniciais, evitar sobrecarga hídrica; guiar por parâmetros dinâmicos de fluido-responsividade).");

    if (choqueRefratario) {
      alertas.unshift("🚨 ALERTA CRÍTICO: Choque Séptico Refratário detectado (Noradrenalina >= 0.25 mcg/kg/min).");

      condutas.push("1. NORADRENALINA (1º Vasopressor - Titulação Contínua):");
      condutas.push("   - Solução Padrão: 4 ampolas de 4mg/4mL (16mg) em 234mL de SG 5% (vol total 250mL = 64 mcg/mL).");
      condutas.push("   - Vazão Atual (" + dNora + " mcg/kg/min): " + vazaoAtualNora + " mL/h em BIC.");
      condutas.push("   - Vazão Inicial (0,05 a 0,10 mcg/kg/min): " + vazaoInicialNora + " a " + vazaoInicialMaxNora + " mL/h em BIC.");
      condutas.push("   - Limiar de Refratariedade (0,25 mcg/kg/min): " + vazaoRefratarioNora + " mL/h em BIC.");
      condutas.push("   - Vazão Teto Habitual (1,00 mcg/kg/min): " + vazaoTetoNora + " mL/h em BIC.");
      condutas.push("   - Titulação: Ajustar a cada 2-5 min visando PAM >= 65 mmHg.");
      condutas.push("");
      condutas.push("2. VASOPRESSINA (2º Vasopressor - Poupar Catecolamina):");
      condutas.push("   - Solução Padrão: 1 ampola de 20 UI/1mL em 99mL de SF 0,9% ou SG 5% (100mL = 0,2 UI/mL).");
      condutas.push("   - Vazão FIXA em BIC: 9 mL/h (0,03 UI/min) sem titulação.");
      condutas.push("   - Regra de Ouro: NÃO titular a Vasopressina acima de 0,03-0,04 UI/min para evitar isquemia esplâncnica, digital e coronariana.");
      condutas.push("");
      condutas.push("3. HIDROCORTISONA (CIRCI - Insuficiência Corticosteroide Relacionada à Doença Crítica):");
      condutas.push("   - Indicação: Choque dependente de vasopressor em doses crescentes (Noradrenalina >= 0,25 mcg/kg/min por >= 4h).");
      condutas.push("   - Diluição e Posologia: 50 mg pó liofilizado diluído em 10 mL de SF 0,9% EV em bolus lento (3 min) de 6/6h (200 mg/dia).");
      condutas.push("   - Não aguardar dosagem de cortisol ou teste de estímulo com ACTH no PS.");
      condutas.push("");
      condutas.push("4. SUPORTE INOTRÓPICO (SE DISFUNÇÃO MIOCÁRDICA SÉPTICA / HIPOPERFUSÃO PERSISTENTE):");
      condutas.push("   - Indicação (SSC 2021): Hipoperfusão persistente (lactato em elevação, TEC > 3s, SvO2 < 70%, oligúria) apesar de PAM >= 65 mmHg e volemia adequada, ou disfunção sistólica de VE ao POCUS.");
      condutas.push("   - 1ª Opção: Associar DOBUTAMINA (1 amp 250mg/20mL + 230mL SF/SG5% = 1000 mcg/mL): iniciar a 2,5 a 5,0 mcg/kg/min (" + vazaoDobutaMin + " a " + vazaoDobutaAlvo + " mL/h) e titular até máx 20 mcg/kg/min (" + vazaoDobutaMax + " mL/h).");
      condutas.push("   - Alternativa: Substituir/associar ADRENALINA (0,01 a 0,2 mcg/kg/min) caso Dobutamina induza vasodilatação/hipotensão proibitiva.");
      condutas.push("");
      condutas.push("5. PRESCRIÇÃO PRONTA PARA PRONTUÁRIO (PEP):");
      condutas.push("   a) Noradrenalina 4mg/4mL (4 amp = 16mg) + SG 5% 234mL (64 mcg/mL) --- EV em BIC a " + vazaoAtualNora + " mL/h (titular para PAM >= 65 mmHg).");
      condutas.push("   b) Vasopressina 20 UI/1mL (1 amp = 20 UI) + SF 0,9% 99mL (0,2 UI/mL) --- EV em BIC a 9 mL/h contínuo (sem titulação).");
      condutas.push("   c) Hidrocortisona 50mg pó liofilizado + SF 0,9% 10mL --- EV direto em bolus lento (em 3 min) de 6/6h.");
      condutas.push("   d) [Se hipoperfusão com PAM >= 65 / Disfunção VE ao POCUS] Dobutamina 250mg/20mL (1 amp) + SG 5% 230mL (1000 mcg/mL) --- EV em BIC a " + vazaoDobutaAlvo + " mL/h (5 mcg/kg/min; faixa " + vazaoDobutaMin + " a " + vazaoDobutaMax + " mL/h).");
      condutas.push("");
      condutas.push("🛑 EXPURGO TERCIÁRIO: O uso de Azul de Metileno para vasoplegia foi classificado como conduta exclusiva de UTI/Pós-operatório de Cirurgia Cardíaca e removido das diretrizes do PS.");
    } else {
      alertas.unshift("ℹ️ Choque Séptico em fase inicial/responsiva (Noradrenalina < 0.25 mcg/kg/min).");

      condutas.push("1. NORADRENALINA (1º Vasopressor de Escolha - Titulação Contínua):");
      condutas.push("   - Solução Padrão: 4 ampolas de 4mg/4mL (16mg) em 234mL de SG 5% (64 mcg/mL).");
      condutas.push("   - Vazão Atual (" + dNora + " mcg/kg/min): " + vazaoAtualNora + " mL/h em BIC.");
      condutas.push("   - Vazão Inicial (0,05 a 0,10 mcg/kg/min): " + vazaoInicialNora + " a " + vazaoInicialMaxNora + " mL/h em BIC.");
      condutas.push("   - Limiar de Refratariedade (0,25 mcg/kg/min): " + vazaoRefratarioNora + " mL/h em BIC.");
      condutas.push("   - Vazão Teto Habitual (1,00 mcg/kg/min): " + vazaoTetoNora + " mL/h em BIC.");
      condutas.push("   - Titulação: Ajustar a cada 2-5 min visando PAM >= 65 mmHg.");
      condutas.push("");
      condutas.push("2. RESSUSCITAÇÃO VOLÊMICA & CONTROLE INFECCIOSO:");
      condutas.push("   - Cristaloides balanceados: 30 mL/kg nas primeiras 3h se ausência de congestão pulmonar.");
      condutas.push("   - Antibioticoterapia empírica de amplo espectro na 1ª hora (após coleta de 2 pares de hemoculturas).");
      condutas.push("   - Controle ágil do foco infeccioso.");
      condutas.push("");
      condutas.push("3. PRESCRIÇÃO PRONTA PARA PRONTUÁRIO (PEP):");
      condutas.push("   a) Noradrenalina 4mg/4mL (4 amp = 16mg) + SG 5% 234mL (64 mcg/mL) --- EV em BIC a " + vazaoAtualNora + " mL/h (titular para PAM >= 65 mmHg).");
      condutas.push("");
      condutas.push("Nota: Hidrocortisona e Vasopressina não estão indicados neste momento (acionar se Noradrenalina >= 0.25 mcg/kg/min).");
    }

    var textoSOAP = "AVALIAÇÃO DE CHOQUE SÉPTICO\n";
    textoSOAP += "Peso Real: " + pReal + " kg" + (pReal > 120 ? " (Peso de cálculo travado: 120 kg)" : "") + " | Noradrenalina atual: " + dNora + " mcg/kg/min\n\n";
    if (alertas.length > 0) textoSOAP += alertas.join("\n") + "\n\n";
    textoSOAP += "CONDUTA BEIRA-LEITO (PS):\n" + condutas.join("\n");

    return {
      sucesso: true,
      choqueRefratario: choqueRefratario,
      pesoKg: pReal,
      pesoCalculoKg: pesoCalculo,
      doseNoraMcgKgMin: dNora,
      calculos: {
        concentracaoNoraMcgMl: concentracaoNora,
        vazaoNoraAtualMlh: vazaoAtualNora,
        vazaoNoraInicialMlh: vazaoInicialNora,
        vazaoNoraInicialMaxMlh: vazaoInicialMaxNora,
        vazaoNoraRefratarioMlh: vazaoRefratarioNora,
        vazaoNoraTetoMlh: vazaoTetoNora,
        concentracaoVasoUiMl: concentracaoVaso,
        vazaoVasoFixaMlh: vazaoFixaVaso,
        vazaoDobutaMinMlh: vazaoDobutaMin,
        vazaoDobutaAlvoMlh: vazaoDobutaAlvo,
        vazaoDobutaMaxMlh: vazaoDobutaMax
      },
      prescricaoPEP: {
        noradrenalina: "Noradrenalina 4mg/4mL (4 amp = 16mg) + SG 5% 234mL (64 mcg/mL) --- EV em BIC a " + vazaoAtualNora + " mL/h (titular para PAM >= 65 mmHg).",
        vasopressina: choqueRefratario ? "Vasopressina 20 UI/1mL (1 amp = 20 UI) + SF 0,9% 99mL (0,2 UI/mL) --- EV em BIC a 9 mL/h contínuo (sem titulação)." : null,
        hidrocortisona: choqueRefratario ? "Hidrocortisona 50mg pó liofilizado + SF 0,9% 10mL --- EV direto em bolus lento (em 3 min) de 6/6h." : null,
        dobutamina: choqueRefratario ? "Dobutamina 250mg/20mL (1 amp) + SG 5% 230mL (1000 mcg/mL) --- EV em BIC a " + vazaoDobutaAlvo + " mL/h (se disfunção miocárdica / hipoperfusão persistente)." : null
      },
      textoSOAP: textoSOAP
    };
  },

  formatarTextoTelegram: function(res) {
    if (!res) return "";
    if (res.erro) return "🛑 *ERRO DE SEGURANÇA (CHOQUE SÉPTICO):*\n" + res.erro;
    return "🩸 *PROTOCOLO DE CHOQUE SÉPTICO REFRATÁRIO & CIRCI*\n\n" + (res.textoSOAP || "");
  }
};

// Exportação híbrida (suporta require direto e require desestruturado)
EmergenciaChoqueSepticoService.EmergenciaChoqueSepticoService = EmergenciaChoqueSepticoService;
if (typeof module !== "undefined" && module.exports) {
  module.exports = EmergenciaChoqueSepticoService;
}
