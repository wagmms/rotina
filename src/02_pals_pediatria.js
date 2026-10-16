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

  function estimarPesoPorBroselow(cor) {
    const broselow = {
      'cinza': 4,
      'rosa': 6.5,
      'vermelho': 8.5,
      'roxo': 10.5,
      'amarelo': 13,
      'branco': 16.5,
      'azul': 21,
      'laranja': 26.5,
      'verde': 33
    };
    return cor ? broselow[cor.toLowerCase()] || null : null;
  }

  function avaliarPals(params) {
    let pesoKg = params.pesoKg;
    let idadeAnos = params.idadeAnos || 0;
    let corBroselow = params.corBroselow || null;
    
    if (pesoKg !== undefined && pesoKg !== null) {
      let pNum = parseFloat(pesoKg);
      if (isNaN(pNum) || pNum <= 0) {
        throw new Error("Peso inválido. Deve ser um número positivo maior que zero.");
      }
      pesoKg = pNum;
    }

    if (!pesoKg && corBroselow) {
      pesoKg = estimarPesoPorBroselow(corBroselow);
    }
    
    if (!pesoKg && idadeAnos > 0) {
      pesoKg = estimarPesoPorIdade(idadeAnos);
    } else if (!pesoKg) {
      throw new Error("Peso (kg), Idade (anos) ou Cor Broselow obrigatórios para cálculo PALS.");
    }

    // Limitar peso mínimo fisiológico (0.3 kg) e máximo a 50kg para fórmulas lineares do PALS
    const pesoCalc = Math.max(0.3, Math.min(pesoKg, 50));

    let alertas = [];
    let medicacoes = [];
    let viaAerea = {};
    let eletricidade = {};

    // 1. Choque (Desfibrilação / Cardioversão)
    let desfibrilacao1 = Math.round(pesoCalc * 2 * 10) / 10;
    let desfibrilacao2 = Math.round(pesoCalc * 4 * 10) / 10;
    eletricidade.desfibrilacaoPrimeiroChoque = `${desfibrilacao1} J (2 J/kg)`;
    eletricidade.desfibrilacaoSegundoChoque = `${desfibrilacao2} J (4 J/kg)`;
    eletricidade.desfibrilacaoChoquesSubsequentes = `${desfibrilacao2} J (4 J/kg)`;
    eletricidade.desfibrilacaoMaximo = `Até 10 J/kg ou dose máxima de adulto (ex: 200 J bifásico)`;
    eletricidade.cardioversaoPrimeiroChoque = `${(pesoCalc * 0.5).toFixed(1)} a ${pesoCalc * 1} J (0.5 a 1 J/kg)`;
    eletricidade.cardioversaoSincronizadaInicial = `${(pesoCalc * 0.5).toFixed(1)} a ${pesoCalc * 1} J (0.5 a 1 J/kg)`;
    eletricidade.cardioversaoSegundoChoque = `${desfibrilacao1} J (2 J/kg)`;

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
    let doseAmiodaronaMg = Math.round(pesoCalc * 5);
    if (doseAmiodaronaMg > 300) doseAmiodaronaMg = 300;
    medicacoes.push({
      farmaco: "Amiodarona (50 mg/mL)",
      doseMg: doseAmiodaronaMg + " mg",
      volumeMl: (doseAmiodaronaMg / 50).toFixed(1) + " mL",
      via: "IV/IO em bolus (PCR com FV/TV sem pulso)",
      alerta: "Pode repetir até 2 vezes em PCR refratária."
    });

    // Lidocaína 2% (20 mg/mL) - Dose 1 mg/kg
    let doseLidoMg = Math.round(pesoCalc * 1 * 10) / 10;
    if (doseLidoMg > 100) doseLidoMg = 100;
    medicacoes.push({
      farmaco: "Lidocaína 2% sem vasoconstritor (20 mg/mL)",
      doseMg: doseLidoMg + " mg",
      volumeMl: (doseLidoMg / 20).toFixed(1) + " mL",
      via: "IV/IO em bolus",
      alerta: "Alternativa à Amiodarona em FV/TV sem pulso."
    });

    // Sulfato de Magnésio (Torsades de Pointes) - 25 a 50 mg/kg (máx 2g)
    let doseMagMg = Math.round(pesoCalc * 50);
    if (doseMagMg > 2000) doseMagMg = 2000;
    medicacoes.push({
      farmaco: "Sulfato de Magnésio 10%",
      doseMg: doseMagMg + " mg",
      volumeMl: (doseMagMg / 100).toFixed(1) + " mL",
      via: "IV/IO (Indicado em Torsades de Pointes)",
      alerta: "Administrar em bolus lento ou infusão curta."
    });

    // 3. Via Aérea (Tubo Endotraqueal)
    // Para recém-nascidos e lactentes < 1 ano
    let tuboSemCuff = "";
    let tuboComCuff = "";
    let lamina = "";
    let fixacao = "";

    if (idadeAnos < 1) {
       if (pesoCalc < 1.0) {
         // Prematuro extremo (< 1 kg)
         tuboSemCuff = "2.5";
         tuboComCuff = "2.5 (sem cuff preferencial em prematuros)";
         lamina = "Reta 00 ou 0 (Miller)";
         fixacao = "Profundidade: ~" + (pesoCalc + 6).toFixed(1) + " cm no lábio [Regra Peso (kg) + 6 cm]";
         alertas.push("🚨 PREMATURO EXTREMO / NEONATO < 1 KG: Aplicar diretrizes de Reanimação Neonatal (PRN/NRP). Para TET usar 2.5 mm sem cuff e profundidade no lábio fixada em peso (kg) + 6 cm para prevenir intubação seletiva.");
       } else if (pesoCalc < 2.0) {
         tuboSemCuff = "3.0";
         tuboComCuff = "3.0";
         lamina = "Reta 0";
         fixacao = "Profundidade: ~" + (pesoCalc + 6).toFixed(1) + " cm no lábio";
       } else if (pesoCalc < 3.0) {
         tuboSemCuff = "3.5";
         tuboComCuff = "3.0";
         lamina = "Reta 0 ou 1";
         fixacao = "Profundidade: ~" + (pesoCalc + 6).toFixed(1) + " cm no lábio";
       } else {
         // Termo (> 3 kg)
         tuboSemCuff = "3.5";
         tuboComCuff = "3.0";
         lamina = "Reta 1";
         fixacao = "Profundidade: 9 a 10 cm no lábio";
       }
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

    if (pesoKg > 50) {
      alertas.push("⚠️ PACIENTE COM PESO ELEVADO (" + pesoKg + " kg > 50 kg): O protocolo pediátrico PALS limita a dosagem calculada ao teto de 50 kg (doses máximas de adulto atingidas). Seguir diretrizes do ACLS de reanimação de adultos.");
    } else if (pesoCalc >= 30) {
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

  /**
   * ============================================================================
   * ESCORE PHOENIX DE SEPSE E CHOQUE SÉPTICO PEDIÁTRICO (SCCM / JAMA 2024)
   * Referência: Schlapbach LJ, Watson RS, Sorce LR, et al. International Consensus
   * Criteria for Pediatric Sepsis and Septic Shock. JAMA. 2024;331(8):665-674.
   * ============================================================================
   */

  /**
   * Tabela etária de Pressão Arterial Média (PAM em mmHg) do Escore Phoenix (JAMA 2024).
   * Retorna 0, 1 ou 2 pontos conforme a idade em meses.
   * @private
   */
  function _pontuarPamPhoenixPorIdade(pam, idadeMeses) {
    if (pam === null || pam === undefined || isNaN(pam) || pam <= 0) return null;
    if (idadeMeses === null || idadeMeses === undefined || isNaN(idadeMeses) || idadeMeses < 0) return null;

    // < 1 mês (>30: 0 pt | 17-30: 1 pt | <17: 2 pts)
    if (idadeMeses < 1) {
      if (pam < 17) return { pontos: 2, faixaEsperada: '> 30 mmHg', limiarCritico: '< 17 mmHg' };
      if (pam <= 30) return { pontos: 1, faixaEsperada: '> 30 mmHg', limiarCritico: '17–30 mmHg' };
      return { pontos: 0, faixaEsperada: '> 30 mmHg', limiarCritico: 'Normal' };
    }
    // 1 a 11 meses (>38: 0 pt | 25-38: 1 pt | <25: 2 pts)
    if (idadeMeses < 12) {
      if (pam < 25) return { pontos: 2, faixaEsperada: '> 38 mmHg', limiarCritico: '< 25 mmHg' };
      if (pam <= 38) return { pontos: 1, faixaEsperada: '> 38 mmHg', limiarCritico: '25–38 mmHg' };
      return { pontos: 0, faixaEsperada: '> 38 mmHg', limiarCritico: 'Normal' };
    }
    // 1 a < 2 anos (12 a 23 meses) (>43: 0 pt | 31-43: 1 pt | <31: 2 pts)
    if (idadeMeses < 24) {
      if (pam < 31) return { pontos: 2, faixaEsperada: '> 43 mmHg', limiarCritico: '< 31 mmHg' };
      if (pam <= 43) return { pontos: 1, faixaEsperada: '> 43 mmHg', limiarCritico: '31–43 mmHg' };
      return { pontos: 0, faixaEsperada: '> 43 mmHg', limiarCritico: 'Normal' };
    }
    // 2 a < 5 anos (24 a 59 meses) (>44: 0 pt | 32-44: 1 pt | <32: 2 pts)
    if (idadeMeses < 60) {
      if (pam < 32) return { pontos: 2, faixaEsperada: '> 44 mmHg', limiarCritico: '< 32 mmHg' };
      if (pam <= 44) return { pontos: 1, faixaEsperada: '> 44 mmHg', limiarCritico: '32–44 mmHg' };
      return { pontos: 0, faixaEsperada: '> 44 mmHg', limiarCritico: 'Normal' };
    }
    // 5 a < 12 anos (60 a 143 meses) (>48: 0 pt | 36-48: 1 pt | <36: 2 pts)
    if (idadeMeses < 144) {
      if (pam < 36) return { pontos: 2, faixaEsperada: '> 48 mmHg', limiarCritico: '< 36 mmHg' };
      if (pam <= 48) return { pontos: 1, faixaEsperada: '> 48 mmHg', limiarCritico: '36–48 mmHg' };
      return { pontos: 0, faixaEsperada: '> 48 mmHg', limiarCritico: 'Normal' };
    }
    // 12 a 17 anos (144 a 215 meses) (>51: 0 pt | 38-51: 1 pt | <38: 2 pts)
    if (pam < 38) return { pontos: 2, faixaEsperada: '> 51 mmHg', limiarCritico: '< 38 mmHg' };
    if (pam <= 51) return { pontos: 1, faixaEsperada: '> 51 mmHg', limiarCritico: '38–51 mmHg' };
    return { pontos: 0, faixaEsperada: '> 51 mmHg', limiarCritico: 'Normal' };
  }

  /**
   * Avalia o Escore Phoenix de Sepse Pediátrica (SCCM 2024 - JAMA 2024).
   *
   * @param {Object} params Parâmetros clínicos e laboratoriais do paciente pediátrico
   * @param {boolean} [params.suspeitaInfeccao=true] Suspeita ou confirmação de infecção aguda
   * @param {number}  [params.idadeMeses] Idade em meses (ou calculada via idadeAnos * 12)
   * @param {number}  [params.idadeAnos] Idade em anos (opcional se idadeMeses fornecido)
   * @param {number}  [params.pesoKg] Peso em kg para cálculo exato da alíquota de cristaloide
   *
   * // Domínio Respiratório (0 a 3 pts)
   * @param {number}  [params.pao2Fio2] Relação PaO2/FiO2 direta
   * @param {number}  [params.pao2] PaO2 arterial (mmHg)
   * @param {number}  [params.spo2Fio2] Relação SpO2/FiO2 direta (válida se SpO2 <= 97%)
   * @param {number}  [params.spo2] SpO2 periférica (%)
   * @param {number}  [params.fio2] FiO2 (fração 0.21-1.0 ou porcentagem 21-100)
   * @param {string}  [params.suporteRespiratorio='nenhum'] 'nenhum' | 'oxigenio' | 'cnaf' | 'vni' | 'vmi'
   * @param {boolean} [params.vmi=false] Atalho booleano para Ventilação Mecânica Invasiva
   *
   * // Domínio Cardiovascular (0 a 6 pts)
   * @param {Array<string>|Object|number} [params.dva] Drogas vasoativas em infusão contínua
   * @param {number}  [params.pam] Pressão Arterial Média invasiva ou oscilométrica (mmHg)
   * @param {boolean} [params.pamAbaixoP5=false] Flag direta indicando PAM < percentil 5 para a idade
   * @param {number}  [params.lactatoMmolL] Lactato sérico em mmol/L
   * @param {number}  [params.lactatoMgDl] Lactato sérico em mg/dL (convertido: mg/dL / 9)
   *
   * // Domínio Coagulação (0 a 2 pts)
   * @param {number}  [params.plaquetas] Contagem de plaquetas (/mm³ ou x10³/µL)
   * @param {number}  [params.inr] RNI / INR
   * @param {number}  [params.fibrinogenio] Fibrinogênio sérico (mg/dL)
   * @param {number}  [params.dDimero] D-dímero em mg/L FEU (ou ng/mL se > 50, convertido)
   *
   * // Domínio Neurológico (0 a 2 pts)
   * @param {number}  [params.glasgow] Escala de Coma de Glasgow (3 a 15)
   * @param {boolean} [params.pupilasFixasBilaterais=false] Pupilas médio-fixas ou midriáticas fixas bilaterais
   *
   * @returns {Object} Resultado determinístico estruturado com escore, diagnóstico e condutas da 1ª Hora
   */
  function avaliarPhoenixSepsis(params) {
    params = params || {};
    var suspeitaInfeccao = params.suspeitaInfeccao !== undefined ? Boolean(params.suspeitaInfeccao) : true;
    var rawIdadeMeses = params.idadeMeses;
    var idadeAnos = params.idadeAnos;
    var pesoKg = params.pesoKg;
    var rawPf = params.pao2Fio2;
    var pao2 = params.pao2;
    var rawSf = params.spo2Fio2;
    var spo2 = params.spo2;
    var rawFio2 = params.fio2;
    var suporteRespiratorio = params.suporteRespiratorio || 'nenhum';
    var vmi = Boolean(params.vmi);
    var dva = params.dva;
    var pam = params.pam;
    var pamAbaixoP5 = Boolean(params.pamAbaixoP5);
    var rawLactatoMmol = params.lactatoMmolL;
    var lactatoMgDl = params.lactatoMgDl;
    var plaquetas = params.plaquetas;
    var inr = params.inr;
    var fibrinogenio = params.fibrinogenio;
    var dDimero = params.dDimero;
    var glasgow = params.glasgow;
    var pupilasFixasBilaterais = Boolean(params.pupilasFixasBilaterais);

    var idadeMeses = (rawIdadeMeses !== undefined && rawIdadeMeses !== null)
      ? Number(rawIdadeMeses)
      : (idadeAnos !== undefined && idadeAnos !== null ? Number(idadeAnos) * 12 : null);

    // ==========================================================================
    // 1. DOMÍNIO RESPIRATÓRIO (0 a 3 pontos)
    // ==========================================================================
    var fio2 = (rawFio2 !== undefined && rawFio2 !== null) ? Number(rawFio2) : null;
    if (fio2 !== null && fio2 > 1) fio2 = fio2 / 100;

    var pf = (rawPf !== undefined && rawPf !== null)
      ? Number(rawPf)
      : (pao2 && fio2 ? Number(pao2) / fio2 : null);

    // Nota SCCM 2024: SpO2/FiO2 só deve ser calculada se SpO2 <= 97%
    var spo2ValidaParaCalculo = (spo2 !== undefined && spo2 !== null && Number(spo2) <= 97);
    var sf = (rawSf !== undefined && rawSf !== null)
      ? Number(rawSf)
      : (spo2ValidaParaCalculo && fio2 ? Number(spo2) / fio2 : null);

    var tipoSuporteNorm = String(suporteRespiratorio || 'nenhum').toLowerCase().trim();
    var emVMI = vmi || tipoSuporteNorm === 'vmi' || tipoSuporteNorm === 'iot';
    var emQualquerSuporte = emVMI ||
      ['oxigenio', 'o2', 'cnaf', 'alto_fluxo', 'vni', 'cpap', 'bipap'].indexOf(tipoSuporteNorm) !== -1 ||
      (fio2 !== null && fio2 > 0.21);

    var ptsRespiratorio = 0;
    var criteriosRespiratorios = [];

    if (emVMI && ((pf !== null && pf < 100) || (sf !== null && sf < 148))) {
      ptsRespiratorio = 3;
      criteriosRespiratorios.push(
        pf !== null && pf < 100
          ? 'PaO2/FiO2 < 100 (' + Math.round(pf) + ') em VMI (3 pts)'
          : 'SpO2/FiO2 < 148 (' + Math.round(sf) + ') em VMI (3 pts)'
      );
    } else if (emVMI && ((pf !== null && pf < 200) || (sf !== null && sf < 220))) {
      ptsRespiratorio = 2;
      criteriosRespiratorios.push(
        pf !== null && pf < 200
          ? 'PaO2/FiO2 100–199 (' + Math.round(pf) + ') em VMI (2 pts)'
          : 'SpO2/FiO2 148–219 (' + Math.round(sf) + ') em VMI (2 pts)'
      );
    } else if (emQualquerSuporte && ((pf !== null && pf < 400) || (sf !== null && sf < 292))) {
      ptsRespiratorio = 1;
      criteriosRespiratorios.push(
        pf !== null && pf < 400
          ? 'PaO2/FiO2 < 400 (' + Math.round(pf) + ') em suporte respiratório (' + tipoSuporteNorm.toUpperCase() + ') (1 pt)'
          : 'SpO2/FiO2 < 292 (' + Math.round(sf) + ') em suporte respiratório (' + tipoSuporteNorm.toUpperCase() + ') (1 pt)'
      );
    }

    // ==========================================================================
    // 2. DOMÍNIO CARDIOVASCULAR (0 a 6 pontos: DVA [0-2] + Lactato [0-2] + PAM [0-2])
    // ==========================================================================
    var criteriosCardiovasculares = [];

    // 2.1 Drogas Vasoativas
    var qtdDva = 0;
    var listaDvasAtivas = [];

    if (typeof dva === 'number' && !isNaN(dva)) {
      qtdDva = Math.max(0, Math.floor(dva));
    } else if (Array.isArray(dva)) {
      dva.forEach(function(item) {
        if (item && String(item).trim() !== '') listaDvasAtivas.push(String(item).trim());
      });
      qtdDva = listaDvasAtivas.length;
    } else if (dva && typeof dva === 'object') {
      var agentesReconhecidos = [
        'noradrenalina', 'norepinefrina', 'adrenalina', 'epinefrina',
        'dobutamina', 'milrinona', 'vasopressina', 'dopamina'
      ];
      Object.keys(dva).forEach(function(chave) {
        var valor = dva[chave];
        var chaveNorm = chave.toLowerCase().trim();
        var ativo = (typeof valor === 'number' && valor > 0) || valor === true;
        if (ativo && (agentesReconhecidos.indexOf(chaveNorm) !== -1 || chaveNorm.length > 0)) {
          listaDvasAtivas.push(chave + ' (' + (valor === true ? 'em uso' : valor + ' mcg/kg/min') + ')');
        }
      });
      qtdDva = listaDvasAtivas.length;
    }

    var ptsDva = 0;
    if (qtdDva >= 2) {
      ptsDva = 2;
      criteriosCardiovasculares.push('Uso de >= 2 drogas vasoativas [' + (listaDvasAtivas.join(', ') || qtdDva) + '] (2 pts)');
    } else if (qtdDva === 1) {
      ptsDva = 1;
      criteriosCardiovasculares.push('Uso de 1 droga vasoativa [' + (listaDvasAtivas[0] || '1 DVA') + '] (1 pt)');
    }

    // 2.2 Lactato Sérico (mmol/L ou conversão de mg/dL: 45 mg/dL == 5.0 mmol/L; 99 mg/dL == 11.0 mmol/L)
    var lactatoMmol = (rawLactatoMmol !== undefined && rawLactatoMmol !== null)
      ? Number(rawLactatoMmol)
      : (lactatoMgDl !== undefined && lactatoMgDl !== null ? Number(lactatoMgDl) / 9.0 : null);

    var ptsLactato = 0;
    if (lactatoMmol !== null && !isNaN(lactatoMmol)) {
      if (lactatoMmol >= 11.0) {
        ptsLactato = 2;
        criteriosCardiovasculares.push('Lactato sérico >= 11 mmol/L (' + lactatoMmol.toFixed(1) + ' mmol/L) (2 pts)');
      } else if (lactatoMmol >= 5.0) {
        ptsLactato = 1;
        criteriosCardiovasculares.push('Lactato sérico 5,0–10,9 mmol/L (' + lactatoMmol.toFixed(1) + ' mmol/L / >= 45 mg/dL) (1 pt)');
      }
    }

    // 2.3 Hipotensão Arterial (PAM por faixa etária ou PAM < p5)
    var ptsPam = 0;
    var avaliacaoPamIdade = _pontuarPamPhoenixPorIdade(Number(pam), idadeMeses);

    if (avaliacaoPamIdade !== null) {
      ptsPam = avaliacaoPamIdade.pontos;
      if (ptsPam > 0) {
        criteriosCardiovasculares.push(
          'PAM reduzida para a idade (' + pam + ' mmHg; corte ' + avaliacaoPamIdade.limiarCritico + ') (' + ptsPam + ' pt' + (ptsPam > 1 ? 's' : '') + ')'
        );
      }
    }

    if (pamAbaixoP5 === true && ptsPam === 0) {
      ptsPam = 1;
      criteriosCardiovasculares.push('PAM abaixo do percentil 5 para a idade (1 pt)');
    }

    var ptsCardiovascular = Math.min(6, ptsDva + ptsLactato + ptsPam);

    // ==========================================================================
    // 3. DOMÍNIO COAGULAÇÃO (0 a 2 pontos)
    // ==========================================================================
    var ptsCoagulacaoBruto = 0;
    var criteriosCoagulacao = [];

    if (plaquetas !== undefined && plaquetas !== null && !isNaN(plaquetas) && Number(plaquetas) > 0) {
      var plaqAbsoluta = Number(plaquetas) < 1000 ? Number(plaquetas) * 1000 : Number(plaquetas);
      if (plaqAbsoluta < 100000) {
        ptsCoagulacaoBruto += 1;
        criteriosCoagulacao.push('Plaquetas < 100.000/mm³ (' + Math.round(plaqAbsoluta).toLocaleString('pt-BR') + '/mm³) (1 pt)');
      }
    }

    if (inr !== undefined && inr !== null && !isNaN(inr) && Number(inr) > 1.3) {
      ptsCoagulacaoBruto += 1;
      criteriosCoagulacao.push('INR > 1,3 (' + Number(inr).toFixed(2) + ') (1 pt)');
    }

    if (fibrinogenio !== undefined && fibrinogenio !== null && !isNaN(fibrinogenio) && Number(fibrinogenio) > 0 && Number(fibrinogenio) < 100) {
      ptsCoagulacaoBruto += 1;
      criteriosCoagulacao.push('Fibrinogênio < 100 mg/dL (' + Number(fibrinogenio) + ' mg/dL) (1 pt)');
    }

    if (dDimero !== undefined && dDimero !== null && !isNaN(dDimero) && Number(dDimero) > 0) {
      var dDimeroMgL = Number(dDimero) > 50 ? Number(dDimero) / 1000 : Number(dDimero);
      if (dDimeroMgL > 2.0) {
        ptsCoagulacaoBruto += 1;
        criteriosCoagulacao.push('D-dímero > 2,0 mg/L FEU (' + dDimeroMgL.toFixed(2) + ' mg/L) (1 pt)');
      }
    }

    var ptsCoagulacao = Math.min(2, ptsCoagulacaoBruto);

    // ==========================================================================
    // 4. DOMÍNIO NEUROLÓGICO (0 a 2 pontos)
    // ==========================================================================
    var ptsNeurologico = 0;
    var criteriosNeurologicos = [];

    if (pupilasFixasBilaterais === true) {
      ptsNeurologico = 2;
      criteriosNeurologicos.push('Pupilas fixas bilaterais (2 pts)');
    } else if (glasgow !== undefined && glasgow !== null && !isNaN(glasgow) && Number(glasgow) <= 10) {
      ptsNeurologico = 1;
      criteriosNeurologicos.push('Escala de Coma de Glasgow <= 10 (ECG = ' + Number(glasgow) + ') (1 pt)');
    }

    // ==========================================================================
    // 5. CONSOLIDAÇÃO DIAGNÓSTICA E CONDUTAS (GOLDEN HOUR)
    // ==========================================================================
    var pontosTotais = ptsRespiratorio + ptsCardiovascular + ptsCoagulacao + ptsNeurologico;
    var sepsePediatrica = suspeitaInfeccao && pontosTotais >= 2;
    var choqueSepticoPediatrico = sepsePediatrica && ptsCardiovascular >= 1;

    var diagnostico = 'Sem Critérios de Sepse pelo Escore Phoenix (< 2 pontos)';
    if (choqueSepticoPediatrico) {
      diagnostico = 'Choque Séptico Pediátrico (Escore Phoenix >= 2 com >= 1 ponto Cardiovascular)';
    } else if (sepsePediatrica) {
      diagnostico = 'Sepse Pediátrica (Escore Phoenix >= 2 com suspeita/confirmação de infecção)';
    } else if (!suspeitaInfeccao && pontosTotais >= 2) {
      diagnostico = 'Disfunção Orgânica Múltipla Pediátrica (Phoenix >= 2 sem suspeita de infecção ativa)';
    }

    var pesoValido = (pesoKg !== undefined && pesoKg !== null && !isNaN(pesoKg) && Number(pesoKg) > 0)
      ? Number(pesoKg)
      : null;

    var volumeAliquota10ml = pesoValido ? Math.round(pesoValido * 10) : null;
    var volumeAliquota20ml = pesoValido ? Math.round(pesoValido * 20) : null;

    return {
      escore: 'Phoenix Sepsis Score (SCCM / JAMA 2024)',
      pontosTotais: pontosTotais,
      suspeitaInfeccao: suspeitaInfeccao,
      sepseConfirmada: sepsePediatrica,
      choqueSepticoConfirmado: choqueSepticoPediatrico,
      diagnostico: diagnostico,
      dominios: {
        respiratorio: {
          pontos: ptsRespiratorio,
          maximo: 3,
          criteriosAtivos: criteriosRespiratorios
        },
        cardiovascular: {
          pontos: ptsCardiovascular,
          maximo: 6,
          subcomponentes: {
            dva: ptsDva,
            lactato: ptsLactato,
            pam: ptsPam
          },
          criteriosAtivos: criteriosCardiovasculares
        },
        coagulacao: {
          pontos: ptsCoagulacao,
          maximo: 2,
          criteriosAtivos: criteriosCoagulacao
        },
        neurologico: {
          pontos: ptsNeurologico,
          maximo: 2,
          criteriosAtivos: criteriosNeurologicos
        }
      },
      condutas: {
        goldenHourAntimicrobiano: sepsePediatrica
          ? {
              prioridade: choqueSepticoPediatrico ? 'IMEDIATA — Na 1ª Hora (Golden Hour)' : 'URGENTE — Na 1ª Hora após avaliação inicial',
              recomendacao: 'Coletar hemoculturas (sem atrasar a infusão) e administrar antimicrobiano empírico de amplo espectro endovenoso/intraósseo na 1ª hora (Golden Hour).'
            }
          : {
              prioridade: 'Reavaliação clínica seriada',
              recomendacao: 'Monitorar sinais vitais e perfusão; antimicrobianos conforme foco infeccioso específico.'
            },
        ressuscitacaoVolemica: {
          fluidoEscolha: 'Cristaloide balanceado (Ringer Lactato ou Plasma-Lyte)',
          esquema: '10 a 20 mL/kg em bolus EV/IO em 15–30 minutos, guiado por reavaliação hemodinâmica a cada alíquota.',
          volumeCalculadoPorPeso: pesoValido
            ? {
                pesoKg: pesoValido,
                aliquota10mlKg: volumeAliquota10ml + ' mL',
                aliquota20mlKg: volumeAliquota20ml + ' mL'
              }
            : null,
          monitorizacaoSobrecarga: 'Suspender expansão se surgirem estertores crepitantes, hepatomegalia aguda ou piora do esforço respiratório.'
        },
        suporteVasoAtivo: choqueSepticoPediatrico
          ? 'Iniciar Epinefrina (0,05–0,3 mcg/kg/min) ou Norepinefrina (0,05–0,3 mcg/kg/min) se hipoperfusão/hipotensão refratária a 40–60 mL/kg de cristaloide (pode ser infundida em acesso periférico seguro até obtenção de acesso central).'
          : 'Não indicado no momento; manter vigilância rigorosa de PAM, tempo de enchimento capilar e lactato.'
      }
    };
  }

  return {
    avaliarPals: avaliarPals,
    estimarPesoPorIdade: estimarPesoPorIdade,
    estimarPesoPorBroselow: estimarPesoPorBroselow,
    avaliarPhoenixSepsis: avaliarPhoenixSepsis
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PalsPediatriaService;
}
