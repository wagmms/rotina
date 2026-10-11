/**
 * ==============================================================================
 * MÓDULO 02-B: MÓDULO SOAP AMBULATORIAL ÁGIL (ATENÇÃO PRIMÁRIA E CLÍNICA)
 * ==============================================================================
 * Motor determinístico de alta performance para estruturação de consultas
 * ambulatoriais de consultório e UBS/APS, estratificação de risco cardiovascular
 * (SBC/SBD), autocompleção de CID-10 e exportação limpa de Receita e Atestado CFM.
 * ==============================================================================
 */

var SoapAmbulatorialService = (function() {
  'use strict';

  // 1. VALORES DE REFERÊNCIA DE SINAIS VITAIS AMBULATORIAIS
  var VALORES_REFERENCIA = {
    pa: {
      otima: '< 120/80 mmHg',
      normal: '120-129 / 80-84 mmHg',
      pre_has: '130-139 / 85-89 mmHg',
      has_estagio_1: '140-159 / 90-99 mmHg',
      has_estagio_2: '160-179 / 100-109 mmHg',
      has_estagio_3: '>= 180 / >= 110 mmHg',
      alerta_urgencia: 'PAS >= 180 ou PAD >= 120 mmHg (investigar LOA / emergência hipertensiva)'
    },
    fc: {
      normal: '60 a 100 bpm (normocárdico)',
      bradicardia: '< 60 bpm',
      taquicardia: '> 100 bpm'
    },
    fr: {
      normal: '12 a 20 irpm (eupneico)',
      taquipneia: '> 20 irpm',
      bradpneia: '< 12 irpm'
    },
    spo2: {
      normal: '>= 95% em ar ambiente',
      alerta: '93 a 94%',
      critico: '< 92% (investigar hipoxemia aguda / descompensação)'
    },
    tax: {
      afebril: '36.0 a 37.2 °C',
      subfebril: '37.3 a 37.7 °C',
      febre: '>= 37.8 °C'
    },
    glicemia_capilar: {
      jejum_normal: '< 100 mg/dL',
      jejum_alterado: '100 a 125 mg/dL (pré-diabetes)',
      jejum_dm: '>= 126 mg/dL (critério para investigação)',
      casual_normal: '< 140 mg/dL',
      casual_dm_sintomas: '>= 200 mg/dL'
    },
    imc: {
      baixo_peso: '< 18.5 kg/m²',
      eutrofia: '18.5 a 24.9 kg/m²',
      sobrepeso: '25.0 a 29.9 kg/m²',
      obesidade_1: '30.0 a 34.9 kg/m²',
      obesidade_2: '35.0 a 39.9 kg/m²',
      obesidade_3: '>= 40.0 kg/m²'
    }
  };

  // 2. MODELOS DIRIGIDOS DE EXAME FÍSICO COM ATALHOS RÁPIDOS
  var MODELOS_EXAME_FISICO = {
    checkup_geral: {
      titulo: 'Geral / Check-up Ambulatorial',
      texto: [
        'Ectoscopia: Bom estado geral (BEG), lúcido e orientado no tempo e espaço (LOTE), corado, hidratado, anictérico, acianótico, afebril.',
        'ACV: Ritmo cardíaco regular em 2 tempos, bulhas normofonéticas, sem sopros audíveis.',
        'AR: Expansibilidade torácica simétrica, murmúrio vesicular universalmente audível sem ruídos adventícios.',
        'Abdome: Plano, flácido, depressível, indolor à palpação superficial e profunda, sem visceromegalias, ruídos hidroaéreos normoativos.',
        'Extremidades: Sem edema de membros inferiores, pulsos pediosos e tibiais posteriores cheios e simétricos, boa perfusão periférica (< 2s).'
      ].join('\n')
    },
    padrao_completo: {
      titulo: 'Adulto Geral Completo (Segmentar Padrão Ouro)',
      texto: [
        'Sinais Vitais: PA: [   ] mmHg | FC: [   ] bpm | FR: [   ] irpm | SpO2: [   ]% em ar ambiente | T: [   ]°C.',
        'Geral: Bom estado geral, lúcido e orientado no tempo e espaço, corado, hidratado, anictérico, acianótico, afebril ao toque, eupneico em ar ambiente.',
        'ACV: Ritmo cardíaco regular em 2 tempos, bulhas normofonéticas, sem sopros. Pulsos radiais amplos, cheios e simétricos bilateralmente.',
        'AR: Murmúrio vesicular globalmente presente, sem ruídos adventícios. Expansibilidade torácica preservada bilateralmente.',
        'Abdome: Plano, flácido, indolor à palpação superficial e profunda. RHA normoativos. Sem massas ou visceromegalias.',
        'Extremidades: Sem edema de membros inferiores. Panturrilhas livres sem empastamento. TEC < 3 segundos.'
      ].join('\n')
    },
    pediatrico_completo: {
      titulo: 'Pediátrico Completo (Lactente / Criança)',
      texto: [
        '[Exame Físico Pediátrico Normal]:',
        '• Ectoscopia: Bom estado geral, ativo e reativo, corado, hidratado, anictérico, acianótico, afebril. Choro forte e consolável.',
        '• Crânio e Face: Fontanela anterior plana e normotensa, perímetro cefálico adequado para a idade.',
        '• Oroscopia / Otoscopia: Oroscopia sem hiperemia ou placas; otoscopia bilateral com membranas timpânicas íntegras e translúcidas.',
        '• Aparelho Respiratório: Eupneico em ar ambiente, sem tiragem subcostal, batimento de asa de nariz ou gemência. MV presente bilateralmente sem ruídos adventícios.',
        '• Aparelho Cardiovascular: RCR 2T, bulhas normofonéticas sem sopros. Pulsos femorais e radiais palpáveis, cheios e simétricos. TEC < 2s.',
        '• Abdome: Semigloboso, flácido, indolor, RHA normoativos, sem visceromegalias patológicas ou hérnias redutíveis dolorosas.',
        '• Membros e Quadris: Tônus adequado. Manobras de Ortolani e Barlow negativas bilateralmente. Boa movimentação ativa.'
      ].join('\n')
    },
    geriatrico_aga: {
      titulo: 'Geriátrico / Avaliação Geriátrica Ampla (AGA)',
      texto: [
        '[Avaliação Geriátrica Ampla / Exame Físico do Idoso]:',
        '• Ectoscopia: BEG, lúcido e orientado no tempo e espaço (LOTE), corado, hidratado, anictérico, acianótico, afebril.',
        '• Sinais Vitais: PA sentado: 124/78 mmHg | PA ortostase: 120/76 mmHg (hipotensão ortostática ausente). FC: 68 bpm.',
        '• Cognição e Humor: MEEM preservado para escolaridade; rastreio de sintomas depressivos (GDS-15) negativo.',
        '• Funcionalidade: Independente para ABVDs (Katz 6/6) e autônomo para AIVDs (Lawton 27/27).',
        '• Marcha e Equilíbrio: Teste Timed Up and Go (TUG) < 10 segundos (baixo risco de quedas). Romberg negativo.',
        '• Cardiopulmonar: ACV: RCR 2T BNF sem sopros. Sem turgência jugular. AR: MV limpo bilateralmente sem estertores.',
        '• Nutrição e Sarcopenia: Circunferência de panturrilha > 31 cm (trofismo muscular preservado), força de preensão preservada.',
        '• Pele e Extremidades: Pele íntegra sem lesões por pressão. Pulsos periféricos amplos. Sem edema de MMII.'
      ].join('\n')
    },
    obstetrico_prenatal: {
      titulo: 'Obstétrico / Consulta de Pré-Natal',
      texto: [
        '[Exame Físico Obstétrico / Pré-Natal]:',
        '• Ectoscopia: BEG, LOTE, corada, hidratada, anictérica, acianótica, afebril, eupnéica em ar ambiente. PA: 110/70 mmHg.',
        '• Mamas: Simétricas, mamilos protusos, sem nódulos ou áreas inflamatórias, colostro fisiológico à expressão.',
        '• Altura Uterina (AU): Compatível com a idade gestacional (entre p10 e p90 da curva de CLAP).',
        '• Manobras de Leopold: Situação longitudinal, dorso à esquerda, apresentação cefálica.',
        '• Ausculta Cardiofetal: Batimentos cardiofetais (BCF) presentes, rítmicos, 140 bpm, sem desacelerações.',
        '• Dinâmica Uterina (DU): Tônus uterino normal, ausência de contrações uterinas dolorosas.',
        '• Extremidades: Sem edema de membros inferiores ou edema maleolar leve fisiológico vespertino. Pulsos pediosos cheios.'
      ].join('\n')
    },
    vascular_periferico: {
      titulo: 'Vascular Periférico & Pulsos',
      texto: [
        '[Exame Vascular Periférico]:',
        '• Ectoscopia MMII: Pele com trofismo preservado bilateralmente, sem lesões tróficas ou úlceras. Sem cordões varicosos tensos.',
        '• Pulsos: Femorais, poplíteos, tibiais posteriores e pediosos presentes, amplos (2+/2+) e simétricos bilateralmente.',
        '• Perfusão: Extremidades aquecidas sem gradiente térmico. Tempo de enchimento capilar (TEC) < 2 segundos.',
        '• Sistema Venoso: Sem edema de membros inferiores (cacifo negativo). Panturrilhas livres e simétricas sem empastamento.',
        '• Manobras: Sinais de Homans e Bancroft negativos bilateralmente.'
      ].join('\n')
    },
    has_rotina: {
      titulo: 'Hipertensão Arterial Sistêmica (HAS)',
      texto: [
        'Ectoscopia: BEG, LOTE, corado, hidratado, acianótico, sem fácies de dor ou desconforto.',
        'ACV: Ritmo cardíaco regular em 2T, bulhas normofonéticas (B2 sem hiperfonese patológica), sem B3 ou B4, sem sopros em focos cardíacos. Ausculta de carótidas limpa bilateralmente, sem sopros.',
        'AR: Murmúrio vesicular presente bilateralmente, sem estertores crepitantes em bases pulmonares.',
        'Abdome: Flácido, indolor, sem massas ou pulsações anormais de aorta abdominal, ausculta sem sopros de artérias renais.',
        'Extremidades: Sem edema peri-maleolar (ausência de sinal do cacifo), pulsos periféricos amplos e simétricos.'
      ].join('\n')
    },
    dm_rotina: {
      titulo: 'Diabetes Mellitus & Exame dos Pés',
      texto: [
        'Ectoscopia: BEG, LOTE, corado, hidratado, sem hálito cetônico, acantose nigricans cervical ausente.',
        'ACV: RCR 2T BNF sem sopros.',
        'AR: Murmúrio vesicular presente sem ruídos adventícios.',
        'Exame dos Pés / Neuropatia Periférica:',
        '• Inspeção: Pele hidratada, sem fissuras interdigitais, sem calosidades hiperqueratóticas ou deformidades (sem dedos em garra ou artropatia de Charcot), unhas com corte adequado, sem úlceras.',
        '• Sensibilidade Protetora (Monofilamento 10g): Sensibilidade tátil preservada nos 4 pontos plantares testados bilateralmente (hálux, 1º, 3º e 5º metatarsos).',
        '• Sensibilidade Vibratória: Teste com diapasão 128 Hz presente e simétrico em hálux bilateral.',
        '• Vascular: Pulsos tibial posterior e pedioso palpáveis, cheios e simétricos bilateralmente. Temperatura cutânea simétrica.'
      ].join('\n')
    },
    respiratorio_ivas: {
      titulo: 'Vias Aéreas & Queixa Respiratória',
      texto: [
        'Ectoscopia: BEG, LOTE, corado, hidratado, acianótico, eupneico em ar ambiente sem esforço respiratório ou tiragem intercostal.',
        'Oroscopia: Mucosa jugal hidratada, úvula centrada, orofaringe e amígdalas sem hiperemia intensa, sem exsudato purulento ou placas bacterianas.',
        'Otoscopia: Condutos auditivos externos pérvios, membranas timpânicas íntegras, translúcidas e com cone de luz preservado bilateralmente.',
        'Rinoscopia: Mucosa nasal rósea, cornetos inferiores normotróficos, sem secreção purulenta evidente.',
        'AR: Expansibilidade torácica preservada e simétrica. Frêmito tóraco-vocal preservado. Murmúrio vesicular presente bilateralmente sem sibilos, roncos ou crepitações.'
      ].join('\n')
    },
    dispepsia_gastro: {
      titulo: 'Gastrointestinal & Dispepsia / DRGE',
      texto: [
        'Ectoscopia: BEG, LOTE, corado, hidratado, anictérico, sem estigmas de hepatopatia crônica.',
        'Abdome: Plano/globoso, flácido, depressível, indolor à palpação superficial. Palpação profunda: desconforto leve em epigástrio sem massas palpáveis ou plastrões.',
        'Sinais Específicos: Sinal de Murphy negativo (ausência de colecistite aguda). Descompressão brusca negativa em todo o abdome (Blumberg ausente). Sinal de Giordano negativo bilateralmente.',
        'Visceromegalias: Fígado e baço não palpáveis ao rebordo costal. Ruídos hidroaéreos presentes e normoativos nos 4 quadrantes.'
      ].join('\n')
    },
    lombalgia_postural: {
      titulo: 'Musculoesquelético & Coluna Lombar',
      texto: [
        'Ectoscopia: Marcha autônoma sem claudicação, capacidade de caminhar na ponta dos pés (S1) e calcanhares (L4/L5) preservada.',
        'Coluna Lombo-sacra: Alinhamento das curvaturas fisiológicas preservado, sem escoliose evidente. Palpação de processos espinhosos indolor. Leve contratura em musculatura paravertebral lombar bilateral sem pontos-gatilho graves.',
        'Mobilidade: Flexão, extensão e lateralização lombar preservadas, com desconforto mecânico terminal.',
        'Manobras Radiculares: Teste de Lasègue (elevação da perna estendida a 30-70°) NEGATIVO bilateralmente (ausência de dor irradiada abaixo do joelho). Teste de Bragard negativo.',
        'Neurológico Segmentar: Força motora grau 5/5 em membros inferiores (dorsiflexão de hálux e flexão plantar normais). Reflexos patelar e aquileu presentes e simétricos (2+/4+). Sensibilidade tátil preservada nos dermátomos L4, L5 e S1.'
      ].join('\n')
    },
    cefaleia_neuro: {
      titulo: 'Neurológico & Cefaleia Ambulatorial',
      texto: [
        'Ectoscopia: BEG, lúcido e orientado no tempo e espaço (Glasgow 15), fala fluente sem disartria ou afasia.',
        'Pares Cranianos: Pupilas isocóricas e fotorreagentes direta e consensualmente. Movimentos oculares extrínsecos preservados sem nistagmo ou diplopia. Mímica facial simétrica. Sensibilidade da face e reflexo corneano preservados.',
        'Motor e Reflexos: Força muscular grau 5/5 nos quatro membros. Tônus muscular normal. Reflexos osteotendíneos vivos e simétricos (2+/4+). Sinal de Babinski ausente (reflexo cutâneo-plantar em flexão bilateral).',
        'Sensibilidade e Coordenação: Sensibilidade tátil e dolorosa simétricas. Prova índex-nariz precisa, marcha normal em linha reta, sinal de Romberg negativo.',
        'Sinais Meníngeos (Sinais de Alarme): Rigidez de nuca ausente. Sinais de Kernig e Brudzinski negativos.',
        'Cervical e Vascular: Ausência de sopros sobre carótidas ou artérias temporais superficiais. Sem dor à palpação de artérias temporais.'
      ].join('\n')
    },
    saude_mental: {
      titulo: 'Saúde Mental & Exame Psíquico Básico',
      texto: [
        'Aparência e Atitude: Paciente asseado, cuidados pessoais preservados, postura colaborativa durante a entrevista.',
        'Consciência e Orientação: Lúcido e plenamente orientado autopsiquicamente e alopsiquicamente (tempo e espaço).',
        'Atenção e Memória: Atenção normotenaz e normovigil, memórias de fixação e evocação preservadas.',
        'Humor e Afeto: Humor eutímico ou com afeto congruente com a queixa relatada, ressonância afetiva presente, sem apatia ou embotamento.',
        'Pensamento: Fluxo e curso normais, estrutura lógica e coerente. Conteúdo sem ideias delirantes, sem ideação de desvalia extrema ou planos de autoextermínio.',
        'Sensopercepção: Sem alterações senso-perceptivas (sem alucinações visuais, auditivas ou táteis).',
        'Volição e Pragmatismo: Vontade preservada, capacidade volitiva adequada para atividades de vida diária.',
        'Juízo Crítico: Crítica de morbidade preservada, ciente do estado de saúde e da necessidade de seguimento.'
      ].join('\n')
    }
  };

  // 3. DICIONÁRIO DE PATOLOGIAS AMBULATORIAIS COM CID-10 E CIAP-2
  var CATALOGO_DIAGNOSTICOS = [
    {
      termo: 'hipertensao',
      sinonimos: ['has', 'pressao alta', 'hipertensao arterial', 'hipertensao essencial'],
      diagnostico: 'Hipertensão Arterial Sistêmica Primária',
      cid10: 'I10',
      ciap2: 'K86',
      categoria: 'Cardiovascular',
      estratificavel: true,
      alarmes: ['Cefaleia occipital súbita em trovoada', 'Dor torácica opressiva', 'Déficit motor focal', 'Escotomas cintilantes ou turvação visual súbita']
    },
    {
      termo: 'diabetes_tipo_2',
      sinonimos: ['dm2', 'dm 2', 'diabetes', 'diabetes tipo 2', 'diabetes mellitus tipo 2', 'glicemia alta'],
      diagnostico: 'Diabetes Mellitus Tipo 2 sem complicações agudas',
      cid10: 'E11.9',
      ciap2: 'T90',
      categoria: 'Metabólico',
      estratificavel: true,
      alarmes: ['Glicemia > 300 mg/dL com sintomas cetóticos (náuseas, vômitos, dor abdominal)', 'Lesão ulcerada ou bolhosa em pés', 'Rebaixamento de consciência ou confusão mental']
    },
    {
      termo: 'diabetes_tipo_1',
      sinonimos: ['dm1', 'dm 1', 'diabetes tipo 1', 'diabetes mellitus tipo 1', 'insulino dependente'],
      diagnostico: 'Diabetes Mellitus Tipo 1',
      cid10: 'E10.9',
      ciap2: 'T89',
      categoria: 'Metabólico',
      estratificavel: true,
      alarmes: ['Cetoacidose diabética (polipneia de Kussmaul, hálito cetônico, vômitos, desidratação)', 'Hipoglicemia grave sintomática']
    },
    {
      termo: 'dislipidemia',
      sinonimos: ['colesterol alto', 'colesterol', 'hipercolesterolemia', 'triglicerideos altos', 'hipertrigliceridemia'],
      diagnostico: 'Dislipidemia Mista / Hipercolesterolemia Pura',
      cid10: 'E78.0',
      ciap2: 'T93',
      categoria: 'Metabólico',
      estratificavel: true,
      alarmes: ['Dor em panturrilha ou membros aos esforços (claudicação)', 'Dor precordial']
    },
    {
      termo: 'obesidade',
      sinonimos: ['sobrepeso', 'excesso de peso', 'imc alto'],
      diagnostico: 'Obesidade não especificada',
      cid10: 'E66.9',
      ciap2: 'T82',
      categoria: 'Metabólico',
      estratificavel: false,
      alarmes: ['Dispneia paroxística noturna ou apneia obstrutiva grave']
    },
    {
      termo: 'hipotireoidismo',
      sinonimos: ['tireoide', 'tsh alto', 't4 livre baixo', 'hipo tireoidismo'],
      diagnostico: 'Hipotireoidismo primário não especificado',
      cid10: 'E03.9',
      ciap2: 'T86',
      categoria: 'Endócrino',
      estratificavel: false,
      alarmes: ['Bradicardia severa < 45 bpm', 'Mixedema com sonolência extrema']
    },
    {
      termo: 'resfriado_comum',
      sinonimos: ['resfriado', 'gripe', 'ivas', 'coriza', 'rinofaringite'],
      diagnostico: 'Rinofaringite Aguda (Resfriado Comum)',
      cid10: 'J00',
      ciap2: 'R74',
      categoria: 'Respiratório',
      estratificavel: false,
      alarmes: ['Falta de ar / esforço respiratório', 'Febre persistente > 72h', 'Prostração ou confusão']
    },
    {
      termo: 'faringite_amigdalite',
      sinonimos: ['dor de garganta', 'amigdalite', 'faringite', 'odinofagia'],
      diagnostico: 'Faringoamigdalite Aguda não especificada',
      cid10: 'J02.9',
      ciap2: 'R74',
      categoria: 'Respiratório',
      estratificavel: false,
      alarmes: ['Trismo (dificuldade de abrir a boca)', 'Sialorreia (incapacidade de deglutir saliva)', 'Desvio de úvula (suspeita de abscesso periamigdaliano)']
    },
    {
      termo: 'rinite_alergica',
      sinonimos: ['rinite', 'espirros', 'prurido nasal', 'coriza alergica'],
      diagnostico: 'Rinite Alérgica não especificada',
      cid10: 'J30.4',
      ciap2: 'R97',
      categoria: 'Respiratório',
      estratificavel: false,
      alarmes: ['Broncoespasmo ou estridor laríngeo associado']
    },
    {
      termo: 'asma_bronquica',
      sinonimos: ['asma', 'bronquite alergica', 'chiado no peito', 'sibilancia'],
      diagnostico: 'Asma brônquica não especificada',
      cid10: 'J45.9',
      ciap2: 'R96',
      categoria: 'Respiratório',
      estratificavel: false,
      alarmes: ['Fala entrecortada por falta de ar', 'Uso de musculatura acessória', 'SpO2 < 92%', 'Tórax silencioso à ausculta']
    },
    {
      termo: 'dpoc',
      sinonimos: ['doenca pulmonar obstrutiva cronica', 'enfisema', 'bronquite cronica'],
      diagnostico: 'Doença Pulmonar Obstrutiva Crônica não especificada',
      cid10: 'J44.9',
      ciap2: 'R95',
      categoria: 'Respiratório',
      estratificavel: false,
      alarmes: ['Aumento súbito de volume/purulência do escarro e dispneia (descompensação Anthonisen)', 'Cianose ou confusão mental']
    },
    {
      termo: 'dispepsia_gastrite',
      sinonimos: ['gastrite', 'queimacao no estomago', 'dor de estomago', 'dispepsia', 'azia'],
      diagnostico: 'Dispepsia Funcional / Gastrite não especificada',
      cid10: 'K30',
      ciap2: 'D87',
      categoria: 'Gastrointestinal',
      estratificavel: false,
      alarmes: ['Hematêmese ou melena', 'Vômitos incoercíveis', 'Perda ponderal não intencional', 'Disfagia progressiva']
    },
    {
      termo: 'drge',
      sinonimos: ['refluxo', 'doenca do refluxo gastroesofagico', 'pirose', 'regurgitacao'],
      diagnostico: 'Doença do Refluxo Gastroesofágico sem esofagite',
      cid10: 'K21.9',
      ciap2: 'D84',
      categoria: 'Gastrointestinal',
      estratificavel: false,
      alarmes: ['Disfagia ou odinofagia persistente', 'Engasgos noturnos com broncoaspiração']
    },
    {
      termo: 'lombalgia',
      sinonimos: ['dor nas costas', 'dor lombar', 'lumbago', 'dor na coluna'],
      diagnostico: 'Lombalgia mecânico-postural comum',
      cid10: 'M54.5',
      ciap2: 'L03',
      categoria: 'Musculoesquelético',
      estratificavel: false,
      alarmes: ['Anestesia em sela (períneo)', 'Incontinência fecal ou retenção urinária aguda (Síndrome da Cauda Equina)', 'Déficit motor agudo (pé caído)', 'Febre com dor lombar inflamatória noturna']
    },
    {
      termo: 'cefaleia_tensional',
      sinonimos: ['cefaleia', 'dor de cabeca', 'cefaleia tipo tensao', 'pressao na cabeca'],
      diagnostico: 'Cefaleia Tensional Episódica ou Crônica',
      cid10: 'G44.2',
      ciap2: 'N95',
      categoria: 'Neurológico',
      estratificavel: false,
      alarmes: ['Cefaleia súbita de início explosivo em < 1 min ("pior da vida")', 'Sinais meníngeos (rigidez de nuca)', 'Déficit neurológico focal', 'Início após os 50 anos ou febre com alteração de comportamento']
    },
    {
      termo: 'enxaqueca',
      sinonimos: ['migranea', 'enxaqueca com aura', 'enxaqueca sem aura', 'hemicrania'],
      diagnostico: 'Enxaqueca (Migrânea) sem aura',
      cid10: 'G43.0',
      ciap2: 'N89',
      categoria: 'Neurológico',
      estratificavel: false,
      alarmes: ['Aura atípica com duração > 60 min ou fraqueza motora', 'Mudança drástica no padrão usual de dor']
    },
    {
      termo: 'cistite_itu',
      sinonimos: ['itu', 'infeccao urinaria', 'cistite', 'disuria', 'ardor para urinar'],
      diagnostico: 'Cistite Aguda (Infecção do Trato Urinário Baixa)',
      cid10: 'N30.0',
      ciap2: 'U71',
      categoria: 'Urológico',
      estratificavel: false,
      alarmes: ['Febre alta associada a dor em flanco/lombar (Giordano positivo - suspeita de pielonefrite)', 'Náuseas e vômitos com prostração']
    },
    {
      termo: 'ansiedade_tag',
      sinonimos: ['ansiedade', 'tag', 'nervosismo', 'crise de ansiedade', 'transtorno ansioso'],
      diagnostico: 'Transtorno de Ansiedade Generalizada (TAG)',
      cid10: 'F41.1',
      ciap2: 'P74',
      categoria: 'Saúde Mental',
      estratificavel: false,
      alarmes: ['Ideação suicida estruturada', 'Surtos psicóticos ou agitação psicomotora intensa']
    },
    {
      termo: 'depressao',
      sinonimos: ['tristeza', 'transtorno depressivo', 'depressao leve', 'depressao moderada'],
      diagnostico: 'Episódio Depressivo Moderado sem sintomas psicóticos',
      cid10: 'F32.1',
      ciap2: 'P76',
      categoria: 'Saúde Mental',
      estratificavel: false,
      alarmes: ['Presença de plano ou ideação de autoextermínio (risco iminente)', 'Recusa alimentar severa com desidratação']
    },
    {
      termo: 'osteoartrite',
      sinonimos: ['artrose', 'gonartrose', 'desgaste no joelho', 'osteoartrose'],
      diagnostico: 'Gonartrose (Osteoartrite de Joelho) não especificada',
      cid10: 'M17.9',
      ciap2: 'L90',
      categoria: 'Musculoesquelético',
      estratificavel: false,
      alarmes: ['Sinais de artrite séptica (articulação quente, hiperemiada, com derrame volumoso e febre)']
    }
  ];

  /**
   * Busca diagnósticos no catálogo por termo livre ou sinônimo.
   */
  function buscarDiagnostico(termoBusca) {
    if (!termoBusca || typeof termoBusca !== 'string') return [];
    var limpo = termoBusca.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (!limpo) return [];

    return CATALOGO_DIAGNOSTICOS.filter(function(item) {
      if (item.termo.indexOf(limpo) !== -1 || item.diagnostico.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').indexOf(limpo) !== -1) {
        return true;
      }
      return item.sinonimos.some(function(s) {
        return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').indexOf(limpo) !== -1;
      });
    });
  }

  // 4. ESTRATIFICAÇÃO DE RISCO CARDIOVASCULAR E METABÓLICO (DIRETRIZES SBC / SBD)
  function estratificarRiscoCardiovascular(dados) {
    dados = dados || {};
    var idade = Number(dados.idade) || 0;
    var sexo = String(dados.sexo || '').toLowerCase(); // 'm' ou 'f'
    var pas = Number(dados.pas) || 120;
    var tabagismo = !!dados.tabagismo;
    var dm = !!dados.dm;
    var drc = !!dados.drc; // Doença Renal Crônica (TFG < 60 ou albuminúria)
    var dcvPrevia = !!(dados.dcvPrevia || dados.iam || dados.avc || dados.stent);
    var ldl = Number(dados.ldl) || 0;

    // Critério 1: Risco Muito Alto (Prevenção Secundária ou equivalente de alto risco)
    if (dcvPrevia) {
      return {
        nivel: 'MUITO ALTO',
        corBadge: '🔴',
        justificativa: 'Doença Cardiovascular Aterosclerótica clinicamente manifesta prévia (IAM, AVC/AIT, DAOP, revascularização).',
        meta_pa: '< 130/80 mmHg',
        meta_ldl: '< 50 mg/dL (redução >= 50% do basal)',
        meta_hba1c: dm ? '< 7.0% (individualizada)' : null,
        estatinaRecomendada: 'Atorvastatina 40-80 mg ou Rosuvastatina 20-40 mg (alta potência)',
        orientacoes: 'Acompanhamento rigoroso a cada 60 a 90 dias, antiagregação plaquetária com AAS, controle lipídico e pressórico intensivos.'
      };
    }

    if (dm && (drc || ldl >= 190 || idade >= 60 || (dados.tempoDm && Number(dados.tempoDm) >= 10))) {
      return {
        nivel: 'MUITO ALTO',
        corBadge: '🔴',
        justificativa: 'Diabetes Mellitus com lesão de órgão-alvo, DRC, múltiplos fatores de risco ou tempo de evolução prolongado.',
        meta_pa: '< 130/80 mmHg',
        meta_ldl: '< 50 mg/dL',
        meta_hba1c: '< 7.0%',
        estatinaRecomendada: 'Estatina de alta intensidade (Atorvastatina 40-80 mg ou Rosuvastatina 20 mg)',
        orientacoes: 'Rastreio anual de retinopatia e nefropatia (albuminúria/creatinina), exame cuidadoso dos pés em cada consulta.'
      };
    }

    // Critério 2: Risco Alto
    if (dm || drc || ldl >= 190 || pas >= 180 || Number(dados.pad) >= 110) {
      var razao = [];
      if (dm) razao.push('Diabetes Mellitus');
      if (drc) razao.push('Doença Renal Crônica (estágio 3 ou albuminúria)');
      if (ldl >= 190) razao.push('Hipercolesterolemia grave (LDL >= 190 mg/dL)');
      if (pas >= 180 || Number(dados.pad) >= 110) razao.push('HAS estágio 3');

      return {
        nivel: 'ALTO',
        corBadge: '🟠',
        justificativa: razao.join('; ') + '.',
        meta_pa: '< 130/80 mmHg',
        meta_ldl: '< 70 mg/dL',
        meta_hba1c: dm ? '< 7.0%' : null,
        estatinaRecomendada: 'Estatina de moderada a alta intensidade (Atorvastatina 20-40 mg ou Sinvastatina 40 mg)',
        orientacoes: 'Reavaliação clínica a cada 90 dias. Mudanças rigorosas de estilo de vida (dieta DASH, cessação tabágica, 150min/sem de exercício).'
      };
    }

    // Critério 3: Risco Intermediário
    var fatores = 0;
    if (tabagismo) fatores++;
    if (pas >= 140 || Number(dados.pad) >= 90) fatores++;
    if (ldl >= 130 && ldl < 190) fatores++;
    if (sexo === 'm' && idade >= 45) fatores++;
    if (sexo === 'f' && idade >= 55) fatores++;

    if (fatores >= 2) {
      return {
        nivel: 'INTERMEDIÁRIO',
        corBadge: '🟡',
        justificativa: 'Presença de 2 ou mais fatores de risco cardiovascular maiores (idade, tabagismo, dislipidemia, HAS estágio 1-2).',
        meta_pa: '< 130/80 mmHg',
        meta_ldl: '< 100 mg/dL',
        meta_hba1c: null,
        estatinaRecomendada: 'Estatina de intensidade moderada (Sinvastatina 20-40 mg ou Atorvastatina 10-20 mg se não atingir meta com MEV)',
        orientacoes: 'Enfatizar mudanças de estilo de vida por 3 a 6 meses. Se LDL persistir acima de 100 mg/dL, iniciar terapia farmacológica.'
      };
    }

    // Critério 4: Baixo Risco
    return {
      nivel: 'BAIXO',
      corBadge: '🟢',
      justificativa: 'Ausência de fatores de risco maiores em paciente jovem ou sem comorbidades relevantes.',
      meta_pa: '< 130/80 mmHg (ideal < 120/80)',
      meta_ldl: '< 130 mg/dL',
      meta_hba1c: null,
      estatinaRecomendada: 'Apenas medidas não farmacológicas (MEV)',
      orientacoes: 'Promoção de saúde, manutenção do peso ideal (IMC 18.5-24.9), atividade física regular e reavaliação anual.'
    };
  }

  // 5. NÚMEROS POR EXTENSO PARA ATESTADO MÉDICO LEGAL
  function converterNumeroPorExtenso(num) {
    var n = parseInt(num, 10);
    var mapa = {
      1: 'um', 2: 'dois', 3: 'três', 4: 'quatro', 5: 'cinco',
      6: 'seis', 7: 'sete', 8: 'oito', 9: 'nove', 10: 'dez',
      11: 'onze', 12: 'doze', 13: 'treze', 14: 'quatorze', 15: 'quinze',
      16: 'dezesseis', 17: 'dezessete', 18: 'dezoito', 19: 'dezenove', 20: 'vinte',
      21: 'vinte e um', 22: 'vinte e dois', 23: 'vinte e três', 24: 'vinte e quatro',
      25: 'vinte e cinco', 26: 'vinte e seis', 27: 'vinte e sete', 28: 'vinte e oito',
      29: 'vinte e nove', 30: 'trinta', 45: 'quarenta e cinco', 60: 'sessenta', 90: 'noventa'
    };
    return mapa[n] || String(n);
  }

  // 6. ESTRUTURAÇÃO COMPLETA DO SOAP AMBULATORIAL ÁGIL
  function estruturarSoapAmbulatorial(dados) {
    dados = dados || {};

    // S - SUBJETIVO
    var qp = dados.queixaPrincipal || dados.qp || 'Consulta de rotina / acompanhamento ambulatorial';
    var tempoEvolucao = dados.tempoEvolucao || dados.tempo || 'Tempo de evolução não informado';
    var hda = dados.hda || 'Paciente comparece para avaliação clínica ambulatorial, relatando ' + qp + ' há ' + tempoEvolucao + '.';
    var medUso = dados.medicacoesUso || dados.medicacoes || 'Nega uso de medicações contínuas';
    var alergias = dados.alergias || 'Nega alergias medicamentosas conhecidas';
    var antecedentes = dados.antecedentes || 'Sem outras comorbidades relatadas';
    var habitos = dados.habitos || 'Nega tabagismo, etilismo social ou negado, sedentarismo habitual';

    var blocoS = [
      '• Queixa Principal (QP): ' + qp + ' (tempo de evolução: ' + tempoEvolucao + ')',
      '• História da Doença Atual (HDA): ' + hda,
      '• Medicações de Uso Contínuo: ' + medUso,
      '• Alergias: ' + alergias,
      '• Antecedentes Pessoais / Familiares: ' + antecedentes,
      '• Hábitos de Vida: ' + habitos
    ].join('\n');

    // O - OBJETIVO
    var sv = dados.sinaisVitais || {};
    var linhasSv = [];
    if (sv.pa) linhasSv.push('PA: ' + sv.pa + ' mmHg');
    if (sv.fc) linhasSv.push('FC: ' + sv.fc + ' bpm');
    if (sv.fr) linhasSv.push('FR: ' + sv.fr + ' irpm');
    if (sv.spo2) linhasSv.push('SpO2: ' + sv.spo2 + '%');
    if (sv.tax) linhasSv.push('Tax: ' + sv.tax + ' °C');
    if (sv.glicemia) linhasSv.push('Glicemia capilar: ' + sv.glicemia + ' mg/dL');
    if (sv.peso) linhasSv.push('Peso: ' + sv.peso + ' kg');
    if (sv.altura) linhasSv.push('Altura: ' + sv.altura + ' m');
    if (sv.imc) linhasSv.push('IMC: ' + sv.imc + ' kg/m²');

    var textoSv = linhasSv.length ? linhasSv.join(' | ') : 'Sinais vitais normais aferidos na triagem.';

    var textoEf = dados.exameFisicoTexto || '';
    if (!textoEf && dados.modeloExameFisico && MODELOS_EXAME_FISICO[dados.modeloExameFisico]) {
      textoEf = MODELOS_EXAME_FISICO[dados.modeloExameFisico].texto;
    } else if (!textoEf) {
      textoEf = MODELOS_EXAME_FISICO.checkup_geral.texto;
    }

    var blocoO = '• Sinais Vitais: ' + textoSv + '\n' + textoEf;

    // A - AVALIAÇÃO
    var listaDiag = [];
    if (Array.isArray(dados.diagnosticos) && dados.diagnosticos.length) {
      listaDiag = dados.diagnosticos;
    } else if (dados.diagnosticoPrincipal) {
      listaDiag = [dados.diagnosticoPrincipal];
    } else {
      listaDiag = ['1. Acompanhamento ambulatorial geral (CID-10: Z00.0 / CIAP-2: A98)'];
    }

    var textoAvaliacao = listaDiag.map(function(d, i) {
      return (i + 1) + '. ' + d;
    }).join('\n');

    if (dados.estratificacaoRisco) {
      var r = dados.estratificacaoRisco;
      textoAvaliacao += '\n\n• Estratificação de Risco Cardiovascular: ' + (r.corBadge || '') + ' Risco ' + r.nivel +
        ' (' + r.justificativa + ')\n  Meta Pressórica: ' + r.meta_pa + ' | Meta LDL: ' + r.meta_ldl;
    }

    // P - PLANO
    var planoLinhas = [];

    // 1. Prescrição Farmacológica
    if (dados.prescricaoMedicamentosa && dados.prescricaoMedicamentosa.length) {
      planoLinhas.push('💊 Prescrição Medicamentosa (REMUME / Farmácia Popular):');
      var itensMed = Array.isArray(dados.prescricaoMedicamentosa) ? dados.prescricaoMedicamentosa : [dados.prescricaoMedicamentosa];
      itensMed.forEach(function(m, idx) {
        if (typeof m === 'string') {
          planoLinhas.push('  ' + (idx + 1) + ') ' + m);
        } else if (m && m.nome) {
          var desc = m.nome + ' ' + (m.apresentacao || '') + ' --- ' + (m.quantidade || 'Uso contínuo');
          desc += '\n     Posologia: ' + (m.posologia || '') + (m.horarios ? ' (Horários: ' + m.horarios + ')' : '');
          planoLinhas.push('  ' + (idx + 1) + ') ' + desc);
        }
      });
    }

    // 2. Orientações Não Farmacológicas (MEV)
    var mev = dados.mev || [
      'Alimentação balanceada (redução de sódio < 2g/dia, açúcares simples e ultraprocessados).',
      'Atividade física regular aeróbica (meta de 150 min/semana divididos em 3 a 5 sessões).',
      'Manter hidratação oral adequada e cessação do tabagismo se aplicável.'
    ];
    if (Array.isArray(mev) && mev.length) {
      planoLinhas.push('\n🥗 Orientações Não Farmacológicas / Mudanças de Estilo de Vida (MEV):');
      mev.forEach(function(item) {
        planoLinhas.push('  • ' + item);
      });
    }

    // 3. Exames Solicitados
    if (dados.examesSolicitados && dados.examesSolicitados.length) {
      planoLinhas.push('\n🔬 Exames Complementares Solicitados:');
      var exList = Array.isArray(dados.examesSolicitados) ? dados.examesSolicitados : [dados.examesSolicitados];
      exList.forEach(function(ex) {
        planoLinhas.push('  • ' + ex);
      });
    }

    // 4. Sinais de Alarme
    var alarmes = dados.sinaisAlarme || [
      'Procurar atendimento imediato em Pronto-Socorro se: dor no peito em aperto, falta de ar súbita, perda de força em um lado do corpo, fala enrolada ou febre alta persistente.'
    ];
    if (Array.isArray(alarmes) && alarmes.length) {
      planoLinhas.push('\n🚨 Sinais de Alarme para Procura de Pronto-Socorro:');
      alarmes.forEach(function(al) {
        planoLinhas.push('  • ' + al);
      });
    }

    // 5. Retorno
    var diasRetorno = dados.retornoDias ? (dados.retornoDias + ' dias') : '30 a 60 dias';
    planoLinhas.push('\n📅 Retorno Ambulatorial: Reavaliação clínica e checagem de exames em ' + diasRetorno + '.');

    var blocoP = planoLinhas.join('\n');

    // Texto integral consolidado
    var textoProntuario = [
      '======================================================================',
      '                  PRONTUÁRIO CLÍNICO AMBULATORIAL (SOAP)              ',
      '======================================================================',
      'Data: ' + (dados.data || new Date().toLocaleDateString('pt-BR')),
      'Paciente: ' + (dados.pacienteNome || 'Ao Portador') + (dados.idade ? ' (' + dados.idade + ' anos)' : ''),
      '',
      '[S - SUBJETIVO]',
      blocoS,
      '',
      '[O - OBJETIVO]',
      blocoO,
      '',
      '[A - AVALIAÇÃO]',
      textoAvaliacao,
      '',
      '[P - PLANO]',
      blocoP,
      '======================================================================'
    ].join('\n');

    return {
      subjetivo: blocoS,
      objetivo: blocoO,
      avaliacao: textoAvaliacao,
      plano: blocoP,
      textoProntuario: textoProntuario
    };
  }

  // 7. EXPORTAÇÃO LIMPA DE RECEITA MÉDICA AMBULATORIAL (TEXTO PURO PARA PEP)
  function exportarReceitaTexto(dados) {
    dados = dados || {};
    var paciente = dados.pacienteNome || dados.paciente || 'Ao Portador';
    var dataStr = dados.data || new Date().toLocaleDateString('pt-BR');
    var medico = dados.medicoNome || 'Dr. Wagner Moraes';
    var crm = dados.medicoCrm || 'CRM/SP';

    var linhas = [
      '======================================================================',
      '                       RECEITUÁRIO MÉDICO AMBULATORIAL                ',
      '======================================================================',
      'Paciente: ' + paciente,
      'Data: ' + dataStr,
      '----------------------------------------------------------------------'
    ];

    var itens = dados.itens || dados.medicamentos || [];
    if (!itens.length && dados.textoLivre) {
      linhas.push(dados.textoLivre);
    } else {
      // Agrupa por via de administração
      var porVia = {};
      itens.forEach(function(item) {
        var via = (item.via || 'USO ORAL').toUpperCase();
        if (!porVia[via]) porVia[via] = [];
        porVia[via].push(item);
      });

      var numItem = 1;
      Object.keys(porVia).forEach(function(via) {
        linhas.push('\n[' + via + ']');
        porVia[via].forEach(function(m) {
          var nomeApres = (m.nome || 'Medicamento') + (m.apresentacao ? ' ' + m.apresentacao : '');
          var qtd = m.quantidade ? ' -------------------- ' + m.quantidade : '';
          linhas.push(numItem + ') ' + nomeApres + qtd);
          if (m.posologia) {
            var poso = '   Tomar ' + m.posologia;
            if (m.horarios) poso += ' (Horários sugeridos: ' + m.horarios + ')';
            if (m.duracao) poso += ' por ' + m.duracao + '.';
            linhas.push(poso);
          }
          numItem++;
        });
      });
    }

    if (dados.orientacoes && dados.orientacoes.length) {
      linhas.push('\n----------------------------------------------------------------------');
      linhas.push('ORIENTAÇÕES AO PACIENTE:');
      var orList = Array.isArray(dados.orientacoes) ? dados.orientacoes : [dados.orientacoes];
      orList.forEach(function(o) {
        linhas.push('• ' + o);
      });
    }

    linhas.push('======================================================================');
    linhas.push('Assinatura e Carimbo Médico: ' + medico + ' · ' + crm);

    return linhas.join('\n');
  }

  // 8. EXPORTAÇÃO LIMPA DE ATESTADO MÉDICO (CONFORME RESOLUÇÕES CFM 1.658/2002 E 1.851/2008)
  function exportarAtestadoTexto(dados) {
    dados = dados || {};
    var paciente = dados.pacienteNome || dados.paciente || '[Nome do Paciente]';
    var doc = dados.pacienteDoc || dados.doc || '[Documento de Identidade/CPF]';
    var dias = parseInt(dados.dias || 1, 10);
    var diasExtenso = converterNumeroPorExtenso(dias);
    var aPartirDe = dados.aPartirDe || dados.data || new Date().toLocaleDateString('pt-BR');
    var finalidade = dados.finalidade || 'repouso e recuperação clínica, necessitando de afastamento de suas atividades laborais e escolares';
    var cidade = dados.cidade || 'Ribeirão Preto - SP';
    var dataStr = dados.data || new Date().toLocaleDateString('pt-BR');
    var medico = dados.medicoNome || 'Dr. Wagner Moraes';
    var crm = dados.medicoCrm || 'CRM/SP';

    var linhas = [
      '======================================================================',
      '                           ATESTADO MÉDICO                            ',
      '======================================================================',
      '',
      'Atesto para os devidos fins de comprovação que o(a) paciente:',
      'Nome: ' + paciente,
      'Documento: ' + doc,
      '',
      'Foi atendido(a) sob meus cuidados profissionais nesta data e necessita de',
      dias + ' (' + diasExtenso + ') dia(s) de ' + finalidade + ',',
      'a contar a partir de ' + aPartirDe + '.',
      ''
    ];

    // O CID só pode constar com consentimento expresso do paciente
    if (dados.incluirCid && dados.cid) {
      linhas.push('Diagnóstico / CID-10: ' + dados.cid + ' - ' + (dados.cidDescricao || ''));
      linhas.push('(Código de diagnóstico incluído a pedido e com autorização expressa do paciente, em conformidade com as Resoluções CFM nº 1.658/2002 e nº 1.851/2008).');
      linhas.push('');
    } else {
      linhas.push('(Diagnóstico omitido nos termos do sigilo médico e do art. 5º da Resolução CFM nº 1.658/2002).');
      linhas.push('');
    }

    linhas.push('Local e Data: ' + cidade + ', ' + dataStr + '.');
    linhas.push('');
    linhas.push('__________________________________________________________');
    linhas.push(medico + ' · ' + crm);
    linhas.push('======================================================================');

    return linhas.join('\n');
  }

  // 9. EXPORTAÇÃO DE ENCAMINHAMENTO / REFERÊNCIA AMBULATORIAL (SISREG / CROSS)
  function exportarEncaminhamentoTexto(dados) {
    dados = dados || {};
    var paciente = dados.pacienteNome || dados.paciente || '[Nome do Paciente]';
    var dataStr = dados.data || new Date().toLocaleDateString('pt-BR');
    var especialidade = dados.especialidade || '[Especialidade Destino]';
    var motivo = dados.motivo || '[Motivo do Encaminhamento]';
    var cid = dados.cid || '[CID-10]';
    var prioridade = dados.prioridade || 'Eletiva / Regulada';
    var medico = dados.medicoNome || 'Dr. Wagner Moraes';
    var crm = dados.medicoCrm || 'CRM/SP';

    var linhas = [
      '======================================================================',
      '         GUIA DE ENCAMINHAMENTO / REFERÊNCIA AMBULATORIAL (SISREG)     ',
      '======================================================================',
      'Paciente: ' + paciente + ' | Data: ' + dataStr,
      'Especialidade Solicitada: ' + especialidade.toUpperCase(),
      'Prioridade Clínica: ' + prioridade,
      'Hipótese Diagnóstica: ' + cid,
      '----------------------------------------------------------------------',
      '1. MOTIVO DO ENCAMINHAMENTO:',
      motivo,
      '',
      '2. RESUMO CLÍNICO E EVOLUÇÃO (HDA):',
      dados.hda || 'Histórico clínico e tratamentos conservadores tentados sem resposta satisfatória na atenção primária.',
      '',
      '3. EXAMES COMPLEMENTARES RELEVANTES REALIZADOS:',
      dados.exames || 'Exames prévios anexados ao prontuário.',
      '',
      '4. TRATAMENTOS JÁ UTILIZADOS:',
      dados.tratamentos || 'Medicações da rede básica utilizadas conforme diretrizes clínicas.',
      '',
      '5. DÚVIDA CLÍNICA / OBJETIVO DO PARECER:',
      dados.objetivoParecer || 'Avaliação especializada para conduta complementar e seguimento conjunto.',
      '----------------------------------------------------------------------',
      'Médico Solicitante: ' + medico + ' · ' + crm,
      '======================================================================'
    ];

    return linhas.join('\n');
  }

  // 10. FORMATADOR E MODELO CANÔNICO DE EXAME FÍSICO POR SISTEMAS EM LINHAS DISTINTAS
  function formatarExameFisicoSistemas(texto) {
    if (!texto || typeof texto !== 'string') return '';
    var t = texto.trim();

    // 1. Separar sinais vitais do exame geral se estiverem na mesma linha
    t = t.replace(/(\b(?:T:\s*[^.]+|\d+°C|ar\s+ambiente|mmHg|\bbpm|\birpm|\b%)\s*\.)\s*(Bom\s+estado\s+geral|BEG|Lúcido|LOTE|Corado|Geral:)/gi, '$1\nGeral: $2');
    t = t.replace(/(^|\n)(?!Geral:)(Bom\s+estado\s+geral\b)/gi, '$1Geral: $2');

    // 2. Garantir quebra de linha antes de cada sistema semiológico
    var sistemas = [
      { re: /(?:[.;,]|\b)\s*(ACV\s*:|Cardiovascular\s*:|Aparelho\s+Cardiovascular\s*:)/gi, rep: 'ACV:' },
      { re: /(?:[.;,]|\b)\s*(AR\s*:|Respirat[óo]rio\s*:|Aparelho\s+Respirat[óo]rio\s*:)/gi, rep: 'AR:' },
      { re: /(?:[.;,]|\b)\s*(Abdome\s*:|Abdominal\s*:)/gi, rep: 'Abdome:' },
      { re: /(?:[.;,]|\b)\s*(Extremidades\s*:|Membros\s*:|MMII\s*:)/gi, rep: 'Extremidades:' },
      { re: /(?:[.;,]|\b)\s*(Neurol[óo]gico\s*:|Neuro\s*:)/gi, rep: 'Neurológico:' },
      { re: /(?:[.;,]|\b)\s*(Otoscopia\s*:)/gi, rep: 'Otoscopia:' },
      { re: /(?:[.;,]|\b)\s*(Oroscopia\s*:)/gi, rep: 'Oroscopia:' },
      { re: /(?:[.;,]|\b)\s*(Ginecol[óo]gico\s*:|Exame\s+Especular\s*:)/gi, rep: 'Ginecológico:' }
    ];

    sistemas.forEach(function(s) {
      t = t.replace(s.re, function(match, p1, offset) {
        if (offset === 0) return p1.trim();
        return '\n' + p1.trim();
      });
    });

    return t.split('\n').map(function(linha) {
      return linha.trim();
    }).filter(Boolean).join('\n');
  }

  function obterModeloExameFisicoCompleto(contextoPrevio) {
    var texto = String(contextoPrevio || '');
    var paMatch = texto.match(/\b(?:pa\s*[:=]?\s*)(\d{2,3}\s*[x/]\s*\d{2,3}(?:\s*mmhg)?)\b/i) || texto.match(/\b(\d{2,3}\s*[x/]\s*\d{2,3}\s*mmhg)\b/i);
    var fcMatch = texto.match(/\b(?:fc|frequ[eê]ncia\s+card[ií]aca)\s*[:=]?\s*(\d{2,3}(?:\s*bpm)?)\b/i) || texto.match(/\b(\d{2,3})\s*bpm\b/i);
    var frMatch = texto.match(/\b(?:fr|frequ[eê]ncia\s+respirat[oó]ria)\s*[:=]?\s*(\d{2}(?:\s*irpm|\s*rpm)?)\b/i) || texto.match(/\b(\d{2})\s*(?:irpm|rpm)\b/i);
    var satMatch = texto.match(/\b(?:spo2|sat(?:ura[çc][ãa]o)?(?:[\s_]o2)?)\s*[:=]?\s*(\d{2,3}%?(?:\s*(?:em\s+)?aa|\s*(?:em\s+)?ar\s+ambiente)?)\b/i) || texto.match(/\b(\d{2,3}%)\b/);
    var taxMatch = texto.match(/\b(?:tax|temp(?:eratura)?|t)\s*[:=]?\s*(\d{2}(?:[.,]\d+)?\s*°?c)\b/i) || texto.match(/\b(\d{2}(?:[.,]\d+)?\s*°c)\b/i);

    var sv = [];
    sv.push(paMatch ? ('PA: ' + (/mmhg/i.test(paMatch[1]) ? paMatch[1].trim() : paMatch[1].trim() + ' mmHg')) : 'PA: [   ] mmHg');
    sv.push(fcMatch ? ('FC: ' + (/bpm/i.test(fcMatch[1]) ? fcMatch[1].trim() : fcMatch[1].trim() + ' bpm')) : 'FC: [   ] bpm');
    sv.push(frMatch ? ('FR: ' + (/irpm|rpm/i.test(frMatch[1]) ? frMatch[1].trim() : frMatch[1].trim() + ' irpm')) : 'FR: [   ] irpm');
    sv.push(satMatch ? ('SpO2: ' + (/%/.test(satMatch[1]) ? satMatch[1].trim() : satMatch[1].trim() + '% em ar ambiente')) : 'SpO2: [   ]% em ar ambiente');
    sv.push(taxMatch ? ('T: ' + (/°?c/i.test(taxMatch[1]) ? taxMatch[1].trim() : taxMatch[1].trim() + '°C')) : 'T: [   ]°C');

    var linhaSV = 'Sinais Vitais: ' + sv.join(' | ') + '.';

    return [
      linhaSV,
      'Geral: Bom estado geral, lúcido e orientado no tempo e espaço, corado, hidratado, anictérico, acianótico, afebril ao toque, eupneico em ar ambiente.',
      'ACV: Ritmo cardíaco regular em 2 tempos, bulhas normofonéticas, sem sopros. Pulsos radiais amplos, cheios e simétricos bilateralmente.',
      'AR: Murmúrio vesicular globalmente presente, sem ruídos adventícios. Expansibilidade torácica preservada bilateralmente.',
      'Abdome: Plano, flácido, indolor à palpação superficial e profunda. RHA normoativos. Sem massas ou visceromegalias.',
      'Extremidades: Sem edema de membros inferiores. Panturrilhas livres sem empastamento. TEC < 3 segundos.'
    ].join('\n');
  }

  // 11. FORMATAÇÃO CANÔNICA DE RASCUNHO SOAP PARA O TELEGRAM (FASE 1 vs FASE 2)
  function formatarRascunhoSoapTelegram(dados, opcoes) {
    opcoes = opcoes || {};
    dados = dados || {};
    var ehFechado = !!(opcoes.fecharPlano || (dados && (dados.avaliacao || dados.plano)));

    if (typeof dados === 'string') {
      var textoPuro = dados.trim();
      if (!textoPuro) return 'Nenhum dado clínico informado para o SOAP.';
      if (/^🩺\s*\*SÍNTESE SOAP/i.test(textoPuro)) {
        return textoPuro;
      }
      if (ehFechado) {
        dados = { queixaPrincipal: textoPuro, hda: textoPuro };
      } else {
        return [
          '🩺 *SÍNTESE SOAP · ATENDIMENTO CLÍNICO*',
          '👤 *S - Subjetivo (Anamnese Estruturada)*\n' + textoPuro,
          '🔍 *O - Objetivo (Exame Físico)*\nExame físico pendente de avaliação beira-leito. Aferir sinais vitais e exame direcionado.'
        ].join('\n\n');
      }
    }

    if (ehFechado) {
      var estruturado = (typeof estruturarSoapAmbulatorial === 'function' && !dados.textoProntuario && !dados.avaliacao && !dados.plano)
        ? estruturarSoapAmbulatorial(dados)
        : dados;

      var sText = dados.subjetivo || (estruturado && estruturado.subjetivo) || dados.hda || 'Anamnese realizada.';
      var oText = formatarExameFisicoSistemas(dados.objetivo || (estruturado && estruturado.objetivo) || dados.exameFisicoTexto || 'Exame físico realizado.');
      var aText = dados.avaliacao || (estruturado && estruturado.avaliacao) || 'Avaliação clínica a definir.';
      var pText = dados.plano || (estruturado && estruturado.plano) || 'Conduta e orientações a definir.';
      if (Array.isArray(aText)) aText = aText.join('\n');
      if (Array.isArray(pText)) pText = pText.join('\n');

      var linhasFase2 = [
        '🩺 *SÍNTESE SOAP · REGISTRO CONSOLIDADO*',
        '👤 *S - Subjetivo*\n' + sText,
        '🔍 *O - Objetivo*\n' + oText,
        '🧠 *A - Avaliação*\n' + aText,
        '📋 *P - Plano*\n' + pText
      ];

      var pends = dados.pendencias || dados.pendencias_opcionais;
      if (Array.isArray(pends) && pends.length) {
        linhasFase2.push('💡 *Dados adicionais sugeridos (se houver):*\n' + pends.map(function(item) { return '• ' + item; }).join('\n'));
      }

      return linhasFase2.join('\n\n');
    } else {
      var sRasc = dados.subjetivo || dados.hda || dados.queixaPrincipal || 'Anamnese em andamento.';
      var oRasc = formatarExameFisicoSistemas(dados.objetivo || dados.exameFisicoTexto || 'Exame físico em estruturação; conferir sinais vitais e achados.');
      var pergs = dados.perguntas_anamnese || dados.perguntas;
      var dirigs = dados.exame_dirigido || dados.exameDirigido;

      var linhasFase1 = [
        '🩺 *SÍNTESE SOAP · ATENDIMENTO CLÍNICO*',
        '👤 *S - Subjetivo (Anamnese Estruturada)*\n' + sRasc,
        '🔍 *O - Objetivo (Exame Físico)*\n' + oRasc
      ];

      if (Array.isArray(pergs) && pergs.length) {
        linhasFase1.push('❓ *Perguntas para Completar a Anamnese (Investigação Ativa do Subjetivo)*\n' + pergs.map(function(item) { return '• ' + item; }).join('\n'));
      }

      if (Array.isArray(dirigs) && dirigs.length) {
        linhasFase1.push('🎯 *Cobrança Ativa do Exame Físico Dirigido*\n' + dirigs.map(function(item) { return '• ' + item; }).join('\n'));
      }

      return linhasFase1.join('\n\n');
    }
  }

  // 12. PROCESSAMENTO DETERMINÍSTICO E RESILIENTE DE ENTRADA SOAP
  function processarEntradaSoap(chatId, textoEntrada, opcoes) {
    opcoes = opcoes || {};
    var caso = String(textoEntrada || '').trim();
    if (!caso) {
      if (typeof iniciarModoBot === 'function') {
        return iniciarModoBot(chatId, 'soap', true);
      }
      return false;
    }
    var cache = (typeof CacheService !== 'undefined' && CacheService.getScriptCache)
      ? CacheService.getScriptCache()
      : (typeof uxCache === 'function' ? uxCache() : null);
    if (cache && typeof safePutCache === 'function') {
      safePutCache(cache, 'ctx_' + chatId, caso, 900);
      safePutCache(cache, 'pending_soap_' + chatId, caso, 900);
    }
    var estAtual = null;
    if (typeof definirModoBot === 'function') {
      estAtual = definirModoBot(chatId, 'soap', caso);
    } else if (typeof modoBot === 'function') {
      estAtual = modoBot(chatId);
    }
    var fechar = !!(opcoes.fecharPlano || /fechar\s+plano|gerar\s+plano|conduta\s+completa|prescri[çc][ãa]o/i.test(caso));
    var rascunho = formatarRascunhoSoapTelegram(caso, { fecharPlano: fechar });
    if (typeof salvarSoapCockpit_ === 'function') {
      salvarSoapCockpit_(chatId, estAtual, rascunho);
    }
    if (typeof processarEEntregarIA === 'function' && typeof gerarSOAPComIA === 'function') {
      return processarEEntregarIA(chatId, function(c) {
        return gerarSOAPComIA(c, { fecharPlano: fechar });
      }, caso, 'soap');
    }
    if (typeof enviarMensagemParaChat === 'function') {
      return enviarMensagemParaChat(chatId, rascunho);
    }
    return rascunho;
  }

  return {
    VALORES_REFERENCIA: VALORES_REFERENCIA,
    MODELOS_EXAME_FISICO: MODELOS_EXAME_FISICO,
    CATALOGO_DIAGNOSTICOS: CATALOGO_DIAGNOSTICOS,
    buscarDiagnostico: buscarDiagnostico,
    estratificarRiscoCardiovascular: estratificarRiscoCardiovascular,
    converterNumeroPorExtenso: converterNumeroPorExtenso,
    estruturarSoapAmbulatorial: estruturarSoapAmbulatorial,
    exportarReceitaTexto: exportarReceitaTexto,
    exportarAtestadoTexto: exportarAtestadoTexto,
    exportarEncaminhamentoTexto: exportarEncaminhamentoTexto,
    formatarExameFisicoSistemas: formatarExameFisicoSistemas,
    obterModeloExameFisicoCompleto: obterModeloExameFisicoCompleto,
    formatarRascunhoSoapTelegram: formatarRascunhoSoapTelegram,
    processarEntradaSoap: processarEntradaSoap
  };
})();

function formatarExameFisicoSistemas(texto) {
  return SoapAmbulatorialService.formatarExameFisicoSistemas(texto);
}

function obterModeloExameFisicoCompleto(contextoPrevio) {
  return SoapAmbulatorialService.obterModeloExameFisicoCompleto(contextoPrevio);
}

function formatarRascunhoSoapTelegram(dados, opcoes) {
  return SoapAmbulatorialService.formatarRascunhoSoapTelegram(dados, opcoes);
}

function processarEntradaSoap(chatId, textoEntrada, opcoes) {
  return SoapAmbulatorialService.processarEntradaSoap(chatId, textoEntrada, opcoes);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SoapAmbulatorialService;
}

