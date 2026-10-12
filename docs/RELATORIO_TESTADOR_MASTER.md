# 📋 Relatório de Auditoria & Sugestões: Testador Master (Telegram)

> ⏱️ **Sessão executada em:** 12/10/2026 às 16:38:50  
> ⏳ **Duração total:** 27m 46s | **Ciclos concluídos:** 1353  
> 📊 **Cobertura estimada:** 78.1% | **Telas descobertas:** 311 | **Botões testados:** 301  
> ⚡ **Latência média beira-leito:** 235.1ms

---

## 🎯 Sumário Executivo de Diagnóstico

- **Total de anomalias detectadas:** 141
- **Scripts de Reprodução gerados (1-Clique):** 20
- **🧮 Fórmulas Clínicas auditadas pelo Oráculo Matemático:** 138 (94.2% em conformidade determinística)
- **Críticos / Bugs:** 15
- **Oportunidades de UX / Ergonomia:** 85
- **Alertas de Performance / Latência:** 41

---

## 🚨 Anomalias e Pontos de Atenção Identificados

### `ISSUE-001` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `Traçado de ECG (Supra de ST Inferior)`
- **Descrição:** Resposta muito extensa (1997 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 20x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-002` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `➕ Incorporar ao SOAP`
- **Descrição:** Ação demorou 10419ms, ultrapassando a tolerância de 2500ms da persona Dra. Beatriz Toledo.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-003` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `📋 Fechar Plano`
- **Descrição:** Ação demorou 4475ms, ultrapassando a tolerância de 1800ms da persona Dr. Thiago Campos.
- **Ocorrências no teste:** 6x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-004` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🚨 CAD (Winter)`
- **Descrição:** Resposta muito extensa (2151 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-005` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `????`
- **Descrição:** Ação demorou 4771ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 5x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-006` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dva nora abc`
- **Descrição:** Divergência matemática detectada na calculadora DVA. Esperado pelo oráculo canônico: Guia de uso de DVA, bot gerou: Guia ou instrução (Erro absoluto: None, Tolerância: None). DVA sem peso exibiu orientações.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DVA em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_006_dva_nora_abc.cjs`](tests/repros/repro_issue_006_dva_nora_abc.cjs)
  ```bash
  node tests/repros/repro_issue_006_dva_nora_abc.cjs
  ```

### `ISSUE-007` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🩺 Exemplo HAS`
- **Descrição:** Resposta muito extensa (4594 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-008` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dva nora zero`
- **Descrição:** Divergência matemática detectada na calculadora DVA. Esperado pelo oráculo canônico: Guia de uso de DVA, bot gerou: Guia ou instrução (Erro absoluto: None, Tolerância: None). DVA sem peso exibiu orientações.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DVA em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_008_dva_nora_zero.cjs`](tests/repros/repro_issue_008_dva_nora_zero.cjs)
  ```bash
  node tests/repros/repro_issue_008_dva_nora_zero.cjs
  ```

### `ISSUE-009` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `💊 Extrair Receita`
- **Descrição:** Ação demorou 2730ms, ultrapassando a tolerância de 2500ms da persona Dra. Beatriz Toledo.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-010` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🫁 DPOC (Acidose Resp)`
- **Descrição:** Resposta muito extensa (2017 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-011` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `⚡ Sepse (Choque Lático)`
- **Descrição:** Resposta muito extensa (2363 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-012` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🤮 Vômitos (Alcalose Met)`
- **Descrição:** Resposta muito extensa (1919 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-013` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/mgso4 zuspan`
- **Descrição:** Resposta muito extensa (2925 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 13x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-014` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🤰 Caso DUM 10/02/2026`
- **Descrição:** Resposta muito extensa (1867 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-015` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/gaso 7.28 46 32`
- **Descrição:** Resposta muito extensa (1898 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-016` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🩸 Exemplo DM2`
- **Descrição:** Resposta muito extensa (4541 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-017` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `📋 Copiar para Prontuário`
- **Descrição:** Ação demorou 2435ms, ultrapassando a tolerância de 1800ms da persona Dr. Thiago Campos.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-018` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/rx itu nao complicada adulto 66kg`
- **Descrição:** Ação demorou 2633ms, ultrapassando a tolerância de 2500ms da persona Dra. Beatriz Toledo.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-019` · ⏱️ GARGALO DE LATÊNCIA (BAIXA) — `/comando_inexistente_823`
- **Descrição:** Ação demorou 1802ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-020` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/gaso 7.22 28 11`
- **Descrição:** Divergência matemática detectada na calculadora Gasometria Completa. Esperado pelo oráculo canônico: Acidose Metabólica (pCO2 esp: 24.5), bot gerou: Interpretado (Erro absoluto: None, Tolerância: None). Gasometria (pH 7.22, pCO2 28.0, HCO3 11.0): primário Acidose Metabólica.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de Gasometria Completa em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_020_gaso_7_22_28_11.cjs`](tests/repros/repro_issue_020_gaso_7_22_28_11.cjs)
  ```bash
  node tests/repros/repro_issue_020_gaso_7_22_28_11.cjs
  ```

### `ISSUE-021` · ⏱️ GARGALO DE LATÊNCIA (BAIXA) — `/comando_inexistente_675`
- **Descrição:** Ação demorou 1966ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-022` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_688`
- **Descrição:** Ação demorou 2733ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-023` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dva dobu 91`
- **Descrição:** Divergência matemática detectada na calculadora DVA Dobutamina. Esperado pelo oráculo canônico: 27.3, bot gerou: Não encontrado (Erro absoluto: 999.0, Tolerância: 0.3). Não foi possível extrair a vazão da infusão de dobutamina. Esperado: 27.3 mL/h.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DVA Dobutamina em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_023_dva_dobu_91.cjs`](tests/repros/repro_issue_023_dva_dobu_91.cjs)
  ```bash
  node tests/repros/repro_issue_023_dva_dobu_91.cjs
  ```

### `ISSUE-024` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dva dobu 49`
- **Descrição:** Divergência matemática detectada na calculadora DVA Dobutamina. Esperado pelo oráculo canônico: 14.7, bot gerou: Não encontrado (Erro absoluto: 999.0, Tolerância: 0.3). Não foi possível extrair a vazão da infusão de dobutamina. Esperado: 14.7 mL/h.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DVA Dobutamina em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_024_dva_dobu_49.cjs`](tests/repros/repro_issue_024_dva_dobu_49.cjs)
  ```bash
  node tests/repros/repro_issue_024_dva_dobu_49.cjs
  ```

### `ISSUE-025` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_828`
- **Descrição:** Ação demorou 2069ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-026` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `📋 Copiar Conduta`
- **Descrição:** Resposta muito extensa (2927 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-027` · ⏱️ GARGALO DE LATÊNCIA (BAIXA) — `/comando_inexistente_636`
- **Descrição:** Ação demorou 1622ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-028` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/choqueseptico 89 0.25`
- **Descrição:** Resposta muito extensa (2560 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-029` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `📋 Copiar para Prontuário`
- **Descrição:** Resposta muito extensa (2628 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-030` · ⏱️ GARGALO DE LATÊNCIA (BAIXA) — `/comando_inexistente_932`
- **Descrição:** Ação demorou 1874ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-031` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/ped azitromicina 14`
- **Descrição:** Resposta muito extensa (2183 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-032` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `💊 Prescrever (Azitromicina)`
- **Descrição:** Ação demorou 3482ms, ultrapassando a tolerância de 1200ms da persona Dr. Gabriel Mendes.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-033` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_303`
- **Descrição:** Ação demorou 2315ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-034` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/round Paciente 73a, Sepse foco urinario`
- **Descrição:** Resposta muito extensa (1820 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-035` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🫁 Exemplo IVAS`
- **Descrição:** Resposta muito extensa (2945 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-036` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `📋 Copiar SOAP para PEP`
- **Descrição:** Resposta muito extensa (2875 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-037` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `!@#$%`
- **Descrição:** Resposta muito extensa (2363 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-038` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_516`
- **Descrição:** Ação demorou 2319ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-039` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/ped dipirona 32`
- **Descrição:** Resposta muito extensa (4226 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-040` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_860`
- **Descrição:** Ação demorou 14480ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-041` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/rx sinusite aguda adulto 77kg`
- **Descrição:** Ação demorou 3416ms, ultrapassando a tolerância de 2500ms da persona Dra. Beatriz Toledo.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-042` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🔬 1º Tri Avidez Baixa (Aguda)`
- **Descrição:** Resposta muito extensa (1812 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-043` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `!@#$%`
- **Descrição:** Ação demorou 2874ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-044` · ⏱️ GARGALO DE LATÊNCIA (BAIXA) — `oi bot`
- **Descrição:** Ação demorou 1531ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-045` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/ped azitromicina 21`
- **Descrição:** Resposta muito extensa (2183 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-046` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🏢 Doses Adulto (HSL)`
- **Descrição:** Resposta muito extensa (1952 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-047` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `💊 Prescrever (Prednisolona)`
- **Descrição:** Ação demorou 5625ms, ultrapassando a tolerância de 1200ms da persona Dr. Gabriel Mendes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-048` · 🚨 BUG CRÍTICO (ALTA) — `✅ Resolver #1`
- **Descrição:** Falha ao processar ação '✅ Resolver #1'. O bot não respondeu ou gerou erro: Sem resposta
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Garantir bloco defensivo try/catch e resposta amigável para '✅ Resolver #1'.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_048_resolver__1.cjs`](tests/repros/repro_issue_048_resolver__1.cjs)
  ```bash
  node tests/repros/repro_issue_048_resolver__1.cjs
  ```

### `ISSUE-049` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dva nora 106`
- **Descrição:** Resposta muito extensa (1995 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-050` · 🚨 BUG CRÍTICO (ALTA) — `🧠 MedQuest Feito`
- **Descrição:** Falha ao processar ação '🧠 MedQuest Feito'. O bot não respondeu ou gerou erro: Sem resposta
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Garantir bloco defensivo try/catch e resposta amigável para '🧠 MedQuest Feito'.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_050_medquest_feito.cjs`](tests/repros/repro_issue_050_medquest_feito.cjs)
  ```bash
  node tests/repros/repro_issue_050_medquest_feito.cjs
  ```

### `ISSUE-051` · 🚨 BUG CRÍTICO (ALTA) — `🏋️ Treino Feito`
- **Descrição:** Falha ao processar ação '🏋️ Treino Feito'. O bot não respondeu ou gerou erro: Sem resposta
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Garantir bloco defensivo try/catch e resposta amigável para '🏋️ Treino Feito'.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_051_treino_feito.cjs`](tests/repros/repro_issue_051_treino_feito.cjs)
  ```bash
  node tests/repros/repro_issue_051_treino_feito.cjs
  ```

### `ISSUE-052` · 🚨 BUG CRÍTICO (ALTA) — `🔋 1`
- **Descrição:** Falha ao processar ação '🔋 1'. O bot não respondeu ou gerou erro: Sem resposta
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Garantir bloco defensivo try/catch e resposta amigável para '🔋 1'.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_052_1.cjs`](tests/repros/repro_issue_052_1.cjs)
  ```bash
  node tests/repros/repro_issue_052_1.cjs
  ```

### `ISSUE-053` · ⏱️ GARGALO DE LATÊNCIA (BAIXA) — `/comando_inexistente_951`
- **Descrição:** Ação demorou 1991ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-054` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dva nora 94`
- **Descrição:** Resposta muito extensa (1999 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-055` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/sri 112 neuro`
- **Descrição:** Resposta muito extensa (1957 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-056` · ⚠️ UX DEAD-END (MÉDIA) — `/interacao espironolactona + losartana`
- **Descrição:** Tela gerada por '/interacao espironolactona + losartana' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_056_interacao_espironolact.cjs`](tests/repros/repro_issue_056_interacao_espironolact.cjs)
  ```bash
  node tests/repros/repro_issue_056_interacao_espironolact.cjs
  ```

### `ISSUE-057` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/gaso 7.28 56 15`
- **Descrição:** Divergência matemática detectada na calculadora Gasometria Completa. Esperado pelo oráculo canônico: Acidose Mista (Metabólica + Respiratória) (pCO2 esp: 30.5), bot gerou: Interpretado (Erro absoluto: None, Tolerância: None). Gasometria (pH 7.28, pCO2 56.0, HCO3 15.0): primário Acidose Mista (Metabólica + Respiratória).
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de Gasometria Completa em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_057_gaso_7_28_56_15.cjs`](tests/repros/repro_issue_057_gaso_7_28_56_15.cjs)
  ```bash
  node tests/repros/repro_issue_057_gaso_7_28_56_15.cjs
  ```

### `ISSUE-058` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/ped amoxicilina 35`
- **Descrição:** Resposta muito extensa (2342 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-059` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `💊 Prescrever (Amoxicilina)`
- **Descrição:** Ação demorou 3270ms, ultrapassando a tolerância de 1200ms da persona Dr. Gabriel Mendes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-060` · 🚨 BUG CRÍTICO (ALTA) — `🔋 2`
- **Descrição:** Falha ao processar ação '🔋 2'. O bot não respondeu ou gerou erro: Sem resposta
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Garantir bloco defensivo try/catch e resposta amigável para '🔋 2'.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_060_2.cjs`](tests/repros/repro_issue_060_2.cjs)
  ```bash
  node tests/repros/repro_issue_060_2.cjs
  ```

### `ISSUE-061` · 🚨 BUG CRÍTICO (ALTA) — `🔋 3`
- **Descrição:** Falha ao processar ação '🔋 3'. O bot não respondeu ou gerou erro: Sem resposta
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Garantir bloco defensivo try/catch e resposta amigável para '🔋 3'.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_061_3.cjs`](tests/repros/repro_issue_061_3.cjs)
  ```bash
  node tests/repros/repro_issue_061_3.cjs
  ```

### `ISSUE-062` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `⚠️ Ver Interações`
- **Descrição:** Ação demorou 2026ms, ultrapassando a tolerância de 1800ms da persona Dr. Thiago Campos.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-063` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dva dobu 87`
- **Descrição:** Divergência matemática detectada na calculadora DVA Dobutamina. Esperado pelo oráculo canônico: 26.1, bot gerou: Não encontrado (Erro absoluto: 999.0, Tolerância: 0.3). Não foi possível extrair a vazão da infusão de dobutamina. Esperado: 26.1 mL/h.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DVA Dobutamina em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_063_dva_dobu_87.cjs`](tests/repros/repro_issue_063_dva_dobu_87.cjs)
  ```bash
  node tests/repros/repro_issue_063_dva_dobu_87.cjs
  ```

### `ISSUE-064` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/choqueseptico 65 0.25`
- **Descrição:** Resposta muito extensa (2558 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-065` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dva dobu 80`
- **Descrição:** Divergência matemática detectada na calculadora DVA Dobutamina. Esperado pelo oráculo canônico: 24.0, bot gerou: Não encontrado (Erro absoluto: 999.0, Tolerância: 0.3). Não foi possível extrair a vazão da infusão de dobutamina. Esperado: 24.0 mL/h.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DVA Dobutamina em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_065_dva_dobu_80.cjs`](tests/repros/repro_issue_065_dva_dobu_80.cjs)
  ```bash
  node tests/repros/repro_issue_065_dva_dobu_80.cjs
  ```

### `ISSUE-066` · ⏱️ GARGALO DE LATÊNCIA (BAIXA) — `SELECT * FROM users`
- **Descrição:** Ação demorou 1826ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 7x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-067` · ⚠️ UX DEAD-END (MÉDIA) — `/status`
- **Descrição:** Tela gerada por '/status' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_067_status.cjs`](tests/repros/repro_issue_067_status.cjs)
  ```bash
  node tests/repros/repro_issue_067_status.cjs
  ```

### `ISSUE-068` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_348`
- **Descrição:** Ação demorou 2265ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-069` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_618`
- **Descrição:** Ação demorou 2247ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-070` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/ped amoxicilina 21`
- **Descrição:** Resposta muito extensa (2342 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-071` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/ped dipirona 15`
- **Descrição:** Resposta muito extensa (4226 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-072` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/round Paciente 75a, DPOC exacerbado`
- **Descrição:** Ação demorou 10563ms, ultrapassando a tolerância de 3000ms da persona Dra. Camila Nogueira.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-073` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/sri 110 broncoespasmo`
- **Descrição:** Resposta muito extensa (1893 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-074` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/rx amigdalite bacteriana adulto 69kg`
- **Descrição:** Ação demorou 3486ms, ultrapassando a tolerância de 2500ms da persona Dra. Beatriz Toledo.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-075` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/round Paciente 72a, Cetoacidose diabetica`
- **Descrição:** Resposta muito extensa (2015 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-076` · ⚠️ UX DEAD-END (MÉDIA) — `/atb ceftriaxona 33`
- **Descrição:** Tela gerada por '/atb ceftriaxona 33' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_076_atb_ceftriaxona_33.cjs`](tests/repros/repro_issue_076_atb_ceftriaxona_33.cjs)
  ```bash
  node tests/repros/repro_issue_076_atb_ceftriaxona_33.cjs
  ```

### `ISSUE-077` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🩹 DIP Ambulatorial (Monif I)`
- **Descrição:** Resposta muito extensa (2580 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-078` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/round Paciente 60a, DPOC exacerbado`
- **Descrição:** Resposta muito extensa (1859 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-079` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/choqueseptico 87 0.25`
- **Descrição:** Resposta muito extensa (2560 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-080` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/ped azitromicina 29`
- **Descrição:** Resposta muito extensa (2183 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-081` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🔬 Dermato`
- **Descrição:** Resposta muito extensa (1850 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-082` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `🔬 Dermato`
- **Descrição:** Ação demorou 2565ms, ultrapassando a tolerância de 1800ms da persona Dr. Thiago Campos.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-083` · ⚠️ UX DEAD-END (MÉDIA) — `/atb piperacilina 32`
- **Descrição:** Tela gerada por '/atb piperacilina 32' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_083_atb_piperacilina_32.cjs`](tests/repros/repro_issue_083_atb_piperacilina_32.cjs)
  ```bash
  node tests/repros/repro_issue_083_atb_piperacilina_32.cjs
  ```

### `ISSUE-084` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `📖 Ver Comandos`
- **Descrição:** Resposta muito extensa (8572 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-085` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/sri 115 broncoespasmo`
- **Descrição:** Resposta muito extensa (1893 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-086` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dhe k 6.5 ecg`
- **Descrição:** Resposta muito extensa (2513 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-087` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/ped azitromicina 22`
- **Descrição:** Resposta muito extensa (2183 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-088` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dva nora 92`
- **Descrição:** Resposta muito extensa (1999 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-089` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/ped dipirona 29`
- **Descrição:** Resposta muito extensa (4226 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-090` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🌸 Gineco/Obst`
- **Descrição:** Resposta muito extensa (2244 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-091` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `🌸 Gineco/Obst`
- **Descrição:** Ação demorou 3087ms, ultrapassando a tolerância de 1800ms da persona Dr. Thiago Campos.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-092` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/round Paciente 69a, Cetoacidose diabetica`
- **Descrição:** Resposta muito extensa (1884 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-093` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/sri 104 choque`
- **Descrição:** Resposta muito extensa (1960 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-094` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/ped dipirona 14`
- **Descrição:** Resposta muito extensa (4226 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-095` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dose furosemida`
- **Descrição:** Resposta muito extensa (2507 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-096` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `💊 Prescrever (FUROSEMIDA)`
- **Descrição:** Ação demorou 2866ms, ultrapassando a tolerância de 1800ms da persona Dr. Thiago Campos.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-097` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/conduta_ped bronquiolite`
- **Descrição:** Resposta muito extensa (13521 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-098` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/rx amigdalite bacteriana adulto 82kg`
- **Descrição:** Ação demorou 4041ms, ultrapassando a tolerância de 2500ms da persona Dra. Beatriz Toledo.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-099` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/prenatal 28/08/2026`
- **Descrição:** Resposta muito extensa (3483 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-100` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/choqueseptico 80 0.25`
- **Descrição:** Resposta muito extensa (2558 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-101` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/sri 101 choque`
- **Descrição:** Resposta muito extensa (1960 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-102` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/ped dipirona 23`
- **Descrição:** Resposta muito extensa (4226 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-103` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dhe k 6.7 ecg`
- **Descrição:** Resposta muito extensa (2513 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-104` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/choqueseptico 66 0.25`
- **Descrição:** Resposta muito extensa (2560 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-105` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/gaso 7.48 57 27`
- **Descrição:** Resposta muito extensa (1850 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-106` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dhe k 6.9 ecg`
- **Descrição:** Resposta muito extensa (2513 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-107` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dhe k 6.6 ecg`
- **Descrição:** Resposta muito extensa (2513 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-108` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/prenatal 16/07/2026`
- **Descrição:** Resposta muito extensa (3485 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-109` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/round Paciente 80a, Sepse foco urinario`
- **Descrição:** Resposta muito extensa (1982 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-110` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/rx pneumonia comunitaria adulto 82kg`
- **Descrição:** Ação demorou 2970ms, ultrapassando a tolerância de 2500ms da persona Dra. Beatriz Toledo.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-111` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `70 kg`
- **Descrição:** Ação demorou 3593ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-112` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dhe k 6.8 ecg`
- **Descrição:** Resposta muito extensa (2513 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-113` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/prenatal 10/05/2026`
- **Descrição:** Resposta muito extensa (2513 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-114` · 🚨 BUG CRÍTICO (ALTA) — `/relatorio`
- **Descrição:** Falha ao processar ação '/relatorio'. O bot não respondeu ou gerou erro: Timeout ou fim prematuro de stream do Node.js
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Garantir bloco defensivo try/catch e resposta amigável para '/relatorio'.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_114_relatorio.cjs`](tests/repros/repro_issue_114_relatorio.cjs)
  ```bash
  node tests/repros/repro_issue_114_relatorio.cjs
  ```

### `ISSUE-115` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/relatorio`
- **Descrição:** Ação demorou 25001ms, ultrapassando a tolerância de 1800ms da persona Dr. Thiago Campos.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-116` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/conduta_ped asma`
- **Descrição:** Resposta muito extensa (22144 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 5x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-117` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/ped amoxicilina 19`
- **Descrição:** Resposta muito extensa (2342 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-118` · ⚠️ UX DEAD-END (MÉDIA) — `/atb vancomicina 31`
- **Descrição:** Tela gerada por '/atb vancomicina 31' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_118_atb_vancomicina_31.cjs`](tests/repros/repro_issue_118_atb_vancomicina_31.cjs)
  ```bash
  node tests/repros/repro_issue_118_atb_vancomicina_31.cjs
  ```

### `ISSUE-119` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dhe k 7.7 ecg`
- **Descrição:** Resposta muito extensa (2513 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-120` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/prenatal 13/07/2026`
- **Descrição:** Resposta muito extensa (3485 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-121` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/round Paciente 74a, DPOC exacerbado`
- **Descrição:** Resposta muito extensa (1845 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-122` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/rx sinusite aguda adulto 50kg`
- **Descrição:** Ação demorou 2977ms, ultrapassando a tolerância de 2500ms da persona Dra. Beatriz Toledo.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-123` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/gaso 7.48 58 28`
- **Descrição:** Resposta muito extensa (1850 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-124` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/rx sinusite aguda adulto 58kg`
- **Descrição:** Ação demorou 12854ms, ultrapassando a tolerância de 2500ms da persona Dra. Beatriz Toledo.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-125` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dose azitromicina`
- **Descrição:** Resposta muito extensa (1952 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-126` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `💊 Prescrever (AZITROMICINA)`
- **Descrição:** Ação demorou 3312ms, ultrapassando a tolerância de 1800ms da persona Dr. Thiago Campos.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-127` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dva nora 59`
- **Descrição:** Resposta muito extensa (1996 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-128` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/rx pneumonia comunitaria adulto 54kg`
- **Descrição:** Ação demorou 3155ms, ultrapassando a tolerância de 2500ms da persona Dra. Beatriz Toledo.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-129` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dose claritromicina`
- **Descrição:** Resposta muito extensa (2497 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-130` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/prenatal 11/04/2026`
- **Descrição:** Resposta muito extensa (2512 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-131` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/ajuda calculadoras`
- **Descrição:** Resposta muito extensa (8572 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-132` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/prenatal 21/05/2026`
- **Descrição:** Resposta muito extensa (2513 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-133` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/round Paciente 55a, ICC perfil B`
- **Descrição:** Resposta muito extensa (1925 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-134` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/prenatal 05/08/2026`
- **Descrição:** Resposta muito extensa (3483 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-135` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/round Paciente 68a, DPOC exacerbado`
- **Descrição:** Resposta muito extensa (2004 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-136` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/rx itu nao complicada adulto 52kg`
- **Descrição:** Ação demorou 3079ms, ultrapassando a tolerância de 2500ms da persona Dra. Beatriz Toledo.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-137` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/round Paciente 63a, DPOC exacerbado`
- **Descrição:** Resposta muito extensa (1824 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-138` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/choqueseptico 53 0.4`
- **Descrição:** Resposta muito extensa (2556 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-139` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/ped amoxicilina 25`
- **Descrição:** Resposta muito extensa (2342 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-140` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `💊 Prescrever (AMOXICILINA)`
- **Descrição:** Ação demorou 3174ms, ultrapassando a tolerância de 2500ms da persona Dra. Beatriz Toledo.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-141` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/prenatal 03/05/2026`
- **Descrição:** Resposta muito extensa (2513 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

---

## 🧮 Auditoria Matemática de Fórmulas Clínicas (Anti-Alucinação Determinístico)

> 🛡️ **Gabarito Canônico Determinístico**: Todo cálculo clínico executado durante os testes é auditado em tempo real por um oráculo analítico em Python puro com dupla precisão (Harrison, KDIGO, SBC, SBP, NEJM), sem uso de LLM, prevenindo alucinações e garantindo tolerância estrita (ε < 0.5).

**Resumo da Avaliação Numérica:** 130/138 cálculos aprovados (94.2% de conformidade).

| Ciclo | Calculadora | Comando Testado | Esperado (Oráculo) | Obtido (Bot) | Erro Abs | Conformidade |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C14 | DVA | `/dva nora 10.5.5` | Alerta de peso inválido | Alerta emitido | - | ✅ **Aprovado** |
| C19 | SRI | `/sri 999999` | Etomidato 149999.9 mL (299999.7 mg) | Validado | - | ✅ **Aprovado** |
| C24 | Gasometria Completa | `/gaso pH 7` | Guia de Gasometria | Guia exibido | - | ✅ **Aprovado** |
| C39 | DVA | `/dva nora abc` | Guia de uso de DVA | Guia ou instrução | - | 🚨 **Divergência** |
| C49 | Cockcroft-Gault | `/crcl cem anos 80kg cr 2` | Bloqueio defensivo por parâmetros insuficientes | Bloqueio acionado | - | ✅ **Aprovado** |
| C59 | DVA | `/dva nora zero` | Guia de uso de DVA | Guia ou instrução | - | 🚨 **Divergência** |
| C64 | Cockcroft-Gault | `/crcl idade peso` | Bloqueio defensivo por parâmetros insuficientes | Bloqueio acionado | - | ✅ **Aprovado** |
| C79 | DHE | `/dhe na abc peso -5` | Bloqueio defensivo para parâmetros não positivos | Alerta emitido | - | ✅ **Aprovado** |
| C94 | SRI | `/sri 0` | Bloqueio defensivo para peso não positivo | Alerta emitido | - | ✅ **Aprovado** |
| C99 | Gasometria Completa | `/gaso invalido` | Guia de Gasometria | Guia exibido | - | ✅ **Aprovado** |
| C117 | Cockcroft-Gault | `/clcr 49 67 3.3` | 25.7 | 25.7 | 0.00 | ✅ **Aprovado** |
| C121 | Gasometria Completa | `/gaso 7.28 46 32` | Acidose Respiratória (pCO2 esp: None) | Interpretado | - | ✅ **Aprovado** |
| C134 | SRI | `/sri -1` | Bloqueio defensivo para peso não positivo | Alerta emitido | - | ✅ **Aprovado** |
| C162 | Cockcroft-Gault | `/crcl 37 50 1.0 fem` | 60.8 | 60.8 | 0.00 | ✅ **Aprovado** |
| C171 | Gasometria Completa | `/gaso 7.22 28 11` | Acidose Metabólica (pCO2 esp: 24.5) | Interpretado | - | 🚨 **Divergência** |
| C196 | DVA Dobutamina | `/dva dobu 91` | 27.3 | Não encontrado | 999.00 | 🚨 **Divergência** |
| C201 | DVA Vasopressina | `/dva vaso 65` | 9.0 | 9.0 | 0.00 | ✅ **Aprovado** |
| C207 | Cockcroft-Gault | `/clcr 64 50 1.7` | 31.0 | 31.0 | 0.00 | ✅ **Aprovado** |
| C216 | DVA Dobutamina | `/dva dobu 49` | 14.7 | Não encontrado | 999.00 | 🚨 **Divergência** |
| C232 | Cockcroft-Gault | `/clcr 58 57 3.5` | 18.5 | 18.5 | 0.00 | ✅ **Aprovado** |
| C249 | DHE | `/dhe na -10 peso 0` | Bloqueio defensivo para parâmetros não positivos | Alerta emitido | - | ✅ **Aprovado** |
| C257 | Cockcroft-Gault | `/clcr 85 63 3.1` | 15.5 | 15.5 | 0.00 | ✅ **Aprovado** |
| C282 | Cockcroft-Gault | `/crcl 25 75 3.7 masc` | 32.4 | 32.4 | 0.00 | ✅ **Aprovado** |
| C04 | DHE | `/dhe na -10 peso -5` | Bloqueio defensivo para parâmetros não positivos | Alerta emitido | - | ✅ **Aprovado** |
| C11 | Gasometria Completa | `/gaso 7.28 41 29` | Normal (pCO2 esp: None) | Interpretado | - | ✅ **Aprovado** |
| C01 | SRI | `/sri 80 broncoespasmo` | Etomidato 12.0 mL (24.0 mg) | Validado | - | ✅ **Aprovado** |
| C06 | Gasometria Completa | `/gaso 7.22 58 25` | Acidose Respiratória (pCO2 esp: None) | Interpretado | - | ✅ **Aprovado** |
| C34 | DVA Noradrenalina | `/dva nora -50` | Bloqueio defensivo para peso fora dos limites fisiológicos | Alerta emitido | - | ✅ **Aprovado** |
| C44 | SRI | `/sri perfil_inexistente` | Guia de uso de SRI | Guia exibido | - | ✅ **Aprovado** |
| C51 | Winter | `/winter 16` | 32.0 | 32.0 | 0.00 | ✅ **Aprovado** |

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
| `13f6d71de75f` | ⚡ *Ultra Rotina · Central de Comandos Beira-L | 8 opções | 182 |
| `4ffe3f69e658` | 🚨 *EMERGÊNCIA & SALA VERMELHA* | 13 opções | 51 |
| `094fafe57c25` | 🛏️ *LEITO 4 · ATUALIZADO VIA VOZ* | 8 opções | 31 |
| `2429ea4cafdc` | ⚠️ *Rascunho para conferência médica* | 7 opções | 16 |
| `965ccf6bc819` | ❌ Falta informação! Preciso de *Idade*, *Peso | 4 opções | 24 |
| `db822b0f81e4` | 📐 *CALCULADORA CLÍNICA: MERO* | 2 opções | 11 |
| `5fb929e91436` | 📐 *CALCULADORAS CLÍNICAS & ESCORES DETERMINÍS | 10 opções | 7 |
| `94ea337404eb` | 🩸 *CALCULADORA DE GASOMETRIA ARTERIAL COMPLET | 6 opções | 1 |
| `7601f73b6129` | 🩸 *GASOMETRIA ARTERIAL: CETOACIDOSE DIABÉTICA | 3 opções | 1 |
| `ef9f51563e86` | *SOAP (Caso Clínico) · Novo Caso* | 6 opções | 6 |
| `864e8f8e6a1d` | 📋 *PRONTUÁRIO CLÍNICO AMBULATORIAL (SOAP ÁGIL | 4 opções | 4 |
| `3ae965b9beac` | 🩺 *AMBULATÓRIO & ATENÇÃO PRIMÁRIA (UBS)* | 9 opções | 21 |
| `f045c065dd4c` | 🩺 *CONDUTA CITOPATOLÓGICA DE COLO DE ÚTERO (D | 6 opções | 4 |
| `d4c726c0703f` | 🩺 *CONDUTA CITOPATOLÓGICA DE COLO (INCA):* | 3 opções | 2 |
| `4a44ca6cef73` | 📋 *PRONTO PARA O PRONTUÁRIO (1-TOQUE PARA COP | 2 opções | 66 |
| `a6dae6fbfaaf` | 🚨 *PARADA CARDIORRESPIRATÓRIA (PCR ADULTO — A | 9 opções | 26 |
| `aa377d9966f8` | ⚡ *PCR: RITMO CHOCÁVEL (FV / TV SEM PULSO) —  | 11 opções | 2 |
| `146431a57fb4` | ⚠️ *Rascunho para conferência médica* | 2 opções | 47 |
| `118b7339ea73` | ❌ Falha ao salvar no Notion. Tente novamente. | 0 opções | 10 |
| `9f948e5294e4` | ✅ 🛏️ Status do Leito 4 alterado para ⚪ Estáve | 9 opções | 2 |
| `48aa6ff0c947` | ✅ 🛏️ Status do Leito 4 alterado para 🟡 Em Vig | 9 opções | 3 |
| `ffe7754f0461` | ✅ 🛏️ Status do Leito 4 alterado para 🚨 Instáv | 9 opções | 3 |
| `31c34754534b` | 📝 *EVOLUÇÃO DO LEITO 4* | 3 opções | 1 |
| `0eadaee890b8` | 🛏️ *Leito 4* · ⚪ Estável | 9 opções | 2 |
| `153d120cf866` | ⚠️ *Peso obrigatório e inválido para SRI/IOT: | 0 opções | 11 |
| `7eeb32544189` | 📋 *CONDUTA PEDIÁTRICA OFICIAL (PEDBOOK)* | 3 opções | 11 |
| `3effb4da1c4e` | 💊 *CONSULTAS RÁPIDAS DE BOLSO* | 8 opções | 11 |
| `923fde375773` | 🦠 *ANTIBIÓTICOS POR FOCO & AJUSTE ANTIMICROBI | 9 opções | 2 |
| `8981a2d53ee1` | 🫁 *ANTIBIÓTICOTERAPIA: PNEUMONIA ADQUIRIDA NA | 3 opções | 1 |
| `bc65425c5bf0` | ⚡ *MODO OFFLINE DE CONTINGÊNCIA (LAUDO DE IMA | 3 opções | 117 |

---
> 🌐 **Dashboard Visual Interativo:** Abra [`data/dashboard_grafo.html`](../data/dashboard_grafo.html) no navegador para explorar o grafo de navegação em tempo real.

*(Relatório gerado automaticamente pelo Ultra Rotina Testador Master)*
