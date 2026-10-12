# 📋 Relatório de Auditoria & Sugestões: Testador Master (Telegram)

> ⏱️ **Sessão executada em:** 12/10/2026 às 00:22:56  
> ⏳ **Duração total:** 4m 44s | **Ciclos concluídos:** 94  
> 📊 **Cobertura estimada:** 29.5% | **Telas descobertas:** 74 | **Botões testados:** 51  
> ⚡ **Latência média beira-leito:** 2244.0ms

---

## 🎯 Sumário Executivo de Diagnóstico

- **Total de anomalias detectadas:** 43
- **Scripts de Reprodução gerados (1-Clique):** 19
- **🧮 Fórmulas Clínicas auditadas pelo Oráculo Matemático:** 11 (81.8% em conformidade determinística)
- **Críticos / Bugs:** 6
- **Oportunidades de UX / Ergonomia:** 26
- **Alertas de Performance / Latência:** 9

---

## 🚨 Anomalias e Pontos de Atenção Identificados

### `ISSUE-001` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `Abrir leito 4`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-002` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🚨 CAD (Winter)`
- **Descrição:** Resposta muito extensa (2151 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-003` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `Fita de Gasometria Arterial (pH 7.21 / AG 27)`
- **Descrição:** Resposta muito extensa (2159 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 4x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-004` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `Fita de Gasometria Arterial (pH 7.21 / AG 27)`
- **Descrição:** Ação demorou 5459ms, ultrapassando a tolerância de 2500ms da persona Dra. Beatriz Toledo.
- **Ocorrências no teste:** 4x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-005` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `➕ Incorporar ao SOAP`
- **Descrição:** Ação demorou 12860ms, ultrapassando a tolerância de 1800ms da persona Dr. Thiago Campos.
- **Ocorrências no teste:** 8x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-006` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `📋 Fechar Plano`
- **Descrição:** Ação demorou 3826ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-007` · ⚠️ UX DEAD-END (MÉDIA) — `📋 Copiar SOAP para PEP`
- **Descrição:** Tela gerada por '📋 Copiar SOAP para PEP' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 6x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_007_copiar_soap_para_pep.cjs`](tests/repros/repro_issue_007_copiar_soap_para_pep.cjs)
  ```bash
  node tests/repros/repro_issue_007_copiar_soap_para_pep.cjs
  ```

### `ISSUE-008` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `📋 Copiar SOAP para PEP`
- **Descrição:** Resposta muito extensa (2227 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 4x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-009` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `Traçado de ECG (Supra de ST Inferior)`
- **Descrição:** Resposta muito extensa (2514 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 4x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-010` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `Traçado de ECG (Supra de ST Inferior)`
- **Descrição:** Ação demorou 3461ms, ultrapassando a tolerância de 1200ms da persona Dr. Gabriel Mendes.
- **Ocorrências no teste:** 4x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-011` · ⚠️ UX DEAD-END (MÉDIA) — `📋 Copiar para Prontuário`
- **Descrição:** Tela gerada por '📋 Copiar para Prontuário' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_011_copiar_para_prontu_rio.cjs`](tests/repros/repro_issue_011_copiar_para_prontu_rio.cjs)
  ```bash
  node tests/repros/repro_issue_011_copiar_para_prontu_rio.cjs
  ```

### `ISSUE-012` · ⚠️ UX DEAD-END (MÉDIA) — `/sri perfil_inexistente`
- **Descrição:** Tela gerada por '/sri perfil_inexistente' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_012_sri_perfil_inexistente.cjs`](tests/repros/repro_issue_012_sri_perfil_inexistente.cjs)
  ```bash
  node tests/repros/repro_issue_012_sri_perfil_inexistente.cjs
  ```

### `ISSUE-013` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/prenatal 07/04/2026`
- **Descrição:** Resposta muito extensa (2512 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-014` · 🚨 SEGURANÇA CLÍNICA (ALTA) — `/prenatal 07/04/2026`
- **Descrição:** Calculadora médica retornou dose ou vazão positiva para entrada com valor nulo ou negativo sem exibir alerta de bloqueio.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Adicionar guard clause estrita: exigir peso/dose estritamente positivos antes de calcular BIC ou dosagens.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_014_prenatal_07_04_2026.cjs`](tests/repros/repro_issue_014_prenatal_07_04_2026.cjs)
  ```bash
  node tests/repros/repro_issue_014_prenatal_07_04_2026.cjs
  ```

### `ISSUE-015` · ⚠️ UX DEAD-END (MÉDIA) — `📋 Copiar Conduta para Prontuário`
- **Descrição:** Tela gerada por '📋 Copiar Conduta para Prontuário' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 4x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_015_copiar_conduta_para_pr.cjs`](tests/repros/repro_issue_015_copiar_conduta_para_pr.cjs)
  ```bash
  node tests/repros/repro_issue_015_copiar_conduta_para_pr.cjs
  ```

### `ISSUE-016` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `📋 Copiar Conduta para Prontuário`
- **Descrição:** Resposta muito extensa (2503 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-017` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe k 7.2 ecg`
- **Descrição:** Tela gerada por '/dhe k 7.2 ecg' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_017_dhe_k_7_2_ecg.cjs`](tests/repros/repro_issue_017_dhe_k_7_2_ecg.cjs)
  ```bash
  node tests/repros/repro_issue_017_dhe_k_7_2_ecg.cjs
  ```

### `ISSUE-018` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dhe k 7.2 ecg`
- **Descrição:** Resposta muito extensa (2513 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-019` · 🚨 BUG CRÍTICO (ALTA) — `🎧 Ouvir no Fone`
- **Descrição:** Falha ao processar ação '🎧 Ouvir no Fone'. O bot não respondeu ou gerou erro: Sem resposta
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Garantir bloco defensivo try/catch e resposta amigável para '🎧 Ouvir no Fone'.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_019_ouvir_no_fone.cjs`](tests/repros/repro_issue_019_ouvir_no_fone.cjs)
  ```bash
  node tests/repros/repro_issue_019_ouvir_no_fone.cjs
  ```

### `ISSUE-020` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `Laudo de Hemograma (Leucocitose + PCR 194)`
- **Descrição:** Resposta muito extensa (2026 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-021` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `Laudo de Hemograma (Leucocitose + PCR 194)`
- **Descrição:** Ação demorou 2743ms, ultrapassando a tolerância de 2500ms da persona Dra. Beatriz Toledo.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-022` · ⚠️ UX DEAD-END (MÉDIA) — `/dva nora 10.5.5`
- **Descrição:** Tela gerada por '/dva nora 10.5.5' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_022_dva_nora_10_5_5.cjs`](tests/repros/repro_issue_022_dva_nora_10_5_5.cjs)
  ```bash
  node tests/repros/repro_issue_022_dva_nora_10_5_5.cjs
  ```

### `ISSUE-023` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dva nora 10.5.5`
- **Descrição:** Divergência matemática detectada na calculadora DVA Noradrenalina. Esperado pelo oráculo canônico: 1.0, bot gerou: Não encontrado (Erro absoluto: 999.0, Tolerância: 0.3). Não foi possível extrair a vazão da infusão de noradrenalina. Esperado: 1.0 mL/h.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DVA Noradrenalina em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_023_dva_nora_10_5_5.cjs`](tests/repros/repro_issue_023_dva_nora_10_5_5.cjs)
  ```bash
  node tests/repros/repro_issue_023_dva_nora_10_5_5.cjs
  ```

### `ISSUE-024` · 🚨 BUG CRÍTICO (ALTA) — `   `
- **Descrição:** Falha ao processar ação '   '. O bot não respondeu ou gerou erro: Sem resposta
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Garantir bloco defensivo try/catch e resposta amigável para '   '.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_024_bug.cjs`](tests/repros/repro_issue_024_bug.cjs)
  ```bash
  node tests/repros/repro_issue_024_bug.cjs
  ```

### `ISSUE-025` · ⚠️ UX DEAD-END (MÉDIA) — `/sri 0`
- **Descrição:** Tela gerada por '/sri 0' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_025_sri_0.cjs`](tests/repros/repro_issue_025_sri_0.cjs)
  ```bash
  node tests/repros/repro_issue_025_sri_0.cjs
  ```

### `ISSUE-026` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `/pals 21`
- **Descrição:** Mensagem contém termo técnico suspeito ('undefined') exibido ao usuário.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_026_pals_21.cjs`](tests/repros/repro_issue_026_pals_21.cjs)
  ```bash
  node tests/repros/repro_issue_026_pals_21.cjs
  ```

### `ISSUE-027` · ⚠️ UX DEAD-END (MÉDIA) — `/pals 21`
- **Descrição:** Tela gerada por '/pals 21' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_027_pals_21.cjs`](tests/repros/repro_issue_027_pals_21.cjs)
  ```bash
  node tests/repros/repro_issue_027_pals_21.cjs
  ```

### `ISSUE-028` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `Passagem Sala Vermelha (IAM c/ Supra)`
- **Descrição:** Ação demorou 3925ms, ultrapassando a tolerância de 1200ms da persona Dr. Gabriel Mendes.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-029` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `SELECT * FROM users`
- **Descrição:** Resposta muito extensa (1842 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-030` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `SELECT * FROM users`
- **Descrição:** Ação demorou 2289ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-031` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `🎧 Ouvir no Fone`
- **Descrição:** Ação demorou 20781ms, ultrapassando a tolerância de 2500ms da persona Dra. Beatriz Toledo.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-032` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/mgso4 zuspan`
- **Descrição:** Resposta muito extensa (2925 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-033` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `/leito 10 62a Pneumonia aspirativa`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-034` · ⚠️ UX DEAD-END (MÉDIA) — `📋 Copiar Conduta/Passagem para Prontuário`
- **Descrição:** Tela gerada por '📋 Copiar Conduta/Passagem para Prontuário' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_034_copiar_conduta_passage.cjs`](tests/repros/repro_issue_034_copiar_conduta_passage.cjs)
  ```bash
  node tests/repros/repro_issue_034_copiar_conduta_passage.cjs
  ```

### `ISSUE-035` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `????`
- **Descrição:** Ação demorou 3110ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-036` · ⚠️ UX DEAD-END (MÉDIA) — `/sri 999999`
- **Descrição:** Tela gerada por '/sri 999999' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_036_sri_999999.cjs`](tests/repros/repro_issue_036_sri_999999.cjs)
  ```bash
  node tests/repros/repro_issue_036_sri_999999.cjs
  ```

### `ISSUE-037` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/prenatal 16/04/2026`
- **Descrição:** Resposta muito extensa (2513 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-038` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `Passagem Sala Vermelha (IAM c/ Supra)`
- **Descrição:** Resposta muito extensa (2259 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-039` · ⚠️ UX DEAD-END (MÉDIA) — `/dva nora 99999`
- **Descrição:** Tela gerada por '/dva nora 99999' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_039_dva_nora_99999.cjs`](tests/repros/repro_issue_039_dva_nora_99999.cjs)
  ```bash
  node tests/repros/repro_issue_039_dva_nora_99999.cjs
  ```

### `ISSUE-040` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dva nora 99999`
- **Descrição:** Divergência matemática detectada na calculadora DVA Noradrenalina. Esperado pelo oráculo canônico: 9374.9, bot gerou: Não encontrado (Erro absoluto: 999.0, Tolerância: 0.3). Não foi possível extrair a vazão da infusão de noradrenalina. Esperado: 9374.9 mL/h.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DVA Noradrenalina em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_040_dva_nora_99999.cjs`](tests/repros/repro_issue_040_dva_nora_99999.cjs)
  ```bash
  node tests/repros/repro_issue_040_dva_nora_99999.cjs
  ```

### `ISSUE-041` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🫁 DPOC (Acidose Resp)`
- **Descrição:** Resposta muito extensa (2017 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-042` · ⚠️ UX DEAD-END (MÉDIA) — `📋 Copiar Laudo PEP`
- **Descrição:** Tela gerada por '📋 Copiar Laudo PEP' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_042_copiar_laudo_pep.cjs`](tests/repros/repro_issue_042_copiar_laudo_pep.cjs)
  ```bash
  node tests/repros/repro_issue_042_copiar_laudo_pep.cjs
  ```

### `ISSUE-043` · ⚠️ UX DEAD-END (MÉDIA) — `/atb piperacilina 53`
- **Descrição:** Tela gerada por '/atb piperacilina 53' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_043_atb_piperacilina_53.cjs`](tests/repros/repro_issue_043_atb_piperacilina_53.cjs)
  ```bash
  node tests/repros/repro_issue_043_atb_piperacilina_53.cjs
  ```

---

## 🧮 Auditoria Matemática de Fórmulas Clínicas (Anti-Alucinação Determinístico)

> 🛡️ **Gabarito Canônico Determinístico**: Todo cálculo clínico executado durante os testes é auditado em tempo real por um oráculo analítico em Python puro com dupla precisão (Harrison, KDIGO, SBC, SBP, NEJM), sem uso de LLM, prevenindo alucinações e garantindo tolerância estrita (ε < 0.5).

**Resumo da Avaliação Numérica:** 9/11 cálculos aprovados (81.8% de conformidade).

| Ciclo | Calculadora | Comando Testado | Esperado (Oráculo) | Obtido (Bot) | Erro Abs | Conformidade |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C04 | Gasometria Completa | `/gaso pH 7` | Guia de Gasometria | Guia exibido | - | ✅ **Aprovado** |
| C19 | SRI | `/sri perfil_inexistente` | Guia de uso de SRI | Guia exibido | - | ✅ **Aprovado** |
| C22 | DHE Hipercalemia | `/dhe k 7.2 ecg` | Estratificação de Hipercalemia para K+ 7.2 | Estratificação exibida | - | ✅ **Aprovado** |
| C29 | DVA Noradrenalina | `/dva nora 10.5.5` | 1.0 | Não encontrado | 999.00 | 🚨 **Divergência** |
| C36 | SRI | `/sri 84 choque` | Etomidato 12.6 mL (25.2 mg) | Validado | - | ✅ **Aprovado** |
| C44 | SRI | `/sri 0` | Etomidato 0.0 mL (0.0 mg) | Validado | - | ✅ **Aprovado** |
| C54 | SRI | `/sri 0` | Etomidato 0.0 mL (0.0 mg) | Validado | - | ✅ **Aprovado** |
| C64 | SRI | `/sri 999999` | Etomidato 149999.9 mL (299999.7 mg) | Validado | - | ✅ **Aprovado** |
| C74 | DVA Noradrenalina | `/dva nora 99999` | 9374.9 | Não encontrado | 999.00 | 🚨 **Divergência** |
| C77 | Cockcroft-Gault | `/clcr 26 90 1.0` | 142.5 | 142.5 | 0.00 | ✅ **Aprovado** |
| C79 | Gasometria Completa | `/gaso - - -` | Guia de Gasometria | Guia exibido | - | ✅ **Aprovado** |

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
| `7b60590955cc` | ⚡ *Ultra Rotina · Central de Comandos Beira-L | 8 opções | 4 |
| `4d571300fa4d` | 🚨 *EMERGÊNCIA & SALA VERMELHA* | 13 opções | 2 |
| `69c49ca1df68` | *LAUDO CLÍNICO MULTIMODAL · EXAME LABORATORIA | 3 opções | 1 |
| `b5583171086f` | 🩺 *Novo caso SOAP iniciado a partir da imagem | 0 opções | 2 |
| `8c92b1e7b9df` | ⚠️ *Rascunho para conferência médica* | 7 opções | 1 |
| `d42d5ee774ef` | ⚠️ *Peso obrigatório e inválido para SRI/IOT: | 0 opções | 5 |
| `9cfeb022fc80` | 📋 *CONDUTA PEDIÁTRICA OFICIAL (PEDBOOK)* | 0 opções | 1 |
| `56801a50d93a` | 🔵 <b>CÁLCULO DE INFUSÃO · CONFERIR PREPARO</b | 5 opções | 1 |
| `f046dd8bbce4` | 🎙️ *TRANSCRIÇÃO E SÍNTESE CLÍNICA (ÁUDIO)* | 2 opções | 1 |
| `f967b995c7fe` | Resultado expirado. Gere novamente com os dad | 0 opções | 1 |
| `072558cc4150` | 🛏️ *ENFERMARIA & PRESCRIÇÃO* | 9 opções | 1 |
| `f7c9bda9248f` | 🏥 *Enfermaria · (2 leitos: 🟢 1 - 🟡 1 - 🔴 0)* | 7 opções | 1 |
| `d593b463a222` | 🛏️ *Leito 4* · ⚪ Não confirmado | 9 opções | 1 |
| `03c4534a9134` | ⚠️ *Gasometria Incompleta:* | 8 opções | 2 |
| `fbd2eb83646a` | 🧪 <b>GASOMETRIA ARTERIAL — ANÁLISE DE 5 PASSO | 5 opções | 1 |
| `770d835de645` | *Gasometria Arterial* | 3 opções | 1 |
| `56a0ef7efb3f` | 🚨 *EMERGÊNCIA - ACHADO CRÍTICO:* Acidose meta | 3 opções | 1 |
| `014b3fd49854` | 🩺 *Laudo incorporado ao caso clínico ativo.*  | 0 opções | 8 |
| `304f6a3f6294` | ⚠️ *Rascunho para conferência médica* | 7 opções | 1 |
| `d50c89f0416d` | 📋 *Consolidando anamnese, exame físico e gera | 0 opções | 2 |
| `afc826ad7753` | ⚠️ *Rascunho para conferência médica* | 10 opções | 1 |
| `13ae673a37fe` | 📋 *PRONTO PARA O PRONTUÁRIO (1-TOQUE PARA COP | 0 opções | 14 |
| `33e9a2688ef1` | 🚨 *EMERGÊNCIA - ACHADO CRÍTICO:* INFARTO AGUD | 3 opções | 1 |
| `531b0b970653` | 🚨 *EMERGÊNCIA - ACHADO CRÍTICO:* Acidose meta | 3 opções | 1 |
| `f05dd9321439` | ⚠️ *Rascunho para conferência médica* | 7 opções | 1 |
| `5ee6a1fb2877` | 🧹 *Memória limpa.* Pronto para o próximo paci | 6 opções | 1 |
| `b2fba47aab22` | 🚨 *PARADA CARDIORRESPIRATÓRIA (PCR ADULTO — A | 9 opções | 1 |
| `22977ee3f639` | 🤰 *AVALIAÇÃO DE PRÉ-NATAL E CRONOLOGIA OBSTÉT | 3 opções | 1 |
| `0daf90b9cc5b` | ⚡ *MANEJO EMERGENCIAL DE HIPERCALEMIA (SBC /  | 0 opções | 1 |
| `b8da87038db1` | 📆 *AGENDA DE HOJE (Segunda-feira, 12/10/2026) | 3 opções | 3 |

---
> 🌐 **Dashboard Visual Interativo:** Abra [`data/dashboard_grafo.html`](../data/dashboard_grafo.html) no navegador para explorar o grafo de navegação em tempo real.

*(Relatório gerado automaticamente pelo Ultra Rotina Testador Master)*
