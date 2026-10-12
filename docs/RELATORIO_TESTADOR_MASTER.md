# 📋 Relatório de Auditoria & Sugestões: Testador Master (Telegram)

> ⏱️ **Sessão executada em:** 12/10/2026 às 17:24:15  
> ⏳ **Duração total:** 14m 29s | **Ciclos concluídos:** 451  
> 📊 **Cobertura estimada:** 55.7% | **Telas descobertas:** 198 | **Botões testados:** 157  
> ⚡ **Latência média beira-leito:** 351.9ms

---

## 🎯 Sumário Executivo de Diagnóstico

- **Total de anomalias detectadas:** 33
- **Scripts de Reprodução gerados (1-Clique):** 0
- **🧮 Fórmulas Clínicas auditadas pelo Oráculo Matemático:** 45 (100.0% em conformidade determinística)
- **Críticos / Bugs:** 0
- **Oportunidades de UX / Ergonomia:** 25
- **Alertas de Performance / Latência:** 8

---

## 🚨 Anomalias e Pontos de Atenção Identificados

### `ISSUE-001` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🩺 Exemplo HAS`
- **Descrição:** Resposta muito extensa (4594 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-002` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🩸 Exemplo DM2`
- **Descrição:** Resposta muito extensa (4541 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-003` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `📋 Copiar SOAP para PEP`
- **Descrição:** Resposta muito extensa (3582 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-004` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `➕ Incorporar ao SOAP`
- **Descrição:** Ação demorou 10058ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 4x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-005` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `Traçado de ECG (Supra de ST Inferior)`
- **Descrição:** Resposta muito extensa (1997 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 4x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-006` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `Confirmar registro`
- **Descrição:** Ação demorou 2099ms, ultrapassando a tolerância de 1800ms da persona Dr. Thiago Campos.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-007` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `👶 Pediatria`
- **Descrição:** Resposta muito extensa (1998 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-008` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `📖 Ver Comandos`
- **Descrição:** Resposta muito extensa (8572 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-009` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `Padrão`
- **Descrição:** Resposta muito extensa (1998 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-010` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `????`
- **Descrição:** Ação demorou 2038ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-011` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🫁 Exemplo IVAS`
- **Descrição:** Resposta muito extensa (2945 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-012` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `📱 Cockpit Mini App`
- **Descrição:** Resposta muito extensa (2164 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-013` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `📱 Cockpit Mini App`
- **Descrição:** Ação demorou 15114ms, ultrapassando a tolerância de 3000ms da persona Dra. Camila Nogueira.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-014` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🚨 CAD (Winter)`
- **Descrição:** Resposta muito extensa (2151 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-015` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🦴 Lombalgia`
- **Descrição:** Resposta muito extensa (3266 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-016` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `📋 Fechar Plano`
- **Descrição:** Ação demorou 14091ms, ultrapassando a tolerância de 1800ms da persona Dr. Thiago Campos.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-017` · ⏱️ GARGALO DE LATÊNCIA (BAIXA) — `🔄 Atualizar Tarefas`
- **Descrição:** Ação demorou 1526ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-018` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🫁 DPOC (Acidose Resp)`
- **Descrição:** Resposta muito extensa (2017 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-019` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🏁 Fim de Plantão`
- **Descrição:** Resposta muito extensa (2110 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-020` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/sri 113 choque`
- **Descrição:** Resposta muito extensa (1960 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-021` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `⚡ Sepse (Choque Lático)`
- **Descrição:** Resposta muito extensa (2363 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-022` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/ped azitromicina 33`
- **Descrição:** Resposta muito extensa (2183 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-023` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `💊 Prescrever (Azitromicina)`
- **Descrição:** Resposta muito extensa (3694 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-024` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `!@#$%`
- **Descrição:** Resposta muito extensa (2164 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-025` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `!@#$%`
- **Descrição:** Ação demorou 10890ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-026` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/sri 103 choque`
- **Descrição:** Resposta muito extensa (1960 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-027` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `SELECT * FROM users`
- **Descrição:** Resposta muito extensa (2164 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-028` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `SELECT * FROM users`
- **Descrição:** Ação demorou 7057ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-029` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/sri 106 choque`
- **Descrição:** Resposta muito extensa (1960 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-030` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🤮 Vômitos (Alcalose Met)`
- **Descrição:** Resposta muito extensa (1919 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-031` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dva nora 81`
- **Descrição:** Resposta muito extensa (1997 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-032` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `📋 Copiar para Prontuário`
- **Descrição:** Resposta muito extensa (1802 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-033` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🤰 Caso DUM 10/02/2026`
- **Descrição:** Resposta muito extensa (1867 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

---

## 🧮 Auditoria Matemática de Fórmulas Clínicas (Anti-Alucinação Determinístico)

> 🛡️ **Gabarito Canônico Determinístico**: Todo cálculo clínico executado durante os testes é auditado em tempo real por um oráculo analítico em Python puro com dupla precisão (Harrison, KDIGO, SBC, SBP, NEJM), sem uso de LLM, prevenindo alucinações e garantindo tolerância estrita (ε < 0.5).

**Resumo da Avaliação Numérica:** 45/45 cálculos aprovados (100.0% de conformidade).

| Ciclo | Calculadora | Comando Testado | Esperado (Oráculo) | Obtido (Bot) | Erro Abs | Conformidade |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C04 | SRI | `/sri perfil_inexistente` | Guia de uso de SRI | Guia exibido | - | ✅ **Aprovado** |
| C19 | Cockcroft-Gault | `/crcl cem anos 80kg cr 2` | Bloqueio defensivo por parâmetros insuficientes | Bloqueio acionado | - | ✅ **Aprovado** |
| C22 | Cockcroft-Gault | `/crcl 39 74 1.9 fem` | 46.4 | 46.4 | 0.00 | ✅ **Aprovado** |
| C19 | SRI | `/sri 0` | Bloqueio defensivo para peso não positivo | Alerta emitido | - | ✅ **Aprovado** |
| C29 | SRI | `/sri -1` | Bloqueio defensivo para peso não positivo | Alerta emitido | - | ✅ **Aprovado** |
| C39 | DVA | `/dva nora abc` | Guia de uso de DVA ou bloqueio de peso inválido | Guia ou alerta defensivo exibido | - | ✅ **Aprovado** |
| C54 | SRI | `/sri -1` | Bloqueio defensivo para peso não positivo | Alerta emitido | - | ✅ **Aprovado** |
| C69 | DVA | `/dva nora 10.5.5` | Alerta de peso inválido | Alerta emitido | - | ✅ **Aprovado** |
| C81 | SRI | `/sri 80 broncoespasmo` | Etomidato 12.0 mL (24.0 mg) | Validado | - | ✅ **Aprovado** |
| C104 | SRI | `/sri -1` | Bloqueio defensivo para peso não positivo | Alerta emitido | - | ✅ **Aprovado** |
| C114 | Gasometria Completa | `/gaso - - -` | Guia de Gasometria | Guia exibido | - | ✅ **Aprovado** |
| C129 | Gasometria Completa | `/gaso invalido` | Guia de Gasometria | Guia exibido | - | ✅ **Aprovado** |
| C139 | Cockcroft-Gault | `/crcl idade peso` | Bloqueio defensivo por parâmetros insuficientes | Bloqueio acionado | - | ✅ **Aprovado** |
| C154 | DHE | `/dhe na 500 peso -5` | Bloqueio defensivo para parâmetros não positivos | Alerta emitido | - | ✅ **Aprovado** |
| C164 | Cockcroft-Gault | `/crcl -20 0 0 masc` | Bloqueio defensivo para parâmetros não positivos | Alerta emitido | - | ✅ **Aprovado** |
| C169 | DVA Noradrenalina | `/dva nora 99999` | Bloqueio defensivo para peso fora dos limites fisiológicos | Alerta emitido | - | ✅ **Aprovado** |
| C177 | Cockcroft-Gault | `/clcr 82 75 2.4` | 25.2 | 25.2 | 0.00 | ✅ **Aprovado** |
| C199 | SRI | `/sri 0` | Bloqueio defensivo para peso não positivo | Alerta emitido | - | ✅ **Aprovado** |
| C236 | DVA Dobutamina | `/dva dobu 94` | 28.2 | 28.2 | 0.00 | ✅ **Aprovado** |
| C239 | DHE | `/dhe na -10 peso 0` | Bloqueio defensivo para parâmetros não positivos | Alerta emitido | - | ✅ **Aprovado** |
| C241 | Winter | `/winter 22` | 41.0 | 41.0 | 0.00 | ✅ **Aprovado** |
| C254 | Cockcroft-Gault | `/crcl cem anos 80kg cr 2` | Bloqueio defensivo por parâmetros insuficientes | Bloqueio acionado | - | ✅ **Aprovado** |
| C266 | SRI | `/sri 113 choque` | Etomidato 16.9 mL (33.9 mg) | Validado | - | ✅ **Aprovado** |
| C269 | Gasometria Completa | `/gaso pH 7` | Guia de Gasometria | Guia exibido | - | ✅ **Aprovado** |
| C294 | SRI | `/sri perfil_inexistente` | Guia de uso de SRI | Guia exibido | - | ✅ **Aprovado** |
| C299 | DHE | `/dhe na abc peso -5` | Bloqueio defensivo para parâmetros não positivos | Alerta emitido | - | ✅ **Aprovado** |
| C311 | DVA Dobutamina | `/dva dobu 112` | 33.6 | 33.6 | 0.00 | ✅ **Aprovado** |
| C314 | SRI | `/sri 999999` | Etomidato 149999.9 mL (299999.7 mg) | Validado | - | ✅ **Aprovado** |
| C316 | SRI | `/sri 84 neuro` | Etomidato 12.6 mL (25.2 mg) | Validado | - | ✅ **Aprovado** |
| C319 | Cockcroft-Gault | `/crcl cem anos 80kg cr 2` | Bloqueio defensivo por parâmetros insuficientes | Bloqueio acionado | - | ✅ **Aprovado** |

---

## 💡 Catálogo de Sugestões Priorizadas para o Telegram Bot

Com base na simulação do comportamento das personas (Plantonista de Choque, R1 Metódica, Gestor de Rotina, Fuzzer e Residente de Round), listamos as principais recomendações para elevar a experiência médica beira-leito:

1. **Teclado de Retorno Universal ('🔙 Voltar' / '🏠 Início')**: Garantir que absolutamente todo comando clínico (ex: `/gaso`, `/dhe`, `/sri`, `/crcl`) termine com uma linha de botões de navegação, eliminando 100% dos *dead-ends* identificados.
2. **Resumo Visual em 1 Tela (Sem Scroll)**: Em condutas de PCR e Choque Séptico, limitar a primeira mensagem aos passos imediatos (1 a 3) com botões para aprofundar, evitando rolagem em situações de emergência.
3. **Feedback Háptico / Textual Imediato em Botões**: Nos callbacks de habit log e ações de rotina, responder `answerCallbackQuery` com texto dinâmico claro (ex: `✅ Concluído!`) para dar retorno instantâneo antes da renderização.
4. **Atalhos de 1 Toque para Cálculos Sequenciais**: Ao calcular `/dva nora 70`, oferecer botões imediatos de titulação rápida (`+0.05 mcg/kg/min`, `-0.05 mcg/kg/min`) para ajuste contínuo durante a infusão.

---

## 🗺️ Mapa de Menus e Telas Mapeadas pelo Crawler

| ID da Tela | Título / Primeira Linha | Botões Disponíveis | Visitas |
| :--- | :--- | :--- | :--- |
| `be8340f79549` | ⚡ **Ultra Rotina · Central de Comandos Beira- | 8 opções | 2 |
| `cc9fa6177385` | 🚨 **EMERGÊNCIA & SALA VERMELHA** | 13 opções | 2 |
| `3d53cfa59608` | 🚨 **PARADA CARDIORRESPIRATÓRIA (PCR ADULTO —  | 9 opções | 1 |
| `3d7ef0e41e15` | 📋 **PRONTO PARA O PRONTUÁRIO (1-TOQUE PARA CO | 2 opções | 1 |
| `24b12c753778` | ⚠️ **Peso obrigatório e inválido para SRI/IOT | 5 opções | 1 |
| `ace649328508` | 🔴 **SALA VERMELHA · SRI / IOT** | 5 opções | 2 |
| `8a16b5a1d655` | ⚠️ **Rascunho para conferência médica** | 7 opções | 2 |
| `244e454a5507` | 🩺 **AMBULATÓRIO & ATENÇÃO PRIMÁRIA (UBS)** | 9 opções | 1 |
| `eca0e4085ac6` | 🩺 **CONDUTA CITOPATOLÓGICA DE COLO DE ÚTERO ( | 6 opções | 1 |
| `131c2ed72b83` | 🚨 **EMERGÊNCIA - ACHADO CRÍTICO:** Acidemia g | 3 opções | 1 |
| `e6c3f65a017c` | 📋 **Consolidando anamnese, exame físico e ger | 0 opções | 1 |
| `4c132a9d2a09` | ⚠️ Erro ao consultar o Notion Habit Log. | 0 opções | 1 |
| `46dc8b641985` | 🧹 **Memória limpa.** Pronto para o próximo pa | 6 opções | 2 |
| `36a2ec9866b3` | 🫁 **SEQUÊNCIA RÁPIDA DE INTUBAÇÃO (SRI / IOT) | 8 opções | 1 |
| `c2d1f1391cb4` | **✅ CHECKLIST DOS 7 Ps · SRI / IOT** | 3 opções | 1 |
| `fbbe7016e95b` | ❌ Falta informação! Preciso de **Idade**, **P | 4 opções | 1 |
| `6c5905abb124` | 📐 **CALCULADORA CLÍNICA: MERO** | 2 opções | 1 |
| `31efbfe22925` | ⚡ Analisando caso clínico... | 0 opções | 1 |
| `abd9aff7f7b6` | **Clearance Estimado:** 46.4 mL/min (Estágio  | 4 opções | 1 |
| `0266727a4cfa` | 📐 **CALCULADORA CLÍNICA: VANCO** | 2 opções | 1 |
| `f0b862bc750d` | 🛏️ **ENFERMARIA & PRESCRIÇÃO** | 10 opções | 1 |
| `13f6d71de75f` | ⚡ *Ultra Rotina · Central de Comandos Beira-L | 8 opções | 31 |
| `4b8080f2ce28` | 🛏️ *ENFERMARIA & PRESCRIÇÃO* | 10 opções | 6 |
| `fd05c9121e76` | 🏥 *Enfermaria · (11 leitos: 🟢 7 - 🟡 0 - 🔴 4)* | 11 opções | 2 |
| `a1d6287d6c03` | 🛏️ *Leito 1* · 🚨 Instável / Crítico | 9 opções | 1 |
| `5ee6a1fb2877` | 🧹 *Memória limpa.* Pronto para o próximo paci | 6 opções | 11 |
| `3ae965b9beac` | 🩺 *AMBULATÓRIO & ATENÇÃO PRIMÁRIA (UBS)* | 9 opções | 10 |
| `fa9941178f04` | 📝 *SOAP AMBULATORIAL ÁGIL (ATENÇÃO PRIMÁRIA & | 3 opções | 1 |
| `ef9f51563e86` | *SOAP (Caso Clínico) · Novo Caso* | 6 opções | 5 |
| `864e8f8e6a1d` | 📋 *PRONTUÁRIO CLÍNICO AMBULATORIAL (SOAP ÁGIL | 4 opções | 4 |

---
> 🌐 **Dashboard Visual Interativo:** Abra [`data/dashboard_grafo.html`](../data/dashboard_grafo.html) no navegador para explorar o grafo de navegação em tempo real.

*(Relatório gerado automaticamente pelo Ultra Rotina Testador Master)*
