/**
 * ============================================================================
 * MÓDULO DE DOMÍNIO: SEGURANÇA DE MEDICAMENTOS NA LACTAÇÃO (FARMACOLOGIA CLÍNICA)
 * ============================================================================
 * Padrão de Referência: FEBRASGO / SBP / Ministério da Saúde / Hale's LactMed®
 * 
 * Referências Primárias:
 * 1. Hale TW. Hale's Medications & Mothers' Milk (Classificação L1 a L5).
 * 2. Brasil. Ministério da Saúde. Amamentação e uso de medicamentos e outras 
 *    substâncias (Classificação por cores: Verde, Amarelo, Vermelho).
 * 3. LactMed® Database (NIH / National Library of Medicine).
 * 
 * Características Técnicas:
 * - Zero dependências externas (Node.js CommonJS puro).
 * - Complexidade de busca O(1) via Map indexado e normalização determinística.
 * - Tempo de execução < 1ms para checagem de prescrições complexas.
 * - Imutabilidade garantida via Object.freeze Profundo.
 * ============================================================================
 */

'use strict';

// ============================================================================
// 1. DEFINIÇÕES E TAXONOMIA CLÍNICA
// ============================================================================

const HALE_CATEGORIES = Object.freeze({
  L1: {
    codigo: 'L1',
    titulo: 'Compatível (Mais Seguro)',
    descricao: 'Fármaco utilizado por um grande número de nutrizes sem aumento observado de efeitos adversos no lactente. Estudos controlados não demonstram risco.'
  },
  L2: {
    codigo: 'L2',
    titulo: 'Provavelmente Compatível (Seguro)',
    descricao: 'Fármaco estudado em número limitado de nutrizes sem aumento de efeitos adversos. E/ou a evidência de risco demonstrado é remota.'
  },
  L3: {
    codigo: 'L3',
    titulo: 'Moderadamente Seguro (Uso Criterioso)',
    descricao: 'Não há estudos controlados em nutrizes; o risco de efeitos adversos é possível, ou estudos mostram apenas efeitos adversos leves/não ameaçadores. Usar apenas se o benefício materno justificar o risco potencial.'
  },
  L4: {
    codigo: 'L4',
    titulo: 'Possivelmente Perigoso (Alto Risco)',
    descricao: 'Existe evidência positiva de risco para o lactente ou para a produção láctea, mas os benefícios do uso em nutrizes podem ser aceitáveis a despeito do risco (ex: situação de risco de vida materno sem alternativa segura).'
  },
  L5: {
    codigo: 'L5',
    titulo: 'Contraindicado (Perigoso)',
    descricao: 'Estudos em nutrizes demonstraram que há risco significativo e documentado para o lactente com base na experiência humana, ou é um medicamento com alto risco de causar dano grave. O risco supera claramente qualquer benefício possível da amamentação.'
  }
});

const MS_CATEGORIES = Object.freeze({
  VERDE: {
    cor: 'VERDE',
    status: 'Uso Compatível com a Amamentação',
    condutaPadrao: 'Prescrição liberada em doses habituais. Manter aleitamento materno em livre demanda.'
  },
  AMARELO: {
    cor: 'AMARELO',
    status: 'Uso Criterioso durante a Amamentação',
    condutaPadrao: 'Avaliar relação risco-benefício. Se prescrito, utilizar a menor dose eficaz pelo menor tempo possível e monitorar rigorosamente o lactente.'
  },
  VERMELHO: {
    cor: 'VERMELHO',
    status: 'Uso Contraindicado durante a Amamentação',
    condutaPadrao: 'Substituir o fármaco por alternativa segura. Caso o fármaco seja estritamente insubstituível para a saúde materna, suspender o aleitamento materno (temporária ou definitivamente).'
  }
});

/**
 * Parâmetros Farmacocinéticos Determinantes da Transferência Láctea:
 * - RID (Relative Infant Dose / Dose Relativa no Lactente): % da dose materna ajustada ao peso que atinge o lactente. Seguro quando < 10%.
 * - Ligação Proteica (LP): Quanto maior (> 90%), menor a fração livre para difusão passiva no alvéolo mamário.
 * - Peso Molecular (PM): PM < 200 Da atravessa facilmente poros intercelulares; PM > 800 Da tem passagem mínima ou nula (ex: Insulinas, Heparinas).
 * - pKa: O leite humano (pH ~7.0-7.2) é mais ácido que o plasma (pH 7.4). Bases fracas sofrem "aprisionamento iônico" (ion trapping) no leite.
 * - Meia-vida (t1/2): Fármacos com t1/2 longa acumulam-se no lactente (especialmente prematuros e RN < 2 meses com clearance renal/hepático imaturo).
 */

// ============================================================================
// 2. CATÁLOGO FARMACOLÓGICO (BASE DE DADOS CLÍNICA)
// ============================================================================

const RAW_DRUG_CATALOG = [
  // ==========================================================================
  // BLOCO I: CONTRAINDICADOS / ALTO RISCO (VERMELHO MS | HALE L4/L5)
  // ==========================================================================
  {
    id: 'AMIODARONA',
    nomeGenerico: 'Amiodarona',
    sinonimos: ['Ancoron', 'Atlansil', 'Cloridrato de Amiodarona'],
    classeTerapeutica: 'Antiarrítmico Classe III',
    hale: 'L5',
    ms: 'VERMELHO',
    farmacocinetica: {
      ridPercent: '3.5% a 45% (média ~11-15% somando metabólito ativo desetilamiodarona)',
      ligacaoProteica: '96%',
      meiaVidaAdulto: '26 a 107 dias (acumulação tecidual extrema)',
      biodisponibilidadeOral: '35% a 65%',
      pesoMolecular: 645,
      observacaoPK: 'Extrema lipossolubilidade e alto teor de iodo livre (cerca de 37% do peso molecular).'
    },
    mecanismoRisco: 'Liberação maciça de iodo inorgânico no leite materno (bloqueio tireoidiano de Wolff-Chaikoff no RN) e acumulação prolongada da droga e da desetilamiodarona nos tecidos do lactente.',
    efeitosAdversosLactente: [
      'Hipotireoidismo neonatal grave (risco de dano ao neurodesenvolvimento)',
      'Bradicardia sinusal e prolongamento do intervalo QT',
      'Bócio neonatal'
    ],
    condutaClinica: 'CONTRAINDICADO. Substituir antiarrítmico se possível. Caso insubstituível para a mãe, suspender a amamentação (mesmo após suspensão materna, a droga persiste no leite por semanas a meses).',
    alternativasSeguras: ['Propranolol', 'Metoprolol', 'Propafenona', 'Flecainida (L3/Verde com cautela)'],
    monitoramentoLactente: 'Se houve exposição inadvertida: dosar TSH e T4 livre imediatamente e realizar ECG no lactente.'
  },
  {
    id: 'METOTREXATO',
    nomeGenerico: 'Metotrexato',
    sinonimos: ['MTX', 'Tecnomet', 'Miantrex'],
    classeTerapeutica: 'Antineoplásico / Antimetabólito do Ácido Fólico / DMARD',
    hale: 'L5',
    ms: 'VERMELHO',
    farmacocinetica: {
      ridPercent: '< 1% a 3% (porém com retenção intracelular sob forma de poliglutamatos)',
      ligacaoProteica: '50%',
      meiaVidaAdulto: '3 a 15 horas (doses baixas a altas)',
      biodisponibilidadeOral: '60%',
      pesoMolecular: 454,
      observacaoPK: 'Retido nos tecidos humanos (fígado e rins do neonato) por semanas como poliglutamatos ativos.'
    },
    mecanismoRisco: 'Inibição irreversível da di-hidrofolato redutase, bloqueando a síntese de DNA e divisão celular em tecidos de rápida proliferação do lactente (medula óssea e mucosa gastrointestinal).',
    efeitosAdversosLactente: [
      'Mielossupressão grave (neutropenia, plaquetopenia)',
      'Imunossupressão severa',
      'Mucosite e enterocolite tóxica',
      'Interferência no crescimento celular'
    ],
    condutaClinica: 'CONTRAINDICADO em doses oncológicas ou imunossupressoras crônicas. Em dose única para gravidez ectópica, alguns protocolos admitem ordenha e descarte por 24 a 48h, mas a diretriz oficial do MS/FEBRASGO classifica como Vermelho.',
    alternativasSeguras: ['Azatioprina (para doenças autoimunes)', 'Hidroxicloroquina', 'Sulfassalazina', 'Biológicos anti-TNF (Infliximabe, Adalimumabe)'],
    monitoramentoLactente: 'Hemograma completo e função hepática caso tenha ocorrido exposição.'
  },
  {
    id: 'CICLOFOSFAMIDA',
    nomeGenerico: 'Ciclofosfamida',
    sinonimos: ['Genuxal', 'Enduxan'],
    classeTerapeutica: 'Antineoplásico / Agente Alquilante / Imunossupressor',
    hale: 'L5',
    ms: 'VERMELHO',
    farmacocinetica: {
      ridPercent: 'Variável (excreção confirmada de metabólitos alquilantes ativos no leite)',
      ligacaoProteica: '20% (pró-fármaco) / 60% (metabólitos)',
      meiaVidaAdulto: '3 a 12 horas',
      biodisponibilidadeOral: '75% a 100%',
      pesoMolecular: 261,
      observacaoPK: 'Baixo peso molecular e baixa ligação proteica facilitam passagem livre para o compartimento lácteo.'
    },
    mecanismoRisco: 'Alquilação direta do DNA no lactente, causando toxicidade medular aguda e potencial mutagênico/carcinogênico a longo prazo.',
    efeitosAdversosLactente: [
      'Pancitopenia / Neutropenia febril documentada em relatos de caso',
      'Supressão da medula óssea',
      'Cistite hemorrágica',
      'Risco carcinogênico tardio'
    ],
    condutaClinica: 'CONTRAINDICADO ABSOLUTAMENTE. Suspender o aleitamento materno durante a quimioterapia/pulsoterapia (aguardar no mínimo 72h a 1 semana após última infusão se for ciclo único).',
    alternativasSeguras: ['Azatioprina (nefrite lúpica em manutenção)', 'Tacrolimo', 'Ciclosporina (uso criterioso)', 'Prednisona'],
    monitoramentoLactente: 'Suspensão imediata da amamentação.'
  },
  {
    id: 'LITIO',
    nomeGenerico: 'Carbonato de Lítio',
    sinonimos: ['Carbolitium', 'Lítio'],
    classeTerapeutica: 'Estabilizador do Humor',
    hale: 'L4',
    ms: 'VERMELHO',
    farmacocinetica: {
      ridPercent: '12% a 30% (Altíssimo - ocasionalmente até 50% dos níveis séricos maternos)',
      ligacaoProteica: '0% (íon livre)',
      meiaVidaAdulto: '18 a 36 horas (no neonato pode ultrapassar 60-96 horas)',
      biodisponibilidadeOral: '100%',
      pesoMolecular: 7,
      observacaoPK: 'Íon minúsculo, zero ligação proteica e eliminação exclusivamente renal (filtração glomerular reduzida no RN causa acúmulo tóxico).'
    },
    mecanismoRisco: 'Transferência láctea maciça somada à imaturidade da taxa de filtração glomerular neonatal, levando a litemia tóxica no bebê, agravada em situações de desidratação.',
    efeitosAdversosLactente: [
      'Síndrome do bebê flácido (hipotonia, letargia, cianose)',
      'Hipotireoidismo neonatal e diabetes insipidus nefrogênico',
      'Arritmias cardíacas e inversão de onda T no ECG',
      'Tremores e sucção débil'
    ],
    condutaClinica: 'CONTRAINDICADO pelo Ministério da Saúde (Vermelho). Em casos psiquiátricos extremos onde a mãe recusa suspensão do lítio e exige amamentar (Hale L4), é proscrito em prematuros e exige monitoramento laboratorial invasivo no RN.',
    alternativasSeguras: ['Ácido Valproico (seguro na lactação, embora teratogênico na gestação)', 'Lamotrigina (com monitoramento)', 'Carbamazepina', 'Olanzapina', 'Quetiapina'],
    monitoramentoLactente: 'Se mantido por junta médica: Litemia sérica do lactente, TSH, ureia e creatinina a cada 4-6 semanas ou imediatamente se diarreia/desidratação.'
  },
  {
    id: 'DOXORRUBICINA',
    nomeGenerico: 'Doxorrubicina',
    sinonimos: ['Adriamicina', 'Fauldoxo', 'Cloridrato de Doxorrubicina'],
    classeTerapeutica: 'Antineoplásico / Antraciclina',
    hale: 'L5',
    ms: 'VERMELHO',
    farmacocinetica: {
      ridPercent: '4.4% (concentra-se no leite com relação Leite:Plasma > 4.0)',
      ligacaoProteica: '75%',
      meiaVidaAdulto: '20 a 48 horas (metabólito doxorrubicinol é persistente)',
      biodisponibilidadeOral: 'Baixa (~5%), mas altamente cáustica para o TGI imaturo',
      pesoMolecular: 543,
      observacaoPK: 'Sequestro ativo no leite materno; detectável no leite por vários dias após infusão.'
    },
    mecanismoRisco: 'Intercalação no DNA, inibição da topoisomerase II e geração de radicais livres com cardiotoxicidade e mielotoxicidade.',
    efeitosAdversosLactente: [
      'Mielossupressão severa',
      'Cardiotoxicidade potencial',
      'Mucosite gastrointestinal severa'
    ],
    condutaClinica: 'CONTRAINDICADO. Suspender o aleitamento materno durante todo o tratamento quimioterápico.',
    alternativasSeguras: ['Nenhuma (oncológico citotóxico)'],
    monitoramentoLactente: 'Interrupção absoluta da lactação.'
  },
  {
    id: 'TAMOXIFENO',
    nomeGenerico: 'Tamoxifeno',
    sinonimos: ['Nolvadex', 'Citrato de Tamoxifeno'],
    classeTerapeutica: 'Modulador Seletivo do Receptor de Estrógeno (SERM) / Antineoplásico',
    hale: 'L5',
    ms: 'VERMELHO',
    farmacocinetica: {
      ridPercent: 'Desconhecido (alta lipossolubilidade e acúmulo do metabólito ativo endoxifeno)',
      ligacaoProteica: '99%',
      meiaVidaAdulto: '5 a 7 dias (metabólitos até 14 dias)',
      biodisponibilidadeOral: '100%',
      pesoMolecular: 371,
      observacaoPK: 'Meia-vida extremamente longa impede estratégias de "ordenhar e descartar".'
    },
    mecanismoRisco: 'Supressão potente da lactogênese (inibe prolactina indiretamente) e ação antiestrogênica/estrogênica mista nos tecidos reprodutivos e eixo hipotálamo-hipófise-gonadal em desenvolvimento do lactente.',
    efeitosAdversosLactente: [
      'Agalactia / Supressão severa da produção láctea',
      'Desregulação endócrina e possíveis malformações tardias do trato urogenital',
      'Potencial genotóxico'
    ],
    condutaClinica: 'CONTRAINDICADO. A nutriz em tratamento adjuvante de câncer de mama com tamoxifeno não deve amamentar.',
    alternativasSeguras: ['Incompatível com manutenção da lactação'],
    monitoramentoLactente: 'Suspensão definitiva do aleitamento.'
  },
  {
    id: 'ERGOTAMINA',
    nomeGenerico: 'Ergotamina / Di-hidroergotamina',
    sinonimos: ['Ormigrein', 'Cefalium', 'Tonopan', 'Tartarato de Ergotamina'],
    classeTerapeutica: 'Alcaloide do Ergot / Antienxaquecoso',
    hale: 'L4',
    ms: 'VERMELHO',
    farmacocinetica: {
      ridPercent: 'Excreção significativa no leite materno',
      ligacaoProteica: '93%',
      meiaVidaAdulto: '2 horas (fase alfa), mas efeito tecidual prolongado (24h+)',
      biodisponibilidadeOral: 'Baixa (< 5%), porém absorção errática em neonatos',
      pesoMolecular: 581,
      observacaoPK: 'Ação agonista dopaminérgica hipofisária bloqueia a liberação de prolactina.'
    },
    mecanismoRisco: 'Vasoconstrição periférica intensa (ergotismo) no lactente e inibição direta da secreção de prolactina na mãe.',
    efeitosAdversosLactente: [
      'Ergotismo neonatal (vômitos, diarreia, convulsões)',
      'Isquemia de extremidades, cianose e instabilidade pressórica',
      'Agitação psicomotora',
      'Redução acentuada do volume de leite materno'
    ],
    condutaClinica: 'CONTRAINDICADO na crise de enxaqueca em lactantes. Substituir por analgésicos simples, AINEs ou triptanos seguros.',
    alternativasSeguras: ['Sumatriptano', 'Ibuprofeno', 'Paracetamol', 'Naproxeno (curto prazo)'],
    monitoramentoLactente: 'Se houve ingestão materna única, suspender amamentação por 24-48 horas e descartar o leite.'
  },
  {
    id: 'CABERGOLINA',
    nomeGenerico: 'Cabergolina',
    sinonimos: ['Dostinex', 'Cabertrix'],
    classeTerapeutica: 'Agonista Dopaminérgico D2 / Inibidor da Prolactina',
    hale: 'L4',
    ms: 'VERMELHO',
    farmacocinetica: {
      ridPercent: 'Não aplicável (inibe a produção do próprio veículo)',
      ligacaoProteica: '40% a 42%',
      meiaVidaAdulto: '63 a 69 horas',
      biodisponibilidadeOral: 'Alta (sofre extenso efeito de primeira passagem)',
      pesoMolecular: 451,
      observacaoPK: 'Ligação duradoura aos receptores D2 dos lactotrofos hipofisários.'
    },
    mecanismoRisco: 'Inibição farmacológica direta e prolongada da secreção de prolactina, interrompendo a lactogênese e galactopoiese.',
    efeitosAdversosLactente: [
      'Cessação completa do suprimento de leite materno (falha de crescimento por inanição se não suplementado)',
      'Sonolência ou distúrbios gastrointestinais caso haja ingestão residual'
    ],
    condutaClinica: 'CONTRAINDICADO se o objetivo é manter a amamentação. É o fármaco de escolha justamente quando há indicação médica de SUPRESSÃO da lactação (ex: óbito fetal/neonatal, HIV materno).',
    alternativasSeguras: ['Não aplicável (fármaco supressor da lactação)'],
    monitoramentoLactente: 'Não aplicável.'
  },
  {
    id: 'BROMOCRIPTINA',
    nomeGenerico: 'Bromocriptina',
    sinonimos: ['Parlodel', 'Mesilato de Bromocriptina'],
    classeTerapeutica: 'Agonista Dopaminérgico / Inibidor da Lactação',
    hale: 'L5',
    ms: 'VERMELHO',
    farmacocinetica: {
      ridPercent: 'Baixo, mas suprime a lactação',
      ligacaoProteica: '90% a 96%',
      meiaVidaAdulto: '6 a 20 horas',
      biodisponibilidadeOral: '28%',
      pesoMolecular: 654,
      observacaoPK: 'Alcaloide derivado do ergot.'
    },
    mecanismoRisco: 'Suprime a prolactina materna. Adicionalmente, no puerpério imediato, está associada a risco materno grave de vasoespasmo coronariano, hipertensão severa, convulsões e AVC.',
    efeitosAdversosLactente: [
      'Supressão da lactação',
      'Risco de ergotismo'
    ],
    condutaClinica: 'CONTRAINDICADO na lactação. Mesmo para supressão láctea, é proscrito na obstetrícia moderna devido ao risco de AVC/IAM puerperal materno (preferir Cabergolina ou medidas físicas se necessário suprimir).',
    alternativasSeguras: ['Cabergolina (apenas se a meta for secar o leite com segurança materna)'],
    monitoramentoLactente: 'Interromper uso.'
  },
  {
    id: 'ISOTRETINOINA',
    nomeGenerico: 'Isotretinoína',
    sinonimos: ['Roacutan', 'Cecnoin', 'Acnova'],
    classeTerapeutica: 'Retinoide Sistêmico (Derivado da Vitamina A)',
    hale: 'L5',
    ms: 'VERMELHO',
    farmacocinetica: {
      ridPercent: 'Alto potencial de transferência (extremamente lipofílico)',
      ligacaoProteica: '99.9%',
      meiaVidaAdulto: '10 a 20 horas (metabólito 4-oxo-isotretinoína: 17 a 50 horas)',
      biodisponibilidadeOral: 'Variável (aumenta com alimentos gordurosos)',
      pesoMolecular: 300,
      observacaoPK: 'Forte afinidade pela fração lipídica do leite humano.'
    },
    mecanismoRisco: 'Toxicidade por hipervitaminose A no lactente, atuação em receptores nucleares de ácido retinoico afetando fechamento epifisário, desenvolvimento do SNC e hepatotoxicidade.',
    efeitosAdversosLactente: [
      'Hipertensão intracraniana benigna (pseudotumor cerebral / abaulamento de fontanela)',
      'Hepatotoxicidade e dislipidemia',
      'Alterações no desenvolvimento ósseo'
    ],
    condutaClinica: 'CONTRAINDICADO ABSOLUTAMENTE. O tratamento da acne grave com isotretinoína oral deve ser adiado até o desmame completo.',
    alternativasSeguras: ['Ácido Azelaico tópico', 'Peróxido de Benzoíla tópico', 'Eritromicina ou Clindamicina tópica', 'Tretinoína tópica (L3 - absorção sistêmica mínima, não aplicar nas mamas)'],
    monitoramentoLactente: 'Suspender o medicamento imediatamente.'
  },
  {
    id: 'FENINDIONA',
    nomeGenerico: 'Fenindiona',
    sinonimos: ['Dindevan'],
    classeTerapeutica: 'Anticoagulante Oral (Derivado da Indandiona)',
    hale: 'L5',
    ms: 'VERMELHO',
    farmacocinetica: {
      ridPercent: 'Alto (excreção substancial no leite materno)',
      ligacaoProteica: 'Moderada',
      meiaVidaAdulto: '5 a 10 horas',
      biodisponibilidadeOral: 'Alta',
      pesoMolecular: 222,
      observacaoPK: 'Diferente dos cumarínicos (varfarina), a fenindiona passa amplamente para o leite.'
    },
    mecanismoRisco: 'Inibição da epóxido-redutase da vitamina K no fígado do lactente, bloqueando os fatores II, VII, IX e X.',
    efeitosAdversosLactente: [
      'Hemorragia neonatal grave (hematomas extensos pós-cirúrgicos documentados em lactentes)',
      'Alargamento acentuado do TP/INR e TTPa no recém-nascido'
    ],
    condutaClinica: 'CONTRAINDICADO (Clássico de provas de residência como o anticoagulante oral proscrito na amamentação, em contraste direto com a Varfarina que é segura).',
    alternativasSeguras: ['Varfarina (L2 / Verde)', 'Enoxaparina (L2 / Verde)', 'Heparina Não Fracionada (L1 / Verde)'],
    monitoramentoLactente: 'Coagulograma imediato e administração de Vitamina K (Fitomenadiona) se exposto.'
  },
  {
    id: 'CODEINA',
    nomeGenerico: 'Codeína',
    sinonimos: ['Codaten', 'Tylex', 'Paco', 'Fosfato de Codeína'],
    classeTerapeutica: 'Analgésico Opioide Fraco (Pró-fármaco da Morfina)',
    hale: 'L4',
    ms: 'AMARELO',
    farmacocinetica: {
      ridPercent: '0.6% a 8.1% (variável conforme polimorfismo genético CYP2D6)',
      ligacaoProteica: '7% a 25%',
      meiaVidaAdulto: '2.5 a 3.5 horas (morfina no neonato tem meia-vida de 6 a 14 horas)',
      biodisponibilidadeOral: '90%',
      pesoMolecular: 299,
      observacaoPK: 'Polimorfismo de duplicação alélica do gene CYP2D6 converte codeína rapidamente em níveis letais de morfina no leite.'
    },
    mecanismoRisco: 'Mães metabolizadoras ultrarrápidas pela CYP2D6 (1% a 28% da população dependendo da etnia) produzem concentrações elevadas de morfina e morfina-6-glicuronídeo no leite, causando intoxicação opioide fatal no RN.',
    efeitosAdversosLactente: [
      'Depressão respiratória grave e apneia',
      'Letargia extrema, bradicardia e cianose',
      'Sucção débil e constipação',
      'Óbito neonatal (documentado em literatura médica)'
    ],
    condutaClinica: 'EVITAR / CONTRAINDICADO pela FDA, EMA e SBP (Hale L4). Embora manuais antigos do MS classifiquem como Amarelo (uso curto), os protocolos obstétricos atuais (FEBRASGO / SBP / ACOG) proíbem a prescrição de codeína e tramadol pós-cesárea/episiotomia.',
    alternativasSeguras: ['Dipirona', 'Paracetamol', 'Ibuprofeno', 'Cetoprofeno', 'Morfina em dose baixa controlada (se dor intensa hospitalar, pois não depende de ativação pela CYP2D6)'],
    monitoramentoLactente: 'Vigiar frequência respiratória, padrão de sono (o bebê deve acordar para mamar a cada 3h) e tônus muscular. Antídoto: Naloxona.'
  },
  {
    id: 'CLORANFENICOL',
    nomeGenerico: 'Cloranfenicol',
    sinonimos: ['Quemicetina', 'Vixmicina', 'Arifenicol'],
    classeTerapeutica: 'Antibiótico Bacteriostático (Anfenicol)',
    hale: 'L4',
    ms: 'VERMELHO',
    farmacocinetica: {
      ridPercent: '1.6% a 6.1%',
      ligacaoProteica: '60%',
      meiaVidaAdulto: '1.5 a 4 horas (em neonatos pode exceder 24-28 horas por deficiência de glicuronil-transferase)',
      biodisponibilidadeOral: '80% a 90%',
      pesoMolecular: 323,
      observacaoPK: 'Imaturidade da glucuronidação hepática no RN impede a excreção segura mesmo de pequenas quantidades.'
    },
    mecanismoRisco: 'Supressão medular idiossincrática (independente de dose) e toxicidade mitocondrial dose-dependente em recém-nascidos.',
    efeitosAdversosLactente: [
      'Anemia aplásica idiossincrática irreversível (risco teórico mas letal)',
      'Síndrome do Bebê Cinzento (distensão abdominal, cianose palidez-acinzentada, colapso vasomotor)',
      'Recusa alimentar, vômitos e diarreia por disbiose'
    ],
    condutaClinica: 'CONTRAINDICADO por via sistêmica na lactação (MS Vermelho). Colírios/pomadas oftálmicas têm absorção sistêmica muito menor, mas ainda assim prefere-se Tobramicina ou Ofloxacino oftálmico.',
    alternativasSeguras: ['Amoxicilina + Clavulanato', 'Cefalexina', 'Ceftriaxona', 'Azitromicina'],
    monitoramentoLactente: 'Hemograma completo e avaliação clínica se exposto.'
  },
  {
    id: 'LINEZOLIDA',
    nomeGenerico: 'Linezolida',
    sinonimos: ['Zyvox'],
    classeTerapeutica: 'Antibiótico Oxazolidinona',
    hale: 'L3',
    ms: 'VERMELHO',
    farmacocinetica: {
      ridPercent: '6% a 15.6% (Concentrações no leite equivalentes às séricas)',
      ligacaoProteica: '31%',
      meiaVidaAdulto: '4.5 a 5.5 horas',
      biodisponibilidadeOral: '100%',
      pesoMolecular: 337,
      observacaoPK: 'Baixa ligação proteica e biodisponibilidade oral de 100% garantem absorção integral pelo lactente.'
    },
    mecanismoRisco: 'Inibição da síntese proteica mitocondrial no lactente e ação inibidora reversível não-seletiva da monoaminoxidase (IMAO).',
    efeitosAdversosLactente: [
      'Mielossupressão reversível (trombocitopenia, anemia, leucopenia)',
      'Diarreia e candidíase oral/perineal',
      'Acidose láctica e neuropatia óptica (em exposições prolongadas)'
    ],
    condutaClinica: 'Classificado como VERMELHO no manual do Ministério da Saúde (pela escassez de dados na época da publicação e risco hematológico) e L3 por Hale. Usar apenas em infecções maternas por MRSA/VRE sem opção parenteral segura.',
    alternativasSeguras: ['Vancomicina (L1 / Verde - não é absorvida por via oral pelo bebê)', 'Teicoplanina', 'Clindamicina'],
    monitoramentoLactente: 'Hemograma completo semanal (contagem de plaquetas e reticulócitos) e vigilância gastrointestinal.'
  },
  {
    id: 'ATENOLOL',
    nomeGenerico: 'Atenolol',
    sinonimos: ['Atenol', 'Abloker', 'Angipress'],
    classeTerapeutica: 'Betabloqueador Cardiosseletivo Hidrofílico',
    hale: 'L3',
    ms: 'AMARELO',
    farmacocinetica: {
      ridPercent: '6.6% a 25% (Alto! Acumula-se no leite com relação Leite:Plasma de 1.5 a 6.8)',
      ligacaoProteica: '5% a 15% (Extremamente baixa)',
      meiaVidaAdulto: '6 a 7 horas (no RN prematuro ou < 3 meses pode chegar a > 16-24 horas)',
      biodisponibilidadeOral: '50%',
      pesoMolecular: 266,
      observacaoPK: 'Pegadinha clássica de farmacologia: por ter baixíssima ligação proteica (<15%) e excreção 100% renal, é o PIOR betabloqueador para lactantes.'
    },
    mecanismoRisco: 'Concentração elevada no leite por aprisionamento iônico e baixa ligação proteica, somada à imaturidade renal do lactente, gerando bloqueio beta-adrenérgico sistêmico no bebê.',
    efeitosAdversosLactente: [
      'Bradicardia neonatal sintomática (relatos clássicos documentados)',
      'Hipotensão arterial e cianose',
      'Hipoglicemia mascarada',
      'Letargia e hipotonia'
    ],
    condutaClinica: 'EVITAR (Especialmente em RN prematuros, baixo peso ou < 2 meses). Sempre substituir por betabloqueadores de alta ligação proteica (Propranolol ou Metoprolol).',
    alternativasSeguras: ['Propranolol (LP 90%, RID 0.3%)', 'Metoprolol (RID 1.4%)', 'Labetalol', 'Nifedipino', 'Enalapril'],
    monitoramentoLactente: 'Frequência cardíaca, perfusão periférica, glicemia capilar e ganho ponderal.'
  },
  {
    id: 'FENOBARBITAL',
    nomeGenerico: 'Fenobarbital',
    sinonimos: ['Gardenal', 'Barbitron', 'Edhanol'],
    classeTerapeutica: 'Anticonvulsivante / Barbitúrico',
    hale: 'L4',
    ms: 'AMARELO',
    farmacocinetica: {
      ridPercent: '24% a 30% (Extremamente elevado - supera a dose terapêutica pediátrica por kg)',
      ligacaoProteica: '51%',
      meiaVidaAdulto: '53 a 118 horas (em recém-nascidos: 100 a 400 horas!)',
      biodisponibilidadeOral: '95% a 100%',
      pesoMolecular: 232,
      observacaoPK: 'A meia-vida de eliminação no recém-nascido é até 4 vezes maior que no adulto, levando a bioacumulação progressiva.'
    },
    mecanismoRisco: 'Potenciação prolongada do receptor GABA-A no SNC imaturo do lactente, com níveis séricos no bebê que frequentemente atingem ou ultrapassam a faixa terapêutica materna.',
    efeitosAdversosLactente: [
      'Sedação profunda e sonolência excessiva',
      'Reflexo de sucção débil e baixo ganho ponderal',
      'Depressão respiratória e apneia',
      'Síndrome de abstinência neonatal (irritabilidade, tremores, convulsões) se o desmame for abrupto'
    ],
    condutaClinica: 'ALTO RISCO (Hale L4 / MS Amarelo). Se possível, transicionar para anticonvulsivante mais seguro. Caso mantido, considerar aleitamento misto se houver sonolência excessiva e NUNCA interromper a amamentação abruptamente.',
    alternativasSeguras: ['Carbamazepina', 'Ácido Valproico', 'Fenitoína', 'Levetiracetam'],
    monitoramentoLactente: 'Dosagem sérica de fenobarbital no lactente se apresentar letargia/sucção fraca; curva de peso rigorosa.'
  },
  {
    id: 'ETINILESTRADIOL',
    nomeGenerico: 'Etinilestradiol (Anticoncepcionais Combinados)',
    sinonimos: ['Ciclo 21', 'Selene', 'Yasmin', 'Diane 35', 'Microvlar', 'ACO Combinado'],
    classeTerapeutica: 'Contraceptivo Hormonal Combinado (Estrogênio Sintético)',
    hale: 'L3',
    ms: 'VERMELHO',
    farmacocinetica: {
      ridPercent: '< 1% (a transferência direta ao bebê é baixa, o risco é sobre a fisiologia mamária)',
      ligacaoProteica: '98%',
      meiaVidaAdulto: '13 a 27 horas',
      biodisponibilidadeOral: '40% a 50%',
      pesoMolecular: 296,
      observacaoPK: 'Atua diretamente no epitélio glandular mamário inibindo a ação da prolactina.'
    },
    mecanismoRisco: 'Inibição estrogênica dose-dependente da lactogênese, reduzindo drasticamente o volume de leite produzido (em até 40%) e seu teor proteico/calórico, além do risco tromboembólico materno no puerpério (< 6 semanas).',
    efeitosAdversosLactente: [
      'Déficit pondero-estatural e desnutrição por hipogalactia materna iatrogênica',
      'Ginecomastia transitória no lactente (raro, em doses altas)'
    ],
    condutaClinica: 'CONTRAINDICADO durante os primeiros 6 meses pós-parto (Critérios de Elegibilidade da OMS Categoria 4 até 6 semanas e Categoria 3 de 6 semanas a 6 meses; MS Vermelho). Utilizar métodos exclusivos de progestagênio ou não-hormonais.',
    alternativasSeguras: ['Desogestrel isolado (Cerazette)', 'Noretisterona (Micronor)', 'Medroxiprogesterona injetável (Depo-Provera)', 'DIU de Cobre', 'DIU de Levonorgestrel (Mirena)'],
    monitoramentoLactente: 'Acompanhamento rigoroso da curva de crescimento (peso/idade) caso iniciado após o 6º mês.'
  },
  {
    id: 'IODO_131',
    nomeGenerico: 'Iodeto de Sódio (Iodo Radioativo I-131)',
    sinonimos: ['Iodo-131', 'Radioiodoterapia'],
    classeTerapeutica: 'Radiofármaco Terapêutico / Diagnóstico',
    hale: 'L5',
    ms: 'VERMELHO',
    farmacocinetica: {
      ridPercent: 'Altíssimo (concentrado ativamente na mama pelo simportador Na+/I- NIS)',
      ligacaoProteica: 'Baixa',
      meiaVidaAdulto: 'Meia-vida física de 8.04 dias',
      biodisponibilidadeOral: '100%',
      pesoMolecular: 131,
      observacaoPK: 'A glândula mamária lactante expressa intensamente o transportador NIS, sequestrando cerca de 25-30% da dose administrada para o leite.'
    },
    mecanismoRisco: 'Emissão de radiação beta e gama diretamente captada pela tireoide do lactente (que é altamente radiossensível) e irradiação do próprio tecido mamário materno.',
    efeitosAdversosLactente: [
      'Ablação / Destruição permanente da tireoide do lactente (hipotireoidismo definitivo)',
      'Aumento severo do risco de carcinoma diferenciado de tireoide na infância',
      'Aumento do risco de câncer de mama materno se administrado em mama ingurgitada'
    ],
    condutaClinica: 'CONTRAINDICADO ABSOLUTAMENTE. Para doses terapêuticas de I-131, o aleitamento deve ser cessado DEFINITIVAMENTE (idealmente 4 a 6 semanas ANTES da administração usando cabergolina, para reduzir a expressão mamária do NIS e proteger a mama materna da radiação).',
    alternativasSeguras: ['Propiltiouracil (para hipertireoidismo)', 'Metimazol', 'Cintilografia com Tecnécio-99m (se apenas diagnóstico, exige pausa temporária de 12-24h)'],
    monitoramentoLactente: 'Proibição absoluta do aleitamento.'
  },

  // ==========================================================================
  // BLOCO II: USO CRITERIOSO (AMARELO MS | HALE L3)
  // ==========================================================================
  {
    id: 'SULFAMETOXAZOL_TRIMETOPRIMA',
    nomeGenerico: 'Sulfametoxazol + Trimetoprima',
    sinonimos: ['Bactrim', 'Bactrim F', 'Infectrin', 'Cotrimoxazol', 'Sulfametoxazol'],
    classeTerapeutica: 'Antibacteriano (Sulfonamida + Diaminopirimidina)',
    hale: 'L3',
    ms: 'AMARELO',
    farmacocinetica: {
      ridPercent: '2.2% a 6.0%',
      ligacaoProteica: '65% (SMX) / 45% (TMP)',
      meiaVidaAdulto: '10 a 12 horas',
      biodisponibilidadeOral: '90% a 100%',
      pesoMolecular: 253,
      observacaoPK: 'Desloca a bilirrubina dos sítios de ligação da albumina.'
    },
    mecanismoRisco: 'Risco de kernicterus (impregnação nuclear por bilirrubina) e hemólise caso o lactente tenha deficiência de G6PD ou seja prematuro/neonato < 2 meses.',
    efeitosAdversosLactente: [
      'Hiperbilirrubinemia e icterícia neonatal agravada',
      'Risco de hemólise em lactentes com deficiência de G6PD',
      'Diarreia e candidíase'
    ],
    condutaClinica: 'CONTRAINDICADO EM NEONATOS < 2 MESES, PREMATUROS OU COM G6PD. Em lactentes > 2 meses saudáveis, o uso é compatível.',
    alternativasSeguras: ['Amoxicilina + Clavulanato', 'Cefalexina', 'Ceftriaxona', 'Fosfomicina'],
    monitoramentoLactente: 'Observar icterícia escleral/cutânea e evacuações.'
  },
  {
    id: 'PSEUDOEFEDRINA',
    nomeGenerico: 'Pseudoefedrina',
    sinonimos: ['Claritin D', 'Allegra D', 'Desalex D', 'Tylenol Sinus', 'Cloridrato de Pseudoefedrina'],
    classeTerapeutica: 'Descongestionante Sistêmico (Agonista Alfa/Beta-adrenérgico)',
    hale: 'L3',
    ms: 'AMARELO',
    farmacocinetica: {
      ridPercent: '4.3% a 5.5%',
      ligacaoProteica: 'Baixa',
      meiaVidaAdulto: '5 a 8 horas',
      biodisponibilidadeOral: 'Alta',
      pesoMolecular: 165,
      observacaoPK: 'Vasoconstrição no plexo capilar mamário e inibição da secreção de prolactina.'
    },
    mecanismoRisco: 'Redução drástica e rápida da produção de leite (queda de até 24% na produção após uma única dose de 60 mg) e irritabilidade simpaticomimética no bebê.',
    efeitosAdversosLactente: [
      'Irritabilidade, insônia e agitação psicomotora',
      'Taquicardia neonatal transitória',
      'Queda acentuada da produção láctea materna (risco de desmame precoce)'
    ],
    condutaClinica: 'EVITAR. Não utilizar descongestionantes orais durante a lactação. Preferir lavagem com solução salina 0,9% ou corticoide intranasal tópico.',
    alternativasSeguras: ['Solução Fisiológica 0,9% tópica nasal', 'Budesonida spray nasal', 'Mometasona spray nasal'],
    monitoramentoLactente: 'Observar irritabilidade e padrão de sono do bebê.'
  },
  {
    id: 'CIPROFLOXACINO',
    nomeGenerico: 'Ciprofloxacino',
    sinonimos: ['Cipro', 'Ciflox', 'Proflox', 'Cloridrato de Ciprofloxacino'],
    classeTerapeutica: 'Antibiótico Fluoroquinolona',
    hale: 'L3',
    ms: 'AMARELO',
    farmacocinetica: {
      ridPercent: '2.1% a 6.3%',
      ligacaoProteica: '20% a 40%',
      meiaVidaAdulto: '4 horas',
      biodisponibilidadeOral: '70% a 80% (porém o cálcio do leite quelata a quinolona, reduzindo a absorção pelo bebê)',
      pesoMolecular: 331,
      observacaoPK: 'A formação de complexos insolúveis com o cálcio presente no leite materno reduz substancialmente a biodisponibilidade gastrointestinal no lactente.'
    },
    mecanismoRisco: 'Risco teórico de artropatia (erosão da cartilagem de crescimento observada em animais jovens) e alteração da microbiota intestinal com risco de enterocolite.',
    efeitosAdversosLactente: [
      'Colite pseudomembranosa (relato isolado de caso)',
      'Diarreia e candidíase',
      'Coloração esverdeada dos dentes (raro)',
      'Artropatia (nunca comprovada em lactentes humanos via leite)'
    ],
    condutaClinica: 'USO CRITERIOSO (Amarelo MS / Hale L3). A Academia Americana de Pediatria (AAP) e o LactMed consideram aceitável se não houver beta-lactâmico ou macrolídeo eficaz. Dica prática: amamentar imediatamente antes da dose ou aguardar 3-4h após a tomada.',
    alternativasSeguras: ['Cefalexina', 'Amoxicilina + Clavulanato', 'Nitrofurantoína (exceto se RN < 1 mês ou deficiência de G6PD)', 'Fosfomicina', 'Ceftriaxona'],
    monitoramentoLactente: 'Observar padrão das evacuações (diarreia ou sangue nas fezes).'
  },
  {
    id: 'METRONIDAZOL',
    nomeGenerico: 'Metronidazol',
    sinonimos: ['Flagyl', 'Helmizol'],
    classeTerapeutica: 'Antiprotozoário e Antibacteriano Anaerobicida (Nitroimidazol)',
    hale: 'L2',
    ms: 'AMARELO',
    farmacocinetica: {
      ridPercent: '9.9% a 13.6% (Moderadamente elevado em uso sistêmico)',
      ligacaoProteica: '< 20%',
      meiaVidaAdulto: '8 horas (em recém-nascidos prematuros pode chegar a 25-75 horas)',
      biodisponibilidadeOral: '100%',
      pesoMolecular: 171,
      observacaoPK: 'Gel vaginal tem absorção sistêmica < 2% (totalmente seguro). Via oral/EV atinge concentrações lácteas próximas às plasmáticas.'
    },
    mecanismoRisco: 'Gusto metálico amargo no leite (pode causar rejeição do seio), disbiose intestinal e risco mutagênico teórico demonstrado apenas em bactérias/roedores em altíssimas doses.',
    efeitosAdversosLactente: [
      'Diarreia, fezes amolecidas e intolerância secundária à lactose',
      'Candidíase oral/perineal',
      'Recusa do leite materno por alteração organoléptica (gosto metálico)'
    ],
    condutaClinica: 'COMPATÍVEL COM CAUTELA (Hale L2 / MS Amarelo). Em doses habituais (ex: 400-500mg 8/8h ou 12/12h), NÃO é necessário suspender a amamentação. Se usado em dose única de 2g (tricomoníase), pode-se opcionalmente interromper o aleitamento por 12 a 24 horas.',
    alternativasSeguras: ['Clindamicina (para anaeróbios)', 'Metronidazol Gel Vaginal (para vaginose bacteriana)'],
    monitoramentoLactente: 'Aceitação das mamadas e hábito intestinal.'
  },
  {
    id: 'FLUOXETINA',
    nomeGenerico: 'Fluoxetina',
    sinonimos: ['Prozac', 'Daforin', 'Verotina', 'Cloridrato de Fluoxetina'],
    classeTerapeutica: 'Antidepressivo Inibidor Seletivo da Recaptação de Serotonina (ISRS)',
    hale: 'L2',
    ms: 'AMARELO',
    farmacocinetica: {
      ridPercent: '6.8% a 12% (O mais alto entre os ISRS)',
      ligacaoProteica: '94.5%',
      meiaVidaAdulto: '4 a 6 dias (metabólito ativo Norfluoxetina: 9 a 16 dias!)',
      biodisponibilidadeOral: '70% a 90%',
      pesoMolecular: 309,
      observacaoPK: 'A meia-vida gigantesca da norfluoxetina causa acúmulo sérico no lactente nos primeiros 2 meses de vida.'
    },
    mecanismoRisco: 'Acúmulo plasmático de norfluoxetina no lactente levando a hiperestimulação serotoninérgica leve.',
    efeitosAdversosLactente: [
      'Cólicas, irritabilidade e choro inconsolável',
      'Distúrbios do sono (insônia)',
      'Vômitos, diarreia e menor ganho ponderal inicial'
    ],
    condutaClinica: 'USO CRITERIOSO. Não é a primeira escolha para iniciar tratamento no puerpério (preferir Sertralina ou Paroxetina). Contudo, se a paciente já fazia uso na gestação com ótimo controle psiquiátrico, NÃO se deve trocar a medicação, mantendo-se a amamentação.',
    alternativasSeguras: ['Sertralina (Padrão-ouro na lactação - RID < 2%)', 'Paroxetina (RID 1.4%)', 'Nortriptilina'],
    monitoramentoLactente: 'Ganho de peso, irritabilidade, padrão de sono e tremores.'
  },
  {
    id: 'ESCITALOPRAM',
    nomeGenerico: 'Escitalopram / Citalopram',
    sinonimos: ['Lexapro', 'Exodus', 'Reconter', 'Cipramil'],
    classeTerapeutica: 'Antidepressivo ISRS',
    hale: 'L2',
    ms: 'AMARELO',
    farmacocinetica: {
      ridPercent: '5.2% a 7.9% (Escitalopram é metade da dose do Citalopram racêmico)',
      ligacaoProteica: '56%',
      meiaVidaAdulto: '27 a 32 horas',
      biodisponibilidadeOral: '80%',
      pesoMolecular: 324,
      observacaoPK: 'O enantiômero puro (Escitalopram) produz menor exposição láctea que o Citalopram.'
    },
    mecanismoRisco: 'Passagem moderada para o leite devido à ligação proteica intermediária (56%).',
    efeitosAdversosLactente: [
      'Sonolência ou inquietação leve (raro com escitalopram, mais descrito com citalopram)',
      'Perda ponderal transitória'
    ],
    condutaClinica: 'COMPATÍVEL COM MONITORAMENTO (Hale L2 / MS Amarelo). Escitalopram é preferível ao Citalopram. Sertralina permanece a 1ª escolha para início de novo tratamento.',
    alternativasSeguras: ['Sertralina', 'Paroxetina'],
    monitoramentoLactente: 'Vigiar sedação, irritabilidade e ganho ponderal.'
  },
  {
    id: 'DIAZEPAM',
    nomeGenerico: 'Diazepam',
    sinonimos: ['Valium', 'Compaz', 'Dienpax'],
    classeTerapeutica: 'Benzodiazepínico de Longa Ação',
    hale: 'L3',
    ms: 'AMARELO',
    farmacocinetica: {
      ridPercent: '2.8% a 9.1%',
      ligacaoProteica: '98% a 99%',
      meiaVidaAdulto: '43 horas (metabólito ativo Desmetildiazepam: 50 a 100 horas; no RN chega a > 10 dias)',
      biodisponibilidadeOral: '100%',
      pesoMolecular: 285,
      observacaoPK: 'Alta lipossolubilidade e geração do metabólito ativo nordiazepam (desmetildiazepam) causam acúmulo no lactente em uso repetido.'
    },
    mecanismoRisco: 'Acumulação do desmetildiazepam no SNC neonatal por deficiência de glicuronidação hepática.',
    efeitosAdversosLactente: [
      'Letargia, sedação e hipotonia muscular',
      'Sucção fraca e perda de peso',
      'Apneia (especialmente em prematuros)',
      'Hiperbilirrubinemia (o benzoato de sódio do veículo injetável compete com a bilirrubina pela albumina)'
    ],
    condutaClinica: 'EVITAR USO CRÔNICO (Hale L3 / MS Amarelo). Dose única parenteral (ex: crise convulsiva materna ou pré-procedimento) é compatível sem necessidade de suspender mamadas. Para uso contínuo, substituir por benzodiazepínico de meia-vida curta sem metabólitos ativos.',
    alternativasSeguras: ['Lorazepam (L3/Verde - não tem metabólitos ativos, RID 2.5%)', 'Midazolam (RID 0.6%, meia-vida ultracurta)'],
    monitoramentoLactente: 'Sedação, tônus muscular, frequência respiratória e icterícia neonatal.'
  },
  {
    id: 'CLONAZEPAM',
    nomeGenerico: 'Clonazepam',
    sinonimos: ['Rivotril', 'Clopam', 'Navotrax'],
    classeTerapeutica: 'Benzodiazepínico de Longa Ação / Anticonvulsivante',
    hale: 'L3',
    ms: 'AMARELO',
    farmacocinetica: {
      ridPercent: '2.8%',
      ligacaoProteica: '85%',
      meiaVidaAdulto: '18 a 50 horas',
      biodisponibilidadeOral: '90%',
      pesoMolecular: 315,
      observacaoPK: 'Meia-vida longa favorece acumulação em recém-nascidos de mães sob doses > 1-2mg/dia.'
    },
    mecanismoRisco: 'Depressão do SNC no lactente, potencializada se a mãe fizer uso concomitante de outros psicotrópicos sedativos.',
    efeitosAdversosLactente: [
      'Sonolência excessiva e dificuldade para despertar nas mamadas',
      'Episódios de apneia e cianose (relatados em prematuros ou polifarmácia materna)',
      'Hipotonia'
    ],
    condutaClinica: 'USO CRITERIOSO (Hale L3 / MS Amarelo). Utilizar na menor dose possível (idealmente <= 1 mg/dia em dose única noturna após a última mamada da noite). Preferir Lorazepam se a indicação for ansiedade.',
    alternativasSeguras: ['Lorazepam', 'Sertralina (para transtornos de ansiedade crônicos)'],
    monitoramentoLactente: 'Vigiar sonolência diurna, esforço respiratório e ganho de peso.'
  },
  {
    id: 'TRAMADOL',
    nomeGenerico: 'Tramadol',
    sinonimos: ['Tramal', 'Sylador', 'Cloridrato de Tramadol'],
    classeTerapeutica: 'Analgésico Opioide Atípico (Agonista Mu + Inibidor de Recaptação de Monoaminas)',
    hale: 'L3',
    ms: 'AMARELO',
    farmacocinetica: {
      ridPercent: '2.9% (soma de tramadol + metabólito ativo O-desmetiltramadol / M1)',
      ligacaoProteica: '20%',
      meiaVidaAdulto: '6 horas (M1: 7 horas; prolongado em neonatos)',
      biodisponibilidadeOral: '75%',
      pesoMolecular: 263,
      observacaoPK: 'Assim como a codeína, é ativado pela enzima polimórfica CYP2D6 no metabólito M1 (200x mais potente no receptor mu).'
    },
    mecanismoRisco: 'Risco de toxicidade opioide em lactentes de mães metabolizadoras ultrarrápidas pela CYP2D6.',
    efeitosAdversosLactente: [
      'Sonolência, letargia e dificuldade de amamentação',
      'Depressão respiratória (risco menor que a codeína, porém alerta oficial da FDA vigente)'
    ],
    condutaClinica: 'USO CRITERIOSO / EVITAR AMBULATORIALMENTE (Hale L3 / MS Amarelo / FDA Contra-indica). No pós-parto hospitalar imediato (fase de colostro, primeiros 2-3 dias), a transferência absoluta em mL é mínima, mas após a apojadura (descida do leite) deve ser substituído por AINEs e analgésicos comuns.',
    alternativasSeguras: ['Dipirona', 'Paracetamol', 'Ibuprofeno', 'Cetorolaco', 'Diclofenaco'],
    monitoramentoLactente: 'Nível de consciência, respiração e pega ao seio.'
  },
  {
    id: 'LAMOTRIGINA',
    nomeGenerico: 'Lamotrigina',
    sinonimos: ['Lamitor', 'Lamictal', 'Neural'],
    classeTerapeutica: 'Anticonvulsivante / Estabilizador do Humor',
    hale: 'L2',
    ms: 'AMARELO',
    farmacocinetica: {
      ridPercent: '9.2% a 18.3% (Alto! Níveis plasmáticos no RN podem atingir 30% a 50% dos níveis maternos)',
      ligacaoProteica: '55%',
      meiaVidaAdulto: '24 a 35 horas',
      biodisponibilidadeOral: '98%',
      pesoMolecular: 256,
      observacaoPK: 'Eliminada exclusivamente por glucuronidação (UGT1A4), via metabólica altamente imatura no neonato. Além disso, o clearance materno cai abruptamente após o parto (exigindo redução da dose materna pós-parto!).'
    },
    mecanismoRisco: 'Exposição sistêmica significativa no lactente devido à baixa capacidade de glucuronidação neonatal e caso a dose materna (aumentada na gravidez) não seja reduzida no puerpério.',
    efeitosAdversosLactente: [
      'Apneia neonatal e sonolência (relatado quando a dose materna não foi reduzida pós-parto)',
      'Trombocitose leve reversível',
      'Risco teórico de rash cutâneo grave (Síndrome de Stevens-Johnson - extremamente raro via leite)'
    ],
    condutaClinica: 'COMPATÍVEL COM AJUSTE MATERNO E MONITORAMENTO (Hale L2 / MS Amarelo). Regra de ouro obstétrica: reduzir empiricamente a dose materna de lamotrigina nos primeiros 10-14 dias pós-parto de volta aos níveis pré-gestacionais para evitar intoxicação materna e neonatal.',
    alternativasSeguras: ['Carbamazepina', 'Ácido Valproico', 'Levetiracetam'],
    monitoramentoLactente: 'Inspeção diária da pele (suspender imediatamente se surgir qualquer exantema/rash), padrão respiratório e sucção.'
  },
  {
    id: 'RISPERIDONA',
    nomeGenerico: 'Risperidona',
    sinonimos: ['Risperdal', 'Respidon', 'Viverdal'],
    classeTerapeutica: 'Antipsicótico Atípico (Segunda Geração)',
    hale: 'L2',
    ms: 'AMARELO',
    farmacocinetica: {
      ridPercent: '2.8% a 9.1% (incluindo o metabólito ativo 9-hidroxirrisperidona / paliperidona)',
      ligacaoProteica: '90% (risperidona) / 77% (paliperidona)',
      meiaVidaAdulto: '3 a 20 horas (paliperidona: 21-30 horas)',
      biodisponibilidadeOral: '70%',
      pesoMolecular: 410,
      observacaoPK: 'Aumenta significativamente a prolactina materna (pode causar galactorreia ou ingurgitamento).'
    },
    mecanismoRisco: 'Bloqueio dopaminérgico D2 e serotoninérgico 5-HT2A residual no lactente.',
    efeitosAdversosLactente: [
      'Sedação leve ou hipotonia',
      'Sintomas extrapiramidais transitórios (raro)',
      'Atraso motor transitório (raro em politerapia)'
    ],
    condutaClinica: 'USO CRITERIOSO (Hale L2 / MS Amarelo). Compatível quando clinicamente indicado para psicose puerperal, esquizofrenia ou transtorno bipolar. Olanzapina e Quetiapina apresentam menor passagem láctea.',
    alternativasSeguras: ['Olanzapina (RID 1.2%)', 'Quetiapina (RID < 0.5% - a menor transferência entre os atípicos)', 'Haloperidol (em baixas doses)'],
    monitoramentoLactente: 'Tônus muscular, movimentos anormais, alerta e marcos do desenvolvimento neuropsicomotor.'
  },
  {
    id: 'PSEUDOEFEDRINA',
    nomeGenerico: 'Pseudoefedrina',
    sinonimos: ['Allegra D', 'Claritin D', 'Tylenol Sinus'],
    classeTerapeutica: 'Descongestionante Nasal Simpaticomimético',
    hale: 'L3',
    ms: 'AMARELO',
    farmacocinetica: {
      ridPercent: '4.3%',
      ligacaoProteica: 'Baixa',
      meiaVidaAdulto: '5 a 8 horas',
      biodisponibilidadeOral: '100%',
      pesoMolecular: 165,
      observacaoPK: 'Estudo clássico de Aljazaf et al. demonstrou que uma única dose de 60mg reduz a produção de leite materno em 24% em 24 horas!'
    },
    mecanismoRisco: 'Vasoconstrição mamária e redução dos níveis basais de prolactina materna, levando a queda aguda da produção láctea, além de efeito estimulante adrenérgico no lactente.',
    efeitosAdversosLactente: [
      'Redução significativa do volume de leite materno (hipogalactia)',
      'Irritabilidade, agitação e insônia no lactente (em até 20% dos bebês expostos)',
      'Taquicardia leve'
    ],
    condutaClinica: 'EVITAR (Hale L3 / MS Amarelo). Contraindicado em mães com baixa produção láctea ou no primeiro mês pós-parto (lactogênese em estabelecimento). Substituir por medidas locais.',
    alternativasSeguras: ['Lavagem nasal com Soro Fisiológico 0.9% ou hipertônico 3%', 'Budesonida spray nasal', 'Fluticasona spray nasal', 'Loratadina isolada (sem o "D")'],
    monitoramentoLactente: 'Irritabilidade do bebê e sinais de redução do volume urinário/saciedade pós-mamada.'
  },
  {
    id: 'FLUCONAZOL',
    nomeGenerico: 'Fluconazol',
    sinonimos: ['Zoltec', 'Zolstatin', 'Flucanil'],
    classeTerapeutica: 'Antifúngico Triazólico Sistêmico',
    hale: 'L2',
    ms: 'AMARELO',
    farmacocinetica: {
      ridPercent: '11% a 16% (porém é um fármaco aprovado para uso direto em neonatos em doses muito superiores)',
      ligacaoProteica: '11% a 12%',
      meiaVidaAdulto: '30 horas',
      biodisponibilidadeOral: '90%',
      pesoMolecular: 306,
      observacaoPK: 'Excelente penetração no tecido mamário e ductos lactíferos (fármaco de escolha para mastite candidiásica).'
    },
    mecanismoRisco: 'Passagem láctea elevada, mas a dose total ingerida pelo lactente (~0.3 mg/kg/dia) equivale a apenas 5% a 10% da dose terapêutica neonatal oficial (6-12 mg/kg/dia).',
    efeitosAdversosLactente: [
      'Diarreia leve ou desconforto abdominal (incomum)',
      'Elevação transitória de transaminases (apenas em cursos muito prolongados)'
    ],
    condutaClinica: 'SEGURO / USO CRITERIOSO (Hale L2 / MS Amarelo). Dose única de 150mg para candidíase vaginal é 100% compatível. Também é o tratamento de escolha para candidíase mamária/ductal persistente (150-200mg/dia por 14 dias), devendo-se tratar simultaneamente a boca do bebê com Nistatina ou Miconazol.',
    alternativasSeguras: ['Miconazol creme vaginal/tópico', 'Clotrimazol creme vaginal', 'Nistatina oral/tópica (absorção zero)'],
    monitoramentoLactente: 'Apenas observação clínica gastrointestinal se o tratamento materno exceder 14 dias.'
  },
  {
    id: 'HIDROCLOROTIAZIDA',
    nomeGenerico: 'Hidroclorotiazida',
    sinonimos: ['Clorana', 'Drenol', 'HCTZ'],
    classeTerapeutica: 'Diurético Tiazídico / Anti-hipertensivo',
    hale: 'L2',
    ms: 'AMARELO',
    farmacocinetica: {
      ridPercent: '1.8% a 2%',
      ligacaoProteica: '40% a 68%',
      meiaVidaAdulto: '6 a 15 horas',
      biodisponibilidadeOral: '65% a 75%',
      pesoMolecular: 297,
      observacaoPK: 'Passagem ao leite é mínima, mas a depleção intravascular materna pode impactar o volume lácteo.'
    },
    mecanismoRisco: 'Diurese intensa com contração de volume plasmático materno em doses altas (> 50 mg/dia) pode reduzir a produção de leite.',
    efeitosAdversosLactente: [
      'Redução do suprimento lácteo (em doses > 50mg/dia)',
      'Desidratação ou distúrbios eletrolíticos no RN (raro em doses <= 25mg/dia)'
    ],
    condutaClinica: 'COMPATÍVEL EM DOSE BAIXA (Hale L2 / MS Amarelo). Doses de 12.5 mg a 25 mg/dia são seguras. Evitar doses >= 50 mg/dia ou associação com furosemida no primeiro mês de lactação.',
    alternativasSeguras: ['Enalapril', 'Captopril', 'Nifedipino', 'Anlodipino', 'Espironolactona (se necessário diurético)'],
    monitoramentoLactente: 'Acompanhamento do ganho ponderal e diurese do lactente.'
  },
  {
    id: 'AAS',
    nomeGenerico: 'Ácido Acetilsalicílico (AAS)',
    sinonimos: ['Aspirina', 'Somalgin Cardio', 'Ecasil'],
    classeTerapeutica: 'Antiagregante Plaquetário (dose baixa) / AINE Salicilato (dose alta)',
    hale: 'L2',
    ms: 'AMARELO',
    farmacocinetica: {
      ridPercent: '0.4% (em dose baixa de 81-100mg) até 9-21% (em doses anti-inflamatórias altas > 2g/dia)',
      ligacaoProteica: '80% a 90%',
      meiaVidaAdulto: '2 a 3 horas (salicilato em dose alta tem cinética de ordem zero: 15-30 horas)',
      biodisponibilidadeOral: '80% a 100%',
      pesoMolecular: 180,
      observacaoPK: 'Cinética não-linear: pequenas doses antiagregantes quase não chegam ao leite; doses analgésicas/reumatológicas saturam o metabolismo e acumulam no bebê.'
    },
    mecanismoRisco: 'Em doses altas (> 500mg/dia): risco de Síndrome de Reye (encefalopatia aguda + degeneração hepática gordurosa em vigência de infecções virais no lactente), acidose metabólica e disfunção plaquetária.',
    efeitosAdversosLactente: [
      'Síndrome de Reye (risco em doses analgésicas/anti-inflamatórias)',
      'Acidose metabólica neonatal (relato histórico em doses maternas altas)',
      'Trombocitopenia / petéquias e hemólise em deficientes de G6PD'
    ],
    condutaClinica: 'DOSE-DEPENDENTE: 1) Em dose antiagregante cardiovascular/profilática (81 a 150 mg/dia): COMPATÍVEL (Hale L2). 2) Em dose analgésica/antitérmica/anti-inflamatória (>= 500 mg): CONTRAINDICADO (Hale L4). Substituir por Ibuprofeno ou Paracetamol.',
    alternativasSeguras: ['Ibuprofeno (para dor/inflamação)', 'Paracetamol (para dor/febre)', 'Dipirona'],
    monitoramentoLactente: 'Em uso materno de 100mg/dia: observar apenas surgimento eventual de equimoses/petéquias.'
  },

  // ==========================================================================
  // BLOCO III: SEGUROS / COMPATÍVEIS (VERDE MS | HALE L1/L2)
  // ==========================================================================
  {
    id: 'PARACETAMOL',
    nomeGenerico: 'Paracetamol (Acetaminofeno)',
    sinonimos: ['Tylenol', 'Dorflex (cuidado com a orfenadrina)', 'Cimegripe (cuidado com fenilefrina)'],
    classeTerapeutica: 'Analgésico e Antitérmico',
    hale: 'L1',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '1.3% a 4.8%',
      ligacaoProteica: '10% a 25%',
      meiaVidaAdulto: '2 horas',
      biodisponibilidadeOral: '85% a 98%',
      pesoMolecular: 151,
      observacaoPK: 'Quantidade ingerida pelo bebê em 24h é uma fração ínfima da dose pediátrica padrão (10-15 mg/kg/dose). Além disso, neonatos têm imaturidade da CYP2E1, produzindo menos metabólito hepatotóxico NAPQI.'
    },
    mecanismoRisco: 'Desprezível em doses terapêuticas maternas (< 4g/dia).',
    efeitosAdversosLactente: [
      'Rash maculopapular (extremamente raro - 1 relato isolado na literatura)'
    ],
    condutaClinica: 'PADRÃO-OURO / TOTALMENTE COMPATÍVEL (Hale L1 / MS Verde). Analgésico e antitérmico de primeira escolha na lactação. Atenção: prescrever isolado (evitar apresentações comerciais combinadas com descongestionantes ou cafeína em excesso).',
    alternativasSeguras: ['Dipirona', 'Ibuprofeno'],
    monitoramentoLactente: 'Nenhum monitoramento especial necessário.'
  },
  {
    id: 'IBUPROFENO',
    nomeGenerico: 'Ibuprofeno',
    sinonimos: ['Advil', 'Alivium', 'Buscofem', 'Motrin'],
    classeTerapeutica: 'Anti-inflamatório Não Esteroidal (AINE)',
    hale: 'L1',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '0.1% a 0.7% (Extremamente baixo - quase indetectável no leite!)',
      ligacaoProteica: '99%',
      meiaVidaAdulto: '1.8 a 2.5 horas',
      biodisponibilidadeOral: '80% a 100%',
      pesoMolecular: 206,
      observacaoPK: 'A combinação de ligação proteica de 99%, meia-vida curta e caráter ácido (não sofre aprisionamento iônico no leite mais ácido) torna a passagem para o leite praticamente nula.'
    },
    mecanismoRisco: 'Nulo em doses terapêuticas.',
    efeitosAdversosLactente: [
      'Nenhum efeito adverso documentado em estudos clínicos.'
    ],
    condutaClinica: 'PADRÃO-OURO / AINE DE ESCOLHA NA LACTAÇÃO (Hale L1 / MS Verde). Seguro inclusive para mães de prematuros. Ideal para dor pós-cesárea, cólica uterina puerperal e mastite.',
    alternativasSeguras: ['Cetoprofeno', 'Diclofenaco', 'Paracetamol', 'Dipirona'],
    monitoramentoLactente: 'Nenhum monitoramento especial necessário.'
  },
  {
    id: 'DIPIRONA',
    nomeGenerico: 'Dipirona Monoidratada (Metamizol)',
    sinonimos: ['Novalgina', 'Anador', 'Maxalgina', 'Lisador Dip'],
    classeTerapeutica: 'Analgésico e Antitérmico Pirazolônico',
    hale: 'L3',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '3.6% a 14% (metabólito ativo 4-metil-amino-antipirina / 4-MAA)',
      ligacaoProteica: '58% (4-MAA)',
      meiaVidaAdulto: '2.6 a 3.5 horas (4-MAA)',
      biodisponibilidadeOral: '85% a 90%',
      pesoMolecular: 333,
      observacaoPK: 'Eliminado rapidamente do leite em até 24-48 horas.'
    },
    mecanismoRisco: 'Transferência moderada do metabólito ativo 4-MAA.',
    efeitosAdversosLactente: [
      'Episódio isolado de cianose descrito em 1 relato de caso antigo (resolvido espontaneamente)',
      'Risco teórico raríssimo de agranulocitose'
    ],
    condutaClinica: 'COMPATÍVEL NO BRASIL (MS Verde). Amplamente utilizado nas maternidades brasileiras (FEBRASGO / Ministério da Saúde) para analgesia pós-parto. Nota de prova: na literatura norte-americana/europeia (Hale L3 / EMA), é visto com reserva pois a dipirona não é comercializada nos EUA, mas em diretrizes nacionais (SUS/MS) segue como VERDE.',
    alternativasSeguras: ['Paracetamol', 'Ibuprofeno'],
    monitoramentoLactente: 'Observação clínica habitual.'
  },
  {
    id: 'AMOXICILINA',
    nomeGenerico: 'Amoxicilina (isolada ou com Clavulanato)',
    sinonimos: ['Amoxil', 'Clavulin', 'Novamox', 'Velamox'],
    classeTerapeutica: 'Antibiótico Beta-lactâmico (Aminopenicilina)',
    hale: 'L1',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '0.5% a 0.9%',
      ligacaoProteica: '18%',
      meiaVidaAdulto: '1 a 1.5 horas',
      biodisponibilidadeOral: '75% a 90%',
      pesoMolecular: 365,
      observacaoPK: 'Concentrações no leite são ínfimas (< 1 mg/L).'
    },
    mecanismoRisco: 'Alteração leve da flora gastrointestinal do lactente.',
    efeitosAdversosLactente: [
      'Diarreia leve ou fezes amolecidas (mais comum quando associada ao Ácido Clavulânico)',
      'Candidíase oral/perineal ocasional',
      'Rash cutâneo por sensibilização (raro)'
    ],
    condutaClinica: 'TOTALMENTE COMPATÍVEL (Hale L1 / MS Verde). Antibiótico de primeira linha para infecções respiratórias, otites, sinusites, ITU e mastite puerperal na nutriz.',
    alternativasSeguras: ['Cefalexina', 'Cefadroxila', 'Ampicilina', 'Penicilina Benzatina'],
    monitoramentoLactente: 'Observar aspecto das fezes e presença de placas esbranquiçadas na mucosa oral (sapinho).'
  },
  {
    id: 'CEFALEXINA',
    nomeGenerico: 'Cefalexina',
    sinonimos: ['Keflex', 'Cefaporex'],
    classeTerapeutica: 'Antibiótico Beta-lactâmico (Cefalosporina de 1ª Geração)',
    hale: 'L1',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '0.4% a 1.5%',
      ligacaoProteica: '10% a 15%',
      meiaVidaAdulto: '0.9 a 1.2 horas',
      biodisponibilidadeOral: '90%',
      pesoMolecular: 347,
      observacaoPK: 'Meia-vida ultracurta e rápida depuração renal materna.'
    },
    mecanismoRisco: 'Modificação transitória da microbiota intestinal.',
    efeitosAdversosLactente: [
      'Diarreia transitória benigna',
      'Candidíase'
    ],
    condutaClinica: 'TOTALMENTE COMPATÍVEL (Hale L1 / MS Verde). Primeira escolha para mastite puerperal aguda (cobre S. aureus sensível à meticilina e Streptococcus) e infecções de ferida operatória (cesárea/episiotomia).',
    alternativasSeguras: ['Amoxicilina + Clavulanato', 'Cefadroxila', 'Clindamicina (se alergia grave a beta-lactâmicos)'],
    monitoramentoLactente: 'Padrão de evacuações.'
  },
  {
    id: 'AZITROMICINA',
    nomeGenerico: 'Azitromicina',
    sinonimos: ['Zitromax', 'Astro', 'Azi'],
    classeTerapeutica: 'Antibiótico Macrolídeo (Azalídeo)',
    hale: 'L2',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '3.2% a 5.9%',
      ligacaoProteica: '7% a 51% (dependente da concentração)',
      meiaVidaAdulto: '68 horas (concentração tecidual elevada)',
      biodisponibilidadeOral: '38%',
      pesoMolecular: 749,
      observacaoPK: 'Alto peso molecular (749 Da) limita a difusão passiva rápida.'
    },
    mecanismoRisco: 'Risco epidemiológico teórico de Estenose Hipertrófica de Piloro (EHP) se administrada nas primeiras 2 semanas de vida (risco muito mais associado à Eritromicina direta no RN do que à Azitromicina via leite).',
    efeitosAdversosLactente: [
      'Diarreia, vômitos ou cólicas abdominais',
      'Estenose hipertrófica de piloro (associação fraca/não confirmada para azitromicina via leite)'
    ],
    condutaClinica: 'COMPATÍVEL (Hale L2 / MS Verde). Macrolídeo de escolha na lactação (mais seguro que a eritromicina e a claritromicina). Primeira linha para tratamento de infecção por Chlamydia trachomatis ou coqueluche na puérpera.',
    alternativasSeguras: ['Amoxicilina', 'Cefalexina'],
    monitoramentoLactente: 'Em RN < 28 dias: vigiar ocorrência de vômitos não-biliosos em jato pós-mamada.'
  },
  {
    id: 'SERTRALINA',
    nomeGenerico: 'Sertralina',
    sinonimos: ['Zoloft', 'Assert', 'Tolrest', 'Serenata'],
    classeTerapeutica: 'Antidepressivo Inibidor Seletivo da Recaptação de Serotonina (ISRS)',
    hale: 'L2',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '0.4% a 2.2% (Extremamente baixo! Níveis séricos no lactente são quase sempre indetectáveis)',
      ligacaoProteica: '98%',
      meiaVidaAdulto: '26 horas',
      biodisponibilidadeOral: '44% (alto efeito de primeira passagem hepática)',
      pesoMolecular: 306,
      observacaoPK: 'Alta ligação proteica (98%) e baixa biodisponibilidade oral garantem exposição sistêmica quase nula no lactente.'
    },
    mecanismoRisco: 'Mínimo.',
    efeitosAdversosLactente: [
      'Raríssimos relatos de inquietação leve ou alteração benigna do sono.'
    ],
    condutaClinica: 'ANTIDEPRESSIVO PADRÃO-OURO NA LACTAÇÃO (Hale L2 / MS Verde). Fármaco de primeira escolha absoluta para iniciar tratamento de Depressão Pós-Parto (DPP) e transtornos de ansiedade no puerpério.',
    alternativasSeguras: ['Paroxetina (L2 / Verde)', 'Nortriptilina (L2 / Verde - padrão-ouro entre os tricíclicos)'],
    monitoramentoLactente: 'Acompanhamento pediátrico de rotina.'
  },
  {
    id: 'PAROXETINA',
    nomeGenerico: 'Paroxetina',
    sinonimos: ['Aropax', 'Pondera', 'Paxil CR', 'Cebrilin'],
    classeTerapeutica: 'Antidepressivo ISRS',
    hale: 'L2',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '0.5% a 2.9%',
      ligacaoProteica: '95%',
      meiaVidaAdulto: '21 horas (sem metabólitos ativos!)',
      biodisponibilidadeOral: '50% (extenso metabolismo de primeira passagem)',
      pesoMolecular: 329,
      observacaoPK: 'Ausência de metabólitos ativos e alta ligação proteica impedem acúmulo no bebê.'
    },
    mecanismoRisco: 'Mínimo na lactação (embora seja evitada no 1º trimestre da gestação por risco cardíaco fetal, no pós-parto/lactação é extremamente segura).',
    efeitosAdversosLactente: [
      'Irritabilidade ocasional (principalmente se houve exposição intrauterina prévia causando síndrome de descontinuação neonatal nos primeiros dias).'
    ],
    condutaClinica: 'TOTALMENTE COMPATÍVEL (Hale L2 / MS Verde). Excelente opção junto com a Sertralina para tratamento de depressão e transtorno do pânico no puerpério.',
    alternativasSeguras: ['Sertralina', 'Nortriptilina'],
    monitoramentoLactente: 'Rotina pediátrica habitual.'
  },
  {
    id: 'ENALAPRIL',
    nomeGenerico: 'Enalapril / Captopril',
    sinonimos: ['Renitec', 'Eupressin', 'Capoten'],
    classeTerapeutica: 'Anti-hipertensivo Inibidor da Enzima Conversora de Angiotensina (IECA)',
    hale: 'L2',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '0.16% (Enalapril) / 0.02% (Captopril) - Quase zero!',
      ligacaoProteica: '50% a 60%',
      meiaVidaAdulto: '11 horas (enalaprilato) / 2 horas (captopril)',
      biodisponibilidadeOral: '60%',
      pesoMolecular: 376,
      observacaoPK: 'Pegadinha clássica de prova: Os IECAs são absolutamente CONTRAINDICADOS na gestação (fetotoxicidade renal/oligoâmnio), mas são TOTALMENTE SEGUROS e de 1ª escolha na LACTAÇÃO!'
    },
    mecanismoRisco: 'Transferência láctea insignificante. Risco teórico de hipotensão/efeito hemodinâmico renal apenas em prematuros extremos.',
    efeitosAdversosLactente: [
      'Nenhum efeito adverso reportado em recém-nascidos a termo.'
    ],
    condutaClinica: 'PADRÃO-OURO PARA HIPERTENSÃO NO PUERPÉRIO (Hale L2 / MS Verde). Escolha ideal para puérperas com pré-eclâmpsia persistente, hipertensão gestacional no pós-parto ou HAS crônica com proteinúria/cardiopatia. Em prematuros extremos (< 32 semanas) nas primeiras semanas de vida, usar com cautela ou preferir Nifedipino.',
    alternativasSeguras: ['Captopril', 'Nifedipino', 'Anlodipino', 'Metildopa', 'Propranolol'],
    monitoramentoLactente: 'Em prematuros: monitorar diurese e peso.'
  },
  {
    id: 'NIFEDIPINO',
    nomeGenerico: 'Nifedipino',
    sinonimos: ['Adalat', 'Adalat Oros', 'Cardalin'],
    classeTerapeutica: 'Anti-hipertensivo Bloqueador dos Canais de Cálcio (Di-hidropiridínico)',
    hale: 'L2',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '0.5% a 2.3%',
      ligacaoProteica: '92% a 98%',
      meiaVidaAdulto: '2 a 5 horas',
      biodisponibilidadeOral: '45% a 70%',
      pesoMolecular: 346,
      observacaoPK: 'Altíssima ligação às proteínas plasmáticas impede difusão significativa para o leite.'
    },
    mecanismoRisco: 'Desprezível.',
    efeitosAdversosLactente: [
      'Nenhum efeito adverso documentado.'
    ],
    condutaClinica: 'TOTALMENTE COMPATÍVEL (Hale L2 / MS Verde). Excelente para controle da hipertensão puerperal (inclusive em mães de prematuros) e também utilizado para tratamento do Fenômeno de Raynaud do mamilo (vasoespasmo mamilar doloroso durante a amamentação).',
    alternativasSeguras: ['Anlodipino (L2 / Verde)', 'Enalapril', 'Metoprolol'],
    monitoramentoLactente: 'Nenhum monitoramento específico.'
  },
  {
    id: 'METILDOPA',
    nomeGenerico: 'Metildopa',
    sinonimos: ['Aldomet', 'Tensioval'],
    classeTerapeutica: 'Anti-hipertensivo Simpaticolítico de Ação Central (Agonista Alfa-2)',
    hale: 'L2',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '0.1% a 2.8%',
      ligacaoProteica: '< 15%',
      meiaVidaAdulto: '1.8 a 2 horas',
      biodisponibilidadeOral: '25% a 50% (baixa e variável)',
      pesoMolecular: 211,
      observacaoPK: 'Baixa biodisponibilidade oral no lactente.'
    },
    mecanismoRisco: 'Para o lactente o risco é nulo. Porém, para a MÃE no puerpério, a metildopa reduz catecolaminas centrais e aumenta o risco de Depressão Pós-Parto (DPP) e sedação materna.',
    efeitosAdversosLactente: [
      'Nenhum efeito adverso relevante no lactente (pode aumentar discretamente a prolactina materna, favorecendo o volume de leite).'
    ],
    condutaClinica: 'COMPATÍVEL COM O BEBÊ (Hale L2 / MS Verde), MAS EVITADA NA MÃE PUÉRPERA. Conduta clínica FEBRASGO / Ministério da Saúde: embora segura para o leite, no pós-parto recomenda-se suspender a Metildopa usada na gravidez e substituí-la por Enalapril, Captopril ou Nifedipino devido à associação da metildopa com depressão puerperal.',
    alternativasSeguras: ['Enalapril', 'Captopril', 'Nifedipino', 'Anlodipino'],
    monitoramentoLactente: 'Vigiar humor materno (escala de Edimburgo).'
  },
  {
    id: 'PROPRANOLOL',
    nomeGenerico: 'Propranolol',
    sinonimos: ['Inderal', 'Rebaten'],
    classeTerapeutica: 'Betabloqueador Não-Seletivo Lipofílico',
    hale: 'L2',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '0.3% a 0.5% (Baixíssimo!)',
      ligacaoProteica: '90% a 95%',
      meiaVidaAdulto: '3 a 5 horas',
      biodisponibilidadeOral: '25% a 30% (intenso metabolismo hepático de 1ª passagem)',
      pesoMolecular: 259,
      observacaoPK: 'Contraste clássico com o Atenolol: devido à ligação proteica > 90% e extenso efeito de primeira passagem, quase nada atinge a circulação do lactente.'
    },
    mecanismoRisco: 'Mínimo.',
    efeitosAdversosLactente: [
      'Raríssimo risco de hipoglicemia ou bradicardia (apenas em doses maternas muito elevadas > 160mg/dia).'
    ],
    condutaClinica: 'BETABLOQUEADOR DE ESCOLHA NA LACTAÇÃO (Hale L2 / MS Verde). Primeira opção para profilaxia de enxaqueca, controle de taquiarritmias, tireotoxicose puerperal e hipertensão na nutriz.',
    alternativasSeguras: ['Metoprolol (L2 / Verde - escolha se a mãe tiver asma/broncoespasmo por ser cardiosseletivo)', 'Labetalol'],
    monitoramentoLactente: 'Apenas observação clínica habitual.'
  },
  {
    id: 'VARFARINA',
    nomeGenerico: 'Varfarina Sódica',
    sinonimos: ['Marevan', 'Coumadin'],
    classeTerapeutica: 'Anticoagulante Oral (Antagonista da Vitamina K / Cumarínico)',
    hale: 'L2',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '< 0.01% (Indetectável no leite materno!)',
      ligacaoProteica: '99%',
      meiaVidaAdulto: '20 a 60 horas',
      biodisponibilidadeOral: '95%',
      pesoMolecular: 308,
      observacaoPK: 'Fármaco altamente ácido e 99% ligado à albumina plasmática; não sofre difusão nem aprisionamento iônico no leite.'
    },
    mecanismoRisco: 'Nulo em doses terapêuticas (INR materno entre 2.0 e 3.5). Estudos demonstram que o TP/INR dos lactentes amamentados permanece 100% normal.',
    efeitosAdversosLactente: [
      'Nenhum sangramento ou alteração de coagulograma documentado em lactentes a termo que receberam a profilaxia padrão de Vitamina K ao nascer.'
    ],
    condutaClinica: 'TOTALMENTE COMPATÍVEL (Hale L2 / MS Verde). Embora teratogênica na gestação (síndrome varfarínica fetal), no pós-parto é o anticoagulante oral de escolha para tromboembolismo venoso (TVP/TEP) e próteses valvares mecânicas.',
    alternativasSeguras: ['Enoxaparina (L2 / Verde)', 'Heparina Não Fracionada (L1 / Verde)'],
    monitoramentoLactente: 'Certificar-se de que o recém-nascido recebeu a dose padrão de Vitamina K1 (1 mg IM) na sala de parto.'
  },
  {
    id: 'ENOXAPARINA',
    nomeGenerico: 'Enoxaparina Sódica',
    sinonimos: ['Clexane', 'Versa', 'Heptron'],
    classeTerapeutica: 'Anticoagulante Parenteral (Heparina de Baixo Peso Molecular - HBPM)',
    hale: 'L2',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '0% (Absorção enteral nula)',
      ligacaoProteica: 'Ligação à antitrombina III',
      meiaVidaAdulto: '4.5 a 7 horas',
      biodisponibilidadeOral: '0% (Degradada completamente pelas enzimas proteolíticas e ácido gástrico do lactente)',
      pesoMolecular: 4500,
      observacaoPK: 'Polissacarídeo pesado (~4500 Da) que quase não atravessa o epitélio mamário e possui biodisponibilidade oral ZERO no estômago do bebê.'
    },
    mecanismoRisco: 'Inexistente.',
    efeitosAdversosLactente: [
      'Nenhum.'
    ],
    condutaClinica: 'TOTALMENTE COMPATÍVEL (Hale L2 / MS Verde). Padrão-ouro para tromboprofilaxia e anticoagulação plena pós-cesárea e no puerpério.',
    alternativasSeguras: ['Heparina Não Fracionada', 'Dalteparina', 'Varfarina'],
    monitoramentoLactente: 'Nenhum.'
  },
  {
    id: 'INSULINA',
    nomeGenerico: 'Insulina Humana (NPH / Regular) e Análogos (Glargina, Detemir, Lispro, Asparte)',
    sinonimos: ['Humulin', 'Novolin', 'Lantus', 'Humalog', 'NovoRapid', 'Tresiba'],
    classeTerapeutica: 'Hormônio Hipoglicemiante Peptídico',
    hale: 'L1',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: 'Fisiológico (a insulina é um componente natural do leite humano saudável)',
      ligacaoProteica: 'Não aplicável',
      meiaVidaAdulto: 'Variável conforme apresentação',
      biodisponibilidadeOral: '0% (Peptídeo digerido no trato gastrointestinal do lactente)',
      pesoMolecular: 5808,
      observacaoPK: 'Macromolécula proteica (5808 Da) destruída pelas peptidases gástricas do bebê; inclusive auxilia na maturação da mucosa intestinal neonatal.'
    },
    mecanismoRisco: 'Zero para o bebê. Atenção para a MÃE: a lactação consome cerca de 400-500 kcal/dia de glicose para síntese de lactose, aumentando o risco de hipoglicemia materna.',
    efeitosAdversosLactente: [
      'Nenhum (não causa hipoglicemia no lactente).'
    ],
    condutaClinica: 'TOTALMENTE COMPATÍVEL (Hale L1 / MS Verde). Reduzir a dose de insulina materna no pós-parto imediato (geralmente para ~50-60% da dose do final da gestação ou retornar à dose pré-gestacional) e orientar a mãe a fazer um pequeno lanche antes ou durante as mamadas para evitar hipoglicemia materna.',
    alternativasSeguras: ['Metformina (para DM2)'],
    monitoramentoLactente: 'Nenhum.'
  },
  {
    id: 'METFORMINA',
    nomeGenerico: 'Metformina',
    sinonimos: ['Glifage', 'Glifage XR', 'Dimefor', 'Glucoformin'],
    classeTerapeutica: 'Antidiabético Oral (Biguanida)',
    hale: 'L1',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '0.18% a 0.65% (Muito baixo)',
      ligacaoProteica: '0% (porém hidrofílica, não se liga à gordura do leite)',
      meiaVidaAdulto: '4 a 8 horas',
      biodisponibilidadeOral: '50% a 60%',
      pesoMolecular: 129,
      observacaoPK: 'Apesar do baixo peso molecular, sua passagem para o leite é limitada por mecanismos de transporte saturáveis, mantendo relação Leite:Plasma baixa (~0.35).'
    },
    mecanismoRisco: 'Inexistente (não estimula secreção de insulina pancreática, logo não causa hipoglicemia).',
    efeitosAdversosLactente: [
      'Nenhum efeito sobre a glicemia, peso ou desenvolvimento neuropsicomotor do lactente.'
    ],
    condutaClinica: 'TOTALMENTE COMPATÍVEL (Hale L1 / MS Verde). Antidiabético oral de primeira escolha na lactação para mulheres com Diabetes Mellitus tipo 2 ou Síndrome dos Ovários Policísticos.',
    alternativasSeguras: ['Insulina', 'Glibenclamida (L2 / Verde - RID < 1.5%, praticamente indetectável no leite)'],
    monitoramentoLactente: 'Nenhum.'
  },
  {
    id: 'LEVOTIROXINA',
    nomeGenerico: 'Levotiroxina Sódica (T4)',
    sinonimos: ['Puran T4', 'Euthyrox', 'Synthroid', 'Levoid'],
    classeTerapeutica: 'Hormônio Tireoidiano',
    hale: 'L1',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: 'Fisiológico (< 1% da necessidade diária do lactente)',
      ligacaoProteica: '99.9% (fortemente ligada à TBG, transtirretina e albumina)',
      meiaVidaAdulto: '6 a 7 dias',
      biodisponibilidadeOral: '40% a 80%',
      pesoMolecular: 777,
      observacaoPK: 'Ligação proteica de 99.9% impede passagem significativa para o leite.'
    },
    mecanismoRisco: 'Nulo em doses de reposição eutireoidiana. Pelo contrário, o hipotireoidismo materno não tratado reduz severamente a produção e ejeção de leite.',
    efeitosAdversosLactente: [
      'Nenhum.'
    ],
    condutaClinica: 'TOTALMENTE COMPATÍVEL E ESSENCIAL (Hale L1 / MS Verde). Manter o uso contínuo para garantir a lactogênese adequada (reduzir a dose materna de volta ao valor pré-gestacional logo após o parto e repetir TSH em 6 semanas). Nota: o T4 no leite materno é insuficiente para tratar um bebê com hipotireoidismo congênito!',
    alternativasSeguras: ['Insubstituível'],
    monitoramentoLactente: 'Realizar Teste do Pezinho habitual no RN.'
  },
  {
    id: 'PROPILTIOURACIL',
    nomeGenerico: 'Propiltiouracil (PTU)',
    sinonimos: ['Propil', 'PTU'],
    classeTerapeutica: 'Antitireoidiano (Tionamida)',
    hale: 'L2',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '0.025% a 1.8% (Muito baixo!)',
      ligacaoProteica: '80% a 85%',
      meiaVidaAdulto: '1 a 2 horas',
      biodisponibilidadeOral: '75%',
      pesoMolecular: 170,
      observacaoPK: 'Totalmente ionizado no pH plasmático (7.4) e altamente ligado às proteínas, passando 4 a 10 vezes menos para o leite do que o Metimazol.'
    },
    mecanismoRisco: 'Risco teórico de hipotireoidismo neonatal apenas em doses maternas extremas (> 450-600 mg/dia). Atenção ao risco de hepatotoxicidade materna com PTU.',
    efeitosAdversosLactente: [
      'Função tireoidiana e QI dos lactentes permanecem 100% normais em doses maternas <= 300-450 mg/dia.'
    ],
    condutaClinica: 'COMPATÍVEL (Hale L2 / MS Verde). Tanto o Propiltiouracil (até 300 mg/dia) quanto o Metimazol/Tiamazol (Tapazol, até 20-30 mg/dia) são seguros na lactação. Dica: tomar o comprimido imediatamente APÓS amamentar.',
    alternativasSeguras: ['Metimazol / Tiamazol (Tapazol - L2 / Verde, frequentemente preferido pela endocrinologia atual por menor hepatotoxicidade materna)'],
    monitoramentoLactente: 'Avaliação clínica do crescimento; dosar TSH/T4L do lactente apenas se doses maternas forem elevadas ou houver sintomas.'
  },
  {
    id: 'PREDNISONA',
    nomeGenerico: 'Prednisona / Prednisolona',
    sinonimos: ['Meticorten', 'Prelone', 'Predsim'],
    classeTerapeutica: 'Corticosteroide Sistêmico de Ação Intermediária',
    hale: 'L2',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '0.1% a 1.8% (Em doses até 40mg/dia é < 0.5%)',
      ligacaoProteica: '70% a 90% (ligada à transcortina/CBG)',
      meiaVidaAdulto: '2 a 3 horas',
      biodisponibilidadeOral: '80% a 90%',
      pesoMolecular: 358,
      observacaoPK: 'Em doses acima de 40 mg/dia, a transcortina plasmática satura e a fração livre aumenta temporariamente nas primeiras 2 horas pós-dose.'
    },
    mecanismoRisco: 'Insignificante em doses <= 40 mg/dia.',
    efeitosAdversosLactente: [
      'Nenhum efeito sobre o eixo hipotálamo-hipófise-adrenal ou crescimento em doses habituais.'
    ],
    condutaClinica: 'CORTICOIDE DE ESCOLHA NA LACTAÇÃO (Hale L2 / MS Verde). Doses até 40 mg/dia são imediatamente compatíveis. Regra prática de prova: se a mãe necessitar de doses altas (> 40-80 mg/dia ou pulsoterapia), orientar aguardar 4 horas após a tomada/infusão antes de amamentar (após 4h os níveis no leite já caíram drasticamente).',
    alternativasSeguras: ['Metilprednisolona (L2 / Verde)', 'Hidrocortisona', 'Budesonida'],
    monitoramentoLactente: 'Em uso materno crônico de altas doses: acompanhar curva de crescimento estatural.'
  },
  {
    id: 'LORATADINA',
    nomeGenerico: 'Loratadina / Desloratadina',
    sinonimos: ['Claritin', 'Desalex', 'Histadin', 'Loralerg'],
    classeTerapeutica: 'Anti-histamínico H1 de 2ª Geração (Não Sedativo)',
    hale: 'L1',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '0.3% a 1.1%',
      ligacaoProteica: '97% (loratadina) / 85% (desloratadina)',
      meiaVidaAdulto: '8.4 horas (desloratadina: 27 horas)',
      biodisponibilidadeOral: 'Alta (intenso metabolismo de 1ª passagem)',
      pesoMolecular: 382,
      observacaoPK: 'Não atravessa a barreira hematoencefálica e tem mínima transferência láctea.'
    },
    mecanismoRisco: 'Nulo.',
    efeitosAdversosLactente: [
      'Nenhum (não causa sedação no lactente nem reduz a produção de leite em doses padrão).'
    ],
    condutaClinica: 'ANTI-HISTAMÍNICO DE ESCOLHA NA LACTAÇÃO (Hale L1 / MS Verde). Preferir sempre anti-histamínicos de 2ª geração (Loratadina, Desloratadina, Fexofenadina, Cetirizina) em vez dos de 1ª geração (Dexclorfeniramina, Prometazina), pois os de 1ª geração causam sonolência no bebê e podem reduzir a prolactina em altas doses.',
    alternativasSeguras: ['Fexofenadina (Allegra - L2 / Verde, RID 0.45%)', 'Cetirizina (Zyrtec - L2 / Verde)', 'Desloratadina'],
    monitoramentoLactente: 'Nenhum.'
  },
  {
    id: 'OMEPRAZOL',
    nomeGenerico: 'Omeprazol / Pantoprazol',
    sinonimos: ['Losec', 'Peprazol', 'Pantozol', 'Tecta'],
    classeTerapeutica: 'Inibidor da Bomba de Prótons (IBP)',
    hale: 'L2',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '0.1% a 0.5%',
      ligacaoProteica: '95% a 98%',
      meiaVidaAdulto: '0.5 a 1 hora',
      biodisponibilidadeOral: 'Destruído pelo ácido gástrico do bebê! (O comprimido materno tem revestimento entérico, mas a molécula livre no leite é inativada no estômago do lactente)',
      pesoMolecular: 345,
      observacaoPK: 'Fármaco ácido-lábil: qualquer traço excretado no leite materno é imediatamente degradado pelo pH ácido do estômago do recém-nascido antes de ser absorvido.'
    },
    mecanismoRisco: 'Zero.',
    efeitosAdversosLactente: [
      'Nenhum.'
    ],
    condutaClinica: 'TOTALMENTE COMPATÍVEL (Hale L2 / MS Verde). Primeira escolha para doença do refluxo gastroesofágico (DRGE), gastrite e profilaxia de úlcera por uso de AINEs no puerpério.',
    alternativasSeguras: ['Pantoprazol', 'Esomeprazol', 'Famotidina', 'Hidróxido de Alumínio/Magnésio (absorção zero)'],
    monitoramentoLactente: 'Nenhum.'
  },
  {
    id: 'ONDANSETRONA',
    nomeGenerico: 'Ondansetrona',
    sinonimos: ['Zofran', 'Vonau Flash', 'Nausedron'],
    classeTerapeutica: 'Antiemético Antagonista Seletivo do Receptor 5-HT3',
    hale: 'L2',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '1.6% a 3.3%',
      ligacaoProteica: '70% a 76%',
      meiaVidaAdulto: '3 a 6 horas',
      biodisponibilidadeOral: '60%',
      pesoMolecular: 293,
      observacaoPK: 'Excreção láctea baixa e meia-vida curta.'
    },
    mecanismoRisco: 'Mínimo. Diferente da Metoclopramida e da Bromoprida, a Ondansetrona não bloqueia receptores dopaminérgicos D2, portanto NÃO causa sintomas extrapiramidais no lactente.',
    efeitosAdversosLactente: [
      'Nenhum efeito adverso documentado.'
    ],
    condutaClinica: 'ANTIEMÉTICO DE ESCOLHA NA LACTAÇÃO (Hale L2 / MS Verde). Excelente segurança para náuseas e vômitos pós-cesárea/raquianestesia ou gastroenterites maternas.',
    alternativasSeguras: ['Dimenidrinato', 'Meclizina', 'Domperidona (L1 / Verde - não cruza barreira hematoencefálica e ainda atua como galactagogo)'],
    monitoramentoLactente: 'Nenhum.'
  },
  {
    id: 'CARBAMAZEPINA',
    nomeGenerico: 'Carbamazepina',
    sinonimos: ['Tegretol', 'Tegretol CR', 'Tegretard'],
    classeTerapeutica: 'Anticonvulsivante / Estabilizador do Humor / Antineurálgico',
    hale: 'L2',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '3.8% a 5.9% (incluindo o metabólito 10,11-epóxido)',
      ligacaoProteica: '75%',
      meiaVidaAdulto: '12 a 17 horas (em uso crônico por autoindução enzimática)',
      biodisponibilidadeOral: '75% a 85%',
      pesoMolecular: 236,
      observacaoPK: 'Estudos prospectivos de longo prazo (NEAD Study) demonstraram que crianças amamentadas por mães em uso de carbamazepina tiveram QI igual ou superior às não amamentadas.'
    },
    mecanismoRisco: 'Baixo. Risco raro e idiossincrático de colestase transitória no recém-nascido.',
    efeitosAdversosLactente: [
      'Sonolência leve ou sucção fraca nos primeiros dias (incomum)',
      'Disfunção hepática colestática transitória e reversível (raros relatos de caso)'
    ],
    condutaClinica: 'COMPATÍVEL (Hale L2 / MS Verde). Anticonvulsivante seguro para manutenção do aleitamento materno em epilepsia e neuralgia do trigêmeo.',
    alternativasSeguras: ['Ácido Valproico', 'Fenitoína', 'Levetiracetam'],
    monitoramentoLactente: 'Observar ganho ponderal, nível de alerta e presença de icterícia prolongada (se icterícia colestática: dosar bilirrubinas frações e TGO/TGP).'
  },
  {
    id: 'ACIDO_VALPROICO',
    nomeGenerico: 'Ácido Valproico / Valproato de Sódio / Divalproato',
    sinonimos: ['Depakene', 'Depakote', 'Torval CR'],
    classeTerapeutica: 'Anticonvulsivante / Estabilizador do Humor',
    hale: 'L2',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '0.99% a 2.8% (Muito baixo!)',
      ligacaoProteica: '90% a 95%',
      meiaVidaAdulto: '9 a 16 horas',
      biodisponibilidadeOral: '90% a 100%',
      pesoMolecular: 144,
      observacaoPK: 'Pegadinha clássica de residência: Altamente teratogênico na gestação (defeitos do tubo neural e redução de QI fetal), mas na LACTAÇÃO tem passagem mínima (< 3%) por ser ácido e > 90% ligado à albumina!'
    },
    mecanismoRisco: 'Risco teórico raro de hepatotoxicidade ou plaquetopenia idiossincrática.',
    efeitosAdversosLactente: [
      'Púrpura trombocitopênica / anemia leve (1 relato isolado reversível)',
      'Desenvolvimento cognitivo aos 3 e 6 anos é normal e superior nos amamentados.'
    ],
    condutaClinica: 'COMPATÍVEL NA LACTAÇÃO (Hale L2 / MS Verde). Excelente opção para puérperas com transtorno afetivo bipolar (substituindo o Lítio) ou epilepsia generalizada (garantir contracepção altamente eficaz concomitante, como DIU ou Implante, pelo risco teratogênico em nova gravidez).',
    alternativasSeguras: ['Carbamazepina', 'Levetiracetam'],
    monitoramentoLactente: 'Vigiar icterícia ou petéquias/equimoses.'
  },
  {
    id: 'DESOGESTREL',
    nomeGenerico: 'Desogestrel / Noretisterona / Medroxiprogesterona (Progestagênios Isolados)',
    sinonimos: ['Cerazette', 'Nactali', 'Pérola', 'Micronor', 'Depo-Provera', 'Implanon', 'Mirena'],
    classeTerapeutica: 'Contraceptivo Hormonal Exclusivo de Progestagênio (Minipílula / Injetável Trimestral / SIU / Implante)',
    hale: 'L1',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '0.8% a 1.7%',
      ligacaoProteica: '96% a 99% (ligado à SHBG e albumina)',
      meiaVidaAdulto: '30 horas (etonogestrel, metabólito ativo do desogestrel)',
      biodisponibilidadeOral: '70% a 80%',
      pesoMolecular: 310,
      observacaoPK: 'Ao contrário do estrogênio, a progesterona isolada NÃO inibe a prolactina nem reduz o volume ou qualidade do leite materno.'
    },
    mecanismoRisco: 'Inexistente.',
    efeitosAdversosLactente: [
      'Nenhum efeito sobre o crescimento, ganho de peso ou desenvolvimento puberal/neuropsicomotor.'
    ],
    condutaClinica: 'CONTRACEPTIVO HORMONAL DE ESCOLHA NA LACTAÇÃO (Hale L1-L2 / MS Verde / OMS Categoria 1-2). Pode ser iniciado no pós-parto sem prejuízo à amamentação.',
    alternativasSeguras: ['DIU de Cobre', 'DIU de Levonorgestrel (Mirena/Kyleena)', 'Implante Subdérmico de Etonogestrel (Implanon)'],
    monitoramentoLactente: 'Nenhum.'
  },
  {
    id: 'ACICLOVIR',
    nomeGenerico: 'Aciclovir / Valaciclovir',
    sinonimos: ['Zovirax', 'Valtrex', 'Antivirax'],
    classeTerapeutica: 'Antiviral Análogo de Nucleosídeo (Anti-herpético)',
    hale: 'L2',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '1% a 1.5%',
      ligacaoProteica: '9% a 33%',
      meiaVidaAdulto: '2.5 a 3.3 horas',
      biodisponibilidadeOral: '15% a 30% (Muito baixa! Mesmo concentrando no leite, o bebê quase não absorve por via oral)',
      pesoMolecular: 225,
      observacaoPK: 'A biodisponibilidade enteral de apenas ~20% protege o lactente: a dose absorvida equivale a menos de 1% da dose terapêutica neonatal usada em herpes neonatal.'
    },
    mecanismoRisco: 'Desprezível.',
    efeitosAdversosLactente: [
      'Nenhum efeito adverso documentado.'
    ],
    condutaClinica: 'TOTALMENTE COMPATÍVEL (Hale L2 / MS Verde). Seguro por via oral, tópica ou endovenosa. Atenção obstétrica: a amamentação só deve ser suspensa na mama afetada caso haja lesões herpéticas vesiculares ativas diretamente no mamilo/aréola (pelo risco de transmissão por contato direto do vírus HSV, e não pelo medicamento).',
    alternativasSeguras: ['Valaciclovir (L1 / Verde)'],
    monitoramentoLactente: 'Inspecionar mamas para garantir ausência de lesões herpéticas mamilares abertas.'
  },
  {
    id: 'AZATIOPRINA',
    nomeGenerico: 'Azatioprina',
    sinonimos: ['Imuran', 'Imunen'],
    classeTerapeutica: 'Imunossupressor Antimetabólito (Pró-fármaco da 6-Mercaptopurina)',
    hale: 'L3',
    ms: 'VERDE',
    farmacocinetica: {
      ridPercent: '0.07% a 0.3% (Extremamente baixo!)',
      ligacaoProteica: '30%',
      meiaVidaAdulto: '0.2 a 0.5 horas (6-MP: 1.5 horas)',
      biodisponibilidadeOral: 'Baixa (sofre extensa inativação pela xantina-oxidase intestinal e hepática)',
      pesoMolecular: 277,
      observacaoPK: 'Pico máximo no leite ocorre nas primeiras 2 horas e desaparece em 4 horas; na maioria dos lactentes os metabólitos 6-TGN e 6-MMP são indetectáveis no sangue.'
    },
    mecanismoRisco: 'Risco teórico de mielossupressão apenas se o lactente possuir deficiência homozigótica da enzima TPMT (tiopurina metiltransferase - raríssimo, 0.3% da população).',
    efeitosAdversosLactente: [
      'Estudos em centenas de lactentes mostram ausência de imunossupressão, taxas normais de infecção e resposta vacinal intacta.'
    ],
    condutaClinica: 'COMPATÍVEL (MS Verde / Hale L3 / Diretrizes de Reumatologia, Gastroenterologia e Transplante liberam). Imunossupressor seguro para manutenção em Lúpus, Doença de Crohn, Retocolite Ulcerativa e Transplantadas Renais em doses até 2-2.5 mg/kg/dia.',
    alternativasSeguras: ['Hidroxicloroquina (L2 / Verde)', 'Prednisona', 'Tacrolimo (RID 0.2%)'],
    monitoramentoLactente: 'Opcionalmente aguardar 4 horas após a dose materna para amamentar; hemograma apenas se infecções de repetição.'
  }
];

// ============================================================================
// 3. COMPILAÇÃO E INDEXAÇÃO DE ALTA PERFORMANCE (O(1) LOOKUP)
// ============================================================================

/**
 * Normaliza uma string removendo acentos, caracteres especiais e espaços extras,
 * convertendo para UPPERCASE para matching determinístico sub-1ms.
 * @param {string} str 
 * @returns {string}
 */
function normalizarTermo(str) {
  if (typeof str !== 'string') return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Congela recursivamente objetos e arrays para garantir imutabilidade de domínio.
 * @param {Object} obj 
 * @returns {Object}
 */
function deepFreeze(obj) {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    Object.keys(obj).forEach((key) => deepFreeze(obj[key]));
  }
  return obj;
}

// Estruturas internas de indexação em memória
const CATALOGO_MAP = new Map();
const INDICE_SINONIMOS = new Map();
const INDICE_POR_MS = { VERDE: [], AMARELO: [], VERMELHO: [] };
const INDICE_POR_HALE = { L1: [], L2: [], L3: [], L4: [], L5: [] };

// Inicialização imediata (IIFE de indexação)
(function inicializarIndices() {
  for (const rawItem of RAW_DRUG_CATALOG) {
    const itemEnriquecido = deepFreeze({
      ...rawItem,
      detalhesHale: HALE_CATEGORIES[rawItem.hale],
      detalhesMS: MS_CATEGORIES[rawItem.ms],
      podeAmamentar: rawItem.ms !== 'VERMELHO' && rawItem.hale !== 'L5' && rawItem.hale !== 'L4',
      exigeIntervencaoImediata: rawItem.ms === 'VERMELHO' || rawItem.hale === 'L5' || rawItem.hale === 'L4'
    });

    CATALOGO_MAP.set(itemEnriquecido.id, itemEnriquecido);
    INDICE_POR_MS[itemEnriquecido.ms].push(itemEnriquecido);
    INDICE_POR_HALE[itemEnriquecido.hale].push(itemEnriquecido);

    // Indexa pelo ID, pelo nome genérico e por cada sinônimo/nome comercial
    INDICE_SINONIMOS.set(normalizarTermo(itemEnriquecido.id), itemEnriquecido.id);
    INDICE_SINONIMOS.set(normalizarTermo(itemEnriquecido.nomeGenerico), itemEnriquecido.id);

    // Indexa primeiro nome do fármaco (ex: "Varfarina Sódica" -> "VARFARINA")
    const primeiroToken = normalizarTermo(itemEnriquecido.nomeGenerico).split(' ')[0];
    if (primeiroToken && primeiroToken.length >= 3 && !INDICE_SINONIMOS.has(primeiroToken)) {
      INDICE_SINONIMOS.set(primeiroToken, itemEnriquecido.id);
    }

    for (const sinonimo of itemEnriquecido.sinonimos) {
      const normSin = normalizarTermo(sinonimo);
      if (normSin) {
        INDICE_SINONIMOS.set(normSin, itemEnriquecido.id);
      }
    }
  }

  deepFreeze(INDICE_POR_MS);
  deepFreeze(INDICE_POR_HALE);
})();

// ============================================================================
// 4. API PÚBLICA DE CONSULTA E SUPORTE À DECISÃO CLÍNICA
// ============================================================================

/**
 * Consulta um medicamento pelo nome genérico, nome comercial, sigla ou ID.
 * Executa busca exata O(1) seguida de fallback por tokenização rápida.
 * 
 * @param {string} termoBusca - Nome do medicamento (ex: "Marevan", "Amiodarona", "AAS")
 * @returns {Object|null} Objeto completo de segurança na lactação ou null se não encontrado.
 */
function consultarMedicamento(termoBusca) {
  const termo = normalizarTermo(termoBusca);
  if (!termo) return null;

  // 1. Hit direto O(1) no mapa de sinônimos/nomes
  if (INDICE_SINONIMOS.has(termo)) {
    return CATALOGO_MAP.get(INDICE_SINONIMOS.get(termo));
  }

  // 2. Hit pelo primeiro token da prescrição (ex: "CEFALEXINA 500MG VO 6/6H" -> "CEFALEXINA")
  const tokens = termo.split(' ');
  for (const token of tokens) {
    if (token.length >= 3 && INDICE_SINONIMOS.has(token)) {
      return CATALOGO_MAP.get(INDICE_SINONIMOS.get(token));
    }
  }

  // 3. Fallback por substring em chaves indexadas (ainda < 0.2ms para ~200 chaves)
  for (const [chaveIndexada, idMedicamento] of INDICE_SINONIMOS.entries()) {
    if (chaveIndexada.includes(termo) || (termo.length >= 4 && termo.includes(chaveIndexada))) {
      return CATALOGO_MAP.get(idMedicamento);
    }
  }

  return null;
}

/**
 * Avalia uma prescrição médica completa (lista de medicamentos) para uma puérpera/nutriz,
 * classificando o risco global, identificando contraindicações e sugerindo substituições.
 * 
 * @param {string[]} listaPrescricao - Array de strings com os medicamentos prescritos.
 * @param {Object} [contextoClinico] - Contexto opcional do lactente (ex: { prematuro: true, idadeDias: 10, deficienciaG6PD: false })
 * @returns {Object} Parecer farmacológico estruturado.
 */
function avaliarPrescricaoNutriz(listaPrescricao, contextoClinico = {}) {
  if (!Array.isArray(listaPrescricao)) {
    throw new TypeError('A prescrição deve ser fornecida como um Array de strings.');
  }

  const inicioNs = process.hrtime.bigint();
  const isPrematuroOuRN = Boolean(contextoClinico.prematuro || (typeof contextoClinico.idadeDias === 'number' && contextoClinico.idadeDias < 30));

  const contraindicados = [];
  const usoCriterioso = [];
  const seguros = [];
  const naoIdentificados = [];
  const alertasEspeciais = [];

  let contadorSedativosSNC = 0;

  for (const itemBruto of listaPrescricao) {
    const farmaco = consultarMedicamento(itemBruto);

    if (!farmaco) {
      naoIdentificados.push(itemBruto);
      continue;
    }

    // Checagem de soma de psicotrópicos/opioides sedativos
    if (
      farmaco.classeTerapeutica.includes('Benzodiazepínico') ||
      farmaco.classeTerapeutica.includes('Opioide') ||
      farmaco.classeTerapeutica.includes('Barbitúrico') ||
      farmaco.classeTerapeutica.includes('Antipsicótico')
    ) {
      contadorSedativosSNC++;
    }

    // Alertas específicos para prematuros/RN < 30 dias
    if (isPrematuroOuRN && (farmaco.ms === 'AMARELO' || farmaco.id === 'ENALAPRIL')) {
      alertasEspeciais.push(
        `[ALERTA NEONATAL - ${farmaco.nomeGenerico}]: Lactente prematuro ou < 30 dias possui clearance renal e glucuronidação hepática reduzidos. Risco elevado de bioacumulação (${farmaco.farmacocinetica.meiaVidaAdulto}).`
      );
    }

    if (farmaco.exigeIntervencaoImediata) {
      contraindicados.push({
        termoPrescrito: itemBruto,
        medicamento: farmaco.nomeGenerico,
        hale: farmaco.hale,
        ms: farmaco.ms,
        motivo: farmaco.mecanismoRisco,
        efeitosNoBebe: farmaco.efeitosAdversosLactente,
        conduta: farmaco.condutaClinica,
        substitutosSugeridos: farmaco.alternativasSeguras
      });
    } else if (farmaco.ms === 'AMARELO' || (farmaco.hale === 'L3' && farmaco.ms !== 'VERDE')) {
      usoCriterioso.push({
        termoPrescrito: itemBruto,
        medicamento: farmaco.nomeGenerico,
        hale: farmaco.hale,
        ms: farmaco.ms,
        rid: farmaco.farmacocinetica.ridPercent,
        conduta: farmaco.condutaClinica,
        monitoramento: farmaco.monitoramentoLactente,
        substitutosMaisSeguros: farmaco.alternativasSeguras
      });
    } else {
      seguros.push({
        termoPrescrito: itemBruto,
        medicamento: farmaco.nomeGenerico,
        hale: farmaco.hale,
        ms: farmaco.ms,
        rid: farmaco.farmacocinetica.ridPercent,
        conduta: farmaco.condutaClinica
      });
    }
  }

  if (contadorSedativosSNC >= 2) {
    alertasEspeciais.push(
      '[ALERTA DE POLIFARMÁCIA NO SNC]: Prescrição contém 2 ou mais fármacos depressores do SNC. O risco de sedação neonatal, apneia e sucção débil é sinérgico, mesmo que cada fármaco isolado seja L2/L3.'
    );
  }

  let statusGlobal = 'PRESCRIÇÃO SEGURA PARA AMAMENTAÇÃO (VERDE)';
  let recomendacaoMestre = 'Manter aleitamento materno em livre demanda.';

  if (contraindicados.length > 0) {
    statusGlobal = 'CONTRAINDICAÇÃO DETECTADA (VERMELHO / L4-L5)';
    recomendacaoMestre = 'Intervenção farmacêutica/médica obrigatória: substituir os fármacos contraindicados pelas alternativas listadas ou suspender o aleitamento materno caso o fármaco seja vital e insubstituível.';
  } else if (usoCriterioso.length > 0) {
    statusGlobal = 'PRESCRIÇÃO EXIGE MONITORAMENTO CLÍNICO (AMARELO / L3)';
    recomendacaoMestre = 'Amamentação permitida sob vigilância clínica do lactente. Avaliar substituição por alternativas L1/L2 (Verde) caso o lactente seja prematuro ou apresente efeitos adversos.';
  }

  const fimNs = process.hrtime.bigint();
  const tempoExecucaoMs = Number(fimNs - inicioNs) / 1e6;

  return {
    statusGlobal,
    recomendacaoMestre,
    tempoProcessamentoMs: Number(tempoExecucaoMs.toFixed(4)),
    resumoQuantitativo: {
      totalAnalisados: listaPrescricao.length,
      segurosCount: seguros.length,
      usoCriteriosoCount: usoCriterioso.length,
      contraindicadosCount: contraindicados.length,
      naoIdentificadosCount: naoIdentificados.length
    },
    alertasEspeciais,
    contraindicados,
    usoCriterioso,
    seguros,
    naoIdentificados
  };
}

/**
 * Filtra o catálogo por classificação do Ministério da Saúde (VERDE, AMARELO, VERMELHO).
 * @param {'VERDE'|'AMARELO'|'VERMELHO'} corMS 
 * @returns {Array<Object>}
 */
function listarPorCategoriaMS(corMS) {
  const chave = normalizarTermo(corMS);
  return INDICE_POR_MS[chave] || [];
}

/**
 * Filtra o catálogo por Categoria de Risco de Hale (L1, L2, L3, L4, L5).
 * @param {'L1'|'L2'|'L3'|'L4'|'L5'} categoriaHale 
 * @returns {Array<Object>}
 */
function listarPorCategoriaHale(categoriaHale) {
  const chave = normalizarTermo(categoriaHale);
  return INDICE_POR_HALE[chave] || [];
}

/**
 * Retorna estatísticas e metadados do banco de dados farmacológico.
 * @returns {Object}
 */
function obterMetadadosCatalogo() {
  return {
    totalMedicamentos: CATALOGO_MAP.size,
    totalTermosIndexados: INDICE_SINONIMOS.size,
    distribuicaoMS: {
      VERDE: INDICE_POR_MS.VERDE.length,
      AMARELO: INDICE_POR_MS.AMARELO.length,
      VERMELHO: INDICE_POR_MS.VERMELHO.length
    },
    distribuicaoHale: {
      L1: INDICE_POR_HALE.L1.length,
      L2: INDICE_POR_HALE.L2.length,
      L3: INDICE_POR_HALE.L3.length,
      L4: INDICE_POR_HALE.L4.length,
      L5: INDICE_POR_HALE.L5.length
    },
    referencias: [
      'Hale TW. Medications and Mothers Milk. Springer Publishing.',
      'Brasil. Ministério da Saúde. Amamentação e uso de medicamentos e outras substâncias. 2ª ed.',
      'LactMed Database - National Library of Medicine (NIH).',
      'Protocolos Clínicos de Obstetrícia e Puerpério FEBRASGO / SBP / Ministério da Saúde.'
    ]
  };
}

function formatarCardLactacao(farmaco) {
  if (!farmaco) return '⚠️ Medicamento não localizado no catálogo de segurança da lactação.';
  const emojiMs = farmaco.ms === 'VERMELHO' ? '🔴' : (farmaco.ms === 'AMARELO' ? '🟡' : '🟢');
  const linhas = [
    `🤰🤱 *Segurança na Lactação · ${farmaco.nomeGenerico}*`,
    `🏷️ *Classe:* ${farmaco.classeTerapeutica}`,
    `🚦 *Ministério da Saúde:* ${emojiMs} ${farmaco.ms} — ${farmaco.detalhesMS ? farmaco.detalhesMS.status : farmaco.ms}`,
    `📖 *Classificação Hale:* *${farmaco.hale}* (${farmaco.detalhesHale ? farmaco.detalhesHale.titulo : farmaco.hale})`,
    `⚖️ *RID:* ${farmaco.farmacocinetica ? farmaco.farmacocinetica.ridPercent : 'N/D'} | *Lig. Proteica:* ${farmaco.farmacocinetica ? farmaco.farmacocinetica.ligacaoProteica : 'N/D'}`,
    '',
    `⚠️ *Mecanismo de Risco:* ${farmaco.mecanismoRisco}`
  ];
  if (farmaco.efeitosAdversosLactente && farmaco.efeitosAdversosLactente.length) {
    linhas.push(`👶 *Efeitos no Lactente:* ${farmaco.efeitosAdversosLactente.join('; ')}`);
  }
  linhas.push('', `💡 *Conduta Clínica:* ${farmaco.condutaClinica}`);
  if (farmaco.alternativasSeguras && farmaco.alternativasSeguras.length) {
    linhas.push(`✅ *Alternativas Seguras (1ª Escolha):* ${farmaco.alternativasSeguras.join(', ')}`);
  }
  if (farmaco.monitoramentoLactente) {
    linhas.push(`🔍 *Monitoramento:* ${farmaco.monitoramentoLactente}`);
  }
  return linhas.filter(Boolean).join('\n');
}

function obterGuiaRapidoClasses() {
  return [
    '🤰🤱 *Guia Rápido de 1ª Escolha na Lactação (FEBRASGO / SBP / MS)*',
    '',
    '🟢 *1. Analgesia & Febre:*',
    '• *Paracetamol* (Hale L1 / Verde MS) — Máx 4g/dia',
    '• *Ibuprofeno* (Hale L1 / Verde MS) — Melhor AINE na lactação (< 0.6% RID)',
    '• *Dipirona* (Verde MS / Hale L3) — Uso consagrado no Brasil',
    '❌ *Evitar:* Codeína e Tramadol (risco fatal de depressão respiratória se metabolizadora rápida CYP2D6).',
    '',
    '🟢 *2. Antibióticos de 1ª Linha:*',
    '• *Cefalexina* (L1 / Verde), *Amoxicilina* (L1 / Verde), *Amoxicilina + Clavulanato* (L1 / Verde)',
    '• *Ceftriaxona* (L2 / Verde), *Azitromicina* (L2 / Verde)',
    '⚠️ *Cautela:* Ciprofloxacino (Amarelo) e Bactrim (contraindicado em RN < 2 meses ou G6PD).',
    '',
    '🟢 *3. Anti-hipertensivos no Puerpério:*',
    '• *Enalapril* (L2 / Verde) — Padrão-ouro no puerpério',
    '• *Nifedipino retard / Anlodipino* (L2 / Verde)',
    '• *Metoprolol* (L2 / Verde) — Preferível ao Atenolol',
    '❌ *Evitar:* Metildopa no puerpério (risco de desencadear depressão pós-parto) e Atenolol.',
    '',
    '🟢 *4. Antidepressivos (Saúde Mental Perinatal):*',
    '• *Sertralina* (L2 / Verde) — Padrão-ouro absoluto (níveis séricos no bebê indetectáveis)',
    '• *Paroxetina* (L2 / Verde)',
    '⚠️ *Evitar:* Fluoxetina (meia-vida longa de até 14 dias; acúmulo no RN) e Lítio.',
    '',
    '🟢 *5. Anticoagulação:*',
    '• *Enoxaparina / HNF* (L1 / Verde) — Não passam para o leite (alto peso molecular)',
    '• *Varfarina* (L2 / Verde) — 99% ligada a proteínas, segura na amamentação',
    '❌ *Evitar:* DOACs (Rivaroxabana/Apixabana) e Fenindiona.'
  ].join('\n');
}

// ============================================================================
// 5. EXPORTAÇÃO DO MÓDULO (COMMONJS)
// ============================================================================

var LactacaoSegurancaService = Object.freeze({
  HALE_CATEGORIES,
  MS_CATEGORIES,
  consultarMedicamento,
  avaliarPrescricaoNutriz,
  listarPorCategoriaMS,
  listarPorCategoriaHale,
  obterMetadadosCatalogo,
  normalizarTermo,
  formatarCardLactacao,
  obterGuiaRapidoClasses
});
var LactacaoSegurancaDomain = LactacaoSegurancaService;
if (typeof module !== 'undefined' && module.exports) module.exports = LactacaoSegurancaService;