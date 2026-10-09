/**
 * ==============================================================================
 * MÓDULO 02: SUPORTE NUTRICIONAL ENTERAL E PARENTERAL (UTI & ENFERMARIA)
 * ==============================================================================
 * Diretrizes Clínicas Baseadas em Evidências:
 *  - BRASPEN (Sociedade Brasileira de Nutrição Parenteral e Enteral) 2023-2026
 *  - ESPEN (European Society for Clinical Nutrition and Metabolism) 2023-2026
 *  - ASPEN (American Society for Parenteral and Enteral Nutrition) 2024-2026
 *  - AMIB (Associação de Medicina Intensiva Brasileira)
 *
 * PILARES CLÍNICOS DETERMINÍSTICOS:
 *  1. Cálculo de Necessidades Energéticas e Proteicas:
 *     - Gasto Energético Basal (Equação de Harris-Benedict) e Regra de Bolso (25-30 kcal/kg/dia).
 *     - Ajuste de peso em obesidade (Peso Ideal de Devine/Lorentz e Peso Corrigido).
 *     - Metas proteicas estratificadas: enfermaria (1.0-1.2 g/kg), UTI/sepse (1.3-2.0 g/kg),
 *       trauma/queimados (1.5-2.5 g/kg), DRC conservadora (0.8-1.0 g/kg) vs CRRT contínua (1.5-2.5 g/kg).
 *  2. Síndrome de Realimentação (Refeeding Syndrome - Critérios NICE / ASPEN):
 *     - Rastreio de fatores de risco maiores e menores (IMC < 16, perda ponderal, jejum prolongado, eletrólitos basais).
 *     - Protocolo obrigatório de reposição empírica de Tiamina 200-300 mg EV ANTES da glicose.
 *     - Reposição proativa de Fósforo, Magnésio e Potássio antes da progressão.
 *     - Escalonamento restritivo: início com 10-15 kcal/kg/dia (25-50% da meta) nos primeiros 2-3 dias.
 *  3. Triagem de Risco Nutricional (NRS-2002 & NUTRIC Score):
 *     - Estratificação para intervenção precoce em 24-48 horas.
 *  4. Seleção de Via e Prescrição Prática:
 *     - Nutrição Enteral (NE) como 1ª linha absoluta se trato gastrointestinal funcionante.
 *     - Nutrição Parenteral Total (NPT/NPP): indicações estritas, timing (precoce em alto risco vs
 *       aguardar 5-7 dias em baixo risco), osmolaridade de acesso periférico (< 850-900 mOsm/L) vs central.
 *     - Vazão em bomba de infusão (mL/h) para dietas 1.0, 1.2 e 1.5 kcal/mL.
 *     - Monitoramento seguro do Volume Residual Gástrico (VRG) e procinéticos.
 * ==============================================================================
 */

var SuporteNutricionalService = (function() {
  'use strict';

  // ───────────────────────────────────────────────────────────────────────────
  // 1. CÁLCULO DE PESO IDEAL, AJUSTADO E CLASSIFICAÇÃO ANTROPOMÉTRICA
  // ───────────────────────────────────────────────────────────────────────────

  function calcularAntropometria(pesoAtual, alturaCm, sexo) {
    pesoAtual = Number(pesoAtual || 70);
    alturaCm = Number(alturaCm || 170);
    var s = String(sexo || 'm').toLowerCase().charAt(0);
    var ehHomem = s === 'm' || s === 'h';

    var alturaMetros = alturaCm / 100;
    var imc = pesoAtual / (alturaMetros * alturaMetros);

    // Peso Ideal (Fórmula de Devine)
    var alturaPolegadas = alturaCm / 2.54;
    var polegadasAcima60 = Math.max(0, alturaPolegadas - 60);
    var pesoIdeal = ehHomem
      ? 50 + (2.3 * polegadasAcima60)
      : 45.5 + (2.3 * polegadasAcima60);

    // Peso Ajustado para Obesidade (IMC >= 30 kg/m²)
    // Peso Ajustado = Peso Ideal + 0.25 * (Peso Atual - Peso Ideal) ou 0.40 conforme BRASPEN/ESPEN
    var pesoAjustado = pesoAtual;
    var ehObeso = imc >= 30;
    if (ehObeso) {
      pesoAjustado = pesoIdeal + (0.25 * (pesoAtual - pesoIdeal));
    }

    var classificacaoImc = '';
    if (imc < 16.0) classificacaoImc = 'Magreza Grave (Desnutrição Grau III)';
    else if (imc < 17.0) classificacaoImc = 'Magreza Moderada (Desnutrição Grau II)';
    else if (imc < 18.5) classificacaoImc = 'Magreza Leve (Desnutrição Grau I)';
    else if (imc < 25.0) classificacaoImc = 'Eutrofia';
    else if (imc < 30.0) classificacaoImc = 'Sobrepeso';
    else if (imc < 35.0) classificacaoImc = 'Obesidade Grau I';
    else if (imc < 40.0) classificacaoImc = 'Obesidade Grau II';
    else classificacaoImc = 'Obesidade Grau III (Mórbida)';

    return {
      pesoAtual: Math.round(pesoAtual * 10) / 10,
      alturaCm: Math.round(alturaCm),
      alturaMetros: Math.round(alturaMetros * 100) / 100,
      imc: Math.round(imc * 10) / 10,
      classificacaoImc: classificacaoImc,
      pesoIdeal: Math.round(pesoIdeal * 10) / 10,
      pesoAjustado: Math.round(pesoAjustado * 10) / 10,
      ehObeso: ehObeso,
      sexo: ehHomem ? 'Masculino' : 'Feminino'
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. GASTO ENERGÉTICO BASAL E METAS CALÓRICO-PROTEICAS
  // ───────────────────────────────────────────────────────────────────────────

  function calcularNecessidadesBasais(peso, alturaCm, idade, sexo, fatorEstresse, condicaoClinica) {
    peso = Number(peso || 70);
    alturaCm = Number(alturaCm || 170);
    idade = Number(idade || 50);
    var s = String(sexo || 'm').toLowerCase().charAt(0);
    var ehHomem = s === 'm' || s === 'h';

    var antro = calcularAntropometria(peso, alturaCm, sexo);
    var pesoRefCalorias = antro.ehObeso ? antro.pesoAjustado : antro.pesoAtual;
    var pesoRefProteinas = antro.ehObeso ? antro.pesoIdeal : antro.pesoAtual;

    // Equação de Harris-Benedict (Gasto Energético Basal - GEB)
    var geb = 0;
    if (ehHomem) {
      geb = 66.47 + (13.75 * pesoRefCalorias) + (5.003 * alturaCm) - (6.755 * idade);
    } else {
      geb = 655.1 + (9.563 * pesoRefCalorias) + (1.850 * alturaCm) - (4.676 * idade);
    }

    var fator = Number(fatorEstresse || 1.2);
    var gastoEnergeticoTotal = Math.round(geb * fator);

    // Regra de Bolso por Fase e Condição (BRASPEN / ESPEN / ASPEN)
    var cond = String(condicaoClinica || 'enfermaria').toLowerCase();
    var metaKcalKgMin = 25;
    var metaKcalKgMax = 30;
    var metaProtKgMin = 1.0;
    var metaProtKgMax = 1.2;
    var orientacaoCondicao = 'Paciente estável em enfermaria. Metas conservadoras padrão.';

    if (antro.ehObeso) {
      // Obesidade Crítica (ASPEN/ESPEN): Dieta Hipocalórica Hiperproteica
      if (antro.imc < 50) {
        metaKcalKgMin = 11;
        metaKcalKgMax = 14; // sobre peso atual
        metaProtKgMin = 2.0;
        metaProtKgMax = 2.5; // sobre peso ideal
        pesoRefCalorias = antro.pesoAtual;
        orientacaoCondicao = 'Obesidade (IMC 30-49.9): Estratégia hipocalórica hiperproteica (11-14 kcal/kg peso atual; 2.0 g/kg peso ideal) para promover lipólise e evitar sobrecarga metabólica.';
      } else {
        metaKcalKgMin = 22;
        metaKcalKgMax = 25; // sobre peso ideal
        metaProtKgMin = 2.5;
        metaProtKgMax = 2.5;
        pesoRefCalorias = antro.pesoIdeal;
        orientacaoCondicao = 'Superobesidade (IMC >= 50): Alvo calórico de 22-25 kcal/kg peso ideal e proteína 2.5 g/kg peso ideal.';
      }
    } else if (cond.includes('fase_aguda') || cond.includes('aguda_precoce') || cond.includes('choque_estabilizado')) {
      metaKcalKgMin = 20;
      metaKcalKgMax = 24;
      metaProtKgMin = 1.2;
      metaProtKgMax = 1.5;
      orientacaoCondicao = 'Fase aguda inicial de UTI (dias 1 a 2): Alvo hipocalórico trófico (20-24 kcal/kg/dia) prevenindo hiperglicemia, esteatose e superalimentação.';
    } else if (cond.includes('uti') || cond.includes('critico') || cond.includes('sepse')) {
      metaKcalKgMin = 25;
      metaKcalKgMax = 30;
      metaProtKgMin = 1.3;
      metaProtKgMax = 2.0;
      orientacaoCondicao = 'Paciente crítico em UTI / Sepse (fase pós-aguda): Catabolismo acentuado, demanda proteica elevada (1.3 a 2.0 g/kg/dia) com 25 a 30 kcal/kg/dia.';
    } else if (cond.includes('trauma') || cond.includes('queimad')) {
      metaKcalKgMin = 30;
      metaKcalKgMax = 35;
      metaProtKgMin = 1.5;
      metaProtKgMax = 2.5;
      orientacaoCondicao = 'Grande trauma ou queimaduras extensas: Hipermetabolismo severo. Requer aporte proteico de até 2.0 a 2.5 g/kg/dia.';
    } else if (cond.includes('crrt') || cond.includes('dialise_continua')) {
      metaKcalKgMin = 25;
      metaKcalKgMax = 30;
      metaProtKgMin = 1.7;
      metaProtKgMax = 2.5;
      orientacaoCondicao = 'Insuficiência Renal Aguda em Hemodiálise Contínua (CRRT): A depuração contínua remove aminoácidos pelo efluente (10-15g/dia). Meta proteica de 1.7 a 2.5 g/kg/dia mandatória.';
    } else if (cond.includes('drc_conservador') || cond.includes('sem_dialise')) {
      metaKcalKgMin = 25;
      metaKcalKgMax = 30;
      metaProtKgMin = 0.8;
      metaProtKgMax = 1.0;
      orientacaoCondicao = 'DRC não-dialítica avançada: Restrição proteica relativa (0.8 a 1.0 g/kg/dia) para controle de toxinas urêmicas se estabilidade catabólica.';
    }

    var metaKcalMinTotal = Math.round(metaKcalKgMin * pesoRefCalorias);
    var metaKcalMaxTotal = Math.round(metaKcalKgMax * pesoRefCalorias);
    var metaProtMinTotal = Math.round(metaProtKgMin * pesoRefProteinas);
    var metaProtMaxTotal = Math.round(metaProtKgMax * pesoRefProteinas);

    // Necessidade Hídrica Basal (30 a 35 mL/kg/dia)
    var aguaMin = Math.round(30 * pesoRefCalorias);
    var aguaMax = Math.round(35 * pesoRefCalorias);

    if (idade >= 90) {
      orientacaoCondicao += ' | ⚠️ Idoso Longevo (≥ 90 anos): Risco acentuado de sarcopenia e menor reserva cardiovascular/renal; priorizar progressão calórica cautelosa e balanço hídrico rigoroso.';
    }

    return {
      sucesso: true,
      antropometria: antro,
      pesoReferenciaCalorias: pesoRefCalorias,
      pesoReferenciaProteinas: pesoRefProteinas,
      gebHarrisBenedict: Math.round(geb),
      getComFatorEstresse: gastoEnergeticoTotal,
      fatorEstresseUtilizado: fator,
      alvoCaloricoDia: {
        minKcal: metaKcalMinTotal,
        maxKcal: metaKcalMaxTotal,
        faixaTexto: metaKcalMinTotal + ' a ' + metaKcalMaxTotal + ' kcal/dia (' + metaKcalKgMin + '-' + metaKcalKgMax + ' kcal/kg/dia)'
      },
      alvoProteicoDia: {
        minGramas: metaProtMinTotal,
        maxGramas: metaProtMaxTotal,
        faixaTexto: metaProtMinTotal + ' a ' + metaProtMaxTotal + ' g de proteína/dia (' + metaProtKgMin + '-' + metaProtKgMax + ' g/kg/dia)'
      },
      necessidadeHidricaEstimada: aguaMin + ' a ' + aguaMax + ' mL/dia (30-35 mL/kg/dia)',
      orientacaoClinica: orientacaoCondicao,
      alertaLongevo: idade >= 90 ? '⚠️ Paciente longevo (≥ 90 anos): Alto risco de sarcopenia e hiper-hidratação; monitorar balanço hídrico rigorosamente.' : null
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. SÍNDROME DE REALIMENTAÇÃO (REFEEDING SYNDROME - CRITÉRIOS NICE / ASPEN)
  // ───────────────────────────────────────────────────────────────────────────

  function avaliarRiscoRealimentacao(dados) {
    dados = dados || {};
    var imc = Number(dados.imc || 22);
    var perdaPesoPct = Number(dados.perdaPesoPct || dados.perdaPesoMeses || 0);
    var diasJejum = Number(dados.diasJejum || dados.jejumDias || 0);
    var k = dados.k !== undefined ? Number(dados.k) : 4.0;
    var mg = dados.mg !== undefined ? Number(dados.mg) : 2.0;
    var p = dados.p !== undefined ? Number(dados.p) : 3.0; // Fósforo sérico mg/dL
    var etilismoOuQuimio = !!(dados.etilismo || dados.quimioterapia || dados.anorexia);

    var criteriosMaiores = [];
    var criteriosMenores = [];

    // Critérios Maiores (NICE Guidance)
    if (imc < 16.0) criteriosMaiores.push('IMC extremamente baixo (< 16 kg/m²)');
    if (perdaPesoPct > 15.0) criteriosMaiores.push('Perda ponderal involuntária > 15% nos últimos 3 a 6 meses');
    if (diasJejum > 10) criteriosMaiores.push('Pouco ou nenhum aporte nutricional por mais de 10 dias consecutivos');
    if (p < 2.0) criteriosMaiores.push('Hipofosfatemia basal documentada (P = ' + p + ' mg/dL; valor crítico < 2.0)');
    if (mg < 1.5) criteriosMaiores.push('Hipomagnesemia basal documentada (Mg = ' + mg + ' mg/dL; valor crítico < 1.5)');
    if (k < 3.5) criteriosMaiores.push('Hipocalemia basal documentada (K = ' + k + ' mEq/L; valor crítico < 3.5)');

    // Critérios Menores
    if (imc >= 16.0 && imc < 18.5) criteriosMenores.push('IMC reduzido (16.0 a 18.4 kg/m²)');
    if (perdaPesoPct >= 10.0 && perdaPesoPct <= 15.0) criteriosMenores.push('Perda ponderal involuntária de 10% a 15% em 3 a 6 meses');
    if (diasJejum >= 5 && diasJejum <= 10) criteriosMenores.push('Jejum ou ingestão ínfima por 5 a 10 dias consecutivos');
    if (etilismoOuQuimio) criteriosMenores.push('Histórico de uso crônico de álcool, drogas, quimioterapia recente ou caquexia');

    var altoRisco = criteriosMaiores.length >= 1 || criteriosMenores.length >= 2;
    var riscoExtremo = criteriosMaiores.length >= 2 || (imc < 14.0 && diasJejum > 15);

    var nivelRisco = 'BAIXO';
    if (riscoExtremo) nivelRisco = 'EXTREMO';
    else if (altoRisco) nivelRisco = 'ALTO';
    else if (criteriosMenores.length === 1) nivelRisco = 'MODERADO';

    var condutas = [];
    var alertasCriticos = [];

    if (altoRisco || riscoExtremo) {
      alertasCriticos.push('🚨 ALERTA CRÍTICO: PACIENTE COM ALTO RISCO DE SÍNDROME DE REALIMENTAÇÃO (REFEEDING SYNDROME).');
      alertasCriticos.push('A reintrodução abrupta de carboidratos desencadeia pico de insulina com influxo intracelular maciço de Fósforo, Magnésio e Potássio, gerando arritmias letais, fraqueza diafragmática, falência cardíaca e encefalopatia.');

      condutas.push('1. REPOSIÇÃO MANDATÓRIA DE TIAMINA PRÉ-DIETA: Prescrever Tiamina 200 a 300 mg EV diluída em SF 0,9% administrada pelo menos 30 minutos ANTES de qualquer infusão calórica (glicosada ou dieta), mantendo 100-200 mg/dia por 3 a 5 dias. Previne Encefalopatia de Wernicke e acidose lática.');
      condutas.push('2. CORREÇÃO PROATIVA DE ELETRÓLITOS:');
      condutas.push('   • Fósforo: Se P < 2.0 mg/dL, repor Fosfato de Potássio ou Fosfato de Sódio (0.3 a 0.6 mmol/kg EV em 4 a 6h). Meta sérica > 2.5 mg/dL.');
      condutas.push('   • Magnésio: Se Mg < 1.5 mg/dL, repor Sulfato de Magnésio 10% ou 50% (2 a 4g EV em infusão lenta de 2 a 4h). Meta sérica > 2.0 mg/dL.');
      condutas.push('   • Potássio: Manter K sérico > 4.0 mEq/L (repor KCl IV diluído, NUNCA puro/bolus direto).');
      condutas.push('3. INTRODUÇÃO CALÓRICA LENTA E RESTRITA:');
      condutas.push('   • Iniciar com apenas 10 a 15 kcal/kg/dia (ou 25% a 50% da meta calórica plena) nas primeiras 48 a 72 horas.');
      condutas.push('   • Evolução gradual: Aumentar 25% a 33% do aporte a cada 24-48 horas se eletrólitos permanecerem estáveis.');
      condutas.push('   • Atingir meta plena apenas entre o 4º e o 7º dia de terapia.');
      condutas.push('4. VIGILÂNCIA LABORATORIAL INTENSIVA:');
      condutas.push('   • Dosagem sérica de Fósforo, Magnésio, Potássio, Cálcio e Glicemia a cada 12 a 24 horas nos primeiros 3 a 5 dias.');
    } else {
      condutas.push('1. Risco baixo a moderado. Iniciar nutrição com 50% a 70% da meta calórica no 1º dia, evoluindo para 100% da meta em 48 a 72 horas.');
      condutas.push('2. Monitorar eletrólitos basais (K, Mg, P) nas primeiras 48 horas.');
    }

    return {
      sucesso: true,
      nivelRisco: nivelRisco,
      altoRisco: altoRisco,
      riscoExtremo: riscoExtremo,
      criteriosMaioresDetectados: criteriosMaiores,
      criteriosMenoresDetectados: criteriosMenores,
      alertasCriticos: alertasCriticos,
      condutasRecomendadas: condutas
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. TRIAGEM DE RISCO NUTRICIONAL (NRS-2002 & NUTRIC SCORE)
  // ───────────────────────────────────────────────────────────────────────────

  function calcularNrs2002(dados) {
    dados = dados || {};
    var escoreEstadoNutricional = Number(dados.escoreNutricional || 0); // 0 a 3
    var escoreGravidadeDoenca = Number(dados.escoreDoenca || 0); // 0 a 3
    var idade = Number(dados.idade || 50);

    // Ajuste por idade >= 70 anos (+1 ponto)
    var pontoIdade = idade >= 70 ? 1 : 0;
    var totalEscore = escoreEstadoNutricional + escoreGravidadeDoenca + pontoIdade;

    var altoRisco = totalEscore >= 3;

    return {
      escoreTotal: totalEscore,
      escoreEstadoNutricional: escoreEstadoNutricional,
      escoreGravidadeDoenca: escoreGravidadeDoenca,
      ajusteIdadeIdoso: pontoIdade,
      altoRiscoNutricional: altoRisco,
      classificacao: altoRisco ? 'Alto Risco Nutricional (Escore >= 3)' : 'Sem Risco Nutricional Imediato (Escore < 3)',
      conduta: altoRisco
        ? 'Indicação formal de início de Terapia Nutricional especializada precoce em até 24 a 48 horas de internação.'
        : 'Reavaliação semanal da triagem nutricional ou se houver alteração clínica desfavorável.'
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. PRESCRIÇÃO ESTRUTURADA DE TERAPIA NUTRICIONAL (ENTERAL VS PARENTERAL)
  // ───────────────────────────────────────────────────────────────────────────

  function prescreverTerapiaNutricional(dados) {
    dados = dados || {};
    var peso = Number(dados.peso || 70);
    var alturaCm = Number(dados.alturaCm || 170);
    var diasJejum = Number(dados.diasJejum || dados.jejumDias || 0);
    var tgiFuncionante = dados.tratoGastrointestinalFuncionante !== undefined ? !!dados.tratoGastrointestinalFuncionante : true;
    var nrs2002 = Number(dados.nrs2002 || 0);
    var nutricScore = Number(dados.nutricScore || 0);
    var densidadeDietaKcalMl = Number(dados.densidadeKcalMl || 1.2); // 1.0, 1.2 ou 1.5 kcal/mL
    var horasInfusaoDia = Number(dados.horasInfusao || 24);

    var necessidades = calcularNecessidadesBasais(peso, alturaCm, dados.idade || 50, dados.sexo || 'm', dados.fatorEstresse || 1.2, dados.condicaoClinica);
    var altoRisco = (nrs2002 >= 3 || nutricScore >= 5 || dados.altoRiscoNutricional);

    var viaEscolhida = '';
    var tipoAcesso = '';
    var indicacoes = [];
    var contraindicacoesAvisos = [];
    var metas = necessidades.alvoCaloricoDia;
    var metaKcalAlvo = Math.round((metas.minKcal + metas.maxKcal) / 2);

    if (tgiFuncionante) {
      viaEscolhida = 'NUTRIÇÃO ENTERAL PRECOCE (NE)';
      tipoAcesso = 'Sonda Nasoenteral (SNE pós-pilórica ou gástrica) ou Ostomia (GTT/JTT)';

      indicacoes.push('Regra de Ouro: O trato gastrointestinal está funcionante, logo a via enteral é mandatória para manter trofismo de enterócitos, microbiota e barreira imunológica.');
      if (diasJejum >= 2) {
        indicacoes.push('Iniciar NE nas primeiras 24 a 48 horas da admissão na UTI/enfermaria após estabilização hemodinâmica.');
      } else {
        indicacoes.push('Iniciar precocemente em taxa trófica (20 a 30 mL/h) e progredir gradualmente para a meta em 48 a 72 horas.');
      }
    } else {
      viaEscolhida = 'NUTRIÇÃO PARENTERAL (NPT / NPP)';
      tipoAcesso = 'Cateter Venoso Central (CVC - subclávia/jugular) exclusivo para NPT (ou PICC)';

      contraindicacoesAvisos.push('Trato gastrointestinal não funcionante ou contraindicado (ex: obstrução mecânica, íleo paralítico grave, fístula de alto débito, isquemia mesentérica).');

      if (altoRisco) {
        indicacoes.push('Paciente em ALTO RISCO nutricional com TGI inviável: Iniciar Nutrição Parenteral Total precoce nas primeiras 24 a 48 horas de internação.');
      } else {
        if (diasJejum < 7) {
          indicacoes.push('Paciente com bom estado prévio / baixo risco: Aguardar até 5 a 7 dias de jejum antes de iniciar NPT exclusiva. Evita riscos de infecção de corrente sanguínea e hiperglicemia na fase aguda inicial.');
        } else {
          indicacoes.push('Jejum prolongado (> 7 dias) com impossibilidade de NE: Iniciar NPT total de manutenção com formulação balanceada.');
        }
      }
    }

    // Cálculo da Vazão em Bomba de Infusão (mL/h)
    var volumeTotalMl = Math.round(metaKcalAlvo / densidadeDietaKcalMl);
    var vazaoMlHora = Math.round(volumeTotalMl / horasInfusaoDia);

    // Protocolo de Resíduo Gástrico e Monitoramento (ESPEN/BRASPEN)
    var protocoloMonitoramento = [
      'Glicemia capilar a cada 6 horas (alvo hospitalar: 140 a 180 mg/dL).',
      'Cabeceira elevada a 30°-45° durante toda a infusão enteral para prevenir pneumonia aspirativa.',
      'Volume Residual Gástrico (VRG): NÃO suspender NE por resíduos inferiores a 500 mL/6h na ausência de vômitos, distensão abdominal dolorosa ou refluxo.',
      'Se VRG > 500 mL persistente: associar procinético (Metoclopramida 10mg IV 8/8h ou Eritromicina) e considerar posicionamento pós-pilórico da sonda.'
    ];

    if (!tgiFuncionante) {
      protocoloMonitoramento.push('Para Parenteral: Soluções com osmolaridade > 850-900 mOsm/L exigem Cateter Venoso Central exclusivo com curativo estéril com clorexidina.');
      protocoloMonitoramento.push('Monitorar perfil de triglicerídeos séricos (se > 400 mg/dL, reduzir infusão de emulsão lipídica IV).');
    }

    return {
      sucesso: true,
      viaEscolhida: viaEscolhida,
      tipoAcessoRecomendado: tipoAcesso,
      altoRiscoNutricional: altoRisco,
      metaCaloricaAlvoKcal: metaKcalAlvo,
      densidadeDietaKcalMl: densidadeDietaKcalMl,
      volumeTotalDiarioMl: volumeTotalMl,
      vazaoBombaInfusao: vazaoMlHora + ' mL/hora (' + horasInfusaoDia + ' horas/dia)',
      indicacoesClinicas: indicacoes,
      contraindicacoesAvisos: contraindicacoesAvisos,
      necessidadesEstimadas: necessidades,
      protocoloMonitoramento: protocoloMonitoramento
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. AVALIAÇÃO INTEGRADA E FORMATAÇÃO UI (TELEGRAM & COCKPIT)
  // ───────────────────────────────────────────────────────────────────────────

  function avaliarSuporteNutricionalCompleto(params) {
    params = params || {};
    var peso = Number(params.peso || 70);
    var alturaCm = Number(params.alturaCm || 170);
    var idade = Number(params.idade || 50);
    var sexo = params.sexo || 'm';

    var necessidades = calcularNecessidadesBasais(peso, alturaCm, idade, sexo, params.fatorEstresse, params.condicaoClinica);
    var realimentacao = avaliarRiscoRealimentacao({
      imc: necessidades.antropometria.imc,
      perdaPesoPct: params.perdaPesoPct,
      diasJejum: params.diasJejum,
      k: params.k,
      mg: params.mg,
      p: params.p,
      etilismo: params.etilismo,
      quimioterapia: params.quimioterapia
    });

    var nrs = calcularNrs2002({
      escoreNutricional: params.escoreNutricional,
      escoreDoenca: params.escoreDoenca,
      idade: idade
    });

    var prescricao = prescreverTerapiaNutricional({
      peso: peso,
      alturaCm: alturaCm,
      idade: idade,
      sexo: sexo,
      diasJejum: params.diasJejum,
      tratoGastrointestinalFuncionante: params.tratoGastrointestinalFuncionante,
      nrs2002: nrs.escoreTotal,
      densidadeKcalMl: params.densidadeKcalMl || 1.2,
      condicaoClinica: params.condicaoClinica
    });

    var l = [];
    l.push('🥗 *PROTOCOLO DE SUPORTE NUTRICIONAL CLÍNICO & UTI*');
    l.push('════════════════════════════════════════════');
    l.push('👤 *Antropometria:* ' + necessidades.antropometria.sexo + ', ' + idade + ' anos');
    l.push('• Peso Atual: ' + peso + ' kg | Altura: ' + alturaCm + ' cm | IMC: ' + necessidades.antropometria.imc + ' kg/m² (' + necessidades.antropometria.classificacaoImc + ')');
    if (necessidades.antropometria.ehObeso) {
      l.push('• Peso Ideal (Devine): ' + necessidades.antropometria.pesoIdeal + ' kg | Peso Ajustado: ' + necessidades.antropometria.pesoAjustado + ' kg');
    }
    l.push('');
    l.push('📊 *METAS CALÓRICAS & PROTEICAS (BRASPEN/ESPEN):*');
    l.push('• Gasto Basal (Harris-Benedict): ' + necessidades.gebHarrisBenedict + ' kcal/dia');
    l.push('• Alvo Calórico: ' + necessidades.alvoCaloricoDia.faixaTexto);
    l.push('• Alvo Proteico: ' + necessidades.alvoProteicoDia.faixaTexto);
    l.push('• Hidratação Basal: ' + necessidades.necessidadeHidricaEstimada);
    l.push('💡 _' + necessidades.orientacaoClinica + '_');
    l.push('');

    // Seção de Síndrome de Realimentação
    l.push('⚠️ *SÍNDROME DE REALIMENTAÇÃO (REFEEDING SYNDROME):*');
    l.push('• Nível de Risco: *' + realimentacao.nivelRisco + '*');
    if (realimentacao.altoRisco) {
      l.push('🚨 *ATENÇÃO MÁXIMA*: Risco iminente de colapso por hipofosfatemia/hipomagnesemia.');
      l.push('• Condutas Preventivas Obrigatórias:');
      realimentacao.condutasRecomendadas.forEach(function(c) {
        l.push('  ' + c);
      });
    } else {
      l.push('• Risco controlado. Progressão habitual da dieta.');
    }
    l.push('');

    // Seção de Prescrição da Dieta
    l.push('🩺 *PRESCRIÇÃO DA TERAPIA NUTRICIONAL:*');
    l.push('• Via de Acesso: *' + prescricao.viaEscolhida + '*');
    l.push('• Dispositivo: ' + prescricao.tipoAcessoRecomendado);
    l.push('• Vazão Sugerida: *' + prescricao.vazaoBombaInfusao + '* (dieta ' + prescricao.densidadeDietaKcalMl + ' kcal/mL)');
    l.push('• Volume Diário: ' + prescricao.volumeTotalDiarioMl + ' mL/dia');
    l.push('');
    l.push('📋 *Vigilância e Segurança Beira-Leito:*');
    prescricao.protocoloMonitoramento.slice(0, 3).forEach(function(m) {
      l.push('  ✓ ' + m);
    });

    return {
      sucesso: true,
      necessidades: necessidades,
      realimentacao: realimentacao,
      triagemNrs2002: nrs,
      prescricao: prescricao,
      resumoFormatado: l.join('\n')
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // EXPORTAÇÃO PÚBLICA
  // ───────────────────────────────────────────────────────────────────────────

  return {
    calcularAntropometria: calcularAntropometria,
    calcularNecessidadesBasais: calcularNecessidadesBasais,
    avaliarRiscoRealimentacao: avaliarRiscoRealimentacao,
    calcularNrs2002: calcularNrs2002,
    prescreverTerapiaNutricional: prescreverTerapiaNutricional,
    avaliarSuporteNutricionalCompleto: avaliarSuporteNutricionalCompleto
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SuporteNutricionalService;
  module.exports.SuporteNutricionalService = SuporteNutricionalService;
}
