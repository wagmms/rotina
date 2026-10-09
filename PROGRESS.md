### STATUS: REVISAO_OTIMIZACAO_E_ESTABILIZACAO_EXCLUSIVA

# 🛠️ Ultra Rotina — Revisão, Otimização e Estabilização para Interno/Médico Generalista

**DIRETIVA ABSOLUTA DO USUÁRIO**:
1. **Foco 100% em conserto de erros, otimizações, velocidade de resposta e organização da usabilidade.**
2. **Qualidade médica do conteúdo já instalado**: lapidação, precisão beira-leito, dosagens exatas, segurança do paciente e bloqueios de iatrogenia.
3. **Revisão e exclusão de funções excessivas**: remover do escopo tudo o que é excesso acadêmico/cirúrgico terciário ou desnecessário para a prática de um interno e médico generalista no plantão (PS/Enfermaria) ou na UBS.
4. **PROIBIDO adicionar novas funcionalidades** até que todos os itens existentes estejam 100% auditados, sem erros, rápidos e fluidos.

---

## 📋 Backlog de Auditoria, Correção de Defeitos e Otimização (Prioridade Máxima)

0A. [x] **Conserto Imediato do Raio-X Matinal Repetido**:
    - Removido disparo automático cego de 15s no boot do servidor em `server/index.js` (causa-raiz das repetições em deploys e reinicializações).
    - Implementadas travas de idempotência multi-camadas (memória de processo `_dataUltimoBriefingProcessado`, `CacheService` com TTL de 24h e gravação síncrona imediata em `PropertiesService`).
    - Guardrail no corpo de `enviarBriefingMatinal()` impedindo qualquer reenvio automático na mesma data ISO.

0B. [x] **Conserto de Usabilidade do Teclado do Telegram**:
    - Removido `is_persistent: true` em `src/01_utils.js` (configurado como `is_persistent: false`).
    - Restaurado comportamento padrão ergonômico do Telegram: botões recolhidos em ícone discreto na caixa de texto, abrindo apenas sob demanda e liberando a tela do smartphone.

0C. [x] **Auditoria Defensiva e Tratamento de Exceções no Telegram e Fastify RPC**:
    - Varredura de todos os 238 comandos em `src/07_telegram_handlers.js`: eliminação de conflitos de comandos onde `/oftalmo` era interceptado por `/ef_oftalmo` e `/aga` por `/ef_geriatria`, restaurando o acesso direto aos módulos clínicos avançados.
    - Eliminação de bloco duplicado/conflitante de CIG/EHAG, centralizando o fluxo no módulo completo `HepatologiaColestaseGestacionalService`.
    - Unificação do handler de Cólica Nefrética e Litíase Urinária com todos os seus aliases (`/colica`, `/colicanefretica`, `/litiase`, `/pedranorim`, `/calculorenal`).
    - Eliminação de bloco obsoleto e quebrado de `/nutriped` com variável indefinida `contexto.auth`, garantindo que todas as chamadas passem pelo módulo `SuporteNutricionalPediatricoService`.
    - Blindagem de `processarCallbackBotao` com `try/catch` defensivo e resposta segura via `responderCallbackTelegram`, eliminando botões travados no cliente Telegram.
    - Envolvimento global do despachante `processarMensagemTexto` em `try/catch` defensivo com resposta amigável informativa ao usuário caso qualquer exceção imprevista ocorra.
    - Suporte a chamadas internas `'bot'` / `'internal'` em `cockpitAutorizar_` em `src/13_cockpit_integracao.js`.
    - Blindagem e auto-normalização da rota `/api/cockpit` em `server/index.js` e `server/runtime.js` para `body.args` e `metodo`, garantindo imunidade a crashes por payloads vazios, nulos ou malformados.
    - Criação e aprovação da suíte de teste de segurança automatizada `tests/test_defensivo_telegram_rpc.cjs` e `tests/test_defensivo_telegram_rpc.py` (210 testes de comandos Telegram + 70 testes de métodos RPC do Cockpit) e inclusão de testes de resiliência no `tests/test_server_render.cjs`. Cobertura de testes 100% aprovada (191 testes pytest + npm test).

0D. [x] **Varredura de Casos Extremos (Edge Cases) em Prescrições e Calculadoras Clínicas**:
    - Sanitização e blindagem matemática em `src/02_nefrologia_clearance.js`: Cockcroft-Gault clamp de idade (<= 120 anos para evitar numerador negativo), Cr <= 0 com retorno de erro limpo, alertas de peso > 150 kg (necessidade de peso ajustado) e nonagenários >= 90 anos (sarcopenia fisiológica e indicação de Cistatina C).
    - Blindagem em `src/02_nefrologia_dhe.js`: cálculo de ACT sanitizado, blindagem contra NaAtual >= concentracaoSalina na correção de hiponatremia, alertas de obesidade severa (> 150 kg) e neonatos (< 2 kg), além de alerta vermelho máximo em hipercalemia para K+ > 8.0 mEq/L (risco de assistolia/FV, conduta imediata de Gluconato de Cálcio 10% e indicação mandatória de hemodiálise de urgência).
    - Resiliência em `src/02_nefrologia_lra_kdigo.js`: proteção contra divisão por zero com Cr basal <= 0, alertas sentinela para Creatinina extrema (> 15 mg/dL) e gatilhos automatizados de diálise de urgência para acidemia severa (pH < 6.80) e hipercalemia extrema (K+ > 8.0 mEq/L).
    - Alertas sentinela em `src/02_gasometria_acido_base.js`: detecção de acidemia extrema (pH < 6.80 com risco iminente de colapso cardiovascular e perda de resposta a catecolaminas), bicarbonato severamente depletado (<= 5 mEq/L) e hipercalemia extrema (K+ > 8.0 mEq/L).
    - Suporte neonatal em `src/02_pals_pediatria.js`: neonatos e prematuros extremos < 1 kg com cálculo determinístico de tubo endotraqueal 2.5 mm sem cuff, profundidade de fixação peso + 6 cm (evitando intubação seletiva), lâmina Miller 00/0, Joules de choque e proteção estrita contra pesos negativos.
    - Suporte pediátrico em `src/02_suporte_nutricional_pediatrico.js`: alerta neonatal sentinela para recém-nascidos de extremo baixo peso (< 1 kg) em Holliday-Segar.
    - Bloqueios em `src/02_endocrinologia_diabetes.js`: teto de hidratação na 1ª hora limitado a 2.000 mL em obesidade > 150 kg (prevenindo edema agudo pulmonar); proibição terminante de reposição de potássio para K+ > 8.0 mEq/L com cardioproteção imediata; conduta emergencial mandatória de Bicarbonato de Sódio para acidemia grave (pH < 6.80).
    - Tetos farmacológicos em `src/02_toxicologia_emergencia.js`: teto estrito de 100 kg no cálculo de N-acetilcisteína (NAC) conforme diretrizes da ACMT/FDA/ABRATOX (máximo 15g no ataque, 5g na etapa 2 e 10g na etapa 3), evitando choque anafilactoide e hipervolemia iatrogênica em pacientes com obesidade severa.
    - Geriatria e extremos em `src/02_analgesia_pca.js`: contraindicação formal de dose basal contínua em nonagenários (>= 90 anos), bolus de morfina reduzido para 0.5 mg, lockout estendido para 10-15 min e recomendação preferencial de fentanil; alertas específicos para obesidade severa (> 150 kg - risco de apneia obstrutiva do sono e farmacocinética lipofílica alterada) e baixo peso corporal / caquexia (< 40 kg - menor bolus e lockout estendido).
    - Hemoterapia em `src/02_transfusao_sanguinea.js`: alerta crítico de TACO com infusão ultralenta de 3-4h e diurético profilático em pacientes >= 90 anos; prescrição em alíquota fracionada (10-15 mL/kg) para peso < 30 kg; teto seguro de 10 unidades randômicas para pool de plaquetas em obesidade > 150 kg; alerta de emergência médica absoluta para hemoglobina crítica extrema (Hb <= 4.0 g/dL).
    - Hematologia em `src/02_hematologia_anemias.js`: sanitização contra NaN no escore de Ganzoni, alerta de superestimação de déficit férrico em obesidade severa (> 150 kg), contraindicação formal de ferro parenteral em prematuros extremos (< 1 kg) e bloqueio sentinela com priorização imediata de transfusão emergencial se Hb <= 4.0 g/dL.
    - Cardiologia em `src/02_cardiologia_icc.js`: alerta imediato com suspensão mandatória de espironolactona, IECA/BRA e ARNI para K+ > 8.0 mEq/L.
    - Neurologia em `src/02_neurologia_avc.js`: alerta de avaliação de funcionalidade prévia (mRS) e risco microvascular em nonagenários (>= 90 anos) na trombólise; tetos absolutos de Alteplase (90 mg) e Tenecteplase (25 mg) blindados em obesidade (> 150 kg); ajuste por peso estrito em baixo peso (< 40 kg); alertas sentinela em HIC para sobrecarga hiperosmolar e congestão pulmonar (> 150 kg) e monitoração em UTI pediátrica com bomba de seringa (< 10 kg).
    - Suporte nutricional em `src/02_suporte_nutricional.js`: alerta específico para pacientes longevos (>= 90 anos) com aporte proteico conservador ajustado e vigilância hídrica estrita contra descompensação cardiopulmonar.
    - Calculadoras puras em `src/02_calculadoras_puras.js`: CURB-65 com alerta para nonagenários (>= 90 anos); Déficit de Água Livre sanitizado para peso de 0.3 a 350 kg com alertas de neonato (< 2 kg), obesidade (> 150 kg) e hipernatremia extrema (> 175 mEq/L); Cálcio Corrigido com alertas para crise hipercalcêmica (>= 14.0 mg/dL) e hipocalcemia grave (< 7.0 mg/dL); Gap Osmolar com alerta de intoxicação exógena maciça (> 50 mOsm/kg); KDIGO com alerta de falência renal terminal para Cr > 15 mg/dL; Gasometria com faixa de pH 6.0 a 8.0 e alerta para HCO3 esgotado (<= 5 mEq/L); Parkland com alertas para lactentes (< 10 kg com adição de SG 5%), obesidade (> 150 kg com peso ideal) e grande queimado crítico (> 50% SCQ); Posologia pediátrica com proteção estrita para faixa de 1 a 80 kg e teto adulto em adolescentes (> 50 kg); Ajuste renal com detecção de clearance aumentado (ARC > 130 mL/min).
    - Suíte de testes automatizados `tests/test_auditoria_edge_cases_clinicos.cjs` expandida para 38 cenários de estresse e casos extremos clínicos 100% aprovados, e incorporada no pipeline contínuo de testes.

0E. [x] **Expurgo e Simplificação de Módulos Excessivos para o Médico Generalista**:
    - Expurgo do módulo e referências ao Radar de Voos e comandos não médicos: removido comando residual `/pc tenda` em `src/07_telegram_handlers.js` e expurgadas as suítes legadas `tests/test_radar_voos.py` e `tests/test_radar_voos.cjs`.
    - Atualização do `README.md` focando exclusivamente nos 3 pilares médicos e de produtividade clínica (Backend Clínico & Bot, Google Calendar e Composição Corporal), alinhando a documentação às diretrizes de proibição absoluta de Google Apps Script.
    - Lapidação da linguagem dos módulos especializados para foco 100% no médico generalista e interno:
      * **Endocrinologia Hiperprolactinemia**: incorporadas seções explícitas de "Conduta Beira-Leito / UBS (Médico Generalista)" (exclusão de gravidez, TSH, drogas indutoras e macroprolactina) e "Critérios de Encaminhamento ao Especialista" (macroadenoma ≥ 10 mm, queixas visuais/compressivas urgentes ou refratariedade à cabergolina).
      * **Ginecologia Endometriose**: eliminação de jargões cirúrgicos terciários nos relatórios de planejamento e adição de seções explícitas de "Critérios de Encaminhamento Cirúrgico / Especializado" e "Conduta Beira-Leito / UBS (Médico Generalista)" (analgesia escalonada, progestagênio de 1ª linha empírico sem retardar conduta e USG dedicado).
      * **Obstetrícia SAF e Trombofilias**: incorporação de "Conduta Beira-Leito / UBS" (início imediato de AAS 100-150 mg/dia no teste positivo e desmistificação da MTHFR) e "Critérios de Encaminhamento ao Pré-Natal de Alto Risco (PNAR)".
      * **Oftalmologia de Emergência**: adição estruturada de "Critérios de Encaminhamento Urgente ao Oftalmologista" nos 3 ramos de atendimento (após irrigação copiosa em queimadura química, após doses de resgate em glaucoma agudo e curativo de shield rígido sem compressão em suspeita de perfuração/globo aberto).
      * **Hepatologia Obstétrica (CIG & EHAG)**: inclusão de critérios de encaminhamento imediato para Centro Terciário com Medicina Fetal em CIG Moderada/Grave (ABT ≥ 40 ou ≥ 100 mcmol/L) e vaga zero para UTI obstétrica em suspeita de EHAG.
      * **Urologia Cólica Nefrética**: destaque de orientações de hidratação parcimoniosa na crise aguda e critérios de encaminhamento ambulatorial vs descompressão urológica urgente.
0F. [x] **Conserto Imediato do Cockpit: Eliminação de Casos Mock/Falsos de IAM e Histórico Real de Atendimentos**:
    - Removida a injeção estática e mock de 3 casos fictícios ("IAM com supra de VD", "IC Descompensada", "Sepse") que faziam o Cockpit parecer travado em IAM mesmo sem atendimentos.
    - Substituídos os textos estáticos do HTML de IAM por estados neutros reais do plantão ("Aguardando atendimentos do plantão de hoje").
    - Implementada persistência diária de atendimentos (`casosDoDia`) no backend (`src/13_cockpit_integracao.js` e `salvarSoapCockpit_`), enviando ao Cockpit os casos reais gerados pelo usuário no Telegram com timestamp, título diagnóstico e texto SOAP.
    - Criado Empty State limpo, profissional e honesto no Cockpit quando nenhum caso ou leito está registrado.
    - Sincronizado deploy do Cockpit Móvel no GitHub Pages (`gh_cockpit_deploy/`).

0G. [x] **Auditoria de Usabilidade e Telas do Cockpit PWA Beira-Leito**:
    - Implementado motor de cálculo determinístico offline de contingência (`calcularOfflineLocal`) em `cockpit_movel.html` com execução imediata (0ms) no celular mesmo em áreas sem sinal de internet: DVA (Nora, Dobuta, Vaso), SRI (padrão, choque, asma), Clearance Cockcroft-Gault e Gasometria com fórmula de Winter.
    - Eliminação definitiva dos casos fictícios/mock de IAM e IC: cards e relatórios agora refletem 100% os casos reais conduzidos hoje (`casosDoDia`).
    - Empty state limpo e profissional quando não há atendimentos no plantão, evitando poluição visual ou informações falsas na tela do médico.
    - Sincronização automatizada para GitHub Pages via `gh_cockpit_deploy/index.html`.

0H. [x] **Revisão e Lapidação de Conteúdo Clínico das Calculadoras do Cockpit (com Modelo PRO)**:
    - Auditoria clínica rigorosa de ponta a ponta executada com modelo Gemini Pro (`gemini-3.1-pro-high`) em conformidade estrita com a diretriz do usuário.
    - DVA: Noradrenalina (solução 64 mcg/mL, vazão em mL/h de 0.1 a 2.0 mcg/kg/min), Dobutamina (1.000 mcg/mL, 2.5 a 20 mcg/kg/min), Vasopressina (dose fixa de 0.01 a 0.04 UI/min).
    - SRI / IOT: inclusão de alertas sentinela para sobrepeso e obesidade (≥ 100 kg e > 150 kg) com separação estrita de Peso Ideal (IBW) para Fentanil, Propofol, Etomidato e Rocurônio vs Peso Real para Succinilcolina (teto máximo 200 mg), além de contraindicações formais de hipercalemia e denervação.
    - Clearance de Creatinina (Cockcroft-Gault): clamp fisiológico de idade (≤ 120 anos), alertas de sarcopenia no idoso e obesidade severa.
    - Gasometria Arterial: fórmula de Winter validada `(1.5 * HCO3 + 8) ± 2` para acidose metabólica e `(0.7 * HCO3 + 21) ± 2` para alcalose metabólica, com detecção de distúrbios mistos e acidemia extrema (pH < 6.80).
    - Pré-Eclâmpsia e Eclâmpsia: esquema de Zuspan validado (4g IV em 20 min + 1-2g/h manutenção) com vigilância horária de reflexo patelar, diurese e FR, e antídoto Gluconato de Cálcio 10% 10 mL IV lento.

0I. [x] **Auditoria de Menus e Comandos do Telegram para o Interno / Médico Generalista**:
    - Central de Comandos `/menu` e `/hub` estruturada exclusivamente nos 5 pilares do médico generalista: Ambulatório (SOAP), Enfermaria (Leitos), Emergência (Sala Vermelha), Prescrição (REMUME) e Calculadoras.
    - Teclado do Telegram mantido não persistente (`is_persistent: false`), abrindo sob demanda sem ocupar a tela do smartphone.
    - Eliminação de comandos espúrios e não médicos (`/pc tenda`).

---












---



16. [x] **Módulo de Suporte Nutricional Enteral e Parenteral (UTI/Enfermaria)**:
    - Calculadora automatizada de necessidade calórico-proteica basal (Equação de Harris-Benedict ou regra de bolso de 25-30 kcal/kg/dia).
    - Alertas críticos para síndrome de realimentação (reposição empírica de Fósforo, Magnésio e Tiamina antes da dieta).
    - Prescrição de nutrição enteral precoce e parenteral total com base nos dias de jejum e risco nutricional (NRS-2002/NUTRIC Score).

17. [x] **Módulo de Oncologia Básica para Atenção Primária**:
    - Rastreamento dos cânceres mais prevalentes (Mama, Cólon, Próstata e Pulmão) com diretrizes nacionais do INCA 2026.
    - Condutas em achados de BI-RADS em mamografias e FIT-teste positivo.
    - Gestão de efeitos adversos oncológicos na APS (neutropenia febril, mucosite e dor oncológica basal com escada analgésica da OMS avançada).

18. [x] **Módulo de Endocrinologia e Diabetes Mellitus Avançado (SBD/ADA)**:
    - Calculadora determinística de dose de insulina basal e bolus prandial.
    - Protocolo automatizado de correção de hiperglicemia hospitalar.
    - Manejo guiado de Cetoacidose Diabética (CAD) e Estado Hiperosmolar Hiperglicêmico (EHH) com reposição hídrica e potássio baseada nos guidelines da ADA e SBD, além de esquema de transição IV para SC seguro.

19. [x] **Suporte Avançado de Vida Pediátrico (PALS / Reanimação Pediátrica)**:
    - Motor determinístico de cálculo de medicações de emergência pediátrica (Adrenalina 0,1mg/ml, Amiodarona, Lidocaína) em PCR por peso estimado, idade ou fita de Broselow.
    - Cálculo de Joules (2 a 4 J/kg) para desfibrilação e cardioversão sincronizada.
    - Seleção de tubo endotraqueal (TET) com e sem cuff, fixação e lâminas de intubação ajustados por idade/peso.

20. [x] **Neurologia de Emergência e Manejo de AVC Isquêmico Agudo**:
    - Checklist inteligente de elegibilidade e contraindicações absolutas/relativas para trombólise IV (Alteplase) dentro da janela terapêutica de 4.5h.
    - Protocolo restritivo de controle de PA pré e pós-trombólise (Labetalol, Nitroprussiato) evitando conversão hemorrágica.
    - Cálculo posológico determinístico de Manitol 20% e Salina Hipertônica 3% ou 20% beira-leito para o manejo agudo de Hipertensão Intracraniana (HIC) com tetos osmolares.

21. [x] **Painel Inteligente de Intoxicações Exógenas (Toxicologia de Emergência)**:
    - Protocolos determinísticos para intoxicação aguda por Paracetamol com cálculo do Nomograma de Rumack-Matthew e posologia IV/VO de N-acetilcisteína.
    - Reversão beira-leito de intoxicações por Antidepressivos Tricíclicos, Beta-bloqueadores, Bloqueadores de Canal de Cálcio e Opioides (Naloxona escalonada).

22. [x] **Módulo Avançado de Hepatologia Clínica e HDA**:
    - Cálculo determinístico do escore MELD / MELD-Na e Child-Pugh para hepatopatia crônica, com ajuste posológico para insuficiência hepática severa.
    - Protocolos ágeis de manejo de Hemorragia Digestiva Alta (HDA) varicosa com indicação de IBP IV contínuo, Terlipressina ou Octreotide, profilaxia antibiótica para PBE e restrição restrita de cristaloides.

23. [x] **Ferramenta de Auditoria Analítica (Dashboard de Kaizen Clínico)**:
    - Sistema off-line que sumariza tendências de prescrições rejeitadas por risco clínico ou interações graves, detectando gargalos na segurança do paciente em tempo real.


24. [x] **Módulo Avançado de Analgesia Controlada pelo Paciente (PCA)**:
    - Motor determinístico para cálculos de bolus, dose basal, intervalo de bloqueio (lockout) e limite de 4 horas para Morfina e Fentanil em bombas de PCA.

25. [x] **Manejo de Via Aérea Difícil (Algoritmo ASA)**:
    - Protocolo guiado passo-a-passo (RSI, videolaringoscopia, máscara laríngea, cricotireoidostomia de emergência) com predição de via aérea difícil (LEMON score).

26. [x] **Módulo Avançado de Transfusão Sanguínea (Protocolo de Transfusão Maciça e Gatilhos)**:
    - Cálculos beira-leito para reposição de CHAD, Plasma Fresco Congelado, Plaquetas e Crioprecipitado em hemorragias agudas e coagulopatias (ex: CIVD).
    - Gatilhos transfusionais baseados em níveis de hemoglobina (ex: < 7 g/dL em pacientes estáveis, < 8 g/dL em doença coronariana).

27. [x] **Integração de Calculadora de Clearance de Creatinina (Cockcroft-Gault) com Auditoria Automática de Prescrições**:
    - Motor determinístico para estimar o ritmo de filtração glomerular beira-leito.
    - Bloqueio e alerta automático para antibióticos e anticoagulantes quando TFG < 30 mL/min, exigindo ajuste de dose renal obrigatório no PWA.


28. [x] **Infectologia - Manejo de Neutropenia Febril Oncológica (Escore MASCC/CISNE)**:
    - Motor determinístico de estratificação de risco para indicação de tratamento ambulatorial (MASCC >= 21) vs internação hospitalar imediata.
    - Protocolo de antibioticoterapia empírica em até 1 hora da triagem (Cefepime vs Piperacilina-Tazobactam) e indicação de Vancomicina baseada em instabilidade, cateter central ou MRSA.
    - Alerta para indicação oportuna de terapia antifúngica (Echinocandinas) em casos refratários de febre persistente por > 4-7 dias.

29. [x] **Gastroenterologia - Pancreatite Aguda e Manejo da Hidratação (Critérios de Atlanta / BISAP)**:
    - Calculadora determinística beira-leito dos escores de gravidade (BISAP, Ranson, Marshall) para predição de mortalidade e falência orgânica.
    - Protocolo de ressuscitação volêmica dirigida por metas (Lactato Ringer precoce e agressivo nas primeiras 12-24h, com monitorização de ureia e hematócrito para prevenir sobrecarga hídrica e SDRA secundária).
    - Regras alimentares precoces: dieta oral ou enteral (sonda nasojejunal) em 24-48h se tolerável, rejeitando NPO prolongado sem justificativa.


30. [x] **Módulo de Cardiologia de Emergência (Dor Torácica e IAM)**:
    - Escore HEART (History, ECG, Age, Risk factors, Troponin) e TIMI Risk para estratificação de risco de Síndrome Coronariana Aguda.
    - Protocolo duplo bloqueio (AAS + Inibidor P2Y12) com bloqueios cruzados (ex: Prasugrel em paciente com AVC prévio).

31. [x] **Inteligência Gasométrica e Distúrbios Ácido-Base (Regra dos 5 Passos)**:
    - Motor determinístico beira-leito para interpretação ácido-base em 5 passos clínicos (`src/02_gasometria_acido_base.js`).
    - Passo 1: Distúrbio primário e estratificação de gravidade clínica (leve a crítica por faixas de pH).
    - Passo 2: Compensação esperada precisa via Fórmula de Winter (PaCO2 = 1,5 × HCO3 + 8 ± 2) e equações para alcalose metabólica e acidoses/alcaloses respiratórias agudas vs crônicas.
    - Passo 3: Ânion Gap sérico com correção automática estrita por hipoalbuminemia (AG + 2,5 × [4,0 - Alb]).
    - Passo 4: Razão Delta (Delta-Delta) para diagnóstico diferencial de acidoses ocultas e estratificação em hiperclorêmica pura (< 0,4), mista (0,4-0,8), AG elevado pura (0,8-2,0) e alcalose metabólica oculta (> 2,0 ou HCO3 >= 24).
    - Passo 5: Oxigenação com Relação PaO2/FiO2 (Classificação de Berlim 2012 para SDRA) e Gradiente Alvéolo-Arterial (A-a) com PAO2 alveolar ajustada por altitude e limite de normalidade ajustado por idade.
    - Detecção inteligente de distúrbios triplos (ex: CAD + vômitos + DPOC com acidose respiratória).
    - Verificação de consistência biológica por Henderson-Hasselbalch para flag de erro de digitação ou amostra venosa.
    - Alertas críticos beira-leito de hiperlactatemia (> 4 mmol/L) e contraindicação de NaHCO3 antes de correção de hipocalemia severa (K < 3,0 mEq/L).
    - Integrado via Fastify RPC (`cockpitGasometriaAcidoBase`), comandos Telegram (`/gaso`, `/winter`, `/gasometria`, `/aniongap`) e testes automatizados 100% aprovados.

32. [x] **Módulo de Suporte Nutricional em Pediatria (Fórmula Infantil / Terapia Nutricional)**:
    - Motor determinístico beira-leito para hidratação venosa pediátrica e manutenção por Holliday-Segar (`src/02_suporte_nutricional_pediatrico.js`).
    - Cálculo preciso de volume basal (100-50-20 mL/kg/dia) e vazão horária em bomba de infusão (regra 4-2-1).
    - Ajustes clínicos por patologia: restrição hídrica para bronquiolite viral aguda (70%), restrição cardiovascular para cardiopatia congênita/IC (60%), restrição severa para SIADH/oligúria (50%), reposição de déficit/desidratação (125%) e compensação de perdas insensíveis por febre (+12% por °C acima de 37.8°C).
    - Prescrição eletrolítica de manutenção atualizada segundo SBP e AAP (2,5 mEq Na+/100 mL e 2,0 mEq K+/100 mL), com alertas rígidos para soluções isotônicas/balanceadas (prevenção de hiponatremia hospitalar aguda induzida por ADH) e infusão de potássio restrita a diurese confirmada.
    - Avaliação da Taxa de Infusão de Glicose (TIG) com SG 5% e SG 10% (alvo fisiológico de 4 a 6 mg/kg/min).
    - Calculadora determinística de fórmulas infantis respeitando a Regra de Ouro Inflexível de 1 medida rasa para cada 30 mL de água potável morna.
    - Bloqueio de fracionamento de medidas (meia colher) com orientação de preparo de múltiplos de 30 mL e descarte do excesso para evitar hipo ou hiperconcentração osmolar.
    - Alerta de capacidade gástrica fisiológica do lactente (~30 mL/kg) para prevenção de regurgitação e broncoaspiração.
    - Cobertura de fórmulas especiais (Partida, Seguimento, Prematuros/PIG, Anti-Regurgitação, Sem Lactose, Hidrolisada Extensa para APLV, Aminoácidos Livres elementares e Soja).
    - Contraindicação formal de fórmula de soja para menores de 6 meses (fitoestrógenos/alergenicidade).
    - Diretrizes de preparo seguro da OMS/SBP para prevenção de contaminação por *Cronobacter sakazakii* e *Salmonella* (água a 70°C).
    - Integrado via Fastify RPC (`cockpitSuporteNutricionalPediatrico` / `cockpitNutricaoPediatrica`), comandos Telegram (`/nutriped`, `/holliday`, `/formulainfantil`, `/diluicao`) e testes automatizados 100% aprovados.

33. [x] **Módulo de Hematologia: Manejo e Investigação de Anemias**:
    - Motor analítico do hemograma: interpretação de VCM, HCM, RDW e contagem de reticulócitos para classificação etiológica (microcítica/hipocrômica, normocítica, macrocítica).
    - Cálculo de dose de reposição de Ferro elementar (VO) com teto seguro para evitar intolerância gastrointestinal, e critérios para indicação de Ferro Endovenoso (Noripurum).

34. [x] **Cardiologia Intensiva - Choque Cardiogênico e SCA com IC Descompensada (Classificação de Forrester & Stevenson)**:
    - Estratificação determinística hemodinâmica beira-leito (Perfil A: quente/seco, Perfil B: quente/úmido, Perfil C: frio/úmido, Perfil L: frio/seco).
    - Algoritmo de titulação combinada de Inotrópico (Dobutamina/Milrinona) e Vasopressor (Noradrenalina) vs Vasodilatador (Nitroprussiato de Sódio).
    - Bloqueios de segurança: contraindicação formal de betabloqueadores na fase aguda descompensada e otimização de diuréticos de alça (Furosemida bolus vs contínua).

35. [x] **Nefrologia e Terapia Intensiva - Injúria Renal Aguda (KDIGO) e Indicações de Diálise de Urgência**:
    - Estadiamento determinístico KDIGO 1, 2 e 3 por creatinina sérica basal vs pico e débito urinário horário (mL/kg/h).
    - Checklist beira-leito das indicações clássicas de diálise de urgência (mnemônico AEIOU: Acidose refratária pH < 7.15, Eletrólitos/Hipercalemia > 6.5 com ECG alterado, Intoxicações dialisáveis, Overload/Hipervolemia com EAP, Uremia sintomática com pericardite/encefalopatia).

36. [x] **Pneumologia e Emergência - Manejo da Crise Asmática Grave e Estado de Mal Asmático**:
    - Classificação rápida de gravidade (leve/moderada vs grave vs iminência de parada com silêncio respiratório/tórax silencioso e normocapnia em acidose).
    - Protocolo escalonado de broncodilatação (Salbutamol 4-10 jatos com espaçador ou nebulização a cada 20 min na 1ª hora + Brometo de Ipratrópio 0.5mg/40 gotas).
    - Corticoterapia sistêmica precoce (VO ou IV na 1ª hora) e indicação oportuna de Sulfato de Magnésio 2g IV em 20 min na crise refratária ou ameaça à vida.
    - Estratégia protetora de intubação (indução padrão com Ketamina) e ventilação mecânica na asma (Vt baixo, FR baixa, I:E 1:3-1:4, PEEP baixa, hipercapnia permissiva e alívio de auto-PEEP).
    - Bloqueios de segurança: contraindicação formal de sedativos/ansiolíticos sem IOT, contraindicação de antibióticos empíricos de rotina e mucolíticos.
    - Integração Fastify RPC (cockpitPneumologiaAsma), comandos Telegram (/asma, /criseasma, /broncoespasmo, /salbutamol) e testes 100% aprovados.

37. [x] **Obstetrícia & Medicina Materno-Fetal - Manejo de Restrição de Crescimento Fetal (RCF / CIUR) e Doppler Obstétrico (Critérios de Barcelona / ISUOG)**:
    - Motor determinístico beira-leito completo para classificação, estadiamento e conduta em RCF (`src/02_obstetricia_rcf_doppler.js`).
  * **Classificação Delphi (Gordijn 2016 / ISUOG 2020)**:
    - Diferenciação precisa entre RCF Precoce (< 32 semanas, predomínio placentário), RCF Tardia (≥ 32 semanas, risco de deterioração aguda), PIG constitucional (Doppler normal) e sem restrição.
    - RCF Precoce: critérios isolados (CA < p3, PFE < p3, diástole zero/reversa) ou combinados (PFE/CA < p10 + uterinas > p95 ou IP AU > p95).
    - RCF Tardia: critérios isolados (CA/PFE < p3) ou 2 de 3 contributivos (PFE/CA < p10, queda > 2 quartis, RCP < p5 ou IP AU > p95).
    - Insuficiência placentária grave ao Doppler é conduzida como RCF independentemente da biometria.
  * **Interpretação Dopplervelocimétrica Completa**:
    - Artéria Umbilical: IP > p95, diástole zero (AEDV) e diástole reversa (REDV).
    - Artéria Cerebral Média: IP < p5 (vasodilatação cerebral / centralização).
    - Relação Cerebroplacentária (RCP): cálculo automático (IP ACM / IP AU), classificação por percentil ou regra conservadora RCP < 1,0 no 3º trimestre.
    - Artérias Uterinas: IP médio > p95.
    - Istmo Aórtico: fluxo diastólico reverso.
    - Ducto Venoso: IP > p95, onda A ausente e onda A reversa (gatilho de interrupção).
  * **Estadiamento de Barcelona (Figueras & Gratacós 2014)**:
    - Estágio 0 (PIG): Doppler normal, parto 39+0 a 40+0 sem, via obstétrica habitual.
    - Estágio I: PFE < p3 ou IP AU > p95 ou ACM/RCP alterados, parto 37+0 sem, indução com CTG contínua.
    - Estágio II: diástole zero na AU ou istmo reverso, parto 34+0 sem, cesariana obrigatória.
    - Estágio III: diástole reversa na AU ou IP DV > p95, parto 30+0 sem, cesariana em centro terciário.
    - Estágio IV: onda A ausente/reversa no DV, VCP < limiar TRUFFLE ou desacelerações espontâneas, interrupção ≥ 26+0 sem após corticoide se vitalidade permitir.
  * **Limiares TRUFFLE para VCP da cCTG**:
    - < 29 semanas: VCP < 2,6 ms → Estágio IV.
    - ≥ 29 semanas: VCP < 3,0 ms → Estágio IV.
  * **Protocolo de Conduta por Estágio**:
    - IG-alvo de parto, via de parto preferencial, nível de vigilância e local de parto (centro terciário a partir do Estágio II).
    - Decisão de periviabilidade (< 24 sem) e limite de viabilidade (< 26 sem) com aconselhamento conjunto Obstetrícia/Neonatologia.
  * **Corticoide Antenatal e Neuroproteção Fetal**:
    - Betametasona 12 mg IM 2 doses ou Dexametasona 6 mg IM 4 doses, indicado quando parto < 34 semanas ou Estágio ≥ III.
    - Sulfato de magnésio para neuroproteção (4 g IV ataque + 1 g/h manutenção) quando parto < 32 semanas.
    - Alerta de interpretação cautelosa de VCP e Doppler pós-corticoide (efeito farmacológico transitório 24-72h).
  * **Investigação Etiológica Escalonada**:
    - Datação, morfológica, rastreio de pré-eclâmpsia (sFlt-1/PlGF), fatores maternos.
    - Infecções congênitas (CMV, toxo, sífilis, rubéola) em RCF precoce/grave.
    - Estudo genético invasivo e SAF em RCF grave < 24 semanas.
  * **Bloqueios de Segurança Clínica**:
    - SILDENAFILA CONTRAINDICADA (STRIDER: hipertensão pulmonar neonatal e mortalidade).
    - AAS/heparina não tratam RCF estabelecida; repouso/hiperoxigenação sem evidência.
    - Não antecipar parto por biometria isolada em PIG com Doppler normal antes de 37 semanas.
  * **Parser de Texto Livre (Telegram)**:
    - Extração robusta de IG, percentis, Doppler, oligoâmnio, pré-eclâmpsia e gemelaridade.
    - Proteção contra falso positivo: "onda a reversa" não contamina "diástole reversa" da AU.
  * **Integração e Testes Automatizados**:
    - Módulo `src/02_obstetricia_rcf_doppler.js` integrado via Fastify RPC (`cockpitObstetriciaRcf` e `cockpitRestricaoCrescimentoFetal`) e comandos Telegram (`/rcf`, `/ciur`, `/rciu`, `/doppler`, `/crescimentofetal`).
    - 25 testes unitários dedicados em `tests/test_obstetricia_rcf_doppler.cjs` + 2 testes de integração do servidor em `tests/test_server_render.cjs`. 100% de sucesso.

38. [x] **Hepatologia & Emergência Obstétrica - Colestase Intra-hepática da Gestação (CIG) e Esteatose Hepática Aguda**:
    - Dosagem de ácidos biliares totais séricos como biomarcador patognomônico de estratificação de gravidade (leve 10-39 mcmol/L, moderada 40-99 mcmol/L, grave >= 100 mcmol/L com risco de óbito fetal súbito).
    - Posologia ponderada de Ácido Ursodesoxicólico (UDCA 10 a 15 mg/kg/dia) como fármaco de 1ª linha.
    - Programação do parto: indicação de interrupção entre 36 e 37 semanas na forma grave (ou 38 semanas na leve) evitando óbito fetal sem advertência cardiotocográfica.

39. [x] **Infectologia & Obstetrícia - Rastreamento e Manejo de Toxoplasmose Aguda na Gestação (Diretrizes Ministério da Saúde / FEBRASGO / ACOG)**:
    - Motor determinístico beira-leito para interpretação sorológica de Toxoplasmose (`src/02_obstetricia_toxoplasmose.js`).
    - Algoritmo escalonado por perfil: Suscetível (IgG- / IgM- com profilaxia primária e sorologia trimestral), Imunidade Pregressa (IgG+ / IgM- sem necessidade de novo rastreio), Infecção Aguda Muito Recente / IgM falso-positivo (IgG- / IgM+ com início imediato de Espiramicina e recoleta em 2-3 semanas).
    - Classificação no 1º trimestre (<= 16 semanas): interpretação de Teste de Avidez de IgG com suporte a valores numéricos (>= 60% alta afasta infecção gestacional e suspende medicação; < 50% baixa confirma infecção aguda e indica investigação fetal).
    - Conduta em Coleta Tardia (> 16 semanas): reconhecimento de perda de poder preditivo da avidez, tratando como infecção aguda provável por segurança.
    - Protocolo de profilaxia fetal contra transmissão vertical com Espiramicina 1g (3.000.000 UI) VO 8/8h.
    - Indicação e timing de Amniocentese para PCR no líquido amniótico (a partir de 18 semanas e com intervalo mínimo de 4 semanas após infecção para evitar falso-negativo).
    - Tratamento fetal intraútero com Esquema Tríplice (Sulfadiazina 1.500 mg VO 12/12h + Pirimetamina 50 mg/dia + Ácido Folínico 15 mg/dia) indicado em PCR positivo, USG alterado (hidrocefalia, calcificações cerebrais) ou infecção materna em 3º trimestre tardio (>= 32 semanas).
    - Esquema alternativo para gestantes alérgicas a Sulfonamidas com Clindamicina 600 mg VO 6/6h + Pirimetamina + Ácido Folínico.
    - Alerta crítico e conduta de termo (>= 37 semanas): suspensão de Sulfadiazina e substituição por Espiramicina para prevenção de Kernicterus neonatal por deslocamento de bilirrubina da albumina.
    - Bloqueios de segurança clínica: obrigatoriedade do Ácido Folínico (proibição de substituição por ácido fólico comum), monitoramento hematológico bimensal da toxicidade de Pirimetamina e contraindicação de amniocentese antes de 18 semanas.
    - Integração Fastify RPC (`cockpitObstetriciaToxoplasmose` e `cockpitToxoplasmoseGestacional`), comandos Telegram (`/toxo`, `/toxoplasmose`, `/espiramicina`, `/avidez`) e 20 testes unitários + testes de integração do servidor aprovados.

40. [x] **Cardiologia e Emergência - Fibrilação Atrial Aguda e Anticoagulação (CHA2DS2-VASc / HAS-BLED / Controle de Frequência vs Ritmo)**:
    - Motor determinístico de cálculo do escore CHA2DS2-VASc para indicação de anticoagulação oral (DOACs de 1ª linha: Apixabana, Rivaroxabana, Dabigatrana, Edoxabana vs Varfarina se prótese metálica/estenose mitral).
    - Avaliação balanceada de risco hemorrágico com escore HAS-BLED identificando fatores de sangramento modificáveis.
    - Algoritmo de decisão rápida de estabilidade hemodinâmica: cardioversão elétrica sincronizada imediata no choque/instabilidade vs controle de frequência (Metoprolol IV, Diltiazem, Digoxina) ou cardioversão química com Amiodarona observando a janela de 48h ou ecocardiograma transesofágico.

41. [x] **Urologia e Nefrologia - Manejo de Cólica Nefrética Aguda e Litíase Urinária (Diretrizes SBU / EAU)**:
    - Algoritmo escalonado de analgesia de emergência: AINEs de 1ª linha (Cetoprofeno / Diclofenaco) vs opioides, com bloqueios renais se ClCr < 30 mL/min.
    - Terapia Expulsiva Médica (MET): indicação de Tansulosina 0.4mg para cálculos de ureter distal de 5 a 10 mm.
    - Checklist de gravidade com indicação de descompressão cirúrgica de urgência (duplo J ou nefrostomia percutânea) em rim único, sepse urinária obstrutiva ou anúria.

42. [x] **Pediatria de Emergência - Manejo da Bronquiolite Viral Aguda (Diretrizes SBP / AAP)**:
    - Estratificação de gravidade clínica e desconforto respiratório (escore de Wood-Downes modificado).
    - Recomendações estritas de NÃO indicação rotineira de broncodilatadores (salbutamol), corticoides sistêmicos ou antibióticos em casos típicos (evitando sobretratamento desnecessário).
    - Critérios objetivos de oxigenoterapia com cânula nasal de alto fluxo (CNAF), hidratação isotônica venosa e internação em UTI pediátrica.

43. [x] **Endocrinologia Ginecológica e Reprodução - Manejo de Hiperprolactinemia e Prolactinomas (Diretrizes Endocrine Society / FEBRASGO)**:
    - Algoritmo escalonado de investigação etiológica (exclusão de macroprolactina, hipotireoidismo primário, drogas indutoras como antipsicóticos e metoclopramida).
    - Diferenciação de microadenoma (< 10 mm) vs macroadenoma (>= 10 mm) e rastreio de alterações campimétricas/visuais.
    - Terapia farmacológica com agonistas dopaminérgicos de 1ª linha (Cabergolina 0.5 mg 1 a 2x/semana com superioridade em eficácia e tolerância gastrointestinal vs Bromocriptina).
    - Manejo de segurança na gestação e rastreio de valvulopatia cardíaca com ecocardiograma em doses cumulativas elevadas.

44. [x] **Ginecologia Endócrina e Cirúrgica - Manejo Clínico da Endometriose e Dor Pélvica Crônica (Diretrizes ESHRE / FEBRASGO 2024-2026)**:
    - Diagnóstico clínico e mapeamento sindrômico estruturado baseado nos "6 Ds" da Endometriose (Dismenorreia progressiva, Dispareunia de profundidade, Dor pélvica crônica acíclica, Disquezia cíclica, Disúria e Dificuldade reprodutiva).
    - Mapeamento por imagem de alta resolução: USG transvaginal com preparo intestinal prévio e RM de pelve com protocolo específico para endometriose profunda, endometriomas e acometimento compartimental.
    - Alerta compulsório de segurança: rastreamento obrigatório de hidronefrose ureteral silenciosa em lesões retroperitoneais de ligamentos uterossacros e septo retovaginal.
    - Terapia farmacológica de 1ª linha empírica sem exigência de laparoscopia prévia: Progestagênios orais contínuos (Dienogeste 2 mg/dia como padrão-ouro de eficácia e atrofia dos implantes; SIU-Levonorgestrel 52 mg; Desogestrel 75 mcg) e AHC combinados em uso contínuo com bloqueio de estrogênios em pacientes contraindicadas.
    - Terapia de 2ª linha para refratariedade: Antagonistas orais de GnRH (Relugolix 40 mg com add-back fixa ou Elagolix) e Análogos de GnRH injetáveis (Goserrelina / Leuprorrelina) com obrigatoriedade estrita de Add-Back Therapy para prevenção de osteoporose e sintomas vasomotores.
    - Algoritmo de decisão reprodutiva vs cirúrgica (ESHRE/ASRM): Bloqueio estrito de tratamento hormonal contraceptivo em mulheres tentando engravidar; indicação prioritária de Reprodução Assistida / FIV direta em mulheres com idade ≥ 35 anos, infertilidade prolongada ou AMH diminuído (< 1.1 ng/mL) prevenindo espoliação da reserva folicular ovariana por cistectomias repetidas.
    - Indicações cirúrgicas mandatórias imediatas: estenose ureteral com hidronefrose, suboclusão intestinal retossigmoideia com acometimento ≥ 50% da luz e dor pélvica intratável.
    - Integrado via Fastify RPC (`cockpitGinecologiaEndometriose` e `cockpitEndometriose`), comandos Telegram (`/endometriose`, `/dienogeste`, `/dorpelvica`) e 100% de cobertura nos testes unitários e de integração do servidor Render.

45. [x] **Obstetrícia & Reumatologia - Síndrome do Anticorpo Antifosfolipídio (SAF) e Trombofilias na Gestação (Critérios Sydney / ACR / EULAR 2023)**:
    - Motor determinístico de diagnóstico e classificação formal baseado nos Critérios de Sydney (2006) e novos Critérios ACR/EULAR (2023).
    - Mapeamento de critérios obstétricos (abortamentos precoces de repetição ≥ 3 com < 10 semanas, perda fetal morfologicamente normal ≥ 10 semanas, parto prematuro < 34 semanas por pré-eclâmpsia grave ou insuficiência placentária) e critérios trombóticos (TVP, TEP, AVC, trombose arterial/venosa).
    - Validação estrita de critérios laboratoriais com intervalo mínimo obrigatório de 12 semanas (Anticoagulante Lúpico, Anticardiolipina IgG/IgM e Anti-beta-2-glicoproteína I) e identificação de Tripla Positividade com altíssimo risco.
    - Estratificação fenotípica: SAF Obstétrica Típica (AAS 100-150 mg/dia + Enoxaparina profilática por faixas de peso), SAF Trombótica (Enoxaparina plena terapêutica 1 mg/kg 12/12h + AAS), SAF Refratária (escalonamento e adição de Hidroxicloroquina 200 a 400 mg/dia), Portadora Assintomática e CAPS.
    - Manejo de trombofilias hereditárias (Alto Risco: Déficit Antitrombina III, FVL homozigoto, Protrombina homozigoto, Duplo hetero; Baixo Risco: FVL hetero, Protrombina hetero, Déficit Proteína C/S) e desmistificação com bloqueio formal de heparina/anticoagulação por polimorfismo isolado de MTHFR.
    - Protocolo estrito de suspensão periparto para anestesia neuroaxial (SOAP/ASRA): 12 horas para HBPM profilática e 24 horas para HBPM terapêutica, além de regras de puerpério seguro mantendo Enoxaparina por 6 semanas completas.
    - Bloqueios de segurança clínica: contraindicação formal de DOACs, contraindicação de Varfarina no 1º trimestre, contraindicação de AINEs no 3º trimestre e suplementação obrigatória de Cálcio e Vitamina D para prevenção de perda óssea por heparina.
    - Integrado via Fastify RPC (`cockpitObstetriciaSaf`, `cockpitSafTrombofilias`, `cockpitSafGestacional`), comandos Telegram (`/saf`, `/antifosfolipidio`, `/safgestante`, `/trombofiliagestante`, `/trombofilia`, `/enoxaparina`) e 100% de cobertura nos testes unitários e de integração do servidor Render.

---


46. [x] **Cardiologia - Rastreio e Manejo de Insuficiência Cardíaca Crônica (Diretrizes SBC/ESC)**:
    - Motor determinístico para diagnóstico (Critérios de Framingham).
    - Classificação funcional da NYHA e estadiamento ACC/AHA (A a D).
    - Prescrição sequencial escalonada do Quarteto Fantástico (iSGLT2, ARNI/IECA, Beta-bloqueador e ARM) com checagem rigorosa de contraindicações (ex: bloqueio de espironolactona e sacubitril/valsartana em hipercalemia ou piora de ClCr).

47. [x] **Oftalmologia e Emergência - Rastreio e Conduta Inicial no Trauma Ocular, Queimaduras Químicas e Glaucoma Agudo (Diretrizes CBO / AAO / Wills Eye / ATLS)**:
    - Motor determinístico beira-leito para acuidade visual (Snellen, Conta Dedos, Movimentos de Mãos, Percepção Luminosa) e triagem de urgência oftalmológica (`src/02_oftalmologia_emergencia.js`).
    - Protocolo emergencial de queimaduras químicas oculares: prioridade zero de irrigação profusa contínua (Ringer Lactato ou SF 0,9%, 1-2L iniciais) antes de qualquer anamnese detalhada ou acuidade visual; aferição seriada de pH com papel tornassol (alvo neutro 7.0 a 7.2 com repouso pós-irrigação); eversão palpebral obrigatória com bastonete para remoção mecânica de partículas sólidas (cal, cimento, gesso); diferenciação fisiopatológica de álcalis (necrose de liquefação com penetração profunda e isquemia límbica) vs ácidos (necrose de coagulação).
    - Protocolo determinístico de Glaucoma Agudo de Ângulo Fechado (GAAF): terapia hipotensora sistêmica imediata com Acetazolamida 500 mg VO/IV (bloqueio em alergia grave a sulfas), Timolol 0,5% colírio com bloqueio de segurança em asma, DPOC e bradicardia severa, Brimonidina 0,15-0,2% (bloqueio em menores de 2 anos pelo risco de depressão respiratória central) e Manitol 20% IV (1-2 g/kg em 30-45 min); **Regra de Ouro da Pilocarpina**: bloqueio formal de miótico com PIO > 40-50 mmHg devido à isquemia do esfíncter da íris, liberando Pilocarpina 1-2% somente após redução prévia da pressão intraocular; encaminhamento urgente para iridotomia periférica a laser profilática bilateral.
    - Protocolo de trauma ocular e suspeita de globo ocular aberto (Seidel positivo, pupila em gota d'água direcionada à ferida, câmara anterior rasa/atâmica, extrusão uveal, hipotonia): **Regras de Proteção Absoluta**: NUNCA palpar, NUNCA aferir tonometria, NUNCA everter pálpebras, NUNCA prescrever pomadas ou colírios desnecessários, NUNCA aplicar curativo compressivo com gaze; proteção mecânica exclusiva com shield rígido (protetor acrílico ou de alumínio apoiado nas bordas orbitárias ósseas), NPO absoluto, antiemético IV profilático para prevenir vômito e manobra de Valsalva, profilaxia antitetânica e antibioticoterapia IV para endoftalmite; protocolo de hifema traumático com repouso em cabeceira elevada a 30-45º e bloqueio absoluto de AAS/AINEs; protocolo de fratura de assoalho de órbita (blow-out) com proibição estrita de assoar o nariz para prevenção de enfisema orbitário e amaurose.
    - Integrado via Fastify RPC (`cockpitOftalmologiaEmergencia`, `cockpitOftalmologia`), comandos Telegram (`/oftalmo`, `/glaucoma`, `/queimaduraocular`, `/traumaocular`) e cobertura 100% aprovada nos testes unitários e de integração do servidor Render.


48. [x] **Módulo de Psiquiatria - Manejo do Transtorno Depressivo Maior, Agitação Psicomotora e Risco de Suicídio (Concluído)**:
    - Escala de Depressão PHQ-9 e inventário de risco de suicídio (C-SSRS e SAD PERSONS).
    - Algoritmo de escolha de antidepressivos (ISRS, Duais) focado em efeitos colaterais e comorbidades.
    - Protocolo de contenção física (CFM 2.057/2013) e química para urgências psiquiátricas.

49. [x] **Geriatria Avançada - Profilaxia de Quedas e Osteoporose (FRAX/ACR)**:
    - Motor determinístico beira-leito para estimativa do risco de fratura em 10 anos pelo modelo calibrado FRAX Brasil (ABRASSO / SBGG / NOGG / OMS) em `src/02_saude_idoso.js`.
    - Curva basal brasileira interpolada por idade e sexo, com ajuste matemático de IMC, cálculo de Hazard Ratios para fatores de risco clínicos (fratura prévia por fragilidade, histórico parental de fratura de fêmur, tabagismo, uso crônico de glicocorticoide, artrite reumatoide, osteoporose secundária e etilismo) e gradiente por desvio padrão para T-score da DMO do colo femoral.
    - Estratificação de risco com limiares de intervenção formais (Alto Risco para Fratura de Quadril >= 3% ou Fratura Maior >= 20%, ou fratura prévia de fragilidade ou T-score <= -2.5; Risco Intermediário com indicação expressa de DMO para reclassificação; Baixo Risco para suporte preventivo).
    - Protocolo de manejo de osteoporose e suplementação mineral:
      * Cálcio elementar com meta de 1.000 a 1.200 mg/dia: preferência por Citrato de Cálcio para usuários crônicos de IBP (absorção independente do pH ácido gástrico) e Carbonato de Cálcio com as refeições; teto de segurança diário <= 1.500-2.000 mg/dia para prevenir litíase urinária e calcificação arterial.
      * Vitamina D (Colecalciferol): meta sérica de 30 a 60 ng/mL no idoso/frágil; esquema de ataque de 50.000 UI/semana por 8 semanas se deficiência (< 20 ng/mL); alerta crítico de toxicidade para 25(OH)D > 100 ng/mL; contraindicação sentinela absoluta de megadose única anual (500.000 UI em bolus) por risco paradoxal de quedas e fraturas.
      * Bisfosfonatos (Alendronato 70 mg VO semanal): bloqueio renal estrito para ClCr < 35 mL/min (indicação de Denosumabe sob especialista); bloqueio temporário por hipocalcemia sérica (< 8.5 mg/dL) antes do início; contraindicação oral por esofagopatia grave ou incapacidade de manter ortostase por 30-60 min; instruções de ouro de tomada (jejum completo com 200 mL de água pura, ortostase 30-60 min e aguardar 30-60 min antes de qualquer alimento/droga); alerta de Drug Holiday após 3 a 5 anos de uso contínuo.
    - Revisão de polifarmácia e auditoria de FRIDs (Fall-Risk Increasing Drugs):
      * Detecção de fármacos que prolongam intervalo QTc com emissão de ALERTA VERMELHO DE QT LONGO e risco de Torsades de Pointes se combinação de 2 ou mais agentes.
      * Detecção de fármacos hipotensores ortostáticos e confirmação clínica beira-leito (queda de PAS >= 20 mmHg ou PAD >= 10 mmHg aos 3 minutos após ortostase).
      * Rastreio de psicotrópicos, benzodiazepínicos, drogas Z e relaxantes musculares com cálculo de carga iatrogênica de quedas e orientações de desprescrição segura.
    - Integração completa via Fastify RPC (`cockpitGeriatriaFrax`, `cockpitFrax`, `cockpitGeriatriaOsteoporose`, `cockpitOsteoporose`, `cockpitGeriatriaQuedas`, `cockpitQuedas`, `cockpitGeriatriaPolifarmacia`, `cockpitGeriatriaAvancada`, `cockpitSaudeIdosoAga`) e comandos Telegram (`/frax`, `/osteoporose`, `/quedas`, `/polifarmacia`, `/frids`, `/aga`, `/idoso`, `/cfs`, `/minicog`, `/tug`, `/beers`).
    - Nova suíte de testes automatizados `tests/test_saude_idoso_geriatria.cjs` com 22 cenários clínicos especializados, testes de endpoint Fastify `/api/cockpit` integrados no `tests/test_server_render.cjs` e 100% de aprovação no pipeline contínuo do projeto.

50. [x] **Pneumologia e Terapia Intensiva - Manejo da Crise Hipercapnica na DPOC e Ventilação Não Invasiva (GOLD 2026 / SBPT)**:
    - Critérios determinísticos de indicação e contraindicações formais para VNI (BiPAP/CPAP) na exacerbação aguda da DPOC.
    - Titulação beira-leito de IPAP e EPAP com alvos gasométricos (pH >= 7,35 e alívio do trabalho muscular).
    - Parâmetros objetivos de falha de VNI e gatilhos para intubação orotraqueal e ventilação mecânica protetora precoce.

51. [x] **Reumatologia e Urgência - Monoartrite Aguda e Febre Reumática (Critérios de Jones / ACR)**:
    - Motor determinístico beira-leito para análise do líquido sinovial e diagnóstico diferencial de monoartrite (`src/02_reumatologia_monoartrite_febre_reumatica.js`):
      * Classificação do líquido sinovial por grupos (Grupo I: Não-inflamatório/Mecânico; Grupo II: Inflamatório/Microcristalino; Grupo III: Séptico/Infeccioso; Grupo IV: Hemorrágico).
      * Diferenciação microcristalina sob microscopia: cristais em agulha com forte birrefringência negativa (Urato Monossódico / Gota) vs cristais romboides com birrefringência positiva fraca (Pirofosfato de Cálcio / Pseudogota/CPPD).
      * Alerta sentinela crítico de coexistência: identificação de cristais não exclui Artrite Séptica bacteriana sobreposta se celularidade elevada, Gram positivo ou febre.
      * Protocolo de conduta na Artrite Séptica: emergência médica ortopédica, artrocentese evacuadora seriada imediata vs indicação mandatória de drenagem cirúrgica (artroscopia/artrotomia em quadril, ombro, articulações axiais ou com prótese).
      * Esquemas antimicrobianos empíricos intravenosos escalonados: Ceftriaxona 1-2g IV + Azitromicina 1g VO para adulto jovem sexualmente ativo (risco gonocócico); Oxacilina 2g IV 4/4h para adulto padrão (MSSA); Vancomicina 15-20 mg/kg IV 12/12h para risco de MRSA; associação de Ceftriaxona/Cefepime para risco de BGN em idosos e imunossuprimidos.
      * Manejo da crise aguda de Gota: AINE potente em dose cheia precoce se função renal e gástrica preservadas; Colchicina em baixa dose (1,0 mg ataque + 0,5 mg após 1h); Prednisona oral 30-40 mg/dia como droga de escolha em insuficiência renal (ClCr < 30 mL/min), idosos e alto risco hemorrágico; Regra de Ouro do Alopurinol (não suspender se uso prévio e não iniciar durante o pico agudo).
    - Motor determinístico de Febre Reumática Aguda e Critérios de Jones revisados (AHA 2015 / SBP / SBC):
      * Estratificação por população de alto risco epidemiológico (Brasil): critérios maiores (Cardite, Artrite [poliartrite migratória, monoartrite ou poliartralgia], Coreia de Sydenham, Eritema marginado, Nódulos subcutâneos) e menores (Artralgia, Febre ≥ 38,0 °C, VHS ≥ 30 mm/h ou PCR ≥ 3,0 mg/dL, intervalo PR prolongado no ECG).
      * Diagnóstico presuntivo independente para Coreia de Sydenham isolada.
      * Protocolo de erradicação de orofaringe do *Streptococcus pyogenes*: Penicilina G Benzatina IM profunda dose única (1.200.000 UI se ≥ 27 kg; 600.000 UI se < 27 kg); esquema com Eritromicina ou Azitromicina para alérgicos.
      * Controle anti-inflamatório da fase aguda: AAS em dose plena anti-inflamatória (80-100 mg/kg/dia dividido de 6/6h) na artrite pura com resposta rápida diagnóstica; Corticoterapia com Prednisona (1-2 mg/kg/dia) na cardite moderada/grave.
      * Protocolo de Profilaxia Secundária obrigatória a cada 21 dias (padrão-ouro Brasil): Penicilina G Benzatina (1.200.000 UI se ≥ 27 kg; 600.000 UI se < 27 kg) ou Sulfadiazina 1g/dia VO em alérgicos.
      * Duração da profilaxia secundária: até 21 anos (sem cardite), até 25 anos (cardite curada sem lesão residual) ou até 40 anos/vitalícia (valvulopatia residual crônica persistente ou prótese valvar).
    - Integração Fastify RPC (`cockpitReumatologiaMonoartrite`, `cockpitMonoartrite`, `cockpitReumatologiaFebreReumatica`, `cockpitFebreReumatica`, `cockpitJones`), comandos Telegram (`/monoartrite`, `/artriteseptica`, `/artriteséptica`, `/gota`, `/artrocentese`, `/febrereumatica`, `/fr`, `/jones`, `/aslo`) e suíte de testes dedicados `tests/test_reumatologia_monoartrite_febre_reumatica.cjs` 100% aprovada.

52. [x] **Cockpit PWA - Cache Local Criptografado com IndexedDB e Fila Offline Resiliente**:
    - Subsistema cliente `CockpitCrypto` com criptografia em repouso AES-256 GCM (via Web Crypto API SubtleCrypto nativa) e fallback simétrico seguro com salt por dispositivo, garantindo proteção total de dados de saúde no dispositivo do médico.
    - Expansão do banco IndexedDB (`CockpitOfflineDB`) para v2 no Dexie com stores estruturados e criptografados: `snapshots` (dados de leitos e atendimentos), `protocolos` (catálogo REMUME e Sala Vermelha), `calculos` (cache determinístico de cálculos com 0ms de latência), `consultas` (perfil corporal e histórico) e `syncQueue` (mutações gravadas).
    - Fila Offline Resiliente (Offline Action Queue) criptografada com suporte a Optimistic UI para alteração de status de leito (`cockpitStatusLeito`), pesagem (`cockpitRegistrarPeso`) e progresso de aulas (`cockpitAlternarAula`), permitindo uso clínico ininterrupto em subsolos hospitalares e áreas blindadas sem sinal.
    - Sincronização automática em segundo plano (auto-sync) ao detectar retorno de sinal de rede (`online`) e por timer periódico de 25 segundos, além de acionamento manual no modal.
    - Badge de telemetria visual em tempo real no cabeçalho mobile indicando com clareza o modo de conexão ativo (`Nuvem`, `Nó Local`, `Offline Seguro`), com contador numérico de pendências e modal expandido com diagnóstico criptográfico do armazenamento.
    - Suíte de testes automatizados `tests/test_cockpit_offline_indexeddb.cjs` e `tests/test_cockpit_offline_indexeddb.py` incorporados no pipeline de testes (`npm test` e pytest com 100% de sucesso).
    - Sincronização de deploy do bundle Cockpit no GitHub Pages (`gh_cockpit_deploy/index.html`).

53. [x] **Dermatologia e Infectologia - Diagnóstico e Manejo de Lesões Elementares e ISTs Cutâneas (Herpes, Sífilis Secundária, Mpox)**:
    - Motor determinístico beira-leito para análise dermatológica e ISTs (`src/02_dermatologia_lesoes_ists.js`):
      * **Algoritmo de Diferenciação Morfológica de Lesões Elementares**:
        - Classificação por categorias: alterações de cor (máculas, manchas e púrpuras), elevações sólidas (pápulas, placas, nódulos), conteúdo líquido (vesículas, bolhas, pústulas) e perdas/secundárias (erosões, úlceras, crostas).
        - Red flags imediatos: Sinal de Hutchinson (vesículas na ponta/asa do nariz - comprometimento do ramo nasociliar de V1 com risco iminente de ceratite herpética e amaurose, urgência oftalmológica mandatória); Sinal de Nikolsky positivo com descolamento epidérmico e acometimento mucoso (alerta crítico para SSJ/NET com suspensão imediata de fármacos suspeitos); Púrpura/petéquias que não desaparecem à digitopressão associadas a febre (alerta de sepse/meningococcemia/CIVD com indicação imediata de Ceftriaxona 2g IV); Pápulas descamativas palmo-plantares com colarete periférico de Biett (patognomônico de Sífilis Secundária).
      * **Protocolo Posológico de Antivirais (Herpes Zoster & Herpes Simples) com Ajuste por ClCr**:
        - Herpes Zoster Oral: Aciclovir 800 mg 5x/dia por 7 dias (ajustado para 8/8h se ClCr 10-25 mL/min; 12/12h se ClCr < 10 mL/min; dose pós-diálise em hemodiálise) e Valaciclovir 1.000 mg 8/8h por 7 dias (ajustado para 12/12h se ClCr 30-49 mL/min; 24/24h se ClCr 10-29 mL/min; 500 mg 24/24h se ClCr < 10 mL/min ou hemodiálise).
        - Herpes Zoster Intravenoso (casos graves/imunossuprimidos): Aciclovir 10 mg/kg IV de 8/8h com ajuste por ClCr, regra estrita de infusão lenta em pelo menos 1 hora e hidratação venosa vigorosa profilática contra cristalúria tubular renal.
        - Herpes Simples Genital: Primoinfecção (Aciclovir 400 mg 8/8h 7-10d ou Valaciclovir 1.000 mg 12/12h); Recorrência (Aciclovir 400 mg 8/8h 5d ou Valaciclovir 500 mg 12/12h 3d); Terapia Supressiva Crônica (Aciclovir 400 mg 12/12h contínuo ou Valaciclovir 500 mg/dia); Alerta de cesariana mandatória se lesões ativas em trabalho de parto para prevenção de encefalite neonatal.
        - Analgesia e Prevenção de Neuralgia Pós-Herpética: introdução precoce de Gabapentina (300 a 1.800 mg/dia) ou Pregabalina (75 a 150 mg 12/12h) e analgesia escalonada.
      * **Abordagem Sindrômica de Úlceras Genitais (PCDT Ministério da Saúde 2024-2026)**:
        - Ramo Herpético: vesículas agrupadas presentes -> tratar Herpes Genital com Aciclovir/Valaciclovir.
        - Ramo Agudo (< 4 semanas sem vesículas): tratamento empírico duplo mandatório para Sífilis Primária (Penicilina G Benzatina 2.400.000 UI IM dose única) + Cancro Mole (Azitromicina 1.000 mg VO dose única); Bloqueio absoluto de Doxiciclina na gestante com indicação de dessensibilização hospitalar com penicilina.
        - Ramo Crônico (>= 4 semanas): tratamento estendido para Donovanose (*Klebsiella granulomatis*) com Azitromicina 1g/sem ou 500mg/dia por >= 3 semanas até cicatrização completa; Doxiciclina 100mg 12/12h por 21 dias para Linfogranuloma Venéreo (*Chlamydia trachomatis* L1-L3); Alerta de biópsia incisional de borda de lesão para afastar Carcinoma Espinocelular.
        - Notificação compulsória (SINAN) e tratamento de parcerias sexuais dos últimos 90 dias.
      * **Manejo da Sífilis e Reação de Jarisch-Herxheimer**:
        - Estadiamento preciso: Primária/Secundária/Latente Recente (Penicilina G Benzatina 2.400.000 UI IM dose única fracionada em 1,2M UI por glúteo) vs Latente Tardia/Ignorada (Penicilina G Benzatina 2.400.000 UI IM semanal por 3 semanas consecutivas - total 7.200.000 UI) vs Neurossífilis (Penicilina Cristalina IV 18-24M UI/dia por 10-14 dias em internação com punção lombar).
        - Alerta educativo sobre Reação de Jarisch-Herxheimer nas primeiras 24 horas: liberação aguda de endotoxinas, autolimitada, tranquilização do paciente, sintomáticos e monitoramento de vitalidade fetal em gestantes.
        - Critérios de cura sorológica com VDRL: queda de 2 titulações (ou 4 vezes) em 6 meses (sífilis recente) e 12 meses (sífilis tardia); desmistificação da cicatriz sorológica.
      * **Mpox (Monkeypox / Orthopoxvirus) e Biossegurança**:
        - Tríade clássica: febre + linfadenomegalia dolorosa acentuada + vesículas/pústulas umbilicadas com acometimento anogenital e mucosas.
        - Biossegurança: isolamento domiciliar estrito até a queda de todas as crostas e reepitelização completa; EPI profissional com máscara PFF2/N95, óculos e capote.
        - Manejo de proctite intensa: banho de assento morno, anestésico tópico e analgesia escalonada.
    - Integração Fastify RPC (`cockpitDermatologiaLesao`, `cockpitDermatologiaHerpes`, `cockpitHerpes`, `cockpitZoster`, `cockpitDermatologiaUlcerasGenitais`, `cockpitUlceraGenital`, `cockpitDermatologiaSifilis`, `cockpitSifilis`, `cockpitDermatologiaMpox`, `cockpitMpox`), comandos Telegram (`/dermato`, `/lesao`, `/lesoes`, `/pele`, `/herpes`, `/zoster`, `/aciclovir`, `/valaciclovir`, `/ulceragenital`, `/cancro`, `/donovanose`, `/lgv`, `/sifilis`, `/biett`, `/roseola`, `/mpox`, `/monkeypox`), manual de ajuda expandido e suíte de testes dedicados `tests/test_dermatologia_lesoes_ists.cjs` 100% aprovada.

54. [x] **Emergência Clínica - Choque Séptico Refratário e Manejo de Insuficiência Adrenal Relativa (CIRCI)**:
    - Escore de suspeição de CIRCI e indicação precisa de Hidrocortisona 200 mg/dia contínua em choque dependente de doses elevadas de vasopressores (> 0,25 mcg/kg/min).
    - Protocolo de titulação de Vasopressina (0,03 U/min fixa) associada.\n    - 🛑 EXPURGO: Azul de Metileno removido por ser conduta terciária exclusiva de UTI (vasoplegia pós-operatória), focando o módulo estritamente no Generalista/PS.

55. [ ] **Otorrinolaringologia e Urgência - Manejo de Epistaxe Aguda e Vertigem Periférica vs Central (Protocolo HINTS / Bárány Society)**:
    - Algoritmo de diferenciação de vertigem aguda (HINTS: Head Impulse, Nystagmus, Test of Skew) prevenindo atraso no diagnóstico de AVC cerebelar/tronco encefálico.
    - Protocolo escalonado de epistaxe anterior e posterior com critérios seguros de tamponamento (anterior vs balão/sonda de Foley) e monitorização de hipóxia.

56. [ ] **Hematologia e Trombose - Manejo da Trombocitopenia Induzida por Heparina (HIT - Escore 4Ts) e CIVD**:
    - Calculadora determinística beira-leito do escore 4Ts para estimar probabilidade pré-teste de HIT tipo II.
    - Bloqueio imediato de todas as formas de heparina (HNF e HBPM) e indicação oportuna de anticoagulantes não heparínicos (Fondaparinux / Inibidores Diretos de Trombina) e contraindicação formal de Varfarina na fase aguda.
    - Escore ISTH para Coagulação Intravascular Disseminada (CIVD) manifesta com metas de suporte hemoterápico.

57. [ ] **Nefrologia & Medicina de Emergência - Rabdomiólise Aguda e Manejo da Nefroproteção (Escore McMahon)**:
    - Estratificação de risco de lesão renal aguda e necessidade de terapia renal substitutiva com base no escore McMahon (CPK, fósforo, cálcio, bicarbonato).
    - Protocolo de hidratação venosa vigorosa dirigida por metas (diurese alvo 200 a 300 mL/h) com cristaloides e critérios restritivos para alcalinização urinária com bicarbonato de sódio.

58. [ ] **Hematologia e Emergência - Reversão de Anticoagulantes Orais e Heparinas (Idarucizumabe, Andexanet Alfa, Complexo Protrombínico e Protamina)**:
    - Diretrizes SBC/ISTH para reversão emergencial de DOACs (Dabigatrana, Rivaroxabana, Apixabana) e Varfarina em sangramento com risco de morte ou cirurgia de urgência.
    - Cálculo posológico de Complexo Protrombínico (PCC 4 fatores: 25 a 50 UI/kg guiado pelo RNI) associado a Vitamina K1 10 mg IV lento.
    - Posologia estrita de Protamina (1 mg neutraliza 100 UI de HNF; neutralização parcial de HBPM) prevenindo hipotensão e anafilaxia.

59. [ ] **Infectologia e Controle de Infecção Hospitalar (CCIH) - Stewardship Antimicrobiano e Rastreio de Microrganismos Multirresistentes (MDR / KPC / VRE / MRSA)**:
    - Motor determinístico de escalonamento/descalonamento antimicrobiano guiado por culturas e antibiograma institucional.
    - Protocolo de dosagem e monitoramento de Vancomicina (alvo AUC/MIC 400-600 ou vale 15-20 mcg/mL), Polimixina B ponderada sem ajuste renal e Daptomicina em altas doses.
    - Esquemas de cobertura para enterobactérias produtoras de carbapenemase (KPC/NDM) com Ceftazidima-Avibactam e Aztreonam.

60. [ ] **Cirurgia Geral e Trauma - Manejo Inicial do Politraumatizado (Protocolo ATLS 10ª Edição e Escore eFAST)**:
    - Algoritmo determinístico beira-leito do ABCDE com identificação imediata de lesões ameaçadoras à vida (Pneumotórax Hipertensivo com descompressão por toracocentese no 4º/5º EIC, Hemotórax Maciço, Tamponamento Cardíaco com Tríade de Beck).
    - Cálculo de Índice de Choque no trauma (FC/PAS > 0.9 indicativo de hemorragia oculta) e ativação do Protocolo de Transfusão Maciça 1:1:1 (CHAD, PFC, Plaquetas) com Ácido Tranexâmico 1g IV na 1ª hora (CRASH-2).



61. [ ] **Nutrologia - Reposição de Micronutrientes em Cirurgia Bariátrica (Pós-Operatório)**:
    - Motor determinístico para cálculo e prescrição de vitaminas do complexo B (especialmente B12), Vitamina D, Cálcio (Citrato vs Carbonato), Ferro e Zinco conforme o tipo de técnica cirúrgica (restritiva vs disabsortiva/Bypass/Duodenal Switch).
    - Alertas de monitoramento laboratorial de rotina para deficiências ocultas de micronutrientes.

62. [ ] **Módulo de Reanimação Neonatal (PRN/SBP 2026)**:
    - Passos iniciais de estabilização do RN em sala de parto, indicações de VPP (Ventilação com Pressão Positiva), intubação e massagem cardíaca baseados em APGAR e FC < 100 ou < 60 bpm.
    - Doses de adrenalina (0.01 a 0.03 mg/kg IV) e expansor de volume (SF 0.9% 10 mL/kg) para neonatos em PCR.

63. [ ] **Módulo Avançado de Terapia Imunossupressora e Transplantes (Rejeição Aguda e CMV)**:
    - Motor determinístico de dosagem e monitoramento de níveis séricos de inibidores de calcineurina (Tacrolimo e Ciclosporina) com detecção de toxicidade.
    - Protocolo de profilaxia e tratamento preemptivo de infecção por Citomegalovírus (CMV) no pós-transplante com Ganciclovir/Valganciclovir.

64. [ ] **Ginecologia - Rastreio e Manejo de Osteoporose na Pós-Menopausa (FRAX e NAMS)**:
    - Integração de cálculo FRAX específico para a população feminina.
    - Regras determinísticas para reposição segura de Bisfosfonatos (Alendronato), Denosumabe e Teriparatida com monitoramento de cálcio e vitamina D basal.

65. [ ] **Módulo de Nefrologia: Manejo Conservador da Doença Renal Crônica (DRC)**:
    - Estadiamento determinístico KDIGO e acompanhamento de albuminúria.
    - Metas pressóricas e indicação de iECA/BRA para nefroproteção.
    - Alerta estruturado para restrição proteica e evitar AINEs.

66. [ ] **Cardiologia: Manejo de Hipertensão Arterial Resistente e Secundária**:
    - Algoritmo de identificação e manejo de HAS resistente (falha com 3 drogas em doses otimizadas incluindo diurético).
    - Rastreio de causas secundárias (hiperaldosteronismo primário, feocromocitoma, estenose de artéria renal).

67. [ ] **Módulo de Suporte Ventilatório Neonatal Avançado**:
    - Calculadora determinística para parâmetros iniciais de Ventilação Mecânica Convencional e VAFO em prematuros.
    - Metas de oxigenação (alvos de saturação e PaO2) rigorosas para prevenção de Retinopatia da Prematuridade.
    - Protocolo de administração e dosagem de Surfactante Pulmonar (MIST/LISA) beira-leito.

68. [ ] **Integração de Notificação Compulsória Inteligente**:
    - Motor de detecção automática de doenças de notificação compulsória (DNC) baseado em hipóteses diagnósticas (Dengue, Sífilis, Tuberculose).
    - Mapeamento e alerta das janelas de tempo de notificação (imediata em 24h vs semanal) com links/direcionamento para preenchimento no SINAN.


67. [ ] **Endocrinologia - Manejo de Tempestade Tireoidiana e Coma Mixedematoso (ATA / ETA)**:
    - Escores diagnósticos determinísticos (escore de Burch-Wartofsky).
    - Protocolos de bloqueio tireoidiano (PTU vs Metimazol, Lugol, Hidrocortisona).
    - Reposição guiada de levotiroxina IV no coma mixedematoso com ajuste para risco cardiovascular.

68. [ ] **Gastroenterologia - Doença Inflamatória Intestinal (DII - Crohn e RCUI) na Urgência**:
    - Estratificação de gravidade (Critérios de Truelove-Witts) e indicações de internação.
    - Manejo do Megacólon Tóxico e esquema corticoterápico IV para ataques agudos graves.

69. [ ] **Reumatologia - Manejo Agudo da Crise de Gota e Artrite Microcristalina (ACR)**:
    - Posologia guiada de Colchicina com limites baseados na função renal (ClCr).
    - Seleção segura de AINEs vs Corticoides sistêmicos/intra-articulares baseados em comorbidades.

70. [ ] **Ferramenta de Simulação e Treinamento de RCP Avançado (Cockpit-Sim)**:
    - Motor interativo para criar simulações de casos clínicos (Mega Code) para treinamento de residentes.
    - Avaliação do tempo de resposta (ex: tempo porta-agulha, tempo de reconhecimento de ritmos chocáveis).
    - Feedback imediato de diretrizes violadas no Mega Code (ex: interrupção de massagem > 10s).

71. [ ] **Módulo de Terapia Intensiva - Desmame Ventilatório e Extubação**:
    - Calculadora determinística do Índice de Respiração Rápida e Superficial (Tobin).
    - Protocolo de Teste de Respiração Espontânea (TRE) com tubo T ou PSV e critérios de falha.
    - Estratificação de risco para falha de extubação e profilaxia com VNI ou CNAF (Cânula Nasal de Alto Fluxo).

72. [ ] **Infectologia - Rastreio e Manejo de Arboviroses (Dengue, Zika, Chikungunya)**:
    - Estadiamento de Dengue (Grupos A, B, C e D) com base no Ministério da Saúde.
    - Cálculo determinístico de hidratação vigorosa oral (Grupo B) e venosa (Grupos C e D) em mL/kg/h.
    - Painel visual para acompanhamento da curva do hematócrito vs plaquetas.

73. [ ] **Módulo de Psiquiatria de Ligação - Delirium Hospitalar e Manejo Não-Farmacológico**:
    - Motor de rastreio beira-leito com método CAM-ICU (Confusion Assessment Method) e critérios do DSM-5-TR.
    - Protocolo restritivo para indicação de contenção farmacológica em Delirium Hiperativo, com resgate por Dexmedetomidina ou baixas doses de Haloperidol IV, e alerta de contraindicação formal de Benzodiazepínicos.
    
74. [ ] **Ferramenta Determinística de Profilaxia de Úlcera de Estresse (SUP) em UTI**:
    - Checklist inteligente dos fatores maiores (VM > 48h, coagulopatia, TCE grave, queimadura extensa) e menores.
    - Suspensão programada (des-prescrição automática) assim que o paciente for extubado ou passar a receber dieta enteral plena, reduzindo infecções hospitalares (Pneumonia Associada à Ventilação e Clostridium difficile).

75. [ ] **Cardiologia Clínica - Manejo Guiado da Hipercalemia Aguda**:
    - Motor estruturado em 4 etapas: estabilização miocárdica (Gluconato de Cálcio obrigatório se ECG alterado), redistribuição (Glicoinsulina IV e Salbutamol NBZ), eliminação corporal (Furosemida, Resina de Troca) e reversão de causa base.
    - Teste de segurança para evitar erro fatal: bloqueio de bolus de insulina sem glicose associada, e limite de uso de gluconato em toxicidade por digitálico.

76. [ ] **Neurologia e UTI - Protocolo de Morte Encefálica (Resolução CFM 2.173/2017)**:
    - Checklist inteligente para pré-requisitos absolutos: exclusão de distúrbios hidro-eletrolíticos severos, hipotermia (< 35°C) e efeito de drogas sedativas/bloqueadores neuromusculares.
    - Guia passo-a-passo para os 2 exames clínicos (com intervalo conforme idade) e o teste de apneia com validação gasométrica estrita (PaCO2 > 55 mmHg).
    - Alertas de segurança exigindo pelo menos um médico com capacitação comprovada ou especialista (Neurologia, Medicina Intensiva, Emergência).

77. [ ] **Obstetrícia - Manejo Avançado da Hemorragia Pós-Parto (HPP) e Índice de Choque**:
    - Motor de cálculo de Índice de Choque Obstétrico (FC / PAS), onde >= 0.9 aciona código amarelo e > 1.1 aciona código vermelho de transfusão maciça.
    - Protocolo escalonado (4 Ts: Tônus, Trauma, Tecido, Trombina) com posologia encadeada de Ocitocina, Metilergometrina (bloqueio se HAS/Pré-eclâmpsia), Misoprostol e Ácido Tranexâmico.

78. [ ] **Farmacologia - Identificador Inteligente de Prolongamento de Intervalo QTc**:
    - Algoritmo que cruza a prescrição do paciente (ex: Haloperidol, Ondansetrona, Azitromicina, Amiodarona) e calcula o risco de Torsades de Pointes.
    - Fórmula de Bazett integrada com alertas preventivos antes da dispensação da droga quando QTc > 500ms ou risco cumulativo extremo.

79. [ ] **Pneumologia e Emergência - Abordagem do Tromboembolismo Pulmonar Agudo (TEP - Escore Wells / Genebra / PESI / sPESI)**:
    - Estratificação determinística de probabilidade clínica pré-teste (Wells e Genebra revisado) e indicação racional de D-dímero vs Angiotomografia de Artérias Pulmonares imediata.
    - Escore de gravidade PESI e PESI simplificado (sPESI) para decisão de tratamento ambulatorial seguro (sPESI = 0) vs internação em enfermaria/UTI.
    - Algoritmo de TEP de Alto Risco / Maciço com instabilidade hemodinâmica (choque/hipotensão PAS < 90 mmHg): protocolo determinístico de trombólise de emergência com Alteplase 100 mg em 2h (ou 50 mg em PCR/iminência de parada) e suporte de falência de ventrículo direito.

80. [ ] **Medicina Perioperatória - Avaliação de Risco Cardiovascular Pré-Operatório (Escore EMAPO / Lee / RCRI / Metas perioperatórias)**:
    - Calculadora determinística do Índice de Risco Cardíaco Revisado de Lee (RCRI) e diretrizes da SBC/ACC/AHA para cirurgias não-cardíacas.
    - Avaliação da capacidade funcional estimada em Equivalentes Metabólicos (METs < 4 indicando alto risco) e estratificação por risco cirúrgico intrínseco.
    - Manejo perioperatório de fármacos de uso crônico: regras precisas de manutenção ou suspensão de AAS, DOACs, Varfarina, Betabloqueadores, Estatinas, iECA/BRA e iSGLT2 (suspensão 3-4 dias antes para prevenir cetoacidose euglicêmica).

81. [ ] **Pediatria e Urgência - Manejo de Convulsão Febril e Estado de Mal Epiléptico Pediátrico**:
    - Classificação rápida entre Convulsão Febril Simples vs Complexa (focal, > 15 min ou recorrência em 24h) com orientações para a família e afastamento seguro de punção lombar rotineira se sem sinais meníngeos.
    - Linha do tempo de parada de convulsão ativa em emergência pediátrica (0-5 min: ABC, glicemia e oxigênio; 5-10 min: 1ª dose de Benzodiazepínico - Midazolam IM/intranasal ou Diazepam retal/IV; 10-15 min: 2ª dose; > 15 min: anticonvulsivante de 2ª linha com Fenitoína 20 mg/kg ou Levetiracetam 60 mg/kg IV).
    - Alerta crítico para evitar doses excessivas repetidas de benzodiazepínicos que causem depressão respiratória iatrogênica.

82. [ ] **Infectologia e Urgência - Manejo de Meningite Bacteriana Aguda na Emergência (Diretrizes SBD / IDSA)**:
    - Triagem beira-leito para indicação prévia de TC de crânio antes da Punção Lombar (mnemônico FAILS: Déficit Focal, Idade >= 60, Imunossupressão, Lesão/Glasgow < 10, Crise convulsiva recente).
    - Protocolo hiperprecoce de antibioticoterapia empírica (< 30 min da suspeita: Ceftriaxona 2g IV 12/12h + Ampicilina 2g IV 4/4h se >= 50 anos ou imunocomprometido para cobertura de Listeria monocytogenes + Vancomicina).
    - Corticoterapia adjuvante obrigatória: Dexametasona 10mg IV 15-20 min ANTES ou junto da primeira dose de antimicrobiano para prevenir sequelas auditivas e neurológicas em pneumococo.
    - Interpretação determinística do líquor (LCR): pleocitose neutrofílica, hiperproteinorraquia > 100-200 mg/dL, consumo de glicose (relação LCR/glicemia sérica < 0.4) e profilaxia de contatos íntimos com Rifampicina ou Ceftriaxona.

83. [ ] **Endocrinologia de Urgência - Manejo da Crise Adrenal Aguda e Insuficiência Adrenal Primária vs Secundária**:
    - Reconhecimento precoce de crise adrenal (choque refratário a aminas com hiponatremia, hipercalemia e hipoglicemia).
    - Protocolo imediato de reposição de corticoide: Hidrocortisona 100mg IV em bolus imediato seguido de 50mg IV a cada 6h (ou 200mg/24h em infusão contínua), SEM aguardar dosagem hormonal.
    - Ressuscitação volêmica vigorosa com SF 0.9% e glicose 5-10% para reverter hipovolemia e hipoglicemia; contraindicação de diuréticos de alça.
    - Transição pós-estabilização para dose de manutenção ambulatorial (Hidrocortisona 15-25 mg/dia fracionada + Fludrocortisona 0.05-0.1 mg/dia se insuficiência primária/doença de Addison) com orientações para "dias de estresse" (dobrar a dose se febre ou infecção).

84. [ ] **Gastroenterologia e Emergência - Manejo da Apendicite Aguda e Abdome Agudo Inflamatório (Escore de Alvarado e AIR)**:
    - Calculadora determinística beira-leito dos escores Alvarado e AIR (Appendicitis Inflammatory Response) com estratificação de probabilidade (baixo risco < 4: alta segura com orientação; risco intermediário 5-6: USG/TC com contraste; alto risco >= 7: avaliação cirúrgica imediata).
    - Protocolo de antibioticoterapia pré-operatória profilática (Ciprofloxacino + Metronidazol ou Ceftriaxona + Metronidazol) iniciada em até 1h antes da incisão.
    - Bloqueio de analgesia com AINEs em pacientes desidratados ou com suspeita de abdome agudo perfurativo antes da avaliação do cirurgião geral.

85. [ ] **Hematologia e Hemoterapia Avançada - Manejo de Reações Transfusionais e Aloimunização (Escore TACO vs TRALI / Hemovigilância)**:
    - Algoritmo determinístico beira-leito com critérios objetivos de diferenciação rápida entre TACO e TRALI (BNP/NT-proBNP, ecocardiograma, balanço hídrico, resposta a diurético e infiltrado bilateral).
    - Protocolo de hemovigilância imediata (notificação NOTIVISA / Hemovida) e fluxo de investigação sorológica e imuno-hematológica pós-reação.
    - Diretriz de transfusão fenotipada (Rh estendido, Kell, Duffy, Kidd) em pacientes politransfundidos (Anemia Falciforme e Talassemia Major) para prevenção primária de aloimunização.

86. [ ] **Cardiologia e Emergência - Manejo da Crise Hipertensiva: Emergência vs Urgência Hipertensiva (Diretrizes SBC / ESC)**:
    - Diferenciação determinística entre Emergência Hipertensiva (lesão aguda de órgão-alvo: EAP, Dissecção Aórtica, Encefalopatia Hipertensiva, SCA, AVC) e Urgência Hipertensiva (PA elevada sem LOA aguda).
    - Protocolo de titulação em bomba de infusão de Nitroprussiato de Sódio e Nitroglicerina com metas rígidas de redução de PAM (máximo de 20-25% na 1ª hora, exceto na Dissecção Aórtica onde PAS < 120 e FC < 60 bpm em 20 min com Esmolol/Labetalol).
    - Alerta sentinela de toxicidade por cianeto/tiocianato em infusões prolongadas de Nitroprussiato (> 48h ou > 2 mcg/kg/min em insuficiência renal).

87. [ ] **Infectologia e Terapia Intensiva - Manejo da Candidemia e Infecções Fúngicas Invasivas (Diretrizes IDSA / SBI)**:
    - Escore determinístico de predição de infecção fúngica invasiva (Candida Score: NPT, cirurgia prévia, sepse grave, colonização multifocal) para indicação oportuna de antifungicidoterapia preemptiva.
    - Protocolo posológico de Echinocandinas de 1ª linha (Anidulafungina 200mg ataque + 100mg/dia ou Caspofungina 70mg + 50mg/dia) com cobertura estrita para espécies não-albicans (C. glabrata, C. krusei).
    - Rastreio obrigatório de fundoscopia ocular (descarte de endoftalmite) e ecocardiograma (descarte de endocardite fúngica) e retirada mandatória de cateter venoso central.

88. [ ] **Módulo de Neonatologia - Manejo da Icterícia Neonatal (AAP 2022)**:
    - Motor determinístico para indicação de fototerapia e exsanguinotransfusão baseado no nomograma de Bhutani e diretrizes da AAP 2022 (zonas de risco, IG e fatores de risco neurotóxico).
    - Integração de cálculo de Bilirrubina Total e Frações (direta/indireta) com rastreio de hemólise (incompatibilidade Rh/ABO, reticulócitos, Coombs).

89. [ ] **Ferramenta de Auditoria de Antimicrobianos em UTI (Stewardship)**:
    - Alerta de descalonamento guiado por cultura (CCIH) e notificação de toxicidade acumulada (ex: vancomicina + piperacilina-tazobactam com risco de LRA).
    - Revisão automática do tempo de tratamento (DOT - Days of Therapy) para evitar uso prolongado desnecessário (ex: 7 dias para PAV vs 14 dias para bacteremia por S. aureus).

90. [ ] **Módulo de Geriatria - Rastreio de Sarcopenia e Síndrome da Fragilidade (Escore SARC-F e FRAIL)**:
    - Diagnóstico rápido beira-leito para predição de eventos adversos, quedas e mortalidade intra-hospitalar.
    - Plano automatizado de reabilitação fisioterápica (exercícios resistidos) e prescrição de suplementação proteica ajustada à função renal e HMB (Beta-hidroxi-beta-metilbutirato).

90. [ ] **Neurologia de Emergência - Manejo do Estado de Mal Epiléptico em Adultos**:
    - Protocolo escalonado (0-5 min, 5-20 min, 20-40 min) com doses maximais de Benzodiazepínicos e dose de ataque de Fenitoína (20mg/kg) vs Levetiracetam.
    - Indicação de intubação e indução anestésica (Propofol/Midazolam) para estado de mal refratário.

91. [ ] **Infectologia - Manejo de ITU de Repetição e Profilaxia (SBU / IDSA)**:
    - Diferenciação entre reinfecção e recidiva bacteriana.
    - Algoritmo de profilaxia contínua vs pós-coito (Nitrofurantoína, Fosfomicina, Cefalexina) com alertas de segurança prolongados (ex: neuropatia por Nitrofurantoína e função renal).


92. [ ] **Ginecologia - Avaliação e Manejo de Sangramento Uterino Anormal (PALM-COEIN)**:
    - Ferramenta diagnóstica estruturada usando classificação FIGO.
    - Algoritmo de manejo agudo com altas doses de Ácido Tranexâmico, AINEs ou Terapia Hormonal (Estrogênio IV ou Progestágenos) para sangramento abundante na urgência.

93. [ ] **Nutrologia - Terapia Nutricional Parenteral Individualizada na UTI**:
    - Motor determinístico para cálculo de VET (Valor Energético Total) usando equações de Penn State ou regra de bolso (25-30 kcal/kg).
    - Distribuição automatizada de macronutrientes e alertas para Síndrome da Realimentação.

94. [ ] **Gastroenterologia - Manejo de Ascite e Peritonite Bacteriana Espontânea (PBE) na Cirrose**:
    - Critérios determinísticos de paracentese diagnóstica (GASA > 1.1 g/dL) e predição de PBE (PMN > 250/mm3).
    - Protocolo de profilaxia primária e secundária com Norfloxacino e reposição de Albumina para prevenção de Síndrome Hepatorrenal.

95. [ ] **Imunologia Clínica - Manejo Prático da Anafilaxia (WAO)**:
    - Checklist beira-leito rápido para diagnóstico clínico (Pele + 1 outro sistema).
    - Dosagem escalonada de Adrenalina IM (0.01 mg/kg) no vasto lateral da coxa com temporizador de repetição a cada 5-15 minutos.

96. [ ] **Cardiologia e Emergência - Manejo de Parada Cardiorrespiratória e Ritmos Chocáveis vs Não-Chocáveis (ACLS / AHA 2020-2025)**:
    - Motor determinístico de cronometragem de ciclos de RCP (2 min por ciclo, compressões 100-120/min, profundidade 5-6 cm).
    - Algoritmo de ritmos chocáveis (FV/TV sem pulso): Desfibrilação bifásica 200J -> Epinefrina 1mg IV 3-5 min -> Amiodarona 300mg / 150mg (ou Lidocaína).
    - Algoritmo de ritmos não-chocáveis (AESP / Assistolia): Epinefrina precoce imediata + Checklist mnemônico beira-leito dos 5Hs e 5Ts.
    - Protocolo pós-RCE: Controle direcionado de temperatura (TTM 32-36°C), PAM alvo >= 65 mmHg e ECG imediato de 12 derivações.

97. [ ] **Nefrologia e Terapia Intensiva - Manejo de Distúrbios do Sódio: Hiponatremia Aguda vs Crônica e Hipernatremia (Diretrizes Europeias / US)**:
    - Diferenciação determinística entre hiponatremia aguda sintomática (crise convulsiva, coma) vs crônica (> 48h).
    - Protocolo de salina hipertônica 3% (bolus de 100-150 mL em 10-20 min, meta de elevação rápida de 4-6 mEq/L para cessar sintomas).
    - Regra de ouro da taxa máxima de correção: bloqueio sentinela estrito impedindo correção > 8-10 mEq/L em 24h para prevenir Mielinólise Pontina Central.
    - Cálculo do Déficit de Água Livre na hipernatremia pela Fórmula de Androgué-Madias para SG 5% ou SF 0.45%.

98. [ ] **Gastroenterologia e Emergência - Escore de Glasgow-Blatchford e Rockall para Hemorragia Digestiva Alta (HDA)**:
    - Calculadora determinística beira-leito do escore de Glasgow-Blatchford (GBS 0-23 pts) para estratificação pré-endoscópica (baixo risco score 0-1 para alta precoce).
    - Escore de Rockall completo (pré e pós-endoscópico) para predição de ressangramento e mortalidade.
    - Alertas automáticos para infusão de IBP IV contínuo, Terlipressina precoce em hipertensão portal e profilaxia de PBE com Ceftriaxona.

99. [ ] **Infectologia e Medicina Intensiva - Manejo da Pneumonia Adquirida na Comunidade Grave (PAC) e Escore SMART-COP / CURB-65 Avançado**:
    - Motor determinístico de estratificação de gravidade (CURB-65 e SMART-COP para predição precoce de necessidade de ventilação mecânica ou vasopressores em até 24h).
    - Algoritmo de escolha antibiótica empírica de 1ª linha (Betalactâmico IV + Macrolídeo vs Quinolona Respiratória) com descalonamento guiado por teste rápido de antígeno urinário (Pneumococo e Legionella).
    - Bloqueio de fluoroquinolonas em suspeita de tuberculose ou QT longo (> 480ms) e protocolo de corticoterapia adjuvante precoce na PAC grave com choque séptico (Hidrocortisona 200 mg/dia).

100. [ ] **Terapia Intensiva e Farmacologia Clínica - Manejo de Sedação, Analgesia e Delirium em UTI (Protocolo PADIS 2026 / Escala CAM-ICU & RASS)**:
    - Algoritmo de titulação guiada por metas da Escala RASS (-1 a 0 para sedação leve / cooperativa) e CPOT para dor em paciente não comunicativo.
    - Estratégia de analgesia em primeiro lugar (Analgo-sedação) priorizando Fentanil/Remifentanil e poupando Benzodiazepínicos (Midazolam restrito).
    - Triagem diária e sistemática de Delirium com escore CAM-ICU (flutuação aguda, desatenção, pensamento desorganizado, alteração de nível de consciência) e protocolo de manejo não farmacológico + uso racional de Dexmedetomidina vs Quetiapina.

101. [ ] **Cardiologia e Emergência - Abordagem Diagnóstica e Terapêutica da Síncope (Diretrizes ESC / SBC 2024-2026 e Escore de OESIL / San Francisco)**:
    - Estratificação de alto risco imediato (alterações no ECG, cardiopatia estrutural prévia, síncope ao esforço ou em decúbito dorsal, ausência de pródromos autonômicos).
    - Calculadora determinística beira-leito dos escores OESIL e San Francisco Syncope Rule para predição de desfecho adverso em 30 dias.
    - Critérios formais para internação em UTI/Unidade Coronariana vs investigação ambulatorial com Tilt Test / Holter / Looper implantável.

102. [ ] **Hematologia e Medicina Intensiva - Manejo da Anemia Falciforme e Crises Falcêmicas Agudas (Síndrome Torácica Aguda, Crise Vaso-Oclusiva e Sequestro Esplênico)**:
    - Protocolo escalonado de analgesia de emergência para Crise Vaso-Oclusiva (CVO) com opioides precoces (Morfina IV em até 30 min da admissão) e hidratação parcimoniosa para evitar edema pulmonar.
    - Reconhecimento determinístico imediato da Síndrome Torácica Aguda (STA: novo infiltrado pulmonar + febre/dor torácica/hipoxemia) com indicação precoce de transfusão simples vs exsanguinotransfusão parcial (alvo Hb ~10 g/dL, HbS < 30%) e antibioticoterapia de amplo espectro (Ceftriaxona + Macrolídeo).
    - Protocolo de prevenção secundária com Hidroxiureia ponderada (15-35 mg/kg/dia) com monitorização de mielotoxicidade e profilaxia antipneumocócica.

103. [ ] **Neurologia e Terapia Intensiva - Manejo do Traumatismo Cranioencefálico Grave (TCE) e Monitorização de Pressão Intracraniana (Brain Trauma Foundation 4ª Edição)**:
    - Checklist determinístico de admissão pelo escore da Escala de Coma de Glasgow (ECG <= 8: indicação formal de IOT com proteção de coluna cervical e monitorização de PIC).
    - Metas estritas de neuroproteção beira-leito: PAM alvo >= 80 mmHg (PPC alvo entre 60 e 70 mmHg), PaO2 >= 80 mmHg (evitar hipóxia), PaCO2 normocápnica entre 35 e 40 mmHg (contraindicação formal de hiperventilação profilática prolongada por risco de isquemia cerebral).
    - Protocolo em escada para crise de Hipertensão Intracraniana (PIC > 22 mmHg): cabeceira 30°, sedoanalgesia profunda, terapia osmolar em bolus (Salina Hipertônica 3% ou Manitol 20%), bloqueio neuromuscular e craniectomia descompressiva de resgate.

104. [ ] **Endocrinologia e Terapia Intensiva - Manejo da Tempestade Tireotóxica e Crise Mixedematosa (Escore de Burch-Wartofsky e Critérios Popovic)**:
    - Calculadora determinística beira-leito do escore de Burch-Wartofsky (BWPS: temperatura, efeitos no SNC, disfunção cardiovascular, IC, disfunção hepática; pontuação >= 45 fortemente sugestiva de tempestade tireotóxica).
    - Protocolo farmacológico sequencial em 4 etapas estritas: 1) Bloqueio adrenérgico (Propranolol 60-80mg VO 4/4h ou Esmolol IV); 2) Bloqueio de síntese (Propiltiouracil 200mg 4/4h preferencial vs Metimazol); 3) Bloqueio de liberação (Iodeto de Potássio / Solução de Lugol iniciado 1 HORA APÓS o antitireoidiano para evitar o efeito Jod-Basedow); 4) Bloqueio de conversão periférica T4->T3 com Hidrocortisona 100mg IV 8/8h.
    - Manejo emergencial do Coma Mixedematoso: Hidrocortisona empírica prévia (evitar crise adrenal) seguida de Levotiroxina IV/VO e aquecimento passivo.

105. [ ] **Nutrologia e Cirurgia Pediátrica - Nutrição Parenteral Total (NPT) e Terapia de Reposição Eletrolítica Complexa em Neonatos Cirúrgicos**:
    - Motor de cálculo de NPT neonatal beira-leito.
    - Metas de aminoácidos, lipídios e taxa de infusão de glicose rigorosa para prevenção de falência hepática associada à NPT.

106. [ ] **Pediatria e Infectologia - Rastreio e Conduta em Sífilis Congênita e Neurossífilis Neonatal (MS / SBP)**:
    - Interpretação determinística do VDRL materno vs neonatal.
    - Posologia guiada de Penicilina Cristalina IV vs Penicilina Procaína IM com alertas de segurança.

107. [ ] **Ginecologia - Protocolo de Anticoncepção de Emergência e Profilaxia Pós-Exposição (PEP) em Violência Sexual**:
    - Workflow determinístico temporal (até 72h para Levonorgestrel / até 120h para DIU de cobre).
    - Prescrição imediata de PEP (Tenofovir/Lamivudina + Dolutegravir) e Azitromicina + Ceftriaxona para ISTs.

108. [ ] **Nefrologia Pediátrica e Emergência - Manejo da Síndrome Hemolítico-Urêmica (SHU) e Injúria Renal Aguda Pediátrica (pRIFLE / KDIGO Pediátrico)**:
    - Tríade clássica determinística: anemia hemolítica microangiopática (esquizócitos, Coombs negativo, LDH elevada), plaquetopenia de consumo e injúria renal aguda oligoanúrica associada a pródromo de diarreia sanguinolenta por *E. coli* produtora de toxina Shiga (STEC).
    - Bloqueios absolutos beira-leito: contraindicação formal de antibioticoterapia na diarreia enterohemorrágica (evitar liberação maciça de toxina Shiga) e contraindicação de transfusão profilática de plaquetas (risco de microtrombose acelerada).
    - Critérios para diálise peritoneal de urgência e indicação de Eculizumabe na SHU atípica mediada por complemento.

109. [ ] **Gastroenterologia Pediátrica - Manejo da Doença do Refluxo Gastroesofágico (DRGE) vs Regurgitador Feliz do Lactente (Diretrizes SBP / NASPGHAN / ESPGHAN)**:
    - Diferenciação determinística entre Refluxo Gastroesofágico Fisiológico ("regurgitador feliz", lactente eutrófico com ganho ponderal adequado, sem dor ou broncoespasmo) e DRGE Patológica (falha de crescimento, esofagite, síndrome de Sandifer, aspirações respiratórias recorrentes).
    - Medidas não farmacológicas de 1ª linha: decúbito dorsal seguro no berço (contraindicação de posição prona sem monitorização pelo risco de morte súbita), fracionamento de mamadas e espessamento de fórmula.
    - Uso racional de IBP (Omeprazol/Esomeprazol 1 mg/kg/dia) restrito aos casos comprovados de DRGE erosiva com bloqueio de prescrição empírica para cólicas do lactente.

110. [ ] **Neonatologia e UTI Neonatal - Manejo da Síndrome do Desconforto Respiratório do Recém-Nascido (SDR / Membrana Hialina) e Surfactante Exógeno (Diretrizes SBP / Consenso Europeu)**:
    - Estratificação determinística de gravidade em pré-termos < 34 semanas pelo Boletim de Silverman-Andersen (BSA: tiragem intercostal, retração xifoide, batimento de asa de nariz, gemido expiratório e dissociação toracoabdominal).
    - Estratégia não invasiva precoce em sala de parto com CPAP nasal (5-6 cmH2O) desde os primeiros minutos de vida.
    - Protocolo LISA (Less Invasive Surfactant Administration) ou MIST / INSURE com Surfactante Porcino (200 mg/kg na 1ª dose) se necessidade de FiO2 > 30% em CPAP, evitando ventilação mecânica invasiva e broncodisplasia pulmonar.

111. [ ] **Gastroenterologia e Endoscopia Digestiva - Manejo da Hemorragia Digestiva Baixa (HDB) Aguda e Escore de Oakland**:
    - Calculadora determinística do escore de Oakland para estratificação de risco de HDB e indicação de alta precoce segura (Oakland <= 8 pontos).
    - Protocolo de ressuscitação hemodinâmica, suspensão temporária de AINEs/anticoagulantes e critérios de colonoscopia urgente em 24h vs angiotomografia computadorizada/arteriografia para sangramento ativo de grande monta.

112. [ ] **Reumatologia e Terapia Intensiva - Crise Lúpica Grave e Nefrite Lúpica Aguda (Diretrizes ACR / EULAR / SBR)**:
    - Estratificação determinística de atividade de doença (escore SLEDAI-2K beira-leito).
    - Protocolo de pulsoterapia com Metilprednisolona (1g/dia por 3 dias) associada a Ciclofosfamida em dose baixa (Euro-Lupus) ou Micofenolato de Mofetila para nefrite lúpica proliferativa (Classe III/IV).
    - Profilaxia de infecções oportunistas (Sulfametoxazol-Trimetoprima para *Pneumocystis jirovecii*) e monitoramento estrito de toxicidade gonadal e mielotoxicidade.

113. [ ] **Pediatria e Infectologia - Manejo de Sepse Pediátrica e Choque Séptico (Diretrizes Surviving Sepsis Campaign Pediatric / PALS 2026)**:
    - Reconhecimento precoce de choque frio (extremidades frias, pulso fino, tempo de enchimento capilar > 2s) vs choque quente (pulsos amplos, vasodilatação).
    - Ressuscitação volêmica ponderada em alíquotas de 10-20 mL/kg de cristaloides balanceados com vigilância estrita de estertores e hepatomegalia (prevenção de sobrecarga hídrica).
    - Titulação de inotrópicos e vasopressores de 1ª linha: Adrenalina para choque frio e Noradrenalina para choque quente, com início precoce via acesso periférico seguro enquanto se obtém acesso central.

110. [ ] **Módulo de Sedoanalgesia e Delirium em UTI (RASS, CAM-ICU e BPS)**:
    - Escala RASS determinística para meta de sedação (ex: -2 a -3 para IOT).
    - Algoritmo de desmame diário de sedação (Wake Up Test).
    - Indicação de Dexmedetomidina (Precedex) vs Propofol vs Midazolam, com alertas de síndrome de infusão do propofol e acúmulo de midazolam na disfunção renal.

111. [ ] **Integração do Escore SOFA e qSOFA (Sepsis-3) com Alertas Pró-ativos**:
    - Cálculo contínuo da disfunção orgânica na UTI (Respiratório, Coagulação, Hepático, Cardiovascular, SNC e Renal).
    - Gatilho automático para alerta de Piora Clínica (aumento de 2 pontos no SOFA) exigindo revisão imediata do Stewardship Antimicrobiano e controle do foco.

---

## ✅ Histórico de Melhorias Concluídas
- [x] (2026-10-09) **Módulo de Obstetrícia & Medicina Fetal: RCF / CIUR e Doppler Obstétrico (Barcelona/ISUOG)**:
   - Motor determinístico beira-leito completo para classificação Delphi (RCF precoce/tardia/PIG), interpretação dopplervelocimétrica (AU, ACM, RCP, uterinas, istmo, DV), estadiamento Barcelona (I-IV) com limiares TRUFFLE, conduta por estágio com IG-alvo de parto, corticoide/neuroproteção e investigação etiológica.
   - Bloqueios de segurança: sildenafila contraindicada (STRIDER), AAS/heparina sem evidência para RCF, proteção contra falso positivo no parser de texto livre.
   - Integrado via Fastify RPC (`cockpitObstetriciaRcf`) e Telegram (`/rcf`, `/ciur`, `/doppler`, `/crescimentofetal`).
   - 25 testes unitários + 2 testes de integração do servidor — 100% aprovados.
   - Kaizen perpétuo: Backlog abastecido com as novas metas 123, 124 e 125.

- [x] **Módulo de Cardiologia Intensiva (Choque Cardiogênico e IC Descompensada)** (2026-10-09):
  * Estratificação Hemodinâmica beira-leito pela classificação de Forrester & Stevenson.
  * Algoritmo determinístico de manejo farmacológico combinado de inotrópicos, vasopressores, diuréticos e vasodilatadores.
  * Bloqueios de segurança críticos: suspensão de betabloqueadores e otimização de diuréticos.
  * Comandos de ativação no Telegram via `/choque`, `/forrester` ou `/ic`.

- [x] (2026-10-09) **Módulo de Hematologia: Manejo e Investigação de Anemias**:
   - Motor determinístico beira-leito para análise completa do hemograma (`src/02_hematologia_anemias.js`).
   - Classificação morfológica precisa por VCM (< 80 microcítica, 80-100 normocítica, > 100 macrocítica), HCM/CHCM (hipocrômica, normocrômica, hipercrômica) e RDW (homogênea vs heterogênea/anisocitose).
   - Diagnóstico diferencial de microcitose com cálculo automático do Índice de Mentzer (VCM/Hemácias: < 13 sugerindo Traço Talassêmico vs >= 13 Anemia Ferropriva) e Índice de Green & King.
   - Avaliação da cinética eritropoietica e resposta medular pelo Índice de Produção Reticulocitária (IPR) com shift factor proporcional ao hematócrito (diferenciação entre anemias hiperproliferativas/regenerativas vs hipoproliferativas/arregenerativas).
   - Integração diagnóstica com marcadores bioquímicos (Ferritina, Saturação de Transferrina, Vitamina B12, Ácido Fólico, LDH, Bilirrubinas e Coombs direto).
   - Calculadora de reposição de ferro oral (VO): posologia para adultos de 60 a 100 mg/dia ou em dias alternados com teto seguro de 200 mg/dia (prevenção de bloqueio por hepcidina e intolerância gastrointestinal); posologia pediátrica ponderada de 3 a 5 mg/kg/dia com teto de 60 mg/dia.
   - Critérios formais de indicação e Fórmula de Ganzoni para Ferro Endovenoso (Sacarato de Óxido de Ferro III / Noripurum IV): cálculo do déficit total em mg, ampolas de 100 mg necessárias, limite de 200 mg por sessão em SF 0.9% e bloqueio absoluto de segurança no 1º trimestre gestacional.
   - Gatilhos transfusionais beira-leito restritivos (Hb < 7.0 g/dL geral estável; Hb < 8.0 g/dL para cardiopatia isquêmica aguda; alerta vermelho para Hb < 6.0 g/dL).
   - Integração completa via Fastify RPC (`cockpitHematologiaAnemias` e alias `cockpitManejoAnemias` / `cockpitAnemia`) e comandos Telegram (`/anemia`, `/hemograma`, `/ferro`, `/ganzoni`, `/mentzer`).
   - Cobertura de testes automatizados com 100% de sucesso em `tests/test_hematologia_anemias.cjs`, runner Python `tests/test_hematologia_anemias.py` e validação ponta a ponta no servidor Render (`tests/test_server_render.cjs`).
   - Kaizen perpétuo: Backlog abastecido com as novas metas 111, 112 e 113.
- [x] (2026-10-09) **Módulo de Suporte Nutricional em Pediatria (Fórmula Infantil / Terapia Nutricional)**:
   - Motor determinístico beira-leito para hidratação venosa pediátrica e manutenção por Holliday-Segar (`src/02_suporte_nutricional_pediatrico.js`).
   - Cálculo preciso de volume basal (100-50-20 mL/kg/dia) e vazão horária em bomba de infusão (regra 4-2-1).
   - Ajustes clínicos por patologia: restrição hídrica para bronquiolite viral aguda (70%), restrição cardiovascular para cardiopatia congênita/IC (60%), restrição severa para SIADH/oligúria (50%), reposição de déficit/desidratação (125%) e compensação de perdas insensíveis por febre (+12% por °C acima de 37.8°C).
   - Prescrição eletrolítica de manutenção atualizada segundo SBP e AAP (2,5 mEq Na+/100 mL e 2,0 mEq K+/100 mL), com alertas rígidos para soluções isotônicas/balanceadas (prevenção de hiponatremia hospitalar aguda induzida por ADH) e infusão de potássio restrita a diurese confirmada.
   - Avaliação da Taxa de Infusão de Glicose (TIG) com SG 5% e SG 10% (alvo fisiológico de 4 a 6 mg/kg/min).
   - Calculadora determinística de fórmulas infantis respeitando a Regra de Ouro Inflexível de 1 medida rasa para cada 30 mL de água potável morna.
   - Bloqueio de fracionamento de medidas (meia colher) com orientação de preparo de múltiplos de 30 mL e descarte do excesso para evitar hipo ou hiperconcentração osmolar.
   - Alerta de capacidade gástrica fisiológica do lactente (~30 mL/kg) para prevenção de regurgitação e broncoaspiração.
   - Cobertura de fórmulas especiais (Partida, Seguimento, Prematuros/PIG, Anti-Regurgitação, Sem Lactose, Hidrolisada Extensa para APLV, Aminoácidos Livres elementares e Soja).
   - Contraindicação formal de fórmula de soja para menores de 6 meses (fitoestrógenos/alergenicidade).
   - Diretrizes de preparo seguro da OMS/SBP para prevenção de contaminação por *Cronobacter sakazakii* e *Salmonella* (água a 70°C).
   - Integração completa via Fastify RPC (`cockpitSuporteNutricionalPediatrico` / `cockpitNutricaoPediatrica`), comandos Telegram (`/nutriped`, `/holliday`, `/formulainfantil`, `/diluicao`) com parser determinístico e tolerância clínica.
   - Suíte de 8 testes automatizados em `tests/test_suporte_nutricional_pediatrico.cjs` e validação ponta a ponta em `tests/test_server_render.cjs` aprovados com 100% de sucesso.
   - Kaizen perpétuo: Backlog abastecido com as metas 108, 109 e 110.
- [x] (2026-10-09) **Inteligência Gasométrica e Distúrbios Ácido-Base (Regra dos 5 Passos)**:
   - Motor determinístico beira-leito para interpretação ácido-base em 5 passos clínicos (`src/02_gasometria_acido_base.js`).
   - Passo 1: Distúrbio primário e estratificação de gravidade clínica (leve a crítica por faixas de pH).
   - Passo 2: Compensação esperada precisa via Fórmula de Winter (PaCO2 = 1,5 × HCO3 + 8 ± 2) e equações para alcalose metabólica e acidoses/alcaloses respiratórias agudas vs crônicas.
   - Passo 3: Ânion Gap sérico com correção automática estrita por hipoalbuminemia (AG + 2,5 × [4,0 - Alb]).
   - Passo 4: Razão Delta (Delta-Delta) para diagnóstico diferencial de acidoses ocultas e estratificação em hiperclorêmica pura (< 0,4), mista (0,4-0,8), AG elevado pura (0,8-2,0) e alcalose metabólica oculta (> 2,0 ou HCO3 >= 24).
   - Passo 5: Oxigenação com Relação PaO2/FiO2 (Classificação de Berlim 2012 para SDRA) e Gradiente Alvéolo-Arterial (A-a) com PAO2 alveolar ajustada por altitude e limite de normalidade ajustado por idade.
   - Detecção inteligente de distúrbios triplos (ex: CAD + vômitos + DPOC com acidose respiratória).
   - Verificação de consistência biológica por Henderson-Hasselbalch para flag de erro de digitação ou amostra venosa.
   - Alertas críticos beira-leito de hiperlactatemia (> 4 mmol/L) e contraindicação de NaHCO3 antes de correção de hipocalemia severa (K < 3,0 mEq/L).
   - Integração total via Fastify RPC (`cockpitGasometriaAcidoBase` e alias `cockpitGasometria`) e comandos Telegram (`/gaso`, `/gasometria`, `/winter`, `/aniongap`) com parser determinístico e tolerância a dados posicionais.
   - Suíte de 13 testes automatizados determinísticos rigorosos em `tests/test_gasometria_acido_base.cjs` aprovados com 100% de sucesso.
   - Kaizen perpétuo: Backlog abastecido com 3 novas metas clínicas prioritárias (102, 103 e 104).
- [x] (2026-10-09) **Módulo de Cardiologia de Emergência (Dor Torácica, IAM e Duplo Bloqueio DAPT)**:
   - Estratificação robusta pelo Escore HEART (0-10 pts), TIMI SCASST (0-7 pts) e TIMI IAMCSST (0-14 pts).
   - Motor determinístico de DAPT com bloqueio fatal absoluto de Prasugrel em antecedente de AVC/AIT (Ensaio TRITON-TIMI 38).
   - Protocolo de reperfusão química por Trombólise com Clopidogrel mandatório e omissão obrigatória da dose de ataque em pacientes > 75 anos.
   - Detecção em tempo real de interação farmacocinética grave CYP2C19 entre Clopidogrel e Omeprazol, com recomendação de substituição por Pantoprazol.
   - Bloqueio fatal de nitratos em Infarto de Ventrículo Direito (IAM-VD) e uso recente de IPDE-5 (Sildenafil 24h / Tadalafil 48h).
   - Contraindicação formal de betabloqueadores em choque cardiogênico e congestão pulmonar aguda (Killip >= II), e ajuste renal de Enoxaparina em ClCr < 30 mL/min.
   - Integração completa via Fastify RPC (`cockpitCardiologiaEmergencia`) e bot Telegram (`/sca`, `/iam`, `/heart`, `/dapt`) com parser clínico determinístico.
   - Suíte de 12 testes determinísticos rigorosos aprovados com 100% de sucesso (`test_cardiologia_emergencia.cjs`).
   - Kaizen perpétuo: Backlog abastecido com 3 novas metas clínicas prioritárias (96, 97 e 98).
- [x] (2026-10-09) **Gastroenterologia - Pancreatite Aguda e Manejo da Hidratação (Critérios de Atlanta / BISAP)**:
   - Calculadora determinística beira-leito dos escores de gravidade (BISAP).
   - Protocolo de ressuscitação volêmica dirigida por metas (Ringer Lactato) com alertas para doença cardiovascular e renal.
   - Algoritmo de rejeição de NPO prolongado com incentivo a dieta oral precoce ou sonda nasojejunal.
   - Integração completa via Fastify RPC e bot Telegram (/pancreatite, /bisap).
   - Cobertura de testes automatizados validados com sucesso.
- [x] (2026-10-09) **Infectologia - Manejo de Neutropenia Febril Oncológica (Escore MASCC)**:
   - Motor determinístico de estratificação de risco (MASCC).
   - Protocolo de antibioticoterapia IV (Cefepime / Tazocin) com indicações precisas de Vancomicina (instabilidade, cateter, MRSA) e antifúngicos em febre refratária.
   - Integração via RPC e comandos Telegram (`/neutropenia`, `/mascc`).
- [x] (2026-10-09) **Integração de Calculadora de Clearance de Creatinina (Cockcroft-Gault) com Auditoria Automática de Prescrições**:
   - Motor determinístico robusto (`NefrologiaClearanceService`) para estimativa de TFG beira-leito.
   - Algoritmo de auditoria automática que intercepta drogas contraindicadas (nitrofurantoína, espironolactona, metformina) e exige ajuste de dose obrigatório para drogas críticas (vancomicina, enoxaparina, meropenem) quando TFG < 30 mL/min.
   - Classificação instantânea do estágio renal (G1 a G5).
   - Integração Fastify RPC completa via `cockpitNefrologiaClearance` e bot Telegram (comandos `/crcl` e `/clearance`).
   - Cobertura de testes (`test_nefrologia_clearance.cjs`) validando os cálculos para homens e mulheres, bem como os bloqueios de segurança.
- [x] (2026-10-09) **Módulo Avançado de Transfusão Sanguínea (Protocolo de Transfusão Maciça e Gatilhos)**:
   - Motor determinístico de alta performance beira-leito (`TransfusaoSanguineaService`) alinhado às diretrizes do Ministério da Saúde (Portaria de Consolidação 5/2017), ABHH, AABB 2023, e aos trials seminais TRICC, TRISS, FOCUS, REALITY, PROPPR, CRASH-2 e WOMAN.
   - Gatilhos transfusionais de Concentrado de Hemácias (CHAD): Estratégia restritiva rigorosa para pacientes clínicos e sépticos estáveis (gatilho Hb < 7,0 g/dL, alvo 7,0-9,0 g/dL) e estratégia liberal modificada para Síndrome Coronariana Aguda/IAM e neurocríticos (gatilho Hb < 8,0 g/dL, alvo 8,0-10,0 g/dL). Bloqueio e alerta de transfusão desnecessária com Hb >= 7,0 g/dL.
   - Doutrina Patient Blood Management (PBM): Cálculo ponderado de bolsas (1 bolsa = +1 g/dL em 70 kg) com recomendação de "1 bolsa por vez e reavaliação laboratorial em 1-2h" e alerta precoce de prevenção de TACO (infusão lenta em 3-4h e diurético preventivo).
   - Protocolo de Transfusão Maciça (PTM 1:1:1): Escore ABC (Assessment of Blood Consumption - sensibilidade 85%) e Índice de Choque (>= 1.4 catastrófico). Pacotes balanceados com 4 CHAD, 4 PFC, 1 pool de plaquetas por aférese, reposição precoce de Ácido Tranexâmico (1g ataque + 1g em 8h na janela crítica de 3h do sangramento) e 2º pacote com Crioprecipitado e Gluconato de Cálcio 10% (prevenção de hipocalcemia induzida pelo citrato).
   - Regra sentinela de tipagem emergencial: CHAD O negativo mandatório em mulheres em idade fértil (<= 50 anos) para proteção materno-fetal contra aloimunização anti-D; liberação de O positivo para homens e idosas preservando estoques críticos.
   - Reposição de hemocomponentes específicos: Plasma Fresco Congelado ponderado (10-15 mL/kg) para RNI > 1.5 com sangramento; Concentrado de Plaquetas escalonado (10k, 20k, 50k, 100k) com bloqueio sentinela absoluto de plaquetas em suspeita de PTT e HIT (risco de trombose catastrófica); Crioprecipitado direcionado para hipofibrinogenemia severa (< 150-200 mg/dL).
   - Escore ISTH completo para Coagulação Intravascular Disseminada (CIVD Manifesta / Overt DIC) com estratificação em 8 pontos e pacote hemostático associado ao combate da causa-base.
   - Diagnóstico diferencial e conduta de emergência em Reações Transfusionais Agudas (Hemólise Aguda ABO, TACO, TRALI, Anafilaxia, RFNH, Sepse bacteriana).
   - Integração completa com Fastify RPC (`cockpitTransfusaoSanguinea`), bot do Telegram (`/transfusao`, `/hemoterapia`, `/ptm`, `/chad`) e suíte de 16 testes determinísticos automatizados aprovados com 100% de sucesso.
- [x] (2026-10-09) **Ferramenta de Auditoria Analítica (Dashboard de Kaizen Clínico)**:
   - Motor determinístico off-line (`AuditoriaKaizenClinicoService`) de alta performance (< 10ms) para auditoria beira-leito e processamento em lote (batch) de prescrições hospitalares.
   - Classificação padronizada de desfechos: Bloqueio Fatal (Evento Sentinela), Rejeitada por Interação Grave/Contraindicada, Intervenção Farmacêutica por Omissão de Ajuste Renal, Retenção RBAC e Liberação Segura.
   - Cálculo determinístico do Índice de Maturidade de Segurança do Paciente (0 a 100) com penalidades escalonadas e níveis de excelência a alerta vermelho.
   - Identificação em tempo real dos Top Fármacos Incidentes e Top Interações Recorrentes com distribuição por setor hospitalar (UTI, Emergência, Enfermaria, Ambulatório).
   - Formulação automática de Plano de Ação Kaizen e Intervenções Prioritárias direcionadas para Farmácia Central, Prescrição Eletrônica e Preceptoria.
   - Renderização de Dashboard em gráficos ASCII para terminais/Telegram e integração completa com RPC Fastify (`cockpitAuditoriaKaizen`) e bot do Telegram (`/kaizen`, `/audit`).
   - 12 testes determinísticos automatizados aprovados com 100% de sucesso.
- [x] (2026-10-09) **Manejo de Via Aérea Difícil (Algoritmo ASA / DAS / LEMON / RSI / CICO)**:
   - Predição determinística de via aérea difícil com escore LEMON (Look, Evaluate 3-3-2, Mallampati, Obstruction, Neck mobility) e escore MOANS para ventilação difícil sob máscara facial.
   - Motor de cálculo para Sequência Rápida de Intubação (RSI - 7 Ps) com dosagem ponderada de Hipnóticos (Etomidato, Cetamina, Propofol, Midazolam) e Bloqueadores Neuromusculares (Succinilcolina vs Rocurônio).
   - Bloqueio sentinela absoluto de Succinilcolina em situações de hipercalemia, queimaduras > 24h, esmagamento/rabdomiólise > 24h, denervação crônica e histórico de hipertermia maligna.
   - Detecção precoce de Choque Peri-intubação (Índice de Choque >= 0.8) com alerta para ressuscitação prévia mandatória (cristaloides e vasopressor push-dose).
   - Dose de resgate com Sugamadex 16 mg/kg para reversão de emergência de Rocurônio.
   - Algoritmo escalonado ASA / DAS: Plano A (Laringoscopia otimizada com Videolaringoscopia, Bougie e manobra BURP - máx 3 tentativas), Plano B (Dispositivo Supraglótico de 2ª geração com canal gástrico e dimensionamento por peso), e Plano D / eFONA (Cenário crítico CICO: Cricotireoidostomia Cirúrgica Scalpel-Bougie-Tube com tubo 6.0 mm com cuff).
   - Integração completa via malha Fastify RPC (`cockpitViaAereaDificil`) e suíte de 13 testes determinísticos validada com 100% de sucesso.
- [x] (2026-10-09) **Módulo Avançado de Analgesia Controlada pelo Paciente (PCA)**:
   - Motor determinístico para cálculos de bolus, dose basal, intervalo de bloqueio (lockout) e limite de 4 horas para Morfina e Fentanil em bombas de PCA.
   - Algoritmo de segurança para pacientes opioid-naive, bloqueando infusões contínuas basais para evitar depressão respiratória.
   - Ajustes e limiares estritos para pacientes idosos (>= 65 anos) com menores doses de resgate e maiores intervalos de bloqueio.
   - Integração completa via malha Fastify RPC (`cockpitAnalgesiaPca`).
   - Suíte de testes determinística `tests/test_analgesia_pca.cjs` com 100% de sucesso.
- [x] (2026-10-09) **Módulo Avançado de Hepatologia Clínica e HDA**:
   - Implementação de motor determinístico beira-leito para o escore de Child-Pugh, estratificando risco cirúrgico e predizendo sobrevida em 1 e 2 anos com rigor nas classes A, B e C, alertando proativamente a necessidade de ajuste posológico.
   - Cálculo automático do MELD original (UNOS) e da nova fórmula MELD-Na otimizada, identificando limites mínimos (1.0) rigorosos para Bilirrubina e INR.
   - Algoritmo ágil de emergência para HDA Varicosa instável: indicação mandatória imediata de Droga Vasoativa (Terlipressina 2mg 4/4h, ajustável por peso, ou Octreotide se contraindicado), supressão ácida (IBP bolus e contínuo) e antibiótico profilático salvador de vidas para PBE (Ceftriaxona).
   - Testes rigorosos em `test_hepatologia_hda.cjs` e runner python validando 100% de sucesso nas equações matemáticas logarítmicas e condicionais da diretriz AASLD/EASL.
- [x] (2026-10-09) **Painel Inteligente de Intoxicações Exógenas (Toxicologia de Emergência)**:
   - Protocolos determinísticos para intoxicação aguda por Paracetamol com cálculo do Nomograma de Rumack-Matthew e prescrição detalhada de N-acetilcisteína IV/VO.
   - Manejo guiado beira-leito para intoxicações por Antidepressivos Tricíclicos (TCA) com avaliação de risco (QRS) e Bicarbonato de Sódio.
   - Reversão de Cardiotóxicos (Beta-bloqueadores e Bloqueadores de Canal de Cálcio) com Cálcio, Glucagon e Terapia HIET para choque refratário.
   - Protocolo escalonado de Naloxona para Opioides baseado em status ventilatório.
   - Integração completa via malha Fastify RPC (`cockpitToxicologiaEmergencia`) e bot do Telegram (`/intox`).
   - Suíte determinística em `test_toxicologia_emergencia.cjs` e runner python aprovada com 100% de sucesso.

- [x] (2026-10-09) **Neurologia de Emergência e Manejo de AVC Isquêmico Agudo**:
   - Checklist inteligente de elegibilidade e contraindicações para trombólise IV na janela 4.5h, com exclusões ECASS III.
   - Protocolo restritivo de controle de PA pré e pós-trombólise (Labetalol, Nitroprussiato).
   - Cálculo posológico de Manitol 20% e Salina Hipertônica 3%/20% para HIC com tetos osmolares.
   - Integração completa via malha Fastify RPC (`cockpitNeurologiaAvc`).
   - Suíte de testes determinística validada com 100% de sucesso.

- [x] (2026-10-09) **Suporte Avançado de Vida Pediátrico (PALS)**:
   - Motor determinístico de cálculo de medicações de emergência pediátrica (Adrenalina, Amiodarona, Lidocaína) em PCR guiado pelo peso, com estimativa linear por idade em caso de peso não informado.
   - Algoritmo de cálculo de choque (2 a 4 J/kg) para desfibrilação e cardioversão (0.5 a 2 J/kg).
   - Fórmulas para seleção do calibre de tubo endotraqueal (com e sem cuff), tamanho da lâmina do laringoscópio e profundidade da fixação.
   - Adicionada suíte de testes determinística 100% aprovada e integração completa via malha RPC (`cockpitPalsPediatria`).

- [x] (2026-10-09) **Módulo de Endocrinologia e Diabetes Mellitus Avançado (SBD/ADA)**:
   - Calculadora determinística de dose de insulina basal e bolus prandial para uso ambulatorial (regras 1800/500).
   - Protocolo automatizado e estruturado de correção de hiperglicemia hospitalar para enfermarias (alvos SBD/ADA).
   - Manejo guiado de Cetoacidose Diabética (CAD) e Estado Hiperosmolar Hiperglicêmico (EHH) com reposição de fluidos, potássio, insulina IV e bicarbonato restritivo.
   - Integração completa via malha Fastify RPC (`cockpitEndocrinologiaDiabetes`) para uso fluído.
   - Suíte determinística em `test_endocrinologia_diabetes.cjs` aprovada com 100% de sucesso.
- [x] (2026-10-09) **Módulo de Oncologia Básica para Atenção Primária**:
   - Rastreamento determinístico INCA 2026 para os cânceres mais prevalentes (Mama, Cólon, Próstata e Pulmão) guiado pelo perfil e risco do paciente.
   - Algoritmo de condutas beira-leito baseadas na classificação BI-RADS mamográfica/ultrassonográfica.
   - Motor para manejo de toxicidade e efeitos adversos oncológicos na APS (Neutropenia Febril, Mucosite Oral e Escada Analgésica da OMS para dor oncológica).
   - Módulo `src/02_oncologia_basica.js` com integração nativa na malha RPC do Cockpit (`cockpitOncologiaBasica`).
   - Suíte determinística `tests/test_oncologia_basica.cjs` validada com 100% de sucesso.

- [x] (2026-10-09) **Módulo de Suporte Nutricional Enteral e Parenteral (UTI/Enfermaria)**:
   - Calculadora automatizada de necessidade calórico-proteica basal com fórmulas de Harris-Benedict e regra de bolso (25-30 kcal/kg).
   - Motor determinístico de alerta para Síndrome de Realimentação baseado em critérios maiores (IMC < 16, perda de peso extrema, jejum prolongado, distúrbios de K/Mg/P) e menores, com prescrição empírica imediata de Tiamina e avanço lento da dieta.
   - Algoritmo de decisão de via de Terapia Nutricional (NRS-2002/NUTRIC), indicando Nutrição Enteral precoce vs Parenteral com base na viabilidade do trato gastrointestinal e dias de jejum.
   - Módulo independente e blindado `src/02_suporte_nutricional.js` integrado via RPC `cockpitSuporteNutricional`.
   - Suíte de testes automatizados `test_suporte_nutricional.cjs` validada com 100% de sucesso.

- [x] (2026-10-09) **Refatoração do Motor de Permissões e Perfis Clínicos (RBAC & Supervisão Médica)**:
   - Implementação do motor determinístico `RbacPerfisClinicosService` com segmentação hierárquica granular (Acadêmico de Medicina, Residente R1, Residente R2, Residente R3/R4, Preceptor e Farmacêutico Clínico) conforme diretrizes CFM, MEC/CNRM e Segurança do Paciente.
   - Salvaguardas ativas para acadêmicos e residentes juniores: bloqueio de liberação de prescrições ativas e mudança de status de leito sem co-validação preceptorial.
   - Detecção automatizada e auditoria de Fármacos de Alta Vigilância (Trombolíticos, Bloqueadores Neuromusculares, Aminas Vasoativas, KCl concentrado e Antídotos) exigindo dupla checagem ou chancela de R3+/Preceptor.
   - Bloqueio fatal e sentinela imediato para Cloreto de Potássio 19,1% infundido puro ou em bolus direto.
   - Sistema de gestão de pendências e co-assinatura preceptorial com tokens criptográficos rastreáveis e pareceres clínicos registrados em memória.
   - Protocolo Break-The-Glass (Bypass de Emergência Médica) que permite relaxamento temporário e auditado das travas em situações de PCR/choque extremo, garantindo que o cuidado à vida jamais seja bloqueado por entraves burocráticos.
   - Integração completa com Fastify RPC (`cockpitRbac`) e suíte de testes determinística validada com 100% de sucesso.

- [x] (2026-10-09) **Módulo de Psiquiatria de Urgência, Agitação Psicomotora e Risco de Suicídio (ABP / CFM / C-SSRS / PHQ-9)**:
   - Motor determinístico de alta fidelidade clínica e farmacológica para o manejo da agitação psicomotora via escalas RASS (-5 a +4) e BARS (1 a 7).
   - Diretrizes estritas de desescalonamento verbal com medidas de segurança ambiental (rota de fuga desobstruída e baixa estimulação sensorial).
   - Protocolo oficial de contenção mecânica/física protegida conforme a Resolução CFM nº 2.057/2013 (4 a 5 pontos, decúbito dorsal com cabeceira elevada a 30°, PROIBIÇÃO ABSOLUTA de decúbito ventral para prevenir asfixia postural e PCR súbita, reavaliação médica a cada 60 min e checagem circulatória a cada 15-30 min).
   - Contenção química personalizada por etiologia suspeita:
     * Psiquiátrica pura: Haloperidol 5 mg + Prometazina 25-50 mg IM (sinergismo sedativo e prevenção primária mandatória de distonia aguda) ou Haloperidol + Midazolam IM; ou Risperidona/Olanzapina VO se colaborativo.
     * Alerta crítico: Bloqueio estrito da associação Olanzapina IM + Benzodiazepínico parenteral na mesma janela de tempo pelo risco de PCR/colapso cardiorrespiratório.
     * Estimulantes (cocaína/crack): Benzodiazepínicos de 1ª linha (Midazolam IM ou Diazepam EV lento); contraindicação formal de antipsicóticos típicos isolados (risco de arritmia QTc, hipertermia e convulsão).
     * Delirium no idoso: dose baixa geriátrica fracionada de Haloperidol (0.5 a 1.25 mg) ou Quetiapina VO; contraindicação formal de benzodiazepínicos pelo risco de agitação paradoxal e maior mortalidade.
     * Abstinência alcoólica: Benzodiazepínicos titulados + Regra de Ouro da reposição de Tiamina 100-300 mg antes de qualquer infusão glicosada (prevenção mandatória de Encefalopatia de Wernicke).
   - Estratificação de risco de suicídio estruturada unindo o protocolo C-SSRS (Columbia) e o escore SAD PERSONS (0 a 10 pontos):
     * Identificação de bandeiras vermelhas de letalidade extrema (acesso a armas de fogo, estocagem de remédios, preparativos finais/cartas, desespero e método violento prévio).
     * Salvaguardas clínicas imediatas: vigilância 1:1 ininterrupta (inclusive no banheiro), sala segura desprovida de materiais perfurocortantes/fios, e internação psiquiátrica imediata (voluntária ou involuntária com notificação formal ao Ministério Público em até 72h conforme Art. 8º da Lei Federal nº 10.216/2001).
   - Rastreio de Depressão Maior via PHQ-9 (0 a 27 pontos) com alerta sentinela automático e bloqueio de liberação quando o Item 9 (pensamentos de morte ou autoflagelação) pontua > 0.
   - Algoritmo de seleção racional de antidepressivos baseado em comorbidades: Sertralina (escolha de excelência em cardiopatas pós-IAM respaldada pelo estudo SADHART), Mirtazapina (insônia e baixo peso/anorexia por ação antagonista H1 e alfa-2), Duloxetina/Venlafaxina (dor crônica e fibromialgia), Bupropiona (fadiga e queixa sexual com bloqueio absoluto se histórico convulsivo ou bulimia), e contraindicação formal de antidepressivos tricíclicos no idoso (Critérios de Beers).
   - Manejo determinístico de complicações: reversão de distonia aguda com Biperideno 5 mg IM/EV, protocolo de emergência em UTI para Síndrome Neuroléptica Maligna (Dantrolene/Bromocriptina), e diagnóstico de Síndrome Serotoninérgica pelos Critérios de Hunter com suporte de Ciproheptadina.
   - Módulo `src/02_psiquiatria_urgencia.js` integrado à malha RPC do `server/runtime.js` (`cockpitPsiquiatriaUrgencia`) e `src/13_cockpit_integracao.js`.
   - Suíte de 15 testes automatizados (`tests/test_psiquiatria_urgencia.cjs` e runner `tests/test_psiquiatria_urgencia.py`) validada com 100% de sucesso.

- [x] (2026-10-09) **Integração de IA Generativa Local (Llama 3 / Mistral) para Alta Disponibilidade Offline**:
   - Integração completa de nó local de IA generativa (Ollama / LocalAI / vLLM / llama.cpp) com suporte tanto à API OpenAI-compatible (`/v1/chat/completions`) quanto à rota nativa do Ollama (`/api/chat`).
   - Normalização automática de URLs e tolerância a timeouts com fallback sem bloqueio ou crash.
   - Suporte homologado aos modelos Llama 3 (`llama3.1:latest`, `llama3:8b`, `llama3.2`) e Mistral (`mistral:latest`, `mistral:7b`, `mistral-nemo`).
   - Orquestração transparente em cascata: quando provedores na nuvem (Gemini, Groq, OpenRouter, ZAI) sofrem saturação (429), indisponibilidade de rede ou ausência de chaves, o motor local assume automaticamente a inferência clínica com zero atrito.
   - Sistema de contingência em dupla camada: caso tanto a nuvem quanto o daemon local de LLM estejam inacessíveis (blackout total), o motor aciona o `IaLocalFallbackService` determinístico baseado nas diretrizes oficiais brasileiras e internacionais (PCR ACLS, DULE/perimortem na gestante, Choque Séptico, Choque Anafilático, SCA/IAM, AVC isquêmico, CAD, Crise Asmática, Pré-eclâmpsia Zuspan, DIP/ATO Hager/Monif).
   - Diagnóstico beira-leito com método `verificarSaudeLocalLlm` e rota RPC `cockpitLocalLlm` integrada ao Fastify para auditoria de status, inferência de teste e parametrização.
   - Bateria de testes automatizados (`tests/test_ia_local_offline.cjs`, `tests/test_ia_local_offline.py`, `tests/test_ia_local_fallback.cjs`, `tests/test_ia_local_fallback.py`) validada com 100% de sucesso.

- [x] (2026-10-09) **Doença Inflamatória Pélvica (DIP) e Abscesso Tubo-Ovariano (PCDT MS / CDC)**:
   - Implementação de motor determinístico com estadiamento clínico de Monif (Estágios I a IV) e critérios diagnósticos de Hager/PCDT (3 maiores + 1 menor).
   - Auditoria de critérios absolutos de internação (gestação, falha ambulatorial em 72h, abscesso >= 8cm, peritonite difusa).
   - Manejo seguro do DIU: manutenção inicial em casos não complicados e remoção obrigatória após cobertura antibiótica em falha de tratamento (72h) ou abscesso tubo-ovariano.
   - Posologia ambulatorial e hospitalar ponderada por peso e ajustada para função renal (ClCr < 50 mL/min).
   - Protocolo estrito de convocação, rastreamento e tratamento empírico obrigatório de todos os parceiros sexuais dos últimos 60 dias.
   - Integração Fastify RPC completa e suíte de testes (15 cenários) cobrindo todas as variantes de DIP e ATO.

- [x] (2026-10-09) **Síndrome dos Ovários Policísticos (SOP - Critérios Internacionais de Roterdã & ASRM/ESHRE 2023 / FEBRASGO)**:
   - Motor determinístico de alta acurácia para avaliação diagnóstica pelos Critérios de Roterdã (mínimo 2 de 3: Hiperandrogenismo clínico/laboratorial, Disfunção Ovulatória com oligo/anovulação, e Morfologia Policística ao USG transvaginal com contagem >= 20 folículos de 2-9 mm ou volume ovariano >= 10 cm³; ou AMH em adultas).
   - Fenotipagem completa de Roterdã: Fenótipo A (Completo: HA + DO + PCOM), Fenótipo B (Clássico não-policístico: HA + DO), Fenótipo C (Ovulatório: HA + PCOM) e Fenótipo D (Não-hiperandrogênico: DO + PCOM).
   - Alerta específico para adolescentes (< 3 anos pós-menarca) contra uso isolado de USG e exigindo tanto hiperandrogenismo quanto anovulação persistente por imaturidade fisiológica do eixo neuroendócrino.
   - Auditoria mandatória de exclusões e diagnósticos diferenciais: TSH para tireoidopatias, Prolactina para hiperprolactinemia, 17-OH-Progesterona matinal (< 2 ng/mL normal, 2-10 ng/mL zona cinzenta com teste de ACTH obrigatório, > 10 ng/mL confirmatória de HAC-NC), Cortisol com supressão de 1mg de dexametasona para Síndrome de Cushing, e alerta vermelho oncológico de tumor produtor de androgênios em virilização rápida / níveis extremos hormonais.
   - Estratificação de risco cardiometabólico e endometrial: TTGO 75g de 2 horas (padrão-ouro em SOP), HOMA-IR, critérios de Síndrome Metabólica (ATP III / IDF com >= 3 critérios), rastreio de esteatose hepática (MASLD) e alerta de risco de hiperplasia/câncer de endométrio por anovulação com tempo de amenorreia >= 3-6 meses ou espessura endometrial >= 7-12 mm.
   - Conduta terapêutica dirigida por objetivos:
     * Com desejo reprodutivo: Letrozol oral de 1ª linha (superior ao Clomifeno), Metformina adjuvante se IMC >= 25, Ácido Fólico pré-concepcional e BLOQUEIO ABSOLUTO de antiandrogênicos teratogênicos.
     * Sem desejo reprodutivo: Anticoncepcionais combinados antiandrogênicos (Drospirenona, Ciproterona, Dienogeste); bloqueio de estrogênios em contraindicações OMS MEC 4 (enxaqueca com aura, HAS grave, tabagismo >= 35a, TEV) com uso de Progestagênio isolado cíclico protetor (Didrogesterona) ou SIU-LNG; Espironolactona para hirsutismo com contracepção obrigatória; e Metformina para resistência insulínica e prevenção de DM2.
   - Novo módulo `src/02_sop_ovarios_policisticos.js` (`SopOvariosPolicisticosService`) integrado à malha RPC do `server/runtime.js` e `src/13_cockpit_integracao.js` (`cockpitSopOvariosPolicisticos`).
   - Suíte de testes determinística `tests/test_sop_ovarios_policisticos.cjs` e runner `tests/test_sop_ovarios_policisticos.py` validada com 100% de sucesso.

- [x] (2026-10-09) **Climatério e Terapia Hormonal da Menopausa (THM - Consenso FEBRASGO/NAMS)**:
   - Motor determinístico de avaliação da Janela de Oportunidade (< 60 anos e < 10 anos pós-menopausa) com relação risco-benefício favorável e bloqueio do início tardio para prevenção de DAC e AVC.
   - Conduta específica mandatória para Insuficiência Ovariana Prematura (IOP / < 40 anos) com recomendação de reposição hormonal até pelo menos 50-52 anos.
   - Aplicação estrita da Regra de Ouro da Proteção Endometrial: bloqueio absoluto de estrogênio isolado em mulheres com útero intacto (obrigatória associação com Progesterona micronizada ou Didrogesterona para prevenção de hiperplasia e adenocarcinoma endometrial) e liberação de estrogênio isolado em histerectomizadas (salvo exceção de endometriose prévia).
   - Seleção ponderada da via de administração: via transdérmica mandatória/preferencial em HAS, obesidade (IMC >= 30), hipertrigliceridemia (> 150 mg/dL), diabetes, esteatose hepática, colelitíase e tabagismo, evitando a primeira passagem hepática.
   - Auditoria de segurança contraindicações absolutas: bloqueio total em câncer de mama, câncer de endométrio, sangramento vaginal não investigado, TEV prévio/agudo, trombofilias, DAC/IAM, AVC/AIT, hepatopatia aguda ativa e porfiria.
   - Módulo de Síndrome Geniturinária da Menopausa (SGM) isolada com terapia tópica vaginal de baixa dose sem necessidade de progestagênio, e catálogo de alternativas não hormonais (Desvenlafaxina, Venlafaxina, Gabapentina) com alerta contraindicação de Paroxetina em uso concomitante de Tamoxifeno.
   - Novo módulo `src/02_climaterio_thm.js` (`ClimaterioThmService`) integrado à malha RPC do `server/runtime.js` (`cockpitClimaterioThm`).
   - Suíte de testes determinística `tests/test_climaterio_thm.cjs` e runner `tests/test_climaterio_thm.py` aprovada com 100% de sucesso.

- [x] (2026-10-09) **Tromboembolismo Venoso (TEV) na Gestação e Puerpério (Escore de Risco RCOG/FEBRASGO & Profilaxia com HBPM)**:
   - Motor determinístico de estratificação de risco trombótico antenatal e pós-parto com pontuação cumulativa RCOG/FEBRASGO (cesariana de urgência, IMC > 30, pré-eclâmpsia, tabagismo, imobilidade, idade > 35a).
   - Tabela ponderada de doses profiláticas de Enoxaparina por faixas de peso (20 mg a 80 mg SC/dia) e ajuste estrito para insuficiência renal (ClCr < 30 mL/min).
   - Bloqueios críticos para Varfarina (1º trimestre por embriopatia varfarínica e 3º trimestre por hemorragia fetal) e DOACs (gravidez/lactação), além de validação segura de Varfarina na lactação.
   - Verificador determinístico de intervalos de segurança neuroaxial (mínimo de 12h para dose profilática e 24h para dose terapêutica prevenindo hematoma epidural compressivo e paraplegia).
   - Novo módulo `src/02_tev_gestante.js` (`TevGestanteService`) integrado à malha RPC do `server/runtime.js` (`cockpitTevGestante`).
   - Suíte determinística `tests/test_tev_gestante.cjs` e `test_tev_gestante.py` aprovada com 100% de sucesso.

- [x] (2026-10-09) **Algoritmo de Ressuscitação Cardiopulmonar na Gestante (PCR Materna / ACLS Materno e Cesariana Perimortem)**:
   - Motor determinístico de ACLS materno com protocolo de compressão aortocaval e manobra DULE contínua mandatória em gestante >= 20 semanas com alerta estrito contra inclinação de 30 graus.
   - Acesso vascular com prioridade absoluta acima do diafragma para circulação central desobstruída.
   - Aplicação da Regra dos 4 Minutos (decisão e incisão cirúrgica com extração fetal aos 5 minutos) no próprio leito da PCR sem transporte para centro cirúrgico.
   - Protocolos imediatos de antídotos (Gluconato de Cálcio 10% para intoxicação por MgSO4 e Emulsão Lipídica 20% para LAST) e checklist mnemônico A to H das causas reversíveis.
   - Novo módulo `src/02_pcr_gestante.js` (`PcrGestanteService`) integrado à malha RPC do `server/runtime.js` (`cockpitPcrGestante`).
   - Suíte determinística `tests/test_pcr_gestante.cjs` e `test_pcr_gestante.py` aprovada com 100% de sucesso.

- [x] (2026-10-09) **Manejo Avançado de Sepse e Choque Séptico Puerperal / Materno (Critérios SOS Score / Bundle de 1 Hora)**:
   - Motor determinístico de cálculo do Obstetric Sepsis Score (SOS) com adaptação fisiológica e qSOFA obstétrico.
   - Integração da conduta de ressuscitação (Bundle de 1 hora) baseada em parâmetros como lactato e choque séptico.
   - Novo módulo `src/02_sepse_puerperal.js` integrado à malha RPC do `server/runtime.js` (`cockpitSepsePuerperal`).
   - Suíte determinística `tests/test_sepse_puerperal.cjs` e `test_sepse_puerperal.py` validada com sucesso.

- [x] (2026-10-09) **Auditoria Farmacêutica Hospitalar: Compatibilidade Físico-Química em Y-Site (Linha Venosa)**:
   - Motor determinístico de verificação cruzada (matriz combinatória) de incompatibilidades intravenosas no Y-Site.
   - Bloqueios críticos rigorosos implementados para cristalização (Ceftriaxona + Cálcio/Ringer), precipitação (Fenitoína com Glicose, Furosemida + Midazolam) e inativação de aminas (Bicarbonato + Catecolaminas).
   - Módulo independente `src/02_auditoria_y_site.js` integrado à malha RPC do `server/runtime.js` (`cockpitAuditarYSite`).
   - Suíte determinística `tests/test_auditoria_y_site.cjs` validada no pytest com 100% de sucesso.

- [x] (2026-10-09) **Mecânica Pulmonar e Ventilação Protetora na SDRA (ARDSNet)**:
   - Calculador beira-leito de peso predito (fórmula ARDSNet baseada na altura e sexo biológico) com ajuste estrito de volume corrente em 4 a 6 mL/kg.
   - Titulação e monitoramento de pressão de platô (Pplat <= 30 cmH2O) e cálculo automático da Driving Pressure (Delta P = Pplat - PEEP, meta <= 14-15 cmH2O).
   - Gasometria arterial integrada com cálculo da relação PaO2/FiO2 (critérios de Berlim para SDRA leve, moderada, grave) e indicação oportuna de posição prona precoce.
   - Integração de `src/02_mecanica_pulmonar_sdra.js` e métodos RPC `cockpitSdraMecanica`.
   - Suíte de testes determinística validada com 100% de aprovação.

- [x] (2026-10-09) **Nefrologia Intensiva e Distúrbios Hidroeletrolíticos (DHE)**:
   - Módulo determinístico para correção segura de hiponatremia aguda vs crônica com cálculo de déficit de sódio e teto rígido de elevação (8 mEq/L 24h e 18 mEq/L 48h).
   - Manejo escalonado de hipercalemia com critérios de urgência dialítica, estabilização de membrana, e glicoinsulina.
   - Cálculo de déficit de água livre na hipernatremia.
   - Implementação de `src/02_nefrologia_dhe.js` e métodos RPC `cockpitNefrologiaDhe`.
   - Suíte de testes `tests/test_nefrologia_dhe.cjs` validada com 100% de sucesso.
   - Módulo determinístico de equivalência analgésica e rotação (Morfina, Fentanil, Metadona, Oxicodona) via conversão rigorosa em MME.
   - Escala de desmame de sedação contínua (RASS) e rastreio de Delirium (CAM-ICU).
   - Implementação de `src/02_sedacao_opioides.js` e métodos RPC `cockpitSedacaoOpioides`.
   - Suíte `tests/test_sedacao_opioides.cjs` com validações exatas de MME e tolerância cruzada aprovados 100%.

- [x] (2026-10-09) **Auditoria de Toxicidade em Infusões Contínuas de UTI**:
   - Validação e testes determinísticos de limites de taxa de infusão (mcg/kg/min) para aminas vasoativas (Noradrenalina, Vasopressina, Adrenalina, Dobutamina) prevenindo erros por ordem de grandeza e dose letal beira-leito.
   - Implementada a suíte `tests/test_auditoria_infusao_uti.cjs` e validação com runner `pytest`.
- [x] (2026-10-09) **Módulo de Saúde do Idoso e Avaliação Geriátrica Ampla (AGA)**:
   - **Triagem rápida de fragilidade clínica ambulatorial (Clinical Frailty Scale - CFS)**: Escore preditivo determinístico classificando de Idoso Muito Robusto (1) a Doente Terminal (9).
   - **Avaliação cognitiva de rastreio em 10 minutos (Mini-Cog e Teste do Relógio)**: Classificação binária sensível para detecção de demência através da retenção de palavras e desenho do relógio.
   - **Prevenção de iatrogenia e polifarmácia**: Verificador automatizado cruzando Critérios de Beers (AGS 2023) contra o paciente. Alertas críticos implementados para Benzodiazepínicos, AINEs, IBPs crônicos, Anti-histamínicos de 1ª Geração e Sulfonilureias.
   - **Avaliação de risco de quedas (Timed Up and Go - TUG)**: Classificação temporal com metas de reabilitação.
   - **Integração completa no Telegram e Cockpit**: Comandos rápidos (`/idoso`, `/aga`, `/cfs`, `/minicog`, `/tug`, `/beers`) exportando sumários rápidos de alto valor preditivo beira-leito. Novo método RPC `cockpitSaudeIdosoAga`.
   - **Testes Clínicos Automatizados**: Suite rigorosa de `tests/test_saude_idoso.cjs` validando scores (100% aprovados com runner pytest).
- [x] (2026-10-09) **Painel de Puericultura e Desenvolvimento Infantil (Atenção Primária & SBP)**:
   - **Módulo Clínico Determinístico**: Criação de `src/02_puericultura_pediatria.js` (`PuericulturaPediatriaService`) com diretrizes pediátricas estritas da SBP, MS e OMS.
   - **Suplementação Profilática**: Algoritmo rigoroso de recomendação de Vitamina D (400 UI ou 600 UI) e Ferro Elementar profilático (1 a 4 mg/kg/dia) com base na idade, peso de nascimento e aleitamento materno exclusivo.
   - **Vigilância do DNPM**: Avaliação progressiva e escalonada de marcos do Desenvolvimento Neuropsicomotor, sinalizando atrasos (M-CHAT-R).
   - **Avaliação Antropométrica**: Classificação simplificada de curvas da OMS baseada no Escore Z para cálculo de IMC (risco de sobrepeso, magreza e eutrofia), estatura, peso e perímetro cefálico.
   - **Calendário Vacinal (PNI 2026)**: Motor cronológico de vacinação do MS cruzando a idade do lactente com as doses aplicadas e futuras (BCG, VIP, VOP, Pneumocócica, Meningocócica, etc.).
   - **Integração Cockpit PWA e Telegram**: Novo método RPC `cockpitPainelPuericultura` via `src/13_cockpit_integracao.js` exportado em `server/runtime.js`.
   - **Suíte de Testes Automatizados**: Inclusão de `tests/test_puericultura_pediatria.cjs` validando clinicamente todos os vetores da puericultura (10/10 aprovados com Pytest).
- [x] (2026-10-09) **Integração Ágil e Fluida com o Telegram (Hub Unificado de GO, SOAP e UX Móvel de 1 Toque)**:
   - **Teclado Fixo Persistente (`ReplyKeyboardMarkup`) Otimizado**:
     * Botões de 1 toque no rodapé desenhados para o médico em atendimento rápido:
       `[🩺 SOAP Ambulatorial]` `[🤰 Ginecologia & Obstetrícia]`
       `[🚨 Emergência]` `[💊 REMUME Rápida]`
       `[📱 Cockpit Mini App]` `[🧹 Limpar Paciente]`
   - **Hub Unificado de Ginecologia & Obstetrícia (GO)**:
     * Ao tocar em `[🤰 Ginecologia & Obstetrícia]`, exibe submenus rápidos de 1 toque:
       - `🤰 Pré-Natal (DUM, DPP, IG, Rastreios)`
       - `🚨 Pré-Parto & Sala de Parto (Trabalho de Parto, Zuspan, HPP/4Ts)`
       - `🌸 Ginecologia (Preventivo/INCA, SUA, Anticoncepção/OMS, Leucorreias)`
   - **Roteamento Inteligente em Linguagem Natural sem Comandos (`/`)**:
     * Detecção automática de termos obstétricos (ex: "DUM 14/05/2024", "G3P2A0 28 semanas") e ginecológicos (ex: "citologia ASC-US", "SUA aguda", "quer trocar anticoncepcional") acionando condutas instantaneamente sem exigir barras (`/`).
     * Prescrição em texto livre validada contra REMUME, interações e alergias sem exigir `/rx`.
   - **Botões Inline de Ação Rápida Pós-Áudio & Ditado Clínico**:
     * Ao enviar áudio corrido nos corredores ou consultório, o bot transcreve e anexa botões de 1 clique:
       - `📋 Copiar PEP`: Copia texto clínico limpo para a área de transferência do celular (sem asteriscos ou formatações que quebrem no PEP).
       - `💊 Extrair Receita`: Destaca apenas a prescrição com posologia para colar ou imprimir.
       - `🤰 Cartão Gestante` / `📁 Salvar Caso`: Arquiva diretamente no prontuário/Notion.
       - `🔄 Refinar Conduta`: Interação rápida para ajustes.
   - **Fast-Ack & Feedback Visual Instantâneo (< 500ms)**:
     * Feedback imediato com `sendChatAction('typing')` e mensagem temporária de processamento ("⚡ Analisando caso clínico..."), editada *in-place* via `editMessageText` assim que a IA concluir, eliminando a percepção de lentidão ou congelamento no celular.
   - **Integração Nativa Telegram Mini App (WebApp)**:
     * Acesso em tela cheia ao Cockpit PWA via botão WebApp nativo dentro do Telegram (`web_app: { url: ... }`), permitindo alternar fluidamente entre ditado por voz e interface visual com cards táteis.

- [x] **Ginecologia Ambulatorial de Consultório (Completando o Módulo Unificado de GO)** (2026-10-09):
  * **Motor Determinístico de Alta Fidelidade**: Criação de `src/02_ginecologia_ambulatorial.js` (`GinecologiaAmbulatorialService`) com regras clínicas e farmacológicas alinhadas ao INCA/MS, FIGO, OMS, FEBRASGO e PCDT ISTs.
  * **Rastreamento do Câncer de Colo Uterino (Diretrizes INCA/MS 2016+)**:
    - Idade e Periodicidade: População-alvo de 25 a 64 anos; após dois exames anuais negativos consecutivos, periodicidade trienal.
    - Menores de 25 anos: Rastreamento de rotina NÃO recomendado (alta prevalência de infecção transitória por HPV e lesões regressivas sem impacto em câncer); conduta estritamente expectante para achados de ASC-US ou LSIL.
    - Condutas Citopatológicas por Faixa Etária:
      * ASC-US: Entre 25 e 29 anos, repetir citologia em 12 meses na Atenção Básica; aos 30 anos ou mais, repetir em 6 meses na Atenção Básica.
      * LSIL: A partir dos 25 anos, repetir citologia em 6 meses na Atenção Básica.
      * ASC-US ou LSIL persistente (dois exames anormais consecutivos): Encaminhamento imediato para colposcopia especializada.
      * ASC-H e HSIL: Encaminhamento imediato para colposcopia especializada. Pacientes >= 25 anos com HSIL e achado colposcópico compatível (JEC tipo 1 ou 2 totalmente visível) são elegíveis à estratégia "Ver e Tratar" (excisão da zona de transformação - EZT/CAF em ambulatório).
      * AGC (Células Glandulares Atípicas): Colposcopia imediata com avaliação do canal endocervical (escovado/curetagem) e investigação endometrial (USG/biópsia) se idade >= 35 anos ou presença de sangramento anormal.
    - Encerramento do Rastreamento: Aos 65 anos de idade, caso a mulher apresente pelo menos dois exames normais consecutivos nos últimos 5 anos.
    - Situações Especiais: Mulheres com histerectomia total por lesão benigna dispensadas de rastreio de cúpula; imunossuprimidas (HIV+, transplantadas) iniciam rastreio na sexarca, com seguimento semestral no primeiro ano e anual a seguir, e qualquer atipia (mesmo ASC-US) encaminhada imediatamente à colposcopia.
  * **Sangramento Uterino Anormal (SUA - Classificação FIGO / PALM-COEIN)**:
    - Investigação Sistemática dos 9 Componentes: Estruturais PALM (Pólipo, Adenomiose, Leiomioma, Malignidade/Hiperplasia) e Não-Estruturais COEIN (Coagulopatia, Disfunção Ovulatória, Endometrial, Iatrogênica, Não classificada).
    - Exclusão Mandatória de Gestação: Alerta em vermelho e bloqueio para solicitação prioritária de Beta-hCG em qualquer paciente em idade fértil; detecção de gravidez redireciona imediatamente para protocolo obstétrico.
    - Avaliação Hemodinâmica e Choque Hipovolêmico: Cálculo automático do Índice de Choque (FC/PAS); se instabilidade (Índice >= 0.9 ou >= 1.4), acionamento de ressuscitação com cristaloide, dois acessos calibrosos e tamponamento mecânico intrauterino com Sonda de Foley (30-50 mL de SF) se sangramento cataclísmico.
    - Hemostasia Medicamentosa Rápida:
      * 1ª Linha: Ácido Tranexâmico 1g IV lento ou 1g VO a cada 6-8h por até 4-5 dias.
      * Terapia Hormonal Aguda: Anticoncepcional Oral Combinado em esquema de redução (1 cp a cada 6-8h até controle em 24-48h, seguido de desmame 1 cp 12/12h por 3 dias e 1 cp/dia completando ciclo). Se contraindicação a estrogênio, Acetato de Medroxiprogesterona 10-20 mg/dia ou Noretisterona 5mg 8/8h.
    - Alerta de Endométrio Espessado na Pós-Menopausa: Alerta crítico com indicação mandatória de biópsia endometrial (Pipelle / histeroscopia com biópsia) se eco endometrial > 4 mm sem TH ou > 8 mm com TH para exclusão de adenocarcinoma.
  * **Critérios Médicos de Elegibilidade para Anticoncepção da OMS (Categorias 1 a 4)**:
    - Categorias Oficiais: Cat 1 (Uso irrestrito), Cat 2 (Vantagens superam riscos), Cat 3 (Riscos superam vantagens, evitar), Cat 4 (Risco de saúde inaceitável, contraindicação absoluta).
    - Mapeamento Determinístico de Condições Críticas:
      * Enxaqueca com aura: Anticoncepcionais hormonais combinados (orais, injetáveis, anel, adesivo) são Categoria 4 pelo risco de AVC isquêmico. DIU de Cobre é Categoria 1 (padrão ouro). Progestagênios isolados são Categoria 2.
      * Trombose Venosa Profunda / Tromboembolismo Pulmonar prévio ou ativo: Hormonais combinados são Categoria 4. DIU de Cobre é Categoria 1.
      * Hipertensão Arterial Severa / Descontrolada (PAS >= 160 ou PAD >= 100): Hormonais combinados são Categoria 4. AMPD é Categoria 3. DIU de Cobre é Categoria 1.
      * Tabagismo em mulheres >= 35 anos (>= 15 cigarros/dia): Hormonais combinados são Categoria 4. Métodos com progestagênio isolado e DIUs são Categoria 1.
      * Pós-parto com amamentação (< 6 semanas): Hormonais combinados são Categoria 4. DIU de Cobre é Categoria 1.
      * Câncer de Mama Atual: TODOS os métodos hormonais são Categoria 4. DIU de Cobre é Categoria 1 absoluto.
  * **Síndromes Infecciosas Vulvovaginais (Leucorreias - PCDT/MS)**:
    - Candidíase Vulvovaginal:
      * Clínica: Prurido vulvovaginal intenso, corrimento esbranquiçado grumoso ("leite coalhado"), pH < 4.5 e hifas/esporos na microscopia.
      * Tratamento 1ª linha: Fluconazol 150mg VO dose única OU Nitrato de Miconazol creme vaginal 2% à noite por 7 dias.
      * Alerta Crítico Obstétrico: CONTRAINDICAÇÃO ABSOLUTA de Fluconazol oral em gestantes (risco teratogênico); prescrição mandatória de Miconazol creme vaginal 2% por 7 a 14 dias.
      * Candidíase Recorrente (>= 4 episódios/ano): Esquema de indução com Fluconazol 150mg VO nos dias D1, D4 e D7, seguido de manutenção semanal de 150mg por 6 meses.
    - Vaginose Bacteriana:
      * Critérios de Amsel: Diagnóstico firmado com >= 3 de 4 critérios (corrimento branco-acinzentado fino/homogêneo; pH vaginal > 4.5; Whiff test / teste das aminas positivo com odor fétido característico de "peixe podre"; visualização de *clue cells* / células-guia na microscopia a fresco).
      * Tratamento 1ª linha: Metronidazol 500mg VO 12/12h por 7 dias OU Metronidazol gel vaginal 0,75% por 5 noites. Alternativa: Clindamicina creme 2% por 7 dias.
      * Alerta Crítico Farmacológico: Efeito Antabuse / Dissulfiram com álcool (abstinência mandatória de bebidas alcoólicas durante o uso e por 24-48h pós-término). Parceiro sexual NÃO necessita de tratamento de rotina.
    - Tricomoníase:
      * Clínica: Corrimento profuso amarelo-esverdeado bolhoso com odor desagradável, pH > 4.5, colo uterino com colpite focal ("aspecto em framboesa/morango") e protozoários móveis flagelados (*Trichomonas vaginalis*).
      * Tratamento 1ª linha: Metronidazol 2g VO em dose única (4 comprimidos de 500mg) OU Metronidazol 500mg VO 12/12h por 7 dias.
      * Conduta Mandatória de IST: TRATAMENTO OBRIGATÓRIO E SIMULTÂNEO DO(S) PARCEIRO(S) SEXUAL(IS) mesmo assintomáticos, abstinência sexual até o fim do tratamento e solicitação de painel de sorologias para ISTs (HIV, Sífilis/VDRL, Hepatite B e C).
  * **Integração no Cockpit PWA**:
    - Novo botão de 1 toque "Ginecologia & APS" na aba SOAP (`tab-soap`).
    - Modal tátil completo `modal-ginecologia-ambulatorial` com 4 abas segmentadas (Colo Uterino, SUA, Anticoncepção, Leucorreias), visualização de condutas com alertas destacados e botão de cópia rápida para o PEP.
    - Sincronização 100% idêntica entre `cockpit_movel.html` e `gh_cockpit_deploy/index.html`.
  * **Integração Fastify RPC e Bot Telegram**:
    - 5 novos métodos RPC: `cockpitRastreioColoUterino`, `cockpitSangramentoUterinoAnormal`, `cockpitElegibilidadeAnticoncepcao`, `cockpitInfeccaoVulvovaginal`, `cockpitResumoGinecologia`.
    - Comandos Telegram dedicados com parsing inteligente de dados clínicos: `/ginecologia`, `/preventivo`, `/sua`, `/anticoncepcao`, `/leucorreia`, `/corrimento`.
  * **Suíte de Testes Automatizados**:
    - 31 casos clínicos rigorosos em `tests/test_ginecologia_ambulatorial.cjs`.
    - Runner pytest em `tests/test_ginecologia_ambulatorial.py`.
    - Ampliação de `tests/test_cockpit_mini_app.py` com o teste `test_cockpit_ginecologia_ambulatorial`.
    - Total da suíte global: 160 testes no pytest 100% aprovados.

- [x] **Protocolos de Emergência e Centro Obstétrico (Pré-Parto & Sala de Parto)** (2026-10-09):
  * **Motor Determinístico de Alta Fidelidade**: Criação de `src/02_centro_obstetrico.js` (`CentroObstetricoService`) com regras clínicas e farmacológicas alinhadas à FEBRASGO, ACOG, Ministério da Saúde e OMS.
  * **Diagnóstico e Monitoramento de Trabalho de Parto**:
    - Fases Clínicas: Fase Latente (colo em esvaecimento / dilatação < 4cm), Fase Ativa (dilatação >= 4cm com >= 2 contrações regulares de >= 30s em 10 min) e Período Expulsivo (dilatação 10cm, puxos espontâneos, clampeamento oportuno de cordão e contato pele a pele).
    - Planos de De Lee: Altura de apresentação fetal de -5 a +5 com detecção exata de insinuação (plano 0 De Lee, espinhas isquiáticas) e descida ao assoalho pélvico.
    - Ausculta de BCF: Interpretação de frequência cardíaca fetal com alertas automáticos para Bradicardia Fetal Severa (< 110 bpm, ressuscitação intrauterina imediata) e Taquicardia Fetal (> 160 bpm, investigação de febre/corioamnionite).
    - Índice de Bishop Completo: Avaliação dos 5 parâmetros (dilatação, esvaecimento, altura de De Lee, consistência e posição), categorizando em Colo Favorável (>= 9 pts, indução com Ocitocina IV em bomba) vs Desfavorável/Imaturo (<= 5 pts, preparo cervical com Misoprostol 25 mcg vaginal ou Cateter de Foley intracervical se cicatriz uterina).
  * **Manejo de Pré-Eclâmpsia com Sinais de Gravidade e Eclâmpsia**:
    - Protocolo de Sulfato de Magnésio (MgSO4): Prescrição detalhada do Esquema Zuspan (ataque 4g IV lento em 20 min + manutenção contínua de 1g/h em bomba) e Esquema Pritchard (ataque 4g IV + 10g IM profundo em nádegas com lidocaína + manutenção 5g IM 4/4h).
    - Vigilância Estrita de Intoxicação: Checagem contínua de reflexo patelar (presente), frequência respiratória (>= 12 rpm) e diurese horária (>= 25 mL/h). Detecção imediata de toxicidade com ordem de suspensão e prescrição beira-leito do antídoto **Gluconato de Cálcio 10% (10 mL = 1g IV lento)**.
    - Emergência Hipertensiva Obstétrica (PAS >= 160 ou PAD >= 110 mmHg): Protocolo rápido de resgate com Hidralazina 5mg IV a cada 20 min (dose máxima 20-30mg) e Nifedipino 10-20mg VO. Bloqueio absoluto com alertas críticos para IECAs/BRAs (fetopatia e óbito fetal) e Nifedipino sublingual (queda abrupta e sofrimento fetal).
  * **Protocolo de Hemorragia Pós-Parto (HPP - Regra dos 4 Ts)**:
    - Diagnóstico de sangramento excessivo (> 500 mL em parto vaginal ou > 1000 mL em cesariana).
    - Índice de Choque (Shock Index = FC / PAS): Identificação automática de choque compensado / moderado (>= 0.9) e choque grave (>= 1.4, ativação imediata de protocolo de transfusão maciça 1:1:1 e suporte cirúrgico).
    - Etiologia dos 4 Ts: Tônus (Atonia Uterina 70%), Trauma (Lacerações 20%), Tecido (Restos Placentários 10%) e Trombina (Coagulopatia/CIVD 1%).
    - Sequenciamento Uterotônico Escalonado: 1ª Linha Ocitocina IV contínua (20-40 UI em 500 mL SF a 250 mL/h) -> 2ª Linha Metilergometrina 0,2mg IM (com BLOQUEIO ABSOLUTO E ALERTA VERMELHO se hipertensa/PE) -> 3ª Linha Misoprostol 800mcg retal/sublingual -> 4ª Linha Ácido Tranexâmico 1g IV precoce em até 3h do parto (conforme evidência do estudo WOMAN / Lancet). Medidas de tamponamento (Hamilton, Balão de Bakri, TANP e B-Lynch).
  * **Profilaxia Intraparto para Sepse Neonatal por GBS (Streptococcus agalactiae)**:
    - Critérios formais de indicação (swab positivo a 35-37s, bacteriúria por GBS, filho anterior com sepse por GBS, prematuridade < 37s, bolsa rota >= 18h ou febre materna >= 38ºC) e dispensa em cesariana eletiva fora de trabalho de parto com bolsa íntegra.
    - Esquemas antibióticos: Penicilina G Cristalina (5M UI ataque + 2,5M UI 4/4h), Ampicilina (2g ataque + 1g 4/4h), Cefazolina (2g + 1g 8/8h para alergia leve) e Vancomicina (20 mg/kg 8/8h para anafilaxia com resistência ou perfil desconhecido).
  * **Prematuridade e RPMO**:
    - Corticoterapia Antenatal para Maturação Pulmonar: Betametasona 12mg IM a cada 24h (2 doses) entre 24s0d e 34-37s.
    - Neuroproteção Fetal com MgSO4: Indicada para fetos < 32 semanas com parto prematuro iminente nas próximas 24h.
    - Tocólise Aguda por até 48h: Nifedipino 20mg VO de ataque para permitir transferência e término do ciclo de corticoide; contraindicação absoluta e interrupção imediata do parto se Corioamnionite.
    - Regime de Latência na RPMO < 34 semanas: Ampicilina 2g IV 6/6h + Azitromicina 1g VO dose única nas primeiras 48h, seguido de Amoxicilina 500mg VO 8/8h por 5 dias. Bloqueio de Amoxicilina + Clavulanato pelo risco de enterocolite necrosante.
  * **Integração no Cockpit PWA**:
    - Novo botão de 1 toque "Sala de Parto & HPP" na aba SOAP (`tab-soap`).
    - Modal interativo completo `modal-centro-obstetrico` com 4 abas segmentadas (Parto & Bishop, PE & MgSO4, HPP/4Ts, GBS & Prematuro) e botão de exportação rápida para o PEP com 1 toque.
    - Sincronização 100% idêntica entre `cockpit_movel.html` e `gh_cockpit_deploy/index.html`.
  * **Integração Fastify RPC e Bot Telegram**:
    - 7 novos métodos RPC: `cockpitTrabalhoParto`, `cockpitSulfatoMagnesio`, `cockpitCriseHipertensivaObstetrica`, `cockpitHemorragiaPosParto`, `cockpitProfilaxiaGbs`, `cockpitPrematuridadeRpmo`, `cockpitResumoCentroObstetrico`.
    - Comandos Telegram dedicados com parsing inteligente: `/parto`, `/co`, `/hpp`, `/mgso4`, `/preeclampsia`, `/gbs`, `/prematuridade`.
  * **Suíte de Testes Automatizados**:
    - 24 casos clínicos rigorosos em `tests/test_centro_obstetrico.cjs`.
    - Runner pytest em `tests/test_centro_obstetrico.py`.
    - Ampliação de `tests/test_cockpit_mini_app.py` com validação de interface e RPC.
    - Total da suíte: 158/158 testes aprovados com 100% de sucesso.
- [x] **Calculadora e Painel de Pré-Natal (Obstetrícia Ambulatorial)** (2026-10-09):
  * **Cálculo Determinístico de IG e DPP**: Implementação de `src/02_obstetricia_prenatal.js` (`ObstetriciaPrenatalService`) com Regra de Naegele rigorosa com tratamento de anos bissextos e viradas de mês/ano, cálculo de dias decorridos e dias restantes até a DPP.
  * **Regra de Concordância FEBRASGO / ACOG**: Comparação precisa entre DUM e biometria ultrassonográfica de 1º trimestre (CCN precoce até 13s6d ou CCN em mm), fixando se a DUM é mantida por concordância ou se a gestação é formalmente redatada pelo ultrassom precoce.
  * **Ganho de Peso Gestacional (IOM 2009 / Ministério da Saúde)**: Cálculo do IMC pré-gestacional com classificação (Baixo Peso, Eutrofia, Sobrepeso, Obesidade), cálculo do ganho ponderal total recomendado e ganho semanal no 2º e 3º trimestres, e auditoria do ganho atual com status (GANHO_ADEQUADO, GANHO_INSUFICIENTE, GANHO_EXCESSIVO).
  * **Painel Cronológico de Rastreio por Trimestre**:
    - 1º Trimestre: Tipagem/Rh, Coombs indireto, Glicemia de jejum (pontos de corte: <92 normal, 92-125 DMG, >=126 DM prévio), VDRL, HIV, HBsAg, Toxoplasmose IgM/IgG com interpretação e teste de avidez, EAS e urocultura com antibiograma, TSH e USG morfológico de 1º tri com translucência nucal. Suplementação de Ácido Fólico (0,4mg ou 4-5mg se alto risco).
    - 2º Trimestre: USG morfológico de 2º tri (20-24s), TOTG 75g (24-28s com cortes 92/180/153 mg/dL), Coombs mensal e Imunoglobulina anti-D na 28ª semana se Rh-, rastreio de Pré-Eclâmpsia com profilaxia de AAS 100-150mg + Cálcio se alto risco, e vacinação materna (dTpa após 20s, Hepatite B, Influenza).
    - 3º Trimestre: Repetição sorológica completa, swab anovaginal para Streptococcus agalactiae (GBS) na 35-37 semanas com indicação e esquema de profilaxia intraparto com Penicilina Cristalina ou Ampicilina, e monitoramento de vitalidade fetal (AU, BCF 110-160 bpm, mobilograma fetal).
  * **Validador Farmacológico na Gestação & Lactação**: Base de dados de segurança com classificação FDA, bloqueio imediato com alertas severos de fetopatia/teratogênese para classes perigosas (IECA/BRA, Estatinas, Tetraciclinas, AINEs no 3º trimestre, Varfarina, Metotrexato, Isotretinoína, Ácido Valproico) e indicação de alternativas seguras de 1ª linha (Metildopa, Nifedipino retard, Hidralazina, Paracetamol, Amoxicilina, Cefalexina, Fosfomicina).
  * **Integração no Cockpit PWA**: Adição do botão "Pré-Natal & DPP" na aba SOAP (`tab-soap`), modal interativo `modal-prenatal` com 4 abas funcionais (IG/DPP, Ganho de Peso, Rastreio e Farmacologia) e sincronização com GitHub Pages (`gh_cockpit_deploy/index.html`).
  * **Integração RPC e Bot Telegram**: Novos métodos no Fastify RPC (`cockpitCalcularPrenatal`, `cockpitRastreioTrimestre`, `cockpitValidarFarmacoGestacao`, `cockpitAuditarPrescricaoGestante`) e comandos Telegram `/prenatal` e `/dpp`.
  * **Suíte de Testes Automatizados**: Implementação de `tests/test_obstetricia_prenatal.cjs` (22 casos clínicos rigorosos) e runner pytest `tests/test_obstetricia_prenatal.py`. Total da suíte global subiu para 155 testes, 100% aprovados.
- [x] **Módulo SOAP Ambulatorial Ágil (Clínica e Atenção Primária)** (2026-10-09):
  * **Estruturação Semiologicamente Rigorosa do SOAP Ambulatorial**: Criação do módulo dedicado `src/02_soap_ambulatorial.js` (`SoapAmbulatorialService`), separando cirurgicamente S (Queixa Principal, HDA cronológica, medicações de uso contínuo, alergias e antecedentes), O (sinais vitais com parâmetros de referência e exames segmentares direcionados), A (hipóteses com CID-10, CIAP-2 e estratificação de risco) e P (prescrição farmacológica REMUME com horários práticos, MEV, sinais claros de alarme para procura de PS e prazo de retorno).
  * **Modelos Dirigidos de Exame Físico com Atalhos Rápidos**: 8 modelos padronizados para consultas rápidas: Check-up Geral, Hipertensão Arterial Sistêmica (com ausculta carotídea e busca de B3/B4), Diabetes Mellitus (com exame completo dos pés, monofilamento 10g e pulsos pedioso e tibial posterior), Queixa Respiratória/IVAS (com oroscopia e otoscopia), Gastrointestinal/Dispepsia (com sinais de Murphy e Blumberg), Musculoesquelético/Lombalgia (com manobra de Lasègue e reflexos osteotendíneos), Neurológico/Cefaleia (com pares cranianos e sinais meníngeos) e Saúde Mental/Exame Psíquico.
  * **Dicionário Diagnóstico com CID-10 e CIAP-2**: Autocompleção e busca instantânea de diagnósticos prevalentes da atenção básica (HAS I10/K86, DM2 E11.9/T90, Dislipidemia E78.0/T93, Lombalgia M54.5/L03, DRGE K21.9/D84, Cistite N30.0/U71, TAG F41.1/P74, Depressão F32.1/P76, etc.).
  * **Estratificação de Risco Cardiovascular Determinística (SBC / SBD)**: Categorização automática em Muito Alto, Alto, Intermediário e Baixo Risco Cardiovascular com indicação de metas pressóricas (< 130/80 mmHg), metas de LDL (< 50, < 70, < 100, < 130 mg/dL), metas de HbA1c e potência de estatina recomendada.
  * **Exportação Limpa de Receituário Ambulatorial (Texto Puro para PEP)**: Formatação universal e padronizada com agrupamento por via (`[USO ORAL]`, `[USO TÓPICO]`), linhas de preenchimento de quantidade a dispensar, cronofarmacologia/horários de tomada e carimbo médico, pronta para copiar e colar com 1 clique no prontuário eletrônico.
  * **Exportação de Atestado Médico Legal (Resoluções CFM 1.658/2002 e 1.851/2008)**: Geração determinística de atestados médicos com conversão de dias por extenso (ex: 3 -> "três", 7 -> "sete"), resguardo estrito do sigilo médico por padrão e inclusão do CID-10 exclusivamente mediante autorização expressa do paciente.
  * **Guia de Encaminhamento / Referência (SISREG / CROSS)**: Formato SBAR regulado para especialidades contendo motivo, resumo clínico, exames relevantes e tratamentos prévios.
  * **Integração no Cockpit PWA**: Adição dos botões "SOAP Ambulatorial", "Atestado CFM" e "Receita PEP" na aba SOAP (`tab-soap`), com modais dedicados interativos (`modal-ambulatorio-soap` e `modal-atestado-cfm`) e sincronização 100% no GitHub Pages (`gh_cockpit_deploy/index.html`).
  * **Integração RPC e Bot Telegram**: Novos métodos RPC no Fastify (`cockpitSoapAmbulatorial`, `cockpitGerarReceitaTexto`, `cockpitGerarAtestadoTexto`, `cockpitEstratificarRisco`, `cockpitBuscarCid`) e comandos Telegram `/ambulatorio` e `/atestado`.
  * **Suíte de Testes Automatizados**: Implementação de `tests/test_soap_ambulatorial.cjs`, runner `tests/test_soap_ambulatorial.py` e ampliação de `tests/test_cockpit_mini_app.py`. Total de testes subiu para 154 testes, 100% aprovados.
- [x] **Auditoria e Testes Clínicos: Cenários Extremos de Dose e Conversão Pediátrica** (2026-10-08):
  * **Tetos de Dose Máxima de Adulto (Safety Ceiling Clamping)**: Testes automatizados rigorosos garantindo que crianças de peso elevado (>30-60 kg) nunca recebam doses supraterapêuticas ou tóxicas. Amoxicilina limitada a 1500 mg/dia, Amoxicilina+Clavulanato limitada a 1500 mg/dia, Azitromicina limitada a 500 mg/dia, Cefalexina limitada a 2000 mg/dia, Prednisolona limitada a 40 mg/dia, SMX-TMP limitado a 320 mg TMP/dia, Dipirona limitada a 500 mg/dose, Paracetamol limitado a 500 mg/dose e Ibuprofeno limitado a 400 mg/dose.
  * **Limites Inferiores e Proteção Neonatal/Lactente**: Gota mínima de segurança, volume mínimo seguro (0,5 mL em suspensões) e rejeição estrita para pesos fora da faixa pediátrica (< 1 kg ou > 80 kg).
  * **Restrições Etárias de Bula e Contraindicações Clínicas**: Bloqueio obrigatório de Albendazol e Mebendazol em < 2 anos; bloqueio de Nitazoxanida em < 1 ano; faixas etárias para Loratadina e Dexclorfeniramina.
  * **Cálculo de Frascos para Tratamentos Prolongados**: Cursos de 14 dias para otite complicada, frascos de 75 mL para Amoxi+Clav, Azitromicina 3 dias vs 5 dias e Cefalexina para 10 dias.
  * **Integração de Testes Automatizados**: Criação de `tests/test_auditoria_pediatrica_extremos.cjs` (27 casos clínicos) e runners pytest. Total de testes subiu para 152 testes no pytest, com 100% de sucesso.
- [x] **Aprimoramento da Interface Cockpit PWA: Cards de Leito & Prescrição Rápida** (2026-10-08):
  * Painel e cards de leitos da enfermaria com triagem visual, segmented control e censo hospitalar em tempo real.
  * Bandeja de prescrição rápida beira-leito com kits hospitalares e categorias farmacológicas no REMUME.
  * 149/149 testes aprovados.
- [x] **Enriquecimento do Guia de Interações Medicamentosas de UTI/Enfermaria** (2026-10-08): 66 novas interações críticas adicionadas (total de 285 regras farmacológicas em RAM). 146/146 testes aprovados.
- [x] **Otimização de Latência do Cockpit RPC** (2026-10-08): Compressão gzip, cache singleton do dispatch map, Cache-Control headers inteligentes. 145/145 testes passando.
- [x] **Correção da Suíte de Testes do Servidor Render** (2026-10-08): Correção e estabilização de `tests/test_server_render.cjs`.

- [x] **Pneumologia e Emergência - Manejo da Crise Asmática Grave e Estado de Mal Asmático** (2026-10-09):
  * **Estratificação Rápida de Gravidade (Diretrizes GINA / SBPT)**:
    - Motor determinístico beira-leito para classificação imediata em Leve/Moderada, Grave e Ameaça à Vida / Parada Iminente (Estado de Mal Asmático / Asma Quase Fatal).
    - Rastreio de sinais de exaustão respiratória: fala truncada/incapaz, posição de tripé, uso acentuado de musculatura acessória, respiração paradoxal toracoabdominal e tórax silencioso.
    - Alerta sentinela de falência muscular aguda em gasometria arterial: PaCO2 normal ou elevada (>= 42-45 mmHg) associada a acidose em paciente asmático (em crise aguda, a hiperventilação esperada deveria induzir hipocapnia < 35 mmHg; a normocapnia é um sinal cardinal pré-parada!).
  * **Protocolo Escalonado de Broncodilatação e Oxigenoterapia**:
    - Oxigenoterapia controlada com metas guiadas: SpO2 93-95% em adultos e 94-98% em gestantes e pediatria (evitando hiperóxia não controlada com efeito Haldane e retenção de CO2).
    - SABA (Salbutamol): Spray MDI com espaçador valvulado (4 a 10 jatos) a cada 20 min na 1ª hora (ciclos aos 0, 20 e 40 minutos) ou nebulização intermitente 2.5-5.0 mg; suporte para nebulização contínua (10-15 mg/h) na crise refratária extrema.
    - SAMA (Brometo de Ipratrópio): Indicação mandatória na crise grave associado ao SABA nas primeiras 3 doses da 1ª hora (40 gotas = 0.5 mg ou spray 4-8 jatos).
    - Ajustes posológicos ponderados precisos para pediatria por peso corporal e idade.
  * **Corticoterapia Sistêmica Precoce**:
    - Administração mandatória na 1ª hora da admissão (efeito genômico inicia em 4-6h).
    - Via oral preferencial: Prednisona/Prednisolona 40 a 50 mg/dia dose única por 5 a 7 dias em adultos (sem necessidade de desmame se <= 7-10 dias) e 1-2 mg/kg/dia por 3 a 5 dias em crianças.
    - Via intravenosa: Hidrocortisona 200 mg ataque + 100 mg 6/6h ou Metilprednisolona 40-60 mg 6-12h se vômitos ou risco de vida.
  * **Indicação Oportuna de Sulfato de Magnésio 2g IV**:
    - Indicação estrita para crise que persiste refratária com PFE < 50% ou SpO2 < 92% após a 1ª hora, ou com apresentação inicial de parada iminente.
    - Posologia precisa: 2,0 g IV (solução 50%: 4 mL; ou 10%: 20 mL) diluídos em 100 mL de SF 0.9% infundidos em 20 minutos (40-50 mg/kg em pediatria), com monitoramento de PA e reflexo patelar.
  * **Manejo Ventilatório Protetor & Bloqueios Críticos**:
    - Alerta para evitar IOT prematura (risco elevado de hiperinsuflação dinâmica, auto-PEEP extrema, pneumotórax e choque por perda de retorno venoso).
    - Se IOT mandatória: sequência rápida com Ketamina 1.5-2.0 mg/kg (broncodilatador simpaticomimético de escolha) e ventilação protetora (Vt 5-6 mL/kg predito, FR 10-12 rpm, relação I:E 1:3-1:4, PEEP baixa 0-5 cmH2O e hipercapnia permissiva). Conduta emergencial de desconexão e desinsuflação manual torácica se choque pós-IOT.
    - Bloqueios de segurança: contraindicação absoluta de benzodiazepínicos e opioides sem via aérea avançada, rejeição de antibióticos de rotina e contraindicação de mucolíticos.
  * **Critérios de Destino e Prescrição de Alta Estruturada**:
    - Critérios claros de alta de emergência (PFE > 70%, SpO2 > 94% mantida por 1-2h pós-SABA) com prescrição de 5 itens (corticoide oral, corticoide inalatório de manutenção, SABA de resgate com espaçador, revisão de técnica inalatória e retorno em 2-7 dias).
  * **Integração e Testes Automatizados**:
    - Módulo `src/02_pneumologia_crise_asmatica.js` integrado via Fastify RPC (`cockpitPneumologiaAsma` e `cockpitCriseAsmatica`) e comandos Telegram (`/asma`, `/criseasma`, `/broncoespasmo`, `/salbutamol`).
    - 9 testes unitários dedicados em `tests/test_pneumologia_crise_asmatica.cjs`, runner pytest em `tests/test_pneumologia_crise_asmatica.py` e integração no `tests/test_server_render.cjs`. 100% de sucesso.

114. [ ] **Módulo de Nefrologia Avançada - Distúrbios Hidroeletrolíticos: Hipocalcemia e Hipercalcemia**:
    - Cálculos de cálcio corrigido pela albumina sérica.
    - Algoritmo de manejo agudo com reposição de Gluconato de Cálcio IV em hipocalcemia sintomática ou hipercalcemia severa (crise hipercalcêmica) com hidratação vigorosa e bifosfonatos.

115. [ ] **Ginecologia - Manejo de Disfunções Pélvicas e Incontinência Urinária (Diretrizes ICS)**:
    - Protocolo de avaliação de incontinência urinária de esforço vs urgência (bexiga hiperativa).
    - Prescrição de antimuscarínicos e beta-3 agonistas com bloqueios de segurança por comorbidades (glaucoma de ângulo fechado).

116. [ ] **Ferramenta de Auditoria de Custos e Faturamento Hospitalar (DRG)**:
    - Estimativa automatizada de Diagnoses Related Groups baseada nas prescrições inseridas.
    - Identificação de oportunidades de faturamento cruzado ou desperdício de recursos materiais para a coordenação médica.

117. [ ] **Módulo de Endocrinologia - Manejo de Nódulos Tireoidianos e Câncer de Tireoide (ACR TI-RADS e ATA)**:
    - Algoritmo determinístico de estratificação de risco ultrassonográfico TI-RADS (1 a 5).
    - Indicação de PAAF (Punção Aspirativa por Agulha Fina) beira-leito baseada no tamanho do nódulo e características suspeitas (microcalcificações, margens irregulares, hipoecogenicidade).

118. [ ] **Gastroenterologia - Manejo de Cirrose Hepática e Complicações (Encefalopatia e Síndrome Hepatorrenal)**:
    - Protocolos beira-leito para diagnóstico e estadiamento de Encefalopatia Hepática (Critérios de West Haven).
    - Manejo farmacológico escalonado (Lactulose, Rifaximina) e critérios da ICA (International Club of Ascites) revisados para Lesão Renal Aguda na Cirrose e Síndrome Hepatorrenal (indicação de Terlipressina + Albumina).

119. [ ] **Terapia Intensiva - Predição de Desmame Vasopressor (Vasoactive-Inotropic Score - VIS)**:
    - Cálculo automatizado e contínuo da carga vasopressora/inotrópica total (Noradrenalina, Adrenalina, Vasopressina, Dobutamina, Milrinona).
    - Painel visual de tendência de 24h para guiar o desmame seguro e progressivo de DVA em choque distributivo (foco em sobrevida na Sepse).

120. [ ] **Pneumologia & Emergência - Manejo da Exacerbação Aguda da Asma com Critérios de Ventilação Não Invasiva (VNI) e Desmame de Broncodilatador**:
    - Algoritmo de desmame e transição da nebulização frequente para MDI com espaçador a cada 4-6h conforme estabilização clínica.
    - Critérios de indicação e contraindicações relativas para VNI (BiPAP/CPAP) na exacerbação de asma com retenção hipercápnica e falência iminente.
    - Checklist estruturado de alta com Plano de Ação Escrito para Asma (PEAP/GINA) com zonas verde, amarela e vermelha para prevenção de novas crises.

121. [ ] **Toxicologia Clínica - Síndrome Anticolinérgica vs Colinérgica (Toxíndromes de Emergência)**:
    - Motor determinístico para reconhecimento rápido beira-leito dos toxíndromes anticolinérgico (rubor, midríase, pele seca, retenção urinária, delírio) e colinérgico (mnemônico DUMBELS: diarreia, urina, miose, broncorreia/bradicardia, emese, lacrimejamento, salivação).
    - Protocolo de antídotos específicos (Fisostigmina na anticolinérgica sob monitorização cardíaca vs Atropina e Pralidoxima na intoxicação por organofosforados/carbamatos).

122. [ ] **Terapia Intensiva e Cardiologia - Choque Distributivo e Manejo da Sepse / Choque Séptico (Surviving Sepsis Campaign 2026)**:
    - Rastreio com escore SOFA e qSOFA.
    - Pacote de 1 hora da Sepse: coleta de culturas antes de antimicrobiano, dosagem seriada de lactato sérico, antibiótico de amplo espectro na 1ª hora e ressuscitação volêmica guiada por cristaloides balanceados (30 mL/kg nas primeiras 3h se hipotensão ou lactato >= 4 mmol/L).
    - Titulação de Noradrenalina de 1ª linha com alvo de PAM >= 65 mmHg e Vasopressina associada como poupador de catecolamina.

123. [ ] **Obstetrícia & Medicina Fetal - Interpretação Inteligente de Cardiotocografia (CTG / NST) e Classificação FIGO/NICHD**:
    - Motor determinístico beira-leito para classificação da cardiotocografia fetal em 3 categorias (Normal / Suspeita / Patológica) segundo FIGO 2015 e NICHD.
    - Análise automatizada de linha de base (110-160 bpm), variabilidade (ausente, mínima, moderada, acentuada), acelerações, desacelerações (precoces, tardias, variáveis e prolongadas) e padrão sinusoidal.
    - Algoritmo de conduta escalonada: medidas de ressuscitação intrauterina (decúbito lateral esquerdo, suspensão de ocitocina, oxigênio materno, bolus de cristaloide) e critérios para cesárea de emergência (categoria 1: < 30 min).
    - Integração com o módulo de RCF/Doppler para vigilância combinada anteparto em Estágios III-IV de Barcelona.

124. [ ] **Obstetrícia & Emergência - Protocolo Completo de Eclâmpsia, Pré-eclâmpsia com Sinais de Gravidade e Síndrome HELLP (ACOG / ISSHP / FEBRASGO)**:
    - Motor determinístico de estratificação: pré-eclâmpsia sem sinais de gravidade vs com sinais de gravidade (PAS ≥ 160 ou PAD ≥ 110 persistente, plaquetas < 100.000, TGO/TGP > 2x LSN, creatinina > 1,1, edema pulmonar, sintomas neurológicos ou dor epigástrica persistente) vs eclâmpsia (convulsão) vs síndrome HELLP.
    - Protocolo de Sulfato de Magnésio (Zuspan: 4g IV ataque + 1g/h manutenção ou Pritchard: 4g IV + 10g IM ataque + 5g IM 4/4h) com monitoramento de toxicidade (reflexo patelar, FR > 12, diurese > 25 mL/h) e antídoto (Gluconato de Cálcio 1g IV).
    - Anti-hipertensivos de emergência obstétrica: Nifedipino 10-20 mg VO (1ª linha), Hidralazina 5 mg IV (2ª linha), Labetalol IV escalonado; contraindicação absoluta de nitroprussiato de sódio e IECAs/BRAs.
    - Decisão de interrupção da gestação: HELLP/eclâmpsia = parto em 24-48h após estabilização; PE com gravidade ≥ 34 sem = parto; PE com gravidade < 34 sem = conduta expectante individualizada em centro terciário com corticoide para maturação pulmonar.

125. [ ] **Cirurgia & Hematologia - Manejo Perioperatório de Anticoagulação e Terapia Ponte (Bridging Therapy — Diretrizes ASH / CHEST / SBC)**:
    - Estratificação de risco tromboembólico (CHA2DS2-VASc para FA, risco de TEV recorrente, valvas mecânicas) vs risco hemorrágico do procedimento (alto vs baixo risco).
    - Protocolo de suspensão e ponte com HBPM (Enoxaparina dose terapêutica) para pacientes com Warfarina e risco tromboembólico alto; suspensão simples sem ponte em risco moderado-baixo (BRIDGE Trial).
    - Manejo de DOACs (Rivaroxabana, Apixabana, Dabigatrana): tempo de suspensão guiado pela clearance de creatinina e risco hemorrágico, sem necessidade de ponte; Idarucizumabe (Praxbind) para reversão de urgência da Dabigatrana e Andexanet Alfa para anti-Xa.
    - Timing de reinício pós-operatório com bloqueio de segurança: anti-Xa ou Warfarina não antes de 24-48h em procedimentos de alto risco hemorrágico e 12-24h em baixo risco.



126. [ ] **Nutrição & Terapia Intensiva - Rastreio de Sarcopenia e Síndrome de Realimentação em Pacientes Críticos (ASPEN/ESPEN 2026)**:
    - Motor de rastreio de risco alto para síndrome de realimentação (IMC < 16, perda de peso > 15%, jejum > 10 dias).
    - Protocolo de progressão lenta da dieta (início com 10-15 kcal/kg/dia) com suplementação empírica preemptiva obrigatória de Tiamina 200-300 mg IV antes da nutrição, associado a reposição agressiva de Fósforo e Magnésio.

127. [ ] **Infectologia - Prevenção e Tratamento da Infecção do Trato Urinário (ITU) Complicada e ITU de Repetição**:
    - Algoritmo de tratamento escalonado beira-leito, diferenciando cistite aguda simples de pielonefrite não complicada e complicada (obstrução, cateter, sepse).
    - Recomendações de descalonamento baseadas no perfil de sensibilidade (Fosfomicina e Nitrofurantoína como 1ª linha na cistite para poupar quinolonas/cefalosporinas).
    - Protocolo de rastreio e tratamento de bacteriúria assintomática exclusivamente nas indicações formais (gestantes, antes de procedimento urológico invasivo) alertando o não-tratamento rotineiro em idosos institucionalizados e pacientes sondados.

128. [ ] **Auditoria de Kaizen - Motor de Detecção de Interação Fármaco-Nutriente e Administração por SNG/SNE**:
    - Motor de verificação contínua que cruza a prescrição médica com a via enteral.
    - Bloqueios de segurança beira-leito para fármacos que não podem ser triturados (cápsulas gelatinosas, liberação entérica/estendida) ou que quelam o nutriente (ex: Levotiroxina, Fenitoína, Ciprofloxacino), gerando alertas de pausa da dieta ou troca de apresentação farmacêutica.

129. [ ] **Oncologia & Terapia Intensiva - Profilaxia e Manejo de Mucosite Oral e Uso Guiado de G-CSF (Filgrastim)**:
    - Protocolo escalonado de prevenção e analgesia beira-leito para mucosite induzida por quimioterapia/radioterapia.
    - Indicações precisas (profilaxia primária vs secundária) para uso de Fator Estimulador de Colônias de Granulócitos (G-CSF) em esquemas quimioterápicos de alto risco para neutropenia febril.

130. [ ] **Pediatria de Emergência - Manejo da Crise Asmática e Escore PRAM (Pediatric Respiratory Assessment Measure)**:
    - Motor determinístico beira-leito do escore PRAM para classificar gravidade clínica (leve, moderada, grave, iminência de falência respiratória).
    - Protocolo dinâmico de resgate com Salbutamol associado a Brometo de Ipratrópio e corticoterapia sistêmica (Dexametasona vs Prednisolona), com indicação de Sulfato de Magnésio IV nas crises graves refratárias.

131. [ ] **Obstetrícia & Medicina Fetal - Manejo de Aloimunização RhD e Prevenção de Doença Hemolítica Perinatal**:
    - Monitoramento por Doppler da Artéria Cerebral Média (Pico de Velocidade Sistólica - PVS) para detecção de anemia fetal grave.
    - Regras rigorosas de indicação de Imunoglobulina Anti-D em gestantes Rh negativo não sensibilizadas (com 28 semanas, pós-parto e após eventos sensibilizantes como sangramentos e procedimentos invasivos).

132. [ ] **Infectologia & Obstetrícia - Sífilis Gestacional e Prevenção da Sífilis Congênita (Diretrizes Ministério da Saúde / PCDT)**:
    - Motor determinístico de interpretação de testes treponêmicos e não treponêmicos (VDRL/RPR) com monitoramento serológico de queda de títulos pós-tratamento (cura vs reinfecção/reativação).
    - Protocolo posológico exclusivo com Penicilina Benzatina (único fármaco que trata o feto com eficácia comprovada): 2,4 milhões UI IM dose única (primária, secundária ou latente recente) vs 7,2 milhões UI em 3 doses semanais de 2,4M UI (latente tardia, terciária ou de duração ignorada).
    - Bloqueio mandatório de tratamento adequado materno: esquema completo iniciado e concluído pelo menos 30 dias antes do parto com Penicilina Benzatina (qualquer outro fármaco, como ceftriaxona ou azitromicina, é considerado tratamento inadequado com necessidade de investigação completa e tratamento do recém-nascido).
    - Manejo seguro da Reação de Jarisch-Herxheimer na gestante com monitoramento cardiotocográfico e de contrações uterinas.

133. [ ] **Neurologia & UTI Pediátrica - Estado de Mal Epiléptico Pediátrico e Crises Febris (Diretrizes SBP / AES / PALS)**:
    - Algoritmo beira-leito escalonado de manejo de crises convulsivas ativas na infância: 1ª linha (Benzodiazepínicos: Midazolam IM/bucal/intranasal ou Diazepam retal/IV até 2 doses com intervalo de 5 min).
    - 2ª linha em crise refratária (> 5-10 min): Fenitoína IV (20 mg/kg), Levetiracetam IV (60 mg/kg) ou Valproato de Sódio IV (40 mg/kg) com cálculo de velocidade de infusão para prevenir hipotensão/arritmia.
    - 3ª linha (estado refratário > 30-60 min): indução anestésica com Midazolam contínuo, Propofol ou Tiopental sob via aérea avançada e monitorização contínua.
    - Diferenciação criteriosa entre Convulsão Febril Simples vs Complexa e critérios para punção liquórica de urgência (lactentes < 12 meses ou sinais meníngeos).

134. [ ] **Nefrologia & Emergência - Manejo da Hipercalemia Grave com Cardiotoxicidade Eletrocardiográfica (Diretrizes KDIGO / AHA)**:
    - Classificação de gravidade por nível de K+ sérico e alterações eletrocardiográficas (ondas T apiculadas e simétricas, alargamento de QRS, perda de onda P, onda senoidal pré-PCR).
    - Estabilização imediata da membrana miocárdica: Gluconato de Cálcio 10% IV (10 a 20 mL em 3-5 min) ou Cloreto de Cálcio 10% se choque/PCR.
    - Medidas de shift intracelular de ação rápida: Solução Polarizante (Glicose 50% 50 mL + Insulina Regular 10 UI IV em 30 min), Beta-2 agonista inalatório (Salbutamol 10 a 20 mg nebulizado) e Bicarbonato de Sódio 8,4% IV se acidose metabólica grave concomitante.
    - Medidas de eliminação corpórea de potássio: Furosemida IV de alça, resinas de troca / quelantes orais e indicação prioritária de hemodiálise de urgência (mnemônico AEIOU).

135. [ ] **Obstetrícia & Hematologia - Profilaxia de Tromboembolismo Venoso na Gestação e Puerpério (Diretrizes RCOG / ACOG)**:
    - Motor de estratificação de risco de TEV pré-natal, intraparto e pós-parto com escore validado identificando grupos de baixo, intermediário e alto risco.
    - Condutas determinísticas para indicação de HBPM profilática (Enoxaparina 40 mg SC/dia ajustada por IMC) desde o 1º trimestre até 6 semanas pós-parto em pacientes de alto risco.
    - Janelas de segurança rigorosas para suspensão de anticoagulante pré-analgesia do neuroeixo e retomada pós-parto seguro.

136. [ ] **Endocrinologia & Terapia Intensiva - Reconhecimento e Manejo da Tempestade Tireoidiana (Escore de Burch-Wartofsky)**:
    - Escore clínico determinístico para predição probabilística da tempestade tireoidiana (febre, taquicardia, IC, disfunção gastrointestinal, agitação do SNC).
    - Protocolo escalonado de 5 frentes: betabloqueio vigoroso (Propranolol VO/IV que inibe conversão periférica T4->T3), bloqueio da síntese (Propiltiouracil > Metimazol), bloqueio da liberação (Iodo inorgânico/Lugol aplicado APÓS PTU), corticoterapia (Hidrocortisona IV) e resfriamento / manejo do fator desencadeante.

137. [ ] **Cardiologia Ambulatorial e Clínica Médica - Otimização de Insuficiência Cardíaca com FE Reduzida (ICFEr / Diretrizes SBC/ESC)**:
    - Rastreio de critérios maiores e menores de Framingham e estadiamento clínico completo (NYHA e AHA).
    - Prescrição estruturada beira-leito ou ambulatorial do "Quarteto Fantástico" com titulação progressiva obrigatória (iECA/ARNI/Sacubitril-Valsartana + Betabloqueador Cardiosseletivo + Antagonista Mineralocorticoide / Espironolactona + inibidor SGLT2 / Dapagliflozina ou Empagliflozina).
    - Bloqueio de segurança e contraindicações com base no ClCr e dosagem de potássio basal para proteção miocárdica/renal cruzada.

138. [ ] **Nefrologia - Distúrbios do Potássio (Hipocalemia e Reposição Segura)**:
    - Motor beira-leito para estimativa do déficit de Potássio e regras rígidas de infusão IV.
    - Bloqueios de segurança: concentração máxima em veia periférica (40 mEq/L) vs acesso central, e velocidade máxima (10-20 mEq/h).

139. [ ] **Ginecologia - Manejo de Sangramento Uterino Anormal (PALM-COEIN)**:
    - Algoritmo de emergência para SUA agudo severo (Ácido Tranexâmico IV, Estrogênio conjugado IV ou ACO altas doses).
    - Mapeamento das causas estruturais e não-estruturais (FIGO) no ambiente ambulatorial.

140. [ ] **Reumatologia - Artrite Séptica e Manejo Inicial da Gota Aguda (ACR/EULAR)**:
    - Interpretação rápida do líquido sinovial (contagem global de células > 50.000, PMN > 90%, glicose baixa).
    - Protocolo da Gota aguda: Colchicina + AINE ou Corticoide intra-articular/sistêmico, contraindicação formal a início ou ajuste de Alopurinol durante a crise.

141. [ ] **Pediatria - Reanimação Neonatal em Sala de Parto (Diretrizes PRN/SBP 2022-2026)**:
    - Motor de suporte minuto de ouro (Golden Minute) para avaliação de vitalidade (tônus e respiração).
    - Protocolo guiado passo-a-passo: VPP (Ventilação com Pressão Positiva), indicações rigorosas de intubação endotraqueal, e reanimação avançada (massagem cardíaca e adrenalina).
    - Alertas críticos: contraindicação de aspiração de mecônio de rotina em RN vigoroso.

142. [ ] **Ginecologia - Diagnóstico e Manejo da Doença Inflamatória Pélvica (DIP - CDC/Ministério da Saúde)**:
    - Escore clínico determinístico para critérios maiores (dor em hipogástrio, anexos e mobilização do colo) e menores.
    - Protocolo ambulatorial (Ceftriaxona IM + Doxiciclina + Metronidazol) vs Internação (Cefoxitina IV + Doxiciclina).
    - Critérios claros de falha terapêutica e indicação de abordagem cirúrgica para abscesso tubo-ovariano.

143. [ ] **Emergência Clínica - Manejo da Anafilaxia (Diretrizes WAO)**:
    - Identificação beira-leito do choque anafilático com critérios cutâneos, respiratórios e cardiovasculares.
    - Administração hiperprecoce de Adrenalina IM (0.01 mg/kg, máx 0.5 mg) no vasto lateral da coxa, sem atrasos por espera de corticoides ou anti-histamínicos (fármacos de 2ª/3ª linha).

144. [ ] **Endocrinologia e Cirurgia - Manejo de Incidentaloma Adrenal**:
    - Algoritmo de investigação bioquímica obrigatória (teste de supressão com 1mg de dexametasona, metanefrinas urinárias/plasmáticas e relação aldosterona/renina se hipertenso).
    - Avaliação fenotípica tomográfica (unidades Hounsfield < 10 benigno vs > 20 suspeito, washout absoluto e relativo).
    - Critérios de indicação cirúrgica (tamanho > 4-5 cm, crescimento em acompanhamento, ou secreção hormonal autônoma).

145. [ ] **Gastroenterologia - Manejo de Hemorragia Digestiva Baixa (HDB) Aguda**:
    - Estratificação de risco e triagem inicial de instabilidade hemodinâmica.
    - Protocolo de preparo de cólon rápido para colonoscopia precoce (< 24h) em HDB severa.
    - Indicações precisas para angiotomografia abdominal e arteriografia mesentérica para embolização.

146. [ ] **Neurologia e Urgência - Abordagem da Síndrome de Guillain-Barré (SGB / Critérios de Brighton)**:
    - Escala MRC para avaliação de força muscular segmentar.
    - Indicações de Imunoglobulina IV (IgIV) vs Plasmaférese, e monitoramento da capacidade vital forçada (CVF) para predição de falência respiratória e intubação precoce.

147. [ ] **Ginecologia Oncológica e Patologia Cervical - Manejo de Neoplasia Intraepitelial Cervical (NIC II/III) e Lesões Pré-Malignas (Diretrizes ASCCP / Ministério da Saúde / INCA)**:
    - Algoritmo de risco e conduta baseado no tripé Citologia, Colposcopia especializada com biópsia dirigida e teste de DNA-HPV de alto risco oncogênico.
    - Critérios de indicação para tratamento excisional: CAF / EZPEC (Excisão da Zona de Transformação por Cirurgia de Alta Frequência) para ZT tipo 1 e 2 vs Conização a frio para ZT tipo 3 ou suspeita de invasão/adenocarcinoma in situ (AIS).
    - Avaliação de margens cirúrgicas (endocervical e ectocervical) e protocolo rigoroso de seguimento com co-teste aos 6 e 12 meses prevenindo recidiva invasiva.

148. [ ] **Cardiologia e Medicina de Emergência - Manejo da Crise Hipertensiva: Urgência vs Emergência Hipertensiva (Diretrizes SBC / AHA 2024-2026)**:
    - Diferenciação determinística entre Urgência Hipertensiva (PA elevada sem lesão aguda de órgão-alvo) e Emergência Hipertensiva (com lesão aguda em curso: encefalopatia hipertensiva, AVE hemorrágico/isquêmico, SCA, dissecção aguda de aorta, EAP hipertensivo, eclâmpsia).
    - Metas pressóricas precisas de redução gradual (queda de no máximo 20-25% na PAM na 1ª hora para prevenir isquemia cerebral/coronariana iatrogênica; exceto na dissecção aguda de aorta, com meta imediata de PAS < 120 mmHg e FC < 60 bpm em 20 min com betabloqueador IV + vasodilatador).
    - Titulação de fármacos parenterais de precisão (Nitroprussiato de Sódio, Nitroglicerina, Labetalol, Esmolol) e bloqueio formal de nifedipino de liberação rápida sublingual.

149. [ ] **Pediatria & Alergia/Imunologia - Diagnóstico e Manejo da Alergia à Proteína do Leite de Vaca (APLV) na Infância (Diretrizes SBP / ESPGHAN)**:
    - Diferenciação clínica entre manifestações IgE-mediadas (urticária aguda, angioedema, anafilaxia imediata) vs Não IgE-mediadas (proctocolite alérgica com fezes com estrias de sangue, enteropatia induzida por proteína alimentar, FPIES com vômitos profusos e choque hipovolêmico).
    - Protocolo de teste de desencadeamento oral (TDO) e dieta de exclusão materna (se aleitamento materno exclusivo com suplementação de cálcio 1000 mg/dia) vs fórmulas especiais (fórmula extensamente hidrolisada - FeH de 1ª linha vs fórmula de aminoácidos livres em anafilaxia, falha de FeH ou FPIES severo).
    - Contraindicação formal de fórmulas à base de soja antes dos 6 meses de vida e proibição de leites de outros mamíferos (cabra, ovelha) devido à alta reatividade cruzada (> 90%).

150. [ ] **Ginecologia & Oncologia Pélvica - Rastreamento e Manejo de Câncer de Endométrio e Espessamento Endometrial na Pós-Menopausa (Diretrizes ESGO / FEBRASGO)**:
    - Critérios ecográficos de corte para espessamento endometrial (eco endometrial > 4-5 mm sem THM ou > 8 mm com THM, ou sangramento pós-menopausa).
    - Algoritmo de amostragem endometrial: biópsia com Pipelle de Cornier em consultório vs histeroscopia com biópsia dirigida padrão-ouro em caso de Pipelle insuficiente ou lesão focal/pólipo.
    - Classificação molecular do câncer de endométrio (POLE ultramutado, MMR deficiente, p53 anormal / cópia alta, sem perfil molecular específico - NSMP) e estadiamento FIGO 2023.

151. [ ] **Infectologia & Terapia Intensiva - Manejo da Meningite Bacteriana Aguda do Adulto e da Criança (Diretrizes IDSA / SBP / Ministério da Saúde)**:
    - Tríade clássica (febre, rigidez de nuca, alteração do sensório) e indicações de TC de crânio antes da Punção Lombar (déficit focal, convulsão nova, papiledema, imunossupressão, rebaixamento profundo).
    - Janela de ouro terapêutica: Antibioticoterapia empírica em até 1 hora (Ceftriaxona 2g IV 12/12h + Ampicilina se > 50 anos / gestante / imunossuprimido para *Listeria* + Vancomicina se pneumococo resistente).
    - Regra mandatória de Dexametasona 10 mg IV (ou 0,15 mg/kg em pediatria) administrada ANTES ou junto com a primeira dose de antibiótico para redução de sequelas auditivas e mortalidade no pneumococo.
    - Quimioprofilaxia de contatos íntimos para Meningococo e *Haemophilus influenzae* tipo b (Rifampicina vs Ciprofloxacino vs Ceftriaxona).

152. [ ] **Pneumologia & Medicina de Emergência - Manejo da Crise Asmática Aguda na Gestação (Diretrizes GINA / NAEPP)**:
    - Monitoramento materno-fetal contínuo: saturação de oxigênio alvo materno estrita (SpO2 ≥ 95% para garantir oxigenação fetal e prevenir hipóxia/RCF).
    - Regra de segurança: A crise asmática descontrolada é MUITO mais perigosa para o feto do que as medicações inalatórias de controle. Bloqueio de omissão ou suspensão de broncodilatadores e corticoides.
    - Segurança comprovada de Beta-2 agonistas de curta ação (Salbutamol) e corticoides inalatórios (Budesonida) e sistêmicos (Prednisona / Hidrocortisona) na exacerbação.
    - Alerta crítico: Alcalose respiratória fisiológica na gestante mascara fadiga diafragmática (PaCO2 normal ≥ 35 mmHg ou acidose respiratória em gestante é sinal de fadiga extrema e iminência de parada respiratória).

153. [ ] **Hematologia & Terapia Intensiva - Manejo da Trombocitopenia Induzida por Heparina (TIH / HIT Tipo II - Escore dos 4 Ts / ASH / CHEST)**:
    - Motor determinístico beira-leito para cálculo do Escore dos 4 Ts (Thrombocytopenia, Timing, Thrombosis, oTher causes of thrombocytopenia) estratificado em baixo risco (≤ 3), intermediário (4-5) e alto risco (6-8).
    - Ação emergencial de bloqueio de segurança: SUSPENSÃO IMEDIATA de TODAS as heparinas (HBPM e HNF), inclusive flushes e cateteres heparinizados.
    - Contraindicação formal de transfusão plaquetária profilática (risco paradoxal de trombose fulminante) e contraindicação de início precoce de Varfarina na fase aguda (risco de necrose cutânea por queda de proteína C).
    - Terapia com anticoagulantes não heparínicos de ação direta parenteral (Fondaparinux ou Argatroban ou Bivalirudina) em dose terapêutica mesmo sem trombose manifesta.

154. [ ] **Obstetrícia & Infectologia - Manejo de HIV na Gestação e Prevenção da Transmissão Vertical (Diretrizes Ministério da Saúde / CDC / ACOG)**:
    - Início imediato de TARV tripla potente (Dolutegravir 50mg + Tenofovir 300mg + Lamivudina 300mg) independentemente de contagem de linfócitos T-CD4+ ou carga viral.
    - Algoritmo determinístico de via de parto segundo a Carga Viral (CV) com 34-36 semanas: CV < 50 cópias/mL (indicação obstétrica sem AZT venoso obrigatório se suprimida sustentada); CV 50 a 999 cópias/mL (indicação obstétrica com Zidovudina IV contínua); CV ≥ 1000 cópias/mL (Cesariana eletiva mandatória com 38 semanas + AZT IV contínuo).
    - Cuidados de parto e puerpério: clampeamento imediato sem ordenha do cordão umbilical, profilaxia neonatal oportuna e INIBIÇÃO DA LACTAÇÃO materna (Cabergolina 1 mg dose única oral + contraindicação formal absoluta de aleitamento ao seio materno).

155. [ ] **Reumatologia & Obstetrícia - Manejo do Lúpus Eritematoso Sistêmico (LES) na Gestação e Bloqueio Atrioventricular Congênito por Anti-Ro/SSA e Anti-La/SSB**:
    - Avaliação pré-concepcional e critérios de remissão clínica (idealmente ≥ 6 meses de inatividade de doença).
    - Manutenção de fármacos seguros (Hidroxicloroquina durante toda a gestação reduz risco de flares maternos e de BAV fetal; Azatioprina, Prednisona em baixa dose) e contraindicação absoluta de teratogênicos (Metotrexato, Micofenolato de Mofetila e Ciclofosfamida).
    - Protocolo de vigilância fetal em gestantes anti-Ro/SSA e anti-La/SSB positivas: ecocardiograma fetal seriado semanal ou quinzenal entre a 16ª e 26ª semana de gestação para detecção de BAV de 1º e 2º graus reversíveis e miocardite fetal, com uso oportuno de Dexametasona fluorada 4 mg/dia.


156. [ ] **Cardiologia - Rastreio e Manejo da Síndrome Coronariana Aguda (SCA) sem Supra de ST (Diretrizes SBC/ESC)**:
    - Estratificação de risco TIMI e GRACE para definir timing de cateterismo (imediato, precoce ou seletivo).
    - Prescrição guiada de terapia antiplaquetária dupla (AAS + Clopidogrel/Ticagrelor/Prasugrel) baseada em risco de sangramento e anatomia.
    - Otimização de terapia antitrombótica (Enoxaparina vs HNF vs Fondaparinux).

157. [ ] **Neurologia - Diagnóstico e Manejo da Crise Epiléptica e Estado de Mal Epileptico (Guidelines ILAE/Neurocritical Care)**:
    - Algoritmo de tratamento do estado de mal epiléptico (Benzodiazepínicos de 1ª linha, Fentoína/Fenobarbital de 2ª linha, e Midazolam/Propofol de 3ª linha).
    - Regras de dosagem e monitoramento de níveis séricos e efeitos colaterais de anticonvulsivantes.
    - Cuidados intensivos e suporte hemodinâmico durante sedação profunda para controle de estado de mal refratário.

158. [ ] **Urologia - Rastreio e Manejo de Hiperplasia Prostática Benigna (HPB) e Retenção Urinária Aguda (Diretrizes AUA/EAU)**:
    - Classificação de sintomas pelo escore IPSS e indicações para terapia farmacológica combinada (Alfa-bloqueadores + Inibidores da 5-alfa redutase).
    - Alerta sobre hipotensão postural associada a alfa-bloqueadores e contraindicações de antimuscarínicos em retenção.
    - Protocolo de tentativa de micção sem sonda após evento de retenção aguda de urina (desmame de sonda).

159. [ ] **Nefrologia & Terapia Intensiva - Manejo dos Distúrbios Agudos do Magnésio e Fósforo (Hipomagnesemia, Hipermagnesemia, Hipofosfatemia Severa e Síndrome de Realimentação)**:
    - Motor determinístico de reposição de Sulfato de Magnésio 10% e 50% IV e VO ajustado por severidade clínica (arritmias graves, Torsades de Pointes vs hipomagnesemia assintomática) com monitoramento estrito de reflexo patelar e função renal.
    - Protocolo de conduta na hipermagnesemia iatrogênica ou dialítica (Gluconato de Cálcio 10% IV como antagonista de membrana, expansão salina e indicação de hemodiálise de urgência).
    - Manejo da hipofosfatemia severa (< 1,0 mg/dL): reposição parenteral com Fosfato de Potássio ou Fosfato de Sódio com taxa máxima de infusão para prevenir calcificação metastática e hipocalcemia aguda severa; integração com protocolo de Síndrome de Realimentação em pacientes desnutridos ou em jejum prolongado.

160. [ ] **Dermatologia & Emergências Pediátricas e Adultas - Farmacodermias Graves (DRESS, Síndrome de Stevens-Johnson / Necrólise Epidérmica Tóxica - SCORTEN e Bloqueios Críticos)**:
    - Calculadora determinística beira-leito do escore SCORTEN para predição de mortalidade em SSJ/NET (idade, FC, neoplasia, superfície corporal descolada > 10%, ureia, glicose, bicarbonato).
    - Critérios diagnósticos de RegiSCAR para Síndrome DRESS (Drug Reaction with Eosinophilia and Systemic Symptoms) com rastreio de acometimento visceral (hepatite, nefrite, miocardite).
    - Ação emergencial de bloqueio de segurança: SUSPENSÃO IMEDIATA de todos os fármacos suspeitos de alto risco (Alopurinol, Anticonvulsivantes aromáticos, Sulfas, Nevirapina, AINEs oxicanos); suporte intensivo em leito de queimados, controle térmico e hidroeletrolítico, analgesia escalonada e contraindicação formal de desbridamento cirúrgico agressivo em SSJ/NET.

161. [ ] **Pediatria & Emergência - Manejo da Crise Convulsiva Febril e Estado de Mal Epiléptico Pediátrico (Diretrizes SBP / AAP / PALS)**:
    - Diferenciação determinística entre Crise Febril Simples (< 15 min, generalizada, única em 24h, sem déficit prévio) e Complexa (focal, > 15 min ou recorrente em 24h) com desmistificação de punção lombar e neuroimagem de rotina na forma simples.
    - Algoritmo escalonado no tempo do Estado de Mal Epiléptico Pediátrico (SE): 0-5 min (estabilização ABC, glicemia capilar), 5-10 min (1ª linha: Diazepam retal/IV ou Midazolam IM/intranasal/IV), 10-20 min (2ª linha: Levetiracetam IV vs Fenitoína IV vs Fenobarbital IV em neonatos/lactentes jovens), > 20-30 min (SE refratário: IOT com proteção de via aérea e infusão contínua de Midazolam ou Cetamina ou Tiopental em UTI pediátrica).

162. [ ] **Infectologia & Urologia - Manejo de Pielonefrite Aguda e ITU Complicada no Pronto Socorro (Diretrizes SBU / IDSA / Ministério da Saúde)**:
    - Critérios determinísticos de internação hospitalar (sepse/instabilidade, vômitos incoercíveis, gestante, rim único, obstrução litiásica associada).
    - Protocolo empírico parenteral de primeira linha (Ceftriaxona 1g-2g IV vs Ciprofloxacino/Levofloxacino) com alertas de resistência local a quinolonas e cobertura de enterobactérias produtoras de ESBL (Meropenem / Amicacina).
    - Desobstrução urológica de emergência: alerta imediato de derivação (duplo J ou nefrostomia) se ITU febril obstrutiva / abscesso perirrenal.

163. [ ] **Pneumologia & Emergência - Manejo de Hemoptise Aguda Maciça vs Não Maciça e Protocolos de Proteção de Via Aérea**:
    - Definição determinística de hemoptise maciça (> 100-200 mL/24h ou que ameace a troca gasosa/estabilidade).
    - Conduta de posicionamento imediato de segurança: decúbito lateral sobre o lado acometido (pulmão dependente) para proteger o pulmão sadio de inundação alveolar.
    - Cuidados de via aérea avançada (intubação seletiva com tubo de maior calibre >= 8.0, aspiração rígida) e contraindicação formal de sedação profunda/ansiolíticos sem IOT garantida.

164. [ ] **Cardiologia & Terapia Intensiva - Manejo da Crise e Emergência de Tamponamento Cardíaco (Tríade de Beck, Pulso Paradoxal e Pericardiocentese Guiada)**:
    - Reconhecimento determinístico beira-leito dos sinais clássicos: Tríade de Beck (hipotensão, hipofonese de bulhas e turgência jugular patológica) e Pulso Paradoxal (queda da PAS > 10 mmHg na inspiração).
    - Conduta de ressuscitação inicial volêmica dirigida (expansão com cristaloide para manter pré-carga ventricular direita enquanto prepara intervenção).
    - Guia prático de pericardiocentese de emergência (abordagem subxifoide a 45 graus direcionada ao ombro esquerdo) e contraindicação absoluta de ventilação mecânica com pressão positiva agressiva pré-drenagem (risco de colapso circulatório imediato).

165. [ ] **Endocrinologia & Terapia Intensiva - Manejo da Crise Adrenocortical Aguda (Insuficiência Adrenal Aguda e Doença de Addison Descompensada)**:
    - Reconhecimento determinístico beira-leito de choque refratário a vasopressores associado a hiponatremia, hipercalemia e hipoglicemia.
    - Protocolo de reposição imediata de Hidrocortisona (100 mg IV em bolus seguido de 200 mg/24h contínua ou 50 mg IV 6/6h) antes mesmo do resultado de cortisol sérico em pacientes instáveis.
    - Ressuscitação volêmica vigorosa com SF 0,9% associado a glicose 5-10% e contraindicação formal de reposição de mineralocorticoide (Fludrocortisona) na fase aguda (a dose suprafisiológica de hidrocortisona já fornece atividade mineralocorticoide plena).

166. [ ] **Gastroenterologia & Emergência - Manejo de Diarreia Aguda Severa, Colite Pseudomembranosa por Clostridioides difficile e Desidratação Grave (Diretrizes ACG / IDSA / Ministério da Saúde)**:
    - Estratificação de gravidade (não grave vs grave [leucócitos >= 15.000 ou creatinina >= 1.5] vs fulminante [hipotensão, choque, íleo, megacólon]).
    - Protocolo de tratamento direcionado de 1ª linha: Vancomicina oral (125 mg VO 6/6h) ou Fidaxomicina oral vs Metronidazol (somente quando indisponibilidade de vancomicina oral na forma não grave); na forma fulminante: Vancomicina 500 mg VO/SNE 6/6h associada a Metronidazol 500 mg IV 8/8h.
    - Bloqueio estrito de segurança: contraindicação formal absoluta de agentes antimotilidade (Loperamida, Difenoxilato) pelo alto risco de precipitação de megacólon tóxico e perfuração intestinal.

167. [ ] **Toxicologia & Emergência - Manejo de Intoxicação Aguda por Monóxido de Carbono (CO) e Cianeto em Vítimas de Incêndio**:
    - Monitoramento de carboxihemoglobina (COHb) e reconhecimento de oximetria de pulso convencional falsamente normal (leitura errônea de COHb como oxi-Hb).
    - Protocolo imediato de oxigenoterapia a 100% sob máscara com reservatório não reinalante (redução da meia-vida de CO de 300 para 60-90 minutos) e indicações determinísticas de Oxigenoterapia Hiperbárica (COHb > 25%, gestante com COHb > 15%, síncope ou alteração neurológica persistente).
    - Tratamento empírico concomitante de intoxicação por cianeto em fumaça de incêndio com acidose lática grave inexplicada (> 8-10 mmol/L): antídoto de primeira linha Hidroxocobalamina 5g IV em 15 min.

168. [ ] **Neurologia & Emergência - Manejo do Traumatismo Cranioencefálico (TCE) Grave e Hipertensão Intracraniana (Guidelines Brain Trauma Foundation / SBCN)**:
    - Escala de Coma de Glasgow com avaliação pupilar (GCS-P) determinística.
    - Alertas de medidas de neuroproteção de 1ª linha (cabeceira a 30°, sedação/analgesia com alvo de PAM para PPC ≥ 60-70 mmHg, eucapnia PaCO2 35-40 mmHg, normotermia e normoglicemia).
    - Terapia hiperosmolar escalonada (Salina Hipertônica 3% ou 20% bolus vs Manitol 20%) com monitoramento estrito de osmolaridade sérica (< 320 mOsm/L) e sódio (< 155-160 mEq/L), além de contraindicação formal de hiperventilação profilática prolongada (risco de isquemia cerebral reflexa) e corticoides (CRASH trial).

169. [ ] **Oftalmologia & Clínica Médica - Diagnóstico Diferencial de Olho Vermelho Agudo e Bloqueios de Iatrogenia no Pronto Socorro**:
    - Algoritmo determinístico discriminando Conjuntivite bacteriana/viral, Ceratite / Úlcera de Córnea, Esclerite, Uveíte Anterior Aguda e Glaucoma Agudo de Ângulo Fechado.
    - Bloqueio sentinela estrito: PROIBIÇÃO ABSOLUTA de prescrição de colírios corticoides por médico generalista sem avaliação por lâmpada de fenda (risco de perfuração ocular por ceratite herpética dendrítica ou ceratite fúngica e glaucoma induzido).
    - Alerta de contraindicação de colírios anestésicos para uso domiciliar (risco de ceratopatia tóxica e necrose corneana) e orientações claras de encaminhamento de urgência.

170. [ ] **Ginecologia & Mastologia - Avaliação de Nódulos Mamários, Descarga Papilar Suspeita e Conduta em BI-RADS na Atenção Primária**:
    - Classificação determinística da descarga papilar (unilateral, espontânea, uniorificial, serossanguínea ou água de rocha = suspeita com indicação de investigação histopatológica/setorectomia vs fisiológica/galactorreia bilateral multi-orificial).
    - Conduta dirigida por categoria BI-RADS mamográfica/ecográfica (BI-RADS 0 [exames complementares], BI-RADS 1 e 2 [rastreio anual/bienal de rotina], BI-RADS 3 [controle em 6 meses], BI-RADS 4 e 5 [biópsia percutânea urgente Core-biopsy/Mamotomia]).
    - Rastreio de alto risco genético (câncer de mama < 50 anos em parentes de 1º grau, câncer de mama bilateral ou câncer de ovário na família com indicação de ressonância magnética e rastreio precoce).

171. [ ] **Infectologia & Emergência - Manejo de Neutropenia Febril de Alto Risco e Choque Séptico em Paciente Oncológico (MASCC Score, Cobertura Antipseudomonas e G-CSF)**:
    - Estratificação determinística com Escore MASCC (< 21 alto risco [internação obrigatória e ATB venoso] vs ≥ 21 baixo risco).
    - Monoterapia empírica emergencial precoce (< 1h da admissão) com betalactâmico antipseudomonas (Cefepime 2g IV 8/8h, Piperacilina-Tazobactam 4.5g IV 6/6h ou Meropenem 1g IV 8/8h).
    - Critérios formais estritos para associação de Vancomicina (instabilidade hemodinâmica/choque séptico, mucosite grave graus III-IV, suspeita de infecção relacionada a cateter venoso central, colonização prévia por MRSA).
    - Bloqueios de segurança clínica: PROIBIÇÃO ABSOLUTA de toque retal, aferição de temperatura por via retal, enemas ou supositórios pelo alto risco de translocação bacteriana maciça e sepse fulminante.

172. [ ] **Toxicologia & Terapia Intensiva - Manejo da Síndrome Colinérgica Aguda e Intoxicação por Organofosforados e Carbamatos (Atropinização Dirigida e Oximas)**:
    - Reconhecimento determinístico dos sinais muscarínicos e nicotínicos (SLUDGE / DUMBELS: Salivação, Lacrimejamento, Urina, Diarreia, Gastrintestinal, Emese, Miose/Broncorreia/Bradicardia).
    - Protocolo de atropinização escalonada agressiva (início com 1 a 2 mg IV dobrando a dose a cada 5 a 10 minutos) e monitoramento de metas clínicas de atropinização (pulmões limpos sem estertores/broncorreia, FC > 80 bpm, PAS > 90 mmHg e pele seca).
    - Uso de Pralidoxima em organofosforados para reativação da acetilcolinesterase antes do envelhecimento enzimático ("aging").
    - Bloqueios farmacológicos de iatrogenia: CONTRAINDICAÇÃO FORMAL de Succinilcolina na sequência rápida de intubação (paralisia prolongada por inibição da pseudocolinesterase plasmática) e contraindicação de morfina/aminofilina.

173. [ ] **Trauma & Ortopedia - Manejo da Síndrome Compartimental Aguda de Membros e Queimaduras Circunferenciais (Sinais Precoces, Delta de Pressão e Escarotomia/Fasciotomia)**:
    - Reconhecimento determinístico dos "6 Ps" (Pain out of proportion, Paresthesia, Pallor, Paralysis, Pulselessness, Poikilothermia), enfatizando a dor desproporcional ao estiramento passivo da musculatura como sinal clínico precoce mais sensível antes da perda de pulsos.
    - Cálculo de delta de pressão intracompartimental (Delta P = PAD - P_compartimento): valor ≤ 30 mmHg indica hipoperfusão tecidual crítica e indicação cirúrgica imediata de Fasciotomia descompressiva.
    - Bloqueios de conduta iatrogênica: CONTRAINDICAÇÃO FORMAL de elevação do membro acima do nível cardíaco (reduz a pressão de perfusão capilar arterial e agrava a isquemia muscular profunda), contraindicação de crioterapia/gelo e necessidade de remoção imediata de qualquer gesso, atadura ou curativo circular compressivo.

