### STATUS: CONSERTO_ERROS_E_OTIMIZACAO_EXPERIENCIA

# 🩺 Ultra Rotina — Excelência Clínica & Reestruturação da Aba Rotina

> 📦 **Backup das diretrizes de refatoração**: Preservado em [docs/BACKUP_DIRETRIZES_AUTOLOOP.md](docs/BACKUP_DIRETRIZES_AUTOLOOP.md) para restauração e consulta sob comando.

**DIRETRIZES ESTRATÉGICAS ATUAIS DO USUÁRIO (2 GRANDES OBJETIVOS OFICIAIS)**:
1. **GRANDE OBJETIVO 1: EXCELÊNCIA E RIGOR DO CONTEÚDO CLÍNICO DAS FUNÇÕES EXISTENTES (TODAS AS ABAS)**:
   - *Zero Novas Rotas/Funções Clínicas*: Foco 100% em aprofundar, calibrar e enriquecer o conteúdo médico retornado pelas funções que já existem (Sala Vermelha, Consultas de Bolso, Ambulatório, G&O, Enfermaria, Calculadoras e SOAP).
   - *Prescrição Pronta para Prontuário (PEP)*: Apresentações exatas, diluições (SF 0,9% vs SG 5%), velocidade em BIC (mL/h), aprazamento e via prontos para cópia beira-leito.
   - *Cláusula Pétrea*: Proibido degradar ou diluir dados clínicos, doses, salvaguardas e alertas sentinela.
2. **GRANDE OBJETIVO 2: REESTRUTURAÇÃO, ORGANIZAÇÃO E INTEGRAÇÃO REAL DA ABA ROTINA**:
   - *Reorganização da Interface (Cockpit PWA & Telegram)*: Resolver a desorganização visual da aba rotina (`#tab-rotina` e `/rotina`), estruturando uma timeline de time-blocking limpa, fluida e intuitiva.
   - *Integração Real com Agenda Google (Google Calendar)*: Substituir dependências órfãs de GAS CalendarApp por integração moderna em Node.js Fastify (Google Calendar API / Service Account / iCal) para consumir e sincronizar eventos reais da agenda médica.
   - *Eliminação de Conteúdo Genérico e Mocks*: Remover textos hardcoded ("Turma J", "Semana Ativa", blocos de estudo congelados), exibindo dados reais da rotina diária, escalas, treino e MedQuest.
3. **Validação Rigorosa (Test Sharding)**: Iterar exclusivamente com o teste do módulo alterado (~0.3s a 0.5s); ao concluir, validar regressão zero com `npm test`.

---

## 🔄 Tarefa Concluída

- [x] **Estabilidade e Resiliência da API — Resolução da Queda de Conexão e Timeout de IA (`src/00_config.js`, `src/04_motores_ia.js`)**:
    - **Diagnóstico da Causa Raiz**:
      * A cascata do Gemini iniciava por `gemini-3.7-flash` e `gemini-3.8-flash`, que na API do Google estão sob altíssima demanda, retornando HTTP 503 ou timeouts (>10s).
      * A cada chave recebendo 503, o código registrava falha prematura no `IaCircuitBreaker`, abrindo o circuito global do Gemini e bloqueando todas as chamadas legítimas subsequentes para o modelo saudável `gemini-flash-lite-latest`.
      * Durante os timeouts de rede (12s a 24s), o worker síncrono bloqueava a thread do Node via `Atomics.wait`, impedindo a resposta do healthcheck `/health` do Fastify e levando o Render a reiniciar o contêiner por timeout/falha de liveness.
    - **Correção Cirúrgica Aplicada**:
      * Em `src/00_config.js` e `src/04_motores_ia.js`: reordenada a lista de modelos para priorizar os modelos ultra-estáveis e rápidos `gemini-flash-lite-latest` (latência ~500ms-700ms) e `gemini-3.5-flash-lite`.
      * Reduzido o timeout de fetch de 12s para 7s para evitar travar o event loop do Fastify.
      * Tratamento isolado para HTTP 503 e 504: em caso de saturação do modelo no Google, aplica cooldown de 60s apenas no modelo específico e faz break imediato para o próximo modelo da cascata, sem abrir indevidamente o Circuit Breaker global do Gemini.
    - **Validação e Resultados**: Latência de IA reduzida de 16.5s para 2.6s (1º tiro determinístico). 100% de aprovação na suíte completa (`npm test`: 49/49 suítes em 7.25s).

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Aba Rotina — Reestruturação Visual no Cockpit PWA e Desmockagem de Conteúdo (`gh_cockpit_deploy/index.html`)**:
    - **Arquivo/Módulo Alvo**: `gh_cockpit_deploy/index.html`
    - **Função/Componente/Seletor**: Container `#tab-rotina` e função `renderizarRotinaBlocos(blocos)`
    - **Comportamento Esperado / Critério de Aceite**: Substituir cards estáticos genéricos ("Turma J", "Semana Ativa", "Sangramento de 1º Trimestre") por layout limpo e responsivo de time-blocking, com cards visuais de blocos do dia (horário, atividade, categoria, status de execução, notas), ações rápidas (concluir, pular, descanso) e badge de sincronização com a agenda.

---

## 📋 Backlog Prioritário: Lapidação Clínica & Reestruturação da Aba Rotina

1. [ ] **Aba Rotina — Integração Real com Google Calendar no Backend Node.js Fastify (`src/06_rotina_agenda.js`, `server/index.js`)**:
    - **Arquivo/Módulo Alvo**: `src/06_rotina_agenda.js` e `server/index.js`
    - **Função/Componente/Seletor**: Funções `sincronizarComGoogleCalendar`, `detectarPlantaoStatus` e rota Fastify `/api/rotina/agenda`
    - **Comportamento Esperado / Critério de Aceite**: Substituir dependência inoperante de `CalendarApp` (GAS) por conector moderno em Node.js (Google Calendar API / Service Account / iCal) capaz de recuperar eventos reais do médico, alimentar a rota do Cockpit e sincronizar os alertas e time-blocking do Telegram (`/rotina`, `/agenda`) com dados reais e determinísticos.

3. [ ] **Aba Sala Vermelha & DHE — Enriquecimento do Protocolo de Hipercalemia na Função Existente (`src/02_nefrologia_dhe.js`)**:
    - **Arquivo/Módulo Alvo**: `src/02_nefrologia_dhe.js`
    - **Função/Componente/Seletor**: Função existente `calcularCorrecaoK` ou gerador de conduta de potássio
    - **Comportamento Esperado / Critério de Aceite**: Aprofundar o texto de conduta com o tripé canônico detalhado: Gluconato de Cálcio 10% (10-20mL em 100mL SG 5% em 5 min), Solução Polarizante (SG 50% 50mL + 10 UI Regular em 20 min) com alerta de HGT horária por 4-6h e Sorcal/Furosemida para eliminação.

4. [ ] **Aba Consultas Rápidas & Farmacologia — Refinamento de Ajustes de Função Renal e Diluições (`src/03_bases_locais.js`)**:
    - **Arquivo/Módulo Alvo**: `src/03_bases_locais.js`
    - **Função/Componente/Seletor**: Tabela/objeto existente de catálogo farmacológico e antibióticos
    - **Comportamento Esperado / Critério de Aceite**: Adicionar faixas de ajuste renal estritas por clearance de creatinina (ClCr > 50, 30-50, 10-29 e < 10/Hemodiálise) para antimicrobianos cadastrados (Meropenem, Vancomicina com vale de 15-20 mcg/mL, Ceftriaxona, Ciprofloxacino e Cefepime com neurotoxicidade).

5. [ ] **Aba Ginecologia & Obstetrícia — Detalhamento do Esquema de Sulfato de Magnésio (`src/02_centro_obstetrico.js`, `src/02_pcr_gestante.js`)**:
    - **Arquivo/Módulo Alvo**: `src/02_centro_obstetrico.js`
    - **Função/Componente/Seletor**: Função existente de pré-eclâmpsia grave / iminência de eclâmpsia
    - **Comportamento Esperado / Critério de Aceite**: Enriquecer conduta com prescrição dos esquemas de Zuspan (Ataque: 4g IV MgSO4 50% em 20 min; Manutenção: 1g/h em BIC) e Pritchard (Ataque: 4g IV + 10g IM; Manutenção: 5g IM 4/4h), checklist de vigilância (patelar, FR >= 16, diurese >= 25 mL/h) e antídoto (Gluconato de Cálcio 10% 10 mL IV).

6. [ ] **Aba Ambulatório — Estruturação de Metas e Tripla Terapia na Função Existente de HAS (`src/02_soap_ambulatorial.js`)**:
    - **Arquivo/Módulo Alvo**: `src/02_soap_ambulatorial.js`
    - **Função/Componente/Seletor**: Funções existentes de conduta ambulatorial de hipertensão
    - **Comportamento Esperado / Critério de Aceite**: Refinar plano com SBC 2020/2024: alvos de PA por risco (< 130/80 mmHg em alto risco), escalonamento (Monoterapia estágio 1 vs Dupla terapia IECA/BRA + BCC/Tiazídico estágios 2/3), doses e monitorização de K+/Cr após 2 semanas.

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)

> 💡 Catálogo completo e limpo de sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 01 (Emergência Respiratória / Gasometria)*: Alvos de ventilação mecânica protetora na SDRA acoplados à gasometria (VT 6 mL/kg de peso predito pela altura, FR ajustada para PaCO2 alvo e PEEP para PaO2 alvo associados ao cálculo de P/F da classificação de Berlin).
- *Sugestão 02 (Infectologia & Sepse / Bundles)*: Cronômetro regressivo inteligente do "Bundle da 1ª Hora" na Sepse (lactato sérico, hemoculturas antes de ATB, antibiótico de amplo espectro na 1ª hora, ressuscitação volêmica com 30 mL/kg de cristaloide balanceado e noradrenalina precoce se PAM < 65 mmHg).
- *Sugestão 03 (Cardiologia & SCA)*: Calculadora de escore HEART e TIMI para dor torácica aguda em sala de emergência com indicação seriada de curva de troponina ultrassensível (0h/1h ou 0h/2h).
- *Sugestão 04 (Neurologia & AVC)*: Checklist dinâmico de elegibilidade e contraindicações para trombólise IV (Alteplase / Tenecteplase) e janela estendida para trombectomia mecânica baseada em ASPECTS.
- *Sugestão 05 (Ginecologia & Obstetrícia / Pré-Eclâmpsia)*: Esquema de Sulfato de Magnésio (Pritchard vs Zuspan) com dosagens precisas de ataque e manutenção e protocolo de monitorização dos sinais de intoxicação magnésica (reflexo patelar, FR e débito urinário com Gluconato de Cálcio 10% beira-leito).

---
