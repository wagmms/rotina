/**
 * ==============================================================================
 * src/04_ia_local_fallback.js - MOTOR DE IA GENERATIVA LOCAL E FALLBACK OFFLINE
 * ==============================================================================
 * Provedor de alta disponibilidade para execução de IA generativa em nós locais
 * (Llama 3 / Mistral via OpenAI-compatível: Ollama, LocalAI, vLLM, llama.cpp)
 * com salvaguarda mandatória de Fallback Clínico Determinístico quando as redes
 * em nuvem e os servidores locais estiverem inacessíveis.
 *
 * Em conformidade estrita com o AGENTS.md:
 * - Prioridade absoluta para a qualidade e segurança do conteúdo clínico beira-leito.
 * - O paciente e o médico assistente NUNCA ficam desassistidos em situações críticas.
 * - Doses, vias, contraindicações absolutas e prazos de reavaliação preservados.
 * ==============================================================================
 */

var IaLocalFallbackService = (function () {
  'use strict';

  var MODELOS_HOMOLOGADOS_LOCAL = [
    'llama3.1:latest',
    'llama3:8b',
    'mistral:latest',
    'llama3:latest',
    'mistral:7b',
    'qwen2.5:latest'
  ];

  /**
   * Catálogo de protocolos determinísticos de contingência para emergências clínicas
   * e cenários de alta gravidade baseados nas diretrizes SBC, AMIB, FEBRASGO, SBD, PCDT/MS.
   */
  var PROTOCOLOS_OFFLINE = {
    PCR_ADULTO: {
      titulo: 'PARADA CARDIORRESPIRATÓRIA (PCR ADULTO - DIRETRIZES ACLS/SBC)',
      palavrasChave: ['pcr', 'parada', 'cardiorrespiratoria', 'fv', 'tv sem pulso', 'assistolia', 'aesp', 'desfibrilacao', 'massagem cardiaca'],
      gerarConduta: function (dados) {
        return [
          '🚨 *CONDUTA IMEDIATA EM PARADA CARDIORRESPIRATÓRIA (ACLS)*',
          '',
          '1. *RECONHECIMENTO E SUPORTE BÁSICO:*',
          '• Iniciar imediatamente RCP de alta qualidade (100 a 120 compressões/minuto, profundidade de 5 a 6 cm, permitir retorno total do tórax).',
          '• Minimizar interrupções nas compressões (< 10 segundos).',
          '• Relação 30:2 sem via aérea avançada; ventilação a cada 6 segundos contínua se tubo orotraqueal/supraglótico posicionado.',
          '• Conectar monitor/desfibrilador e checar ritmo a cada 2 minutos.',
          '',
          '2. *DIFERENCIAÇÃO DE RITMO:*',
          '• *RITMOS CHOCÁVEIS (FV / TV sem pulso):*',
          '  - 1º Choque: Desfibrilação bifásica imediata (200 J) -> reiniciar RCP imediatamente por 2 minutos.',
          '  - 2º Choque: Novo choque (200 J) + *Adrenalina 1 mg IV/IO* (repetir a cada 3 a 5 minutos) em bólus com flush de 20 mL de SF.',
          '  - 3º Choque: Novo choque (200 J) + *Amiodarona 300 mg IV/IO* (1º bólus rápido diluído em SG 5%).',
          '  - 5º Choque: Se refratário, aplicar segundo bólus de *Amiodarona 150 mg IV/IO*.',
          '• *RITMOS NÃO CHOCÁVEIS (Assistolia / AESP):*',
          '  - NÃO chocar!',
          '  - *Adrenalina 1 mg IV/IO* imediata, repetindo a cada 3 a 5 minutos.',
          '  - RCP de alta qualidade ininterrupta em ciclos de 2 minutos.',
          '  - Investigação ativa imediata das causas reversíveis (*5Hs e 5Ts*): Hipovolemia, Hipóxia, Hidrogênio (acidose), Hipo/Hipercalemia, Hipotermia | Tensão no tórax (pneumotórax hipertensivo), Tamponamento cardíaco, Toxinas, Trombose pulmonar (TEP), Trombose coronária (IAM).',
          '',
          '3. *CUIDADOS PÓS-PCR (SE RCE):*',
          '• Alvo de SatO2: 92% a 98% (evitar hiperóxia deletéria); Alvo de PaCO2: 35 a 45 mmHg.',
          '• Alvo hemodinâmico: PAS >= 90 mmHg e PAM >= 65 mmHg (iniciar Noradrenalina se hipotensão).',
          '• ECG de 12 derivações imediato para triagem de IAM com supra de ST (indicação de hemodinâmica de emergência).'
        ].join('\n');
      }
    },

    PCR_GESTANTE: {
      titulo: 'PARADA CARDIORRESPIRATÓRIA NA GESTANTE (ACLS MATERNO / PERIMORTEM)',
      palavrasChave: ['pcr gestante', 'parada gestante', 'perimortem', 'dule', 'gestacao parada', 'acls materno'],
      gerarConduta: function (dados) {
        return [
          '🤰 *CONDUTA CRÍTICA EM PCR MATERNA (DIRETRIZES FEBRASGO / AHA)*',
          '',
          '1. *MANOBRA OBRIGATÓRIA (DULE):*',
          '• Em toda gestante com IG >= 20 semanas ou fundo uterino na cicatriz umbilical, realizar imediatamente a *Deslocamento Uterino para a Esquerda (DULE)* com técnica bimanual contínua.',
          '• ⚠️ *ALERTA CRÍTICO:* NUNCA inclinar a prancha ou o leito a 30 graus (reduz a eficácia da massagem cardíaca). Mantenha a paciente em decúbito dorsal horizontal estrito com DULE manual.',
          '',
          '2. *ACESSO E DROGAS:*',
          '• Acesso venoso ou intraósseo OBRIGATORIAMENTE *acima do diafragma* (jugular, subclávia, membros superiores) para vencer o bloqueio da veia cava inferior.',
          '• Doses de desfibrilação e medicações seguem o protocolo ACLS padrão (Adrenalina 1 mg a cada 3-5min; Amiodarona 300mg / 150mg se FV/TV).',
          '',
          '3. *REGRA DOS 4 A 5 MINUTOS (CESARIANA PERIMORTEM):*',
          '• Se a gestante estiver com IG >= 20 semanas e não obtiver retorno da circulação espontânea (RCE) em *4 minutos* de manobras de RCP eficazes:',
          '• Iniciar imediatamente a *CESARIANA PERIMORTEM / RESSUSCITADORA* no próprio leito de parada (NÃO transportar ao centro cirúrgico).',
          '• Objetivo: Extração fetal no 5º minuto para descompressão aortocaval imediata e viabilização da sobrevida materna e fetal.'
        ].join('\n');
      }
    },

    CHOQUE_SEPTICO: {
      titulo: 'CHOQUE SÉPTICO E SEPSE GRAVE (SURVIVING SEPSIS CAMPAIGN / ILAS)',
      palavrasChave: ['choque septico', 'sepse', 'noradrenalina', 'pam < 65', 'lactato', 'bundle', 'infeccao grave'],
      gerarConduta: function (dados) {
        return [
          '⚡ *BUNDLE DE 1 HORA DE SEPSE E CHOQUE SÉPTICO (ILAS / SSC)*',
          '',
          '1. *MEDIDAS DE RESGATE EM ATÉ 60 MINUTOS:*',
          '• Dosagem imediata de *Lactato sérico* arterial ou venoso (repetir em 2 a 4h se alterado).',
          '• Coleta de *2 pares de hemoculturas* (de sítios anatômicos diferentes) antes do início do antimicrobiano.',
          '• Início precoce de *Antibioticoterapia de amplo espectro* na 1ª hora (não atrasar a infusão se houver demora na coleta de culturas).',
          '',
          '2. *RESSUSCITAÇÃO VOLÊMICA:*',
          '• Em caso de hipotensão (PAS < 90 ou PAM < 65 mmHg) ou Lactato >= 4 mmol/L (36 mg/dL):',
          '  - Administrar cristaloide isotônico balanceado (*Ringer Lactato*) na dose de *30 mL/kg* em até 3 horas.',
          '',
          '3. *VASOPRESSORES (DROGA VASOATIVA):*',
          '• *Noradrenalina de 1ª Linha:* Iniciar em bomba de infusão se PAM < 65 mmHg após ou durante a expansão volêmica.',
          '  - Concentração padrão: 4 ampolas (16 mg) em 234 mL de SG 5% (64 mcg/mL).',
          '  - Taxa inicial: 0,05 a 0,2 mcg/kg/min, titulando a cada 5 a 10 min com meta de *PAM >= 65 mmHg*.',
          '• Se PAM refratária com doses crescentes de Noradrenalina (> 0,25 mcg/kg/min): associar *Vasopressina* 0,03 U/min em dose fixa contínua (não titular).',
          '• Hidrocortisona 200 mg/dia IV contínua ou 50 mg 6/6h se choque refratário a vasopressores.'
        ].join('\n');
      }
    },

    CHOQUE_ANAFILATICO: {
      titulo: 'CHOQUE ANAFILÁTICO E REAÇÃO ANAFILÁTICA GRAVE (WAO / ASBAI)',
      palavrasChave: ['anafilaxia', 'choque anafilatico', 'estridor', 'edema de glote', 'urticaria', 'broncoespasmo anafilaxia'],
      gerarConduta: function (dados) {
        return [
          '🚨 *CONDUTA IMEDIATA EM ANAFILAXIA GRAVE (WAO / ASBAI)*',
          '',
          '1. *MEDICAÇÃO DE 1ª LINHA - ADRENALINA IMEDIATA:*',
          '• *ADRENALINA (1:1.000 / 1 mg/mL) INTRAMUSCULAR* no terço anterolateral do vasto lateral da coxa:',
          '  - Adultos e crianças > 30 kg: *0,5 mg (0,5 mL)* IM.',
          '  - Crianças 15 a 30 kg: *0,3 mg (0,3 mL)* IM.',
          '  - Crianças < 15 kg: *0,15 mg (0,15 mL)* IM.',
          '• ⚠️ Repetir a mesma dose a cada 5 a 15 minutos caso não haja melhora clínica.',
          '',
          '2. *SUPORTE CIRCULATÓRIO E RESPIRATÓRIO:*',
          '• Colocar em decúbito dorsal e elevar membros inferiores (exceto se vômitos ou desconforto respiratório severo).',
          '• Oxigênio sob máscara com reservatório (alvo SatO2 >= 94%).',
          '• Dois acessos calibrosos: expansão rápida com Ringer Lactato ou SF 0,9% (1.000 a 2.000 mL no adulto; 20 mL/kg na criança).',
          '',
          '3. *FÁRMACOS DE 2ª LINHA (APÓS A ADRENALINA):*',
          '• Anti-histamínico H1: Difenidramina 25 a 50 mg IV ou Prometazina 25 mg IM (não atrasar a adrenalina).',
          '• Corticoterapia: Hidrocortisona 200 a 500 mg IV ou Metilprednisolona 1 a 2 mg/kg IV para prevenção de resposta bifásica tardia.',
          '• Salbutamol inalatório se broncoespasmo refratário.'
        ].join('\n');
      }
    },

    SCA_IAM: {
      titulo: 'SÍNDROME CORONARIANA AGUDA / INFARTO AGUDO DO MIOCÁRDIO (SBC / ESC)',
      palavrasChave: ['infarto', 'iam', 'sca', 'dor toracica', 'supra de st', 'angina', 'troponina'],
      gerarConduta: function (dados) {
        return [
          '❤️ *CONDUTA EM SÍNDROME CORONARIANA AGUDA (SCA / IAM - DIRETRIZES SBC)*',
          '',
          '1. *ABORDAGEM EM ATÉ 10 MINUTOS (PORTA-ECG):*',
          '• ECG de 12 derivações realizado e laudado em menos de 10 minutos da chegada.',
          '• Monitorização contínua (MOV: Monitor, O2 se SatO2 < 90%, Veia calibrosa).',
          '',
          '2. *DUPLO BLOQUEIO PLAQUETÁRIO IMEDIATO:*',
          '• *AAS:* 200 a 300 mg via oral (mastigar e engolir). Manutenção: 100 mg/dia.',
          '• *Inibidor P2Y12:*',
          '  - *Ticagrelor:* 180 mg VO (2 cp de 90 mg) de ataque (preferencial), seguido de 90 mg 12/12h; OU',
          '  - *Clopidogrel:* 300 mg VO (se > 75 anos ou com indicação de fibrinólise) ou 600 mg VO (se angioplastia primária programada).',
          '',
          '3. *ANALGESIA E VASODILATAÇÃO:*',
          '• *Nitrato:* Dinitrato de Isossorbida 5 mg SL a cada 5 min (máximo 3 doses) para controle da dor anginosa.',
          '  - ⛔ *CONTRAINDICAÇÕES ABSOLUTAS DO NITRATO:* PAS < 90 mmHg, suspeita de infarto de ventrículo direito (derivações V3R e V4R), ou uso de inibidor de PDE-5 (Sildenafila nas últimas 24h ou Tadalafila nas últimas 48h).',
          '• *Morfina:* 2 a 4 mg IV apenas se dor refratária persistente após nitrato.',
          '',
          '4. *ANTICOAGULAÇÃO:*',
          '• *Enoxaparina:* 1 mg/kg SC 12/12h (ajustar para 1 mg/kg 1x/dia se ClCr < 30 mL/min; em > 75 anos com supra: 0,75 mg/kg sem bólus IV).',
          '',
          '5. *TERAPIA DE REPERFUSÃO (SE IAM COM SUPRA DE ST):*',
          '• *Angioplastia Primária:* Padrão-ouro se tempo porta-balão puder ser realizado em até 120 minutos.',
          '• *Fibrinólise (Alteplase ou Tenecteplase):* Indicada se tempo até angioplastia for > 120 minutos (tempo porta-agulha alvo < 30 min).'
        ].join('\n');
      }
    },

    AVC_ISQUEMICO: {
      titulo: 'AVC ISQUÊMICO AGUDO E PROTOCOLO DE TROMBÓLISE (SBN / ESO / AHA)',
      palavrasChave: ['avc', 'avci', 'derrame', 'trombolise', 'alteplase', 'fraqueza subita', 'afasia'],
      gerarConduta: function (dados) {
        return [
          '🧠 *PROTOCOLO DE AVC ISQUÊMICO AGUDO E TROMBÓLISE (SBN / AHA)*',
          '',
          '1. *CRONOGRAMA E TRIAGEM RÁPIDA (JANELA DE 4,5 HORAS):*',
          '• Determinar o horário exato de início dos sintomas (ou última vez visto assintomático / "wake-up stroke").',
          '• Glicemia capilar imediata (descartar hipoglicemia como mimicker do AVC).',
          '• TC de crânio sem contraste de urgência: descartar sangramento intracraniano e calcular escore ASPECTS.',
          '',
          '2. *CONTROLE RIGOROSO DA PRESSÃO ARTERIAL:*',
          '• Se elegível para trombólise: a PA deve estar rigorosamente *PAS < 185 mmHg e PAD < 110 mmHg* antes de iniciar a infusão.',
          '  - Droga de escolha: Nitroprussiato de Sódio IV contínuo em bomba ou Labetalol.',
          '• Se NÃO elegível para trombólise: tolerar níveis pressóricos mais elevados para perfusão colateral; tratar apenas se PAS > 220 mmHg ou PAD > 120 mmHg.',
          '',
          '3. *TROMBÓLISE ENDOVENOSA (ALTEPLASE / RT-PA):*',
          '• Dose total: *0,9 mg/kg* (dose máxima 90 mg).',
          '  - 10% da dose administrada em bólus IV rápido em 1 minuto.',
          '  - 90% restantes administrados em bomba de infusão contínua em 60 minutos.',
          '• Manter PA < 180x105 mmHg durante e nas primeiras 24h após a trombólise.',
          '• Monitorização neurológica seriada a cada 15 min nas primeiras 2 horas.',
          '• NÃO administrar antiplaquetários ou anticoagulantes nas primeiras 24 horas pós-trombólise.'
        ].join('\n');
      }
    },

    CETOACIDOSE_DIABETICA: {
      titulo: 'CETOACIDOSE DIABÉTICA E ESTADO HIPEROSMOLAR (SBD / ADA)',
      palavrasChave: ['cetoacidose', 'cad', 'diabetes descompensado', 'hiperglicemia cetonica', 'kussmaul', 'hgt alto'],
      gerarConduta: function (dados) {
        return [
          '🩸 *PROTOCOLO DE CETOACIDOSE DIABÉTICA (CAD - DIRETRIZES SBD / ADA)*',
          '',
          '1. *CRITÉRIOS DIAGNÓSTICOS:*',
          '• Glicemia > 250 mg/dL + pH < 7,30 + Bicarbonato < 18 mEq/L + Cetonúria/Cetonemia positiva + Anion Gap elevado (> 10-12).',
          '',
          '2. *ETAPA 1: HIDRATAÇÃO VENOSA VIGOROSA:*',
          '• Iniciar imediatamente com *Soro Fisiológico 0,9%*: 1.000 mL/hora nas primeiras 1 a 2 horas.',
          '• Ajustar para 250 a 500 mL/h conforme status volêmico e nível de sódio corrigido.',
          '',
          '3. *ETAPA 2: REGRA DE OURO DO POTÁSSIO SÉRICO:*',
          '• ⛔ *ATENÇÃO MÁXIMA:* NUNCA iniciar insulina se K+ sérico < 3,3 mEq/L!',
          '  - Se K+ < 3,3 mEq/L: Adiar a insulina! Repor KCl (20 a 40 mEq/h) até K+ atingir >= 3,3 mEq/L.',
          '  - Se K+ entre 3,3 e 5,3 mEq/L: Repor 20 a 30 mEq de KCl por litro de solução para manter K+ entre 4 e 5 mEq/L.',
          '  - Se K+ > 5,3 mEq/L: Não repor potássio; dosar a cada 2 horas.',
          '',
          '4. *ETAPA 3: INSULINOTERAPIA REGULAR INTRAVENOSA:*',
          '• *Insulina Regular IV:* Bólus de 0,1 U/kg seguido de infusão contínua em bomba de *0,1 U/kg/hora*.',
          '• Meta glicêmica: queda de 50 a 70 mg/dL por hora.',
          '• Quando a glicemia atingir 200 a 250 mg/dL: iniciar *Soro Glicosado 5%* associado para evitar hipoglicemia mantendo a bomba de insulina até fechamento completo do Anion Gap (HCO3 >= 18 e pH > 7,30).'
        ].join('\n');
      }
    },

    CRISE_ASMATICA_GRAVE: {
      titulo: 'CRISE ASMÁTICA GRAVE E ESTADO DE MAL ASMÁTICO (GINA / SBPT)',
      palavrasChave: ['asma grave', 'broncoespasmo', 'crise asmatica', 'sibilancia intensa', 'falta de ar asma'],
      gerarConduta: function (dados) {
        return [
          '🫁 *CONDUTA NA CRISE ASMÁTICA AGUDA GRAVE (GINA / SBPT)*',
          '',
          '1. *OXIGENOTERAPIA:*',
          '• Titular oxigênio para manter SatO2 entre 93% e 95% (evitar hiperóxia com retenção de CO2).',
          '',
          '2. *BRONCODILATAÇÃO SEQUENCIAL (1ª HORA):*',
          '• *Salbutamol Spray:* 4 a 8 jatos com espaçador a cada 20 minutos durante a 1ª hora (ou nebulização com 10 a 20 gotas = 2,5 a 5 mg);',
          '• *Brometo de Ipratrópio:* 4 a 8 jatos com espaçador (ou 20 a 40 gotas = 0,25 a 0,5 mg em nebulização) associado ao Salbutamol a cada 20 minutos na 1ª hora.',
          '',
          '3. *CORTICOTERAPIA SISTÊMICA PRECOCE:*',
          '• Prednisona 40 a 60 mg VO em dose única inicial; OU',
          '• Hidrocortisona 200 mg IV ou Metilprednisolona 60 a 125 mg IV se paciente impossibilitado de ingerir via oral.',
          '',
          '4. *RESGATE EM CRISE REFRATÁRIA:*',
          '• *Sulfato de Magnésio 50%:* 2 g (4 mL de MgSO4 50% diluídos em 100 mL de SF 0,9%) administrados em infusão intravenosa lenta em 20 minutos.',
          '• Sinais de fadiga respiratória (silêncio auscultatório, torpor, bradicardia): preparar para Sequência Rápida de Intubação com tubo de diâmetro amplo.'
        ].join('\n');
      }
    },

    PRE_ECLAMPSIA_ECLAMPSIA: {
      titulo: 'PRÉ-ECLÂMPSIA GRAVE E ECLÂMPSIA (FEBRASGO / ACOG / MS)',
      palavrasChave: ['pre eclampsia', 'eclampcia', 'zuspan', 'sulfato de magnesio', 'gestante pressao alta'],
      gerarConduta: function (dados) {
        return [
          '🤰 *CONDUTA EM PRÉ-ECLÂMPSIA GRAVE E ECLÂMPSIA (FEBRASGO / MS)*',
          '',
          '1. *NEUROPROTEÇÃO / PREVENÇÃO DE CONVULSÕES (SULFATO DE MAGNÉSIO):*',
          '• *Esquema Zuspan (Padrão Intravenoso):*',
          '  - Dose de Ataque: *4 g IV lento em 20 minutos* (8 mL de MgSO4 50% + 92 mL de SF 0,9% ou SG 5%).',
          '  - Dose de Manutenção: *1 g/hora IV em bomba de infusão contínua* (10 mL de MgSO4 50% em 490 mL de SF 0,9% a 100 mL/h).',
          '• *Monitorização Rigorosa da Intoxicação:*',
          '  - Reflexo patelar (deve estar presente);',
          '  - Frequência respiratória (deve ser >= 12 a 16 rpm);',
          '  - Diurese horária (deve ser >= 25 mL/hora).',
          '• ⛔ *ANTÍDOTO EM SOBREDOSE/TOXICIDADE:* Gluconato de Cálcio 10% 1 ampola (10 mL = 1 g) IV lento em 3 a 5 minutos.',
          '',
          '2. *CONTROLE DA CRISE HIPERTENSIVA (PAS >= 160 ou PAD >= 110 mmHg):*',
          '• *Hidralazina:* 5 mg IV lento. Se PA persistir grave após 20 minutos, repetir 5 a 10 mg IV (dose máxima 20 mg); OU',
          '• *Nifedipino cápsula/comprimido:* 10 a 20 mg VO (engolir com água; NUNCA usar via sublingual).',
          '• ⛔ *CONTRAINDICAÇÕES FORMAIS NA GESTAÇÃO:* Nitroprussiato de Sódio (salvo risco iminente de morte materna), IECAs e BRAs (toxicidade fetal grave).'
        ].join('\n');
      }
    },

    DIP_ATO: {
      titulo: 'DOENÇA INFLAMATÓRIA PÉLVICA E ABSCESSO TUBO-OVARIANO (PCDT/MS / CDC)',
      palavrasChave: ['dip', 'doenca inflamatoria pelvica', 'abscesso tubo ovariano', 'monif', 'hager'],
      gerarConduta: function (dados) {
        return [
          '🌸 *CONDUTA EM DOENÇA INFLAMATÓRIA PÉLVICA (DIP / PCDT MS)*',
          '',
          '1. *CRITÉRIOS DIAGNÓSTICOS DE HAGER:*',
          '• 3 Critérios Maiores: Dor no hipogástrio + Dor à palpação anexial + Dor à mobilização do colo uterino.',
          '• Associados a pelo menos 1 Critério Menor: Febre >= 38,3°C, leucocitose, VHS/PCR elevado, corrimento purulento cervical.',
          '',
          '2. *ESTADIAMENTO DE MONIF E LOCAL DE TRATAMENTO:*',
          '• *Monif I (Ambulatorial):* Salpingite aguda sem peritonite.',
          '  - *Ceftriaxona 500 mg IM dose única* (ajustar para 1 g se peso >= 150 kg) +',
          '  - *Doxiciclina 100 mg VO 12/12h por 14 dias* +',
          '  - *Metronidazol 500 mg VO 12/12h por 14 dias*.',
          '  - Reavaliação obrigatória em 72 horas!',
          '• *Monif II a IV (Internação Hospitalar Mandatória):*',
          '  - Monif II: Salpingite com peritonite pélvica.',
          '  - Monif III: Abscesso tubo-ovariano íntegro.',
          '  - Monif IV: Abscesso roto com peritonite difusa (emergência cirúrgica).',
          '  - Esquema Hospitalar: *Ceftriaxona 1 g IV 12/12h* + *Metronidazol 500 mg IV 8/8h* + *Doxiciclina 100 mg VO 12/12h* (ou Clindamicina 900 mg IV 8/8h + Gentamicina 5 mg/kg/dia IV ajustada pelo ClCr).',
          '',
          '3. *MANEJO DO DIU E PARCEIROS:*',
          '• DIU: NÃO remover de imediato; remover apenas sob antibioticoterapia prévia em caso de falha clínica após 48-72h ou abscesso.',
          '• Parceiros sexuais dos últimos 60 dias: convocação, abstinência e tratamento empírico obrigatório para gonococo e clamídia.'
        ].join('\n');
      }
    }
  };

  /**
   * Identifica o protocolo clínico determinístico mais aderente ao caso fornecido.
   */
  function identificarProtocoloClinico(texto) {
    if (!texto) return null;
    var t = String(texto).toLowerCase();

    // Verificações específicas com alta acurácia
    if (t.indexOf('gestant') !== -1 && (t.indexOf('pcr') !== -1 || t.indexOf('parada') !== -1 || t.indexOf('dule') !== -1)) {
      return PROTOCOLOS_OFFLINE.PCR_GESTANTE;
    }
    if (t.indexOf('pcr') !== -1 || t.indexOf('parada cardiorrespirat') !== -1 || (t.indexOf('fv') !== -1 && t.indexOf('choque') !== -1) || t.indexOf('assistolia') !== -1) {
      return PROTOCOLOS_OFFLINE.PCR_ADULTO;
    }
    if (t.indexOf('anafilax') !== -1 || t.indexOf('anafilat') !== -1 || (t.indexOf('urticaria') !== -1 && t.indexOf('edema de glote') !== -1)) {
      return PROTOCOLOS_OFFLINE.CHOQUE_ANAFILATICO;
    }
    if (t.indexOf('pre eclamps') !== -1 || t.indexOf('pré-eclâmps') !== -1 || t.indexOf('eclamps') !== -1 || t.indexOf('zuspan') !== -1) {
      return PROTOCOLOS_OFFLINE.PRE_ECLAMPSIA_ECLAMPSIA;
    }
    if (t.indexOf('cetoacidose') !== -1 || t.indexOf(' cad ') !== -1 || (t.indexOf('glicemia') !== -1 && t.indexOf('anion gap') !== -1 && t.indexOf('insulina') !== -1)) {
      return PROTOCOLOS_OFFLINE.CETOACIDOSE_DIABETICA;
    }
    if (t.indexOf('avc') !== -1 || t.indexOf('isquemic') !== -1 || t.indexOf('alteplase') !== -1 || t.indexOf('deficit motor') !== -1) {
      return PROTOCOLOS_OFFLINE.AVC_ISQUEMICO;
    }
    if (t.indexOf('infarto') !== -1 || t.indexOf('iam') !== -1 || t.indexOf('supra') !== -1 || t.indexOf('coronari') !== -1 || (t.indexOf('dor toracica') !== -1 && t.indexOf('troponina') !== -1)) {
      return PROTOCOLOS_OFFLINE.SCA_IAM;
    }
    if (t.indexOf('choque septico') !== -1 || (t.indexOf('sepse') !== -1 && t.indexOf('lactato') !== -1) || (t.indexOf('noradrenalina') !== -1 && t.indexOf('pam') !== -1)) {
      return PROTOCOLOS_OFFLINE.CHOQUE_SEPTICO;
    }
    if (t.indexOf('asma') !== -1 || t.indexOf('broncoespasmo') !== -1 || (t.indexOf('sibil') !== -1 && t.indexOf('falta de ar') !== -1)) {
      return PROTOCOLOS_OFFLINE.CRISE_ASMATICA_GRAVE;
    }
    if (t.indexOf('dip') !== -1 || t.indexOf('doenca inflamatoria pelvica') !== -1 || t.indexOf('tubo-ovariano') !== -1 || t.indexOf('monif') !== -1) {
      return PROTOCOLOS_OFFLINE.DIP_ATO;
    }

    // Busca por contagem ponderada de palavras-chave
    var melhorMatch = null;
    var maxHits = 0;

    for (var chave in PROTOCOLOS_OFFLINE) {
      var proto = PROTOCOLOS_OFFLINE[chave];
      var hits = 0;
      for (var k = 0; k < proto.palavrasChave.length; k++) {
        if (t.indexOf(proto.palavrasChave[k]) !== -1) {
          hits++;
        }
      }
      if (hits > maxHits) {
        maxHits = hits;
        melhorMatch = proto;
      }
    }

    return maxHits >= 2 ? melhorMatch : null;
  }

  /**
   * Gera conduta médica de urgência geral pelo mnemônico sistemático ABCDE / MOV
   * para pacientes com intercorrências que não se encaixam estritamente nos protocolos isolados.
   */
  function gerarCondutaGeralEmergencia(dados) {
    return [
      '🚨 *SISTEMATIZAÇÃO DETERMINÍSTICA DE EMERGÊNCIA (MÉTODO ABCDE / MOV)*',
      '',
      '1. *ABORDAGEM PRIMÁRIA DIRIGIDA:*',
      '• *A (Vias Aéreas e Coluna Cervical):* Avaliar perviedade, presença de secreções ou estridor; proteger via aérea se rebaixamento (ECG <= 8).',
      '• *B (Respiração e Oxigenação):* Ausculta bilateral, oximetria contínua; ofertar oxigênio suplementar apenas se SatO2 < 90 a 92%.',
      '• *C (Circulação e Perfusão):* Avaliar tempo de enchimento capilar (< 2s), pulsos, frequência cardíaca e PA; obter dois acessos calibrosos (jelco 16 ou 18); colher exames imediatos.',
      '• *D (Neurológico):* Avaliar Escala de Coma de Glasgow, pupilas (simetria e fotorreatividade) e glicemia capilar imediata.',
      '• *E (Exposição e Temperatura):* Exposição completa do paciente com controle térmico ativo prevenindo hipotermia.',
      '',
      '2. *MONITORIZAÇÃO MULTIPARAMÉTRICA (MOV):*',
      '• Monitor cardíaco com ECG contínuo, Oximetria de pulso e Pressão arterial não invasiva seriada a cada 5 a 15 minutos.',
      '',
      '3. *ORIENTAÇÃO DE SEGURANÇA E CONDUTA:*',
      '• Manter paciente em leito de monitorização / sala vermelha até estabilização.',
      '• Reavaliação clínica a cada intervenção terapêutica antes da liberação para enfermaria ou transferência.'
    ].join('\n');
  }

  /**
   * Motor Principal de Fallback Offline:
   * Gera a resposta clínica estruturada com garantia de alta fidelidade e advertências explícitas.
   */
  function gerarRespostaOfflineClinica(sistema, promptUsuario, opcoes) {
    opcoes = opcoes || {};
    var textoCompleto = (sistema || '') + '\n' + (promptUsuario || '');
    var proto = identificarProtocoloClinico(textoCompleto);

    var corpoResposta = '';
    if (proto) {
      corpoResposta = proto.gerarConduta(promptUsuario);
    } else {
      corpoResposta = gerarCondutaGeralEmergencia(promptUsuario);
    }

    var cabecalhoContingencia = [
      '⚡ *MODO OFFLINE DE CONTINGÊNCIA (ALTA DISPONIBILIDADE CLÍNICA)*',
      '⚠️ *Aviso do Sistema:* Redes em nuvem e daemon de IA indisponíveis no momento. O atendimento prossegue com o protocolo determinístico oficial de segurança do Ultra Rotina:',
      ''
    ].join('\n');

    var rodapeSeguranca = [
      '',
      '---',
      '📌 *Conduta baseada em diretrizes clínicas oficiais (SBC, AMIB, FEBRASGO, PCDT/MS). Reavalie os parâmetros do paciente continuamente.*'
    ].join('\n');

    return cabecalhoContingencia + corpoResposta + rodapeSeguranca;
  }

  /**
   * Heurística determinística de extração JSON para requisições de classificação de intenção
   * quando nenhum provedor de IA estiver disponível na nuvem ou localmente.
   */
  function estruturarJsonOffline(sistema, promptUsuario) {
    var t = String(promptUsuario || '').toLowerCase();
    var intencao = 'CONVERSA';
    var confianca = 0.85;

    if (t.indexOf('pcr') !== -1 || t.indexOf('parada') !== -1 || t.indexOf('choque') !== -1 || t.indexOf('infarto') !== -1 || t.indexOf('dor no peito') !== -1 || t.indexOf('emergencia') !== -1 || t.indexOf('urgente') !== -1) {
      intencao = 'CLINICO_EMERGENCIA';
    } else if (t.indexOf('gasometria') !== -1 || t.indexOf('ph ') !== -1 || t.indexOf('pco2') !== -1 || t.indexOf('bicarbonato') !== -1) {
      intencao = 'CLINICO_GASO';
    } else if (t.indexOf('receita') !== -1 || t.indexOf('prescrever') !== -1 || t.indexOf('posologia') !== -1 || t.indexOf('remedio') !== -1 || t.indexOf('dose') !== -1) {
      intencao = 'CLINICO_RX';
    } else if (t.indexOf('soap') !== -1 || t.indexOf('anamnese') !== -1 || t.indexOf('evolucao') !== -1 || t.indexOf('historia clinica') !== -1) {
      intencao = 'CLINICO_SOAP';
    } else if (t.indexOf('enfermaria') !== -1 || t.indexOf('passagem de plantao') !== -1 || t.indexOf('leito') !== -1) {
      intencao = 'ENFERMARIA';
    } else if (t.indexOf('plantao') !== -1 || t.indexOf('agenda') !== -1 || t.indexOf('consulta') !== -1 || t.indexOf('marcar') !== -1) {
      intencao = 'CALENDAR_CRIAR';
    } else if (t.indexOf('tarefa') !== -1 || t.indexOf('notion') !== -1 || t.indexOf('lembrete') !== -1) {
      intencao = 'NOTION_TASK';
    } else if (t.indexOf('duvida') !== -1 || t.indexOf('estudo') !== -1 || t.indexOf('medquest') !== -1) {
      intencao = 'NOTION_DUVIDA';
    }

    return JSON.stringify({
      intencao: intencao,
      confianca: confianca,
      modoOffline: true,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Verifica o status de saúde e disponibilidade do nó local de IA (ex: Ollama, LocalAI, vLLM).
   */
  function verificarStatus(opcoes) {
    opcoes = opcoes || {};
    var endpoint = opcoes.endpoint || (typeof ConfigService !== 'undefined' ? ConfigService.get('IA_LOCAL_ENDPOINT') : 'http://127.0.0.1:11434/v1/chat/completions');
    var timeoutMs = Number(opcoes.timeoutMs || (typeof ConfigService !== 'undefined' ? ConfigService.get('IA_LOCAL_TIMEOUT_MS') : 3000));
    var modelosPadrao = typeof ConfigService !== 'undefined' ? ConfigService.getArray('IA_MODELOS_LOCAL') : MODELOS_HOMOLOGADOS_LOCAL;

    var inicio = Date.now();
    var online = false;
    var erroMsg = null;
    var modelosDetectados = [];
    var latenciaMs = 0;

    // Normaliza URL para consulta de tags/modelos
    var urlBase = endpoint.replace(/\/chat\/completions\/?$/, '').replace(/\/v1\/?$/, '');
    var urlTags = urlBase + '/api/tags';
    var urlV1Models = urlBase + '/v1/models';

    if (typeof UrlFetchApp !== 'undefined') {
      try {
        var res = UrlFetchApp.fetch(urlV1Models, {
          method: 'GET',
          timeoutMs: timeoutMs,
          muteHttpExceptions: true
        });
        latenciaMs = Date.now() - inicio;
        if (res.getResponseCode() === 200) {
          online = true;
          try {
            var dados = JSON.parse(res.getContentText());
            if (dados && Array.isArray(dados.data)) {
              modelosDetectados = dados.data.map(function (m) { return m.id || m.name; });
            }
          } catch (eJson) {}
        }
      } catch (err1) {
        // Tenta endpoint nativo do Ollama se o /v1/models falhou
        try {
          var res2 = UrlFetchApp.fetch(urlTags, {
            method: 'GET',
            timeoutMs: timeoutMs,
            muteHttpExceptions: true
          });
          latenciaMs = Date.now() - inicio;
          if (res2.getResponseCode() === 200) {
            online = true;
            try {
              var dados2 = JSON.parse(res2.getContentText());
              if (dados2 && Array.isArray(dados2.models)) {
                modelosDetectados = dados2.models.map(function (m) { return m.name || m.model; });
              }
            } catch (eJson2) {}
          }
        } catch (err2) {
          online = false;
          erroMsg = err2.message;
          latenciaMs = Date.now() - inicio;
        }
      }
    }

    return {
      online: online,
      endpoint: endpoint,
      modelosDisponiveis: modelosDetectados.length ? modelosDetectados : modelosPadrao,
      modeloAtivo: (modelosDetectados.length ? modelosDetectados[0] : modelosPadrao[0]) || 'llama3.1:latest',
      latenciaMs: latenciaMs,
      fallbackOfflinePronto: true,
      erro: erroMsg,
      timestamp: new Date().toISOString()
    };
  }

  return {
    MODELOS_HOMOLOGADOS_LOCAL: MODELOS_HOMOLOGADOS_LOCAL,
    PROTOCOLOS_OFFLINE: PROTOCOLOS_OFFLINE,
    identificarProtocoloClinico: identificarProtocoloClinico,
    gerarRespostaOfflineClinica: gerarRespostaOfflineClinica,
    gerarCondutaGeralEmergencia: gerarCondutaGeralEmergencia,
    estruturarJsonOffline: estruturarJsonOffline,
    verificarStatus: verificarStatus
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { IaLocalFallbackService: IaLocalFallbackService };
}
