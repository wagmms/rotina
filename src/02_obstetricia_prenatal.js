/**
 * ==============================================================================
 * MÓDULO 02-C: CALCULADORA E PAINEL DE PRÉ-NATAL (OBSTETRÍCIA AMBULATORIAL)
 * ==============================================================================
 * Motor determinístico de alta performance para obstetrícia e atenção primária:
 *  - Cálculo instantâneo de Idade Gestacional (IG) e DPP por DUM (Regra de Naegele).
 *  - Cálculo de IG/DPP por USG precoce com regra de concordância da FEBRASGO/ACOG.
 *  - Avaliação de ganho de peso gestacional ideal baseado no IMC prévio (IOM / MS).
 *  - Rastreio de exames, condutas, vacinas e profilaxias por trimestre gestacional.
 *  - Validador farmacológico estrito de risco na gestação e lactação com alternativas.
 * ==============================================================================
 */

var ObstetriciaPrenatalService = (function() {
  'use strict';

  // ───────────────────────────────────────────────────────────────────────────
  // 1. CONSTANTES E TABELAS CLÍNICAS (FEBRASGO / MINISTÉRIO DA SAÚDE / IOM)
  // ───────────────────────────────────────────────────────────────────────────

  // Dias por mês para cálculos de calendário (não bissexto por padrão)
  var DIAS_NO_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  function ehAnoBissexto(ano) {
    return (ano % 4 === 0 && ano % 100 !== 0) || (ano % 400 === 0);
  }

  function getDiasNoMes(mes, ano) {
    if (mes === 2 && ehAnoBissexto(ano)) return 29;
    return DIAS_NO_MES[mes - 1] || 30;
  }

  // Parse de data flexível: aceita Date, string DD/MM/AAAA ou YYYY-MM-DD
  function parseData(valor) {
    if (!valor) return null;
    if (valor instanceof Date && !isNaN(valor.getTime())) {
      return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate(), 12, 0, 0);
    }
    if (typeof valor === 'string') {
      var limpo = valor.trim();
      // Formato DD/MM/AAAA ou DD-MM-AAAA
      var mBr = limpo.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
      if (mBr) {
        var d = parseInt(mBr[1], 10);
        var m = parseInt(mBr[2], 10);
        var a = parseInt(mBr[3], 10);
        if (m >= 1 && m <= 12 && d >= 1 && d <= getDiasNoMes(m, a)) {
          return new Date(a, m - 1, d, 12, 0, 0);
        }
      }
      // Formato ISO YYYY-MM-DD
      var mIso = limpo.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})$/);
      if (mIso) {
        var aIso = parseInt(mIso[1], 10);
        var mIsoVal = parseInt(mIso[2], 10);
        var dIso = parseInt(mIso[3], 10);
        if (mIsoVal >= 1 && mIsoVal <= 12 && dIso >= 1 && dIso <= getDiasNoMes(mIsoVal, aIso)) {
          return new Date(aIso, mIsoVal - 1, dIso, 12, 0, 0);
        }
      }
    }
    return null;
  }

  function formatarDataBr(d) {
    if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
    var dia = ('0' + d.getDate()).slice(-2);
    var mes = ('0' + (d.getMonth() + 1)).slice(-2);
    var ano = d.getFullYear();
    return dia + '/' + mes + '/' + ano;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. CÁLCULO DE IG E DPP POR DUM (REGRA DE NAEGELE)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Calcula DPP pela Regra Clássica de Naegele:
   *  - Para meses 1 a 3 (jan-mar): Dia + 7, Mês + 9, Ano = ano da DUM.
   *  - Para meses 4 a 12 (abr-dez): Dia + 7, Mês - 3, Ano = ano da DUM + 1.
   * Faz o rollover exato de dias caso o dia resultante ultrapasse os dias do mês.
   */
  function calcularDppNaegele(dataDum) {
    var d = parseData(dataDum);
    if (!d) return null;

    var diaDum = d.getDate();
    var mesDum = d.getMonth() + 1; // 1-12
    var anoDum = d.getFullYear();

    var novoDia = diaDum + 7;
    var novoMes;
    var novoAno;

    if (mesDum <= 3) {
      novoMes = mesDum + 9;
      novoAno = anoDum;
    } else {
      novoMes = mesDum - 3;
      novoAno = anoDum + 1;
    }

    var diasNoNovoMes = getDiasNoMes(novoMes, novoAno);
    if (novoDia > diasNoNovoMes) {
      novoDia = novoDia - diasNoNovoMes;
      novoMes = novoMes + 1;
      if (novoMes > 12) {
        novoMes = 1;
        novoAno = novoAno + 1;
      }
    }

    return new Date(novoAno, novoMes - 1, novoDia, 12, 0, 0);
  }

  /**
   * Calcula Idade Gestacional em semanas e dias entre data DUM e data de referência.
   */
  function calcularIgEntreDatas(dataInicio, dataRef) {
    var dInicio = parseData(dataInicio);
    var dRef = parseData(dataRef) || new Date();
    if (!dInicio) return null;

    var diffMs = dRef.getTime() - dInicio.getTime();
    var diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDias < 0) return null; // data no futuro

    var semanas = Math.floor(diffDias / 7);
    var diasResto = diffDias % 7;

    return {
      totalDias: diffDias,
      semanas: semanas,
      dias: diasResto,
      textoFormatado: semanas + ' semanas e ' + diasResto + ' dias (' + semanas + 's' + diasResto + 'd)'
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. REGRA DE CONCORDÂNCIA FEBRASGO / ACOG PARA FIXAR A IG DEFINITIVA
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Margens máximas de concordância admitidas para considerar a DUM confiável
   * frente a um ultrassom precoce (Diretrizes FEBRASGO e ACOG Committee Opinion nº 700):
   *  - CCN precoce <= 8s6d (<= 62 dias): erro aceitável de ± 5 dias.
   *  - CCN de 9s0d a 13s6d (63 a 97 dias): erro aceitável de ± 7 dias.
   *  - USG de 14s0d a 15s6d (98 a 111 dias): erro aceitável de ± 7 dias.
   *  - USG de 16s0d a 21s6d (112 a 153 dias): erro aceitável de ± 10 dias.
   *  - USG de 22s0d a 27s6d (154 a 195 dias): erro aceitável de ± 14 dias.
   *  - USG >= 28s0d (>= 196 dias): erro aceitável de ± 21 dias.
   */
  function obterMargemErroUsg(diasIgUsg) {
    if (diasIgUsg <= 62) return 5;
    if (diasIgUsg <= 111) return 7;
    if (diasIgUsg <= 153) return 10;
    if (diasIgUsg <= 195) return 14;
    return 21;
  }

  /**
   * Avalia concordância entre DUM e 1º USG conforme FEBRASGO/ACOG:
   * Retorna objeto com método adotado, justificativa, DPP definitiva e IG atual.
   */
  function avaliarConcordanciaDumUsg(params) {
    params = params || {};
    var dataRef = parseData(params.dataRef) || new Date();
    var dataDum = parseData(params.dum);
    var dataUsg = parseData(params.dataUsg);

    // Sem DUM nem USG
    if (!dataDum && !dataUsg) {
      return {
        sucesso: false,
        erro: 'Informe ao menos a data da DUM ou a data do 1º Ultrassom com sua idade gestacional.'
      };
    }

    // Apenas DUM informada
    if (dataDum && !dataUsg) {
      var igDum = calcularIgEntreDatas(dataDum, dataRef);
      if (!igDum) {
        return { sucesso: false, erro: 'A DUM não pode ser uma data futura.' };
      }
      var dppDum = calcularDppNaegele(dataDum);
      var diasRestantesDum = Math.floor((dppDum.getTime() - dataRef.getTime()) / 86400000);
      return {
        sucesso: true,
        metodoAdotado: 'DUM_EXCLUSIVA',
        metodoTexto: 'Idade Gestacional calculada pela DUM (Regra de Naegele)',
        concordante: true,
        dum: formatarDataBr(dataDum),
        dpp: formatarDataBr(dppDum),
        dataDpp: dppDum,
        igAtual: igDum,
        diasAteParto: diasRestantesDum,
        trimestre: classificarTrimestre(igDum.semanas),
        justificativaClinica: 'Data fixada pela DUM informada (sem ultrassom precoce anexado para confronto cronológico).'
      };
    }

    // Se temos USG informado: precisamos da IG na data do USG
    var semanasUsg = Number(params.semanasUsg) || 0;
    var diasUsg = Number(params.diasUsg) || 0;
    
    // Se foi fornecido CCN em mm e não semanas diretamente
    if (params.ccnMm && !semanasUsg && !diasUsg) {
      var ccn = Number(params.ccnMm);
      if (ccn >= 5 && ccn <= 84) {
        // Fórmula de Robinson / Hadlock: IG em dias ≈ 8.052 * sqrt(ccn) + 23.73
        var diasEst = Math.round(8.052 * Math.sqrt(ccn) + 23.73);
        semanasUsg = Math.floor(diasEst / 7);
        diasUsg = diasEst % 7;
      }
    }

    var totalDiasUsgNaData = (semanasUsg * 7) + diasUsg;
    if (totalDiasUsgNaData <= 0) {
      return { sucesso: false, erro: 'Informe as semanas/dias gestacionais ou CCN medidos no 1º ultrassom.' };
    }

    // Calcula projeção da USG até a data de referência atual
    var diffUsgRefMs = dataRef.getTime() - dataUsg.getTime();
    var diffDiasUsgRef = Math.floor(diffUsgRefMs / 86400000);
    if (diffDiasUsgRef < 0) {
      return { sucesso: false, erro: 'A data do ultrassom não pode ser posterior à data atual de referência.' };
    }

    var totalDiasAtuaisPeloUsg = totalDiasUsgNaData + diffDiasUsgRef;
    var igAtualPeloUsg = {
      totalDias: totalDiasAtuaisPeloUsg,
      semanas: Math.floor(totalDiasAtuaisPeloUsg / 7),
      dias: totalDiasAtuaisPeloUsg % 7,
      textoFormatado: Math.floor(totalDiasAtuaisPeloUsg / 7) + ' semanas e ' + (totalDiasAtuaisPeloUsg % 7) + ' dias (' + Math.floor(totalDiasAtuaisPeloUsg / 7) + 's' + (totalDiasAtuaisPeloUsg % 7) + 'd)'
    };

    // DPP pelo USG: 280 dias (40 semanas) a partir da data biológica estimada da DUM
    // Data biológica DUM pelo USG = dataUsg - totalDiasUsgNaData dias
    var dumBiologicaUsgMs = dataUsg.getTime() - (totalDiasUsgNaData * 86400000);
    var dppUsg = new Date(dumBiologicaUsgMs + (280 * 86400000));

    // Apenas USG (sem DUM conhecida ou DUM incerta)
    if (!dataDum) {
      var diasRestantesUsg = Math.floor((dppUsg.getTime() - dataRef.getTime()) / 86400000);
      return {
        sucesso: true,
        metodoAdotado: 'USG_EXCLUSIVA',
        metodoTexto: 'Idade Gestacional fixada pelo 1º Ultrassom (DUM incerta/desconhecida)',
        concordante: true,
        dataUsg: formatarDataBr(dataUsg),
        igNaDataUsg: semanasUsg + 's' + diasUsg + 'd',
        dpp: formatarDataBr(dppUsg),
        dataDpp: dppUsg,
        igAtual: igAtualPeloUsg,
        diasAteParto: diasRestantesUsg,
        trimestre: classificarTrimestre(igAtualPeloUsg.semanas),
        justificativaClinica: 'DUM desconhecida ou incerta. Cronologia oficial e DPP estabelecidas exclusivamente pela biometria ultrassonográfica precoce.'
      };
    }

    // AMBOS INFORMADOS: AVALIAÇÃO DE CONCORDÂNCIA FEBRASGO / ACOG
    // 1. Calcula qual era a IG teórica pela DUM exatamente no dia em que o ultrassom foi feito
    var diffDumAteUsgMs = dataUsg.getTime() - dataDum.getTime();
    var diasDumNaDataUsg = Math.floor(diffDumAteUsgMs / 86400000);

    if (diasDumNaDataUsg < 0) {
      return { sucesso: false, erro: 'A DUM informada não pode ser posterior à data do exame ultrassonográfico.' };
    }

    // Diferença em dias entre DUM e USG no dia do exame
    var diferencaDias = Math.abs(diasDumNaDataUsg - totalDiasUsgNaData);
    var margemAceitavel = obterMargemErroUsg(totalDiasUsgNaData);
    var ehConcordante = diferencaDias <= margemAceitavel;

    var igDumAtual = calcularIgEntreDatas(dataDum, dataRef);
    var dppDum = calcularDppNaegele(dataDum);

    if (ehConcordante) {
      var diasRestantes = Math.floor((dppDum.getTime() - dataRef.getTime()) / 86400000);
      return {
        sucesso: true,
        metodoAdotado: 'DUM_CONFIRMADA_POR_USG',
        metodoTexto: 'DUM Mantida como Cronologia Oficial (Concordante com 1º USG)',
        concordante: true,
        diferencaDias: diferencaDias,
        margemAceitavelDias: margemAceitavel,
        dum: formatarDataBr(dataDum),
        dataUsg: formatarDataBr(dataUsg),
        igNaDataUsg: semanasUsg + 's' + diasUsg + 'd',
        igDumNaDataUsg: Math.floor(diasDumNaDataUsg / 7) + 's' + (diasDumNaDataUsg % 7) + 'd',
        dpp: formatarDataBr(dppDum),
        dataDpp: dppDum,
        igAtual: igDumAtual,
        diasAteParto: diasRestantes,
        trimestre: classificarTrimestre(igDumAtual.semanas),
        justificativaClinica: 'Diferença de ' + diferencaDias + ' dia(s) está dentro da margem aceitável de ±' + margemAceitavel + ' dias (critérios FEBRASGO/ACOG). A DUM é mantida como cronologia oficial definitiva.'
      };
    } else {
      var diasRestantesCorr = Math.floor((dppUsg.getTime() - dataRef.getTime()) / 86400000);
      return {
        sucesso: true,
        metodoAdotado: 'USG_REDATADA_DISCORDANTE',
        metodoTexto: 'Idade Gestacional Redatada pelo 1º USG (DUM Discordante)',
        concordante: false,
        diferencaDias: diferencaDias,
        margemAceitavelDias: margemAceitavel,
        dumInformada: formatarDataBr(dataDum),
        dataUsg: formatarDataBr(dataUsg),
        igNaDataUsg: semanasUsg + 's' + diasUsg + 'd',
        igDumNaDataUsg: Math.floor(diasDumNaDataUsg / 7) + 's' + (diasDumNaDataUsg % 7) + 'd',
        dpp: formatarDataBr(dppUsg),
        dataDpp: dppUsg,
        igAtual: igAtualPeloUsg,
        diasAteParto: diasRestantesCorr,
        trimestre: classificarTrimestre(igAtualPeloUsg.semanas),
        justificativaClinica: 'Diferença de ' + diferencaDias + ' dia(s) ultrapassa o limite aceitável de ±' + margemAceitavel + ' dias. Gestação formalmente redatada pelo ultrassom conforme diretrizes FEBRASGO/ACOG.'
      };
    }
  }

  function classificarTrimestre(semanas) {
    if (semanas < 14) {
      return {
        numero: 1,
        nome: '1º Trimestre',
        faixa: '0 a 13 semanas e 6 dias',
        descricao: 'Fase de embriogênese, rastreio sorológico precoce, dosagem de glicemia de jejum e morfológico de 1º tri.'
      };
    } else if (semanas < 28) {
      return {
        numero: 2,
        nome: '2º Trimestre',
        faixa: '14 semanas a 27 semanas e 6 dias',
        descricao: 'Fase de morfológico anatômico fetal, rastreio de diabetes gestacional (TOTG 75g), vacinação dTpa e profilaxia de pré-eclâmpsia.'
      };
    } else {
      return {
        numero: 3,
        nome: '3º Trimestre',
        faixa: '28 semanas até o parto',
        descricao: 'Fase de repetição de sorologias, swab de GBS (35-37s), vigilância de crescimento e vitalidade fetal (AU/BCF).'
      };
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. AVALIAÇÃO DE GANHO DE PESO GESTACIONAL (IOM 2009 / MINISTÉRIO DA SAÚDE)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Critérios do Institute of Medicine (IOM 2009) adotados pelo Ministério da Saúde:
   *  - Baixo Peso (IMC < 18.5): Ganho total 12.5 a 18.0 kg (0.51 kg/sem no 2º e 3º tri)
   *  - Eutrofia (IMC 18.5 a 24.9): Ganho total 11.5 a 16.0 kg (0.42 kg/sem no 2º e 3º tri)
   *  - Sobrepeso (IMC 25.0 a 29.9): Ganho total 7.0 a 11.5 kg (0.28 kg/sem no 2º e 3º tri)
   *  - Obesidade (IMC >= 30.0): Ganho total 5.0 a 9.0 kg (0.22 kg/sem no 2º e 3º tri)
   */
  var TABELA_GANHO_PESO_IOM = {
    baixo_peso: {
      faixaImc: '< 18.5 kg/m²',
      classificacao: 'Baixo Peso Pré-Gestacional',
      ganhoTotalMin: 12.5,
      ganhoTotalMax: 18.0,
      ganhoSemanal2e3Tri: 0.51,
      ganho1TriMin: 0.5,
      ganho1TriMax: 2.0
    },
    eutrofia: {
      faixaImc: '18.5 a 24.9 kg/m²',
      classificacao: 'Eutrofia Pré-Gestacional',
      ganhoTotalMin: 11.5,
      ganhoTotalMax: 16.0,
      ganhoSemanal2e3Tri: 0.42,
      ganho1TriMin: 0.5,
      ganho1TriMax: 2.0
    },
    sobrepeso: {
      faixaImc: '25.0 a 29.9 kg/m²',
      classificacao: 'Sobrepeso Pré-Gestacional',
      ganhoTotalMin: 7.0,
      ganhoTotalMax: 11.5,
      ganhoSemanal2e3Tri: 0.28,
      ganho1TriMin: 0.5,
      ganho1TriMax: 2.0
    },
    obesidade: {
      faixaImc: '>= 30.0 kg/m²',
      classificacao: 'Obesidade Pré-Gestacional',
      ganhoTotalMin: 5.0,
      ganhoTotalMax: 9.0,
      ganhoSemanal2e3Tri: 0.22,
      ganho1TriMin: 0.5,
      ganho1TriMax: 2.0
    }
  };

  function avaliarGanhoPesoGestacional(params) {
    params = params || {};
    var pesoPre = Number(params.pesoPreGestacional) || Number(params.pesoPre);
    var altura = Number(params.altura); // pode vir em metros ou cm
    var pesoAtual = Number(params.pesoAtual);
    var semanas = Number(params.semanas);

    if (!pesoPre || pesoPre <= 25 || pesoPre >= 250) {
      return { sucesso: false, erro: 'Informe um peso pré-gestacional válido (entre 25 e 250 kg).' };
    }
    if (!altura || altura <= 0) {
      return { sucesso: false, erro: 'Informe uma altura válida.' };
    }
    // Converte cm para m se necessário
    var alturaM = altura > 3 ? altura / 100 : altura;
    if (alturaM < 1.0 || alturaM > 2.2) {
      return { sucesso: false, erro: 'Altura fora da faixa fisiológica (1.00m a 2.20m).' };
    }

    var imcPre = pesoPre / (alturaM * alturaM);
    var categoriaChave = 'eutrofia';
    if (imcPre < 18.5) categoriaChave = 'baixo_peso';
    else if (imcPre < 25.0) categoriaChave = 'eutrofia';
    else if (imcPre < 30.0) categoriaChave = 'sobrepeso';
    else categoriaChave = 'obesidade';

    var ref = TABELA_GANHO_PESO_IOM[categoriaChave];

    // Se temos peso atual e semanas, calculamos o ganho ponderal esperado até a IG atual
    var resultado = {
      sucesso: true,
      pesoPreGestacional: Math.round(pesoPre * 10) / 10,
      alturaM: Math.round(alturaM * 100) / 100,
      imcPreGestacional: Math.round(imcPre * 10) / 10,
      categoriaImc: ref.classificacao,
      faixaImc: ref.faixaImc,
      ganhoTotalRecomendadoMin: ref.ganhoTotalMin,
      ganhoTotalRecomendadoMax: ref.ganhoTotalMax,
      metaGanhoSemanal2e3Tri: ref.ganhoSemanal2e3Tri
    };

    if (pesoAtual && semanas >= 0) {
      var ganhoRealizado = pesoAtual - pesoPre;
      var ganhoEsperadoMin = 0;
      var ganhoEsperadoMax = 0;

      if (semanas <= 13) {
        // 1º Trimestre: ganho linear leve
        var prop1Tri = semanas / 13;
        ganhoEsperadoMin = ref.ganho1TriMin * prop1Tri;
        ganhoEsperadoMax = ref.ganho1TriMax * prop1Tri;
      } else {
        // 2º e 3º Trimestre
        var sem2e3 = semanas - 13;
        ganhoEsperadoMin = ref.ganho1TriMin + (sem2e3 * (ref.ganhoSemanal2e3Tri * 0.8));
        ganhoEsperadoMax = ref.ganho1TriMax + (sem2e3 * (ref.ganhoSemanal2e3Tri * 1.2));
      }

      var statusPonderal = 'GANHO_ADEQUADO';
      var alertaClinico = 'Ganho de peso dentro da faixa esperada para a idade gestacional.';
      if (ganhoRealizado < ganhoEsperadoMin - 0.5) {
        statusPonderal = 'GANHO_INSUFICIENTE';
        alertaClinico = 'Ganho ponderal abaixo do esperado. Rastrear hiperêmese, desnutrição, vulnerabilidade e risco de RCIU (Restrição de Crescimento Intrauterino).';
      } else if (ganhoRealizado > ganhoEsperadoMax + 0.5) {
        statusPonderal = 'GANHO_EXCESSIVO';
        alertaClinico = 'Ganho ponderal acima do recomendado. Risco elevado para Diabetes Gestacional, Pré-Eclâmpsia, Macrossomia fetal e desproporção cefalopélvica.';
      }

      resultado.pesoAtual = Math.round(pesoAtual * 10) / 10;
      resultado.semanasAtual = semanas;
      resultado.ganhoRealizadoKg = Math.round(ganhoRealizado * 10) / 10;
      resultado.ganhoEsperadoMinKg = Math.round(ganhoEsperadoMin * 10) / 10;
      resultado.ganhoEsperadoMaxKg = Math.round(ganhoEsperadoMax * 10) / 10;
      resultado.statusPonderal = statusPonderal;
      resultado.alertaClinico = alertaClinico;
    }

    return resultado;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. PAINEL DE RASTREIO CRONOLÓGICO POR TRIMESTRE (FEBRASGO & MS)
  // ───────────────────────────────────────────────────────────────────────────

  var DIRETRIZES_PRENATAL_POR_TRIMESTRE = {
    1: {
      trimestre: '1º Trimestre (0 a 13 semanas e 6 dias)',
      foco: 'Confirmação da vitalidade, tipagem sanguínea, rastreio sorológico e detecção precoce de DMG.',
      examesObrigatorios: [
        {
          exame: 'Tipagem Sanguínea e Fator Rh',
          finalidade: 'Identificação de incompatibilidade Rh.',
          conduta: 'Se Rh negativo: solicitar Coombs Indireto imediatamente. Se Rh positivo: rotina padrão.'
        },
        {
          exame: 'Coombs Indireto (se Rh negativo)',
          finalidade: 'Rastreio de aloimunização eritrocitária materna.',
          conduta: 'Se negativo: repetir mensalmente a partir de 24-28 semanas. Se positivo com título >= 1:16: encaminhar imediatamente ao Pré-Natal de Alto Risco para Doppler de ACM.'
        },
        {
          exame: 'Glicemia de Jejum',
          finalidade: 'Rastreio precoce de hiperglicemia e DMG.',
          conduta: 'Cortes MS/FEBRASGO: < 92 mg/dL = Normal (realizar TOTG 75g na 24-28s); 92 a 125 mg/dL = Diabetes Gestacional (DMG) confirmado; >= 126 mg/dL = Diabetes Pré-Gestacional (Overt Diabetes).'
        },
        {
          exame: 'Hemograma Completo',
          finalidade: 'Rastreio de anemia fisiológica e plaquetopenia.',
          conduta: 'Hb < 11 g/dL define anemia gestacional. Se Hb 8 a 11 g/dL: iniciar dose terapêutica de Sulfato Ferroso (120 a 200 mg de ferro elementar/dia). Se Hb < 8 g/dL: encaminhar ao Pré-Natal de Alto Risco.'
        },
        {
          exame: 'VDRL / Teste Rápido de Sífilis',
          finalidade: 'Prevenção de sífilis congênita.',
          conduta: 'Se reagente: Penicilina G Benzatina 2,4M UI IM semanal x 3 doses (total 7,2M UI) se latente tardia/indeterminada, ou dose única se primária. Tratar parceiro concomitantemente!'
        },
        {
          exame: 'Anti-HIV (Teste Rápido ou Elisa)',
          finalidade: 'Prevenção de transmissão vertical do HIV.',
          conduta: 'Se positivo: TARV imediata (Dolutegravir + Lamivudina + Tenofovir), contagem de CD4 e Carga Viral. Contraindicação absoluta à amamentação após o parto.'
        },
        {
          exame: 'HBsAg (Hepatite B)',
          finalidade: 'Rastreio de hepatite B crônica e transmissão vertical.',
          conduta: 'Se positivo: encaminhar para profilaxia no RN nas primeiras 12h de vida (Vacina Hepatite B + Imunoglobulina HBIG).'
        },
        {
          exame: 'Sorologia para Toxoplasmose (IgM e IgG)',
          finalidade: 'Rastreio de toxoplasmose congênita.',
          conduta: 'IgG- e IgM- = Suscetível (orientar higiene rigorosa e repetir a cada trimestre). IgG+ e IgM- = Imune. IgM+ = Risco agudo: solicitar Teste de Avidez se < 16s e iniciar Espiramicina 1g VO 8/8h imediatamente.'
        },
        {
          exame: 'Urina Tipo 1 (EAS) e Urocultura com Antibiograma',
          finalidade: 'Rastreio compulsório de Bacteriúria Assintomática.',
          conduta: 'Bacteriúria assintomática (>= 10^5 UFC/mL) SEMPRE deve ser tratada na gestante para prevenir pielonefrite aguda e parto prematuro. Tratar conforme antibiograma por 7 dias.'
        },
        {
          exame: 'TSH (se disponível/rastreio de risco)',
          finalidade: 'Avaliação de função tireoidiana.',
          conduta: 'Manter TSH na meta preconizada do 1º trimestre (ideal < 2.5 mUI/L).'
        },
        {
          exame: 'Ultrassonografia Obstétrica Precoce (11 a 13s6d)',
          finalidade: 'Datação definitiva, morfológico de 1º tri e Translucência Nucal.',
          conduta: 'Avaliação de TN, osso nasal e ducto venoso para cálculo de risco de aneuploidias (trissomias 21, 18, 13).'
        }
      ],
      suplementacoes: [
        'Ácido Fólico: 0,4 mg/dia VO (iniciar preferencialmente no período pré-concepcional e manter até 12-14 semanas) para prevenção de defeitos do tubo neural (DTN).',
        'Ácido Fólico em Alta Dose (4 a 5 mg/dia): indicado se antecedente de filho com DTN, gestante usuária de anticonvulsivantes ou diabetes pré-gestacional.',
        'Sulfato Ferroso: iniciar profilaxia (40 mg de ferro elementar/dia = 200 mg de sulfato ferroso) se gestante não anêmica a partir da 20ª semana.'
      ]
    },
    2: {
      trimestre: '2º Trimestre (14 semanas a 27 semanas e 6 dias)',
      foco: 'Morfologia anatômica fetal, rastreio universal de DMG (TOTG 75g), vacinação materno-fetal e profilaxia de pré-eclâmpsia.',
      examesObrigatorios: [
        {
          exame: 'USG Morfológica de 2º Trimestre (20 a 24 semanas)',
          finalidade: 'Avaliação minuciosa da anatomia fetal e medida do comprimento do colo uterino.',
          conduta: 'Colo uterino curto (< 25 mm na ultrassonografia transvaginal): indicação de Progesterona natural micronizada 200 mg/dia via vaginal à noite para redução de prematuridade extrema.'
        },
        {
          exame: 'TOTG 75g de Glicose (24 a 28 semanas)',
          finalidade: 'Rastreio universal de Diabetes Mellitus Gestacional (DMG).',
          conduta: 'Pontos de corte (IADPSG / FEBRASGO): Jejum >= 92 mg/dL | 1 hora >= 180 mg/dL | 2 horas >= 153 mg/dL. Apenas 1 valor alterado estabelece o diagnóstico de DMG. Iniciar MEV com dieta fracionada e automonitorização glicêmica.'
        },
        {
          exame: 'Coombs Indireto Mensal (se Rh negativo e Coombs prévio negativo)',
          finalidade: 'Vigilância contínua contra aloimunização Rh.',
          conduta: 'Se mantiver Coombs indireto negativo: realizar imunoprofilaxia com Imunoglobulina Anti-D 300 mcg IM na 28ª semana de gestação.'
        }
      ],
      profilaxiaPreEclampsia: {
        indicacao: 'Gestantes com alto risco para Pré-Eclâmpsia (histórico prévio de PE, hipertensão arterial crônica, doença renal crônica, diabetes mellitus tipo 1 ou 2, lúpus/SAF).',
        esquemaRecomendado: 'AAS 100 a 150 mg/dia VO à noite (ideal iniciar antes de 16 semanas, manter até 36 semanas) + Carbonato de Cálcio 1000 a 1500 mg de cálcio elementar/dia se baixa ingestão alimentar láctea.'
      },
      vacinacaoGestante: [
        'dTpa (Tríplice bacteriana acelular): 1 dose a cada gestação a partir de 20 semanas (ideal entre 27 e 36 semanas) para transferência passiva de anticorpos contra coqueluche ao recém-nascido.',
        'Hepatite B: 3 doses se suscetível ou esquema vacinal incompleto (0, 1 e 6 meses).',
        'Influenza: 1 dose anual durante qualquer fase da gravidez.',
        'Covid-19: doses e reforços conforme calendário do PNI.'
      ]
    },
    3: {
      trimestre: '3º Trimestre (28 semanas até o parto)',
      foco: 'Repetição do painel sorológico, rastreio de Streptococcus agalactiae (GBS) e acompanhamento rigoroso do crescimento/vitalidade fetal.',
      examesObrigatorios: [
        {
          exame: 'Repetição Sorológica de 3º Trimestre (em torno de 30-32 semanas)',
          finalidade: 'Detecção de soroconversão tardia.',
          conduta: 'Repetir VDRL/Teste rápido de sífilis, Anti-HIV, HBsAg, Sorologia de Toxoplasmose (se IgG negativo prévio), Hemograma completo e Glicemia de jejum.'
        },
        {
          exame: 'EAS e Urocultura de 3º Trimestre',
          finalidade: 'Prevenção de pielonefrite e trabalho de parto prematuro.',
          conduta: 'Tratar qualquer bacteriúria confirmada com antibiograma.'
        },
        {
          exame: 'Swab Anovaginal para Streptococcus agalactiae / GBS (35 a 37 semanas)',
          finalidade: 'Prevenção de sepse neonatal precoce por Estreptococo do Grupo B.',
          conduta: 'Coleta combinada no terço inferior da vagina e no reto. Se cultura POSITIVA (ou bacteriúria por GBS na gestação atual, ou RN prévio com sepse por GBS): PROFILAXIA INTRAPARTO OBRIGATÓRIA com Penicilina Cristalina 5M UI ataque + 2,5M UI 4/4h até o parto (ou Ampicilina 2g ataque + 1g 4/4h).'
        }
      ],
      vigilanciaFetalBeiraLeito: [
        'Altura Uterina (AU): correlação aproximada com a IG entre 20 e 34 semanas (± 2 cm). Plotar na curva de AU do Cartão da Gestante. Se AU < p10 (suspeita de RCIU/oligoâmnio) ou > p90 (suspeita de macrossomia/polidrâmnio): solicitar USG obstétrica com Doppler.',
        'Batimentos Cardiofetais (BCF): normal entre 110 e 160 bpm com ritmo regular.',
        'Mobilograma Fetal: mãe atenta aos movimentos fetais (mínimo de 6 a 10 movimentos em 1 a 2 horas após refeições no 3º trimestre).'
      ]
    }
  };

  function obterDiretrizesTrimestre(trimestreNum) {
    var num = parseInt(trimestreNum, 10);
    if (num < 1 || num > 3) num = 1;
    return DIRETRIZES_PRENATAL_POR_TRIMESTRE[num];
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. VALIDADOR FARMACOLÓGICO NA GESTAÇÃO & LACTAÇÃO
  // ───────────────────────────────────────────────────────────────────────────

  var BANCO_FARMACOS_GESTACAO = {
    // ANTI-HIPERTENSIVOS
    enalapril: {
      nome: 'Enalapril',
      classe: 'IECA (Inibidor da ECA)',
      categoriaFda: 'D',
      segurancaGestacao: 'CONTRAINDICADO',
      segurancaLactacao: 'COMPATÍVEL',
      alertas: [
        '⛔ CONTRAINDICAÇÃO FORMAL NA GESTAÇÃO.',
        'Fetopatia por IECA: disgenesia renal fetal, anúria neonatal, oligoidrâmnio grave, hipoplasia pulmonar e defeitos de ossificação craniana.',
        'Deve ser suspenso imediatamente no planejamento gestacional ou na suspeita de gravidez.'
      ],
      alternativasRecomendadas: ['Metildopa 250 a 500mg VO 8/8h ou 12/12h', 'Nifedipino de liberação prolongada 20 a 60mg/dia VO', 'Hidralazina 25 a 50mg VO 8/8h']
    },
    captopril: {
      nome: 'Captopril',
      classe: 'IECA',
      categoriaFda: 'D',
      segurancaGestacao: 'CONTRAINDICADO',
      segurancaLactacao: 'COMPATÍVEL',
      alertas: [
        '⛔ CONTRAINDICAÇÃO ABSOLUTA NA GESTAÇÃO.',
        'Risco de falência renal neonatal, oligohidrâmnio e morte fetal intrauterina.'
      ],
      alternativasRecomendadas: ['Metildopa', 'Nifedipino retard', 'Hidralazina']
    },
    losartana: {
      nome: 'Losartana',
      classe: 'BRA (Bloqueador do Receptor de Angiotensina)',
      categoriaFda: 'D',
      segurancaGestacao: 'CONTRAINDICADO',
      segurancaLactacao: 'EVITAR',
      alertas: [
        '⛔ CONTRAINDICAÇÃO FORMAL E ABSOLUTA NA GESTAÇÃO.',
        'Mesmo mecanismo tóxico dos IECAs: disgenesia renal tubular fetal, anúria, malformações renais e cranianas graves.'
      ],
      alternativasRecomendadas: ['Metildopa', 'Nifedipino de liberação prolongada']
    },
    valsartana: {
      nome: 'Valsartana',
      classe: 'BRA',
      categoriaFda: 'D',
      segurancaGestacao: 'CONTRAINDICADO',
      segurancaLactacao: 'EVITAR',
      alertas: ['⛔ CONTRAINDICADO NA GESTAÇÃO por nefrotoxicidade e teratogênese fetal.'],
      alternativasRecomendadas: ['Metildopa', 'Nifedipino']
    },
    metildopa: {
      nome: 'Metildopa',
      classe: 'Anti-hipertensivo de Ação Central',
      categoriaFda: 'B',
      segurancaGestacao: 'SEGURO',
      segurancaLactacao: 'COMPATÍVEL',
      alertas: [
        '✅ FÁRMACO DE 1ª ESCOLHA CONSAGRADO NA GESTAÇÃO (FEBRASGO / MS).',
        'Posologia habitual: 250 a 500 mg VO a cada 8 a 12 horas (dose máxima 2000 mg/dia).',
        'Excelente perfil de segurança a longo prazo para o desenvolvimento fetal.'
      ],
      alternativasRecomendadas: ['Nifedipino retard se intolerância ou sonolência']
    },
    nifedipino: {
      nome: 'Nifedipino',
      classe: 'Bloqueador dos Canais de Cálcio (Dihidropiridínico)',
      categoriaFda: 'C',
      segurancaGestacao: 'SEGURO',
      segurancaLactacao: 'COMPATÍVEL',
      alertas: [
        '✅ SEGURO E EFICAZ NA GESTAÇÃO (preferir formulações de liberação lenta/retard 20 a 60 mg/dia).',
        'Também utilizado como tocolítico de 1ª linha no trabalho de parto prematuro.',
        'Evitar formulações de ação rápida sublingual pelo risco de hipotensão brusca e hipofluxo uteroplacentário.'
      ],
      alternativasRecomendadas: ['Metildopa']
    },
    hidralazina: {
      nome: 'Hidralazina',
      classe: 'Vasodilatador Direto',
      categoriaFda: 'C',
      segurancaGestacao: 'SEGURO',
      segurancaLactacao: 'COMPATÍVEL',
      alertas: [
        '✅ Fármaco de resgate de 1ª linha nas emergências hipertensivas gestacionais (5 mg IV a cada 20 min).',
        'Pode ser utilizado por via oral em associação no controle crônico ambulatorial.'
      ],
      alternativasRecomendadas: ['Metildopa', 'Nifedipino']
    },
    atenolol: {
      nome: 'Atenolol',
      classe: 'Betabloqueador',
      categoriaFda: 'D',
      segurancaGestacao: 'EVITAR',
      segurancaLactacao: 'EVITAR',
      alertas: [
        '⚠️ Risco significativo de Restrição de Crescimento Intrauterino (RCIU) e baixo peso fetal.',
        'Se betabloqueador for estritamente mandatório (ex: arritmia, tireotoxicose), preferir Labetalol, Pindolol ou Metoprolol.'
      ],
      alternativasRecomendadas: ['Metildopa', 'Nifedipino']
    },

    // ESTATINAS E HIPOLIPEMIANTES
    sinvastatina: {
      nome: 'Sinvastatina',
      classe: 'Estatina',
      categoriaFda: 'X',
      segurancaGestacao: 'CONTRAINDICADO',
      segurancaLactacao: 'CONTRAINDICADO',
      alertas: [
        '⛔ CONTRAINDICAÇÃO ABSOLUTA (CATEGORIA X).',
        'O colesterol é substrato biológico indispensável para a síntese hormonal e esteroidogênese no desenvolvimento embrionário.',
        'Suspender imediatamente em mulheres com intenção reprodutiva ou grávidas.'
      ],
      alternativasRecomendadas: ['Manejo dietético exclusivo durante a gestação', 'Se hipercolesterolemia familiar grave refratária: resinas sequestradoras como Colestiramina']
    },
    atorvastatina: {
      nome: 'Atorvastatina',
      classe: 'Estatina',
      categoriaFda: 'X',
      segurancaGestacao: 'CONTRAINDICADO',
      segurancaLactacao: 'CONTRAINDICADO',
      alertas: ['⛔ CONTRAINDICAÇÃO ABSOLUTA NA GRAVIDEZ E AMAMENTAÇÃO.'],
      alternativasRecomendadas: ['Interrupção durante gravidez e lactação']
    },
    rosuvastatina: {
      nome: 'Rosuvastatina',
      classe: 'Estatina',
      categoriaFda: 'X',
      segurancaGestacao: 'CONTRAINDICADO',
      segurancaLactacao: 'CONTRAINDICADO',
      alertas: ['⛔ CONTRAINDICAÇÃO ABSOLUTA NA GRAVIDEZ.'],
      alternativasRecomendadas: ['Interrupção durante a gravidez']
    },

    // ANTIBIÓTICOS E ANTIMICROBIANOS
    doxiciclina: {
      nome: 'Doxiciclina',
      classe: 'Tetraciclina',
      categoriaFda: 'D',
      segurancaGestacao: 'CONTRAINDICADO',
      segurancaLactacao: 'EVITAR',
      alertas: [
        '⛔ CONTRAINDICADO A PARTIR DA 14ª SEMANA.',
        'Deposição irreversível nos tecidos ósseos e dentários fetais com descoloração amarela-acastanhada e hipoplasia do esmalte dentário permanente.',
        'Inibição reversível do crescimento da fíbula fetal.'
      ],
      alternativasRecomendadas: ['Amoxicilina', 'Azitromicina', 'Ceftriaxona']
    },
    tetraciclina: {
      nome: 'Tetraciclina',
      classe: 'Tetraciclina',
      categoriaFda: 'D',
      segurancaGestacao: 'CONTRAINDICADO',
      segurancaLactacao: 'EVITAR',
      alertas: ['⛔ Pigmentação dentária fetal e hepatotoxicidade materna.'],
      alternativasRecomendadas: ['Amoxicilina', 'Cefalexina']
    },
    amoxicilina: {
      nome: 'Amoxicilina',
      classe: 'Aminopenicilina',
      categoriaFda: 'B',
      segurancaGestacao: 'SEGURO',
      segurancaLactacao: 'COMPATÍVEL',
      alertas: [
        '✅ FÁRMACO DE 1ª ESCOLHA SEGURO EM TODOS OS TRIMESTRES.',
        'Utilizado para infecções de vias aéreas, ITU e profilaxias.'
      ],
      alternativasRecomendadas: ['Cefalexina', 'Azitromicina']
    },
    cefalexina: {
      nome: 'Cefalexina',
      classe: 'Cefalosporina de 1ª Geração',
      categoriaFda: 'B',
      segurancaGestacao: 'SEGURO',
      segurancaLactacao: 'COMPATÍVEL',
      alertas: [
        '✅ EXCELENTE PERFIL DE SEGURANÇA EM TODOS OS TRIMESTRES.',
        'Muito utilizada no tratamento de bacteriúria assintomática e cistite na gestante.'
      ],
      alternativasRecomendadas: ['Amoxicilina', 'Fosfomicina']
    },
    ceftriaxona: {
      nome: 'Ceftriaxona',
      classe: 'Cefalosporina de 3ª Geração',
      categoriaFda: 'B',
      segurancaGestacao: 'SEGURO',
      segurancaLactacao: 'COMPATÍVEL',
      alertas: ['✅ Segura na gestação para infecções graves e pielonefrite aguda.'],
      alternativasRecomendadas: ['Cefepima', 'Ampicilina']
    },
    azitromicina: {
      nome: 'Azitromicina',
      classe: 'Macrolídeo',
      categoriaFda: 'B',
      segurancaGestacao: 'SEGURO',
      segurancaLactacao: 'COMPATÍVEL',
      alertas: [
        '✅ Segura na gestação (tratamento de clamídia, infecções respiratórias e opção em alérgicas a betalactâmicos).'
      ],
      alternativasRecomendadas: ['Amoxicilina', 'Eritromicina']
    },
    nitrofurantoina: {
      nome: 'Nitrofurantoína',
      classe: 'Nitrofurano',
      categoriaFda: 'B',
      segurancaGestacao: 'CAUTELA',
      segurancaLactacao: 'COMPATÍVEL',
      alertas: [
        '⚠️ SEGURA NO 1º E 2º TRIMESTRES.',
        '⛔ CONTRAINDICADA A PARTIR DE 36 SEMANAS ou no trabalho de parto imediato devido ao risco teórico de anemia hemolítica neonatal por imaturidade enzimática eritrocitária (G6PD).'
      ],
      alternativasRecomendadas: ['Cefalexina 500mg 6/6h', 'Fosfomicina 3g dose única']
    },
    fosfomicina: {
      nome: 'Fosfomicina Trometamol',
      classe: 'Derivado do Ácido Fosfônico',
      categoriaFda: 'B',
      segurancaGestacao: 'SEGURO',
      segurancaLactacao: 'COMPATÍVEL',
      alertas: [
        '✅ ALTAMENTE SEGURA E CONVENIENTE PARA ITU NA GRAVIDEZ.',
        'Posologia: 3g em dose única diluída em água. Alta taxa de erradicação para E. coli e boa adesão.'
      ],
      alternativasRecomendadas: ['Cefalexina', 'Amoxicilina+Clavulanato']
    },
    ciprofloxacino: {
      nome: 'Ciprofloxacino',
      classe: 'Quinolona',
      categoriaFda: 'C',
      segurancaGestacao: 'EVITAR',
      segurancaLactacao: 'EVITAR',
      alertas: [
        '⚠️ Risco de artropatia e lesão irreversível de cartilagens de crescimento em estudos experimentais.',
        'Evitar uso empírico na gestante; reservar estritamente para situações sem alternativas terapêuticas.'
      ],
      alternativasRecomendadas: ['Ceftriaxona', 'Cefepima', 'Meropenem']
    },

    // ANALGÉSICOS E ANTI-INFLAMATÓRIOS
    paracetamol: {
      nome: 'Paracetamol',
      classe: 'Analgésico e Antitérmico',
      categoriaFda: 'B',
      segurancaGestacao: 'SEGURO',
      segurancaLactacao: 'COMPATÍVEL',
      alertas: [
        '✅ ANALGÉSICO E ANTITÉRMICO DE 1ª ESCOLHA EM TODA A GESTAÇÃO.',
        'Dose recomendada: 500 a 750 mg VO a cada 6 a 8 horas (máximo 2 a 3 g/dia).',
        'Excelente perfil de tolerabilidade fetal e materna.'
      ],
      alternativasRecomendadas: ['Dipirona (sob cautela)']
    },
    dipirona: {
      nome: 'Dipirona',
      classe: 'Analgésico e Antipirético',
      categoriaFda: 'C',
      segurancaGestacao: 'CAUTELA',
      segurancaLactacao: 'COMPATÍVEL',
      alertas: [
        '⚠️ Uso aceitável no 1º e 2º trimestres em doses pontuais quando o paracetamol for insuficiente.',
        '⛔ Evitar no 3º trimestre devido ao risco teórico compartilhado de constrição do ductus arteriosus fetal.'
      ],
      alternativasRecomendadas: ['Paracetamol']
    },
    ibuprofeno: {
      nome: 'Ibuprofeno',
      classe: 'AINE (Anti-inflamatório Não Esteroidal)',
      categoriaFda: 'C/D',
      segurancaGestacao: 'CONTRAINDICADO',
      segurancaLactacao: 'COMPATÍVEL',
      alertas: [
        '⛔ CONTRAINDICADO FORMALMENTE NO 3º TRIMESTRE (A PARTIR DE 28-30 SEMANAS).',
        'Risco de fechamento prematuro do canal arterial (ductus arteriosus), hipertensão pulmonar persistente do recém-nascido e oligoidrâmnio por redução da perfusão renal fetal.',
        'No 1º e 2º trimestre: usar apenas com indicação formal e pelo menor tempo possível.'
      ],
      alternativasRecomendadas: ['Paracetamol (primeira escolha para dor e febre)']
    },
    diclofenaco: {
      nome: 'Diclofenaco',
      classe: 'AINE',
      categoriaFda: 'C/D',
      segurancaGestacao: 'CONTRAINDICADO',
      segurancaLactacao: 'COMPATÍVEL',
      alertas: [
        '⛔ CONTRAINDICADO NO 3º TRIMESTRE.',
        'Fechamento precoce do canal arterial, oligoidrâmnio e prolongamento do trabalho de parto.'
      ],
      alternativasRecomendadas: ['Paracetamol']
    },
    cetoprofeno: {
      nome: 'Cetoprofeno',
      classe: 'AINE',
      categoriaFda: 'C/D',
      segurancaGestacao: 'CONTRAINDICADO',
      segurancaLactacao: 'COMPATÍVEL',
      alertas: ['⛔ CONTRAINDICADO NO 3º TRIMESTRE por constrição do ducto arterioso.'],
      alternativasRecomendadas: ['Paracetamol']
    },
    nimesulida: {
      nome: 'Nimesulida',
      classe: 'AINE',
      categoriaFda: 'D',
      segurancaGestacao: 'CONTRAINDICADO',
      segurancaLactacao: 'EVITAR',
      alertas: ['⛔ CONTRAINDICADO NA GESTAÇÃO (risco de anúria fetal, oligoidrâmnio e hepatotoxicidade).'],
      alternativasRecomendadas: ['Paracetamol']
    },

    // ANTICOAGULANTES
    varfarina: {
      nome: 'Varfarina',
      classe: 'Antagonista da Vitamina K',
      categoriaFda: 'X',
      segurancaGestacao: 'CONTRAINDICADO',
      segurancaLactacao: 'COMPATÍVEL',
      alertas: [
        '⛔ CONTRAINDICAÇÃO FORMAL (EXCETO CASOS RAROS DE PRÓTESE VALVAR MECÂNICA SOB PROTOCOLO ESTRITO).',
        'Síndrome Varfarínica Fetal (6ª a 12ª semanas): hipoplasia nasal, condrodisplasia pontilhada, atrofia óptica e microcefalia.',
        'Risco hemorrágico fetal no 2º e 3º trimestres.'
      ],
      alternativasRecomendadas: ['Enoxaparina (Heparina de Baixo Peso Molecular)', 'Heparina Não Fracionada (HNF)']
    },
    enoxaparina: {
      nome: 'Enoxaparina',
      classe: 'HBPM (Heparina de Baixo Peso Molecular)',
      categoriaFda: 'B',
      segurancaGestacao: 'SEGURO',
      segurancaLactacao: 'COMPATÍVEL',
      alertas: [
        '✅ ANTICOAGULANTE DE ESCOLHA NA GRAVIDEZ E PUERPÉRIO.',
        'Não atravessa a barreira placentária. Não causa teratogênese.'
      ],
      alternativasRecomendadas: ['Heparina Não Fracionada']
    },

    // TERATÓGENOS CLÁSSICOS MAIORES
    metotrexato: {
      nome: 'Metotrexato',
      classe: 'Antimetabólito / Antagonista do Ácido Fólico',
      categoriaFda: 'X',
      segurancaGestacao: 'CONTRAINDICADO',
      segurancaLactacao: 'CONTRAINDICADO',
      alertas: [
        '⛔ TERATÓGENO MAIOR GRAVE (CATEGORIA X).',
        'Síndrome aminopterina/metotrexato: cranioestenose, fenda palatina, hipoplasia mandibular, defeitos cardíacos e morte fetal.'
      ],
      alternativasRecomendadas: ['Suspender pelo menos 3 a 6 meses antes da concepção']
    },
    isotretinoina: {
      nome: 'Isotretinoína',
      classe: 'Retinoide Sistêmico',
      categoriaFda: 'X',
      segurancaGestacao: 'CONTRAINDICADO',
      segurancaLactacao: 'CONTRAINDICADO',
      alertas: [
        '⛔ EMBRIOPATIA POR RETINOIDE GRAVE (CATEGORIA X).',
        'Anotia/microtia (ausência de orelhas), anomalias do SNC (hidrocefalia), malformações conotruncais cardíacas e timo ausente.',
        'Exige termo de consentimento e teste de gravidez mensal negativo.'
      ],
      alternativasRecomendadas: ['Tratamentos tópicos seguros orientados pelo dermatologista']
    },
    acido_valproico: {
      nome: 'Ácido Valproico / Valproato de Sódio',
      classe: 'Anticonvulsivante / Estabilizador de Humor',
      categoriaFda: 'X',
      segurancaGestacao: 'CONTRAINDICADO',
      segurancaLactacao: 'COMPATÍVEL',
      alertas: [
        '⛔ ALTO RISCO DE DEFEITOS DO TUBO NEURAL (1 a 2% de espinha bífida).',
        'Fenda facial, anomalias cardíacas, hipospádia e risco documentado de déficit de QI e espectro autista na criança.',
        'Se gravidez não planejada em uso do fármaco: prescrever imediatamente Ácido Fólico 5 mg/dia e encaminhar à Neurologia.'
      ],
      alternativasRecomendadas: ['Lamotrigina', 'Levetiracetam']
    },
    litio: {
      nome: 'Carbonato de Lítio',
      classe: 'Estabilizador de Humor',
      categoriaFda: 'D',
      segurancaGestacao: 'CAUTELA',
      segurancaLactacao: 'EVITAR',
      alertas: [
        '⚠️ Risco aumentado de Anomalia de Ebstein cardíaca (deslocamento apical da valva tricúspide) no 1º trimestre.',
        'Exige ecocardiograma fetal detalhado com 20-22 semanas e dosagem sérica frequente de litiemia.'
      ],
      alternativasRecomendadas: ['Lamotrigina', 'Antipsicóticos atípicos (sob condução psiquiátrica)']
    },

    // ANTIEMÉTICOS E SISTEMA DIGESTÓRIO
    ondansetrona: {
      nome: 'Ondansetrona',
      classe: 'Antagonista 5-HT3',
      categoriaFda: 'B',
      segurancaGestacao: 'SEGURO',
      segurancaLactacao: 'COMPATÍVEL',
      alertas: [
        '✅ Muito eficaz em hiperêmese gravídica refratária.',
        'Pode ser utilizada com segurança especialmente a partir de 10 semanas de gestação.'
      ],
      alternativasRecomendadas: ['Dimenidrinato', 'Metoclopramida', 'Piridoxina (Vitamina B6)']
    },
    dimenidrinato: {
      nome: 'Dimenidrinato',
      classe: 'Anti-histamínico H1 com Anticolinérgico',
      categoriaFda: 'B',
      segurancaGestacao: 'SEGURO',
      segurancaLactacao: 'COMPATÍVEL',
      alertas: ['✅ Seguro para náuseas e vômitos da gravidez (1ª linha com piridoxina).'],
      alternativasRecomendadas: ['Piridoxina', 'Metoclopramida']
    },
    metoclopramida: {
      nome: 'Metoclopramida',
      classe: 'Antagonista Dopaminérgico / Procinético',
      categoriaFda: 'B',
      segurancaGestacao: 'SEGURO',
      segurancaLactacao: 'COMPATÍVEL',
      alertas: ['✅ Seguro para queixas dispépticas e náuseas na gestante.'],
      alternativasRecomendadas: ['Dimenidrinato']
    },
    omeprazol: {
      nome: 'Omeprazol',
      classe: 'Inibidor de Bomba de Prótons (IBP)',
      categoriaFda: 'C',
      segurancaGestacao: 'SEGURO',
      segurancaLactacao: 'COMPATÍVEL',
      alertas: [
        '✅ Fármaco de escolha seguro para pirose e DRGE gestacional não responsiva a antiácidos.'
      ],
      alternativasRecomendadas: ['Hidróxido de Alumínio / Magnésio', 'Ranitidina/Famotidina']
    }
  };

  /**
   * Valida um medicamento específico na gestação e lactação.
   */
  function validarMedicamentoGestacao(nomeMedicamento, trimestreNum) {
    if (!nomeMedicamento || typeof nomeMedicamento !== 'string') {
      return { sucesso: false, erro: 'Informe o nome do medicamento.' };
    }

    var termo = nomeMedicamento.trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    var encontrado = null;
    var chaves = Object.keys(BANCO_FARMACOS_GESTACAO);

    // Busca exata ou por prefixo/inclusão
    for (var i = 0; i < chaves.length; i++) {
      var k = chaves[i];
      if (termo === k || termo.indexOf(k) !== -1 || k.indexOf(termo) !== -1) {
        encontrado = BANCO_FARMACOS_GESTACAO[k];
        break;
      }
    }

    if (!encontrado) {
      return {
        sucesso: false,
        medicamentoBuscado: nomeMedicamento,
        mensagem: 'Medicamento não catalogado diretamente na base prioritária gestacional. Consulte a tabela FDA e bula especializada antes da prescrição.'
      };
    }

    var tri = parseInt(trimestreNum, 10) || null;
    var alertasFinais = encontrado.alertas.slice();

    // Se estiver no 3º tri e for AINE, enfatiza fechamento de canal arterial
    if (tri === 3 && (encontrado.classe.indexOf('AINE') !== -1 || encontrado.nome === 'Dipirona')) {
      alertasFinais.unshift('🚨 ATENÇÃO MÁXIMA NO 3º TRIMESTRE: Alto risco de fechamento prematuro do canal arterial (ductus arteriosus) e oligoidrâmnio!');
    }

    return {
      sucesso: true,
      medicamento: encontrado.nome,
      classe: encontrado.classe,
      categoriaFda: encontrado.categoriaFda,
      segurancaGestacao: encontrado.segurancaGestacao,
      segurancaLactacao: encontrado.segurancaLactacao,
      alertas: alertasFinais,
      alternativasRecomendadas: encontrado.alternativasRecomendadas
    };
  }

  /**
   * Valida uma lista ou texto de medicamentos em busca de potenciais riscos gestacionais.
   */
  function auditarPrescricaoGestante(textoOuLista, trimestreNum) {
    var itens = [];
    if (Array.isArray(textoOuLista)) {
      itens = textoOuLista;
    } else if (typeof textoOuLista === 'string') {
      itens = textoOuLista.split(/[\n,;+]+/).map(function(s) { return s.trim(); }).filter(Boolean);
    }

    var resultados = [];
    var contraindicados = [];
    var cautela = [];
    var seguros = [];

    for (var i = 0; i < itens.length; i++) {
      var medStr = itens[i];
      var checagem = validarMedicamentoGestacao(medStr, trimestreNum);
      if (checagem.sucesso) {
        resultados.push(checagem);
        if (checagem.segurancaGestacao === 'CONTRAINDICADO') {
          contraindicados.push(checagem);
        } else if (checagem.segurancaGestacao === 'CAUTELA' || checagem.segurancaGestacao === 'EVITAR') {
          cautela.push(checagem);
        } else {
          seguros.push(checagem);
        }
      }
    }

    var parecerGeral = 'SEGURO';
    if (contraindicados.length > 0) parecerGeral = 'CONTRAINDICADO';
    else if (cautela.length > 0) parecerGeral = 'CAUTELA';

    return {
      sucesso: true,
      parecerGeral: parecerGeral,
      totalAvaliados: resultados.length,
      contraindicados: contraindicados,
      cautela: cautela,
      seguros: seguros,
      detalhes: resultados
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 7. RELATÓRIO AMBULATORIAL COMPLETO DE PRÉ-NATAL
  // ───────────────────────────────────────────────────────────────────────────

  function gerarResumoConsultaPrenatal(dados) {
    dados = dados || {};
    var avaliacaoIg = avaliarConcordanciaDumUsg(dados);
    if (!avaliacaoIg.sucesso) {
      return { sucesso: false, erro: avaliacaoIg.erro };
    }

    var ganhoPeso = null;
    if (dados.pesoPreGestacional || dados.pesoPre) {
      ganhoPeso = avaliarGanhoPesoGestacional({
        pesoPreGestacional: dados.pesoPreGestacional || dados.pesoPre,
        altura: dados.altura,
        pesoAtual: dados.pesoAtual,
        semanas: avaliacaoIg.igAtual.semanas
      });
    }

    var diretrizesTrimestre = obterDiretrizesTrimestre(avaliacaoIg.trimestre.numero);

    var auditoriaFarmacos = null;
    if (dados.medicamentosUso) {
      auditoriaFarmacos = auditarPrescricaoGestante(dados.medicamentosUso, avaliacaoIg.trimestre.numero);
    }

    // Monta texto formatado pronto para prontuário/Cartão da Gestante
    var linhas = [
      '======================================================================',
      '        CONSULTA DE PRÉ-NATAL · AVALIAÇÃO OBSTÉTRICA AMBULATORIAL      ',
      '======================================================================',
      'Paciente: ' + (dados.paciente || 'Gestante') + ' | Data: ' + (dados.dataConsulta || formatarDataBr(new Date())),
      'Método Cronológico: ' + avaliacaoIg.metodoTexto,
      '----------------------------------------------------------------------',
      'CRONOLOGIA OBSTÉTRICA:',
      '• Idade Gestacional Atual: ' + avaliacaoIg.igAtual.textoFormatado,
      '• Data Provável do Parto (DPP): ' + avaliacaoIg.dpp + ' (faltam ' + avaliacaoIg.diasAteParto + ' dias)',
      '• Trimestre Atual: ' + avaliacaoIg.trimestre.nome + ' (' + avaliacaoIg.trimestre.faixa + ')',
      '• Justificativa Técnica: ' + avaliacaoIg.justificativaClinica
    ];

    if (dados.dum) {
      linhas.push('• DUM Informada: ' + formatarDataBr(parseData(dados.dum)));
    }
    if (dados.dataUsg) {
      linhas.push('• 1º USG: ' + formatarDataBr(parseData(dados.dataUsg)) + ' com IG de ' + (dados.semanasUsg || '') + 's' + (dados.diasUsg || '') + 'd');
    }

    if (ganhoPeso && ganhoPeso.sucesso) {
      linhas.push('----------------------------------------------------------------------');
      linhas.push('ESTADO NUTRICIONAL E GANHO PONDERAL (IOM / MS):');
      linhas.push('• IMC Pré-Gestacional: ' + ganhoPeso.imcPreGestacional + ' kg/m² (' + ganhoPeso.categoriaImc + ')');
      linhas.push('• Ganho Ponderal Total Recomendado: ' + ganhoPeso.ganhoTotalRecomendadoMin + ' a ' + ganhoPeso.ganhoTotalRecomendadoMax + ' kg');
      if (ganhoPeso.pesoAtual) {
        linhas.push('• Peso Atual: ' + ganhoPeso.pesoAtual + ' kg (Variação acumulada: ' + (ganhoPeso.ganhoRealizadoKg >= 0 ? '+' : '') + ganhoPeso.ganhoRealizadoKg + ' kg)');
        linhas.push('• Faixa Esperada para ' + ganhoPeso.semanasAtual + ' semanas: ' + ganhoPeso.ganhoEsperadoMinKg + ' a ' + ganhoPeso.ganhoEsperadoMaxKg + ' kg');
        linhas.push('• Avaliação: [' + ganhoPeso.statusPonderal + '] ' + ganhoPeso.alertaClinico);
      }
    }

    linhas.push('----------------------------------------------------------------------');
    linhas.push('CONDUTAS E EXAMES DO ' + avaliacaoIg.trimestre.nome.toUpperCase() + ':');
    for (var i = 0; i < diretrizesTrimestre.examesObrigatorios.length; i++) {
      var ex = diretrizesTrimestre.examesObrigatorios[i];
      linhas.push('• ' + ex.exame + ': ' + ex.conduta);
    }

    if (diretrizesTrimestre.suplementacoes) {
      linhas.push('SUPLEMENTAÇÕES INDICADAS:');
      for (var s = 0; s < diretrizesTrimestre.suplementacoes.length; s++) {
        linhas.push('• ' + diretrizesTrimestre.suplementacoes[s]);
      }
    }

    if (diretrizesTrimestre.profilaxiaPreEclampsia) {
      linhas.push('RASTREIO DE PRÉ-ECLÂMPSIA (SE ALTO RISCO):');
      linhas.push('• Indicação: ' + diretrizesTrimestre.profilaxiaPreEclampsia.indicacao);
      linhas.push('• Esquema: ' + diretrizesTrimestre.profilaxiaPreEclampsia.esquemaRecomendado);
    }

    if (diretrizesTrimestre.vacinacaoGestante) {
      linhas.push('IMUNIZAÇÃO GESTACIONAL:');
      for (var v = 0; v < diretrizesTrimestre.vacinacaoGestante.length; v++) {
        linhas.push('• ' + diretrizesTrimestre.vacinacaoGestante[v]);
      }
    }

    if (auditoriaFarmacos && auditoriaFarmacos.sucesso && auditoriaFarmacos.totalAvaliados > 0) {
      linhas.push('----------------------------------------------------------------------');
      linhas.push('AUDITORIA DE SEGURANÇA FARMACOLÓGICA: Parecer Geral = ' + auditoriaFarmacos.parecerGeral);
      if (auditoriaFarmacos.contraindicados.length > 0) {
        linhas.push('⛔ FÁRMACOS CONTRAINDICADOS DETECTADOS:');
        for (var c = 0; c < auditoriaFarmacos.contraindicados.length; c++) {
          var ci = auditoriaFarmacos.contraindicados[c];
          linhas.push('  - ' + ci.medicamento + ' (' + ci.classe + ' / Cat. ' + ci.categoriaFda + '): ' + ci.alertas[0]);
          linhas.push('    -> Alternativas: ' + ci.alternativasRecomendadas.join('; '));
        }
      }
      if (auditoriaFarmacos.cautela.length > 0) {
        linhas.push('⚠️ FÁRMACOS COM ALERTA DE CAUTELA:');
        for (var ct = 0; ct < auditoriaFarmacos.cautela.length; ct++) {
          var cti = auditoriaFarmacos.cautela[ct];
          linhas.push('  - ' + cti.medicamento + ': ' + cti.alertas[0]);
        }
      }
      if (auditoriaFarmacos.seguros.length > 0) {
        linhas.push('✅ Medicamentos seguros: ' + auditoriaFarmacos.seguros.map(function(m){ return m.medicamento; }).join(', '));
      }
    }

    linhas.push('======================================================================');

    return {
      sucesso: true,
      textoFormatado: linhas.join('\n'),
      cronologia: avaliacaoIg,
      ganhoPeso: ganhoPeso,
      diretrizes: diretrizesTrimestre,
      auditoriaFarmacos: auditoriaFarmacos
    };
  }

  return {
    parseData: parseData,
    formatarDataBr: formatarDataBr,
    calcularDppNaegele: calcularDppNaegele,
    calcularIgEntreDatas: calcularIgEntreDatas,
    avaliarConcordanciaDumUsg: avaliarConcordanciaDumUsg,
    avaliarGanhoPesoGestacional: avaliarGanhoPesoGestacional,
    obterDiretrizesTrimestre: obterDiretrizesTrimestre,
    validarMedicamentoGestacao: validarMedicamentoGestacao,
    auditarPrescricaoGestante: auditarPrescricaoGestante,
    gerarResumoConsultaPrenatal: gerarResumoConsultaPrenatal,
    BANCO_FARMACOS_GESTACAO: BANCO_FARMACOS_GESTACAO,
    TABELA_GANHO_PESO_IOM: TABELA_GANHO_PESO_IOM
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ObstetriciaPrenatalService;
}
