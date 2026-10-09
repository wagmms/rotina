/**
 * ==============================================================================
 * MÓDULO 02: SUPORTE AVANÇADO DE VIDA PEDIÁTRICO (PALS / REANIMAÇÃO PEDIÁTRICA)
 * ==============================================================================
 * Motor determinístico de cálculo de medicações de emergência pediátrica, 
 * cardioversão/desfibrilação e via aérea.
 *
 * REFERÊNCIAS:
 * - AHA Guidelines for CPR and ECC: Pediatric Advanced Life Support (PALS).
 * ==============================================================================
 */

var PalsPediatriaService = (function() {
  'use strict';

  /**
   * Estima o peso da criança com base na idade se o peso não for fornecido.
   * Fórmula (APLS): 
   * 1-5 anos: (idade * 2) + 8
   * 6-12 anos: (idade * 3) + 7
   */
  function estimarPesoPorIdade(idadeAnos) {
    if (idadeAnos < 1) return 5; // Valor aproximado para lactentes
    if (idadeAnos <= 5) return (idadeAnos * 2) + 8;
    if (idadeAnos <= 12) return (idadeAnos * 3) + 7;
    return 50; // Max default
  }

  function avaliarPals(params) {
    let pesoKg = params.pesoKg;
    let idadeAnos = params.idadeAnos || 0;
    
    if (!pesoKg && idadeAnos > 0) {
      pesoKg = estimarPesoPorIdade(idadeAnos);
    } else if (!pesoKg) {
      throw new Error("Peso (kg) ou Idade (anos) obrigatórios para cálculo PALS.");
    }

    // Limitar peso máximo a 50kg para evitar superdosagem pediátrica na fórmula linear.
    const pesoCalc = Math.min(pesoKg, 50);

    let alertas = [];
    let medicacoes = [];
    let viaAerea = {};
    let eletricidade = {};

    // 1. Choque (Desfibrilação / Cardioversão)
    eletricidade.desfibrilacaoPrimeiroChoque = `${pesoCalc * 2} J (2 J/kg)`;
    eletricidade.desfibrilacaoSegundoChoque = `${pesoCalc * 4} J (4 J/kg)`;
    eletricidade.desfibrilacaoMaximo = `Até 10 J/kg ou dose máxima de adulto (ex: 200 J bifásico)`;
    eletricidade.cardioversaoPrimeiroChoque = `${(pesoCalc * 0.5).toFixed(1)} a ${pesoCalc * 1} J (0.5 a 1 J/kg)`;
    eletricidade.cardioversaoSegundoChoque = `${pesoCalc * 2} J (2 J/kg)`;

    // 2. Medicações em PCR
    // Adrenalina 0,1 mg/mL (1:10.000) - Dose: 0,01 mg/kg (0,1 mL/kg)
    let doseAdrenalinaMg = (pesoCalc * 0.01).toFixed(2);
    let doseAdrenalinaMl = (pesoCalc * 0.1).toFixed(1);
    
    // Teto de 1 mg (10 mL) - dose de adulto
    if (parseFloat(doseAdrenalinaMg) > 1) {
        doseAdrenalinaMg = "1.00";
        doseAdrenalinaMl = "10.0";
    }

    medicacoes.push({
      farmaco: "Adrenalina 0,1 mg/mL (1:10.000)",
      doseMg: doseAdrenalinaMg + " mg",
      volumeMl: doseAdrenalinaMl + " mL",
      via: "IV/IO a cada 3 a 5 minutos",
      alerta: "Lavar com 5 mL de SF 0,9% após administração."
    });

    // Amiodarona (5 mg/kg, máx 300 mg)
    let doseAmiodaronaMg = pesoCalc * 5;
    if (doseAmiodaronaMg > 300) doseAmiodaronaMg = 300;
    medicacoes.push({
      farmaco: "Amiodarona (50 mg/mL)",
      doseMg: doseAmiodaronaMg + " mg",
      volumeMl: (doseAmiodaronaMg / 50).toFixed(1) + " mL",
      via: "IV/IO em bolus (PCR com FV/TV sem pulso)",
      alerta: "Pode repetir até 2 vezes em PCR refratária."
    });

    // Lidocaína 2% (20 mg/mL) - Dose 1 mg/kg
    let doseLidoMg = pesoCalc * 1;
    if (doseLidoMg > 100) doseLidoMg = 100;
    medicacoes.push({
      farmaco: "Lidocaína 2% sem vasoconstritor (20 mg/mL)",
      doseMg: doseLidoMg + " mg",
      volumeMl: (doseLidoMg / 20).toFixed(1) + " mL",
      via: "IV/IO em bolus",
      alerta: "Alternativa à Amiodarona em FV/TV sem pulso."
    });

    // Sulfato de Magnésio (Torsades de Pointes) - 25 a 50 mg/kg (máx 2g)
    let doseMagMg = pesoCalc * 50;
    if (doseMagMg > 2000) doseMagMg = 2000;
    medicacoes.push({
      farmaco: "Sulfato de Magnésio 10%",
      doseMg: doseMagMg + " mg",
      volumeMl: (doseMagMg / 100).toFixed(1) + " mL",
      via: "IV/IO (Indicado em Torsades de Pointes)",
      alerta: "Administrar em bolus lento ou infusão curta."
    });

    // 3. Via Aérea (Tubo Endotraqueal)
    // Fórmula sem cuff: (idade / 4) + 4
    // Fórmula com cuff: (idade / 4) + 3.5
    // Para < 1 ano: 3.0 ou 3.5
    let tuboSemCuff = "";
    let tuboComCuff = "";
    let lamina = "";
    let fixacao = "";

    if (idadeAnos < 1) {
       tuboSemCuff = "3.5";
       tuboComCuff = "3.0";
       lamina = pesoCalc < 3 ? "Reta 0" : "Reta 1";
       fixacao = "Profundidade: 9 a 10 cm no lábio";
    } else {
       let calcSem = (idadeAnos / 4) + 4;
       let calcCom = (idadeAnos / 4) + 3.5;
       tuboSemCuff = calcSem.toFixed(1);
       tuboComCuff = calcCom.toFixed(1);
       lamina = idadeAnos <= 3 ? "Reta 1 ou 2" : "Curva 2 ou 3";
       
       let tamCalc = parseFloat(tuboComCuff);
       if(isNaN(tamCalc) || tamCalc < 3) tamCalc = 3.5;
       fixacao = "Profundidade: ~" + (tamCalc * 3).toFixed(1) + " cm no lábio (TET x 3)";
    }

    viaAerea = {
      tuboComCuff: tuboComCuff,
      tuboSemCuff: tuboSemCuff,
      laminaLaringoscopio: lamina,
      fixacao: fixacao
    };

    if (pesoCalc >= 30) {
      alertas.push("Paciente com peso elevado (>= 30 kg): considerar transição cautelosa para doses de adulto (ex: máx de 1 mg adrenalina, 300 mg amiodarona) limitadas ao teto terapêutico.");
    }
    
    // Alertas universais PALS
    alertas.push("Na PCR pediátrica, focar em compressões torácicas de alta qualidade (profundidade de 1/3 do AP do tórax, cerca de 4 cm lactentes / 5 cm crianças) e ventilação adequada (relação 15:2 com dois socorristas).");
    alertas.push("Em PCR com ritmo assistolia/AESP, priorizar Adrenalina assim que o acesso IV/IO for estabelecido.");

    return {
      pesoConsideradoKg: pesoCalc,
      idadeConsideradaAnos: idadeAnos,
      eletricidade: eletricidade,
      medicacoes: medicacoes,
      viaAerea: viaAerea,
      alertas: alertas
    };
  }

  return {
    avaliarPals: avaliarPals,
    estimarPesoPorIdade: estimarPesoPorIdade
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PalsPediatriaService;
}
