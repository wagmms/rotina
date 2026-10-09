/**
 * ==============================================================================
 * MÓDULO 02: CLIMATÉRIO E TERAPIA HORMONAL DA MENOPAUSA (THM)
 * ==============================================================================
 * Motor determinístico de alta precisão clínica e farmacológica para o manejo do
 * climatério, transição menopáusica e pós-menopausa, fundamentado nas diretrizes
 * da FEBRASGO (Federação Brasileira das Associações de Ginecologia e Obstetrícia),
 * NAMS / The Menopause Society (2022-2023) e Consenso Brasileiro de Climatério.
 *
 * PILARES CLÍNICOS DETERMINÍSTICOS:
 * 1. Janela de Oportunidade (< 60 anos e/ou < 10 anos de pós-menopausa):
 *    - Relação risco-benefício amplamente favorável em mulheres jovens/recém-menopausadas.
 *    - Bloqueio ou contraindicação de início tardio (>= 60 anos ou >= 10 anos pós-menopausa)
 *      devido ao aumento do risco cardiovascular, AVC e demência.
 *    - Manejo específico de Insuficiência Ovariana Prematura (IOP / menopausa precoce < 40a),
 *      com reposição estrogênica obrigatória até pelo menos 50-52 anos.
 * 2. Regra de Ouro da Proteção Endometrial (Status Uterino):
 *    - Mulheres com ÚTERO INTACTO: ESTROGÊNIO ISOLADO É TERMINANTEMENTE PROIBIDO!
 *      Associação obrigatória com progestagênio (Progesterona micronizada ou Didrogesterona)
 *      ou SIU-Levonorgestrel para neutralizar o risco de hiperplasia e adenocarcinoma endometrial.
 *    - Mulheres HISTERECTOMIZADAS: Estrogênio isolado (ET). Progestagênio desnecessário,
 *      salvo histórico de endometriose moderada a severa (prevenção de recidiva em focos residuais).
 *    - Regimes terapêuticos: Contínuo Combinado (pós-menopausa tardia, amenorreia planejada)
 *      vs Cíclico/Sequencial (perimenopausa/transição com sangramento mensal previsível).
 * 3. Seleção Ponderada da Via de Administração (Transdérmica vs Oral):
 *    - Via Transdérmica de Escolha Obrigatória: Evita 1ª passagem hepática em mulheres com
 *      HAS, Diabetes, Obesidade (IMC >= 30), Hipertrigliceridemia (> 150 mg/dL), Esteatose hepática,
 *      Colelitíase, Tabagismo ou Risco Tromboembólico/Cardiovascular intermediário.
 *    - Via Oral restrita a mulheres hígidas, peso normal e perfil lipídico normal.
 * 4. Rastreamento e Checklist de Segurança Oncológica e Cardiovascular:
 *    - Contraindicações Absolutas: Câncer de mama ou endométrio prévio/atual, sangramento
 *      genital não esclarecido, TEV agudo/prévio, trombofilias, DAC/IAM, AVC/AIT, hepatopatia ativa.
 *    - Mamografia bilateral mandatória (< 1 ano com BI-RADS 1 ou 2) e USG transvaginal se SUA.
 * 5. Síndrome Geniturinária da Menopausa (SGM) Isolada:
 *    - Estrogênio tópico de baixa dose (Estriol / Promestrieno / Estradiol vaginal)
 *      sem necessidade de progestagênio sistêmico, mesmo em útero íntegro.
 * 6. Alternativas Não Hormonais em Pacientes Contraindicadas:
 *    - Desvenlafaxina, Venlafaxina, Gabapentina e alerta crítico contra Paroxetina em uso de Tamoxifeno.
 * ==============================================================================
 */

var ClimaterioThmService = (function() {
  'use strict';

  // ───────────────────────────────────────────────────────────────────────────
  // 1. CONSTANTES E PADRÕES FARMACOLÓGICOS (FEBRASGO / NAMS)
  // ───────────────────────────────────────────────────────────────────────────

  var VIAS_ESTROGENIO = {
    TRANSDERMICA_GEL: {
      nome: 'Estradiol Gel 0,06% (17-beta-estradiol transdérmico)',
      apresentacao: 'Frasco com bomba dosadora (0,75 mg de estradiol por acionamento/medida)',
      dosePadrao: '1 a 2 acionamentos (0,75 mg a 1,5 mg) ao dia pela manhã',
      instrucoes: 'Aplicar em pele limpa e seca dos braços, ombros ou face interna das coxas. NUNCA aplicar nas mamas ou genitais.',
      vantagemClinica: 'Sem 1ª passagem hepática. Neutro em triglicerídeos, PCR e fatores de coagulação.'
    },
    TRANSDERMICA_ADESIVO: {
      nome: 'Estradiol Adesivo Transdérmico',
      apresentacao: 'Adesivo transdérmico liberando 25 mcg, 50 mcg ou 100 mcg a cada 24 horas',
      dosePadrao: '50 mcg/dia (trocado 1 a 2 vezes por semana conforme fabricante)',
      instrucoes: 'Aplicar no abdome inferior ou nádegas. Alternar o local de aplicação semanalmente.',
      vantagemClinica: 'Liberação plasmática contínua e estável. Sem sobrecarga hepática.'
    },
    ORAL_ESTRADIOL: {
      nome: '17-beta-estradiol micronizado ou Valerato de Estradiol (Oral)',
      apresentacao: 'Comprimidos de 1 mg ou 2 mg',
      dosePadrao: '1 mg a 2 mg VO uma vez ao dia pela manhã',
      instrucoes: 'Tomar diariamente com água, preferencialmente no mesmo horário.',
      vantagemClinica: 'Boa aceitação, melhora do perfil de colesterol (aumenta HDL e reduz LDL), mas eleva triglicerídeos e fatores pró-trombóticos hepáticos.'
    }
  };

  var PROGESTAGENIOS = {
    MICRONIZADA: {
      nome: 'Progesterona Natural Micronizada',
      apresentacao: 'Cápsulas gelatinosas de 100 mg ou 200 mg (Utrogestan / similar)',
      doseContinuo: '100 mg VO diariamente ao deitar (esquema contínuo combinado)',
      doseCiclico: '200 mg VO ao deitar por 12 a 14 noites por mês (esquema sequencial)',
      perfilClinico: 'Molécula idêntica à ovariana. Menor risco mamário e tromboembólico. Ação alostérica sedativa/hipnótica benéfica em receptores GABA-A (alívio da insônia do climatério).'
    },
    DIDROGESTERONA: {
      nome: 'Didrogesterona',
      apresentacao: 'Comprimidos de 10 mg (Duphaston / similar)',
      doseContinuo: '5 mg a 10 mg VO diariamente (esquema contínuo)',
      doseCiclico: '10 mg VO diariamente por 14 dias por mês (esquema sequencial)',
      perfilClinico: 'Retroprogesterona com alta seletividade para receptores de progesterona. Neutra em lipídios e risco cardiovascular.'
    },
    SIU_LNG: {
      nome: 'Sistema Intrauterino Liberador de Levonorgestrel 52 mg (Mirena)',
      apresentacao: 'Dispositivo intrauterino com taxa de liberação inicial de 20 mcg/dia',
      dosePadrao: 'Inserção intrauterina para proteção endometrial por até 5 a 8 anos',
      perfilClinico: 'Padrão-ouro em eficácia de atrofia endometrial local com absorção sistêmica mínima (< 0,1%). Excelente controle de sangramento e amenorreia.'
    },
    MEDROXIPROGESTERONA: {
      nome: 'Acetato de Medroxiprogesterona (AMP)',
      apresentacao: 'Comprimidos de 2,5 mg, 5 mg ou 10 mg',
      doseContinuo: '2,5 mg VO diariamente',
      doseCiclico: '5 mg a 10 mg VO diariamente por 12 a 14 dias por mês',
      perfilClinico: 'Progestagênio sintético convencional. Eficácia endometrial comprovada, porém associado a discreto aumento de risco mamário e metabólico em relação à progesterona micronizada.'
    }
  };

  var TERAPIA_VAGINAL_SGM = {
    ESTRIOL: {
      nome: 'Estriol Creme Vaginal 1 mg/g',
      posologiaAtaque: '1 aplicador cheio (1 g = 1 mg) via vaginal ao deitar por 14 a 21 noites consecutivas',
      posologiaManutencao: '1 aplicador cheio 2 vezes por semana (ex: terças e sextas) ao deitar',
      seguranca: 'Ação seletiva no epitélio vaginal com baixa afinidade por receptores endometriais e meia-vida ultra-curta. NÃO exige progestagênio de oposição.'
    },
    PROMESTRIENO: {
      nome: 'Promestrieno Creme Vaginal 10 mg/g ou Cápsulas Vaginais 10 mg',
      posologiaAtaque: '1 aplicação vaginal ou 1 cápsula ao deitar por 20 dias consecutivos',
      posologiaManutencao: '1 aplicação vaginal 2 a 3 vezes por semana',
      seguranca: 'Éter dietílico do estradiol com absorção sistêmica virtualmente nula (< 1%). Ausência de estímulo endometrial ou mamário.'
    },
    ESTRADIOL_VAGINAL_BAIXA_DOSE: {
      nome: '17-beta-estradiol Comprimidos Vaginais 10 mcg',
      posologiaAtaque: '1 comprimido vaginal ao deitar por 14 dias',
      posologiaManutencao: '1 comprimido vaginal 2 vezes por semana',
      seguranca: 'Ultra-baixa dose local. Alta eficácia para atrofia e disúria.'
    }
  };

  var ALTERNATIVAS_NAO_HORMONAIS = {
    DESVENLAFAXINA: {
      farmaco: 'Succinato de Desvenlafaxina',
      dose: '50 mg VO uma vez ao dia pela manhã',
      classe: 'Inibidor Seletivo da Recaptação de Serotonina e Noradrenalina (ISRN)',
      indicacao: '1ª Linha não hormonal para sintomas vasomotores moderados a graves. Redução de 60-70% nos fogachos e melhora de sintomas depressivos/ansiosos.',
      alertaTamoxifeno: 'Seguro em pacientes em uso de Tamoxifeno (inibição mínima ou ausente do CYP2D6).'
    },
    VENLAFAXINA: {
      farmaco: 'Cloridrato de Venlafaxina (Liberação Prolongada)',
      dose: '37,5 mg a 75 mg VO uma vez ao dia pela manhã',
      classe: 'ISRN',
      indicacao: 'Excelente eficácia em fogachos. Titular dose a cada 1-2 semanas se necessário.',
      alertaTamoxifeno: 'Fraca inibição do CYP2D6; geralmente segura com Tamoxifeno, mas Desvenlafaxina é preferível.'
    },
    GABAPENTINA: {
      farmaco: 'Gabapentina',
      dose: '300 mg VO ao deitar (pode ser titulada até 300 mg 2 a 3 vezes ao dia)',
      classe: 'Modulador de Canais de Cálcio Pré-sinápticos',
      indicacao: 'Especialmente útil quando os fogachos são predominantemente noturnos e associados a insônia importante.',
      alertaTamoxifeno: 'Seguro com Tamoxifeno.'
    },
    CLONIDINA: {
      farmaco: 'Cloridrato de Clonidina',
      dose: '0,05 mg a 0,1 mg VO de 12/12 horas',
      classe: 'Agonista Alfa-2 Adrenérgico Central',
      indicacao: 'Opção de 2ª linha para sintomas vasomotores em pacientes hipertensas.',
      alertaTamoxifeno: 'Monitorar hipotensão postural, tontura e boca seca.'
    },
    PAROXETINA_ALERTA: {
      farmaco: 'Cloridrato de Paroxetina',
      dose: '7,5 mg a 10 mg (ou 20 mg) VO ao dia',
      classe: 'ISRS',
      indicacao: 'Aprovado pelo FDA para fogachos (dose 7,5 mg).',
      alertaTamoxifeno: '⚠️ CONTRAINDICAÇÃO ABSOLUTA COM TAMOXIFENO: Inibidor potente irreversível da isoenzima hepática CYP2D6, impedindo a conversão do pró-fármaco Tamoxifeno em seu metabólito ativo antitumoral (Endoxifeno), elevando o risco de recidiva do câncer de mama!'
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 2. AVALIAÇÃO DA JANELA DE OPORTUNIDADE (FEBRASGO / NAMS)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avalia determinísticamente a Janela de Oportunidade para início da THM.
   *
   * @param {Object} params
   * @param {number} params.idade - Idade atual da paciente em anos
   * @param {number} [params.tempoMenopausaAnos] - Tempo desde a última menstruação (em anos)
   * @param {number} [params.idadeMenopausa] - Idade no momento da menopausa
   * @param {boolean} [params.insuficienciaOvarianaPrematura=false] - Menopausa antes dos 40 anos
   * @param {boolean} [params.emTransicaoMenopausica=false] - Perimenopausa / irregularidade menstrual
   * @returns {Object} Estratificação da janela de oportunidade
   */
  function avaliarJanelaOportunidade(params) {
    params = params || {};
    var idade = Number(params.idade) || 50;
    var tempoMenopausa = params.tempoMenopausaAnos !== undefined && params.tempoMenopausaAnos !== null
      ? Number(params.tempoMenopausaAnos)
      : (params.idadeMenopausa ? Math.max(0, idade - Number(params.idadeMenopausa)) : 1);
    
    var iop = Boolean(params.insuficienciaOvarianaPrematura || params.menopausaPrecoce || (params.idadeMenopausa && Number(params.idadeMenopausa) < 40));
    var transicao = Boolean(params.emTransicaoMenopausica || params.perimenopausa);

    var resultado = {
      status: 'DENTRO_DA_JANELA',
      elegivelInicio: true,
      classificacao: 'Janela de Oportunidade Favorável',
      relacaoRiscoBeneficio: 'AMPLAMENTE_FAVORAVEL',
      justificativa: '',
      alertas: [],
      recomendacoes: []
    };

    if (iop) {
      resultado.status = 'INSUFICIENCIA_OVARIANA_PREMATURA';
      resultado.elegivelInicio = true;
      resultado.classificacao = 'Insuficiência Ovariana Prematura (IOP) / Menopausa Precoce (< 40 anos)';
      resultado.relacaoRiscoBeneficio = 'INDICACAO_MANDATORIA';
      resultado.justificativa = 'Em mulheres com falência ovariana prematura (< 40 anos), a THM não é opcional, mas terapêutica de reposição fisiológica estrita. Deve ser mantida até pelo menos a idade média da menopausa natural (~50-52 anos) para prevenir aterosclerose precoce, perda grave de massa óssea e demência.';
      resultado.recomendacoes.push('Doses de estrogênio habitualmente mais elevadas (ex: Estradiol transdérmico 1,5 a 2 g de gel ou 50-100 mcg adesivo, ou 2 mg oral) para mimetizar a concentração estrogênica da mulher em idade fértil.');
      resultado.recomendacoes.push('Manter proteção endometrial obrigatória se útero presente.');
      resultado.recomendacoes.push('Rastreamento de DMO (Densitometria Óssea) e perfil cardiovascular de base.');
      return resultado;
    }

    if (transicao) {
      resultado.status = 'TRANSICAO_MENOPAUSICA';
      resultado.elegivelInicio = true;
      resultado.classificacao = 'Transição Menopáusica / Perimenopausa';
      resultado.relacaoRiscoBeneficio = 'FAVORAVEL_COM_REGIME_SEQUENCIAL';
      resultado.justificativa = 'Paciente em transição menopáusica com irregularidade de ciclos e sintomas vasomotores. Elegível para início de THM. Devido à presença de sangramentos esporádicos e atividade folicular residual, o esquema preferencial para útero intacto é o Cíclico/Sequencial (ou SIU-LNG) para manter previsibilidade do sangramento e evitar sangramento de escape frequente do esquema contínuo.';
      resultado.recomendacoes.push('Esquema Cíclico/Sequencial: Estrogênio contínuo associado a Progesterona micronizada 200 mg/dia por 12-14 dias no mês.');
      resultado.recomendacoes.push('Alternativa excelente: Inserção de SIU-Levonorgestrel 52 mg (promove contracepção altamente eficaz na perimenopausa + proteção endometrial total + controle de sangramento).');
      return resultado;
    }

    // Regra clássica de Janela de Oportunidade FEBRASGO / NAMS:
    // Idade < 60 anos E/OU Menopausa < 10 anos
    var idadeMenor60 = idade < 60;
    var menopausaMenor10 = tempoMenopausa < 10;

    if (idadeMenor60 && menopausaMenor10) {
      resultado.status = 'DENTRO_DA_JANELA';
      resultado.elegivelInicio = true;
      resultado.classificacao = 'Janela de Oportunidade Aberta (< 60 anos e < 10 anos de pós-menopausa)';
      resultado.relacaoRiscoBeneficio = 'AMPLAMENTE_FAVORAVEL';
      resultado.justificativa = 'Paciente dentro da Janela de Oportunidade estrita. Os ensaios clínicos e consensos FEBRASGO/NAMS demonstram máximo benefício sintomático (fogachos, sono, humor, atrofia urogenital), prevenção primária de perda óssea/fraturas e perfil de segurança cardiovascular favorável, sem acréscimo de eventos coronarianos.';
      resultado.recomendacoes.push('Iniciar com a menor dose eficaz e reavaliar anualmente.');
      resultado.recomendacoes.push('Avaliar fatores de risco cardiovascular e metabólicos para definição da melhor via de administração (transdérmica vs oral).');
    } else if (idadeMenor60 || menopausaMenor10) {
      resultado.status = 'JANELA_PARCIAL_MODERADA';
      resultado.elegivelInicio = true;
      resultado.classificacao = 'Janela Limítrofe (preenche 1 dos critérios: idade < 60a ou tempo de menopausa < 10a)';
      resultado.relacaoRiscoBeneficio = 'FAVORAVEL_COM_PONDERACAO';
      resultado.justificativa = 'Paciente em faixa de transição da janela (' + (idadeMenor60 ? 'idade < 60 anos, porém menopausa há ' + tempoMenopausa + ' anos' : 'idade ' + idade + ' anos, porém menopausa recente há ' + tempoMenopausa + ' anos') + '). Início possível para sintomas moderados a graves com indicação clínica clara, priorizando estritamente via transdérmica e doses baixas.';
      resultado.recomendacoes.push('Preferência mandatória por via transdérmica para minimizar impacto trombótico e inflamatório.');
      resultado.recomendacoes.push('Estratificação cardiovascular detalhada prévia (PA, perfil lipídico, escore de risco cardiovascular).');
    } else {
      // Idade >= 60 anos E tempoMenopausa >= 10 anos
      resultado.status = 'FORA_DA_JANELA';
      resultado.elegivelInicio = false;
      resultado.classificacao = 'Janela de Oportunidade Ultrapassada (>= 60 anos E >= 10 anos de menopausa)';
      resultado.relacaoRiscoBeneficio = 'DESFAVORAVEL_PARA_INICIO';
      resultado.justificativa = '⚠️ A paciente ultrapassou a Janela de Oportunidade (idade ' + idade + ' anos e pós-menopausa há ' + tempoMenopausa + ' anos). Grandes ensaios clínicos (WHI, KEEPS, ELITE) comprovaram que o INÍCIO tardio de THM sistêmica eleva o risco relativo de eventos coronarianos (DAC), AVC isquêmico, TEV e declínio cognitivo/demência por instabilização de placas ateroscleróticas pré-existentes.';
      resultado.alertas.push('NÃO RECOMENDADO O INÍCIO DE THM SISTÊMICA DE ROTINA NESTA FAIXA ETÁRIA / TEMPO DE PÓS-MENOPAUSA.');
      resultado.alertas.push('Se a paciente apresentar sintomas vasomotores refratários e incapacitantes, discutir riscos abertamente, utilizar ultra-baixa dose transdérmica ou optar prioritariamente por TERAPIA NÃO HORMONAL (Desvenlafaxina / Venlafaxina / Gabapentina).');
      resultado.recomendacoes.push('Priorizar terapias não hormonais de 1ª linha para controle de fogachos.');
      resultado.recomendacoes.push('Se queixa puramente urogenital (atrofia/dispareunia), o estrogênio TÓPICO vaginal de baixa dose é seguro e liberado.');
    }

    return resultado;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. AUDITORIA DE CONTRAINDICAÇÕES ABSOLUTAS E RELATIVAS (FEBRASGO / NAMS)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Audita determinísticamente contraindicações absolutas e relativas para THM.
   *
   * @param {Object} params
   * @returns {Object} Laudo de elegibilidade de segurança
   */
  function auditarContraindicacoesThm(params) {
    params = params || {};
    var contraindicacoesAbsolutas = [];
    var contraindicacoesRelativas = [];
    var alertasCriticos = [];

    // 1. Câncer de Mama
    if (params.cancerMama || params.historicoCancerMama || params.suspeitaCancerMama) {
      contraindicacoesAbsolutas.push({
        fator: 'Câncer de Mama Prévio, Atual ou Suspeita',
        motivo: 'O estrogênio e progestagênios promovem estímulo proliferativo direto sobre células epiteliais mamárias e receptores de estrogênio (ER+). Contraindicação formal e absoluta em todas as diretrizes oncológicas e ginecológicas.',
        conduta: 'Bloqueio total de THM sistêmica. Optar por terapias não hormonais (Desvenlafaxina 50mg/dia, Venlafaxina ou Gabapentina).'
      });
      alertasCriticos.push('🚨 CONTRAINDICAÇÃO ABSOLUTA: Câncer de mama prévio ou ativo contraindica formalmente THM sistêmica.');
    }

    // 2. Câncer de Endométrio ou Neoplasias Hormônio-Dependentes
    if (params.cancerEndometrio || params.historicoCancerEndometrio || params.hiperplasiaEndometrialAtipica || params.neoplasiaEstrogenoDependente) {
      contraindicacoesAbsolutas.push({
        fator: 'Câncer de Endométrio Prévio/Atual ou Hiperplasia Endometrial com Atipia',
        motivo: 'Neoplasia fortemente estrogênio-dependente com alto risco de recorrência ou progressão tumoral.',
        conduta: 'Bloqueio total de THM estrogênica sistêmica.'
      });
      alertasCriticos.push('🚨 CONTRAINDICAÇÃO ABSOLUTA: Histórico de câncer endometrial ou lesão precursora atípica.');
    }

    // 3. Sangramento Vaginal Não Esclarecido
    if (params.sangramentoVaginalNaoEsclarecido || params.suaNaoInvestigado || params.sangramentoPosMenopausaSemInvestigacao) {
      contraindicacoesAbsolutas.push({
        fator: 'Sangramento Vaginal Anormal de Causa Não Esclarecida',
        motivo: 'Sangramento na pós-menopausa é sinal de alerta mandatória para adenocarcinoma de endométrio (10-15% dos casos) ou hiperplasia atípica. Não se pode prescrever terapia hormonal sem afastar neoplasia.',
        conduta: 'Interromper/não iniciar THM. Realizar obrigatoriamente Ultrassonografia Transvaginal (medir espessura endometrial) e Histeroscopia com biópsia endometrial antes de qualquer conduta hormonal.'
      });
      alertasCriticos.push('🛑 BLOQUEIO MANDATÓRIO: Sangramento pós-menopausa não investigado exige exclusão histológica de adenocarcinoma endometrial prévia.');
    }

    // 4. Tromboembolismo Venoso Agudo ou Prévio / Trombofilias
    if (params.tevPrevioOuAgudo || params.tvpPrevia || params.tepPrevio || params.trombofiliaAltoRisco || params.saf || params.sindromeAntifosfolipide) {
      contraindicacoesAbsolutas.push({
        fator: 'Tromboembolismo Venoso Prévio/Agudo (TVP/TEP) ou Trombofilia Conhecida de Alto Risco',
        motivo: 'Estrogênio sistêmico aumenta síntese de fatores II, VII, VIII, X e reduz proteína S, elevando expressivamente o risco de retrombose venosa potencialmente fatal.',
        conduta: 'Contraindicação absoluta à THM sistêmica (tanto oral quanto transdérmica em vigência de evento prévio confirmado ou SAF). Indicar terapias não hormonais para fogachos.'
      });
      alertasCriticos.push('🚨 CONTRAINDICAÇÃO ABSOLUTA: Histórico de TEV/Trombofilia de alto risco contraindica THM sistêmica.');
    }

    // 5. Doença Arterial Coronariana / Cerebrovascular Aterosclerótica
    if (params.doencaCoronariana || params.iamPrevio || params.anginaInstavel || params.avcPrevio || params.aitPrevio || params.doencaArterialOclusiva) {
      contraindicacoesAbsolutas.push({
        fator: 'Doença Arterial Aterosclerótica Prévia (IAM, Angina Instável, AVC Isquêmico/Hemorrágico ou AIT)',
        motivo: 'O uso de hormônios em leito arterial previamente aterosclerótico com placa instável promove instabilização endotelial, metaloproteinases de matriz e trombose arterial aguda.',
        conduta: 'Bloqueio absoluto de THM sistêmica. Manejo com modificações de estilo de vida e terapias não hormonais (ISRN).'
      });
      alertasCriticos.push('🚨 CONTRAINDICAÇÃO ABSOLUTA: Histórico de evento coronariano ou AVC contraindica THM sistêmica.');
    }

    // 6. Doença Hepática Aguda Ativa ou Descompensada
    if (params.doencaHepaticaAtiva || params.hepatiteAguda || params.insuficienciaHepatica || params.cirroseDescompensada) {
      contraindicacoesAbsolutas.push({
        fator: 'Doença Hepática Ativa Aguda ou Insuficiência Hepática Descompensada',
        motivo: 'Incapacidade metabólica hepática de conjugar e depurar esteroides sexuais exógenos, além de sobrecarga funcional hepática grave.',
        conduta: 'Contraindicação absoluta até resolução completa da hepatopatia aguda e normalização enzimática/funcional.'
      });
      alertasCriticos.push('🚨 CONTRAINDICAÇÃO ABSOLUTA: Hepatopatia aguda ativa descompensada.');
    }

    // 7. Porfiria Cutânea Tardia
    if (params.porfiria || params.porfiriaCutaneaTardia) {
      contraindicacoesAbsolutas.push({
        fator: 'Porfiria Cutânea Tardia',
        motivo: 'Estrogênios induzem a síntese da sintetase do ácido delta-aminolevulínico (ALA-S), desencadeando crises agudas graves de porfiria.',
        conduta: 'Contraindicação absoluta a estrogênios.'
      });
      alertasCriticos.push('🚨 CONTRAINDICAÇÃO ABSOLUTA: Porfiria cutânea tardia.');
    }

    // 8. Meningioma (específico para progestagênios)
    if (params.meningioma || params.historicoMeningioma) {
      contraindicacoesAbsolutas.push({
        fator: 'Meningioma Prévio ou Atual',
        motivo: 'Meningiomas expressam densa quantidade de receptores de progesterona; progestagênios (especialmente acetato de ciproterona e outros sintéticos) estimulam o crescimento tumoral.',
        conduta: 'Contraindicação formal ao uso de progestagênios exógenos.'
      });
      alertasCriticos.push('🚨 CONTRAINDICAÇÃO: Meningioma contraindica uso de progestagênios.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CONTRAINDICAÇÕES RELATIVAS / CONDICIONANTES
    // ─────────────────────────────────────────────────────────────────────────

    // Hipertensão Arterial Sistêmica Não Controlada
    if (params.hasDescompensada || params.paNaoControlada) {
      contraindicacoesRelativas.push({
        fator: 'Hipertensão Arterial Sistêmica Descompensada (PA >= 140/90 mmHg)',
        motivo: 'Risco cardiovascular e cerebrovascular aumentado.',
        conduta: 'Estabilizar e controlar os níveis pressóricos previamente com anti-hipertensivos. Uma vez controlada a PA, se THM indicada, optar OBRIGATORIAMENTE por via transdérmica.'
      });
    }

    // Hipertrigliceridemia Severa
    var tg = Number(params.triglicerideos || 0);
    if (tg >= 400 || params.hipertrigliceridemiaSevera) {
      contraindicacoesRelativas.push({
        fator: 'Hipertrigliceridemia Severa (TG >= 400 mg/dL)',
        motivo: 'Estrogênio oral estimula síntese hepática de VLDL e triglicerídeos, podendo induzir pancreatite aguda hipertrigliceridêmica.',
        conduta: 'VIA ORAL FORMALMENTE CONTRAINDICADA. Se houver extrema indicação para sintomas graves, usar estritamente VIA TRANSDÉRMICA em baixa dose e associar fibrato/estratégia lipídica.'
      });
    }

    // Doença Biliar Litiásica / Colelitíase Sintomática
    if (params.colelitiase || params.doencaBiliar) {
      contraindicacoesRelativas.push({
        fator: 'Colelitíase Sintomática / Doença Biliar Litiásica',
        motivo: 'Estrogênio oral aumenta a saturação biliar de colesterol e diminui a motilidade da vesícula biliar.',
        conduta: 'Evitar via oral. Optar estritamente por VIA TRANSDÉRMICA.'
      });
    }

    // Endometriose Prévia (relevante para indicação de progestagênio em histerectomizada)
    if (params.historicoEndometriose || params.endometriose) {
      contraindicacoesRelativas.push({
        fator: 'Histórico de Endometriose Prévia',
        motivo: 'Estrogênio isolado pode reativar implantes endometrióticos peritoneais residuais e há risco de transformação neoplásica em tecido residual não ressecado.',
        conduta: 'Mesmo se a paciente for histerectomizada, DEVE-SE associar progestagênio de oposição (terapia combinada obrigatória) para proteger focos residuais.'
      });
    }

    // Leiomioma Uterino Sintomático
    if (params.leiomiomaSintomatico || params.miomatoseVolumosa) {
      contraindicacoesRelativas.push({
        fator: 'Leiomiomatose Uterina Sintomática ou Volumosa',
        motivo: 'Estrogênio e progesterona podem induzir aumento volumétrico dos miomas e recidiva de sangramento.',
        conduta: 'Utilizar doses mínimas eficazes de estrogênio, preferencialmente transdérmico, associado a SIU-Levonorgestrel (que promove redução do sangramento dos miomas) ou progesterona contínua.'
      });
    }

    // Enxaqueca com Aura
    if (params.enxaquecaComAura) {
      contraindicacoesRelativas.push({
        fator: 'Enxaqueca com Aura',
        motivo: 'Risco aumentado de AVC isquêmico com flutuações hormonais ou via oral.',
        conduta: 'Evitar via oral. Se THM necessária, usar via transdérmica contínua de baixa dose para garantir níveis plasmáticos estáveis sem pico ou vale, ou preferir terapias não hormonais.'
      });
    }

    // Tabagismo Ativo
    if (params.tabagismo || params.fumante) {
      contraindicacoesRelativas.push({
        fator: 'Tabagismo Ativo',
        motivo: 'O tabaco acelera o catabolismo hepático do estrogênio oral (reduzindo sua eficácia) e potencializa o risco tromboembólico venoso e arterial.',
        conduta: 'Incentivar cessação tabágica imediata. Se prescrita THM, indicar OBRIGATORIAMENTE VIA TRANSDÉRMICA.'
      });
    }

    var elegivel = contraindicacoesAbsolutas.length === 0;

    return {
      elegivelThmSistemica: elegivel,
      contraindicacoesAbsolutas: contraindicacoesAbsolutas,
      contraindicacoesRelativas: contraindicacoesRelativas,
      alertasCriticos: alertasCriticos,
      grauSeguranca: elegivel ? (contraindicacoesRelativas.length > 0 ? 'CONDICIONADA_A_CUIDADOS' : 'SEGURO') : 'CONTRAINDICADO_ABSOLUTO'
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. REGRA DE OURO DA PROTEÇÃO ENDOMETRIAL (STATUS UTERINO)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Determina determinísticamente a necessidade e tipo de oposição progestagênica
   * com base no status uterino e antecedentes clínicos.
   *
   * @param {Object} params
   * @param {boolean} [params.uteroPresente=true] - Presença de útero intacto
   * @param {boolean} [params.histerectomizada=false] - Histórico de histerectomia
   * @param {boolean} [params.historicoEndometriose=false] - Endometriose prévia
   * @param {string} [params.padraoMenstrual='pos_menopausa'] - 'pos_menopausa' (> 12 meses amenorreia) ou 'perimenopausa'
   * @returns {Object} Diretriz de proteção endometrial
   */
  function determinarProtecaoEndometrial(params) {
    params = params || {};
    var histerectomizada = Boolean(params.histerectomizada || (params.uteroPresente === false));
    var uteroPresente = !histerectomizada;
    var endometriose = Boolean(params.historicoEndometriose || params.endometriose);
    var padrao = String(params.padraoMenstrual || 'pos_menopausa').toLowerCase().trim();
    var isTransicao = padrao === 'perimenopausa' || padrao === 'transicao' || Boolean(params.emTransicaoMenopausica);

    if (uteroPresente) {
      var esquemaRecomendado = isTransicao ? 'SEQUENCIAL_CICLICO' : 'CONTINUO_COMBINADO';
      var progestOpcoes = [
        PROGESTAGENIOS.MICRONIZADA,
        PROGESTAGENIOS.DIDROGESTERONA,
        PROGESTAGENIOS.SIU_LNG
      ];

      return {
        uteroPresente: true,
        necessitaProgestagenio: true,
        regraDeOuro: 'OBRIGATÓRIA_ASSOCIACAO_PROGESTAGENIO',
        alertaSeguranca: '⚠️ REGRA DE OURO DA PRESERVAÇÃO UTERINA: Mulheres com útero intacto exigem obrigatoriamente a associação de progestagênio ao estrogênio sistêmico. O uso de estrogênio isolado (não oposto) estimula hiperplasia endometrial contínua e multiplica em até 8 a 10 vezes o risco de adenocarcinoma de endométrio!',
        esquemaRecomendado: esquemaRecomendado,
        descricaoEsquema: isTransicao
          ? 'Esquema Cíclico / Sequencial: Estrogênio contínuo diário associado a Progesterona nos últimos 12 a 14 dias do mês. Indicado na perimenopausa para manter sangramento de privação previsível e evitar escapes inesperados.'
          : 'Esquema Contínuo Combinado: Estrogênio contínuo diário associado a Progesterona diária ininterrupta. Indicado na pós-menopausa tardia (> 1 ano de amenorreia) para atingir amenorreia completa e atrofia endometrial estável.',
        progestagenioPrimeiraEscolha: {
          nome: 'Progesterona Micronizada Natural (100 mg contínuo ou 200 mg cíclico ao deitar)',
          justificativa: 'Molécula idêntica à endógena, neutra no risco tromboembólico, menor proliferação mamária no estudo E3N e melhora a qualidade do sono pelo efeito modulador em receptores GABA.'
        },
        alternativaModerna: {
          nome: 'SIU-Levonorgestrel 52 mg (Mirena) + Estrogênio Transdérmico',
          justificativa: 'Padrão-ouro em proteção endometrial local sem elevação de risco trombótico sistêmico, com alta taxa de amenorreia e controle de fluxo.'
        },
        posologiasDisponiveis: progestOpcoes
      };
    }

    // Mulher Histerectomizada
    if (endometriose) {
      return {
        uteroPresente: false,
        necessitaProgestagenio: true,
        regraDeOuro: 'EXCECAO_ENDOMETRIOSE_EXIGE_PROGESTAGENIO',
        alertaSeguranca: '⚠️ EXCEÇÃO CLÍNICA FUNDAMENTAL: Paciente histerectomizada com histórico de endometriose moderada a grave. Embora não tenha endométrio uterino, o estrogênio isolado pode reativar implantes ectópicos residuais no peritônio, bexiga ou intestino, além de haver risco relatado de malignização de focos endometrióticos. A associação de progestagênio (terapia combinada) é mandatória.',
        esquemaRecomendado: 'CONTINUO_COMBINADO',
        descricaoEsquema: 'Estrogênio sistêmico associado a Progesterona micronizada ou Didrogesterona contínua para supressão de focos endometrióticos remanescentes.',
        progestagenioPrimeiraEscolha: PROGESTAGENIOS.DIDROGESTERONA,
        posologiasDisponiveis: [PROGESTAGENIOS.DIDROGESTERONA, PROGESTAGENIOS.MICRONIZADA]
      };
    }

    return {
      uteroPresente: false,
      necessitaProgestagenio: false,
      regraDeOuro: 'ESTROGENIO_ISOLADO_RECOMENDADO',
      alertaSeguranca: '✅ Paciente histerectomizada sem histórico de endometriose: Terapia Estrogênica Isolada (ET). A adição de progestagênio é totalmente desnecessária e NÃO recomendada, pois o acréscimo de risco mamário discreto evidenciado no WHI esteve restrito ao uso de progestagênios associados.',
      esquemaRecomendado: 'ESTROGENIO_ISOLADO_CONTINUO',
      descricaoEsquema: 'Estrogênio diário ininterrupto sem progestagênio. Máxima eficácia vasomotora e óssea com o melhor perfil de segurança mamária.',
      progestagenioPrimeiraEscolha: null,
      posologiasDisponiveis: []
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. SELEÇÃO PONDERADA DA VIA DE ADMINISTRAÇÃO (ORAL VS TRANSDÉRMICA)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avalia comorbidades clínicas e fatores metabólicos para eleger a via ideal.
   *
   * @param {Object} params
   * @returns {Object} Via selecionada com fundamentação farmacológica detalhada
   */
  function selecionarViaAdministracao(params) {
    params = params || {};
    var motivosTransdermica = [];

    // Fatores de Indicação Obrigatória ou Preferencial por Via Transdérmica
    var imc = Number(params.imc || 0);
    if (imc >= 30) {
      motivosTransdermica.push('Obesidade (IMC ' + imc.toFixed(1) + ' kg/m² >= 30): risco trombótico basal elevado e maior conversão periférica');
    } else if (imc >= 25) {
      motivosTransdermica.push('Sobrepeso (IMC ' + imc.toFixed(1) + ' kg/m²): preferência transdérmica para neutralidade metabólica');
    }

    if (params.has || params.hipertensao) {
      motivosTransdermica.push('Hipertensão Arterial Sistêmica (HAS): via transdérmica não ativa o sistema renina-angiotensina-aldosterona hepático');
    }

    var tg = Number(params.triglicerideos || 0);
    if (tg > 150) {
      motivosTransdermica.push('Hipertrigliceridemia (' + tg + ' mg/dL > 150): via transdérmica não estimula síntese hepática de VLDL/triglicerídeos');
    }

    if (params.diabetes || params.sindromeMetabolica || params.resistenciaInsulinica) {
      motivosTransdermica.push('Diabetes Mellitus / Síndrome Metabólica: via transdérmica preserva sensibilidade à insulina e perfil lipídico');
    }

    if (params.esteatoseHepatica || params.hepatopatiaCronicaEstavel) {
      motivosTransdermica.push('Esteatose Hepática (MASLD) / Hepatopatia Estável: avoids first-pass hepatic metabolism');
    }

    if (params.colelitiase || params.doencaBiliar) {
      motivosTransdermica.push('Colelitíase / Risco Biliar: via oral aumenta saturação biliar de colesterol (litogênica)');
    }

    if (params.tabagismo || params.fumante) {
      motivosTransdermica.push('Tabagismo ativo: via oral sofre indução hepática acentuada e potencializa trombose');
    }

    if (params.enxaquecaComAura || params.enxaqueca) {
      motivosTransdermica.push('Histórico de Enxaqueca: via transdérmica oferece estabilidade plasmática sem oscilações bruscas');
    }

    var viaIndicada = 'TRANSDERMICA';
    var justificativa = '';
    var opcoesFarmaco = [];

    if (motivosTransdermica.length > 0) {
      viaIndicada = 'TRANSDERMICA_PREFERENCIAL_MANDATORIA';
      justificativa = 'VIA TRANSDÉRMICA É A ESCOLHA PREFERENCIAL / MANDATÓRIA devido à presença de fatores de risco cardiovascular, metabólico ou hepático: ' + motivosTransdermica.join('; ') + '. Ao evitar a primeira passagem hepática, o estradiol transdérmico não estimula a síntese de fibrinogênio, fatores de coagulação (VII, X), PCR ultrassensível nem SHBG, mantendo risco de TEV praticamente neutro.';
      opcoesFarmaco = [VIAS_ESTROGENIO.TRANSDERMICA_GEL, VIAS_ESTROGENIO.TRANSDERMICA_ADESIVO];
    } else {
      viaIndicada = 'ORAL_OU_TRANSDERMICA';
      justificativa = 'Paciente jovem, sem comorbidades cardiovasculares, metabólicas ou hepáticas, com IMC normal e triglicerídeos normais. Tanto a via oral quanto a transdérmica são elegíveis. A via transdérmica ainda oferece a menor probabilidade teórica de eventos tromboembólicos, enquanto a via oral oferece facilidade posológica e ligeira elevação do HDL.';
      opcoesFarmaco = [VIAS_ESTROGENIO.TRANSDERMICA_GEL, VIAS_ESTROGENIO.ORAL_ESTRADIOL, VIAS_ESTROGENIO.TRANSDERMICA_ADESIVO];
    }

    return {
      viaIndicada: viaIndicada,
      preferenciaTransdermica: motivosTransdermica.length > 0,
      fatoresRiscoIdentificados: motivosTransdermica,
      justificativaFarmacologica: justificativa,
      medicamentosSugeridos: opcoesFarmaco
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. SÍNDROME GENITURINÁRIA DA MENOPAUSA (SGM) / ATROFIA UROGENITAL
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avalia queixas urogenitais exclusivas ou associadas.
   *
   * @param {Object} params
   * @returns {Object} Conduta de SGM
   */
  function avaliarSintomasGeniturinarios(params) {
    params = params || {};
    var temSgm = Boolean(
      params.ressecamentoVaginal ||
      params.dispareunia ||
      params.disuria ||
      params.urgenciaMiccional ||
      params.pruridoVulvar ||
      params.sgm ||
      params.atrofiaVulvovaginal
    );

    var temFogachos = Boolean(
      params.fogachos ||
      params.ondasCalor ||
      params.sudoreseNoturna ||
      params.sintomasVasomotoresModeradosOuGraves
    );

    if (!temSgm) {
      return {
        presente: false,
        terapiaTopicaIndicada: false,
        detalhes: 'Sem queixas clínicas de atrofia urogenital no momento.'
      };
    }

    var conduta = {
      presente: true,
      terapiaTopicaIndicada: true,
      apenasUrogenital: !temFogachos,
      recomendacaoPrincipal: '',
      segurancaEndometrial: 'Estrogênios vaginais em doses baixas têm absorção sistêmica desprezível (< 10-15 pg/mL) e NÃO induzem proliferação endometrial. Portanto, NÃO há necessidade de associação com progestagênio para proteção endometrial em mulheres com útero intacto.',
      opcoesPrescricao: [
        TERAPIA_VAGINAL_SGM.ESTRIOL,
        TERAPIA_VAGINAL_SGM.PROMESTRIENO,
        TERAPIA_VAGINAL_SGM.ESTRADIOL_VAGINAL_BAIXA_DOSE
      ],
      coadjuvantes: [
        'Hidratantes vaginais à base de ácido hialurônico de uso contínuo (2 a 3x/semana)',
        'Lubrificantes não hormonais à base de água ou silicone durante a relação sexual',
        'Manutenção de atividade sexual ativa (melhora trofismo e vascularização vaginal)'
      ]
    };

    if (!temFogachos) {
      conduta.recomendacaoPrincipal = 'QUEIXA EXCLUSIVAMENTE UROGENITAL: NÃO indicar THM sistêmica! A conduta padrão-ouro é o Estrogênio Vaginal Tópico de baixa dose isolado. É altamente eficaz para restaurar o índice de maturação vaginal, pH ácido e flora lactobacilar, além de reduzir ITU de repetição, sem os riscos da via sistêmica.';
    } else {
      conduta.recomendacaoPrincipal = 'SGM ASSOCIADA A SINTOMAS VASOMOTORES: Se for iniciada THM sistêmica, esta costuma melhorar a atrofia vaginal após algumas semanas. Caso persista dispareunia ou atrofia residual moderada/grave, a associação de estrogênio vaginal tópico em baixa dose pode ser mantida com segurança total.';
    }

    return conduta;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 7. ALTERNATIVAS NÃO HORMONAIS (QUANDO THM FOR CONTRAINDICADA)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Sugere opções não hormonais de primeira e segunda linha.
   *
   * @param {Object} params
   * @returns {Object} Alternativas farmacológicas não hormonais
   */
  function sugerirAlternativasNaoHormonais(params) {
    params = params || {};
    var usoTamoxifeno = Boolean(params.usoTamoxifeno || params.emUsoTamoxifeno);

    var lista = [];

    // 1ª Linha: Desvenlafaxina
    lista.push(ALTERNATIVAS_NAO_HORMONAIS.DESVENLAFAXINA);

    // Se NÃO usar tamoxifeno, Paroxetina é opção; se USAR, emitir bloqueio estrito
    if (usoTamoxifeno) {
      lista.push({
        farmaco: 'Cloridrato de Paroxetina ou Fluoxetina',
        alertaCritico: '🚨 BLOQUEIO FARMACOLÓGICO FORMAL: Proibido uso concomitante de Paroxetina ou Fluoxetina com Tamoxifeno! Ambas inibem potentemente a CYP2D6, impedindo a formação de Endoxifeno e anulando a proteção oncológica.',
        contraindicado: true
      });
      lista.push(ALTERNATIVAS_NAO_HORMONAIS.GABAPENTINA);
      lista.push(ALTERNATIVAS_NAO_HORMONAIS.CLONIDINA);
    } else {
      lista.push(ALTERNATIVAS_NAO_HORMONAIS.VENLAFAXINA);
      lista.push(ALTERNATIVAS_NAO_HORMONAIS.GABAPENTINA);
      lista.push(ALTERNATIVAS_NAO_HORMONAIS.CLONIDINA);
    }

    return {
      indicadoPara: 'Mulheres com contraindicação absoluta à THM (câncer de mama, TEV, DAC, etc.) ou que optam por não utilizar terapia hormonal.',
      usoTamoxifeno: usoTamoxifeno,
      opcoesFarmacologicas: lista,
      medidasNaoFarmacologicas: [
        'Ambiente fresco, roupas em camadas e ingestão de líquidos frios',
        'Cessação do tabagismo e controle rigoroso do peso corporal',
        'Prática regular de exercícios aeróbicos e musculação',
        'Técnicas de relaxamento, respiração diafragmática e mindfulness',
        'Redução do consumo de álcool, café, cafeína e alimentos condimentados'
      ]
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 8. CHECKLIST PRÉ-PRESCRIÇÃO E RASTREAMENTO ONCOLÓGICO/METABÓLICO
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Checa exames obrigatórios prévios à introdução de THM.
   *
   * @param {Object} params
   * @returns {Object} Checklist com pendências e liberações
   */
  function verificarChecklistPreThm(params) {
    params = params || {};
    var pendencias = [];
    var examesObrigatorios = [];
    var liberadoPrescricao = true;

    // Mamografia
    var mmgAtualizada = Boolean(params.mamografiaAtualizada || params.mamografiaRecente);
    var birads = params.mamografiaBirads !== undefined && params.mamografiaBirads !== null
      ? String(params.mamografiaBirads).trim().toUpperCase()
      : null;

    if (!mmgAtualizada) {
      pendencias.push('Mamografia Bilateral ausente ou desatualizada (> 1 ano). Obrigatória antes de iniciar THM.');
      liberadoPrescricao = false;
    } else if (birads) {
      if (birads.indexOf('4') >= 0 || birads.indexOf('5') >= 0) {
        pendencias.push('Mamografia com achado suspeito BI-RADS ' + birads + '. THM suspensa até investigação histopatológica/biópsia.');
        liberadoPrescricao = false;
      } else if (birads.indexOf('3') >= 0) {
        pendencias.push('Mamografia BI-RADS 3 (provavelmente benigno): controle em 6 meses recomendado antes de iniciar THM.');
      }
    }
    examesObrigatorios.push({
      exame: 'Mamografia Bilateral',
      status: mmgAtualizada ? (birads ? 'Realizada (BI-RADS ' + birads + ')' : 'Realizada no último ano') : 'PENDENTE',
      obrigatorio: true
    });

    // Preventivo do Colo Uterino
    var papanicolau = Boolean(params.preventivoColoAtualizado || params.citologiaAtualizada);
    if (!papanicolau) {
      pendencias.push('Citopatologia Oncótica do Colo Uterino desatualizada (> 1-3 anos). Solicitar exame de rastreamento.');
    }
    examesObrigatorios.push({
      exame: 'Citopatologia Oncótica (Papanicolau)',
      status: papanicolau ? 'Em dia' : 'SOLICITAR RASTREIO',
      obrigatorio: true
    });

    // USG Transvaginal (se sangramento ou útero presente com queixa)
    var ecoMm = params.ecoEndometrialMm !== undefined && params.ecoEndometrialMm !== null ? Number(params.ecoEndometrialMm) : null;
    if (ecoMm !== null) {
      if (ecoMm > 5 && (params.emMenopausa || !params.emTransicaoMenopausica)) {
        pendencias.push('Espessura endometrial aumentada (' + ecoMm + ' mm > 5 mm na pós-menopausa sem THM). Investigar com histeroscopia/biópsia.');
        liberadoPrescricao = false;
      }
    }
    examesObrigatorios.push({
      exame: 'Ultrassonografia Pélvica / Transvaginal',
      status: ecoMm !== null ? 'Realizada (Eco: ' + ecoMm + ' mm)' : 'Indicada se sangramento pós-menopausa ou suspeita anatômica',
      obrigatorio: false
    });

    // Perfil Metabólico
    examesObrigatorios.push({
      exame: 'Perfil Lipídico (Triglicerídeos, HDL, LDL) e Glicemia de Jejum',
      status: params.triglicerideos ? 'Avaliados (TG: ' + params.triglicerideos + ' mg/dL)' : 'Solicitar avaliação metabólica',
      obrigatorio: true
    });

    return {
      liberadoPrescricao: liberadoPrescricao,
      pendenciasCriticas: pendencias,
      examesObrigatorios: examesObrigatorios
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 9. AVALIAÇÃO INTEGRADA COMPLETA DA THM (ORQUESTRADOR CLÍNICO DETERMINÍSTICO)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Executa a avaliação clínica integrada completa de climatério e THM.
   *
   * @param {Object} params - Dados clínicos completos da paciente
   * @returns {Object} Parecer médico estruturado
   */
  function avaliarThmCompleto(params) {
    params = params || {};

    // 1. Janela de Oportunidade
    var janela = avaliarJanelaOportunidade(params);

    // 2. Auditoria de Contraindicações
    var seguranca = auditarContraindicacoesThm(params);

    // 3. Proteção Endometrial
    var protecao = determinarProtecaoEndometrial(params);

    // 4. Seleção de Via
    var via = selecionarViaAdministracao(params);

    // 5. Sintomas Geniturinários (SGM)
    var sgm = avaliarSintomasGeniturinarios(params);

    // 6. Checklist Pré-THM
    var checklist = verificarChecklistPreThm(params);

    // Decisão Clínica Final
    var podePrescreverThmSistemica = seguranca.elegivelThmSistemica && janela.elegivelInicio && checklist.liberadoPrescricao;

    var planoPrescricao = null;
    var alternativasNaoHormonais = null;

    if (podePrescreverThmSistemica) {
      // Montagem da prescrição personalizada de primeira linha
      var estrogenioEscolhido = via.medicamentosSugeridos[0];
      var progestEscolhido = protecao.necessitaProgestagenio ? protecao.progestagenioPrimeiraEscolha : null;

      planoPrescricao = {
        elegivel: true,
        tipoRegime: protecao.esquemaRecomendado,
        descricaoRegime: protecao.descricaoEsquema,
        estrogenio: {
          nome: estrogenioEscolhido.nome,
          apresentacao: estrogenioEscolhido.apresentacao,
          posologia: estrogenioEscolhido.dosePadrao,
          orientacoes: estrogenioEscolhido.instrucoes
        },
        progestagenio: progestEscolhido ? {
          nome: progestEscolhido.nome || progestEscolhido.farmaco,
          posologia: protecao.esquemaRecomendado === 'SEQUENCIAL_CICLICO' ? progestEscolhido.doseCiclico : progestEscolhido.doseContinuo,
          justificativa: progestEscolhido.perfilClinico
        } : null,
        sgmAdicional: sgm.presente ? sgm.opcoesPrescricao[0] : null,
        revisao: 'Reavaliação clínica obrigatória em 3 meses (eficácia sintomática, controle de sangramento e aferição de PA), e a cada 6 a 12 meses subsequentemente.'
      };
    } else {
      // Prescrição de alternativas não hormonais
      alternativasNaoHormonais = sugerirAlternativasNaoHormonais(params);
    }

    return {
      statusFinal: podePrescreverThmSistemica ? 'THM_SISTEMICA_INDICADA_E_SEGURA' : 'THM_SISTEMICA_NAO_INDICADA_OU_CONTRAINDICADA',
      podePrescreverThmSistemica: podePrescreverThmSistemica,
      janelaOportunidade: janela,
      segurancaContraindicacoes: seguranca,
      protecaoEndometrial: protecao,
      viaAdministracao: via,
      sintomasGeniturinarios: sgm,
      checklistPreThm: checklist,
      planoPrescricao: planoPrescricao,
      alternativasNaoHormonais: alternativasNaoHormonais
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 10. FORMATADOR TEXTUAL PARA PRONTUÁRIO / TELEGRAM / COCKPIT
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Gera um resumo médico formatado em texto para inserção em prontuário ou Cockpit.
   *
   * @param {Object} params
   * @returns {string} Relatório textual estruturado
   */
  function gerarResumoThm(params) {
    var resultado = avaliarThmCompleto(params);
    var linhas = [];

    linhas.push('════════════════════════════════════════════════════════════════');
    linhas.push('🩺 PARECER DETERMINÍSTICO: CLIMATÉRIO E TERAPIA HORMONAL (THM)');
    linhas.push('   Consenso FEBRASGO & The Menopause Society (NAMS 2022-2023)');
    linhas.push('════════════════════════════════════════════════════════════════');
    linhas.push('');

    // 1. Janela de Oportunidade
    linhas.push('⏳ [1. JANELA DE OPORTUNIDADE]');
    linhas.push('• Classificação: ' + resultado.janelaOportunidade.classificacao);
    linhas.push('• Relação Risco-Benefício: ' + resultado.janelaOportunidade.relacaoRiscoBeneficio);
    linhas.push('• Justificativa Clínica: ' + resultado.janelaOportunidade.justificativa);
    if (resultado.janelaOportunidade.alertas.length > 0) {
      for (var ja = 0; ja < resultado.janelaOportunidade.alertas.length; ja++) {
        linhas.push('  ' + resultado.janelaOportunidade.alertas[ja]);
      }
    }
    linhas.push('');

    // 2. Segurança e Contraindicações
    linhas.push('🛡️ [2. SEGURANÇA ONCOLÓGICA E CARDIOVASCULAR]');
    linhas.push('• Grau de Segurança: ' + resultado.segurancaContraindicacoes.grauSeguranca);
    if (resultado.segurancaContraindicacoes.contraindicacoesAbsolutas.length > 0) {
      linhas.push('• 🚨 Contraindicações Absolutas Identificadas:');
      for (var ca = 0; ca < resultado.segurancaContraindicacoes.contraindicacoesAbsolutas.length; ca++) {
        var cAbs = resultado.segurancaContraindicacoes.contraindicacoesAbsolutas[ca];
        linhas.push('  - ' + cAbs.fator + ': ' + cAbs.motivo);
      }
    } else {
      linhas.push('• Ausência de contraindicações absolutas documentadas.');
    }

    if (resultado.segurancaContraindicacoes.contraindicacoesRelativas.length > 0) {
      linhas.push('• ⚠️ Condicionantes / Precauções:');
      for (var cr = 0; cr < resultado.segurancaContraindicacoes.contraindicacoesRelativas.length; cr++) {
        var cRel = resultado.segurancaContraindicacoes.contraindicacoesRelativas[cr];
        linhas.push('  - ' + cRel.fator + ' -> ' + cRel.conduta);
      }
    }
    linhas.push('');

    // 3. Proteção Endometrial
    linhas.push('🎗️ [3. REGRA DE OURO DA PROTEÇÃO ENDOMETRIAL]');
    linhas.push('• Status Uterino: ' + (resultado.protecaoEndometrial.uteroPresente ? 'ÚTERO PRESENTE (INTACTO)' : 'HISTERECTOMIZADA'));
    linhas.push('• Necessidade de Progestagênio: ' + (resultado.protecaoEndometrial.necessitaProgestagenio ? 'SIM (OBRIGATÓRIO)' : 'NÃO (ESTROGÊNIO ISOLADO)'));
    linhas.push('• Alerta Clínico: ' + resultado.protecaoEndometrial.alertaSeguranca);
    linhas.push('• Regime Indicado: ' + resultado.protecaoEndometrial.descricaoEsquema);
    linhas.push('');

    // 4. Via de Administração
    linhas.push('💉 [4. VIA DE ADMINISTRAÇÃO SELECIONADA]');
    linhas.push('• Via de Escolha: ' + resultado.viaAdministracao.viaIndicada);
    linhas.push('• Justificativa: ' + resultado.viaAdministracao.justificativaFarmacologica);
    linhas.push('');

    // 5. Conduta Terapêutica Personalizada
    if (resultado.podePrescreverThmSistemica && resultado.planoPrescricao) {
      linhas.push('💊 [5. PRESCRIÇÃO FARMACOLÓGICA DE 1ª LINHA RECOMENDADA]');
      linhas.push('• Estrogênio Sistêmico:');
      linhas.push('  - ' + resultado.planoPrescricao.estrogenio.nome);
      linhas.push('    Posologia: ' + resultado.planoPrescricao.estrogenio.posologia);
      linhas.push('    Aplicação: ' + resultado.planoPrescricao.estrogenio.orientacoes);

      if (resultado.planoPrescricao.progestagenio) {
        linhas.push('• Progestagênio de Oposição Endometrial:');
        linhas.push('  - ' + resultado.planoPrescricao.progestagenio.nome);
        linhas.push('    Posologia: ' + resultado.planoPrescricao.progestagenio.posologia);
      }

      if (resultado.planoPrescricao.sgmAdicional) {
        linhas.push('• Terapia Vaginal Local Adicional (SGM):');
        linhas.push('  - ' + resultado.planoPrescricao.sgmAdicional.nome);
        linhas.push('    Ataque: ' + resultado.planoPrescricao.sgmAdicional.posologiaAtaque);
        linhas.push('    Manutenção: ' + resultado.planoPrescricao.sgmAdicional.posologiaManutencao);
      }
      linhas.push('• Seguimento: ' + resultado.planoPrescricao.revisao);
    } else {
      linhas.push('🚫 [5. CONDUTA TERAPÊUTICA: ALTERNATIVAS NÃO HORMONAIS]');
      linhas.push('• THM sistêmica não autorizada devido a contraindicação ou pendência de exames.');
      if (resultado.alternativasNaoHormonais) {
        linhas.push('• Alternativas Farmacológicas para Sintomas Vasomotores:');
        for (var alt = 0; alt < resultado.alternativasNaoHormonais.opcoesFarmacologicas.length; alt++) {
          var oF = resultado.alternativasNaoHormonais.opcoesFarmacologicas[alt];
          if (oF.contraindicado) {
            linhas.push('  ' + oF.alertaCritico);
          } else {
            linhas.push('  💊 ' + oF.farmaco + ' (' + oF.dose + ') - ' + (oF.indicacao || ''));
          }
        }
      }
    }

    // 6. Checklist de Exames
    if (resultado.checklistPreThm.pendenciasCriticas.length > 0) {
      linhas.push('');
      linhas.push('📋 [6. PENDÊNCIAS OBRIGATÓRIAS ANTES DO INÍCIO]');
      for (var pend = 0; pend < resultado.checklistPreThm.pendenciasCriticas.length; pend++) {
        linhas.push('  ⚠️ ' + resultado.checklistPreThm.pendenciasCriticas[pend]);
      }
    }

    linhas.push('');
    linhas.push('════════════════════════════════════════════════════════════════');
    linhas.push('Diretrizes de Referência: FEBRASGO, NAMS 2022/2023 & Consenso BR');
    linhas.push('════════════════════════════════════════════════════════════════');

    return linhas.join('\n');
  }

  // Exportação Pública
  return {
    VIAS_ESTROGENIO: VIAS_ESTROGENIO,
    PROGESTAGENIOS: PROGESTAGENIOS,
    TERAPIA_VAGINAL_SGM: TERAPIA_VAGINAL_SGM,
    ALTERNATIVAS_NAO_HORMONAIS: ALTERNATIVAS_NAO_HORMONAIS,
    avaliarJanelaOportunidade: avaliarJanelaOportunidade,
    auditarContraindicacoesThm: auditarContraindicacoesThm,
    determinarProtecaoEndometrial: determinarProtecaoEndometrial,
    selecionarViaAdministracao: selecionarViaAdministracao,
    avaliarSintomasGeniturinarios: avaliarSintomasGeniturinarios,
    sugerirAlternativasNaoHormonais: sugerirAlternativasNaoHormonais,
    verificarChecklistPreThm: verificarChecklistPreThm,
    avaliarThmCompleto: avaliarThmCompleto,
    gerarResumoThm: gerarResumoThm
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ClimaterioThmService: ClimaterioThmService };
}
