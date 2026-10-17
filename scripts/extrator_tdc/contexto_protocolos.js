
var PROTOCOLOS_CLINICOS_EMERGENCIA = {
  "sepse": {
    "titulo": "Sepse e Choque Séptico",
    "diretriz_brasileira": "ILAS (Instituto Latino-Americano de Sepse) 2023 / CFM",
    "diretriz_internacional": "Surviving Sepsis Campaign (SSC) 2021",
    "conduta_imediata": "1. Reconhecimento precoce (qSOFA ≥ 2 ou alteração de disfunção orgânica: Glasgow, PA, FR).\n" +
      "2. Pacote de 1ª hora (ILAS / SSC):\n" +
      "   • Coleta de lactato arterial ou venoso imediato.\n" +
      "   • 2 pares de hemoculturas antes do antimicrobiano (sem atrasar início > 45 min).\n" +
      "   • Antibioticoterapia de amplo espectro na 1ª hora.\n" +
      "   • Ressuscitação volêmica: Cristaloide balanceado (Ringer Lactato preferível a SF 0,9%) 30 mL/kg nas primeiras 3h se hipotensão (PAS < 90 ou PAM < 65) ou Lactato ≥ 4 mmol/L (36 mg/dL).\n" +
      "   • Droga vasoativa de 1ª escolha: Noradrenalina precoce (iniciar se PAM < 65 mesmo durante infusão de cristaloide). Alvo PAM ≥ 65 mmHg.",
    "divergencia": "🇧🇷 ILAS vs 🌐 SSC: O ILAS reforça que em hospitais brasileiros sem leito imediato de UTI, a noradrenalina em veia periférica calibrosa bem puncionada é fortemente encorajada nas primeiras horas para não atrasar reversão de choque enquanto se providencia CVC. A SSC sugere corticoide (Hidrocortisona 200 mg/dia) se noradrenalina > 0,25 mcg/kg/min por mais de 4h."
  },
  "iam": {
    "titulo": "Síndrome Coronariana Aguda (IAM com e sem supra de ST)",
    "diretriz_brasileira": "Diretrizes SBC (Sociedade Brasileira de Cardiologia) 2021/2023",
    "diretriz_internacional": "AHA/ACC 2023 / ESC 2023",
    "conduta_imediata": "1. ECG de 12 derivações em até 10 minutos da admissão.\n" +
      "2. Terapia Antiplaquetária Dupla Imediata (DAPT):\n" +
      "   • AAS 200-300 mg mastigável (manutenção 81-100 mg/dia).\n" +
      "   • Inibidor P2Y12: Ticagrelor 180 mg VO de ataque (manutenção 90 mg 12/12h) OU Clopidogrel 300 mg (600 mg se ICP primária ou 300 mg se trombólise ≤ 75 anos).\n" +
      "3. Anticoagulação: Enoxaparina 30 mg IV bolus + 1 mg/kg SC 12/12h (se < 75 anos e ClCr > 30) ou HNF.\n" +
      "4. Alívio de Sintomas e Isquemia:\n" +
      "   • Nitrato sublingual (Isordil 5 mg) se dor persistente (CONTRAINDICADO se PAS < 90, infarto de VD ou uso de inibidor de PDE5 nas últimas 24-48h).\n" +
      "   • Morfina 2 a 4 mg IV apenas se dor refratária (evitar de rotina por retardar absorção de P2Y12).\n" +
      "5. Reperfusão no IAM com Supra:\n" +
      "   • ICP Primária: tempo porta-balão ≤ 90 min (ou ≤ 120 min se transferido).\n" +
      "   • Trombólise (Tenecteplase/Alteplase): tempo porta-agulha ≤ 30 min se ICP não disponível em 120 min.",
    "divergencia": "🇧🇷 SBC vs 🌐 ESC/AHA: No Brasil, o Clopidogrel permanece como opção prioritária no SUS pela indisponibilidade frequente de Ticagrelor/Prasugrel na rede pública. Se trombolisado com Tenecteplase, a SBC e o Ministério da Saúde recomendam dose ajustada por peso exato; se idade ≥ 75 anos, meia dose de TNK sem bolus de enoxaparina."
  },
  "eap": {
    "titulo": "Edema Agudo de Pulmão (EAP Hipertensivo) e IC Descompensada",
    "diretriz_brasileira": "Diretrizes SBC de Insuficiência Cardíaca 2021/2023",
    "diretriz_internacional": "ESC Heart Failure 2023 / AHA 2022",
    "conduta_imediata": "1. Oxigenoterapia e VNI Imediata: CPAP (8-10 cmH2O) ou BIPAP (IPAP 12-14, EPAP 6-8) reduzem intubação e mortalidade na primeira hora.\n" +
      "2. Vasodilatador Venoso de Ação Rápida (EAP Hipertensivo com PAS > 140):\n" +
      "   • Nitroglicerina (Tridil) IV: iniciar a 10-20 mcg/min e titular a cada 5 min OU Nitroprussiato de Sódio (Nipride) 0,3-0,5 mcg/kg/min se emergência hipertensiva grave.\n" +
      "3. Diurético de Alça Venoso: Furosemida 20 a 40 mg IV (ou 1 a 2x a dose oral prévia do paciente).\n" +
      "4. Posição: Cabeceira elevada a 90 graus com pernas pendentes.\n" +
      "5. Morfina NÃO é recomendada de rotina (aumenta intubação e UTI pela ESC/SBC).",
    "divergencia": "A SBC e ESC desaconselham formalmente morfina de rotina no EAP. O foco imediato no EAP hipertensivo é a vasodilatação rápida (redução de pós-carga) antes de grandes volumes de diurético."
  },
  "cad": {
    "titulo": "Cetoacidose Diabética (CAD) e Estado Hiperosmolar Hiperglicêmico (EHH)",
    "diretriz_brasileira": "Diretrizes SBD (Sociedade Brasileira de Diabetes) 2023/2024",
    "diretriz_internacional": "ADA (American Diabetes Association) Standards of Care 2024",
    "conduta_imediata": "1. Hidratação Venosa (Etapa 1):\n" +
      "   • SF 0,9% 1000 a 1500 mL na 1ª hora (15-20 mL/kg/h).\n" +
      "   • Após 1ª hora: avaliar Na corrigido. Se Na normal/alto: trocar para NaCl 0,45% 250-500 mL/h.\n" +
      "2. Avaliação Mandatória do Potássio ANTES da Insulina (ADA 2024):\n" +
      "   • Se K < 3,5 mEq/L: NÃO INICIAR INSULINA! Repor KCl 20 a 30 mEq/h até K > 3,5 mEq/L.\n" +
      "   • Se K 3,5 a 5,2 mEq/L: Iniciar insulina E repor KCl 20-30 mEq por litro de soro de manutenção (Atenção ISMP Brasil: KCl 19,1% [1 mL = 2,56 mEq -> 10 mL = ~25,6 mEq] OU KCl 10% [1 mL = 1,34 mEq -> 10 mL = ~13,4 mEq]. NUNCA administrar KCl puro em bolus venoso!).\n" +
      "   • Se K > 5,2 mEq/L: Iniciar insulina e NÃO repor potássio (monitorar a cada 2h).\n" +
      "3. Insulinoterapia:\n" +
      "   • Insulina Regular IV contínua: 0,1 U/kg/h (ou bolus 0,1 U/kg + 0,1 U/kg/h).\n" +
      "   • Meta de queda glicêmica: 50 a 70 mg/dL por hora.\n" +
      "   • Quando glicemia atingir 200 mg/dL: associar Soro Glicosado a 5% (SG 5%) e reduzir insulina para 0,02-0,05 U/kg/h para evitar hipoglicemia e edema cerebral enquanto fecha o ânion gap.\n" +
      "4. Bicarbonato: reservado APENAS se pH < 6,9.",
    "divergencia": "Tanto SBD quanto ADA condenam o uso de bicarbonato se pH ≥ 6,9 (risco de hipocalemia severa, hipóxia tecidual e acidose liquórica paradoxal). Critério de resolução: glicemia < 200 + 2 de: HCO3 ≥ 15, pH venoso > 7,30 e Anion Gap normal (≤ 12)."
  },
  "tep": {
    "titulo": "Tromboembolismo Pulmonar (TEP)",
    "diretriz_brasileira": "Diretriz SBC / SBACV de Embolia Pulmonar",
    "diretriz_internacional": "ESC Pulmonary Embolism Guidelines / CHEST",
    "conduta_imediata": "1. Estratificação de Risco Imediata:\n" +
      "   • Alto Risco (Instabilidade Hemodinâmica / Choque / PAS < 90):\n" +
      "     - Suporte ventilatório e hemodinâmico (evitar sobrecarga volêmica, vasopressor precoce: Noradrenalina).\n" +
      "     - Reperfusão de emergência imediata: Trombólise sistêmica com Alteplase (rtPA 100 mg IV em 2h ou 0,6 mg/kg em 15 min na PCR iminente).\n" +
      "     - Anticoagulação imediata com HNF venosa em bolus (80 UI/kg) e infusão (18 UI/kg/h).\n" +
      "   • Risco Intermediário / Baixo (Estável):\n" +
      "     - Anticoagulação plena com Enoxaparina 1 mg/kg SC 12/12h ou NOACs (Rivaroxabana 15 mg 12/12h 21 dias ou Apixabana 10 mg 12/12h 7 dias).\n" +
      "     - Escore sPESI para decisão de internação vs alta precoce.",
    "divergencia": "No SUS/Brasil, Enoxaparina e Varfarina ainda são as mais disponíveis na internação e alta, enquanto no cenário privado e internacional os NOACs (DOACs) são primeira linha isolada."
  },
  "dpoc": {
    "titulo": "DPOC Exacerbada",
    "diretriz_brasileira": "Diretrizes SBPT (Sociedade Brasileira de Pneumologia e Tisiologia) 2023",
    "diretriz_internacional": "GOLD 2024",
    "conduta_imediata": "1. Broncodilatadores de Ação Rápida:\n" +
      "   • Salbutamol 4 a 8 jatos com espaçador a cada 20 min na 1ª hora (ou nebulização 2,5-5 mg).\n" +
      "   • Brometo de Ipratrópio associado a cada 20 min na 1ª hora.\n" +
      "2. Corticoterapia Sistêmica Precoce:\n" +
      "   • Prednisona 40 mg VO 1x/dia por 5 dias (GOLD/SBPT) OU Hidrocortisona 100 mg IV se via oral inviável.\n" +
      "3. Oxigenoterapia Controlada:\n" +
      "   • Alvo SpO2: 88% a 92% (evitar hiperóxia que induz efeito Haldane e narcose por CO2).\n" +
      "4. Ventilação Não Invasiva (VNI):\n" +
      "   • Primeira linha se acidose respiratória aguda (pH < 7,35 e PaCO2 > 45 mmHg) ou fadiga muscular.\n" +
      "5. Antibioticoterapia (Critérios de Anthonisen: escarro purulento, aumento de volume, piora da dispneia):\n" +
      "   • Amoxicilina + Clavulanato 875/125 mg 12/12h por 5-7 dias OU Azitromicina 500 mg/dia por 5 dias.",
    "divergencia": "A SBPT e o GOLD 2024 reforçam tempo de corticoide curto de apenas 5 dias, eliminando desmames desnecessários."
  },
  "asma": {
    "titulo": "Crise de Asma Grave no Adulto",
    "diretriz_brasileira": "Diretrizes SBPT para Manejo da Asma",
    "diretriz_internacional": "GINA 2024/2026 Strategy Report",
    "conduta_imediata": "1. Broncodilatadores de Ação Rápida:\n" +
      "   • Salbutamol spray 4 a 10 jatos com espaçador a cada 20 min na 1ª hora (ou nebulização 2,5 a 5 mg).\n" +
      "   • Brometo de Ipratrópio (0,5 mg nebulizado ou 4 a 8 jatos) associado na 1ª hora em crise moderada a grave.\n" +
      "2. Corticoterapia Sistêmica Precoce (início na 1ª hora):\n" +
      "   • Prednisona 40 a 50 mg VO por 5 a 7 dias OU Hidrocortisona 200 mg IV se via oral impraticável.\n" +
      "3. Oxigenoterapia Titulada (Alvo GINA):\n" +
      "   • Alvo SpO₂: 93% a 95% em adultos (em gestantes ≥ 95%). Evitar hipoxemia e evitar hiperóxia excessiva.\n" +
      "4. Sulfato de Magnésio EV (se má resposta inicial ou crise grave):\n" +
      "   • Sulfato de Magnésio 2 g IV em 20 minutos (Atenção ISMP Brasil: MgSO4 50% [500 mg/mL -> 2g = 4 mL] OU MgSO4 10% [100 mg/mL -> 2g = 20 mL] diluídos em 100 mL de SF 0,9% ou SG 5%).\n" +
      "5. Critérios de Alarme (Via Aérea / UTI):\n" +
      "   • Silêncio respiratório, exaustão, confusão mental ou PaCO₂ normal/elevada (indica falência muscular iminente).",
    "divergencia": "Diferente da DPOC (alvo 88–92% pelo risco de retenção de CO₂), na Asma o alvo mandatório é SpO₂ 93–95% (GINA 2026)."
  },
  "anafilaxia": {
    "titulo": "Anafilaxia e Choque Anafilático",
    "diretriz_brasileira": "ASBAI (Associação Brasileira de Alergia e Imunologia) / CFM",
    "diretriz_internacional": "WAO (World Allergy Organization) 2020 / EAACI",
    "conduta_imediata": "1. Droga de 1ª Linha Mandatória (Imediata / Intramuscular):\n" +
      "   • Adrenalina (Epinefrina) 1:1000 (1 mg/mL) IM no vasto lateral da coxa (face anterolateral). Dose adulto: 0,5 mg (0,5 mL) IM; dose pediátrica: 0,01 mg/kg (máx 0,3 mg) IM. Repetir a cada 5-15 min se refratário. Atenção ISMP: NUNCA usar Adrenalina 1:10.000 (0,1 mg/mL - solução de PCR) para aplicação IM em anafilaxia! Se necessária infusão contínua em choque refratário: 1 ampola 1:1000 (1 mg/1 mL) em 249 mL SG 5% (4 mcg/mL).\n" +
      "2. Posicionamento e Manejo Hemodinâmico:\n" +
      "   • Decúbito dorsal com membros inferiores elevados (Trendelenburg/elevação de pernas). NUNCA colocar o paciente sentado ou em pé subitamente (risco de síndrome da veia cava vazia e parada cardíaca).\n" +
      "   • Oxigenoterapia sob máscara com reservatório (alvo SpO₂ > 95%).\n" +
      "   • Expansão volêmica rápida: SF 0,9% ou Ringer Lactato 20 mL/kg em bolus rápido (adulto: 1.000 a 2.000 mL se hipotensão).\n" +
      "3. Adjuvantes de 2ª Linha (NÃO substituem adrenalina e NÃO devem atrasá-la):\n" +
      "   • Anti-histamínicos: Difenidramina 25-50 mg IV ou Prometazina 25 mg IM/IV (alívio de prurido/urticária).\n" +
      "   • Corticoterapia: Hidrocortisona 200-500 mg IV ou Metilprednisolona 1-2 mg/kg IV (prevenção de reação bifásica tardia).\n" +
      "   • Broncodilatador inalatório (Salbutamol 4-8 jatos) se broncoespasmo associado.",
    "divergencia": "🇧🇷 ASBAI vs 🌐 WAO: A via intramuscular no vasto lateral da coxa é a única via de eleição na anafilaxia inicial (pico sérico em ~8 min vs ~34 min no deltoide/SC). O uso isolado de corticoides ou anti-histamínicos sem adrenalina é falha grave e não previne óbito por asfixia ou colapso circulatório."
  },
  "convulsao": {
    "titulo": "Crise Convulsiva e Estado de Mal Epiléptico (EME)",
    "diretriz_brasileira": "Academia Brasileira de Neurologia (ABN) / Ministério da Saúde",
    "diretriz_internacional": "AES (American Epilepsy Society) Guideline / Neurocritical Care Society",
    "conduta_imediata": "1. Estabilização Imediata (Minutos 0 a 5):\n" +
      "   • Proteção de via aérea (decúbito lateral para prevenir aspiração, oxigênio sob máscara), glicemia capilar imediata (se < 70 mg/dL: 4 ampolas de Glicose 50% IV + Tiamina 100 mg se etilista).\n" +
      "2. 1ª Linha — Benzodiazepínicos (Minutos 5 a 10 se crise > 5 min):\n" +
      "   • Diazepam 10 mg IV lento (0,2 a 0,3 mg/kg, velocidade máx 2-5 mg/min) puro; pode repetir 1x após 5 minutos se mantiver atividade convulsiva.\n" +
      "   • Sem acesso venoso imediato: Midazolam 10 mg IM (0,2 mg/kg, máx 10 mg) no deltoide/vasto lateral.\n" +
      "3. 2ª Linha — Anticonvulsivantes Venosos Não-Sedativos (Minutos 10 a 20):\n" +
      "   • Fenitoína (Hidantal): Dose de ataque 20 mg/kg IV diluída EXCLUSIVAMENTE em Soro Fisiológico 0,9% (precipita em solução glicosada!) na velocidade máxima de 50 mg/min (risco de hipotensão e arritmias ventriculares graves; monitorização com ECG contínuo).\n" +
      "   • Alternativas: Levetiracetam 60 mg/kg IV (máx 4.500 mg) ou Valproato de Sódio 40 mg/kg IV.\n" +
      "4. 3ª Linha — Estado de Mal Refratário (Minutos 20 a 60):\n" +
      "   • Intubação orotraqueal imediata (IOT) + infusão contínua em bomba de Midazolam (0,2 mg/kg bolus + 0,05-2 mg/kg/h) ou Propofol (1-2 mg/kg bolus + 1-5 mg/kg/h) e transferência para UTI.",
    "divergencia": "🇧🇷 ABN/SUS vs 🌐 AES: No SUS, a Fenitoína é a droga de 2ª linha universalmente disponível, exigindo diluição estrita apenas em SF 0,9% e infusão em no máx 50 mg/min. No exterior, Levetiracetam IV e Fosfenitoína são mais utilizados pela comodidade."
  },
  "hda": {
    "titulo": "Hemorragia Digestiva Alta (HDA Varicosa e Não Varicosa)",
    "diretriz_brasileira": "Diretrizes SBH (Sociedade Brasileira de Hepatologia) / FBG (Federação Brasileira de Gastroenterologia)",
    "diretriz_internacional": "Baveno VII / ACG Upper GI Bleeding Guidelines 2021",
    "conduta_imediata": "1. Estabilização e Estratégia Transfusional Restritiva:\n" +
      "   • 2 acessos venosos calibrosos (14G ou 16G), reposição com Ringer Lactato ou SF 0,9% criteriosa para evitar hipervolemia e agravamento do sangramento varicoso.\n" +
      "   • Transfusão restritiva de Concentrado de Hemácias: indicar apenas se Hb < 7 g/dL (alvo Hb 7 a 8 g/dL). Em coronariopatas graves sintomáticos, alvo Hb > 8 g/dL.\n" +
      "2. Supressão Ácida em Alta Dose (Não Varicosa e Indiferenciada):\n" +
      "   • Omeprazol 80 mg IV em bolus, seguido de infusão contínua 8 mg/h por 72 horas (ou 40 mg IV 12/12h).\n" +
      "3. Terapia Vasoativa Precoce na Suspeita de HDA Varicosa (Cirrose / Hipertensão Portal):\n" +
      "   • Terlipressina 2 mg IV bolus 4/4h (ou Octreotide 50 mcg bolus + 50 mcg/h) iniciada imediatamente antes da EDA.\n" +
      "   • Antibioticoprofilaxia mandatória em cirróticos: Ceftriaxona 1 g IV 1x/dia por 7 dias (reduz infecções bacterianas, ressangramento e mortalidade).\n" +
      "4. Endoscopia Digestiva Alta (EDA) Precoce:\n" +
      "   • Realizar EDA diagnóstica e terapêutica em até 12 horas (no máximo 24h) da admissão após estabilização hemodinâmica.",
    "divergencia": "🇧🇷 FBG/SUS vs 🌐 Baveno VII: No Brasil, Ceftriaxona 1 g/dia é a profilaxia de 1ª linha em cirróticos com HDA devido à alta prevalência de resistência a quinolonas no país. A Terlipressina é o vasoconstritor esplâncnico de escolha na hepatologia brasileira e Baveno VII."
  }
};

/**
 * Consulta protocolo clínico estruturado determinístico
 */
function obterProtocoloClinico(termo) {
  if (!termo) return null;
  var texto = String(termo).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  var aliases = {
    sepse: /\b(?:sepse|sepsis|choque septico|infeccao grave)\b/g,
    iam: /\b(?:iam|infarto|sindrome coronariana(?: aguda)?)\b/g,
    eap: /\b(?:eap|edema agudo (?:de )?pulmao|insuficiencia cardiaca descompensada)\b/g,
    cad: /\b(?:cad|cetoacidose(?: diabetica)?)\b/g,
    tep: /\b(?:tep|tromboembolismo pulmonar|embolia pulmonar)\b/g,
    dpoc: /\bdpoc\b/g,
    asma: /\b(?:asma|crise asmatica)\b/g,
    anafilaxia: /\b(?:anafilaxia|choque anafilatico|reacao anafilatica|anafilat\w*)\b/g,
    convulsao: /\b(?:convulsao|crise convulsiva|estado de mal epiletico|epilepsia|status epilepticus)\b/g,
    hda: /\b(?:hda|hemorragia digestiva alta|sangramento digestivo alto|varizes esofagicas sangrantes)\b/g
  };
  // Um protocolo único não representa choques de etiologias diferentes (exceto anafilaxia).
  if (/\b(?:choque (?:hemorragico|cardiogenico|hipovolemico|obstrutivo))\b/.test(texto) && !/\b(?:anafil\w*)\b/.test(texto)) return null;
  var candidatos = [];
  Object.keys(aliases).forEach(function(chave) {
    var matches = Array.from(texto.matchAll(aliases[chave]));
    if (matches.some(function(m) {
      var antes = texto.slice(0, m.index).split(/[.,;!?:\n]|\bmas\b/).pop();
      // Negação, antecedentes e hipótese a excluir não confirmam o cenário.
      return !/\b(?:sem|nega|negou|nao|ausencia|descartar|afastar|suspeita|possivel|hipotese|historico|antecedente)\b/.test(antes);
    })) candidatos.push(chave);
  });
  return candidatos.length === 1 ? PROTOCOLOS_CLINICOS_EMERGENCIA[candidatos[0]] : null;
}
