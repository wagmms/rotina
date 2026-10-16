/**
 * @fileoverview Módulo de Domínio Puro para Diluição, Reconstituição, Estabilidade
 * e Compatibilidade em Y de Fármacos Injetáveis Críticos (Emergência e UTI).
 * 
 * Arquitetura: Clean Architecture / Domain-Driven Design (Zero I/O, Zero Dependências).
 * Compatibilidade: Node.js (CommonJS) e Motores V8 Puros.
 * 
 * Referências Farmacológicas Estritas:
 * - Trissel's Handbook on Injectable Drugs (ASHP)
 * - Surviving Sepsis Campaign (SSC 2021)
 * - American Heart Association (ACLS 2020/2023)
 * - ACOG Practice Bulletin (Gestational Hypertension and Preeclampsia)
 */

'use strict';

class DiluicaoInjetaveisDomain {
  /**
   * Inicializa a base de conhecimento determinística de farmacologia hospitalar.
   */
  constructor() {
    this._catalogo = this._construirCatalogoBase();
    this._matrizCompatibilidade = this._construirMatrizCompatibilidadeY();
    this._mapaAliases = this._construirMapaAliases();
  }

  /**
   * Normaliza strings de entrada (remove acentos, espaços extras e converte para lowercase).
   * @private
   * @param {string} str 
   * @returns {string}
   */
  _normalizarChave(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Resolve aliases clínicos para o ID canônico do catálogo.
   * @private
   * @param {string} inputId 
   * @returns {string|null}
   */
  _resolverFarmacoId(inputId) {
    const chave = this._normalizarChave(inputId);
    if (this._catalogo[chave]) return chave;
    if (this._mapaAliases[chave]) return this._mapaAliases[chave];
    return null;
  }

  /**
   * Mapeamento de sinônimos e nomes comerciais comuns nas prescrições brasileiras.
   * @private
   */
  _construirMapaAliases() {
    return {
      'ancoron': 'amiodarona',
      'atlansil': 'amiodarona',
      'cloridrato_de_amiodarona': 'amiodarona',
      'hidantal': 'fenitoina',
      'fenitoina_sodica': 'fenitoina',
      'difeni_hidantoina': 'fenitoina',
      'sulfato_de_magnesio': 'sulfato_mg',
      'magnesio': 'sulfato_mg',
      'mgso4': 'sulfato_mg',
      'nipride': 'nitroprussiato',
      'nitroprussiato_de_sodio': 'nitroprussiato',
      'nps': 'nitroprussiato',
      'norepinefrina': 'noradrenalina',
      'hemitartarato_de_norepinefrina': 'noradrenalina',
      'levophed': 'noradrenalina',
      'nora': 'noradrenalina',
      'fentanest': 'fentanil',
      'citrato_de_fentanila': 'fentanil',
      'fentanila': 'fentanil'
    };
  }

  /**
   * Constrói o catálogo farmacológico determinístico estrito.
   * @private
   */
  _construirCatalogoBase() {
    return {
      'amiodarona': {
        id: 'amiodarona',
        nomeGenerico: 'Cloridrato de Amiodarona',
        nomesComerciais: ['Ancoron®', 'Atlansil®'],
        classeTerapeutica: 'Antiarrítmico Classe III (Vaughan-Williams)',
        apresentacao: 'Ampola 150 mg / 3 mL (50 mg/mL)',
        phSolucao: '3,5 a 4,5',
        diluenteObrigatorio: 'Soro Glicosado 5% (SG 5%) EXCLUSIVAMENTE',
        diluentesProibidos: [
          'Soro Fisiológico 0,9% (SF 0,9%) - Risco de precipitação por efeito do íon comum (cloreto) e alteração de pH/micelas com o polissorbato 80.',
          'Ringer Lactato - Incompatibilidade físico-química.'
        ],
        concentracaoFinal: {
          ataque: '1,5 mg/mL (150 mg/100 mL) ou 3,0 mg/mL (300 mg/100 mL)',
          manutencao: '1,8 mg/mL (900 mg / 18 mL em 500 mL de SG 5%)',
          limiteEstabilidade: 'Concentrações < 0,6 mg/mL são fisicamente instáveis em qualquer diluente (precipitação em menos de 2h). Concentrações > 2 mg/mL exigem acesso venoso central obrigatório.'
        },
        tempoMinimoInfusaoMin: 10,
        velocidadeMaxima: '30 mg/min no ataque de emergência; em manutenção, não exceder 1 mg/min nas primeiras 6h e 0,5 mg/min posteriormente. Infusões rápidas causam colapso cardiovascular induzido pelo diluente Polissorbato 80 (Tween 80) e Álcool Benzílico.',
        viaAcesso: 'Acesso Venoso Central (preferencial e obrigatório para infusão contínua > 1h ou concentração > 2 mg/mL devido ao alto índice de flebite química severa). Acesso Venoso Periférico calibroso (ex: fossa antecubital) é permitido APENAS na dose de ataque ou emergências (PCR).',
        monitorizacao: [
          'Eletrocardiograma contínuo (monitorar alargamento do intervalo QTc > 500 ms, bradicardia sinusal e BAV)',
          'Pressão Arterial invasiva ou não-invasiva a cada 5-15 min no ataque (risco de hipotensão severa)',
          'Vigilância estrita do sítio de punção periférica a cada 30 min (extravasamento causa necrose tecidual)',
          'Função hepática (TGO/TGP) e eletrólitos (K+ e Mg2+ devem estar normais antes e durante a infusão)'
        ],
        antidoto: 'Não há antídoto específico. Para hipotensão refratária: reduzir/suspender infusão, expansão volêmica cautelosa e vasopressores (Noradrenalina). Para bradicardia sintomática/BAV: Atropina ou Marcapasso Transcutâneo. Para Torsades de Pointes: Sulfato de Magnésio 2 g IV.',
        protocolosPosologicos: {
          pcr_fv_tvsp: 'PCR (FV/TV sem pulso refratária ao 3º choque): 1ª dose de 300 mg (6 mL) em bolus IV/IO rápido (diluído em 20 mL de SG 5%), seguido de flush. 2ª dose (após 5º choque): 150 mg (3 mL) IV/IO.',
          ataque_taquiarritmia_estavel: 'Ataque em Taquiarritmias (TV com pulso / FA de alta resposta): 150 mg (1 ampola = 3 mL) diluídos em 100 mL de SG 5% IV, correr em 10 a 20 minutos (Velocidade na BIC: 300 a 600 mL/h). Em casos refratários ou protocolo de 300 mg: diluir 300 mg (2 ampolas = 6 mL) em 100 mL de SG 5% a correr em 20 a 30 minutos.',
          manutencao_24h: 'Manutenção Padrão (Pós-ataque): Diluir 900 mg (6 ampolas = 18 mL) em 500 mL de SG 5% (Concentração final ~ 1,8 mg/mL). Fase Lenta 1 (Primeiras 6 horas): infundir a 1 mg/min = 33,3 mL/h (totalizando 360 mg). Fase Lenta 2 (Próximas 18 horas): reduzir para 0,5 mg/min = 16,6 mL/h (totalizando 540 mg).'
        },
        alertasCriticos: [
          'PROIBIDO DILUIR EM SORO FISIOLÓGICO 0,9% (SF 0,9%)! Ocorre turvação e precipitação microcristalina.',
          'Em infusões prolongadas (> 2 horas), utilizar frasco de Poliolefina ou Vidro (o PVC adsorve a amiodarona e libera plastificante DEHP devido ao Polissorbato 80).',
          'É obrigatório o uso de filtro de linha (in-line filter de 0,22 micra) na administração contínua.',
          'Dose máxima cumulativa em 24 horas não deve ultrapassar 2.200 mg (risco de hepatite aguda fulminante por isquemia/polissorbato).'
        ]
      },

      'fenitoina': {
        id: 'fenitoina',
        nomeGenerico: 'Fenitoína Sódica',
        nomesComerciais: ['Hidantal®'],
        classeTerapeutica: 'Anticonvulsivante / Antiepiléptico (Bloqueador de canais de Na+ voltagem-dependentes) / Antiarrítmico Classe Ib',
        apresentacao: 'Ampola 250 mg / 5 mL (50 mg/mL) - Veículo: Propilenoglicol 40%, Etanol 10% em água para injetáveis ajustada com NaOH para pH 12.',
        phSolucao: '10,0 a 12,3 (Extremamente alcalina)',
        diluenteObrigatorio: 'Soro Fisiológico 0,9% (SF 0,9%) EXCLUSIVAMENTE',
        diluentesProibidos: [
          'Soro Glicosado 5% (SG 5%) - ESTRITAMENTE PROIBIDO! O pH ácido da glicose (pH ~ 4,0 a 4,5) reduz o pH da solução abaixo do pKa da fenitoína (8,3), convertendo a fenitoína sódica solúvel em ácido livre insolúvel, gerando precipitação imediata de cristais de fenitoína na bolsa e na corrente sanguínea (embolia microcristalina pulmonar/cerebral).',
          'Ringer Lactato - Proibido (precipitação imediata).',
          'Qualquer outra medicação na mesma linha venosa (incompatível com quase todos os fármacos).'
        ],
        concentracaoFinal: {
          ataque: 'Concentração recomendada: 5 mg/mL a 10 mg/mL em SF 0,9% (Ex: 1.000 mg em 100 mL a 250 mL de SF 0,9%).',
          limiteEstabilidade: 'NUNCA diluir em concentração inferior a 1 mg/mL ou superior a 10 mg/mL. Administrar imediatamente após o preparo (estabilidade máxima de 1 a 2 horas).'
        },
        tempoMinimoInfusaoMin: 20,
        velocidadeMaxima: 'Adultos: Máximo de 50 mg/min. Idosos, cardiopatas, hepatopatas ou instáveis hemodinamicamente: Máximo de 20 a 25 mg/min. Pediatria/Neonatologia: 1 a 3 mg/kg/min (nunca exceder 50 mg/min).',
        viaAcesso: 'Acesso Venoso Exclusivo (Calibroso, preferencialmente antecubital ou central). PROIBIDO administrar por via Intramuscular (IM) devido à cristalização errática no músculo e necrose muscular severa. Lavar o acesso com 20 mL de SF 0,9% em bolus ANTES e DEPOIS da infusão.',
        monitorizacao: [
          'Eletrocardiograma contínuo (alargamento de QRS, prolongamento de PR, bradicardia e assistolia)',
          'Pressão Arterial a cada 5 minutos durante a infusão (risco altíssimo de hipotensão severa mediada pelo veículo Propilenoglicol)',
          'Inspeção visual contínua do local de punção a cada 5-10 min (Síndrome da Luva Púrpura / Purple Glove Syndrome e necrose tissular grave por pH 12)',
          'Sinais neurológicos de intoxicação aguda pós-infusão (nistagmo, ataxia, disartria, letargia)'
        ],
        antidoto: 'Não há antídoto específico. Na ocorrência de hipotensão aguda ou arritmia durante a infusão: interromper a bomba IMEDIATAMENTE. O efeito cardiodepressor do propilenoglicol costuma reverter em 15-30 min após pausa; se necessário, iniciar suporte com cristaloide e vasopressor. Se houver extravasamento: interromper, aspirar pelo cateter, elevar o membro e aplicar compressas mornas secas.',
        protocolosPosologicos: {
          status_epilepticus_ataque: 'Estado de Mal Epiléptico (Dose de Ataque / Hidantalização): 15 a 20 mg/kg IV em dose única (Dose máxima inicial recomendada: 1.500 mg). Diluir a dose calculada em 100 mL a 250 mL de SF 0,9% puro.',
          dose_adicional: 'Se persistência das crises após 20 min do término do ataque: dose adicional de 5 a 10 mg/kg IV (máximo acumulado de 30 mg/kg).',
          manutencao: 'Manutenção (iniciar 12h após o ataque): 100 mg IV (diluído em 50 mL de SF 0,9%, correr em 15-20 min) a cada 8 horas (300 mg/dia).'
        },
        alertasCriticos: [
          'JAMAIS DILUIR EM SORO GLICOSADO 5% (SG 5%)! Precipitação imediata de cristais letais.',
          'JAMAIS exceder a velocidade de 50 mg/min em adultos (25 mg/min em idosos/cardiopatas): o diluente Propilenoglicol causa vasodilatação periférica abrupta, choque cardiogênico, FV e parada cardíaca em assistolia.',
          'Uso OBRIGATÓRIO de filtro de linha (0,22 a 0,5 micra) no equipo para reter microcristais invisíveis a olho nu.',
          'Lavar o cateter com 20 mL de SF 0,9% antes e após a infusão para evitar precipitação com resíduos de glicose ou outras drogas no lúmen.'
        ]
      },

      'sulfato_mg': {
        id: 'sulfato_mg',
        nomeGenerico: 'Sulfato de Magnésio Heptahidratado (MgSO4.7H2O)',
        nomesComerciais: ['Sulfato de Magnésio 10%', 'Sulfato de Magnésio 50%'],
        classeTerapeutica: 'Eletrólito / Anticonvulsivante Obstétrico / Antiarrítmico (Torsades) / Broncodilatador Adjuvante',
        apresentacao: 'Ampola a 50% = 5 g / 10 mL (500 mg/mL = 4 mEq/mL) OU Ampola a 10% = 1 g / 10 mL (100 mg/mL = 0,8 mEq/mL). ATENÇÃO REDOBRADA À APRESENTAÇÃO!',
        phSolucao: '5,5 a 7,0',
        diluenteObrigatorio: 'Soro Fisiológico 0,9% (SF 0,9%) ou Soro Glicosado 5% (SG 5%)',
        diluentesProibidos: [
          'Soluções contendo Bicarbonato de Sódio, Fosfatos ou Sais de Cálcio na mesma via (precipitação de carbonato/fosfato de magnésio insolúvel).',
          'Administração da ampola a 50% sem diluição prévia por via IV (hiperosmolaridade extrema: 4.060 mOsm/L -> risco de hemólise, necrose e parada cardíaca). A solução IV final deve ter concentração <= 20% (200 mg/mL).'
        ],
        concentracaoFinal: {
          ataque: 'Ataque Obstétrico (Zuspan): 4 g diluídos em 100 mL de SF 0,9% ou SG 5% (Concentração ~ 40 mg/mL = 4%).',
          manutencao: 'Manutenção Obstétrica (Zuspan): 4 g a 5 g diluídos em 250 mL ou 500 mL (Ex: 4 g em 242 mL SF 0,9% = 16 mg/mL; correr a 62,5 mL/h = 1 g/h ou 125 mL/h = 2 g/h).'
        },
        tempoMinimoInfusaoMin: 15,
        velocidadeMaxima: 'Em obstetrícia (Pré-eclâmpsia/Eclâmpsia): máximo de 1 g/min (ideal: 4 g em 15 a 20 minutos -> 200 a 266 mg/min). Em PCR por Torsades de Pointes: bolus IV rápido (1 a 2 g em 10 mL SG 5% em 1 a 2 min).',
        viaAcesso: 'Acesso Venoso Periférico calibroso ou Central. No esquema de Pritchard (quando não há Bomba de Infusão Contínua disponível), a manutenção é feita por via Intramuscular (IM) profunda no quadrante superior externo do glúteo (solução a 50% associada a lidocaína).',
        monitorizacao: [
          'Reflexo Patelar (Tendíneo Profundo) a cada 15 min no ataque e a cada 1 hora na manutenção (O desaparecimento do reflexo patelar é o PRIMEIRO sinal clínico de intoxicação, ocorrendo com Mg sérico entre 8 e 10 mEq/L)',
          'Frequência Respiratória (FR) horária: Manter FR >= 12 a 16 irpm (Depressão respiratória e apneia ocorrem com Mg sérico > 10-12 mEq/L)',
          'Diurese horária por Sonda Vesical de Demora (SVD): Manter Diurese >= 25 a 30 mL/h (Como 99% da excreção do magnésio é renal, a oligúria leva rapidamente ao acúmulo letal)',
          'Magnesemia sérica se houver oligúria ou suspeita clínica (Faixa terapêutica na eclâmpsia: 4 a 7 mEq/L ou 4,8 a 8,4 mg/dL)'
        ],
        antidoto: 'ANTÍDOTO OBRIGATÓRIO À BEIRA DO LEITO: Gluconato de Cálcio a 10% - Administrar 10 mL (1 grama = 1 ampola) IV lento em 3 a 5 minutos. O íon cálcio antagoniza competitivamente o magnésio na junção neuromuscular e no miocárdio, revertendo imediatamente a depressão respiratória e o bloqueio cardíaco.',
        protocolosPosologicos: {
          zuspan_ataque: 'Esquema de Zuspan - ATAQUE (Pré-eclâmpsia Grave / Eclâmpsia): 4 g IV. Se usar ampola a 50% (5 g/10 mL): aspirar 8 mL (4 g) e diluir em 92 mL de SF 0,9% ou SG 5% (Volume total = 100 mL).Se usar ampola a 10% (1 g/10 mL): aspirar 40 mL (4 ampolas = 4 g) e diluir em 60 mL de SF 0,9% ou SG 5%. Correr em Bomba de Infusão (BIC) em 15 a 20 minutos (Velocidade: 300 a 400 mL/h).',
          zuspan_manutencao: 'Esquema de Zuspan - MANUTENÇÃO: 1 g/h a 2 g/h em BIC contínua por 24h após o parto ou última convulsão. Preparo prático: Diluir 4 g (8 mL da ampola a 50% OU 40 mL da ampola a 10%) em SF 0,9% ou SG 5% para completar volume total de 100 mL (Concentração = 40 mg/mL). Correr a 25 mL/h (para 1 g/h) ou 50 mL/h (para 2 g/h). Alternativa: 5 g (10 mL a 50%) em 490 mL de SF 0,9% (10 mg/mL) -> Correr a 100 mL/h (1 g/h) ou 200 mL/h (2 g/h).',
          torsades_asma: 'Torsades de Pointes (com pulso) ou Asma Grave Refratária: 2 g (4 mL da ampola a 50%) diluídos em 50 a 100 mL de SG 5% ou SF 0,9%, correr em 15 a 20 minutos.'
        },
        alertasCriticos: [
          'VERIFICAR EXAUSTIVAMENTE A CONCENTRAÇÃO DA AMPOLA (10% vs 50%) ANTES DE ASPIRAR! Trocar 10% por 50% causa superdosagem de 5x e parada cardiorrespiratória imediata.',
          'MANTER SEMPRE 1 AMPOLA DE GLUCONATO DE CÁLCIO 10% (10 mL) ASPIRADA OU DISPONÍVEL À BEIRA DO LEITO.',
          'SUSPENDER IMEDIATAMENTE A INFUSÃO DE MANUTENÇÃO SE: Reflexo patelar abolido, Frequência Respiratória < 12 irpm ou Diurese < 25 mL/h (neste último caso, reduzir a dose à metade ou suspender e dosar Mg sérico).'
        ]
      },

      'nitroprussiato': {
        id: 'nitroprussiato',
        nomeGenerico: 'Nitroprussiato de Sódio Dihidratado',
        nomesComerciais: ['Nipride®', 'Nitropress®'],
        classeTerapeutica: 'Vasodilatador Arterial e Venoso Direto (Doador de Óxido Nítrico - NO)',
        apresentacao: 'Frasco-ampola liofilizado 50 mg + Ampola diluente de 2 mL de SG 5%',
        phSolucao: '3,5 a 6,0',
        diluenteObrigatorio: 'Soro Glicosado 5% (SG 5%) EXCLUSIVAMENTE (Conferir protocolo institucional; o fabricante original exige SG 5% para estabilidade garantida de 24h)',
        diluentesProibidos: [
          'Água destilada pura para infusão direta (usar apenas o diluente próprio para reconstituição do pó).',
          'Bolsas desprotegidas da luz (a fotodegradação converte rapidamente o nitroprussiato em íons cianeto e aquapentacianoferrato, mudando a cor da solução para azul/verde/vermelho escuro).',
          'Qualquer outra medicação em Y (via estritamente exclusiva para evitar bolus acidental de vasodilatador potente).'
        ],
        concentracaoFinal: {
          padrao: '200 mcg/mL (50 mg reconstituídos em 2 mL e diluídos em 248 mL de SG 5% = Volume total 250 mL).',
          concentrada: '400 mcg/mL (100 mg / 2 frascos em 250 mL de SG 5% - restrita a pacientes com restrição hídrica severa).'
        },
        tempoMinimoInfusaoMin: 0, // Infusão contínua titulável minuto a minuto (meia-vida < 2 min)
        velocidadeMaxima: 'Dose máxima absoluta de 10 mcg/kg/min por no máximo 10 minutos! Na prática clínica de UTI, a faixa segura é de 0,3 a 4 mcg/kg/min (evitar ultrapassar 2 a 3 mcg/kg/min por períodos prolongados devido ao acúmulo de cianeto e tiocianato).',
        viaAcesso: 'Acesso Venoso Central (preferencial) ou Periférico exclusivo de bom calibre, obrigatoriamente em Bomba de Infusão Contínua (BIC) com equipo fotoprotetor.',
        monitorizacao: [
          'Pressão Arterial Invasiva (PAI / Linha Arterial) contínua é FORTEMENTE RECOMENDADA (ou PNI a cada 2 a 5 minutos na fase de titulação). Risco de hipotensão fulminante.',
          'Na Emergência Hipertensiva (ex: Encefalopatia, EAP): reduzir a PAM em no máximo 20% a 25% na primeira hora (exceto na Dissecção Aguda de Aorta, onde a PAS deve atingir 100-120 mmHg em 20 min associada a betabloqueador prévio).',
          'Sinais de Intoxicação por Cianeto (em infusões > 24-48h, doses > 2 mcg/kg/min ou hepatopatas): acidose metabólica lática inexplicada, taquifilaxia (necessidade de doses crescentes), confusão mental, sangue venoso vermelho rutilante (aumento da SvO2 por bloqueio da cadeia respiratória mitocondrial).',
          'Sinais de Intoxicação por Tiocianato (em infusões > 48-72h ou nefropatas/TFG < 30): psicose, delirium, zumbido, hiperreflexia, convulsões.'
        ],
        antidoto: 'Para Hipotensão: desligar a BIC (como a meia-vida é de 1 a 2 minutos, a PA retorna aos níveis basais em 3 a 5 minutos) e colocar em Trendelenburg. Para Intoxicação por Cianeto: 1ª escolha: Hidroxicobalamina (Cyanokit®) 5 g IV em 15 min (forma cianocobalamina/Vitamina B12 excretada na urina). Alternativa clássica: Tiossulfato de Sódio 25% (12,5 g / 50 mL IV em 10-30 min, converte cianeto em tiocianato) precedido por Nitrito de Sódio 3% (300 mg / 10 mL IV).',
        protocolosPosologicos: {
          preparo_padrao: 'Reconstituir 1 frasco-ampola (50 mg) com os 2 mL de SG 5% do diluente próprio. Diluir imediatamente em 248 mL de SG 5% (Volume total = 250 mL -> Concentração final = 200 mcg/mL). Envolver IMEDIATAMENTE o frasco e todo o equipo com capa fotoprotetora opaca.',
          titulacao: 'Iniciar infusão a 0,3 a 0,5 mcg/kg/min. Titular a cada 3 a 5 minutos em incrementos de 0,5 mcg/kg/min até atingir a meta pressórica (Habitual: 0,5 a 3 mcg/kg/min; Máximo: 5 a 10 mcg/kg/min).'
        },
        alertasCriticos: [
          'FRASCO E EQUIPO OBRIGATORIAMENTE FOTOPROTEGIDOS! A solução recém-preparada tem leve tom marrom-avermelhado claro; se apresentar cor azulada, esverdeada ou vermelho escuro intenso, DESCARTAR IMEDIATAMENTE (degradação em cianeto).',
          'Trocar a solução fotoprotegida obrigatoriamente a cada 24 horas.',
          'CONTRAINDICADO na Coarctação de Aorta, Shunt arteriovenoso, Hipertensão Intracraniana descompensada (aumenta a PIC por vasodilatação cerebral), Gestantes (risco de intoxicação fetal por cianeto) e uso recente de Inibidores da PDE-5 (Sildenafila/Tadalafila).',
          'Na Síndrome Coronariana Aguda (IAM), preferir Nitroglicerina (Tridil®), pois o Nitroprussiato causa "roubo de fluxo coronariano" nas áreas isquêmicas.'
        ]
      },

      'noradrenalina': {
        id: 'noradrenalina',
        nomeGenerico: 'Hemitartarato de Norepinefrina (Noradrenalina)',
        nomesComerciais: ['Levophed®', 'Hyponor®', 'Noradrenalina'],
        classeTerapeutica: 'Vasopressor Simpaticomimético Catecolaminérgico (Agonista potente Alfa-1 e Beta-1 adrenérgico)',
        apresentacao: 'Ampola 8 mg / 4 mL de Hemitartarato de Norepinefrina, que equivale a 4 mg / 4 mL de Noradrenalina BASE (1 mg/mL de base ativa). TODOS OS CÁLCULOS SÃO FEITOS PELA NORADRENALINA BASE (4 mg/ampola).',
        phSolucao: '3,0 a 4,5',
        diluenteObrigatorio: 'Soro Glicosado 5% (SG 5%) (Diluente padrão de escolha! A glicose confere proteção antioxidante contra a perda de potência da catecolamina). Soro Fisiológico 0,9% Glicosado (SGF) também é aceito.',
        diluentesProibidos: [
          'Soro Fisiológico 0,9% puro (SF 0,9%) - Embora fisicamente compatível no curto prazo, o fabricante e o Trissel recomendam evitar SF 0,9% isolado devido à rápida perda de potência por oxidação da catecolamina na ausência de dextrose.',
          'Soluções Alcalinas (Bicarbonato de Sódio, Fenitoína, Furosemida, Tiopental) - Inativação química imediata por oxidação em pH alcalino (a solução fica rosada/marrom).'
        ],
        concentracaoFinal: {
          padrao: 'Solução Padrão (1x): 64 mcg/mL (4 ampolas = 16 mg / 16 mL diluídos em 234 mL de SG 5% -> Volume total 250 mL) OU Solução Diluída Padrão: 16 mcg/mL (1 ampola = 4 mg / 4 mL diluída em 246 mL de SG 5% -> Volume total 250 mL).',
          concentrada: 'Solução Concentrada (Dupla/4x): 128 mcg/mL (8 ampolas = 32 mg / 32 mL em 218 mL de SG 5%) para choque refratário ou restrição volêmica.'
        },
        tempoMinimoInfusaoMin: 0, // Infusão contínua em BIC
        velocidadeMaxima: 'Titulável conforme resposta da PAM (Meta SSC 2021: PAM >= 65 mmHg). Doses habituais: 0,05 a 0,5 mcg/kg/min. Quando a dose atinge 0,25 a 0,5 mcg/kg/min, a diretriz Surviving Sepsis Campaign (SSC 2021) recomenda associar Vasopressina (0,03 UI/min) e Hidrocortisona (200 mg/dia) ao invés de escalonar indefinidamente a noradrenalina isolada (Doses > 1 a 2 mcg/kg/min cursam com vasoconstrição esplâncnica/digital severa e altíssima mortalidade).',
        viaAcesso: 'Acesso Venoso Central (CVC ou PICC). DIRETRIZ SSC 2021: NÃO atrasar o início da Noradrenalina aguardando passagem de acesso central! É seguro e recomendado iniciar em Acesso Venoso Periférico calibroso (fossa antecubital ou proximal ao punho, com retorno venoso confirmado) de forma transitória (até 6 horas e em concentrações baixas/padrão), providenciando o acesso central assim que possível.',
        monitorizacao: [
          'Pressão Arterial Invasiva (PAI) contínua assim que factível (Meta: PAM >= 65 mmHg)',
          'Perfusão periférica (Tempo de enchimento capilar < 3s, temperatura de extremidades, marmoreio/livedo score)',
          'Débito urinário horário (> 0,5 mL/kg/h) e clearance de lactato arterial a cada 2-4h',
          'Vigilância rigorosa do sítio de punção periférica a cada 15-30 min (risco de isquemia e necrose tecidual grave por extravasamento)'
        ],
        antidoto: 'ANTÍDOTO PARA EXTRAVASAMENTO TECIDUAL: Fentolamina (bloqueador alfa-adrenérgico competitivo). Diluir 5 a 10 mg de Fentolamina em 10 a 15 mL de SF 0,9% e infiltrar por via subcutânea (SC) com agulha fina (25G ou 27G) em múltiplos pontos ao redor de toda a área isquêmica/pálida (dentro de 12h). Se Fentolamina indisponível no Brasil: aplicar pomada de Nitroglicerina 2% tópica na área ou infiltrar Terbutalina SC. NUNCA remover o cateter antes de tentar aspirar o máximo possível do fármaco extravasado!',
        protocolosPosologicos: {
          solucao_16_mcg_ml: 'Solução Diluída (16 mcg/mL - Ideal para início periférico ou choque leve): Diluir 1 ampola (4 mg / 4 mL) em 246 mL de SG 5% (Volume total = 250 mL -> 16 mcg/mL).',
          solucao_64_mcg_ml: 'Solução Padrão UTI / Concentrada 4x (64 mcg/mL - Padrão em Acesso Central): Diluir 4 ampolas (16 mg / 16 mL) em 234 mL de SG 5% (Volume total = 250 mL -> 64 mcg/mL).',
          desmame: 'Reduzir gradualmente conforme estabilidade hemodinâmica; nunca interromper abruptamente sem antes corrigir hipovolemia subjacente.'
        },
        alertasCriticos: [
          'CONVERSÃO DE SAL PARA BASE: O rótulo da ampola destaca "Hemitartarato de Norepinefrina 8 mg/4 mL", mas apenas 4 mg são de Noradrenalina BASE ativa! Sempre calcular na razão de 4 mg por ampola de 4 mL (1 mg/mL).',
          'NUNCA administrar bolus em linha venosa contendo Noradrenalina (o flush do espaço morto do cateter causa pico hipertensivo maligno, reflexo vagal, bradicardia e hemorragia intracraniana).',
          'Fotoproteção: a solução oxidada adquire coloração rosada, amarelada ou marrom — descartar imediatamente se houver alteração de cor.',
          'Em caso de extravasamento periférico: parar a BIC, NÃO retirar o jelco de imediato, aspirar 3-5 mL de sangue/líquido pelo jelco para remover a droga do subcutâneo, remover o jelco, elevar o membro, aplicar compressa morna (vasodilatação) e infiltrar Fentolamina.'
        ]
      },

      'fentanil': {
        id: 'fentanil',
        nomeGenerico: 'Citrato de Fentanila (Fentanil)',
        nomesComerciais: ['Fentanest®', 'Durogesic® (transdérmico)'],
        classeTerapeutica: 'Analgésico Opioide Sintético Potente (Agonista seletivo dos receptores Mu-opioides - 100x mais potente que a Morfina)',
        apresentacao: 'Ampola / Frasco-ampola de 50 mcg/mL: Apresentações de 2 mL (100 mcg), 5 mL (250 mcg) e 10 mL (500 mcg) sem conservantes (espinhal/IV) ou com conservantes (apenas IV/IM).',
        phSolucao: '4,0 a 7,5',
        diluenteObrigatorio: 'Soro Fisiológico 0,9% (SF 0,9%) ou Soro Glicosado 5% (SG 5%) (Pode ser infundido puro ou diluído)',
        diluentesProibidos: [
          'Soluções fortemente alcalinas na mesma linha (Fenitoína, Pentobarbital, Tiopental) - Risco de precipitação da base de fentanila.'
        ],
        concentracaoFinal: {
          padrao_diluido: '10 mcg/mL (Diluir 20 mL de Fentanil = 1.000 mcg em 80 mL de SF 0,9% ou SG 5% -> Volume total = 100 mL).',
          puro: '50 mcg/mL (Infundido puro diretamente em bomba de seringa ou BIC: ex. 40 mL = 2.000 mcg puros).'
        },
        tempoMinimoInfusaoMin: 3, // No bolus IV
        velocidadeMaxima: 'Bolus IV deve ser administrado LENTAMENTE em 3 a 5 minutos! Bolus rápido (< 1-2 min), especialmente em doses > 150-200 mcg (2-3 mcg/kg), pode desencadear a "Síndrome do Tórax Rígido" (Rigidez muscular da parede torácica e glótica de origem central, impossibilitando a ventilação até mesmo com bolsa-válvula-máscara!).',
        viaAcesso: 'Acesso Venoso Periférico ou Central.',
        monitorizacao: [
          'Oximetria de pulso contínua (SpO2) e Capnografia (EtCO2) em pacientes sob sedação/ventilação mecânica',
          'Escalas validadas de Dor (BPS - Behavioral Pain Scale ou CPOT em intubados; EVA em acordados) e Sedação (RASS) a cada 2-4h (Priorizar "Analgesia-First Sedation" / Analgossedação - Diretriz PADIS)',
          'Pressão Arterial e Frequência Cardíaca (causa bradicardia vagomimética e hipotensão leve em hipovolêmicos)',
          'Motilidade gastrointestinal diária (risco de íleo paralítico e constipação severa)'
        ],
        antidoto: 'ANTÍDOTO PARA DEPRESSÃO RESPIRATÓRIA / SUPERDOSAGEM: Cloridrato de Naloxona (Narcan® - Ampola 0,4 mg / 1 mL). Diluir 1 ampola (0,4 mg) em 9 mL de SF 0,9% (Concentração = 0,04 mg/mL = 40 mcg/mL) e titular de 1 a 2 mL (0,04 a 0,08 mg) IV a cada 2 minutos até retorno da ventilação espontânea (evitar bolus total de 0,4 mg em usuários crônicos ou pós-operatório imediato para não desencadear crise álgica simpática, EAP e agitação). ATENÇÃO: Na Síndrome do Tórax Rígido aguda com hipóxia refratária, o tratamento imediato de escolha é o Bloqueio Neuromuscular de ação rápida (Succinilcolina 1-1,5 mg/kg IV ou Rocurônio 1,2 mg/kg IV) + Intubação Orotraqueal (ou Naloxona em altas doses).',
        protocolosPosologicos: {
          bolus_iot_sri: 'Pré-tratamento / Analgesia na Sequência Rápida de Intubação (SRI) ou Cardioversão: 1 a 3 mcg/kg IV lento (em 3 minutos), administrado 3 minutos antes do indutor/bloqueador neuromuscular (Atenua a resposta simpática/hipertensiva à laringoscopia). Em pacientes instáveis/choque: reduzir para 0,5 a 1 mcg/kg ou omitir.',
          manutencao_diluida_10mcg: 'Infusão Contínua Diluída (10 mcg/mL): Diluir 2 frascos de 10 mL (20 mL = 1.000 mcg) em 80 mL de SF 0,9% ou SG 5% (Volume total = 100 mL -> 10 mcg/mL). Dose de manutenção em VM: 0,5 a 2 mcg/kg/h (Habitual em adultos: 50 a 150 mcg/h = 5 a 15 mL/h).',
          manutencao_pura_50mcg: 'Infusão Contínua Pura (50 mcg/mL): Aspirar 4 frascos de 10 mL (40 mL = 2.000 mcg) puros. Dose habitual (50 a 150 mcg/h) equivale a 1 a 3 mL/h na BIC.'
        },
        alertasCriticos: [
          'RISCO DE TÓRAX RÍGIDO (Wooden Chest Syndrome): Nunca injetar bolus rápido de Fentanil! Se o paciente apresentar apneia súbita com impossibilidade de ventilar no Ambu (complacência zero), administrar bloqueador neuromuscular (Succinilcolina/Rocurônio) e/ou Naloxona imediatamente.',
          'Meia-vida contexto-sensitiva elevada: por ser altamente lipofílico, em infusões contínuas prolongadas (> 24-48h), o Fentanil acumula-se maciçamente no tecido adiposo, prolongando o despertar por vários dias após o desligamento da bomba.',
          'Fármaco de Alta Vigilância (Portaria MS / ISMP): exigir dupla checagem na programação da bomba (especialmente para não confundir solução pura de 50 mcg/mL com solução diluída de 10 mcg/mL).'
        ]
      }
    };
  }

  /**
   * Constrói a matriz determinística de compatibilidade físico-química em Y (Trissel's).
   * Chaves são pares ordenados alfabeticamente: "farmacoA|farmacoB".
   * @private
   */
  _construirMatrizCompatibilidadeY() {
    return {
      // Fenitoína (pH 12) é universalmente incompatível em Y
      'amiodarona|fenitoina': {
        status: 'incompativel',
        classificacao: 'INCOMPATÍVEL (PROIBIDO EM Y)',
        justificativaFisicoQuimica: 'Incompatibilidade ácido-base severa e de veículo. A Fenitoína possui pH fortemente alcalino (pH ~ 12,0) e exige SF 0,9%, enquanto a Amiodarona possui pH ácido (pH ~ 4,0) e exige SG 5%. A mistura em Y causa precipitação cristalina imediata de ambos os fármacos no lúmen do cateter.'
      },
      'fenitoina|sulfato_mg': {
        status: 'incompativel',
        classificacao: 'INCOMPATÍVEL (PROIBIDO EM Y)',
        justificativaFisicoQuimica: 'Precipitação imediata. O pH 12 da Fenitoína reage com os íons divalentes de Magnésio (Mg2+), formando hidróxido de magnésio insolúvel e precipitando cristais de fenitoína livre.'
      },
      'fenitoina|nitroprussiato': {
        status: 'incompativel',
        classificacao: 'INCOMPATÍVEL (PROIBIDO EM Y)',
        justificativaFisicoQuimica: 'Incompatibilidade absoluta de pH e diluente. O Nitroprussiato é preparado em SG 5% (pH 3,5-6,0) e exige linha exclusiva; o contato com a Fenitoína (pH 12) precipita cristais de fenitoína e degrada o complexo nitroprussiato.'
      },
      'fenitoina|noradrenalina': {
        status: 'incompativel',
        classificacao: 'INCOMPATÍVEL (PROIBIDO EM Y)',
        justificativaFisicoQuimica: 'Dupla tragédia farmacológica: A alcalinidade extrema da Fenitoína (pH 12) oxida e INATIVA instantaneamente a Noradrenalina (perdendo o efeito vasopressor e causando choque), enquanto a acidez da Noradrenalina (pH 3,0-4,5 em SG 5%) precipita cristais de Fenitoína.'
      },
      'fenitoina|fentanil': {
        status: 'incompativel',
        classificacao: 'INCOMPATÍVEL (PROIBIDO EM Y)',
        justificativaFisicoQuimica: 'Precipitação física imediata. O pH 12 da Fenitoína desprotona o citrato de fentanila (pH 4,0-7,5), precipitando a base livre de fentanil e cristais de fenitoína.'
      },

      // Amiodarona com demais fármacos
      'amiodarona|sulfato_mg': {
        status: 'condicional',
        classificacao: 'CONDICIONAL / ALTO RISCO (EVITAR EM Y)',
        justificativaFisicoQuimica: 'Compatibilidade dependente de concentração e diluente (Trissel). Embora compatível em baixas concentrações (Amiodarona 1,8 mg/mL + MgSO4 <= 20 mg/mL em SG 5%), concentrações elevadas de Sulfato de Magnésio (ex: 40 a 500 mg/mL) causam turvação e precipitação por efeito salting-out nas micelas de Polissorbato 80. Recomenda-se vias separadas.'
      },
      'amiodarona|nitroprussiato': {
        status: 'incompativel',
        classificacao: 'INCOMPATÍVEL / PROIBIDO',
        justificativaFisicoQuimica: 'Física e clinicamente incompatíveis. Estudos (Trissel) demonstram formação de precipitado imediato ou turvação quando Amiodarona (> 1,5 mg/mL) entra em contato com Nitroprussiato de Sódio. Além disso, o Nitroprussiato exige via exclusiva para evitar flutuações de fluxo (bolus acidental).'
      },
      'amiodarona|noradrenalina': {
        status: 'compativel',
        classificacao: 'COMPATÍVEL EM Y (EM SG 5%)',
        justificativaFisicoQuimica: 'Fisicamente e quimicamente compatíveis em Y quando ambos estão diluídos em Soro Glicosado 5% (SG 5%), pois ambos compartilham faixa de pH ácido semelhante (pH 3,0 a 4,5). Atenção hemodinâmica: não realizar bolus na linha para não acelerar a infusão da Noradrenalina.'
      },
      'amiodarona|fentanil': {
        status: 'compativel',
        classificacao: 'COMPATÍVEL EM Y',
        justificativaFisicoQuimica: 'Compatíveis em Y (Trissel). O Citrato de Fentanila (10 a 50 mcg/mL) e o Cloridrato de Amiodarona (1,5 a 6 mg/mL em SG 5%) possuem pH ácido compatível, sem evidência de precipitação ou perda de potência em até 24 horas.'
      },

      // Sulfato de Magnésio com demais fármacos
      'nitroprussiato|sulfato_mg': {
        status: 'condicional',
        classificacao: 'CONDICIONAL (EVITAR POR SEGURANÇA HEMODINÂMICA)',
        justificativaFisicoQuimica: 'Fisicamente compatíveis em SG 5% por até 4 horas em concentrações baixas, porém CLINICAMENTE CONTRAINDICADO correr em Y: o ajuste de velocidade ou o ataque de Sulfato de Magnésio (300 mL/h) empurra o Nitroprussiato contido no espaço morto do cateter, provocando hipotensão arterial severa.'
      },
      'noradrenalina|sulfato_mg': {
        status: 'compativel',
        classificacao: 'COMPATÍVEL FISICAMENTE (CAUTELA COM FLUXO)',
        justificativaFisicoQuimica: 'Fisicamente compatíveis em Y em SG 5%. Contudo, por segurança de terapia intensiva, jamais infundir dose de ataque rápida de Sulfato de Magnésio no mesmo lúmen da Noradrenalina, pois a mudança brusca de vazão causará bolus iatrogênico de vasopressor (pico hipertensivo seguido de hipotensão).'
      },
      'fentanil|sulfato_mg': {
        status: 'compativel',
        classificacao: 'COMPATÍVEL EM Y',
        justificativaFisicoQuimica: 'Totalmente compatíveis físico-quimicamente em SF 0,9% ou SG 5%, sem alteração de pH, cor ou formação de cristais.'
      },

      // Nitroprussiato com demais fármacos
      'nitroprussiato|noradrenalina': {
        status: 'condicional',
        classificacao: 'FISICAMENTE COMPATÍVEL, MAS CLINICAMENTE ANTAGÔNICO',
        justificativaFisicoQuimica: 'Fisicamente compatíveis em SG 5% (ambos pH ácido). Porém, são farmacologicamente opostos (vasodilatador potente vs vasoconstritor potente) e possuem meia-vida ultracurta (< 2 min); qualquer variação na vazão de uma bomba altera a entrega da outra no espaço morto do cateter, gerando instabilidade pressórica grave. Usar lúmens separados do acesso central.'
      },
      'fentanil|nitroprussiato': {
        status: 'condicional',
        classificacao: 'CONDICIONAL (PROIBIDO FAZER BOLUS DE FENTANIL NA LINHA)',
        justificativaFisicoQuimica: 'Fisicamente compatíveis em Y quando em infusão contínua estável. Entretanto, é ESTRITAMENTE PROIBIDO realizar bolus de Fentanil em via que contenha Nitroprussiato, pois o flush de espaço morto causará bolus de Nitroprussiato e colapso hipotensivo imediato.'
      },

      // Noradrenalina com Fentanil
      'fentanil|noradrenalina': {
        status: 'compativel',
        classificacao: 'COMPATÍVEL EM Y (INFUSÃO CONTÍNUA)',
        justificativaFisicoQuimica: 'Altamente compatíveis físico-quimicamente em Y (ambos estáveis em pH ácido ~ 3,5 a 6,0 em SG 5%). Prática rotineira e segura em lúmen de cateter venoso central na UTI, desde que mantidos em infusão contínua em BIC e sem realização de bolus manuais na mesma via.'
      }
    };
  }

  /**
   * Arredonda valores numéricos com precisão clínica segura.
   * @private
   * @param {number} valor 
   * @param {number} casas 
   * @returns {number}
   */
  _arredondar(valor, casas = 1) {
    const fator = Math.pow(10, casas);
    return Math.round((valor + Number.EPSILON) * fator) / fator;
  }

  /**
   * Gera os cálculos personalizados por peso e tabelas de titulação em BIC.
   * @private
   * @param {string} farmacoId 
   * @param {number} pesoKg 
   * @returns {Object} Dados calculados e tabela de titulação
   */
  _calcularPosologiaETitulacao(farmacoId, pesoKg) {
    const peso = (typeof pesoKg === 'number' && !isNaN(pesoKg) && pesoKg > 0) ? pesoKg : 70;
    const pesoInformado = (typeof pesoKg === 'number' && !isNaN(pesoKg) && pesoKg > 0);

    switch (farmacoId) {
      case 'amiodarona': {
        return {
          pesoReferenciaKg: peso,
          pesoFoiInformado: pesoInformado,
          calculoEspecifico: {
            ataque_150mg: {
              doseMg: 150,
              volumeAmpolaMl: 3, // 1 ampola (150mg/3mL)
              diluenteMl: 100, // SG 5%
              volumeTotalMl: 103,
              tempoInfusaoMin: '10 a 20 min',
              velocidadeBicMlHora: '300 a 600 mL/h'
            },
            ataque_300mg: {
              doseMg: 300,
              volumeAmpolaMl: 6, // 2 ampolas (300mg/6mL)
              diluenteMl: 100, // SG 5%
              volumeTotalMl: 106,
              tempoInfusaoMin: '20 a 30 min',
              velocidadeBicMlHora: '200 a 300 mL/h'
            },
            manutencao_900mg: {
              doseMg: 900,
              volumeAmpolaMl: 18, // 6 ampolas
              diluenteMl: 500, // SG 5%
              concentracaoMcgMl: 1800,
              concentracaoMgMl: 1.8,
              fase1_primeiras6h: '1 mg/min = 33,3 mL/h (33 mL/h na BIC) durante 6 horas (Total = 360 mg)',
              fase2_proximas18h: '0,5 mg/min = 16,6 mL/h (17 mL/h na BIC) durante 18 horas (Total = 540 mg)'
            }
          },
          tabelaTitulacao: [
            { fase: 'Ataque Padrão (150 mg em 100 mL SG 5%)', dose: '150 mg em 15 min', vazaoMlHora: '400 mL/h' },
            { fase: 'Ataque Refratário (300 mg em 100 mL SG 5%)', dose: '300 mg em 20 min', vazaoMlHora: '300 mL/h' },
            { fase: 'Manutenção 1ª Fase - 0 a 6h (900 mg / 500 mL SG 5%)', dose: '1,0 mg/min (60 mg/h)', vazaoMlHora: '33 mL/h' },
            { fase: 'Manutenção 2ª Fase - 6 a 24h (900 mg / 500 mL SG 5%)', dose: '0,5 mg/min (30 mg/h)', vazaoMlHora: '17 mL/h' }
          ]
        };
      }

      case 'fenitoina': {
        const doseAtaque20 = this._arredondar(peso * 20, 0);
        const doseAtaqueReal = Math.min(doseAtaque20, 1500); // Teto clínico inicial seguro 1500 mg
        const tetoAtingido = doseAtaque20 > 1500;
        const volumeAmpolaMl = this._arredondar(doseAtaqueReal / 50, 1); // 50 mg/mL
        const numAmpolas = this._arredondar(doseAtaqueReal / 250, 2);
        const tempoMinimoAdultoMin = Math.ceil(doseAtaqueReal / 50); // Vel máx 50 mg/min
        const tempoMinimoIdosoCardiopataMin = Math.ceil(doseAtaqueReal / 25); // Vel máx 25 mg/min
        const volumeDiluenteRecomendadoMl = doseAtaqueReal <= 1000 ? 100 : 250; // Manter entre 4 e 10 mg/mL
        const volumeTotalMl = volumeDiluenteRecomendadoMl + volumeAmpolaMl;
        const vazaoMaxAdultoMlHora = this._arredondar((volumeTotalMl / tempoMinimoAdultoMin) * 60, 0);
        const vazaoMaxIdosoMlHora = this._arredondar((volumeTotalMl / tempoMinimoIdosoCardiopataMin) * 60, 0);

        return {
          pesoReferenciaKg: peso,
          pesoFoiInformado: pesoInformado,
          calculoEspecifico: {
            doseCalculada20mgKg: doseAtaque20,
            dosePrescritaRecomendadaMg: doseAtaqueReal,
            alertaTetoMaximo: tetoAtingido ? 'Dose limitada ao teto máximo inicial de segurança de 1.500 mg.' : 'Dentro da faixa linear de 20 mg/kg.',
            volumeFarmacoPuroMl: volumeAmpolaMl,
            equivalenteAmpolas250mg: numAmpolas,
            diluenteObrigatorio: `${volumeDiluenteRecomendadoMl} mL de SF 0,9% PURO`,
            tempoMinimoInfusaoAdultoMin: tempoMinimoAdultoMin,
            tempoMinimoInfusaoIdosoCardiopataMin: tempoMinimoIdosoCardiopataMin,
            velocidadeMaximaBicAdulto: `${vazaoMaxAdultoMlHora} mL/h (Correr em no mínimo ${tempoMinimoAdultoMin} min -> 50 mg/min)`,
            velocidadeMaximaBicIdoso: `${vazaoMaxIdosoMlHora} mL/h (Correr em no mínimo ${tempoMinimoIdosoCardiopataMin} min -> 25 mg/min)`
          },
          tabelaTitulacao: [
            {
              perfil: `Adulto Jovem Sem Cardiopatia (${peso} kg)`,
              doseTotal: `${doseAtaqueReal} mg (${volumeAmpolaMl} mL) + ${volumeDiluenteRecomendadoMl} mL SF 0,9%`,
              taxaMaximaSegura: '50 mg/min',
              tempoMinimo: `${tempoMinimoAdultoMin} minutos`,
              vazaoMaximaBic: `${vazaoMaxAdultoMlHora} mL/h`
            },
            {
              perfil: `Idoso / Cardiopata / Instável (${peso} kg)`,
              doseTotal: `${doseAtaqueReal} mg (${volumeAmpolaMl} mL) + ${volumeDiluenteRecomendadoMl} mL SF 0,9%`,
              taxaMaximaSegura: '25 mg/min',
              tempoMinimo: `${tempoMinimoIdosoCardiopataMin} minutos`,
              vazaoMaximaBic: `${vazaoMaxIdosoMlHora} mL/h`
            }
          ]
        };
      }

      case 'sulfato_mg': {
        return {
          pesoReferenciaKg: peso,
          pesoFoiInformado: pesoInformado,
          calculoEspecifico: {
            ataque_4g_usando_ampola50porcento: {
              apresentacaoUsada: 'Ampola a 50% (5 g / 10 mL = 500 mg/mL)',
              volumeAspirarMl: 8, // 8 mL = 4 g
              volumeDiluenteMl: 92, // SF 0,9% ou SG 5%
              volumeTotalMl: 100,
              tempoInfusao: '15 a 20 minutos',
              vazaoBicMlHora: '300 mL/h (correr em 20 min) a 400 mL/h (correr em 15 min)'
            },
            ataque_4g_usando_ampola10porcento: {
              apresentacaoUsada: 'Ampola a 10% (1 g / 10 mL = 100 mg/mL)',
              volumeAspirarMl: 40, // 4 ampolas = 40 mL = 4 g
              volumeDiluenteMl: 60, // SF 0,9% ou SG 5%
              volumeTotalMl: 100,
              tempoInfusao: '15 a 20 minutos',
              vazaoBicMlHora: '300 mL/h (correr em 20 min) a 400 mL/h (correr em 15 min)'
            },
            manutencao_zuspan_padrao: {
              preparo_40mg_ml: '8 mL de MgSO4 50% (4 g) + 92 mL de SF 0,9% ou SG 5% (Volume total = 100 mL -> 40 mg/mL)',
              taxa_1g_hora: '25 mL/h em BIC',
              taxa_2g_hora: '50 mL/h em BIC'
            }
          },
          tabelaTitulacao: [
            { fase: 'Ataque Eclâmpsia (4 g em 100 mL final)', preparo: '8 mL (MgSO4 50%) + 92 mL SF/SG', meta: '4 g em 20 min', vazaoMlHora: '300 mL/h' },
            { fase: 'Manutenção Zuspan 1 g/h (Solução 4 g / 100 mL)', preparo: '8 mL (MgSO4 50%) + 92 mL SF/SG', meta: '1 g/h contínuo', vazaoMlHora: '25 mL/h' },
            { fase: 'Manutenção Zuspan 2 g/h (Solução 4 g / 100 mL)', preparo: '8 mL (MgSO4 50%) + 92 mL SF/SG', meta: '2 g/h contínuo', vazaoMlHora: '50 mL/h' },
            { fase: 'Manutenção Alternativa 1 g/h (Solução 5 g / 500 mL)', preparo: '10 mL (MgSO4 50%) + 490 mL SF/SG', meta: '1 g/h contínuo', vazaoMlHora: '100 mL/h' }
          ]
        };
      }

      case 'nitroprussiato': {
        // Concentração padrão: 50 mg em 250 mL SG 5% = 200 mcg/mL
        // Fórmula vazão (mL/h) = (Dose_mcg_kg_min * Peso_kg * 60) / Concentracao_mcg_mL
        const concPadrao = 200;
        const dosesMcgKgMin = [0.3, 0.5, 1.0, 2.0, 3.0, 4.0, 5.0, 8.0, 10.0];
        const tabela = dosesMcgKgMin.map(dose => {
          const vazao = this._arredondar((dose * peso * 60) / concPadrao, 1);
          let observacao = 'Faixa terapêutica habitual';
          if (dose <= 0.5) observacao = 'Dose inicial de titulação';
          if (dose >= 3.0 && dose <= 5.0) observacao = 'Vigiar risco de cianeto se uso > 24-48h';
          if (dose > 5.0) observacao = 'ALERTA: Alto risco de toxicidade por cianeto (Máx 10 min em 10 mcg/kg/min)';
          return {
            doseMcgKgMin: `${dose} mcg/kg/min`,
            vazaoPadrao200mcgMl: `${vazao} mL/h`,
            observacaoClinica: observacao
          };
        });

        return {
          pesoReferenciaKg: peso,
          pesoFoiInformado: pesoInformado,
          calculoEspecifico: {
            solucaoPadrao: '1 frasco-ampola (50 mg) + 248 mL de SG 5% = 250 mL (Concentração = 200 mcg/mL)',
            formulaConversao: 'Vazão (mL/h) = (Dose [mcg/kg/min] × Peso [kg] × 60) / 200',
            vazaoInicial_0_5_mcgKgMin: `${this._arredondar((0.5 * peso * 60) / concPadrao, 1)} mL/h`,
            vazaoHabitual_2_0_mcgKgMin: `${this._arredondar((2.0 * peso * 60) / concPadrao, 1)} mL/h`,
            vazaoTetoCritico_5_0_mcgKgMin: `${this._arredondar((5.0 * peso * 60) / concPadrao, 1)} mL/h`
          },
          tabelaTitulacao: tabela
        };
      }

      case 'noradrenalina': {
        // Solução Diluída (1 ampola = 4 mg em 250 mL SG 5%) = 16 mcg/mL
        // Solução Padrão Concentrada 4x (4 ampolas = 16 mg em 250 mL SG 5%) = 64 mcg/mL
        const conc16 = 16;
        const conc64 = 64;
        const dosesMcgKgMin = [0.05, 0.1, 0.2, 0.3, 0.5, 0.8, 1.0, 1.5, 2.0];
        const tabela = dosesMcgKgMin.map(dose => {
          const vazao16 = this._arredondar((dose * peso * 60) / conc16, 1);
          const vazao64 = this._arredondar((dose * peso * 60) / conc64, 1);
          let conduta = 'Choque leve a moderado';
          if (dose >= 0.25 && dose <= 0.5) conduta = 'Choque severo: Associar Vasopressina (0,03 UI/min) + Hidrocortisona (SSC 2021)';
          if (dose > 0.5) conduta = 'Choque refratário extremo: Avaliar Ecocardiograma, Inotrópico e causas mecânicas';
          return {
            doseMcgKgMin: `${dose} mcg/kg/min`,
            vazaoSolucao16mcgMl: `${vazao16} mL/h`,
            vazaoSolucao64mcgMl: `${vazao64} mL/h`,
            diretrizClinica: conduta
          };
        });

        return {
          pesoReferenciaKg: peso,
          pesoFoiInformado: pesoInformado,
          calculoEspecifico: {
            solucao_16mcg_ml: '1 ampola (4 mg base / 4 mL) + 246 mL SG 5% = 250 mL (16 mcg/mL)',
            solucao_64mcg_ml: '4 ampolas (16 mg base / 16 mL) + 234 mL SG 5% = 250 mL (64 mcg/mL)',
            doseInicial_0_05_mcgKgMin: {
              em_16mcg_ml: `${this._arredondar((0.05 * peso * 60) / conc16, 1)} mL/h`,
              em_64mcg_ml: `${this._arredondar((0.05 * peso * 60) / conc64, 1)} mL/h`
            },
            limiarAssociarVasopressina_0_25_mcgKgMin: {
              em_16mcg_ml: `${this._arredondar((0.25 * peso * 60) / conc16, 1)} mL/h`,
              em_64mcg_ml: `${this._arredondar((0.25 * peso * 60) / conc64, 1)} mL/h`
            }
          },
          tabelaTitulacao: tabela
        };
      }

      case 'fentanil': {
        // Bolus: 1 a 3 mcg/kg (50 mcg/mL)
        const bolus1McgKg = this._arredondar(peso * 1, 0);
        const bolus2McgKg = this._arredondar(peso * 2, 0);
        const bolus3McgKg = this._arredondar(peso * 3, 0);
        const volBolus1Ml = this._arredondar(bolus1McgKg / 50, 1);
        const volBolus2Ml = this._arredondar(bolus2McgKg / 50, 1);
        const volBolus3Ml = this._arredondar(bolus3McgKg / 50, 1);

        // Infusão contínua: 0.5, 1.0, 1.5, 2.0, 3.0 mcg/kg/h
        const dosesMcgKgHora = [0.5, 0.7, 1.0, 1.5, 2.0, 3.0];
        const tabela = dosesMcgKgHora.map(doseKgH => {
          const doseTotalMcgHora = this._arredondar(doseKgH * peso, 0);
          const vazaoDiluido10mcgMl = this._arredondar(doseTotalMcgHora / 10, 1);
          const vazaoPuro50mcgMl = this._arredondar(doseTotalMcgHora / 50, 1);
          return {
            doseMcgKgHora: `${doseKgH} mcg/kg/h`,
            doseTotalMcgHora: `${doseTotalMcgHora} mcg/h`,
            vazaoSolucaoDiluida10mcgMl: `${vazaoDiluido10mcgMl} mL/h`,
            vazaoSolucaoPura50mcgMl: `${vazaoPuro50mcgMl} mL/h`
          };
        });

        return {
          pesoReferenciaKg: peso,
          pesoFoiInformado: pesoInformado,
          calculoEspecifico: {
            bolusAnalgesiaProcedimento_1mcgKg: `${bolus1McgKg} mcg (${volBolus1Ml} mL da ampola pura de 50 mcg/mL) IV lento em 3 min`,
            bolusIntubacaoPadrao_2mcgKg: `${bolus2McgKg} mcg (${volBolus2Ml} mL da ampola pura de 50 mcg/mL) IV lento em 3 min`,
            bolusIntubacaoNeuro_3mcgKg: `${bolus3McgKg} mcg (${volBolus3Ml} mL da ampola pura de 50 mcg/mL) IV lento em 3 a 5 min`,
            preparoDiluido10mcgMl: '20 mL de Fentanil (1.000 mcg) + 80 mL de SF 0,9% ou SG 5% = 100 mL (10 mcg/mL)',
            preparoPuro50mcgMl: '40 mL de Fentanil puro (2.000 mcg) em seringa perfusora ou BIC (50 mcg/mL)'
          },
          tabelaTitulacao: tabela
        };
      }

      default:
        return {
          pesoReferenciaKg: peso,
          pesoFoiInformado: pesoInformado,
          calculoEspecifico: {},
          tabelaTitulacao: []
        };
    }
  }

  /**
   * Formata o relatório clínico completo e determinístico em texto estruturado.
   * @private
   * @param {Object} dadosFarmaco 
   * @param {Object} dadosCalculados 
   * @returns {string}
   */
  _gerarTextoFormatado(dadosFarmaco, dadosCalculados) {
    const linhas = [];
    const pesoStr = dadosCalculados.pesoFoiInformado
      ? `${dadosCalculados.pesoReferenciaKg} kg (Informado)`
      : `${dadosCalculados.pesoReferenciaKg} kg (Padrão Adulto Referência)`;

    linhas.push(`====================================================================`);
    linhas.push(`💉 GUIA DE DILUIÇÃO E INFUSÃO CRÍTICA: ${dadosFarmaco.nomeGenerico.toUpperCase()}`);
    linhas.push(`====================================================================`);
    linhas.push(`• Nomes Comerciais: ${dadosFarmaco.nomesComerciais.join(', ')}`);
    linhas.push(`• Classe: ${dadosFarmaco.classeTerapeutica}`);
    linhas.push(`• Apresentação: ${dadosFarmaco.apresentacao}`);
    linhas.push(`• pH da Solução: ${dadosFarmaco.phSolucao}`);
    linhas.push(`• Peso de Referência para Cálculos: ${pesoStr}`);
    linhas.push(``);
    linhas.push(`🧪 1. DILUENTES E ESTABILIDADE FÍSICO-QUÍMICA`);
    linhas.push(`• DILUENTE OBRIGATÓRIO: ${dadosFarmaco.diluenteObrigatorio}`);
    linhas.push(`• DILUENTES PROIBIDOS / INCOMPATIBILIDADES:`);
    dadosFarmaco.diluentesProibidos.forEach(item => {
      linhas.push(`  [X] ${item}`);
    });
    linhas.push(``);
    linhas.push(`⏱️ 2. PARÂMETROS DE SEGURANÇA DE INFUSÃO E ACESSO`);
    linhas.push(`• Tempo Mínimo de Infusão (Ataque/Bolus): ${dadosFarmaco.tempoMinimoInfusaoMin > 0 ? dadosFarmaco.tempoMinimoInfusaoMin + ' minutos' : 'Infusão contínua titulável'}`);
    linhas.push(`• Velocidade Máxima Segura: ${dadosFarmaco.velocidadeMaxima}`);
    linhas.push(`• Via de Acesso Venoso: ${dadosFarmaco.viaAcesso}`);
    linhas.push(``);
    linhas.push(`📋 3. PROTOCOLOS POSOLÓGICOS E PREPARO PASSO A PASSO`);
    Object.values(dadosFarmaco.protocolosPosologicos).forEach(prot => {
      linhas.push(`  ▸ ${prot}`);
    });

    // Secção específica de cálculos pelo peso
    linhas.push(``);
    linhas.push(`🧮 4. CÁLCULO PERSONALIZADO E TABELA DE TITULAÇÃO (${dadosCalculados.pesoReferenciaKg} kg)`);
    if (dadosFarmaco.id === 'fenitoina') {
      const c = dadosCalculados.calculoEspecifico;
      linhas.push(`  • Dose de Ataque (20 mg/kg): ${c.dosePrescritaRecomendadaMg} mg (${c.volumeFarmacoPuroMl} mL = ${c.equivalenteAmpolas250mg} ampolas)`);
      linhas.push(`  • Preparo: Diluir em ${c.diluenteObrigatorio}`);
      linhas.push(`  • BIC Adulto (Máx 50 mg/min): Correr em no mínimo ${c.tempoMinimoInfusaoAdultoMin} min (Vazão máx: ${c.velocidadeMaximaBicAdulto})`);
      linhas.push(`  • BIC Idoso/Cardiopata (Máx 25 mg/min): Correr em no mínimo ${c.tempoMinimoInfusaoIdosoCardiopataMin} min (Vazão máx: ${c.velocidadeMaximaBicIdoso})`);
    } else if (dadosFarmaco.id === 'amiodarona') {
      dadosCalculados.tabelaTitulacao.forEach(row => {
        linhas.push(`  • ${row.fase}: ${row.dose} -> Vazão BIC: ${row.vazaoMlHora}`);
      });
    } else if (dadosFarmaco.id === 'sulfato_mg') {
      dadosCalculados.tabelaTitulacao.forEach(row => {
        linhas.push(`  • ${row.fase} [${row.preparo}] -> Vazão BIC: ${row.vazaoMlHora}`);
      });
    } else if (dadosFarmaco.id === 'nitroprussiato') {
      linhas.push(`  • Preparo Padrão (200 mcg/mL): 1 FA (50 mg) + 248 mL SG 5% (Fotoproteger!)`);
      dadosCalculados.tabelaTitulacao.forEach(row => {
        linhas.push(`  • ${row.doseMcgKgMin.padEnd(16)} -> BIC: ${row.vazaoPadrao200mcgMl.padEnd(10)} (${row.observacaoClinica})`);
      });
    } else if (dadosFarmaco.id === 'noradrenalina') {
      linhas.push(`  • Solução 16 mcg/mL: 1 amp (4 mg/4 mL) + 246 mL SG 5%`);
      linhas.push(`  • Solução 64 mcg/mL (4x): 4 amp (16 mg/16 mL) + 234 mL SG 5%`);
      dadosCalculados.tabelaTitulacao.forEach(row => {
        linhas.push(`  • ${row.doseMcgKgMin.padEnd(16)} -> [16 mcg/mL]: ${row.vazaoSolucao16mcgMl.padEnd(10)} | [64 mcg/mL]: ${row.vazaoSolucao64mcgMl.padEnd(10)}`);
      });
    } else if (dadosFarmaco.id === 'fentanil') {
      const c = dadosCalculados.calculoEspecifico;
      linhas.push(`  • Bolus Analgesia (1 mcg/kg): ${c.bolusAnalgesiaProcedimento_1mcgKg}`);
      linhas.push(`  • Bolus SRI / Intubação (2 mcg/kg): ${c.bolusIntubacaoPadrao_2mcgKg}`);
      linhas.push(`  • Bolus SRI Neuro / HIC (3 mcg/kg): ${c.bolusIntubacaoNeuro_3mcgKg}`);
      linhas.push(`  • Infusão Contínua em BIC:`);
      dadosCalculados.tabelaTitulacao.forEach(row => {
        linhas.push(`    - ${row.doseMcgKgHora} (${row.doseTotalMcgHora}) -> Diluído [10 mcg/mL]: ${row.vazaoSolucaoDiluida10mcgMl} | Puro [50 mcg/mL]: ${row.vazaoSolucaoPura50mcgMl}`);
      });
    }

    linhas.push(``);
    linhas.push(`🖥️ 5. MONITORIZAÇÃO OBRIGATÓRIA`);
    dadosFarmaco.monitorizacao.forEach(m => {
      linhas.push(`  • ${m}`);
    });

    linhas.push(``);
    linhas.push(`🛡️ 6. ANTÍDOTO E MANEJO DE TOXICIDADE / EXTRAVASAMENTO`);
    linhas.push(`  • ${dadosFarmaco.antidoto}`);

    linhas.push(``);
    linhas.push(`🚨 7. ALERTAS CRÍTICOS DE SEGURANÇA DO PACIENTE`);
    dadosFarmaco.alertasCriticos.forEach(alerta => {
      linhas.push(`  [!] ${alerta}`);
    });
    linhas.push(`====================================================================`);

    return linhas.join('\n');
  }

  /**
   * Consulta um fármaco injetável crítico no catálogo determinístico e calcula
   * doses, diluições, velocidades máximas e tabelas de titulação para o peso informado.
   * 
   * @public
   * @param {string} farmacoId - Identificador ou nome do fármaco (ex: 'amiodarona', 'fenitoina', 'sulfato_mg', 'nitroprussiato', 'noradrenalina', 'fentanil').
   * @param {number} [pesoKg=70] - Peso corpóreo do paciente em quilogramas (padrão: 70 kg se omitido).
   * @returns {Object} Objeto estritamente tipado contendo todos os parâmetros farmacológicos e texto formatado.
   * @throws {Error} Se o fármaco não for encontrado ou os parâmetros forem inválidos.
   */
  consultarFarmaco(farmacoId, pesoKg = 70) {
    const idCanonica = this._resolverFarmacoId(farmacoId);
    if (!idCanonica) {
      const disponiveis = Object.keys(this._catalogo).join(', ');
      throw new Error(`Fármaco '${farmacoId}' não encontrado no catálogo de injetáveis críticos. Opções válidas: ${disponiveis}.`);
    }

    let pesoValido = 70;
    if (pesoKg !== undefined && pesoKg !== null && pesoKg !== '') {
      const pesoNum = Number(pesoKg);
      if (isNaN(pesoNum) || pesoNum <= 0 || pesoNum > 350) {
        throw new Error(`Peso inválido (${pesoKg}). Informe um peso numérico positivo entre 0,5 kg e 350 kg.`);
      }
      pesoValido = pesoNum;
    }

    const base = this._catalogo[idCanonica];
    const dadosCalculados = this._calcularPosologiaETitulacao(idCanonica, pesoValido);
    const textoFormatado = this._gerarTextoFormatado(base, dadosCalculados);

    return {
      id: base.id,
      nomeGenerico: base.nomeGenerico,
      nomesComerciais: [...base.nomesComerciais],
      classeTerapeutica: base.classeTerapeutica,
      pesoReferenciaKg: dadosCalculados.pesoReferenciaKg,
      apresentacao: base.apresentacao,
      phSolucao: base.phSolucao,
      diluenteObrigatorio: base.diluenteObrigatorio,
      diluentesProibidos: [...base.diluentesProibidos],
      concentracaoFinal: { ...base.concentracaoFinal },
      tempoMinimoInfusaoMin: base.tempoMinimoInfusaoMin,
      velocidadeMaxima: base.velocidadeMaxima,
      viaAcesso: base.viaAcesso,
      monitorizacao: [...base.monitorizacao],
      antidoto: base.antidoto,
      protocolosPosologicos: { ...base.protocolosPosologicos },
      calculosPersonalizados: dadosCalculados.calculoEspecifico,
      tabelaTitulacao: [...dadosCalculados.tabelaTitulacao],
      alertasCriticos: [...base.alertasCriticos],
      textoFormatado: textoFormatado
    };
  }

  /**
   * Verifica a compatibilidade físico-química e clínica na administração simultânea em Y
   * entre dois fármacos injetáveis do catálogo.
   * 
   * @public
   * @param {string} farmacoA - ID ou nome do primeiro fármaco.
   * @param {string} farmacoB - ID ou nome do segundo fármaco.
   * @returns {Object} Parecer estruturado com status ('compativel', 'incompativel' ou 'condicional'), justificativa físico-química e textoFormatado.
   */
  checarCompatibilidadeY(farmacoA, farmacoB) {
    const idA = this._resolverFarmacoId(farmacoA);
    const idB = this._resolverFarmacoId(farmacoB);

    if (!idA) {
      throw new Error(`Primeiro fármaco ('${farmacoA}') não reconhecido no catálogo.`);
    }
    if (!idB) {
      throw new Error(`Segundo fármaco ('${farmacoB}') não reconhecido no catálogo.`);
    }

    const objA = this._catalogo[idA];
    const objB = this._catalogo[idB];

    if (idA === idB) {
      const msgMesmo = `Mesmo fármaco selecionado (${objA.nomeGenerico}). Compatível consigo mesmo, respeitando a concentração máxima e o diluente obrigatório (${objA.diluenteObrigatorio}).`;
      return {
        farmacoA: { id: objA.id, nomeGenerico: objA.nomeGenerico, ph: objA.phSolucao, diluenteObrigatorio: objA.diluenteObrigatorio },
        farmacoB: { id: objB.id, nomeGenerico: objB.nomeGenerico, ph: objB.phSolucao, diluenteObrigatorio: objB.diluenteObrigatorio },
        status: 'compativel',
        compativel: true,
        classificacao: 'COMPATÍVEL (MESMO FÁRMACO)',
        justificativaFisicoQuimica: msgMesmo,
        recomendacaoClinica: 'Manter infusão em linha única conforme protocolo institucional.',
        textoFormatado: `✅ COMPATIBILIDADE EM Y: ${objA.nomeGenerico} + ${objB.nomeGenerico}\n• Status: COMPATÍVEL (MESMO FÁRMACO)\n• Justificativa: ${msgMesmo}`
      };
    }

    // Ordenação alfabética das chaves para busca simétrica na matriz
    const parOrdenado = [idA, idB].sort().join('|');
    const registro = this._matrizCompatibilidade[parOrdenado];

    if (!registro) {
      return {
        farmacoA: { id: objA.id, nomeGenerico: objA.nomeGenerico, ph: objA.phSolucao, diluenteObrigatorio: objA.diluenteObrigatorio },
        farmacoB: { id: objB.id, nomeGenerico: objB.nomeGenerico, ph: objB.phSolucao, diluenteObrigatorio: objB.diluenteObrigatorio },
        status: 'incompativel',
        compativel: false,
        classificacao: 'DADOS INSUFICIENTES - ASSUMIR INCOMPATÍVEL POR SEGURANÇA',
        justificativaFisicoQuimica: 'Ausência de estudos conclusivos de estabilidade em Y para esta combinação específica. Na farmacologia intensiva, a ausência de evidência de compatibilidade exige administração em vias separadas.',
        recomendacaoClinica: 'Infundir em lúmens separados do cateter venoso central ou em acessos periféricos distintos.',
        textoFormatado: `⚠️ COMPATIBILIDADE EM Y: ${objA.nomeGenerico} + ${objB.nomeGenerico}\n• Status: INCOMPATÍVEL POR PRECAUÇÃO\n• Conduta: Utilizar vias venosas exclusivas/separadas.`
      };
    }

    const icone = registro.status === 'compativel'
      ? '✅'
      : (registro.status === 'incompativel' ? '🚫' : '⚠️');

    let recomendacao = '';
    if (registro.status === 'incompativel') {
      recomendacao = 'PROIBIDO infundir na mesma via ou torneirinha (three-way). Utilizar lúmens distintos de acesso central ou acessos periféricos separados. Se precisar usar a mesma via sequencialmente, lavar vigorosamente o cateter com 20 mL de SF 0,9% entre as drogas (respeitando o diluente da Fenitoína/Amiodarona).';
    } else if (registro.status === 'condicional') {
      recomendacao = 'Evitar infusão simultânea em Y sempre que houver outro lúmen ou acesso disponível. Caso seja estritamente inevitável em emergência, utilizar Bomba de Infusão Contínua sem realizar bolus/flushes na linha e inspecionar visualmente o equipo contra luz a cada 15 minutos em busca de turvação ou microcristais.';
    } else {
      recomendacao = 'Pode ser conectado em Y (preferencialmente ambos diluídos em SG 5% quando envolver Noradrenalina ou Amiodarona). PROIBIDO realizar bolus rápido na linha compartilhada com drogas vasoativas.';
    }

    const textoFormatado = [
      `====================================================================`,
      `${icone} PARECER DE COMPATIBILIDADE EM Y (TRISSEL'S HANDBOOK)`,
      `====================================================================`,
      `• Fármaco A: ${objA.nomeGenerico} (pH: ${objA.phSolucao} | Diluente: ${objA.diluenteObrigatorio})`,
      `• Fármaco B: ${objB.nomeGenerico} (pH: ${objB.phSolucao} | Diluente: ${objB.diluenteObrigatorio})`,
      `• Classificação: ${registro.classificacao}`,
      ``,
      `🔬 JUSTIFICATIVA FÍSICO-QUÍMICA E FARMACOLÓGICA:`,
      `  ${registro.justificativaFisicoQuimica}`,
      ``,
      `🩺 CONDUTA PRÁTICA DE ENFERMAGEM E MEDICINA INTENSIVA:`,
      `  ${recomendacao}`,
      `====================================================================`
    ].join('\n');

    return {
      farmacoA: {
        id: objA.id,
        nomeGenerico: objA.nomeGenerico,
        ph: objA.phSolucao,
        diluenteObrigatorio: objA.diluenteObrigatorio
      },
      farmacoB: {
        id: objB.id,
        nomeGenerico: objB.nomeGenerico,
        ph: objB.phSolucao,
        diluenteObrigatorio: objB.diluenteObrigatorio
      },
      status: registro.status,
      compativel: registro.status === 'compativel',
      classificacao: registro.classificacao,
      justificativaFisicoQuimica: registro.justificativaFisicoQuimica,
      recomendacaoClinica: recomendacao,
      textoFormatado: textoFormatado
    };
  }

  /**
   * Lista todos os fármacos disponíveis no catálogo com seus respectivos metadados resumidos
   * para construção determinística de menus e interfaces.
   * 
   * @public
   * @returns {Array<Object>} Lista de objetos contendo id, nomeGenerico, nomesComerciais, apresentacao e diluenteObrigatorio.
   */
  listarCatalogo() {
    return Object.values(this._catalogo).map(item => ({
      id: item.id,
      nomeGenerico: item.nomeGenerico,
      nomesComerciais: [...item.nomesComerciais],
      classeTerapeutica: item.classeTerapeutica,
      apresentacao: item.apresentacao,
      diluenteObrigatorio: item.diluenteObrigatorio
    }));
  }
}

if (typeof module !== "undefined" && module.exports) module.exports = DiluicaoInjetaveisDomain;
