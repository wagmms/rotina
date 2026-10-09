# 🗺️ Mapa Mental & Fluxograma Estrutural do Ultra Rotina

> **Documento de Governança Clínica e Arquitetura de Usabilidade**  
> *Versão: 2.5 · Foco: Internato Médico e Médico Generalista*

---

## 1. Visão Global de Acesso e Roteamento

Este fluxograma ilustra como uma solicitação médica entra no sistema, é interpretada e despachada para os motores determinísticos locais em RAM (< 15ms) ou para os motores de inteligência.

```mermaid
flowchart TD
    subgraph ENTRADA["🚪 Portas de Entrada do Médico"]
        TG["📱 Telegram Bot (@wagner_rotina_bot)"]
        PWA["💻 Cockpit PWA (Web / Celular)"]
    end

    subgraph ROTEAMENTO["🧠 Camada de Roteamento & UX"]
        CMD["Comandos Slash (/ajuda - 97 canônicos)"]
        TECLADO["Teclados Fixos & Hubs (/menu, /ef)"]
        NATURAL["Linguagem Natural Beira-Leito (Sem /)"]
        RPC["Fastify RPC (133 rotas em RAM)"]
    end

    subgraph PILARES["🏥 Três Pilares Clínicos Beira-Leito"]
        P1["🚨 Pilar 1: Sala Vermelha & Emergência"]
        P2["🛏️ Pilar 2: Enfermaria Clínica Geral"]
        P3["🩺 Pilar 3: Atenção Primária & UBS"]
    end

    subgraph TRANSVERSAIS["⚙️ Módulos de Apoio Transversal"]
        M_FARMACO["💊 Farmacologia, REMUME & HSL"]
        M_CALC["📐 Calculadoras & Fórmulas"]
        M_EF["🩺 Exame Físico Especializado"]
        M_ROTINA["📅 Rotina, Preceptor & Produtividade"]
    end

    TG --> CMD
    TG --> TECLADO
    TG --> NATURAL
    PWA --> RPC

    CMD --> PILARES
    CMD --> TRANSVERSAIS
    TECLADO --> PILARES
    NATURAL --> PILARES
    NATURAL --> TRANSVERSAIS
    RPC --> PILARES
    RPC --> TRANSVERSAIS
```

---

## 2. Mapa Mental Completo da Estrutura Atual

O sistema atual está dividido em **17 categorias no Telegram (97 comandos canônicos)** e **4 abas operacionais no Cockpit PWA**:

```mermaid
graph LR
    UR["Ultra Rotina 2.5"]

    %% PILAR 1: EMERGÊNCIA
    UR --> EM["🚨 Emergência & Sala Vermelha (14 cmds)"]
    EM --> EM_DVA["DVA: Nora, Dobuta, Vaso (/dva)"]
    EM --> EM_SRI["SRI: Etomidato, Quetamina, Rocurônio (/sri)"]
    EM --> EM_PCR["PCR / ACLS Materno e Adulto (/conduta)"]
    EM --> EM_SEPSE["Choque Séptico & CIRCI (/choqueseptico)"]
    EM --> EM_GASO["Gasometria 5 Passos & Winter (/gaso, /winter)"]
    EM --> EM_CARDIO["SCA, DAPT, AVC, HIC (/sca, /avc, /hic)"]
    EM --> EM_TOX["Intoxicações & Antídotos (/intox)"]
    EM --> EM_DOR["Dor Abdominal Aguda: Pancreatite & Cólica (/pancreatite, /colica)"]

    %% PILAR 2: ENFERMARIA
    UR --> ENF["🛏️ Enfermaria & Internação (8 cmds)"]
    ENF --> ENF_CENSO["Censo & Gestão de Leitos (/enfermaria, /leito, /alta)"]
    ENF --> ENF_PASS["Passagem de Plantão SBAR (/passagem, /plantao, /plantao_fim)"]
    ENF --> ENF_ROUND["Pitch de Round & Preceptor (/round)"]
    ENF --> ENF_CLIN["Clínica Geral: DHE, KDIGO, DPOC, Asma, Anemia (/crcl, /anemia, /ganzoni)"]

    %% PILAR 3: AMBULATÓRIO & APS
    UR --> AMB["🩺 Atenção Primária & UBS (18 cmds)"]
    AMB --> AMB_SOAP["SOAP Ágil, CID-10, Atestado CFM (/soap, /ambulatorio, /atestado)"]
    AMB --> AMB_RX["Prescrição REMUME Ambulatorial & Hospitalar (/rx, /rxh)"]
    AMB --> AMB_PRE["Pré-Natal Baixo Risco & Sorologias (/prenatal, /toxo)"]
    AMB --> AMB_GIN["Ginecologia, Preventivo, SUA, Contracepção (/ginecologia, /preventivo, /sua, /anticoncepcao, /corrimento)"]
    AMB --> AMB_PED["Puericultura & Pediatria Básica (/ped, /conduta_ped, /bronquiolite)"]
    AMB --> AMB_CRON["Doenças Crônicas: DM, HAS, FRAX, Beers (/diabetes, /idoso, /cfs, /beers)"]

    %% MÓDULOS DE SUPORTE
    UR --> SUP["⚙️ Suporte & Ferramental (57 cmds)"]
    SUP --> SUP_FARMACO["Farmacologia: Doses, Ajuste Renal ATB, Interações (/dose, /atb, /interacao)"]
    SUP --> SUP_EF["Exame Físico Unificado (/ef - 11 botões)"]
    SUP --> SUP_PROD["Produtividade, Notion & Agenda (/agenda, /task, /tasks, /briefing, /semana)"]
    SUP --> SUP_GOV["Governança, Calculadoras & Protocolos (/calc, /protocolo, /kaizen)"]
```

---

## 3. Diagnóstico Crítico: Onde tem EXCESSO (Gordura / Redundância)

Ao analisar a dispersão dos 97 comandos canônicos e das rotas do sistema sob a ótica de um **médico generalista e interno**, identificamos os seguintes pontos de sobrecarga cognitiva:

```mermaid
flowchart TD
    subgraph EXCESSOS["⚠️ Pontos de Excesso Identificados"]
        E1["📅 Rotina & Produtividade Pessoal (9 comandos)"]
        E2["🛏️ Dispersão de Comandos de Plantão (8 comandos)"]
        E3["🩸 Fragmentação Metabólica e Diabética (5 comandos)"]
        E4["🛡️ Burocracia & Governança (5 comandos)"]
    end

    E1 --- D1["/task, /tasks, /agenda, /rotina, /checkin, /semana, /briefing: Muito disperso para o beira-leito. Poderia ser 1 único painel /rotina com botões."]
    E2 --- D2["/plantao, /plantao_fim, /passagem, /leito, /alta, /limpar_enfermaria: No plantão o médico precisa de 1 tela /enfermaria com ações em 1 toque."]
    E3 --- D3["/diabetes, /ehh, /glicemia: Glicemia capilar e mapa de insulina deveriam ser absorvidos no próprio /diabetes."]
    E4 --- D4["/pendencias, /chancelar, /kaizen: Rotinas de auditoria de preceptor que o generalista raramente usa na correria da UPA/UBS."]
```

### Detalhamento dos Excessos:

1. **Hiperfragmentação da Categoria 16 (Preceptor & Rotina):**
   * Atualmente conta com **9 comandos**: `/voz`, `/duvida`, `/rotina`, `/agenda`, `/task`, `/tasks`, `/briefing`, `/checkin`, `/semana`.
   * **Problema:** Um médico em plantão ou na UBS não quer digitar comandos separados para listar tarefas, ver agenda ou dar check-in.
   * **Recomendação:** Unificar em `/rotina` (com botões: `📅 Agenda`, `📋 Tarefas`, `☀️ Briefing`, `🎙️ Preceptor`).

2. **Proliferação de Comandos na Enfermaria (Categoria 15):**
   * Atualmente conta com **8 comandos**: `/enfermaria`, `/leito`, `/alta`, `/limpar_enfermaria`, `/passagem`, `/plantao`, `/plantao_fim`, `/round`.
   * **Problema:** `/plantao` e `/plantao_fim` são apenas marcadores de horário, e `/alta` ou `/leito` podem ser botões inline dentro do censo da `/enfermaria`.
   * **Recomendação:** O comando `/enfermaria` deve ser o cockpit único, contendo botões interativos para `➕ Adicionar Leito`, `📤 Dar Alta`, `📋 Passagem SBAR` e `🎙️ Pitch de Round`.

3. **Duplicidade em Queixas Abdominais Agudas:**
   * `/pancreatite` e `/colica` (cólica nefrética) estão soltas como comandos de barra isolados dentro de Emergência CTI.
   * **Recomendação:** Agrupar sob uma abordagem sindrômica de **Dor Abdominal Aguda** ou manter integradas na busca de condutas.

---

## 4. Diagnóstico Crítico: Onde tem FALTA (Lacunas Clínicas Essenciais)

O assistente possui um nível avançado em terapia intensiva (DVA, SRI, SDRA, KDIGO, Circi), mas possui **lacunas de alta prevalência** na rotina do generalista de UPA, Pronto Atendimento e UBS:

```mermaid
flowchart TD
    subgraph FALTAS["🚨 Lacunas Clínicas Essenciais (Atenção Prioritária)"]
        F1["🦟 Arboviroses & Dengue (Estadiamento A, B, C, D)"]
        F2["🫁 Infecções de Porta: PAC & ITU / Pielonefrite"]
        F3["❤️ Hipertensão na Porta: Crise vs Pseudocrise"]
        F4["🩹 Pequenas Urgências: Sutura, Anestesia & Mordeduras"]
        F5["📄 Medicina Legal: Declaração de Óbito & Notificação Compulsória"]
    end

    F1 --- R1["Conduta nº 1 no Brasil: Estadiamento A/B/C/D com cálculo de hidratação oral vs venosa imediata por peso."]
    F2 --- R2["Queixas mais comuns de PA: CURB-65 imediato para PAC e antibiótico empírico de ITU alta vs baixa."]
    F3 --- R3["Diferenciação beira-leito entre Emergência Hipertensiva (lesão de órgão-alvo) e Pseudocrise (dor/ansiedade)."]
    F4 --- R4["Técnicas de sutura, fios, tempo de retirada de pontos, profilaxia de tétano e raiva humana."]
    F5 --- R5["Guia de preenchimento de DO (Causa Básica vs Imediata) e fichas de notificação rápida (SINAN)."]
```

### Detalhamento das Lacunas que Devem ser Priorizadas:

1. **🦟 Protocolo de Dengue / Chikungunya (Gravíssimo Faltar no Brasil):**
   * O generalista lida diariamente com suspeita de dengue.
   * **O que precisa ter:** Classificação em Grupos **A** (ambulatorial), **B** (leito de observação/plaquetometria), **C** (hidratação venosa imediata 10 mL/kg/h) e **D** (choque com expansão 20 mL/kg em 20 min).

2. **🫁 Infecções Comunitárias de Porta (PAC & ITU):**
   * Embora exista `/atb`, falta uma abordagem sindrômica orientada à porta:
     * **Pneumonia Adquirida na Comunidade (PAC):** Cálculo direto do `CURB-65`, indicação de tratamento ambulatorial (Amoxicilina + Clavulanato / Azitromicina) vs internação (Ceftriaxona + Claritromicina).
     * **ITU & Pielonefrite:** Diferenciação cistite não complicada (Fosfomicina / Nitrofurantoína) vs pielonefrite ambulatorial (Ciprofloxacino) vs hospitalar (Ceftriaxona).

3. **❤️ Crise Hipertensiva vs Pseudocrise Hipertensiva:**
   * Uma das queixas mais frequentes em Pronto Socorro. O assistente precisa de um algoritmo claro:
     * PA elevada + ausência de lesão de órgão-alvo = **Pseudocrise** (analgesia, repouso, sem necessidade de anti-hipertensivo IV).
     * PA elevada + EAP / Dissecção / Encefalopatia = **Emergência** (Nitroprussiato de Sódio titulado).

4. **🩹 Pequenas Urgências e Traumatologia Básica:**
   * Generalista em UPA atende ferimentos cortocontusos e quedas:
     * Regras de Ottawa para indicação de Raio-X de tornozelo/joelho.
     * Tabela rápida de fios cirúrgicos, doses máximas de Lidocaína (com e sem vasoconstritor) e profilaxia de Tétano/Raiva.

5. **📄 Medicina Legal & Prática Burocrática Beira-Leito:**
   * Preenchimento de **Declaração de Óbito (DO)**: Guia passo a passo (o que colocar na linha a, b, c e causa básica; quando encaminhar para SVO vs IML).
   * Lista rápida de **Doenças de Notificação Compulsória Imediata** (24h) pelo Ministério da Saúde.

---

## 5. Matriz de Rebalanceamento Recomendada (Plano de Ação)

| Área / Categoria | Estado Atual | Diagnóstico | Ação Sugerida |
| :--- | :---: | :---: | :--- |
| **🚨 Emergência & Sala Vermelha** | 14 comandos | Forte & Maduro | Manter como está; agrupar `/pancreatite` e `/colica` em dor abdominal. |
| **🫁 Infecções Comunitárias** | Disperso em `/atb` | ⚠️ **FALTA** | Criar protocolo integrado de **PAC (CURB-65)** e **ITU/Pielonefrite**. |
| **🦟 Arboviroses / Dengue** | Inexistente | 🚨 **FALTA CRÍTICA** | Criar módulo determinístico de **Dengue A/B/C/D** com hidratação por peso. |
| **❤️ HAS / Crise Hipertensiva** | Inexistente | ⚠️ **FALTA** | Criar fluxograma de **Pseudocrise vs Emergência Hipertensiva**. |
| **🛏️ Enfermaria & Leitos** | 8 comandos | 🟡 **EXCESSO** | Fundir rotinas em 1 comando `/enfermaria` com botões interativos. |
| **📅 Rotina & Produtividade** | 9 comandos | 🟡 **EXCESSO** | Fundir rotinas em 1 hub `/rotina` com inline keyboard. |
| **🩸 Diabetes & Metabolismo** | 5 comandos | 🟡 **EXCESSO** | Integrar `/glicemia` e `/ehh` dentro do painel `/diabetes`. |
| **🩹 Pequenas Urgências / Sutura** | Inexistente | ⚠️ **FALTA** | Adicionar módulo de **Suturas, Lidocaína e Regras de Ottawa**. |
| **📄 Declaração de Óbito & Notificação** | Inexistente | ⚠️ **FALTA** | Adicionar guia beira-leito para preenchimento de **DO e SINAN**. |

---

## 6. Próximos Passos Recomendados

1. **Enxugar Excesso de Botões/Comandos:** Compactar as categorias de *Enfermaria* (de 8 para 2 comandos) e *Rotina* (de 9 para 2 comandos) usando botões no próprio Telegram.
2. **Preencher as Lacunas Clínicas:** Implementar os 3 módulos de maior peso epidemiológico no Brasil para o médico generalista: **Dengue A-D**, **PAC/ITU** e **Crise Hipertensiva**.
3. **Consolidar no Cockpit:** Espelhar essas melhorias na aba de calculadoras e condutas rápidas do Cockpit PWA.
