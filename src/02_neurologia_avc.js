/**
 * ==============================================================================
 * MÓDULO 02: NEUROLOGIA DE EMERGÊNCIA E AVC ISQUÊMICO
 * ==============================================================================
 * Motor determinístico para manejo de AVC Isquêmico, Trombólise e HIC.
 * ==============================================================================
 */

var NeurologiaAvcService = (function() {
  'use strict';

  function avaliarTrombolise(params) {
    let idade = params.idade;
    let tempoSintomasHoras = params.tempoSintomasHoras;
    let contraAbsolutas = params.contraAbsolutas || [];
    let contraRelativas = params.contraRelativas || [];

    if (idade === undefined || tempoSintomasHoras === undefined) {
      throw new Error("Idade e tempo de início dos sintomas (horas) são obrigatórios.");
    }

    let elegivel = false;
    let mensagem = "";
    let posologiaAlteplase = null;

    if (tempoSintomasHoras > 4.5) {
      mensagem = "Trombólise IV contraindicada (Janela terapêutica > 4.5 horas). Avaliar Trombectomia Mecânica se oclusão de grande vaso e janela até 24h (DAWN/DEFUSE-3).";
    } else if (contraAbsolutas.length > 0) {
      mensagem = "Trombólise IV contraindicada devido a contraindicações absolutas: " + contraAbsolutas.join(", ");
    } else {
      if (tempoSintomasHoras > 3.0 && tempoSintomasHoras <= 4.5) {
        // Critérios adicionais para 3 a 4.5h (ECASS III)
        let criteriosExclusao45 = [];
        if (idade > 80) criteriosExclusao45.push("Idade > 80 anos");
        if (params.usoAnticoagulanteOral) criteriosExclusao45.push("Uso de anticoagulante oral (qualquer RNI)");
        if (params.nihss > 25) criteriosExclusao45.push("AVC grave (NIHSS > 25)");
        if (params.historicoAvcEDiabetes) criteriosExclusao45.push("Histórico prévio de AVC e Diabetes");

        if (criteriosExclusao45.length > 0) {
           mensagem = "Trombólise IV contraindicada na janela de 3-4.5h devido a: " + criteriosExclusao45.join(", ");
        } else {
           elegivel = true;
        }
      } else {
        elegivel = true;
      }
    }

    if (elegivel) {
      mensagem = "Paciente ELEGÍVEL para Trombólise IV (Alteplase) na janela de até 4.5h.";
      if (contraRelativas.length > 0) {
        mensagem += " ATENÇÃO: Avaliar risco/benefício devido a contraindicações relativas: " + contraRelativas.join(", ");
      }
      
      let peso = params.pesoKg;
      if (peso) {
         let maxPeso = Math.min(peso, 100);
         let doseTotal = (maxPeso * 0.9).toFixed(1);
         let bolus = (doseTotal * 0.1).toFixed(1);
         let infusao = (doseTotal * 0.9).toFixed(1);
         posologiaAlteplase = `Alteplase (0,9 mg/kg, máx 90 mg). Dose Total: ${doseTotal} mg. Bolus IV (10%): ${bolus} mg em 1 minuto. Infusão IV (90%): ${infusao} mg em 60 minutos.`;
      }
    }

    // Protocolo de PA
    let pa = {
      alvoPreTrombolise: "PA < 185/110 mmHg antes de iniciar Alteplase.",
      alvoPosTrombolise: "PA < 180/105 mmHg nas primeiras 24 horas pós-trombólise.",
      manejo: "Se PA elevada, usar Labetalol 10-20 mg IV (1 a 2 min), repetido 1x se necessário. Como alternativa ou se refratário: Nitroprussiato de Sódio IV (0.5 a 10 mcg/kg/min). Evitar nifedipina sublingual.",
      semTrombolise: "Se NÃO for trombolisar, tolerar PA até 220/120 mmHg nas primeiras 24-48h (hipertensão permissiva). Reduzir apenas 15% nas primeiras 24h."
    };

    return {
      elegibilidade: {
        elegivel: elegivel,
        mensagem: mensagem,
        posologiaAlteplase: posologiaAlteplase
      },
      controlePressao: pa
    };
  }

  function calcularHic(params) {
    let peso = params.pesoKg;
    if (!peso) throw new Error("Peso (kg) obrigatório para cálculos de HIC.");
    
    // Manitol 20% - 0.5 a 1 g/kg
    let doseManitolG = (peso * 0.5).toFixed(1) + " a " + (peso * 1.0).toFixed(1);
    let volumeManitolMl = (peso * (0.5 / 0.2)).toFixed(0) + " a " + (peso * (1.0 / 0.2)).toFixed(0);
    
    // Salina Hipertônica 20% (1 mL/kg bolus em emergência) ou 3%
    let doseSalina20Ml = peso.toFixed(0);
    let doseSalina3Ml = (peso * 3).toFixed(0); // 3 a 5 ml/kg
    
    return {
      manitol20: {
        doseGramas: doseManitolG + " g",
        volumeMl: volumeManitolMl + " mL",
        alerta: "Infundir em 20-30 min. Contraindicado em instabilidade hemodinâmica, edema pulmonar ou anúria. Monitorar osmolaridade sérica (alvo < 320 mOsm/L)."
      },
      salinaHipertonica3: {
        volumeMl: doseSalina3Ml + " mL",
        posologia: "IV em 20-30 min",
        alerta: "Indicado para pacientes com HIC, preferível ao manitol se choque associado."
      },
      salinaHipertonica20: {
        volumeMl: doseSalina20Ml + " mL",
        posologia: "IV em bolus (central preferencial)",
        alerta: "Terapia de resgate para HIC severa (herniação iminente)."
      },
      alertaGeral: "Manter cabeceira elevada a 30 graus, colar cervical frouxo, normocarbia (pCO2 35-40), e evitar hipertermia/hiponatremia."
    };
  }

  return {
    avaliarTrombolise: avaliarTrombolise,
    calcularHic: calcularHic
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = NeurologiaAvcService;
}
