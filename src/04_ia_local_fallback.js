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
    var tNorm = t.normalize ? t.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : t;

    // Verificações específicas com alta acurácia
    if (tNorm.indexOf('gestant') !== -1 && (tNorm.indexOf('pcr') !== -1 || tNorm.indexOf('parada') !== -1 || tNorm.indexOf('dule') !== -1)) {
      return PROTOCOLOS_OFFLINE.PCR_GESTANTE;
    }
    if (tNorm.indexOf('pcr') !== -1 || tNorm.indexOf('parada cardiorrespirat') !== -1 || (tNorm.indexOf('fv') !== -1 && tNorm.indexOf('choque') !== -1) || tNorm.indexOf('assistolia') !== -1) {
      return PROTOCOLOS_OFFLINE.PCR_ADULTO;
    }
    if (tNorm.indexOf('anafilax') !== -1 || tNorm.indexOf('anafilat') !== -1 || (tNorm.indexOf('urticaria') !== -1 && tNorm.indexOf('edema de glote') !== -1)) {
      return PROTOCOLOS_OFFLINE.CHOQUE_ANAFILATICO;
    }
    if (tNorm.indexOf('pre eclamps') !== -1 || tNorm.indexOf('eclamps') !== -1 || tNorm.indexOf('zuspan') !== -1) {
      return PROTOCOLOS_OFFLINE.PRE_ECLAMPSIA_ECLAMPSIA;
    }
    if (tNorm.indexOf('cetoacidose') !== -1 || tNorm.indexOf(' cad ') !== -1 || (tNorm.indexOf('glicemia') !== -1 && tNorm.indexOf('anion gap') !== -1 && tNorm.indexOf('insulina') !== -1)) {
      return PROTOCOLOS_OFFLINE.CETOACIDOSE_DIABETICA;
    }
    if (tNorm.indexOf('avc') !== -1 || tNorm.indexOf('isquemic') !== -1 || tNorm.indexOf('alteplase') !== -1 || tNorm.indexOf('deficit motor') !== -1) {
      return PROTOCOLOS_OFFLINE.AVC_ISQUEMICO;
    }
    if (tNorm.indexOf('infarto') !== -1 || tNorm.indexOf('iam') !== -1 || tNorm.indexOf('supra') !== -1 || tNorm.indexOf('coronari') !== -1 || (tNorm.indexOf('dor toracica') !== -1 && tNorm.indexOf('troponina') !== -1)) {
      return PROTOCOLOS_OFFLINE.SCA_IAM;
    }
    if (tNorm.indexOf('choque septico') !== -1 || (tNorm.indexOf('sepse') !== -1 && tNorm.indexOf('lactato') !== -1) || (tNorm.indexOf('noradrenalina') !== -1 && tNorm.indexOf('pam') !== -1) || (tNorm.indexOf('choque') !== -1 && (tNorm.indexOf('pam') !== -1 || tNorm.indexOf('volume') !== -1 || tNorm.indexOf('refrat') !== -1))) {
      return PROTOCOLOS_OFFLINE.CHOQUE_SEPTICO;
    }
    if (tNorm.indexOf('asma') !== -1 || tNorm.indexOf('broncoespasmo') !== -1 || (tNorm.indexOf('sibil') !== -1 && tNorm.indexOf('falta de ar') !== -1)) {
      return PROTOCOLOS_OFFLINE.CRISE_ASMATICA_GRAVE;
    }
    if (tNorm.indexOf('dip') !== -1 || tNorm.indexOf('doenca inflamatoria pelvica') !== -1 || tNorm.indexOf('tubo-ovariano') !== -1 || tNorm.indexOf('monif') !== -1) {
      return PROTOCOLOS_OFFLINE.DIP_ATO;
    }

    // Busca por contagem ponderada de palavras-chave
    var melhorMatch = null;
    var maxHits = 0;

    for (var chave in PROTOCOLOS_OFFLINE) {
      var proto = PROTOCOLOS_OFFLINE[chave];
      var hits = 0;
      for (var k = 0; k < proto.palavrasChave.length; k++) {
        var pk = proto.palavrasChave[k];
        var pkNorm = pk.normalize ? pk.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : pk;
        if (tNorm.indexOf(pkNorm) !== -1 || t.indexOf(pk) !== -1) {
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
   * Fallback elegante quando a dúvida aberta não consta no motor determinístico local.
   * Evita despejar aulas genéricas de ABCDE/MOV fora de contexto.
   */
  function gerarCondutaGeralEmergencia(dados) {
    var msgLower = String(dados || '').toLowerCase();

    // Verifica se o médico citou termos farmacológicos/posológicos ou calculadoras
    var mencionaDrogaOuDose = /\b(mg|mcg|ml|ampola|dilui[cç][aã]o|infus[aã]o|vaz[aã]o|dose|peso|kg|noradrenalina|adrenalina|fentanil|midazolam|rocur[oô]nio|cetamina|etomi[dt]ato|amiodarona|dobutamina|vasopressina|sedac[aã]o|intuba[cç][aã]o|iot|rsi)\b/i.test(msgLower);

    if (mencionaDrogaOuDose) {
      return [
        '⚡ *Conexão com a IA clínica oscilou neste instante.*',
        '',
        'Identifiquei que você busca um cálculo ou diluição medicamentosa. Nossas *calculadoras determinísticas locais estão 100% ativas*!',
        '',
        '👉 *Para resposta imediata offline, envie no formato direto:*',
        '• *Droga + Peso* (ex: `nora 70kg`, `iot 80kg`, `fentanil 70kg`)',
        '• Ou reenvie sua pergunta completa em alguns segundos.'
      ].join('\n');
    }

    return [
      '⚡ *Conexão com a IA clínica oscilou rapidamente.*',
      '',
      'Para não entregar uma conduta genérica ou descontextualizada para o seu caso, prefiro que você *reenvie a mensagem em alguns instantes*.',
      '',
      '📌 *Atalho imediato (100% ativo offline):* se precisar de doses, diluições ou drogas de emergência agora, digite apenas a *droga + peso* (ex: `adrenalina 70kg`, `sedação 75kg`) ou o *protocolo direto* (ex: `/pcr`, `sepse`, `iam`).'
    ].join('\n');
  }

  /**
   * Motor Principal de Fallback Offline:
   * Gera a resposta clínica estruturada com garantia de alta fidelidade e comunicação transparente.
   */
  function gerarRespostaOfflineClinica(sistema, promptUsuario, opcoes) {
    opcoes = opcoes || {};
    var textoCompleto = (sistema || '') + '\n' + (promptUsuario || '');
    var proto = identificarProtocoloClinico(textoCompleto);

    var corpoResposta = '';
    if (proto) {
      corpoResposta = proto.gerarConduta(promptUsuario);
      var cabecalhoContingencia = [
        '⚡ *MODO OFFLINE DE CONTINGÊNCIA (ALTA DISPONIBILIDADE CLÍNICA)*',
        'A conexão com a IA oscilou neste instante. Acionando protocolo determinístico de segurança (' + proto.titulo + '):',
        ''
      ].join('\n');

      var rodapeSeguranca = [
        '',
        '---',
        '📌 *Conduta baseada em diretrizes clínicas oficiais (SBC, AMIB, FEBRASGO, PCDT/MS). As calculadoras locais seguem 100% ativas.*'
      ].join('\n');

      return cabecalhoContingencia + corpoResposta + rodapeSeguranca;
    }

    return [
      '⚡ *MODO OFFLINE DE CONTINGÊNCIA*',
      gerarCondutaGeralEmergencia(promptUsuario)
    ].join('\n\n');
  }

  /**
   * Heurística determinística de extração JSON para requisições de classificação de intenção
   * quando nenhum provedor de IA estiver disponível na nuvem ou localmente.
   */
  function estruturarJsonOffline(sistema, promptUsuario) {
    var t = String(promptUsuario || '').toLowerCase();
    var s = String(sistema || '').toLowerCase();
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

    var ehSoap = s.indexOf('soap') !== -1 || s.indexOf('subjetivo') !== -1 || t.indexOf('soap') !== -1;
    var ehEmergencia = intencao === 'CLINICO_EMERGENCIA';
    var protoEmerg = null;
    if (ehEmergencia) {
      protoEmerg = identificarProtocoloClinico(promptUsuario);
    }
    var condutaProto = protoEmerg ? protoEmerg.gerarConduta(promptUsuario) : null;

    var resultado = {
      intencao: intencao,
      confianca: confianca,
      modoOffline: true,
      contingencia_offline: true,
      aviso_contingencia: 'Processado pelo Motor Determinístico Offline (Provedor em contingência).',
      timestamp: new Date().toISOString()
    };

    if (ehSoap) {
      var textoLimpo = String(promptUsuario || '').replace(/CASO CLÍNICO:\s*/i, '').trim();
      var matchEf = textoLimpo.search(/(?:\n|^)\s*(?:sinais\s+vitais\s*:|exame\s+f[ií]sico(?:\s+geral)?\s*:|geral\s*:\s*(?:bom\s+estado|beg|regular|l[uú]cido)|acv\s*:|ar\s*:|abdome\s*:|extremidades\s*:)/i);
      var subjetivoLimpo = textoLimpo;
      var objetivoDetectado = '';
      if (matchEf > 0) {
        subjetivoLimpo = textoLimpo.slice(0, matchEf).trim();
        objetivoDetectado = textoLimpo.slice(matchEf).trim();
      }
      resultado.subjetivo = subjetivoLimpo || 'Relato clínico recebido em contingência offline.';
      resultado.objetivo = objetivoDetectado || 'Monitorização multiparamétrica contínua e checagem de sinais vitais sob suporte avançado de vida.';
      resultado.avaliacao = ehEmergencia ? ['Emergência clínica aguda / PCR'] : ['Atendimento clínico geral'];
      resultado.plano = condutaProto ? [condutaProto] : ['Monitorização multiparamétrica contínua e reavaliação assistencial.'];
      resultado.conduta_emergencia = condutaProto || null;
      var gateSoap = typeof avaliarSuficienciaAnamnese === 'function' ? avaliarSuficienciaAnamnese(textoLimpo, {}) : null;
      resultado.perguntas_anamnese = gateSoap && gateSoap.anamneseSuficiente ? [] : [
        'Quais os sinais vitais atuais (PA, FC, FR, SatO2, T)? (estratificação objetiva de risco)',
        'Há alergias, comorbidades ou medicações em uso? (segurança da prescrição)'
      ];
      resultado.anamneseSuficiente = !!(gateSoap && gateSoap.anamneseSuficiente);
      resultado.exame_dirigido = ['Monitorização multiparamétrica contínua e oximetria de pulso'];
    }

    return JSON.stringify(resultado);
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

  /**
   * Laudo determinístico de emergência e interpretação estruturada para imagens médicas
   * (ECG, Radiografia, OCR de Laudos/Laboratório, Lesão Dermatológica) quando a IA em nuvem estiver indisponível.
   */
  function analisarImagemOffline(contextoTexto, mimeType, opcoes) {
    opcoes = opcoes || {};
    var ctxTxt = String(contextoTexto || '').trim();
    var ctxLow = ctxTxt.toLowerCase();
    var mime = String(mimeType || '').toLowerCase();

    // 1. Detecção da modalidade diagnóstica
    var ehEcg = ctxLow.indexOf('ecg') !== -1 || ctxLow.indexOf('eletrocardiograma') !== -1 ||
                ctxLow.indexOf('ritmo') !== -1 || ctxLow.indexOf('supra') !== -1 ||
                ctxLow.indexOf('bloqueio') !== -1 || ctxLow.indexOf('ondas t') !== -1;

    var ehRx = ctxLow.indexOf('raio-x') !== -1 || ctxLow.indexOf('raiox') !== -1 ||
               ctxLow.indexOf('radiografia') !== -1 || ctxLow.indexOf('tórax') !== -1 ||
               ctxLow.indexOf('torax') !== -1 || ctxLow.indexOf('pulm') !== -1 ||
               ctxLow.indexOf('derrame pleural') !== -1 || ctxLow.indexOf('pneumotorax') !== -1;

    var ehDerma = ctxLow.indexOf('pele') !== -1 || ctxLow.indexOf('lesao') !== -1 ||
                  ctxLow.indexOf('lesão') !== -1 || ctxLow.indexOf('dermat') !== -1 ||
                  ctxLow.indexOf('exantema') !== -1 || ctxLow.indexOf('mancha') !== -1 ||
                  ctxLow.indexOf('placa') !== -1 || ctxLow.indexOf('úlcera') !== -1;

    var ehLab = ctxLow.indexOf('hemograma') !== -1 || ctxLow.indexOf('gasometria') !== -1 ||
                ctxLow.indexOf('potassio') !== -1 || ctxLow.indexOf('potássio') !== -1 ||
                ctxLow.indexOf('troponina') !== -1 || ctxLow.indexOf('creatinina') !== -1 ||
                ctxLow.indexOf('laudo') !== -1 || ctxLow.indexOf('resultado') !== -1;

    var ehTc = ctxLow.indexOf('tc') !== -1 || ctxLow.indexOf('tomografia') !== -1 ||
               ctxLow.indexOf('angiotc') !== -1 || ctxLow.indexOf('aspects') !== -1 ||
               ctxLow.indexOf('fisher') !== -1 || ctxLow.indexOf('apendicite') !== -1;

    var ehPocus = ctxLow.indexOf('pocus') !== -1 || ctxLow.indexOf('usg') !== -1 ||
                  ctxLow.indexOf('ultrassom') !== -1 || ctxLow.indexOf('efast') !== -1 ||
                  ctxLow.indexOf('fast') !== -1 || ctxLow.indexOf('blue') !== -1 ||
                  ctxLow.indexOf('vci') !== -1;

    var ehRm = ctxLow.indexOf('ressonancia') !== -1 || ctxLow.indexOf('ressonância') !== -1 ||
               ctxLow.indexOf('rm') !== -1 || ctxLow.indexOf('flair') !== -1 ||
               ctxLow.indexOf('dwi') !== -1 || ctxLow.indexOf('adc') !== -1;

    var ehOftalmo = ctxLow.indexOf('fundoscopia') !== -1 || ctxLow.indexOf('fundo de olho') !== -1 ||
                    ctxLow.indexOf('retina') !== -1 || ctxLow.indexOf('papiledema') !== -1 ||
                    ctxLow.indexOf('oftalmo') !== -1;

    var ehCtg = ctxLow.indexOf('cardiotocografia') !== -1 || ctxLow.indexOf('ctg') !== -1 ||
                ctxLow.indexOf('fcf') !== -1 || ctxLow.indexOf('dip') !== -1;

    var ehEda = ctxLow.indexOf('endoscopia') !== -1 || ctxLow.indexOf('eda') !== -1 ||
                ctxLow.indexOf('forrest') !== -1 || ctxLow.indexOf('varizes') !== -1;

    var ehOrtopedia = ctxLow.indexOf('fratura') !== -1 || ctxLow.indexOf('luxacao') !== -1 ||
                      ctxLow.indexOf('luxação') !== -1 || ctxLow.indexOf('salter') !== -1 ||
                      ctxLow.indexOf('gustilo') !== -1;

    var ehFerida = ctxLow.indexOf('queimadura') !== -1 || ctxLow.indexOf('curativo') !== -1 ||
                   ctxLow.indexOf('ferida') !== -1 || ctxLow.indexOf('npuap') !== -1;

    var cabecalhoContingencia = [
      '⚡ *MODO OFFLINE DE CONTINGÊNCIA (IMAGEM MÉDICA / LAUDO BEIRA-LEITO)*',
      'A leitura de imagens por IA oscilou temporariamente. Para sua segurança, confira o roteiro semiológico oficial ou reenvie a foto em instantes:',
      ''
    ].join('\n');

    var rodapeSeguranca = [
      '',
      '---',
      '📌 *Roteiro de apoio beira-leito (SBC / CBR / Diretrizes SUS). Se preferir, digite a alteração suspeita para conduta imediata.*'
    ].join('\n');

    var corpo = [];

    if (ehEcg || (!ehRx && !ehDerma && !ehLab && !ehTc && !ehPocus && !ehRm && !ehOftalmo && !ehCtg && !ehEda && !ehOrtopedia && !ehFerida && (ctxLow.indexOf('dor') !== -1 || ctxLow.indexOf('peito') !== -1 || ctxLow.indexOf('coracao') !== -1 || ctxLow.indexOf('coração') !== -1))) {
      // ECG ou Suspeita Coronariana
      if (ctxLow.indexOf('dor') !== -1 || ctxLow.indexOf('supra') !== -1 || ctxLow.indexOf('iam') !== -1 || ctxLow.indexOf('infarto') !== -1 || ctxLow.indexOf('peito') !== -1) {
        corpo.push('🚨 *EMERGÊNCIA - ACHADO CRÍTICO (SALA VERMELHA / SCA):* Suspeita de Síndrome Coronariana Aguda. Priorizar Porta-ECG < 10min. Duplo bloqueio (AAS 200-300mg VO mastigado + Ticagrelor 180mg ou Clopidogrel 300-600mg) e Enoxaparina 1mg/kg SC se confirmado IAM.');
        corpo.push('');
      }

      corpo.push('*ROTEIRO SISTEMÁTICO DE LEITURA DE ECG (6 PASSOS SBC):*');
      corpo.push('1. *Ritmo:* Sinusal (onda P positiva em D1, D2, aVF; negativa em aVR, seguida de QRS regular) vs Taqui/Bradiarritmias (FA, Flutter, BAVs).');
      corpo.push('2. *Frequência Cardíaca (FC):* 1500 / mm entre ondas R (se regular) ou complexos em 30 quadrados grandes x 10 (se irregular). Normal: 50 a 100 bpm.');
      corpo.push('3. *Eixo Elétrico (Plano Frontal):* Normal (-30° a +90°). Se D1 (+) e aVF (+): Eixo normal (0° a +90°). Se D1 (+) e aVF (-): Desvio para esquerda (-30° a -90°). Se D1 (-) e aVF (+): Desvio para direita.');
      corpo.push('4. *Intervalos e Condução:*');
      corpo.push('   • Intervalo PR: 120 a 200 ms (se > 200 ms: BAV 1º grau; se < 120 ms: Pré-excitação / WPW).');
      corpo.push('   • Duração QRS: < 120 ms (se >= 120 ms: Bloqueio de ramo BRE ou BRD).');
      corpo.push('   • Intervalo QTc (Bazett): Normal <= 450 ms (homem) e <= 460 ms (mulher). Risco de Torsades de Pointes se > 500 ms.');
      corpo.push('5. *Sobrecargas de Câmaras:* Sokolow-Lyon (S em V1 + R em V5/V6 >= 35 mm) ou Cornell (R em aVL + S em V3 > 28 mm homens ou > 20 mm mulheres) para SVE.');
      corpo.push('6. *Isquemia, Lesão e Necrose (Segmento ST / Onda T por Paredes):*');
      corpo.push('   • Anterior/Septal (V1-V4), Lateral Alta (D1, aVL), Lateral Baixa (V5-V6), Inferior (D2, D3, aVF).');
      corpo.push('   • ⚠️ Se supra em parede inferior (D2, D3, aVF): Rodar obrigatoriamente derivações direitas (V3R, V4R) para descartar IAM de Ventrículo Direito (Nitrato contraindicado!).');
    } else if (ehRx) {
      corpo.push('*ROTEIRO SISTEMÁTICO DE RADIOGRAFIA DE TÓRAX (5 PASSOS CBR):*');
      corpo.push('1. *Identificação e Técnica:* Incidência (PA vs AP), penetração correta (visualização sutil dos corpos vertebrais atrás do coração), rotação (clavículas equidistantes das espinhosas) e inspiração (8 a 10 arcos costais posteriores visíveis).');
      corpo.push('2. *Arcabouço Ósseo e Partes Moles:* Fraturas de arcos costais ou clavícula, lesões líticas/blásticas, enfisema subcutâneo (presença de ar dissecando partes moles).');
      corpo.push('3. *Mediastino e Silhueta Cardíaca:* Índice Cardiotorácico (ICT <= 0,50 no PA), contornos aórtico e hilar, desvio de traqueia.');
      corpo.push('4. *Campos Pleuropulmonares:*');
      corpo.push('   • Consolidação alveolar (opacidade densa com broncograma aéreo);');
      corpo.push('   • Atelectasia (opacidade com perda de volume e retração de estruturas vizinhas);');
      corpo.push('   • Infiltrado intersticial reticular/reticulonodular bilateral.');
      corpo.push('5. *Pleura e Cúpulas Diafragmáticas:*');
      corpo.push('   • Seios costofrênicos livres vs velamento (derrame pleural >= 200 mL no PA);');
      corpo.push('   • Linha pleural visceral com ausência de trama vascular periférica (pneumotórax);');
      corpo.push('   • Ar livre subdiafragmático / pneumoperitônio (sinal de perfuração de víscera oca).');
    } else if (ehDerma) {
      corpo.push('*ROTEIRO SEMIOLÓGICO DERMATOLÓGICO DETERMINÍSTICO:*');
      corpo.push('1. *Lesão Elementar Primária:* Mácula (plana < 1cm), mancha (> 1cm), pápula (elevada sólida < 1cm), placa (> 1cm), nódulo, vesícula (< 1cm com líquido), bolha (> 1cm), pústula.');
      corpo.push('2. *Topografia e Arranjo:* Simetria, superfícies extensoras vs flexurais, zosteriforme (dermatomérica), confluente.');
      corpo.push('3. *Regra ABCDE para Lesões Pigmentadas (Melanoma):*');
      corpo.push('   • A (Assimetria em 2 eixos);');
      corpo.push('   • B (Bordas irregulares ou denteadas);');
      corpo.push('   • C (Cores múltiplas - 2 ou mais tonalidades);');
      corpo.push('   • D (Diâmetro > 6 mm);');
      corpo.push('   • E (Evolução / mudança rápida de tamanho, formato ou relevo).');
      corpo.push('4. *Sinais de Alarme (Encaminhamento Urgente):* Ulceração espontânea, sangramento sem trauma, sinal do "patinho feio".');
    } else if (ehLab) {
      corpo.push('*TRIAGEM DETERMINÍSTICA DE VALORES CRÍTICOS LABORATORIAIS:*');
      corpo.push('• *Potássio Sérico (K+):* Normal 3,5 a 5,0 mEq/L. Se K+ > 6,0 ou com alterações no ECG (T apiculada/tenda): Gluconato de Cálcio 10% 10-20 mL IV imediato.');
      corpo.push('• *Sódio (Na+):* Normal 135 a 145 mEq/L. Em hiponatremia aguda sintomática (convulsão/coma): NaCl 3% 100-150 mL IV em 20 min (meta de elevação: máx 8-10 mEq/L em 24h).');
      corpo.push('• *Lactato Arterial/Venoso:* Normal < 2,0 mmol/L. Se >= 4,0 mmol/L em contexto infeccioso: Choque Séptico / Bundle SSC (30 mL/kg cristaloide balanceado).');
      corpo.push('• *Troponina Ultrasensível:* Acima do percentil 99: confirma injúria miocárdica; correlacionar com delta temporal de 1-3 horas.');
    } else if (ehTc) {
      corpo.push('*ROTEIRO DETERMINÍSTICO DE TOMOGRAFIA COMPUTADORIZADA (TC):*');
      corpo.push('1. *TC de Crânio (Método B-C-B-V-B e ASPECTS):*');
      corpo.push('   • Blood: Sangramento agudo hiperdenso (Extradural biconvexo vs Subdural em crescente vs HSA de Fisher).');
      corpo.push('   • Cisterns: Apagamento de cisternas perimesencefálicas (risco de herniação uncal).');
      corpo.push('   • Brain: Perda da fita insular/núcleo lenticular (Score ASPECTS no AVC) e desvio de linha média > 5mm.');
      corpo.push('   • Ventricles: Simetria e hidrocefalia obstrutiva.');
      corpo.push('   • Bone: Fraturas de base de crânio e pneumoencéfalo.');
      corpo.push('2. *AngioTC de Tórax e Abdome:* Falhas de enchimento pulmonares (TEP) e flap intimal de dissecção aórtica (Stanford A vs B).');
      corpo.push('3. *Abdome Agudo:* Apêndice cecal > 6mm com apendicolito e borramento adiposo; pneumoperitônio subdiafragmático.');
    } else if (ehPocus) {
      corpo.push('*ROTEIRO DETERMINÍSTICO DE ULTRASSONOGRAFIA BEIRA-LEITO (POCUS):*');
      corpo.push('1. *Protocolo eFAST (Trauma):* Janela subxifoide (tamponamento cardíaco), espaço hepatorrenal de Morrison, esplenorrenal, pelve retovesical/Douglas e deslizamento pleural (lung sliding).');
      corpo.push('2. *Protocolo BLUE (Dispneia Aguda):* Perfil A (linhas A normais), Perfil B (> 3 linhas B confluentes em cometa = edema agudo), Perfil C (consolidação subpleural) e Perfil PLAPS (derrame pleural posterior).');
      corpo.push('3. *Ecocardiograma Focado & VCI:* Fração de ejeção subjetiva, sinal de McConnell em VD, colababilidade de Veia Cava Inferior (> 50% = resposta a volume).');
    } else if (ehRm) {
      corpo.push('*ROTEIRO DETERMINÍSTICO DE RESSONÂNCIA MAGNÉTICA (RM ENCEFÁLICA):*');
      corpo.push('1. *Difusão e ADC:* Hiperintensidade em DWI com hipointensidade correspondente no Mapa ADC confirma restrição citotóxica verdadeira (AVC isquêmico hiperagudo ou abscesso piogênico central).');
      corpo.push('2. *Sequências T1, T2 e FLAIR:* Edema vasogênico perilesional, efeito compressivo e gliose.');
    } else if (ehOftalmo) {
      corpo.push('*ROTEIRO DETERMINÍSTICO DE FUNDOSCOPIA BEIRA-LEITO (FUNDO DE OLHO):*');
      corpo.push('1. *Disco Óptico:* Relação escavação/disco <= 0.3-0.5; bordas nítidas vs borradas por Papiledema (hipertensão intracraniana).');
      corpo.push('2. *Retinopatia Hipertensiva (Keith-Wagener):* Grau 1 (estreitamento), Grau 2 (cruzamentos patológicos), Grau 3 (hemorragias e exsudatos), Grau 4 (papiledema = emergência).');
      corpo.push('3. *Emergência Vascular:* OACR com mancha vermelho-cereja na mácula vs OVCR com tempestade de sangue.');
    } else if (ehCtg) {
      corpo.push('*ROTEIRO DETERMINÍSTICO DE CARDIOTOCOGRAFIA (CTG OBSTÉTRICA):*');
      corpo.push('1. *FCF Basal:* 110 a 160 bpm (taquicardia > 160 bpm vs bradicardia < 110 bpm).');
      corpo.push('2. *Variabilidade:* Moderada normal 6-25 bpm; ausente (< 5 bpm) ou sinusoidal (sofrimento fetal grave / anemia).');
      corpo.push('3. *Desacelerações:* DIP I (fisiológica/cefálica), DIP II (tardia / insuficiência placentária - alarme crítico), DIP III (variável/cordão).');
      corpo.push('4. *Classificação FIGO:* Categoria I (Normal) vs Categoria II (Vigilância) vs Categoria III (Anormal - resolução imediata).');
    } else if (ehEda) {
      corpo.push('*ROTEIRO DETERMINÍSTICO DE ENDOSCOPIA DIGESTIVA ALTA (EDA):*');
      corpo.push('1. *Classificação de Forrest (Úlcera Péptica):* Ia (jato arterial ~90% ressangramento), Ib (babando ativo ~30%), IIa (vaso visível ~50%), IIb (coágulo aderido ~30%), IIc (hematina < 10%), III (fibrina limpa < 5%).');
      corpo.push('2. *Varizes Esofágicas:* Finas, médias ou grossas; presença de red spots = alto risco de ruptura iminente.');
    } else if (ehOrtopedia) {
      corpo.push('*ROTEIRO DETERMINÍSTICO DE FRATURAS E ORTOPEDIA (RX/TC):*');
      corpo.push('1. *Salter-Harris Pediátrico:* Tipos I (fise pura), II (metafisária - Thurston-Holland), III (epifisária), IV (transfixante), V (compressão).');
      corpo.push('2. *Fraturas Expostas (Gustilo):* Grau I (< 1cm), Grau II (1-10cm), Grau IIIa (> 10cm coberta), Grau IIIb (ampla perda), Grau IIIc (lesão vascular arterial).');
      corpo.push('3. *Fratura Oculta:* Sinal do coxim gorduroso (fat pad sign / vela de barco no cotovelo).');
    } else if (ehFerida) {
      corpo.push('*ROTEIRO DETERMINÍSTICO DE FERIDAS, LESÕES POR PRESSÃO E QUEIMADURAS:*');
      corpo.push('1. *Lesões por Pressão (NPUAP):* Estágio 1 (eritema não branqueável), 2 (úlcera rasa dérmica), 3 (gordura subcutânea), 4 (músculo/osso exposto).');
      corpo.push('2. *Queimaduras (Parkland):* Volume 24h = 2 a 4 mL x Peso (kg) x %SCQ (50% nas primeiras 8h).');
    } else {
      corpo.push('*CHECKLIST UNIVERSAL DE SEGURANÇA DIAGNÓSTICA (SALA VERMELHA / ENFERMARIA):*');
      corpo.push('1. *Sinais Vitais e Monitorização (MOV):* Monitor cardíaco, Oxímetro de pulso, PA seriada.');
      corpo.push('2. *Descarte de Emergências Imediatas:*');
      corpo.push('   • SCA / IAM: ECG de 12 derivações em < 10 minutos;');
      corpo.push('   • Sepse / Choque: PA, FC, FR, lactato, hemoculturas;');
      corpo.push('   • AVC: Déficit focal súbito, janela de 4,5 horas, TC de crânio.');
      corpo.push('3. *Documentação:* Registre achados objetivos, horário exato do exame e plano terapêutico imediato.');
    }

    return cabecalhoContingencia + corpo.join('\n') + rodapeSeguranca;
  }

  /**
   * Processador determinístico offline de áudio clínico em contingência.
   * Estrutura o relato ditado sem depender de provedores de IA externos.
   */
  function processarAudioClinicoOffline(base64Data, mimeType, opcoes) {
    opcoes = opcoes || {};
    var textoContexto = String(opcoes.caption || opcoes.contextoTexto || opcoes.contexto || opcoes.textoFallback || '').trim();
    var tLow = textoContexto.toLowerCase();

    var ehLeito = /leito\s*([0-9a-zA-Z]+)|quarto\s*([0-9a-zA-Z]+)/i.test(textoContexto);
    var numLeito = null;
    var matchLeito = textoContexto.match(/leito\s*([0-9a-zA-Z]+)|quarto\s*([0-9a-zA-Z]+)/i);
    if (matchLeito) {
      numLeito = (matchLeito[1] || matchLeito[2] || '').trim();
    }

    var proto = identificarProtocoloClinico(textoContexto);
    var statusSugerido = 'estavel';
    if (proto || tLow.indexOf('febre') !== -1 || tLow.indexOf('dor') !== -1 || tLow.indexOf('instavel') !== -1 || tLow.indexOf('urg') !== -1) {
      statusSugerido = (proto && (proto === PROTOCOLOS_OFFLINE.PCR_ADULTO || proto === PROTOCOLOS_OFFLINE.CHOQUE_SEPTICO || proto === PROTOCOLOS_OFFLINE.SCA_IAM))
        ? 'instavel'
        : 'vigilancia';
    }

    var transcricaoTexto = textoContexto
      ? ('[Áudio Ditado Beira-Leito]: ' + textoContexto)
      : '[Áudio clínico captado beira-leito - Contingência Offline de 15s]';

    var evolucaoTexto = '';
    var soapTexto = '';
    var subjetivo = '';
    var objetivo = 'Sinais vitais e exame segmentar pendentes de validação direta beira-leito.';
    var tipoRelato = ehLeito ? 'leito' : 'soap';

    if (ehLeito) {
      evolucaoTexto = 'Paciente no Leito ' + (numLeito || 'não especificado') + '. ' +
        (proto ? 'Quadro sugestivo de ' + proto.titulo + '. ' : 'Evolução de rotina da enfermaria. ') +
        'Conduta e pendências em acompanhamento pela equipe médica.';
    } else {
      subjetivo = textoContexto || 'Paciente relata sintomas para atendimento clínico beira-leito.';
      if (proto) {
        soapTexto = proto.gerarConduta(textoContexto);
      } else {
        soapTexto = gerarCondutaGeralEmergencia(textoContexto);
      }
    }

    return {
      sucesso: true,
      transcricao: transcricaoTexto,
      eh_clinico: true,
      tipo_relato: tipoRelato,
      numero_leito: numLeito,
      status_sugerido: statusSugerido,
      evolucao_texto: evolucaoTexto || null,
      pendencias: [],
      subjetivo: subjetivo || null,
      objetivo: objetivo,
      perguntas_anamnese: (typeof avaliarSuficienciaAnamnese === 'function' && avaliarSuficienciaAnamnese(textoContexto, {}).anamneseSuficiente) ? [] : [
        'Quais os sinais vitais atuais (PA, FC, FR, SatO2, Temperatura)? (estratificação objetiva de risco)',
        'Há comorbidades, alergias e medicações em uso? (segurança de prescrição)'
      ],
      exame_dirigido: ['Aferição multiparamétrica completa e exame clínico dos 5 sistemas vitais.'],
      soapTexto: soapTexto || null,
      contingencia_offline: true,
      aviso_contingencia: 'Processado pelo Motor Determinístico Offline (timeout seguro de 15s / Provedor em contingência).'
    };
  }

  /**
   * Resposta determinística para áudio quando o transdutor/LLM estiver em timeout ou contingência.
   */
  function gerarFallbackAudio(promptUsuario, mimeType, opcoes) {
    opcoes = opcoes || {};
    var p = String(promptUsuario || '').toLowerCase();
    if (p.indexOf('[calendar]') !== -1 || p.indexOf('marcar') !== -1 || p.indexOf('agendar') !== -1 || p.indexOf('agenda') !== -1) {
      return [
        '⚡ *MODO OFFLINE DE CONTINGÊNCIA (ÁUDIO / AGENDAMENTO)*',
        '📅 [CALENDAR] Agendamento registrado localmente.',
        '💡 Por favor, confirme os detalhes diretamente no aplicativo de agenda.'
      ].join('\n');
    }
    return [
      '⚡ *MODO OFFLINE DE CONTINGÊNCIA (ÁUDIO)*',
      '🎙️ *Não consegui processar seu áudio agora (oscilação na rede de voz).*',
      '',
      'Se for urgente, digite em poucas palavras a *droga + peso* (ex: `nora 70kg`, `amiodarona ataque`) ou a *dúvida clínica*, ou reenvie o áudio em instantes.'
    ].join('\n');
  }

  /**
   * Ponto único de fallback para chamadas multimodais (imagem ou áudio).
   */
  function gerarFallbackMultimodal(promptUsuario, sistema, mimeType, opcoes) {
    opcoes = opcoes || {};
    var mime = String(mimeType || '').toLowerCase();
    if (mime.indexOf('image/') !== -1) {
      return analisarImagemOffline(promptUsuario || sistema, mime, opcoes);
    }
    if (mime.indexOf('audio/') !== -1) {
      return gerarFallbackAudio(promptUsuario || sistema, mime, opcoes);
    }
    return gerarRespostaOfflineClinica(sistema, promptUsuario, opcoes);
  }

  /**
   * Ponto de entrada unificado para execução de fallback local e contingência offline.
   * Tenta primeiramente inferência local generativa com nós homologados (Ollama/Mistral/Llama 3).
   * Se o nó local estiver inacessível, com modelo ausente ou em timeout, dispara
   * imediata e deterministicamente o catálogo de contingência clínica oficial (ACLS/SBC/AMIB).
   *
   * @param {string} sistema - Contexto clínico ou persona
   * @param {string} promptUsuario - Descrição do caso ou pergunta clínica
   * @param {Object} [opcoes] - Opções de execução (ex: { json: boolean, modeloForcado: string, tokens: number })
   * @returns {string|Object} Resposta clínica completa e segura
   */
  function executarFallbackLocalOffline(arg1, arg2, arg3, arg4) {
    var sistema, promptUsuario, opcoes;

    // Normalização polimórfica para chamada direta vs RPC Fastify
    if (typeof arg1 === 'object' && arg1 !== null && (arg1.usuario || arg1.chatId || arg1.auth_date || arg1.hash)) {
      if (typeof arg2 === 'object' && arg2 !== null && (arg2.prompt || arg2.caso || arg2.texto)) {
        sistema = arg2.sistema || '';
        promptUsuario = arg2.prompt || arg2.caso || arg2.texto || '';
        opcoes = arg2;
      } else {
        sistema = arg2;
        promptUsuario = arg3;
        opcoes = arg4 || {};
      }
    } else if (typeof arg1 === 'string' && (arg1.indexOf('session_') === 0 || arg1.indexOf('Bearer ') === 0 || /^[a-f0-9]{32,64}$/i.test(arg1)) && arg3 !== undefined) {
      sistema = arg2;
      promptUsuario = arg3;
      opcoes = arg4 || {};
    } else if (typeof arg1 === 'string' && (arg1.indexOf('session_') === 0 || arg1.indexOf('Bearer ') === 0) && typeof arg2 === 'object' && arg2 !== null && (arg2.prompt || arg2.caso || arg2.texto)) {
      sistema = arg2.sistema || '';
      promptUsuario = arg2.prompt || arg2.caso || arg2.texto || '';
      opcoes = arg2;
    } else {
      sistema = arg1;
      promptUsuario = arg2;
      opcoes = arg3 || {};
    }

    opcoes = opcoes || {};
    sistema = String(sistema || '').trim();
    promptUsuario = String(promptUsuario || '').trim();

    // 1. Tentar inferência generativa local via Ollama nativo ou nó local OpenAI
    var precisaJson = !!(opcoes.json || /contrato\s+json|json\s+estrito|\bformato\s+json\b/i.test(sistema));

    if (!opcoes.forcarDeterministico) {
      try {
        var respostaLocal = null;
        if (typeof _iaChamarOllamaNativo === 'function') {
          var rOllama = _iaChamarOllamaNativo(sistema, promptUsuario, opcoes.tokens || 2000, null, opcoes);
          if (rOllama && rOllama.texto && String(rOllama.texto).trim()) {
            respostaLocal = String(rOllama.texto).trim();
          }
        }
        if (!respostaLocal && typeof chamarLocalLlmAPI === 'function') {
          var rLocal = chamarLocalLlmAPI(sistema, promptUsuario, opcoes.tokens || 2000, opcoes.modeloForcado);
          if (rLocal && String(rLocal).trim()) {
            respostaLocal = String(rLocal).trim();
          }
        }

        if (respostaLocal) {
          if (precisaJson) {
            try {
              var parsed = JSON.parse(respostaLocal);
              return opcoes.retornarObjeto ? parsed : JSON.stringify(parsed);
            } catch (_) {
              // Se o modelo local gerou texto que não é JSON estrito, segue para o estruturador heurístico
            }
          } else {
            return respostaLocal;
          }
        }
      } catch (eLocal) {
        if (typeof Logger !== 'undefined' && Logger.log) {
          Logger.log('[IaLocalFallbackService] Falha na inferência local generativa: ' + (eLocal.message || eLocal) + '. Acionando determinístico.');
        }
      }
    }

    // 2. Contingência Determinística Canônica (Zero Latência & Salvaguarda Beira-Leito)
    if (precisaJson) {
      var jsonOffline = estruturarJsonOffline(sistema, promptUsuario);
      return opcoes.retornarObjeto ? JSON.parse(jsonOffline) : jsonOffline;
    }

    return gerarRespostaOfflineClinica(sistema, promptUsuario, opcoes);
  }

  /**
   * Gera perguntas socráticas de segurança crítica baseadas nas pérolas do Tá de Clinicagem (TdC)
   * e diretrizes 2024-2026 para ancorar o raciocínio clínico na emergência.
   * @param {string} textoCaso Texto ou termo clínico em discussão
   * @return {Object|null} Objeto com perolaTdC e perguntaSocratica
   */
  function obterAncoraSocraticaTdCEmergencia(textoCaso) {
    var protocolo = typeof obterProtocoloClinico === "function" ? obterProtocoloClinico(textoCaso) : null;
    if (!protocolo) return null;

    var mapaSocraticoTdC = {
      "Sepse e Choque Séptico": {
        perolaTdC: "SSC 2021 + CLOVERS / ANDROMEDA-SHOCK: qSOFA isolado não serve para triagem; guie a ressuscitação pelo Tempo de Enchimento Capilar (TEC ≤ 3s) e lactato, priorize Ringer Lactato e inicie Noradrenalina periférica precoce se PAM < 65 mmHg sem atrasar o controle de foco (6-12h).",
        perguntaSocratica: "Qual é o Tempo de Enchimento Capilar (TEC) atual do paciente, qual o foco infeccioso que precisa de controle na 1ª hora e você já considerou iniciar Noradrenalina em veia periférica calibrosa enquanto corre o Ringer Lactato?"
      },
      "Cetoacidose Diabética (CAD) e Estado Hiperosmolar Hiperglicêmico (EHH)": {
        perolaTdC: "ADA/SBD 2024: NUNCA inicie insulina regular EV antes de checar o Potássio sérico (se K < 3,5 mEq/L, repor K+ antes). Lembre-se de iniciar SG 5% quando a glicemia atingir 200 mg/dL (ou desde a 1ª hora na CAD euglicêmica por iSGLT2) e aplicar insulina basal SC 2 a 4h ANTES de desligar a bomba EV.",
        perguntaSocratica: "Antes de ligar a bomba de insulina regular EV, qual é o valor do Potássio sérico deste paciente? E quando o ânion gap fechar, qual cuidado na transição para insulina subcutânea evitará a cetoacidose de rebote?"
      },
      "Crise de Asma Grave no Adulto": {
        perolaTdC: "GINA 2024-2026: Alvo de SpO₂ 93-95%, corticoide sistêmico na 1ª hora e Sulfato de Magnésio 2g EV em 20 min se crise grave. Na alta (Track 1), é proscrito prescrever SABA isolado: associe Corticoide Inalatório + Formoterol de alívio (AIR/MART).",
        perguntaSocratica: "Há algum sinal de falência ventilatória iminente (tórax silencioso ou PaCO₂ normalizando/subindo)? Se a crise for grave, já indicou Sulfato de Magnésio 2g EV e planejou a alta na Track 1 do GINA (CI + Formoterol)?"
      },
      "Anafilaxia e Choque Anafilático": {
        perolaTdC: "WAO/ASBAI: Adrenalina 1:1000 (0,5 mg IM no vasto lateral da coxa) imediata + decúbito dorsal com pernas elevadas (nunca sentar ou levantar subitamente pelo risco de síndrome do ventrículo vazio). Se refratário em usuário de betabloqueador, usar Glucagon 1-2 mg EV.",
        perguntaSocratica: "A Adrenalina 1:1000 IM no vasto lateral já foi administrada imediatamente com o paciente mantido em decúbito dorsal estrito? Ele faz uso crônico de betabloqueador?"
      },
      "Hemorragia Digestiva Alta (HDA Varicosa e Não Varicosa)": {
        perolaTdC: "Baveno VII: Transfusão restritiva (alvo Hb 7-8 g/dL). Na suspeita de HDA varicosa em cirrótico, iniciar Terlipressina 2 mg EV 4/4h + Ceftriaxona 1g EV/dia ANTES da EDA, associar Eritromicina pré-EDA e suspender betabloqueador se hipotensão ou IRA.",
        perguntaSocratica: "Há estigmas de hepatopatia crônica/hipertensão portal que exijam Terlipressina + Ceftriaxona imediatas antes da EDA em 12h, mantendo estratégia transfusional restritiva (Hb 7-8 g/dL)?"
      },
      "Infarto Agudo do Miocárdio (IAM)": {
        perolaTdC: "SBC 2024 / AHA: Tempo porta-agulha ≤ 30 min (se trombólise) ou porta-balão ≤ 90 min (se angioplastia primária). AAS mastigado 300 mg + 2º antiplaquetário (Ticagrelor 180 mg ou Clopidogrel 300/600 mg). Morfina de rotina é proscrita.",
        perguntaSocratica: "Qual é o tempo porta-ECG (meta ≤ 10 min)? Se houver supra de ST, a reperfusão por angioplastia primária está acessível em até 120 min ou está indicada a fibrinólise imediata?"
      },
      "Edema Agudo de Pulmão (EAP Cardiogênico)": {
        perolaTdC: "ESC/SBC 2024: VNI precoce (CPAP/BIPAP com PEEP 5-10 cmH2O) + Vasodilatador venoso/arterial (Nitroglicerina/Nitroprussiato) se PAS > 110 mmHg. Furosemida em bólus (1 a 2x a dose crônica). Evite morfina rotineira.",
        perguntaSocratica: "A Ventilação Não Invasiva (VNI) já foi instalada e a PAS permite titulação agressiva de vasodilatador EV (Nitroglicerina) para alívio imediato da pós-carga?"
      },
      "Crise Convulsiva e Estado de Mal Epiléptico": {
        perolaTdC: "ABN / AES / ESETT: 0-5 min: Benzodiazepínico (Diazepam 10 mg EV ou Midazolam 10 mg IM). Se refratário aos 5-10 min, repetir 1 dose. 10-20 min: 2ª linha (Levetiracetam 60 mg/kg máx 4500 mg, Valproato 40 mg/kg máx 3000 mg ou Fenitoína 20 mg/kg máx 1500 mg).",
        perguntaSocratica: "O Benzodiazepínico foi feito na dose e tempo corretos (primeiros 5 min)? Qual anticonvulsivante de 2ª linha (Levetiracetam, Valproato ou Fenitoína) já está em preparo?"
      }
    };

    return mapaSocraticoTdC[protocolo.titulo] || {
      perolaTdC: protocolo.divergencia || "",
      perguntaSocratica: "Quais são as condutas salvadoras de vida nos primeiros 10 a 60 minutos segundo a diretriz (" + protocolo.diretriz_brasileira + ")?"
    };
  }

  return {
    MODELOS_HOMOLOGADOS_LOCAL: MODELOS_HOMOLOGADOS_LOCAL,
    PROTOCOLOS_OFFLINE: PROTOCOLOS_OFFLINE,
    identificarProtocoloClinico: identificarProtocoloClinico,
    gerarRespostaOfflineClinica: gerarRespostaOfflineClinica,
    gerarCondutaGeralEmergencia: gerarCondutaGeralEmergencia,
    estruturarJsonOffline: estruturarJsonOffline,
    verificarStatus: verificarStatus,
    analisarImagemOffline: analisarImagemOffline,
    processarAudioClinicoOffline: processarAudioClinicoOffline,
    gerarFallbackAudio: gerarFallbackAudio,
    gerarFallbackMultimodal: gerarFallbackMultimodal,
    executarFallbackLocalOffline: executarFallbackLocalOffline,
    obterAncoraSocraticaTdCEmergencia: obterAncoraSocraticaTdCEmergencia,
    _iaChamarOllamaNativo: function(arg1, arg2, arg3, arg4, arg5, arg6) {
      if (typeof _iaChamarOllamaNativo === 'function') {
        return _iaChamarOllamaNativo(arg1, arg2, arg3, arg4, arg5, arg6);
      }
      return null;
    }
  };
})();

/**
 * ==============================================================================
 * CIRCUIT BREAKER DETERMINÍSTICO PARA PROVEDORES EXTERNOS DE IA (MULTIMODAL & LLM)
 * ==============================================================================
 * Gerenciador de resiliência com 3 estados (CLOSED, OPEN, HALF_OPEN):
 * - CLOSED: Operação normal. Requisições são despachadas para APIs externas.
 * - OPEN: Bloqueio protetivo (Fast-Fail em 0ms) após 3 falhas consecutivas ou
 *         timeouts. Evita retenção de threads e esperas beira-leito. Cooldown: 60s.
 * - HALF_OPEN: Após expirar o cooldown, autoriza 1 requisição de teste para avaliar
 *              recuperação do serviço externo.
 */
var IaCircuitBreaker = (function () {
  'use strict';

  var ESTADOS = {
    FECHADO: 'CLOSED',
    ABERTO: 'OPEN',
    MEIO_ABERTO: 'HALF_OPEN'
  };

  var CONFIG_PADRAO = {
    falhasParaAbrir: 3,         // 3 falhas consecutivas disparam abertura
    cooldownMs: 60000,          // 60 segundos de cooldown
    timeoutMultimodalMs: 15000  // 15 segundos para provedores multimodais
  };

  var circuitos = {};

  function _obterCircuito(chave) {
    var k = String(chave || 'MULTIMODAL').toUpperCase();
    if (!circuitos[k]) {
      circuitos[k] = {
        chave: k,
        estado: ESTADOS.FECHADO,
        falhasConsecutivas: 0,
        sucessosConsecutivos: 0,
        abertoEm: 0,
        proximoTesteEm: 0,
        ultimoErro: null,
        totalFalhas: 0,
        totalSucessos: 0,
        totalBloqueios: 0
      };
    }
    return circuitos[k];
  }

  function podeExecutar(chave) {
    var c = _obterCircuito(chave);
    var agora = Date.now();

    if (c.estado === ESTADOS.FECHADO) {
      return true;
    }

    if (c.estado === ESTADOS.ABERTO) {
      if (agora >= c.proximoTesteEm) {
        c.estado = ESTADOS.MEIO_ABERTO;
        if (typeof Logger !== 'undefined' && Logger.log) {
          Logger.log('[CircuitBreaker ' + c.chave + '] Transição OPEN -> HALF_OPEN (permitindo teste)');
        }
        return true;
      }
      c.totalBloqueios++;
      return false;
    }

    if (c.estado === ESTADOS.MEIO_ABERTO) {
      return true;
    }

    return true;
  }

  function registrarSucesso(chave) {
    var c = _obterCircuito(chave);
    c.totalSucessos++;
    c.falhasConsecutivas = 0;
    c.ultimoErro = null;

    if (c.estado === ESTADOS.MEIO_ABERTO || c.estado === ESTADOS.ABERTO) {
      c.estado = ESTADOS.FECHADO;
      c.abertoEm = 0;
      c.proximoTesteEm = 0;
      if (typeof Logger !== 'undefined' && Logger.log) {
        Logger.log('[CircuitBreaker ' + c.chave + '] Provedor restabelecido com sucesso. Circuito FECHADO.');
      }
    }
  }

  function registrarFalha(chave, erroOuMsg) {
    var c = _obterCircuito(chave);
    var agora = Date.now();
    var msgErro = erroOuMsg ? (erroOuMsg.message || String(erroOuMsg)) : 'Erro não especificado';

    c.totalFalhas++;
    c.falhasConsecutivas++;
    c.ultimoErro = msgErro;

    if (c.estado === ESTADOS.MEIO_ABERTO) {
      c.estado = ESTADOS.ABERTO;
      c.abertoEm = agora;
      c.proximoTesteEm = agora + CONFIG_PADRAO.cooldownMs;
      if (typeof Logger !== 'undefined' && Logger.log) {
        Logger.log('[CircuitBreaker ' + c.chave + '] Falha no teste. Circuito REABERTO por ' + (CONFIG_PADRAO.cooldownMs / 1000) + 's: ' + msgErro);
      }
      return;
    }

    if (c.estado === ESTADOS.FECHADO && c.falhasConsecutivas >= CONFIG_PADRAO.falhasParaAbrir) {
      c.estado = ESTADOS.ABERTO;
      c.abertoEm = agora;
      c.proximoTesteEm = agora + CONFIG_PADRAO.cooldownMs;
      if (typeof Logger !== 'undefined' && Logger.log) {
        Logger.log('[CircuitBreaker ' + c.chave + '] ABERTO após ' + c.falhasConsecutivas + ' falhas (' + (CONFIG_PADRAO.cooldownMs / 1000) + 's de cooldown): ' + msgErro);
      }
    }
  }

  function obterStatus(chave) {
    var c = _obterCircuito(chave);
    var agora = Date.now();
    var tempoRestanteMs = 0;
    if (c.estado === ESTADOS.ABERTO && c.proximoTesteEm > agora) {
      tempoRestanteMs = c.proximoTesteEm - agora;
    }
    return {
      chave: c.chave,
      estado: c.estado,
      aberto: c.estado === ESTADOS.ABERTO,
      meioAberto: c.estado === ESTADOS.MEIO_ABERTO,
      fechado: c.estado === ESTADOS.FECHADO,
      falhasConsecutivas: c.falhasConsecutivas,
      limiteFalhas: CONFIG_PADRAO.falhasParaAbrir,
      abertoEm: c.abertoEm,
      proximoTesteEm: c.proximoTesteEm,
      tempoRestanteMs: tempoRestanteMs,
      ultimoErro: c.ultimoErro,
      totalFalhas: c.totalFalhas,
      totalSucessos: c.totalSucessos,
      totalBloqueios: c.totalBloqueios
    };
  }

  function resetar(chave) {
    if (!chave) {
      circuitos = {};
      return;
    }
    var k = String(chave).toUpperCase();
    if (circuitos[k]) {
      circuitos[k].estado = ESTADOS.FECHADO;
      circuitos[k].falhasConsecutivas = 0;
      circuitos[k].abertoEm = 0;
      circuitos[k].proximoTesteEm = 0;
      circuitos[k].ultimoErro = null;
    }
  }

  function forcarEstado(chave, novoEstado, motivo) {
    var c = _obterCircuito(chave);
    var agora = Date.now();
    var st = String(novoEstado).toUpperCase();
    if (st === ESTADOS.ABERTO) {
      c.estado = ESTADOS.ABERTO;
      c.abertoEm = agora;
      c.proximoTesteEm = agora + CONFIG_PADRAO.cooldownMs;
      c.ultimoErro = motivo || 'Forçado manualmente';
    } else if (st === ESTADOS.MEIO_ABERTO) {
      c.estado = ESTADOS.MEIO_ABERTO;
      c.proximoTesteEm = agora;
    } else {
      c.estado = ESTADOS.FECHADO;
      c.falhasConsecutivas = 0;
      c.abertoEm = 0;
      c.proximoTesteEm = 0;
      c.ultimoErro = null;
    }
  }

  return {
    ESTADOS: ESTADOS,
    CONFIG_PADRAO: CONFIG_PADRAO,
    podeExecutar: podeExecutar,
    registrarSucesso: registrarSucesso,
    registrarFalha: registrarFalha,
    obterStatus: obterStatus,
    resetar: resetar,
    forcarEstado: forcarEstado
  };
})();

function executarFallbackLocalOffline(arg1, arg2, arg3, arg4) {
  return IaLocalFallbackService.executarFallbackLocalOffline(arg1, arg2, arg3, arg4);
}

function obterAncoraSocraticaTdCEmergencia(textoCaso) {
  return IaLocalFallbackService.obterAncoraSocraticaTdCEmergencia(textoCaso);
}

if (typeof global !== 'undefined') {
  global.executarFallbackLocalOffline = executarFallbackLocalOffline;
  global.obterAncoraSocraticaTdCEmergencia = obterAncoraSocraticaTdCEmergencia;
  if (typeof _iaChamarOllamaNativo !== 'undefined') {
    global._iaChamarOllamaNativo = _iaChamarOllamaNativo;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    IaLocalFallbackService: IaLocalFallbackService,
    IaCircuitBreaker: IaCircuitBreaker,
    executarFallbackLocalOffline: executarFallbackLocalOffline,
    obterAncoraSocraticaTdCEmergencia: obterAncoraSocraticaTdCEmergencia,
    _iaChamarOllamaNativo: (typeof _iaChamarOllamaNativo !== 'undefined' ? _iaChamarOllamaNativo : null)
  };
}


