/**
 * ==============================================================================
 * ULTRA ROTINA · COMPATIBILIDADE EM Y E DILUIÇÃO DE VASOATIVOS & INOTRÓPICOS (D1)
 * ==============================================================================
 * Motor determinístico em RAM para auditoria de infusões combinadas em bomba
 * de infusão contínua (BIC) e checagem de compatibilidade em Y (Y-site) beira-leito.
 * 
 * Referências e Diretrizes Clínicas Oficiais:
 * - Trissel's Stability of Compounded Formulations & Handbook on Injectable Drugs (ASHP)
 * - Guia Farmacêutico Hospital Sírio-Libanês (HSL)
 * - Diretrizes de Terapia Intensiva AMIB / Surviving Sepsis Campaign (SSC)
 * - AHA / ACC / ESC Guidelines for Acute Heart Failure and Shock
 * ==============================================================================
 */

var CompatibilidadeYDvaService = (function() {
  'use strict';

  // 1. DILUENTES PADRÃO, ACESSO VENOSO E ESTABILIDADE DE DROGAS VASOATIVAS E DE UTI (D1)
  var FICHAS_DILUICAO_DVA = {
    noradrenalina: {
      id: 'noradrenalina',
      nome: 'Hemitartarato de Norepinefrina / Noradrenalina',
      classe: 'Vasopressor (Agonista Alfa-1 e Beta-1 Adrenérgico)',
      diluenteD1: 'Soro Glicosado 5% (SG 5%) PREFERENCIAL',
      diluenteDetalhes: 'O SG 5% é o diluente de escolha porque o pH ácido e a glicose protegem a noradrenalina contra a oxidação rápida que ocorre em soluções com pH neutro/básico. O SF 0,9% pode ser utilizado temporariamente em emergências caso o SG 5% não esteja disponível, mas a estabilidade prolongada é superior em SG 5%.',
      solucoesCompativeis: ['SG 5%', 'SG 5% em SF 0,9%', 'SF 0,9% (emergência)'],
      solucoesIncompativeis: ['Soluções alcalinas (Bicarbonato de Sódio 8,4%)', 'Soluções com pH > 5.5'],
      concentracaoUsual: 'Padrão: 64 mcg/mL (4 amp / 16 mg em 234 mL SG5%). Concentrada: 128 mcg/mL (8 amp / 32 mg em 218 mL SG5%).',
      acessoVenoso: 'Acesso Venoso Central (CVC) MANDATÓRIO. Em situações de choque extremo e ausência de via central imediata, pode ser infundida em acesso periférico calibroso de antebraço por no máximo 2 a 4 horas com vigilância contínua contra extravasamento.',
      antidotoExtravasamento: 'Fentolamina injetável 5-10 mg diluída em 10 mL de SF infiltrada localmente na área de extravasamento para prevenir necrose isquêmica.',
      estabilidade: '24 horas em temperatura ambiente (15-30°C) sob proteção de luz solar direta.',
      monitorizacao: 'Pressão Arterial Média (alvo PAM ≥ 65 mmHg, preferencialmente invasiva por PAI), perfusão periférica, lactato e diurese.'
    },

    dobutamina: {
      id: 'dobutamina',
      nome: 'Cloridrato de Dobutamina',
      classe: 'Inotrópico (Agonista Beta-1 Adrenérgico com leve Beta-2 e Alfa)',
      diluenteD1: 'Soro Glicosado 5% (SG 5%) ou Soro Fisiológico 0,9% (SF 0,9%)',
      diluenteDetalhes: 'Compatível tanto com SG 5% quanto com SF 0,9% ou Ringer Lactato. Incompatível com soluções alcalinas como Bicarbonato de Sódio.',
      solucoesCompativeis: ['SG 5%', 'SF 0,9%', 'Ringer Lactato'],
      solucoesIncompativeis: ['Bicarbonato de Sódio 8,4%', 'Soluções alcalinas', 'Gluconato de Cálcio (cautela)'],
      concentracaoUsual: 'Padrão: 1.000 mcg/mL (1 amp [250 mg/20 mL] em 230 mL SG5% ou SF). Concentrada: 2.000 mcg/mL (2 amp [500 mg] em 210 mL SG5%).',
      acessoVenoso: 'Acesso Venoso Central preferencial. Pode ser infundida em veia periférica calibrosa de antebraço com monitorização vascular.',
      antidotoExtravasamento: 'Elevação do membro e compressa morna. Dobutamina tem menor potencial vesicante que noradrenalina.',
      estabilidade: '24 horas após diluição. A solução pode adquirir coloração levemente rosada por oxidação superficial sem perda relevante de potência; soluções muito escuras ou com precipitados devem ser descartadas.',
      monitorizacao: 'ECG contínuo (risco de taquiarritmias e extrassistolia), PAM (pode induzir vasodilatação inicial em pacientes hipovolêmicos).'
    },

    vasopressina: {
      id: 'vasopressina',
      nome: 'Arginina Vasopressina / Hormônio Antidiurético (AVP)',
      classe: 'Vasopressor Não-Adrenérgico (Agonista V1a e V2)',
      diluenteD1: 'Soro Fisiológico 0,9% (SF 0,9%) ou Soro Glicosado 5% (SG 5%)',
      diluenteDetalhes: 'Compatível com SF 0,9% e SG 5%. Diluição padronizada de 20 UI (1 ampola de 1 mL) em 99 mL de SF 0,9% para concentração de 0,2 UI/mL.',
      solucoesCompativeis: ['SF 0,9%', 'SG 5%'],
      solucoesIncompativeis: ['Bicarbonato de Sódio 8,4%', 'Soluções alcalinas'],
      concentracaoUsual: 'Padrão: 0,2 UI/mL (1 ampola [20 UI] em 99 mL SF 0,9% ou SG 5%).',
      acessoVenoso: 'Acesso Venoso Central obrigatório. Potente vasoconstritor periférico.',
      antidotoExtravasamento: 'Fentolamina ou nitroglicerina tópica sob supervisão médica.',
      estabilidade: '24 horas em temperatura ambiente (15-25°C) após diluição.',
      monitorizacao: 'PAM (alvo ≥ 65 mmHg), perfusão digital e mesentérica. Dose fixa de 0,01 a 0,04 UI/min (usual 0,03 UI/min = 9 mL/h em BIC). NÃO TITULAR como catecolamina.'
    },

    adrenalina: {
      id: 'adrenalina',
      nome: 'Epinefrina / Adrenalina',
      classe: 'Vasopressor e Inotrópico Potente (Agonista Alfa-1, Beta-1 e Beta-2)',
      diluenteD1: 'Soro Glicosado 5% (SG 5%) PREFERENCIAL',
      diluenteDetalhes: 'SG 5% protege contra oxidação rápida. SF 0,9% aceito em emergências. Proteger de luz excessiva.',
      solucoesCompativeis: ['SG 5%', 'SF 0,9%'],
      solucoesIncompativeis: ['Bicarbonato de Sódio 8,4%', 'Soluções alcalinas'],
      concentracaoUsual: 'Padrão: 16 mcg/mL (4 ampolas [4 mg] em 246 mL SG 5%). Concentrada: 32 mcg/mL (8 ampolas em 242 mL SG 5%).',
      acessoVenoso: 'Acesso Venoso Central mandatório para infusão contínua. Em PCR e anafilaxia grave, administrada em bolus periférico/intraósseo.',
      antidotoExtravasamento: 'Fentolamina infiltrativa 5-10 mg diluída em 10 mL de SF.',
      estabilidade: '24 horas protegida da luz solar direta.',
      monitorizacao: 'ECG (taquicardia severa), PAM, lactato (induz hiperlactatemia glicolítica tipo B que não reflete necessariamente hipóxia tecidual).'
    },

    milrinona: {
      id: 'milrinona',
      nome: 'Lactato de Milrinona',
      classe: 'Inodilatador (Inibidor Seletivo da Fosfodiesterase III)',
      diluenteD1: 'Soro Fisiológico 0,9% (SF 0,9%) ou Soro Glicosado 5% (SG 5%)',
      diluenteDetalhes: 'Compatível com SF 0,9% e SG 5%. Altamente incompatível com Furosemida (precipita imediatamente no equipo).',
      solucoesCompativeis: ['SF 0,9%', 'SG 5%'],
      solucoesIncompativeis: ['Furosemida (precipitação física imediata de cristais)', 'Bicarbonato de Sódio'],
      concentracaoUsual: '200 mcg/mL (1 ampola [20 mg/20 mL] em 80 mL de SF ou SG 5% para volume final de 100 mL).',
      acessoVenoso: 'Acesso Central preferencial. Vasodilatador sistêmico e pulmonar.',
      antidotoExtravasamento: 'Não vesicante grave.',
      estabilidade: '72 horas diluída em temperatura ambiente.',
      monitorizacao: 'Pressão arterial (risco de vasodilatação e hipotensão severa; não usar se PAS < 85-90 mmHg sem vasopressor), função renal (excreção renal > 85%, exige ajuste estrito se ClCr < 50 mL/min).'
    },

    nitroprussiato: {
      id: 'nitroprussiato',
      nome: 'Nitroprussiato de Sódio',
      classe: 'Vasodilatador Direto Arterial e Venoso',
      diluenteD1: 'Soro Glicosado 5% (SG 5%) EXCLUSIVO',
      diluenteDetalhes: 'Deve ser diluído EXCLUSIVAMENTE em SG 5%. Os íons cloreto presentes no Soro Fisiológico (SF 0,9%) desestabilizam a molécula e aumentam a taxa de decomposição. EQUIPO E FRASCO FOTOPROTETOR OBRIGATÓRIOS.',
      solucoesCompativeis: ['SG 5% EXCLUSIVO'],
      solucoesIncompativeis: ['SF 0,9% (incompatível para diluição base)', 'Soluções alcalinas', 'Bicarbonato de Sódio'],
      concentracaoUsual: '200 mcg/mL (1 ampola [50 mg/2 mL] em 248 mL de SG 5%).',
      acessoVenoso: 'Acesso Central preferencial. Requer linha arterial invasiva (PAI) para titulação beira-leito minuto a minuto.',
      antidotoExtravasamento: 'Fotoproteção obrigatória.',
      estabilidade: '24 horas sob rigorosa fotoproteção (frasco e equipo cobertos por invólucro opaco).',
      monitorizacao: 'Pressão Arterial contínua invasiva. Risco severo de toxicidade por tiocianato/cianeto se infusão > 48 horas, doses > 2 mcg/kg/min ou disfunção renal/hepática (manifesta com acidose lática inexplicada e confusão mental).'
    },

    nitroglicerina: {
      id: 'nitroglicerina',
      nome: 'Nitroglicerina (Tridil)',
      classe: 'Vasodilatador Venoso Predominante e Coronariano',
      diluenteD1: 'Soro Glicosado 5% (SG 5%) ou Soro Fisiológico 0,9% (SF 0,9%)',
      diluenteDetalhes: 'Compatível com SG 5% e SF 0,9%. FRASCO DE VIDRO/POLIETILENO E EQUIPO SEM PVC SÃO OBRIGATÓRIOS. O cloreto de polivinila (PVC) adsorve 40% a 80% do fármaco, diminuindo drasticamente a dose entregue.',
      solucoesCompativeis: ['SG 5%', 'SF 0,9%'],
      solucoesIncompativeis: ['Fenitoína', 'Bicarbonato de Sódio'],
      concentracaoUsual: '200 mcg/mL (1 ampola [50 mg/10 mL] em 240 mL de SG 5% ou SF 0,9%).',
      acessoVenoso: 'Acesso periférico ou central. Exige equipo específico livre de PVC.',
      antidotoExtravasamento: 'Sem ação vesicante.',
      estabilidade: '24 horas em frasco de vidro ou polietileno livre de PVC.',
      monitorizacao: 'Pressão arterial, alívio de dor anginosa ou congestão. Contraindicação absoluta: Infarto de VD, PAS < 90 mmHg e uso de inibidores da PDE-5 (Sildenafil nas últimas 24h ou Tadalafil nas últimas 48h).'
    },

    amiodarona: {
      id: 'amiodarona',
      nome: 'Cloridrato de Amiodarona',
      classe: 'Antiarrítmico Classe III (Bloqueador de Canais de Potássio)',
      diluenteD1: 'Soro Glicosado 5% (SG 5%) EXCLUSIVO para Infusão Contínua',
      diluenteDetalhes: 'Para infusão contínua (> 2 horas), diluir EXCLUSIVAMENTE em SG 5%. Em SF 0,9%, ocorre instabilidade físico-química e precipitação com formação de microcristais. Concentrações superiores a 2 mg/mL exigem Acesso Venoso Central para evitar flebite química grave.',
      solucoesCompativeis: ['SG 5% EXCLUSIVO para manutenção'],
      solucoesIncompativeis: ['SF 0,9% (instável em infusões contínuas)', 'Bicarbonato de Sódio', 'Heparina (precipita)', 'Furosemida (precipita)'],
      concentracaoUsual: 'Ataque: 150-300 mg em 100 mL SG 5% em 10-20 min. Manutenção: 900 mg (6 ampolas) em 500 mL SG 5% (1,8 mg/mL) em 24h.',
      acessoVenoso: 'Acesso Venoso Central mandatório para infusão contínua > 1h ou concentração > 2 mg/mL (alto risco de flebite e esclerose venosa).',
      antidotoExtravasamento: 'Suspender imediatamente, aplicar compressa fria.',
      estabilidade: '24 horas em frasco de vidro ou poliolefina livre de PVC.',
      monitorizacao: 'ECG contínuo (intervalo QTc, bradicardia sinusal, bloqueios AV) e pressão arterial.'
    },

    furosemida: {
      id: 'furosemida',
      nome: 'Furosemida',
      classe: 'Diurético de Alça (pH Alcalino ~8.5 a 9.5)',
      diluenteD1: 'Soro Fisiológico 0,9% (SF 0,9%) EXCLUSIVO',
      diluenteDetalhes: 'Furosemida é uma solução fortemente alcalina (pH ~8.5-9.5). Quando misturada com soluções ácidas como SG 5% ou em Y com catecolaminas (pH 3-4), ocorre precipitação imediata de cristais de furosemida insolúveis.',
      solucoesCompativeis: ['SF 0,9%'],
      solucoesIncompativeis: ['SG 5% para armazenamento', 'Noradrenalina em Y', 'Dobutamina em Y', 'Milrinona em Y', 'Adrenalina em Y', 'Midazolam em Y', 'Amiodarona em Y'],
      concentracaoUsual: 'Pura ou diluída em SF 0,9% para BIC (ex: 200 mg [20 amp] em 80 mL SF 0,9% = 2 mg/mL).',
      acessoVenoso: 'Acesso periférico ou central. NUNCA INFUNDIR EM Y COM VASOATIVOS.',
      antidotoExtravasamento: 'Compressas.',
      estabilidade: '24 horas protegida da luz em SF 0,9%.',
      monitorizacao: 'Débito urinário, eletrólitos (K+, Mg++, Na+), função renal e pressão arterial.'
    },

    bicarbonato_de_sodio: {
      id: 'bicarbonato_de_sodio',
      nome: 'Bicarbonato de Sódio 8,4% (1 mEq/mL)',
      classe: 'Solução Alcalinizante Hipertônica (pH ~8.0 a 8.5)',
      diluenteD1: 'Uso Puro ou em Soro Glicosado 5% (SG 5%)',
      diluenteDetalhes: 'Solução fortemente alcalina. NUNCA DEVE SER ADMINISTRADA NA MESMA LINHA OU EM Y COM CATECOLAMINAS (noradrenalina, dobutamina, adrenalina) pois o meio alcalino degrada e oxida as catecolaminas em segundos, anulando seu efeito.',
      solucoesCompativeis: ['SG 5%', 'Água para Injeção'],
      solucoesIncompativeis: ['Noradrenalina', 'Dobutamina', 'Adrenalina', 'Gluconato de Cálcio (precipita carbonato de cálcio)', 'Amiodarona', 'Dopamina'],
      concentracaoUsual: 'Solução 8,4% (1 mEq/mL) ou solução isotônica a 1,4% em SG 5%.',
      acessoVenoso: 'Acesso venoso dedicado. NUNCA COMPARTILHAR VIA COM DROGAS VASOATIVAS.',
      antidotoExtravasamento: 'Hipertônico e alcalino; risco de necrose por extravasamento.',
      estabilidade: 'Uso imediato após diluição.',
      monitorizacao: 'Gasometria arterial, pH, pCO2 (requer ventilação adequada para eliminar CO2 gerado) e potássio sérico.'
    },

    gluconato_de_calcio: {
      id: 'gluconato_de_calcio',
      nome: 'Gluconato de Cálcio 10%',
      classe: 'Estabilizador de Membrana / Eletrólito de Emergência',
      diluenteD1: 'Soro Glicosado 5% (SG 5%) ou Soro Fisiológico 0,9% (SF 0,9%)',
      diluenteDetalhes: 'Compatível com SG 5% e SF 0,9%. INCOMPATÍVEL com Bicarbonato de Sódio, Fosfato e Ceftriaxona (risco de precipitação fatal de sais de cálcio insolúveis).',
      solucoesCompativeis: ['SG 5%', 'SF 0,9%'],
      solucoesIncompativeis: ['Bicarbonato de Sódio (precipita carbonato de cálcio)', 'Fosfato de Potássio', 'Ceftriaxona (precipitado letal)'],
      concentracaoUsual: '10 a 20 mL em 100 mL de SG 5% ou SF infundidos em 10 a 20 minutos com monitorização cardíaca.',
      acessoVenoso: 'Acesso venoso calibroso ou central. Menos irritante tecidual que cloreto de cálcio.',
      antidotoExtravasamento: 'Elevação e gelo/frio.',
      estabilidade: '24 horas em temperatura ambiente.',
      monitorizacao: 'ECG contínuo (risco de bradicardia e arritmias se infusão rápida).'
    },

    fenitoina: {
      id: 'fenitoina',
      nome: 'Fenitoína Sódica (Hidantal)',
      classe: 'Anticonvulsivante Hidantoínico EV',
      diluenteD1: 'Soro Fisiológico 0,9% (SF 0,9%) EXCLUSIVO',
      diluenteDetalhes: 'DEVE SER DILUÍDA EXCLUSIVAMENTE EM SF 0,9%. Extremamente insolúvel em pH ácido: precipita imediatamente em contato com SG 5% ou qualquer outra solução ou droga ácida. INFUNDIR EM VIA EXCLUSIVA COM FILTRO DE LINHA.',
      solucoesCompativeis: ['SF 0,9% EXCLUSIVO'],
      solucoesIncompativeis: ['SG 5%', 'TODAS AS DROGAS VASOATIVAS EM Y', 'Opioides', 'Sedativos'],
      concentracaoUsual: 'Ataque: 15-20 mg/kg em 100-250 mL SF 0,9% em velocidade MÁXIMA de 50 mg/minuto.',
      acessoVenoso: 'Via Venosa Exclusiva mandatória. Risco de Síndrome da Luva Roxa se extravasamento.',
      antidotoExtravasamento: 'Suspender imediatamente.',
      estabilidade: 'Uso imediato dentro de 1 hora após diluição.',
      monitorizacao: 'PA e ECG contínuos durante a infusão (risco de hipotensão severa e assistolia/arritmias ventriculares induzidas pelo propilenoglicol).'
    },

    fentanil: {
      id: 'fentanil',
      nome: 'Citrato de Fentanila',
      classe: 'Opioide Sintético de Alta Potência (BIC Sedoanalgesia)',
      diluenteD1: 'Soro Fisiológico 0,9% (SF 0,9%) ou Soro Glicosado 5% (SG 5%)',
      diluenteDetalhes: 'Altamente compatível com Noradrenalina, Dobutamina, Vasopressina e Midazolam em Y.',
      solucoesCompativeis: ['SF 0,9%', 'SG 5%'],
      solucoesIncompativeis: ['Fenitoína', 'Furosemida (cautela/incompatível)'],
      concentracaoUsual: '50 mcg/mL puro ou diluído.',
      acessoVenoso: 'Central ou periférico.',
      antidotoExtravasamento: 'Naloxona se sobredose/depressão respiratória.',
      estabilidade: '24 horas.',
      monitorizacao: 'Escala RASS, frequência respiratória e reflexos.'
    },

    midazolam: {
      id: 'midazolam',
      nome: 'Maleato de Midazolam',
      classe: 'Benzodiazepínico Sedativo de Ação Curta',
      diluenteD1: 'Soro Fisiológico 0,9% (SF 0,9%) ou Soro Glicosado 5% (SG 5%)',
      diluenteDetalhes: 'Compatível com Noradrenalina, Dobutamina e Fentanil em Y. Incompatível com Furosemida.',
      solucoesCompativeis: ['SF 0,9%', 'SG 5%'],
      solucoesIncompativeis: ['Furosemida (precipita)', 'Bicarbonato de Sódio', 'Fenitoína'],
      concentracaoUsual: '1 mg/mL ou 2 mg/mL em SF ou SG5%.',
      acessoVenoso: 'Central ou periférico.',
      antidotoExtravasamento: 'Flumazenil (uso restrito).',
      estabilidade: '24 horas.',
      monitorizacao: 'Escala RASS, tolerância hemodinâmica (vasodilatador e depressor miocárdico discreto).'
    },

    propofol: {
      id: 'propofol',
      nome: 'Propofol 1% (Emulsão Lipídica)',
      classe: 'Anestésico Geral Hipnótico Ultrarrápido',
      diluenteD1: 'Puro em Frasco Original (Emulsão Lipídica a 10 mg/mL)',
      diluenteDetalhes: 'Administrar puro em frasco original. Emulsão lipídica com alto risco de contaminação bacteriana. TROCA DE EQUIPO E FRASCO A CADA 12 HORAS.',
      solucoesCompativeis: ['SG 5% (para flush imediato apenas)'],
      solucoesIncompativeis: ['Diazepam', 'Fenitoína', 'Bicarbonato', 'Atracúrio'],
      concentracaoUsual: '10 mg/mL (1%) puro.',
      acessoVenoso: 'Acesso Central ou periférico calibroso. Preferir lúmen dedicado.',
      antidotoExtravasamento: 'Compressas.',
      estabilidade: '12 horas no equipo após abertura (veículo lipídico propício ao crescimento bacteriano).',
      monitorizacao: 'Pressão arterial (potente vasodilatador e hipotensor), triglicerídeos séricos se uso > 48h (risco de Síndrome da Infusão do Propofol - PRIS com acidose lática severa, rabdomiólise e colapso cardíaco).'
    },

    dexmedetomidina: {
      id: 'dexmedetomidina',
      nome: 'Cloridrato de Dexmedetomidina (Precedex)',
      classe: 'Agonista Alfa-2 Adrenérgico Seletivo (Sedativo Consciente)',
      diluenteD1: 'Soro Fisiológico 0,9% (SF 0,9%)',
      diluenteDetalhes: 'Diluir em SF 0,9% (400 mcg [2 ampolas de 2 mL] em 96 mL SF 0,9% = 4 mcg/mL). Compatível em Y com Noradrenalina e Dobutamina.',
      solucoesCompativeis: ['SF 0,9%'],
      solucoesIncompativeis: ['Soluções alcalinas', 'Fenitoína'],
      concentracaoUsual: '4 mcg/mL.',
      acessoVenoso: 'Central ou periférico.',
      antidotoExtravasamento: 'Sem ação vesicante.',
      estabilidade: '24 horas em temperatura ambiente.',
      monitorizacao: 'FC (risco de bradicardia severa) e PA (pode causar hipotensão ou hipertensão transitória inicial por estímulo alfa-2 periférico).'
    }
  };

  // 2. SINÔNIMOS E NORMALIZAÇÃO DE NOMES DE FÁRMACOS
  var ALIASES_FARMACOS = {
    'noradrenalina': 'noradrenalina',
    'norepinefrina': 'noradrenalina',
    'nora': 'noradrenalina',
    'levophed': 'noradrenalina',
    'dobutamina': 'dobutamina',
    'dobuta': 'dobutamina',
    'dobu': 'dobutamina',
    'dobutrex': 'dobutamina',
    'vasopressina': 'vasopressina',
    'vaso': 'vasopressina',
    'pitressin': 'vasopressina',
    'enpress': 'vasopressina',
    'adrenalina': 'adrenalina',
    'adrena': 'adrenalina',
    'epinefrina': 'adrenalina',
    'epi': 'adrenalina',
    'milrinona': 'milrinona',
    'milrinone': 'milrinona',
    'primacor': 'milrinona',
    'nitroprussiato': 'nitroprussiato',
    'nitroprussiato de sodio': 'nitroprussiato',
    'nipride': 'nitroprussiato',
    'nitropress': 'nitroprussiato',
    'nitroglicerina': 'nitroglicerina',
    'tridil': 'nitroglicerina',
    'nitro': 'nitroglicerina',
    'amiodarona': 'amiodarona',
    'ancoron': 'amiodarona',
    'atlansil': 'amiodarona',
    'furosemida': 'furosemida',
    'lasix': 'furosemida',
    'bicarbonato': 'bicarbonato_de_sodio',
    'bicarbonato de sodio': 'bicarbonato_de_sodio',
    'nahco3': 'bicarbonato_de_sodio',
    'bicarb': 'bicarbonato_de_sodio',
    'gluconato': 'gluconato_de_calcio',
    'gluconato de calcio': 'gluconato_de_calcio',
    'calcio': 'gluconato_de_calcio',
    'fenitoina': 'fenitoina',
    'hidantal': 'fenitoina',
    'fentanil': 'fentanil',
    'fentanila': 'fentanil',
    'fentanyl': 'fentanil',
    'midazolam': 'midazolam',
    'dormonid': 'midazolam',
    'propofol': 'propofol',
    'diprivan': 'propofol',
    'dexmedetomidina': 'dexmedetomidina',
    'precedex': 'dexmedetomidina',
    'heparina': 'heparina',
    'heparina sodica': 'heparina',
    'kcl': 'cloreto_de_potassio',
    'cloreto de potassio': 'cloreto_de_potassio',
    'potassio': 'cloreto_de_potassio',
    'ceftriaxona': 'ceftriaxona',
    'rocefin': 'ceftriaxona',
    'ringer lactato': 'ringer_lactato',
    'rl': 'ringer_lactato'
  };

  function normalizarNomeDroga(nome) {
    if (!nome) return '';
    var str = String(nome).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_\s]/g, ' ')
      .trim();
    if (ALIASES_FARMACOS[str]) return ALIASES_FARMACOS[str];
    for (var k in ALIASES_FARMACOS) {
      if (str.indexOf(k) === 0 || k.indexOf(str) === 0) return ALIASES_FARMACOS[k];
    }
    return str.replace(/\s+/g, '_');
  }

  // 3. MATRIZ CANÔNICA DE COMPATIBILIDADE EM Y (Y-SITE COMPATIBILITY)
  // Chave canônica ordenada em ordem alfabética: "drogaA_drogaB"
  var REGRAS_COMPATIBILIDADE_Y = {
    // Noradrenalina + Inotrópicos / Vasopressores
    'dobutamina_noradrenalina': {
      status: 'COMPATIVEL',
      icone: '✅',
      grau: 'COMPATÍVEL EM Y',
      mecanismo: 'Estabilidade físico-química preservada em soluções ácidas comuns (SG 5% e SF 0,9%). Ambos mantêm solubilidade e eficácia sem turvação ou precipitação.',
      conduta: 'Pode infundir na mesma via venosa ou conexão em Y na bomba de infusão. Preferir diluição de ambas em SG 5% com Acesso Venoso Central.',
      alertaCritico: false
    },
    'noradrenalina_vasopressina': {
      status: 'COMPATIVEL',
      icone: '✅',
      grau: 'COMPATÍVEL EM Y',
      mecanismo: 'Excelente compatibilidade no mesmo sítio em Y. Associação padrão-ouro no choque séptico refratário a altas doses de noradrenalina.',
      conduta: 'Pode correr na mesma via central. Lembrar: vasopressina em dose fixa (0,01 a 0,04 UI/min) enquanto noradrenalina é titulada conforme PAM.',
      alertaCritico: false
    },
    'adrenalina_noradrenalina': {
      status: 'COMPATIVEL',
      icone: '✅',
      grau: 'COMPATÍVEL EM Y',
      mecanismo: 'Catecolaminas com propriedades físico-químicas análogas e pH similar. Compatíveis em Y em SG 5% e SF 0,9%.',
      conduta: 'Compatível em Y. Monitorar rigorosamente taquiarritmias e isquemia periférica.',
      alertaCritico: false
    },
    'milrinona_noradrenalina': {
      status: 'COMPATIVEL',
      icone: '✅',
      grau: 'COMPATÍVEL EM Y',
      mecanismo: 'Soluções física e quimicamente estáveis em Y por até 24 horas em SG 5% ou SF 0,9%.',
      conduta: 'Compatível em Y. Acesso central obrigatório. Titular noradrenalina para compensar eventual vasodilatação inicial da milrinona.',
      alertaCritico: false
    },
    'nitroglicerina_noradrenalina': {
      status: 'COMPATIVEL',
      icone: '✅',
      grau: 'COMPATÍVEL EM Y',
      mecanismo: 'Estabilidade física em Y por 4 horas de infusão contínua combinada.',
      conduta: 'Compatível em Y. Utilizar equipo livre de PVC para a nitroglicerina.',
      alertaCritico: false
    },
    'nitroprussiato_noradrenalina': {
      status: 'COMPATIVEL',
      icone: '✅',
      grau: 'COMPATÍVEL EM Y',
      mecanismo: 'Compatíveis em Y quando diluídos em SG 5%.',
      conduta: 'Compatível em Y. Manter fotoproteção estrita no frasco e equipo de nitroprussiato.',
      alertaCritico: false
    },

    // Noradrenalina + Sedoanalgesia
    'fentanil_noradrenalina': {
      status: 'COMPATIVEL',
      icone: '✅',
      grau: 'COMPATÍVEL EM Y',
      mecanismo: 'Sem evidência de precipitados ou alteração cromática. Estáveis em Y em concentrações usuais.',
      conduta: 'Compatível em Y.',
      alertaCritico: false
    },
    'midazolam_noradrenalina': {
      status: 'COMPATIVEL',
      icone: '✅',
      grau: 'COMPATÍVEL EM Y',
      mecanismo: 'Soluções ácidas mútuas; estabilidade física mantida por 24 horas.',
      conduta: 'Compatível em Y.',
      alertaCritico: false
    },
    'dexmedetomidina_noradrenalina': {
      status: 'COMPATIVEL',
      icone: '✅',
      grau: 'COMPATÍVEL EM Y',
      mecanismo: 'Sem incompatibilidade físico-química relatada em Y em concentrações de até 4 mcg/mL.',
      conduta: 'Compatível em Y.',
      alertaCritico: false
    },
    'noradrenalina_propofol': {
      status: 'CONDICIONAL',
      icone: '⚠️',
      grau: 'CONDICIONAL / CAUTELA',
      mecanismo: 'Propofol é uma emulsão lipídica. Embora fisicamente estável com noradrenalina em Y por períodos curtos de infusão, a presença de lipídios pode diminuir a clareza visual de microcristais e favorecer contaminação.',
      conduta: 'Preferir via exclusiva ou lúmen separado de CVC para o propofol. Se via única, inspecionar rigorasamente ausência de quebra da emulsão lipídica e trocar o equipo a cada 12 horas.',
      alertaCritico: false
    },

    // Incompatibilidades Críticas da Noradrenalina
    'furosemida_noradrenalina': {
      status: 'INCOMPATIVEL',
      icone: '🛑',
      grau: 'INCOMPATÍVEL EM Y (PRECIPITAÇÃO DE CRISTAIS)',
      mecanismo: 'Incompatibilidade severa de pH: Furosemida possui pH fortemente alcalino (8.5 a 9.5) enquanto a Noradrenalina possui pH fortemente ácido (3.0 a 4.5). O contato no sítio em Y provoca precipitação física imediata de cristais de furosemida insolúveis, risco de oclusão do cateter venoso e microembolização pulmonar.',
      conduta: 'NUNCA INFUNDIR NA MESMA VIA VENOSA EM Y. Exige lúmen dedicado no CVC ou via venosa exclusiva. Se em via única de resgate, suspender temporariamente a noradrenalina, lavar com flush vigoroso de 10 mL de SF 0,9% antes e depois da furosemida.',
      alertaCritico: true
    },
    'bicarbonato_de_sodio_noradrenalina': {
      status: 'INCOMPATIVEL',
      icone: '🛑',
      grau: 'INCOMPATÍVEL EM Y (INATIVAÇÃO ALCALINA IMEDIATA)',
      mecanismo: 'Oxidação e decomposição química rápida: Soluções alcalinas como Bicarbonato de Sódio 8,4% (pH ~8.0-8.5) aceleram a oxidação da noradrenalina em adrenocromo, inativando por completo a ação vasoconstritora em segundos e causando colapso pressórico inadvertido.',
      conduta: 'CONTRAINDICAÇÃO FORMAL EM Y. O bicarbonato de sódio NUNCA deve correr no mesmo lúmen de drogas vasoativas. Administrar sempre em via venosa exclusiva.',
      alertaCritico: true
    },
    'fenitoina_noradrenalina': {
      status: 'INCOMPATIVEL',
      icone: '🛑',
      grau: 'INCOMPATÍVEL EM Y (PRECIPITAÇÃO GRAVE)',
      mecanismo: 'A fenitoína precipita instantaneamente como cristais livres em qualquer solução com pH inferior a 11.5 ou em soluções contendo dextrose.',
      conduta: 'NUNCA ADMINISTRAR EM Y. Fenitoína exige via exclusiva diluída apenas em SF 0,9% com filtro de linha.',
      alertaCritico: true
    },

    // Dobutamina + Vasopressores e Inotrópicos
    'dobutamina_vasopressina': {
      status: 'COMPATIVEL',
      icone: '✅',
      grau: 'COMPATÍVEL EM Y',
      mecanismo: 'Soluções compatíveis em Y em SG 5% ou SF 0,9%.',
      conduta: 'Compatível em Y.',
      alertaCritico: false
    },
    'adrenalina_dobutamina': {
      status: 'COMPATIVEL',
      icone: '✅',
      grau: 'COMPATÍVEL EM Y',
      mecanismo: 'Catecolaminas compatíveis em Y.',
      conduta: 'Compatível em Y. Monitorar consumo miocárdico de oxigênio (MVO2) e arritmias ventriculares.',
      alertaCritico: false
    },
    'dobutamina_milrinona': {
      status: 'COMPATIVEL',
      icone: '✅',
      grau: 'COMPATÍVEL EM Y',
      mecanismo: 'Associação inotrópica mista sinérgica (beta-agonista + inibidor de PDE-3). Estáveis em Y em SG 5% ou SF 0,9%.',
      conduta: 'Compatível em Y. Cautela com hipotensão por vasodilatação mútua e taquiarritmias.',
      alertaCritico: false
    },
    'dobutamina_nitroprussiato': {
      status: 'COMPATIVEL',
      icone: '✅',
      grau: 'COMPATÍVEL EM Y',
      mecanismo: 'Compatíveis em Y em SG 5%. Combinação clássica no choque cardiogênico com alta resistência vascular sistêmica.',
      conduta: 'Compatível em Y.',
      alertaCritico: false
    },
    'dobutamina_nitroglicerina': {
      status: 'COMPATIVEL',
      icone: '✅',
      grau: 'COMPATÍVEL EM Y',
      mecanismo: 'Compatíveis em Y.',
      conduta: 'Compatível em Y. Equipo sem PVC para nitroglicerina.',
      alertaCritico: false
    },
    'dobutamina_fentanil': {
      status: 'COMPATIVEL',
      icone: '✅',
      grau: 'COMPATÍVEL EM Y',
      mecanismo: 'Estabilidade física e química em concentrações usuais.',
      conduta: 'Compatível em Y.',
      alertaCritico: false
    },
    'dobutamina_midazolam': {
      status: 'COMPATIVEL',
      icone: '✅',
      grau: 'COMPATÍVEL EM Y',
      mecanismo: 'Compatíveis em Y em SG 5% e SF 0,9%.',
      conduta: 'Compatível em Y.',
      alertaCritico: false
    },
    'dobutamina_propofol': {
      status: 'CONDICIONAL',
      icone: '⚠️',
      grau: 'CONDICIONAL / CAUTELA',
      mecanismo: 'Compatibilidade física aceitável em Y, mas a emulsão lipídica requer vigilância.',
      conduta: 'Preferir via exclusiva para o propofol.',
      alertaCritico: false
    },

    // Incompatibilidades Críticas da Dobutamina
    'dobutamina_furosemida': {
      status: 'INCOMPATIVEL',
      icone: '🛑',
      grau: 'INCOMPATÍVEL EM Y (PRECIPITAÇÃO DE CRISTAIS)',
      mecanismo: 'Incompatibilidade extrema de pH: A furosemida alcalina precipita ao entrar em contato com a solução ácida de dobutamina, formando precipitados cristalinos esbranquiçados visíveis.',
      conduta: 'CONTRAINDICADO EM Y. Exige via venosa exclusiva ou lúmen dedicado no CVC.',
      alertaCritico: true
    },
    'bicarbonato_de_sodio_dobutamina': {
      status: 'INCOMPATIVEL',
      icone: '🛑',
      grau: 'INCOMPATÍVEL EM Y (INATIVAÇÃO E DECOMPOSIÇÃO)',
      mecanismo: 'A dobutamina é instável em pH alcalino, sofrendo oxidação imediata e inativação com alteração cromática para tonalidade rosa-escura/marrom.',
      conduta: 'NUNCA ADMINISTRAR EM Y. Via exclusiva para bicarbonato.',
      alertaCritico: true
    },
    'dobutamina_fenitoina': {
      status: 'INCOMPATIVEL',
      icone: '🛑',
      grau: 'INCOMPATÍVEL EM Y (PRECIPITAÇÃO GRAVE)',
      mecanismo: 'Precipitação imediata de fenitoína insolúvel.',
      conduta: 'NUNCA ADMINISTRAR EM Y.',
      alertaCritico: true
    },
    'dobutamina_heparina': {
      status: 'CONDICIONAL',
      icone: '⚠️',
      grau: 'CONDICIONAL / EVITAR EM Y',
      mecanismo: 'Em concentrações elevadas, pode ocorrer formação de precipitados e perda de eficácia de ambas as drogas.',
      conduta: 'Evitar correr no mesmo sítio em Y. Preferir vias separadas.',
      alertaCritico: false
    },

    // Milrinona
    'furosemida_milrinona': {
      status: 'INCOMPATIVEL',
      icone: '🛑',
      grau: 'INCOMPATÍVEL EM Y (PRECIPITAÇÃO IMEDIATA)',
      mecanismo: 'Precipitação física e química imediata: o contato entre o lactato de milrinona e a furosemida alcalina resulta em precipitado esbranquiçado denso instantâneo no equipo.',
      conduta: 'CONTRAINDICAÇÃO ABSOLUTA NO MESMO EQUIPO/Y. Exige via exclusiva ou lúmen isolado.',
      alertaCritico: true
    },
    'bicarbonato_de_sodio_milrinona': {
      status: 'INCOMPATIVEL',
      icone: '🛑',
      grau: 'INCOMPATÍVEL EM Y',
      mecanismo: 'Incompatibilidade química em meio alcalino.',
      conduta: 'Evitar em Y. Administrar em via separada.',
      alertaCritico: true
    },

    // Vasopressina
    'furosemida_vasopressina': {
      status: 'INCOMPATIVEL',
      icone: '🛑',
      grau: 'INCOMPATÍVEL EM Y',
      mecanismo: 'Risco de precipitação e degradação do peptídeo em pH alcalino.',
      conduta: 'Administrar em vias separadas.',
      alertaCritico: true
    },
    'bicarbonato_de_sodio_vasopressina': {
      status: 'INCOMPATIVEL',
      icone: '🛑',
      grau: 'INCOMPATÍVEL EM Y',
      mecanismo: 'Degradação da vasopressina em soluções alcalinas.',
      conduta: 'NUNCA misturar em Y.',
      alertaCritico: true
    },

    // Amiodarona
    'amiodarona_furosemida': {
      status: 'INCOMPATIVEL',
      icone: '🛑',
      grau: 'INCOMPATÍVEL EM Y (PRECIPITAÇÃO DE AMIODARONA)',
      mecanismo: 'Precipitação instantânea de amiodarona em contato com soluções alcalinas.',
      conduta: 'CONTRAINDICADO EM Y. Via venosa exclusiva.',
      alertaCritico: true
    },
    'amiodarona_bicarbonato_de_sodio': {
      status: 'INCOMPATIVEL',
      icone: '🛑',
      grau: 'INCOMPATÍVEL EM Y (PRECIPITAÇÃO)',
      mecanismo: 'Precipitação imediata de amiodarona.',
      conduta: 'CONTRAINDICADO EM Y.',
      alertaCritico: true
    },
    'amiodarona_heparina': {
      status: 'INCOMPATIVEL',
      icone: '🛑',
      grau: 'INCOMPATÍVEL EM Y (PRECIPITAÇÃO)',
      mecanismo: 'Formação de precipitado insolúvel no sítio em Y.',
      conduta: 'Administrar em linhas separadas.',
      alertaCritico: true
    },

    // Antimicrobianos e Eletrólitos Críticos
    'ceftriaxona_gluconato_de_calcio': {
      status: 'INCOMPATIVEL',
      icone: '🛑',
      grau: 'CONTRAINDICAÇÃO FATAL EM Y (PRECIPITAÇÃO LETAL)',
      mecanismo: 'Formação de precipitado insolúvel de Ceftriaxona-Cálcio com alto risco de oclusão microvascular letal em pulmões e rins (casos descritos de parada cardiorrespiratória e morte em neonatos e adultos).',
      conduta: 'CONTRAINDICAÇÃO ABSOLUTA DE ADMINISTRAÇÃO CONCOMITANTE NO MESMO EQUIPO OU VIA. Nunca associar soluções com cálcio com ceftriaxona.',
      alertaCritico: true
    },
    'ceftriaxona_ringer_lactato': {
      status: 'INCOMPATIVEL',
      icone: '🛑',
      grau: 'CONTRAINDICAÇÃO FATAL EM Y (CÁLCIO NO RINGER)',
      mecanismo: 'O Ringer Lactato contém íons cálcio que reagem com a Ceftriaxona formando sais precipitados insolúveis.',
      conduta: 'CONTRAINDICADO NO MESMO EQUIPO EM Y.',
      alertaCritico: true
    },
    'bicarbonato_de_sodio_gluconato_de_calcio': {
      status: 'INCOMPATIVEL',
      icone: '🛑',
      grau: 'INCOMPATÍVEL EM Y (CARBONATO DE CÁLCIO)',
      mecanismo: 'Reação imediata entre íons cálcio e bicarbonato formando carbonato de cálcio insolúvel (solução turva e precipitada como giz).',
      conduta: 'NUNCA INFUNDIR NA MESMA VIA EM Y. Se ambos forem necessários (ex: PCR/hipercalemia grave), administrar sequencialmente com flush vigoroso de 20 mL de SF entre eles.',
      alertaCritico: true
    }
  };

  /**
   * Obtém a chave canônica alfabética para o par de drogas
   */
  function gerarChavePar(drogaA, drogaB) {
    var dA = normalizarNomeDroga(drogaA);
    var dB = normalizarNomeDroga(drogaB);
    if (!dA || !dB) return '';
    return [dA, dB].sort().join('_');
  }

  /**
   * Consulta a ficha completa de diluição e cuidados da Droga 1 (D1)
   */
  function obterFichaDiluicao(droga) {
    var idNorm = normalizarNomeDroga(droga);
    return FICHAS_DILUICAO_DVA[idNorm] || null;
  }

  /**
   * Verifica a compatibilidade em Y entre duas drogas (D1 e D2)
   */
  function checarCompatibilidadeY(drogaA, drogaB) {
    var idA = normalizarNomeDroga(drogaA);
    var idB = normalizarNomeDroga(drogaB);

    if (!idA || !idB) {
      return {
        ok: false,
        erro: 'Informe duas drogas válidas para checagem de compatibilidade em Y.'
      };
    }

    if (idA === idB) {
      return {
        ok: true,
        drogaA: idA,
        drogaB: idB,
        status: 'COMPATIVEL',
        icone: '✅',
        grau: 'MESMA DROGA (ISOLADA)',
        mecanismo: 'Fármaco idêntico na solução.',
        conduta: 'Mesma substância ativa.',
        alertaCritico: false,
        fichaA: obterFichaDiluicao(idA),
        fichaB: obterFichaDiluicao(idB)
      };
    }

    var chave = gerarChavePar(idA, idB);
    var regra = REGRAS_COMPATIBILIDADE_Y[chave];
    var fichaA = obterFichaDiluicao(idA);
    var fichaB = obterFichaDiluicao(idB);

    if (regra) {
      return {
        ok: true,
        drogaA: idA,
        drogaB: idB,
        status: regra.status,
        icone: regra.icone,
        grau: regra.grau,
        mecanismo: regra.mecanismo,
        conduta: regra.conduta,
        alertaCritico: !!regra.alertaCritico,
        fichaA: fichaA,
        fichaB: fichaB
      };
    }

    // Se nenhum dos fármacos for droga de infusão parenteral / UTI, compatibilidade em Y não é aplicável
    if (!fichaA && !fichaB) {
      return {
        ok: true,
        drogaA: idA,
        drogaB: idB,
        status: 'COMPATIVEL',
        icone: '✅',
        grau: 'COMPATÍVEL / NÃO APLICÁVEL A BIC',
        mecanismo: 'Fármacos não caracterizados como drogas de infusão contínua parenteral (BIC / UTI). Compatibilidade físico-química em Y não aplicável.',
        conduta: 'Administrar conforme prescrição médica e vias habituais.',
        alertaCritico: false,
        fichaA: null,
        fichaB: null
      };
    }

    // Regras inferidas para pares sem conflito documentado conhecido em terapia intensiva
    return {
      ok: true,
      drogaA: idA,
      drogaB: idB,
      status: 'CONDICIONAL',
      icone: '⚠️',
      grau: 'SEM REGRA DE INCOMPATIBILIDADE EM BANCO (CAUTELA RECOMENDADA)',
      mecanismo: 'Não há registro de precipitação ou degradação físico-química catalogada para esta combinação específica. No entanto, por prudência em terapia intensiva, infusões simultâneas de drogas vasoativas devem priorizar vias dedicadas.',
      conduta: 'Inspecionar visualmente o sítio de conexão em Y quanto à turvação, névoa ou microcristais. Preferir lúmens distintos do cateter venoso central (CVC duplo ou triplo lúmen).',
      alertaCritico: false,
      fichaA: fichaA,
      fichaB: fichaB
    };
  }

  /**
   * Audita uma lista de drogas (array ou texto) checando todas as combinações em Y
   */
  function auditarPrescricaoCombinada(listaDrogasOuTexto) {
    var drogas = [];
    if (Array.isArray(listaDrogasOuTexto)) {
      listaDrogasOuTexto.forEach(function(item) {
        var norm = normalizarNomeDroga(item);
        if (norm && drogas.indexOf(norm) === -1) drogas.push(norm);
      });
    } else if (typeof listaDrogasOuTexto === 'string') {
      var textoNorm = ' ' + listaDrogasOuTexto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') + ' ';
      for (var alias in ALIASES_FARMACOS) {
        var padrao = new RegExp('\\b' + alias + '\\b', 'i');
        if (padrao.test(textoNorm)) {
          var can = ALIASES_FARMACOS[alias];
          if (can && drogas.indexOf(can) === -1) drogas.push(can);
        }
      }
    }

    var paresVerificados = [];
    var temIncompativel = false;
    var temCritico = false;

    for (var i = 0; i < drogas.length; i++) {
      for (var j = i + 1; j < drogas.length; j++) {
        var resPar = checarCompatibilidadeY(drogas[i], drogas[j]);
        paresVerificados.push(resPar);
        if (resPar.status === 'INCOMPATIVEL') temIncompativel = true;
        if (resPar.alertaCritico) temCritico = true;
      }
    }

    return {
      ok: true,
      drogasDetectadas: drogas,
      totalPares: paresVerificados.length,
      temIncompativel: temIncompativel,
      temAlertasCriticos: temCritico,
      pares: paresVerificados
    };
  }

  /**
   * Formata parecer clínico completo para o Telegram, Cockpit e Prontuário
   */
  function formatarParecerCompatibilidadeY(drogaA, drogaB) {
    var res = checarCompatibilidadeY(drogaA, drogaB);
    if (!res.ok) return '⚠️ ' + res.erro;

    var linhas = [];
    linhas.push('🔬 *COMPATIBILIDADE EM Y (Y-SITE) · BOMBA DE INFUSÃO CONTÍNUA*');
    linhas.push('═════════════════════════════════════════════════');
    linhas.push(res.icone + ' *STATUS:* *' + res.grau + '*');
    linhas.push('💉 *Par em infusão:* `' + res.drogaA.toUpperCase() + '` ⚡ `' + res.drogaB.toUpperCase() + '`');
    linhas.push('\n📋 *Mecanismo Físico-Químico:*');
    linhas.push(res.mecanismo);
    linhas.push('\n🩺 *Conduta Recomendada Beira-Leito:*');
    linhas.push(res.conduta);

    if (res.fichaA) {
      linhas.push('\n💧 *Diluente de Escolha (D1) — ' + res.fichaA.nome + ':*');
      linhas.push('• *Diluente:* ' + res.fichaA.diluenteD1);
      linhas.push('• *Acesso Venoso:* ' + res.fichaA.acessoVenoso);
    }
    if (res.fichaB && res.drogaA !== res.drogaB) {
      linhas.push('\n💧 *Diluente de Escolha (D2) — ' + res.fichaB.nome + ':*');
      linhas.push('• *Diluente:* ' + res.fichaB.diluenteD1);
      linhas.push('• *Acesso Venoso:* ' + res.fichaB.acessoVenoso);
    }

    if (res.alertaCritico) {
      linhas.push('\n🚨 *BLOQUEIO SENTINELA:* Risco imediato ao paciente se infundidos na mesma via. Separação de lumens mandatória!');
    }

    linhas.push('\n📚 *Fontes:* Trissel\'s Handbook on Injectable Drugs · Guia HSL · AMIB Terapia Intensiva');
    return linhas.join('\n');
  }

  return {
    obterFichaDiluicao: obterFichaDiluicao,
    checarCompatibilidadeY: checarCompatibilidadeY,
    auditarPrescricaoCombinada: auditarPrescricaoCombinada,
    formatarParecerCompatibilidadeY: formatarParecerCompatibilidadeY,
    FICHAS_DILUICAO_DVA: FICHAS_DILUICAO_DVA,
    REGRAS_COMPATIBILIDADE_Y: REGRAS_COMPATIBILIDADE_Y,
    normalizarNomeDroga: normalizarNomeDroga
  };
})();

// Exportação compatível com ambientes Node.js / VM e navegador
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CompatibilidadeYDvaService: CompatibilidadeYDvaService };
}
