class SepsePuerperalService {
  /**
   * Calcula o Sepsis in Obstetrics Score (SOS)
   * e o qSOFA adaptado para gestantes.
   *
   * @param {Object} params
   * @param {number} params.temperatura em graus Celsius
   * @param {number} params.fc frequência cardíaca (bpm)
   * @param {number} params.fr frequência respiratória (rpm)
   * @param {number} params.pas pressão arterial sistólica (mmHg)
   * @param {number} params.pad pressão arterial diastólica (mmHg)
   * @param {number} params.spo2 saturação de O2 (%)
   * @param {number} params.leucocitos contagem global de leucócitos (células/mm3)
   * @param {number} params.glasgow escala de coma de Glasgow (3-15)
   * @param {number} params.lactato lactato sérico (mmol/L)
   * @returns {Object} avaliação completa
   */
  static avaliarRiscoSepsis({ temperatura, fc, fr, pas, pad, spo2, leucocitos, glasgow = 15, lactato = 1.0 }) {
    let sosScore = 0;
    const detalhesSOS = [];

    // Temperatura
    if (temperatura < 36) {
      sosScore += 1;
      detalhesSOS.push("Temperatura < 36°C (+1)");
    } else if (temperatura >= 38 && temperatura < 39) {
      sosScore += 1;
      detalhesSOS.push("Temperatura 38-38.9°C (+1)");
    } else if (temperatura >= 39) {
      sosScore += 2;
      detalhesSOS.push("Temperatura >= 39°C (+2)");
    }

    // FC
    if (fc < 50) {
      sosScore += 2;
      detalhesSOS.push("FC < 50 bpm (+2)");
    } else if (fc >= 50 && fc <= 60) {
      sosScore += 1;
      detalhesSOS.push("FC 50-60 bpm (+1)");
    } else if (fc > 119 && fc < 130) {
      sosScore += 1;
      detalhesSOS.push("FC 120-129 bpm (+1)");
    } else if (fc >= 130) {
      sosScore += 2;
      detalhesSOS.push("FC >= 130 bpm (+2)");
    }

    // FR
    if (fr < 10) {
      sosScore += 2;
      detalhesSOS.push("FR < 10 rpm (+2)");
    } else if (fr >= 21 && fr <= 24) {
      sosScore += 1;
      detalhesSOS.push("FR 21-24 rpm (+1)");
    } else if (fr >= 25 && fr <= 29) {
      sosScore += 2;
      detalhesSOS.push("FR 25-29 rpm (+2)");
    } else if (fr >= 30) {
      sosScore += 3;
      detalhesSOS.push("FR >= 30 rpm (+3)");
    }

    // PAS
    if (pas < 80) {
      sosScore += 2;
      detalhesSOS.push("PAS < 80 mmHg (+2)");
    } else if (pas >= 80 && pas <= 89) {
      sosScore += 1;
      detalhesSOS.push("PAS 80-89 mmHg (+1)");
    } else if (pas >= 140 && pas <= 149) {
      sosScore += 1;
      detalhesSOS.push("PAS 140-149 mmHg (+1)");
    } else if (pas >= 150 && pas <= 159) {
      sosScore += 2;
      detalhesSOS.push("PAS 150-159 mmHg (+2)");
    } else if (pas >= 160) {
      sosScore += 3;
      detalhesSOS.push("PAS >= 160 mmHg (+3)");
    }

    // PAD (Apenas para score, qSOFA usa PAS)
    if (pad <= 40) {
      sosScore += 2;
      detalhesSOS.push("PAD <= 40 mmHg (+2)");
    } else if (pad >= 90 && pad <= 99) {
      sosScore += 1;
      detalhesSOS.push("PAD 90-99 mmHg (+1)");
    } else if (pad >= 100 && pad <= 109) {
      sosScore += 2;
      detalhesSOS.push("PAD 100-109 mmHg (+2)");
    } else if (pad >= 110) {
      sosScore += 3;
      detalhesSOS.push("PAD >= 110 mmHg (+3)");
    }

    // SpO2
    if (spo2 < 92) {
      sosScore += 2;
      detalhesSOS.push("SpO2 < 92% (+2)");
    } else if (spo2 >= 92 && spo2 <= 95) {
      sosScore += 1;
      detalhesSOS.push("SpO2 92-95% (+1)");
    }

    // Leucócitos (normal na gestação até 16.900)
    if (leucocitos < 4000) {
      sosScore += 2;
      detalhesSOS.push("Leucócitos < 4000 (+2)");
    } else if (leucocitos >= 17000) {
      sosScore += 1;
      detalhesSOS.push("Leucócitos >= 17000 (+1)");
    }

    // qSOFA Obstétrico
    let qSofaScore = 0;
    const detalhesQSofa = [];
    if (fr >= 25) {
      qSofaScore += 1;
      detalhesQSofa.push("FR >= 25 rpm (+1)");
    }
    if (pas <= 90) {
      qSofaScore += 1;
      detalhesQSofa.push("PAS <= 90 mmHg (+1)");
    }
    if (glasgow < 15) {
      qSofaScore += 1;
      detalhesQSofa.push("Glasgow < 15 (+1)");
    }

    const riscoAltoSOS = sosScore >= 6;
    const riscoAltoQSofa = qSofaScore >= 2;
    const choqueSeptico = lactato > 2.0 || pas < 90; // Critério simplificado para choque

    return {
      sosScore,
      detalhesSOS,
      riscoAltoSOS,
      qSofaScore,
      detalhesQSofa,
      riscoAltoQSofa,
      choqueSeptico,
      classificacao: (riscoAltoSOS || riscoAltoQSofa || choqueSeptico) ? "ALTO RISCO PARA SEPSE" : "BAIXO RISCO",
      conduta: this.gerarBundleUmaHora(choqueSeptico)
    };
  }

  static gerarBundleUmaHora(choqueSeptico) {
    const bundle = [
      "1. Coleta de Lactato Sérico (repetir se > 2 mmol/L).",
      "2. Hemoculturas ANTES do início do antibiótico.",
      "3. Ressuscitação volêmica criteriosa com Cristaloides (Lactato de Ringer): 30 mL/kg, com atenção ao risco de EAP (Edema Agudo de Pulmão) na gestante.",
      "4. Antibioticoterapia de amplo espectro intravenosa:",
      "   - Opção 1: Ampicilina 2g IV + Gentamicina 5mg/kg IV + Clindamicina 900mg IV",
      "   - Opção 2: Ceftriaxona 2g IV + Metronidazol 500mg IV"
    ];

    if (choqueSeptico) {
      bundle.push("5. [ALERTA DE CHOQUE] Início precoce de Vasopressor (Noradrenalina 0.05 a 0.1 mcg/kg/min) se PAM < 65 mmHg refratária a fluidos.");
      bundle.push("6. UTI/Transferência prioritária.");
    }

    return bundle;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SepsePuerperalService };
}
