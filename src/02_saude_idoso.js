/**
 * Módulo de Saúde do Idoso, Avaliação Geriátrica Ampla (AGA),
 * Profilaxia de Quedas e Osteoporose (FRAX Brasil / ABRASSO / SBGG / ACR / Beers AGS 2023).
 *
 * Funcionalidades:
 * 1. Triagem de fragilidade clínica (CFS - Rockwood)
 * 2. Avaliação cognitiva rápida (Mini-Cog)
 * 3. Avaliação de risco de quedas (Timed Up and Go - TUG)
 * 4. Calculadora FRAX Brasil para risco em 10 anos de Fratura Osteoporótica Maior e de Quadril
 * 5. Protocolo de manejo de osteoporose: Cálcio dietético/medicamentoso, Vitamina D e Bisfosfonatos (Alendronato) com bloqueios de segurança
 * 6. Revisão avançada de polifarmácia: Drogas que prolongam QTc, Hipotensão Ortostática, Sedativos (FRIDs) e Critérios de Beers 2023
 * 7. Plano geriátrico integrado beira-leito / UBS para o médico generalista
 */

var SaudeIdosoService = class SaudeIdosoService {

  // ===========================================================================
  // 1. AVALIAÇÃO GERIÁTRICA AMPLA (AGA) - MÉTODOS BASE
  // ===========================================================================

  /**
   * Avalia a fragilidade clínica pela Clinical Frailty Scale (CFS) - Rockwood
   * @param {number} score 1 a 9
   * @returns {object}
   */
  static avaliarFragilidadeCFS(score) {
    if (typeof score !== 'number' || score < 1 || score > 9) {
      throw new Error("O score da CFS deve estar entre 1 e 9.");
    }

    const classificacoes = {
      1: { titulo: "Muito Robusto", desc: "Pessoas ativas, enérgicas e motivadas. Exercitam-se regularmente e são as mais aptas para a idade." },
      2: { titulo: "Robusto", desc: "Sem doença ativa no momento. Exercitam-se ocasionalmente, muito ativos sazonalmente." },
      3: { titulo: "Bem", desc: "Pessoas com problemas médicos bem controlados. Não são regularmente ativas além da caminhada rotineira." },
      4: { titulo: "Vulnerável", desc: "Embora não dependam de outros para as AVDs, sintomas de doenças limitam as atividades. Queixam-se de estar mais lentos ou cansados." },
      5: { titulo: "Fragilidade Leve", desc: "Lentificação mais evidente. Precisam de ajuda em AIVDs (finanças, transporte, trabalho doméstico pesado, medicações)." },
      6: { titulo: "Fragilidade Moderada", desc: "Precisam de ajuda em todas as atividades externas e para cuidar da casa. Dentro de casa, têm dificuldade com escadas e precisam de ajuda para banho." },
      7: { titulo: "Fragilidade Grave", desc: "Completamente dependentes para cuidados pessoais (AVDs), por causa física ou cognitiva. Estáveis, com risco de morte em até 6 meses ausente." },
      8: { titulo: "Fragilidade Muito Grave", desc: "Completamente dependentes, acamados ou próximos a isso. Fim da vida, não se recuperam nem de doenças menores." },
      9: { titulo: "Doente Terminal", desc: "Expectativa de vida < 6 meses, não são por outro lado manifestamente frágeis." }
    };

    const resultado = classificacoes[score];
    let interpretacao = "";
    if (score <= 3) interpretacao = "Idoso Robusto. Manter medidas preventivas e rastreio adequado para a idade.";
    else if (score === 4) interpretacao = "Idoso Vulnerável. Oportunidade de intervenção precoce (exercício resistido, ajuste nutricional, revisão de medicamentos).";
    else interpretacao = "Idoso Frágil. Necessita de Avaliação Geriátrica Ampla (AGA), desprescrição, adequação de metas de cuidado (prioridade funcional e conforto) e suporte multidisciplinar.";

    return {
      escore: score,
      classificacao: resultado.titulo,
      descricao: resultado.desc,
      interpretacao,
      alerta_fragilidade: score >= 5
    };
  }

  /**
   * Avalia a cognição usando o Mini-Cog (Memória de 3 palavras + Teste do Desenho do Relógio)
   * @param {number} palavrasRecordadas 0 a 3
   * @param {boolean} relogioNormal true (2 pts) ou false (0 pts)
   * @returns {object}
   */
  static avaliarMiniCog(palavrasRecordadas, relogioNormal) {
    if (palavrasRecordadas < 0 || palavrasRecordadas > 3) {
      throw new Error("Palavras recordadas devem ser de 0 a 3.");
    }

    const pontosRelogio = relogioNormal ? 2 : 0;
    const escoreTotal = palavrasRecordadas + pontosRelogio;

    let rastreio_positivo = escoreTotal <= 2;
    let interpretacao = rastreio_positivo 
      ? "Rastreio cognitivo POSITIVO (escore <= 2). Alta probabilidade de comprometimento cognitivo. Indicação de aprofundar com MEEM/MoCA e investigar causas reversíveis (TSH, B12, sífilis, depressão, medicamentos)."
      : "Rastreio cognitivo NEGATIVO (escore >= 3). Baixa probabilidade de demência clinicamente significativa no momento.";

    return {
      palavras_recordadas: palavrasRecordadas,
      relogio_normal: relogioNormal,
      escore_total: escoreTotal,
      rastreio_positivo,
      interpretacao
    };
  }

  /**
   * Avalia risco de quedas pelo Timed Up and Go (TUG)
   * @param {number} tempoSegundos 
   * @returns {object}
   */
  static avaliarRiscoQuedasTUG(tempoSegundos) {
    let classificacao = "";
    let risco_alto = false;
    let conduta = "";

    if (tempoSegundos <= 10) {
      classificacao = "Normal";
      conduta = "Baixo risco de quedas. Manter atividade física habitual.";
    } else if (tempoSegundos <= 20) {
      classificacao = "Risco Moderado / Limítrofe";
      conduta = "Risco moderado. Avaliar equilíbrio e marcha. Orientar exercícios de fortalecimento (ex: fisioterapia/treino resistido) e adaptar ambiente doméstico.";
      risco_alto = tempoSegundos > 12; // Critério de corte consagrado > 12s
    } else {
      classificacao = "Alto Risco de Quedas";
      risco_alto = true;
      conduta = "Alto risco de quedas (> 20s). Necessidade mandatória de intervenção: fisioterapia motora intensiva, revisão e desprescrição de psicotrópicos/drogas hipotensoras, correção visual e remoção estrita de barreiras domésticas (tapetes, fios, iluminação).";
    }

    return {
      tempo_segundos: tempoSegundos,
      classificacao,
      risco_alto,
      conduta
    };
  }

  /**
   * Avalia polifarmácia e Critérios de Beers (AGS 2023) / STOPP
   * @param {Array<string>} listaMedicamentos
   * @returns {object}
   */
  static avaliarFarmacosBeers(listaMedicamentos) {
    listaMedicamentos = Array.isArray(listaMedicamentos) ? listaMedicamentos : [];
    const qtde = listaMedicamentos.length;
    const polifarmacia = qtde >= 5;
    
    // Lista de Beers simplificada (medicamentos frequentemente problemáticos em idosos)
    const beersRegex = {
      'Benzodiazepínicos (Diazepam, Clonazepam, Alprazolam)': /(diazepam|clonazepam|alprazolam|bromazepam|lorazepam|midazolam)/i,
      'Antidepressivos Tricíclicos (Amitriptilina, Nortriptilina)': /(amitriptilina|nortriptilina|clomipramina|imipramina)/i,
      'Hipnóticos / Drogas Z (Zolpidem)': /(zolpidem|zopiclona)/i,
      'Anti-histamínicos de 1ª Geração (Dexclorfeniramina, Prometazina)': /(dexclorfeniramina|prometazina|hidroxizina|difenidramina)/i,
      'Antipsicóticos Típicos (Haloperidol, Clorpromazina)': /(haloperidol|clorpromazina|levomepromazina)/i,
      'AINEs (Diclofenaco, Cetoprofeno, Ibuprofeno, Naproxeno)': /(diclofenaco|cetoprofeno|ibuprofeno|naproxeno|nimesulida|meloxicam|piroxicam)/i,
      'Bloqueadores Alfa-1 (Doxazosina, Tansulosina)': /(doxazosina|terazosina|prazosina)/i,
      'Sulfonilureias de longa ação (Glibenclamida)': /(glibenclamida|clorpropamida)/i,
      'Anti-espasmódicos (Escopolamina/Buscopan)': /(escopolamina|butilbrometo)/i,
      'Metoclopramida': /(metoclopramida|plasil)/i,
      'Relaxantes musculares (Ciclobenzaprina, Carisoprodol)': /(ciclobenzaprina|carisoprodol|orfenadrina)/i,
      'Amiodarona': /(amiodarona|ancoron)/i,
      'Inibidores da Bomba de Prótons > 8 semanas': /(omeprazol|pantoprazol|esomeprazol|lansoprazol)/i
    };

    let medicamentosInadequados = [];
    
    listaMedicamentos.forEach(med => {
      let flagged = false;
      for (const [classe, regex] of Object.entries(beersRegex)) {
        if (regex.test(med) && !flagged) {
          medicamentosInadequados.push({
            medicamento: med,
            alerta: `Evitar (Critérios de Beers): Pertence ao grupo ${classe}.`
          });
          flagged = true;
        }
      }
    });

    let conduta = "";
    if (medicamentosInadequados.length > 0) {
      conduta = "Detectados medicamentos potencialmente inadequados (PIMs). Sugere-se desprescrição ou troca por alternativas mais seguras.";
    } else if (polifarmacia) {
      conduta = "Polifarmácia detectada. Realizar conciliação medicamentosa e avaliar necessidade contínua de cada fármaco.";
    } else {
      conduta = "Baixo risco farmacológico aparente. Manter revisão periódica.";
    }

    return {
      quantidade_medicamentos: qtde,
      polifarmacia,
      medicamentos_inadequados: medicamentosInadequados,
      alertas_beers: medicamentosInadequados.length > 0,
      conduta
    };
  }

  // ===========================================================================
  // 2. CALCULADORA FRAX BRASIL (FRATURA OSTEOPORÓTICA MAIOR E QUADRIL)
  // ===========================================================================

  /**
   * Calcula o risco de fratura em 10 anos pelo modelo calibrado FRAX Brasil (ABRASSO / SBGG / NOGG / OMS).
   *
   * @param {object} dados
   * @param {number} dados.idade Idade em anos (40 a 90)
   * @param {string} [dados.sexo='F'] 'F' (Feminino) ou 'M' (Masculino)
   * @param {number} [dados.peso] Peso em kg
   * @param {number} [dados.altura] Altura em cm
   * @param {number} [dados.imc] IMC calculado diretamente se peso/altura ausentes
   * @param {boolean} [dados.fraturaPrevia=false] Fratura clínica prévia por fragilidade em adultos
   * @param {boolean} [dados.paisFraturaQuadril=false] Histórico de fratura de quadril em pai ou mãe
   * @param {boolean} [dados.tabagismo=false] Tabagismo ativo
   * @param {boolean} [dados.glicocorticoide=false] Uso oral crônico de Prednisona >= 5 mg/dia por >= 3 meses
   * @param {boolean} [dados.artriteReumatoide=false] Artrite reumatoide diagnosticada
   * @param {boolean} [dados.osteoporoseSecundaria=false] Causa secundária (DM1, hipertireoidismo, hipogonadismo, etc.)
   * @param {boolean} [dados.alcool=false] Ingestão >= 3 doses diárias de álcool
   * @param {number} [dados.dmoColoFemurTScore=null] T-Score do colo do fêmur pela DXA
   * @returns {object}
   */
  static calcularFraxBrasil(dados) {
    dados = dados || {};
    let idadeInformada = typeof dados.idade === 'number' ? dados.idade : 65;
    let idade = idadeInformada;
    let alertas = [];

    // Blindagem de idade (modelo oficial FRAX 40-90 anos)
    if (idade < 40) {
      alertas.push("Idade < 40 anos: O modelo FRAX não é formalmente validado para menores de 40 anos. Cálculos clínicos projetados para baseline de 40 anos; priorizar investigação de osteoporose secundária.");
      idade = 40;
    } else if (idade > 90) {
      alertas.push("Idade > 90 anos: Paciente nonagenário. O modelo FRAX limita estimativas a 90 anos; risco de fratura e fragilidade clínica é extremo.");
      idade = 90;
    }

    if (typeof dados.peso === 'number') {
      if (dados.peso < 40) alertas.push("Baixo peso corporal (< 40 kg): Fator de risco crítico para perda óssea acelerada.");
      else if (dados.peso > 150) alertas.push("Obesidade severa (> 150 kg): Fraturas periféricas e de membros aumentam.");
    }

    const sexoStr = String(dados.sexo || 'F').trim().toUpperCase();
    const ehMasculino = sexoStr === 'M' || sexoStr === 'MASCULINO' || sexoStr === 'HOMEM';
    const sexo = ehMasculino ? 'M' : 'F';

    // Cálculo e saneamento do IMC
    let imc = 25.0;
    if (typeof dados.peso === 'number' && typeof dados.altura === 'number' && dados.altura > 0) {
      const altM = dados.altura > 3 ? dados.altura / 100 : dados.altura;
      imc = dados.peso / (altM * altM);
    } else if (typeof dados.imc === 'number' && dados.imc > 0) {
      imc = dados.imc;
    }
    if (imc < 12 || imc > 60) {
      alertas.push(`IMC informado (${imc.toFixed(1)} kg/m²) é extremo; ajustado para limites fisiológicos de segurança do modelo.`);
      imc = Math.max(14, Math.min(50, imc));
    }

    // Curva basal brasileira calibrada (Zerbini et al., FRAX Brasil / Kanis et al.):
    // Nós para sexo feminino por década: 40, 50, 60, 70, 80, 90 anos
    const nosIdade = [40, 50, 60, 70, 80, 90];
    const baseMofFem = [2.1, 3.4, 5.4, 9.2, 15.6, 22.5];
    const baseHipFem = [0.1, 0.3, 0.8, 2.6, 6.8, 13.5];

    function interpolar(idades, valores, alvo) {
      for (let i = 0; i < idades.length - 1; i++) {
        if (alvo >= idades[i] && alvo <= idades[i + 1]) {
          const frac = (alvo - idades[i]) / (idades[i + 1] - idades[i]);
          return valores[i] + frac * (valores[i + 1] - valores[i]);
        }
      }
      return valores[valores.length - 1];
    }

    let mofBasal = interpolar(nosIdade, baseMofFem, idade);
    let hipBasal = interpolar(nosIdade, baseHipFem, idade);

    // Ajuste por sexo masculino (aproximadamente 55% do risco feminino no Brasil)
    if (ehMasculino) {
      mofBasal *= 0.55;
      hipBasal *= 0.55;
    }

    // Ajuste por IMC (referência 25 kg/m²)
    // IMC baixo aumenta risco acentuadamente; IMC alto oferece efeito protetor para quadril
    const fatorImcMof = Math.pow(25.0 / imc, 0.40);
    const fatorImcHip = Math.pow(25.0 / imc, 0.75);

    let riscoMof = mofBasal * fatorImcMof;
    let riscoHip = hipBasal * fatorImcHip;

    // Fatores de risco clínicos (Hazard Ratios oficiais do consórcio FRAX)
    const fatores = [];
    if (dados.fraturaPrevia) {
      riscoMof *= 1.95;
      riscoHip *= 2.05;
      fatores.push("Fratura por fragilidade prévia (HR ~2.0)");
    }
    if (dados.paisFraturaQuadril) {
      riscoMof *= 1.55;
      riscoHip *= 2.25;
      fatores.push("Histórico parental de fratura de fêmur/quadril (HR ~2.2)");
    }
    if (dados.tabagismo) {
      riscoMof *= 1.40;
      riscoHip *= 1.65;
      fatores.push("Tabagismo ativo (HR ~1.6)");
    }
    if (dados.glicocorticoide || dados.corticoide) {
      riscoMof *= 1.85;
      riscoHip *= 2.15;
      fatores.push("Glicocorticoide oral crônico >= 5mg/dia prednisona (HR ~2.1)");
    }
    if (dados.artriteReumatoide || dados.ar) {
      riscoMof *= 1.35;
      riscoHip *= 1.45;
      fatores.push("Artrite Reumatoide (HR ~1.4)");
    }
    if (dados.osteoporoseSecundaria) {
      // Se não tem DMO, osteoporose secundária agrega risco independente
      if (dados.dmoColoFemurTScore === undefined || dados.dmoColoFemurTScore === null) {
        riscoMof *= 1.30;
        riscoHip *= 1.40;
      }
      fatores.push("Osteoporose secundária");
    }
    if (dados.alcool || dados.etilismo) {
      riscoMof *= 1.35;
      riscoHip *= 1.50;
      fatores.push("Ingestão de álcool >= 3 doses/dia");
    }

    // Ajuste por DMO do Colo Femoral (T-score)
    let tScore = null;
    let dmoDisponivel = false;
    if (typeof dados.dmoColoFemurTScore === 'number') {
      tScore = dados.dmoColoFemurTScore;
      dmoDisponivel = true;
    } else if (typeof dados.tScoreColoFemur === 'number') {
      tScore = dados.tScoreColoFemur;
      dmoDisponivel = true;
    } else if (typeof dados.tScore === 'number') {
      tScore = dados.tScore;
      dmoDisponivel = true;
    }

    if (dmoDisponivel) {
      if (tScore < -4.0) {
        alertas.push("T-score extremamente reduzido (< -4.0): Risco crítico de fratura iminente.");
      }
      // Gradiente de risco por desvio padrão abaixo do adulto jovem
      // Cada -1 SD aumenta MOF em ~1.5x e Quadril em ~2.2x
      const gradMof = Math.pow(1.50, -tScore);
      const gradHip = Math.pow(2.20, -tScore);
      // Ponderação normalizada pelo valor médio esperado para a idade do paciente
      const tScoreMedioIdade = -0.04 * (idade - 30);
      const fatorNormMof = Math.pow(1.50, tScoreMedioIdade);
      const fatorNormHip = Math.pow(2.20, tScoreMedioIdade);

      riscoMof = riscoMof * gradMof * fatorNormMof;
      riscoHip = riscoHip * gradHip * fatorNormHip;
    }

    // Clamp e arredondamento seguro
    riscoMof = Math.max(0.1, Math.min(85.0, riscoMof));
    riscoHip = Math.max(0.1, Math.min(80.0, riscoHip));
    const mofFinal = parseFloat(riscoMof.toFixed(1));
    const hipFinal = parseFloat(riscoHip.toFixed(1));

    // =========================================================================
    // Estratificação e Limiares de Decisão (ABRASSO / SBGG / NOGG / NOF / ACR)
    // =========================================================================
    // 1. Alto Risco (Tratamento Farmacológico Indicado):
    //    - Risco Quadril >= 3.0% OU Risco MOF >= 20.0%
    //    - OU Fratura clínica prévia de quadril ou vértebra
    //    - OU T-score <= -2.5 no colo femoral / fêmur total / coluna (Critério Densitométrico OMS)
    // 2. Risco Intermediário (Zona Cinzenta / Indicação de Solicitar DMO):
    //    - Risco Quadril entre 1.5% e 2.9% OU MOF entre 10.0% e 19.9%
    // 3. Baixo Risco:
    //    - Quadril < 1.5% E MOF < 10.0%
    let classificacao = "Baixo Risco";
    let indicacaoFarmaco = false;
    let indicacaoDmo = false;
    let justificativaConduta = "";

    const temFraturaGrave = Boolean(dados.fraturaPrevia);
    const temOsteoporoseDensitometrica = dmoDisponivel && tScore <= -2.5;

    if (hipFinal >= 3.0 || mofFinal >= 20.0 || temFraturaGrave || temOsteoporoseDensitometrica) {
      classificacao = "Alto Risco";
      indicacaoFarmaco = true;
      if (temFraturaGrave) {
        justificativaConduta = "Fratura por fragilidade prévia configura Alto Risco de novas fraturas e indicação mandatória de tratamento antirreabsortivo, independentemente do escore numérico.";
      } else if (temOsteoporoseDensitometrica) {
        justificativaConduta = `T-score do colo femoral (${tScore.toFixed(1)}) <= -2.5 define Osteoporose Densitométrica (OMS), com indicação formal de terapia farmacológica.`;
      } else {
        justificativaConduta = `Risco de Fratura de Quadril em 10 anos >= 3.0% (${hipFinal}%) ou Fratura Maior >= 20.0% (${mofFinal}%). Limiar de intervenção farmacológica atingido (ABRASSO/NOF).`;
      }
    } else if (hipFinal >= 1.5 || mofFinal >= 10.0) {
      classificacao = "Risco Intermediário";
      if (!dmoDisponivel) {
        indicacaoDmo = true;
        justificativaConduta = `Risco em zona cinzenta (Quadril: ${hipFinal}%, MOF: ${mofFinal}%). Indicação de solicitar Densitometria Óssea (DXA) para recalcular o FRAX com o T-score e reclassificar o risco.`;
      } else {
        justificativaConduta = `Risco intermediário com DMO conhecida (T-score: ${tScore.toFixed(1)}). Monitorar estilo de vida, suporte de cálcio e vitamina D e repetir DXA em 1 a 2 anos.`;
      }
    } else {
      classificacao = "Baixo Risco";
      justificativaConduta = `Risco em 10 anos baixo (Quadril: ${hipFinal}%, MOF: ${mofFinal}%). Sem indicação de medicação específica no momento. Estimular estilo de vida ativo com exercícios de impacto/resistidos, aporte de cálcio e reavaliação em 3 a 5 anos.`;
    }

    return {
      idade: idade,
      idade_informada: idadeInformada,
      idade_utilizada: idade,
      sexo: ehMasculino ? "Masculino" : "Feminino",
      imc: parseFloat(imc.toFixed(1)),
      t_score: tScore,
      risco_fratura_maior_10a_pct: mofFinal,
      risco_fratura_quadril_10a_pct: hipFinal,
      classificacao_risco: classificacao,
      indicacao_tratamento_farmacologico: indicacaoFarmaco,
      indicacao_solicitar_dmo: indicacaoDmo,
      fatores_risco_identificados: fatores,
      justificativa_conduta: justificativaConduta,
      alertas
    };
  }

  // ===========================================================================
  // 3. PROTOCOLO DE MANEJO DE OSTEOPOROSE, CÁLCIO, VITAMINA D E BISFOSFONATOS
  // ===========================================================================

  /**
   * Avalia e prescreve o manejo da osteoporose e reposição mineral de acordo com diretrizes ABRASSO/SBGG/ACR.
   *
   * @param {object} params
   * @param {boolean} [params.altoRisco=false] Paciente classificado em alto risco de fratura
   * @param {number} [params.calcioDietaMg=500] Consumo dietético diário estimado de cálcio (mg)
   * @param {number} [params.vitaminaD25OH] Nível sérico de 25(OH)Vitamina D em ng/mL
   * @param {number} [params.clcr] Clearance de creatinina estimado (mL/min)
   * @param {number} [params.calcioSerico] Cálcio sérico total em mg/dL
   * @param {boolean} [params.doencaEsofagica=false] Esofagite grave, acalásia, estenose ou Barrett
   * @param {boolean} [params.incapazManterOrtostase=false] Incapacidade de sentar ou ficar em pé por 30-60 min
   * @param {number} [params.tempoUsoBisfosfonatoAnos=0] Anos de uso contínuo de bisfosfonato
   * @param {boolean} [params.emUsoIbp=false] Uso crônico de inibidor de bomba de prótons (omeprazol/etc.)
   * @returns {object}
   */
  static avaliarManejoOsteoporose(params) {
    params = params || {};
    const condutas = [];
    const bloqueios = [];
    const alertas = [];

    // --- A. CÁLCIO ELEMENTAR (Meta: 1.000 a 1.200 mg/dia total) ---
    const calcioDieta = typeof params.calcioDietaMg === 'number' ? params.calcioDietaMg : 500;
    const metaCalcio = 1200;
    const deficitCalcio = Math.max(0, metaCalcio - calcioDieta);
    let prescricaoCalcio = null;

    if (deficitCalcio <= 200) {
      prescricaoCalcio = {
        suplementar: false,
        orientacao: "Ingesta dietética adequada (~" + calcioDieta + " mg/dia). Atingir a meta de 1.200 mg/dia prioritariamente pela dieta (3 porções de laticínios/dia, sementes de gergelim ou vegetais verdes escuros). Não prescrever comprimidos de cálcio."
      };
    } else {
      // Se usa IBP ou tem acloridria/gastrectomia/queixa de constipação importante -> Citrato de Cálcio
      const preferirCitrato = Boolean(params.emUsoIbp);
      if (preferirCitrato) {
        prescricaoCalcio = {
          suplementar: true,
          medicamento: "Citrato de Cálcio 1.000 mg (fornece ~210 mg de Cálcio elementar)",
          posologia: deficitCalcio > 600 ? "Tomar 1 comprimido VO, 2 a 3 vezes ao dia." : "Tomar 1 comprimido VO, 1 a 2 vezes ao dia.",
          instrucao: "Absorção independente do pH ácido gástrico (ideal para usuários crônicos de IBP e menor incidência de constipação/dispepsia)."
        };
      } else {
        prescricaoCalcio = {
          suplementar: true,
          medicamento: "Carbonato de Cálcio 1.250 mg (fornece 500 mg de Cálcio elementar)",
          posologia: deficitCalcio > 600 ? "Tomar 1 comprimido VO, 2 vezes ao dia (junto ao almoço e jantar)." : "Tomar 1 comprimido VO, 1 vez ao dia (junto à principal refeição).",
          instrucao: "Obrigatoriamente administrado junto ou logo após as refeições para dependência da acidez gástrica fisiológica. Fracionar se dose > 500 mg elementar por tomada para máxima absorção."
        };
      }
    }
    alertas.push("Segurança Mineral: Teto diário seguro de cálcio total (dieta + suplemento) não deve ultrapassar 1.500-2.000 mg/dia para prevenir nefrolitíase e calcificação vascular.");

    // --- B. VITAMINA D (COLECALCIFEROL) ---
    let prescricaoVitD = null;
    const vitD = typeof params.vitaminaD25OH === 'number' ? params.vitaminaD25OH :
                 (typeof params.vitaminaD === 'number' ? params.vitaminaD :
                 (typeof params.vitD === 'number' ? params.vitD : null));

    if (typeof vitD === 'number') {
      if (vitD < 20) {
        prescricaoVitD = {
          status: "Deficiência (< 20 ng/mL)",
          esquema_ataque: "Colecalciferol (Vitamina D3) 50.000 UI VO 1x por semana por 8 semanas consecutivas (total 400.000 UI).",
          esquema_manutencao: "Após 8 semanas, dosar 25(OH)D e manter 1.000 a 2.000 UI/dia VO (ou 7.000 a 14.000 UI/semana).",
          alvo: "Manter 25(OH)D sérica entre 30 e 60 ng/mL para idosos frágeis, osteoporóticos ou com risco de quedas."
        };
      } else if (vitD < 30) {
        prescricaoVitD = {
          status: "Insuficiência em Idoso de Risco (20 a 29 ng/mL)",
          esquema_manutencao: "Colecalciferol (Vitamina D3) 1.000 a 2.000 UI/dia VO (ou 7.000 a 14.000 UI/semana em dose única).",
          alvo: "Manter 25(OH)D sérica entre 30 e 60 ng/mL."
        };
      } else if (vitD <= 60) {
        prescricaoVitD = {
          status: "Suficiente / Ótimo (30 a 60 ng/mL)",
          esquema_manutencao: "Manter suporte fisiológico com Colecalciferol 800 a 1.000 UI/dia VO (ou exposição solar orientada de braços e pernas 15 min/dia).",
          alvo: "Faixa terapêutica ideal atingida."
        };
      } else if (vitD > 100) {
        bloqueios.push({
          tipo: "HIPERVITAMINOSE_D",
          descricao: "🚨 Nível sérico de 25(OH)D tóxico (> 100 ng/mL). Suspender imediatamente qualquer reposição de Vitamina D e cálcio. Monitorar cálcio sérico, calciúria de 24h e creatinina."
        });
        prescricaoVitD = { status: "Toxicidade (> 100 ng/mL)", conduta: "SUSPENDER suplementação imediatamente." };
      }
    } else {
      prescricaoVitD = {
        status: "Nível sérico não informado",
        esquema_manutencao: "Em idosos com risco de osteoporose/quedas sem dosagem recente, prescrever dose de suporte de Colecalciferol 1.000 a 2.000 UI/dia VO e solicitar dosagem de 25(OH)Vitamina D."
      };
    }
    alertas.push("Contraindicação Sentinela de Megadose: PROIBIDO o uso de megadoses orais em dose única anual (ex: 500.000 UI em bolus), pois ensaios clínicos demonstraram aumento paradoxal de quedas e fraturas em idosos.");

    // Alerta Odontológico / ONJ (AAOMS / ABRASSO)
    if (params.procedimentoOdontologicoPendente) {
      alertas.push("🚨 PROCEDIMENTO ODONTOLÓGICO INVASIVO PENDENTE: Alto risco de Osteonecrose dos Maxilares (ONJ). Realizar todos os procedimentos dentários invasivos e assegurar cicatrização completa da mucosa antes de iniciar antirreabsortivos.");
    }

    // Alerta de Drug Holiday (Pausa Terapêutica após 3-5 anos)
    if (typeof params.tempoUsoBisfosfonatoAnos === 'number' && params.tempoUsoBisfosfonatoAnos >= 3) {
      alertas.push(`⚠️ ALERTA DE DRUG HOLIDAY (PAUSA TERAPÊUTICA): Paciente em uso de bisfosfonato há ${params.tempoUsoBisfosfonatoAnos} anos. Reavaliar risco com nova DMO. Se risco moderado/baixo e ausência de novas fraturas, indicar pausa temporária de 1 a 2 anos ("Drug Holiday") para prevenir Fratura Atípica de Fêmur e Osteonecrose de Mandíbula (ONJ).`);
    }

    // --- C. TERAPIA ANTIRREABSORTIVA / BISFOSFONATOS (ALENDRONATO) ---
    const ehAltoRisco = Boolean(params.altoRisco) || (typeof params.tScore === 'number' && params.tScore <= -2.5) || Boolean(params.fraturaPrevia);
    let prescricaoBisfosfonato = null;

    if (ehAltoRisco) {
      let impedimentoBisfosfonato = false;

      // 1. Bloqueio Renal Estrito (ClCr < 35 mL/min)
      if (typeof params.clcr === 'number' && params.clcr < 35) {
        impedimentoBisfosfonato = true;
        bloqueios.push({
          tipo: "CONTRAINDICACAO_RENAL_BISFOSFONATO",
          descricao: `🚨 BLOQUEIO RENAL ABSOLUTO / CONTRAINDICAÇÃO FORMAL A BISFOSFONATOS (ClCr ${params.clcr} mL/min < 35 mL/min): Risco de nefrotoxicidade grave e osso adinâmico. Bisfosfonatos orais e IV estão terminantemente contraindicados. Opção de escolha: Denosumabe 60 mg SC semestral (com especialista) após assegurar níveis de cálcio e vitamina D.`
        });
      }

      // 2. Bloqueio de Hipocalcemia Prévia
      if (typeof params.calcioSerico === 'number' && params.calcioSerico < 8.5) {
        impedimentoBisfosfonato = true;
        bloqueios.push({
          tipo: "CONTRAINDICACAO_HIPOCALCEMIA",
          descricao: `🚨 BLOQUEIO DE HIPOCALCEMIA / CONTRAINDICAÇÃO TEMPORÁRIA: Hipocalcemia sérica (${params.calcioSerico} mg/dL < 8.5 mg/dL). O bisfosfonato não deve ser iniciado antes da normalização estrita dos níveis de cálcio e vitamina D, sob risco iminente de hipocalcemia grave refratária e tetania.`
        });
      }

      // 3. Bloqueio Esofágico / Ortostase
      if (params.doencaEsofagica || params.incapazManterOrtostase) {
        impedimentoBisfosfonato = true;
        bloqueios.push({
          tipo: "CONTRAINDICACAO_ESOFAGICA_ORAL",
          descricao: "🚨 BLOQUEIO ESOFÁGICO / CONTRAINDICAÇÃO AO ALENDRONATO ORAL: Esofagopatia grave (refluxo severo, estenose, acalásia) ou incapacidade de manter ortostase/tronco ereto por 30-60 minutos. Risco elevado de esofagite erosiva severa e perfuração esofágica. Alternativa: Ácido Zoledrônico 5 mg IV anual (se ClCr >= 35) ou Denosumabe."
        });
      }

      // Se apto sem bloqueios
      if (!impedimentoBisfosfonato) {
        prescricaoBisfosfonato = {
          medicamento: "Alendronato de Sódio 70 mg VO",
          posologia: "Tomar 1 comprimido por via oral, 1 vez por semana, sempre no mesmo dia.",
          instrucoes_ouro: [
            "1. Ingerir pela manhã, em JEJUM ABSOLUTO, logo ao acordar, com 1 copo cheio de água pura filtrada (200 mL). Proibido água mineral gasosa, café, sucos ou leite.",
            "2. Não mastigar, não chupar e não triturar o comprimido.",
            "3. Permanecer na posição ereta (em pé ou sentado ereto) por no mínimo 30 a 60 minutos após a tomada. PROIBIDO DEITAR.",
            "4. Aguardar pelo menos 30 a 60 minutos antes de ingerir o café da manhã, alimentos ou qualquer outro medicamento."
          ]
        };
      }
    } else {
      prescricaoBisfosfonato = {
        indicado: false,
        motivo: "Paciente sem critérios de Alto Risco de fratura no momento. Manter profilaxia não medicamentosa (cálcio dietético, vitamina D e exercícios)."
      };
    }

    return {
      calcio: prescricaoCalcio,
      vitamina_d: prescricaoVitD,
      bisfosfonato: prescricaoBisfosfonato,
      bloqueios_seguranca: bloqueios,
      alertas_clinicos: alertas
    };
  }

  // ===========================================================================
  // 4. REVISÃO DE POLIFARMÁCIA E RISCO DE QUEDAS (QT LONGO E HIPOTENSÃO ORTOSTÁTICA)
  // ===========================================================================

  /**
   * Identifica drogas com alto risco de prolongar intervalo QTc, causar hipotensão ortostática,
   * sedação/ataxia (FRIDs) e potenciais inadequações pelos Critérios de Beers AGS 2023.
   *
   * @param {Array<string>} listaMedicamentos
   * @param {object} [dadosClinicos] Dados de PA deitada/em pé e ECG
   * @returns {object}
   */
  static revisarPolifarmaciaERiscoQuedas(listaMedicamentos, dadosClinicos) {
    listaMedicamentos = Array.isArray(listaMedicamentos) ? listaMedicamentos : [];
    dadosClinicos = dadosClinicos || {};
    const qtde = listaMedicamentos.length;
    const polifarmacia = qtde >= 5;
    const hiperpolifarmacia = qtde >= 10;

    // A. DROGAS QUE PROLONGAM O INTERVALO QTc (Risco de Torsades de Pointes, Síncope e Quedas Arrítmicas)
    const regexQt = {
      'Antiarrítmicos (Amiodarona, Sotalol)': /(amiodarona|ancoron|sotalol|quinidina|procainamida|dofetilida)/i,
      'Antipsicóticos (Haloperidol, Quetiapina, Risperidona, Clorpromazina)': /(haloperidol|quetiapina|risperidona|clorpromazina|levomepromazina|olanzapina|ziprasidona|aripiprazol)/i,
      'Antidepressivos (Citalopram, Escitalopram, Tricíclicos)': /(citalopram|escitalopram|amitriptilina|nortriptilina|clomipramina|imipramina|fluoxetina)/i,
      'Macrolídeos e Quinolonas (Azitromicina, Claritromicina, Levofloxacino)': /(azitromicina|claritromicina|eritromicina|levofloxacino|moxifloxacino|ciprofloxacino)/i,
      'Antifúngicos Azólicos (Fluconazol, Voriconazol)': /(fluconazol|itraconazol|cetoconazol|voriconazol)/i,
      'Antieméticos e Procinéticos (Ondansetrona, Metoclopramida)': /(ondansetrona|metoclopramida|domperidona)/i,
      'Outros (Metadona, Cloroquina)': /(metadona|cloroquina|hidroxicloroquina)/i
    };

    // B. DROGAS QUE CAUSAM HIPOTENSÃO ORTOSTÁTICA (Risco de Hipofluxo Cerebral, Tontura ao Levantar e Quedas)
    const regexHipotensao = {
      'Bloqueadores Alfa-1 (Doxazosina, Terazosina)': /(doxazosina|terazosina|prazosina)/i,
      'Anti-hipertensivos Centrais e Vasodilatadores (Clonidina, Metildopa, Hidralazina)': /(clonidina|metildopa|hidralazina|minoxidil)/i,
      'Diuréticos Potentes em Altas Doses (Furosemida, Hidroclorotiazida)': /(furosemida|hidroclorotiazida|clortalidona|indapamida|espironolactona)/i,
      'Nitratos Vasodilatadores (Mononitrato, Dinitrato, Nitroglicerina)': /(mononitrato|dinitrato|nitroglicerina|isossorbida|sustrate)/i,
      'Antidepressivos Alfa-Bloqueadores (Amitriptilina, Trazodona)': /(trazodona|amitriptilina|nortriptilina|mirtazapina)/i,
      'Antiparkinsonianos Dopaminérgicos (Levodopa, Pramipexol)': /(levodopa|prolopa|pramipexol|ropinirol|rotigotina)/i,
      'Inibidores da PDE-5 (Sildenafila, Tadalafila)': /(sildenafila|tadalafila|vardenafila)/i
    };

    // C. FRIDs - DROGAS QUE AUMENTAM RISCO DE QUEDA POR SEDAÇÃO E ATAXIA
    const regexFrids = {
      'Benzodiazepínicos (Diazepam, Clonazepam, Alprazolam)': /(diazepam|clonazepam|alprazolam|bromazepam|lorazepam|midazolam)/i,
      'Hipnóticos Drogas Z (Zolpidem, Zopiclona)': /(zolpidem|zopiclona|eszopiclona)/i,
      'Opióides (Tramadol, Codeína, Morfina)': /(tramadol|codeina|morfina|oxicodona|fentanil)/i,
      'Relaxantes Musculares (Ciclobenzaprina, Carisoprodol)': /(ciclobenzaprina|carisoprodol|orfenadrina|baclofeno)/i,
      'Anti-histamínicos Sedativos 1ª Geração (Prometazina, Polaramine)': /(prometazina|dexclorfeniramina|hidroxizina|difenidramina)/i,
      'Anticonvulsivantes Sedativos e Gabapentinoides': /(gabapentina|pregabalina|fenobarbital|carbamazepina|fenitoina)/i
    };

    const drogasQtIdentificadas = [];
    const drogasHipotensaoIdentificadas = [];
    const drogasFridsIdentificadas = [];

    listaMedicamentos.forEach(med => {
      for (const [classe, rx] of Object.entries(regexQt)) {
        if (rx.test(med) && !drogasQtIdentificadas.some(d => d.medicamento === med)) {
          drogasQtIdentificadas.push({ medicamento: med, classe });
        }
      }
      for (const [classe, rx] of Object.entries(regexHipotensao)) {
        if (rx.test(med) && !drogasHipotensaoIdentificadas.some(d => d.medicamento === med)) {
          drogasHipotensaoIdentificadas.push({ medicamento: med, classe });
        }
      }
      for (const [classe, rx] of Object.entries(regexFrids)) {
        if (rx.test(med) && !drogasFridsIdentificadas.some(d => d.medicamento === med)) {
          drogasFridsIdentificadas.push({ medicamento: med, classe });
        }
      }
    });

    // Análise de Critérios de Beers (AGS 2023)
    const beersBase = this.avaliarFarmacosBeers(listaMedicamentos);

    // Alertas de Risco Combinado
    const alertasCriticos = [];
    if (drogasQtIdentificadas.length >= 2) {
      alertasCriticos.push("🚨 ALERTA VERMELHO DE QT LONGO: Identificada combinação de 2 ou mais drogas com potencial de prolongamento do intervalo QTc (" + drogasQtIdentificadas.map(d => d.medicamento).join(", ") + "). Risco exponencial de Torsades de Pointes, síncope arrítmica e parada cardíaca. Realizar ECG com cálculo de QTc e desprescrever.");
    } else if (drogasQtIdentificadas.length === 1) {
      alertasCriticos.push("⚠️ Risco de QT Longo: Presente " + drogasQtIdentificadas[0].medicamento + ". Evitar associação com outros fármacos arritmogênicos e dosar K+ e Mg2+.");
    }

    if (drogasHipotensaoIdentificadas.length >= 2) {
      alertasCriticos.push("🚨 ALERTA DE HIPOTENSÃO ORTOSTÁTICA SEVERA: Combinação de múltiplos agentes hipotensores/vasodilatadores (" + drogasHipotensaoIdentificadas.map(d => d.medicamento).join(", ") + "). Alto risco de hipofluxo cerebral ao levantar, tontura e síncope motora.");
    }

    // Avaliação Clínica de Hipotensão Ortostática
    let hipotensaoClinica = null;
    if (typeof dadosClinicos.pasDeitado === 'number' && typeof dadosClinicos.pasEmPe === 'number') {
      const deltaPas = dadosClinicos.pasDeitado - dadosClinicos.pasEmPe;
      const deltaPad = (typeof dadosClinicos.padDeitado === 'number' && typeof dadosClinicos.padEmPe === 'number')
        ? dadosClinicos.padDeitado - dadosClinicos.padEmPe : 0;
      const confirmada = deltaPas >= 20 || deltaPad >= 10;
      hipotensaoClinica = {
        pas_deitado: dadosClinicos.pasDeitado,
        pas_em_pe: dadosClinicos.pasEmPe,
        delta_pas: deltaPas,
        delta_pad: deltaPad,
        diagnostico_confirmado: confirmada,
        orientacao: confirmada
          ? "Hipotensão Ortostática CONFIRMADA (Queda de PAS >= 20 mmHg ou PAD >= 10 mmHg). Condutas: (1) Desprescrição prioritária de alfa-bloqueadores e ajuste de anti-hipertensivos; (2) Orientar levantar em 2 etapas (sentar na cama por 1-2 min antes de ficar em pé); (3) Manter hidratação de 1.5 a 2.0 L/dia; (4) Uso de meias elásticas de média compressão."
          : "Variação pressórica fisiológica na posição ortostática (sem critérios para hipotensão ortostática no momento)."
      };
      if (confirmada) {
        alertasCriticos.push("🚨 HIPOTENSÃO ORTOSTÁTICA DOCUMENTADA À BEIRA-LEITO: Queda de " + deltaPas + " mmHg na PAS ao ficar em pé.");
      }
    }

    // Avaliação de QTc no ECG
    if (typeof dadosClinicos.qtcMs === 'number') {
      if (dadosClinicos.qtcMs > 500) {
        alertasCriticos.push("🚨 QTc CRÍTICO NO ECG (" + dadosClinicos.qtcMs + " ms > 500 ms): Risco iminente de arritmia ventricular por Torsades de Pointes. Suspender fármacos prolongadores de QT e corrigir eletrólitos.");
      } else if (dadosClinicos.qtcMs > 480) {
        alertasCriticos.push("⚠️ QTc LIMÍTROFE/AUMENTADO (" + dadosClinicos.qtcMs + " ms > 480 ms): Vigilância redobrada e contraindicação de novas drogas arritmogênicas.");
      }
    }

    // Estratificação de Risco Iatrogênico de Quedas
    let scoreQuedas = 0;
    if (polifarmacia) scoreQuedas += 1;
    if (hiperpolifarmacia) scoreQuedas += 1;
    scoreQuedas += drogasFridsIdentificadas.length * 2;
    scoreQuedas += drogasHipotensaoIdentificadas.length * 1.5;
    scoreQuedas += drogasQtIdentificadas.length * 1.5;
    if (hipotensaoClinica && hipotensaoClinica.diagnostico_confirmado) scoreQuedas += 3;

    let nivelRiscoIatrogenico = "Baixo";
    if (scoreQuedas >= 7) nivelRiscoIatrogenico = "Crítico";
    else if (scoreQuedas >= 4) nivelRiscoIatrogenico = "Alto";
    else if (scoreQuedas >= 2) nivelRiscoIatrogenico = "Moderado";

    return {
      quantidade_medicamentos: qtde,
      polifarmacia,
      hiperpolifarmacia,
      nivel_risco_iatrogenico_quedas: nivelRiscoIatrogenico,
      score_iatrogenico_quedas: parseFloat(scoreQuedas.toFixed(1)),
      drogas_prolongamento_qt: drogasQtIdentificadas,
      drogas_hipotensao_ortostatica: drogasHipotensaoIdentificadas,
      drogas_sedativas_frids: drogasFridsIdentificadas,
      criterios_beers: beersBase,
      hipotensao_ortostatica_clinica: hipotensaoClinica,
      alertas_criticos: alertasCriticos,
      conduta_desprescricao: (nivelRiscoIatrogenico === "Alto" || nivelRiscoIatrogenico === "Crítico")
        ? "Revisão imediata de polifarmácia mandatória. Priorizar desmame gradual de benzodiazepínicos e drogas Z, reavaliar alfa-bloqueadores prostáticos e evitar politerapia com potencial de QT longo."
        : "Revisão periódica de rotina recomendada a cada 6 meses."
    };
  }

  // ===========================================================================
  // 5. RESUMO INTEGRADO E PLANO GERIÁTRICO COMPLETO
  // ===========================================================================

  /**
   * Executa a Avaliação Geriátrica Ampla (AGA) completa, integrando fragilidade, cognição,
   * mobilidade (TUG), FRAX Brasil, manejo de osteoporose e auditoria de polifarmácia.
   *
   * @param {object} dados
   * @returns {object}
   */
  static gerarResumoAga(dados) {
    dados = dados || {};
    const { cfs, miniCog, tug, farmacos, frax, osteoporose, dadosClinicos } = dados;
    let resultado = {};

    if (cfs) resultado.fragilidade = this.avaliarFragilidadeCFS(cfs.score);
    if (miniCog) resultado.cognicao = this.avaliarMiniCog(miniCog.palavras, miniCog.relogioNormal);
    if (tug) resultado.risco_quedas = this.avaliarRiscoQuedasTUG(tug.tempo);
    
    // Suporte a polifarmácia avançada ou básica
    if (farmacos && Array.isArray(farmacos.lista)) {
      resultado.farmacologia_avancada = this.revisarPolifarmaciaERiscoQuedas(farmacos.lista, dadosClinicos || {});
      resultado.farmacologia = resultado.farmacologia_avancada.criterios_beers;
    }

    // Calculadora FRAX
    if (frax) {
      resultado.frax_brasil = this.calcularFraxBrasil(frax);
    }

    // Manejo de Osteoporose
    if (osteoporose || (resultado.frax_brasil && resultado.frax_brasil.classificacao_risco === 'Alto Risco')) {
      const paramOsteo = Object.assign({}, osteoporose || {}, {
        altoRisco: osteoporose?.altoRisco ?? (resultado.frax_brasil ? resultado.frax_brasil.classificacao_risco === 'Alto Risco' : false)
      });
      resultado.osteoporose_manejo = this.avaliarManejoOsteoporose(paramOsteo);
    }

    // Medidas não farmacológicas gerais de prevenção de quedas no domicílio
    resultado.prevencao_quedas_domicilio = [
      "Banheiro: Instalar barras de apoio ao lado do vaso sanitário e dentro do box; usar tapete de borracha antiderrapante fixo.",
      "Iluminação: Manter luz noturna suave no corredor entre o quarto e o banheiro.",
      "Móveis e Passagem: Retirar tapetes soltos em toda a residência; prender fios elétricos rentes ao rodapé.",
      "Calçados: Usar sapatos fechados com sola antiderrapante; evitar chinelos soltos ou caminhar apenas de meias.",
      "Atividade Física: Estimular fisioterapia motora e exercícios resistidos com treino de equilíbrio e marcha (ex: Tai Chi Chuan / fortalecimento de quadríceps)."
    ];

    return resultado;
  }

  /**
   * Parser inteligente de texto livre para comandos do Telegram ou consultas rápidas.
   * Permite extrair idade, sexo, peso, altura, T-score, fatores de risco e lista de fármacos.
   *
   * @param {string} texto
   * @returns {object}
   */
  static interpretarTextoLivre(texto) {
    texto = String(texto || "").trim();
    if (!texto) return { erro: "Texto vazio informado." };

    const cenario = {
      frax: {},
      osteoporose: {},
      farmacos: { lista: [] },
      dadosClinicos: {}
    };

    // Idade
    const mIdade = texto.match(/(\d{2})\s*(?:anos|a\b)/i) || texto.match(/idade\s*[:=]?\s*(\d{2})/i);
    if (mIdade) cenario.frax.idade = parseInt(mIdade[1], 10);

    // Sexo
    if (/\b(homem|masculino|masc|m\b)/i.test(texto)) cenario.frax.sexo = 'M';
    if (/\b(mulher|feminino|fem|f\b)/i.test(texto)) cenario.frax.sexo = 'F';

    // Peso e Altura
    const mPeso = texto.match(/(\d{2,3}(?:[.,]\d)?)\s*kg/i);
    if (mPeso) cenario.frax.peso = parseFloat(mPeso[1].replace(',', '.'));

    const mAltura = texto.match(/(\d{2,3})\s*cm/i) || texto.match(/1[.,]\d{2}\s*m/i);
    if (mAltura) {
      let altVal = parseFloat(mAltura[0].replace(',', '.'));
      if (altVal < 3) altVal = Math.round(altVal * 100);
      cenario.frax.altura = altVal;
    }

    // T-Score da DMO
    const mTScore = texto.match(/t[-_]?score\s*[:=]?\s*(-?\d+[.,]?\d*)/i) || texto.match(/dmo\s*[:=]?\s*(-?\d+[.,]?\d*)/i);
    if (mTScore) cenario.frax.dmoColoFemurTScore = parseFloat(mTScore[1].replace(',', '.'));

    // Fatores de risco FRAX
    if (/fratura\s*(?:previa|anterior|fragilidade|femur|quadril|coluna)/i.test(texto)) cenario.frax.fraturaPrevia = true;
    if (/(?:pais|pai|mae)\s*(?:com)?\s*fratura/i.test(texto)) cenario.frax.paisFraturaQuadril = true;
    if (/\b(fuma|fumante|tabagista|cigarro)\b/i.test(texto)) cenario.frax.tabagismo = true;
    if (/(?:corticoide|prednisona|dexametasona)/i.test(texto)) cenario.frax.glicocorticoide = true;
    if (/(?:artrite\s*reumatoide|ar\b)/i.test(texto)) cenario.frax.artriteReumatoide = true;
    if (/(?:osteoporose\s*secundaria|dm1|hipertireoidismo)/i.test(texto)) cenario.frax.osteoporoseSecundaria = true;
    if (/(?:etilista|alcool|cerveja|doses)/i.test(texto)) cenario.frax.alcool = true;

    // Vitamina D sérica
    const mVitD = texto.match(/vit(?:amina)?\s*d\s*[:=]?\s*(\d+[.,]?\d*)/i) || texto.match(/25\(?oh\)?d?\s*[:=]?\s*(\d+[.,]?\d*)/i);
    if (mVitD) cenario.osteoporose.vitaminaD25OH = parseFloat(mVitD[1].replace(',', '.'));

    // ClCr
    const mClcr = texto.match(/(?:clcr|clearance|tfg)\s*[:=]?\s*(\d+)/i);
    if (mClcr) cenario.osteoporose.clcr = parseInt(mClcr[1], 10);

    // Cálcio sérico
    const mCa = texto.match(/ca(?:lcio)?\s*(?:serico)?\s*[:=]?\s*(\d+[.,]?\d*)/i);
    if (mCa) cenario.osteoporose.calcioSerico = parseFloat(mCa[1].replace(',', '.'));

    // CFS, TUG, Mini-Cog
    const mCfs = texto.match(/cfs\s*(\d)/i);
    if (mCfs) cenario.cfs = { score: parseInt(mCfs[1], 10) };

    const mTug = texto.match(/tug\s*(\d+)/i);
    if (mTug) cenario.tug = { tempo: parseInt(mTug[1], 10) };

    const mPalavras = texto.match(/minicog.*?(\d)\s*palavra/i);
    if (mPalavras) {
      cenario.miniCog = {
        palavras: parseInt(mPalavras[1], 10),
        relogioNormal: !/relogio\s*(?:alt|alterado|errado)/i.test(texto)
      };
    }

    // PA deitada e em pé
    const mPa = texto.match(/pa\s*[:=]?\s*(\d{2,3})[x/](\d{2,3})/i);
    if (mPa) {
      cenario.dadosClinicos.pasDeitado = parseInt(mPa[1], 10);
      cenario.dadosClinicos.padDeitado = parseInt(mPa[2], 10);
    }
    const mPaPe = texto.match(/em\s*pe\s*[:=]?\s*(\d{2,3})[x/](\d{2,3})/i);
    if (mPaPe) {
      cenario.dadosClinicos.pasEmPe = parseInt(mPaPe[1], 10);
      cenario.dadosClinicos.padEmPe = parseInt(mPaPe[2], 10);
    }

    // QTc
    const mQtc = texto.match(/qtc\s*[:=]?\s*(\d{3})/i);
    if (mQtc) cenario.dadosClinicos.qtcMs = parseInt(mQtc[1], 10);

    // Fármacos listados
    const mFarm = texto.match(/(?:usa|medicamentos?|remedios?|toma|farmacos?)\s*[:=]?\s*([^\n.;]+)/i);
    if (mFarm) {
      cenario.farmacos.lista = mFarm[1].split(/[,;]|\s+e\s+/i).map(s => s.trim()).filter(s => s.length > 2);
    }

    const resultado = this.gerarResumoAga(cenario);
    resultado._cenario = cenario;
    return resultado;
  }

  // ===========================================================================
  // 6. ALIASES E MÉTODOS DE INTEGRAÇÃO COCKPIT / TELEGRAM
  // ===========================================================================

  static calcularFrax(params) {
    var raw = this.calcularFraxBrasil(params);
    var categoriaRisco = raw.classificacao_risco.toUpperCase();
    if (raw.risco_fratura_quadril_10a_pct >= 4.5 || raw.risco_fratura_maior_10a_pct >= 30.0) {
      categoriaRisco = "MUITO ALTO RISCO";
    }
    return Object.assign({}, raw, {
      idade: (raw.idade_informada !== undefined && raw.idade_informada !== null) ? raw.idade_informada : raw.idade,
      categoria_risco: categoriaRisco,
      tem_dmo: raw.t_score !== null && raw.t_score !== undefined,
      t_score_colo_femur: raw.t_score,
      risco_fratura_maior_pct: raw.risco_fratura_maior_10a_pct,
      risco_fratura_quadril_pct: raw.risco_fratura_quadril_10a_pct,
      necessidade_dmo: raw.indicacao_solicitar_dmo,
      fatores_risco: {
        fratura_previa: Boolean(params.fraturaPrevia),
        pais_fratura_quadril: Boolean(params.paisFraturaQuadril),
        tabagismo: Boolean(params.tabagismo),
        corticoide_cronico: Boolean(params.glicocorticoide || params.corticoide),
        artrite_reumatoide: Boolean(params.artriteReumatoide || params.ar),
        osteoporose_secundaria: Boolean(params.osteoporoseSecundaria),
        etilismo: Boolean(params.alcool || params.etilismo)
      },
      conduta: raw.justificativa_conduta,
      conduta_beira_leito: [
        "Incentivar ingestão adequada de cálcio (meta 1.000 a 1.200 mg/dia, preferencialmente pela dieta).",
        "Assegurar níveis adequados de 25(OH)Vitamina D (alvo 30 a 60 ng/mL no idoso/risco de fraturas).",
        "Prescrever atividade física resistida e com impacto progressivo para estímulo osteogênico.",
        "Cessação terminante do tabagismo e moderação alcoólica.",
        "Orientar medidas de prevenção de quedas domiciliares e revisão de drogas sedativas/hipotensoras."
      ],
      criterios_encaminhamento_especialista: [
        "Fraturas por fragilidade recorrentes em vigência de tratamento adequado por > 12-24 meses (falha terapêutica).",
        "Contraindicações a bisfosfonatos orais/IV (ex: DRC grave com ClCr < 35 mL/min, exigindo Denosumabe).",
        "Suspeita de fratura atípica de fêmur ou osteonecrose dos maxilares.",
        "Osteoporose muito grave com indicação de anabólicos ósseos (ex: Teriparatida / Romosozumabe)."
      ]
    });
  }

  static interpretarTextoLivreFrax(texto) {
    var res = this.interpretarTextoLivre(texto);
    var paramFrax = (res._cenario && res._cenario.frax) ? res._cenario.frax : (res.frax || {});
    if (!paramFrax.idade) {
      var mId = texto.match(/(\d{2})\s*(?:anos|a\b)/i);
      paramFrax.idade = mId ? parseInt(mId[1], 10) : 65;
    }
    return this.calcularFrax(paramFrax);
  }

  static avaliarOsteoporose(params) {
    params = params || {};
    var tScore = typeof params.tScore === 'number' ? params.tScore : (typeof params.dmoColoFemurTScore === 'number' ? params.dmoColoFemurTScore : null);
    if (tScore !== null && tScore <= -2.5) {
      params.altoRisco = true;
    }
    if (params.fraturaPrevia) {
      params.altoRisco = true;
    }
    var raw = this.avaliarManejoOsteoporose(params);
    var classDiag = "Normal (T-score >= -1.0)";
    if (params.fraturaPrevia) {
      classDiag = (tScore !== null && tScore <= -2.5) ? "Osteoporose Grave (Estabelecida)" : "Osteoporose Clínica (Fratura por Fragilidade Prévia)";
    } else if (tScore !== null) {
      if (tScore <= -2.5) classDiag = "Osteoporose";
      else if (tScore < -1.0) classDiag = "Osteopenia";
    }

    var esquema = "Medidas não farmacológicas e suporte nutricional de cálcio e vitamina D.";
    if (raw.bloqueios_seguranca && raw.bloqueios_seguranca.length > 0) {
      if (typeof params.clcr === 'number' && params.clcr < 35) {
        esquema = "DENOSUMABE 60 mg SC semestral (Droga de escolha em ClCr < 35 mL/min — não depurado pelos rins).";
      } else if (typeof params.calcioSerico === 'number' && params.calcioSerico < 8.5) {
        esquema = "AGUARDAR: Corrigir hipocalcemia sérica antes do início de qualquer antirreabsortivo.";
      } else if (params.doencaEsofagica || params.incapazManterOrtostase) {
        esquema = "ÁCIDO ZOLEDRÔNICO 5 mg IV anual em infusão lenta (ou Denosumabe SC).";
      } else {
        esquema = "⚠️ Terapia antirreabsortiva oral bloqueada por critérios de segurança clínica.";
      }
    } else if (raw.bisfosfonato && raw.bisfosfonato.medicamento) {
      var medStr = String(raw.bisfosfonato.medicamento);
      var medUpper = medStr.replace(/alendronato de sódio/i, 'ALENDRONATO DE SÓDIO');
      esquema = medUpper + " - " + raw.bisfosfonato.posologia;
    }

    var protoCalcio = [];
    if (raw.calcio) {
      if (raw.calcio.suplementar) {
        protoCalcio.push(raw.calcio.medicamento + ": " + raw.calcio.posologia);
        protoCalcio.push(raw.calcio.instrucao);
      } else {
        protoCalcio.push(raw.calcio.orientacao);
      }
    }
    protoCalcio.push("Meta total de cálcio elementar: 1.000 a 1.200 mg/dia (teto de segurança máximo de 2.000 mg/dia).");
    protoCalcio.push("Segurança: NUNCA prescrever suplementação que exceda 2.000 mg/dia de cálcio total.");

    var protoVitD = "Colecalciferol: Manter suporte diário de 1.000 a 2.000 UI/dia VO (alvo 30 a 60 ng/mL). PROIBIDO prescrever megadoses anuais em bolus único.";
    if (raw.vitamina_d) {
      if (raw.vitamina_d.esquema_ataque) {
        protoVitD = raw.vitamina_d.esquema_ataque + " Manutenção subsequente: " + raw.vitamina_d.esquema_manutencao + " (PROIBIDO prescrever megadoses anuais em bolus único).";
      } else if (raw.vitamina_d.esquema_manutencao) {
        protoVitD = raw.vitamina_d.esquema_manutencao + " (PROIBIDO prescrever megadoses anuais em bolus único).";
      }
    }

    var instrucoesAlendronato = (raw.bisfosfonato && raw.bisfosfonato.instrucoes_ouro) ? raw.bisfosfonato.instrucoes_ouro : [
      "Tomar em jejum ao despertar com copo cheio de água pura (200 mL).",
      "Não deitar por no mínimo 30 a 60 minutos (manter tronco ereto).",
      "Aguardar 30 a 60 minutos antes do café da manhã ou outras medicações."
    ];

    var bloqueiosTxt = raw.bloqueios_seguranca.map(function(b){ return b.descricao; });

    return {
      classificacao_diagnostica: classDiag,
      indicacao_tratamento: Boolean(params.altoRisco || (raw.bisfosfonato && raw.bisfosfonato.medicamento) || (tScore !== null && tScore <= -2.5) || params.fraturaPrevia),
      esquema_recomendado: esquema,
      alternativas: [
        "Ácido Zoledrônico 5 mg IV anual em infusão lenta com hidratação prévia (se intolerância gástrica ao oral e ClCr >= 35 mL/min).",
        "Denosumabe 60 mg SC semestral (opção preferencial se ClCr < 35 mL/min após correção de cálcio sérico; atenção ao risco de efeito rebote de fraturas vertebrais se descontinuado sem transição).",
        "Avaliar suspensão programada ('Drug Holiday') após 3 a 5 anos de uso em pacientes estabilizados."
      ],
      bloqueios_seguranca: bloqueiosTxt,
      alertas: raw.alertas_clinicos,
      protocolo_vitamina_d: protoVitD,
      protocolo_calcio: protoCalcio,
      orientacoes_ingestao_alendronato: instrucoesAlendronato,
      criterios_encaminhamento_especialista: [
        "Clearance de Creatinina < 35 mL/min requerendo planejamento de Denosumabe.",
        "Fratura de fragilidade em paciente em uso contínuo e regular de bisfosfonato.",
        "Dor em coxa ou virilha (suspeita de fratura atípica de fêmur) ou dor mandibular (osteonecrose).",
        "Hipercalcemia ou hipercalciúria concomitante."
      ]
    };
  }

  static interpretarTextoLivreOsteoporose(texto) {
    var res = this.interpretarTextoLivre(texto);
    var cenario = res._cenario || {};
    var param = Object.assign({}, cenario.osteoporose || {});
    if (cenario.frax && cenario.frax.dmoColoFemurTScore !== undefined) {
      param.tScore = cenario.frax.dmoColoFemurTScore;
    }
    if (cenario.frax && cenario.frax.fraturaPrevia) {
      param.fraturaPrevia = true;
      param.altoRisco = true;
    }
    if (param.tScore !== undefined && param.tScore <= -2.5) {
      param.altoRisco = true;
    }
    if (res.frax_brasil && res.frax_brasil.classificacao_risco === 'Alto Risco') {
      param.altoRisco = true;
    }
    return this.avaliarOsteoporose(param);
  }

  static revisarPolifarmaciaQuedas(lista) {
    var raw = this.revisarPolifarmaciaERiscoQuedas(lista);
    var temSedativo = raw.drogas_sedativas_frids && raw.drogas_sedativas_frids.length > 0;
    var temHipotensao = raw.drogas_hipotensao_ortostatica && raw.drogas_hipotensao_ortostatica.length > 0;
    var temQt = raw.drogas_prolongamento_qt && raw.drogas_prolongamento_qt.length > 0;
    var temCombinadoPerigoso = temSedativo && temHipotensao;

    var carga = raw.nivel_risco_iatrogenico_quedas.toUpperCase();
    if (temCombinadoPerigoso) {
      carga = "CARGA CRÍTICA (SEDATIVO + HIPOTENSOR ORTOSTÁTICO)";
    }
    var alertaCritico = carga.includes("ALTA") || carga.includes("CRÍTICA") || temCombinadoPerigoso;

    var recomendacoes = [ raw.conduta_desprescricao ];
    if (temHipotensao) {
      recomendacoes.push("Hipotensores Ortostáticos e vasodilatadores: desprescrever ou reduzir dose; aferir PA em ortostase.");
    }
    if (temQt) {
      recomendacoes.push("Prolongamento de QT: monitorar ECG com cálculo de QTc e evitar associação de múltiplos fármacos arritmogênicos.");
    }
    if (temSedativo) {
      recomendacoes.push("Benzodiazepínicos / Drogas Z: desprescrever ou desmamar gradualmente para prevenir ataxia e quedas.");
    }
    recomendacoes.push("Aferir pressão arterial deitada e em pé (teste de hipotensão ortostática) em todas as consultas.");

    var totalFrids = (raw.drogas_sedativas_frids ? raw.drogas_sedativas_frids.length : 0) +
                     (raw.drogas_hipotensao_ortostatica ? raw.drogas_hipotensao_ortostatica.length : 0) +
                     (raw.drogas_prolongamento_qt ? raw.drogas_prolongamento_qt.length : 0);

    return {
      total_medicamentos_analisados: raw.quantidade_medicamentos,
      carga_risco_quedas: carga,
      alerta_critico: alertaCritico,
      total_frids_detectados: totalFrids,
      drogas_hipotensao_ortostatica: raw.drogas_hipotensao_ortostatica,
      drogas_prolongamento_qt: raw.drogas_prolongamento_qt,
      drogas_sedativas_ataxia: raw.drogas_sedativas_frids,
      recomendacoes_desprescricao: recomendacoes
    };
  }

  static protocoloProfilaxiaQuedas(params) {
    params = params || {};
    var tempoTug = typeof params.tempoTug === 'number' ? params.tempoTug :
                   (typeof params.tempoTugSegundos === 'number' ? params.tempoTugSegundos :
                   (typeof params.tug === 'number' ? params.tug : null));
    var tug = (tempoTug !== null) ? this.avaliarRiscoQuedasTUG(tempoTug) : null;

    var listaMeds = Array.isArray(params.listaMedicamentos) ? params.listaMedicamentos :
                    (Array.isArray(params.medicamentos) ? params.medicamentos : []);
    var polifarm = this.revisarPolifarmaciaQuedas(listaMeds);

    var qtdQuedas = typeof params.historicoQuedasUltimoAno === 'number' ? params.historicoQuedasUltimoAno :
                    (typeof params.historicoQuedas === 'number' ? params.historicoQuedas : 0);

    var riscoAlto = (tug && (tug.tempo_segundos > 20 || tug.classificacao.includes("Alto"))) ||
                    (qtdQuedas >= 2) ||
                    Boolean(params.quedaComFraturaOuLesao) ||
                    Boolean(polifarm.alerta_critico);
    var riscoModerado = !riscoAlto && ((tug && (tug.tempo_segundos > 10 || tug.classificacao.includes("Moderado"))) || qtdQuedas === 1);
    var nivelRisco = riscoAlto ? "ALTO RISCO DE QUEDAS" : (riscoModerado ? "RISCO MODERADO DE QUEDAS" : "BAIXO RISCO DE QUEDAS");

    var justificativas = [];
    if (tug) justificativas.push("TUG de " + tug.tempo_segundos + "s (" + tug.classificacao + ")");
    if (qtdQuedas > 0) justificativas.push(qtdQuedas + " quedas no último ano");
    if (polifarm.carga_risco_quedas.includes("ALTA") || polifarm.carga_risco_quedas.includes("CRÍTICA")) {
      justificativas.push("Polifarmácia com drogas de alto risco de quedas (" + polifarm.carga_risco_quedas + ")");
    }

    return {
      nivel_risco: nivelRisco,
      justificativas: justificativas,
      analise_medicamentosa: {
        alerta_critico: polifarm.alerta_critico,
        carga_risco_quedas: polifarm.carga_risco_quedas,
        total_frids_detectados: polifarm.total_frids_detectados
      },
      acoes_beira_leito: [
        "Teste da Hipotensão Ortostática (aferir PA deitado e em pé aos 3 minutos).",
        "CONTRAINDICAÇÃO FORMAL de contenção mecânica no leito (aumenta risco de lesões graves e delirium).",
        "Prescrever fisioterapia motora com treino de equilíbrio, marcha e fortalecimento muscular de membros inferiores.",
        "Revisão e desprescrição imediata de psicotrópicos, benzodiazepínicos e sedativos.",
        "Adequação ambiental residencial: remoção de tapetes soltos, instalação de barras no banheiro e iluminação noturna de rodapé.",
        "Correção de acuidade visual e auditiva; uso de calçados fechados e antiderrapantes."
      ],
      criterios_encaminhamento_especialista: [
        "Quedas recorrentes inexplicadas ou associadas a perda transitória da consciência (suspeita de síncope arrítmica/neurológica).",
        "Suspeita de parkinsonismo, distúrbio vestibular central ou neuropatia periférica grave.",
        "Declínio cognitivo progressivo associado a instabilidade postural."
      ]
    };
  }

  static interpretarTextoLivreQuedas(texto) {
    var res = this.interpretarTextoLivre(texto);
    var cenario = res._cenario || res;
    var param = {
      tempoTugSegundos: (cenario.tug && typeof cenario.tug.tempo === 'number') ? cenario.tug.tempo : (res.risco_quedas ? res.risco_quedas.tempo_segundos : undefined),
      medicamentos: (cenario.farmacos && Array.isArray(cenario.farmacos.lista)) ? cenario.farmacos.lista : []
    };
    var mQuedas = texto.match(/(\d+)\s*quedas?/i);
    if (mQuedas) param.historicoQuedas = parseInt(mQuedas[1], 10);
    return this.protocoloProfilaxiaQuedas(param);
  }

  static avaliarGeriatriaAvancada(params) {
    if (typeof params === 'string') {
      return this.interpretarTextoLivre(params);
    }
    var resumo = this.gerarResumoAga(params);
    var fraxCalc = params.frax ? this.calcularFrax(params.frax) : (resumo.frax_brasil || null);
    var osteoCalc = params.osteoporose ? this.avaliarOsteoporose(params.osteoporose) : (resumo.osteoporose_manejo || null);
    var quedasCalc = this.protocoloProfilaxiaQuedas({
      tempoTug: params.tug ? params.tug.tempo : undefined,
      medicamentos: params.farmacos ? params.farmacos.lista : []
    });
    return Object.assign({}, resumo, {
      aga: {
        fragilidade: resumo.fragilidade || (params.cfs ? this.avaliarFragilidadeCFS(params.cfs.score) : null),
        cognicao: resumo.cognicao || (params.miniCog ? this.avaliarMiniCog(params.miniCog.palavras, params.miniCog.relogioNormal) : null),
        mobilidade: resumo.risco_quedas || (params.tug ? this.avaliarRiscoQuedasTUG(params.tug.tempo) : null)
      },
      frax: fraxCalc,
      osteoporose: osteoCalc,
      profilaxia_quedas: quedasCalc
    });
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SaudeIdosoService;
}
