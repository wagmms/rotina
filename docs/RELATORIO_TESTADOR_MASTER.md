# 📋 Relatório de Auditoria & Sugestões: Testador Master (Telegram)

> ⏱️ **Sessão executada em:** 12/10/2026 às 12:13:50  
> ⏳ **Duração total:** 29m 11s | **Ciclos concluídos:** 595  
> 📊 **Cobertura estimada:** 72.9% | **Telas descobertas:** 299 | **Botões testados:** 222  
> ⚡ **Latência média beira-leito:** 2076.2ms

---

## 🎯 Sumário Executivo de Diagnóstico

- **Total de anomalias detectadas:** 343
- **Scripts de Reprodução gerados (1-Clique):** 172
- **🧮 Fórmulas Clínicas auditadas pelo Oráculo Matemático:** 113 (79.6% em conformidade determinística)
- **Críticos / Bugs:** 57
- **Oportunidades de UX / Ergonomia:** 194
- **Alertas de Performance / Latência:** 57

---

## 🚨 Anomalias e Pontos de Atenção Identificados

### `ISSUE-001` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `Abrir leito 3`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-002` · ⚠️ UX DEAD-END (MÉDIA) — `/dva nora 10.5.5`
- **Descrição:** Tela gerada por '/dva nora 10.5.5' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 9x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_002_dva_nora_10_5_5.cjs`](tests/repros/repro_issue_002_dva_nora_10_5_5.cjs)
  ```bash
  None
  ```

### `ISSUE-003` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dva nora 10.5.5`
- **Descrição:** Divergência matemática detectada na calculadora DVA Noradrenalina. Esperado pelo oráculo canônico: 1.0, bot gerou: Não encontrado (Erro absoluto: 999.0, Tolerância: 0.3). Não foi possível extrair a vazão da infusão de noradrenalina. Esperado: 1.0 mL/h.
- **Ocorrências no teste:** 9x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DVA Noradrenalina em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_003_dva_nora_10_5_5.cjs`](tests/repros/repro_issue_003_dva_nora_10_5_5.cjs)
  ```bash
  None
  ```

### `ISSUE-004` · ⚠️ UX DEAD-END (MÉDIA) — `📋 Copiar Conduta para Prontuário`
- **Descrição:** Tela gerada por '📋 Copiar Conduta para Prontuário' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 18x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_004_copiar_conduta_para_pr.cjs`](tests/repros/repro_issue_004_copiar_conduta_para_pr.cjs)
  ```bash
  None
  ```

### `ISSUE-005` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dose azitromicina`
- **Descrição:** Resposta muito extensa (1952 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-006` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `💊 Prescrever no /rx (AZITROMICINA)`
- **Descrição:** Ação demorou 17775ms, ultrapassando a tolerância de 1800ms da persona Dr. Thiago Campos.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-007` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🩺 Exemplo HAS`
- **Descrição:** Resposta muito extensa (4594 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-008` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `Fita de Gasometria Arterial (pH 7.21 / AG 27)`
- **Descrição:** Resposta muito extensa (2765 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 34x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-009` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `Fita de Gasometria Arterial (pH 7.21 / AG 27)`
- **Descrição:** Ação demorou 3985ms, ultrapassando a tolerância de 3000ms da persona Dra. Camila Nogueira.
- **Ocorrências no teste:** 34x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-010` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `Traçado de ECG (Supra de ST Inferior)`
- **Descrição:** Resposta muito extensa (2458 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 11x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-011` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `Traçado de ECG (Supra de ST Inferior)`
- **Descrição:** Ação demorou 4450ms, ultrapassando a tolerância de 1200ms da persona Dr. Gabriel Mendes.
- **Ocorrências no teste:** 12x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-012` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `Laudo de Hemograma (Leucocitose + PCR 194)`
- **Descrição:** Resposta muito extensa (2083 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 18x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-013` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `Laudo de Hemograma (Leucocitose + PCR 194)`
- **Descrição:** Ação demorou 3298ms, ultrapassando a tolerância de 2500ms da persona Dra. Beatriz Toledo.
- **Ocorrências no teste:** 20x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-014` · ⏱️ GARGALO DE LATÊNCIA (BAIXA) — `➕ Incorporar ao SOAP`
- **Descrição:** Ação demorou 1993ms, ultrapassando a tolerância de 1800ms da persona Dr. Thiago Campos.
- **Ocorrências no teste:** 33x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-015` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na abc peso -5`
- **Descrição:** Tela gerada por '/dhe na abc peso -5' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 4x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_015_dhe_na_abc_peso__5.cjs`](tests/repros/repro_issue_015_dhe_na_abc_peso__5.cjs)
  ```bash
  None
  ```

### `ISSUE-016` · 🚨 SEGURANÇA CLÍNICA (ALTA) — `/dhe na abc peso -5`
- **Descrição:** Calculadora médica retornou dose ou vazão positiva para entrada com valor nulo ou negativo sem exibir alerta de bloqueio.
- **Ocorrências no teste:** 4x
- **💡 Recomendação Cirúrgica:** Adicionar guard clause estrita: exigir peso/dose estritamente positivos antes de calcular BIC ou dosagens.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_016_dhe_na_abc_peso__5.cjs`](tests/repros/repro_issue_016_dhe_na_abc_peso__5.cjs)
  ```bash
  None
  ```

### `ISSUE-017` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dhe na abc peso -5`
- **Descrição:** Divergência matemática detectada na calculadora DHE. Esperado pelo oráculo canônico: Bloqueio defensivo para parâmetros não positivos, bot gerou: Processamento indevido (Erro absoluto: None, Tolerância: None). DHE com parâmetros não positivos (Na -5.0, Peso -5.0, Idade 45).
- **Ocorrências no teste:** 4x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DHE em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_017_dhe_na_abc_peso__5.cjs`](tests/repros/repro_issue_017_dhe_na_abc_peso__5.cjs)
  ```bash
  None
  ```

### `ISSUE-018` · 🚨 BUG CRÍTICO (ALTA) — `🎧 Ouvir no Fone`
- **Descrição:** Falha ao processar ação '🎧 Ouvir no Fone'. O bot não respondeu ou gerou erro: Sem resposta
- **Ocorrências no teste:** 38x
- **💡 Recomendação Cirúrgica:** Garantir bloco defensivo try/catch e resposta amigável para '🎧 Ouvir no Fone'.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_018_ouvir_no_fone.cjs`](tests/repros/repro_issue_018_ouvir_no_fone.cjs)
  ```bash
  None
  ```

### `ISSUE-019` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `🎧 Ouvir no Fone`
- **Descrição:** Ação demorou 20690ms, ultrapassando a tolerância de 1200ms da persona Dr. Gabriel Mendes.
- **Ocorrências no teste:** 37x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-020` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `Choque Séptico em Sala Vermelha`
- **Descrição:** Ação demorou 8992ms, ultrapassando a tolerância de 1200ms da persona Dr. Gabriel Mendes.
- **Ocorrências no teste:** 21x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-021` · ⚠️ UX DEAD-END (MÉDIA) — `📋 Copiar SOAP para PEP`
- **Descrição:** Tela gerada por '📋 Copiar SOAP para PEP' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 40x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_021_copiar_soap_para_pep.cjs`](tests/repros/repro_issue_021_copiar_soap_para_pep.cjs)
  ```bash
  None
  ```

### `ISSUE-022` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_233`
- **Descrição:** Ação demorou 5151ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-023` · ⚠️ UX DEAD-END (MÉDIA) — `/clcr 88 69 4.1`
- **Descrição:** Tela gerada por '/clcr 88 69 4.1' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_023_clcr_88_69_4_1.cjs`](tests/repros/repro_issue_023_clcr_88_69_4_1.cjs)
  ```bash
  None
  ```

### `ISSUE-024` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `Discussão Preceptor (Pré-Eclâmpsia)`
- **Descrição:** Resposta muito extensa (1887 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 12x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-025` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `Discussão Preceptor (Pré-Eclâmpsia)`
- **Descrição:** Ação demorou 8470ms, ultrapassando a tolerância de 3000ms da persona Dra. Camila Nogueira.
- **Ocorrências no teste:** 26x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-026` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `📋 Copiar SOAP para PEP`
- **Descrição:** Resposta muito extensa (1932 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 15x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-027` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/enfermaria`
- **Descrição:** Resposta muito extensa (3767 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 5x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-028` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🚨 CAD (Winter)`
- **Descrição:** Resposta muito extensa (2151 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-029` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_839`
- **Descrição:** Ação demorou 3192ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-030` · ⚠️ UX DEAD-END (MÉDIA) — `/dva nora zero`
- **Descrição:** Tela gerada por '/dva nora zero' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 10x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_030_dva_nora_zero.cjs`](tests/repros/repro_issue_030_dva_nora_zero.cjs)
  ```bash
  None
  ```

### `ISSUE-031` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_741`
- **Descrição:** Ação demorou 2776ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-032` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe k 6.9 ecg`
- **Descrição:** Tela gerada por '/dhe k 6.9 ecg' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_032_dhe_k_6_9_ecg.cjs`](tests/repros/repro_issue_032_dhe_k_6_9_ecg.cjs)
  ```bash
  None
  ```

### `ISSUE-033` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dhe k 6.9 ecg`
- **Descrição:** Resposta muito extensa (2513 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-034` · ⏱️ GARGALO DE LATÊNCIA (BAIXA) — `/minharotina`
- **Descrição:** Ação demorou 1829ms, ultrapassando a tolerância de 1800ms da persona Dr. Thiago Campos.
- **Ocorrências no teste:** 6x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-035` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na -10 peso -5`
- **Descrição:** Tela gerada por '/dhe na -10 peso -5' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 6x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_035_dhe_na__10_peso__5.cjs`](tests/repros/repro_issue_035_dhe_na__10_peso__5.cjs)
  ```bash
  None
  ```

### `ISSUE-036` · 🚨 SEGURANÇA CLÍNICA (ALTA) — `/dhe na -10 peso -5`
- **Descrição:** Calculadora médica retornou dose ou vazão positiva para entrada com valor nulo ou negativo sem exibir alerta de bloqueio.
- **Ocorrências no teste:** 6x
- **💡 Recomendação Cirúrgica:** Adicionar guard clause estrita: exigir peso/dose estritamente positivos antes de calcular BIC ou dosagens.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_036_dhe_na__10_peso__5.cjs`](tests/repros/repro_issue_036_dhe_na__10_peso__5.cjs)
  ```bash
  None
  ```

### `ISSUE-037` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dhe na -10 peso -5`
- **Descrição:** Divergência matemática detectada na calculadora DHE. Esperado pelo oráculo canônico: Bloqueio defensivo para parâmetros não positivos, bot gerou: Processamento indevido (Erro absoluto: None, Tolerância: None). DHE com parâmetros não positivos (Na -10.0, Peso -5.0, Idade 45).
- **Ocorrências no teste:** 6x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DHE em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_037_dhe_na__10_peso__5.cjs`](tests/repros/repro_issue_037_dhe_na__10_peso__5.cjs)
  ```bash
  None
  ```

### `ISSUE-038` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_949`
- **Descrição:** Ação demorou 2073ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-039` · ⚠️ UX DEAD-END (MÉDIA) — `/sri -1`
- **Descrição:** Tela gerada por '/sri -1' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 5x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_039_sri__1.cjs`](tests/repros/repro_issue_039_sri__1.cjs)
  ```bash
  None
  ```

### `ISSUE-040` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `/pals 28`
- **Descrição:** Mensagem contém termo técnico suspeito ('undefined') exibido ao usuário.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_040_pals_28.cjs`](tests/repros/repro_issue_040_pals_28.cjs)
  ```bash
  None
  ```

### `ISSUE-041` · ⚠️ UX DEAD-END (MÉDIA) — `/pals 28`
- **Descrição:** Tela gerada por '/pals 28' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_041_pals_28.cjs`](tests/repros/repro_issue_041_pals_28.cjs)
  ```bash
  None
  ```

### `ISSUE-042` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🫁 DPOC (Acidose Resp)`
- **Descrição:** Resposta muito extensa (2017 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-043` · ⚠️ UX DEAD-END (MÉDIA) — `📋 Copiar Laudo PEP`
- **Descrição:** Tela gerada por '📋 Copiar Laudo PEP' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 6x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_043_copiar_laudo_pep.cjs`](tests/repros/repro_issue_043_copiar_laudo_pep.cjs)
  ```bash
  None
  ```

### `ISSUE-044` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `????`
- **Descrição:** Resposta muito extensa (1945 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-045` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `????`
- **Descrição:** Ação demorou 2527ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 5x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-046` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/choqueseptico 115 0.25`
- **Descrição:** Resposta muito extensa (2540 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-047` · 🚨 SEGURANÇA CLÍNICA (ALTA) — `/choqueseptico 115 0.25`
- **Descrição:** Calculadora médica retornou dose ou vazão positiva para entrada com valor nulo ou negativo sem exibir alerta de bloqueio.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Adicionar guard clause estrita: exigir peso/dose estritamente positivos antes de calcular BIC ou dosagens.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_047_choqueseptico_115_0_25.cjs`](tests/repros/repro_issue_047_choqueseptico_115_0_25.cjs)
  ```bash
  None
  ```

### `ISSUE-048` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_942`
- **Descrição:** Ação demorou 2189ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-049` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `/leito 7 25a Pneumonia aspirativa`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-050` · ⚠️ UX DEAD-END (MÉDIA) — `📋 Copiar Conduta/Passagem para Prontuário`
- **Descrição:** Tela gerada por '📋 Copiar Conduta/Passagem para Prontuário' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 10x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_050_copiar_conduta_passage.cjs`](tests/repros/repro_issue_050_copiar_conduta_passage.cjs)
  ```bash
  None
  ```

### `ISSUE-051` · ⚠️ UX DEAD-END (MÉDIA) — `📋 Copiar para Prontuário`
- **Descrição:** Tela gerada por '📋 Copiar para Prontuário' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 24x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_051_copiar_para_prontu_rio.cjs`](tests/repros/repro_issue_051_copiar_para_prontu_rio.cjs)
  ```bash
  None
  ```

### `ISSUE-052` · ⚠️ UX DEAD-END (MÉDIA) — `/crcl idade peso`
- **Descrição:** Tela gerada por '/crcl idade peso' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 9x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_052_crcl_idade_peso.cjs`](tests/repros/repro_issue_052_crcl_idade_peso.cjs)
  ```bash
  None
  ```

### `ISSUE-053` · ⚠️ UX DEAD-END (MÉDIA) — `/ped amoxicilina 13`
- **Descrição:** Tela gerada por '/ped amoxicilina 13' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_053_ped_amoxicilina_13.cjs`](tests/repros/repro_issue_053_ped_amoxicilina_13.cjs)
  ```bash
  None
  ```

### `ISSUE-054` · ⚠️ UX DEAD-END (MÉDIA) — `📋 Copiar Prescrição PAC`
- **Descrição:** Tela gerada por '📋 Copiar Prescrição PAC' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_054_copiar_prescri__o_pac.cjs`](tests/repros/repro_issue_054_copiar_prescri__o_pac.cjs)
  ```bash
  None
  ```

### `ISSUE-055` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_845`
- **Descrição:** Ação demorou 3425ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-056` · ⚠️ UX DEAD-END (MÉDIA) — `/atb vancomicina 35`
- **Descrição:** Tela gerada por '/atb vancomicina 35' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_056_atb_vancomicina_35.cjs`](tests/repros/repro_issue_056_atb_vancomicina_35.cjs)
  ```bash
  None
  ```

### `ISSUE-057` · ⚠️ UX DEAD-END (MÉDIA) — `/ped azitromicina 10`
- **Descrição:** Tela gerada por '/ped azitromicina 10' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_057_ped_azitromicina_10.cjs`](tests/repros/repro_issue_057_ped_azitromicina_10.cjs)
  ```bash
  None
  ```

### `ISSUE-058` · ⏱️ GARGALO DE LATÊNCIA (BAIXA) — `/comando_inexistente_781`
- **Descrição:** Ação demorou 1931ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-059` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na 123 peso 95 f 69`
- **Descrição:** Tela gerada por '/dhe na 123 peso 95 f 69' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_059_dhe_na_123_peso_95_f_6.cjs`](tests/repros/repro_issue_059_dhe_na_123_peso_95_f_6.cjs)
  ```bash
  None
  ```

### `ISSUE-060` · ⚠️ UX DEAD-END (MÉDIA) — `/dva nora -50`
- **Descrição:** Tela gerada por '/dva nora -50' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 9x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_060_dva_nora__50.cjs`](tests/repros/repro_issue_060_dva_nora__50.cjs)
  ```bash
  None
  ```

### `ISSUE-061` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na 118 peso 57 m 46`
- **Descrição:** Tela gerada por '/dhe na 118 peso 57 m 46' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_061_dhe_na_118_peso_57_m_4.cjs`](tests/repros/repro_issue_061_dhe_na_118_peso_57_m_4.cjs)
  ```bash
  None
  ```

### `ISSUE-062` · ⚠️ FORMATAÇÃO MARKDOWN (BAIXA) — `Fita de Gasometria Arterial (pH 7.21 / AG 27)`
- **Descrição:** Texto retornado possui número ímpar de asteriscos (*), o que pode quebrar formatação negrito no Telegram.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Fechar todas as tags de negrito (*) ou usar escape de Markdown antes do envio.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_062_fita_de_gasometria_art.cjs`](tests/repros/repro_issue_062_fita_de_gasometria_art.cjs)
  ```bash
  None
  ```

### `ISSUE-063` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `📋 Fechar Plano`
- **Descrição:** Ação demorou 3450ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 7x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-064` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `Passagem Sala Vermelha (IAM c/ Supra)`
- **Descrição:** Ação demorou 3549ms, ultrapassando a tolerância de 1200ms da persona Dr. Gabriel Mendes.
- **Ocorrências no teste:** 9x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-065` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🤰 Caso DUM 10/02/2026`
- **Descrição:** Resposta muito extensa (1867 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-066` · ⚠️ UX DEAD-END (MÉDIA) — `/ped amoxicilina 18`
- **Descrição:** Tela gerada por '/ped amoxicilina 18' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_066_ped_amoxicilina_18.cjs`](tests/repros/repro_issue_066_ped_amoxicilina_18.cjs)
  ```bash
  None
  ```

### `ISSUE-067` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_265`
- **Descrição:** Ação demorou 3586ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-068` · ⚠️ UX DEAD-END (MÉDIA) — `/atb vancomicina 38`
- **Descrição:** Tela gerada por '/atb vancomicina 38' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_068_atb_vancomicina_38.cjs`](tests/repros/repro_issue_068_atb_vancomicina_38.cjs)
  ```bash
  None
  ```

### `ISSUE-069` · ⚠️ UX DEAD-END (MÉDIA) — `/crcl 62 55 4.0 masc`
- **Descrição:** Tela gerada por '/crcl 62 55 4.0 masc' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_069_crcl_62_55_4_0_masc.cjs`](tests/repros/repro_issue_069_crcl_62_55_4_0_masc.cjs)
  ```bash
  None
  ```

### `ISSUE-070` · ⚠️ UX DEAD-END (MÉDIA) — `/dva nora 99999`
- **Descrição:** Tela gerada por '/dva nora 99999' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 6x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_070_dva_nora_99999.cjs`](tests/repros/repro_issue_070_dva_nora_99999.cjs)
  ```bash
  None
  ```

### `ISSUE-071` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dva nora 99999`
- **Descrição:** Divergência matemática detectada na calculadora DVA Noradrenalina. Esperado pelo oráculo canônico: 9374.9, bot gerou: Não encontrado (Erro absoluto: 999.0, Tolerância: 0.3). Não foi possível extrair a vazão da infusão de noradrenalina. Esperado: 9374.9 mL/h.
- **Ocorrências no teste:** 6x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DVA Noradrenalina em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_071_dva_nora_99999.cjs`](tests/repros/repro_issue_071_dva_nora_99999.cjs)
  ```bash
  None
  ```

### `ISSUE-072` · ⚠️ UX DEAD-END (MÉDIA) — `/atb vancomicina 39`
- **Descrição:** Tela gerada por '/atb vancomicina 39' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_072_atb_vancomicina_39.cjs`](tests/repros/repro_issue_072_atb_vancomicina_39.cjs)
  ```bash
  None
  ```

### `ISSUE-073` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `/leito 9 56a DPOC exacerbado`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-074` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `📋 Passagem SBAR`
- **Descrição:** Resposta muito extensa (4585 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-075` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `📋 Passagem SBAR`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-076` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `📋 Copiar Conduta/Passagem para Prontuário`
- **Descrição:** Resposta muito extensa (3551 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-077` · ⚠️ FORMATAÇÃO CODE (BAIXA) — `📋 Copiar Conduta/Passagem para Prontuário`
- **Descrição:** Texto retornado possui crases (`) desbalanceadas, podendo truncar blocos monoespaçados.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar template do comando para garantir pares de crases balanceados.

### `ISSUE-078` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `Choque Séptico em Sala Vermelha`
- **Descrição:** Resposta muito extensa (3060 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 9x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-079` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `📋 Copiar para Prontuário`
- **Descrição:** Resposta muito extensa (3045 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 9x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-080` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_789`
- **Descrição:** Ação demorou 2006ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-081` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `Evolução Leito 4 (DPOC em VNI)`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 13x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-082` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `Evolução Leito 4 (DPOC em VNI)`
- **Descrição:** Ação demorou 3245ms, ultrapassando a tolerância de 2500ms da persona Dra. Beatriz Toledo.
- **Ocorrências no teste:** 7x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-083` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🩸 Exemplo DM2`
- **Descrição:** Resposta muito extensa (4541 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-084` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `⚡ Sepse (Choque Lático)`
- **Descrição:** Resposta muito extensa (2363 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-085` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/ajuda calculadoras`
- **Descrição:** Resposta muito extensa (8572 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-086` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `/ajuda calculadoras`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📖 Ver Todos os Comandos (Manual Completo)'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-087` · ⚠️ UX DEAD-END (MÉDIA) — `/conduta_ped asma`
- **Descrição:** Tela gerada por '/conduta_ped asma' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_087_conduta_ped_asma.cjs`](tests/repros/repro_issue_087_conduta_ped_asma.cjs)
  ```bash
  None
  ```

### `ISSUE-088` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/conduta_ped asma`
- **Descrição:** Resposta muito extensa (22144 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-089` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `!@#$%`
- **Descrição:** Ação demorou 3234ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-090` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na 500 peso 0`
- **Descrição:** Tela gerada por '/dhe na 500 peso 0' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_090_dhe_na_500_peso_0.cjs`](tests/repros/repro_issue_090_dhe_na_500_peso_0.cjs)
  ```bash
  None
  ```

### `ISSUE-091` · 🚨 SEGURANÇA CLÍNICA (ALTA) — `/dhe na 500 peso 0`
- **Descrição:** Calculadora médica retornou dose ou vazão positiva para entrada com valor nulo ou negativo sem exibir alerta de bloqueio.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Adicionar guard clause estrita: exigir peso/dose estritamente positivos antes de calcular BIC ou dosagens.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_091_dhe_na_500_peso_0.cjs`](tests/repros/repro_issue_091_dhe_na_500_peso_0.cjs)
  ```bash
  None
  ```

### `ISSUE-092` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dhe na 500 peso 0`
- **Descrição:** Divergência matemática detectada na calculadora DHE. Esperado pelo oráculo canônico: Bloqueio defensivo para parâmetros não positivos, bot gerou: Processamento indevido (Erro absoluto: None, Tolerância: None). DHE com parâmetros não positivos (Na 500.0, Peso 0.0, Idade 45).
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DHE em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_092_dhe_na_500_peso_0.cjs`](tests/repros/repro_issue_092_dhe_na_500_peso_0.cjs)
  ```bash
  None
  ```

### `ISSUE-093` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/mgso4 zuspan`
- **Descrição:** Resposta muito extensa (2925 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 21x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-094` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `📋 Copiar Conduta para Prontuário`
- **Descrição:** Resposta muito extensa (2883 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 9x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-095` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe k 6.5 ecg`
- **Descrição:** Tela gerada por '/dhe k 6.5 ecg' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_095_dhe_k_6_5_ecg.cjs`](tests/repros/repro_issue_095_dhe_k_6_5_ecg.cjs)
  ```bash
  None
  ```

### `ISSUE-096` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dhe k 6.5 ecg`
- **Descrição:** Resposta muito extensa (2513 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-097` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na 500 peso -5`
- **Descrição:** Tela gerada por '/dhe na 500 peso -5' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 4x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_097_dhe_na_500_peso__5.cjs`](tests/repros/repro_issue_097_dhe_na_500_peso__5.cjs)
  ```bash
  None
  ```

### `ISSUE-098` · 🚨 SEGURANÇA CLÍNICA (ALTA) — `/dhe na 500 peso -5`
- **Descrição:** Calculadora médica retornou dose ou vazão positiva para entrada com valor nulo ou negativo sem exibir alerta de bloqueio.
- **Ocorrências no teste:** 4x
- **💡 Recomendação Cirúrgica:** Adicionar guard clause estrita: exigir peso/dose estritamente positivos antes de calcular BIC ou dosagens.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_098_dhe_na_500_peso__5.cjs`](tests/repros/repro_issue_098_dhe_na_500_peso__5.cjs)
  ```bash
  None
  ```

### `ISSUE-099` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dhe na 500 peso -5`
- **Descrição:** Divergência matemática detectada na calculadora DHE. Esperado pelo oráculo canônico: Bloqueio defensivo para parâmetros não positivos, bot gerou: Processamento indevido (Erro absoluto: None, Tolerância: None). DHE com parâmetros não positivos (Na 500.0, Peso -5.0, Idade 45).
- **Ocorrências no teste:** 4x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DHE em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_099_dhe_na_500_peso__5.cjs`](tests/repros/repro_issue_099_dhe_na_500_peso__5.cjs)
  ```bash
  None
  ```

### `ISSUE-100` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na 123 peso 58 m 50`
- **Descrição:** Tela gerada por '/dhe na 123 peso 58 m 50' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_100_dhe_na_123_peso_58_m_5.cjs`](tests/repros/repro_issue_100_dhe_na_123_peso_58_m_5.cjs)
  ```bash
  None
  ```

### `ISSUE-101` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🤮 Vômitos (Alcalose Met)`
- **Descrição:** Resposta muito extensa (1919 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-102` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `📱 Cockpit Mini App`
- **Descrição:** Ação demorou 2350ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-103` · ⚠️ UX DEAD-END (MÉDIA) — `📋 Copiar Prescrição Pediátrica`
- **Descrição:** Tela gerada por '📋 Copiar Prescrição Pediátrica' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_103_copiar_prescri__o_pedi.cjs`](tests/repros/repro_issue_103_copiar_prescri__o_pedi.cjs)
  ```bash
  None
  ```

### `ISSUE-104` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/round Paciente 75a, ICC perfil B`
- **Descrição:** Resposta muito extensa (2073 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-105` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/round Paciente 75a, ICC perfil B`
- **Descrição:** Ação demorou 16687ms, ultrapassando a tolerância de 3000ms da persona Dra. Camila Nogueira.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-106` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🔄 Atualizar Censo`
- **Descrição:** Resposta muito extensa (3875 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-107` · ⚠️ UX DEAD-END (MÉDIA) — `/sri 0`
- **Descrição:** Tela gerada por '/sri 0' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 6x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_107_sri_0.cjs`](tests/repros/repro_issue_107_sri_0.cjs)
  ```bash
  None
  ```

### `ISSUE-108` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe k 7.3 ecg`
- **Descrição:** Tela gerada por '/dhe k 7.3 ecg' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_108_dhe_k_7_3_ecg.cjs`](tests/repros/repro_issue_108_dhe_k_7_3_ecg.cjs)
  ```bash
  None
  ```

### `ISSUE-109` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dhe k 7.3 ecg`
- **Descrição:** Resposta muito extensa (2513 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-110` · ⚠️ UX DEAD-END (MÉDIA) — `/status`
- **Descrição:** Tela gerada por '/status' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 13x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_110_status.cjs`](tests/repros/repro_issue_110_status.cjs)
  ```bash
  None
  ```

### `ISSUE-111` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/prenatal 22/09/2026`
- **Descrição:** Resposta muito extensa (3483 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-112` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe k 7.5 ecg`
- **Descrição:** Tela gerada por '/dhe k 7.5 ecg' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_112_dhe_k_7_5_ecg.cjs`](tests/repros/repro_issue_112_dhe_k_7_5_ecg.cjs)
  ```bash
  None
  ```

### `ISSUE-113` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dhe k 7.5 ecg`
- **Descrição:** Resposta muito extensa (2513 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-114` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `oi bot`
- **Descrição:** Ação demorou 2025ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-115` · ⚠️ UX DEAD-END (MÉDIA) — `/atb ceftriaxona 46`
- **Descrição:** Tela gerada por '/atb ceftriaxona 46' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_115_atb_ceftriaxona_46.cjs`](tests/repros/repro_issue_115_atb_ceftriaxona_46.cjs)
  ```bash
  None
  ```

### `ISSUE-116` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na -10 peso 0`
- **Descrição:** Tela gerada por '/dhe na -10 peso 0' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_116_dhe_na__10_peso_0.cjs`](tests/repros/repro_issue_116_dhe_na__10_peso_0.cjs)
  ```bash
  None
  ```

### `ISSUE-117` · 🚨 SEGURANÇA CLÍNICA (ALTA) — `/dhe na -10 peso 0`
- **Descrição:** Calculadora médica retornou dose ou vazão positiva para entrada com valor nulo ou negativo sem exibir alerta de bloqueio.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Adicionar guard clause estrita: exigir peso/dose estritamente positivos antes de calcular BIC ou dosagens.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_117_dhe_na__10_peso_0.cjs`](tests/repros/repro_issue_117_dhe_na__10_peso_0.cjs)
  ```bash
  None
  ```

### `ISSUE-118` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dhe na -10 peso 0`
- **Descrição:** Divergência matemática detectada na calculadora DHE. Esperado pelo oráculo canônico: Bloqueio defensivo para parâmetros não positivos, bot gerou: Processamento indevido (Erro absoluto: None, Tolerância: None). DHE com parâmetros não positivos (Na -10.0, Peso 0.0, Idade 45).
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DHE em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_118_dhe_na__10_peso_0.cjs`](tests/repros/repro_issue_118_dhe_na__10_peso_0.cjs)
  ```bash
  None
  ```

### `ISSUE-119` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dose claritromicina`
- **Descrição:** Resposta muito extensa (2497 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-120` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `/dose claritromicina`
- **Descrição:** Botão inline com rótulo muito longo (36 chars): '💊 Prescrever no /rx (CLARITROMICINA)'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-121` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `💊 Prescrever no /rx (CLARITROMICINA)`
- **Descrição:** Ação demorou 3096ms, ultrapassando a tolerância de 1800ms da persona Dr. Thiago Campos.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-122` · ⚠️ UX DEAD-END (MÉDIA) — `/sri perfil_inexistente`
- **Descrição:** Tela gerada por '/sri perfil_inexistente' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 5x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_122_sri_perfil_inexistente.cjs`](tests/repros/repro_issue_122_sri_perfil_inexistente.cjs)
  ```bash
  None
  ```

### `ISSUE-123` · ⚠️ UX DEAD-END (MÉDIA) — `📋 Copiar Receita para Prontuário`
- **Descrição:** Tela gerada por '📋 Copiar Receita para Prontuário' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_123_copiar_receita_para_pr.cjs`](tests/repros/repro_issue_123_copiar_receita_para_pr.cjs)
  ```bash
  None
  ```

### `ISSUE-124` · ⚠️ UX DEAD-END (MÉDIA) — `/conduta_ped crise febril`
- **Descrição:** Tela gerada por '/conduta_ped crise febril' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 6x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_124_conduta_ped_crise_febr.cjs`](tests/repros/repro_issue_124_conduta_ped_crise_febr.cjs)
  ```bash
  None
  ```

### `ISSUE-125` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/choqueseptico 75 0.25`
- **Descrição:** Resposta muito extensa (2541 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-126` · 🚨 SEGURANÇA CLÍNICA (ALTA) — `/choqueseptico 75 0.25`
- **Descrição:** Calculadora médica retornou dose ou vazão positiva para entrada com valor nulo ou negativo sem exibir alerta de bloqueio.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Adicionar guard clause estrita: exigir peso/dose estritamente positivos antes de calcular BIC ou dosagens.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_126_choqueseptico_75_0_25.cjs`](tests/repros/repro_issue_126_choqueseptico_75_0_25.cjs)
  ```bash
  None
  ```

### `ISSUE-127` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_384`
- **Descrição:** Ação demorou 2961ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-128` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/rx amigdalite bacteriana adulto 75kg`
- **Descrição:** Ação demorou 3454ms, ultrapassando a tolerância de 2500ms da persona Dra. Beatriz Toledo.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-129` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — ``
- **Descrição:** Ação demorou 3525ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-130` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `50 kg`
- **Descrição:** Ação demorou 3738ms, ultrapassando a tolerância de 1200ms da persona Dr. Gabriel Mendes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-131` · ⚠️ UX DEAD-END (MÉDIA) — `/interacao varfarina + ciprofloxacino`
- **Descrição:** Tela gerada por '/interacao varfarina + ciprofloxacino' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_131_interacao_varfarina___.cjs`](tests/repros/repro_issue_131_interacao_varfarina___.cjs)
  ```bash
  None
  ```

### `ISSUE-132` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `🩺 Mais Especialidades`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📖 Ver Todos os Comandos (Manual Completo)'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 4x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-133` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `💊 Extrair Receita`
- **Descrição:** Resposta muito extensa (3689 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-134` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `💊 Extrair Receita`
- **Descrição:** Ação demorou 6404ms, ultrapassando a tolerância de 3000ms da persona Dra. Camila Nogueira.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-135` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na 118 peso 95 m 87`
- **Descrição:** Tela gerada por '/dhe na 118 peso 95 m 87' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_135_dhe_na_118_peso_95_m_8.cjs`](tests/repros/repro_issue_135_dhe_na_118_peso_95_m_8.cjs)
  ```bash
  None
  ```

### `ISSUE-136` · ⚠️ UX DEAD-END (MÉDIA) — `/ped dipirona 33`
- **Descrição:** Tela gerada por '/ped dipirona 33' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_136_ped_dipirona_33.cjs`](tests/repros/repro_issue_136_ped_dipirona_33.cjs)
  ```bash
  None
  ```

### `ISSUE-137` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/rx pneumonia comunitaria adulto 55kg`
- **Descrição:** Ação demorou 3210ms, ultrapassando a tolerância de 2500ms da persona Dra. Beatriz Toledo.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-138` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_401`
- **Descrição:** Ação demorou 2281ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-139` · ⚠️ UX DEAD-END (MÉDIA) — `/atb meropenem 37`
- **Descrição:** Tela gerada por '/atb meropenem 37' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_139_atb_meropenem_37.cjs`](tests/repros/repro_issue_139_atb_meropenem_37.cjs)
  ```bash
  None
  ```

### `ISSUE-140` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🫁 Exemplo IVAS`
- **Descrição:** Resposta muito extensa (2945 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-141` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `📖 Todos os Comandos`
- **Descrição:** Resposta muito extensa (8572 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-142` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `📖 Todos os Comandos`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📖 Ver Todos os Comandos (Manual Completo)'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-143` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe k 7.6 ecg`
- **Descrição:** Tela gerada por '/dhe k 7.6 ecg' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_143_dhe_k_7_6_ecg.cjs`](tests/repros/repro_issue_143_dhe_k_7_6_ecg.cjs)
  ```bash
  None
  ```

### `ISSUE-144` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dhe k 7.6 ecg`
- **Descrição:** Resposta muito extensa (2513 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-145` · ⚠️ UX DEAD-END (MÉDIA) — `/ped dipirona 7`
- **Descrição:** Tela gerada por '/ped dipirona 7' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_145_ped_dipirona_7.cjs`](tests/repros/repro_issue_145_ped_dipirona_7.cjs)
  ```bash
  None
  ```

### `ISSUE-146` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/gaso 7.34 38 14`
- **Descrição:** Divergência matemática detectada na calculadora Gasometria Completa. Esperado pelo oráculo canônico: Acidose Metabólica (pCO2 esp: 29.0), bot gerou: Interpretado (Erro absoluto: None, Tolerância: None). Gasometria (pH 7.34, pCO2 38.0, HCO3 14.0): primário Acidose Metabólica.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de Gasometria Completa em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_146_gaso_7_34_38_14.cjs`](tests/repros/repro_issue_146_gaso_7_34_38_14.cjs)
  ```bash
  None
  ```

### `ISSUE-147` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe k 6.6 ecg`
- **Descrição:** Tela gerada por '/dhe k 6.6 ecg' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_147_dhe_k_6_6_ecg.cjs`](tests/repros/repro_issue_147_dhe_k_6_6_ecg.cjs)
  ```bash
  None
  ```

### `ISSUE-148` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dhe k 6.6 ecg`
- **Descrição:** Resposta muito extensa (2513 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-149` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🩸 Atonia Grave (Choque IC 1.5)`
- **Descrição:** Resposta muito extensa (1858 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-150` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe k 7.2 ecg`
- **Descrição:** Tela gerada por '/dhe k 7.2 ecg' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_150_dhe_k_7_2_ecg.cjs`](tests/repros/repro_issue_150_dhe_k_7_2_ecg.cjs)
  ```bash
  None
  ```

### `ISSUE-151` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dhe k 7.2 ecg`
- **Descrição:** Resposta muito extensa (2513 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-152` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🦴 Lombalgia`
- **Descrição:** Resposta muito extensa (3266 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-153` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `/pals 17`
- **Descrição:** Mensagem contém termo técnico suspeito ('undefined') exibido ao usuário.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_153_pals_17.cjs`](tests/repros/repro_issue_153_pals_17.cjs)
  ```bash
  None
  ```

### `ISSUE-154` · ⚠️ UX DEAD-END (MÉDIA) — `/pals 17`
- **Descrição:** Tela gerada por '/pals 17' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_154_pals_17.cjs`](tests/repros/repro_issue_154_pals_17.cjs)
  ```bash
  None
  ```

### `ISSUE-155` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/gaso 7.28 41 17`
- **Descrição:** Divergência matemática detectada na calculadora Gasometria Completa. Esperado pelo oráculo canônico: Acidose Metabólica (pCO2 esp: 33.5), bot gerou: Interpretado (Erro absoluto: None, Tolerância: None). Gasometria (pH 7.28, pCO2 41.0, HCO3 17.0): primário Acidose Metabólica.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de Gasometria Completa em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_155_gaso_7_28_41_17.cjs`](tests/repros/repro_issue_155_gaso_7_28_41_17.cjs)
  ```bash
  None
  ```

### `ISSUE-156` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na 125 peso 55 m 66`
- **Descrição:** Tela gerada por '/dhe na 125 peso 55 m 66' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_156_dhe_na_125_peso_55_m_6.cjs`](tests/repros/repro_issue_156_dhe_na_125_peso_55_m_6.cjs)
  ```bash
  None
  ```

### `ISSUE-157` · 🚨 BUG CRÍTICO (ALTA) — `Choque Séptico em Sala Vermelha`
- **Descrição:** Falha ao processar ação 'Choque Séptico em Sala Vermelha'. O bot não respondeu ou gerou erro: Timeout ou fim prematuro de stream do Node.js
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Garantir bloco defensivo try/catch e resposta amigável para 'Choque Séptico em Sala Vermelha'.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_157_choque_s_ptico_em_sala.cjs`](tests/repros/repro_issue_157_choque_s_ptico_em_sala.cjs)
  ```bash
  None
  ```

### `ISSUE-158` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `⚡ Choque & Hipotensão`
- **Descrição:** Botão inline com rótulo muito longo (37 chars): '🔵 Perfil L: Frio & Seco (Hipovolemia)'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-159` · ⚠️ UX DEAD-END (MÉDIA) — `/sri 999999`
- **Descrição:** Tela gerada por '/sri 999999' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_159_sri_999999.cjs`](tests/repros/repro_issue_159_sri_999999.cjs)
  ```bash
  None
  ```

### `ISSUE-160` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `/pals 19`
- **Descrição:** Mensagem contém termo técnico suspeito ('undefined') exibido ao usuário.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_160_pals_19.cjs`](tests/repros/repro_issue_160_pals_19.cjs)
  ```bash
  None
  ```

### `ISSUE-161` · ⚠️ UX DEAD-END (MÉDIA) — `/pals 19`
- **Descrição:** Tela gerada por '/pals 19' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_161_pals_19.cjs`](tests/repros/repro_issue_161_pals_19.cjs)
  ```bash
  None
  ```

### `ISSUE-162` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_216`
- **Descrição:** Ação demorou 9485ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-163` · ⚠️ UX DEAD-END (MÉDIA) — `/interacao amiodarona + azitromicina`
- **Descrição:** Tela gerada por '/interacao amiodarona + azitromicina' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_163_interacao_amiodarona__.cjs`](tests/repros/repro_issue_163_interacao_amiodarona__.cjs)
  ```bash
  None
  ```

### `ISSUE-164` · ⚠️ UX DEAD-END (MÉDIA) — `💊 Meropenem ClCr 25`
- **Descrição:** Tela gerada por '💊 Meropenem ClCr 25' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_164_meropenem_clcr_25.cjs`](tests/repros/repro_issue_164_meropenem_clcr_25.cjs)
  ```bash
  None
  ```

### `ISSUE-165` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `/leito 6 49a DPOC exacerbado`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-166` · ⚠️ UX DEAD-END (MÉDIA) — `📋 Copiar CID-10 & Diagnóstico`
- **Descrição:** Tela gerada por '📋 Copiar CID-10 & Diagnóstico' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_166_copiar_cid_10___diagn_.cjs`](tests/repros/repro_issue_166_copiar_cid_10___diagn_.cjs)
  ```bash
  None
  ```

### `ISSUE-167` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `/pals 24`
- **Descrição:** Mensagem contém termo técnico suspeito ('undefined') exibido ao usuário.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_167_pals_24.cjs`](tests/repros/repro_issue_167_pals_24.cjs)
  ```bash
  None
  ```

### `ISSUE-168` · ⚠️ UX DEAD-END (MÉDIA) — `/pals 24`
- **Descrição:** Tela gerada por '/pals 24' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_168_pals_24.cjs`](tests/repros/repro_issue_168_pals_24.cjs)
  ```bash
  None
  ```

### `ISSUE-169` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `📄 Atestado CFM`
- **Descrição:** Botão inline com rótulo muito longo (36 chars): '📄 7 Dias (Lombalgia / Convalescença)'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-170` · ⚠️ UX DEAD-END (MÉDIA) — `📋 Copiar Atestado para Prontuário`
- **Descrição:** Tela gerada por '📋 Copiar Atestado para Prontuário' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_170_copiar_atestado_para_p.cjs`](tests/repros/repro_issue_170_copiar_atestado_para_p.cjs)
  ```bash
  None
  ```

### `ISSUE-171` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_429`
- **Descrição:** Ação demorou 5375ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-172` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `👶 Ver Doses Pediátricas (PedBook)`
- **Descrição:** Botão inline com rótulo muito longo (36 chars): '💊 Prescrever no /rx (Claritromicina)'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-173` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na 122 peso 62 m 25`
- **Descrição:** Tela gerada por '/dhe na 122 peso 62 m 25' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_173_dhe_na_122_peso_62_m_2.cjs`](tests/repros/repro_issue_173_dhe_na_122_peso_62_m_2.cjs)
  ```bash
  None
  ```

### `ISSUE-174` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `🟢 Estável`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 5x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-175` · ⚠️ UX DEAD-END (MÉDIA) — `/crcl 69 69 3.3 fem`
- **Descrição:** Tela gerada por '/crcl 69 69 3.3 fem' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_175_crcl_69_69_3_3_fem.cjs`](tests/repros/repro_issue_175_crcl_69_69_3_3_fem.cjs)
  ```bash
  None
  ```

### `ISSUE-176` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/minharotina`
- **Descrição:** Resposta muito extensa (2164 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-177` · ⚠️ ERGONOMIA MOBILE (BAIXA) — ``
- **Descrição:** Resposta muito extensa (3454 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-178` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/rx amigdalite bacteriana adulto 73kg`
- **Descrição:** Resposta muito extensa (3759 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-179` · ⚠️ UX DEAD-END (MÉDIA) — `📋 Copiar Conduta Gestação`
- **Descrição:** Tela gerada por '📋 Copiar Conduta Gestação' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_179_copiar_conduta_gesta__.cjs`](tests/repros/repro_issue_179_copiar_conduta_gesta__.cjs)
  ```bash
  None
  ```

### `ISSUE-180` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `📱 Cockpit Mini App`
- **Descrição:** Resposta muito extensa (2164 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-181` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/comando_inexistente_581`
- **Descrição:** Resposta muito extensa (2164 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-182` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/gaso 7.34 34 13`
- **Descrição:** Divergência matemática detectada na calculadora Gasometria Completa. Esperado pelo oráculo canônico: Acidose Metabólica (pCO2 esp: 27.5), bot gerou: Interpretado (Erro absoluto: None, Tolerância: None). Gasometria (pH 7.34, pCO2 34.0, HCO3 13.0): primário Acidose Metabólica.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de Gasometria Completa em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_182_gaso_7_34_34_13.cjs`](tests/repros/repro_issue_182_gaso_7_34_34_13.cjs)
  ```bash
  None
  ```

### `ISSUE-183` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `/conduta_ped bronquiolite`
- **Descrição:** Mensagem contém termo técnico suspeito ('nan') exibido ao usuário.
- **Ocorrências no teste:** 5x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_183_conduta_ped_bronquioli.cjs`](tests/repros/repro_issue_183_conduta_ped_bronquioli.cjs)
  ```bash
  None
  ```

### `ISSUE-184` · ⚠️ UX DEAD-END (MÉDIA) — `/conduta_ped bronquiolite`
- **Descrição:** Tela gerada por '/conduta_ped bronquiolite' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 5x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_184_conduta_ped_bronquioli.cjs`](tests/repros/repro_issue_184_conduta_ped_bronquioli.cjs)
  ```bash
  None
  ```

### `ISSUE-185` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/conduta_ped bronquiolite`
- **Descrição:** Resposta muito extensa (13521 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 5x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-186` · 🚨 BUG CRÍTICO (ALTA) — `📋 Fechar Plano`
- **Descrição:** Falha ao processar ação '📋 Fechar Plano'. O bot não respondeu ou gerou erro: Timeout ou fim prematuro de stream do Node.js
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Garantir bloco defensivo try/catch e resposta amigável para '📋 Fechar Plano'.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_186_fechar_plano.cjs`](tests/repros/repro_issue_186_fechar_plano.cjs)
  ```bash
  None
  ```

### `ISSUE-187` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `/pals 31`
- **Descrição:** Mensagem contém termo técnico suspeito ('undefined') exibido ao usuário.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_187_pals_31.cjs`](tests/repros/repro_issue_187_pals_31.cjs)
  ```bash
  None
  ```

### `ISSUE-188` · ⚠️ UX DEAD-END (MÉDIA) — `/pals 31`
- **Descrição:** Tela gerada por '/pals 31' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_188_pals_31.cjs`](tests/repros/repro_issue_188_pals_31.cjs)
  ```bash
  None
  ```

### `ISSUE-189` · ⚠️ UX DEAD-END (MÉDIA) — `/dva dobu 75`
- **Descrição:** Tela gerada por '/dva dobu 75' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_189_dva_dobu_75.cjs`](tests/repros/repro_issue_189_dva_dobu_75.cjs)
  ```bash
  None
  ```

### `ISSUE-190` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dva dobu 75`
- **Descrição:** Divergência matemática detectada na calculadora DVA Dobutamina. Esperado pelo oráculo canônico: 22.5, bot gerou: Não encontrado (Erro absoluto: 999.0, Tolerância: 0.3). Não foi possível extrair a vazão da infusão de dobutamina. Esperado: 22.5 mL/h.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DVA Dobutamina em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_190_dva_dobu_75.cjs`](tests/repros/repro_issue_190_dva_dobu_75.cjs)
  ```bash
  None
  ```

### `ISSUE-191` · ⚠️ FORMATAÇÃO CODE (BAIXA) — `📋 Copiar SOAP para PEP`
- **Descrição:** Texto retornado possui crases (`) desbalanceadas, podendo truncar blocos monoespaçados.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar template do comando para garantir pares de crases balanceados.

### `ISSUE-192` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `SELECT * FROM users`
- **Descrição:** Resposta muito extensa (3144 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-193` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/choqueseptico 104 0.4`
- **Descrição:** Resposta muito extensa (2538 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-194` · 🚨 SEGURANÇA CLÍNICA (ALTA) — `/choqueseptico 104 0.4`
- **Descrição:** Calculadora médica retornou dose ou vazão positiva para entrada com valor nulo ou negativo sem exibir alerta de bloqueio.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Adicionar guard clause estrita: exigir peso/dose estritamente positivos antes de calcular BIC ou dosagens.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_194_choqueseptico_104_0_4.cjs`](tests/repros/repro_issue_194_choqueseptico_104_0_4.cjs)
  ```bash
  None
  ```

### `ISSUE-195` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `👶 Ver Doses Pediátricas (PedBook)`
- **Descrição:** Resposta muito extensa (2183 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-196` · ⚠️ UX DEAD-END (MÉDIA) — `/ped prednisolona 32`
- **Descrição:** Tela gerada por '/ped prednisolona 32' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_196_ped_prednisolona_32.cjs`](tests/repros/repro_issue_196_ped_prednisolona_32.cjs)
  ```bash
  None
  ```

### `ISSUE-197` · ⚠️ UX DEAD-END (MÉDIA) — `/dva nora abc`
- **Descrição:** Tela gerada por '/dva nora abc' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 4x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_197_dva_nora_abc.cjs`](tests/repros/repro_issue_197_dva_nora_abc.cjs)
  ```bash
  None
  ```

### `ISSUE-198` · 🚨 BUG CRÍTICO (ALTA) — `/round Paciente 66a, ICC perfil B`
- **Descrição:** Falha ao processar ação '/round Paciente 66a, ICC perfil B'. O bot não respondeu ou gerou erro: Timeout ou fim prematuro de stream do Node.js
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Garantir bloco defensivo try/catch e resposta amigável para '/round Paciente 66a, ICC perfil B'.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_198_round_paciente_66a__ic.cjs`](tests/repros/repro_issue_198_round_paciente_66a__ic.cjs)
  ```bash
  None
  ```

### `ISSUE-199` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/round Paciente 66a, ICC perfil B`
- **Descrição:** Ação demorou 25004ms, ultrapassando a tolerância de 3000ms da persona Dra. Camila Nogueira.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-200` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/gaso 7.22 37 16`
- **Descrição:** Divergência matemática detectada na calculadora Gasometria Completa. Esperado pelo oráculo canônico: Acidose Metabólica (pCO2 esp: 32.0), bot gerou: Interpretado (Erro absoluto: None, Tolerância: None). Gasometria (pH 7.22, pCO2 37.0, HCO3 16.0): primário Acidose Metabólica.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de Gasometria Completa em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_200_gaso_7_22_37_16.cjs`](tests/repros/repro_issue_200_gaso_7_22_37_16.cjs)
  ```bash
  None
  ```

### `ISSUE-201` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `/leito 2 50a ICC descompensada`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-202` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `oi bot`
- **Descrição:** Resposta muito extensa (2164 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-203` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na 120 peso 74 m 68`
- **Descrição:** Tela gerada por '/dhe na 120 peso 74 m 68' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_203_dhe_na_120_peso_74_m_6.cjs`](tests/repros/repro_issue_203_dhe_na_120_peso_74_m_6.cjs)
  ```bash
  None
  ```

### `ISSUE-204` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `/pals 9`
- **Descrição:** Mensagem contém termo técnico suspeito ('undefined') exibido ao usuário.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_204_pals_9.cjs`](tests/repros/repro_issue_204_pals_9.cjs)
  ```bash
  None
  ```

### `ISSUE-205` · ⚠️ UX DEAD-END (MÉDIA) — `/pals 9`
- **Descrição:** Tela gerada por '/pals 9' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_205_pals_9.cjs`](tests/repros/repro_issue_205_pals_9.cjs)
  ```bash
  None
  ```

### `ISSUE-206` · 🚨 BUG CRÍTICO (ALTA) — ``
- **Descrição:** Falha ao processar ação '   '. O bot não respondeu ou gerou erro: Sem resposta
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Garantir bloco defensivo try/catch e resposta amigável para '   '.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_206_bug.cjs`](tests/repros/repro_issue_206_bug.cjs)
  ```bash
  None
  ```

### `ISSUE-207` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🔬 1º Tri Avidez Baixa (Aguda)`
- **Descrição:** Resposta muito extensa (1812 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-208` · ⚠️ UX DEAD-END (MÉDIA) — `/crcl cem anos 80kg cr 2`
- **Descrição:** Tela gerada por '/crcl cem anos 80kg cr 2' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 7x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_208_crcl_cem_anos_80kg_cr_.cjs`](tests/repros/repro_issue_208_crcl_cem_anos_80kg_cr_.cjs)
  ```bash
  None
  ```

### `ISSUE-209` · ⚠️ UX DEAD-END (MÉDIA) — `/ped dipirona 15`
- **Descrição:** Tela gerada por '/ped dipirona 15' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_209_ped_dipirona_15.cjs`](tests/repros/repro_issue_209_ped_dipirona_15.cjs)
  ```bash
  None
  ```

### `ISSUE-210` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na 120 peso 53 f 54`
- **Descrição:** Tela gerada por '/dhe na 120 peso 53 f 54' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_210_dhe_na_120_peso_53_f_5.cjs`](tests/repros/repro_issue_210_dhe_na_120_peso_53_f_5.cjs)
  ```bash
  None
  ```

### `ISSUE-211` · ⚠️ UX DEAD-END (MÉDIA) — `/dva dobu 48`
- **Descrição:** Tela gerada por '/dva dobu 48' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_001_dva_dobu_48.cjs`](tests/repros/repro_issue_001_dva_dobu_48.cjs)
  ```bash
  node tests/repros/repro_issue_001_dva_dobu_48.cjs
  ```

### `ISSUE-212` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dva dobu 48`
- **Descrição:** Divergência matemática detectada na calculadora DVA Dobutamina. Esperado pelo oráculo canônico: 14.4, bot gerou: Não encontrado (Erro absoluto: 999.0, Tolerância: 0.3). Não foi possível extrair a vazão da infusão de dobutamina. Esperado: 14.4 mL/h.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DVA Dobutamina em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_002_dva_dobu_48.cjs`](tests/repros/repro_issue_002_dva_dobu_48.cjs)
  ```bash
  node tests/repros/repro_issue_002_dva_dobu_48.cjs
  ```

### `ISSUE-213` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `/leito 10 66a Pneumonia aspirativa`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-214` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `🛏️ Abrir Leito 10`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-215` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `/pals 16`
- **Descrição:** Mensagem contém termo técnico suspeito ('undefined') exibido ao usuário.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_006_pals_16.cjs`](tests/repros/repro_issue_006_pals_16.cjs)
  ```bash
  node tests/repros/repro_issue_006_pals_16.cjs
  ```

### `ISSUE-216` · ⚠️ UX DEAD-END (MÉDIA) — `/pals 16`
- **Descrição:** Tela gerada por '/pals 16' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_007_pals_16.cjs`](tests/repros/repro_issue_007_pals_16.cjs)
  ```bash
  node tests/repros/repro_issue_007_pals_16.cjs
  ```

### `ISSUE-217` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `👶 Pediatria`
- **Descrição:** Mensagem contém termo técnico suspeito ('nan') exibido ao usuário.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_013_pediatria.cjs`](tests/repros/repro_issue_013_pediatria.cjs)
  ```bash
  node tests/repros/repro_issue_013_pediatria.cjs
  ```

### `ISSUE-218` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `🩺 Voltar ao SOAP`
- **Descrição:** Mensagem contém termo técnico suspeito ('nan') exibido ao usuário.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_014_voltar_ao_soap.cjs`](tests/repros/repro_issue_014_voltar_ao_soap.cjs)
  ```bash
  node tests/repros/repro_issue_014_voltar_ao_soap.cjs
  ```

### `ISSUE-219` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🩺 Voltar ao SOAP`
- **Descrição:** Resposta muito extensa (2086 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-220` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `🩺 Voltar ao SOAP`
- **Descrição:** Ação demorou 2142ms, ultrapassando a tolerância de 1200ms da persona Dr. Gabriel Mendes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-221` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/prenatal 01/08/2026`
- **Descrição:** Resposta muito extensa (3485 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-222` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `/pals 6`
- **Descrição:** Mensagem contém termo técnico suspeito ('undefined') exibido ao usuário.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_023_pals_6.cjs`](tests/repros/repro_issue_023_pals_6.cjs)
  ```bash
  node tests/repros/repro_issue_023_pals_6.cjs
  ```

### `ISSUE-223` · ⚠️ UX DEAD-END (MÉDIA) — `/pals 6`
- **Descrição:** Tela gerada por '/pals 6' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_024_pals_6.cjs`](tests/repros/repro_issue_024_pals_6.cjs)
  ```bash
  node tests/repros/repro_issue_024_pals_6.cjs
  ```

### `ISSUE-224` · ⚠️ UX DEAD-END (MÉDIA) — `/clcr 63 75 3.1`
- **Descrição:** Tela gerada por '/clcr 63 75 3.1' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_033_clcr_63_75_3_1.cjs`](tests/repros/repro_issue_033_clcr_63_75_3_1.cjs)
  ```bash
  node tests/repros/repro_issue_033_clcr_63_75_3_1.cjs
  ```

### `ISSUE-225` · 🚨 BUG CRÍTICO (ALTA) — `   `
- **Descrição:** Falha ao processar ação '   '. O bot não respondeu ou gerou erro: Sem resposta
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Garantir bloco defensivo try/catch e resposta amigável para '   '.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_034_bug.cjs`](tests/repros/repro_issue_034_bug.cjs)
  ```bash
  node tests/repros/repro_issue_034_bug.cjs
  ```

### `ISSUE-226` · ⏱️ GARGALO DE LATÊNCIA (BAIXA) — `/comando_inexistente_337`
- **Descrição:** Ação demorou 1565ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-227` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `🟡 Vigilância`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-228` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/round Paciente 80a, ICC perfil B`
- **Descrição:** Resposta muito extensa (2046 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-229` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `/pals 35`
- **Descrição:** Mensagem contém termo técnico suspeito ('undefined') exibido ao usuário.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_043_pals_35.cjs`](tests/repros/repro_issue_043_pals_35.cjs)
  ```bash
  node tests/repros/repro_issue_043_pals_35.cjs
  ```

### `ISSUE-230` · ⚠️ UX DEAD-END (MÉDIA) — `/pals 35`
- **Descrição:** Tela gerada por '/pals 35' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_044_pals_35.cjs`](tests/repros/repro_issue_044_pals_35.cjs)
  ```bash
  node tests/repros/repro_issue_044_pals_35.cjs
  ```

### `ISSUE-231` · ⚠️ UX DEAD-END (MÉDIA) — `/dva dobu 67`
- **Descrição:** Tela gerada por '/dva dobu 67' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_045_dva_dobu_67.cjs`](tests/repros/repro_issue_045_dva_dobu_67.cjs)
  ```bash
  node tests/repros/repro_issue_045_dva_dobu_67.cjs
  ```

### `ISSUE-232` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dva dobu 67`
- **Descrição:** Divergência matemática detectada na calculadora DVA Dobutamina. Esperado pelo oráculo canônico: 20.1, bot gerou: Não encontrado (Erro absoluto: 999.0, Tolerância: 0.3). Não foi possível extrair a vazão da infusão de dobutamina. Esperado: 20.1 mL/h.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DVA Dobutamina em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_046_dva_dobu_67.cjs`](tests/repros/repro_issue_046_dva_dobu_67.cjs)
  ```bash
  node tests/repros/repro_issue_046_dva_dobu_67.cjs
  ```

### `ISSUE-233` · ⚠️ UX DEAD-END (MÉDIA) — `/crcl 69 93 2.7 fem`
- **Descrição:** Tela gerada por '/crcl 69 93 2.7 fem' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_047_crcl_69_93_2_7_fem.cjs`](tests/repros/repro_issue_047_crcl_69_93_2_7_fem.cjs)
  ```bash
  node tests/repros/repro_issue_047_crcl_69_93_2_7_fem.cjs
  ```

### `ISSUE-234` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/round Paciente 76a, Cetoacidose diabetica`
- **Descrição:** Resposta muito extensa (1904 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-235` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `/leito 7 43a Pneumonia aspirativa`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-236` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `🛏️ Abrir Leito 7`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-237` · ⚠️ UX DEAD-END (MÉDIA) — `/ped dipirona 6`
- **Descrição:** Tela gerada por '/ped dipirona 6' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_054_ped_dipirona_6.cjs`](tests/repros/repro_issue_054_ped_dipirona_6.cjs)
  ```bash
  node tests/repros/repro_issue_054_ped_dipirona_6.cjs
  ```

### `ISSUE-238` · ⚠️ UX DEAD-END (MÉDIA) — `/hic 54`
- **Descrição:** Tela gerada por '/hic 54' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_055_hic_54.cjs`](tests/repros/repro_issue_055_hic_54.cjs)
  ```bash
  node tests/repros/repro_issue_055_hic_54.cjs
  ```

### `ISSUE-239` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `/leito 11 57a ICC descompensada`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-240` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `🛏️ Abrir Leito 11`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-241` · ⚠️ UX DEAD-END (MÉDIA) — `/dva dobu 82`
- **Descrição:** Tela gerada por '/dva dobu 82' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_059_dva_dobu_82.cjs`](tests/repros/repro_issue_059_dva_dobu_82.cjs)
  ```bash
  node tests/repros/repro_issue_059_dva_dobu_82.cjs
  ```

### `ISSUE-242` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dva dobu 82`
- **Descrição:** Divergência matemática detectada na calculadora DVA Dobutamina. Esperado pelo oráculo canônico: 24.6, bot gerou: Não encontrado (Erro absoluto: 999.0, Tolerância: 0.3). Não foi possível extrair a vazão da infusão de dobutamina. Esperado: 24.6 mL/h.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DVA Dobutamina em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_060_dva_dobu_82.cjs`](tests/repros/repro_issue_060_dva_dobu_82.cjs)
  ```bash
  node tests/repros/repro_issue_060_dva_dobu_82.cjs
  ```

### `ISSUE-243` · ⚠️ UX DEAD-END (MÉDIA) — `/atb piperacilina 16`
- **Descrição:** Tela gerada por '/atb piperacilina 16' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_061_atb_piperacilina_16.cjs`](tests/repros/repro_issue_061_atb_piperacilina_16.cjs)
  ```bash
  node tests/repros/repro_issue_061_atb_piperacilina_16.cjs
  ```

### `ISSUE-244` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_377`
- **Descrição:** Ação demorou 6156ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-245` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/rx pneumonia comunitaria adulto 63kg`
- **Descrição:** Resposta muito extensa (2016 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-246` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/rx pneumonia comunitaria adulto 63kg`
- **Descrição:** Ação demorou 10997ms, ultrapassando a tolerância de 2500ms da persona Dra. Beatriz Toledo.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-247` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `SELECT * FROM users`
- **Descrição:** Ação demorou 4719ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-248` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dva nora 110`
- **Descrição:** Resposta muito extensa (1999 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-249` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `/pals 10`
- **Descrição:** Mensagem contém termo técnico suspeito ('undefined') exibido ao usuário.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_067_pals_10.cjs`](tests/repros/repro_issue_067_pals_10.cjs)
  ```bash
  node tests/repros/repro_issue_067_pals_10.cjs
  ```

### `ISSUE-250` · ⚠️ UX DEAD-END (MÉDIA) — `/pals 10`
- **Descrição:** Tela gerada por '/pals 10' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_068_pals_10.cjs`](tests/repros/repro_issue_068_pals_10.cjs)
  ```bash
  node tests/repros/repro_issue_068_pals_10.cjs
  ```

### `ISSUE-251` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na 124 peso 88 m 71`
- **Descrição:** Tela gerada por '/dhe na 124 peso 88 m 71' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_070_dhe_na_124_peso_88_m_7.cjs`](tests/repros/repro_issue_070_dhe_na_124_peso_88_m_7.cjs)
  ```bash
  node tests/repros/repro_issue_070_dhe_na_124_peso_88_m_7.cjs
  ```

### `ISSUE-252` · ⚠️ UX DEAD-END (MÉDIA) — `/ped amoxicilina 16`
- **Descrição:** Tela gerada por '/ped amoxicilina 16' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_074_ped_amoxicilina_16.cjs`](tests/repros/repro_issue_074_ped_amoxicilina_16.cjs)
  ```bash
  node tests/repros/repro_issue_074_ped_amoxicilina_16.cjs
  ```

### `ISSUE-253` · ⚠️ UX DEAD-END (MÉDIA) — `/hic 87`
- **Descrição:** Tela gerada por '/hic 87' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_075_hic_87.cjs`](tests/repros/repro_issue_075_hic_87.cjs)
  ```bash
  node tests/repros/repro_issue_075_hic_87.cjs
  ```

### `ISSUE-254` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/round Paciente 82a, DPOC exacerbado`
- **Descrição:** Ação demorou 8921ms, ultrapassando a tolerância de 3000ms da persona Dra. Camila Nogueira.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-255` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `/leito 3 85a ICC descompensada`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-256` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `🛏️ Abrir Leito 3`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-257` · ⚠️ UX DEAD-END (MÉDIA) — `/interacao espironolactona + losartana`
- **Descrição:** Tela gerada por '/interacao espironolactona + losartana' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_083_interacao_espironolact.cjs`](tests/repros/repro_issue_083_interacao_espironolact.cjs)
  ```bash
  node tests/repros/repro_issue_083_interacao_espironolact.cjs
  ```

### `ISSUE-258` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `/pals 18`
- **Descrição:** Mensagem contém termo técnico suspeito ('undefined') exibido ao usuário.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_084_pals_18.cjs`](tests/repros/repro_issue_084_pals_18.cjs)
  ```bash
  node tests/repros/repro_issue_084_pals_18.cjs
  ```

### `ISSUE-259` · ⚠️ UX DEAD-END (MÉDIA) — `/pals 18`
- **Descrição:** Tela gerada por '/pals 18' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_085_pals_18.cjs`](tests/repros/repro_issue_085_pals_18.cjs)
  ```bash
  node tests/repros/repro_issue_085_pals_18.cjs
  ```

### `ISSUE-260` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_206`
- **Descrição:** Ação demorou 2456ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-261` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/prenatal 19/07/2026`
- **Descrição:** Resposta muito extensa (3485 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-262` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_593`
- **Descrição:** Ação demorou 2084ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-263` · ⚠️ UX DEAD-END (MÉDIA) — `/atb vancomicina 57`
- **Descrição:** Tela gerada por '/atb vancomicina 57' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_097_atb_vancomicina_57.cjs`](tests/repros/repro_issue_097_atb_vancomicina_57.cjs)
  ```bash
  node tests/repros/repro_issue_097_atb_vancomicina_57.cjs
  ```

### `ISSUE-264` · 🚨 BUG CRÍTICO (ALTA) — `Discussão Preceptor (Pré-Eclâmpsia)`
- **Descrição:** Falha ao processar ação 'Discussão Preceptor (Pré-Eclâmpsia)'. O bot não respondeu ou gerou erro: Processo Node.js não está rodando.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Garantir bloco defensivo try/catch e resposta amigável para 'Discussão Preceptor (Pré-Eclâmpsia)'.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_101_discuss_o_preceptor__p.cjs`](tests/repros/repro_issue_101_discuss_o_preceptor__p.cjs)
  ```bash
  node tests/repros/repro_issue_101_discuss_o_preceptor__p.cjs
  ```

### `ISSUE-265` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/round Paciente 73a, Sepse foco urinario`
- **Descrição:** Resposta muito extensa (2017 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-266` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/round Paciente 73a, Sepse foco urinario`
- **Descrição:** Ação demorou 13645ms, ultrapassando a tolerância de 3000ms da persona Dra. Camila Nogueira.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-267` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `🔴 Instável`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-268` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `Traçado de ECG (Supra de ST Inferior)`
- **Descrição:** Mensagem contém termo técnico suspeito ('nan') exibido ao usuário.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_268_tra_ado_de_ecg__supra_.cjs`](tests/repros/repro_issue_268_tra_ado_de_ecg__supra_.cjs)
  ```bash
  node tests/repros/repro_issue_268_tra_ado_de_ecg__supra_.cjs
  ```

### `ISSUE-269` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `/pals 7`
- **Descrição:** Mensagem contém termo técnico suspeito ('undefined') exibido ao usuário.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_269_pals_7.cjs`](tests/repros/repro_issue_269_pals_7.cjs)
  ```bash
  node tests/repros/repro_issue_269_pals_7.cjs
  ```

### `ISSUE-270` · ⚠️ UX DEAD-END (MÉDIA) — `/pals 7`
- **Descrição:** Tela gerada por '/pals 7' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_270_pals_7.cjs`](tests/repros/repro_issue_270_pals_7.cjs)
  ```bash
  node tests/repros/repro_issue_270_pals_7.cjs
  ```

### `ISSUE-271` · 🚨 BUG CRÍTICO (ALTA) — `/comando_inexistente_992`
- **Descrição:** Falha ao processar ação '/comando_inexistente_992'. O bot não respondeu ou gerou erro: Timeout ou fim prematuro de stream do Node.js
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Garantir bloco defensivo try/catch e resposta amigável para '/comando_inexistente_992'.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_271_comando_inexistente_99.cjs`](tests/repros/repro_issue_271_comando_inexistente_99.cjs)
  ```bash
  node tests/repros/repro_issue_271_comando_inexistente_99.cjs
  ```

### `ISSUE-272` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_992`
- **Descrição:** Ação demorou 25004ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-273` · ⚠️ UX DEAD-END (MÉDIA) — `/ped dipirona 18`
- **Descrição:** Tela gerada por '/ped dipirona 18' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_273_ped_dipirona_18.cjs`](tests/repros/repro_issue_273_ped_dipirona_18.cjs)
  ```bash
  node tests/repros/repro_issue_273_ped_dipirona_18.cjs
  ```

### `ISSUE-274` · ⚠️ UX DEAD-END (MÉDIA) — `/hic 85`
- **Descrição:** Tela gerada por '/hic 85' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_274_hic_85.cjs`](tests/repros/repro_issue_274_hic_85.cjs)
  ```bash
  node tests/repros/repro_issue_274_hic_85.cjs
  ```

### `ISSUE-275` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `/leito 8 37a Pneumonia aspirativa`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-276` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `🛏️ Abrir Leito 8`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-277` · ⚠️ UX DEAD-END (MÉDIA) — `/hic 78`
- **Descrição:** Tela gerada por '/hic 78' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_277_hic_78.cjs`](tests/repros/repro_issue_277_hic_78.cjs)
  ```bash
  node tests/repros/repro_issue_277_hic_78.cjs
  ```

### `ISSUE-278` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `💊 Anticoncepção OMS`
- **Descrição:** Botão inline com rótulo muito longo (39 chars): '🧠 Enxaqueca com Aura (Cat 4 Estrogênio)'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-279` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `🚬 Tabagista ≥35a (≥15 cig/dia)`
- **Descrição:** Mensagem contém termo técnico suspeito ('[object object]') exibido ao usuário.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_279_tabagista__35a___15_ci.cjs`](tests/repros/repro_issue_279_tabagista__35a___15_ci.cjs)
  ```bash
  node tests/repros/repro_issue_279_tabagista__35a___15_ci.cjs
  ```

### `ISSUE-280` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_682`
- **Descrição:** Ação demorou 2248ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-281` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `🩹 DIP & Infecção Pélvica`
- **Descrição:** Botão inline com rótulo muito longo (37 chars): '🏥 DIP Hospitalar / ATO (Monif II-III)'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-282` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🏥 DIP Hospitalar / ATO (Monif II-III)`
- **Descrição:** Resposta muito extensa (3314 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-283` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `/pals 8`
- **Descrição:** Mensagem contém termo técnico suspeito ('undefined') exibido ao usuário.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_283_pals_8.cjs`](tests/repros/repro_issue_283_pals_8.cjs)
  ```bash
  node tests/repros/repro_issue_283_pals_8.cjs
  ```

### `ISSUE-284` · ⚠️ UX DEAD-END (MÉDIA) — `/pals 8`
- **Descrição:** Tela gerada por '/pals 8' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_284_pals_8.cjs`](tests/repros/repro_issue_284_pals_8.cjs)
  ```bash
  node tests/repros/repro_issue_284_pals_8.cjs
  ```

### `ISSUE-285` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/choqueseptico 79 0.4`
- **Descrição:** Resposta muito extensa (2541 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-286` · 🚨 SEGURANÇA CLÍNICA (ALTA) — `/choqueseptico 79 0.4`
- **Descrição:** Calculadora médica retornou dose ou vazão positiva para entrada com valor nulo ou negativo sem exibir alerta de bloqueio.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Adicionar guard clause estrita: exigir peso/dose estritamente positivos antes de calcular BIC ou dosagens.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_286_choqueseptico_79_0_4.cjs`](tests/repros/repro_issue_286_choqueseptico_79_0_4.cjs)
  ```bash
  node tests/repros/repro_issue_286_choqueseptico_79_0_4.cjs
  ```

### `ISSUE-287` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/round Paciente 59a, Cetoacidose diabetica`
- **Descrição:** Resposta muito extensa (2329 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-288` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/round Paciente 59a, Cetoacidose diabetica`
- **Descrição:** Ação demorou 6317ms, ultrapassando a tolerância de 3000ms da persona Dra. Camila Nogueira.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-289` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/round Paciente 60a, Cetoacidose diabetica`
- **Descrição:** Resposta muito extensa (1906 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-290` · ⚠️ UX DEAD-END (MÉDIA) — `/ped dipirona 14`
- **Descrição:** Tela gerada por '/ped dipirona 14' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_290_ped_dipirona_14.cjs`](tests/repros/repro_issue_290_ped_dipirona_14.cjs)
  ```bash
  node tests/repros/repro_issue_290_ped_dipirona_14.cjs
  ```

### `ISSUE-291` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/sri 109 neuro`
- **Descrição:** Resposta muito extensa (1957 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-292` · ⚠️ UX DEAD-END (MÉDIA) — `/clcr 80 54 2.9`
- **Descrição:** Tela gerada por '/clcr 80 54 2.9' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_292_clcr_80_54_2_9.cjs`](tests/repros/repro_issue_292_clcr_80_54_2_9.cjs)
  ```bash
  node tests/repros/repro_issue_292_clcr_80_54_2_9.cjs
  ```

### `ISSUE-293` · ⚠️ UX DEAD-END (MÉDIA) — `/dva dobu 109`
- **Descrição:** Tela gerada por '/dva dobu 109' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_293_dva_dobu_109.cjs`](tests/repros/repro_issue_293_dva_dobu_109.cjs)
  ```bash
  node tests/repros/repro_issue_293_dva_dobu_109.cjs
  ```

### `ISSUE-294` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dva dobu 109`
- **Descrição:** Divergência matemática detectada na calculadora DVA Dobutamina. Esperado pelo oráculo canônico: 32.7, bot gerou: Não encontrado (Erro absoluto: 999.0, Tolerância: 0.3). Não foi possível extrair a vazão da infusão de dobutamina. Esperado: 32.7 mL/h.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DVA Dobutamina em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_294_dva_dobu_109.cjs`](tests/repros/repro_issue_294_dva_dobu_109.cjs)
  ```bash
  node tests/repros/repro_issue_294_dva_dobu_109.cjs
  ```

### `ISSUE-295` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dose furosemida`
- **Descrição:** Resposta muito extensa (2507 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-296` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/prenatal 03/09/2026`
- **Descrição:** Resposta muito extensa (3483 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-297` · 🚨 SEGURANÇA CLÍNICA (ALTA) — `/choqueseptico 95 0.15`
- **Descrição:** Calculadora médica retornou dose ou vazão positiva para entrada com valor nulo ou negativo sem exibir alerta de bloqueio.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Adicionar guard clause estrita: exigir peso/dose estritamente positivos antes de calcular BIC ou dosagens.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_297_choqueseptico_95_0_15.cjs`](tests/repros/repro_issue_297_choqueseptico_95_0_15.cjs)
  ```bash
  node tests/repros/repro_issue_297_choqueseptico_95_0_15.cjs
  ```

### `ISSUE-298` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/round Paciente 82a, Sepse foco urinario`
- **Descrição:** Ação demorou 9795ms, ultrapassando a tolerância de 3000ms da persona Dra. Camila Nogueira.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-299` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_386`
- **Descrição:** Ação demorou 2346ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-300` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dva nora 96`
- **Descrição:** Resposta muito extensa (1987 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-301` · ⚠️ UX DEAD-END (MÉDIA) — `/ped dipirona 8`
- **Descrição:** Tela gerada por '/ped dipirona 8' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_301_ped_dipirona_8.cjs`](tests/repros/repro_issue_301_ped_dipirona_8.cjs)
  ```bash
  node tests/repros/repro_issue_301_ped_dipirona_8.cjs
  ```

### `ISSUE-302` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `💊 PCR Positivo (Esquema Tríplice)`
- **Descrição:** Resposta muito extensa (2850 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-303` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/round Paciente 69a, Sepse foco urinario`
- **Descrição:** Ação demorou 5431ms, ultrapassando a tolerância de 3000ms da persona Dra. Camila Nogueira.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-304` · ⚠️ UX DEAD-END (MÉDIA) — `/ped prednisolona 28`
- **Descrição:** Tela gerada por '/ped prednisolona 28' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_304_ped_prednisolona_28.cjs`](tests/repros/repro_issue_304_ped_prednisolona_28.cjs)
  ```bash
  node tests/repros/repro_issue_304_ped_prednisolona_28.cjs
  ```

### `ISSUE-305` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_890`
- **Descrição:** Ação demorou 6204ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-306` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `/pals 34`
- **Descrição:** Mensagem contém termo técnico suspeito ('undefined') exibido ao usuário.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_306_pals_34.cjs`](tests/repros/repro_issue_306_pals_34.cjs)
  ```bash
  node tests/repros/repro_issue_306_pals_34.cjs
  ```

### `ISSUE-307` · ⚠️ UX DEAD-END (MÉDIA) — `/pals 34`
- **Descrição:** Tela gerada por '/pals 34' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_307_pals_34.cjs`](tests/repros/repro_issue_307_pals_34.cjs)
  ```bash
  node tests/repros/repro_issue_307_pals_34.cjs
  ```

### `ISSUE-308` · 🚨 BUG CRÍTICO (ALTA) — `Traçado de ECG (Supra de ST Inferior)`
- **Descrição:** Falha ao processar ação 'Traçado de ECG (Supra de ST Inferior)'. O bot não respondeu ou gerou erro: Timeout ou fim prematuro de stream do Node.js
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Garantir bloco defensivo try/catch e resposta amigável para 'Traçado de ECG (Supra de ST Inferior)'.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_308_tra_ado_de_ecg__supra_.cjs`](tests/repros/repro_issue_308_tra_ado_de_ecg__supra_.cjs)
  ```bash
  node tests/repros/repro_issue_308_tra_ado_de_ecg__supra_.cjs
  ```

### `ISSUE-309` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dose amoxicilina`
- **Descrição:** Resposta muito extensa (2137 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-310` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `💊 Prescrever no /rx (AMOXICILINA)`
- **Descrição:** Ação demorou 3122ms, ultrapassando a tolerância de 1800ms da persona Dr. Thiago Campos.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-311` · ⚠️ UX DEAD-END (MÉDIA) — `/dva dobu 93`
- **Descrição:** Tela gerada por '/dva dobu 93' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_311_dva_dobu_93.cjs`](tests/repros/repro_issue_311_dva_dobu_93.cjs)
  ```bash
  node tests/repros/repro_issue_311_dva_dobu_93.cjs
  ```

### `ISSUE-312` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dva dobu 93`
- **Descrição:** Divergência matemática detectada na calculadora DVA Dobutamina. Esperado pelo oráculo canônico: 27.9, bot gerou: Não encontrado (Erro absoluto: 999.0, Tolerância: 0.3). Não foi possível extrair a vazão da infusão de dobutamina. Esperado: 27.9 mL/h.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DVA Dobutamina em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_312_dva_dobu_93.cjs`](tests/repros/repro_issue_312_dva_dobu_93.cjs)
  ```bash
  node tests/repros/repro_issue_312_dva_dobu_93.cjs
  ```

### `ISSUE-313` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dva nora 68`
- **Descrição:** Resposta muito extensa (1998 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-314` · ⚠️ UX DEAD-END (MÉDIA) — `/clcr 47 71 4.2`
- **Descrição:** Tela gerada por '/clcr 47 71 4.2' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_314_clcr_47_71_4_2.cjs`](tests/repros/repro_issue_314_clcr_47_71_4_2.cjs)
  ```bash
  node tests/repros/repro_issue_314_clcr_47_71_4_2.cjs
  ```

### `ISSUE-315` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `🛏️ Abrir Leito 4`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-316` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `🔙 Cancelar / Leito 4`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-317` · ⚠️ UX DEAD-END (MÉDIA) — `/conduta_ped laringite`
- **Descrição:** Tela gerada por '/conduta_ped laringite' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_317_conduta_ped_laringite.cjs`](tests/repros/repro_issue_317_conduta_ped_laringite.cjs)
  ```bash
  node tests/repros/repro_issue_317_conduta_ped_laringite.cjs
  ```

### `ISSUE-318` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/conduta_ped laringite`
- **Descrição:** Resposta muito extensa (3514 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-319` · ⚠️ UX DEAD-END (MÉDIA) — `/ped azitromicina 29`
- **Descrição:** Tela gerada por '/ped azitromicina 29' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_319_ped_azitromicina_29.cjs`](tests/repros/repro_issue_319_ped_azitromicina_29.cjs)
  ```bash
  node tests/repros/repro_issue_319_ped_azitromicina_29.cjs
  ```

### `ISSUE-320` · ⚠️ UX DEAD-END (MÉDIA) — `/atb piperacilina 30`
- **Descrição:** Tela gerada por '/atb piperacilina 30' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_320_atb_piperacilina_30.cjs`](tests/repros/repro_issue_320_atb_piperacilina_30.cjs)
  ```bash
  node tests/repros/repro_issue_320_atb_piperacilina_30.cjs
  ```

### `ISSUE-321` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe k 6.2 ecg`
- **Descrição:** Tela gerada por '/dhe k 6.2 ecg' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_321_dhe_k_6_2_ecg.cjs`](tests/repros/repro_issue_321_dhe_k_6_2_ecg.cjs)
  ```bash
  node tests/repros/repro_issue_321_dhe_k_6_2_ecg.cjs
  ```

### `ISSUE-322` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dhe k 6.2 ecg`
- **Descrição:** Resposta muito extensa (2513 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-323` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dva nora 90`
- **Descrição:** Resposta muito extensa (1999 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-324` · ⚠️ UX DEAD-END (MÉDIA) — `/clcr 87 53 2.2`
- **Descrição:** Tela gerada por '/clcr 87 53 2.2' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_324_clcr_87_53_2_2.cjs`](tests/repros/repro_issue_324_clcr_87_53_2_2.cjs)
  ```bash
  node tests/repros/repro_issue_324_clcr_87_53_2_2.cjs
  ```

### `ISSUE-325` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_571`
- **Descrição:** Ação demorou 3937ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-326` · ⚠️ UX DEAD-END (MÉDIA) — `/clcr 46 49 4.0`
- **Descrição:** Tela gerada por '/clcr 46 49 4.0' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_326_clcr_46_49_4_0.cjs`](tests/repros/repro_issue_326_clcr_46_49_4_0.cjs)
  ```bash
  node tests/repros/repro_issue_326_clcr_46_49_4_0.cjs
  ```

### `ISSUE-327` · ⚠️ UX DEAD-END (MÉDIA) — `/dva dobu 52`
- **Descrição:** Tela gerada por '/dva dobu 52' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_327_dva_dobu_52.cjs`](tests/repros/repro_issue_327_dva_dobu_52.cjs)
  ```bash
  node tests/repros/repro_issue_327_dva_dobu_52.cjs
  ```

### `ISSUE-328` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dva dobu 52`
- **Descrição:** Divergência matemática detectada na calculadora DVA Dobutamina. Esperado pelo oráculo canônico: 15.6, bot gerou: Não encontrado (Erro absoluto: 999.0, Tolerância: 0.3). Não foi possível extrair a vazão da infusão de dobutamina. Esperado: 15.6 mL/h.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DVA Dobutamina em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_328_dva_dobu_52.cjs`](tests/repros/repro_issue_328_dva_dobu_52.cjs)
  ```bash
  node tests/repros/repro_issue_328_dva_dobu_52.cjs
  ```

### `ISSUE-329` · ⚠️ UX DEAD-END (MÉDIA) — `/crcl 42 64 3.2 fem`
- **Descrição:** Tela gerada por '/crcl 42 64 3.2 fem' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_329_crcl_42_64_3_2_fem.cjs`](tests/repros/repro_issue_329_crcl_42_64_3_2_fem.cjs)
  ```bash
  node tests/repros/repro_issue_329_crcl_42_64_3_2_fem.cjs
  ```

### `ISSUE-330` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/round Paciente 73a, DPOC exacerbado`
- **Descrição:** Resposta muito extensa (1925 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-331` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/sri 112 choque`
- **Descrição:** Resposta muito extensa (1960 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-332` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dose ciprofloxacino`
- **Descrição:** Resposta muito extensa (1837 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-333` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `/dose ciprofloxacino`
- **Descrição:** Botão inline com rótulo muito longo (36 chars): '💊 Prescrever no /rx (CIPROFLOXACINO)'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-334` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `Passagem Sala Vermelha (IAM c/ Supra)`
- **Descrição:** Resposta muito extensa (1983 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-335` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na 120 peso 54 m 78`
- **Descrição:** Tela gerada por '/dhe na 120 peso 54 m 78' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_335_dhe_na_120_peso_54_m_7.cjs`](tests/repros/repro_issue_335_dhe_na_120_peso_54_m_7.cjs)
  ```bash
  node tests/repros/repro_issue_335_dhe_na_120_peso_54_m_7.cjs
  ```

### `ISSUE-336` · ⚠️ UX DEAD-END (MÉDIA) — `/clcr 79 84 2.6`
- **Descrição:** Tela gerada por '/clcr 79 84 2.6' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_336_clcr_79_84_2_6.cjs`](tests/repros/repro_issue_336_clcr_79_84_2_6.cjs)
  ```bash
  node tests/repros/repro_issue_336_clcr_79_84_2_6.cjs
  ```

### `ISSUE-337` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/sri 108 choque`
- **Descrição:** Resposta muito extensa (1960 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-338` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_994`
- **Descrição:** Ação demorou 2274ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-339` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na 116 peso 59 f 48`
- **Descrição:** Tela gerada por '/dhe na 116 peso 59 f 48' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_339_dhe_na_116_peso_59_f_4.cjs`](tests/repros/repro_issue_339_dhe_na_116_peso_59_f_4.cjs)
  ```bash
  node tests/repros/repro_issue_339_dhe_na_116_peso_59_f_4.cjs
  ```

### `ISSUE-340` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dva nora 78`
- **Descrição:** Resposta muito extensa (1999 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-341` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `/pals 27`
- **Descrição:** Mensagem contém termo técnico suspeito ('undefined') exibido ao usuário.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_341_pals_27.cjs`](tests/repros/repro_issue_341_pals_27.cjs)
  ```bash
  node tests/repros/repro_issue_341_pals_27.cjs
  ```

### `ISSUE-342` · ⚠️ UX DEAD-END (MÉDIA) — `/pals 27`
- **Descrição:** Tela gerada por '/pals 27' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_342_pals_27.cjs`](tests/repros/repro_issue_342_pals_27.cjs)
  ```bash
  node tests/repros/repro_issue_342_pals_27.cjs
  ```

### `ISSUE-343` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/rx itu nao complicada adulto 81kg`
- **Descrição:** Ação demorou 2978ms, ultrapassando a tolerância de 2500ms da persona Dra. Beatriz Toledo.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

---

## 🧮 Auditoria Matemática de Fórmulas Clínicas (Anti-Alucinação Determinístico)

> 🛡️ **Gabarito Canônico Determinístico**: Todo cálculo clínico executado durante os testes é auditado em tempo real por um oráculo analítico em Python puro com dupla precisão (Harrison, KDIGO, SBC, SBP, NEJM), sem uso de LLM, prevenindo alucinações e garantindo tolerância estrita (ε < 0.5).

**Resumo da Avaliação Numérica:** 90/113 cálculos aprovados (79.6% de conformidade).

| Ciclo | Calculadora | Comando Testado | Esperado (Oráculo) | Obtido (Bot) | Erro Abs | Conformidade |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C01 | DVA Dobutamina | `/dva dobu 48` | 14.4 | Não encontrado | 999.00 | 🚨 **Divergência** |
| C04 | Cockcroft-Gault | `/crcl idade peso` | Bloqueio defensivo por parâmetros insuficientes | Bloqueio acionado | - | ✅ **Aprovado** |
| C14 | SRI | `/sri 0` | Bloqueio defensivo para peso não positivo | Alerta emitido | - | ✅ **Aprovado** |
| C19 | DVA Noradrenalina | `/dva nora -50` | Bloqueio defensivo para peso não positivo | Alerta emitido | - | ✅ **Aprovado** |
| C24 | SRI | `/sri -1` | Bloqueio defensivo para peso não positivo | Alerta emitido | - | ✅ **Aprovado** |
| C46 | SRI | `/sri 98 broncoespasmo` | Etomidato 14.7 mL (29.4 mg) | Validado | - | ✅ **Aprovado** |
| C52 | Cockcroft-Gault | `/clcr 63 75 3.1` | 25.9 | 25.9 | 0.00 | ✅ **Aprovado** |
| C59 | Cockcroft-Gault | `/crcl cem anos 80kg cr 2` | Bloqueio defensivo por parâmetros insuficientes | Bloqueio acionado | - | ✅ **Aprovado** |
| C74 | Gasometria Completa | `/gaso invalido` | Guia de Gasometria | Guia exibido | - | ✅ **Aprovado** |
| C79 | DVA | `/dva nora abc` | Guia de uso de DVA | Guia ou instrução | - | ✅ **Aprovado** |
| C86 | DVA Dobutamina | `/dva dobu 67` | 20.1 | Não encontrado | 999.00 | 🚨 **Divergência** |
| C87 | Cockcroft-Gault | `/crcl 69 93 2.7 fem` | 28.9 | 28.9 | 0.00 | ✅ **Aprovado** |
| C126 | DVA Dobutamina | `/dva dobu 82` | 24.6 | Não encontrado | 999.00 | 🚨 **Divergência** |
| C136 | DVA Noradrenalina | `/dva nora 110` | 10.3 | 10.3 | 0.00 | ✅ **Aprovado** |
| C146 | SRI | `/sri 92 neuro` | Etomidato 13.8 mL (27.6 mg) | Validado | - | ✅ **Aprovado** |
| C157 | DHE Hiponatremia (Adrogué-Madias) | `/dhe na 124 peso 88 m 71` | 7.2 | 7.2 | 0.00 | ✅ **Aprovado** |
| C162 | Cockcroft-Gault | `/crcl 47 78 0.8 masc` | 125.9 | 125.9 | 0.00 | ✅ **Aprovado** |
| C164 | DHE | `/dhe na -10 peso -5` | Bloqueio defensivo para parâmetros não positivos | Processamento indevido | - | 🚨 **Divergência** |
| C174 | DHE | `/dhe na abc peso -5` | Bloqueio defensivo para parâmetros não positivos | Processamento indevido | - | 🚨 **Divergência** |
| C179 | DVA | `/dva nora zero` | Guia de uso de DVA | Guia ou instrução | - | ✅ **Aprovado** |
| C186 | SRI | `/sri 67 broncoespasmo` | Etomidato 10.0 mL (20.1 mg) | Validado | - | ✅ **Aprovado** |
| C189 | Gasometria Completa | `/gaso - - -` | Guia de Gasometria | Guia exibido | - | ✅ **Aprovado** |
| C209 | DVA Noradrenalina | `/dva nora 99999` | 9374.9 | Não encontrado | 999.00 | 🚨 **Divergência** |
| C214 | DHE | `/dhe na 500 peso -5` | Bloqueio defensivo para parâmetros não positivos | Processamento indevido | - | 🚨 **Divergência** |
| C01 | SRI | `/sri 75 neuro` | Etomidato 11.2 mL (22.5 mg) | Validado | - | ✅ **Aprovado** |
| C04 | DHE | `/dhe na abc peso 0` | Bloqueio defensivo para parâmetros não positivos | Alerta emitido | - | ✅ **Aprovado** |
| C14 | DVA | `/dva nora zero` | Guia de uso de DVA | Guia ou instrução | - | ✅ **Aprovado** |
| C19 | DHE | `/dhe na -10 peso 0` | Bloqueio defensivo para parâmetros não positivos | Processamento indevido | - | 🚨 **Divergência** |
| C27 | Cockcroft-Gault | `/clcr 27 71 3.4` | 32.8 | 32.8 | 0.00 | ✅ **Aprovado** |
| C29 | Cockcroft-Gault | `/crcl idade peso` | Bloqueio defensivo por parâmetros insuficientes | Bloqueio acionado | - | ✅ **Aprovado** |

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
| `13f6d71de75f` | ⚡ *Ultra Rotina · Central de Comandos Beira-L | 8 opções | 112 |
| `4ffe3f69e658` | 🚨 *EMERGÊNCIA & SALA VERMELHA* | 13 opções | 16 |
| `a6dae6fbfaaf` | 🚨 *PARADA CARDIORRESPIRATÓRIA (PCR ADULTO — A | 9 opções | 20 |
| `9cb7478f0b5d` | 📋 *PRONTO PARA O PRONTUÁRIO (1-TOQUE PARA COP | 0 opções | 339 |
| `79d7ab441349` | 🌵 *HIPERNATREMIA — DÉFICIT DE ÁGUA LIVRE (ADR | 0 opções | 24 |
| `69843ab36afb` | 📋 *CONDUTA PEDIÁTRICA OFICIAL (PEDBOOK)* | 0 opções | 15 |
| `4b8080f2ce28` | 🛏️ *ENFERMARIA & PRESCRIÇÃO* | 10 opções | 6 |
| `217bd72128b7` | 🏥 *Enfermaria · (8 leitos: 🟢 4 - 🟡 4 - 🔴 0)* | 11 opções | 1 |
| `070c46a861c3` | 🛏️ *Leito 3* · ⚪ Estável | 9 opções | 1 |
| `804e96b8f7b9` | 🔬 *COMPATIBILIDADE EM Y (Y-SITE) · BOMBA DE I | 0 opções | 38 |
| `f9d1e62c3d1f` | 🤰 *AVALIAÇÃO DE PRÉ-NATAL E CRONOLOGIA OBSTÉT | 3 opções | 25 |
| `e9008596ca26` | 💊 *GUIA FARMACÊUTICO HSL — POSOLOGIA OFICIAL* | 2 opções | 2 |
| `794e43cf928d` | *RX · Resumo Clínico* | 6 opções | 29 |
| `ef9f51563e86` | *SOAP (Caso Clínico) · Novo Caso* | 6 opções | 4 |
| `864e8f8e6a1d` | 📋 *PRONTUÁRIO CLÍNICO AMBULATORIAL (SOAP ÁGIL | 4 opções | 4 |
| `3ae965b9beac` | 🩺 *AMBULATÓRIO & ATENÇÃO PRIMÁRIA (UBS)* | 9 opções | 12 |
| `f045c065dd4c` | 🩺 *CONDUTA CITOPATOLÓGICA DE COLO DE ÚTERO (D | 6 opções | 4 |
| `7e3833764ae6` | Tela Sem Texto | 0 opções | 24 |
| `e22bb27e394c` | 🚨 *EMERGÊNCIA - ACHADO CRÍTICOS:* Acidemia gr | 3 opções | 20 |
| `930ed3cc38b4` | 🚨 *EMERGÊNCIA - ACHADO CRÍTICO:* INFARTO AGUD | 3 opções | 10 |
| `7f9897db2dc7` | *LAUDO CLÍNICO MULTIMODAL · EXAMES LABORATORI | 3 opções | 7 |
| `b5583171086f` | 🩺 *Novo caso SOAP iniciado a partir da imagem | 0 opções | 22 |
| `2429ea4cafdc` | ⚠️ *Rascunho para conferência médica* | 7 opções | 220 |
| `8f89770bc72b` | 💧 *CORREÇÃO DE HIPONATREMIA (FÓRMULA DE ADROG | 0 opções | 53 |
| `118b7339ea73` | ❌ Falha ao salvar no Notion. Tente novamente. | 0 opções | 46 |
| `8e0a59a467c6` | 🧭 *HUB DE ROTINA & PRODUTIVIDADE* | 7 opções | 39 |
| `d1b37985800b` | 📆 *AGENDA DE HOJE (Segunda-feira, 12/10/2026) | 3 opções | 78 |
| `72fef9a446a0` | 📆 *AGENDA DE AMANHÃ (Terça-feira, 13/10/2026) | 3 opções | 2 |
| `5e5d08b5d95c` | 📖 *🏥 ENFERMARIA, LEITOS & PLANTÃO* | 3 opções | 4 |
| `146431a57fb4` | ⚠️ *Rascunho para conferência médica* | 2 opções | 64 |

---
> 🌐 **Dashboard Visual Interativo:** Abra [`data/dashboard_grafo.html`](../data/dashboard_grafo.html) no navegador para explorar o grafo de navegação em tempo real.

*(Relatório gerado automaticamente pelo Ultra Rotina Testador Master)*
