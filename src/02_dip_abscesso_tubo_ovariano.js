/**
 * ==============================================================================
 * MÓDULO 02: DOENÇA INFLAMATÓRIA PÉLVICA (DIP) E ABSCESSO TUBO-OVARIANO (ATO)
 * ==============================================================================
 * Motor determinístico de alta fidelidade clínica e farmacológica para o manejo da
 * Doença Inflamatória Pélvica (DIP / Pelvic Inflammatory Disease - PID) e Abscesso
 * Tubo-Ovariano (ATO / Tubo-Ovarian Abscess - TOA), fundamentado nas diretrizes:
 *  - PCDT de Infecções Sexualmente Transmissíveis (Ministério da Saúde do Brasil, 2022/2024).
 *  - CDC Sexually Transmitted Infections Treatment Guidelines (CDC STI Guidelines 2021/2024).
 *  - FEBRASGO: Manual de Urgências Ginecológicas e Tratado de Ginecologia.
 *  - RCOG Green-top Guideline No. 44: Management of Pelvic Inflammatory Disease.
 *
 * PILARES CLÍNICOS DETERMINÍSTICOS:
 * 1. Critérios Diagnósticos Escalonados (Hager Modificados / PCDT MS / CDC):
 *    - 3 Critérios Maiores (Clínicos): Dor no hipogástrio/baixo ventre, dor à palpação anexial
 *      uni ou bilateral, e dor à mobilização do colo uterino (Sinal de Frenkel).
 *      (O CDC orienta iniciar tratamento empírico em mulher jovem com dor no baixo ventre +
 *      dor anexial OU mobilização cervical, sem outra etiologia confirmada).
 *    - Critérios Menores (Sistêmicos/Laboratoriais): Febre axilar >= 37.5°C ou oral/timpânica >= 38.3°C,
 *      corrimento endocervical anormal mucopurulento/friabilidade, leucocitose sanguínea,
 *      provas inflamatórias elevadas (PCR/VHS), comprovação microbiológica (N. gonorrhoeae,
 *      C. trachomatis ou M. genitalium) ou > 10 leucócitos/campo no exame a fresco.
 *    - Critérios Elaborados (Definitivos/Alta Gravidade): Biópsia endometrial com endometrite,
 *      USG pélvica/transvaginal ou RM mostrando espessamento tubário/piossalpinge/ATO/líquido livre,
 *      ou achados laparoscópicos de salpingite/peritonite pélvica/Fitz-Hugh-Curtis.
 * 2. Estadiamento Clínico de Monif (Gravidade da DIP):
 *    - Estágio I: DIP não complicada, restrita ao trato genital superior, sem peritonite. (Ambulatorial).
 *    - Estágio II: Salpingite aguda com peritonite pélvica. (Hospitalar IV).
 *    - Estágio III: Salpingite aguda com complexo ou abscesso tubo-ovariano (ATO) íntegro. (Hospitalar IV).
 *    - Estágio IV: Abscesso tubo-ovariano roto, choque séptico ou peritonite difusa. (Cirurgia Urgente).
 * 3. Critérios Formais de Internação Imediata:
 *    - Gestação (risco materno-fetal crítico, necessidade de exclusão de ectópica e ajuste farmacológico).
 *    - Ausência de resposta ou piora após 48 a 72 horas de tratamento ambulatorial.
 *    - Intolerância oral, vômitos incoercíveis.
 *    - Presença de Abscesso Tubo-Ovariano (ATO).
 *    - Quadro clínico grave, febre alta persistente, toxemia, peritonite ou suspeita de sepse.
 *    - Impossibilidade de excluir emergência cirúrgica (apendicite aguda, torção anexial, prenhez ectópica).
 *    - Risco de não adesão ao esquema oral ou acompanhamento ambulatorial inviável em 72h.
 *    - Paciente imunossuprimida (HIV com imunodeficiência avançada).
 * 4. Farmacologia Determinística de Alta Precisão (PCDT MS / CDC / REMUME):
 *    - Esquema Ambulatorial de 1ª Linha: Ceftriaxona 500 mg IM dose única (1 g se peso >= 150 kg) +
 *      Doxiciclina 100 mg VO 12/12h por 14 dias + Metronidazol 500 mg VO 12/12h por 14 dias.
 *    - Esquema Hospitalar A (1ª Linha IV): Ceftriaxona 1 g IV a cada 24h + Doxiciclina 100 mg VO/IV 12/12h +
 *      Metronidazol 500 mg IV/VO 12/12h até completar 14 dias (com transição para VO após 24-48h afebril).
 *    - Esquema Hospitalar B (Preferencial em ATO): Clindamicina 900 mg IV 8/8h + Gentamicina (ataque 2 mg/kg
 *      seguido de 1,5 mg/kg 8/8h ou dose única diária 3-5 mg/kg/dia ajustada por ClCr).
 *    - Manejo do ATO: Cobertura anti-anaeróbia mandatória por 14 dias; coleções >= 8-10 cm ou refratárias
 *      a 48-72h de ATB indicam drenagem percutânea/transvaginal guiada ou cirurgia conservadora.
 * 5. Manejo de DIU e Concomitâncias:
 *    - Não remover DIU de rotina no primeiro atendimento de DIP leve/moderada; iniciar ATB e reavaliar em 48-72h;
 *      considerar remoção se ausência de melhora ou em DIP grave (Monif III/IV).
 *    - Tratamento e rastreio obrigatório de todos os parceiros sexuais dos últimos 60 dias (Ceftriaxona + Azitromicina).
 *    - Alerta de Síndrome de Fitz-Hugh-Curtis (peri-hepatite) e abstinência alcoólica com Metronidazol.
 * ==============================================================================
 */

var DipAbscessoTuboOvarianoService = (function() {
  'use strict';

  // ───────────────────────────────────────────────────────────────────────────
  // 1. CATÁLOGO FARMACOLÓGICO DETERMINÍSTICO (PCDT MS / CDC STI 2021)
  // ───────────────────────────────────────────────────────────────────────────

  var CATALOGO_FARMACOLOGICO = {
    AMBULATORIAL_PRIMEIRA_LINHA: {
      ceftriaxona: {
        medicamento: 'Ceftriaxona',
        dosePadrao: '500 mg',
        doseAjustadaObesidade: '1 g',
        criterioAjusteObesidade: 'Peso corporal >= 150 kg',
        via: 'Intramuscular (IM)',
        frequencia: 'Dose única',
        duracao: 'Dose única no dia do atendimento (D1)',
        indicacao: 'Cobertura empírica de Neisseria gonorrhoeae (incluindo cepas com sensibilidade reduzida)',
        alertaCritico: 'Administrar imediatamente no primeiro contato assistencial. Não postergar.'
      },
      doxiciclina: {
        medicamento: 'Doxiciclina',
        dose: '100 mg',
        via: 'Oral (VO)',
        frequencia: '12 em 12 horas',
        duracao: '14 dias consecutivos',
        indicacao: 'Cobertura de Chlamydia trachomatis e Mycoplasma genitalium',
        orientacaoPaciente: 'Ingerir com 1 copo cheio de água (200-250 mL) e PERMANECER EM PÉ OU SENTADO por pelo menos 30 a 60 minutos após a tomada para prevenir esofagite medicamentosa severa e ulceração esofágica.',
        contraindicacaoAbsoluta: 'Gestação (categoria D - risco de pigmentação dentária permanente, hipoplasia de esmalte e alteração do crescimento ósseo) e lactação.'
      },
      metronidazol: {
        medicamento: 'Metronidazol',
        dose: '500 mg',
        via: 'Oral (VO)',
        frequencia: '12 em 12 horas',
        duracao: '14 dias consecutivos',
        indicacao: 'Cobertura estrita de anaeróbios pélvicos (Bacteroides fragilis, Peptostreptococcus) e tratamento concomitante de Trichomonas vaginalis e Vaginose Bacteriana',
        orientacaoPaciente: 'ABSTINÊNCIA ALCOÓLICA OBRIGATÓRIA durante todo o tratamento e por pelo menos 48 horas após a última dose devido ao risco de Efeito Dissulfiram-like (rubor, taquicardia, náuseas, vômitos e colapso circulatório).'
      }
    },

    AMBULATORIAL_ALTERNATIVAS: {
      cefoxitinaProbenecida: {
        nome: 'Esquema Alternativo com Cefoxitina',
        medicamentos: [
          'Cefoxitina 2 g IM dose única',
          'Probenecida 1 g VO dose única (administrada simultaneamente)',
          'Doxiciclina 100 mg VO 12/12h por 14 dias',
          'Metronidazol 500 mg VO 12/12h por 14 dias'
        ],
        indicacao: 'Alternativa quando ceftriaxona indisponível e paciente com boa tolerância a cefalosporinas de 2ª geração.'
      },
      quinolonaComMetronidazol: {
        nome: 'Regime Alternativo para Alergia Severa a Cefalosporinas (Com Restrições)',
        medicamentos: [
          'Levofloxacino 500 mg VO 1x/dia por 14 dias (OU Ofloxacino 400 mg VO 12/12h por 14 dias)',
          'Metronidazol 500 mg VO 12/12h por 14 dias'
        ],
        alertaCritico: 'ATENÇÃO: As taxas de resistência de N. gonorrhoeae a fluoroquinolonas no Brasil superam 40-50%. Utilizar APENAS se alergia severa comprovada a beta-lactâmicos (anafilaxia) e se perfil de sensibilidade conhecido ou hospitalização inviável.'
      }
    },

    HOSPITALAR_PRIMEIRA_LINHA_A: {
      nome: 'Regime Parenteral A (PCDT MS / CDC - 1ª Linha Hospitalar)',
      medicamentos: [
        {
          medicamento: 'Ceftriaxona',
          dose: '1 g',
          via: 'Intravenosa (IV)',
          frequencia: 'A cada 24 horas',
          duracao: 'Parenteral até 24-48h afebril e com melhora clínica objetiva'
        },
        {
          medicamento: 'Doxiciclina',
          dose: '100 mg',
          via: 'Oral (VO) ou Intravenosa (IV)',
          frequencia: 'A cada 12 horas',
          duracao: '14 dias totais',
          notaVia: 'A via oral é preferencial por ter biodisponibilidade de quase 100% e evitar dor e flebite química severa da infusão venosa de doxiciclina.'
        },
        {
          medicamento: 'Metronidazol',
          dose: '500 mg (ou 400 mg)',
          via: 'Intravenosa (IV) ou Oral (VO)',
          frequencia: 'A cada 12 horas (ou 8/8h conforme formulação IV)',
          duracao: '14 dias totais'
        }
      ],
      transicaoOral: 'Após melhora clínica documentada e 24 a 48 horas afebril: transicionar para Doxiciclina 100 mg VO 12/12h + Metronidazol 500 mg VO 12/12h até completar o total de 14 dias de tratamento.'
    },

    HOSPITALAR_PRIMEIRA_LINHA_B: {
      nome: 'Regime Parenteral B (Preferencial em Abscesso Tubo-Ovariano e Manipulação Cirúrgica)',
      medicamentos: [
        {
          medicamento: 'Clindamicina',
          dose: '900 mg',
          via: 'Intravenosa (IV)',
          frequencia: 'A cada 8 horas',
          duracao: 'Até melhora clínica e 24-48h afebril',
          indicacao: 'Excelente penetração tecidual e cobertura anti-anaeróbia superior em abscessos'
        },
        {
          medicamento: 'Gentamicina',
          doseAtaque: '2 mg/kg',
          doseManutencao: '1,5 mg/kg',
          frequencia: 'A cada 8 horas IV/IM (ou esquema de dose única diária 3 a 5 mg/kg/dia IV em infusão de 60 min)',
          ajusteRenalObrigatorio: 'Exige dosagem de Creatinina e ajuste estrito de intervalo se ClCr < 50 mL/min devido a nefrotoxicidade e ototoxicidade.',
          indicacao: 'Cobertura de bacilos Gram-negativos entéricos facultativos'
        }
      ],
      transicaoOral: 'Após melhora clínica evidente e paciente afebril há 24-48h: transicionar para Doxiciclina 100 mg VO 12/12h + Metronidazol 500 mg VO 12/12h OU Clindamicina 450 mg VO 6/6h até completar 14 dias totais.'
    },

    HOSPITALAR_ALTERNATIVO_AMPICILINA_SULBACTAM: {
      nome: 'Regime Parenteral Alternativo com Ampicilina-Sulbactam',
      medicamentos: [
        {
          medicamento: 'Ampicilina-Sulbactam',
          dose: '3 g',
          via: 'Intravenosa (IV)',
          frequencia: 'A cada 6 horas',
          duracao: 'Até melhora clínica e afebril por 24-48h'
        },
        {
          medicamento: 'Doxiciclina',
          dose: '100 mg',
          via: 'Oral (VO) ou Intravenosa (IV)',
          frequencia: 'A cada 12 horas',
          duracao: '14 dias totais'
        }
      ]
    },

    GESTACAO_REGIME_ESPECIAL: {
      nome: 'Regime Hospitalar Especial para Gestante (Bloqueio Absoluto de Tetraciclinas e Quinolonas)',
      medicamentos: [
        {
          medicamento: 'Ceftriaxona',
          dose: '1 g',
          via: 'Intravenosa (IV)',
          frequencia: 'A cada 24 horas'
        },
        {
          medicamento: 'Azitromicina',
          dose: '1 g VO no D1, seguido de 500 mg VO 1x/dia por 7 dias (ou 1 g VO nos dias 1 e 7)',
          via: 'Oral (VO) ou Intravenosa (IV)',
          indicacao: 'Substituta segura da doxiciclina na gestação para cobertura de Chlamydia trachomatis'
        },
        {
          medicamento: 'Metronidazol',
          dose: '500 mg (ou 400 mg)',
          via: 'Intravenosa (IV) ou Oral (VO)',
          frequencia: 'A cada 12 horas por 14 dias',
          seguranca: 'Uso autorizado na gestação quando indicado para DIP/infecções anaeróbias graves.'
        }
      ],
      alertaCritico: 'Gestante com DIP tem indicação de INTERNAÇÃO HOSPITALAR OBRIGATÓRIA. Risco aumentado de abortamento, parto prematuro, corioamnionite e abscesso. Doxiciclina É ESTRITAMENTE CONTRAINDICADA.'
    },

    PARCEIROS_SEXUAIS: {
      nome: 'Protocolo de Tratamento Empírico de Parceiros Sexuais (Últimos 60 dias)',
      medicamentos: [
        {
          medicamento: 'Ceftriaxona',
          dose: '500 mg',
          via: 'Intramuscular (IM)',
          frequencia: 'Dose única',
          indicacao: 'Cobertura de N. gonorrhoeae'
        },
        {
          medicamento: 'Azitromicina',
          dose: '1 g',
          via: 'Oral (VO)',
          frequencia: 'Dose única (OU Doxiciclina 100 mg VO 12/12h por 7 dias)',
          indicacao: 'Cobertura de C. trachomatis'
        }
      ],
      orientacoesGerais: [
        'Tratar OBRIGATORIAMENTE todos os parceiros sexuais dos últimos 60 dias anteriores aos sintomas.',
        'Se o último contato sexual ocorreu há mais de 60 dias, tratar o último parceiro sexual.',
        'Abstinência sexual total até que a paciente e todos os parceiros tenham completado o tratamento e estejam assintomáticos.',
        'Oferecer rastreio sorológico completo para ISTs: HIV, Sífilis (VDRL/teste rápido) e Hepatites B e C.'
      ]
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 2. AVALIAÇÃO DETERMINÍSTICA DE CRITÉRIOS DIAGNÓSTICOS (HAGER / PCDT MS / CDC)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avalia os critérios diagnósticos escalonados para Doença Inflamatória Pélvica.
   *
   * @param {Object} params
   * @param {boolean} params.dorHipogastrio - Dor espontânea ou à palpação no hipogástrio/baixo ventre
   * @param {boolean} params.dorAnexial - Dor à palpação anexial unilateral ou bilateral
   * @param {boolean} params.dorMobilizacaoColo - Dor à mobilização do colo uterino (Sinal de Frenkel)
   * @param {boolean} [params.febre] - Febre axilar >= 37.5°C ou oral/timpânica >= 38.3°C
   * @param {number} [params.temperaturaCelsius] - Temperatura corporal aferida
   * @param {boolean} [params.corrimentoEndocervicalAnormal] - Corrimento endocervical purulento/mucopurulento ou friabilidade
   * @param {boolean} [params.leucocitose] - Leucocitose no hemograma (> 10.000 a 10.500/mm³ ou desvio à esquerda)
   * @param {number} [params.leucocitosValor] - Contagem de leucócitos no hemograma
   * @param {boolean} [params.vhsPcrElevados] - VHS ou Proteína C-Reativa sérica elevada
   * @param {number} [params.pcrValor] - Valor da PCR sérica em mg/L (normal < 5-6 mg/L)
   * @param {boolean} [params.testeIstPositivo] - PCR/NAAT positivo para C. trachomatis, N. gonorrhoeae ou M. genitalium
   * @param {boolean} [params.leucocitosExameFresco] - > 10 leucócitos por campo no exame a fresco vaginal
   * @param {boolean} [params.biopsiaEndometrite] - Biópsia de endométrio com evidência histológica de endometrite (Critério Elaborado)
   * @param {boolean} [params.imagemCompativel] - Imagem (USG/TC/RM) com espessamento tubário, hidrossalpinge/piossalpinge, líquido livre ou ATO (Critério Elaborado)
   * @param {boolean} [params.laparoscopiaCompativel] - Laparoscopia com achados visuais de salpingite aguda ou peritonite (Critério Elaborado)
   * @param {boolean} [params.sintomaFitzHughCurtis] - Dor em hipocôndrio direito tipo pleurítica (Peri-hepatite)
   * @returns {Object} Avaliação detalhada de critérios e probabilidade diagnóstica
   */
  function avaliarCriteriosDiagnosticos(params) {
    params = params || {};

    // 1. Critérios Maiores (Clínicos)
    var dorHipogastrio = Boolean(params.dorHipogastrio);
    var dorAnexial = Boolean(params.dorAnexial);
    var dorMobilizacaoColo = Boolean(params.dorMobilizacaoColo);

    var contagemMaiores = 0;
    if (dorHipogastrio) contagemMaiores++;
    if (dorAnexial) contagemMaiores++;
    if (dorMobilizacaoColo) contagemMaiores++;

    var criteriosMaiores = {
      dorHipogastrio: dorHipogastrio,
      dorAnexial: dorAnexial,
      dorMobilizacaoColo: dorMobilizacaoColo,
      totalPresentes: contagemMaiores,
      todosPresentes: contagemMaiores === 3
    };

    // 2. Critérios Menores (Sistêmicos / Laboratoriais)
    var febre = Boolean(params.febre);
    if (typeof params.temperaturaCelsius === 'number' && params.temperaturaCelsius >= 37.5) {
      febre = true;
    }

    var corrimento = Boolean(params.corrimentoEndocervicalAnormal);
    
    var leucocitose = Boolean(params.leucocitose);
    if (typeof params.leucocitosValor === 'number' && params.leucocitosValor > 10000) {
      leucocitose = true;
    }

    var vhsPcrElevados = Boolean(params.vhsPcrElevados);
    if (typeof params.pcrValor === 'number' && params.pcrValor > 6) {
      vhsPcrElevados = true;
    }

    var testeIstPositivo = Boolean(params.testeIstPositivo);
    var leucocitosExameFresco = Boolean(params.leucocitosExameFresco);

    var menoresDetalhados = [];
    if (febre) menoresDetalhados.push('Febre (>= 37.5°C axilar ou >= 38.3°C oral)');
    if (corrimento) menoresDetalhados.push('Corrimento endocervical anormal mucopurulento ou friabilidade cervical');
    if (leucocitose) menoresDetalhados.push('Leucocitose periférica (> 10.000/mm³ ou desvio à esquerda)');
    if (vhsPcrElevados) menoresDetalhados.push('Marcadores inflamatórios séricos elevados (PCR ou VHS)');
    if (testeIstPositivo) menoresDetalhados.push('Comprovação laboratorial de infecção por C. trachomatis, N. gonorrhoeae ou M. genitalium');
    if (leucocitosExameFresco) menoresDetalhados.push('Mais de 10 leucócitos por campo de grande aumento no exame a fresco da secreção vaginal');

    var contagemMenores = menoresDetalhados.length;

    var criteriosMenores = {
      febre: febre,
      corrimentoEndocervicalAnormal: corrimento,
      leucocitose: leucocitose,
      vhsPcrElevados: vhsPcrElevados,
      testeIstPositivo: testeIstPositivo,
      leucocitosExameFresco: leucocitosExameFresco,
      totalPresentes: contagemMenores,
      lista: menoresDetalhados
    };

    // 3. Critérios Elaborados (Definitivos / Alta Gravidade)
    var biopsia = Boolean(params.biopsiaEndometrite);
    var imagem = Boolean(params.imagemCompativel);
    var laparoscopia = Boolean(params.laparoscopiaCompativel);

    var elaboradosDetalhados = [];
    if (biopsia) elaboradosDetalhados.push('Biópsia endometrial evidenciando endometrite histopatológica');
    if (imagem) elaboradosDetalhados.push('Imagem (USG pélvica/TC/RM) com espessamento tubário (>5mm), piossalpinge, líquido livre ou abscesso tubo-ovariano (ATO)');
    if (laparoscopia) elaboradosDetalhados.push('Laparoscopia confirmatória com hiperemia tubária, exsudato purulento ou peritonite pélvica');

    var contagemElaborados = elaboradosDetalhados.length;

    var criteriosElaborados = {
      biopsiaEndometrite: biopsia,
      imagemCompativel: imagem,
      laparoscopiaCompativel: laparoscopia,
      totalPresentes: contagemElaborados,
      lista: elaboradosDetalhados
    };

    // 4. Determinação Diagnóstica
    var diagnosticoClassicoHager = (contagemMaiores === 3 && contagemMenores >= 1);
    var diagnosticoPorElaborado = (contagemElaborados >= 1);
    
    // Regra CDC de limiar baixo: dor pélvica/baixo ventre + dor à mobilização colo OU dor anexial em mulher sexualmente ativa
    var suspeitaClinicaCdc = (dorHipogastrio && (dorMobilizacaoColo || dorAnexial));

    var statusDiagnostico = 'IMPROVAVEL';
    var confiancaDiagnostica = 'BAIXA';
    var justificativa = '';

    if (diagnosticoPorElaborado) {
      statusDiagnostico = 'CONFIRMADO_CRITERIO_ELABORADO';
      confiancaDiagnostica = 'DEFINITIVA';
      justificativa = 'Presença de pelo menos 1 critério elaborado definitivo (imagem, biópsia ou laparoscopia). Diagnóstico de DIP confirmado com alta especificidade.';
    } else if (diagnosticoClassicoHager) {
      statusDiagnostico = 'CONFIRMADO_CRITERIOS_HAGER_PCDT';
      confiancaDiagnostica = 'ALTA';
      justificativa = 'Presença dos 3 critérios maiores clássicos associados a ' + contagemMenores + ' critério(s) menor(es), atendendo integralmente ao PCDT MS e Consenso de Hager.';
    } else if (suspeitaClinicaCdc) {
      statusDiagnostico = 'SUSPEITA_CLINICA_CDC_INDICADA_TERAPIA';
      confiancaDiagnostica = 'MODERADA';
      justificativa = 'Atende aos critérios práticos do CDC STI Guidelines: dor em baixo ventre associada a dor à mobilização cervical ou dor anexial. O CDC orienta iniciar tratamento empírico para evitar sequelas tubárias graves (infertilidade, dor crônica e prenhez ectópica).';
    } else if (contagemMaiores >= 1 || contagemMenores >= 2) {
      statusDiagnostico = 'SUSPEITA_INICIAL';
      confiancaDiagnostica = 'BAIXA_A_MODERADA';
      justificativa = 'Achados parciais insuficientes para diagnóstico formal imediato de DIP. Investigar diagnósticos diferenciais (ITU, apendicite, endometriose, cisto hemorrágico, torção ovariana).';
    } else {
      statusDiagnostico = 'NAO_SUGESTIVO';
      confiancaDiagnostica = 'MUITO_BAIXA';
      justificativa = 'Quadro clínico atual não preenche critérios maiores nem elaborados para DIP.';
    }

    var periHepatite = Boolean(params.sintomaFitzHughCurtis);

    return {
      statusDiagnostico: statusDiagnostico,
      confiancaDiagnostica: confiancaDiagnostica,
      justificativa: justificativa,
      indicacaoTratamentoEmpirico: (statusDiagnostico === 'CONFIRMADO_CRITERIO_ELABORADO' || statusDiagnostico === 'CONFIRMADO_CRITERIOS_HAGER_PCDT' || statusDiagnostico === 'SUSPEITA_CLINICA_CDC_INDICADA_TERAPIA'),
      criteriosMaiores: criteriosMaiores,
      criteriosMenores: criteriosMenores,
      criteriosElaborados: criteriosElaborados,
      sindromeFitzHughCurtisPresente: periHepatite,
      alertaFitzHughCurtis: periHepatite ? 'ALERTA SÍNDROME DE FITZ-HUGH-CURTIS: Dor pleurítica em hipocôndrio direito decorrente de peri-hepatite gonocócica ou clamidiana com aderências em corda de violino na cápsula hepática. Excluir colecistite aguda e manter cobertura antimicrobiana plena da DIP.' : null
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. ESTADIAMENTO CLÍNICO DE MONIF E GRAVIDADE
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Estadia a Doença Inflamatória Pélvica pela Classificação de Monif.
   *
   * @param {Object} params
   * @param {boolean} [params.peritonitePelvica] - Presença de sinais de irritação peritoneal pélvica (DB dolorosa no hipogástrio)
   * @param {boolean} [params.peritoniteDifusa] - Sinais de peritonite difusa (abdome em tábua, descompressão em múltiplos quadrantes)
   * @param {boolean} [params.presencaAto] - Presença de Abscesso Tubo-Ovariano diagnosticado
   * @param {boolean} [params.atoRoto] - Evidência ou suspeita clínica de ruptura do abscesso tubo-ovariano
   * @param {boolean} [params.choqueSeptico] - Choque séptico ou instabilidade hemodinâmica grave
   * @param {number} [params.tamanhoAtoCm] - Diâmetro maior do abscesso em cm (se presente)
   * @returns {Object} Estádio de Monif, gravidade e plano de local de cuidado
   */
  function estadiarMonif(params) {
    params = params || {};

    var peritonitePelvica = Boolean(params.peritonitePelvica);
    var peritoniteDifusa = Boolean(params.peritoniteDifusa);
    var presencaAto = Boolean(params.presencaAto);
    var atoRoto = Boolean(params.atoRoto);
    var choqueSeptico = Boolean(params.choqueSeptico);
    var tamanhoAto = typeof params.tamanhoAtoCm === 'number' ? params.tamanhoAtoCm : null;

    var estagio = 'ESTAGIO_I';
    var nomeEstagio = 'Estágio I de Monif';
    var descricao = 'Endometrite / Salpingite aguda não complicada, sem peritonite pélvica.';
    var localCuidado = 'AMBULATORIAL';
    var necessidadeCirurgica = 'NAO_INDICADA';
    var alertaCritico = null;

    if (atoRoto || choqueSeptico || peritoniteDifusa) {
      estagio = 'ESTAGIO_IV';
      nomeEstagio = 'Estágio IV de Monif (Abscesso Tubo-Ovariano Roto / Choque Séptico)';
      descricao = 'Abscesso tubo-ovariano com rotura, peritonite difusa ou sepse grave/choque séptico.';
      localCuidado = 'HOSPITALAR_CENTRO_CIRURGICO_UTI';
      necessidadeCirurgica = 'EMERGENCIA_CIRURGICA_IMEDIATA';
      alertaCritico = 'EMERGÊNCIA CIRÚRGICA ABSOLUTA: Ruptura de ATO tem mortalidade elevada (até 8-10% se tardio). Indicação formal de laparotomia/laparoscopia exploradora de emergência para drenagem ampla, lavagem exaustiva e controle de foco infeccioso.';
    } else if (presencaAto) {
      estagio = 'ESTAGIO_III';
      nomeEstagio = 'Estágio III de Monif (Abscesso Tubo-Ovariano Íntegro)';
      descricao = 'Salpingite aguda com oclusão tubária e formação de complexo ou abscesso tubo-ovariano (ATO) íntegro.';
      localCuidado = 'HOSPITALAR_ENFERMARIA_ALTO_RISCO';
      necessidadeCirurgica = (tamanhoAto && tamanhoAto >= 8) ? 'AVALIAR_DRENAGEM_PRECOCE_SE_MAIOR_8CM' : 'OBSERVACAO_COM_ATB_IV_REAVALIAR_48_72H';
      
      if (tamanhoAto && tamanhoAto >= 8) {
        alertaCritico = 'ATO volumoso (>= ' + tamanhoAto + ' cm): Baixa resposta a tratamento exclusivamente farmacológico (falha > 40-50%). Considerar drenagem percutânea ou transvaginal precoce guiada por USG/TC em adição ao esquema IV.';
      } else {
        alertaCritico = 'Internação hospitalar obrigatória com antibioticoterapia intravenosa com cobertura anti-anaeróbia estrita por pelo menos 48-72h. Se refratariedade ou piora, indicar drenagem ou cirurgia.';
      }
    } else if (peritonitePelvica) {
      estagio = 'ESTAGIO_II';
      nomeEstagio = 'Estágio II de Monif (Salpingite com Peritonite Pélvica)';
      descricao = 'Salpingite aguda complicada com peritonite pélvica localizada.';
      localCuidado = 'HOSPITALAR_ENFERMARIA';
      necessidadeCirurgica = 'NAO_INDICADA_TRATAR_COM_ATB_IV';
      alertaCritico = 'Internação hospitalar e antibioticoterapia parenteral (IV). Reavaliação rigorosa da evolução da dor e curva térmica.';
    }

    return {
      estagio: estagio,
      nomeEstagio: nomeEstagio,
      descricao: descricao,
      localCuidado: localCuidado,
      necessidadeCirurgica: necessidadeCirurgica,
      tamanhoAtoCm: tamanhoAto,
      alertaCritico: alertaCritico
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. AVALIAÇÃO DE CRITÉRIOS FORMAIS DE INTERNAÇÃO HOSPITALAR
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avalia os critérios formais para indicação mandatória de hospitalização.
   *
   * @param {Object} params
   * @param {boolean} [params.gestante] - Paciente gestante
   * @param {boolean} [params.refrataria72h] - Falha terapêutica ou piora clínica após 48-72h de tratamento ambulatorial oral
   * @param {boolean} [params.intoleranciaOral] - Náuseas, vômitos incoercíveis ou impossibilidade de ingerir medicação oral
   * @param {boolean} [params.presencaAto] - Abscesso tubo-ovariano diagnosticado ou suspeito
   * @param {boolean} [params.peritoniteOuSepse] - Peritonite, toxemia, febre persistente alta (>38.5°C) ou instabilidade hemodinâmica
   * @param {boolean} [params.impossibilidadeExcluirEmergencia] - Incerteza diagnóstica onde emergência cirúrgica (apendicite, torção anexial, prenhez ectópica) não pode ser excluída
   * @param {boolean} [params.riscoNaoAdesao] - Vulnerabilidade psicossocial, falta de suporte ou impossibilidade de retorno ambulatorial em 72h
   * @param {boolean} [params.imunodeprimida] - Paciente vivendo com HIV com imunodeficiência severa (CD4 < 200) ou em imunossupressão ativa
   * @param {boolean} [params.adolescente] - Adolescente com adesão duvidosa (critério relativo/prudencial)
   * @returns {Object} Decisão e motivos formais de hospitalização
   */
  function avaliarCriteriosInternacao(params) {
    params = params || {};

    var motivos = [];

    if (params.gestante) {
      motivos.push({
        criterio: 'Gestação',
        gravidade: 'ABSOLUTA',
        detalhe: 'Risco materno-fetal elevado (perda gestacional, sepse grave), necessidade de excluir prenhez ectópica e impossibilidade de usar o esquema ambulatorial padrão com doxiciclina.'
      });
    }

    if (params.refrataria72h) {
      motivos.push({
        criterio: 'Ausência de Resposta Clínica após 48-72h de Tratamento Oral',
        gravidade: 'ABSOLUTA',
        detalhe: 'Persistência de febre, piora da dor ou aumento de marcadores inflamatórios ambulatoriais exige internação, investigação de ATO por imagem e início de esquema parenteral (IV).'
      });
    }

    if (params.intoleranciaOral) {
      motivos.push({
        criterio: 'Intolerância Gastrointestinal / Vômitos Incoercíveis',
        gravidade: 'ABSOLUTA',
        detalhe: 'Impossibilidade de absorção gastrointestinal da terapia antimicrobiana oral prescrita.'
      });
    }

    if (params.presencaAto) {
      motivos.push({
        criterio: 'Presença de Abscesso Tubo-Ovariano (ATO)',
        gravidade: 'ABSOLUTA',
        detalhe: 'Necessidade de antibioticoterapia intravenosa de alta penetração tecidual e monitorização estrita contra ruptura e necessidade de drenagem cirúrgica.'
      });
    }

    if (params.peritoniteOuSepse) {
      motivos.push({
        criterio: 'Quadro Clínico Grave / Peritonite / Suspeita de Sepse',
        gravidade: 'ABSOLUTA',
        detalhe: 'Sinais de irritação peritoneal, toxemia, febre persistente alta ou disfunção orgânica requerem ressuscitação hospitalar imediata.'
      });
    }

    if (params.impossibilidadeExcluirEmergencia) {
      motivos.push({
        criterio: 'Impossibilidade de Excluir Emergência Cirúrgica Aguda',
        gravidade: 'ABSOLUTA',
        detalhe: 'Diagnóstico diferencial indistinguível de apendicite aguda, gravidez ectópica rota ou torção anexial.'
      });
    }

    if (params.imunodeprimida) {
      motivos.push({
        criterio: 'Imunodepressão Grave (HIV avançado / Imunossupressores)',
        gravidade: 'RELATIVA_FORTE',
        detalhe: 'Risco substancial de progressão atípica fulminante e sepse oportunista.'
      });
    }

    if (params.riscoNaoAdesao) {
      motivos.push({
        criterio: 'Vulnerabilidade Social ou Inviabilidade de Seguimento Ambulatorial em 72h',
        gravidade: 'RELATIVA_FORTE',
        detalhe: 'Impossibilidade de garantir adesão medicamentosa ou retorno para reavaliação obrigatória no 2º-3º dia de tratamento.'
      });
    }

    if (params.adolescente && !params.gestante && !params.presencaAto) {
      motivos.push({
        criterio: 'Adolescente com Suporte Familiar Incerto',
        gravidade: 'PRUDENCIAL',
        detalhe: 'Consideração de internação breve para início supervisionado da terapia ou garantia de acompanhamento rigoroso.'
      });
    }

    var indicacaoInternacao = motivos.some(function(m) {
      return m.gravidade === 'ABSOLUTA' || m.gravidade === 'RELATIVA_FORTE';
    });

    return {
      indicacaoInternacao: indicacaoInternacao,
      quantidadeCriterios: motivos.length,
      criteriosPresentes: motivos,
      recomendacaoLocal: indicacaoInternacao ? 'INTERNACAO_HOSPITALAR_IMEDIATA' : 'TRATAMENTO_AMBULATORIAL_COM_REAVALIACAO_72H'
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. AUDITORIA E MANEJO DE DISPOSITIVO INTRAUTERINO (DIU)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Avalia a conduta com relação à presença de Dispositivo Intrauterino (DIU).
   *
   * @param {Object} params
   * @param {boolean} params.diuPresente - Presença de DIU (Cobre ou Levonorgestrel)
   * @param {string} [params.estagioMonif] - Estágio de Monif (I, II, III ou IV)
   * @param {boolean} [params.refrataria72h] - Ausência de melhora após 48-72h de ATB
   * @param {boolean} [params.suspeitaActinomyces] - Suspeita ou isolamento de Actinomyces israelensis
   * @returns {Object} Conduta recomendada e alertas de segurança
   */
  function avaliarCondutaDiu(params) {
    params = params || {};
    if (!params.diuPresente) {
      return {
        diuPresente: false,
        recomendacao: 'NÃO_APLICÁVEL',
        detalhe: 'Paciente não utiliza Dispositivo Intrauterino.'
      };
    }

    var estagioGrave = (params.estagioMonif === 'ESTAGIO_III' || params.estagioMonif === 'ESTAGIO_IV');
    var falhaTerapeutica = Boolean(params.refrataria72h);
    var actinomyces = Boolean(params.suspeitaActinomyces);

    var removerImediatamente = false;
    var removerAposFalha = false;
    var conduta = '';
    var detalhes = [];

    if (estagioGrave || actinomyces) {
      removerImediatamente = true;
      conduta = 'REMOVER_DIU_SOB_COBERTURA_ANTIBIOTICA';
      detalhes.push('Em DIP grave com formação de abscesso tubo-ovariano (Monif III/IV) ou infecção por Actinomyces, recomenda-se a remoção do DIU.');
      detalhes.push('IMPORTANTE: A remoção NUNCA deve ser feita a seco sem antibiótico; deve ser realizada APÓS pelo menos a primeira dose de antibiótico intravenoso devidamente administrada para evitar bacteremia transitória.');
    } else if (falhaTerapeutica) {
      removerAposFalha = true;
      conduta = 'REMOVER_DIU_DEVIDO_A_FALHA_CLINICA_EM_72H';
      detalhes.push('Paciente com ausência de melhora após 48 a 72 horas de antibioticoterapia adequada. A remoção do DIU está indicada neste momento.');
    } else {
      conduta = 'MANTER_DIU_INICIALMENTE_E_REAVALIAR_EM_72H';
      detalhes.push('REGRA DO PCDT MS E CDC: NÃO é obrigatória a retirada imediata do DIU ao diagnóstico inicial de DIP leve/moderada (Monif I).');
      detalhes.push('Estudos clínicos randomizados demonstraram que a retenção do DIU não retarda a cura clínica quando a antibioticoterapia adequada é prontamente instituída.');
      detalhes.push('Iniciar os antibióticos imediatamente. Se houver falha de melhora clínica em 48-72 horas, o DIU deve ser removido.');
    }

    return {
      diuPresente: true,
      condutaRecomendada: conduta,
      removerImediatamente: removerImediatamente,
      removerAposFalha: removerAposFalha,
      orientacoesClinicas: detalhes
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. PROTOCOLO DE PARCEIROS SEXUAIS E RASTREIO DE ISTS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Gera o protocolo obrigatório para convocação, testagem e tratamento de parceiros sexuais.
   *
   * @param {Object} [params]
   * @param {number} [params.diasUltimoContato] - Dias decorridos desde o último contato sexual
   * @returns {Object} Protocolo e prescrição para parceiros
   */
  function gerarProtocoloParceiros(params) {
    params = params || {};
    var dias = typeof params.diasUltimoContato === 'number' ? params.diasUltimoContato : 30;

    var janelaAplicada = 'Últimos 60 dias';
    var avisoJanela = 'Tratar todos os parceiros sexuais com quem a paciente manteve relações sexuais nos últimos 60 dias que antecederam o início dos sintomas.';
    if (dias > 60) {
      avisoJanela = 'Como a última relação sexual ocorreu há mais de 60 dias (' + dias + ' dias), o último parceiro sexual DEVE ser tratado empiricamente.';
    }

    return {
      obrigatorio: true,
      janelaTemporal: janelaAplicada,
      orientacaoJanela: avisoJanela,
      esquemaTratamentoParceiro: CATALOGO_FARMACOLOGICO.PARCEIROS_SEXUAIS,
      rastreioSorologicoMandatorio: [
        'Teste rápido ou sorologia para HIV',
        'VDRL ou teste rápido para Sífilis',
        'HBsAg (Hepatite B) e vacinação se suscetível',
        'Anti-HCV (Hepatite C)'
      ],
      abstinenciaSexualRecomendada: 'Abstinência sexual estrita até que ambos os parceiros tenham completado seus esquemas antimicrobianos e estejam sem sintomas.'
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 7. DETERMINAÇÃO DA CONDUTA TERAPÊUTICA INTEGRADA
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Determina a prescrição completa, plano assistencial e conduta terapêutica.
   *
   * @param {Object} params
   * @param {Object} params.criterios - Objeto retornado por avaliarCriteriosDiagnosticos
   * @param {Object} params.estagio - Objeto retornado por estadiarMonif
   * @param {Object} params.internacao - Objeto retornado por avaliarCriteriosInternacao
   * @param {number} [params.pesoKg] - Peso corporal da paciente em kg
   * @param {boolean} [params.gestante] - Se a paciente está gestante
   * @param {boolean} [params.alergiaCefalosporinas] - Se possui alergia a cefalosporinas/penicilinas
   * @param {boolean} [params.anafilaxiaBetaLactamicos] - Se a reação alérgica foi severa/anafilática
   * @param {number} [params.clcr] - Clearance de creatinina estimado (mL/min)
   * @returns {Object} Plano terapêutico detalhado
   */
  function determinarCondutaTerapeutica(params) {
    params = params || {};
    var criterios = params.criterios || {};
    var estagio = params.estagio || {};
    var internacao = params.internacao || {};

    var gestante = Boolean(params.gestante);
    var peso = typeof params.pesoKg === 'number' ? params.pesoKg : 60;
    var alergiaCefalo = Boolean(params.alergiaCefalosporinas);
    var anafilaxia = Boolean(params.anafilaxiaBetaLactamicos);
    var clcr = typeof params.clcr === 'number' ? params.clcr : 90;

    var localTratamento = internacao.indicacaoInternacao ? 'HOSPITALAR' : 'AMBULATORIAL';
    var planoFarmacologico = null;
    var prescricoes = [];
    var alertasSeguranca = [];

    // Cenário 1: Gestante (Internação obrigatória e exclusão de doxiciclina)
    if (gestante) {
      localTratamento = 'HOSPITALAR';
      planoFarmacologico = CATALOGO_FARMACOLOGICO.GESTACAO_REGIME_ESPECIAL;
      prescricoes.push('1. Ceftriaxona 1 g IV a cada 24 horas');
      prescricoes.push('2. Azitromicina 1 g VO no D1, seguido de 500 mg VO 1x/dia por 7 dias');
      prescricoes.push('3. Metronidazol 500 mg IV a cada 12 horas por 14 dias');
      alertasSeguranca.push('PACIENTE GESTANTE: Bloqueio estrito de Doxiciclina (tetraciclinas) e Fluoroquinolonas.');
      alertasSeguranca.push('Internação imediata, monitorização fetal se viável e ecografia obstétrica para excluir gravidez ectópica coexistente.');
    }
    // Cenário 2: Hospitalar (Regime Parenteral)
    else if (localTratamento === 'HOSPITALAR') {
      var presencaAto = (estagio.estagio === 'ESTAGIO_III' || estagio.estagio === 'ESTAGIO_IV');

      if (presencaAto && !alergiaCefalo) {
        // Regime B (Clindamicina + Gentamicina) preferencial em ATO
        planoFarmacologico = CATALOGO_FARMACOLOGICO.HOSPITALAR_PRIMEIRA_LINHA_B;
        var doseAtaqueGenta = Math.round(peso * 2);
        var doseManutencaoGenta = Math.round(peso * 1.5);

        prescricoes.push('1. Clindamicina 900 mg IV a cada 8 horas');
        prescricoes.push('2. Gentamicina: Dose de ataque de ' + doseAtaqueGenta + ' mg IV em infusão de 60 min, seguida de ' + doseManutencaoGenta + ' mg IV a cada 8 horas (ou dose única de 3-5 mg/kg/dia IV)');
        prescricoes.push('3. Hidratação venosa e analgesia multimodal');

        if (clcr < 50) {
          alertasSeguranca.push('ALERTA DE NEFROTOXICIDADE: Paciente com ClCr < 50 mL/min (' + clcr + ' mL/min). A gentamicina requer ajuste obrigatório de intervalo conforme nível sérico de creatinina.');
        }
        alertasSeguranca.push('Regime parenteral de escolha para Abscesso Tubo-Ovariano devido à excelente penetração tecidual e cobertura anti-anaeróbia da Clindamicina.');
      } else if (!alergiaCefalo) {
        // Regime A (Ceftriaxona + Doxiciclina + Metronidazol)
        planoFarmacologico = CATALOGO_FARMACOLOGICO.HOSPITALAR_PRIMEIRA_LINHA_A;
        prescricoes.push('1. Ceftriaxona 1 g IV a cada 24 horas');
        prescricoes.push('2. Doxiciclina 100 mg VO a cada 12 horas (preferir VO pela biodisponibilidade excelente e menor risco de flebite que IV)');
        prescricoes.push('3. Metronidazol 500 mg IV ou VO a cada 12 horas');
        alertasSeguranca.push('Após melhora clínica documentada e 24 a 48 horas afebril: transição para via oral (Doxiciclina 100mg VO 12/12h + Metronidazol 500mg VO 12/12h até completar 14 dias totais).');
      } else if (anafilaxia) {
        // Alergia severa a beta-lactâmicos em hospital: Clindamicina + Gentamicina ou Quinolona
        planoFarmacologico = CATALOGO_FARMACOLOGICO.HOSPITALAR_PRIMEIRA_LINHA_B;
        prescricoes.push('1. Clindamicina 900 mg IV a cada 8 horas');
        prescricoes.push('2. Gentamicina 2 mg/kg ataque IV + 1,5 mg/kg 8/8h IV (ajustado ao peso: ' + Math.round(peso * 2) + ' mg ataque)');
        alertasSeguranca.push('Paciente com anafilaxia a beta-lactâmicos. Regime de Clindamicina + Gentamicina oferece segurança contra reações alérgicas cruzadas.');
      }
    }
    // Cenário 3: Ambulatorial (Regime Oral / IM)
    else {
      if (!alergiaCefalo) {
        planoFarmacologico = CATALOGO_FARMACOLOGICO.AMBULATORIAL_PRIMEIRA_LINHA;
        var doseCeftriaxona = (peso >= 150) ? '1 g IM dose única' : '500 mg IM dose única';
        
        prescricoes.push('1. Ceftriaxona ' + doseCeftriaxona + ' (aplicar hoje no serviço de saúde)');
        prescricoes.push('2. Doxiciclina 100 mg VO de 12 em 12 horas por 14 dias consecutivos');
        prescricoes.push('3. Metronidazol 500 mg VO de 12 em 12 horas por 14 dias consecutivos');

        if (peso >= 150) {
          alertasSeguranca.push('AJUSTE POR PESO CORPORAL: Paciente com peso >= 150 kg (' + peso + ' kg). A dose de Ceftriaxona foi ajustada para 1 g IM dose única conforme diretrizes de concentração tecidual do CDC.');
        }

        alertasSeguranca.push('ORIENTAÇÃO DOXICICLINA: Tomar com 1 copo cheio de água (200 mL) e NÃO DEITAR por 30-60 minutos após a tomada para prevenir esofagite medicamentosa severa.');
        alertasSeguranca.push('ORIENTAÇÃO METRONIDAZOL: Abstinência total de bebidas alcoólicas durante os 14 dias e até 48 horas após a última dose (risco de efeito dissulfiram grave).');
      } else if (anafilaxia) {
        planoFarmacologico = CATALOGO_FARMACOLOGICO.AMBULATORIAL_ALTERNATIVAS.quinolonaComMetronidazol;
        prescricoes.push('1. Levofloxacino 500 mg VO 1x/dia por 14 dias (OU Ofloxacino 400 mg VO 12/12h)');
        prescricoes.push('2. Metronidazol 500 mg VO de 12 em 12 horas por 14 dias');
        alertasSeguranca.push('ALERTA DE RESISTÊNCIA BACTERIANA: Alta taxa de resistência do gonococo a fluoroquinolonas no Brasil. Solicitar cultura e antibiograma se possível e acompanhar rigorosamente em 48-72h.');
      } else {
        planoFarmacologico = CATALOGO_FARMACOLOGICO.AMBULATORIAL_ALTERNATIVAS.cefoxitinaProbenecida;
        prescricoes.push('1. Cefoxitina 2 g IM dose única associada a Probenecida 1 g VO dose única');
        prescricoes.push('2. Doxiciclina 100 mg VO 12/12h por 14 dias');
        prescricoes.push('3. Metronidazol 500 mg VO 12/12h por 14 dias');
      }
    }

    // Plano de Seguimento Ambulatorial Mandatório
    var planoSeguimento = {
      reavaliacaoObrigatoriaHoras: 72,
      orientacoesRetorno: [
        'Retorno presencial OBRIGATÓRIO em 48 a 72 horas para reavaliação médica.',
        'Sinais de Alerta para Procura Imediata do Pronto-Socorro: Febre persistente ou em ascensão (> 38°C), piora progressiva da dor pélvica/abdominal, vômitos incoercíveis, tontura ou desmaios.',
        'Se após 72h houver ausência de melhora substancial: INTERNAÇÃO HOSPITALAR IMEDIATA para ultrassonografia transvaginal e início de antibioticoterapia intravenosa.'
      ]
    };

    return {
      localTratamento: localTratamento,
      planoFarmacologico: planoFarmacologico,
      prescricoes: prescricoes,
      alertasSeguranca: alertasSeguranca,
      planoSeguimento: planoSeguimento
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 8. MOTOR PRINCIPAL UNIFICADO: AVALIAR DIP COMPLETO
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Executa a avaliação completa, estadiamento, critérios de internação,
   * manejo de DIU, parceiros e prescrição determinística para DIP e ATO.
   *
   * @param {Object} dados - Dados clínicos completos da paciente
   * @returns {Object} Parecer clínico determinístico consolidado
   */
  function avaliarDipCompleto(dados) {
    dados = dados || {};

    // 1. Critérios Diagnósticos
    var criterios = avaliarCriteriosDiagnosticos({
      dorHipogastrio: dados.dorHipogastrio,
      dorAnexial: dados.dorAnexial,
      dorMobilizacaoColo: dados.dorMobilizacaoColo,
      febre: dados.febre,
      temperaturaCelsius: dados.temperaturaCelsius,
      corrimentoEndocervicalAnormal: dados.corrimentoEndocervicalAnormal,
      leucocitose: dados.leucocitose,
      leucocitosValor: dados.leucocitosValor,
      vhsPcrElevados: dados.vhsPcrElevados,
      pcrValor: dados.pcrValor,
      testeIstPositivo: dados.testeIstPositivo,
      leucocitosExameFresco: dados.leucocitosExameFresco,
      biopsiaEndometrite: dados.biopsiaEndometrite,
      imagemCompativel: dados.imagemCompativel,
      laparoscopiaCompativel: dados.laparoscopiaCompativel,
      sintomaFitzHughCurtis: dados.sintomaFitzHughCurtis
    });

    // 2. Estadiamento de Monif
    var presencaAto = Boolean(dados.presencaAto || (dados.imagemCompativel && dados.temColecaoAto));
    var tamanhoAto = typeof dados.tamanhoAtoCm === 'number' ? dados.tamanhoAtoCm : null;

    var estagio = estadiarMonif({
      peritonitePelvica: dados.peritonitePelvica,
      peritoniteDifusa: dados.peritoniteDifusa,
      presencaAto: presencaAto,
      atoRoto: dados.atoRoto,
      choqueSeptico: dados.choqueSeptico,
      tamanhoAtoCm: tamanhoAto
    });

    // 3. Critérios Formais de Internação
    var internacao = avaliarCriteriosInternacao({
      gestante: dados.gestante,
      refrataria72h: dados.refrataria72h,
      intoleranciaOral: dados.intoleranciaOral,
      presencaAto: presencaAto,
      peritoniteOuSepse: Boolean(dados.peritonitePelvica || dados.peritoniteDifusa || dados.choqueSeptico || (dados.temperaturaCelsius && dados.temperaturaCelsius >= 38.5)),
      impossibilidadeExcluirEmergencia: dados.impossibilidadeExcluirEmergencia,
      riscoNaoAdesao: dados.riscoNaoAdesao,
      imunodeprimida: dados.imunodeprimida,
      adolescente: dados.adolescente
    });

    // 4. Manejo de DIU
    var diu = avaliarCondutaDiu({
      diuPresente: dados.diuPresente,
      estagioMonif: estagio.estagio,
      refrataria72h: dados.refrataria72h,
      suspeitaActinomyces: dados.suspeitaActinomyces
    });

    // 5. Manejo de Parceiros
    var parceiros = gerarProtocoloParceiros({
      diasUltimoContato: dados.diasUltimoContato
    });

    // 6. Conduta Terapêutica Integrada
    var conduta = determinarCondutaTerapeutica({
      criterios: criterios,
      estagio: estagio,
      internacao: internacao,
      pesoKg: dados.pesoKg,
      gestante: dados.gestante,
      alergiaCefalosporinas: dados.alergiaCefalosporinas,
      anafilaxiaBetaLactamicos: dados.anafilaxiaBetaLactamicos,
      clcr: dados.clcr
    });

    return {
      sucesso: true,
      timestamp: new Date().toISOString(),
      criteriosDiagnosticos: criterios,
      estadiamentoMonif: estagio,
      criteriosInternacao: internacao,
      manejoDiu: diu,
      protocoloParceiros: parceiros,
      condutaTerapeutica: conduta
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 9. GERADOR DE RESUMO CLÍNICO ESTRUTURADO PARA COCKPIT / TELEGRAM
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Constrói relatório textual humanizado para exibição no Cockpit ou prontuário.
   *
   * @param {Object} avaliacao - Resultado de avaliarDipCompleto
   * @returns {string} Relatório formatado em texto
   */
  function gerarResumoDip(avaliacao) {
    if (!avaliacao || !avaliacao.criteriosDiagnosticos) {
      return 'Erro: Dados insuficientes para gerar resumo de DIP.';
    }

    var r = avaliacao;
    var l = [];

    l.push('════════════════════════════════════════════════════════════════');
    l.push('   PARECER CLÍNICO: DOENÇA INFLAMATÓRIA PÉLVICA (DIP) / ATO');
    l.push('   Diretrizes: PCDT Ministério da Saúde / CDC STI Guidelines');
    l.push('════════════════════════════════════════════════════════════════');
    l.push('');

    // Diagnóstico
    l.push('► STATUS DIAGNÓSTICO: ' + r.criteriosDiagnosticos.statusDiagnostico);
    l.push('  Confiança: ' + r.criteriosDiagnosticos.confiancaDiagnostica);
    l.push('  Parecer: ' + r.criteriosDiagnosticos.justificativa);
    l.push('');

    // Critérios
    l.push('► CRITÉRIOS AVALIADOS:');
    l.push('  • Maiores (Clínicos): ' + r.criteriosDiagnosticos.criteriosMaiores.totalPresentes + '/3 presentes');
    l.push('    - Dor hipogástrio: ' + (r.criteriosDiagnosticos.criteriosMaiores.dorHipogastrio ? 'SIM' : 'NÃO'));
    l.push('    - Dor à palpação anexial: ' + (r.criteriosDiagnosticos.criteriosMaiores.dorAnexial ? 'SIM' : 'NÃO'));
    l.push('    - Dor mobilização do colo (Frenkel): ' + (r.criteriosDiagnosticos.criteriosMaiores.dorMobilizacaoColo ? 'SIM' : 'NÃO'));
    l.push('  • Menores (Laboratoriais/Sistêmicos): ' + r.criteriosDiagnosticos.criteriosMenores.totalPresentes + ' presentes');
    for (var m = 0; m < r.criteriosDiagnosticos.criteriosMenores.lista.length; m++) {
      l.push('    - ' + r.criteriosDiagnosticos.criteriosMenores.lista[m]);
    }
    if (r.criteriosDiagnosticos.criteriosElaborados.totalPresentes > 0) {
      l.push('  • Elaborados (Definitivos): ' + r.criteriosDiagnosticos.criteriosElaborados.totalPresentes + ' presentes');
      for (var e = 0; e < r.criteriosDiagnosticos.criteriosElaborados.lista.length; e++) {
        l.push('    - ' + r.criteriosDiagnosticos.criteriosElaborados.lista[e]);
      }
    }
    if (r.criteriosDiagnosticos.alertaFitzHughCurtis) {
      l.push('');
      l.push('  ' + r.criteriosDiagnosticos.alertaFitzHughCurtis);
    }
    l.push('');

    // Estadiamento
    l.push('► ESTADIAMENTO (CLASSIFICAÇÃO DE MONIF):');
    l.push('  Estádio: ' + r.estadiamentoMonif.nomeEstagio);
    l.push('  Descrição: ' + r.estadiamentoMonif.descricao);
    l.push('  Local Recomendado: ' + r.estadiamentoMonif.localCuidado);
    if (r.estadiamentoMonif.alertaCritico) {
      l.push('  ' + r.estadiamentoMonif.alertaCritico);
    }
    l.push('');

    // Internação
    l.push('► DECISÃO DE INTERNAÇÃO HOSPITALAR:');
    l.push('  Recomendação: ' + r.criteriosInternacao.recomendacaoLocal);
    if (r.criteriosInternacao.criteriosPresentes.length > 0) {
      l.push('  Critérios Identificados (' + r.criteriosInternacao.quantidadeCriterios + '):');
      for (var ci = 0; ci < r.criteriosInternacao.criteriosPresentes.length; ci++) {
        var itemCrit = r.criteriosInternacao.criteriosPresentes[ci];
        l.push('    - [' + itemCrit.gravidade + '] ' + itemCrit.criterio + ': ' + itemCrit.detalhe);
      }
    } else {
      l.push('  Nenhum critério absoluto de internação detectado. Elegível para manejo ambulatorial seguro.');
    }
    l.push('');

    // DIU
    if (r.manejoDiu && r.manejoDiu.diuPresente) {
      l.push('► MANEJO DO DISPOSITIVO INTRAUTERINO (DIU):');
      l.push('  Conduta: ' + r.manejoDiu.condutaRecomendada);
      for (var od = 0; od < r.manejoDiu.orientacoesClinicas.length; od++) {
        l.push('  • ' + r.manejoDiu.orientacoesClinicas[od]);
      }
      l.push('');
    }

    // Conduta Terapêutica
    l.push('► PLANO TERAPÊUTICO FARMACOLÓGICO (' + r.condutaTerapeutica.localTratamento + '):');
    l.push('  Esquema: ' + (r.condutaTerapeutica.planoFarmacologico.nome || 'Esquema Padronizado PCDT/CDC'));
    l.push('  Prescrição Dirigida:');
    for (var p = 0; p < r.condutaTerapeutica.prescricoes.length; p++) {
      l.push('    ' + r.condutaTerapeutica.prescricoes[p]);
    }
    if (r.condutaTerapeutica.alertasSeguranca.length > 0) {
      l.push('');
      l.push('  Alertas Críticos de Segurança Farmacológica:');
      for (var as = 0; as < r.condutaTerapeutica.alertasSeguranca.length; as++) {
        l.push('    ⚠️ ' + r.condutaTerapeutica.alertasSeguranca[as]);
      }
    }
    l.push('');

    // Seguimento e Parceiros
    l.push('► REAVALIAÇÃO E PARCEIROS SEXUAIS:');
    l.push('  • Retorno Obrigatório: em 48 a 72 horas para checagem clínica.');
    l.push('  • Parceiros Sexuais: Tratar todos dos últimos 60 dias com Ceftriaxona 500mg IM + Azitromicina 1g VO dose única.');
    l.push('  • Abstinência sexual até término mútuo da antibioticoterapia e resolução de sintomas.');
    l.push('  • Rastreio obrigatório: HIV, VDRL, HBsAg e Anti-HCV.');
    l.push('');
    l.push('════════════════════════════════════════════════════════════════');

    return l.join('\n');
  }

  // Exportação Pública
  return {
    CATALOGO_FARMACOLOGICO: CATALOGO_FARMACOLOGICO,
    avaliarCriteriosDiagnosticos: avaliarCriteriosDiagnosticos,
    estadiarMonif: estadiarMonif,
    avaliarCriteriosInternacao: avaliarCriteriosInternacao,
    avaliarCondutaDiu: avaliarCondutaDiu,
    gerarProtocoloParceiros: gerarProtocoloParceiros,
    determinarCondutaTerapeutica: determinarCondutaTerapeutica,
    avaliarDipCompleto: avaliarDipCompleto,
    gerarResumoDip: gerarResumoDip
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DipAbscessoTuboOvarianoService: DipAbscessoTuboOvarianoService };
}
