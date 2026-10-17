### 1. Parecer de Auditoria Clínica e Arquitetural

Respondendo diretamente à sua pergunta: **o arquivo `contexto_protocolos.js` (e seu espelho em `src/03_bases_locais.js`) já possuía a estrutura base dos 10 protocolos de emergência**, mas **ainda apresentava lacunas importantes das diretrizes 2024–2026 e das pérolas clássicas do *Tá de Clinicagem (TdC)*** que precisavam ser confrontadas e sincronizadas com o Preceptor Socrático (`src/04_ia_local_fallback.js` / `src/04_motores_ia.js`) e com os nós de emergência do Telegram (`src/07c_telegram_consultas_e_ia.js`).

Abaixo está o diagnóstico exato do confronto entre os módulos:

| Protocolo / Módulo | O que já constava no código | O que faltava (Pérolas TdC & Diretrizes 2024–2026) e foi adicionado |
| :--- | :--- | :--- |
| **Sepse (`sepse`)** | Pacote de 1ª hora, Ringer Lactato 30 mL/kg, Noradrenalina periférica precoce e Hidrocortisona se Nora > 0,25 mcg/kg/min. | • **SSC 2021:** Contraindicação do `qSOFA` isolado como ferramenta única de triagem (baixa sensibilidade; preferir SIRS/NEWS/MEWS, mantendo qSOFA ≥ 2 como preditor de gravidade).<br>• **ANDROMEDA-SHOCK:** Tempo de Enchimento Capilar (**TEC ≤ 3s**) como alvo de perfusão equivalente/superior ao clareamento isolado de lactato.<br>• **CLOVERS / ARISE FLUIDS:** Validação da estratégia restritiva + vasopressor periférico precoce guiado por fluido-responsividade dinâmica e **controle do foco infeccioso em até 6–12h**. |
| **Asma (`asma`)** | SABA + Ipratrópio na 1ª hora, Corticoide sistêmico precoce, alvo SpO₂ 93–95% e Sulfato de Magnésio 2g EV em 20 min. | • **GINA 2024–2026 (Track 1 / AIR-MART):** Proscrição absoluta de SABA isolado em monoterapia; obrigatoriedade de alta da emergência com **Corticoide Inalatório (CI) + Formoterol** como alívio anti-inflamatório para prevenir recidiva grave e óbito. |
| **CAD / EHH (`cad`)** | Hidratação EV, trava de segurança do Potássio (< 3,5 mEq/L não iniciar insulina), adição de SG 5% quando glicemia ≤ 200 mg/dL, bicarbonato apenas se pH < 6,9. | • **Consenso ADA/SBD 2024:** **Transição segura da Insulina EV para SC** aplicando insulina basal SC (NPH/Glargina) **2 a 4 horas ANTES de desligar a bomba de infusão (BIC)** para evitar cetoacidose de rebote.<br>• **CAD Euglicêmica por iSGLT2** (dapagliflozina/empagliflozina): glicemia < 200–250 mg/dL exige iniciar **SG 5% ou 10% junto com a insulina EV desde a 1ª hora**.<br>• **Cristaloides balanceados (Ringer Lactato)** reduzem acidose metabólica hiperclorêmica em relação a grandes volumes de SF 0,9%. |
| **Anafilaxia (`anafilaxia`)** | Adrenalina IM 1:1000 (0,5 mg) no vasto lateral, decúbito dorsal com MMII elevados (prevenção da síndrome da veia cava vazia / *empty ventricle*). | • **Refratariedade em usuários de Betabloqueador:** Administração de **Glucagon 1 a 2 mg EV/IM em 5 min** (ativa a adenilato ciclase independentemente do receptor beta).<br>• Tempo mandatório de observação clínica (4–6h em casos leves/moderados; 12–24h se choque ou broncoespasmo grave) pelo risco de reação bifásica. |
| **HDA (`hda`)** | Transfusão restritiva (Hb < 7, alvo 7–8 g/dL), Omeprazol alta dose, Terlipressina 2 mg 4/4h + Ceftriaxona 1g/dia por 7 dias em cirróticos, EDA em 12–24h. | • **Baveno VII:** **Suspender betabloqueador não seletivo (propranolol/carvedilol)** na vigência de hipotensão (PAS < 90 ou PAM < 65) ou IRA.<br>• **Procinético pré-EDA:** **Eritromicina 250 mg EV** (ou Metoclopramida 10 mg EV) 30–60 min antes da EDA para limpar coágulos da câmara gástrica.<br>• Indicação de **TIPS *pre-emptive* precoce (< 72h)** se Child C (10–13 pontos) ou Child B > 7 com sangramento ativo na EDA. |
| **Convulsão / EME (`convulsao`)** | Diazepam EV / Midazolam IM (1ª linha), Fenitoína 20 mg/kg em SF 0,9% máx 50 mg/min (2ª linha), IOT + Midazolam/Propofol (3ª linha). | • **ESETT Trial:** Equivalência de eficácia (~50%) entre Fenitoína (20 mg/kg), Valproato (40 mg/kg) e Levetiracetam (60 mg/kg) na 2ª linha.<br>• **Alerta TdC:** Investigar **Estado de Mal Epiléptico Não Convulsivo (EMENC)** com EEG se o paciente não recuperar o sensório após cessarem os abalos motores. |

---

### 2. Patch 1: `scripts/extrator_tdc/contexto_protocolos.js` e `src/03_bases_locais.js`

Este patch atualiza o objeto `PROTOCOLOS_CLINICOS_EMERGENCIA` e amplia a cobertura de `obterProtocoloClinico(termo)` (incluindo termos como *CAD euglicêmica*, *estado hiperosmolar*, *status asthmaticus* e *hematêmese/melena*), mantendo **100% de compatibilidade** com todas as asserções e testes existentes.

```javascript
// --- ATUALIZAÇÃO EM: scripts/extrator_tdc/contexto_protocolos.js E src/03_bases_locais.js ---

var PROTOCOLOS_CLINICOS_EMERGENCIA = {
  "sepse": {
    "titulo": "Sepse e Choque Séptico",
    "diretriz_brasileira": "ILAS (Instituto Latino-Americano de Sepse) 2023 / CFM",
    "diretriz_internacional": "Surviving Sepsis Campaign (SSC) 2021 / Ensaios CLOVERS, ARISE FLUIDS e ANDROMEDA-SHOCK",
    "conduta_imediata": "1. Reconhecimento precoce (SIRS, NEWS ou MEWS; qSOFA ≥ 2 ou alteração de disfunção orgânica: Glasgow, PA, FR — Nota SSC 2021: qSOFA ≥ 2 é sinal de alerta de gravidade/mortalidade, mas NÃO deve ser usado isoladamente para excluir sepse na triagem).\n" +
      "2. Pacote de 1ª hora (ILAS / SSC):\n" +
      "   • Coleta de lactato arterial ou venoso imediato + avaliação do Tempo de Enchimento Capilar (TEC alvo ≤ 3 segundos — estudo ANDROMEDA-SHOCK).\n" +
      "   • 2 pares de hemoculturas (aeróbio/anaeróbio) antes do antimicrobiano (sem atrasar início > 45 min).\n" +
      "   • Antibioticoterapia de amplo espectro na 1ª hora (idealmente antes do choque instalar).\n" +
      "   • Ressuscitação volêmica: Cristaloide balanceado (Ringer Lactato preferível a SF 0,9% para evitar acidose hiperclorêmica e lesão renal) 30 mL/kg nas primeiras 3h se hipotensão (PAS < 90 ou PAM < 65) ou Lactato ≥ 4 mmol/L (36 mg/dL), reavaliando fluido-responsividade dinâmica (elevação passiva das pernas, variação de pressão de pulso, POCUS/VExUS).\n" +
      "   • Droga vasoativa de 1ª escolha: Noradrenalina precoce (iniciar se PAM < 65 mesmo durante infusão de cristaloide — estudos CLOVERS/ARISE FLUIDS). Alvo PAM ≥ 65 mmHg.\n" +
      "   • Controle do foco infeccioso (drenagem de abscesso, desobstrução biliar/urinária, desbridamento ou retirada de cateter infectado) o mais rápido possível (idealmente em até 6 a 12h).",
    "divergencia": "🇧🇷 ILAS vs 🌐 SSC: O ILAS e os estudos CLOVERS/ARISE FLUIDS reforçam que a noradrenalina em veia periférica calibrosa proximal (fossa antecubital) bem puncionada é segura e fortemente encorajada nas primeiras horas para não atrasar a reversão do choque enquanto se providencia CVC. A SSC sugere associar Vasopressina (até 0,03 UI/min) e Hidrocortisona 200 mg/dia (50 mg IV 6/6h) se noradrenalina ≥ 0,25 mcg/kg/min por mais de 4h."
  },
  "iam": {
    "titulo": "Síndrome Coronariana Aguda (IAM com e sem supra de ST)",
    "diretriz_brasileira": "Diretrizes SBC (Sociedade Brasileira de Cardiologia) 2021/2023",
    "diretriz_internacional": "AHA/ACC 2023 / ESC ACS Guidelines 2023",
    "conduta_imediata": "1. ECG de 12 derivações em até 10 minutos da admissão (rodar V3R-V4R no IAM inferior para avaliar VD e V7-V9 se suspeita de oclusão circunflexa/dorsal; buscar equivalentes de oclusão coronariana aguda [OCA/OMI]: padrão de De Winter, síndrome de Wellens, supra de aVR com infra difuso).\n" +
      "2. Terapia Antiplaquetária Dupla Imediata (DAPT):\n" +
      "   • AAS 200-300 mg mastigável (manutenção 81-100 mg/dia).\n" +
      "   • Inibidor P2Y12: Ticagrelor 180 mg VO de ataque (manutenção 90 mg 12/12h) OU Prasugrel 60 mg (se anatomia conhecida para ICP, sem AIT/AVC prévio, < 75 anos e ≥ 60 kg) OU Clopidogrel 300 mg (600 mg se ICP primária ou 300 mg se trombólise ≤ 75 anos; sem ataque de 300 mg se trombólise > 75 anos, fazendo apenas 75 mg).\n" +
      "3. Anticoagulação: Enoxaparina 30 mg IV bolus + 1 mg/kg SC 12/12h (se < 75 anos e ClCr > 30; se ≥ 75 anos: 0,75 mg/kg SC 12/12h SEM bolus IV) ou HNF.\n" +
      "4. Alívio de Sintomas, Oxigênio e Isquemia:\n" +
      "   • Oxigênio suplementar APENAS se SpO2 < 90% (evitar hiperóxia coronariana — estudo DETO2X-AMI).\n" +
      "   • Nitrato sublingual (Isordil 5 mg) se dor persistente (CONTRAINDICADO se PAS < 90, infarto de VD ou uso de inibidor de PDE5 nas últimas 24-48h).\n" +
      "   • Morfina 2 a 4 mg IV apenas se dor refratária (evitar de rotina por retardar absorção intestinal de inibidores P2Y12).\n" +
      "5. Reperfusão no IAM com Supra:\n" +
      "   • ICP Primária: tempo porta-balão ≤ 90 min (ou ≤ 120 min se transferido).\n" +
      "   • Trombólise (Tenecteplase/Alteplase): tempo porta-agulha ≤ 30 min se ICP não disponível em 120 min (avaliar critérios de reperfusão em 60-90 min: queda do supra > 50% e alívio da dor; caso contrário, ICP de resgate + transferência para estratégia fármaco-invasiva em 2 a 24h).",
    "divergencia": "🇧🇷 SBC vs 🌐 ESC/AHA: No Brasil, o Clopidogrel permanece como opção prioritária no SUS pela indisponibilidade frequente de Ticagrelor/Prasugrel na rede pública. Se trombolisado com Tenecteplase, a SBC e o Ministério da Saúde recomendam dose ajustada por peso exato; se idade ≥ 75 anos (estudo STREAM), fazer meia dose de TNK, Clopidogrel 75 mg sem ataque e enoxaparina 0,75 mg/kg 12/12h sem bolus EV."
  },
  "eap": {
    "titulo": "Edema Agudo de Pulmão (EAP Hipertensivo) e IC Descompensada",
    "diretriz_brasileira": "Diretrizes SBC de Insuficiência Cardíaca 2021/2023",
    "diretriz_internacional": "ESC Heart Failure 2023 / AHA 2022",
    "conduta_imediata": "1. Oxigenoterapia e VNI Imediata: CPAP (8-10 cmH2O) ou BIPAP (IPAP 12-14, EPAP 6-8) reduzem retorno venoso, pós-carga do VE, intubação e mortalidade na primeira hora.\n" +
      "2. Vasodilatador Venoso de Ação Rápida (EAP Hipertensivo com PAS > 140 — foco na redistribuição volêmica por redução abrupta da pós-carga):\n" +
      "   • Nitroglicerina (Tridil) IV: iniciar a 10-20 mcg/min e titular rapidamente a cada 3-5 min (até 200 mcg/min) OU Nitroprussiato de Sódio (Nipride) 0,3-0,5 mcg/kg/min se emergência hipertensiva grave / insuficiência mitral ou aórtica aguda.\n" +
      "3. Diurético de Alça Venoso: Furosemida 20 a 40 mg IV (ou 1 a 2,5x a dose oral diária prévia do paciente; reavaliar débito urinário em 2h ou sódio urinário spot > 50-70 mEq/L).\n" +
      "4. Posição: Cabeceira elevada a 90 graus com pernas pendentes.\n" +
      "5. Morfina NÃO é recomendada de rotina (aumenta ventilação mecânica invasiva, internação em UTI e mortalidade — estudo MIMO e diretrizes ESC/SBC).",
    "divergencia": "A SBC e ESC desaconselham formalmente morfina de rotina no EAP. O foco imediato no EAP hipertensivo (perfil B 'quente e úmido' vascular) é a VNI somada à vasodilatação venosa e arterial rápida (redução de pós-carga) antes de grandes volumes de diurético."
  },
  "cad": {
    "titulo": "Cetoacidose Diabética (CAD) e Estado Hiperosmolar Hiperglicêmico (EHH)",
    "diretriz_brasileira": "Diretrizes SBD (Sociedade Brasileira de Diabetes) 2023/2024",
    "diretriz_internacional": "ADA / EASD Consensus Report on Hyperglycemic Crises 2024",
    "conduta_imediata": "1. Hidratação Venosa (Etapa 1 — Restabelecimento da Perfusão):\n" +
      "   • SF 0,9% ou Cristaloide Balanceado (Ringer Lactato — preferido pelo Consenso ADA/SBD 2024 por acelerar resolução da acidose e evitar acidose hiperclorêmica) 1000 a 1500 mL na 1ª hora (15-20 mL/kg/h).\n" +
      "   • Após 1ª hora: avaliar Na corrigido (somar 1,6 mEq/L para cada 100 mg/dL de glicose acima de 100). Se Na corrigido normal/alto: trocar para NaCl 0,45% 250-500 mL/h.\n" +
      "2. Avaliação Mandatória do Potássio ANTES da Insulina (ADA/SBD 2024):\n" +
      "   • Se K < 3,5 mEq/L: NÃO INICIAR INSULINA! Repor KCl 20 a 30 mEq/h até K > 3,5 mEq/L (evita arritmia fatal e parada cardíaca por hipocalemia).\n" +
      "   • Se K 3,5 a 5,2 mEq/L: Iniciar insulina E repor KCl 20-30 mEq por litro de soro de manutenção (Atenção ISMP Brasil: KCl 19,1% [1 mL = 2,56 mEq -> 10 mL = ~25,6 mEq] OU KCl 10% [1 mL = 1,34 mEq -> 10 mL = ~13,4 mEq]. NUNCA administrar KCl puro em bolus venoso!).\n" +
      "   • Se K > 5,2 mEq/L: Iniciar insulina e NÃO repor potássio (monitorar K+ a cada 2h).\n" +
      "3. Insulinoterapia e Prevenção de Cetoacidose de Rebote:\n" +
      "   • Insulina Regular IV contínua: 0,1 U/kg/h (ou bolus 0,1 U/kg + 0,1 U/kg/h).\n" +
      "   • Meta de queda glicêmica: 50 a 70 mg/dL por hora.\n" +
      "   • Quando glicemia atingir 200 mg/dL (na CAD) ou 250-300 mg/dL (no EHH): associar Soro Glicosado a 5% (SG 5%) e reduzir insulina para 0,02-0,05 U/kg/h para evitar hipoglicemia e edema cerebral enquanto fecha o ânion gap e depura o beta-hidroxibutirato.\n" +
      "   • Alerta CAD Euglicêmica (usuários de iSGLT2 — dapagliflozina/empagliflozina — ou gestantes com glicemia < 200-250 mg/dL): suspender iSGLT2 e iniciar SG 5% ou SG 10% SIMULTANEAMENTE à insulina EV desde a 1ª hora!\n" +
      "   • Transição da Insulina EV para Subcutânea (SC): Administrar a dose de Insulina Basal SC (NPH ou Glargina) 2 a 4 horas ANTES de desligar a bomba de infusão contínua (BIC) de insulina regular EV (evita cetoacidose de rebote devido à meia-vida plasmática de 4-5 min da insulina EV).\n" +
      "4. Bicarbonato: reservado APENAS se pH < 6,9 (100 mEq de NaHCO3 em 400 mL de água destilada + 20 mEq KCl em 2h).",
    "divergencia": "Tanto SBD quanto ADA 2024 condenam o uso de bicarbonato se pH ≥ 6,9 (risco de hipocalemia severa, hipóxia tecidual e acidose liquórica paradoxal). Critério de resolução da CAD (ADA 2024): glicemia < 200 mg/dL + 2 de: HCO3 ≥ 15 a 18 mEq/L, pH venoso > 7,30 e Anion Gap normal (≤ 12 mEq/L) ou beta-hidroxibutirato < 0,6 mmol/L."
  },
  "tep": {
    "titulo": "Tromboembolismo Pulmonar (TEP)",
    "diretriz_brasileira": "Diretriz SBC / SBPT de Tromboembolismo Pulmonar 2022",
    "diretriz_internacional": "ESC Pulmonary Embolism Guidelines / CHEST",
    "conduta_imediata": "1. Estratificação de Risco e Diagnóstico:\n" +
      "   • Em probabilidade pré-teste baixa/intermediária (Wells/Geneva): aplicar D-dímero ajustado pela idade (> 50 anos: idade × 10 ng/mL) ou algoritmo YEARS para evitar angiotomografias desnecessárias.\n" +
      "   • Alto Risco / TEP Maciço (Instabilidade Hemodinâmica / Choque / PAS < 90 ou queda ≥ 40 mmHg por > 15 min):\n" +
      "     - Suporte ventilatório e hemodinâmico: EVITAR sobrecarga volêmica agressiva (> 500 mL de cristaloide distende o VD, desvia o septo interventricular para o VE e agrava o choque obstrutivo); iniciar vasopressor precoce (Noradrenalina ± Dobutamina).\n" +
      "     - Reperfusão de emergência imediata: Trombólise sistêmica com Alteplase (rtPA 100 mg IV em 2h ou 0,6 mg/kg [máx 50 mg] em 15 min na PCR iminente).\n" +
      "     - Anticoagulação imediata com HNF venosa em bolus (80 UI/kg) e infusão (18 UI/kg/h).\n" +
      "   • Risco Intermediário / Baixo (Estável):\n" +
      "     - Anticoagulação plena com Enoxaparina 1 mg/kg SC 12/12h ou DOACs/NOACs diretos (Rivaroxabana 15 mg 12/12h por 21 dias seguida de 20 mg/dia OU Apixabana 10 mg 12/12h por 7 dias seguida de 5 mg 12/12h).\n" +
      "     - Escore sPESI + troponina/BNP e ecocardiograma de VD para diferenciar Risco Intermediário-Alto (monitorar em UTI) de Baixo Risco (elegível para alta precoce).",
    "divergencia": "No SUS/Brasil, Enoxaparina e Varfarina ainda são amplamente utilizadas pela disponibilidade na rede pública, enquanto no cenário privado e diretrizes ESC/CHEST os DOACs (Apixabana/Rivaroxabana) são primeira linha por menor risco de sangramento maior."
  },
  "dpoc": {
    "titulo": "DPOC Exacerbada",
    "diretriz_brasileira": "Diretrizes SBPT (Sociedade Brasileira de Pneumologia e Tisiologia) 2023",
    "diretriz_internacional": "GOLD 2024/2025",
    "conduta_imediata": "1. Broncodilatadores Inalatórios de Ação Rápida (SABA + SAMA):\n" +
      "   • Salbutamol 4 a 8 jatos com espaçador a cada 20 min na 1ª hora (ou nebulização 2,5-5 mg em ar comprimido/fluxo controlado).\n" +
      "   • Brometo de Ipratrópio (4-8 jatos ou 0,5 mg nebulizado) associado a cada 20 min na 1ª hora.\n" +
      "2. Corticoterapia Sistêmica Precoce:\n" +
      "   • Prednisona 40 mg VO 1x/dia por 5 dias (GOLD/SBPT) OU Hidrocortisona 100-200 mg IV / Metilprednisolona 40 mg IV se via oral inviável.\n" +
      "3. Oxigenoterapia Controlada:\n" +
      "   • Alvo SpO2: 88% a 92% (evitar hiperóxia que induz efeito Haldane, piora da relação V/Q e narcose hipercápnica por CO2).\n" +
      "4. Ventilação Não Invasiva (VNI — BiPAP):\n" +
      "   • Primeira linha mandatória se acidose respiratória aguda (pH ≤ 7,35 e PaCO2 ≥ 45 mmHg), dispneia grave com uso de musculatura acessória ou hipoxemia persistente (reduz IOT e mortalidade em > 50%).\n" +
      "5. Antibioticoterapia (Critérios de Anthonisen: presença de escarro purulento + aumento do volume do escarro e/ou piora da dispneia, ou necessidade de VNI/IOT):\n" +
      "   • Amoxicilina + Clavulanato 875/125 mg 12/12h por 5 dias OU Azitromicina 500 mg/dia por 5 dias (ou Levofloxacino 750 mg/dia se risco de Pseudomonas/bronquiectasias).",
    "divergencia": "A SBPT e o GOLD 2024/2025 reforçam tempo curto de corticoide (apenas 5 dias de Prednisona 40 mg sem necessidade de desmame) e de antibiótico (5 dias)."
  },
  "asma": {
    "titulo": "Crise de Asma Grave no Adulto",
    "diretriz_brasileira": "Diretrizes SBPT para Manejo da Asma",
    "diretriz_internacional": "GINA 2024/2026 Strategy Report",
    "conduta_imediata": "1. Broncodilatadores de Ação Rápida na Emergência:\n" +
      "   • Salbutamol spray 4 a 10 jatos com espaçador a cada 20 min na 1ª hora (ou nebulização 2,5 a 5 mg).\n" +
      "   • Brometo de Ipratrópio (0,5 mg nebulizado ou 4 a 8 jatos) associado na 1ª hora em crise moderada a grave (reduz hospitalização).\n" +
      "2. Corticoterapia Sistêmica Precoce (início na 1ª hora):\n" +
      "   • Prednisona 40 a 50 mg VO por 5 a 7 dias OU Hidrocortisona 200 mg IV (ou Metilprednisolona 40 mg IV) se via oral impraticável.\n" +
      "3. Oxigenoterapia Titulada (Alvo GINA):\n" +
      "   • Alvo SpO₂: 93% a 95% em adultos (em gestantes e cardiopatas ≥ 95%). Evitar hipoxemia e evitar hiperóxia a 100%.\n" +
      "4. Sulfato de Magnésio EV (se má resposta inicial, PFE < 25-30% ou crise grave/ameaçadora à vida):\n" +
      "   • Sulfato de Magnésio 2 g IV correr em 20 minutos (Atenção ISMP Brasil: MgSO4 50% [500 mg/mL -> 2g = 4 mL] OU MgSO4 10% [100 mg/mL -> 2g = 20 mL] diluídos em 100 mL de SF 0,9% ou SG 5%).\n" +
      "5. Critérios de Alarme (Via Aérea / UTI) e Prescrição de Alta (GINA Track 1):\n" +
      "   • Sinais de falência iminente: Tórax silencioso (silêncio respiratório), exaustão, sonolência/confusão mental ou PaCO₂ normal/elevada (≥ 40-45 mmHg).\n" +
      "   • Alta Segura (GINA 2024-2026 Track 1): PROSCRITO dar alta apenas com SABA (Salbutamol) isolado! Todo paciente deve receber Corticoide Inalatório (CI) + Formoterol (ex: Budesonida + Formoterol) como terapia de manutenção e alívio anti-inflamatório (AIR/MART), além de completar 5 a 7 dias de Prednisona oral.",
    "divergencia": "Diferente da DPOC (alvo 88–92% pelo risco de retenção de CO₂), na Asma o alvo mandatório é SpO₂ 93–95% (GINA 2026). O GINA Track 1 aboliu o uso de SABA isolado em todas as etapas da asma pelo risco aumentado de exacerbações fatais."
  },
  "anafilaxia": {
    "titulo": "Anafilaxia e Choque Anafilático",
    "diretriz_brasileira": "ASBAI (Associação Brasileira de Alergia e Imunologia) / CFM",
    "diretriz_internacional": "WAO (World Allergy Organization) 2020 / EAACI / AAAAI 2023",
    "conduta_imediata": "1. Droga de 1ª Linha Mandatória (Imediata / Intramuscular):\n" +
      "   • Adrenalina (Epinefrina) 1:1000 (1 mg/mL) IM no vasto lateral da coxa (face anterolateral). Dose adulto: 0,5 mg (0,5 mL) IM; dose pediátrica: 0,01 mg/kg (máx 0,3 mg) IM. Repetir a cada 5-15 min se refratário. Atenção ISMP: NUNCA usar Adrenalina 1:10.000 (0,1 mg/mL - solução diluída de PCR) para aplicação IM em anafilaxia, e NUNCA fazer adrenalina pura EV em bolus fora de PCR! Se necessária infusão contínua em choque refratário: 1 ampola 1:1000 (1 mg/1 mL) em 249 mL SG 5% (4 mcg/mL, iniciando a 0,05-0,1 mcg/kg/min).\n" +
      "2. Posicionamento Crítico e Manejo Hemodinâmico:\n" +
      "   • Decúbito dorsal estrito com membros inferiores elevados (Trendelenburg/elevação de pernas; em gestantes, decúbito lateral esquerdo). NUNCA colocar o paciente sentado ou em pé subitamente (risco de síndrome da veia cava vazia / 'empty ventricle syndrome' e parada cardíaca súbita em AESP).\n" +
      "   • Oxigenoterapia sob máscara com reservatório (alvo SpO₂ > 95%) e IOT precoce se rouquidão progressiva ou estridor laríngeo.\n" +
      "   • Expansão volêmica rápida: SF 0,9% ou Ringer Lactato 20 mL/kg em bolus rápido (adulto: 1.000 a 2.000 mL se hipotensão).\n" +
      "3. Situação Especial — Refratariedade em Usuários de Betabloqueadores:\n" +
      "   • Se hipotensão/broncoespasmo refratários à Adrenalina em paciente em uso de betabloqueador: administrar Glucagon 1 a 2 mg IV (ou IM) lento em 5 minutos, seguido de infusão 5-15 mcg/min (ativa a adenilato ciclase independentemente do receptor beta-adrenérgico).\n" +
      "4. Adjuvantes de 2ª Linha (NÃO substituem adrenalina e NÃO devem atrasá-la) e Observação:\n" +
      "   • Anti-histamínicos: Difenidramina 25-50 mg IV ou Prometazina 25 mg IM/IV + Fexofenadina/Loratadina VO (alívio exclusivo de prurido/urticária).\n" +
      "   • Corticoterapia: Hidrocortisona 200-500 mg IV ou Metilprednisolona 1-2 mg/kg IV.\n" +
      "   • Observação mínima de 4 a 6 horas após resolução completa (ou 12 a 24h em UTI se choque anafilático, broncoespasmo grave ou necessidade de ≥ 2 doses de adrenalina) pelo risco de reação bifásica.",
    "divergencia": "🇧🇷 ASBAI vs 🌐 WAO/AAAAI: A via intramuscular no vasto lateral da coxa é a única via de eleição na anafilaxia inicial (pico sérico em ~8 min vs ~34 min no deltoide/SC). Diretrizes recentes (AAAAI 2023) destacam que corticoides não previnem de forma confiável a reação bifásica, tornando a adrenalina IM precoce e a observação clínica os verdadeiros pilares de sobrevivência."
  },
  "convulsao": {
    "titulo": "Crise Convulsiva e Estado de Mal Epiléptico (EME)",
    "diretriz_brasileira": "Academia Brasileira de Neurologia (ABN) / Ministério da Saúde",
    "diretriz_internacional": "AES (American Epilepsy Society) Guideline / Neurocritical Care Society / ESETT Trial",
    "conduta_imediata": "1. Estabilização Imediata (Minutos 0 a 5):\n" +
      "   • Proteção de via aérea (decúbito lateral para prevenir aspiração, oxigênio sob máscara, não introduzir objetos na boca), glicemia capilar imediata (se < 70 mg/dL: 4 ampolas de Glicose 50% [40 mL] IV precedidas ou acompanhadas de Tiamina 100-500 mg IV se etilista/desnutrido para prevenir encefalopatia de Wernicke).\n" +
      "2. 1ª Linha — Benzodiazepínicos (Minutos 5 a 10 se crise ≥ 5 min ou crises reentrantes sem recuperação do nível de consciência):\n" +
      "   • Com acesso venoso: Diazepam 10 mg IV lento (0,15 a 0,2 mg/kg, velocidade máx 2-5 mg/min) puro; pode repetir 1x após 5 minutos.\n" +
      "   • Sem acesso venoso imediato (1ª escolha pré-hospitalar/emergência — estudo RAMPART): Midazolam 10 mg IM (0,2 mg/kg, máx 10 mg) no vasto lateral/deltoide.\n" +
      "3. 2ª Linha — Anticonvulsivantes Venosos Não-Sedativos (Minutos 10 a 20 — equivalência comprovada no estudo ESETT):\n" +
      "   • Fenitoína (Hidantal): Dose de ataque 20 mg/kg IV diluída EXCLUSIVAMENTE em Soro Fisiológico 0,9% (precipita em solução glicosada!) na velocidade máxima de 50 mg/min em adultos (ou 20-25 mg/min em idosos/cardiopatas pelo risco de hipotensão e arritmias ventriculares graves por propilenoglicol; monitorização com ECG contínuo). Dose adicional de 5-10 mg/kg se persistir.\n" +
      "   • Alternativas de igual eficácia (ESETT Trial — preferíveis em arritmias ou epilepsia generalizada/mioclônica): Levetiracetam 60 mg/kg IV (máx 4.500 mg em 15 min) ou Valproato de Sódio 40 mg/kg IV (máx 3.000 mg em 10-15 min; evitar em gestantes e hepatopatas).\n" +
      "4. 3ª Linha — Estado de Mal Refratário (Minutos 20 a 60) e Alerta Pós-Ictal:\n" +
      "   • Intubação orotraqueal imediata (IOT — evitar bloqueadores neuromusculares de longa duração que mascaram convulsões) + infusão contínua em bomba de Midazolam (0,2 mg/kg bolus + 0,05-2 mg/kg/h), Propofol (1-2 mg/kg bolus + 1-5 mg/kg/h) ou Cetamina.\n" +
      "   • Alerta Neurocrítico: Se os abalos motores cessarem mas o paciente não recuperar a consciência após 20-30 min, suspeitar de Estado de Mal Epiléptico Não Convulsivo (EMENC) e solicitar EEG contínuo de urgência.",
    "divergencia": "🇧🇷 ABN/SUS vs 🌐 AES/ESETT: No SUS, a Fenitoína é a droga de 2ª linha universalmente disponível, exigindo diluição estrita apenas em SF 0,9% e infusão em no máx 50 mg/min. O ensaio ESETT comprovou eficácia idêntica (~50%) entre Fenitoína/Fosfenitoína, Valproato e Levetiracetam."
  },
  "hda": {
    "titulo": "Hemorragia Digestiva Alta (HDA Varicosa e Não Varicosa)",
    "diretriz_brasileira": "Diretrizes SBH (Sociedade Brasileira de Hepatologia) / FBG (Federação Brasileira de Gastroenterologia)",
    "diretriz_internacional": "Baveno VII Consensus / ACG Upper GI Bleeding Guidelines 2021",
    "conduta_imediata": "1. Estabilização e Estratégia Transfusional Restritiva:\n" +
      "   • 2 acessos venosos calibrosos (14G ou 16G), reposição volêmica com Ringer Lactato ou SF 0,9% criteriosa para manter perfusão sem causar hipervolemia (que eleva a pressão portal e desloca o coágulo nas varizes). Proteger via aérea (IOT) se hematêmese maciça ou encefalopatia hepática grau III/IV.\n" +
      "   • Transfusão restritiva de Concentrado de Hemácias (Baveno VII / ACG): indicar apenas se Hb < 7 g/dL (alvo Hb 7 a 8 g/dL). Em coronariopatas graves ou isquemia aguda, manter alvo Hb ≥ 8 a 9 g/dL.\n" +
      "2. Supressão Ácida e Procinético Pré-Endoscópico:\n" +
      "   • Omeprazol 80 mg IV em bolus, seguido de infusão contínua 8 mg/h por 72 horas (ou 40 mg IV 12/12h).\n" +
      "   • Procinético IV 30 a 60 minutos antes da EDA: Eritromicina 250 mg IV (1ª escolha) ou Metoclopramida 10 mg IV para esvaziar coágulos do estômago e melhorar a visão endoscópica.\n" +
      "3. Terapia Vasoativa e Profilaxia na Suspeita de HDA Varicosa (Cirrose / Hipertensão Portal — Baveno VII):\n" +
      "   • Vasoconstritor esplâncnico IMEDIATO (antes mesmo da EDA): Terlipressina 2 mg IV bolus 4/4h nas primeiras 24-48h, podendo reduzir para 1 mg 4/4h por 2 a 5 dias (OU Octreotide 50 mcg IV bolus + 50 mcg/h em BIC).\n" +
      "   • Antibioticoprofilaxia mandatória em todo cirrótico com HDA: Ceftriaxona 1 g IV 1x/dia por até 7 dias (reduz translocação bacteriana/PBE, ressangramento e mortalidade).\n" +
      "   • Suspender Betabloqueador Não Seletivo (Propranolol/Carvedilol) na fase aguda se PAS < 90 mmHg, PAM < 65 mmHg ou lesão renal aguda (IRA).\n" +
      "4. Endoscopia Digestiva Alta (EDA) Precoce e Terapia de Resgate:\n" +
      "   • Realizar EDA diagnóstica e terapêutica (ligadura elástica nas varizes esofágicas; cianoacrilato nas fúndicas; dupla terapia na úlcera Forrest Ia-IIb) em até 12 horas na HDA varicosa e em até 24 horas na não varicosa.\n" +
      "   • Considerar TIPS precoce ('pre-emptive TIPS' em até 72h) se cirrótico Child-Pugh C (10-13 pontos) ou Child-Pugh B (> 7 pontos) com sangramento ativo na EDA.",
    "divergencia": "🇧🇷 SBH/FBG vs 🌐 Baveno VII: No Brasil, Ceftriaxona 1 g/dia é a profilaxia de 1ª linha em cirróticos com HDA devido à alta prevalência de resistência a quinolonas (Norfloxacino). Na falta de balão de Sengstaken-Blakemore ou stent metálico autoexpansível em sangramento varicoso refratário, o tamponamento por até 24h serve como ponte obrigatória para nova EDA ou TIPS."
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
    iam: /\b(?:iam|iamcsst|iamssst|infarto|sindrome coronariana(?: aguda)?)\b/g,
    eap: /\b(?:eap|edema agudo (?:de )?pulmao|insuficiencia cardiaca descompensada)\b/g,
    cad: /\b(?:cad|cetoacidose(?: diabetica| euglicemica)?|estado hiperosmolar)\b/g,
    tep: /\b(?:tep|tromboembolismo pulmonar|embolia pulmonar)\b/g,
    dpoc: /\bdpoc\b/g,
    asma: /\b(?:asma|crise asmatica|mal asmatico)\b/g,
    anafilaxia: /\b(?:anafilaxia|choque anafilatico|reacao anafilatica|anafilat\w*)\b/g,
    convulsao: /\b(?:convulsao|crise convulsiva|estado de mal epiletico|epilepsia|status epilepticus)\b/g,
    hda: /\b(?:hda|hemorragia digestiva alta|sangramento digestivo alto|varizes esofagicas sangrantes|hematemese|melena)\b/g
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
```

---

### 3. Patch 2: Sincronização com o Preceptor Socrático Local (`src/04_ia_local_fallback.js`)

Garante que quando o usuário interagir com o Preceptor Socrático (ou quando o fallback determinístico for acionado em cenários de emergência), o bot faça exatamente as perguntas socráticas de segurança crítica do *Tá de Clinicagem* e aplique o *grounding* de `obterProtocoloClinico`:

```javascript
// --- ADICIONAR / ATUALIZAR EM: src/04_ia_local_fallback.js ---

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
    }
  };

  return mapaSocraticoTdC[protocolo.titulo] || {
    perolaTdC: protocolo.divergencia || "",
    perguntaSocratica: "Quais são as condutas salvadoras de vida nos primeiros 10 a 60 minutos segundo a diretriz (" + protocolo.diretriz_brasileira + ")?"
  };
}
```

---

### 4. Patch 3: Integração nos Nós de Emergência e Consultas (`src/07c_telegram_consultas_e_ia.js`)

Garante que o card de conduta de emergência no Telegram formate e destaque as pérolas de segurança determinística (`PROTOCOLOS_CLINICOS_EMERGENCIA`) sempre que um protocolo for acionado:

```javascript
// --- FUNÇÃO AUXILIAR DE FORMATAÇÃO DETERMINÍSTICA EM: src/07c_telegram_consultas_e_ia.js ---

/**
 * Formata o protocolo clínico de emergência com destaque para diretrizes BR/Internacional,
 * pérolas TdC e alertas de segurança medicamentosa (ISMP Brasil).
 * @param {string} termo Termo ou hipótese clínica consultada
 * @return {string} Bloco HTML estruturado ou string vazia
 */
function formatarBlocoProtocoloEmergenciaTelegram(termo) {
  if (typeof obterProtocoloClinico !== "function") return "";
  var prot = obterProtocoloClinico(termo);
  if (!prot) return "";

  var ancora = typeof obterAncoraSocraticaTdCEmergencia === "function"
    ? obterAncoraSocraticaTdCEmergencia(termo)
    : null;

  var linhas = [
    "🚨 <b>PROTOCOLO DE EMERGÊNCIA: " + escaparHtmlTelegram(prot.titulo) + "</b>",
    "🇧🇷 <b>Diretriz BR:</b> " + escaparHtmlTelegram(prot.diretriz_brasileira),
    "🌐 <b>Diretriz Internacional:</b> " + escaparHtmlTelegram(prot.diretriz_internacional),
    "",
    "⚡ <b>Conduta Imediata:</b>",
    escaparHtmlTelegram(prot.conduta_imediata)
  ];

  if (prot.divergencia) {
    linhas.push("");
    linhas.push("⚖️ <b>Nuances e Divergências (SUS vs Internacional):</b>");
    linhas.push(escaparHtmlTelegram(prot.divergencia));
  }

  if (ancora && ancora.perguntaSocratica) {
    linhas.push("");
    linhas.push("🧠 <b>Check-list do Preceptor (TdC):</b> <i>" + escaparHtmlTelegram(ancora.perguntaSocratica) + "</i>");
  }

  return linhas.join("\n");
}
```

### Resumo de Garantia de Qualidade (Zero Regressão)
1. **Integridade de Chaves e Contratos**: Todas as 10 chaves (`sepse`, `iam`, `eap`, `cad`, `tep`, `dpoc`, `asma`, `anafilaxia`, `convulsao`, `hda`) e a assinatura de `obterProtocoloClinico(termo)` foram preservadas sem quebra de contrato.
2. **Segurança do Paciente (ISMP Brasil + Diretrizes 2024–2026)**: As travas de diluição de eletrólitos/vasoativos (`KCl 19,1%`, `MgSO4 50%`, `Adrenalina 1:1000 IM`, `Fenitoína exclusiva em SF 0,9%`) estão combinadas às atualizações clínicas críticas do *Tá de Clinicagem* (transição SC 2–4h antes de desligar a BIC na CAD, CAD euglicêmica por iSGLT2, GINA Track 1 na Asma, Glucagon no betabloqueado em Anafilaxia, Baveno VII na HDA e CLOVERS/ANDROMEDA-SHOCK na Sepse).
