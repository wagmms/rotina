# 📋 Relatório de Auditoria & Sugestões: Testador Master (Telegram)

> ⏱️ **Sessão executada em:** 12/10/2026 às 10:38:43  
> ⏳ **Duração total:** 36m 50s | **Ciclos concluídos:** 730  
> 📊 **Cobertura estimada:** 36.7% | **Telas descobertas:** 366 | **Botões testados:** 296  
> ⚡ **Latência média beira-leito:** 2122.5ms

---

## 🎯 Sumário Executivo de Diagnóstico

- **Total de anomalias detectadas:** 210
- **Scripts de Reprodução gerados (1-Clique):** 104
- **🧮 Fórmulas Clínicas auditadas pelo Oráculo Matemático:** 95 (76.8% em conformidade determinística)
- **Críticos / Bugs:** 32
- **Oportunidades de UX / Ergonomia:** 123
- **Alertas de Performance / Latência:** 37

---

## 🚨 Anomalias e Pontos de Atenção Identificados

### `ISSUE-001` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `Abrir leito 3`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-002` · ⚠️ UX DEAD-END (MÉDIA) — `/dva nora 10.5.5`
- **Descrição:** Tela gerada por '/dva nora 10.5.5' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_002_dva_nora_10_5_5.cjs`](tests/repros/repro_issue_002_dva_nora_10_5_5.cjs)
  ```bash
  node tests/repros/repro_issue_002_dva_nora_10_5_5.cjs
  ```

### `ISSUE-003` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dva nora 10.5.5`
- **Descrição:** Divergência matemática detectada na calculadora DVA Noradrenalina. Esperado pelo oráculo canônico: 1.0, bot gerou: Não encontrado (Erro absoluto: 999.0, Tolerância: 0.3). Não foi possível extrair a vazão da infusão de noradrenalina. Esperado: 1.0 mL/h.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DVA Noradrenalina em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_003_dva_nora_10_5_5.cjs`](tests/repros/repro_issue_003_dva_nora_10_5_5.cjs)
  ```bash
  node tests/repros/repro_issue_003_dva_nora_10_5_5.cjs
  ```

### `ISSUE-004` · ⚠️ UX DEAD-END (MÉDIA) — `📋 Copiar Conduta para Prontuário`
- **Descrição:** Tela gerada por '📋 Copiar Conduta para Prontuário' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 18x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_004_copiar_conduta_para_pr.cjs`](tests/repros/repro_issue_004_copiar_conduta_para_pr.cjs)
  ```bash
  node tests/repros/repro_issue_004_copiar_conduta_para_pr.cjs
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
- **Ocorrências no teste:** 14x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-009` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `Fita de Gasometria Arterial (pH 7.21 / AG 27)`
- **Descrição:** Ação demorou 3985ms, ultrapassando a tolerância de 3000ms da persona Dra. Camila Nogueira.
- **Ocorrências no teste:** 14x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-010` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `Traçado de ECG (Supra de ST Inferior)`
- **Descrição:** Resposta muito extensa (2458 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-011` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `Traçado de ECG (Supra de ST Inferior)`
- **Descrição:** Ação demorou 4450ms, ultrapassando a tolerância de 1200ms da persona Dr. Gabriel Mendes.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-012` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `Laudo de Hemograma (Leucocitose + PCR 194)`
- **Descrição:** Resposta muito extensa (2083 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 12x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-013` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `Laudo de Hemograma (Leucocitose + PCR 194)`
- **Descrição:** Ação demorou 3298ms, ultrapassando a tolerância de 2500ms da persona Dra. Beatriz Toledo.
- **Ocorrências no teste:** 12x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-014` · ⏱️ GARGALO DE LATÊNCIA (BAIXA) — `➕ Incorporar ao SOAP`
- **Descrição:** Ação demorou 1993ms, ultrapassando a tolerância de 1800ms da persona Dr. Thiago Campos.
- **Ocorrências no teste:** 21x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-015` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na abc peso -5`
- **Descrição:** Tela gerada por '/dhe na abc peso -5' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_015_dhe_na_abc_peso__5.cjs`](tests/repros/repro_issue_015_dhe_na_abc_peso__5.cjs)
  ```bash
  node tests/repros/repro_issue_015_dhe_na_abc_peso__5.cjs
  ```

### `ISSUE-016` · 🚨 SEGURANÇA CLÍNICA (ALTA) — `/dhe na abc peso -5`
- **Descrição:** Calculadora médica retornou dose ou vazão positiva para entrada com valor nulo ou negativo sem exibir alerta de bloqueio.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Adicionar guard clause estrita: exigir peso/dose estritamente positivos antes de calcular BIC ou dosagens.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_016_dhe_na_abc_peso__5.cjs`](tests/repros/repro_issue_016_dhe_na_abc_peso__5.cjs)
  ```bash
  node tests/repros/repro_issue_016_dhe_na_abc_peso__5.cjs
  ```

### `ISSUE-017` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dhe na abc peso -5`
- **Descrição:** Divergência matemática detectada na calculadora DHE. Esperado pelo oráculo canônico: Bloqueio defensivo para parâmetros não positivos, bot gerou: Processamento indevido (Erro absoluto: None, Tolerância: None). DHE com parâmetros não positivos (Na -5.0, Peso -5.0, Idade 45).
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DHE em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_017_dhe_na_abc_peso__5.cjs`](tests/repros/repro_issue_017_dhe_na_abc_peso__5.cjs)
  ```bash
  node tests/repros/repro_issue_017_dhe_na_abc_peso__5.cjs
  ```

### `ISSUE-018` · 🚨 BUG CRÍTICO (ALTA) — `🎧 Ouvir no Fone`
- **Descrição:** Falha ao processar ação '🎧 Ouvir no Fone'. O bot não respondeu ou gerou erro: Sem resposta
- **Ocorrências no teste:** 24x
- **💡 Recomendação Cirúrgica:** Garantir bloco defensivo try/catch e resposta amigável para '🎧 Ouvir no Fone'.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_018_ouvir_no_fone.cjs`](tests/repros/repro_issue_018_ouvir_no_fone.cjs)
  ```bash
  node tests/repros/repro_issue_018_ouvir_no_fone.cjs
  ```

### `ISSUE-019` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `🎧 Ouvir no Fone`
- **Descrição:** Ação demorou 20690ms, ultrapassando a tolerância de 1200ms da persona Dr. Gabriel Mendes.
- **Ocorrências no teste:** 23x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-020` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `Choque Séptico em Sala Vermelha`
- **Descrição:** Ação demorou 8992ms, ultrapassando a tolerância de 1200ms da persona Dr. Gabriel Mendes.
- **Ocorrências no teste:** 13x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-021` · ⚠️ UX DEAD-END (MÉDIA) — `📋 Copiar SOAP para PEP`
- **Descrição:** Tela gerada por '📋 Copiar SOAP para PEP' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 40x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_021_copiar_soap_para_pep.cjs`](tests/repros/repro_issue_021_copiar_soap_para_pep.cjs)
  ```bash
  node tests/repros/repro_issue_021_copiar_soap_para_pep.cjs
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
  node tests/repros/repro_issue_023_clcr_88_69_4_1.cjs
  ```

### `ISSUE-024` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `Discussão Preceptor (Pré-Eclâmpsia)`
- **Descrição:** Resposta muito extensa (1887 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 7x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-025` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `Discussão Preceptor (Pré-Eclâmpsia)`
- **Descrição:** Ação demorou 8470ms, ultrapassando a tolerância de 3000ms da persona Dra. Camila Nogueira.
- **Ocorrências no teste:** 16x
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
- **Ocorrências no teste:** 6x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_030_dva_nora_zero.cjs`](tests/repros/repro_issue_030_dva_nora_zero.cjs)
  ```bash
  node tests/repros/repro_issue_030_dva_nora_zero.cjs
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
  node tests/repros/repro_issue_032_dhe_k_6_9_ecg.cjs
  ```

### `ISSUE-033` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dhe k 6.9 ecg`
- **Descrição:** Resposta muito extensa (2513 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-034` · ⏱️ GARGALO DE LATÊNCIA (BAIXA) — `/minharotina`
- **Descrição:** Ação demorou 1829ms, ultrapassando a tolerância de 1800ms da persona Dr. Thiago Campos.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-035` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na -10 peso -5`
- **Descrição:** Tela gerada por '/dhe na -10 peso -5' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 4x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_035_dhe_na__10_peso__5.cjs`](tests/repros/repro_issue_035_dhe_na__10_peso__5.cjs)
  ```bash
  node tests/repros/repro_issue_035_dhe_na__10_peso__5.cjs
  ```

### `ISSUE-036` · 🚨 SEGURANÇA CLÍNICA (ALTA) — `/dhe na -10 peso -5`
- **Descrição:** Calculadora médica retornou dose ou vazão positiva para entrada com valor nulo ou negativo sem exibir alerta de bloqueio.
- **Ocorrências no teste:** 4x
- **💡 Recomendação Cirúrgica:** Adicionar guard clause estrita: exigir peso/dose estritamente positivos antes de calcular BIC ou dosagens.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_036_dhe_na__10_peso__5.cjs`](tests/repros/repro_issue_036_dhe_na__10_peso__5.cjs)
  ```bash
  node tests/repros/repro_issue_036_dhe_na__10_peso__5.cjs
  ```

### `ISSUE-037` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dhe na -10 peso -5`
- **Descrição:** Divergência matemática detectada na calculadora DHE. Esperado pelo oráculo canônico: Bloqueio defensivo para parâmetros não positivos, bot gerou: Processamento indevido (Erro absoluto: None, Tolerância: None). DHE com parâmetros não positivos (Na -10.0, Peso -5.0, Idade 45).
- **Ocorrências no teste:** 4x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DHE em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_037_dhe_na__10_peso__5.cjs`](tests/repros/repro_issue_037_dhe_na__10_peso__5.cjs)
  ```bash
  node tests/repros/repro_issue_037_dhe_na__10_peso__5.cjs
  ```

### `ISSUE-038` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_949`
- **Descrição:** Ação demorou 2073ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-039` · ⚠️ UX DEAD-END (MÉDIA) — `/sri -1`
- **Descrição:** Tela gerada por '/sri -1' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_039_sri__1.cjs`](tests/repros/repro_issue_039_sri__1.cjs)
  ```bash
  node tests/repros/repro_issue_039_sri__1.cjs
  ```

### `ISSUE-040` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `/pals 28`
- **Descrição:** Mensagem contém termo técnico suspeito ('undefined') exibido ao usuário.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_040_pals_28.cjs`](tests/repros/repro_issue_040_pals_28.cjs)
  ```bash
  node tests/repros/repro_issue_040_pals_28.cjs
  ```

### `ISSUE-041` · ⚠️ UX DEAD-END (MÉDIA) — `/pals 28`
- **Descrição:** Tela gerada por '/pals 28' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_041_pals_28.cjs`](tests/repros/repro_issue_041_pals_28.cjs)
  ```bash
  node tests/repros/repro_issue_041_pals_28.cjs
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
  node tests/repros/repro_issue_043_copiar_laudo_pep.cjs
  ```

### `ISSUE-044` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `????`
- **Descrição:** Resposta muito extensa (1945 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-045` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `????`
- **Descrição:** Ação demorou 2527ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 3x
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
  node tests/repros/repro_issue_047_choqueseptico_115_0_25.cjs
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
  node tests/repros/repro_issue_050_copiar_conduta_passage.cjs
  ```

### `ISSUE-051` · ⚠️ UX DEAD-END (MÉDIA) — `📋 Copiar para Prontuário`
- **Descrição:** Tela gerada por '📋 Copiar para Prontuário' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 22x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_051_copiar_para_prontu_rio.cjs`](tests/repros/repro_issue_051_copiar_para_prontu_rio.cjs)
  ```bash
  node tests/repros/repro_issue_051_copiar_para_prontu_rio.cjs
  ```

### `ISSUE-052` · ⚠️ UX DEAD-END (MÉDIA) — `/crcl idade peso`
- **Descrição:** Tela gerada por '/crcl idade peso' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 5x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_052_crcl_idade_peso.cjs`](tests/repros/repro_issue_052_crcl_idade_peso.cjs)
  ```bash
  node tests/repros/repro_issue_052_crcl_idade_peso.cjs
  ```

### `ISSUE-053` · ⚠️ UX DEAD-END (MÉDIA) — `/ped amoxicilina 13`
- **Descrição:** Tela gerada por '/ped amoxicilina 13' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_053_ped_amoxicilina_13.cjs`](tests/repros/repro_issue_053_ped_amoxicilina_13.cjs)
  ```bash
  node tests/repros/repro_issue_053_ped_amoxicilina_13.cjs
  ```

### `ISSUE-054` · ⚠️ UX DEAD-END (MÉDIA) — `📋 Copiar Prescrição PAC`
- **Descrição:** Tela gerada por '📋 Copiar Prescrição PAC' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_054_copiar_prescri__o_pac.cjs`](tests/repros/repro_issue_054_copiar_prescri__o_pac.cjs)
  ```bash
  node tests/repros/repro_issue_054_copiar_prescri__o_pac.cjs
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
  node tests/repros/repro_issue_056_atb_vancomicina_35.cjs
  ```

### `ISSUE-057` · ⚠️ UX DEAD-END (MÉDIA) — `/ped azitromicina 10`
- **Descrição:** Tela gerada por '/ped azitromicina 10' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_057_ped_azitromicina_10.cjs`](tests/repros/repro_issue_057_ped_azitromicina_10.cjs)
  ```bash
  node tests/repros/repro_issue_057_ped_azitromicina_10.cjs
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
  node tests/repros/repro_issue_059_dhe_na_123_peso_95_f_6.cjs
  ```

### `ISSUE-060` · ⚠️ UX DEAD-END (MÉDIA) — `/dva nora -50`
- **Descrição:** Tela gerada por '/dva nora -50' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 3x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_060_dva_nora__50.cjs`](tests/repros/repro_issue_060_dva_nora__50.cjs)
  ```bash
  node tests/repros/repro_issue_060_dva_nora__50.cjs
  ```

### `ISSUE-061` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na 118 peso 57 m 46`
- **Descrição:** Tela gerada por '/dhe na 118 peso 57 m 46' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_061_dhe_na_118_peso_57_m_4.cjs`](tests/repros/repro_issue_061_dhe_na_118_peso_57_m_4.cjs)
  ```bash
  node tests/repros/repro_issue_061_dhe_na_118_peso_57_m_4.cjs
  ```

### `ISSUE-062` · ⚠️ FORMATAÇÃO MARKDOWN (BAIXA) — `Fita de Gasometria Arterial (pH 7.21 / AG 27)`
- **Descrição:** Texto retornado possui número ímpar de asteriscos (*), o que pode quebrar formatação negrito no Telegram.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Fechar todas as tags de negrito (*) ou usar escape de Markdown antes do envio.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_062_fita_de_gasometria_art.cjs`](tests/repros/repro_issue_062_fita_de_gasometria_art.cjs)
  ```bash
  node tests/repros/repro_issue_062_fita_de_gasometria_art.cjs
  ```

### `ISSUE-063` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `📋 Fechar Plano`
- **Descrição:** Ação demorou 3450ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 7x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-064` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `Passagem Sala Vermelha (IAM c/ Supra)`
- **Descrição:** Ação demorou 3549ms, ultrapassando a tolerância de 1200ms da persona Dr. Gabriel Mendes.
- **Ocorrências no teste:** 3x
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
  node tests/repros/repro_issue_066_ped_amoxicilina_18.cjs
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
  node tests/repros/repro_issue_068_atb_vancomicina_38.cjs
  ```

### `ISSUE-069` · ⚠️ UX DEAD-END (MÉDIA) — `/crcl 62 55 4.0 masc`
- **Descrição:** Tela gerada por '/crcl 62 55 4.0 masc' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_069_crcl_62_55_4_0_masc.cjs`](tests/repros/repro_issue_069_crcl_62_55_4_0_masc.cjs)
  ```bash
  node tests/repros/repro_issue_069_crcl_62_55_4_0_masc.cjs
  ```

### `ISSUE-070` · ⚠️ UX DEAD-END (MÉDIA) — `/dva nora 99999`
- **Descrição:** Tela gerada por '/dva nora 99999' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 4x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_070_dva_nora_99999.cjs`](tests/repros/repro_issue_070_dva_nora_99999.cjs)
  ```bash
  node tests/repros/repro_issue_070_dva_nora_99999.cjs
  ```

### `ISSUE-071` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dva nora 99999`
- **Descrição:** Divergência matemática detectada na calculadora DVA Noradrenalina. Esperado pelo oráculo canônico: 9374.9, bot gerou: Não encontrado (Erro absoluto: 999.0, Tolerância: 0.3). Não foi possível extrair a vazão da infusão de noradrenalina. Esperado: 9374.9 mL/h.
- **Ocorrências no teste:** 4x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DVA Noradrenalina em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_071_dva_nora_99999.cjs`](tests/repros/repro_issue_071_dva_nora_99999.cjs)
  ```bash
  node tests/repros/repro_issue_071_dva_nora_99999.cjs
  ```

### `ISSUE-072` · ⚠️ UX DEAD-END (MÉDIA) — `/atb vancomicina 39`
- **Descrição:** Tela gerada por '/atb vancomicina 39' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_072_atb_vancomicina_39.cjs`](tests/repros/repro_issue_072_atb_vancomicina_39.cjs)
  ```bash
  node tests/repros/repro_issue_072_atb_vancomicina_39.cjs
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
- **Ocorrências no teste:** 6x
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
- **Ocorrências no teste:** 10x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-082` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `Evolução Leito 4 (DPOC em VNI)`
- **Descrição:** Ação demorou 3245ms, ultrapassando a tolerância de 2500ms da persona Dra. Beatriz Toledo.
- **Ocorrências no teste:** 5x
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
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-086` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `/ajuda calculadoras`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📖 Ver Todos os Comandos (Manual Completo)'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-087` · ⚠️ UX DEAD-END (MÉDIA) — `/conduta_ped asma`
- **Descrição:** Tela gerada por '/conduta_ped asma' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_087_conduta_ped_asma.cjs`](tests/repros/repro_issue_087_conduta_ped_asma.cjs)
  ```bash
  node tests/repros/repro_issue_087_conduta_ped_asma.cjs
  ```

### `ISSUE-088` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/conduta_ped asma`
- **Descrição:** Resposta muito extensa (22144 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-089` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `!@#$%`
- **Descrição:** Ação demorou 3234ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-090` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na 500 peso 0`
- **Descrição:** Tela gerada por '/dhe na 500 peso 0' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_090_dhe_na_500_peso_0.cjs`](tests/repros/repro_issue_090_dhe_na_500_peso_0.cjs)
  ```bash
  node tests/repros/repro_issue_090_dhe_na_500_peso_0.cjs
  ```

### `ISSUE-091` · 🚨 SEGURANÇA CLÍNICA (ALTA) — `/dhe na 500 peso 0`
- **Descrição:** Calculadora médica retornou dose ou vazão positiva para entrada com valor nulo ou negativo sem exibir alerta de bloqueio.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Adicionar guard clause estrita: exigir peso/dose estritamente positivos antes de calcular BIC ou dosagens.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_091_dhe_na_500_peso_0.cjs`](tests/repros/repro_issue_091_dhe_na_500_peso_0.cjs)
  ```bash
  node tests/repros/repro_issue_091_dhe_na_500_peso_0.cjs
  ```

### `ISSUE-092` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dhe na 500 peso 0`
- **Descrição:** Divergência matemática detectada na calculadora DHE. Esperado pelo oráculo canônico: Bloqueio defensivo para parâmetros não positivos, bot gerou: Processamento indevido (Erro absoluto: None, Tolerância: None). DHE com parâmetros não positivos (Na 500.0, Peso 0.0, Idade 45).
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DHE em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_092_dhe_na_500_peso_0.cjs`](tests/repros/repro_issue_092_dhe_na_500_peso_0.cjs)
  ```bash
  node tests/repros/repro_issue_092_dhe_na_500_peso_0.cjs
  ```

### `ISSUE-093` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/mgso4 zuspan`
- **Descrição:** Resposta muito extensa (2925 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 7x
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
  node tests/repros/repro_issue_095_dhe_k_6_5_ecg.cjs
  ```

### `ISSUE-096` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dhe k 6.5 ecg`
- **Descrição:** Resposta muito extensa (2513 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-097` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na 500 peso -5`
- **Descrição:** Tela gerada por '/dhe na 500 peso -5' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_097_dhe_na_500_peso__5.cjs`](tests/repros/repro_issue_097_dhe_na_500_peso__5.cjs)
  ```bash
  node tests/repros/repro_issue_097_dhe_na_500_peso__5.cjs
  ```

### `ISSUE-098` · 🚨 SEGURANÇA CLÍNICA (ALTA) — `/dhe na 500 peso -5`
- **Descrição:** Calculadora médica retornou dose ou vazão positiva para entrada com valor nulo ou negativo sem exibir alerta de bloqueio.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Adicionar guard clause estrita: exigir peso/dose estritamente positivos antes de calcular BIC ou dosagens.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_098_dhe_na_500_peso__5.cjs`](tests/repros/repro_issue_098_dhe_na_500_peso__5.cjs)
  ```bash
  node tests/repros/repro_issue_098_dhe_na_500_peso__5.cjs
  ```

### `ISSUE-099` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dhe na 500 peso -5`
- **Descrição:** Divergência matemática detectada na calculadora DHE. Esperado pelo oráculo canônico: Bloqueio defensivo para parâmetros não positivos, bot gerou: Processamento indevido (Erro absoluto: None, Tolerância: None). DHE com parâmetros não positivos (Na 500.0, Peso -5.0, Idade 45).
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DHE em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_099_dhe_na_500_peso__5.cjs`](tests/repros/repro_issue_099_dhe_na_500_peso__5.cjs)
  ```bash
  node tests/repros/repro_issue_099_dhe_na_500_peso__5.cjs
  ```

### `ISSUE-100` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na 123 peso 58 m 50`
- **Descrição:** Tela gerada por '/dhe na 123 peso 58 m 50' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_100_dhe_na_123_peso_58_m_5.cjs`](tests/repros/repro_issue_100_dhe_na_123_peso_58_m_5.cjs)
  ```bash
  node tests/repros/repro_issue_100_dhe_na_123_peso_58_m_5.cjs
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
  node tests/repros/repro_issue_103_copiar_prescri__o_pedi.cjs
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
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_107_sri_0.cjs`](tests/repros/repro_issue_107_sri_0.cjs)
  ```bash
  node tests/repros/repro_issue_107_sri_0.cjs
  ```

### `ISSUE-108` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe k 7.3 ecg`
- **Descrição:** Tela gerada por '/dhe k 7.3 ecg' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_108_dhe_k_7_3_ecg.cjs`](tests/repros/repro_issue_108_dhe_k_7_3_ecg.cjs)
  ```bash
  node tests/repros/repro_issue_108_dhe_k_7_3_ecg.cjs
  ```

### `ISSUE-109` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dhe k 7.3 ecg`
- **Descrição:** Resposta muito extensa (2513 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-110` · ⚠️ UX DEAD-END (MÉDIA) — `/status`
- **Descrição:** Tela gerada por '/status' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 8x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_110_status.cjs`](tests/repros/repro_issue_110_status.cjs)
  ```bash
  node tests/repros/repro_issue_110_status.cjs
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
  node tests/repros/repro_issue_112_dhe_k_7_5_ecg.cjs
  ```

### `ISSUE-113` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dhe k 7.5 ecg`
- **Descrição:** Resposta muito extensa (2513 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-114` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `oi bot`
- **Descrição:** Ação demorou 2025ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-115` · ⚠️ UX DEAD-END (MÉDIA) — `/atb ceftriaxona 46`
- **Descrição:** Tela gerada por '/atb ceftriaxona 46' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_115_atb_ceftriaxona_46.cjs`](tests/repros/repro_issue_115_atb_ceftriaxona_46.cjs)
  ```bash
  node tests/repros/repro_issue_115_atb_ceftriaxona_46.cjs
  ```

### `ISSUE-116` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na -10 peso 0`
- **Descrição:** Tela gerada por '/dhe na -10 peso 0' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_116_dhe_na__10_peso_0.cjs`](tests/repros/repro_issue_116_dhe_na__10_peso_0.cjs)
  ```bash
  node tests/repros/repro_issue_116_dhe_na__10_peso_0.cjs
  ```

### `ISSUE-117` · 🚨 SEGURANÇA CLÍNICA (ALTA) — `/dhe na -10 peso 0`
- **Descrição:** Calculadora médica retornou dose ou vazão positiva para entrada com valor nulo ou negativo sem exibir alerta de bloqueio.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Adicionar guard clause estrita: exigir peso/dose estritamente positivos antes de calcular BIC ou dosagens.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_117_dhe_na__10_peso_0.cjs`](tests/repros/repro_issue_117_dhe_na__10_peso_0.cjs)
  ```bash
  node tests/repros/repro_issue_117_dhe_na__10_peso_0.cjs
  ```

### `ISSUE-118` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dhe na -10 peso 0`
- **Descrição:** Divergência matemática detectada na calculadora DHE. Esperado pelo oráculo canônico: Bloqueio defensivo para parâmetros não positivos, bot gerou: Processamento indevido (Erro absoluto: None, Tolerância: None). DHE com parâmetros não positivos (Na -10.0, Peso 0.0, Idade 45).
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DHE em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_118_dhe_na__10_peso_0.cjs`](tests/repros/repro_issue_118_dhe_na__10_peso_0.cjs)
  ```bash
  node tests/repros/repro_issue_118_dhe_na__10_peso_0.cjs
  ```

### `ISSUE-119` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dose claritromicina`
- **Descrição:** Resposta muito extensa (2497 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-120` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `/dose claritromicina`
- **Descrição:** Botão inline com rótulo muito longo (36 chars): '💊 Prescrever no /rx (CLARITROMICINA)'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 2x
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
  node tests/repros/repro_issue_122_sri_perfil_inexistente.cjs
  ```

### `ISSUE-123` · ⚠️ UX DEAD-END (MÉDIA) — `📋 Copiar Receita para Prontuário`
- **Descrição:** Tela gerada por '📋 Copiar Receita para Prontuário' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_123_copiar_receita_para_pr.cjs`](tests/repros/repro_issue_123_copiar_receita_para_pr.cjs)
  ```bash
  node tests/repros/repro_issue_123_copiar_receita_para_pr.cjs
  ```

### `ISSUE-124` · ⚠️ UX DEAD-END (MÉDIA) — `/conduta_ped crise febril`
- **Descrição:** Tela gerada por '/conduta_ped crise febril' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_124_conduta_ped_crise_febr.cjs`](tests/repros/repro_issue_124_conduta_ped_crise_febr.cjs)
  ```bash
  node tests/repros/repro_issue_124_conduta_ped_crise_febr.cjs
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
  node tests/repros/repro_issue_126_choqueseptico_75_0_25.cjs
  ```

### `ISSUE-127` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_384`
- **Descrição:** Ação demorou 2961ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-128` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/rx amigdalite bacteriana adulto 75kg`
- **Descrição:** Ação demorou 3454ms, ultrapassando a tolerância de 2500ms da persona Dra. Beatriz Toledo.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-129` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `   `
- **Descrição:** Ação demorou 3525ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-130` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `50 kg`
- **Descrição:** Ação demorou 3738ms, ultrapassando a tolerância de 1200ms da persona Dr. Gabriel Mendes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-131` · ⚠️ UX DEAD-END (MÉDIA) — `/interacao varfarina + ciprofloxacino`
- **Descrição:** Tela gerada por '/interacao varfarina + ciprofloxacino' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_131_interacao_varfarina___.cjs`](tests/repros/repro_issue_131_interacao_varfarina___.cjs)
  ```bash
  node tests/repros/repro_issue_131_interacao_varfarina___.cjs
  ```

### `ISSUE-132` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `🩺 Mais Especialidades`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📖 Ver Todos os Comandos (Manual Completo)'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
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
  node tests/repros/repro_issue_135_dhe_na_118_peso_95_m_8.cjs
  ```

### `ISSUE-136` · ⚠️ UX DEAD-END (MÉDIA) — `/ped dipirona 33`
- **Descrição:** Tela gerada por '/ped dipirona 33' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_136_ped_dipirona_33.cjs`](tests/repros/repro_issue_136_ped_dipirona_33.cjs)
  ```bash
  node tests/repros/repro_issue_136_ped_dipirona_33.cjs
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
  node tests/repros/repro_issue_139_atb_meropenem_37.cjs
  ```

### `ISSUE-140` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🫁 Exemplo IVAS`
- **Descrição:** Resposta muito extensa (2945 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-141` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `📖 Todos os Comandos`
- **Descrição:** Resposta muito extensa (8572 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-142` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `📖 Todos os Comandos`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📖 Ver Todos os Comandos (Manual Completo)'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-143` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe k 7.6 ecg`
- **Descrição:** Tela gerada por '/dhe k 7.6 ecg' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_143_dhe_k_7_6_ecg.cjs`](tests/repros/repro_issue_143_dhe_k_7_6_ecg.cjs)
  ```bash
  node tests/repros/repro_issue_143_dhe_k_7_6_ecg.cjs
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
  node tests/repros/repro_issue_145_ped_dipirona_7.cjs
  ```

### `ISSUE-146` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/gaso 7.34 38 14`
- **Descrição:** Divergência matemática detectada na calculadora Gasometria Completa. Esperado pelo oráculo canônico: Acidose Metabólica (pCO2 esp: 29.0), bot gerou: Interpretado (Erro absoluto: None, Tolerância: None). Gasometria (pH 7.34, pCO2 38.0, HCO3 14.0): primário Acidose Metabólica.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de Gasometria Completa em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_146_gaso_7_34_38_14.cjs`](tests/repros/repro_issue_146_gaso_7_34_38_14.cjs)
  ```bash
  node tests/repros/repro_issue_146_gaso_7_34_38_14.cjs
  ```

### `ISSUE-147` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe k 6.6 ecg`
- **Descrição:** Tela gerada por '/dhe k 6.6 ecg' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_147_dhe_k_6_6_ecg.cjs`](tests/repros/repro_issue_147_dhe_k_6_6_ecg.cjs)
  ```bash
  node tests/repros/repro_issue_147_dhe_k_6_6_ecg.cjs
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
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_150_dhe_k_7_2_ecg.cjs`](tests/repros/repro_issue_150_dhe_k_7_2_ecg.cjs)
  ```bash
  node tests/repros/repro_issue_150_dhe_k_7_2_ecg.cjs
  ```

### `ISSUE-151` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/dhe k 7.2 ecg`
- **Descrição:** Resposta muito extensa (2513 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
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
  node tests/repros/repro_issue_153_pals_17.cjs
  ```

### `ISSUE-154` · ⚠️ UX DEAD-END (MÉDIA) — `/pals 17`
- **Descrição:** Tela gerada por '/pals 17' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_154_pals_17.cjs`](tests/repros/repro_issue_154_pals_17.cjs)
  ```bash
  node tests/repros/repro_issue_154_pals_17.cjs
  ```

### `ISSUE-155` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/gaso 7.28 41 17`
- **Descrição:** Divergência matemática detectada na calculadora Gasometria Completa. Esperado pelo oráculo canônico: Acidose Metabólica (pCO2 esp: 33.5), bot gerou: Interpretado (Erro absoluto: None, Tolerância: None). Gasometria (pH 7.28, pCO2 41.0, HCO3 17.0): primário Acidose Metabólica.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de Gasometria Completa em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_155_gaso_7_28_41_17.cjs`](tests/repros/repro_issue_155_gaso_7_28_41_17.cjs)
  ```bash
  node tests/repros/repro_issue_155_gaso_7_28_41_17.cjs
  ```

### `ISSUE-156` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na 125 peso 55 m 66`
- **Descrição:** Tela gerada por '/dhe na 125 peso 55 m 66' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_156_dhe_na_125_peso_55_m_6.cjs`](tests/repros/repro_issue_156_dhe_na_125_peso_55_m_6.cjs)
  ```bash
  node tests/repros/repro_issue_156_dhe_na_125_peso_55_m_6.cjs
  ```

### `ISSUE-157` · 🚨 BUG CRÍTICO (ALTA) — `Choque Séptico em Sala Vermelha`
- **Descrição:** Falha ao processar ação 'Choque Séptico em Sala Vermelha'. O bot não respondeu ou gerou erro: Timeout ou fim prematuro de stream do Node.js
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Garantir bloco defensivo try/catch e resposta amigável para 'Choque Séptico em Sala Vermelha'.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_157_choque_s_ptico_em_sala.cjs`](tests/repros/repro_issue_157_choque_s_ptico_em_sala.cjs)
  ```bash
  node tests/repros/repro_issue_157_choque_s_ptico_em_sala.cjs
  ```

### `ISSUE-158` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `⚡ Choque & Hipotensão`
- **Descrição:** Botão inline com rótulo muito longo (37 chars): '🔵 Perfil L: Frio & Seco (Hipovolemia)'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-159` · ⚠️ UX DEAD-END (MÉDIA) — `/sri 999999`
- **Descrição:** Tela gerada por '/sri 999999' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_159_sri_999999.cjs`](tests/repros/repro_issue_159_sri_999999.cjs)
  ```bash
  node tests/repros/repro_issue_159_sri_999999.cjs
  ```

### `ISSUE-160` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `/pals 19`
- **Descrição:** Mensagem contém termo técnico suspeito ('undefined') exibido ao usuário.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_160_pals_19.cjs`](tests/repros/repro_issue_160_pals_19.cjs)
  ```bash
  node tests/repros/repro_issue_160_pals_19.cjs
  ```

### `ISSUE-161` · ⚠️ UX DEAD-END (MÉDIA) — `/pals 19`
- **Descrição:** Tela gerada por '/pals 19' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_161_pals_19.cjs`](tests/repros/repro_issue_161_pals_19.cjs)
  ```bash
  node tests/repros/repro_issue_161_pals_19.cjs
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
  node tests/repros/repro_issue_163_interacao_amiodarona__.cjs
  ```

### `ISSUE-164` · ⚠️ UX DEAD-END (MÉDIA) — `💊 Meropenem ClCr 25`
- **Descrição:** Tela gerada por '💊 Meropenem ClCr 25' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_164_meropenem_clcr_25.cjs`](tests/repros/repro_issue_164_meropenem_clcr_25.cjs)
  ```bash
  node tests/repros/repro_issue_164_meropenem_clcr_25.cjs
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
  node tests/repros/repro_issue_166_copiar_cid_10___diagn_.cjs
  ```

### `ISSUE-167` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `/pals 24`
- **Descrição:** Mensagem contém termo técnico suspeito ('undefined') exibido ao usuário.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_167_pals_24.cjs`](tests/repros/repro_issue_167_pals_24.cjs)
  ```bash
  node tests/repros/repro_issue_167_pals_24.cjs
  ```

### `ISSUE-168` · ⚠️ UX DEAD-END (MÉDIA) — `/pals 24`
- **Descrição:** Tela gerada por '/pals 24' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_168_pals_24.cjs`](tests/repros/repro_issue_168_pals_24.cjs)
  ```bash
  node tests/repros/repro_issue_168_pals_24.cjs
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
  node tests/repros/repro_issue_170_copiar_atestado_para_p.cjs
  ```

### `ISSUE-171` · ⏱️ GARGALO DE LATÊNCIA (MÉDIA) — `/comando_inexistente_429`
- **Descrição:** Ação demorou 5375ms, ultrapassando a tolerância de 1500ms da persona Dr. Lucas Antunes.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.

### `ISSUE-172` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `👶 Ver Doses Pediátricas (PedBook)`
- **Descrição:** Botão inline com rótulo muito longo (36 chars): '💊 Prescrever no /rx (Claritromicina)'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-173` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na 122 peso 62 m 25`
- **Descrição:** Tela gerada por '/dhe na 122 peso 62 m 25' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_173_dhe_na_122_peso_62_m_2.cjs`](tests/repros/repro_issue_173_dhe_na_122_peso_62_m_2.cjs)
  ```bash
  node tests/repros/repro_issue_173_dhe_na_122_peso_62_m_2.cjs
  ```

### `ISSUE-174` · ⚠️ RÓTULO TRUNCADO (BAIXA) — `🟢 Estável`
- **Descrição:** Botão inline com rótulo muito longo (41 chars): '📋 Copiar Conduta/Passagem para Prontuário'. Risco de truncamento no app do Telegram.
- **Ocorrências no teste:** 4x
- **💡 Recomendação Cirúrgica:** Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.

### `ISSUE-175` · ⚠️ UX DEAD-END (MÉDIA) — `/crcl 69 69 3.3 fem`
- **Descrição:** Tela gerada por '/crcl 69 69 3.3 fem' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_175_crcl_69_69_3_3_fem.cjs`](tests/repros/repro_issue_175_crcl_69_69_3_3_fem.cjs)
  ```bash
  node tests/repros/repro_issue_175_crcl_69_69_3_3_fem.cjs
  ```

### `ISSUE-176` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/minharotina`
- **Descrição:** Resposta muito extensa (2164 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 2x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-177` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `   `
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
  node tests/repros/repro_issue_179_copiar_conduta_gesta__.cjs
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
  node tests/repros/repro_issue_182_gaso_7_34_34_13.cjs
  ```

### `ISSUE-183` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `/conduta_ped bronquiolite`
- **Descrição:** Mensagem contém termo técnico suspeito ('nan') exibido ao usuário.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_183_conduta_ped_bronquioli.cjs`](tests/repros/repro_issue_183_conduta_ped_bronquioli.cjs)
  ```bash
  node tests/repros/repro_issue_183_conduta_ped_bronquioli.cjs
  ```

### `ISSUE-184` · ⚠️ UX DEAD-END (MÉDIA) — `/conduta_ped bronquiolite`
- **Descrição:** Tela gerada por '/conduta_ped bronquiolite' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_184_conduta_ped_bronquioli.cjs`](tests/repros/repro_issue_184_conduta_ped_bronquioli.cjs)
  ```bash
  node tests/repros/repro_issue_184_conduta_ped_bronquioli.cjs
  ```

### `ISSUE-185` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `/conduta_ped bronquiolite`
- **Descrição:** Resposta muito extensa (13521 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-186` · 🚨 BUG CRÍTICO (ALTA) — `📋 Fechar Plano`
- **Descrição:** Falha ao processar ação '📋 Fechar Plano'. O bot não respondeu ou gerou erro: Timeout ou fim prematuro de stream do Node.js
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Garantir bloco defensivo try/catch e resposta amigável para '📋 Fechar Plano'.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_186_fechar_plano.cjs`](tests/repros/repro_issue_186_fechar_plano.cjs)
  ```bash
  node tests/repros/repro_issue_186_fechar_plano.cjs
  ```

### `ISSUE-187` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `/pals 31`
- **Descrição:** Mensagem contém termo técnico suspeito ('undefined') exibido ao usuário.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_187_pals_31.cjs`](tests/repros/repro_issue_187_pals_31.cjs)
  ```bash
  node tests/repros/repro_issue_187_pals_31.cjs
  ```

### `ISSUE-188` · ⚠️ UX DEAD-END (MÉDIA) — `/pals 31`
- **Descrição:** Tela gerada por '/pals 31' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_188_pals_31.cjs`](tests/repros/repro_issue_188_pals_31.cjs)
  ```bash
  node tests/repros/repro_issue_188_pals_31.cjs
  ```

### `ISSUE-189` · ⚠️ UX DEAD-END (MÉDIA) — `/dva dobu 75`
- **Descrição:** Tela gerada por '/dva dobu 75' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_189_dva_dobu_75.cjs`](tests/repros/repro_issue_189_dva_dobu_75.cjs)
  ```bash
  node tests/repros/repro_issue_189_dva_dobu_75.cjs
  ```

### `ISSUE-190` · 🚨 DISCREPÂNCIA MATEMÁTICA (ALTA) — `/dva dobu 75`
- **Descrição:** Divergência matemática detectada na calculadora DVA Dobutamina. Esperado pelo oráculo canônico: 22.5, bot gerou: Não encontrado (Erro absoluto: 999.0, Tolerância: 0.3). Não foi possível extrair a vazão da infusão de dobutamina. Esperado: 22.5 mL/h.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Revisar precisão de arredondamento e fórmula de DVA Dobutamina em src/ para garantir correspondência exata ao padrão médico.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_190_dva_dobu_75.cjs`](tests/repros/repro_issue_190_dva_dobu_75.cjs)
  ```bash
  node tests/repros/repro_issue_190_dva_dobu_75.cjs
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
  node tests/repros/repro_issue_194_choqueseptico_104_0_4.cjs
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
  node tests/repros/repro_issue_196_ped_prednisolona_32.cjs
  ```

### `ISSUE-197` · ⚠️ UX DEAD-END (MÉDIA) — `/dva nora abc`
- **Descrição:** Tela gerada por '/dva nora abc' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_197_dva_nora_abc.cjs`](tests/repros/repro_issue_197_dva_nora_abc.cjs)
  ```bash
  node tests/repros/repro_issue_197_dva_nora_abc.cjs
  ```

### `ISSUE-198` · 🚨 BUG CRÍTICO (ALTA) — `/round Paciente 66a, ICC perfil B`
- **Descrição:** Falha ao processar ação '/round Paciente 66a, ICC perfil B'. O bot não respondeu ou gerou erro: Timeout ou fim prematuro de stream do Node.js
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Garantir bloco defensivo try/catch e resposta amigável para '/round Paciente 66a, ICC perfil B'.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_198_round_paciente_66a__ic.cjs`](tests/repros/repro_issue_198_round_paciente_66a__ic.cjs)
  ```bash
  node tests/repros/repro_issue_198_round_paciente_66a__ic.cjs
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
  node tests/repros/repro_issue_200_gaso_7_22_37_16.cjs
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
  node tests/repros/repro_issue_203_dhe_na_120_peso_74_m_6.cjs
  ```

### `ISSUE-204` · 🚨 VAZAMENTO TÉCNICO (ALTA) — `/pals 9`
- **Descrição:** Mensagem contém termo técnico suspeito ('undefined') exibido ao usuário.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_204_pals_9.cjs`](tests/repros/repro_issue_204_pals_9.cjs)
  ```bash
  node tests/repros/repro_issue_204_pals_9.cjs
  ```

### `ISSUE-205` · ⚠️ UX DEAD-END (MÉDIA) — `/pals 9`
- **Descrição:** Tela gerada por '/pals 9' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_205_pals_9.cjs`](tests/repros/repro_issue_205_pals_9.cjs)
  ```bash
  node tests/repros/repro_issue_205_pals_9.cjs
  ```

### `ISSUE-206` · 🚨 BUG CRÍTICO (ALTA) — `   `
- **Descrição:** Falha ao processar ação '   '. O bot não respondeu ou gerou erro: Sem resposta
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Garantir bloco defensivo try/catch e resposta amigável para '   '.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_206_bug.cjs`](tests/repros/repro_issue_206_bug.cjs)
  ```bash
  node tests/repros/repro_issue_206_bug.cjs
  ```

### `ISSUE-207` · ⚠️ ERGONOMIA MOBILE (BAIXA) — `🔬 1º Tri Avidez Baixa (Aguda)`
- **Descrição:** Resposta muito extensa (1812 caracteres). Exige scroll longo na tela do celular durante o plantão.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.

### `ISSUE-208` · ⚠️ UX DEAD-END (MÉDIA) — `/crcl cem anos 80kg cr 2`
- **Descrição:** Tela gerada por '/crcl cem anos 80kg cr 2' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_208_crcl_cem_anos_80kg_cr_.cjs`](tests/repros/repro_issue_208_crcl_cem_anos_80kg_cr_.cjs)
  ```bash
  node tests/repros/repro_issue_208_crcl_cem_anos_80kg_cr_.cjs
  ```

### `ISSUE-209` · ⚠️ UX DEAD-END (MÉDIA) — `/ped dipirona 15`
- **Descrição:** Tela gerada por '/ped dipirona 15' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_209_ped_dipirona_15.cjs`](tests/repros/repro_issue_209_ped_dipirona_15.cjs)
  ```bash
  node tests/repros/repro_issue_209_ped_dipirona_15.cjs
  ```

### `ISSUE-210` · ⚠️ UX DEAD-END (MÉDIA) — `/dhe na 120 peso 53 f 54`
- **Descrição:** Tela gerada por '/dhe na 120 peso 53 f 54' não possui teclado inline nem instruções de como voltar ou avançar.
- **Ocorrências no teste:** 1x
- **💡 Recomendação Cirúrgica:** Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.
- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`tests/repros/repro_issue_210_dhe_na_120_peso_53_f_5.cjs`](tests/repros/repro_issue_210_dhe_na_120_peso_53_f_5.cjs)
  ```bash
  node tests/repros/repro_issue_210_dhe_na_120_peso_53_f_5.cjs
  ```

---

## 🧮 Auditoria Matemática de Fórmulas Clínicas (Anti-Alucinação Determinístico)

> 🛡️ **Gabarito Canônico Determinístico**: Todo cálculo clínico executado durante os testes é auditado em tempo real por um oráculo analítico em Python puro com dupla precisão (Harrison, KDIGO, SBC, SBP, NEJM), sem uso de LLM, prevenindo alucinações e garantindo tolerância estrita (ε < 0.5).

**Resumo da Avaliação Numérica:** 73/95 cálculos aprovados (76.8% de conformidade).

| Ciclo | Calculadora | Comando Testado | Esperado (Oráculo) | Obtido (Bot) | Erro Abs | Conformidade |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C04 | DVA Noradrenalina | `/dva nora 10.5.5` | 1.0 | Não encontrado | 999.00 | 🚨 **Divergência** |
| C19 | DHE | `/dhe na abc peso -5` | Bloqueio defensivo para parâmetros não positivos | Processamento indevido | - | 🚨 **Divergência** |
| C32 | Cockcroft-Gault | `/clcr 88 69 4.1` | 12.2 | 12.2 | 0.00 | ✅ **Aprovado** |
| C44 | Gasometria Completa | `/gaso invalido` | Guia de Gasometria | Guia exibido | - | ✅ **Aprovado** |
| C54 | DVA | `/dva nora zero` | Guia de uso de DVA | Guia ou instrução | - | ✅ **Aprovado** |
| C57 | Cockcroft-Gault | `/crcl 45 69 1.6 masc` | 56.9 | 56.9 | 0.00 | ✅ **Aprovado** |
| C62 | DHE Hipercalemia | `/dhe k 6.9 ecg` | Estratificação de Hipercalemia para K+ 6.9 | Estratificação exibida | - | ✅ **Aprovado** |
| C64 | DHE | `/dhe na -10 peso -5` | Bloqueio defensivo para parâmetros não positivos | Processamento indevido | - | 🚨 **Divergência** |
| C72 | Cockcroft-Gault | `/crcl 32 95 1.0 fem` | 121.1 | 121.1 | 0.00 | ✅ **Aprovado** |
| C74 | SRI | `/sri -1` | Bloqueio defensivo para peso não positivo | Alerta emitido | - | ✅ **Aprovado** |
| C76 | DVA Vasopressina | `/dva vaso 73` | 9.0 | 9.0 | 0.00 | ✅ **Aprovado** |
| C79 | Gasometria Completa | `/gaso - - -` | Guia de Gasometria | Guia exibido | - | ✅ **Aprovado** |
| C99 | Cockcroft-Gault | `/crcl idade peso` | Bloqueio defensivo por parâmetros insuficientes | Bloqueio acionado | - | ✅ **Aprovado** |
| C122 | DHE Hiponatremia (Adrogué-Madias) | `/dhe na 123 peso 95 f 69` | 8.0 | 8.0 | 0.00 | ✅ **Aprovado** |
| C124 | DVA Noradrenalina | `/dva nora -50` | Bloqueio defensivo para peso não positivo | Alerta emitido | - | ✅ **Aprovado** |
| C127 | DHE Hiponatremia (Adrogué-Madias) | `/dhe na 118 peso 57 m 46` | 11.2 | 11.2 | 0.00 | ✅ **Aprovado** |
| C149 | DHE | `/dhe na abc peso 0` | Bloqueio defensivo para parâmetros não positivos | Alerta emitido | - | ✅ **Aprovado** |
| C159 | SRI | `/sri -1` | Bloqueio defensivo para peso não positivo | Alerta emitido | - | ✅ **Aprovado** |
| C161 | SRI | `/sri 64 choque` | Etomidato 9.6 mL (19.2 mg) | Validado | - | ✅ **Aprovado** |
| C169 | DVA | `/dva nora zero` | Guia de uso de DVA | Guia ou instrução | - | ✅ **Aprovado** |
| C172 | Cockcroft-Gault | `/crcl 62 55 4.0 masc` | 14.9 | 14.9 | 0.00 | ✅ **Aprovado** |
| C174 | DVA Noradrenalina | `/dva nora 99999` | 9374.9 | Não encontrado | 999.00 | 🚨 **Divergência** |
| C204 | DHE | `/dhe na -10 peso -5` | Bloqueio defensivo para parâmetros não positivos | Processamento indevido | - | 🚨 **Divergência** |
| C214 | Gasometria Completa | `/gaso - - -` | Guia de Gasometria | Guia exibido | - | ✅ **Aprovado** |
| C221 | DVA Vasopressina | `/dva vaso 95` | 9.0 | 9.0 | 0.00 | ✅ **Aprovado** |
| C239 | DHE | `/dhe na 500 peso 0` | Bloqueio defensivo para parâmetros não positivos | Processamento indevido | - | 🚨 **Divergência** |
| C247 | DHE Hipercalemia | `/dhe k 6.5 ecg` | Estratificação de Hipercalemia para K+ 6.5 | Estratificação exibida | - | ✅ **Aprovado** |
| C249 | DHE | `/dhe na 500 peso -5` | Bloqueio defensivo para parâmetros não positivos | Processamento indevido | - | 🚨 **Divergência** |
| C252 | DHE Hiponatremia (Adrogué-Madias) | `/dhe na 123 peso 58 m 50` | 10.9 | 10.9 | 0.00 | ✅ **Aprovado** |
| C254 | Gasometria Completa | `/gaso invalido` | Guia de Gasometria | Guia exibido | - | ✅ **Aprovado** |

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
| `7b60590955cc` | ⚡ *Ultra Rotina · Central de Comandos Beira-L | 8 opções | 27 |
| `4d571300fa4d` | 🚨 *EMERGÊNCIA & SALA VERMELHA* | 13 opções | 6 |
| `58b9c7ffccbf` | 🚨 *PARADA CARDIORRESPIRATÓRIA (PCR ADULTO — A | 9 opções | 1 |
| `13ae673a37fe` | 📋 *PRONTO PARA O PRONTUÁRIO (1-TOQUE PARA COP | 0 opções | 103 |
| `8bd8f730f62c` | 🌵 *HIPERNATREMIA — DÉFICIT DE ÁGUA LIVRE (ADR | 0 opções | 5 |
| `9cc8e2832242` | 📋 *CONDUTA PEDIÁTRICA OFICIAL (PEDBOOK)* | 0 opções | 2 |
| `7bbb1dadce04` | 🛏️ *ENFERMARIA & PRESCRIÇÃO* | 10 opções | 4 |
| `284a41acfb0c` | 🏥 *Enfermaria · (8 leitos: 🟢 4 - 🟡 4 - 🔴 0)* | 11 opções | 1 |
| `0199e8bd56e1` | 🛏️ *Leito 3* · ⚪ Estável | 9 opções | 1 |
| `02ef7e67d021` | 🔬 *COMPATIBILIDADE EM Y (Y-SITE) · BOMBA DE I | 0 opções | 10 |
| `915ea983acab` | 🤰 *AVALIAÇÃO DE PRÉ-NATAL E CRONOLOGIA OBSTÉT | 3 opções | 1 |
| `773477a1e669` | 💊 *GUIA FARMACÊUTICO HSL — POSOLOGIA OFICIAL* | 2 opções | 2 |
| `8e3d79633614` | *RX · Resumo Clínico* | 6 opções | 1 |
| `c14d69fadca3` | *SOAP (Caso Clínico) · Novo Caso* | 6 opções | 4 |
| `275eb9bccac9` | 📋 *PRONTUÁRIO CLÍNICO AMBULATORIAL (SOAP ÁGIL | 4 opções | 1 |
| `613d281610d7` | 🩺 *AMBULATÓRIO & ATENÇÃO PRIMÁRIA (UBS)* | 9 opções | 5 |
| `613a880483df` | 🩺 *CONDUTA CITOPATOLÓGICA DE COLO DE ÚTERO (D | 6 opções | 1 |
| `3eb416223e9e` | Tela Sem Texto | 0 opções | 8 |
| `9103818ea718` | 🚨 *EMERGÊNCIA - ACHADO CRÍTICOS:* Acidemia gr | 3 opções | 1 |
| `b99d9cf72875` | 🚨 *EMERGÊNCIA - ACHADO CRÍTICO:* INFARTO AGUD | 3 opções | 1 |
| `6e96ff7372f8` | *LAUDO CLÍNICO MULTIMODAL · EXAMES LABORATORI | 3 opções | 1 |
| `b5583171086f` | 🩺 *Novo caso SOAP iniciado a partir da imagem | 0 opções | 5 |
| `610c57da32a9` | ⚠️ *Rascunho para conferência médica* | 7 opções | 1 |
| `5ecfcb80b40d` | 💧 *CORREÇÃO DE HIPONATREMIA (FÓRMULA DE ADROG | 0 opções | 14 |
| `947705f04e96` | 🚨 *EMERGÊNCIA - ACHADO CRÍTICOS:* Acidemia gr | 3 opções | 1 |
| `118b7339ea73` | ❌ Falha ao salvar no Notion. Tente novamente. | 0 opções | 20 |
| `a13a49686994` | 🧭 *HUB DE ROTINA & PRODUTIVIDADE* | 7 opções | 11 |
| `b8da87038db1` | 📆 *AGENDA DE HOJE (Segunda-feira, 12/10/2026) | 3 opções | 27 |
| `cb0b47d344af` | 📆 *AGENDA DE AMANHÃ (Terça-feira, 13/10/2026) | 3 opções | 2 |
| `53d2f82f3335` | ⚠️ *Rascunho para conferência médica* | 7 opções | 1 |

---
> 🌐 **Dashboard Visual Interativo:** Abra [`data/dashboard_grafo.html`](../data/dashboard_grafo.html) no navegador para explorar o grafo de navegação em tempo real.

*(Relatório gerado automaticamente pelo Ultra Rotina Testador Master)*
