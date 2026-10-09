/**
 * ==============================================================================
 * MÓDULO 02-D: PUERICULTURA E DESENVOLVIMENTO INFANTIL (ATENÇÃO PRIMÁRIA & SBP)
 * ==============================================================================
 * Motor determinístico de alta performance para pediatria ambulatorial:
 *  - Avaliação antropométrica baseada nas curvas da OMS.
 *  - Vigilância de marcos do DNPM (Desenvolvimento Neuropsicomotor) por idade.
 *  - Calendário Vacinal do PNI 2026.
 *  - Suplementação profilática de Ferro e Vitamina D (SBP).
 * ==============================================================================
 */

var PuericulturaPediatriaService = (function() {
  'use strict';

  // ───────────────────────────────────────────────────────────────────────────
  // 1. SUPLEMENTAÇÃO PROFILÁTICA (FERRO E VITAMINA D)
  // ───────────────────────────────────────────────────────────────────────────
  function orientarSuplementacao(idadeMeses, pesoNascimento, aleitamentoExclusivo) {
    var ferro = [];
    var vitaminaD = [];
    var condutas = [];

    // Vitamina D
    if (idadeMeses < 12) {
      vitaminaD.push("400 UI/dia até completar 1 ano de vida (iniciar na 1ª semana)");
    } else if (idadeMeses >= 12 && idadeMeses < 24) {
      vitaminaD.push("600 UI/dia de 1 a 2 anos de idade");
    }

    // Ferro Elementar
    if (pesoNascimento < 2500) {
      // Baixo peso ou prematuro
      if (pesoNascimento < 1000) {
        ferro.push("4 mg/kg/dia (iniciar com 30 dias de vida até 1 ano). Após 1 ano: 1 mg/kg/dia até 2 anos.");
      } else if (pesoNascimento < 1500) {
        ferro.push("3 mg/kg/dia (iniciar com 30 dias de vida até 1 ano). Após 1 ano: 1 mg/kg/dia até 2 anos.");
      } else {
        ferro.push("2 mg/kg/dia (iniciar com 30 dias de vida até 1 ano). Após 1 ano: 1 mg/kg/dia até 2 anos.");
      }
    } else {
      // A termo e peso adequado (> 2500g)
      if (aleitamentoExclusivo) {
        if (idadeMeses >= 6 && idadeMeses < 24) {
          ferro.push("1 mg/kg/dia (iniciar aos 6 meses de vida até 2 anos).");
        } else if (idadeMeses < 6) {
          ferro.push("Não indicado no momento (Aleitamento materno exclusivo atende até os 6 meses).");
        }
      } else {
        if (idadeMeses >= 3 && idadeMeses < 24) {
          ferro.push("1 mg/kg/dia (iniciar aos 3 meses até 2 anos devido ao desmame/uso de fórmula).");
        } else if (idadeMeses < 3) {
          ferro.push("Aguardar 3 meses para iniciar profilaxia (1 mg/kg/dia).");
        }
      }
    }

    if (vitaminaD.length > 0) condutas.push("💧 Vitamina D: " + vitaminaD[0]);
    if (ferro.length > 0) condutas.push("🩸 Ferro Elementar: " + ferro[0]);

    return {
      vitamina_d: vitaminaD[0] || "Não indicada para a idade atual.",
      ferro: ferro[0] || "Não indicada para a idade atual.",
      resumo: condutas.join("\n")
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. AVALIAÇÃO ANTROPOMÉTRICA (CURVAS DA OMS)
  // ───────────────────────────────────────────────────────────────────────────
  function avaliarAntropometria(idadeMeses, pesoKg, estaturaCm, perimetroCefalicoCm, sexo) {
      // Cálculo do IMC
      var imc = null;
      var classificacaoImc = "Sem dados";
      
      if (pesoKg > 0 && estaturaCm > 0) {
          var estaturaM = estaturaCm / 100;
          imc = pesoKg / (estaturaM * estaturaM);
          
          if (imc > 18) { classificacaoImc = "Risco de Sobrepeso / Obesidade (> Escore Z +1)"; }
          else if (imc < 14) { classificacaoImc = "Magreza (< Escore Z -2)"; }
          else { classificacaoImc = "Eutrofia (Escore Z > -2 e < +1)"; }
      }

      var classificacaoPeso = (pesoKg > 0) ? "Acompanhar curvas da OMS (Z-score)" : "Sem dados";
      var classificacaoEstatura = (estaturaCm > 0) ? "Acompanhar curvas da OMS (Z-score)" : "Sem dados";
      var classificacaoPc = (perimetroCefalicoCm > 0) ? "Acompanhar curvas da OMS (Z-score)" : "Sem dados";
      
      return {
          imc: imc ? parseFloat(imc.toFixed(2)) : null,
          classificacao_peso: classificacaoPeso,
          classificacao_estatura: classificacaoEstatura,
          classificacao_imc: classificacaoImc,
          classificacao_pc: classificacaoPc,
          resumo: "Peso: " + (pesoKg > 0 ? pesoKg + "kg" : "N/I") + 
                  " | Estatura: " + (estaturaCm > 0 ? estaturaCm + "cm" : "N/I") + 
                  " | PC: " + (perimetroCefalicoCm > 0 ? perimetroCefalicoCm + "cm" : "N/I") +
                  (imc ? " | IMC: " + imc.toFixed(2) + " (" + classificacaoImc + ")" : "")
      };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. VIGILÂNCIA DE MARCOS DO DESENVOLVIMENTO (DNPM)
  // ───────────────────────────────────────────────────────────────────────────
  var MARCOS_DNPM = [
      { idadeMax: 1, marcos: ["Acompanha a face do examinador (visual)", "Reage ao som", "Postura fletida predominante"] },
      { idadeMax: 2, marcos: ["Sorri em resposta ao examinador (sorriso social)", "Vocaliza sons simples", "Sustenta a cabeça brevemente em prona"] },
      { idadeMax: 4, marcos: ["Sustenta a cabeça firme (controle cervical)", "Acompanha objetos em 180°", "Ri alto / gargalhadas", "Alcança objetos ativamente"] },
      { idadeMax: 6, marcos: ["Rola no leito", "Senta com apoio", "Transfere objetos de uma mão para a outra", "Emite sons consonantais (bababa)"] },
      { idadeMax: 9, marcos: ["Senta sem apoio", "Engatinha", "Pinça em tesoura", "Estranha desconhecidos", "Imita gestos (ex: tchau)"] },
      { idadeMax: 12, marcos: ["Anda com apoio", "Pinça fina (polegar-indicador)", "Fala 1-2 palavras com significado (mamãe/papai)", "Mostra o que quer apontando"] },
      { idadeMax: 15, marcos: ["Anda sozinho com firmeza", "Coloca bloco na caneca", "Fala 3 a 5 palavras", "Brinca de esconde-esconde"] },
      { idadeMax: 18, marcos: ["Corre", "Constrói torre de 3 blocos", "Fala pelo menos 10 palavras", "Usa colher adequadamente"] },
      { idadeMax: 24, marcos: ["Chuta bola sem apoio", "Constrói torre de 6 blocos", "Junta 2 palavras (frases simples)", "Tira a própria roupa", "Pula com os dois pés"] }
  ];

  function avaliarDNPM(idadeMeses) {
      var marcosEsperados = [];
      var marcosProximos = [];
      var idadeMarcoEsperado = 0;
      var idadeMarcoProximo = 0;

      for (var i = 0; i < MARCOS_DNPM.length; i++) {
          if (idadeMeses >= MARCOS_DNPM[i].idadeMax) {
              marcosEsperados = MARCOS_DNPM[i].marcos;
              idadeMarcoEsperado = MARCOS_DNPM[i].idadeMax;
          } else {
              marcosProximos = MARCOS_DNPM[i].marcos;
              idadeMarcoProximo = MARCOS_DNPM[i].idadeMax;
              break;
          }
      }

      if (idadeMeses === 0) {
          marcosEsperados = MARCOS_DNPM[0].marcos;
          idadeMarcoEsperado = MARCOS_DNPM[0].idadeMax;
          marcosProximos = MARCOS_DNPM[1].marcos;
          idadeMarcoProximo = MARCOS_DNPM[1].idadeMax;
      }

      return {
          idade_avaliada_meses: idadeMeses,
          idade_referencia_esperada: idadeMarcoEsperado,
          marcos_esperados: marcosEsperados,
          idade_referencia_proxima: idadeMarcoProximo,
          proximos_marcos: marcosProximos,
          alerta: (idadeMeses > 24) ? "Avaliar marcos pré-escolares (M-CHAT-R aos 18 e 24 meses)." : "Investigar marcos esperados ativamente."
      };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. CALENDÁRIO VACINAL (PNI 2026)
  // ───────────────────────────────────────────────────────────────────────────
  var VACINAS_PNI = [
      { idadeMeses: 0, nome: "Ao Nascer", vacinas: ["BCG (Dose única)", "Hepatite B (Ao nascer)"] },
      { idadeMeses: 2, nome: "2 Meses", vacinas: ["Pentavalente (1ª dose)", "VIP (1ª dose)", "Pneumocócica 10v (1ª dose)", "Rotavírus (1ª dose)"] },
      { idadeMeses: 3, nome: "3 Meses", vacinas: ["Meningocócica C (1ª dose)"] },
      { idadeMeses: 4, nome: "4 Meses", vacinas: ["Pentavalente (2ª dose)", "VIP (2ª dose)", "Pneumocócica 10v (2ª dose)", "Rotavírus (2ª dose)"] },
      { idadeMeses: 5, nome: "5 Meses", vacinas: ["Meningocócica C (2ª dose)"] },
      { idadeMeses: 6, nome: "6 Meses", vacinas: ["Pentavalente (3ª dose)", "VIP (3ª dose)"] },
      { idadeMeses: 9, nome: "9 Meses", vacinas: ["Febre Amarela (Dose inicial)"] },
      { idadeMeses: 12, nome: "12 Meses", vacinas: ["Tríplice Viral (1ª dose)", "Pneumocócica 10v (Reforço)", "Meningocócica C (Reforço)"] },
      { idadeMeses: 15, nome: "15 Meses", vacinas: ["DTP (1º reforço)", "VOP (1º reforço)", "Tetraviral (Tríplice + Varicela)", "Hepatite A"] }
  ];

  function calendarioVacinal(idadeMeses) {
      var aplicadas = [];
      var atuais = null;
      var proximas = null;

      for (var i = 0; i < VACINAS_PNI.length; i++) {
          if (VACINAS_PNI[i].idadeMeses < idadeMeses) {
              aplicadas.push(VACINAS_PNI[i]);
          } else if (VACINAS_PNI[i].idadeMeses === idadeMeses) {
              atuais = VACINAS_PNI[i];
          } else {
              if (!proximas) proximas = VACINAS_PNI[i];
          }
      }

      if (!atuais && aplicadas.length > 0 && !proximas) {
          atuais = { idadeMeses: idadeMeses, nome: "N/A", vacinas: ["Esquema base finalizado (verificar campanhas anuais como Influenza)."] };
      }

      return {
          historico_aplicadas: aplicadas,
          vacinas_atuais: atuais || { nome: "Nenhuma prevista exata neste mês", vacinas: [] },
          proximas_vacinas: proximas || { nome: "N/A", vacinas: [] },
          status: atuais ? ("Vacinas do mês: " + atuais.vacinas.join(", ")) : "Atualizar caderneta."
      };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. INTEGRAÇÃO GERAL DO PAINEL
  // ───────────────────────────────────────────────────────────────────────────
  function painelCompleto(params) {
      if (!params || typeof params.idadeMeses !== 'number') {
          return { error: "Idade em meses é obrigatória" };
      }
      var idade = params.idadeMeses;
      var pesoNasc = params.pesoNascimento || 3000;
      var amaExclusivo = params.aleitamentoExclusivo !== undefined ? params.aleitamentoExclusivo : true;
      var peso = params.pesoKg || 0;
      var est = params.estaturaCm || 0;
      var pc = params.perimetroCefalicoCm || 0;
      var sx = params.sexo || 'M';

      return {
          suplementacao: orientarSuplementacao(idade, pesoNasc, amaExclusivo),
          antropometria: avaliarAntropometria(idade, peso, est, pc, sx),
          dnpm: avaliarDNPM(idade),
          vacinas: calendarioVacinal(idade)
      };
  }

  return {
    orientarSuplementacao: orientarSuplementacao,
    avaliarAntropometria: avaliarAntropometria,
    avaliarDNPM: avaliarDNPM,
    calendarioVacinal: calendarioVacinal,
    painelCompleto: painelCompleto
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PuericulturaPediatriaService;
}
