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
      alvo_alto_risco: '< 130/80 mmHg (SBC 2020/2024: recomendado em alto/muito alto risco CV, DM, DRC ou LOA)',
      alvo_baixo_intermediario: '< 140/90 mmHg (alvo primário; considerar < 130/80 mmHg se bem tolerado)',
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
      meta_sbc: '< 130/80 mmHg (alto risco) ou < 140/90 mmHg (baixo/intermediário)',
      escalonamento_sbc: 'Passo 1: Monoterapia (Estágio 1 baixo risco); Passo 2: Dupla terapia IECA/BRA + BCC ou Tiazídico (Estágio 1 alto risco ou Estágios 2/3); Passo 3: Tripla terapia (IECA/BRA + BCC + Tiazídico); Passo 4: Espironolactona 25-50mg (HAR)',
      monitorizacao_k_cr: 'Dosagem de Creatinina e Potássio em 1 a 2 semanas após início/ajuste; tolerar elevação de Cr até 30%; contraindicação formal a AINEs',
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

  // 4-B. DIRETRIZES DE METAS PRESSÓRICAS, ESCALONAMENTO E MONITORIZAÇÃO (SBC 2020 / 2024)
  var ESC_2024_HAS_CONFIG = {
    referencia: "Diretriz ESC 2024 (European Heart Journal)",
    categorias: {
      NAO_ELEVADA: {
        id: "pa_nao_elevada",
        label: "Pressão Arterial Não Elevada",
        criterio: "PAS < 120 e PAD < 70 mmHg",
        corAlerta: "green"
      },
      ELEVADA: {
        id: "pa_elevada",
        label: "Pressão Arterial Elevada",
        criterio: "PAS 120-139 ou PAD 70-89 mmHg",
        corAlerta: "yellow"
      },
      HAS_ESTAGIO_1: {
        id: "has_estagio_1",
        label: "Hipertensão Arterial - Estágio 1",
        criterio: "PAS 140-159 ou PAD 90-99 mmHg",
        corAlerta: "orange"
      },
      HAS_ESTAGIO_2: {
        id: "has_estagio_2",
        label: "Hipertensão Arterial - Estágio 2",
        criterio: "PAS 160-179 ou PAD 100-109 mmHg",
        corAlerta: "red"
      },
      HAS_ESTAGIO_3: {
        id: "has_estagio_3",
        label: "Hipertensão Arterial - Estágio 3",
        criterio: "PAS >= 180 ou PAD >= 110 mmHg",
        corAlerta: "darkred"
      }
    }
  };

  /**
   * Classifica a Pressão Arterial de acordo com os novos limiares da ESC 2024.
   */
  function classificarPA_ESC2024(pas, pad) {
    var s = Number(pas);
    var d = Number(pad);
    if (!s || !d || s <= 0 || d <= 0) {
      return { erro: "Valores de PA inválidos ou ausentes." };
    }

    if (s >= 180 || d >= 110) {
      return {
        id: "has_estagio_3",
        label: "Hipertensão Arterial - Estágio 3",
        criterio: "PAS >= 180 ou PAD >= 110 mmHg",
        isHipertensao: true,
        estagio: 3,
        notaClinica: "Avaliar imediatamente emergência/urgência hipertensiva. Iniciar/otimizar terapia combinada."
      };
    }

    if (s >= 160 || d >= 100) {
      return {
        id: "has_estagio_2",
        label: "Hipertensão Arterial - Estágio 2",
        criterio: "PAS 160-179 ou PAD 100-109 mmHg",
        isHipertensao: true,
        estagio: 2,
        notaClinica: "Confirmar diagnóstico rapidamente. Indicado início imediato de terapia medicamentosa dupla + MEV."
      };
    }

    if (s >= 140 || d >= 90) {
      return {
        id: "has_estagio_1",
        label: "Hipertensão Arterial - Estágio 1",
        criterio: "PAS 140-159 ou PAD 90-99 mmHg",
        isHipertensao: true,
        estagio: 1,
        notaClinica: "Confirmar com MAPA/MRPA. Iniciar tratamento farmacológico + MEV (especialmente se alto risco CV)."
      };
    }

    if ((s >= 120 && s <= 139) || (d >= 70 && d <= 89)) {
      return {
        id: "pa_elevada",
        label: "Pressão Arterial Elevada",
        criterio: "PAS 120-139 ou PAD 70-89 mmHg",
        isHipertensao: false,
        estagio: 0,
        notaClinica: "Estratificar risco CV (SCORE2/SCORE2-OP). Se Risco CV alto/muito alto ou DCV estabelecida, considerar fármaco se PA >= 130/80 após 3 meses de MEV."
      };
    }

    return {
      id: "pa_nao_elevada",
      label: "Pressão Arterial Não Elevada",
      criterio: "PAS < 120 e PAD < 70 mmHg",
      isHipertensao: false,
      estagio: 0,
      notaClinica: "Manter estilo de vida saudável. Reavaliar periodicamente."
    };
  }

  /**
   * Define a Meta Pressórica Terapêutica individualizada (ESC 2024 / SBC).
   */
  function obterMetaPressorica_ESC2024(idade, isFragil) {
    var idNum = Number(idade) || 55;
    var fragil = Boolean(isFragil);

    if (idNum >= 80 || fragil) {
      return {
        perfil: "Idoso >= 80 anos ou Paciente Frágil",
        alvoPAS: { min: 130, max: 139, ideal: "130-139 mmHg" },
        alvoPAD: { min: 70, max: 79, ideal: "< 80 mmHg" },
        principioALARA: true,
        recomendacaoSOAP: "Meta Pressórica (ESC 2024): PAS 130-139 mmHg (ou tão baixa quanto razoavelmente tolerada - princípio ALARA). Monitorar rigorosamente hipotensão ortostática e função renal."
      };
    }

    return {
      perfil: "Adulto Padrão (18-79 anos)",
      alvoPAS: { min: 120, max: 129, ideal: "120-129 mmHg" },
      alvoPAD: { min: 70, max: 79, ideal: "70-79 mmHg" },
      principioALARA: false,
      recomendacaoSOAP: "Meta Pressórica Primária (ESC 2024): PAS 120-129 mmHg e PAD 70-79 mmHg, desde que bem tolerado (substitui alvo antigo conservador de 130-139 mmHg; se não tolerado, aplicar princípio ALARA visando a menor PA segura)."
    };
  }

  /**
   * Avalia o controle pressórico atual do paciente hipertenso no SOAP (ESC 2024).
   */
  function avaliarControleHAS_SOAP(pasAtual, padAtual, idade, isFragil) {
    var meta = obterMetaPressorica_ESC2024(idade, isFragil);
    var s = Number(pasAtual);
    var d = Number(padAtual);

    var pasControlada = s >= meta.alvoPAS.min && s <= meta.alvoPAS.max;
    var pasAbaixoDoAlvo = s < meta.alvoPAS.min;
    var padControlada = d <= meta.alvoPAD.max;

    var status = "Fora da Meta (Acima do alvo)";
    var condutaSugerida = "Otimizar adesão e escalonar terapia anti-hipertensiva (preferir combinações fixas em pílula única).";

    if (pasControlada && padControlada) {
      status = "Dentro da Meta ESC 2024";
      condutaSugerida = "Manter conduta farmacológica atual e reforçar mudanças no estilo de vida (MEV).";
    } else if (pasAbaixoDoAlvo && padControlada) {
      status = "Abaixo da Meta estrita (Avaliar tolerância)";
      condutaSugerida = "Se paciente assintomático e sem eventos adversos, manter tratamento. Se tontura/hipotensão ortostática, desescalonar.";
    }

    return {
      statusControle: status,
      metaAplicada: "PAS " + meta.alvoPAS.ideal + " / PAD " + meta.alvoPAD.ideal,
      condutaSugerida: condutaSugerida,
      textoEvolucao: "[HAS - Avaliação ESC 2024]: PA atual (" + s + "x" + d + " mmHg) encontra-se " + status.toLowerCase() + ". Alvo terapêutico para o perfil: " + meta.alvoPAS.ideal + "."
    };
  }

  var METAS_PRESSORICAS_SBC = {
    esc_2024_padrao: {
      meta: 'PAS 120 a 129 mmHg e PAD 70 a 79 mmHg',
      faixa_pas: '120 a 129 mmHg',
      faixa_pad: '70 a 79 mmHg',
      populacao: 'Maioria dos adultos (18 a 79 anos) em tratamento anti-hipertensivo',
      recomendacao: 'Alvo primário ESC 2024 (desde que bem tolerado; se não tolerado, aplicar princípio ALARA)'
    },
    alto_muito_alto_risco: {
      meta: 'PAS 120 a 129 mmHg e PAD 70 a 79 mmHg (< 130/80 mmHg)',
      faixa_pas: '120 a 129 mmHg',
      faixa_pad: '70 a 79 mmHg',
      populacao: 'Alto ou Muito Alto Risco Cardiovascular, Diabetes Mellitus, Doença Renal Crônica ou Lesão de Órgão-Alvo (LOA)',
      recomendacao: 'Classe I, Nível de Evidência A (Diretrizes ESC 2024 / SBC 2020/2024)'
    },
    baixo_intermediario_risco: {
      meta: 'PAS 120 a 129 mmHg (< 130/80 mmHg se bem tolerado; teto < 140/90 mmHg)',
      meta_otimizada: '120 a 129 mmHg se bem tolerado',
      faixa_pas: '120 a 129 mmHg',
      faixa_pad: '70 a 79 mmHg',
      populacao: 'Baixo ou Intermediário Risco Cardiovascular sem LOA',
      recomendacao: 'Classe I, Nível de Evidência A (ESC 2024 / SBC 2020/2024)'
    },
    idoso_higido: {
      meta: 'PAS 120 a 129 mmHg se bem tolerado (ou tão baixa quanto razoavelmente tolerada)',
      populacao: 'Idosos hígidos e independentes (65 a 79 anos)',
      recomendacao: 'Monitorar hipotensão ortostática; meta primária 120-129 mmHg se tolerado'
    },
    idoso_fragil: {
      meta: 'PAS 130 a 139 mmHg e PAD < 80 mmHg',
      populacao: 'Idosos frágeis, polimedicados ou muito idosos (>= 80 anos)',
      recomendacao: 'Princípio ALARA (As Low As Reasonably Achievable); evitar reduções excessivas com sintomas'
    }
  };

  var ESCALONAMENTO_HAS_SBC = {
    passo_1_monoterapia: {
      fase: 'Passo 1 (Monoterapia Inicial)',
      indicacao: 'HAS Estágio 1 com Baixo ou Intermediário Risco Cardiovascular, ou pacientes idosos frágeis / >= 80 anos',
      classes: ['IECA', 'BRA', 'Bloqueador dos Canais de Cálcio (BCC)', 'Diurético Tiazídico ou Tiazídico-símile'],
      esquemasSugeridos: [
        { classe: 'BRA', nome: 'Losartana Potássica', apresentacao: '50 mg comprimido', doseInicial: '50 mg VO 1x/dia pela manhã', doseAlvo: '100 mg/dia' },
        { classe: 'IECA', nome: 'Enalapril', apresentacao: '10 mg a 20 mg comprimido', doseInicial: '10 mg VO 12/12h (ou 20 mg 1x/dia)', doseAlvo: '40 mg/dia' },
        { classe: 'BCC', nome: 'Besilato de Anlodipino', apresentacao: '5 mg comprimido', doseInicial: '5 mg VO 1x/dia à noite ou manhã', doseAlvo: '10 mg/dia' },
        { classe: 'Tiazídico', nome: 'Hidroclorotiazida', apresentacao: '25 mg comprimido', doseInicial: '25 mg VO 1x/dia pela manhã', doseAlvo: '25 mg/dia (dose teto em HAS)' },
        { classe: 'Tiazídico-símile', nome: 'Clortalidona', apresentacao: '12,5 mg a 25 mg comprimido', doseInicial: '12,5 mg a 25 mg VO 1x/dia pela manhã', doseAlvo: '25 mg/dia' }
      ]
    },
    passo_2_dupla_terapia: {
      fase: 'Passo 2 (Dupla Terapia Sinérgica)',
      indicacao: 'HAS Estágio 1 com Alto/Muito Alto Risco CV OU HAS Estágio 2 ou Estágio 3 (mesmo inicial virgem de tratamento) OU falha de monoterapia otimizada',
      combinacoesPreferenciais: [
        {
          tipo: 'IECA ou BRA + BCC',
          descricao: 'Associação sinérgica de 1ª linha com maior evidência de redução de desfechos cardiovasculares; o BCC dilata a arteríola aferente e o IECA/BRA a eferente, neutralizando o edema de membros inferiores.',
          esquemaSugerido: 'Losartana 50 mg VO 1x/dia (ou 12/12h) + Besilato de Anlodipino 5 mg VO 1x/dia à noite'
        },
        {
          tipo: 'IECA ou BRA + Diurético Tiazídico/símile',
          descricao: 'Associação clássica natriurética e bloqueadora do SRAA; neutraliza a ativação do SRAA induzida pela natriurese do tiazídico.',
          esquemaSugerido: 'Losartana 50 mg VO 1x/dia (ou 12/12h) + Hidroclorotiazida 25 mg VO 1x/dia pela manhã'
        },
        {
          tipo: 'BCC + Diurético Tiazídico',
          descricao: 'Alternativa comprovada para pacientes com tosse induzida por IECA e contraindicação/intolerância a BRA.',
          esquemaSugerido: 'Besilato de Anlodipino 5 mg VO 1x/dia + Hidroclorotiazida 25 mg VO 1x/dia pela manhã'
        }
      ],
      contraindicacaoAbsoluta: 'NUNCA associar IECA + BRA (duplo bloqueio do SRAA acarreta aumento severo do risco de hipercalemia, piora aguda da função renal e hipotensão sem benefício cardiovascular - estudos ONTARGET, ALTITUDE e VA NEPHRON-D).'
    },
    passo_3_tripla_terapia: {
      fase: 'Passo 3 (Tripla Terapia Canônica)',
      indicacao: 'PA persistente acima da meta a despeito do uso de dupla terapia em doses plenas/otimizadas',
      combinacaoCanonica: 'IECA ou BRA + BCC + Diurético Tiazídico ou Tiazídico-símile',
      descricao: 'Tripé farmacológico canônico atuando nos 3 eixos fisiopatológicos fundamentais: bloqueio do SRAA, vasodilatação arteriolar periférica e natriurese/controle volêmico.',
      esquemaCanonicaPEP: [
        { nome: 'Losartana Potássica', apresentacao: '50 mg comprimido', quantidade: '60 comprimidos', via: 'USO ORAL', posologia: 'Tomar 1 comprimido VO de 12 em 12 horas (dose total 100 mg/dia)', horarios: '08h e 20h' },
        { nome: 'Besilato de Anlodipino', apresentacao: '5 mg comprimido', quantidade: '30 comprimidos', via: 'USO ORAL', posologia: 'Tomar 1 comprimido VO 1x/dia à noite (titulável até 10 mg se necessário)', horarios: '20h' },
        { nome: 'Hidroclorotiazida', apresentacao: '25 mg comprimido', quantidade: '30 comprimidos', via: 'USO ORAL', posologia: 'Tomar 1 comprimido VO 1x/dia pela manhã', horarios: '08h' }
      ]
    },
    passo_4_hipertensao_resistente: {
      fase: 'Passo 4 (Hipertensão Arterial Resistente - HAR)',
      indicacao: 'PA não controlada a despeito do uso aderente de 3 anti-hipertensivos de classes distintas em doses plenas, sendo um deles obrigatoriamente um diurético',
      farmacoQuartaLinha: {
        classe: 'Antagonista do Receptor Mineralocorticoide (Espironolactona)',
        nome: 'Espironolactona',
        apresentacao: '25 mg comprimido',
        posologia: 'Tomar 1 comprimido (25 mg) VO 1x/dia pela manhã, titulável até 50 mg/dia',
        evidencia: 'Droga de escolha primária no estudo PATHWAY-2',
        precaucoes: 'Monitorização estrita de Potássio e Creatinina; contraindicado se K+ sérico > 5,0 mEq/L ou TFG < 30 mL/min'
      },
      alternativasQuintaLinha: [
        'Betabloqueador (Carvedilol 12,5 a 25 mg 12/12h ou Bisoprolol 5 a 10 mg/dia se coronariopatia/IC ou FC > 80 bpm)',
        'Alfa-bloqueador periférico (Doxazosina 1 a 4 mg/dia à noite)',
        'Simpaticolítico de ação central (Clonidina 0,100 a 0,200 mg VO 12/12h)'
      ]
    }
  };

  var MONITORIZACAO_HAS_SBC = {
    janelaReavaliacao: '1 a 2 semanas (7 a 14 dias) após o início ou ajuste de dose de IECA, BRA, Tiazídico ou Espironolactona',
    examesObrigatorios: [
      'Creatinina sérica e Taxa de Filtração Glomerular estimada (TFG CKD-EPI)',
      'Potássio sérico (K+)'
    ],
    toleranciaCreatinina: 'Elevação de Creatinina sérica de até 30% em relação ao valor basal é esperada e clinicamente aceitável (decorre da vasodilatação da arteríola eferente e alívio da hiperfiltração intraglomerular pelos bloqueadores do SRAA, traduzindo nefroproteção a longo prazo).',
    criteriosAlarme: [
      'Elevação de Creatinina > 30% em relação ao basal: suspender temporariamente IECA/BRA, pesquisar hipovolemia/desidratação, estenose bilateral de artéria renal ou suspender AINEs.',
      'Potássio sérico (K+) > 5,5 mEq/L: reduzir dose ou suspender IECA/BRA/Espironolactona; se K+ >= 6,0 mEq/L, encaminhar com urgência para ECG e protocolo de hipercalemia.',
      'Proibição estrita de AINEs: orientar o paciente a nunca utilizar anti-inflamatórios (ibuprofeno, diclofenaco, cetoprofeno, nimesulida), pois inibem as prostaglandinas vasodilatadoras renais, anulam o efeito anti-hipertensivo e provocam insuficiência renal aguda ("triplo golpe").'
    ],
    duploBloqueioProibido: 'Contraindicação formal de associar IECA com BRA (estudos ONTARGET, ALTITUDE e VA NEPHRON-D demonstraram ausência de benefício cardiovascular com aumento drástico de eventos renais e hipercalemia).'
  };

  /**
   * Estrutura a conduta clínica ambulatorial de HAS baseada nas Diretrizes SBC 2020 / 2024.
   */
  function estruturarCondutaHas(dados) {
    dados = dados || {};

    // 1. Extração de PAS e PAD
    var pas = Number(dados.pas);
    var pad = Number(dados.pad);
    if (!pas && dados.sinaisVitais && dados.sinaisVitais.pa) {
      var partes = String(dados.sinaisVitais.pa).split(/[/xX]/);
      if (partes.length >= 2) {
        pas = parseInt(partes[0], 10);
        pad = parseInt(partes[1], 10);
      }
    }
    if (!pas && typeof dados.pa === 'string') {
      var pPa = dados.pa.split(/[/xX]/);
      if (pPa.length >= 2) {
        pas = parseInt(pPa[0], 10);
        pad = parseInt(pPa[1], 10);
      }
    }
    pas = pas || 150;
    pad = pad || 90;

    // 2. Classificação de Estágio Pressórico (SBC 2020/2024)
    var estagioNome = 'HAS Estágio 1';
    var estagioNum = 1;
    if (pas >= 180 || pad >= 110) {
      estagioNome = 'HAS Estágio 3';
      estagioNum = 3;
    } else if (pas >= 160 || pad >= 100) {
      estagioNome = 'HAS Estágio 2';
      estagioNum = 2;
    } else if (pas >= 140 || pad >= 90) {
      estagioNome = 'HAS Estágio 1';
      estagioNum = 1;
    } else if (pas >= 130 || pad >= 85) {
      estagioNome = 'Pré-Hipertensão';
      estagioNum = 0;
    } else {
      estagioNome = 'PA Normal / Ótima';
      estagioNum = -1;
    }

    // 3. Estratificação de Risco Cardiovascular
    var risco = dados.estratificacaoRisco || estratificarRiscoCardiovascular({
      idade: dados.idade !== undefined ? Number(dados.idade) : 55,
      sexo: dados.sexo || 'm',
      pas: pas,
      pad: pad,
      tabagismo: !!dados.tabagismo,
      dm: !!dados.dm,
      drc: !!dados.drc,
      iam: !!(dados.iam || dados.dcvPrevia || dados.avc),
      ldl: dados.ldl || 110
    });

    var ehAltoRisco = !!(risco.nivel === 'ALTO' || risco.nivel === 'MUITO ALTO' || dados.dm || dados.drc || dados.dcvPrevia);

    // 4. Definição da Meta Pressórica Rigorosa por Risco (SBC 2020/2024)
    var metaPressorica = ehAltoRisco
      ? METAS_PRESSORICAS_SBC.alto_muito_alto_risco.meta
      : METAS_PRESSORICAS_SBC.baixo_intermediario_risco.meta;

    var metaTexto = ehAltoRisco
      ? '< 130/80 mmHg (recomendação forte da SBC para alto/muito alto risco CV, DM, DRC ou LOA)'
      : '< 140/90 mmHg (alvo primário; almejar < 130/80 mmHg se bem tolerado)';

    if (dados.idade && Number(dados.idade) >= 80) {
      metaPressorica = METAS_PRESSORICAS_SBC.idoso_fragil.meta;
      metaTexto = METAS_PRESSORICAS_SBC.idoso_fragil.meta + ' (idoso >= 80 anos com titulação gradual para evitar hipotensão ortostática e curva J)';
    }

    // 5. Determinação do Passo de Escalonamento Farmacológico
    var passo = Number(dados.passo);
    if (!passo) {
      var esquema = String(dados.esquema || '').toLowerCase();
      if (esquema === 'monoterapia' || esquema === 'passo1' || esquema === '1') passo = 1;
      else if (esquema === 'dupla' || esquema === 'passo2' || esquema === '2') passo = 2;
      else if (esquema === 'tripla' || esquema === 'passo3' || esquema === '3') passo = 3;
      else if (esquema === 'resistente' || esquema === 'har' || esquema === 'passo4' || esquema === '4') passo = 4;
    }

    if (!passo) {
      // Detecção automática inteligente baseada em medicações atuais e gravidade
      var medsTexto = Array.isArray(dados.medicacoesUso) ? dados.medicacoesUso.join(' ') : String(dados.medicacoesUso || '');
      var temIecaBra = /losartan|enalapril|ramipril|valsartan|candesartan|captopril/i.test(medsTexto);
      var temBcc = /anlodipin|amlodipin|nifedipin|lecanidipin/i.test(medsTexto);
      var temTiaz = /hidroclorotiazid|hctz|clortalidon|indapamid/i.test(medsTexto);
      var classesEmUso = (temIecaBra ? 1 : 0) + (temBcc ? 1 : 0) + (temTiaz ? 1 : 0);

      if (classesEmUso >= 3 || dados.har) {
        passo = 4; // HAR
      } else if (classesEmUso === 2 || dados.triplaTerapia) {
        passo = 3; // Tripla Terapia
      } else if (estagioNum >= 2 || (estagioNum === 1 && ehAltoRisco) || classesEmUso === 1) {
        passo = 2; // Dupla Terapia
      } else if (estagioNum === 1) {
        passo = 1; // Monoterapia
      } else {
        passo = 1;
      }
    }

    // 6. Montagem da Prescrição Farmacológica e Diretriz
    var prescricaoPEP = [];
    var escalonamentoDetalhe = '';

    if (passo === 1) {
      escalonamentoDetalhe = 'Passo 1 (Monoterapia Inicial SBC 2020/2024): Indicado para HAS Estágio 1 de Risco Baixo/Intermediário ou idosos frágeis/muito idosos (>= 80a). Iniciar fármaco de 1ª linha em monoterapia.';
      if (dados.opcaoMonoterapia === 'ieca' || dados.preferenciaIeca) {
        prescricaoPEP.push({
          nome: 'Maleato de Enalapril',
          apresentacao: '10 mg comprimido',
          quantidade: '60 comprimidos',
          via: 'USO ORAL',
          posologia: 'Tomar 1 comprimido VO de 12 em 12 horas (dose inicial: 20 mg/dia).',
          horarios: '08h e 20h',
          duracao: 'Uso contínuo'
        });
      } else if (dados.opcaoMonoterapia === 'bcc') {
        prescricaoPEP.push({
          nome: 'Besilato de Anlodipino',
          apresentacao: '5 mg comprimido',
          quantidade: '30 comprimidos',
          via: 'USO ORAL',
          posologia: 'Tomar 1 comprimido VO 1x/dia à noite.',
          horarios: '20h',
          duracao: 'Uso contínuo'
        });
      } else if (dados.opcaoMonoterapia === 'tiazidico') {
        prescricaoPEP.push({
          nome: 'Hidroclorotiazida',
          apresentacao: '25 mg comprimido',
          quantidade: '30 comprimidos',
          via: 'USO ORAL',
          posologia: 'Tomar 1 comprimido VO 1x/dia pela manhã.',
          horarios: '08h',
          duracao: 'Uso contínuo'
        });
      } else {
        prescricaoPEP.push({
          nome: 'Losartana Potássica',
          apresentacao: '50 mg comprimido',
          quantidade: '30 comprimidos',
          via: 'USO ORAL',
          posologia: 'Tomar 1 comprimido VO 1x/dia pela manhã.',
          horarios: '08h',
          duracao: 'Uso contínuo'
        });
      }
    } else if (passo === 2) {
      var opcaoDupla = String(dados.opcaoDupla || '').toLowerCase();
      var prefBcc = opcaoDupla === 'bcc' || opcaoDupla === 'anlodipino' || opcaoDupla === 'ieca_bcc' || opcaoDupla === 'bra_bcc';
      escalonamentoDetalhe = 'Passo 2 (Dupla Terapia Sinérgica SBC 2020/2024): Indicado para HAS Estágio 2 ou 3 (mesmo inicial) OU HAS Estágio 1 de Alto/Muito Alto Risco CV OU falha de monoterapia. Associação sinérgica de 1ª linha (IECA/BRA + BCC ou IECA/BRA + Tiazídico). Bloqueio duplo IECA + BRA é contraindicado formalmente.';

      if (prefBcc) {
        prescricaoPEP.push({
          nome: 'Losartana Potássica',
          apresentacao: '50 mg comprimido',
          quantidade: '60 comprimidos',
          via: 'USO ORAL',
          posologia: 'Tomar 1 comprimido VO de 12 em 12 horas (dose diária: 100 mg).',
          horarios: '08h e 20h',
          duracao: 'Uso contínuo'
        });
        prescricaoPEP.push({
          nome: 'Besilato de Anlodipino',
          apresentacao: '5 mg comprimido',
          quantidade: '30 comprimidos',
          via: 'USO ORAL',
          posologia: 'Tomar 1 comprimido VO 1x/dia à noite.',
          horarios: '20h',
          duracao: 'Uso contínuo'
        });
      } else if (opcaoDupla === 'bcc_tiazidico') {
        prescricaoPEP.push({
          nome: 'Besilato de Anlodipino',
          apresentacao: '5 mg comprimido',
          quantidade: '30 comprimidos',
          via: 'USO ORAL',
          posologia: 'Tomar 1 comprimido VO 1x/dia à noite.',
          horarios: '20h',
          duracao: 'Uso contínuo'
        });
        prescricaoPEP.push({
          nome: 'Hidroclorotiazida',
          apresentacao: '25 mg comprimido',
          quantidade: '30 comprimidos',
          via: 'USO ORAL',
          posologia: 'Tomar 1 comprimido VO 1x/dia pela manhã.',
          horarios: '08h',
          duracao: 'Uso contínuo'
        });
      } else {
        // Padrão clássico: BRA + Tiazídico
        prescricaoPEP.push({
          nome: 'Losartana Potássica',
          apresentacao: '50 mg comprimido',
          quantidade: '60 comprimidos',
          via: 'USO ORAL',
          posologia: 'Tomar 1 comprimido VO de 12 em 12 horas (dose diária: 100 mg).',
          horarios: '08h e 20h',
          duracao: 'Uso contínuo'
        });
        prescricaoPEP.push({
          nome: 'Hidroclorotiazida',
          apresentacao: '25 mg comprimido',
          quantidade: '30 comprimidos',
          via: 'USO ORAL',
          posologia: 'Tomar 1 comprimido VO 1x/dia pela manhã.',
          horarios: '08h',
          duracao: 'Uso contínuo'
        });
      }
    } else if (passo === 3) {
      escalonamentoDetalhe = 'Passo 3 (Tripla Terapia Canônica SBC 2020/2024): Tripé obrigatório completo (BRA/IECA + BCC + Tiazídico) em doses plenas/otimizadas para alcance da meta pressórica rigorosa (< 130/80 mmHg em alto risco ou < 140/90 mmHg). Atuação sinérgica nos 3 eixos fisiopatológicos: bloqueio do SRAA, vasodilatação arteriolar periférica e natriurese.';

      var nomeBloqueadorSraa = (dados.preferenciaIeca) ? 'Maleato de Enalapril' : 'Losartana Potássica';
      var apresBloqueadorSraa = (dados.preferenciaIeca) ? '20 mg comprimido' : '50 mg comprimido';
      var posoBloqueadorSraa = (dados.preferenciaIeca)
        ? 'Tomar 1 comprimido VO de 12 em 12 horas (dose plena: 40 mg/dia).'
        : 'Tomar 1 comprimido VO de 12 em 12 horas (dose plena: 100 mg/dia).';

      prescricaoPEP.push({
        nome: nomeBloqueadorSraa,
        apresentacao: apresBloqueadorSraa,
        quantidade: '60 comprimidos',
        via: 'USO ORAL',
        posologia: posoBloqueadorSraa,
        horarios: '08h e 20h',
        duracao: 'Uso contínuo'
      });

      prescricaoPEP.push({
        nome: 'Besilato de Anlodipino',
        apresentacao: (dados.dosePlenaAnlodipino ? '10 mg comprimido' : '5 mg comprimido'),
        quantidade: '30 comprimidos',
        via: 'USO ORAL',
        posologia: (dados.dosePlenaAnlodipino ? 'Tomar 1 comprimido VO 1x/dia à noite (dose plena: 10 mg/dia).' : 'Tomar 1 comprimido VO 1x/dia à noite (titulável até 10 mg/dia se PA mantida acima do alvo).'),
        horarios: '20h',
        duracao: 'Uso contínuo'
      });

      var nomeDiuretico = (dados.preferenciaClortalidona) ? 'Clortalidona' : 'Hidroclorotiazida';
      var apresDiuretico = (dados.preferenciaClortalidona) ? '25 mg comprimido' : '25 mg comprimido';
      prescricaoPEP.push({
        nome: nomeDiuretico,
        apresentacao: apresDiuretico,
        quantidade: '30 comprimidos',
        via: 'USO ORAL',
        posologia: 'Tomar 1 comprimido VO 1x/dia pela manhã.',
        horarios: '08h',
        duracao: 'Uso contínuo'
      });
    } else {
      // Passo 4 (HAR)
      escalonamentoDetalhe = 'Passo 4 (Hipertensão Arterial Resistente - HAR / PATHWAY-2): PA acima da meta a despeito de 3 fármacos sinérgicos de classes distintas em doses plenas (sendo 1 diurético). Adição obrigatória de Espironolactona 25 a 50 mg/dia como 4º fármaco.';
      prescricaoPEP.push({
        nome: 'Losartana Potássica',
        apresentacao: '50 mg comprimido',
        quantidade: '60 comprimidos',
        via: 'USO ORAL',
        posologia: 'Tomar 1 comprimido VO de 12 em 12 horas (dose plena: 100 mg/dia).',
        horarios: '08h e 20h',
        duracao: 'Uso contínuo'
      });
      prescricaoPEP.push({
        nome: 'Besilato de Anlodipino',
        apresentacao: '10 mg comprimido',
        quantidade: '30 comprimidos',
        via: 'USO ORAL',
        posologia: 'Tomar 1 comprimido VO 1x/dia à noite (dose plena: 10 mg/dia).',
        horarios: '20h',
        duracao: 'Uso contínuo'
      });
      prescricaoPEP.push({
        nome: 'Hidroclorotiazida',
        apresentacao: '25 mg comprimido',
        quantidade: '30 comprimidos',
        via: 'USO ORAL',
        posologia: 'Tomar 1 comprimido VO 1x/dia pela manhã.',
        horarios: '08h',
        duracao: 'Uso contínuo'
      });
      prescricaoPEP.push({
        nome: 'Espironolactona',
        apresentacao: '25 mg comprimido',
        quantidade: '30 comprimidos',
        via: 'USO ORAL',
        posologia: 'Tomar 1 comprimido VO 1x/dia pela manhã (titulável até 50 mg/dia se K+ < 5,0 mEq/L; checar K+ e Cr em 7 a 14 dias).',
        horarios: '08h',
        duracao: 'Uso contínuo'
      });
    }

    // 7. Monitorização Laboratorial e Salvaguardas
    var monitorizacaoTexto = [
      '• Janela de Avaliação: Dosar Creatinina sérica e Potássio sérico (K+) em 1 a 2 semanas (7 a 14 dias) após início ou titulação de doses.',
      '• Tolerância de Creatinina: Elevação de até 30% em relação ao valor basal é esperada e clinicamente tolerável (vasodilatação eferente e alívio da hiperfiltração intraglomerular pelos bloqueadores do SRAA, traduzindo nefroproteção a longo prazo).',
      '• Alerta de Creatinina > 30%: Se elevação exceder 30%, suspender temporariamente IECA/BRA, pesquisar hipovolemia/desidratação, descartar uso de AINEs e investigar estenose bilateral de artéria renal.',
      '• Manejo de Potássio (K+): Se K+ > 5,5 mEq/L, reduzir dose ou suspender IECA/BRA/Espironolactona; se K+ >= 6,0 mEq/L, encaminhar com urgência para ECG e protocolo de hipercalemia.',
      '• Contraindicação Sentinela a AINEs: Orientar formalmente o paciente a NUNCA utilizar anti-inflamatórios (ibuprofeno, cetoprofeno, diclofenaco, nimesulida) pelo risco de injúria renal aguda ("triplo golpe") e abolição do efeito hipotensor.',
      '• Bloqueio Absoluto: Proibida a associação concomitante de IECA com BRA (estudos ONTARGET, ALTITUDE e VA NEPHRON-D demonstraram nefrotoxicidade e hipercalemia sem benefício).'
    ].join('\n');

    // 8. Exames Complementares Solicitados (Rastreio de LOA)
    var examesSolicitados = [
      'Creatinina sérica e Taxa de Filtração Glomerular (TFG CKD-EPI)',
      'Potássio sérico (K+) e Sódio sérico',
      'EAS / Urina 1 e Relação Albuminúria/Creatinúria (RAC) em amostra isolada',
      'Glicemia de jejum e Hemoglobina Glicada (HbA1c)',
      'Perfil lipídico completo (Colesterol Total, HDL, LDL, Triglicerídeos)',
      'Ácido úrico sérico',
      'Eletrocardiograma de repouso de 12 derivações (rastreio de Sobrecarga Ventricular Esquerda pelos índices de Sokolow-Lyon e Cornell)'
    ];

    // 9. Medidas de Estilo de Vida (MEV)
    var mev = [
      'Dieta DASH rica em vegetais, frutas e fibras, com restrição severa de sódio (< 2g sódio/dia ou < 5g sal de cozinha / dia).',
      'Atividade física aeróbica regular de pelo menos 150 a 300 minutos/semana (ex: caminhada 30 min, 5 vezes por semana).',
      'Redução ponderal com meta de perda de 5% a 10% do peso corporal se IMC > 25 kg/m².',
      'Cessação total do tabagismo e abstinência/moderação rigorosa de bebidas alcoólicas.',
      'Automonitorização Residencial da Pressão Arterial (MRPA: 2 aferições pela manhã e 2 à noite por 5 dias consecutivos).'
    ];

    // 10. Sinais de Alarme Sentinela
    var sinaisAlarme = [
      'Procurar Pronto-Socorro / UPA imediatamente se apresentar dor torácica opressiva, falta de ar súbita, perda de força motora ou sensibilidade unilateral, alteração visual aguda, cefaleia em trovoada súbita ou PAS >= 180 ou PAD >= 110-120 mmHg com sintomas agudos.'
    ];

    // 11. Prazo de Retorno Ambulatorial
    var retornoDias = 14; // Janela de 1 a 2 semanas para controle de K+/Cr e resposta pressórica

    // 12. Geração de Textos Prontos para PEP
    var linhasRxPEP = ['[USO ORAL]'];
    prescricaoPEP.forEach(function(item, idx) {
      linhasRxPEP.push((idx + 1) + ') ' + item.nome + ' ' + (item.apresentacao || '') + ' -------------------- ' + (item.quantidade || 'Uso contínuo'));
      var pStr = '   Tomar ' + item.posologia;
      if (item.horarios) pStr += ' (Horários: ' + item.horarios + ')';
      if (item.duracao) pStr += ' por ' + item.duracao + '.';
      linhasRxPEP.push(pStr);
    });
    var textoPrescricaoPEP = linhasRxPEP.join('\n');

    var textoCondutaPEP = [
      '======================================================================',
      '        CONDUTA AMBULATORIAL DE HIPERTENSÃO ARTERIAL (SBC 2020 / 2024)',
      '======================================================================',
      '• Diagnóstico & Estadiamento: ' + estagioNome + ' (PA aferida: ' + pas + '/' + pad + ' mmHg).',
      '• Estratificação de Risco Cardiovascular: ' + (risco.corBadge || '') + ' ' + risco.nivel + ' (' + risco.justificativa + ').',
      '• Meta Pressórica Alvo (SBC 2020/2024): ' + metaTexto + ' [Alvo numérico: ' + metaPressorica + '].',
      '• Estratégia de Escalonamento: ' + escalonamentoDetalhe,
      '',
      '[PRESCRIÇÃO MEDICAMENTOSA SUGERIDA - REMUME / FARMÁCIA POPULAR]',
      textoPrescricaoPEP,
      '',
      '[PROTOCOLO DE MONITORIZAÇÃO DE K+ E CREATININA (7 A 14 DIAS)]',
      monitorizacaoTexto,
      '',
      '[EXAMES COMPLEMENTARES DE RASTREIO DE LESÃO DE ÓRGÃO-ALVO (LOA)]',
      examesSolicitados.map(function(e) { return '• ' + e; }).join('\n'),
      '',
      '[ORIENTAÇÕES DE ESTILO DE VIDA (MEV)]',
      mev.map(function(m) { return '• ' + m; }).join('\n'),
      '',
      '[SINAIS DE ALARME PARA PRONTO-SOCORRO]',
      sinaisAlarme.map(function(s) { return '• ' + s; }).join('\n'),
      '',
      '📅 Retorno ambulatorial agendado em ' + retornoDias + ' dias (1 a 2 semanas para controle de K+/Cr e titulação).',
      '======================================================================'
    ].join('\n');

    var classificacaoESC = classificarPA_ESC2024(pas, pad);
    var metaESC = obterMetaPressorica_ESC2024(dados.idade !== undefined ? Number(dados.idade) : 55, !!dados.fragil);
    var controleESC = avaliarControleHAS_SOAP(pas, pad, dados.idade !== undefined ? Number(dados.idade) : 55, !!dados.fragil);

    return {
      pas: pas,
      pad: pad,
      estagio: estagioNome,
      estagioNumero: estagioNum,
      riscoCardiovascular: risco.nivel,
      ehAltoRisco: ehAltoRisco,
      metaPressorica: metaPressorica,
      metaPressoricaTexto: metaTexto,
      classificacaoESC2024: classificacaoESC,
      metaESC2024: metaESC,
      avaliacaoControleESC2024: controleESC,
      passo: passo,
      escalonamentoDetalhe: escalonamentoDetalhe,
      prescricaoPEP: prescricaoPEP,
      textoPrescricaoPEP: textoPrescricaoPEP,
      textoCondutaPEP: textoCondutaPEP,
      monitorizacao: monitorizacaoTexto,
      monitorizacaoKCr: MONITORIZACAO_HAS_SBC,
      examesSolicitados: examesSolicitados,
      mev: mev,
      sinaisAlarme: sinaisAlarme,
      retornoDias: retornoDias
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
    var qp = dados.queixaPrincipal || dados.qp || 'Queixa principal não informada';
    var tempoEvolucao = dados.tempoEvolucao || dados.tempo || 'Tempo de evolução não informado';
    var hda = dados.hda || 'História da doença atual não informada.';
    var medUso = dados.medicacoesUso || dados.medicacoes || 'Não informado';
    var alergias = dados.alergias || 'Não informado';
    var antecedentes = dados.antecedentes || 'Não informado';
    var habitos = dados.habitos || 'Não informado';

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

    var textoSv = linhasSv.length ? linhasSv.join(' | ') : 'Sinais vitais não informados.';

    var textoEf = dados.exameFisicoTexto || '';
    if (!textoEf && dados.modeloExameFisico && MODELOS_EXAME_FISICO[dados.modeloExameFisico]) {
      textoEf = MODELOS_EXAME_FISICO[dados.modeloExameFisico].texto;
    } else if (!textoEf) {
      textoEf = 'Exame físico não informado.';
    }

    var blocoO = '• Sinais Vitais: ' + textoSv + '\n' + textoEf;

    // A - AVALIAÇÃO
    var listaDiag = [];
    if (Array.isArray(dados.diagnosticos) && dados.diagnosticos.length) {
      listaDiag = dados.diagnosticos;
    } else if (dados.diagnosticoPrincipal) {
      listaDiag = [dados.diagnosticoPrincipal];
    } else {
      listaDiag = ['Hipótese diagnóstica a definir com os dados clínicos disponíveis.'];
    }

    var textoAvaliacao = listaDiag.map(function(d, i) {
      return (i + 1) + '. ' + d;
    }).join('\n');

    // Detecção se o caso envolve Hipertensão Arterial Sistêmica
    var condutaHas = null;
    var ehHas = !!(dados.condutaHas || dados.hipertensao || dados.has ||
      (Array.isArray(dados.diagnosticos) && dados.diagnosticos.some(function(d) { return /hipertens|has\b|i10/i.test(d); })) ||
      (typeof dados.diagnosticoPrincipal === 'string' && /hipertens|has\b|i10/i.test(dados.diagnosticoPrincipal)) ||
      (typeof dados.queixaPrincipal === 'string' && /hipertens|press[aã]o\s+alta|has\b/i.test(dados.queixaPrincipal)));

    if (ehHas) {
      condutaHas = (typeof dados.condutaHas === 'object' && dados.condutaHas && dados.condutaHas.metaPressorica)
        ? dados.condutaHas
        : estruturarCondutaHas(dados);
    }

    if (dados.estratificacaoRisco) {
      var r = dados.estratificacaoRisco;
      textoAvaliacao += '\n\n• Estratificação de Risco Cardiovascular: ' + (r.corBadge || '') + ' Risco ' + r.nivel +
        ' (' + r.justificativa + ')\n  Meta Pressórica: ' + r.meta_pa + ' | Meta LDL: ' + r.meta_ldl;
    } else if (condutaHas && condutaHas.riscoCardiovascular) {
      textoAvaliacao += '\n\n• Estratificação de Risco Cardiovascular: Risco ' + condutaHas.riscoCardiovascular +
        '\n  Meta Pressórica (SBC 2020/2024): ' + condutaHas.metaPressoricaTexto + ' [Alvo: ' + condutaHas.metaPressorica + ']';
    }

    // P - PLANO
    var planoLinhas = [], prescricaoLinhas = [], examesLinhas = [], orientacoesLinhas = [];

    // Metas Pressóricas e Escalonamento SBC 2020/2024 se HAS
    if (condutaHas) {
      orientacoesLinhas.push('🎯 Metas Pressóricas & Escalonamento (SBC 2020/2024):');
      orientacoesLinhas.push('  • Meta Alvo: ' + condutaHas.metaPressoricaTexto + ' [Alvo numérico: ' + condutaHas.metaPressorica + ']');
      orientacoesLinhas.push('  • Estratégia de Escalonamento: ' + condutaHas.escalonamentoDetalhe);
    }

    // 1. Prescrição Farmacológica
    var listaPrescricao = dados.prescricaoMedicamentosa;
    if ((!listaPrescricao || !listaPrescricao.length) && condutaHas && condutaHas.prescricaoPEP && condutaHas.prescricaoPEP.length) {
      listaPrescricao = condutaHas.prescricaoPEP;
    }

    if (listaPrescricao && listaPrescricao.length) {
      prescricaoLinhas.push('💊 Prescrição Medicamentosa (REMUME / Farmácia Popular):');
      var itensMed = Array.isArray(listaPrescricao) ? listaPrescricao : [listaPrescricao];
      itensMed.forEach(function(m, idx) {
        if (typeof m === 'string') {
          prescricaoLinhas.push('  ' + (idx + 1) + ') ' + m);
        } else if (m && m.nome) {
          var desc = m.nome + ' ' + (m.apresentacao || '') + ' --- ' + (m.quantidade || 'Uso contínuo');
          desc += '\n     Posologia: ' + (m.posologia || '') + (m.horarios ? ' (Horários: ' + m.horarios + ')' : '');
          prescricaoLinhas.push('  ' + (idx + 1) + ') ' + desc);
        }
      });
    }

    // Protocolo de Monitorização K+/Cr após 2 semanas se HAS
    if (condutaHas) {
      examesLinhas.push('🧪 Protocolo de Monitorização Laboratorial (K+ e Creatinina após 2 semanas):');
      examesLinhas.push('  • Janela de Avaliação: Dosar Creatinina sérica (TFG CKD-EPI) e Potássio sérico (K+) em 1 a 2 semanas (7 a 14 dias).');
      orientacoesLinhas.push('  • Tolerância de Creatinina: Elevação de até 30% da Cr em relação ao basal é esperada e aceitável (vasodilatação eferente protetora). Suspender IECA/BRA e investigar se elevação > 30%.');
      orientacoesLinhas.push('  • Manejo de Potássio: Reduzir dose ou suspender IECA/BRA/Espironolactona se K+ > 5,5 mEq/L; emergência com ECG se K+ >= 6,0 mEq/L.');
      orientacoesLinhas.push('  • Bloqueio Sentinela: Contraindicação formal a AINEs (prevenção do triplo golpe renal) e proibição absoluta de associar IECA + BRA.');
    }

    // 2. Orientações Não Farmacológicas (MEV)
    var mev = dados.mev || (condutaHas ? condutaHas.mev : []);
    if (Array.isArray(mev) && mev.length) {
      orientacoesLinhas.push('🥗 Orientações Não Farmacológicas / Mudanças de Estilo de Vida (MEV):');
      mev.forEach(function(item) {
        orientacoesLinhas.push('  • ' + item);
      });
    }

    // 3. Exames Solicitados
    var exames = dados.examesSolicitados || (condutaHas ? condutaHas.examesSolicitados : null);
    if (exames && exames.length) {
      examesLinhas.push('🔬 Exames Complementares Solicitados:');
      var exList = Array.isArray(exames) ? exames : [exames];
      exList.forEach(function(ex) {
        examesLinhas.push('  • ' + ex);
      });
    }

    // 4. Sinais de Alarme
    var alarmes = dados.sinaisAlarme || (condutaHas ? condutaHas.sinaisAlarme : []);
    if (Array.isArray(alarmes) && alarmes.length) {
      orientacoesLinhas.push('🚨 Sinais de Alarme para Procura de Pronto-Socorro:');
      alarmes.forEach(function(al) {
        orientacoesLinhas.push('  • ' + al);
      });
    }

    // 5. Retorno
    var diasRetorno = dados.retornoDias ? (dados.retornoDias + ' dias') : (condutaHas ? (condutaHas.retornoDias + ' dias (1 a 2 semanas para controle de K+/Cr e titulação)') : '30 a 60 dias');
    orientacoesLinhas.push('📅 Retorno Ambulatorial: Reavaliação clínica e checagem de exames em ' + diasRetorno + '.');

    planoLinhas.push('Prescrição Pronta Copy-Paste (UBS/REMUME vs. Urgência/Enfermaria):');
    planoLinhas.push(prescricaoLinhas.length ? prescricaoLinhas.join('\n') : 'Prescrição não informada; conferir dados de segurança antes de prescrever.');
    planoLinhas.push('\nExames que mudam conduta imediata:');
    planoLinhas.push(examesLinhas.length ? examesLinhas.join('\n') : 'Nenhum exame imediato indicado pelos dados informados.');
    planoLinhas.push('\nOrientações/Sinais de Alarme:');
    planoLinhas.push(orientacoesLinhas.join('\n'));
    var blocoP = planoLinhas.join('\n');

    // Texto integral consolidado
    var textoProntuario = [
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
      blocoP
    ].join('\n');

    return {
      subjetivo: blocoS,
      objetivo: blocoO,
      avaliacao: textoAvaliacao,
      plano: blocoP,
      textoProntuario: textoProntuario,
      condutaHas: condutaHas
    };
  }

  function _resolverAssinaturaContextoSoap(dados) {
    dados = dados || {};
    var ctx = (typeof ConfigService !== 'undefined' && typeof ConfigService.getContextoClinico === 'function')
      ? ConfigService.getContextoClinico(dados.chatId)
      : null;
    var prof = (ctx && ctx.profissional) ? ctx.profissional : {};
    var loc = (ctx && ctx.localidade) ? ctx.localidade : {};
    var unid = (ctx && ctx.unidade_assistencial) ? ctx.unidade_assistencial : {};

    var papel = dados.papel || prof.papel || 'MEDICO_CRM';
    var ehInterno = (papel === 'INTERNO_ACADEMICO' || papel === 'INTERNO');
    var prefixo = prof.prefixo || 'Dr(a).';
    var nomeCarimbo = dados.medicoNome || prof.nome_completo_carimbo || prof.nome_chamada || '';
    if (nomeCarimbo && !/^dr(a)?\.?\s/i.test(nomeCarimbo)) {
      nomeCarimbo = prefixo + ' ' + nomeCarimbo;
    }
    if (!nomeCarimbo) nomeCarimbo = 'Médico(a) Assistente';

    var regBruto = String(prof.registro_conselho || '').trim();
    var crmFormatado = 'CRM';
    if (regBruto) {
      crmFormatado = /^CRM/i.test(regBruto)
        ? regBruto
        : ('CRM/' + (prof.uf_conselho || loc.uf || 'BR') + ' ' + regBruto);
    }
    var crmStr = dados.medicoCrm || crmFormatado;
    var munNome = loc.municipio_nome && loc.municipio_nome !== 'Brasil (Padrão Nacional)'
      ? (loc.municipio_nome + (loc.uf && loc.uf !== 'BR' ? ' - ' + loc.uf : ''))
      : 'Localidade';
    var cidade = dados.cidade || munNome;
    var unidadeSaude = dados.unidadeSaude || unid.nome_unidade || 'Unidade de Saúde / SUS';
    var regulacao = dados.sistemaRegulacao || unid.sistema_regulacao || 'SISREG';

    return {
      ehInterno: ehInterno,
      medico: nomeCarimbo,
      crm: crmStr,
      cidade: cidade,
      unidadeSaude: unidadeSaude,
      regulacao: regulacao
    };
  }

  // 7. EXPORTAÇÃO LIMPA DE RECEITA MÉDICA AMBULATORIAL (TEXTO PURO PARA PEP)
  function exportarReceitaTexto(dados) {
    dados = dados || {};
    var infoAss = _resolverAssinaturaContextoSoap(dados);
    var paciente = dados.pacienteNome || dados.paciente || 'Ao Portador';
    var dataStr = dados.data || new Date().toLocaleDateString('pt-BR');

    var linhas = [
      '======================================================================',
      '                       RECEITUÁRIO MÉDICO AMBULATORIAL                ',
      '======================================================================',
      'Unidade: ' + infoAss.unidadeSaude + ' | Local: ' + infoAss.cidade,
      'Paciente: ' + paciente,
      'Data: ' + dataStr,
      '----------------------------------------------------------------------'
    ];

    var itens = dados.itens || dados.medicamentos || dados.prescricaoMedicamentosa || [];
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
            var poso = /^tomar\s/i.test(m.posologia) ? ('   ' + m.posologia) : ('   Tomar ' + m.posologia);
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
    linhas.push('Local e Data: ' + infoAss.cidade + ', ' + dataStr);
    if (infoAss.ehInterno && !dados.medicoNome) {
      linhas.push('__________________________________________________________');
      linhas.push('Assinatura e Carimbo do(a) Médico(a) Responsável');
    } else {
      linhas.push('Assinatura e Carimbo Médico: ' + infoAss.medico + ' · ' + infoAss.crm);
    }

    return linhas.join('\n');
  }

  // 8. EXPORTAÇÃO LIMPA DE ATESTADO MÉDICO (CONFORME RESOLUÇÕES CFM 1.658/2002 E 1.851/2008)
  function exportarAtestadoTexto(dados) {
    dados = dados || {};
    var infoAss = _resolverAssinaturaContextoSoap(dados);
    var paciente = dados.pacienteNome || dados.paciente || '[Nome do Paciente]';
    var doc = dados.pacienteDoc || dados.doc || '[Documento de Identidade/CPF]';
    var dias = parseInt(dados.dias || 1, 10);
    var diasExtenso = converterNumeroPorExtenso(dias);
    var aPartirDe = dados.aPartirDe || dados.data || new Date().toLocaleDateString('pt-BR');
    var finalidade = dados.finalidade || 'repouso e recuperação clínica, necessitando de afastamento de suas atividades laborais e escolares';
    var cidade = infoAss.cidade;
    var dataStr = dados.data || new Date().toLocaleDateString('pt-BR');

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
    if (!infoAss.ehInterno || dados.medicoNome) {
      linhas.push(infoAss.medico + ' · ' + infoAss.crm);
    }
    linhas.push('======================================================================');

    return linhas.join('\n');
  }

  // 9. EXPORTAÇÃO DE ENCAMINHAMENTO / REFERÊNCIA AMBULATORIAL (SISREG / CROSS)
  function exportarEncaminhamentoTexto(dados) {
    dados = dados || {};
    var infoAss = _resolverAssinaturaContextoSoap(dados);
    var paciente = dados.pacienteNome || dados.paciente || '[Nome do Paciente]';
    var dataStr = dados.data || new Date().toLocaleDateString('pt-BR');
    var especialidade = dados.especialidade || '[Especialidade Destino]';
    var motivo = dados.motivo || '[Motivo do Encaminhamento]';
    var cid = dados.cid || '[CID-10]';
    var prioridade = dados.prioridade || 'Eletiva / Regulada';
    var medico = infoAss.medico;
    var crm = infoAss.crm;

    var linhas = [
      '======================================================================',
      '         GUIA DE ENCAMINHAMENTO / REFERÊNCIA AMBULATORIAL (' + infoAss.regulacao + ')     ',
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

    // 1. Separar sinais vitais do exame geral se estiverem na mesma linha (evitando duplicações de Geral:)
    t = t.replace(/(\b(?:T:\s*[^.]+|\d+°C|ar\s+ambiente|mmHg|\bbpm|\birpm|\b%)\s*\.)\s*(Bom\s+estado\s+geral|BEG|Lúcido|LOTE|Corado)\b/gi, '$1\nGeral: $2');
    t = t.replace(/(^|\n)(?:Geral:\s*)*(Bom\s+estado\s+geral\b)/gi, '$1Geral: $2');
    t = t.replace(/(?:Geral:\s*){2,}/gi, 'Geral: ');

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

  // A suficiência depende do relato confirmado, nunca de achados inferidos pela IA.
  function avaliarSuficienciaAnamnese(contextoAcumulado, historicoSessao) {
    var texto = String(contextoAcumulado || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    var gineco = /gesta|gravidez|gravida|obstetric|ginecolog|sangramento vaginal|dor pelvica|amenorreia|corrimento vaginal/.test(texto);
    var agudo = /dor toracica|dor no peito|dispneia|falta de ar|tosse|febre|dor abdominal|sangramento|gesta|gravidez|gravida|cefaleia intensa/.test(texto);
    var alarmeRelatado = /nega\s+sinais? de alarme|sem\s+sinais? de alarme/.test(texto);
    if (/dor toracica|dor no peito/.test(texto)) alarmeRelatado = alarmeRelatado || /(nega|sem).{0,30}(dispneia|sudorese|sincope|irradiacao)|\b(dispneia|sudorese|sincope|irradiacao)\b/.test(texto);
    else if (/tosse|falta de ar|dispneia/.test(texto)) alarmeRelatado = alarmeRelatado || /(nega|sem).{0,30}(dispneia|falta de ar|febre|hemoptise)|\b(dispneia|falta de ar|hemoptise|febre)\b/.test(texto);
    else if (gineco) alarmeRelatado = alarmeRelatado || /(nega|sem).{0,30}(sangramento|dor intensa|sincope)|\b(sangramento|sincope|dor intensa)\b/.test(texto);
    else alarmeRelatado = alarmeRelatado || /(nega|sem).{0,30}(febre|dispneia|sangramento|sincope)|\b(febre|dispneia|sangramento|sincope)\b/.test(texto);
    var eixos = {
      historia: /paciente|dor|tosse|febre|sangramento|queixa|dispneia/.test(texto) && /\bha\s+\d|\bdesde\b|\binicio\b|\bevolucao\b|\bhoje\b|\bontem\b|\bsemanas?\b|\bdias?\b/.test(texto),
      alarmes: alarmeRelatado,
      seguranca: /(alergia|alergico)/.test(texto) && /(comorbidade|antecedente|diabet|hipertens|sem doencas)/.test(texto) && /(medicac|medicamento|remedio|farmaco|uso continuo)/.test(texto) && !/(alergia|comorbidade|medicac|medicamento).{0,20}(desconhecid|nao informad|nao sabe)/.test(texto),
      gineco: !gineco || (/\bg\s*\d+\s*p\s*\d+\s*a\s*\d+|\bgesta\s*\d+/.test(texto) && /\bdum\s*[:=]?\s*\d|idade gestacional\s*[:=]?\s*\d|\big\s*[:=]?\s*\d/.test(texto)),
      objetivo: !agudo || /\bpa\s*[:=]?\s*\d|\bfc\s*[:=]?\s*\d|spo2\s*[:=]?\s*\d|saturac.{0,8}\d|\bfr\s*[:=]?\s*\d|\btax?\s*[:=]?\s*\d|glicemia\s*[:=]?\s*\d|\becg\s*[:=]?\s*(?:com|sem|mostra|alterad)|\b(?:crepitac|sibil|rigidez|defesa abdominal)\b/.test(texto)
    };
    var faltantes = Object.keys(eixos).filter(function(chave) { return !eixos[chave]; });
    return { anamneseSuficiente: !faltantes.length,
      faltantes: faltantes, eixos: eixos };
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
      var matchEfStr = textoPuro.search(/(?:\n|^)\s*(?:sinais\s+vitais\s*:|exame\s+f[ií]sico(?:\s+geral)?\s*:|geral\s*:\s*(?:bom\s+estado|beg|regular|l[uú]cido)|acv\s*:|ar\s*:|abdome\s*:|extremidades\s*:)/i);
      var subPuro = textoPuro;
      var objPuro = '';
      if (matchEfStr > 0) {
        subPuro = textoPuro.slice(0, matchEfStr).trim();
        objPuro = textoPuro.slice(matchEfStr).trim();
      }
      if (ehFechado) {
        dados = { queixaPrincipal: subPuro, hda: subPuro, objetivo: objPuro || undefined };
      } else {
        return [
          '🩺 *SÍNTESE SOAP · ATENDIMENTO CLÍNICO*',
          '👤 *S - Subjetivo (Anamnese Estruturada)*\n' + subPuro,
          '🔍 *O - Objetivo (Exame Físico)*\n' + (objPuro ? formatarExameFisicoSistemas(objPuro) : 'Exame físico pendente de avaliação beira-leito. Aferir sinais vitais e exame direcionado.')
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
      if (pText && typeof pText === 'object') {
        pText = 'Prescrição Pronta Copy-Paste (UBS/REMUME vs. Urgência/Enfermaria):\n' + (pText.prescricao || []).join('\n') +
          '\nExames que mudam conduta imediata:\n' + (pText.exames || []).join('\n') +
          '\nOrientações/Sinais de Alarme:\n' + (pText.orientacoes || []).join('\n');
      } else if (pText.indexOf('Prescrição Pronta Copy-Paste') === -1) {
        pText = 'Prescrição Pronta Copy-Paste (UBS/REMUME vs. Urgência/Enfermaria):\n' + pText +
          '\nExames que mudam conduta imediata:\nNão informados.\nOrientações/Sinais de Alarme:\nNão informados.';
      }
      var pends = dados.pendencias || dados.pendencias_opcionais;
      if (Array.isArray(pends) && pends.length) pText += '\nDados de segurança a conferir antes de prescrever:\n' + pends.join('\n');

      var linhasFase2 = [
        '🩺 *SÍNTESE SOAP · REGISTRO CONSOLIDADO*',
        '👤 *S - Subjetivo*\n' + sText,
        '🔍 *O - Objetivo*\n' + oText,
        '🧠 *A - Avaliação*\n' + aText,
        '📋 *P - Plano*\n' + pText
      ];

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
    METAS_PRESSORICAS_SBC: METAS_PRESSORICAS_SBC,
    ESCALONAMENTO_HAS_SBC: ESCALONAMENTO_HAS_SBC,
    MONITORIZACAO_HAS_SBC: MONITORIZACAO_HAS_SBC,
    estruturarCondutaHas: estruturarCondutaHas,
    classificarPA_ESC2024: classificarPA_ESC2024,
    obterMetaPressorica_ESC2024: obterMetaPressorica_ESC2024,
    avaliarControleHAS_SOAP: avaliarControleHAS_SOAP,
    ESC_2024_HAS_CONFIG: ESC_2024_HAS_CONFIG,
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
    avaliarSuficienciaAnamnese: avaliarSuficienciaAnamnese,
    processarEntradaSoap: processarEntradaSoap
  };
})();

function estruturarCondutaHas(dados) {
  return SoapAmbulatorialService.estruturarCondutaHas(dados);
}

function formatarExameFisicoSistemas(texto) {
  return SoapAmbulatorialService.formatarExameFisicoSistemas(texto);
}

function obterModeloExameFisicoCompleto(contextoPrevio) {
  return SoapAmbulatorialService.obterModeloExameFisicoCompleto(contextoPrevio);
}

function formatarRascunhoSoapTelegram(dados, opcoes) {
  return SoapAmbulatorialService.formatarRascunhoSoapTelegram(dados, opcoes);
}

function avaliarSuficienciaAnamnese(contextoAcumulado, historicoSessao) {
  return SoapAmbulatorialService.avaliarSuficienciaAnamnese(contextoAcumulado, historicoSessao);
}

function processarEntradaSoap(chatId, textoEntrada, opcoes) {
  return SoapAmbulatorialService.processarEntradaSoap(chatId, textoEntrada, opcoes);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SoapAmbulatorialService;
}

