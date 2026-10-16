### STATUS: DESENVOLVIMENTO_ABA_ROTINA

# 📅 Ultra Rotina — Desenvolvimento Integral da Aba Rotina

> 📦 **Backup das diretrizes anteriores**: Preservado em [docs/BACKUP_DIRETRIZES_AUTOLOOP.md](docs/BACKUP_DIRETRIZES_AUTOLOOP.md) para restauração e consulta sob comando.

**DIRETRIZ ESTRATÉGICA ATUAL DO USUÁRIO (FOCO 100% NA ABA ROTINA)**:
1. **OBJETIVO ABSOLUTO: DESENVOLVIMENTO INTEGRAL DA ABA ROTINA**:
   - *Foco Total & Sem Conservadorismo*: O autoloop concentra 100% de sua capacidade em refatorar, expandir e integrar a **Aba Rotina** em todo o ecossistema (Cockpit PWA, rotas Fastify e Telegram Bot).
   - *Reestruturação Visual no Cockpit PWA*: Substituir a interface legada de `#tab-rotina` por uma timeline de time-blocking moderna, rica e responsiva, com cards dinâmicos do dia (horários, atividades, tags, status e notas).
   - *Erradicação de Conteúdo Genérico e Mocks*: Remover textos fixos ("Turma J", "Semana Ativa", blocos de estudo congelados), conectando a rotina viva do médico (escala de plantão, MedQuest, Anki, treino e recuperação).
   - *Integração Real com Google Calendar no Backend Fastify*: Descontinuar definitivamente dependências órfãs de GAS `CalendarApp` e integrar via Node.js nativo (iCal / Google Calendar API / Service Account).
   - *Sincronização Bidirecional & Offline-First*: Comunicação fluida entre Telegram e Cockpit PWA com persistência local em IndexedDB para uso beira-leito sem latência.
2. **Validação Rigorosa (Test Sharding)**: Iterar exclusivamente com o teste do módulo alterado (~0.3s a 0.5s); ao concluir a tarefa, certificar zero regressões com `npm test`.

---

## 🔄 Tarefa Concluída

- [x] **Elevação Padrão-Ouro de Conteúdo Clínico com Gemini 4 Argon: PBW/ARDSNet na Ventilação/SRI, Síndromes Farmacológicas em RAM (QTc, Triple Whammy, Sais de Cálcio ISMP) e Sinais de Alarme Leigos na Alta (`src/03_bases_locais.js`, `src/02_calculadoras_puras.js`, `src/04_motores_ia.js`, `tests/test_auditoria_qualidade_clinica.cjs`, `ultra_rotina_master.js`)**:
    - **Diagnóstico e Causa Raiz**: Falta de cálculo de Peso Predito (PBW) na ventilação mecânica gerando risco de barotrauma em obesos; lacuna de detecção para prolongadores sinérgicos de QTc (Torsades de Pointes), tríade nefrotóxica *Triple Whammy* e hipercalemia por Trimetoprima; ausência de ampolas duplas de Cálcio e Salina 3% na padronização ISMP; sinais de alarme na alta hospitalar contendo jargões médicos indecifráveis para leigos; e sobredose de clavulanato na suspensão 4:1 em dose alta pediátrica.
    - **Correções Implementadas**:
      1. *Peso Predito & ARDSNet*: Implementada `CalculadorasClinicas.pesoPreditoEVolumeCorrente` com fórmula de Devine, faixa 4-8 mL/kg e alvo de 6 mL/kg.
      2. *Síndromes Farmacológicas em RAM 0ms*: Função `auditarSindromesFarmacologicasCriticas` integrada ao cross-check cobrindo QTc múltiplo, Tríade Triple Whammy, sinergismo hipercalemiante e precipitações físico-químicas letais (Fenitoína em SG 5% e Ceftriaxona com Cálcio).
      3. *Padronização ISMP Expandida*: Sais de Cálcio (Gluconato 10% vs Cloreto 10%) e Salina 3% com preparo de 85 mL + 15 mL e teto de correção de 8-10 mEq/L/24h.
      4. *Sinais de Alarme em Linguagem Leiga*: Prompts de SOAP Fase 2 e Prescrição atualizados para exigir red flags objetivos e acessíveis ao paciente/familiar.
      5. *Segurança Farmacotécnica Pediátrica*: Alerta SBP/CDC para formulações 7:1/14:1 em dose alta de Amox/Clav e trava de 200 mg (40 gotas) de Ibuprofeno para crianças < 20 kg.
      6. *Marcadores Ativos de Exames*: Inseridos `[CONFERIR SE TESTADO]` e `[CONFERIR ATIVAMENTE]` nos modelos neuro e psiquiátrico.
    - **Recibo de Estabilidade**: **57/57 suítes aprovadas com 100% de sucesso em 21.51s** via `npm test`. Testes clínicos ampliados para 18/18 testes em `tests/test_auditoria_qualidade_clinica.cjs` 100% aprovados.

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Aba Rotina — Sincronização Bidirecional Telegram ↔ Cockpit PWA (`src/07g_telegram_ajuda_e_protocolos.js`, `src/07a_telegram_router.js`, `gh_cockpit_deploy/rotina_timeline.js`)**:
    - **Arquivo/Módulo Alvo**: `src/07g_telegram_ajuda_e_protocolos.js`, `src/07a_telegram_router.js` e `gh_cockpit_deploy/rotina_timeline.js`
    - **Função/Componente/Seletor**: Callbacks inline `rt_concluir:ID`, `rt_adiar:ID` e rota `/api/rotina/status`
    - **Comportamento Esperado / Critério de Aceite**: Ao interagir com o teclado inline do Telegram (`/rotina`), a alteração de status reflete instantaneamente no Cockpit PWA e vice-versa, sem inconsistências de cache.

---

## 📋 Backlog Prioritário: Desenvolvimento Integral da Aba Rotina

1. [ ] **Aba Rotina — Sincronização Bidirecional Telegram ↔ Cockpit PWA (`src/07g_telegram_ajuda_e_protocolos.js`, `src/07a_telegram_router.js`, `gh_cockpit_deploy/rotina_timeline.js`)**:
    - **Arquivo/Módulo Alvo**: `src/07g_telegram_ajuda_e_protocolos.js`, `src/07a_telegram_router.js` e `gh_cockpit_deploy/rotina_timeline.js`
    - **Função/Componente/Seletor**: Callbacks inline `rt_concluir:ID`, `rt_adiar:ID` e rota `/api/rotina/status`
    - **Comportamento Esperado / Critério de Aceite**: Ao interagir com o teclado inline do Telegram (`/rotina`), a alteração de status reflete instantaneamente no Cockpit PWA e vice-versa, sem inconsistências de cache.

2. [ ] **Aba Rotina — Modo Plantão 24h & Alternância de Contraste Beira-Leito (`gh_cockpit_deploy/index.html`, `rotina_timeline.js`, `src/06_rotina_agenda.js`)**:
    - **Arquivo/Módulo Alvo**: `gh_cockpit_deploy/index.html`, `rotina_timeline.js` e `src/06_rotina_agenda.js`
    - **Função/Componente/Seletor**: Botão de alternância `#modo-plantao-toggle` e classe `.tema-plantao-urgente`
    - **Comportamento Esperado / Critério de Aceite**: Ativação com 1 toque de visual escuro de altíssimo contraste para uso em emergência/sala vermelha, priorizando blocos de DVA, SRI e acesso vascular sem rolagem.

3. [ ] **Aba Rotina — Gamificação & Consistência Visual de Streaks (`gh_cockpit_deploy/index.html`, `rotina_timeline.js`, `src/06_rotina_agenda.js`)**:
    - **Arquivo/Módulo Alvo**: `gh_cockpit_deploy/index.html`, `rotina_timeline.js` e `src/06_rotina_agenda.js`
    - **Função/Componente/Seletor**: Componente visual `#streak-semanal-banner` e função `RotinaService.calcularStreakSemanal`
    - **Comportamento Esperado / Critério de Aceite**: Exibir sequência ininterrupta de dias com metas de MedQuest e plantão cumpridas, aumentando a motivação diária de estudo.

4. [ ] **Aba Rotina — Pomodoro Integrado no Card de Estudo (`gh_cockpit_deploy/index.html`, `rotina_timeline.js`)**:
    - **Arquivo/Módulo Alvo**: `gh_cockpit_deploy/index.html` e `rotina_timeline.js`
    - **Função/Componente/Seletor**: Timer tátil `iniciarTimerPomodoroEstudo` no card de bloco MedQuest
    - **Comportamento Esperado / Critério de Aceite**: Cronômetro regressivo de 25 min/50 min com alerta sonoro suave e botão de conclusão imediata refletindo no Telegram.

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)

> 💡 Catálogo completo e limpo de sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 01 (Aba Rotina / Integração Wearables)*: Consumo de métricas de sono e prontidão biológica (Apple Health / Garmin) para sugestão automática de "modo descanso" nos blocos da rotina.
- *Sugestão 02 (Aba Rotina / Gamificação & Streaks)*: Contador visual de consistência semanal de blocos cumpridos no topo da aba rotina.
- *Sugestão 03 (Aba Rotina / Modo Plantão 24h)*: Alternância automática de layout para alto contraste noturno com acesso rápido e prioritário a DVA e SRI durante horas de plantão ativo.
- *Sugestão 04 (Aba Rotina / Pomodoro Integrado)*: Timer embutido no card de bloco de estudo com sincronização de conclusão direta no Telegram.
- *Sugestão 05 (Aba Rotina / Notificações Nativas do Calendário)*: Alinhamento das descrições de alertas nativos do Google Calendar com links diretos para condutas da Sala Vermelha.

---
